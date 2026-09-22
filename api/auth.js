/* ── api/auth.js — THE GATE: WHO YOU ARE ON KNOLL ───────────────────────────
   One Vercel function at /api/auth, and the same module mounted by serve.js
   at the same path on the dev server. /signup and /login post here; every
   page's account corner (account.js) asks here who is signed in; the yard
   says here that its tour has been shown.

   AN ACCOUNT IS TOEM 2's USER RECORD WITH A SECRET WORD ON IT (api/wall.js:
   WHO YOU ARE): the same key — sixteen hex of the sha256 of the address —
   the same session, the same store. So an account made at /signup edits the
   TOEM 2 wall with no second sign-in, and one Google vouched for there is an
   account here. The address itself is still not kept: the key is found from
   it at every log-in, which is also when a reset-by-post would learn it, the
   day there is a postman.

   THE SECRET WORD is kept as scrypt (Node's own — no package), sixteen bytes
   of salt, the cost written into the record beside it so it can be raised
   without a migration. A log-in for an address with no account still runs
   one scrypt, so the answer takes as long either way.

   THE SESSION is the two cookies (api/wall.js: THE SITE'S SESSION IS A
   COOKIE). Every post must come from this site (its Origin) and say JSON,
   which no other site's form can.

     GET  → { ok, open, google, me: { id, name, toured, made } | null }
     POST { op: 'signup', name, email, password }     → { ok, me } and the cookies · 409 taken
          { op: 'login', email, password, remember }   → { ok, me } and the cookies · 401 wrong
          { op: 'logout' }                             → { ok }, the cookies cleared
          { op: 'name', name }                         → { ok, name }   (signed in)
          { op: 'toured' }                             → { ok }         (signed in)

   `open` is false where there is no store behind the door (Vercel with no
   KV_REST_API_URL / KV_REST_API_TOKEN): the gate pages say so rather than
   pretend. `toured` is the yard's: its tour runs on an account's first visit
   there, and never again (yard/index.html).

   ponytail: counters by the hour, in the store (api/wall.js's rl: keys) —
   a patient guesser gets twenty wrong words an hour per address. */
'use strict';

const crypto = require('crypto');
const W = require('./wall.js');
const { db, K, answer, readBody, Bad, bad, text, sha, ipHash, sessionOf, setSession, clearSession, sameSite, finishLogin, userKey, USER_RE, SESSION_DAYS } = W;

const NAME = 24;                              // the wall's own cap on a name (api/wall.js: CAP.name)
const WORD_MIN = 8, WORD_MAX = 256;
// an hour's worth: new accounts per address, knocks per address, wrong words per account, anything else per account
const RATE = { signup: 20, login: 60, fails: 20, acct: 120 };
const SCRYPT = { N: 1 << 15, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };   // 32 MB and ~100 ms a word
const WRONG = 'that is not the secret word the gate remembers';

// ── the secret word ───────────────────────────────────────────────────────
const scrypt = (word, salt, o) => new Promise((ok, no) => crypto.scrypt(word, salt, 32, o, (e, k) => (e ? no(e) : ok(k))));
async function hashWord(word) {
  const salt = crypto.randomBytes(16);
  return ['s1', SCRYPT.N, SCRYPT.r, SCRYPT.p, salt.toString('base64url'), (await scrypt(word, salt, SCRYPT)).toString('base64url')].join('$');
}
let dummy = null;                             // what an address with no account is checked against, so it costs the same
async function wordFits(word, kept) {
  const real = /^s1\$\d+\$\d+\$\d+\$[\w-]+\$[\w-]+$/.test(kept || '');
  const [, N, r, p, salt, want] = (real ? kept : await (dummy || (dummy = hashWord(crypto.randomBytes(12).toString('hex'))))).split('$');
  const got = await scrypt(word, Buffer.from(salt, 'base64url'), { N: +N, r: +r, p: +p, maxmem: SCRYPT.maxmem });
  const w = Buffer.from(want, 'base64url');
  return real && w.length === got.length && crypto.timingSafeEqual(w, got);
}

// ── small things ──────────────────────────────────────────────────────────
const cleanEmail = v => { const e = String(v == null ? '' : v).trim().toLowerCase(); return e.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) ? e : ''; };
const word = v => (typeof v === 'string' ? v : '');
const hour = () => Math.floor(Date.now() / 36e5);
async function spend(who, cap) {             // one more against the hour; false once past the cap
  const k = K.rl(who, hour()), n = await db('INCR', k);
  if (n === 1) await db('EXPIRE', k, 3600);
  return n <= cap;
}
const spent = async who => +(await db('GET', K.rl(who, hour()))) || 0;
const meOf = (u, rec) => ({ id: u, name: rec.name || '', toured: rec.toured === '1', made: +rec.made || 0 });
async function current(req) {                 // the account behind this request's session, record and all
  const s = sessionOf(req);
  if (!s) return null;
  const u = await db('GET', K.sess(sha(s)));
  if (!u || !USER_RE.test(u)) return null;
  const rec = await db('HGETALL', K.user(u));
  return rec && Object.keys(rec).length ? { u, rec } : null;
}
const drop = async req => { const s = sessionOf(req); if (s) await db('DEL', K.sess(sha(s))); };   // the session this browser came in with is over
const hinted = req => /(?:^|;\s*)knoll_in=/.test(String(req.headers.cookie || ''));

// ── GET: who is here ──────────────────────────────────────────────────────
async function get(req, res) {
  if (!W.storeFor()) return answer(res, 200, { ok: true, open: false, google: false, me: null });
  const who = await current(req);
  // a session that has lapsed: the cookies go, so the pages stop drawing a gnome for nobody
  if (!who && (sessionOf(req) || hinted(req))) clearSession(res, req);
  answer(res, 200, { ok: true, open: true, google: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
                     me: who ? meOf(who.u, who.rec) : null });
}

// ── POST ──────────────────────────────────────────────────────────────────
async function signup(req, res, body) {
  const name = text(body.name, NAME).trim(), email = cleanEmail(body.email), pw = word(body.password);
  if (!name) throw bad(400, 'name', 'every gnome has a name; even Nameless is one');
  if (!email) throw bad(400, 'email', 'the postmaster wants a proper address after the @');
  if (pw.length < WORD_MIN) throw bad(400, 'password', 'a secret word wants eight letters at least');
  if (pw.length > WORD_MAX) throw bad(400, 'password', 'a secret word that long will not fit the lock — ' + WORD_MAX + ' letters at most');
  if (!(await spend('signup:' + ipHash(req), RATE.signup))) throw bad(429, 'rate', 'a lot of new gnomes from one doorstep this hour — try again later');
  const u = userKey(email), kept = await hashWord(pw), now = String(Date.now());
  /* THE ADDRESS IS CLAIMED IN ONE STEP: `made` goes on only if it was not
     there, so two petitions for one address cannot both win, and an address
     Google already vouched for (api/wall.js: ONE ADDRESS, ONE WAY IN) or
     somebody already signed up with is taken, whatever else is on it. */
  if (!(await db('HSETNX', K.user(u), 'made', now))) throw bad(409, 'taken', 'someone on the hill already gets post there — log in instead?');
  // an account half made — the claim, and no secret word — would hold the address for nobody: undone if the rest does not land
  try { await db('HSET', K.user(u), 'name', name, 'pw', kept, 'role', 'user'); } catch (e) { await db('DEL', K.user(u)).catch(() => {}); throw e; }
  await drop(req);
  const { session } = await finishLogin(email, SESSION_DAYS, false);   // 'seen' and the session; the admin list wants a PROVED address (api/wall.js)
  setSession(res, req, session, u, SESSION_DAYS);
  answer(res, 200, { ok: true, me: meOf(u, { name, made: now }) });
}

async function login(req, res, body) {
  const email = cleanEmail(body.email), pw = word(body.password);
  if (!email) throw bad(400, 'email', 'the postmaster wants a proper address after the @');
  if (!pw) throw bad(400, 'password', 'the gate wants a secret word before it opens');
  if (!(await spend('login:' + ipHash(req), RATE.login))) throw bad(429, 'rate', 'that is a lot of knocking from one doorstep — wait a while and try again');
  const u = userKey(email);
  if ((await spent('fail:' + u)) >= RATE.fails) throw bad(429, 'rate', 'the gate has heard the wrong word for this address too often — try again in an hour');
  const rec = await db('HGETALL', K.user(u));
  if (pw.length > WORD_MAX || !(await wordFits(pw, rec.pw))) {
    await spend('fail:' + u, Infinity);
    if (rec.made && !rec.pw) throw bad(401, 'google', 'this address comes in with Google — use the Google button');
    throw bad(401, 'wrong', WRONG);
  }
  await db('DEL', K.rl('fail:' + u, hour()));
  await drop(req);
  // "keep the gate unlatched for me": ninety days; unticked, until the browser closes (and a day in the store)
  const keep = body.remember !== false;
  const { session } = await finishLogin(email, keep ? SESSION_DAYS : 1, false);
  setSession(res, req, session, u, keep ? SESSION_DAYS : null);
  answer(res, 200, { ok: true, me: meOf(u, rec) });
}

async function mine(req, res, body) {         // the two things a signed-in account says about itself
  const who = await current(req);
  if (!who) throw bad(401, 'who', 'sign in to do that');
  if (!(await spend('acct:' + who.u, RATE.acct))) throw bad(429, 'rate', 'that is a lot in one hour — take a breath');
  if (body.op === 'toured') { await db('HSET', K.user(who.u), 'toured', '1'); return answer(res, 200, { ok: true }); }
  const name = text(body.name, NAME).trim();
  if (!name) throw bad(400, 'name', 'every gnome has a name; even Nameless is one');
  await db('HSET', K.user(who.u), 'name', name);
  answer(res, 200, { ok: true, name });
}

async function post(req, res) {
  if (!W.storeFor()) throw bad(503, 'no-store', 'the gate is not open on this site yet — it has no store for accounts (KV_REST_API_URL and KV_REST_API_TOKEN)');
  if (!sameSite(req)) throw bad(403, 'origin', 'that post came from another site');
  if (!/^application\/json\b/i.test(String(req.headers['content-type'] || ''))) throw bad(415, 'body', 'the gate reads JSON and nothing else');
  const body = await readBody(req);
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw bad(400, 'body', 'the post is not an op');
  switch (body.op) {
    case 'signup': return signup(req, res, body);
    case 'login': return login(req, res, body);
    case 'logout': await drop(req); clearSession(res, req); return answer(res, 200, { ok: true });
    case 'name': case 'toured': return mine(req, res, body);
    default: throw bad(400, 'op', 'no such op');
  }
}

module.exports = async function handler(req, res) {
  try {
    if (req.method === 'GET') return await get(req, res);
    if (req.method === 'POST') return await post(req, res);
    answer(res, 405, { ok: false, error: 'GET or POST' });
  } catch (e) {
    if (e instanceof Bad) return answer(res, e.status, { ok: false, code: e.code, error: e.message });
    if (e instanceof SyntaxError) return answer(res, 400, { ok: false, code: 'body', error: 'the post is not JSON' });
    console.error('api/auth.js: ' + String((e && e.stack) || e));
    answer(res, 500, { ok: false, code: 'server', error: 'the gate is having trouble — try again in a moment' });
  }
};
module.exports.RATE = RATE;
