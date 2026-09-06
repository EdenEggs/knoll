/* lab2/perf/boot.js — what a first visitor sees, and when. A cold load (the
   browser cache off, so every byte is fetched as on a first visit), the
   camera left where the bench opens, and a timeline of the pieces of the
   opening view: the sign, the fonts, the kit sheets, the posters, the live
   parts, the tiles, the documents. Screenshots at 300 / 700 / 1500 / 3000 ms.
   USAGE (from site/): node lab2/perf/boot.js <label> [--viewport 2560x1111] */
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');
const label = process.argv[2] || 'boot';
const vp = (process.argv.find(a => a.startsWith('--viewport=')) || '--viewport=2560x1111').split('=')[1].split('x').map(Number);
const OUT = path.join(__dirname, 'results', 'boot-' + label);

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ channel: 'chrome', headless: false, args: ['--window-size=' + (vp[0] + 16) + ',' + (vp[1] + 110), '--window-position=0,0'] });
  const ctx = await browser.newContext({ viewport: { width: vp[0], height: vp[1] }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
  await page.route('**/_lab2/default', r => r.fulfill({ status: 404, body: 'no door' }));
  const reqs = [];
  page.on('response', r => reqs.push({ url: r.url().replace('http://localhost:4321/lab2/', ''), status: r.status(), t: Date.now() }));
  // the probe that runs inside the page from the very first script
  await page.addInitScript(() => {
    window.__boot = { t0: performance.timeOrigin, marks: {} };
    const mark = (k, v) => { if (!(k in window.__boot.marks)) window.__boot.marks[k] = Math.round(performance.now()) + (v ? ' ' + v : ''); };
    window.__mark = mark;
    document.addEventListener('DOMContentLoaded', () => mark('DOMContentLoaded'));
    window.addEventListener('load', () => mark('load'));
    // poll the things a visitor sees
    const poll = () => {
      try {
        if (document.fonts && document.fonts.check('16px Rye')) mark('font Rye');
        if (document.fonts && document.fonts.check('16px Sora')) mark('font Sora');
        if (window.Kits && Kits.stats && Kits.stats().sheets.length === 3) mark('kit sheets parsed');
        const live = document.querySelectorAll('.gz[data-kit] .gz-art > svg').length; if (live) mark('first live kit part', live);
        const tiles = document.querySelectorAll('#kit-layer canvas').length; if (tiles) mark('tiles up', tiles);
        const posters = [...document.querySelectorAll('.gz-poster img')].filter(i => i.complete && i.naturalWidth > 0).length; if (posters) mark('first poster shown', posters);
        const booted = document.querySelectorAll('.gz.booted').length; if (booted) mark('first document booted', booted);
        if (booted >= 3) mark('three documents booted', booted);
      } catch (e) {}
      if (performance.now() < 15000) requestAnimationFrame(poll);
    };
    requestAnimationFrame(poll);
  });
  const t0 = Date.now();
  const nav = page.goto('http://localhost:4321/lab2/', { waitUntil: 'commit' });
  // CDP's own capture, not page.screenshot(): Playwright's waits for the
  // page to settle, and a page still parsing would make every shot late
  const shots = [300, 700, 1500, 3000, 6000];
  for (const ms of shots) {
    const wait = t0 + ms - Date.now(); if (wait > 0) await new Promise(r => setTimeout(r, wait));
    try {
      const shot = await cdp.send('Page.captureScreenshot', { format: 'png', fromSurface: true });
      fs.writeFileSync(path.join(OUT, ms + 'ms.png'), Buffer.from(shot.data, 'base64'));
      console.log('  shot at', Date.now() - t0, 'ms');
    } catch (e) { console.log('  shot failed at', ms, e.message); }
  }
  await nav.catch(() => {});
  await page.waitForTimeout(500);
  const marks = await page.evaluate(() => window.__boot.marks);
  const zoom = await page.evaluate(() => ({ zoom: Lab.zoom, pan: Lab.pan, bench: (r => ({ w: r.width, h: r.height }))(Lab.bench.getBoundingClientRect()) }));
  console.log('viewport', vp.join('x'), 'opening camera', JSON.stringify(zoom));
  console.log('timeline (ms from navigation):');
  Object.entries(marks).sort((a, b) => parseInt(a[1]) - parseInt(b[1])).forEach(([k, v]) => console.log('  ' + String(v).padStart(12) + '  ' + k));
  const big = reqs.filter(r => r.status === 200).map(r => r.url).slice(0, 40);
  console.log('requests:', reqs.length, 'first 40:', big.join(' '));
  fs.writeFileSync(path.join(OUT, 'timeline.json'), JSON.stringify({ label, vp, zoom, marks, reqs }, null, 2));
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
