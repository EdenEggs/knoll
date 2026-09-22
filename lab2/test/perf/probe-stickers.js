/* lab2/test/perf/probe-stickers.js — sixty stickers, ten presets, six cameras
   USAGE (from site/, with the SANDBOX server up on 4322):

       node lab2/test/perf/probe-stickers.js [--presets flat,neon] [--cameras 20,166]
                                             [--out <label>] [--legms 2000] [--keep-open]

   This is the plan's §8 4.6, the measurement the sticker half of Phase 4 owes
   before anybody may say what a sticker costs. It GENERATES its own pages,
   loads each of them on the sandbox server, drives the camera to six zooms,
   and asks two questions per zoom: is the page still doing nothing while it
   stands still, and does anything take longer than two frame slots while it
   moves.

   THE METHOD IS lab2/perf/measure.js's, COPIED AND NOT REQUIRED. That file is
   the bench's pan-lag harness and it lives outside this sandbox; nothing in
   lab2/test may reach into it, so its five in-page routines — LOOK (camTo
   with no glide, then wait for lab:still), SETTLE (boots and tiers unchanged
   for a quiet period), IDLE (n ms of rAF deltas touching nothing), PAN (a
   time-driven out-and-back written on bench.scrollLeft, every rAF delta
   recorded) and stats() (median / p90 / p95 / max / over34 over a list of
   deltas) — are written out again here, shape for shape, so a number from
   this file and a number from that one mean the same thing. Its two
   conventions are kept as well: headed SYSTEM Chrome, because a headless
   page is not GPU-composited and is not representative of the bench; and the
   door blocked with a 404 before the first byte, so keep.js hears "no door"
   on its first knock and never posts — not on its thirty-second tick and not
   on pagehide.

   THE PAGE IT WRITES, one per preset, into perf/fixtures/ (gitignored):

     · It is games/_template.html — the real generated-game skeleton, not a
       page invented here — with its nine placeholders filled. So what is
       measured is the page that ships: the same script order, the same fetch
       stopgap round kits.js, the same two :root blocks in the same order.
       perf/fixtures/ is two folders under lab2/test, exactly as games/<slug>/
       is, so every ../../ in the template resolves the same way.
     · SIXTY sections, 10 across and 6 down, 200 world units apart from (0,0).
       Sixty is the plan's number. 200 is the pitch: a sticker's box is
       134 × 135 (the sheet's 128 plus the root drop-shadow's 6 and 7), so 200
       leaves 66 across and 65 down of clear paper — no sticker sits in its
       neighbour's shadow — and it is as tight as that allows, because the
       acceptance rule wants TWENTY LIVE FILTERED PARTS ON SCREEN at 166 % and
       a 1600 × 1000 viewport at 1.66 sees 964 × 602 of world. At 200 apart
       that viewport, widened by kits.js's 200-px live margin, holds
       twenty-four boxes; at 260 (the main bench's tray pitch) it holds
       twelve, and the rule could not be reached at all. The paper is
       1934 × 1135.
     · The parts are Appendix D's forty in order, then the first twenty again
       (part i is ORDER[i % 40]) — so every one of the forty is drawn at least
       once and the extra twenty are named by a rule rather than chosen.
     · data-open is the bounding box of the sixty plus Appendix E's 120 of
       margin, widened to the bench's 3200 : 1390 opening aspect — the
       template's own paragraph, and the same arithmetic verify-template.js
       does. Nothing in this run opens on it (every camera is driven), but a
       page that carries the bench's fallback rectangle frames empty paper,
       and a probe page you cannot open by hand is a probe page you cannot
       check by eye.

   THE COLOURS AND THE STYLE ARE MEASURED, NOT TYPED. The :root block is
   press/theme.js's answer for a real fixture, derived here in Node through
   press/tools/lib/fixture-theme.js (the same pipeline test-theme.js and
   shot-theme.js use) at the preset's own paletteSize, so the --sk-* roles
   reach the page already quantised, which is where the plan puts that step
   (§8 4.4, last row). Which fixture: NEONRUN for the dark presets and
   MOSSLIGHT for the light ones — and dark/light is asked of the derived
   theme (theme.dark came back true and false), not assumed. A preset counts
   as dark when its prototype carries a marker Appendix B derives from a dark
   plate: finish `glow` (from "dark + saturated + thin lines"), texture
   `scanlines` (from "dark + saturated"), texture `grunge` (Appendix C pairs
   it with horror and metal), or a pixel grid — the only measured grid in this
   repo is pixelfort's 4 and that plate's own theme is dark. That is neon,
   grunge and pixel; the other seven take mosslight. The style vector is
   Style.forPreset(preset, v), with v.pixel read off
   press/fixtures/pixelfort/stats.json — 4, measured in Phase 3, read from the
   file rather than typed — for the pixel preset and 0 elsewhere, and
   v.saturation Appendix B's normalisation of that fixture's own mean chroma
   (0.02 → 0, 0.2 → 1). The font pairing is Fonts.suggest()'s first answer for
   that preset and that theme, which is what the builder will ask.

   THE FLOOR IS MEASURED IN THE SAME RUN, on perf/fixtures/stickers-floor.html
   — the same template, the same scripts, the same rectangle, and NOT ONE
   SECTION on the paper — at the same six cameras. So "the idle median stayed
   at the display floor" is a comparison against this machine on this day and
   never against a number somebody wrote down once (about.md §9's 6 ms was a
   165 Hz screen in September and is history, not a threshold).

   THE SIX CAMERAS are the plan's: 20, 35, 50, 100, 166 and 400 %, each
   centring the middle of the paper (967, 568). Under 125 % the parts are
   sprites on tiles; over it kits.js draws every part near the screen live
   (ZOOM_NO_TILES), so 166 % is where the cost is, which is why the plan names
   that zoom twice. The pan distance per camera is measure.js's own —
   3500 / 2500 / 2000 / 1500 / 1200 / 800 px — capped to the scroll room that
   is actually left, and both numbers are reported, so a camera that ran into
   the rail says so instead of fighting the clamp.

   WHAT IT RECORDS, per preset per zoom: the idle median and the whole idle
   distribution, the worst frame (the larger of the idle max and the pan max,
   and which of the two it was), Kits.stats() entire — live, full, sway,
   tiles, sprites, spriteBytes, variants — and the count of LIVE PARTS
   CARRYING AN SVG FILTER, read two ways that must agree: kits.js's own
   `filtered` flag on the part record, and a walk of the live DOM for a
   surface the compositor has to filter (an element with filter:url(#…), or a
   root bloom).

   WHAT ACCEPTS A PRESET (the plan's two clauses, and one bookkeeping one):
     1. the idle median at every camera is at the floor — within half a
        floor-frame of it (idle.median ≤ 1.5 × the floor's median at that
        camera). Half a frame is the line because a page that has dropped into
        every-other-frame reads 2 × the floor: 1.5 cannot be reached by
        cadence alone, only by work.
     2. no frame at any camera exceeds 34 ms — two slots on a 60 Hz screen,
        the number ADDING.md §5 and measure.js already use.
     3. at 166 % there were at least 20 live filtered parts on screen, so
        clause 2 was asked the question the plan asks it. A preset with NO
        filtered parts (flat, cel, pixel — nothing in those vectors reaches a
        filter, kits.js's `filtered` rule) cannot meet this and is recorded
        `n/a`, not failed.

   IF WOBBLE OR GLOW FAILS AT 166 %, the plan says to lower that preset's
   share of SWAY_MAX in kits.js's SHEETS.stickers.swayShare and measure again;
   shareOf() there already reads either a number or a per-preset object. This
   script does not edit kits.js — it prints what to write.

   WHERE THE RESULTS GO, AND WHY A NARROWED RUN DOES NOT GO THERE.
   perf/results/stickers/ is the folder features/stickers-core.dc.html's own
   header cites as the evidence for all ten presets, so a run that measures
   three of them must not land on it: a partial summary.json would leave the
   shipped sheet pointing at a folder that no longer holds the numbers it
   quotes, and nothing would say so. The label is therefore `stickers` only
   when the WHOLE table is measured — every preset at every camera — and
   `stickers-partial` the moment --presets or --cameras narrows the run;
   --out <label> overrides either. (Written 2026-09-07 by the Phase-4
   verifier, who re-ran three presets to check the builder's numbers and had
   to put the ten-preset record back from a copy afterwards.)

   Results: perf/results/<label>/summary.json (CONTRACTS §11) and two PNGs
   per preset, at 166 % (a live camera) and 35 % (a sprite one). Viewport
   1600 × 1000 in a 1616 × 1110 window at DPR 1, the numbers every bench
   measurement in this folder is taken at. */
'use strict';
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const HOME = path.resolve(__dirname, '..');                    // lab2/test
const FIX = path.join(__dirname, 'fixtures');                  // the generated pages (gitignored)
const ORIGIN = 'http://localhost:4322';
const PAGE_URL = p => ORIGIN + '/lab2/test/perf/fixtures/' + p;

// ── the page's numbers (every one of them argued in the header) ───────────
const COLS = 10, ROWS = 6, STEP = 200, BOX_W = 134, BOX_H = 135;
const MARGIN = 120;                       // Appendix E's margin round a composition
const ASPECT = 3200 / 1390;               // the bench's opening rectangle since 2026-09-04 (NOTES §D.2)
// ── the run's numbers ─────────────────────────────────────────────────────
const VIEW = { width: 1600, height: 1000 };
const WINDOW = { width: 1616, height: 1110 };
const IDLE_MS = 1000;                     // measure.js's idle reference
const DEFAULT_LEG_MS = 2000;              // one leg of the out-and-back, measure.js's
const FRAME_MS = 34;                      // two slots on a 60 Hz screen — ADDING.md §5, measure.js
const FLOOR_SLACK = 1.5;                  // half a floor-frame; 2.0 would be every-other-frame
const LIVE_FILTERED_WANTED = 20;          // the plan's "20 live filtered parts on screen"
const SHOT_AT = [1.66, 0.35];             // one live camera, one sprite camera
const CAMERAS = [
  { key: 'z20',  zoom: 0.20, pan: 3500 },
  { key: 'z35',  zoom: 0.35, pan: 2500 },
  { key: 'z50',  zoom: 0.50, pan: 2000 },
  { key: 'z100', zoom: 1.00, pan: 1500 },
  { key: 'z166', zoom: 1.66, pan: 1200 },
  { key: 'z400', zoom: 4.00, pan: 800  },
];
/* the presets whose vectors reach a filter at all — kits.js's own rule,
   written out: (lineWobble > 0 && lineShow) || shading soft || shading
   painterly || finish glow. Computed rather than listed, so a preset added to
   Appendix C is classified by the same sentence. */
const canFilter = p => (p.lineWobble > 0 && p.lineShow !== false) || p.shading === 'soft' || p.shading === 'painterly' || p.finish === 'glow';
// a preset is dark when its prototype carries a marker Appendix B derives from
// a dark plate — see THE COLOURS above
const isDark = p => p.finish === 'glow' || p.texture === 'scanlines' || p.texture === 'grunge' || !!p.pixel;

// ── args ──────────────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
const opt = (name, dflt) => { const i = argv.indexOf('--' + name); if (i < 0) return dflt; const v = argv[i + 1]; return v && !v.startsWith('--') ? v : true; };
const keepOpen = argv.includes('--keep-open');
const LEG_MS = Math.max(200, +opt('legms', DEFAULT_LEG_MS) || DEFAULT_LEG_MS);
/* the results folder — WHERE THE RESULTS GO in the header. `stickers` only
   for the whole table; anything narrower writes beside it, so the sheet's
   cited record is never overwritten by a three-preset check. */
const NARROWED = !!opt('presets', null) || !!opt('cameras', null);
const OUT_LABEL = String(opt('out', null) || (NARROWED ? 'stickers-partial' : 'stickers'));
const OUT = path.join(__dirname, 'results', OUT_LABEL);

// ── helpers, measure.js's ─────────────────────────────────────────────────
const r1 = x => Math.round(x * 10) / 10;
const mb = b => Math.round(b / 1048576 * 10) / 10;
const kb = b => Math.round(b / 1024);
function stats(deltas) {
  const a = deltas.slice().sort((x, y) => x - y);
  const q = p => (a.length ? a[Math.min(a.length - 1, Math.floor(p * a.length))] : 0);
  const sum = a.reduce((s, x) => s + x, 0);
  return { n: a.length, median: r1(q(0.5)), p90: r1(q(0.9)), p95: r1(q(0.95)), max: r1(a.length ? a[a.length - 1] : 0),
           mean: r1(a.length ? sum / a.length : 0), over34: a.filter(x => x > 34).length, over50: a.filter(x => x > 50).length,
           fps: r1(a.length && sum ? a.length / (sum / 1000) : 0) };
}

// ── the pages ─────────────────────────────────────────────────────────────
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const rectStr = r => [r.x, r.y, r.w, r.h].join(',');
const upper = id => id.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join(' ');

/* the sixty boxes, in the order the sections are written */
function slots(order) {
  const out = [];
  for (let i = 0; i < COLS * ROWS; i++) {
    out.push({ i, part: order[i % order.length], x: (i % COLS) * STEP, y: Math.floor(i / COLS) * STEP, w: BOX_W, h: BOX_H });
  }
  return out;
}
/* the bounding box plus MARGIN, widened to the bench's aspect about its own
   centre — the template's paragraph, as verify-template.js writes it */
function openRect(boxes, widen) {
  const x0 = Math.min(...boxes.map(b => b.x)), y0 = Math.min(...boxes.map(b => b.y));
  const x1 = Math.max(...boxes.map(b => b.x + b.w)), y1 = Math.max(...boxes.map(b => b.y + b.h));
  let x = x0 - MARGIN, y = y0 - MARGIN, w = (x1 - x0) + MARGIN * 2, h = (y1 - y0) + MARGIN * 2;
  if (widen) {
    if (w / h < ASPECT) { const t = Math.round(h * ASPECT); x -= Math.round((t - w) / 2); w = t; }
    else { const t = Math.round(w / ASPECT); y -= Math.round((t - h) / 2); h = t; }
  }
  return { x, y, w, h };
}
/* the five-line kit section, the shape index.html's tray and the copies block
   both write */
function section(s) {
  return [
    '  <section class="gz" id="gz-sk-' + s.i + '" data-gizmo="sk-' + s.i + '"',
    '           data-src="../../features/stickers-core.dc.html#part=' + s.part + '" data-w="' + BOX_W + '" data-h="' + BOX_H + '"',
    '           data-home-x="' + s.x + '" data-home-y="' + s.y + '" style="width:' + BOX_W + 'px;height:' + BOX_H + 'px"',
    '           aria-label="' + esc(upper(s.part)) + '">',
    '    <div class="gz-art"></div>',
    '    <span class="gz-dim" aria-hidden="true"></span>',
    '    <button type="button" class="gz-size" data-nodrag aria-label="re-cut it — double-click to fit it to its drawing"></button>',
    '  </section>'
  ].join('\n');
}

let TEMPLATE = null, MODULES = null, PIXEL_SIZE = null;
const THEMES = {};
function modules() {
  if (MODULES) return MODULES;
  const load = require(path.join(HOME, 'press', 'tools', 'lib', 'browser-module.js'));
  const win = load(path.join(HOME, 'press', 'palette.js'));
  load(path.join(HOME, 'press', 'fonts.js'), win);
  load(path.join(HOME, 'press', 'style.js'), win);
  MODULES = { win, themeOf: require(path.join(HOME, 'press', 'tools', 'lib', 'fixture-theme.js')).themeOf };
  return MODULES;
}
/* press/theme.js's answer for a fixture at a palette size, derived once and
   kept: ten presets share four of these between them */
function themeFor(fixture, paletteSize, pairing) {
  const key = fixture + '/' + paletteSize + '/' + pairing;
  if (!THEMES[key]) THEMES[key] = modules().themeOf(path.join(HOME, 'press', 'fixtures', fixture), { paletteSize, fonts: pairing });
  return THEMES[key];
}
/* Appendix B's normalisation of the mean chroma: 0.02 → 0, 0.2 → 1 */
const satNorm = s => Math.max(0, Math.min(1, (s - 0.02) / 0.18));

function fill(values) {
  if (!TEMPLATE) TEMPLATE = fs.readFileSync(path.join(HOME, 'games', '_template.html'), 'utf8');
  let html = TEMPLATE;
  for (const k of Object.keys(values)) html = html.split(k).join(values[k]);
  const left = html.match(/\{\{[A-Z_]+\}\}/g);
  if (left) throw new Error('placeholders left unfilled: ' + left.join(', '));
  return html;
}

/* one preset's page. `order` is the forty of Appendix D. */
function buildPreset(preset, order) {
  const { win } = modules();
  const proto = win.Style.PRESETS[preset];
  if (PIXEL_SIZE == null) PIXEL_SIZE = JSON.parse(fs.readFileSync(path.join(HOME, 'press', 'fixtures', 'pixelfort', 'stats.json'), 'utf8')).stats.pixelSize;
  const measuredPixel = proto.pixel === 'measured' ? PIXEL_SIZE : proto.pixel;
  const dark = isDark(Object.assign({}, proto, { pixel: measuredPixel }));
  const fixture = dark ? 'neonrun' : 'mosslight';
  /* the pairing wants the theme's own dark flag and its saturation, and the
     theme wants the pairing: so it is derived once with the house pairing to
     ask the two questions, and again with the answer. Both derivations are
     cached, so this is one extra pass over one fixture and not ten. */
  const first = themeFor(fixture, proto.paletteSize, 'clean');
  const pairing = win.Fonts.suggest({ style: preset, dark: first.theme.dark, saturation: first.saturation })[0];
  const t = themeFor(fixture, proto.paletteSize, pairing);
  const style = win.Style.forPreset(preset, { pixel: measuredPixel, saturation: satNorm(t.saturation) });
  const boxes = slots(order);
  const open = openRect(boxes, true);
  const narrow = openRect(boxes.filter(b => b.x < STEP * 2), false);   // two columns: what a phone's width binds on
  const preloads = win.Fonts.preloads(pairing).map(f => '<link rel="preload" href="../../fonts/' + f + '" as="font" type="font/woff2" crossorigin>').join('\n');
  const html = fill({
    '{{SLUG}}': 'probe-stickers-' + preset,
    '{{TITLE}}': 'sixty stickers — ' + preset + ' (perf probe)',
    '{{DESCRIPTION_META}}': 'Generated by perf/probe-stickers.js; not a page anybody is meant to read.',
    '{{TOKENS_CSS}}': t.theme.css,
    '{{FONT_PRELOADS}}': preloads,
    '{{SK_STYLE}}': JSON.stringify(style),
    '{{OPEN}}': rectStr(open),
    '{{OPEN_NARROW}}': rectStr(narrow),
    '{{SECTIONS}}': boxes.map(section).join('\n')
  });
  const file = 'stickers-' + preset + '.html';
  fs.writeFileSync(path.join(FIX, file), html);
  return { preset, file, fixture, dark: t.theme.dark, pairing, paletteSize: proto.paletteSize, style,
           canFilter: canFilter(style),
           sk: Object.fromEntries(Object.entries(t.theme.tokens).filter(function (e) { return e[0].indexOf('--sk-') === 0; })),
           open, narrow, sections: boxes.length, bytes: html.length };
}

/* the floor: the same template, the same scripts, the same rectangle, and not
   one section on the paper */
function buildFloor(order) {
  const { win } = modules();
  const t = themeFor('mosslight', 0, 'clean');
  const open = openRect(slots(order), true);
  const html = fill({
    '{{SLUG}}': 'probe-stickers-floor',
    '{{TITLE}}': 'the display floor — an empty bench (perf probe)',
    '{{DESCRIPTION_META}}': 'Generated by perf/probe-stickers.js; the same page with nothing on the paper.',
    '{{TOKENS_CSS}}': t.theme.css,
    '{{FONT_PRELOADS}}': '',
    '{{SK_STYLE}}': JSON.stringify(win.Style.forPreset('flat', { pixel: 0, saturation: satNorm(t.saturation) })),
    '{{OPEN}}': rectStr(open),
    '{{OPEN_NARROW}}': rectStr(open),
    '{{SECTIONS}}': '  <!-- NOTHING. This is the floor page: the same skeleton, the same\n' +
                    '       scripts in the same order, the same opening rectangle, and no\n' +
                    '       sections at all — so what it reads at a camera is what this\n' +
                    '       machine and this browser cost with the bench doing nothing. -->'
  });
  fs.writeFileSync(path.join(FIX, 'stickers-floor.html'), html);
  return { file: 'stickers-floor.html', open, bytes: html.length };
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
/* boots and tiers settled. The bench's own signature plus the kit's: a
   sticker page boots no documents at all, so `.gz.booted` alone would say
   "settled" while forty sprites were still being rasterised. */
const SETTLE = ({ quiet, cap }) => new Promise(resolve => {
  const t0 = performance.now();
  let last = '', since = performance.now();
  const tick = () => {
    const k = window.Kits ? Kits.stats() : null;
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
const STILL = ms => new Promise(resolve => {
  let done = false;
  const fin = why => { if (!done) { done = true; resolve(why); } };
  document.addEventListener('lab:still', () => fin('still'), { once: true });
  setTimeout(() => fin('timeout'), ms);
});
const IDLE = ms => new Promise(resolve => {
  const d = []; let last = 0; const t0 = performance.now();
  const step = now => { if (last) d.push(now - last); last = now; if (now - t0 < ms) requestAnimationFrame(step); else resolve(d); };
  requestAnimationFrame(step);
});
const PAN = ({ dist, legMs }) => new Promise(resolve => {
  const Lab = window.Lab, bench = Lab.bench;
  const start = bench.scrollLeft;
  const deltas = [];
  let last = 0, leg = 0, legT0 = 0, maxScroll = start;
  const step = now => {
    if (!legT0) legT0 = now;
    if (last) deltas.push(now - last);
    last = now;
    const f = Math.min(1, (now - legT0) / legMs);
    bench.scrollLeft = leg === 0 ? start + dist * f : start + dist * (1 - f);
    if (bench.scrollLeft > maxScroll) maxScroll = bench.scrollLeft;
    if (f >= 1) {
      if (leg === 0) { leg = 1; legT0 = now; }
      else return resolve({ deltas, start, end: bench.scrollLeft, reached: maxScroll, wanted: start + dist });
    }
    requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
});

/* what the page can say about itself. The live filtered count is asked TWICE
   and both answers are kept: kits.js's own `filtered` flag on the part
   record, and a walk of the live DOM for a surface the compositor has to
   filter. They should agree; where they do not, the record is the claim and
   the DOM is the witness. */
const SNAPSHOT = () => {
  const K = window.Kits;
  const st = K ? K.stats() : null;
  let liveFiltered = 0, liveParts = 0, livePixel = 0;
  if (K) {
    const sh = K.sheets.stickers;
    K.recs.forEach(r => {
      if (!r.live) return;
      liveParts++;
      const P = sh && ((r.vkey && sh.variants[r.vkey]) || sh.parts[r.part]);
      if (P && P.filtered) liveFiltered++;
      if (P && P.pixel) livePixel++;
    });
  }
  let domFiltered = 0;
  document.querySelectorAll('#bench-world .gz[data-kit] > .gz-art > svg').forEach(svg => {
    const root = svg.getAttribute('style') || '';
    const inner = svg.querySelector('[filter]');
    if (/url\(#/.test(root) || (inner && /url\(#/.test(inner.getAttribute('filter') || '')) || /drop-shadow\(\s*0px\s+0px/.test(root)) domFiltered++;
  });
  return {
    kits: st, liveParts, liveFiltered, livePixel, domFiltered,
    canvases: document.querySelectorAll('#bench-world .gz[data-kit] > .gz-art > canvas').length,
    docs: window.Frames ? Frames.panels.filter(p => p.loading).length : -1,
    iframes: document.querySelectorAll('iframe').length,
    dom: document.querySelectorAll('*').length,
    zoom: window.Lab.zoom,
    scroll: { l: Lab.bench.scrollLeft, t: Lab.bench.scrollTop, w: Lab.bench.scrollWidth, cw: Lab.bench.clientWidth },
    heap: (performance.memory && performance.memory.usedJSHeapSize) || null,
  };
};

// ── the run ───────────────────────────────────────────────────────────────
(async () => {
  const t0 = Date.now();
  fs.mkdirSync(FIX, { recursive: true });
  fs.mkdirSync(path.join(FIX, 'posters'), { recursive: true });
  fs.mkdirSync(OUT, { recursive: true });
  /* frames.js asks for posters/index.json relative to the page before anything
     boots (the template's own paragraph); two bytes here keep the run's
     response log clean, and a game folder carries the same file for the same
     reason. */
  fs.writeFileSync(path.join(FIX, 'posters', 'index.json'), '{}\n');

  const { TAGS } = require(path.join(HOME, 'press', 'tools', 'build-sheet.js'));
  const ORDER = TAGS.map(t => t[0]);
  const { win } = modules();
  const presetNames = Object.keys(win.Style.PRESETS);
  const only = opt('presets', null);
  const presets = only ? presetNames.filter(p => String(only).split(',').map(s => s.trim()).indexOf(p) >= 0) : presetNames;
  if (!presets.length) { console.error('no preset matched --presets ' + only + '; ids: ' + presetNames.join(',')); process.exit(2); }
  const camOnly = opt('cameras', null);
  const cams = camOnly ? CAMERAS.filter(c => String(camOnly).split(',').map(s => s.trim()).indexOf(String(Math.round(c.zoom * 100))) >= 0) : CAMERAS;
  if (!cams.length) { console.error('no camera matched --cameras ' + camOnly); process.exit(2); }

  const floorPage = buildFloor(ORDER);
  const built = presets.map(p => buildPreset(p, ORDER));
  const boxes = slots(ORDER);
  const ext = { x1: Math.max(...boxes.map(b => b.x + b.w)), y1: Math.max(...boxes.map(b => b.y + b.h)) };
  const CENTRE = { x: Math.round(ext.x1 / 2), y: Math.round(ext.y1 / 2) };
  console.log('results → perf/results/' + OUT_LABEL + '/' + (NARROWED ? '   (a narrowed run: ' + presets.length + ' of ' + presetNames.length + ' presets, ' + cams.length + ' of ' + CAMERAS.length + ' cameras — the ten-preset record in results/stickers/ is left alone)' : '   (the whole table)'));
  console.log('pages written into perf/fixtures/: ' + (built.length + 1) + ' (' + built.map(b => b.preset).join(', ') + ', floor)');
  console.log('  sixty sections, ' + COLS + ' x ' + ROWS + ' at ' + STEP + ', paper ' + ext.x1 + ' x ' + ext.y1 + ', centre ' + CENTRE.x + ',' + CENTRE.y);
  for (const b of built) console.log('  ' + b.preset.padEnd(16) + b.fixture.padEnd(10) + (b.dark ? 'dark ' : 'light') + '  pairing ' + b.pairing.padEnd(10) + ' paletteSize ' + String(b.paletteSize).padEnd(3) + ' filters ' + (b.canFilter ? 'yes' : 'no ') + '  ' + kb(b.bytes) + ' K');

  const browser = await chromium.launch({ channel: 'chrome', headless: false,
    args: ['--window-size=' + WINDOW.width + ',' + WINDOW.height, '--window-position=0,0'] });

  /* one page, six cameras. A fresh context every time: no saved camera, no
     saved positions, and the door blocked before the first byte. */
  async function runPage(url, label, shoot) {
    const ctx = await browser.newContext({ viewport: VIEW, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    await page.route('**/_lab2/**', r => r.fulfill({ status: 404, body: 'no door' }));
    const errors = [], pageErrors = [], notOk = [], doorKnocks = [];
    /* the blocked door's own 404 arrives as a console error with the door's
       URL attached, exactly as it does on the bench — smoke-bench.js and
       verify-tray.js except it by the same test, and so does this. */
    page.on('console', m => { const u = (m.location() || {}).url || ''; if (m.type() === 'error' && !u.includes('/_lab2/')) errors.push(m.text() + (u ? ' @ ' + u : '')); });
    page.on('pageerror', e => pageErrors.push(String(e.message || e)));
    page.on('response', r => { if (r.status() >= 400 && !r.url().includes('/_lab2/')) notOk.push(r.status() + ' ' + r.url()); });
    page.on('request', q => { if (q.url().includes('/_lab2/')) doorKnocks.push(q.method() + ' ' + q.url()); });

    const bootT0 = Date.now();
    await page.goto(url, { waitUntil: 'load' });
    await page.waitForFunction(() => window.Lab && window.Frames, null, { timeout: 30000 });
    /* the sheets are fetched the moment kits.js runs; wait for the stickers to
       have arrived so the first camera is not measured mid-extraction. The
       floor page has no sticker section but kits.js fetches every sheet in
       SHEETS at boot anyway, so the same wait holds there. */
    const sheetsIn = await page.waitForFunction(() => window.Kits && Kits.stats && Kits.stats().sheets.indexOf('stickers') >= 0, null, { timeout: 30000 })
      .then(() => true, () => false);
    await page.evaluate(SETTLE, { quiet: 1200, cap: 20000 });
    const bootMs = Date.now() - bootT0;

    const rows = [];
    for (const c of cams) {
      const looked = await page.evaluate(LOOK, { z: c.zoom, wx: CENTRE.x, wy: CENTRE.y });
      const settle = await page.evaluate(SETTLE, { quiet: 1200, cap: 20000 });
      const before = await page.evaluate(SNAPSHOT);
      const idle = stats(await page.evaluate(IDLE, IDLE_MS));
      const room = before.scroll.w - before.scroll.cw - before.scroll.l;
      const dist = Math.max(0, Math.min(c.pan, Math.floor(room)));
      const panned = await page.evaluate(PAN, { dist, legMs: LEG_MS });
      const pan = stats(panned.deltas);
      await page.evaluate(STILL, 600);
      await page.evaluate(SETTLE, { quiet: 1200, cap: 20000 });
      const after = await page.evaluate(SNAPSHOT);
      let shot = null;
      if (shoot && SHOT_AT.indexOf(c.zoom) >= 0) {
        shot = label + '-' + c.key + '.png';
        await page.screenshot({ path: path.join(OUT, shot), type: 'png' });
      }
      const worst = Math.max(idle.max, pan.max);
      rows.push({ camera: c.key, zoom: c.zoom, looked, settle,
        panRequested: c.pan, panActual: dist, railed: dist < c.pan,
        idle, pan, worst, worstFrom: idle.max >= pan.max ? 'idle' : 'pan',
        live: before.liveParts, liveFiltered: before.liveFiltered, domFiltered: before.domFiltered,
        livePixel: before.livePixel, canvases: before.canvases,
        kits: before.kits, docs: before.docs, iframes: before.iframes, dom: before.dom,
        heapMB: before.heap == null ? null : mb(before.heap),
        afterLive: after.liveParts, afterLiveFiltered: after.liveFiltered,
        shot });
      console.log('    ' + c.key.padEnd(5) + ' idle med ' + String(idle.median).padEnd(5) + 'max ' + String(idle.max).padEnd(6) +
        '| pan ' + String(dist).padEnd(5) + (dist < c.pan ? '*' : ' ') + 'med ' + String(pan.median).padEnd(5) + 'max ' + String(pan.max).padEnd(6) +
        '| live ' + String(before.liveParts).padEnd(3) + ' filt ' + String(before.liveFiltered).padEnd(3) + '(' + String(before.domFiltered).padEnd(3) + ')' +
        ' sway ' + String(before.kits ? before.kits.sway : '-').padEnd(3) + ' full ' + String(before.kits ? before.kits.full : '-').padEnd(3) +
        ' tiles ' + String(before.kits ? before.kits.tiles : '-').padEnd(3) + ' sprite ' + (before.kits ? kb(before.kits.spriteBytes) + 'K' : '-'));
    }
    await ctx.close();
    return { url, bootMs, sheetsIn, rows, errors, pageErrors, notOk, doorKnocks };
  }

  console.log('\nthe floor — the same page with nothing on the paper');
  const floor = await runPage(PAGE_URL(floorPage.file), 'floor', false);
  const floorAt = {};
  floor.rows.forEach(r => { floorAt[r.camera] = r.idle.median; });

  const runs = [];
  for (const b of built) {
    console.log('\n' + b.preset + ' — ' + b.fixture + ' ' + JSON.stringify(b.style));
    const run = await runPage(PAGE_URL(b.file), b.preset, true);
    /* the verdict, clause by clause (the header names all three) */
    const idleOk = run.rows.every(r => r.idle.median <= floorAt[r.camera] * FLOOR_SLACK);
    const frameOk = run.rows.every(r => r.worst <= FRAME_MS);
    const at166 = run.rows.filter(r => r.zoom === 1.66)[0];
    const filteredOk = !b.canFilter ? 'n/a' : !!(at166 && at166.liveFiltered >= LIVE_FILTERED_WANTED);
    const accept = idleOk && frameOk && filteredOk !== false;
    const worst = Math.max.apply(null, run.rows.map(r => r.worst));
    runs.push(Object.assign({}, b, run, { idleOk, frameOk, filteredOk, accept, worst,
      idleWorstOverFloor: r1(Math.max.apply(null, run.rows.map(r => r.idle.median / (floorAt[r.camera] || 1)))) }));
    console.log('  → ' + (accept ? 'ACCEPT' : 'REJECT') + ' (idle ' + (idleOk ? 'at floor' : 'ABOVE FLOOR') +
      ', worst frame ' + worst + ' ms' + (frameOk ? '' : ' — OVER 34') +
      ', live filtered at 166 % ' + (at166 ? at166.liveFiltered : '-') +
      (filteredOk === 'n/a' ? ' (n/a — nothing in this preset reaches a filter)' : filteredOk ? '' : ' — UNDER 20') + ')');
  }

  const summary = {
    when: new Date().toISOString(), chrome: await browser.version(),
    /* what this run actually asked, so a folder of numbers can never be read
       as the whole table when it is three presets at two cameras */
    label: OUT_LABEL, narrowed: NARROWED, whole: !NARROWED,
    presetsMeasured: presets, camerasMeasured: cams.map(c => c.key),
    viewport: Object.assign({ deviceScaleFactor: 1 }, VIEW), window: WINDOW, headed: true, legMs: LEG_MS,
    page: { cols: COLS, rows: ROWS, step: STEP, box: [BOX_W, BOX_H], sections: COLS * ROWS,
            paper: [ext.x1, ext.y1], centre: CENTRE, open: rectStr(openRect(boxes, true)) },
    accept: { floorSlack: FLOOR_SLACK, frameMs: FRAME_MS, liveFilteredWanted: LIVE_FILTERED_WANTED },
    floor: { file: floorPage.file, byCamera: floorAt, run: floor },
    presets: runs,
    swayShare: (() => { const o = {}; runs.forEach(r => { o[r.preset] = r.accept ? 1 : 'LOWER ME'; }); return o; })(),
    totalMs: Date.now() - t0,
  };
  fs.writeFileSync(path.join(OUT, 'summary.json'), JSON.stringify(summary, null, 2));

  // ── the table ───────────────────────────────────────────────────────────
  const W = [16, 6, 9, 10, 7, 6, 6, 6, 10, 8, 6];
  const line = c => c.map((x, i) => String(x).padEnd(W[i])).join(' ');
  console.log('\nFLOOR (the same page, empty, this run) — idle median per camera');
  console.log('  ' + cams.map(c => c.key + ' ' + floorAt[c.key] + ' ms').join('   '));
  console.log('');
  console.log(line(['preset', 'zoom', 'idle-med', 'floor-med', 'worst', 'from', 'live', 'filt', 'sway/full', 'sprite', 'docs']));
  for (const r of runs) for (const row of r.rows) {
    console.log(line([row === r.rows[0] ? r.preset : '', Math.round(row.zoom * 100) + '%', row.idle.median, floorAt[row.camera],
      row.worst, row.worstFrom, row.live, row.liveFiltered, (row.kits ? row.kits.sway + '/' + row.kits.full : '-'),
      (row.kits ? kb(row.kits.spriteBytes) + 'K' : '-'), row.docs]));
  }
  console.log('\nVERDICT');
  for (const r of runs) console.log('  ' + r.preset.padEnd(16) + (r.accept ? 'ACCEPT' : 'REJECT').padEnd(8) +
    'idle ≤ ' + r.idleWorstOverFloor + ' × floor, worst ' + r.worst + ' ms, live filtered @166 % ' +
    ((r.rows.filter(x => x.zoom === 1.66)[0] || {}).liveFiltered) +
    (r.canFilter ? '' : '  (no filtered parts in this preset)'));
  const bad = runs.filter(r => !r.accept);
  const noise = runs.reduce((n, r) => n + r.errors.length + r.pageErrors.length + r.notOk.length, 0) + floor.errors.length + floor.pageErrors.length + floor.notOk.length;
  console.log('\nconsole errors / page errors / bad responses across every page: ' + noise);
  if (noise) for (const r of [floor].concat(runs)) if (r.errors.length || r.pageErrors.length || r.notOk.length) console.log('  ' + r.url + ': ' + r.errors.concat(r.pageErrors, r.notOk).join(' | '));
  console.log('wrote ' + path.relative(process.cwd(), OUT).replace(/\\/g, '/') + '/summary.json in ' + Math.round((Date.now() - t0) / 1000) + 's');
  if (bad.length) console.log('REJECTED: ' + bad.map(r => r.preset).join(', ') + ' — lower SHEETS.stickers.swayShare for those in kits.js and run again');

  if (keepOpen) { console.log('--keep-open: leaving Chrome up; ctrl+c to end'); await new Promise(() => {}); }
  await browser.close();
  process.exit(bad.length ? 1 : 0);
})().catch(e => { console.error(e && e.stack || e); process.exit(1); });
