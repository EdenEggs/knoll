#!/usr/bin/env node
/* verify-auth.js — the gate (api/auth.js), and the wall's door taking the
   gate's session (api/wall.js), driven in-process over a throwaway store.

   No server, no socket, no network: both modules are required with WALL_DB
   pointed at a temp file and called with a fake request and response, the
   way serve.js and Vercel call them. It checks what would lose an account,
   leak one or let somebody into one if it broke: validation, the claim on
   an address, the secret word as it is kept (and the address, which is
   not), the two cookies and their flags, log-in and the wrong word, the
   hour's caps, log-out, a lapsed session, other sites' posts, the one way
   in per address, the name, the tour and the picture, TOEM 2's door taking
   the cookie — and the sign-up code (2026-09-24): the letter, its hash, a
   wrong code, one address's code against another, five tries, five an hour,
   the code spent, Vercel with no postman, and the post to Resend.

     node lab2/perf/verify-auth.js
*/
'use strict';
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'knoll-auth-'));
process.env.WALL_DB = path.join(TMP, 'wall-db.json');
delete process.env.KV_REST_API_URL; delete process.env.UPSTASH_REDIS_REST_URL; delete process.env.VERCEL;
delete process.env.GOOGLE_CLIENT_ID; delete process.env.GOOGLE_CLIENT_SECRET;
process.env.ADMIN_EMAILS = 'boss@example.com';
const ROOT = path.join(__dirname, '..', '..');
const auth = require(path.join(ROOT, 'api', 'auth.js'));
const wall = require(path.join(ROOT, 'api', 'wall.js'));
const done = () => fs.rmSync(TMP, { recursive: true, force: true });

let n = 0;
const A = new Proxy(assert, { get: (a, k) => (...args) => { n++; return a[k](...args); } });   // every check counted

const HERE = 'http://localhost:4321';
function call(fn, method, url, body, headers) {
  return new Promise(resolve => {
    const h = Object.assign({ host: 'localhost:4321', 'x-real-ip': '10.1.1.1' }, method === 'POST' ? { origin: HERE, 'content-type': 'application/json' } : {}, headers || {});
    Object.keys(h).forEach(k => h[k] === undefined && delete h[k]);
    const req = { method, url, headers: h, body: method === 'POST' ? body : undefined, socket: { remoteAddress: '127.0.0.1' } };
    const res = { statusCode: 200, headers: {}, setHeader(k, v) { this.headers[k.toLowerCase()] = v; },
                  end(s) { let json = {}; try { json = JSON.parse(s); } catch (e) {} resolve({ status: this.statusCode, json, cookies: [].concat(this.headers['set-cookie'] || []) }); } };
    fn(req, res).catch(e => resolve({ status: 599, json: { error: String(e && e.stack || e) }, cookies: [] }));
  });
}
const gate = (body, headers) => call(auth, 'POST', '/api/auth', body, headers);
const who = headers => call(auth, 'GET', '/api/auth', undefined, headers);
const jar = r => { const c = {}; r.cookies.forEach(s => { const m = /^([^=]+)=([^;]*)/.exec(s); if (m) c[m[1]] = m[2]; }); return c; };
const sent = c => ({ cookie: 'knoll_s=' + c.knoll_s + '; knoll_in=' + c.knoll_in });
const flags = (r, name) => r.cookies.find(s => s.startsWith(name + '=')) || '';
const { codeIn } = require('./gnome.js');      // the code the stand-in postman wrote to the outbox beside the store (api/auth.js: THE POSTMAN)
const signup = async (body, headers) => {       // both steps (api/auth.js: THE CODE): the code goes out, and comes back with the same form
  const r = await gate(body, headers);
  return r.status === 200 && r.json.sent ? gate(Object.assign({ code: codeIn(auth.OUTBOX, body.email) }, body), headers) : r;
};

(async () => {
  // ── who is here, with nobody signed in ──────────────────────────────────
  let r = await who();
  A.deepStrictEqual([r.json.ok, r.json.open, r.json.google, r.json.me], [true, true, false, null], 'nobody signed in; the gate is open; Google is not set up');
  A.strictEqual(r.json.mail, true, 'off Vercel, the outbox stands in for the postman');

  // ── signing up ──────────────────────────────────────────────────────────
  const good = { op: 'signup', name: 'Mossy', email: 'Mossy@Example.com ', password: 'toadstool1' };
  r = await gate(Object.assign({}, good, { name: '  ' }));   A.deepStrictEqual([r.status, r.json.code], [400, 'name'], 'a petition with no name is sent back');
  r = await gate(Object.assign({}, good, { email: 'mossy' })); A.deepStrictEqual([r.status, r.json.code], [400, 'email'], '…and one with no proper address');
  r = await gate(Object.assign({}, good, { password: 'short' })); A.deepStrictEqual([r.status, r.json.code], [400, 'password'], '…and one with a secret word under eight letters');
  r = await gate(Object.assign({}, good, { password: 'x'.repeat(257) })); A.deepStrictEqual([r.status, r.json.code], [400, 'password'], '…and one too long for the lock');
  // ── the code (api/auth.js: THE CODE) ────────────────────────────────────
  const mid = wall.userKey('mossy@example.com');
  r = await gate(good);
  A.deepStrictEqual([r.status, r.json.sent, r.json.me, r.cookies.length], [200, true, undefined, 0], 'a good petition sends a code first: no account, no cookie');
  A.deepStrictEqual(await wall.db('HGETALL', wall.K.user(mid)), {}, '…and nothing is made yet');
  const letter = JSON.parse(fs.readFileSync(auth.OUTBOX, 'utf8').trim().split('\n').pop()), code1 = codeIn(auth.OUTBOX, 'mossy@example.com');
  A.ok(letter.to === 'mossy@example.com' && letter.subject === 'Your Knoll sign-up code: ' + code1 && letter.text.includes('code is ' + code1 + '.') && /10 minutes/.test(letter.text),
    'the letter: to the address as cleaned, the code in the subject and the text, ten minutes: ' + JSON.stringify(letter));
  A.ok(!fs.readFileSync(process.env.WALL_DB, 'utf8').includes(code1), 'the store keeps the code hashed, never the code');
  const cx = JSON.parse(fs.readFileSync(process.env.WALL_DB, 'utf8')).x[wall.K.code(mid)] - Date.now();
  A.ok(cx > 0 && cx <= auth.CODE.ttl * 1000 + 1000, '…for ten minutes');
  r = await gate(Object.assign({}, good, { code: code1 === '123456' ? '654321' : '123456' }));
  A.deepStrictEqual([r.status, r.json.code, r.cookies.length], [400, 'code', 0], 'a wrong code is turned away, with no cookie');
  r = await gate(Object.assign({}, good, { code: 'abc' }));
  A.deepStrictEqual([r.status, r.json.code], [400, 'code'], '…and so is one that is not even figures (nothing but the six count)');
  r = await gate(Object.assign({}, good, { email: 'other@example.com', code: code1 }));
  A.deepStrictEqual([r.status, r.json.code], [400, 'expired'], 'a code is the one address\'s: another address has none waiting');
  r = await gate(Object.assign({}, good, { code: code1.slice(0, 3) + ' ' + code1.slice(3) }));
  A.strictEqual(r.status, 200, 'the right code — typed with a space, even — makes the account: ' + JSON.stringify(r.json));
  A.deepStrictEqual(await wall.db('HGETALL', wall.K.code(mid)), {}, '…and the code is spent');
  const mossy = r.json.me, c1 = jar(r);
  A.deepStrictEqual([mossy.name, mossy.toured, mossy.id], ['Mossy', false, wall.userKey('mossy@example.com')], 'the account is the address\'s key, named, not yet toured');
  A.deepStrictEqual([mossy.n, mossy.tag], [1, 'Mossy#1'], 'the first Mossy is Mossy#1');
  A.ok(/^[0-9a-f]{32}$/.test(c1.knoll_s) && c1.knoll_in === mossy.id, 'two cookies: the session, and the id');
  A.ok(/HttpOnly/.test(flags(r, 'knoll_s')) && /SameSite=Lax/.test(flags(r, 'knoll_s')) && /Max-Age=7776000/.test(flags(r, 'knoll_s')), 'the session cookie is HttpOnly, SameSite=Lax, ninety days');
  A.ok(!/HttpOnly/.test(flags(r, 'knoll_in')) && /SameSite=Lax/.test(flags(r, 'knoll_in')), 'the id cookie is readable by the page, SameSite=Lax');
  A.ok(!/Secure/.test(flags(r, 'knoll_s')), 'no Secure flag over plain http on localhost');
  r = await call(auth, 'POST', '/api/auth', good, { 'x-forwarded-proto': 'https', 'x-forwarded-host': 'knoll.example', host: 'knoll.example', origin: 'https://knoll.example' });
  A.ok(r.status === 409, '(the same petition over https is taken — see below)');
  const rec = await wall.db('HGETALL', wall.K.user(mossy.id));
  A.ok(/^s1\$32768\$8\$1\$[\w-]{22}\$[\w-]{43}$/.test(rec.pw), 'the secret word is kept as scrypt, with its cost and salt beside it');
  const raw = fs.readFileSync(process.env.WALL_DB, 'utf8');
  A.ok(!/mossy@example\.com/i.test(raw) && !raw.includes('toadstool1'), 'neither the address nor the secret word is anywhere in the store');
  r = await gate(Object.assign({}, good, { email: '  MOSSY@example.COM', name: 'Impostor' }));
  A.deepStrictEqual([r.status, r.json.code], [409, 'taken'], 'the same address, any case, is taken');
  A.strictEqual((await wall.db('HGETALL', wall.K.user(mossy.id))).name, 'Mossy', '…and the account is untouched by it');

  // ── who is here, signed in ──────────────────────────────────────────────
  r = await who(sent(c1));
  A.deepStrictEqual([r.json.me && r.json.me.id, r.json.me && r.json.me.name, r.json.me && r.json.me.toured], [mossy.id, 'Mossy', false], 'the cookie says who you are');

  // ── the wall's door takes the same cookie ───────────────────────────────
  r = await call(wall, 'GET', '/api/wall?me=1', undefined, sent(c1));
  A.deepStrictEqual([r.status, r.json.id, r.json.name, r.json.tier], [200, mossy.id, 'Mossy', 'newcomer'], 'TOEM 2 knows the account from the cookie: a newcomer');
  r = await call(wall, 'POST', '/api/wall', { op: 'me', name: 'Mossy M' }, Object.assign(sent(c1), { origin: 'https://evil.example' }));
  A.deepStrictEqual([r.status, r.json.code], [403, 'origin'], 'a post to the wall riding the cookie from another site is refused');
  r = await call(wall, 'POST', '/api/wall', { op: 'me', name: 'Mossy M' }, sent(c1));
  A.strictEqual(r.status, 200, '…and from this site it goes through');

  // ── the name, and the tour ──────────────────────────────────────────────
  r = await gate({ op: 'name', name: 'Mossy of the Hollow and many more words' }, sent(c1));
  A.deepStrictEqual([r.status, r.json.name], [200, 'Mossy of the Hollow and'], 'a name is cleaned, cut to 24 and trimmed');
  r = await gate({ op: 'toured' });
  A.deepStrictEqual([r.status, r.json.code], [401, 'who'], 'the tour is marked for a signed-in account only');
  r = await gate({ op: 'toured' }, sent(c1));
  r = await who(sent(c1));
  A.strictEqual(r.json.me.toured, true, 'once shown, the tour is marked on the account');

  // ── the picture (api/auth.js: THE PICTURE) ──────────────────────────────
  const JPEG = 'data:image/jpeg;base64,' + Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4, 5]).toString('base64');
  A.strictEqual(r.json.me.avatar, '', 'an account starts with no picture');
  r = await gate({ op: 'avatar', avatar: JPEG });
  A.deepStrictEqual([r.status, r.json.code], [401, 'who'], 'a picture goes on a signed-in account only');
  for (const [v, what] of [['data:image/svg+xml;base64,' + Buffer.from('<svg onload="alert(1)"/>').toString('base64'), 'an SVG'],
                           ['data:image/jpeg;base64,' + Buffer.from('<html>no jpeg</html>').toString('base64'), 'a JPEG in name only'],
                           [JPEG + 'A'.repeat(60000 - JPEG.length + 1), 'a picture one character past the size'],
                           [{ src: JPEG }, 'a picture that is not a string'], ['javascript:alert(1)', 'an address for a picture']]) {
    r = await gate({ op: 'avatar', avatar: v }, sent(c1));
    A.deepStrictEqual([r.status, r.json.code], [400, 'avatar'], 'the gate refuses ' + what);
  }
  r = await gate({ op: 'avatar', avatar: JPEG }, sent(c1));
  A.strictEqual(r.status, 200, 'a small JPEG goes on');
  r = await who(sent(c1));
  A.strictEqual(r.json.me.avatar, JPEG, '…and comes back with who you are, which every page asks');

  // ── the numbers (api/wall.js: THE NAMES) ────────────────────────────────
  r = await gate({ op: 'name', name: 'Mossy' }, sent(c1));
  A.deepStrictEqual([r.json.name, r.json.n, r.json.tag], ['Mossy', 1, 'Mossy#1'], 'going back to a name one has had gives back its number');
  r = await gate({ op: 'name', name: 'MOSSY' }, sent(c1));
  A.strictEqual(r.json.tag, 'MOSSY#1', '…and so does changing only its capitals');
  r = await signup(Object.assign({}, good, { email: 'other@example.com', name: 'mossy' }), { 'x-real-ip': '10.8.8.8' });
  const other = jar(r);
  A.deepStrictEqual([r.status, r.json.me.tag], [200, 'mossy#2'], 'a second gnome may be called Mossy too — capitals or none, they are mossy#2');
  A.strictEqual(await wall.db('HGET', wall.K.tags, 'mossy#2'), wall.userKey('other@example.com'), 'a tag says whose it is');
  r = await gate({ op: 'name', name: 'Mossy#1' }, sent(other));
  A.strictEqual(r.json.tag, 'Mossy1#1', 'a # typed into a name is no tag: it is dropped');
  const gone = (await wall.db('LRANGE', wall.K.names(mossy.id), 0, -1)).map(s => JSON.parse(s).name);
  A.deepStrictEqual(gone, ['MOSSY', 'Mossy', 'Mossy of the Hollow and', 'Mossy M', 'Mossy'], 'every name an account has gone by is kept, newest first');
  await wall.db('SET', wall.K.tagN('crowded'), String(wall.TAG_MAX));
  r = await signup(Object.assign({}, good, { email: 'crowd@example.com', name: 'Crowded' }), { 'x-real-ip': '10.8.8.9' });
  A.deepStrictEqual([r.status, r.json.code], [409, 'name-full'], 'a name a million gnomes have taken is full');
  r = await signup(Object.assign({}, good, { email: 'crowd@example.com', name: 'Roomy' }), { 'x-real-ip': '10.8.8.9' });
  A.deepStrictEqual([r.status, r.json.me && r.json.me.tag], [200, 'Roomy#1'], '…and the address it was refused with is not held: another name takes it');
  const old = 'fe'.repeat(8), oldIn = () => ({ cookie: 'knoll_s=' + oldS + '; knoll_in=' + old });
  await wall.db('HSET', wall.K.user(old), 'made', '5', 'name', 'Old Timer', 'role', 'user');
  const oldS = await wall.mintSession(old);
  r = await who(oldIn());
  A.strictEqual(r.json.me.tag, 'Old Timer#1', 'an account named before the numbers is numbered the first time it is seen');
  r = await call(auth, 'GET', '/api/auth?users=1', undefined, sent(c1));
  A.deepStrictEqual([r.status, r.json.code], [403, 'role'], 'the list of accounts is not for everybody');
  await wall.db('HSET', wall.K.user(mossy.id), 'role', 'mod');
  r = await call(auth, 'GET', '/api/auth?users=1', undefined, sent(c1));
  A.ok(r.status === 200 && r.json.count === 4 && r.json.users.map(x => x.tag).sort().join() === 'MOSSY#1,Mossy1#1,Old Timer#1,Roomy#1' && r.json.users[3].tag === 'Old Timer#1',
    'a moderator gets every account with its tag, newest first — the one from before the numbers counted too: ' + JSON.stringify(r.json.users && r.json.users.map(x => x.tag)));
  A.ok(!JSON.stringify(r.json).includes('@') && !JSON.stringify(r.json).includes('s1$'), '…and no address or secret word in it');
  await wall.db('HSET', wall.K.user(mossy.id), 'banned', '1');
  r = await call(auth, 'GET', '/api/auth?users=1', undefined, sent(c1));
  A.strictEqual(r.status, 403, 'a banned moderator gets no list');
  await wall.db('HSET', wall.K.user(mossy.id), 'role', 'user', 'banned', '0');
  await wall.db('HSET', wall.K.user(old), 'banned', '1');
  r = await gate({ op: 'name', name: 'Anew' }, oldIn());
  A.deepStrictEqual([r.status, r.json.code], [403, 'banned'], 'a banned account keeps the name it has');

  // ── other sites, and other shapes ───────────────────────────────────────
  r = await gate({ op: 'name', name: 'x' }, Object.assign(sent(c1), { origin: 'https://evil.example' }));
  A.deepStrictEqual([r.status, r.json.code], [403, 'origin'], 'a post from another site is refused');
  r = await gate({ op: 'login', email: 'a@b.co', password: 'x' }, { 'content-type': 'text/plain' });
  A.strictEqual(r.status, 415, 'a post that is not JSON (what a form on another site can send) is refused');
  r = await gate({ op: 'frobnicate' });
  A.deepStrictEqual([r.status, r.json.code], [400, 'op'], 'an op the gate does not know');
  r = await call(auth, 'PUT', '/api/auth');
  A.strictEqual(r.status, 405, 'GET or POST only');

  // ── logging in ──────────────────────────────────────────────────────────
  r = await gate({ op: 'login', email: 'mossy@example.com', password: 'toadstool2' }, { 'x-real-ip': '10.2.2.2' });
  A.deepStrictEqual([r.status, r.json.code], [401, 'wrong'], 'the wrong secret word is turned away');
  const wrongMsg = r.json.error;
  r = await gate({ op: 'login', email: 'nobody@example.com', password: 'toadstool1' }, { 'x-real-ip': '10.2.2.2' });
  A.deepStrictEqual([r.status, r.json.error], [401, wrongMsg], 'an address with no account gets the same answer, word for word');
  r = await gate({ op: 'login', email: 'mossy@example.com', password: 'toadstool1', remember: false }, sent(c1));
  A.strictEqual(r.status, 200, 'the right secret word opens the gate');
  const c2 = jar(r);
  A.ok(!/Max-Age/.test(flags(r, 'knoll_s')), '"keep the gate unlatched" unticked: a cookie that ends with the browser');
  A.ok(c2.knoll_s !== c1.knoll_s, 'a new session every time');
  r = await who(sent(c1));
  A.strictEqual(r.json.me, null, 'the session the browser came in with is over');
  A.ok(/knoll_s=;.*Max-Age=0/.test(flags(r, 'knoll_s')) && /knoll_in=;.*Max-Age=0/.test(flags(r, 'knoll_in')), '…and a lapsed session has both its cookies cleared');
  const ttl = JSON.parse(fs.readFileSync(process.env.WALL_DB, 'utf8')).x[wall.K.sess(wall.sha(c2.knoll_s))] - Date.now();
  A.ok(ttl > 0 && ttl <= 86400e3 + 1000, 'unticked, the store keeps the session a day at most');

  // ── the hour's caps ─────────────────────────────────────────────────────
  for (let i = 0; i < auth.RATE.fails; i++) await gate({ op: 'login', email: 'mossy@example.com', password: 'guess' + i }, { 'x-real-ip': '10.3.3.' + (i % 250) });
  r = await gate({ op: 'login', email: 'mossy@example.com', password: 'toadstool1' }, { 'x-real-ip': '10.4.4.4' });
  A.deepStrictEqual([r.status, r.json.code], [429, 'rate'], 'twenty wrong words for one address in an hour, and even the right one waits');
  let last;
  for (let i = 0; i <= auth.RATE.login; i++) last = await gate({ op: 'login', email: 'someone' + i + '@example.com', password: 'whatever1' }, { 'x-real-ip': '10.5.5.5' });
  A.deepStrictEqual([last.status, last.json.code], [429, 'rate'], 'sixty knocks from one address in an hour, then it waits');
  for (let i = 0; i <= auth.RATE.signup; i++) last = await gate({ op: 'signup', name: 'n' + i, email: 'new' + i + '@example.com', password: 'toadstool1' }, { 'x-real-ip': '10.6.6.6' });
  A.deepStrictEqual([last.status, last.json.code], [429, 'rate'], 'twenty sign-up codes from one address in an hour, then it waits');
  // five wrong codes spend a code; five codes an hour to one address
  const tries = Object.assign({}, good, { email: 'tries@example.com' }), from = { 'x-real-ip': '10.9.9.9' };
  r = await gate(tries, from);
  const codeT = codeIn(auth.OUTBOX, tries.email);
  for (let i = 0; i < auth.CODE.tries; i++) r = await gate(Object.assign({}, tries, { code: String(i).repeat(6) === codeT ? '999999' : String(i).repeat(6) }), from);
  A.deepStrictEqual([r.status, r.json.code], [400, 'code'], 'the fifth wrong code is still just wrong');
  r = await gate(Object.assign({}, tries, { code: codeT }), from);
  A.deepStrictEqual([r.status, r.json.code], [400, 'expired'], '…and after five, even the right one is spent: a new code is needed');
  for (let i = 1; i < auth.RATE.code; i++) r = await gate(tries, from);
  A.deepStrictEqual([r.status, r.json.sent], [200, true], 'a new code replaces it, up to five an hour');
  if (codeIn(auth.OUTBOX, tries.email) !== codeT) { r = await gate(Object.assign({}, tries, { code: codeT }), from); A.deepStrictEqual([r.status, r.json.code], [400, 'code'], 'the old code is no good against the new one'); }
  r = await gate(tries, from);
  A.deepStrictEqual([r.status, r.json.code], [429, 'rate'], 'a sixth code to one address in an hour waits');
  r = await gate(Object.assign({}, tries, { code: codeIn(auth.OUTBOX, tries.email) }), from);
  A.strictEqual(r.status, 200, '…while the fifth still opens: ' + JSON.stringify(r.json));

  // ── logging out ─────────────────────────────────────────────────────────
  r = await gate({ op: 'logout' }, sent(c2));
  A.ok(r.status === 200 && /knoll_s=;.*Max-Age=0/.test(flags(r, 'knoll_s')), 'logging out clears the cookies');
  r = await who(sent(c2));
  A.strictEqual(r.json.me, null, '…and the session is over in the store too');

  // ── one address, one way in ─────────────────────────────────────────────
  await wall.finishLogin('juno@example.com');   // Google vouched for Juno (api/wall.js: the callback)
  r = await gate({ op: 'signup', name: 'Not Juno', email: 'juno@example.com', password: 'toadstool1' });
  A.deepStrictEqual([r.status, r.json.code], [409, 'taken'], 'an address Google vouched for cannot be claimed with a secret word');
  r = await gate({ op: 'login', email: 'juno@example.com', password: 'toadstool1' });
  A.deepStrictEqual([r.status, r.json.code], [401, 'google'], '…and logging in to it with one says to use Google');

  // ── the admin list wants a proved address (api/wall.js: THE ADMIN LIST WANTS A PROVED ADDRESS) ──
  r = await signup({ op: 'signup', name: 'Not the boss', email: 'boss@example.com', password: 'toadstool1' }, { 'x-real-ip': '10.7.7.7' });
  const boss = jar(r);
  r = await call(wall, 'GET', '/api/wall?me=1', undefined, sent(boss));
  A.deepStrictEqual([r.status, r.json.role], [200, 'user'], 'petitioning with an ADMIN_EMAILS address makes nobody the admin — typing it proves nothing');
  r = await gate({ op: 'login', email: 'boss@example.com', password: 'toadstool1' }, { 'x-real-ip': '10.7.7.8' });
  r = await call(wall, 'GET', '/api/wall?me=1', undefined, sent(jar(r)));
  A.strictEqual(r.json.role, 'user', '…nor does logging in with it');
  const g = await wall.finishLogin('boss2@example.com'); process.env.ADMIN_EMAILS = 'boss2@example.com';
  const g2 = await wall.finishLogin('boss2@example.com');
  r = await call(wall, 'GET', '/api/wall?me=1', undefined, { authorization: 'Bearer ' + g2.session });
  A.ok(g.fresh && r.json.role === 'admin', 'Google vouching for an ADMIN_EMAILS address still makes the admin');

  // ── Google, with Google played by this script ────────────────────────────
  process.env.GOOGLE_CLIENT_ID = 'cid'; process.env.GOOGLE_CLIENT_SECRET = 'secret';
  let vouch = 'gnome@example.com';
  const realFetch = global.fetch;
  global.fetch = async url => {
    if (String(url).startsWith('https://oauth2.googleapis.com/tokeninfo')) return { json: async () => ({ aud: 'cid', email_verified: 'true', email: vouch, iss: 'accounts.google.com' }) };
    if (String(url).startsWith('https://oauth2.googleapis.com/token')) return { json: async () => ({ id_token: 'a.b.c' }) };
    throw new Error('this probe has no network');
  };
  const hop = (url, headers) => new Promise(resolve => {
    const req = { method: 'GET', url, headers: Object.assign({ host: 'localhost:4321' }, headers || {}), socket: { remoteAddress: '127.0.0.1' } };
    const res = { statusCode: 200, headers: {}, setHeader(k, v) { this.headers[k.toLowerCase()] = v; }, end(s) { resolve({ status: this.statusCode, headers: this.headers, text: String(s || ''), cookies: [].concat(this.headers['set-cookie'] || []) }); } };
    wall(req, res);
  });
  r = await hop('/auth/google?next=' + encodeURIComponent('/toem2/?visitor'));
  const to = new URL(r.headers.location), state = to.searchParams.get('state');
  A.ok(r.status === 302 && to.host === 'accounts.google.com' && to.searchParams.get('redirect_uri') === 'http://localhost:4321/auth/google/callback', 'the Google button goes to Google, with this site\'s callback');
  A.ok(new RegExp('^knoll_o=' + state + ';.*HttpOnly').test(r.cookies[0] || ''), '…and the state rides in an HttpOnly cookie of this browser\'s');
  r = await hop('/auth/google/callback?state=' + state + '&code=abcd');
  A.ok(r.status === 400 && /another browser/.test(r.text), 'a callback without that cookie — somebody else\'s sign-in — signs nobody in');
  r = await hop('/auth/google/callback?state=' + state + '&code=abcd', { cookie: 'knoll_o=' + state });
  let c = jar(r);
  A.ok(r.status === 302 && r.headers.location === '/signup/?google=1&next=' + encodeURIComponent('/toem2/?visitor') && /^[0-9a-f]{32}$/.test(c.knoll_s) && c.knoll_in === wall.userKey(vouch),
    'a new gnome Google vouched for is signed in and sent to /signup to be named, then on to where they were', r.headers.location);
  A.ok(/knoll_o=;.*Max-Age=0/.test(flags(r, 'knoll_o')), '…and the state cookie is spent');
  r = await hop('/auth/google/callback?state=' + state + '&code=abcd', { cookie: 'knoll_o=' + state });
  A.ok(r.status === 400 && /expired/.test(r.text), 'a state is good for one callback only');
  r = await hop('/auth/google/callback?state=' + state + '&error=access_denied', { cookie: 'knoll_o=' + state });
  A.ok(r.status === 400 && /cancelled/.test(r.text) && !r.cookies.length, 'a cancelled Google sign-in (?error=access_denied, no code) says so, and signs nobody in');
  r = await gate({ op: 'name', name: 'Gnome Vouched' }, sent(c));
  A.strictEqual(r.json.name, 'Gnome Vouched', 'the name form names the account');
  r = await hop('/auth/google?next=' + encodeURIComponent('//evil.example/x'));
  const s2 = new URL(r.headers.location).searchParams.get('state');
  r = await hop('/auth/google/callback?state=' + s2 + '&code=abcd', { cookie: 'knoll_o=' + s2 });
  A.strictEqual(r.headers.location, '/yard/', 'a named gnome goes straight back — and a next that leaves the site becomes the yard');
  vouch = 'mossy@example.com';                  // has a secret word (above)
  r = await hop('/auth/google?next=/');
  const s3 = new URL(r.headers.location).searchParams.get('state');
  r = await hop('/auth/google/callback?state=' + s3 + '&code=abcd', { cookie: 'knoll_o=' + s3 });
  A.ok(r.status === 400 && /already has a password/.test(r.text) && !r.cookies.some(x => x.startsWith('knoll_s=')), 'Google cannot open an account a secret word made (one address, one way in)');
  r = await who();
  A.strictEqual(r.json.google, true, 'with its client set, the gate says Google is there');
  global.fetch = realFetch; delete process.env.GOOGLE_CLIENT_ID; delete process.env.GOOGLE_CLIENT_SECRET;

  // ── the postman (api/auth.js: THE POSTMAN): Vercel with no key, and Resend with one ──
  process.env.VERCEL = '1'; delete process.env.RESEND_API_KEY;
  const onVercel = { 'x-forwarded-proto': 'https', origin: 'https://localhost:4321', 'x-real-ip': '10.10.10.10' };   // there, the site is https and so is a same-site post
  r = await who();
  A.strictEqual(r.json.mail, false, 'on Vercel with no RESEND_API_KEY the gate says there is no postman');
  r = await gate(Object.assign({}, good, { email: 'nomail@example.com' }), onVercel);
  A.deepStrictEqual([r.status, r.json.code], [503, 'no-mail'], '…and a petition is a 503 that says why, with no code kept');
  A.deepStrictEqual(await wall.db('HGETALL', wall.K.code(wall.userKey('nomail@example.com'))), {}, '…(nothing waiting for that address)');
  process.env.RESEND_API_KEY = 're_test'; process.env.MAIL_FROM = 'Knoll <hello@knoll.space>';
  let posted = null;
  global.fetch = async (url, o) => { posted = { url: String(url), auth: o.headers.authorization, body: JSON.parse(o.body) }; return { ok: true, status: 200, text: async () => '{"id":"x"}' }; };
  r = await gate(Object.assign({}, good, { email: 'resend@example.com' }), onVercel);
  A.ok(r.status === 200 && r.json.sent && posted && posted.url === 'https://api.resend.com/emails' && posted.auth === 'Bearer re_test' && posted.body.from === 'Knoll <hello@knoll.space>'
       && posted.body.to.join() === 'resend@example.com' && /^Your Knoll sign-up code: \d{6}$/.test(posted.body.subject) && posted.body.text.includes(posted.body.subject.slice(-6)),
    'with a key, the letter is one post to Resend: from MAIL_FROM, to the address, the code in it: ' + JSON.stringify(posted));
  r = await gate(Object.assign({}, good, { email: 'resend@example.com', code: posted.body.subject.slice(-6) }), onVercel);
  A.ok(r.status === 200 && /Secure/.test(flags(r, 'knoll_s')), '…and that code opens the account on Vercel too, with a Secure cookie: ' + JSON.stringify(r.json));
  r = await who();
  A.strictEqual(r.json.mail, true, '…and the gate says the postman is there');
  global.fetch = async () => ({ ok: false, status: 422, text: async () => 'bad from' });
  const quiet = console.error; console.error = () => {};
  r = await gate(Object.assign({}, good, { email: 'resend2@example.com' }), onVercel);
  console.error = quiet;
  A.deepStrictEqual([r.status, r.json.code], [500, 'server'], 'a postman that refuses the letter is a plain 500');
  A.deepStrictEqual(await wall.db('HGETALL', wall.K.code(wall.userKey('resend2@example.com'))), {}, '…with no code left waiting for a letter that never went');
  global.fetch = realFetch; delete process.env.RESEND_API_KEY; delete process.env.MAIL_FROM; delete process.env.VERCEL;

  // ── no store behind the door (Vercel with no KV): says so ───────────────
  process.env.VERCEL = '1';
  wall.useStore(undefined);
  r = await who();
  A.deepStrictEqual([r.json.open, r.json.me], [false, null], 'with no store the gate says it is not open');
  r = await gate(good);
  A.deepStrictEqual([r.status, r.json.code], [503, 'no-store'], '…and a petition is a 503 that says why');
  delete process.env.VERCEL;

  done();
  console.log('verify-auth: ' + n + ' checks, all good');
})().catch(e => { done(); console.error('verify-auth FAILED:', e.message); process.exit(1); });
