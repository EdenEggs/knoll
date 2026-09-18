/* ─── THE LAYOUT RECIPES ──────────────────────────────────────────────────
   press/recipes.js — window.Recipes: the three ways a game page can be laid
   out on the paper (poster, widescreen, scrapbook), the small rule that
   picks one from the art it was handed, the ranking that decides which
   stickers a recipe reaches for, and resolve() — the function that turns a
   recipe plus a manifest into the `layout` object of the plan's §3.5:
   {recipe, open, openNarrow, slots}. Pure: no document, no fetch, no bench,
   no random source. press/tools/test-recipes.js loads it in Node through
   lib/browser-module.js, which is only possible because it touches nothing.

   WHAT A LAYOUT IS FOR. It is a STARTING POINT and nothing more (§3.5's own
   last sentence): build-game.js writes one section per slot, the owner then
   drags things about on the bench and keep.js writes the arrangement back
   into the file, and from that moment the FILE is the truth. So this file
   is allowed to be opinionated and is not allowed to be clever: every
   number here is either Appendix E's, or measured off something else in the
   composition, or written down below with the reason it was chosen.

   ── THE COORDINATES ARE APPENDIX E'S, AND EIGHT OF THEM ARE CORRECTED ───
   Every x, y, scale, rot and stride the plan wrote down is in the three
   build functions, in world units, y growing downward, the composition's
   spine at x = 0 (the generator may offset the whole thing). Appendix E does
   not say how big a sticker is, where "beside the sign" is, or how tall a
   note comes out; those are this file's, each with a sentence. Where the
   plan named a part — burst behind the logo, tape-strip on the key art's
   corner, tag-wishlist beside the sign, banner under the hero's right end —
   that part is placed. ONE named part is not: the appendix's `badge-round`
   on the hero's top-right is drawn round a picture and a word, a decoration
   has neither, and an empty window is worse than a different seal, so that
   corner is a `burst-round` and widescreen() argues it at length. (A pixel
   game might want frame-pixel instead of frame-polaroid round its
   screenshots. It does not get that here: the plan named the polaroid, and
   the tweak panel and the bench are where a person changes their mind.)

   EIGHT THINGS ARE NOT the appendix's, and every one of them was changed by
   LOOKING at a built page at its own opening zoom (2026-09-07,
   perf/shot-games.js and perf/verify-game.js; the before is
   perf/results/phase5-before/ and perf/results/phase5/). Plan §0.5 says
   exactly this: Appendix E's coordinates are "a first guess … the fixture
   tests and probes are how it gets corrected".

     · the note's type is 34 and not 22 (NOTE, below) — the bench's own size
       read as small print on a page that opens at half the bench's zoom,
       and 34 is what puts a paragraph over 10 screen px on the SMALLEST
       screen plan §9 5.5 judges on, on the recipe that frames tightest
     · widescreen's three text coordinates were all INSIDE the hero's own
       rectangle; the words are in a column beside it now (widescreen)
     · the poster's key art is at scale 1.3 and not 0.55 — at 0.55 it drew
       narrower than one of its own screenshots (poster)
     · every note column is 960 and not 560, which is ~44 characters a line
       at the new body size
     · the poster's column FLOWS from its first note instead of standing on
       three fixed y's a longer game name would have collided
     · the opening rectangle is NOT widened to the bench's aspect (openOf,
       below): widening it can only lower the zoom a page lands at, and it
       cost the poster a fifth of its type
     · the seal on the hero's top-right is `burst-round` and not the
       appendix's `badge-round` — badge-round is drawn round a window and a
       word, and a decoration has neither (widescreen)
     · the banner under the hero carries the manifest's RELEASE YEAR; a text
       part with nothing to say is not placed at all (widescreen)

   Each of those is argued where it is written. Everything else — the hero,
   the logo, the burst, the tape, the rows, the strides, the rotations — is
   Appendix E's, unchanged.

   ── HOW A PICTURE IS SIZED, AND WHY THE WHOLE COMPOSITION FOLLOWS THE ART
   Appendix E: "Pictures are placed at their natural pixel size × scale; the
   recipe gives `scale` for a 1600-px-wide hero and the generator rescales
   proportionally." Two things are being said, and both are done here:

   1. Every recipe has a RULER — the picture its numbers were drawn around
      (the hero for widescreen, the key art for poster and scrapbook). The
      ruler is placed at its own natural pixel size × the recipe's scale,
      literally. The composition's scale is then k = the ruler's pixel width
      ÷ the width the recipe was written for (REF below), and every
      coordinate, every box and every type size is multiplied by k. So a
      game whose hero arrives at 800 px instead of 1600 gets the SAME
      picture at half the world size — every proportion held, the opening
      rectangle halved with it — and its hero is drawn at 800 units, which
      is 1:1 with its own pixels. Nothing is ever upscaled by the layout.
   2. Every OTHER picture is normalised to a reference width first: its world
      width is REF[role] × scale × k, so the same logo exported at 256 px and
      at 1024 px lays out identically. Without that step a page's balance
      would depend on how big a file somebody happened to export, which is
      not a design decision anybody made.

   The consequence worth knowing: world size follows the art's resolution, and
   lab.js clamps the opening zoom to 1. A composition built from small art
   opens at 100 % rather than blown up past its own pixels — the right side to
   err on, and the only one available, since a 4-px-grid sprite blown up 2× is
   a different drawing. REF's three numbers come from the plan's own fixtures
   (Appendix H): 1600 is Appendix E's hero, 480 is pixelfort's portrait key
   art (the only portrait the plan describes), 640 is mosslight's and
   neonrun's logo (pixelfort's 256-px logo is the odd one out, and normalising
   is exactly what stops it drawing at two-fifths the size of the others).

   ── A SLOT'S BOX ────────────────────────────────────────────────────────
   Every slot carries w and h: the box the section will occupy in world
   units. The generator needs them (data-w/data-h × data-scale is what
   frames.js sizes an art panel by — NOTES §C.3), and the opening rectangle
   is computed from them.

   - a picture's box is its pixels × the emitted scale.
   - a sticker's box is the sheet's own: 128 + 6 wide, 128 + 7 tall, times
     scale. That pair is kits.js's (SK_BOX + spill, kits.js's natural(), and
     CONTRACTS §7): the forty parts were drawn to a contract rather than
     measured, so one pair of numbers is the whole kit. It is the SVG box,
     not the ink, so a thin part (banner, underline, tape) claims more paper
     here than it draws on — the opening rectangle comes out generous, which
     is the safe direction, and resolve() will use the real measured box for
     any part whose Kits.extractOnly record is passed in as `stickers`.
   - a note's and the sign's box is estimated by wrapping the words at 0.62 em
     average advance (NOTE.em, which says where that number came from) — plan
     §9 5.2 allows 0.55 for a generator that has no canvas, and 0.55 is LOW
     for one of the two body faces the nine pairings use. This file is pure
     and CANNOT measure; the generator can and should (§5.2 says so, and says
     to record which it used). The estimate is for the opening rectangle and
     for the slot under this one, and it is high rather than low for every
     face measured, so a note is more likely to come out shorter than its box
     than longer.

   ── THE OPENING RECTANGLE IS COMPUTED, NOT WRITTEN DOWN ──────────────────
   Appendix E: the bounding box of every slot plus 120 of margin, widened or
   heightened to the main bench's opening ASPECT, never smaller than the box.
   THE WIDENING IS GONE, and openOf() below carries the measurement that
   took it out: lab.js lands the page at min(w-fit, h-fit), so making the
   rectangle bigger on the axis that does not bind can only lower the zoom
   and can never raise it. The rectangle is the composition's box plus the
   margin, in the composition's own shape. The paper either side of a
   portrait composition arrives free, from the screen it is centred in, and
   a NARROW screen is what data-open-narrow is for — which is the same
   division of labour lab.js's own WIDE and NARROW rectangles make.

   AND A NARROW ONE, for a phone. lab.js's WHERE IT OPENS takes data-open for
   a wide screen and data-open-narrow under 700 px, and its own pair is the
   model: the narrow rectangle keeps the wide one's y and height and cuts the
   width down to the mark's own — "the same band with the groves left off the
   sides". A game page's groves are its screenshot row and its loose stickers;
   its spine is the pictures that name it and the words that explain it (the
   logo, the key art or hero, the notes, the sign). So openNarrow is the
   bounding box of THOSE plus the same 120 margin, on the wide rectangle's y
   and height. On pixelfort's poster that is 1960 against the wide
   rectangle's 2454; on the widescreen recipe the spine IS the whole width
   (the words stand beside the hero) and the two rectangles come out equal,
   which is the honest answer and not a bug — there are no groves to leave
   off the sides of that composition.

   ── CHOOSING A RECIPE ───────────────────────────────────────────────────
   choose() is Appendix E's four lines, scored so the answer is a ranked
   list and not a single id (the Press Table shows three mockups — §10 6.2
   step 4): portrait key art → poster; a landscape hero and no portrait →
   widescreen; a hand-drawn or cozy preset → scrapbook OFFERED SECOND (50
   against a fit's 100, so it never displaces the shape of the art, but it
   does win when there is no key art and no hero to go on); and the vision
   call's own `recipe` overrides everything when its confidence is ≥ 0.6
   (Appendix E's number, and §11 step 5's line for the same model). Ties fall
   back to Appendix E's own order, poster → widescreen → scrapbook.

   ── RANKING THE STICKERS ────────────────────────────────────────────────
   rankStickers(tags, {motifs, mood, count}) scores each part by tag overlap
   with the vision call's motifs and mood. The tags are the sheet's own —
   the `tags` map inside features/stickers-core.dc.html's data-props, which
   is Appendix D's table — and they are an ARGUMENT: this file does not fetch
   the sheet, and the caller (the Press Table, the builder) already has it
   from Kits.extractOnly. A motif hit is worth 3 and a mood hit 1, because a
   motif is a thing the model SAW in the art and a mood is how it felt about
   it; §11 step 5 says motifs rank the tray. Motif tags match by name — the
   sheet's motif tags are drawn from the same menu Appendix F gives the model,
   which is the whole reason they are in the sheet. Mood words are not:
   Appendix F's ten moods and Appendix D's tag vocabulary were written apart
   and nothing in the codebase joins them, so MOOD_TAGS below is that join,
   written by hand, and it is taste rather than measurement. Ties break by
   Appendix D's order, so the answer never depends on object key order.

   Where the ranking actually lands on the page: scrapbook's three loose
   ornaments (leaf-sprig, mushroom, heart) and the poster's pair of sparkles
   are MOTIF SLOTS — a place in the composition that wants a small drawing of
   something the game is about. With no vibe they are Appendix E's own parts,
   unchanged. With motifs in hand they are the top of the ranking, drawn from
   Appendix D's last fourteen (star … crescent): the loose ornaments, the only
   parts that mean a thing rather than do a job. Frames, tape, banners,
   bubbles, arrows and tags are structure and never swap.

   ── WHAT resolve() IS GIVEN AND WHAT IT IGNORES ─────────────────────────
   resolve(id, {manifest, assets, theme, style, stickers, vibe}). manifest
   and assets are the composition. `stickers` is either the tags map or a
   whole Kits.extractOnly result ({part: {still, w, h, tags, text}}) — the
   second is better, because its w/h are the parts as actually drawn. `vibe`
   feeds the motif slots. `theme` and `style` are accepted and move NOTHING:
   a layout is geometry, the theme paints it and the style skins the stickers,
   and the two run over the same slots afterwards. They are in the signature
   because the caller has them and because a later recipe may want them; a
   recipe that starts reading them should say so here first.

   Deterministic: same input → the same layout, key for key. No Math.random
   anywhere (the scrapbook's scatter is a written-down table, not a roll),
   and every number is rounded — 2 dp for world units, 4 for scale and rot —
   so game.json does not carry 141.50000000000003 and two runs compare equal.
   ───────────────────────────────────────────────────────────────────────── */
(function () {
  'use strict';

  /* ── the constants, and where each came from ─────────────────────────── */

  /* The sticker sheet's box: every one of the forty parts is a 128 × 128 svg
     and the root drop-shadow reaches 6 right and 7 down. kits.js's natural()
     and SHEETS.stickers.spill, CONTRACTS §7 — one pair for the whole kit. */
  const SK_BOX = 128, SPILL_R = 6, SPILL_B = 7;
  const SK_W = SK_BOX + SPILL_R, SK_H = SK_BOX + SPILL_B;

  /* Appendix E's margin round the composition, and the bench's own opening
     rectangle. 3200 × 1390 is lab.js's WIDE rectangle (WHERE IT OPENS, line
     1594) — NOT the plan's 1848 × 1928, which has been stale since
     2026-09-04 (NOTES §D.2). OPEN is here as the bench's own number, for a
     caller that wants to compare a composition with it; NOTHING IS FITTED
     TO ITS ASPECT any more, and openOf() says what was measured. */
  const MARGIN = 120;
  const OPEN = { w: 3200, h: 1390 };

  /* The pixel width each picture role's `scale` was written for (Appendix E
     for the hero; Appendix H's fixtures for the other two). A landscape key
     art is a hero and takes the hero's number. */
  const REF = { hero: 1600, keyart: 480, logo: 640 };

  /* A note's type, in world units.

     IT IS NOT THE BENCH'S 22, AND THAT IS A MEASUREMENT (2026-09-07,
     perf/shot-games.js). The first cut took the wall note verbatim — 22 at
     line-height 1.32 with 12 × 9 of padding (lab.css .wall-note /
     .wall-note-in, lines 799–802) — on the argument that a note on a game
     page and a note on the bench should be the same object at the same size.
     They are not read at the same size. The bench frames its own opening
     rectangle at 0.72 and a game page frames its whole composition, which is
     three times as tall as it is on the bench, so the same 22 units came out
     at 7.4–8.6 px — small print, and every fixture's description read as
     small print (perf/results/phase5-before/words-*.png).

     34 AND NOT 30, AND THE SECOND CORRECTION IS THE HONEST ONE. The 30 that
     replaced the 22 was measured at 1600 × 1000, the viewport every
     lab2/perf script runs in. Plan §9 5.5 judges a page at 2560 × 1111 and
     at 1366 × 768, and the LAPTOP is the tight one: perf/verify-game.js
     measured the same paragraph at 8.6 px on pixelfort there and 10.0 px on
     the other two (perf/results/game/summary.json, 2026-09-07). Dropping
     openOf's widening got the poster to 9.0 and no rectangle can do better:
     that page's composition is 1758 tall in a 645-px bench, so even a
     rectangle with NO margin at all lands at 0.34 and reads 10.2 px. The
     number that could reach the floor was therefore the type's own —
     34 = ceil(10 ÷ 0.2991), the poster's landed zoom at 1366 × 768 — and it
     is measured, not asserted: 10.2 px on pixelfort, 11.5 on neonrun and
     12.2 on mosslight at 1366, 17.0 and 19.8 at 2560. It costs the
     composition one thing, and it is written down where it is paid: the
     columns went to 960 with it (the widescreen's would otherwise have run
     into the screenshot row).

     The title and the tagline have no precedent (no game page existed): 2.5×
     the body reads as a heading at the opening zoom and a third above the
     body sits the tagline between the two without becoming a second heading.
     The padding and the gap keep the wall note's proportion at the new size
     (12 × 9 and 12 at 22 → 18 × 14 and 18 at 34).

     `em` IS 0.62 AND NOT PLAN §9 5.2's 0.55, and that is the difference
     between an estimate that is high and one that is sometimes low. This
     file is pure and cannot measure a face; the generator can, and it did
     (build-game.js, 2026-09-07): Public Sans 400 averages 0.4527 em a
     character, Kalam 0.4225 and Space Mono — the body of the `pixel` and
     `scifi` pairings — 0.6120. At 0.55 a Space Mono note wraps to more lines
     than this estimated, so every slot measured off its foot sat too high:
     neonrun's description came out one line taller than its box and the
     arrow under it landed on the last line (measured on the built page).
     0.62 is a shade over the widest of the three, so the estimate is high
     for all nine pairings, which is what the box is for. It costs the
     fixtures no opening zoom — on both recipes the composition's height is
     set by the pictures, not by the column. */
  const NOTE = { body: 34, title: 85, tagline: 45, line: 1.32, em: 0.62, padX: 18, padY: 14, gap: 18 };

  /* The sign's chips are the bench's poster chip (lab.css .gz-poster b: 10 px
     type, 5 × 12 padding, 1.5 border, line-height 1.2) scaled to the note's
     body — × 3.4 — because the sign stands on the same paper as the notes and
     its words are read at the same distance, which is the whole reason the
     one number follows the other: the multiplier IS the body, and it moved
     from 3 to 3.4 when the body moved from 30 to 34. `gap` 21 is about half
     a chip's side padding: less and two chips read as one. */
  const CHIP = { size: 34, line: 1.2, padX: 41, padY: 17, border: 5, gap: 21 };

  /* The link chips, in this order, then anything else the manifest carries in
     its own key order. The labels are exported so build-game.js draws the
     same words this file measured. */
  const LINKS = { steam: 'Steam', itch: 'itch.io', site: 'Website', press: 'Press kit', trailer: 'Trailer' };
  const LINK_ORDER = ['steam', 'itch', 'site', 'press', 'trailer'];

  /* Sticker sizes. Appendix E names the parts and their places, never their
     size, so each of these is a ratio against the thing it sits on (so it
     keeps working when the art changes) or a number the row's own stride
     fixes. A sticker's box is 134 wide, which is what the stride sums use. */
  const SK = {
    burstOverLogo: 1.28,  // a burst that does not stand out past the logo is not behind anything; 28 % puts a seventh of it either side
    tapeOnArt: 0.55,      // a strip of washi tape across a corner runs about half the picture's width
    tagBeside: 1.6,       // 214 units beside a chip strip whose own row is 85 tall: a tag you read at the same glance as the links
    sparkleBig: 0.8,      // a pair, two sizes — 107 and 74 units of BOX, whose ink is punctuation beside an 85-unit title
    sparkleSmall: 0.55,
    polaroid: 2.9,        // the poster's row strides 400 (Appendix E) and a sticker's box is 134: 2.9 → 389, an 11-unit gutter
    film: 3.3,            // the widescreen row strides 460: 3.3 → 442, an 18-unit gutter
    polaroidBook: 2.6,    // the scrapbook's rows stride 380 and are meant to look thrown down: 2.6 → 348, a 32-unit gutter
    banner: 3.5,          // 469 units under a 1600-wide hero — a ribbon that carries a word across a bit under a third of it
    arrow: 1.6,           // 214 units: the widescreen's description and its sign are 150 apart now, and an arrow smaller than its own gap does not read as crossing it
    seal: 1.6,            // the same 214: a seal on the hero's corner, an eighth of the hero's width
    pin: 0.8,             // 107 units at the top edge of a 348-unit polaroid — a pushpin, not a plate
    tapeX: 1.2,           // 161 units over a note's corner: two crossed pieces, each about a sixth of the note's 960
    circleOverNote: 1.25, // a hand-drawn ring has to go ROUND the words, so it is 25 % past the note's own width
    motif: 1.3,           // 174 units — a loose ornament about five capitals wide at the 34-unit body, the size a doodle in a margin is
    tapeCorner: 1.1       // 147 units of tape over a corner, a touch smaller than the tape-x pair
  };

  /* The scrapbook's scatter and tilt. Written down rather than rolled: this
     file is deterministic (the test holds it to that) and a seeded generator
     would be one more thing to seed and to explain. Every angle is inside
     Appendix E's −4…+4. */
  const BOOK_ROT = [-3, 2, 1, -1, 3, -2, 4, -4, 2, -3, 1, 3];
  const BOOK_DX = [0, 18, -14, 8, -20, 12];
  const BOOK_DY = [0, -22, 14, -10, 18, -6];

  /* Appendix D's forty, in the sheet's own order — the order the tray shows
     and the order a tie breaks by. */
  const PARTS = ['burst', 'burst-round', 'banner', 'ribbon-corner', 'badge-round', 'badge-shield',
    'tape-strip', 'tape-x', 'frame-polaroid', 'frame-ornate', 'frame-pixel', 'frame-film',
    'arrow', 'arrow-double', 'pointer-hand', 'circle-mark', 'underline',
    'bubble-speech', 'bubble-thought', 'bubble-shout',
    'tag-new', 'tag-soon', 'tag-wishlist', 'tag-price', 'pin', 'clip',
    'star', 'stars-3', 'sparkle', 'heart', 'fire', 'bolt', 'skull', 'sword', 'gear', 'hex-grid',
    'leaf-sprig', 'mushroom', 'cloud', 'crescent'];

  /* The loose ornaments: Appendix D's last fourteen. Everything before them
     does a job (a frame frames, tape sticks, a tag labels, an arrow points);
     these are the only parts that are simply a small drawing of a thing, so
     they are the only ones a motif may put in a motif slot. */
  const MOTIF_PARTS = PARTS.slice(PARTS.indexOf('star'));

  /* Appendix F's ten moods against Appendix D's tags. The two vocabularies
     were written apart and nothing joins them, so this is the join, by hand:
     cozy and retro are in both and stand for themselves; the other eight name
     the tags a person would reach for with that word in their head. The two
     harmony words (Appendix F's `harmony`, and theme.js's `mood`) are here
     too so a caller with no vision call can still say `loud`. */
  const MOOD_TAGS = {
    cozy: ['cozy', 'nature', 'scrapbook'],
    whimsical: ['sparkle', 'comic', 'magic', 'cozy'],
    dread: ['horror', 'skull', 'night', 'moon'],
    gritty: ['grunge', 'horror', 'skull', 'sketch'],
    neon: ['scifi', 'tech', 'energy', 'storm'],
    epic: ['fantasy', 'award', 'sword', 'fire'],
    melancholy: ['night', 'moon', 'cloud', 'nature'],
    chaotic: ['hype', 'energy', 'comic', 'fire'],
    serene: ['nature', 'leaf', 'cloud', 'cozy'],
    retro: ['retro', 'pixel', 'cinema'],
    calm: ['cozy', 'nature', 'sketch'],
    loud: ['hype', 'energy', 'sparkle']
  };
  const W_MOTIF = 3, W_MOOD = 1;      // a motif is a thing the model saw; a mood is how it felt (§11 step 5)

  const IDS = ['poster', 'widescreen', 'scrapbook'];          // Appendix E's own order, and every tie's fallback
  const SCRAPBOOK_PRESETS = ['ink-sketch', 'cozy-soft', 'painterly'];   // Appendix E, verbatim
  const VIBE_MIN = 0.6;               // Appendix E: the vision call overrides at confidence ≥ 0.6
  const FIT = 100, SECOND = 50, OVERRIDE = 1000;
  const NOTE_REFS = ['title', 'description', 'release'];       // the generator's own names for its three notes
  const SIGN_REF = 'links';

  /* ── small arithmetic ────────────────────────────────────────────────── */

  const r2 = v => Math.round(v * 100) / 100 + 0;              // world units: 2 dp, and never -0
  const r4 = v => Math.round(v * 10000) / 10000 + 0;          // scale and rot
  const clamp = (v, lo, hi) => v < lo ? lo : (v > hi ? hi : v);
  const arr = v => (v == null ? [] : (Array.isArray(v) ? v : [v]));

  /* Greedy wrap at NOTE.em average advance — plan §9 5.2's allowance. A word
     longer than the column takes as many lines as it needs rather than
     running off the edge, which is what a <text> with a wrap would do. */
  function lineCount(text, col, size) {
    const adv = size * NOTE.em;
    if (!(col > 0) || !(adv > 0)) return 1;
    let n = 0;
    const pars = String(text == null ? '' : text).split('\n');
    for (const par of pars) {
      const words = par.split(/\s+/).filter(Boolean);
      if (!words.length) { n += 1; continue; }
      let used = 0, open = false;
      for (const word of words) {
        const ww = word.length * adv;
        if (open && used + adv + ww <= col) { used += adv + ww; continue; }
        n += 1; used = ww; open = true;
        if (ww > col) { const extra = Math.ceil(ww / col) - 1; n += extra; used = ww - extra * col; }
      }
    }
    return n || 1;
  }

  function noteHeight(ref, text, width) {
    const col = Math.max(1, width - 2 * NOTE.padX);
    let h = 2 * NOTE.padY;
    if (ref === 'title') {
      const s = String(text == null ? '' : text), cut = s.indexOf('\n');
      const head = cut < 0 ? s : s.slice(0, cut), rest = cut < 0 ? '' : s.slice(cut + 1);
      h += lineCount(head, col, NOTE.title) * NOTE.title * NOTE.line;
      if (rest.trim()) h += NOTE.gap + lineCount(rest, col, NOTE.tagline) * NOTE.tagline * NOTE.line;
    } else {
      h += lineCount(text, col, NOTE.body) * NOTE.body * NOTE.line;
    }
    return h;
  }

  /* The links, in LINK_ORDER then the manifest's own order, as {key, label}. */
  function linkChips(links) {
    const out = [];
    if (!links || typeof links !== 'object') return out;
    const seen = Object.create(null);
    for (const k of LINK_ORDER) if (links[k]) { out.push({ key: k, label: LINKS[k] }); seen[k] = 1; }
    for (const k of Object.keys(links)) {
      if (seen[k] || !links[k]) continue;
      out.push({ key: k, label: LINKS[k] || (k.charAt(0).toUpperCase() + k.slice(1)) });
    }
    return out;
  }

  function signHeight(chips, width) {
    const col = Math.max(1, width - 2 * NOTE.padX);
    const rowH = CHIP.size * CHIP.line + 2 * CHIP.padY + 2 * CHIP.border;
    let rows = 1, used = 0;
    for (const c of chips) {
      const w = c.label.length * CHIP.size * NOTE.em + 2 * CHIP.padX + 2 * CHIP.border;
      if (used === 0) used = w;
      else if (used + CHIP.gap + w <= col) used += CHIP.gap + w;
      else { rows += 1; used = w; }
    }
    return 2 * NOTE.padY + rows * rowH + (rows - 1) * CHIP.gap;
  }

  /* THE RIBBON'S WORD, off the manifest. A text part's words come from the
     section's data-text (CONTRACTS §7) and the sheet's own `skText` is '',
     so a text part a recipe places without words is drawn as a blank —
     which is what the widescreen banner was until 2026-09-07. The word has
     to come from the manifest (this file invents nothing a page then claims
     about a game) and it has to be SHORT: the banner's face is 84 of its
     128-unit box and holds about six capitals at its own 20-unit type
     (press/tools/parts/banner.html measures five at ~72), so anything longer
     runs off the ribbon onto its tails.

     `releaseDate` is the one field that is both. The schema allows any
     string up to 40 characters and the fixtures show the range — "2027",
     "2026-11-05", "2027-03" — so what is drawn is the YEAR: the first
     four-digit run, which is a ribbon's whole sentence under a hero and
     survives every spelling of a date a manifest may carry (including
     "Q1 2027"). A date with no year in it is used whole when it is short
     enough for the face ("TBA", "SOON"); anything else returns '' and the
     recipe leaves the banner OFF the page rather than putting a blank one
     on it. */
  const RIBBON_MAX = 6;
  function ribbonWord(release) {
    const s = String(release == null ? '' : release).trim();
    if (!s) return '';
    const year = /\d{4}/.exec(s);
    if (year) return year[0];
    return s.length <= RIBBON_MAX ? s.toUpperCase() : '';
  }

  /* ── the assets ──────────────────────────────────────────────────────── */

  function assetList(o) {
    const list = (o && o.assets) || (o && o.manifest && o.manifest.assets) || [];
    return Array.isArray(list) ? list.filter(a => a && a.id && a.w > 0 && a.h > 0) : [];
  }
  const byRole = (list, role) => list.filter(a => a.role === role);
  const portraitKeyart = list => byRole(list, 'keyart').filter(a => a.h > a.w)[0] || null;
  /* The hero is the hero, or a landscape key art standing in for one — which
     is the same reading choose() makes, so the two cannot disagree. */
  const heroOf = list => byRole(list, 'hero')[0] || byRole(list, 'keyart').filter(a => a.w >= a.h)[0] || null;
  /* The width a picture's `scale` was written for. A logo is a logo; for
     everything else the ORIENTATION decides, because that is what Appendix E
     was looking at when it wrote the two numbers down — a landscape picture is
     the 1600-wide hero, a portrait one is the 480-wide key art. */
  const refFor = (asset, role) => role === 'logo' ? REF.logo
    : (asset && asset.h > asset.w ? REF.keyart : REF.hero);

  /* ── choose ──────────────────────────────────────────────────────────── */

  function choose(o) {
    o = o || {};
    const list = assetList(o);
    const portrait = portraitKeyart(list), hero = heroOf(list);
    const score = { poster: 0, widescreen: 0, scrapbook: 0 };
    if (portrait) score.poster += FIT;
    if (hero && !portrait) score.widescreen += FIT;
    if (SCRAPBOOK_PRESETS.indexOf(o.preset) >= 0) score.scrapbook += SECOND;
    const v = o.vibe;
    if (v && IDS.indexOf(v.recipe) >= 0 && Number(v.confidence) >= VIBE_MIN) score[v.recipe] += OVERRIDE;
    return IDS.slice().sort((a, b) => (score[b] - score[a]) || (IDS.indexOf(a) - IDS.indexOf(b)));
  }

  /* ── rankStickers ────────────────────────────────────────────────────── */

  /* `tags` may be the sheet's map (part → [tag…]) or a whole extractOnly
     result (part → {tags: [tag…], …}); either way the answer is a list of
     part ids, best first, every part ranked so a caller can take as many as
     it likes. */
  function tagRows(tags) {
    const rows = [];
    if (!tags) return rows;
    if (Array.isArray(tags)) {
      for (const t of tags) if (t && t.id) rows.push({ id: t.id, tags: arr(t.tags) });
      return rows;
    }
    for (const id of Object.keys(tags)) {
      const v = tags[id];
      rows.push({ id: id, tags: Array.isArray(v) ? v : arr(v && v.tags) });
    }
    return rows;
  }

  /* The scored table, best first. rankStickers() is this with the scores
     dropped; resolve() keeps them, because a motif slot only swaps when the
     ranking actually said something (an all-zero table is Appendix D's order,
     which is not a judgement about this game). */
  function scoreParts(tags, o) {
    o = o || {};
    const rows = tagRows(tags);
    /* a bare object, no prototype: the motifs come off a model and the tags
       off a sheet, and `want['toString']` on a plain {} is a FUNCTION — the
       score would be NaN and the sort would go to pieces. (fonts.js's
       suggest() met the same hazard from the other side.) */
    const want = Object.create(null);
    for (const m of arr(o.motifs)) {
      if (m == null) continue;
      const k = String(m);
      want[k] = Math.max(want[k] || 0, W_MOTIF);
    }
    for (const m of arr(o.mood)) {
      if (m == null) continue;
      const k = String(m);
      const list = Object.prototype.hasOwnProperty.call(MOOD_TAGS, k) ? MOOD_TAGS[k] : [k];
      for (const t of list) want[t] = Math.max(want[t] || 0, W_MOOD);
    }
    const scored = rows.map(function (row, i) {
      let s = 0;
      for (const t of row.tags) s += want[String(t)] || 0;
      const at = PARTS.indexOf(row.id);
      return { id: row.id, score: s, order: at < 0 ? PARTS.length + i : at };
    });
    scored.sort((a, b) => (b.score - a.score) || (a.order - b.order));
    return o.count > 0 ? scored.slice(0, o.count) : scored;
  }

  function rankStickers(tags, o) {
    return scoreParts(tags, o).map(s => s.id);
  }

  /* ── the builder the three recipes are written against ───────────────── */

  /* Everything a build function places is in REFERENCE units — Appendix E's
     own numbers, as if the ruler had arrived at REF wide. resolve() multiplies
     the lot by k afterwards. Each placement returns its slot, so the next one
     can be put against its box ("beside the sign", "on the key art's
     top-left") instead of against a number nobody can check. */
  function builder(ctx) {
    const slots = [];
    function push(s) { s._n = slots.length; slots.push(s); return s; }

    return {
      ctx: ctx,
      slots: slots,

      /* A picture: box refFor(asset, role) × scale wide, the asset's own
         aspect tall. `role` is 'logo' or 'art' — see refFor. */
      pic: function (asset, role, x, y, scale, z, opts) {
        if (!asset) return null;
        const w = refFor(asset, role) * scale;
        const o = opts || {};
        return push({
          kind: 'pic', ref: asset.id, x: x, y: y, w: w, h: w * asset.h / asset.w,
          rot: o.rot || 0, z: z, _nat: { w: asset.w, h: asset.h }, _spine: true
        });
      },

      /* A sticker by its top-left corner (Appendix E gives the rows this way:
         x = −760 + 400·i is a left edge and a stride). */
      sticker: function (part, x, y, scale, z, opts) {
        const o = opts || {};
        const box = ctx.boxOf(part);
        const s = {
          kind: 'sticker', ref: part, x: x, y: y, w: box.w * scale, h: box.h * scale,
          scale: scale, rot: o.rot || 0, z: z
        };
        if (o.text) s.text = o.text;
        if (o.image) s.image = o.image;
        if (o.motif != null) s._motif = o.motif;
        return push(s);
      },

      /* …and by its centre, which is how "behind the logo", "on the corner"
         and "around the release date" are actually thought about. */
      stickerOn: function (part, cx, cy, scale, z, opts) {
        const box = ctx.boxOf(part);
        return this.sticker(part, cx - box.w * scale / 2, cy - box.h * scale / 2, scale, z, opts);
      },

      note: function (ref, text, x, y, width, z, opts) {
        if (!String(text == null ? '' : text).trim()) return null;
        const o = opts || {};
        return push({
          kind: 'note', ref: ref, x: x, y: y, w: width, h: noteHeight(ref, text, width),
          width: width, size: NOTE.body, text: String(text), rot: o.rot || 0, z: z, _spine: true
        });
      },

      sign: function (x, y, width, z, opts) {
        if (!ctx.chips.length) return null;
        const o = opts || {};
        return push({
          kind: 'sign', ref: SIGN_REF, x: x, y: y, w: width, h: signHeight(ctx.chips, width),
          width: width, size: CHIP.size, rot: o.rot || 0, z: z, _spine: true
        });
      }
    };
  }

  const centreOf = s => ({ x: s.x + s.w / 2, y: s.y + s.h / 2 });

  /* ── poster ──────────────────────────────────────────────────────────── */

  /* Appendix E: logo at (−300,−900) scale 0.5 · key art at (−520,−700) scale
     0.55 · title/tagline note at (240,−650) width 560 · description note at
     (240,−420) width 560 · sign at (240,−80) · screenshots as frame-polaroid
     image-slots in a row at y 320, x −760 + 400·i, rot alternating −2/+2 ·
     stickers: burst behind the logo (z under it), tape-strip on the key art's
     top-left, tag-wishlist beside the sign, sparkle ×2 near the title.

     THREE OF THOSE NUMBERS ARE CORRECTED, and here is what was looked at
     (perf/results/phase5-before/game-pixelfort.png, 2026-09-07 — plan §0.5:
     Appendix E's coordinates are "a first guess … the fixture tests and
     probes are how it gets corrected"):

     1 · THE KEY ART WAS THE SMALLEST THING ON ITS OWN POSTER. Scale 0.55 of
         the 480-wide portrait reference draws it 264 units across — narrower
         than one of the four polaroids under it (389), a seventh of the
         composition's width, and it is the picture the page is about. 1.3
         draws it 624 × 832: the tallest thing on the paper, which is what a
         key art is for. It costs nothing — it lands inside the bounding box
         the logo, the burst and the screenshot row already made, so the
         opening rectangle and the opening zoom do not move.
     2 · AND THE TEXT COLUMN SAT ON ITS OWN, far off to the right, because
         the art stopped at −256 and the column starts at 240: half the
         poster was paper. The column's x is Appendix E's, untouched; the art
         now reaches 104 and the gutter between them is 136, about a note's
         own padding × 8 — a column beside a picture rather than two things
         on one sheet.
     3 · THE COLUMN FLOWS instead of standing on Appendix E's three fixed
         y's. At the 34-unit body (NOTE, above) a title-and-tagline note is
         ~215 tall and −650 to −420 is 230, which the first fixture's
         tagline all but ate at the smaller body already; a fixed y that the
         note under it can grow into is a collision waiting for a longer game
         name. The top (240, −650) is Appendix E's and stays; everything
         under it is measured off the note above. */
  function poster(b) {
    const c = b.ctx, art = c.keyart || c.hero;
    /* Appendix E gives the poster's notes a width and its sign only a place;
       the sign takes the same column, because it is the foot of it. 960 and
       not Appendix E's 560: a paragraph wants about 44 characters a line, and
       at the 34-unit body and this file's own 0.62-em estimate that is
       928 + 2 × 18 of padding = 960 (Appendix E's 560 would be 26 characters,
       a newspaper column and not a paragraph). The column costs the
       composition 200 of width and NO opening zoom on either of plan §9
       5.5's screens — the poster's height binds at both — and it buys back
       two points of the screen margin, because a wider composition sits
       better on a landscape bench (30.3 % → 28.4 % at 2560, measured). */
    const NOTE_W = 960, COL_X = 240;
    const GAP = 54;        // a line and a half of body type between the notes
    const SIGN_GAP = 102;  // …and three before the buttons: a sign is a different kind of thing from a paragraph
    const ART_SCALE = 1.3; // see 1 · above

    const logo = b.pic(c.logo, 'logo', -300, -900, 0.5, 1);
    if (logo) {
      const m = centreOf(logo);
      // the burst is sized off the logo it backs and placed under it in the pile
      b.stickerOn('burst', m.x, m.y, SK.burstOverLogo * logo.w / SK_W, 0);
    }

    const pic = b.pic(art, 'art', -520, -700, ART_SCALE, 2);
    if (pic) {
      // a strip of tape across the top-left corner, at the angle tape lands at
      b.stickerOn('tape-strip', pic.x, pic.y, SK.tapeOnArt * pic.w / SK_W, 3, { rot: -20 });
    }

    let y = -650;
    const title = b.note('title', c.titleText, COL_X, y, NOTE_W, 5);
    if (title) {
      // two sparkles, one over the title's left shoulder and a smaller one
      // off the end of the tagline: punctuation, not a stamp
      b.stickerOn('sparkle', title.x - 24, title.y - 10, SK.sparkleBig, 7, { motif: 0 });
      b.stickerOn('sparkle', title.x + title.w + 6, title.y + title.h - 18, SK.sparkleSmall, 8, { motif: 0 });
      y = title.y + title.h + GAP;
    }
    const desc = b.note('description', c.description, COL_X, y, NOTE_W, 6);
    if (desc) y = desc.y + desc.h + SIGN_GAP;

    const sign = b.sign(COL_X, y, NOTE_W, 9);
    if (sign) {
      // beside the sign: a tag's own width to the right of it, hung a little
      // above the chips so it reads as pinned on rather than lined up
      b.sticker('tag-wishlist', sign.x + sign.w + 40, sign.y - 20, SK.tagBeside, 10, { text: 'WISHLIST' });
    }

    c.shots.slice(0, 4).forEach(function (shot, i) {
      b.sticker('frame-polaroid', -760 + 400 * i, 320, SK.polaroid, 4, { rot: i % 2 ? 2 : -2, image: shot.id });
    });
  }

  /* ── widescreen ──────────────────────────────────────────────────────── */

  /* Appendix E: hero at (−900,−950) scale 1.0 (1600 wide) · logo overlapping
     the hero's bottom-left at (−860,−380) scale 0.4 · title note right of the
     logo at (−200,−330) width 700 · description at (−860,−140) width 900 ·
     sign at (300,−140) · screenshots row at y 80 in frame-film slots, x −880
     + 460·i · stickers: banner under the hero's right end, arrow from the
     description to the sign, badge-round on the hero's top-right.

     THE WORDS CAME OFF THE PICTURE (2026-09-07, perf/shot-games.js — plan
     §0.5). Every one of Appendix E's three text coordinates is INSIDE the
     hero's own rectangle: the hero is (−900,−950) 1600 × 900, so it fills
     x −900…700 and y −950…−50, and the title (−200,−330), the description
     (−860,−140) and the sign (300,−140) all sit in its lower half. Against a
     busy key art that is not a composition, it is a caption burnt into a
     photograph: on neonrun the description had cyan grid lines through every
     word and the tagline was three shades off the sky behind it; on
     mosslight the tagline all but vanished into the moss
     (perf/results/phase5-before/words-neonrun.png and -mosslight.png). The
     logo STAYS on the hero — Appendix E asks for it there, it is art with
     alpha drawn to sit on art, and it is the one thing on the page that is a
     picture rather than a sentence.

     BESIDE THE HERO AND NOT UNDER IT, and that is arithmetic and not taste.
     openOf takes the composition's bounding box and adds the margin; the
     page then lands at min(w-fit, h-fit) in a bench that is 2.4:1 at
     2560 × 1111 and 2.1:1 at 1366 × 768, and this composition is 1.8:1 —
     so it is the HEIGHT that sets the opening zoom on both of plan §9 5.5's
     screens. Measured (perf/verify-game.js): the box is 1476 tall, the
     rectangle 1716, and 999 px of bench over that is the 0.58 the page opens
     at. Putting the words under the hero would have added ~500 of height and
     taken a quarter of that zoom straight off the page — the words would have
     been moved off the art and shrunk in the same stroke. Putting them in a
     column beside it costs NOTHING: the box grows in x, from 1842 to 2640,
     the rectangle to 2880, and the width still does not bind at either
     screen (the zoom is the same to four decimals). This was true when the
     rectangle was widened to the bench's aspect and it is still true now
     that it is not; the widening only ever moved the width. */
  function widescreen(b) {
    const c = b.ctx, hero = c.hero || c.keyart;
    /* The word column, to the right of a 1600-wide hero that ends at 700.
       80 of gutter: enough to read as a margin, and past the banner's ink,
       which reaches about 714 (its box is 469 wide from 301 and the ribbon
       is drawn inside it). 960 wide is ~44 characters a line at the 34-unit
       body — the poster's column, to the character, because it is the same
       words at the same size — and it puts the column's right edge at 1740.
       IT HAD TO GROW WITH THE BODY: at 720 the taller lines pushed this
       column's foot to y 158 and the screenshot row starts at 80, so the
       sign would have landed in the film strip (measured, 2026-09-07). At
       960 the foot is at −68 and the width still does not bind. */
    const COL_X = 780, COL_W = 960;
    const GAP = 54;        // a line and a half of body type between the notes
    const SIGN_GAP = 150;  // …and the arrow's own gap before the buttons: an arrow 214 across needs a gap it can be seen crossing

    const pic = b.pic(hero, 'art', -900, -950, 1.0, 0);
    if (pic) {
      const seal = SK.seal * SK_W;
      /* THE SEAL IS `burst-round` AND NOT APPENDIX E'S `badge-round`, and
         that is the one part in this file that does not do what the plan
         named. badge-round is drawn round two things it is given here:
         an image-slot — an opaque {{ skPaper }} rect the page MAY replace
         (plan §3.6) — and a word under it. This slot is DECORATION: a seal
         on the hero's corner, nothing more. There is no picture to put in
         it (the four screenshots are all spoken for, and a fifth image slot
         would make the page claim a screenshot the manifest has not got —
         perf/verify-game.js counts them), and no fact in a manifest belongs
         on a seal. So both of badge-round's slots would have stood empty,
         and they DID: the built page carried a white square on mosslight and
         a black one on neonrun, inside a blank ribbon of a badge
         (perf/results/phase5/game-*.png, 2026-09-07 — OPEN.md had it as a
         decision for the owner and this is the answer).
         The two other ways out were worse. Handing the badge a picture makes
         a page draw a screenshot it does not have. Hiding the placeholder
         from HERE means a per-section data-palette painting {{ skPaper }}
         `none` — which also erases the die-cut halo on any page whose theme
         turns halos on, and quietly makes a colour role mean "not drawn".
         burst-round is the same round scalloped seal with neither a window
         nor a word in it: it cannot be blank. */
      b.stickerOn('burst-round', pic.x + pic.w - seal * 0.5, pic.y + seal * 0.5, SK.seal, 6);
      /* Under the right end: the ribbon is drawn across the middle of its own
         128 box, so the box straddles the hero's bottom edge to put the ink
         30 units under it. IT IS ONLY PLACED IF IT HAS A WORD (c.ribbonText,
         resolve() below): banner is a text part, its words come from the
         section's data-text, and `skText` is '' — so a banner nobody gave a
         word to is a blank ribbon on the page, which is what both widescreen
         fixtures shipped until this was written. */
      if (c.ribbonText) {
        b.stickerOn('banner', pic.x + pic.w - SK.banner * SK_W * 0.35, pic.y + pic.h + 30, SK.banner, 5,
          { text: c.ribbonText });
      }
    }

    b.pic(c.logo, 'logo', -860, -380, 0.4, 2);

    /* the column's top edge is the hero's, so the two read as one band */
    let y = pic ? pic.y : -950;
    const title = b.note('title', c.titleText, COL_X, y, COL_W, 3);
    if (title) y = title.y + title.h + GAP;
    const desc = b.note('description', c.description, COL_X, y, COL_W, 4);
    if (desc) y = desc.y + desc.h + SIGN_GAP;
    const sign = b.sign(COL_X, y, COL_W, 7);
    if (desc && sign) {
      /* Appendix E's arrow "from the description to the sign" — the two are
         stacked now rather than side by side, so it is turned to point down
         and to the right at the chips, and it stands in the gap between them,
         a third of the way across the column. 45° and not the 58 a first cut
         had: kits.js clamps data-rot to ±45 (ROT_MAX — past a quarter turn a
         sticker is a different drawing) and layout.schema.json holds a slot
         to the same bound, so 58 was a number the page could never have
         drawn. Half a right angle also reads as a hop from one thing to the
         next rather than as an arrow that has fallen over. */
      b.stickerOn('arrow', COL_X + COL_W / 3, (desc.y + desc.h + sign.y) / 2, SK.arrow, 8, { rot: 45 });
    }

    c.shots.slice(0, 4).forEach(function (shot, i) {
      b.sticker('frame-film', -880 + 460 * i, 80, SK.film, 1, { rot: i % 2 ? 2 : -2, image: shot.id });
    });
  }

  /* ── scrapbook ───────────────────────────────────────────────────────── */

  /* Appendix E: everything rotated −4…+4 · key art at (−600,−900) scale 0.5
     rot −3 · logo at (−100,−950) scale 0.45 rot 2 · notes on tape-x at
     (200,−700) rot 1 · screenshots as polaroids scattered on two rows with
     pins · stickers: leaf-sprig, mushroom, heart, tape-strip ×4, circle-mark
     around the release date.

     Two things Appendix E leaves out and a page cannot do without: the notes
     under the first one (a description and, so circle-mark has something to
     circle, the release date on its own scrap) and the sign — the other two
     recipes have one, and a game page with no store links is a poster for a
     game nobody can buy. They follow the first note down the column at the
     same width, each tilted the other way. */
  function scrapbook(b) {
    const c = b.ctx, art = c.keyart || c.hero;
    /* Appendix E fixes the first note's corner (200, −700) and nothing else
       about the column: 960 is the poster's note width and this is the same
       column of the same words, the release scrap is 380 because a date is
       short and a scrap of paper is the size of what is on it (a date at the
       34-unit body is about 211 of ink in this scrap's 344-wide column, so
       it still fits with room), and 68 between them is the gap the notes are
       read down. The column went up with the 34-unit body (NOTE, above), in
       the same proportion as the poster's: a paragraph wants about 44
       characters a line at any size, and a column that does not grow with
       its type is one that grows in LINES instead, which is what pushes a
       scrapbook's notes down into its own polaroids.
       NOTHING HERE HAS BEEN LOOKED AT ON A PAGE — all three fixtures resolve
       to poster or widescreen, so no scrapbook was ever built or
       photographed. The numbers are kept consistent with the two recipes
       that were; the composition itself is untouched and unjudged. */
    const NOTE_W = 960, COL_X = 200, GAP = 68;

    const pic = b.pic(art, 'art', -600, -900, 0.5, 1, { rot: -3 });
    const logo = b.pic(c.logo, 'logo', -100, -950, 0.45, 2, { rot: 2 });

    let y = -700;
    const title = b.note('title', c.titleText, COL_X, y, NOTE_W, 4, { rot: 1 });
    if (title) {
      b.stickerOn('tape-x', title.x, title.y, SK.tapeX, 5, { rot: BOOK_ROT[0] });
      y = title.y + title.h + GAP;
    }
    const desc = b.note('description', c.description, COL_X, y, NOTE_W, 6, { rot: -1 });
    if (desc) {
      b.stickerOn('tape-x', desc.x + desc.w, desc.y, SK.tapeX, 7, { rot: BOOK_ROT[1] });
      y = desc.y + desc.h + GAP;
    }
    const rel = b.note('release', c.releaseText, COL_X, y, 380, 8, { rot: 2 });
    if (rel) {
      const m = centreOf(rel);
      b.stickerOn('circle-mark', m.x, m.y, SK.circleOverNote * rel.w / SK_W, 9);
      y = rel.y + rel.h + GAP + 10;
    }
    const sign = b.sign(COL_X, y, NOTE_W, 10, { rot: -1 });

    /* tape-strip ×4 — the four things on the page that are stuck down: the
       key art's two opposite corners, the logo's top edge, the sign's corner.
       The poster lays its one strip across a corner at −20, which is the
       angle a hand sticks tape at; here the angles come off BOOK_ROT with
       everything else, because Appendix E caps THIS recipe at −4…+4 and the
       plan's rule outranks the gesture. */
    if (pic) {
      b.stickerOn('tape-strip', pic.x, pic.y, SK.tapeCorner, 3, { rot: BOOK_ROT[6] });
      b.stickerOn('tape-strip', pic.x + pic.w, pic.y + pic.h, SK.tapeCorner, 3, { rot: BOOK_ROT[7] });
    }
    if (logo) b.stickerOn('tape-strip', logo.x + logo.w / 2, logo.y, SK.tapeCorner, 3, { rot: BOOK_ROT[8] });
    if (sign) b.stickerOn('tape-strip', sign.x, sign.y, SK.tapeCorner, 11, { rot: BOOK_ROT[9] });

    /* The screenshots, two rows of polaroids with a pin in each. The stride
       is 380 and the rows are 420 apart — a 348-unit polaroid plus air, so a
       tilted one never touches the row below. The scatter is BOOK_DX/DY. */
    const shots = c.shots.slice(0, 6);
    const per = Math.max(1, Math.ceil(shots.length / 2));
    shots.forEach(function (shot, i) {
      const row = Math.floor(i / per), col = i % per;
      const x = -700 + 380 * col + BOOK_DX[i % BOOK_DX.length];
      const yy = 240 + 420 * row + BOOK_DY[i % BOOK_DY.length];
      const p = b.sticker('frame-polaroid', x, yy, SK.polaroidBook, 12 + i * 2,
        { rot: BOOK_ROT[(i + 2) % BOOK_ROT.length], image: shot.id });
      b.stickerOn('pin', p.x + p.w / 2, p.y + 10, SK.pin, 13 + i * 2, { rot: BOOK_ROT[(i + 5) % BOOK_ROT.length] });
    });

    /* The three loose ornaments Appendix E names, which are also this
       recipe's motif slots: one at the key art's foot, one under the notes,
       one beside the sign. */
    const column = rel || desc || title;
    if (pic) b.stickerOn('leaf-sprig', pic.x + 40, pic.y + pic.h + 30, SK.motif, 14 + shots.length * 2, { rot: BOOK_ROT[3], motif: 0 });
    if (column) b.stickerOn('mushroom', column.x - 90, column.y + column.h / 2, SK.motif, 15 + shots.length * 2, { rot: BOOK_ROT[4], motif: 1 });
    if (sign) b.stickerOn('heart', sign.x + sign.w + 70, sign.y + sign.h / 2, SK.motif, 16 + shots.length * 2, { rot: BOOK_ROT[5], motif: 2 });
  }

  const RECIPES = {
    poster: { id: 'poster', ruler: 'keyart', build: poster },
    widescreen: { id: 'widescreen', ruler: 'hero', build: widescreen },
    scrapbook: { id: 'scrapbook', ruler: 'keyart', build: scrapbook }
  };

  /* ── resolve ─────────────────────────────────────────────────────────── */

  /* The part's box: the sheet's contract (128 + spill), or the part as it was
     actually measured when a Kits.extractOnly record is handed in — kits.js's
     natural() adds the same spill to the record's w/h, so the two agree. */
  function boxOfPart(stickers, part) {
    const rec = stickers && !Array.isArray(stickers) ? stickers[part] : null;
    if (rec && rec.w > 0 && rec.h > 0) return { w: rec.w + SPILL_R, h: rec.h + SPILL_B };
    return { w: SK_W, h: SK_H };
  }

  function bboxOf(list) {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const s of list) {
      x0 = Math.min(x0, s.x); y0 = Math.min(y0, s.y);
      x1 = Math.max(x1, s.x + s.w); y1 = Math.max(y1, s.y + s.h);
    }
    if (!isFinite(x0)) return { x: 0, y: 0, w: 0, h: 0 };
    return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
  }

  /* THE RULE: the bounding box of every slot plus 120 of margin, in the
     composition's own shape. That is all of it.

     APPENDIX E ASKED FOR MORE AND THE MORE WAS A COST. Its sentence is "the
     bounding box of every slot plus 120 of margin, widened or heightened to
     the main bench's opening aspect, never smaller than the box", and this
     function did that until 2026-09-07. Plan §0.5 says an appendix
     coordinate is a first guess and the probes are how it gets corrected;
     this one was corrected by perf/verify-game.js, and here is the whole of
     the argument.

     lab.js frames the rectangle at min((bench.w − 48) ÷ open.w,
     (bench.h − 48) ÷ open.h) and centres it (WHERE IT OPENS). Both terms
     fall as the rectangle grows, so ENLARGING THE RECTANGLE ON EITHER AXIS
     CAN ONLY LOWER THE ZOOM A PAGE LANDS AT, and never raise it. The
     widening was therefore not a way of putting paper round the composition;
     it was a way of paying for paper the screen gives away. A composition
     narrower than the bench is already centred with paper either side of it,
     because a rectangle can only be BIGGER than the box it holds — and a
     screen too narrow for the wide rectangle has data-open-narrow, which is
     the same division of labour lab.js's own WIDE and NARROW rectangles
     make.

     WHAT IT COST, MEASURED at plan §9 5.5's two screens (verify-game.js,
     2026-09-07, perf/results/game/summary.json). The poster is the case that
     shows it: a 2014 × 1758 composition — 1.15:1, PORTRAIT — was widened
     from 2254 × 1998 to 4599 × 1998, which is 28.1 % of the rectangle bare
     paper on each side. At 2560 × 1111 the height binds either way and the
     widening was free; at 1366 × 768 it took the landed zoom from 0.2991 to
     0.2866 and the page's body type from 9.0 screen px to 8.6, against the
     two widescreen pages' 10.0. Taking it out gives the widescreen pages
     0.3595 and 0.3368 at that screen where they had 0.3336 — a fourteenth
     and a hundredth more zoom — and costs nothing anywhere: no page's
     rectangle got smaller than the box plus the margin, which is the one
     thing Appendix E asked for that still stands.

     (It does not, on its own, put the poster's type over 10 px: no rectangle
     can, and NOTE above carries that measurement and the number that closed
     the gap.)

     THE MARGIN is a REFERENCE-unit number like every other number in
     Appendix E, so it is multiplied by k with the rest of the composition: a
     page laid out from half-size art is then the same picture at half the
     world size, margin and opening rectangle included, rather than the same
     picture in a relatively twice-as-thick frame. */
  function openOf(slots, k) {
    const b = bboxOf(slots), m = MARGIN * k;
    return { x: r2(b.x - m), y: r2(b.y - m), w: r2(b.w + 2 * m), h: r2(b.h + 2 * m) };
  }

  /* The phone's rectangle: lab.js's own move — the wide one's y and height,
     the width of the spine (the pictures that name the game and the words
     that explain it), the groves left off the sides. */
  function narrowOf(spine, open, k) {
    const b = bboxOf(spine);
    const w = b.w + 2 * MARGIN * k;
    if (!(w > 0) || w >= open.w) return { x: open.x, y: open.y, w: open.w, h: open.h };
    return { x: r2(b.x + b.w / 2 - w / 2), y: open.y, w: r2(w), h: open.h };
  }

  function resolve(id, o) {
    const spec = RECIPES[Object.prototype.hasOwnProperty.call(RECIPES, id) ? id : ''];
    if (!spec) throw new RangeError('recipes.js: no recipe "' + id + '" (one of ' + IDS.join(', ') + ')');
    o = o || {};
    const manifest = o.manifest || {};
    const list = assetList({ assets: o.assets, manifest: manifest });
    const stickers = o.stickers || null;
    const vibe = o.vibe || (o.analysis && o.analysis.vibe) || null;

    const keyart = byRole(list, 'keyart')[0] || null;
    const ctx = {
      manifest: manifest,
      logo: byRole(list, 'logo')[0] || null,
      keyart: keyart,
      hero: heroOf(list),
      shots: byRole(list, 'screenshot'),
      titleText: [manifest.title, manifest.tagline].filter(t => t && String(t).trim()).join('\n'),
      description: manifest.description || '',
      releaseText: manifest.releaseDate || '',
      ribbonText: ribbonWord(manifest.releaseDate),
      chips: linkChips(manifest.links),
      boxOf: function (part) { return boxOfPart(stickers, part); }
    };

    const b = builder(ctx);
    spec.build(b);

    /* The motif slots, if there is anything to rank with. Nothing here when
       the caller has no vibe and no tags: the layout is then Appendix E's
       own parts, which is the point of naming them. */
    const marked = b.slots.filter(s => s._motif != null);
    if (marked.length && stickers && vibe && (arr(vibe.motifs).length || arr(vibe.mood).length)) {
      const want = Object.create(null);
      for (const row of tagRows(stickers)) if (MOTIF_PARTS.indexOf(row.id) >= 0) want[row.id] = row.tags;
      let top = 0;
      for (const s of marked) top = Math.max(top, s._motif);
      const picks = scoreParts(want, { motifs: vibe.motifs, mood: vibe.mood, count: top + 1 });
      // only when the ranking actually said something: an all-zero table is
      // Appendix D's order, which is not a judgement about this game
      if (picks.length && picks[0].score > 0) {
        for (const s of marked) if (picks[s._motif] && picks[s._motif].score > 0) s.ref = picks[s._motif].id;
      }
    }

    /* Reference units → world units. k is the ruler's own pixels against the
       width its recipe was written for; the ruler therefore lands at natural
       × the recipe's scale, and everything else keeps its proportion to it. */
    const ruler = spec.ruler === 'hero' ? (ctx.hero || ctx.keyart) : (ctx.keyart || ctx.hero);
    const k = ruler ? ruler.w / refFor(ruler, 'art') : 1;

    const ordered = b.slots.slice().sort((a, c2) => (a.z - c2.z) || (a._n - c2._n));
    const spine = [];
    const slots = ordered.map(function (s, i) {
      const out = { kind: s.kind, ref: s.ref, x: r2(s.x * k), y: r2(s.y * k), w: r2(s.w * k), h: r2(s.h * k) };
      if (s.kind === 'pic') out.scale = r4(clamp(s.w * k / s._nat.w, 0.05, 4));
      else if (s.kind === 'sticker') out.scale = r4(clamp(s.scale * k, 0.05, 4));
      else out.scale = 1;
      out.rot = r4(s.rot || 0);
      out.z = i;
      if (s.text != null) out.text = s.text;
      if (s.image != null) out.image = s.image;
      if (s.width != null) out.width = r2(s.width * k);
      if (s.size != null) out.size = r2(s.size * k);
      if (s._spine) spine.push({ x: out.x, y: out.y, w: out.w, h: out.h });
      return out;
    });

    const open = openOf(slots, k);
    return { recipe: spec.id, open: open, openNarrow: narrowOf(spine.length ? spine : slots, open, k), slots: slots };
  }

  window.Recipes = Object.freeze({
    RECIPES: RECIPES, IDS: IDS, PARTS: PARTS, MOTIF_PARTS: MOTIF_PARTS, MOOD_TAGS: MOOD_TAGS,
    NOTE: NOTE, CHIP: CHIP, LINKS: LINKS, SK: SK, REF: REF, OPEN: OPEN, MARGIN: MARGIN,
    NOTE_REFS: NOTE_REFS, SIGN_REF: SIGN_REF, SK_BOX: SK_BOX, SPILL: { r: SPILL_R, b: SPILL_B },
    choose: choose, resolve: resolve, rankStickers: rankStickers
  });
})();
