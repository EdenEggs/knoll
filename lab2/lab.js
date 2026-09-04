/* ─── knoll / lab 2 — workbench ─────────────────────────────────────────────
   The bench out of lab 1, carrying nothing of its own. Every panel on it is
   one of the design-canvas features in ./features, framed; this file is only
   the paper they sit on and the camera that looks at it.

   Tiny framework for draggable gizmos. A gizmo is any element inside #bench
   with a [data-gizmo] id, dragged by its [data-handle] child or — as
   everything here is — by the whole of itself. Positions persist in
   localStorage per gizmo, and a data-home-x / data-home-y on the element says
   where home is.

   Lab 1 also sends a gizmo home on a double-click of its handle. Nothing on
   this bench HAS a handle: a feature is dragged by the shield lying over it,
   which is the same surface you click to wake it up, and a stray double-click
   there flinging the thing across the bench is not a trade worth making.
   'reset layout' puts everything home instead.

   #bench is a viewport and #bench-world is the sheet inside it — a page on an
   endless canvas, moved by a camera (pan x/y + zoom), the way figma does it:

     · hold the scroll wheel and drag ......... pan, from anywhere
     · hold space (or press H) and drag ....... pan, the hand tool
     · scroll / two-finger swipe .............. pan   (shift — sideways)
     · ctrl / ⌘ + scroll, or pinch ............ zoom about the pointer
     · + / − / 0, shift 1 to fit, shift 0 ..... zoom by keyboard

   …and the bare paper is where you pick things up FROM, not where you pan:

     · drag the bare paper .................... a band; everything it touches
                                                is picked
     · shift and drag ......................... the same, added to what is
                                                already picked
     · shift-click a feature .................. put it in the pick, or take it
                                                out again
     · press a feature ........................ it becomes the pick, on its own
     · drag any picked feature ................ carries the whole pick
     · click the paper, or esc ................ put the pick down
     · ctrl / ⌘ + z ........................... put the last thing back
     · ctrl / ⌘ + c, then + v ................. copy what is picked, and
                                                paste it a nudge down-right
     · right-click a feature .................. raise it, lower it, or take
                                                it off the paper

   Which is figma's rule and not an invention: on a canvas the empty space is
   for selecting in, and the hand is a tool you reach for. Panning did not go
   anywhere — it kept the wheel, the middle button, space and H, which is four
   ways to move a sheet against one way to gather things up off it.

   Positions are kept in WORLD coordinates; Lab.toWorld(clientX, clientY)
   converts a pointer to them, Lab.toScreen does the reverse and Lab.zoom is
   the current scale. Nothing on the page scrolls — the camera moves instead.

   Lab 1 also keeps a shelf to put gizmos away on and a role switch to view
   the bench as somebody else. Neither is here: lab 2 is the paper, the dock
   and the features, and nothing else. */

window.Lab = (function () {
  const bench = document.getElementById('bench');
  const world = document.getElementById('bench-world') || bench;
  const KEY = 'knoll-lab2:pos:';
  const gizmos = [];

  /* the grid the camera slides under everything — its own composited layer,
     made here the way the band is, so index.html stays out of it. See
     #bench-grid in lab.css for why it is a layer and not a background. */
  const gridEl = document.createElement('div');
  gridEl.id = 'bench-grid';
  bench.insertBefore(gridEl, bench.firstChild);

  /* the room: how far the bench can SCROLL, which is now what a pan is —
     see THE CAMERA IS A SCROLL, over applyCam(). An empty box, sized by
     fitRoom() to exactly the range clampCam() allows. */
  const room = document.createElement('div');
  room.id = 'bench-room';
  bench.appendChild(room);

  /* ── GEOMETRY WITHOUT ASKING THE ENGINE ─────────────────────────────────
     Where everything is and how big it is, in numbers this file already
     wrote. offsetWidth and friends are ANSWERS TO A LAYOUT: read one after
     any style has changed and the engine stops to lay the whole sheet out
     before replying — and the old growBench() read one per gizmo per frame
     of every drag, which on a bench of 160 was the drag's lag. But nothing
     here has a size this file didn't set: positions come from place(), sizes
     from the inline width/height every section carries and frames.js re-cuts.
     So both are KEPT, seeded from the styles, and the one ResizeObserver
     below keeps sizes honest against anything that changes them — RO reports
     arrive after layout, off the hot path, which is the whole point. */
  const geo = new WeakMap();
  const geoOf = el => {
    let g = geo.get(el);
    if (!g) {
      g = { x: parseFloat(el.style.left) || 0, y: parseFloat(el.style.top) || 0,
            w: parseFloat(el.style.width) || 0, h: parseFloat(el.style.height) || 0 };
      geo.set(el, g);
    }
    return g;
  };
  const sizeRO = window.ResizeObserver ? new ResizeObserver(rows => {
    rows.forEach(row => {
      const g = geoOf(row.target), b = row.borderBoxSize && row.borderBoxSize[0];
      g.w = b ? b.inlineSize : row.target.offsetWidth;
      g.h = b ? b.blockSize : row.target.offsetHeight;
    });
    forget(); growBench();
  }) : null;

  /* WHAT STANDS ON WHAT. Two numbers per feature, and only one of them is
     kept.

     THE RANK is its place in the pile — 0 at the bottom — and a feature at
     rest is drawn at Z_FLOOR + rank. It starts out as markup order (the last
     section written is on top, which is what index.html's own comments
     argue over) and changes in exactly three ways: right-click → raise or
     lower, which steps it past the next thing it overlaps; a DRAG, which
     puts what you moved on top of the pile, since that is where it was
     while you were moving it and a thing that sinks when you let go of it
     reads as a bug; and undo, which puts the pile back the way it was.
     Ranks are saved — knoll-lab2:z:<gizmo> on this machine, data-home-z in
     the file once keep.js has been round — so the overlap you arranged is
     the overlap everybody gets. See THE PILE, below.

     THE LIFT is the other number, and it is a moment rather than a fact: a
     press puts the feature over the whole pile (Z_FLOOR + n + rank, so a
     crew lifted together keeps its own order) so it can be used and carried
     without diving under its neighbours, and the next press on something
     else puts it back down at its rank. Nothing about the lift is written
     anywhere. A click to wake a gnome is not an opinion about where he
     belongs.

     THE PROPS sit over all of it. A sticky note and a strip of caution tape
     lie on top of the bench by definition, because tape that goes under the
     thing it is cordoning off is not tape — so the band the features stack
     in stops at Z_CEIL, and everything above it is in lab.css: the notes,
     the tape over them, and the band. Two ranks per feature fit under the
     ceiling with room for four thousand more sections — it was a thousand,
     with room for four hundred, until the kits (kits.js) made a section
     cheap enough that a wood of them is a reasonable thing to have. The
     three numbers above it in lab.css moved with it. */
  const Z_FLOOR = 10, Z_CEIL = 9000;
  let menuOn = null;                     // the feature the right-click menu is about — see THE MENU

  /* ── AND WHAT IS PICKED ──────────────────────────────────────────────────
     A set of elements, and a class on each of them. It is deliberately not a
     property of the gizmo record: picking is about the pointer and the last
     gesture, not about the feature, and nothing outside this file has any
     business asking a feature whether it is picked.

     THE PICK IS NOT SAVED. Positions are, sizes are, the camera is — this is
     not: it is the middle of a gesture, and a bench that opens with four
     things already selected is a bench that has remembered the wrong half of
     what you were doing. Reloading puts everything down.

     What it looks like is .gz.picked in lab.css, which is the same dashed
     crop marks a feature wears while it is being carried: being picked and
     being held are the same state a beat apart, so they are drawn the same. */
  const picked = new Set();
  function pick(el, on) {
    if (on) picked.add(el); else picked.delete(el);
    el.classList.toggle('picked', on);
  }
  function clearPick() {
    picked.forEach(el => el.classList.remove('picked'));
    picked.clear();
  }

  /* ── AND WHAT CAN BE TAKEN BACK ──────────────────────────────────────────
     Where a thing WAS. Not a list of positions but a list of CLOSURES: each
     entry is a way to put one gesture back, handed over by whoever owns the
     thing that moved. This file owns the features, tape.js owns the caution
     tape and wall.js owns everything the dock puts on the paper, and none of
     the three knows how to restore the other two — so none of them has to.
     Lab.remember(fn) is the whole of the contract.

     ONE ENTRY PER GESTURE, not per thing: a drag that carried six picked
     features is one press and comes back as one press, so its closure holds
     the whole crew and every position it had before the hand moved. 'reset
     layout' is one entry too — the biggest move on the bench, and the one
     most worth being able to take back.

     THE CLOCK IS SHARED. wall.js has a stack of its own for what has been
     DRAWN — ink, and the pictures in the drum — and 'the last thing you did'
     is a question neither list can answer alone. So every entry on both sides
     is stamped from this counter, and undo is a comparison rather than a
     guess. wall.js's ONE UNDO, THREE STACKS is the other half of it.

     IT IS NOT SAVED, and neither is wall.js's, for the same reason the pick
     is not: it is a memory of the last few minutes of your hands, and a bench
     that opens offering to undo something you did on Tuesday is remembering
     the wrong thing. Sixty is about a session's worth of second thoughts.

     WHAT IT DOES NOT COVER, so nobody goes looking: the camera, a frame
     re-cut by its corner, a note re-wrapped by its grip, and making or
     destroying anything — a strip of tape dropped on its own ✕, or the
     dock's 'clear', which says in its own dialog that it cannot be undone.
     The exceptions are a paste, a delete off the right-click menu (both
     below) and the pile — raise, lower, and the way a drag puts what it
     carried on top — which IS where things are, seen from the side. */
  const moves = [], MOVES = 60;
  let clock = 0;
  const stamp = () => ++clock;
  const undoTop = () => (moves.length ? moves[moves.length - 1].at : 0);

  /* Hand it a way to put the gesture back and it goes on the stack. The
     closure is called once, at most, and never with anything: whatever it
     needs to know it caught when it was made. Call this at the END of a
     gesture and only if something actually changed — a stack full of
     no-op entries is an undo button you press eleven times to see anything
     happen, which is the whole reason the drag below checks. */
  function remember(back) {
    if (typeof back !== 'function') return;
    moves.push({ at: stamp(), back });
    if (moves.length > MOVES) moves.shift();
  }

  /* The features' own way in, and the only one this file uses: a crew,
     where each of them was, and — since a drag also puts its crew on top of
     the pile (see toTop) — the pile as it stood before, so one gesture comes
     back as one entry with all of it in. A feature put back pings rather
     than being flown to — the same outline jumpTo uses, which is enough to
     find it with — and the camera is left exactly where you had it. The
     LIFT is left alone on purpose: it is not a fact about the bench. */
  function moved(crew, was) {
    if (!crew.length) return;
    remember(() => {
      crew.forEach(b => { place(b.el, b.x, b.y, true); ping(b.el); });
      if (was) unpile(was);
    });
  }

  function undoMove() {
    const m = moves.pop();
    if (!m) return false;
    m.back();
    return true;
  }

  /* ONE KEY, BOTH STACKS. wall.js owns the button and the comparison — it is
     the file with the other two stacks in it — so ctrl+z asks IT, and only
     falls back to moves alone on a bench with no dock on it. */
  function undo() {
    if (window.Wall && Wall.undo) return Wall.undo();
    return undoMove();
  }

  /* ── COPY, AND PASTE ─────────────────────────────────────────────────────
     ctrl+c takes what is PICKED, and if nothing is picked, whatever is awake
     — so the plain gesture works: click a feature to wake it, ctrl+c, ctrl+v.
     A band round six of them and one ctrl+c takes all six.

     A COPY IS A REAL FEATURE and not a picture of one. It is a section of its
     own with its own name, so it drags on its own, re-cuts on its own, saves
     where you put it under its own key and wakes up and runs the same
     document — two Prize-O-Trons on the paper are two working machines. What
     it is NOT is a second view of the first: they share a .dc.html the way
     the ten gnomes share one, and nothing that happens inside either is
     visible to the other.

     THE NAME IS THE WHOLE TRICK. Everything the bench remembers is keyed by
     data-gizmo — the position, the re-cut size — so a copy needs a name
     nothing else has, and it gets `<what it came from>-copy-<uid>`. Which
     also means the stem survives a copy of a copy: copying a copy gives you
     another sibling rather than a name growing a word every time.

     AND THEY LAST. A copy made in one session is on the paper in the next,
     because the list of them is saved like everything else and rebuilt below,
     BEFORE anything is registered — so the sweep that registers the sections
     in the markup picks the copies up in the same pass, and frames.js's does
     too when it runs after this file. The alternative is a feature you can
     make but not keep, which is a toy.

     WHAT IT CANNOT COPY is the sign, and the tracing table: neither has a
     data-src, both are live DOM this file just drives (sign.js for one,
     tracer.js for the other), and a second one of either would be a gnome
     who does not lift. The filter is `el.dataset.src` and that is the only
     exclusion. */
  /* The saved list is MADE AT BOOT and not here: store() writes into a list
     of its own that is declared further down this file, so calling it from up
     here is reaching for a const before it exists. It is opened where the
     copies are rebuilt, which is the first moment anything needs it. */
  let copies = null;
  const NUDGE = 48;                    // how far down-right a paste lands
  let clip = null, pasted = 0;

  /* Built by cloning a section already on the paper and stripping it back,
     rather than by writing the five lines of chrome out again here: the shape
     of a feature — iframe, poster, shield, readout, corner — is index.html's
     to say, and saying it twice is how the two come apart. Every data- goes,
     then the ones a copy needs are put back. */
  function makeGz(e) {
    // a tree, a gnome, a village piece: kits.js builds its section (no
    // frame under it), and is never the prototype for anything else's
    if (window.Kits && Kits.isKitSrc && Kits.isKitSrc(e.src)) return Kits.make(e);
    const proto = world.querySelector('.gz[data-src]:not([data-kit])');
    if (!proto) return null;
    const el = proto.cloneNode(true);
    // marked so the delete tool (wall.js) can tell a copy from one of the
    // original eighty-four without asking lab.js every time — CSS reads it
    // too, for the hover highlight
    el.className = 'gz gz-copy';
    el.id = 'gz-' + e.id;
    el.removeAttribute('style');
    Array.prototype.slice.call(el.attributes)
         .forEach(a => { if (a.name.indexOf('data-') === 0) el.removeAttribute(a.name); });
    el.dataset.gizmo = e.id;
    el.dataset.src = e.src;
    el.dataset.w = e.w;
    el.dataset.h = e.h;
    if (e.scale) el.dataset.scale = e.scale;
    el.dataset.homeX = e.x;            // a copy's home is where it was pasted
    el.dataset.homeY = e.y;            // — it has never had another one
    el.style.width = e.w + 'px';
    el.style.height = e.h + 'px';
    el.setAttribute('aria-label', e.label);
    const f = el.querySelector('iframe');
    if (f) { f.removeAttribute('src'); f.removeAttribute('style'); f.setAttribute('title', e.label); }
    const d = el.querySelector('.gz-dim');
    if (d) d.textContent = '';
    return el;
  }

  function copy() {
    const from = picked.size ? [...picked] : [...world.querySelectorAll('.gz.live')];
    /* NOTHING ASKED FOR, SO THE CLIPBOARD STANDS. ctrl+c on an empty bench is
       not an instruction, and copy once / paste four times is the whole point
       of a clipboard — put the pick down between pastes and the copy has to
       survive it. */
    if (!from.length) return false;
    const take = from.filter(el => el.dataset.src);
    /* ASKED FOR, AND NOT COPYABLE: the sign, or the tracing table — the two
       with no data-src. The clipboard goes EMPTY here rather than standing,
       because standing is how a ctrl+v that named THIS thing used to put the
       LAST thing on the paper. A gesture that cannot be honoured must not be
       honoured with something else. (2026-09-04) */
    if (!take.length) { clip = null; return false; }
    clip = take.map(el => {
      const p = window.Frames && Frames.panelOf ? Frames.panelOf(el) : (window.Frames && Frames.panels.find(q => q.el === el));
      return {
        src: el.dataset.src,
        w: el.dataset.w || 1120,
        h: el.dataset.h || 780,
        scale: el.dataset.scale || '',
        label: el.getAttribute('aria-label') || el.dataset.gizmo,
        stem: el.dataset.gizmo.replace(/-copy-[a-z0-9]+$/, ''),
        x: parseFloat(el.style.left || 0),
        y: parseFloat(el.style.top || 0),
        // a frame somebody has re-cut is copied at the size they cut it to;
        // one that is still following its drawing goes on following it
        cut: p && p.sized ? { w: el.offsetWidth, h: el.offsetHeight } : null
      };
    });
    pasted = 0;
    return true;
  }

  function paste() {
    if (!clip || !clip.length) return false;
    pasted++;                          // paste twice and the second lands clear of the first
    const born = [], made = [];
    clip.forEach(c => {
      const e = { id: c.stem + '-copy-' + uid(), src: c.src, w: c.w, h: c.h,
                  scale: c.scale, label: c.label,
                  x: c.x + NUDGE * pasted, y: c.y + NUDGE * pasted };
      const el = makeGz(e);
      if (!el) return;
      // frames.js reads this the moment it adopts the section, so it has to be
      // written before the hand-off and not after
      if (c.cut) { try { localStorage.setItem('knoll-lab2:size2:' + e.id, JSON.stringify(c.cut)); } catch (err) {} }
      world.appendChild(el);
      register(el);
      if (window.Frames && Frames.adopt) Frames.adopt(el);
      born.push(el); made.push(e);
    });
    if (!born.length) return false;
    restack(false);                    // the newborn land on top of the pile
    copies.update(st => { st.list = st.list.concat(made); });
    // the copies are what you have hold of now, so you can drag them straight
    // off the thing they came from
    clearPick();
    born.forEach(el => { pick(el, true); ping(el); });
    forget(); growBench();
    remember(() => born.forEach(unpaste));
    return true;
  }

  /* What DESTROYS a feature, reached two ways: undoing the paste that made
     one (below), or wall.js's delete tool asking directly (deleteCopy).
     Everything that knows the copy has to be told: the pick, the gizmo list,
     frames.js, the saved position, and the list that would otherwise put it
     back on the paper next time the page opens. */
  function unpaste(el) {
    const id = el.dataset.gizmo;
    pick(el, false);
    lifted.delete(el);
    if (menuOn === el) closeMenu();
    const i = gizmos.findIndex(g => g.el === el);
    if (i >= 0) gizmos.splice(i, 1);
    recs.delete(el);
    if (window.Frames && Frames.drop) Frames.drop(el);
    copies.update(st => { st.list = st.list.filter(e => e.id !== id); });
    try { localStorage.removeItem(KEY + id); localStorage.removeItem(ZKEY + id); } catch (e) {}
    if (sizeRO) sizeRO.unobserve(el);
    el.remove();
    restack(false); forget(); growBench();
  }

  /* THE DELETE TOOL'S HALF, undoing back the other way: unpaste() is normally
     reached FROM an undo, but a copy clicked with the delete tool has to be
     removable directly, and still worth an undo of its own afterwards — a
     click that turns out to be a mistake should cost one ctrl+z, the same as
     a mis-drag does. So this is unpaste() plus a Lab.remember that re-runs
     the relevant half of paste() for that one entry.

     ONLY a copy — el.dataset.gizmo has to match something in copies.list, or
     this is one of the eighty-four originals and there is nothing to give
     back. The caller (wall.js) checks isCopy() first for the hover highlight;
     this checks again, because a hover and a click are not the same moment
     and the tool could have changed underneath it.

     THE POSITION SAVED FOR THE UNDO IS THE LIVE ONE, not copies.list's,
     which is still wherever the copy was first pasted — a copy dragged since
     then must come back where it was left, not where it started. */
  function deleteCopy(el) {
    if (!isCopy(el)) return false;
    const entry = copies.get().list.find(e => e.id === el.dataset.gizmo);
    const e = Object.assign({}, entry, {
      x: parseFloat(el.style.left) || entry.x || 0,
      y: parseFloat(el.style.top) || entry.y || 0
    });
    const p = window.Frames && Frames.panelOf ? Frames.panelOf(el) : (window.Frames && Frames.panels.find(q => q.el === el));
    const cut = (p && p.sized) ? { w: el.offsetWidth, h: el.offsetHeight } : null;
    const z = rankOf(el);                // and where in the pile it was
    unpaste(el);
    remember(() => {
      const back = makeGz(e);
      if (!back) return;
      if (cut) { try { localStorage.setItem('knoll-lab2:size2:' + e.id, JSON.stringify(cut)); } catch (err) {} }
      world.appendChild(back);
      register(back);
      rec(back).z = z - 0.5; restack(false);
      if (window.Frames && Frames.adopt) Frames.adopt(back);
      copies.update(st => { st.list = st.list.concat([e]); });
    });
    return true;
  }

  function isCopy(el) {
    return !!(el && el.dataset.gizmo && copies && copies.get().list.some(e => e.id === el.dataset.gizmo));
  }

  /* ── TAKEN OFF THE PAPER ────────────────────────────────────────────────
     Delete, from the right-click menu, for anything that is not a pasted
     copy (a copy has deleteCopy above — it un-pastes, and there is nothing
     to keep). An original is one of the sections in index.html, and the
     bench does not get to delete those — serve.js refuses to (see WHAT IT
     WILL NOT DO, there) and it is right to. So it is TAKEN OFF rather than
     destroyed: out of the DOM, out of gizmos and out of frames.js, its name
     on a list so it stays off after a reload (knoll-lab2:gone here,
     data-gone="1" in the file once keep.js has been round — the section is
     still written down, with one word on it saying it is not on the paper;
     removing the word by hand puts it back for everybody). The record keeps
     enough to answer keep.js — where it was and what it was cut to, so the
     save does not read as a feature that has lost its place — and enough to
     put it back: undo is a FRESH CLONE of the element, registered and
     adopted like a paste, because this file and frames.js both wire a
     feature when they take it on, and wiring the old element a second time
     would drag it twice and cut it twice. deleteCopy makes one the same way. */
  let gone = null;
  const stash = [];
  const isGone = el => !!(el.hasAttribute('data-gone') || (gone && gone.get().list.indexOf(el.dataset.gizmo) >= 0));

  function hide(el) {
    const g = rec(el); if (!g) return null;
    const p = window.Frames && (Frames.panelOf ? Frames.panelOf(el) : Frames.panels.find(q => q.el === el));
    const q = geoOf(el);
    const r = { id: el.dataset.gizmo, el, x: q.x, y: q.y, w: q.w || el.offsetWidth, h: q.h || el.offsetHeight,
                cut: !!(p && p.sized), z: g.rank, file: el.hasAttribute('data-gone') };
    pick(el, false);
    lifted.delete(el);
    if (menuOn === el) closeMenu();
    gizmos.splice(gizmos.indexOf(g), 1);
    recs.delete(el);
    if (window.Frames && Frames.drop) Frames.drop(el);
    if (sizeRO) sizeRO.unobserve(el);
    el.remove();
    stash.push(r);
    gone.update(st => { if (st.list.indexOf(r.id) < 0) st.list.push(r.id); });
    restack(false); forget(); growBench();
    return r;
  }

  // at boot: a section the file or this machine says is gone comes off
  // before frames.js can adopt it, remembered well enough to be reported
  function shelve(el) {
    const s = saved(el);
    const cut = (el.dataset.cut || '').split('x').map(Number);
    let size = null;
    try { size = JSON.parse(localStorage.getItem('knoll-lab2:size2:' + el.dataset.gizmo)); } catch (e) {}
    const z = zOf(el);
    stash.push({ id: el.dataset.gizmo, el,
                 x: s ? s.x : parseFloat(el.dataset.homeX) || 0, y: s ? s.y : parseFloat(el.dataset.homeY) || 0,
                 w: (size && size.w) || cut[0] || parseFloat(el.style.width) || 0,
                 h: (size && size.h) || cut[1] || parseFloat(el.style.height) || 0,
                 cut: !!(size || el.dataset.cut), z: isFinite(z) ? z : 0, file: el.hasAttribute('data-gone') });
    el.remove();
  }

  function unhide(r) {
    const i = stash.indexOf(r); if (i < 0) return;
    stash.splice(i, 1);
    const el = r.el.cloneNode(true);     // the same markup with the moment washed off it
    el.className = el.className.replace(/\b(booted|stalled|live|gz-cold|picked|dragging|sizing|menued|ping)\b/g, '').replace(/\s+/g, ' ').trim();
    el.removeAttribute('data-gone');     // it is back, and the next save tells the file so
    const f = el.querySelector('iframe'); if (f) { f.removeAttribute('src'); f.removeAttribute('style'); }
    const d = el.querySelector('.gz-dim'); if (d) d.textContent = '';
    if (r.cut) { try { localStorage.setItem('knoll-lab2:size2:' + r.id, JSON.stringify({ w: r.w, h: r.h })); } catch (e) {} }
    world.appendChild(el);
    register(el);
    rec(el).z = r.z - 0.5;               // back into the pile where it was, under what was over it
    restack(false);
    if (window.Frames && Frames.adopt) Frames.adopt(el);
    gone.update(st => { st.list = st.list.filter(id => id !== r.id); });
    r.el = el;                           // taken off again, this is the one to keep
    forget(); growBench(); ping(el);
  }

  // the menu's delete: a copy is un-pasted, anything else is taken off — one
  // undo entry for the crew, however many it was
  function remove(el) {
    const crew = picked.has(el) ? [...picked] : [el];
    const backs = [];
    crew.forEach(e => { if (isCopy(e)) deleteCopy(e); else { const r = hide(e); if (r) backs.push(r); } });
    if (backs.length) remember(() => backs.forEach(unhide));
    return !!(backs.length || crew.some(isCopy));
  }

  /* ── THE PILE ────────────────────────────────────────────────────────────
     gizmos[] is a list, not an order: the order is each record's z, and
     restack() is the one place a z becomes a zIndex. It sorts by z with the
     order things were registered in (markup order) as the tiebreak, hands
     each record its rank, and paints. A z of Infinity is 'on top' — what a
     feature with no saved place gets, so a paste lands over what it came
     from and a section nobody has ranked lands where it always did, at the
     end of the markup. 'save' writes every rank to this machine; the file
     hears about them from keep.js. */
  const ZKEY = 'knoll-lab2:z:';
  const lifted = new Set();
  /* One step, not a walk: every press on any section asks this (lift), and
     a walk over a thousand records per press was where a wood of trees
     started to drag its feet. register() files each record here; unpaste and
     hide take it out again, and the find is only the fallback. */
  const recs = new WeakMap();
  const rec = el => recs.get(el) || gizmos.find(g => g.el === el);
  const rankOf = el => { const g = rec(el); return g ? g.rank : 0; };

  function zOf(el) {
    try {
      const v = parseFloat(localStorage.getItem(ZKEY + el.dataset.gizmo));
      if (isFinite(v)) return v;
    } catch (e) {}
    const h = parseFloat(el.dataset.homeZ);
    return isFinite(h) ? h : Infinity;
  }

  function restack(save) {
    const n = gizmos.length;
    gizmos.slice().sort((a, b) => (a.z - b.z) || (a.n - b.n)).forEach((g, i) => {
      g.rank = g.z = i;
      const z = Math.min(Z_CEIL, Z_FLOOR + i + (lifted.has(g.el) ? n : 0));
      if (+g.el.style.zIndex !== z) g.el.style.zIndex = z;
      if (save) { try { localStorage.setItem(ZKEY + g.el.dataset.gizmo, String(i)); } catch (e) {} }
    });
  }

  // the lift: over the whole pile, until the next press on something else.
  // 'more' is a crew being lifted together — nobody comes down for them.
  function lift(el, more) {
    if (lifted.has(el)) return;
    if (!more) { lifted.forEach(e => { e.style.zIndex = Z_FLOOR + rankOf(e); }); lifted.clear(); }
    lifted.add(el);
    el.style.zIndex = Math.min(Z_CEIL, Z_FLOOR + gizmos.length + rankOf(el));
  }

  // the pile as it stands, and a way to put it back — one entry per gesture
  const pile = () => gizmos.map(g => [g, g.rank]);
  function unpile(was) {
    was.forEach(([g, r]) => { g.z = r; });
    restack(true);
  }

  const overlaps = (a, b) => {
    const p = geoOf(a), q = geoOf(b);
    return p.x < q.x + q.w && p.x + p.w > q.x && p.y < q.y + q.h && p.y + p.h > q.y;
  };

  /* One step, PAST SOMETHING. In a pile of eighty-four, 'up one' meaning the
     next number is a button you press thirty times to see anything happen,
     because the next number is usually a machine on the far side of the
     sheet. So a step is measured against what this feature actually
     overlaps: raise puts it just over the lowest thing that covers it, lower
     puts it just under the highest thing it covers, and with nothing in the
     way either takes it all the way to the top or the bottom. Says whether
     anything moved, so the menu can. */
  function step(el, up) {
    const g = rec(el); if (!g) return false;
    const near = gizmos.filter(o => o !== g && !out(o.el) && (up ? o.rank > g.rank : o.rank < g.rank) && overlaps(el, o.el));
    const to = near.length ? (up ? Math.min : Math.max).apply(null, near.map(o => o.rank)) : (up ? gizmos.length - 1 : 0);
    if (to === g.rank) return false;
    const order = gizmos.slice().sort((a, b) => a.rank - b.rank);
    order.splice(order.indexOf(g), 1);
    order.splice(to, 0, g);
    order.forEach((o, i) => { o.z = i; });
    restack(true);
    return true;
  }
  // the crew is the pick, if the feature is in it. Raising six things one
  // step each goes top-down so none of them steps over another member of the
  // crew; lowering goes bottom-up for the same reason.
  function restep(el, up) {
    const crew = (picked.has(el) ? [...picked] : [el]).filter(rec)
      .sort((a, b) => up ? rankOf(b) - rankOf(a) : rankOf(a) - rankOf(b));
    const was = pile();
    let did = false;
    crew.forEach(e => { if (step(e, up)) did = true; });
    if (did) remember(() => unpile(was));
    return did;
  }
  const raise = el => restep(el, true);
  const lower = el => restep(el, false);

  // what a drag does to the pile: the crew comes out on top, in its own order
  function toTop(els) {
    const top = new Set(els);
    const order = gizmos.slice().sort((a, b) => a.rank - b.rank);
    order.filter(g => !top.has(g.el)).concat(order.filter(g => top.has(g.el))).forEach((g, i) => { g.z = i; });
    restack(true);
  }

  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  // ══ the camera ═══════════════════════════════════════════════════════════
  // The sheet is never scrolled — it is translated and scaled under a fixed
  // viewport. PX/PY are the sheet's offset from the top-left of the bench, in
  // screen pixels; Z is the scale.
  const CAM_KEY = 'knoll-lab2:cam', OLD_ZKEY = 'knoll-lab2:zoom';
  const ZMIN = 0.02, ZMAX = 4, EDGE = 120;     // EDGE — how much sheet stays on screen
  let Z = 1, PX = 0, PY = 0, lastZ = 1, restored = false;

  try {
    const v = JSON.parse(localStorage.getItem(CAM_KEY));
    if (v && isFinite(v.z) && isFinite(v.x) && isFinite(v.y)) {
      Z = clamp(v.z, ZMIN, ZMAX); PX = v.x; PY = v.y; restored = true;
    }
  } catch (e) {}
  if (!restored) { try { const v = parseFloat(localStorage.getItem(OLD_ZKEY)); if (isFinite(v)) Z = clamp(v, ZMIN, ZMAX); } catch (e) {} }
  lastZ = Z;

  /* the bench's rectangle, asked for once and remembered: it only changes
     when the window or the header does, and both of those already have
     handlers below — which is where unbox() is called from. Reading it fresh
     per pointer event was another stop-and-lay-out in the middle of a pan. */
  let bBox = null;
  const box = () => bBox || (bBox = bench.getBoundingClientRect());
  const unbox = () => { bBox = null; };

  // the sheet's own numbers, kept by layout() and growBench() — same argument
  let worldW = 0, worldMinH = 0, benchH = 0;

  function toWorld(cx, cy) {
    const b = box();
    return { x: (cx - b.left - PX) / Z, y: (cy - b.top - PY) / Z };
  }

  function toScreen(wx, wy) {
    const b = box();
    return { x: b.left + PX + wx * Z, y: b.top + PY + wy * Z };
  }

  // the reachable canvas: the sheet, plus anything dragged off the side of it
  let cBox = null;
  const forget = () => { cBox = null; };

  // not on the bench, so it must not stretch it or be flown to
  const out = el => el.hidden;

  function contentBox() {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity, n = 0;
    gizmos.forEach(g => {
      if (out(g.el)) return;
      const q = geoOf(g.el);
      x0 = Math.min(x0, q.x); y0 = Math.min(y0, q.y);
      x1 = Math.max(x1, q.x + q.w); y1 = Math.max(y1, q.y + q.h);
      n++;
    });
    if (!n) return { x: 0, y: 0, w: worldW, h: worldMinH };
    return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
  }

  function canvasBox() {
    if (cBox) return cBox;
    const c = contentBox();
    const x0 = Math.min(0, c.x), y0 = Math.min(0, c.y);
    const x1 = Math.max(worldW, c.x + c.w), y1 = Math.max(worldMinH, c.y + c.h);
    cBox = { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
    return cBox;
  }

  function clampCam() {
    const b = box(), c = canvasBox();
    if (b.width < 40 || b.height < 40) return;   // the bench isn't laid out yet — don't reel the camera in
    const l = c.x * Z, t = c.y * Z, w = c.w * Z, h = c.h * Z;
    const mx = Math.min(EDGE, w * 0.6), my = Math.min(EDGE, h * 0.6);
    PX = clamp(PX, mx - l - w, b.width - mx - l);
    PY = clamp(PY, my - t - h, b.height - my - t);
  }

  let saveT = 0;
  function saveCam() {
    clearTimeout(saveT);
    saveT = setTimeout(() => {
      try { localStorage.setItem(CAM_KEY, JSON.stringify({ z: Z, x: PX, y: PY })); } catch (e) {}
    }, 200);
  }

  /* ── the grid ───────────────────────────────────────────────
     The bench's squares used to be wallpaper: the same size and in the same
     place whatever the camera did, so they read as a texture on the glass
     rather than as the ground the work sits on — and at 20% zoom a gizmo was
     the size of one square. Now the pattern is a function of the camera. A
     cell is GRID_UNIT world units, so it scales with Z, and the pattern's
     origin is world 0,0, so it slides with the pan. The CSS reads all of it
     from three custom properties; every skin's bench is cut from the same
     ones (see themes.css).

     One ladder keeps it usable at both ends of the zoom: while a cell would
     land under GRID_MIN screen pixels the step doubles, so far out you are
     looking at every 2nd, 4th, 16th line instead of a grey wash. The heavier
     rule some skins draw is always five cells, whichever rung that is.

     The floor is 10 so that the pixel tool's finest cell still has a line of
     its own at 100%; below that zoom it shows every second one, which is the
     ladder working rather than a mismatch. */
  const GRID_MIN = 10;                   // the smallest cell worth drawing, in screen px
  let gridUnit = 20;                     // world units per cell — the pixel tool re-cuts this
  let gridStep = 0;                      // the cell as drawn — repaint only when THIS changes
  let gridX = -1, gridY = -1;            // …and where the pattern is anchored, likewise

  /* The pattern is painted once per cell size and SLID thereafter: the cell
     (--gs) only changes with the zoom, and the pan just moves the layer. The
     slide is wrapped to one cell — the pattern repeats, so a metre of pan
     and a centimetre land on the same pixels — which keeps the layer's own
     box still and the wrap inside the one-cell overhang #bench-grid hangs
     past every edge.

     THE PROPERTY IS SET ON THE GRID, NOT ON THE BENCH. A custom property is
     inherited, so written on .bench it re-styled everything under the bench
     — a hundred and sixty sections and their shields — on every step of a
     zoom, for one background-size that only the grid reads. On the grid it
     is a repaint of one layer and nothing else: measured at 25%, the
     difference between a zoom step at 47 frames a second and one at the
     idle rate. */
  /* THE GRID IS THE ROOM'S FLOOR. It used to be a viewport-sized layer slid
     one cell at a time under the sheet, one keyframe rewrite per frame — and
     a keyframe rewrite is a change the engine has to hand to the compositor,
     which a trace shows as a layer decision on every frame of a pan (see THE
     CAMERA IS A SCROLL). So it is the floor now: one element the size of the
     room, its pattern anchored to the world origin by background-position
     and scrolled with everything else for nothing. It is written to only
     when the cell or the anchor changes — a zoom step, a re-cut, the room
     moving — never on a pan. */
  function paintGrid() {
    let s = gridUnit * Z;
    for (let i = 0; i < 20 && s < GRID_MIN; i++) s *= 2;
    const gx = ((OX % s) + s) % s, gy = ((OY % s) + s) % s;
    if (s === gridStep && gx === gridX && gy === gridY) return;
    gridStep = s; gridX = gx; gridY = gy;
    const st = gridEl.style;
    st.setProperty('--gs', s.toFixed(3) + 'px');
    st.setProperty('--gs2', (s * 5).toFixed(3) + 'px');
    st.backgroundPosition = gx.toFixed(3) + 'px ' + gy.toFixed(3) + 'px';
  }

  // re-cut the paper to a different cell (the wall's pixel tool draws on it)
  function grid(n) {
    n = +n;
    if (!isFinite(n) || n <= 0 || n === gridUnit) return;
    gridUnit = n;
    paintGrid();
  }

  function paintZoom() {
    const val = document.getElementById('zoom-val');
    if (val) val.textContent = Math.round(Z * 100) + '%';
    document.body.classList.toggle('zoomed-out', Z < 0.999);
  }

  /* ── THE CAMERA IS AN ANIMATION, NOT A STYLE ────────────────────────────
     The sheet is composited (will-change, lab.css), so a pan was meant to be
     the compositor sliding one texture and nothing else. It was not. Writing
     `transform` on a composited element does not take the direct path in
     Chrome — only a transform that is being ANIMATED does. A plain style
     write lands on the main thread as "something's geometry changed, work
     out again who overlaps whom": a full re-layerisation of every document
     that is not cold (PaintArtifactCompositor::Update, in a trace), at
     about half a millisecond per warm document. Twenty-nine warm at 100%
     came to 12ms a frame and read as fine; a hundred and sixty warm at 25%
     came to 80ms a frame and read as a slideshow. Style, layout and script
     were under a millisecond the whole time, which is why nothing in the
     earlier rounds — compositing the sheet, caching geometry, freezing the
     features — touched it: the frame was spent deciding layers.

     So the camera is ONE WEB ANIMATION on the sheet, and moving the camera
     rewrites its keyframes — both the same, so the animation holds a pose
     rather than travelling anywhere. A property under an active animation
     is updated straight on the compositor (that fast path exists precisely
     because animations are expected to move things), and a pan costs the
     main thread nothing at any zoom. The grid slides the same way, and a
     feature under the hand is carried the same way — see carry().

     Measured at 25% with everything else held still: twelve frames a second
     by style, a hundred and ten and up by animation. And it lands crisp: an
     animated layer is rasterised at the scale its own keyframes say, which
     is the landed zoom, so the settle-and-sharpen dance that used to live
     here (drop will-change for two frames, pick it back up) is gone — it
     would now cost two of the very re-layerisations this exists to avoid,
     at every stop.

     Where there is no Web Animations API, or an effect with no
     setKeyframes, the style is written the way it always was. */
  const rigs = new WeakMap();            // element → its animation, or false where there is none to be had
  const HOLD = { duration: 1e9, iterations: Infinity, fill: 'both' };

  function drive(el, t) {
    let a = rigs.get(el);
    if (a === undefined) {
      a = false;
      if (typeof el.animate === 'function') {
        try {
          a = el.animate([{ transform: t }, { transform: t }], HOLD);
          if (!a.effect || typeof a.effect.setKeyframes !== 'function') { a.cancel(); a = false; }
        } catch (e) { a = false; }
      }
      rigs.set(el, a);
      if (a) { el.style.transform = ''; return; }   // the animation is the transform from here on
    }
    if (a) a.effect.setKeyframes([{ transform: t }, { transform: t }]);
    else el.style.transform = t;
  }

  // …and letting go of one: the drag's, at the drop, once the position has
  // been written into left/top where everything else reads it
  function undrive(el) {
    const a = rigs.get(el);
    if (a) a.cancel();
    rigs.delete(el);
    el.style.transform = '';
  }

  /* ── THE CAMERA IS A SCROLL; THE POSE IS AN ANIMATION ────────────────────
     The round above was right about what it measured — a plain transform
     write re-layerises the page every frame, a rewritten keyframe is a
     hundred frames a second WITH NOTHING ELSE MOVING. A third round measured
     a pan with things moving: features crossing the pause line and the cold
     line, three of them booting, and every one of those is a change the
     engine answers by deciding the page's layers again, at half a
     millisecond per warm document — most of the bench, at 35%. The keyframe
     camera pays it too: a rewritten keyframe is still a change the main
     thread hands to the compositor, and a trace shows Layerize, PrePaint and
     Commit on EVERY frame of a pan — two milliseconds at rest, and ninety to
     a hundred and forty the moment anything crosses a line. So a fast pan
     over a busy stretch was a slideshow in exactly the spots with the most
     on them, which is what it felt like.

     THE ONE THING THE ENGINE MOVES FOR FREE IS A SCROLL. A scroll offset
     lives on the compositor and changing it decides nothing about layers.
     Measured on the same busy stretch at 35%, three ways of moving the
     sheet over the same path: keyframes 11ms a frame with spikes to 127;
     seeking an animation 8ms with spikes to 142; scrolling 6ms flat, the
     worst frame under 10, not one over 34. At 100% the same. So the bench
     is a scroll container now (with no scrollbars — lab.css), and A PAN IS
     A SCROLL. PX and PY — the sheet's offset from the bench's top-left,
     which is what every reader in this file and the others has always been
     given — stay the API and are DERIVED from the scroll; the sheet itself
     holds still inside a ROOM sized to exactly the range clampCam allows.

       screen  = bench.top-left + PX + world × Z      (as it always was)
       PX      = OX − bench.scrollLeft,  PY = OY − bench.scrollTop
       sheet   = translate(OX, OY) scale(Z)           rewritten only when Z
                                                      or the room changes

     OX, OY is where world 0,0 sits inside the room: the place the origin has
     with the bench scrolled to 0, which is the far right of the clamp — so
     the whole clamp range is scroll range and nothing sits at a negative
     offset, where a scroll cannot reach. fitRoom() keeps room and origin in
     step with the content box and the zoom, and writes them only when they
     change, because changing them IS the re-layerisation this exists to
     avoid: a drag past the edge of the content pays it once, a pan never.

     WHAT STILL RIDES THE ANIMATION: the sheet's pose (zoom and origin) and a
     feature being carried — see drive(). A zoom step rewrites one keyframe
     and pays one layer decision, as it always did. The grid needs not even
     that: it is the room's floor, painted once per zoom step and scrolled
     with the rest — see paintGrid.

     AND WHILE THE CAMERA IS MOVING FAST, NOTHING CHANGES TIER. With the pan
     itself free, what was left in the trace was every feature that crossed
     a line mid-pan — cold to warm, paused to running, three of them booting
     — each a change the engine answers by deciding the layers again, ninety
     milliseconds at 35% with most of the bench warm, five times a second on
     a fast pan. So frames.js asks moving() before it flushes any of those,
     and holds them while the answer is yes: a fast pan sees what was
     already drawn, and everything it swept over catches up the moment it
     slows, on 'lab:still' — the way a map fills its tiles in after the
     flick and not during it. Slow moves (under FAST) are not held at all,
     so a leisurely pan draws as it goes, exactly as before.

     WHAT A SCROLL BRINGS WITH IT, AND HOW EACH IS ANSWERED. The browser
     scrolls a scroll container by itself — a focus() inside a frame, an
     arrow key, find-in-page — so every move is heard on 'scroll' and adopted
     into PX/PY, and the camera can never disagree with the screen. Scroll
     ANCHORING would nudge the offset whenever something above the fold
     changed size, which growBench() does all day, so it is off. A finger
     would scroll natively AND pan through the pointer handlers, so
     touch-action:none leaves it to the handlers. The wheel is still taken
     by the handler below and turned into a pan, because a wheel also has to
     zoom, go sideways, and yield to a list inside a feature. And the band,
     which used to sit in the bench's own coordinates, is fixed to the
     viewport now, or it would scroll off with the sheet. */
  let OX = 0, OY = 0, roomW = 0, roomH = 0, drawnZ = NaN;
  let sl = -1, st = -1;                  // the scroll, as this file last wrote it

  function fitRoom() {
    const b = box(), c = canvasBox();
    if (b.width < 40 || b.height < 40) return false;
    const l = c.x * Z, t = c.y * Z, w = c.w * Z, h = c.h * Z;
    const mx = Math.min(EDGE, w * 0.6), my = Math.min(EDGE, h * 0.6);
    const ox = b.width - mx - l, oy = b.height - my - t;
    const rw = Math.ceil(b.width * 2 - 2 * mx + w) + 1, rh = Math.ceil(b.height * 2 - 2 * my + h) + 1;
    if (ox === OX && oy === OY && rw === roomW && rh === roomH) return false;
    OX = ox; OY = oy; roomW = rw; roomH = rh;
    room.style.width = rw + 'px';
    room.style.height = rh + 'px';
    gridEl.style.width = rw + 'px';      // the grid is the room's floor — see paintGrid
    gridEl.style.height = rh + 'px';
    return true;
  }

  function applyCam() {
    if (fitRoom() || Z !== drawnZ) {
      drawnZ = Z;
      drive(world, 'translate3d(' + OX.toFixed(2) + 'px,' + OY.toFixed(2) + 'px,0) scale(' + Z.toFixed(5) + ')');
    }
    const nl = OX - PX, nt = OY - PY;
    if (nl !== sl || nt !== st) { sl = nl; st = nt; bench.scrollTo(nl, nt); }
    paintGrid();
    if (Math.abs(Z - lastZ) > 1e-6) paintZoom();
    saveCam();
    noteMove();
  }

  /* how fast the camera is going, for whoever has work that can wait. A
     move is any change to PX/PY (a pan, a zoom about a point, a glide);
     the speed is a short average in screen px per ms, and a gap of a
     quarter second is a new gesture rather than a slow one. moving() is
     the question frames.js asks; 'lab:still' is the answer arriving. */
  const STILL = 160, FAST = 0.35;        // ms of quiet before the camera counts as still; px/ms that counts as fast
  let moveAt = 0, moveV = 0, stillT = 0, lastPX = NaN, lastPY = NaN;
  function noteMove() {
    const now = performance.now();
    const d = isNaN(lastPX) ? 0 : Math.hypot(PX - lastPX, PY - lastPY);
    const dt = now - moveAt;
    lastPX = PX; lastPY = PY;
    if (!d) return;
    moveV = dt > 0 && dt < 250 ? moveV * 0.5 + (d / dt) * 0.5 : d / 16;
    moveAt = now;
    clearTimeout(stillT);
    stillT = setTimeout(() => { moveV = 0; document.dispatchEvent(new CustomEvent('lab:still')); }, STILL);
  }
  const moving = () => performance.now() - moveAt < STILL && moveV > FAST;

  // the browser scrolled the bench itself: adopt it, clamp it, and if the
  // clamp had something to say, say it back
  bench.addEventListener('scroll', () => {
    if (!roomW) return;
    const l = bench.scrollLeft, t = bench.scrollTop;
    if (Math.abs(l - sl) < 0.5 && Math.abs(t - st) < 0.5) return;
    sl = l; st = t;
    PX = OX - l; PY = OY - t;
    clampCam();
    paintGrid(); saveCam();
    const nl = OX - PX, nt = OY - PY;
    if (Math.abs(nl - l) > 0.5 || Math.abs(nt - t) > 0.5) { sl = nl; st = nt; bench.scrollTo(nl, nt); }
  }, { passive: true });

  function emitZoom() {
    if (Math.abs(Z - lastZ) < 1e-6) return;
    lastZ = Z;
    paintZoom();
    document.dispatchEvent(new CustomEvent('lab:zoom', { detail: { zoom: Z } }));
  }

  function panBy(dx, dy) {
    if (!dx && !dy) return;
    PX += dx; PY += dy;
    clampCam(); applyCam();
  }

  // zoom about a point on the screen — that world point stays under it
  function setZoom(nz, cx, cy) {
    nz = clamp(nz, ZMIN, ZMAX);
    if (Math.abs(nz - Z) < 1e-4) return;
    const b = box();
    if (cx == null) { cx = b.left + b.width / 2; cy = b.top + b.height / 2; }
    const p = toWorld(cx, cy);
    Z = nz;
    PX = cx - b.left - p.x * Z;
    PY = cy - b.top - p.y * Z;
    clampCam(); applyCam(); emitZoom();
  }

  // a glide from here to there — used by fit and by reset
  let tween = 0;
  function camTo(z, px, py, ms) {
    cancelAnimationFrame(tween); tween = 0;
    z = clamp(z, ZMIN, ZMAX);
    if (!ms) { Z = z; PX = px; PY = py; clampCam(); applyCam(); emitZoom(); return; }
    const z0 = Z, x0 = PX, y0 = PY, t0 = performance.now();
    const step = now => {
      const t = Math.min(1, (now - t0) / ms), e = 1 - Math.pow(1 - t, 3);
      Z = z0 + (z - z0) * e; PX = x0 + (px - x0) * e; PY = y0 + (py - y0) * e;
      clampCam(); applyCam();
      if (t < 1) tween = requestAnimationFrame(step); else { tween = 0; emitZoom(); }
    };
    tween = requestAnimationFrame(step);
  }
  const stopTween = () => { if (tween) { cancelAnimationFrame(tween); tween = 0; emitZoom(); } };

  // shift 1 — everything on the bench, framed
  function fit(quiet) {
    const c = contentBox(), b = box(), pad = 56;
    if (!c.w || !c.h) return;
    const z = clamp(Math.min((b.width - pad * 2) / c.w, (b.height - pad * 2) / c.h), ZMIN, 1);
    camTo(z, (b.width - c.w * z) / 2 - c.x * z, (b.height - c.h * z) / 2 - c.y * z, quiet ? 0 : 340);
  }

  // bring one gizmo into view, moving as little as it takes
  function focusOn(el, ms) {
    const b = box(), pad = 40, g = geoOf(el);
    const l = g.x * Z, t = g.y * Z;
    const w = g.w * Z, h = g.h * Z;
    // it wants to sit inside the padding: pad ≤ its edges ≤ the far edge − pad
    const px = w > b.width - pad * 2 ? (b.width - w) / 2 - l : clamp(PX, pad - l, b.width - pad - w - l);
    const py = h > b.height - pad * 2 ? pad - t : clamp(PY, pad - t, b.height - pad - h - t);
    if (Math.abs(px - PX) < 1 && Math.abs(py - PY) < 1) return;
    camTo(Z, px, py, ms == null ? 300 : ms);
  }

  // the sheet is as wide as the viewport. A hidden or half-built page reports
  // zero here, so never write a width that would collapse the sheet.
  function layout() {
    unbox();
    const w = bench.clientWidth || world.offsetWidth || document.documentElement.clientWidth;
    benchH = bench.clientHeight;
    if (w > 0) { worldW = Math.round(w); world.style.width = worldW + 'px'; }
    /* WHERE THE BENCH STARTS, published for the CSS. The zoom dock stands up
       the right-hand side on a phone (THE DOCK ON A PHONE, in lab.css) and it
       is fixed to the viewport, so it has to be told where the header ends —
       and the header is one line on the deployed site and a paragraph of
       workbench notes at home, which makes its height a measurement and not a
       number. Written here because here is where the bench is already being
       measured; the resize handler and the bench's own ResizeObserver both
       come through this function. */
    const top = Math.round(box().top);
    if (top > 0) document.documentElement.style.setProperty('--head-h', top + 'px');
    growBench();
  }

  function growBench() {
    let bottom = 0;
    gizmos.forEach(g => {
      if (out(g.el)) return;
      const q = geoOf(g.el);
      if (q.y + q.h > bottom) bottom = q.y + q.h;
    });
    const min = Math.round(Math.max(benchH, bottom + 140));
    // written only when it CHANGED: this runs on every frame of a drag, and a
    // same-value write still dirties the sheet's layout for whoever reads next
    if (min !== worldMinH) { worldMinH = min; world.style.minHeight = min + 'px'; }
    forget();
  }

  /* Home is where the markup says it is. Lab 1 stacked its gizmos in one
     centred column, which suits panels the width of a page; these are whole
     SCREENS, and eighty-four of them in a column is a mile of paper nobody will
     scroll. So each carries its own data-home-x / data-home-y and they are
     laid out as a field you fly about instead — shift 1 frames the lot.
     Anything without the pair falls back to lab 1's column. */
  function homeOf(el) {
    const hx = parseFloat(el.dataset.homeX), hy = parseFloat(el.dataset.homeY);
    if (isFinite(hx) && isFinite(hy)) return { x: hx, y: hy };
    const i = gizmos.findIndex(g => g.el === el);
    let y = 46;
    for (let k = 0; k < i; k++) y += geoOf(gizmos[k].el).h + 26;
    const x = Math.max(10, (worldW - geoOf(el).w) / 2);
    return { x, y };
  }

  // roam off the side of the sheet if you like — the camera can still find
  // it. The rein is longer than lab 1's because the field these panels are
  // laid out on is wider than one viewport to begin with. It used to stop at
  // -1200 upwards back when nothing lived above the top row; the sign does,
  // and sits at -1200 itself, so upwards gets the same room to roam as
  // sideways rather than starting out against the rail.
  function rein(g, x, y) {
    return { x: Math.round(clamp(x, -g.w - 7000, worldW + 7000)),
             y: Math.round(clamp(y, -g.h - 2600, 24000)) };
  }

  function place(el, x, y, save) {
    const g = geoOf(el);
    const r = rein(g, x, y);
    g.x = r.x; g.y = r.y;
    el.style.left = g.x + 'px';
    el.style.top = g.y + 'px';
    growBench();
    if (save) {
      try { localStorage.setItem(KEY + el.dataset.gizmo, JSON.stringify({ x, y })); } catch (e) {}
    }
  }

  /* ── CARRIED, NOT PLACED ───────────────────────────────────────────────
     While the hand has hold of one, a feature moves by the camera's trick:
     an animation on the section holding a translate from where it was
     picked up, rewritten every frame — see drive(). left/top stay at the
     pick-up point for the whole gesture, so every reader of a position
     (keep.js, reset, the saved position) sees where it WAS until the drop,
     and the drop writes the real number once, through place(). Writing
     left/top every frame was a layout and the full re-layerisation, every
     frame, for the same reason the camera was — at 25% a dragged gnome
     moved at twelve frames a second.

     The geo table is kept current regardless: the bench's own sums — the
     rein, growBench(), the band, the edge-pan's clamp — read it, and should
     see where the thing actually is. The crew entry's x/y are the same
     numbers, kept for the drop. */
  function carry(g, x, y) {
    const q = geoOf(g.el), r = rein(q, x, y);
    g.x = q.x = r.x; g.y = q.y = r.y;
    drive(g.el, 'translate(' + (g.x - g.x0) + 'px,' + (g.y - g.y0) + 'px)');
    growBench();
  }

  function saved(el) {
    try {
      const v = JSON.parse(localStorage.getItem(KEY + el.dataset.gizmo));
      if (v && isFinite(v.x) && isFinite(v.y)) return v;
    } catch (e) {}
    return null;
  }

  function goHome(el, clear) {
    const h = homeOf(el);
    place(el, h.x, h.y, false);
    if (clear) { try { localStorage.removeItem(KEY + el.dataset.gizmo); } catch (e) {} }
  }

  // ── store: tiny persisted state for gizmos (localStorage, per device) ──
  const stores = [];
  function store(key, defaults) {
    const K = 'knoll-lab2:' + key;
    const fresh = () => typeof defaults === 'function' ? defaults() : JSON.parse(JSON.stringify(defaults));
    let state = null, seeded = false;
    try { const v = JSON.parse(localStorage.getItem(K)); if (v && typeof v === 'object') state = v; } catch (e) {}
    if (!state) { state = fresh(); seeded = true; }
    const subs = [];
    const save = () => { try { localStorage.setItem(K, JSON.stringify(state)); } catch (e) {} };
    if (seeded) save();   // a fresh seed persists at once, so seeded dates and ids hold still across reloads
    const emit = () => subs.forEach(f => f(state));
    const api = {
      get: () => state,
      set: v => { state = v; save(); emit(); },
      update: fn => { const r = fn(state); if (r !== undefined) state = r; save(); emit(); },
      on: f => { subs.push(f); return () => { const i = subs.indexOf(f); if (i >= 0) subs.splice(i, 1); }; },
      reset: () => { state = fresh(); save(); emit(); }
    };
    stores.push(api);
    return api;
  }
  let uidN = 0;
  const uid = () => (Date.now().toString(36) + (uidN++).toString(36) + Math.floor(Math.random() * 1e6).toString(36));
  const resetData = () => stores.forEach(s => s.reset());

  /* ── canvases that follow the camera ────────────────────────────────────
     A <canvas> is a bitmap, not a drawing. Vector art on the sheet is
     re-rasterised the moment the camera settles (see the camera, above), but
     a canvas can only be REDRAWN — bigger — by whoever painted it. At 300%
     the browser has three screen pixels for every one the gizmo painted, so
     it stretches, and the hill, the shed and the tank all go to mush.

     So a gizmo hands its canvas over, once:

       Lab.hidpi(canvas, () => draw())

     The canvas keeps the size it was written at as its LOGICAL size — the
     coordinates every drawing function in this project already works in —
     and this fits the BACKING STORE to the pixels actually on screen: the
     canvas's own displayed width (they are all width:100%, so that is not
     the attribute width), times the device pixel ratio. The 2d context is
     given a matching base transform, so not one line of drawing code has to
     change, and redraw() paints it again at the new resolution.

     Only what is on screen gets the big backing store; a gizmo parked off the
     side of the sheet drops back to 1×, so a bench at 400% is not a bench
     full of sixteen-megapixel bitmaps. And the refit waits for the zoom to
     SETTLE rather than running mid-gesture — the same breath the sheet takes,
     for the same reason. */
  const HIDPI_MAX = 4;                   // device pixels per logical pixel, ceiling
  const canvases = [];
  let hidpiT = 0;

  const dpr = () => window.devicePixelRatio || 1;
  const hstep = v => Math.min(HIDPI_MAX, Math.max(1, Math.ceil(v * 2) / 2));

  /* Most canvases here are width:100% and take their size from the column they
     sit in — growing the backing store changes nothing about the layout. A few
     (the level meter) have no CSS size at all and take their box straight from
     the attributes, and growing those would grow the gizmo around them. Rather
     than keep a list, ask: widen the bitmap and see whether the box follows. */
  function probe(e) {
    const w0 = e.canvas.offsetWidth, h0 = e.canvas.offsetHeight;
    if (!w0) return false;               // not laid out yet — ask again later
    e.canvas.width = e.lw * 2;
    if (e.canvas.offsetWidth !== w0) { e.canvas.style.width = w0 + 'px'; e.canvas.style.height = h0 + 'px'; }
    e.canvas.width = e.lw;
    return true;
  }

  function fitCanvas(e) {
    if (!e.probed) e.probed = probe(e);
    const r = e.canvas.getBoundingClientRect();
    if (!r.width || !e.lw) return;       // never laid out, or hidden
    const want = e.on ? hstep(r.width * dpr() / e.lw) : hstep(dpr());
    if (want === e.s) return;
    e.s = want;
    e.canvas.width = Math.round(e.lw * want);
    e.canvas.height = Math.round(e.lh * want);
    // width/height wipe the context clean, transform included — so set it here
    // and let the gizmo draw in the coordinates it already knows
    e.canvas.getContext('2d').setTransform(want, 0, 0, want, 0, 0);
    try { e.redraw(); } catch (err) {}
  }
  const fitCanvases = () => canvases.slice().forEach(e =>
    e.canvas.isConnected ? fitCanvas(e) : dropCanvas(e));
  const entryFor = el => canvases.find(c => c.canvas === el);
  function dropCanvas(e) {
    const i = canvases.indexOf(e); if (i < 0) return;
    canvases.splice(i, 1);
    if (seen) seen.unobserve(e.canvas);
    if (grew) grew.unobserve(e.canvas);
  }

  // in view / out of view, and any change to the LAYOUT size (a role switch, a
  // narrower column). Zoom moves neither, so the camera tells us separately.
  const seen = 'IntersectionObserver' in window ? new IntersectionObserver(rows => {
    rows.forEach(row => { const e = entryFor(row.target);
      if (e) { e.on = row.isIntersecting; fitCanvas(e); } });
  }, { root: bench, rootMargin: '300px' }) : null;
  const grew = 'ResizeObserver' in window ? new ResizeObserver(rows => {
    rows.forEach(row => { const e = entryFor(row.target); if (e) fitCanvas(e); });
  }) : null;

  function hidpi(canvas, redraw, lw, lh) {
    const had = entryFor(canvas);
    if (had) dropCanvas(had);            // handed over twice: the second one wins
    const e = { canvas, redraw: redraw || function () {}, s: 0, on: !seen, probed: false,
                lw: lw || canvas.width, lh: lh || canvas.height };
    canvases.push(e);
    if (seen) seen.observe(canvas);
    if (grew) grew.observe(canvas);
    fitCanvas(e);
    return {
      get scale() { return e.s; },
      get w() { return e.lw; },
      get h() { return e.lh; },
      // for a canvas that changes its own logical size (the bug farm swaps tanks)
      resize: (w, h) => { e.lw = w; e.lh = h; e.s = 0; e.probed = false; fitCanvas(e); },
      refit: () => { e.s = 0; fitCanvas(e); },
      drop: () => dropCanvas(e)
    };
  }

  const refitSoon = ms => { clearTimeout(hidpiT); hidpiT = setTimeout(fitCanvases, ms); };
  document.addEventListener('lab:zoom', () => refitSoon(120));
  window.addEventListener('resize', () => refitSoon(160));

  // the outline that says LOOK HERE — restarted rather than added, so a
  // second ping while the first is running plays again instead of doing
  // nothing. jumpTo flies to a feature; undo only points at one.
  function ping(el) {
    el.classList.remove('ping'); void el.offsetWidth; el.classList.add('ping');
    setTimeout(() => el.classList.remove('ping'), 950);
  }

  function jumpTo(el) {
    if (el.hidden) return;
    if (window.Frames && Frames.warm) Frames.warm(el);   // drawn before the camera lands
    lift(el);
    focusOn(el);
    ping(el);
  }

  // ── edge pan: drag a gizmo to the rim and the camera comes along ────────
  let edgeRaf = 0, edgeV = null, edgeCb = null;
  function edgeStop() { edgeV = null; edgeCb = null; if (edgeRaf) cancelAnimationFrame(edgeRaf); edgeRaf = 0; }
  function edgeTick() {
    edgeRaf = 0;
    if (!edgeV) return;
    panBy(edgeV.x, edgeV.y);
    if (edgeCb) edgeCb();
    edgeRaf = requestAnimationFrame(edgeTick);
  }
  function edgeWatch(cx, cy, cb) {
    const b = box(), M = 60, S = 13;
    let vx = 0, vy = 0;
    if (cx < b.left + M) vx = (b.left + M - cx) / M * S;
    else if (cx > b.right - M) vx = -(cx - (b.right - M)) / M * S;
    if (cy < b.top + M) vy = (b.top + M - cy) / M * S;
    else if (cy > b.bottom - M) vy = -(cy - (b.bottom - M)) / M * S;
    if (!vx && !vy) { edgeStop(); return; }
    edgeV = { x: vx, y: vy }; edgeCb = cb;
    if (!edgeRaf) edgeRaf = requestAnimationFrame(edgeTick);
  }

  /* A gizmo is dragged by its handle bar. Some have no handle bar: the sticker
     press machines are not panels, they are objects lying on the bench, and an
     object is picked up by ITSELF. So a gizmo with no [data-handle] inside it
     IS its own handle — the whole machine takes the drag, and the exclusions
     below (a control, or anything wearing data-nodrag) are what keep its
     knobs, lists and scrollers working. */
  /* What a drag must not start on. The first four are every control the lab
     uses; data-nodrag is the opt-out for everything else that owns its own
     pointer — a scrollable list, a canvas with its own drag, a note you want
     to select the text of. It guards the double-click home as well, or a
     double-click meant to flatten a warp slider would fling the machine back
     to where it started. */
  const NODRAG = 'button,a,input,select,textarea,[data-nodrag]';

  let regN = 0;                          // registration order = markup order, the pile's tiebreak
  function register(el) {
    const handle = el.querySelector('[data-handle]') || el;
    el.classList.toggle('gz-loose', handle === el);
    const record = { el, handle, z: zOf(el), n: regN++, rank: 0 };   // ranked by restack(), not here
    gizmos.push(record);
    recs.set(el, record);
    if (sizeRO) sizeRO.observe(el);

    const s = saved(el);
    if (s) place(el, s.x, s.y, false); else goHome(el, false);

    /* THE CREW is whatever this press is carrying — this one feature, or
       every feature in the pick if this one is in it. One press moves the
       lot, each by its OWN offset from the pointer, so the shape of the pick
       is kept: they travel together rather than piling up under the cursor. */
    let dragging = false, crew = [], cx = 0, cy = 0;

    const follow = () => {
      const p = toWorld(cx, cy);
      crew.forEach(g => carry(g, p.x - g.dx, p.y - g.dy));
    };

    el.addEventListener('pointerdown', () => { lift(el); });

    handle.addEventListener('pointerdown', e => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      if (hand || tool === 'hand') return;            // the hand tool pans instead
      if (e.target.closest(NODRAG)) return;

      /* SHIFT IS A PICK AND NOT A DRAG. It puts this feature into the pick or
         takes it back out and lets go — nothing moves, and frames.js drops
         the click that would otherwise have woken the feature up (see its
         own shiftKey line, in the click-to-wake handler). */
      if (e.shiftKey) { pick(el, !picked.has(el)); e.preventDefault(); return; }

      /* A PRESS ON SOMETHING THAT IS NOT IN THE PICK PUTS THE PICK DOWN AND
         TAKES THIS ONE UP: one press, one thing, unless you said otherwise.

         IT USED TO PUT THE PICK DOWN AND TAKE NOTHING UP, and that one word
         missing was three bugs. Pressing a feature is how a person says THIS
         ONE — but the only things that ever ended up selected were what a
         band swept or what shift added, so a press said it and the bench
         heard nothing. What that cost:

           · ctrl+c after clicking a tree copied NOTHING. copy() reads the
             pick, or failing that whatever is AWAKE — and a kit part never
             wakes: there is no document in it to click into. So a tree, a
             gnome, a village piece could not be copied by pressing it at
             all; you had to draw a band round one thing.
           · WORSE, copy() left the clipboard alone when it found nothing,
             so the next ctrl+v pasted whatever was copied BEFORE — click a
             tree, copy, paste, and last go's group of twenty landed on the
             paper instead. (copy() has its own half of that fix.)
           · And after a paste, when everything just made is picked, one
             press on anything that was not in it — a neighbour's box, the
             paper between them — emptied the pick with nothing to show for
             it, so the next drag carried one thing and the group appeared
             to have come apart.

         Selecting what you pressed answers all three, and it is what the
         crop marks were always for: a press now leaves the mark on the one
         thing it was aimed at, rather than leaving the bench looking
         unselected and behaving as though something still is.

         NOT WHILE A DRAWING TOOL IS UP. Then the press is the pen's and not
         the pointer's, and it has no opinion about what is selected — it
         still puts the pick down, exactly as it always did, and takes
         nothing up. Otherwise a stroke that crossed a feature would leave
         crop marks round it. (2026-09-04) */
      if (!picked.has(el)) { clearPick(); if (!drawTool()) pick(el, true); }

      const p = toWorld(e.clientX, e.clientY);
      crew = (picked.has(el) ? [...picked] : [el]).map(g => {
        lift(g, true);                                 // the crew rides over the pile together
        g.classList.add('dragging');
        const x = parseFloat(g.style.left || 0), y = parseFloat(g.style.top || 0);
        return { el: g, dx: p.x - x, dy: p.y - y, x0: x, y0: y, x, y };
      });
      cx = e.clientX; cy = e.clientY;
      dragging = true;
      try { handle.setPointerCapture(e.pointerId); } catch (err) {}
      e.preventDefault();
    });

    handle.addEventListener('pointermove', e => {
      if (!dragging) return;
      cx = e.clientX; cy = e.clientY;
      follow();
      edgeWatch(cx, cy, follow);
    });

    const end = e => {
      if (!dragging) return;
      dragging = false;
      edgeStop();
      try { handle.releasePointerCapture(e.pointerId); } catch (err) {}
      crew.forEach(g => {
        g.el.classList.remove('dragging');
        undrive(g.el);                               // the carry comes off…
        place(g.el, g.x, g.y, true);                 // …and the drop is written down
      });
      /* only if the hand actually took it somewhere. Every click that wakes a
         feature comes through here as a drag of nothing at all — press,
         release, same pixel — and an undo stack full of those is an undo
         button you have to press eleven times to see anything happen. */
      if (crew.some(g => g.x !== g.x0 || g.y !== g.y0)) {
        const was = pile();
        toTop(crew.map(g => g.el));                    // what you moved is what is on top
        moved(crew.map(g => ({ el: g.el, x: g.x0, y: g.y0 })), was);
      }
      crew = [];
    };
    handle.addEventListener('pointerup', end);
    handle.addEventListener('pointercancel', end);
  }

  /* Back to the file: home positions, the file's pile (data-home-z, or
     markup order), and anything the menu took off that the file has not
     yet been told about is put back — the file still has it on the paper.
     One the file already says is gone stays gone: reset goes to the
     default look, not to first principles. All of it is one undo entry. */
  function resetAll() {
    clearPick();
    const crew = gizmos.map(g => ({ el: g.el, x: parseFloat(g.el.style.left || 0), y: parseFloat(g.el.style.top || 0) }));
    const was = pile();
    const back = stash.filter(r => !r.file);
    remember(() => {
      crew.forEach(b => { place(b.el, b.x, b.y, true); ping(b.el); });
      back.forEach(r => { if (rec(r.el)) hide(r.el); });
      unpile(was);
    });
    gizmos.forEach(g => goHome(g.el, true));
    back.forEach(unhide);
    gizmos.forEach(g => { try { localStorage.removeItem(ZKEY + g.el.dataset.gizmo); } catch (e) {} g.z = zOf(g.el); });
    restack(false);
    camTo(1, 0, 0, 300);
  }

  // re-clamp everything when the window changes shape
  let rt;
  window.addEventListener('resize', () => {
    unbox();
    clearTimeout(rt);
    rt = setTimeout(() => {
      layout();
      gizmos.forEach(g => {
        const s = saved(g.el);
        if (s) place(g.el, s.x, s.y, false); else goHome(g.el, false);
      });
      forget(); clampCam(); applyCam();
    }, 80);
  });

  // the bench can be sized late (a hidden tab, a pane that opens after load) —
  // watch it rather than trusting one measurement at startup
  if (window.ResizeObserver) {
    let ror = 0;
    new ResizeObserver(() => {
      cancelAnimationFrame(ror);
      ror = requestAnimationFrame(() => { layout(); forget(); clampCam(); applyCam(); });
    }).observe(bench);
  }

  layout();
  // last session's copies, back on the paper before the sweep below — see
  // AND THEY LAST, under COPY, AND PASTE
  copies = store('copies', () => ({ list: [] }));
  copies.get().list.forEach(e => { const el = makeGz(e); if (el) world.appendChild(el); });
  // …and last session's deletions come OFF, before frames.js can adopt them
  // — see TAKEN OFF THE PAPER
  gone = store('gone', () => ({ list: [] }));
  document.querySelectorAll('#bench [data-gizmo]').forEach(el => { if (isGone(el)) shelve(el); else register(el); });
  restack(false);                        // the pile: saved ranks, then markup order
  layout();
  /* ── WHERE IT OPENS ─────────────────────────────────────────────────────
     On a bench nobody has visited yet, at the top-left of the field, which is
     the Spawn-O-Matic. That is the biggest machine on the sheet and it is not
     what the place is FOR — you arrived at a workshop and got handed a lathe.

     So a first visit is framed on the LOCKUP instead: the mark, the scroll
     beside it, the three cards down the left, the builder with the speech
     bubble over him, the rule book and the librarian reading at the foot of
     it, and the banner under the lot — the coming-soon page, laid out on
     paper. The machines are a screen down and to the right, exactly where
     they were. Since 2026-09-04 the frame is wider than the lockup's ink:
     the wood either side of the sign is in it, because that is what the
     place looks like from where the mark is read, and the frame lands at
     80% on a wide screen rather than 45%, so the first thing a visitor sees
     is the mark and not a map of it.

     IT STOPS AT THE BANNER. The mailbox stands 100 below that and is left
     OUT of the rectangle on purpose: it is the ask, the banner is the line
     the ask is earned by, and framing both would shrink everything above to
     make room for the thing you are meant to arrive at last. So it sits a
     nudge under the fold, and coming down to it is the gesture.

     THE RECTANGLE IS WRITTEN DOWN AND NOT MEASURED, because at this point in
     the boot there is nothing to measure: the features are iframes that have
     not loaded, let alone been cut to their drawings, so contentBox() would
     report the placeholder boxes and frame the wrong thing. These four
     numbers are the lockup’s own ink, and index.html is where each of the
     seven positions that add up to them is argued for. Move one of those and
     this is the other place to look.

     It is only ever used ONCE. The moment the camera is touched it is saved,
     and every visit after this one restores what was saved instead — which is
     why this sits behind `!restored` and not in fit(). ‘reset layout’ sends
     the features home; it does not send the camera here. */
  if (!restored) {
    /* THE RECTANGLE, SINCE 2026-09-04: wider and shorter than the lockup's
       ink alone — the sign with the forest standing either side of it, the
       scroll, the wordmark, the builder and the rule book, the cards' column
       just in on the left and the banner just under the fold. On a 2560×1111
       screen it lands at 80%, which is the view it was drawn from; on a
       laptop it is the same picture, smaller. */
    const WIDE = { x: 568, y: -2190, w: 3200, h: 1390 };
    /* …AND A SECOND RECTANGLE, FOR A SCREEN THAT IS 390 WIDE. The rectangle
       above is 3200 across, and on a phone the width is what binds: it landed
       the mark at 11%, which is a MAP of the place rather than the place —
       a thumbnail of a badge over half a screen of empty paper, with the
       wordmark too small to read. The height was never the problem; a phone
       has plenty of it and the wide rectangle used less than a quarter.

       So a narrow screen gets a narrow rectangle: THE MARK'S OWN WIDTH, 1250
       across the sign and the scroll, on the same vertical anchoring as the
       wide one — same y, same height, so what a phone frames is the same band
       of the lockup with the groves left off the sides. The height going
       slack is the point: at 27% a 390-wide screen still shows the cards, the
       builder and the banner above and below, because the aspect hands them
       over for free. It lands at 27% on a 390×729 bench against the wide
       rectangle's 11%, and the wordmark reads.

       THE SWITCH IS THE BENCH'S WIDTH and not a media query, because it is
       the bench that is being framed and the header can be a paragraph tall
       at home. 700 is the same line lab.css stands the zoom dock up at. This
       is a BOOT-TIME choice and nothing re-frames on resize (the resize
       handler below only re-clamps), so turning a phone sideways moves
       nothing — it is the same camera, in a wider window. */
    const NARROW = { x: 1390, y: -2190, w: 1250, h: 1390 };
    const b = box(), phone = b.width < 700;
    const HOME = phone ? NARROW : WIDE, pad = phone ? 16 : 24;
    Z = clamp(Math.min((b.width - pad * 2) / HOME.w, (b.height - pad * 2) / HOME.h), ZMIN, 1);
    PX = Math.round((b.width - HOME.w * Z) / 2 - HOME.x * Z);
    PY = Math.round((b.height - HOME.h * Z) / 2 - HOME.y * Z);
    lastZ = Z;
  }
  clampCam(); applyCam(); paintZoom(); paintGrid();
  const reset = document.getElementById('lab-reset');
  if (reset) reset.addEventListener('click', resetAll);

  // ══ moving about: figma's controls ═══════════════════════════════════════
  const zin = document.getElementById('zoom-in'), zout = document.getElementById('zoom-out'),
        zval = document.getElementById('zoom-val'), zfit = document.getElementById('zoom-fit');
  if (zin) zin.addEventListener('click', () => setZoom(Z * 1.2));
  if (zout) zout.addEventListener('click', () => setZoom(Z / 1.2));
  if (zval) zval.addEventListener('click', () => setZoom(1));
  if (zfit) zfit.addEventListener('click', () => fit());

  // the keymap card in the corner
  const keysBtn = document.getElementById('zoom-keys'), keymap = document.getElementById('keymap');
  function showKeys(on) {
    if (!keymap) return;
    keymap.hidden = !on;
    if (keysBtn) keysBtn.setAttribute('aria-expanded', String(!!on));
  }
  if (keysBtn) keysBtn.addEventListener('click', e => { e.stopPropagation(); showKeys(keymap.hidden); });
  if (keymap) keymap.addEventListener('click', e => e.stopPropagation());
  document.addEventListener('click', () => showKeys(false));

  const isField = t => !!(t && t.closest && t.closest('input,textarea,select,[contenteditable=""],[contenteditable="true"]'));
  /* anything loose on the paper that can be picked up has to be listed here,
     or dragging it pans the camera underneath it instead. A prop cannot opt
     out from its own side: this handler is on the CAPTURE phase, so it has
     already armed the pan before the prop's own pointerdown is called, and
     livePan then stopPropagation()s the moves on the way down — which is
     both why the camera slid and why the prop stood still. .tape was the
     one that got left off. */
  const onPaper = t => !!(t && t.closest && !t.closest('.gz,.tape,.critter,.el-mayor,.gnome-say,.zt-pin,.wall-ink'));
  // a finger has no middle button and no space bar, so it gets more of the
  // bench to drag: anything that isn't a control, a handle or a list.
  const HANDS_OFF = 'input,textarea,select,button,a,canvas,label,[role="button"],[tabindex],[contenteditable],'
    + '[data-handle],.tape,.critter,.el-mayor,.gnome-say,.zt-pin,.wall-ink,.gauge,.size-set';
  const fingerPan = t => !!(t && t.closest && !t.closest(HANDS_OFF) && !scrollable(t, 0, 1) && !scrollable(t, 0, -1));

  let hand = false, tool = 'move', pan = null;

  const paintTool = () => document.body.classList.toggle('lab-hand', hand || tool === 'hand');
  function setHand(on) { if (hand !== on) { hand = on; paintTool(); } }
  function setTool(t) { if (tool !== t) { tool = t; paintTool(); } }

  // ── the wheel: scroll pans, shift goes sideways, ctrl/⌘ zooms ───────────
  // a list inside a gizmo still gets the wheel while it has somewhere to go.
  function scrollable(el, dx, dy) {
    while (el && el.nodeType === 1 && el !== bench) {
      const oy = el.scrollHeight - el.clientHeight > 1, ox = el.scrollWidth - el.clientWidth > 1;
      if (oy || ox) {
        const s = getComputedStyle(el);
        if (oy && /auto|scroll|overlay/.test(s.overflowY) &&
            ((dy < 0 && el.scrollTop > 1) || (dy > 0 && el.scrollTop < el.scrollHeight - el.clientHeight - 1))) return true;
        if (ox && /auto|scroll|overlay/.test(s.overflowX) &&
            ((dx < 0 && el.scrollLeft > 1) || (dx > 0 && el.scrollLeft < el.scrollWidth - el.clientWidth - 1))) return true;
      }
      el = el.parentElement;
    }
    return false;
  }

  bench.addEventListener('wheel', e => {
    const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? box().height : 1;
    let dx = e.deltaX * unit, dy = e.deltaY * unit;
    if (e.ctrlKey || e.metaKey) {                       // pinch, or ctrl/⌘ + wheel
      e.preventDefault(); stopTween();
      setZoom(Z * Math.exp(-dy * 0.0022), e.clientX, e.clientY);
      return;
    }
    if (e.shiftKey && !dx) { dx = dy; dy = 0; }         // shift — sideways
    if (scrollable(e.target, dx, dy)) return;           // a list inside a gizmo wants it
    e.preventDefault(); stopTween();
    panBy(-dx, -dy);
  }, { passive: false });

  /* ── AND NOWHERE IN LAB 2 DOES CTRL-WHEEL ZOOM THE PAGE ──────────────────
     The handler above is on the bench, which is most of the window but not
     all of it: over the header, the tool dock or the zoom dock a ctrl-wheel
     used to reach the browser, and the browser zooms the PAGE. That is a
     different scale entirely, sitting under this one and multiplying it —
     the readout says 42% while the sheet is drawn at 42% of 150%, the keys
     and the corner and `fit` all still speak the first number, and the two
     never line up again until the page is put back by hand.

     So the page's own zoom is taken off the table. This is the same gesture
     handled one level out, for the parts of the window the bench is not
     under, and it defers to the bench's handler rather than doubling it: a
     ctrl-wheel that reached the bench was already stopped there, and a
     stopped event is one this has no business acting on twice.

     The third way in — a ctrl-wheel over a live feature, which lands in the
     frame's document and never bubbles out here at all — is plugged on the
     other side of the glass, in frames.js. */
  document.addEventListener('wheel', e => {
    if (!(e.ctrlKey || e.metaKey) || e.defaultPrevented) return;
    e.preventDefault(); stopTween();
    setZoom(Z * Math.exp(-e.deltaY * (e.deltaMode === 1 ? 16 : 1) * 0.0022), e.clientX, e.clientY);
  }, { passive: false });

  // ── dragging the canvas ─────────────────────────────────────────────────
  function startPan(e, now) {
    pan = { id: e.pointerId, x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY, live: false };
    if (now) livePan(e);
  }
  function livePan(e) {
    pan.live = true;
    stopTween();
    document.body.classList.add('lab-panning');
    try { bench.setPointerCapture(pan.id); } catch (err) {}
    e.preventDefault();
    e.stopPropagation();
  }
  function endPan() {
    if (!pan) return;
    if (pan.live) { try { bench.releasePointerCapture(pan.id); } catch (err) {} }
    pan = null;
    document.body.classList.remove('lab-panning');
  }

  /* ── DRAGGING THE BARE PAPER: THE BAND ───────────────────────────────────
     What a drag on empty paper does instead of panning. Press, pull a
     rectangle out, and every feature it touches is picked; drag any one of
     them afterwards and the whole pick goes.

     IT IS ANCHORED IN THE WORLD AND DRAWN ON THE SCREEN, which is two
     coordinate systems on purpose. The corner you started at is a point on
     the SHEET — so if the camera moves under you, which it does the moment
     you pull past the edge of the bench and the edge-scroll takes over, the
     band stays nailed to the paper where you put it and goes on growing. The
     rectangle painted is in screen pixels, a sibling of #bench-world rather
     than a child of it, so its dashes are one weight at every zoom. A band
     drawn on the sheet would be a hairline at 20% and a rope at 300%.

     IT WAITS FOR A REAL DRAG. Four screen pixels of travel, the same
     threshold the pan uses, and for the same reason: below it the gesture was
     a CLICK on the paper, which is how you put a pick down. So the two
     meanings of a press out here — gather up, and let go — are told apart by
     nothing more than whether the hand moved.

     TOUCH IS NOT IN THIS. A finger still pans, anywhere it lands, because a
     finger has no space bar and no middle button and taking its one way of
     moving the sheet away to hand it a marquee would be a poor trade. So the
     band is a mouse gesture, and fingerPan below is untouched. */
  const drawTool = () => !!(window.Wall && Wall.tool && Wall.tool !== 'move');
  const bandEl = document.createElement('div');
  bandEl.className = 'lab-band';
  bandEl.hidden = true;
  bench.appendChild(bandEl);
  let sweep = null;

  function startSweep(e) {
    const w = toWorld(e.clientX, e.clientY);
    sweep = { id: e.pointerId, wx: w.x, wy: w.y, x0: e.clientX, y0: e.clientY,
              cx: e.clientX, cy: e.clientY, live: false, add: e.shiftKey };
  }
  function liveSweep(e) {
    sweep.live = true;
    stopTween();
    if (!sweep.add) clearPick();
    bandEl.hidden = false;
    document.body.classList.add('lab-banding');
    try { bench.setPointerCapture(sweep.id); } catch (err) {}
    e.preventDefault();
    e.stopPropagation();
  }
  function drawSweep() {
    const a = toScreen(sweep.wx, sweep.wy);
    // the band is fixed to the viewport (lab.css), so these are screen numbers
    bandEl.style.left = Math.min(a.x, sweep.cx) + 'px';
    bandEl.style.top = Math.min(a.y, sweep.cy) + 'px';
    bandEl.style.width = Math.abs(sweep.cx - a.x) + 'px';
    bandEl.style.height = Math.abs(sweep.cy - a.y) + 'px';
  }
  /* TOUCHED, not enclosed. Figma asks for a feature to be inside the band;
     this bench asks only that the two rectangles meet. Half of what is up
     here is bigger than a screenful at the zoom you would want to gather it
     at, and a rule that will not pick a thing up until you can see all of it
     is a rule that cannot pick up the machines at all. */
  function endSweep(e) {
    if (!sweep) return;
    const was = sweep;
    sweep = null;
    edgeStop();
    bandEl.hidden = true;
    document.body.classList.remove('lab-banding');
    if (!was.live) { if (!was.add) clearPick(); return; }   // a press that never travelled
    try { bench.releasePointerCapture(was.id); } catch (err) {}
    const far = toWorld(was.cx, was.cy);
    const x1 = Math.min(was.wx, far.x), x2 = Math.max(was.wx, far.x),
          y1 = Math.min(was.wy, far.y), y2 = Math.max(was.wy, far.y);
    gizmos.forEach(g => {
      const el = g.el;
      if (out(el)) return;
      const q = geoOf(el);
      if (q.x < x2 && q.x + q.w > x1 && q.y < y2 && q.y + q.h > y1) pick(el, true);
    });
  }

  bench.addEventListener('pointerdown', e => {
    if (pan || sweep) return;
    if (e.pointerType === 'mouse') {
      if (e.button === 1) { startPan(e, true); return; }              // the scroll wheel, held down
      if (e.button !== 0) return;
      if (hand || tool === 'hand') { startPan(e, true); return; }     // space, or the hand tool
      // bare paper: the band, unless a drawing tool is up — then the paper
      // belongs to the pen and the dock has said so with a crosshair.
      if (onPaper(e.target) && !drawTool()) startSweep(e);
      return;
    }
    if (fingerPan(e.target)) startPan(e, false);                      // a finger, anywhere it isn't needed
  }, true);

  bench.addEventListener('pointermove', e => {
    if (!sweep || e.pointerId !== sweep.id) return;
    if (!sweep.live) {
      if (Math.abs(e.clientX - sweep.x0) + Math.abs(e.clientY - sweep.y0) < 4) return;  // still a click
      liveSweep(e);
    }
    sweep.cx = e.clientX; sweep.cy = e.clientY;
    drawSweep();
    edgeWatch(e.clientX, e.clientY, drawSweep);   // pull past the edge and the sheet comes to you
    e.preventDefault();
  }, true);

  bench.addEventListener('pointerup', e => { if (sweep && e.pointerId === sweep.id) endSweep(e); }, true);
  bench.addEventListener('pointercancel', e => { if (sweep && e.pointerId === sweep.id) endSweep(e); }, true);

  bench.addEventListener('pointermove', e => {
    if (!pan || e.pointerId !== pan.id) return;
    if (!pan.live) {
      if (Math.abs(e.clientX - pan.x0) + Math.abs(e.clientY - pan.y0) < 4) return;   // still a click
      livePan(e);
    }
    panBy(e.clientX - pan.x, e.clientY - pan.y);
    pan.x = e.clientX; pan.y = e.clientY;
    e.preventDefault();
  }, true);

  bench.addEventListener('pointerup', e => { if (pan && e.pointerId === pan.id) endPan(); }, true);
  bench.addEventListener('pointercancel', e => { if (pan && e.pointerId === pan.id) endPan(); }, true);
  window.addEventListener('blur', () => { endPan(); endSweep(); edgeStop(); setHand(false); });

  // windows and linux want a middle click to start an autoscroll or a paste — no
  bench.addEventListener('mousedown', e => { if (e.button === 1) e.preventDefault(); }, true);
  bench.addEventListener('auxclick', e => { if (e.button === 1) { e.preventDefault(); e.stopPropagation(); } }, true);
  /* ── THE MENU ────────────────────────────────────────────────────────────
     Right-click a feature: raise, lower, delete, and a line saying where in
     the pile it is. Built here rather than in index.html the way the grid
     and the band are — furniture, not paper. It is a menu and not a mode:
     raise and lower leave it open, because one step is rarely the answer
     and a menu that closes on every press is a menu you open five times;
     delete closes it, since there is nothing left to point at. A press
     anywhere else, esc, any other key or the wheel puts it away.

     frames.js forwards the right-click from INSIDE a live feature (see its
     wireInside) — a document in a frame keeps its own events, so without
     that a feature you had woken would answer with the browser's menu. */
  const menu = document.createElement('div');
  menu.id = 'lab-menu';
  menu.className = 'lab-menu';
  menu.hidden = true;
  menu.innerHTML =
    '<b class="lab-menu-name"></b>' +
    '<button type="button" data-act="raise"><i>▲</i>raise<small>over the next thing it touches</small></button>' +
    '<button type="button" data-act="lower"><i>▼</i>lower<small>under the next thing it touches</small></button>' +
    '<button type="button" data-act="remove" class="lab-menu-x"><i>✕</i>delete<small>off the paper — ctrl z puts it back</small></button>' +
    '<span class="lab-menu-where"></span>';
  document.body.appendChild(menu);

  function sayWhere() {
    const w = menu.querySelector('.lab-menu-where');
    if (!menuOn || !rec(menuOn)) { w.textContent = ''; return; }
    const crew = picked.has(menuOn) && picked.size > 1 ? picked.size + ' picked · ' : '';
    w.textContent = crew + 'layer ' + (rankOf(menuOn) + 1) + ' of ' + gizmos.length;
  }

  function menuAt(el, x, y) {
    closeMenu();
    if (!rec(el)) return;
    menuOn = el;
    el.classList.add('menued');
    menu.querySelector('.lab-menu-name').textContent = el.getAttribute('aria-label') || el.dataset.gizmo;
    menu.hidden = false;
    // on screen, whole: down-right of the pointer unless that runs off the edge
    const w = menu.offsetWidth, h = menu.offsetHeight;
    const vw = document.documentElement.clientWidth, vh = document.documentElement.clientHeight;
    menu.style.left = Math.max(4, Math.min(x + 2, vw - w - 4)) + 'px';
    menu.style.top = Math.max(4, Math.min(y + 2, vh - h - 4)) + 'px';
    sayWhere();
  }

  function closeMenu() {
    if (!menuOn) return;
    menuOn.classList.remove('menued');
    menuOn = null;
    menu.hidden = true;
  }

  menu.addEventListener('click', e => {
    const b = e.target.closest('[data-act]');
    if (!b || !menuOn) return;
    const el = menuOn;
    if (b.dataset.act === 'raise') { raise(el); sayWhere(); }
    else if (b.dataset.act === 'lower') { lower(el); sayWhere(); }
    else if (b.dataset.act === 'remove') { closeMenu(); remove(el); }
  });
  menu.addEventListener('contextmenu', e => e.preventDefault());

  bench.addEventListener('contextmenu', e => {
    if (pan && pan.live) { e.preventDefault(); return; }
    if (isField(e.target)) return;              // a field keeps its own menu: paste belongs to it
    const el = e.target.closest('.gz');
    if (!el || !rec(el)) return;
    e.preventDefault();
    menuAt(el, e.clientX, e.clientY);
  });
  document.addEventListener('pointerdown', e => { if (menuOn && !e.target.closest('#lab-menu')) closeMenu(); }, true);
  bench.addEventListener('wheel', () => closeMenu(), { passive: true });
  window.addEventListener('blur', closeMenu);

  // ── the keyboard ────────────────────────────────────────────────────────
  document.addEventListener('keydown', e => {
    const t = e.target;
    if (isField(t)) return;

    // the menu is up: esc puts it away and is spent; any other key puts it
    // away and goes on to mean what it means
    if (menuOn) { closeMenu(); if (e.key === 'Escape') { e.preventDefault(); return; } }

    // space held — the hand tool, so long as nothing else wants the key
    if (e.code === 'Space' || e.key === ' ') {
      if (t && t.closest && t.closest('button,a,[role="button"],[tabindex]')) return;
      if (!e.repeat) setHand(true);
      e.preventDefault();
      return;
    }
    /* the browser's page-zoom keys, taken for the canvas — same argument as
       the wheel guard further up, and the same three steps the dock's + and −
       take. Everything else with a modifier on it is the browser's. */
    if ((e.ctrlKey || e.metaKey) && !e.altKey) {
      if (e.key === '+' || e.key === '=') { setZoom(Z * 1.2); e.preventDefault(); }
      else if (e.key === '-' || e.key === '_') { setZoom(Z / 1.2); e.preventDefault(); }
      else if (e.key === '0') { setZoom(1); e.preventDefault(); }
      // ctrl+z is the dock's undo button under the other hand. Shift is left
      // alone: there is no redo on this bench, and swallowing ctrl+shift+z to
      // do a second undo is worse than letting the browser have it.
      else if (e.key.toLowerCase() === 'z' && !e.shiftKey) { undo(); e.preventDefault(); }
      // …and only swallowed when they DID something: with nothing picked and
      // nothing awake, ctrl+c is still the browser's, and copying the words
      // out of a feature goes on working
      else if (e.key.toLowerCase() === 'c') { if (copy()) e.preventDefault(); }
      else if (e.key.toLowerCase() === 'v') { if (paste()) e.preventDefault(); }
      return;
    }
    if (e.ctrlKey || e.metaKey || e.altKey) return;

    if (e.shiftKey) {                                  // figma's framing keys
      if (e.key === '!' || e.key === '1') { fit(); e.preventDefault(); }
      else if (e.key === ')' || e.key === '0') { setZoom(1); e.preventDefault(); }
      return;
    }

    const k = e.key.toLowerCase();
    if (k === 'h') setTool('hand');
    else if (k === 'v' || e.key === 'Escape') setTool('move');
    // esc is already the bench's 'let go of everything' key — it puts a live
    // feature back to sleep in frames.js and the pen down in wall.js — so it
    // puts the pick down here too, and the three do not tread on each other.
    if (e.key === 'Escape') clearPick();
    else if (e.key === '+' || e.key === '=') setZoom(Z * 1.2);
    else if (e.key === '-' || e.key === '_') setZoom(Z / 1.2);
    else if (e.key === '0' && !(t && t.closest && t.closest('.gauge'))) setZoom(1);
    // Home and End would also scroll the bench natively now — this one is ours
    else if (e.key === 'Home') { fit(); e.preventDefault(); }
    else if (e.key === 'End') e.preventDefault();
  });

  document.addEventListener('keyup', e => {
    if (e.code === 'Space' || e.key === ' ') { setHand(false); if (pan && pan.live) endPan(); }
  });

  const resetDataBtn = document.getElementById('lab-reset-data');
  if (resetDataBtn) resetDataBtn.addEventListener('click', () => { if (confirm('Wipe everything lab 2 has saved on this device — the drawings, the tape, the lot?')) resetData(); });

  return { register, place, resetAll, gizmos, store, uid, resetData, world, bench, grid, growBench,
    hidpi, toWorld, toScreen, setZoom, panBy, camTo, fit, focusOn, jumpTo, moving,
    stamp, remember, undoTop, undoMove, undo, copy, paste, deleteCopy, isCopy,
    raise, lower, remove, rankOf, menuAt, closeMenu,
    /* what the menu has taken off the paper — keep.js reports it, so the
       file hears about a delete the same way it hears about a move */
    get gone() { return stash.slice(); },
    /* A GETTER AND NOT A PROPERTY: `copies` is opened halfway down the boot,
       further down this file than this line runs, so a plain property here
       would hand out the null it is declared as and never notice. keep.js is
       who wants it — a copy it has written into index.html has to come OUT
       of this list, or the next load builds it twice. */
    get copies() { return copies; },
    get zoom() { return Z; }, get pan() { return { x: PX, y: PY }; } };
})();
