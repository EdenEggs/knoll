/* ─── knoll / lab — workbench ───────────────────────────────────────────────
   Tiny framework for draggable gizmos. A gizmo is any element inside #bench
   with a [data-gizmo] id and a [data-handle] child. Positions persist in
   localStorage per gizmo; double-click a handle to send it home.

   #bench is a viewport and #bench-world is the sheet inside it — a page on an
   endless canvas, moved by a camera (pan x/y + zoom), the way figma does it:

     · hold the scroll wheel and drag ......... pan, from anywhere
     · hold space (or press H) and drag ....... pan, the hand tool
     · drag the bare paper .................... pan
     · scroll / two-finger swipe .............. pan   (shift — sideways)
     · ctrl / ⌘ + scroll, or pinch ............ zoom about the pointer
     · + / − / 0, shift 1 to fit, shift 0 ..... zoom by keyboard

   Positions are kept in WORLD coordinates; Lab.toWorld(clientX, clientY)
   converts a pointer to them, Lab.toScreen does the reverse and Lab.zoom is
   the current scale. Nothing on the page scrolls — the camera moves instead.

   Every gizmo also gets a – button on its handle: pressing it puts the gizmo
   back on the shelf (the side panel), where a click brings it out again. */

window.Lab = (function () {
  const bench = document.getElementById('bench');
  const world = document.getElementById('bench-world') || bench;
  const KEY = 'knoll-lab:pos:';
  const gizmos = [];
  let zTop = 10;

  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  // ══ the camera ═══════════════════════════════════════════════════════════
  // The sheet is never scrolled — it is translated and scaled under a fixed
  // viewport. PX/PY are the sheet's offset from the top-left of the bench, in
  // screen pixels; Z is the scale.
  const CAM_KEY = 'knoll-lab:cam', OLD_ZKEY = 'knoll-lab:zoom';
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

  const box = () => bench.getBoundingClientRect();

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

  // shelved, or gated away from the role currently being viewed — either way
  // it is not on the bench and must not stretch it or be flown to
  const out = el => el.classList.contains('shelved') || el.hidden;

  function contentBox() {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity, n = 0;
    gizmos.forEach(g => {
      if (out(g.el)) return;
      const x = parseFloat(g.el.style.left || 0), y = parseFloat(g.el.style.top || 0);
      x0 = Math.min(x0, x); y0 = Math.min(y0, y);
      x1 = Math.max(x1, x + g.el.offsetWidth); y1 = Math.max(y1, y + g.el.offsetHeight);
      n++;
    });
    if (!n) return { x: 0, y: 0, w: world.offsetWidth, h: world.offsetHeight };
    return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
  }

  function canvasBox() {
    if (cBox) return cBox;
    const c = contentBox();
    const x0 = Math.min(0, c.x), y0 = Math.min(0, c.y);
    const x1 = Math.max(world.offsetWidth, c.x + c.w), y1 = Math.max(world.offsetHeight, c.y + c.h);
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

  function paintGrid() {
    let s = gridUnit * Z;
    for (let i = 0; i < 20 && s < GRID_MIN; i++) s *= 2;
    const st = bench.style;
    st.setProperty('--gs', s.toFixed(3) + 'px');
    st.setProperty('--gs2', (s * 5).toFixed(3) + 'px');
    st.setProperty('--gx', PX.toFixed(2) + 'px');
    st.setProperty('--gy', PY.toFixed(2) + 'px');
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

  /* ── keeping the sheet crisp ───────────────────────────────────────────
     will-change:transform hands the sheet to the compositor, which is what
     makes panning cheap. But a composited layer is rasterised ONCE and then
     stretched by the GPU: zoom in and the old texture is blown up rather than
     redrawn at the new scale, so the paper, the ink and every gizmo on it go
     soft — and stay soft until something else forces a repaint, which is why
     a gizmo used to sharpen the instant you clicked it.

     So the promotion is a MOOD, not a setting. The hint goes on while the
     camera is moving and comes off a breath after it stops, along with the 3d
     in the transform, and the browser redraws the sheet at the scale you have
     landed on. translate3d(x,y,0) and translate(x,y) are the same matrix, so
     nothing moves at the swap — it just comes into focus.

     Anything that keeps a layer of its own while it moves (the critters, the
     mayor) is doing so because it really is moving every frame; the sheet is
     the one that spends most of its life still. */
  const CRISP_MS = 140;                  // after the last camera frame
  let crispT = 0;

  function moving() {
    if (crispT) clearTimeout(crispT);
    else world.style.willChange = 'transform';
    crispT = setTimeout(crisp, CRISP_MS);
  }

  function crisp() {
    crispT = 0;
    world.style.willChange = 'auto';
    world.style.transform = 'translate(' + PX.toFixed(2) + 'px,' + PY.toFixed(2) + 'px) scale(' + Z.toFixed(5) + ')';
  }

  function applyCam() {
    world.style.transform = 'translate3d(' + PX.toFixed(2) + 'px,' + PY.toFixed(2) + 'px,0) scale(' + Z.toFixed(5) + ')';
    paintGrid();
    moving();
    if (Math.abs(Z - lastZ) > 1e-6) paintZoom();
    saveCam();
  }

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

  // a glide from here to there — used by fit, by the shelf and by reset
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
    const b = box(), pad = 40;
    const l = parseFloat(el.style.left || 0) * Z, t = parseFloat(el.style.top || 0) * Z;
    const w = el.offsetWidth * Z, h = el.offsetHeight * Z;
    // it wants to sit inside the padding: pad ≤ its edges ≤ the far edge − pad
    const px = w > b.width - pad * 2 ? (b.width - w) / 2 - l : clamp(PX, pad - l, b.width - pad - w - l);
    const py = h > b.height - pad * 2 ? pad - t : clamp(PY, pad - t, b.height - pad - h - t);
    if (Math.abs(px - PX) < 1 && Math.abs(py - PY) < 1) return;
    camTo(Z, px, py, ms == null ? 300 : ms);
  }

  // the sheet is as wide as the viewport. A hidden or half-built page reports
  // zero here, so never write a width that would collapse the sheet.
  function layout() {
    const w = bench.clientWidth || world.offsetWidth || document.documentElement.clientWidth;
    if (w > 0) world.style.width = Math.round(w) + 'px';
    growBench();
  }

  function growBench() {
    let bottom = 0;
    gizmos.forEach(g => {
      if (out(g.el)) return;
      bottom = Math.max(bottom, parseFloat(g.el.style.top || 0) + g.el.offsetHeight);
    });
    world.style.minHeight = Math.round(Math.max(bench.clientHeight, bottom + 140)) + 'px';
    forget();
  }

  function homeOf(el) {
    // centred horizontally, stacked under the role strip in registration order
    const i = gizmos.findIndex(g => g.el === el);
    let y = 46;
    for (let k = 0; k < i; k++) y += gizmos[k].el.offsetHeight + 26;
    const x = Math.max(10, (world.clientWidth - el.offsetWidth) / 2);
    return { x, y };
  }

  function place(el, x, y, save) {
    const bw = world.clientWidth;
    // roam off the side of the sheet if you like — the camera can still find it
    x = clamp(x, -el.offsetWidth - 1400, bw + 1400);
    y = clamp(y, -400, 12000);
    el.style.left = Math.round(x) + 'px';
    el.style.top = Math.round(y) + 'px';
    growBench();
    if (save) {
      try { localStorage.setItem(KEY + el.dataset.gizmo, JSON.stringify({ x, y })); } catch (e) {}
    }
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
    const K = 'knoll-lab:' + key;
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
    if (!r.width || !e.lw) return;       // never laid out, or shelved and hidden
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

  // ── the shelf: minimized gizmos go back on it ───────────────────────────
  const SHELF_KEY = 'knoll-lab:shelved';
  let shelved = {};
  try { const v = JSON.parse(localStorage.getItem(SHELF_KEY)); if (v && typeof v === 'object') shelved = v; } catch (e) {}
  const saveShelf = () => { try { localStorage.setItem(SHELF_KEY, JSON.stringify(shelved)); } catch (e) {} };
  const shelfList = document.getElementById('shelf-list');

  function labelOf(el) {
    return el.getAttribute('aria-label') || el.dataset.gizmo;
  }

  function shelfRow(el) {
    const li = document.createElement('li');
    li.dataset.for = el.dataset.gizmo;
    const serial = el.querySelector('.gz-serial');
    li.innerHTML = '<button type="button"><i class="shelf-dot"></i><span></span><small>'
      + (serial ? serial.textContent : '') + '</small></button>';
    li.querySelector('span').textContent = labelOf(el);
    li.querySelector('button').addEventListener('click', () => {
      if (shelved[el.dataset.gizmo]) unshelve(el);
      else jumpTo(el);
    });
    shelfList && shelfList.appendChild(li);
    return li;
  }

  function markShelf(el) {
    const li = shelfList && shelfList.querySelector('li[data-for="' + el.dataset.gizmo + '"]');
    if (li) li.classList.toggle('away', !!shelved[el.dataset.gizmo]);
  }

  function shelve(el) {
    shelved[el.dataset.gizmo] = true;
    saveShelf();
    el.classList.add('going');
    setTimeout(() => { el.classList.remove('going'); el.classList.add('shelved'); growBench(); }, 190);
    markShelf(el);
  }

  function unshelve(el, quiet) {
    delete shelved[el.dataset.gizmo];
    saveShelf();
    el.classList.remove('shelved');
    el.style.zIndex = ++zTop;
    if (!quiet) {
      el.classList.add('coming');
      setTimeout(() => el.classList.remove('coming'), 260);
      jumpTo(el);
    }
    growBench();
    markShelf(el);
  }

  function jumpTo(el) {
    if (shelved[el.dataset.gizmo] || el.hidden) return;
    el.style.zIndex = ++zTop;
    focusOn(el);
    el.classList.remove('ping'); void el.offsetWidth; el.classList.add('ping');
    setTimeout(() => el.classList.remove('ping'), 950);
  }

  // fold the whole shelf away
  const shelfEl = document.getElementById('shelf'), shelfTab = document.getElementById('shelf-tab');
  const FOLD_KEY = 'knoll-lab:shelf-folded';
  function foldShelf(fold) {
    if (shelfEl) shelfEl.hidden = fold;
    if (shelfTab) shelfTab.hidden = !fold;
    try { localStorage.setItem(FOLD_KEY, fold ? '1' : ''); } catch (e) {}
  }
  const foldBtn = document.getElementById('shelf-fold');
  if (foldBtn) foldBtn.addEventListener('click', () => foldShelf(true));
  if (shelfTab) shelfTab.addEventListener('click', () => foldShelf(false));
  try {
    const f = localStorage.getItem(FOLD_KEY);
    if (f === '1' || (f == null && window.innerWidth < 900)) foldShelf(true);   // small screens start folded
  } catch (e) {}

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

  function register(el) {
    const handle = el.querySelector('[data-handle]') || el;
    el.classList.toggle('gz-loose', handle === el);
    gizmos.push({ el, handle });
    el.style.zIndex = ++zTop;

    // the – button, top right of every handle
    const min = document.createElement('button');
    min.type = 'button';
    min.className = 'gz-min';
    min.title = 'back on the shelf';
    min.setAttribute('aria-label', 'put ' + labelOf(el) + ' back on the shelf');
    min.textContent = '–';
    min.addEventListener('click', e => { e.stopPropagation(); shelve(el); });
    handle.appendChild(min);

    shelfRow(el);
    if (shelved[el.dataset.gizmo]) el.classList.add('shelved');
    markShelf(el);

    const s = saved(el);
    if (s) place(el, s.x, s.y, false); else goHome(el, false);

    let dragging = false, offX = 0, offY = 0, cx = 0, cy = 0;

    const follow = () => {
      const p = toWorld(cx, cy);
      place(el, p.x - offX, p.y - offY, false);
    };

    el.addEventListener('pointerdown', () => { el.style.zIndex = ++zTop; });

    handle.addEventListener('pointerdown', e => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      if (hand || tool === 'hand') return;            // the hand tool pans instead
      if (e.target.closest(NODRAG)) return;
      const p = toWorld(e.clientX, e.clientY);
      offX = p.x - parseFloat(el.style.left || 0);
      offY = p.y - parseFloat(el.style.top || 0);
      cx = e.clientX; cy = e.clientY;
      dragging = true;
      el.classList.add('dragging');
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
      el.classList.remove('dragging');
      try { handle.releasePointerCapture(e.pointerId); } catch (err) {}
      place(el, parseFloat(el.style.left), parseFloat(el.style.top), true);
    };
    handle.addEventListener('pointerup', end);
    handle.addEventListener('pointercancel', end);

    handle.addEventListener('dblclick', e => {
      if (e.target.closest(NODRAG)) return;
      goHome(el, true);
    });
  }

  function resetAll() {
    gizmos.forEach(g => { if (shelved[g.el.dataset.gizmo]) unshelve(g.el, true); });
    gizmos.forEach(g => goHome(g.el, true));
    camTo(1, 0, 0, 300);
  }

  // re-clamp everything when the window changes shape
  let rt;
  window.addEventListener('resize', () => {
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
  document.querySelectorAll('#bench [data-gizmo]').forEach(register);
  layout();
  if (!restored) { const b = box(); PX = Math.round((b.width - world.offsetWidth * Z) / 2); PY = 0; }
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
  // anything loose on the paper that can be picked up has to be listed here,
  // or dragging it pans the camera underneath it instead
  const onPaper = t => !!(t && t.closest && !t.closest('.gz,.critter,.el-mayor,.gnome-say,.zt-pin,.wall-ink'));
  // a finger has no middle button and no space bar, so it gets more of the
  // bench to drag: anything that isn't a control, a handle or a list.
  const HANDS_OFF = 'input,textarea,select,button,a,canvas,label,[role="button"],[tabindex],[contenteditable],'
    + '[data-handle],.critter,.el-mayor,.gnome-say,.zt-pin,.wall-ink,.gauge,.size-set';
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

  // ── dragging the canvas ─────────────────────────────────────────────────
  function startPan(e, now) {
    pan = { id: e.pointerId, x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY, live: false };
    moving();                            // hand the sheet over before it moves, not during
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

  bench.addEventListener('pointerdown', e => {
    if (pan) return;
    if (e.pointerType === 'mouse') {
      if (e.button === 1) { startPan(e, true); return; }              // the scroll wheel, held down
      if (e.button !== 0) return;
      if (hand || tool === 'hand') { startPan(e, true); return; }     // space, or the hand tool
      if (onPaper(e.target)) startPan(e, false);                      // bare paper — waits for a real drag
      return;
    }
    if (fingerPan(e.target)) startPan(e, false);                      // a finger, anywhere it isn't needed
  }, true);

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
  window.addEventListener('blur', () => { endPan(); edgeStop(); setHand(false); });

  // windows and linux want a middle click to start an autoscroll or a paste — no
  bench.addEventListener('mousedown', e => { if (e.button === 1) e.preventDefault(); }, true);
  bench.addEventListener('auxclick', e => { if (e.button === 1) { e.preventDefault(); e.stopPropagation(); } }, true);
  bench.addEventListener('contextmenu', e => { if (pan && pan.live) e.preventDefault(); });

  // ── roles: view the bench as a user, a moderator or the site owner ─────
  // Future gizmos read Lab.role, listen for 'lab:role' on document, style
  // against body[data-role="…"], or mark elements data-roles="moderator owner".
  const ROLES = ['user', 'moderator', 'owner'];
  const ROLE_KEY = 'knoll-lab:role';
  let role = null;

  function applyGates() {
    document.querySelectorAll('[data-roles]').forEach(el => {
      const ok = el.dataset.roles.split(/[\s,]+/).filter(Boolean).includes(role);
      el.hidden = !ok;
    });
    // a gizmo this role cannot see is off the shelf too, or the row is a
    // button that goes nowhere
    if (shelfList) gizmos.forEach(g => {
      const li = shelfList.querySelector('li[data-for="' + g.el.dataset.gizmo + '"]');
      if (li) li.hidden = !!g.el.hidden;
    });
    growBench();
  }

  function setRole(r) {
    if (!ROLES.includes(r) || r === role) return;
    role = r;
    document.body.dataset.role = r;
    document.querySelectorAll('[data-role-btn]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.roleBtn === r)));
    const badge = document.getElementById('role-badge');
    if (badge) badge.textContent = r === 'owner' ? 'site owner' : r;
    applyGates();
    try { localStorage.setItem(ROLE_KEY, r); } catch (e) {}
    document.dispatchEvent(new CustomEvent('lab:role', { detail: { role: r } }));
  }

  document.querySelectorAll('[data-role-btn]').forEach(b => b.addEventListener('click', () => setRole(b.dataset.roleBtn)));

  // ── the keyboard ────────────────────────────────────────────────────────
  document.addEventListener('keydown', e => {
    const t = e.target;
    if (isField(t)) return;

    // space held — the hand tool, so long as nothing else wants the key
    if (e.code === 'Space' || e.key === ' ') {
      if (t && t.closest && t.closest('button,a,[role="button"],[tabindex]')) return;
      if (!e.repeat) setHand(true);
      e.preventDefault();
      return;
    }
    if (e.ctrlKey || e.metaKey || e.altKey) return;

    if (e.shiftKey) {                                  // figma's framing keys
      if (e.key === '!' || e.key === '1') { fit(); e.preventDefault(); }
      else if (e.key === ')' || e.key === '0') { setZoom(1); e.preventDefault(); }
      return;
    }

    const i = ['1', '2', '3'].indexOf(e.key);
    if (i >= 0) { setRole(ROLES[i]); return; }
    const k = e.key.toLowerCase();
    if (k === 'h') setTool('hand');
    else if (k === 'v' || e.key === 'Escape') setTool('move');
    else if (e.key === '+' || e.key === '=') setZoom(Z * 1.2);
    else if (e.key === '-' || e.key === '_') setZoom(Z / 1.2);
    else if (e.key === '0' && !(t && t.closest && t.closest('.gauge'))) setZoom(1);
    else if (e.key === 'Home') fit();
  });

  document.addEventListener('keyup', e => {
    if (e.code === 'Space' || e.key === ' ') { setHand(false); if (pan && pan.live) endPan(); }
  });

  let initial = 'user';
  try { const v = localStorage.getItem(ROLE_KEY); if (ROLES.includes(v)) initial = v; } catch (e) {}
  setRole(initial);

  const resetDataBtn = document.getElementById('lab-reset-data');
  if (resetDataBtn) resetDataBtn.addEventListener('click', () => { if (confirm('Wipe everything saved on this device — petitions, drawings, ballots, blocks, the lot?')) resetData(); });

  return { register, resetAll, gizmos, ROLES, setRole, applyGates, store, uid, resetData, world, bench, grid,
    hidpi, toWorld, toScreen, setZoom, panBy, camTo, fit, focusOn, jumpTo,
    get role() { return role; }, get zoom() { return Z; }, get pan() { return { x: PX, y: PY }; } };
})();
