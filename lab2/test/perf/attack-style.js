/* ─── ATTACK-STYLE ────────────────────────────────────────────────────────
   perf/attack-style.js — the adversary for press/style.js. perf/test-style.js
   proves the three fixtures still read what Phase 3 wrote down; this file
   asks the opposite question — can the rules be made to lie on pictures no
   fixture covers — and it draws every one of those pictures itself, in the
   page, from Palette.rng so that a run is the same run tomorrow. It is a
   REPORT, not a golden: it writes nothing into press/fixtures, and its
   checks are the ones the verification brief named.

   THE PLATES, and what each one is for. Every plate is built as ImageData
   by plain arithmetic and handed over as a PNG data URL, so nothing here
   depends on how a browser resamples (the same reason style.js does its
   own 512 copy).

     px3 / px6      100 × 60 blocks of sixteen seeded colours, enlarged
                    nearest-neighbour ×3 (300 × 180) and ×6 (600 × 360).
                    A grid of s has an error of exactly 0 at s and at every
                    DIVISOR of s, so ×6 is the case that catches a reader
                    that takes the first or the smallest hit: 2 and 3 are
                    both clean and both must lose to 6. Two seeds each, so
                    the PIXEL_VOTES 2 vote is a real vote.
     px4noise       the same blocks ×4 with ±2/255 added to every channel
                    of every pixel — the JPEG-ish floor a real screenshot
                    carries. The grid's error stops being 0 and becomes the
                    noise's own (≈ 1.6/255 = 0.006, the mean |difference|
                    of two draws from a uniform ±2), which is what
                    PIXEL_FLOOR 0.02 is there to leave room for.
     photo          bilinear value noise (a 41 × 24 seeded grid stretched
                    to 640 × 360, per channel) with five smooth-falloff
                    blobs over it: a picture with structure at every scale
                    and no hard edge anywhere. Must read pixelSize 0 and no
                    outline.
     cartoon        512 × 512, five flat fills on cream, every shape ringed
                    with a 6-px black stroke (lineWidth 6 on integer
                    coordinates, so the axis-aligned edges land on pixel
                    boundaries and are not anti-aliased). Must read an
                    outline present at weight ≥ 0.6 and must rank
                    `outline-cartoon` or `cel` in its top two.
     hatch          512 × 512 cream with a 1-px black diagonal line
                    wherever (x + y) % 6 = 0 — ink everywhere, on a period
                    that a naive grid reader could mistake for a 6-px grid
                    (every 6 × 6 block's CENTRE pixel is on a line). Must
                    NOT read as pixel art.
     blockart       512 × 512 of 64-px flat regions from a palette of three
                    dark and five light colours, with NO strokes anywhere:
                    hard edges, a third of them against something dark, and
                    an edge density (≈ 0.09) squarely inside the outline
                    window. It is the plate that separates the plan's
                    dark-share rule from a looser one — about 61 % of its
                    strong edges have a dark SIDE while only ≈ 30 % of the
                    strong-edge PIXELS are themselves dark — so it must
                    read `outline.present` false.
     keyartOnly     the photo plates as the screenshots, a clean ×4 grid as
                    the key art AND as the logo: the plan's opening line
                    ("key art and logos are excluded from pixel-grid and
                    outline statistics") turned into a test that fails if
                    they leak.
     grain          mid-grey with ±4/255 grain, the case where
                    hfEnergy = |Δ| ÷ contrast has a small denominator. What
                    it finds is not a style.js defect (analysis.schema.json
                    asks only for a "number"), so it is a WARN and not a
                    FAIL: a check here fails only when press/style.js is
                    wrong, and the exit code is that and nothing else.

   THE DARK-SHARE PROBE. The plan (§7 step 2) and style.js's header both
   say a strong edge counts as dark when that PIXEL's luma is under
   DARK_LUMA. The two are not the same population as "the darkest pixel of
   the 3 × 3 window the Sobel kernel read", which is what an earlier cut of
   `inkNear` asked — the window minimum can only be smaller, so the second
   rule reads roughly twice the share and halves the strictness of
   DARK_SHARE 0.45. This probe computes BOTH shares on all twelve fixture
   screenshots, with copy512/luma/sobel re-implemented here (deliberately
   duplicated: a probe that shares the code it is probing proves nothing),
   and holds style.js to the plan's one.

   THE PALETTE-BIN COVERAGE. paletteCount counts 5-bit bins holding ≥ 0.1 %
   of the pixels, and the vector reads a count under 12 as "very limited".
   A picture whose colours are spread thin has no bin over the floor at all
   and counts 0 — the opposite claim from the same number — so the probe
   also reports what SHARE of the pixels the counted bins actually hold.

   THE RANKING SANITY. Every preset's own prototype vector is fed to
   Style.rank; the preset must come back first with a score of exactly 0
   (the `pixel` preset's prototype pixel is the word 'measured', so it is
   given the measured 4 a pixel game would carry).

       node lab2/test/perf/attack-style.js        (from site/, 4322 up)

   Headless is fine — nothing here is a perf number (NOTES §D.9). The door
   is routed to 404 and counted, as every sandbox harness does. Results in
   perf/results/attack-style/summary.json; exit 1 on any FAIL.
   ─────────────────────────────────────────────────────────────────────── */
'use strict';
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const TEST = path.resolve(__dirname, '..');
const FIXTURES = path.join(TEST, 'press', 'fixtures');
const RESULTS = path.join(__dirname, 'results', 'attack-style');
const URL = 'http://localhost:4322/lab2/test/press/tools/style-harness.html';

const checks = [], warnings = [];
let fails = 0;
const check = (name, ok, info) => { ok = !!ok; checks.push({ name, ok, info: info == null ? undefined : String(info) }); if (!ok) fails++; console.log((ok ? 'PASS ' : 'FAIL ') + name + (info != null ? ' — ' + info : '')); };
/* a finding about something that is not press/style.js: printed and kept, never counted as a failure here */
const warn = text => { warnings.push(String(text)); console.log('WARN ' + text); };
const f4 = v => typeof v === 'number' ? v.toFixed(4) : String(v);

(async () => {
  fs.mkdirSync(RESULTS, { recursive: true });
  const shotsOf = name => ['shot-1', 'shot-2', 'shot-3', 'shot-4'].map(id =>
    'data:image/png;base64,' + fs.readFileSync(path.join(FIXTURES, name, 'art', id + '.png')).toString('base64'));
  const plates = { pixelfort: shotsOf('pixelfort'), mosslight: shotsOf('mosslight'), neonrun: shotsOf('neonrun') };

  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const summary = { date: new Date().toISOString(), url: URL, checks };
  try {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    const errors = [], doors = [];
    page.on('pageerror', e => errors.push(String(e)));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    await page.route('**/_lab2/**', rt => { doors.push(rt.request().url()); rt.fulfill({ status: 404, body: 'no' }); });
    await page.goto(URL, { waitUntil: 'load' });
    await page.waitForFunction(() => window.runStyle && window.Style && window.Palette);

    const out = await page.evaluate(async (plates) => {
      const rngOf = s => Palette.rng(s);
      const canvasOf = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
      const urlOf = id => { const c = canvasOf(id.width, id.height); c.getContext('2d').putImageData(id, 0, 0); return c.toDataURL('image/png'); };
      const put = (id, o, r, g, b) => { id.data[o] = r; id.data[o + 1] = g; id.data[o + 2] = b; id.data[o + 3] = 255; };
      const clamp255 = v => v < 0 ? 0 : v > 255 ? 255 : v;

      /* nearest-neighbour blocks: bw × bh cells of sixteen seeded colours, each cell s × s */
      function blocks(seed, bw, bh, s, noise) {
        const rng = rngOf(seed), cols = [];
        for (let i = 0; i < 16; i++) cols.push([Math.floor(rng() * 256), Math.floor(rng() * 256), Math.floor(rng() * 256)]);
        const cell = [];
        for (let i = 0; i < bw * bh; i++) cell.push(cols[Math.floor(rng() * cols.length)]);
        const W = bw * s, H = bh * s, id = new ImageData(W, H);
        for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
          const c = cell[((y / s) | 0) * bw + ((x / s) | 0)], o = (y * W + x) * 4;
          if (noise) put(id, o, clamp255(c[0] + Math.floor(rng() * 5) - 2), clamp255(c[1] + Math.floor(rng() * 5) - 2), clamp255(c[2] + Math.floor(rng() * 5) - 2));
          else put(id, o, c[0], c[1], c[2]);
        }
        return urlOf(id);
      }

      /* bilinear value noise + five smooth blobs: structure everywhere, a hard edge nowhere */
      function photo(seed) {
        const rng = rngOf(seed), W = 640, H = 360, GW = 41, GH = 24;
        const g = [0, 1, 2].map(() => { const a = new Float64Array(GW * GH); for (let i = 0; i < a.length; i++) a[i] = 40 + rng() * 175; return a; });
        const blobs = [];
        for (let i = 0; i < 5; i++) blobs.push({ x: rng() * W, y: rng() * H, r: 60 + rng() * 80, k: rng() * 70 - 35 });
        const id = new ImageData(W, H);
        for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
          const fx = x * (GW - 1) / (W - 1), fy = y * (GH - 1) / (H - 1);
          const x0 = Math.floor(fx), y0 = Math.floor(fy), tx = fx - x0, ty = fy - y0;
          const x1 = Math.min(GW - 1, x0 + 1), y1 = Math.min(GH - 1, y0 + 1);
          let add = 0;
          for (const b of blobs) {
            const d = Math.hypot(x - b.x, y - b.y) / b.r;
            if (d < 1) { const t = 1 - d; add += b.k * t * t * (3 - 2 * t); }
          }
          const o = (y * W + x) * 4;
          for (let ch = 0; ch < 3; ch++) {
            const a = g[ch];
            const v = a[y0 * GW + x0] * (1 - tx) * (1 - ty) + a[y0 * GW + x1] * tx * (1 - ty) + a[y1 * GW + x0] * (1 - tx) * ty + a[y1 * GW + x1] * tx * ty;
            id.data[o + ch] = clamp255(Math.round(v + add));
          }
          id.data[o + 3] = 255;
        }
        return urlOf(id);
      }

      /* flat fills ringed with 6-px black strokes; integer coordinates keep the straight edges crisp */
      function cartoon(seed) {
        const rng = rngOf(seed), W = 512, H = 512, c = canvasOf(W, H), x = c.getContext('2d');
        x.fillStyle = '#f2ead8'; x.fillRect(0, 0, W, H);
        x.lineWidth = 6; x.lineJoin = 'round'; x.lineCap = 'round'; x.strokeStyle = '#000000';
        const fills = ['#e0563f', '#3f78e0', '#5fbf5a', '#e8c53f', '#8e5fd0'];
        const rects = [[40, 40, 180, 140], [260, 60, 200, 120], [60, 240, 160, 200], [280, 230, 180, 230]];
        rects.forEach((r, i) => { x.fillStyle = fills[(i + Math.floor(rng() * 5)) % fills.length]; x.fillRect(r[0], r[1], r[2], r[3]); x.strokeRect(r[0], r[1], r[2], r[3]); });
        [[150, 150, 50], [370, 380, 50]].forEach((k, i) => {
          x.beginPath(); x.arc(k[0], k[1], k[2], 0, Math.PI * 2);
          x.fillStyle = fills[(i + 2) % fills.length]; x.fill(); x.stroke();
        });
        return c.toDataURL('image/png');
      }

      /* 1-px diagonal ink on a 6-px period: every 6 × 6 block's centre pixel is on a line */
      function hatch() {
        const W = 512, H = 512, id = new ImageData(W, H);
        for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
          const o = (y * W + x) * 4, ink = (x + y) % 6 === 0;
          put(id, o, ink ? 12 : 242, ink ? 12 : 234, ink ? 14 : 216);
        }
        return urlOf(id);
      }

      /* flat regions at unaligned positions and odd sizes, three dark colours and five light, no strokes at all */
      function blockart(seed) {
        const rng = rngOf(seed), W = 512, H = 512, c = canvasOf(W, H), x = c.getContext('2d');
        const cols = ['#12142a', '#1e1816', '#0c2220', '#241a30', '#182814', '#d6c6a0', '#78a860', '#ce7850', '#96aad2', '#e8d860'];
        x.fillStyle = '#d6c6a0'; x.fillRect(0, 0, W, H);
        for (let i = 0; i < 26; i++) {
          x.fillStyle = cols[Math.floor(rng() * cols.length)];
          x.fillRect(Math.round(rng() * 470), Math.round(rng() * 470), 37 + Math.round(rng() * 94), 37 + Math.round(rng() * 94));
        }
        return c.toDataURL('image/png');
      }

      /* mid-grey with ±4/255 grain: a small hfEnergy denominator */
      function grain(seed) {
        const rng = rngOf(seed), W = 640, H = 360, id = new ImageData(W, H);
        for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
          const o = (y * W + x) * 4, n = Math.floor(rng() * 9) - 4;
          put(id, o, clamp255(128 + n), clamp255(128 + n), clamp255(128 + n));
        }
        return urlOf(id);
      }

      const strip = r => ({ stats: r.stats, vector: r.vector, rank: r.rank, dark: r.dark, game: r.game, pictures: r.pictures.map(p => ({ role: p.role, w: p.w, h: p.h, native: p.native, pixel: p.pixel, edges: p.edges, plate: p.plate && { medianLuma: p.plate.medianLuma, dark: p.plate.dark }, runs: p.runs && { dark: p.runs.dark.median, darkHalf: p.runs.darkHalf.median, bright: p.runs.bright.median, brightHalf: p.runs.brightHalf.median }, texture: p.texture, saturation: p.saturation, contrast: p.contrast, paletteCount: p.paletteCount })) });

      const px3 = [blocks('a3', 100, 60, 3, false), blocks('b3', 100, 60, 3, false)];
      const px6 = [blocks('a6', 100, 60, 6, false), blocks('b6', 100, 60, 6, false)];
      const px4n = [blocks('a4', 100, 60, 4, true), blocks('b4', 100, 60, 4, true)];
      const px4clean = blocks('a4c', 100, 60, 4, false);
      const photos = [photo('p1'), photo('p2')];
      const cartoons = [cartoon('c1'), cartoon('c2')];
      const hatches = [hatch(), hatch()];
      const grains = [grain('g1'), grain('g2')];
      const blockarts = [blockart('k1'), blockart('k2')];

      const res = {
        px3: strip(await runStyle({ screenshots: px3 })),
        px6: strip(await runStyle({ screenshots: px6 })),
        px4noise: strip(await runStyle({ screenshots: px4n })),
        photo: strip(await runStyle({ screenshots: photos })),
        cartoon: strip(await runStyle({ screenshots: cartoons })),
        hatch: strip(await runStyle({ screenshots: hatches })),
        keyartOnly: strip(await runStyle({ screenshots: photos, keyart: [px4clean], logos: [px4clean] })),
        grain: strip(await runStyle({ screenshots: grains })),
        blockart: strip(await runStyle({ screenshots: blockarts })),
      };

      /* what style.js itself reports for the three fixtures' screenshots, for the probe to be held against */
      const fixtureDarkShare = {};
      for (const k of Object.keys(plates)) fixtureDarkShare[k] = (await runStyle({ screenshots: plates[k] })).game.darkShare;

      /* ── the dark-share probe: the plan's rule and style.js's, side by side ── */
      function decode(url) {
        return new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => no(new Error('no decode')); i.src = url; })
          .then(i => i.decode ? i.decode().then(() => i, () => i) : i);
      }
      function dataOf(img) {
        const c = canvasOf(img.naturalWidth, img.naturalHeight), x = c.getContext('2d', { willReadFrequently: true });
        x.drawImage(img, 0, 0);
        const d = x.getImageData(0, 0, c.width, c.height);
        return { w: c.width, h: c.height, data: d.data };
      }
      function copy512(img) {                       // style.js's area average, re-written here on purpose
        const long = Math.max(img.w, img.h);
        if (long <= 512) return img;
        const w = img.w >= img.h ? 512 : Math.max(1, Math.round(img.w * 512 / long));
        const h = img.h > img.w ? 512 : Math.max(1, Math.round(img.h * 512 / long));
        const out = new Uint8ClampedArray(w * h * 4), d = img.data, W = img.w, H = img.h;
        for (let y = 0; y < h; y++) {
          const y0 = Math.floor(y * H / h), y1 = Math.max(y0 + 1, Math.floor((y + 1) * H / h));
          for (let x = 0; x < w; x++) {
            const x0 = Math.floor(x * W / w), x1 = Math.max(x0 + 1, Math.floor((x + 1) * W / w));
            let r = 0, g = 0, b = 0, a = 0, n = 0;
            for (let yy = y0; yy < y1; yy++) for (let xx = x0; xx < x1; xx++) { const i = (yy * W + xx) * 4, al = d[i + 3]; r += d[i] * al; g += d[i + 1] * al; b += d[i + 2] * al; a += al; n++; }
            const o = (y * w + x) * 4;
            if (a > 0) { out[o] = Math.round(r / a); out[o + 1] = Math.round(g / a); out[o + 2] = Math.round(b / a); }
            out[o + 3] = Math.round(a / n);
          }
        }
        return { w, h, data: out };
      }
      async function probeOf(url) {
        const img = copy512(dataOf(await decode(url))), w = img.w, h = img.h, d = img.data;
        const L = new Float32Array(w * h);
        for (let i = 0; i < w * h; i++) L[i] = (0.2126 * d[i * 4] + 0.7152 * d[i * 4 + 1] + 0.0722 * d[i * 4 + 2]) / 255;
        const M = new Float32Array(w * h);
        for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
          const i = y * w + x;
          const gx = (L[i - w + 1] + 2 * L[i + 1] + L[i + w + 1]) - (L[i - w - 1] + 2 * L[i - 1] + L[i + w - 1]);
          const gy = (L[i + w - 1] + 2 * L[i + w] + L[i + w + 1]) - (L[i - w - 1] + 2 * L[i - w] + L[i - w + 1]);
          M[i] = Math.sqrt(gx * gx + gy * gy);
        }
        const vals = new Float32Array((w - 2) * (h - 2));
        let k = 0;
        for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) vals[k++] = M[y * w + x];
        vals.sort();
        const t = vals[Math.min(vals.length - 1, Math.floor(0.92 * vals.length))];
        let strong = 0, ownDark = 0, winDark = 0;
        for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
          const i = y * w + x;
          if (!(M[i] > 0 && M[i] >= t)) continue;
          strong++;
          if (L[i] < 0.25) ownDark++;
          if (Math.min(L[i], L[i - 1], L[i + 1], L[i - w], L[i + w], L[i - w - 1], L[i - w + 1], L[i + w - 1], L[i + w + 1]) < 0.25) winDark++;
        }
        /* the 5-bit bins over the floor, and the share of the pixels they actually hold */
        const bins = new Uint32Array(1 << 15);
        let opaque = 0;
        for (let i = 0; i < w * h; i++) {
          if (d[i * 4 + 3] < 16) continue;
          opaque++;
          bins[((d[i * 4] >> 3) << 10) | ((d[i * 4 + 1] >> 3) << 5) | (d[i * 4 + 2] >> 3)]++;
        }
        let count = 0, held = 0;
        for (let b = 0; b < bins.length; b++) if (bins[b] > 0 && bins[b] >= opaque * 0.001) { count++; held += bins[b]; }
        return { strong, own: strong ? ownDark / strong : 0, window: strong ? winDark / strong : 0, paletteCount: count, coverage: opaque ? held / opaque : 0 };
      }
      const probe = {};
      for (const k of Object.keys(plates)) { probe[k] = []; for (const u of plates[k]) probe[k].push(await probeOf(u)); }
      probe.photo = [await probeOf(photos[0])];
      probe.grain = [await probeOf(grains[0])];
      probe.blockart = [await probeOf(blockarts[0])];
      probe.cartoon = [await probeOf(cartoons[0])];

      /* ── the ranking sanity: each prototype against its own preset ── */
      const proto = Object.keys(Style.PRESETS).map(id => {
        const p = Style.PRESETS[id];
        const v = Object.assign({}, p, { pixel: p.pixel === 'measured' ? 4 : p.pixel, saturation: 0.5 });
        const r = Style.rank(v);
        return { id, first: r[0].preset, score: r[0].score, second: r[1].preset + ' ' + r[1].score, rank: r };
      });

      return { res, probe, proto, fixtureDarkShare };
    }, plates);

    summary.plates = out.res;
    summary.probe = out.probe;
    summary.prototypes = out.proto;
    summary.fixtureDarkShare = out.fixtureDarkShare;

    const R = out.res, R2 = out.fixtureDarkShare;
    // 1 · the pixel grid
    check('px3 (×3 of 100 × 60 blocks, two seeds): pixelSize 3', R.px3.stats.pixelSize === 3,
      'per shot ' + R.px3.game.sizes.join('/') + '; errors s2..s8 ' + R.px3.pictures[0].pixel.errors.slice(0, 7).map(f4).join('/'));
    check('px6 (×6, both 2 and 3 are also clean): pixelSize 6, not 2 or 3', R.px6.stats.pixelSize === 6,
      'per shot ' + R.px6.game.sizes.join('/') + '; errors s2..s8 ' + R.px6.pictures[0].pixel.errors.slice(0, 7).map(f4).join('/'));
    check('px4noise (×4 with ±2/255 on every channel): pixelSize 4', R.px4noise.stats.pixelSize === 4,
      'per shot ' + R.px4noise.game.sizes.join('/') + '; errors s2..s8 ' + R.px4noise.pictures[0].pixel.errors.slice(0, 7).map(f4).join('/'));
    check('photo (value noise + soft blobs): pixelSize 0 and no outline', R.photo.stats.pixelSize === 0 && R.photo.stats.outline.present === false,
      'pixelSize ' + R.photo.stats.pixelSize + ', dark share ' + R.photo.game.darkShare + ', density ' + R.photo.game.density + ', errors s2..s8 ' + R.photo.pictures[0].pixel.errors.slice(0, 7).map(f4).join('/'));
    check('hatch (1-px diagonals on a 6-px period): pixelSize 0', R.hatch.stats.pixelSize === 0,
      'per shot ' + R.hatch.game.sizes.join('/') + '; errors s2..s8 ' + R.hatch.pictures[0].pixel.errors.slice(0, 7).map(f4).join('/') + '; rank ' + R.hatch.rank.map(e => e.preset + ' ' + e.score).join(', '));

    // 2 · the outline
    check('cartoon (6-px black strokes on flat fills): outline present, weight ≥ 0.6', R.cartoon.stats.outline.present === true && R.cartoon.stats.outline.weight >= 0.6,
      'weight ' + R.cartoon.stats.outline.weight + ' (median ' + R.cartoon.game.ink + ' run ' + R.cartoon.game.run + ' px), dark share ' + R.cartoon.game.darkShare + ', density ' + R.cartoon.game.density);
    check('cartoon: outline-cartoon or cel in the top two', R.cartoon.rank.slice(0, 2).some(e => e.preset === 'outline-cartoon' || e.preset === 'cel'),
      R.cartoon.rank.map(e => e.preset + ' ' + e.score).join(', ') + '; vector ' + JSON.stringify(R.cartoon.vector));
    check('cartoon: its dark share clears DARK_SHARE 0.45 on the plan\'s per-pixel rule, not only on the window minimum',
      out.probe.cartoon[0].own >= 0.45,
      'the pixel\'s own luma ' + f4(out.probe.cartoon[0].own) + ', the 3 × 3 minimum ' + f4(out.probe.cartoon[0].window));

    // 3 · key art and logos out of the grid and the outline
    check('keyartOnly: a clean ×4 grid as key art AND logo leaves pixelSize 0 and outline false',
      R.keyartOnly.stats.pixelSize === 0 && R.keyartOnly.stats.outline.present === false,
      'pixelSize ' + R.keyartOnly.stats.pixelSize + ', outline ' + JSON.stringify(R.keyartOnly.stats.outline) + ', per shot ' + R.keyartOnly.game.sizes.join('/'));
    check('keyartOnly: they DO move paletteCount and saturation (the plan includes them there)',
      R.keyartOnly.stats.paletteCount !== R.photo.stats.paletteCount || R.keyartOnly.stats.saturation !== R.photo.stats.saturation,
      'photo alone ' + R.photo.stats.paletteCount + ' bins / C ' + f4(R.photo.stats.saturation) + ' → with the grid ' + R.keyartOnly.stats.paletteCount + ' / ' + f4(R.keyartOnly.stats.saturation));

    // 4 · the ranking
    const bad = out.proto.filter(p => p.first !== p.id || p.score !== 0);
    check('every preset\'s own prototype ranks that preset first, score 0', bad.length === 0,
      bad.length ? bad.map(p => p.id + ' → ' + p.first + ' ' + p.score).join('; ') : out.proto.map(p => p.id + ' 0 (next ' + p.second + ')').join(', '));

    // 5 · hfEnergy's range: what style.js promises, and what someone else asserts about it
    check('grain (±4/255 on mid-grey): hfEnergy is a non-negative number, which is all analysis.schema.json asks',
      typeof R.grain.stats.hfEnergy === 'number' && R.grain.stats.hfEnergy >= 0,
      'hfEnergy ' + R.grain.stats.hfEnergy + ', contrast ' + R.grain.stats.contrast + ', per shot |Δ| ' + R.grain.pictures.map(p => p.texture.lap).join('/'));
    // The WARN is kept — hfEnergy having no ceiling is worth saying out loud on
    // every run — but the second half of its sentence changed on 2026-09-07: the
    // 0–1 assertion it used to name was corrected in the Phase 9 suite pass, so
    // this no longer reports an outstanding defect. It reports the measurement
    // the fix rests on.
    if (R.grain.stats.hfEnergy > 1) warn('hfEnergy is NOT bounded by 1: ' +
      'the grain plate measures ' + R.grain.stats.hfEnergy + ' (|Δ| ' + R.grain.pictures[0].texture.lap + ' survives on the native picture, contrast ' +
      R.grain.stats.contrast + ' is averaged out of the 512 copy the denominator is read on). Not a style.js defect — the schema says "number" — and the ' +
      'vector is unaffected (5.4 and 0.16 are both "high"). The assertShape in perf/test-style.js asserted 0–1 for EVERY stat until 2026-09-07, which would ' +
      'have failed a heavily grained low-contrast game for a rule nobody wrote; it now asks hfEnergy for a finite number ≥ 0 and keeps 0–1 for ' +
      'saturation, contrast and edgeDensity.');

    const avg = a => a.reduce((x, y) => x + y, 0) / a.length;
    for (const n of ['pixelfort', 'mosslight', 'neonrun']) {
      const own = out.probe[n].map(p => p.own), win = out.probe[n].map(p => p.window), got = R2[n];
      check(n + ': style.js\'s measured dark share is the plan\'s per-pixel one (§7 step 2), not the 3 × 3 window minimum',
        Math.abs(got - avg(own)) <= 0.002,
        'style.js says ' + got + '; the pixel\'s own luma gives ' + own.map(f4).join('/') + ' (mean ' + f4(avg(own)) + '), the 3 × 3 minimum ' + win.map(f4).join('/') + ' (mean ' + f4(avg(win)) + '); DARK_SHARE is 0.45');
    }
    check('blockart (flat regions, dark colours, NO strokes): outline.present false',
      R.blockart.stats.outline.present === false,
      'dark share ' + R.blockart.game.darkShare + ' (the pixel\'s own luma ' + f4(out.probe.blockart[0].own) + ', the 3 × 3 minimum ' + f4(out.probe.blockart[0].window) + '), density ' + R.blockart.game.density + ' — inside the 0.02–0.18 window, so the dark share is the only gate');

    check('paletteCount: the bins it counts hold most of the picture (a smooth plate counts 0 and is then read as "very limited")',
      out.probe.photo[0].coverage > 0.5 || R.photo.vector.paletteSize === 0,
      'photo — ' + out.probe.photo[0].paletteCount + ' bins over the 0.1 % floor holding ' + f4(out.probe.photo[0].coverage) + ' of the pixels → paletteSize ' + R.photo.vector.paletteSize + ', shading ' + R.photo.vector.shading +
      '; fixtures hold ' + ['pixelfort', 'mosslight', 'neonrun'].map(n => n + ' ' + out.probe[n][0].paletteCount + ' bins/' + f4(out.probe[n][0].coverage)).join(', '));

    check('no page or console errors', errors.length === 0, errors.join(' | '));
    check('nothing asked for /_lab2/', doors.length === 0, doors.join(' '));
    await ctx.close();
  } catch (e) {
    check('the run completed', false, e.stack || e.message);
  }
  await browser.close();

  if (summary.plates) {
    console.log('\n  plate        pixelSize  outline            paletteCount  sat     hf       rank[0]');
    for (const k of Object.keys(summary.plates)) {
      const s = summary.plates[k].stats;
      console.log('  ' + k.padEnd(12) + String(s.pixelSize).padStart(6) + '     ' +
        (s.outline.present ? 'yes w ' + s.outline.weight : 'no        ').padEnd(16) + String(s.paletteCount).padStart(8) + '      ' +
        f4(s.saturation) + '  ' + f4(s.hfEnergy) + '   ' + summary.plates[k].rank.map(e => e.preset + ' ' + e.score).join(' · '));
    }
  }
  summary.fails = fails; summary.total = checks.length; summary.warnings = warnings;
  fs.writeFileSync(path.join(RESULTS, 'summary.json'), JSON.stringify(summary, null, 2));
  console.log('\n' + (checks.length - fails) + '/' + checks.length + ' PASS' + (warnings.length ? ', ' + warnings.length + ' WARN (not style.js — see the lines above)' : '') + ' — ' + path.join(RESULTS, 'summary.json'));
  process.exit(fails ? 1 : 0);
})();
