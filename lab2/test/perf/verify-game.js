#!/usr/bin/env node
/* ─── VERIFY-GAME ─────────────────────────────────────────────────────────
   perf/verify-game.js — PRESS-TABLE-PLAN.md §9 5.5, the verifier the plan's
   Phase 5 acceptance line names and nobody had written. It does not ask
   whether a generated page *looks* built; it tries to refute the claim that
   it WORKS, one measurable question at a time, and reports the number
   whether the answer is yes or no.

   USAGE (from site/, with the sandbox server up on 4322):

       node lab2/test/perf/verify-game.js                  # pixelfort, mosslight, neonrun
       node lab2/test/perf/verify-game.js neonrun          # just the one
       node lab2/test/perf/verify-game.js --no-door        # skip step 6 (writes no file at all)

   RESTART THE SANDBOX SERVER BEFORE A RUN THAT INCLUDES STEP 6.
   serve.js keeps one `index.html.keep-bak` per FILE per PROCESS (its
   `backedUp` map, serve.js line 389), so a page the server has already
   written once this run cannot produce a fresh backup and the check is
   unanswerable rather than failed. The script says so in that case instead
   of pretending. It is the same warning `verify-sheet.js` carries, for the
   same reason.

   IT WRITES `games/<slug>/index.html` FOR REAL, exactly as `verify-keep.js`
   does and for the same reason — an autosave that is faked is not an
   autosave. Every page's `index.html` and `index.html.keep-bak` are copied
   into `results/game/<slug>/` before the browser opens and put back in a
   `finally`, byte-identity asserted; the restore REFUSES to overwrite a file
   that changed in a way this run cannot account for (its own `data-home-z`
   promotions and the one sticker it dragged) and says which. Every step but
   step 6 answers `/_lab2/**` 404 in the page, so the door is shut and
   nothing is written by merely looking.

   THE EIGHT QUESTIONS, in the plan's order, and one in front of them:

     0 · THE PAGE STANDS WHERE IT WAS BUILT. `game.json`'s layout expanded
         the way `build-game.js` expands it, against every section's
         `data-home-x/y/z`. It is asked FIRST because step 6 writes the file
         and puts it back against a snapshot of its own start: a drop left
         behind by a run that ended badly would otherwise be inherited in
         silence, run after run, each one calling the file restored because
         each is comparing it with itself. It happened.
     1 · IT BOOTS. Zero console errors, zero page errors, zero responses
         ≥ 400. The only 4xx allowed is the door THIS SCRIPT shuts, counted
         out by pathname and reported by count so a page that knocks twice
         is visible.
     2 · NO DOCUMENTS, EVER (plan §0.3's floor). `Frames.panels.filter(p =>
         p.loading).length` is 0 at the opening camera, at 20 % and at 100 %
         — and the count of DOCUMENT panels is 0 with it, because a panel
         that is not loading because it FINISHED loading would pass the
         plan's line and still be a document. A document panel is one with
         no `.gz-art` to draw in this page: `frames.js`'s adopt() sets
         `p.art` for a prop and for a kit part and leaves it null only for a
         section it has to put in a frame (frames.js line 1245), so
         `panels.filter(p => !p.art)` is the count and `Frames.panels.length`
         is NOT — it is every section on the page, props and stickers with
         it. `<iframe>` count 0 at all three cameras.
     3 · EVERY PICTURE IS ITS OWN SHAPE. A plain `gz-pic` measures to its
         asset's aspect within ASPECT_TOL, read from `game.json`'s manifest.
         A `gz-shot` does NOT: it is a COVER crop into a frame's window
         (CONTRACTS §8), so its box measures to the WINDOW's aspect and the
         asset's aspect is carried by the nested `<svg>`'s viewBox — both
         are asserted, separately, because one rule for the two would have
         to be wrong about one of them.
     4 · EVERY SCREENSHOT IS ON THE PAGE, IN ITS FRAME. Four readings:
         a · the arithmetic, recomputed here from the SHEET's own `slots`
             rect (read off `features/stickers-core.dc.html`'s data-props on
             disk, not from build-game.js) and the layout's slot — the
             page's box must agree within BOX_TOL world units;
         b · the pile — the picture's section is the frame's next sibling
             and one `data-home-z` above it (markup order is pile order);
         c · where the frame's window ACTUALLY lands, mapped through the
             box `kits.js` re-cut and the origin it seated the drawing at
             (`svg.style.left`), in world units off layout properties so the
             sway animation cannot move the answer. The picture must lie
             inside the frame's own box; the offset from the window's centre
             is reported (OPEN.md §2's known-imperfect, measured per page);
         d · IT IS PAINTED. A GRID × GRID lattice of screen pixels inside
             the window, off a real screenshot: at most PAPER_MAX of them
             may be the slot's placeholder colour (`--sk-paper`, which is
             what an empty frame shows), and the same lattice taken off a
             canvas COVER-CROP of each of the game's screenshots — the crop
             the nested svg's `slice` makes, at the window's own aspect —
             must be nearest THIS shot's asset. Nearest by the mean absolute
             difference over all 81 points and not by mean colour: four
             plates of one game share a palette (measured on neonrun: the
             mean-colour reading picked the wrong plate twice), and it is
             the STRUCTURE that says which picture is in which frame. So a
             page that draws the same screenshot four times fails a check a
             count of four cannot.
     5 · THE STICKERS WEAR THE PAGE'S COLOURS. Every sticker is brought
         live (camera to 100 % over it) and read two ways: the DOM's own
         fills and strokes for an SVG part, `getImageData` for a `pixel`
         style's canvas, and — for both — the sticker's OWN pixels, isolated
         by shooting its box twice, once as it stands and once with the
         section hidden, and keeping what changed. A section's box is bigger
         than its drawing and the paper and the page show through the rest
         of it; without the difference, a colour found in the box may belong
         to whatever is behind it (measured: a first cut read the sheet's
         own `#26212a` inside a frame's box and it was not the frame).
         HOW A RESTYLED COLOUR IS TOLD FROM A WRONG ONE: `kits.js`'s
         restyle() never invents a colour. It removes layers, swaps a fill
         for a `url(#pattern)`, lays a texture rect at 0.18 opacity and adds
         filters — so every literal colour in a restyled part is still one
         of the page's seven `--sk-*` tokens. A WRONG colour is one that is
         neither a page token nor `none`/`url(…)`/`currentColor`, and the
         tell-tale wrong one is the SHEET's own default palette (Knoll's
         `#c93b82` and its five, CONTRACTS §7) — what a page wears when the
         per-page palette never reached it. In pixels the test is therefore
         PRESENCE and ABSENCE, not equality: `--sk-primary` within COL_TOL
         of some sampled pixel, and no sampled pixel within COL_TOL of a
         sheet default the page does not itself use. (Equality per pixel
         would be wrong: the texture rect blends up to 0.18 of a pattern
         over the body, which is 46 of 255.)
     6 · A DROP IS KEPT. Camera to 100 % over a sticker, drag DRAG_PX right,
         ctrl+s, and then a FRESH context — empty localStorage, so the
         position can only have come off the file — must find it there.
         `index.html.keep-bak` must exist and equal the file as it stood.
     7 · THE OPENING RECTANGLE FRAMES IT, at 2560 × 1111 and 1366 × 768.
         Every `.gz` inside the bench at the landed camera, and the empty
         margin on each of the four sides measured twice: on the SCREEN as
         a share of the bench box, and inside `data-open` as a share of the
         opening rectangle. Both are reported per viewport; MARGIN_MAX is
         the line.
     8 · THE STORE IS THE PAGE'S OWN (CONTRACTS §0). Move something, read
         localStorage: every key carries `games/<slug>`. Then the sandbox
         BENCH in the SAME context — the same origin, the same storage —
         must derive bare `knoll-lab2:` keys and so see none of them. A
         fresh context would be trivially clean and would prove nothing;
         one storage with both pages in it is the case the scoping is for.

   THE NUMBERS, and where each came from.
     VIEW 1600 × 1000 in a 1616 × 1110 window — the viewport every
       `lab2/perf` script measures in, so a reading here can be laid beside
       one there. WIDE 2560 × 1111 and LAPTOP 1366 × 768 are §9 5.5's own
       two screens.
     SETTLE 3500 ms after load — `shot-games.js`'s number: the boot queue
       lifts three sections at a time and the sticker sheet is 224 KB.
     CAM 450 ms after a camera jump — `Lab.camTo(…, 0)` applies at once, but
       the lift to live and the re-grade land on the frames after it
       (`verify-keep.js` allows 300 for a drop; a grade change wants more).
     ASPECT_TOL 0.01 — §9 5.5's own "within 1 %".
     BOX_TOL 2 world units — `build-game.js` writes `data-home-x` as a whole
       number and `data-w` to two decimals, and `frames.js` rounds a box to
       whole pixels; two units covers both roundings twice over and is far
       under the 17 a real misplacement costs.
     MARGIN_MAX 0.25 — §9 5.5's "no more than ~25 % … on any side".
     GRID 48 (2 304 points), inset INSET 0.14 of the window on every side so
       no sample sits on the frame's stroke or the picture's own edge. 48 and
       not 9 because of what the fixtures are: neonrun's four plates are one
       neon grid under four skylines, and the closest two are 11.8 apart on
       this scale while a coarse lattice's own resample noise is 12 — the
       reading was undecidable and said so. At 48, with the reference canvas
       drawn at the picture's OWN screen size so the two downsamples match,
       every plate reads 3.7–4.5 against its own and 11.5 against the next.
       The margin is the number to watch, and it is reported beside the
       answer.
     COL_TOL 6 per channel — Chrome paints a flat fill exactly; 6 is the
       allowance for the screenshot's own rounding, and it is far under the
       46 the texture blend moves a channel by, which is why presence is
       asked of a lattice and not of one pixel.
     SOLID 0.0025 — a colour counts as PAINTED when a quarter of one per
       cent of the sticker's own pixels wear it. One pixel is not a colour:
       an outline's antialiasing walks a line between two roles and can
       stand on a third for a pixel or two on the way. The same floor is
       used for presence and for absence, so it cannot be a thumb on the
       scale for one of them.
     DIFF 8 per channel — what counts as "this pixel changed" when the
       section is hidden and shot again. Under the eight is the compositor's
       own rounding; the faintest thing the sheet draws (a 0.18-opacity
       texture over a body) moves a channel by far more.
     LIVE_Z 1.3 — the camera step 5 reads a sticker at. `kits.js`'s
       ZOOM_NO_TILES is 1.25 and above it there are no tiles at all
       (kits.js line 234): every part near the camera is drawn in the
       document. That is the only state in which a sticker's own pixels can
       be told from the page's by hiding its section — a part drawn on a
       TILE does not go away when its section does, and a first cut read
       zero own pixels for six of pixelfort's nine and passed them in
       silence. 1.3 is the first camera past the line, so the drawing is
       still read at very nearly the size a page opens it at, and step 5
       fails loudly for any sticker it cannot bring live.
     PAPER_MAX 0.5 — half the lattice. An empty frame is ALL paper and a
       painted one is nearly none; the line is put in the middle of nothing
       so it cannot be argued about.
     UNLOAD 800 ms — twice: once after the browser closes and before the
       file is read, and again after it is put back and before the
       byte-identity is asserted. `keep.js` sends a keepalive POST on
       `pagehide` when the stamp moved since its last save, and the server
       answers it on its own schedule, so a save can land after the restore.
       `verify-keep.js` allows 500 for exactly this; 800 is that plus room
       for a machine with four Chromes on it.
     DRAG_PX 200, XY_TOL 2, SAVE_WAIT 10000 ms — `verify-keep.js`'s, cited
       there: 200 px at 100 % is 200 world units, past every rounding and
       short of the edge-pan; a ctrl+s answers in tens of milliseconds on
       localhost and ten seconds is where a hung door is a failure.

   Results: results/game/summary.json, results/phase5/verify-<slug>-<w>.png
   (both viewports, per §9 5.5's own instruction to look at them), and the
   before-copies under results/game/<slug>/.
   ───────────────────────────────────────────────────────────────────────── */
'use strict';
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const PNG = require('../press/tools/lib/png.js');

const TEST = path.resolve(__dirname, '..');                 // …/lab2/test
const ORIGIN = 'http://localhost:4322';
const BENCH_URL = ORIGIN + '/lab2/test/';
const GAME_URL = slug => ORIGIN + '/lab2/test/games/' + slug + '/';
const SHEET = path.join(TEST, 'features', 'stickers-core.dc.html');
const OUT = path.join(__dirname, 'results', 'game');
const SHOTS = path.join(__dirname, 'results', 'phase5');
const ALL = ['pixelfort', 'mosslight', 'neonrun'];

const VIEW = { width: 1600, height: 1000 };
const WIDE = { width: 2560, height: 1111 };
const LAPTOP = { width: 1366, height: 768 };
const SETTLE = 3500;
const CAM = 450;
const ASPECT_TOL = 0.01;
const BOX_TOL = 2;
const MARGIN_MAX = 0.25;
const GRID = 48;
const INSET = 0.14;
const COL_TOL = 6;
const SOLID = 0.0025;
const DIFF = 8;
const PAPER_MAX = 0.5;
const LIVE_Z = 1.3;
const DRAG_PX = 200;
const XY_TOL = 2;
const SAVE_WAIT = 10000;
const UNLOAD = 800;

/* the sheet's own defaults (kits.js SHEETS.stickers.palette, CONTRACTS §7):
   the colours a sticker wears when the per-page palette never reached it */
const SHEET_PALETTE = ['#c93b82', '#5871f5', '#26212a', '#ffffff', '#ef4d98', '#8a2558'];
const SK_ROLES = ['--sk-primary', '--sk-secondary', '--sk-ink', '--sk-paper', '--sk-highlight', '--sk-shadow'];

const results = [];
let group = '';
const check = (name, ok, info) => {
  results.push({ slug: group, name, ok: !!ok, info: info === undefined ? '' : String(info) });
  console.log((ok ? '  PASS ' : '  FAIL ') + name + (info !== undefined ? ' — ' + info : ''));
};
const note = (name, info) => {
  results.push({ slug: group, name, ok: null, info: String(info) });
  console.log('  note  ' + name + ' — ' + info);
};
const sleep = ms => new Promise(r => setTimeout(r, ms));
const r2 = v => Math.round(v * 100) / 100;
const pct = v => (v * 100).toFixed(1) + ' %';

// ── the file, read the way serve.js reads it (verify-keep.js's readers) ───
function tagOf(html, id) {
  const at = html.indexOf('data-gizmo="' + id + '"');
  if (at < 0) return null;
  const start = html.lastIndexOf('<section', at);
  if (start < 0) return null;
  let i = start, q = '';
  for (; i < html.length; i++) {
    const ch = html[i];
    if (q) { if (ch === q) q = ''; continue; }
    if (ch === '"' || ch === "'") { q = ch; continue; }
    if (ch === '>') break;
  }
  return html.slice(start, i + 1);
}
const attrsOf = tag => { const o = {}; String(tag || '').replace(/([a-z][a-z0-9-]*)="([^"]*)"/g, (m, k, v) => { o[k] = v; return m; }); return o; };
const gizmosOf = html => { const ids = []; html.replace(/data-gizmo="([^"]+)"/g, (m, id) => { ids.push(id); return m; }); return ids; };

// ── the sheet's image-slot rects, off the artifact both sides read ────────
function sheetSlots() {
  const html = fs.readFileSync(SHEET, 'utf8');
  const m = /data-props="([^"]*)"/.exec(html);
  if (!m) throw new Error('the sheet carries no data-props');
  const props = JSON.parse(m[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&'));
  const slots = props.part && props.part.slots;
  if (!slots) throw new Error('the sheet\'s data-props carries no part.slots (CONTRACTS §8)');
  return slots;
}

/* build-game.js's shotGeom, written again from CONTRACTS §8's sentence
   rather than imported: a verifier that calls the generator's own function
   can only prove the generator agrees with itself. The rect turns twice
   about ONE centre — its own tilt inside the drawing and the section's
   data-rot, which kits.js applies about (64, 64) — and the prop is the
   axis-aligned box of the four turned corners. */
const RAD = Math.PI / 180, SK_BOX = 128, SK_MID = 64, ROT_MAX = 45;
function geom(slot, rect) {
  const s = (Number.isFinite(+slot.scale) && +slot.scale > 0) ? +slot.scale : 1;
  let th = Number.isFinite(+slot.rot) ? +slot.rot : 0;
  if (Math.abs(th) > ROT_MAX) th = th < 0 ? -ROT_MAX : ROT_MAX;
  th = Math.round(th * 100) / 100;
  const c = Math.cos(th * RAD), sn = Math.sin(th * RAD);
  const dx = rect.x + rect.w / 2 - SK_MID, dy = rect.y + rect.h / 2 - SK_MID;
  const cx = SK_MID + dx * c - dy * sn, cy = SK_MID + dx * sn + dy * c;
  const a = (+rect.rot || 0) + th, ca = Math.cos(a * RAD), sa = Math.sin(a * RAD);
  const hw = rect.w / 2, hh = rect.h / 2;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const p of [[-hw, -hh], [hw, -hh], [hw, hh], [-hw, hh]]) {
    const qx = cx + p[0] * ca - p[1] * sa, qy = cy + p[0] * sa + p[1] * ca;
    if (qx < x0) x0 = qx; if (qx > x1) x1 = qx;
    if (qy < y0) y0 = qy; if (qy > y1) y1 = qy;
  }
  return { s, a, cx, cy, bx: x0, by: y0, bw: x1 - x0, bh: y1 - y0,
    x: Math.round(slot.x) + x0 * s, y: Math.round(slot.y) + y0 * s };
}

// ── colour ────────────────────────────────────────────────────────────────
const hex2rgb = h => { const v = String(h).trim().replace('#', ''); return [parseInt(v.slice(0, 2), 16), parseInt(v.slice(2, 4), 16), parseInt(v.slice(4, 6), 16)]; };
const near = (a, b, tol) => Math.abs(a[0] - b[0]) <= tol && Math.abs(a[1] - b[1]) <= tol && Math.abs(a[2] - b[2]) <= tol;
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

// a decoded screenshot, sampled
function sampler(buf) {
  const img = PNG.decode(buf);
  return {
    w: img.width, h: img.height,
    at(x, y) {
      const px = Math.max(0, Math.min(img.width - 1, Math.round(x)));
      const py = Math.max(0, Math.min(img.height - 1, Math.round(y)));
      const i = (py * img.width + px) * 4;
      return [img.data[i], img.data[i + 1], img.data[i + 2]];
    }
  };
}
const meanOf = px => {
  const m = [0, 0, 0];
  px.forEach(p => { m[0] += p[0]; m[1] += p[1]; m[2] += p[2]; });
  return m.map(v => Math.round(v / px.length));
};

// ── a page, opened ────────────────────────────────────────────────────────
async function open(browser, url, opts) {
  opts = opts || {};
  const ctx = opts.ctx || await browser.newContext({ viewport: opts.view || VIEW, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const A = { ctx, page, ownCtx: !opts.ctx, errors: [], pageErrors: [], bad: [], doorReqs: [], saves: [] };
  page.on('console', m => {
    if (m.type() !== 'error') return;
    const at = (m.location() && m.location().url) || '';
    if (opts.door !== 'live' && /\/_lab2\//.test(at)) return;   // the door this script shuts
    A.errors.push(m.text().slice(0, 200) + (at ? ' @ ' + at.replace(ORIGIN, '') : ''));
  });
  page.on('pageerror', e => A.pageErrors.push(String(e).slice(0, 200)));
  page.on('request', r => { const u = new URL(r.url()); if (u.pathname.startsWith('/_lab2/')) A.doorReqs.push(r.method() + ' ' + u.pathname); });
  page.on('response', r => {
    const u = new URL(r.url());
    if (r.status() >= 400 && !u.pathname.startsWith('/_lab2/')) A.bad.push(r.status() + ' ' + u.pathname);
    if (opts.door === 'live' && r.request().method() === 'POST' && u.pathname.startsWith('/_lab2/')) A.saves.push(r);
  });
  if (opts.door !== 'live') await page.route('**/_lab2/**', r => r.fulfill({ status: 404, body: 'no' }));
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForFunction(() => window.Lab && window.Frames && window.Kits, null, { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(opts.settle == null ? SETTLE : opts.settle);
  return A;
}
const close = async A => { try { await A.page.close(); } catch (e) {} if (A.ownCtx) { try { await A.ctx.close(); } catch (e) {} } };

// what the page says about itself, in world units off layout properties
const READ = () => {
  const css = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  const boxOf = el => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; };
  const world = el => ({
    x: parseFloat(el.style.left) || 0, y: parseFloat(el.style.top) || 0,
    w: el.offsetWidth, h: el.offsetHeight
  });
  const sect = el => ({
    id: el.id, gizmo: el.dataset.gizmo || '', cls: el.className,
    src: el.dataset.src || '', dw: +el.dataset.w || 0, dh: +el.dataset.h || 0,
    scale: +el.dataset.scale || 1, rot: el.dataset.rot == null ? null : +el.dataset.rot,
    z: el.dataset.homeZ == null ? null : +el.dataset.homeZ,
    world: world(el), screen: boxOf(el)
  });
  const arts = [...document.querySelectorAll('.gz')];
  const bench = document.getElementById('bench');
  return {
    zoom: Lab.zoom, pan: { x: Lab.panX, y: Lab.panY },
    bench: boxOf(bench || document.body),
    open: (document.getElementById('bench-world') || {}).dataset || {},
    tokens: SKROLES.concat(['--sk-halo', '--paper', '--ink']).reduce((o, n) => (o[n] = css(n), o), {}),
    panels: Frames.panels.length, loading: Frames.panels.filter(p => p.loading).length,
    docs: Frames.panels.filter(p => !p.art).map(p => p.id),
    iframes: document.querySelectorAll('iframe').length,
    stats: Kits.stats ? Kits.stats() : null,
    sections: arts.map(sect),
    pics: [...document.querySelectorAll('.gz-pic')].map(el => {
      const svg = el.querySelector('.gz-art > svg');
      const inner = svg && svg.querySelector('svg');
      return Object.assign(sect(el), {
        shot: el.classList.contains('gz-shot'),
        viewBox: svg ? svg.getAttribute('viewBox') : null,
        innerViewBox: inner ? inner.getAttribute('viewBox') : null,
        par: inner ? inner.getAttribute('preserveAspectRatio') : null,
        href: (svg && svg.querySelector('image') ? svg.querySelector('image').getAttribute('href') : null),
        prevId: el.previousElementSibling ? el.previousElementSibling.id : null,
        prevSrc: el.previousElementSibling ? (el.previousElementSibling.dataset.src || '') : ''
      });
    }),
    stickers: [...document.querySelectorAll('.gz[data-src]')].map(el => {
      const art = el.querySelector('.gz-art');
      const svg = art && art.querySelector(':scope > svg');
      const cv = art && art.querySelector(':scope > canvas');
      const n = svg || cv;
      return Object.assign(sect(el), {
        live: !!svg, canvas: !!cv,
        originX: n ? (parseFloat(n.style.left) || 0) : null,
        originY: n ? (parseFloat(n.style.top) || 0) : null,
        fills: svg ? [...new Set([...svg.querySelectorAll('*')].flatMap(e => ['fill', 'stroke'].map(a => e.getAttribute(a)).filter(Boolean)))] : null,
        layers: svg ? [...svg.children].map(e => e.getAttribute('data-layer') || e.localName) : null,
        interp: svg ? /\{\{/.test(svg.outerHTML) : false
      });
    })
  };
};
const read = page => page.evaluate('(() => { const SKROLES = ' + JSON.stringify(SK_ROLES) + '; return (' + READ.toString() + ')(); })()');

const camTo = (page, z, id) => page.evaluate(([z, id]) => {
  const b = document.getElementById('bench').getBoundingClientRect();
  if (!id) { Lab.camTo(z, b.width / 2, b.height / 2, 0); return; }
  const el = document.getElementById(id);
  const x = parseFloat(el.style.left) || 0, y = parseFloat(el.style.top) || 0;
  Lab.camTo(z, b.width / 2 - (x + el.offsetWidth / 2) * z, b.height / 2 - (y + el.offsetHeight / 2) * z, 0);
}, [z, id || null]);

/* the sway, stopped. The stickers' root svg carries `animation: sk-sway …`
   (CONTRACTS §8) and it turns a drawing by a fraction of a degree forever,
   which moves a client rect under a lattice between the measurement and the
   screenshot. Stopping it changes nothing else about what is drawn, and the
   two steps that sample pixels are the only ones that ask for it. */
const STILL = '.gz-art > svg, .gz-art > canvas { animation: none !important; }';
const freeze = page => page.addStyleTag({ content: STILL });

/* THE BOX SETTLES AFTER THE SHEET DOES, and step 4c reads it. kits.js
   re-cuts a sticker's `data-w`/`data-h` to the ink of the drawing once the
   sheet is extracted and frames.js re-fits the section to it, so a read
   taken in the gap sees the sheet's 134 against a box already 465 wide and
   the mapping comes out by ten world units. This waits for the geometry to
   say the same thing twice in a row rather than for a number of
   milliseconds — 3.5 s was enough on four runs of five and not on the
   fifth, which is what a timeout is. */
async function stable(page, tries) {
  const sig = () => page.evaluate(() => [...document.querySelectorAll('.gz[data-src]')].map(e => {
    const n = e.querySelector('.gz-art > svg, .gz-art > canvas');
    return e.dataset.w + 'x' + e.dataset.h + '@' + e.offsetWidth + ',' + e.offsetHeight + '+' + (n ? (n.style.left || '0') : '-');
  }).join('|'));
  let last = null;
  for (let i = 0; i < (tries || 24); i++) {
    const now = await sig();
    if (now && now === last) return { settled: true, tries: i, sig: now };
    last = now;
    await page.waitForTimeout(250);
  }
  return { settled: false, tries: tries || 24, sig: last };
}

// ══ the steps ════════════════════════════════════════════════════════════

async function stepsBoot(browser, slug, game, slots, summary) {
  const A = await open(browser, GAME_URL(slug));
  const S = { };
  try {
    await freeze(A.page);
    const info = await read(A.page);
    S.zoom = r2(info.zoom); S.stats = info.stats; S.tokens = info.tokens;

    // ── 1 · it boots ─────────────────────────────────────────────────────
    check('1 · zero console errors', A.errors.length === 0, A.errors.slice(0, 4).join(' | ') || 'none');
    check('1 · zero page errors', A.pageErrors.length === 0, A.pageErrors.slice(0, 4).join(' | ') || 'none');
    check('1 · zero responses ≥ 400 outside the door', A.bad.length === 0,
      A.bad.length ? [...new Set(A.bad)].join(', ') : 'none (the door was knocked on ' + A.doorReqs.length + '× and answered 404 by this script)');

    // ── 2 · no documents, ever ───────────────────────────────────────────
    const grades = { open: info };
    for (const [name, z] of [['20', 0.2], ['100', 1]]) {
      await camTo(A.page, z, null);
      await A.page.waitForTimeout(CAM);
      grades[name] = await read(A.page);
    }
    S.documents = Object.keys(grades).map(k => ({ at: k, zoom: r2(grades[k].zoom), panels: grades[k].panels, docs: grades[k].docs, loading: grades[k].loading, iframes: grades[k].iframes }));
    const anyLoading = Object.keys(grades).filter(k => grades[k].loading !== 0);
    const anyPanel = Object.keys(grades).filter(k => grades[k].docs.length !== 0);
    const anyFrame = Object.keys(grades).filter(k => grades[k].iframes !== 0);
    check('2 · Frames.panels.filter(p => p.loading).length is 0 at 20 %, 100 % and the opening camera', anyLoading.length === 0,
      anyLoading.length ? 'loading at ' + anyLoading.join(', ') : JSON.stringify(S.documents));
    check('2 · not one panel is a DOCUMENT (no .gz-art of its own) at any of the three cameras', anyPanel.length === 0,
      anyPanel.length ? 'documents at ' + anyPanel.map(k => k + '=' + grades[k].docs.join('/')).join(', ') : '0 of ' + grades.open.panels + ' panels at all three cameras — every one is a prop or a kit part');
    check('2 · zero iframes at all three cameras', anyFrame.length === 0, anyFrame.join(', ') || '0 at all three cameras');

    // back to the opening camera for everything that follows
    await A.page.evaluate(() => { try { localStorage.removeItem(Lab.storeKey('cam')); } catch (e) {} });
    await A.page.reload({ waitUntil: 'load' });
    await A.page.waitForFunction(() => window.Lab && window.Frames && window.Kits, null, { timeout: 20000 }).catch(() => {});
    await A.page.waitForTimeout(SETTLE);
    await freeze(A.page);
    S.settle = await stable(A.page);
    check('· the sticker boxes settled before anything was measured', S.settle.settled, S.settle.tries + ' quarter-seconds after the ' + SETTLE + ' ms wait');
    const at = await read(A.page);
    S.zoom = r2(at.zoom);

    // ── 0 · the page still stands where build-game.js put it ─────────────
    /* THE FIRST QUESTION, AND IT IS ABOUT THE FILE AND NOT THE PAGE. Every
       step below reads a page that some earlier run may have dragged
       something on, and step 6 restores the file to the SNAPSHOT IT TOOK AT
       ITS OWN START — so a drop left behind by a run that ended badly is
       inherited by the next run, and by the one after that, in silence.
       (It happened: a first pass left mosslight's banner 200 units right of
       where the recipe put it and four sections' data-home-z shuffled, and
       three runs in a row called the file restored because each was
       comparing it with itself.) So the layout in game.json is asked
       instead: expand its slots the way build-game.js does — one section
       per slot, TWO for a sticker carrying an image — and every section's
       data-home-x/y must be that slot's, rounded, and its data-home-z its
       own index. A page a person has arranged by hand fails this on
       purpose and should be told to, loudly, before anything else is
       measured on it. */
    const expect = [];
    game.layout.slots.forEach(s => {
      expect.push({ ref: s.ref, kind: s.kind, x: Math.round(s.x), y: Math.round(s.y) });
      if (s.kind === 'sticker' && s.image && slots[s.ref]) {
        const g = geom(s, slots[s.ref]);
        expect.push({ ref: s.image, kind: 'shot', x: Math.round(g.x), y: Math.round(g.y) });
      }
    });
    const moved = at.sections.map((sec, i) => {
      const e = expect[i];
      if (!e) return sec.gizmo + ': no slot for it';
      if (Math.abs(sec.world.x - e.x) > BOX_TOL || Math.abs(sec.world.y - e.y) > BOX_TOL) return sec.gizmo + ' at ' + sec.world.x + ',' + sec.world.y + ' not ' + e.x + ',' + e.y;
      if (sec.z !== i) return sec.gizmo + ' data-home-z ' + sec.z + ' not ' + i;
      return null;
    }).filter(Boolean);
    S.asBuilt = { sections: at.sections.length, slots: game.layout.slots.length, expected: expect.length, moved };
    check('0 · every section stands where build-game.js put it (game.json\'s layout, expanded here)', moved.length === 0 && at.sections.length === expect.length,
      moved.length ? moved.join(' | ') : at.sections.length + ' sections against ' + game.layout.slots.length + ' slots + ' + (expect.length - game.layout.slots.length) + ' framed shots, every data-home-x/y on its slot and every data-home-z its own index');

    // ── 3 · every picture is its own shape ───────────────────────────────
    const assets = {};
    game.manifest.assets.forEach(a => { assets[a.id] = a; });
    const bySlot = game.layout.slots;
    const picSlots = bySlot.filter(s => s.kind === 'pic');
    const shotSlots = bySlot.filter(s => s.kind === 'sticker' && s.image);
    const plain = at.pics.filter(p => !p.shot), shots = at.pics.filter(p => p.shot);
    check('3 · one gz-pic per pic slot, one gz-shot per framed screenshot',
      plain.length === picSlots.length && shots.length === shotSlots.length,
      plain.length + ' plain / ' + shots.length + ' shots against ' + picSlots.length + ' pic slots / ' + shotSlots.length + ' image slots');

    S.pics = [];
    let picBad = 0;
    plain.forEach((p, i) => {
      const slot = picSlots[i], a = assets[slot.ref] || {};
      const want = a.w / a.h, got = p.world.w / p.world.h;
      const off = Math.abs(got - want) / want;
      const vb = '0 0 ' + a.w + ' ' + a.h;
      const ok = off <= ASPECT_TOL && p.viewBox === vb && p.href === a.file;
      if (!ok) picBad++;
      S.pics.push({ id: p.id, asset: slot.ref, box: [p.world.w, p.world.h], want: r2(want), got: r2(got), off: r2(off * 100) + ' %', viewBox: p.viewBox, href: p.href });
    });
    check('3 · every plain gz-pic measures to its asset\'s aspect within ' + pct(ASPECT_TOL), picBad === 0,
      S.pics.map(p => p.asset + ' ' + p.box.join('×') + ' aspect ' + p.got + ' v ' + p.want + ' (' + p.off + ')').join(' · '));

    S.shots = [];
    let shotAspectBad = 0;
    shots.forEach((p, i) => {
      const slot = shotSlots[i], a = assets[slot.image] || {};
      const rect = slots[slot.ref];
      const g = geom(slot, rect);
      const wantBox = g.bw / g.bh, gotBox = p.world.w / p.world.h;
      const offBox = Math.abs(gotBox - wantBox) / wantBox;
      const ok = offBox <= ASPECT_TOL && p.innerViewBox === '0 0 ' + a.w + ' ' + a.h && /slice/.test(p.par || '');
      if (!ok) shotAspectBad++;
      S.shots.push({ id: p.id, asset: slot.image, part: slot.ref, boxAspect: r2(gotBox), wantAspect: r2(wantBox),
        offBox: r2(offBox * 100) + ' %', innerViewBox: p.innerViewBox, par: p.par });
    });
    check('3 · every gz-shot measures to its FRAME WINDOW\'s aspect within ' + pct(ASPECT_TOL) + ', with the asset\'s viewBox on the nested svg at slice',
      shotAspectBad === 0, S.shots.map(s => s.part + '/' + s.asset + ' ' + s.boxAspect + ' v ' + s.wantAspect + ' (' + s.offBox + '), inner ' + s.innerViewBox + ' ' + s.par).join(' · '));

    // ── 4a · the arithmetic, recomputed from the sheet ────────────────────
    let boxBad = [];
    shots.forEach((p, i) => {
      const slot = shotSlots[i], g = geom(slot, slots[slot.ref]);
      const d = [Math.abs(p.world.x - g.x), Math.abs(p.world.y - g.y),
        Math.abs(p.world.w - g.bw * g.s), Math.abs(p.world.h - g.bh * g.s)];
      S.shots[i].wantWorld = [r2(g.x), r2(g.y), r2(g.bw * g.s), r2(g.bh * g.s)];
      S.shots[i].gotWorld = [p.world.x, p.world.y, p.world.w, p.world.h];
      S.shots[i].delta = d.map(r2);
      if (Math.max.apply(null, d) > BOX_TOL) boxBad.push(p.id + ' Δ' + d.map(r2).join(','));
    });
    check('4a · every picture\'s world box is the sheet\'s own slot rect mapped through its sticker, within ' + BOX_TOL + ' world units',
      boxBad.length === 0, boxBad.length ? boxBad.join(' | ') : S.shots.map(s => s.asset + ' at ' + s.gotWorld.join(',') + ' (Δ ' + s.delta.join(',') + ')').join(' · '));

    // ── 4b · the pile: frame first, picture next, one z above ────────────
    const pileBad = shots.filter((p, i) => {
      const slot = shotSlots[i];
      return !(p.prevSrc && p.prevSrc.indexOf('#part=' + slot.ref) >= 0) || p.z == null || p.z !== (at.sections.find(s => s.id === p.prevId) || {}).z + 1;
    }).map(p => p.id + ' after ' + p.prevId);
    check('4b · every picture is its frame\'s next sibling and one data-home-z above it', pileBad.length === 0,
      pileBad.length ? pileBad.join(', ') : shots.map(p => p.prevId + ' z' + (at.sections.find(s => s.id === p.prevId) || {}).z + ' → ' + p.id + ' z' + p.z).join(' · '));

    // ── 4c · where the frame's window actually lands ─────────────────────
    /* part unit u → world = section.left + (origin + u) × (offsetWidth /
       data-w). `origin` is the `left:` kits.js seated the drawing at after
       re-cutting the box to the drawing's ink; data-w is the re-cut width.
       All four are layout properties, so the sway cannot move the answer. */
    let insideBad = [], offsets = [];
    shots.forEach((p, i) => {
      const slot = shotSlots[i], rect = slots[slot.ref], g = geom(slot, rect);
      const f = at.stickers.find(s => s.id === p.prevId);
      if (!f) { insideBad.push(p.id + ': no frame section'); return; }
      const k = f.world.w / f.dw;
      const ox = (f.originX || 0), oy = (f.originY || 0);
      const win = { x: f.world.x + (ox + g.bx) * k, y: f.world.y + (oy + g.by) * k, w: g.bw * k, h: g.bh * k };
      const cd = [r2((p.world.x + p.world.w / 2) - (win.x + win.w / 2)), r2((p.world.y + p.world.h / 2) - (win.y + win.h / 2))];
      const inside = p.world.x >= f.world.x - BOX_TOL && p.world.y >= f.world.y - BOX_TOL
        && p.world.x + p.world.w <= f.world.x + f.world.w + BOX_TOL
        && p.world.y + p.world.h <= f.world.y + f.world.h + BOX_TOL;
      if (!inside) insideBad.push(p.id + ' is not inside ' + f.id);
      offsets.push(cd);
      S.shots[i].frame = { id: f.id, dw: f.dw, dh: f.dh, world: f.world, origin: [ox, oy], k: r2(k) };
      S.shots[i].window = { x: r2(win.x), y: r2(win.y), w: r2(win.w), h: r2(win.h) };
      S.shots[i].offCentre = cd;
    });
    check('4c · every picture lies inside its frame\'s own box', insideBad.length === 0, insideBad.join(', ') || shots.length + ' of ' + shots.length);
    const worst = offsets.reduce((m, d) => Math.max(m, Math.abs(d[0]), Math.abs(d[1])), 0);
    const f0 = (S.shots[0] && S.shots[0].frame) || null;
    S.offCentreWorst = r2(worst);
    note('4c · the picture\'s offset from the centre of the window it is cut for',
      'worst ' + r2(worst) + ' world units (' + r2(worst * at.zoom) + ' screen px at this page\'s opening zoom ' + r2(at.zoom) + ') — '
      + (worst > BOX_TOL ? 'kits.js re-cut the frame\'s box to the ink of the drawing PLUS its shadow (data-w ' + (f0 ? f0.dw : '?') + ' against the sheet\'s 134, the drawing seated at left ' + (f0 ? f0.origin[0] : '?') + '), which the generator cannot know without rasterising — OPEN.md §2'
        : 'the box was not re-cut on this page'));

    // ── 4d · it is painted ───────────────────────────────────────────────
    const paper = hex2rgb(at.tokens['--sk-paper']);
    /* every screenshot asset, cover-cropped to the WINDOW RECT's own aspect
       in a canvas and sampled at the same lattice — the reference the page's
       pixels are matched against. The crop is the one the nested svg makes
       (`xMidYMid slice`), so the two are the same picture and what is left
       between them is the resample alone: the lattice is taken in the
       PICTURE's own frame, turned with it, so the ±2° is not an error term
       either. It is read at 100 % and not at the opening camera because at
       0.39 a film cell is 35 screen px across and four plates of one game
       are not 35 px apart (measured: the assets' own pairwise distance is
       reported beside the match). */
    const shotList = game.manifest.assets.filter(a => a.role === 'screenshot').map(a => ({ id: a.id, file: a.file }));
    const refCache = {};
    const refsFor = async (pw, ph) => {
      const key = pw + 'x' + ph;
      if (refCache[key]) return refCache[key];
      return (refCache[key] = await A.page.evaluate(async o => {
        const out = {}, N = o.grid, INSET = o.inset, aspect = o.pw / o.ph;
        for (const a of o.list) {
          const img = new Image(); img.src = a.file;
          await img.decode().catch(() => {});
          const W = img.naturalWidth, H = img.naturalHeight;
          let sw = W, sh = W / aspect;
          if (sh > H) { sh = H; sw = H * aspect; }
          const cv = document.createElement('canvas'); cv.width = o.pw; cv.height = o.ph;
          const cx = cv.getContext('2d');
          cx.drawImage(img, (W - sw) / 2, (H - sh) / 2, sw, sh, 0, 0, cv.width, cv.height);
          const d = cx.getImageData(0, 0, cv.width, cv.height).data;
          const px = [], ix = cv.width * INSET, iy = cv.height * INSET;
          for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
            const x = Math.round(ix + (cv.width - 2 * ix) * (c / (N - 1)));
            const y = Math.round(iy + (cv.height - 2 * iy) * (r / (N - 1)));
            const i = (Math.min(cv.height - 1, y) * cv.width + Math.min(cv.width - 1, x)) * 4;
            px.push([d[i], d[i + 1], d[i + 2]]);
          }
          out[a.id] = px;
        }
        return out;
      }, { grid: GRID, inset: INSET, pw, ph, list: shotList }));
    };
    const mad = (a, b) => {
      let s = 0;
      for (let i = 0; i < a.length; i++) s += Math.abs(a[i][0] - b[i][0]) + Math.abs(a[i][1] - b[i][1]) + Math.abs(a[i][2] - b[i][2]);
      return s / (a.length * 3);
    };

    let paintBad = [], matchBad = [], apart = Infinity;
    for (let i = 0; i < shots.length; i++) {
      const p = shots[i], slot = shotSlots[i], rect = slots[slot.ref], g = geom(slot, rect);
      await camTo(A.page, 1, p.id);
      await A.page.waitForTimeout(CAM);
      await freeze(A.page);
      const box = await A.page.evaluate(id => { const r = document.getElementById(id).getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; }, p.id);
      const clip = { x: Math.max(0, Math.floor(box.x)), y: Math.max(0, Math.floor(box.y)), width: Math.ceil(box.w), height: Math.ceil(box.h) };
      clip.width = Math.max(4, Math.min(clip.width, VIEW.width - clip.x));
      clip.height = Math.max(4, Math.min(clip.height, VIEW.height - clip.y));
      const img = sampler(await A.page.screenshot({ clip }));
      // the lattice in the picture's own frame: the rect, inset, turned by a
      const k = box.w / g.bw, ca = Math.cos(g.a * RAD), sa = Math.sin(g.a * RAD);
      const cx0 = box.x - clip.x + box.w / 2, cy0 = box.y - clip.y + box.h / 2;
      const px = [];
      for (let r = 0; r < GRID; r++) for (let c = 0; c < GRID; c++) {
        const u = (-0.5 + INSET + (1 - 2 * INSET) * (c / (GRID - 1))) * rect.w * k;
        const v = (-0.5 + INSET + (1 - 2 * INSET) * (r / (GRID - 1))) * rect.h * k;
        px.push(img.at(cx0 + u * ca - v * sa, cy0 + u * sa + v * ca));
      }
      const refs = await refsFor(Math.max(2, Math.round(rect.w * k)), Math.max(2, Math.round(rect.h * k)));
      const ids = Object.keys(refs);
      for (let m = 0; m < ids.length; m++) for (let n = m + 1; n < ids.length; n++) apart = Math.min(apart, mad(refs[ids[m]], refs[ids[n]]));
      const paperShare = px.filter(q => near(q, paper, COL_TOL)).length / px.length;
      const ranked = ids.map(id => ({ id, d: r2(mad(px, refs[id])) })).sort((a, b) => a.d - b.d);
      S.shots[i].mean = meanOf(px);
      S.shots[i].paperShare = r2(paperShare);
      S.shots[i].nearest = ranked[0].id;
      S.shots[i].ranked = ranked;
      if (paperShare > PAPER_MAX) paintBad.push(p.id + ' ' + pct(paperShare) + ' paper');
      if (ranked[0].id !== slot.image) matchBad.push(p.id + ' reads nearest ' + ranked[0].id + ' (' + ranked[0].d + ') not ' + slot.image + ' (' + (ranked.find(r => r.id === slot.image) || {}).d + ')');
    }
    S.assetsApart = r2(apart);
    check('4d · every frame is PAINTED — at most ' + pct(PAPER_MAX) + ' of its lattice is the placeholder ' + at.tokens['--sk-paper'],
      paintBad.length === 0, paintBad.length ? paintBad.join(', ') : S.shots.map(s => s.asset + ' ' + pct(s.paperShare)).join(' · '));
    check('4d · every frame holds ITS OWN screenshot — the lattice is nearest that asset\'s own cover crop',
      matchBad.length === 0, matchBad.length ? matchBad.join(' | ') : S.shots.map(s => s.asset + ' → ' + s.nearest + ' (mad ' + s.ranked[0].d + ' v next ' + s.ranked[1].d + ')').join(' · ')
        + ' — the closest two of this game\'s four plates are ' + S.assetsApart + ' apart, which is the margin the reading has to work in');
    check('4 · every screenshot in the manifest is on the page',
      shots.length === game.manifest.assets.filter(a => a.role === 'screenshot').length && shots.length === shotSlots.length,
      shots.length + ' of ' + game.manifest.assets.filter(a => a.role === 'screenshot').length + ' manifest screenshots drawn');

    /* AND THE WINDOWS NOBODY FILLED. Five of the forty parts carry an
       image-slot (CONTRACTS §8) and the recipes hand a picture to the two
       they frame screenshots with. A part chosen for its shape alone still
       draws its slot, and that rect is opaque `{{ skPaper }}` — so it reads
       as a hole in the middle of the drawing, black on neonrun and white on
       mosslight. Plan §3.6 says the page MAY replace it, so this is not a
       failure; it is the same defect Phase 5 fixed for the frames, standing
       where nobody looked. Counted, named and left for the owner. */
    const filled = new Set(shots.map(p => p.prevId));
    const holes = at.stickers.filter(s => {
      const part = (/#part=([\w-]+)/.exec(s.src) || [])[1];
      return part && slots[part] && !filled.has(s.id);
    });
    S.emptySlots = holes.map(s => s.id);
    note('4 · image-slot parts drawn with nothing in the window',
      holes.length ? holes.length + ': ' + holes.map(s => (/#part=([\w-]+)/.exec(s.src) || [])[1]).join(', ')
        + ' — each draws an opaque ' + at.tokens['--sk-paper'] + ' rect where a picture would go (plan §3.6 allows it; it reads as a hole)'
        : 'none — every part on this page that has a window has a picture in it');

    // ── 5 · the stickers wear the page's colours ─────────────────────────
    const tokens = {}; SK_ROLES.forEach(n => { tokens[n] = at.tokens[n].toLowerCase(); });
    const tokenSet = new Set(Object.values(tokens));
    const strays = SHEET_PALETTE.filter(h => !tokenSet.has(h));      // a default the page does not itself use
    S.strayPalette = strays;
    const stickerRows = [];
    let wrongFill = [], noPrimary = [], noPrimaryDrawn = [], unpainted = [], softRole = [], interp = [], stray = [];
    for (const st of at.stickers) {
      await camTo(A.page, LIVE_Z, st.id);
      await A.page.waitForTimeout(CAM);
      await freeze(A.page);
      const one = await A.page.evaluate(id => {
        const el = document.getElementById(id), art = el.querySelector('.gz-art');
        const svg = art.querySelector(':scope > svg'), cv = art.querySelector(':scope > canvas');
        const r = el.getBoundingClientRect();
        const row = { id, live: !!svg, canvas: !!cv, screen: { x: r.x, y: r.y, w: r.width, h: r.height }, fills: null, drawn: null, interp: false, pixels: null };
        if (svg) {
          const all = [...svg.querySelectorAll('*')];
          row.fills = [...new Set(all.flatMap(e => ['fill', 'stroke'].map(a => e.getAttribute(a)).filter(Boolean)))];
          /* what the part actually DRAWS: the halo is a <g style="display:none">
             and a <clipPath>'s copy of the body is never painted, so an
             element with no box of its own is not a colour on the screen.
             Split in two, because a filter changes the question: an element
             under an SVG `filter` attribute — kits.js's blurred shade
             (#sk-soft) or its wobbled line (#sk-wobble) — paints a gradient
             of its colour and not the colour, so the screen need not carry
             one flat pixel of it. The root svg's own CSS drop-shadow is not
             that: it puts a shadow BEHIND the drawing and leaves every fill
             alone, so it excuses nothing. */
          const seen = e => {
            if (e.closest('defs, clipPath')) return false;
            const b = e.getBoundingClientRect();
            return b.width > 0.5 || b.height > 0.5;
          };
          const soft = e => { for (let n = e; n && n !== svg; n = n.parentNode) if (n.getAttribute && n.getAttribute('filter')) return true; return false; };
          const cols = e => ['fill', 'stroke'].map(a => e.getAttribute(a)).filter(Boolean);
          row.drawn = [...new Set(all.filter(seen).flatMap(cols))];
          row.hard = [...new Set(all.filter(e => seen(e) && !soft(e)).flatMap(cols))];
          row.textLayer = !!svg.querySelector(':scope > g[data-layer="text"]');
          row.words = el.dataset.text == null ? null : el.dataset.text;
          row.interp = /\{\{/.test(svg.outerHTML);
        }
        if (cv) {
          try {
            const g = cv.getContext('2d');
            const d = g.getImageData(0, 0, cv.width, cv.height).data;
            const seen = new Map();
            let opaque = 0;
            for (let i = 0; i < d.length; i += 4) {
              if (d[i + 3] < 250) continue;
              opaque++;
              const k = d[i] + ',' + d[i + 1] + ',' + d[i + 2];
              seen.set(k, (seen.get(k) || 0) + 1);
            }
            row.opaque = opaque;
            row.pixels = [...seen.entries()].sort((a, b) => b[1] - a[1]).slice(0, 16).map(e => ({ c: e[0], n: e[1] }));
            /* a FLAT on the bitmap, the same rule the screen gets: a colour
               with a pixel whose four neighbours all wear it. A 34 × 34
               pixel-style bitmap is one pixel of antialiasing wide at every
               edge, so without it every corner between two roles reads as a
               third colour (measured on pixelfort: 95 distinct colours over
               340 opaque pixels, of which three are the drawing) */
            const W = cv.width, H = cv.height;
            const px = (x, y) => { const i = (y * W + x) * 4; return d[i + 3] < 250 ? null : d[i] + ',' + d[i + 1] + ',' + d[i + 2]; };
            const flat = new Map();
            for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
              const c = px(x, y);
              if (!c) continue;
              if (px(x - 1, y) === c && px(x + 1, y) === c && px(x, y - 1) === c && px(x, y + 1) === c) flat.set(c, (flat.get(c) || 0) + 1);
            }
            row.flats = [...flat.entries()].sort((a, b) => b[1] - a[1]).map(e => ({ c: e[0], n: e[1] }));
          } catch (e) { row.pixels = [{ c: 'unreadable: ' + String(e).slice(0, 60), n: 0 }]; }
        }
        return row;
      }, st.id);
      /* the sticker's OWN pixels: its box shot as it stands and again with
         the section hidden, and what changed between them. A section's box
         is bigger than its drawing — the spill, the tilt, the paper round
         it — and the page shows through the rest, so a colour found in the
         box is not yet a colour the sticker painted. */
      const clip = {
        x: Math.max(0, Math.floor(one.screen.x)), y: Math.max(0, Math.floor(one.screen.y)),
        width: Math.min(VIEW.width, Math.ceil(one.screen.w)), height: Math.min(VIEW.height, Math.ceil(one.screen.h))
      };
      clip.width = Math.max(4, Math.min(clip.width, VIEW.width - clip.x));
      clip.height = Math.max(4, Math.min(clip.height, VIEW.height - clip.y));
      const on = sampler(await A.page.screenshot({ clip }));
      await A.page.evaluate(id => { document.getElementById(id).style.visibility = 'hidden'; }, st.id);
      await A.page.waitForTimeout(120);
      const off = sampler(await A.page.screenshot({ clip }));
      await A.page.evaluate(id => { document.getElementById(id).style.visibility = ''; }, st.id);
      /* A FLAT PATCH, not a pixel. A colour is one the sticker WEARS when
         a sample and its four neighbours two pixels away all carry it —
         five samples spanning five screen pixels each way. One pixel is
         not a colour: an outline's antialiasing walks the line between two
         roles and stands on a third on the way, and a first cut read the
         sheet's own #26212a off 31 such pixels on a tape-strip turned 20°
         (measured on pixelfort). The rule is the same for the colours that
         must be there and for the ones that must not, so it cannot be a
         thumb on the scale for either. */
      const W = Math.ceil(clip.width / 2), H = Math.ceil(clip.height / 2);
      const grid = new Array(W * H).fill(null);
      let own = 0;
      for (let gy = 0; gy < H; gy++) for (let gx = 0; gx < W; gx++) {
        const a = on.at(gx * 2, gy * 2), b = off.at(gx * 2, gy * 2);
        if (Math.abs(a[0] - b[0]) >= DIFF || Math.abs(a[1] - b[1]) >= DIFF || Math.abs(a[2] - b[2]) >= DIFF) { grid[gy * W + gx] = a; own++; }
      }
      const patches = c => {
        let n = 0;
        for (let gy = 1; gy < H - 1; gy++) for (let gx = 1; gx < W - 1; gx++) {
          const q = grid[gy * W + gx];
          if (!q || !near(q, c, COL_TOL)) continue;
          const u = grid[(gy - 1) * W + gx], d = grid[(gy + 1) * W + gx], l = grid[gy * W + gx - 1], r = grid[gy * W + gx + 1];
          if (u && d && l && r && near(u, c, COL_TOL) && near(d, c, COL_TOL) && near(l, c, COL_TOL) && near(r, c, COL_TOL)) n++;
        }
        return n;
      };
      const floor = Math.max(2, Math.round(own * SOLID));
      one.ownPixels = own;
      one.floor = floor;
      one.painted = {};
      SK_ROLES.forEach(role => { one.painted[role] = own ? patches(hex2rgb(tokens[role])) : 0; });
      one.primaryPixels = one.painted['--sk-primary'];
      one.hasPrimary = one.primaryPixels >= floor;
      one.strayHits = strays.map(h => ({ h, n: own ? patches(hex2rgb(h)) : 0 })).filter(e => e.n >= floor).map(e => e.h + '×' + e.n);
      if (one.fills) {
        const bad = one.fills.filter(f => /^#/.test(f) && !tokenSet.has(f.toLowerCase()));
        one.wrongFills = bad;
        if (bad.length) wrongFill.push(one.id + ': ' + bad.join(', '));
        if (one.interp) interp.push(one.id);
        /* every role this part draws UNFILTERED must be on the screen. One
           flat patch is the bar and not the SOLID floor: presence asks
           whether the colour is there at all, and a shadow layer is a
           sliver a hundred patches wide against a floor of a hundred and
           thirty-five (measured on neonrun). The floor stays where the
           question is the other way round — whether the drawing WEARS a
           colour it should not — because there a wide soft edge can stand
           a plus on a colour nothing was painted in. */
        one.drawnRoles = SK_ROLES.filter(role => one.drawn.some(f => f.toLowerCase() === tokens[role]));
        one.hardRoles = SK_ROLES.filter(role => one.hard.some(f => f.toLowerCase() === tokens[role]));
        one.softRoles = one.drawnRoles.filter(r => one.hardRoles.indexOf(r) < 0);
        const missing = one.hardRoles.filter(role => one.painted[role] < 1);
        one.missing = missing;
        if (missing.length) unpainted.push(one.id + ': ' + missing.map(r => r + ' ' + tokens[r] + ' (0 patches)').join(', '));
        if (one.softRoles.length) softRole.push(one.id.replace('gz-sticker-', '') + ' ' + one.softRoles.map(r => r.replace('--sk-', '') + '=' + one.painted[r]).join(','));
        if (one.drawnRoles.indexOf('--sk-primary') >= 0 && !one.hasPrimary) noPrimary.push(one.id);
        else if (one.drawnRoles.indexOf('--sk-primary') < 0) noPrimaryDrawn.push(one.id.replace('gz-sticker-', ''));
      } else if (one.flats) {
        /* a `pixel` style's drawing is a canvas, so there is no DOM to read:
           the bitmap itself is asked instead — every colour that has a FLAT
           on it must be one of the page's */
        const bad = one.flats.filter(e => e.n >= 2)
          .filter(e => !Object.values(tokens).some(t => near(e.c.split(',').map(Number), hex2rgb(t), COL_TOL)));
        one.wrongFills = bad.map(e => e.c + '×' + e.n);
        if (bad.length) wrongFill.push(one.id + ' (canvas): ' + one.wrongFills.join(', '));
        if (!one.hasPrimary) noPrimaryDrawn.push(one.id.replace('gz-sticker-', '') + ' (canvas)');
      }
      if (one.strayHits.length) stray.push(one.id + ': ' + one.strayHits.join(', '));
      stickerRows.push(one);
    }
    S.stickers = stickerRows;
    const notLive = stickerRows.filter(r => !r.live && !r.canvas).map(r => r.id);
    const noOwn = stickerRows.filter(r => !r.ownPixels).map(r => r.id);
    check('5 · every sticker came live at ' + LIVE_Z + ' (past kits.js ZOOM_NO_TILES), so its own pixels can be read', notLive.length === 0,
      notLive.length ? 'still on a tile: ' + notLive.join(', ') : stickerRows.filter(r => r.live).length + ' SVG + ' + stickerRows.filter(r => r.canvas).length + ' canvas = ' + stickerRows.length);
    check('5 · hiding each section takes its drawing off the screen (the isolation works)', noOwn.length === 0,
      noOwn.length ? 'no own pixels for ' + noOwn.join(', ') : stickerRows.map(r => r.ownPixels).join('/') + ' own pixels');
    check('5 · every live sticker\'s fills and strokes are the PAGE\'s --sk-* tokens and nothing else', wrongFill.length === 0,
      wrongFill.length ? wrongFill.join(' | ') : stickerRows.filter(r => r.fills).length + ' live SVG parts, '
        + stickerRows.filter(r => r.canvas).length + ' pixel canvases; the page\'s seven: ' + Object.values(tokens).join(' '));
    check('5 · every --sk-* role a live sticker DRAWS is on the screen in the page\'s colour', unpainted.length === 0,
      unpainted.length ? unpainted.join(' | ')
        : (stickerRows.some(r => r.drawnRoles)
          ? stickerRows.filter(r => r.hardRoles).map(r => r.id.replace('gz-sticker-', '') + ' ' + r.hardRoles.map(x => x.replace('--sk-', '')).join('+')).join(' · ')
            + (softRole.length ? ' — and under a filter, where a flat pixel is not owed: ' + softRole.join(' · ') : '')
          : 'nothing to ask: every part on this page is a `pixel` style canvas and has no DOM to name a role in — the bitmap answers instead, above'));
    check('5 · --sk-primary ' + tokens['--sk-primary'] + ' is painted by every sticker that draws it', noPrimary.length === 0,
      (noPrimary.length ? 'not found in ' + noPrimary.join(', ') + ' — ' : '')
      + stickerRows.filter(r => r.hasPrimary).map(r => r.id.replace('gz-sticker-', '') + ' ' + r.primaryPixels + '/' + r.ownPixels).join(' · ')
      + (noPrimaryDrawn.length ? ' · the primary is not in the drawing of ' + noPrimaryDrawn.join(', ') + ' (frame-polaroid is a WHITE card by its own header: paper, ink and shadow, no primary at all)' : ''));
    check('5 · the page\'s --sk-primary is painted by at least one sticker', stickerRows.some(r => r.hasPrimary),
      stickerRows.filter(r => r.hasPrimary).length + ' of ' + stickerRows.length + ' parts wear it');
    check('5 · no sticker paints one of the sheet\'s own defaults the page does not use (' + (strays.join(' ') || 'none left to look for') + ')',
      stray.length === 0, stray.length ? stray.join(' | ') : 'clean across ' + stickerRows.length + ' parts, ' + stickerRows.reduce((n, r) => n + r.ownPixels, 0) + ' of their own pixels read');
    check('5 · no {{ }} survives in any live sticker', interp.length === 0, interp.join(', ') || 'none');
    /* AND THE PARTS WITH NOTHING TO SAY. A text part's words come from the
       section's data-text (CONTRACTS §7) and `skText` defaults to '' — so a
       banner the recipe gave no words to is drawn as a blank ribbon. Not a
       failure either: the part is legal and the recipe chose it for its
       shape. Counted so somebody decides. */
    const asked = stickerRows.filter(r => r.live);
    const mute = asked.filter(r => r.textLayer && !r.words).map(r => r.id.replace('gz-sticker-', ''));
    S.wordless = mute;
    note('5 · text parts the recipe gave no data-text',
      !asked.length ? 'not asked: a `pixel` style draws every part into a canvas, and a bitmap has no text layer to find'
        : mute.length ? mute.length + ' of ' + asked.length + ': ' + mute.join(', ') + ' — drawn with an empty word slot'
          : 'none of the ' + asked.length + ' live SVG parts');

    S.errors = A.errors; S.pageErrors = A.pageErrors; S.bad = A.bad;
    summary.boot = S;
    return S;
  } finally { await close(A); }
}

// ── 7 · the opening rectangle, at two screens ────────────────────────────
async function stepFrame(browser, slug, game, view, summary) {
  const A = await open(browser, GAME_URL(slug), { view });
  try {
    await freeze(A.page);
    const info = await read(A.page);
    const b = info.bench;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    const out = [];
    info.sections.forEach(s => {
      const r = s.screen;
      if (!r.w || !r.h) return;
      x0 = Math.min(x0, r.x); y0 = Math.min(y0, r.y); x1 = Math.max(x1, r.x + r.w); y1 = Math.max(y1, r.y + r.h);
      if (r.x < b.x - 1 || r.y < b.y - 1 || r.x + r.w > b.x + b.w + 1 || r.y + r.h > b.y + b.h + 1) out.push(s.gizmo || s.id);
    });
    const screen = { left: (x0 - b.x) / b.w, right: (b.x + b.w - x1) / b.w, top: (y0 - b.y) / b.h, bottom: (b.y + b.h - y1) / b.h };
    // the same question asked of data-open itself: how much of the opening
    // rectangle is not the composition
    const L = game.layout, sl = L.slots;
    const bb = sl.reduce((o, s) => ({ x0: Math.min(o.x0, s.x), y0: Math.min(o.y0, s.y), x1: Math.max(o.x1, s.x + s.w), y1: Math.max(o.y1, s.y + s.h) }),
      { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity });
    const rect = { left: (bb.x0 - L.open.x) / L.open.w, right: (L.open.x + L.open.w - bb.x1) / L.open.w,
      top: (bb.y0 - L.open.y) / L.open.h, bottom: (L.open.y + L.open.h - bb.y1) / L.open.h };
    /* the type, in SCREEN pixels at this viewport's landed camera — the
       number that says whether a visitor can read the page it opened on.
       shot-games.js measures it at 1600 × 1000 and Phase 5 moved the note
       body 22 → 30 to reach 10.1–11.8 px there; §9 5.5's two screens are
       where that number is worth having beside the margins. */
    const typePx = await A.page.evaluate(() => [...new Set([...document.querySelectorAll('.gz-note text')]
      .map(t => +(parseFloat(getComputedStyle(t).fontSize) * Lab.zoom).toFixed(1)))].sort((a, b) => b - a));
    const row = {
      view: view.width + '×' + view.height, zoom: r2(info.zoom), bench: { w: r2(b.w), h: r2(b.h) }, typePx,
      content: { x: r2(x0 - b.x), y: r2(y0 - b.y), w: r2(x1 - x0), h: r2(y1 - y0) },
      open: L.open, bbox: { w: r2(bb.x1 - bb.x0), h: r2(bb.y1 - bb.y0) },
      screenMargin: Object.keys(screen).reduce((o, k) => (o[k] = r2(screen[k] * 100), o), {}),
      rectMargin: Object.keys(rect).reduce((o, k) => (o[k] = r2(rect[k] * 100), o), {}),
      offScreen: out
    };
    (summary.frames = summary.frames || []).push(row);
    const tag = '7 · ' + row.view + ' ';
    check(tag + '· every slot is inside the bench at the landed camera', out.length === 0,
      out.length ? 'off the bench: ' + out.join(', ') : info.sections.length + ' sections, content ' + row.content.w + '×' + row.content.h + ' px in a ' + row.bench.w + '×' + row.bench.h + ' bench at zoom ' + row.zoom
        + '; the notes read at ' + typePx.join('/') + ' screen px');
    /* THE FLOOR NO RECTANGLE CAN GO UNDER. lab.js fits the opening
       rectangle into the bench and centres it, so the composition's own
       aspect against the bench's decides how much paper is left on the
       axis that does not bind — and no `data-open` can take that away,
       because it can only make the rectangle BIGGER than the box (the
       zoom is min(w-fit, h-fit) and enlarging either term can only lower
       it). This is that number, computed with zero margin and zero pad, so
       a failure can be read as "the generator was generous" or "the
       composition is portrait and the screen is not". */
    const ac = (bb.x1 - bb.x0) / (bb.y1 - bb.y0), ab = b.w / b.h;
    const floor = ac < ab ? (b.w - b.h * ac) / (2 * b.w) : (b.h - b.w / ac) / (2 * b.h);
    row.marginFloor = r2(floor * 100);
    row.floorAxis = ac < ab ? 'left/right' : 'top/bottom';
    const worstS = Math.max(screen.left, screen.right, screen.top, screen.bottom);
    check(tag + '· no side of the SCREEN is more than ' + pct(MARGIN_MAX) + ' empty margin', worstS <= MARGIN_MAX,
      'L ' + row.screenMargin.left + ' R ' + row.screenMargin.right + ' T ' + row.screenMargin.top + ' B ' + row.screenMargin.bottom
      + ' % — a composition ' + row.bbox.w + '×' + row.bbox.h + ' (' + r2(ac) + ':1) centred in a ' + row.bench.w + '×' + row.bench.h + ' bench ('
      + r2(ab) + ':1) cannot do better than ' + row.marginFloor + ' % on ' + row.floorAxis + ' at any zoom');
    /* THE SAME QUESTION ASKED OF THE RECTANGLE ITSELF, which is the half of
       it the generator can answer. The screen reading above mixes two
       things: how generous `data-open` is, and how a portrait composition
       sits on a landscape bench. This one is only the first. It does not
       change with the viewport — it is a property of `layout.open` — and it
       is reported at both because a reader comparing the two rows should
       see that it does not. */
    const worstR = Math.max(rect.left, rect.right, rect.top, rect.bottom);
    const bare = { w: r2((bb.x1 - bb.x0) + 2 * 120), h: r2((bb.y1 - bb.y0) + 2 * 120) };
    check(tag + '· data-open is not more than ' + pct(MARGIN_MAX) + ' bare paper on any side of the composition', worstR <= MARGIN_MAX,
      'L ' + row.rectMargin.left + ' R ' + row.rectMargin.right + ' T ' + row.rectMargin.top + ' B ' + row.rectMargin.bottom
      + ' % (open ' + L.open.w + '×' + L.open.h + ' round a box ' + row.bbox.w + '×' + row.bbox.h
      + '; Appendix E\'s box + 120 of margin is ' + bare.w + '×' + bare.h + ', and since 2026-09-07 that is the whole rule — recipes.js openOf() no longer widens it to the bench\'s '
      + r2(3200 / 1390) + ':1, which could only lower the zoom a page lands at)');
    fs.mkdirSync(SHOTS, { recursive: true });
    await A.page.screenshot({ path: path.join(SHOTS, 'verify-' + slug + '-' + view.width + '.png') });
    check(tag + '· boots clean at this viewport too', A.errors.length === 0 && A.pageErrors.length === 0 && A.bad.length === 0,
      (A.errors.concat(A.pageErrors, A.bad).slice(0, 3).join(' | ')) || 'none');
    return row;
  } finally { await close(A); }
}

// ── 8 · the store is the page's own ──────────────────────────────────────
async function stepStore(browser, slug, summary) {
  const ctx = await browser.newContext({ viewport: VIEW, deviceScaleFactor: 1 });
  const A = await open(browser, GAME_URL(slug), { ctx });
  try {
    const id = (await read(A.page)).stickers[0].id;
    await camTo(A.page, 1, id);
    await A.page.waitForTimeout(CAM);
    await drag(A.page, id, 120, 40);
    const keys = await A.page.evaluate(() => Object.keys(localStorage).sort());
    const scope = 'knoll-lab2:games/' + slug + ':';
    const off = keys.filter(k => k.indexOf(scope) !== 0);
    const key = await A.page.evaluate(() => Lab.storeKey('x'));
    check('8 · Lab.storeKey(\'x\') is ' + scope + 'x', key === scope + 'x', key);
    check('8 · every localStorage key the page wrote carries games/' + slug + ' (' + keys.length + ' keys)',
      keys.length > 0 && off.length === 0, off.length ? 'bare: ' + off.join(', ') : keys.join(', '));
    // the bench, in the SAME storage
    const B = await open(browser, BENCH_URL, { ctx });
    const bkey = await B.page.evaluate(() => Lab.storeKey('x'));
    const bkeys = await B.page.evaluate(() => Object.keys(localStorage).sort());
    const bench = bkeys.filter(k => k.indexOf('games/') < 0);
    check('8 · the sandbox bench in the SAME storage derives bare knoll-lab2: keys', bkey === 'knoll-lab2:x', bkey);
    check('8 · nothing the bench reads carries games/' + slug,
      bench.every(k => k.indexOf('games/') < 0) && bkeys.some(k => k.indexOf(scope) === 0),
      'the bench wrote ' + bench.length + ' bare keys beside the game\'s ' + (bkeys.length - bench.length) + '; the two lists do not meet');
    summary.store = { gameKeys: keys, benchKeys: bkeys };
    await close(B);
  } finally { await close(A); try { await ctx.close(); } catch (e) {} }
}

/* WHERE TO PRESS. The centre of a section's box is not always the section:
   the pile is markup order, and on pixelfort the logo sits over the middle
   of the burst that is meant to be behind it — a press there carried the
   LOGO 200 units and left the burst where it was, which is a harness fault
   and not the page's (found 2026-09-07, the first run of step 6). So the
   point is chosen by asking the page: a 7 × 7 lattice inset over the box,
   nearest the centre first, and the first point elementFromPoint answers
   with THIS section is the one pressed. The bottom-right eighth is left
   out whatever it answers — that corner is the `.gz-size` button, and a
   press there re-cuts the box instead of carrying it. */
async function pressPoint(page, id) {
  return page.evaluate(id => {
    const el = document.getElementById(id), r = el.getBoundingClientRect();
    const N = 7, pts = [];
    for (let a = 0; a < N; a++) for (let b = 0; b < N; b++) {
      const fx = 0.15 + 0.7 * (b / (N - 1)), fy = 0.15 + 0.7 * (a / (N - 1));
      if (fx > 0.75 && fy > 0.75) continue;
      pts.push({ x: r.x + r.width * fx, y: r.y + r.height * fy, d: Math.hypot(fx - 0.5, fy - 0.5) });
    }
    pts.sort((p, q) => p.d - q.d);
    for (const p of pts) {
      const hit = document.elementFromPoint(p.x, p.y);
      const gz = hit && hit.closest ? hit.closest('.gz') : null;
      if (gz === el) return { x: p.x, y: p.y, ok: true };
    }
    return { x: r.x + r.width / 2, y: r.y + r.height / 2, ok: false };
  }, id);
}

async function drag(page, id, dx, dy) {
  const p = await pressPoint(page, id);
  const c = await page.evaluate(([id, p]) => {
    return { x: p.x, y: p.y, ok: p.ok, zoom: Lab.zoom };
  }, [id, p]);
  await page.mouse.move(c.x, c.y);
  await page.mouse.down();
  await page.mouse.move(c.x + dx / 2, c.y + dy / 2, { steps: 6 });
  await page.mouse.move(c.x + dx, c.y + dy, { steps: 6 });
  await page.mouse.up();
  await page.waitForTimeout(CAM);
  const now = await page.evaluate(id => {
    const el = document.getElementById(id);
    return { x: parseFloat(el.style.left) || 0, y: parseFloat(el.style.top) || 0 };
  }, id);
  now.pressed = c.ok;
  return now;
}

// ── 6 · a drop is kept — the REAL door on 4322 ───────────────────────────
async function stepDoor(browser, slug, before, summary) {
  const FILE = path.join(TEST, 'games', slug, 'index.html');
  const BAK = FILE + '.keep-bak';
  const DOOR = '/_lab2/test/games/' + slug;
  const A = await open(browser, GAME_URL(slug), { door: 'live' });
  try {
    await A.page.waitForFunction(() => window.Keep && Keep.live === true, null, { timeout: 10000 }).catch(() => {});
    const live = await A.page.evaluate(() => !!(window.Keep && Keep.live));
    check('6 · Keep.live is true on ' + GAME_URL(slug).replace(ORIGIN, ''), live,
      'the door knocked on was ' + [...new Set(A.doorReqs)].join(', '));
    check('6 · every knock went to ' + DOOR, A.doorReqs.length > 0 && A.doorReqs.every(r => r.endsWith(' ' + DOOR)), A.doorReqs.join(', '));

    // a sticker that is not a frame: moving a frame would leave its picture
    const info = await read(A.page);
    const frames = new Set(info.pics.filter(p => p.shot).map(p => p.prevId));
    const st = info.stickers.find(s => !frames.has(s.id)) || info.stickers[0];
    await camTo(A.page, 1, st.id);
    await A.page.waitForTimeout(CAM);
    const dropped = await drag(A.page, st.id, DRAG_PX, 0);
    check('6 · the press landed on the sticker itself and not on what is over it', dropped.pressed,
      dropped.pressed ? st.id + ' answered elementFromPoint' : 'no point in ' + st.id + '\'s box belongs to it — something is over all of it');
    check('6 · the sticker moved ' + DRAG_PX + ' world units at 100 %',
      Math.abs((dropped.x - st.world.x) - DRAG_PX) <= XY_TOL && Math.abs(dropped.y - st.world.y) <= XY_TOL,
      st.id + ': ' + st.world.x + ',' + st.world.y + ' → ' + dropped.x + ',' + dropped.y);

    const wait = A.page.waitForResponse(r => r.request().method() === 'POST' && new URL(r.url()).pathname === DOOR, { timeout: SAVE_WAIT });
    await A.page.keyboard.press('Control+s');
    const out = await wait.then(r => r.json()).catch(e => ({ error: String(e) }));
    check('6 · ctrl+s answered from the door', !!(out && out.ok), JSON.stringify(out));
    await A.page.waitForTimeout(400);

    const now = fs.readFileSync(FILE, 'utf8');
    const tag = attrsOf(tagOf(now, st.gizmo));
    check('6 · the file carries the drop', Math.abs(+tag['data-home-x'] - dropped.x) <= XY_TOL && Math.abs(+tag['data-home-y'] - dropped.y) <= XY_TOL,
      st.gizmo + ' data-home-x=' + tag['data-home-x'] + ' data-home-y=' + tag['data-home-y'] + ' against ' + r2(dropped.x) + ',' + r2(dropped.y));
    const bakNow = fs.existsSync(BAK);
    check('6 · games/' + slug + '/index.html.keep-bak exists', bakNow,
      bakNow ? fs.statSync(BAK).size + ' bytes' : 'MISSING — serve.js writes one per file per PROCESS (backedUp), so restart the sandbox server before this step');
    check('6 · the backup is the page as it stood before the save', bakNow && Buffer.compare(fs.readFileSync(BAK), before.page) === 0,
      bakNow ? (Buffer.compare(fs.readFileSync(BAK), before.page) === 0 ? before.page.length + ' bytes, byte-identical' : 'differs from the snapshot') : '—');
    check('6 · the same sections in the same order after the save',
      JSON.stringify(gizmosOf(now)) === JSON.stringify(gizmosOf(before.page.toString())), gizmosOf(now).length + ' sections');
    await close(A);

    // a FRESH context: empty localStorage, so the position is the file's
    const B = await open(browser, GAME_URL(slug));
    const again = await B.page.evaluate(id => {
      const el = document.getElementById(id);
      return { x: parseFloat(el.style.left) || 0, y: parseFloat(el.style.top) || 0 };
    }, st.id);
    check('6 · reloaded in a fresh context, the sticker is where it was dropped',
      Math.abs(again.x - dropped.x) <= XY_TOL && Math.abs(again.y - dropped.y) <= XY_TOL,
      st.id + ' at ' + again.x + ',' + again.y + ' against the drop at ' + r2(dropped.x) + ',' + r2(dropped.y));
    summary.door = { sticker: st.id, gizmo: st.gizmo, from: [st.world.x, st.world.y], dropped, reloaded: again, answer: out };
    await close(B);
  } finally { try { await close(A); } catch (e) {} }
}

// ══ the run ══════════════════════════════════════════════════════════════
(async () => {
  const argv = process.argv.slice(2);
  const doDoor = argv.indexOf('--no-door') < 0;
  const slugs = argv.filter(a => !/^--/.test(a));
  const list = slugs.length ? slugs : ALL;
  fs.mkdirSync(OUT, { recursive: true });
  fs.mkdirSync(SHOTS, { recursive: true });

  const slots = sheetSlots();
  const games = {}, before = {};
  for (const slug of list) {
    const dir = path.join(TEST, 'games', slug);
    games[slug] = JSON.parse(fs.readFileSync(path.join(dir, 'game.json'), 'utf8'));
    const page = fs.readFileSync(path.join(dir, 'index.html'));
    const bakFile = path.join(dir, 'index.html.keep-bak');
    before[slug] = { page, bak: fs.existsSync(bakFile) ? fs.readFileSync(bakFile) : null };
    fs.mkdirSync(path.join(OUT, slug), { recursive: true });
    fs.writeFileSync(path.join(OUT, slug, 'index.before.html'), page);
    // the build's own backup is moved out of the way: step 6 asks whether
    // the DOOR wrote one, and a file already there answers nothing
    if (doDoor && before[slug].bak) { try { fs.unlinkSync(bakFile); } catch (e) {} }
  }

  const summary = { at: new Date().toISOString(), origin: ORIGIN, view: VIEW, wide: WIDE, laptop: LAPTOP, slugs: list, pages: {} };
  const browser = await chromium.launch({ channel: 'chrome', headless: false, args: ['--window-size=1616,1110', '--window-position=0,0'] });
  try {
    for (const slug of list) {
      group = slug;
      console.log('\n══ ' + slug + ' ' + '═'.repeat(Math.max(0, 60 - slug.length)));
      const S = summary.pages[slug] = {};
      await stepsBoot(browser, slug, games[slug], slots, S);
      await stepFrame(browser, slug, games[slug], WIDE, S);
      await stepFrame(browser, slug, games[slug], LAPTOP, S);
      await stepStore(browser, slug, S);
      if (doDoor) await stepDoor(browser, slug, before[slug], S);
      else note('6 · the door', 'skipped (--no-door)');
    }
  } catch (e) {
    group = group || '—';
    check('the run itself', false, String((e && e.stack) || e));
  } finally {
    try { await browser.close(); } catch (e) {}
    await sleep(UNLOAD);         // keep.js sends a keepalive POST on pagehide
    group = 'restore';
    console.log('\n══ restore ' + '═'.repeat(52));
    for (const slug of list) {
      const dir = path.join(TEST, 'games', slug);
      const FILE = path.join(dir, 'index.html'), BAK = FILE + '.keep-bak', TMP = FILE + '.tmp';
      const b = before[slug];
      const now = fs.readFileSync(FILE);
      /* WHAT THIS RUN IS ALLOWED TO HAVE CHANGED: where things stand. A
         drag and a ctrl+s can move data-home-x/y on the section that was
         carried and re-rank data-home-z on every section — and nothing
         else: the same gizmos, in the same order, with the same markup
         round them. So those three attributes are taken out of both files
         and the rest must be identical, character for character. Anything
         structural — a section added or gone, a data-w re-cut, a copies
         block written — is somebody else's edit and the file is NOT put
         back over it; the snapshot stays in results/game/<slug>/ and this
         check says so. (It is looser than verify-keep.js's rule on ONE
         attribute, x/y on any section rather than on the one dragged, and
         that is deliberate: the first run of step 6 pressed the middle of
         a burst that the logo was sitting over, carried the logo instead,
         and then refused to put the file back — a harness fault that left
         a page dirty. pressPoint() closed the fault; this closes the
         consequence.) */
      const neutral = html => html
        .replace(/\s+data-home-z="[^"]*"/g, '')
        .replace(/\s+data-home-x="[^"]*"/g, '')
        .replace(/\s+data-home-y="[^"]*"/g, '');
      const mine = neutral(now.toString()) === neutral(b.page.toString())
        && JSON.stringify(gizmosOf(now.toString())) === JSON.stringify(gizmosOf(b.page.toString()));
      if (mine) fs.writeFileSync(FILE, b.page);
      check('restore · ' + slug + ': only this run\'s edits were on the file', mine,
        mine ? 'put back from results/game/' + slug + '/index.before.html' : 'NOT restored — the file changed in a way this run cannot account for');
      try { if (fs.existsSync(BAK)) fs.unlinkSync(BAK); } catch (e) {}
      try { if (fs.existsSync(TMP)) fs.unlinkSync(TMP); } catch (e) {}
      if (b.bak) fs.writeFileSync(BAK, b.bak);           // the build's own, put back
    }
    /* AND THEN LOOK AGAIN. keep.js sends a keepalive POST on `pagehide`
       when the stamp moved since its last save, and the server answers it
       on its own schedule — so a save can land AFTER the file was put back,
       and an assertion made in the same breath as the write is an
       assertion about the write and not about the file. A first cut checked
       byte-identity immediately, passed three runs in a row, and left a
       banner 200 units from where the recipe put it; the next run then
       snapshotted the drift and called it the baseline. UNLOAD again, then
       read from disk, then put it back once more if something arrived. */
    await sleep(UNLOAD);
    for (const slug of list) {
      const FILE = path.join(TEST, 'games', slug, 'index.html');
      const b = before[slug];
      let now = fs.readFileSync(FILE);
      const late = Buffer.compare(now, b.page) !== 0;
      if (late) { fs.writeFileSync(FILE, b.page); await sleep(200); now = fs.readFileSync(FILE); }
      check('restore · ' + slug + ': index.html is byte-identical to before, ' + UNLOAD + ' ms after the last one was put back',
        Buffer.compare(now, b.page) === 0,
        b.page.length + ' bytes' + (late ? ' — a save landed after the restore and was undone; the door was still answering when the browser closed' : ''));
    }
    summary.checks = results;
    fs.writeFileSync(path.join(OUT, 'summary.json'), JSON.stringify(summary, null, 1));
    const bad = results.filter(r => r.ok === false);
    console.log('\n' + (bad.length ? bad.length + ' FAILED of ' + results.filter(r => r.ok !== null).length : 'ALL PASS (' + results.filter(r => r.ok !== null).length + ' checks)'));
    bad.forEach(r => console.log('  FAIL ' + r.slug + ' · ' + r.name + ' — ' + r.info));
    console.log('results → ' + OUT);
    process.exit(bad.length ? 1 : 0);
  }
})();
