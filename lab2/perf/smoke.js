/* lab2/perf/smoke.js — open the bench in headed Chrome with the autosave
   door blocked, run a few looks, report console errors and the kits' state,
   save screenshots. USAGE (from site/): node lab2/perf/smoke.js [label]
   Screenshots → lab2/perf/results/smoke-<label>-*.png */
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');
const label = process.argv[2] || 'now';
const OUT = path.join(__dirname, 'results');

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: false, args: ['--window-size=1616,1110', '--window-position=0,0'] });
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errors = [], logs = [];
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') logs.push(m.type() + ': ' + m.text()); });
  page.on('pageerror', e => errors.push(String(e)));
  page.on('requestfailed', r => logs.push('requestfailed: ' + r.url()));
  const external = [];
  page.on('request', r => { const u = r.url(); if (!u.startsWith('http://localhost:4321') && !u.startsWith('data:') && !u.startsWith('blob:')) external.push(u); });
  await page.route('**/_lab2/default', r => r.fulfill({ status: 404, body: 'no door' }));
  const t0 = Date.now();
  await page.goto('http://localhost:4321/lab2/', { waitUntil: 'load' });
  console.log('load', Date.now() - t0, 'ms');
  await page.waitForFunction(() => window.Lab && window.Frames && window.Kits);
  await page.waitForTimeout(2500);

  const look = async (z, wx, wy, name, ms = 1800) => {
    await page.evaluate(([z, wx, wy]) => {
      const b = Lab.bench.getBoundingClientRect();
      Lab.camTo(z, b.width / 2 - wx * z, b.height / 2 - wy * z, 0);
    }, [z, wx, wy]);
    await page.waitForTimeout(ms);
    const st = await page.evaluate(() => ({
      kits: Kits.stats(), iframes: document.querySelectorAll('iframe[src]').length, panels: Frames.panels.length,
      warm: Frames.panels.filter(p => p.cold === false && p.src && !p.art).length,
      docs: Frames.panels.filter(p => p.loading).length, postered: document.querySelectorAll('.gz.gz-postered').length, posters: document.querySelectorAll('.gz-poster img').length,
      kitSections: document.querySelectorAll('.gz[data-kit]').length,
      liveSvgs: document.querySelectorAll('.gz[data-kit] .gz-art > svg').length,
      tiles: document.querySelectorAll('#kit-layer canvas').length, zoom: Lab.zoom
    }));
    await page.screenshot({ path: path.join(OUT, 'smoke-' + label + '-' + name + '.png') });
    console.log(name, JSON.stringify(st));
  };
  await look(0.35, 2300, -1200, 'open35');
  await look(1, 2300, -1200, 'lockup100');
  await look(1, 300, -1500, 'west100');
  await look(1.66, 2872, -2000, 'east166');
  await look(0.2, 800, 0, 'z20');
  await look(4, 2872, -1900, 'z400');
  console.log('page errors:', errors.length ? errors : 'none');
  console.log('console warnings/errors:', logs.length ? logs.slice(0, 20) : 'none');
  console.log('external requests:', external.length ? [...new Set(external)] : 'none');
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
