/* lab2/perf/probe-idle.js — where does the STANDING frame cost come from?

   measure.js found (2026-09-04 baseline) that the rAF cadence during a pan is
   the same as the cadence with the camera still — at 35% the bench runs at
   ~16fps doing nothing. So the lag is not the scroll; it is whatever the warm
   documents cost every frame. This probe attributes that cost: at each camera
   it samples 1.5s of idle rAF deltas under a set of REVERSIBLE conditions,
   undoing each before the next:

     asis          nothing touched
     treeSwayOff   the forest SVG roots' sway animation paused (the root is
                   the one thing bare.css's crowd rule does NOT pause)
     treeFilterOff the forest roots' drop-shadow filter removed, sway running
     treeBoth      sway paused AND filter removed on the forest roots
     allAnimOff    every animation in every document paused
     treesHidden   every forest iframe visibility:hidden (layout kept)
     framesHidden  every iframe visibility:hidden — the bench page alone

   usage:  node lab2/perf/probe-idle.js [--cams z100,z35,z50]
   writes  lab2/perf/results/probe-idle.json and prints a table.
   Read-only on site/: the door is 404'd as in measure.js; styles are injected
   into the live documents and removed again, nothing is saved. */
'use strict';

const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');

const PAGE = 'http://localhost:4321/lab2/';
const HERE = __dirname;
const CAMS = [
  { key: 'z100', zoom: 1.00, cx: 2300, cy: -1200 },
  { key: 'z50',  zoom: 0.50, cx: 1400, cy: -900 },
  { key: 'z35',  zoom: 0.35, cx: 1000, cy: -600 },
];
const SAMPLE_MS = 1500;
const argv = process.argv.slice(2);
const i = argv.indexOf('--cams');
const only = i >= 0 ? argv[i + 1].split(',') : null;
const cams = only ? CAMS.filter(c => only.includes(c.key)) : CAMS;

const r1 = x => Math.round(x * 10) / 10;
function stats(d) {
  const a = d.slice().sort((x, y) => x - y);
  const q = p => a.length ? a[Math.min(a.length - 1, Math.floor(p * a.length))] : 0;
  const sum = a.reduce((s, x) => s + x, 0);
  return { n: a.length, median: r1(q(0.5)), p90: r1(q(0.9)), max: r1(a.length ? a[a.length - 1] : 0), fps: r1(a.length && sum ? a.length / (sum / 1000) : 0) };
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
  let last = '', since = t0;
  const tick = () => {
    const sig = document.querySelectorAll('.gz.booted').length + '/' + document.querySelectorAll('iframe[src]').length;
    const now = performance.now();
    if (sig !== last) { last = sig; since = now; }
    if (now - since >= quiet) return resolve({ ms: Math.round(now - t0), settled: true });
    if (now - t0 >= cap) return resolve({ ms: Math.round(now - t0), settled: false });
    setTimeout(tick, 100);
  };
  tick();
});
const IDLE = ms => new Promise(resolve => {
  const d = []; let last = 0; const t0 = performance.now();
  const step = now => { if (last) d.push(now - last); last = now; if (now - t0 < ms) requestAnimationFrame(step); else resolve(d); };
  requestAnimationFrame(step);
});
const COUNTS = () => {
  const panels = window.Frames.panels;
  let crowdDocs = 0, pausedDocs = 0, treeDocs = 0, treeWarm = 0;
  document.querySelectorAll('iframe').forEach(f => {
    const sec = f.closest('.gz'), tree = sec && /forest\.dc\.html/.test(sec.dataset.src || '');
    if (tree) treeDocs++;
    try {
      const h = f.contentDocument && f.contentDocument.documentElement;
      if (!h) return;
      if (h.hasAttribute('data-lab-crowd')) crowdDocs++;
      if (h.hasAttribute('data-lab-paused')) pausedDocs++;
      if (tree && !sec.classList.contains('gz-cold')) treeWarm++;
    } catch (e) {}
  });
  return { warm: panels.filter(p => p.cold === false && p.src).length, crowdDocs, pausedDocs, treeDocs, treeWarm, zoom: window.Lab.zoom };
};
// apply a condition: inject a style into the chosen documents, or hide iframes
const APPLY = ({ cond }) => {
  const trees = f => { const s = f.closest('.gz'); return s && /forest\.dc\.html/.test(s.dataset.src || ''); };
  const docsOf = which => [...document.querySelectorAll('iframe')].filter(f => which === 'all' || trees(f)).map(f => { try { return f.contentDocument; } catch (e) { return null; } }).filter(Boolean);
  const inject = (which, css) => docsOf(which).forEach(d => { const st = d.createElement('style'); st.id = '__probe'; st.textContent = css; d.documentElement.appendChild(st); });
  const hide = which => [...document.querySelectorAll('iframe')].filter(f => which === 'all' || trees(f)).forEach(f => { f.dataset.probeVis = f.style.visibility || ''; f.style.visibility = 'hidden'; });
  switch (cond) {
    case 'asis': break;
    case 'treeSwayOff': inject('trees', 'svg{animation-play-state:paused!important}'); break;
    case 'treeFilterOff': inject('trees', 'svg{filter:none!important}'); break;
    case 'treeBoth': inject('trees', 'svg{animation-play-state:paused!important;filter:none!important}'); break;
    case 'allAnimOff': inject('all', '*,*::before,*::after{animation-play-state:paused!important}'); break;
    case 'treesHidden': hide('trees'); break;
    case 'framesHidden': hide('all'); break;
  }
  return true;
};
const UNDO = () => {
  document.querySelectorAll('iframe').forEach(f => {
    try { const d = f.contentDocument; if (d) d.querySelectorAll('#__probe').forEach(s => s.remove()); } catch (e) {}
    if ('probeVis' in f.dataset) { f.style.visibility = f.dataset.probeVis; delete f.dataset.probeVis; }
  });
  return true;
};
const CONDS = ['asis', 'treeSwayOff', 'treeFilterOff', 'treeBoth', 'allAnimOff', 'treesHidden', 'framesHidden', 'asis'];

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: false, args: ['--window-size=1616,1110', '--window-position=0,0'] });
  const context = await browser.newContext({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  await page.route('**/_lab2/**', r => r.fulfill({ status: 404, body: 'no door' }));
  await page.goto(PAGE, { waitUntil: 'load' });
  await page.waitForFunction(() => window.Lab && window.Frames, null, { timeout: 25000 });
  await page.evaluate(SETTLE, { quiet: 2000, cap: 25000 });

  const out = { when: new Date().toISOString(), sampleMs: SAMPLE_MS, cams: [] };
  for (const c of cams) {
    await page.evaluate(LOOK, { z: c.zoom, wx: c.cx, wy: c.cy });
    await page.evaluate(SETTLE, { quiet: 1200, cap: 20000 });
    const counts = await page.evaluate(COUNTS);
    const row = { ...c, counts, conds: {} };
    console.log(`${c.key}: warm ${counts.warm} (trees ${counts.treeWarm}/${counts.treeDocs}) crowdDocs ${counts.crowdDocs} pausedDocs ${counts.pausedDocs}`);
    for (const cond of CONDS) {
      await page.evaluate(APPLY, { cond });
      await page.waitForTimeout(400);                 // let the style change land
      const st = stats(await page.evaluate(IDLE, SAMPLE_MS));
      await page.evaluate(UNDO);
      await page.waitForTimeout(300);
      row.conds[cond === 'asis' && row.conds.asis ? 'asisAgain' : cond] = st;
      console.log(`   ${cond.padEnd(14)} median ${String(st.median).padStart(5)}  p90 ${String(st.p90).padStart(5)}  max ${String(st.max).padStart(5)}  fps ${st.fps}`);
    }
    out.cams.push(row);
  }
  fs.writeFileSync(path.join(HERE, 'results', 'probe-idle.json'), JSON.stringify(out, null, 2));
  console.log('wrote lab2/perf/results/probe-idle.json');
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
