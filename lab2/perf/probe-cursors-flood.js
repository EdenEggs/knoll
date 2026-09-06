/* flood.js — does one flooding peer jank the bench? Two visible Chrome windows,
   A (victim) and B (attacker), both on the local lab2. B floods the 'cursor'
   action via Company.room.makeAction('cursor').send() (the devtools path).
   A measures rAF frame deltas + long tasks. Door 404'd: nothing is saved. */
'use strict';
const { chromium } = require('C:/Users/bobb9/Desktop/node_modules/playwright');
const PAGE = 'http://localhost:4321/lab2/';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const r1 = x => Math.round(x * 10) / 10;
function stats(d) {
  const a = d.slice().sort((x, y) => x - y);
  const q = p => a.length ? a[Math.min(a.length - 1, Math.floor(p * a.length))] : 0;
  const sum = a.reduce((s, x) => s + x, 0);
  return { n: a.length, median: r1(q(0.5)), p90: r1(q(0.9)), max: r1(a.length ? a[a.length - 1] : 0), fps: r1(a.length && sum ? a.length / (sum / 1000) : 0), over34: a.filter(x => x > 34).length };
}

async function launch(x, w, h) {
  const browser = await chromium.launch({ channel: 'chrome', headless: false,
    args: ['--window-size=' + (w + 16) + ',' + (h + 110), '--window-position=' + x + ',0'] });
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  await ctx.route('**/_lab2/**', r => r.fulfill({ status: 404, body: 'no door' }));
  const page = await ctx.newPage();
  page.on('pageerror', e => console.log('pageerror', e.message));
  await page.goto(PAGE, { waitUntil: 'load' });
  return { browser, page };
}

// in-page: frame deltas + long tasks for `ms`, plus received-message count
const MEASURE = ms => new Promise(res => {
  const d = []; let last = performance.now(); const t0 = last;
  let longTasks = 0, longMs = 0;
  const po = new PerformanceObserver(list => list.getEntries().forEach(e => { longTasks++; longMs += e.duration; }));
  po.observe({ entryTypes: ['longtask'] });
  const c0 = window.__msgs || 0;
  const tick = () => {
    const t = performance.now(); d.push(t - last); last = t;
    if (t - t0 < ms) requestAnimationFrame(tick);
    else { po.disconnect(); res({ deltas: d, longTasks, longMs: Math.round(longMs), msgs: (window.__msgs || 0) - c0, cursors: Company.cursors, sw: Lab.bench.scrollWidth, sh: Lab.bench.scrollHeight }); }
  };
  requestAnimationFrame(tick);
});

(async () => {
  const A = await launch(0, 1600, 1000);
  const B = await launch(1640, 800, 600);
  const ready = async (p, name) => {
    await p.waitForFunction(() => window.Company && Company.room, null, { timeout: 30000 });
    const t0 = Date.now();
    await p.waitForFunction(() => Company.peers >= 1, null, { timeout: 90000 });
    console.log(name + ' peered after ' + (Date.now() - t0) + 'ms; zoom=' + await p.evaluate(() => Lab.zoom));
  };
  await Promise.all([ready(A.page, 'A'), ready(B.page, 'B')]);

  // A: count arrivals by wrapping the cached action's onMessage (same handle an abuser gets)
  await A.page.evaluate(() => {
    const a = Company.room.makeAction('cursor');
    const orig = a.onMessage; window.__msgs = 0; window.__noop = false;
    a.onMessage = (m, meta) => { window.__msgs++; if (!window.__noop) orig(m, meta); };
  });
  // B: the flood
  await B.page.evaluate(() => {
    window.__flood = async (perTick, tickMs, durMs) => {
      const a = Company.room.makeAction('cursor');
      const t0 = performance.now(); let n = 0;
      while (performance.now() - t0 < durMs) {
        for (let i = 0; i < perTick; i++) { a.send([n % 1000, (n * 7) % 1000]); n++; }
        await new Promise(r => setTimeout(r, tickMs));
      }
      return n;
    };
  });
  await sleep(2000);
  await A.page.bringToFront();

  const out = {};
  out.baseline = await A.page.evaluate(MEASURE, 3000);
  console.log('baseline', JSON.stringify({ ...stats(out.baseline.deltas), longTasks: out.baseline.longTasks, longMs: out.baseline.longMs, msgs: out.baseline.msgs, sw: out.baseline.sw, sh: out.baseline.sh }));

  const runs = [
    ['flood_1k',  10, 10, 4500, false],
    ['flood_5k',  50, 10, 4500, false],
    ['flood_max', 400, 0, 4500, false],
    ['flood_max_noop', 400, 0, 4500, true],
  ];
  for (const [label, perTick, tickMs, dur, noop] of runs) {
    await A.page.evaluate(v => { window.__noop = v; }, noop);
    const fl = B.page.evaluate(([p, t, d]) => window.__flood(p, t, d), [perTick, tickMs, dur]);
    await sleep(600);
    const m = await A.page.evaluate(MEASURE, 3000);
    const sent = await fl;
    out[label] = { ...stats(m.deltas), longTasks: m.longTasks, longMs: m.longMs, msgsIn3s: m.msgs, sent, cursors: m.cursors };
    console.log(label, JSON.stringify(out[label]));
    await sleep(1500);
  }
  await A.page.evaluate(() => { window.__noop = false; });

  // geometry: huge coordinates from B
  const geo = async (x, y) => {
    await B.page.evaluate(([x, y]) => Company.room.makeAction('cursor').send([x, y]), [x, y]);
    await sleep(400);
    return A.page.evaluate(() => {
      const el = document.querySelector('.company-cursor');
      return { sw: Lab.bench.scrollWidth, sh: Lab.bench.scrollHeight, sl: Lab.bench.scrollLeft, st: Lab.bench.scrollTop,
               tf: el ? getComputedStyle(el).transform : null, cursors: Company.cursors };
    });
  };
  out.geo_0 = await geo(0, 0);           console.log('geo (0,0)', JSON.stringify(out.geo_0));
  out.geo_50k = await geo(50000, 50000); console.log('geo (50000,50000)', JSON.stringify(out.geo_50k));
  out.geo_1e308 = await geo(1e308, 1e308); console.log('geo (1e308,1e308)', JSON.stringify(out.geo_1e308));
  out.geo_back = await geo(100, 100);    console.log('geo back (100,100)', JSON.stringify(out.geo_back));

  // micro: per-call cost of drive()'s three calls on a real cursor element, and of the JSON leg
  out.micro = await A.page.evaluate(() => {
    const layer = document.querySelector('.company');
    const el = document.createElement('div'); el.className = 'company-cursor'; el.style.setProperty('--c', '#c93b82');
    el.innerHTML = '<svg viewBox="0 0 24 24" width="24" height="24"><path d="M3 2.5v17.8l4.9-4.3 3.3 7.2 3-1.4-3.2-7h6.8z"/></svg>';
    layer.appendChild(el);
    const Z = Lab.zoom;
    const pose = (x, y) => 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px) scale(' + (1 / Z).toFixed(4) + ')';
    const anim = el.animate([{ transform: pose(0, 0) }, { transform: pose(1, 1) }], { duration: 70, fill: 'both', easing: 'linear' });
    const N = 3000;
    let t0 = performance.now();
    for (let i = 0; i < N; i++) { anim.effect.setKeyframes([{ transform: pose(i, i) }, { transform: pose(i + 1, i + 1) }]); anim.currentTime = 0; anim.play(); }
    const drive_us = (performance.now() - t0) / N * 1000;
    const dec = new TextDecoder(), bytes = new TextEncoder().encode('[123,456]');
    t0 = performance.now();
    for (let i = 0; i < N; i++) { JSON.parse(dec.decode(bytes)); }
    const json_us = (performance.now() - t0) / N * 1000;
    anim.cancel(); el.remove();
    return { drive_us: r => r, drive_us_per_call: Math.round(drive_us * 10) / 10, json_us_per_call: Math.round(json_us * 100) / 100 };
  });
  console.log('micro', JSON.stringify(out.micro));

  await A.browser.close(); await B.browser.close();
  require('fs').writeFileSync(__dirname + '/flood-results.json', JSON.stringify(out, (k, v) => k === 'deltas' ? undefined : v, 2));
  console.log('done');
})().catch(e => { console.error('FAILED', e); process.exit(1); });
