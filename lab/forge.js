/* ─── CHARACTER FORGE MK.I ─────────────────────────────────────────────────
   Drop a png/jpg in the hopper. The creature IS the picture, pixelated:
     1. analyse   — 48×48 read for a pixel hash (the seed), dominant colours,
                    brightness, warmth and edge density ("chaos")
     2. cut out   — the image is boxed down to a small grid, the background is
                    lifted (transparent PNG → alpha; flat or gradient backdrop →
                    flood fill from the border; no clean backdrop → blob cut),
                    then the grid zooms onto the subject
     3. quantise  — the subject's colours are reduced to a small palette
     4. creature  — outline, eyes, mouth and stubby limbs are planted on the
                    real silhouette (seeded: FORGE again re-rolls just these)
   DETAIL sets the grid width — 24 / 40 / 64 / 100 cells — and with it how many
   colours the palette is allowed and how hard they are pushed. LO is a few big
   cells that have to carry the whole character, so its colours are punched up
   to do it; EX is a hundred cells across with a 32-colour palette and almost
   no push at all, which comes out very close to the photograph you fed in.
   The screen canvas is 340×440 so even EX gets three real pixels a cell.
   Everything is client-side. */

window.Forge = (function () {
  const CW = 340, CH = 440;                 // screen canvas (2× the face of it,
                                            // so a 100-cell grid still gets 3px a cell)
  const INK = [34, 28, 38];                 // #221c26
  const SP = { WHITE: 250, PUPIL: 251, OUTLINE: 252, MOUTH: 253 };   // special cells; 1..K are palette indices
  const MX = 2, MT = 3, MB = 3;             // grid margins around the cutout (arms / antennae / legs)
  const DETAILS = [24, 40, 64, 100];
  // how many colours each step is quantised to, and how hard those colours are
  // then pushed. The two go together: a coarse grid has few cells to say
  // anything with, so it says it louder; a fine one has the picture itself and
  // wants leaving alone. PUNCH 1 is the old saturation-and-contrast lift,
  // 0 is the palette exactly as the image gave it.
  const KOF = { 24: 8, 40: 12, 64: 18, 100: 32 };
  const PUNCH = { 24: 1, 40: 0.7, 64: 0.4, 100: 0.12 };

  // ── dom ──────────────────────────────────────────────────────────────────
  const $ = id => document.getElementById(id);
  const hopper = $('hopper'), fileIn = $('forge-file'), specimen = $('specimen');
  const hopEmpty = hopper.querySelector('.hopper-empty'), hopFull = hopper.querySelector('.hopper-full');
  const goBtn = $('forge-go'), sampleBtn = $('forge-sample'), ejectBtn = $('forge-eject'), saveBtn = $('forge-save');
  const canvas = $('forge-canvas'), ctx = canvas.getContext('2d');
  const screen = $('screen'), screenIdle = $('screen-idle');
  const plate = $('nameplate'), nameEl = $('char-name'), traitsEl = $('char-traits');
  const countEl = $('forge-count');
  const readout = r => document.querySelector('[data-r="' + r + '"]');
  const led = n => document.querySelector('[data-led="' + n + '"]');
  const gaugeEl = n => document.querySelector('[data-gauge="' + n + '"]');
  const gauge = n => document.querySelector('[data-gauge="' + n + '"] .gauge-needle');

  let analysis = null, nonce = -1, batch = 0, busy = false, last = null, animToken = 0;
  let detail = 40, spawnNext = false, customName = null;   // MID
  // a setting kept from before the steps moved is snapped to the nearest one
  // that exists now, rather than being dropped for the default
  try {
    const d = +localStorage.getItem('knoll-lab:forge:detail');
    if (isFinite(d) && d > 0) detail = DETAILS.reduce((a, b) => Math.abs(b - d) < Math.abs(a - d) ? b : a);
  } catch (e) {}

  // the SIZE knob: how big a creature comes off the bench — ×0.5 to ×2
  let size = 1;
  try { const s = parseFloat(localStorage.getItem('knoll-lab:forge:size')); if (isFinite(s)) size = Math.max(0.5, Math.min(2, s)); } catch (e) {}

  // the three gauges double as dials: null = whatever the picture says, a
  // number = the operator overruling it. Deltas from the image reading, so
  // leaving them alone changes nothing.
  const adj = { hue: null, chaos: null, lumen: null };

  // ── small maths ──────────────────────────────────────────────────────────
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)];

  function rgb2hsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
    let h = 0, s = 0;
    if (mx !== mn) {
      const d = mx - mn;
      s = l > .5 ? d / (2 - mx - mn) : d / (mx + mn);
      if (mx === r) h = (g - b) / d + (g < b ? 6 : 0);
      else if (mx === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h *= 60;
    }
    return [h, s, l];
  }
  function hsl2rgb(h, s, l) {
    h = ((h % 360) + 360) % 360;
    const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs((h / 60) % 2 - 1)), m = l - c / 2;
    let r, g, b;
    if (h < 60) [r, g, b] = [c, x, 0]; else if (h < 120) [r, g, b] = [x, c, 0];
    else if (h < 180) [r, g, b] = [0, c, x]; else if (h < 240) [r, g, b] = [0, x, c];
    else if (h < 300) [r, g, b] = [x, 0, c]; else [r, g, b] = [c, 0, x];
    return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
  }
  const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  const css = c => 'rgb(' + Math.round(c[0]) + ',' + Math.round(c[1]) + ',' + Math.round(c[2]) + ')';
  const darken = (c, t) => mix(c, INK, t);
  const lighten = (c, t) => mix(c, [255, 255, 255], t);
  const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

  // the warp bench — everything here bends the finished creature.
  // bipolar dials run -1..1, the rest 0..1; all zero means "don't touch it".
  const WARPS = ['stretch', 'lean', 'wave', 'melt', 'twist', 'bulge', 'glitch', 'blur'];
  const BIPOLAR = { stretch: 1, lean: 1, twist: 1, bulge: 1 };
  const warp = {};
  for (const k of WARPS) warp[k] = 0;
  try {
    const w = JSON.parse(localStorage.getItem('knoll-lab:forge:warp'));
    if (w) for (const k of WARPS) if (isFinite(w[k])) warp[k] = clamp(w[k], BIPOLAR[k] ? -1 : 0, 1);
  } catch (e) {}
  const bending = () => WARPS.some(k => k !== 'blur' && warp[k]);

  const fitDims = (w, h, maxW, maxH) => {
    const s = Math.min(maxW / w, maxH / h);
    return [Math.max(2, Math.round(w * s)), Math.max(2, Math.round(h * s))];
  };

  // ── 1. analysis: image → seed, palette, stats ───────────────────────────
  function analyze(img) {
    // a working copy no bigger than 512px; everything else samples from this
    const [sw, sh] = fitDims(img.naturalWidth, img.naturalHeight, 512, 512);
    const src = document.createElement('canvas'); src.width = sw; src.height = sh;
    src.getContext('2d').drawImage(img, 0, 0, sw, sh);

    const S = 48;
    const c = document.createElement('canvas'); c.width = S; c.height = S;
    const g = c.getContext('2d', { willReadFrequently: true });
    g.drawImage(src, 0, 0, S, S);
    const d = g.getImageData(0, 0, S, S).data;

    let h = 0x811c9dc5 >>> 0;               // FNV-1a over 5-bit quantised pixels
    const lum = new Float32Array(S * S);
    const buckets = new Map();
    let sumL = 0, sumS = 0, warm = 0;

    for (let i = 0, p = 0; i < d.length; i += 4, p++) {
      const r = d[i], gg = d[i + 1], b = d[i + 2];
      const q = ((r >> 3) << 10) | ((gg >> 3) << 5) | (b >> 3);
      h ^= q & 255; h = Math.imul(h, 16777619) >>> 0;
      h ^= q >> 8;  h = Math.imul(h, 16777619) >>> 0;

      const L = (0.2126 * r + 0.7152 * gg + 0.0722 * b) / 255;
      lum[p] = L; sumL += L;
      const mx = Math.max(r, gg, b), mn = Math.min(r, gg, b);
      const s = mx ? (mx - mn) / mx : 0;
      sumS += s;
      if (s > 0.12) {
        const hue = rgb2hsl(r, gg, b)[0];
        if (hue < 70 || hue > 320) warm += s;
      }
      let bk = buckets.get(q);
      if (!bk) { bk = { n: 0, r: 0, g: 0, b: 0 }; buckets.set(q, bk); }
      bk.n++; bk.r += r; bk.g += gg; bk.b += b;
    }

    let e = 0, cnt = 0;                     // edge density: how often neighbours disagree
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const p = y * S + x;
      if (x < S - 1) { cnt++; if (Math.abs(lum[p] - lum[p + 1]) > 0.1) e++; }
      if (y < S - 1) { cnt++; if (Math.abs(lum[p] - lum[p + S]) > 0.1) e++; }
    }

    const sorted = [...buckets.values()].sort((a, b) => b.n - a.n);   // dominant, well-separated colours
    const picks = [];
    for (const bk of sorted) {
      const rgb = [bk.r / bk.n, bk.g / bk.n, bk.b / bk.n];
      if (picks.every(p => dist(p.rgb, rgb) > 52)) picks.push({ rgb, n: bk.n, hsl: rgb2hsl(...rgb) });
      if (picks.length >= 6) break;
    }

    const N = S * S;
    return {
      seed: h >>> 0,
      brightness: sumL / N,
      saturation: sumS / N,
      warmth: sumS > 0 ? clamp(warm / sumS, 0, 1) : 0.5,
      edge: e / cnt,
      aspect: img.naturalWidth / Math.max(1, img.naturalHeight),
      w: img.naturalWidth, h: img.naturalHeight,
      picks, src, cuts: {}
    };
  }

  function dominantHue(an) {
    const score = p => p.n * (0.25 + p.hsl[1]) * (1 - Math.abs(p.hsl[2] - 0.5) * 0.9);
    const prim = [...an.picks].sort((a, b) => score(b) - score(a))[0];
    if (!prim || prim.hsl[1] < 0.08) return an.seed % 360;
    return Math.round(prim.hsl[0]);
  }

  // ── 2. cut-out: box-filter a source rect into a grid, lift the background ─
  function sampleRect(src, sx, sy, sw, sh, gw, gh, est) {
    const F = 4, bgf = est && est.mode === 'flood' ? est : null;
    const c = document.createElement('canvas'); c.width = gw * F; c.height = gh * F;
    const g = c.getContext('2d', { willReadFrequently: true });
    g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
    g.drawImage(src, sx, sy, sw, sh, 0, 0, gw * F, gh * F);
    const d = g.getImageData(0, 0, gw * F, gh * F).data;
    const rgb = new Float32Array(gw * gh * 3), alpha = new Float32Array(gw * gh);
    for (let cy = 0; cy < gh; cy++) for (let cx = 0; cx < gw; cx++) {
      let r = 0, gg = 0, b = 0, a = 0, fr = 0, fg = 0, fb = 0, fa = 0;
      for (let y = 0; y < F; y++) for (let x = 0; x < F; x++) {
        const i = ((cy * F + y) * gw * F + (cx * F + x)) * 4, al = d[i + 3];
        r += d[i] * al; gg += d[i + 1] * al; b += d[i + 2] * al; a += al;
        // sub-pixels that are backdrop don't get a say in an edge cell's colour (no pale fringe)
        if (bgf && al > 0 && dist([d[i], d[i + 1], d[i + 2]], bgf.bg) >= bgf.thr) { fr += d[i] * al; fg += d[i + 1] * al; fb += d[i + 2] * al; fa += al; }
      }
      const k = cy * gw + cx;
      if (fa > 0) { rgb[k * 3] = fr / fa; rgb[k * 3 + 1] = fg / fa; rgb[k * 3 + 2] = fb / fa; }
      else if (a > 0) { rgb[k * 3] = r / a; rgb[k * 3 + 1] = gg / a; rgb[k * 3 + 2] = b / a; }
      alpha[k] = a / (F * F * 255);
    }
    return { rgb, alpha, gw, gh };
  }
  const colAt = (s, k) => [s.rgb[k * 3], s.rgb[k * 3 + 1], s.rgb[k * 3 + 2]];

  function ringCells(gw, gh) {
    const out = [];
    for (let x = 0; x < gw; x++) { out.push(x); out.push((gh - 1) * gw + x); }
    for (let y = 1; y < gh - 1; y++) { out.push(y * gw); out.push(y * gw + gw - 1); }
    return out;
  }

  // what colour is the backdrop, judging by the border of the picture?
  function estimateBg(s) {
    const ring = ringCells(s.gw, s.gh);
    let aSum = 0; const opaque = [];
    for (const k of ring) { aSum += s.alpha[k]; if (s.alpha[k] >= 0.5) opaque.push(k); }
    if (aSum / ring.length < 0.5) return { mode: 'alpha' };
    const buckets = new Map();
    for (const k of opaque) {
      const c = colAt(s, k), q = ((c[0] >> 4) << 8) | ((c[1] >> 4) << 4) | (c[2] >> 4);
      (buckets.get(q) || buckets.set(q, []).get(q)).push(k);
    }
    let members = [];
    for (const m of buckets.values()) if (m.length > members.length) members = m;
    const mean = arr => { const m = [0, 0, 0]; for (const k of arr) { const c = colAt(s, k); m[0] += c[0]; m[1] += c[1]; m[2] += c[2]; } return m.map(v => v / arr.length); };
    let bg = mean(members);
    let md = members.reduce((a, k) => a + dist(colAt(s, k), bg), 0) / members.length;
    const wide = opaque.filter(k => dist(colAt(s, k), bg) < md * 2 + 24);   // pull in the near-misses and re-centre
    if (wide.length > members.length) { members = wide; bg = mean(members); md = members.reduce((a, k) => a + dist(colAt(s, k), bg), 0) / members.length; }
    return { mode: 'flood', bg, thr: clamp(md * 3 + 22, 28, 70), borderFrac: members.length / opaque.length };
  }

  function maskOf(s, est) {
    const { gw, gh } = s, N = gw * gh;
    const mask = new Uint8Array(N);
    let opaque = 0;
    for (let k = 0; k < N; k++) if (s.alpha[k] >= 0.5) { mask[k] = 1; opaque++; }
    let mode = est.mode;
    if (mode === 'flood') {
      const seen = new Uint8Array(N), stack = [];
      for (const k of ringCells(gw, gh)) if (mask[k] && !seen[k] && dist(colAt(s, k), est.bg) < est.thr) { seen[k] = 1; stack.push(k); }
      let removed = 0;
      while (stack.length) {
        const k = stack.pop(); mask[k] = 0; removed++;
        const x = k % gw, y = (k - x) / gw, ck = colAt(s, k);
        const nb = [];
        if (x > 0) nb.push(k - 1); if (x < gw - 1) nb.push(k + 1); if (y > 0) nb.push(k - gw); if (y < gh - 1) nb.push(k + gw);
        for (const n of nb) {
          if (seen[n] || !mask[n]) continue;
          const cn = colAt(s, n);
          // backdrop proper, or a smooth continuation of it (gradients, vignettes)
          if (dist(cn, est.bg) < est.thr || dist(cn, ck) < est.thr * 0.35) { seen[n] = 1; stack.push(n); }
        }
      }
      const frac = removed / Math.max(1, opaque);
      if (frac < 0.06 || frac > 0.97) {            // no real backdrop found (or nothing left): start over as a blob
        mode = 'blob';
        for (let k = 0; k < N; k++) mask[k] = s.alpha[k] >= 0.5 ? 1 : 0;
      }
    }
    if (mode === 'blob') {
      for (let y = 0; y < gh; y++) for (let x = 0; x < gw; x++) {
        const dx = Math.abs((x + 0.5 - gw / 2) / (gw / 2)), dy = Math.abs((y + 0.5 - gh / 2) / (gh / 2));
        if (dx ** 3 + dy ** 3 > 1) mask[y * gw + x] = 0;
      }
    }
    keepMainIslands(mask, gw, gh);
    return { mask, mode };
  }

  function keepMainIslands(mask, gw, gh) {
    const N = gw * gh, label = new Int32Array(N).fill(-1), sizes = [];
    for (let k0 = 0; k0 < N; k0++) {
      if (!mask[k0] || label[k0] >= 0) continue;
      const id = sizes.length; let size = 0; const stack = [k0]; label[k0] = id;
      while (stack.length) {
        const k = stack.pop(); size++;
        const x = k % gw, y = (k - x) / gw;
        const nb = [];
        if (x > 0) nb.push(k - 1); if (x < gw - 1) nb.push(k + 1); if (y > 0) nb.push(k - gw); if (y < gh - 1) nb.push(k + gw);
        for (const n of nb) if (mask[n] && label[n] < 0) { label[n] = id; stack.push(n); }
      }
      sizes.push(size);
    }
    const largest = Math.max(0, ...sizes);
    for (let k = 0; k < N; k++) if (mask[k] && sizes[label[k]] < Math.max(2, largest * 0.08)) mask[k] = 0;
  }

  function cutout(an, det) {
    const src = an.src, W0 = src.width, H0 = src.height;
    // pass 1: find the subject at a working resolution
    const [gw1, gh1] = fitDims(W0, H0, 48, 64);
    const s1 = sampleRect(src, 0, 0, W0, H0, gw1, gh1);
    const est = estimateBg(s1);
    const m1 = maskOf(s1, est);
    let x0 = gw1, y0 = gh1, x1 = -1, y1 = -1;
    for (let y = 0; y < gh1; y++) for (let x = 0; x < gw1; x++) if (m1.mask[y * gw1 + x]) {
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
    }
    let mode = m1.mode;
    if (x1 < 0 || (x1 - x0 + 1) * (y1 - y0 + 1) < 6) { x0 = 0; y0 = 0; x1 = gw1 - 1; y1 = gh1 - 1; mode = 'blob'; }
    // pass 2: zoom the final grid onto the subject's box (half a cell of padding)
    const kx = W0 / gw1, ky = H0 / gh1;
    const sx = clamp((x0 - 0.5) * kx, 0, W0), sy = clamp((y0 - 0.5) * ky, 0, H0);
    const sw = clamp((x1 + 1.5) * kx, 0, W0) - sx, sh = clamp((y1 + 1.5) * ky, 0, H0) - sy;
    const [fw, fh] = fitDims(sw, sh, det, Math.round(det * 1.3));
    const s2 = sampleRect(src, sx, sy, sw, sh, fw, fh, mode === 'flood' ? est : null);
    const m2 = maskOf(s2, mode === 'flood' ? est : { mode });
    let n = 0; for (let k = 0; k < fw * fh; k++) n += m2.mask[k];
    if (n < 4) { for (let k = 0; k < fw * fh; k++) m2.mask[k] = s2.alpha[k] >= 0.5 ? 1 : 0; m2.mode = 'blob'; }
    return { fw, fh, s: s2, mask: m2.mask, mode: m2.mode };
  }

  // ── 3. quantise the subject's colours to a small palette ───────────────
  function kmeans(pts, K, rng, iters) {
    K = Math.min(K, pts.length);
    const d2 = (a, b) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;
    const cents = [pts[Math.floor(rng() * pts.length)].slice()];
    while (cents.length < K) {                   // k-means++-ish: favour far-away points
      let best = null, bd = -1;
      for (let t = 0; t < 10; t++) {
        const p = pts[Math.floor(rng() * pts.length)];
        let d = Infinity; for (const c of cents) d = Math.min(d, d2(p, c));
        if (d > bd) { bd = d; best = p; }
      }
      cents.push(best.slice());
    }
    const assign = new Uint8Array(pts.length);
    for (let it = 0; it < iters; it++) {
      const sum = cents.map(() => [0, 0, 0, 0]);
      for (let i = 0; i < pts.length; i++) {
        let bk = 0, bd = Infinity;
        for (let k = 0; k < cents.length; k++) { const d = d2(pts[i], cents[k]); if (d < bd) { bd = d; bk = k; } }
        assign[i] = bk; const s = sum[bk]; s[0] += pts[i][0]; s[1] += pts[i][1]; s[2] += pts[i][2]; s[3]++;
      }
      for (let k = 0; k < cents.length; k++) if (sum[k][3]) cents[k] = [sum[k][0] / sum[k][3], sum[k][1] / sum[k][3], sum[k][2] / sum[k][3]];
    }
    let counts = new Array(cents.length).fill(0);
    for (let i = 0; i < pts.length; i++) counts[assign[i]]++;
    // fold centroids that ended up nearly the same colour into each other
    let merged = true;
    while (merged && cents.length > 1) {
      merged = false;
      outer: for (let i = 0; i < cents.length; i++) for (let j = i + 1; j < cents.length; j++) {
        if (d2(cents[i], cents[j]) < 18 * 18) {
          const n = counts[i] + counts[j] || 1;
          cents[i] = [0, 1, 2].map(c => (cents[i][c] * counts[i] + cents[j][c] * counts[j]) / n);
          counts[i] = n; cents.splice(j, 1); counts.splice(j, 1); merged = true; break outer;
        }
      }
    }
    counts = new Array(cents.length).fill(0);
    for (let i = 0; i < pts.length; i++) {
      let bk = 0, bd = Infinity;
      for (let k = 0; k < cents.length; k++) { const d = d2(pts[i], cents[k]); if (d < bd) { bd = d; bk = k; } }
      assign[i] = bk; counts[bk]++;
    }
    return { cents, assign, counts };
  }

  // ── 3½. the warp bench ──────────────────────────────────────────────────
  // Every dial is an inverse displacement: for each cell of the new, roomier
  // grid we work out where it came from in the old one and take that colour.
  // Cheap, exact at the edges, and it keeps the pixels square.
  function bend(src, GW, GH, rng) {
    const s = warp.stretch, ln = warp.lean, wv = warp.wave, ml = warp.melt,
      tw = warp.twist, bu = warp.bulge, gl = warp.glitch;
    const kx = clamp(1 - 0.4 * s, 0.35, 2.4), ky = clamp(1 + 0.6 * s, 0.35, 2.4);
    const shear = ln * 0.5;
    const waveA = wv * GW * 0.14, waveF = Math.PI * 4.4 / Math.max(1, GH);
    const meltA = ml * GH * 0.42;
    const twistA = tw * 1.7;
    const p = Math.exp(-bu * 0.75);
    const bandH = Math.max(2, Math.round(GH / 10));
    const bands = [], sag = [];
    for (let b = 0; b * bandH < GH + 4; b++) bands.push(rng() < 0.45 ? (rng() * 2 - 1) * gl * GW * 0.2 : 0);
    for (let x = 0; x < GW; x++) sag.push(meltA * (0.2 + 0.8 * rng()));

    // only pay for the room the live dials actually need
    const big = Math.max(GW, GH);
    const padX = Math.ceil(GW * 0.24 * Math.max(0, -s) + GH * 0.26 * Math.abs(ln) + waveA
      + gl * GW * 0.22 + big * 0.15 * Math.abs(tw) + GW * 0.16 * Math.max(0, -bu)) + 1;
    const padY = Math.ceil(GH * 0.34 * Math.max(0, s) + meltA
      + big * 0.15 * Math.abs(tw) + GH * 0.16 * Math.max(0, -bu)) + 1;
    const W = GW + 2 * padX, H = GH + 2 * padY;
    const out = new Uint8Array(W * H);
    const cx = GW / 2, cy = GH / 2, hw = Math.max(1, cx), hh = Math.max(1, cy);

    for (let Y = 0; Y < H; Y++) for (let X = 0; X < W; X++) {
      let u = X - padX + 0.5 - cx, v = Y - padY + 0.5 - cy;
      u /= kx; v /= ky;                                          // un-stretch
      if (p !== 1) {                                             // un-bulge / un-pinch
        const r = Math.hypot(u / hw, v / hh);
        if (r > 1e-3) { const f = Math.pow(r, 1 / p - 1); u *= f; v *= f; }
      }
      if (twistA) {                                              // un-twist, strongest at the core
        const a = -twistA * (1 - Math.min(1, Math.hypot(u / hw, v / hh)));
        const ca = Math.cos(a), sa = Math.sin(a);
        const nu = u * ca - v * sa; v = u * sa + v * ca; u = nu;
      }
      if (shear) u -= shear * v;                                 // un-lean
      if (waveA) u -= waveA * Math.sin((v + cy) * waveF);        // un-wave
      if (meltA) {                                               // un-melt: the bottom drips
        const t = clamp((v + cy) / Math.max(1, GH), 0, 1);
        v -= sag[clamp(Math.floor(u + cx), 0, GW - 1)] * t * t;
      }
      if (gl) u -= bands[Math.floor(clamp(v + cy, 0, GH - 1) / bandH)] || 0;
      const sx = Math.floor(u + cx), sy = Math.floor(v + cy);
      if (sx < 0 || sx >= GW || sy < 0 || sy >= GH) continue;
      out[Y * W + X] = src[sy * GW + sx];
    }
    return { grid: out, W, H };
  }

  // where do the legs start, and where is the body's midline? (a warped
  // creature has lost the row numbers it was built with)
  function legInfo(g, W, H) {
    const wide = new Int32Array(H), L = new Int32Array(H).fill(-1), R = new Int32Array(H).fill(-1);
    let widest = 0, bottom = -1;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) if (g[y * W + x]) { if (L[y] < 0) L[y] = x; R[y] = x; wide[y]++; }
      if (wide[y]) { bottom = y; if (wide[y] > widest) widest = wide[y]; }
    }
    if (bottom < 0) return { legTop: H, hasLegs: false, cxBody: Math.round(W / 2) };
    let waist = bottom;
    for (let y = bottom; y >= 0; y--) if (wide[y] >= widest * 0.55) { waist = y; break; }
    return { legTop: waist + 1, hasLegs: waist < bottom, cxBody: Math.round((L[waist] + R[waist]) / 2) };
  }

  // ── 4. creature: outline, eyes, mouth and limbs on the real silhouette ──
  function build(an, rng, det) {
    det = DETAILS.includes(det) ? det : detail;
    const cut = an.cuts[det] || (an.cuts[det] = cutout(an, det));
    const GW = cut.fw + 2 * MX, GH = cut.fh + MT + MB;
    const grid = new Uint8Array(GW * GH);
    const get = (x, y) => (x < 0 || x >= GW || y < 0 || y >= GH) ? 0 : grid[y * GW + x];
    const set = (x, y, v) => { if (x >= 0 && x < GW && y >= 0 && y < GH) grid[y * GW + x] = v; };
    const onBody = (x, y) => { const v = get(x, y); return v > 0 && v < 250; };

    // palette — quantisation is seeded by the image only, so re-rolls keep the colours
    const pts = [], where = [];
    for (let y = 0; y < cut.fh; y++) for (let x = 0; x < cut.fw; x++) {
      const k = y * cut.fw + x;
      if (cut.mask[k]) { pts.push(colAt(cut.s, k)); where.push([x + MX, y + MT]); }
    }
    const K = KOF[det] || 8;
    // the quantisation only depends on the picture, so it is cached per detail
    // step — dragging a dial then costs nothing but a redraw
    if (!an.kms) an.kms = {};
    const km = an.kms[det] || (an.kms[det] = kmeans(pts, K, mulberry32(an.seed), 12));
    // the dials, as deltas from what the picture read
    const baseHue = dominantHue(an), baseChaos = clamp(an.edge * 2.2, 0, 1);
    const hue = adj.hue == null ? baseHue : adj.hue;
    const lumen = adj.lumen == null ? an.brightness : adj.lumen;
    const chaos = adj.chaos == null ? baseChaos : adj.chaos;
    const dHue = hue - baseHue, dLum = lumen - an.brightness;
    // the push, above. A dial the operator has dragged still moves the palette
    // by its full amount at every step — that is them asking — but the standing
    // lift the machine applies of its own accord fades out as the grid gets fine.
    const punch = PUNCH[det] == null ? 1 : PUNCH[det];
    const palette = km.cents.map(c => {
      const [h, s, l] = rgb2hsl(...c);
      return hsl2rgb(h + dHue,
        Math.min(1, s * (1 + 0.25 * punch) + 0.03 * punch),
        clamp(0.5 + (l - 0.5) * (1 + 0.08 * punch) + dLum * 0.7, 0.05, 0.97));
    });
    for (let i = 0; i < pts.length; i++) set(where[i][0], where[i][1], km.assign[i] + 1);

    // chaos above the picture's own reading speckles the colours and gnaws at
    // the edges; below it, the cells settle towards their neighbours
    const dChaos = chaos - baseChaos;
    if (Math.abs(dChaos) > 0.02) {
      const crng = mulberry32((an.seed ^ Math.imul(Math.round(chaos * 997) + 1, 0x85EBCA6B)) >>> 0);
      if (dChaos > 0) {
        const p = dChaos * 0.55;
        for (const [x, y] of where) if (crng() < p) set(x, y, 1 + Math.floor(crng() * palette.length));
        for (const [x, y] of where) {
          if (onBody(x - 1, y) && onBody(x + 1, y) && onBody(x, y - 1) && onBody(x, y + 1)) continue;
          if (crng() < dChaos * 0.34) set(x, y, 0);
        }
      } else {
        const p = -dChaos * 1.1, before = new Uint8Array(grid);
        const at = (x, y) => (x < 0 || x >= GW || y < 0 || y >= GH) ? 0 : before[y * GW + x];
        for (const [x, y] of where) {
          if (crng() > p) continue;
          const tally = {};
          for (const [nx, ny] of [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]]) {
            const v = at(nx, ny);
            if (v > 0 && v < 250) tally[v] = (tally[v] || 0) + 1;
          }
          let best = 0, bn = 1;
          for (const v in tally) if (tally[v] > bn) { bn = tally[v]; best = +v; }
          if (best) set(x, y, best);
        }
      }
    }
    const order = palette.map((c, i) => i).sort((a, b) => km.counts[b] - km.counts[a]);
    const dominant = palette[order[0]];
    const secondaryIdx = (order[1] !== undefined ? order[1] : order[0]) + 1;
    const accentIdx = palette.map((c, i) => i).sort((a, b) => rgb2hsl(...palette[b])[2] - rgb2hsl(...palette[a])[2])[0] + 1;
    const outline = mix(dominant, INK, 0.72);

    // silhouette rows
    const rows = new Array(GH).fill(null);
    let top = -1, bottom = -1;
    for (let y = 0; y < GH; y++) {
      let L = -1, R = -1;
      for (let x = 0; x < GW; x++) if (onBody(x, y)) { if (L < 0) L = x; R = x; }
      if (L >= 0) { rows[y] = { L, R, w: R - L + 1 }; if (top < 0) top = y; bottom = y; }
    }
    const bodyH = bottom - top + 1;
    const bright = lumen;
    const traits = [];

    // traits
    const eyeCount = rng() < 0.62 ? 2 : rng() < 0.55 ? 1 : 3;
    const legs = pick(rng, [0, 2, 2, 2, 4]);
    const arms = rng() < 0.5;
    const ears = pick(rng, ['none', 'none', 'pointy', 'round', 'antenna', 'antenna', 'horn']);
    const mouthPool = bright > 0.55 ? ['smile', 'smile', 'o', 'grin', 'none'] : ['flat', 'fangs', 'fangs', 'smile', 'grin', 'none'];
    const mouth = pick(rng, mouthPool);
    const brow = pick(rng, ['none', 'none', 'none', 'flat', 'angry', 'sad']);
    const look = pick(rng, [-1, 0, 0, 1]);

    // face: the widest row in the upper part of the body
    let yE = -1, wBest = -1;
    const fy0 = top + Math.round(bodyH * (0.18 + rng() * 0.1)), fy1 = top + Math.round(bodyH * 0.45);
    for (let y = fy0; y <= Math.max(fy0, fy1); y++) if (rows[y] && rows[y].w > wBest) { wBest = rows[y].w; yE = y; }
    if (yE < 0) { yE = top; wBest = rows[top] ? rows[top].w : 1; }
    const faceRow = rows[yE];
    const cx = Math.round((faceRow.L + faceRow.R) / 2);
    const w = faceRow.w;
    let eyeSize = w >= 20 ? 3 : w >= 9 ? 2 : 1;
    const eyeBoxes = [];
    const eyeAt = (x0, y0, s, pdx) => {           // an s×s eye; only on body cells
      eyeBoxes.push({ x0, y0, s });
      if (s === 1) { if (onBody(x0, y0)) set(x0, y0, SP.PUPIL); return; }
      for (let yy = 0; yy < s; yy++) for (let xx = 0; xx < s; xx++) if (onBody(x0 + xx, y0 + yy)) set(x0 + xx, y0 + yy, SP.WHITE);
      const px = clamp(x0 + Math.floor(s / 2) + pdx, x0, x0 + s - 1), py = y0 + 1;
      if (get(px, py) === SP.WHITE) set(px, py, SP.PUPIL);
    };
    if (eyeCount === 1) {
      const s = Math.min(3, eyeSize + 1);
      eyeAt(cx - Math.floor(s / 2), yE, s, look);
      eyeSize = s;
    } else {
      const sp = Math.max(eyeSize, Math.round(w * 0.22));
      eyeAt(cx - sp - Math.floor(eyeSize / 2), yE, eyeSize, look);
      eyeAt(cx + sp - Math.floor(eyeSize / 2), yE, eyeSize, look);
      if (eyeCount === 3) eyeAt(cx, yE - 1, 1, 0);
    }

    // mouth, a row or two under the eyes, scaled to the face width
    const yM = yE + eyeSize + 1;
    const half = Math.max(1, Math.round(w * 0.12));
    const m = (x, y, v) => { if (onBody(x, y)) set(x, y, v); };
    if (mouth !== 'none' && rows[yM]) {
      if (mouth === 'smile') { m(cx - half, yM, SP.MOUTH); m(cx + half, yM, SP.MOUTH); for (let x = cx - half + 1; x <= cx + half - 1; x++) m(x, yM + 1, SP.MOUTH); if (half === 1) m(cx, yM + 1, SP.MOUTH); }
      else if (mouth === 'flat') { for (let x = cx - half; x <= cx + half; x++) m(x, yM, SP.MOUTH); }
      else if (mouth === 'grin') { for (let x = cx - half - 1; x <= cx + half + 1; x++) m(x, yM, SP.MOUTH); m(cx - half - 1, yM - 1, SP.MOUTH); m(cx + half + 1, yM - 1, SP.MOUTH); }
      else if (mouth === 'fangs') { for (let x = cx - half; x <= cx + half; x++) m(x, yM, SP.MOUTH); m(cx - half, yM + 1, SP.WHITE); m(cx + half, yM + 1, SP.WHITE); }
      else if (mouth === 'o') { m(cx, yM, SP.MOUTH); m(cx, yM + 1, SP.MOUTH); if (half > 1) { m(cx - 1, yM, SP.MOUTH); m(cx - 1, yM + 1, SP.MOUTH); } }
    }

    // brows: a dark line over each eye. angry slopes down towards the nose,
    // sad slopes away from it, flat sits level.
    if (brow !== 'none') {
      for (const b of eyeBoxes) {
        const y = b.y0 - 1, leftEye = b.x0 + (b.s - 1) / 2 <= cx;
        if (brow === 'flat') { for (let i = 0; i < b.s; i++) m(b.x0 + i, y, SP.MOUTH); continue; }
        if (b.s === 1) {                             // one cell of eye: brow + a raised/lowered wing
          const o = leftEye ? -1 : 1;
          m(b.x0, y - (brow === 'sad' ? 1 : 0), SP.MOUTH);
          m(b.x0 + o, y - (brow === 'angry' ? 1 : 0), SP.MOUTH);
          continue;
        }
        for (let i = 0; i < b.s; i++) {
          const x = b.x0 + i;
          const t = leftEye ? 1 - i / (b.s - 1) : i / (b.s - 1);   // 1 at the outer edge
          m(x, y - Math.round(brow === 'angry' ? t : 1 - t), SP.MOUTH);
        }
      }
    }

    // legs hang off the bottom row, in the colour of the cell they hang from
    const base = rows[bottom];
    if (legs && base && base.w >= 2 && bottom + 1 < GH) {
      const fr = legs === 2 ? [0.28, 0.72] : base.w >= 12 ? [0.12, 0.38, 0.62, 0.88] : [0.2, 0.5, 0.8];
      const legW = base.w >= 14 ? 2 : 1, legLen = Math.min(MB - 1, 1 + Math.floor(rng() * 2)), feet = rng() < 0.55;
      fr.forEach((f, i) => {
        const x0 = clamp(Math.round(base.L + f * (base.w - 1) - (legW - 1) / 2), base.L, base.R - legW + 1);
        const col = get(x0, bottom) || secondaryIdx;
        for (let y = bottom + 1; y <= bottom + legLen; y++) for (let k = 0; k < legW; k++) set(x0 + k, y, col < 250 ? col : secondaryIdx);
        if (feet) set(i < fr.length / 2 ? x0 - 1 : x0 + legW, bottom + legLen, col < 250 ? col : secondaryIdx);
      });
      traits.push(legs === 2 ? 'biped' : 'many-legged');
    } else traits.push('blob');

    // arms poke out of the sides about halfway down
    if (arms) {
      const yA = clamp(top + Math.round(bodyH * (0.5 + rng() * 0.15)), top, bottom);
      const r = rows[yA];
      if (r) {
        const len = 1 + Math.floor(rng() * MX), dy = pick(rng, [-1, 0, 0, 1]);
        const cl = get(r.L, yA), cr = get(r.R, yA);
        for (let i = 1; i <= len; i++) { set(r.L - i, yA + (i > 1 ? dy : 0), cl < 250 ? cl : secondaryIdx); set(r.R + i, yA + (i > 1 ? dy : 0), cr < 250 ? cr : secondaryIdx); }
        traits.push('stubby arms');
      }
    }

    // ears / antennae / horn sit on the real top edge of the head
    const topAt = x => { for (let y = 0; y < GH; y++) if (get(x, y)) return y; return -1; };
    const headRow = rows[top];
    if (ears !== 'none' && headRow) {
      const cols = headRow.w >= 4 ? [headRow.L + Math.round(headRow.w * 0.25), headRow.L + Math.round(headRow.w * 0.75)] : [headRow.L, headRow.R];
      const stalk = (x, n, tipV) => { const t = topAt(x); if (t < 0) return; const col = get(x, t) < 250 ? get(x, t) : secondaryIdx; for (let k = 1; k <= Math.min(n, t); k++) set(x, t - k, k === Math.min(n, t) ? tipV : col); };
      if (ears === 'antenna') { cols.forEach(x => stalk(x, 3, secondaryIdx)); traits.push('antennae'); }
      else if (ears === 'horn') { stalk(cx, 2, accentIdx); traits.push('horned'); }
      else if (ears === 'pointy') {
        cols.forEach((x, i) => { const t = topAt(x); if (t < 1) return; const col = get(x, t) < 250 ? get(x, t) : secondaryIdx; set(x, t - 1, col); set(x + (i ? 1 : -1), t - 1, col); if (t >= 2) set(x, t - 2, col); });
        traits.push('pointy ears');
      } else if (ears === 'round') {
        cols.forEach((x, i) => { const t = topAt(x); if (t < 1) return; const col = get(x, t) < 250 ? get(x, t) : secondaryIdx; const o = i ? 1 : -1; set(x, t - 1, col); set(x + o, t - 1, col); if (t >= 2) { set(x, t - 2, secondaryIdx); set(x + o, t - 2, secondaryIdx); } });
        traits.push('round ears');
      }
    }

    // the warp bench bends the body before the outline is drawn, so the
    // outline hugs the new shape instead of being smeared with it
    let body = grid, W = GW, H = GH;
    let legTop = bottom + 1, cxBody = base ? Math.round((base.L + base.R) / 2) : Math.round(GW / 2);
    let hasLegs = false;
    for (let y = bottom + 1; y < GH && !hasLegs; y++) for (let x = 0; x < GW; x++) if (grid[y * GW + x]) { hasLegs = true; break; }
    if (bending()) {
      const b = bend(grid, GW, GH, mulberry32((an.seed ^ 0x5BD1E995) >>> 0));
      body = b.grid; W = b.W; H = b.H;
      const li = legInfo(body, W, H);
      legTop = li.legTop; hasLegs = li.hasLegs; cxBody = li.cxBody;
      traits.push('warped');
    }
    if (warp.blur > 0.02) traits.push('out of focus');

    // outline pass
    const at = (x, y) => (x < 0 || x >= W || y < 0 || y >= H) ? 0 : body[y * W + x];
    const out = new Uint8Array(body);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (body[y * W + x]) continue;
      if (at(x - 1, y) || at(x + 1, y) || at(x, y - 1) || at(x, y + 1)) out[y * W + x] = SP.OUTLINE;
    }

    if (eyeCount === 1) traits.unshift('cyclops'); else if (eyeCount === 3) traits.unshift('three-eyed');
    if (brow === 'angry') traits.push('cross'); else if (brow === 'sad') traits.push('worried'); else if (brow === 'flat') traits.push('level-browed');
    if (mouth === 'fangs') traits.push('fanged'); else if (mouth === 'grin') traits.push('grinning');
    traits.push(cut.mode === 'alpha' ? 'sticker cut' : cut.mode === 'flood' ? 'backdrop lifted' : 'blob cut');
    traits.push(cut.fw + '×' + cut.fh + ' · ' + palette.length + ' colours');

    const stats = {
      vibe: clamp(an.warmth + dHue / 720, 0, 1),
      chaos: chaos,
      glow: clamp(bright * 1.1, 0, 1),
      heft: clamp(pts.length / (cut.fw * cut.fh), 0.05, 1)
    };
    return {
      grid: out, GW: W, GH: H, palette, outline, traits, name: makeName(rng), stats, detail: det, mode: cut.mode,
      legTop, hasLegs, cxBody,          // everything under legTop is leg; cxBody says which one is "left"
      blur: warp.blur
    };
  }

  function makeName(rng) {
    const A = ['zo', 'ka', 'mi', 'ru', 'be', 'lo', 'ti', 'gu', 'pa', 'ne', 'vi', 'sho', 'du', 'fa', 'ki', 'mo', 'wa', 'ye', 'pu', 'tra', 'ol', 'um', 'ska', 'bri'];
    const B = ['bble', 'nk', 'mp', 'ff', 'zz', 'll', 'rt', 'sh', 'ng', 'x', 'tch', 'p'];
    const T = ['the Unbothered', 'of the Hall Closet', 'the Slightly Damp', 'Esq.', 'the Third', 'who Knocks', 'of Many Snacks',
      'the Reluctant', 'Jr.', 'the Rotund', 'who Hums', 'the Luminous', 'from Downstairs', 'the Almost-Finished', 'of the Back Shelf'];
    let n = pick(rng, A) + pick(rng, A);
    if (rng() < 0.5) n += pick(rng, B);
    n = n[0].toUpperCase() + n.slice(1);
    if (rng() < 0.5) n += ' ' + pick(rng, T);
    return n;
  }

  // ── 5. render ────────────────────────────────────────────────────────────
  function colorOf(gen, x, y) {
    const v = gen.grid[y * gen.GW + x];
    if (!v) return null;
    if (v === SP.WHITE) return [255, 255, 255];
    if (v === SP.PUPIL || v === SP.MOUTH) return INK;
    if (v === SP.OUTLINE) return gen.outline;
    let c = gen.palette[v - 1];
    const below = y < gen.GH - 1 ? gen.grid[(y + 1) * gen.GW + x] : 0, above = y ? gen.grid[(y - 1) * gen.GW + x] : 0;
    if (below === 0 || below === SP.OUTLINE) c = darken(c, 0.16);
    else if (above === 0 || above === SP.OUTLINE) c = lighten(c, 0.16);
    return c;
  }

  function layout(gen) {
    const cell = Math.max(1, Math.floor(Math.min(CW / gen.GW, CH / gen.GH)));
    return { cell, ox: Math.floor((CW - gen.GW * cell) / 2), oy: Math.floor((CH - gen.GH * cell) / 2) };
  }

  // the BLUR dial is the one warp that isn't geometry: the cells are laid down
  // as usual, then the whole plate is drawn back through a blur, so the pixels
  // bleed into each other instead of being resampled.
  const soft = document.createElement('canvas'), softCtx = soft.getContext('2d');
  function blurThrough(g, w, h, cell, gen, paint) {
    const px = (gen.blur || 0) * cell * 1.1;
    if (px < 0.4) { paint(g); return; }
    if (soft.width !== w || soft.height !== h) { soft.width = w; soft.height = h; }
    softCtx.clearRect(0, 0, w, h);
    paint(softCtx);
    g.save();
    g.filter = 'blur(' + px.toFixed(2) + 'px)';
    g.drawImage(soft, 0, 0);
    g.restore();
  }

  function drawRows(gen, upto) {
    const { cell, ox, oy } = layout(gen);
    ctx.clearRect(0, 0, CW, CH);
    blurThrough(ctx, CW, CH, cell, gen, g => {
      for (let y = 0; y < Math.min(gen.GH, upto); y++) for (let x = 0; x < gen.GW; x++) {
        const c = colorOf(gen, x, y);
        if (!c) continue;
        g.fillStyle = css(c);
        g.fillRect(ox + x * cell, oy + y * cell, cell, cell);
      }
    });
  }

  // a stand-alone sprite of a forged creature, sized to a target height.
  // phase 0 = standing, 1 / 2 = a leg lifted, 3 = both feet off the ground.
  function sprite(gen, targetH, phase) {
    const cell = Math.max(1, targetH / gen.GH), pad = Math.ceil(cell) + Math.ceil((gen.blur || 0) * cell * 3);
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(gen.GW * cell) + 2 * pad);
    c.height = Math.max(1, Math.round(gen.GH * cell) + 2 * pad);
    const g = c.getContext('2d');
    // where the creature actually sits inside its grid (the margins are rarely
    // all used), so whoever plants it can stand it on the ground
    let x0g = gen.GW, x1g = -1, y0g = -1, y1g = -1;
    for (let y = 0; y < gen.GH; y++) for (let x = 0; x < gen.GW; x++) if (gen.grid[y * gen.GW + x]) {
      if (x < x0g) x0g = x; if (x > x1g) x1g = x; if (y0g < 0) y0g = y; y1g = y;
    }
    blurThrough(g, c.width, c.height, cell, gen, gg => {
      for (let y = 0; y < gen.GH; y++) for (let x = 0; x < gen.GW; x++) {
        const col = colorOf(gen, x, y);
        if (!col) continue;
        let dy = 0;
        if (phase === 3) dy = -1;
        else if (!phase) dy = 0;
        else if (gen.hasLegs) dy = (y >= gen.legTop && (phase === 1) === (x < gen.cxBody)) ? -1 : 0;
        else dy = phase === 1 ? -1 : 0;          // no legs to lift: the whole blob bounces
        const x0 = Math.round(x * cell) + pad, x1 = Math.round((x + 1) * cell) + pad;
        const y0 = Math.round((y + dy) * cell) + pad, y1 = Math.round((y + dy + 1) * cell) + pad;
        gg.fillStyle = css(col);
        gg.fillRect(x0, y0, x1 - x0, y1 - y0);
      }
    });
    c.dataset.foot = String(y1g < 0 ? pad : c.height - (Math.round((y1g + 1) * cell) + pad));
    c.dataset.span = String(x1g < 0 ? c.width : Math.round((x1g + 1) * cell) - Math.round(x0g * cell));
    c.dataset.tall = String(y1g < 0 ? c.height : Math.round((y1g + 1) * cell) - Math.round(y0g * cell));
    return c;
  }

  function drawStatic(t) {
    ctx.clearRect(0, 0, CW, CH);
    const b = CW / 17;                      // the same 17 blocks across it always had
    for (let y = 0; y * b < CH; y++) for (let x = 0; x < 17; x++) {
      const v = Math.random();
      if (v < 0.55) continue;
      const a = v > 0.92 ? 0.9 : 0.3;
      ctx.fillStyle = 'rgba(160,240,190,' + (a * (0.6 + 0.4 * Math.sin(t / 60 + x))) + ')';
      ctx.fillRect(x * b, y * b, b, b);
    }
  }

  // ── machine state ────────────────────────────────────────────────────────
  // the line that stands in for the nameplate until something has come out
  const nothingEl = document.getElementById('sp-nothing');
  const setStatus = s => { readout('status').textContent = s; };
  /* The MK.II chassis shakes, blows harder and runs its belt while the machine
     is working. That is exactly when the BUSY lamp is lit, so the chassis
     follows the lamp rather than being told the same thing twice. */
  const rigEl = document.getElementById('sp-rig');
  const setLed = (n, on, blink) => {
    const e = led(n); e.classList.toggle('on', !!on); e.classList.toggle('blink', !!blink);
    if (n === 'busy' && rigEl) rigEl.classList.toggle('chugging', !!on);
  };
  const setGauge = (n, t) => { gauge(n).style.transform = 'rotate(' + (-82 + clamp(t, 0, 1) * 164) + 'deg)'; };

  // ── the dials ────────────────────────────────────────────────────────────
  const DIALS = ['hue', 'chaos', 'lumen'];
  const DIAL_MAX = { hue: 360, chaos: 1, lumen: 1 };

  function dialValues() {
    if (!analysis) return { hue: adj.hue || 0, chaos: adj.chaos || 0, lumen: adj.lumen || 0 };
    return {
      hue: adj.hue == null ? dominantHue(analysis) : adj.hue,
      chaos: adj.chaos == null ? clamp(analysis.edge * 2.2, 0, 1) : adj.chaos,
      lumen: adj.lumen == null ? analysis.brightness : adj.lumen
    };
  }

  function refreshDials() {
    const d = dialValues();
    DIALS.forEach(n => {
      setGauge(n, d[n] / DIAL_MAX[n]);
      const el = gaugeEl(n);
      if (!el) return;
      el.classList.toggle('set', adj[n] != null);
      el.setAttribute('aria-valuenow', String(Math.round(d[n] * (n === 'hue' ? 1 : 100))));
      const cap = el.querySelector('figcaption');
      if (cap) cap.textContent = n.toUpperCase() + (analysis ? ' ' + (n === 'hue' ? Math.round(d.hue) + '°' : Math.round(d[n] * 100) + '%') : '');
    });
    if (analysis) readout('hue').textContent = Math.round(d.hue) + '°' + (adj.hue == null ? '' : ' ·');
  }

  let dialRaf = 0;
  function redressSoon() {
    if (dialRaf) return;
    dialRaf = requestAnimationFrame(() => { dialRaf = 0; redress(); });
  }

  function setDial(n, t, quiet) {
    if (!analysis || DIALS.indexOf(n) < 0) return;
    adj[n] = clamp(t, 0, 1) * DIAL_MAX[n];
    refreshDials();
    if (!quiet) setStatus(n + ' held at ' + (n === 'hue' ? Math.round(adj.hue) + '°' : Math.round(adj[n] * 100) + '%'));
    redressSoon();
  }

  function clearDial(n) {                      // back to whatever the picture said
    if (n && DIALS.indexOf(n) < 0) return;
    (n ? [n] : DIALS).forEach(k => { adj[k] = null; });
    refreshDials();
    setStatus(n ? n + ' · read from image' : 'dials re-read');
    if (analysis) redressSoon();
  }

  function loadImage(file) {
    if (!file) return;
    const okType = /^image\/(png|jpeg)$/.test(file.type) || /\.(png|jpe?g)$/i.test(file.name || '');
    if (!okType) { reject('png / jpg only'); return; }
    setStatus('reading…');
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); intake(img, file.name); };
    img.onerror = () => { URL.revokeObjectURL(url); reject('could not read file'); };
    img.src = url;
  }

  function thumbnail(img) {
    const T = 240, c = document.createElement('canvas'); c.width = T; c.height = T;
    const g = c.getContext('2d');
    const s = Math.max(T / img.naturalWidth, T / img.naturalHeight);
    const w = img.naturalWidth * s, h = img.naturalHeight * s;
    g.drawImage(img, (T - w) / 2, (T - h) / 2, w, h);
    return c.toDataURL('image/jpeg', 0.85);
  }

  function reject(msg) {
    hopper.classList.remove('bad'); void hopper.offsetWidth; hopper.classList.add('bad');
    setStatus(msg);
  }

  function intake(img, label) {
    let an;
    try { an = analyze(img); }
    catch (e) { reject('could not read pixels'); return; }
    analysis = an;
    DIALS.forEach(n => { adj[n] = null; });      // a new specimen speaks for itself
    specimen.src = thumbnail(img);
    hopEmpty.hidden = true; hopFull.hidden = false;
    readout('seed').textContent = '0x' + analysis.seed.toString(16).toUpperCase().padStart(8, '0');
    readout('px').textContent = analysis.w + ' × ' + analysis.h;
    refreshDials();
    setLed('spec', true);
    goBtn.disabled = false; ejectBtn.disabled = false;
    setStatus('specimen ok' + (label ? ' · ' + label.slice(0, 14) : ''));
    nonce = -1;
    setTimeout(() => pressForge(), 420);
  }

  function eject() {
    analysis = null; last = null; nonce = -1; animToken++; busy = false; customName = null;
    specimen.removeAttribute('src');
    hopEmpty.hidden = false; hopFull.hidden = true;
    fileIn.value = '';
    DIALS.forEach(n => { adj[n] = null; });
    ['seed', 'px', 'hue'].forEach(r => readout(r).textContent = '—');
    refreshDials();
    setLed('spec', false); setLed('out', false); setLed('busy', false);
    goBtn.disabled = true; ejectBtn.disabled = true;
    ctx.clearRect(0, 0, CW, CH);
    screenIdle.hidden = false; screen.classList.remove('lit'); plate.hidden = true;
    if (nothingEl) nothingEl.hidden = false;
    setStatus('idle');
  }

  function pressForge() {
    if (!analysis || busy) return;
    goBtn.classList.add('pressed');
    setTimeout(() => goBtn.classList.remove('pressed'), 160);
    spawnNext = true;                     // a pressed FORGE also lets one loose on the bench
    forge(true);
  }

  function forge(reroll) {
    if (!analysis) return;
    busy = true;
    if (reroll) { nonce++; customName = null; }   // a new creature gets a new name
    const token = ++animToken;
    const rng = mulberry32((analysis.seed ^ Math.imul(nonce + 1, 0x9E3779B9)) >>> 0);
    let gen;
    try { gen = build(analysis, rng, detail); }
    catch (e) { busy = false; setLed('busy', false); setStatus('forge jammed'); console.error(e); return; }
    last = gen;
    setLed('busy', true, true); setLed('out', false);
    setStatus('forging…');
    screenIdle.hidden = true; screen.classList.add('lit'); plate.hidden = true;
    if (nothingEl) nothingEl.hidden = true;

    const t0 = performance.now();
    const STATIC = 520, REVEAL = 680;
    const { cell, oy } = layout(gen);
    function frame(now) {
      if (token !== animToken) return;
      const t = now - t0;
      if (t < STATIC) { drawStatic(t); requestAnimationFrame(frame); return; }
      const k = (t - STATIC) / REVEAL;
      drawRows(gen, Math.ceil(k * gen.GH));
      if (k < 1) {
        const y = oy + Math.min(gen.GH, Math.ceil(k * gen.GH)) * cell;
        ctx.fillStyle = 'rgba(160,240,190,.35)'; ctx.fillRect(0, y - cell, CW, cell);
        requestAnimationFrame(frame);
        return;
      }
      drawRows(gen, gen.GH);
      done(gen);
    }
    requestAnimationFrame(frame);
  }

  function nameplate(gen) {
    if (gen.rolled === undefined) gen.rolled = gen.name;
    if (customName) gen.name = customName;      // a typed-in name outlives a redraw
    if (document.activeElement !== nameEl) nameEl.value = gen.name;
    traitsEl.textContent = gen.traits.join(' · ');
    plate.hidden = false;
    for (const k in gen.stats) {
      const bar = plate.querySelector('[data-stat="' + k + '"]');
      const pct = Math.round(gen.stats[k] * 100);
      bar.style.width = '0%';
      bar.parentElement.nextElementSibling.textContent = pct + '%';
      requestAnimationFrame(() => requestAnimationFrame(() => { bar.style.width = pct + '%'; }));
    }
  }

  function done(gen) {
    busy = false;
    batch++;
    countEl.textContent = String(batch).padStart(4, '0');
    setLed('busy', false); setLed('out', true);
    setStatus(nonce ? 're-rolled ×' + nonce : 'forged');
    nameplate(gen);
    if (spawnNext) {
      spawnNext = false;
      if (window.Critters) { try { Critters.spawn(gen, canvas); } catch (e) { console.error(e); } }
    }
  }

  // a dial moved: same creature, redrawn on the spot (no static, no re-roll)
  function redress() {
    if (!analysis || busy) return;
    animToken++;
    const rng = mulberry32((analysis.seed ^ Math.imul(nonce + 1, 0x9E3779B9)) >>> 0);
    let gen;
    try { gen = build(analysis, rng, detail); }
    catch (e) { setStatus('forge jammed'); console.error(e); return; }
    last = gen;
    screenIdle.hidden = true; screen.classList.add('lit');
    drawRows(gen, gen.GH);
    setLed('out', true);
    nameplate(gen);
    if (window.Critters) Critters.reskin(gen);   // the one on the bench keeps up
  }

  function setDetail(d) {
    d = +d;
    if (!DETAILS.includes(d)) return;
    detail = d;
    try { localStorage.setItem('knoll-lab:forge:detail', String(d)); } catch (e) {}
    document.querySelectorAll('[data-detail]').forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.detail === d)));
    if (analysis && !busy) forge(false);        // same face, finer or coarser picture
  }

  // the SIZE knob resizes the next spawn, and the newest one already loose
  const sizeIn = $('forge-size'), sizeV = $('forge-size-v'), sizeSet = $('size-set');
  function markSize() {
    if (sizeIn) sizeIn.value = String(Math.round(size * 100));
    if (sizeV) sizeV.textContent = '×' + (+size.toFixed(2));
    if (sizeSet) sizeSet.classList.toggle('on', Math.abs(size - 1) > 0.001);
  }
  function setSize(v, quiet) {
    v = Math.max(0.5, Math.min(2, isFinite(v) ? v : 1));
    if (v === size) return;
    size = v;
    try { localStorage.setItem('knoll-lab:forge:size', String(size)); } catch (e) {}
    markSize();
    if (!quiet) setStatus('size ×' + (+size.toFixed(2)));
    if (last && window.Critters) Critters.reskin(last);
  }

  // ── naming ───────────────────────────────────────────────────────────────
  // typing renames the creature on the plate, on the saved png and on the
  // one already walking the bench. FORGE (or a new specimen) rolls a fresh one.
  function rename(v, quiet) {
    const name = String(v == null ? '' : v).replace(/\s+/g, ' ').slice(0, 42).trim();
    customName = name || null;                  // emptied out? fall back to the rolled one
    if (last) last.name = name || last.rolled || last.name;
    if (!quiet) nameEl.value = last ? last.name : name;
    if (window.Critters && last) Critters.rename(last.name);
  }

  function rollName() {
    if (!last) return;
    rename(makeName(mulberry32((Math.random() * 4294967296) >>> 0)));
    setStatus('renamed');
  }

  // ── the warp bench ───────────────────────────────────────────────────────
  function setWarp(k, v, quiet) {
    if (WARPS.indexOf(k) < 0) return;
    const lo = BIPOLAR[k] ? -1 : 0;
    v = clamp(isFinite(v) ? v : 0, lo, 1);
    if (warp[k] === v) return;
    warp[k] = v;
    try { localStorage.setItem('knoll-lab:forge:warp', JSON.stringify(warp)); } catch (e) {}
    markWarp();
    if (!quiet) setStatus(v ? k + ' ' + (v > 0 && BIPOLAR[k] ? '+' : '') + Math.round(v * 100) : k + ' · flat');
    redressSoon();
  }

  function resetWarp(scramble) {
    WARPS.forEach(k => {
      warp[k] = !scramble ? 0
        : Math.random() < 0.42 ? 0
          : BIPOLAR[k] ? +(Math.random() * 2 - 1).toFixed(2) : +(Math.random() * (k === 'blur' ? 0.7 : 1)).toFixed(2);
    });
    try { localStorage.setItem('knoll-lab:forge:warp', JSON.stringify(warp)); } catch (e) {}
    markWarp();
    setStatus(scramble ? 'bench shaken' : 'bench flat');
    redressSoon();
  }

  function markWarp() {
    document.querySelectorAll('[data-warp]').forEach(el => {
      const k = el.dataset.warp, v = warp[k];
      el.value = String(Math.round(v * 100));
      const row = el.closest('.warp-set');
      if (!row) return;
      row.classList.toggle('on', !!v);
      const out = row.querySelector('b');
      if (out) out.textContent = v ? (v > 0 && BIPOLAR[k] ? '+' : '') + Math.round(v * 100) : '·';
    });
  }

  function savePng() {
    if (!last) return;
    const s = 2, c = document.createElement('canvas');   // 680×880, as it always was
    c.width = CW * s; c.height = CH * s;
    const g = c.getContext('2d');
    g.imageSmoothingEnabled = false;
    g.drawImage(canvas, 0, 0, c.width, c.height);
    const a = document.createElement('a');
    a.download = last.name.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() + '.png';
    a.href = c.toDataURL('image/png');
    a.click();
  }

  // a synthetic specimen — a gnome off the shelf, a different sort each press,
  // painted on a flat backdrop so the cut-out has something clean to lift
  const GNOMES = [
    { kind: 'garden',  hat: 'cone', hatH: 358, coatH: 214, beardL: 94, skinH: 22, prop: 'spade' },
    { kind: 'forest',  hat: 'leaf', hatH: 108, coatH: 34,  beardL: 76, skinH: 26, prop: 'staff' },
    { kind: 'shroom',  hat: 'cap',  hatH: 354, coatH: 44,  beardL: 92, skinH: 28, prop: null },
    { kind: 'tinker',  hat: 'weld', hatH: 28,  coatH: 200, beardL: 48, skinH: 24, prop: 'wrench' },
    { kind: 'frost',   hat: 'cone', hatH: 196, coatH: 208, beardL: 97, skinH: 20, prop: 'staff' },
    { kind: 'miner',   hat: 'helm', hatH: 46,  coatH: 16,  beardL: 40, skinH: 22, prop: 'pick' },
    { kind: 'wizard',  hat: 'wide', hatH: 268, coatH: 256, beardL: 90, skinH: 26, prop: 'staff' },
    { kind: 'bog',     hat: 'cone', hatH: 88,  coatH: 100, beardL: 62, skinH: 78, prop: 'reed' },
    { kind: 'baker',   hat: 'puff', hatH: 42,  coatH: 18,  beardL: 88, skinH: 26, prop: 'loaf' },
    { kind: 'lantern', hat: 'cone', hatH: 320, coatH: 248, beardL: 84, skinH: 24, prop: 'lamp' }
  ];
  let gnomeTurn = Math.floor(Math.random() * GNOMES.length);

  function sample() {
    const S = 200, c = document.createElement('canvas'); c.width = S; c.height = S;
    const g = c.getContext('2d');
    const G = GNOMES[gnomeTurn = (gnomeTurn + 1) % GNOMES.length];

    const jit = (n, d) => n + (Math.random() * 2 - 1) * d;
    const hsl = (h, s, l) => 'hsl(' + (((h % 360) + 360) % 360) + ',' + s + '%,' + l + '%)';
    const disc = (x, y, r) => { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); };
    const blob = (x, y, rx, ry, a) => { g.beginPath(); g.ellipse(x, y, rx, ry, a || 0, 0, Math.PI * 2); g.fill(); };
    const dome = (x, y, rx, ry) => { g.beginPath(); g.ellipse(x, y, rx, ry, 0, Math.PI, Math.PI * 2); g.fill(); };
    const bar = (x1, y1, x2, y2, w, col) => {
      g.strokeStyle = col; g.lineWidth = w; g.lineCap = 'round';
      g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke();
    };

    const cx = S / 2, night = Math.random() < 0.4;
    const hat = jit(G.hatH, 8), coat = jit(G.coatH, 10);
    const skin = hsl(G.skinH, 44, night ? 74 : 78);
    const cloth = hsl(coat, G.kind === 'miner' ? 22 : 52, night ? 44 : 38);
    const leather = hsl(26, 44, 24);

    g.fillStyle = hsl(coat + 150 + Math.random() * 60, 16, night ? 15 : 91);
    g.fillRect(0, 0, S, S);

    // boots, robe, sleeves, hands, belt
    g.fillStyle = leather;
    blob(cx - 14, 174, 12, 8); blob(cx + 14, 174, 12, 8);
    g.fillStyle = cloth;
    g.beginPath();
    g.moveTo(cx - 21, 116); g.lineTo(cx + 21, 116);
    g.lineTo(cx + 39, 172); g.quadraticCurveTo(cx, 180, cx - 39, 172);
    g.closePath(); g.fill();
    blob(cx - 30, 138, 9, 16, 0.4); blob(cx + 30, 138, 9, 16, -0.4);
    g.fillStyle = skin;
    disc(cx - 34, 152, 7); disc(cx + 34, 152, 7);
    g.fillStyle = leather; g.fillRect(cx - 30, 144, 60, 9);
    g.fillStyle = hsl(45, 62, 60); g.fillRect(cx - 6, 144, 12, 9);

    // whatever this one carries
    const px = cx + 46;
    if (G.prop === 'staff') {
      bar(px, 178, px - 6, 60, 6, leather);
      g.fillStyle = G.kind === 'frost' ? hsl(190, 70, 78) : hsl(hat, 62, 56);
      disc(px - 6, 56, 9);
    } else if (G.prop === 'spade') {
      bar(px - 2, 168, px - 6, 98, 5, leather);
      g.fillStyle = hsl(210, 8, night ? 66 : 58);
      g.beginPath();
      g.moveTo(px - 13, 164); g.lineTo(px + 9, 164); g.lineTo(px + 4, 188); g.lineTo(px - 8, 188);
      g.closePath(); g.fill();
    } else if (G.prop === 'pick') {
      bar(px - 2, 178, px - 6, 74, 5, leather);
      g.strokeStyle = hsl(210, 8, night ? 66 : 56); g.lineWidth = 6;
      g.beginPath(); g.arc(px - 6, 88, 20, Math.PI * 1.15, Math.PI * 1.85); g.stroke();
    } else if (G.prop === 'wrench') {
      bar(px - 2, 166, px - 4, 116, 6, hsl(40, 55, 52));
      g.strokeStyle = hsl(40, 55, 52); g.lineWidth = 6;
      g.beginPath(); g.arc(px - 4, 108, 10, Math.PI * 0.35, Math.PI * 1.65); g.stroke();
    } else if (G.prop === 'reed') {
      bar(px - 2, 178, px - 8, 70, 4, hsl(96, 45, 34));
      g.fillStyle = hsl(28, 45, 30); blob(px - 8, 78, 6, 16);
    } else if (G.prop === 'lamp') {
      bar(px - 4, 148, px - 4, 128, 4, leather);
      g.fillStyle = hsl(48, 90, night ? 66 : 58); g.fillRect(px - 14, 148, 20, 22);
      g.fillStyle = hsl(52, 95, 84); g.fillRect(px - 10, 152, 12, 14);
    } else if (G.prop === 'loaf') {
      g.fillStyle = hsl(32, 52, 56); blob(cx, 150, 22, 11, -0.15);
      for (let i = -1; i <= 1; i++) bar(cx + i * 12 - 3, 145, cx + i * 12 + 3, 155, 2, hsl(34, 40, 40));
    }

    // head, beard, nose — the beard is most of the gnome
    g.fillStyle = skin; disc(cx, 106, 19);
    g.fillStyle = hsl(jit(34, 14), G.kind === 'bog' ? 26 : 10, G.beardL);
    g.beginPath();
    g.moveTo(cx - 20, 102);
    g.quadraticCurveTo(cx - 27, 138, cx, jit(156, 8));
    g.quadraticCurveTo(cx + 27, 138, cx + 20, 102);
    g.closePath(); g.fill();
    g.fillStyle = 'rgba(0,0,0,.55)';
    disc(cx - 8, 100, 2.2); disc(cx + 8, 100, 2.2);
    g.fillStyle = hsl(G.skinH, 50, night ? 68 : 72); disc(cx, 112, 8);

    // the hat is what says which sort of gnome this is
    g.fillStyle = hsl(hat, G.kind === 'miner' ? 30 : 66, night ? 46 : 42);
    if (G.hat === 'cone' || G.hat === 'leaf') {
      const tx = cx + jit(0, 30), ty = jit(34, 12);
      g.beginPath();
      g.moveTo(cx - 25, 96);
      g.quadraticCurveTo(cx - 16, 54, tx, ty);
      g.quadraticCurveTo(cx + 20, 58, cx + 25, 96);
      g.closePath(); g.fill();
      g.fillStyle = hsl(hat, 58, night ? 58 : 30);
      blob(cx, 95, 28, 7);
      if (G.hat === 'leaf') { g.fillStyle = hsl(96, 52, 38); blob(tx + 12, ty + 8, 16, 7, -0.5); }
      if (G.kind === 'frost') {
        g.fillStyle = hsl(190, 60, 88);
        for (let i = 0; i < 5; i++) disc(cx + jit(0, 24), 60 + Math.random() * 34, 2 + Math.random() * 2);
      }
    } else if (G.hat === 'cap') {                  // a toadstool cap, spots and all
      dome(cx, 96, 44, 34);
      g.fillStyle = hsl(40, 26, 94);
      for (let i = 0; i < 6; i++) disc(cx + jit(0, 32), 96 - Math.random() * 26, 3 + Math.random() * 4);
      g.fillStyle = hsl(40, 20, night ? 80 : 88); g.fillRect(cx - 44, 93, 88, 6);
    } else if (G.hat === 'weld') {                 // leather cap, brass goggles pushed up
      dome(cx, 94, 24, 20); g.fillRect(cx - 24, 90, 48, 8);
      g.fillStyle = hsl(40, 70, 50); disc(cx - 11, 84, 9); disc(cx + 11, 84, 9);
      g.fillStyle = hsl(190, 45, 70); disc(cx - 11, 84, 5); disc(cx + 11, 84, 5);
    } else if (G.hat === 'helm') {                 // pit helmet with the lamp lit
      dome(cx, 94, 26, 22); g.fillRect(cx - 27, 90, 54, 7);
      g.fillStyle = hsl(50, 90, 62); disc(cx, 78, 8);
      g.fillStyle = hsl(52, 95, 84); disc(cx, 78, 4);
    } else if (G.hat === 'wide') {                 // wide floppy brim, a few stars
      const tx = cx + jit(0, 22), ty = jit(26, 8);
      g.beginPath();
      g.moveTo(cx - 46, 94);
      g.quadraticCurveTo(cx - 14, 48, tx, ty);
      g.quadraticCurveTo(cx + 18, 52, cx + 46, 94);
      g.quadraticCurveTo(cx, 106, cx - 46, 94);
      g.closePath(); g.fill();
      g.fillStyle = hsl(48, 85, 72);
      for (let i = 0; i < 5; i++) disc(cx + jit(0, 30), 52 + Math.random() * 34, 2 + Math.random() * 2.5);
    } else {                                       // the baker's toque
      g.fillStyle = hsl(40, 18, night ? 86 : 94);
      disc(cx - 14, 76, 14); disc(cx + 14, 76, 14); disc(cx, 68, 16);
      g.fillRect(cx - 26, 78, 52, 18);
    }

    const img = new Image();
    img.onload = () => intake(img, G.kind + ' gnome');
    img.src = c.toDataURL('image/png');
  }

  // ── wiring ───────────────────────────────────────────────────────────────
  fileIn.addEventListener('change', () => loadImage(fileIn.files[0]));
  ['dragenter', 'dragover'].forEach(ev => hopper.addEventListener(ev, e => { e.preventDefault(); hopper.classList.add('over'); }));
  ['dragleave', 'drop'].forEach(ev => hopper.addEventListener(ev, e => { e.preventDefault(); hopper.classList.remove('over'); }));
  hopper.addEventListener('drop', e => { const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]; if (f) loadImage(f); });
  const gz = document.getElementById('gz-forge');
  gz.addEventListener('dragover', e => e.preventDefault());
  gz.addEventListener('drop', e => { e.preventDefault(); const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]; if (f) loadImage(f); });
  document.addEventListener('paste', e => {
    const items = e.clipboardData && e.clipboardData.items; if (!items) return;
    for (const it of items) if (it.type === 'image/png' || it.type === 'image/jpeg') { loadImage(it.getAsFile()); break; }
  });
  goBtn.addEventListener('click', pressForge);
  sampleBtn.addEventListener('click', sample);
  ejectBtn.addEventListener('click', eject);
  saveBtn.addEventListener('click', savePng);
  document.querySelectorAll('[data-detail]').forEach(b => {
    b.addEventListener('click', () => setDetail(b.dataset.detail));
    b.setAttribute('aria-pressed', String(+b.dataset.detail === detail));
  });

  // SIZE slider: live while dragging, double-click resets to ×1
  if (sizeIn) {
    sizeIn.addEventListener('input', () => setSize(+sizeIn.value / 100, true));
    sizeIn.addEventListener('change', () => { setSize(+sizeIn.value / 100); setStatus('size ×' + (+size.toFixed(2))); });
    sizeIn.addEventListener('dblclick', () => setSize(1));
  }
  markSize();

  // warp bench: sliders live-update, double-click a slider to flatten just it
  document.querySelectorAll('[data-warp]').forEach(el => {
    el.addEventListener('input', () => setWarp(el.dataset.warp, +el.value / 100, true));
    el.addEventListener('change', () => setWarp(el.dataset.warp, +el.value / 100));
    el.addEventListener('dblclick', () => setWarp(el.dataset.warp, 0));
  });
  // the nameplate types straight through to the creature
  nameEl.addEventListener('input', () => rename(nameEl.value, true));
  nameEl.addEventListener('blur', () => rename(nameEl.value));
  nameEl.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); nameEl.blur(); }
    else if (e.key === 'Escape') { e.preventDefault(); rename(''); nameEl.blur(); }
  });
  const rollBtn = $('name-roll');
  if (rollBtn) rollBtn.addEventListener('click', rollName);

  const warpReset = $('warp-reset');
  if (warpReset) warpReset.addEventListener('click', () => resetWarp(false));
  markWarp();

  /* ── the two under the big button ─────────────────────────────────────
     EJECT empties the hopper. RESET goes further: everything the machine has
     been told since it was switched on — the specimen, any needle dragged off
     what the picture said, the warp bench, how fine it draws and how big the
     next one walks off — back to how it came out of the crate. The batch
     counter is NOT reset: it counts what this machine has made, which is a
     fact about it rather than a setting on it.

     SHAKE is here rather than down in the warp row because it is the opposite
     of the button beside it, and the two read better as a pair than either
     does alone. The warp row keeps its own FLAT, which is the smaller move. */
  const resetBtn = $('forge-reset'), shakeBtn = $('forge-shake');
  if (resetBtn) resetBtn.addEventListener('click', () => {
    eject();
    resetWarp(false);
    setDetail(40);
    setSize(1, true);
    setStatus('machine reset');
  });
  if (shakeBtn) shakeBtn.addEventListener('click', () => resetWarp(true));

  // the three gauges are grabbable: drag the needle, double-click to re-read
  function dialFromEvent(el, e) {
    const svg = el.querySelector('svg'), r = svg.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width * 80, y = (e.clientY - r.top) / r.height * 48;
    return clamp((Math.atan2(x - 40, 44 - y) * 180 / Math.PI + 82) / 164, 0, 1);
  }
  DIALS.forEach(n => {
    const el = gaugeEl(n);
    if (!el) return;
    el.setAttribute('role', 'slider');
    el.setAttribute('tabindex', '0');
    el.setAttribute('aria-label', n);
    let drag = false;
    el.addEventListener('pointerdown', e => {
      if (!analysis) { reject('no specimen'); return; }
      drag = true;
      try { el.setPointerCapture(e.pointerId); } catch (err) {}
      setDial(n, dialFromEvent(el, e)); e.preventDefault();
    });
    el.addEventListener('pointermove', e => { if (drag) setDial(n, dialFromEvent(el, e), true); });
    const up = e => { if (!drag) return; drag = false; try { el.releasePointerCapture(e.pointerId); } catch (err) {} };
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    el.addEventListener('dblclick', () => clearDial(n));
    el.addEventListener('keydown', e => {
      if (!analysis) return;
      const step = e.shiftKey ? 0.1 : 0.02, v = dialValues()[n] / DIAL_MAX[n];
      if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { setDial(n, v - step); e.preventDefault(); }
      else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { setDial(n, v + step); e.preventDefault(); }
      else if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') { clearDial(n); e.preventDefault(); }
    });
  });
  const autoBtn = $('forge-auto');
  if (autoBtn) autoBtn.addEventListener('click', () => clearDial(null));
  // the bin: drag a critter off the bench and drop it in here (or press it to
  // send the whole lot in, one after another)
  const binEl = $('forge-bin'), binnedEl = $('forge-binned');
  if (binEl && window.Critters) {
    let binned = 0;
    Critters.zone(binEl, {
      on: name => {
        binned++;
        binnedEl.textContent = (binned === 1 ? 'burnt 1 · ' : 'burnt ' + binned + ' · ') + (name || 'unnamed').toLowerCase();
        binEl.classList.add('used');
        // the firebox flares up for a second. The class is taken off again so
        // the next one flares too — .used only ever goes on once.
        binEl.classList.add('burning');
        clearTimeout(binEl._burn);
        binEl._burn = setTimeout(() => binEl.classList.remove('burning'), 1000);
      }
    });
    const empty = () => {
      if (!Critters.count()) { setStatus('the bench is empty'); return; }
      Critters.shoo(binEl);
    };
    binEl.addEventListener('click', empty);
    binEl.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); empty(); } });
  }
  refreshDials();

  // exposed for other gizmos (and for poking at it from the console)
  function buildFrom(an, n, det) {
    return build(an, mulberry32((an.seed ^ Math.imul((n | 0) + 1, 0x9E3779B9)) >>> 0), det || detail);
  }
  const draw = gen => drawRows(gen, gen.GH);

  return { loadImage, forge: pressForge, eject, sample, analyze, buildFrom, draw, sprite, setDetail, setWarp, resetWarp, setDial, clearDial, setSize, cutout, DETAILS, WARPS,
    get analysis() { return analysis; }, get last() { return last; }, get detail() { return detail; }, get warp() { return warp; }, get dials() { return dialValues(); }, get size() { return size; } };
})();
