/* ─── TEST-THEME ──────────────────────────────────────────────────────────
   Refutes press/theme.js in Node, no browser (plan §6 step 6): palette.js,
   fonts.js and theme.js are loaded through lib/browser-module.js against
   one bare `window`; the three fixtures are decoded from their PNGs with
   lib/png.js and taken through lib/fixture-theme.js — the same pipeline
   perf/shot-theme.js screenshots — and then two hundred seeded palettes,
   the degenerate ones on purpose, go through Theme.derive straight.

       node lab2/test/press/tools/test-theme.js          (from site/)
       node lab2/test/press/tools/test-theme.js --child  (prints the css of each fixture; the parent spawns this)

   WHAT IS CHECKED on every theme (fixtures and random alike), and where
   each bound is from — the floors are the task's list, written here as
   this file's OWN numbers so a drift in theme.js's constants fails rather
   than moves the bar (Theme.FLOORS is also checked to agree):
   - ink/paper ≥ 7.0; ink-2, ink-3 on paper ≥ 4.5; mute ≥ 3.0 and mute-2
     ≥ 2.0 on paper (line has no floor); accent (--pink) on paper ≥ 3.0 and
     on ink ≥ 1.5; blue, green, amber on paper ≥ 3.0; pink-2 on paper ≥ 2.5;
     the four sticky pads under the ink ≥ 4.5; sk-highlight against
     sk-shadow ≥ 1.5; sk-halo is '1' exactly when sk-primary on bench-bg is
     under 2.2, else '0'.
   - Every token in CONTRACTS §2's list is present, in the plan's order, no
     value NaN/undefined/null/empty; every colour token is /^#[0-9a-f]{6}$/;
     --bench-dot is rgba(r,g,b,.06) of the ink's rgb and --drop-rgb is that
     rgb; the three font tokens are Fonts.stacks(id)'s; css is exactly
     ':root{' + name:value; in that order + '}' on ONE line; sk-primary is
     the accent (paletteSize 0), sk-secondary is --blue, sk-ink the ink,
     sk-paper #ffffff on a light page and the paper on a dark one.
   - dark is a boolean and equals (weight-averaged palette L < 0.55) — the
     plan's own rule, recomputed here from the input.
   - JSON.stringify(theme) carries exactly dark, tokens, fonts, css (the
     `why` is non-enumerable); explain() gives ≥ 3 strings and the first
     names the mode; tokensOf() equals theme.tokens.
   THE FIXTURES: mosslight must come back light and neonrun dark (their
   expected.json says so); pixelfort's expected.json is silent on dark, so
   it is REPORTED, not asserted. Each expected.json's `harmony` word is
   REPORTED against the mood the rule reads and never asserted — the mood is
   CONTRACTS §2's arithmetic over stats.saturation and the accent's chroma,
   and a fixture's word is a wish; neonrun's says loud where the pipeline
   reads calm, and the print keeps that disagreement in the open rather than
   in the CHANGELOG alone (added 2026-09-07 by the Phase 2 verifier).
   css must be byte-identical across two
   derivations in this process and against a second Node process (spawned
   with --child), and the pairing passed is each fixture's expected one.
   paletteSize 4/8/16 on each fixture: --sk-primary unchanged (it anchors
   the ramp), every hued --sk-* hue within 1° of a ramp step, and the floors
   still hold — asserted through the same checker.
   THE 200: seeds 1000–1199, eight shapes in rotation — a random 2–8 entry
   palette; ONE colour; all greys (C 0); all near-black (L ≤ 0.08); all
   near-white (L ≥ 0.92); two colours at L 0.5; six colours at C 0.4 (the
   most sRGB holds, blue's); a random palette with random paletteSize, mood
   and pairing (including an unknown pairing and a bad paletteSize, which
   must fall back, not throw). derive() must never throw, and every theme
   passes the checker above. Also: an empty palette, a palette of one entry
   with no weight, a null input.
   THE DECODER (lib/png.js) is proved here too, since every fixture number
   above rests on it: a 37 × 23 image of seeded noise (rng 3, the odd size
   so no stride is a round number) is written by a test-side writer that
   FORCES one filter type on every row, for each of the five filters and
   each of the four colour types (0, 2, 4, 6 — twenty files), and must
   decode back to the very bytes; then the same image through
   make-fixtures.js's own adaptive encodePNG (RGB and RGBA) — the writer
   the fixtures came from — and each fixture's hero, whose per-filter row
   counts are printed. A flipped IDAT byte must fail the CRC; 16-bit,
   PLTE, tRNS and interlaced files must be refused by name.
   THE RAMP TOLERANCE is measured, not typed: the hue a hex can hold is
   coarser the greyer it is, so before the ramp checks the test steps every
   channel of 20 000 colours from rng(11) by ±1 and records the worst hue
   swing per chroma band; the tolerance 0.15 / C degrees (never under 1°)
   must cover the measured worst at every band the checks can meet, and
   the table is printed so the header of theme.js can quote it.
   Prints a table of the fixtures' key tokens and writes
   perf/results/theme/summary.json. Exit 1 if any check fails. */
'use strict';
const path = require('path');
const fs = require('fs');
const { spawnSync } = require('child_process');
const zlib = require('zlib');
const fx = require('./lib/fixture-theme');
const png = require('./lib/png');

const HERE = path.resolve(__dirname);
const FIXTURES = path.join(HERE, '..', 'fixtures');
const OUT = path.join(HERE, '..', '..', 'perf', 'results', 'theme');
const NAMES = ['pixelfort', 'mosslight', 'neonrun'];
const FLOOR = { inkPaper: 7.0, ink2Paper: 4.5, mutePaper: 3.0, mute2Paper: 2.0, accentPaper: 3.0, accentInk: 1.5, secondPaper: 3.0, pink2Paper: 2.5, stickyInk: 4.5, hlSh: 1.5, halo: 2.2 };
const DARK_L = 0.55;
const ORDER = [
  '--paper', '--paper-2', '--card', '--bench-bg', '--bench-dot', '--drop-rgb',
  '--ink', '--ink-2', '--ink-3', '--mute', '--mute-2', '--line',
  '--pink', '--pink-2', '--pink-soft', '--blue', '--green', '--amber',
  '--field', '--tint', '--tint-2', '--chip', '--hard-edge',
  '--sticky-a', '--sticky-b', '--sticky-c', '--sticky-d',
  '--gz-handle-bg', '--gz-handle-ink', '--grip', '--serial-ink',
  '--sk-primary', '--sk-secondary', '--sk-ink', '--sk-paper', '--sk-highlight', '--sk-shadow', '--sk-halo',
  '--display', '--body', '--mono'
];
const NOT_HEX = ['--bench-dot', '--drop-rgb', '--sk-halo', '--display', '--body', '--mono'];

const { Palette: P, Fonts: F, Theme: T } = fx.modules();

// ── --child: print each fixture's css, one per line, and leave ────────────
if (process.argv.includes('--child')) {
  for (const n of NAMES) process.stdout.write(fx.themeOf(path.join(FIXTURES, n), { fonts: expected(n).pairing }).theme.css + '\n');
  process.exit(0);
}

function expected(n) { return JSON.parse(fs.readFileSync(path.join(FIXTURES, n, 'expected.json'), 'utf8')); }

const results = [];
let fails = 0;
function check(name, ok, info) {
  ok = !!ok; results.push({ name, ok, info: info == null ? undefined : String(info) });
  if (!ok) fails++;
  console.log((ok ? 'PASS ' : 'FAIL ') + name + (info != null ? ' — ' + info : ''));
}
/* quiet(): the same check, printed only when it fails — for the 200 random
   themes, whose passes would drown the report. Counted like any other. */
function quiet(name, ok, info) {
  ok = !!ok; results.push({ name, ok, info: info == null ? undefined : String(info) });
  if (!ok) { fails++; console.log('FAIL ' + name + (info != null ? ' — ' + info : '')); }
}
const f2 = v => v.toFixed(2);

// ── the checker: every claim, on any theme ───────────────────────────────
function checkTheme(label, theme, input, chk) {
  chk = chk || check;
  const t = theme && theme.tokens;
  if (!t) { chk(label + ': a theme with tokens', false); return; }
  const c = (a, b) => P.contrast(t[a], t[b]);
  const keys = Object.keys(t);
  chk(label + ': tokens are the plan\'s list, in order', keys.length === ORDER.length && keys.every((k, i) => k === ORDER[i]), keys.length + ' tokens');
  let bad = [];
  for (const k of ORDER) {
    const v = t[k];
    if (v == null || v === '' || (typeof v === 'number' && isNaN(v)) || /NaN|undefined|null/.test(String(v))) bad.push(k + '=' + v);
    else if (!NOT_HEX.includes(k) && !/^#[0-9a-f]{6}$/.test(v)) bad.push(k + '=' + v);
  }
  chk(label + ': no token empty/NaN, every colour a 6-digit lowercase hex', bad.length === 0, bad.join(' '));
  const rgb = t['--ink'] && /^#[0-9a-f]{6}$/.test(t['--ink']) ? [1, 3, 5].map(i => parseInt(t['--ink'].slice(i, i + 2), 16)).join(',') : '?';
  chk(label + ': --bench-dot is the ink at .06, --drop-rgb the ink\'s rgb', t['--bench-dot'] === 'rgba(' + rgb + ',.06)' && t['--drop-rgb'] === rgb, t['--bench-dot'] + ' / ' + t['--drop-rgb']);
  chk(label + ': --sk-halo is 0 or 1', t['--sk-halo'] === '0' || t['--sk-halo'] === '1', t['--sk-halo']);
  if (bad.length) return;                                     // the floors below would only repeat the failure
  const floors = [
    ['ink/paper', c('--ink', '--paper'), FLOOR.inkPaper],
    ['ink-2/paper', c('--ink-2', '--paper'), FLOOR.ink2Paper],
    ['ink-3/paper', c('--ink-3', '--paper'), FLOOR.ink2Paper],
    ['mute/paper', c('--mute', '--paper'), FLOOR.mutePaper],
    ['mute-2/paper', c('--mute-2', '--paper'), FLOOR.mute2Paper],
    ['pink/paper', c('--pink', '--paper'), FLOOR.accentPaper],
    ['pink/ink', c('--pink', '--ink'), FLOOR.accentInk],
    ['pink-2/paper', c('--pink-2', '--paper'), FLOOR.pink2Paper],
    ['blue/paper', c('--blue', '--paper'), FLOOR.secondPaper],
    ['green/paper', c('--green', '--paper'), FLOOR.secondPaper],
    ['amber/paper', c('--amber', '--paper'), FLOOR.secondPaper],
    ['sticky-a/ink', c('--sticky-a', '--ink'), FLOOR.stickyInk],
    ['sticky-b/ink', c('--sticky-b', '--ink'), FLOOR.stickyInk],
    ['sticky-c/ink', c('--sticky-c', '--ink'), FLOOR.stickyInk],
    ['sticky-d/ink', c('--sticky-d', '--ink'), FLOOR.stickyInk],
    ['sk-highlight/sk-shadow', c('--sk-highlight', '--sk-shadow'), FLOOR.hlSh]
  ];
  const under = floors.filter(f => !(f[1] >= f[2]));
  chk(label + ': every contrast floor holds', under.length === 0, under.length ? under.map(f => f[0] + ' ' + f2(f[1]) + ' < ' + f[2]).join(', ') : floors.map(f => f[0] + ' ' + f2(f[1])).join(', '));
  const halo = c('--sk-primary', '--bench-bg');
  chk(label + ': --sk-halo follows primary/bench-bg against 2.2', t['--sk-halo'] === (halo < FLOOR.halo ? '1' : '0'), f2(halo) + ' → ' + t['--sk-halo']);
  chk(label + ': dark is a boolean', typeof theme.dark === 'boolean', theme.dark);
  if (input && Array.isArray(input.palette) && input.palette.length) {
    let sw = 0, sl = 0;
    for (const e of input.palette) {
      let L; try { L = P.toOklch(e && e.hex).L; } catch (err) { continue; }          // a bad hex is skipped, as derive() skips it
      const w = Number(e.weight) > 0 ? Number(e.weight) : 0; sw += w; sl += w * L;
    }
    if (sw > 0) chk(label + ': dark equals (weight-averaged L < 0.55)', theme.dark === (sl / sw < DARK_L), 'mean L ' + f2(sl / sw) + ', dark ' + theme.dark);
  }
  const ramped = !!(input && [4, 8, 16].includes(input.paletteSize));
  if (!ramped) {
    chk(label + ': --sk-paper is #ffffff light / paper dark', t['--sk-paper'] === (theme.dark ? t['--paper'] : '#ffffff'), t['--sk-paper']);
    chk(label + ': --sk-ink is the ink, --sk-secondary is --blue', t['--sk-ink'] === t['--ink'] && t['--sk-secondary'] === t['--blue']);
    chk(label + ': --sk-primary is the accent', t['--sk-primary'] === t['--pink'], t['--sk-primary'] + ' / ' + t['--pink']);
  } else {
    /* On a ramp the role keeps its source's L and C and only its hue moves,
       so the pairs agree in L and C within the hex rounding (0.01 covers
       a full 8-bit step in L at any lightness; C the same). */
    const near = (a, b) => { const x = P.toOklch(a), y = P.toOklch(b); return Math.abs(x.L - y.L) <= 0.01 && Math.abs(x.C - y.C) <= 0.01; };
    chk(label + ': ramped --sk-paper/-ink/-secondary/-primary keep their source\'s L and C', near(t['--sk-paper'], theme.dark ? t['--paper'] : '#ffffff') && near(t['--sk-ink'], t['--ink']) && near(t['--sk-secondary'], t['--blue']) && t['--sk-primary'] === t['--pink']);
  }
  const id = theme.fonts && theme.fonts.id;
  let st = null; try { st = F.stacks(id); } catch (e) { st = null; }
  chk(label + ': fonts are Fonts.stacks(' + id + ')', !!st && theme.fonts.display === st.display && theme.fonts.body === st.body && theme.fonts.mono === st.mono
    && t['--display'] === st.display && t['--body'] === st.body && t['--mono'] === st.mono);
  const css = ':root{' + ORDER.map(k => k + ':' + t[k] + ';').join('') + '}';
  chk(label + ': css is :root{name:value;…} in order, one line', theme.css === css && !/[\r\n]/.test(theme.css), theme.css.length + ' bytes');
  chk(label + ': JSON carries exactly dark, tokens, fonts, css', JSON.stringify(Object.keys(JSON.parse(JSON.stringify(theme)))) === '["dark","tokens","fonts","css"]');
  const why = T.explain(theme);
  chk(label + ': explain() gives reasons, the first naming the mode', Array.isArray(why) && why.length >= 3 && why.every(s => typeof s === 'string' && s.length) && /^(light|dark):/.test(why.find(s => /^(light|dark):/.test(s)) || ''), why.length + ' lines');
  chk(label + ': tokensOf() equals theme.tokens', JSON.stringify(T.tokensOf(theme)) === JSON.stringify(theme.tokens));
}

// ── 0 · the module's own floors agree with this file's ───────────────────
check('Theme.FLOORS agrees with the task\'s floors', T.FLOORS.INK_PAPER === FLOOR.inkPaper && T.FLOORS.INK2_PAPER === FLOOR.ink2Paper && T.FLOORS.MUTE_PAPER === FLOOR.mutePaper
  && T.FLOORS.MUTE2_PAPER === FLOOR.mute2Paper && T.FLOORS.ACCENT_PAPER === FLOOR.accentPaper && T.FLOORS.ACCENT_INK === FLOOR.accentInk && T.FLOORS.SECOND_PAPER === FLOOR.secondPaper
  && T.FLOORS.PINK2_PAPER === FLOOR.pink2Paper && T.FLOORS.STICKY_INK === FLOOR.stickyInk && T.FLOORS.SK_HL_SH === FLOOR.hlSh && T.FLOORS.HALO_C === FLOOR.halo, JSON.stringify(T.FLOORS));
check('Theme.ORDER is the plan\'s order', JSON.stringify(T.ORDER) === JSON.stringify(ORDER));

// ── 0b · the decoder: every filter, every colour type, the real writer ───
const CH = { 0: 1, 2: 3, 4: 2, 6: 4 };
/* A PNG writer that forces `filter` on every row of an RGBA buffer written
   as colour `type` — the mirror of lib/png.js, kept apart from it on purpose
   (a decoder tested against its own inverse proves only symmetry). */
function encodeForced(width, height, rgba, type, filter, opts) {
  opts = opts || {};
  const bpp = CH[type], stride = width * bpp;
  const raw = Buffer.alloc((stride + 1) * height);
  const cur = Buffer.alloc(stride), prev = Buffer.alloc(stride);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const s4 = (y * width + x) * 4, o = x * bpp;
      if (type === 0) cur[o] = rgba[s4];
      else if (type === 2) { cur[o] = rgba[s4]; cur[o + 1] = rgba[s4 + 1]; cur[o + 2] = rgba[s4 + 2]; }
      else if (type === 4) { cur[o] = rgba[s4]; cur[o + 1] = rgba[s4 + 3]; }
      else { cur[o] = rgba[s4]; cur[o + 1] = rgba[s4 + 1]; cur[o + 2] = rgba[s4 + 2]; cur[o + 3] = rgba[s4 + 3]; }
    }
    raw[y * (stride + 1)] = filter;
    for (let i = 0; i < stride; i++) {
      const xv = cur[i], a = i >= bpp ? cur[i - bpp] : 0, b = prev[i], c = i >= bpp ? prev[i - bpp] : 0;
      let p;
      if (filter === 0) p = 0; else if (filter === 1) p = a; else if (filter === 2) p = b; else if (filter === 3) p = (a + b) >> 1;
      else { const q = a + b - c, pa = Math.abs(q - a), pb = Math.abs(q - b), pc = Math.abs(q - c); p = pa <= pb && pa <= pc ? a : pb <= pc ? b : c; }
      raw[y * (stride + 1) + 1 + i] = (xv - p) & 255;
    }
    cur.copy(prev);
  }
  const chunk = (name, data) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(name, 'latin1'), data]);
    const crc = Buffer.alloc(4); crc.writeUInt32BE(zlib.crc32(td) >>> 0);
    return Buffer.concat([len, td, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4);
  ihdr[8] = opts.depth || 8; ihdr[9] = type; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = opts.interlace || 0;
  const parts = [Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr)];
  if (opts.plte) parts.push(chunk('PLTE', Buffer.from([0, 0, 0, 255, 255, 255])));
  if (opts.trns) parts.push(chunk('tRNS', Buffer.from([0, 0, 0, 0, 0, 0])));
  parts.push(chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0)));
  return Buffer.concat(parts);
}
/* What the decoder must give back for an RGBA source written as `type`:
   grey types spread the red channel to R = G = B, alpha-less types are 255. */
function expectRGBA(rgba, type) {
  const out = new Uint8ClampedArray(rgba.length);
  for (let i = 0; i < rgba.length; i += 4) {
    const grey = type === 0 || type === 4;
    out[i] = rgba[i]; out[i + 1] = grey ? rgba[i] : rgba[i + 1]; out[i + 2] = grey ? rgba[i] : rgba[i + 2];
    out[i + 3] = type === 2 || type === 0 ? 255 : rgba[i + 3];
  }
  return out;
}
const same = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);
{
  const W = 37, H = 23, r3 = P.rng(3);
  const noise = Buffer.alloc(W * H * 4);
  for (let i = 0; i < noise.length; i++) noise[i] = Math.floor(r3() * 256);
  let ok = 0, bad = [];
  for (const type of [0, 2, 4, 6]) for (const filter of [0, 1, 2, 3, 4]) {
    let d = null, err = null;
    try { d = png.decode(encodeForced(W, H, noise, type, filter)); } catch (e) { err = e.message; }
    const good = d && d.width === W && d.height === H && d.filters[filter] === H && same(d.data, expectRGBA(noise, type));
    if (good) ok++; else bad.push('type ' + type + ' filter ' + filter + (err ? ' threw ' + err : ' wrong pixels'));
  }
  check('png.js: 5 filters × 4 colour types decode back to the bytes (37 × 23 seeded noise)', ok === 20 && bad.length === 0, bad.join('; ') || '20/20');
  const mf = require('../tools/make-fixtures');       // the writer the fixtures came from (its main() does not run on require)
  for (const alpha of [false, true]) {
    const d = png.decode(mf.encodePNG(W, H, noise, alpha));
    check('png.js: make-fixtures.encodePNG(' + (alpha ? 'RGBA' : 'RGB') + ') decodes back, adaptive filters', same(d.data, expectRGBA(noise, alpha ? 6 : 2)), 'rows per filter ' + d.filters.join('/'));
  }
  const file = encodeForced(W, H, noise, 6, 4);
  const at = file.indexOf('IDAT') + 4 + 5;             // a byte inside the deflate stream
  const bent = Buffer.from(file); bent[at] ^= 0x40;
  let msg = ''; try { png.decode(bent); } catch (e) { msg = e.message; }
  check('png.js: a flipped IDAT byte fails the CRC', /bad CRC on chunk IDAT/.test(msg), msg);
  const refuse = [['16-bit', { depth: 16 }, /16-bit|only 8-bit/], ['PLTE', { plte: true }, /PLTE|palette/], ['tRNS', { trns: true }, /tRNS/], ['interlaced', { interlace: 1 }, /interlaced|Adam7/]];
  const said = [];
  for (const [what, o, re] of refuse) {
    let m = ''; try { png.decode(encodeForced(W, H, noise, 2, 0, o)); } catch (e) { m = e.message; }
    said.push(what + ': ' + (re.test(m) ? 'refused' : 'NOT refused (' + (m || 'decoded') + ')'));
  }
  check('png.js: 16-bit, PLTE, tRNS and interlaced files are refused by name', said.every(x => /: refused$/.test(x)), said.join(', '));
}

// ── 0c · the ramp tolerance, measured ────────────────────────────────────
/* 0.15 / C degrees, never under 1°: the worst hue swing one 8-bit step can
   make at that chroma, with a little room. The bands are the chromas the
   ramp checks can meet — GREY_C 0.02 up — and the measurement is the header
   of theme.js's (20 000 colours from rng(11), L 0.2–0.9, C to 0.22). */
const RAMP_TOL = C => Math.max(1, 0.15 / C);
const BANDS = [[0.004, 0.006, 0.005], [0.009, 0.011, 0.01], [0.019, 0.021, 0.02], [0.029, 0.031, 0.03], [0.055, 0.065, 0.06], [0.14, 0.16, 0.15], [0.19, 0.21, 0.2]];
{
  const r11 = P.rng(11), worst = BANDS.map(() => 0), seen = BANDS.map(() => 0);
  for (let i = 0; i < 20000; i++) {
    const hex = P.fromOklch(0.2 + r11() * 0.7, r11() * 0.22, r11() * 360), c = P.toOklch(hex);
    const bi = BANDS.findIndex(b => c.C >= b[0] && c.C < b[1]);
    if (bi < 0) continue;
    seen[bi]++;
    const rgb = [1, 3, 5].map(k => parseInt(hex.slice(k, k + 2), 16));
    for (let ch = 0; ch < 3; ch++) for (const d of [-1, 1]) {
      const v = rgb[ch] + d; if (v < 0 || v > 255) continue;
      const q = rgb.slice(); q[ch] = v;
      const dh = P.hueDist(c.h, P.toOklch('#' + q.map(x => x.toString(16).padStart(2, '0')).join('')).h);
      if (dh > worst[bi]) worst[bi] = dh;
    }
  }
  console.log('hue swing per 8-bit step: ' + BANDS.map((b, i) => 'C ' + b[2] + ' → ' + worst[i].toFixed(1) + '° (' + seen[i] + ')').join(', '));
  const uncovered = BANDS.map((b, i) => [b, i]).filter(([b, i]) => b[2] >= 0.02 && seen[i] && worst[i] > RAMP_TOL(b[1]));
  check('the ramp tolerance 0.15 / C covers the measured worst swing at every band from C 0.02', uncovered.length === 0, uncovered.map(([b, i]) => 'C ' + b[2] + ' ' + worst[i].toFixed(2) + '° > ' + RAMP_TOL(b[1]).toFixed(2)).join(', ') || BANDS.filter(b => b[2] >= 0.02).map(b => 'C ' + b[2] + ' tol ' + RAMP_TOL(b[1]).toFixed(1) + '°').join(', '));
}

// ── 1 · the fixtures ─────────────────────────────────────────────────────
const fixtures = {};
for (const n of NAMES) {
  const exp = expected(n);
  const r = fx.themeOf(path.join(FIXTURES, n), { fonts: exp.pairing });
  fixtures[n] = r;
  console.log('\n' + n + ': ' + r.asset.file + ' ' + r.image.width + '×' + r.image.height + ' (rows per filter ' + r.image.filters.join('/') + '), ' + r.palette.length + ' colours, saturation (weight-averaged C) ' + f2(r.saturation));
  console.log('  palette: ' + r.palette.map(e => e.hex + ' ' + Math.round(e.weight * 100) + '% L' + f2(e.L) + ' C' + f2(e.C) + ' h' + Math.round(e.h)).join('  '));
  for (const line of T.explain(r.theme)) console.log('  · ' + line);
  checkTheme(n, r.theme, r.input);
  if (exp.stats && typeof exp.stats.dark === 'boolean') check(n + ': dark matches expected.json (' + exp.stats.dark + ')', r.theme.dark === exp.stats.dark, 'dark ' + r.theme.dark);
  else console.log('  ' + n + ': expected.json says nothing about dark — REPORTED: dark ' + r.theme.dark);
  /* expected.json also carries a `harmony` word (the plan's Appendix H), and
     nothing asserts it: the mood is CONTRACTS §2's rule over stats.saturation
     and the accent's chroma, and a fixture's word is a wish, not a
     measurement. It is REPORTED either way so the disagreement cannot go
     quiet — neonrun's says loud while the k-8 pipeline reads calm (weighted
     chroma 0.07, accent centroid C 0.14, both under §2's 0.12 / 0.15; Phase
     3 measured the real stats.saturation at 0.1051, still under), which is
     the open decision CHANGELOG Phase 2 hands to Phase 7 / the owner. */
  if (typeof exp.harmony === 'string') {
    const mood = ((T.explain(r.theme).find(s => /^mood:/.test(s)) || '').match(/^mood: (calm|loud)/) || [])[1] || '?';
    console.log('  ' + n + ': harmony — expected.json says ' + exp.harmony + ', the rule reads ' + mood
      + (mood === exp.harmony ? ' — agree' : ' — DISAGREE, REPORTED (open: CHANGELOG Phase 2, not asserted here)'));
  }
  const again = fx.themeOf(path.join(FIXTURES, n), { fonts: exp.pairing });
  check(n + ': css byte-identical across two derivations', again.theme.css === r.theme.css, r.theme.css.length + ' bytes');
  for (const size of [4, 8, 16]) {
    const q = T.derive(Object.assign({}, r.input, { paletteSize: size }));
    const acc = P.toOklch(q.tokens['--pink']), pitch = 360 / size;
    let off = [];
    for (const k of ['--sk-primary', '--sk-secondary', '--sk-ink', '--sk-paper', '--sk-highlight', '--sk-shadow']) {
      const c = P.toOklch(q.tokens[k]);
      if (c.C < 0.02) continue;
      /* The tolerance is the hex rounding's own hue swing, measured above
         (0c): 7.0° per 8-bit step at C 0.02, 4.7° at 0.03, 2.2° at 0.06 —
         RAMP_TOL, 0.15 / C degrees, never under 1°. */
      const tol = RAMP_TOL(c.C);
      const d = ((c.h - acc.h) % 360 + 360) % 360, k0 = Math.round(d / pitch), err = Math.abs(d - k0 * pitch);
      if (Math.min(err, 360 - err) > tol) off.push(k + ' ' + Math.round(c.h) + '° (C ' + f2(c.C) + ', off by ' + Math.min(err, 360 - err).toFixed(1) + '°)');
    }
    check(n + ' paletteSize ' + size + ': --sk-primary anchors the ramp, every hued --sk-* on a step within the hex rounding', q.tokens['--sk-primary'] === r.theme.tokens['--sk-primary'] && off.length === 0, off.join(', ') || ('pitch ' + pitch.toFixed(1) + '°'));
    checkTheme(n + ' paletteSize ' + size, q, Object.assign({}, r.input, { paletteSize: size }), quiet);
  }
}

// a second process
const child = spawnSync(process.execPath, [__filename, '--child'], { encoding: 'utf8' });
const lines = (child.stdout || '').split('\n').filter(Boolean);
check('a second Node process derives the same css for all three', child.status === 0 && lines.length === 3 && NAMES.every((n, i) => lines[i] === fixtures[n].theme.css), child.status === 0 ? lines.map(l => l.length + ' B').join(', ') : (child.stderr || '').slice(0, 300));

// ── 2 · two hundred seeded palettes, the degenerate ones on purpose ───────
const PAIRINGS = Object.keys(F.PAIRINGS);
const SHAPES = ['random', 'one colour', 'all greys', 'all near-black', 'all near-white', 'two at L 0.5', 'C 0.4 saturated', 'random + options'];
function mkPalette(seed) {
  const r = P.rng(seed), shape = SHAPES[(seed - 1000) % SHAPES.length];
  const n = shape === 'one colour' ? 1 : shape === 'two at L 0.5' ? 2 : shape === 'C 0.4 saturated' ? 6 : 2 + Math.floor(r() * 7);
  const entries = [];
  for (let i = 0; i < n; i++) {
    let L = r(), C = r() * 0.3, h = r() * 360;
    if (shape === 'all greys') C = 0;
    else if (shape === 'all near-black') L = r() * 0.08;
    else if (shape === 'all near-white') L = 0.92 + r() * 0.08;
    else if (shape === 'two at L 0.5') L = 0.5;
    else if (shape === 'C 0.4 saturated') C = 0.4;
    entries.push({ hex: P.fromOklch(L, C, h), weight: 0.05 + r() });
  }
  let sum = 0; for (const e of entries) sum += e.weight;
  const palette = P.describe(entries.map(e => ({ hex: e.hex, weight: e.weight / sum })));
  const opts = {};
  if (shape === 'random + options') {
    opts.paletteSize = [0, 4, 8, 16, 'six', 5][Math.floor(r() * 6)];
    opts.mood = [undefined, 'calm', 'loud', 'shouting'][Math.floor(r() * 4)];
    opts.fonts = PAIRINGS.concat(['nope', undefined])[Math.floor(r() * (PAIRINGS.length + 2))];
  }
  let sat = 0; for (const e of palette) sat += e.weight * e.C;
  return { shape, input: Object.assign({ palette, saturation: sat }, opts) };
}
let threw = 0, ran = 0, byShape = {};
for (let seed = 1000; seed < 1200; seed++) {
  const { shape, input } = mkPalette(seed);
  let theme = null;
  try { theme = T.derive(input); ran++; } catch (e) { threw++; console.log('FAIL derive threw on seed ' + seed + ' (' + shape + '): ' + (e.stack || e.message)); }
  if (theme) { checkTheme('seed ' + seed + ' (' + shape + ')', theme, input, quiet); byShape[shape] = (byShape[shape] || 0) + 1; }
}
check('200 seeded palettes: derive() never threw', threw === 0, ran + ' derived — ' + Object.keys(byShape).map(k => k + ' ' + byShape[k]).join(', '));
const before = fails;
// and the edges of the input itself
for (const [label, input] of [['an empty palette', { palette: [] }], ['a null input', null], ['no palette key', {}], ['one entry, no weight', { palette: [{ hex: '#336699' }] }], ['a bad hex among good', { palette: [{ hex: 'nope', weight: 0.5 }, { hex: '#c93b82', weight: 0.5 }] }], ['#rgb short hexes', { palette: [{ hex: '#c38', weight: 1 }] }]]) {
  let theme = null;
  try { theme = T.derive(input); } catch (e) { check('derive(' + label + ') does not throw', false, e.message); continue; }
  checkTheme(label, theme, input, quiet);
  check('derive(' + label + ') is a valid theme', fails === before, T.explain(theme)[0]);
}
check('the 200 random themes all pass the checker', results.filter(r => /^seed \d+/.test(r.name) && !r.ok).length === 0, results.filter(r => /^seed \d+/.test(r.name)).length + ' checks over ' + ran + ' themes');

// ── the table ────────────────────────────────────────────────────────────
const COLS = ['dark', '--paper', '--ink', '--pink', '--blue', '--green', '--amber', '--sk-primary', '--sk-secondary', '--sk-highlight', '--sk-shadow', '--sk-halo', 'fonts'];
console.log('\n' + 'token'.padEnd(16) + NAMES.map(n => n.padEnd(11)).join(''));
for (const col of COLS) {
  const row = NAMES.map(n => { const th = fixtures[n].theme; return String(col === 'dark' ? th.dark : col === 'fonts' ? th.fonts.id : th.tokens[col]).padEnd(11); });
  console.log(col.padEnd(16) + row.join(''));
}
for (const n of NAMES) console.log('\n' + n + ' css (' + fixtures[n].theme.css.length + ' B):\n' + fixtures[n].theme.css);

fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, 'summary.json'), JSON.stringify({
  date: new Date().toISOString(),
  pipeline: { k: fx.K, seed: fx.SEED, minWeight: fx.MIN_WEIGHT, ignoreEdges: true, saturation: 'weight-averaged palette C (stand-in for stats.saturation)' },
  fixtures: Object.fromEntries(NAMES.map(n => [n, { asset: fixtures[n].asset.file, palette: fixtures[n].palette, saturation: fixtures[n].saturation, theme: fixtures[n].theme, why: T.explain(fixtures[n].theme) }])),
  random: { count: ran, threw, byShape },
  results
}, null, 2));
const n = results.length;
console.log('\n' + (n - fails) + '/' + n + ' checks pass' + (fails ? ', ' + fails + ' FAIL' : '') + ' — ' + path.join(OUT, 'summary.json'));
process.exit(fails ? 1 : 0);
