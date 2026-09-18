/* ─── THE FONT PAIRINGS ───────────────────────────────────────────────────
   press/fonts.js — window.Fonts: the nine pairings a game page can wear,
   the CSS stacks that set its --display / --body / --mono, the two files
   worth a <link rel=preload>, and the small rule that offers three pairings
   for a style preset. A table and four functions; no document, no fetch,
   no bench — theme.js folds the stacks into its token sheet, the Press
   Table lists suggest()'s three in its tweak panel, and the Node test
   (tools/test-fonts.js) loads this file in a bare context to check the
   table against the folder.

   WHY A TABLE OF PAIRINGS AND NOT A FONT PICKER. The plan (§6 step 4)
   wants a page's type chosen from a short menu the vision call can name by
   id and a schema can validate (theme.schema.json's nine ids), never a free
   choice — a free choice is a face the folder has not got. Every family
   here is SELF-HOSTED: a .woff2 in fonts/ and a row in fonts/fonts.css,
   never a link to Google (the bench's rule, SELF-HOSTED in about.md: a
   frame must not wait on a third party to boot). A pairing therefore names
   families, and `faces` is the list of every file those families declare,
   so the builder can refuse a pairing whose files are missing before it
   writes a page that asks for them.

   THE NINE, and where each comes from: the five the folder already had
   (clean, pixel, hand, rustic, gothic — the plan's own list) and the four
   the plan asked to add: a comic display (Bangers), a cozy rounded
   (Fredoka), a sci-fi geometric (Orbitron), a typewriter (Special Elite).
   Bodies are Public Sans — the bench's own body — except where the display
   is itself monospaced or geometric (pixel, scifi), which read better over
   Space Mono. `gothic` carries an ACCENT face on top: UnifrakturMaguntia is
   a blackletter for a drop cap or a word, unreadable as a heading, so
   Pirata One takes the headings and the fraktur is offered for accents
   only (the plan says exactly this split).

   MONO. The bench's --mono is the system stack in lab.css (ui-monospace,
   "Cascadia Mono", Consolas, "SF Mono", Menlo, monospace): zero bytes, and
   the labels it dresses are 10 px serials and kbd caps. Seven pairings keep
   it verbatim — `clean` is then lab.css's own three stacks, so an unthemed
   page is byte-for-byte the bench — and the two whose body is already
   Space Mono use that for their mono too, since it is loaded anyway.

   FALLBACK STACKS name the family, the nearest face that ships with
   Windows or macOS, and the generic. Nobody should see the fallbacks: every
   family is served from fonts/ with font-display:swap, so they show only for
   the swap period on a cold cache, and there a same-flavour system face
   keeps a Bangers headline from arriving as Times.

   THE VARIABLE FILES. Fredoka and Orbitron come from Google Fonts as ONE
   variable file each — the CSS2 API hands the same URL for both weights —
   so the folder holds Fredoka-400.woff2 and Orbitron-400.woff2 once, and
   fonts.css points its 600 and 700 rows at the same file (each row a single
   weight, as Public Sans's four rows are; the browser clamps the wght axis
   to the row's weight). FILES maps family + weight → file so `faces` and
   preloads() name a file once and never name one that is not there.

   PRELOADS. preloads(id) is the display face at its MAIN weight plus the
   body at 400 — the two the bench preloads for itself (test/index.html
   lines 50–51: Sora-700 and Public-Sans-400). The main weight is the one a
   heading is set in: 700 for Sora (that preload line), 700 for Kalam (its
   bold is the lettered headline; its 400 is for notes), 600 for Fredoka and
   700 for Orbitron (their heavier row, the one a title wants), 400 for the
   single-weight faces. lab.css asks 700/800 of --display, so a single-weight
   display face is synthesised bold by the browser on the bench's chrome —
   the template's business (a --display-weight token, Phase 5), noted here
   because this table is where the true weights are known.

   SUGGEST. suggest({style, dark, saturation}) returns three ids by the rule
   table RULES, one row per preset (Appendix C's ten), written by hand from
   what each preset's games look like: a pixel game wants the pixel face and
   then the two geometric ones; neon wants the geometric first; the painted
   and cozy ones want the hand-lettered face; ink-sketch and grunge want the
   typewriter and the rough faces; retro-print the Western slab. Then one
   nudge: DARK + SATURATED (saturation over SATURATED, 0.12 — the plan's own
   line between calm and loud, §6 step 1 and CONTRACTS §2) is a neon-leaning
   plate, and it moves `scifi` up one place — from off the list into third,
   from third into second, from second into first — except that nothing
   passes `pixel` when the preset is pixel: that pairing follows a
   MEASUREMENT (the pixel grid, Phase 3), and a taste rule does not outrank
   a measurement, the same precedence §11 step 5 gives pixelSize over the
   model's preset. An unknown or absent style is `flat` (CONTRACTS §5: absent
   → flat), so the function always answers with three distinct valid ids.
   ───────────────────────────────────────────────────────────────────────── */
(function () {
  'use strict';

  /* Every self-hosted family: weight → file, exactly the rows of
     fonts/fonts.css (test-fonts.js checks the two agree), plus the stack the
     page sets. `ui-monospace` is not a file but the bench's system stack. */
  const FAMILIES = {
    'Sora':               { files: { 600: 'Sora-600.woff2', 700: 'Sora-700.woff2', 800: 'Sora-800.woff2' },
                            stack: "'Sora',sans-serif" },                                   // lab.css line 22, verbatim
    'Public Sans':        { files: { 400: 'Public-Sans-400.woff2', 500: 'Public-Sans-500.woff2', 600: 'Public-Sans-600.woff2', 700: 'Public-Sans-700.woff2' },
                            stack: "'Public Sans',sans-serif" },                            // lab.css line 23, verbatim
    'Space Mono':         { files: { 400: 'Space-Mono-400.woff2', 700: 'Space-Mono-700.woff2' },
                            stack: "'Space Mono',Menlo,Consolas,monospace" },
    'VT323':              { files: { 400: 'VT323-400.woff2' },
                            stack: "'VT323','Courier New',monospace" },
    'Kalam':              { files: { 400: 'Kalam-400.woff2', 700: 'Kalam-700.woff2' },
                            stack: "'Kalam','Segoe Print','Bradley Hand',cursive" },
    'Rye':                { files: { 400: 'Rye-400.woff2' },
                            stack: "'Rye',Rockwell,'Playbill',serif" },
    'Pirata One':         { files: { 400: 'Pirata-One-400.woff2' },
                            stack: "'Pirata One','Old English Text MT',serif" },
    'UnifrakturMaguntia': { files: { 400: 'UnifrakturMaguntia-400.woff2' },
                            stack: "'UnifrakturMaguntia','Old English Text MT',fantasy" },
    'Bangers':            { files: { 400: 'Bangers-400.woff2' },
                            stack: "'Bangers',Impact,'Arial Black',sans-serif" },
    'Fredoka':            { files: { 400: 'Fredoka-400.woff2', 600: 'Fredoka-400.woff2' },   // one variable file, two rows
                            stack: "'Fredoka','Arial Rounded MT Bold',sans-serif" },
    'Orbitron':           { files: { 400: 'Orbitron-400.woff2', 700: 'Orbitron-400.woff2' }, // one variable file, two rows
                            stack: "'Orbitron','Bank Gothic',Eurostile,sans-serif" },
    'Special Elite':      { files: { 400: 'Special-Elite-400.woff2' },
                            stack: "'Special Elite','American Typewriter','Courier New',monospace" },
    'ui-monospace':       { files: {},
                            stack: 'ui-monospace,"Cascadia Mono",Consolas,"SF Mono",Menlo,monospace' }  // lab.css line 24, verbatim
  };

  /* The weight a heading is set in, per display face (see PRELOADS above);
     a family not listed is a single-weight face and its main weight is 400. */
  const MAIN = { 'Sora': 700, 'Kalam': 700, 'Fredoka': 600, 'Orbitron': 700 };

  const PAIRINGS = {
    clean:      { display: 'Sora',          body: 'Public Sans', mono: 'ui-monospace' },
    pixel:      { display: 'VT323',         body: 'Space Mono',  mono: 'Space Mono' },
    hand:       { display: 'Kalam',         body: 'Public Sans', mono: 'ui-monospace' },
    rustic:     { display: 'Rye',           body: 'Public Sans', mono: 'ui-monospace' },
    gothic:     { display: 'Pirata One',    body: 'Public Sans', mono: 'ui-monospace', accent: 'UnifrakturMaguntia' },
    comic:      { display: 'Bangers',       body: 'Public Sans', mono: 'ui-monospace' },
    cozy:       { display: 'Fredoka',       body: 'Public Sans', mono: 'ui-monospace' },
    scifi:      { display: 'Orbitron',      body: 'Space Mono',  mono: 'Space Mono' },
    typewriter: { display: 'Special Elite', body: 'Public Sans', mono: 'ui-monospace' }
  };

  const ROLES = ['display', 'body', 'mono', 'accent'];

  /* faces: every file of every family the pairing names, each once, in
     role order — what the page must be able to serve. Computed, not typed,
     so it cannot drift from FAMILIES. */
  for (const id of Object.keys(PAIRINGS)) {
    const p = PAIRINGS[id], faces = [];
    for (const role of ROLES) {
      const fam = p[role];
      if (!fam) continue;
      if (!FAMILIES[fam]) throw new Error('fonts.js: pairing ' + id + ' names an unknown family ' + fam);
      for (const w of Object.keys(FAMILIES[fam].files)) {
        const f = FAMILIES[fam].files[w];
        if (faces.indexOf(f) < 0) faces.push(f);
      }
    }
    p.faces = Object.freeze(faces);
    Object.freeze(p);
  }
  Object.freeze(PAIRINGS);

  /* The rule table, one row per preset (Appendix C), read left to right as
     first, second, third. Keyed by the preset id the style vector carries. */
  const RULES = {
    'pixel':           ['pixel', 'scifi', 'clean'],
    'neon':            ['scifi', 'clean', 'comic'],
    'painterly':       ['hand', 'cozy', 'clean'],
    'cozy-soft':       ['hand', 'cozy', 'clean'],
    'ink-sketch':      ['hand', 'typewriter', 'rustic'],
    'grunge':          ['typewriter', 'gothic', 'rustic'],
    'outline-cartoon': ['comic', 'cozy', 'clean'],
    'retro-print':     ['rustic', 'typewriter', 'clean'],
    'cel':             ['clean', 'comic', 'scifi'],
    'flat':            ['clean', 'cozy', 'scifi']
  };
  const SATURATED = 0.12;   // mean OKLCH chroma above which a plate is loud — plan §6 step 1, CONTRACTS §2

  function pairing(id) {
    if (!Object.prototype.hasOwnProperty.call(PAIRINGS, id)) {
      throw new RangeError('fonts.js: no pairing "' + id + '" (one of ' + Object.keys(PAIRINGS).join(', ') + ')');
    }
    return PAIRINGS[id];
  }

  /* stacks(id) → { display, body, mono[, accent] }, each a full CSS
     font-family value: the family quoted when it has a space, then the
     fallbacks, then the generic. */
  function stacks(id) {
    const p = pairing(id), out = {};
    for (const role of ROLES) if (p[role]) out[role] = FAMILIES[p[role]].stack;
    return out;
  }

  /* preloads(id) → the display face's main weight and the body's 400, as
     woff2 basenames, each once (pixel and scifi would otherwise name
     Space-Mono-400 twice when the body and mono coincide — they do not
     here, but the guard costs a line). */
  function preloads(id) {
    const p = pairing(id), out = [];
    const d = FAMILIES[p.display], b = FAMILIES[p.body];
    const df = d.files[MAIN[p.display] || 400], bf = b.files[400];
    if (df) out.push(df);
    if (bf && out.indexOf(bf) < 0) out.push(bf);
    return out;
  }

  /* suggest({style, dark, saturation}) → [id, id, id]; the rule table plus
     the one nudge, both described in the header. */
  function suggest(o) {
    o = o || {};
    // own rows only: RULES is a plain object, and RULES['constructor'] (or '__proto__', 'toString'…)
    // is a function off Object.prototype, not a row — .slice() on it threw, where the header promises flat
    const three = (Object.prototype.hasOwnProperty.call(RULES, o.style) ? RULES[o.style] : RULES.flat).slice();
    const loud = !!o.dark && Number(o.saturation) > SATURATED;
    if (loud) {
      const at = three.indexOf('scifi');
      const from = at < 0 ? 3 : at;                      // off the list counts as fourth
      const to = Math.max(0, from - 1);
      const pastPixel = o.style === 'pixel' && to === 0; // a measurement outranks a taste
      if (to !== from && !pastPixel) {
        if (at >= 0) three.splice(at, 1);
        three.splice(to, 0, 'scifi');
      }
    }
    return three.slice(0, 3);
  }

  window.Fonts = Object.freeze({ PAIRINGS, stacks, preloads, suggest });
})();
