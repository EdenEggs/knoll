#!/usr/bin/env node
/* probe-yard-hills.js — THE HILLS IN TWO ROWS (2026-09-25), in headless Chrome on a safe server
   (probe-gate-google.js as the preload: temp store, /_outbox for the sign-up code, bench doors 404'd):
   FAVORITES over YOUR SPACES, each with its small title; a new gnome's favourites row says where the
   flags are and their spaces row holds only the create mound; a flag raised in Spaces you've visited
   puts TOEM 2 on the favourites row; three spaces made stand on the second row and the mound goes;
   a fourth is refused (api/wall.js: SPACES, three an account).

     node lab2/perf/probe-yard-hills.js */
'use strict';
const { spawn } = require('child_process');
const net = require('net');
const path = require('path');
const { chromium } = require(process.env.PLAYWRIGHT || 'C:/Users/bobb9/Desktop/node_modules/playwright');
const SITE = path.join(__dirname, '..', '..'), PORT = Number(process.env.PORT || 4334), BASE = 'http://localhost:' + PORT;
const gnome = require('./gnome.js');
const fails = []; let n = 0;
const ok = (c, what, extra) => { n++; if (!c) fails.push(what + (extra ? ' :: ' + String(extra).slice(0, 400) : '')); console.log((c ? '  ok   ' : '  FAIL ') + what); };
const waitPort = (port, tries = 80) => new Promise((res, rej) => { const t = () => { const s = net.connect(port, '127.0.0.1'); s.once('connect', () => { s.end(); res(); }); s.once('error', () => tries-- > 0 ? setTimeout(t, 250) : rej(new Error('port never opened'))); }; t(); });
const j = v => JSON.stringify(v);
(async () => {
  const srv = spawn(process.execPath, ['-r', path.join(SITE, 'lab2/perf/probe-gate-google.js'), 'serve.js', String(PORT)], { cwd: SITE, stdio: ['ignore', 'pipe', 'pipe'] });
  let log = ''; srv.stdout.on('data', d => log += d); srv.stderr.on('data', d => log += d);
  let b;
  try {
    await waitPort(PORT);
    b = await chromium.launch({ channel: 'chrome', headless: true });
    const ctx = await b.newContext({ viewport: { width: 1500, height: 1000 } });
    await gnome.signIn(ctx, BASE);
    const p = await ctx.newPage();
    const errs = []; p.on('pageerror', e => errs.push(String(e)));
    const rows = () => p.evaluate(() => [...document.querySelectorAll('#dc-root nav[aria-label="hills"] > div')].map(r => ({
      title: r.firstElementChild.textContent.trim(), hills: [...r.querySelectorAll('a[title]')].map(a => a.getAttribute('title')), text: r.innerText.replace(/\s+/g, ' ').trim() })));
    await p.goto(BASE + '/yard/'); await p.waitForSelector('#dc-root nav[aria-label="hills"]', { timeout: 20000 }); await p.waitForTimeout(1500);
    let r = await rows();
    ok(r.length === 2 && r[0].title === 'FAVORITES' && r[1].title === 'YOUR SPACES', 'two rows, titled FAVORITES and YOUR SPACES', j(r.map(x => x.title)));
    ok(r[0].hills.length === 0 && /NONE YET — RAISE THE FLAG/.test(r[0].text), 'a new gnome\'s favourites row says where the flags are', r[0].text);
    ok(r[1].hills.join() === 'create page', '…and their spaces row holds only the create mound', j(r[1].hills));

    // a visit to TOEM 2, and its flag raised in Spaces you've visited
    await p.evaluate(() => { localStorage.setItem('knoll-yard:visits', JSON.stringify([{ path: '/toem2/', name: 'TOEM 2', at: Date.now() }])); });
    await p.reload(); await p.waitForSelector('#dc-root nav[aria-label="hills"]', { timeout: 20000 }); await p.waitForTimeout(1500);
    const flag = p.locator('#dc-root section:has(h2:text("visited")) button[aria-label*="TOEM 2"], #dc-root button[aria-label="save TOEM 2 to your hills"]').first();
    ok(await flag.count() > 0, 'the visit shows up with a flag beside it');
    await flag.click(); await p.waitForTimeout(600);
    r = await rows();
    ok(r[0].hills.join() === 'TOEM 2', 'the flag raised, TOEM 2 stands on the favourites row', j(r[0]));
    ok(await p.evaluate(() => localStorage.getItem('yard.favHills')) === '["TOEM 2"]', '…and is kept in this browser');

    // three spaces made stand on the second row, and the mound goes; a fourth is refused
    const mk = slug => ctx.request.post(BASE + '/api/wall', { headers: { origin: BASE }, data: { op: 'page', slug, title: 'Space ' + slug } }).then(x => x.json());
    for (const s of ['one', 'two', 'three']) ok((await mk('sp-' + s)).ok, 'a space made: sp-' + s);
    const mine = await ctx.request.get(BASE + '/api/wall?spaces=1').then(x => x.json());   // (a fourth post would meet a newcomer's rate cap before the count; probe-wall-api.js has the refusal)
    ok(mine.ok && mine.full === true && mine.max === 3 && mine.spaces.length === 3, 'three an account: the door says it is full', j({ full: mine.full, max: mine.max }));
    await p.reload(); await p.waitForSelector('#dc-root nav[aria-label="hills"]', { timeout: 20000 }); await p.waitForTimeout(1500);
    r = await rows();
    ok(r[1].hills.join() === 'Space sp-one,Space sp-two,Space sp-three', 'the three stand on YOUR SPACES, oldest first, and the mound is gone', j(r[1].hills));
    ok(r[0].hills.join() === 'TOEM 2', 'the favourites row is unchanged by them');
    ok(errs.length === 0, 'no page errors', errs.join(' | '));
  } catch (e) { fails.push('CRASH ' + (e && e.stack || e)); }
  if (b) await b.close().catch(() => {});
  srv.kill();
  console.log('\nprobe-yard-hills: ' + n + ' checks, ' + (fails.length ? fails.length + ' FAILED\n - ' + fails.join('\n - ') : 'all good'));
  if (fails.length) { console.log('\nserver log tail:\n' + log.slice(-1200)); process.exit(1); }
})();
