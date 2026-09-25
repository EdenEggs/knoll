#!/usr/bin/env node
/* probe-yard-url.js — THE YARD HAS A NAME: /yard/<name> in headless Chrome on
   a safe server (lab2/perf/probe-gate-google.js as the preload: temp store,
   bench doors 404'd). Two accounts called Inky (Inky#1, Inky#2): the owner's
   address bar, a visit to their own address, the slash and the case put
   right, a name nobody goes by, the second Inky's ~2, a signed-out visitor
   sent on to the visitor's view and shown the pretty address there, the API
   that resolves a tag, and /yard/new/ untouched.

     node lab2/perf/probe-yard-url.js
*/
'use strict';
const { spawn } = require('child_process');
const net = require('net');
const path = require('path');
const { chromium } = require(process.env.PLAYWRIGHT || 'C:/Users/bobb9/Desktop/node_modules/playwright');
const SITE = path.join(__dirname, '..', '..'), PORT = Number(process.env.PORT || 4328), BASE = 'http://localhost:' + PORT;
const fails = []; let n = 0;
const ok = (c, what, extra) => { n++; if (!c) fails.push(what + (extra ? ' :: ' + String(extra).slice(0, 400) : '')); console.log((c ? '  ok   ' : '  FAIL ') + what); };
const waitPort = (port, tries = 80) => new Promise((res, rej) => { const t = () => { const s = net.connect(port, '127.0.0.1'); s.once('connect', () => { s.end(); res(); }); s.once('error', () => tries-- > 0 ? setTimeout(t, 250) : rej(new Error('port never opened'))); }; t(); });
const post = (p, body) => p.evaluate(b => fetch('/api/auth', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) }).then(r => r.json()), body);
// both steps of a sign-up (api/auth.js: THE CODE): the code goes out, the preload hands it over (gnome.js), and it comes back with the same form
const signup = async (ctx, p, who) => { await post(p, who); return post(p, Object.assign({ code: await require('./gnome.js').code(ctx, BASE, who.email) }, who)); };
const settle =async (p, ms = 3000) => { await p.waitForTimeout(ms); return { path: new URL(p.url()).pathname + new URL(p.url()).search, view: await p.evaluate(() => !!window.YARD_VIEW), own: await p.evaluate(() => !!document.querySelector('.yard-tools')) }; };
(async () => {
  const srv = spawn(process.execPath, ['-r', path.join(SITE, 'lab2/perf/probe-gate-google.js'), 'serve.js', String(PORT)], { cwd: SITE, stdio: ['ignore', 'pipe', 'pipe'] });
  let log = ''; srv.stdout.on('data', d => log += d); srv.stderr.on('data', d => log += d);
  let b;
  try {
    await waitPort(PORT);
    b = await chromium.launch({ channel: 'chrome', headless: true });
    const ctx = await b.newContext({ viewport: { width: 1400, height: 1000 } });
    const p = await ctx.newPage();
    const pageErrors = []; p.on('pageerror', e => pageErrors.push(String(e)));
    await p.goto(BASE + '/login/');
    const one = await signup(ctx, p, { op: 'signup', name: 'Inky', email: 'inky1@example.com', password: 'toadstool1' });
    ok(one.ok && one.me && one.me.tag === 'Inky#1', 'the first Inky is Inky#1', JSON.stringify(one).slice(0, 200));
    const id1 = one.me && one.me.id;

    let s = await (await p.goto(BASE + '/yard/'), settle(p));
    ok(s.path === '/yard/Inky' && s.own, '/yard/ shows the owner their own address, /yard/Inky', JSON.stringify(s));
    s = await (await p.goto(BASE + '/yard/Inky'), settle(p));
    ok(s.path === '/yard/Inky' && s.own, 'their own address opens their yard and stays', JSON.stringify(s));
    s = await (await p.goto(BASE + '/yard/inky/'), settle(p));
    ok(s.path === '/yard/Inky' && s.own, 'a slash and the wrong case are put right', JSON.stringify(s));
    s = await (await p.goto(BASE + '/yard/nobody-here'), settle(p));
    ok(s.path === '/yard/Inky' && s.own, 'a name nobody goes by falls back to your own yard', JSON.stringify(s));
    const api = await p.evaluate(() => fetch('/api/friends?who=' + encodeURIComponent('Inky#1')).then(r => r.json()));
    ok(api.ok && api.id === id1 && api.tag === 'Inky#1', 'api/friends resolves a tag to its account', JSON.stringify(api));
    const miss = await p.evaluate(() => fetch('/api/friends?who=' + encodeURIComponent('Nobody#9')).then(r => r.status));
    ok(miss === 404, 'a tag nobody goes by is a 404', miss);
    await p.goto(BASE + '/yard/new/'); await p.waitForTimeout(1500);
    ok(/\/yard\/new\/$/.test(p.url()) && /space/i.test(await p.evaluate(() => document.title + ' ' + document.body.innerText.slice(0, 400))), '/yard/new/ is still the create-a-space page', p.url());

    // the second Inky
    await post(p, { op: 'logout' });
    const two = await signup(ctx, p, { op: 'signup', name: 'Inky', email: 'inky2@example.com', password: 'toadstool1' });
    ok(two.ok && two.me && two.me.tag === 'Inky#2', 'the second Inky is Inky#2', JSON.stringify(two).slice(0, 200));
    s = await (await p.goto(BASE + '/yard/'), settle(p));
    ok(s.path === '/yard/Inky~2' && s.own, 'their address is /yard/Inky~2', JSON.stringify(s));
    s = await (await p.goto(BASE + '/yard/Inky'), settle(p, 4000));
    ok(s.path === '/yard/Inky' && s.view, 'the first Inky\'s address, seen by the second, is the visitor\'s view wearing the pretty address', JSON.stringify(s));

    // a signed-out visitor
    const v = await (await b.newContext({ viewport: { width: 1400, height: 1000 } })).newPage();
    s = await (await v.goto(BASE + '/yard/Inky~2'), settle(v, 4000));
    ok(s.path === '/yard/Inky~2' && s.view, 'a signed-out visitor at /yard/Inky~2 gets the visitor\'s view, pretty address kept', JSON.stringify(s));
    s = await (await v.goto(BASE + '/yard/nobody-here'), settle(v, 2500));
    ok(/^\/login\/\?next=/.test(s.path), 'a signed-out visitor at a name nobody goes by is sent to the gate', JSON.stringify(s));
    s = await (await v.goto(BASE + '/yard/'), settle(v, 2500));
    ok(/^\/login\/\?next=/.test(s.path), '…and /yard/ itself still asks them to log in', JSON.stringify(s));
    ok(pageErrors.length === 0, 'no uncaught page errors', pageErrors.join(' | ').slice(0, 300));
  } catch (e) { fails.push('CRASH ' + (e && e.stack || e)); }
  if (b) await b.close().catch(() => {});
  srv.kill();
  console.log('\nprobe-yard-url: ' + n + ' checks, ' + (fails.length ? fails.length + ' FAILED\n - ' + fails.join('\n - ') : 'all good'));
  if (fails.length) { console.log('\nserver log tail:\n' + log.slice(-800)); process.exit(1); }
})();
