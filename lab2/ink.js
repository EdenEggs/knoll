/* ── INK: HOLD CTRL AND THE HITBOX BECOMES THE DRAWING ─────────────────────
   Every feature on this bench is a rectangle, and most of the drawings in
   those rectangles are not. A tree is a triangle with a lot of paper round
   it, and the village and the forest are kits of them standing in a crowd —
   so the box you have to click to get one tree overlaps four others, and the
   one you get is whichever box is on top rather than whichever tree you were
   pointing at. There is no arrangement of them that fixes it: the boxes are
   square and the wood is not.

   HOLD CTRL (or ⌘) AND THE BOXES STOP BEING CLICKABLE. What answers the
   pointer instead is what is PAINTED under it — the actual fill and stroke
   of the actual tree — so a click in the gap between two branches goes past
   both of them to whatever is behind. Let go and every box is a box again.

   NOTHING DOWNSTREAM KNOWS ABOUT THIS, and that is the whole design. This
   file does not re-target a press, synthesise a drag, or reach into lab.js's
   pointerdown: it puts `pointer-events:none` on every feature the pointer is
   NOT painted on, and lets the browser's own hit-testing deliver the press
   where it was always going to. So the drag, the pick, shift-click, the
   click-to-wake, the corner, the undo stack — every one of them is the same
   code doing the same thing to a different element. Ctrl changes what is
   under the pointer, not what happens to it.

   Which means the two gestures compose for free: ctrl+drag carries the one
   tree you pointed at, and shift+ctrl+click puts that tree in the pick and
   nothing else.

   ── HOW A DRAWING IS ASKED WHETHER IT IS THERE ─────────────────────────────
   A feature is a same-origin iframe, so the frame can be asked directly:
   map the pointer into its own viewport and call elementFromPoint INSIDE it.
   That is the browser's real hit-testing, which for SVG means the painted
   region of the path — fill, stroke, the lot — and not its bounding box. No
   geometry is done here and none should be; a re-implementation of SVG
   hit-testing would be wrong in a different way every release.

   THE ANSWER IS NEVER null OVER EMPTY PAPER. Every feature is a full-screen
   document with the drawing centred in it, so a point in the margin still
   lands on something — the screen root, or the body, or the <svg> box round
   the tree. Those three are what `paper()` names, and the <svg> one is the
   load-bearing case: a hit on the outermost <svg> means INSIDE THE DRAWING'S
   BOX BUT NOT ON ANYTHING DRAWN, which is exactly the miss this file exists
   to notice. `ownerSVGElement` is null on that element and non-null on every
   shape inside it, which is the whole test.

   AND THE HTML FEATURES COME OUT RIGHT FOR FREE. The machines are not
   drawings but layouts — cards, panels, opaque things with edges — so their
   own DOM is their ink, and the same question gets the same useful answer:
   the empty margin around the Spawn-O-Matic is the screen root and misses,
   and the machine itself is a div and hits.

   ── WHAT IT WILL NOT DO ────────────────────────────────────────────────────
   IT WILL NOT GUESS. A frame that has not loaded yet, or one opened off the
   disk where contentDocument is null, cannot be asked — so it is treated as
   a hit on its box, the way it behaves with no ctrl at all. Ctrl makes
   picking finer where it can and never makes anything unreachable.

   IT IS NOT A CROP. Nothing about the feature changes: it is not re-drawn,
   re-measured or re-cut, and the box is still the box the corner cuts. This
   is about which element the pointer belongs to, and lasts exactly as long
   as the key is down. */

window.Ink = (function () {
  if (!window.Lab) return null;
  const bench = Lab.bench;
  if (!bench) return null;

  const SVG = 'http://www.w3.org/2000/svg';
  let armed = false, mark = null, lx = 0, ly = 0, seen = false;
  /* Ctrl is also the zoom modifier, and a highlight blinking on under the
     cursor every time somebody ctrl+scrolls is noise on a gesture nobody is
     picking anything with. So a wheel puts this to sleep, and it wakes on the
     next thing the pointer actually does. */
  let hush = 0;

  // ── the paper a drawing is drawn on, as against the drawing ──────────────
  function paper(t, doc) {
    if (!t) return true;
    if (t === doc.documentElement || t === doc.body) return true;
    if (t.hasAttribute && t.hasAttribute('data-screen-label')) return true;
    // the outermost <svg>: in the drawing's box, on none of its shapes
    if (t.namespaceURI === SVG && !t.ownerSVGElement) return true;
    return false;
  }

  /* true · the pointer is on the drawing
     false · it is on that feature's paper
     null · unanswerable — no document to ask (not loaded, or cross-origin) */
  function inkOn(el, cx, cy) {
    /* A KIT PART — a tree, a gnome, a village piece — is drawn by kits.js,
       as a sprite on a tile or as live svg in its .gz-art, and kits.js
       answers from the drawing's own alpha. Asked FIRST, before the two
       branches below, because elementsFromPoint in this document cannot
       see through the pointer-events:none apply() puts on every other
       section. With no kits.js the answer is null: a box hit, never a
       thing made unreachable. */
    if (el.dataset.kit) {
      const K = window.Kits;
      return (K && K.inkAt) ? K.inkAt(el, cx, cy) : null;
    }
    const f = el.querySelector('iframe');
    if (f) {
      let doc = null;
      try { doc = f.contentDocument; } catch (e) {}
      if (!doc || !doc.body) return null;
      const r = f.getBoundingClientRect();
      if (!r.width || !r.height || !f.offsetWidth) return null;
      /* getBoundingClientRect is the rect AFTER every transform on the way up
         — frames.js's fit, and the camera's zoom on top of it — so one
         division undoes the lot. It is a translate and a uniform scale and
         nothing else, which is why this is a division and not a matrix. */
      const k = r.width / f.offsetWidth;
      return !paper(doc.elementFromPoint((cx - r.left) / k, (cy - r.top) / k), doc);
    }

    /* THE SIGN has no frame — it is live DOM in this page — so the question
       is asked of this document instead. elementsFromPoint and not
       elementFromPoint: the sign is under its own shield and whatever else
       is stacked over it, and only the plural one reports what is below the
       top of the pile. */
    const art = el.querySelector('.gz-art');
    if (!art) return null;
    const stack = document.elementsFromPoint(cx, cy);
    for (const n of stack) if (art.contains(n) && n !== art && !paper(n, document)) return true;
    return false;
  }

  /* Topmost first, and topmost means what the eye means: lab.js lifts a
     feature by writing a z-index on it, so that is the first sort, and file
     order breaks the ties exactly as it does on screen. */
  function order() {
    return Lab.gizmos.map((g, i) => {
      const z = parseInt(g.el.style.zIndex, 10);
      return { el: g.el, z: isFinite(z) ? z : 0, i: i };
    }).sort((a, b) => (b.z - a.z) || (b.i - a.i));
  }

  function at(cx, cy) {
    for (const g of order()) {
      const r = g.el.getBoundingClientRect();
      if (cx < r.left || cx > r.right || cy < r.top || cy > r.bottom) continue;
      const v = inkOn(g.el, cx, cy);
      if (v !== false) return g.el;      // true, or unanswerable: it is the box's
    }
    return null;
  }

  /* ── THE OUTLINE IS A COPY ────────────────────────────────────────────────
     Knowing which tree is only half of it; you have to be able to SEE which
     tree, and in a wood a rectangle round one of them is no answer at all —
     four stacked tree boxes are four rectangles with the same corners. So the
     drawing itself is outlined, along the actual silhouette.

     THE FIRST GO WAS A drop-shadow ON THE IFRAME, from out here, and it was
     wrong in two ways at once. It was BLURRED, which is a halo and not a
     line; and it traced the frame's finished pixels, which include the
     drawing's own shadow — every one of these is drawn with a hard
     `drop-shadow(rgba(0,0,0,.3) 6px 7px 0)` — so the outline came out fat
     and offset down and right, hugging the tree's shadow rather than the
     tree. From outside the frame that is not fixable: by then the shadow IS
     the picture.

     So it is done inside, with the oldest trick there is. A copy of the
     drawing goes BEHIND the drawing, painted flat, with its filters stripped
     — no shadow, just the shape — and then spread outwards by four hard
     drop-shadows at zero blur, one per side. The copy is bigger than the
     original by exactly that spread and hidden behind it everywhere else, so
     what you see is a crisp rim of it standing out past the edges: the
     silhouette, and only the silhouette. Overlapping leaves and the trunk
     make one shape rather than a bundle of outlined circles, which is what a
     union would have cost a path library to do.

     `all:revert` on the copy's descendants is what takes the shadow off, and
     it takes off every other filter, animation and transform with it — a
     copy that swayed out from under the tree it is outlining would be worse
     than no outline. The two colours are then painted over the top of it.

     IT MUST NEVER BE MEASURED. frames.js sizes each frame from the extent of
     what is in it, and this is a copy of that extent with two pixels added
     on every side — so a fit that ran while it was up would grow the frame,
     and go on growing it. `data-lab-ink` is the flag it skips; see THE CTRL
     OUTLINE IS NOT INK, in its extent(). That one line is the whole of the
     contract between the two files.

     AND IT ONLY GOES UP FOR A DRAWING. The machines are React layouts with
     canvases and images in them, and a flat copy of one is a pink rectangle
     that says nothing. So the copy is made when the screen holds svg and
     nothing else; everything else keeps the plain outline round its box,
     which for one machine on its own is all the answer anybody needs. */
  const RIM = 2.5;
  const CSS =
    /* THE COPY IS THE SCREEN ROOT AGAIN, which is why it lands exactly over
       the drawing without a single coordinate being worked out here: these
       screens centre their drawing in a flex box, so a copy of the box
       centres it the same way. Reproducing that from measurements — read the
       rect, place the clone, undo the frame's own translate — is three
       chances to be a pixel out, and the outline is a thing you notice being
       a pixel out.

       It gives up its data-screen-label on the way in: frames.js aims the
       fit's translate at that attribute, so a second one wearing it would be
       shifted twice. bare.css's transparent-paper rule is aimed at it too,
       which is what the background here is standing in for. */
    '[data-lab-ink]{position:absolute!important;left:0!important;top:0!important;'
    + 'margin:0!important;min-height:0!important;transform:none!important;'
    + 'background:transparent!important;z-index:-1;pointer-events:none;'
    /* four hard shadows, no blur: each one sees what the one before it drew,
       so together they spread the flat copy RIM outwards on every side. A
       blur here would be a halo, and the whole complaint about the first go
       was that a halo is not a line. */
    + 'filter:' + [[RIM, 0], [-RIM, 0], [0, RIM], [0, -RIM]]
        .map(o => 'drop-shadow(' + o[0] + 'px ' + o[1] + 'px 0 var(--lab-ink))').join(' ')
    + '}'
    /* Flat, and with the drawing's own drop shadow off — that shadow is the
       reason this is done in here at all. NOT `all:revert`, which was the
       first idea and takes the positioning transforms off with it: half of
       these parts are placed by a transform on a <g>, and both pines are a
       <use> that is nothing but one. Only the paint is overridden. */
    + '[data-lab-ink] svg,[data-lab-ink] svg *{filter:none!important;'
    + 'fill:var(--lab-ink)!important;stroke:var(--lab-ink)!important}';

  const PINK = () => (getComputedStyle(document.documentElement)
    .getPropertyValue('--pink').trim() || '#c93b82');

  let lined = null;                       // the frame currently wearing a copy
  let linedKit = null;                    // …or the kit part, outlined by kits.js

  function unline() {
    if (linedKit) { try { Kits.outline(null); } catch (e) {} linedKit = null; }
    if (!lined) return;
    try {
      const n = lined.querySelector('[data-lab-ink]');
      if (n) n.remove();
    } catch (e) {}
    lined = null;
  }

  /* AND IT IS PHASE-LOCKED TO WHAT IT OUTLINES. Half these drawings move —
     the forest sways 1.2° each way, the well's bucket rises, the sun turns —
     and a copy that started its own sway when it was cloned is a copy in a
     different part of the cycle from the tree it is drawn round. On a canopy
     130 across, 1.2° is very nearly three pixels, which on a rim of two and
     a half is the outline coming off one side. Stopping the copy's animation
     does not help; that just freezes it somewhere the tree is not.

     So every animation on the copy is wound to where the original's has got
     to. They share a document, a duration and a playback rate, so once they
     agree they go on agreeing. */
  function sync(from, to) {
    for (let i = 0; i < Math.min(from.length, to.length); i++) {
      if (!from[i].getAnimations || !to[i].getAnimations) continue;
      const a = from[i].getAnimations(), b = to[i].getAnimations();
      for (let k = 0; k < Math.min(a.length, b.length); k++) {
        try { b[k].currentTime = a[k].currentTime; } catch (e) {}
      }
    }
  }

  function line(el) {
    if (!el) return false;
    // a kit part: kits.js lays the same flat copy behind the same drawing,
    // in this document, and takes it off again through unline()
    if (el.dataset.kit) {
      if (window.Kits && Kits.outline && Kits.outline(el)) { linedKit = el; return true; }
      return false;
    }
    const f = el.querySelector('iframe');
    if (!f) return false;                 // the sign has no frame; see the CSS
    let doc = null;
    try { doc = f.contentDocument; } catch (e) {}
    if (!doc || !doc.body) return false;
    const root = doc.querySelector('[data-screen-label]');
    if (!root) return false;
    /* A DRAWING AND NOT A LAYOUT. The machines are React — canvases, images,
       text — and a flat copy of one is a pink rectangle that says nothing
       the box outline has not said already. The kits are svg and nothing
       else, and they are the ones standing in crowds. */
    const kids = [...root.children];
    if (!kids.length || kids.some(n => n.tagName.toLowerCase() !== 'svg')) return false;

    let st = doc.getElementById('lab-ink-css');
    if (!st) {
      st = doc.createElement('style');
      st.id = 'lab-ink-css';
      (doc.head || doc.documentElement).appendChild(st);
    }
    if (st.textContent !== CSS) st.textContent = CSS;

    // taken BEFORE the copy goes in, or the walk below would find the copy
    // inside the original and start pairing it with itself
    const was = [root, ...root.querySelectorAll('*')];

    const copy = root.cloneNode(true);
    copy.removeAttribute('data-screen-label');
    copy.setAttribute('data-lab-ink', '');
    copy.style.setProperty('--lab-ink', PINK());
    copy.style.width = root.offsetWidth + 'px';
    copy.style.height = root.offsetHeight + 'px';
    root.insertBefore(copy, root.firstChild);
    sync(was, [copy, ...copy.querySelectorAll('*')]);
    lined = doc;
    return true;
  }

  // ── turning it on and off ────────────────────────────────────────────────
  function apply(win) {
    if (win === mark && armed === seen) return;
    mark = win; seen = armed;
    unline();
    Lab.gizmos.forEach(g => {
      g.el.classList.toggle('ink-off', armed && g.el !== win);
      g.el.classList.toggle('ink-hit', armed && g.el === win);
    });
    bench.classList.toggle('picking-ink', armed);
    if (armed && win) line(win);
  }

  function off() { if (armed || mark) { armed = false; apply(null); } }

  /* WHETHER THE KEY IS DOWN IS STATE AND NOT AN ARGUMENT, which it was for
     one revision, and the revision was wrong: the look after a press is
     DEFERRED (see release, below), so a modifier read at pointerup and used
     a tick later describes a key that may have been let go in between —
     which left every box unclickable and one tree outlined after a ctrl-drag
     that had ended. So it is read here, from whatever last said anything
     about it, and the deferred look asks at the moment it runs. */
  let down = false;
  const note = e => { down = !!(e.ctrlKey || e.metaKey); };

  function look(cx, cy) {
    lx = cx; ly = cy;
    armed = down && !hush;
    apply(armed ? at(cx, cy) : null);
  }

  /* ── AND IT STOPS ASKING THE MOMENT SOMETHING IS PRESSED ──────────────────
     A drag carries the feature UNDER THE CURSOR, so a hit test run on every
     move of it is a hit test whose answer keeps changing — the tree slides
     along beneath the pointer, comes off its own ink, and pointer-events
     starts moving between elements in the middle of a gesture that has
     already picked one. lab.js holds the drag with setPointerCapture and
     would probably survive it; the fix costs one flag and does not depend on
     probably.

     So the question is asked once, at the press, and the answer stands until
     the pointer comes back up. Letting go of ctrl mid-drag does not undo
     what the press already decided, either — which is also just what a hand
     expects. */
  let held = false;

  /* EVERY POINTER EVENT RE-STATES THE MODIFIER, because a pointer event
     carries it and a key listener can miss it: a keyup that lands while a
     frame has the focus, or while the window is behind another one, never
     arrives here at all. The key listeners are for the case where the
     pointer is not moving — press ctrl over a wood and it lights up without
     nudging the mouse. Between them, nothing gets stuck on. */
  window.addEventListener('pointermove', e => {
    if (e.pointerType === 'touch') return;      // no modifier on a finger
    note(e);
    if (held) { lx = e.clientX; ly = e.clientY; return; }
    hush = 0;
    look(e.clientX, e.clientY);
  }, true);

  window.addEventListener('pointerdown', e => {
    if (e.pointerType === 'touch') return;
    note(e);
    if (armed) held = true;
  }, true);

  /* After the gesture and not during it: this runs on the capture phase, so
     without the hop it would put every box back in the way of a pointerup
     lab.js has not seen yet. */
  const release = e => {
    if (!held && !armed) return;
    note(e);
    held = false;
    const x = e.clientX, y = e.clientY;
    setTimeout(() => look(x, y), 0);
  };
  window.addEventListener('pointerup', release, true);
  window.addEventListener('pointercancel', release, true);

  window.addEventListener('keydown', e => {
    if (e.key !== 'Control' && e.key !== 'Meta') return;
    down = true;
    if (!held) look(lx, ly);
  });
  window.addEventListener('keyup', e => {
    if (e.key !== 'Control' && e.key !== 'Meta') return;
    down = false;
    if (!held) off();
  });
  window.addEventListener('blur', () => { down = false; held = false; off(); });
  bench.addEventListener('wheel', () => {
    if (held) return;
    hush = 1; off();
  }, { passive: true, capture: true });

  return { at, get armed() { return armed; }, get hit() { return mark; } };
})();
