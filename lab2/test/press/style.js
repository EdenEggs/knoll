/* ─── THE STYLE ───────────────────────────────────────────────────────────
   press/style.js — window.Style: seven cheap measurements of a game's
   pictures, the style vector those measurements imply, and the sticker
   presets ranked by how far each sits from it. This is Phase 3 of the Press
   Table (../PRESS-TABLE-PLAN.md §7; the shape is CONTRACTS.md §4), and it
   exists because a vision model is bad at exactly these things — is this
   art on a 4-pixel grid, are those outlines two pixels wide or five, is the
   softness paint or a blur — and a few loops over the pixels are not. Every
   number here is deterministic: the same PNG gives the same stats to the
   byte on any machine, which is what lets press/fixtures/<name>/stats.json
   be a golden file (perf/test-style.js runs the three fixtures in two
   browser contexts and diffs the JSON).

   WHAT IS HERE:

     measure({screenshots, keyart, logos}, detail)  → stats
         { pixelSize, outline: {present, weight}, paletteCount, saturation,
           contrast, hfEnergy, edgeDensity }
         Screenshots feed every statistic; key art and logos feed ONLY
         saturation and paletteCount (§7's opening line — a logo on alpha
         has edges everywhere and a key art is often a painting of a pixel
         game). Each input is an ImageBitmap, an <img>, a <canvas> or an
         ImageData; anything that is not already ImageData is drawn once
         onto a canvas and read back. `detail`, if an object is passed, is
         filled with the game-level intermediates (the pooled plate luma,
         the averaged shares, which ink class the weight was read from) —
         not part of stats, which keeps CONTRACTS' shape exactly.
     inspect(image, role)                   → one picture's raw numbers
         (the pixel-error curve, the Sobel percentiles, the run histograms,
         …) — what measure() aggregates, kept callable so a test can print
         the table behind a stat. Not a contract surface; the Press Table
         reads stats.
     vector(stats, hints)                   → the style vector (Appendix B)
         hints = { dark, vibe }: `dark` is analysis.dark (Theme's call —
         weighted palette L under 0.55), not something stats can say.
     rank(vector)                           → [{preset, score}, …] the
         nearest three presets, ascending distance; a measured pixel grid
         puts `pixel` first whatever the distances say.
     PRESETS                                Appendix C, verbatim, in its order.
     forPreset(preset, vector)              → the object the page bakes as
         data-sk-style: the preset's prototype with `pixel` and `saturation`
         taken from the measured vector (CONTRACTS §4).

   TWO SIZES OF PICTURE, and why (CONTRACTS §4 overrides the plan here).
   The plan works everything on a 512-px-long-edge copy. Phase 0 measured
   what that does to the two statistics that live in the pixels rather than
   in the colours: a 640-wide pixel-art screenshot on a 4-px grid, resampled
   to 512, is on a 3.2-px grid — no integer s shrinks and re-enlarges it
   cleanly, and the sharp zero the pixel test looks for is gone — and a
   4-px black outline on that copy is 3.2 px, which the plan's buckets
   (3–4 → 0.6) would still call 0.6 only by the luck of the rounding; a
   6-px one would be 4.8 and read a bucket thin. Texture goes the other
   way: a one-pixel canvas weave (mosslight's) is averaged into the copy
   and half lost. So the PIXEL GRID, the TEXTURE and the outline's RUN
   LENGTH are read on the NATIVE picture, while the outline's presence, the
   edge density, the palette count and the colour sample are read on the
   512 copy, where they are cheap and where the plan's thresholds were
   written. "Native" is bounded: a long edge over NATIVE_MAX 1024 is first
   shrunk by the integer factor floor(long / 1024), nearest-neighbour, so a
   4K screenshot is read at 1280 and a 1440p one at 1280 — and a 1080p one,
   whose factor floors to 1, is read whole, because halving 1080p would
   fold the 3-px grid a lot of pixel art ships at into 1.5 px and lose it.
   A pixel size found on the shrunk picture is multiplied back by the
   factor (a 4-px grid at 2560 wide is a 2-px grid at 1280, and 2 × 2 is
   what the page wants), which is right when the factor divides the grid
   and reads 0 when it does not; that is a stated limit, not an oversight.
   The 512 copy is an area average (each output pixel the mean of the
   source box under it, alpha-weighted), computed here in plain arithmetic
   rather than by drawImage: a browser's downscale is not promised to be
   the same across GPUs, and a golden file needs the same bytes on every
   machine. The average does invent colours at block boundaries —
   pixelfort's sixteen become 17–21 bins on the copy — which is why the
   plan's palette line (24) is read with that in mind, below.

   THE LUMA PLANE. Every edge statistic runs on one grey plane per picture:
   Rec. 709's 0.2126 R + 0.7152 G + 0.0722 B over the ENCODED 8-bit values
   (÷ 255), not over linearised light. The choice is deliberate: the plan's
   thresholds are perceptual ("luminance under 0.25" means ink, "Sobel over
   0.2" means an edge you can see), and in linear light a black outline on
   a dark navy is a step of 0.02 that no threshold written for a light page
   would catch, while on the encoded plane it is the same 0.2 step it is to
   the eye. Phase 0's "mean relative luminance 0.02–0.03" for neonrun was
   linear; on this plane the same plates have a median luma of 0.078, still
   far under DARK_LUMA, and every number below is quoted on this plane.
   Sobel magnitudes are the raw 3 × 3 kernel's (the horizontal and vertical
   responses' hypotenuse, up to 4√2 on a unit step), the convention Phase
   0's numbers used (mosslight p99 0.126, neonrun 1.1–2.1; here, on the
   copy, 0.117–0.119 and 0.88–1.77).

   THE STATISTICS, one by one, with the numbers and where each came from.
   Every fixture number below was measured on 2026-09-07 by
   perf/test-style.js on the three fixtures make-fixtures.js draws
   (pixelfort: four 640 × 360 shots on a 4-px grid with 4-px black
   outlines; mosslight: four 960 × 540 noise plates with a one-pixel column
   weave; neonrun: four 960 × 540 near-black plates with glowing 1.2-px
   lines), and is in perf/results/style/summary.json. Where a line is
   thin, the margin is said.

   1. pixelSize. For each s from PIXEL_MIN 2 to PIXEL_MAX 16 (the schema's
      range for `pixel`, Appendix A) — and one past it, so 16 has a
      neighbour — shrink the native picture by s nearest-neighbour (each
      block's centre pixel), re-enlarge by s the same way, and take the
      mean absolute RGB error against the original over every channel of
      every pixel, ÷ 255. Art drawn on an s-px grid has an error of exactly
      0 at s and at every divisor of s, and a clearly positive one at every
      other size: pixelfort measures 0.0000 at s = 2 and 4 on all four
      shots, 0.0139–0.0175 at 3, 0.0204–0.0255 at 5, and 0.026 or more from
      6 up. PIXEL_FLOOR 0.02 is the plan's own line (§7 step 1: "under 2 %
      of full scale"). The plan then says everything else "stays above 6 %
      everywhere", and that is NOT what soft pictures do: mosslight's
      curve runs 0.0052–0.0115 across the whole range, neonrun's starts at
      0.0099–0.0114 (s = 2) and a plain linear gradient's at 0.0020 — all
      under the floor, all with shallow dips (mosslight 0.0098 between two
      0.0101s at s = 9, neonrun 0.0199 between 0.0228 and 0.0262 at s = 7
      on its third shot, the gradient 0.0016 at s = 3 beside 0.0020). A
      floor alone read mosslight as a 16-px grid and the gradient as an
      11-px one. So a size is reported only where the curve has a DEEP
      minimum: the error at s must be under PIXEL_DIP 0.5 of the error at
      s + 1 AND under 0.5 of the error at s − 1 — a grid drops the curve
      to 0 against neighbours of 0.014–0.026 (ratio 0), while the deepest
      dip any soft plate made was 0.80 of its neighbour (the gradient at
      s = 3; mosslight's and neonrun's were 0.87–0.97), so a half is 1.6 ×
      clear of the worst of them and a flat plate, 0 at every s, has no
      minimum at all (0 is not under 0.5 × 0) and reads 0. At s = 2 the
      lower neighbour is s = 1, the identity, whose error is 0 for every
      picture, so there only the upper side is tested: a 2-px grid reads 2
      (the test shrinks pixelfort ×2 and checks), and the gradient (0.0020
      against 0.0016 at 3) and neonrun (0.0106 against 0.0150) are refused
      by the depth rule as they should be. Which s is reported is the
      LARGEST that qualifies: 2 divides 4 and the error is 0 at both (the
      plan's "smallest" would read 2 on every 4-px game; CONTRACTS §4 says
      largest). Then the vote: each screenshot reads its own size and the
      game's is the size at least PIXEL_VOTES 2 of them agree on (the
      plan's "run on two screenshots and require agreement"); with a
      single screenshot there is nothing to disagree with and its reading
      stands. A grid that is offset from the picture's origin by less than
      s (a window frame in the capture) is not searched for; that is a
      known limit, and the vote is what covers a stray shot.

   2. outline. On the 512 copy: Sobel magnitude, and the strong edges are
      the top STRONG_SHARE 8 % of interior pixels by magnitude (the plan's
      number), provided the magnitude is over 0 at all — a flat picture has
      no strong edges rather than every pixel being one. `present` needs
      BOTH of the plan's conditions: at least DARK_SHARE 45 % of the
      strong-edge pixels have a luma under DARK_LUMA 0.25, AND the edge
      density — the share of interior pixels with a Sobel magnitude over
      EDGE_T 0.2 — is between DENSITY_MIN 2 % and DENSITY_MAX 18 %. The
      shares are averaged across the screenshots before the lines are
      applied, so one odd capture (a menu, a loading screen) shifts a mean
      rather than casting a vote. Measured: pixelfort's strong edges are
      0.4511–0.4633 dark (mean 0.4589) at a density of 0.1415–0.1617
      (mean 0.1521); neonrun's 0.6237–0.8639 dark (mean 0.7075 — the line
      cores are bright but the kernel is three wide and the ground beside
      every line is near-black) at 0.1136–0.1673 (mean 0.1496); mosslight's
      0.000 dark (nothing in it is under 0.25) at a density under 0.00005
      (the weave, averaged into the copy), refused by both conditions.
      THE THINNEST LINE IN THIS FILE is pixelfort's dark share: 0.459
      against the plan's 0.45. It is not luck but geometry — a black line
      on a colour puts one strong-edge pixel on each side of each of its
      two edges, so half of them are dark and half are not, and the copy's
      averaging pushes a few of the dark half over 0.25 — and it is the
      plan's line, left where the plan put it; a game whose outlines are
      dark grey rather than black, or whose fills also meet at hard edges,
      will read under it. pixelfort's density, 0.152 against the 0.18
      ceiling, says how close a busy pixel-art shot comes to "every pixel
      is an edge".
      DARK IS THE PIXEL'S OWN LUMA, not the darkest pixel of the 3 × 3
      window the Sobel kernel read. The window minimum was in this file
      until 2026-09-07 and it is not the same statistic: it counts BOTH
      sides of every dark-to-light edge, so it reads roughly twice the
      share — 0.9365 on pixelfort and 0.9755 on neonrun against the 0.4589
      and 0.7075 above — and DARK_SHARE 0.45, a line the plan wrote for the
      per-pixel share, then stops discriminating. Measured, by
      perf/attack-style.js: a plate of flat unaligned rectangles from a
      palette of five dark and five light colours with NO stroke anywhere
      reads a window share of 0.5007 and so `present` true at weight 0.9
      (ranking `outline-cartoon` first), against a per-pixel share of
      0.2902 that correctly says no outline; a real 6-px-black-stroke
      cartoon reads 0.4950 per-pixel and 0.9571 window, so the window rule
      leaves an outlined picture and a strokeless one on the same side of
      the line. The three fixtures' `present` is the same under either
      rule, which is why the goldens did not move when this was put back.
      `weight` is the width of the stroke, and it is measured on the
      NATIVE picture, as the header says: a 4-px outline must read 4, not
      3.2. The plan says "the median run length of dark-pixel runs crossing
      strong edges" and means the black line of a cartoon; taken literally
      on a neon plate it measures the GAPS — neonrun's dark runs between
      lines have a median of 11–14 px (weight 0.9, the opposite of the
      truth). So a run is a run of INK, and ink is the class that is drawn
      on the plate: the dark class (luma under DARK_LUMA) on a light plate,
      the bright class (at or over it) on a dark one, where the plate is
      dark when the pooled median luma of the screenshots is under
      DARK_LUMA (pooled, not voted: pixelfort's shots have medians of
      0.537, 0.259, 0.537 and 0.141 and pool to 0.537 — its night scene
      alone would flip to bright ink and read the 8-px runs between its
      outlines; mosslight pools to 0.533, neonrun to 0.078). A run is
      kept when it is bounded by a non-ink pixel at both ends, at most
      RUN_CAP 24 px long (a run longer than that is a region — a door, a
      shadow — not a stroke; pixelfort's abutting outlines make 8-px runs
      and nothing an outline draws needs three times that), and touches a
      strong-edge pixel (the native picture's own top 8 %). Its width is
      then the FULL WIDTH AT HALF DEPTH — the pixels of the run at least
      half way from the plate's median luma to the run's extreme — which
      is how the width of a line is always measured and is what keeps a
      glow from counting as the line: neonrun's bright runs are 2–3 px
      whole (the cyan lines' 3-px middle pass clears 0.25) and 2 px at
      half depth (the 1.2-px core, anti-aliased over two pixels); a
      16-colour picture has nothing half black, so pixelfort's runs are 4
      px either way (2 042–3 602 fours a shot against 532–709 eights at
      half depth; 12 003 fours pooled). The
      median then falls into the plan's buckets: 1–2 px → 0.3, 3–4 → 0.6,
      5 and over → 0.9. pixelfort reads 0.6, neonrun 0.3. Not present →
      weight 0; present with no measurable run (only regions) → 0.3, the
      thinnest thing an outline can be, so the stickers' lines stay light.

   3. paletteCount. On the 512 copy, over opaque pixels (alpha ≥ ALPHA_T
      16, Palette's line, so the two files agree on what a pixel is):
      posterise to POSTER_BITS 5 per channel (32 768 bins) and count the
      bins holding at least BIN_SHARE 0.1 % of the opaque pixels — both the
      plan's numbers. Aggregated as the LOWER MEDIAN over every picture
      (screenshots, key art and logos alike): a median because one
      photographic key art in a pixel game should not decide the palette,
      and the lower one because the schema wants an integer. pixelfort's
      pictures count 20, 21, 21, 17 (shots), 17 (key art) and 6 (logo) →
      17, its sixteen colours plus the copy's boundary mixes; mosslight's
      87, 59, 59, 55, 55, 6 → 55; neonrun's 61 × 4, 60, 10 → 61 (the sky
      and floor gradients). A logo counts few bins and pulls the median
      down one place, which is the direction a limited-palette game wants.

   4. saturation and contrast. A SAMPLE_N 4000-pixel sample of the 512
      copy's opaque pixels, drawn with Palette.rng(SAMPLE_SEED) so the
      sample — and so the stat — is the same on every run; each pixel to
      OKLCH through Palette.toOklch; saturation is the mean chroma,
      contrast the population standard deviation of L. saturation averages
      over every picture, one vote each; contrast over the screenshots
      only. Measured: pixelfort C 0.0704–0.1012 a shot, 0.0747 key art,
      0.0350 logo → 0.0760; mosslight 0.0652–0.0686, 0.0660, 0.0547 →
      0.0652 (muted greens and ochres); neonrun 0.0843–0.0878 a plate (a
      dark plate: the glow and the indigo sky are what colour it has —
      Phase 0 measured 0.084 on the hero alone, and CONTRACTS §2 says why
      Theme does not trust the pixel mean for a dark plate), 0.0843 key
      art, and 0.2050 for the logo, whose bright letters lift the mean to
      0.1051; contrast pixelfort 0.2048, mosslight 0.0627, neonrun 0.1161.

   5. hfEnergy. On the NATIVE picture: the 4-neighbour Laplacian of the
      luma plane, |Δ| averaged over the pixels that are NOT edges — Sobel
      under FLAT_T 0.05 at the pixel AND at its eight neighbours, i.e. the
      edge mask dilated by 1 px, so the aliasing along a thin neon line
      (which is over FLAT_T only on the line, and rings one pixel out) is
      not counted as texture — then divided by that screenshot's contrast
      (the plan's "normalised by contrast"; a picture with no contrast at
      all, under CONTRAST_EPS, reads 0 rather than 0/0). Averaged across
      the screenshots. Measured: mosslight 0.1289–0.2184 (mean 0.1601; the
      weave: |Δ| 0.0081–0.0118 raw over 0.042–0.078 of contrast), neonrun
      0.0055–0.0064 (mean 0.0058; the posterised gradients' steps),
      pixelfort 0.0000 (inside a 4 × 4 block nothing changes, and every
      block edge is under the dilated mask), the flat plate 0 and the
      gradient 0.0267 (its 8-bit steps over a contrast of 0.19).

   6. edgeDensity. The share of the 512 copy's interior pixels with a Sobel
      magnitude over EDGE_T 0.2, averaged across the screenshots — the same
      number the outline test gates on, reported on its own because the
      vision call and the tweak panel both want to say "busy".

   THE VECTOR (Appendix B), and the three lines the table leaves to be
   chosen. `saturation` is normalised from chroma SAT_LO 0.02 → 0 to SAT_HI
   0.2 → 1 (the table's own endpoints). "hfEnergy high" is HF_HIGH 0.1:
   mosslight's four plates are 0.129–0.218, all over it (the lowest by
   1.3 ×), and neonrun 0.0058, pixelfort 0 and the gradient 0.027 are
   under, so it sits nearer the low three (where a posterised gradient
   lives) than the geometric middle would, which is on purpose — texture
   is the claim that costs a page a paper overlay and a painterly preset.
   "saturation low" and "saturated" are ONE line seen from two sides,
   SAT_LINE 0.25 of the normalised scale (chroma 0.065): at or over it a
   plate is saturated, under it low. It sits at the quarter mark rather
   than at Theme's loud line (chroma 0.12, CONTRACTS §2) because a dark
   plate's pixel mean is held down by its near-black ground — neonrun's
   plates average 0.084 while its accents sit at 0.25 — and neonrun, at
   0.473 normalised, would fall under 0.556 and lose the glow and the
   scanlines that make it neon (by the table's arithmetic cel would then
   rank first, 1.6 against neon's 2.2). pixelfort is 0.311, the gradient
   0.012; mosslight's muted plate lands at 0.2511, on the line to the
   fourth place — nothing in its vector turns on it, since its texture is
   decided by hfEnergy, but a muted painted game is the case this line is
   least sure about. "dark + saturated" — the scanlines and the glow — is
   `dark` from the hint and saturated as above; "thin lines" is an outline
   present at weight 0.3. Shading takes the most decisive reading first — a
   pixel grid is dither, then high texture is painterly, then a palette
   under PAL_LIMITED 24 is cel with outlines and flat without, and
   everything else (a smooth, many-coloured, untextured picture — neonrun)
   is soft. Texture with high hfEnergy is paper on a light page and grunge
   on a dark one (the table offers both; grunge is the horror preset's).
   paletteSize is the table's ladder: under PAL_VERY 12 → 8, under 24 →
   16, else 0 — but only when the count is over ZERO. A paletteCount of 0
   is not a picture with no colours; it is a picture where no 5-bit bin
   held BIN_SHARE 0.1 % of the pixels because the colours are spread too
   thin for any of them to, which is the MANY-colour case wearing the
   many-colour number's opposite. Measured (perf/attack-style.js): a
   640 × 360 plate of bilinear value noise counts 0 bins holding 0.0000 of
   its pixels, and the ladder read literally gave it paletteSize 8 — the
   tightest quantisation in the table — and shading `flat`. So 0 takes the
   `else` branch: paletteSize 0 and shading `soft`. The three fixtures'
   counted bins hold 0.9942 / 0.9916 / 0.9624 of their pictures, so their
   numbers (17 / 55 / 61) mean what the ladder thinks they mean and none of
   them moved. A KNOWN LIMIT, not fixed here because no fixture calibrates
   it: a count of 1–11 whose bins cover only a sliver of the picture is the
   same inversion in miniature, and catching it needs the coverage share,
   which is not one of CONTRACTS §4's seven stats.
   `pixel` is pixelSize capped at the schema's 16. linePasses
   is 1 — the ink-sketch preset's 2 is the preset's, never measured.

   THE RANKING (Appendix C's weights, as the build order words them).
   Distance to a preset = 3.0 if |pixel − the preset's pixel| > 0, where
   the `pixel` preset's pixel is "the measured size" and so is never a
   mismatch (for a game with no grid it is 0 against 0, and that preset is
   then held off by its dither shading, its sixteen roles and its bare
   finish: 7.7 from mosslight, 5.4 from neonrun) + 2.0 if lineShow differs
   + 1.5 if shading differs + 1.0 if finish differs + 1.0 if texture
   differs + |lineWeight − proto| + |lineWobble − proto| + |corners −
   proto| + |paletteSize − proto| / 16. The last division is the one
   liberty taken with "everything else 1.0 × absolute difference":
   paletteSize is a count of roles, and a raw difference of sixteen would
   outweigh every other field put together, so it is scaled to the 0–1 the
   other fields live on. Ties keep the table's order. A measured grid puts
   `pixel` first regardless (plan §7 step 6), which the 3.0 already does.
   Measured on the fixtures, with `dark` from Theme's call on each key art
   (pixelfort's navy sky makes it a dark page): pixelfort → pixel 2.300
   (finish: the table's pixel preset has none, a dark page reads shadow;
   texture: dark and saturated reads scanlines against none; lineWeight
   0.6 against 0.9), then cel 7.000 and grunge 7.200 with the 3.0 on top;
   mosslight → painterly 2.600 (texture paper against the preset's canvas,
   finish diecut against shadow — the two things a light painterly plate
   is always charged — plus wobble and corners), flat 3.600, cozy-soft
   4.700; neonrun → neon 0.200 (corners 0.3 against 0.5 and nothing else),
   then cozy-soft 2.900, cel 3.600. The flat plate ranks flat 1.600, the
   gradient flat 2.700.

   NOT A BENCH FILE, and half of it not even a browser one: measure() and
   inspect() need a canvas (they draw an <img> to read its pixels), but
   vector(), rank(), forPreset() and PRESETS touch nothing, and
   tools/lib/browser-module.js loads this file against a bare `window` in
   Node for the ranking tests. window.Palette must be loaded first
   (Palette.rng, Palette.toOklch). One IIFE, one global, plan §0.3. */

window.Style = (function () {
  'use strict';

  // ── the numbers (each one's sentence is in the header) ───────────────
  const NATIVE_MAX = 1024;    // a long edge over this is NN-shrunk by floor(long / NATIVE_MAX) before the native reads
  const COPY_EDGE = 512;      // the long edge of the working copy (the plan's size)
  const ALPHA_T = 16;         // Palette's line: under this alpha a pixel is background
  const PIXEL_MIN = 2, PIXEL_MAX = 16;   // the sizes tried (the schema's range for `pixel`)
  const PIXEL_FLOOR = 0.02;   // shrink-and-re-enlarge error (of full scale) under which s is a candidate (plan §7.1)
  const PIXEL_DIP = 0.5;      // a candidate's error must be under this share of BOTH neighbours' (a deep minimum, not a dip in a soft curve)
  const PIXEL_VOTES = 2;      // screenshots that must agree on a size (plan §7.1)
  const STRONG_SHARE = 0.08;  // strong edges = the top 8 % of Sobel magnitude (plan §7.2)
  const DARK_LUMA = 0.25;     // a pixel under this luma is dark; a plate whose pooled median pixel is, is a dark plate (plan §7.2)
  const DARK_SHARE = 0.45;    // ≥ this share of strong-edge pixels dark → outlines (plan §7.2)
  const DENSITY_MIN = 0.02, DENSITY_MAX = 0.18;   // the edge-density window for outlines (plan §7.2)
  const EDGE_T = 0.2;         // Sobel over this = an edge pixel, for edgeDensity (Phase 0's convention)
  const FLAT_T = 0.05;        // Sobel under this = flat, for the texture mask (dilated by one pixel)
  const RUN_CAP = 24;         // an ink run longer than this is a region, not a stroke
  const WEIGHT_OF_RUN = [0, 0.3, 0.3, 0.6, 0.6];   // median run 1–2 → 0.3, 3–4 → 0.6, else WEIGHT_THICK (plan §7.2)
  const WEIGHT_THICK = 0.9;
  const WEIGHT_NO_RUN = 0.3;  // present, but only regions were measured: the thinnest an outline can be
  const POSTER_BITS = 5;      // paletteCount posterises to this many bits a channel (plan §7.3)
  const BIN_SHARE = 0.001;    // a bin under this share of the opaque pixels is not a colour (plan §7.3)
  const SAMPLE_N = 4000;      // pixels in the OKLCH sample (plan §7.4)
  const SAMPLE_SEED = 'style';// the seed the sample is drawn from, so the sample is the same every run
  const SAT_LO = 0.02, SAT_HI = 0.2;   // chroma → the vector's 0–1 saturation (Appendix B)
  const HF_HIGH = 0.1;        // hfEnergy at or over this is "high" (mosslight 0.129–0.218 over; the gradient 0.027 under)
  const SAT_LINE = 0.25;      // normalised saturation at or over this is "saturated", under it "low" (neonrun 0.473, pixelfort 0.311, mosslight 0.251)
  const PAL_LIMITED = 24, PAL_VERY = 12;   // the plan's palette lines (§7.3)
  const CONTRAST_EPS = 1e-4;  // under this contrast a picture is flat and hfEnergy is 0, not 0/0
  const DIGITS = 4;           // decimals kept in stats (enough to be stable, few enough to read)

  const P = () => { if (!window.Palette) throw new Error('Style: press/palette.js must be loaded first'); return window.Palette; };
  const round = v => Math.round(v * Math.pow(10, DIGITS)) / Math.pow(10, DIGITS);
  const mean = a => a.length ? a.reduce((s, v) => s + v, 0) / a.length : 0;
  const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;

  // ── reading a picture ────────────────────────────────────────────────
  // anything → { w, h, data: Uint8ClampedArray }, drawn once if it is not ImageData already
  function imageData(src) {
    if (!src) throw new Error('Style: no image');
    if (src.data && src.width > 0 && src.height > 0 && src.data.length === src.width * src.height * 4) return { w: src.width, h: src.height, data: src.data };
    const w = src.naturalWidth || src.videoWidth || src.width, h = src.naturalHeight || src.videoHeight || src.height;
    if (!(w > 0 && h > 0)) throw new Error('Style: image has no size (not decoded yet?)');
    const c = typeof OffscreenCanvas === 'function' ? new OffscreenCanvas(w, h) : Object.assign(document.createElement('canvas'), { width: w, height: h });
    const x = c.getContext('2d', { willReadFrequently: true });
    x.drawImage(src, 0, 0, w, h);
    const id = x.getImageData(0, 0, w, h);
    return { w, h, data: id.data };
  }

  // nearest-neighbour shrink by an integer factor: the pixel at the block's corner
  function shrinkNN(img, f) {
    if (f <= 1) return img;
    const w = Math.floor(img.w / f), h = Math.floor(img.h / f), out = new Uint8ClampedArray(w * h * 4), d = img.data;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const o = (y * w + x) * 4, i = ((y * f) * img.w + x * f) * 4;
      out[o] = d[i]; out[o + 1] = d[i + 1]; out[o + 2] = d[i + 2]; out[o + 3] = d[i + 3];
    }
    return { w, h, data: out };
  }

  // the 512 copy: an area average, alpha-weighted, in plain arithmetic (see the header)
  function copy512(img) {
    const long = Math.max(img.w, img.h);
    if (long <= COPY_EDGE) return img;
    const w = img.w >= img.h ? COPY_EDGE : Math.max(1, Math.round(img.w * COPY_EDGE / long));
    const h = img.h > img.w ? COPY_EDGE : Math.max(1, Math.round(img.h * COPY_EDGE / long));
    const out = new Uint8ClampedArray(w * h * 4), d = img.data, W = img.w, H = img.h;
    for (let y = 0; y < h; y++) {
      const y0 = Math.floor(y * H / h), y1 = Math.max(y0 + 1, Math.floor((y + 1) * H / h));
      for (let x = 0; x < w; x++) {
        const x0 = Math.floor(x * W / w), x1 = Math.max(x0 + 1, Math.floor((x + 1) * W / w));
        let r = 0, g = 0, b = 0, a = 0, n = 0;
        for (let yy = y0; yy < y1; yy++) for (let xx = x0; xx < x1; xx++) {
          const i = (yy * W + xx) * 4, al = d[i + 3];
          r += d[i] * al; g += d[i + 1] * al; b += d[i + 2] * al; a += al; n++;
        }
        const o = (y * w + x) * 4;
        if (a > 0) { out[o] = Math.round(r / a); out[o + 1] = Math.round(g / a); out[o + 2] = Math.round(b / a); }
        out[o + 3] = Math.round(a / n);
      }
    }
    return { w, h, data: out };
  }

  // the luma plane (the header's THE LUMA PLANE)
  function luma(img) {
    const n = img.w * img.h, L = new Float32Array(n), d = img.data;
    for (let i = 0; i < n; i++) L[i] = (0.2126 * d[i * 4] + 0.7152 * d[i * 4 + 1] + 0.0722 * d[i * 4 + 2]) / 255;
    return L;
  }

  // Sobel magnitude over the interior; the 1-px border stays 0 and is not part of any population
  function sobel(L, w, h) {
    const M = new Float32Array(w * h);
    for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const tl = L[i - w - 1], t = L[i - w], tr = L[i - w + 1], l = L[i - 1], r = L[i + 1], bl = L[i + w - 1], b = L[i + w], br = L[i + w + 1];
      const gx = (tr + 2 * r + br) - (tl + 2 * l + bl), gy = (bl + 2 * b + br) - (tl + 2 * t + tr);
      M[i] = Math.sqrt(gx * gx + gy * gy);
    }
    return M;
  }
  function interior(M, w, h) {                       // the interior values, for percentiles
    const out = new Float32Array(Math.max(0, (w - 2) * (h - 2)));
    let k = 0;
    for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) out[k++] = M[y * w + x];
    return out;
  }
  function percentile(sorted, q) {                   // q in [0,1] of an ascending array; 0 when empty
    if (!sorted.length) return 0;
    return sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))];
  }

  // ── 1 · the pixel grid ───────────────────────────────────────────────
  // the shrink-and-re-enlarge error at one s: every pixel against its block's centre pixel, mean |RGB| ÷ 255
  function shrinkError(img, s) {
    const W = img.w, H = img.h, d = img.data, half = s >> 1;
    let sum = 0;
    for (let y = 0; y < H; y++) {
      const sy = Math.min(H - 1, Math.floor(y / s) * s + half);
      for (let x = 0; x < W; x++) {
        const sx = Math.min(W - 1, Math.floor(x / s) * s + half);
        const o = (y * W + x) * 4, i = (sy * W + sx) * 4;
        sum += Math.abs(d[o] - d[i]) + Math.abs(d[o + 1] - d[i + 1]) + Math.abs(d[o + 2] - d[i + 2]);
      }
    }
    return sum / (W * H * 3 * 255);
  }
  function pixelErrors(img) {                        // errs[s] for s in 1..PIXEL_MAX+1 (index = s); errs[1] is the identity, 0
    const errs = new Array(PIXEL_MAX + 2).fill(null);
    errs[1] = 0;
    for (let s = PIXEL_MIN; s <= PIXEL_MAX + 1; s++) errs[s] = shrinkError(img, s);
    return errs;
  }
  // the factor a big picture is read at: the largest from floor(long / NATIVE_MAX) down to 2 whose own shrink
  // KEEPS the picture (its error under PIXEL_FLOOR — it divides the grid, or there is no grid to fold); none → whole
  function nativeFactor(img) {
    const long = Math.max(img.w, img.h), tried = [];
    for (let f = long > NATIVE_MAX ? Math.floor(long / NATIVE_MAX) : 1; f >= 2; f--) {
      const e = shrinkError(img, f);
      tried.push({ f, error: round(e) });
      if (e < PIXEL_FLOOR) return { factor: f, tried };
    }
    return { factor: 1, tried };
  }
  // the largest s under the floor whose error is a DEEP local minimum: under PIXEL_DIP of the error at s + 1
  // and (past s = 2, whose lower neighbour is the identity) under PIXEL_DIP of the error at s − 1
  function pixelSizeOf(errs) {
    let best = 0;
    for (let s = PIXEL_MIN; s <= PIXEL_MAX; s++) {
      if (!(errs[s] < PIXEL_FLOOR)) continue;
      const hi = errs[s] < PIXEL_DIP * errs[s + 1];
      const lo = s === PIXEL_MIN || errs[s] < PIXEL_DIP * errs[s - 1];
      if (lo && hi) best = s;
    }
    return best;
  }
  function vote(sizes) {                             // the size at least PIXEL_VOTES screenshots agree on
    if (!sizes.length) return 0;
    if (sizes.length === 1) return sizes[0];
    const counts = new Map();
    for (const s of sizes) if (s > 0) counts.set(s, (counts.get(s) || 0) + 1);
    let best = 0, bestN = 0;
    for (const [s, n] of counts) if (n > bestN || (n === bestN && s > best)) { best = s; bestN = n; }
    return bestN >= Math.min(PIXEL_VOTES, sizes.length) ? best : 0;
  }

  // ── 2 · the outline ──────────────────────────────────────────────────
  function edgeStats(L, M, w, h) {                   // on the copy: strong-edge dark share, edge density, the percentiles
    const vals = interior(M, w, h).sort();
    const n = vals.length, strongT = percentile(vals, 1 - STRONG_SHARE), p99 = percentile(vals, 0.99);
    let strong = 0, dark = 0, edges = 0;
    for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
      const i = y * w + x, m = M[i];
      if (m > EDGE_T) edges++;
      // dark = THIS pixel's own luma, the plan's rule (§7 step 2) — not the darkest pixel of the 3 × 3 window
      // the kernel read, which counts both sides of every edge and roughly doubles the share (header §2)
      if (m > 0 && m >= strongT) { strong++; if (L[i] < DARK_LUMA) dark++; }
    }
    return { strongT, p99, strong, darkShare: strong ? dark / strong : 0, density: n ? edges / n : 0 };
  }
  function lumaHist(L) {                             // a 256-bin histogram of the plane
    const hist = new Uint32Array(256);
    for (let i = 0; i < L.length; i++) hist[Math.min(255, Math.max(0, Math.round(L[i] * 255)))]++;
    return hist;
  }
  function histMedian(hist) {                        // the lower median of a 256-bin luma histogram, as luma
    let total = 0;
    for (let b = 0; b < 256; b++) total += hist[b];
    if (!total) return 0;
    let acc = 0;
    const target = Math.floor((total - 1) / 2);
    for (let b = 0; b < 256; b++) { acc += hist[b]; if (acc > target) return b / 255; }
    return 0;
  }
  // on the native: runs of one class (dark, or bright) along rows and columns, bounded, ≤ RUN_CAP, touching a strong edge
  // → two histograms by length: the whole run, and the run at half depth (the pixels at least half way from the plate to the run's extreme)
  function runHistograms(L, M, w, h, plate) {
    const vals = interior(M, w, h).sort();
    const strongT = percentile(vals, 1 - STRONG_SHARE);
    const strong = i => M[i] > 0 && M[i] >= strongT;
    const out = { strongT, dark: new Uint32Array(RUN_CAP + 1), darkHalf: new Uint32Array(RUN_CAP + 1), bright: new Uint32Array(RUN_CAP + 1), brightHalf: new Uint32Array(RUN_CAP + 1) };
    const scan = (n, len, at, ink, hist, histHalf, bright) => {
      for (let line = 0; line < n; line++) {
        let k = 0;
        while (k < len) {
          if (!ink(at(line, k))) { k++; continue; }
          const start = k;
          let ext = L[at(line, k)];
          while (k < len && ink(at(line, k))) { const v = L[at(line, k)]; if (bright ? v > ext : v < ext) ext = v; k++; }
          const run = k - start;
          if (start === 0 || k === len || run > RUN_CAP) continue;      // touches the border, or a region
          let touched = false;
          for (let j = start - 1; j <= k && !touched; j++) if (strong(at(line, j))) touched = true;
          if (!touched) continue;
          hist[run]++;
          const halfT = (plate + ext) / 2;
          let half = 0;
          for (let j = start; j < k; j++) { const v = L[at(line, j)]; if (bright ? v >= halfT : v <= halfT) half++; }
          histHalf[half]++;
        }
      }
    };
    const dark = i => L[i] < DARK_LUMA, brightC = i => L[i] >= DARK_LUMA;
    scan(h, w, (y, x) => y * w + x, dark, out.dark, out.darkHalf, false);
    scan(w, h, (x, y) => y * w + x, dark, out.dark, out.darkHalf, false);
    scan(h, w, (y, x) => y * w + x, brightC, out.bright, out.brightHalf, true);
    scan(w, h, (x, y) => y * w + x, brightC, out.bright, out.brightHalf, true);
    return out;
  }
  function medianRun(hist) {                         // lower median of a length histogram (length ≥ 1); 0 when empty
    let total = 0;
    for (let l = 1; l < hist.length; l++) total += hist[l];
    if (!total) return 0;
    const target = Math.floor((total - 1) / 2);
    let acc = 0;
    for (let l = 1; l < hist.length; l++) { acc += hist[l]; if (acc > target) return l; }
    return 0;
  }
  const weightOfRun = run => run <= 0 ? WEIGHT_NO_RUN : run < WEIGHT_OF_RUN.length ? WEIGHT_OF_RUN[run] : WEIGHT_THICK;

  // ── 5 · texture ──────────────────────────────────────────────────────
  function laplacianOffEdges(L, M, w, h) {           // mean |Δ| where the pixel and its 8 neighbours are all under FLAT_T
    let sum = 0, n = 0;
    for (let y = 2; y < h - 2; y++) for (let x = 2; x < w - 2; x++) {
      const i = y * w + x;
      if (M[i] >= FLAT_T || M[i - 1] >= FLAT_T || M[i + 1] >= FLAT_T || M[i - w] >= FLAT_T || M[i + w] >= FLAT_T ||
          M[i - w - 1] >= FLAT_T || M[i - w + 1] >= FLAT_T || M[i + w - 1] >= FLAT_T || M[i + w + 1] >= FLAT_T) continue;
      sum += Math.abs(L[i - w] + L[i + w] + L[i - 1] + L[i + 1] - 4 * L[i]); n++;
    }
    return { lap: n ? sum / n : 0, counted: n };
  }

  // ── 3 · 4 · colours ──────────────────────────────────────────────────
  function opaqueIndex(img) {
    const n = img.w * img.h, d = img.data, idx = new Int32Array(n);
    let k = 0;
    for (let i = 0; i < n; i++) if (d[i * 4 + 3] >= ALPHA_T) idx[k++] = i;
    return idx.subarray(0, k);
  }
  function paletteCountOf(img, idx) {
    const bins = new Uint32Array(1 << (3 * POSTER_BITS)), d = img.data, shift = 8 - POSTER_BITS;
    for (let k = 0; k < idx.length; k++) {
      const o = idx[k] * 4;
      bins[((d[o] >> shift) << (2 * POSTER_BITS)) | ((d[o + 1] >> shift) << POSTER_BITS) | (d[o + 2] >> shift)]++;
    }
    const floor = idx.length * BIN_SHARE;
    let count = 0;
    for (let b = 0; b < bins.length; b++) if (bins[b] > 0 && bins[b] >= floor) count++;
    return count;
  }
  const hex2 = v => (v < 16 ? '0' : '') + v.toString(16);
  function sampleOklch(img, idx) {
    if (!idx.length) return { saturation: 0, contrast: 0, meanL: 0, n: 0 };
    const rng = P().rng(SAMPLE_SEED), d = img.data;
    let sC = 0, sL = 0, sL2 = 0;
    for (let k = 0; k < SAMPLE_N; k++) {
      const o = idx[Math.floor(rng() * idx.length)] * 4;
      const c = P().toOklch('#' + hex2(d[o]) + hex2(d[o + 1]) + hex2(d[o + 2]));
      sC += c.C; sL += c.L; sL2 += c.L * c.L;
    }
    const mL = sL / SAMPLE_N;
    return { saturation: sC / SAMPLE_N, contrast: Math.sqrt(Math.max(0, sL2 / SAMPLE_N - mL * mL)), meanL: mL, n: SAMPLE_N };
  }

  // ── one picture ──────────────────────────────────────────────────────
  function inspect(src, role) {
    role = role || 'screenshot';
    const raw = imageData(src);
    const copy = copy512(raw);
    const idx = opaqueIndex(copy);
    const colour = sampleOklch(copy, idx);
    const out = {
      role, w: raw.w, h: raw.h, copy: { w: copy.w, h: copy.h },
      paletteCount: paletteCountOf(copy, idx), saturation: colour.saturation, contrast: colour.contrast, meanL: colour.meanL,
    };
    if (role !== 'screenshot') return out;
    const nf = nativeFactor(raw), factor = nf.factor;
    const nat = shrinkNN(raw, factor);
    const Ln = luma(nat), Mn = sobel(Ln, nat.w, nat.h);
    const Lc = copy === raw ? Ln : luma(copy), Mc = copy === raw ? Mn : sobel(Lc, copy.w, copy.h);
    const errs = pixelErrors(nat), size = pixelSizeOf(errs);
    const edges = edgeStats(Lc, Mc, copy.w, copy.h);
    const lh = lumaHist(Ln), plate = histMedian(lh);
    const runs = runHistograms(Ln, Mn, nat.w, nat.h, plate);
    const hf = laplacianOffEdges(Ln, Mn, nat.w, nat.h);
    const H = k => ({ hist: Array.from(runs[k]), median: medianRun(runs[k]) });
    out.native = { w: nat.w, h: nat.h, factor, tried: nf.tried };
    out.pixel = { errors: errs.slice(PIXEL_MIN, PIXEL_MAX + 1).map(e => round(e)), size: size * factor, sizeOnNative: size };
    out.edges = { strongT: round(edges.strongT), p99: round(edges.p99), strong: edges.strong, darkShare: round(edges.darkShare), density: round(edges.density) };
    out.plate = { medianLuma: round(plate), dark: plate < DARK_LUMA, hist: Array.from(lh) };
    out.runs = { strongT: round(runs.strongT), dark: H('dark'), darkHalf: H('darkHalf'), bright: H('bright'), brightHalf: H('brightHalf') };
    out.texture = { lap: round(hf.lap), counted: hf.counted, share: round(hf.counted / (nat.w * nat.h)), hfEnergy: colour.contrast < CONTRAST_EPS ? 0 : hf.lap / colour.contrast };
    return out;
  }

  // ── the game ─────────────────────────────────────────────────────────
  function measure(input, detail) {
    input = input || {};
    const shots = (input.screenshots || []).map(s => inspect(s, 'screenshot'));
    const arts = (input.keyart || []).map(s => inspect(s, 'keyart')).concat((input.logos || []).map(s => inspect(s, 'logo')));
    const all = shots.concat(arts);
    const darkShare = mean(shots.map(s => s.edges.darkShare)), density = mean(shots.map(s => s.edges.density));
    const present = shots.length > 0 && darkShare >= DARK_SHARE && density >= DENSITY_MIN && density <= DENSITY_MAX;
    // the plate: the pooled median luma of the screenshots; ink is the class drawn on it, read at half depth
    const pooled = new Uint32Array(256);
    for (const s of shots) for (let b = 0; b < 256; b++) pooled[b] += s.plate.hist[b];
    const plate = histMedian(pooled), darkPlate = plate < DARK_LUMA, ink = darkPlate ? 'brightHalf' : 'darkHalf';
    const hist = new Uint32Array(RUN_CAP + 1);
    for (const s of shots) for (let l = 0; l <= RUN_CAP; l++) hist[l] += s.runs[ink].hist[l];
    const run = medianRun(hist);
    const counts = all.map(a => a.paletteCount).sort((a, b) => a - b);
    const sizes = shots.map(s => s.pixel.size);
    if (detail && typeof detail === 'object') Object.assign(detail, { sizes, darkShare: round(darkShare), density: round(density), plate: round(plate), darkPlate, ink, run, runHist: Array.from(hist), paletteCounts: counts.slice() });
    return {
      pixelSize: vote(sizes),
      outline: { present, weight: present ? weightOfRun(run) : 0 },
      paletteCount: counts.length ? counts[Math.floor((counts.length - 1) / 2)] : 0,
      saturation: round(mean(all.map(a => a.saturation))),
      contrast: round(mean(shots.map(s => s.contrast))),
      hfEnergy: round(mean(shots.map(s => s.texture.hfEnergy))),
      edgeDensity: round(density),
    };
  }

  // ── the vector (Appendix B) ──────────────────────────────────────────
  function vector(stats, hints) {
    hints = hints || {};
    const dark = !!hints.dark;
    const pixel = Math.max(0, Math.min(PIXEL_MAX, Math.round(stats.pixelSize || 0)));
    const lineShow = !!(stats.outline && stats.outline.present);
    const lineWeight = lineShow ? +(stats.outline.weight || 0) : 0;
    const saturation = round(clamp01(((stats.saturation || 0) - SAT_LO) / (SAT_HI - SAT_LO)));
    const hfHigh = (stats.hfEnergy || 0) >= HF_HIGH;
    const saturated = saturation >= SAT_LINE, satLow = !saturated;
    const thin = lineShow && lineWeight <= 0.3;
    // a count of 0 is the MANY-colour case, not a two-colour one: no 5-bit bin held BIN_SHARE of the picture
    // because the colours are spread too thin for any of them to. `limited` is the plan's ladder read safely
    // (header: THE VECTOR, the paletteCount 0 line); a count of 0 is unlimited, and takes `soft` with it
    const count = stats.paletteCount || 0;
    const limited = count > 0 && count < PAL_LIMITED;
    return {
      lineShow,
      lineWeight,
      lineWobble: hfHigh && lineShow ? 0.5 : 0,
      linePasses: 1,
      corners: pixel > 0 ? 0 : (satLow && !hfHigh) ? 0.6 : 0.3,
      shading: pixel > 0 ? 'dither' : hfHigh ? 'painterly' : limited ? (lineShow ? 'cel' : 'flat') : 'soft',
      texture: hfHigh ? (dark ? 'grunge' : 'paper') : (dark && saturated) ? 'scanlines' : 'none',
      paletteSize: !limited ? 0 : count < PAL_VERY ? 8 : 16,
      pixel,
      saturation,
      finish: (dark && saturated && thin) ? 'glow' : !dark ? 'diecut' : 'shadow',
    };
  }

  // ── the presets (Appendix C, verbatim, in its order) ─────────────────
  const PRESETS = {
    //                 lineShow  weight  wobble  passes  corners  shading      texture      palette  pixel       finish     — typical games
    'pixel':           { lineShow: true,  lineWeight: 0.9,  lineWobble: 0,    linePasses: 1, corners: 0,   shading: 'dither',    texture: 'none',      paletteSize: 16, pixel: 'measured', finish: 'none'   }, // 2D pixel art
    'flat':            { lineShow: false, lineWeight: 0,    lineWobble: 0,    linePasses: 1, corners: 0.4, shading: 'flat',      texture: 'none',      paletteSize: 0,  pixel: 0,          finish: 'shadow' }, // clean vector, minimal
    'outline-cartoon': { lineShow: true,  lineWeight: 0.7,  lineWobble: 0.1,  linePasses: 1, corners: 0.6, shading: 'cel',       texture: 'none',      paletteSize: 0,  pixel: 0,          finish: 'diecut' }, // bold cartoon, comic
    'cel':             { lineShow: true,  lineWeight: 0.4,  lineWobble: 0,    linePasses: 1, corners: 0.3, shading: 'cel',       texture: 'none',      paletteSize: 0,  pixel: 0,          finish: 'shadow' }, // anime-style, toon shaded 3D
    'painterly':       { lineShow: false, lineWeight: 0.1,  lineWobble: 0.3,  linePasses: 1, corners: 0.5, shading: 'painterly', texture: 'canvas',    paletteSize: 0,  pixel: 0,          finish: 'shadow' }, // hand-painted, soft
    'ink-sketch':      { lineShow: true,  lineWeight: 0.5,  lineWobble: 0.6,  linePasses: 2, corners: 0.2, shading: 'hatch',     texture: 'paper',     paletteSize: 0,  pixel: 0,          finish: 'none'   }, // pen-and-ink, storybook
    'neon':            { lineShow: true,  lineWeight: 0.3,  lineWobble: 0,    linePasses: 1, corners: 0.5, shading: 'soft',      texture: 'scanlines', paletteSize: 0,  pixel: 0,          finish: 'glow'   }, // synthwave, cyberpunk
    'retro-print':     { lineShow: true,  lineWeight: 0.6,  lineWobble: 0.15, linePasses: 1, corners: 0.4, shading: 'halftone',  texture: 'paper',     paletteSize: 8,  pixel: 0,          finish: 'none'   }, // risograph, 60s print
    'grunge':          { lineShow: true,  lineWeight: 0.8,  lineWobble: 0.4,  linePasses: 1, corners: 0.1, shading: 'cel',       texture: 'grunge',    paletteSize: 0,  pixel: 0,          finish: 'shadow' }, // horror, metal
    'cozy-soft':       { lineShow: true,  lineWeight: 0.35, lineWobble: 0.25, linePasses: 1, corners: 0.9, shading: 'soft',      texture: 'paper',     paletteSize: 0,  pixel: 0,          finish: 'diecut' }, // cozy, farming, pastel
  };
  const ORDER = Object.keys(PRESETS);
  const W_PIXEL = 3.0, W_LINE = 2.0, W_SHADING = 1.5, W_FINISH = 1.0, W_TEXTURE = 1.0;   // Appendix C's weights

  function distance(v, p) {
    const pixel = v.pixel || 0, proto = p.pixel === 'measured' ? pixel : p.pixel;   // the pixel preset's grid is the measured one
    let d = 0;
    d += Math.abs(pixel - proto) > 0 ? W_PIXEL : 0;
    d += !!v.lineShow !== !!p.lineShow ? W_LINE : 0;
    d += v.shading !== p.shading ? W_SHADING : 0;
    d += v.finish !== p.finish ? W_FINISH : 0;
    d += v.texture !== p.texture ? W_TEXTURE : 0;
    d += Math.abs((v.lineWeight || 0) - p.lineWeight) + Math.abs((v.lineWobble || 0) - p.lineWobble) + Math.abs((v.corners || 0) - p.corners);
    d += Math.abs((v.paletteSize || 0) - p.paletteSize) / 16;
    return d;
  }
  function rank(v) {
    const scored = ORDER.map((id, i) => ({ preset: id, score: Math.round(distance(v, PRESETS[id]) * 1000) / 1000, i }));
    scored.sort((a, b) => a.score - b.score || a.i - b.i);
    if ((v.pixel || 0) > 0) {
      const k = scored.findIndex(e => e.preset === 'pixel');
      if (k > 0) scored.unshift(scored.splice(k, 1)[0]);
    }
    return scored.slice(0, 3).map(e => ({ preset: e.preset, score: e.score }));
  }
  function forPreset(preset, v) {
    const p = PRESETS[preset];
    if (!p) throw new RangeError('Style: no preset named ' + preset);
    v = v || {};
    return {
      preset,
      lineShow: p.lineShow, lineWeight: p.lineWeight, lineWobble: p.lineWobble, linePasses: p.linePasses,
      corners: p.corners, shading: p.shading, texture: p.texture, paletteSize: p.paletteSize,
      pixel: Math.max(0, Math.min(PIXEL_MAX, Math.round(v.pixel || 0))),
      saturation: round(clamp01(+v.saturation || 0)),
      finish: p.finish,
    };
  }

  return { measure, inspect, vector, rank, forPreset, PRESETS };
})();
