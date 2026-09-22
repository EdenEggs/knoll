/* lab2/test/perf/smoke-bench.js — does the sandbox bench boot?
   USAGE (from site/, with serve.js up on 4321): node lab2/test/perf/smoke-bench.js

   The sandbox bench (lab2/test/index.html) is lab 2's runtime on a page of
   its own, and this is the first thing run against it: open it in headed
   Chrome (the same launch every lab2/perf/*.js uses — system Chrome, headed,
   because the hidden pane has no rAF and measures nothing), block every
   door, and ask five things of it. Zero console errors and zero page errors,
   because a bench that logs is a bench that is broken somewhere it has not
   said. Kits.stats().parts === 48, the five forest and three village sections
   of the stand plus the forty of the sticker tray — a forty-ninth would be a
   copy leaking in from localStorage, a forty-seventh a section kits.js did
   not recognise. (It was 8 until Phase 4 filled the tray; the sheets it waits
   for went 3 → 4 with it, since kits.js fetches every sheet in SHEETS at boot
   whether or not a section asks for it.) A tile or a live part drawn,
   because a stand that neither painted a sprite nor lifted a part is a stand
   that did not load its sheets. And the zoom: WHERE IT OPENS in lab.js now
   reads data-open off #bench-world, and the proof it read it is that
   Lab.zoom is the fit of THAT rectangle — computed here the way lab.js
   computes it (24 px pad on a bench 700 or wider, 16 under, clamped to
   [0.02, 1]) — within 1%, which is room for the header to have reflowed a
   line between lab.js's cached bench box and this measurement, and no room
   for the wrong rectangle: the main bench's literal lands at a different
   number altogether.

   THE DOOR IS BLOCKED, and blocked wide: page.route('**\/_lab2/**') answers
   404 to everything under /_lab2/, so keep.js goes quiet at its first knock.
   On 4321 that door is the LIVE bench's — serve.js writes lab2/index.html
   through it — and a sandbox page that reached it would be writing its
   sections into the live file. The block is what makes running this against
   the owner's server safe; without it, do not.

   Viewport 1600 × 1000 with a 1616 × 1110 window, as lab2/perf/verify.js:
   the same numbers every bench measurement was taken at. Two seconds after
   the sheets are in is the same settle verify.js gives the kits (1.5 s
   there, rounded up, since the first tile cut waits on a 'lab:still').
   Results: perf/results/phase0/bench.png and summary.json (CONTRACTS §11). */
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');

const URL = 'http://localhost:4321/lab2/test/';
const OUT = path.join(__dirname, 'results', 'phase0');
fs.mkdirSync(OUT, { recursive: true });

const results = [];
const check = (name, ok, info) => {
  results.push({ name, ok: !!ok, info: info === undefined ? '' : String(info) });
  console.log((ok ? 'PASS ' : 'FAIL ') + name + (info !== undefined ? ' — ' + info : ''));
};

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: false, args: ['--window-size=1616,1110', '--window-position=0,0'] });
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errors = [], pageErrors = [], failed = [], notOk = [];
  /* A console error names its source: a resource that answered 4xx/5xx is
     reported with the URL the browser attached to the line, and the door's
     own 404 — the one this script MAKES, by blocking /_lab2/ — is the one
     expected error and is listed on its own rather than counted. Anything
     else that answers 404 is a broken path on the page and fails the run. */
  const isDoor = u => /\/_lab2\//.test(u || '');
  page.on('console', m => {
    if (m.type() !== 'error') return;
    const loc = (m.location() && m.location().url) || '';
    const line = m.text() + (loc ? ' @ ' + loc : '');
    if (/Failed to load resource/.test(m.text()) && isDoor(loc)) return;   // the block below, working
    errors.push(line);
  });
  page.on('pageerror', e => pageErrors.push(String(e)));
  page.on('requestfailed', r => failed.push(r.url()));
  page.on('response', r => { if (r.status() >= 400) notOk.push(r.status() + ' ' + r.url()); });
  await page.route('**/_lab2/**', r => r.fulfill({ status: 404, body: 'no' }));

  const t0 = Date.now();
  await page.goto(URL, { waitUntil: 'load' });
  const loadMs = Date.now() - t0;
  await page.waitForFunction(() => window.Lab && window.Frames && window.Kits && Kits.stats().sheets.length === 4, null, { timeout: 20000 });
  const sheetsMs = Date.now() - t0;
  await page.waitForTimeout(2000);

  const st = await page.evaluate(() => {
    const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
    const world = document.getElementById('bench-world');
    const b = Lab.bench.getBoundingClientRect();
    const phone = b.width < 700, pad = phone ? 16 : 24;
    const rect = (world.dataset[phone ? 'openNarrow' : 'open'] || world.dataset.open || '').split(',').map(Number);
    const [x, y, w, h] = rect;
    const expected = clamp(Math.min((b.width - pad * 2) / w, (b.height - pad * 2) / h), 0.02, 1);
    const kits = Kits.stats();
    return {
      kits, zoom: Lab.zoom, expected, rect, bench: { w: b.width, h: b.height }, phone,
      sections: document.querySelectorAll('#bench .gz').length,
      kitSections: document.querySelectorAll('#bench .gz[data-kit]').length,
      liveSvgs: document.querySelectorAll('.gz[data-kit] .gz-art > svg').length,
      tileCanvases: document.querySelectorAll('#kit-layer canvas').length,
      docs: Frames.panels.filter(p => p.loading).length,
      caption: !!document.querySelector('#gz-caption .gz-art > svg text'),
      keepPill: (() => { const k = document.getElementById('lab-keep'); return k ? !k.hidden : null; })()
    };
  });

  check('no console errors', errors.length === 0, errors.length ? errors.slice(0, 5).join(' | ') : 'none');
  check('no page errors', pageErrors.length === 0, pageErrors.length ? pageErrors.slice(0, 5).join(' | ') : 'none');
  check('Kits.stats().parts === 48', st.kits.parts === 48, 'parts=' + st.kits.parts + ' kitSections=' + st.kitSections + ' sections=' + st.sections);
  check('a kit part is drawn (tiles > 0 || live > 0)', st.kits.tiles > 0 || st.kits.live > 0,
        'tiles=' + st.kits.tiles + ' live=' + st.kits.live + ' sway=' + st.kits.sway + ' full=' + st.kits.full + ' sprites=' + st.kits.sprites + ' liveSvgs=' + st.liveSvgs + ' canvases=' + st.tileCanvases);
  const dz = Math.abs(st.zoom - st.expected) / st.expected;
  check('Lab.zoom is the fit of data-open (±1%)', dz <= 0.01,
        'zoom=' + st.zoom.toFixed(4) + ' expected=' + st.expected.toFixed(4) + ' (' + (dz * 100).toFixed(2) + '% off) rect=' + st.rect.join(',') + ' bench=' + st.bench.w + 'x' + st.bench.h);

  await page.screenshot({ path: path.join(OUT, 'bench.png') });
  const summary = {
    date: new Date().toISOString(), url: URL, viewport: '1600x1000', loadMs, sheetsMs,
    kits: st.kits, zoom: st.zoom, expected: st.expected, rect: st.rect, bench: st.bench,
    sections: st.sections, kitSections: st.kitSections, liveSvgs: st.liveSvgs, tileCanvases: st.tileCanvases,
    docs: st.docs, caption: st.caption, keepPill: st.keepPill,
    consoleErrors: errors, pageErrors, requestsFailed: failed, responsesNotOk: notOk, checks: results
  };
  fs.writeFileSync(path.join(OUT, 'summary.json'), JSON.stringify(summary, null, 2));
  console.log('load ' + loadMs + ' ms, sheets in at ' + sheetsMs + ' ms; docs=' + st.docs + ' caption=' + st.caption + ' keepPill=' + st.keepPill + ' failed requests=' + (failed.length ? failed.join(' ') : 'none'));
  console.log('responses >= 400: ' + (notOk.length ? notOk.join(' | ') : 'none') + (notOk.every(isDoor) ? ' (the blocked door only)' : ''));
  console.log('screenshot → ' + path.join(OUT, 'bench.png'));
  await browser.close();
  const bad = results.filter(r => !r.ok).length;
  console.log(bad ? bad + ' FAILED' : 'ALL PASS');
  process.exit(bad ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
