/* ─── MAKE-FIXTURES ───────────────────────────────────────────────────────
   Three synthetic games, drawn from seeds, for every later phase of the
   Press Table to be tested against (PRESS-TABLE-PLAN.md §4 step 4 and
   Appendix H; CONTRACTS.md §9 for the names). Real press kits are big,
   copyrighted and different every time; these are small, ours, and the same
   every time, so a golden stats file (Phase 3), a byte-identical theme
   (Phase 2) and a page build (Phase 5) can all be diffed against them.

   Run from site/ (so require('playwright') resolves from Desktop/node_modules):

       node lab2/test/press/tools/make-fixtures.js

   It writes press/fixtures/<name>/art/*.png, manifest.json (valid against
   Appendix A's manifest.schema.json — the sha256 of every asset is the one
   of the bytes just written) and expected.json (Appendix H's expectations,
   the values the Phase 3 tests assert), then prints every file with its
   size and a few sanity numbers measured on the pixels it drew.

   HOW IT DRAWS. Playwright launches headless system Chrome ({channel:'chrome',
   headless:true} — rendering only, so unlike perf/*.js it need not be headed)
   and every picture is a page <canvas>: the pixel art is an index buffer
   blown up by hand, the painterly plates are ImageData filled pixel by pixel,
   the neon plates are stroked paths over a background written pixel by
   pixel. The raw RGBA comes back to Node, which writes the PNG itself (A PNG
   WRITER, below): Chrome's toDataURL made the same plates two to three times
   bigger. No native image library, nothing fetched, no canvas gradient
   (Skia dithers them — half a megabyte of noise per plate), no system font
   (both lettered logos are drawn from a stroke alphabet, because a font
   would make the bytes depend on the machine). Every picture has its own
   mulberry32 seed (the SEEDS table below; the generator is the one CONTRACTS
   §1 gives Palette.rng), so running twice yields identical bytes — checked
   on 2026-09-07 by running twice and comparing every sha256.

   WHAT EACH FIXTURE IS MEANT TO TRIGGER (Phase 3, §7 of the plan):

   pixelfort — 16-colour pixel art, 1-px black outlines at native scale,
     scaled ×4 nearest-neighbour. Screenshots are 160×90 scenes → 640×360,
     the portrait key art a 120×160 scene → 480×640, the logo 64×24 glyph
     blocks → 256×96 on alpha. Every output pixel therefore sits on a 4-px
     grid, which is what the pixel-grid statistic looks for: shrink by s and
     re-enlarge, and the error is zero at s = 4 (the plan's floor is 2 % of
     full scale). The outlines are 4 px wide after scaling, black (luminance
     0), around every object — the outline test wants ≥ 45 % of strong-edge
     pixels darker than 0.25 luminance. Sixteen colours posterise to sixteen
     5-bit bins, under the plan's "limited palette" line of 24.
   mosslight — layered value noise (bilinear interpolation of a coarse random
     grid, six octaves, smoothstep so there is no crease anywhere), muted
     greens and ochres, a soft radial light, a vignette, and a canvas weave.
     No edge in the whole picture: outline.present must come back false
     (the 99th percentile of Sobel magnitude is 0.13 against neonrun's
     1.1–2.1, and one pixel in three to ten thousand is over 0.2 where
     neonrun has one in eight to twelve), dark false (mean OKLab L
     sits near 0.63), and the weave is the texture (hfEnergy high →
     painterly / cozy-soft). THE WEAVE, and why it has the shape it has: the
     two finest noise octaves are under one posterise step and vanish, so
     the first cut of these plates measured a mean |Laplacian| on non-edge
     pixels of 0.0008 — the same as neonrun's ground (0.0006–0.0016),
     nothing Phase 3 could call high, and a plate that ranks `flat` rather
     than `painterly` (Appendix B maps shading and texture off hfEnergy).
     Grain per pixel is what a PNG cannot afford (SIZE below). What it can
     afford is a value that is constant down a column: the Up filter
     predicts each byte from the one above it, so a per-column offset
     cancels and costs nothing beyond forcing Up on every row (the writer
     loses its two-dimensional predictors — measured at 19 KB a plate,
     whatever the amplitude; anything that varies along a row as well cost
     100 KB a plate). So weave() adds one random offset of up to FIT's weave
     (±4 of 255, a little over half a 36-level step) to every column BEFORE
     the posterise: each column quantises at its own phase, the contours a
     posterise would draw are broken into a one-pixel vertical grain, and
     the plates read as brushed canvas with no banding. Measured on the
     verify pass (2026-09-07): |Laplacian| 0.016–0.019 native and
     0.013–0.018 on a 512-px copy (neonrun 0.002–0.008 there, the aliasing
     of its lines); Sobel p99 0.125; the same offset added AFTER the
     posterise instead left the banding and read worse.
   neonrun — near-black ground (#07060c) with a perspective grid and a few
     thin lines in two saturated accents, magenta #ff2fb0 and cyan #22e6ff,
     each line drawn three times (wide and faint, medium, thin and bright) so
     it glows. dark must come back true; the chroma should read as loud, and
     the lines are thin (1–2 px at the core), which is the neon preset's
     lineWeight 0.3.

   CHOSEN NUMBERS. Palette of sixteen for pixelfort because Appendix H says
   16-colour and the plan's "limited palette" line is 24 bins. Scene sizes
   are Appendix H's, divided by 4. The logos of mosslight and neonrun are
   640×240 — Appendix H gives no size, and 8:3 is the aspect the pixel logo
   already has (256×96), so all three logos land in a recipe the same shape.
   The neon glow's three passes are widths 5 / 3 / 1.2 at alphas .10 / .30
   / 1 (scaled by w/1280, never under 1 px): the wide pass has to be faint
   enough that the grid does not fog the ground and lift the dark statistic,
   and the core has to stay under 2 px so the outline weight reads thin. The
   floor's fan is seven lines (i = −3…3, a spacing of w/4) and the road is
   1.2× the grid's width: a diagonal glowing line is the one thing in a neon
   plate a PNG pays for pixel by pixel (a horizontal or vertical one repeats
   the row above and costs nothing), and a fan of nineteen was 200 KB a
   plate. Under the lines, the ground is #07060c at the top and bottom edges
   and runs through indigo (40,12,90) to magenta (128,24,88) at the horizon,
   and teal (14,84,100) back through indigo below it: with a plain #07060c
   ground the plate's mean OKLCH chroma was 0.06 (nothing a "saturation
   high" test could pass), and at low lightness sRGB only holds real chroma
   in the blue–violet hues. With the glow it measures 0.085 at a mean L of
   0.25 — dark, and as loud as a dark plate gets. mosslight's octaves are
   cells of 420, 210, 105, 52, 26, 13 px at amplitudes 1, .55, .3, .16, .08,
   .04 — halving cells and roughly halving amplitude is ordinary fractal
   noise; 420 is the largest cell that still gives a 1280-wide plate three
   or four soft regions. Contrast is held down by compressing the field
   around its middle (× .65 — see SIZE for why not .8) before it meets the
   colour ramps; the plates measure a standard deviation of OKLab L of
   0.04–0.08.

   SIZE. Appendix H asks for ≤ 300 KB per fixture folder (BUDGET below:
   307 200 bytes). The pixel art is 24 KB. For the two big fixtures the
   ladder given was: full size first; if over, posterise the plates to ~48
   levels per channel after the light pass (a step of 5.4 in 255 —
   invisible on a soft plate, but it turns the PNG's residual rows into long
   runs of zeros); if still over, drop the screenshots to 960×540. Measured
   on 2026-09-07 with the seeds above: mosslight was 2.66 MB at full size
   through Chrome's encoder, 424 KB at 48 levels through the writer below,
   342 KB at 960×540 — the last rung, still over — so the plate contrast
   went from × .8 to × .65 (fewer contours to encode; the plates are meant to
   be low-contrast) and the logo lost its second, lighter stroke (13 KB of
   anti-aliased edge on a 36 KB logo): 293 KB. The verify pass then found
   the plates had lost their texture (the weave paragraph above), and the
   weave costs the writer its two-dimensional predictors: with it, 48 levels
   came to 372 KB, 40 to 333 KB. Posterising to 36 levels instead (a step of
   7.3 in 255, which the weave's column jitter breaks up so no contour
   shows) pays for it: 296 KB, the hero 77 KB and the shots 44–53 KB, with
   the logo, manifest and expected.json unchanged. neonrun was 2.85 MB, then
   1.1 MB with the writer and a fan of nineteen, 354 KB at the last rung
   with thirteen; with seven lines and the 5/3 px passes it was 306 KB at 48
   levels — one kilobyte under the line, which the next seed change would
   eat — so its plates are posterised to 44 (a step of 5.9): 292 KB. FIT
   below holds the outcome; the same account is in the result the
   orchestrator gets.
   ───────────────────────────────────────────────────────────────────────── */
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const zlib = require('zlib');
const { chromium } = require('playwright');

const OUT = path.resolve(__dirname, '..', 'fixtures');
const ATTESTED_AT = '2026-09-07T00:00:00.000Z';     // fixed so manifest.json is byte-stable too
const BUDGET = 300 * 1024;                          // Appendix H: ≤ 300 KB per fixture folder

/* Seeds — one per picture, written down so a regenerated fixture is the
   same fixture. The numbers are arbitrary and only have to be distinct. */
const SEEDS = {
  pixelfort: { logo: 0x50580001, 'keyart-portrait': 0x50580002, 'shot-1': 0x50580011, 'shot-2': 0x50580012, 'shot-3': 0x50580013, 'shot-4': 0x50580014 },
  mosslight: { logo: 0x4d4f0001, hero: 0x4d4f0002, 'shot-1': 0x4d4f0011, 'shot-2': 0x4d4f0012, 'shot-3': 0x4d4f0013, 'shot-4': 0x4d4f0014 },
  neonrun:   { logo: 0x4e450001, hero: 0x4e450002, 'shot-1': 0x4e450011, 'shot-2': 0x4e450012, 'shot-3': 0x4e450013, 'shot-4': 0x4e450014 },
};

/* FIT — the size ladder's outcome for the two big fixtures (see SIZE above).
   levels: posterise the opaque plates to this many levels per channel (0 =
   none). shot: the screenshot size actually written. weave: the canvas
   weave's per-column offset, ±this many of 255, added to the opaque plates
   before the posterise (the weave paragraph in the header); absent = none.
   The numbers were measured on 2026-09-07 and are quoted in the header's
   SIZE paragraph. */
const FIT = {
  mosslight: { levels: 36, shot: [960, 540], weave: 4 },
  neonrun:   { levels: 44, shot: [960, 540] },
};
const WEAVE_SEED = 0x57454156;   // 'WEAV': XORed into a picture's seed so the weave is not the noise field's sequence replayed

const EXPECTED_FROM = 'PRESS-TABLE-PLAN.md Appendix H (2026-09-07): numbers are the plan\'s; where it only gave a word (high, thin) the word is kept and Phase 3 pins the number';

const FIXTURES = [
  {
    name: 'pixelfort',
    manifest: {
      slug: 'pixelfort', title: 'Pixelfort',
      tagline: 'Hold the wall. Count the sunsets.',
      description: 'A small stone fort, a smaller garrison, and a very long summer. Pixelfort is a wall-building strategy game drawn in sixteen colours: raise towers, post knights on the battlements, and see how many dawns you can hold out for. Every sprite is hand-placed on a four-pixel grid.',
      developer: 'Fixture Games', publisher: 'Fixture Games', releaseDate: '2027',
      platforms: ['pc', 'switch'], genres: ['strategy', 'pixel art', 'tower defence'],
      links: { steam: 'https://example.com/pixelfort/steam', site: 'https://example.com/pixelfort', trailer: 'https://example.com/pixelfort/trailer' },
    },
    images: [
      { id: 'logo', role: 'logo', kind: 'pixel-logo', w: 256, h: 96, alpha: true },
      { id: 'keyart-portrait', role: 'keyart', kind: 'pixel-scene', w: 480, h: 640, time: 'dusk', portrait: true },
      { id: 'shot-1', role: 'screenshot', kind: 'pixel-scene', w: 640, h: 360, time: 'day' },
      { id: 'shot-2', role: 'screenshot', kind: 'pixel-scene', w: 640, h: 360, time: 'dusk' },
      { id: 'shot-3', role: 'screenshot', kind: 'pixel-scene', w: 640, h: 360, time: 'day' },
      { id: 'shot-4', role: 'screenshot', kind: 'pixel-scene', w: 640, h: 360, time: 'night' },
    ],
    expected: {
      _from: EXPECTED_FROM,
      stats: { pixelSize: 4, outline: { present: true }, paletteCount: { max: 23 } },
      preset: ['pixel'], pairing: 'pixel', recipe: ['poster'],
    },
  },
  {
    name: 'mosslight',
    manifest: {
      slug: 'mosslight', title: 'Mosslight',
      tagline: 'A slow walk through a lit wood.',
      description: 'Mosslight is a wordless walk through a painted forest where the light does the talking. There is nothing to fight and nothing to collect: you follow the glow between the trees, sit when you like, and the wood changes around you. Every frame is a soft plate of moss and ochre with no hard line in it.',
      developer: 'Fixture Games', publisher: 'Fixture Games', releaseDate: '2026-11-05',
      platforms: ['pc', 'mac', 'switch'], genres: ['exploration', 'cozy', 'painterly'],
      links: { itch: 'https://example.com/mosslight/itch', site: 'https://example.com/mosslight', press: 'https://example.com/mosslight/press' },
    },
    images: [
      { id: 'logo', role: 'logo', kind: 'hand-logo', w: 640, h: 240, alpha: true },
      { id: 'hero', role: 'hero', kind: 'moss-plate', w: 1600, h: 900 },
      { id: 'shot-1', role: 'screenshot', kind: 'moss-plate', shot: true },
      { id: 'shot-2', role: 'screenshot', kind: 'moss-plate', shot: true },
      { id: 'shot-3', role: 'screenshot', kind: 'moss-plate', shot: true },
      { id: 'shot-4', role: 'screenshot', kind: 'moss-plate', shot: true },
    ],
    expected: {
      _from: EXPECTED_FROM,
      stats: { dark: false, outline: { present: false }, hfEnergy: 'high' },
      preset: ['painterly', 'cozy-soft'], pairing: 'hand', recipe: ['widescreen', 'scrapbook'],
    },
  },
  {
    name: 'neonrun',
    manifest: {
      slug: 'neonrun', title: 'Neon Run',
      tagline: 'Outrun the grid.',
      description: 'An endless runner on a wireframe highway that never ends and never repeats. Two colours, one lane, no brakes: Neon Run is about the line you leave behind you and how long it glows. Built for a synth soundtrack and a dark room.',
      developer: 'Fixture Games', publisher: 'Fixture Games', releaseDate: '2027-03',
      platforms: ['pc', 'ps5', 'xbox'], genres: ['runner', 'synthwave', 'arcade'],
      links: { steam: 'https://example.com/neonrun/steam', site: 'https://example.com/neonrun', trailer: 'https://example.com/neonrun/trailer' },
    },
    images: [
      { id: 'logo', role: 'logo', kind: 'neon-logo', w: 640, h: 240, alpha: true },
      { id: 'hero', role: 'hero', kind: 'neon-plate', w: 1600, h: 900 },
      { id: 'shot-1', role: 'screenshot', kind: 'neon-plate', shot: true },
      { id: 'shot-2', role: 'screenshot', kind: 'neon-plate', shot: true },
      { id: 'shot-3', role: 'screenshot', kind: 'neon-plate', shot: true },
      { id: 'shot-4', role: 'screenshot', kind: 'neon-plate', shot: true },
    ],
    expected: {
      _from: EXPECTED_FROM,
      stats: { dark: true, saturation: 'high', outline: { present: true, weight: 'thin' } },
      preset: ['neon'], pairing: 'scifi', recipe: ['widescreen'], harmony: 'loud',
    },
  },
];

/* ─── THE PAGE SIDE ─────────────────────────────────────────────────────────
   One function, serialised by page.evaluate, holding every drawing routine.
   It must not reach for anything in Node scope. job = {kind, w, h, seed,
   alpha, time, portrait, levels}; it returns {dataUrl, check}. */
function renderInPage(job) {
  /* mulberry32 — the same generator CONTRACTS §1 gives Palette.rng. */
  function mulberry32(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  const rng = mulberry32(job.seed);
  const R = (a, b) => a + rng() * (b - a);
  const RI = (a, b) => Math.floor(R(a, b + 1));
  const pick = (arr) => arr[Math.floor(rng() * arr.length)];
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const W = job.w, H = job.h;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });

  /* ── the pixel palette (pixelfort), sixteen entries, index 0 is the outline ── */
  const PAL = [
    [0x0c, 0x0a, 0x10], // 0 black — every outline
    [0x1f, 0x23, 0x40], // 1 navy
    [0x4a, 0x3b, 0x6b], // 2 purple
    [0x5b, 0x8f, 0xd6], // 3 sky blue
    [0x9f, 0xd0, 0xf2], // 4 light sky
    [0xf4, 0xf0, 0xe8], // 5 white
    [0x3d, 0x6b, 0x2f], // 6 dark green
    [0x6f, 0xa8, 0x43], // 7 green
    [0xa8, 0xd1, 0x5b], // 8 light green
    [0x6b, 0x4a, 0x2e], // 9 dark brown
    [0xa8, 0x77, 0x3f], // 10 brown
    [0xd9, 0xb3, 0x7a], // 11 sand
    [0x8a, 0x8f, 0x96], // 12 stone grey
    [0xc9, 0xcc, 0xd1], // 13 light stone
    [0xe0, 0x47, 0x3f], // 14 red
    [0xe8, 0xb3, 0x3a], // 15 yellow
  ];
  const BLACK = 0, NAVY = 1, PURPLE = 2, SKY = 3, LSKY = 4, WHITE = 5, DGREEN = 6, GREEN = 7, LGREEN = 8,
        DBROWN = 9, BROWN = 10, SAND = 11, GREY = 12, LGREY = 13, RED = 14, YELLOW = 15, CLEAR = 255;

  /* An index buffer with an object id per pixel. The outline pass paints
     black on any pixel that touches (4-neighbour) a pixel of a HIGHER id —
     ids are handed out in drawing order, so the later, nearer thing gets a
     1-px line around its silhouette on whatever is behind it. Pixels of one
     id never get a line between them, which is how a wall keeps its brick
     speckle and a sky keeps its bands. */
  function pixelBuffer(nw, nh, fill) {
    const idx = new Uint8Array(nw * nh).fill(fill);
    const oid = new Int16Array(nw * nh);
    let next = 1;
    const b = {
      nw, nh, idx, oid,
      id() { return next++; },
      put(x, y, c, id) { if (x < 0 || y < 0 || x >= nw || y >= nh) return; const p = y * nw + x; idx[p] = c; oid[p] = id; },
      rect(x, y, w, h, c, id) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) b.put(x + i, y + j, c, id); },
      sprite(x, y, rows, map, id, s) {
        s = s || 1;
        rows.forEach((row, j) => { for (let i = 0; i < row.length; i++) { const ch = row[i]; if (ch === '.') continue; b.rect(x + i * s, y + j * s, s, s, map[ch], id); } });
      },
      outline(eight) {
        for (let y = 0; y < nh; y++) for (let x = 0; x < nw; x++) {
          const p = y * nw + x, id = oid[p];
          let hit = false;
          const t = (xx, yy) => { if (xx < 0 || yy < 0 || xx >= nw || yy >= nh) return; if (oid[yy * nw + xx] > id) hit = true; };
          t(x - 1, y); t(x + 1, y); t(x, y - 1); t(x, y + 1);
          if (eight) { t(x - 1, y - 1); t(x + 1, y - 1); t(x - 1, y + 1); t(x + 1, y + 1); }
          if (hit) idx[p] = BLACK;
        }
      },
      /* blow up ×k with no smoothing at all: each native pixel becomes a k×k block */
      blit(k) {
        const img = ctx.createImageData(nw * k, nh * k), d = img.data;
        for (let y = 0; y < nh; y++) for (let x = 0; x < nw; x++) {
          const c = idx[y * nw + x];
          const rgb = c === CLEAR ? [0, 0, 0] : PAL[c], a = c === CLEAR ? 0 : 255;
          for (let j = 0; j < k; j++) for (let i = 0; i < k; i++) {
            const o = ((y * k + j) * nw * k + (x * k + i)) * 4;
            d[o] = rgb[0]; d[o + 1] = rgb[1]; d[o + 2] = rgb[2]; d[o + 3] = a;
          }
        }
        ctx.putImageData(img, 0, 0);
      },
    };
    return b;
  }

  /* 5×7 bitmap glyphs for the pixel logo — only the letters it needs. */
  const PIXFONT = {
    P: ['####.', '#...#', '#...#', '####.', '#....', '#....', '#....'],
    I: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '#####'],
    X: ['#...#', '#...#', '.#.#.', '..#..', '.#.#.', '#...#', '#...#'],
    E: ['#####', '#....', '#....', '####.', '#....', '#....', '#####'],
    L: ['#....', '#....', '#....', '#....', '#....', '#....', '#####'],
    F: ['#####', '#....', '#....', '####.', '#....', '#....', '#....'],
    O: ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
    R: ['####.', '#...#', '#...#', '####.', '#.#..', '#..#.', '#...#'],
    T: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '..#..'],
  };

  /* A stroke alphabet on a 4×6 grid (x 0–4, y 0 top – 6 bottom) for the two
     lettered logos, so no system font is ever rendered. */
  const SEG = {
    M: [[[0, 6], [0, 0], [2, 3], [4, 0], [4, 6]]],
    O: [[[1, 0], [3, 0], [4, 1], [4, 5], [3, 6], [1, 6], [0, 5], [0, 1], [1, 0]]],
    S: [[[4, 1], [3, 0], [1, 0], [0, 1], [0, 2], [1, 3], [3, 3], [4, 4], [4, 5], [3, 6], [1, 6], [0, 5]]],
    L: [[[0, 0], [0, 6], [4, 6]]],
    I: [[[2, 0], [2, 6]], [[1, 0], [3, 0]], [[1, 6], [3, 6]]],
    G: [[[4, 1], [3, 0], [1, 0], [0, 1], [0, 5], [1, 6], [3, 6], [4, 5], [4, 3], [2, 3]]],
    H: [[[0, 0], [0, 6]], [[4, 0], [4, 6]], [[0, 3], [4, 3]]],
    T: [[[0, 0], [4, 0]], [[2, 0], [2, 6]]],
    N: [[[0, 6], [0, 0], [4, 6], [4, 0]]],
    E: [[[4, 0], [0, 0], [0, 6], [4, 6]], [[0, 3], [3, 3]]],
    R: [[[0, 6], [0, 0], [3, 0], [4, 1], [4, 2], [3, 3], [0, 3]], [[2, 3], [4, 6]]],
    U: [[[0, 0], [0, 5], [1, 6], [3, 6], [4, 5], [4, 0]]],
  };

  /* ── pixelfort: the logo, 64×24 native ×4 ── */
  function pixelLogo() {
    const nw = 64, nh = 24, b = pixelBuffer(nw, nh, CLEAR);
    const word = (text, x0, y0, fill, shade, id) => {
      let x = x0;
      for (const ch of text) {
        const g = PIXFONT[ch];
        for (let j = 0; j < 7; j++) for (let i = 0; i < 5; i++) {
          if (g[j][i] !== '#') continue;
          const below = j < 6 && g[j + 1][i] === '#';       // bottom pixel of every column is the shade
          b.put(x + i, y0 + j, below ? fill : shade, id);
        }
        x += 6;
      }
    };
    const id = b.id();
    word('PIXEL', 18, 3, YELLOW, BROWN, id);       // 5 glyphs × 6 − 1 = 29 wide, centred in 64
    word('FORT', 21, 13, LGREY, GREY, id);         // 4 × 6 − 1 = 23 wide
    b.outline(true);                               // 8-neighbour: a closed 1-px ring, diagonals too
    /* a 1-px navy drop shadow to the lower right, on clear pixels only */
    const src = b.idx.slice();
    for (let y = nh - 1; y >= 1; y--) for (let x = nw - 1; x >= 1; x--) {
      if (src[y * nw + x] === CLEAR && src[(y - 1) * nw + (x - 1)] !== CLEAR) b.idx[y * nw + x] = NAVY;
    }
    b.blit(4);
  }

  /* ── pixelfort: a fort scene, 160×90 or 120×160 native ×4 ── */
  const KNIGHT = ['..hh..', '.hhhh.', '.hffh.', '..ff..', '.tttt.', 'tttttt', '.tttt.', '.l..l.', '.l..l.'];
  function pixelScene() {
    const nw = W / 4, nh = H / 4, time = job.time;
    const b = pixelBuffer(nw, nh, time === 'day' ? SKY : NAVY);
    const groundY = Math.round(nh * (job.portrait ? 0.8 : 0.78));
    /* sky bands — same id as the sky (0), so no line between them */
    if (time === 'day') b.rect(0, groundY - 30, nw, 30, LSKY, 0);
    if (time === 'dusk') { b.rect(0, Math.round(nh * 0.35), nw, nh, PURPLE, 0); b.rect(0, groundY - 22, nw, 22, SAND, 0); }
    if (time === 'night') {
      b.rect(0, groundY - 12, nw, 12, PURPLE, 0);
      for (let i = 0; i < Math.round(nw * nh / 400); i++) b.put(RI(0, nw - 1), RI(0, groundY - 30), WHITE, 0);
    }
    /* sun or moon */
    {
      const id = b.id(), sx = Math.round(R(0.6, 0.85) * nw), sy = Math.round(R(0.08, 0.22) * nh);
      const c = time === 'night' ? WHITE : YELLOW;
      b.rect(sx + 1, sy, 3, 5, c, id); b.rect(sx, sy + 1, 5, 3, c, id);
      if (job.portrait) { b.rect(sx - 1, sy + 1, 7, 3, c, id); b.rect(sx + 1, sy - 1, 3, 7, c, id); }
    }
    /* clouds (not at night) */
    if (time !== 'night') {
      const n = RI(2, 4);
      for (let i = 0; i < n; i++) {
        const id = b.id(), w = RI(10, 20), x = RI(0, nw - w), y = RI(4, groundY - 42);
        b.rect(x, y + 1, w, 3, WHITE, id); b.rect(x + 2, y, w - 4, 1, WHITE, id);
        b.rect(x + Math.floor(w * 0.3), y - 2, Math.floor(w * 0.35), 2, WHITE, id);
      }
    }
    /* two rolling hill layers */
    {
      const p1 = R(0, 6), p2 = R(0, 6), p3 = R(0, 6), p4 = R(0, 6);
      const idFar = b.id();
      for (let x = 0; x < nw; x++) {
        const top = groundY - 14 - Math.round(8 + 6 * Math.sin(x / 13 + p1) + 4 * Math.sin(x / 31 + p2));
        b.rect(x, top, 1, groundY - top, DGREEN, idFar);
      }
      const idNear = b.id();
      for (let x = 0; x < nw; x++) {
        const top = groundY - 6 - Math.round(3 + 3 * Math.sin(x / 9 + p3) + 3 * Math.sin(x / 23 + p4));
        b.rect(x, top, 1, groundY - top, GREEN, idNear);
      }
    }
    /* ground, tufts, the path to the gate */
    const cx = Math.round(nw / 2) + (job.portrait ? 0 : RI(-10, 10));
    {
      const id = b.id();
      b.rect(0, groundY, nw, nh - groundY, LGREEN, id);
      for (let i = 0; i < nw * 0.4; i++) b.put(RI(0, nw - 1), RI(groundY + 1, nh - 1), GREEN, id);
      const idPath = b.id();
      for (let y = groundY; y < nh; y++) { const hw = 3 + Math.round((y - groundY) * 0.5); b.rect(cx - hw, y, 2 * hw, 1, SAND, idPath); }
    }
    /* the fort */
    const halfW = job.portrait ? 30 : RI(28, 40), wallH = RI(14, 20);
    const idWall = b.id();
    b.rect(cx - halfW, groundY - wallH, 2 * halfW, wallH, GREY, idWall);
    for (let x = cx - halfW; x < cx + halfW; x += 4) b.rect(x, groundY - wallH - 3, 2, 3, GREY, idWall);
    for (let i = 0; i < halfW * wallH * 0.16; i++) b.put(RI(cx - halfW, cx + halfW - 1), RI(groundY - wallH, groundY - 1), LGREY, idWall);
    const tower = (tx, tw, th, big) => {
      const id = b.id(), top = groundY - th;
      b.rect(tx, top, tw, th, GREY, id);
      for (let i = 0; i < tw * th * 0.16; i++) b.put(RI(tx, tx + tw - 1), RI(top, groundY - 1), LGREY, id);
      const cap = big ? 'merlons' : pick(['roof', 'merlons']);
      if (cap === 'merlons') { for (let x = tx; x < tx + tw; x += 3) b.rect(x, top - 3, 2, 3, GREY, id); }
      else {
        const idRoof = b.id(), col = pick([RED, NAVY, PURPLE]);
        for (let k = 0; k < 4; k++) { const wd = tw + 2 - 2 * (3 - k); b.rect(tx + Math.floor((tw - wd) / 2), top - 4 + k, wd, 1, col, idRoof); }
      }
      if (rng() < 0.8) {
        const idFlag = b.id(), fx = tx + Math.floor(tw / 2), fy = top - (cap === 'roof' ? 4 : 3) - 6;
        b.rect(fx, fy, 1, 6, DBROWN, idFlag); b.rect(fx + 1, fy, 3, 2, pick([RED, YELLOW, WHITE]), idFlag);
      }
      b.rect(tx + Math.floor(tw / 2) - 1, top + 3, 2, 3, NAVY, b.id());
      if (th > 24) b.rect(tx + Math.floor(tw / 2) - 1, top + 10, 2, 3, NAVY, b.id());
    };
    const tw = RI(8, 11);
    tower(cx - halfW - tw + 2, tw, wallH + RI(8, 14), false);
    tower(cx + halfW - 2, tw, wallH + RI(8, 14), false);
    if (job.portrait || rng() < 0.6) { const kw = RI(12, 16); tower(cx - Math.floor(kw / 2), kw, wallH + RI(12, 20), true); }
    {
      const idGate = b.id();
      b.rect(cx - 4, groundY - 9, 8, 9, DBROWN, idGate);
      b.rect(cx - 3, groundY - 8, 6, 8, BROWN, idGate);
      b.put(cx - 4, groundY - 9, GREY, idWall); b.put(cx + 3, groundY - 9, GREY, idWall);   // the arch
      b.rect(cx - halfW + 4, groundY - wallH + 3, 2, 3, NAVY, b.id());
      b.rect(cx + halfW - 6, groundY - wallH + 3, 2, 3, NAVY, b.id());
    }
    /* trees */
    {
      const n = RI(1, 3);
      for (let i = 0; i < n; i++) {
        const id = b.id(), side = rng() < 0.5, x = side ? RI(3, Math.max(4, cx - halfW - tw - 8)) : RI(cx + halfW + tw + 2, nw - 8);
        b.rect(x, groundY - 5, 2, 5, DBROWN, id);
        b.rect(x - 3, groundY - 11, 8, 6, DGREEN, id); b.rect(x - 2, groundY - 14, 6, 3, DGREEN, id);
        for (let k = 0; k < 6; k++) b.put(RI(x - 2, x + 3), RI(groundY - 13, groundY - 7), GREEN, id);
      }
    }
    /* knights — on the ground, and one or two on the wall */
    const knight = (x, y, s) => b.sprite(x, y, KNIGHT, { h: GREY, f: SAND, t: pick([RED, NAVY, GREEN, PURPLE]), l: DBROWN }, b.id(), s);
    for (let i = 0, n = RI(2, 5); i < n; i++) knight(RI(2, nw - 8), groundY - 9 + RI(0, 4), 1);
    for (let i = 0, n = RI(1, 2); i < n; i++) knight(RI(cx - halfW + 2, cx + halfW - 8), groundY - wallH - 3 - 9, 1);
    if (job.portrait) knight(6, nh - 27 - 2, 3);                   // the hero, three times the size
    b.outline(false);
    b.blit(4);
  }

  /* ── stroke logos ── */
  function strokeWord(text, x0, y0, s, gap, each) {
    /* each(letterIndex, strokes, letterX) where strokes are arrays of [x,y] in px */
    let x = x0;
    for (let n = 0; n < text.length; n++) {
      const segs = SEG[text[n]].map((poly) => poly.map(([px, py]) => [x + px * s, y0 + py * s]));
      each(n, segs, x);
      x += 4 * s + gap;
    }
  }

  /* mosslight — thick wobbly strokes with round caps: every straight run of
     the skeleton becomes a quadratic curve whose control point is pushed a
     few px off the line, and each letter sits and leans a little. */
  function handLogo() {
    ctx.clearRect(0, 0, W, H);
    const s = 14, gap = 10, textW = 9 * 4 * s + 8 * gap;       // 'MOSSLIGHT': 584 of 640
    const x0 = Math.round((W - textW) / 2), y0 = Math.round((H - 6 * s) / 2) - 6;
    const wob = (p) => [p[0] + R(-3, 3), p[1] + R(-3, 3)];
    const stroke = (segs, width, col, alpha, dx, dy) => {
      ctx.save(); ctx.translate(dx, dy);
      ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.lineWidth = width; ctx.strokeStyle = col; ctx.globalAlpha = alpha;
      for (const poly of segs) {
        ctx.beginPath();
        let prev = wob(poly[0]); ctx.moveTo(prev[0], prev[1]);
        for (let i = 1; i < poly.length; i++) {
          const p = wob(poly[i]), mx = (prev[0] + p[0]) / 2 + R(-4, 4), my = (prev[1] + p[1]) / 2 + R(-4, 4);
          ctx.quadraticCurveTo(mx, my, p[0], p[1]);
          prev = p;
        }
        ctx.stroke();
      }
      ctx.restore();
    };
    strokeWord('MOSSLIGHT', x0, y0, s, gap, (n, segs, lx) => {
      ctx.save();
      ctx.translate(lx + 2 * s, y0 + 3 * s); ctx.rotate(R(-0.05, 0.05)); ctx.translate(-(lx + 2 * s), -(y0 + 3 * s) + R(-3, 3));
      stroke(segs, 15, '#3f4d2e', 1, 0, 0);               // one moss-green stroke (a second, lighter pass was 13 KB of edge — see SIZE)
      ctx.restore();
    });
    /* a leaf sprig under the word, in ochre */
    ctx.save(); ctx.lineCap = 'round'; ctx.lineWidth = 5; ctx.strokeStyle = '#a3915a'; ctx.globalAlpha = 0.9;
    const ly = y0 + 6 * s + 26, lx0 = x0 + 120, lx1 = x0 + textW - 120;
    ctx.beginPath(); ctx.moveTo(lx0, ly); ctx.quadraticCurveTo((lx0 + lx1) / 2, ly - 12, lx1, ly + 2); ctx.stroke();
    for (let i = 1; i < 8; i++) {
      const t = i / 8, px = lx0 + (lx1 - lx0) * t, py = ly - 6 * 4 * t * (1 - t), up = i % 2 ? -1 : 1;
      ctx.beginPath(); ctx.moveTo(px, py); ctx.quadraticCurveTo(px + 8, py + up * 10, px + 2, py + up * 18); ctx.stroke();
    }
    ctx.restore();
  }

  /* neonrun — the same skeleton in straight geometric strokes and a glow */
  function glowStroke(width, col, alpha, k) {
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.lineWidth = Math.max(1, width * k); ctx.strokeStyle = col; ctx.globalAlpha = alpha;   // never under a pixel: a 960-wide plate keeps its bright core
    ctx.stroke();
  }
  function glowPath(build, col, k, core) {
    /* three passes: wide and faint, medium, thin and bright — the numbers in the header */
    core = core || 1.2;
    ctx.beginPath(); build(); glowStroke(5, col, 0.10, k);
    ctx.beginPath(); build(); glowStroke(3, col, 0.30, k);
    ctx.beginPath(); build(); glowStroke(core, col, 1, k);
    ctx.globalAlpha = 1;
  }
  const MAGENTA = '#ff2fb0', CYAN = '#22e6ff';
  function neonLogo() {
    ctx.clearRect(0, 0, W, H);
    const s = 18, gap = 14, textW = 7 * 4 * s + 6 * gap;       // 'NEONRUN': 588 of 640
    const x0 = Math.round((W - textW) / 2), y0 = Math.round((H - 6 * s) / 2) - 8;
    strokeWord('NEONRUN', x0, y0, s, gap, (n, segs) => {
      glowPath(() => { for (const poly of segs) { ctx.moveTo(poly[0][0], poly[0][1]); for (let i = 1; i < poly.length; i++) ctx.lineTo(poly[i][0], poly[i][1]); } },
               n < 4 ? MAGENTA : CYAN, 1.6, 2);
    });
    const uy = y0 + 6 * s + 22;
    glowPath(() => { ctx.moveTo(x0, uy); ctx.lineTo(x0 + textW * 0.62, uy); }, CYAN, 1.2, 1.5);
    glowPath(() => { ctx.moveTo(x0 + textW * 0.68, uy); ctx.lineTo(x0 + textW, uy); }, MAGENTA, 1.2, 1.5);
  }

  function neonPlate() {
    const k = W / 1280;
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#07060c'; ctx.fillRect(0, 0, W, H);
    const hy = Math.round(H * R(0.5, 0.6)), vx = Math.round(W / 2 + R(-0.1, 0.1) * W);
    /* The glow the horizon throws, written pixel by pixel and constant along
       each row: a canvas gradient is dithered by Skia, which costs half a
       megabyte of PNG per plate and adds noise the statistics would read as
       texture. Magenta at the horizon into indigo into the near-black ground
       going up; teal into indigo into the ground going down. Indigo because
       at low lightness the sRGB gamut only holds real OKLCH chroma in the
       blue–violet hues — a dark magenta or a dark cyan is nearly grey. */
    {
      const SKY = [[7, 6, 12], [40, 12, 90], [128, 24, 88]];      // top → mid → horizon
      const FLOOR = [[14, 84, 100], [30, 12, 80], [7, 6, 12]];     // horizon → mid → bottom
      const at = (stops, t) => { const f = clamp(t, 0, 0.999999) * (stops.length - 1), i = Math.floor(f), u = f - i; return [0, 1, 2].map((c) => stops[i][c] + (stops[i + 1][c] - stops[i][c]) * u); };
      const img = ctx.createImageData(W, H), d = img.data;
      for (let y = 0; y < H; y++) {
        const c = y < hy ? at(SKY, Math.pow(y / hy, 1.6)) : at(FLOOR, Math.pow((y - hy) / (H - hy), 0.8));
        for (let x = 0; x < W; x++) { const o = (y * W + x) * 4; d[o] = Math.round(c[0]); d[o + 1] = Math.round(c[1]); d[o + 2] = Math.round(c[2]); d[o + 3] = 255; }
      }
      ctx.putImageData(img, 0, 0);
    }
    /* a striped sun on some plates: horizontal chords of a circle, stopping at the horizon */
    if (rng() < 0.6) {
      const sr = R(0.12, 0.2) * H, sx = vx + R(-0.15, 0.15) * W, sy = hy - R(0.02, 0.1) * H;
      for (let i = 0; i < 9; i++) {
        const yy = sy - sr + (2 * sr) * (i / 9);
        if (yy > hy) break;
        const hw = Math.sqrt(Math.max(0, sr * sr - (yy - sy) * (yy - sy)));
        glowPath(() => { ctx.moveTo(sx - hw, yy); ctx.lineTo(sx + hw, yy); }, MAGENTA, k, 1.2);
      }
    }
    /* stars */
    for (let i = 0, n = RI(30, 60); i < n; i++) {
      ctx.globalAlpha = R(0.3, 0.9); ctx.fillStyle = rng() < 0.5 ? CYAN : '#ffffff';
      ctx.fillRect(R(0, W), R(0, hy - 10 * k), 1.5 * k, 1.5 * k);
    }
    ctx.globalAlpha = 1;
    /* skyline: a few rectangle outlines standing on the horizon */
    for (let i = 0, n = RI(3, 7); i < n; i++) {
      const bw = R(0.02, 0.07) * W, bh = R(0.04, 0.16) * H, bx = R(0, W - bw);
      glowPath(() => { ctx.moveTo(bx, hy); ctx.lineTo(bx, hy - bh); ctx.lineTo(bx + bw, hy - bh); ctx.lineTo(bx + bw, hy); }, rng() < 0.5 ? MAGENTA : CYAN, k, 1);
    }
    /* the horizon line itself */
    glowPath(() => { ctx.moveTo(0, hy); ctx.lineTo(W, hy); }, MAGENTA, k * 1.3, 1.5);
    /* the floor grid: verticals converge on (vx, hy); horizontals crowd toward it */
    const gridCol = rng() < 0.5 ? CYAN : MAGENTA, roadCol = gridCol === CYAN ? MAGENTA : CYAN;
    const gap = W / 4;
    for (let i = -3; i <= 3; i++) {
      const bx = vx + i * gap;
      glowPath(() => { ctx.moveTo(vx, hy); ctx.lineTo(bx, H); }, gridCol, k, 1);
    }
    const rows = RI(7, 10);
    for (let i = 1; i <= rows; i++) { const t = i / rows, yy = hy + (H - hy) * t * t; glowPath(() => { ctx.moveTo(0, yy); ctx.lineTo(W, yy); }, gridCol, k, 1); }
    /* the road: two brighter lines from the bottom of a lane to the vanishing point */
    const lane = R(0.12, 0.2) * W;
    glowPath(() => { ctx.moveTo(vx, hy); ctx.lineTo(vx - lane, H); }, roadCol, k * 1.2, 1.6);
    glowPath(() => { ctx.moveTo(vx, hy); ctx.lineTo(vx + lane, H); }, roadCol, k * 1.2, 1.6);
    /* one or two shooting streaks */
    for (let i = 0, n = RI(1, 2); i < n; i++) {
      const sx = R(0.1, 0.9) * W, sy = R(0.05, 0.4) * hy, len = R(60, 200) * k;
      glowPath(() => { ctx.moveTo(sx, sy); ctx.lineTo(sx - len, sy + len * 0.25); }, CYAN, k, 1);
    }
    ctx.globalAlpha = 1;
  }

  /* ── mosslight: value noise plates ── */
  const smooth = (t) => t * t * (3 - 2 * t);
  function valueNoise(w, h, cell) {
    const gw = Math.ceil(w / cell) + 2, gh = Math.ceil(h / cell) + 2;
    const g = new Float32Array(gw * gh);
    for (let i = 0; i < g.length; i++) g[i] = rng();
    const out = new Float32Array(w * h);
    for (let y = 0; y < h; y++) {
      const fy = y / cell, iy = Math.floor(fy), ty = smooth(fy - iy);
      for (let x = 0; x < w; x++) {
        const fx = x / cell, ix = Math.floor(fx), tx = smooth(fx - ix);
        const o = iy * gw + ix;
        const top = g[o] + (g[o + 1] - g[o]) * tx, bot = g[o + gw] + (g[o + gw + 1] - g[o + gw]) * tx;
        out[y * w + x] = top + (bot - top) * ty;
      }
    }
    return out;
  }
  const MOSS = [[0x3d, 0x4a, 0x30], [0x55, 0x65, 0x42], [0x74, 0x84, 0x5a], [0x97, 0xa3, 0x77], [0xb9, 0xbf, 0x94]];
  const OCHRE = [[0x5a, 0x4f, 0x30], [0x7d, 0x6e, 0x44], [0xa0, 0x8f, 0x5c], [0xbf, 0xae, 0x78], [0xd6, 0xc9, 0x96]];
  function ramp(stops, t) {
    const f = clamp(t, 0, 0.999999) * (stops.length - 1), i = Math.floor(f), u = f - i, a = stops[i], b = stops[i + 1];
    return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u];
  }
  function mossPlate() {
    const k = W / 1280;
    const oct = [[420, 1], [210, 0.55], [105, 0.3], [52, 0.16], [26, 0.08], [13, 0.04]];
    const field = new Float32Array(W * H);
    let sum = 0;
    for (const [cell, amp] of oct) { const n = valueNoise(W, H, cell * k); for (let i = 0; i < field.length; i++) field[i] += n[i] * amp; sum += amp; }
    for (let i = 0; i < field.length; i++) field[i] /= sum;
    const hue = valueNoise(W, H, 640 * k), hue2 = valueNoise(W, H, 300 * k);
    /* soft clumps (darker) and a couple of lit patches (lighter) */
    const blobs = [];
    for (let i = 0, n = RI(5, 9); i < n; i++) blobs.push([R(0, W), R(0, H), R(60, 160) * k, R(-0.2, -0.07)]);
    for (let i = 0, n = RI(1, 3); i < n; i++) blobs.push([R(0, W), R(0, H), R(80, 200) * k, R(0.05, 0.12)]);
    const sx = R(0.55, 0.8) * W, sy = R(0.15, 0.35) * H, sr = R(0.25, 0.4) * W;
    const cx = W / 2, cy = H / 2, dmax = Math.sqrt(cx * cx + cy * cy);
    const img = ctx.createImageData(W, H), d = img.data;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const p = y * W + x;
      let t = 0.5 + (field[p] - 0.5) * 0.65;
      for (const [bx, by, bs, ba] of blobs) { const dx = x - bx, dy = y - by; t += ba * Math.exp(-(dx * dx + dy * dy) / (2 * bs * bs)); }
      t = clamp(t, 0, 1);
      const m = clamp(hue[p] * 0.7 + hue2[p] * 0.3, 0, 1);
      const a = ramp(MOSS, t), b = ramp(OCHRE, t);
      const dxs = x - sx, dys = y - sy, light = 1 + 0.22 * Math.exp(-(dxs * dxs + dys * dys) / (2 * sr * sr));
      const dxc = x - cx, dyc = y - cy, vig = 1 - 0.12 * ((dxc * dxc + dyc * dyc) / (dmax * dmax));
      const o = p * 4;
      for (let c = 0; c < 3; c++) d[o + c] = clamp(Math.round((a[c] + (b[c] - a[c]) * m) * light * vig), 0, 255);
      d[o + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
  }

  /* ── a few sanity numbers on what was drawn (not Phase 3, just a check) ── */
  function check() {
    const d = ctx.getImageData(0, 0, W, H).data;
    const lin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
    let n = 0, sL = 0, sL2 = 0, sC = 0, opaque = 0;
    const bins = new Map();
    const stride = Math.max(1, Math.floor(W * H / 20000));
    for (let p = 0; p < W * H; p++) {
      if (d[p * 4 + 3] < 16) continue;
      opaque++;
      const key = ((d[p * 4] >> 3) << 10) | ((d[p * 4 + 1] >> 3) << 5) | (d[p * 4 + 2] >> 3);
      bins.set(key, (bins.get(key) || 0) + 1);
      if (p % stride) continue;
      const r = lin(d[p * 4]), g = lin(d[p * 4 + 1]), b = lin(d[p * 4 + 2]);
      const l_ = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
      const m_ = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
      const s_ = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
      const L = 0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_;
      const A = 1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_;
      const B = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_;
      sL += L; sL2 += L * L; sC += Math.sqrt(A * A + B * B); n++;
    }
    let big = 0; for (const v of bins.values()) if (v >= opaque * 0.001) big++;
    const meanL = sL / n;
    const out = { meanL: +meanL.toFixed(3), stdL: +Math.sqrt(Math.max(0, sL2 / n - meanL * meanL)).toFixed(3), meanC: +(sC / n).toFixed(3), bins5bit: big };
    if (job.kind.startsWith('pixel')) {
      /* every 4×4 block uniform? — the grid the pixel statistic must find */
      let bad = 0;
      for (let y = 0; y < H; y += 4) for (let x = 0; x < W; x += 4) {
        const o = (y * W + x) * 4;
        let broken = false;
        for (let j = 0; j < 4 && !broken; j++) for (let i = 0; i < 4; i++) {
          const q = ((y + j) * W + x + i) * 4;
          if (d[q] !== d[o] || d[q + 1] !== d[o + 1] || d[q + 2] !== d[o + 2] || d[q + 3] !== d[o + 3]) { broken = true; break; }
        }
        if (broken) bad++;
      }
      out.blocks4Broken = bad;
    }
    return out;
  }

  ({ 'pixel-logo': pixelLogo, 'pixel-scene': pixelScene, 'hand-logo': handLogo, 'neon-logo': neonLogo, 'neon-plate': neonPlate, 'moss-plate': mossPlate })[job.kind]();
  /* the raw RGBA goes back to Node as base64 (in 32 KB slices — apply() has
     an argument limit); Node writes the PNG */
  const data = ctx.getImageData(0, 0, W, H).data;
  let s = '';
  for (let i = 0; i < data.length; i += 0x8000) s += String.fromCharCode.apply(null, data.subarray(i, i + 0x8000));
  return { rgba: btoa(s), check: check() };
}

/* mulberry32 in Node scope — the page has its own copy inside renderInPage,
   which is serialised whole and cannot share it. Same generator. */
function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

/* The canvas weave (the header's mosslight paragraph): one random offset per
   column, up to ±amp, added to R, G and B in place, BEFORE the posterise, so
   every column quantises at its own phase. It is constant down a column on
   purpose — that is what the PNG's Up filter cancels. */
function weave(px, w, h, seed, amp) {
  const rnd = mulberry32(seed), V = new Int8Array(w);
  for (let x = 0; x < w; x++) V[x] = Math.round((rnd() * 2 - 1) * amp);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4, d = V[x];
    for (let c = 0; c < 3; c++) px[i + c] = Math.max(0, Math.min(255, px[i + c] + d));
  }
}

/* Posterise RGB in place to `levels` per channel (alpha untouched): the
   size ladder's second rung, applied to the opaque plates only — a logo's
   soft alpha edge is where its whole look lives. */
function posterise(px, levels) {
  const step = 255 / (levels - 1);
  for (let i = 0; i < px.length; i++) if ((i & 3) !== 3) px[i] = Math.round(Math.round(px[i] / step) * step);
}

/* ─── A PNG WRITER ──────────────────────────────────────────────────────────
   Chrome's toDataURL('image/png') is built for speed: the same neon plate
   came out at 430 KB from Chrome and well under half that from zlib at level
   9 behind libpng's adaptive filter (per row, the filter whose output has
   the smallest sum of absolute values — the heuristic in the PNG spec's
   own note). Opaque plates are written as RGB (colour type 2), the logos as
   RGBA (6). Sixty lines beat a dependency, and the bytes now depend only on
   the pixels and Node's zlib, not on which Chrome drew them. */
function encodePNG(width, height, rgba, alpha) {
  const bpp = alpha ? 4 : 3, stride = width * bpp;
  const raw = Buffer.alloc((stride + 1) * height);
  const cur = Buffer.alloc(stride), prev = Buffer.alloc(stride), cand = [0, 1, 2, 3, 4].map(() => Buffer.alloc(stride));
  for (let y = 0; y < height; y++) {
    if (alpha) rgba.copy(cur, 0, y * width * 4, (y + 1) * width * 4);
    else for (let x = 0; x < width; x++) { const s = (y * width + x) * 4; cur[x * 3] = rgba[s]; cur[x * 3 + 1] = rgba[s + 1]; cur[x * 3 + 2] = rgba[s + 2]; }
    let best = 0, bestSum = Infinity;
    for (let f = 0; f < 5; f++) {
      const out = cand[f];
      let sum = 0;
      for (let i = 0; i < stride; i++) {
        const x = cur[i], a = i >= bpp ? cur[i - bpp] : 0, b = prev[i], c = i >= bpp ? prev[i - bpp] : 0;
        let p;
        if (f === 0) p = 0;
        else if (f === 1) p = a;
        else if (f === 2) p = b;
        else if (f === 3) p = (a + b) >> 1;
        else { const q = a + b - c, pa = Math.abs(q - a), pb = Math.abs(q - b), pc = Math.abs(q - c); p = pa <= pb && pa <= pc ? a : pb <= pc ? b : c; }
        const v = (x - p) & 255;
        out[i] = v;
        sum += v < 128 ? v : 256 - v;
      }
      if (sum < bestSum) { bestSum = sum; best = f; }
    }
    raw[y * (stride + 1)] = best;
    cand[best].copy(raw, y * (stride + 1) + 1);
    cur.copy(prev);
  }
  const chunk = (type, data) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type, 'latin1'), data]);
    const crc = Buffer.alloc(4); crc.writeUInt32BE(zlib.crc32(td) >>> 0);
    return Buffer.concat([len, td, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = alpha ? 6 : 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/* ─── THE NODE SIDE ─────────────────────────────────────────────────────── */
async function main() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage();
  await page.setContent('<!doctype html><title>make-fixtures</title>');
  const report = [];
  try {
    for (const fx of FIXTURES) {
      const dir = path.join(OUT, fx.name), art = path.join(dir, 'art');
      fs.mkdirSync(art, { recursive: true });
      const fit = FIT[fx.name] || { levels: 0, shot: null };
      const assets = [];
      let total = 0;
      for (const im of fx.images) {
        const w = im.shot ? fit.shot[0] : im.w, h = im.shot ? fit.shot[1] : im.h;
        const job = { kind: im.kind, w, h, seed: SEEDS[fx.name][im.id], alpha: !!im.alpha, time: im.time || null, portrait: !!im.portrait };
        const t0 = Date.now();
        const { rgba, check } = await page.evaluate(renderInPage, job);
        const px = Buffer.from(rgba, 'base64');
        if (fit.weave && !im.alpha) weave(px, w, h, SEEDS[fx.name][im.id] ^ WEAVE_SEED, fit.weave);
        if (fit.levels && !im.alpha) posterise(px, fit.levels);
        const bytes = encodePNG(w, h, px, !!im.alpha);
        const file = 'art/' + im.id + '.png';
        fs.writeFileSync(path.join(dir, file), bytes);
        const sha256 = crypto.createHash('sha256').update(bytes).digest('hex');
        assets.push({ id: im.id, role: im.role, file, w, h, alpha: !!im.alpha, sha256 });
        total += bytes.length;
        report.push({ fixture: fx.name, file, w, h, bytes: bytes.length, ms: Date.now() - t0, check, sha256: sha256.slice(0, 12) });
      }
      const manifest = Object.assign({}, fx.manifest, { assets, rights: { attested: true, by: 'fixture', at: ATTESTED_AT }, source: 'manual' });
      const manifestText = JSON.stringify(manifest, null, 2) + '\n';
      const expectedText = JSON.stringify(Object.assign({ fixture: fx.name }, fx.expected), null, 2) + '\n';
      fs.writeFileSync(path.join(dir, 'manifest.json'), manifestText);
      fs.writeFileSync(path.join(dir, 'expected.json'), expectedText);
      total += Buffer.byteLength(manifestText) + Buffer.byteLength(expectedText);
      report.push({ fixture: fx.name, file: '(folder total)', bytes: total, over: total > BUDGET });
    }
  } finally {
    await browser.close();
  }
  for (const r of report) {
    if (r.file === '(folder total)') { console.log(`  ${r.fixture.padEnd(10)} total ${String(r.bytes).padStart(8)} B  ${r.over ? 'OVER the 300 KB budget' : 'within budget'}`); continue; }
    console.log(`  ${r.fixture.padEnd(10)} ${r.file.padEnd(24)} ${String(r.w + 'x' + r.h).padEnd(10)} ${String(r.bytes).padStart(8)} B  ${String(r.ms).padStart(5)} ms  sha ${r.sha256}  ${JSON.stringify(r.check)}`);
  }
  const over = report.filter((r) => r.over);
  if (over.length) { console.error('over budget: ' + over.map((r) => r.fixture).join(', ')); process.exitCode = 2; }
}

module.exports = { FIXTURES, SEEDS, FIT, renderInPage, weave, posterise, encodePNG };
if (require.main === module) main().catch((e) => { console.error(e); process.exit(1); });
