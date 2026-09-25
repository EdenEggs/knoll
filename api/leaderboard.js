/* ── api/leaderboard.js — THE LEADERBOARD ──────────────────────────────────
   One Vercel function at /api/leaderboard, and the same module mounted by
   serve.js at the same path on the dev server. toem2/leaderboard.js reads
   here; dashboard/manage.js says what it shows.

   WHO STANDS WHERE is counted from what a page already keeps — its wall's
   log (api/wall.js: the last LOG_KEEP revisions, each with `by` and `at`),
   its board's tabs and its chat (api/board.js), its album and the hearts on
   it (api/gallery.js) — so a page nobody has used yet has an empty board,
   and nothing extra is written when somebody edits. Six rankings:
     edits    most revisions of the wall          days    most days with a revision (the most active)
     first    the first to edit here              posts   most board posts and chat lines
     photos   most photos in the album            hearts  most hearts on their photos
   THE KEEPERS SAY which of them the board shows and in what order, its
   title and the line under it, and how many rows (page:<slug> `ranks`).

   THE COUNT IS KEPT TEN MINUTES (lb:<slug>, a string that expires): the
   first ask after that counts again; a keeper's settings save clears it,
   and a keeper may ask ?fresh=1.

     GET  ?page=<slug> [&fresh=1]
          → { ok, me: {id, tag, keeper} | null, settings: { tabs, title, sub, top }, metrics: { <m>: {label, blurb} },
              counted: <ms>, ranks: { <m>: [{id, tag, value, sub}] } (the top rows of each tab shown),
              you: { <m>: { rank, value, sub } | null } (signed in) }
     POST { op: 'settings', tabs, title, sub, top } → { ok, settings }   (the keepers)

   ponytail: the whole log, the board and the album are read to count — a
   few thousand records at most, once in ten minutes; a running tally on the
   user hash if a page ever outgrows that. The log keeps LOG_KEEP revisions,
   so "first" and "most edits" are within them. */
'use strict';

const W = require('./wall.js');
const B = require('./board.js');
const { db, dbm, K, answer, readBody, Bad, bad, sameSite, whoIs, isMod, rulesOf, tagsOf, text, HOME, SLUG_RE, USER_RE, pageKeys } = W;

const METRICS = {
  edits: { label: 'Most edits', blurb: 'The most revisions of this wall' },
  days: { label: 'Most active', blurb: 'The most days with an edit here' },
  first: { label: 'First here', blurb: 'The first to edit this wall' },
  posts: { label: 'Most posts', blurb: 'The most board posts and chat lines' },
  photos: { label: 'Most photos', blurb: 'The most photos in the album' },
  hearts: { label: 'Most hearts', blurb: 'The most hearts on their photos' }
};
const DEFAULT = { tabs: ['edits', 'days', 'first'], title: 'Leaderboard', sub: 'Counted up every ten minutes', top: 10 };
const CAP = { title: 24, sub: 60, topMin: 3, topMax: 25 }, KEEP_S = 600;
const RATE = 60;
const hour = () => Math.floor(Date.now() / 36e5);
async function spend(u) {
  const k = K.rl('board:' + u, hour()), n = await db('INCR', k);   // the corner's one counter (api/board.js)
  if (n === 1) await db('EXPIRE', k, 3600);
  return n <= RATE;
}
const parse = (s, dflt) => { try { const v = s ? JSON.parse(s) : dflt; return v == null ? dflt : v; } catch (e) { return dflt; } };

async function pageOf(q, body) {
  const s = String((body && body.page) || q.get('page') || HOME).toLowerCase();
  if (s === HOME) return s;
  if (!SLUG_RE.test(s) || !(await db('HGET', K.page(s), 'made'))) throw bad(404, 'page', 'no such page');
  return s;
}
async function meOf(req, slug) {
  const me = await whoIs(req);
  if (!me) return null;
  const rules = await rulesOf({ slug }, me), mod = isMod(me);
  return { id: me.id, tag: me.tag, banned: me.banned, mod, keeper: mod || !!rules.keeper };
}
const said = me => me && { id: me.id, tag: me.tag, keeper: me.keeper, mod: me.mod };

// ── the settings, off the page's hash ─────────────────────────────────────
function settingsOf(p) {
  const s = parse(p.ranks, null) || {};
  const tabs = Array.isArray(s.tabs) ? [...new Set(s.tabs.filter(m => METRICS[m]))] : [];
  return { tabs: tabs.length ? tabs : DEFAULT.tabs, title: text(s.title, CAP.title) || DEFAULT.title, sub: s.sub == null ? DEFAULT.sub : text(s.sub, CAP.sub),
           top: Math.min(CAP.topMax, Math.max(CAP.topMin, Math.floor(+s.top) || DEFAULT.top)) };
}
function cleanSettings(b) {
  const tabs = Array.isArray(b.tabs) ? [...new Set(b.tabs.map(String))] : [];
  if (!tabs.length || tabs.length > Object.keys(METRICS).length || tabs.some(m => !METRICS[m])) throw bad(400, 'ranks', 'the leaderboard shows one to six of: ' + Object.keys(METRICS).join(', '));
  const title = text(b.title, CAP.title);
  if (!title) throw bad(400, 'ranks', 'the leaderboard needs a title');
  const top = Math.floor(+b.top);
  if (!(top >= CAP.topMin && top <= CAP.topMax)) throw bad(400, 'ranks', 'the leaderboard shows ' + CAP.topMin + ' to ' + CAP.topMax + ' rows');
  return { tabs, title, sub: text(b.sub, CAP.sub), top };
}

// ── the count ─────────────────────────────────────────────────────────────
const one = s => { try { const p = JSON.parse(s); return p && typeof p === 'object' && USER_RE.test(String(p.by || '')) ? p : null; } catch (e) { return null; } };
const plural = (n, word) => n + ' ' + word + (n === 1 ? '' : 's');
async function count(slug) {
  const pg = pageKeys(slug), p = await db('HGETALL', K.page(slug));
  const chs = B.tabsOf(p).filter(t => t.kind !== 'notice').map(t => t.ch).concat(['chat']);
  const [log, album, ...lists] = await dbm([['LRANGE', pg.log, 0, -1], ['LRANGE', K.album(slug), 0, -1]].concat(chs.map(ch => ['LRANGE', K.board(slug, ch), 0, -1])));
  const by = {};
  const of = u => by[u] || (by[u] = { edits: 0, days: new Set(), first: Infinity, posts: 0, photos: 0, hearts: 0 });
  log.map(one).filter(Boolean).forEach(e => { const a = of(e.by), at = +e.at || 0; a.edits++; a.days.add(new Date(at).toISOString().slice(0, 10)); if (at && at < a.first) a.first = at; });
  lists.flat().map(one).filter(Boolean).forEach(x => { of(x.by).posts++; });
  const photos = album.map(one).filter(Boolean);
  const likes = photos.length ? await dbm(photos.map(x => ['SCARD', K.albumLike(slug, x.id)])) : [];
  photos.forEach((x, i) => { const a = of(x.by); a.photos++; a.hearts += +likes[i] || 0; });
  const ids = Object.keys(by), tag = await tagsOf(ids);
  const row = (u, value, sub) => ({ id: u, tag: tag[u] || '', value, sub });
  const rank = (has, order, value, sub) => ids.filter(u => has(by[u])).sort((a, b) => order(by[a], by[b])).map(u => row(u, value(by[u]), sub(by[u])));
  return { at: Date.now(), ranks: {
    edits: rank(a => a.edits, (a, b) => b.edits - a.edits || a.first - b.first, a => a.edits, a => plural(a.days.size, 'day') + ' active'),
    days: rank(a => a.days.size, (a, b) => b.days.size - a.days.size || b.edits - a.edits, a => a.days.size, a => plural(a.edits, 'edit')),
    first: rank(a => a.first < Infinity, (a, b) => a.first - b.first, a => a.first, a => plural(a.edits, 'edit')),
    posts: rank(a => a.posts, (a, b) => b.posts - a.posts, a => a.posts, () => 'on the board and in the chat'),
    photos: rank(a => a.photos, (a, b) => b.photos - a.photos || b.hearts - a.hearts, a => a.photos, a => plural(a.hearts, 'heart')),
    hearts: rank(a => a.hearts, (a, b) => b.hearts - a.hearts || b.photos - a.photos, a => a.hearts, a => plural(a.photos, 'photo'))
  } };
}

async function get(req, res) {
  const q = new URL(req.url, 'http://x').searchParams, slug = await pageOf(q), settings = settingsOf(await db('HGETALL', K.page(slug)));
  const me = await meOf(req, slug);
  let c = q.get('fresh') && me && me.keeper ? null : parse(await db('GET', K.lb(slug)), null);
  if (!c || !c.at || !c.ranks) { c = await count(slug); await db('SET', K.lb(slug), JSON.stringify(c), 'EX', KEEP_S); }
  const ranks = {}, you = {};
  settings.tabs.forEach(m => {
    const list = c.ranks[m] || [];
    ranks[m] = list.slice(0, settings.top);
    if (me) { const i = list.findIndex(r => r.id === me.id); you[m] = i < 0 ? null : { rank: i + 1, value: list[i].value, sub: list[i].sub }; }
  });
  answer(res, 200, { ok: true, me: said(me), settings, metrics: METRICS, counted: c.at, ranks, you: me ? you : undefined });
}

async function post(req, res) {
  if (!sameSite(req)) throw bad(403, 'origin', 'that post came from another site');
  const body = await readBody(req);
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw bad(400, 'body', 'the post is not an op');
  const slug = await pageOf(new URL(req.url, 'http://x').searchParams, body);
  const me = await meOf(req, slug);
  if (!me) throw bad(401, 'who', 'sign in to do that');
  if (me.banned) throw bad(403, 'banned', 'this account may not post');
  if (body.op !== 'settings') throw bad(400, 'op', 'no such op');
  if (!me.keeper) throw bad(403, 'role', 'the leaderboard is the keepers\' to arrange');
  if (!(await spend(me.id))) throw bad(429, 'rate', 'that is a lot in one hour — take a breath');
  const next = cleanSettings(body);
  await dbm([['HSET', K.page(slug), 'ranks', JSON.stringify(next)], ['DEL', K.lb(slug)]]);   // counted afresh on the next look
  await W.audit(me.id, 'ranks', { page: slug, tabs: next.tabs.join(','), title: next.title, top: next.top });
  answer(res, 200, { ok: true, settings: next });
}

module.exports = async function handler(req, res) {
  try {
    if (!W.storeFor()) throw bad(503, 'no-store', 'this site has no store for the leaderboard yet');
    if (req.method === 'GET') return await get(req, res);
    if (req.method === 'POST') return await post(req, res);
    answer(res, 405, { ok: false, error: 'GET or POST' });
  } catch (e) {
    if (e instanceof Bad) return answer(res, e.status, { ok: false, code: e.code, error: e.message });
    if (e instanceof SyntaxError) return answer(res, 400, { ok: false, code: 'body', error: 'the post is not JSON' });
    console.error('api/leaderboard.js: ' + String((e && e.stack) || e));
    answer(res, 500, { ok: false, code: 'server', error: 'the leaderboard is having trouble — try again in a moment' });
  }
};
Object.assign(module.exports, { METRICS, DEFAULT, KEEP_S });   // for the probes
