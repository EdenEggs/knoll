/* ─── TEST-PALETTE ────────────────────────────────────────────────────────
   Refutes press/palette.js in Node, no browser: the module is loaded through
   lib/browser-module.js against a bare `window`, and every claim its header
   makes is put to a number.

       node lab2/test/press/tools/test-palette.js          (from site/)

   WHAT IS CHECKED, and where each bound comes from:
   - The matrices: white → L 1, C 0 and black → L 0 within 1e-6 (the header
     says the M1 rows miss 1 by ~1e-8); sRGB red → OKLab L 0.6280 a 0.2249
     b 0.1258 within 0.002, Ottosson's own check values rounded to four
     places (https://bottosson.github.io/posts/oklab/); green and blue the
     same way, since a transposed matrix would pass red alone.
   - The round trip: fromOklch(toOklch(hex)) for 500 hexes drawn from
     rng(5) must land within 1/255 on every channel — the header claims it
     is exact, and the test reports the worst it saw.
   - contrast: black on white is 21 (the definition's own extreme, ±1e-9
     for the float), it is symmetric, and one lighter colour against a
     darker one is over 1.
   - clampL: (a) by construction — clampL(hex, lo, hi) must equal
     fromOklch(clamp(L), C, h) for every colour, so the hue is the input's
     hue exactly before the hex rounding; (b) after the rounding, for
     colours of chroma ≥ CLAMP_C on the band CLAMP_BAND, the hue of the hex
     that comes back is within 0.5° of the input's. The chroma floor is
     measured, not derived: one 8-bit step in a channel moves an OKLCH hue
     by up to 0.62° at C 0.15 (0.52° at C 0.2), and the drift clampL's
     rounding causes across the band is 0.55–0.57° at C ≥ 0.15 — the hex
     grid itself is coarser than half a degree there — and 0.40° worst,
     0.013° mean, at C ≥ 0.2 (100 000 colours from rng(11), 2026-09-07; the
     numbers are in the CHANGELOG). A colour already inside the band comes
     back unchanged.
   - mix(a, a, t) is a, mix(a, b, 0) is a and mix(a, b, 1) is b; halfway
     from red to the grey of red's own lightness is red's hue at half its
     chroma and the same L (±0.006 C, ±1.5° h, ±0.01 L — the hex rounding),
     which is the straight line an OKLab mix promises and an sRGB one does
     not. (Not "red and cyan make grey": cyan is red's sRGB complement, and
     their OKLab midpoint is a tan.)
   - hueDist(350, 10) is 20, symmetric, never over 180.
   - rng(seed) reproduces its sequence, two seeds differ, every draw is in
     [0, 1); a string seed works.
   - sample and kmeans are the tracer's VERBATIM: the live lab2/tracer.js is
     read as text, its sampleOpaque and kMeansPalette lifted out by name and
     run with a Math whose random is the same seeded rng, and the centroids
     must be identical arrays for three seeds and three K — the Node-side
     half of the golden diff perf/golden-tracer.js makes in the browser.
   - quantize with rng(seed) gives the same list twice in this process and
     the same list from a second Node process (spawned with --child); the
     weights sum to 1 within 1e-9; the list is sorted by weight; every entry
     has a #rrggbb hex and r,g,b that agree with it; transparent pixels
     (alpha under ALPHA_T 16) are not counted.
   - ignoreEdges: a 100 × 100 picture, red inside, a blue frame exactly 4 px
     wide (4 % of 100 — the border the option drops, to the pixel). With
     ignoreEdges, k 2 and minWeight 0.01, no cluster may be blue and the
     weights must still sum to 1; without it, blue must be there at ~15 %
     (1536 of 10 000 pixels), which is what makes the first half mean
     something.
   - describe: {hex, weight, L, C, h} and nothing else, L/C/h agreeing with
     toOklch.
   - THE VERIFIER'S ADDITIONS (2026-09-07, the adversarial pass on Phase 1):
     the six bench tokens of lab.css's :root (--paper --ink --pink --blue
     --green --amber, read from the sheet at test time) through a SECOND
     road — sRGB → XYZ by the D65 matrix of IEC 61966-2-1 (Lindbloom's
     seven-digit form) → LMS by the XYZ→LMS matrix Ottosson's post gives →
     cube root → OKLab by M2 — must agree with palette.js's direct sRGB→LMS
     road within 1e-3 on L, a and b, so a digit wrong or a row swapped in
     either matrix shows. The two roads' own gap, measured, is 8.4e-5
     (--paper's b): 1e-3 is twelve times the noise. --pink #c93b82 must
     read h 350–5° and C 0.19 ± 0.01. fromOklch(0.5, 0.4, 140) — a chroma
     no sRGB colour has; the cube's widest is magenta's 0.322, measured over
     its six faces — must be a valid hex whose hue is within 3° and whose L
     is within 0.03 of the ask. contrast(#777777, #ffffff) within 0.02 of
     4.48. A 1 × 1 picture is one entry of weight 1; a 1 × 1 transparent
     one is []; a 2 × 2 of four colours asked for 50 clusters gives four and
     does not throw; k under 1 floors to one, as the tracer's
     K = max(1, min(K, n)) does.

   THE SYNTHETIC PICTURE (mkPicture): 160 × 120, five colour blobs on a
   ground, every pixel jittered ±6 per channel from rng(seed) so k-means has
   real work, and a 20 × 20 fully transparent square plus a 20 × 20 square
   at alpha 8 (under ALPHA_T) that must not be counted. Small enough to run
   in a blink, varied enough that a wrong stride or an off-by-one border
   shows as a different palette.

   Exit 1 on the first failed group's report; every check prints. */
'use strict';
const path = require('path');
const fs = require('fs');
const { spawnSync } = require('child_process');
const load = require('./lib/browser-module');

const HERE = path.resolve(__dirname);
const PALETTE = path.join(HERE, '..', 'palette.js');
const LIVE_TRACER = path.join(HERE, '..', '..', '..', 'tracer.js');   // lab2/tracer.js — the live one
const LAB_CSS = path.join(HERE, '..', '..', 'lab.css');                 // lab2/test/lab.css — the bench's token sheet
const CLAMP_C = 0.2, CLAMP_BAND = [0.3, 0.7];

const { Palette: P } = load(PALETTE);

// ── a picture the tests agree on ────────────────────────────────────────
function mkPicture(seed, w = 160, h = 120) {
  const r = P.rng(seed);
  const data = new Uint8ClampedArray(w * h * 4);
  const blobs = [[30, 30, 18, [220, 40, 40]], [110, 40, 22, [40, 90, 220]], [60, 85, 20, [40, 180, 70]], [130, 95, 16, [240, 200, 30]], [25, 100, 10, [20, 20, 20]]];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let c = [235, 228, 210];
    for (const [bx, by, rad, col] of blobs) if ((x - bx) * (x - bx) + (y - by) * (y - by) <= rad * rad) c = col;
    const o = (y * w + x) * 4;
    for (let i = 0; i < 3; i++) data[o + i] = Math.max(0, Math.min(255, Math.round(c[i] + (r() * 12 - 6))));
    data[o + 3] = 255;
    if (x >= 140 && y >= 100) data[o + 3] = 0;         // fully transparent corner
    if (x < 20 && y < 20) data[o + 3] = 8;              // under ALPHA_T: not a pixel
  }
  return { data, width: w, height: h };
}
function framed(w = 100, h = 100, border = 4) {           // red inside, a blue frame `border` px wide
  const data = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const o = (y * w + x) * 4, edge = x < border || y < border || x >= w - border || y >= h - border;
    data[o] = edge ? 20 : 220; data[o + 1] = edge ? 40 : 30; data[o + 2] = edge ? 230 : 30; data[o + 3] = 255;
  }
  return { data, width: w, height: h };
}
const hexOf = v => '#' + (v & 0xffffff).toString(16).padStart(6, '0');
const randomHexes = (seed, n) => { const g = P.rng(seed); return Array.from({ length: n }, () => hexOf((g() * 16777216) | 0)); };

// ── the child half: print quantize for the parent to compare ────────────
if (process.argv[2] === '--child') {
  const seed = +process.argv[3];
  const out = P.quantize(mkPicture(seed), 6, { rng: P.rng(seed) });
  process.stdout.write(JSON.stringify(out));
  process.exit(0);
}

// ── the harness ──────────────────────────────────────────────────────────
let pass = 0, fail = 0;
const check = (name, ok, info) => { (ok ? pass++ : fail++); console.log((ok ? 'PASS ' : 'FAIL ') + name + (info ? ' — ' + info : '')); };
const near = (a, b, eps) => Math.abs(a - b) <= eps;

// the matrices
{
  const w = P.toOklch('#ffffff'), k = P.toOklch('#000000');
  check('white is L 1, C 0', near(w.L, 1, 1e-6) && w.C < 1e-6 && w.h === 0, `L ${w.L} C ${w.C} h ${w.h}`);
  check('black is L 0', near(k.L, 0, 1e-6) && k.C < 1e-6, `L ${k.L} C ${k.C}`);
  const red = P.toOklab('#ff0000'), green = P.toOklab('#00ff00'), blue = P.toOklab('#0000ff');
  check("sRGB red is Ottosson's L 0.6280 a 0.2249 b 0.1258 (±0.002)", near(red.L, 0.6280, 0.002) && near(red.a, 0.2249, 0.002) && near(red.b, 0.1258, 0.002), `${red.L.toFixed(4)} ${red.a.toFixed(4)} ${red.b.toFixed(4)}`);
  check("sRGB green is Ottosson's L 0.8664 a -0.2339 b 0.1795 (±0.002)", near(green.L, 0.8664, 0.002) && near(green.a, -0.2339, 0.002) && near(green.b, 0.1795, 0.002), `${green.L.toFixed(4)} ${green.a.toFixed(4)} ${green.b.toFixed(4)}`);
  check("sRGB blue is Ottosson's L 0.4520 a -0.0325 b -0.3115 (±0.002)", near(blue.L, 0.4520, 0.002) && near(blue.a, -0.0325, 0.002) && near(blue.b, -0.3115, 0.002), `${blue.L.toFixed(4)} ${blue.a.toFixed(4)} ${blue.b.toFixed(4)}`);
  const r = P.toOklch('#ff0000');
  check('red has a hue near 29° and chroma near 0.258', near(r.h, 29.23, 0.5) && near(r.C, 0.2577, 0.002), `h ${r.h.toFixed(2)} C ${r.C.toFixed(4)}`);
}

// the round trip
{
  let worst = 0, misses = 0;
  for (const hex of randomHexes(5, 500)) {
    const c = P.toOklch(hex), back = P.fromOklch(c.L, c.C, c.h);
    const a = parseInt(hex.slice(1), 16), b = parseInt(back.slice(1), 16);
    const d = Math.max(Math.abs((a >> 16 & 255) - (b >> 16 & 255)), Math.abs((a >> 8 & 255) - (b >> 8 & 255)), Math.abs((a & 255) - (b & 255)));
    if (d > worst) worst = d;
    if (back !== hex) misses++;
  }
  check('fromOklch(toOklch(hex)) round-trips 500 seeded hexes within 1/255', worst <= 1, `worst channel step ${worst}, ${misses} not exact`);
  check('a colour out of gamut comes back in gamut, same hue', (() => { const c = P.toOklch(P.fromOklch(0.9, 0.4, 30)); return c.C < 0.4 && near(c.h, 30, 1.5); })(), P.fromOklch(0.9, 0.4, 30));
  check('fromOklch clamps L and never throws on nonsense', P.fromOklch(2, 0, 0) === '#ffffff' && P.fromOklch(-1, 0, 0) === '#000000' && /^#[0-9a-f]{6}$/.test(P.fromOklch(NaN, NaN, NaN)));
}

// contrast
{
  const bw = P.contrast('#000000', '#ffffff');
  check('contrast(black, white) is 21', near(bw, 21, 1e-9), String(bw));
  const pairs = randomHexes(21, 40);
  let sym = true, over = true;
  for (let i = 0; i < pairs.length; i += 2) { const a = P.contrast(pairs[i], pairs[i + 1]), b = P.contrast(pairs[i + 1], pairs[i]); if (a !== b) sym = false; if (a < 1) over = false; }
  check('contrast is symmetric and never under 1 over 20 random pairs', sym && over);
  check('contrast(#777777, #ffffff) is 4.48 (WebAIM\'s number)', near(P.contrast('#777777', '#ffffff'), 4.48, 0.005), P.contrast('#777777', '#ffffff').toFixed(3));
}

// clampL
{
  const hexes = randomHexes(3, 500);
  let byConstruction = true, worst = 0, worstAt = '', n = 0, unchanged = true;
  for (const hex of hexes) {
    const c = P.toOklch(hex);
    const L = Math.min(Math.max(c.L, CLAMP_BAND[0]), CLAMP_BAND[1]);
    const out = P.clampL(hex, CLAMP_BAND[0], CLAMP_BAND[1]);
    if (out !== P.fromOklch(L, c.C, c.h)) byConstruction = false;
    if (c.L >= CLAMP_BAND[0] && c.L <= CLAMP_BAND[1] && out !== hex) unchanged = false;
    if (c.C < CLAMP_C) continue;
    n++;
    const d = P.hueDist(c.h, P.toOklch(out).h);
    if (d > worst) { worst = d; worstAt = hex + '→' + out; }
  }
  check('clampL is fromOklch(clamp(L), C, h) for every colour (hue kept by construction)', byConstruction);
  check('clampL leaves a colour inside the band alone', unchanged);
  check(`clampL keeps h within 0.5° after the hex rounding (C ≥ ${CLAMP_C}, band ${CLAMP_BAND.join('–')})`, n > 50 && worst <= 0.5, `${n} colours, worst ${worst.toFixed(3)}° at ${worstAt}`);
  const l = P.toOklch(P.clampL('#102030', 0.5, 0.9)), h = P.toOklch(P.clampL('#f0e0d0', 0.1, 0.4));
  check('clampL moves L into the band', l.L >= 0.5 - 0.01 && h.L <= 0.4 + 0.01, `${l.L.toFixed(3)} ${h.L.toFixed(3)}`);
}

// mix and hueDist
{
  const hexes = randomHexes(8, 20);
  let same = true, ends = true;
  for (let i = 0; i < hexes.length; i += 2) {
    if (P.mix(hexes[i], hexes[i], 0.37) !== hexes[i]) same = false;
    if (P.mix(hexes[i], hexes[i + 1], 0) !== hexes[i] || P.mix(hexes[i], hexes[i + 1], 1) !== hexes[i + 1]) ends = false;
  }
  check('mix(a, a, t) is a', same);
  check('mix(a, b, 0) is a and mix(a, b, 1) is b', ends);
  // an OKLab mix is a straight line in (L, a, b): halfway from red to the
  // grey of red's own lightness is red's hue at half red's chroma, same L —
  // an sRGB mix would land lighter and duller than that
  const red = P.toOklch('#ff0000'), grey = P.fromOklch(red.L, 0, 0), mid = P.toOklch(P.mix('#ff0000', grey, 0.5));
  check('halfway from red to its own grey is red\'s hue at half its chroma', near(mid.C, red.C / 2, 0.006) && P.hueDist(mid.h, red.h) < 1.5 && near(mid.L, red.L, 0.01), `${P.mix('#ff0000', grey, 0.5)} L ${mid.L.toFixed(3)} C ${mid.C.toFixed(3)} h ${mid.h.toFixed(1)} (red C ${red.C.toFixed(3)} h ${red.h.toFixed(1)})`);
  check('hueDist(350, 10) is 20', P.hueDist(350, 10) === 20 && P.hueDist(10, 350) === 20);
  check('hueDist is 0–180', P.hueDist(0, 180) === 180 && P.hueDist(90, 271) === 179 && P.hueDist(-10, 370) === 20 && P.hueDist(5, 5) === 0);
}

// rng
{
  const a = P.rng(42), b = P.rng(42), c = P.rng(43);
  const sa = Array.from({ length: 10 }, () => a()), sb = Array.from({ length: 10 }, () => b()), sc = Array.from({ length: 10 }, () => c());
  check('rng(seed) reproduces its sequence', JSON.stringify(sa) === JSON.stringify(sb));
  check('two seeds differ', JSON.stringify(sa) !== JSON.stringify(sc));
  check('every draw is in [0, 1)', sa.every(v => v >= 0 && v < 1));
  const s1 = P.rng('pixelfort')(), s2 = P.rng('pixelfort')(), s3 = P.rng('neonrun')();
  check('a string seed works and is stable', s1 === s2 && s1 !== s3, `${s1} ${s3}`);
}

// verbatim: the live tracer's own functions, lifted from its source
{
  const src = fs.readFileSync(LIVE_TRACER, 'utf8');
  const cut = (from, to) => src.slice(src.indexOf(from), src.indexOf(to));
  const body = cut('function sampleOpaque', 'function labelPixels');
  let ok = body.includes('kMeansPalette') && body.includes('Math.random');
  let detail = ok ? '' : 'could not find sampleOpaque/kMeansPalette in lab2/tracer.js';
  if (ok) {
    const mk = rand => new Function('ALPHA_T', 'SAMPLE_CAP', 'Math', body + '\nreturn { sampleOpaque, kMeansPalette };')(16, 3000, Object.assign(Object.create(Math), { random: rand }));
    const pic = mkPicture(77);
    const theirs = mk(() => 0).sampleOpaque(pic.data, pic.width, pic.height), ours = P.sample(pic);
    ok = JSON.stringify(theirs) === JSON.stringify(ours);
    detail = `sample ${ours.length} pixels ${ok ? 'identical' : 'DIFFER'}`;
    for (const seed of [1, 2, 3]) for (const K of [2, 6, 12]) {
      const t = mk(P.rng(seed)).kMeansPalette(theirs, K), o = P.kmeans(ours, K, { rng: P.rng(seed) });
      if (JSON.stringify(t) !== JSON.stringify(o)) { ok = false; detail += `; seed ${seed} K ${K} DIFFER`; }
    }
    if (ok) detail += '; 9 seed × K centroid sets identical';
  }
  check("sample and kmeans are the live tracer's sampleOpaque and kMeansPalette, verbatim", ok, detail);
  const t0 = Date.now(); P.kmeans(P.sample(mkPicture(9)), 8, { rng: P.rng(9) });
  check('kmeans on a 3000-pixel sample takes under 100 ms', Date.now() - t0 < 100, (Date.now() - t0) + ' ms');
}

// quantize
{
  const pic = mkPicture(101);
  const a = P.quantize(pic, 6, { rng: P.rng(101) }), b = P.quantize(pic, 6, { rng: P.rng(101) });
  check('quantize with rng(seed) is deterministic across two calls', JSON.stringify(a) === JSON.stringify(b));
  const child = spawnSync(process.execPath, [__filename, '--child', '101'], { encoding: 'utf8' });
  check('quantize with rng(seed) is deterministic across two Node processes', child.status === 0 && child.stdout === JSON.stringify(a), child.status !== 0 ? child.stderr.slice(0, 200) : `${child.stdout.length} bytes agree`);
  const sum = a.reduce((s, e) => s + e.weight, 0);
  check('weights sum to 1', near(sum, 1, 1e-9), sum.toString());
  check('sorted by weight, largest first', a.every((e, i) => i === 0 || a[i - 1].weight >= e.weight));
  check('every entry is {hex, weight, r, g, b} with the hex agreeing', a.every(e => /^#[0-9a-f]{6}$/.test(e.hex) && e.hex === hexOf(e.r << 16 | e.g << 8 | e.b) && Object.keys(e).sort().join() === 'b,g,hex,r,weight'));
  check('six colours asked for, six found on the five-blob picture', a.length === 6, a.map(e => e.hex + ' ' + e.weight.toFixed(3)).join(', '));
  // transparency: a picture whose only opaque pixels are green must be all green, and a fully transparent one empty
  const t = { width: 10, height: 10, data: new Uint8ClampedArray(400) };
  for (let i = 0; i < 100; i++) { t.data[i * 4] = i < 50 ? 255 : 0; t.data[i * 4 + 1] = i < 50 ? 0 : 200; t.data[i * 4 + 3] = i < 50 ? 15 : 255; }
  const q = P.quantize(t, 3, { rng: P.rng(1) });
  check('pixels under ALPHA_T are not counted (red at alpha 15 vanishes)', q.length === 1 && q[0].hex === '#00c800' && q[0].weight === 1, JSON.stringify(q));
  check('a fully transparent picture quantises to []', P.quantize({ width: 4, height: 4, data: new Uint8ClampedArray(64) }, 4).length === 0);
  const m = P.quantize(pic, 6, { rng: P.rng(101), minWeight: 0.05 });
  check('minWeight drops the small clusters and the rest still sum to 1', m.length < a.length && m.every(e => e.weight >= 0.05) && near(m.reduce((s, e) => s + e.weight, 0), 1, 1e-9), `${a.length} → ${m.length}`);
  const d = P.describe(a);
  check('describe gives {hex, weight, L, C, h} agreeing with toOklch', d.every((e, i) => Object.keys(e).sort().join() === 'C,L,h,hex,weight' && e.hex === a[i].hex && e.weight === a[i].weight && e.L === P.toOklch(e.hex).L && e.h === P.toOklch(e.hex).h));
  check('quantize without opts.rng still runs (Math.random)', P.quantize(pic, 4).length === 4);
}

// ignoreEdges
{
  const pic = framed();
  const blueish = e => e.b > e.r;
  const withEdges = P.quantize(pic, 2, { rng: P.rng(7), minWeight: 0.01 });
  const without = P.quantize(pic, 2, { rng: P.rng(7), minWeight: 0.01, ignoreEdges: true });
  const blue = withEdges.find(blueish);
  check('without ignoreEdges the 4 % blue frame is a cluster at ~15 %', !!blue && near(blue.weight, 0.1536, 0.01), withEdges.map(e => e.hex + ' ' + e.weight.toFixed(4)).join(', '));
  check('with ignoreEdges the frame vanishes (k 2, minWeight 0.01)', without.length >= 1 && !without.some(blueish), without.map(e => e.hex + ' ' + e.weight.toFixed(4)).join(', '));
  check('and the weights still sum to 1', near(without.reduce((s, e) => s + e.weight, 0), 1, 1e-9));
  const s = P.sample(pic, undefined, { ignoreEdges: true });
  check('sample with ignoreEdges reads exactly the inner 92 × 92', s.length >= 8464 / 2 && s.every(px => px[0] === 220), `${s.length} pixels (8464 inside, stride 2 → 4232)`);
}

// the verifier's additions: the bench tokens by a second road, an
// out-of-gamut ask, the smallest pictures (the header says which and why)
{
  const css = fs.readFileSync(LAB_CSS, 'utf8');
  const root = css.slice(css.indexOf(':root{'), css.indexOf('}', css.indexOf(':root{')));
  const lin = v => v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  const ref = hex => {                                 // sRGB → XYZ (D65) → LMS → OKLab, none of it palette.js's
    const v = parseInt(hex.slice(1), 16), r = lin((v >> 16 & 255) / 255), g = lin((v >> 8 & 255) / 255), b = lin((v & 255) / 255);
    const X = 0.4124564 * r + 0.3575761 * g + 0.1804375 * b;
    const Y = 0.2126729 * r + 0.7151522 * g + 0.0721750 * b;
    const Z = 0.0193339 * r + 0.1191920 * g + 0.9503041 * b;
    const l = Math.cbrt(0.8189330101 * X + 0.3618667424 * Y - 0.1288597137 * Z);
    const m = Math.cbrt(0.0329845436 * X + 0.9293118715 * Y + 0.0361456387 * Z);
    const s = Math.cbrt(0.0482003018 * X + 0.2643662691 * Y + 0.6338517070 * Z);
    return { L: 0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s,
             a: 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,
             b: 0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s };
  };
  const tokens = {};
  for (const name of ['--paper', '--ink', '--pink', '--blue', '--green', '--amber']) tokens[name] = (new RegExp(name + ':(#[0-9a-f]{6})', 'i').exec(root) || [])[1];
  let worst = 0, worstAt = '';
  for (const [name, hex] of Object.entries(tokens)) {
    if (!hex) continue;
    const o = P.toOklab(hex), r = ref(hex);
    for (const [k, d] of [['L', Math.abs(o.L - r.L)], ['a', Math.abs(o.a - r.a)], ['b', Math.abs(o.b - r.b)]]) if (d > worst) { worst = d; worstAt = name + ' ' + hex + ' ' + k; }
  }
  check('the six bench tokens are in lab.css :root', Object.values(tokens).every(Boolean), Object.entries(tokens).map(([n, h]) => n + ' ' + h).join(', '));
  check('the six agree with an sRGB→XYZ→LMS reference within 1e-3 on L, a, b', Object.values(tokens).every(Boolean) && worst < 1e-3, 'worst ' + worst.toExponential(2) + ' at ' + worstAt);
  const pink = tokens['--pink'] ? P.toOklch(tokens['--pink']) : { L: NaN, C: NaN, h: NaN };
  check('--pink reads h 350–5° and C 0.19 ± 0.01', (pink.h >= 350 || pink.h <= 5) && near(pink.C, 0.19, 0.01), tokens['--pink'] + ' L ' + pink.L.toFixed(3) + ' C ' + pink.C.toFixed(4) + ' h ' + pink.h.toFixed(2));
  const og = P.fromOklch(0.5, 0.4, 140), ogOk = /^#[0-9a-f]{6}$/.test(og), ogc = ogOk ? P.toOklch(og) : { L: NaN, C: NaN, h: NaN };
  check('fromOklch(0.5, 0.4, 140) is a valid hex, hue within 3°, L within 0.03', ogOk && P.hueDist(ogc.h, 140) <= 3 && near(ogc.L, 0.5, 0.03), og + ' L ' + ogc.L.toFixed(4) + ' C ' + ogc.C.toFixed(4) + ' h ' + ogc.h.toFixed(2));
  check('contrast(#777777, #ffffff) is 4.48 ± 0.02', near(P.contrast('#777777', '#ffffff'), 4.48, 0.02), P.contrast('#777777', '#ffffff').toFixed(4));
  const px = (r, g, b, a) => ({ width: 1, height: 1, data: new Uint8ClampedArray([r, g, b, a]) });
  const one = P.quantize(px(201, 59, 130, 255), 1, { rng: P.rng(1) }), oneK8 = P.quantize(px(201, 59, 130, 255), 8, { rng: P.rng(1), ignoreEdges: true });
  const single = q => q.length === 1 && q[0].weight === 1 && q[0].hex === '#c93b82';
  check('a 1 × 1 picture is one entry of weight 1 (k 1; k 8 with ignoreEdges, a 1-px picture having no border to drop)', single(one) && single(oneK8), JSON.stringify(one));
  check('a 1 × 1 transparent picture is [] (alpha 0, and alpha 15 under ALPHA_T); alpha 16 counts', P.quantize(px(201, 59, 130, 0), 3).length === 0 && P.quantize(px(201, 59, 130, 15), 3).length === 0 && P.quantize(px(201, 59, 130, 16), 3).length === 1);
  const four = { width: 2, height: 2, data: new Uint8ClampedArray([255, 0, 0, 255, 0, 255, 0, 255, 0, 0, 255, 255, 255, 255, 255, 255]) };
  let threw = null, q50 = [];
  try { q50 = P.quantize(four, 50, { rng: P.rng(2) }); } catch (e) { threw = e; }
  check('k larger than the sample count does not throw: 2 × 2 of four colours, k 50 → the four at 0.25 each', !threw && q50.length === 4 && q50.every(e => e.weight === 0.25), threw ? String(threw) : q50.map(e => e.hex).sort().join(' '));
  let floors = true;
  for (const k of [0, -3, NaN, undefined]) { try { if (P.quantize(four, k, { rng: P.rng(2) }).length !== 1) floors = false; } catch (e) { floors = false; } }
  check("k under 1 (0, −3, NaN, undefined) floors to one cluster, as the tracer's K = max(1, min(K, n)) does", floors);
}

console.log(`\n${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);
