#!/usr/bin/env node
/* ─── BUILD-GAME ──────────────────────────────────────────────────────────
   press/tools/build-game.js — the generator (PRESS-TABLE-PLAN.md §9 5.2 and
   5.3). A bundle in — manifest, analysis, theme, style, layout, and the
   pictures — and a working bench out: games/<slug>/index.html, game.json
   (CONTRACTS.md §10) and art/*.webp|png. It is the ONE place a game page is
   written, and it is called from two:

     the door    site/serve.js's /_lab2/test/build requires this file and
                 calls build(bundle, { root: <absolute lab2/test> }). The
                 Press Table has already re-encoded its images in the
                 browser and sends them as base64 in bundle.images, keyed by
                 asset id; §5.3 says write those bytes as they are, so they
                 are written as they are — and read back far enough to prove
                 they are the picture the manifest says they are (WHAT A FILE OF
                 BYTES ACTUALLY IS, below).
     the line    node lab2/test/press/tools/build-game.js <fixture folder>
                 [--force] [--out <slug>]. No browser has touched these, so
                 this script does the encoding itself through a Playwright
                 page's canvas, the way press/tools/make-fixtures.js draws
                 the fixtures: there is no native image library in this repo
                 and none is to be added (§5.3).

   WHAT IT WILL NOT DO. It never overwrites games/<slug>/index.html unless
   the bundle says force — that page is one the owner may have arranged by
   hand through the save door, and it is the only thing here that can throw
   work away — and when it does force, it copies the page to
   index.html.keep-bak FIRST, every time. serve.js makes the same two checks
   before it ever loads this file (belt and braces: the builder is also run
   from a command line, where there is no server to check anything). It
   refuses a slug that is not ^[a-z0-9-]{2,40}$ — the manifest schema's own
   pattern, and the whole of the path-safety argument, since nothing in
   [a-z0-9-] is a separator, a dot or a drive letter. Every file goes out
   through <name>.tmp and a rename, so a half-written page is never on the
   disk under its own name. It deletes NOTHING, ever: a stray art file from
   an older build is reported, not removed.

   ── THE FOUR SECTION KINDS IT WRITES (§5.2, §3.7) ────────────────────────
   Every one of them is the five-line section the bench gives every feature
   (about.md §4; site/serve.js's copyMarkup, which is the second place that
   shape is written down and which this file matches line for line, blank
   line included, so a generated section and a pasted copy are the same
   markup):

     pic      a prop — .gz-art, no data-src — holding
              <svg viewBox="0 0 W H"><image href="art/x.webp" …>. W and H
              are the asset's PIXEL size and data-scale is the slot's, which
              is exactly what frames.js's art-panel path wants: natural() is
              (data-w × data-scale) and place() fits the drawing into the
              box (NOTES §C.3). ink.js reads any node inside the art with an
              ownerSVGElement as ink, so the picture's whole rectangle is its
              ink and ctrl-picking works on it with no special case
              (NOTES §D.6, plan §3.7).
     sticker  a kit-part section: data-src="../../features/stickers-core.dc.html#part=<ref>",
              plus data-text / data-palette / data-rot when the slot asks
              (CONTRACTS §7's spelling: double quotes on the tag, the JSON's
              own quotes as &quot;, rot to two decimals — serve.js's
              variantValue, verbatim).
     note     a prop whose svg holds one <text> per line, WRAPPED BY
              MEASURING (THE TEXT, below).
     sign     a prop whose svg holds the store links as anchors drawn as the
              dock's chips (THE SIGN, below).
     machine  not in v1 (plan §16 q3 — no trailer machine; the sign carries
              the trailer link instead). A slot asking for one is skipped
              with a warning and everything else is still built.

   ── THE SCREENSHOTS IN THEIR FRAMES: TWO SECTIONS, NOT ONE ──────────────
   press/recipes.js puts the screenshots in the frame stickers' IMAGE SLOTS —
   a sticker slot with `image: 'shot-1'` on it (CONTRACTS §13), which is
   §3.6's "a <rect> placeholder that the page MAY REPLACE with a clipped
   picture". The picture cannot go inside the sticker: a kit part may hold no
   <image> at all (ADDING.md §1.2), and kits.js rebuilds a sticker's .gz-art
   from the sheet every time it changes grade, so anything put in there is
   thrown away. So THE PAGE COMPOSES IT, which is what §3.6's "the page may
   replace" says: the frame section, and a `gz gz-pic gz-shot` prop beside
   it, positioned so the picture sits in the slot.

     WHERE THE RECT COMES FROM. press/tools/build-sheet.js reads every
     image-slot rect off the part it is drawn in and records it in the
     sheet's own data-props under `slots`, beside `tags` — {x, y, w, h, rot}
     in the part's 128 units. This file reads it back from the sheet
     (sheetSlots below), so the number it composes with came out of the same
     artifact kits.js rasterises, and a re-drawn part cannot leave a stale
     copy behind in a tool.

     THE MAPPING. A sticker slot is placed at (x, y) with data-scale s, so a
     point (u, v) of the part's 128 box is world (x + u·s, y + v·s). The rect
     is turned twice about the SAME centre — its own tilt inside the drawing
     (frame-polaroid's card is at −5°) and the section's data-rot, which
     kits.js applies as a CSS rotate about (P.w/2, P.h/2) = (64, 64) — so the
     two angles simply add, and the prop is cut to the axis-aligned BOX of
     the turned rect and draws the picture turned inside it. The prop's own
     svg works in the part's units (viewBox = that box) so every number in
     the markup is one you can find in the part file.

     COVER, NOT FIT. The picture is a nested <svg> with the asset's own
     viewBox and preserveAspectRatio="xMidYMid slice": the viewBox is scaled
     until it COVERS the slot's viewport and the overflow is clipped by that
     viewport, which is the crop a photo in a frame wants — a 16:9 shot in
     the polaroid's square window is cropped at the sides, not letterboxed.
     frames.js sizes the section itself the way it sizes any .gz-art prop
     (natural() = data-w × data-scale, place() fits the drawing into the box
     — NOTES §C.3), so nothing there changes.

     THE PICTURE GOES OVER THE FRAME. The image-slot layer is the LAST child
     of the part's svg and its rect is opaque {{ skPaper }}, so a frame drawn
     after the picture would cover it. The frame is written first and the
     picture second — markup order is pile order — and the frame still reads
     over the picture's edges because every part insets its image-slot rect
     INSIDE the outline that frames it (frame-film's cell is stroked at
     y 36 and its slot starts at 38, "so the picture does not sit on the
     inner half of that stroke and thin it"). So the border is on top of
     nothing and still surrounds the photograph.

     ROTATION IS KEPT. data-rot landed in kits.js in Phase 4b (ROT_MAX 45, a
     CSS rotate on the live svg and a turned draw into the sprite), so a
     recipe's ±2° on a frame is honoured and the picture is turned with it by
     the sum above. Nothing had to be dropped.

     WHAT IS STILL LOOSE, MEASURED (2026-09-07): kits.js re-cuts a sticker's
     box to the ALPHA box of the drawing plus its shadow, and a style whose
     `finish` is `glow` replaces the sheet's 6,7 drop-shadow with
     drop-shadow(0 0 6px), which spills on all four sides. On neonrun that
     moves the frame's 128 box 5 units right inside its own section (kits.js
     inkOrigin; measured left: 5px, data-w 134 → 141) where pixelfort
     (`pixel`) and mosslight (`painterly`) both measure 0. A prop has no such
     re-cut, so under a glow style the picture sits about 5 part-units — 17
     world units at scale 3.3, 6 screen px at the opening zoom — to the left
     of where the frame's cell ended up. The slot rect is inset inside the
     cell's outline by more than that on three of the five frames, so the
     picture stays inside the window; it is not centred in it. Closing it
     needs the ink box at build time, which means rasterising the part the
     way kits.js does, and that is a Phase 9 item, not a guess.

   Markup order is pile order on a bench, so the slots are written in z
   order (a slot with no z counts as 0, and equal z keeps the layout's own
   order — Array.prototype.sort is stable in Node ≥ 11), and `data-home-z` is
   the index of the SECTION in that stream and not the slot's own z: a framed
   screenshot is two sections where the layout had one slot, so the two
   numberings parted company the moment the picture was written, and it is
   the pile that has to be right. CONTRACTS §13's "z is 0…n−1, one per slot,
   and is the pile order" still holds of the layout; the page's z is 0…m−1
   over the sections, in the same order.

   ── THE PICTURES (§5.3) ──────────────────────────────────────────────────
   Long edge capped at 2048 for a hero and a key art, 1600 for a screenshot,
   1024 for a logo — the plan's three numbers; a key art is the poster
   recipe's hero, so it takes the hero's cap, and `misc` takes a
   screenshot's. Never enlarged: the cap is a ceiling, and a 640-px fixture
   plate stays 640. WebP at quality 0.86 (the plan's number) through
   canvas.toDataURL('image/webp', 0.86), which is Chrome's own encoder and
   is fine for it; PNG where alpha is needed, through the sixty-line writer
   in make-fixtures.js (required lazily, and the reason it is reused rather
   than copied: Chrome's PNG encoder made the same fixture plates two to
   three times bigger, that file measured it, and one encoder in the folder
   cannot drift from itself). ALPHA IS MEASURED, not believed: the page
   scans the drawn pixels and any alpha under 255 makes it a PNG, and a
   manifest that said otherwise gets a warning. A picture whose analysis
   says pixelSize > 0 is resized with smoothing OFF — a 4-px grid resampled
   bilinearly is a blur, and press/style.js measured that grid on the native
   image for the same reason (CONTRACTS §4).

   SIZES, MEASURED (2026-09-07, tools/test-build-game.js, and the reason the
   plan asks for them): the three fixtures' art folders come to 33 847 B
   (pixelfort), 136 162 B (mosslight) and 125 540 B (neonrun). Against the
   fixtures' own PNGs, WebP at 0.86 is HALF or better on a painterly or a
   neon plate — mosslight's shots 0.37–0.40×, its hero 0.50×, neonrun's
   0.39–0.45× — and LARGER on pixel art: pixelfort's 640 × 360 shots come
   out 1.55–1.75× their PNGs and its key art 1.37×, because a 16-colour
   4-px grid is what PNG's filters and zlib are best at and what a lossy
   codec has nothing to throw away in. The plan's rule stands (WebP unless
   alpha), and the number is written down here so the day somebody wants
   `pixel` art kept as PNG they have the measurement to argue it with. The
   three logos are alpha, so they are PNG through the same writer that made
   them and come out byte for byte the same size.

   ── THE TEXT: MEASURED, NOT GUESSED (§5.2's note) ────────────────────────
   The plan offers "the same canvas-measure wall.js uses, or a simple greedy
   wrap at 0.55 em average — measure, do not guess, and record which". THIS
   MEASURES. The same Playwright page that encodes the pictures loads the
   page's own --body face out of fonts/ as a FontFace from a data: URL (all
   the weights the folder has for that family, so the 700 a title is set in
   is the real 700 and not a synthesised one), sets ctx.font to the very
   string the <text> will carry, and measures every candidate line with
   measureText. Baselines come from the face too (fontBoundingBoxAscent),
   not from a fraction of the size.

   What the guess would have cost, measured here on 2026-09-07 at 100 px
   over a fixture's own description: Public Sans 400 averages 0.4527 em a
   character, Space Mono 400 exactly 0.6120 (it is monospaced), Kalam 400
   0.4225. The plan's 0.55 is 21 % wide for Public Sans and 10 % narrow for
   Space Mono — a paragraph that broke early on every line, or one that ran
   off the note. Those three numbers are also the FALLBACK table: if
   Playwright cannot launch (the door on a machine with no browser), the
   wrap falls back to the average advance for that family and says so in
   the warnings; the fallback is a measurement too, just a coarser one.

   THE SIZES ARE THE RECIPE'S, THE BREAKS ARE THIS FILE'S. press/recipes.js
   lays a note out at the wall note's proportions taken up to a game page's
   opening zoom — 34 px body, 85 title, 45 tagline, line-height 1.32,
   18 × 14 of padding — and scales the lot with the composition, which is a
   design decision and stays that file's; its header says in as many words
   that it cannot measure and that the generator should. So this reads
   NOTE and CHIP straight out of it (recipeNumbers(), with copies at the top
   of this file for a door bundle on a machine that has not got it), sets
   the type at those sizes, and measures where every line breaks and how
   tall the block came out. The section is cut to the width the recipe gave
   by the height that measurement made — which is why the boxes in game.json
   and the boxes on the page differ by a few units, and the difference is
   worth knowing: measured against the 0.55-em estimate, mosslight's title
   note came out 144 against 144 and its description 134 against 163, while
   pixelfort's description came out 250 against 221 — the estimate is high
   for Public Sans (0.4527) and low for Space Mono (0.6120), exactly as the
   two advances predict.

   ONE <text> PER LINE, with an absolute y, and no <tspan dy=> chain. Two
   reasons, in order: the page already does it that way (index.html's
   caption prop is two <text> elements at y 84 and 150, and a game page's
   props are that prop with different words), and a dy chain is relative —
   one empty line, one line the wrap did not produce, and every baseline
   under it moves, where an absolute y is where it says it is. The cost is
   an element per line rather than a tspan per line, which on the longest
   fixture note is eight elements.

   ── THE SIGN ─────────────────────────────────────────────────────────────
   The store links, drawn as the chip the bench already has: lab.css's
   .gz-poster b, the little pill a frame wears while its feature is waking
   up — 10 px of --mono, uppercase, .18 em of tracking, var(--card) inside a
   1.5 px var(--ink-2), border-radius 999 (a pill: the radius is half the
   height) and a 0 2px 0 shadow under it. press/recipes.js scaled that chip
   ×3 to stand beside a 30-px note (its CHIP: size 30, padding 36 × 15,
   border 4.5, gap 19) and measured the sign's box with it, so those are the
   numbers drawn here, from that file. The shadow is a second rounded rect
   two units down; the labels and their order are recipes.js's LINKS, so the
   words drawn are the words it measured.

   THEY ARE SVG ANCHORS, not HTML ones, and that is deliberate: an <a>
   inside the svg is ink to ink.js (any node with an ownerSVGElement —
   NOTES §D.6), so ctrl-picking a sign picks the sign, where an HTML anchor
   in the .gz-art would be invisible to it; and the box the section is cut
   to is the box the measurement gives, with no line-height of the page's to
   fight (.gz zeroes it — lab.css line 317). lab.js's NODRAG list is
   'button,a,input,select,textarea,[data-nodrag]' (lab.js line 1365) and an
   SVG anchor's local name is `a`, so closest('a') already finds it and a
   press on a link never starts a drag: data-nodrag was NOT needed, and the
   plan says to write it anyway, so every anchor carries both.

   ── WHAT IT ALSO WRITES, AND WHY ─────────────────────────────────────────
   games/<slug>/posters/index.json, two bytes of '{}', when the folder has
   not got one. frames.js fetches 'posters/index.json' relative to the page
   the moment it runs and nothing boots until that answers; without the file
   every load of a game page carries a 404 (measured — it was the only one
   the first built page made). Never overwritten: perf/posters.js writes the
   real thing there once a page has a machine (plan §5.4.4).

   ── WHAT IT RETURNS ──────────────────────────────────────────────────────
   { ok, slug, warnings: [string…], files: [path relative to lab2/test…] },
   plus `art` (a row per picture: file, w, h, bytes, the source's bytes, ms
   and what happened to it), `sections` (a count per kind) and `type` (the
   face, whether it was measured, and every note's numbers) for a test to
   print — tools/test-build-game.js prints all three. A refusal is
   { ok: false, error, … }
   and not a throw, because serve.js turns ok:false into a 400 and a throw
   into a 500, and a page that exists is not a server error.
   ───────────────────────────────────────────────────────────────────────── */
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const IMG = require('./lib/imagebytes.js');       // the folder's one reader of image headers

const HERE = __dirname;                                   // …/press/tools
const TEST = path.resolve(HERE, '..', '..');              // …/lab2/test

/* ── the constants, and where each came from ───────────────────────────── */

const SLUG_RE = /^[a-z0-9-]{2,40}$/;                      // manifest.schema.json's own pattern (Appendix A)

// §5.3's three caps. keyart takes the hero's — it IS the poster recipe's
// hero — and misc takes a screenshot's, being the only role left.
const CAP = { logo: 1024, hero: 2048, keyart: 2048, screenshot: 1600, misc: 1600 };
const WEBP_Q = 0.86;                                      // §5.3, verbatim
const MIN_EDGE = 16;                                      // manifest.schema.json: w/h minimum 16

// A sticker's box: the sheet's 128-unit svg plus the root drop-shadow's
// spill, 6 right and 7 bottom (CONTRACTS §8; kits.js SHEETS.stickers.spill,
// the same pair the whole kit shares because every part is 128 square).
const SK_BOX = 128, SK_SPILL_R = 6, SK_SPILL_B = 7;
const ROT_MAX = 45;                                       // kits.js ROT_MAX: past a quarter turn a sticker is a different drawing

/* THE TYPE AND THE CHIP ARE THE RECIPE'S, and these are only what stands
   in when press/recipes.js is not on the disk (a bundle posted at the door
   carries a layout, not the module that made it). Every number is that
   file's, which took them from the bench and then corrected them TWICE by
   looking at a page: a note is the wall note (line-height 1.32, 12 × 9 of
   padding at its own 22 px — lab.css .wall-note / .wall-note-in) set at 34
   rather than 22, because a game page frames its whole composition where
   the bench frames its paper at 0.72, and 22 came out as 7.4–8.6 px of type
   and then 30 as 8.6 px on the poster at the 1366 × 768 plan §9 5.5 judges
   on (recipes.js's NOTE says the whole of it, and perf/verify-game.js is
   where both numbers were read); and a chip is the poster chip (10 px mono,
   5 × 12 padding, a 1.5 border and a pill radius — lab.css .gz-poster b) at
   ×3.4, the multiplier being the note's body, which is what puts its words
   on the same paper as the note's. A note slot carries `size`: the body size
   the recipe laid the page out at, and the title and the tagline follow it
   in proportion. */
const NOTE = { body: 34, title: 85, tagline: 45, line: 1.32, em: 0.55, padX: 18, padY: 14, gap: 18 };
const CHIP = { size: 34, line: 1.2, padX: 41, padY: 17, border: 5, gap: 21 };
const LINKS = { steam: 'Steam', itch: 'itch.io', site: 'Website', press: 'Press kit', trailer: 'Trailer' };
const LINK_ORDER = ['steam', 'itch', 'site', 'press', 'trailer'];
const CHIP_TRACK = 0.18;      // lab.css .gz-poster b's letter-spacing, .18em, the tracking that makes a mono word a chip
const CHIP_LIFT = 2;          // …and its box-shadow, 0 2px 0: a second rect 2 under the first, at the chip's own scale
const NOTE_WIDTH = 560;       // Appendix E's narrowest note, for a slot that gives no width

/* The measured average advance per character, in em, at 100 px over a
   fixture description (2026-09-07 — see THE TEXT). Used ONLY when no
   browser can be launched, and the plan's 0.55 is the last resort for a
   face nobody has measured. Two families cover every pairing's body today
   (press/fonts.js: Public Sans, or Space Mono for `pixel` and `scifi`);
   Kalam is here because it is the third face a note could plausibly be set
   in and it was on the harness anyway. */
const FALLBACK_ADVANCE = { 'Public Sans': 0.4527, 'Space Mono': 0.6120, 'Kalam': 0.4225 };
const FALLBACK_ADVANCE_DEFAULT = 0.55;                    // plan §5.2's own guess, kept for an unmeasured face
const FALLBACK_ASCENT = 0.8;                              // ascent as a share of the size, when the face cannot be asked

/* serve.js's three constants, verbatim (site/serve.js lines 124–126). A
   generated page carries the copies block so keep.js can append to it, and
   the anchor is the line ensureBlock looks for. The test asserts these are
   byte-identical to serve.js's. */
const MARK_TOP = '<!-- ▼ copies written down by keep.js — see THE COPIES BLOCK in about.md -->';
const MARK_END = '<!-- ▲ copies written down by keep.js -->';
const ANCHOR = '  </div><!-- /bench-world -->';

/* The placeholders games/_template.html actually carries (read off it,
   2026-09-07 — the plan §5.1 called the opening rectangle {{OPENING_RECT}}
   and the template calls it {{OPEN}} / {{OPEN_NARROW}}, so both spellings
   are filled and the template's is the one that has to be there). REQUIRED
   is the set a page cannot be a page without; the rest are filled when the
   template asks for them and never missed when it does not. */
const REQUIRED_PLACEHOLDERS = ['{{SECTIONS}}', '{{TOKENS_CSS}}', '{{TITLE}}', '{{OPEN}}'];

/* The bench's narrow opening aspect — lab.js's NARROW rectangle, 1250 × 1390
   (NOTES §D.2; the plan's 1848 × 1928 is stale). Used only when a layout
   hands no narrow rectangle of its own: the wide one is cropped to this
   aspect about the composition's spine, keeping its full height, so a phone
   opens on the middle of the page rather than on the paper beside it. */
const NARROW_ASPECT = 1250 / 1390;

/* ── small helpers ────────────────────────────────────────────────────── */

// site/serve.js's esc and num, verbatim: the two files write the same markup
// and an attribute has to be escaped the same way in both.
const esc = s => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const num = (v, d) => (Number.isFinite(+v) ? Math.round(+v) : d);

const sha256 = buf => crypto.createHash('sha256').update(buf).digest('hex');
/* An aria-label for a note: the words themselves, cut at a word boundary
   rather than mid-syllable, because a screen reader announcing "…is a w" is
   worse than one announcing a sentence and a half. */
function label80(text) {
  const s = String(text).replace(/\s+/g, ' ').trim();
  if (s.length <= 80) return s;
  const cut = s.slice(0, 80);
  return cut.slice(0, Math.max(40, cut.lastIndexOf(' '))).trim() + '…';
}
const rel = (root, p) => path.relative(root, p).split(path.sep).join('/');

/* write through <name>.tmp and rename, so nothing is ever half-written under
   its own name (site/serve.js's save() does the same). */
function writeThroughTmp(file, data) {
  const tmp = file + '.tmp';
  fs.writeFileSync(tmp, data);
  fs.renameSync(tmp, file);
  return file;
}

/* ── THE SCHEMAS ──────────────────────────────────────────────────────────
   press/schemas/*.json read through press/tools/lib/validate.js — its own
   two calls, loadDir(dir) for the pool and check(data, name, pool) for a
   list of {path, message} (an empty list is the only thing that means
   valid). Both files are another builder's, so this one requires them
   LAZILY and degrades with a loud warning when they are not there: a
   generator that cannot run until a validator lands is a generator nobody
   can test. Nothing is written while an error stands. */
function loadSchemas(root, warnings) {
  let V;
  try { V = require('./lib/validate.js'); }
  catch (e) {
    warnings.push('schemas NOT checked: press/tools/lib/validate.js is missing (' + String((e && e.code) || e) + ')');
    return null;
  }
  if (!V || typeof V.check !== 'function' || typeof V.loadDir !== 'function') {
    warnings.push('schemas NOT checked: lib/validate.js exposes no check()/loadDir()');
    return null;
  }
  try { return { V, pool: V.loadDir(path.join(root, 'press', 'schemas')) }; }
  catch (e) { warnings.push('schemas NOT checked: ' + String((e && e.message) || e)); return null; }
}

/* → an array of message strings, empty when the object is good (or when
   there was nothing to check it against). */
function validateOne(schemas, name, data, label) {
  if (!schemas) return [];
  let out;
  try { out = schemas.V.check(data, name + '.schema.json', schemas.pool); }
  catch (e) { return [label + ': ' + String((e && e.message) || e)]; }
  if (!Array.isArray(out) || !out.length) return [];
  return out.map(e => label + (e.path ? (e.path.charAt(0) === '[' ? '' : '.') + e.path : '') + ': ' + (e.message || JSON.stringify(e)));
}

/* ── WHAT A FILE OF BYTES ACTUALLY IS ─────────────────────────────────────
   The door's pictures arrive already encoded and are written as they are
   (§5.3), so the only way to know that art/logo.png is a 1024-px PNG is to
   read its header — and lib/imagebytes.js is the folder's reader for that
   (magic bytes, never a file name; PNG's IHDR, JPEG's walked frame header,
   WebP's RIFF chunks). It is used here rather than copied: one reader in
   the folder cannot drift from itself.

   It answers type and size and stops short of the pixels, so ALPHA is the
   one fact this file adds, and only from the container: a PNG's colour type
   at byte 25 (6 and 4 carry alpha; 3 carries it in a tRNS chunk), WebP's
   VP8X flag bit 0x10 or a VP8L bit-stream's alpha bit, and false for a
   lossy VP8 or a JPEG, neither of which can hold one. The re-encoding road
   does not need this: it counts the drawn pixels (THE PICTURES). */
function alphaOf(buf, type) {
  if (type === 'png') {
    const c = buf[25];
    if (c === 6 || c === 4) return true;
    if (c !== 3) return false;
    let pos = 8;
    while (pos + 8 <= buf.length) {
      const len = buf.readUInt32BE(pos), name = buf.toString('latin1', pos + 4, pos + 8);
      if (name === 'tRNS') return true;
      if (name === 'IDAT' || name === 'IEND') return false;
      pos = pos + 12 + len;
    }
    return false;
  }
  if (type === 'webp') {
    const fourcc = buf.toString('latin1', 12, 16);
    if (fourcc === 'VP8X') return !!(buf[20] & 0x10);
    if (fourcc === 'VP8L' && buf.length >= 25 && buf[20] === 0x2f) return !!((buf.readUInt32LE(21) >>> 28) & 1);
    return false;
  }
  return false;
}

/* → { type, ext, mime, w, h, longEdge, alpha } or null for bytes that are
   not one of the three formats (imagebytes throws; a null is easier to
   answer with here, and the message it threw is not more than "not one of
   the three"). */
function readImage(buf) {
  if (!Buffer.isBuffer(buf) || !buf.length) return null;
  let r;
  try { r = IMG.read(buf); } catch (e) { return null; }
  return { type: r.type, ext: IMG.EXT[r.type], mime: IMG.MIME[r.type], w: r.w, h: r.h, longEdge: r.longEdge, alpha: alphaOf(buf, r.type) };
}

/* ── THE PAGE: one Playwright page for the pictures AND the type ──────────
   Opened once per build, lazily, and only when there is something for it to
   do. Headless system Chrome through the same channel every tool in this
   folder uses (NOTES §D.9): rendering and measuring only, so unlike the
   perf probes it need not be headed. */
function makeStudio(warnings) {
  let browser = null, page = null, failed = null;
  const faces = new Set();

  async function open() {
    if (page || failed) return page;
    try {
      const { chromium } = require('playwright');
      browser = await chromium.launch({ channel: 'chrome', headless: true });
      page = await browser.newPage();
      await page.setContent('<!doctype html><meta charset="utf-8"><title>build-game</title>');
      page.on('pageerror', e => warnings.push('the build page threw: ' + String((e && e.message) || e)));
    } catch (e) {
      failed = String((e && e.message) || e);
      warnings.push('no browser: ' + failed);
      page = null;
    }
    return page;
  }

  async function close() {
    if (browser) { try { await browser.close(); } catch (e) { /* a closed browser is closed */ } }
    browser = null; page = null;
  }

  /* Re-encode one picture. `bytes` is the source file's bytes, whatever it
     is; `cap` the long edge; `nearest` true for a pixel grid. Comes back
     { buf, w, h, alpha, ext, ms } or null when there is no browser. */
  async function encode(bytes, mime, cap, nearest) {
    const p = await open();
    if (!p) return null;
    const t0 = Date.now();
    const src = 'data:' + mime + ';base64,' + bytes.toString('base64');
    const out = await p.evaluate(async ({ src, cap, nearest, q }) => {
      const img = new Image();
      await new Promise((res, rej) => { img.onload = res; img.onerror = () => rej(new Error('the picture did not decode')); img.src = src; });
      if (img.decode) { try { await img.decode(); } catch (e) { /* decoded on load already */ } }
      const nw = img.naturalWidth, nh = img.naturalHeight;
      const long = Math.max(nw, nh);
      const k = long > cap ? cap / long : 1;                    // a cap is a ceiling: never enlarge
      const w = Math.max(1, Math.round(nw * k)), h = Math.max(1, Math.round(nh * k));
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      const x = c.getContext('2d', { willReadFrequently: true });
      x.imageSmoothingEnabled = !nearest;
      if (!nearest) x.imageSmoothingQuality = 'high';
      x.clearRect(0, 0, w, h);
      x.drawImage(img, 0, 0, w, h);
      const d = x.getImageData(0, 0, w, h).data;
      let alpha = false;
      for (let i = 3; i < d.length; i += 4) if (d[i] !== 255) { alpha = true; break; }
      if (alpha) {                                              // PNG, and Node writes it
        let bin = '';
        const chunk = 0x8000;
        for (let i = 0; i < d.length; i += chunk) bin += String.fromCharCode.apply(null, d.subarray(i, Math.min(i + chunk, d.length)));
        return { w, h, alpha: true, rgba: btoa(bin), scaled: k !== 1, from: [nw, nh] };
      }
      const url = c.toDataURL('image/webp', q);
      return { w, h, alpha: false, webp: url.slice(url.indexOf(',') + 1), scaled: k !== 1, from: [nw, nh] };
    }, { src, cap, nearest: !!nearest, q: WEBP_Q });

    if (out.alpha) {
      const { encodePNG } = require('./make-fixtures.js');       // one PNG writer in this folder, and this is it
      const rgba = Buffer.from(out.rgba, 'base64');
      return { buf: encodePNG(out.w, out.h, rgba, true), w: out.w, h: out.h, alpha: true, ext: 'png', from: out.from, ms: Date.now() - t0 };
    }
    return { buf: Buffer.from(out.webp, 'base64'), w: out.w, h: out.h, alpha: false, ext: 'webp', from: out.from, ms: Date.now() - t0 };
  }

  /* Load a family's faces into the page from fonts/, so a measurement is
     the page's own metrics and not a fallback's. Every weight the folder
     has under <Family-with-dashes>-<weight>.woff2 — the naming fonts.css
     and press/fonts.js both follow. */
  async function useFamily(family, root) {
    const p = await open();
    if (!p || faces.has(family)) return !!p;
    const dashed = family.replace(/\s+/g, '-');
    const dir = path.join(root, 'fonts');
    const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter(f => new RegExp('^' + dashed + '-\\d+\\.woff2$').test(f)) : [];
    if (!files.length) return false;
    for (const f of files) {
      const weight = /-(\d+)\.woff2$/.exec(f)[1];
      const b64 = fs.readFileSync(path.join(dir, f)).toString('base64');
      await p.evaluate(async ({ family, weight, b64 }) => {
        const face = new FontFace(family, 'url(data:font/woff2;base64,' + b64 + ')', { weight: weight });
        await face.load();
        document.fonts.add(face);
      }, { family, weight, b64 });
    }
    faces.add(family);
    return true;
  }

  /* THE ONE MEASURING CALL. `job` is { font, track, strings, wrap: {text,
     width} }: every string is measured, and when `wrap` is there the greedy
     break is done IN THE PAGE, so a paragraph costs one round trip and not
     one per word. `track` is letter-spacing in em (the chip's .18); Chrome
     has had ctx.letterSpacing since 99, and if it ever has not, the tracking
     is added by hand — one advance per character, which is what the property
     does — and `tracked` says which happened.

     A line is measured WHOLE, so the kerning and the space's own advance are
     in the number rather than summed from parts. */
  async function measure(job) {
    const p = await open();
    if (!p) return null;
    return p.evaluate(({ font, track, strings, wrap }) => {
      const c = document.createElement('canvas'), x = c.getContext('2d');
      x.font = font;
      const size = parseFloat(font.match(/(\d+(?:\.\d+)?)px/)[1]);
      const has = 'letterSpacing' in x;
      if (track && has) x.letterSpacing = (track * size) + 'px';
      const width = s => x.measureText(s).width + (track && !has ? track * size * s.length : 0);
      const m0 = x.measureText('Hxlp');
      const out = {
        widths: (strings || []).map(width),
        ascent: m0.fontBoundingBoxAscent || m0.actualBoundingBoxAscent,
        descent: m0.fontBoundingBoxDescent || m0.actualBoundingBoxDescent,
        tracked: !track ? 'none' : (has ? 'ctx.letterSpacing' : 'by hand'),
        lines: null, em: 0
      };
      if (wrap) {
        const words = String(wrap.text).split(/\s+/).filter(Boolean);
        const lines = [];
        let line = '';
        for (const word of words) {
          const cand = line ? line + ' ' + word : word;
          if (width(cand) <= wrap.width || !line) {
            if (!line && width(word) > wrap.width) {        // one word wider than the whole column
              let part = '';
              for (const ch of word) {
                if (width(part + ch) > wrap.width && part) { lines.push(part); part = ch; } else part += ch;
              }
              line = part;
              continue;
            }
            line = cand;
          } else { lines.push(line); line = word; }
        }
        if (line) lines.push(line);
        out.lines = lines;
        const whole = String(wrap.text).replace(/\s+/g, ' ').trim();
        out.em = whole ? width(whole) / whole.length / size : 0;
      }
      return out;
    }, { font: job.font, track: job.track || 0, strings: job.strings || [], wrap: job.wrap || null });
  }

  return { open, close, encode, useFamily, measure, get live() { return !!page; } };
}

/* ── A TYPESETTER over that page (or over the fallback table) ────────────
   familyOf pulls the first family out of a CSS stack — "'Public Sans',
   sans-serif" → Public Sans — because that is the face the browser will
   actually use and the one whose file is in fonts/. */
function familyOf(stack) {
  const first = String(stack || '').split(',')[0].trim();
  return first.replace(/^['"]|['"]$/g, '');
}

function makeType(studio, root, stack, warnings) {
  const family = familyOf(stack);
  const advance = FALLBACK_ADVANCE[family] || FALLBACK_ADVANCE_DEFAULT;
  let ready = null, live = false, said = false, tracked = '';

  async function start() {
    if (ready) return live;
    ready = true;
    live = await studio.useFamily(family, root);
    if (!live && !said) {
      said = true;
      warnings.push('type: "' + family + '" could not be loaded into a page — wrapping by the measured average advance '
        + advance + ' em' + (FALLBACK_ADVANCE[family] ? '' : ' (the plan\'s guess for a face nobody has measured)'));
    }
    return live;
  }

  const font = (weight, size) => weight + ' ' + size + 'px ' + stack;

  /* Every number a drawing needs, in the units of the size asked for:
     the wrapped lines when `text` is given, the widths of `strings` when
     they are, the face's own ascent and descent, and the measured mean
     advance per character in em (what the header quotes). Measured in the
     page when there is one; arithmetic off the fallback advance when there
     is not, and `measured` says which the page was drawn with. */
  async function take(weight, size, o) {
    await start();
    o = o || {};
    if (live) {
      const m = await studio.measure({ font: font(weight, size), track: o.track || 0, strings: o.strings || [], wrap: o.text ? { text: o.text, width: o.width } : null });
      if (m) {
        if (m.tracked && m.tracked !== 'none') tracked = m.tracked;
        return { lines: m.lines || [], widths: m.widths, ascent: m.ascent, descent: m.descent, em: m.em || advance };
      }
    }
    const em = advance + (o.track || 0);
    const wide = str => str.length * em * size;
    let lines = [];
    if (o.text) {
      const words = String(o.text).split(/\s+/).filter(Boolean);
      let line = '';
      for (const w of words) {
        const cand = line ? line + ' ' + w : w;
        if (wide(cand) <= o.width || !line) line = cand;
        else { lines.push(line); line = w; }
      }
      if (line) lines.push(line);
    }
    return { lines, widths: (o.strings || []).map(wide), ascent: FALLBACK_ASCENT * size, descent: (1 - FALLBACK_ASCENT) * size * 0.5, em };
  }

  return { family, take, get measured() { return live; }, get tracking() { return tracked; } };
}

/* ── THE SECTIONS ────────────────────────────────────────────────────────
   Every kind ends in the same five lines, written the way site/serve.js's
   copyMarkup writes a pasted copy: two blank lines over the section, the
   attributes broken across four lines in the same order, the sticker's own
   words in front of style=, and the dim and the re-cut button under the
   art. If the shape of a .gz ever changes, that file and this one are the
   two places it is written down. */
function chrome(inner) {
  return inner.concat([
    '    <span class="gz-dim" aria-hidden="true"></span>',
    '    <button type="button" class="gz-size" data-nodrag aria-label="re-cut it — double-click to fit it to its drawing"></button>',
    '  </section>'
  ]);
}

function openTag(cls, gizmo, attrs2, attrs3, label) {
  return [
    '', '',
    '  <section class="' + cls + '" id="gz-' + esc(gizmo) + '" data-gizmo="' + esc(gizmo) + '"',
    '           ' + attrs2,
    '           ' + attrs3,
    '           aria-label="' + esc(label) + '">'
  ];
}

const scaleOf = slot => (Number.isFinite(+slot.scale) && +slot.scale > 0 ? +slot.scale : 1);

const RAD = Math.PI / 180;
const r2 = v => Math.round(v * 100) / 100 + 0;            // two decimals in the markup, and never -0
/* A slot's rotation as the PAGE will see it: clamped to kits.js's ±45 and
   rounded to the two decimals serve.js's variantValue writes, so the number
   the frame is turned by and the number the picture is turned by are one
   number and not two that nearly agree. */
function rotOf(slot) {
  if (slot.rot == null || !Number.isFinite(+slot.rot)) return 0;
  let r = +slot.rot;
  if (Math.abs(r) > ROT_MAX) r = r < 0 ? -ROT_MAX : ROT_MAX;
  return Math.round(r * 100) / 100;
}

/* home-x, home-y, the optional home-z, the sticker words, then style —
   serve.js's order, so an attribute this file writes and one keep.js writes
   land in the same place on the tag. */
function homeLine(slot, boxW, boxH, extra, z) {
  const zz = z == null ? slot.z : z;
  return 'data-home-x="' + num(slot.x, 0) + '" data-home-y="' + num(slot.y, 0) + '"'
    + (zz != null && Number.isFinite(+zz) ? ' data-home-z="' + num(zz, 0) + '"' : '')
    + (extra || '')
    + ' style="width:' + Math.max(1, Math.round(boxW)) + 'px;height:' + Math.max(1, Math.round(boxH)) + 'px"';
}

function picSection(slot, gizmo, asset, label, z) {
  const k = scaleOf(slot), w = asset.w, h = asset.h;
  const svg = [
    '    <div class="gz-art">',
    '    <svg width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">',
    '      <image href="' + esc(asset.file) + '" width="' + w + '" height="' + h + '"></image>',
    '    </svg>',
    '    </div><!-- /gz-art -->'
  ];
  return openTag('gz gz-pic', gizmo,
    'data-w="' + w + '" data-h="' + h + '"' + (k !== 1 ? ' data-scale="' + k + '"' : ''),
    homeLine(slot, w * k, h * k, '', z), label).concat(chrome(svg)).join('\n');
}

/* ── THE SCREENSHOT IN ITS FRAME ─────────────────────────────────────────
   The second half of a framed screenshot: the prop that carries the picture,
   cut to the part's own image-slot rect and turned with the frame. THE
   SCREENSHOTS IN THEIR FRAMES in the header is the whole argument; this is
   the arithmetic.

   The rect is turned twice about one centre — its own tilt inside the
   drawing (rect.rot, which build-sheet.js reduced to an angle about the
   rect's centre) and the section's data-rot, which kits.js applies to the
   whole 128 box about (64, 64). So the box's turn moves the rect's CENTRE
   about (64, 64) and the two angles add. The prop is then cut to the
   axis-aligned box of the four turned corners, which is the only box that
   holds a turned rectangle without clipping a corner off it. */
const SK_MID = SK_BOX / 2;                                // (64, 64): kits.js turns a sticker about P.w/2, P.h/2 (placeLive)
function shotGeom(slot, rect) {
  const s = scaleOf(slot), th = rotOf(slot);
  const c = Math.cos(th * RAD), sn = Math.sin(th * RAD);
  const dx = rect.x + rect.w / 2 - SK_MID, dy = rect.y + rect.h / 2 - SK_MID;
  const cx = SK_MID + dx * c - dy * sn, cy = SK_MID + dx * sn + dy * c;
  const a = (+rect.rot || 0) + th;
  const ca = Math.cos(a * RAD), sa = Math.sin(a * RAD);
  const hw = rect.w / 2, hh = rect.h / 2;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const p of [[-hw, -hh], [hw, -hh], [hw, hh], [-hw, hh]]) {
    const qx = cx + p[0] * ca - p[1] * sa, qy = cy + p[0] * sa + p[1] * ca;
    if (qx < x0) x0 = qx; if (qx > x1) x1 = qx;
    if (qy < y0) y0 = qy; if (qy > y1) y1 = qy;
  }
  return {
    s: s, a: r2(a), cx: r2(cx), cy: r2(cy),
    bx: r2(x0), by: r2(y0), bw: r2(x1 - x0), bh: r2(y1 - y0),
    x: r2(num(slot.x, 0) + x0 * s), y: r2(num(slot.y, 0) + y0 * s)
  };
}

function shotSection(slot, gizmo, asset, rect, label, z) {
  const g = shotGeom(slot, rect);
  const svg = [
    '    <div class="gz-art">',
    '    <svg width="' + g.bw + '" height="' + g.bh + '" viewBox="' + g.bx + ' ' + g.by + ' ' + g.bw + ' ' + g.bh + '" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">',
    '      <g transform="rotate(' + g.a + ' ' + g.cx + ' ' + g.cy + ')">',
    /* a nested <svg> is its own viewport and clips to it, so `slice` fills
       the slot and the crop costs no clipPath and no id nothing else can
       collide with */
    '        <svg x="' + r2(g.cx - rect.w / 2) + '" y="' + r2(g.cy - rect.h / 2) + '" width="' + rect.w + '" height="' + rect.h
      + '" viewBox="0 0 ' + asset.w + ' ' + asset.h + '" preserveAspectRatio="xMidYMid slice">',
    '          <image href="' + esc(asset.file) + '" width="' + asset.w + '" height="' + asset.h + '"></image>',
    '        </svg>',
    '      </g>',
    '    </svg>',
    '    </div><!-- /gz-art -->'
  ];
  return openTag('gz gz-pic gz-shot', gizmo,
    'data-w="' + g.bw + '" data-h="' + g.bh + '"' + (g.s !== 1 ? ' data-scale="' + g.s + '"' : ''),
    homeLine({ x: g.x, y: g.y }, g.bw * g.s, g.bh * g.s, '', z), label).concat(chrome(svg)).join('\n');
}

/* The sticker's three per-section words, normalised exactly as
   site/serve.js's variantValue does — an object palette serialised to JSON,
   rot to two decimals and clamped to kits.js's ±45. */
function stickerVariants(slot, warnings, gizmo) {
  let out = '';
  if (slot.palette && typeof slot.palette === 'object' && !Array.isArray(slot.palette) && Object.keys(slot.palette).length) {
    out += ' data-palette="' + esc(JSON.stringify(slot.palette)) + '"';
  }
  if (slot.text != null && slot.text !== '') out += ' data-text="' + esc(String(slot.text)) + '"';
  if (slot.rot != null && Number.isFinite(+slot.rot) && +slot.rot !== 0) {
    if (Math.abs(+slot.rot) > ROT_MAX) warnings.push('slot ' + gizmo + ': rot ' + (+slot.rot) + '° clamped to ' + (+slot.rot < 0 ? -ROT_MAX : ROT_MAX) + '° (kits.js ROT_MAX)');
    out += ' data-rot="' + rotOf(slot) + '"';
  }
  return out;
}

function stickerSection(slot, gizmo, label, warnings, z) {
  const k = scaleOf(slot);
  const w = SK_BOX + SK_SPILL_R, h = SK_BOX + SK_SPILL_B;
  /* '../../features/…' is the path from games/<slug>/ to the sheet, and it
     is also what kits.js's SRC_RE finds: the regex is unanchored
     (/features\/(…)\.dc\.html#(?:part|who)=([\w-]+)/, kits.js line 134), so
     the ../../ in front of it is not in its way. */
  return openTag('gz', gizmo,
    'data-src="../../features/stickers-core.dc.html#part=' + esc(slot.ref) + '" data-w="' + w + '" data-h="' + h + '"'
    + (k !== 1 ? ' data-scale="' + k + '"' : ''),
    homeLine(slot, w * k, h * k, stickerVariants(slot, warnings, gizmo), z), label)
    .concat(chrome(['    <div class="gz-art"></div>'])).join('\n');
}

function propSection(cls, slot, gizmo, drawing, label, z) {
  const k = scaleOf(slot), w = drawing.w, h = drawing.h;
  const svg = ['    <div class="gz-art">',
    '    <svg width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '" xmlns="http://www.w3.org/2000/svg">']
    .concat(drawing.body.map(l => '      ' + l), ['    </svg>', '    </div><!-- /gz-art -->']);
  return openTag(cls, gizmo,
    'data-w="' + w + '" data-h="' + h + '"' + (k !== 1 ? ' data-scale="' + k + '"' : ''),
    homeLine(slot, w * k, h * k, '', z), label).concat(chrome(svg)).join('\n');
}

/* ── the note's own words ────────────────────────────────────────────────
   A note slot from press/recipes.js carries its `text` and names its kind in
   `ref` (NOTE_REFS: title, description, release). A title note's text is the
   title, a newline, and the tagline — that is how the recipe builds it and
   how it measured the box — so the two lines become two BLOCKS, set at the
   recipe's title and tagline sizes. Anything else is body copy.

   A slot with no text of its own falls back to naming manifest fields in
   `ref`, joined with '+' ('title+tagline', 'description'), which is what a
   layout written by hand is likely to say. A ref that names nothing at all
   is a warning and the slot is skipped: an empty note is a box nobody can
   see and a position keep.js would keep forever. */
const NOTE_ROLE = { title: 'title', tagline: 'tagline' };
function noteBlocks(slot, manifest, warnings, gizmo) {
  const text = slot.text == null ? '' : String(slot.text);
  if (text.trim()) {
    const lines = text.split('\n').map(t => t.trim()).filter(Boolean);
    if (slot.ref === 'title') return lines.map((t, i) => ({ role: i ? 'tagline' : 'title', text: t }));
    return [{ role: 'body', text: lines.join(' ') }];
  }
  const fields = String(slot.ref || '').split(/[+,]/).map(t => t.trim()).filter(Boolean);
  const out = [];
  for (const f of fields) {
    const v = manifest[f];
    if (typeof v === 'string' && v.trim()) out.push({ role: NOTE_ROLE[f] || 'body', text: v.trim() });
    else if (Array.isArray(v) && v.length) out.push({ role: 'body', text: v.join(' · ') });
  }
  if (!out.length) warnings.push('slot ' + gizmo + ': note "' + slot.ref + '" carries no words and names nothing the manifest has — skipped');
  return out;
}

/* THE NOTE, TYPESET. The sizes are the recipe's (scaled with the slot: a
   composition laid out around 800-px art is half the world size of one laid
   out around 1600, and its type goes with it), and every break, every
   baseline and the height of the box are MEASURED in the face the page will
   use. Padding is the wall note's 12 × 9, so the words sit off the edge of
   the box the way they do on the bench, and the section is cut to the width
   the recipe gave by the height this came to.

   The title is the 700 the bench sets a heading in and the body is 400; both
   are the --body FACE, which is what §5.2 asks for. Colours are the theme's
   own tokens with the house's as the literal fallback, the way every drawing
   in index.html writes them. */
async function noteDrawing(blocks, width, slot, type, theme, NOTES) {
  const k = (Number.isFinite(+slot.size) && +slot.size > 0 ? +slot.size : NOTES.body) / NOTES.body;
  const padX = Math.round(NOTES.padX * k), padY = Math.round(NOTES.padY * k);
  const col = Math.max(1, Math.round(width - 2 * padX));
  const body = [], measured = [];
  let y = padY;
  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i];
    const role = b.role === 'title' ? 'title' : b.role === 'tagline' ? 'tagline' : 'body';
    const weight = role === 'title' ? 700 : 400;
    const fill = role === 'title' ? 'var(--ink,#26212a)' : role === 'tagline' ? 'var(--mute,#8b7f92)' : 'var(--ink-2,#3c3542)';
    const size = Math.max(1, Math.round(NOTES[role] * k));
    const m = await type.take(weight, size, { text: b.text, width: col });
    const lh = Math.round(size * NOTES.line);
    if (i) y += Math.round(NOTES.gap * k);
    for (const line of m.lines) {
      body.push('<text x="' + padX + '" y="' + Math.round(y + m.ascent) + '" style="font-family:var(--body,' + esc(theme.body || 'sans-serif')
        + ');font-weight:' + weight + ';font-size:' + size + 'px;fill:' + fill + '">' + esc(line) + '</text>');
      y += lh;
    }
    measured.push({ role: role, size: size, lines: m.lines.length, em: Math.round(m.em * 10000) / 10000, chars: m.lines.length ? Math.round(b.text.length / m.lines.length) : 0 });
  }
  return { w: Math.round(width), h: Math.max(1, Math.round(y + padY)), body: body, measured: measured };
}

/* ── the sign ───────────────────────────────────────────────────────────
   Every https link the manifest carries, drawn as the bench's poster chip
   (THE SIGN in the header) and wrapped into rows of the slot's width. The
   labels and their order are press/recipes.js's, so the words drawn here are
   the words the layout measured its box with. */
function signLinks(manifest, warnings, LABELS, ORDER) {
  const links = manifest.links || {};
  const keys = Object.keys(links);
  const ordered = ORDER.filter(k => keys.indexOf(k) >= 0).concat(keys.filter(k => ORDER.indexOf(k) < 0));
  const out = [];
  for (const k of ordered) {
    const href = links[k];
    if (typeof href !== 'string' || !/^https:\/\//.test(href)) { warnings.push('sign: link "' + k + '" is not an https URL — left off'); continue; }
    out.push({ key: k, href: href, label: LABELS[k] || (k.charAt(0).toUpperCase() + k.slice(1)) });
  }
  return out;
}

async function signDrawing(links, width, slot, type, theme, CHIPS) {
  const k = (Number.isFinite(+slot.size) && +slot.size > 0 ? +slot.size : CHIPS.size) / CHIPS.size;
  const size = Math.max(1, Math.round(CHIPS.size * k));
  const padX = Math.round(CHIPS.padX * k), padY = Math.round(CHIPS.padY * k);
  const gap = Math.round(CHIPS.gap * k), border = Math.round(CHIPS.border * k * 10) / 10;
  const lift = Math.max(1, Math.round(CHIP_LIFT * k));
  const words = links.map(l => l.label.toUpperCase());
  const m = await type.take(700, size, { strings: words, track: CHIP_TRACK });
  const h = Math.round(size * CHIPS.line) + padY * 2;
  const r = Math.round(h / 2);                    // border-radius:999px on a chip is a pill: half its height
  const body = [];
  /* an SVG stroke straddles the edge it is drawn on, so every rect is inset
     by half the border and shrunk by the whole of it: the chip's OUTER edge
     is then exactly the box it was measured into, and nothing is clipped by
     the svg's own edge. */
  const b2 = border / 2;
  let x = 0, y = 0, rowMax = 0;
  for (let i = 0; i < links.length; i++) {
    const cw = Math.round(m.widths[i]) + padX * 2;
    if (x && x + cw > width) { x = 0; y += h + gap; }
    body.push('<a href="' + esc(links[i].href) + '" target="_blank" rel="noopener noreferrer" data-nodrag>');
    body.push('  <rect x="' + (x + b2) + '" y="' + (y + lift + b2) + '" width="' + (cw - border) + '" height="' + (h - border) + '" rx="' + r + '" ry="' + r + '" fill="var(--ink-2,#3c3542)"></rect>');
    body.push('  <rect x="' + (x + b2) + '" y="' + (y + b2) + '" width="' + (cw - border) + '" height="' + (h - border) + '" rx="' + r + '" ry="' + r + '"'
      + ' fill="var(--card,#fffdfe)" stroke="var(--ink-2,#3c3542)" stroke-width="' + border + '"></rect>');
    body.push('  <text x="' + (x + padX) + '" y="' + Math.round(y + padY + m.ascent) + '" style="font-family:var(--mono,ui-monospace,monospace);font-weight:700;font-size:'
      + size + 'px;letter-spacing:' + CHIP_TRACK + 'em;fill:var(--ink-3,#4a4150)">' + esc(words[i]) + '</text>');
    body.push('</a>');
    x += cw + gap;
    rowMax = Math.max(rowMax, x - gap);
  }
  return { w: Math.max(1, Math.round(rowMax)), h: Math.max(1, y + h + lift), body: body, chips: links.length };
}

/* ── THE TEMPLATE ───────────────────────────────────────────────────────
   games/_template.html is another builder's file and is never edited here
   (§5.1). What this does is fill the placeholders it carries, say which of
   the ones a page needs it has not got, and refuse to write a page with a
   {{ left in it. */
function fillTemplate(tpl, values, warnings) {
  const missing = REQUIRED_PLACEHOLDERS.filter(p => tpl.indexOf(p) < 0);
  let out = tpl;
  for (const key of Object.keys(values)) {
    const token = '{{' + key + '}}';
    if (out.indexOf(token) < 0) continue;
    out = out.split(token).join(values[key]);
  }
  const left = (out.match(/\{\{[A-Z0-9_]+\}\}/g) || []).filter((v, i, a) => a.indexOf(v) === i);
  return { html: out, missing, left };
}

/* The note's and the chip's numbers, taken from press/recipes.js when it is
   on the disk so that what this file DRAWS and what that file MEASURED its
   boxes with cannot drift apart (its header asks for exactly that: "the
   labels are exported so build-game.js draws the same words this file
   measured"). It is a pure module, so it loads in Node through
   lib/browser-module.js and costs nothing. A bundle posted at the door on a
   machine without it falls back to the copies at the top of this file, which
   are the same numbers. */
function recipeNumbers(root, warnings) {
  const out = { NOTE: NOTE, CHIP: CHIP, LINKS: LINKS, LINK_ORDER: LINK_ORDER };
  const file = path.join(root, 'press', 'recipes.js');
  if (!fs.existsSync(file)) { warnings.push('press/recipes.js is not here — the note and chip numbers are this file\'s own copies of it'); return out; }
  try {
    const R = require('./lib/browser-module.js')(file).Recipes;
    if (R && R.NOTE) out.NOTE = R.NOTE;
    if (R && R.CHIP) out.CHIP = R.CHIP;
    // recipes.js exports the labels and not its LINK_ORDER, but the two are
    // the same list: its LINKS object is written in that order, and an
    // object's string keys come back in the order they were written.
    if (R && R.LINKS) { out.LINKS = R.LINKS; out.LINK_ORDER = Object.keys(R.LINKS); }
  } catch (e) {
    warnings.push('press/recipes.js would not load (' + String((e && e.message) || e) + ') — the note and chip numbers are this file\'s own copies');
  }
  return out;
}

/* The image-slot rects, read back off the sheet's own data-props (`slots`,
   beside `tags`) — press/tools/build-sheet.js put them there and its header
   says why that is the place. Read from the sheet and not from
   press/tools/parts/*.html so the number this composes with came out of the
   same file kits.js rasterises. A sheet that is missing, unreadable, or
   carries no `slots` is a WARNING and not a refusal: every frame is then
   drawn empty exactly as it was before this existed, and the page is still a
   page. Every rect is checked for four finite numbers before it is believed
   — a bad one would put a picture somewhere nobody asked for. */
function sheetSlots(root, warnings) {
  const file = path.join(root, 'features', 'stickers-core.dc.html');
  if (!fs.existsSync(file)) {
    warnings.push('features/stickers-core.dc.html is not here — every frame is drawn empty and its screenshot is left off the page');
    return {};
  }
  let props = null;
  try {
    const m = /\sdata-props="([^"]*)"/.exec(fs.readFileSync(file, 'utf8'));
    if (!m) throw new Error('the sheet carries no data-props');
    props = JSON.parse(m[1].replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&'));
  } catch (e) {
    warnings.push('the sticker sheet\'s data-props would not read (' + String((e && e.message) || e) + ') — every frame is drawn empty');
    return {};
  }
  const raw = (props && props.part && props.part.slots) || null;
  if (!raw || typeof raw !== 'object') {
    warnings.push('the sticker sheet\'s data-props carries no `slots` — rebuild it with press/tools/build-sheet.js; every frame is drawn empty');
    return {};
  }
  const out = {};
  for (const part of Object.keys(raw)) {
    const r = raw[part];
    const ok = r && ['x', 'y', 'w', 'h'].every(k => Number.isFinite(+r[k])) && +r.w > 0 && +r.h > 0;
    if (!ok) { warnings.push('the sheet\'s image-slot rect for "' + part + '" is not four numbers — that frame is drawn empty'); continue; }
    out[part] = { x: +r.x, y: +r.y, w: +r.w, h: +r.h, rot: Number.isFinite(+r.rot) ? +r.rot : 0 };
  }
  return out;
}

/* THE PARTS DRAWN ROUND A WORD, read off the same sheet. A text part holds
   `<g data-layer="text"><text>{{ skText }}</text></g>` (plan §3.6) and the
   sheet's own skText is '', so a section with no data-text draws a blank
   ribbon — which is what both widescreen pages carried until 2026-09-07
   (perf/results/phase5/game-*.png). press/recipes.js will not place one now
   (its widescreen() says why), but a layout can also arrive at the door from
   the Press Table, and this file is the last thing between a layout and a
   page: it cannot fill in a word nobody chose, so it SAYS SO in the
   warnings, once per blank, and builds the page anyway. Same for a part
   drawn round an image slot with no picture in it — the rect there is an
   opaque {{ skPaper }} and reads as a hole in the drawing. */
function sheetTextParts(root) {
  const file = path.join(root, 'features', 'stickers-core.dc.html');
  const out = Object.create(null);
  let src = '';
  try { src = fs.readFileSync(file, 'utf8'); } catch (e) { return out; }
  const re = /\{\{\s*is([A-Za-z0-9]+)\s*\}\}/g;
  let m;
  while ((m = re.exec(src))) {
    const end = src.indexOf('</sc-if>', m.index);
    if (end < 0) continue;
    if (src.slice(m.index, end).indexOf('data-layer="text"') < 0) continue;
    // isBadgeRound → badge-round: the flag is the part id in camel case
    out[m[1].replace(/^./, c => c.toLowerCase()).replace(/([A-Z])/g, (x, c) => '-' + c.toLowerCase())] = 1;
  }
  return out;
}

/* ── BUILD ──────────────────────────────────────────────────────────────── */
async function build(bundle, opts) {
  opts = opts || {};
  const root = path.resolve(opts.root || TEST);
  const warnings = [];
  const files = [];
  bundle = bundle || {};

  const manifest = bundle.manifest;
  const slug = (manifest && manifest.slug) || bundle.slug;
  if (!SLUG_RE.test(String(slug || ''))) return { ok: false, slug: slug || null, error: 'no slug, or not one: ^[a-z0-9-]{2,40}$', warnings, files };

  const dir = path.join(root, 'games', slug);
  const page = path.join(dir, 'index.html');
  const exists = fs.existsSync(page);
  if (exists && !bundle.force) {
    return { ok: false, slug, error: 'games/' + slug + '/index.html exists — send force:true to overwrite it', warnings, files };
  }

  const tplFile = path.join(root, 'games', '_template.html');
  if (!fs.existsSync(tplFile)) return { ok: false, slug, error: 'games/_template.html is missing — the template is Phase 5.1 and this file never writes one', warnings, files };
  const tpl = fs.readFileSync(tplFile, 'utf8');

  /* the schemas, before anything is written. The manifest is checked twice —
     here as it arrived, and again at the end as it is written, since the
     builder rewrites every assets[] entry from the bytes it encoded. */
  const schemas = loadSchemas(root, warnings);
  let errors = []
    .concat(validateOne(schemas, 'manifest', manifest, 'manifest'))
    .concat(validateOne(schemas, 'analysis', bundle.analysis, 'analysis'))
    .concat(validateOne(schemas, 'theme', bundle.theme, 'theme'))
    .concat(validateOne(schemas, 'style', bundle.style, 'style'))
    .concat(validateOne(schemas, 'layout', bundle.layout, 'layout'));
  if (errors.length) return { ok: false, slug, error: errors.join('; '), warnings, files };

  const analysis = bundle.analysis || {};
  const theme = bundle.theme || {};
  const style = bundle.style || {};
  const layout = bundle.layout || {};
  if (!layout.slots || !layout.slots.length) return { ok: false, slug, error: 'layout has no slots — a page with nothing on it is not a page', warnings, files };
  if (!theme.tokens || !theme.css) return { ok: false, slug, error: 'theme carries no tokens/css (press/theme.js\'s derive() gives both)', warnings, files };

  /* THE BACKUP, and where in the order it goes. A forced build copies the
     page to index.html.keep-bak before it writes ANYTHING — the art files
     go out first and a crash between them and the page would otherwise
     leave a folder with no copy of what was there — but after the schemas
     have spoken, which is serve.js's own reasoning for delaying its copy:
     a bundle that is going to be refused should not spend the one backup
     the session has. Taken every time force is used, not once per run,
     because a forced build is a deliberate act and not a timer; serve.js
     takes the same copy of the same untouched file just before it calls
     this, and the two are identical bytes. */
  if (exists) {
    try { fs.copyFileSync(page, page + '.keep-bak'); files.push(rel(root, page + '.keep-bak')); }
    catch (e) { return { ok: false, slug, error: 'could not write games/' + slug + '/index.html.keep-bak: ' + String((e && e.message) || e), warnings, files }; }
  }

  const studio = makeStudio(warnings);
  const art = [];
  try {
    /* ── the pictures ───────────────────────────────────────────────────── */
    fs.mkdirSync(path.join(dir, 'art'), { recursive: true });
    const srcDir = opts.srcDir ? path.resolve(opts.srcDir) : null;
    const images = bundle.images || null;
    const pixel = +(analysis.stats && analysis.stats.pixelSize) > 0;
    const assets = [];

    for (const a of (manifest.assets || [])) {
      const cap = CAP[a.role] || CAP.misc;
      let buf = null, w = 0, h = 0, alpha = false, ext = 'webp', ms = 0, how = '', src = 0;

      if (images && images[a.id] != null) {
        /* the door: written as they are (§5.3), and read back to prove it */
        const b64 = String(images[a.id]).replace(/^data:[^,]*,/, '');
        buf = Buffer.from(b64, 'base64');
        const s = readImage(buf);
        if (!s) { errors.push('asset ' + a.id + ': the bytes are not a PNG, a JPEG or a WebP'); continue; }
        if (s.type === 'jpeg') { errors.push('asset ' + a.id + ': a JPEG arrived at the door — the Press Table re-encodes to WebP or PNG before it posts (§5.3)'); continue; }
        w = s.w; h = s.h; alpha = s.alpha; ext = s.ext; how = 'as sent';
        if (Math.max(w, h) > cap) warnings.push('asset ' + a.id + ': ' + w + '×' + h + ' is over the ' + cap + '-px cap for a ' + a.role + ' — written as sent (§5.3)');
        if (a.w && a.h && (+a.w !== w || +a.h !== h)) warnings.push('asset ' + a.id + ': the manifest said ' + a.w + '×' + a.h + ', the bytes are ' + w + '×' + h + ' — the bytes win');
      } else {
        const from = srcDir ? path.join(srcDir, a.file) : null;
        if (!from || !fs.existsSync(from)) { errors.push('asset ' + a.id + ': no bytes in the bundle and no ' + (from ? rel(root, from) : 'source folder')); continue; }
        const bytes = fs.readFileSync(from);
        const s0 = readImage(bytes);
        if (!s0) { errors.push('asset ' + a.id + ': ' + rel(root, from) + ' is not a PNG, a JPEG or a WebP'); continue; }
        const enc = await studio.encode(bytes, s0.mime, cap, pixel);
        if (!enc) { errors.push('asset ' + a.id + ': no browser to re-encode it with (see the warnings)'); continue; }
        buf = enc.buf; w = enc.w; h = enc.h; alpha = enc.alpha; ext = enc.ext; ms = enc.ms; src = bytes.length;
        how = (enc.from[0] === w && enc.from[1] === h) ? 're-encoded' : ('resized ' + enc.from[0] + '×' + enc.from[1] + ' → ' + w + '×' + h + (pixel ? ' (nearest)' : ''));
        if (a.alpha != null && !!a.alpha !== alpha) warnings.push('asset ' + a.id + ': the manifest said alpha=' + !!a.alpha + ', the pixels say ' + alpha + ' — the pixels win');
      }

      if (w < MIN_EDGE || h < MIN_EDGE) { errors.push('asset ' + a.id + ': ' + w + '×' + h + ' is under the schema\'s 16-px floor'); continue; }
      const file = 'art/' + a.id + '.' + ext;
      writeThroughTmp(path.join(dir, file), buf);
      files.push(rel(root, path.join(dir, file)));
      const entry = { id: a.id, role: a.role, file, w, h, alpha, sha256: sha256(buf) };
      assets.push(entry);
      art.push({ id: a.id, role: a.role, file, w, h, bytes: buf.length, src, ms, how });
    }
    if (errors.length) return { ok: false, slug, error: errors.join('; '), warnings, files, art };
    if (!assets.length) return { ok: false, slug, error: 'no assets were written', warnings, files, art };

    const byId = {};
    for (const a of assets) byId[a.id] = a;
    for (const stray of fs.readdirSync(path.join(dir, 'art'))) {
      if (!assets.some(a => a.file === 'art/' + stray)) warnings.push('games/' + slug + '/art/' + stray + ' is not in this build — left alone (nothing here deletes)');
    }

    /* ── the sections, in z order ────────────────────────────────────────── */
    const R = recipeNumbers(root, warnings);
    const SLOTS = sheetSlots(root, warnings);
    const TEXTY = sheetTextParts(root);
    const type = makeType(studio, root, (theme.fonts && theme.fonts.body) || (theme.tokens && theme.tokens['--body']) || 'sans-serif', warnings);
    const slots = layout.slots.map((s, i) => ({ s, i })).sort((a, b) => (num(a.s.z, 0) - num(b.s.z, 0)) || (a.i - b.i));
    const counts = { pic: 0, sticker: 0, shot: 0, note: 0, sign: 0, skipped: 0 };
    const seen = {};
    const out = [];
    const typeNotes = [];
    // data-home-z is the section's place in this stream, not the slot's own z
    // (THE SCREENSHOTS IN THEIR FRAMES: a framed shot is two sections)
    const zOf = () => out.length;

    for (const { s: slot } of slots) {
      const kind = slot.kind;
      const base = kind + '-' + String(slot.ref || 'x').replace(/[^a-z0-9-]/gi, '-').toLowerCase();
      seen[base] = (seen[base] || 0) + 1;
      const gizmo = seen[base] > 1 ? base + '-' + seen[base] : base;

      if (kind === 'pic') {
        const asset = byId[slot.ref];
        if (!asset) { warnings.push('slot ' + gizmo + ': no asset "' + slot.ref + '" — skipped'); counts.skipped++; continue; }
        out.push(picSection(slot, gizmo, asset, (manifest.title || slug) + ' — ' + asset.role, zOf()));
        counts.pic++;
      } else if (kind === 'sticker') {
        if (!/^[\w-]+$/.test(String(slot.ref || ''))) { warnings.push('slot ' + gizmo + ': "' + slot.ref + '" is not a part name — skipped'); counts.skipped++; continue; }
        const label = slot.text ? String(slot.text) : String(slot.ref).replace(/-/g, ' ');
        /* the two blanks a layout can ask for, named where they are written
           (sheetTextParts, above): neither stops the page. */
        if (SLOTS[slot.ref] && (slot.image == null || slot.image === '')) {
          warnings.push('slot ' + gizmo + ': "' + slot.ref + '" is drawn round an image slot and this layout gives it no picture — the page draws an opaque --sk-paper rect where a picture would go (plan §3.6 allows it; it reads as a hole)');
        }
        if (TEXTY[slot.ref] && !String(slot.text == null ? '' : slot.text).trim()) {
          warnings.push('slot ' + gizmo + ': "' + slot.ref + '" is drawn round a word and this layout gives it none — the page draws an empty text slot');
        }
        out.push(stickerSection(slot, gizmo, label, warnings, zOf()));
        counts.sticker++;
        /* §3.6's image-slot, composed by the page: the frame is written, and
           the picture goes on top of it as its own prop — THE SCREENSHOTS IN
           THEIR FRAMES, above. Everything that can stop it says so and leaves
           the frame standing empty, which is what it did before. */
        if (slot.image != null && slot.image !== '') {
          const shot = byId[slot.image];
          const rect = SLOTS[slot.ref];
          const sbase = 'shot-' + String(slot.image).replace(/[^a-z0-9-]/gi, '-').toLowerCase();
          seen[sbase] = (seen[sbase] || 0) + 1;
          const sgizmo = seen[sbase] > 1 ? sbase + '-' + seen[sbase] : sbase;
          if (!shot) warnings.push('slot ' + gizmo + ': no asset "' + slot.image + '" for its image-slot — the frame is drawn empty');
          else if (!rect) warnings.push('slot ' + gizmo + ': "' + slot.ref + '" has no image-slot on the sheet — "' + slot.image + '" is not on the page');
          else {
            out.push(shotSection(slot, sgizmo, shot, rect, (manifest.title || slug) + ' — ' + shot.role, zOf()));
            counts.shot++;
          }
        }
      } else if (kind === 'note') {
        const blocks = noteBlocks(slot, manifest, warnings, gizmo);
        if (!blocks.length) { counts.skipped++; continue; }
        const width = Number.isFinite(+slot.width) && +slot.width > 0 ? +slot.width : (slot.w || NOTE_WIDTH);
        const drawing = await noteDrawing(blocks, width, slot, type, theme.fonts || {}, R.NOTE);
        typeNotes.push({ gizmo, width, was: num(slot.h, 0), h: drawing.h, measured: drawing.measured });
        out.push(propSection('gz gz-note', slot, gizmo, drawing, label80(blocks.map(b => b.text).join(' — ')), zOf()));
        counts.note++;
      } else if (kind === 'sign') {
        const links = signLinks(manifest, warnings, R.LINKS, R.LINK_ORDER);
        if (!links.length) { warnings.push('slot ' + gizmo + ': the manifest has no https links — skipped'); counts.skipped++; continue; }
        const width = Number.isFinite(+slot.width) && +slot.width > 0 ? +slot.width : (slot.w || NOTE_WIDTH);
        const drawing = await signDrawing(links, width, slot, type, theme.fonts || {}, R.CHIP);
        typeNotes.push({ gizmo, width, was: num(slot.h, 0), h: drawing.h, measured: [{ role: 'chips', size: R.CHIP.size, lines: drawing.chips, em: 0, chars: 0 }] });
        out.push(propSection('gz gz-sign', slot, gizmo, drawing, 'where to get ' + (manifest.title || slug), zOf()));
        counts.sign++;
      } else if (kind === 'machine') {
        warnings.push('slot ' + gizmo + ': machines are not in v1 (plan §16 q3 — the sign carries the trailer link) — skipped');
        counts.skipped++;
      } else {
        warnings.push('slot ' + gizmo + ': "' + kind + '" is not a kind this writes — skipped');
        counts.skipped++;
      }
    }
    if (!counts.pic && !counts.sticker && !counts.note && !counts.sign) {
      return { ok: false, slug, error: 'every slot was skipped — see the warnings', warnings, files, art };
    }

    /* ── the page ────────────────────────────────────────────────────────── */
    const Fonts = loadFonts(root, warnings);
    const pairing = (theme.fonts && theme.fonts.id) || 'clean';
    let preloads = [];
    if (Fonts) {
      try { preloads = Fonts.preloads(pairing); }
      catch (e) { warnings.push('fonts: ' + String((e && e.message) || e)); }
    }
    const open = layout.open || {};
    const wide = [num(open.x, 0), num(open.y, 0), num(open.w, 1000), num(open.h, 1000)];
    const narrow = narrowRect(layout, wide, warnings);
    /* the first section loses its two blank lines and its two spaces: the
       template's own line is "  {{SECTIONS}}", so the indent is already
       there and a section written at the top of the block would otherwise
       stand two spaces in from every one under it. */
    const sections = out.join('\n').replace(/^\n\n {2}/, '');
    const values = {
      TITLE: esc(manifest.title || slug),
      SLUG: esc(slug),
      LAB_PAGE: 'games/' + slug,
      TAGLINE: esc(manifest.tagline || ''),
      DEVELOPER: esc(manifest.developer || ''),
      DESCRIPTION_META: esc(String(manifest.tagline || manifest.description || '').replace(/\s+/g, ' ').trim().slice(0, 200)),
      TOKENS_CSS: theme.css,
      FONT_PRELOADS: preloads.map(f => '<link rel="preload" href="../../fonts/' + f + '" as="font" type="font/woff2" crossorigin>').join('\n'),
      SK_STYLE: JSON.stringify(style).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/'/g, '&#39;'),
      OPEN: wide.join(','),
      OPEN_NARROW: narrow.join(','),
      OPENING_RECT: wide.join(','),                 // the plan §5.1's name for the same four numbers
      OPENING_RECT_NARROW: narrow.join(','),
      SECTIONS: sections,
      BUILT_AT: builtAt(opts)
    };
    const filled = fillTemplate(tpl, values, warnings);
    for (const p of filled.missing) warnings.push('games/_template.html has no ' + p + ' — nothing was put where it should have gone (report it to the template\'s owner; this file never edits it)');
    if (filled.left.length) {
      return { ok: false, slug, error: 'games/_template.html still holds ' + filled.left.join(' ') + ' — a placeholder this file does not fill (report it to the template\'s owner)', warnings, files, art };
    }
    if (filled.html.indexOf(MARK_TOP) < 0 || filled.html.indexOf(MARK_END) < 0) {
      warnings.push('the page has no copies-block markers — keep.js will make them at its first save, but §5.1 asks the template to carry them');
    }
    if (filled.html.indexOf(ANCHOR) < 0) warnings.push('the page has no ' + JSON.stringify(ANCHOR) + ' line — keep.js cannot make a copies block without it');

    writeThroughTmp(page, filled.html);
    files.push(rel(root, page));

    /* posters/index.json, two bytes, and only when the folder has not got
       one. frames.js asks for 'posters/index.json' relative to the page the
       moment it runs and nothing boots until that has answered (frames.js
       line 159), so a game folder without one costs the page a 404 on every
       load, and the template's own comment over frames.js says every game
       folder holds one. It is never overwritten: plan §5.4.4 has perf/posters.js
       writing real posters into it once a page has a machine, and a rebuild
       must not throw those away. */
    const posters = path.join(dir, 'posters', 'index.json');
    if (!fs.existsSync(posters)) {
      fs.mkdirSync(path.dirname(posters), { recursive: true });
      writeThroughTmp(posters, '{}\n');
      files.push(rel(root, posters));
    }

    const game = {
      version: 1,
      builtAt: values.BUILT_AT,
      manifest: Object.assign({}, manifest, { assets }),
      analysis, theme, style, layout
    };
    /* the whole envelope, against game.schema.json, before it is written.
       The page is already out by now — a page and its game.json are written
       in that order because the page is the thing a browser asks for — so a
       failure here is a loud warning and not a silent one. */
    errors = validateOne(schemas, 'game', game, 'game.json');
    if (errors.length) warnings.push('game.json does not validate: ' + errors.join('; '));
    writeThroughTmp(path.join(dir, 'game.json'), JSON.stringify(game, null, 2) + '\n');
    files.push(rel(root, path.join(dir, 'game.json')));

    return {
      ok: true, slug, warnings, files, art,
      sections: counts,
      type: { family: type.family, measured: type.measured, notes: typeNotes },
      bytes: { page: Buffer.byteLength(filled.html), art: art.reduce((n, a) => n + a.bytes, 0) }
    };
  } finally {
    await studio.close();
  }
}

/* data-open-narrow, when the recipe gave one, and cropped from the wide
   rectangle when it did not. The crop keeps the full height and the
   composition's spine (its horizontal middle) and takes the bench's own
   narrow aspect off it — which is what the template's WHERE IT OPENS
   paragraph asks for: a phone opens on the column of content, not on the
   paper either side of it. Never wider than the wide rectangle. */
function narrowRect(layout, wide, warnings) {
  const n = layout.openNarrow || layout.open_narrow;
  if (n && Number.isFinite(+n.w) && Number.isFinite(+n.h)) return [num(n.x, 0), num(n.y, 0), num(n.w, 1000), num(n.h, 1000)];
  const w = Math.min(wide[2], Math.round(wide[3] * NARROW_ASPECT));
  warnings.push('the layout gave no narrow opening rectangle — data-open-narrow is the wide one cropped to the bench\'s ' + NARROW_ASPECT.toFixed(3) + ' aspect about its spine');
  return [Math.round(wide[0] + (wide[2] - w) / 2), wide[1], w, wide[3]];
}

function builtAt(opts) {
  const t = opts && opts.now;
  if (t instanceof Date) return t.toISOString();
  if (typeof t === 'string' && !isNaN(Date.parse(t))) return new Date(t).toISOString();
  return new Date().toISOString();
}

/* press/fonts.js is a browser module (one global off `window`); the Node
   side loads it through lib/browser-module.js, which is what every other
   tool here does. */
function loadFonts(root, warnings) {
  try {
    const load = require('./lib/browser-module.js');
    return load(path.join(root, 'press', 'fonts.js')).Fonts || null;
  } catch (e) {
    warnings.push('press/fonts.js could not be read — no <link rel=preload> lines: ' + String((e && e.message) || e));
    return null;
  }
}

/* ── THE COMMAND LINE ─────────────────────────────────────────────────────
   node lab2/test/press/tools/build-game.js <fixture folder> [--force] [--out <slug>]

   A fixture folder is manifest.json + art/*.png (CONTRACTS §9). The other
   four objects of a bundle are not in it, so this end of the file makes
   them the way the Press Table will: the theme from the fixture's own
   palette through tools/lib/fixture-theme.js (press/palette.js →
   press/theme.js, no browser), the style vector from the Phase-3 golden
   fixtures/<name>/stats.json through Style.forPreset, and the layout from
   press/recipes.js if that file is there. A folder holding a bundle.json
   beats all of it — that is the road the Press Table's own bundles take
   when they are replayed from the line. */
function bundleFromFolder(folder, warnings) {
  const dir = path.resolve(folder);
  const manifest = JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8'));
  const bundleFile = path.join(dir, 'bundle.json');
  if (fs.existsSync(bundleFile)) {
    const b = JSON.parse(fs.readFileSync(bundleFile, 'utf8'));
    return Object.assign({ manifest }, b, { srcDir: dir });
  }

  const load = require('./lib/browser-module.js');
  const fixtureTheme = require('./lib/fixture-theme.js');
  const win = load(path.join(TEST, 'press', 'palette.js'));
  load(path.join(TEST, 'press', 'fonts.js'), win);
  load(path.join(TEST, 'press', 'theme.js'), win);
  load(path.join(TEST, 'press', 'style.js'), win);

  const statsFile = path.join(dir, 'stats.json');
  let stats = null, vector = null, preset = 'flat', dark = null;
  if (fs.existsSync(statsFile)) {
    const g = JSON.parse(fs.readFileSync(statsFile, 'utf8'));
    stats = g.stats; vector = g.vector; dark = g.hints && g.hints.dark;
    preset = (g.rank && g.rank[0] && g.rank[0].preset) || preset;
  } else {
    warnings.push('no stats.json in ' + path.basename(dir) + ' — press/style.js is a browser module and this end does not open one, so the style vector is the `flat` prototype (run perf/test-style.js to write the golden)');
  }
  const style = vector ? win.Style.forPreset(preset, vector) : Object.assign({ preset: 'flat' }, win.Style.PRESETS.flat);

  const pairing = win.Fonts.suggest({ style: style.preset, dark: !!dark, saturation: (stats && stats.saturation) || 0 })[0];
  const t = fixtureTheme.themeOf(dir, { fonts: pairing });
  const analysis = {
    palette: t.palette, dark: t.theme.dark,
    stats: stats || { paletteCount: t.palette.length, saturation: Math.round(t.saturation * 10000) / 10000 },
    vibe: null
  };
  const layout = recipeLayout(t.manifest, analysis, style, warnings);
  return { manifest, analysis, theme: t.theme, style, layout, srcDir: dir };
}

/* press/recipes.js is Appendix E, and the layout is its answer and never
   this file's: choose() ranks the three recipes from the art and the
   preset, resolve() lays the winner out. Both are pure, so they load in
   Node through lib/browser-module.js like every other press module here.
   `stickers` is not passed — the tags map lives in the sheet and only a
   browser (Kits.extractOnly) has it — so the motif slots keep Appendix E's
   own parts and a sticker's box is the contract's 134 × 135, which is what
   recipes.js falls back to. A note's box in the layout is recipes.js's
   0.55-em ESTIMATE and is not used: this file typesets the words and cuts
   the section to what it measured (THE TEXT). */
function recipeLayout(manifest, analysis, style, warnings) {
  const file = path.join(TEST, 'press', 'recipes.js');
  if (!fs.existsSync(file)) throw new Error('press/recipes.js is missing — the command line makes a layout with it, and nothing here writes one of its own');
  const R = require('./lib/browser-module.js')(file).Recipes;
  if (!R || typeof R.resolve !== 'function') throw new Error('press/recipes.js exposes no Recipes.resolve()');
  const ranked = R.choose({ manifest, assets: manifest.assets, preset: style.preset, vibe: analysis.vibe });
  const id = ranked[0];
  warnings.push('recipe: ' + id + ' (recipes.js ranked ' + ranked.join(' > ') + ')');
  return R.resolve(id, { manifest, assets: manifest.assets, theme: null, style, vibe: analysis.vibe });
}

async function main(argv) {
  const args = (argv || process.argv.slice(2)).slice();
  const force = args.indexOf('--force') >= 0;
  let out = null;
  const oi = args.indexOf('--out');
  if (oi >= 0) { out = args[oi + 1]; args.splice(oi, 2); }
  const folder = args.filter(a => a !== '--force')[0];
  if (!folder) {
    console.error('usage: node lab2/test/press/tools/build-game.js <fixture folder> [--force] [--out <slug>]');
    process.exitCode = 2;
    return null;
  }
  const warnings = [];
  const bundle = bundleFromFolder(folder, warnings);
  if (out) {
    if (!SLUG_RE.test(out)) { console.error('--out ' + out + ' is not a slug: ^[a-z0-9-]{2,40}$'); process.exitCode = 2; return null; }
    bundle.manifest = Object.assign({}, bundle.manifest, { slug: out });
  }
  bundle.force = force;
  const res = await build(bundle, { root: TEST, srcDir: bundle.srcDir });
  res.warnings = warnings.concat(res.warnings || []);

  if (!res.ok) {
    console.error('build-game: ' + res.error);
    for (const w of res.warnings) console.error('  ! ' + w);
    process.exitCode = 1;
    return res;
  }
  console.log('built games/' + res.slug + '/');
  for (const a of res.art) {
    const ratio = a.src ? '  ' + (a.bytes / a.src).toFixed(2) + '× the source PNG' : '';
    console.log('  ' + a.file.padEnd(24) + String(a.w + '×' + a.h).padEnd(11) + String(a.bytes).padStart(8) + ' B  ' + String(a.ms).padStart(5) + ' ms  ' + a.how + ratio);
  }
  console.log('  sections: ' + Object.keys(res.sections).map(k => k + ' ' + res.sections[k]).join(', '));
  console.log('  page ' + res.bytes.page + ' B, art ' + res.bytes.art + ' B, type ' + res.type.family + (res.type.measured ? ' (measured)' : ' (fallback advance)'));
  for (const n of res.type.notes) console.log('    note ' + n.gizmo + ' @' + n.width + ': ' + n.measured.map(m => m.role + ' ' + m.size + 'px ×' + m.lines + ' (' + m.em + ' em/char)').join(', '));
  for (const w of res.warnings) console.log('  ! ' + w);
  return res;
}

module.exports = {
  build, main, bundleFromFolder, recipeLayout, narrowRect,
  readImage, alphaOf, fillTemplate, familyOf, picSection, stickerSection, shotSection, shotGeom, sheetSlots, sheetTextParts, noteBlocks, signLinks,
  CAP, WEBP_Q, SLUG_RE, MARK_TOP, MARK_END, ANCHOR, SK_BOX, SK_SPILL_R, SK_SPILL_B,
  FALLBACK_ADVANCE, NOTE, CHIP, LINKS, REQUIRED_PLACEHOLDERS
};

if (require.main === module) {
  main().then(r => { if (!r) process.exitCode = process.exitCode || 2; })
    .catch(e => { console.error(String((e && e.stack) || e)); process.exitCode = 1; });
}
