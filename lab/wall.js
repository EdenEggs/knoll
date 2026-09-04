/* ─── THE TOOL DOCK ────────────────────────────────────────────────────────
   The dock from the coming-soon page's hero, brought to the bench: a dark
   pill at the bottom centre with move / draw / sticker / text, five colours,
   undo and clear, and a second row of options that appears when the chosen
   tool has any and folds away in move mode.

   The same numbers as the hero, deliberately — 4 pen widths, 3 sticker
   opacities, 5 stamps, 5 fonts — so the two feel like one product:

     PW  2.5 / 4.5 / 8 / 14        PO  100% / 55% / 25%
     SK  hat · gnome · toadstool · big beard · lantern
     FONTS  Sans · Display · Serif · Mono · Marker

   THREE THINGS THE HERO HAS NOT GOT
     STICKIES  none · yellow · pink · blue · green — a note can be written
     on a sticky note instead of straight onto the paper. Each is cut to fit
     the words rather than being a fixed picture, so a long one gets a long
     sticky, and the corner curls up wherever that leaves it.

     PIXEL  off · 10 · 20 · 40 — the pen squares off and fills the bench's
     own grid a cell at a time. Choosing a size re-cuts that grid to match
     (Lab.grid), so the squares you can SEE are the pixels you get — until you
     zoom out far enough that lab.js starts drawing every second one. A drag is
     one piece however many cells it covers, so undo takes the shape rather
     than the last square of it, and moving one afterwards snaps by cells.

     MIXED INK  the five swatches are no longer fixed. The one already chosen
     takes a second press to open the system colour picker, alt-click puts the
     house colour back, and what you mix is kept with the drawing. A mark made
     in a house colour still stores its TOKEN and so follows the paper between
     skins; a mark made in a mixed one stores its hex and stays put.

     A NOTE IS A BOX, NOT A LINE
     It has a WIDTH, and the words fall onto as many lines as that width needs
     — measured on a canvas in the note's own face and size, so the break lands
     where it will look like it landed. You are typing into a box the same
     width, so the wrapping you watch is the wrapping you get. Drag the tab on
     its right edge to reshape it, while writing or long afterwards with the
     move tool, and the parchment under it is re-cut to the new block. Notes
     written before any of this hold no width and stay one line, as they were.

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
  const PIX = [0, 10, 20, 40];           // 0 is a free hand; the rest are cells, in world units
  const GRID = 20;                       // what the bench is ruled at when nothing has re-cut it
  const NW = [90, 1400];                 // how narrow and how wide a note may be reshaped to
  const LH = 1.32;                       // a line of a note, as a multiple of its size
  const SK = ['hat', 'gnome', 'toadstool', 'beard', 'lantern'];
  const FONTS = [
    { n: 'Sans', f: "var(--body)", w: 600 },
    { n: 'Display', f: "var(--display)", w: 700 },
    { n: 'Serif', f: "Georgia,'Times New Roman',serif", w: 600 },
    { n: 'Mono', f: "var(--mono)", w: 600 },
    { n: 'Marker', f: "'Comic Sans MS','Segoe Print',cursive", w: 700 }
  ];
  /* The five pads. Index 0 is bare paper and always was, so a note written
     before any of this still comes out on nothing. The colours are TOKENS, not
     hexes, for the same reason the inks are: a sticky has to be a paper the
     skin's own ink reads on, which means pale under the knoll and dim down in
     the cellar. */
  const STICKIES = [
    { n: 'None', k: '' },
    { n: 'Yellow', k: 'y' },
    { n: 'Pink', k: 'p' },
    { n: 'Blue', k: 'b' },
    { n: 'Green', k: 'g' }
  ];
  const PADS = { y: '--sticky-a', p: '--sticky-b', b: '--sticky-c', g: '--sticky-d' };
  const pad = k => 'var(' + (PADS[k] || PADS.y) + ')';
  const MAX = 600;                       // pieces before the oldest starts dropping

  const store = Lab.store('wall', () => ({ items: [] }));
  const S = () => store.get();

  // tool choices are a mood, not a document — they live for the session only,
  // the same way the hero treats them
  let tool = 'move', ci = 1, pw = 1, po = 0, fo = 0, sk = 0, sc = 0, pi = 0, nw = 260;

  /* An ink is one of two things, and a saved mark can hold either: a HOUSE
     COLOUR, which is an index into PAL kept as a token so it re-mixes itself
     when the skin changes, or a hex somebody mixed themselves, which is meant
     to stay exactly that colour wherever it is looked at. Everything drawn
     before the picker existed holds an index, so the number is still the
     ordinary case and nothing has to be migrated. */
  const ink = c => typeof c === 'string' ? c : 'var(--' + (PAL[c] || PAL[0]) + ')';
  const mix = i => (S().pal || [])[i] || null;    // what a swatch has been mixed to, if anything
  const swatch = i => mix(i) || 'var(--' + PAL[i] + ')';
  const nib = () => mix(ci) || ci;                // and so, the ink a new mark is made with
  const round = n => Math.round(n * 10) / 10;
  const clamp = (lo, hi, v) => Math.max(lo, Math.min(hi, v));

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

  const face = v => {
    const m = /^var\((--[\w-]+)\)$/.exec(String(v).trim());
    return m ? getComputedStyle(document.documentElement).getPropertyValue(m[1]).trim() || 'sans-serif' : v;
  };

  function wrapText(t, f, sz, w) {
    const paras = String(t).split('\n');
    if (!w) return paras;                // notes from before boxes had a width
    meas.font = f.w + ' ' + sz + 'px ' + face(f.f);
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
      let node;
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
      } else if (it.k === 't') {
        const f = FONTS[it.f] || FONTS[0], sz = it.sz || 22, lh = sz * LH;
        const lines = wrapText(it.t, f, sz, it.w || 0);
        const words = el('text', { x: it.x, y: it.y, fill: ink(it.c),
          'font-family': f.f, 'font-weight': f.w, 'font-size': sz, 'dominant-baseline': 'middle' });
        // x,y stays the middle of the whole block, so a one-line note sits
        // exactly where it always did and a longer one grows about its centre
        const top = it.y - (lines.length - 1) * lh / 2;
        lines.forEach((ln, li) => {
          const ts = el('tspan', { x: it.x, y: round(top + li * lh) });
          ts.textContent = ln;
          words.appendChild(ts);
        });
        // every note is a <g> — it has a grip to carry, and the parchment (if
        // any) goes in front of the words once they have been measured
        node = el('g', {});
        node.appendChild(words);
        written.push({ g: node, words, it, k: (STICKIES[it.sc] || STICKIES[0]).k, n: lines.length, lh, sz });
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
    });
    written.forEach(n => {
      if (n.k) {
        const art = el('g', { class: 'wall-sticky' });
        art.innerHTML = stickyArt(n.k, n.it.x, n.it.y, n.w, n.sz, n.h);
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

  /* ── what undo takes back ─────────────────────────────────────────
     Ink is kept here and pictures are kept in the drum, so "the last thing
     put down" is not one list to pop. This is that list: a note of which of
     the two each piece went into, in the order they were made. Undo reads it
     backwards, so a picture put up between two strokes is taken back between
     them too, and a picture already taken down by hand is stepped over rather
     than swallowing the press.

     It is not saved. After a reload undo pops ink, exactly as it always did —
     which is the right amount of memory for a button whose whole promise is
     "the thing you just did". */
  const made = [];
  const mark = (k, id) => { made.push({ k, id }); };

  function add(item) {
    mark('ink');
    store.update(st => {
      st.items.push(item);
      if (st.items.length > MAX) st.items.splice(0, st.items.length - MAX);
    });
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
    } else if (tool === 'sticker') {
      add({ k: 'k', s: sk, c: nib(), o: po, x: round(p.x), y: round(p.y), z: 1 });
    } else if (tool === 'text') {
      askNote(p);
    } else if (tool === 'picture' && window.Picture) {
      // a picture is not ink: it goes up as a pin in the drum's list, and the
      // sheet comes up here instead if there is nothing on the pointer yet
      Picture.place(p);
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
     middle of reshaping it. */
  let noteBox = null, noteIn = null;

  function askNote(p) {
    shutNote();
    const f = FONTS[fo], s = STICKIES[sc] || STICKIES[0];

    // on a sticky the box wears the pad, so what you are typing into already
    // looks like the thing it is about to become
    noteBox = document.createElement('div');
    noteBox.className = 'wall-note' + (s.k ? ' on-sticky' : '');
    if (s.k) noteBox.style.setProperty('--pad', pad(s.k));
    noteBox.style.left = p.x + 'px';
    noteBox.style.top = p.y + 'px';

    noteIn = document.createElement('textarea');
    noteIn.className = 'wall-note-in';
    noteIn.rows = 1;
    noteIn.maxLength = 400;
    noteIn.placeholder = s.k ? 'write on the sticky…' : 'say something…';
    noteIn.style.width = round(nw) + 'px';
    noteIn.style.fontFamily = f.f;
    noteIn.style.fontWeight = f.w;
    noteIn.style.color = ink(nib());

    const grip = document.createElement('button');
    grip.type = 'button';
    grip.className = 'wall-note-grip';
    grip.setAttribute('aria-label', 'how wide the note is');
    grip.tabIndex = -1;

    const hint = document.createElement('p');
    hint.className = 'wall-note-hint';
    hint.textContent = 'enter to pin it · shift+enter for a new line · drag the tab to reshape';

    noteBox.append(noteIn, grip, hint);
    world.appendChild(noteBox);
    grow();
    noteIn.focus();

    noteIn.addEventListener('input', grow);
    noteIn.addEventListener('keydown', ev => {
      if (ev.key === 'Enter' && !ev.shiftKey) { commitNote(p); ev.preventDefault(); }
      else if (ev.key === 'Escape') { shutNote(); ev.preventDefault(); }
      ev.stopPropagation();                       // lab's own keys stay out of it
    });
    noteIn.addEventListener('blur', () => commitNote(p));

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

  // a textarea will not size itself, so it is measured and told
  function grow() {
    if (!noteIn) return;
    noteIn.style.height = 'auto';
    noteIn.style.height = noteIn.scrollHeight + 'px';
  }

  function commitNote(p) {
    if (!noteBox) return;
    const t = noteIn.value.replace(/[ \t]+$/gm, '').trim();
    shutNote();
    // +10 is the box's border and padding: the words go where they looked like
    // they were, not ten pixels to the left of it
    if (t) add({ k: 't', c: nib(), f: fo, sc, x: round(p.x + 10), y: round(p.y), t,
                 sz: 22, w: round(nw) });
  }
  // let go of the reference BEFORE pulling the box out of the page: removing a
  // focused element fires blur synchronously, and blur is what commits a note,
  // so doing it the other way round makes escape behave exactly like enter
  function shutNote() { const n = noteBox; noteBox = null; noteIn = null; if (n) n.remove(); }

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
    store.update(st => {
      const it = st.items[i];
      if (!it) return;
      // pixel art that has been nudged half a cell is no longer pixel art,
      // so a squared-off piece moves by whole cells or not at all
      if (it.k === 'p') it.d = shift(it.d, Math.round(ox / it.g) * it.g, Math.round(oy / it.g) * it.g);
      else if (it.k === 's') it.d = shift(it.d, ox, oy);
      else { it.x = round(it.x + ox); it.y = round(it.y + oy); }
    });
  }

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
    { k: 'sticker', n: 'Sticker', i: '<path d="M9 1.6 11 6l4.8.5-3.6 3.2 1 4.7L9 12l-4.2 2.4 1-4.7L2.2 6.5 7 6z"/>' },
    { k: 'text', n: 'Text', i: '<path d="M3 2h12v3h-4.5v10h-3V5H3z"/>' },
    // the plus: a picture, off this device or out of GIPHY. It is the one tool
    // that draws nothing itself — picture.js does the choosing and the drum
    // does the pinning — so it is only on the dock if that file loaded
    { k: 'picture', n: 'Picture', i: '<path d="M7.5 2.5h3v5h5v3h-5v5h-3v-5h-5v-3h5z"/>', needs: 'Picture' }
  ].filter(t => !t.needs || window[t.needs]);

  function buildDock() {
    dock.innerHTML =
      '<div class="dock-grp">' + TOOLS.map(t =>
        '<button type="button" class="dock-btn" data-tool="' + t.k + '" title="' + t.n + '" aria-label="' + t.n + '">' +
        '<svg viewBox="0 0 18 18" width="16" height="16" aria-hidden="true">' + t.i + '</svg>' +
        '<span>' + t.n + '</span></button>').join('') + '</div>' +
      '<span class="dock-rule" aria-hidden="true"></span>' +
      '<div class="dock-grp dock-pal">' + PAL.map((c, i) =>
        '<button type="button" class="dock-sw" data-ci="' + i + '" aria-label="colour ' + (i + 1) + '"' +
        ' title="' + c + (mix(i) ? ' — mixed to ' + mix(i) : '') +
        '\npress again to mix your own · alt-click for the house colour"' +
        ' style="--sw:' + swatch(i) + '"></button>').join('') +
        // one picker for the five pots, kept out of the way until it is asked
        // for: a colour input cannot live inside a button, and five of them
        // would be five more tab stops for something a click already opens
        '<input type="color" id="dock-mix" tabindex="-1" aria-hidden="true"></div>' +
      '<span class="dock-rule" aria-hidden="true"></span>' +
      '<div class="dock-grp">' +
        '<button type="button" class="dock-btn dock-mini" id="dock-undo" title="Undo" aria-label="Undo">' +
        '<svg viewBox="0 0 18 18" width="15" height="15" aria-hidden="true">' +
        '<path d="M7 4 3 7.5 7 11V8.5h4a3 3 0 0 1 0 6H8v2h3a5 5 0 0 0 0-10H7z"/></svg><span>Undo</span></button>' +
        '<button type="button" class="dock-btn dock-mini" id="dock-clear" title="Clear the wall" aria-label="Clear the wall">' +
        '<svg viewBox="0 0 18 18" width="15" height="15" aria-hidden="true">' +
        '<path d="M4 5h10l-1 10H5zM7 2h4v2H7z"/></svg><span>Clear</span></button>' +
        /* the tape is not a drawing tool — it has no mode and leaves no ink.
           It drops a strip of hazard tape on the sheet and hands it back. Only
           on the dock if tape.js loaded. */
        (window.Tape ?
          '<button type="button" class="dock-btn dock-mini" id="dock-tape" title="String a strip of caution tape across the bench" aria-label="String up caution tape">' +
          '<svg viewBox="0 0 18 18" width="15" height="15" aria-hidden="true">' +
          '<path d="M1 6h16v6H1z" fill="none" stroke="currentColor" stroke-width="1.8"/>' +
          '<path d="M4 6 1.5 12M8 6 5.5 12M12 6 9.5 12M16 6 13.5 12" fill="none" stroke="currentColor" stroke-width="1.6"/>' +
          '</svg><span>Tape</span></button>' : '') +
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

  function buildOpts() {
    let html = '';
    if (tool === 'draw') {
      // the width belongs to the free hand; in pixel mode the cell is the
      // width, so the row is left in place and faded rather than whipped away
      html = '<span class="opt-set' + (PIX[pi] ? ' opt-moot' : '') + '">' +
        '<span class="opt-lab">WIDTH</span>' + PW.map((w, i) =>
        '<button type="button" class="opt-btn opt-pw" data-pw="' + i + '" aria-label="' + w + 'px">' +
        '<i style="width:' + Math.max(4, w + 3) + 'px;height:' + Math.max(4, w + 3) + 'px"></i></button>').join('') +
        '</span><span class="opt-rule"></span><span class="opt-lab">PIXEL</span>' + PIX.map((g, i) =>
        '<button type="button" class="opt-btn opt-px" data-px="' + i + '"' +
        ' title="' + (g ? 'squares ' + g + ' across' : 'a free hand') + '"' +
        ' aria-label="' + (g ? 'pixels ' + g + ' across' : 'no pixels') + '">' +
        '<svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true">' + pixIcon(g) + '</svg>' +
        '</button>').join('');
    } else if (tool === 'sticker') {
      html = '<span class="opt-lab">STAMP</span>' + SK.map((s, i) =>
        '<button type="button" class="opt-btn opt-sk" data-sk="' + i + '" title="' + s + '" aria-label="' + s + '">' +
        '<svg viewBox="0 0 64 64" width="22" height="22" aria-hidden="true">' + STAMPS[s] + '</svg></button>').join('') +
        '<span class="opt-rule"></span><span class="opt-lab">FADE</span>' + PO.map((o, i) =>
        '<button type="button" class="opt-btn opt-po" data-po="' + i + '" aria-label="' + Math.round(o * 100) + '%">' +
        '<i style="opacity:' + o + '"></i></button>').join('');
    } else if (tool === 'text') {
      html = '<span class="opt-lab">FONT</span>' + FONTS.map((f, i) =>
        '<button type="button" class="opt-btn opt-fo" data-fo="' + i + '" style="font-family:' + f.f + ';font-weight:' + f.w + '">' +
        f.n + '</button>').join('') +
        '<span class="opt-rule"></span><span class="opt-lab">STICKY</span>' + STICKIES.map((s, i) =>
        '<button type="button" class="opt-btn opt-sc" data-sc="' + i + '" title="' + s.n +
        '" aria-label="' + s.n + '">' +
        // the same artwork the paper gets, at note size, with one stroke of ink
        // standing in for the words — so the button is a sample, not a symbol
        '<svg viewBox="0 0 36 26" width="28" height="20" aria-hidden="true">' +
        stickyArt(s.k, 12, 10.5, 12, 9) +
        '<path d="M12 10.5h12" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>' +
        '</svg></button>').join('');
    } else if (tool === 'picture' && window.Picture) {
      html = Picture.opts();             // the two ways in, and what is on the pointer
    }
    opts.innerHTML = html;
    opts.hidden = !html;                 // move mode has nothing to say
    markOpts();
  }

  function markTools() {
    dock.querySelectorAll('[data-tool]').forEach(b =>
      b.setAttribute('aria-pressed', String(b.dataset.tool === tool)));
    dock.querySelectorAll('[data-ci]').forEach(b =>
      b.setAttribute('aria-pressed', String(+b.dataset.ci === ci)));
    document.body.dataset.wallTool = tool;
    svg.classList.toggle('wall-live', tool !== 'move');
    svg.classList.toggle('wall-picking', tool === 'move');
  }
  function markOpts() {
    const on = (sel, v) => opts.querySelectorAll(sel).forEach(b =>
      b.setAttribute('aria-pressed', String(+b.dataset[v.k] === v.v)));
    on('.opt-pw', { k: 'pw', v: pw }); on('.opt-sk', { k: 'sk', v: sk }); on('.opt-px', { k: 'px', v: pi });
    on('.opt-po', { k: 'po', v: po }); on('.opt-fo', { k: 'fo', v: fo });
    on('.opt-sc', { k: 'sc', v: sc });
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
    shutNote(); tool = t; markTools(); buildOpts(); syncGrid();
    // the picture sheet is part of its tool: up with it, away with it
    if (window.Picture) Picture.tool(t === 'picture');
  }

  dock.addEventListener('click', e => {
    if (e.target.closest('#dock-tape')) { if (window.Tape) Tape.add(); return; }
    const t = e.target.closest('[data-tool]'); if (t) { setTool(t.dataset.tool); return; }
    const c = e.target.closest('[data-ci]');
    if (c) {
      const i = +c.dataset.ci;
      if (e.altKey) { setMix(i, null); return; }     // the house colour, back in the pot
      if (i === ci) { openMix(i); return; }          // the one already chosen: mix your own
      ci = i; markTools(); return;
    }
    if (e.target.closest('#dock-undo')) {
      while (made.length && made[made.length - 1].k === 'pic') {
        const p = made.pop();
        if (window.Picture && Picture.undo(p.id)) return;   // gone already? keep stepping back
      }
      if (made.length) made.pop();
      store.update(st => { st.items.pop(); });
      return;
    }
    if (e.target.closest('#dock-clear')) {
      if (!S().items.length) return;
      if (confirm('Wipe everything drawn on the paper? This cannot be undone.')) store.update(st => { st.items = []; });
    }
  });

  /* ── mixing your own ──────────────────────────────────────────
     The system picker wants a hex, and a house colour is a token only the skin
     can resolve — so the input is loaded with the colour the swatch is ACTUALLY
     painted, read a moment before the dialog opens. Mix in horror, and you
     start from the ink horror uses.

     What comes back is kept in the wall's own store, beside the drawing, and
     applies to NEW marks only: everything already on the paper holds the
     colour it was made with. */
  let mixI = -1;
  const hx = n => ('0' + (+n).toString(16)).slice(-2);

  function openMix(i) {
    const inp = $('dock-mix'), b = dock.querySelector('.dock-sw[data-ci="' + i + '"]');
    if (!inp || !b) return;
    const m = getComputedStyle(b).backgroundColor.match(/\d+/g);
    if (m) inp.value = '#' + hx(m[0]) + hx(m[1]) + hx(m[2]);
    mixI = i;
    inp.click();                         // still inside the click that asked for it
  }

  function setMix(i, v) {
    store.update(st => { const p = (st.pal || []).slice(); p[i] = v || null; st.pal = p; });
    buildDock(); markTools();
  }

  // dragging about in the picker fires a stream of 'input' and one 'change' at
  // the end of it, so the swatch follows the finger and only the answer is kept
  dock.addEventListener('input', e => {
    if (e.target.id !== 'dock-mix' || mixI < 0) return;
    const b = dock.querySelector('.dock-sw[data-ci="' + mixI + '"]');
    if (b) b.style.setProperty('--sw', e.target.value);
  });
  dock.addEventListener('change', e => {
    if (e.target.id === 'dock-mix' && mixI >= 0) setMix(mixI, e.target.value);
  });

  opts.addEventListener('click', e => {
    const pic = e.target.closest('[data-pic]');
    if (pic) { if (window.Picture) Picture.onOpt(pic); return; }
    const b = e.target.closest('[data-pw],[data-sk],[data-po],[data-fo],[data-sc],[data-px]');
    if (!b) return;
    if (b.dataset.px != null) { pi = +b.dataset.px; syncGrid(); buildOpts(); return; }
    if (b.dataset.pw != null) pw = +b.dataset.pw;
    if (b.dataset.sk != null) sk = +b.dataset.sk;
    if (b.dataset.po != null) po = +b.dataset.po;
    if (b.dataset.fo != null) fo = +b.dataset.fo;
    if (b.dataset.sc != null) sc = +b.dataset.sc;
    markOpts();
  });

  // escape drops back to move, the way it drops the hand tool — but a sheet
  // over the bench is the nearer thing to be rid of, so it goes on the first
  // press and the tool on the second
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape' || tool === 'move' || noteBox) return;
    if (window.Picture && Picture.shut()) return;
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
           syncOpts: buildOpts,          // the + tool redraws its own row through this
           mark,                         // …and tells undo what it just put up
           PAL, PW, PO, SK, FONTS, STICKIES, STAMPS, stickyArt };
})();
