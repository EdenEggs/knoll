#!/usr/bin/env node
/* probe-gate-google.js — /signup and /login in headless Chrome: the plain
   wording, each input's one <label>, the margin notes, and "Continue with
   Google" end to end — a new person named at /signup and sent on, a named
   account from /login sent straight to ?next=, a cancelled sign-in, a
   callback this browser never started, and an address that has a password —
   and THE CODE (2026-09-24): the seal sends a code, the page turns to the
   code step, a wrong code, a new code, "go back", and the right code making
   the account and sending it on to ?next=.

   Google is played by this file: it starts serve.js on its own port with
   itself as a preload (node -r), which points the store at a temp folder
   (never the owner's toem2/wall-db.json or yard files), sets a dummy
   GOOGLE_CLIENT_ID/SECRET, answers Google's two token endpoints in-process,
   and rewrites /auth/google's redirect to accounts.google.com into a local
   /fake-google that bounces straight back to the site's callback. The lab
   benches' "/_name/" doors are 404'd so nothing autosaves into lab2/index.html,
   and GET /_outbox?to=<address> hands out the newest sign-up code the door
   wrote to the outbox beside its store (gnome.js reads it there). Other
   probes (the yard's, the accounts') start their server with this preload
   for the same reasons.

     node lab2/perf/probe-gate-google.js          (needs Chrome + Playwright)
*/
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');

const STORE = process.env.GATE_STORE;   // set by the probe for the server it spawns

if (require.main !== module) {
  // ── the preload, inside `node -r <this file> serve.js <port>` ─────────────
  const http = require('http');
  const store = STORE || fs.mkdtempSync(path.join(os.tmpdir(), 'knoll-gate-'));
  process.env.WALL_DB = path.join(store, 'wall-db.json');
  process.env.HILL_ROOT = store;
  process.env.GOOGLE_CLIENT_ID = 'cid'; process.env.GOOGLE_CLIENT_SECRET = 'secret';
  process.env.NO_BROWSER = '1';
  ['KV_REST_API_URL', 'KV_REST_API_TOKEN', 'UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN', 'VERCEL', 'BLOB_READ_WRITE_TOKEN', 'SITE_ORIGIN', 'ADMIN_EMAILS'].forEach(k => delete process.env[k]);
  const readOr = (name, dflt) => { try { return fs.readFileSync(path.join(store, name), 'utf8').trim() || dflt; } catch (e) { return dflt; } };
  const realFetch = global.fetch;
  global.fetch = async (url, opts) => {
    const u = String(url);
    if (u.startsWith('https://oauth2.googleapis.com/tokeninfo'))   // before /token, which is a prefix of it
      return { json: async () => ({ aud: 'cid', email_verified: 'true', email: readOr('vouch.txt', 'tester@example.com'), iss: 'https://accounts.google.com' }) };
    if (u.startsWith('https://oauth2.googleapis.com/token')) return { json: async () => ({ id_token: 'a.b.c' }) };
    return realFetch(url, opts);
  };
  const PORT = process.argv[2] || 4321, mk = http.createServer;
  http.createServer = function (...args) {
    const i = args.length - 1, h = args[i];
    args[i] = (req, res) => {
      if (req.url.startsWith('/_outbox?')) {   // THE CODE (gnome.js): the newest code the door posted to an address, out of the outbox beside the store
        res.setHeader('content-type', 'text/plain');
        try { res.end(require('./gnome.js').codeIn(path.join(store, 'outbox.jsonl'), new URL(req.url, 'http://x').searchParams.get('to'))); }
        catch (e) { res.statusCode = 404; res.end(String(e.message)); }
        return;
      }
      if (/^\/_[^/]*\//.test(req.url)) { res.statusCode = 404; res.end(); return; }
      if (req.url.startsWith('/fake-google?')) {   // Google's sign-in page: straight back with a code, or the error in google-mode.txt
        const q = new URL(req.url, 'http://x').searchParams, mode = readOr('google-mode.txt', 'code');
        res.statusCode = 302; res.setHeader('location', q.get('redirect_uri') + '?state=' + encodeURIComponent(q.get('state')) + (mode === 'code' ? '&code=abcd' : '&error=' + mode)); res.end(); return;
      }
      if (/^\/auth\/google(\?|$)/.test(req.url)) {
        const sh = res.setHeader.bind(res);
        res.setHeader = (k, v) => sh(k, String(k).toLowerCase() === 'location' ? String(v).replace('https://accounts.google.com/o/oauth2/v2/auth', 'http://localhost:' + PORT + '/fake-google') : v);
      }
      h(req, res);
    };
    return mk.apply(http, args);
  };
  return;
}

// ── the probe ───────────────────────────────────────────────────────────────
const { spawn } = require('child_process');
const net = require('net');
const { chromium } = require(process.env.PLAYWRIGHT || 'C:/Users/bobb9/Desktop/node_modules/playwright');
const SITE = path.join(__dirname, '..', '..'), PORT = Number(process.env.PORT || 4323), BASE = 'http://localhost:' + PORT;
const store = fs.mkdtempSync(path.join(os.tmpdir(), 'knoll-gate-'));
const gnome = require('./gnome.js');

const fails = []; let n = 0;
const ok = (cond, what, extra) => { n++; if (!cond) fails.push(what + (extra ? ' :: ' + String(extra).slice(0, 400) : '')); console.log((cond ? '  ok   ' : '  FAIL ') + what); };
const waitPort = (port, tries = 80) => new Promise((res, rej) => { const t = () => { const s = net.connect(port, '127.0.0.1'); s.once('connect', () => { s.end(); res(); }); s.once('error', () => tries-- > 0 ? setTimeout(t, 250) : rej(new Error('port ' + port + ' never opened'))); }; t(); });
const mode = m => fs.writeFileSync(path.join(store, 'google-mode.txt'), m);       // what the fake Google sends back
const vouch = e => fs.writeFileSync(path.join(store, 'vouch.txt'), e);             // whose address it vouches for
const post = (p, body) => p.evaluate(b => fetch('/api/auth', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) }).then(r => r.json()), body);
const whoami = p => p.evaluate(() => fetch('/api/auth', { cache: 'no-store' }).then(r => r.json()));

(async () => {
  const srv = spawn(process.execPath, ['-r', __filename, 'serve.js', String(PORT)], { cwd: SITE, env: Object.assign({}, process.env, { GATE_STORE: store }), stdio: ['ignore', 'pipe', 'pipe'] });
  let log = ''; srv.stdout.on('data', d => log += d); srv.stderr.on('data', d => log += d);
  let b;
  try {
    await waitPort(PORT);
    b = await chromium.launch({ channel: 'chrome', headless: true });
    const ctx = await b.newContext({ viewport: { width: 1400, height: 1000 } });
    mode('code');
    const p = await ctx.newPage();
    const pageErrors = []; p.on('pageerror', e => pageErrors.push(String(e)));
    const text = () => p.evaluate(() => document.body.innerText);
    const labelsOf = ids => p.evaluate(ids => ids.map(id => { const i = document.getElementById(id); return i && i.labels && i.labels.length === 1 ? i.labels[0].textContent.trim() : null; }), ids);

    // ── 1 · /signup in plain words ───────────────────────────────────────
    await p.goto(BASE + '/signup/'); await p.waitForTimeout(2500);
    let t = await text();
    for (const s of ['Create your account', 'Sign up for Knoll', 'Username', 'Email', 'Password', 'Confirm password', 'SIGN UP', 'press the seal to create your account',
                     'Continue with Google', 'no password needed', 'Already have an account?', 'By signing up, you agree to our Rules and Terms of Service.']) ok(t.includes(s), 'signup shows "' + s + '"');
    for (const s of ['Let it be known', 'Hear ye', 'secret word', 'gnome', 'petition', 'vouch', 'OR, BY OTHER POST', 'Rule Book', 'Residency']) ok(!t.includes(s), 'signup no longer shows "' + s + '"');
    let labels = await labelsOf(['f-name', 'f-email', 'f-pw', 'f-pw2']);
    ok(JSON.stringify(labels) === JSON.stringify(['Username', 'Email', 'Password', 'Confirm password']), 'each sign-up input has exactly one label, the plain one', JSON.stringify(labels));
    await p.click('button[aria-label="Sign up"]'); await p.waitForTimeout(500);
    t = await text(); ok(t.includes('please enter a username'), 'an empty sign-up complains in plain words', t.slice(0, 300));
    await p.fill('#f-name', 'x'); await p.fill('#f-email', 'nope'); await p.fill('#f-pw', 'short'); await p.fill('#f-pw2', 'other'); await p.click('button[aria-label="Sign up"]'); await p.waitForTimeout(500);
    t = await text();
    for (const s of ['please enter a valid email address', 'your password must be at least 8 characters', 'the passwords do not match']) ok(t.includes(s), 'a bad sign-up says "' + s + '"');

    // ── 2 · Continue with Google, brand new: named at /signup, then on to the yard ──
    await p.click('text=Continue with Google');
    await p.waitForURL(/\/signup\/\?google=1/, { timeout: 15000 });
    await p.waitForTimeout(2500); t = await text();
    ok(t.includes('One more thing') && t.includes('pick a username'), 'back from Google, the one-field naming form shows', t.slice(0, 300));
    ok(t.includes('Signed in with Google, using your Google email'), 'the naming form says it is signed in with Google');
    ok(!t.includes('Confirm password') && !t.includes('Continue with Google'), 'the naming form has no password fields and no second Google button');
    let me = await whoami(p);
    ok(me.me && me.me.id && !me.me.name, 'the session cookie is set and the account has no name yet', JSON.stringify(me));
    await p.fill('#f-name', 'Tester'); await p.click('button[aria-label="Sign up"]');
    await p.waitForURL(/\/yard\//, { timeout: 20000 });
    me = await whoami(p);
    ok(me.me && me.me.name === 'Tester', 'named, and landed on the yard signed in', JSON.stringify(me));

    // ── 3 · /login in plain words; Continue with Google as a named account goes straight to ?next= ──
    await post(p, { op: 'logout' });
    await p.goto(BASE + '/login/?next=%2Ftoem2%2F'); await p.waitForTimeout(2500);
    t = await text();
    for (const s of ['Welcome back', 'Log in to Knoll', 'Email', 'Password', 'Forgot your password?', 'Remember me', 'LOG IN', 'press the key to log in',
                     'Continue with Google', 'no password needed', "Don't have an account?", 'By logging in, you agree to our Terms of Service']) ok(t.includes(s), 'login shows "' + s + '"');
    for (const s of ['Halt', 'Hear ye', 'secret word', 'gatekeeper', 'unlatched', 'Petition', 'OR, BY OTHER POST', 'Residency']) ok(!t.includes(s), 'login no longer shows "' + s + '"');
    labels = await labelsOf(['f-email', 'f-pw']);
    ok(JSON.stringify(labels) === JSON.stringify(['Email', 'Password']), 'each log-in input has exactly one label, the plain one', JSON.stringify(labels));
    await p.click('button[aria-label="Log in"]'); await p.waitForTimeout(500);
    t = await text(); ok(t.includes('please enter a valid email address'), 'an empty log-in complains in plain words', t.slice(0, 300));
    await p.click('text=Forgot your password?'); await p.waitForTimeout(500);
    t = await text(); ok(t.includes('password reset is not available yet'), 'the forgot-password link answers in plain words');
    await p.click('text=Continue with Google');
    await p.waitForURL(/\/toem2\//, { timeout: 20000 });
    me = await whoami(p);
    ok(me.me && me.me.name === 'Tester', 'a named account comes straight back to ?next=, signed in', JSON.stringify(me));

    // ── 4 · the ways it goes wrong, in plain words ─────────────────────────
    await post(p, { op: 'logout' });
    mode('access_denied');
    await p.goto(BASE + '/auth/google?next=%2Fyard%2F'); await p.waitForTimeout(500);
    t = await text(); ok(t.includes('cancelled') && t.includes('back to log in'), 'a cancelled Google sign-in lands on a plain page with a way back', t.slice(0, 300));
    me = await whoami(p); ok(!me.me, '…and signs nobody in', JSON.stringify(me));
    const r1 = await p.evaluate(() => fetch('/auth/google/callback?state=abcdefghijklmnop&code=abcd').then(r => r.text()));
    ok(/another browser/.test(r1) && !/gate/.test(r1), 'a callback this browser never started is refused, plainly', r1.slice(0, 300));
    const pwp = { op: 'signup', name: 'Pw Person', email: 'pw@example.com', password: 'toadstool1' };
    let r2 = await post(p, pwp);
    ok(r2.ok && r2.sent && !r2.me, 'a password sign-up sends a code first, and makes nothing yet', JSON.stringify(r2));
    r2 = await post(p, Object.assign({ code: await gnome.code(ctx, BASE, pwp.email) }, pwp));
    ok(r2.ok && r2.me && r2.me.name === 'Pw Person', 'a password account can still be made — with the code', JSON.stringify(r2));
    await post(p, { op: 'logout' });
    r2 = await post(p, { op: 'login', email: 'pw@example.com', password: 'wrong-one' });
    ok(r2.code === 'wrong' && r2.error === 'incorrect email or password', 'a wrong password is answered in plain words', JSON.stringify(r2));
    vouch('pw@example.com'); mode('code');
    await p.goto(BASE + '/auth/google?next=%2Fyard%2F'); await p.waitForTimeout(500);
    t = await text(); ok(t.includes('already has a password'), 'Google cannot open a password account, and says so plainly', t.slice(0, 300));
    me = await whoami(p); ok(!me.me, '…and nobody is signed in afterwards', JSON.stringify(me));

    // ── 5 · THE CODE: the seal sends a code, and the code makes the account ──
    const says = (s, ms) => p.waitForFunction(s => document.body.innerText.includes(s), s, { timeout: ms || 8000 }).then(() => true, () => false);
    await post(p, { op: 'logout' });
    await p.goto(BASE + '/signup/?next=%2Ftoem2%2F'); await p.waitForTimeout(2500);
    await p.fill('#f-name', 'Coder'); await p.fill('#f-email', 'Coder@Example.com'); await p.fill('#f-pw', 'toadstool1'); await p.fill('#f-pw2', 'toadstool1');
    await p.click('button[aria-label="Sign up"]');
    ok(await says('SENT'), 'the seal says SENT once the code has gone');
    ok(await p.waitForSelector('#f-code', { timeout: 8000 }).then(() => true, () => false), 'the paper turns to the code step');
    await p.waitForTimeout(400); t = await text();
    for (const s of ['Check your email', 'Enter the code we sent you', 'Code', 'we emailed a 6-digit code to Coder@Example.com', 'VERIFY', 'press the seal to confirm your email', 'send a new code', 'Wrong email?']) ok(t.includes(s), 'the code step shows "' + s + '"', t.slice(0, 500));
    ok(!t.includes('Confirm password') && !t.includes('Continue with Google') && !t.includes('Username'), 'the code step has put the form away');
    ok(await p.evaluate(() => document.activeElement && document.activeElement.id === 'f-code'), 'the code field has the focus');
    me = await whoami(p); ok(!me.me, 'no account yet — the code has not come back', JSON.stringify(me));
    labels = await labelsOf(['f-code']); ok(labels[0] === 'Code', 'the code input has its one label', JSON.stringify(labels));
    const c1 = await gnome.code(ctx, BASE, 'coder@example.com');
    ok(/^\d{6}$/.test(c1), 'the door posted a six-figure code to the address, lower-cased', c1);
    await p.click('button[aria-label="Sign up"]'); await p.waitForTimeout(400);
    t = await text(); ok(t.includes('please enter the 6-digit code from the email'), 'the seal with no code asks for it, plainly');
    await p.fill('#f-code', c1 === '000000' ? '111111' : '000000'); await p.click('button[aria-label="Sign up"]');
    ok(await says('that code is not right'), 'a wrong code cracks the wax and says so');
    me = await whoami(p); ok(!me.me, '…and makes no account');
    await p.click('text=send a new code');
    ok(await says('a new code is on its way'), '"send a new code" says a new one is coming');
    const c2 = await gnome.code(ctx, BASE, 'coder@example.com');
    ok(/^\d{6}$/.test(c2), 'a fresh code went out', c2);
    if (c1 !== c2) { await p.fill('#f-code', c1); await p.click('button[aria-label="Sign up"]'); ok(await says('that code is not right'), 'the first code is no good once a new one has gone'); }
    await p.click('text=go back'); await p.waitForTimeout(500);
    t = await text(); ok(t.includes('Create your account') && t.includes('Confirm password') && !t.includes('Wrong email?'), '"go back" returns to the form');
    ok(await p.evaluate(() => document.getElementById('f-email').value === 'Coder@Example.com' && document.getElementById('f-pw').value === 'toadstool1'), '…filled in as it was');
    await p.click('button[aria-label="Sign up"]');
    ok(await p.waitForSelector('#f-code', { timeout: 8000 }).then(() => true, () => false), 'the seal sends another code and the code step is back');
    const c3 = await gnome.code(ctx, BASE, 'coder@example.com');
    await p.fill('#f-code', c3.slice(0, 3) + ' ' + c3.slice(3)); await p.click('button[aria-label="Sign up"]');   // with a space, the way people type them
    ok(await says('Welcome to Knoll'), 'the right code sets the wax: Welcome to Knoll');
    await p.waitForURL(/\/toem2\//, { timeout: 20000 });
    me = await whoami(p);
    ok(me.me && me.me.name === 'Coder', '…and the account is made and sent on to ?next=, signed in', JSON.stringify(me));

    ok(pageErrors.length === 0, 'no uncaught page errors along the way', pageErrors.join(' | '));
  } catch (e) { fails.push('CRASH ' + (e && e.stack || e)); }
  if (b) await b.close().catch(() => {});
  srv.kill();
  fs.rmSync(store, { recursive: true, force: true });
  console.log('\nprobe-gate-google: ' + n + ' checks, ' + (fails.length ? fails.length + ' FAILED\n - ' + fails.join('\n - ') : 'all good'));
  if (fails.length) { console.log('\nserver log tail:\n' + log.slice(-1500)); process.exit(1); }
})();
