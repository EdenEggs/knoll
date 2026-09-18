/* lab2/test/perf/verify-bench.js — the sandbox bench, asked the hard questions
   USAGE (from site/, with the live serve.js up on 4321): node lab2/test/perf/verify-bench.js

   smoke-bench.js asks whether the sandbox boots and lands where data-open
   says. This asks whether it lands there BECAUSE of data-open, and whether
   the rest of the runtime is really the runtime: the same page is opened
   five times in headed Chrome (system Chrome, headed, as every lab2/perf/*.js
   — the hidden pane has no rAF), each time in a fresh context so no saved
   camera (knoll-lab2:cam) can stand in for the opening read, and four of
   those times the HTML is rewritten on the way in by page.route so that
   #bench-world carries a different data-open:

     as-is      the file as it stands → Lab.zoom is the fit of -120,-120,2194,2315
     stripped   both attributes cut   → the fit of the MAIN bench's literal, 568,-2190,3200,1390
     three      data-open="1,2,3"     → the literal again (not four numbers)
     zero-w     data-open="-120,-120,0,1015" → the literal again (no width)
     narrow     a 390 × 729 viewport, the file as it stands → the fit of data-open-narrow

   The fits are computed here the way WHERE IT OPENS computes them (24 px
   pad at 700 wide or over, 16 under, clamped to [ZMIN 0.02, 1]) from the
   bench box Chrome reports, and must agree within 1 % — the room for the
   header to reflow a line between lab.js's read and this one, and no room
   for the wrong rectangle (0.37 against 0.49 on a 1600 × 1000 window). The
   stripped pass must also differ from the as-is pass in zoom AND pan, since
   a same-zoom coincidence would say nothing.

   THE PAN IS CHECKED AGAINST THE RAIL, NOT THE BARE CENTRE. lab.js centres
   the rectangle and then clampCam() keeps EDGE (120) px of sheet on screen,
   so a rectangle that frames paper above this page's content — the main
   bench's literal, 2190 units above the caption — is reeled in to the top
   rail, and the pan that proves the literal was read is the rail's own
   number, b.height − 120. And the bench is measured here two seconds after
   boot, when the fonts are in and the hint paragraph has reflowed; lab.js
   read a box one line taller (915 against 897 on this window, measured
   2026-09-07 — the pan it wrote back-solves to that height), which moves a
   centred rectangle by half a line. So the x pan is held to ±2 px and the y
   pan to ±12 px, which is one 18 px header line with room to spare, and
   the run reports the height lab.js must have read.

   Then the ctrl checks, as lab2/perf/verify.js does them over the live
   bench: the camera to 100 % over a tree of the stand (Lab.camTo, no glide),
   the tree must be live — a .gz-art > svg, not a sprite on a tile — and
   Kits.inkAt must answer true at the foot of the trunk (x ½, y 0.9 of the
   box) and false four pixels in from the box's top-left corner, which is
   air. Ctrl is then actually held over the trunk and Ink.hit must be that
   tree wearing its rim.

   And the things a passing smoke would not notice: every console line of
   every type is kept, and one that says '[kits]' (the only warning kits.js
   has — a sheet it could not read) or '[keep]' fails the run; posters/index.json
   must answer 200 with exactly {} (frames.js asks for it with no-cache
   whatever the page; a 404 there is a broken path); every other response
   under 400. The door is blocked wide, page.route('**\/_lab2/**') → 404,
   because on 4321 that door writes the LIVE bench's index.html; the block
   is what makes running this against the owner's server safe.

   Results: perf/results/phase0/verify-bench-*.png and verify-bench.json. */
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');

const URL = 'http://localhost:4321/lab2/test/';
const OUT = path.join(__dirname, 'results', 'phase0');
fs.mkdirSync(OUT, { recursive: true });

const WIDE = { x: 568, y: -2190, w: 3200, h: 1390 };      // lab.js WHERE IT OPENS, the wide literal
const NARROW = { x: 1390, y: -2190, w: 1250, h: 1390 };   // …and the narrow one
const ZMIN = 0.02;                                        // lab.js's floor
const TOL = 0.01;                                         // the 1 % the smoke allows, same reason

const results = [];
const check = (name, ok, info) => {
  results.push({ name, ok: !!ok, info: info === undefined ? '' : String(info) });
  console.log((ok ? 'PASS ' : 'FAIL ') + name + (info !== undefined ? ' — ' + info : ''));
};
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const fitOf = (r, b) => {
  const pad = b.width < 700 ? 16 : 24;
  return clamp(Math.min((b.width - pad * 2) / r.w, (b.height - pad * 2) / r.h), ZMIN, 1);
};
const EDGE = 120;                                         // lab.js's rail: how much sheet stays on screen
const Y_TOL = 12;                                         // one 18 px header line reflowing, halved, with room
/* the centred pan, then lab.js's clampCam() over the sandbox's canvas: the
   content box (0,0)–(1910,775) widened to the bench's width and to
   max(bench height, 775 + 140) — growBench() — all scaled by z */
const panOf = (r, b, z) => {
  const ideal = { x: Math.round((b.width - r.w * z) / 2 - r.x * z), y: Math.round((b.height - r.h * z) / 2 - r.y * z) };
  const cw = Math.max(b.width, 1910), ch = Math.max(b.height, 775 + 140);
  const w = cw * z, h = ch * z, mx = Math.min(EDGE, w * 0.6), my = Math.min(EDGE, h * 0.6);
  return { ideal, x: clamp(ideal.x, mx - w, b.width - mx), y: clamp(ideal.y, my - h, b.height - my), railTop: b.height - my };
};
// the bench height lab.js must have read, back-solved from the pan it wrote: PY = (H − h·z)/2 − y·z
const heightFromPan = (r, z, py) => 2 * (py + r.y * z) + r.h * z;
const parseRect = s => { const v = String(s || '').split(',').map(Number); return { x: v[0], y: v[1], w: v[2], h: v[3] }; };

/* One visit: a fresh context (fresh localStorage, so nothing restored), the
   door blocked, the page HTML optionally rewritten on the way in, and every
   console line, failed request and ≥ 400 response kept. */
async function visit(browser, label, { viewport, rewrite } = {}) {
  const ctx = await browser.newContext({ viewport: viewport || { width: 1600, height: 1000 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const consoleLines = [], pageErrors = [], failed = [], notOk = [];
  let posters = null;
  page.on('console', m => consoleLines.push({ type: m.type(), text: m.text(), url: (m.location() && m.location().url) || '' }));
  page.on('pageerror', e => pageErrors.push(String(e)));
  page.on('requestfailed', r => failed.push(r.url()));
  page.on('response', async r => {
    if (r.status() >= 400) notOk.push(r.status() + ' ' + r.url());
    if (/\/posters\/index\.json(\?|$)/.test(r.url())) { try { posters = { status: r.status(), body: await r.text() }; } catch (e) { posters = { status: r.status(), body: '(unreadable: ' + e.message + ')' }; } }
  });
  await page.route('**/_lab2/**', r => r.fulfill({ status: 404, body: 'no' }));
  if (rewrite) {
    await page.route(URL, async r => {
      const res = await r.fetch();
      const html = await res.text();
      const out = rewrite(html);
      if (out === html) throw new Error(label + ': the rewrite changed nothing — the attribute it looks for is not in the file');
      await r.fulfill({ response: res, body: out, headers: { 'content-type': 'text/html; charset=utf-8' } });
    });
  }
  await page.goto(URL, { waitUntil: 'load' });
  await page.waitForFunction(() => window.Lab && window.Frames && window.Kits && Kits.stats().sheets.length === 4, null, { timeout: 20000 });
  await page.waitForTimeout(2000);
  const st = await page.evaluate(() => {
    const world = document.getElementById('bench-world'), b = Lab.bench.getBoundingClientRect();
    return { zoom: Lab.zoom, pan: Lab.pan, bench: { width: b.width, height: b.height },
             open: world.getAttribute('data-open'), openNarrow: world.getAttribute('data-open-narrow'),
             kits: Kits.stats(), docs: Frames.panels.filter(p => p.loading).length,
             restoredCam: (() => { try { return localStorage.getItem('knoll-lab2:cam'); } catch (e) { return 'n/a'; } })() };
  });
  return { page, ctx, st, consoleLines, pageErrors, failed, notOk, posters: () => posters };
}

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: false, args: ['--window-size=1616,1110', '--window-position=0,0'] });
  const summary = { date: new Date().toISOString(), url: URL, passes: {} };

  // ── 1 · as-is: the file's own rectangle
  const A = await visit(browser, 'as-is');
  const rectA = parseRect(A.st.open), fitA = fitOf(rectA, A.st.bench), panA = panOf(rectA, A.st.bench, A.st.zoom);
  check('as-is: data-open is on #bench-world', A.st.open === '-120,-120,2194,2315' && A.st.openNarrow === '-120,-120,1840,1015', 'open=' + A.st.open + ' narrow=' + A.st.openNarrow);
  check('as-is: Lab.zoom is the fit of data-open (±1%)', Math.abs(A.st.zoom - fitA) / fitA <= TOL, 'zoom=' + A.st.zoom.toFixed(4) + ' fit=' + fitA.toFixed(4) + ' bench=' + A.st.bench.width + 'x' + A.st.bench.height);
  const bootH = heightFromPan(rectA, A.st.zoom, A.st.pan.y);
  check('as-is: Lab.pan centres data-open (x ±2 px, y ±12 for the header reflow)', Math.abs(A.st.pan.x - panA.x) <= 2 && Math.abs(A.st.pan.y - panA.y) <= Y_TOL, 'pan=' + A.st.pan.x + ',' + A.st.pan.y + ' expected=' + panA.x + ',' + panA.y + ' (bench now ' + A.st.bench.height + ' tall; lab.js read ' + bootH.toFixed(1) + ')');
  check('as-is: Kits.stats().parts === 48, sheets 4, docs 0', A.st.kits.parts === 48 && A.st.kits.sheets.length === 4 && A.st.docs === 0, 'parts=' + A.st.kits.parts + ' sheets=' + A.st.kits.sheets.join('/') + ' docs=' + A.st.docs + ' live=' + A.st.kits.live + ' tiles=' + A.st.kits.tiles);
  /* the caption's two lines, measured in the faces they are set in — the
     widths are what index.html's comment quotes, and they only mean
     anything if Sora 700 and Public Sans 400 were IN when they were read
     (a fallback face is a different width), so document.fonts is asked */
  const caption = await A.page.evaluate(() => ({
    fonts: { sora700: document.fonts.check('700 76px Sora'), publicSans400: document.fonts.check('400 28px "Public Sans"') },
    lines: [...document.querySelectorAll('#gz-caption svg text')].map(t => ({ text: t.textContent, chars: t.textContent.length, width: Math.round(t.getComputedTextLength()), font: getComputedStyle(t).fontFamily }))
  }));
  check('as-is: the caption is two lines of text, Sora 700 and Public Sans 400 loaded', caption.lines.length === 2 && caption.fonts.sora700 && caption.fonts.publicSans400 && /Sora/.test(caption.lines[0].font) && /Public Sans/.test(caption.lines[1].font), JSON.stringify(caption));
  await A.page.screenshot({ path: path.join(OUT, 'verify-bench-asis.png') });
  summary.passes.asIs = { st: A.st, fit: fitA, pan: panA, bootHeight: bootH, caption, notOk: A.notOk, failed: A.failed };

  // ── 2 · the ctrl checks on the as-is page, before it is closed: 100 % over the pine
  const tree = 'stand-the-pine';
  await A.page.evaluate(id => {
    const el = document.querySelector('[data-gizmo="' + id + '"]'), b = Lab.bench.getBoundingClientRect();
    const x = parseFloat(el.style.left), y = parseFloat(el.style.top), w = parseFloat(el.style.width), h = parseFloat(el.style.height);
    Lab.camTo(1, b.width / 2 - (x + w / 2), b.height / 2 - (y + h / 2), 0);
  }, tree);
  await A.page.waitForTimeout(1200);
  const g = await A.page.evaluate(id => {
    const el = document.querySelector('[data-gizmo="' + id + '"]'), r = el.getBoundingClientRect();
    return { zoom: Lab.zoom, live: !!el.querySelector('.gz-art > svg'), kit: el.dataset.kit, part: el.dataset.part, x: r.left, y: r.top, w: r.width, h: r.height, kits: Kits.stats() };
  }, tree);
  check('ctrl: at 100 % the pine is live svg', g.zoom === 1 && g.live, 'zoom=' + g.zoom + ' live=' + g.live + ' ' + g.kit + '/' + g.part + ' box ' + Math.round(g.w) + 'x' + Math.round(g.h) + ' kits live=' + g.kits.live + ' full=' + g.kits.full);
  const trunk = { x: g.x + g.w * 0.5, y: g.y + g.h * 0.9 }, corner = { x: g.x + 4, y: g.y + 4 };
  const inkTrunk = await A.page.evaluate(([id, q]) => Kits.inkAt(document.querySelector('[data-gizmo="' + id + '"]'), q.x, q.y), [tree, trunk]);
  const inkCorner = await A.page.evaluate(([id, q]) => Kits.inkAt(document.querySelector('[data-gizmo="' + id + '"]'), q.x, q.y), [tree, corner]);
  check('ctrl: Kits.inkAt — the trunk answers ink, the corner answers paper', inkTrunk === true && inkCorner === false, 'trunk=' + inkTrunk + ' corner=' + inkCorner);
  await A.page.mouse.move(trunk.x, trunk.y);
  await A.page.keyboard.down('Control');
  await A.page.mouse.move(trunk.x + 1, trunk.y);
  await A.page.waitForTimeout(200);
  const hit = await A.page.evaluate(() => ({ hit: window.Ink && Ink.hit && Ink.hit.dataset.gizmo, rim: !!document.querySelector('.gz.ink-hit .gz-art > [data-lab-ink]') }));
  check('ctrl held over the trunk: the pine is the hit and wears its rim', hit.hit === tree && hit.rim, JSON.stringify(hit));
  await A.page.screenshot({ path: path.join(OUT, 'verify-bench-ctrl.png') });
  await A.page.keyboard.up('Control');
  await A.page.waitForTimeout(150);
  check('ctrl up: the rim comes off', await A.page.evaluate(() => !document.querySelector('[data-lab-ink]')));
  summary.ctrl = { tree, geo: g, inkTrunk, inkCorner, hit };

  /* the console, read LAST — about six seconds after load, past the point
     where Chrome complains of a preload it never used (it waits a few
     seconds after the load event to say so) and after the sheets, the
     tiles and a zoom to 100 % have all had their turn to log */
  await A.page.waitForTimeout(2000);
  const kitsLines = A.consoleLines.filter(l => /\[kits\]|\[keep\]/.test(l.text));
  const errLines = A.consoleLines.filter(l => l.type === 'error' && !(/Failed to load resource/.test(l.text) && /\/_lab2\//.test(l.url)));
  const warnLines = A.consoleLines.filter(l => l.type === 'warning');
  check('as-is: no [kits] or [keep] console line', kitsLines.length === 0, kitsLines.length ? kitsLines.map(l => l.text).join(' | ') : 'none');
  check('as-is: no console error (the blocked door aside)', errLines.length === 0, errLines.length ? errLines.map(l => l.text + ' @ ' + l.url).join(' | ') : 'none');
  check('as-is: no console warning', warnLines.length === 0, warnLines.length ? warnLines.map(l => l.text).join(' | ') : 'none');
  check('as-is: no page error', A.pageErrors.length === 0, A.pageErrors.join(' | ') || 'none');
  const p = A.posters();
  check('as-is: posters/index.json answered 200 with {}', p && p.status === 200 && p.body.trim() === '{}', p ? p.status + ' ' + JSON.stringify(p.body).slice(0, 40) : 'never requested');
  const strays = A.notOk.filter(u => !/\/_lab2\//.test(u));
  check('as-is: no response ≥ 400 but the blocked door', strays.length === 0, strays.join(' | ') || 'only ' + A.notOk.join(' | '));
  check('as-is: no failed request', A.failed.length === 0, A.failed.join(' | ') || 'none');
  summary.passes.asIs.console = A.consoleLines;
  summary.passes.asIs.posters = p;
  await A.ctx.close();

  // ── 3 · stripped: no attribute at all → the main bench's literal
  const strip = html => html.replace(/ data-open="[^"]*"/g, '').replace(/ data-open-narrow="[^"]*"/g, '');
  const B = await visit(browser, 'stripped', { rewrite: strip });
  const fitB = fitOf(WIDE, B.st.bench), panB = panOf(WIDE, B.st.bench, B.st.zoom);
  check('stripped: the attributes are gone from the page', B.st.open === null && B.st.openNarrow === null, 'open=' + B.st.open + ' narrow=' + B.st.openNarrow);
  check('stripped: Lab.zoom is the fit of the main bench\'s literal (±1%)', Math.abs(B.st.zoom - fitB) / fitB <= TOL, 'zoom=' + B.st.zoom.toFixed(4) + ' literal fit=' + fitB.toFixed(4));
  check('stripped: Lab.pan is the literal\'s, reeled in to the top rail (x ±2 px, y = bench − EDGE ±2)', Math.abs(B.st.pan.x - panB.x) <= 2 && Math.abs(B.st.pan.y - panB.y) <= 2 && panB.y === panB.railTop && panB.ideal.y > panB.railTop, 'pan=' + B.st.pan.x + ',' + B.st.pan.y + ' expected=' + panB.x + ',' + panB.y + ' (centred would be ' + panB.ideal.x + ',' + panB.ideal.y + '; rail ' + panB.railTop + ')');
  check('stripped ≠ as-is: a different zoom and a different pan', Math.abs(B.st.zoom - A.st.zoom) / A.st.zoom > 0.05 && (B.st.pan.x !== A.st.pan.x || B.st.pan.y !== A.st.pan.y), 'as-is ' + A.st.zoom.toFixed(4) + ' @ ' + A.st.pan.x + ',' + A.st.pan.y + '; stripped ' + B.st.zoom.toFixed(4) + ' @ ' + B.st.pan.x + ',' + B.st.pan.y);
  check('stripped: no page error', B.pageErrors.length === 0, B.pageErrors.join(' | ') || 'none');
  await B.page.screenshot({ path: path.join(OUT, 'verify-bench-stripped.png') });
  summary.passes.stripped = { st: B.st, fit: fitB, pan: panB };
  await B.ctx.close();

  // ── 4 · three numbers → the literal
  const C = await visit(browser, 'three', { rewrite: html => html.replace(/ data-open="[^"]*"/, ' data-open="1,2,3"').replace(/ data-open-narrow="[^"]*"/, '') });
  const fitC = fitOf(WIDE, C.st.bench);
  check('data-open="1,2,3": ignored, the literal fit (±1%)', C.st.open === '1,2,3' && Math.abs(C.st.zoom - fitC) / fitC <= TOL, 'open=' + C.st.open + ' zoom=' + C.st.zoom.toFixed(4) + ' literal fit=' + fitC.toFixed(4));
  summary.passes.three = { st: C.st, fit: fitC };
  await C.ctx.close();

  // ── 5 · a width of zero → the literal
  const D = await visit(browser, 'zero-w', { rewrite: html => html.replace(/ data-open="[^"]*"/, ' data-open="-120,-120,0,1015"').replace(/ data-open-narrow="[^"]*"/, '') });
  const fitD = fitOf(WIDE, D.st.bench);
  check('data-open with w=0: ignored, the literal fit (±1%)', D.st.open === '-120,-120,0,1015' && Math.abs(D.st.zoom - fitD) / fitD <= TOL && isFinite(D.st.zoom), 'open=' + D.st.open + ' zoom=' + D.st.zoom.toFixed(4) + ' literal fit=' + fitD.toFixed(4));
  summary.passes.zeroW = { st: D.st, fit: fitD };
  await D.ctx.close();

  // ── 6 · narrow: a phone-wide window reads data-open-narrow
  const E = await visit(browser, 'narrow', { viewport: { width: 390, height: 729 } });
  const rectE = parseRect(E.st.openNarrow), fitE = fitOf(rectE, E.st.bench), fitEwide = fitOf(parseRect(E.st.open), E.st.bench);
  check('narrow (390 wide): Lab.zoom is the fit of data-open-narrow (±1%), not of data-open', E.st.bench.width < 700 && Math.abs(E.st.zoom - fitE) / fitE <= TOL && Math.abs(fitE - fitEwide) / fitE > TOL, 'zoom=' + E.st.zoom.toFixed(4) + ' narrow fit=' + fitE.toFixed(4) + ' wide fit=' + fitEwide.toFixed(4) + ' bench=' + E.st.bench.width + 'x' + E.st.bench.height);
  await E.page.screenshot({ path: path.join(OUT, 'verify-bench-narrow.png') });
  summary.passes.narrow = { st: E.st, fit: fitE, fitWide: fitEwide };
  await E.ctx.close();

  summary.checks = results;
  fs.writeFileSync(path.join(OUT, 'verify-bench.json'), JSON.stringify(summary, null, 2));
  await browser.close();
  const bad = results.filter(r => !r.ok).length;
  console.log('screenshots → ' + OUT + ' (verify-bench-asis/ctrl/stripped/narrow.png), summary verify-bench.json');
  console.log(bad ? bad + ' FAILED' : 'ALL PASS');
  process.exit(bad ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
