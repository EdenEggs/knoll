/* ─── THE PALETTE ─────────────────────────────────────────────────────────
   One quantiser, two callers. The tracing table (tracer.js) has clustered a
   picture's opaque pixels into a handful of colours since lab 1 — k-means++
   seeding, then Lloyd's algorithm on a sample — and the Press Table
   (../PRESS-TABLE-PLAN.md §5) needs the very same reading of a picture to
   pick a page's paper, ink and accents from a game's key art. Two copies of
   one algorithm drift; so the clustering moved out of tracer.js and into
   this file, whole, and the table calls it here. What the table draws did
   not change by a byte: perf/golden-tracer.js traces the three fixture key
   arts on the live bench and on this one, with the same random numbers fed
   to both, and diffs the paths.

   WHAT IS HERE, and what each half is for:

     sample(imageData, cap)        the tracer's sampleOpaque, verbatim — every
                                   pixel with alpha ≥ ALPHA_T, walked row by
                                   row, every stride-th one kept so no more
                                   than cap are (stride = floor(count / cap),
                                   so the sample is a little OVER cap, as it
                                   always was — 3000 pixels is 3000 to 5999).
     kmeans(samples, K, opts)      the tracer's kMeansPalette, verbatim — one
                                   seed drawn at random, each next one drawn
                                   with probability proportional to its
                                   squared distance from the nearest seed so
                                   far (k-means++, Arthur & Vassilvitskii
                                   2007), then ITERS rounds of assign-and-
                                   average (Lloyd), and the centroids rounded
                                   to whole 8-bit channels. Returns [[r,g,b]…]
                                   in seeding order. The ONE change from the
                                   tracer: each Math.random() is opts.rng(),
                                   and opts.rng defaults to Math.random, read
                                   at call time — so the tracer, which passes
                                   nothing, draws exactly the numbers it drew
                                   before, and the press passes rng(seed) and
                                   gets the same palette every time it is
                                   asked (a page rebuilt from its game.json
                                   must come out the same page).
     quantize(imageData, k, opts)  sample → kmeans → label EVERY opaque pixel
                                   with its nearest centroid (the tracer's
                                   labelPixels, the same strict '<' so a tie
                                   goes to the earlier centroid) → the share
                                   of pixels each one won is its weight.
                                   Returns [{hex, weight, r, g, b}] sorted by
                                   weight, largest first (a stable sort, so
                                   two equal shares keep seeding order). A
                                   centroid no pixel is nearest to — two
                                   seeds that landed on the same colour, say
                                   — is not a colour of the picture and is
                                   dropped, as the tracer skips an empty
                                   mask; opts.minWeight drops any cluster
                                   under that share of the opaque pixels;
                                   the weights are then re-normalised so the
                                   kept ones sum to 1.
     rng(seed)                     mulberry32 — a 32-bit generator small
                                   enough to read in one breath and good
                                   enough for picking seeds (Tommy Ettinger's
                                   design, 2017; the JavaScript form is
                                   bryc's, github.com/bryc/code, jshash/
                                   PRNGs.md, read 2026-09-07). Returns a
                                   function giving numbers in [0, 1). A
                                   string seed is hashed first (FNV-1a,
                                   32-bit) so a slug can be a seed.
     toOklch / fromOklch           sRGB → OKLCH and back; toOklab / fromOklab
                                   are the same road stopping one town early
                                   (the theme wants to mix in OKLab and
                                   clamp in OKLCH). See THE MATRICES.
     contrast(a, b)                WCAG 2.x contrast ratio, ≥ 1.
     clampL(hex, min, max)         the same colour with its OKLCH lightness
                                   held to [min, max], chroma and hue kept —
                                   which is how the theme makes ink dark
                                   enough and paper light enough without
                                   changing what colour they are.
     mix(a, b, t)                  the straight line between two colours in
                                   OKLab, t of the way from a to b; unlike
                                   an sRGB mix the middle of red and cyan is
                                   a grey of the right lightness.
     hueDist(h1, h2)               the shorter way round the hue circle,
                                   0–180 degrees.
     describe(quantized)           quantize's list re-shaped as the plan's
                                   analysis.palette (§3.2): {hex, weight, L,
                                   C, h}, and nothing else.

   THE OPTIONS quantize and sample take:
     ignoreEdges  drop the outer EDGE_PCT of the picture on every side before
                  sampling AND before labelling — a screenshot often carries
                  letterboxing or a window frame, and a black bar that is 8 %
                  of the pixels would be the page's ink. Both halves skip the
                  border, or the bars would be dropped from the seeds only to
                  attach themselves to the darkest centroid at weighing time.
     minWeight    0–1, the share under which a cluster is dropped (default 0:
                  nothing is dropped but the empty).
     rng          the random source, () → [0, 1). Default Math.random.

   THE NUMBERS. SAMPLE_CAP 3000, ALPHA_T 16 and ITERS 8 are the tracer's own
   — lab 1's vectorize.js, lifted whole into tracer.js on 2026-09-04 and
   into here on 2026-09-07 — and are not to be tuned in passing: a different
   cap or a ninth round of Lloyd's would change every tracing on the bench,
   and the golden diff is what says they did not. EDGE_PCT 4 is the plan's
   (§5: "drop the outer 4 % border"), written as a whole-number percent and
   divided by 100 in integer arithmetic (floor(w × 4 / 100)) so a 100-px
   picture loses exactly 4 px a side rather than 3.999… of them; it can
   never eat a whole picture, since 4 % a side is 8 % of a side and a side
   is at least 1 px. GAMUT_EPS 1e-4 is how far outside [0, 1] a linear
   channel may sit and still count as in gamut: float noise from a round
   trip through the matrices is ~1e-12, and an 8-bit step is 1/255 ≈ 4e-3,
   so 1e-4 is forty times too small to move a rounded channel and a hundred
   million times too big to be noise. CLIP_STEPS 20 halvings of the chroma
   put the clipped colour within C / 2^20 of the gamut edge, C being the
   chroma asked for — 3e-7 for an ask of 0.32, the widest chroma sRGB has
   (magenta's, #ff00ff, measured over the cube's six faces on 2026-09-07;
   blue's is 0.31, red's 0.26) — far under an 8-bit step for any ask the
   theme makes. HUE_FLOOR
   1e-6 is the chroma under which a colour is grey and its hue is reported
   as 0: white comes back from the matrices as a ≈ 1e-9, b ≈ 1e-9, and the
   angle of that is noise that would make two whites unequal.

   THE MATRICES are Björn Ottosson's, from "A perceptual color space for
   image processing", https://bottosson.github.io/posts/oklab/ (published
   2020-12-23; the linear-sRGB ↔ LMS pairs below are the more exact ones the
   post carries in its 2021-01-25 revision), read 2026-09-07. The road is
   sRGB 8-bit → sRGB [0,1] → linear (the IEC 61966-2-1 curve: ÷12.92 under
   0.04045, else ((v + 0.055) / 1.055)^2.4) → LMS by M1 → cube root → OKLab
   by M2 → OKLCH (C = √(a² + b²), h = atan2(b, a) in degrees, 0–360), and
   the same road back with the inverse matrices, the cube, and the inverse
   curve. The post's check values are what the tests hold the code to:
   sRGB red is L 0.627955, a 0.224863, b 0.125846; white is L 1, a 0, b 0
   (to ~1e-8 — the M1 rows do not sum to exactly 1 in ten digits).

   GAMUT. A lightness and hue can be asked for at a chroma sRGB cannot show
   (OKLCH lets the theme say "this hue, but lighter", and the lighter one
   may fall outside the cube). fromOklch keeps L and h and reduces C toward
   0 — by bisection, CLIP_STEPS times — until every linear channel is inside
   [−GAMUT_EPS, 1 + GAMUT_EPS], then clamps and rounds. Reducing chroma
   rather than clamping channels is what keeps a clipped colour the SAME
   colour, only duller: a channel clamp would turn a too-bright orange into a
   yellow. A colour already in gamut is not touched, so fromOklch(toOklch(x))
   is x to the bit (the tests round-trip 500 of them).

   CONTRAST is WCAG 2.x's: (L1 + 0.05) / (L2 + 0.05), the lighter over the
   darker, with relative luminance 0.2126 R + 0.7152 G + 0.0722 B of the
   linearised channels — the very curve the matrices use, so there is one
   linearisation in this file. (WCAG 2.0 wrote the curve's knee as 0.03928
   and 2.2 corrected it to sRGB's 0.04045; no 8-bit value falls between the
   two, 10/255 being 0.0392 and 11/255 being 0.0431, so the ratio is the
   same number under either.)

   NOT A BENCH FILE. Nothing here touches document, Lab or a canvas; the
   Node tests (press/tools/test-palette.js) load this file against a bare
   object named window, and it must go on running there. An IIFE with one
   global, window.Palette, as every module on the bench is (plan §0.3). */

window.Palette = (function () {
  'use strict';

  const SAMPLE_CAP = 3000;   // pixels sampled for k-means (the tracer's); the full image is only ever nearest-assigned
  const ALPHA_T = 16;        // pixels this transparent or more are background, never counted (the tracer's)
  const ITERS = 8;           // rounds of Lloyd's algorithm (the tracer's)
  const EDGE_PCT = 4;        // ignoreEdges drops this percent of each side (plan §5)
  const GAMUT_EPS = 1e-4;    // a linear channel this far outside [0,1] is still in gamut (see the header)
  const CLIP_STEPS = 20;     // bisection steps when reducing chroma into gamut (≈ 4e-7 of chroma)
  const HUE_FLOOR = 1e-6;    // under this chroma the colour is grey and its hue is 0

  // ── random ───────────────────────────────────────────────────────────────
  function fnv1a(s) {                                // 32-bit FNV-1a, so a string can be a seed
    let h = 0x811c9dc5;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
    return h >>> 0;
  }
  function rng(seed) {                               // mulberry32
    let a = (typeof seed === 'string' ? fnv1a(seed) : (Number(seed) || 0)) >>> 0;
    return function () {
      a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  // ── the region a picture is read over ────────────────────────────────────
  // [x0, y0, x1, y1), half-open; the whole picture unless ignoreEdges
  function region(w, h, ignoreEdges) {
    if (!ignoreEdges) return [0, 0, w, h];
    const bx = Math.floor(w * EDGE_PCT / 100), by = Math.floor(h * EDGE_PCT / 100);
    return [bx, by, w - bx, h - by];
  }

  // ── sampling: the tracer's sampleOpaque ──────────────────────────────────
  function sample(imageData, cap, opts) {
    const data = imageData.data, w = imageData.width, h = imageData.height;
    cap = cap > 0 ? cap : SAMPLE_CAP;
    const [x0, y0, x1, y1] = region(w, h, opts && opts.ignoreEdges);
    const idx = [];
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
      const i = y * w + x;
      if (data[i * 4 + 3] >= ALPHA_T) idx.push(i);
    }
    const samples = [];
    const stride = Math.max(1, Math.floor(idx.length / cap));
    for (let j = 0; j < idx.length; j += stride) {
      const o = idx[j] * 4;
      samples.push([data[o], data[o + 1], data[o + 2]]);
    }
    return samples;
  }

  // ── clustering: the tracer's kMeansPalette, Math.random() → rand() ───────
  function kmeans(samples, K, opts) {
    const rand = (opts && opts.rng) || Math.random;
    const n = samples.length;
    K = Math.max(1, Math.min(K, n));
    const centroids = [samples[(rand() * n) | 0].slice()];
    const dist2 = new Array(n).fill(Infinity);
    while (centroids.length < K) {
      let total = 0;
      const c = centroids[centroids.length - 1];
      for (let i = 0; i < n; i++) {
        const s = samples[i];
        const dr = s[0] - c[0], dg = s[1] - c[1], db = s[2] - c[2];
        const d = dr * dr + dg * dg + db * db;
        if (d < dist2[i]) dist2[i] = d;
        total += dist2[i];
      }
      let r = rand() * total, pick = n - 1;
      for (let i = 0; i < n; i++) { r -= dist2[i]; if (r <= 0) { pick = i; break; } }
      centroids.push(samples[pick].slice());
    }
    for (let iter = 0; iter < ITERS; iter++) {
      const sums = centroids.map(() => [0, 0, 0, 0]);
      for (let i = 0; i < n; i++) {
        const s = samples[i];
        let best = 0, bestD = Infinity;
        for (let k = 0; k < centroids.length; k++) {
          const c = centroids[k];
          const dr = s[0] - c[0], dg = s[1] - c[1], db = s[2] - c[2];
          const d = dr * dr + dg * dg + db * db;
          if (d < bestD) { bestD = d; best = k; }
        }
        const sm = sums[best]; sm[0] += s[0]; sm[1] += s[1]; sm[2] += s[2]; sm[3]++;
      }
      for (let k = 0; k < centroids.length; k++) if (sums[k][3] > 0)
        centroids[k] = [sums[k][0] / sums[k][3], sums[k][1] / sums[k][3], sums[k][2] / sums[k][3]];
    }
    return centroids.map(c => c.map(v => Math.max(0, Math.min(255, Math.round(v)))));
  }

  // ── quantize: sample, cluster, weigh every opaque pixel ──────────────────
  function quantize(imageData, k, opts) {
    opts = opts || {};
    const data = imageData.data, w = imageData.width, h = imageData.height;
    const samples = sample(imageData, undefined, opts);
    if (!samples.length) return [];
    const centroids = kmeans(samples, k, opts);
    const [x0, y0, x1, y1] = region(w, h, opts.ignoreEdges);
    const counts = new Array(centroids.length).fill(0);
    let total = 0;
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
      const o = (y * w + x) * 4;
      if (data[o + 3] < ALPHA_T) continue;
      let best = 0, bestD = Infinity;
      for (let c = 0; c < centroids.length; c++) {
        const cc = centroids[c];
        const dr = data[o] - cc[0], dg = data[o + 1] - cc[1], db = data[o + 2] - cc[2];
        const d = dr * dr + dg * dg + db * db;
        if (d < bestD) { bestD = d; best = c; }
      }
      counts[best]++; total++;
    }
    const minWeight = opts.minWeight > 0 ? opts.minWeight : 0;
    const out = [];
    for (let c = 0; c < centroids.length; c++) {
      const weight = total ? counts[c] / total : 0;
      if (counts[c] === 0 || weight < minWeight) continue;
      out.push({ hex: rgbToHex(centroids[c]), weight, r: centroids[c][0], g: centroids[c][1], b: centroids[c][2] });
    }
    let kept = 0;
    for (const e of out) kept += e.weight;
    if (kept > 0) for (const e of out) e.weight = e.weight / kept;
    out.sort((a, b) => b.weight - a.weight);            // stable since ES2019: ties keep seeding order
    return out;
  }

  function describe(quantized) {
    return quantized.map(e => {
      const c = toOklch(e.hex);
      return { hex: e.hex, weight: e.weight, L: c.L, C: c.C, h: c.h };
    });
  }

  // ── hex ───────────────────────────────────────────────────────────────────
  function parse(hex) {                              // '#rrggbb' or '#rgb' → [r, g, b] 0–255
    const s = String(hex == null ? '' : hex).trim().replace(/^#/, '');
    if (/^[0-9a-f]{6}$/i.test(s)) { const v = parseInt(s, 16); return [v >> 16 & 255, v >> 8 & 255, v & 255]; }
    if (/^[0-9a-f]{3}$/i.test(s)) return s.split('').map(ch => parseInt(ch + ch, 16));
    throw new Error('Palette: not a hex colour: ' + hex);
  }
  const hex2 = v => (v < 16 ? '0' : '') + v.toString(16);
  const rgbToHex = c => '#' + hex2(c[0]) + hex2(c[1]) + hex2(c[2]);
  const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;

  // ── the sRGB curve, both ways ────────────────────────────────────────────
  const toLinear = v => v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  const fromLinear = v => v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055;

  // ── THE MATRICES (Ottosson; see the header) ──────────────────────────────
  function linToOklab(r, g, b) {
    const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
    const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
    const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
    return {
      L: 0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s,
      a: 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,
      b: 0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s
    };
  }
  function oklabToLin(L, a, b) {
    const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
    const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
    const s_ = L - 0.0894841775 * a - 1.2914855480 * b;
    const l = l_ * l_ * l_, m = m_ * m_ * m_, s = s_ * s_ * s_;
    return [
      +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
      -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
      -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s
    ];
  }
  const inGamut = rgb => rgb.every(v => v >= -GAMUT_EPS && v <= 1 + GAMUT_EPS);
  const linToHex = rgb => rgbToHex(rgb.map(v => Math.round(clamp01(fromLinear(clamp01(v))) * 255)));

  function toOklab(hex) {
    const c = parse(hex);
    return linToOklab(toLinear(c[0] / 255), toLinear(c[1] / 255), toLinear(c[2] / 255));
  }
  function toOklch(hex) {
    const o = toOklab(hex);
    const C = Math.sqrt(o.a * o.a + o.b * o.b);
    let h = C < HUE_FLOOR ? 0 : Math.atan2(o.b, o.a) * 180 / Math.PI;
    if (h < 0) h += 360;
    if (h >= 360) h -= 360;
    return { L: o.L, C, h };
  }
  // OKLab → hex, chroma reduced toward 0 until the colour is inside sRGB
  function fromOklab(L, a, b) {
    L = clamp01(Number(L) || 0); a = Number(a) || 0; b = Number(b) || 0;
    let rgb = oklabToLin(L, a, b);
    if (!inGamut(rgb)) {
      let lo = 0, hi = 1;                              // the fraction of (a, b) kept; 0 is grey, always in gamut
      for (let i = 0; i < CLIP_STEPS; i++) {
        const mid = (lo + hi) / 2;
        if (inGamut(oklabToLin(L, a * mid, b * mid))) lo = mid; else hi = mid;
      }
      rgb = oklabToLin(L, a * lo, b * lo);
    }
    return linToHex(rgb);
  }
  function fromOklch(L, C, h) {
    C = Math.max(0, Number(C) || 0);
    const rad = ((Number(h) || 0) % 360) * Math.PI / 180;
    return fromOklab(L, C * Math.cos(rad), C * Math.sin(rad));
  }

  // ── contrast, clamp, mix, hue ────────────────────────────────────────────
  function luminance(hex) {
    const c = parse(hex);
    return 0.2126 * toLinear(c[0] / 255) + 0.7152 * toLinear(c[1] / 255) + 0.0722 * toLinear(c[2] / 255);
  }
  function contrast(hexA, hexB) {
    const la = luminance(hexA), lb = luminance(hexB);
    return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
  }
  function clampL(hex, min, max) {
    const c = toOklch(hex);
    const L = Math.min(Math.max(c.L, Number(min) || 0), max == null ? 1 : Number(max));
    return fromOklch(L, c.C, c.h);
  }
  function mix(hexA, hexB, t) {
    t = clamp01(Number(t) || 0);
    const a = toOklab(hexA), b = toOklab(hexB);
    return fromOklab(a.L + (b.L - a.L) * t, a.a + (b.a - a.a) * t, a.b + (b.b - a.b) * t);
  }
  function hueDist(h1, h2) {
    const d = Math.abs((((Number(h1) || 0) - (Number(h2) || 0)) % 360 + 360) % 360);
    return d > 180 ? 360 - d : d;
  }

  return { quantize, kmeans, sample, rng, describe, toOklch, fromOklch, toOklab, fromOklab, contrast, clampL, mix, hueDist };
})();
