/* probe-cursors.js — what does a remote cursor tween cost the main thread?

   Same harness shape as lab2/perf/measure.js (system Chrome, headed, 1600x1000
   at DPR 1, the autosave door 404'd). The Trystero bundle is swapped for a fake
   room so cursors.js's `hear` path can be driven from here without relays:
   window.__fake.action.onMessage([wx, wy], {peerId}) is exactly what a peer's
   message arrives as.

   Per camera, per condition: 2s of rAF deltas UNTRACED (frame cadence), then
   the same 2s again under a CDP trace (devtools.timeline) counting the events
   the lab.js note names — Layerize, PrePaint, Commit, Paint, UpdateLayoutTree —
   with their total durations. Run from C:/Users/bobb9/Desktop/site. */
'use strict';
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');

const PAGE = 'http://localhost:4321/lab2/';
const VIEW = { width: 1600, height: 1000 };
const WINDOW = { width: 1616, height: 1110 };
const SAMPLE_MS = 2000;
const OUT = path.join(__dirname, 'probe-cursors.json');

const ALL_CAMS = [
  { key: 'open',  zoom: null },                              // where index.html opens
  { key: 'z100',  zoom: 1.00, cx: 2300, cy: -1200 },
  { key: 'z35',   zoom: 0.35, cx: 1000, cy: -600 },
  { key: 'edge',  zoom: 1.00, cx: -2500, cy: -2500 },       // the clamp pulls it back to 120px of sheet: mostly bare bench, nothing warm
];
const argv = process.argv.slice(2);
const flag = (k, d) => { const i = argv.indexOf('--' + k); return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : d; };
const NO_CURSORS = argv.includes('--no-cursors');
const camKeys = flag('cams', null), condKeys = flag('conds', null);
const CAMS = camKeys ? ALL_CAMS.filter(c => camKeys.split(',').includes(c.key)) : ALL_CAMS;
const ALL_CONDS = [
  { key: 'idle',   n: 0, hz: 0 },
  { key: 'c1@20',  n: 1, hz: 20 },
  { key: 'c5@20',  n: 5, hz: 20 },
  { key: 'c5@60',  n: 5, hz: 60 },   // peers ignoring RATE
  { key: 'c12@20', n: 12, hz: 20 },
];
const CONDS = condKeys ? ALL_CONDS.filter(c => condKeys.split(',').includes(c.key)) : ALL_CONDS;
const OUT2 = path.join(__dirname, 'probe-cursors' + (NO_CURSORS ? '-nocursors' : '') + (flag('tag', '') ? '-' + flag('tag', '') : '') + '.json');

const FAKE = `
var Trystero = (function () {
  var action = null, room = null;
  window.__fake = { get action() { return action; }, get room() { return room; } };
  return {
    selfId: 'me-000000',
    joinRoom: function () {
      if (room) return room;
      room = {
        makeAction: function (name) { action = { name: name, send: function () {}, onMessage: null }; return action; },
        onPeerJoin: null, onPeerLeave: null,
        leave: function () {}, getPeers: function () { return {}; }
      };
      return room;
    }
  };
})();`;

const r1 = x => Math.round(x * 10) / 10;
const r2 = x => Math.round(x * 100) / 100;
function stats(d) {
  const a = d.slice().sort((x, y) => x - y);
  const q = p => a.length ? a[Math.min(a.length - 1, Math.floor(p * a.length))] : 0;
  const sum = a.reduce((s, x) => s + x, 0);
  return { n: a.length, median: r1(q(0.5)), p90: r1(q(0.9)), p99: r1(q(0.99)), max: r1(a.length ? a[a.length - 1] : 0),
           over16: a.filter(x => x > 16.7).length, over34: a.filter(x => x > 34).length, fps: r1(a.length && sum ? a.length / (sum / 1000) : 0) };
}

// ── in-page ─────────────────────────────────────────────────────────────
const LOOK = ({ z, wx, wy }) => new Promise(resolve => {
  const Lab = window.Lab, b = Lab.bench.getBoundingClientRect();
  let done = false;
  const fin = why => { if (!done) { done = true; resolve(why); } };
  document.addEventListener('lab:still', () => fin('still'), { once: true });
  Lab.camTo(z, b.width / 2 - wx * z, b.height / 2 - wy * z, 0);
  setTimeout(() => fin('timeout'), 1500);
});
const SETTLE = ({ quiet, cap }) => new Promise(resolve => {
  const t0 = performance.now();
  let last = '', since = performance.now();
  const tick = () => {
    const sig = document.querySelectorAll('.gz.booted').length + '/' + document.querySelectorAll('iframe[src]').length;
    const now = performance.now();
    if (sig !== last) { last = sig; since = now; }
    if (now - since >= quiet) return resolve({ ms: Math.round(now - t0), settled: true, sig });
    if (now - t0 >= cap) return resolve({ ms: Math.round(now - t0), settled: false, sig });
    setTimeout(tick, 100);
  };
  tick();
});
const SAMPLE = ms => new Promise(resolve => {
  const d = []; let last = 0; const t0 = performance.now();
  const step = now => { if (last) d.push(now - last); last = now; if (now - t0 < ms) requestAnimationFrame(step); else resolve(d); };
  requestAnimationFrame(step);
});
// n synthetic peers, each sending a world point hz times a second for ms,
// random-walking inside the bench's own rectangle so every cursor is on screen
const PEERS = ({ n, hz, ms, tag }) => new Promise(resolve => {
  const a = window.__fake.action, Lab = window.Lab, b = Lab.bench.getBoundingClientRect();
  const ids = []; for (let i = 0; i < n; i++) ids.push(tag + '-' + i);
  const pos = ids.map(() => ({ x: b.left + 120 + Math.random() * (b.width - 240), y: b.top + 120 + Math.random() * (b.height - 240),
                               vx: (Math.random() - 0.5) * 12, vy: (Math.random() - 0.5) * 12 }));
  let sent = 0;
  if (!n) return setTimeout(() => resolve({ ids, sent }), ms);
  const iv = setInterval(() => {
    ids.forEach((id, i) => {
      const p = pos[i]; p.x += p.vx; p.y += p.vy;
      if (p.x < b.left + 60 || p.x > b.right - 60) p.vx = -p.vx;
      if (p.y < b.top + 60 || p.y > b.bottom - 60) p.vy = -p.vy;
      const w = Lab.toWorld(p.x, p.y);
      a.onMessage([Math.round(w.x), Math.round(w.y)], { peerId: id });
      sent++;
    });
  }, Math.round(1000 / hz));
  setTimeout(() => { clearInterval(iv); resolve({ ids, sent }); }, ms);
});
const DROP = ids => { ids.forEach(id => window.__fake.room.onPeerLeave(id)); return document.querySelectorAll('.company-cursor').length; };

// ── trace accounting ────────────────────────────────────────────────────
const NAMES = ['Layerize', 'PrePaint', 'Commit', 'Paint', 'UpdateLayoutTree', 'Layout', 'UpdateLayerTree', 'CompositeLayers',
               'Animation', 'BeginMainThreadFrame', 'FunctionCall', 'TimerFire', 'RunTask', 'HitTest', 'ScheduleStyleRecalculation', 'InvalidateLayout'];
function account(buf) {
  let ev;
  try { ev = JSON.parse(buf.toString()).traceEvents; } catch (e) { return { error: String(e) }; }
  const byName = {};
  const threads = {};
  for (const e of ev) {
    if (e.ph === 'M' && e.name === 'thread_name') threads[e.pid + ':' + e.tid] = e.args.name;
  }
  for (const e of ev) {
    if (!NAMES.includes(e.name)) continue;
    const th = threads[e.pid + ':' + e.tid] || '?';
    if (th !== 'CrRendererMain') continue;                    // the main thread only
    const o = byName[e.name] || (byName[e.name] = { count: 0, ms: 0 });
    if (e.ph === 'X') { o.count++; o.ms += (e.dur || 0) / 1000; }
    else if (e.ph === 'I' || e.ph === 'i' || e.ph === 'B') o.count++;
  }
  for (const k in byName) byName[k].ms = r2(byName[k].ms);
  return byName;
}

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: false,
    args: ['--window-size=' + WINDOW.width + ',' + WINDOW.height, '--window-position=0,0'] });
  const context = await browser.newContext({ viewport: VIEW, deviceScaleFactor: 1 });
  const page = await context.newPage();
  await page.route('**/_lab2/**', r => r.fulfill({ status: 404, body: 'no door' }));
  await page.route('**/vendor/trystero-nostr.js', r => r.fulfill({ status: 200, contentType: 'application/javascript', body: FAKE }));
  if (NO_CURSORS) await page.route('**/cursors.js', r => r.fulfill({ status: 200, contentType: 'application/javascript', body: '/* cursors.js blocked for the control run */' }));
  const pageErrors = [];
  page.on('pageerror', e => pageErrors.push(String(e.message || e)));

  await page.goto(PAGE, { waitUntil: 'load' });
  await page.waitForFunction(() => window.Lab && window.Frames, null, { timeout: 25000 });
  const boot = await page.evaluate(SETTLE, { quiet: 2000, cap: 25000 });
  if (!NO_CURSORS) await page.waitForFunction(() => window.Company && window.Company.room && window.__fake && window.__fake.action, null, { timeout: 15000 });
  else await page.evaluate(SAMPLE, 3000);
  const info = await page.evaluate(() => ({ ua: navigator.userAgent, zoom: window.Lab.zoom, booted: document.querySelectorAll('.gz.booted').length,
    iframes: document.querySelectorAll('iframe').length, layer: !!document.querySelector('.company'), hz: null }));
  console.log('booted', boot, 'company layer:', info.layer, 'zoom', info.zoom);

  const results = { when: new Date().toISOString(), ua: info.ua, boot, cams: [] };
  for (const cam of CAMS) {
    if (cam.zoom) { await page.evaluate(LOOK, { z: cam.zoom, wx: cam.cx, wy: cam.cy }); await page.evaluate(SETTLE, { quiet: 1200, cap: 20000 }); }
    await page.evaluate(SAMPLE, 600);                          // let the camera's own work drain
    const row = { key: cam.key, zoom: await page.evaluate(() => window.Lab.zoom), conds: [] };
    for (const c of CONDS) {
      // pass 1: untraced cadence
      const [d1, p1] = await Promise.all([page.evaluate(SAMPLE, SAMPLE_MS), page.evaluate(PEERS, { n: c.n, hz: c.hz, ms: SAMPLE_MS, tag: cam.key + '-a-' + c.key })]);
      const left1 = await page.evaluate(DROP, p1.ids);
      await page.evaluate(SAMPLE, 300);
      // pass 2: the same under a trace
      await browser.startTracing(page, { categories: ['devtools.timeline', 'disabled-by-default-devtools.timeline'] });
      const [d2, p2] = await Promise.all([page.evaluate(SAMPLE, SAMPLE_MS), page.evaluate(PEERS, { n: c.n, hz: c.hz, ms: SAMPLE_MS, tag: cam.key + '-b-' + c.key })]);
      const buf = await browser.stopTracing();
      const left2 = await page.evaluate(DROP, p2.ids);
      await page.evaluate(SAMPLE, 300);
      const tr = account(buf);
      const out = { cond: c.key, peers: c.n, hz: c.hz, sent: p1.sent, untraced: stats(d1), traced: stats(d2), trace: tr, leftover: [left1, left2] };
      row.conds.push(out);
      const t = k => tr[k] ? tr[k].count + 'x/' + tr[k].ms + 'ms' : '-';
      console.log(`${cam.key.padEnd(5)} ${c.key.padEnd(7)} msgs ${String(p1.sent).padStart(4)} | rAF med ${out.untraced.median} p90 ${out.untraced.p90} max ${out.untraced.max} fps ${out.untraced.fps} >16 ${out.untraced.over16} | ` +
        `Layerize ${t('Layerize')} PrePaint ${t('PrePaint')} Commit ${t('Commit')} Paint ${t('Paint')} Style ${t('UpdateLayoutTree')} Layout ${t('Layout')} Anim ${t('Animation')} BMF ${t('BeginMainThreadFrame')}`);
    }
    results.cams.push(row);
  }
  results.pageErrors = pageErrors;
  fs.writeFileSync(OUT2, JSON.stringify(results, null, 2));
  console.log('wrote', OUT2, 'pageErrors:', pageErrors.length);
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
