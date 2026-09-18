/* ─── ATTACK-THEME ────────────────────────────────────────────────────────
   An adversary for press/theme.js, in Node, no browser: two thousand
   palettes built to be unkind — greys with no hue at all, one hex eight
   times over, weights that are all zero or sum to a thousand, an entry
   whose L/C/h are NaN beside a good hex, black and white as entries, two
   entries, eight entries crowded into five degrees of hue, a ramp asked
   of an accent with no chroma, and a bag of garbage for every option —
   go through Theme.derive, and every one must come back a theme that
   holds every floor, byte-stable, with the plan's table honoured row by
   row. tools/test-theme.js proves the module does what its author says
   on the fixtures and two hundred random palettes; this file is the
   other side of the table, written by someone trying to break it.

       node lab2/test/press/tools/attack-theme.js          (from site/)
       node lab2/test/press/tools/attack-theme.js --child  (prints css for the first CHILD_N; the parent spawns it)

   WHAT IS HELD, on every one of the 2000:
   - derive() does not throw, twice, and the two css strings are bytes-equal;
     the input palette is not mutated; the entries SHUFFLED give the same css
     (normalise() sorts by weight then hex, so the order a caller hands the
     entries in is not part of the input).
   - every token in Theme.ORDER is present in that order; every colour is
     /^#[0-9a-f]{6}$/; --bench-dot and --drop-rgb are the ink's rgb in their
     two forms; --sk-halo is '0' or '1'; the font tokens are Fonts.stacks()'s
     for the pairing named (or clean); nothing anywhere says NaN.
   - every floor in Theme.FLOORS — read from the module, not retyped, so a
     drift there is measured against itself and the test-theme.js copy is
     what catches a drift — holds on the pair it names, and --sk-halo is
     '1' exactly when contrast(--sk-primary, --bench-bg) < FLOORS.HALO_C.
   - THE PLAN'S TABLE (§6 step 3), recomputed here from the input with this
     file's own reading of each row: dark = weight-averaged L < 0.55 (the
     plan's number); the paper's L in its band and C ≤ 0.03; the ink at
     L 0.22 / 0.92 (or pushed away from the paper) with C ≤ 0.04; the
     accent named in explain() is the highest-C entry carrying ≥ 2 %, ties by
     weight then hex; --paper-2 / --card / --bench-bg at −0.03 / +0.01 /
     −0.035 L (paper-2 and card reversed on a dark page); --mute, --mute-2,
     --line the ink mixed 55 / 75 / 88 % toward the paper (mute and mute-2
     may have been pushed, but only when the plain mix misses its floor);
     --pink-2 the accent + 0.08 L, the same way; --pink-soft at L 0.90 / 0.30,
     C 0.06, the accent's hue; --field the paper and --tint / --tint-2 /
     --chip the paper with 4 / 3 / 2 % of the accent (Palette.mix, exact);
     --hard-edge the ink at L 0.10 on a light page, the paper at L 0.06 on a
     dark one; the four pads on the accent's hue + 0 / 90 / 180 / 270 at
     L ≥ 0.88 (light, pushed lighter) or ≤ 0.35 (dark, pushed darker); the
     pill tokens ink-2 / paper / ink-30 %-paper / mute-2; the --sk-* roles
     the accent / --blue / the ink / #ffffff-or-paper / +0.15 L × 0.8 C /
     −0.22 L × 0.6 C (unless the pair had to be walked apart, which only
     happens when the plain pair misses SK_HL_SH). Palette-sourced
     secondaries (explain() says "from the palette") sit ≥ 40° from the
     accent and each other; harmony fills sit at the accent's hue + the
     angle of the mood's fan. The 40° is measured from the accent TOKEN's
     hue (the pushed, hex-rounded --pink), which is what theme.js measures
     from — at C 0.04 the rounding moves a hue by up to 3.5°, so an entry
     39.2° from the raw accent entry can sit 40.1° from the token (a
     near-white palette found it: seed 5756).
   - THE MOOD RULE (CONTRACTS §2): given calm/loud is kept; otherwise loud
     when saturation > 0.12 OR the accent candidate's C > 0.15 (the
     contract's two numbers), and explain() must say which. Three shapes
     built to exercise it: a dark plate with the pixel-mean saturation
     0.08 and an accent at C 0.25 → loud, and since nothing else in the
     palette qualifies as a secondary, --blue/--green/--amber come from the
     loud fan (+180, +150, −150) — at least one ≥ 120° from the accent; the
     same palette with mood 'calm' given → the calm fan, all three under
     120°; saturation 0.13 with a C 0.10 accent → loud by the other branch.
   - paletteSize 4/8/16: --sk-primary is still the accent, and every hued
     --sk-* sits on a step of 360/N from the accent's hue within the hue a
     hex can hold at that chroma (0.15 / C degrees, never under 1° — the
     tolerance test-theme.js measures each run).
   - css byte-identical from a second Node process for the first CHILD_N.

   HUE TOLERANCE. Hues are compared through the hex, so a colour at chroma
   C can only hold its hue to about 0.15 / C degrees (test-theme.js measures
   7.0° at C 0.02, 4.7° at 0.03, 2.2° at 0.06); a colour under C 0.02 has no
   hue to compare and is skipped. L is compared to 0.012 — one 8-bit step at
   the darkest L a token can sit at (0.14) moves L by about 0.005 — except
   --hard-edge, whose L 0.06 / 0.10 targets fall between #000000 (L 0) and
   #010101 (L 0.067): 0.07 there.

   Writes perf/results/attack-theme/summary.json (CONTRACTS §11); prints
   every failure and a count per shape. Exit 1 on any failure. */
'use strict';
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const load = require('./lib/browser-module');

const PRESS = path.resolve(__dirname, '..');
const OUT = path.resolve(__dirname, '..', '..', 'perf', 'results', 'attack-theme');
const N = 2000;
const CHILD_N = 120;
const DARK_L = 0.55;      // plan §6 step 2
const LOUD_SAT = 0.12;    // CONTRACTS §2
const LOUD_C = 0.15;      // CONTRACTS §2
const SECOND_HUE = 40;    // plan: secondaries ≥ 40° apart
const GREY_C = 0.02;      // theme.js's reading of "has a hue" (its header); under it a hue is not compared
const L_TOL = 0.012, EDGE_TOL = 0.07;
const IDS = ['clean', 'pixel', 'hand', 'rustic', 'gothic', 'comic', 'cozy', 'scifi', 'typewriter'];

const w = load(path.join(PRESS, 'palette.js'));
load(path.join(PRESS, 'fonts.js'), w);
load(path.join(PRESS, 'theme.js'), w);
const { Palette: P, Fonts: F, Theme: T } = w;
const FL = T.FLOORS;
const ORDER = T.ORDER;
const NOT_HEX = ['--bench-dot', '--drop-rgb', '--sk-halo', '--display', '--body', '--mono'];

// ── helpers ──────────────────────────────────────────────────────────────
const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
const hexOf = (L, C, h) => P.fromOklch(clamp01(L), Math.max(0, C), ((h % 360) + 360) % 360);   // theme.js's own line
const lch = h => P.toOklch(h);
const hueTol = C => Math.max(1, 0.15 / C);
const f2 = v => (Math.round(v * 100) / 100).toFixed(2);
function hueNear(hexA, targetH, label) {                       // true when hexA's hue is within its own tolerance of targetH, or it has no hue
  const c = lch(hexA);
  if (c.C < GREY_C) return true;
  return P.hueDist(c.h, targetH) <= hueTol(c.C);
}
function shuffle(arr, rng) { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function randHex(rng) { return '#' + [0, 0, 0].map(() => Math.floor(rng() * 256).toString(16).padStart(2, '0')).join(''); }
function grey(rng) { const v = Math.floor(rng() * 256).toString(16).padStart(2, '0'); return '#' + v + v + v; }
function entry(hex, weight, extra) { const c = lch(hex); return Object.assign({ hex, weight, L: c.L, C: c.C, h: c.h }, extra || {}); }

/* My own reading of normalise(): what theme.js should have seen. */
function normalise(palette) {
  const out = [];
  for (const e of Array.isArray(palette) ? palette : []) {
    if (!e) continue;
    let hex; try { const c0 = lch(e.hex); hex = hexOf(c0.L, c0.C, c0.h); } catch (err) { continue; }
    const c = lch(hex), ww = Number(e.weight);
    out.push({ hex, weight: ww > 0 && isFinite(ww) ? ww : 0, L: c.L, C: c.C, h: c.h });
  }
  if (!out.length) out.push(Object.assign(entry('#808080', 1)));
  let sum = 0; for (const e of out) sum += e.weight;
  if (sum <= 0) { for (const e of out) e.weight = 1; sum = out.length; }
  for (const e of out) e.weight /= sum;
  out.sort((a, b) => b.weight - a.weight || (a.hex < b.hex ? -1 : a.hex > b.hex ? 1 : 0));
  return out;
}

// ── the shapes ───────────────────────────────────────────────────────────
function moodPalette(rng) {                                     // a dark plate, an accent at C 0.25, a sibling 20° away
  let acc, tries = 0;
  do { acc = hexOf(0.55 + rng() * 0.15, 0.25, rng() * 360); tries++; } while (lch(acc).C < 0.2 && tries < 50);
  const a = lch(acc);
  return [entry(hexOf(0.10 + rng() * 0.04, 0, 0), 0.85), entry(acc, 0.12), entry(hexOf(0.5, 0.12, a.h + 20), 0.03)];
}
const SHAPES = [
  { name: 'random 1–8', make: rng => { const n = 1 + Math.floor(rng() * 8); const p = []; for (let i = 0; i < n; i++) p.push(entry(randHex(rng), rng())); return { palette: p }; } },
  { name: 'C = 0 only', make: rng => { const n = 2 + Math.floor(rng() * 7); const p = []; for (let i = 0; i < n; i++) p.push(entry(grey(rng), rng())); return { palette: p, saturation: 0 }; } },
  { name: 'one hex, many times', make: rng => { const h = randHex(rng), n = 2 + Math.floor(rng() * 7); const p = []; for (let i = 0; i < n; i++) p.push(entry(h, rng())); return { palette: p }; } },
  { name: 'weights all 0', make: rng => { const n = 1 + Math.floor(rng() * 8); const p = []; for (let i = 0; i < n; i++) p.push(entry(randHex(rng), 0)); return { palette: p }; } },
  { name: 'weights not summing to 1', make: rng => { const n = 2 + Math.floor(rng() * 7), scale = [37, 1e-6, 1e9, 0.001][Math.floor(rng() * 4)]; const p = []; for (let i = 0; i < n; i++) p.push(entry(randHex(rng), rng() * scale)); return { palette: p }; } },
  { name: 'h NaN', make: rng => { const n = 2 + Math.floor(rng() * 7); const p = []; for (let i = 0; i < n; i++) p.push(entry(randHex(rng), rng(), i % 2 ? { h: NaN } : { h: NaN, L: NaN, C: NaN })); return { palette: p }; } },
  { name: 'L exactly 0 and 1', make: rng => { const p = [entry('#000000', rng()), entry('#ffffff', rng())]; if (rng() < 0.5) p.push(entry(randHex(rng), rng())); return { palette: shuffle(p, rng) }; } },
  { name: 'two entries', make: rng => ({ palette: [entry(randHex(rng), rng()), entry(randHex(rng), rng())] }) },
  { name: 'eight within 5°', make: rng => { const h0 = rng() * 360; const p = []; for (let i = 0; i < 8; i++) p.push(entry(hexOf(0.2 + rng() * 0.7, 0.05 + rng() * 0.25, h0 + rng() * 5 - 2.5), rng())); return { palette: p }; } },
  { name: 'paletteSize 4, accent C 0.01', make: rng => { const n = 2 + Math.floor(rng() * 7); const p = []; for (let i = 0; i < n; i++) p.push(entry(hexOf(0.1 + rng() * 0.8, 0.004 + rng() * 0.006, rng() * 360), rng())); return { palette: p, paletteSize: 4 }; } },
  { name: 'mood: dark, sat 0.08, accent C 0.25', make: rng => ({ palette: moodPalette(rng), saturation: 0.08 }), mood: 'loud-by-accent' },
  { name: 'mood: the same, calm given', make: rng => ({ palette: moodPalette(rng), saturation: 0.08, mood: 'calm' }), mood: 'calm-given' },
  { name: 'mood: sat 0.13, accent C 0.10', make: rng => { let acc; do { acc = hexOf(0.5 + rng() * 0.2, 0.10, rng() * 360); } while (lch(acc).C < 0.09); return { palette: [entry(hexOf(0.12, 0, 0), 0.9), entry(acc, 0.1)], saturation: 0.13 }; }, mood: 'loud-by-saturation' },
  { name: 'garbage options', make: rng => {
      const pick = a => a[Math.floor(rng() * a.length)];
      const p = [];
      const n = 1 + Math.floor(rng() * 6);
      for (let i = 0; i < n; i++) {
        const hex = pick([randHex(rng), randHex(rng).toUpperCase(), randHex(rng).slice(1), '#' + randHex(rng).slice(1, 4), '#ggg', 'red', '', null, undefined, 12]);
        const weight = pick([rng(), '0.5', -1, NaN, Infinity, '', null, undefined, {}]);
        p.push(pick([{ hex, weight }, { hex, weight, L: NaN, C: NaN, h: NaN }, null, 'string', {}, hex]));
      }
      if (rng() < 0.3) p.push(entry(randHex(rng), 0.5));
      return { palette: pick([p, p, p, 'abc', {}, null, 42]), paletteSize: pick([undefined, 0, 4, 8, 16, '8', 3, -1, null, 4.0, NaN]),
        fonts: pick(IDS.concat(['nope', 42, null, undefined, '', {}])), mood: pick(['calm', 'loud', undefined, null, 'LOUD', '', 0, 'both']),
        saturation: pick([rng() * 0.4, NaN, '0.2', -1, Infinity, undefined, null, '']) };
    } },
  { name: 'near-black', make: rng => { const n = 1 + Math.floor(rng() * 8); const p = []; for (let i = 0; i < n; i++) p.push(entry(hexOf(rng() * 0.08, rng() * 0.05, rng() * 360), rng())); return { palette: p }; } },
  { name: 'near-white', make: rng => { const n = 1 + Math.floor(rng() * 8); const p = []; for (let i = 0; i < n; i++) p.push(entry(hexOf(0.92 + rng() * 0.08, rng() * 0.05, rng() * 360), rng())); return { palette: p }; } },
  { name: 'C 0.4 saturated', make: rng => { const p = []; for (let i = 0; i < 6; i++) p.push(entry(hexOf(0.3 + rng() * 0.5, 0.4, rng() * 360), rng())); return { palette: p }; } },
  { name: 'one entry', make: rng => ({ palette: [entry(randHex(rng), 1)] }) },
  { name: 'random + options', make: rng => {
      const pick = a => a[Math.floor(rng() * a.length)];
      const n = 1 + Math.floor(rng() * 8); const p = []; for (let i = 0; i < n; i++) p.push(entry(randHex(rng), rng()));
      return { palette: p, paletteSize: pick([0, 4, 8, 16]), fonts: pick(IDS), mood: pick(['calm', 'loud', undefined]), saturation: rng() * 0.4 };
    } }
];

function caseOf(i) {
  const shape = SHAPES[i % SHAPES.length];
  const rng = P.rng(5000 + i);
  return { i, shape, input: shape.make(rng), rng: P.rng(9000 + i) };
}

// ── --child: css for the first CHILD_N, one per line ─────────────────────
if (process.argv.includes('--child')) {
  for (let i = 0; i < CHILD_N; i++) process.stdout.write(T.derive(caseOf(i).input).css + '\n');
  process.exit(0);
}

// ── the checks ───────────────────────────────────────────────────────────
const failures = [];
const perShape = {};
let checks = 0;
function fail(c, what, info) { failures.push({ i: c.i, shape: c.shape.name, what, info: info == null ? undefined : String(info) }); perShape[c.shape.name].fails++; }
function ok(c, cond, what, info) { checks++; if (!cond) fail(c, what, info); return !!cond; }

function attack(c) {
  perShape[c.shape.name] = perShape[c.shape.name] || { n: 0, fails: 0 };
  perShape[c.shape.name].n++;
  const before = JSON.stringify(c.input, (k, v) => typeof v === 'number' && !isFinite(v) ? String(v) : v);
  let theme, theme2;
  try { theme = T.derive(c.input); theme2 = T.derive(c.input); }
  catch (err) { fail(c, 'derive() threw', err && err.stack || err); return; }
  const after = JSON.stringify(c.input, (k, v) => typeof v === 'number' && !isFinite(v) ? String(v) : v);
  ok(c, before === after, 'input mutated');
  ok(c, theme && theme2 && theme.css === theme2.css, 'css not byte-stable across two derivations');
  ok(c, JSON.stringify(theme.tokens) === JSON.stringify(theme2.tokens), 'tokens differ across two derivations');
  if (Array.isArray(c.input.palette) && c.input.palette.length > 1) {
    const sh = Object.assign({}, c.input, { palette: shuffle(c.input.palette, c.rng) });
    let t3 = null; try { t3 = T.derive(sh); } catch (err) { fail(c, 'derive() threw on the shuffled palette', err.message); }
    if (t3) ok(c, t3.css === theme.css, 'shuffled entries give a different css');
  }
  const t = theme.tokens;
  const keys = Object.keys(t);
  ok(c, keys.length === ORDER.length && keys.every((k, i) => k === ORDER[i]), 'tokens not Theme.ORDER in order', keys.join(','));
  const bad = [];
  for (const k of ORDER) {
    const v = t[k];
    if (v == null || v === '' || /NaN|undefined|null|Infinity/.test(String(v))) bad.push(k + '=' + v);
    else if (!NOT_HEX.includes(k) && !/^#[0-9a-f]{6}$/.test(v)) bad.push(k + '=' + v);
  }
  if (!ok(c, bad.length === 0, 'bad token values', bad.join(' '))) return;
  ok(c, !/NaN|undefined|Infinity/.test(theme.css), 'css carries NaN/undefined/Infinity');
  ok(c, theme.css === ':root{' + ORDER.map(k => k + ':' + t[k] + ';').join('') + '}', 'css is not :root{name:value;…} in ORDER');
  const why = T.explain(theme);
  ok(c, Array.isArray(why) && why.length >= 3 && why.every(s => typeof s === 'string' && s.length && !/NaN/.test(s)), 'explain() short or carries NaN', JSON.stringify(why));
  const rgb = [1, 3, 5].map(i => parseInt(t['--ink'].slice(i, i + 2), 16)).join(',');
  ok(c, t['--bench-dot'] === 'rgba(' + rgb + ',.06)' && t['--drop-rgb'] === rgb, '--bench-dot/--drop-rgb not the ink', t['--bench-dot'] + ' ' + t['--drop-rgb']);
  ok(c, t['--sk-halo'] === '0' || t['--sk-halo'] === '1', '--sk-halo not 0/1', t['--sk-halo']);

  // the floors, from the module
  const con = (a, b) => P.contrast(t[a], t[b]);
  const floors = [
    ['--ink/--paper', con('--ink', '--paper'), FL.INK_PAPER],
    ['--ink-2/--paper', con('--ink-2', '--paper'), FL.INK2_PAPER],
    ['--ink-3/--paper', con('--ink-3', '--paper'), FL.INK2_PAPER],
    ['--mute/--paper', con('--mute', '--paper'), FL.MUTE_PAPER],
    ['--mute-2/--paper', con('--mute-2', '--paper'), FL.MUTE2_PAPER],
    ['--pink/--paper', con('--pink', '--paper'), FL.ACCENT_PAPER],
    ['--pink/--ink', con('--pink', '--ink'), FL.ACCENT_INK],
    ['--pink-2/--paper', con('--pink-2', '--paper'), FL.PINK2_PAPER],
    ['--blue/--paper', con('--blue', '--paper'), FL.SECOND_PAPER],
    ['--green/--paper', con('--green', '--paper'), FL.SECOND_PAPER],
    ['--amber/--paper', con('--amber', '--paper'), FL.SECOND_PAPER],
    ['--sticky-a/--ink', con('--sticky-a', '--ink'), FL.STICKY_INK],
    ['--sticky-b/--ink', con('--sticky-b', '--ink'), FL.STICKY_INK],
    ['--sticky-c/--ink', con('--sticky-c', '--ink'), FL.STICKY_INK],
    ['--sticky-d/--ink', con('--sticky-d', '--ink'), FL.STICKY_INK],
    ['--sk-highlight/--sk-shadow', con('--sk-highlight', '--sk-shadow'), FL.SK_HL_SH]
  ];
  for (const f of floors) ok(c, f[1] >= f[2], 'floor ' + f[0] + ' < ' + f[2], f2(f[1]));
  const halo = con('--sk-primary', '--bench-bg');
  ok(c, t['--sk-halo'] === (halo < FL.HALO_C ? '1' : '0'), '--sk-halo disagrees with HALO_C', f2(halo) + ' → ' + t['--sk-halo']);

  // the plan's table, recomputed
  const pal = normalise(c.input.palette);
  let meanL = 0; for (const e of pal) meanL += e.weight * e.L;
  const dark = meanL < DARK_L;
  ok(c, theme.dark === dark, 'dark disagrees with weight-averaged L < 0.55', 'mean L ' + f2(meanL) + ' theme.dark ' + theme.dark);
  const paper = t['--paper'], ink = t['--ink'], accent = t['--pink'];
  const pc = lch(paper), ic = lch(ink), ac = lch(accent);
  const band = dark ? [0.14, 0.20] : [0.94, 0.98];
  ok(c, pc.L >= band[0] - L_TOL && pc.L <= band[1] + L_TOL, '--paper L outside its band', f2(pc.L));
  ok(c, pc.C <= 0.03 + 0.006, '--paper C over 0.03', f2(pc.C));
  const hued = pal.filter(e => e.C >= GREY_C);
  const dom = hued.length ? hued[0] : null;
  if (dom) ok(c, hueNear(paper, dom.h), '--paper hue not the dominant hued entry\'s', Math.round(pc.h) + '° vs ' + Math.round(dom.h) + '° (' + dom.hex + ')');
  const expPaperL = Math.min(Math.max(pal[0].L, band[0]), band[1]);
  ok(c, Math.abs(pc.L - expPaperL) <= L_TOL, '--paper L not the heaviest entry\'s clamped to the band', f2(pc.L) + ' vs ' + f2(expPaperL));
  // ink
  ok(c, ic.C <= 0.04 + 0.006, '--ink C over 0.04', f2(ic.C));
  ok(c, dark ? ic.L >= 0.92 - L_TOL : ic.L <= 0.22 + L_TOL, '--ink L not at 0.22/0.92 or pushed away from the paper', f2(ic.L));
  const paperH = dom ? dom.h : 0, comp = (paperH + 180) % 360;
  let inkE = null;
  for (const e of hued) { if (!inkE) { inkE = e; continue; } const d = P.hueDist(e.h, comp), d0 = P.hueDist(inkE.h, comp); if (d < d0 || (d === d0 && (e.weight > inkE.weight || (e.weight === inkE.weight && e.hex < inkE.hex)))) inkE = e; }
  if (inkE && ic.C >= GREY_C && !/^ink: floor/.test(why.find(s => /^ink:/.test(s)) || '')) ok(c, hueNear(ink, inkE.h), '--ink hue not the entry nearest the paper\'s complement', Math.round(ic.h) + '° vs ' + Math.round(inkE.h) + '° (comp ' + Math.round(comp) + '°)');
  // paper-2, card, bench-bg
  ok(c, Math.abs(lch(t['--paper-2']).L - (pc.L + (dark ? 0.03 : -0.03))) <= L_TOL, '--paper-2 not paper ∓ 0.03 L', f2(lch(t['--paper-2']).L) + ' vs paper ' + f2(pc.L));
  ok(c, Math.abs(lch(t['--card']).L - (pc.L + (dark ? -0.01 : 0.01))) <= L_TOL, '--card not paper ± 0.01 L', f2(lch(t['--card']).L) + ' vs paper ' + f2(pc.L));
  ok(c, Math.abs(lch(t['--bench-bg']).L - (pc.L - 0.035)) <= L_TOL, '--bench-bg not paper − 0.035 L', f2(lch(t['--bench-bg']).L) + ' vs paper ' + f2(pc.L));
  // ink-2 / ink-3: toward the paper by 0.04 / 0.10 unless pushed back
  const dir = dark ? -1 : 1;
  const i2 = lch(t['--ink-2']).L, i3 = lch(t['--ink-3']).L;
  ok(c, (dir > 0 ? i2 <= ic.L + 0.04 + L_TOL && i2 >= ic.L - L_TOL : i2 >= ic.L - 0.04 - L_TOL && i2 <= ic.L + L_TOL), '--ink-2 not ink ± 0.04 L (or pushed)', f2(i2) + ' vs ink ' + f2(ic.L));
  ok(c, (dir > 0 ? i3 <= ic.L + 0.10 + L_TOL && i3 >= ic.L - L_TOL : i3 >= ic.L - 0.10 - L_TOL && i3 <= ic.L + L_TOL), '--ink-3 not ink ± 0.10 L (or pushed)', f2(i3) + ' vs ink ' + f2(ic.L));
  // mute, mute-2, line
  const mixOr = (name, tt, floor) => { const m = P.mix(ink, paper, tt); return t[name] === m || P.contrast(m, paper) < floor; };
  ok(c, mixOr('--mute', 0.55, FL.MUTE_PAPER), '--mute is not ink→paper 55 % (and the mix met its floor)', t['--mute'] + ' vs ' + P.mix(ink, paper, 0.55));
  ok(c, mixOr('--mute-2', 0.75, FL.MUTE2_PAPER), '--mute-2 is not ink→paper 75 % (and the mix met its floor)', t['--mute-2'] + ' vs ' + P.mix(ink, paper, 0.75));
  ok(c, t['--line'] === P.mix(ink, paper, 0.88), '--line is not ink→paper 88 %', t['--line'] + ' vs ' + P.mix(ink, paper, 0.88));
  // the accent
  const cands = pal.filter(e => e.weight >= 0.02);
  const pool = (cands.length ? cands : pal).slice().sort((a, b) => b.C - a.C || b.weight - a.weight || (a.hex < b.hex ? -1 : a.hex > b.hex ? 1 : 0));
  const accE = pool[0];
  const accLine = why.find(s => /^accent: #/.test(s)) || '';
  ok(c, accLine.startsWith('accent: ' + accE.hex + ' ('), 'explain() names a different accent than the highest-C entry ≥ 2 %', accLine + ' vs ' + accE.hex);
  const accNeutral = why.some(s => /^accent: no L meets/.test(s));
  if (!accNeutral && ac.C >= GREY_C && accE.C >= GREY_C) ok(c, hueNear(accent, accE.h), '--pink hue is not the accent entry\'s', Math.round(ac.h) + '° vs ' + Math.round(accE.h) + '°');
  // mood
  const given = c.input.mood === 'calm' || c.input.mood === 'loud' ? c.input.mood : null;
  const sat = Number(c.input.saturation);
  const expMood = given || ((isFinite(sat) && sat > LOUD_SAT) || accE.C > LOUD_C ? 'loud' : 'calm');
  const moodLine = why.find(s => /^mood:/.test(s)) || '';
  ok(c, moodLine.startsWith('mood: ' + expMood + ' ') && (given ? /\(given\)/.test(moodLine) : !/\(given\)/.test(moodLine)), 'mood disagrees with CONTRACTS §2', moodLine + ' vs ' + expMood + ' (sat ' + sat + ', accent C ' + f2(accE.C) + ')');
  // pink-2, pink-soft
  const p2 = P.fromOklch(clamp01(ac.L + 0.08), ac.C, ac.h);
  ok(c, t['--pink-2'] === p2 || P.contrast(p2, paper) < FL.PINK2_PAPER, '--pink-2 is not the accent + 0.08 L (and that met its floor)', t['--pink-2'] + ' vs ' + p2);
  const ps = lch(t['--pink-soft']);
  ok(c, Math.abs(ps.L - (dark ? 0.30 : 0.90)) <= L_TOL, '--pink-soft L not 0.90/0.30', f2(ps.L));
  ok(c, ps.C <= 0.06 + 0.006 && (ps.C >= 0.06 - 0.006 || lch(P.fromOklch(dark ? 0.30 : 0.90, 0.06, ac.h)).C < 0.06 - 0.006), '--pink-soft C not 0.06', f2(ps.C));
  ok(c, hueNear(t['--pink-soft'], ac.h), '--pink-soft hue not the accent\'s', Math.round(ps.h) + '° vs ' + Math.round(ac.h) + '°');
  // the secondaries
  const secs = ['--blue', '--green', '--amber'].map(k => lch(t[k]));
  const fromPal = why.find(s => /^secondaries: .* from the palette$/.test(s));
  if (fromPal) {
    const hexes = (fromPal.match(/#[0-9a-f]{6}/g) || []);
    ok(c, hexes.every(h => pal.some(e => e.hex === h)), 'a "from the palette" secondary is not in the palette', hexes.join(' '));
    const hs = hexes.map(h => lch(h).h);
    ok(c, hs.every(h => P.hueDist(h, ac.h) >= SECOND_HUE - 1e-9), 'a palette secondary is under 40° from the accent', hs.map(Math.round).join(',') + ' vs accent ' + Math.round(ac.h));
    for (let a = 0; a < hs.length; a++) for (let b = a + 1; b < hs.length; b++) ok(c, P.hueDist(hs[a], hs[b]) >= SECOND_HUE - 1e-9, 'two palette secondaries under 40° apart', Math.round(hs[a]) + ',' + Math.round(hs[b]));
  }
  const filled = why.find(s => /^secondaries: .* filled from the (calm|loud) harmony$/.test(s));
  if (filled) {
    const m = filled.match(/(calm|loud) harmony$/);
    ok(c, m && m[1] === expMood, 'the harmony named is not the mood\'s', filled);
    const pairs = [...filled.matchAll(/(#[0-9a-f]{6}) \(([+-]\d+)°\)/g)];
    ok(c, pairs.length > 0, 'the fill line names no hex/angle pairs', filled);
    const fan = expMood === 'calm' ? [30, -30, 60] : [180, 150, -150];
    pairs.forEach((p, k) => {
      ok(c, Number(p[2]) === fan[k], 'fill angle ' + p[2] + ' is not the fan\'s ' + fan[k], filled);
      ok(c, hueNear(p[1], ac.h + Number(p[2])), 'a fill hex is off its hue', p[1] + ' ' + Math.round(lch(p[1]).h) + '° vs ' + Math.round(((ac.h + Number(p[2])) % 360 + 360) % 360) + '°');
    });
  }
  ok(c, fromPal || filled, 'explain() says nothing about the secondaries');
  if (c.shape.mood === 'loud-by-accent') {
    ok(c, expMood === 'loud' && moodLine.startsWith('mood: loud'), 'the constructed loud palette did not read loud', moodLine);
    const far = secs.filter(s => s.C >= GREY_C && P.hueDist(s.h, ac.h) >= 120);
    ok(c, far.length >= 1, 'no secondary ≥ 120° from the accent on a loud palette', secs.map(s => Math.round(s.h) + '°/C' + f2(s.C)).join(' ') + ' accent ' + Math.round(ac.h) + '°');
    ok(c, !!filled && !fromPal, 'the constructed loud palette should fill all three from the harmony', (fromPal || '') + ' | ' + (filled || ''));
  }
  if (c.shape.mood === 'calm-given') {
    ok(c, moodLine === 'mood: calm (given)', 'a given calm was not kept', moodLine);
    const far = secs.filter(s => s.C >= GREY_C && P.hueDist(s.h, ac.h) >= 120);
    ok(c, far.length === 0, 'a calm fan put a secondary ≥ 120° from the accent', secs.map(s => Math.round(s.h) + '°').join(' '));
  }
  if (c.shape.mood === 'loud-by-saturation') ok(c, moodLine.startsWith('mood: loud'), 'saturation 0.13 did not read loud', moodLine);
  // surfaces
  ok(c, t['--field'] === paper, '--field is not the paper', t['--field']);
  ok(c, t['--tint'] === P.mix(paper, accent, 0.04), '--tint is not paper + 4 % accent');
  ok(c, t['--tint-2'] === P.mix(paper, accent, 0.03), '--tint-2 is not paper + 3 % accent');
  ok(c, t['--chip'] === P.mix(paper, accent, 0.02), '--chip is not paper + 2 % accent');
  const he = lch(t['--hard-edge']);
  ok(c, Math.abs(he.L - (dark ? 0.06 : 0.10)) <= EDGE_TOL, '--hard-edge L not 0.10 (light) / 0.06 (dark)', f2(he.L));
  ok(c, t['--hard-edge'] === (dark ? P.fromOklch(0.06, pc.C, pc.h) : P.fromOklch(0.10, ic.C, ic.h)), '--hard-edge is not the ink at L 0.10 / the paper at L 0.06', t['--hard-edge']);
  // the pads
  ['--sticky-a', '--sticky-b', '--sticky-c', '--sticky-d'].forEach((k, i) => {
    const pd = lch(t[k]);
    const wall = why.some(s => s.startsWith(k.slice(2) + ': pushed') && /unmet/.test(s));
    if (wall) return;
    ok(c, dark ? pd.L <= 0.35 + L_TOL : pd.L >= 0.88 - L_TOL, k + ' L not 0.88 light / 0.35 dark (or pushed the right way)', f2(pd.L));
    ok(c, hueNear(t[k], ac.h + 90 * i), k + ' hue not accent + ' + 90 * i + '°', Math.round(pd.h) + '° vs ' + Math.round(((ac.h + 90 * i) % 360 + 360) % 360) + '° at C ' + f2(pd.C));
  });
  // the pill
  ok(c, t['--gz-handle-bg'] === t['--ink-2'] && t['--gz-handle-ink'] === paper && t['--grip'] === P.mix(ink, paper, 0.30) && t['--serial-ink'] === t['--mute-2'], 'pill tokens off the table');
  // the sticker roles
  const size = [4, 8, 16].includes(c.input.paletteSize) ? c.input.paletteSize : 0;
  ok(c, t['--sk-primary'] === accent, '--sk-primary is not the accent', t['--sk-primary'] + ' vs ' + accent);
  if (!size) {
    ok(c, t['--sk-secondary'] === t['--blue'] && t['--sk-ink'] === ink && t['--sk-paper'] === (dark ? paper : '#ffffff'), '--sk-secondary/-ink/-paper off the table');
    const hl = hexOf(ac.L + 0.15, ac.C * 0.8, ac.h), sh = hexOf(ac.L - 0.22, ac.C * 0.6, ac.h);
    ok(c, (t['--sk-highlight'] === hl && t['--sk-shadow'] === sh) || P.contrast(hl, sh) < FL.SK_HL_SH, '--sk-highlight/-shadow not +0.15 L × 0.8 C / −0.22 L × 0.6 C (and the pair met its floor)', t['--sk-highlight'] + '/' + t['--sk-shadow'] + ' vs ' + hl + '/' + sh);
  } else {
    const pitch = 360 / size;
    for (const k of ['--sk-secondary', '--sk-ink', '--sk-paper', '--sk-highlight', '--sk-shadow']) {
      const cc = lch(t[k]);
      if (cc.C < GREY_C) continue;
      const d = (((cc.h - ac.h) % 360) + 360) % 360;
      const off = Math.min(d % pitch, pitch - d % pitch);
      ok(c, off <= hueTol(cc.C), k + ' off the ' + size + '-step ramp', off.toFixed(2) + '° at C ' + f2(cc.C));
    }
    const line = why.find(s => s.startsWith('paletteSize ' + size + ':'));
    ok(c, !!line, 'explain() does not name the ramp');
  }
  if (c.input.paletteSize != null && !T.SIZES.includes(c.input.paletteSize)) ok(c, why.some(s => /^paletteSize: .* read as 0$/.test(s)), 'a bad paletteSize was not named in explain()');
  // fonts
  const idIn = c.input.fonts == null ? 'clean' : String(c.input.fonts);
  const expId = IDS.includes(idIn) ? idIn : 'clean';
  const st = F.stacks(expId);
  ok(c, theme.fonts.id === expId && t['--display'] === st.display && t['--body'] === st.body && t['--mono'] === st.mono && theme.fonts.display === st.display, 'fonts not Fonts.stacks(' + expId + ')', JSON.stringify(theme.fonts));
  if (expId !== idIn) ok(c, why.some(s => /^fonts: unknown pairing/.test(s)), 'an unknown pairing was not named in explain()');
  // the JSON shape
  ok(c, JSON.stringify(Object.keys(JSON.parse(JSON.stringify(theme)))) === '["dark","tokens","fonts","css"]', 'JSON carries more or less than dark, tokens, fonts, css');
  ok(c, JSON.stringify(T.tokensOf(theme)) === JSON.stringify(theme.tokens), 'tokensOf() differs from theme.tokens');
  const back = T.explain(JSON.parse(JSON.stringify(theme)));
  ok(c, back.length >= 3 && back.every(s => !/NaN/.test(s)), 'explain() on a theme read back from JSON');
}

// ── run ──────────────────────────────────────────────────────────────────
const t0 = Date.now();
const cases = [];
for (let i = 0; i < N; i++) { const c = caseOf(i); cases.push(c); attack(c); }
const ms = Date.now() - t0;

// a second process
const child = spawnSync(process.execPath, [__filename, '--child'], { encoding: 'utf8', maxBuffer: 1 << 26 });
const lines = (child.stdout || '').split('\n').filter(Boolean);
let childMismatch = 0;
for (let i = 0; i < CHILD_N; i++) if (lines[i] !== T.derive(caseOf(i).input).css) childMismatch++;
checks++;
if (child.status !== 0 || lines.length !== CHILD_N || childMismatch) failures.push({ i: -1, shape: 'child', what: 'a second Node process disagrees', info: 'status ' + child.status + ', lines ' + lines.length + ', mismatches ' + childMismatch + (child.stderr ? ' ' + child.stderr.slice(0, 300) : '') });

// report
for (const f of failures.slice(0, 60)) console.log('FAIL #' + f.i + ' [' + f.shape + '] ' + f.what + (f.info ? ' — ' + f.info : ''));
if (failures.length > 60) console.log('… and ' + (failures.length - 60) + ' more');
console.log('');
console.log('shape'.padEnd(40) + 'palettes  fails');
for (const k of Object.keys(perShape)) console.log(k.padEnd(40) + String(perShape[k].n).padStart(8) + String(perShape[k].fails).padStart(7));
console.log('');
console.log('FLOORS read from Theme: ' + JSON.stringify(FL));
console.log((checks - failures.length) + '/' + checks + ' checks pass over ' + N + ' palettes in ' + ms + ' ms; second process: ' + (childMismatch ? childMismatch + ' mismatches' : 'identical for ' + CHILD_N));
fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, 'summary.json'), JSON.stringify({ date: new Date().toISOString(), palettes: N, checks, fails: failures.length, ms, floors: FL, perShape, child: { status: child.status, lines: lines.length, mismatches: childMismatch }, failures: failures.slice(0, 500) }, null, 2) + '\n');
console.log('→ ' + path.join(OUT, 'summary.json'));
process.exit(failures.length ? 1 : 0);
