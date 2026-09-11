/* ─── knoll / lab 2 — the spotlight: a page opened to read gets the screen ──
   The Knoll Times stand opens an issue in a reader of its own — a scrim
   over its document and the paper in the middle of it. Inside a frame,
   that is a scrim over one BOX on the bench and a paper in the middle of
   that box, wherever the box happens to be: the screenshot that asked for
   this had the paper off to the right with the rest of the bench in plain
   daylight. What a reader wants is the whole screen — the bench dimmed
   edge to edge, the paper in the middle of it, and a click anywhere in
   the dark to put it down.

   HOW. The frame cannot leave its box (position:fixed inside the world is
   fixed to the world, and moving the iframe would reload it), so the bench
   does the two things it can. It DIMS: one fixed element over everything,
   with a hole cut where the paper is — a box-shadow the size of the
   screen, the old trick — that follows the paper through pans and zooms.
   And it MOVES THE CAMERA: a glide to put the paper in the middle at a
   zoom that shows the whole of it, and a glide back to where you were
   when it closes. The document's own scrim goes clear while the bench
   holds the light (one rule, injected into the document the way bare.css
   is), so the frame's box does not sit in the dark as a darker rectangle.
   THE HOLE IS THE PAPER AND NOTHING ELSE: the first cut took in the
   document's close button, which hangs off the paper's corner, and the
   paper's drop shadow, and the strips of daylight that left round the
   paper were the first thing anyone saw. So the hole is the paper's own
   box, the document's X is hidden while the light is on, and the bench
   draws an X of its own at the paper's corner, above the dark, in the
   document's own red and hand — which also makes the X a button on THIS
   side of the glass, live or not.

   THE MARKS. A document asks for this by marking its export — marked in
   the file, never found by shape, like bare.css's three: data-lab-reads
   on the screen root (this document opens things to read), data-lab-scrim
   on its backdrop, data-lab-page on the page it opens, data-lab-close on
   the button that closes it. The bench watches a marked document for the
   scrim to come and go (a MutationObserver on its body: it fires on a
   render, never on a frame), so the document needs no script of its own
   and knows nothing about the bench; opened on its own, it reads as it
   always did. ADDING.md §3 has the marks.

   CLOSING. A click in the dark OUTSIDE the frame is heard here on the
   window, in the capture phase, and swallowed — it is not a band, a pan
   or a pick — and the page is closed by pressing the document's own close
   button, so the document's state is the only state there is. A click in
   the dark INSIDE the frame lands on the document's scrim, which closes
   it itself. Esc does the same from either side of the glass. And while
   the light is on the frame is kept LIVE: frames.js puts the shield back
   a breath after the pointer leaves a frame, which is right for a machine
   and wrong for a page you are reading, so the pointer coming back over
   it wakes it before the click lands — one click on the X, not two.

   Geometry is LAYOUT geometry (offsetLeft/Top/Width/Height), never a
   bounding rect: the paper pops in through a scale animation and unfolds
   its lower half through a rotate, and neither moves where it is laid
   out. The hole is clipped to the frame's box, because a paper taller
   than its frame scrolls inside the document's scrim and the part below
   the box is not on screen. */

window.Spotlight = (function () {
  if (!window.Lab || !window.Frames) return null;
  const bench = Lab.bench;

  const GLIDE = 300;    // ms, there and back — jumpTo's neighbourhood
  const AIR   = 0.9;    // how much of the screen the page may take, either way

  let on = null;        // { p, doc, f, hole, x, cam, rect, raf } while a page is lit
  let swallow = 0;      // a click that follows a pointerdown taken in the dark is taken too

  const box = () => bench.getBoundingClientRect();

  /* the tool dock lies across the foot of the screen, in the hole's way if
     the page is centred on the whole height — so the strip it takes, plus
     a breath, is left out of the middle. On a phone the dock stands up the
     side instead (lab.css: THE DOCK ON A PHONE) and takes nothing here. */
  function dockStrip(b) {
    const d = document.querySelector('.tool-dock');
    if (!d) return 0;
    const r = d.getBoundingClientRect();
    if (!r.width || r.top < b.top + b.height / 2) return 0;
    return Math.max(0, b.top + b.height - r.top + 12);
  }

  /* the page's box in WORLD units — laid out inside the scrim (its
     offsetParent, being position:fixed), less what the scrim has scrolled,
     then clipped to the frame. The paper's box and nothing else (THE HOLE
     IS THE PAPER, above). */
  function measure() {
    const { doc, f } = on;
    const scrim = doc.querySelector('[data-lab-scrim]'), page = doc.querySelector('[data-lab-page]');
    if (!scrim || !page || page.offsetParent !== scrim) return null;
    const fr = f.getBoundingClientRect(), win = f.contentWindow;
    const k = win && win.innerWidth ? fr.width / win.innerWidth : 1;       // page px per document px
    const l = page.offsetLeft - scrim.scrollLeft, t = page.offsetTop - scrim.scrollTop;
    const r = l + page.offsetWidth, b = t + page.offsetHeight;
    const L = Math.max(fr.left + l * k, fr.left), T = Math.max(fr.top + t * k, fr.top);
    const R = Math.min(fr.left + r * k, fr.right), B = Math.min(fr.top + b * k, fr.bottom);
    if (R - L < 8 || B - T < 8) return null;
    const a = Lab.toWorld(L, T), z = Lab.toWorld(R, B);
    return { x: a.x, y: a.y, w: z.x - a.x, h: z.y - a.y };
  }

  // the hole, where the page is on screen right now — and the X at its corner
  const XR = 20;        // the bench's X is a 40px disc, its centre 4px in from the paper's top-right corner, as the document's is
  function paint() {
    if (!on || !on.hole) return;
    const s = Lab.toScreen(on.rect.x, on.rect.y), z = Lab.zoom, st = on.hole.style, w = on.rect.w * z, h = on.rect.h * z;
    st.left = s.x.toFixed(1) + 'px'; st.top = s.y.toFixed(1) + 'px';
    st.width = w.toFixed(1) + 'px'; st.height = h.toFixed(1) + 'px';
    const xs = on.x.style;
    xs.left = (s.x + w - 4 - XR).toFixed(1) + 'px'; xs.top = (s.y + 4 - XR).toFixed(1) + 'px';
  }

  // …every frame through a glide; after it, the scroll and zoom listeners below have it
  function follow(ms) {
    const o = on, until = performance.now() + ms;
    cancelAnimationFrame(o.raf);
    const step = () => { if (on !== o) return; paint(); o.raf = performance.now() < until ? requestAnimationFrame(step) : 0; };
    o.raf = requestAnimationFrame(step);
  }

  // the frame kept live: frames.js's own click handler wakes a booted one
  function wake(p) {
    if (Frames.live === p.id || !p.el.classList.contains('booted')) return;
    p.el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
  }

  function open(p, doc, f) {
    if (on) close(false);
    on = { p, doc, f, hole: null, x: null, cam: { z: Lab.zoom, x: Lab.pan.x, y: Lab.pan.y }, rect: null, raf: 0 };
    doc.documentElement.setAttribute('data-lab-spotlit', '');
    on.rect = measure();
    if (!on.rect) { doc.documentElement.removeAttribute('data-lab-spotlit'); on = null; return; }
    const hole = document.createElement('div');
    hole.className = 'spotlight';
    hole.setAttribute('aria-hidden', 'true');
    document.body.appendChild(hole);
    on.hole = hole;
    const x = document.createElement('button');
    x.type = 'button';
    x.className = 'spotlight-x';
    x.setAttribute('aria-label', 'close');
    x.textContent = 'x';
    x.addEventListener('click', shut);              // a keyboard press; a pointer press is heard on the window like any in the dark
    document.body.appendChild(x);
    on.x = x;
    document.body.classList.add('lab-spotlit');     // the live frame's pink rim goes quiet (lab.css)
    paint();
    requestAnimationFrame(() => { if (on && on.hole === hole) hole.classList.add('on'); });   // the dark comes up, not on
    wake(p);
    // the camera: the page in the middle of the screen, at a zoom that shows the whole of it
    const b = box(), r = on.rect, H = b.height - dockStrip(b);
    const z = Math.min(b.width * AIR / r.w, H * AIR / r.h);
    Lab.camTo(z, (b.width - r.w * z) / 2 - r.x * z, (H - r.h * z) / 2 - r.y * z, GLIDE);
    follow(GLIDE + 100);
  }

  function close(restore) {
    if (!on) return;
    const o = on; on = null;
    cancelAnimationFrame(o.raf);
    document.body.classList.remove('lab-spotlit');
    try { o.doc.documentElement.removeAttribute('data-lab-spotlit'); } catch (e) {}
    if (o.x) o.x.remove();
    if (o.hole) { o.hole.classList.remove('on'); setTimeout(() => o.hole.remove(), 260); }
    if (restore !== false) Lab.camTo(o.cam.z, o.cam.x, o.cam.y, GLIDE);
  }

  // the document's own close button, pressed for it — its state is the only state
  function shut() {
    if (!on) return;
    const doc = on.doc, x = doc.querySelector('[data-lab-close]');
    if (x) x.click(); else close();
    setTimeout(() => { if (on && on.doc === doc && !doc.querySelector('[data-lab-scrim]')) close(); }, 60);
  }

  // ── what closes it ──────────────────────────────────────────────────────
  window.addEventListener('pointerdown', e => {
    if (!on || e.button !== 0) return;
    if (on.p.el.contains(e.target)) return;               // in the frame: the document's own scrim has it
    e.preventDefault(); e.stopPropagation();              // not a band, not a pan, not a pick
    clearTimeout(swallow);
    swallow = setTimeout(() => { swallow = 0; }, 400);
    shut();
  }, true);
  window.addEventListener('click', e => {
    if (!swallow) return;
    clearTimeout(swallow); swallow = 0;
    e.preventDefault(); e.stopPropagation();              // …and not a wake-up for whatever was under it
  }, true);
  window.addEventListener('keydown', e => {
    if (!on || e.key !== 'Escape') return;
    e.preventDefault(); e.stopPropagation();
    shut();
  }, true);

  // ── what moves the hole ─────────────────────────────────────────────────
  bench.addEventListener('scroll', paint, { passive: true });
  document.addEventListener('lab:zoom', paint);
  window.addEventListener('resize', paint);

  // ── the documents that open things ──────────────────────────────────────
  const HOOK = '__knollSpotlight';
  function adopt(p) {
    if (!p || p.art) return;
    const f = p.el.querySelector('iframe');
    let doc; try { doc = f && f.contentDocument; } catch (e) { return; }
    if (!doc || doc[HOOK]) return;
    doc[HOOK] = true;
    const hook = () => {
      const st = doc.createElement('style');
      st.id = 'lab-spotlight';
      st.textContent = 'html[data-lab-spotlit] [data-lab-scrim]{background:transparent!important}'
        + 'html[data-lab-spotlit] [data-lab-close]{visibility:hidden!important}';   // the bench draws the X, above the dark
      (doc.head || doc.documentElement).appendChild(st);
      new MutationObserver(() => {
        const lit = !!doc.querySelector('[data-lab-scrim]');
        if (lit && !(on && on.doc === doc)) open(p, doc, f);
        else if (!lit && on && on.doc === doc) close();
      }).observe(doc.body || doc.documentElement, { childList: true, subtree: true });
      p.el.addEventListener('pointerenter', () => { if (on && on.p === p) wake(p); });
    };
    /* The runtime says __dc_booted a beat BEFORE its first render lands —
       measured: two boots in three, the screen root is not in the document
       yet when the message arrives — so the root is waited for, and read
       for its mark the moment it appears. A root without the mark is a
       machine that opens nothing to read; it is left alone. */
    const root = () => doc.querySelector('[data-screen-label]');
    const r0 = root();
    if (r0) { if (r0.hasAttribute('data-lab-reads')) hook(); return; }
    const mo = new MutationObserver(() => {
      const r = root();
      if (!r) return;
      mo.disconnect();
      if (r.hasAttribute('data-lab-reads')) hook();
    });
    mo.observe(doc.documentElement, { childList: true, subtree: true });
    setTimeout(() => mo.disconnect(), 20000);      // a document that never renders is not waited on forever
  }
  window.addEventListener('message', e => {
    if (!e.data || e.data.type !== '__dc_booted') return;
    const p = Frames.panels.find(q => {
      if (q.art) return false;
      try { return q.el.querySelector('iframe').contentWindow === e.source; } catch (err) { return false; }
    });
    if (p) adopt(p);
  });
  Frames.panels.forEach(p => { if (!p.art && p.el.classList.contains('booted')) adopt(p); });

  return { close: shut, get on() { return on && on.p.id; } };
})();
