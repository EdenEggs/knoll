/* lab2/perf/measure.js — the pan-lag harness for lab 2.

   USAGE (run from C:/Users/bobb9/Desktop/site so require('playwright') resolves
   from Desktop/node_modules; serve.js must already be up on :4321):

       node lab2/perf/measure.js <label> [--scenarios z400,lockup166,z100,z50,z35,z25,z20]
                                         [--drive scroll|panby] [--keep-open]

   <label>       names the output folder: lab2/perf/results/<label>/
                 (summary.json + one <scenario>.png per scenario)
   --scenarios   comma list of scenario keys to run (default: all seven)
   --drive       how the pan is driven, see THE TWO DRIVERS below (default: scroll)
   --keep-open   leave Chrome open when done, for a look around

   Compare two runs by reading results/<a>/summary.json against results/<b>/:
   the `scenarios[].pan` block is the number (median / p90 / p95 / max / over34 /
   over50 of the rAF deltas during the 4s out-and-back), `idle` is the same
   machine doing nothing at the same camera, and `counts`/`cdp` say how much of
   the bench was warm when the pan ran.

   WHAT IT DOES
   1. Launches SYSTEM Chrome, headed (GPU-composited — headless is not
      representative of the bench), viewport 1600x1000 at deviceScaleFactor 1.
      The window is opened a little larger than the viewport so Chrome's own
      toolbar never crops the emulated 1600x1000 page (outer size is recorded).
   2. Blocks the autosave door (/_lab2/** → 404) BEFORE the page loads, so
      keep.js hears "no door" on its first knock, never sets `live`, and so
      never POSTs — not on its 30s tick and not on pagehide when the browser
      closes. Every request that touched /_lab2/ is listed in summary.json.
      This script never starts a server.
   3. Loads /lab2/ in a FRESH context (no saved camera or positions — the bench
      opens where index.html says), waits for window.Lab + window.Frames, then
      for the count of booted panels (.gz.booted) to stop growing for 2s
      (cap 25s).
   4. For each scenario: look(zoom, wx, wy) centres a world point at a zoom with
      NO animation (Lab.camTo(z, px, py, 0)), waits for 'lab:still' (fallback
      timeout if the camera did not actually move and so never says still),
      then for boots/tiers to settle (booted + iframe[src] counts unchanged for
      1.2s, cap 20s). Then it samples 1s of idle rAF deltas as a reference,
      snapshots the counts (warm panels, iframes, DOM nodes, JS heap, CDP
      Performance metrics), pans <pan>px right over 2s and back over 2s
      recording every rAF delta in-page, snapshots the CDP counters again
      (delta = what the pan cost), waits for still + settle, and takes a
      screenshot.
   5. Writes summary.json and prints a compact table.

   THE TWO DRIVERS
   'scroll' (the default): an in-page rAF loop writes bench.scrollLeft each
     frame — a native scroll, the thing lab.js's camera is built on since
     2026-09-03. The position is set from elapsed time (start + v*elapsed,
     clamped to the leg) rather than accumulated += v*dt, so the distance
     covered is exact whatever frames are dropped. NOTE: a scripted scrollLeft
     write is heard by lab.js's 'scroll' listener, which adopts PX/PY but does
     NOT call noteMove() — so Lab.moving() stays false and frames.js does NOT
     hold tier changes (boots, cold/warm flips, un-pausing) mid-pan the way it
     does for a fast wheel or hand pan. Treat 'scroll' as the raw
     scroll-container cost WITH frames.js flushing as it goes — which is also
     exactly what a slow (< 350px/s) hand pan pays.
   'panby': the same loop calls Lab.panBy(dx, 0) — the path the wheel and the
     hand take (applyCam → bench.scrollTo + noteMove), so Lab.moving() is true
     while the pan is fast and frames.js holds its chores until 'lab:still'.
     This is the user's fast pan. `pan.movingFrames` in the summary counts the
     frames on which Lab.moving() answered yes, so the two drives can be told
     apart after the fact.

   A pan is capped to the scrollable range that remains in its direction (the
   room is sized to exactly what clampCam allows), and panRequested vs
   panActual are both recorded, so a scenario that runs into the rail says so
   (a * in the table) instead of fighting the clamp.

   DETERMINISM: fresh browser context every run (no saved camera, no saved
   positions), fixed viewport and DPR, fixed scenario list and order, time-based
   pan position, and settle waits keyed on the page's own signals rather than
   sleeps alone. Numbers still move with the machine's load — run twice before
   trusting a difference under ~20%, and compare `idle` first: if idle moved,
   the machine did.
*/
'use strict';

const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');

const SITE = 'http://localhost:4321/';
const PAGE = SITE + 'lab2/';
const HERE = __dirname;

const SCENARIOS = [
  { key: 'z400',      name: 'lockup @400%', zoom: 4.00, cx: 2300, cy: -1200, pan: 800 },
  { key: 'lockup166', name: 'lockup @166%', zoom: 1.66, cx: 2300, cy: -1200, pan: 1200 },
  { key: 'z100',      name: 'lockup @100%', zoom: 1.00, cx: 2300, cy: -1200, pan: 1500 },
  { key: 'z50',       name: 'field @50%',   zoom: 0.50, cx: 1400, cy: -900,  pan: 2000 },
  { key: 'z35',       name: 'field @35%',   zoom: 0.35, cx: 1000, cy: -600,  pan: 2500 },
  { key: 'z25',       name: 'field @25%',   zoom: 0.25, cx: 800,  cy: 0,     pan: 3000 },
  { key: 'z20',       name: 'field @20%',   zoom: 0.20, cx: 800,  cy: 0,     pan: 3500 },
];
const LEG_MS = 2000;          // one leg of the pan: out over 2s, back over 2s
const IDLE_MS = 1000;         // idle rAF reference before each pan
const VIEW = { width: 1600, height: 1000 };
const WINDOW = { width: 1616, height: 1110 };   // viewport + Chrome's own frame; the displays here are 2560x1440

// ── args ────────────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
const opt = (name, dflt) => {
  const i = argv.indexOf('--' + name);
  if (i < 0) return dflt;
  const v = argv[i + 1];
  return v && !v.startsWith('--') ? v : true;
};
// the label is the first bare word that is not the value of a --flag
const label = argv.find((a, i) => !a.startsWith('--') && !(i > 0 && argv[i - 1].startsWith('--') && argv[i - 1] !== '--keep-open'));
if (!label) {
  console.error('usage: node lab2/perf/measure.js <label> [--scenarios a,b] [--drive scroll|panby] [--keep-open]');
  process.exit(2);
}
const only = opt('scenarios', null);
const drive = String(opt('drive', 'scroll')).toLowerCase() === 'panby' ? 'panby' : 'scroll';
const keepOpen = argv.includes('--keep-open');
const wanted = only ? SCENARIOS.filter(s => only.split(',').map(x => x.trim()).includes(s.key)) : SCENARIOS;
if (!wanted.length) { console.error('no scenario matched --scenarios ' + only + '; keys: ' + SCENARIOS.map(s => s.key).join(',')); process.exit(2); }

const outDir = path.join(HERE, 'results', label);
fs.mkdirSync(outDir, { recursive: true });

// ── helpers ─────────────────────────────────────────────────────────────
const r1 = x => Math.round(x * 10) / 10;
const mb = b => Math.round(b / 1048576 * 10) / 10;

function stats(deltas) {
  const a = deltas.slice().sort((x, y) => x - y);
  const q = p => a.length ? a[Math.min(a.length - 1, Math.floor(p * a.length))] : 0;
  const sum = a.reduce((s, x) => s + x, 0);
  return {
    n: a.length,
    ms: r1(sum),
    median: r1(q(0.5)), p90: r1(q(0.9)), p95: r1(q(0.95)), max: r1(a.length ? a[a.length - 1] : 0),
    mean: r1(a.length ? sum / a.length : 0),
    over34: a.filter(x => x > 34).length,
    over50: a.filter(x => x > 50).length,
    fps: r1(a.length && sum ? a.length / (sum / 1000) : 0),
  };
}

const CDP_KEYS = ['Documents', 'Frames', 'Nodes', 'JSEventListeners', 'JSHeapUsedSize', 'JSHeapTotalSize',
  'LayoutCount', 'RecalcStyleCount', 'LayoutDuration', 'RecalcStyleDuration', 'ScriptDuration', 'TaskDuration'];
async function cdpMetrics(cdp) {
  const { metrics } = await cdp.send('Performance.getMetrics');
  const o = {};
  for (const m of metrics) if (CDP_KEYS.includes(m.name)) o[m.name] = m.value;
  return o;
}
function cdpDelta(a, b) {
  const o = {};
  for (const k of ['LayoutCount', 'RecalcStyleCount']) o[k] = (b[k] || 0) - (a[k] || 0);
  for (const k of ['LayoutDuration', 'RecalcStyleDuration', 'ScriptDuration', 'TaskDuration']) o[k + 'Ms'] = r1(((b[k] || 0) - (a[k] || 0)) * 1000);
  return o;
}

// ── in-page code ────────────────────────────────────────────────────────
// everything below runs inside the page via page.evaluate

// counts the bench can report about itself
const SNAPSHOT = () => {
  const panels = window.Frames.panels;
  return {
    panels: panels.length,
    warm: panels.filter(p => p.cold === false && p.src).length,
    cold: document.querySelectorAll('.gz.gz-cold').length,
    booted: document.querySelectorAll('.gz.booted').length,
    stalled: document.querySelectorAll('.gz.stalled').length,
    iframes: document.querySelectorAll('iframe').length,
    iframesLoaded: document.querySelectorAll('iframe[src]').length,
    dom: document.querySelectorAll('*').length,
    gone: document.querySelectorAll('.gz[data-gone]').length,
    trees: document.querySelectorAll('.gz[data-src*="forest.dc.html"]:not([data-gone])').length,
    // frames.js writes data-lab-crowd / data-lab-paused onto each DOCUMENT's
    // <html> (bare.css reads them there), so count the documents that carry them
    ...(() => {
      let crowdDocs = 0, pausedDocs = 0;
      document.querySelectorAll('iframe').forEach(f => {
        try {
          const h = f.contentDocument && f.contentDocument.documentElement;
          if (!h) return;
          if (h.hasAttribute('data-lab-crowd')) crowdDocs++;
          if (h.hasAttribute('data-lab-paused')) pausedDocs++;
        } catch (e) {}
      });
      return { crowdDocs, pausedDocs };
    })(),
    usedJSHeap: (performance.memory && performance.memory.usedJSHeapSize) || null,
    zoom: window.Lab.zoom,
    pan: window.Lab.pan,
    scroll: { l: window.Lab.bench.scrollLeft, t: window.Lab.bench.scrollTop, w: window.Lab.bench.scrollWidth, cw: window.Lab.bench.clientWidth },
    centreWorld: (() => { const b = window.Lab.bench.getBoundingClientRect(); return window.Lab.toWorld(b.left + b.width / 2, b.top + b.height / 2); })(),
  };
};

// centre world (wx, wy) at zoom z with no animation, then wait for lab:still
// (or a fallback if the camera did not move and so never says still).
// screen = bench.top-left + P + world*Z, so P = half the bench - world*Z.
const LOOK = ({ z, wx, wy }) => new Promise(resolve => {
  const Lab = window.Lab, b = Lab.bench.getBoundingClientRect();
  let done = false;
  const finish = why => { if (done) return; done = true; document.removeEventListener('lab:still', onStill); resolve(why); };
  const onStill = () => finish('still');
  document.addEventListener('lab:still', onStill);
  const px = b.width / 2 - wx * z, py = b.height / 2 - wy * z;
  Lab.camTo(z, px, py, 0);
  setTimeout(() => finish('timeout'), 1500);
});

// boots/tiers settled: booted + loaded-iframe counts unchanged for `quiet` ms
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

// wait for lab:still, or give up after `ms` (a scroll-driven pan never says still)
const STILL = ms => new Promise(resolve => {
  let done = false;
  const fin = why => { if (!done) { done = true; resolve(why); } };
  document.addEventListener('lab:still', () => fin('still'), { once: true });
  setTimeout(() => fin('timeout'), ms);
});

// n ms of rAF deltas, touching nothing
const IDLE = ms => new Promise(resolve => {
  const d = [];
  let last = 0;
  const t0 = performance.now();
  const step = now => {
    if (last) d.push(now - last);
    last = now;
    if (now - t0 < ms) requestAnimationFrame(step); else resolve(d);
  };
  requestAnimationFrame(step);
});

// the pan: `dist` px right over legMs, then back over legMs, every rAF delta
// recorded. drive 'scroll' writes bench.scrollLeft; 'panby' calls Lab.panBy.
// movingFrames counts the frames on which Lab.moving() said yes.
const PAN = ({ dist, legMs, drive }) => new Promise(resolve => {
  const Lab = window.Lab, bench = Lab.bench;
  const start = bench.scrollLeft;
  const deltas = [], legs = [[], []];
  let last = 0, leg = 0, legT0 = 0, pos = start, movingFrames = 0, maxScroll = start;
  const put = want => {
    if (drive === 'panby') { const dx = want - pos; if (dx) Lab.panBy(-dx, 0); }
    else bench.scrollLeft = want;
    pos = want;
  };
  const step = now => {
    if (!legT0) legT0 = now;
    if (last) { const dt = now - last; deltas.push(dt); legs[leg].push(dt); }
    last = now;
    if (Lab.moving && Lab.moving()) movingFrames++;
    const el = now - legT0;
    const f = Math.min(1, el / legMs);
    put(leg === 0 ? start + dist * f : start + dist * (1 - f));
    if (bench.scrollLeft > maxScroll) maxScroll = bench.scrollLeft;
    if (f >= 1) {
      if (leg === 0) { leg = 1; legT0 = now; }
      else return resolve({ deltas, legs, start, end: bench.scrollLeft, reached: maxScroll, wanted: start + dist, movingFrames });
    }
    requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
});

// ── main ────────────────────────────────────────────────────────────────
(async () => {
  const t0 = Date.now();
  const browser = await chromium.launch({
    channel: 'chrome',
    headless: false,
    args: ['--window-size=' + WINDOW.width + ',' + WINDOW.height, '--window-position=0,0'],
  });
  const context = await browser.newContext({ viewport: VIEW, deviceScaleFactor: 1 });
  const page = await context.newPage();

  // NO AUTOSAVE, EVER: keep.js knocks on the door with a GET before it starts
  // and a 404 means "no door" — it then never POSTs, not even on pagehide.
  await page.route('**/_lab2/**', r => r.fulfill({ status: 404, body: 'no door' }));
  const doorKnocks = [];
  page.on('request', q => { if (q.url().includes('/_lab2/')) doorKnocks.push(q.method() + ' ' + q.url()); });
  const pageErrors = [];
  page.on('pageerror', e => pageErrors.push(String(e.message || e)));

  const cdp = await context.newCDPSession(page);
  await cdp.send('Performance.enable');

  const bootT0 = Date.now();
  await page.goto(PAGE, { waitUntil: 'load' });
  await page.waitForFunction(() => window.Lab && window.Frames, null, { timeout: 25000 });

  // booted panels stop growing for 2s (cap 25s); the first-second rAF
  // deltas are recorded too, so a run can say whether boot itself dropped
  // frames (it always will — that is the 3-at-a-time queue at work)
  const boot = await page.evaluate(() => new Promise(resolve => {
    const t0 = performance.now();
    const d = []; let lastF = 0;
    const raf = now => { if (lastF) d.push(now - lastF); lastF = now; if (now - t0 < 1000) requestAnimationFrame(raf); };
    requestAnimationFrame(raf);
    let last = -1, since = performance.now();
    const tick = () => {
      const n = document.querySelectorAll('.gz.booted').length, now = performance.now();
      if (n !== last) { last = n; since = now; }
      if (now - since >= 2000) return resolve({ booted: n, ms: Math.round(now - t0), capped: false, firstSecond: d });
      if (now - t0 >= 25000) return resolve({ booted: n, ms: Math.round(now - t0), capped: true, firstSecond: d });
      setTimeout(tick, 100);
    };
    tick();
  }));
  const bootFrames = stats(boot.firstSecond); delete boot.firstSecond;
  const bootSnap = await page.evaluate(SNAPSHOT);
  const bootMs = Date.now() - bootT0;
  const ua = await page.evaluate(() => navigator.userAgent);
  const screen = await page.evaluate(() => ({ w: screen.width, h: screen.height, dpr: devicePixelRatio, inner: [innerWidth, innerHeight], outer: [outerWidth, outerHeight] }));
  console.log(`[${label}] booted ${boot.booted} panels in ${bootMs}ms (quiet after ${boot.ms}ms${boot.capped ? ', CAPPED' : ''}); ` +
    `${bootSnap.panels} panels (${bootSnap.trees} standing trees), ${bootSnap.iframes} iframes, ${bootSnap.dom} nodes, drive=${drive}, inner ${screen.inner.join('x')} outer ${screen.outer.join('x')}`);

  const results = [];
  for (const s of wanted) {
    process.stdout.write(`  ${s.key.padEnd(10)} look…`);
    const looked = await page.evaluate(LOOK, { z: s.zoom, wx: s.cx, wy: s.cy });
    const settle = await page.evaluate(SETTLE, { quiet: 1200, cap: 20000 });
    const before = await page.evaluate(SNAPSHOT);
    const idle = stats(await page.evaluate(IDLE, IDLE_MS));
    const cdpBefore = await cdpMetrics(cdp);

    // cap the pan to the room that remains to the right (the scroll clamp)
    const room = before.scroll.w - before.scroll.cw - before.scroll.l;
    const dist = Math.max(0, Math.min(s.pan, Math.floor(room)));
    process.stdout.write(` pan ${dist}px…`);
    const pan = await page.evaluate(PAN, { dist, legMs: LEG_MS, drive });
    const cdpAfter = await cdpMetrics(cdp);
    const st = stats(pan.deltas);

    // settle again before the picture
    const stillAfter = await page.evaluate(STILL, 600);
    const afterSettle = await page.evaluate(SETTLE, { quiet: 1200, cap: 20000 });
    const afterSnap = await page.evaluate(SNAPSHOT);
    const shot = path.join(outDir, s.key + '.png');
    await page.screenshot({ path: shot, type: 'png' });

    const row = {
      key: s.key, name: s.name, zoom: s.zoom, centre: { x: s.cx, y: s.cy },
      panRequested: s.pan, panActual: dist, pxPerSec: r1(dist / (LEG_MS / 1000)), drive, legMs: LEG_MS,
      looked, settle, stillAfter, afterSettle,
      camera: { zoom: before.zoom, pan: before.pan, centreWorld: { x: Math.round(before.centreWorld.x), y: Math.round(before.centreWorld.y) }, scroll: before.scroll },
      counts: { panels: before.panels, trees: before.trees, warm: before.warm, cold: before.cold, booted: before.booted, stalled: before.stalled, iframes: before.iframes, iframesLoaded: before.iframesLoaded, dom: before.dom, gone: before.gone, crowdDocs: before.crowdDocs, pausedDocs: before.pausedDocs },
      countsAfter: { warm: afterSnap.warm, booted: afterSnap.booted, iframesLoaded: afterSnap.iframesLoaded, dom: afterSnap.dom, crowdDocs: afterSnap.crowdDocs, pausedDocs: afterSnap.pausedDocs },
      memory: { usedJSHeapMB: before.usedJSHeap == null ? null : mb(before.usedJSHeap), usedJSHeapAfterMB: afterSnap.usedJSHeap == null ? null : mb(afterSnap.usedJSHeap) },
      cdp: { Documents: cdpBefore.Documents, Frames: cdpBefore.Frames, Nodes: cdpBefore.Nodes, JSEventListeners: cdpBefore.JSEventListeners, JSHeapUsedMB: mb(cdpBefore.JSHeapUsedSize), JSHeapTotalMB: mb(cdpBefore.JSHeapTotalSize) },
      cdpAfter: { Documents: cdpAfter.Documents, Nodes: cdpAfter.Nodes, JSHeapUsedMB: mb(cdpAfter.JSHeapUsedSize) },
      cdpDuringPan: cdpDelta(cdpBefore, cdpAfter),
      idle,
      pan: { ...st, out: stats(pan.legs[0]), back: stats(pan.legs[1]), movingFrames: pan.movingFrames, scrollStart: pan.start, scrollReached: pan.reached, scrollWanted: pan.wanted, scrollEnd: pan.end },
      deltas: pan.deltas.map(r1),
      screenshot: path.relative(HERE, shot).replace(/\\/g, '/'),
    };
    results.push(row);
    console.log(` median ${st.median} p90 ${st.p90} p95 ${st.p95} max ${st.max} >34:${st.over34} >50:${st.over50} (${st.n} frames) warm ${before.warm} iframes ${before.iframes}`);
  }

  const summary = {
    label, drive, when: new Date().toISOString(), page: PAGE,
    chrome: (await browser.version()), userAgent: ua,
    viewport: { ...VIEW, deviceScaleFactor: 1 }, window: WINDOW, screen,
    headed: true, bootMs, boot, bootFirstSecondFrames: bootFrames, bootCounts: bootSnap,
    doorKnocks, pageErrors,
    scenarios: results,
    totalMs: Date.now() - t0,
  };
  fs.writeFileSync(path.join(outDir, 'summary.json'), JSON.stringify(summary, null, 2));

  // the table
  const cols = [['scenario', 10], ['zoom', 5], ['pan', 5], ['frames', 6], ['median', 6], ['p90', 6], ['p95', 6], ['max', 6], ['>34', 4], ['>50', 4], ['idle-med', 8], ['warm', 4], ['ifr', 4], ['dom', 6], ['nodes', 6], ['heapMB', 6], ['layouts', 7], ['taskMs', 6], ['moving', 6], ['crowd', 5], ['paused', 6]];
  const line = cells => cells.map((c, i) => String(c).padEnd(cols[i][1])).join('  ');
  console.log('');
  console.log(line(cols.map(c => c[0])));
  for (const r of results) {
    console.log(line([r.key, r.zoom, r.panActual + (r.panActual < r.panRequested ? '*' : ''), r.pan.n, r.pan.median, r.pan.p90, r.pan.p95, r.pan.max, r.pan.over34, r.pan.over50,
      r.idle.median, r.counts.warm, r.counts.iframes, r.counts.dom, r.cdp.Nodes, r.memory.usedJSHeapMB, r.cdpDuringPan.LayoutCount, r.cdpDuringPan.TaskDurationMs, r.pan.movingFrames, r.counts.crowdDocs, r.counts.pausedDocs]));
  }
  if (results.some(r => r.panActual < r.panRequested)) console.log('* pan capped at the rail (scroll range remaining to the right)');
  if (results.some(r => !r.settle.settled || !r.afterSettle.settled)) console.log('! a settle hit its 20s cap — see summary.json settle/afterSettle');
  if (doorKnocks.length) console.log('door knocks (all answered 404): ' + doorKnocks.join(', '));
  if (pageErrors.length) console.log('page errors: ' + pageErrors.length + ' — see summary.json');
  console.log('wrote ' + path.relative(process.cwd(), outDir).replace(/\\/g, '/') + '/summary.json in ' + Math.round((Date.now() - t0) / 1000) + 's');

  if (keepOpen) { console.log('--keep-open: leaving Chrome up; ctrl+c to end'); await new Promise(() => {}); }
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
