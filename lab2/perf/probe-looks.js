#!/usr/bin/env node
/* probe-looks.js — PAST LOOKS ARE THE PAGE ITSELF (dashboard/index.html, 2026-09-25), in headless Chrome on a
   safe server (probe-gate-google.js as the preload: temp store, /_outbox for the sign-up code, bench doors
   404'd): a gnome saves their yard twice (one stroke, then two), the dashboard's Past looks show one print a
   save, each a frame of the yard at that version (../yard/?embed=1&at=<t>) with that version's pieces drawn in
   it, the newest first; a look keeps nothing in this browser (the live page's kept wall is still the newest);
   and a print opens the peek with the same frame, larger.

     node lab2/perf/probe-looks.js */
'use strict';
const { spawn } = require('child_process');
const net = require('net');
const path = require('path');
const { chromium } = require(process.env.PLAYWRIGHT || 'C:/Users/bobb9/Desktop/node_modules/playwright');
const SITE = path.join(__dirname, '..', '..'), PORT = Number(process.env.PORT || 4335), BASE = 'http://localhost:' + PORT;
const gnome = require('./gnome.js');
const fails = []; let n = 0;
const ok = (c, what, extra) => { n++; if (!c) fails.push(what + (extra ? ' :: ' + String(extra).slice(0, 400) : '')); console.log((c ? '  ok   ' : '  FAIL ') + what); };
const waitPort = (port, tries = 80) => new Promise((res, rej) => { const t = () => { const s = net.connect(port, '127.0.0.1'); s.once('connect', () => { s.end(); res(); }); s.once('error', () => tries-- > 0 ? setTimeout(t, 250) : rej(new Error('port never opened'))); }; t(); });
const j = v => JSON.stringify(v);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const stroke = i => ({ k: 's', d: 'M' + (40 + i * 60) + ' 40 L' + (400 + i * 60) + ' 300', c: '#e8484a', w: 0 });
(async () => {
  const srv = spawn(process.execPath, ['-r', path.join(SITE, 'lab2/perf/probe-gate-google.js'), 'serve.js', String(PORT)], { cwd: SITE, stdio: ['ignore', 'pipe', 'pipe'] });
  let log = ''; srv.stdout.on('data', d => log += d); srv.stderr.on('data', d => log += d);
  let b;
  try {
    await waitPort(PORT);
    b = await chromium.launch({ channel: 'chrome', headless: true });
    const ctx = await b.newContext({ viewport: { width: 1500, height: 1000 } });
    await gnome.signIn(ctx, BASE);
    const me = (await ctx.request.get(BASE + '/api/auth').then(r => r.json())).me, hill = 'u-' + me.id;
    const save = items => ctx.request.post(BASE + '/api/hill', { headers: { origin: BASE }, data: { hill, doc: { wall: { items }, flatfile: { list: [] }, plot: {}, name: 'Looker', plotName: '' } } }).then(r => r.json());
    const s1 = await save([stroke(0)]); await sleep(1200);
    const s2 = await save([stroke(0), stroke(1)]);
    ok(s1.ok && s2.ok && s2.looks && s2.looks.length === 2 && s2.looks[0].t > s2.looks[1].t, 'two saves of the yard: one stroke, then two — two looks, newest first', j([s1, s2]));
    const [t2, t1] = [s2.looks[0].t, s2.looks[1].t];
    const v1 = await ctx.request.get(BASE + '/api/hill?hill=' + hill + '&at=' + t1).then(r => r.json());
    ok(v1.ok && v1.doc.wall.items.length === 1, 'the older version is kept whole behind ?at=', j(v1).slice(0, 200));

    const p = await ctx.newPage();
    const errs = []; p.on('pageerror', e => errs.push(String(e)));
    // the yard itself first, so this browser HAS a copy of it to lose (knoll-yard:wall — the key the yard's store writes)
    const keptWall = () => p.evaluate(() => { try { return JSON.parse(localStorage.getItem('knoll-yard:wall') || 'null'); } catch (e) { return null; } });
    await p.goto(BASE + '/yard/?embed=1');
    await p.waitForFunction(() => { try { return (JSON.parse(localStorage.getItem('knoll-yard:wall')) || {}).items.length === 2; } catch (e) { return false; } }, null, { timeout: 25000 }).catch(() => {});
    ok(((await keptWall()) || { items: [] }).items.length === 2, 'the yard, opened, keeps the newest save in this browser', j(await keptWall()).slice(0, 200));
    await p.goto(BASE + '/dashboard/');
    await p.waitForSelector('#dc-root iframe[title^="your page as saved"]', { state: 'attached', timeout: 25000 });
    const prints = p.locator('#dc-root iframe[title^="your page as saved"]');
    ok(await prints.count() === 2, 'Past looks has one print a save', await prints.count());
    const srcs = await prints.evaluateAll(es => es.map(e => e.getAttribute('src')));
    ok(srcs[0] === '../yard/?embed=1&at=' + t2 && srcs[1] === '../yard/?embed=1&at=' + t1, 'each print frames the yard at its save, newest first', j(srcs));
    await prints.first().scrollIntoViewIfNeeded(); await p.waitForTimeout(500);      // lazy: they load once in sight
    const frameOf = t => p.frames().find(f => f.url().includes('embed=1&at=' + t));
    const drawn = async t => { const f = frameOf(t); if (!f) return -1; await f.waitForFunction(() => window.Wall && document.querySelectorAll('#bench-world svg.wall-ink .wall-item').length > 0, null, { timeout: 25000 }).catch(() => {}); return f.evaluate(() => document.querySelectorAll('#bench-world svg.wall-ink .wall-item').length); };
    ok(await drawn(t2) === 2 && await drawn(t1) === 1, 'the frames draw that version\'s pieces: two strokes in the newest, one in the older', j([await drawn(t2), await drawn(t1)]));
    ok(await frameOf(t1).evaluate(() => window.LAB_LOOK === true && document.documentElement.classList.contains('yard-embed')), 'a look knows it is one: embedded, and keeping nothing');
    /* the yard's kept wall is untouched by the looks. Until 2026-09-27 this read knoll-lab2:wall — a key no yard
       writes, so it passed on nothing — while every look wrote its version over knoll-yard:wall (yard/tools.js:
       A LOOK'S STORES ARE IN MEMORY). It reads the yard's own key now, and wants the newest save still in it. */
    await p.waitForTimeout(1500);
    const kept = await keptWall();
    ok(!!kept && Array.isArray(kept.items) && kept.items.length === 2, 'what this browser keeps of the yard is still the newest save, not a look\'s', j(kept && kept.items && kept.items.length));
    ok((await p.evaluate(() => localStorage.getItem('knoll-yard:applied'))) === String(t2), '…marked as the save it is, and the older version never');
    ok(!(await p.evaluate(() => localStorage.getItem('knoll-yard:touched'))), '…and no look has marked the yard as having unsaved work');
    await p.locator('#dc-root [role="button"]:has(iframe[title^="your page as saved"])').first().click(); await p.waitForTimeout(600);
    const big = p.locator('#dc-root [role="dialog"][aria-label="snapshot"] iframe');
    ok(await big.count() === 1 && (await big.getAttribute('src')) === '../yard/?embed=1&at=' + t2 && (await big.evaluate(e => e.parentElement.getBoundingClientRect().height)) > 500, 'a print opens the peek: the same save, framed larger, the whole page');
    ok(errs.length === 0, 'no page errors', errs.join(' | '));
  } catch (e) { fails.push('CRASH ' + (e && e.stack || e)); }
  if (b) await b.close().catch(() => {});
  srv.kill();
  console.log('\nprobe-looks: ' + n + ' checks, ' + (fails.length ? fails.length + ' FAILED\n - ' + fails.join('\n - ') : 'all good'));
  if (fails.length) { console.log('\nserver log tail:\n' + log.slice(-1200)); process.exit(1); }
})();
