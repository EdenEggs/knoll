/* ── api/board.js — THE TOWN BOARD AND THE CHAT ─────────────────────────────
   One Vercel function at /api/board, and the same module mounted by
   serve.js at the same path on the dev server (as api/friends.js is).
   toem2/board.js reads and posts here: the board's NEWS and UPDATES (the
   page's keepers write them — api/wall.js: THE RULES — and everyone reads
   them), its FORUM (threads and replies, anyone signed in), and the CHAT
   (one line at a time, anyone signed in). The RULES tab is the page's own
   words; nothing of it is kept here.

   A CHANNEL IS A LIST, newest first, under board:<slug>:<ch>, trimmed to
   what it keeps: {id, by, at, text, title?, re?} — re names the forum
   thread a reply is under. Names are looked up when read (tagsOf), so a
   rename shows; pictures are the gnome's card's (/api/wall?who=), which
   the page fetches once per author.

     GET  ?page=<slug>&ch=news,updates,forum | chat
          → { ok, me: {id, tag, keeper, mod} | null, posts: { <ch>: [{id, by, tag, at, text, title?, re?}] } }
     POST { op: 'post', ch, text, title?, re? } → { ok, post }   (news/updates: the keepers; a forum thread wants a title)
          { op: 'drop', ch, id }                → { ok, gone }   (your own, or a keeper's to hide — audited; a thread takes its replies)

   ponytail: an hour's counter per account; a list is trimmed, so the oldest
   fall off the end rather than being paged — pages when a forum fills. */
'use strict';

const crypto = require('crypto');
const W = require('./wall.js');
const { db, dbm, K, answer, readBody, Bad, bad, sameSite, whoIs, isMod, rulesOf, tagsOf, text, HOME, SLUG_RE } = W;

const CH = { news: { keep: 100, keepers: true }, updates: { keep: 100, keepers: true }, forum: { keep: 500 }, chat: { keep: 200 } };
const CAP = { title: 80, line: 500, body: 2000 };
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

async function pageOf(q, body) {
  const s = String((body && body.page) || q.get('page') || HOME).toLowerCase();
  if (s === HOME) return s;
  if (!SLUG_RE.test(s) || !(await db('HGET', K.page(s), 'made'))) throw bad(404, 'page', 'no such page');
  return s;
}
const chOf = v => { const ch = String(v == null ? '' : v); if (!CH[ch]) throw bad(400, 'ch', 'no such channel'); return ch; };
async function meOf(req, slug) {              // who is asking, and what they are on this page
  const me = await whoIs(req);
  if (!me) return null;
  const rules = await rulesOf({ slug }, me), mod = isMod(me);
  return { id: me.id, tag: me.tag, banned: me.banned, mod, keeper: mod || !!rules.keeper };
}
const said = me => me && { id: me.id, tag: me.tag, keeper: me.keeper, mod: me.mod };

async function get(req, res) {
  const q = new URL(req.url, 'http://x').searchParams, slug = await pageOf(q);
  const chs = [...new Set(String(q.get('ch') || 'news,updates,forum').split(',').map(chOf))];
  const me = await meOf(req, slug);
  const lists = await dbm(chs.map(ch => ['LRANGE', K.board(slug, ch), 0, CH[ch].keep - 1]));
  const posts = {};
  chs.forEach((ch, i) => { posts[ch] = lists[i].map(one).filter(Boolean); });
  const tag = await tagsOf(Object.values(posts).flat().map(p => p.by));
  for (const ch of chs) posts[ch].forEach(p => { p.tag = tag[p.by]; });
  answer(res, 200, { ok: true, me: said(me), posts });
}

async function post(req, res) {
  if (!sameSite(req)) throw bad(403, 'origin', 'that post came from another site');
  const body = await readBody(req);
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw bad(400, 'body', 'the post is not an op');
  const slug = await pageOf(new URL(req.url, 'http://x').searchParams, body);
  const me = await meOf(req, slug);
  if (!me) throw bad(401, 'who', 'sign in to post');
  if (me.banned) throw bad(403, 'banned', 'this account may not post');
  if (!(await spend(me.id))) throw bad(429, 'rate', 'that is a lot in one hour — take a breath');
  const ch = chOf(body.ch), key = K.board(slug, ch);
  switch (body.op) {
    case 'post': {
      if (CH[ch].keepers && !me.keeper) throw bad(403, 'role', 'the keepers write the ' + ch);
      const p = { id: newId(), by: me.id, at: Date.now(), text: ch === 'chat' ? text(body.text, CAP.line) : prose(body.text, CAP.body) };
      if (!p.text) throw bad(400, 'text', 'say something');
      if (ch === 'forum' && body.re != null && body.re !== '') {
        const re = String(body.re), list = (await db('LRANGE', key, 0, -1)).map(one);
        if (!list.some(t => t && t.id === re && !t.re)) throw bad(404, 're', 'no such thread');
        p.re = re;
      } else if (ch !== 'chat') {
        p.title = text(body.title, CAP.title);
        if (!p.title) throw bad(400, 'title', 'give it a title');
      }
      await dbm([['LPUSH', key, JSON.stringify(p)], ['LTRIM', key, 0, CH[ch].keep - 1]]);
      return answer(res, 200, { ok: true, post: Object.assign({ tag: me.tag }, p) });
    }
    case 'drop': {
      const id = String(body.id == null ? '' : body.id), raw = await db('LRANGE', key, 0, -1);
      const hit = raw.map(s => [s, one(s)]).find(([, p]) => p && p.id === id), p = hit && hit[1];
      if (!p) throw bad(404, 'post', 'no such post');
      if (p.by !== me.id && !me.keeper) throw bad(403, 'role', 'that is somebody else\'s post');
      const gone = raw.filter(s => { const x = one(s); return x && (x.id === id || x.re === id); });   // a thread takes its replies with it
      await dbm(gone.map(s => ['LREM', key, 0, s]));
      if (p.by !== me.id) await W.audit(me.id, 'hide', { page: slug, ch, id, of: p.by, text: String(p.text || '').slice(0, 140) });
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
    if (e instanceof Bad) return answer(res, e.status, { ok: false, code: e.code, error: e.message });
    if (e instanceof SyntaxError) return answer(res, 400, { ok: false, code: 'body', error: 'the post is not JSON' });
    console.error('api/board.js: ' + String((e && e.stack) || e));
    answer(res, 500, { ok: false, code: 'server', error: 'the board is having trouble — try again in a moment' });
  }
};
