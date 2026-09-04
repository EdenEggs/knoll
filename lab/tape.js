/* ─── THE CAUTION TAPE ─────────────────────────────────────────────────────
   A prop, not a gizmo. Strips of hazard tape you string across the bench to
   cordon off whatever is not finished — a gizmo mid-rebuild, a corner of the
   sheet you would rather nobody wandered into. It has no panel, no serial
   and no place on the shelf, because it is not a machine; it is something
   left lying on the workbench.

   IT SPANS TWO POINTS, not a width. The design's tape only stretched left
   and right, which is fine on a page and useless on a bench where the thing
   you want to cordon off is diagonally across from you. So each end is a
   handle you drag: the length AND the angle fall out of where the two ends
   are, which is what "string it across the bench" actually means. Drag the
   printed middle to move the whole strip without changing either.

   IT LIVES IN THE WORLD. The tape is pinned to the sheet, not the screen, so
   it stays over the gizmo it is cordoning off while the camera pans and
   zooms — a strip taped to the glass would slide off the thing it was about.
   All three drags read the pointer through Lab.toWorld for the same reason.

   State is Lab.store('tape'): a list of {x1,y1,x2,y2}. Add one from the
   dock's tape button; drop one by dragging it onto its own ✕. */

window.Tape = (function () {
  const world = (window.Lab && Lab.world) || document.getElementById('bench-world');
  if (!world || !window.Lab) return null;

  const SEG = 218;                     // one CAUTION ◆ before it repeats
  const MIN = 120;                     // shorter than this and it is a sticker
  const HEIGHT = 46;

  const store = Lab.store('tape', () => ({
    // one strip to start with, parked out of the way so it is discoverable
    // without being in the road
    strips: [{ id: 'tape-1', x1: 60, y1: 300, x2: 700, y2: 288 }]
  }));

  const layer = document.createElement('div');
  layer.className = 'tape-layer';
  layer.setAttribute('aria-hidden', 'false');
  world.appendChild(layer);

  const at = e => Lab.toWorld(e.clientX, e.clientY);
  const uid = () => 'tape-' + (Lab.uid ? Lab.uid() : Math.random().toString(36).slice(2));

  /* ── drawing one strip ────────────────────────────────────── */
  // where the strip sits is a function of its two ends and nothing else, so
  // one place computes it and both the builder and the drag use it
  function fit(el, s) {
    const dx = s.x2 - s.x1, dy = s.y2 - s.y1;
    const len = Math.max(MIN, Math.hypot(dx, dy));
    el.style.left = s.x1 + 'px';
    el.style.top = (s.y1 - HEIGHT / 2) + 'px';
    el.style.width = len + 'px';
    el.style.transform = 'rotate(' + (Math.atan2(dy, dx) * 180 / Math.PI) + 'deg)';
    return len;
  }

  function draw(s) {
    const el = document.createElement('div');
    el.className = 'tape';
    el.dataset.tape = s.id;
    const len = fit(el, s);
    const n = Math.min(24, Math.ceil(Math.max(MIN - 60, len - 60) / SEG) + 1);
    el.innerHTML =
      '<div class="tape-strip">' +
        '<button type="button" class="tape-end tape-end-l" data-end="1" title="pull this end" aria-label="pull this end of the tape"></button>' +
        '<div class="tape-mid" data-move title="drag to move the whole strip">' +
          new Array(n).fill('<span class="tape-seg"><b>CAUTION</b><i></i></span>').join('') +
        '</div>' +
        '<button type="button" class="tape-end tape-end-r" data-end="2" title="pull this end" aria-label="pull this end of the tape"></button>' +
      '</div>' +
      '<button type="button" class="tape-x" data-drop title="take this strip down" aria-label="take this strip down">✕</button>';
    return el;
  }

  function render() {
    layer.innerHTML = '';
    store.get().strips.forEach(s => layer.appendChild(draw(s)));
  }

  /* ── the three drags ──────────────────────────────────────── */
  /* The strip is moved by hand while you are dragging it and only written to
     the store when you let go. Writing per frame would be a localStorage trip
     and a full redraw of the layer sixty times a second — which would also
     replace the very element under your finger, mid-drag. So: move the DOM,
     then save once.

     The number of CAUTION segments is not re-cut while you pull. It is set
     from the length at the start and at the end; stretching a strip shows
     more of the same repeat, and the count catches up when you let go. That
     is one re-layout instead of hundreds, and you cannot see the difference. */
  function grab(e) {
    const el = e.target.closest('.tape');
    if (!el) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    const end = e.target.closest('[data-end]');
    const move = e.target.closest('[data-move]');
    if (!end && !move) return;

    const id = el.dataset.tape;
    const was = store.get().strips.find(v => v.id === id);
    if (!was) return;
    const s0 = { x1: was.x1, y1: was.y1, x2: was.x2, y2: was.y2 };
    const start = at(e);
    const now = { x1: s0.x1, y1: s0.y1, x2: s0.x2, y2: s0.y2 };

    const step = ev => {
      const p = at(ev), dx = p.x - start.x, dy = p.y - start.y;
      if (end) {
        // one end follows the pointer; the other stays nailed down
        if (end.dataset.end === '1') { now.x1 = s0.x1 + dx; now.y1 = s0.y1 + dy; }
        else { now.x2 = s0.x2 + dx; now.y2 = s0.y2 + dy; }
        // never let it collapse into nothing — a zero-length strip cannot be
        // grabbed again, which would be a piece of tape you can only delete
        const len = Math.hypot(now.x2 - now.x1, now.y2 - now.y1);
        if (len < MIN) {
          const a = Math.atan2(now.y2 - now.y1, now.x2 - now.x1) || 0;
          if (end.dataset.end === '1') { now.x1 = now.x2 - Math.cos(a) * MIN; now.y1 = now.y2 - Math.sin(a) * MIN; }
          else { now.x2 = now.x1 + Math.cos(a) * MIN; now.y2 = now.y1 + Math.sin(a) * MIN; }
        }
      } else {
        now.x1 = s0.x1 + dx; now.y1 = s0.y1 + dy;
        now.x2 = s0.x2 + dx; now.y2 = s0.y2 + dy;
      }
      fit(el, now);
    };
    const up = () => {
      window.removeEventListener('pointermove', step);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      layer.classList.remove('pulling');
      // now, once: this is also what re-cuts the CAUTIONs to the new length
      store.update(st => {
        const s = st.strips.find(v => v.id === id);
        if (s) Object.assign(s, now);
      });
    };
    layer.classList.add('pulling');
    window.addEventListener('pointermove', step);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    e.preventDefault();
    e.stopPropagation();                 // the bench must not pan under it
  }

  layer.addEventListener('pointerdown', grab);
  layer.addEventListener('click', e => {
    const x = e.target.closest('[data-drop]');
    if (!x) return;
    const el = e.target.closest('.tape');
    store.update(s => { s.strips = s.strips.filter(v => v.id !== el.dataset.tape); });
  });

  /* ── a new strip ─────────────────────────────────────────────────────── */
  // dropped across the middle of whatever you are looking at, so it lands
  // where you can see it however far the camera has wandered
  function add() {
    const b = Lab.bench.getBoundingClientRect();
    const a = Lab.toWorld(b.left + b.width * 0.28, b.top + b.height * 0.5);
    const c = Lab.toWorld(b.left + b.width * 0.72, b.top + b.height * 0.5);
    store.update(s => { s.strips.push({ id: uid(), x1: a.x, y1: a.y, x2: c.x, y2: c.y - 8 }); });
    return true;
  }

  store.on(render);
  render();

  return { add, render, store, get count() { return store.get().strips.length; } };
})();
