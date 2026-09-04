/* ─── THE FRAMES ───────────────────────────────────────────────────────────
   Everything standing on this bench is a design-canvas feature — one of the
   .dc.html files in ./features — and this is the file that puts them there.

   THERE IS NO CASE ROUND ANY OF THEM. A feature sits on the paper as itself:
   no panel, no handle bar, no border. It is in an iframe only because a
   .dc.html is not a fragment but a DOCUMENT — support.js boots it by finding
   the one <x-dc> in `document`, swapping it for a React root and appending a
   full-page stylesheet to `document.head`, one per document, head and all, so
   eighty-four of them on one page is not something you talk it into. The frame is
   plumbing; nothing about it is drawn.

   FOUR THINGS THAT HAVE TO BE SOLVED TO PUT A BARE DOCUMENT ON A CANVAS

     1 · IT MUST NOT EAT THE WHEEL.  An iframe swallows every pointer event
     that lands on it, and this bench is panned by scrolling. So a transparent
     SHIELD sits over each feature and the document under it is dead until you
     click: shield up, the bench gets the wheel; one click and it drops and the
     feature is live. It goes back up when the pointer leaves, on esc, when you
     pick up a drawing tool, and whenever the hand comes out. The frames are
     same-origin, so esc and the pointer leaving are heard INSIDE the frame
     too — otherwise a feature you had clicked into would keep the keyboard.

     2 · WITHOUT A HANDLE BAR, THE SHIELD IS THE HANDLE.  lab.js drags a gizmo
     by its [data-handle], or by the whole element if it has not got one; the
     shield is a child of that element, so a press on it starts the drag and a
     press on a live feature does not. Which leaves one thing to sort out: the
     same gesture is both 'use this' and 'move this'. It is settled the way a
     canvas settles it — a press that ends where it began is a click and wakes
     the feature; one that travels more than a few pixels was a drag, and the
     click that follows it is thrown away.

     3 · IT MUST NOT ALL LOAD AT ONCE.  Every frame pulls React and Babel off
     unpkg and compiles its own script. Eight at once on first paint is a
     stalled page, so a frame's src is only set when the feature comes into
     view, and until then all that is on the paper is a small chip saying so.

     3½ · IT BRINGS ITS OWN PAPER, and must not. See unpaper(), below.

     4 · IT HAS NO SIZE OF ITS OWN.  Every one of these screens is written
     `min-height:100vh`, so it is as big as whatever box it is handed — which
     for a while meant the box was the design decision, and a box cut too
     small cropped the drawing and handed you scrollbars. So the drawing is
     measured instead and the frame given exactly its own size, and the box
     over it is a WINDOW that scales what is in it: nothing is ever off the
     edge, there is nothing for a scrollbar to be for, and the corner on each
     one is a zoom on that feature rather than a crop of it. See 'the frame is
     a window', below.

     5 · ONE OF THEM IS NOT A FRAME.  The sign is drawn in this page, in
     markup, because it is the mark itself and not a feature — and for a
     long time that meant it was the one thing on the bench with no corner
     on it at all. It has one now: a panel whose art is a child of this
     document rather than a document of its own scales that child instead
     of an iframe, and everything else about it — the corner, the readout,
     the double-click, 'reset layout' — is the same code. See A PANEL WITH
     NO DOCUMENT UNDER IT, in place().

   Sizes live in knoll-lab2:size2:<feature>, alongside lab.js's positions, and
   'reset layout' puts both back. A frame with nothing under its key is the
   size of its own drawing, which is where every default on this bench comes
   from; the key is :size2: because the numbers under the old one were boxes
   drawn round the artwork by hand, and they mean something else now. */

window.Frames = (function () {
  const bench = document.getElementById('bench');
  if (!bench || !window.Lab) return null;

  const KEY = 'knoll-lab2:size2:';
  /* MAXH was 2400, which was headroom for a drawing until one of them started
     GROWING: the scroll pulls open to 1600px of body, and with the gnome
     hanging off its bottom roller the whole of it comes to a little over 2300
     — near enough the ceiling that the last few inches of the pull were cut
     off by it. 3200 is what the width has always been; the height matching it
     leaves the fully unrolled scroll around 800px of room to spare. */
  /* MINW/MINH were 320×240, which is the smallest a frame could be without
     losing the drawing — back when a small frame lost the drawing. Nothing is
     lost at any size now, so they are just the smallest window still worth
     having one of: a hundred and twenty across leaves the corner grip, the
     dimensions chip and enough of a picture to know which feature it is. */
  const MINW = 120, MINH = 90, MAXW = 3200, MAXH = 3200;
  const panels = [];
  /* Two lookups beside the list, because every observer on this bench asks
     "which panel is this element" once per row and the list answered by
     walking itself — fine at eighty-four, two million comparisons a second
     under ctrl at a thousand. byEl answers in one step; byWin answers the
     __dc_booted message by the window that sent it. */
  const byEl = new WeakMap();
  const byWin = new Map();

  /* ── THE POSTERS ───────────────────────────────────────────────────────
     A machine is a document, and a document costs the main thread every
     frame it is warm (kits.js has the measurement). At 20% the whole bench
     is warm and a machine is a postage stamp nobody can use — so a machine
     does not boot until its box is BOOT_PX wide on screen. Until then the
     box holds its POSTER: a picture of the drawing, taken from this very
     bench by perf/posters.js (transparent, 2×, the box's own size), placed
     by the same sum place() uses for a drawing, so the picture is exactly
     where the document will be. Zoom in past the line and the document
     boots and fades in over it; click it and it boots at once. A machine
     with no poster (a new feature, a poster not yet built) boots the old
     way, the moment it comes within 400px, and shows its chip meanwhile —
     the posters are a saving, never a condition. */
  /* 480: at the opening zoom (35%) that is the four big machines and no
     other — a screenful of documents under the display's own frame; at
     50% the next four wake, at 100% the lot. */
  const BOOT_PX = 480;
  let posters = null;                   // data-src → { file, w, h }, once posters/index.json is in
  let postersAsked = false;             // …and until it has answered, nothing boots: the answer is a beat away
  /* THE EXCEPTION. A section marked data-live (index.html says which three
     and why) is never a picture: posterOf answers null for it, so big() boots it
     the moment it is within reach, dress() hangs nothing in its box and
     repost() never puts it away. It is the bench choosing to open on a thing
     that moves — the wizard swinging from the scroll's roller — and paying
     one warm document for it at every zoom. Everything else still earns its
     motion by being looked at. Kits.js has the same word for a kit part. */
  const posterOf = p => (!p.el.hasAttribute('data-live') && posters && p.src && posters[p.src]) || null;
  const big = p => {
    if (!postersAsked) return false;    // not yet: load() is called for everything wanted once it is
    if (!posterOf(p)) return true;      // nothing to show instead: boot as ever
    const z = (window.Lab && Lab.zoom) || 1;
    return (parseFloat(p.el.style.width) || 0) * z >= BOOT_PX;
  };
  /* AND BACK TO THE PICTURE. A document, once booted, stays booted — its
     state is its own — but while its box is under the line it is not
     DRAWN: the frame goes display:none and the poster shows instead, so a
     bench zoomed out after a look round costs what a bench that was never
     zoomed in costs. display:none keeps the document alive (its script,
     its typed text, its critters) and drops only its rendering; back over
     the line the frame shows again where it was. The live panel — the one
     you clicked into — is never put away under the hand. */
  function repost(p) {
    if (!p.poster || p.art) return;
    const away = p.el.classList.contains('booted') && live !== p && !big(p);
    if (p.el.classList.contains('gz-postered') !== away) p.el.classList.toggle('gz-postered', away);
  }
  // the picture into the box, under the chip's place (and under the
  // document, once there is one — see repost)
  function dress(p) {
    const po = posterOf(p);
    const box = p.el.querySelector('.gz-poster');
    if (!po || !box || p.poster) return;
    const img = document.createElement('img');
    img.alt = ''; img.decoding = 'async'; img.draggable = false;
    img.src = 'posters/' + po.file;
    img.width = po.w; img.height = po.h;
    box.classList.add('has-img');
    box.appendChild(img);
    p.poster = img;
    if (!p.natW) { p.natW = po.w; p.natH = po.h; }     // the poster is the drawing, measured
    place(p);
    repost(p);
  }
  fetch('posters/index.json', { cache: 'no-cache' }).then(r => (r.ok ? r.json() : null)).then(j => {
    if (j && j.posters) posters = j.posters;
  }).catch(() => {}).then(() => {
    postersAsked = true;                // with or without an answer, the bench boots what it wants
    panels.forEach(dress);
    panels.forEach(p => { if (p.wanted && !p.loading && big(p)) load(p); });
  });

  const sound = k => { if (window.Vol) Vol.play(k); };
  // the dock's tools draw on the paper; while one is up a click on a panel is
  // somebody drawing, not somebody using it
  const drawing = () => !!(window.Wall && Wall.tool && Wall.tool !== 'move');

  // ── the size a frame is cut to ──────────────────────────────────────────
  function savedSize(id) {
    try {
      const v = JSON.parse(localStorage.getItem(KEY + id));
      if (v && isFinite(v.w) && isFinite(v.h)) return v;
    } catch (e) {}
    return null;
  }

  // …and the size it is cut to IN THE FILE: data-cut="1200x800", written by
  // serve.js when keep.js sends a session home. See the note in adopt().
  function cutAttr(el) {
    const m = /^(\d+)x(\d+)$/.exec(el.dataset.cut || '');
    return m ? { w: +m[1], h: +m[2] } : null;
  }

  // The box is a window on the drawing, and a window crops nothing — so there
  // is no floor under it any more. The smallest a frame can be cut to is the
  // smallest window worth keeping; what is in it shrinks to fit.
  function cut(p, w, h, save) {
    w = Math.max(MINW, Math.min(MAXW, Math.round(w)));
    h = Math.max(MINH, Math.min(MAXH, Math.round(h)));
    p.el.style.width = w + 'px';
    p.el.style.height = h + 'px';
    place(p);
    if (p.dim) {
      const b = inkOf(p), s = Math.round(Math.min(w / b.w, h / b.h) * 100);
      p.dim.textContent = w + ' × ' + h + (s === 100 ? '' : ' · ' + s + '%');
    }
    if (save) {
      p.sized = true;
      try { localStorage.setItem(KEY + p.id, JSON.stringify({ w, h })); } catch (e) {}
    }
  }

  /* ── THE FRAME IS A WINDOW, AND THE DRAWING IS FITTED INTO IT ────────────
     A feature does not crop the way a page crops. Every one of these screens
     is `min-height:100vh` and centred inside that, so a box too small for it
     did not cut the bottom off and leave it at that — it centred what would
     not fit, lost BOTH ends, and handed you two scrollbars to go and find
     them with. Nothing about the bench says so; you just got a machine with
     no chimneys and a pair of grey bars nobody drew.

     For a while the answer was a FLOOR: measure the drawing, and refuse to
     cut the box any smaller than it. That kept everything on screen and made
     the corner a liar — half its travel did nothing, and the frames with a
     floor of fifteen hundred pixels could not be tidied out of the way at
     all.

     So the box no longer crops the drawing. It SCALES it:

       the drawing is measured inside the viewport it was composed at, and
         that measurement — not the viewport — is the frame's natural size
       the frame keeps the whole viewport, sheet and all, and is slid so that
         the box is over the DRAWING part of it; the surplus is empty paper
         and .gz clips it
       the box is whatever you cut it to, and the frame is scaled to fit it,
         centred, either way — down to tuck a machine out of the way, up to
         lean in on one
       nothing inside the document ever moves, so nothing in it can find an
         edge to scroll to

     The corner is a zoom on that feature now. Cut a frame to a quarter and
     you get the whole drawing at a quarter size; there is no size at which
     any of it is over the edge, which is the only sure way to be rid of a
     scrollbar — not to hide it, but to leave it nothing to report.

     A FRAME NOBODY HAS RE-CUT IS THE SIZE OF ITS DRAWING, and stays that
     size. That is where the default comes from — no box sizes guessed at in
     index.html any more, no padding drawn round the artwork by hand — and it
     is also how the scroll still works: it is drawn rolled up and pulls open
     to sixteen hundred pixels of body, so its natural size grows as it is
     pulled and its box grows with it. Re-cut it yourself and it stops
     following: from then on it unrolls INSIDE your window, scaling as it
     goes, which is the same promise kept the other way round.

     …OR AT A FRACTION OF IT, if the markup asks. data-scale on the section is
     a multiplier on that natural size, and it is the ONE way index.html gets
     to have an opinion about how big a feature is drawn. It is not a box: a
     box guessed at in the markup goes stale the moment the drawing changes,
     which is the whole reason none are written down any more. A fraction does
     not — the frame goes on following its drawing, at that fraction of it,
     and everything downstream still works off natural(): the corner re-cuts
     from there, a double-click fits back to there, 'reset layout' goes back
     to there, and the readout says what fraction you are looking at.

     WHAT IT IS FOR is scale between two drawings that were never drawn to
     one. Every feature on this bench was composed on its own sheet, so a
     gnome and a book put side by side come out the size their own canvases
     made them, and the librarian standing at the foot of the rule book was a
     man as tall as the book he was reading. Two thirds is the answer to that
     and it belongs in the layout, next to the position it is part of, not in
     a saved size in somebody's browser. It is used ONCE — index.html, 21 —
     and it should stay rare: a bench where every frame carries a number is a
     bench of guessed boxes again, wearing a different hat.

     THREE THINGS WORTH KNOWING ABOUT THE MEASUREMENT

       1 · It stops at anything that clips. A container with its overflow
       hidden is the design cropping its own art on purpose — the sticker
       sheet runs a CAUTION sticker off the edge of the sheet — and following
       it inside would grow the frame to fit something nobody was meant to
       see. The clipping box's own rectangle is the end of it.

       2 · It ignores the full-bleed wrappers. #dc-root, .sc-host and the
       screen root are the SHEET, and a sheet is exactly as big as the box it
       is handed: measuring one would report 'the drawing is the size of the
       frame' every time. They are stepped through, not counted.

       3 · It starts from the size the feature was DRAWN at — data-w and
       data-h, which is now all those two numbers are for. These layouts are
       viewport-driven, and the measurement is taken from the viewport they
       were composed against rather than from whatever the box happens to be.

     It runs when the feature boots, again when the fonts land — a face
     swapping under the text moves everything — and once more a beat later for
     whatever arrives without saying so. */

  const drawnAt = p => ({ w: +p.el.dataset.w || 1120, h: +p.el.dataset.h || 780 });
  /* WHAT THE BOX IS A WINDOW ON: the drawing, once it has been measured, and
     the viewport it was composed at until then — which off the disk is until
     always. Everything that scales asks this rather than p.natW, so that an
     unmeasured frame is a smaller window on the same picture and never a crop
     of it, and so the readout says a percentage of something either way. */
  const inkOf = p => (p.natW && p.natH ? { w: p.natW, h: p.natH } : drawnAt(p));
  /* The size a frame is when nobody has re-cut it: its drawing, times whatever
     data-scale says — see …OR AT A FRACTION OF IT above. Before the drawing
     has been measured there is nothing to take a fraction OF, so it falls back
     to the viewport it was composed at, scaled the same way. */
  const scaleOf = el => { const v = parseFloat(el.dataset.scale); return v > 0 ? v : 1; };
  function natural(p) {
    const k = scaleOf(p.el), d = drawnAt(p);
    return { w: Math.round((p.natW || d.w) * k), h: Math.round((p.natH || d.h) * k) };
  }
  const isSheet = el => el.id === 'dc-root' || el.classList.contains('sc-host')
                     || el.hasAttribute('data-screen-label')
                     || el.hasAttribute('data-lab-sheet');   // the sheet inside the sheet — bare.css, NO SECOND SHEET
  const frameOf = p => p.el.querySelector('iframe');

  /* SHADOWS ARE INK, and getBoundingClientRect has never heard of them: it
     reports the LAYOUT box, and every gnome on this bench throws a drop
     shadow six pixels right and seven down of his own. Fitted to the layout
     to the pixel, the box lands exactly on the drawing and shaves the shadow
     off two of its sides. So every rectangle is let out by whatever its own
     shadows spill past it — offset plus blur plus spread, on the side each
     one falls on.

     THE BRACKETS ARE THE TRAP. A computed filter reads `drop-shadow(rgba(0,
     0, 0, 0.3) 6px 7px 0px)`: the colour comes first and brings brackets of
     its own, so a regexp reading up to the first ) stops inside the rgba and
     hands back something with no lengths in it at all. Which is silent —
     every gnome simply measured six pixels narrower than he is — so the
     arguments are taken by counting brackets instead.

     AND A FILTER IS THE WHOLE SUBTREE'S. It is set on the <svg> and it draws
     the shadow of everything inside it, so a child that hangs over its own
     svg's edge — the builder's hammer does, by three pixels — throws a shadow
     three pixels further still. The spill is carried DOWN the walk for that:
     an element is let out by its own shadows and by every one it is inside
     of. Adding them is generous where both are real, which costs a pixel or
     two of air on the one drawing that has both and never costs a corner. */
  const LEN = /(-?[\d.]+)px\s+(-?[\d.]+)px(?:\s+(-?[\d.]+)px)?(?:\s+(-?[\d.]+)px)?/;

  function calls(str, name) {                 // every name(…) in str, nesting and all
    const out = [];
    for (let i = 0; (i = str.indexOf(name + '(', i)) !== -1;) {
      let depth = 0, j = i + name.length;
      for (; j < str.length; j++) {
        if (str[j] === '(') depth++;
        else if (str[j] === ')' && !--depth) break;
      }
      out.push(str.slice(i + name.length + 1, j));
      i = j + 1;
    }
    return out;
  }

  function spill(cs) {
    const s = { l: 0, t: 0, r: 0, b: 0 };
    const add = (x, y, blur, spread) => {
      const g = (blur || 0) + (spread || 0);
      if (g - x > s.l) s.l = g - x;
      if (g + x > s.r) s.r = g + x;
      if (g - y > s.t) s.t = g - y;
      if (g + y > s.b) s.b = g + y;
    };
    if (cs.filter && cs.filter !== 'none') {
      calls(cs.filter, 'drop-shadow').forEach(a => {
        const m = LEN.exec(a);
        if (m) add(+m[1], +m[2], +(m[3] || 0), 0);
      });
    }
    if (cs.boxShadow && cs.boxShadow !== 'none') {
      cs.boxShadow.split(/,(?![^(]*\))/).forEach(one => {   // not the commas in rgba()
        if (/inset/.test(one)) return;                      // that one is drawn inside
        const m = LEN.exec(one);
        if (m) add(+m[1], +m[2], +(m[3] || 0), +(m[4] || 0));
      });
    }
    return s;
  }

  function extent(p) {
    const doc = docOf(p);
    if (!doc || !doc.body || !doc.body.firstElementChild) return null;
    const win = doc.defaultView;
    let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity, n = 0;
    (function walk(node, acc) {
      for (let el = node.firstElementChild; el; el = el.nextElementSibling) {
        /* THE CTRL OUTLINE IS NOT INK. ink.js lays a flat copy of the drawing
           behind the drawing and spreads it, so the rim that shows past the
           edges is an outline of the real silhouette — see THE OUTLINE IS A
           COPY, in ink.js. It is a copy of what is already being measured,
           two pixels bigger, so measuring it would grow the frame by two
           every time somebody held ctrl over it. It is the one thing in
           here that is on the paper without being on the drawing. */
        if (el.hasAttribute && el.hasAttribute('data-lab-ink')) continue;
        const cs = win.getComputedStyle(el);
        if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity === 0) continue;
        const own = spill(cs);
        const s = { l: own.l + acc.l, t: own.t + acc.t, r: own.r + acc.r, b: own.b + acc.b };
        const paper = isSheet(el);
        if (!paper) {
          const r = el.getBoundingClientRect();
          if (r.width || r.height) {
            n++;
            if (r.left - s.l < x1) x1 = r.left - s.l;
            if (r.top - s.t < y1) y1 = r.top - s.t;
            if (r.right + s.r > x2) x2 = r.right + s.r;
            if (r.bottom + s.b > y2) y2 = r.bottom + s.b;
          }
        }
        if (paper || (cs.overflowX === 'visible' && cs.overflowY === 'visible')) walk(el, s);
      }
    })(doc.body, { l: 0, t: 0, r: 0, b: 0 });
    return n ? { x1, y1, x2, y2 } : null;
  }

  /* What is written into the frame to make the fit hold. The shift is a
     transform because a transform moves the picture without re-laying
     anything out — a margin would push the root's own box about and start the
     very scrollbar this is trying to be rid of. And the bars go, both of
     them: the shift leaves empty sheet hanging over the bottom and the right,
     which is all there is left to scroll to, and a scrollbar for a blank inch
     of paper is chrome for nothing — one turning up would steal fifteen more
     pixels from the thing it turned up to report.

     THE RULE IS ON html AND NOT ON body, which is the difference between
     hiding a scrollbar and cropping a drawing. Overflow on the root is what
     the VIEWPORT takes its scrollbars from, so hidden there is enough for
     both bars; hidden on the body as well would additionally clip the body's
     own children — and two of these hang art outside it on purpose, the rule
     book's back board by 217px. Not one of the seventy-one sets an overflow of its
     own on either, so the root alone does it. */
  function frameCss(p, dx, dy) {
    const doc = docOf(p);
    if (!doc) return;
    let st = doc.getElementById('lab-fit');
    if (!st) {
      st = doc.createElement('style');
      st.id = 'lab-fit';
      (doc.head || doc.documentElement).appendChild(st);
    }
    const css = 'html{overflow:hidden!important}'
      + (dx || dy ? '[data-screen-label]{transform:translate(' + dx + 'px,' + dy + 'px)!important}' : '');
    if (st.textContent !== css) st.textContent = css;
  }

  /* ── MEASURING IT ───────────────────────────────────────────────────────
     Which cannot be done in one look, because the viewport being measured is
     part of what is being measured: these layouts CENTRE, so give one another
     200px of room and it hands half of them straight back as overhang, having
     moved 100px to the right. So the frame is opened OUT from the size the
     feature was drawn at, by TWICE what is over the right or the bottom edge
     — the half that comes back as drift is then paid for too, which is the
     fixed point the same sum converges to one halving at a time, reached in
     one go instead of nine. Anything hanging off the top or the left is
     brought back by shifting the whole document down and right by as much.

     What comes out of that is a viewport with all of the drawing inside it,
     and where in that viewport the drawing actually is. Both are kept, and
     the difference between them is the whole trick — see below.

     THE DOCUMENT IS NEVER HANDED A VIEWPORT IT WAS NOT COMPOSED FOR, which is
     the thing this got wrong on the first go. Fitting looks like it ought to
     be done by shrinking the frame onto the artwork until the two are the
     same size, and that reads beautifully until a layout answers a smaller
     viewport by drawing something ELSE: the sticker sheet re-flowed and came
     back 106px shorter, the fan banner 80px narrower, both of them fitting
     perfectly and neither of them the drawing any more. So the viewport stays
     where the design put it and the CROP is done outside, by the box. */
  const PASSES = 5;

  function viewport(p, w, h) {
    const f = frameOf(p);
    f.style.width = w + 'px';
    f.style.height = h + 'px';
  }

  function measure(p) {
    if (!docOf(p) || !frameOf(p)) return;
    const d = drawnAt(p);
    let w = d.w, h = d.h, dx = 0, dy = 0, b = null;
    viewport(p, w, h);
    frameCss(p, 0, 0);

    for (let i = 0; i < PASSES; i++) {
      b = extent(p);
      if (!b) break;
      const l = Math.max(0, Math.ceil(-b.x1)), t = Math.max(0, Math.ceil(-b.y1)),
            r = Math.max(0, Math.ceil(b.x2 - w)), u = Math.max(0, Math.ceil(b.y2 - h));
      if (!l && !t && !r && !u) break;             // all of it is inside
      dx += l; dy += t;                            // bring back the top left
      w = Math.min(MAXW, w + l + 2 * r);           // and buy room for the rest
      h = Math.min(MAXH, h + t + 2 * u);
      viewport(p, w, h);
      frameCss(p, dx, dy);
    }

    b = extent(p);                    // where the drawing ended up in all that
    if (!b) return;
    p.viewW = w;                                   // the document's viewport
    p.viewH = h;
    p.inkX = Math.max(0, Math.floor(b.x1));        // and the drawing within it
    p.inkY = Math.max(0, Math.floor(b.y1));
    // …and never more of it than there is frame to show: five passes settles
    // every one of these, but if one ever ran out with something still over
    // the edge, that something is clipped by the frame, and a box cut to
    // include it would be a box with a hole in the side of it
    p.natW = Math.max(1, Math.min(MAXW, w - p.inkX, Math.ceil(b.x2) - p.inkX));
    p.natH = Math.max(1, Math.min(MAXH, h - p.inkY, Math.ceil(b.y2) - p.inkY));
  }

  /* ── AND THE BOX IS A WINDOW ON IT ──────────────────────────────────────
     The frame keeps the viewport the drawing was measured in — every pixel of
     it, paper and all — and the box shows the part of it the drawing is on:
     slid up and left by where the drawing starts, scaled to fit, and clipped
     to the box by .gz's own overflow. So the frame is bigger than the box it
     is in, most of the time, and what is over the edge is empty sheet.

     WHICH WAY ROUND MATTERS, twice over. The document is laid out once, at the
     size it was composed at, and nothing in it re-flows however the corner is
     dragged — a feature made small is the same drawing further away, not a
     different drawing, and the measurement it was fitted by stays true.

     And a transform is honest about the pointer: a click at the far end of a
     frame scaled to 40% still lands on the button that is drawn there, and
     the frame's own coordinates still go from 0. */
  function place(p) {
    const w = p.el.offsetWidth, h = p.el.offsetHeight;

    /* ── A PANEL WITH NO DOCUMENT UNDER IT ──────────────────────────────────
       The sign is drawn in this page rather than in a frame, so there is no
       viewport to slide about and nothing to measure from the inside. What it
       has instead is .gz-art — a box the size the mark was drawn at, with the
       whole of the mark inside it — and the same sum is done on that: fitted
       to the window, centred in it, origin at the top left so the scale and
       the translate do not fight.

       IT MUST BE A WRAPPER and not the section itself. The section is the
       BOX, which is what the corner cuts and what .gz clips to; scaling that
       would scale the window along with what is in it and the corner would do
       nothing at all. So the art is one element in, and the two are free to
       be different sizes — which is the whole idea. */
    if (p.art) {
      // inkOf, not drawnAt: for the sign they are the same box; for a kit
      // part the ink is the measured drawing and the viewport is not
      const d = inkOf(p), k = Math.min(w / d.w, h / d.h);
      p.art.style.width = d.w + 'px';
      p.art.style.height = d.h + 'px';
      p.art.style.transform = 'translate(' + ((w - d.w * k) / 2) + 'px,'
                            + ((h - d.h * k) / 2) + 'px) scale(' + k + ')';
      return;
    }

    /* the poster, while there is no document yet: the same sum as the art
       above, on the picture of the drawing */
    if (p.poster) {
      const d = inkOf(p), k = Math.min(w / d.w, h / d.h);
      p.poster.style.width = d.w + 'px';
      p.poster.style.height = d.h + 'px';
      p.poster.style.transform = 'translate(' + ((w - d.w * k) / 2) + 'px,' + ((h - d.h * k) / 2) + 'px) scale(' + k + ')';
    }

    const f = frameOf(p);
    if (!f) return;

    /* ── BEFORE THERE IS A DRAWING TO CUT TO ────────────────────────────────
       No measurement yet, so the viewport the feature was COMPOSED at stands
       in for one: the frame is data-w × data-h and the box is a window on the
       whole of that, ink and empty paper together.

       This used to be a return for everything but a data-scale, and the
       stylesheet's width:100%/height:100% did the job — which was right for
       as long as an unmeasured box was always BIGGER than the document inside
       it. It is not: the box starts at data-w × data-h, which crops nothing
       at 1:1, and then the corner cuts it smaller. A frame with nothing
       scaling it answers a smaller viewport by RE-FLOWING into it, centred,
       with both ends hanging over the edge where html{overflow:hidden} takes
       them off. That is a crop, and the whole of this file is an argument
       against crops.

       WHICH IS THE FAILURE THAT DOES NOT HEAL, because the moment it matters
       most is the moment measure() cannot run: off the disk, every frame is
       cross-origin, docOf() comes back null and natW never arrives at all
       (see §10 of about.md, and MEASURING IT above). Opened that way the bench
       had exactly one frame that scaled — the librarian, who carries a
       data-scale and so came through here — and forty-seven that cut the
       drawing off at the corner instead. One feature obeying the rule and the
       rest of them not is worse than none of them obeying it, because it
       reads as the drawing's fault rather than the bench's.

       So the fit happens out here for all of them. It is worth being plain
       about why it CAN: this function only ever touches the iframe from the
       OUTSIDE — its width, its height and its transform are the parent's DOM
       — so unlike the measurement it works cross-origin, and every frame
       shows the whole of its drawing wherever the file is opened from.

       AT THE DEFAULT BOX IT CHANGES NOTHING, which is the check worth doing
       before believing any of the above: a frame nobody has re-cut is
       data-w × data-h, so k comes out 1 and what is written is a translate of
       nothing by a scale of one — the same picture the stylesheet drew. What
       it buys is the corner. */
    // …and a natW handed over by the poster (dress) with no viewport measured
    // yet is the same case: until measure() has run there is no inkX to slide
    // by, and writing NaN into a transform changes nothing but is not a fit
    if (!p.natW || !p.natH || !p.viewW || !p.viewH) {
      const d = drawnAt(p), k = Math.min(w / d.w, h / d.h);
      f.style.width = d.w + 'px';
      f.style.height = d.h + 'px';
      f.style.transform = 'translate(' + ((w - d.w * k) / 2) + 'px,'
                        + ((h - d.h * k) / 2) + 'px) scale(' + k + ')';
      return;
    }

    const s = Math.min(w / p.natW, h / p.natH);
    f.style.width = p.viewW + 'px';
    f.style.height = p.viewH + 'px';
    f.style.transform = 'translate(' + ((w - p.natW * s) / 2 - p.inkX * s) + 'px,'
                      + ((h - p.natH * s) / 2 - p.inkY * s) + 'px) scale(' + s + ')';
  }

  function fit(p) {
    /* display:none measures nothing, so a panel put away behind its poster
       keeps the fit it had — asked of the FRAME, not of the class: a postered
       frame perf/posters.js has forced back on screen for its picture is
       there to be measured, and measuring it is the only way the picture
       comes out at the drawing's own scale. (Asked of the class, the cards
       cut under the boot line at 100% were never measured at all, place()
       had a natW from the old poster and no viewport to go with it, and the
       new poster was the card at the cut's scale, cropped — 2026-09-04.) */
    const fr = frameOf(p);
    if (!fr || !fr.offsetWidth) return;
    if (!docOf(p) || p.el.classList.contains('sizing')) return;
    measure(p);
    if (!p.natW) return;
    // a frame nobody has re-cut is the size of its drawing — and goes on
    // being the size of its drawing, however the drawing changes
    if (p.sized) place(p);
    else { const n = natural(p); cut(p, n.w, n.h, false); }
    // …and if the box it came out at is under the boot line — a banner that
    // loaded on its composed width and measured narrower — it is put away
    // behind its poster now, the same rule a zoom applies, rather than
    // staying a drawn document until the next zoom lands (2026-09-04)
    repost(p);
  }

  function fitSoon(p) {
    // a cold panel's subtree is skipped, so there is nothing to measure —
    // the cold observer re-calls this the moment the panel warms
    if (p.cold || p.el.classList.contains('gz-cold')) { p.needFit = true; return; }
    fit(p);
    const doc = docOf(p);
    if (doc && doc.fonts && doc.fonts.ready) doc.fonts.ready.then(() => fit(p), () => {});
    setTimeout(() => fit(p), 700);
    watchSize(p);
  }

  /* ── AND AGAIN, WHENEVER THE DRAWING CHANGES SIZE ───────────────────────
     Boot, fonts, and a beat later covers everything that is DRAWN once. The
     scroll is not: it is drawn rolled up and pulls open to sixteen hundred
     pixels of body, so its drawing is a different size every frame of the
     gesture, and a measurement taken at boot is the measurement for a scroll
     nobody has touched yet. Pull it against that and the paper grows past the
     frame it was fitted to, which crops everything below — the bottom roller,
     the gnome, the lot.

     So the frame's own root is watched, and any change in its size re-measures
     it. The frame grows with the paper and, as long as nobody has re-cut this
     one, so does the box: the scroll unrolls DOWNWARD out of a box that keeps
     up. Nothing to special-case for the scroll — any feature that changes size
     gets it, and one that has been re-cut scales inside the box it was given
     instead.

     THE GUARD IS NOT OPTIONAL. Measuring is done by putting the frame at the
     size the feature was drawn at and growing from there, and the frame is
     the viewport — which is the thing being observed. Without the flag it
     feeds itself forever. */
  function watchSize(p) {
    if (p.ro || !window.ResizeObserver) return;
    const doc = docOf(p);
    const root = doc && (doc.querySelector('[data-screen-label]') || doc.body);
    if (!root) return;
    let queued = 0;
    p.ro = new ResizeObserver(() => {
      if (p.fitting) return;
      cancelAnimationFrame(queued);
      queued = requestAnimationFrame(() => {
        p.fitting = true;
        try { fit(p); } finally { p.fitting = false; }
      });
    });
    p.ro.observe(root);
  }

  // ── the shield: up by default, down while a feature is being used ───────
  let live = null, rearmT = 0;

  /* Letting go has to hand the KEYBOARD back as well as the pointer. Clicking
     into a frame puts the focus inside that document, and it stays there after
     the shield goes back up — so shift 1, the zoom keys and the hand would all
     be typed into a feature that has never heard of them. Blurring the iframe
     drops the focus back out to this page, where the bench's keys live. */
  function release() {
    clearTimeout(rearmT);
    if (!live) return;
    const f = live.el.querySelector('iframe');
    if (f && document.activeElement === f) f.blur();
    live.el.classList.remove('live');
    const was = live;
    live = null;
    tellPause(was);              // no longer under the hand — tiny freezes it again
    repost(was);                 // …and if it is under the boot line, its picture comes back
  }

  function activate(p) {
    if (p.el.classList.contains('gz-postered')) p.el.classList.remove('gz-postered');
    if (live === p) return;
    release();
    live = p;
    p.el.classList.add('live');
    tellPause(p);                // a used feature never freezes, however small
    sound('live');
  }

  const rearm = ms => {
    clearTimeout(rearmT);
    rearmT = setTimeout(release, ms == null ? 260 : ms);
  };
  const holdOn = () => clearTimeout(rearmT);

  const docOf = p => { try { return p.el.querySelector('iframe').contentDocument; } catch (e) { return null; } };

  /* ── TAKING THE PAPER OUT FROM UNDER THEM ────────────────────────────────
     Each of these was drawn as a whole SCREEN, so each carries a full-bleed
     sheet of its own — cream for seven of them, a dark brown vignette for the
     rule book — in three layers:

       body{background:#f2e9cf}         the helmet stylesheet
       [data-screen-label]{background:} an inline style on the screen root
       a paper-grain overlay            one absolutely positioned, full-bleed,
                                        pointer-events:none child of that root

     …and two more since the machines were re-exported on 2026-09-04: a
     SECOND full-viewport cream div under the root, round the drawing, and a
     zoom widget pinned to the corner that scales it. Those two the file
     marks itself — data-lab-sheet, data-lab-nozoom, written by
     perf/swap-machine.js — because a full-viewport div is exactly what the
     measurement must step through and not count (isSheet, above), and a
     zoom inside a frame would move the drawing under a measurement that
     never re-runs. bare.css, NO SECOND SHEET, has the whole argument.

     On a page that is a page, all three are right. On this bench they are a
     rectangle drawn round every feature — which, having taken the cases off,
     is the last thing still drawing a box.

     THE REAL WORK IS DONE IN features/bare.css, which each .dc.html loads
     itself. It has to be, and this is the interesting part: a frame can only
     be reached into from out here when it is SAME-ORIGIN, and a page opened
     straight off the disk is not — file:// documents are strangers, so on a
     double-clicked index.html this function gets `null` for every
     contentDocument and does nothing at all, silently, while every feature
     keeps its cream. Off a server it worked and off the disk it did not.

     So what is left here is the SECOND pass, for the case the stylesheet
     cannot cover: a feature re-exported out of Design Canvas comes back
     without the <link> in its head. Same three rules, applied from outside
     when the origin allows it.

     The grain is the awkward one — in the file it is marked data-lab-nopaper,
     but a fresh export would not be, so here it is found by what it IS rather
     than by what it is called: directly under the screen root, absolutely
     positioned, the full size of it, and taking no pointer. That is exact
     enough to hit one element in each of the ten that has one. Anything nested deeper —
     a scanline over a monitor, the glow under the spawner — is a layer inside
     the artwork and is left alone. */
  const BARE_CSS = 'html,body{background:transparent!important}'
    + '[data-screen-label]{background:transparent!important}'
    + '[data-lab-nopaper]{display:none!important}'
    + '[data-lab-sheet]{background:transparent!important;zoom:1!important}'
    + '[data-lab-nozoom]{display:none!important}'
    + 'html[data-lab-paused] *,html[data-lab-paused] *::before,html[data-lab-paused] *::after{animation-play-state:paused!important}'
    + 'html[data-lab-crowd] svg *,html[data-lab-crowd] svg *::before,html[data-lab-crowd] svg *::after{animation-play-state:paused!important}';

  function unpaper(p) {
    const doc = docOf(p);
    if (!doc) return;
    if (!doc.getElementById('lab-bare')) {
      const st = doc.createElement('style');
      st.id = 'lab-bare';
      st.textContent = BARE_CSS;
      (doc.head || doc.documentElement).appendChild(st);
    }
    const root = doc.querySelector('[data-screen-label]');
    if (!root) return;                    // not rendered yet — the css alone will do
    // …looked for under the root, and under the inner sheet where the six
    // machines keep theirs (NO SECOND SHEET, bare.css)
    [root].concat([].slice.call(root.querySelectorAll('[data-lab-sheet]'))).forEach(sheet => {
      const r = sheet.getBoundingClientRect();
      [].forEach.call(sheet.children, c => {
        const cs = doc.defaultView.getComputedStyle(c), b = c.getBoundingClientRect();
        if (cs.position !== 'absolute' || cs.pointerEvents !== 'none') return;
        if (Math.abs(b.width - r.width) > 2 || Math.abs(b.height - r.height) > 2) return;
        c.setAttribute('data-lab-nopaper', '');   // an attribute, not a style: React
      });                                         // owns the style prop, not this
    });
  }

  /* The frames are same-origin, so the inside of one can be asked to behave:
     esc lets go, and the pointer leaving the document re-arms the shield the
     way leaving the panel does out here. Wrapped anyway — if this ever moves
     to a sandbox that refuses, a feature simply keeps the keyboard until you
     click off it, which is a smaller loss than a crash. */
  /* ── THE DRAG, TOLD TO THE FRAME ───────────────────────────────────
     A feature cannot see the bench. It is a document in a frame: it knows
     its own pointer and nothing about the sheet it is pinned to, so a
     drawing that wants to REACT to being carried — the gnome on the scroll's
     bottom roller, who shakes when the scroll he is holding moves — has no
     way to know it is happening. lab.js already says it, in the one place
     that knows: it puts .dragging on the section for the length of the
     gesture. All that is missing is a way through the glass.

     So this mirrors it. One observer on the sections' class attribute, and
     the answer is written onto the frame's own <html> as data-lab-drag,
     where the feature's stylesheet can read it like any other selector.
     No message passing, no polling, and nothing for the feature to unwire
     — a document that does not care simply has an attribute it never uses.

     Same origin only, like everything else that reaches inside: opened off
     the disk this quietly does nothing, and the gnome just keeps swinging. */
  function tellDrag(p) {
    const on = p.el.classList.contains('dragging');
    // a kit part has no document to tell: kits.js lifts it into the hand
    if (p.kit) { if (window.Kits && Kits.drag) Kits.drag(p.el, on); return; }
    const doc = docOf(p);
    if (!doc || !doc.documentElement) return;
    doc.documentElement.toggleAttribute('data-lab-drag', on);
  }

  const dragWatch = new MutationObserver(rows => rows.forEach(r => {
    const p = byEl.get(r.target);
    if (p) tellDrag(p);
  }));

  function wireInside(p) {
    const doc = docOf(p);
    if (!doc) return;
    doc.addEventListener('keydown', e => { if (e.key === 'Escape') release(); });
    doc.addEventListener('mouseleave', () => { if (live === p) rearm(); });
    doc.addEventListener('mouseenter', holdOn);
    /* A right-click in here is the bench's menu, not the browser's — the
       document keeps its own events, so lab.js would never hear it. The
       pointer is put back into the page's pixels the way the ctrl-wheel
       below does (k is the frame's scale on screen, both zooms in one
       number). A field keeps its native menu: paste belongs to it. And a
       press or a key in here puts an open menu away, since the page's own
       listeners cannot see either. */
    doc.addEventListener('contextmenu', e => {
      if (!window.Lab || !Lab.menuAt) return;
      const t = e.target;
      if (t && t.closest && t.closest('input,textarea,select,[contenteditable=""],[contenteditable="true"]')) return;
      e.preventDefault();
      const f = p.el.querySelector('iframe'), r = f.getBoundingClientRect();
      const k = f.offsetWidth ? r.width / f.offsetWidth : (Lab.zoom || 1);
      Lab.menuAt(p.el, r.left + e.clientX * k, r.top + e.clientY * k);
    });
    doc.addEventListener('pointerdown', () => { if (window.Lab && Lab.closeMenu) Lab.closeMenu(); }, true);
    doc.addEventListener('keydown', () => { if (window.Lab && Lab.closeMenu) Lab.closeMenu(); }, true);
    /* a wheel inside a live feature belongs to the feature; when it has
       nowhere left to scroll, hand it back to the bench rather than dead-end.
       'Nowhere left' is asked of what is actually under the pointer, not of
       the document: the frame is now cut to fit the drawing and the document
       never scrolls, so asking it would take the wheel off a chat log or any
       other scroller inside a feature and put the whole feature to sleep
       half way down it. */
    /* THE HOLE THIS PLUGS. The handler below is passive — it only ever hands
       the wheel back — so a ctrl-wheel over a live feature was returned from
       and then went to the BROWSER, which zoomed the whole page: the header,
       the docks, the bench and everything on it, all at once, and the bench's
       own zoom then compounded with it. Every other pixel of lab 2 treats
       ctrl-wheel as the canvas zoom; a feature is a hole in the page where it
       meant page zoom instead.

       The point under the cursor has to stay under it, and this document's
       clientX is measured from the frame's top left rather than the window's,
       in the frame's OWN pixels — which are not the page's twice over: the
       bench is at some zoom, and the frame is scaled inside its box on top of
       that. Both are in the one number k, taken as the ratio between what the
       frame measures on screen and what it thinks it is; a rectangle knows
       about every transform above it, so nothing has to be tracked. */
    doc.addEventListener('wheel', e => {
      if (!(e.ctrlKey || e.metaKey) || !window.Lab) return;
      e.preventDefault();
      const f = p.el.querySelector('iframe'), r = f.getBoundingClientRect(), z = Lab.zoom;
      const k = f.offsetWidth ? r.width / f.offsetWidth : z;
      const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? r.height : 1;
      Lab.setZoom(z * Math.exp(-e.deltaY * unit * 0.0022),
                  r.left + e.clientX * k, r.top + e.clientY * k);
    }, { passive: false });

    doc.addEventListener('wheel', e => {
      if (e.ctrlKey || e.metaKey) return;              // that is a zoom
      const win = doc.defaultView;
      for (let el = e.target; el && el.nodeType === 1 && el !== doc.documentElement; el = el.parentElement) {
        const cs = win.getComputedStyle(el);
        if (/(auto|scroll)/.test(cs.overflowY) && el.scrollHeight - el.clientHeight > 1) return;
        if (/(auto|scroll)/.test(cs.overflowX) && el.scrollWidth - el.clientWidth > 1) return;
      }
      release();
    }, { passive: true });
  }

  /* ── loading: only what is on screen, and only once ──────────────────────
     A frame's own load event is NOT the signal. It fires when the document has
     arrived, and the document is only a template plus support.js — the runtime
     then goes off to unpkg for React and Babel and compiles the feature, which
     can fail. Taking `load` for booted meant a frame that never got React
     dropped its chip and left nothing at all on the paper, which reads as a
     feature that is not there rather than one that has not arrived.

     The runtime says so itself: on a successful boot it posts `__dc_booted` up
     to its parent. That is the signal. `load` only starts a clock, and if the
     clock runs out the panel says what happened instead of pretending. */
  const BOOT_MS = 20000;

  function up(p) {
    clearTimeout(p.late);
    unpaper(p);                                  // again: now the grain exists
    p.el.classList.remove('stalled');
    p.el.classList.add('booted');
    if (p.wakeOnBoot) { p.wakeOnBoot = false; setTimeout(() => activate(p), 0); }   // clicked while a poster: wake it now it is here
    else repost(p);
    tellPause(p);                                // now pausing is safe — see tellPause
    fitSoon(p);                                  // and now there is a drawing to fit
    // a panel that drifted past the cold line while booting was left warm on
    // purpose (see coldIO) — it can go cold now there is nothing to interrupt
    if (p.cold) cool(p);
    if (p.free) p.free();                        // its place in the boot queue
  }

  function stall(p) {
    if (p.el.classList.contains('booted')) return;
    p.el.classList.add('stalled');
    const chip = p.el.querySelector('.gz-poster b');
    if (chip) chip.textContent = 'no runtime — needs the network';
  }

  /* ── A FEW AT A TIME, NOT ALL AT ONCE ───────────────────────────────────
     Every boot is main-thread work — parse the document, run support.js,
     compile the template, render the tree — and the observer below hands
     this function a BATCH: zoom out far enough and a hundred panels cross
     the 400px line in one frame. Booted all together they are one long
     freeze exactly while the camera is moving, which reads as the bench
     stuttering. So loads go through a queue, three in flight at once, each
     giving its slot up when its runtime says __dc_booted — or on a clock,
     because a slot held by a frame that never boots (no network, a broken
     export) must not plug the pipe for the ones behind it. */
  const loadQ = [];
  let inFlight = 0, pumpT = 0;
  const MAX_BOOTING = 3;

  /* WHILE THE CAMERA IS MOVING FAST, NOTHING CHANGES TIER — see the same
     heading over the camera in lab.js. A boot is the biggest change of all
     (a hundred milliseconds of parse, compile and render), so none starts
     mid-pan: the queue waits, asks again in a beat, and 'lab:still' calls
     it the moment the camera settles. Frames already in flight finish. */
  const rushing = () => !!(window.Lab && Lab.moving && Lab.moving());

  function pump() {
    if (rushing()) { if (!pumpT) pumpT = setTimeout(() => { pumpT = 0; pump(); }, 120); return; }
    while (inFlight < MAX_BOOTING && loadQ.length) {
      const p = loadQ.shift();
      inFlight++;
      let freed = false;
      p.free = () => { if (freed) return; freed = true; p.free = null; inFlight--; pump(); };
      const f = p.el.querySelector('iframe');
      f.addEventListener('load', () => {
        unpaper(p);                              // before anything is painted
        tellPause(p);                            // the loader reaches 400px out, the pause only 200 — say so now
        wireInside(p);
        if (!p.el.classList.contains('booted')) p.late = setTimeout(() => stall(p), BOOT_MS);
        setTimeout(p.free || (() => {}), 1600);  // arrived but won't say booted — let the queue move
      }, { once: true });
      setTimeout(() => { if (p.free) p.free(); }, 8000);   // never even arrived
      f.src = p.src;
      try { byWin.set(f.contentWindow, p); } catch (e) {}
    }
  }

  function load(p) {
    if (p.loading) return;
    p.loading = true;
    loadQ.push(p);
    pump();
  }

  window.addEventListener('message', e => {
    if (!e.data || e.data.type !== '__dc_booted') return;
    let p = byWin.get(e.source);
    if (!p) p = panels.find(q => {
      if (q.art) return false;
      try { return q.el.querySelector('iframe').contentWindow === e.source; } catch (err) { return false; }
    });
    if (p) up(p);
  });

  // 400px of margin so a panel is already loading by the time it slides in
  const io = window.IntersectionObserver
    ? new IntersectionObserver(rows => rows.forEach(r => {
        if (!r.isIntersecting) return;
        const p = byEl.get(r.target);
        io.unobserve(r.target);
        if (!p) return;
        p.wanted = true;                          // within reach; boots when big enough (THE POSTERS)
        if (big(p)) load(p);
      }), { root: bench, rootMargin: '400px' })
    : null;

  /* ── AND PUT DOWN AGAIN WHEN NOBODY IS LOOKING ──────────────────────────
     The observer above is one-way on purpose: a feature, once woken, stays
     awake. But awake is not the same as MOVING. A hundred and fifty frames
     of swaying trees kept animating off the edge of the screen, each one
     billed to the same main thread, for nobody — so this second observer
     watches the same panels both ways and tells each document whether it can
     currently be seen, through the same door tellDrag uses: one attribute on
     the frame's own <html>, which bare.css turns into animation-play-state:
     paused for everything under it. Held, not removed — a tree that comes
     back mid-sway resumes mid-sway, so there is nothing to snap.

     Its margin is 200px, deliberately under the loader's 400: a panel
     sliding in is unpaused before it is on screen, and the beat between a
     frame finishing its load and this observer's first word about it is
     covered by tellPause() in load()'s own listener. */
  /* Paused now means three things at once — bare.css holds the CSS
     animations, prelude.js holds the TIMERS and rAF loops behind the same
     attribute, and the two can never disagree because there is one attribute.
     And a panel earns it two ways: being off the screen, or being TINY on it.
     Zoomed out to where a panel is a postage stamp, its sways are moving the
     pointer's width of pixels — motion nobody can see, billed to the one
     main thread every frame shares, times a hundred and fifty-nine. Below
     TINY_PX of drawn width the document is held still exactly like one that
     has slid off the edge; zoom back in past the line and it all resumes.
     The one exception is the LIVE panel: a feature somebody has clicked into
     is being USED, and a used thing never freezes under the hand. */
  const TINY_PX = 110;

  /* ONLY A BOOTED DOCUMENT IS EVER PAUSED. The freeze reaches the timers now
     (prelude.js), and support.js's own boot leans on a timer or two — so a
     frame paused BEFORE its runtime finished would stall mid-boot and wear
     the 'no runtime' chip for a network that was fine. Pre-boot there is
     nothing moving worth freezing anyway. up() re-tells the state the moment
     the runtime reports in. */
  function tellPause(p) {
    const doc = docOf(p);
    if (!doc || !doc.documentElement) return;
    const booted = p.el.classList.contains('booted'), used = live === p;
    doc.documentElement.toggleAttribute('data-lab-paused', !!(p.offscreen || p.tiny) && !used && booted);
    doc.documentElement.toggleAttribute('data-lab-crowd', crowd && !used && booted);   // see THE CROWD, below
  }

  /* ── PUTTING THINGS TO SLEEP IS A CHORE, NOT AN EMERGENCY ───────────────
     One good pan sweeps a hundred panels over the pause line in a single
     observer batch, and pausing each one re-styles the whole document under
     it (bare.css's rule is `html[data-lab-paused] *`). Done in one task that
     is a hundred-millisecond hitch — the very thing the pause exists to
     prevent. So the two directions are treated by their urgency: a panel
     coming ON screen wakes at once, because somebody is about to look at it;
     a panel going OFF is frozen a few at a time, six milliseconds a slice,
     because nobody can see whether it froze this frame or three later.
     Every chore re-reads the panel's current flags when it runs, so a panel
     that came back before its turn simply gets told what is already true. */
  const chores = [];
  let choreT = 0;
  function chore(fn) {
    chores.push(fn);
    if (!choreT) choreT = setTimeout(runChores, 30);
  }
  function runChores() {
    if (rushing()) { choreT = setTimeout(runChores, 60); return; }   // not mid-pan — see pump
    const t0 = performance.now();
    while (chores.length && performance.now() - t0 < 6) chores.shift()();
    choreT = chores.length ? setTimeout(runChores, 30) : 0;
  }

  const pauseIO = window.IntersectionObserver
    ? new IntersectionObserver(rows => rows.forEach(r => {
        const p = byEl.get(r.target);
        if (!p) return;
        p.offscreen = !r.isIntersecting;
        // waking is urgent — unless the camera is flying, when it waits with
        // the rest (see pump) and the panel arrives frozen for a beat
        if (r.isIntersecting && !rushing()) tellPause(p); else chore(() => tellPause(p));
      }), { root: bench, rootMargin: '200px' })
    : null;

  let tinyT = 0;
  function retiny() {
    const z = (window.Lab && Lab.zoom) || 1;
    panels.forEach(p => {
      if (p.art) return;                         // nothing to pause in art drawn here
      if (p.wanted && !p.loading && big(p)) load(p);   // grown past the line: its document now
      repost(p);                                       // …or shrunk under it: its picture again
      const w = parseFloat(p.el.style.width) || 0;
      const t = w > 0 && w * z < TINY_PX;
      if (t !== p.tiny) {
        p.tiny = t;
        if (t) chore(() => tellPause(p)); else tellPause(p);
      }
    });
  }
  document.addEventListener('lab:zoom', () => { clearTimeout(tinyT); tinyT = setTimeout(retiny, 160); });

  /* ── THE CROWD: WHEN THE BENCH IS FULL, THE MAIN THREAD DOES NOT ANIMATE ─
     Every frame in which anything on the main thread moves a transform or
     an opacity — a gnome's arm, a falling leaf, the dots in a thought
     bubble, a line being typed into a speech bubble — Chrome works out the
     page's layers again, for every document that is not cold, at about
     half a millisecond each. (The whole story is over the camera in lab.js:
     THE CAMERA IS AN ANIMATION.) The sways, bobs and gears are exempt: each
     of those animates an element with a layer of its own, and the
     compositor moves it without asking the main thread. What is NOT exempt
     is anything inside an <svg>, whose children never get layers, and
     anything a feature's own script moves on a timer.

     Twenty-nine warm documents at 100% made that 12ms a frame, which passes
     for smooth. A hundred and sixty at 25% made it 80ms, and ONE floating
     bubble over ONE thinker held the whole bench at eleven frames a second.
     So past CROWD warm documents the bench says so to every document, and
     under data-lab-crowd bare.css holds every animation on an SVG child and
     prelude.js holds the timers — the same freeze the tiny and the
     offscreen get, minus the compositor's share. Trees sway, gears turn,
     lights blink; limbs, leaves, sims and typing wait for the crowd to
     thin, which is the next zoom in. The live panel is exempt, as ever: a
     thing you have clicked into is being used.

     It is a count of WARM documents and not of what is on screen because
     the cost is the count of warm documents — a wide screen at 100% is a
     crowd too, and stutters the same way. */
  /* Over CROWD it is a crowd, and it is not a crowd again until THIN: a zoom
     that hovers on the line must not flip every document's clocks on every
     step, and the flip itself is a hundred and fifty-nine documents told. */
  const CROWD = 36, THIN = 24;
  let crowd = false, crowdT = 0;

  function recrowd() {
    crowdT = 0;
    let warm = 0;
    panels.forEach(p => { if (p.cold === false && p.src && !p.art && p.loading) warm++; });   // a document, not a kit part or a poster
    const c = crowd ? warm > THIN : warm > CROWD;
    if (c === crowd) return;
    crowd = c;
    // thinning is told to what is on screen at once — you have just zoomed
    // in to look at it — and to the rest as a chore; thickening is all chore
    panels.forEach(p => {
      if (!c && !p.offscreen && !p.tiny) tellPause(p); else chore(() => tellPause(p));
    });
  }
  function recrowdSoon() { if (!crowdT) crowdT = setTimeout(recrowd, 400); }

  /* ── AND, FURTHER OUT STILL, NOT EVEN DRAWN ─────────────────────────────
     .gz-cold is content-visibility:hidden (lab.css): past 900px the engine
     skips the panel's whole subtree — no layout, no paint, no raster tiles
     when the sheet re-rasters, and the browser stops running rAF inside a
     frame it is not rendering. The document keeps its state and its place;
     it is simply not drawn until it comes back within a screen of the edge.
     900 sits well outside the loader's 400 and the pause's 200, so a panel
     warms, then loads, then wakes, in that order, on the way in — and going
     cold — or warm — is gathered up and done in batches, for the reason
     under THE COLD LINE IS CROSSED IN BATCHES below.

     A panel that boots while cold cannot be MEASURED — a skipped subtree
     answers getBoundingClientRect with nothing — so its fit is put off
     (see fitSoon) and taken up here the moment it warms. */
  const coldIO = window.IntersectionObserver
    ? new IntersectionObserver(rows => rows.forEach(r => {
        const p = byEl.get(r.target);
        if (!p) return;
        p.cold = !r.isIntersecting;
        recrowdSoon();
        cool(p);
      }), { root: bench, rootMargin: '900px' })
    : null;

  /* ── THE COLD LINE IS CROSSED IN BATCHES, NOT PER FRAME ─────────────────
     Going cold or warm is a class on the section and a content-visibility
     change under it, and what that costs is not the style recalc — it is
     that the page's layers are worked out again in whatever frame it lands
     in (lab.js: THE CAMERA IS AN ANIMATION), once per frame, however many
     panels changed in that frame, at half a millisecond per warm document.
     A pan at 45% sweeps a panel or two over the 900px line on most frames,
     and each of those frames paid that in full — forty milliseconds, for
     one panel nobody could see yet. Spread six at a time over chores, a
     zoom that sent eighty over the line paid it a dozen frames running.

     So both directions are gathered up for a fifth of a second and applied
     in one task: one re-layerisation per batch, five a second at the very
     most. The beat is fixed from the FIRST change and not pushed back by
     the ones that follow, or a long pan would never flush at all. A panel
     warms 200ms after it comes within 900px of the screen, which at any
     pan speed under four and a half thousand pixels a second is still
     before it arrives. jumpTo's warm() stays immediate — it is one panel,
     and the camera is already on its way. */
  const tiering = new Set();
  let tierT = 0;
  function cool(p) { tiering.add(p); if (!tierT) tierT = setTimeout(retier, 200); }
  // the camera has settled: everything that waited on it goes now
  document.addEventListener('lab:still', () => {
    if (tierT) { clearTimeout(tierT); retier(); }
    if (chores.length && !choreT) choreT = setTimeout(runChores, 0);
    if (pumpT) { clearTimeout(pumpT); pumpT = 0; }
    pump();
  });
  function retier() {
    if (rushing()) { tierT = setTimeout(retier, 90); return; }   // not mid-pan — see pump
    tierT = 0;
    tiering.forEach(p => {
      if (!p.cold) {
        p.el.classList.remove('gz-cold');
        if (p.needFit) { p.needFit = false; fitSoon(p); }
        return;
      }
      // never freeze a frame mid-boot: a skipped subtree has no viewport,
      // and a feature that measures itself as it mounts would draw for a
      // window of nothing. Booted, or never started, it can go cold.
      if (p.loading && p.src && !p.el.classList.contains('booted')) return;
      p.el.classList.add('gz-cold');
    });
    tiering.clear();
  }

  /* ── SETTING ONE UP ──────────────────────────────────────────────────────
     Called for every [data-gizmo][data-src] in the markup as this file boots,
     and again — one at a time — for a feature COPIED onto the paper while it
     is running: lab.js builds the section, hands it here, and it gets the
     same shield, the same corner, the same lazy load and the same fit as one
     that was written down. That is the whole reason this is a named function
     rather than the body of a forEach, and it is the only thing outside this
     file's own boot that ever calls it. */
  function adopt(el) {
    const p = {
      el,
      id: el.dataset.gizmo,
      src: el.dataset.src,
      dim: el.querySelector('.gz-dim'),
      /* A panel with no data-src is drawn in this page and scales its own
         .gz-art rather than a frame. Everything below is the same for both:
         it is one flag and three guards, not a second kind of panel. */
      /* A KIT PART — a tree, a gnome, a village piece — is an art panel
         too, drawn in this page by kits.js rather than in a frame, and it
         keeps its data-src only as its NAME (keep.js, serve.js and the
         clipboard read it). One flag more, and every guard below that
         looks for a document finds none. */
      kit: el.dataset.kit || '',
      art: (el.dataset.kit || !el.dataset.src) ? el.querySelector('.gz-art') : null,
      loading: false,
      late: 0
    };
    if (!(p.art || el.querySelector('iframe'))) return;
    panels.push(p);
    byEl.set(el, p);
    dragWatch.observe(el, { attributes: true, attributeFilter: ['class'] });
    // a kit part's natural size is the box its frame used to measure at
    // rest, and kits.js has it written down — so the cut below is right
    // first time and inkOf() answers with the drawing, not the viewport
    if (p.kit && window.Kits && Kits.natural) {
      const n = Kits.natural(p.kit, el.dataset.part);
      if (n && n.w > 0 && n.h > 0) { p.natW = n.w; p.natH = n.h; }
    }

    /* Nothing has been measured yet — the feature has not so much as loaded
       — so the box starts at the size it was drawn at and the fit puts it
       right the moment there is a drawing to measure. A saved size stands
       instead, and p.sized is what says so: it is the difference between a
       frame that follows its drawing and one that has been told a size.

       data-cut IS THAT SIZE, WRITTEN DOWN. localStorage is a size somebody
       cut on this machine; data-cut is one that got kept — keep.js posts it
       to serve.js and index.html carries it from then on, exactly the way
       data-home-x carries a position. So it is the same fact from a wider
       place, and it reads AFTER the local one for the same reason home does:
       what you did here beats what the file says until you send it home. A
       frame with neither goes on following its drawing, which is where every
       default size on this bench comes from. */
    const s = savedSize(p.id) || cutAttr(el);
    p.sized = !!s;
    const n0 = natural(p);
    cut(p, s ? s.w : n0.w, s ? s.h : n0.h, false);

    /* ONE GESTURE, TWO MEANINGS. lab.js is already dragging this feature by
       the shield — the press bubbles up to the element, which with no
       [data-handle] inside it is its own handle — so what is left here is to
       tell 'move this' from 'use this'. A press that ends within a few pixels
       of where it began is a click and wakes the feature; one that travels
       further was a drag, and the click the browser fires after it is dropped.

       SLOP is screen pixels on purpose. At 20% zoom a 5px wobble is 25 world
       units, and the question being asked is about the hand, not the bench. */
    const SLOP = 5;
    let px = 0, py = 0, down = false, moved = false;

    el.addEventListener('pointerdown', e => {
      if (e.target.closest('.gz-size')) return;    // the corner has its own gesture
      down = true; moved = false; px = e.clientX; py = e.clientY;
      if (window.Vol) Vol.wake();                  // the first gesture — build the audio
    });
    el.addEventListener('pointermove', e => {
      if (!down || moved) return;
      if (Math.abs(e.clientX - px) + Math.abs(e.clientY - py) <= SLOP) return;
      moved = true;
      sound('lift');                               // it has actually left the paper
    });
    el.addEventListener('pointerup', () => { if (down && moved) sound('drop'); down = false; });
    el.addEventListener('pointercancel', () => { down = false; });

    /* …and the click is listened for HERE, on the feature, not on the shield
       lying over it. lab.js captures the pointer on the element the moment a
       drag begins, and a captured pointer retargets the compatibility mouse
       events with it — so the click that ends a press on the shield is
       delivered to the element and never touches the shield at all. */
    el.addEventListener('click', e => {
      if (e.target.closest('.gz-size')) return;    // that was the corner
      if (p.art) return;                           // nothing asleep to wake
      if (drawing()) return;                       // a tool is up: you are drawing
      if (moved) return;                           // that was a drag, not a press
      // shift is lab.js's: a modified press puts this feature into the pick
      // or takes it out, and a feature you are choosing is not one you are
      // asking to wake up. Its own handler has the other half of this.
      if (e.shiftKey) return;
      e.stopPropagation();
      // a poster and no document yet: this press boots it, and wakes it
      // the moment it lands (see THE POSTERS)
      if (p.wanted && !p.loading) { p.wakeOnBoot = true; load(p); return; }
      activate(p);
    });

    // the pointer leaving puts the shield back, after a breath so a wobble on
    // the edge of a feature does not keep dropping you out of it
    el.addEventListener('pointerenter', holdOn);
    el.addEventListener('pointerleave', () => { if (live === p) rearm(); });

    // the corner
    const grip = el.querySelector('.gz-size');
    if (grip) {
      let w0 = 0, h0 = 0, x0 = 0, y0 = 0, on = false;
      grip.addEventListener('pointerdown', e => {
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        on = true;
        w0 = p.el.offsetWidth; h0 = p.el.offsetHeight;
        x0 = e.clientX; y0 = e.clientY;
        el.classList.add('sizing');
        try { grip.setPointerCapture(e.pointerId); } catch (err) {}
        e.preventDefault(); e.stopPropagation();
      });
      grip.addEventListener('pointermove', e => {
        if (!on) return;
        const z = Lab.zoom || 1;                   // the pointer moves in screen px, the frame in world px
        cut(p, w0 + (e.clientX - x0) / z, h0 + (e.clientY - y0) / z, false);
      });
      const done = e => {
        if (!on) return;
        on = false;
        el.classList.remove('sizing');
        try { grip.releasePointerCapture(e.pointerId); } catch (err) {}
        cut(p, p.el.offsetWidth, p.el.offsetHeight, true);
        sound('drop');
      };
      grip.addEventListener('pointerup', done);
      grip.addEventListener('pointercancel', done);
      // double-click the corner: back to the size of the drawing, and back
      // to following it — the saved size goes rather than being overwritten,
      // which is the whole of the difference
      grip.addEventListener('dblclick', e => {
        e.stopPropagation();
        try { localStorage.removeItem(KEY + p.id); } catch (err) {}
        p.sized = false;
        const n = natural(p); cut(p, n.w, n.h, false);
      });
    }

    // art in this page is already here: no shield, no lazy load, no measure —
    // its size is the size it was drawn at and place() has the rest
    if (!p.art) {
      if (io) io.observe(el); else load(p);
      if (pauseIO) pauseIO.observe(el);          // the sign has no document to pause
    }
    if (coldIO && !p.kit) coldIO.observe(el);    // …but even the sign can go cold
    // a kit part's subtree is empty unless kits.js has lifted it, so the cold
    // line buys nothing; kits.js does its own culling and takes it from here
    if (p.kit && window.Kits && Kits.adopt) Kits.adopt(el, p);
    return p;
  }

  // every panel on the bench: the eighty-four with a document under them, and
  // the sign, which is drawn in this one. adopt() tells them apart.
  document.querySelectorAll('#bench .gz[data-gizmo]').forEach(adopt);
  retiny();   // the opening zoom may already be below the line

  /* ── AND TAKING ONE BACK ────────────────────────────────────────────────
     The other half of adopt, and it exists for exactly one caller: undoing a
     paste. It forgets the panel, stops the loader watching for it, lets go if
     the thing being taken away is the live one, and takes its saved size with
     it — a size is keyed by the feature's name and a name that has gone would
     leave a number behind for a later copy to inherit by accident.

     The drag watcher is a MutationObserver and has no unobserve; taking the
     element out of the document is enough, since a node nobody holds is a
     node nothing can mutate. lab.js does the removing — this only lets go. */
  function drop(el) {
    const i = panels.findIndex(p => p.el === el);
    if (i < 0) return false;
    const p = panels[i];
    if (live === p) release();
    panels.splice(i, 1);
    byEl.delete(el);
    for (const [w, q] of byWin) if (q === p) byWin.delete(w);
    if (p.kit && window.Kits && Kits.drop) Kits.drop(el);
    recrowdSoon();
    if (io) io.unobserve(el);
    if (pauseIO) pauseIO.unobserve(el);
    if (coldIO) coldIO.unobserve(el);
    try { localStorage.removeItem(KEY + p.id); } catch (e) {}
    return true;
  }

  // a saved size may have changed how tall the bench is since lab.js measured
  // it a moment ago — tell it, rather than leaving the camera reined in to a
  // sheet the wrong shape
  Lab.growBench();

  // ── everything that puts every shield back up ───────────────────────────
  document.addEventListener('keydown', e => { if (e.key === 'Escape') release(); });
  // a click anywhere that is not the live panel
  document.addEventListener('pointerdown', e => {
    if (live && !e.target.closest('.gz.live')) release();
  }, true);
  // the hand, and the camera on the move
  bench.addEventListener('wheel', () => { if (live) release(); }, { passive: true });
  // picking up a drawing tool
  const toolDock = document.getElementById('tool-dock');
  if (toolDock) toolDock.addEventListener('click', () => {
    if (window.Vol) Vol.wake();
    sound('click');
    setTimeout(() => { if (drawing()) release(); }, 0);
  });

  /* 'reset layout' puts every frame back to the size of its own drawing, the
     same way it puts the panels back where they were drawn — or back to
     data-cut, where the file has one, because that IS the drawn size for a
     frame somebody kept a cut of. Reset goes to the default look and not to
     first principles; data-home-x gets the same reading in lab.js. */
  const reset = document.getElementById('lab-reset');
  if (reset) reset.addEventListener('click', () => {
    panels.forEach(p => {
      try { localStorage.removeItem(KEY + p.id); } catch (e) {}
      const c = cutAttr(p.el);
      p.sized = !!c;
      const n = c || natural(p); cut(p, n.w, n.h, false);
    });
  });

  /* jumpTo flies the camera a world's width in three hundred milliseconds —
     faster than the cold observer can notice the destination coming — so the
     one panel being flown TO is warmed by hand before the glide, and arrives
     already drawn instead of popping in a beat late. */
  function warm(el) {
    const p = byEl.get(el);
    if (!p) return;
    p.cold = false;
    recrowdSoon();
    p.el.classList.remove('gz-cold');
    if (p.wanted && !p.loading) load(p);         // flown to on purpose: its document, whatever its size
    if (p.needFit) { p.needFit = false; fitSoon(p); }
  }

  return { panels, release, cut, adopt, drop, warm, panelOf: el => byEl.get(el),
           get live() { return live && live.id; }, get crowd() { return crowd; } };
})();
