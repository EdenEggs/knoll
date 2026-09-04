/* ─── LOOSE ON THE BENCH ───────────────────────────────────────────────────
   Whatever the forge stamps out gets dropped onto the workbench and wanders
   about. Each critter is four pre-rendered sprite frames (stand, left step,
   right step, hop) blitted into one canvas; the walk is a little state
   machine — amble to a spot, stop, look around, amble somewhere else. They
   startle and scurry when the cursor is swiped at them, but hold still if you
   rest on one — then you can pick it up and carry it about. Drop one on a
   registered bin (Critters.zone) and it gets thrown away. Only the sprites
   take a pointer; the rest of the layer is pointer-events: none. */

window.Critters = (function () {
  const world = (window.Lab && Lab.world) || document.getElementById('bench-world') || document.getElementById('bench');
  if (!world) return { spawn() {}, shoo() {}, zone() { return () => {}; }, count: () => 0 };

  const MAX = 9;                     // any more and the bench is a zoo
  const HEIGHT = 58;                 // sprite height in px, before the SIZE knob
  const sizeOf = () => (window.Forge && Forge.size) || 1;
  const list = [];
  let raf = 0, lastT = 0;
  const mouse = { cx: -9999, cy: -9999, x: -9999, y: -9999, spd: 0, seen: false };

  const rnd = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  // pointer → world coordinates (the sheet may be zoomed)
  const toWorld = (cx, cy) => window.Lab && Lab.toWorld ? Lab.toWorld(cx, cy)
    : (r => ({ x: cx - r.left, y: cy - r.top }))(world.getBoundingClientRect());

  const layer = document.createElement('div');
  layer.className = 'critter-layer';
  layer.setAttribute('aria-hidden', 'true');
  world.appendChild(layer);

  function ground() {
    const w = world.clientWidth, h = Math.max(world.clientHeight, 320);
    return { x0: 30, x1: Math.max(60, w - 30), y0: 96, y1: Math.max(150, h - 26) };
  }

  function retarget(c, g, away) {
    if (away) {
      const dx = c.x - mouse.x, dy = c.y - mouse.y, d = Math.hypot(dx, dy) || 1;
      c.tx = clamp(c.x + dx / d * rnd(120, 220), g.x0, g.x1);
      c.ty = clamp(c.y + dy / d * rnd(40, 110), g.y0, g.y1);
      c.speed = rnd(78, 104);
      c.dur = 2.4;
      return;
    }
    c.tx = clamp(c.x + rnd(-230, 230), g.x0, g.x1);
    c.ty = clamp(c.y + rnd(-70, 70), g.y0, g.y1);
    c.speed = rnd(17, 34);
    c.dur = rnd(1.6, 5);
  }

  // the sprite carries slack under its feet (room for the hop and for a blur
  // to bleed into), so the canvas is hung that far below the ground line
  function fit(c, frames) {
    const f = frames[0], foot = +f.dataset.foot || 0;
    c.art.width = f.width; c.art.height = f.height;
    c.art.style.width = f.width + 'px'; c.art.style.height = f.height + 'px';
    c.art.style.bottom = -foot + 'px';
    c.span = +f.dataset.span || f.width;             // the creature itself, not the canvas
    c.tall = +f.dataset.tall || f.height;
    c.shadow.style.width = Math.max(10, Math.round(c.span * 0.62)) + 'px';
    c.tag.style.bottom = (f.height - foot + 6) + 'px';
  }

  const hovering = (c) => mouse.seen
    && Math.abs(mouse.x - c.x) <= c.span / 2 + 8
    && mouse.y <= c.y + 8 && mouse.y >= c.y - c.tall - 8;

  function spawn(gen, originEl) {
    if (!window.Forge || !gen) return null;
    const frames = [0, 1, 2, 3].map(p => Forge.sprite(gen, HEIGHT * sizeOf(), p));
    const g = ground();

    const el = document.createElement('div');
    el.className = 'critter';
    const shadow = document.createElement('div');
    shadow.className = 'critter-shadow';
    const art = document.createElement('canvas');
    art.className = 'critter-art';
    // the fx sleeve: tapping a creature dresses it up, and the animation rides
    // this rather than the sprite (which is busy centring itself) or the
    // critter (which is busy walking about). See fx.js.
    const fx = document.createElement('div');
    fx.className = 'critter-fx';
    fx.dataset.fx = 'critter:' + (window.Lab && Lab.uid ? Lab.uid() : String(Math.random()).slice(2));
    fx.appendChild(art);
    const tag = document.createElement('b');
    tag.className = 'critter-tag';
    tag.textContent = gen.name;
    el.append(shadow, fx, tag);
    layer.appendChild(el);

    // out of the forge screen, if we can find it, otherwise the middle
    let x = (g.x0 + g.x1) / 2, y = (g.y0 + g.y1) / 2;
    if (originEl) {
      const r = originEl.getBoundingClientRect();
      if (r.width) { const p = toWorld(r.left + r.width / 2, r.bottom); x = p.x; y = p.y + 10; }
    }

    const c = {
      el, art, tag, shadow, fx, fxkey: fx.dataset.fx, ctx: art.getContext('2d'), frames, name: gen.name,
      x: clamp(x, g.x0, g.x1), y: clamp(y, g.y0, g.y1),
      tx: 0, ty: 0, dir: Math.random() < 0.5 ? -1 : 1, speed: 24,
      state: 'drop', t: 0, dur: 0.5, phase: 0, drawn: -1, posed: '', cool: 0,
      span: 20, tall: 40, tagUntil: performance.now() + 2200, tagShown: false
    };
    fit(c, frames);
    retarget(c, g);
    art.addEventListener('pointerdown', e => grab(c, e));
    art.addEventListener('pointermove', carry);
    art.addEventListener('pointerup', letGo);
    art.addEventListener('pointercancel', letGo);
    list.push(c);
    while (list.length > MAX) retire(list.shift());
    paint(c);
    pose(c, 0.45);
    c.el.style.transform = 'translate3d(' + Math.round(c.x) + 'px,' + Math.round(c.y) + 'px,0)';
    lastT = performance.now();
    start();
    return c;
  }

  // the warp bench moved: re-cut the most recent critter so the one on the
  // bench matches the one on the screen while you twiddle
  let reskinAt = 0;
  function reskin(gen) {
    const c = list[list.length - 1];
    if (!c || !gen || !window.Forge) return;
    const now = performance.now();
    if (now - reskinAt < 70) return;
    reskinAt = now;
    c.frames = [0, 1, 2, 3].map(p => Forge.sprite(gen, HEIGHT * sizeOf(), p));
    fit(c, c.frames);
    c.drawn = -1;
    paint(c);
  }

  // the name was edited on the plate: the one on the bench answers to it too
  function rename(name) {
    const c = list[list.length - 1];
    if (!c || !name || c.name === name) return;
    c.name = name;
    c.tag.textContent = name;
    c.tagUntil = performance.now() + 1800;
    start();
  }

  function retire(c) {
    if (window.FX && c.fxkey) FX.clear(c.fxkey);
    if (held === c) { held = null; c.el.classList.remove('held'); lightZone(null); }
    const i = list.indexOf(c);
    if (i >= 0) list.splice(i, 1);
    c.el.classList.add('gone');
    setTimeout(() => c.el.remove(), 600);
  }

  // ── the bin ──────────────────────────────────────────────────────────────
  // Anything can offer itself as a place to throw a critter: Critters.zone(el)
  // lights up while one is held over it and gets told when one goes in.
  const zones = [];
  function zone(el, opts) {
    if (!el) return () => {};
    const z = { el, on: (opts && opts.on) || null };
    zones.push(z);
    return () => { const i = zones.indexOf(z); if (i >= 0) zones.splice(i, 1); };
  }

  const zoneAt = (cx, cy) => zones.find(z => {
    const r = z.el.getBoundingClientRect();
    return r.width && cx >= r.left && cx <= r.right && cy >= r.top && cy <= r.bottom;
  }) || null;

  function mouthOf(z) {                       // the middle of the bin, in world space
    const r = z.el.getBoundingClientRect();
    const p = toWorld(r.left + r.width / 2, r.top + r.height * 0.52);
    return { mx: p.x, my: p.y };
  }

  // start the little arc that ends with the critter gone
  function toss(c, z) {
    c.state = 'bin'; c.t = 0; c.dur = 0.44;
    c.bx = c.x; c.by = c.y;
    const m = mouthOf(z);
    c.mx = m.mx; c.my = m.my; c.zone = z;
    c.tag.classList.remove('show'); c.tagShown = false;
    z.el.classList.remove('over');
    z.el.classList.add('chomp');
    clearTimeout(z.timer);
    z.timer = setTimeout(() => z.el.classList.remove('chomp'), 700);
    if (z.on) z.on(c.name);
    start();
  }

  // ── carrying one about ───────────────────────────────────────────────────
  let held = null, grabX = 0, grabY = 0, overZone = null, tap = null;

  function lightZone(z) {
    if (overZone === z) return;
    if (overZone) overZone.el.classList.remove('over');
    overZone = z;
    if (overZone) overZone.el.classList.add('over');
  }

  function grab(c, e) {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (held || c.state === 'bin') return;
    const p = toWorld(e.clientX, e.clientY);
    tap = { x: e.clientX, y: e.clientY, t: performance.now() };
    held = c;
    c.state = 'held'; c.t = 0; c.cool = 3.2;
    grabX = c.x - p.x;
    grabY = c.y - p.y;
    c.el.classList.add('held');
    c.tagUntil = performance.now() + 6e5;
    try { c.art.setPointerCapture(e.pointerId); } catch (err) {}
    e.preventDefault();
    start();
  }

  function carry(e) {
    if (!held) return;
    const p = toWorld(e.clientX, e.clientY);
    held.x = p.x + grabX;
    held.y = p.y + grabY;
    lightZone(zoneAt(e.clientX, e.clientY));
    start();
  }

  function letGo(e) {
    const c = held;
    if (!c) return;
    held = null;
    c.el.classList.remove('held');
    c.tagUntil = performance.now() + 900;
    try { c.art.releasePointerCapture(e.pointerId); } catch (err) {}
    const z = overZone;
    lightZone(null);
    if (z) { tap = null; toss(c, z); return; }
    const g = ground();
    c.x = clamp(c.x, g.x0, g.x1); c.y = clamp(c.y, g.y0, g.y1);
    c.state = 'drop'; c.t = 0.18; c.cool = 1.4;   // lands and looks around
    start();
    // it never actually went anywhere — that was a tap, not a carry
    if (tap && window.FX && Math.abs(e.clientX - tap.x) + Math.abs(e.clientY - tap.y) < 5
        && performance.now() - tap.t < 600) FX.open(c.fx, c.fxkey);
    tap = null;
  }

  function shoo(el) {
    const z = el ? zones.find(v => v.el === el) : null;
    if (!z) { while (list.length) retire(list[list.length - 1]); return; }
    if (held) { held.el.classList.remove('held'); held = null; lightZone(null); }
    list.slice().forEach((c, i) => {
      if (c.state === 'bin') return;
      setTimeout(() => { if (list.includes(c)) toss(c, z); }, i * 110);
    });
  }

  function paint(c) {                       // only re-blit when the frame changes
    if (c.phase === c.drawn) return;
    c.ctx.clearRect(0, 0, c.art.width, c.art.height);
    c.ctx.drawImage(c.frames[c.phase], 0, 0);
    c.drawn = c.phase;
  }

  function pose(c, scale, spin) {
    const t = 'translateX(-50%)' + (spin ? ' rotate(' + spin.toFixed(1) + 'deg)' : '')
      + (c.dir < 0 ? ' scaleX(-1)' : '') + (scale !== 1 ? ' scale(' + scale.toFixed(3) + ')' : '');
    if (t !== c.posed) { c.art.style.transform = t; c.posed = t; }
  }

  function step(now) {
    raf = 0;
    if (!list.length) return;
    const dt = clamp((now - lastT) / 1000, 0, 0.06);
    lastT = now;
    const g = ground();
    if (mouse.seen) {                       // one layout read a frame, not one a mousemove
      const p = toWorld(mouse.cx, mouse.cy);
      mouse.spd = dt > 0 ? Math.hypot(p.x - mouse.x, p.y - mouse.y) / dt : 0;
      mouse.x = p.x; mouse.y = p.y;
    }

    for (const c of list.slice()) {
      c.t += dt;
      c.cool = Math.max(0, c.cool - dt);
      const busy = c.state === 'held' || c.state === 'bin';

      // hovering over one makes it say who it is; resting the cursor nearby is
      // fine, but a jab at it (or a cursor right on top) sends it hopping off
      const hov = hovering(c);
      if (hov) c.tagUntil = now + 600;
      const show = now < c.tagUntil;
      if (show !== c.tagShown) { c.tag.classList.toggle('show', show); c.tagShown = show; }

      // a cursor resting on one is a hand about to pick it up, not a threat;
      // only a swipe near it sends it hopping off
      if (c.cool === 0 && mouse.seen && !busy && !hov && c.state !== 'drop') {
        const d = Math.hypot(c.x - mouse.x, (c.y - c.tall * 0.5) - mouse.y);
        if (d < 26 || (d < 58 && mouse.spd > 340)) {
          c.cool = 3.2; c.state = 'hop'; c.t = 0;
          retarget(c, g, true);
          c.dir = c.tx < c.x ? -1 : 1;
        }
      }

      if (c.state === 'held') {
        // the pointer owns where it is; it just dangles and kicks
      } else if (c.state === 'bin') {
        const k = clamp(c.t / c.dur, 0, 1);
        c.x = c.bx + (c.mx - c.bx) * k;
        c.y = c.by + (c.my - c.by) * k;
        if (k >= 1) { retire(c); continue; }
      } else if (c.state === 'drop') {
        if (c.t >= 0.5) { c.state = 'walk'; c.t = 0; retarget(c, g); }
      } else if (c.state === 'hop') {
        if (c.t >= 0.42) { c.state = 'walk'; c.t = 0; }
      } else if (c.state === 'idle') {
        if (c.t >= c.dur) { c.state = 'walk'; c.t = 0; retarget(c, g); if (Math.random() < 0.3) c.dir = -c.dir; }
      } else {
        const dx = c.tx - c.x, dy = c.ty - c.y, d = Math.hypot(dx, dy);
        if (d < 3 || c.t >= c.dur) { c.state = 'idle'; c.t = 0; c.dur = rnd(0.7, 3.4); }
        else {
          const v = Math.min(d, c.speed * dt);
          c.x += dx / d * v; c.y += dy / d * v;
          if (Math.abs(dx) > 2) c.dir = dx < 0 ? -1 : 1;
        }
      }
      if (!busy) { c.x = clamp(c.x, g.x0, g.x1); c.y = clamp(c.y, g.y0, g.y1); }

      // frames: alternate feet while walking, both up mid-hop
      let lift = 0, scale = 1, spin = 0;
      if (c.state === 'walk') c.phase = 1 + (Math.floor(c.t * (c.speed > 60 ? 9 : 5)) % 2);
      else if (c.state === 'hop') { c.phase = 3; lift = Math.sin(Math.PI * clamp(c.t / 0.42, 0, 1)) * 13; }
      else if (c.state === 'held') {
        c.phase = 1 + (Math.floor(c.t * 7) % 2);      // legs kicking mid-air
        scale = 1.12; lift = 12; spin = Math.sin(c.t * 7.5) * 8;
      } else if (c.state === 'bin') {
        const k = clamp(c.t / c.dur, 0, 1);
        c.phase = 3;
        lift = Math.sin(Math.PI * k) * 26;
        scale = Math.max(0.06, 1 - 0.94 * k * k);
        spin = k * 260;
      } else if (c.state === 'drop') {
        c.phase = 3;
        const k = clamp(c.t / 0.5, 0, 1);
        lift = (1 - k) * 26;
        scale = 0.45 + 0.55 * (1 + 2.7 * Math.pow(k - 1, 3) + 1.7 * Math.pow(k - 1, 2));
      } else c.phase = 0;

      paint(c);
      pose(c, scale, spin);
      c.el.style.transform = 'translate3d(' + Math.round(c.x) + 'px,' + Math.round(c.y - lift) + 'px,0)';
      c.el.style.zIndex = String(busy ? 9999 : Math.round(c.y));
      c.shadow.style.opacity = String(busy ? 0 : clamp(1 - lift / 30, 0.2, 1));
    }
    start();
  }

  function start() {
    if (raf || !list.length) return;
    raf = requestAnimationFrame(step);
  }

  document.addEventListener('pointermove', e => {
    mouse.cx = e.clientX; mouse.cy = e.clientY; mouse.seen = true;
  }, { passive: true });

  let rt;
  window.addEventListener('resize', () => {
    clearTimeout(rt);
    rt = setTimeout(() => {
      const g = ground();
      for (const c of list) { c.x = clamp(c.x, g.x0, g.x1); c.y = clamp(c.y, g.y0, g.y1); retarget(c, g); }
      start();
    }, 120);
  });

  return { spawn, shoo, zone, reskin, rename, list, count: () => list.length };
})();
