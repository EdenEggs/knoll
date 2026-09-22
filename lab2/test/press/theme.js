/* ─── THE THEME ───────────────────────────────────────────────────────────
   press/theme.js — window.Theme: a game's palette in, the bench's token
   sheet out. Phase 2 of ../PRESS-TABLE-PLAN.md (§6), built to CONTRACTS §2.
   Pure arithmetic over window.Palette's OKLCH: no document, no canvas, no
   fetch, no Math.random — the same palette gives the same :root block to
   the byte, which is what lets a page be rebuilt from its game.json and
   come out the same page (tools/test-theme.js proves it across two calls
   and two processes).

   WHAT IT DOES. lab.css paints the whole bench from one :root of tokens —
   cream paper, aubergine ink, pink, and the surfaces, pads and pills built
   from those three. A game page is the same bench in the game's colours,
   so this file re-derives every token lab.css spends (the plan's table, §6
   step 3, row by row and in that order) from the palette the Press Table
   read off the key art, plus the seven --sk-* roles the sticker sheet is
   filled from (CONTRACTS §6) and the three font stacks. What it will not
   do is hand back a token that cannot be read: every text-on-paper pair
   has a CONTRAST FLOOR, and where a derived colour misses its floor the
   colour's OKLCH lightness is walked away from the paper (or the ink) in
   STEP 0.01 until the floor holds — chroma and hue kept, so the colour
   stays the game's colour, only deeper. The floors (the WCAG 2.x ratios
   Palette.contrast gives), each a named constant below:

     INK_PAPER       7.0  ink on paper — WCAG AAA for body text; the bench
                          sets 10 px serials and 11 px labels in --ink, and
                          knoll's own pair (#26212a on #faf7f9) is 14.8.
     INK2_PAPER      4.5  --ink-2 and --ink-3 on paper — WCAG AA; they set
                          headings and the pill's border.
     MUTE_PAPER      3.0  --mute on paper — AA for large text and UI parts,
                          which is what --mute dresses (hints, dimmed labels).
     MUTE2_PAPER     2.0  --mute-2 on paper — a decoration floor, not a text
                          one: --mute-2 is the serial ink and the dock rules,
                          and it need only be SEEN, not read; --line has no
                          floor at all (a rule may be as faint as it likes).
     ACCENT_PAPER    3.0  the accent on paper — it outlines inputs and fills
                          the dock's buttons (44 uses in lab.css), so the AA
                          UI floor; knoll's pink is 4.45.
     ACCENT_INK      1.5  the accent against the ink — not a text pair but
                          the two must not merge: the accent is drawn OVER
                          the ink on the dock (a pink button on the dark
                          pill), and 1.5 is where two colours stop reading
                          as one (knoll's pink on its ink is 3.3).
     SECOND_PAPER    3.0  --blue, --green, --amber on paper — the same UI
                          floor as the accent; --green is the autosave pill.
     PINK2_PAPER     2.5  --pink-2 on paper — a hover state of the accent,
                          lighter by design (plan: accent + 0.08 L), so it
                          may sit half a step under the accent's floor.
     STICKY_INK      4.5  the four sticky pads under the ink — a note is
                          body text on a pad, so AA.
     SK_HL_SH        1.5  --sk-highlight against --sk-shadow — the sticker
                          sheet's light and dark faces of one body; under
                          1.5 the sticker reads flat (the ACCENT_INK line,
                          for the same reason).
     HALO_C          2.2  --sk-halo: '1' when --sk-primary against
                          --bench-bg is under it. The die-cut halo (plan
                          §3.6) is a paper-coloured stroke behind a sticker
                          whose body would otherwise sink into the floor;
                          2.2 is a little above where the eye separates a
                          filled shape from its ground on a busy surface,
                          and a little under ACCENT_PAPER so a sticker only
                          just legible on the paper still gets its halo on
                          the darker floor. A first guess; Phase 4's probe
                          may move it, and this is the one place it lives.

   STEP 0.01 in OKLCH L is a shade under what a viewer can tell apart in a
   flat field (just-noticeable is ~0.01–0.02 there), so the first L that
   holds a floor is within one unseen step of the plan's own L; STEP_CAP
   100 is the whole of L in those steps, so a loop can only stop at a wall
   (L 0 or 1), never in the middle. When a floor cannot be met at the wall
   — which the geometry rules out for every floor against the paper or the
   ink (black or white beats any paper by 7; the accent's window between
   its two floors is a quarter of L wide on either page) but a test must
   not have to trust — the colour falls back to a NEUTRAL: ink mixed half
   way to paper and pushed away from the paper, and explain() says so.

   THE ROWS, and the readings this file makes where the plan's table leaves
   a word open (every one of these is a choice, and each is here so a later
   phase can change it in one place):

     dark      weight-averaged L of the palette under DARK_L 0.55 (plan §6
               step 2). Phase 0 measured neonrun at a mean L ~0.25 and
               mosslight at 0.61–0.66 (NOTES §E); 0.55 halves the gap.
     paper     "dominant hue": the hue of the HEAVIEST entry that has a hue
               at all — chroma over GREY_C. GREY_C 0.02 is measured: one
               8-bit step in one channel turns a colour's OKLCH hue by up
               to 7.0° at C 0.02, 14° at 0.01 and 36° at 0.005 (20 000
               colours from rng(11) over L 0.2–0.9, every channel stepped
               ±1, 2026-09-07; tools/test-theme.js re-measures it each run
               and prints the table), so under 0.02 a hue is a rumour;
               knoll's own paper sits at C 0.004 and its ink at
               0.018, and neither is a hue anyone would build a complement
               from. No entry over it → the paper is a true grey (C 0). Its
               chroma is the entry's own, capped at PAPER_C 0.03 (the
               plan's "C ≤ 0.03"); its L is the entry's, clamped to the
               plan's band — which for any real picture means the band's
               near edge (0.94 light, 0.20 dark), since a picture's heaviest
               colour is never paper-light.
     ink       the entry nearest the paper's complement in hue (greys
               skipped, as above; none → the complement itself, grey), at
               INK_L 0.22 light / 0.92 dark, chroma capped at INK_C 0.04.
               A grey palette gets a grey ink, which is what it asked for.
     accent    the highest-chroma entry carrying at least ACCENT_MIN_W 0.02
               of the pixels (plan: "weight ≥ 2 %" — a two-pixel neon
               reflection is not the game's colour). Ties by weight, then
               hex, so the pick is total and the output stable.
     mood      given → kept; else loud when the pixel-mean chroma is over
               LOUD_SAT 0.12 OR the accent candidate's chroma is over
               LOUD_C 0.15 (CONTRACTS §2 — neonrun averages 0.084 over its
               pixels while its lines sit at 0.25).
     blue, green, amber
               the next three entries by chroma at least SECOND_HUE 40°
               from the accent and from each other (greys skipped); short of
               three, filled from HARMONY at the accent's own L and hue
               + the angle: calm ±30° then +60° (analogous — the third
               continues the fan the same way rather than jumping across
               the wheel, so a calm page stays calm), loud +180°, +150°,
               −150° (complement and split). A fill's chroma is the accent's
               or HARMONY_C 0.06, whichever is more: a harmony is a hue, and
               a hue needs chroma to be seen; 0.06 is the chroma of knoll's
               --pink-soft, the faintest coloured token on the sheet (it
               measures 0.049 after the hex rounding).
     paletteSize
               4, 8 or 16 → every --sk-* colour with a hue (C ≥ GREY_C) has
               it snapped to the nearest of N hues spaced 360/N apart
               STARTING AT THE ACCENT'S HUE, at the role's own L and C. A
               limited-palette game (pixel, riso) wants its stickers to share
               a few hues with each other and with its accent; anchoring the
               ramp on the accent means --sk-primary is always exactly on it,
               and keeping each role's own L and C keeps the sheet's
               hierarchy — highlight lighter, shadow darker, ink dark, paper
               light — which a ramp in L would collapse. The floor on
               highlight/shadow and the halo are judged AFTER the snap, since
               a hue at the same OKLCH L is not the same WCAG luminance.
     fonts     the pairing id or 'clean'; Fonts.stacks(id) is folded into
               --display / --body / --mono. An id fonts.js does not know
               falls to 'clean' and explain() names it; window.Fonts absent
               (a page that forgot the script) → lab.css's three stacks
               verbatim, so the page is at least the bench's own type.

   OUTPUT. { dark, tokens, fonts: {id, display, body, mono}, css } —
   `css` is ':root{' + one 'name:value;' per token in ORDER + '}' on one
   line, byte-stable. Every colour token is a six-digit lowercase hex
   (Palette.fromOklch's form) except --bench-dot (rgba(r,g,b,.06) of the
   ink — lab.css's own form), --drop-rgb ('r,g,b' of the ink), --sk-halo
   ('0' | '1') and the three font stacks. The gnome (--gn-*), caution-tape
   (--st-*) and --sticky-edge tokens are not written: props with their own
   identity (plan §6 step 3), and a neutral shadow.

   tokensOf(theme) is the tokens object, copied. explain(theme) is the
   list of short reasons derive() wrote as it went ('dark: mean L 0.31',
   'accent: #ff2fb0 (C 0.26)', 'ink: pushed 3 steps to 7.0', …) — carried
   on the theme as a NON-enumerable `why`, so JSON.stringify(theme) is the
   contract's four keys and a theme read back from game.json (no `why`)
   gets the facts explain() can recompute from the tokens alone.

   NOT A BENCH FILE. Nothing here touches document or Lab; the Node tests
   load it against a bare `window` that carries Palette and Fonts. An IIFE
   with one global, window.Theme, as every module on the bench is. */

window.Theme = (function () {
  'use strict';

  // ── the floors (see the header for each sentence) ────────────────────────
  const INK_PAPER = 7.0;
  const INK2_PAPER = 4.5;
  const MUTE_PAPER = 3.0;
  const MUTE2_PAPER = 2.0;
  const ACCENT_PAPER = 3.0;
  const ACCENT_INK = 1.5;
  const SECOND_PAPER = 3.0;
  const PINK2_PAPER = 2.5;
  const STICKY_INK = 4.5;
  const SK_HL_SH = 1.5;
  const HALO_C = 2.2;
  const FLOORS = Object.freeze({ INK_PAPER, INK2_PAPER, MUTE_PAPER, MUTE2_PAPER, ACCENT_PAPER, ACCENT_INK, SECOND_PAPER, PINK2_PAPER, STICKY_INK, SK_HL_SH, HALO_C });

  // ── the walk ─────────────────────────────────────────────────────────────
  const STEP = 0.01;         // one OKLCH L step of the contrast walk — under a just-noticeable difference in a flat field
  const STEP_CAP = 100;      // the whole of L in those steps: a loop stops at a wall, never in the middle

  // ── the readings (header: THE ROWS) ──────────────────────────────────────
  const DARK_L = 0.55;       // plan §6 step 2: weight-averaged L under this → a dark page
  const GREY_C = 0.02;       // under this chroma a colour has no hue worth reading (measured: 7.0° per 8-bit step at C 0.02 — the header's table)
  const PAPER_C = 0.03;      // plan: paper C ≤ 0.03
  const PAPER_L = { light: [0.94, 0.98], dark: [0.14, 0.20] };   // plan: the paper's L band
  const INK_L = { light: 0.22, dark: 0.92 };                     // plan: the ink's L
  const INK_C = 0.04;        // plan: ink C ≤ 0.04
  const ACCENT_MIN_W = 0.02; // plan: the accent carries at least 2 % of the pixels
  const LOUD_SAT = 0.12;     // CONTRACTS §2: pixel-mean chroma over this → loud
  const LOUD_C = 0.15;       // CONTRACTS §2: an accent candidate over this → loud
  const SECOND_HUE = 40;     // plan: secondaries at least 40° from the accent and each other
  const HARMONY = { calm: [30, -30, 60], loud: [180, 150, -150] };   // plan (§6): analogous / complementary + split; the third calm step continues the fan
  const HARMONY_C = 0.06;    // a harmony fill's least chroma — knoll's --pink-soft, the faintest coloured token
  const SIZES = [0, 4, 8, 16];   // style.paletteSize (Appendix B)
  const ORDER = [            // the plan's table, top to bottom, then the fonts (CONTRACTS §2)
    '--paper', '--paper-2', '--card', '--bench-bg', '--bench-dot', '--drop-rgb',
    '--ink', '--ink-2', '--ink-3', '--mute', '--mute-2', '--line',
    '--pink', '--pink-2', '--pink-soft', '--blue', '--green', '--amber',
    '--field', '--tint', '--tint-2', '--chip', '--hard-edge',
    '--sticky-a', '--sticky-b', '--sticky-c', '--sticky-d',
    '--gz-handle-bg', '--gz-handle-ink', '--grip', '--serial-ink',
    '--sk-primary', '--sk-secondary', '--sk-ink', '--sk-paper', '--sk-highlight', '--sk-shadow', '--sk-halo',
    '--display', '--body', '--mono'
  ];
  const SK_COLOURS = ['--sk-primary', '--sk-secondary', '--sk-ink', '--sk-paper', '--sk-highlight', '--sk-shadow'];
  const LAB_STACKS = {       // lab.css lines 22–24, verbatim — the fallback when fonts.js is not on the page
    display: "'Sora',sans-serif",
    body: "'Public Sans',sans-serif",
    mono: 'ui-monospace,"Cascadia Mono",Consolas,"SF Mono",Menlo,monospace'
  };
  const NEUTRAL = '#808080'; // what an empty palette is read as: a mid grey, no hue, no claim

  const P = window.Palette;
  if (!P) throw new Error('theme.js: window.Palette is missing (load press/palette.js first)');

  // ── small colour helpers ─────────────────────────────────────────────────
  const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
  const lch = hex => P.toOklch(hex);
  const hexOf = (L, C, h) => P.fromOklch(clamp01(L), Math.max(0, C), ((h % 360) + 360) % 360);
  const withL = (hex, L) => { const c = lch(hex); return hexOf(L, c.C, c.h); };
  const shiftL = (hex, dL) => { const c = lch(hex); return hexOf(c.L + dL, c.C, c.h); };
  const rgbOf = hex => [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
  const f2 = v => (Math.round(v * 100) / 100).toFixed(2);
  const f1 = v => (Math.round(v * 10) / 10).toFixed(1);

  /* Walk hex's L by STEP in direction dir (+1 lighter, −1 darker) until
     contrast(hex, against) ≥ floor, at most STEP_CAP steps or until L hits
     a wall. Returns { hex, steps, met }. */
  function pushL(hex, against, floor, dir) {
    let c = lch(hex), out = hex, steps = 0;
    while (P.contrast(out, against) < floor && steps < STEP_CAP) {
      const L = c.L + dir * STEP;
      if (L < 0 || L > 1) break;
      c = { L, C: c.C, h: c.h };
      out = hexOf(L, c.C, c.h);
      steps++;
    }
    return { hex: out, steps, met: P.contrast(out, against) >= floor };
  }

  /* The neutral a colour falls back to when its floors cannot be met: ink
     mixed half way to the paper, pushed away from the paper to the floor. */
  function neutral(ink, paper, floor, away) {
    return pushL(P.mix(ink, paper, 0.5), paper, floor, away).hex;
  }

  // ── the palette, made safe ───────────────────────────────────────────────
  function normalise(palette, why) {
    const out = [];
    for (const e of Array.isArray(palette) ? palette : []) {
      if (!e) continue;
      let hex;
      try { const c0 = lch(e.hex); hex = hexOf(c0.L, c0.C, c0.h); } catch (err) { continue; }   // a bad hex is skipped, not fatal; '#rgb' becomes '#rrggbb'
      const c = lch(hex);
      const w = Number(e.weight);
      out.push({ hex, weight: w > 0 && isFinite(w) ? w : 0, L: c.L, C: c.C, h: c.h });
    }
    if (!out.length) {
      why.push('palette: empty, a mid grey stands in');
      const c = lch(NEUTRAL);
      out.push({ hex: NEUTRAL, weight: 1, L: c.L, C: c.C, h: c.h });
    }
    let sum = 0;
    for (const e of out) sum += e.weight;
    if (sum <= 0) { why.push('palette: no weights, read as equal'); for (const e of out) e.weight = 1; sum = out.length; }
    for (const e of out) e.weight = e.weight / sum;
    out.sort((a, b) => b.weight - a.weight || (a.hex < b.hex ? -1 : a.hex > b.hex ? 1 : 0));   // heaviest first; a total order
    return out;
  }

  // ── derive ───────────────────────────────────────────────────────────────
  function derive(input) {
    input = input || {};
    const why = [];
    const pal = normalise(input.palette, why);
    const t = {};

    // light or dark
    let meanL = 0;
    for (const e of pal) meanL += e.weight * e.L;
    const dark = meanL < DARK_L;
    const mode = dark ? 'dark' : 'light';
    const away = dark ? +1 : -1;          // the direction that leaves the paper: lighter on a dark page, darker on a light one
    why.push(mode + ': mean L ' + f2(meanL));

    // paper — the dominant hue at a whisper of its chroma
    const hued = pal.filter(e => e.C >= GREY_C);
    const dom = hued.length ? hued[0] : null;          // pal is heaviest-first
    const paperH = dom ? dom.h : 0, paperC = dom ? Math.min(dom.C, PAPER_C) : 0;
    const band = PAPER_L[mode];
    const paperL = Math.min(Math.max(pal[0].L, band[0]), band[1]);
    t['--paper'] = hexOf(paperL, paperC, paperH);
    why.push(dom ? 'paper: hue ' + Math.round(paperH) + '° from ' + dom.hex + ' (' + Math.round(dom.weight * 100) + ' %), L ' + f2(paperL)
                 : 'paper: no entry over C ' + GREY_C + ', a true grey at L ' + f2(paperL));
    const paper = t['--paper'];
    t['--paper-2'] = shiftL(paper, dark ? +0.03 : -0.03);
    t['--card'] = shiftL(paper, dark ? -0.01 : +0.01);
    t['--bench-bg'] = shiftL(paper, -0.035);

    // ink — nearest the paper's complement
    const comp = (paperH + 180) % 360;
    let inkE = null;
    for (const e of hued) {
      if (!inkE) { inkE = e; continue; }
      const d = P.hueDist(e.h, comp), d0 = P.hueDist(inkE.h, comp);
      if (d < d0 || (d === d0 && (e.weight > inkE.weight || (e.weight === inkE.weight && e.hex < inkE.hex)))) inkE = e;
    }
    const inkH = inkE ? inkE.h : comp, inkC = inkE ? Math.min(inkE.C, INK_C) : 0;
    let ink = hexOf(INK_L[mode], inkC, inkH);
    let r = pushL(ink, paper, INK_PAPER, away);
    if (!r.met) { r = { hex: dark ? '#ffffff' : '#000000', steps: r.steps, met: true }; why.push('ink: floor ' + INK_PAPER + ' unmet at the wall, ' + r.hex); }
    ink = r.hex;
    t['--ink'] = ink;
    why.push('ink: ' + (inkE ? 'hue ' + Math.round(inkH) + '° from ' + inkE.hex + ' (nearest the complement ' + Math.round(comp) + '°)' : 'grey, no hued entry')
      + (r.steps ? ', pushed ' + r.steps + ' to ' + f1(P.contrast(ink, paper)) : ', ' + f1(P.contrast(ink, paper)) + ' on paper'));
    t['--ink-2'] = held(shiftL(ink, -away * 0.04), paper, INK2_PAPER, away, 'ink-2', why, ink);
    t['--ink-3'] = held(shiftL(ink, -away * 0.10), paper, INK2_PAPER, away, 'ink-3', why, ink);
    t['--mute'] = held(P.mix(ink, paper, 0.55), paper, MUTE_PAPER, away, 'mute', why, ink);
    t['--mute-2'] = held(P.mix(ink, paper, 0.75), paper, MUTE2_PAPER, away, 'mute-2', why, ink);
    t['--line'] = P.mix(ink, paper, 0.88);
    const inkRgb = rgbOf(ink);
    t['--bench-dot'] = 'rgba(' + inkRgb.join(',') + ',.06)';
    t['--drop-rgb'] = inkRgb.join(',');

    // the accent
    const cands = pal.filter(e => e.weight >= ACCENT_MIN_W);
    const pool = (cands.length ? cands : pal).slice().sort((a, b) => b.C - a.C || b.weight - a.weight || (a.hex < b.hex ? -1 : a.hex > b.hex ? 1 : 0));
    const accE = pool[0];
    const saturation = Number(input.saturation);
    let mood = input.mood === 'calm' || input.mood === 'loud' ? input.mood : null;
    if (!mood) {
      mood = (isFinite(saturation) && saturation > LOUD_SAT) || accE.C > LOUD_C ? 'loud' : 'calm';
      why.push('mood: ' + mood + ' (saturation ' + (isFinite(saturation) ? f2(saturation) : '—') + ', accent C ' + f2(accE.C) + ')');
    } else why.push('mood: ' + mood + ' (given)');
    let accent = accE.hex, ac = lch(accent), aSteps = 0, aMet = false;
    for (let i = 0; i < STEP_CAP; i++) {
      if (P.contrast(accent, paper) < ACCENT_PAPER) ac.L += away * STEP;
      else if (P.contrast(accent, ink) < ACCENT_INK) ac.L -= away * STEP;
      else { aMet = true; break; }
      if (ac.L < 0 || ac.L > 1) break;
      accent = hexOf(ac.L, ac.C, ac.h); aSteps++;
    }
    aMet = aMet || (P.contrast(accent, paper) >= ACCENT_PAPER && P.contrast(accent, ink) >= ACCENT_INK);
    if (!aMet) { accent = neutral(ink, paper, ACCENT_PAPER, away); why.push('accent: no L meets ' + ACCENT_PAPER + ' on paper and ' + ACCENT_INK + ' on ink, neutral ' + accent); }
    why.push('accent: ' + accE.hex + ' (C ' + f2(accE.C) + ', ' + Math.round(accE.weight * 100) + ' %)'
      + (aSteps ? ', pushed ' + aSteps + ' to ' + accent : '') + ' — ' + f1(P.contrast(accent, paper)) + ' on paper, ' + f1(P.contrast(accent, ink)) + ' on ink');
    t['--pink'] = accent;
    const acc = lch(accent);
    t['--pink-2'] = held(shiftL(accent, +0.08), paper, PINK2_PAPER, away, 'pink-2', why, ink);
    t['--pink-soft'] = hexOf(dark ? 0.30 : 0.90, 0.06, acc.h);

    // the three secondaries
    const picked = [];
    for (const e of pool.slice(1)) {
      if (picked.length === 3) break;
      if (e.C < GREY_C || e === accE) continue;
      if (P.hueDist(e.h, acc.h) < SECOND_HUE) continue;
      if (picked.some(p => P.hueDist(p.h, e.h) < SECOND_HUE)) continue;
      picked.push(e);
    }
    const seconds = picked.map(e => e.hex);
    if (picked.length) why.push('secondaries: ' + picked.map(e => e.hex + ' (' + Math.round(e.h) + '°)').join(', ') + ' from the palette');
    const fills = [];
    for (const angle of HARMONY[mood]) {
      if (seconds.length === 3) break;
      const hex = hexOf(acc.L, Math.max(acc.C, HARMONY_C), acc.h + angle);
      seconds.push(hex); fills.push(hex + ' (' + (angle > 0 ? '+' : '') + angle + '°)');
    }
    if (fills.length) why.push('secondaries: ' + fills.join(', ') + ' filled from the ' + mood + ' harmony');
    const names = ['--blue', '--green', '--amber'];
    for (let i = 0; i < 3; i++) t[names[i]] = held(seconds[i], paper, SECOND_PAPER, away, names[i].slice(2), why, ink);

    // surfaces
    t['--field'] = paper;
    t['--tint'] = P.mix(paper, accent, 0.04);
    t['--tint-2'] = P.mix(paper, accent, 0.03);
    t['--chip'] = P.mix(paper, accent, 0.02);
    t['--hard-edge'] = dark ? withL(paper, 0.06) : withL(ink, 0.10);

    // the four pads
    const padNames = ['--sticky-a', '--sticky-b', '--sticky-c', '--sticky-d'];
    for (let i = 0; i < 4; i++) {
      const pad = hexOf(dark ? 0.35 : 0.88, 0.10, acc.h + 90 * i);
      const rr = pushL(pad, ink, STICKY_INK, -away);          // away from the ink: lighter on a light page, darker on a dark one
      /* A pad that cannot hold 4.5 under the ink at the wall falls to the
         farthest thing from the ink there is — white under a dark ink,
         black under a light one — not to the neutral, which is a text
         colour and would make a pad nobody could write on. The geometry
         rules it out (an ink at or past L 0.22 / 0.92 is 17+ from that
         wall), so the line is for the test's sake, and explain() says so. */
      t[padNames[i]] = rr.met ? rr.hex : (dark ? '#000000' : '#ffffff');
      if (rr.steps) why.push(padNames[i].slice(2) + ': pushed ' + rr.steps + (rr.met ? '' : ', unmet at the wall'));
    }

    // the pill
    t['--gz-handle-bg'] = t['--ink-2'];
    t['--gz-handle-ink'] = paper;
    t['--grip'] = P.mix(ink, paper, 0.30);
    t['--serial-ink'] = t['--mute-2'];

    // the sticker roles
    t['--sk-primary'] = accent;
    t['--sk-secondary'] = t['--blue'];
    t['--sk-ink'] = ink;
    t['--sk-paper'] = dark ? paper : '#ffffff';
    t['--sk-highlight'] = hexOf(acc.L + 0.15, acc.C * 0.8, acc.h);
    t['--sk-shadow'] = hexOf(acc.L - 0.22, acc.C * 0.6, acc.h);

    // the ramp
    let size = SIZES.indexOf(input.paletteSize) >= 0 ? input.paletteSize : 0;
    if (input.paletteSize != null && SIZES.indexOf(input.paletteSize) < 0) why.push('paletteSize: ' + JSON.stringify(input.paletteSize) + ' is not one of ' + SIZES.join('/') + ', read as 0');
    if (size) {
      const pitch = 360 / size;
      let moved = 0;
      for (const k of SK_COLOURS) {
        const c = lch(t[k]);
        if (c.C < GREY_C) continue;
        const step = Math.round((((c.h - acc.h) % 360) + 360) % 360 / pitch);
        const snapped = hexOf(c.L, c.C, acc.h + step * pitch);
        if (snapped !== t[k]) moved++;
        t[k] = snapped;
      }
      why.push('paletteSize ' + size + ': hues snapped to ' + size + ' steps of ' + f1(pitch) + '° from ' + Math.round(acc.h) + '°, ' + moved + ' moved');
    }

    // highlight against shadow — walked apart, alternately
    let hl = t['--sk-highlight'], sh = t['--sk-shadow'], hs = 0;
    while (P.contrast(hl, sh) < SK_HL_SH && hs < STEP_CAP) {
      const nh = shiftL(hl, +STEP), ns = shiftL(sh, -STEP);
      if (nh === hl && ns === sh) break;                       // both at their walls
      if (hs % 2 === 0) hl = nh; else sh = ns;
      hs++;
    }
    if (P.contrast(hl, sh) < SK_HL_SH) { hl = '#ffffff'; sh = '#000000'; why.push('sk-highlight/shadow: floor ' + SK_HL_SH + ' unmet, white and black'); }
    else if (hs) why.push('sk-highlight/shadow: walked ' + hs + ' apart to ' + f1(P.contrast(hl, sh)));
    t['--sk-highlight'] = hl; t['--sk-shadow'] = sh;
    const haloC = P.contrast(t['--sk-primary'], t['--bench-bg']);
    t['--sk-halo'] = haloC < HALO_C ? '1' : '0';
    why.push('sk-halo: ' + t['--sk-halo'] + ' (primary on bench-bg ' + f1(haloC) + (haloC < HALO_C ? ' < ' : ' ≥ ') + HALO_C + ')');

    // fonts
    let id = input.fonts == null ? 'clean' : String(input.fonts), stacks = null;
    const F = window.Fonts;
    if (F && typeof F.stacks === 'function') {
      try { stacks = F.stacks(id); }
      catch (err) { why.push('fonts: unknown pairing "' + id + '", clean'); id = 'clean'; try { stacks = F.stacks(id); } catch (e2) { stacks = null; } }
    }
    if (!stacks) { stacks = LAB_STACKS; if (!F) why.push('fonts: fonts.js absent, lab.css stacks'); }
    const fonts = { id, display: stacks.display, body: stacks.body, mono: stacks.mono };
    t['--display'] = fonts.display; t['--body'] = fonts.body; t['--mono'] = fonts.mono;
    why.push('fonts: ' + id);

    // the sheet
    const tokens = {};
    for (const k of ORDER) tokens[k] = t[k];
    const theme = { dark, tokens, fonts, css: cssOf(tokens) };
    Object.defineProperty(theme, 'why', { value: why, enumerable: false });
    return theme;
  }

  /* A derived colour held to its floor against `against`, walked in `dir`;
     unmet at the wall → the neutral. Writes a line to why when it moved. */
  function held(hex, against, floor, dir, name, why, ink) {
    const r = pushL(hex, against, floor, dir);
    if (!r.met) { const n = neutral(ink, against, floor, dir); why.push(name + ': floor ' + floor + ' unmet at the wall, neutral ' + n); return n; }
    if (r.steps) why.push(name + ': pushed ' + r.steps + ' to ' + f1(P.contrast(r.hex, against)));
    return r.hex;
  }

  function cssOf(tokens) {
    let s = ':root{';
    for (const k of ORDER) s += k + ':' + tokens[k] + ';';
    return s + '}';
  }

  function tokensOf(theme) {
    const out = {};
    const t = theme && theme.tokens || {};
    for (const k of ORDER) if (k in t) out[k] = t[k];
    return out;
  }

  /* explain(theme): derive()'s own notes when the theme still carries them;
     otherwise (a theme read back from JSON) the facts the tokens alone give. */
  function explain(theme) {
    if (!theme || !theme.tokens) return [];
    if (Array.isArray(theme.why)) return theme.why.slice();
    const t = theme.tokens, out = [];
    try {
      const paper = t['--paper'], ink = t['--ink'], acc = t['--pink'];
      out.push((theme.dark ? 'dark' : 'light') + ': paper ' + paper + ' (L ' + f2(lch(paper).L) + ')');
      out.push('ink: ' + ink + ', ' + f1(P.contrast(ink, paper)) + ' on paper');
      out.push('accent: ' + acc + ' (C ' + f2(lch(acc).C) + ') — ' + f1(P.contrast(acc, paper)) + ' on paper, ' + f1(P.contrast(acc, ink)) + ' on ink');
      out.push('secondaries: ' + [t['--blue'], t['--green'], t['--amber']].join(', '));
      out.push('sk-halo: ' + t['--sk-halo'] + ' (primary on bench-bg ' + f1(P.contrast(t['--sk-primary'], t['--bench-bg'])) + ')');
      out.push('fonts: ' + (theme.fonts && theme.fonts.id || '?'));
    } catch (err) { out.push('tokens: ' + err.message); }
    return out;
  }

  return Object.freeze({ derive, tokensOf, explain, FLOORS, ORDER: Object.freeze(ORDER.slice()), SIZES: Object.freeze(SIZES.slice()) });
})();
