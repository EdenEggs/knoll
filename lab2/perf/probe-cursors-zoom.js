/* refute-zoom-cost.js — does cursors.js's 'lab:zoom' handler (one keyframe rewrite per cursor per
   zoom step, on top of the world's own) make a wheel-zoom burst dearer? Same fake room. At the
   opening camera: 0 / 5 / 12 cursors placed on screen (one message each, then still), then 2s of
   ctrl+wheel steps dispatched on the bench every frame (alternating in/out by +-30 deltaY), rAF
   deltas recorded, lab:zoom events counted. Repeated 0/12/0/12 to see the order effect. */
'use strict';
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');
const PAGE = 'http://localhost:4321/lab2/';
const FAKE = `
var Trystero = (function () {
  var action = null, room = null;
  window.__fake = { get action() { return action; }, get room() { return room; } };
  return { selfId: 'me-000000', joinRoom: function () { if (room) return room;
    room = { makeAction: function (name) { action = { name: name, send: function () {}, onMessage: null }; return action; },
             onPeerJoin: null, onPeerLeave: null, leave: function () {}, getPeers: function () { return {}; } }; return room; } };
})();`;
const r1 = x => Math.round(x * 10) / 10;
function stats(d) {
  const a = d.slice().sort((x, y) => x - y);
  const q = p => a.length ? a[Math.min(a.length - 1, Math.floor(p * a.length))] : 0;
  const sum = a.reduce((s, x) => s + x, 0);
  return { n: a.length, median: r1(q(0.5)), p90: r1(q(0.9)), max: r1(a.length ? a[a.length - 1] : 0), over34: a.filter(x => x > 34).length, fps: r1(a.length && sum ? a.length / (sum / 1000) : 0) };
}
const SETTLE = ({ quiet, cap }) => new Promise(resolve => {
  const t0 = performance.now(); let last = '', since = t0;
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
const PLACE = ({ n, tag }) => {
  const a = window.__fake.action, Lab = window.Lab, b = Lab.bench.getBoundingClientRect();
  const ids = [];
  for (let i = 0; i < n; i++) {
    const id = tag + '-' + i; ids.push(id);
    const w = Lab.toWorld(b.left + 120 + Math.random() * (b.width - 240), b.top + 120 + Math.random() * (b.height - 240));
    a.onMessage([Math.round(w.x), Math.round(w.y)], { peerId: id });
  }
  window.__ids = ids;
  return document.querySelectorAll('.company-cursor').length;
};
const DROP = () => { (window.__ids || []).forEach(id => window.__fake.room.onPeerLeave(id)); window.__ids = []; return document.querySelectorAll('.company-cursor').length; };
const ZOOMBURST = ms => new Promise(resolve => {
  const Lab = window.Lab, bench = Lab.bench, b = bench.getBoundingClientRect();
  const z0 = Lab.zoom;
  let zooms = 0; const onz = () => zooms++; document.addEventListener('lab:zoom', onz);
  const d = []; let last = 0, i = 0; const t0 = performance.now();
  const step = now => {
    if (last) d.push(now - last); last = now;
    const dy = (Math.floor(i / 20) % 2 ? 1 : -1) * 30; i++;   // 20 steps in, 20 steps out
    bench.dispatchEvent(new WheelEvent('wheel', { deltaY: dy, deltaMode: 0, ctrlKey: true, clientX: b.left + b.width / 2, clientY: b.top + b.height / 2, bubbles: true, cancelable: true }));
    if (now - t0 < ms) requestAnimationFrame(step);
    else { document.removeEventListener('lab:zoom', onz); resolve({ deltas: d, zooms, steps: i, z0, z1: Lab.zoom }); }
  };
  requestAnimationFrame(step);
});
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: false, args: ['--window-size=1616,1110', '--window-position=0,0'] });
  const context = await browser.newContext({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  await page.route('**/_lab2/**', r => r.fulfill({ status: 404, body: 'no door' }));
  await page.route('**/vendor/trystero-nostr.js', r => r.fulfill({ status: 200, contentType: 'application/javascript', body: FAKE }));
  await page.goto(PAGE, { waitUntil: 'load' });
  await page.bringToFront();
  await page.waitForFunction(() => window.Lab && window.Frames, null, { timeout: 25000 });
  await page.evaluate(SETTLE, { quiet: 2000, cap: 25000 });
  await page.waitForFunction(() => window.Company && window.Company.room && window.__fake.action, null, { timeout: 15000 });
  await page.waitForTimeout(1500);
  const rows = [];
  for (const n of [0, 12, 0, 5, 12, 0]) {
    const placed = await page.evaluate(PLACE, { n, tag: 'zc' + n });
    await page.waitForTimeout(400);
    const r = await page.evaluate(ZOOMBURST, 2000);
    const s = stats(r.deltas);
    await page.evaluate(DROP);
    await page.evaluate(SETTLE, { quiet: 800, cap: 8000 });
    await page.waitForTimeout(500);
    rows.push({ cursors: placed, ...s, zooms: r.zooms, steps: r.steps, z0: r.z0, z1: r.z1 });
    console.log(`cursors ${String(placed).padStart(2)} | wheel steps ${r.steps} lab:zoom ${r.zooms} | median ${s.median} p90 ${s.p90} max ${s.max} over34 ${s.over34} fps ${s.fps} | zoom ${r1(r.z0 * 100)}% -> ${r1(r.z1 * 100)}%`);
  }
  fs.writeFileSync(path.join(__dirname, 'refute-zoom-cost.json'), JSON.stringify(rows, null, 2));
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
