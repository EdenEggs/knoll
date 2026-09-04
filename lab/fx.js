/* ─── DRESS IT UP ──────────────────────────────────────────────────────────
   Click anything somebody made — a creature loose on the bench, a drawing on
   an easel or up on the wall, a keepsake out of the capsule — and a little
   card opens offering five ANIMATIONS and five EFFECTS. Hover one to try it
   on the real thing, click to keep it. One animation and one effect at a
   time, so they stack: a ghostly creature that bobs, a neon drawing that
   shimmers.

   Wiring a gizmo in takes one attribute. Put data-fx="<a stable key>" on the
   element that should be clickable, and make sure it has ONE child holding
   the actual picture:

     <div class="mu-art" data-fx="mu:a1b2"><img src="…"></div>

   The outer element is the STAGE and carries the animation (a transform, so
   it must not have one of its own). The first child is the SKIN and carries
   the effect (a filter). Two elements because both an animation and an
   animated effect want the `animation` property, and one element only has
   the one. Mark a different child with data-fx-skin if the first is wrong.

   Re-render as often as you like — a MutationObserver re-dresses anything
   with a data-fx it recognises. Keys under a namespace listed in VOLATILE
   (creatures, which do not survive a reload anyway) are swept at boot. */

window.FX = (function () {

  const ANIM = [
    { k: 'bob',     n: 'bob',     t: 'floats gently up and down' },
    { k: 'hop',     n: 'hop',     t: 'little springy jumps — squashes on the landing' },
    { k: 'wobble',  n: 'wobble',  t: 'rocks side to side, like it might go over' },
    { k: 'shimmer', n: 'shimmer', t: 'redrawn every few frames, never quite the same twice' },
    { k: 'spin',    n: 'spin',    t: 'turns all the way round on the spot' }
  ];

  const EFF = [
    { k: 'lantern', n: 'lantern', t: 'a warm halo that never sits quite still' },
    { k: 'ghost',   n: 'ghost',   t: 'see-through, softly blurred, slowly breathing' },
    { k: 'neon',    n: 'neon',    t: 'a sign-tube glow in pink and blue, buzz included' },
    { k: 'sticker', n: 'sticker', t: 'a white die-cut edge, lifted off the page' },
    { k: 'stone',   n: 'stone',   t: 'turned to stone, and rather pleased about it' }
  ];

  const VOLATILE = /^critter:/;      // keys that mean nothing after a reload

  // ── what is dressed in what ─────────────────────────────────────────────
  const mem = {};
  const store = window.Lab && Lab.store ? Lab.store('fx', {}) : {
    get: () => mem, update(fn) { const r = fn(mem); if (r !== undefined) Object.assign(mem, r); }
  };

  (function prune() {
    let dirty = false;
    const s = store.get();
    Object.keys(s).forEach(k => { if (VOLATILE.test(k)) { delete s[k]; dirty = true; } });
    if (dirty) store.update(v => v);
  })();

  const get = key => (key && store.get()[key]) || {};

  function set(key, patch) {
    if (!key) return;
    store.update(s => {
      const v = Object.assign({}, s[key], patch);
      if (!v.a && !v.e) delete s[key]; else s[key] = v;
    });
    // whatever is wearing this key on screen changes with it
    const now = get(key);
    document.querySelectorAll('[data-fx]').forEach(el => { if (el.dataset.fx === key) paint(el, now); });
    document.dispatchEvent(new CustomEvent('lab:fx', { detail: { key: key, fx: now } }));
  }

  // ── putting it on ───────────────────────────────────────────────────────
  const skinOf = stage => stage.querySelector('[data-fx-skin]') || stage.firstElementChild || stage;

  function paint(stage, v) {
    if (!stage) return;
    const skin = skinOf(stage);
    v = v || {};
    ANIM.forEach(o => stage.classList.toggle('fx-a-' + o.k, v.a === o.k));
    EFF.forEach(o => skin.classList.toggle('fx-e-' + o.k, v.e === o.k));
    stage.classList.toggle('fx-dressed', !!(v.a || v.e));
  }

  const apply = stage => paint(stage, get(stage.dataset.fx));

  function sweep(root) {
    (root || document).querySelectorAll('[data-fx]').forEach(apply);
  }

  // ── the card ────────────────────────────────────────────────────────────
  let card = null, stage = null, key = null, follow = 0;

  function chips(list, g) {
    return '<div class="fx-chips" data-g="' + g + '">' + list.map(o =>
      '<button type="button" class="fx-chip" data-g="' + g + '" data-k="' + o.k + '" '
      + 'title="' + o.t + '" aria-pressed="false">' + o.n + '</button>').join('') + '</div>';
  }

  function build() {
    card = document.createElement('div');
    card.className = 'fx-card';
    card.hidden = true;
    card.innerHTML =
      '<div class="fx-top"><b>DRESS IT UP</b><button type="button" class="fx-x" aria-label="never mind">×</button></div>'
      + '<div class="fx-grp"><i>ANIMATE</i>' + chips(ANIM, 'a') + '</div>'
      + '<div class="fx-grp"><i>EFFECTS</i>' + chips(EFF, 'e') + '</div>'
      + '<button type="button" class="fx-off">take it all off</button>';
    document.body.appendChild(card);

    card.addEventListener('click', e => {
      e.stopPropagation();
      const chip = e.target.closest('.fx-chip');
      if (chip) {
        const g = chip.dataset.g, was = get(key)[g];
        set(key, { [g]: was === chip.dataset.k ? '' : chip.dataset.k });
        paint(stage, get(key));
        mark();
        return;
      }
      if (e.target.closest('.fx-off')) { set(key, { a: '', e: '' }); paint(stage, {}); mark(); return; }
      if (e.target.closest('.fx-x')) shut();
    });

    // hover to try it on, without keeping it
    card.addEventListener('pointerover', e => {
      const chip = e.target.closest('.fx-chip');
      if (!chip || !stage) return;
      paint(stage, Object.assign({}, get(key), { [chip.dataset.g]: chip.dataset.k }));
    });
    card.addEventListener('pointerout', e => {
      const chip = e.target.closest('.fx-chip');
      if (!chip || !stage) return;
      if (card.contains(e.relatedTarget) && e.relatedTarget.closest('.fx-chip')) return;
      paint(stage, get(key));
    });
  }

  function mark() {
    const v = get(key);
    card.querySelectorAll('.fx-chip').forEach(c =>
      c.setAttribute('aria-pressed', String(v[c.dataset.g] === c.dataset.k)));
  }

  // the card lives in screen space, so it stays legible whatever the bench is
  // zoomed to — and it follows its creation while the camera moves under it
  function place() {
    if (!stage || !card || card.hidden) return;
    if (!stage.isConnected) {                       // a re-render swapped the node out
      const again = key && document.querySelector('[data-fx="' + (window.CSS && CSS.escape ? CSS.escape(key) : key) + '"]');
      if (!again) return shut();
      stage = again;
    }
    const r = stage.getBoundingClientRect(), w = card.offsetWidth, h = card.offsetHeight, gap = 10;
    if (r.bottom < -40 || r.top > window.innerHeight + 40 || r.right < -40 || r.left > window.innerWidth + 40) return shut();
    let x = r.left + r.width / 2 - w / 2;
    let y = r.bottom + gap;
    if (y + h > window.innerHeight - 8) y = Math.max(8, r.top - gap - h);
    card.style.left = Math.round(Math.max(8, Math.min(x, window.innerWidth - w - 8))) + 'px';
    card.style.top = Math.round(Math.max(8, y)) + 'px';
  }

  function tick() { follow = 0; if (card && !card.hidden) { place(); follow = requestAnimationFrame(tick); } }

  function open(el, k) {
    if (!el) return;
    if (!card) build();
    if (stage && stage !== el) paint(stage, get(key));      // leave the last one as it was
    stage = el; key = k || el.dataset.fx || '';
    if (!el.dataset.fx && key) el.dataset.fx = key;
    card.hidden = false;
    mark();
    place();
    if (!follow) follow = requestAnimationFrame(tick);
  }

  function shut() {
    if (!card || card.hidden) return;
    paint(stage, get(key));
    card.hidden = true;
    stage = null; key = null;
    if (follow) cancelAnimationFrame(follow);
    follow = 0;
  }

  // ── wiring ──────────────────────────────────────────────────────────────
  document.addEventListener('click', e => {
    const b = document.body.classList;
    if (b.contains('lab-panning') || b.contains('lab-hand')) return;   // moving about, not dressing up
    const el = e.target.closest('[data-fx]');
    if (!el) { shut(); return; }
    if (e.target.closest('button,a,input,select,textarea')) return;    // the vote star is not the drawing
    open(el, el.dataset.fx);
  });

  document.addEventListener('keydown', e => { if (e.key === 'Escape') shut(); });

  // Gizmos rebuild their lists wholesale — vote on a drawing and every easel
  // is new DOM. Re-dress whatever turns up, there and then: this runs on the
  // nodes the mutation actually added, and only ever sets classes, which no
  // childList observer can hear, so it cannot feed itself.
  const bench = document.getElementById('bench');
  if (bench && window.MutationObserver) {
    new MutationObserver(recs => {
      for (const r of recs) {
        for (const n of r.addedNodes) {
          if (n.nodeType !== 1) continue;
          if (n.dataset && n.dataset.fx) apply(n);
          if (n.querySelectorAll) sweep(n);
        }
      }
    }).observe(bench, { childList: true, subtree: true });
  }
  sweep(document);

  return { ANIM, EFF, open, shut, apply, sweep, paint, get, set,
    clear: k => set(k, { a: '', e: '' }) };
})();
