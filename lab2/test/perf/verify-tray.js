/* lab2/test/perf/verify-tray.js — the sticker tray on the sandbox bench
   USAGE (from site/, with the SANDBOX server up on 4322): node lab2/test/perf/verify-tray.js

   smoke-bench.js asks whether the bench boots and lands where data-open
   says. This asks the one question Phase 4 owes ADDING.md: does putting the
   WHOLE core sheet on the paper — forty more sections, in one go — cost the
   page anything? The answer has to be no, and "no" here is a number:
   Frames.panels.filter(p => p.loading).length is ZERO at the opening zoom
   and zero again at 20 %, because a kit part is a drawing and not a document
   (ADDING.md §5, plan §0.3). A section whose data-src kits.js does not
   recognise is the failure this catches: frames.js would fall back to an
   iframe and boot forty copies of a 223 K sheet, and the count would say 40.

   It also asks, in one boot:
     · zero console errors, zero page errors, every response under 400 —
       the blocked door excepted, as smoke-bench.js excepts it;
     · Kits.stats().parts === 48 and all forty tray sections carry data-kit,
       so the tray is kit records and not forty unrecognised boxes;
     · the opening zoom is the fit of data-open (±1 %), computed here the way
       WHERE IT OPENS computes it (24 px pad at 700 wide or over, 16 under,
       clamped to [0.02, 1]) — the proof the new rectangle was read;
     · every one of the forty is drawn: sprite on a tile or live svg, none
       missing, none clipped by its box (the drawn rect inside the section's);
     · the two per-section variants are on their sections and, if kits.js has
       learnt them, in the record: burst-round's data-palette (two roles) and
       banner's data-text.

   THE TRAY IS THEN FRAMED AND PHOTOGRAPHED at the fit of its own rectangle
   (0,900 to 1954,2075 — the tray alone, no caption, no stand, 56 px of pad
   as Lab.fit uses), so the picture is the forty stickers and nothing else and
   a colour or a gap can be judged by eye: perf/results/phase4/tray.png. The
   fit keeps 90 px more off the bottom and lifts the frame by half of it: the
   tool dock is 60 px tall and floats 24 off the bottom edge, and without the
   allowance it lies across the last row of stickers in the photograph.

   THE DOOR IS BLOCKED WIDE — page.route('**\/_lab2/**') → 404 — so keep.js
   goes quiet at its first knock and this run can never write the page it is
   reading. Headed system Chrome at 1600 × 1000 in a 1616 × 1110 window, DPR
   1: the numbers every bench measurement in this folder was taken at.
   Results: perf/results/phase4/tray.png and tray.json (CONTRACTS §11). */
'use strict';
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');

const URL = 'http://localhost:4322/lab2/test/';
const OUT = path.join(__dirname, 'results', 'phase4');
fs.mkdirSync(OUT, { recursive: true });

/* the tray's own rectangle, from index.html: eight columns 260 apart from
   x 0 and five rows 260 apart from y 900, each box 134 × 135. */
const TRAY = { x: 0, y: 900, w: 1954, h: 1175 };

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
  const isDoor = u => /\/_lab2\//.test(u || '');
  page.on('console', m => {
    if (m.type() !== 'error') return;
    const loc = (m.location() && m.location().url) || '';
    if (/Failed to load resource/.test(m.text()) && isDoor(loc)) return;   // the block below, working
    errors.push(m.text() + (loc ? ' @ ' + loc : ''));
  });
  page.on('pageerror', e => pageErrors.push(String(e)));
  page.on('requestfailed', r => failed.push(r.url()));
  page.on('response', r => { if (r.status() >= 400) notOk.push(r.status() + ' ' + r.url()); });
  await page.route('**/_lab2/**', r => r.fulfill({ status: 404, body: 'no' }));

  await page.goto(URL, { waitUntil: 'load' });
  await page.waitForFunction(() => window.Lab && window.Frames && window.Kits && Kits.stats().sheets.length === 4, null, { timeout: 30000 });
  await page.waitForTimeout(2500);

  const open = await page.evaluate(() => {
    const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
    const world = document.getElementById('bench-world');
    const b = Lab.bench.getBoundingClientRect();
    const phone = b.width < 700, pad = phone ? 16 : 24;
    const rect = (world.dataset[phone ? 'openNarrow' : 'open'] || '').split(',').map(Number);
    const tray = [...document.querySelectorAll('#bench .gz[id^="gz-sticker-"]')];
    const drawn = tray.map(el => {
      const art = el.querySelector('.gz-art > svg');
      const r = el.getBoundingClientRect();
      return { id: el.id, kit: el.dataset.kit || null, part: el.dataset.part || null, live: !!art, w: Math.round(r.width), h: Math.round(r.height) };
    });
    const rec = id => { let f = null; Kits.recs.forEach(r => { if (r.id === id) f = r; }); return f; };
    const bR = rec('gz-sticker-burst-round'), bn = rec('gz-sticker-banner');
    const caption = [...document.querySelectorAll('#gz-caption svg text')].map(t => Math.round(t.getComputedTextLength()));
    return {
      zoom: Lab.zoom, rect, bench: { w: b.width, h: b.height },
      expected: clamp(Math.min((b.width - pad * 2) / rect[2], (b.height - pad * 2) / rect[3]), 0.02, 1),
      kits: Kits.stats(), docs: Frames.panels.filter(p => p.loading).length,
      sections: document.querySelectorAll('#bench .gz').length,
      trayCount: tray.length, trayKits: drawn.filter(d => d.kit === 'stickers').length, drawn,
      variants: {
        paletteAttr: document.getElementById('gz-sticker-burst-round').dataset.palette || null,
        textAttr: document.getElementById('gz-sticker-banner').dataset.text || null,
        burstRoundRec: bR ? { part: bR.part, variant: bR.variant || null, grade: bR.grade } : null,
        bannerRec: bn ? { part: bn.part, variant: bn.variant || null, grade: bn.grade, live: !!bn.live } : null
      },
      caption
    };
  });

  check('no console errors', errors.length === 0, errors.length ? errors.slice(0, 5).join(' | ') : 'none');
  check('no page errors', pageErrors.length === 0, pageErrors.length ? pageErrors.slice(0, 5).join(' | ') : 'none');
  check('every response under 400 (the blocked door aside)', notOk.every(isDoor), notOk.length ? notOk.join(' | ') : 'none');
  check('48 kit sections, 40 of them the tray', open.kits.parts === 48 && open.trayCount === 40 && open.trayKits === 40,
        'parts=' + open.kits.parts + ' traySections=' + open.trayCount + ' trayKitRecords=' + open.trayKits + ' sections=' + open.sections);
  const dz = Math.abs(open.zoom - open.expected) / open.expected;
  check('the opening zoom is the fit of data-open (±1%)', dz <= 0.01,
        'zoom=' + open.zoom.toFixed(4) + ' expected=' + open.expected.toFixed(4) + ' rect=' + open.rect.join(',') + ' bench=' + open.bench.w + 'x' + open.bench.h);
  check('ZERO documents at the opening zoom', open.docs === 0, 'docs=' + open.docs);
  check('the two variants are on their sections', !!open.variants.paletteAttr && open.variants.textAttr === 'WISHLIST',
        'data-palette=' + open.variants.paletteAttr + '  data-text=' + open.variants.textAttr);

  /* 20 %: the far field, where every part is a sprite and ADDING.md §5's
     floor is measured. Lab.camTo with no glide, then a beat for the tiles. */
  await page.evaluate(() => { const b = Lab.bench.getBoundingClientRect(); Lab.camTo(0.20, b.width / 2, b.height / 2, 0); });
  await page.waitForTimeout(2000);
  const far = await page.evaluate(() => ({ zoom: Lab.zoom, kits: Kits.stats(), docs: Frames.panels.filter(p => p.loading).length }));
  check('ZERO documents at 20 %', far.docs === 0, 'docs=' + far.docs + ' zoom=' + far.zoom.toFixed(3) + ' tiles=' + far.kits.tiles + ' live=' + far.kits.live);

  /* the picture: the tray's own rectangle, framed the way Lab.fit frames
     the whole bench (56 px of pad) with 90 px more kept off the bottom for
     the tool dock, then two seconds for the tiles to be cut at the landed
     zoom. */
  const DOCK = 90;
  const shot = await page.evaluate(([T, DOCK]) => {
    const b = Lab.bench.getBoundingClientRect(), pad = 56;
    const z = Math.min((b.width - pad * 2) / T.w, (b.height - pad * 2 - DOCK) / T.h);
    Lab.camTo(z, (b.width - T.w * z) / 2 - T.x * z, (b.height - DOCK - T.h * z) / 2 - T.y * z, 0);
    return { z };
  }, [TRAY, DOCK]);
  await page.waitForTimeout(2500);
  const drawnAt = await page.evaluate(() => {
    const out = [...document.querySelectorAll('#bench .gz[id^="gz-sticker-"]')].map(el => {
      const r = el.getBoundingClientRect();
      return { id: el.id, x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), live: !!el.querySelector('.gz-art > svg') };
    });
    return { zoom: Lab.zoom, kits: Kits.stats(), docs: Frames.panels.filter(p => p.loading).length, boxes: out };
  });
  const onScreen = drawnAt.boxes.filter(b => b.x >= 0 && b.y >= 0 && b.x + b.w <= 1600 && b.y + b.h <= 1000).length;
  check('all forty stickers inside the shot', onScreen === 40, onScreen + '/40 wholly on screen at zoom ' + drawnAt.zoom.toFixed(3));
  await page.screenshot({ path: path.join(OUT, 'tray.png') });

  fs.writeFileSync(path.join(OUT, 'tray.json'), JSON.stringify({
    date: new Date().toISOString(), url: URL, viewport: '1600x1000', tray: TRAY,
    open, far, shot: { zoom: drawnAt.zoom, docs: drawnAt.docs, kits: drawnAt.kits, boxes: drawnAt.boxes },
    captionTextWidths: open.caption,
    consoleErrors: errors, pageErrors, requestsFailed: failed, responsesNotOk: notOk, checks: results
  }, null, 2));
  console.log('caption text widths (px): ' + open.caption.join(', '));
  console.log('grades at the opening zoom: ' + JSON.stringify(open.kits));
  console.log('screenshot → ' + path.join(OUT, 'tray.png'));
  await browser.close();
  const bad = results.filter(r => !r.ok).length;
  console.log(bad ? bad + ' FAILED' : 'ALL PASS');
  process.exit(bad ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
