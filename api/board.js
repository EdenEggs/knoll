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
   notice) and Forum (threads, anyone). The list lives on the page's hash
   (api/wall.js: page:<slug> `tabs`), so a page not designed yet has the
   defaults. A tab taken down, or turned into another kind, takes its posts
   with it.

   A NOTICE'S RULES (2026-09-28). A notice is its words (`text`) and, under
   them, numbered rules — `rules`: [{title, text}], ten at most — which the
   dashboard lists one to a row. A Rules tab nobody has written has the five
   its page starts with (START: the town's on TOEM 2, Knoll's on a space);
   a notice saved before there were rules has its words and none.

   BACK TO THE DEFAULT (2026-09-28): `reset: true` on `tabs` or `chat` puts
   that field back as a page starts with it — the four tabs and the five
   rules; anyone signed in and no wait. A tab that was added goes, and its
   posts with it; one taken down comes back empty.

   THE CHAT'S RULES live beside them (`chat`): `who` may say something —
   anyone signed in, the keepers, or the people the keepers `named` — and
   `wait`, the seconds one account must leave between two lines (0 = none),
   kept as a key that expires (rl:chat:<slug>:<u>:wait).

   WHO IS HERE (2026-09-28). A read that says `here` — the bench's board
   says it every half minute, and when the list is opened — marks the
   account that asks as on the page (here:<slug>, a sorted set scored by
   when; signed in, not banned, and asked from a page of this site) and
   answers with who was seen in the last minute and a half: how many
   (`here=1`), to anyone, and who (`here=2`), to the signed in — so nobody
   lists a page's visitors from outside. That list is kept no longer
   than that; what IS kept is the first time an account was ever seen on a
   page (joined:<slug>), for the history on the page's dashboard.

   A CHANNEL IS A LIST, newest first, under board:<slug>:<ch>, trimmed to
   what its kind keeps: {id, by, at, text, title?, re?, label?, major?} — re
   names the thread a reply is under; label and major are a posts tab's
   (A NOTICE'S LABEL, below). Names are looked up when read (tagsOf), so a
   rename shows; pictures are the gnome's card's (/api/wall?who=), which
   the page fetches once per author.

     GET  ?page=<slug>&ch=board | chat | board,chat | <ch>,<ch>… [&here=1 | 2]      (board: every tab that keeps posts)
          → { ok, me: {id, tag, keeper, mod} | null, tabs: [{ch, title, kind, who, text?, rules?: [{title, text}]}],
              chat: { who, wait, can, named?: [{id, tag}] (for a keeper) },
              posts: { <ch>: [{id, by, tag, at, text, title?, re?}] },
              here?: { n, who?: [{id, tag}] (signed in) } }
     POST { op: 'post', ch, text, title?, re?, label?, major? } → { ok, post }   (a keepers' tab: the keepers; a thread wants a title; the chat: by its rules)
          { op: 'drop', ch, id }                 → { ok, gone }   (your own, or a keeper's to hide — audited; a thread takes its replies)
          { op: 'tabs', tabs: [{ch, title, kind, who, text?, rules?}] } → { ok, tabs }   (the keepers; one to eight)
          { op: 'chat', who, wait, named: [id] } → { ok, chat }   (the keepers)
          { op: 'tabs' | 'chat', reset: true }   → { ok, tabs } | { ok, chat }   (the keepers: back to the default)

   ponytail: an hour's counter per account; a list is trimmed, so the oldest
   fall off the end rather than being paged — pages when a forum fills. */
'use strict';

const crypto = require('crypto');
const W = require('./wall.js');
const { db, dbm, K, answer, readBody, Bad, bad, sameSite, whoIs, isMod, rulesOf, tagsOf, text, HOME, SLUG_RE, USER_RE } = W;

const KIND = { posts: 100, threads: 500, notice: 0 };       // what a kind of tab keeps
const CHAT_KEEP = 200;
const HERE_S = 90, HERE_MAX = 50;             // on the page: seen in the last minute and a half; fifty named at most
const TABS = [{ ch: 'news', title: 'News', kind: 'posts', who: 'keepers' }, { ch: 'updates', title: 'Updates', kind: 'posts', who: 'keepers' },
              { ch: 'rules', title: 'Rules', kind: 'notice', who: 'keepers', text: '' }, { ch: 'forum', title: 'Forum', kind: 'threads', who: 'anyone' }];
const TABS_MAX = 8, RULES_MAX = 10, CH_RE = /^[a-z0-9][a-z0-9-]{0,19}$/, WHO = ['anyone', 'keepers', 'named'], WAIT_MAX = 3600, NAMED_MAX = 50;
const CAP = { title: 80, line: 500, body: 2000, tab: 24, notice: 4000, label: 16, rule: 60, ruleText: 200 };
// THE RULES A PAGE STARTS WITH: the town's on TOEM 2, Knoll's on a space (toem2/board.js keeps the same two, for while the door is quiet)
const START = {
  town: ['Keep the town friendly. Moderators can hide posts that break these.',
         ['Be kind', 'No insults, name-calling or pile-ons.'], ['Share your own photos', 'Credit others when posting their shots.'], ['No spoilers in titles', 'Put quest solutions inside the thread.'],
         ['One thread per topic', 'Search before posting a new one.'], ['No selling or ads', 'Stamp trades are fine, money is not.']],
  space: ['Keep the place friendly. Moderators can hide posts that break these.',
          ['Be kind', 'No insults, name-calling or pile-ons.'], ['Credit the maker', 'Say whose work it is when you share it.'], ['No spoilers in titles', 'Keep surprises inside the thread.'],
          ['One thread per topic', 'Search before posting a new one.'], ['No selling or ads', 'Swaps are fine, money is not.']]
};
const startOf = slug => { const [words, ...rules] = START[slug === HOME ? 'town' : 'space']; return { text: words, rules: rules.map(([title, line]) => ({ title, text: line })) }; };
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
// a notice is read with its rules: a Rules tab nobody has written has the five its page starts with; a notice from before there were rules has none
const ruled = (list, slug) => list.map(t => (t.kind !== 'notice' || Array.isArray(t.rules) ? t : Object.assign({}, t, !t.text && t.ch === 'rules' ? startOf(slug) : { rules: [] })));
const tabsOf = (p, slug) => { const t = parse(p.tabs, null); return ruled(Array.isArray(t) && t.length ? t : TABS, slug); };
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
function cleanRules(v) {
  if (!Array.isArray(v) || v.length > RULES_MAX) throw bad(400, 'tabs', 'a notice has up to ' + RULES_MAX + ' rules');
  return v.map(r => {
    const title = text(r && r.title, CAP.rule);
    if (!title) throw bad(400, 'tabs', 'every rule needs a title');
    return { title, text: text(r.text, CAP.ruleText) };
  });
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
    if (kind === 'notice') { out.text = prose(t.text, CAP.notice); if (t.rules != null) out.rules = cleanRules(t.rules); }   // no rules sent (a dashboard from before them): none kept, and the tab reads as it did
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
  const tabs = tabsOf(p, slug), chat = chatOf(p);
  const chs = [...new Set(String(q.get('ch') || 'board').split(',').flatMap(c => (c === 'board' ? tabs.filter(t => t.kind !== 'notice').map(t => t.ch) : [chOf(tabs, c)])))];
  const me = await meOf(req, slug);
  const live = chs.filter(ch => keepOf(tabs, ch) > 0);
  const lists = await dbm(live.map(ch => ['LRANGE', K.board(slug, ch), 0, keepOf(tabs, ch) - 1]));
  const posts = {};
  chs.forEach(ch => { posts[ch] = []; });
  live.forEach((ch, i) => { posts[ch] = lists[i].map(one).filter(Boolean); });
  // WHO IS HERE: here=1 marks and counts, here=2 names them as well — and only a page of this site marks anybody: a link from elsewhere, followed, is nobody arriving
  const mine = sameSite(req) ? me : null, on = q.get('here') ? await hereOf(slug, mine, q.get('here') === '2' && !!mine) : null;
  const tag = await tagsOf(Object.values(posts).flat().map(x => x.by).concat(on && on.who ? on.who : []));
  for (const ch of live) posts[ch].forEach(x => { x.tag = tag[x.by]; });
  const here = on ? Object.assign({ n: on.n }, on.who ? { who: on.who.map(u => ({ id: u, tag: tag[u] })).sort((a, b) => a.tag.localeCompare(b.tag)) } : {}) : undefined;
  answer(res, 200, { ok: true, me: said(me), tabs, chat: await chatSaid(chat, me), posts, here });
}
/* WHO IS HERE: the one asking is marked, the ones not seen for HERE_S are swept, and the rest are counted — or, when
   they are asked for by name, listed. Whoever is newly here is kept the first time ever, with when (joined:<slug>):
   the JOINED lines of the page's history, which its keepers read on its dashboard (api/wall.js: THE PAGE'S HISTORY).
   ponytail: four commands a mark, and two more a name when the list is asked for — fine to the fifty it names; a
   count kept beside the set if a page ever has hundreds on it at once. */
async function hereOf(slug, me, named) {
  const key = K.here(slug), now = Date.now(), since = now - HERE_S * 1000, mark = !!me && !me.banned;
  const out = await dbm((mark ? [['ZADD', key, now, me.id], ['EXPIRE', key, HERE_S * 2]] : []).concat([['ZREMRANGEBYSCORE', key, '-inf', since], named ? ['ZRANGEBYSCORE', key, since, '+inf'] : ['ZCARD', key]]));
  if (mark && out[0]) await db('HSETNX', K.joined(slug), me.id, String(now));
  const last = out[out.length - 1];
  return named ? { n: last.length, who: last.filter(u => USER_RE.test(u)).slice(-HERE_MAX) } : { n: +last || 0 };
}

async function post(req, res) {
  if (!sameSite(req)) throw bad(403, 'origin', 'that post came from another site');
  const body = await readBody(req);
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw bad(400, 'body', 'the post is not an op');
  const slug = await pageOf(new URL(req.url, 'http://x').searchParams, body), p = await db('HGETALL', K.page(slug));
  const tabs = tabsOf(p, slug), chat = chatOf(p);
  const me = await meOf(req, slug);
  if (!me) throw bad(401, 'who', 'sign in to post');
  if (me.banned) throw bad(403, 'banned', 'this account may not post');
  if (!(await spend(me.id))) throw bad(429, 'rate', 'that is a lot in one hour — take a breath');
  switch (body.op) {
    case 'tabs': {                            // THE TABS: the keepers arrange the board
      if (!me.keeper) throw bad(403, 'role', 'the board\'s tabs are the moderators\' to arrange');
      // BACK TO THE DEFAULT: the field is emptied, so the page has what a page starts with (the file store has no HDEL)
      const reset = body.reset === true, next = reset ? TABS : cleanTabs(body.tabs), gone = tabs.filter(t => t.kind !== 'notice' && !next.some(n => n.ch === t.ch && n.kind === t.kind));
      await db('HSET', K.page(slug), 'tabs', reset ? '' : JSON.stringify(next));
      if (gone.length) await dbm(gone.map(t => ['DEL', K.board(slug, t.ch)]));   // a tab taken down, or made another kind, takes its posts
      await W.audit(me.id, 'tabs', { page: slug, tabs: next.map(t => t.ch).join(','), gone: gone.map(t => t.ch).join(','), reset: reset || undefined });
      return answer(res, 200, { ok: true, tabs: ruled(next, slug) });
    }
    case 'chat': {                            // THE CHAT'S RULES: who may say something, and the wait between two lines
      if (!me.keeper) throw bad(403, 'role', 'the chat\'s rules are the moderators\' to set');
      const reset = body.reset === true, next = reset ? chatOf({}) : cleanChat(body);
      await db('HSET', K.page(slug), 'chat', reset ? '' : JSON.stringify(next));
      await W.audit(me.id, 'chat', { page: slug, who: next.who, wait: next.wait, named: next.named.length, reset: reset || undefined });
      return answer(res, 200, { ok: true, chat: await chatSaid(next, me) });
    }
  }
  const ch = chOf(tabs, body.ch), tab = tabs.find(t => t.ch === ch), key = K.board(slug, ch);
  switch (body.op) {
    case 'post': {
      const waitKey = K.rl('chat:' + slug + ':' + me.id, 'wait');
      if (ch === 'chat') {
        if (!canChat(me, chat)) throw bad(403, 'role', chat.who === 'keepers' ? 'only the moderators may chat here' : 'this chat is for the people the moderators named');
        if (chat.wait) {                      // THE WAIT: the last line's time, kept as long as the wait lasts
          const left = Math.ceil(((+(await db('GET', waitKey)) || 0) + chat.wait * 1000 - Date.now()) / 1000);
          if (left > 0) throw bad(429, 'wait', 'please wait ' + left + (left === 1 ? ' second' : ' seconds') + ' before your next message', { wait: left });
        }
      } else {
        if (tab.kind === 'notice') throw bad(400, 'ch', 'that tab is a notice the moderators write from the dashboard');
        if (tab.who === 'keepers' && !me.keeper) throw bad(403, 'role', 'the moderators write the ' + tab.title.toLowerCase());
      }
      const x = { id: newId(), by: me.id, at: Date.now(), text: ch === 'chat' ? text(body.text, CAP.line) : prose(body.text, CAP.body) };
      if (!x.text) throw bad(400, 'text', 'say something');
      let under = null;                       // the thread a reply is under
      if (ch !== 'chat' && tab.kind === 'threads' && body.re != null && body.re !== '') {
        const re = String(body.re), list = (await db('LRANGE', key, 0, -1)).map(one);
        under = list.find(t => t && t.id === re && !t.re);
        if (!under) throw bad(404, 're', 'no such thread');
        x.re = re;
      } else if (ch !== 'chat') {
        x.title = text(body.title, CAP.title);
        if (!x.title) throw bad(400, 'title', 'give it a title');
        /* A NOTICE'S LABEL, AND MAJOR (2026-09-28): an entry on a posts tab may carry a word of its own — Notice, v1.2, Fix —
           and a keeper may mark it major; a space's board draws both (toem2/board.js: KNOLL'S OWN CORNER). One line of
           text, like the title, and set as text wherever it is drawn. */
        if (tab.kind === 'posts') {
          const label = text(body.label, CAP.label);
          if (label) x.label = label;
          if (body.major === true && me.keeper) x.major = true;
        }
      }
      await dbm([['LPUSH', key, JSON.stringify(x)], ['LTRIM', key, 0, keepOf(tabs, ch) - 1]]);
      if (ch === 'chat' && chat.wait) await db('SET', waitKey, String(x.at), 'EX', chat.wait);
      /* THE BELL (2026-09-27): a thread begun at a space rings its keepers' bells, and a reply the
         bell of whoever began the thread — once a place while unread (api/wall.js: tellOnce). The
         chat rings nobody's, and neither do the keepers' own tabs: those are theirs to write. */
      if (ch !== 'chat' && tab.kind === 'threads') {
        const rules = await rulesOf({ slug }, null);
        if (under) { if (USER_RE.test(under.by) && under.by !== me.id) await W.tellOnce(under.by, 'reply', me.id, { slug, title: rules.title, what: under.title }); }
        else await W.tellKeepers(rules, me.id, 'thread', { what: x.title });
      }
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
Object.assign(module.exports, { TABS, TABS_MAX, RULES_MAX, WAIT_MAX, tabsOf, startOf });   // for the probes, and the leaderboard's count (api/leaderboard.js)
