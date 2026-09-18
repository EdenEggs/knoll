/* ─── THE KITS ─────────────────────────────────────────────────────────────
   FOUR of the sheets in ./features are KITS and not machines: forest
   (twenty-three parts), village (twenty-three), gnome (ten) and stickers
   (forty). A kit part is an <svg> and a few CSS animations and nothing else
   — no inputs, no timers, no canvas, no script beyond the line that picks
   the part out of the sheet. Until now every one of them stood on the bench
   as a DOCUMENT: an iframe, a React root, support.js booted, its own layer
   tree, its own paint. Measured on 2026-09-04 (perf/results/baseline), a
   warm document costs the main thread roughly half a millisecond EVERY
   FRAME whether or not anything in it moves, and at 20% the whole bench is
   warm: 134 documents, 15 frames a second, standing still. 122 of the 134
   were kit parts.

   So a kit part is not a document any more. It is still a <section class="gz">
   — the same box lab.js drags, picks, piles, copies and deletes, the same box
   keep.js writes down, the same data-src that says which drawing it is — but
   what is INSIDE the box is one of two things, and this file decides which:

     A SPRITE. Far away, small on screen, or simply not being touched, the
     part is painted onto a shared canvas TILE that lies under every section
     (#kit-layer, z 9 — over the wall's ink, under the pile). The tiles are
     rasterised once per landed zoom, positioned in world units so a pan is
     the same native scroll the rest of the sheet rides, and nothing on them
     ever animates: at the zooms where a part is a sprite its 1.2° sway is a
     pixel or two, and the eye does not miss it. A tile costs the main thread
     nothing per frame. That is the whole point.

     LIVE. Near, big, or in the hand — dragged, re-cut, picked, outlined
     under ctrl, on the menu — the part is LIFTED into live inline SVG
     inside its own .gz-art, in this document: the drawing itself, its sway
     or bob on the compositor exactly as it ran inside the frame, its inner
     animations, its shadow, its jiggle when carried. frames.js already knows
     how to size a .gz-art into a box (the sign is drawn that way); a lifted
     part is the sign with a different picture. What goes live is decided on
     'lab:still' and when a zoom lands — never mid-pan, the same rule the
     tiers in frames.js keep — except that a press lifts at once, because a
     thing in the hand has to be drawn where the hand is.

     A LIVE PART COMES IN THREE GRADES, and this was measured, not guessed
     (perf/probe-anim.js, 2026-09-04). An animation on a <g> INSIDE an svg
     — a falling leaf, a gnome's arm, a mushroom's bob — runs on the main
     thread, and its mere presence makes Chrome work out the page's layers
     again every frame, on screen or off, and PAUSED IS NOT ENOUGH: only an
     animation that is not there costs nothing. A sway or bob on the root
     <svg> is the compositor's and free — until a few dozen of them stand
     together, each behind its own drop-shadow, and the compositor is
     drawing that many filtered surfaces a frame. So:

       still  no animation at all — for a part that is live only because
              it must be (over a machine, or in the hand off screen) or is
              too small to be seen moving;
       sway   the root's own sway or bob, nothing inside — the nearest
              twenty parts big enough to be seen moving (SWAY_MAX);
       full   everything the sheet drew — the nearest four on screen and
              big enough for a leaf to matter (FULL_MAX, FULL_PX).

     bare.css's crowd rule paused the inner animations inside a frame; the
     same drawings out here have them TAKEN OUT instead, which is what the
     probe said the crowd rule should have done all along.

   Above ZOOM_NO_TILES there are no tiles at all. At 400% a sprite would be
   megabytes each, and a screen holds a handful of parts, so every part within
   a screen's margin is live and the rest are off screen anyway.

   The drawings come out of the sheets themselves, at run time: the .dc.html
   is fetched once, parsed, and each <sc-if> block's <svg> is lifted whole
   with a palette filled in — the same transformation support.js does when it
   boots the document, done once here instead of once per frame. See THE
   EXTRACTOR. Nothing about forest.dc.html, village.dc.html or gnome.dc.html
   changed; opened on their own they are still themselves, and a fifth kit is
   three lines in SHEETS below.

   WHAT DID NOT CHANGE, on purpose: the section, and everything that reads
   it. lab.js sees a .gz with a box; frames.js sees an art panel with a
   natural size; ink.js asks this file what is painted under the pointer and
   gets the same true/false it used to get from elementFromPoint inside the
   frame; keep.js reports the same data-src, and serve.js writes the same
   tags. A pasted copy of a tree lands in the copies block as the same five
   lines it always did, and is converted here the next time the bench boots.

   The numbers: SWAY_PX and FULL_PX are the drawn heights, in screen px,
   under which a sway or a falling leaf is a pixel or two and not worth its
   layer or its main-thread frame; SWAY_MAX and FULL_MAX are what the probe
   found the compositor and the main thread carry without dropping a frame;
   the tile is 1024 screen px because Chrome's own raster tiles are.

   ── AND THEN THE STICKERS (Phase 4 of ../PRESS-TABLE-PLAN.md) ────────────
   The fourth sheet is unlike the other three in one way that reaches all
   the way through this file: it holds no colours. A village house is red
   because the village is; a sticker is whatever colour the page it stands
   on is. So every fill and stroke in features/stickers-core.dc.html is an
   interpolation of a ROLE — {{ skPrimary }}, {{ skInk }}, {{ skStroke }},
   {{ skText }} … — and three things now decide what a part looks like:

     THE PAGE'S PALETTE. At loadSheet time each role is read off the page as
     a custom property (--sk-primary, --sk-stroke …, CONTRACTS §6) and falls
     back to the sheet's own default, which is the Knoll look. The main bench
     writes no --sk-* at all and therefore gets Knoll; a game page's baked
     :root supplies its own. Resolved ONCE per page load — see PER-PAGE
     PALETTE for why that is right, and for the one door out of it.

     THE SECTION'S OWN. A section may carry data-palette (a JSON object of
     role → value) and data-text, and is then extracted as a VARIANT: its own
     set of strings, its own sprites, cached under one key so a hundred
     sections asking for the same variant extract once. See THE VARIANTS.

     THE STYLE VECTOR. <html data-sk-style='{"preset":"pixel",…}'> (Appendix
     B of the plan) says how the drawings are RENDERED — the line weight, the
     corner radius, the shading, the wobble, the texture, the finish, the
     pixel grid. It is applied inside the extractor, once, so that the live
     svg and the sprite are the same picture by construction. See THE STYLE
     PASS.

   None of that reaches the other three sheets: they have no roles, no
   data-layer groups and no style vector, and the pass is skipped for them.

   ── A PAGE WITH NO BENCH ─────────────────────────────────────────────────
   This file used to return null on the first line when there was no
   #bench-world. The Press Table (Phase 6) is such a page: it renders sticker
   strings into plain <div>s to show the owner what a style would look like,
   and it has no world, no #kit-layer and no Lab. So the file is in two
   halves now. THE EXTRACTOR HALF — the sheets, the palette, the style pass,
   extract/loadSheet/extractOnly/setStyle — is defined first and
   unconditionally, and touches no bench object. THE BENCH HALF — the layer,
   the tiles, the sprites, the records, relive and ink — is behind
   `if (world)`. What comes back is the whole bench API when there is a
   bench, and { extractOnly, kindOf, isKitSrc, SHEETS, setStyle } when there
   is not (CONTRACTS §7). */

window.Kits = (function () {
  const world = document.getElementById('bench-world');

  const SVG_NS = 'http://www.w3.org/2000/svg';
  const SRC_RE = /features\/(forest|village|gnome|stickers-core)\.dc\.html#(?:part|who)=([\w-]+)/;
  /* the sheet's file name is not always the kit's name: the sticker sheet is
     features/stickers-core.dc.html (the core forty; a later sheet may add
     more) and the kit it belongs to is 'stickers', which is what SHEETS,
     data-kit and every cache key spell. One row per sheet, so the two names
     can never drift apart in a regex. */
  const SRC_KIT = { forest: 'forest', village: 'village', gnome: 'gnome', 'stickers-core': 'stickers' };

  /* ── THE SHEETS ──────────────────────────────────────────────────────────
     key: the prop the sheet picks its part by (forest/village/stickers
     'part', gnome 'who' — see the sheets' own comments on why it is a hash
     and not a query). spill: the root drop-shadow's reach, right and bottom,
     which frames.js counted as ink when it measured the frame ("shadows are
     ink") and which the natural box therefore includes. The village parts
     throw their shadow with an SVG filter (#ds) that frames.js's spill()
     never parsed, so their measured box was the svg box and their spill is
     nought; what falls past the box's edge is clipped there, as it was.
     palette: the interpolations the sheet's renderVals() fills in, at the
     sheet's defaults — and, for the stickers, the roles this file looks for
     on the page. jiggle: where the sheet pivots a carried part.
     swayShare: the stickers only — see THE GRADES. */
  const SHEETS = {
    forest:  { file: 'features/forest.dc.html',  key: 'part', spill: { r: 6, b: 7 }, grassSpill: { r: 5, b: 6 },
               palette: { leafMain: '#7bc264', leafDark: '#4e8c3f', leafLite: '#a8d68a', capA: '#e8484a', sparkles: true },
               shadow: 'rgba(0,0,0,0.3)', jiggle: '50% 80%' },
    village: { file: 'features/village.dc.html', key: 'part', spill: { r: 0, b: 0 }, palette: {}, shadow: null, jiggle: '50% 80%' },
    gnome:   { file: 'features/gnome.dc.html',   key: 'who',  spill: { r: 6, b: 7 }, palette: {}, shadow: 'rgba(0,0,0,0.3)', jiggle: '50% 30%' },
    /* THE FOURTH SHEET (CONTRACTS §7). The nine defaults are the bench's own
       tokens, the same nine the sheet's renderVals() returns, so a sticker on
       a page that says nothing about colour is a Knoll sticker: --pink as the
       primary, --blue as the secondary, --ink, white paper, --pink-2 as the
       highlight and the pink darkened to #8a2558 as the shadow, a 3-unit
       stroke, 6-unit corners and no words. skStroke and skRadius are NUMBERS
       and not colours — the style pass computes them and the page may set
       them — which is why the palette is read type by type and not as a bag
       of strings. The spill is the root drop-shadow's 6,7 like the forest's;
       the jiggle is the centre, because a sticker has no root to pivot on.
       swayShare is the share of SWAY_MAX a FILTERED part may take: 1 until
       perf/probe-stickers.js (plan §8 4.6) measures the wobble and the glow
       presets and writes the per-preset object here. Both shapes are read —
       see shareOf(). */
    stickers: { file: 'features/stickers-core.dc.html', key: 'part', spill: { r: 6, b: 7 },
                palette: { skPrimary: '#c93b82', skSecondary: '#5871f5', skInk: '#26212a', skPaper: '#ffffff',
                           skHighlight: '#ef4d98', skShadow: '#8a2558', skStroke: 3, skRadius: 6, skText: '' },
                shadow: 'rgba(0,0,0,0.3)', jiggle: '50% 50%', swayShare: 1 }
  };

  /* ── THE NATURAL BOX, BEFORE THE SHEET HAS ARRIVED ───────────────────────
     lab.js reads a section's box the moment it registers it and frames.js
     cuts the box the moment it adopts it — both synchronously, at boot, long
     before a fetch could answer. So the size of every part is written down
     here: [w, h] of the box the iframe version measured at rest (svg box +
     shadow spill), recorded by perf/geometry.js on 2026-09-04 for the forest
     and read off the sheets for the other two. Once a sheet is parsed the
     same numbers are recomputed from the svg and, if they ever disagreed,
     the table is what the boxes were cut to and the svg is what is drawn
     into them — a one-pixel fit, never a shifted tree.

     THE STICKERS HAVE NO TABLE, and that is the point of them. The three
     older kits were drawn one part at a time, each at whatever size it
     wanted, and stood on the bench inside frames that measured them: their
     boxes are HISTORY, and the table is that history written down so nothing
     moved when the frames went away. The sticker sheet was drawn to a
     contract instead (CONTRACTS §8): every one of the forty parts is a
     128 × 128 svg, so its box is 128 + spill in both directions — one pair
     of numbers for the whole kit rather than forty rows that would all say
     the same thing. natural() therefore falls straight through the table to
     the sheet's own box for a sticker, and to that same pair before the
     sheet has arrived. */
  const NAT = {
    forest: { 'the-elder': [306, 353], 'the-younger': [256, 349], 'the-broad': [326, 351], 'the-ancient': [326, 363],
              'the-pine': [276, 375], 'slim-pine': [216, 357], 'the-spruce': [306, 353], 'bent-pine': [256, 349],
              'the-sapling': [256, 383], 'the-leaner': [256, 383], 'the-twins': [256, 383], 'the-sprout': [206, 307],
              'the-oak': [316, 353], 'the-acorn': [316, 353], 'the-hollow': [316, 353], 'the-gnarled': [316, 353],
              'tall-tuft': [265, 160], 'meadow-mound': [265, 160], 'wild-sprigs': [265, 160], 'plain-blades': [265, 160],
              'grand-toadstool': [265, 206], 'honey-caps': [265, 206], 'pink-bonnets': [265, 206] },
    village: { 'toadstool-house': [214, 201], 'bonnet-house': [174, 161], 'butter-cap': [130, 123], 'stump-house': [156, 128],
               'village-pine': [200, 370], 'far-pine': [112, 180], 'the-well': [124, 152], 'picket-run': [150, 88],
               'lamp-post': [54, 178], 'the-signpost': [144, 133], 'pink-hat': [82, 136], 'red-hat': [92, 140],
               'blue-hat': [80, 140], 'red-caps': [86, 74], 'mixed-caps': [100, 66], 'pink-caps': [80, 72],
               'bloom': [52, 72], 'sprig': [44, 44], 'stepping-stones': [140, 80], 'boulder': [80, 62],
               'the-sun': [130, 130], 'the-moon': [130, 130], 'firefly': [48, 48] },
    /* the gnomes are 400×545 with a 6,7 shadow, so 406×552 — except that
       frames.js measured the arm the pointer holds out (473 wide) and the
       builder's hammer (418) as ink, because they poke out of the svg box,
       and the seven standing ones came out 407×553 by its rounding. The
       numbers here are those measurements; the three gnomes not on the
       paper when they were taken (thinker, puppy-eyes, officer) are left
       out and get their size from their own raster once the sheet is in
       (see inkOf) — the thinker's ? floats a long way above his box. */
    gnome: { pointer: [473, 552], farmer: [407, 553], mechanic: [407, 553], librarian: [407, 553],
             politician: [407, 553], builder: [418, 553], legend: [407, 553] }
  };
  const SK_BOX = 128;           // the sticker sheet's box, CONTRACTS §8 — every part, both directions

  const SWAY_PX = 180;          // drawn height, screen px, under which a sway is a pixel and not worth a layer
  const FULL_PX = 300;          // …and under which a falling leaf or a waving arm is not worth the main thread
  const SWAY_MAX = 20;          // filtered, swaying layers at once — 21 measured free at 100%, 29 a frame at 35% (probe-anim)
  const FULL_MAX = 4;           // parts whose insides move — each is a main-thread frame's worth of layer work
  const TILE_PX = 1024;         // a tile is this many screen px square at the landed zoom
  const ZOOM_NO_TILES = 1.25;   // past this, no tiles: everything near is live, everything else is off screen
  const LIVE_MARGIN = 200;      // screen px round the viewport a live part may sit in (frames.js's pause line)
  const DROP_MARGIN = 400;      // …and how far out it has to go before it is dropped back to a sprite
  const HELD = ['dragging', 'sizing', 'picked', 'ink-hit', 'menued', 'ping'];   // classes that keep a part live
  const SPRITE_ROUND = 64;      // sprite scales are rounded to 1/64 so neighbouring zooms share a raster
  const PAD = 160;              // room round a drawing when it is rasterised, for whatever pokes out of its box
  const ROT_MAX = 45;           // data-rot is clamped to ±45° — past a quarter turn a sticker is a different drawing, and its box would have to grow

  const dpr = () => Math.min(3, window.devicePixelRatio || 1);
  const zoomOf = () => (window.Lab && Lab.zoom) || 1;
  const kebab = s => s.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
  const fnv = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
  const hash = s => fnv(s) / 4294967296;          // 0…1, for the sway's phase
  const hash36 = s => fnv(s).toString(36);        // six-ish characters, for a cache key

  // ── what a part is ───────────────────────────────────────────────────────
  function kindOf(src) {
    const m = SRC_RE.exec(src || '');
    return m ? { kit: SRC_KIT[m[1]] || m[1], part: m[2] } : null;
  }
  const isKitSrc = src => !!kindOf(src);

  function natural(kit, part) {
    // the table first: those are the boxes the frames measured, and a box
    // that was cut to one must keep fitting the same way. The ink from the
    // raster answers for a kind the table never met.
    const t = NAT[kit] && NAT[kit][part];
    if (t) return { w: t[0], h: t[1] };
    const P = sheets[kit] && sheets[kit].parts[part];
    if (P && P.ink) return { w: P.ink.w, h: P.ink.h };
    if (P) return { w: P.w + P.spill.r, h: P.h + P.spill.b };
    // nothing known yet — no table row and no sheet. The stickers are the
    // one kit whose box is a contract rather than a measurement (see NAT),
    // so it is right here and the box is cut correctly the first time;
    // 400 × 460 is the viewport the other three were composed at.
    const S = SHEETS[kit];
    if (S && kit === 'stickers') return { w: SK_BOX + S.spill.r, h: SK_BOX + S.spill.b };
    return { w: 400, h: 460 };
  }
  // where the drawing's box sits inside its ink: (0,0) for nearly every
  // part; negative where something pokes out to the left or above
  const inkOrigin = P => (P && P.ink ? { x: P.ink.x, y: P.ink.y } : { x: 0, y: 0 });
  const label = part => part.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  /* ── PER-PAGE PALETTE (plan §8 4.2.1–2) ──────────────────────────────────
     THE STICKERS' ROLES, AND ONLY THEIRS. Each is looked for on the page as
     a custom property before the sheet's default is used. The token's name
     is the role's name in kebab: skPrimary → --sk-primary, skStroke → --sk-stroke
     (CONTRACTS §6). The plan writes that as '--sk-' + kebab(role), which
     assumes the bare role name; the sheet's names carry the sk themselves,
     so the kebab of the whole name already begins 'sk-' and one '--' in
     front of it is the token. Anything that is not a colour — skStroke,
     skRadius — is a number, and comes back through the same path parsed as
     one; a token that is not a number at all is ignored and the default
     stands, because half a stroke width is worse than the wrong one.

     RESOLVED ONCE PER PAGE LOAD, on purpose. The extracted strings are
     cached per part and the sprites are rasterised from them, so a palette
     that could change under them would mean throwing both away; and a game
     page is ONE game with ONE skin, which is the whole shape of the thing.
     The two doors out of it are deliberate and narrow: a section may carry
     its own data-palette (THE VARIANTS), and the Press Table may hand this
     file a whole new style with Kits.setStyle(), which re-extracts the sheet
     and re-bakes its tiles and is how the owner watches a preset change.

     A page with no --sk-* at all — the main bench — gets the sheet's own
     nine defaults, which are the Knoll look.

     THE OTHER THREE SHEETS DO NOT LOOK AT THE PAGE, and the header above
     says so: a village house is red because the village is, and the
     forest's leafMain is one of the forest's own numbers rather than
     something a page gets to say — `sparkles` is not even a colour, it is
     a flag, and it would come back off a token as the string 'false',
     which is true. CONTRACTS §6 lists the --sk-* roles and no others, so a
     token named --leaf-main, written on some page for something else
     entirely, must not silently repaint every tree on the bench. The three
     older sheets are handed their own palette, copied so nobody can write
     through it, and that is why their fifty-six drawings come out of this
     file byte for byte as they did before the stickers arrived. */
  const tokenOf = role => '--' + kebab(role);
  function pagePalette(kit) {
    const S = SHEETS[kit], out = {};
    if (kit !== 'stickers') return Object.assign(out, S.palette);
    let cs = null;
    try { cs = getComputedStyle(document.documentElement); } catch (e) {}
    for (const role in S.palette) {
      const def = S.palette[role];
      const raw = cs ? (cs.getPropertyValue(tokenOf(role)) || '').trim() : '';
      if (!raw) { out[role] = def; continue; }
      if (typeof def === 'number') { const n = parseFloat(raw); out[role] = isFinite(n) ? n : def; }
      else out[role] = raw;
    }
    return out;
  }
  // --sk-halo is a token and not a role: theme.js writes '1' when the paper
  // is too close to the sticker's own colours and the die-cut edge has to be
  // turned on (CONTRACTS §2). It is read here, beside the palette.
  function haloToken() {
    try { return (getComputedStyle(document.documentElement).getPropertyValue('--sk-halo') || '').trim() === '1'; } catch (e) { return false; }
  }

  /* ── THE STYLE VECTOR (plan §8 4.3) ──────────────────────────────────────
     <html data-sk-style='{…}'> holds the vector Style.forPreset() baked into
     the page (Appendix B). Absent, or unreadable, → { preset:'flat',
     lineShow:true }, which is HOW THE SHEET WAS DRAWN: a 3-unit ink line, a
     hard offset shadow, 6-unit corners, the detail rim on, no texture and no
     filter. Every step of the pass below therefore asks whether its field is
     THERE before it does anything, so the default vector is a pass that does
     nothing at all — which is what the main bench wants. */
  const STYLE0 = { preset: 'flat', lineShow: true };
  function readStyle() {
    let raw = '';
    try { raw = document.documentElement.dataset.skStyle || ''; } catch (e) {}
    if (!raw) return Object.assign({}, STYLE0);
    try {
      const v = JSON.parse(raw);
      if (v && typeof v === 'object') return v;
    } catch (e) { console.warn('[kits] data-sk-style is not JSON — the sheet keeps the flat look it was drawn in:', e && e.message); }
    return Object.assign({}, STYLE0);
  }
  let STYLE = readStyle();
  // the vector as the pass actually sees it: the page's halo token folded in,
  // since 'show the halo' has two sources (finish diecut, --sk-halo 1) and
  // one answer
  const resolved = v => Object.assign({}, v, { halo: v.finish === 'diecut' || haloToken() });
  /* the share of SWAY_MAX a filtered part may take. One number today; the
     probe (plan §8 4.6) writes an object keyed by preset into SHEETS, and
     both shapes read the same way here so that filling it in is one edit in
     one place. */
  function shareOf(style) {
    const s = SHEETS.stickers.swayShare;
    const v = (s && typeof s === 'object') ? s[(style || STYLE).preset] : s;
    return typeof v === 'number' && v >= 0 && v <= 1 ? v : 1;
  }

  // ── THE EXTRACTOR ────────────────────────────────────────────────────────
  /* What support.js does to a sheet when it boots the document, done once
     here, without the document: the template is parsed, the one <sc-if>
     whose flag the part answers to is opened, its <svg> lifted, the sheet's
     encoded attributes decoded (viewBox was written sc-camel-view-box so
     the HTML parser would not lowercase it; stdDeviation likewise), the
     {{ interpolations }} filled from the palette, nested <sc-if>s resolved
     the same way (sparkles is on; hint-placeholder-val is a streaming
     placeholder and is ignored, as the runtime ignores it once renderVals
     has answered). Verified against the runtime's own DOM for all 23 forest
     parts (reports/forest-svg.md): identical, attribute for attribute.

     THE INTERPOLATIONS ARE FILLED IN TEXT CONTENT TOO, which they were not
     before this phase, because until the sticker sheet no part had a word in
     it. support.js renders a {{ }} in text content as its own <span> and the
     runtime fills that; this file copies a <text>'s textContent straight
     across, so a text part left as it was would have shown the literal
     '{{ skText }}' on the bench. Same regex, same palette, one call.

     Two strings come out per part. LIVE is the svg as the sheet drew it,
     sway and shadow and all, for .gz-art. RASTER has the root's filter,
     animation and transform-origin and every inner animation stripped: a
     standalone svg has no @keyframes, so an animation left in would resolve
     to nothing anyway, but the raster is drawn at rest ON PURPOSE and the
     shadow is baked by the painter, which can put it exactly where the
     frame's filter did.

     The village parts share a <defs> (#pine, #ds) that lives in a 0×0 svg
     at the head of that sheet; each part gets its own copy, first child.
     Two identical #ds in one document resolve to the first, and they are
     the same filter, so a bench with thirty live boulders is fine. The
     sticker sheet's data-defs is the style pass's toolbox (#sk-soft,
     #sk-wobble, #sk-hatch …) and NO part references it by hand, so only the
     handful of ids the style actually reaches for are copied in, and they
     are renamed with a suffix taken from the style — see THE STYLE PASS. */
  const sheets = {};                     // kit → { parts, variants, keyframes, tags, html, palette, style }
  const loading = {};
  let onSheet = null;                    // the bench half's hook: keyframes, ink, tiles. Null on a page with no bench.

  const fill = (v, pal) => v.replace(/\{\{\s*([\w]+)\s*\}\}/g, (m, k) => (k in pal ? String(pal[k]) : ''));

  function decodeAttrs(src, dst, pal) {
    for (const a of src.attributes) {
      let name = a.name, val = a.value;
      if (name.indexOf('sc-camel-') === 0) name = name.slice(9).replace(/-([a-z])/g, (m, c) => c.toUpperCase());
      else if (name === 'hint-placeholder-val') continue;
      if (val.indexOf('{{') >= 0) val = fill(val, pal);
      dst.setAttribute(name, val);
    }
  }
  function truthy(expr, pal) {
    const m = /\{\{\s*(\w+)\s*\}\}/.exec(expr || '');
    if (!m) return !!expr;
    const k = m[1];
    if (k === 'true') return true;
    if (k === 'false') return false;
    return !!pal[k];
  }
  function conv(node, pal, out) {
    // out: the element children go into
    for (const c of node.childNodes) {
      if (c.nodeType !== 1) continue;
      const tag = c.localName;
      if (tag === 'sc-if') { if (truthy(c.getAttribute('value'), pal)) conv(c, pal, out); continue; }
      if (tag === 'sc-else' || tag === 'sc-for') continue;
      const el = document.createElementNS(SVG_NS, tag);
      decodeAttrs(c, el, pal);
      // a <text> or a <tspan> is copied flat, as it always was — and its
      // words go through the palette, which is where {{ skText }} lives
      if (tag === 'text' || tag === 'tspan') el.textContent = fill(c.textContent, pal);
      else conv(c, pal, el);
      out.appendChild(el);
    }
  }

  /* ── THE STYLE PASS (plan §8 4.4) ────────────────────────────────────────
     One row of the plan's table per step, in the order the table has them.
     Two of the rows are not DOM edits at all — skStroke and skRadius are
     interpolation values, so they are folded into the palette BEFORE conv()
     runs and arrive as part of the drawing; everything else is an edit on
     the part's own <svg> AFTER conv() and before the four strings are
     serialised, which is what makes the live part and the sprite the same
     picture rather than two pictures that agree by luck.

     PALETTE SIZE IS NOT HERE, and must not be. theme.js quantises every role
     to the OKLCH ramp before the tokens are ever written to the page
     (CONTRACTS §2, plan's table: "done in theme.js before the palette
     reaches kits.js, so live and raster agree"). By the time a colour
     reaches this file it is already on the ramp; re-quantising it here would
     be a second, differently-rounded answer to the same question.

     THE DEFS ARE COPIED PER PART AND RENAMED PER STYLE. A filter's numbers
     are fixed where they are declared — #sk-wobble's feDisplacementMap says
     scale="4" — and the wobble the page wants is lineWobble × 4, so the
     scale has to be written into a copy. Each part already gets its own copy
     of the sheet's defs (the village's #pine is copied the same way), so the
     copy is where the number goes; and every id in it is suffixed with a
     hash of the style vector so that two parts extracted at two DIFFERENT
     styles in one document — which is exactly what the Press Table's preview
     row is — cannot share the first one's filter. Within one page every part
     carries the same style and therefore the same suffix, and forty
     identical #sk-wobble-1a2b3c resolve to the first, which is the situation
     the village's thirty identical #ds have always been in. */
  const DEFS_FOR = {          // style field → the ids that field reaches for
    soft: 'sk-soft', painterly: 'sk-soft',
    hatch: 'sk-hatch', halftone: 'sk-dots', dither: 'sk-dither',
    paper: 'sk-paper', canvas: 'sk-paper', noise: 'sk-noise', scanlines: 'sk-scanlines', grunge: 'sk-grunge'
  };
  function neededDefs(style) {
    const want = new Set();
    if (style.shading && DEFS_FOR[style.shading]) want.add(DEFS_FOR[style.shading]);
    if (style.texture && DEFS_FOR[style.texture]) want.add(DEFS_FOR[style.texture]);
    // the wobble only counts when there is a line for it to wobble — the
    // same reading the `filtered` flag makes further down. Appendix C's
    // painterly is the row that asks: wobble 0.3 with the line turned off,
    // so step 5 never reaches for the filter and copying it in would leave
    // a turbulence map in all forty strings that nothing points at.
    if (style.lineWobble > 0 && style.lineShow !== false) {
      want.add('sk-wobble');
      if (style.linePasses > 1) want.add('sk-wobble-2');
    }
    return want;
  }
  // the palette the drawing is actually filled with: the page's, with the two
  // numbers the style vector owns written over it
  function foldStyle(pal, style) {
    const out = Object.assign({}, pal);
    // lineWeight → {{ skStroke }}: 0.5 + 5.5 × w, so 0 is a hairline the
    // sheet can still draw and 1 is the 6-unit line the contract caps at
    if (typeof style.lineWeight === 'number') out.skStroke = Math.round((0.5 + 5.5 * style.lineWeight) * 100) / 100;
    // corners → {{ skRadius }}: corners × 18, so 1 rounds a 36-unit box to a
    // stadium and 0 is a square corner
    if (typeof style.corners === 'number') out.skRadius = Math.round(style.corners * 18 * 100) / 100;
    return out;
  }

  function restyle(svg, style, part, suf) {
    const L = name => svg.querySelector(':scope > g[data-layer="' + name + '"]');
    const D = id => 'url(#' + id + suf + ')';
    const rootStyle = () => svg.getAttribute('style') || '';
    const setRoot = v => { if (v.trim()) svg.setAttribute('style', v); else svg.removeAttribute('style'); };

    // 1 · lineShow:false — the outline layer goes, and with it every stroke
    //     the drawing had; the body silhouette is the whole picture
    const line = L('line');
    if (style.lineShow === false && line) line.remove();
    const hasLine = style.lineShow !== false && !!line;

    // 2 · corners — the radius itself went in before conv(); what is left is
    //     the joint: a square-cornered style wants mitre, a round one wants
    //     round, and 0.3 is where the plan puts the change
    if (typeof style.corners === 'number' && hasLine) line.setAttribute('stroke-linejoin', style.corners < 0.3 ? 'miter' : 'round');

    // 3 · detail, derived low — a thin line or a pixel grid cannot hold the
    //     fine rim, the dashes and the second pass, so they come off
    const lowDetail = (typeof style.lineWeight === 'number' && style.lineWeight < 0.35) || (style.pixel > 0);
    if (lowDetail) { const d = L('detail'); if (d) d.remove(); }

    // 4 · shading — the shadow layer is the offset silhouette the sheet drew
    //     as a hard cel shade, and every shading but 'cel' does something to
    //     it. flat: it goes entirely (the root drop-shadow stays, so the
    //     sticker still lifts off the paper). soft and painterly: a 2-unit
    //     blur, the defs' #sk-soft — the two differ in the LINE, which
    //     painterly turns off in the vector, not in the shade, because the
    //     sheet's defs hold one blur. hatch / halftone / dither: the layer's
    //     own fill is swapped for the matching pattern, which is drawn in
    //     {{ skShadow }} over nothing, so the shade becomes a print.
    const shadow = L('shadow');
    if (shadow && style.shading) {
      if (style.shading === 'flat') shadow.remove();
      else if (style.shading === 'soft' || style.shading === 'painterly') shadow.setAttribute('filter', D('sk-soft'));
      else if (style.shading === 'hatch' || style.shading === 'halftone' || style.shading === 'dither') {
        const p = D(DEFS_FOR[style.shading]);
        shadow.querySelectorAll('*').forEach(n => { if (n.getAttribute('fill') && n.getAttribute('fill') !== 'none') n.setAttribute('fill', p); });
        shadow.setAttribute('fill', p);
      }
    }

    // 5 · lineWobble — the hand's tremor. #sk-wobble displaces by
    //     feDisplacementMap scale, declared 4 in the defs (the wobble at 1.0:
    //     a line that leaves its path by a stroke's width and no more), so
    //     the copy in THIS part's defs is rewritten to wobble × 4.
    //     linePasses > 1 draws the line a second time through #sk-wobble-2 —
    //     the same noise at another seed — at 55 % opacity, which is the
    //     sketcher going over a line twice.
    if (style.lineWobble > 0 && hasLine) {
      setScale(svg, 'sk-wobble' + suf, style.lineWobble * 4);
      line.setAttribute('filter', D('sk-wobble'));
      if (style.linePasses > 1) {
        setScale(svg, 'sk-wobble-2' + suf, style.lineWobble * 4);
        const pass = line.cloneNode(true);
        pass.setAttribute('filter', D('sk-wobble-2'));
        pass.setAttribute('opacity', '0.55');
        pass.setAttribute('data-layer', 'line-2');
        line.parentNode.insertBefore(pass, line.nextSibling);
      }
    }

    // 6 · texture — one <rect> over the whole box, filled with the pattern,
    //     at the plan's 18 %, CLIPPED TO THE BODY so the paper grain stops
    //     at the sticker's edge. A <clipPath> and not a <mask>: a mask is
    //     read by luminance, so the same body drawn in a dark colour would
    //     mask the texture away and a light one would not, which is a bug
    //     that only shows on some palettes; a clip is read by geometry and
    //     is the silhouette whatever colour it is painted.
    const body = L('body');
    if (style.texture && DEFS_FOR[style.texture] && body) {
      const w = parseFloat(svg.getAttribute('width')) || SK_BOX, h = parseFloat(svg.getAttribute('height')) || SK_BOX;
      const cp = document.createElementNS(SVG_NS, 'clipPath');
      cp.setAttribute('id', 'sk-body-' + part + suf);
      for (const n of body.children) cp.appendChild(n.cloneNode(true));
      defsOf(svg).appendChild(cp);
      const rect = document.createElementNS(SVG_NS, 'rect');
      rect.setAttribute('x', '0'); rect.setAttribute('y', '0');
      rect.setAttribute('width', String(w)); rect.setAttribute('height', String(h));
      rect.setAttribute('fill', D(DEFS_FOR[style.texture]));
      rect.setAttribute('opacity', '0.18');
      rect.setAttribute('clip-path', 'url(#sk-body-' + part + suf + ')');
      rect.setAttribute('data-layer', 'texture');
      svg.appendChild(rect);
    }

    // 7 · finish — what the sticker does at its edge. glow: the hard
    //     drop-shadow on the root is replaced by a 6-px bloom in the page's
    //     primary and the outline is re-struck in the highlight, which is a
    //     neon tube seen from the front. none: no shadow at all, the flat
    //     printed look the pixel, ink-sketch and retro-print presets want.
    //     shadow: the sheet as drawn. (diecut is the halo, step 8.)
    if (style.finish === 'glow') {
      /* WRITTEN 0px 0px AND NOT 0 0, which the plan's table spells, for one
         reason: the sprite's shadow is baked by the canvas painter from the
         drop-shadow this file parses back out of the root style a few lines
         below, and that parser wants units on the offsets (it was written
         for the sheets' 6px 7px). A bare 0 is the same declaration to CSS
         and a different one to the regex, and the sprite would come out with
         no bloom at all while the live part glowed — the exact live/sprite
         split every other line here is arranged to prevent. The nested
         parens matter too: the shadow being replaced is
         drop-shadow(6px 7px 0 rgba(0,0,0,.3)) and a [^)]* would stop inside
         the rgba(, leaving a stray bracket behind. */
      const glow = 'drop-shadow(0px 0px 6px ' + (style.__primary || '#000') + ')';
      setRoot(rootStyle().replace(/drop-shadow\((?:[^()]|\([^()]*\))*\)/i, glow));
      if (hasLine) { line.setAttribute('stroke', style.__highlight || '#fff'); line.querySelectorAll('[stroke]').forEach(n => { if (n.getAttribute('stroke') !== 'none') n.setAttribute('stroke', style.__highlight || '#fff'); }); }
    } else if (style.finish === 'none') {
      setRoot(rootStyle().replace(/(?:^|;)\s*filter\s*:[^;]*/i, '').replace(/^\s*;\s*/, ''));
    }

    // 8 · the halo — the die-cut white edge, drawn hidden on every part and
    //     shown by the diecut finish or by the page's own --sk-halo:1, which
    //     theme.js writes when the sticker's colours are too close to the
    //     paper for the sticker to have an edge of its own
    if (style.halo) {
      const halo = L('halo');
      if (halo) {
        const v = (halo.getAttribute('style') || '').replace(/(?:^|;)\s*display\s*:[^;]*/i, '').replace(/^\s*;\s*/, '');
        if (v.trim()) halo.setAttribute('style', v); else halo.removeAttribute('style');
      }
    }
  }
  // the part's own <defs>, made if the style pass needs one and the defs
  // copy did not bring one (a clip has to live somewhere)
  function defsOf(svg) {
    let d = svg.querySelector(':scope > defs');
    if (!d) { d = document.createElementNS(SVG_NS, 'defs'); svg.insertBefore(d, svg.firstChild); }
    return d;
  }
  // the displacement scale of one wobble filter, written into this part's own copy
  function setScale(svg, id, scale) {
    const f = svg.querySelector('filter[id="' + id + '"]');
    if (!f) return;
    const m = f.querySelector('feDisplacementMap');
    if (m) m.setAttribute('scale', String(Math.round(scale * 100) / 100));
  }

  /* ── extract ─────────────────────────────────────────────────────────────
     kit, the sheet's text, the palette to fill it with, the style vector to
     render it in, and optionally ONE part's name — which is how a variant is
     built without walking the other thirty-nine. */
  function extract(kit, html, pal, style, only) {
    const S = SHEETS[kit];
    const styled = kit === 'stickers';           // the roles, the layers and the pass are this sheet's alone
    const st = styled ? resolved(style || STYLE) : null;
    if (styled) { st.__primary = pal.skPrimary; st.__highlight = pal.skHighlight; }
    const palette = styled ? foldStyle(pal, st) : pal;
    const suf = styled ? '-' + hash36(JSON.stringify([st.preset, st.lineShow, st.lineWeight, st.lineWobble, st.linePasses, st.corners, st.shading, st.texture, st.pixel, st.finish, st.halo])) : '';
    const want = styled ? neededDefs(st) : null;

    const doc = new DOMParser().parseFromString(html, 'text/html');
    const parts = {};
    // the option list is the sheet's own spelling of every part name
    const props = doc.querySelector('script[data-dc-script]');
    let names = [], tags = {};
    try {
      const p = JSON.parse(props.getAttribute('data-props'))[S.key];
      names = p.options || [];
      tags = p.tags || {};
    } catch (e) {}
    const byFlag = {};
    names.forEach(n => { byFlag['is' + n.replace(/(^|-)(\w)/g, (m, s, c) => c.toUpperCase())] = n; });

    const defs = doc.querySelector('svg[data-defs]');
    const kf = [];
    doc.querySelectorAll('style').forEach(s => {
      const re = /@keyframes\s+[\w-]+\s*\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}/g; let m;
      while ((m = re.exec(s.textContent))) kf.push(m[0]);
    });

    doc.querySelectorAll('sc-if').forEach(block => {
      const m = /\{\{\s*(is\w+)\s*\}\}/.exec(block.getAttribute('value') || '');
      if (!m) return;
      const part = byFlag[m[1]] || kebab(m[1].slice(2));
      if (only && part !== only) return;
      const src = block.querySelector(':scope > svg'); if (!src) return;
      const svg = document.createElementNS(SVG_NS, 'svg');
      decodeAttrs(src, svg, palette);
      if (!svg.getAttribute('xmlns')) svg.setAttribute('xmlns', SVG_NS);
      if (defs) {
        const d = document.createElementNS(SVG_NS, 'defs');
        conv(defs.querySelector('defs') || defs, palette, d);
        if (styled) {
          // only what the style asked for, renamed so two styles in one
          // document cannot collide
          [...d.children].forEach(n => {
            const id = n.getAttribute('id');
            if (!id || !want.has(id)) { n.remove(); return; }
            n.setAttribute('id', id + suf);
          });
        }
        if (d.children.length) svg.appendChild(d);
      }
      conv(src, palette, svg);
      if (styled) restyle(svg, st, part, suf);
      const w = parseFloat(svg.getAttribute('width')) || 0, h = parseFloat(svg.getAttribute('height')) || 0;
      const rootStyle = svg.getAttribute('style') || '';
      const sway = /animation:\s*([\w-]+)\s+([\d.]+)s[^;]*?(?:infinite\s+([\d.]+)s)?/.exec(rootStyle);
      const ser = n => new XMLSerializer().serializeToString(n);
      const stripStyle = (n, props) => {
        const re = new RegExp('(?:^|;)\\s*(' + props.join('|') + ')\\s*:[^;]*', 'g');
        const v = (n.getAttribute('style') || '').replace(re, '').replace(/^\s*;\s*/, '');
        if (v.trim()) n.setAttribute('style', v); else n.removeAttribute('style');
      };
      const full = ser(svg);                                   // everything the sheet drew
      const swayEl = svg.cloneNode(true);                      // the root's own motion, nothing inside
      swayEl.querySelectorAll('[style]').forEach(n => stripStyle(n, ['animation']));
      const swayStr = ser(swayEl);
      const stillEl = swayEl.cloneNode(true);                  // and at rest
      stripStyle(stillEl, ['animation']);
      const stillStr = ser(stillEl);
      // the raster: at rest, no filter (the painter bakes the shadow), and
      // inside a wider viewport so an arm or a hat that pokes out of the
      // box is painted rather than clipped — an svg image clips at its edge
      const rasterEl = stillEl.cloneNode(true);
      stripStyle(rasterEl, ['filter', 'transform-origin']);
      rasterEl.setAttribute('overflow', 'visible');
      rasterEl.setAttribute('x', PAD); rasterEl.setAttribute('y', PAD);
      const wrap = document.createElementNS(SVG_NS, 'svg');
      wrap.setAttribute('xmlns', SVG_NS);
      wrap.setAttribute('width', w + 2 * PAD); wrap.setAttribute('height', h + 2 * PAD);
      wrap.appendChild(rasterEl);
      const raster = ser(wrap);
      const grass = kit === 'forest' && /(tuft|mound|sprigs|blades|toadstool|caps|bonnets)$/.test(part);
      const spill = grass ? S.grassSpill : S.spill;
      // the shadow the filter threw, if there was one, in svg px — READ AFTER
      // THE PASS, because the glow finish replaces it and the sprite has to
      // bake the shadow the live part is actually wearing
      const sh = /drop-shadow\(\s*(-?[\d.]+)px\s+(-?[\d.]+)px\s+([\d.]+)px\s+(rgba?\([^)]*\)|#[0-9a-f]+)/i.exec(rootStyle);
      const hasText = !!svg.querySelector('text');
      parts[part] = {
        w, h, full, sway: swayStr, still: stillStr, raster, spill, ink: null,
        shadow: sh ? { x: +sh[1], y: +sh[2], blur: +sh[3], color: sh[4] } : null,
        motion: sway ? { name: sway[1], dur: +sway[2], delay: +(sway[3] || 0) } : null,
        text: hasText,
        tags: tags[part] || [],
        /* THE GRADES, decided here rather than in relive() because they are
           facts about the drawing (plan §8 4.5). filtered: the part carries
           an SVG filter or a bloom — a wobbled line, a blurred shade, a glow
           — and a filtered surface is the compositor's most expensive kind,
           so it is never 'full' and only sways within a share of the budget.
           pixel: the style asked for a grid, so the part is a bitmap and
           never moves at all. */
        /* the wobble only counts when there is a line for it to wobble: a
           style with lineShow false had its line layer removed a moment ago
           and the filter with it, so the part is not filtered by a number
           that reached nothing. */
        filtered: styled && ((st.lineWobble > 0 && st.lineShow !== false) || st.shading === 'soft' || st.shading === 'painterly' || st.finish === 'glow'),
        pixel: styled && st.pixel > 0 ? Math.round(st.pixel) : 0
      };
    });
    return { parts, variants: {}, keyframes: kf, tags, html: null, palette: pal, style: styled ? st : null };
  }

  function loadSheet(kit) {
    if (sheets[kit]) return Promise.resolve(sheets[kit]);
    if (loading[kit]) return loading[kit];
    const S = SHEETS[kit];
    loading[kit] = fetch(S.file, { cache: 'no-cache' }).then(r => {
      if (!r.ok) throw new Error(S.file + ' ' + r.status);
      return r.text();
    }).then(html => {
      const pal = pagePalette(kit);
      const sh = extract(kit, html, pal, STYLE);
      // the sticker sheet's text is KEPT — 220 kB — because it is the only
      // one a section may re-skin (THE VARIANTS) or the Press Table may
      // re-render at another style, and both of those are a re-extract of
      // one part or of forty, not a second fetch per variant
      if (kit === 'stickers') sh.html = html;
      sheets[kit] = sh;
      if (onSheet) onSheet(kit, sh);
      return sh;
    }).catch(e => {
      console.warn('[kits] could not read ' + S.file + ' — its parts stay bare:', e && e.message);
      sheets[kit] = { parts: {}, variants: {}, keyframes: [], tags: {}, html: null, palette: {}, style: null };
      return sheets[kit];
    });
    return loading[kit];
  }

  /* ── THE VARIANTS (plan §8 4.2.3) ────────────────────────────────────────
     A section may carry its own colours (data-palette, a JSON object of role
     → value) and its own words (data-text). Such a section is not the page's
     sticker any more, so it gets its OWN extraction — its own four strings,
     its own sprites — cached under

         kit + '/' + part + '@' + hash(the palette JSON + '|' + the text)

     which is CONTRACTS §7's key. The hash is of the attribute text exactly
     as it stands on the tag, so a hundred sections carrying the same
     data-palette share one extraction and one set of bitmaps: a wall of
     frozen-at-pull-time stickers costs one extraction per DISTINCT skin.

     THE SPRITE CACHE KEY IS THE VARIANT KEY, not the part's name. That is
     the bug this is written to avoid: two stickers of the same part in two
     different colours would otherwise ask for kit/part@scale, get the first
     one's bitmap, and be drawn in each other's colours the moment they were
     far enough away to be sprites — a bug invisible while you are zoomed in
     on them.

     What a variant does NOT get is its own ink and its own mask. Colour does
     not move an edge, and the extraction that made the variant used the same
     style and the same geometry, so the silhouette is the base part's to the
     pixel; ink and mask are read through a getter onto the base record. The
     one thing that does change the alpha is a word in a text slot, and a
     text slot's words are inside the sticker: ctrl picks a banner up by the
     banner, not by the lettering. */
  function variantKey(kit, part, pj, tx) { return kit + '/' + part + '@' + hash36(pj + '|' + tx); }
  let warnedPalette = false;
  function variantOf(kit, part, pj, tx) {
    const sh = sheets[kit];
    if (!sh || !sh.html) return null;                      // only the sticker sheet keeps its text
    const key = variantKey(kit, part, pj, tx);
    if (sh.variants[key]) return { key: key, part: sh.variants[key] };
    let over = {};
    if (pj) {
      try { const o = JSON.parse(pj); if (o && typeof o === 'object') over = o; }
      catch (e) { if (!warnedPalette) { warnedPalette = true; console.warn('[kits] data-palette is not JSON — that section keeps the page palette:', e && e.message); } }
    }
    const pal = Object.assign({}, sh.palette, over);
    if (tx) pal.skText = tx;
    const one = extract(kit, sh.html, pal, sh.style || STYLE, part);
    const V = one.parts[part];
    if (!V) return null;
    const base = sh.parts[part];
    if (base) Object.defineProperty(V, 'ink', { configurable: true, enumerable: true, get: () => base.ink });
    V.base = base || null;
    sh.variants[key] = V;
    return { key: key, part: V };
  }

  /* ── Kits.extractOnly (plan §8 4.3, CONTRACTS §7) ────────────────────────
     The extractor and the style pass with no bench behind them: a sheet
     file, a palette and a style vector, and back come the still strings, one
     per part, with the box they were drawn at, the sheet's own tags and
     whether the part holds words. It touches no bench object, which is why
     it is up here with the extractor and not down with the tiles: the Press
     Table (Phase 6) is a page with no #bench-world and this is the only door
     it knocks on.

     THE PALETTE IS PARTIAL AND IS RESOLVED IN THE SAME THREE LAYERS a sheet
     load resolves in — the sheet's own defaults, then the page's --sk-*
     tokens, then what the caller passed — so a preview that is changing one
     role passes one role and the other eight stay whatever the page it is
     drawn on says they are. One order of resolution in the file, not two.

     `text` is a BOOLEAN and not the words: it says the part has a text slot
     (and so can never be a sprite, ADDING.md §1.2), which is what a tray
     ranking parts needs to know; the words themselves are the caller's own
     skText and it already has them. */
  function kitOfFile(file) {
    const base = String(file || '').split('/').pop().replace(/\.dc\.html.*$/, '');
    return SRC_KIT[base] || null;
  }
  function extractOnly(sheetFile, palette, style) {
    const kit = kitOfFile(sheetFile) || 'stickers';
    const pal = Object.assign(pagePalette(kit), palette || {});
    const st = style || STYLE;
    return fetch(sheetFile, { cache: 'no-cache' }).then(r => {
      if (!r.ok) throw new Error(sheetFile + ' ' + r.status);
      return r.text();
    }).then(html => {
      const sh = extract(kit, html, pal, st);
      const out = {};
      Object.keys(sh.parts).forEach(p => {
        const P = sh.parts[p];
        out[p] = { still: P.still, w: P.w, h: P.h, tags: P.tags, text: P.text };
      });
      return out;
    });
  }

  /* ── Kits.setStyle (plan §8 4.3) ─────────────────────────────────────────
     The Press Table's live preview: a new style vector, the sticker sheet
     re-extracted from the text it kept at load, its tiles re-baked and its
     live parts re-lifted, and NOTHING ELSE — the forest, the village and the
     gnomes are not restyled because they have no style to change. The
     palette is re-read at the same time, so a Press Table that writes a new
     :root and then calls setStyle gets both in one pass. Returns a promise
     that settles when the new bitmaps are in, so a caller can screenshot. */
  let afterRestyle = null;                 // the bench half's hook; null with no bench
  function setStyle(vector) {
    STYLE = vector && typeof vector === 'object' ? vector : Object.assign({}, STYLE0);
    const sh = sheets.stickers;
    if (!sh || !sh.html) return Promise.resolve(null);      // not loaded yet: loadSheet will use the new vector
    const next = extract('stickers', sh.html, pagePalette('stickers'), STYLE);
    next.html = sh.html;
    sheets.stickers = next;
    return afterRestyle ? afterRestyle('stickers') : Promise.resolve(next);
  }

  /* ════════════════════════════════════════════════════════════════════════
     THE BENCH HALF. Everything below needs #bench-world, Lab and Frames.
     ════════════════════════════════════════════════════════════════════════ */
  if (!world) return { extractOnly, kindOf, isKitSrc, SHEETS, setStyle };

  const wants = el => !!(el && el.dataset && (el.dataset.kit || kindOf(el.dataset.src)));

  /* ── THE SHAPE OF A KIT SECTION ──────────────────────────────────────────
     The five lines index.html gives every feature, minus the three that only
     mean something over a document: no iframe (there is no document), no
     poster (nothing to wait for — and an un-booted poster is a full-box
     element that takes the pointer and says "waking up" for ever), no shield
     (a shield keeps the wheel out of a document; a press on bare paper inside
     the box already lands on the section). What stays is .gz-art — the
     wrapper frames.js sizes and scales, empty until the part is lifted —
     the readout and the corner. lab.js drags the section by itself, exactly
     as it drags the sign. */
  function shape(el, kit, part) {
    el.dataset.kit = kit;
    el.dataset.part = part;
    ['iframe', '.gz-poster', '.gz-shield'].forEach(sel => { const n = el.querySelector(sel); if (n) n.remove(); });
    if (!el.querySelector('.gz-art')) {
      const art = document.createElement('div');
      art.className = 'gz-art';
      el.insertBefore(art, el.firstChild);
    }
    if (!el.querySelector('.gz-dim')) {
      const d = document.createElement('span'); d.className = 'gz-dim'; d.setAttribute('aria-hidden', 'true'); el.appendChild(d);
    }
    if (!el.querySelector('.gz-size')) {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'gz-size'; b.setAttribute('data-nodrag', '');
      b.setAttribute('aria-label', 're-cut it — double-click to fit it to its drawing'); el.appendChild(b);
    }
    const n = natural(kit, part);
    el.dataset.w = n.w; el.dataset.h = n.h;
    if (!el.dataset.cut) { el.style.width = n.w + 'px'; el.style.height = n.h + 'px'; }
    if (!el.getAttribute('aria-label')) el.setAttribute('aria-label', label(part));
    return el;
  }

  /* A copy, built for lab.js's paste (and for last session's copies at boot)
     from the entry the clipboard keeps: the same section a hand-written one
     is, with 'gz-copy' on it so the delete tool can tell. */
  function make(e) {
    const k = kindOf(e.src); if (!k) return null;
    const el = document.createElement('section');
    el.className = 'gz gz-copy';
    el.id = 'gz-' + e.id;
    el.dataset.gizmo = e.id;
    el.dataset.src = e.src;
    if (e.scale) el.dataset.scale = e.scale;
    el.dataset.homeX = e.x; el.dataset.homeY = e.y;
    el.setAttribute('aria-label', e.label || label(k.part));
    shape(el, k.kit, k.part);
    return el;
  }

  // every kit section the markup (and lab.js's copies) put on the paper,
  // reshaped before lab.js registers a single one of them
  function convertAll() {
    document.querySelectorAll('#bench .gz[data-src]').forEach(el => {
      const k = kindOf(el.dataset.src);
      if (k) shape(el, k.kit, k.part);
    });
  }

  // ── the layer ────────────────────────────────────────────────────────────
  const layer = document.createElement('div');
  layer.id = 'kit-layer';
  layer.setAttribute('aria-hidden', 'true');
  world.appendChild(layer);

  const kfStyle = document.createElement('style');
  kfStyle.id = 'kit-keyframes';
  document.head.appendChild(kfStyle);

  /* the sheets' keyframes, and the one rule the sheets carry that lab.css
     does not: where a carried part pivots. lab.css's jiggle rule is written
     for the three kits that existed when it was written (50% 80%, and 50%
     30% for a gnome); SHEETS[kit].jiggle is the sheet's own answer, and a
     sticker's is its centre, because a sticker has no root and no head — it
     is a flat thing that shakes about the middle. One rule, written from the
     data so the field has a reader. */
  const kitCss = document.createElement('style');
  kitCss.id = 'kit-css';
  document.head.appendChild(kitCss);
  kitCss.textContent = '.gz.dragging[data-kit="stickers"] .gz-art>svg,.gz.dragging[data-kit="stickers"] .gz-art>canvas'
                     + '{transform-origin:' + SHEETS.stickers.jiggle + '!important}';

  // ── SPRITES ──────────────────────────────────────────────────────────────
  /* A sprite is a part rasterised at one scale — device pixels per svg
     pixel — with its shadow baked in, cached by key@scale, where the key is
     the variant's if the section has one and kit/part otherwise. It is drawn
     from a data: url through an <img>, which is the one way a browser
     rasterises svg onto a canvas, and the shadow goes on through the
     context's own filter, scaled with it: the frame's drop-shadow(6px 7px)
     on a tree drawn at k× is a 6k,7k shadow, and so is this one.

     Never scaled UP from a smaller raster: strokes in these drawings are two
     to seven units, and a hairline blown up is mud. A new zoom rasterises
     anew; the last three zooms' sprites are kept and older ones dropped, so
     stepping back and forth costs nothing and a long session does not hoard
     bitmaps. THE ONE EXCEPTION IS THE PIXEL PRESET, which is a blown-up
     bitmap on purpose — see THE PIXEL PATH. */
  const sprites = new Map();          // key@scale → { canvas, w, h, s, base, ready, waiting: Set<tile> }
  const masks = new Map();            // kit/part → { data: Uint8ClampedArray alpha, w, h, done }
  const bases = [];                   // the last few base scales (zoom × dpr), newest last

  function svgImage(str) {
    return new Promise((res, rej) => {
      const img = new Image();
      img.onload = () => res(img);
      img.onerror = () => rej(new Error('svg image failed'));
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(str);
    });
  }

  const images = new Map();           // key → Promise<Image> of the padded raster
  const imageOf = (key, P) => {
    if (!images.has(key)) images.set(key, svgImage(P.raster));
    return images.get(key);
  };
  const shadowFilter = (P, s) => P.shadow
    ? 'drop-shadow(' + (P.shadow.x * s) + 'px ' + (P.shadow.y * s) + 'px ' + (P.shadow.blur * s) + 'px ' + P.shadow.color + ')' : 'none';

  /* ── THE PIXEL PATH (the last row of the plan's §4.4 table) ──────────────
     pixel = s means the page's art has a native pixel s units across, so a
     sticker beside it should have one too. The still string is rasterised at
     1/s of its box — a 128 box at s = 4 is a 32 × 32 bitmap — and every
     later drawing of it is that bitmap re-enlarged with
     imageSmoothingEnabled off, so the sticker has the page's own grid rather
     than a vector's smooth edge.

     THE SAME BITMAP DOES BOTH JOBS, which is the point: the sprite is it
     scaled up onto the tile, and the LIVE part is a <canvas> in the .gz-art
     holding it at image-rendering:pixelated rather than inline svg. If the
     live part were svg and the sprite a bitmap, a part would change its look
     as it crossed the live line, which is exactly what every other line in
     this file is arranged to prevent. A pixel part is therefore always
     'still': there is no svg root to sway, and a bitmap that swayed would
     shear its own grid.

     WHERE A CANVAS IS NOT POSSIBLE — a part with a text slot, whose words
     have to be set in the page's webfont and so must stay live svg
     (ADDING.md §1.2) — the plan's fallback stands: the live svg with
     shape-rendering:crispEdges, which is the same intention at the sheet's
     own resolution. */
  const pixmaps = new Map();          // key → { canvas, sw, sh, ready, done }
  function pixOf(key, P) {
    let pm = pixmaps.get(key);
    if (pm) return pm;
    pm = { canvas: null, sw: 0, sh: 0, ready: false, done: null };
    pixmaps.set(key, pm);
    const ink = P.ink;
    if (!ink || !P.pixel) { pm.ready = true; pm.done = Promise.resolve(pm); return pm; }
    const s = P.pixel;
    pm.done = imageOf(key, P).then(img => {
      const sw = Math.max(1, Math.round(ink.w / s)), sh = Math.max(1, Math.round(ink.h / s));
      const c = document.createElement('canvas');
      c.width = sw; c.height = sh;
      const ctx = c.getContext('2d');
      // the shadow is baked at the SMALL scale so the offset lands on the
      // grid the same way every other edge does
      try { ctx.filter = shadowFilter(P, 1 / s); } catch (e) {}
      ctx.drawImage(img, PAD + ink.x, PAD + ink.y, ink.w, ink.h, 0, 0, sw, sh);
      pm.canvas = c; pm.sw = sw; pm.sh = sh; pm.ready = true;
      return pm;
    }).catch(() => { pm.ready = true; return pm; });
    return pm;
  }

  /* THE INK is what frames.js used to measure: the drawing's box let out by
     its shadow, and anything that pokes out of the box — a pointing arm, a
     hat — because the frame measured that too. Found once per part from the
     padded raster: the alpha box of the shadowed drawing, unioned with the
     svg box plus spill. For nearly every part that is the box; where it is
     bigger, the panel is re-cut to it (see recut). The MASK is the same
     crop of the drawing WITHOUT its shadow: the answer to ctrl, which never
     picks a thing up by its shadow. */
  function inkOf(kit, part) {
    const key = kit + '/' + part;
    if (masks.has(key)) return masks.get(key);
    const P = sheets[kit] && sheets[kit].parts[part];
    if (!P) return null;
    const m = { data: null, w: 0, h: 0, ready: false, done: null };
    masks.set(key, m);
    m.done = imageOf(key, P).then(img => {
      const W = P.w + 2 * PAD, H = P.h + 2 * PAD;
      const c = document.createElement('canvas'); c.width = W; c.height = H;
      const ctx = c.getContext('2d', { willReadFrequently: true });
      ctx.filter = shadowFilter(P, 1);
      ctx.drawImage(img, 0, 0);
      const d = ctx.getImageData(0, 0, W, H).data;
      let x0 = W, y0 = H, x1 = -1, y1 = -1;
      for (let y = 0; y < H; y++) for (let x = 0, i = (y * W) * 4 + 3; x < W; x++, i += 4) {
        if (d[i] > 8) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
      }
      // the box plus spill, and whatever went past it
      const bx = Math.min(0, x0 - PAD), by = Math.min(0, y0 - PAD);
      const bw = Math.max(P.w + P.spill.r, x1 + 1 - PAD) - bx, bh = Math.max(P.h + P.spill.b, y1 + 1 - PAD) - by;
      const t = NAT[kit] && NAT[kit][part];
      // the table's numbers are frames.js's own measurements and stand
      // unless the drawing plainly goes past them
      const ink = t ? { x: bx, y: by, w: Math.max(t[0], Math.ceil(bw)), h: Math.max(t[1], Math.ceil(bh)) }
                    : { x: bx, y: by, w: Math.ceil(bw), h: Math.ceil(bh) };
      P.ink = ink;
      // the mask: no shadow, cropped to the ink
      ctx.filter = 'none'; ctx.clearRect(0, 0, W, H); ctx.drawImage(img, 0, 0);
      const md = ctx.getImageData(PAD + ink.x, PAD + ink.y, ink.w, ink.h).data;
      const a = new Uint8ClampedArray(ink.w * ink.h);
      for (let i = 0, j = 3; i < a.length; i++, j += 4) a[i] = md[j];
      m.data = a; m.w = ink.w; m.h = ink.h; m.ready = true;
      // a part on the paper whose box was cut from the table: re-cut it to
      // the ink if the two disagree (they do for the pointer's arm)
      recs.forEach(r => { if (r.kit === kit && r.part === part) recut(r); });
      return m;
    }).catch(() => { m.ready = true; return m; });
    return m;
  }
  const mask = inkOf;

  function recut(r) {
    const p = r.panel; if (!p || !window.Frames || !Frames.cut) return;
    const n = natural(r.kit, r.part);
    if (n.w === p.natW && n.h === p.natH) { if (r.live) placeLive(r); return; }
    p.natW = n.w; p.natH = n.h;
    r.el.dataset.w = n.w; r.el.dataset.h = n.h;
    const k = parseFloat(r.el.dataset.scale) > 0 ? parseFloat(r.el.dataset.scale) : 1;
    if (p.sized) Frames.cut(p, parseFloat(r.el.style.width) || r.w, parseFloat(r.el.style.height) || r.h, false);
    else Frames.cut(p, Math.round(n.w * k), Math.round(n.h * k), false);
    readGeo(r);
    if (r.live) placeLive(r);
  }

  function sprite(skey, P, s) {
    const key = skey + '@' + s;
    let sp = sprites.get(key);
    if (sp) return sp;
    if (!P || !P.ink) return null;
    const ink = P.ink;
    const W = Math.ceil(ink.w * s), H = Math.ceil(ink.h * s);
    sp = { key, canvas: null, w: W, h: H, s, ready: false, waiting: new Set() };
    sprites.set(key, sp);
    const draw = P.pixel
      ? pixOf(skey, P).done.then(pm => {
          if (!pm.canvas) return;
          const c = document.createElement('canvas');
          c.width = Math.max(1, W); c.height = Math.max(1, H);
          const ctx = c.getContext('2d');
          ctx.imageSmoothingEnabled = false;      // the grid, not a blur of it
          ctx.drawImage(pm.canvas, 0, 0, pm.sw, pm.sh, 0, 0, Math.max(1, W), Math.max(1, H));
          sp.canvas = c;
        })
      : imageOf(skey, P).then(img => {
          const c = document.createElement('canvas');
          c.width = Math.max(1, W); c.height = Math.max(1, H);
          const ctx = c.getContext('2d');
          try { ctx.filter = shadowFilter(P, s); } catch (e) {}
          // the ink's crop of the padded image, scaled: the vector is rasterised
          // at the destination size, so a sprite is never a blown-up bitmap
          ctx.drawImage(img, PAD + ink.x, PAD + ink.y, ink.w, ink.h, 0, 0, ink.w * s, ink.h * s);
          sp.canvas = c;
        });
    draw.then(() => {
      sp.ready = true;
      const t = [...sp.waiting]; sp.waiting.clear();
      t.forEach(dirtyTile);
    }).catch(() => { sp.ready = true; });   // a part that will not raster is a part that stays bare
    return sp;
  }

  function noteBase(b) {
    const i = bases.indexOf(b);
    if (i >= 0) bases.splice(i, 1);
    bases.push(b);
    while (bases.length > 3) bases.shift();
    for (const [key, sp] of sprites) if (bases.indexOf(sp.base) < 0 && sp.base != null) sprites.delete(key);
  }

  // ── THE INDEX ────────────────────────────────────────────────────────────
  /* One record per kit section on the paper, keyed by its gizmo name rather
     than by the element, because undo hands lab.js a FRESH clone of a
     section it puts back (lab.js: unhide, deleteCopy) and the name is what
     survives. Geometry is read off the section's own inline style — the
     numbers lab.js and frames.js write, in world units — and re-read
     whenever that style changes. Three more attributes are watched now:
     data-palette, data-text and data-rot, the three a sticker may carry
     (CONTRACTS §7), so that a skin changed on the tag — by the Press Table,
     or by hand in the console — takes effect without a reload. */
  const recs = new Map();             // gizmo → rec
  const byEl = new WeakMap();         // element → rec
  const CELL = 1024;                  // the grid the paper is hashed on, world units
  const grid = new Map();             // "cx,cy" → Set<rec>

  // the part a record is actually drawing: its variant if it has one, the
  // page's otherwise
  function partOf(r) {
    const sh = sheets[r.kit]; if (!sh) return null;
    if (r.vkey && sh.variants[r.vkey]) return sh.variants[r.vkey];
    return sh.parts[r.part] || null;
  }
  const spriteKey = r => r.vkey || (r.kit + '/' + r.part);

  /* the section's own skin, read off the tag. Returns true when the answer
     changed, so a caller can throw the old bitmaps away. */
  function readSkin(r) {
    const d = r.el.dataset;
    const pj = (d.palette || '').trim(), tx = d.text != null ? d.text : '';
    const rot = Math.max(-ROT_MAX, Math.min(ROT_MAX, parseFloat(d.rot) || 0));
    const wasKey = r.vkey, wasRot = r.rot;
    r.rot = rot;
    if (!pj && !tx) r.vkey = null;
    else {
      const v = variantOf(r.kit, r.part, pj, tx);
      r.vkey = v ? v.key : null;
    }
    return r.vkey !== wasKey || rot !== wasRot;
  }

  function cellsOf(r) {
    const out = [];
    const x0 = Math.floor(r.x / CELL), y0 = Math.floor(r.y / CELL);
    const x1 = Math.floor((r.x + r.w) / CELL), y1 = Math.floor((r.y + r.h) / CELL);
    for (let cy = y0; cy <= y1; cy++) for (let cx = x0; cx <= x1; cx++) out.push(cx + ',' + cy);
    return out;
  }
  function unhash(r) { r.cells.forEach(k => { const s = grid.get(k); if (s) { s.delete(r); if (!s.size) grid.delete(k); } }); r.cells = []; }
  function rehash(r) { unhash(r); r.cells = cellsOf(r); r.cells.forEach(k => { let s = grid.get(k); if (!s) grid.set(k, s = new Set()); s.add(r); }); }

  function readGeo(r) {
    const st = r.el.style;
    const x = parseFloat(st.left) || 0, y = parseFloat(st.top) || 0;
    const w = parseFloat(st.width) || r.el.offsetWidth || 0, h = parseFloat(st.height) || r.el.offsetHeight || 0;
    const z = parseInt(st.zIndex, 10) || 0;
    const n = natural(r.kit, r.part);
    const k = Math.min(w / n.w, h / n.h) || 1;
    const changed = x !== r.x || y !== r.y || w !== r.w || h !== r.h || z !== r.z || k !== r.k;
    if (changed) {
      const old = { x: r.x, y: r.y, w: r.w, h: r.h };
      r.x = x; r.y = y; r.w = w; r.h = h; r.z = z; r.k = k;
      r.natW = n.w; r.natH = n.h;
      rehash(r);
      if (!r.live) { dirtyRect(old); dirtyRect(r); }
    }
    return changed;
  }

  const watcher = new MutationObserver(rows => {
    let geo = false;
    rows.forEach(row => {
      const r = byEl.get(row.target); if (!r) return;
      if (row.attributeName === 'style') { if (readGeo(r)) geo = true; }
      else if (row.attributeName === 'class') held(r);
      // data-palette / data-text / data-rot: a new skin on the tag. The
      // grade it was drawn at is kept — a re-skin is not a reason for a
      // swaying part to stop swaying — and the record is re-lifted at it.
      else if (readSkin(r)) { if (r.live) { const g = r.grade || 'still'; r.grade = null; lift(r, true, g); } dirtyRect(r); }
    });
    if (geo) mustSoon();
  });

  function held(r) {
    const cl = r.el.classList;
    const on = HELD.some(c => cl.contains(c));
    r.held = on;
    if (on && !r.live) { lift(r, true, 'still'); relive(); }
  }

  function adopt(el, panel) {
    const k = kindOf(el.dataset.src) || (el.dataset.kit ? { kit: el.dataset.kit, part: el.dataset.part } : null);
    if (!k) return null;
    let r = recs.get(el.dataset.gizmo);
    if (r && r.el !== el) drop(r.el);   // a fresh clone under an old name: undo did this
    if (r && r.el === el) return r;
    r = { id: el.dataset.gizmo, el, kit: k.kit, part: k.part, x: 0, y: 0, w: 0, h: 0, z: 0, k: 1,
          natW: 0, natH: 0, live: false, held: false, must: false, cells: [], panel: panel || null,
          vkey: null, rot: 0 };
    const art = el.querySelector('.gz-art');
    if (art) art.textContent = '';       // a clone of a lifted part carries its svg; it is a sprite again
    recs.set(r.id, r); byEl.set(el, r);
    readGeo(r);
    // the rotation is on the tag and needs nothing else, so it is read now;
    // the variant needs the sheet's text and is read again when that lands
    readSkin(r);
    watcher.observe(el, { attributes: true, attributeFilter: ['style', 'class', 'data-palette', 'data-text', 'data-rot'] });
    held(r);
    loadSheet(r.kit).then(() => { if (recs.get(r.id) === r) { readSkin(r); dirtyRect(r); mustSoon(); } });
    return r;
  }
  function drop(el) {
    const r = byEl.get(el); if (!r) return false;
    if (r.live) unlift(r);
    unhash(r); dirtyRect(r);
    byEl.delete(el);
    if (recs.get(r.id) === r) recs.delete(r.id);
    return true;
  }

  // ── TILES ────────────────────────────────────────────────────────────────
  const tiles = new Map();            // "tx,ty" → { key, tx, ty, canvas, dirty }
  const pendingInk = new Set();       // tiles that asked for a part whose ink was not in yet
  let tileZ = 0, tileT = 0;           // the zoom the tiles were cut at, and their side in world units
  const dirty = new Set();
  let paintT = 0;

  function viewRect() {
    const b = Lab.bench.getBoundingClientRect();
    const a = Lab.toWorld(b.left, b.top), c = Lab.toWorld(b.right, b.bottom);
    return { x: a.x, y: a.y, w: c.x - a.x, h: c.y - a.y, sx: b.width, sy: b.height };
  }
  function dirtyRect(q) {
    if (!tileT) return;
    const x0 = Math.floor(q.x / tileT), y0 = Math.floor(q.y / tileT);
    const x1 = Math.floor((q.x + q.w) / tileT), y1 = Math.floor((q.y + q.h) / tileT);
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) { const t = tiles.get(tx + ',' + ty); if (t) dirtyTile(t); }
  }
  function dirtyTile(t) { t.dirty = true; dirty.add(t); schedulePaint(); }
  function schedulePaint() { if (!paintT) paintT = requestAnimationFrame(paintSome); }

  function paintSome() {
    paintT = 0;
    if (!dirty.size) return;
    if (window.Lab && Lab.moving && Lab.moving()) { paintT = requestAnimationFrame(paintSome); return; }
    let n = 0;
    for (const t of dirty) {
      if (!t.canvas.isConnected) { dirty.delete(t); continue; }
      paintTile(t); dirty.delete(t);
      if (++n >= 4) break;
    }
    if (dirty.size) schedulePaint();
  }

  function paintTile(t) {
    t.dirty = false;
    const Z = tileZ, d = dpr(), px = TILE_PX * d;
    const c = t.canvas;
    if (c.width !== px || c.height !== px) { c.width = px; c.height = px; }
    const ctx = c.getContext('2d');
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, px, px);
    const wx = t.tx * tileT, wy = t.ty * tileT;
    ctx.setTransform(Z * d, 0, 0, Z * d, -wx * Z * d, -wy * Z * d);   // draw in world units
    const rect = { x: wx, y: wy, w: tileT, h: tileT };
    const list = [];
    cellsOf(rect).forEach(k => { const s = grid.get(k); if (s) s.forEach(r => { if (list.indexOf(r) < 0) list.push(r); }); });
    list.sort((a, b) => (a.z - b.z) || (a.id < b.id ? -1 : 1));
    for (const r of list) {
      if (r.live || !r.w || !r.h) continue;
      if (r.x + r.w < wx || r.y + r.h < wy || r.x > wx + tileT || r.y > wy + tileT) continue;
      const P = partOf(r);
      if (!P) continue;
      const base = Math.round(Z * d * SPRITE_ROUND) / SPRITE_ROUND;
      const s = Math.round(base * r.k * SPRITE_ROUND) / SPRITE_ROUND;
      const sp = sprite(spriteKey(r), P, s);
      if (!sp) { pendingInk.add(t); continue; }
      sp.base = base;
      if (!sp.ready) { sp.waiting.add(t); continue; }
      if (!sp.canvas) continue;
      // the drawing's top left inside the box — the same sum frames.js's
      // place() does for .gz-art: fitted, centred, origin at the corner
      const ox = r.x + (r.w - r.natW * r.k) / 2, oy = r.y + (r.h - r.natH * r.k) / 2;
      const dw = sp.w / s * r.k, dh = sp.h / s * r.k;
      const over = dw > r.natW * r.k + 0.5 || dh > r.natH * r.k + 0.5;
      /* A ROTATED PART (data-rot) is drawn rotated into the tile, about the
         same point the live one turns about: the DRAWING's centre, which is
         the svg's own box centre carried into world units — not the ink
         box's, because the ink box is the drawing plus its shadow spill and
         its middle is three units down and right of the picture's. Live, the
         rotation is a CSS rotate on the svg element, whose default origin is
         that same centre; here it is written out. The box clips it, exactly
         as .gz's overflow:hidden clips the live one — a sticker turned far
         enough loses its corners in both, which is why ROT_MAX is 45 and the
         recipes turn things by three or four degrees. */
      const rot = r.rot ? r.rot * Math.PI / 180 : 0;
      const clip = over || !!rot;
      if (clip || rot) { ctx.save(); }
      if (clip) { ctx.beginPath(); ctx.rect(r.x, r.y, r.w, r.h); ctx.clip(); }
      if (rot) {
        const ink = P.ink || { x: 0, y: 0 };
        const cx = ox + (P.w / 2 - ink.x) * r.k, cy = oy + (P.h / 2 - ink.y) * r.k;
        ctx.translate(cx, cy); ctx.rotate(rot); ctx.translate(-cx, -cy);
      }
      if (P.pixel) ctx.imageSmoothingEnabled = false;
      ctx.drawImage(sp.canvas, ox, oy, dw, dh);
      if (P.pixel) ctx.imageSmoothingEnabled = true;
      if (clip || rot) ctx.restore();
    }
  }

  function layoutTiles() {
    if (!window.Lab) return;
    const Z = zoomOf();
    if (Z > ZOOM_NO_TILES) { clearTiles(); tileZ = Z; tileT = 0; return; }
    if (Z !== tileZ) { clearTiles(); tileZ = Z; tileT = TILE_PX / Z; noteBase(Math.round(Z * dpr() * SPRITE_ROUND) / SPRITE_ROUND); }
    const v = viewRect();
    const x0 = Math.floor(v.x / tileT) - 1, y0 = Math.floor(v.y / tileT) - 1;
    const x1 = Math.floor((v.x + v.w) / tileT) + 1, y1 = Math.floor((v.y + v.h) / tileT) + 1;
    const keep = new Set();
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
      const key = tx + ',' + ty; keep.add(key);
      if (tiles.has(key)) continue;
      const canvas = document.createElement('canvas');
      canvas.className = 'kit-tile';
      canvas.style.left = (tx * tileT) + 'px'; canvas.style.top = (ty * tileT) + 'px';
      canvas.style.width = tileT + 'px'; canvas.style.height = tileT + 'px';
      layer.appendChild(canvas);
      const t = { key, tx, ty, canvas, dirty: true };
      tiles.set(key, t); dirtyTile(t);
    }
    // two rings out, a tile is let go
    for (const [key, t] of tiles) {
      if (keep.has(key)) continue;
      if (t.tx < x0 - 1 || t.tx > x1 + 1 || t.ty < y0 - 1 || t.ty > y1 + 1) { t.canvas.remove(); tiles.delete(key); dirty.delete(t); }
    }
  }
  function clearTiles() { for (const t of tiles.values()) t.canvas.remove(); tiles.clear(); dirty.clear(); }

  // ── LIVE ─────────────────────────────────────────────────────────────────
  // grade: 'still' | 'sway' | 'full' — see the header
  function lift(r, now, grade) {
    const P = partOf(r);
    if (!P) return false;
    const art = r.el.querySelector('.gz-art'); if (!art) return false;
    grade = grade || 'still';
    if (P.pixel) grade = 'still';                   // a bitmap does not sway
    if (r.live && r.grade === grade) return true;
    let svg = null;
    if (P.pixel && !P.text) {
      // the same bitmap the sprite is made of, at the drawing's own size,
      // left to the browser's nearest-neighbour scaler from there
      const pm = pixOf(spriteKey(r), P);
      if (pm.ready && pm.canvas) {
        const cv = document.createElement('canvas');
        cv.width = pm.sw; cv.height = pm.sh;
        cv.getContext('2d').drawImage(pm.canvas, 0, 0);
        cv.style.display = 'block'; cv.style.position = 'absolute';
        cv.style.imageRendering = 'pixelated';
        art.textContent = ''; art.appendChild(cv);
      } else {
        // not baked yet: the vector, with the grid asked for, and a re-lift
        // the moment the bitmap is in
        art.innerHTML = P.still;
        svg = art.firstElementChild;
        if (svg) svg.style.shapeRendering = 'crispEdges';
        pm.done.then(() => { if (r.live && recs.get(r.id) === r) { r.grade = null; lift(r, false, 'still'); } });
      }
    } else {
      art.innerHTML = grade === 'full' ? P.full : grade === 'sway' ? P.sway : P.still;
      svg = art.firstElementChild;
      // a text part under a pixel style keeps its webfont and takes the grid
      // the only way a vector can
      if (P.pixel && svg) svg.style.shapeRendering = 'crispEdges';
    }
    if (svg && P.motion && grade !== 'still') {
      // in step with itself: the sprite it was a moment ago stood at rest,
      // so the animation starts within half a degree of rest — and not at
      // the same point as its neighbour, or a stand of pines would sway as
      // one
      const ph = P.motion.dur * (0.25 + 0.08 * hash(r.id));
      svg.style.animationDelay = (-ph).toFixed(3) + 's';
    }
    const was = r.live;
    r.live = true; r.grade = grade;
    placeLive(r);
    if (!was) { if (now) { dirtyRect(r); paintDirtyNow(); } else dirtyRect(r); }
    return true;
  }
  /* the svg sits where its ink starts: (0,0) of the art for nearly every
     part, further in for one that pokes out to the left or above — and, if
     the section carries data-rot, it is turned.

     THE ROTATION IS THE CSS `rotate` PROPERTY AND NOT A transform, and not a
     wrapping <g> either, and the reason is the sway. The sheet's sway is an
     animation on the root svg's own `transform` (skewX ±2°), and lab.css's
     jiggle overrides that transform with !important while a part is carried;
     anything this file wrote into `transform` would be beaten by both. The
     individual transform property composes INSTEAD of competing — the
     browser applies translate, then rotate, then scale, then transform — so
     the sticker turns and goes on swaying and jiggling inside its own turn,
     and neither animation had to be touched. A wrapping <g> was the other
     candidate and is worse twice over: the svg clips at its viewBox, so a
     rotated <g> loses its corners inside the drawing rather than at the box;
     and the root's drop-shadow would stay square while the drawing turned,
     where the sprite's baked shadow turns with it. The origin is written out
     in units rather than left at 50% 50% because a <canvas> pixel part
     covers the INK box (the drawing plus its shadow spill) and its middle is
     not the drawing's; P.w/2, P.h/2 names the drawing's centre in both. */
  function placeLive(r) {
    const art = r.el.querySelector('.gz-art');
    if (!art) return;
    const P = partOf(r);
    const o = inkOrigin(P);
    const ink = P && P.ink;
    art.querySelectorAll(':scope > svg, :scope > canvas').forEach(n => {
      n.style.left = (-o.x) + 'px'; n.style.top = (-o.y) + 'px';
      if (n.localName === 'canvas' && P) {
        n.style.width = ((ink ? ink.w : P.w)) + 'px';
        n.style.height = ((ink ? ink.h : P.h)) + 'px';
      }
      if (r.rot && P) {
        n.style.rotate = r.rot + 'deg';
        n.style.transformOrigin = (P.w / 2) + 'px ' + (P.h / 2) + 'px';
      } else if (n.style.rotate) { n.style.rotate = ''; }
    });
  }
  function unlift(r) {
    const art = r.el.querySelector('.gz-art');
    if (art) art.textContent = '';
    r.live = false; r.grade = null;
    dirtyRect(r);
  }
  function paintDirtyNow() {
    for (const t of dirty) if (t.canvas.isConnected) paintTile(t);
    dirty.clear();
  }

  /* Who is live: the held (a press, a carry, the corner, the pick, the
     outline, the menu), the must (a part standing OVER a machine — a tile
     lies under every section, so a part ranked above a non-kit gizmo it
     overlaps has to be drawn in the document to keep its place), the parts
     with text in them (a webfont does not reach an image), and then the
     nearest of what is on screen and big enough to be seen moving, up to a
     cap. Recomputed when the camera settles and when a zoom lands.

     TWO RULES THE STICKERS ADD (plan §8 4.5). A part that carries an SVG
     filter — a wobbled line, a blurred shade, a glow — is NEVER 'full': a
     filtered surface is redrawn by the compositor whenever anything inside
     it moves, so its inner animations are not worth having, and the sprite
     bakes the filtered look anyway so far away it is free. And it sways only
     within a SHARE of SWAY_MAX (SHEETS.stickers.swayShare, which the probe
     fills in per preset), because the twenty the probe measured were twenty
     plain drop-shadows and not twenty turbulence maps. A PIXEL part never
     sways at all — it is a bitmap. */
  function relive() {
    if (!window.Lab) return;
    const Z = zoomOf();
    const v = viewRect();
    const m = LIVE_MARGIN / Z, dm = DROP_MARGIN / Z;
    const near = { x: v.x - m, y: v.y - m, w: v.w + 2 * m, h: v.h + 2 * m };
    const far = { x: v.x - dm, y: v.y - dm, w: v.w + 2 * dm, h: v.h + 2 * dm };
    const cx = v.x + v.w / 2, cy = v.y + v.h / 2;
    const noTiles = Z > ZOOM_NO_TILES;
    const want = new Map();              // rec → grade
    const moving = [];                   // on screen and big enough to move, nearest first
    recs.forEach(r => {
      const P = partOf(r);
      if (!P) return;
      const inNear = r.x + r.w > near.x && r.x < near.x + near.w && r.y + r.h > near.y && r.y < near.y + near.h;
      const inFar = r.x + r.w > far.x && r.x < far.x + far.w && r.y + r.h > far.y && r.y < far.y + far.h;
      const px = r.h * r.k * Z;          // drawn height on screen
      const seen = r.live ? inFar : inNear;
      // live for a reason of its own: still, unless it is also near and big
      if (r.held || r.must || P.text) want.set(r, 'still');
      // a part with no tile under it is live whatever its size
      else if (noTiles && inFar) want.set(r, 'still');
      if (P.pixel) return;               // a bitmap has nothing to animate
      if (seen && px >= (r.live && r.grade !== 'still' ? 0.85 : 1) * SWAY_PX) {
        const dx = (r.x + r.w / 2) - cx, dy = (r.y + r.h / 2) - cy;
        moving.push({ r, d: dx * dx + dy * dy, px, filtered: !!P.filtered });
      }
    });
    moving.sort((a, b) => a.d - b.d);
    const filtCap = Math.max(0, Math.round(SWAY_MAX * shareOf()));
    let sways = 0, fulls = 0, filts = 0;
    for (const c of moving) {
      if (sways >= SWAY_MAX) break;
      if (c.filtered) {
        if (filts >= filtCap) continue;  // over its share: it stays a sprite (or 'still', if something else asked)
        want.set(c.r, 'sway');
        sways++; filts++;
        continue;
      }
      const onScreen = c.r.x + c.r.w > v.x && c.r.x < v.x + v.w && c.r.y + c.r.h > v.y && c.r.y < v.y + v.h;
      const full = fulls < FULL_MAX && c.px >= FULL_PX && onScreen;
      want.set(c.r, full ? 'full' : 'sway');
      sways++; if (full) fulls++;
    }
    /* THE EXCEPTION. A part whose section carries data-live (index.html says
       which and why) is drawn in full — everything its sheet drew, the
       hammer and all — whenever it is anywhere near the screen, whatever
       its size on it and outside the caps above: the builder hammering
       under his speech bubble is the bench's opening shot, not incidental
       sway, and one inner animation is what the caps were budgeted for.
       Off the paper he is a sprite like the rest. frames.js has the same
       word for a machine. A filtered or pixelled part is not raised this
       way — lift() lowers a pixel part to 'still' whatever is asked. */
    recs.forEach(r => {
      if (!r.el.hasAttribute('data-live')) return;
      const inNear = r.x + r.w > near.x && r.x < near.x + near.w && r.y + r.h > near.y && r.y < near.y + near.h;
      if (inNear) want.set(r, 'full');
    });
    recs.forEach(r => {
      const g = want.get(r);
      if (g) lift(r, false, g);
      else if (r.live) unlift(r);
    });
  }

  // the must: a part over a machine. Cheap — a few dozen non-kit boxes.
  let mustT = 0;
  function mustSoon() { if (!mustT) mustT = setTimeout(remust, 120); }
  function remust() {
    mustT = 0;
    const others = [];
    document.querySelectorAll('#bench-world > .gz:not([data-kit])').forEach(el => {
      const st = el.style;
      others.push({ x: parseFloat(st.left) || 0, y: parseFloat(st.top) || 0,
                    w: parseFloat(st.width) || el.offsetWidth, h: parseFloat(st.height) || el.offsetHeight,
                    z: parseInt(st.zIndex, 10) || 0 });
    });
    let changed = false;
    recs.forEach(r => {
      let must = false;
      for (const o of others) {
        if (r.z <= o.z) continue;
        if (r.x < o.x + o.w && r.x + r.w > o.x && r.y < o.y + o.h && r.y + r.h > o.y) { must = true; break; }
      }
      if (must !== r.must) { r.must = must; changed = true; }
    });
    if (changed) relive();
  }

  // ── CTRL: WHAT IS PAINTED UNDER THE POINTER ──────────────────────────────
  /* ink.js asks. The answer comes from the drawing's own alpha at 1×, mapped
     back through the box: never from elementsFromPoint, which cannot see
     through the pointer-events:none ink.js puts on every other section.

     AND BACK THROUGH THE ROTATION, if the section carries data-rot. The mask
     is the UNROTATED drawing — one alpha map per part, whatever any section
     does with it — and frames.js measured an unrotated box, so the pointer
     is turned by −rot about the drawing's centre before it is asked which
     pixel it is over. Without this a turned sticker answers for a point a
     few units away from the one under the hand, and ctrl picks the wrong
     thing up (or nothing) along every edge. */
  function inkAt(el, cx, cy) {
    const r = byEl.get(el); if (!r) return null;
    const m = mask(r.kit, r.part); if (!m || !m.data) return null;
    const b = el.getBoundingClientRect(); if (!b.width) return null;
    const Z = b.width / (r.w || 1);
    let lx = (cx - b.left) / Z, ly = (cy - b.top) / Z;                // box px
    const tx = (r.w - r.natW * r.k) / 2, ty = (r.h - r.natH * r.k) / 2;
    if (r.rot) {
      const P = partOf(r), ink = (P && P.ink) || { x: 0, y: 0 };
      const pw = P ? P.w : r.natW, ph = P ? P.h : r.natH;
      const px = tx + (pw / 2 - ink.x) * r.k, py = ty + (ph / 2 - ink.y) * r.k;
      const a = -r.rot * Math.PI / 180, ca = Math.cos(a), sa = Math.sin(a);
      const dx = lx - px, dy = ly - py;
      lx = px + dx * ca - dy * sa;
      ly = py + dx * sa + dy * ca;
    }
    const ax = Math.round((lx - tx) / r.k), ay = Math.round((ly - ty) / r.k);   // ink px at 1×
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const x = ax + dx, y = ay + dy;
      if (x < 0 || y < 0 || x >= m.w || y >= m.h) continue;
      if (m.data[y * m.w + x] > 8) return true;
    }
    return false;
  }

  /* The outline: ink.js's own recipe, in this document — a flat copy of the
     drawing behind the drawing, painted pink and spread 2.5px by four hard
     shadows, so the rim that shows past the edges is the silhouette. A
     PIXEL part has a <canvas> and not an svg in its art, so the rim is cut
     from the part's still string instead, which is the same drawing; and a
     rotated part's rim is turned with it, because the copy's own style
     attribute is thrown away and the rotation lives there. */
  let outlined = null;
  function outline(el) {
    if (outlined) { const n = outlined.querySelector('.gz-art > [data-lab-ink]'); if (n) n.remove(); outlined = null; }
    if (!el) return false;
    const r = byEl.get(el); if (!r) return false;
    if (!r.live && !lift(r, true, 'still')) return false;
    const art = el.querySelector('.gz-art');
    if (!art) return false;
    let svg = art.querySelector(':scope > svg'), copy = null;
    if (svg) {
      copy = svg.cloneNode(true);
      copy.removeAttribute('style');
      copy.setAttribute('width', svg.getAttribute('width')); copy.setAttribute('height', svg.getAttribute('height'));
      copy.querySelectorAll('[style]').forEach(n => n.removeAttribute('style'));
      copy.querySelectorAll('[filter]').forEach(n => n.removeAttribute('filter'));
    } else {
      const P = partOf(r);
      const host = art.querySelector(':scope > canvas');
      if (!P || !host) return false;
      const box = document.createElement('div');
      box.innerHTML = P.still;
      copy = box.firstElementChild;
      if (!copy) return false;
      copy.removeAttribute('style');
      copy.querySelectorAll('[style]').forEach(n => n.removeAttribute('style'));
      copy.querySelectorAll('[filter]').forEach(n => n.removeAttribute('filter'));
      svg = host;
    }
    copy.setAttribute('data-lab-ink', '');
    if (r.rot) {
      const P = partOf(r);
      copy.style.rotate = r.rot + 'deg';
      if (P) copy.style.transformOrigin = (P.w / 2) + 'px ' + (P.h / 2) + 'px';
    }
    art.insertBefore(copy, svg);
    outlined = el;
    return true;
  }

  // frames.js's drag signal: a carried part is drawn in the hand, at once
  function drag(el, on) {
    const r = byEl.get(el); if (!r) return;
    if (on && !r.live) { lift(r, true, 'still'); relive(); }
  }

  /* ── the extractor's two hooks into the bench ─────────────────────────────
     A sheet has landed: its keyframes go into the page, and every part's ink
     and mask is read NOW so ctrl has an answer the first time it asks and a
     part that pokes out of its box gets its true size before anyone looks at
     it. A sheet has been RE-extracted (Kits.setStyle): every bitmap made
     from the old strings is thrown away, every section's variant is built
     again against the new style, and the tiles and the live parts are redone
     — nothing else on the bench is touched. */
  onSheet = function (kit, sh) {
    kfStyle.textContent += '\n' + sh.keyframes.join('\n');
    Object.keys(sh.parts).forEach(part => inkOf(kit, part));
  };
  afterRestyle = function (kit) {
    const pre = kit + '/';
    for (const k of [...sprites.keys()]) if (k.indexOf(pre) === 0) sprites.delete(k);
    for (const k of [...images.keys()]) if (k.indexOf(pre) === 0) images.delete(k);
    for (const k of [...pixmaps.keys()]) if (k.indexOf(pre) === 0) pixmaps.delete(k);
    for (const k of [...masks.keys()]) if (k.indexOf(pre) === 0) masks.delete(k);
    const sh = sheets[kit];
    kfStyle.textContent += '\n' + sh.keyframes.join('\n');
    const inks = Object.keys(sh.parts).map(part => { const m = inkOf(kit, part); return m && m.done; }).filter(Boolean);
    recs.forEach(r => { if (r.kit === kit) { r.vkey = null; readSkin(r); } });
    return Promise.all(inks).then(() => {
      recs.forEach(r => {
        if (r.kit !== kit) return;
        if (r.live) { const g = r.grade || 'still'; r.grade = null; lift(r, false, g); }
      });
      for (const t of tiles.values()) dirtyTile(t);
      relive();
      return sh;
    });
  };

  // ── boot ─────────────────────────────────────────────────────────────────
  convertAll();
  // the four sheets are asked for NOW, while the rest of the page is still
  // parsing — index.html preloads them too — so the parts near the opening
  // camera are drawn the moment lab.js and frames.js have run, not a fetch
  // later
  Object.keys(SHEETS).forEach(loadSheet);

  let started = false;
  function start() {
    if (started || !window.Lab) return; started = true;
    // every kit section frames.js adopted before this ran, and any it missed
    document.querySelectorAll('#bench .gz[data-kit]').forEach(el => { if (!byEl.get(el)) adopt(el); });
    Promise.all(Object.keys(SHEETS).map(loadSheet)).then(() => { layoutTiles(); relive(); remust(); });
    document.addEventListener('lab:still', () => { layoutTiles(); relive(); });
    // tiles that asked for a part before its ink was known are painted
    // once the sheet has settled — a beat after each sheet arrives
    const flushInk = () => { const t = [...pendingInk]; pendingInk.clear(); t.forEach(dirtyTile); };
    Object.keys(SHEETS).forEach(k => loadSheet(k).then(() => setTimeout(flushInk, 400)));
    document.addEventListener('lab:zoom', () => { layoutTiles(); relive(); });
    window.addEventListener('resize', () => { layoutTiles(); relive(); });
    // a lab:zoom lands only at the end of a glide; meanwhile the tiles are
    // scaled by the sheet and that is fine — but the ring must follow a
    // scroll that outruns lab:still, so the scroll itself asks for tiles
    let scrollT = 0;
    Lab.bench.addEventListener('scroll', () => {
      if (scrollT) return;
      scrollT = setTimeout(() => { scrollT = 0; if (!(Lab.moving && Lab.moving())) layoutTiles(); }, 90);
    }, { passive: true });
    layoutTiles();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();

  function stats() {
    let live = 0; recs.forEach(r => { if (r.live) live++; });
    let bytes = 0; sprites.forEach(s => { if (s.canvas) bytes += s.canvas.width * s.canvas.height * 4; });
    let full = 0, sway = 0; recs.forEach(r => { if (r.grade === 'full') full++; else if (r.grade === 'sway') sway++; });
    let variants = 0; Object.keys(sheets).forEach(k => { variants += Object.keys(sheets[k].variants || {}).length; });
    return { parts: recs.size, live, full, sway, tiles: tiles.size, sprites: sprites.size, spriteBytes: bytes, tileZ,
             sheets: Object.keys(sheets), variants, style: STYLE.preset || '', pixmaps: pixmaps.size };
  }
  function freeze(on) { Lab.bench.toggleAttribute('data-kit-freeze', !!on); }

  return { natural, adopt, drop, inkAt, outline, drag, wants, isKitSrc, make, kindOf, start, stats, freeze,
           relive, setStyle, extractOnly, SHEETS,
           get recs() { return recs; }, get sheets() { return sheets; } };
})();
