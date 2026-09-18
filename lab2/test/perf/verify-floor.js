/* lab2/test/perf/verify-floor.js — what the sticker tray costs the floor
   USAGE (from site/, with the SANDBOX server up on 4322):

       node lab2/test/perf/verify-floor.js [--keep-open]

   PRESS-TABLE-PLAN.md §0.3 makes two claims about the forty stickers on the
   sandbox bench, and this file is the attempt to refute them by measuring
   rather than by reading: THE PERF FLOOR HOLDS, and STICKERS ARE KIT PARTS,
   NEVER MACHINES. probe-stickers.js already answers the first one for a page
   of sixty stickers and nothing else; this asks it of the bench that ships,
   where the tray stands beside a caption prop and a stand of eight, and where
   the honest question is not "is it fast" but "what did the tray add".

   SO IT MEASURES THE SAME PAGE TWICE, WITH AND WITHOUT THE TRAY. It writes
   two fixtures from index.html itself — perf/fixtures/bench-tray.html is the
   file verbatim with a <base href="../../"> so its relative paths still reach
   two folders up, and bench-no-tray.html is the same file with the block
   between the two `▼ / ▲ THE STICKER TRAY` markers cut out. Nothing else
   differs, data-open included, so the difference between the two runs is the
   forty sections and not the page. The pair is only worth anything if the
   copy behaves like the original, so the real bench is measured first and the
   copy is held to it: same documents, same live count, same tiles, same
   sections, at every camera (CHECK 6).

   THE THREE CAMERAS, and why those:
     · 20 %  centred on the whole page (977, 1040) — ADDING.md §5's own zoom,
       where every part that can be a sprite is one and the document count is
       the number the floor rule names.
     · 100 % over the middle of the tray (977, 1487) — the stickers at their
       drawn size. On the no-tray page that is empty paper, which is the point.
     · 100 % over the stand (955, 587) — eight forest and village parts BOTH
       pages carry, so a camera that sees the same thing in both runs is in the
       run as a control; if the delta were the machine and not the tray, it
       would show up here too.
   The idle second and the four-second pan are measure.js's (LOOK / SETTLE /
   IDLE / PAN, copied — that file is outside the sandbox, as probe-stickers.js
   says at length), and so are the conventions: headed system Chrome, viewport
   1600 × 1000 at DPR 1, the door 404'd before the first byte so keep.js hears
   "no door" on its first knock and this file never writes anything.

   WHAT IT WILL FAIL ON:
     1–3 the floor itself: zero booted documents at every camera on both pages,
       no iframe anywhere, and every one of the forty sticker sections a kit
       part — data-kit, a .gz-art, no iframe of its own, and no data-live
       (ADDING.md §5 allows exactly two marked exceptions and the tray is not
       a third).
     4 the hard rule: computed filter / mix-blend-mode / backdrop-filter on
       #bench, #bench-world, #kit-layer, every section and every .gz-art must
       be none / normal. A filter INSIDE a part's own svg is allowed and is
       counted separately (the eight live text stickers carry the contract's
       root drop-shadow), so the allowance can never be mistaken for a breach.
     5 the Phase-4a trap, asked of the drawings: no TEXT NODE under
       #bench-world holds a `{{`, and no sc-interp span is on the paper. The
       tray's own HTML comments quote `{{ skPrimary }}` and `{{ skText }}`, so
       reading innerHTML would answer four and mean nothing — hence text nodes.
     6 the copy reproduces the bench (above).
     7 the cost: the tray's idle median may not stand more than HALF A FRAME
       (3 ms, half of the 6.1 ms slot this machine's display gives) above the
       no-tray page's at the same camera. Half a frame is the line for the same
       reason probe-stickers.js uses 1.5 × a floor: a page that has dropped to
       every-other-frame reads a whole slot higher, and half of one cannot be
       reached by cadence, only by work.
     8 quiet: no console error, no page error, no response ≥ 400 but the
       blocked door's own 404.

   Results: perf/results/floor/summary.json (CONTRACTS §11) — every camera's
   whole idle and pan distribution on both pages, the delta table, and the DOM
   answers. Written 2026-09-07 by the Phase-4 verification pass; the numbers it
   found that day are in press/CHANGELOG.md. */
'use strict';
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const HOME = path.resolve(__dirname, '..');                    // lab2/test
const FIX = path.join(__dirname, 'fixtures');                  // generated pages (gitignored)
const OUT = path.join(__dirname, 'results', 'floor');
const ORIGIN = 'http://localhost:4322';
const BENCH_URL = ORIGIN + '/lab2/test/';
const FIX_URL = p => ORIGIN + '/lab2/test/perf/fixtures/' + p;

const VIEW = { width: 1600, height: 1000 };
const WINDOW = { width: 1616, height: 1110 };                  // viewport + Chrome's own frame
const IDLE_MS = 1000;                                          // measure.js's idle reference
const LEG_MS = 2000;                                           // one leg of the out-and-back, measure.js's
const SLACK_MS = 3;                                            // half a frame slot — CHECK 7 in the header
const CAMERAS = [
  { key: 'z20',        zoom: 0.20, wx: 977, wy: 1040, pan: 3500, why: 'the whole page on screen' },
  { key: 'z100-tray',  zoom: 1.00, wx: 977, wy: 1487, pan: 1500, why: 'over the middle of the tray' },
  { key: 'z100-stand', zoom: 1.00, wx: 955, wy: 587,  pan: 1500, why: 'over the stand, which both pages carry' },
];
const DOM_CAMERAS = [                                          // where the DOM is asked its questions
  { key: 'opening',    zoom: null },                           // whatever data-open frames
  { key: 'z20',        zoom: 0.20, wx: 977, wy: 1040 },
  { key: 'z400-tray',  zoom: 4.00, wx: 977, wy: 1487 },
  { key: 'z400-stand', zoom: 4.00, wx: 955, wy: 587 },
];
const keepOpen = process.argv.includes('--keep-open');

// ── helpers, measure.js's ─────────────────────────────────────────────────
const r1 = x => Math.round(x * 10) / 10;
function stats(deltas) {
  const a = deltas.slice().sort((x, y) => x - y);
  const q = p => a.length ? a[Math.min(a.length - 1, Math.floor(p * a.length))] : 0;
  const sum = a.reduce((s, x) => s + x, 0);
  return { n: a.length, median: r1(q(0.5)), p90: r1(q(0.9)), p95: r1(q(0.95)),
    max: r1(a.length ? a[a.length - 1] : 0), mean: r1(a.length ? sum / a.length : 0),
    over34: a.filter(x => x > 34).length, over50: a.filter(x => x > 50).length };
}

/* THE TWO FIXTURES. index.html is read, not copied by hand: a <base> goes in
   after the charset line (the paths in it are relative to lab2/test/ and the
   fixture sits two folders down), and the tray is cut between its own markers.
   The markers are the ones keep.js's copies block uses elsewhere in the file,
   so if either is ever renamed this throws rather than measuring the wrong
   thing. */
const MARK_TOP = '  <!-- ▼ THE STICKER TRAY -->';
const MARK_END = '  <!-- ▲ THE STICKER TRAY -->';
function fixtures() {
  const src = fs.readFileSync(path.join(HOME, 'index.html'), 'utf8');
  const withBase = src.replace('<meta charset="utf-8">\n', '<meta charset="utf-8">\n<base href="../../">\n');
  if (withBase === src) throw new Error('index.html: no charset line to put the <base> after');
  const a = withBase.indexOf(MARK_TOP), b = withBase.indexOf(MARK_END);
  if (a < 0 || b < 0 || b < a) throw new Error('index.html: the tray markers moved (' + a + ', ' + b + ')');
  const noTray = withBase.slice(0, a) + withBase.slice(withBase.indexOf('\n', b) + 1);
  fs.mkdirSync(FIX, { recursive: true });
  fs.mkdirSync(path.join(FIX, 'posters'), { recursive: true });
  /* frames.js asks for posters/index.json beside the page before anything
     boots; two bytes keep the response log clean, as probe-stickers.js does. */
  if (!fs.existsSync(path.join(FIX, 'posters', 'index.json'))) fs.writeFileSync(path.join(FIX, 'posters', 'index.json'), '{}\n');
  fs.writeFileSync(path.join(FIX, 'bench-tray.html'), withBase);
  fs.writeFileSync(path.join(FIX, 'bench-no-tray.html'), noTray);
  const count = s => (s.match(/<section class="gz/g) || []).length;
  const stick = s => (s.match(/stickers-core\.dc\.html#part=/g) || []).length;
  return { tray: { file: 'bench-tray.html', sections: count(withBase), stickers: stick(withBase) },
           noTray: { file: 'bench-no-tray.html', sections: count(noTray), stickers: stick(noTray) } };
}

// ── in-page code, measure.js's ────────────────────────────────────────────
const LOOK = ({ z, wx, wy }) => new Promise(resolve => {
  const Lab = window.Lab, b = Lab.bench.getBoundingClientRect();
  let done = false;
  const finish = why => { if (done) return; done = true; document.removeEventListener('lab:still', onStill); resolve(why); };
  const onStill = () => finish('still');
  document.addEventListener('lab:still', onStill);
  Lab.camTo(z, b.width / 2 - wx * z, b.height / 2 - wy * z, 0);
  setTimeout(() => finish('timeout'), 1500);
});
/* the bench's settle signature plus the kit's: this page boots no documents at
   all, so `.gz.booted` on its own would say "settled" while forty sprites were
   still being rasterised (probe-stickers.js's sentence, and its reason). */
const SETTLE = ({ quiet, cap }) => new Promise(resolve => {
  const t0 = performance.now(); let last = '', since = performance.now();
  const tick = () => {
    const k = window.Kits && Kits.stats ? Kits.stats() : null;
    const sig = document.querySelectorAll('.gz.booted').length + '/' + document.querySelectorAll('iframe[src]').length +
      (k ? '/' + k.live + '/' + k.tiles + '/' + k.sprites : '');
    const now = performance.now();
    if (sig !== last) { last = sig; since = now; }
    if (now - since >= quiet) return resolve({ ms: Math.round(now - t0), settled: true, sig });
    if (now - t0 >= cap) return resolve({ ms: Math.round(now - t0), settled: false, sig });
    setTimeout(tick, 100);
  };
  tick();
});
const IDLE = ms => new Promise(resolve => {
  const d = []; let last = 0; const t0 = performance.now();
  const step = now => { if (last) d.push(now - last); last = now; if (now - t0 < ms) requestAnimationFrame(step); else resolve(d); };
  requestAnimationFrame(step);
});
const PAN = ({ dist, legMs }) => new Promise(resolve => {
  const Lab = window.Lab, bench = Lab.bench, start = bench.scrollLeft, deltas = [];
  let last = 0, leg = 0, legT0 = 0, maxScroll = start;
  const step = now => {
    if (!legT0) legT0 = now;
    if (last) deltas.push(now - last);
    last = now;
    const f = Math.min(1, (now - legT0) / legMs);
    bench.scrollLeft = leg === 0 ? start + dist * f : start + dist * (1 - f);
    if (bench.scrollLeft > maxScroll) maxScroll = bench.scrollLeft;
    if (f >= 1) { if (leg === 0) { leg = 1; legT0 = now; } else return resolve({ deltas, reached: maxScroll, wanted: start + dist }); }
    requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
});
const SNAP = () => ({
  kits: window.Kits && Kits.stats ? Kits.stats() : null,
  docs: window.Frames ? Frames.panels.filter(p => p.loading).length : -1,
  panels: window.Frames ? Frames.panels.length : -1,
  iframes: document.querySelectorAll('iframe').length,
  sections: document.querySelectorAll('#bench-world > section.gz').length,
  zoom: window.Lab.zoom,
  scroll: { l: Lab.bench.scrollLeft, w: Lab.bench.scrollWidth, cw: Lab.bench.clientWidth },
});
/* everything the DOM can be asked about the floor rule, in one pass. `bad` is
   the list of surfaces the compositor would have to filter that are NOT inside
   a part's drawing; `filtersInsideParts` is the allowed kind, counted so the
   two are never read as one number. */
const ASK = () => {
  const bad = [];
  const look = (el, what) => {
    if (!el) return;
    const cs = getComputedStyle(el);
    if (cs.filter && cs.filter !== 'none') bad.push(what + ' filter=' + cs.filter);
    if (cs.mixBlendMode && cs.mixBlendMode !== 'normal') bad.push(what + ' mix-blend-mode=' + cs.mixBlendMode);
    if (cs.backdropFilter && cs.backdropFilter !== 'none') bad.push(what + ' backdrop-filter=' + cs.backdropFilter);
  };
  const world = document.getElementById('bench-world');
  look(document.getElementById('bench'), '#bench');
  look(world, '#bench-world');
  look(document.getElementById('kit-layer'), '#kit-layer');
  const secs = Array.from(document.querySelectorAll('#bench-world section.gz'));
  secs.forEach(s => { look(s, 'section#' + s.id); look(s.querySelector('.gz-art'), s.id + ' > .gz-art'); });
  const stickers = secs.filter(s => (s.getAttribute('data-src') || '').indexOf('stickers-core') >= 0);
  // the trap, asked of TEXT NODES and not of innerHTML — the header says why
  const walk = document.createTreeWalker(world, NodeFilter.SHOW_TEXT);
  const braces = []; let n, textNodes = 0;
  while ((n = walk.nextNode())) { textNodes++; if (n.nodeValue.indexOf('{{') >= 0) braces.push((n.parentNode.nodeName || '?') + ': ' + n.nodeValue.trim().slice(0, 60)); }
  return {
    zoom: window.Lab.zoom,
    docs: window.Frames.panels.filter(p => p.loading).length,
    iframes: document.querySelectorAll('iframe').length,
    sections: secs.length,
    stickers: stickers.length,
    stickerIframes: stickers.filter(s => s.querySelector('iframe')).map(s => s.id),
    notKit: stickers.filter(s => !s.hasAttribute('data-kit')).map(s => s.id),
    noArt: stickers.filter(s => !s.querySelector('.gz-art')).map(s => s.id),
    dataLive: secs.filter(s => s.hasAttribute('data-live')).map(s => s.id),
    bad,
    textNodes, braces,
    interpSpans: document.querySelectorAll('#bench-world .sc-interp').length,
    partTexts: Array.from(document.querySelectorAll('#bench-world section.gz[data-kit] .gz-art svg text')).map(t => (t.textContent || '').trim()),
    filtersInsideParts: Array.from(document.querySelectorAll('#bench-world section.gz > .gz-art > svg'))
      .filter(s => /filter:/.test(s.getAttribute('style') || '')).length,
    live: Kits.stats().live,
  };
};

// ── the run ───────────────────────────────────────────────────────────────
let pass = 0, fail = 0;
const checks = [];
function check(what, ok, detail) {
  checks.push({ what, ok: !!ok, detail: detail || '' });
  console.log((ok ? 'PASS ' : 'FAIL ') + what + (detail ? ' — ' + detail : ''));
  if (ok) pass++; else fail++;
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const built = fixtures();
  console.log('fixtures: bench-tray.html ' + built.tray.sections + ' sections / ' + built.tray.stickers + ' stickers, ' +
    'bench-no-tray.html ' + built.noTray.sections + ' / ' + built.noTray.stickers);

  const browser = await chromium.launch({ channel: 'chrome', headless: false,
    args: ['--window-size=' + WINDOW.width + ',' + WINDOW.height, '--window-position=0,0'] });

  async function open(url) {
    const ctx = await browser.newContext({ viewport: VIEW, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    await page.route('**/_lab2/**', r => r.fulfill({ status: 404, body: 'no door' }));
    const errors = [], pageErrors = [], notOk = [];
    /* the blocked door's own 404 arrives as a console error carrying the
       door's URL — smoke-bench.js and verify-tray.js except it the same way */
    page.on('console', m => { const u = (m.location() || {}).url || ''; if (m.type() === 'error' && !u.includes('/_lab2/')) errors.push(m.text() + (u ? ' @ ' + u : '')); });
    page.on('pageerror', e => pageErrors.push(String(e.message || e)));
    page.on('response', r => { if (r.status() >= 400 && !r.url().includes('/_lab2/')) notOk.push(r.status() + ' ' + r.url()); });
    await page.goto(url, { waitUntil: 'load' });
    await page.waitForFunction(() => window.Lab && window.Frames, null, { timeout: 30000 });
    await page.waitForFunction(() => window.Kits && Kits.stats && Kits.stats().sheets.length >= 4, null, { timeout: 30000 }).catch(() => {});
    await page.evaluate(SETTLE, { quiet: 1200, cap: 20000 });
    return { ctx, page, errors, pageErrors, notOk };
  }

  async function measure(url, label) {
    const o = await open(url);
    const rows = [];
    for (const c of CAMERAS) {
      const looked = await o.page.evaluate(LOOK, { z: c.zoom, wx: c.wx, wy: c.wy });
      const settle = await o.page.evaluate(SETTLE, { quiet: 1200, cap: 20000 });
      const before = await o.page.evaluate(SNAP);
      const idle = stats(await o.page.evaluate(IDLE, IDLE_MS));
      const room = before.scroll.w - before.scroll.cw - before.scroll.l;
      const dist = Math.max(0, Math.min(c.pan, Math.floor(room)));
      const pan = stats((await o.page.evaluate(PAN, { dist, legMs: LEG_MS })).deltas);
      await o.page.evaluate(SETTLE, { quiet: 1200, cap: 20000 });
      rows.push({ camera: c.key, zoom: c.zoom, why: c.why, looked, settle, idle, pan,
        panRequested: c.pan, panActual: dist, railed: dist < c.pan, worst: Math.max(idle.max, pan.max),
        docs: before.docs, panels: before.panels, iframes: before.iframes, sections: before.sections, kits: before.kits });
      console.log('  ' + label.padEnd(12) + c.key.padEnd(11) + 'idle med ' + String(idle.median).padEnd(5) + 'max ' + String(idle.max).padEnd(6) +
        '| pan ' + String(dist).padEnd(5) + (dist < c.pan ? '*' : ' ') + 'med ' + String(pan.median).padEnd(5) + 'max ' + String(pan.max).padEnd(6) +
        '| docs ' + before.docs + ' live ' + (before.kits ? before.kits.live : '-') + ' tiles ' + (before.kits ? before.kits.tiles : '-'));
    }
    await o.ctx.close();
    return { url, rows, errors: o.errors, pageErrors: o.pageErrors, notOk: o.notOk };
  }

  // the DOM pass, on the bench that ships
  console.log('\nthe bench, asked what it is made of');
  const domRun = await open(BENCH_URL);
  const dom = [];
  for (const c of DOM_CAMERAS) {
    if (c.zoom != null) { await domRun.page.evaluate(LOOK, { z: c.zoom, wx: c.wx, wy: c.wy }); await domRun.page.evaluate(SETTLE, { quiet: 1200, cap: 20000 }); }
    const a = await domRun.page.evaluate(ASK);
    dom.push(Object.assign({ camera: c.key }, a));
    console.log('  ' + c.key.padEnd(12) + 'zoom ' + a.zoom.toFixed(4) + '  docs ' + a.docs + '  iframes ' + a.iframes +
      '  stickers ' + a.stickers + '  live ' + a.live + '  filters inside parts ' + a.filtersInsideParts +
      '  rule ' + (a.bad.length ? 'VIOLATED' : 'clean'));
  }
  await domRun.ctx.close();

  console.log('\nthe cost — the same page with the tray and without it');
  const bench = await measure(BENCH_URL, 'bench');
  const tray = await measure(FIX_URL('bench-tray.html'), 'with tray');
  const noTray = await measure(FIX_URL('bench-no-tray.html'), 'no tray');

  const delta = tray.rows.map((r, i) => ({ camera: r.camera, why: r.why,
    trayIdle: r.idle.median, noTrayIdle: noTray.rows[i].idle.median, deltaIdle: r1(r.idle.median - noTray.rows[i].idle.median),
    trayWorst: r.worst, noTrayWorst: noTray.rows[i].worst,
    trayPanMed: r.pan.median, noTrayPanMed: noTray.rows[i].pan.median,
    trayDocs: r.docs, noTrayDocs: noTray.rows[i].docs,
    trayLive: r.kits.live, noTrayLive: noTray.rows[i].kits.live }));

  console.log('\nDELTA (with tray − without), one run, the same cameras');
  for (const d of delta) console.log('  ' + d.camera.padEnd(12) + 'idle ' + d.trayIdle + ' vs ' + d.noTrayIdle + '  Δ ' + d.deltaIdle +
    ' ms   worst ' + d.trayWorst + ' vs ' + d.noTrayWorst + '   docs ' + d.trayDocs + '/' + d.noTrayDocs + '   live ' + d.trayLive + '/' + d.noTrayLive);

  // ── the checks ──────────────────────────────────────────────────────────
  console.log('');
  const allRuns = { bench, tray, noTray };
  const docsSeen = [].concat(dom.map(d => d.docs), bench.rows.map(r => r.docs), tray.rows.map(r => r.docs), noTray.rows.map(r => r.docs));
  check('1 · ZERO booted documents at every camera of both pages',
    docsSeen.every(d => d === 0),
    dom.map(d => d.camera + ' ' + d.docs).join(', ') + ' | tray ' + tray.rows.map(r => r.docs).join('/') + ' | no tray ' + noTray.rows.map(r => r.docs).join('/'));
  check('2 · no iframe anywhere, and none on a sticker section',
    dom.every(d => d.iframes === 0 && d.stickerIframes.length === 0) && bench.rows.every(r => r.iframes === 0),
    'iframes ' + dom.map(d => d.iframes).join('/') + ', sticker iframes ' + dom.map(d => d.stickerIframes.length).join('/') + ' of ' + dom[0].stickers);
  check('3 · every sticker section is a kit part, and none is data-live',
    dom.every(d => d.stickers === 40 && !d.notKit.length && !d.noArt.length && !d.dataLive.length),
    dom[0].stickers + ' sticker sections, all data-kit with a .gz-art; data-live on ' + (dom[0].dataLive.length ? dom[0].dataLive.join(',') : 'nothing'));
  check('4 · no filter or mix-blend-mode on a section, a .gz-art or #bench-world',
    dom.every(d => d.bad.length === 0),
    dom[0].sections + ' sections and their .gz-arts read none/normal at every camera; ' +
      dom[0].filtersInsideParts + ' live part svgs carry the contract’s own root drop-shadow, which is inside the drawing');
  const texts = dom[0].partTexts;
  check('5 · no {{ }} reaches a drawing (text nodes, not innerHTML)',
    dom.every(d => d.braces.length === 0 && d.interpSpans === 0),
    dom[0].textNodes + ' text nodes under #bench-world, 0 with a {{; 0 sc-interp spans; the rendered <text> are ' +
      JSON.stringify(texts.filter(Boolean)) + ' and ' + texts.filter(t => !t).length + ' empty (skText \'\')');
  const same = bench.rows.every((r, i) => r.docs === tray.rows[i].docs && r.sections === tray.rows[i].sections &&
    r.kits.live === tray.rows[i].kits.live && r.kits.tiles === tray.rows[i].kits.tiles);
  check('6 · the fixture reproduces the bench it was cut from',
    same, 'docs/sections/live/tiles equal at all three cameras — ' + bench.rows.map(r => r.kits.live + ':' + r.kits.tiles).join(' '));
  check('7 · the tray costs no idle frame (≤ ' + SLACK_MS + ' ms, half a slot, over the same page without it)',
    delta.every(d => d.deltaIdle <= SLACK_MS),
    delta.map(d => d.camera + ' ' + d.deltaIdle).join(', ') + ' ms');
  const noise = Object.values(allRuns).reduce((n, r) => n + r.errors.length + r.pageErrors.length + r.notOk.length, 0) +
    domRun.errors.length + domRun.pageErrors.length + domRun.notOk.length;
  check('8 · no console error, page error or response ≥ 400 (the blocked door aside)', noise === 0,
    noise ? Object.values(allRuns).concat([domRun]).flatMap(r => r.errors.concat(r.pageErrors, r.notOk)).join(' | ') : 'none on any of the four contexts');

  const summary = { when: new Date().toISOString(), chrome: await browser.version(),
    viewport: Object.assign({ deviceScaleFactor: 1 }, VIEW), window: WINDOW, headed: true,
    slackMs: SLACK_MS, idleMs: IDLE_MS, legMs: LEG_MS,
    fixtures: built, cameras: CAMERAS, domCameras: DOM_CAMERAS.map(c => c.key),
    dom, runs: allRuns, delta, checks, pass, fail };
  fs.writeFileSync(path.join(OUT, 'summary.json'), JSON.stringify(summary, null, 2));
  console.log('\n' + pass + '/' + (pass + fail) + (fail ? ' PASS — ' + fail + ' FAILED' : ' PASS') +
    ' — ' + path.relative(process.cwd(), OUT).replace(/\\/g, '/') + '/summary.json');

  if (keepOpen) { console.log('--keep-open: leaving Chrome up; ctrl+c to end'); await new Promise(() => {}); }
  await browser.close();
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e && e.stack || e); process.exit(1); });
