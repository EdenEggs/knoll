/* ─── THE LITTLE NOTE ──────────────────────────────────────────────────────
   A speech-bubble popup that hangs off a point on the bench and stays the
   same size whatever the camera is zoomed to. Gizmos use it when the thing
   you clicked is painted into a canvas and so cannot hold a panel of its own
   — a bug in the farm, a trinket in the case.

     Note.open({
       at: () => ({ x, y }),   // CLIENT coords of the thing, re-read as the
                               // camera moves; return null to close
       html: '…',              // the contents
       cls: 'bf-note',         // extra class for the gizmo's own styling
       on: { '[data-act=me]': fn },   // delegated clicks inside the note
       onShut: fn
     })

   One note open at a time. Escape, a click outside, or opening another one
   closes it. The anchor is a function on purpose: whatever it points at is
   usually moving. */

window.Note = (function () {
  let el = null, spec = null, raf = 0;

  function build() {
    el = document.createElement('div');
    el.className = 'note';
    el.hidden = true;
    document.body.appendChild(el);
    el.addEventListener('click', e => {
      e.stopPropagation();
      if (e.target.closest('.note-x')) return shut();
      if (!spec || !spec.on) return;
      for (const sel in spec.on) {
        const hit = e.target.closest(sel);
        if (hit) { spec.on[sel](hit, e); return; }
      }
    });
    el.addEventListener('pointerdown', e => e.stopPropagation());
  }

  function place() {
    if (!el || el.hidden || !spec) return;
    const p = spec.at && spec.at();
    if (!p) return shut();
    const w = el.offsetWidth, h = el.offsetHeight, gap = 14;
    if (p.x < -60 || p.y < -60 || p.x > innerWidth + 60 || p.y > innerHeight + 60) return shut();
    let x = p.x - w / 2, y = p.y - h - gap, below = false;
    if (y < 8) { y = p.y + gap; below = true; }
    x = Math.max(8, Math.min(x, innerWidth - w - 8));
    y = Math.max(8, Math.min(y, innerHeight - h - 8));
    el.style.left = Math.round(x) + 'px';
    el.style.top = Math.round(y) + 'px';
    el.classList.toggle('below', below);
    // the tail points back at whatever this is about
    const tail = Math.max(14, Math.min(p.x - x, w - 14));
    el.style.setProperty('--tail', Math.round(tail) + 'px');
  }

  function tick() { raf = 0; if (el && !el.hidden) { place(); raf = requestAnimationFrame(tick); } }

  function open(s) {
    if (!el) build();
    if (spec && spec.onShut && spec !== s) { const f = spec.onShut; spec = null; f(); }
    spec = s;
    el.className = 'note' + (s.cls ? ' ' + s.cls : '');
    el.innerHTML = '<button type="button" class="note-x" aria-label="never mind">×</button>' + s.html;
    el.hidden = false;
    place();
    if (!raf) raf = requestAnimationFrame(tick);
    return el;
  }

  function shut() {
    if (!el || el.hidden) return;
    el.hidden = true;
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    const f = spec && spec.onShut;
    spec = null;
    if (f) f();
  }

  // refresh the contents without moving or re-opening — for a me-too that
  // changes the numbers while the note is still up
  function fill(html) {
    if (!el || el.hidden || !spec) return;
    spec.html = html;
    el.innerHTML = '<button type="button" class="note-x" aria-label="never mind">×</button>' + html;
    place();
  }

  const isOpen = () => !!(el && !el.hidden);

  document.addEventListener('click', () => shut());
  document.addEventListener('keydown', e => { if (e.key === 'Escape') shut(); });

  return { open, shut, fill, place, isOpen };
})();
