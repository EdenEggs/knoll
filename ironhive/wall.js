/* ─── THE TOOL DOCK ────────────────────────────────────────────────────────
   The dock from the coming-soon page's hero, brought to the bench: a dark
   pill at the bottom centre with move / draw / image / text, one ink and
   the colour wheel that changes it, undo and delete, and a second row of
   options that appears when the chosen tool has any and folds away in move
   mode.

   The same numbers as the hero, deliberately — 3 sticker opacities, 5 stamps,
   5 fonts — so the two feel like one product:

     PW  a slider, 2.5 → 1400px    PO  100% / 55% / 25%
     SK  hat · gnome · toadstool · big beard · lantern
     FONTS  Sans · Display · Serif · Mono · Marker

   TWO THINGS THE HERO HAS NOT GOT
     THE PEN'S WIDTH IS A SLIDER, NOT FOUR DOTS  The hero offered four widths
     and so did this row until now. The pen goes to 1400px — a hundred times
     the widest of those four — and no row of buttons reaches that, so WIDTH
     is one slider with the number it is on beside it.

     ITS TRAVEL IS GEOMETRIC, NOT LINEAR: equal RATIOS per step rather than
     equal pixels. Linear over a range of 560× would put all four of the old
     widths inside the first one percent of the track, where 2.5 and 14 are
     the same thumb position and nothing fine could be picked at all. Each
     step is the one before it times a constant instead, so the thumb is as
     precise at 3px as it is at 900.

     THE FOUR OLD NUMBERS ARE KEPT for the marks already drawn. A stroke made
     before this holds an INDEX into PW (`w`); one made since holds its width
     in world px (`sw`); paint reads whichever it finds, so an old drawing
     comes out at exactly the widths it was drawn at and nothing is migrated.

     PIXEL  off · 10 · 20 · 40 — the pen squares off and fills the bench's
     own grid a cell at a time. Choosing a size re-cuts that grid to match
     (Lab.grid), so the squares you can SEE are the pixels you get — until you
     zoom out far enough that lab.js starts drawing every second one. A drag is
     one piece however many cells it covers, so undo takes the shape rather
     than the last square of it, and moving one afterwards snaps by cells.

     BLUR  off · 5 · 12 · 26 — the third thing the pen can be, and the only
     one that puts no ink down at all. It rubs: drag it over two colours that
     meet and they bleed into each other, at the width the slider says and as
     hard as the number says. A smear is a LENS and not a change to the marks
     — what is under it is untouched, so moving one off comes back sharp —
     which is also why every smear sits over every mark. See THE SMEAR.

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
  /* PW IS HISTORY, NOT A SETTING. The four widths the row used to offer, kept
     because every stroke drawn before the slider stores an INDEX into them.
     Nothing picks out of it any more — see THE PEN'S WIDTH, below. */
  const PW = [2.5, 4.5, 8, 14];
  /* …and what the slider offers instead: the same finest nib it always had,
     a hundred times the widest, and the width it opens on — 4.5, the second
     of the four, exactly the pen this bench has always started with. STEPS is
     how many notches the thumb has across that whole range, which is also how
     far one arrow key moves it. */
  const PEN = { min: 2.5, max: 1400, def: 4.5, steps: 240 };
  const PO = [1, 0.55, 0.25];
  const IMG = [160, 320, 640];           // a stamped tracing's long edge, in world px — S, M, L
  const VID = [640, 360];                // …and a video's natural size, which is 16:9
  const PIX = [0, 10, 20, 40];           // 0 is a free hand; the rest are cells, in world units
  /* HOW HARD THE SMEAR PULLS — 0 is an ordinary pen, the rest are the blur's
     radius in world px. World px and not screen px, because a smear is part
     of the drawing: zoom in and you are looking at the same soft edge closer
     up, not a softer one. Three of them because three is the choice a person
     can make without thinking; the cost of a fourth is a whole extra pass
     over the wall (see THE SMEAR). */
  const BLUR = [0, 5, 12, 26];
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
  const MAX = 600;                       // pieces before the oldest starts dropping

  const store = Lab.store('wall', () => ({ items: [] }));
  const S = () => store.get();

  // tool choices are a mood, not a document — they live for the session only,
  // the same way the hero treats them
  // pw is A WIDTH IN WORLD PX now, and no longer an index into PW; bi is which
  // of BLUR the pen is smearing at, 0 being not smearing at all
  let tool = 'move', ci = 1, pw = PEN.def, po = 0, fo = 0, sk = 0, pi = 0, bi = 0, nw = 260, iz = 1;
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

  /* ── THE PEN'S WIDTH ──────────────────────────────────────────────────────
     A notch on the slider ⇄ a width in world px, and back. The map is
     GEOMETRIC — min × ratio^(n/steps) — so every notch multiplies the one
     before it by the same amount rather than adding the same amount to it.
     Over 2.5 → 1400 that is ×1.0266 a notch: sixteen hundredths of a pixel
     down at the fine end where sixteen hundredths is the whole difference
     between two pens, and thirty-six pixels up at the coarse end where it is
     not. Linear travel would have spent 99% of the track above 20px.

     penTidy is what stops the readout saying 37.41935483870968: a tenth is
     as fine as the pen is worth setting under 20px, and a whole pixel is
     over it — which also means several notches near the top land on the same
     number, exactly as they should. The width STORED is the tidied one, so
     what the row says is what the mark is. */
  const penAt = n => {
    const w = PEN.min * Math.pow(PEN.max / PEN.min, clamp(0, 1, n / PEN.steps));
    return w < 20 ? Math.round(w * 10) / 10 : Math.round(w);
  };
  const penPos = w => Math.round(PEN.steps *
    Math.log(clamp(PEN.min, PEN.max, w) / PEN.min) / Math.log(PEN.max / PEN.min));
  /* AND THE WIDTH A MARK WAS DRAWN AT, off a mark that may predate the
     slider: `sw` is a width in world px and is what every stroke drawn since
     carries; `w` is an index into PW and is what everything before it
     carries. An old drawing comes out at the four widths it was drawn at. */
  const penOf = it => it.sw > 0 ? it.sw : (PW[it.w] || PW[0]);
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

     Drawn in WORLD COORDINATES rather than inside a translated <g>. The
     original reason was that dragging a piece wrote style.transform on it and
     a CSS transform beats a transform ATTRIBUTE, so a sticky carrying one
     would leap to the top-left corner the moment you picked it up — which is
     exactly what stamped stickers, which DO carry one, were doing until
     beginMove was taught to compose the two (2026-09-08). That hazard is
     gone; this stays as it is because it is drawn this way and works, and
     because none of them is tilted — a rotation would have to go on the same
     attribute, and the words are drawn straight by whoever called this.

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

  /* ── AND A SECOND LAYER, FOR WHAT THE POINTER IS OVER ────────────────────
     One rectangle at a time and nothing else, which is the whole point of it
     being its own layer rather than a style on the piece.

     THE PIECE ITSELF MUST NOT BE TOUCHED. Hover used to put a pink
     drop-shadow on it, and later an outline; both make the browser give that
     piece a surface of its own, and a piece with a surface of its own GOES
     BLANK for a frame whenever the layer is rasterised again — which is every
     zoom. That is the white box people were seeing under the pointer, and
     with the drop-shadow it also cost a 220ms frame on a busy sheet, because
     a filter re-rasters the lot. Measured, on 3446 shapes at 36%:

       drop-shadow 218-230ms · outline 36-55ms (and still blanks) · this 6ms

     Drawn over here, the artwork is never invalidated at all: the only thing
     that changes is a nearly empty layer with one rect in it. */
  const over = document.createElementNS(SVGNS, 'svg');
  over.setAttribute('class', 'wall-over');
  over.setAttribute('aria-hidden', 'true');
  world.insertBefore(over, svg.nextSibling);      // just over the ink, never part of it

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

  /* ── WHICH WAY UP A STAMPED PIECE IS, AND WHICH WAY ROUND ────────────────
     `r` is degrees clockwise and `fx`/`fy` are the two mirrors, all three
     about the piece's own centre. A piece that has never been turned or
     flipped carries none of them, so every sticker stamped before any of this
     existed paints byte for byte as it always did.

     THEY GO AT THE FRONT, which is the whole trick. SVG applies a transform
     list left to right, so the head below turns and mirrors the world that
     the rest of the string is then drawn in: the translate that centres the
     artwork and the scale that sizes it are untouched, and neither has to
     know either exists.

     AND THE ARTWORK IS HUNG ON THE ORIGIN, not at x,y. It used to be
     `rotate(r,x,y) translate(x - w·s/2, …)` — the piece's own point written
     twice, once in the rotate and once in the translate. Pulling the place
     out to the front and leaving the artwork centred on 0,0 is what makes a
     mirror exact rather than approximate: the whole transform is now
     T(x,y)·R(r)·F·A₀, and a flip of a GROUP about some other line is then
     one substitution — see flip(). With the old shape there was no clean
     place to put F at all. */
  const head = it =>
    'translate(' + round(it.x) + ',' + round(it.y) + ')'
    + (it.r ? ' rotate(' + round(it.r) + ')' : '')
    + (it.fx || it.fy ? ' scale(' + (it.fx ? -1 : 1) + ',' + (it.fy ? -1 : 1) + ')' : '');

  // a <g> whose artwork is w×h drawn at scale s, hung centred on the piece
  const put = (it, w, h, s) =>
    head(it) + ' translate(' + round(-w * s / 2) + ',' + round(-h * s / 2) + ') scale(' + s + ')';

  // …and the same turn and mirror for something already drawn in world units,
  // which is the gif: an <image> keeps its own x/y/width/height
  const about = it => (it.r || it.fx || it.fy)
    ? head(it) + ' translate(' + round(-it.x) + ',' + round(-it.y) + ')' : '';

  /* THE MARKS TURN WITH A PIECE BUT ARE NOT MIRRORED. The box is symmetric,
     so a mirror would move nothing you can see except the two handles — and a
     corner that jumps to the far side the moment you flip is a corner you
     have to hunt for. So the marks get the rotation alone. */
  const spin = it => it.r ? 'rotate(' + round(it.r) + ',' + round(it.x) + ',' + round(it.y) + ')' : '';

  /* ── WHICH ORDER THEY GO ON IN ───────────────────────────────────────────
     An svg has no z-index: whatever is hung last is on top, so the pile IS
     the order paint() appends the nodes in. For most of this file's life that
     was simply the order they were made in — the store's own array — and the
     right-click menu (see ITS MENU, below) is the first thing that can change
     it.

     THE ARRAY ITSELF IS NEVER REORDERED. An index into store().items is the
     NAME of a piece here: the pick is a set of them, a move in flight holds
     some, a note being edited is one, and every entry this file puts on
     lab.js's undo stack closes over one. Shuffling the array would rename all
     of them at once — which is the same reason the delete tool nulls a slot
     rather than splicing it out. So a piece carries the layer it has been put
     on, `L`, and the array stays exactly as it was: paint reads the pile,
     everything else goes on reading the array.

     A PIECE WITH NO L HAS NEVER BEEN THROUGH THE PILE. Every raise and lower
     numbers the whole lot 0…n−1, so a piece without a number is newer than
     the last time that happened and belongs on top, in the order it was made.
     Nothing carries an L until the first raise, which is when this answers
     the array straight back, exactly as it always did. */
  function order() {
    const items = S().items, old = [], now = [];
    items.forEach((it, i) => { if (it) (isFinite(it.L) ? old : now).push(i); });
    old.sort((a, b) => (items[a].L - items[b].L) || (a - b));
    return old.concat(now);
  }

  function paint() {
    svg.textContent = '';
    svg.appendChild(reach);              // re-hung after every wipe
    /* EVERYTHING GOES IN ONE GROUP, and that group has a name. The smear
       needs something to blur, and what it blurs is the wall — so the wall
       has to be one thing a <use> can point at rather than a hundred loose
       nodes. Nothing else changes: byIndex asks the layer, not the group. */
    const pile = el('g', { id: PILE });
    svg.appendChild(pile);
    const written = [];                  // the notes on parchment, measured below
    const paints = [];                   // …and which of them the pen made, for the smear
    const all = S().items;
    order().forEach(i => {                 // the delete tool nulls a slot rather
      const it = all[i];                   // than splicing it, so indices held
      if (editing && i === editing.i) return;   // by anything else stay true
      // …and the one that is playing is the film out there, not a picture of
      // it in here. Its box and its handles are drawn all the same: boxOf
      // works a video out from x/y/z and never asks for a node.
      if (player && i === player.i) return;
      let node;
      if (it.k === 's') {
        node = el('path', { d: it.d, fill: 'none', stroke: ink(it.c),
          'stroke-width': penOf(it), 'stroke-linecap': 'round', 'stroke-linejoin': 'round' });
      } else if (it.k === 'b') {
        /* A SMEAR PAINTS NOTHING YOU CAN SEE. What you see is the blurred
           copy of the wall showing through it, hung over this layer by
           smear(). This is its HANDLE: the same stroke in an ink that is not
           there, so a press finds it, a band catches it, the delete tool
           reaches it and the crop marks have something to measure. A stroke
           painted in `transparent` is still painted, which is the whole
           difference between it and one painted in `none`. */
        node = el('path', { d: it.d, fill: 'none', stroke: 'transparent',
          'stroke-width': penOf(it), 'stroke-linecap': 'round', 'stroke-linejoin': 'round' });
      } else if (it.k === 'p') {
        // one path, one subpath per cell, and no anti-aliasing to furr the
        // seams where two of them meet
        node = el('path', { d: it.d, fill: ink(it.c), stroke: 'none', 'shape-rendering': 'crispEdges' });
      } else if (it.k === 'k') {
        node = el('g', { transform: put(it, 64, 64, it.z),
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
        node = el('g', { transform: put(it, f.w, f.h, s),
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
        node = el('g', { transform: put(it, st.w, st.h, sc),
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
        // the only stamped kind drawn from x/y rather than a transform, so a
        // turned or mirrored one is given the attribute it otherwise does without
        const a = about(it);
        if (a) node.setAttribute('transform', a);
      } else if (it.k === 'v') {
        // a video, asleep: its thumbnail and a play badge, sized and turned
        // the way a tracing is — long edge it.z, centred on where it was put
        const s = it.z / Math.max(it.w, it.h, 1);
        node = el('g', { transform: put(it, it.w, it.h, s) });
        node.innerHTML = videoArt(it);
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
      node.setAttribute('class', pick.has(i) ? 'wall-item wall-picked' : 'wall-item');
      /* THE PEN'S OWN MARKS ARE NAMED, so the smear can point at them. Only
         these two: everything else on this wall is artwork somebody drew and
         is not the blur's business (see WHAT A SMEAR IS ALLOWED TO TOUCH).
         The id is the index, which is unique and is thrown away and made
         again with the node on the next repaint. */
      if (PAINTED[it.k]) { const id = 'wall-p' + i; node.setAttribute('id', id); paints.push(id); }
      pile.appendChild(node);
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

    // the smears, over the pile and blurring only what the pen put there
    smear(paints);
    // last, and over everything: whatever is picked wears its crop marks, and
    // one picked piece on its own is offered a corner to scale by
    paintMarks();
    // …and the film, which is not on this layer at all, is put back over the
    // piece it belongs to — every repaint, since a resize is a repaint
    placeVideo();
    // …and the hover box, whose piece may have moved or gone under it
    paintOver();
  }

  /* ── THE SMEAR: BLENDING WHAT IS ALREADY THERE ───────────────────────────
     The blur brush does not put ink down. It puts down a SHAPE THROUGH WHICH
     THE WALL IS SEEN BLURRED — so two colours that meet under it bleed into
     each other, which is what blending is.

     HOW IT IS DONE, in one sentence: the whole pile is drawn a second time
     with a gaussian blur on it, and a mask lets that second copy show only
     where the brush has been. Outside the brush stroke the mask is black and
     you are looking at the sharp original underneath; inside it you are
     looking at the blurred copy; and the mask's own edge is softened, or the
     smear would have a cut-out edge round it and read as a sticker rather
     than as a smudge.

     ONE PASS PER STRENGTH, NOT PER STROKE. A filter is a property of a group,
     so every stroke smeared at the same radius shares one mask, one filter
     and one copy of the wall. Fifty smears at one strength cost what one
     costs; using all three strengths costs three. That is the whole reason
     BLUR is a short list of radii and not a slider like the width.

     AND THE FILTER IS GIVEN A REGION. Left to itself a filter on a copy of
     the wall would rasterise the WHOLE wall at every repaint, most of it to
     throw away — so both the filter and the mask are told, in world units,
     the box the smears actually reach, grown by the pen and by three sigma of
     the blur (past three sigma a gaussian has nothing left to give).

     WHAT IT BLURS IS WHATEVER IS UNDER IT NOW. A smear is a lens, not a
     change to the marks: rub one over a drawing and the drawing is untouched
     underneath — move the smear away and everything is sharp again, which is
     the undo nobody has to think about. It also means every smear sits above
     every mark, so a line drawn afterwards through a smear comes out soft
     too. Raise and lower order the smears among themselves. */
  const PILE = 'wall-pile';
  let smearN = 0;                        // ids have to be new on every repaint

  // the box a path reaches, read off its own numbers — the same pairs shift()
  // walks, and cheaper than asking the document for a bbox on every repaint
  function spanOf(d, into) {
    String(d).replace(/(-?[\d.]+)\s+(-?[\d.]+)/g, (m, a, bb) => {
      const x = +a, y = +bb;
      if (x < into.x0) into.x0 = x;
      if (x > into.x1) into.x1 = x;
      if (y < into.y0) into.y0 = y;
      if (y > into.y1) into.y1 = y;
      return m;
    });
    return into;
  }

  /* WHAT A SMEAR IS ALLOWED TO TOUCH: the paint, and only the paint. A stroke
     and a square of pixels are things you laid down with the pen and blending
     them is the whole point; a sticker, a tracing, a stamp, a gif, a note and
     a film are ARTWORK, and rubbing a thumb across a piece of artwork somebody
     drew for you is not blending, it is damage. So the copy the blur is run
     over is not the pile — it is a list of the pen's own marks, gathered as
     <use>s pointing back at the nodes already painted, which costs a
     reference each rather than a second copy of the drawing.

     It lives in <defs> because that is the one place an SVG will hold
     something to be referenced without drawing it where it stands. */
  const PAINTED = { s: 1, p: 1 };        // the two kinds the pen makes
  const PAINT = 'wall-paint';

  function smear(paints) {
    if (!paints.length) return;          // nothing painted, nothing to blend
    const items = S().items, by = new Map();
    order().forEach(i => {
      const it = items[i];
      if (!it || it.k !== 'b') return;
      /* sr AND NOT r. `r` is the angle a piece has been turned to, on every
         kind that carries one, and spin() writes it into a transform the
         moment a piece is picked — so a smear that kept its radius there drew
         its crop marks at rotate(12,NaN,NaN) and Chrome threw the lot away.
         The width beside it is `sw`, so the radius is `sr`. */
      const r = it.sr > 0 ? it.sr : BLUR[1];
      if (!by.has(r)) by.set(r, []);
      by.get(r).push(it);
    });
    if (!by.size) return;

    const defs = el('defs', {});
    // the paint, gathered where a filter can be run over it and nowhere else
    const src = el('g', { id: PAINT });
    paints.forEach(id => src.appendChild(el('use', { href: '#' + id })));
    defs.appendChild(src);
    /* AND IT ANSWERS NOTHING. The blurred copy lies over the whole pile, so
       left hit-testable it would be the thing every press with a drawing tool
       up found — the piece under a smear would have no menu and no reach. The
       smear's own handle is down in the pile with the marks; this is a
       picture. (In move mode the layer is already inert and this changes
       nothing; with a pen out it is the difference between the two.) */
    const out = el('g', { class: 'wall-smear', 'pointer-events': 'none' });
    by.forEach((list, r) => {
      const tag = 'sm' + (++smearN);
      // how far this strength reaches, and how much of the wall it needs
      const s = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
      let pen = 0;
      list.forEach(it => { spanOf(it.d, s); pen = Math.max(pen, penOf(it)); });
      if (!isFinite(s.x0)) return;
      const grow = pen / 2 + r * 3;
      const box = { x: round(s.x0 - grow), y: round(s.y0 - grow),
                    width: round(s.x1 - s.x0 + grow * 2), height: round(s.y1 - s.y0 + grow * 2) };

      /* THE BLUR ITSELF, and one plain gaussian is the whole of it.

         WHERE TWO COLOURS MEET — the thing this brush is for — the blurred
         copy is fully opaque, because the blur of two opaque marks touching
         is opaque, so laying it over them replaces both edges with the mix.
         That case is exact.

         WHERE THE PAINT MEETS BARE PAPER it is not: a gaussian goes
         translucent there, so the mark's own outer edge is still faintly
         under the soft one and the smear reads as a halo rather than a fade.
         Two ways to be rid of that were built and measured and neither is
         worth what it costs: cutting the marks out from under the copy needs
         a mask each (330ms a repaint on 500 strokes) or one shared mask whose
         region is the whole sheet (1.7 SECONDS), and forcing the copy opaque
         with an feFuncA slope hardens the silhouette back up, which is a
         smaller blur rather than a better one. A wall repainted on every
         stroke cannot pay either. So: exact where colours meet, a soft halo
         at the outside edge, and cheap. */
      const f = el('filter', Object.assign({ id: tag + 'f', filterUnits: 'userSpaceOnUse' }, box));
      f.appendChild(el('feGaussianBlur', { stdDeviation: r, edgeMode: 'duplicate' }));
      defs.appendChild(f);

      /* the mask's own softness. A smear that ends in a hard line is a shape;
         one that fades out is a smudge — so the mask is drawn and then blurred
         itself, by a fraction of the pen rather than a fixed number, which is
         what keeps a hairline smear from fading away to nothing and a broad
         one from having a crisp rim. */
      const soft = el('filter', Object.assign({ id: tag + 's', filterUnits: 'userSpaceOnUse' }, box));
      soft.appendChild(el('feGaussianBlur', { stdDeviation: round(clamp(1, 40, pen * 0.14)) }));
      defs.appendChild(soft);

      const mask = el('mask', Object.assign({ id: tag + 'm', maskUnits: 'userSpaceOnUse' }, box));
      const inside = el('g', { filter: 'url(#' + tag + 's)' });
      list.forEach(it => inside.appendChild(el('path', {
        d: it.d, fill: 'none', stroke: '#fff', 'stroke-width': penOf(it),
        'stroke-linecap': 'round', 'stroke-linejoin': 'round' })));
      mask.appendChild(inside);
      defs.appendChild(mask);

      out.appendChild(el('use', { href: '#' + PAINT,
        filter: 'url(#' + tag + 'f)', mask: 'url(#' + tag + 'm)' }));
    });
    svg.appendChild(defs);
    svg.appendChild(out);
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
      const g = PIX[pi], sm = BLUR[bi];
      /* THE SMEAR IS DRAWN AS A GHOST OF ITSELF. What it will actually do
         cannot be shown while the hand is moving — the blur is a second pass
         over the whole wall and re-running it sixty times a second is not a
         thing to do — so the drag lays down a pale band where the smudge is
         going to be, and the real one arrives on let go. Same shape, same
         width, so what you traced is what you get. */
      live = sm
        ? { pts: [p], id: e.pointerId, sm: sm,
            node: el('path', { fill: 'none', stroke: '#fff', opacity: .34, 'stroke-width': pw,
                               'stroke-linecap': 'round', 'stroke-linejoin': 'round' }) }
        : g
        ? { g: g, seen: new Set(), d: '', last: p, id: e.pointerId,
            node: el('path', { fill: ink(nib()), stroke: 'none', 'shape-rendering': 'crispEdges' }) }
        : { pts: [p], id: e.pointerId,
            node: el('path', { fill: 'none', stroke: ink(nib()), 'stroke-width': pw,
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
      /* A PRESS ON A STICKER THAT IS ALREADY DOWN TAKES HOLD OF IT, which is
         the courtesy the text tool pays a note it lands on a few lines below:
         the piece under the pointer is the thing you meant, not somewhere to
         put another one.

         But a stamp IS a press, so the two cannot be told apart by what is
         under the pointer — only by the gesture. A QUICK TAP stamps another
         on top, because overlapping is how a scene gets built and the tool
         would be much the poorer without it; PRESSING AND HOLDING, or moving
         at all, picks up the one you pressed. Whichever comes first decides,
         and until one of them does nothing has happened. */
      const t = e.target.closest('.wall-item');
      if (t) { armGrab(t, e); e.preventDefault(); e.stopPropagation(); return; }
      // …and on bare paper, a sticker out of the drawer: the same press, the
      // same two numbers, and the same drawer asked to say why there is none
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

  /* ── PRESS AND HOLD, with the sticker tool up ───────────────────────────
     The referee between the two things a press on an already-stamped sticker
     could mean. It commits to neither at first: it starts a clock, watches
     for movement, and hands the press to whichever of the three endings
     arrives first.

       · the clock runs out ....... you are holding it: pick it up
       · the pointer moves ........ you are dragging it: pick it up
       · you let go before either . it was a tap: stamp another one there

     A hold that becomes a drag is the ordinary way anyone moves anything, so
     it does not wait out the clock — the slop is only there so that the
     shiver in a real finger is not read as a drag. And the anchor handed to
     beginMove is the ORIGINAL press, not the moment the clock ran out, so the
     piece keeps its grip on the point you actually pressed and does not jump
     under the pointer as it comes up. */
  const GRAB_MS = 180;        // long enough that stamping never feels sticky
  const GRAB_SLOP = 3;        // world px of wobble that is still a tap
  let grab = null;

  function grabOff() {
    if (!grab) return null;
    clearTimeout(grab.timer);
    window.removeEventListener('pointermove', grabMove, true);
    window.removeEventListener('pointerup', grabEnd, true);
    window.removeEventListener('pointercancel', grabEnd, true);
    const g = grab;
    grab = null;
    return g;
  }

  function armGrab(t, e) {
    grabOff();                                   // a second press supersedes the first
    const p = W(e.clientX, e.clientY);
    grab = { t: t, id: e.pointerId, x: p.x, y: p.y, ev: e, timer: 0 };
    grab.timer = setTimeout(take, GRAB_MS);
    window.addEventListener('pointermove', grabMove, true);
    window.addEventListener('pointerup', grabEnd, true);
    window.addEventListener('pointercancel', grabEnd, true);
  }

  function take() {
    const g = grabOff();
    if (g) beginMove(g.t, g.ev, true);   // the one you held, whatever move mode has picked
  }

  function grabMove(e) {
    if (!grab || e.pointerId !== grab.id) return;
    const p = W(e.clientX, e.clientY);
    if (Math.abs(p.x - grab.x) > GRAB_SLOP || Math.abs(p.y - grab.y) > GRAB_SLOP) take();
  }

  function grabEnd(e) {
    if (!grab || (e && e.pointerId !== grab.id)) return;
    const g = grabOff();
    const s = window.Stickers && Stickers.armed();
    if (s) stickerAt(s, g.x, g.y);
    else if (window.Stickers) Stickers.nudge();
  }

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
    const g = live.g, d = live.d, pts = live.pts, sm = live.sm;
    live.node.remove();
    live = null;
    if (g) { if (d) add({ k: 'p', c: nib(), g: g, d: d }); return; }
    // a smear carries no ink: what it holds is where it went, how wide, and
    // how hard it pulls — the colours it blends are whatever it lands over
    if (sm) { add({ k: 'b', sw: pw, sr: sm, d: pathOf(pts) }); return; }
    // sw, not w: the width itself, not a row of four the row no longer has
    add({ k: 's', c: nib(), sw: pw, d: pathOf(pts) });
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
    // …and the last clause is the only place the bench says that a link is a
    // film, which is the whole of how anybody finds out
    hint.textContent = 'enter to pin it · shift+enter for a new line · ctrl b/i/u · ' +
                       'ctrl [ ] for size · a youtube link pins as a video';

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
    /* AND THE BOX GOES DARK UNDER A PALE INK. The box is white paper, which
       is the right guess for the ink people write in most of the time and the
       wrong one for white: white on white is a note you cannot read while you
       are writing it, and you find out what you typed only once it is pinned.

       So the field follows the ink rather than the other way round. What is
       read is the COMPUTED colour, which is the one place a house token and a
       hex off the wheel look the same — `var(--pink-2)` means nothing to
       arithmetic until the browser has resolved it. */
    if (noteBox) noteBox.classList.toggle('wall-note-dark', paleInk());
    grow();
  }

  /* Rec.709 luma, which is how a screen actually mixes the three — the eye
     takes green for most of its brightness, and a flat average would call
     bright blue "pale" and mid green "dark". Anything above two thirds needs
     something behind it. */
  function paleInk() {
    if (!noteIn) return false;
    const m = /rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/.exec(getComputedStyle(noteIn).color);
    if (!m) return false;
    return (0.2126 * +m[1] + 0.7152 * +m[2] + 0.0722 * +m[3]) / 255 > 0.66;
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
    /* A LINK PINS AS A FILM, whether it is a new note or an old one being
       written over — the gesture is the same one either way, so the answer to
       it has to be. A video is not a note in any respect (no face, no size,
       no width, no words), so an edited one is REPLACED in its slot rather
       than assigned over: leaving a note's keys on it would be a piece
       claiming to be two things. The slot itself is kept, which is its place
       in the stack and what undo and the pick know it by, and so is the
       layer it had been raised to. */
    const vid = videoFrom(t);
    if (ed) {
      store.update(st => {
        const old = st.items[ed.i];
        if (!old) return;                // taken off the wall while it was open
        if (!t) { st.items.splice(ed.i, 1); return; }
        if (vid) {
          st.items[ed.i] = Object.assign(vid,
            { x: round(old.x + VID[0] / 2), y: round(old.y) },
            isFinite(old.L) ? { L: old.L } : {});
          return;
        }
        Object.assign(old, { c: c, f: fo, t: t, sz: TSZ[fz],
          w: round(nw), b: fb, i: fi, u: fu, a: fa });
      });
      return;
    }
    /* …and a new one lands where the box was: its left edge on the click, its
       middle on the line the words were sitting on, which is where the box
       looked like it was. A video is centred on x/y, so half its width is
       added to put the same edge in the same place. */
    if (vid) { add(Object.assign(vid, { x: round(p.x + VID[0] / 2), y: round(p.y) })); return; }
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

  /* ── A YOUTUBE LINK IS A VIDEO, NOT A NOTE ───────────────────────────────
     Write one into the text box and pin it, and what goes on the paper is the
     film rather than the address of it. The text tool is the way in because a
     link IS text — you paste it into the same box you write anything else in,
     and the box is already where a paste lands.

     THE WHOLE NOTE HAS TO BE THE LINK. A sentence with a url in it is a
     sentence, and turning it into a video would lose the words either side —
     so the pattern is anchored at both ends. Anything else is a note, exactly
     as it always was.

     WHAT IS KEPT IS THE ELEVEN CHARACTERS, not the url. Every shape of
     youtube address — watch?v=, youtu.be/, /embed/, /shorts/, /live/, with or
     without the share tail — names the same video, and the id is the only part
     of that any of them agree on. A start time is kept beside it if the link
     carried one, since a link copied at 2:14 was copied at 2:14 on purpose.

     IT IS THE SAME KIND OF PIECE AS A GIF: w and h are its natural size, z is
     its long edge in world px, x and y are its middle. That one sentence is
     what gives it the corner, the turn ring, the crop marks, the menu, the
     move, the copy and the delete without a line of code — see SCALABLE. */
  const YT = /^(?:https?:\/\/)?(?:www\.|m\.|music\.)?(?:youtube\.com\/(?:watch\?(?:[^\s]*&)?v=|embed\/|shorts\/|live\/|v\/)|youtu\.be\/)([\w-]{11})(?:[?&#][^\s]*)?$/i;

  // 90, or 1h2m3s — youtube writes both, and the player takes seconds
  function ytAt(u) {
    const m = /[?&#](?:t|start)=([\dhms]+)/i.exec(u);
    if (!m) return 0;
    if (/^\d+$/.test(m[1])) return +m[1];
    const g = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/i.exec(m[1]);
    return g ? (+g[1] || 0) * 3600 + (+g[2] || 0) * 60 + (+g[3] || 0) : 0;
  }

  /* the item a link makes, or null if the words are only words. x and y are
     the caller's: a new note knows where it was clicked, an edited one knows
     where it already is. */
  function videoFrom(t) {
    const m = YT.exec(String(t || '').trim());
    if (!m) return null;
    const at = ytAt(t);
    const it = { k: 'v', id: m[1], w: VID[0], h: VID[1], z: VID[0] };
    if (at) it.at = at;
    return it;
  }

  /* ASLEEP IT IS A PICTURE. The thumbnail off youtube's own server, a frame
     round it and a play badge in the middle — drawn in the piece's natural
     box, so put() sizes and turns the lot. hqdefault is the one thumbnail
     every video has (maxres is not), and it is 4:3 with the film letterboxed
     inside it, so `slice` crops it back to the shape it was shot in.

     The badge is a <g class="wall-play"> because the press handler asks for
     one by that name: pressing the badge starts the film, pressing anywhere
     else on the picture picks it up like any other piece. A dark disc and a
     white triangle rather than youtube's red, since the thumbnail underneath
     already says whose it is and the bench has its own colours. */
  const ytThumb = id => 'https://i.ytimg.com/vi/' + encodeURIComponent(id) + '/hqdefault.jpg';

  function videoArt(it) {
    const w = it.w, h = it.h, cx = w / 2, cy = h / 2, r = Math.min(w, h) * 0.15;
    const tri = 'M' + round(cx - r * 0.3) + ' ' + round(cy - r * 0.45) +
                'L' + round(cx + r * 0.48) + ' ' + round(cy) +
                'L' + round(cx - r * 0.3) + ' ' + round(cy + r * 0.45) + 'Z';
    return '<rect width="' + w + '" height="' + h + '" fill="var(--ink-2)"/>' +
      '<image href="' + ytThumb(it.id) + '" x="0" y="0" width="' + w + '" height="' + h +
        '" preserveAspectRatio="xMidYMid slice"/>' +
      '<rect width="' + w + '" height="' + h + '" fill="none" stroke="var(--ink-2)" stroke-width="3"/>' +
      '<g class="wall-play">' +
        '<circle cx="' + cx + '" cy="' + cy + '" r="' + round(r) + '" fill="rgba(16,12,20,.66)"' +
          ' stroke="#fff" stroke-width="' + round(r * 0.09) + '"/>' +
        '<path d="' + tri + '" fill="#fff"/></g>';
  }

  /* ── AND AWAKE IT IS A PLAYER ────────────────────────────────────────────
     ONE AT A TIME. A youtube player is an iframe with a video decoder behind
     it; twenty of them on one sheet is a tab that swaps. Starting a second
     film puts the first one away, which is also what anybody watching two
     things at once actually wants.

     IT IS AN HTML BOX IN THE WORLD, THE WAY THE NOTE BOX IS, and not part of
     the layer paint() rebuilds. That is not tidiness either: paint() throws
     every node away and makes them again on ANY change to the wall, and an
     iframe rebuilt is an iframe that starts the film over — draw a line
     somewhere else on the paper and the video would jump back to zero. Out
     here it is written to, never rebuilt.

     AND IT IS OVER EVERYTHING ON THE PAPER while it runs (z-index in lab.css,
     see A VIDEO PLAYING ON THE PAPER). A film is the thing you are meant to be
     looking at, and a film behind a line somebody drew across it is not one.

     SO A PLAYING VIDEO IS THE FILM AND NOTHING ELSE — no crop marks, no
     corner, no place in the pick. They would all be under it, which is the
     same as not being there while costing a press to find out. Put it back to
     a picture and everything a piece can do comes back with it: pick it, size
     it by its corner, turn it, raise it, take it off the wall.

     PUT IT BACK with the ✕ in its corner or with escape. The ✕ is there
     because the piece itself is off the paper while the film is up, so there
     is nothing else to press — the same reason a strip of tape carries one.

     IT KEEPS PLAYING while you pan, zoom, draw or pick something else up: a
     video on a page does not stop because you looked away. The ✕ puts it
     away, so does escape, so does starting another, and so does taking this
     one off the wall.

     AND IT STAYS ON TOP WITH THE PEN OUT, which is the one thing being over
     the ink layer changes: a drawing tool takes the whole surface of that
     layer, but the film is above it, so a press over a playing video reaches
     the player rather than laying a line across it. Pause it, or put it back
     to a picture, and the paper under it is ordinary paper again. */
  let player = null;                     // { i, el } — which piece is playing, and its box

  /* AND A RELOAD IS ALWAYS THE WAY OUT. A player is DOM and never store, so a
     fresh page has none of its own — but a box CAN outlive the file that made
     it: leave a bench open while this file changes underneath it and the old
     box is still hung on the world with nothing left that knows about it.
     That is how somebody ends up with a film they cannot stop, because the
     moment you click into a youtube iframe the keyboard belongs to youtube
     and escape never reaches this page at all. So the first thing this does
     is sweep the world of anything calling itself a player. */
  world.querySelectorAll('.wall-video').forEach(n => n.remove());

  function playVideo(i) {
    const it = S().items[i];
    if (!it || it.k !== 'v') return false;
    if (player && player.i === i) return true;
    stopVideo();
    const box = document.createElement('div');
    box.className = 'wall-video';
    const f = document.createElement('iframe');
    /* nocookie is youtube's own no-tracking-until-you-play host, and it is
       the same player. autoplay is honest here: the film only ever starts
       because a hand pressed the badge, which is the gesture chrome asks for
       before it lets one make a sound. */
    f.src = 'https://www.youtube-nocookie.com/embed/' + encodeURIComponent(it.id) +
            '?autoplay=1&rel=0&modestbranding=1' + (it.at ? '&start=' + it.at : '');
    // `allow` carries fullscreen, so the old allowfullscreen attribute beside
    // it is both redundant and outranked — chrome says so in the console
    f.setAttribute('allow', 'autoplay; encrypted-media; picture-in-picture; fullscreen');
    f.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
    f.title = 'a video on the wall';
    box.appendChild(f);
    /* the ✕, over the film's own top right corner. It stops the pointer going
       any further so the press never reaches the player behind it, and it is
       not in the tab order of the page for the same reason the note's grip is
       not: it belongs to the box under the hand, not to a walk through it. */
    const x = document.createElement('button');
    x.type = 'button';
    x.className = 'wall-video-x';
    x.title = 'stop the film — escape does it too';
    x.setAttribute('aria-label', 'stop the film');
    x.textContent = '✕';
    x.addEventListener('pointerdown', ev => { ev.preventDefault(); ev.stopPropagation(); });
    x.addEventListener('click', ev => { ev.preventDefault(); ev.stopPropagation(); stopVideo(); });
    box.appendChild(x);
    world.appendChild(box);
    player = { i: i, el: box };
    /* AND IT LEAVES THE PICK. A playing piece is over the crop marks rather
       than under them, so a pick it was in would draw a box nobody can see
       round a corner nobody can reach — and the turn ring on its stalk would
       be the one part that did show, sticking out above a film for no reason.
       Whatever else was picked is left exactly as it was. */
    pick.delete(i);
    paint();                             // the picture steps aside for the film
    return true;
  }

  // taking the box out of the page is what stops the sound — there is no
  // other way to reach inside somebody else's iframe, and no need for one
  function stopVideo() {
    if (!player) return;
    const was = player.i;
    player.el.remove();
    player = null;
    if (S().items[was]) paint();         // …and the picture comes back
  }

  /* WHERE THE FILM IS, read off the piece on every repaint. The piece cannot
     be moved or sized while it plays, but it can still CHANGE under the film
     — an undo, a paste, a wall cleared — and every one of those is a repaint,
     so reading it here is enough and there is nothing to subscribe to. A
     piece that has gone (deleted, or undone) takes its player with it. */
  function placeVideo() {
    if (!player) return;
    const it = S().items[player.i];
    if (!it || it.k !== 'v') { stopVideo(); return; }
    const s = it.z / Math.max(it.w, it.h, 1), w = it.w * s, h = it.h * s;
    const st = player.el.style;
    st.left = round(it.x - w / 2) + 'px';
    st.top = round(it.y - h / 2) + 'px';
    st.width = round(w) + 'px';
    st.height = round(h) + 'px';
    // the piece's own turn and mirror, about the same centre the box has
    st.transform = (it.r ? 'rotate(' + round(it.r) + 'deg)' : '') +
      (it.fx || it.fy ? ' scale(' + (it.fx ? -1 : 1) + ',' + (it.fy ? -1 : 1) + ')' : '');
  }

  /* ── THE PICK ON THE WALL ────────────────────────────────────────────────
     lab.js has had a pick since the band was built: draw a rectangle on bare
     paper, everything it touches wears crop marks, and dragging any one of
     them carries the lot. But that pick only ever held GIZMOS — the panels
     with a document under them — and on this bench there are none. Everything
     you actually put on the Iron Hive's paper is a mark on the wall, so the
     band swept over twenty stickers, found nothing it recognised, and picked
     up nothing at all. This is the same pick, kept for the other half of what
     is on the paper.

     IT IS A SET OF INDICES, not of nodes. paint() throws every node away and
     builds them again on any change, so a pick made of elements would be a
     pick that survived nothing; an index outlives the repaint. It outlives a
     DELETE too, which is the whole reason the delete tool nulls a slot rather
     than splicing it out (see deleteItem) — the numbers either side stay
     true. A null slot is dropped from the pick when it is noticed rather than
     guarded at every use.

     LAB.JS OWNS THE GESTURE, this file owns the answer. The band is drawn,
     anchored and edge-scrolled over there and is one rectangle for the whole
     bench; when it is let go it asks both halves what fell inside it (see
     Wall.band, and endSweep in lab.js). Escape and a click on bare paper come
     through Lab.clearPick the same way. Two picks, one gesture, and nothing
     here has an opinion about when it starts. */
  const pick = new Set();

  function picked() {                      // the pick, minus anything deleted under it
    const items = S().items;
    pick.forEach(i => { if (!items[i]) pick.delete(i); });
    return [...pick];
  }
  function pickOne(i, on) {
    if (on) pick.add(i); else pick.delete(i);
    paint();
  }
  function clearPick() {
    if (!pick.size) return;
    pick.clear();
    paint();
  }
  /* every item the band touched, added to the pick or replacing it. TOUCHED
     and not enclosed, which is lab.js's rule for features and is wanted twice
     as much here: a chain run drawn at 640 world px is bigger than the screen
     at the zoom you would gather a scene at. */
  function band(x1, y1, x2, y2, add) {
    if (tool !== 'move') return;
    if (!add) pick.clear();
    S().items.forEach((it, i) => {
      if (!it) return;
      const b = hitBox(it, byIndex(i));
      if (b && b.x < x2 && b.x + b.w > x1 && b.y < y2 && b.y + b.h > y1) pick.add(i);
    });
    paint();
  }

  const byIndex = i => svg.querySelector('.wall-item[data-i="' + i + '"]');

  /* ── HOW BIG A PIECE IS, IN WORLD UNITS ──────────────────────────────────
     Wanted three times over: to know what a band caught, where to hang crop
     marks, and where the resize corner goes.

     THE STAMPED KINDS ARE ARITHMETIC, not measurement. A sticker, a tracing,
     a gif and a stamp all keep a centre (x,y) and one number for how big they
     are, so their box is worked out rather than read — no getBBox, no layout,
     and an answer even for a piece that has not been painted yet.

     A STROKE AND A NOTE ARE MEASURED, because a stroke's shape is its path
     data and a note's is whatever the words wrapped to. Those two do need the
     node, and getBBox is exact for both: neither carries a transform of its
     own, and the layer's user units ARE world units. A stroke's box is grown
     by half its pen, which getBBox leaves out. */
  function boxOf(it, node) {
    if (!it) return null;
    const mid = (hw, hh) => ({ x: it.x - hw, y: it.y - hh, w: hw * 2, h: hh * 2 });
    if (it.k === 'k') return mid(32 * it.z, 32 * it.z);
    // a gif and a video are the same shape of piece: a natural w×h, a long
    // edge z, and no artwork of their own to measure
    if (it.k === 'g' || it.k === 'v') { const s = it.z / Math.max(it.w, it.h, 1); return mid(it.w * s / 2, it.h * s / 2); }
    if (it.k === 'i' || it.k === 'd') {
      const a = art(it);
      if (!a) return null;
      const s = it.z / Math.max(a.w, a.h, 1);
      return mid(a.w * s / 2, a.h * s / 2);
    }
    if (!node) return null;
    let b;
    try { b = node.getBBox(); } catch (err) { return null; }
    if (!b || (!b.width && !b.height)) return null;
    const pad = (it.k === 's' || it.k === 'b') ? penOf(it) / 2 : 0;
    return { x: b.x - pad, y: b.y - pad, w: b.width + pad * 2, h: b.height + pad * 2 };
  }

  /* THE SAME BOX, SET SQUARE TO THE WORLD. boxOf answers in the piece's own
     frame, which is what the crop marks want — they tilt with it. The BAND
     does not tilt, so it needs the upright rectangle the turned box sits
     inside: the four corners swung about the centre, and the extremes of
     those. For a piece that has never been turned the two are the same box
     and this costs one property read. */
  function hitBox(it, node) {
    const b = boxOf(it, node);
    if (!b || !it.r) return b;
    const a = it.r * Math.PI / 180, cos = Math.cos(a), sin = Math.sin(a);
    const xs = [], ys = [];
    [[b.x, b.y], [b.x + b.w, b.y], [b.x + b.w, b.y + b.h], [b.x, b.y + b.h]].forEach(c => {
      const dx = c[0] - it.x, dy = c[1] - it.y;
      xs.push(it.x + dx * cos - dy * sin);
      ys.push(it.y + dx * sin + dy * cos);
    });
    const x = Math.min.apply(null, xs), y = Math.min.apply(null, ys);
    return { x, y, w: Math.max.apply(null, xs) - x, h: Math.max.apply(null, ys) - y };
  }

  /* ── HOW FAR THE WALL REACHES ────────────────────────────────────────────
     One upright rectangle round everything on it, in world units, or nothing
     at all when the wall is bare. lab.js asks (contentBox), and it asks for
     two things at once: the box the camera is CLAMPED inside, and the box
     shift 1 frames.

     It matters more here than it would next door. lab 2's paper is covered in
     features and its contentBox has always had them to measure; this bench
     starts bare, so before this the camera was clamped to a viewport-sized
     rectangle at world 0,0 whatever you had made and wherever you had made
     it — and a scene stamped out at world 2000 was somewhere the camera did
     not believe in. What that felt like was a zoom that pulled towards the
     middle of the page instead of towards the pointer.

     The upright box and not the piece's own: a turned sticker reaches as far
     as its corners swing, which is what a rectangle round the lot has to
     hold. Anything that cannot be measured yet — a sticker whose kit has not
     landed, a stroke whose node is not painted — is left out rather than
     guessed at; it comes in on the next repaint. */
  function bounds() {
    const items = S().items;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity, n = 0;
    items.forEach((it, i) => {
      if (!it) return;
      const b = hitBox(it, byIndex(i));
      if (!b) return;
      x0 = Math.min(x0, b.x); y0 = Math.min(y0, b.y);
      x1 = Math.max(x1, b.x + b.w); y1 = Math.max(y1, b.y + b.h);
      n++;
    });
    return n ? { x: x0, y: y0, w: x1 - x0, h: y1 - y0 } : null;
  }

  /* where a stamped piece's artwork comes from — the library for a tracing,
     the drawer for a sticker. Both can be missing (a tracing thrown out, a kit
     not filed in yet), and paint() already draws nothing in that case. */
  function art(it) {
    if (it.k === 'i') return window.Tracer && Tracer.get(it.f);
    if (it.k === 'd') return window.Stickers && Stickers.get(it.f);
    return null;
  }

  /* ── CROP MARKS AND THE CORNER, drawn on a layer of their own ────────────
     A separate <g> over the items rather than decoration inside them, for one
     reason: half the pieces are a bare <path> and a path cannot carry a child.
     It also makes the drag cheap — every picked piece travels by the same
     offset, so the marks follow on ONE transform rather than being redrawn
     sixty times a second.

     TWO HANDLES, SHOWN FOR ONE PIECE AT A TIME. A square at the bottom right
     scales it and a circle on a stalk above it turns it — the arrangement
     every drawing program has used for thirty years, and worth having twice
     over here because both are one number on the item. With a pick of twelve,
     a pair on each is twenty-four grips and no answer to what dragging one of
     them ought to do to the other eleven. One picked piece is an unambiguous
     question, so that is when the handles are offered; more than one is a
     pick for carrying. (A note's width tab is drawn by paint() for every note
     in move mode and is untouched by any of this — it always was, and
     reshaping a paragraph is not the same gesture as scaling a drawing.)

     AND THE MARKS TILT WITH THE PIECE. A turned sticker wrapped in a level
     box would be a selection that says nothing about which way up its
     contents are, and the handles would sit where the artwork is not: the
     corner belongs to the piece's own bottom right, wherever that has ended
     up. So the whole lot goes inside the same rotate() the piece carries. */
  const SCALABLE = { d: 1, i: 1, g: 1, k: 1, v: 1 };   // the kinds that keep one size number
  let marks = null;

  function paintMarks() {
    marks = el('g', { class: 'wall-marks' });
    const list = picked();
    const items = S().items;
    const only = list.length === 1 ? list[0] : -1;
    list.forEach(i => {
      const it = items[i], b = boxOf(it, byIndex(i));
      if (!b) return;
      const g = el('g', it.r ? { transform: spin(it) } : {});
      g.appendChild(crop(b));
      if (i === only && SCALABLE[it.k]) handles(g, i, b);
      marks.appendChild(g);
    });
    svg.appendChild(marks);
  }

  /* SIZED AGAINST THE PIECE, not against the screen. Everything on this layer
     is in world units, so a grip of a fixed number of them would be a speck
     at 20% and a slab at 400%. A grip that is a fraction of the artwork keeps
     the same proportion at every zoom, which is what the eye expects when the
     whole sheet scales together — and it is clamped, so a sticker the size of
     a postage stamp still has handles you can hit and one the size of a wall
     does not get dinner plates. */
  function handles(g, i, b) {
    const s = clamp(9, 22, Math.min(b.w, b.h) * 0.26);
    g.appendChild(el('rect', { class: 'wall-grip wall-scale', 'data-i': i,
      x: round(b.x + b.w - s / 2), y: round(b.y + b.h - s / 2),
      width: round(s), height: round(s), rx: round(s / 4) }));
    // the stalk keeps the turn handle off the artwork, so it is never a
    // question whether a press there meant the piece or the ring
    const cx = round(b.x + b.w / 2), cy = round(b.y - s * 1.7);
    g.appendChild(el('line', { class: 'wall-stem', x1: cx, y1: round(b.y), x2: cx, y2: cy }));
    g.appendChild(el('circle', { class: 'wall-grip wall-turn', 'data-i': i,
      cx: cx, cy: cy, r: round(s * 0.6) }));
  }

  /* the same eight corner arms .gz.picked wears in lab.css, drawn as strokes
     because there are no background gradients out here. The arm is a quarter
     of the shorter side, so a small piece gets short marks instead of eight
     lines that meet in the middle and read as a box. */
  function crop(b) {
    const g = el('g', { class: 'wall-crop' });
    const a = clamp(6, 34, Math.min(b.w, b.h) / 4);
    const x2 = b.x + b.w, y2 = b.y + b.h;
    [[b.x, b.y, a, 0], [b.x, b.y, 0, a], [x2, b.y, -a, 0], [x2, b.y, 0, a],
     [x2, y2, -a, 0], [x2, y2, 0, -a], [b.x, y2, a, 0], [b.x, y2, 0, -a]]
      .forEach(([x, y, dx, dy]) => g.appendChild(
        el('line', { x1: round(x), y1: round(y), x2: round(x + dx), y2: round(y + dy) })));
    return g;
  }

  /* ── THE HOVER BOX ───────────────────────────────────────────────────────
     Which piece the pointer is over, said with a thin rectangle on the layer
     above rather than with anything done to the piece (see AND A SECOND
     LAYER). It turns with the piece, the way the crop marks do, and it is
     drawn again after every repaint because the piece it is about may have
     moved, been raised, or gone.

     ONLY THE THREE TOOLS THAT CAN REACH A PIECE ask for it: move, which will
     pick it up, sticker, which will take hold of it, and delete, which will
     remove it — that last one in amber, since "about to go" and "about to be
     carried" should not look the same. The pen can reach a piece too (for its
     menu), but a box under the nib while you are drawing is noise. */
  let overI = -1;
  const OVER_TOOLS = { move: 1, sticker: 1, delete: 1 };

  function paintOver() {
    over.textContent = '';
    if (overI < 0 || !OVER_TOOLS[tool] || document.body.classList.contains('lab-hand')) return;
    const it = S().items[overI];
    if (!it) return;
    const b = boxOf(it, byIndex(overI));
    if (!b) return;
    const pad = clamp(2, 10, Math.min(b.w, b.h) * 0.04);
    const g = el('g', it.r ? { transform: spin(it) } : {});
    g.appendChild(el('rect', { class: 'wall-over-box',
      x: round(b.x - pad), y: round(b.y - pad),
      width: round(b.w + pad * 2), height: round(b.h + pad * 2) }));
    over.appendChild(g);
  }

  const overAt = t => {
    const n = t && t.closest && t.closest('.wall-item');
    const i = n ? +n.dataset.i : -1;
    if (i === overI) return;
    overI = i;
    paintOver();
  };
  svg.addEventListener('pointerover', e => overAt(e.target));
  svg.addEventListener('pointerout', e => {
    // out fires for every hop between pieces too, so only a hop to nothing
    // inside this layer counts as having left
    if (!e.relatedTarget || !svg.contains(e.relatedTarget)) overAt(null);
  });
  svg.addEventListener('pointerleave', () => overAt(null));

  /* ── moving what is already there ───────────────────────────────────────── */
  let held = null;
  /* TAKING HOLD OF A PIECE. The move tool does it on a press; the sticker
     tool does it on a press AND HOLD (see PRESS AND HOLD below). It is the
     same drag either way, so it is one function and the callers differ only
     in how they decide to call it. */
  /* THE CREW is what this press is carrying: the one piece under the pointer,
     or the whole pick if that piece is in it. lab.js says the same sentence
     about features a few hundred lines away, and it has to be the same
     sentence here or a pick of twelve stickers would come apart the moment
     you tried to move it.

     `solo` is the sticker tool's hold (see PRESS AND HOLD): that gesture is
     about the one thing you pressed and held, and it has nothing to say about
     what the move tool happens to have selected. */
  function beginMove(t, e, solo) {
    const i = +t.dataset.i;
    const items = S().items;
    if (!items[i]) return false;
    const crew = (!solo && pick.has(i) ? picked() : [i])
      .map(n => ({ i: n, node: byIndex(n) }))
      .filter(c => c.node && items[c.i]);
    if (!crew.length) return false;
    const p = W(e.clientX, e.clientY);
    /* ITS OWN TRANSFORM, KEPT — the whole of why a sticker used to vanish
       when you dragged it. A stamped sticker, a filed tracing and a pinned
       gif each sit in a <g transform="translate(…) scale(…)">, and the drag
       used to write style.transform, which BEATS the attribute outright: the
       piece lost its scale and its place in the same instant and leapt off to
       the world origin at scale 1 — off screen, which reads as gone. So the
       offset is composed with the piece's own string instead, and the string
       is kept here to put back on let go. THE STICKIES, above, is the same
       hazard met from the other side. (2026-09-08) */
    crew.forEach(c => {
      c.base = c.node.getAttribute('transform') || '';
      c.node.classList.add('wall-held');
    });
    held = { crew, i, id: e.pointerId, ox: 0, oy: 0, px: p.x, py: p.y,
             group: crew.length > 1 };
    window.addEventListener('pointermove', moveMove, true);
    window.addEventListener('pointerup', moveEnd, true);
    window.addEventListener('pointercancel', moveEnd, true);
    return true;
  }

  svg.addEventListener('pointerdown', e => {
    if (tool !== 'move' || document.body.classList.contains('lab-hand')) return;
    /* THE RIGHT BUTTON IS THE MENU'S, and saying so here is not tidiness: a
       press that fell through to beginMove would be a drag that goes nowhere,
       and a drag that goes nowhere collapses a pick of nine onto the one you
       pressed (see moveEnd) — so the menu would open saying "1 picked" about
       the group you had just gathered. The menu itself is opened off the
       contextmenu event, which arrives after this one. */
    if (e.button != null && e.button !== 0) return;
    const gr = e.target.closest('.wall-grip');
    if (gr) { startSize(gr, e); return; }
    /* THE PLAY BADGE IS NOT THE PIECE. It is the one part of a video that
       means something other than "take hold of this", so it is asked about
       before the piece is — press the badge and the film starts, press the
       picture anywhere else and it picks up like a sticker. */
    const pl = e.target.closest('.wall-play');
    if (pl) {
      const on = pl.closest('.wall-item');
      if (on && playVideo(+on.dataset.i)) { e.preventDefault(); e.stopPropagation(); return; }
    }
    const t = e.target.closest('.wall-item');
    if (!t) return;
    const i = +t.dataset.i;

    /* SHIFT IS A PICK AND NOT A DRAG — lab.js's word for word, because a
       person who has learnt it on the features should not have to learn it
       again on the stickers. It puts this piece into the pick or takes it
       back out, and nothing moves. */
    if (e.shiftKey) {
      pickOne(i, !pick.has(i));
      e.preventDefault(); e.stopPropagation();
      return;
    }
    /* A PRESS ON SOMETHING THAT IS NOT IN THE PICK PUTS THE PICK DOWN AND
       TAKES THIS ONE UP: one press, one thing, unless you said otherwise —
       and pressing a piece is also how you get its corner, since the corner
       is only drawn for a pick of one. A press on something that IS in the
       pick leaves the pick alone, so a drag from inside it carries the lot. */
    if (!pick.has(i)) { pick.clear(); pick.add(i); paint(); }
    const node = byIndex(i) || t;
    if (!beginMove(node, e)) { clearPick(); return; }
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
    const i = +t.dataset.i;
    // two presses on a VIDEO start it, which is the same sentence: going into
    // the piece rather than moving it about. The badge is the other way in.
    if (!playVideo(i)) editNote(i);      // …which minds its own business unless it is a note
    e.preventDefault();
    e.stopPropagation();
  });

  function moveMove(e) {
    if (!held || e.pointerId !== held.id) return;
    const p = W(e.clientX, e.clientY);
    held.ox = p.x - held.px; held.oy = p.y - held.py;
    const off = 'translate(' + held.ox + ',' + held.oy + ')';
    // in front of the piece's own transform, never instead of it
    held.crew.forEach(c => c.node.setAttribute('transform', c.base ? off + ' ' + c.base : off));
    // the crop marks are a layer of their own and every piece is travelling by
    // the same offset, so they follow on one attribute instead of a redraw
    if (marks) marks.setAttribute('transform', off);
    e.preventDefault();
  }

  function moveEnd(e) {
    if (!held || (e && e.pointerId !== held.id)) return;
    window.removeEventListener('pointermove', moveMove, true);
    window.removeEventListener('pointerup', moveEnd, true);
    window.removeEventListener('pointercancel', moveEnd, true);
    const { crew, ox, oy, i, group } = held;
    crew.forEach(c => {
      c.node.classList.remove('wall-held');
      // back to exactly the string it had, or to none if it never had one
      if (c.base) c.node.setAttribute('transform', c.base); else c.node.removeAttribute('transform');
    });
    if (marks) marks.removeAttribute('transform');
    held = null;
    if (!ox && !oy) {
      /* A PRESS THAT NEVER TRAVELLED, ON SOMETHING ALREADY IN THE PICK, IS
         THE OTHER HALF OF THE RULE ABOVE. Pressing must keep the whole pick,
         or a group could never be dragged from inside itself — but a press
         that turns out to be a CLICK meant this one, and only this one, so
         the pick collapses onto it when the hand lets go without moving.

         Which is figma's behaviour and is not a nicety here: the resize
         corner is only offered to a pick of one, so without this line you
         could gather nine stickers and then have no way back to a single one
         except by clicking the paper first. */
      if (group && pick.has(i)) { pick.clear(); pick.add(i); paint(); }
      return;
    }
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
       promised.

       ONE ENTRY FOR THE WHOLE CREW, which is lab.js's rule for a dragged
       pick and matters more here: a drag that carried nine stickers is one
       thing a person did, and nine ctrl+zs to take it back is an undo button
       that appears to be broken. */
    const was = crew.map(c => ({ i: c.i, it: JSON.parse(JSON.stringify(S().items[c.i] || null)) }))
                    .filter(r => r.it);
    store.update(st => crew.forEach(c => {
      const it = st.items[c.i];
      if (!it) return;
      // pixel art that has been nudged half a cell is no longer pixel art,
      // so a squared-off piece moves by whole cells or not at all
      if (it.k === 'p') it.d = shift(it.d, Math.round(ox / it.g) * it.g, Math.round(oy / it.g) * it.g);
      else if (it.k === 's' || it.k === 'b') it.d = shift(it.d, ox, oy);
      else { it.x = round(it.x + ox); it.y = round(it.y + oy); }
    }));
    if (was.length && window.Lab && Lab.remember) {
      Lab.remember(() => store.update(st => was.forEach(r => { if (st.items[r.i]) st.items[r.i] = r.it; })));
    }
  }

  /* ── COPYING AND PASTING WHAT IS ON THE PAPER ────────────────────────────
     ctrl+c takes the pick, ctrl+v puts a second one down a nudge to the
     south-east, and a group comes back as a group: the offset is one offset
     for the whole clipboard, so six stickers paste six stickers still six
     apart rather than six on top of each other.

     A COPIED ITEM IS ITS OWN RECORD AND NOTHING ELSE. Every kind on this wall
     is already a plain JSON object — a stroke's path string, a sticker's
     catalogue id, a note's words — so the clipboard is a deep copy of the
     records and paste is a push. That is why a stroke and a note copy too,
     even though neither can be scaled, turned or flipped: copying asks
     nothing of a piece except that it be a piece.

     THE CLIPBOARD STANDS WHEN NOTHING IS ASKED FOR, which is lab.js's rule
     over on the features and matters for the same reason: copy once, paste
     four times, and putting the pick down between pastes must not empty it.

     ONE CLIPBOARD ON THE BENCH, THOUGH. lab.js keeps its own for features,
     and if both held something a single ctrl+v would paste two unrelated
     lots. So a copy of one empties the other — dropClip, below, is this
     half's end of that, and lab.js's ctrl+c handler decides which way it
     goes, being the only place that can see whether BOTH were copied (a band
     can catch features and stickers at once, and then both are meant). */
  let clip = null, pastes = 0;
  const NUDGE = 48;                    // the same step a pasted feature takes

  function copy() {
    const list = picked();
    if (!list.length) return false;    // nothing asked for: the clipboard stands
    const items = S().items;
    clip = list.map(i => JSON.parse(JSON.stringify(items[i]))).filter(Boolean);
    pastes = 0;
    if (!clip.length) { clip = null; return false; }
    return true;
  }

  function paste() {
    if (!clip || !clip.length) return false;
    pastes++;                          // paste twice and the second lands clear of the first
    const d = NUDGE * pastes, made = [];
    store.update(st => clip.forEach(c => {
      const it = JSON.parse(JSON.stringify(c));
      // a copy has never been through the pile, whatever it was copied off:
      // it lands on top, the way anything newly put up does (see order)
      delete it.L;
      /* a stroke and a square of pixel art carry their position INSIDE the
         path data, the same three-way split moveEnd makes — and pixel art
         moves by whole cells or it stops being pixel art */
      if (it.k === 'p') it.d = shift(it.d, Math.round(d / it.g) * it.g, Math.round(d / it.g) * it.g);
      else if (it.k === 's' || it.k === 'b') it.d = shift(it.d, d, d);
      else { it.x = round(it.x + d); it.y = round(it.y + d); }
      made.push(st.items.push(it) - 1);
    }));
    // what you have hold of now is the copies, so you can drag them straight
    // off the things they came from
    pick.clear();
    made.forEach(i => pick.add(i));
    paint();
    /* NULLED RATHER THAN SPLICED, the same as a delete and for the same
       reason: anything that captured one of these indices in the meantime —
       a move filed for undo, a resize — is trusted to still point at the
       right thing afterwards, which a splice would not promise. */
    if (window.Lab && Lab.remember) Lab.remember(() => {
      store.update(st => made.forEach(i => { st.items[i] = null; }));
      made.forEach(i => pick.delete(i));
      paint();
    });
    return true;
  }

  const dropClip = () => { clip = null; pastes = 0; };

  /* ── deleting what is already there ─────────────────────────────────────
     The other half of the delete tool — a mark on the wall, this time, not a
     pasted feature (see lab.js's deleteCopy for that half). Sits at the same
     door as moveEnd: filed through Lab.remember, so it costs one ctrl+z the
     same way a mis-drag does, and NULLED rather than spliced OUT — every
     other closure in this file that has ever captured an index (a move in
     flight, a note being resized, a note being edited) is trusted to still
     point at the right thing afterwards, which a splice would not promise.
     paint() already knows to skip a null slot; nothing else needs to.

     A LIST AND NOT ONE, because the menu can reach a whole pick: the delete
     tool only ever gets the thing under the pointer, but a menu opened on one
     of nine picked stickers is about all nine, and nine ctrl+zs to take back
     one thing a person did is an undo button that appears to be broken.
     (moveEnd says the same sentence about a dragged crew, above.) Nothing
     clears the pick afterwards — picked() drops a dead slot the next time it
     is asked, which paintMarks does on this very repaint. */
  function removeItems(list) {
    const items = S().items;
    const was = list.filter(i => items[i])
                    .map(i => ({ i, it: JSON.parse(JSON.stringify(items[i])) }));
    if (!was.length) return false;
    store.update(st => was.forEach(r => { st.items[r.i] = null; }));
    if (window.Lab && Lab.remember) {
      Lab.remember(() => store.update(st => was.forEach(r => { if (!st.items[r.i]) st.items[r.i] = r.it; })));
    }
    return true;
  }
  const deleteItem = i => removeItems([i]);

  svg.addEventListener('pointerdown', e => {
    if (tool !== 'delete' || document.body.classList.contains('lab-hand')) return;
    if (e.button != null && e.button !== 0) return;   // the right button is the menu's
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

  /* ── ITS MENU: RAISE, LOWER, DELETE ──────────────────────────────────────
     Right-click a sticker and lab.js's menu comes up about it — the same
     menu, the same three buttons and the same wording the features have had
     since it was built (see THE MENU over there). lab.js owns the gesture and
     this file owns the answer, which is the split the band already runs on:
     it hands over a SUBJECT and never a node.

     A STEP IS PAST WHAT IT OVERLAPS, word for word lab.js's argument. In a
     pile of two hundred stickers "up one" usually means over something on the
     far side of the sheet, so the button appears to do nothing and you press
     it thirty times. Raise puts a piece just over the lowest thing covering
     it, lower just under the highest thing it covers, and with nothing in the
     way at all either takes it clean to the top or the bottom.

     WHATEVER IS PICKED GOES TOGETHER. Right-clicking something that is not in
     the pick puts the pick down and takes that one up — the same sentence a
     left press makes a few hundred lines up, and the reason the menu wants no
     highlight of its own: the crop marks already say what it is about, which
     .gz.menued has to say for a feature. Right-clicking INSIDE a pick leaves
     it alone, so a menu opened on one of nine is about all nine, and each of
     the three buttons costs one ctrl+z rather than nine. */
  const hits = (p, q) => !!(p && q && p.x < q.x + q.w && p.x + p.w > q.x &&
                                      p.y < q.y + q.h && p.y + p.h > q.y);

  /* One piece, one step, INSIDE a pile being worked out: `ord` is a list of
     indices in paint order, edited in place, so a crew of nine can take its
     steps one after another before any of it is written down. The boxes are
     the upright ones the band uses — a turned sticker overlaps what its
     corners reach, not what its artwork happens to cover. */
  function stepItem(i, up, ord) {
    const items = S().items, at = ord.indexOf(i);
    if (at < 0 || !items[i]) return false;
    const b = hitBox(items[i], byIndex(i));
    const near = ord.filter((j, p) => j !== i && (up ? p > at : p < at) &&
                                      hits(b, hitBox(items[j], byIndex(j))));
    const to = near.length ? ord.indexOf(near[up ? 0 : near.length - 1])
                           : (up ? ord.length - 1 : 0);
    if (to === at) return false;
    ord.splice(at, 1);
    ord.splice(to, 0, i);
    return true;
  }

  /* the crew, a step each, and ONE entry on the undo stack for the lot.
     Raising nine goes top-down so no member of the crew steps over another
     member of it; lowering goes bottom-up for the same reason — lab.js's rule
     for a raised pick of features, and it has to be the same rule here or a
     group would come apart the moment you raised it.

     What is written down is the LAYER of every piece, 0…n−1, and what is kept
     to undo by is every layer as it stood — a piece that had none goes back
     to having none. One store write for the whole gesture, which is one
     repaint and one trip to localStorage. */
  function restep(list, up) {
    const items = S().items;
    const ord = order();
    const was = items.map(it => (it && isFinite(it.L) ? it.L : null));
    const crew = list.filter(i => items[i])
      .sort((a, b) => up ? ord.indexOf(b) - ord.indexOf(a) : ord.indexOf(a) - ord.indexOf(b));
    let did = false;
    crew.forEach(i => { if (stepItem(i, up, ord)) did = true; });
    if (!did) return false;
    store.update(st => ord.forEach((i, p) => { if (st.items[i]) st.items[i].L = p; }));
    if (window.Lab && Lab.remember) {
      Lab.remember(() => store.update(st => st.items.forEach((it, i) => {
        if (!it) return;
        if (was[i] == null) delete it.L; else it.L = was[i];
      })));
    }
    return true;
  }

  /* WHAT THE MENU CALLS IT. A sticker and a tracing know their own name and
     are asked for it; the rest are named by what they are, which is the whole
     of what there is to say about a line. A note is called by its own first
     words, the way a document is. */
  const KIND = { s: 'a line', p: 'pixels', g: 'a gif', v: 'a video', b: 'a smear' };
  function nameOf(it) {
    if (!it) return '';
    if (it.k === 'd' || it.k === 'i') {
      const a = art(it);
      return (a && a.name) || (it.k === 'd' ? 'a sticker' : 'a tracing');
    }
    if (it.k === 'k') return SK[it.s] || SK[0];
    if (it.k === 't') {
      const t = String(it.t || '').trim().replace(/\s+/g, ' ');
      return t.length > 34 ? t.slice(0, 33) + '…' : (t || 'a note');
    }
    return KIND[it.k] || 'a piece';
  }

  /* THE SUBJECT, for lab.js's menu — null unless the right-click landed on a
     piece with a tool up that can be about one. Two of them can:

     THE MOVE TOOL, where the menu is about THE PICK. Right-clicking something
     that is not in it puts the pick down and takes that one up; right-clicking
     inside it leaves it alone, so a menu opened on one of nine is about all
     nine. Opening the menu is therefore allowed to CHANGE the pick, which a
     finder that only looked would not be — it is the press's own sentence,
     said again for the other button, and lab.js only asks when it is about to
     show the menu.

     THE DRAW TOOL, where it is about THE ONE MARK UNDER THE POINTER and
     nothing else. A line you have just drawn is the thing most likely to want
     raising or deleting, and putting the pen down to say so is a trip nobody
     should have to make. But the pick belongs to the move tool — setTool drops
     it the moment a drawing tool comes up, because crop marks over a pen are a
     promise nothing keeps — so with the pen in hand this takes the one piece
     and does not touch the pick or repaint anything. `alone` is that whole
     difference, and it is why the crew is a list either way.

     WHAT THE PRESS LANDS ON is lab.css's business, not this function's: a
     piece is pointer-events:none until a tool that can reach it is up, and
     the draw tool is now one of those (see WITH THE PEN OUT over there).

     Every other tool answers null. Delete already removes what you click, the
     sticker tool's press means take hold of this one, and text and gif are
     both busy putting something down. */
  function menuFor(t) {
    if (tool !== 'move' && tool !== 'draw') return null;
    if (document.body.classList.contains('lab-hand')) return null;
    // …and never over a line still being drawn, which is lab.js's own rule
    // for a camera still being panned: one gesture at a time
    if (live) return null;
    const n = t && t.closest && t.closest('.wall-item');
    if (!n) return null;
    const i = +n.dataset.i;
    if (!S().items[i]) return null;
    const alone = tool !== 'move';
    if (!alone && !pick.has(i)) { pick.clear(); pick.add(i); paint(); }
    const crew = () => (!alone && pick.has(i) ? picked() : [i]);
    return {
      name: nameOf(S().items[i]),
      where() {
        if (!S().items[i]) return '';
        const ord = order(), c = crew().length;
        return (c > 1 ? c + ' picked · ' : '') +
               'layer ' + (ord.indexOf(i) + 1) + ' of ' + ord.length;
      },
      raise: () => restep(crew(), true),
      lower: () => restep(crew(), false),
      remove: () => removeItems(crew())
    };
  }
  if (window.Lab && Lab.onMenu) Lab.onMenu(menuFor);

  /* ── reshaping a note ────────────────────────────────────────────
     The grip sets the box's width and the words re-wrap under the finger. The
     item is edited where it sits and the layer repainted, rather than being
     put through the store on every frame: a store write is a JSON round-trip
     of the whole wall and a trip to localStorage, which is not a thing to do
     sixty times a second. The store is told once, on let go — the width is
     already in the object by then, so that call is purely the save.

     A note written before boxes had a width has none to start from, so the
     first drag picks up where the grip was drawn instead. */
  /* ── AND SCALING A STAMPED PIECE ─────────────────────────────────────────
     The second thing this corner does, and the reason it is now a corner and
     not only a tab. A sticker used to be stuck at whatever S/M/L the options
     row said when it was stamped: you could move it, delete it and put it
     back, but the one thing a drawing on a page most wants — to be a bit
     bigger than that, a bit smaller than this — you could only get by taking
     it off, changing the row and stamping it again. Every other object on the
     bench has had a corner to drag since lab 1 (.gz-size, over in frames.js);
     this is the same gesture for the half of the paper that had not got one.

     IT IS ONE NUMBER. A sticker, a tracing and a gif each keep `z`, the world
     length of their LONG edge, and paint() derives the scale from it; a stamp
     keeps `z` as a plain multiplier. So there is no aspect ratio to hold —
     the shape cannot be squashed because there is nothing to squash it with,
     which is the right answer for artwork and saves a second grip.

     THE DIAGONAL IS WHAT IS READ, not the horizontal: the corner runs away
     from the centre, so the distance from the centre to the pointer is the
     size, and pulling down-right and pulling right feel the same. Measured
     against where the press started rather than absolutely, so the corner
     does not jump to the pointer on the first pixel.

     BOTH KINDS ARE EDITED IN PLACE AND SAVED ONCE. A store write is a JSON
     round-trip of the whole wall and a trip to localStorage, which is not a
     thing to do sixty times a second — so the item is changed where it sits,
     the layer repainted on a frame, and the store told on let go. Which is
     what the note grip always did; the copy of the item taken on the way in
     is new, and gives both of them an undo they did not have before. */
  let sizing = null, sizeRaf = 0;
  const ZMIN = 12, ZMAX = 4000;          // how small and how big a stamped piece may be pulled

  function startSize(gr, e) {
    const i = +gr.dataset.i, it = S().items[i];
    if (!it) return;
    const p = W(e.clientX, e.clientY);
    if (gr.classList.contains('wall-turn')) {
      /* WHICH WAY THE HAND POINTS FROM THE CENTRE, and how far round it has
         travelled since the press — not the absolute bearing, or the piece
         would snap to put its handle under the pointer on the first pixel.
         Hold shift and it lands on the nearest 15°, which is the only way
         anybody gets a row of stickers all leaning the same way. */
      if (!SCALABLE[it.k]) return;
      sizing = { i, it, kind: 'r', r0: it.r || 0, a0: bearing(p, it),
                 was: JSON.parse(JSON.stringify(it)) };
    } else if (gr.classList.contains('wall-scale')) {
      if (!SCALABLE[it.k]) return;
      // the piece's own diagonal half-length now, and the pointer's — the
      // ratio between the two is what z is multiplied by as the hand moves
      const b = boxOf(it, byIndex(i));
      if (!b) return;
      const reach = Math.hypot(p.x - it.x, p.y - it.y);
      sizing = { i, it, kind: 'z', z0: it.z, reach: Math.max(reach, 1),
                 was: JSON.parse(JSON.stringify(it)) };
    } else {
      if (it.k !== 't') return;
      sizing = { i, it, kind: 'w', x0: p.x, w0: +gr.getAttribute('x') - it.x - 4,
                 was: JSON.parse(JSON.stringify(it)) };
    }
    window.addEventListener('pointermove', sizeMove, true);
    window.addEventListener('pointerup', sizeEnd, true);
    window.addEventListener('pointercancel', sizeEnd, true);
    e.preventDefault();
    e.stopPropagation();
  }

  const bearing = (p, it) => Math.atan2(p.y - it.y, p.x - it.x) * 180 / Math.PI;
  const wrap = a => ((a % 360) + 360) % 360;

  /* ── MIRRORING THE PICK ──────────────────────────────────────────────────
     Flip left-to-right, or top-to-bottom, about the middle of WHAT IS PICKED
     — one piece about its own centre, a group about the group's. That
     distinction is the whole point of doing it this way: flipping six
     stickers each about its own centre turns every one of them round and
     leaves the arrangement alone, which is almost never what anybody means. A
     row read left to right should come back reading right to left.

     THREE SUBSTITUTIONS, AND THEY ARE EXACT. A piece is drawn as
     T(x,y)·R(r)·F·A₀ (see head(), above). Mirroring the plane about x = cx is
     M = T(cx,0)·S(-1,1)·T(-cx,0), and M·T(x,y)·R(r)·F·A₀ works out to
     T(2cx-x, y)·R(-r)·S(-1,1)·F·A₀ — because S(-1,1) slides through a
     translate by negating its x, and through a rotate by negating its angle.
     So:

         x  →  2·cx − x          the piece crosses the line
         r  →  −r                a mirrored turn turns the other way
         fx →  not fx            and the mirror itself accumulates

     No matrices are kept and nothing is measured: three numbers in, three
     numbers out, and flipping twice returns the exact bytes you started with.
     A piece with no r and no f gains them only when it needs them.

     ONLY THE STAMPED KINDS. A stroke's position lives inside its path data
     and a note's shape is whatever its words wrapped to, so neither has a
     centre to mirror about — they are passed over, and a pick that is all
     strokes flips nothing rather than half-doing it. */
  function flip(axis) {
    const list = picked().filter(i => SCALABLE[(S().items[i] || {}).k]);
    if (!list.length) return false;
    const items = S().items;
    let lo = Infinity, hi = -Infinity;
    list.forEach(i => {
      const b = hitBox(items[i], byIndex(i));
      if (!b) return;
      lo = Math.min(lo, axis === 'x' ? b.x : b.y);
      hi = Math.max(hi, axis === 'x' ? b.x + b.w : b.y + b.h);
    });
    if (!isFinite(lo)) return false;
    const c = (lo + hi) / 2;
    const was = list.map(i => ({ i, it: JSON.parse(JSON.stringify(items[i])) }));
    store.update(st => list.forEach(i => {
      const it = st.items[i];
      if (!it) return;
      /* THE FLAG IS DELETED, NOT SET TO ZERO, when the mirror comes off. A
         piece carries r and f only while it needs them — that is what lets an
         item stamped before any of this paint byte for byte as it always did
         — and a wall that quietly grew "fx":0 on everything anyone had ever
         flipped back would be a bigger store saying nothing. It also makes
         the claim above literally true: flip twice and you have the record
         you started with, not a record that merely draws the same. */
      if (axis === 'x') { it.x = round(2 * c - it.x); if (it.fx) delete it.fx; else it.fx = 1; }
      else { it.y = round(2 * c - it.y); if (it.fy) delete it.fy; else it.fy = 1; }
      if (it.r) it.r = round(wrap(-it.r));
    }));
    if (window.Lab && Lab.remember)
      Lab.remember(() => store.update(st => was.forEach(w => { if (st.items[w.i]) st.items[w.i] = w.it; })));
    return true;
  }

  function sizeMove(e) {
    if (!sizing) return;
    const p = W(e.clientX, e.clientY);
    if (sizing.kind === 'r') {
      let r = sizing.r0 + bearing(p, sizing.it) - sizing.a0;
      if (e.shiftKey) r = Math.round(r / 15) * 15;
      sizing.it.r = round(wrap(r));
    } else if (sizing.kind === 'z') {
      const now = Math.hypot(p.x - sizing.it.x, p.y - sizing.it.y);
      sizing.it.z = round(clamp(ZMIN, ZMAX, sizing.z0 * now / sizing.reach));
    } else {
      sizing.it.w = round(clamp(NW[0], NW[1], sizing.w0 + p.x - sizing.x0));
    }
    if (!sizeRaf) sizeRaf = requestAnimationFrame(() => { sizeRaf = 0; if (sizing) paint(); });
    e.preventDefault();
  }

  function sizeEnd() {
    if (!sizing) return;
    window.removeEventListener('pointermove', sizeMove, true);
    window.removeEventListener('pointerup', sizeEnd, true);
    window.removeEventListener('pointercancel', sizeEnd, true);
    const { i, was } = sizing;
    sizing = null;
    store.update(() => {});              // the new size is already in there
    if (window.Lab && Lab.remember)
      Lab.remember(() => store.update(st => { if (st.items[i]) st.items[i] = was; }));
  }

  /* DOUBLE-CLICK EITHER HANDLE: back to where it started, the same courtesy
     .gz-size pays a feature. The corner goes back to the size the artwork was
     drawn at — a scale of 1 for a stamp, the artwork's own long edge for the
     three that carry any, which is a truer 'natural' than whatever S/M/L the
     options row happens to say today. The ring goes back to upright. Both
     cost one ctrl+z, like any other pull on them. */
  svg.addEventListener('dblclick', e => {
    const gr = e.target.closest('.wall-scale,.wall-turn');
    if (!gr) return;
    e.preventDefault(); e.stopPropagation();
    const i = +gr.dataset.i, it = S().items[i];
    if (!it || !SCALABLE[it.k]) return;
    const turn = gr.classList.contains('wall-turn');
    let key = 'r', val = 0;
    if (!turn) {
      const a = (it.k === 'g' || it.k === 'v') ? it : art(it);
      key = 'z'; val = it.k === 'k' ? 1 : a ? Math.max(a.w, a.h, 1) : 0;
      if (!val) return;
    }
    if (round(val) === (it[key] || 0)) return;
    const was = JSON.parse(JSON.stringify(it));
    store.update(st => { if (st.items[i]) st.items[i][key] = round(val); });
    if (window.Lab && Lab.remember)
      Lab.remember(() => store.update(st => { if (st.items[i]) st.items[i] = was; }));
  }, true);

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

  /* The blur buttons: a dot that goes from hard-edged to hardly there. Drawn
     as rings rather than through a filter — an <svg> in the options row is
     HTML, a filter there would want its own <defs> in every button, and four
     circles of falling opacity say "soft" at 15px just as well. 'Off' is the
     one hard dot, which is also what the pen is when it is not smearing. */
  function blurIcon(r) {
    if (!r) return '<circle cx="8" cy="8" r="5" fill="currentColor"/>';
    const n = r < 8 ? 3 : r < 20 ? 4 : 5;          // more rings, softer edge
    let d = '';
    for (let i = 0; i < n; i++)
      d += '<circle cx="8" cy="8" r="' + round(2.6 + i * (4.4 / n)) +
           '" fill="currentColor" opacity="' + round(0.9 / (i + 1) * 10) / 10 + '"/>';
    return d;
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
      /* the width belongs to the free hand; in pixel mode the cell is the
         width, so the row is left in place and faded rather than whipped away

         ONE SLIDER AND THE NUMBER IT IS ON. The number is not decoration: a
         thumb three quarters along a geometric track is unreadable without
         it, and it is the only thing that says whether the pen is at 300 or
         at 900. It is written straight by the drag (see THE SLIDER, below)
         rather than by rebuilding this row, so the thumb is never pulled out
         from under the hand mid-gesture. */
      html = grp('WIDTH',
        '<input type="range" class="opt-slider opt-pwr" min="0" max="' + PEN.steps + '" step="1"' +
        ' value="' + penPos(pw) + '" title="how wide the pen draws — ' + PEN.min + ' to ' + PEN.max + 'px"' +
        ' aria-label="pen width" aria-valuetext="' + pw + ' pixels">' +
        '<span class="opt-num opt-pwn">' + pw + '</span>',
        PIX[pi] ? 'opt-moot' : '') + rule +
        grp('PIXEL', PIX.map((g, i) =>
        '<button type="button" class="opt-btn opt-px" data-px="' + i + '"' +
        ' title="' + (g ? 'squares ' + g + ' across' : 'a free hand') + '"' +
        ' aria-label="' + (g ? 'pixels ' + g + ' across' : 'no pixels') + '">' +
        '<svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true">' + pixIcon(g) + '</svg>' +
        '</button>').join(''), BLUR[bi] ? 'opt-moot' : '') + rule +

        /* BLUR, the third thing the pen can be. It lays no ink: it rubs what
           is already there so two colours meeting under it blend (see THE
           SMEAR). The WIDTH slider is how broad the rub is, which is why that
           group stays lit while this one is on — and PIXEL fades, because a
           squared-off pen and a smudge are two answers to the same question.
           Choosing either puts the other away rather than leaving both lit. */
        grp('BLUR', BLUR.map((r, i) =>
        '<button type="button" class="opt-btn opt-bl" data-bl="' + i + '"' +
        ' title="' + (r ? 'rub colours together, ' + r + 'px soft' : 'lay ink, do not rub') + '"' +
        ' aria-label="' + (r ? 'blur ' + r + ' px' : 'no blur') + '">' +
        '<svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true">' + blurIcon(r) + '</svg>' +
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
    /* THE STICKER TOOL WANTS BOTH. It takes the whole layer, like draw and
       text, so bare paper can be stamped anywhere — and it ALSO needs the
       pieces themselves to answer, because a press on one may turn out to be
       a hold that moves it (see PRESS AND HOLD). Items are pointer-events:
       none unless something switches them on, so without this line the
       branch up there never sees a .wall-item and every press is a stamp. */
    svg.classList.toggle('wall-holdable', tool === 'sticker');
  }
  function markOpts() {
    const on = (sel, v) => opts.querySelectorAll(sel).forEach(b =>
      b.setAttribute('aria-pressed', String(+b.dataset[v.k] === v.v)));
    // no .opt-pw here: the pen's width is a slider, and a slider shows what
    // it is on by where its thumb is rather than by being the pressed one
    on('.opt-sk', { k: 'sk', v: sk }); on('.opt-px', { k: 'px', v: pi });
    on('.opt-bl', { k: 'bl', v: bi });
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
    // the pick belongs to the move tool: it is what a band gathered up to be
    // carried, and there is nothing to carry it with once the pen is out. Crop
    // marks left standing over a drawing tool are a promise nothing keeps.
    if (t !== 'move') clearPick();
    shutNote(); closeWheel(); tool = t; markTools(); buildOpts(); syncGrid();
    // the pointer has not moved, so what it is over has not changed — but whether
    // the new tool can touch that piece has, and paintOver is where that is decided
    paintOver();
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
    const b = e.target.closest('[data-sk],[data-po],[data-fo],[data-px],[data-bl],[data-z],[data-ty],[data-al],[data-iz]');
    if (!b) return;
    // the two pen modes put each other away: squares and smudges are two
    // answers to the same question, and a row lit for both answers neither
    if (b.dataset.px != null) { pi = +b.dataset.px; if (pi) bi = 0; syncGrid(); buildOpts(); return; }
    if (b.dataset.bl != null) { bi = +b.dataset.bl; if (bi) { pi = 0; syncGrid(); } buildOpts(); return; }
    // the size readout is part of the row, so stepping it redraws the row
    if (b.dataset.z != null) { stepSize(+b.dataset.z); return; }
    if (b.dataset.ty != null) {
      const k = b.dataset.ty;
      if (k === 'b') fb = fb ? 0 : 1; else if (k === 'i') fi = fi ? 0 : 1; else fu = fu ? 0 : 1;
    }
    if (b.dataset.sk != null) sk = +b.dataset.sk;
    if (b.dataset.iz != null) iz = +b.dataset.iz;
    if (b.dataset.po != null) po = +b.dataset.po;
    if (b.dataset.fo != null) fo = +b.dataset.fo;
    if (b.dataset.al != null) fa = +b.dataset.al;
    markOpts();
    styleNote();                         // …and the note being written follows
  });

  /* ── THE SLIDER ──────────────────────────────────────────────────────────
     The pen's width is DRAGGED, not pressed, so it arrives as `input` rather
     than as the row's click — and it arrives all the way along the drag,
     which is the whole point: the number keeps up with the thumb.

     WHAT IT MUST NOT DO IS REBUILD THE ROW. buildOpts() writes opts.innerHTML,
     and an input replaced under a finger that is still down loses the drag
     with it — the thumb sticks and the rest of the gesture goes nowhere. So
     this writes the two things that changed, in place, and leaves the row
     standing.

     One listener for the row, and it answers only this slider: the gif search
     bar is an input in the same row and fires the same event on every letter
     typed into it. */
  opts.addEventListener('input', e => {
    const s = e.target.closest && e.target.closest('.opt-pwr');
    if (!s) return;
    pw = penAt(+s.value);
    const n = opts.querySelector('.opt-pwn');
    if (n) n.textContent = pw;
    // the readout for anyone not looking at the row, kept in step with it
    s.setAttribute('aria-valuetext', pw + ' pixels');
  });

  /* CTRL+Z STILL MEANS UNDO WITH THE THUMB IN HAND. lab.js's keyboard stands
     down over any field — an input keeps its own keys, which is right for the
     gif search box next to this one — and a range input IS a field, so from
     the moment the width is dragged every ctrl+z goes nowhere until something
     else is clicked. Nothing was gained by that: a slider has no undo of its
     own for the browser to do instead. So this one hands the key back to the
     bench, and it is the dock button's own undo, not a second one.

     The arrows are deliberately NOT taken: they are the slider's, they step
     the width a notch, and that is the only thing on this bench they could
     mean while the thumb has the focus. */
  opts.addEventListener('keydown', e => {
    if (!(e.ctrlKey || e.metaKey) || e.altKey || e.shiftKey) return;
    if (e.key.toLowerCase() !== 'z') return;
    if (!(e.target.closest && e.target.closest('.opt-pwr'))) return;
    undo(); e.preventDefault();
  });

  /* Escape drops back to move, the way it drops the hand tool — UNLESS THE
     MENU IS UP, in which case escape is the menu's and puts away that alone.
     One press, one thing: dismissing a menu you opened on a line should not
     also take the pen out of your hand.

     ON THE CAPTURE PHASE, and that is the whole of why it works. lab.js's
     keyboard closes the menu on escape and it listens on the document too; if
     this ran after it, the menu would already be down and gone from Lab.menuUp
     by the time this asked. Capture on the document runs before every bubble
     listener on it, so this sees the menu that lab.js is about to close. */
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    if (noteBox) return;                 // escape is the box's: it throws the note away
    if (window.Lab && Lab.menuUp) return;
    // a film that is playing is the nearest thing open, so it goes first —
    // and the second escape then puts the pen down, the way the first used to
    if (player) { stopVideo(); e.preventDefault(); return; }
    if (tool === 'move') return;
    setTool('move');
  }, true);

  /* ── SHIFT H AND SHIFT V: MIRROR THE PICK ────────────────────────────────
     Figma's two keys, and free here: lab.js takes h and v UNSHIFTED for the
     hand and the pointer, and its shift block answers only 1 and 0 before
     returning — so these two reach this listener untouched, and this one
     swallows them so no dock button gets them as a shortcut afterwards.

     No modifier but shift. ctrl+shift+h is the browser's, and a bench that
     eats it is a bench somebody has to close the tab to get out of. */
  const typing = t => !!(t && t.closest &&
    t.closest('input,textarea,select,[contenteditable],[contenteditable="true"]'));

  document.addEventListener('keydown', e => {
    if (!e.shiftKey || e.ctrlKey || e.metaKey || e.altKey) return;
    if (tool !== 'move' || noteBox || typing(e.target)) return;
    const k = e.key.toLowerCase();
    if (k !== 'h' && k !== 'v') return;
    if (flip(k === 'h' ? 'x' : 'y')) e.preventDefault();
  });

  buildDock(); buildOpts(); markTools(); syncGrid();
  store.on(paint);
  /* AFTER paint AND NOT BEFORE IT: bounds() reads a stroke's box off its
     node, so the layer has to have been rebuilt before the rectangle the
     camera is clamped inside is thrown away. Subscribers are called in the
     order they signed up. */
  store.on(() => { if (window.Lab && Lab.forget) Lab.forget(); });
  paint();

  // A scroll is cut to the width of the words, and the words change width twice
  // after that first paint: once when the web fonts land, and again every time
  // a genre swaps --display and --mono for a different pair. Both re-measure.
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => paint());
  document.addEventListener('lab:theme', () => paint());

  return { store, setTool, get tool() { return tool; },
           band, clearPick,              // lab.js: the band was let go, or the pick put down
           bounds,                       // …and how far what is on the wall reaches
           copy, paste, dropClip, flip,  // …and its ctrl+c, ctrl+v and shift H/V
           get picked() { return picked().length; },
           stampAt,                      // tracer.js: a tracing dragged off the library lands here
           stickerAt,                    // stickers.js: …and a sticker dragged out of the drawer
           gifAt,                        // gif.js: …and a gif dragged off the row, or clicked in it
           syncOpts: buildOpts,          // the + tool redraws its own row through this
           paint,                        // tracer.js: a stamp is drawn from the library, so the library changing repaints
           mark,                         // …and tells undo what it just put up
           undo,                         // the button, and lab.js's ctrl+z
           PAL, PW, PEN, PO, SK, FONTS, STICKIES, STAMPS, stickyArt };
})();
