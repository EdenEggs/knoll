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
   it at every log-in, which is also when a reset-by-post would learn it.

   THE CODE (2026-09-24). A sign-up is two posts. The first checks the form,
   posts a six-figure code to the address (THE POSTMAN, below) and keeps only
   the code's hash, for ten minutes and five wrong guesses; the second brings
   the code back with the same form, and only then is the account made. So an
   address on the hill is one its owner reads mail at — the thing the admin
   list and a reset-by-post will want. Google's accounts Google proves.

   THE RESET (2026-09-27). A forgotten password is the same two posts, from
   /login: the first names the address and — if it has an account with a
   password — a code goes to it; the second brings the code back with the new
   password, which is kept in the old one's place. The code is the sign-up's
   (six figures, ten minutes, five guesses, five an hour to one address) but
   hashed with what it is for, so neither kind opens the other. A reset ends
   every session the account had (api/wall.js: THE SESSION'S GENERATION) and
   signs nobody in: the page logs in with the new password straight after,
   through the same door as anybody. An address with no account is told so,
   and one Google or Discord vouches for is told that — as /signup's "taken"
   and /login's "google" already tell it, and counted per network like them.

   THE SECRET WORD is kept as scrypt (Node's own — no package), sixteen bytes
   of salt, the cost written into the record beside it so it can be raised
   without a migration. A log-in for an address with no account still runs
   one scrypt, so the answer takes as long either way.

   THE SESSION is the two cookies (api/wall.js: THE SITE'S SESSION IS A
   COOKIE). Every post must come from this site (its Origin) and say JSON,
   which no other site's form can.

     GET  → { ok, open, google, discord, mail, me: { id, name, n, tag, toured, made, avatar } | null }
          ?users=1 → { ok, count, users }   (a moderator: the accounts, newest first)
     POST { op: 'signup', name, email, password }     → { ok, sent: true }: a code is on its way · 409 taken · 503 no-mail · 429 busy (the day's letters are spent)
          { op: 'signup', name, email, password, code } → { ok, me } and the cookies · 400 code (wrong) · 400 expired (gone, or five wrong) · 409 taken
          { op: 'reset', email }                       → { ok, sent: true }: a code is on its way · 404 none · 409 google (no password to reset) · 503 no-mail · 429 busy
          { op: 'reset', email, code, password }       → { ok }: the new password kept, every session of the account over · 400 code · 400 expired · 400 password
          { op: 'login', email, password, remember }   → { ok, me } and the cookies · 401 wrong
          { op: 'logout' }                             → { ok }, the cookies cleared
          { op: 'name', name }                         → { ok, name, n, tag }   (signed in)
          { op: 'toured' }                             → { ok }         (signed in)
          { op: 'avatar', avatar }                     → { ok }         (signed in; a small JPEG as a data: URL)

   A name comes with its number (api/wall.js: THE NAMES): Mossy#3 is `tag`.

   `open` is false where there is no store behind the door (Vercel with no
   KV_REST_API_URL / KV_REST_API_TOKEN): the gate pages say so rather than
   pretend. `toured` is the yard's: its tour runs on an account's first visit
   there, and never again (yard/index.html).

   ponytail: counters by the hour, in the store (api/wall.js's rl: keys) —
   a patient guesser gets twenty wrong words an hour per address, and five
   codes an hour per address with five guesses each: 25 in a million. The
   letters are counted by the day, site-wide (THE POSTMAN'S DAY). */
'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const W = require('./wall.js');
const { db, dbm, K, answer, readBody, Bad, bad, sha, ipHash, sessionOf, setSession, clearSession, sameSite, finishLogin, userKey, USER_RE, SESSION_DAYS } = W;

const WORD_MIN = 8, WORD_MAX = 256;
const LIST = 100;                             // accounts in one ?users answer (ponytail: the newest; paging when a moderator needs past them)
// an hour's worth: sign-up codes per network, knocks per address, wrong words per account, anything else per account, codes per address,
// resets asked for per network — and two that are a DAY's worth: `codeDay`, codes to one address, and `mail`, every letter
// the site posts (THE POSTMAN'S DAY)
const RATE = { signup: 20, login: 60, fails: 20, acct: 120, code: 5, codeDay: 10, reset: 20, mail: 90 };
const CODE = { ttl: 600, tries: 5 };          // a code, a sign-up's or a reset's: ten minutes, five wrong guesses
const SCRYPT = { N: 1 << 15, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };   // 32 MB and ~100 ms a word
const WRONG = 'incorrect email or password';
const NO_WORD = 'this email signed up with Google or Discord, so it has no password — please use that button to log in';   // code `google`, whichever vouched

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
async function spend(who, cap, span) {       // one more against the hour — or against `span` ms, a day's say; false once past the cap
  const k = K.rl(who, span ? 'x' + Math.floor(Date.now() / span) : hour()), n = await db('INCR', k);
  if (n === 1) await db('EXPIRE', k, Math.round((span || 36e5) / 1000));
  return n <= cap;
}
const spent = async who => +(await db('GET', K.rl(who, hour()))) || 0;
const meOf = (u, rec) => ({ id: u, name: rec.name || '', n: +rec.n || 0, tag: W.tagOf(rec), toured: rec.toured === '1', made: +rec.made || 0, avatar: rec.avatar || '' });
// THE PICTURE: the yard's K and the corner's face (yard/index.html: THE PICTURE) — checked the way a space's is (api/wall.js: A PICTURE)
const cleanPic = W.cleanPic;
async function current(req) {                 // the account behind this request's session, record and all
  const s = sessionOf(req);
  if (!s) return null;
  const [u, gen] = W.sessOf(await db('GET', K.sess(sha(s))));
  if (!USER_RE.test(u)) return null;
  const rec = await db('HGETALL', K.user(u));
  return rec && Object.keys(rec).length && W.inGen(rec, gen) ? { u, rec: await W.ensureTag(u, rec) } : null;
}
const drop = async req => { const s = sessionOf(req); if (s) await db('DEL', K.sess(sha(s))); };   // the session this browser came in with is over
const hinted = req => /(?:^|;\s*)knoll_in=/.test(String(req.headers.cookie || ''));

// ── THE POSTMAN (2026-09-24) ──────────────────────────────────────────────
/* One HTTPS post to Resend, no package: RESEND_API_KEY, and MAIL_FROM for the
   envelope — an address on a domain verified there (knoll.space's SPF and
   DKIM records, from Resend's dashboard, in the domain's DNS), or nothing
   arrives. With no key off Vercel (the dev server, the probes) each letter is
   printed and appended to outbox.jsonl beside the store, one JSON line, which
   is where a probe reads its code (lab2/perf/gnome.js). On Vercel with no key
   the gate says so (503 no-mail) rather than make an account nobody proved.

   THE POSTMAN'S DAY (2026-09-27). However many networks ask, the site posts
   RATE.mail letters a day and no more, so a flood of askers cannot spend the
   mail plan or the domain's good name: the letter past it is a 429 `busy`
   that says to come back tomorrow, where Resend's own refusal would have been
   a 500 that says nothing. It is counted after the network's and the
   address's own caps, so a post those turn away spends none of it.
   ponytail: 90 is Resend's free plan (100 a day) with room left — raise it
   with the plan. A letter waits eight seconds for Resend, not five minutes. */
const OUTBOX = path.join(path.dirname(process.env.WALL_DB || path.join(__dirname, '..', 'toem2', 'wall-db.json')), 'outbox.jsonl');
const postman = () => !!process.env.RESEND_API_KEY || !process.env.VERCEL;
async function send(to, subject, text) {
  const key = process.env.RESEND_API_KEY;
  if (!key && process.env.VERCEL) throw bad(503, 'no-mail', 'email is not set up on this site yet, so we cannot send you a code — please continue with Google, or try again later');
  if (!(await spend('mail', RATE.mail, 864e5))) throw bad(429, 'busy', 'we have sent all the emails we can for today — please try again tomorrow');
  if (!key) {
    fs.appendFileSync(OUTBOX, JSON.stringify({ to, subject, text, at: Date.now() }) + '\n');
    console.log('  ✉ no RESEND_API_KEY, so into ' + OUTBOX + ':  to ' + to + ' — ' + subject);
    return;
  }
  const r = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { authorization: 'Bearer ' + key, 'content-type': 'application/json' }, signal: AbortSignal.timeout(8000),
                                                           body: JSON.stringify({ from: process.env.MAIL_FROM || 'Knoll <no-reply@knoll.space>', to: [to], subject, text }) });
  if (!r.ok) throw new Error('the postman answered ' + r.status + ' ' + String(await r.text().catch(() => '')).slice(0, 200));
}

// ── THE CODE, BOTH HALVES — a sign-up's, and a reset's ────────────────────
/* `tag` is what the code is for and whose it is — a sign-up's is the account's
   key, a reset's has 'reset:' before it — and it is hashed in with the code,
   so one kind never opens the other. Only the hash stays. A guess is counted
   BEFORE it is judged, so five tries are five however many arrive at once.
   One address gets five codes an hour and ten a day, whoever asks and of
   whichever kind — a reset's code guards an account that exists, and what a
   patient guesser gets of it is fifty tries a day in a million. */
async function postCode(u, tag, email, subject, text) {
  if (!(await spend('code:' + u, RATE.code))) throw bad(429, 'rate', 'too many codes have been sent to that email this hour — please try again later');
  if (!(await spend('code:' + u, RATE.codeDay, 864e5))) throw bad(429, 'rate', 'too many codes have been sent to that email today — please try again tomorrow');
  const fresh = String(crypto.randomInt(0, 1e6)).padStart(6, '0');
  await send(email, subject + ': ' + fresh, text(fresh));
  await dbm([['DEL', K.code(u)], ['HSET', K.code(u), 'h', sha(tag + ':' + fresh), 'tries', '0'], ['EXPIRE', K.code(u), CODE.ttl]]);   // ponytail: a plain hash — the store is the secret; an HMAC key in the env if the store is ever shared
}
async function takeCode(u, tag, code) {
  const [tries, h] = await dbm([['HINCRBY', K.code(u), 'tries', 1], ['HGET', K.code(u), 'h']]);
  if (!h) { await db('DEL', K.code(u)); throw bad(400, 'expired', 'that code has expired — please send a new one'); }   // (counting made a key where there was none: gone again)
  if (tries > CODE.tries) throw bad(400, 'expired', 'too many wrong codes — please send a new one');
  if (!/^\d{6}$/.test(code) || !crypto.timingSafeEqual(Buffer.from(h, 'hex'), Buffer.from(sha(tag + ':' + code), 'hex'))) throw bad(400, 'code', 'that code is not right — please check the email and try again');
}
const codeOf = body => String(body.code == null ? '' : body.code).replace(/\s/g, '');   // typed with a space, the way people type them
function newWord(pw) {                        // a password being set, at sign-up or at a reset
  if (pw.length < WORD_MIN) throw bad(400, 'password', 'your password must be at least 8 characters');
  if (pw.length > WORD_MAX) throw bad(400, 'password', 'your password must be ' + WORD_MAX + ' characters or fewer');
  return pw;
}

// ── GET: who is here ──────────────────────────────────────────────────────
async function get(req, res) {
  if (!W.storeFor()) return answer(res, 200, { ok: true, open: false, google: false, me: null });
  const who = await current(req);
  // a session that has lapsed: the cookies go, so the pages stop drawing a gnome for nobody
  if (!who && (sessionOf(req) || hinted(req))) clearSession(res, req);
  if (new URL(req.url, 'http://x').searchParams.get('users')) return users(res, who);
  answer(res, 200, { ok: true, open: true, google: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
                     discord: !!(process.env.DISCORD_CLIENT_ID && process.env.DISCORD_CLIENT_SECRET), mail: postman(),
                     me: who ? meOf(who.u, who.rec) : null });
}
// the accounts, newest first: how a moderator finds a gnome, since the store keeps no addresses to find one by
async function users(res, who) {
  if (!who || who.rec.banned === '1' || !(who.rec.role === 'mod' || who.rec.role === 'admin')) throw bad(403, 'role', 'the list of gnomes is the moderators\'');
  const [count, ids] = await dbm([['ZCARD', K.users], ['ZREVRANGE', K.users, 0, LIST - 1]]);
  const recs = await dbm(ids.map(u => ['HGETALL', K.user(u)]));
  answer(res, 200, { ok: true, count, users: ids.map((u, i) => Object.assign({ id: u, name: recs[i].name || '', tag: W.tagOf(recs[i]), made: +recs[i].made || 0,
                                                                  seen: +recs[i].seen || 0, role: recs[i].role || 'user', banned: recs[i].banned === '1' }, W.habits(recs[i]))) });
}

// ── POST ──────────────────────────────────────────────────────────────────
async function signup(req, res, body) {
  const name = W.cleanName(body.name), email = cleanEmail(body.email), code = codeOf(body);
  if (!name) throw bad(400, 'name', 'please enter a username');
  if (!email) throw bad(400, 'email', 'please enter a valid email address');
  const pw = newWord(word(body.password));
  const u = userKey(email), taken = bad(409, 'taken', 'an account with that email already exists — log in instead?');
  if (!code) {
    /* THE CODE, step one: the form is right, so a code goes to the address
       and only its hash stays. The network's hourly cap is spent on codes
       asked for — "taken" is said after it, so asking which addresses have
       accounts is counted too — and one address gets a few an hour, whoever
       asks. The claim in step two is what makes "taken" certain. */
    if (!(await spend('signup:' + ipHash(req), RATE.signup))) throw bad(429, 'rate', 'too many sign-ups from your network this hour — please try again later');
    if (await db('HGET', K.user(u), 'made')) throw taken;
    await postCode(u, u, email, 'Your Knoll sign-up code', fresh => 'Your sign-up code is ' + fresh + '.\n\nEnter it on the sign-up page to finish creating your Knoll account. It expires in 10 minutes.\n\nIf you did not sign up for Knoll, you can ignore this email.');
    return answer(res, 200, { ok: true, sent: true });
  }
  await takeCode(u, u, code);                  // step two: the code back, with the same form
  const kept = await hashWord(pw), now = String(Date.now());
  /* THE ADDRESS IS CLAIMED IN ONE STEP: `made` goes on only if it was not
     there, so two petitions for one address cannot both win, and an address
     Google already vouched for (api/wall.js: ONE ADDRESS, ONE WAY IN) or
     somebody already signed up with is taken, whatever else is on it. */
  if (!(await db('HSETNX', K.user(u), 'made', now))) throw taken;
  // an account half made — the claim, with no secret word or no name — would hold the address for nobody: undone if the rest does not land
  let named;
  try { await db('HSET', K.user(u), 'pw', kept, 'role', 'user'); named = await W.rename(u, name, u); }
  catch (e) { await db('DEL', K.user(u)).catch(() => {}); throw e; }
  await db('DEL', K.code(u));                  // spent
  await drop(req);
  const { session } = await finishLogin(email, SESSION_DAYS, false);   // 'seen', the list of accounts, and the session; the admin list wants a PROVED address (api/wall.js)
  setSession(res, req, session, u, SESSION_DAYS);
  answer(res, 200, { ok: true, me: meOf(u, { name: named.name, n: named.n, made: now }) });
}

// THE RESET: a code to the address of an account that has a password; then the code back, with the new one
async function reset(req, res, body) {
  const email = cleanEmail(body.email), code = codeOf(body), u = userKey(email);
  if (!email) throw bad(400, 'email', 'please enter a valid email address');
  if (!code) {
    if (!(await spend('reset:' + ipHash(req), RATE.reset))) throw bad(429, 'rate', 'too many password resets from your network this hour — please try again later');
    const rec = await db('HGETALL', K.user(u));
    if (!rec.made) throw bad(404, 'none', 'we could not find an account with that email — please check it, or sign up');
    if (!rec.pw) throw bad(409, 'google', NO_WORD);
    await postCode(u, 'reset:' + u, email, 'Your Knoll password reset code', fresh => 'Your password reset code is ' + fresh + '.\n\nEnter it on the log-in page with a new password to get back into your Knoll account. It expires in 10 minutes.\n\nIf you did not ask to reset your password, you can ignore this email: your password has not been changed.');
    return answer(res, 200, { ok: true, sent: true });
  }
  const pw = newWord(word(body.password));    // a password too short spends no guess
  await takeCode(u, 'reset:' + u, code);
  /* the new word in the old one's place, the code spent, the hour's wrong words forgotten — and the
     generation turned, which is every session the account had, over (api/wall.js: THE SESSION'S
     GENERATION). Nobody is signed in by this: the page logs in with the new word, like anybody. */
  await dbm([['HSET', K.user(u), 'pw', await hashWord(pw)], ['HINCRBY', K.user(u), 'gen', 1], ['DEL', K.code(u)], ['DEL', K.rl('fail:' + u, hour())]]);
  answer(res, 200, { ok: true });
}

async function login(req, res, body) {
  const email = cleanEmail(body.email), pw = word(body.password);
  if (!email) throw bad(400, 'email', 'please enter a valid email address');
  if (!pw) throw bad(400, 'password', 'please enter your password');
  if (!(await spend('login:' + ipHash(req), RATE.login))) throw bad(429, 'rate', 'too many log-in attempts from your network — please wait a while and try again');
  const u = userKey(email);
  if ((await spent('fail:' + u)) >= RATE.fails) throw bad(429, 'rate', 'too many wrong passwords for this email — please try again in an hour');
  const rec = await db('HGETALL', K.user(u));
  if (pw.length > WORD_MAX || !(await wordFits(pw, rec.pw))) {
    await spend('fail:' + u, Infinity);
    if (rec.made && !rec.pw) throw bad(401, 'google', NO_WORD);
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

async function mine(req, res, body) {         // the things a signed-in account says about itself
  const who = await current(req);
  if (!who) throw bad(401, 'who', 'sign in to do that');
  if (!(await spend('acct:' + who.u, RATE.acct))) throw bad(429, 'rate', 'that is a lot in one hour — take a breath');
  if (body.op === 'toured') { await db('HSET', K.user(who.u), 'toured', '1'); return answer(res, 200, { ok: true }); }
  if (body.op === 'avatar') {
    const pic = cleanPic(body.avatar);
    if (!pic) throw bad(400, 'avatar', 'the gate takes a small square JPEG for a picture, and that is not one');
    await db('HSET', K.user(who.u), 'avatar', pic);
    return answer(res, 200, { ok: true });
  }
  answer(res, 200, Object.assign({ ok: true }, await W.rename(who.u, body.name, who.u)));
}

async function post(req, res) {
  if (!W.storeFor()) throw bad(503, 'no-store', 'the gate is not open on this site yet — it has no store for accounts (KV_REST_API_URL and KV_REST_API_TOKEN)');
  if (!sameSite(req)) throw bad(403, 'origin', 'that post came from another site');
  if (!/^application\/json\b/i.test(String(req.headers['content-type'] || ''))) throw bad(415, 'body', 'the gate reads JSON and nothing else');
  const body = await readBody(req);
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw bad(400, 'body', 'the post is not an op');
  switch (body.op) {
    case 'signup': return signup(req, res, body);
    case 'reset': return reset(req, res, body);
    case 'login': return login(req, res, body);
    case 'logout': await drop(req); clearSession(res, req); return answer(res, 200, { ok: true });
    case 'name': case 'toured': case 'avatar': return mine(req, res, body);
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
    answer(res, 500, { ok: false, code: 'server', error: 'something went wrong on our end — please try again in a moment' });
  }
};
Object.assign(module.exports, { RATE, CODE, OUTBOX });   // for the probes
