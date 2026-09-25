/* ── api/board.js — THE TOWN BOARD AND THE CHAT ─────────────────────────────
   One Vercel function at /api/board, and the same module mounted by
   serve.js at the same path on the dev server (as api/friends.js is).
   toem2/board.js reads and posts here; dashboard/manage.js arranges it.

   THE TABS (2026-09-24, later that day). A page's board is a list of tabs
   its keepers arrange from the dashboard — each a channel with a title, a
   kind and who writes there: `posts` (titled entries, newest first),
   `threads` (a forum: threads and their replies) or `notice` (one text the
   keepers write from the dashboard, no posts — the page's rules, say).
   `who` is `keepers` or `anyone` (signed in). A page with none set has the
   four it started with: News and Updates (posts, the keepers), Rules (a
   notice; empty means the client's five default rules) and Forum (threads,
   anyone). The list lives on the page's hash (api/wall.js: page:<slug>
   `tabs`), so a page not designed yet has the defaults. A tab taken down,
   or turned into another kind, takes its posts with it.

   THE CHAT'S RULES live beside them (`chat`): `who` may say something —
   anyone signed in, the keepers, or the people the keepers `named` — and
   `wait`, the seconds one account must leave between two lines (0 = none),
   kept as a key that expires (rl:chat:<slug>:<u>:wait).

   A CHANNEL IS A LIST, newest first, under board:<slug>:<ch>, trimmed to
   what its kind keeps: {id, by, at, text, title?, re?} — re names the
   thread a reply is under. Names are looked up when read (tagsOf), so a
   rename shows; pictures are the gnome's card's (/api/wall?who=), which
   the page fetches once per author.

     GET  ?page=<slug>&ch=board | chat | board,chat | <ch>,<ch>…      (board: every tab that keeps posts)
          → { ok, me: {id, tag, keeper, mod} | null, tabs: [{ch, title, kind, who, text?}],
              chat: { who, wait, can, named?: [{id, tag}] (for a keeper) },
              posts: { <ch>: [{id, by, tag, at, text, title?, re?}] } }
     POST { op: 'post', ch, text, title?, re? }  → { ok, post }   (a keepers' tab: the keepers; a thread wants a title; the chat: by its rules)
          { op: 'drop', ch, id }                 → { ok, gone }   (your own, or a keeper's to hide — audited; a thread takes its replies)
          { op: 'tabs', tabs: [{ch, title, kind, who, text?}] } → { ok, tabs }   (the keepers; one to eight)
          { op: 'chat', who, wait, named: [id] } → { ok, chat }   (the keepers)

   ponytail: an hour's counter per account; a list is trimmed, so the oldest
   fall off the end rather than being paged — pages when a forum fills. */
'use strict';

const crypto = require('crypto');
const W = require('./wall.js');
const { db, dbm, K, answer, readBody, Bad, bad, sameSite, whoIs, isMod, rulesOf, tagsOf, text, HOME, SLUG_RE, USER_RE } = W;

const KIND = { posts: 100, threads: 500, notice: 0 };       // what a kind of tab keeps
const CHAT_KEEP = 200;
const TABS = [{ ch: 'news', title: 'News', kind: 'posts', who: 'keepers' }, { ch: 'updates', title: 'Updates', kind: 'posts', who: 'keepers' },
              { ch: 'rules', title: 'Rules', kind: 'notice', who: 'keepers', text: '' }, { ch: 'forum', title: 'Forum', kind: 'threads', who: 'anyone' }];
const TABS_MAX = 8, CH_RE = /^[a-z0-9][a-z0-9-]{0,19}$/, WHO = ['anyone', 'keepers', 'named'], WAIT_MAX = 3600, NAMED_MAX = 50;
const CAP = { title: 80, line: 500, body: 2000, tab: 24, notice: 4000 };
const RATE = 60;                              // posts an hour, an account
const hour = () => Math.floor(Date.now() / 36e5);
async function spend(u) {
  const k = K.rl('board:' + u, hour()), n = await db('INCR', k);
  if (n === 1) await db('EXPIRE', k, 3600);
  return n <= RATE;
}
// a body keeps its line breaks (a post is paragraphs); a title and a chat line are one line (wall.js's text)
const prose = (s, n) => String(s == null ? '' : s).replace(/\r\n?/g, '\n').replace(/[\x00-\x09\x0b-\x1f\x7f]/g, '')
  .replace(/[ \t]+/g, ' ').replace(/ ?\n ?/g, '\n').replace(/\n{3,}/g, '\n\n').trim().slice(0, n);
const newId = () => Date.now().toString(36) + crypto.randomBytes(3).toString('hex');
const one = s => { try { const p = JSON.parse(s); return p && typeof p === 'object' ? p : null; } catch (e) { return null; } };
const parse = (s, dflt) => { try { const v = s ? JSON.parse(s) : dflt; return v == null ? dflt : v; } catch (e) { return dflt; } };

async function pageOf(q, body) {
  const s = String((body && body.page) || q.get('page') || HOME).toLowerCase();
  if (s === HOME) return s;
  if (!SLUG_RE.test(s) || !(await db('HGET', K.page(s), 'made'))) throw bad(404, 'page', 'no such page');
  return s;
}
async function meOf(req, slug) {              // who is asking, and what they are on this page
  const me = await whoIs(req);
  if (!me) return null;
  const rules = await rulesOf({ slug }, me), mod = isMod(me);
  return { id: me.id, tag: me.tag, banned: me.banned, mod, keeper: mod || !!rules.keeper };
}
const said = me => me && { id: me.id, tag: me.tag, keeper: me.keeper, mod: me.mod };

// ── the tabs and the chat's rules, off the page's hash ─────────────────────
const tabsOf = p => { const t = parse(p.tabs, null); return Array.isArray(t) && t.length ? t : TABS; };
const chatOf = p => { const c = parse(p.chat, null) || {}; return { wait: Math.min(WAIT_MAX, Math.max(0, Math.floor(+c.wait) || 0)), who: WHO.includes(c.who) ? c.who : 'anyone',
                                                                    named: Array.isArray(c.named) ? [...new Set(c.named.filter(u => typeof u === 'string' && USER_RE.test(u)))].slice(0, NAMED_MAX) : [] }; };
const canChat = (me, chat) => !!me && (me.keeper || chat.who === 'anyone' || (chat.who === 'named' && chat.named.includes(me.id)));
const keepOf = (tabs, ch) => (ch === 'chat' ? CHAT_KEEP : KIND[(tabs.find(t => t.ch === ch) || {}).kind] || 0);
function chOf(tabs, v) { const ch = String(v == null ? '' : v); if (ch !== 'chat' && !tabs.some(t => t.ch === ch)) throw bad(400, 'ch', 'no such channel'); return ch; }
async function chatSaid(chat, me) {           // what the page says about its chat: the rules, whether you may, and — for a keeper — the named, by tag
  const out = { who: chat.who, wait: chat.wait, can: canChat(me, chat) };
  if (me && me.keeper) { const tags = chat.named.length ? await tagsOf(chat.named) : {}; out.named = chat.named.map(u => ({ id: u, tag: tags[u] || '' })); }
  return out;
}
function cleanTabs(v) {
  if (!Array.isArray(v) || !v.length || v.length > TABS_MAX) throw bad(400, 'tabs', 'a board has one to ' + TABS_MAX + ' tabs');
  const seen = new Set();
  return v.map(t => {
    if (!t || typeof t !== 'object') throw bad(400, 'tabs', 'a tab is a title, a kind and who writes there');
    const ch = String(t.ch == null ? '' : t.ch).toLowerCase(), title = text(t.title, CAP.tab), kind = String(t.kind);
    if (!CH_RE.test(ch) || ch === 'chat' || ch === 'board') throw bad(400, 'tabs', 'a tab\'s name is lower-case letters, numbers and dashes, 20 at most — and not "chat"');
    if (seen.has(ch)) throw bad(400, 'tabs', 'two tabs are called ' + ch);
    seen.add(ch);
    if (!title) throw bad(400, 'tabs', 'every tab needs a title');
    if (!(kind in KIND)) throw bad(400, 'tabs', 'a tab is posts, threads or a notice');
    const out = { ch, title, kind, who: kind === 'notice' || t.who !== 'anyone' ? 'keepers' : 'anyone' };
    if (kind === 'notice') out.text = prose(t.text, CAP.notice);
    return out;
  });
}
function cleanChat(b) {
  const wait = Math.floor(+b.wait) || 0;
  if (!(wait >= 0 && wait <= WAIT_MAX)) throw bad(400, 'chat', 'the wait between messages is 0 to ' + WAIT_MAX + ' seconds');
  if (!WHO.includes(b.who)) throw bad(400, 'chat', 'who may chat is anyone, keepers or named');
  const named = Array.isArray(b.named) ? [...new Set(b.named.filter(u => typeof u === 'string' && USER_RE.test(u)))] : [];
  if (named.length > NAMED_MAX) throw bad(400, 'chat', 'name ' + NAMED_MAX + ' people at most');
  return { wait, who: b.who, named };
}

async function get(req, res) {
  const q = new URL(req.url, 'http://x').searchParams, slug = await pageOf(q), p = await db('HGETALL', K.page(slug));
  const tabs = tabsOf(p), chat = chatOf(p);
  const chs = [...new Set(String(q.get('ch') || 'board').split(',').flatMap(c => (c === 'board' ? tabs.filter(t => t.kind !== 'notice').map(t => t.ch) : [chOf(tabs, c)])))];
  const me = await meOf(req, slug);
  const live = chs.filter(ch => keepOf(tabs, ch) > 0);
  const lists = await dbm(live.map(ch => ['LRANGE', K.board(slug, ch), 0, keepOf(tabs, ch) - 1]));
  const posts = {};
  chs.forEach(ch => { posts[ch] = []; });
  live.forEach((ch, i) => { posts[ch] = lists[i].map(one).filter(Boolean); });
  const tag = await tagsOf(Object.values(posts).flat().map(x => x.by));
  for (const ch of live) posts[ch].forEach(x => { x.tag = tag[x.by]; });
  answer(res, 200, { ok: true, me: said(me), tabs, chat: await chatSaid(chat, me), posts });
}

async function post(req, res) {
  if (!sameSite(req)) throw bad(403, 'origin', 'that post came from another site');
  const body = await readBody(req);
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw bad(400, 'body', 'the post is not an op');
  const slug = await pageOf(new URL(req.url, 'http://x').searchParams, body), p = await db('HGETALL', K.page(slug));
  const tabs = tabsOf(p), chat = chatOf(p);
  const me = await meOf(req, slug);
  if (!me) throw bad(401, 'who', 'sign in to post');
  if (me.banned) throw bad(403, 'banned', 'this account may not post');
  if (!(await spend(me.id))) throw bad(429, 'rate', 'that is a lot in one hour — take a breath');
  switch (body.op) {
    case 'tabs': {                            // THE TABS: the keepers arrange the board
      if (!me.keeper) throw bad(403, 'role', 'the board\'s tabs are the keepers\' to arrange');
      const next = cleanTabs(body.tabs), gone = tabs.filter(t => t.kind !== 'notice' && !next.some(n => n.ch === t.ch && n.kind === t.kind));
      await db('HSET', K.page(slug), 'tabs', JSON.stringify(next));
      if (gone.length) await dbm(gone.map(t => ['DEL', K.board(slug, t.ch)]));   // a tab taken down, or made another kind, takes its posts
      await W.audit(me.id, 'tabs', { page: slug, tabs: next.map(t => t.ch).join(','), gone: gone.map(t => t.ch).join(',') });
      return answer(res, 200, { ok: true, tabs: next });
    }
    case 'chat': {                            // THE CHAT'S RULES: who may say something, and the wait between two lines
      if (!me.keeper) throw bad(403, 'role', 'the chat\'s rules are the keepers\' to set');
      const next = cleanChat(body);
      await db('HSET', K.page(slug), 'chat', JSON.stringify(next));
      await W.audit(me.id, 'chat', { page: slug, who: next.who, wait: next.wait, named: next.named.length });
      return answer(res, 200, { ok: true, chat: await chatSaid(next, me) });
    }
  }
  const ch = chOf(tabs, body.ch), tab = tabs.find(t => t.ch === ch), key = K.board(slug, ch);
  switch (body.op) {
    case 'post': {
      const waitKey = K.rl('chat:' + slug + ':' + me.id, 'wait');
      if (ch === 'chat') {
        if (!canChat(me, chat)) throw bad(403, 'role', chat.who === 'keepers' ? 'only the keepers may chat here' : 'this chat is for the people the keepers named');
        if (chat.wait) {                      // THE WAIT: the last line's time, kept as long as the wait lasts
          const left = Math.ceil(((+(await db('GET', waitKey)) || 0) + chat.wait * 1000 - Date.now()) / 1000);
          if (left > 0) throw bad(429, 'wait', 'please wait ' + left + (left === 1 ? ' second' : ' seconds') + ' before your next message', { wait: left });
        }
      } else {
        if (tab.kind === 'notice') throw bad(400, 'ch', 'that tab is a notice the keepers write from the dashboard');
        if (tab.who === 'keepers' && !me.keeper) throw bad(403, 'role', 'the keepers write the ' + tab.title.toLowerCase());
      }
      const x = { id: newId(), by: me.id, at: Date.now(), text: ch === 'chat' ? text(body.text, CAP.line) : prose(body.text, CAP.body) };
      if (!x.text) throw bad(400, 'text', 'say something');
      if (ch !== 'chat' && tab.kind === 'threads' && body.re != null && body.re !== '') {
        const re = String(body.re), list = (await db('LRANGE', key, 0, -1)).map(one);
        if (!list.some(t => t && t.id === re && !t.re)) throw bad(404, 're', 'no such thread');
        x.re = re;
      } else if (ch !== 'chat') {
        x.title = text(body.title, CAP.title);
        if (!x.title) throw bad(400, 'title', 'give it a title');
      }
      await dbm([['LPUSH', key, JSON.stringify(x)], ['LTRIM', key, 0, keepOf(tabs, ch) - 1]]);
      if (ch === 'chat' && chat.wait) await db('SET', waitKey, String(x.at), 'EX', chat.wait);
      return answer(res, 200, { ok: true, post: Object.assign({ tag: me.tag }, x) });
    }
    case 'drop': {
      const id = String(body.id == null ? '' : body.id), raw = await db('LRANGE', key, 0, -1);
      const hit = raw.map(s => [s, one(s)]).find(([, x]) => x && x.id === id), x = hit && hit[1];
      if (!x) throw bad(404, 'post', 'no such post');
      if (x.by !== me.id && !me.keeper) throw bad(403, 'role', 'that is somebody else\'s post');
      const gone = raw.filter(s => { const y = one(s); return y && (y.id === id || y.re === id); });   // a thread takes its replies with it
      await dbm(gone.map(s => ['LREM', key, 0, s]));
      if (x.by !== me.id) await W.audit(me.id, 'hide', { page: slug, ch, id, of: x.by, text: String(x.text || '').slice(0, 140) });
      return answer(res, 200, { ok: true, gone: gone.length });
    }
    default: throw bad(400, 'op', 'no such op');
  }
}

module.exports = async function handler(req, res) {
  try {
    if (!W.storeFor()) throw bad(503, 'no-store', 'this site has no store for the board yet');
    if (req.method === 'GET') return await get(req, res);
    if (req.method === 'POST') return await post(req, res);
    answer(res, 405, { ok: false, error: 'GET or POST' });
  } catch (e) {
    if (e instanceof Bad) return answer(res, e.status, Object.assign({ ok: false, code: e.code, error: e.message }, e.extra || {}));
    if (e instanceof SyntaxError) return answer(res, 400, { ok: false, code: 'body', error: 'the post is not JSON' });
    console.error('api/board.js: ' + String((e && e.stack) || e));
    answer(res, 500, { ok: false, code: 'server', error: 'the board is having trouble — try again in a moment' });
  }
};
Object.assign(module.exports, { TABS, TABS_MAX, WAIT_MAX, tabsOf });   // for the probes, and the leaderboard's count (api/leaderboard.js)
