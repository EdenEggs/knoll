/* lab2/test/perf/verify-template.js — the game-page template, filled in and booted
   USAGE (from site/, with the SANDBOX server up on 4322):
       node lab2/test/serve.js 4322          # in another shell, if it is not up
       node lab2/test/perf/verify-template.js

   WHAT THIS IS FOR. games/_template.html is a page nobody has ever loaded:
   it is a skeleton with nine placeholders in it, and press/tools/build-game.js
   (the next step of Phase 5) is what fills them. A skeleton that is wrong is
   wrong in every page built from it, and the two things most likely to be
   wrong are the ones a reading cannot settle — whether every relative path
   resolves from TWO FOLDERS DOWN, and whether lab.js, frames.js and kits.js
   behave on a page that is not the bench. So this script fills the
   placeholders itself, by hand, with the smallest page that still exercises
   all three: one picture, one sticker, the neonrun fixture's colours, and an
   opening rectangle round the pair.

   THE PROBE IS LEFT ON DISK. games/_probe/ is written fresh every run and
   kept — it is the template's own fixture, the one page in games/ that is not
   a game, and the thing to open by hand when the template changes:

       http://localhost:4322/lab2/test/games/_probe/

   It is named with a LEADING UNDERSCORE on purpose. serve.js's slug is
   ^[a-z0-9-]{2,40}$ (the manifest schema's own pattern), so `_probe` is not a
   slug: /build cannot overwrite it, its save door 400s, and keep.js's own
   derivation falls through to the bench door — which this script blocks. The
   probe can therefore never be written to by anything but this file.

   WHAT IT FILLS THE PLACEHOLDERS WITH, and where each value came from:

     {{SLUG}}       `_probe`, per the paragraph above.
     {{TITLE}},
     {{DESCRIPTION_META}}
                    the neonrun fixture's manifest (press/fixtures/neonrun) —
                    the same words build-game.js will take from a real one.
     {{TOKENS_CSS}} press/theme.js's answer for neonrun, computed here through
                    press/tools/lib/fixture-theme.js — the one pipeline
                    tools/test-theme.js and perf/shot-theme.js already share,
                    so the probe cannot drift from the theme goldens. The
                    pairing is `scifi`, which is what expected.json says
                    neonrun's is. A dark plate is deliberate: a game page whose
                    --paper is #161323 proves the token block beat lab.css's
                    :root, which a pale theme would not.
     {{FONT_PRELOADS}}
                    Fonts.preloads('scifi') → Orbitron-400, Space-Mono-400,
                    written as the two <link rel=preload> lines the head wants.
     {{SK_STYLE}}   Style.forPreset('neon', v) where v is the vector in
                    press/fixtures/neonrun/stats.json (Phase 3's golden). It is
                    JSON in a single-quoted attribute, which is CONTRACTS §5.
     {{OPEN}},
     {{OPEN_NARROW}}
                    computed below by the same arithmetic the template's own
                    comment describes, so that what is asserted is the rule and
                    not a number typed twice.
     {{SECTIONS}}   the two sections, written out below.

   THE TWO SECTIONS, and why these two:

     gz-pic     plan §3.7 — a prop (.gz-art, no data-src) whose inline svg is a
                raster in a vector box. art/shot-1.png is neonrun's first
                screenshot, 960 × 540, copied into games/_probe/art/. This is
                the section frames.js has never been asked to size, and the
                aspect check below is the whole point of it.
     sticker    one kit part off features/stickers-core.dc.html, the five-line
                shape, with data-text so the extraction has something to fill.
                `banner` is the one part of the forty with a text slot, which
                makes it ALWAYS live (ADDING.md §1.2) — so the run has a live
                part to look at whatever the zoom lands on, and the tiles have
                a sprite beside it.

   WHAT IT ASSERTS, and why each one is here:

     boot       window.Lab, window.Frames and window.Kits are all up. A game
                page is the first page in this repo that is not the bench, and
                each of the three has a guard that could take it out (kits.js
                used to return null with no #bench-world at all — NOTES §D.3).
     clean      zero console errors and zero responses ≥ 400, the blocked door
                excepted (it is fulfilled as a 404 here on purpose, which is
                what the live bench's door does too). A '[kits]' or '[keep]'
                line is a failure whatever its level: those are the two
                warnings that mean a path did not resolve.
     posters    frames.js fetches 'posters/index.json' relative to the PAGE and
                nothing boots until it has answered, so from games/<slug>/ it
                asks for games/<slug>/posters/index.json. That file is written
                here, '{}', and the run checks the request landed 200 — because
                a 404 there is the difference between a game page that boots
                and one that waits a beat and then boots anyway with a red line
                in the console.
     sheet      the sticker sheet resolved. See THE SHEETS ARE ASKED FOR
                RELATIVE TO THE PAGE in the template: kits.js asks for
                'features/stickers-core.dc.html', which from here is a 404, and
                the template lends fetch two folders for the length of kits.js's
                script tag. This run is what says the lending works — and the
                assertion is on the RESPONSE, so it fails the day the stopgap
                is removed without kits.js having been fixed.
     camera     Lab.zoom is the fit of {{OPEN}} at this window, to 1 %, and the
                rectangle is on screen and centred in the bench. The fit is
                computed here the way WHERE IT OPENS computes it (24 px pad at
                700 wide or over, 16 under, clamped to [0.02, 1]) from the bench
                box Chrome reports. Without data-open the page would open on the
                MAIN bench's literal, 2190 units above anything on this paper,
                so this check is the difference between a game page and a sheet
                of blank paper.
     picture    the gz-pic's box measures to 960 : 540 within 1 %. frames.js
                sizes an art panel from (natW || data-w) × (natH || data-h) ×
                data-scale and then fits the drawing into it (NOTES §C.3, read
                but not measured until now).
     sticker    the sheet extracted in THIS PAGE'S colours: the part is in
                Kits.sheets.stickers.parts, kits.js's palette agrees with the
                page's --sk-primary token, and a part is either lifted live or
                painted on a tile.
     narrow     a second, fresh context at 390 × 729 takes data-open-narrow and
                not data-open. Two rectangles that differ by 596 units of width
                are 0.30 and 0.20 of zoom on a phone, so the reading is not a
                coincidence; the pass writes template-narrow.png beside the
                other shot.

   THE TOLERANCES. 1 % on the zoom and on the aspect is the same 1 %
   perf/smoke-bench.js and perf/verify-bench.js allow, and for the same reason:
   the header can reflow a line between lab.js's read of the bench box and this
   one. The centre is held to ±24 px, which is half the 48 px of pad the fit
   leaves — enough for that reflow (half a line, ~9 px at this zoom) and not
   enough for the wrong rectangle.

   Chrome is the system one, headed, as every lab2/perf/*.js: the hidden pane
   has no rAF and this run waits on frames.

   Results: perf/results/phase5/template.png, template-narrow.png and template.json. */
'use strict';
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const HOME = path.resolve(__dirname, '..');                       // lab2/test
const PROBE = path.join(HOME, 'games', '_probe');
const OUT = path.join(__dirname, 'results', 'phase5');
const FIXTURE = path.join(HOME, 'press', 'fixtures', 'neonrun');
const URL = 'http://localhost:4322/lab2/test/games/_probe/';

const ZMIN = 0.02;                    // lab.js's floor
const TOL = 0.01;                     // the 1 % the other verifiers allow
const CENTRE_TOL = 24;                // half the fit's pad — see THE TOLERANCES
const MARGIN = 120;                   // Appendix E's margin round a composition
const ASPECT = 3200 / 1390;           // the main bench's opening rectangle, since 2026-09-04 (NOTES §D.2)

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

/* ── the page ────────────────────────────────────────────────────────────── */

/* The bounding box of the slots, plus MARGIN on every side, then widened (or
   heightened) to the bench's opening aspect about its own centre and never
   made smaller — the template's own paragraph, written out. */
function openRect(boxes, widen) {
  const x0 = Math.min(...boxes.map(b => b.x)), y0 = Math.min(...boxes.map(b => b.y));
  const x1 = Math.max(...boxes.map(b => b.x + b.w)), y1 = Math.max(...boxes.map(b => b.y + b.h));
  let x = x0 - MARGIN, y = y0 - MARGIN, w = (x1 - x0) + MARGIN * 2, h = (y1 - y0) + MARGIN * 2;
  /* The WIDE rectangle takes the bench's opening aspect so it lands where the
     bench's does; the NARROW one does not, and must not — widening it to 2.3 : 1
     is exactly what makes a phone frame a band of paper instead of the picture.
     It is the content's own box and nothing more. */
  if (widen) {
    if (w / h < ASPECT) { const t = Math.round(h * ASPECT); x -= Math.round((t - w) / 2); w = t; }
    else { const t = Math.round(w / ASPECT); y -= Math.round((t - h) / 2); h = t; }
  }
  return { x, y, w, h };
}
const rectStr = r => [r.x, r.y, r.w, r.h].join(',');
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const PIC = { id: 'shot-1', file: 'art/shot-1.png', x: 0, y: 0, w: 960, h: 540, label: 'Neon Run — screenshot 1' };
// centred on the picture's height (540/2 − 135/2 = 202.5), a hundred to its right
const STICKER = { part: 'banner', text: 'WISHLIST', x: 1060, y: 203, w: 134, h: 135, label: 'Banner' };

function sections() {
  return [
    '<!-- ──────────────────── 00 · THE PICTURE ──────────────────── -->',
    '  <!-- A gz-pic (plan §3.7): a prop with no data-src, whose .gz-art holds a',
    '       raster in a vector box. data-w / data-h are the asset\'s own pixel size,',
    '       960 × 540, so frames.js cuts the box to the picture on the first frame',
    '       and place() fits the svg into it; ink.js reads the <image> as ink, so',
    '       the whole rectangle answers ctrl (NOTES §D.6). -->',
    '  <section class="gz gz-sign gz-pic" id="gz-' + PIC.id + '" data-gizmo="' + PIC.id + '"',
    '           data-w="' + PIC.w + '" data-h="' + PIC.h + '"',
    '           data-home-x="' + PIC.x + '" data-home-y="' + PIC.y + '" style="width:' + PIC.w + 'px;height:' + PIC.h + 'px"',
    '           aria-label="' + esc(PIC.label) + '">',
    '    <div class="gz-art">',
    '    <svg width="' + PIC.w + '" height="' + PIC.h + '" viewBox="0 0 ' + PIC.w + ' ' + PIC.h + '" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">',
    '      <image href="' + PIC.file + '" width="' + PIC.w + '" height="' + PIC.h + '"/>',
    '    </svg>',
    '    </div><!-- /gz-art -->',
    '    <span class="gz-dim" aria-hidden="true"></span>',
    '    <button type="button" class="gz-size" data-nodrag aria-label="re-cut it — double-click to fit it to its drawing"></button>',
    '  </section>',
    '',
    '  <!-- ──────────────────── 01 · THE STICKER ──────────────────── -->',
    '  <!-- One kit part off the core sheet, the five-line shape, wearing this',
    '       page\'s --sk-* roles rather than the sheet\'s pinks. data-text fills its',
    '       text slot (CONTRACTS §7); a part with words is always live. -->',
    '  <section class="gz" id="gz-sticker-' + STICKER.part + '" data-gizmo="sticker-' + STICKER.part + '"',
    '           data-src="../../features/stickers-core.dc.html#part=' + STICKER.part + '" data-w="' + STICKER.w + '" data-h="' + STICKER.h + '"',
    '           data-home-x="' + STICKER.x + '" data-home-y="' + STICKER.y + '" data-text="' + esc(STICKER.text) + '" style="width:' + STICKER.w + 'px;height:' + STICKER.h + 'px"',
    '           aria-label="' + esc(STICKER.label) + '">',
    '    <div class="gz-art"></div>',
    '    <span class="gz-dim" aria-hidden="true"></span>',
    '    <button type="button" class="gz-size" data-nodrag aria-label="re-cut it — double-click to fit it to its drawing"></button>',
    '  </section>'
  ].join('\n');
}

function build() {
  const { themeOf } = require(path.join(HOME, 'press', 'tools', 'lib', 'fixture-theme.js'));
  const load = require(path.join(HOME, 'press', 'tools', 'lib', 'browser-module.js'));
  const win = load(path.join(HOME, 'press', 'palette.js'));
  load(path.join(HOME, 'press', 'fonts.js'), win);
  load(path.join(HOME, 'press', 'style.js'), win);

  const manifest = JSON.parse(fs.readFileSync(path.join(FIXTURE, 'manifest.json'), 'utf8'));
  const stats = JSON.parse(fs.readFileSync(path.join(FIXTURE, 'stats.json'), 'utf8'));
  const PAIRING = 'scifi';                                        // expected.json's pairing for neonrun
  const theme = themeOf(FIXTURE, { fonts: PAIRING }).theme;
  const style = win.Style.forPreset('neon', stats.vector);        // expected.json's preset
  const preloads = win.Fonts.preloads(PAIRING)
    .map(f => '<link rel="preload" href="../../fonts/' + f + '" as="font" type="font/woff2" crossorigin>')
    .join('\n');

  const open = openRect([PIC, { x: STICKER.x, y: STICKER.y, w: STICKER.w, h: STICKER.h }], true);
  const narrow = openRect([PIC], false);                          // the spine alone, un-widened: a screen the width binds on

  const values = {
    '{{SLUG}}': '_probe',
    '{{TITLE}}': manifest.title + ' — press kit (template probe)',
    '{{DESCRIPTION_META}}': esc(manifest.tagline + ' ' + manifest.description.split('. ')[0] + '.'),
    '{{TOKENS_CSS}}': theme.css,
    '{{FONT_PRELOADS}}': preloads,
    '{{SK_STYLE}}': JSON.stringify(style),
    '{{OPEN}}': rectStr(open),
    '{{OPEN_NARROW}}': rectStr(narrow),
    '{{SECTIONS}}': sections()
  };

  let html = fs.readFileSync(path.join(HOME, 'games', '_template.html'), 'utf8');
  for (const k of Object.keys(values)) html = html.split(k).join(values[k]);
  const left = html.match(/\{\{[A-Z_]+\}\}/g);
  if (left) throw new Error('placeholders left unfilled: ' + left.join(', '));

  fs.mkdirSync(path.join(PROBE, 'art'), { recursive: true });
  fs.mkdirSync(path.join(PROBE, 'posters'), { recursive: true });
  fs.copyFileSync(path.join(FIXTURE, PIC.file), path.join(PROBE, PIC.file));
  // frames.js asks for this relative to the page — see the template's comment
  fs.writeFileSync(path.join(PROBE, 'posters', 'index.json'), '{}\n');
  fs.writeFileSync(path.join(PROBE, 'index.html'), html);
  return { open, narrow, theme, style, pairing: PAIRING, bytes: html.length };
}

/* ── the run ─────────────────────────────────────────────────────────────── */
(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const made = build();
  console.log('probe written: games/_probe/index.html, ' + made.bytes + ' bytes');
  console.log('  data-open="' + rectStr(made.open) + '"  data-open-narrow="' + rectStr(made.narrow) + '"');

  const browser = await chromium.launch({ channel: 'chrome', headless: false, args: ['--window-size=1616,1110', '--window-position=0,0'] });
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const consoleLines = [], pageErrors = [], failed = [], notOk = [];
  const seen = [];
  page.on('console', m => consoleLines.push({ type: m.type(), text: m.text(), url: (m.location() && m.location().url) || '' }));
  page.on('pageerror', e => pageErrors.push(String(e)));
  page.on('requestfailed', r => failed.push(r.url()));
  page.on('response', r => { seen.push({ status: r.status(), url: r.url() }); if (r.status() >= 400) notOk.push(r.status() + ' ' + r.url()); });
  // the door, blocked wide: nothing this run does may reach a writer
  await page.route('**/_lab2/**', r => r.fulfill({ status: 404, body: 'no' }));

  await page.goto(URL, { waitUntil: 'load' });
  await page.waitForTimeout(2500);                                // sheets in, tiles painted, fonts settled

  const st = await page.evaluate(() => {
    const q = s => document.querySelector(s);
    const bench = q('#bench').getBoundingClientRect();
    const picEl = q('#gz-shot-1');
    const pic = picEl.getBoundingClientRect();
    const K = window.Kits;
    const sh = K && K.sheets && K.sheets.stickers;
    const css = getComputedStyle(document.documentElement);
    let live = 0, recs = 0;
    if (K && K.recs) K.recs.forEach(r => { recs++; if (r.live) live++; });
    return {
      lab: !!window.Lab, frames: !!window.Frames, kits: !!window.Kits, wall: !!window.Wall, keep: !!window.Keep,
      zoom: window.Lab ? window.Lab.zoom : null,
      bench: { x: bench.x, y: bench.y, w: bench.width, h: bench.height },
      pic: { x: pic.x, y: pic.y, w: pic.width, h: pic.height },
      picArtSvg: !!picEl.querySelector('.gz-art > svg'),
      picImageBox: (() => { const i = picEl.querySelector('.gz-art image'); if (!i) return null; const b = i.getBoundingClientRect(); return { w: b.width, h: b.height }; })(),
      iframes: document.querySelectorAll('iframe').length,
      loading: window.Frames ? window.Frames.panels.filter(p => p.loading).length : -1,
      stickerParts: sh ? Object.keys(sh.parts).length : 0,
      hasBanner: !!(sh && sh.parts && sh.parts.banner),
      bannerText: sh && sh.parts && sh.parts.banner ? sh.parts.banner.text : null,
      sheetPrimary: sh ? sh.palette.skPrimary : null,
      tokenPrimary: css.getPropertyValue('--sk-primary').trim(),
      tokenPaper: css.getPropertyValue('--paper').trim(),
      body: css.getPropertyValue('--body').trim(),
      kitStats: window.Kits && window.Kits.stats ? window.Kits.stats() : null,
      liveRecs: live, recs,
      liveSvg: document.querySelectorAll('.gz[data-kit] .gz-art > svg').length,
      tiles: document.querySelectorAll('canvas.kit-tile').length
    };
  });

  await page.screenshot({ path: path.join(OUT, 'template.png') });

  // ── the questions ──────────────────────────────────────────────────────
  check('Lab, Frames and Kits are all up', st.lab && st.frames && st.kits,
        'Lab ' + st.lab + ', Frames ' + st.frames + ', Kits ' + st.kits + ', Wall ' + st.wall + ', Keep ' + st.keep);

  const errLines = consoleLines.filter(l => l.type === 'error' && !(/Failed to load resource/.test(l.text) && /\/_lab2\//.test(l.url)));
  check('no console errors', errLines.length === 0 && pageErrors.length === 0,
        errLines.map(l => l.text).concat(pageErrors).join(' | ') || 'none');
  const noisy = consoleLines.filter(l => /\[kits\]|\[keep\]/.test(l.text));
  check('no [kits] or [keep] warning', noisy.length === 0, noisy.map(l => l.text).join(' | ') || 'none');

  const strays = notOk.filter(u => !/\/_lab2\//.test(u));
  check('no response ≥ 400 but the blocked door', strays.length === 0,
        strays.join(' | ') || 'only ' + (notOk.join(' | ') || 'none'));
  check('no failed request', failed.length === 0, failed.join(' | ') || 'none');

  const posterReq = seen.filter(r => /\/posters\/index\.json/.test(r.url));
  check('posters/index.json resolved from two folders down', posterReq.length > 0 && posterReq.every(r => r.status === 200),
        posterReq.map(r => r.status + ' ' + r.url).join(' | ') || 'never asked for');
  const sheetReq = seen.filter(r => /stickers-core\.dc\.html/.test(r.url));
  check('the sticker sheet resolved', sheetReq.length > 0 && sheetReq.every(r => r.status === 200),
        sheetReq.map(r => r.status + ' ' + r.url).join(' | ') || 'never asked for');

  check('no iframe on the page', st.iframes === 0 && st.loading === 0, st.iframes + ' iframes, ' + st.loading + ' loading');

  // the camera
  const want = fitOf(made.open, { width: st.bench.w, height: st.bench.h });
  check('the camera framed data-open', Math.abs(st.zoom - want) / want <= TOL,
        'zoom ' + st.zoom.toFixed(4) + ' against the fit ' + want.toFixed(4) + ' of ' + rectStr(made.open) +
        ' at ' + Math.round(st.bench.w) + '×' + Math.round(st.bench.h));
  // world (0,0) is the picture's top-left corner: it sits at data-home 0,0 and nothing has moved it
  const sx = st.pic.x, sy = st.pic.y, z = st.zoom;
  const box = { x: sx + made.open.x * z, y: sy + made.open.y * z, w: made.open.w * z, h: made.open.h * z };
  const inside = box.x >= st.bench.x - 1 && box.y >= st.bench.y - 1 &&
                 box.x + box.w <= st.bench.x + st.bench.w + 1 && box.y + box.h <= st.bench.y + st.bench.h + 1;
  const dx = (box.x + box.w / 2) - (st.bench.x + st.bench.w / 2);
  const dy = (box.y + box.h / 2) - (st.bench.y + st.bench.h / 2);
  check('the rectangle is on screen and centred', inside && Math.abs(dx) <= CENTRE_TOL && Math.abs(dy) <= CENTRE_TOL,
        'off centre by ' + dx.toFixed(1) + ', ' + dy.toFixed(1) + ' px; inside ' + inside);

  // the picture
  const wantA = PIC.w / PIC.h, gotA = st.pic.w / st.pic.h;
  check('the picture measures to its asset\'s aspect', Math.abs(gotA - wantA) / wantA <= TOL,
        st.pic.w.toFixed(1) + ' × ' + st.pic.h.toFixed(1) + ' = ' + gotA.toFixed(4) + ' against ' + PIC.w + ':' + PIC.h + ' = ' + wantA.toFixed(4));
  check('the picture is drawn', st.picArtSvg && !!st.picImageBox && st.picImageBox.w > 0,
        st.picImageBox ? st.picImageBox.w.toFixed(1) + ' × ' + st.picImageBox.h.toFixed(1) + ' on screen' : 'no <image>');

  // the sticker
  check('the sheet extracted', st.stickerParts === 40 && st.hasBanner, st.stickerParts + ' parts, banner ' + st.hasBanner);
  check('it extracted in THIS page\'s colours', !!st.sheetPrimary && st.sheetPrimary === st.tokenPrimary,
        'sheet skPrimary ' + st.sheetPrimary + ' against --sk-primary ' + st.tokenPrimary);
  check('a live or tiled part exists', st.liveSvg > 0 || (st.tiles > 0 && st.kitStats && st.kitStats.sprites > 0),
        st.liveSvg + ' live, ' + st.tiles + ' tiles, ' + (st.kitStats ? st.kitStats.sprites : '?') + ' sprites');
  check('the page wears the theme', st.tokenPaper === made.theme.tokens['--paper'],
        '--paper ' + st.tokenPaper + ' against theme.js\'s ' + made.theme.tokens['--paper'] + '; --body ' + st.body);

  /* AND THE NARROW RECTANGLE, on a 390 × 729 phone: a fresh context (so no
     saved camera stands in for the read) and one question — did lab.js take
     data-open-narrow rather than data-open? The two rectangles differ in width
     by 596 units here, which is 0.29 against 0.25 of zoom: not a difference a
     coincidence would produce. */
  const nctx = await browser.newContext({ viewport: { width: 390, height: 729 }, deviceScaleFactor: 1 });
  const npage = await nctx.newPage();
  await npage.route('**/_lab2/**', r => r.fulfill({ status: 404, body: 'no' }));
  await npage.goto(URL, { waitUntil: 'load' });
  await npage.waitForTimeout(1500);
  const nst = await npage.evaluate(() => {
    const b = document.querySelector('#bench').getBoundingClientRect();
    return { zoom: window.Lab.zoom, bench: { w: b.width, h: b.height } };
  });
  await npage.screenshot({ path: path.join(OUT, 'template-narrow.png') });
  const wantN = fitOf(made.narrow, { width: nst.bench.w, height: nst.bench.h });
  const wantW = fitOf(made.open, { width: nst.bench.w, height: nst.bench.h });
  check('a narrow screen takes data-open-narrow', Math.abs(nst.zoom - wantN) / wantN <= TOL,
        'zoom ' + nst.zoom.toFixed(4) + ' against the narrow fit ' + wantN.toFixed(4) +
        ' (the wide one would be ' + wantW.toFixed(4) + ') at ' + Math.round(nst.bench.w) + '×' + Math.round(nst.bench.h));
  await nctx.close();

  const summary = {
    date: new Date().toISOString(),
    narrow: { zoom: nst.zoom, fit: wantN, wideFit: wantW, bench: nst.bench },
    url: URL, probe: 'games/_probe/index.html', bytes: made.bytes,
    open: rectStr(made.open), openNarrow: rectStr(made.narrow), pairing: made.pairing,
    style: made.style, zoom: st.zoom, fit: want, offCentre: { x: dx, y: dy },
    picture: { box: st.pic, aspect: gotA, want: wantA },
    kits: st.kitStats, live: st.liveSvg, tiles: st.tiles,
    responses: seen.length, notOk, failed,
    console: consoleLines.filter(l => l.type === 'error' || l.type === 'warning'),
    results
  };
  fs.writeFileSync(path.join(OUT, 'template.json'), JSON.stringify(summary, null, 2));

  const bad = results.filter(r => !r.ok).length;
  console.log('\n' + (results.length - bad) + '/' + results.length + ' PASS — ' + path.join(OUT, 'template.png'));
  await ctx.close(); await browser.close();
  process.exit(bad ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
