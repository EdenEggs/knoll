/* ─── THE TOOL DOCK ────────────────────────────────────────────────────────
   The dock from the coming-soon page's hero, brought to the bench: a dark
   pill at the bottom centre with move / draw / image / text, one ink and
   the colour wheel that changes it, undo and delete, and a second row of
   options that appears when the chosen tool has any and folds away in move
   mode.

   The same numbers as the hero, deliberately — 4 pen widths, 3 sticker
   opacities, 5 stamps, 5 fonts — so the two feel like one product:

     PW  2.5 / 4.5 / 8 / 14        PO  100% / 55% / 25%
     SK  hat · gnome · toadstool · big beard · lantern
     FONTS  Sans · Display · Serif · Mono · Marker

   TWO THINGS THE HERO HAS NOT GOT
     PIXEL  off · 10 · 20 · 40 — the pen squares off and fills the bench's
     own grid a cell at a time. Choosing a size re-cuts that grid to match
     (Lab.grid), so the squares you can SEE are the pixels you get — until you
     zoom out far enough that lab.js starts drawing every second one. A drag is
     one piece however many cells it covers, so undo takes the shape rather
     than the last square of it, and moving one afterwards snaps by cells.

     ONE INK, AND A WHEEL  The hero's five swatches were five pots; here
     there is one, showing the ink the next mark is made in, and a COLOUR
     button beside it that opens a wheel — hue round the rim, saturation in
     towards the centre, a brightness bar under it and a hex box for a
     number you already know. The five house colours are chips at the foot
     of the wheel. A mark made in a house colour stores its TOKEN and so
     follows the paper between skins; a mark made off the wheel stores its
     hex and stays put. The ink chosen is kept with the drawing and applies
     to NEW marks only — see THE WHEEL, below.

     STICKER AND UPLOAD, WHERE IMAGE WAS  The five stamps came off the dock
     a while ago and IMAGE took their place; IMAGE is now two buttons, the
     way the Design Canvas export draws the lab dock (Downloads/features/
     Tracing Table.html, which draws both panels under one strip).

     BOTH PANELS ARE THE USER'S UI, NOT SCENERY. They stand FIXED to the
     left of the screen for as long as their tool is up, so panning and
     zooming the bench moves the drawing under them and leaves them where
     the hand left them. Neither is a gizmo: they are not on the paper, not
     dragged, not in keep.js's layout and not copyable. See THE SIDE PANELS
     in lab.css.

     UPLOAD is a +, and opens the tracing table (tracer.js): lay a picture on
     it (or drag one straight onto THE FLAT FILE at its foot), trace it, file
     it, and a filed tracing goes on the pointer the way a stamp did — a
     click on the paper stamps it there as a piece of the wall (k:'i', which
     paints the tracing's own paths at the size the options row says).

     STICKER opens the sticker drawer (stickers.js), which holds the artwork
     that came WITH the bench rather than anything you made: pick one out of
     the drawer, or carry it out on the pointer, and it lands as k:'d'. The
     two tools share the options row, so a tracing and a sticker are set by
     the same SIZE and FADE and remember the same two numbers.

     The stamps already on the paper still paint: STAMPS and SK are kept for
     them, the way the stickies are kept for old notes.

     A NOTE IS A BOX, NOT A LINE
     It has a WIDTH, and the words fall onto as many lines as that width needs
     — measured on a canvas in the note's own face and size, so the break lands
     where it will look like it landed. You are typing into a box the same
     width, so the wrapping you watch is the wrapping you get. Drag the tab on
     its right edge to reshape it, while writing or long afterwards with the
     move tool, and the parchment under it is re-cut to the new block. Notes
     written before any of this hold no width and stay one line, as they were.

     A PINNED NOTE IS STILL A NOTE
     Double click one with the move tool, or click it with the text tool, and
     the box comes back around it: same words, same width, and the dock loaded
     with its own type case. It is written back OVER ITSELF rather than added
     again, so it keeps its place in the stack and on the paper; pinned empty
     it comes off the wall; escape puts it back untouched.

     THE TYPE CASE COMES UP WITH THE BOX
     Picking up the text tool says nothing about a note that is not being
     written yet, so the options row stays folded away until you click the
     paper. Face, size, weight, slant and edge arrive WITH the caret, sat over
     the words they change, and fold away again when the note is pinned.

     STICKIES ARE NO LONGER OFFERED
     The four pads have come off that row — a choice of paper in the middle of
     a type case — but the artwork stays: a note written on one before this
     still comes out on it, here and after every reload.

     CLEAR AND THE TAPE BUTTON ARE GONE; DELETE TAKES THEIR PLACE
     Clear was a nuke — wipe the whole wall, ask first, no way back. Delete is
     a tool like the other four: pick it up, and whatever you hover marks
     itself (amber, not the pick's pink, so "about to remove" reads
     differently from "about to move"), click and it is gone. It reaches two
     kinds of thing — a mark on the wall (ink, a stamp, a note) and a pasted
     COPY of a feature, never one of the eighty-four originals — and both
     still cost one ctrl+z to put back, the same as a mis-drag would. The
     tape button went with Clear for the same reason: a strip already carries
     its own ✕, so a second way to take one down was one button too many —
     stringing a NEW strip up is the one thing that left with the button.

   WHAT IT DRAWS ON
     One <svg> laid over the sheet inside #bench-world, in world units, so ink
     pans and zooms with the paper and stays crisp at 400% instead of going to
     porridge the way a bitmap would. Everything on it is one of three plain
     records — a stroke, a stamp, a note — which is also exactly what gets
     saved, so the wall is a list of primitives rather than an image.

   COLOUR FOLLOWS THE PAPER
     The hero keeps two palettes and swaps to the darker one after dark, because
     ink that suits cream paper disappears on a night sky. The bench has the
     same problem four times over, one per genre skin, so a colour is stored as
     a TOKEN NAME and resolved at paint time — draw in horror, switch to
     adventure, and the ink follows the paper instead of vanishing into it.

   NOT PANNING WHILE YOU DRAW
     '.wall-ink' is in lab.js's onPaper and HANDS_OFF lists next to .critter
     and .zt-pin, or a drag on bare paper would slide the camera instead of
     leaving a line. The layer also drops its pointer events entirely whenever
     the hand tool is up (space, or H), so panning always wins over drawing.

   Saved in Lab.store('wall') on this device. */

window.Wall = (function () {
  const $ = id => document.getElementById(id);
  const world = (window.Lab && Lab.world) || $('bench-world');
  const SVGNS = 'http://www.w3.org/2000/svg';

  // the hero's numbers, unchanged
  const PAL = ['ink', 'pink-2', 'blue', 'green', 'amber'];   // token names, not hexes
  const PW = [2.5, 4.5, 8, 14];
  const PO = [1, 0.55, 0.25];
  const IMG = [160, 320, 640];           // a stamped tracing's long edge, in world px — S, M, L
  const PIX = [0, 10, 20, 40];           // 0 is a free hand; the rest are cells, in world units
  const GRID = 20;                       // what the bench is ruled at when nothing has re-cut it
  const NW = [90, 1400];                 // how narrow and how wide a note may be reshaped to
  const LH = 1.32;                       // a line of a note, as a multiple of its size
  const SK = ['hat', 'gnome', 'toadstool', 'beard', 'lantern'];
  /* Three weights per face, not one. `w` is the single weight a font had
     before there was a B button and is kept ONLY so that notes written back
     then come out exactly as they always did; `r` and `b` are the regular and
     bold a note written since chooses between.

     The two house faces keep their old weight as their regular, so nothing
     about the ordinary note changes. The three system faces drop to 400: they
     carry only 400 and 700, and asking one of them for 600 already lands on
     bold — which is why B did nothing at all for them until now. */
  const FONTS = [
    { n: 'Sans', f: "var(--body)", w: 600, r: 600, b: 700 },
    { n: 'Display', f: "var(--display)", w: 700, r: 700, b: 800 },
    { n: 'Serif', f: "Georgia,'Times New Roman',serif", w: 600, r: 400, b: 700 },
    { n: 'Mono', f: "var(--mono)", w: 600, r: 400, b: 700 },
    { n: 'Marker', f: "'Comic Sans MS','Segoe Print',cursive", w: 700, r: 400, b: 700 }
  ];
  /* Sizes are a LIST rather than a step of n, because A+ that walks 22 → 28 →
     36 is the one people mean and 22 → 24 → 26 is not. */
  const TSZ = [12, 14, 16, 18, 22, 28, 36, 48, 64, 88];
  const DEF_Z = TSZ.indexOf(22);         // the size a note has always come out at
  const ALIGN = ['start', 'middle', 'end'];      // left, centred, right — in SVG's own words
  const CSS_AL = ['left', 'center', 'right'];    // …and in the box you type into
  /* The five pads, KEPT FOR WHAT IS ALREADY ON THE WALL. Nothing picks one any
     more — the swatches came off the type case — but a note saved with a pad
     still holds its index, and paint still looks it up here. Index 0 is bare
     paper and always was, so notes from before any of this and notes written
     since the picker went both come out on nothing. The colours are TOKENS,
     not hexes, for the same reason the inks are: a sticky has to be a paper
     the skin's own ink reads on, which means pale under the knoll and dim
     down in the cellar. */
  const STICKIES = [
    { n: 'None', k: '' },
    { n: 'Yellow', k: 'y' },
    { n: 'Pink', k: 'p' },
    { n: 'Blue', k: 'b' },
    { n: 'Green', k: 'g' }
  ];
  const PADS = { y: '--sticky-a', p: '--sticky-b', b: '--sticky-c', g: '--sticky-d' };
  const pad = k => 'var(' + (PADS[k] || PADS.y) + ')';
  /* THERE IS NO CAP ON THE PILE ANY MORE. Until 2026-09-11 this line read
     `const MAX = 600` and add() spliced the oldest pieces off the FRONT of
     the list once it was longer than that — every stroke of the pen being a
     piece, a scene of a hundred stickers and one afternoon's drawing was
     enough, and the stickers stamped first started vanishing as more went
     on, silently. It was found on the iron hive, whose wall.js is this one's
     twin, and never reported here — but nothing here was any different. The
     splice was worse than the loss: it renamed every index at once, and an
     index is what everything in this file knows a piece by — a move in
     flight, a note being resized, a note being edited and every undo closure
     all pointed at the wrong thing afterwards (see deleting what is already
     there). What bounds the wall now is localStorage itself, and lab.js says
     so out loud when a save no longer fits (A SAVE THAT DOES NOT FIT, over
     there) rather than anything here dropping a piece. */

  const store = Lab.store('wall', () => ({ items: [] }));
  const S = () => store.get();
  /* DEAD SLOTS ARE DROPPED AT BOOT, AND ONLY AT BOOT. A delete and an
     emptied note both leave a null in the list rather than splicing it out,
     because everything that holds an index has to go on holding it (see
     deleting what is already there, below). Those nulls are worth nothing
     after a reload — undo is not saved, nothing is held, nothing is open —
     so this is the one moment the list can be squeezed without renaming a
     piece anybody is still pointing at. Without it a wall that had things
     taken off it all day would carry a growing tail of nothing, saved and
     parsed on every write. A store with no list at all (a save from before
     this file, or a hand-edited one) is given an empty one rather than left
     to throw at the first paint. */
  if (!Array.isArray(S().items)) store.update(st => { st.items = []; });
  else if (S().items.some(it => !it)) store.update(st => { st.items = st.items.filter(Boolean); });

  // tool choices are a mood, not a document — they live for the session only,
  // the same way the hero treats them
  let tool = 'move', ci = 1, pw = 1, po = 0, fo = 0, sk = 0, pi = 0, nw = 260, iz = 1;
  // …and the rest of the type case: bold, italic, underline, which edge the
  // words line up on, and where in TSZ the size is
  let fb = 0, fi = 0, fu = 0, fa = 0, fz = DEF_Z;

  /* An ink is one of two things, and a saved mark can hold either: a HOUSE
     COLOUR, which is an index into PAL kept as a token so it re-mixes itself
     when the skin changes, or a hex somebody mixed themselves, which is meant
     to stay exactly that colour wherever it is looked at. Everything drawn
     before the picker existed holds an index, so the number is still the
     ordinary case and nothing has to be migrated. */
  const ink = c => typeof c === 'string' ? c : 'var(--' + (PAL[c] || PAL[0]) + ')';
  /* THE INK the next mark is made in is one entry in the wall's store: a hex
     off the wheel, a house token's index off the chips under it, or nothing
     yet — which is the house pink, ci, the pot the hero opened on. A pot
     mixed before there was a wheel (st.pal, one hex per swatch) is carried
     over once, so nobody's colour goes back to pink on them. */
  if (S().ink === undefined && S().pal && S().pal[ci]) store.update(st => { st.ink = st.pal[ci]; });
  const nib = () => { const v = S().ink; return typeof v === 'string' || typeof v === 'number' ? v : ci; };
  const round = n => Math.round(n * 10) / 10;
  const clamp = (lo, hi, v) => Math.max(lo, Math.min(hi, v));
  const escT = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  /* ── the five stamps, in the house style ────────────────────────────────
     Each is drawn in a 64×64 box around its own middle so it can be dropped
     at a point and scaled by one number. currentColor picks up the chosen
     ink; the outlines stay --ink-2 so a stamp reads on any paper. */
  const STAMPS = {
    hat:
      '<path d="M32 6 52 46H12z" fill="currentColor" stroke="var(--ink-2)" stroke-width="2.5" stroke-linejoin="round"/>' +
      '<rect x="8" y="43" width="48" height="9" rx="4.5" fill="currentColor" stroke="var(--ink-2)" stroke-width="2.5"/>',
    gnome:
      '<circle cx="32" cy="36" r="17" fill="var(--gn-skin)" stroke="var(--ink-2)" stroke-width="2.5"/>' +
      '<path d="M15 32a17 17 0 0 1 34 0z" fill="currentColor" stroke="var(--ink-2)" stroke-width="2.5" stroke-linejoin="round"/>' +
      '<path d="M18 42a14 18 0 0 0 28 0z" fill="var(--gn-beard)" stroke="var(--ink-2)" stroke-width="2.5" stroke-linejoin="round"/>' +
      '<circle cx="26" cy="35" r="2" fill="var(--ink-2)"/><circle cx="38" cy="35" r="2" fill="var(--ink-2)"/>',
    toadstool:
      '<rect x="27" y="34" width="10" height="22" rx="4.5" fill="var(--gn-beard)" stroke="var(--ink-2)" stroke-width="2.5"/>' +
      '<path d="M10 34a22 17 0 0 1 44 0z" fill="currentColor" stroke="var(--ink-2)" stroke-width="2.5" stroke-linejoin="round"/>' +
      '<circle cx="23" cy="26" r="3.2" fill="var(--paper)"/><circle cx="40" cy="22" r="2.6" fill="var(--paper)"/>',
    beard:
      '<path d="M14 20h36c0 24-10 34-18 34s-18-10-18-34z" fill="currentColor" stroke="var(--ink-2)" stroke-width="2.5" stroke-linejoin="round"/>' +
      '<path d="M25 20a7 6 0 0 0 14 0" fill="var(--gn-skin)" stroke="var(--ink-2)" stroke-width="2.5"/>',
    lantern:
      '<path d="M26 8h12v9H26z" fill="none" stroke="var(--ink-2)" stroke-width="2.5"/>' +
      '<rect x="18" y="17" width="28" height="34" rx="4" fill="currentColor" stroke="var(--ink-2)" stroke-width="2.5"/>' +
      '<ellipse cx="32" cy="34" rx="7" ry="10" fill="var(--amber)" stroke="var(--ink-2)" stroke-width="1.6"/>'
  };

  /* ── the stickies ───────────────────────────────────────────────────────
     Something to write on that is not the paper itself. Each one is CUT TO
     FIT: the words are measured at paint time and the pad is drawn around
     them, so a long note gets a long sticky and a short one a small square
     instead of everything being crammed into the same fixed box.

     Drawn in WORLD COORDINATES rather than inside a translated <g>, because
     dragging a piece sets style.transform on it and a CSS transform beats a
     transform ATTRIBUTE — a sticky carrying one would leap to the top-left
     corner the moment you picked it up. That is also why none of them is
     tilted: a rotation would have to go on the same attribute, and the words
     are drawn straight by whoever called this.

     The pad is --sticky-a…d and the fold is --sticky-edge, so like every
     other colour here it follows the genre skin instead of staying lemon
     when the paper goes dark. The dock's little previews call this same
     function at a small size, so a button shows exactly what it gives you.

     x,y is where the words start and their middle sits; w is how wide they
     came out; sz is the font size everything else is scaled from. h is how
     tall the block of words is — one line's worth if it is not given, which is
     what every caller wanted before notes could wrap. */
  /* ── where the words break ──────────────────────────────────────
     SVG will not wrap text for you — a <text> runs off in a straight line for
     ever — so the lines are worked out here and handed over one <tspan> each.
     The measuring is done on a canvas in the note's own face, weight and size,
     which is both exact enough to break in the right place and free of the
     layout flush that measuring in the document would cost per word.

     A face is stored as a token (var(--display) and friends) so it can change
     with the skin, and canvas wants a real family list, so the token is
     resolved first. A word longer than the whole box is left to overhang
     rather than being chopped: hyphenating somebody's URL is worse. */
  const meas = document.createElement('canvas').getContext('2d');

  /* THE ONE PLACE A NOTE'S TYPE IS DECIDED. Three things have to agree about
     it or the promise above breaks: the SVG that gets painted, the box you
     type into, and the canvas the line breaks are measured on. If the canvas
     measured a regular and the paper printed a bold, the wrapping you watched
     would not be the wrapping you got — so all three ask here.

     `b == null` is the tell for a note written before any of this existed: it
     is the ABSENCE of the flag, not its value, that means "leave this exactly
     as it was", so nothing already on the paper moves. */
  const typeOf = n => {
    const f = FONTS[n.f] || FONTS[0];
    return { fam: f.f, sz: n.sz || 22,
             wt: n.b == null ? f.w : (n.b ? f.b : f.r),
             ital: !!n.i, under: !!n.u, al: n.a || 0 };
  };

  const face = v => {
    const m = /^var\((--[\w-]+)\)$/.exec(String(v).trim());
    return m ? getComputedStyle(document.documentElement).getPropertyValue(m[1]).trim() || 'sans-serif' : v;
  };

  function wrapText(t, ty, w) {
    const paras = String(t).split('\n');
    if (!w) return paras;                // notes from before boxes had a width
    meas.font = (ty.ital ? 'italic ' : '') + ty.wt + ' ' + ty.sz + 'px ' + face(ty.fam);
    const out = [];
    paras.forEach(para => {
      const words = para.split(/\s+/).filter(Boolean);
      if (!words.length) { out.push(''); return; }
      let line = words[0];
      for (let i = 1; i < words.length; i++) {
        const next = line + ' ' + words[i];
        if (meas.measureText(next).width <= w) line = next;
        else { out.push(line); line = words[i]; }
      }
      out.push(line);
    });
    return out;
  }

  const D = (...a) => a.map(v => typeof v === 'number' ? round(v) : v).join(' ');

  function stickyArt(k, x, y, w, sz, h) {
    if (!k) return '';                     // 'None' — the words on bare paper
    const u = sz / 22;                     // it is all drawn at 22 and scaled
    const px = 13 * u, py = 10 * u;        // how much pad there is around the words
    const hh = (h || sz * 1.1) / 2 + py;
    const x0 = x - px, x1 = x + w + px, t = y - hh, b = y + hh;
    const ew = round(1.7 * u);
    // the curl at the bottom-right, kept in proportion so a one-word sticky
    // does not turn out to be mostly fold
    const f = round(Math.min(15 * u, (b - t) * 0.4, (x1 - x0) * 0.3));
    const c = pad(k);

    // the body, with that corner cut away — and a shadow of the same shape
    // under it, which is what makes it read as a square of paper lying ON the
    // bench rather than a rectangle printed into it
    const face = D('M', x0, t, 'H', x1, 'V', b - f, 'L', x1 - f, b, 'H', x0, 'Z');
    const off = round(2 * u);
    return '<path d="' + D('M', x0 + off, t + off, 'H', x1 + off, 'V', b - f + off,
                           'L', x1 - f + off, b + off, 'H', x0 + off, 'Z') +
        '" fill="var(--ink-2)" opacity=".16"/>' +
      '<path d="' + face + '" fill="' + c + '" stroke="var(--ink-2)" stroke-width="' + ew +
        '" stroke-linejoin="round"/>' +
      // the glue, along the top, where it is on the real thing
      '<path d="' + D('M', x0, t, 'H', x1, 'V', t + 5.5 * u, 'H', x0, 'Z') +
        '" fill="var(--sticky-edge)" opacity=".55"/>' +
      // and the fold itself: the cut corner, turned over on the diagonal, so
      // you are looking at the back of that triangle
      '<path d="' + D('M', x1, b - f, 'L', x1 - f, b, 'L', x1 - f, b - f, 'Z') +
        '" fill="var(--sticky-edge)" stroke="var(--ink-2)" stroke-width="' + round(1.2 * u) +
        '" stroke-linejoin="round"/>';
  }

  /* ── the layer ──────────────────────────────────────────────────────────── */
  const svg = document.createElementNS(SVGNS, 'svg');
  svg.setAttribute('class', 'wall-ink');
  svg.setAttribute('aria-hidden', 'true');
  world.insertBefore(svg, world.firstChild);      // under the gizmos, on the paper

  const el = (n, a) => { const e = document.createElementNS(SVGNS, n);
    for (const k in a) e.setAttribute(k, a[k]); return e; };

  /* ── how far the ink reaches ──────────────────────────────────────
     The layer is the size of the world, and the world used to be a sheet with
     a visible edge — so ink stopping at that edge made sense. The paper has no
     edge any more, and an invisible one you cannot draw past would be worse
     than the box we took away. So the layer carries a transparent square far
     bigger than the world: it is PAINTED, which is what makes it answer a
     pointer, and the svg is overflow:visible, which is what lets it be
     rendered outside its own box. Drawing therefore works wherever you can
     pan to. It is not a .wall-item, so in move mode it goes as inert as the
     rest of the layer and clicks fall through to the paper underneath. */
  const REACH = 20000;
  const reach = el('rect', { x: -REACH, y: -REACH, width: REACH * 2, height: REACH * 2,
                             fill: 'transparent' });

  function paint() {
    svg.textContent = '';
    svg.appendChild(reach);              // re-hung after every wipe
    const written = [];                  // the notes on parchment, measured below
    S().items.forEach((it, i) => {
      if (!it) return;                     // the delete tool nulls a slot rather
      if (editing && i === editing.i) return;   // than splicing it, so indices held
      let node;                                  // by anything else stay true
      if (it.k === 's') {
        node = el('path', { d: it.d, fill: 'none', stroke: ink(it.c),
          'stroke-width': PW[it.w] || PW[0], 'stroke-linecap': 'round', 'stroke-linejoin': 'round' });
      } else if (it.k === 'p') {
        // one path, one subpath per cell, and no anti-aliasing to furr the
        // seams where two of them meet
        node = el('path', { d: it.d, fill: ink(it.c), stroke: 'none', 'shape-rendering': 'crispEdges' });
      } else if (it.k === 'k') {
        node = el('g', { transform: 'translate(' + (it.x - 32 * it.z) + ',' + (it.y - 32 * it.z) + ') scale(' + it.z + ')',
          color: ink(it.c), opacity: PO[it.o] == null ? 1 : PO[it.o] });
        node.innerHTML = STAMPS[SK[it.s]] || STAMPS.hat;
      } else if (it.k === 'i') {
        /* a filed tracing, stamped: its own paths, scaled so the long edge is
           it.z world px and centred on the press. The artwork lives in the
           library (tracer.js) and is looked up by name — a tracing taken
           out of the library takes its stamps off the paper with it. */
        const f = window.Tracer && Tracer.get(it.f);
        if (!f) return;
        const s = it.z / Math.max(f.w, f.h, 1);
        node = el('g', { transform: 'translate(' + round(it.x - f.w * s / 2) + ',' + round(it.y - f.h * s / 2) + ') scale(' + s + ')',
          opacity: PO[it.o] == null ? 1 : PO[it.o] });
        node.innerHTML = f.d;
      } else if (it.k === 'd') {
        /* a sticker out of the drawer, stamped: the same geometry a tracing
           gets — long edge it.z world px, centred on the press — painted from
           the catalogue (stickers.js) rather than from the library. A sticker
           the catalogue has not got paints NOTHING and does not throw: a kit
           that has not been filed in yet is the ordinary case, and
           Stickers.load() repaints the wall when one lands. */
        const st = window.Stickers && Stickers.get(it.f);
        if (!st) return;
        const sc = it.z / Math.max(st.w, st.h, 1);
        node = el('g', { transform: 'translate(' + round(it.x - st.w * sc / 2) + ',' + round(it.y - st.h * sc / 2) + ') scale(' + sc + ')',
          opacity: PO[it.o] == null ? 1 : PO[it.o] });
        node.innerHTML = st.d;
      } else if (it.k === 'g') {
        /* a gif off KLIPY, pinned: scaled the same way a tracing is, so the
           long edge is it.z world px and it sits centred on the press — but
           it is an <image> pointed at KLIPY's own url rather than a <g> of
           paths, because there is no artwork to keep, only a link to it
           (see gif.js). Whatever it is linked to plays itself; an svg
           <image> animates a gif exactly the way an <img> would. */
        const s = it.z / Math.max(it.w, it.h, 1);
        node = el('image', { x: round(it.x - it.w * s / 2), y: round(it.y - it.h * s / 2),
          width: round(it.w * s), height: round(it.h * s), href: it.u,
          opacity: PO[it.o] == null ? 1 : PO[it.o] });
      } else if (it.k === 't') {
        const ty = typeOf(it), sz = ty.sz, lh = sz * LH;
        const lines = wrapText(it.t, ty, it.w || 0);
        /* ALIGNMENT HAPPENS INSIDE THE BOX. The note's width is the box: left
           pins the words to its left edge, right to its right, centred to the
           middle of it — which is why reshaping by the tab slides centred words
           and leaves left ones where they are, exactly as a paragraph does. A
           note with no width has no box to align against, so bw is 0 and all
           three land in the same place. SVG does the pinning itself, given the
           anchor and the edge to anchor to. */
        const bw = it.w || 0;
        const ax = it.x + (ty.al === 1 ? bw / 2 : ty.al === 2 ? bw : 0);
        const words = el('text', { x: ax, y: it.y, fill: ink(it.c),
          'font-family': ty.fam, 'font-weight': ty.wt, 'font-size': sz,
          'text-anchor': ALIGN[ty.al], 'dominant-baseline': 'middle' });
        if (ty.ital) words.setAttribute('font-style', 'italic');
        if (ty.under) words.setAttribute('text-decoration', 'underline');
        // x,y stays the middle of the whole block, so a one-line note sits
        // exactly where it always did and a longer one grows about its centre
        const top = it.y - (lines.length - 1) * lh / 2;
        lines.forEach((ln, li) => {
          const ts = el('tspan', { x: ax, y: round(top + li * lh) });
          ts.textContent = ln;
          words.appendChild(ts);
        });
        // every note is a <g> — it has a grip to carry, and the parchment (if
        // any) goes in front of the words once they have been measured
        node = el('g', {});
        node.appendChild(words);
        written.push({ g: node, words, it, k: (STICKIES[it.sc] || STICKIES[0]).k,
                       n: lines.length, lh, sz, al: ty.al });
      }
      if (!node) return;
      node.setAttribute('data-i', i);
      node.setAttribute('class', 'wall-item');
      svg.appendChild(node);
    });

    // A sticky is cut to fit its note, so it cannot be drawn until the words
    // are in the document and can be measured. Read every width first, then
    // write every sticky — one layout pass for the lot instead of one each.
    // A wrapped note is as wide as its longest line, never wider than the box.
    written.forEach(n => {
      let w = 0;
      n.words.childNodes.forEach(ts => { w = Math.max(w, ts.getComputedTextLength()); });
      n.w = n.it.w ? Math.min(w, n.it.w) : w;
      n.h = n.n * n.lh;
      // the pad is cut to the WORDS, and the words sit wherever the alignment
      // put them inside the box — so the sticky slides across with them rather
      // than staying pinned to the left of a box it no longer fills
      const bw = n.it.w || n.w;
      n.x = n.it.x + (n.al === 1 ? (bw - n.w) / 2 : n.al === 2 ? bw - n.w : 0);
    });
    written.forEach(n => {
      if (n.k) {
        const art = el('g', { class: 'wall-sticky' });
        art.innerHTML = stickyArt(n.k, n.x, n.it.y, n.w, n.sz, n.h);
        n.g.insertBefore(art, n.words);  // the pad first, words on top of it
      }
      // the tab you reshape it by: only ever hit-testable in move mode, and
      // sat against the box's own right edge rather than the words', so it
      // does not walk in and out as the last line changes length
      const bw = n.it.w || n.w, gy = n.it.y - Math.min(n.h, 34) / 2;
      const grip = el('rect', { class: 'wall-grip', 'data-i': n.g.getAttribute('data-i'),
        x: round(n.it.x + bw + 4), y: round(gy), width: 7, height: round(Math.min(n.h, 34)),
        rx: 3.5 });
      n.g.appendChild(grip);
    });
  }

  /* ── drawing ────────────────────────────────────────────────────────────── */
  let live = null;                      // the stroke being drawn right now

  const W = (cx, cy) => Lab.toWorld(cx, cy);

  function pathOf(pts) {
    if (pts.length < 2) {               // a tap is a dot, so a click still marks
      const p = pts[0];
      return 'M' + round(p.x) + ' ' + round(p.y) + 'l0.01 0';
    }
    return 'M' + pts.map(p => round(p.x) + ' ' + round(p.y)).join('L');
  }

  /* ── ONE UNDO, TWO STACKS ─────────────────────────────────────────
     Ink — a stroke, a sticker, a tracing stamped down, a gif pinned — is one
     list, this file's own `store().items`, and `made` is its note of when
     each piece went on, in the order they were made.

     THE OTHER STACK IS LAB.JS'S, and it holds where everything on the bench
     WAS — the features, the caution tape, and the things this file puts on
     the paper, all three of them, because moving a thing is the same kind of
     event whoever owns it. Moving a sticker files itself over there (see the
     end of moveEnd) while drawing one files itself here, which is the whole
     of the split: this list is what was MADE, that one is where things ARE.

     BOTH SIDES STAMP OFF ONE COUNTER, Lab.stamp(), so which of the two
     happened last is a comparison and not a guess. This file owns the button,
     so this file does the comparing; lab.js's ctrl+z asks it.

     IT IS CHRONOLOGICAL AND NOT A PRIORITY. Draw a line over a card you have
     just moved and the LINE goes first, because that is the order the two
     happened in, and an undo that reaches past the last thing you did for a
     thing it likes better is not an undo.

     It is not saved. After a reload undo pops ink, exactly as it always did —
     which is the right amount of memory for a button whose whole promise is
     "the thing you just did". */
  const made = [];
  const stamp = () => (window.Lab && Lab.stamp ? Lab.stamp() : 0);
  const mark = k => { made.push({ k, at: stamp() }); };

  function undo() {
    const top = made.length ? made[made.length - 1].at : 0;
    if (window.Lab && Lab.undoTop && Lab.undoTop() > top) return Lab.undoMove();
    if (made.length) made.pop();
    store.update(st => { st.items.pop(); });
    return true;
  }

  /* a filed tracing onto the paper at a world point, at the size and fade
     the options row says — the click above does this, and so does a
     tracing DRAGGED out of the library (tracer.js), which lands where it
     is let go */
  function stampAt(f, wx, wy) {
    if (!f) return false;
    add({ k: 'i', f: f.id, o: po, x: round(wx), y: round(wy), z: IMG[iz] });
    return true;
  }

  /* THE SAME DOOR FOR A STICKER, and it needed one for the reason the gif
     below needed one: a sticker arrives two ways — pressed onto the paper
     with one on the pointer, or dragged out of the drawer and let go where
     you want it — and both are this one write, so both land at the size and
     fade the options row says and both undo alike.

     It takes stickers.js's record — { id, name, kit, w, h, d } — and not an
     item, so the caller never has to know what an item looks like or which
     of IMG and PO the row is on. Only the ID is written down: the drawing
     stays in the catalogue, which is what lets a kit be re-loaded without
     every stamp of it going stale. */
  function stickerAt(s, wx, wy) {
    if (!s || !s.id) return false;
    add({ k: 'd', f: s.id, o: po, x: round(wx), y: round(wy), z: IMG[iz] });
    return true;
  }

  /* THE SAME DOOR FOR A GIF, and it needed one for the same reason the
     tracing did: a strip can arrive three ways now — pressed onto the paper
     with one on the pointer (below), DRAGGED out of the row and let go where
     you want it, or clicked in the row, which puts it in the middle of what
     you are looking at. All three are this one write, so all three land at
     the size and fade the options row says and all three undo alike.

     It takes gif.js's armed record — { url, w, h } — and not an item, so the
     caller never has to know what an item looks like or which of IMG and PO
     the row is on. (2026-09-04) */
  function gifAt(g, wx, wy) {
    if (!g || !g.url) return false;
    add({ k: 'g', u: g.url, w: g.w || 200, h: g.h || 200,
          o: po, x: round(wx), y: round(wy), z: IMG[iz] });
    return true;
  }

  /* A PUSH AND NOTHING ELSE. This used to trim the front of the list past
     MAX pieces, which is the bug the note up by the constants is about
     (THERE IS NO CAP ON THE PILE ANY MORE): nothing here drops a piece,
     ever, and nothing here moves one. */
  function add(item) {
    mark('ink');
    store.update(st => { st.items.push(item); });
  }

  svg.addEventListener('pointerdown', e => {
    if (tool === 'move' || document.body.classList.contains('lab-hand')) return;
    if (e.button != null && e.button !== 0) return;
    const p = W(e.clientX, e.clientY);

    if (tool === 'draw') {
      const g = PIX[pi];
      live = g
        ? { g: g, seen: new Set(), d: '', last: p, id: e.pointerId,
            node: el('path', { fill: ink(nib()), stroke: 'none', 'shape-rendering': 'crispEdges' }) }
        : { pts: [p], id: e.pointerId,
            node: el('path', { fill: 'none', stroke: ink(nib()), 'stroke-width': PW[pw],
                               'stroke-linecap': 'round', 'stroke-linejoin': 'round' }) };
      svg.appendChild(live.node);
      if (g) fillCell(p);                // a tap is one square, the way it is one dot
      window.addEventListener('pointermove', drawMove, true);
      window.addEventListener('pointerup', drawEnd, true);
      window.addEventListener('pointercancel', drawEnd, true);
    } else if (tool === 'upload') {
      // a filed tracing on the pointer is stamped where you pressed, at the
      // size the row says; nothing on the pointer asks the table for one
      const f = window.Tracer && Tracer.armed();
      if (f) stampAt(f, p.x, p.y);
      else if (window.Tracer) Tracer.nudge();
    } else if (tool === 'sticker') {
      // …and a sticker out of the drawer, the same press, the same two
      // numbers, and the same drawer asked to say why when there is none
      const s = window.Stickers && Stickers.armed();
      if (s) stickerAt(s, p.x, p.y);
      else if (window.Stickers) Stickers.nudge();
    } else if (tool === 'text') {
      /* A press on a note that is already up goes BACK INTO IT rather than
         starting a new one on top of it — which is also what makes the double
         click people reach for work: the first press opens the box, the second
         lands inside it and drops the caret where it was aimed. */
      const i = noteUnder(e.clientX, e.clientY);
      if (i >= 0) editNote(i); else askNote(p);
    } else if (tool === 'gif') {
      /* a gif on the pointer is stamped where you pressed, at the size and
         fade the row says, the same as a tracing; nothing on the pointer
         asks the row to say why.

         `armed` IS A GETTER AND NOT A METHOD, which Tracer's is — this line
         was written from that one and read `Gif.armed()`, so every press of
         the paper with the gif tool up threw "Gif.armed is not a function"
         and no gif was ever put up by any route. (2026-09-04) */
      const g = window.Gif && Gif.armed;
      if (g) gifAt(g, p.x, p.y);
      else if (window.Gif) Gif.nudge();
    }
    e.preventDefault();
    e.stopPropagation();
  });

  /* ── squared off ──────────────────────────────────────────────
     In pixel mode a stroke is not a line but a set of cells: the pointer is
     floored to the grid and that square is added to one path, each cell only
     once however many times it is crossed. The cell is written without a
     space inside it — 'M12 40h20v20h-20z' — because move's shift() nudges
     every 'number space number' it can find, and only the corner should move.

     The grid is the bench's own (lab.js keeps world 0,0 as its origin), so a
     cell size that divides or multiplies its 20 lands on the lines you can
     see rather than near them. */
  function fillCell(p) {
    const g = live.g;
    const x = Math.floor(p.x / g) * g, y = Math.floor(p.y / g) * g;
    const k = x + ',' + y;
    if (live.seen.has(k)) return;
    live.seen.add(k);
    live.d += 'M' + x + ' ' + y + 'h' + g + 'v' + g + 'h-' + g + 'z';
    live.node.setAttribute('d', live.d);
  }

  // a fast drag reports a few points a long way apart, so walk the gap and
  // light every cell it crossed — otherwise a quick line comes out dotted
  function trail(a, b) {
    const far = Math.hypot(b.x - a.x, b.y - a.y);
    const n = Math.min(400, Math.ceil(far / (live.g / 2)) || 1);
    for (let i = 1; i <= n; i++)
      fillCell({ x: a.x + (b.x - a.x) * i / n, y: a.y + (b.y - a.y) * i / n });
  }

  function drawMove(e) {
    if (!live || e.pointerId !== live.id) return;
    const p = W(e.clientX, e.clientY);
    if (live.g) { trail(live.last, p); live.last = p; e.preventDefault(); return; }
    const last = live.pts[live.pts.length - 1];
    if (Math.hypot(p.x - last.x, p.y - last.y) < 1.5 / Lab.zoom) return;   // thin it out
    live.pts.push(p);
    live.node.setAttribute('d', pathOf(live.pts));
    e.preventDefault();
  }

  function drawEnd(e) {
    if (!live || (e && e.pointerId !== live.id)) return;
    window.removeEventListener('pointermove', drawMove, true);
    window.removeEventListener('pointerup', drawEnd, true);
    window.removeEventListener('pointercancel', drawEnd, true);
    const g = live.g, d = live.d, pts = live.pts;
    live.node.remove();
    live = null;
    if (g) { if (d) add({ k: 'p', c: nib(), g: g, d: d }); return; }
    add({ k: 's', c: nib(), w: pw, d: pathOf(pts) });
  }

  /* ── a note ───────────────────────────────────────────────────────────────
     You write into a box the width the note will be, in the face and size it
     will be, growing downwards as the words wrap — so there is no moment where
     what you typed rearranges itself into something else. The tab on the right
     edge sets that width, and it is remembered for the next note the way the
     other tool settings are: a mood, not a document.

     ENTER pins it, SHIFT+ENTER breaks the line by hand, ESCAPE throws it away.
     Losing focus pins it too, which is why the grip has to preventDefault on
     the way down — taking the caret out of the box would file the note in the
     middle of reshaping it.

     AND A PINNED NOTE GOES BACK INTO THE BOX. Double click one with the move
     tool, or press it with the text tool, and you are writing it again: the
     same words at the same width, and the dock loaded with the note's OWN type
     case, because a formatting bar describing the last thing you did rather
     than the thing under the caret is worse than no bar at all. The painted
     copy steps aside while the box is up, so a note is never on the paper and
     in the box at once. */
  let noteBox = null, noteIn = null;
  let noteAt = null;                     // where the box was put, which is where it pins
  /* The note being gone back into — which one, the tool it was opened from,
     its words and the ink it already had — or null while a NEW note is being
     written, which is what every 'is this an edit' test below reads. */
  let editing = null;
  /* True only for the instant one box replaces another: pinning the old one
     must not hand the tool back when a new one is going up in its place. */
  let opening = false;
  /* The ink a note is written in: its own while it is being edited, so going
     back into an old note does not silently repaint it, and the dock's the
     moment a pot is pressed — which is what clears the override. */
  const curInk = () => editing && editing.c != null ? editing.c : nib();

  function askNote(p, ed) {
    // whatever was open is FILED, not thrown away: clicking off a note has
    // always pinned it, and clicking onto another one is still clicking off
    opening = true; pinNote(); opening = false;
    noteAt = p;
    editing = ed || null;
    if (editing) paint();                // the painted copy steps aside

    noteBox = document.createElement('div');
    noteBox.className = 'wall-note';
    noteBox.style.left = p.x + 'px';
    noteBox.style.top = p.y + 'px';

    noteIn = document.createElement('textarea');
    noteIn.className = 'wall-note-in';
    noteIn.rows = 1;
    noteIn.maxLength = 400;
    noteIn.placeholder = 'say something…';
    noteIn.style.width = round(nw) + 'px';
    if (editing) noteIn.value = editing.t;

    const grip = document.createElement('button');
    grip.type = 'button';
    grip.className = 'wall-note-grip';
    grip.setAttribute('aria-label', 'how wide the note is');
    grip.tabIndex = -1;

    const hint = document.createElement('p');
    hint.className = 'wall-note-hint';
    hint.textContent = 'enter to pin it · shift+enter for a new line · ctrl b/i/u · ctrl [ ] for size';

    noteBox.append(noteIn, grip, hint);
    world.appendChild(noteBox);
    styleNote();
    buildOpts();                         // the type case comes up WITH the box
    noteIn.focus();
    // going back into a note puts the caret after the last word rather than
    // over all of them: coming back to add something is the ordinary case
    if (editing) noteIn.setSelectionRange(noteIn.value.length, noteIn.value.length);

    noteIn.addEventListener('input', grow);
    noteIn.addEventListener('keydown', ev => {
      /* The word-processor keys. Only the ones a browser will actually let a
         page have: ctrl B / I / U are free inside an editable box, and ctrl [
         and ] step the size. Word's ctrl L / E / R are deliberately NOT here —
         ctrl L is the address bar and ctrl R is a reload, and neither is ours
         to take. The three alignment buttons on the dock are the way in. */
      const meta = ev.ctrlKey || ev.metaKey, k = ev.key.toLowerCase();
      if (meta && (k === 'b' || k === 'i' || k === 'u')) {
        if (k === 'b') fb = fb ? 0 : 1; else if (k === 'i') fi = fi ? 0 : 1; else fu = fu ? 0 : 1;
        buildOpts(); styleNote(); ev.preventDefault(); ev.stopPropagation(); return;
      }
      if (meta && (k === '[' || k === ']')) {
        stepSize(k === ']' ? 1 : -1); ev.preventDefault(); ev.stopPropagation(); return;
      }
      if (ev.key === 'Enter' && !ev.shiftKey) { commitNote(); ev.preventDefault(); }
      else if (ev.key === 'Escape') { shutNote(); ev.preventDefault(); }
      ev.stopPropagation();                       // lab's own keys stay out of it
    });
    noteIn.addEventListener('blur', () => commitNote());

    /* A PRESS ON THE BOX'S OWN CHROME MUST NOT FILE THE NOTE. Its padding, its
       border and the hint under it are all part of the thing you are writing
       in, but none of them is the textarea — so a press there would move focus
       to the page, and losing focus is what pins a note. Same fix as the
       options row: swallow the pointerdown and put the caret back. It is also
       what lets a double click land anywhere on a note that has just opened
       under it. The grip stops its own press before this ever sees it. */
    noteBox.addEventListener('pointerdown', ev => {
      if (ev.target === noteIn) return;
      ev.preventDefault();
      noteIn.focus();
    });

    grip.addEventListener('pointerdown', ev => {
      ev.preventDefault(); ev.stopPropagation();
      const x0 = ev.clientX, w0 = nw;
      const move = m => {
        nw = clamp(NW[0], NW[1], w0 + (m.clientX - x0) / Lab.zoom);
        noteIn.style.width = round(nw) + 'px';
        grow();
      };
      const up = () => {
        window.removeEventListener('pointermove', move, true);
        window.removeEventListener('pointerup', up, true);
        if (noteIn) noteIn.focus();
      };
      window.addEventListener('pointermove', move, true);
      window.addEventListener('pointerup', up, true);
    });
  }

  const pinNote = () => { if (noteBox) commitNote(); };

  /* ── going back into a note ──────────────────────────────────────
     The type case is loaded from the NOTE, not left as whatever was last used,
     so the row you are handed describes the words under the caret. A note from
     before the type case existed carries a single weight and none of the
     flags: it is matched to whichever of its face's two weights is nearer, so
     it comes back looking like it looked rather than dropping to regular. */
  function editNote(i) {
    const it = S().items[i];
    if (!it || it.k !== 't') return;     // strokes and stamps have nothing to say
    const from = tool;
    if (tool !== 'text') { pinNote(); setTool('text'); }   // editing type IS the text tool

    fo = FONTS[it.f] ? it.f : 0;
    const ff = FONTS[fo], z = TSZ.indexOf(it.sz || 22);
    fz = z < 0 ? DEF_Z : z;
    fb = it.b == null ? (Math.abs(ff.b - ff.w) <= Math.abs(ff.r - ff.w) ? 1 : 0) : (it.b ? 1 : 0);
    fi = it.i ? 1 : 0; fu = it.u ? 1 : 0; fa = it.a || 0;
    if (it.w) nw = clamp(NW[0], NW[1], it.w);
    // …and the swatch shows the note's own ink once the box is up: styleNote paints it

    // the box goes exactly where the words are: x is ten inside its left edge,
    // y is the middle of the block, which is what the box is centred on
    askNote({ x: it.x - 10, y: it.y }, { i: i, from: from, t: it.t, c: it.c });
  }

  /* WHICH NOTE, IF ANY, IS UNDER THE POINTER. In move mode the pieces answer
     the pointer themselves, but with a tool up the whole layer takes it and
     the pieces go inert — so the text tool has to ask the paint where the
     notes came out. Read backwards, because the last one drawn is the one on
     top, and given a couple of pixels of slack so a press at the edge of a
     letter still counts as a press on the words. */
  function noteUnder(cx, cy) {
    const ns = svg.querySelectorAll('.wall-item');
    for (let j = ns.length - 1; j >= 0; j--) {
      const i = +ns[j].dataset.i, it = S().items[i];
      if (!it || it.k !== 't') continue;
      const r = ns[j].getBoundingClientRect();
      if (cx >= r.left - 4 && cx <= r.right + 4 && cy >= r.top - 4 && cy <= r.bottom + 4) return i;
    }
    return -1;
  }

  /* EVERYTHING THE DOCK SAYS ABOUT TYPE, PUT ON THE BOX. Called when the box
     goes up and again on every press of a type button, so the words under the
     caret change as you press them — which is the whole point of a formatting
     bar. It is also what keeps the promise the wrapping makes: the box is the
     face, weight, slant and size the paper is about to be given, at the width
     it is about to be given, so the breaks you watch are the breaks you get. */
  function styleNote() {
    paintInk();                          // the swatch shows the note's ink while the caret is in it
    if (!noteIn) return;
    const f = FONTS[fo];
    noteIn.style.fontFamily = f.f;
    noteIn.style.fontWeight = fb ? f.b : f.r;
    noteIn.style.fontStyle = fi ? 'italic' : 'normal';
    noteIn.style.textDecoration = fu ? 'underline' : 'none';
    noteIn.style.fontSize = TSZ[fz] + 'px';
    noteIn.style.textAlign = CSS_AL[fa];
    noteIn.style.color = ink(curInk());
    grow();
  }

  function stepSize(d) {
    const z = clamp(0, TSZ.length - 1, fz + d);
    if (z === fz) return;
    fz = z; buildOpts(); styleNote();
  }

  // a textarea will not size itself, so it is measured and told
  function grow() {
    if (!noteIn) return;
    noteIn.style.height = 'auto';
    noteIn.style.height = noteIn.scrollHeight + 'px';
  }

  /* A NEW note is added to the end of the list. One being gone back into is
     written back OVER ITSELF, so it keeps its index — which is its place in
     the stack, and what move and undo know it by — along with the x and y it
     was pinned at. Emptying one and pinning that takes it off the wall, which
     is the only way to delete a note this has ever needed. */
  function commitNote() {
    if (!noteBox) return;
    const t = noteIn.value.replace(/[ \t]+$/gm, '').trim();
    const ed = editing, p = noteAt, c = curInk();
    shutNote();
    if (ed) {
      store.update(st => {
        if (!st.items[ed.i]) return;     // taken off the wall while it was open
        /* NULLED, NOT SPLICED, the same as a delete and for the same reason
           (see deleting what is already there): a splice here renamed every
           piece after this one, and a move in flight, a note being resized
           and the undo stack all went on using the old names. The slot is
           squeezed out at the next boot. (2026-09-11) */
        if (!t) { st.items[ed.i] = null; return; }
        Object.assign(st.items[ed.i], { c: c, f: fo, t: t, sz: TSZ[fz],
          w: round(nw), b: fb, i: fi, u: fu, a: fa });
      });
      return;
    }
    // +10 is the box's border and padding: the words go where they looked like
    // they were, not ten pixels to the left of it
    // b/i/u/a are written even when they are 0: a note that carries the keys
    // is a note from after the type case existed, and typeOf reads the absence
    // of `b` as "this one predates all of it, leave it alone"
    if (t) add({ k: 't', c: c, f: fo, x: round(p.x + 10), y: round(p.y), t,
                 sz: TSZ[fz], w: round(nw), b: fb, i: fi, u: fu, a: fa });
  }
  // let go of the reference BEFORE pulling the box out of the page: removing a
  // focused element fires blur synchronously, and blur is what commits a note,
  // so doing it the other way round makes escape behave exactly like enter
  function shutNote() {
    const n = noteBox, ed = editing;
    noteBox = null; noteIn = null; editing = null;
    paintInk();                          // …and back to the nib when the caret leaves
    if (!n) return;
    n.remove();
    if (ed) paint();                     // the note is back on the paper either way
    buildOpts();                         // …and the type case folds away with it
    // and so is the tool it was opened from — unless another box is going up in
    // its place, in which case handing back the move tool mid-swap is nonsense
    if (ed && !opening && ed.from !== tool) setTool(ed.from);
  }

  /* ── moving what is already there ───────────────────────────────────────── */
  let held = null;
  svg.addEventListener('pointerdown', e => {
    if (tool !== 'move' || document.body.classList.contains('lab-hand')) return;
    const gr = e.target.closest('.wall-grip');
    if (gr) { startSize(gr, e); return; }
    const t = e.target.closest('.wall-item');
    if (!t) return;
    const i = +t.dataset.i;
    const it = S().items[i];
    if (!it) return;
    const p = W(e.clientX, e.clientY);
    held = { i, id: e.pointerId, node: t, ox: 0, oy: 0, px: p.x, py: p.y };
    t.classList.add('wall-held');
    window.addEventListener('pointermove', moveMove, true);
    window.addEventListener('pointerup', moveEnd, true);
    window.addEventListener('pointercancel', moveEnd, true);
    e.preventDefault();
    e.stopPropagation();
  }, true);

  /* Two presses on a note is the way back into it, and the pieces answer the
     pointer themselves in move mode — so this needs no hit test of its own.
     The presses either side of it are a drag that went nowhere, which the move
     handler files as nothing at all. */
  svg.addEventListener('dblclick', e => {
    if (tool !== 'move' || document.body.classList.contains('lab-hand')) return;
    const t = e.target.closest('.wall-item');
    if (!t) return;
    editNote(+t.dataset.i);              // …which minds its own business unless it is a note
    e.preventDefault();
    e.stopPropagation();
  });

  function moveMove(e) {
    if (!held || e.pointerId !== held.id) return;
    const p = W(e.clientX, e.clientY);
    held.ox = p.x - held.px; held.oy = p.y - held.py;
    held.node.setAttribute('transform-origin', '0 0');
    held.node.style.transform = 'translate(' + held.ox + 'px,' + held.oy + 'px)';
    e.preventDefault();
  }

  function moveEnd(e) {
    if (!held || (e && e.pointerId !== held.id)) return;
    window.removeEventListener('pointermove', moveMove, true);
    window.removeEventListener('pointerup', moveEnd, true);
    window.removeEventListener('pointercancel', moveEnd, true);
    const { i, ox, oy } = held;
    held.node.classList.remove('wall-held');
    held.node.style.transform = '';
    held = null;
    if (!ox && !oy) return;
    /* WHERE IT WAS, taken whole rather than as an offset to undo by. A piece
       moves three different ways depending on what it is — a stroke and a
       square of pixel art carry their position INSIDE the path data, and the
       pixels snap to their own grid on the way — so 'back the way it came' is
       three inverses to get right and one copy to keep. The copy is what goes
       to Lab.remember, which stamps it onto the same stack as the features
       and the tape; see AND WHAT CAN BE TAKEN BACK over there.

       The index is safe to close over. Undo is chronological, so anything
       added after this has already come off by the time this entry is
       reached — and if 'clear' has been through in the meantime there is
       nothing at i and the closure does nothing, which is what that dialog
       promised. */
    const was = JSON.parse(JSON.stringify(S().items[i] || null));
    store.update(st => {
      const it = st.items[i];
      if (!it) return;
      // pixel art that has been nudged half a cell is no longer pixel art,
      // so a squared-off piece moves by whole cells or not at all
      if (it.k === 'p') it.d = shift(it.d, Math.round(ox / it.g) * it.g, Math.round(oy / it.g) * it.g);
      else if (it.k === 's') it.d = shift(it.d, ox, oy);
      else { it.x = round(it.x + ox); it.y = round(it.y + oy); }
    });
    if (was && window.Lab && Lab.remember) {
      Lab.remember(() => store.update(st => { if (st.items[i]) st.items[i] = was; }));
    }
  }

  /* ── deleting what is already there ─────────────────────────────────────
     The other half of the delete tool — a mark on the wall, this time, not a
     pasted feature (see lab.js's deleteCopy for that half). Sits at the same
     door as moveEnd: filed through Lab.remember, so it costs one ctrl+z the
     same way a mis-drag does, and NULLED rather than spliced OUT — every
     other closure in this file that has ever captured an index (a move in
     flight, a note being resized, a note being edited) is trusted to still
     point at the right thing afterwards, which a splice would not promise.
     paint() already knows to skip a null slot; nothing else needs to. */
  function deleteItem(i) {
    const was = JSON.parse(JSON.stringify(S().items[i] || null));
    if (!was) return false;
    store.update(st => { st.items[i] = null; });
    if (window.Lab && Lab.remember) {
      Lab.remember(() => store.update(st => { if (!st.items[i]) st.items[i] = was; }));
    }
    return true;
  }

  svg.addEventListener('pointerdown', e => {
    if (tool !== 'delete' || document.body.classList.contains('lab-hand')) return;
    const t = e.target.closest('.wall-item');
    if (!t) return;
    deleteItem(+t.dataset.i);
    e.preventDefault();
    e.stopPropagation();
  }, true);

  /* AND A PASTED COPY, THE OTHER THING LOOSE ON THE PAPER a click here can
     reach. Gizmos are not wall.js's — dragging, waking, the corner, all of
     it belongs to lab.js and frames.js — so this does not hit-test for one;
     it only has to know when a click landed on one. frames.js's own click
     handler already steps aside for ANY tool but move (see its `drawing()`
     guard) WITHOUT stopping propagation — it simply returns — so the click
     is still on its way to bubbling up here, and there is nothing to get in
     front of: bubble phase is enough, no capture, no stopPropagation. Lab.
     isCopy is asked again rather than trusted from the hover: a hover and a
     click are not the same moment, and the tool or the paper under the
     pointer could have changed in between. */
  document.addEventListener('click', e => {
    if (tool !== 'delete') return;
    const g = e.target.closest('.gz');
    if (g && window.Lab && Lab.isCopy && Lab.isCopy(g)) Lab.deleteCopy(g);
  });

  /* ── reshaping a note ────────────────────────────────────────────
     The grip sets the box's width and the words re-wrap under the finger. The
     item is edited where it sits and the layer repainted, rather than being
     put through the store on every frame: a store write is a JSON round-trip
     of the whole wall and a trip to localStorage, which is not a thing to do
     sixty times a second. The store is told once, on let go — the width is
     already in the object by then, so that call is purely the save.

     A note written before boxes had a width has none to start from, so the
     first drag picks up where the grip was drawn instead. */
  let sizing = null, sizeRaf = 0;

  function startSize(gr, e) {
    const it = S().items[+gr.dataset.i];
    if (!it || it.k !== 't') return;
    sizing = { it, x0: W(e.clientX, e.clientY).x, w0: +gr.getAttribute('x') - it.x - 4 };
    window.addEventListener('pointermove', sizeMove, true);
    window.addEventListener('pointerup', sizeEnd, true);
    window.addEventListener('pointercancel', sizeEnd, true);
    e.preventDefault();
    e.stopPropagation();
  }

  function sizeMove(e) {
    if (!sizing) return;
    sizing.it.w = round(clamp(NW[0], NW[1], sizing.w0 + W(e.clientX, e.clientY).x - sizing.x0));
    if (!sizeRaf) sizeRaf = requestAnimationFrame(() => { sizeRaf = 0; if (sizing) paint(); });
    e.preventDefault();
  }

  function sizeEnd() {
    if (!sizing) return;
    window.removeEventListener('pointermove', sizeMove, true);
    window.removeEventListener('pointerup', sizeEnd, true);
    window.removeEventListener('pointercancel', sizeEnd, true);
    sizing = null;
    store.update(() => {});              // the new width is already in there
  }

  // nudge every coordinate pair in a path by the same amount
  function shift(d, dx, dy) {
    return d.replace(/(-?[\d.]+)\s+(-?[\d.]+)/g,
      (m, a, b) => round(+a + dx) + ' ' + round(+b + dy));
  }

  /* ── the dock ───────────────────────────────────────────────────────────── */
  const dock = $('tool-dock'), opts = $('tool-opts');

  const TOOLS = [
    { k: 'move', n: 'Move', i: '<path d="M4 2 15 8.5 9.6 10 8 15.5z"/>' },
    { k: 'draw', n: 'Draw', i: '<path d="M2.5 15.5 4 11.5 12.5 3a2 2 0 0 1 2.8 2.8L6.8 14z"/>' },
    /* sticker and upload, the two halves of what IMAGE used to be. STICKER
       opens the drawer of shipped artwork (stickers.js) and wears the
       export's own icon — a square with one corner peeled — which is CSS
       rather than a path, because the export draws it in borders and a
       transcription of those borders is exact where a traced path would be a
       guess (.dock-sticker-ico in lab.css; .dock-wheel-ico is the other icon
       on this dock made that way). An entry with `ico` brings its own markup
       and skips the <svg> the rest are wrapped in. UPLOAD is a +, and opens
       the tracing table
       (tracer.js), which is where a picture of your own becomes artwork.
       Neither carries a `needs`: both files load AFTER this one, so there is
       nothing on window to test yet — every call into them is guarded where
       it is made, the way IMAGE's always were. */
    { k: 'sticker', n: 'Sticker', ico: '<i class="dock-sticker-ico" aria-hidden="true"></i>' },
    { k: 'upload', n: 'Upload', i: '<path d="M7.6 2.6h2.8V7.6h5V10.4h-5v5H7.6v-5h-5V7.6h5z"/>' },
    { k: 'text', n: 'Text', i: '<path d="M3 2h12v3h-4.5v10h-3V5H3z"/>' },
    // gif: a search out of KLIPY. It is the one tool that draws nothing
    // itself — gif.js does the searching and the choosing — so it is only
    // on the dock if that file loaded, the same way image answers to tracer.js
    { k: 'gif', n: 'GIF', i: '<path fill-rule="evenodd" d="M2 3.5h14a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1zm1 1.7v7.6h12V5.2z"/><path d="M7.3 7.2v4.6l4-2.3z"/>', needs: 'Gif' }
  ].filter(t => !t.needs || window[t.needs]);

  function buildDock() {
    dock.innerHTML =
      '<div class="dock-grp">' + TOOLS.map(t =>
        '<button type="button" class="dock-btn" data-tool="' + t.k + '" title="' + t.n + '" aria-label="' + t.n + '">' +
        (t.ico || '<svg viewBox="0 0 18 18" width="16" height="16" aria-hidden="true">' + t.i + '</svg>') +
        '<span>' + t.n + '</span></button>').join('') + '</div>' +
      '<span class="dock-rule" aria-hidden="true"></span>' +
      '<div class="dock-grp dock-pal">' +
        /* ONE INK. The swatch shows what the next mark is made in — a house
           token painted by the skin, or a hex off the wheel — and the COLOUR
           button beside it opens the wheel; pressing the swatch does too,
           since a swatch you can press and nothing happens is a swatch you
           press twice. The wheel is built here, inside the group, so it hangs
           off the dock wherever the dock is. */
        '<button type="button" class="dock-sw" id="dock-ink" aria-label="the ink" title="the ink the next mark is made in — press to change it" style="--sw:' + ink(nib()) + '"></button>' +
        '<button type="button" class="dock-btn dock-mini" id="dock-wheel" title="Colour — pick one off the wheel" aria-label="Colour" aria-expanded="false">' +
        '<i class="dock-wheel-ico" aria-hidden="true"></i><span>Colour</span></button>' +
        wheelMarkup() + '</div>' +
      '<span class="dock-rule" aria-hidden="true"></span>' +
      '<div class="dock-grp">' +
        '<button type="button" class="dock-btn dock-mini" id="dock-undo" title="Undo — ctrl Z" aria-label="Undo, ctrl Z">' +
        '<svg viewBox="0 0 18 18" width="15" height="15" aria-hidden="true">' +
        '<path d="M7 4 3 7.5 7 11V8.5h4a3 3 0 0 1 0 6H8v2h3a5 5 0 0 0 0-10H7z"/></svg><span>Undo</span></button>' +
        /* delete is a TOOL, not a one-shot action like undo was — data-tool
           puts it through the same setTool()/markTools() wiring as move, draw,
           sticker and text, it just happens to sit in the mini group rather
           than the main one, which is the whole of why it needs no entry in
           TOOLS above (that array only builds the first group). */
        '<button type="button" class="dock-btn dock-mini" data-tool="delete" title="Delete — click a mark or a pasted copy to remove it" aria-label="Delete">' +
        '<svg viewBox="0 0 18 18" width="15" height="15" aria-hidden="true">' +
        '<path d="M4 5h10l-1 10H5zM7 2h4v2H7z"/></svg><span>Delete</span></button>' +
      '</div>';
  }

  /* Each pixel button is a square cut into as many cells as the setting is
     fine, with the first one inked: smaller pixels, more cells. 'Off' is the
     only one that isn't a grid, so it gets a squiggle. */
  function pixIcon(g) {
    if (!g) return '<path d="M1.5 11.5c2-7 3.5 1.5 5.5-2.5S11 12 14.5 4.5" fill="none" ' +
      'stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>';
    const n = g <= 10 ? 4 : g <= 20 ? 3 : 2, s = 16 / n;
    let d = '';
    for (let i = 1; i < n; i++) d += 'M' + (i * s) + ' 0V16M0 ' + (i * s) + 'H16';
    return '<rect width="' + s + '" height="' + s + '" fill="currentColor"/>' +
      '<path d="' + d + '" fill="none" stroke="currentColor" stroke-width="1" opacity=".5"/>' +
      '<rect x=".5" y=".5" width="15" height="15" rx="1" fill="none" stroke="currentColor" stroke-width="1" opacity=".75"/>';
  }

  /* The three alignment buttons, drawn rather than lettered: four rules with
     two of them short, and the ragged ends on whichever side is NOT being
     lined up. It is the one icon everybody already knows. */
  function alignIcon(a) {
    return [16, 10, 16, 11].map((w, i) => {
      const x = a === 1 ? 1 + (16 - w) / 2 : a === 2 ? 1 + (16 - w) : 1;
      return '<rect x="' + round(x) + '" y="' + (3 + i * 3.4) + '" width="' + w +
             '" height="1.8" rx=".9"/>';
    }).join('');
  }

  /* One labelled group of options. The row is allowed to fold onto a second
     line on a narrow window, and a group that folded THROUGH THE MIDDLE — the
     word SIZE at the end of one line and its buttons at the start of the next
     — would read as two broken rows rather than one wrapped one. .opt-set is
     an inline-flex box, so each group folds as a unit. */
  const grp = (lab, inner, cls) =>
    '<span class="opt-set' + (cls ? ' ' + cls : '') + '">' +
    (lab ? '<span class="opt-lab">' + lab + '</span>' : '') + inner + '</span>';
  const rule = '<span class="opt-rule"></span>';

  function buildOpts() {
    let html = '';
    if (tool === 'draw') {
      // the width belongs to the free hand; in pixel mode the cell is the
      // width, so the row is left in place and faded rather than whipped away
      html = grp('WIDTH', PW.map((w, i) =>
        '<button type="button" class="opt-btn opt-pw" data-pw="' + i + '" aria-label="' + w + 'px">' +
        '<i style="width:' + Math.max(4, w + 3) + 'px;height:' + Math.max(4, w + 3) + 'px"></i></button>').join(''),
        PIX[pi] ? 'opt-moot' : '') + rule +
        grp('PIXEL', PIX.map((g, i) =>
        '<button type="button" class="opt-btn opt-px" data-px="' + i + '"' +
        ' title="' + (g ? 'squares ' + g + ' across' : 'a free hand') + '"' +
        ' aria-label="' + (g ? 'pixels ' + g + ' across' : 'no pixels') + '">' +
        '<svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true">' + pixIcon(g) + '</svg>' +
        '</button>').join(''));
    } else if (tool === 'upload' || tool === 'sticker') {
      /* ONE ROW FOR BOTH. The artwork itself is chosen on the table or in
         the drawer; the row only ever says how big it lands and how faded,
         and which one is on the pointer — and a tracing and a sticker land
         the same way, so they are set by the same two groups and remember
         the same two numbers. Only the tail differs, and only in whose
         pointer it is reading. */
      const sk = tool === 'sticker';
      /* AND WHETHER THE PANEL IS THERE AT ALL. stickers.js and tracer.js load
         AFTER this file, and every call into them is guarded — so if one of
         them never arrives (a stale index.html with no script tag for it, a
         404, a syntax error) the button is still on the dock and the press
         still lands here, and the row would sit there saying "pick a sticker
         out of the drawer" with no drawer to pick out of. A row that names a
         thing the user cannot see is worse than one that says what happened,
         so it says what happened. (2026-09-08, after exactly that: a cached
         index.html served the new dock and no stickers.js.) */
      const panel = sk ? window.Stickers : window.Tracer;
      const f = panel && panel.armed();
      html = grp('SIZE', IMG.map((px, i) =>
        '<button type="button" class="opt-btn opt-iz" data-iz="' + i + '" title="' + px + ' across" aria-label="' + px + ' across">' +
        ['S', 'M', 'L'][i] + '</button>').join('')) +
        rule + grp('FADE', PO.map((o, i) =>
        '<button type="button" class="opt-btn opt-po" data-po="' + i + '" aria-label="' + Math.round(o * 100) + '%">' +
        '<i style="opacity:' + o + '"></i></button>').join('')) +
        rule + '<span class="opt-say' + (panel ? '' : ' opt-say-off') + '">' +
        (!panel ? (sk ? 'the sticker drawer did not load' : 'the tracing table did not load') + ' — try a reload'
          : f ? 'on the pointer: ' + escT(f.name)
          : sk ? 'pick a sticker out of the drawer' : 'pick a tracing from the library') + '</span>';
    } else if (tool === 'text') {
      /* THE TYPE CASE ONLY COMES UP WITH THE BOX. Picking up the text tool
         says nothing about a note that is not being written yet, so there is
         nothing to set and the row stays down until you click the paper. From
         then on it is a formatting bar in the proper sense: sat over the words
         it changes, for as long as they are being written.

         In the order a word processor puts them: the face, then how big, then
         how it is set, then which edge it lines up on. Each face previews
         itself in its own REGULAR weight, so the row shows what you would get
         rather than five words in the same bold. */
      html = !noteBox ? '' : grp('FONT', FONTS.map((f, i) =>
        '<button type="button" class="opt-btn opt-fo" data-fo="' + i +
        '" title="' + f.n + '" style="font-family:' + f.f + ';font-weight:' + f.r + '">' +
        f.n + '</button>').join('')) + rule +

        grp('SIZE',
        '<button type="button" class="opt-btn opt-z" data-z="-1" title="smaller (ctrl [)" aria-label="smaller"' +
        (fz === 0 ? ' disabled' : '') + '>A−</button>' +
        '<span class="opt-num">' + TSZ[fz] + '</span>' +
        '<button type="button" class="opt-btn opt-z" data-z="1" title="bigger (ctrl ])" aria-label="bigger"' +
        (fz === TSZ.length - 1 ? ' disabled' : '') + '>A+</button>') + rule +

        grp('STYLE',
        '<button type="button" class="opt-btn opt-ty opt-ty-b" data-ty="b" title="Bold (ctrl B)" aria-label="Bold">B</button>' +
        '<button type="button" class="opt-btn opt-ty opt-ty-i" data-ty="i" title="Italic (ctrl I)" aria-label="Italic">I</button>' +
        '<button type="button" class="opt-btn opt-ty opt-ty-u" data-ty="u" title="Underline (ctrl U)" aria-label="Underline">U</button>') + rule +

        grp('ALIGN', ['left', 'centred', 'right'].map((n, i) =>
          '<button type="button" class="opt-btn opt-al" data-al="' + i + '" title="' + n + '" aria-label="' + n + '">' +
          '<svg viewBox="0 0 18 18" width="14" height="14" aria-hidden="true">' + alignIcon(i) + '</svg>' +
          '</button>').join(''));
    } else if (tool === 'gif' && window.Gif) {
      html = Gif.opts();                 // the search bar, and what came back from it
    }
    opts.innerHTML = html;
    opts.hidden = !html;                 // move mode, and text before the box, say nothing
    markOpts();
  }

  function markTools() {
    dock.querySelectorAll('[data-tool]').forEach(b =>
      b.setAttribute('aria-pressed', String(b.dataset.tool === tool)));
    paintInk();
    document.body.dataset.wallTool = tool;
    // delete reads the paper the way move does — items answer the pointer
    // one at a time, bare paper stays inert so a click still pans/lets the
    // gizmo underneath through — rather than the way draw/sticker/text/
    // gif do, which take the whole layer so blank paper can be marked on
    svg.classList.toggle('wall-live', tool !== 'move' && tool !== 'delete');
    svg.classList.toggle('wall-picking', tool === 'move');
    svg.classList.toggle('wall-deleting', tool === 'delete');
  }
  function markOpts() {
    const on = (sel, v) => opts.querySelectorAll(sel).forEach(b =>
      b.setAttribute('aria-pressed', String(+b.dataset[v.k] === v.v)));
    on('.opt-pw', { k: 'pw', v: pw }); on('.opt-sk', { k: 'sk', v: sk }); on('.opt-px', { k: 'px', v: pi });
    on('.opt-iz', { k: 'iz', v: iz });
    on('.opt-po', { k: 'po', v: po }); on('.opt-fo', { k: 'fo', v: fo });
    on('.opt-al', { k: 'al', v: fa });
    // B, I and U are each on or off rather than one-of-many, so they do not go
    // through the same "is this the chosen index" test as everything else
    const flag = { b: fb, i: fi, u: fu };
    opts.querySelectorAll('.opt-ty').forEach(b =>
      b.setAttribute('aria-pressed', String(!!flag[b.dataset.ty])));
  }

  /* The bench's squares ARE the pixels, so choosing a size re-cuts the paper
     underneath — and putting the pen down puts it back to the house 20. The
     body class is for the skins whose bench is dotted: dots make a poor grid
     to fill in, so while pixel mode is on they rule themselves into lines. */
  function syncGrid() {
    const g = tool === 'draw' ? PIX[pi] : 0;
    document.body.classList.toggle('wall-pixel', !!g);
    if (Lab.grid) Lab.grid(g || GRID);
  }

  function setTool(t) {
    if (t === tool) return;
    shutNote(); closeWheel(); tool = t; markTools(); buildOpts(); syncGrid();
    // the tracing table is part of its tool: up with it, away with it
    if (window.Tracer) Tracer.tool(t === 'upload');
    // …and so is the sticker drawer, which is the other half of that split
    if (window.Stickers) Stickers.tool(t === 'sticker');
    // …and picking up gif is what shows what's trending, the first time
    if (window.Gif) Gif.tool(t === 'gif');
  }

  dock.addEventListener('click', e => {
    const t = e.target.closest('[data-tool]'); if (t) { setTool(t.dataset.tool); return; }
    // the swatch and the COLOUR button are one control: either opens the wheel
    if (e.target.closest('#dock-ink,#dock-wheel')) { toggleWheel(); return; }
    const chip = e.target.closest('[data-house]');
    if (chip) { setInk(+chip.dataset.house); loadWheel(); return; }
    if (e.target.closest('#dock-undo')) { undo(); return; }
  });

  /* ── THE WHEEL ────────────────────────────────────────────────
     A disc and a bar: hue is the angle round the disc, saturation the
     distance out from its white centre, brightness the bar under it — HSV,
     which is the model a colour wheel is a picture of. The disc is two CSS
     gradients (a conic for the hue with a radial white fade over it) and
     the dot is placed by arithmetic from the same two numbers the pointer
     gave, so nothing is read back off pixels and the dot and the colour
     cannot disagree. Dragging PREVIEWS — the swatch and any note being
     written follow the finger — and letting go is what is kept, the same
     split the old system picker made between 'input' and 'change'. A hex
     box is there for a number you already know, and the five house colours
     sit under it as chips: a mark made in one of those stores its TOKEN and
     follows the paper between skins, which the wheel's hexes never will.

     The wheel is not a dialog. It hangs off the palette group, stays put
     while the camera moves, steps up over the options row when the draw
     tool has one open, and goes away on esc, on picking up a tool, or on a
     press anywhere else. Nothing about it is saved but the answer. */
  let hsv = { h: 330, s: 0.7, v: 0.94 };  // where the dot is; loaded from the ink when the wheel opens
  let wheelOn = false, turning = null;     // turning: 'disc' or 'val' while the pointer is down on one

  const hx2 = n => ('0' + Math.round(Math.max(0, Math.min(255, n))).toString(16)).slice(-2);
  function toHex(h, s, v) {
    const f = n => { const k = (n + h / 60) % 6; return v - v * s * Math.max(0, Math.min(k, 4 - k, 1)); };
    return '#' + hx2(f(5) * 255) + hx2(f(3) * 255) + hx2(f(1) * 255);
  }
  function toHsv(hex) {
    const m = /^#?([0-9a-f]{6})$/i.exec((hex || '').trim());
    if (!m) return null;
    const r = parseInt(m[1].slice(0, 2), 16) / 255, g = parseInt(m[1].slice(2, 4), 16) / 255, b = parseInt(m[1].slice(4), 16) / 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
    let h = 0;
    if (d) h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return { h: (h * 60 + 360) % 360, s: mx ? d / mx : 0, v: mx };
  }
  // the ink as a hex whatever it is stored as: a token is read off the swatch,
  // which the skin has already painted — mix in horror and you start from the
  // ink horror uses
  function inkHex() {
    const c = curInk();
    if (typeof c === 'string') return c;
    const sw = $('dock-ink');
    const m = sw && getComputedStyle(sw).backgroundColor.match(/\d+/g);
    return m ? '#' + hx2(+m[0]) + hx2(+m[1]) + hx2(+m[2]) : '#ef4d98';
  }

  function wheelMarkup() {
    return '<div class="wheel" id="dock-wheel-pop" hidden>' +
      '<div class="wheel-disc" id="wheel-disc" title="hue round the rim, paler towards the middle"><i class="wheel-dot"></i></div>' +
      '<div class="wheel-val" id="wheel-val" title="brightness"><i class="wheel-thumb"></i></div>' +
      '<div class="wheel-row">' +
        '<input class="wheel-hex" id="wheel-hex" maxlength="7" spellcheck="false" autocomplete="off" aria-label="hex">' +
        '<span class="wheel-house">' + PAL.map((c, i) =>
          '<button type="button" class="wheel-chip" data-house="' + i + '" title="' + c +
          ' — a house colour, follows the paper" style="--sw:var(--' + c + ')"></button>').join('') +
        '</span></div></div>';
  }

  // the swatch on the dock, painted with whatever the next mark gets
  function paintInk() {
    const sw = $('dock-ink');
    if (sw) sw.style.setProperty('--sw', ink(curInk()));
  }

  function drawWheel() {
    const disc = $('wheel-disc'); if (!disc) return;
    const dot = disc.querySelector('.wheel-dot'), R = disc.clientWidth / 2;
    const a = (hsv.h - 90) * Math.PI / 180, r = hsv.s * R;
    dot.style.left = (R + Math.cos(a) * r) + 'px';
    dot.style.top = (R + Math.sin(a) * r) + 'px';
    const hex = toHex(hsv.h, hsv.s, hsv.v);
    dot.style.background = hex;
    const val = $('wheel-val'), thumb = val.querySelector('.wheel-thumb');
    val.style.setProperty('--top', toHex(hsv.h, hsv.s, 1));
    thumb.style.left = (hsv.v * 100) + '%';
    thumb.style.background = hex;
    const box = $('wheel-hex');
    if (document.activeElement !== box) box.value = hex;
  }
  // the ink, onto the wheel — when it opens, and after a chip
  function loadWheel() { hsv = toHsv(inkHex()) || hsv; drawWheel(); }

  function previewInk(hex) {
    const sw = $('dock-ink'); if (sw) sw.style.setProperty('--sw', hex);
    if (noteIn) noteIn.style.color = hex;
  }

  /* What is kept: a hex off the wheel or a house token off its chips, in the
     wall's store beside the drawing, for NEW marks — everything already on
     the paper holds the colour it was made with. A note being written takes
     it too: it held its own ink until now, and choosing a colour with the
     caret in it is choosing for the words. */
  function setInk(v) {
    if (editing && editing.c != null) editing.c = null;
    store.update(st => { st.ink = v; });
    markTools(); styleNote();
  }

  function openWheel() {
    const pop = $('dock-wheel-pop'), b = $('dock-wheel'); if (!pop || !b) return;
    pop.style.setProperty('--opts-h', (opts.hidden ? 0 : opts.offsetHeight + 6) + 'px');   // clear of the options row
    pop.hidden = false; wheelOn = true;
    b.setAttribute('aria-expanded', 'true');
    loadWheel();
  }
  function closeWheel() {
    if (!wheelOn) return;
    const pop = $('dock-wheel-pop'), b = $('dock-wheel');
    if (pop) pop.hidden = true;
    if (b) b.setAttribute('aria-expanded', 'false');
    wheelOn = false; turning = null;
    paintInk();                            // a preview that was never kept comes off the swatch
    if (noteIn) styleNote();
  }
  const toggleWheel = () => (wheelOn ? closeWheel() : openWheel());

  // the disc and the bar: press, drag, let go — the pointer is captured, so a
  // drag that wanders off the disc keeps turning it
  function turn(e) {
    if (turning === 'disc') {
      const r = $('wheel-disc').getBoundingClientRect(), R = r.width / 2;
      const dx = e.clientX - (r.left + R), dy = e.clientY - (r.top + R);
      hsv.h = (Math.atan2(dy, dx) * 180 / Math.PI + 450) % 360;   // 0 at the top, clockwise, like the gradient
      hsv.s = Math.min(1, Math.hypot(dx, dy) / R);
    } else {
      const r = $('wheel-val').getBoundingClientRect();
      hsv.v = clamp(0, 1, (e.clientX - r.left) / r.width);
    }
    drawWheel(); previewInk(toHex(hsv.h, hsv.s, hsv.v));
  }
  dock.addEventListener('pointerdown', e => {
    const on = e.target.closest('#wheel-disc') ? 'disc' : e.target.closest('#wheel-val') ? 'val' : null;
    if (!on) return;
    turning = on; turn(e);
    try { e.target.closest('#wheel-disc,#wheel-val').setPointerCapture(e.pointerId); } catch (err) {}
    e.preventDefault();                    // and the caret stays in a note being written
  });
  dock.addEventListener('pointermove', e => { if (turning) turn(e); });
  const turned = () => { if (!turning) return; turning = null; setInk(toHex(hsv.h, hsv.s, hsv.v)); };
  dock.addEventListener('pointerup', turned);
  dock.addEventListener('pointercancel', turned);
  // a hex typed in: kept on enter or on leaving the box, and a bad one is put
  // back to what the wheel says rather than argued with
  dock.addEventListener('change', e => {
    if (e.target.id !== 'wheel-hex') return;
    const v = toHsv(e.target.value.replace(/^\s*([0-9a-f]{6})\s*$/i, '#$1'));
    if (v) { hsv = v; setInk(toHex(v.h, v.s, v.v)); }
    drawWheel();
  });
  dock.addEventListener('keydown', e => {
    if (e.target.id === 'wheel-hex' && e.key === 'Enter') { e.target.blur(); e.preventDefault(); }
  });
  // away: a press anywhere else, esc, or picking up a tool (setTool closes it)
  document.addEventListener('pointerdown', e => {
    if (wheelOn && !e.target.closest('#dock-wheel-pop,#dock-wheel,#dock-ink')) closeWheel();
  }, true);
  document.addEventListener('keydown', e => { if (wheelOn && e.key === 'Escape') closeWheel(); });

  /* A PRESS IN THE OPTIONS ROW MUST NOT TAKE THE CARET OUT OF AN OPEN NOTE.
     Blur is what pins a note — so without this, reaching for 'bold' halfway
     through writing one would FILE it instead of emboldening it. Swallowing
     the pointerdown (not the click) is the whole fix: the button still fires,
     the focus never leaves the box, and the words change under the caret. The
     ink and its wheel get the same treatment, so the colour can be changed mid-note;
     the tool buttons deliberately do not, because leaving the text tool while
     writing should still pin what you wrote, exactly as it always has. */
  const keepCaret = e => { if (noteBox && e.target.closest('button')) e.preventDefault(); };
  opts.addEventListener('pointerdown', keepCaret);
  dock.addEventListener('pointerdown', e => { if (e.target.closest('#dock-ink,#dock-wheel,.wheel-chip')) keepCaret(e); });

  opts.addEventListener('click', e => {
    const gif = e.target.closest('[data-gif]');
    if (gif) { if (window.Gif) Gif.onOpt(gif); return; }
    const b = e.target.closest('[data-pw],[data-sk],[data-po],[data-fo],[data-px],[data-z],[data-ty],[data-al],[data-iz]');
    if (!b) return;
    if (b.dataset.px != null) { pi = +b.dataset.px; syncGrid(); buildOpts(); return; }
    // the size readout is part of the row, so stepping it redraws the row
    if (b.dataset.z != null) { stepSize(+b.dataset.z); return; }
    if (b.dataset.ty != null) {
      const k = b.dataset.ty;
      if (k === 'b') fb = fb ? 0 : 1; else if (k === 'i') fi = fi ? 0 : 1; else fu = fu ? 0 : 1;
    }
    if (b.dataset.pw != null) pw = +b.dataset.pw;
    if (b.dataset.sk != null) sk = +b.dataset.sk;
    if (b.dataset.iz != null) iz = +b.dataset.iz;
    if (b.dataset.po != null) po = +b.dataset.po;
    if (b.dataset.fo != null) fo = +b.dataset.fo;
    if (b.dataset.al != null) fa = +b.dataset.al;
    markOpts();
    styleNote();                         // …and the note being written follows
  });

  // escape drops back to move, the way it drops the hand tool
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape' || tool === 'move' || noteBox) return;
    setTool('move');
  });

  buildDock(); buildOpts(); markTools(); syncGrid();
  store.on(paint);
  paint();

  // A scroll is cut to the width of the words, and the words change width twice
  // after that first paint: once when the web fonts land, and again every time
  // a genre swaps --display and --mono for a different pair. Both re-measure.
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => paint());
  document.addEventListener('lab:theme', () => paint());

  return { store, setTool, get tool() { return tool; },
           stampAt,                      // tracer.js: a tracing dragged off the library lands here
           stickerAt,                    // stickers.js: …and a sticker dragged out of the drawer
           gifAt,                        // gif.js: …and a gif dragged off the row, or clicked in it
           syncOpts: buildOpts,          // the + tool redraws its own row through this
           paint,                        // tracer.js: a stamp is drawn from the library, so the library changing repaints
           mark,                         // …and tells undo what it just put up
           undo,                         // the button, and lab.js's ctrl+z
           PAL, PW, PO, SK, FONTS, STICKIES, STAMPS, stickyArt };
})();
