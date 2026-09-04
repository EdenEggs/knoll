/* ── ONE REACT, NOT A HUNDRED AND FIFTY-NINE ───────────────────────────────
   Loaded by each feature just ahead of support.js. Every frame on the bench
   is its own realm, and left alone each one fetches, parses and runs its own
   React — the same 150KB, once per tree. But support.js's loadReactUmd()
   opens with `if (window.React && window.ReactDOM) return`, so a realm that
   already HAS them keeps them. This puts them there: index.html loads the
   same pinned UMD build once (same URL, same SRI as support.js's cdn.ts),
   and each frame reaches up and adopts the parent's copy. React 18 wires its
   events at the root container, not the document, so one React serves any
   number of same-origin documents.

   Same-origin only, like everything else on this bench that reaches through
   the glass: off the disk (file://) the parent is a stranger, the try falls
   through, and every frame fetches its own exactly as before. A frame that
   boots before the parent's copy lands does the same — the URL matches, so
   the second fetch is the browser's cache anyway.

   __resources = {} is the other half. support.js's boot() treats a missing
   __resources as "this document may be a stale copy of itself" and re-fetches
   its own URL for a second parse of the whole template — 51KB of forest,
   per tree, twice. An empty object says: the DOM you were handed IS the
   file (these templates are authored to survive innerHTML — that is what
   the sc-camel-* attributes are for), so keep it and skip the round trip. */
(function () {
  try {
    var p = window.parent;
    if (p && p !== window && p.React && p.ReactDOM) {
      window.React = p.React;
      window.ReactDOM = p.ReactDOM;
    }
  } catch (e) {}
  if (!window.__resources) window.__resources = {};
})();

/* ── AND NOTHING TICKS OFF-BENCH ───────────────────────────────────────────
   bare.css already holds every CSS animation still while the parent has
   data-lab-paused on this document's <html> — but a feature that animates
   with JAVASCRIPT never heard that. A bug farm simulating its tank on
   requestAnimationFrame, a spawner rolling on setInterval, a terminal typing
   on setTimeout: each keeps billing the one main thread every frame on the
   bench shares, for a panel nobody can see. A hundred and fifty-nine of
   those is where an idle bench's lag comes from.

   So the clocks themselves are wrapped, HERE, because this file runs before
   support.js and before a single line of any feature — which is the only
   moment every timer the feature will ever make can be caught. While the
   document is paused:

     setTimeout ..... put down, and picked back up with the time it had left
     setInterval .... stopped, and restarted at its own pace on resume
     rAF ............ held, and re-requested on resume — a loop that ends
                      every frame by asking for the next one simply waits

   Nothing is ever DROPPED: a paused document runs no feature code at all, so
   it cannot even schedule more. The ids handed out are virtual (from 1e9 up,
   clear of the browser's own small ints) so clearTimeout / clearInterval /
   cancelAnimationFrame work on either side of a freeze, and anything created
   before this file ran — nothing is — would fall through untouched.

   The signal is the SAME attribute bare.css reads, written by frames.js's
   pause observer, so the two halves of "asleep" can never disagree. Off the
   disk the parent can't reach in, the attribute never arrives, and every
   clock runs the way it always did — same graceful nothing as the rest.

   data-lab-crowd freezes the clocks the same way. It is the bench saying
   there are too many warm documents for the main thread to be moving
   anything at all — a line typed into a speech bubble, at 25%, was a
   re-layerisation of the whole bench per character (THE CROWD, in
   frames.js). The compositor's animations are not clocks and carry on. */
(function () {
  if (window.__labFreeze) return;
  window.__labFreeze = true;
  var W = window, R = document.documentElement;
  if (!R || !W.MutationObserver) return;
  var sT = W.setTimeout, cT = W.clearTimeout,
      sI = W.setInterval, cI = W.clearInterval,
      rF = W.requestAnimationFrame, cF = W.cancelAnimationFrame;
  var frozen = false, seq = 1e9, touts = {}, ivals = {}, rafs = {};
  var now = function () { return W.performance.now(); };

  W.setTimeout = function (fn, ms) {
    if (typeof fn !== 'function') return sT.apply(W, arguments);
    var a = [].slice.call(arguments, 2), v = seq++;
    var r = touts[v] = { fn: fn, a: a, ms: +ms || 0, t0: now(), id: null };
    if (!frozen) r.id = sT.call(W, function () { delete touts[v]; fn.apply(W, a); }, r.ms);
    return v;
  };
  W.clearTimeout = function (v) {
    var r = touts[v];
    if (r) { if (r.id != null) cT.call(W, r.id); delete touts[v]; }
    else cT.call(W, v);
  };
  W.setInterval = function (fn, ms) {
    if (typeof fn !== 'function') return sI.apply(W, arguments);
    var a = [].slice.call(arguments, 2), v = seq++;
    var r = ivals[v] = { fn: fn, a: a, ms: +ms || 0, id: null };
    if (!frozen) r.id = sI.call(W, function () { fn.apply(W, a); }, r.ms);
    return v;
  };
  W.clearInterval = function (v) {
    var r = ivals[v];
    if (r) { if (r.id != null) cI.call(W, r.id); delete ivals[v]; }
    else cI.call(W, v);
  };
  W.requestAnimationFrame = function (fn) {
    var v = seq++;
    var r = rafs[v] = { fn: fn, id: null };
    if (!frozen) r.id = rF.call(W, function (t) { delete rafs[v]; fn.call(W, t); });
    return v;
  };
  W.cancelAnimationFrame = function (v) {
    var r = rafs[v];
    if (r) { if (r.id != null) cF.call(W, r.id); delete rafs[v]; }
    else cF.call(W, v);
  };

  function freeze() {
    frozen = true;
    var k, r;
    for (k in touts) { r = touts[k]; if (r.id != null) { cT.call(W, r.id); r.ms = Math.max(0, r.ms - (now() - r.t0)); r.id = null; } }
    for (k in ivals) { r = ivals[k]; if (r.id != null) { cI.call(W, r.id); r.id = null; } }
    for (k in rafs)  { r = rafs[k];  if (r.id != null) { cF.call(W, r.id); r.id = null; } }
  }
  function thaw() {
    frozen = false;
    var k;
    for (k in touts) (function (v, r) {
      if (r.id != null) return;
      r.t0 = now();
      r.id = sT.call(W, function () { delete touts[v]; r.fn.apply(W, r.a); }, r.ms);
    })(k, touts[k]);
    for (k in ivals) (function (r) {
      if (r.id != null) return;
      r.id = sI.call(W, function () { r.fn.apply(W, r.a); }, r.ms);
    })(ivals[k]);
    for (k in rafs) (function (v, r) {
      if (r.id != null) return;
      r.id = rF.call(W, function (t) { delete rafs[v]; r.fn.call(W, t); });
    })(k, rafs[k]);
  }

  /* data-lab-always-animate is the timer half of bare.css's
     data-always-animate: a feature whose clock drives its own signature
     motion (gnome-bubbles' think/type cycle) sets this on its own <html> to
     stay running under a crowd. It does NOT cover data-lab-paused — offscreen
     or a postage stamp is still nothing worth ticking for, opt-in or not. */
  function check() {
    var alwaysOn = R.hasAttribute('data-lab-always-animate');
    var f = R.hasAttribute('data-lab-paused') || (R.hasAttribute('data-lab-crowd') && !alwaysOn);
    if (f !== frozen) (f ? freeze : thaw)();
  }
  new MutationObserver(check).observe(R, { attributes: true, attributeFilter: ['data-lab-paused', 'data-lab-crowd', 'data-lab-always-animate'] });
  check();
})();
