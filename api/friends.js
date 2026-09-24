/* ── api/friends.js — WHO YOU KNOW, AND WHAT YOU WERE TOLD ──────────────────
   One Vercel function at /api/friends, and the same module mounted by
   serve.js at the same path on the dev server (as api/auth.js is). The
   yard's friends and its bell read here; a space's page and the form at
   /yard/new/ invite from here.

   A FRIEND IS BOTH WAYS. One gnome asks by tag — Mossy#3, the name and its
   number (api/wall.js: THE NAMES) — the other says yes in their bell, and
   each is then in the other's friends:<u>. Asking somebody who has already
   asked you is saying yes.
   AN INVITE is to a space, from the gnome who made it, to their friends
   (the form's "Invite friends along", and the space's own page), and it
   lands in the friend's bell with the space's address. Who was invited is
   kept with the space (invited:<slug>): since 2026-09-24 they are its
   KEEPERS (api/wall.js: THREE LEVELS OF CHAOS) while they are still
   friends, so the bell says so, nobody is told twice, and uninvite takes
   one back off.
   THE BELL is notes:<u>, newest first, the last NOTES_KEEP; whatever came
   after the bell was last opened (`noted` on the account) is unseen. An ask
   leaves it once answered.

     GET  → { ok, me: {id, tag}, friends: [{id, tag}], asks: [{id, tag}],
              notes: [{kind, from: {id, tag}, at, slug?, title?}], unseen }
     POST { op: 'ask', tag }            → { ok, friends }   (true when they had asked you first)
          { op: 'answer', id, yes }     → { ok }
          { op: 'drop', id }            → { ok }            (friends no longer, both ways)
          { op: 'invite', slug, ids }   → { ok, sent }      (your space, your friends: its keepers)
          { op: 'uninvite', slug, ids } → { ok, gone }      (your space: keepers no more)
          { op: 'seen' }                → { ok }            (the bell was opened)

   ponytail: an hour's counter per account; a gnome who keeps asking one who
   keeps saying no is slowed, not stopped — a block list when that is a thing. */
'use strict';

const W = require('./wall.js');
const { db, dbm, K, answer, readBody, Bad, bad, sameSite, whoIs, USER_RE, SLUG_RE, tell, tagsOf } = W;

const RATE = 60;                              // posts an hour, an account (the bell itself — tell, tagsOf, NOTES_KEEP — is wall.js's now)
const hour = () => Math.floor(Date.now() / 36e5);
async function spend(u) {
  const k = K.rl('friends:' + u, hour()), n = await db('INCR', k);
  if (n === 1) await db('EXPIRE', k, 3600);
  return n <= RATE;
}
async function byTag(raw) {                    // 'Mossy#3' → the account that goes by it, if any
  const m = /^(.+)#(\d{1,7})$/.exec(String(raw == null ? '' : raw).trim()), name = m && W.cleanName(m[1]);
  const u = name ? await db('HGET', K.tags, W.foldName(name) + '#' + (+m[2])) : null;
  return u && USER_RE.test(u) && (await db('HGET', K.user(u), 'banned')) !== '1' ? u : null;
}
async function befriend(me, u) {
  await dbm([['SADD', K.friends(me), u], ['SADD', K.friends(u), me], ['SREM', K.asks(me), u], ['SREM', K.asks(u), me]]);
  await tell(u, 'friend', me);                 // the one who asked hears the yes
}

async function get(req, res) {
  const q = new URL(req.url, 'http://x').searchParams;
  if (q.get('who')) {                          // whose tag is this? anybody's to ask — a yard's address is its owner's name (yard/index.html: THE YARD HAS A NAME)
    const u = await byTag(q.get('who'));
    if (!u) throw bad(404, 'who', 'nobody goes by that tag');
    return answer(res, 200, { ok: true, id: u, tag: (await tagsOf([u]))[u] });
  }
  const me = await whoIs(req);
  if (!me) throw bad(401, 'who', 'sign in to see your friends');
  if (q.get('find') != null) {                 // ?find=<the start of a name> → up to eight accounts that go by it (settings: WHO CAN EDIT); signed in, so nobody lists the town from outside
    const key = W.foldName(String(q.get('find')).trim()).slice(0, 24);
    if (!key) return answer(res, 200, { ok: true, users: [] });
    // ponytail: the whole tags hash, read and filtered here — fine to a few thousand accounts; a lex index (ZRANGEBYLEX) past that
    const tags = await db('HGETALL', K.tags);
    const ids = [...new Set(Object.keys(tags).filter(t => t.startsWith(key)).sort().map(t => tags[t]))].filter(u => USER_RE.test(u) && u !== me.id).slice(0, 12);
    const banned = ids.length ? await dbm(ids.map(u => ['HGET', K.user(u), 'banned'])) : [];
    const found = ids.filter((u, i) => banned[i] !== '1').slice(0, 8), tag = await tagsOf(found);
    return answer(res, 200, { ok: true, users: found.map(u => ({ id: u, tag: tag[u] })) });
  }
  const [friends, asks, raw, noted] = await dbm([['SMEMBERS', K.friends(me.id)], ['SMEMBERS', K.asks(me.id)],
                                                ['LRANGE', K.notes(me.id), 0, -1], ['HGET', K.user(me.id), 'noted']]);
  const asked = new Set();
  const notes = raw.map(s => JSON.parse(s)).filter(n => n.kind !== 'ask' || (asks.includes(n.from) && !asked.has(n.from) && asked.add(n.from)));
  const tag = await tagsOf(friends.concat(asks, notes.map(n => n.from)));
  answer(res, 200, { ok: true, me: { id: me.id, tag: me.tag },
    friends: friends.map(u => ({ id: u, tag: tag[u] })).sort((a, b) => a.tag.localeCompare(b.tag)),
    asks: asks.map(u => ({ id: u, tag: tag[u] })),
    notes: notes.map(n => Object.assign(n, { from: { id: n.from, tag: tag[n.from] } })),
    unseen: notes.filter(n => n.at > (+noted || 0)).length });
}

async function post(req, res) {
  if (!sameSite(req)) throw bad(403, 'origin', 'that post came from another site');
  const me = await whoIs(req);
  if (!me) throw bad(401, 'who', 'sign in to do that');
  if (me.banned) throw bad(403, 'banned', 'this account may not do that');
  const body = await readBody(req);
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw bad(400, 'body', 'the post is not an op');
  if (body.op === 'seen') { await db('HSET', K.user(me.id), 'noted', String(Date.now())); return answer(res, 200, { ok: true }); }
  if (!(await spend(me.id))) throw bad(429, 'rate', 'that is a lot in one hour — take a breath');
  const id = String(body.id == null ? '' : body.id);
  switch (body.op) {
    case 'ask': {
      const u = await byTag(body.tag);
      if (!u) throw bad(404, 'tag', 'no gnome goes by that tag — it is a name, a #, and a number');
      if (u === me.id) throw bad(400, 'self', 'that is your own tag');
      if (await db('SISMEMBER', K.friends(me.id), u)) return answer(res, 200, { ok: true, friends: true });
      if (await db('SISMEMBER', K.asks(me.id), u)) { await befriend(me.id, u); return answer(res, 200, { ok: true, friends: true }); }
      if (await db('SADD', K.asks(u), me.id)) await tell(u, 'ask', me.id);   // asked once, until it is answered
      return answer(res, 200, { ok: true, friends: false });
    }
    case 'answer':
      if (!USER_RE.test(id) || !(await db('SREM', K.asks(me.id), id))) throw bad(404, 'ask', 'nobody asked that');
      if (body.yes === true) await befriend(me.id, id);
      return answer(res, 200, { ok: true });
    case 'drop':
      if (USER_RE.test(id)) await dbm([['SREM', K.friends(me.id), id], ['SREM', K.friends(id), me.id]]);
      return answer(res, 200, { ok: true });
    case 'invite': {
      const slug = String(body.slug == null ? '' : body.slug).toLowerCase(), p = SLUG_RE.test(slug) ? await db('HGETALL', K.page(slug)) : {};
      if (!p.made) throw bad(404, 'page', 'no such space');
      if (p.by !== me.id) throw bad(403, 'owner', 'only the gnome who made a space invites to it');
      // anyone with an account, friend or not (2026-09-24: the settings' WHO CAN EDIT finds them by name); a banned one is not asked
      const ids = [...new Set(Array.isArray(body.ids) ? body.ids.map(String).filter(u => USER_RE.test(u) && u !== me.id) : [])];
      const recs = ids.length ? await dbm(ids.map(u => ['HGETALL', K.user(u)])) : [];
      const to = ids.filter((u, i) => recs[i] && recs[i].made && recs[i].banned !== '1');
      const fresh = to.length ? await dbm(to.map(u => ['SADD', K.invited(slug), u])) : [];
      const sent = to.filter((u, i) => fresh[i]);
      for (const u of sent) await tell(u, 'keeper', me.id, { slug, title: p.title || slug });
      if (sent.length) await W.audit(me.id, 'invite', { page: slug, ids: sent });
      return answer(res, 200, { ok: true, sent: sent.length });
    }
    case 'uninvite': {
      const slug = String(body.slug == null ? '' : body.slug).toLowerCase(), p = SLUG_RE.test(slug) ? await db('HGETALL', K.page(slug)) : {};
      if (!p.made) throw bad(404, 'page', 'no such space');
      if (p.by !== me.id) throw bad(403, 'owner', 'only the gnome who made a space uninvites from it');
      const ids = [...new Set(Array.isArray(body.ids) ? body.ids.map(String).filter(u => USER_RE.test(u)) : [])];
      const gone = ids.length ? (await dbm(ids.map(u => ['SREM', K.invited(slug), u]))).filter(Boolean).length : 0;
      if (gone) await W.audit(me.id, 'uninvite', { page: slug, ids });
      return answer(res, 200, { ok: true, gone });
    }
    default: throw bad(400, 'op', 'no such op');
  }
}

module.exports = async function handler(req, res) {
  try {
    if (!W.storeFor()) throw bad(503, 'no-store', 'this site has no store for friends yet');
    if (req.method === 'GET') return await get(req, res);
    if (req.method === 'POST') return await post(req, res);
    answer(res, 405, { ok: false, error: 'GET or POST' });
  } catch (e) {
    if (e instanceof Bad) return answer(res, e.status, { ok: false, code: e.code, error: e.message });
    if (e instanceof SyntaxError) return answer(res, 400, { ok: false, code: 'body', error: 'the post is not JSON' });
    console.error('api/friends.js: ' + String((e && e.stack) || e));
    answer(res, 500, { ok: false, code: 'server', error: 'the friends list is having trouble — try again in a moment' });
  }
};
