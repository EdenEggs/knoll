/* ─── THE PRESS TABLE'S STORE ──────────────────────────────────────────────
   press/store.js — window.PressStore: the little keep-it-on-this-device
   helper the Press Table writes the owner's typing into, so that a reload in
   the middle of filling in a form is an inconvenience and not a loss.

   IT IS A COPY OF A SHAPE, NOT AN IMPORT, AND HERE IS WHY. The bench has one
   of these already: `Lab.store(key, defaults)` in lab.js (line 1188) — get,
   set, update, on, reset, saved on every write, quota errors swallowed —
   and every gizmo on the bench keeps its state through it. The Press Table
   does NOT load lab.js. lab.js is the bench: a camera that pans and zooms a
   world layer, a pile of draggable sections, a wall, a dock, a set of
   pointer gestures that own ctrl, space and the wheel. This page is a form
   with three previews on it; there is nothing here to drag and nothing to
   look at from further away, and a camera that swallowed the wheel would
   fight the very scrolling a long form needs. Plan §10 6.7 says it in one
   line — "the Press Table does not load lab.js (it is not a bench), so it
   cannot use Lab.store; copy that helper's shape into press/store.js rather
   than importing the bench for one function" — and this file is that copy.
   The SHAPE is copied; the file is not. Where the two differ is written
   down below, each with its reason, so that reading them side by side is
   possible and the differences are visible rather than accidental.

   THE FOUR DIFFERENCES FROM Lab.store

   1. THE NAMESPACE. `knoll-press:` and not `knoll-lab2:` (plan §10 6.7).
      Two reasons, and the second is the one that matters: the Press Table
      may be open in one tab while a bench or a game page is open in
      another, on the same origin, and `reset data` on the bench walks every
      `knoll-lab2:` key it owns. A half-typed press kit is not the bench's
      data and must not answer to the bench's reset. (The bench also gets a
      page prefix on a game page — `knoll-lab2:games/<slug>:`, CONTRACTS §0
      — for the same kind of reason; this is that argument one folder over.)

   2. THE READ-BACK. Lab.store's save is `try { setItem } catch (e) {}`: a
      full store fails silently, which is right for a camera position and
      wrong for a paragraph somebody typed. tracer.js already met this from
      the other side — it files a tracing, then reads the key back and
      "says plainly when it is not there rather than showing a slot that
      would be empty after a reload" (THE LIBRARY, tracer.js). So the quota
      error is still swallowed — a throw here would take the keystroke that
      caused it down with it — and then the key is READ BACK and compared,
      and `kept` says whether the write survived. The Press Table shows that
      in its footer. Nothing else in the file behaves differently: state in
      memory is the truth for this page-load either way.

   3. NO PICTURES. `keep(state)` is called with what the owner TYPED — the
      fields, the roles, the order, the tweaks — and never with the images.
      A dozen screenshots as base64 is tens of megabytes; localStorage is
      about five in every browser that ships one, and the failure mode of
      trying is not a slow page but a form that silently stops saving. So
      the pictures live in memory for the length of the visit and the drop
      zone asks for the folder again after a reload, which is one drag; the
      words, which are the part nobody wants to type twice, survive. This
      file cannot enforce that — it stores what it is handed — but it is
      the reason the Press Table hands it what it does, and it is written
      here because this is where somebody would come looking.

   4. NO `stores` REGISTRY BEHIND A DOCK BUTTON. lab.js keeps every store it
      made in a list so the dock's `reset data` can walk them. There is no
      dock here, but there IS one thing that clears the lot — a build that
      succeeded (plan §10 6.7: "kept until built") — so `PressStore.reset()`
      walks the same list. It is a method and not a button.

   THE API, which is Lab.store's, name for name:

       PressStore.store(key, defaults) → {
         get()          the state object itself (not a copy — Lab.store's
                        `get` hands back the live object too, and every
                        caller in this project reads it and then calls
                        update() to change it)
         set(v)         replace, save, tell the subscribers
         update(fn)     fn(state); a returned value replaces the state,
                        `undefined` means "I mutated it in place" — which is
                        lab.js's rule and the one the callers here use
         on(fn)         subscribe; returns the unsubscribe function
         reset()        back to `defaults`, saved
         kept           true when the last write was read back intact
         trouble        null, or a sentence saying what went wrong
       }
       PressStore.reset()      every store this page made, back to defaults
       PressStore.NS           'knoll-press:'
       PressStore.keys()       the keys this page has made, for a test

   `defaults` may be an object or a function returning one, exactly as
   lab.js has it, and a fresh seed is saved AT ONCE — lab.js's comment says
   why ("so seeded dates and ids hold still across reloads") and the Press
   Table has one of those: the moment the rights box is ticked is stamped.

   Pure but for localStorage: no fetch, no DOM, no timers. A private window
   with storage disabled throws on the very first `getItem`, which is caught
   the same way as a full one — the page then runs on memory alone and says
   so once, rather than failing to boot.
   ───────────────────────────────────────────────────────────────────────── */
(function () {
  'use strict';

  const NS = 'knoll-press:';

  /* Every store this page has made, so reset() can walk them (lab.js's
     `stores` array, same job, no dock behind it). */
  const stores = [];
  const names = [];

  function store(key, defaults) {
    const K = NS + key;
    const fresh = () => typeof defaults === 'function' ? defaults() : JSON.parse(JSON.stringify(defaults));

    let state = null, seeded = false;
    try {
      const v = JSON.parse(localStorage.getItem(K));
      if (v && typeof v === 'object') state = v;
    } catch (e) { /* absent, unparseable, or storage refused: all "no saved state" */ }
    if (!state) { state = fresh(); seeded = true; }

    const subs = [];

    /* The write. The throw is swallowed (a quota error must not take the
       keystroke down with it) and then the key is read back, because a
       swallowed error and a successful write look identical from here —
       difference 2 in the header. The comparison is on the STRING that was
       offered, not on a re-parse: a browser that stored it stores it byte
       for byte, so a mismatch means it did not store it. */
    const save = () => {
      let text;
      try { text = JSON.stringify(state); }
      catch (e) { api.kept = false; api.trouble = 'this could not be turned into JSON: ' + ((e && e.message) || e); return; }
      try { localStorage.setItem(K, text); } catch (e) { /* quota, private mode, storage off */ }
      let back = null;
      try { back = localStorage.getItem(K); } catch (e) { back = null; }
      if (back === text) { api.kept = true; api.trouble = null; return; }
      api.kept = false;
      api.trouble = back == null
        ? 'this browser is not keeping ' + K + ' — a reload will lose what is typed'
        : 'this browser kept an older ' + K + ' — the store is full, and a reload will lose what is typed';
    };

    const emit = () => { for (const f of subs.slice()) f(state); };

    const api = {
      kept: true,
      trouble: null,
      get: () => state,
      set: v => { state = v; save(); emit(); },
      update: fn => { const r = fn(state); if (r !== undefined) state = r; save(); emit(); },
      on: f => { subs.push(f); return () => { const i = subs.indexOf(f); if (i >= 0) subs.splice(i, 1); }; },
      reset: () => { state = fresh(); save(); emit(); }
    };

    if (seeded) save();   // lab.js's line, for lab.js's reason: a seeded date holds still across reloads
    stores.push(api);
    names.push(K);
    return api;
  }

  window.PressStore = {
    NS: NS,
    store: store,
    reset: () => { for (const s of stores) s.reset(); },
    keys: () => names.slice(),
    /* true when every store this page made read its last write back */
    kept: () => stores.every(s => s.kept),
    trouble: () => (stores.filter(s => s.trouble)[0] || {}).trouble || null
  };
})();
