/* ─── yard/tools.js — LAB 2's DOCK, ON THE YARD ─────────────────────────────
   The bench's drawing tools — wall.js, tracer.js, stickers.js and gif.js,
   lab2/bench-template's copies, unchanged but for one line in wall.js — laid
   over this page, so a yard can be drawn on, stamped, written on and pinned
   with gifs the way a bench can. Those four files were written against
   window.Lab (lab.js: the bench's camera and paper, 2,400 lines of it);
   this file is the thirty lines of it they actually call, over a page that
   has no camera.

   THE WORLD IS THE CONTENT COLUMN. #bench-world is a box laid over the
   1200px column — 1200 world px wide, the column's height tall — and scaled
   to the column's real width, so a mark made on a wide screen lands on the
   same part of the page on a narrow one; Lab.zoom is that scale. The box
   takes no pointer of its own (index.html's helmet says so), so the page
   under it works exactly as it did; the wall's own svg answers the pointer
   when, and only when, lab.css says a tool is up.

   THE PUBLISHED PAGE. Everything the tools make lives in this browser
   (Lab.store → localStorage, under knoll-yard:), and SAVE YARD posts the
   lot — the wall, the tracing library, where the trees stand, the two
   names — through /api/hill (api/hill.js). On open, the published doc is
   fetched and laid on the paper UNLESS this browser has work of its own on
   it: every write by a hand marks knoll-yard:touched, a publish clears it,
   and a doc is applied only while touched ≤ applied — so a visitor always
   sees the latest page and the owner's unsaved work is never written over.
   `reset data`, on the plot, clears the marks: the published page comes
   back.

   THE FENCE AND THE COUNT go the other way, to the Apps Script that already
   takes the waitlist (apps-script/Code.gs): a visit is one beacon as the
   page is left, a like and a note are one post each. Nothing is sent from
   localhost, or from ?embed=1 — the dashboard's picture of this page.

   WHOSE HILL (2026-09-21). /yard is the signed-in gnome's own page now
   (api/auth.js), so it publishes to their own hill — u-<the account's id>,
   read off the knoll_in cookie — with their session and no key
   (api/hill.js: A YARD OF ONE'S OWN); its fence and its count are theirs
   too. A yard nobody has published yet opens on nothing, not on the copy
   the site ships (that is the owner's 'yard'), and a door that does not
   answer changes nothing on the paper. /YardView keeps 'yard', or whatever
   window.YARD_HILL names.

   ponytail: the owner's hill still wants the owner's key; everybody else's
   wants its owner. */
(function () {
  'use strict';

  const EMBED = /[?&]embed\b/.test(location.search);
  const LOCAL = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
  /* /YardView is a visitor's view (window.YARD_VIEW): its own storage, so their
     edits never land in their own yard, and the owner's latest page always
     wins — a visitor's edits last until the owner saves again. */
  const VIEW = !!window.YARD_VIEW;
  const ME = (/(?:^|;\s*)knoll_in=([0-9a-f]{16})(?:;|$)/.exec(document.cookie) || [])[1] || null;   // see WHOSE HILL
  const HILL = window.YARD_HILL || (!VIEW && ME ? 'u-' + ME : 'yard'), MINE = /^u-/.test(HILL);
  const PREFIX = VIEW ? 'knoll-yardview:' : 'knoll-yard:', WW = 1200;
  // hill.json sits next to this file, whichever page loads it
  const DOOR = '/api/hill', SHIPPED = new URL('hill.json', document.currentScript.src).href;
  // the same deployment coming-soon.html posts the waitlist to; its Code.gs is apps-script/Code.gs
  const HITS = 'https://script.google.com/macros/s/AKfycbyzyF91GruictUGhnX3_N4NwVyNuxLLpGvEUs3Thb3ObeE9MkrFerkvMrBDrPPQfcFr/exec';

  const get = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const set = (k, v) => { try { localStorage.setItem(k, String(v)); } catch (e) {} };
  const del = k => { try { localStorage.removeItem(k); } catch (e) {} };
  const num = k => +get(k) || 0;
  const copy = v => JSON.parse(JSON.stringify(v));

  if (EMBED) document.documentElement.classList.add('yard-embed');

  // ── the world, and the two pills wall.js fills ─────────────────────────
  const world = document.createElement('div');
  world.id = 'bench-world'; world.className = 'yard-world';
  const opts = document.createElement('div');
  opts.id = 'tool-opts'; opts.className = 'tool-opts'; opts.hidden = true; opts.setAttribute('aria-label', 'tool options');
  const dock = document.createElement('div');
  dock.id = 'tool-dock'; dock.className = 'tool-dock'; dock.setAttribute('aria-label', 'drawing tools');
  document.body.append(world, opts, dock);

  let k = 1, H = 600, col = null;
  /* THE LIVE COLUMN, NOT THE TEMPLATE'S. The page's markup stands in the
     document twice for a moment: as the <x-dc> template (display:none) until
     the runtime has fetched React, and then as what React rendered. The first
     .yard-col in the document is the template's — zero wide, and gone the
     instant the runtime replaces <x-dc> — so it is skipped, and a column that
     has left the document is let go of. */
  const liveCol = () => Array.from(document.querySelectorAll('.yard-col')).find(el => el.isConnected && !el.closest('x-dc')) || null;
  const ro = new ResizeObserver(() => layout());
  function layout() {
    if (!col || !col.isConnected) { col = liveCol(); if (!col) return; ro.observe(col); }
    const r = col.getBoundingClientRect();
    if (!(r.width > 0)) return;
    const nk = r.width / WW, nh = Math.max(600, r.height / nk);
    world.style.left = Math.round(r.left + window.scrollX) + 'px';
    world.style.top = Math.round(r.top + window.scrollY) + 'px';
    world.style.width = WW + 'px';
    world.style.height = Math.round(nh) + 'px';
    world.style.transform = 'scale(' + nk.toFixed(5) + ')';
    // where the side panels start: under the house bar (lab.css reads --head-h)
    const head = document.querySelector('.knoll-head');
    if (head) document.documentElement.style.setProperty('--head-h', Math.round(head.getBoundingClientRect().height) + 'px');
    const zoomed = Math.abs(nk - k) > 1e-4;
    k = nk; H = nh;
    document.dispatchEvent(new CustomEvent('lab:room'));
    if (zoomed) document.dispatchEvent(new CustomEvent('lab:zoom', { detail: { zoom: k } }));
  }
  // the column is React's, and React arrives after the runtime has fetched it
  const mo = new MutationObserver(() => { layout(); if (col && col.isConnected) mo.disconnect(); });
  mo.observe(document.documentElement, { childList: true, subtree: true });
  layout();
  window.addEventListener('resize', layout);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => layout());

  // ── Lab: the thirty lines the tools call ────────────────────────────────
  let warnEl = null;
  function warn(text) {
    if (!warnEl) {
      warnEl = document.createElement('div');
      warnEl.className = 'lab-warn';
      warnEl.setAttribute('role', 'alert');
      document.body.appendChild(warnEl);
    }
    warnEl.textContent = text || '';
    warnEl.hidden = !text;
  }

  const stores = [];
  let applying = false;                  // a doc being laid on the paper is not a hand's work
  /* lab.js's store, under this page's prefix — so `reset data` (index.html),
     which sweeps knoll-yard:, takes the wall with it. A write to the wall or
     the library by a hand marks the paper as this browser's own (touched); a
     seed's first save and the gif tool's key do not. */
  function store(key, defaults) {
    const K = PREFIX + key, marks = key === 'wall' || key === 'flatfile';
    const fresh = () => typeof defaults === 'function' ? defaults() : copy(defaults);
    let state = null, seeded = false, full = false;
    try { const v = JSON.parse(get(K)); if (v && typeof v === 'object') state = v; } catch (e) {}
    if (!state) { state = fresh(); seeded = true; }
    const subs = [];
    const save = () => {
      try { localStorage.setItem(K, JSON.stringify(state)); }
      catch (e) {
        full = true;
        warn('this browser’s storage is full — the last change was not saved. Take something off the page (delete it, or undo), or reset data.');
        return false;
      }
      if (full) { full = false; warn(''); }
      return true;
    };
    if (seeded) save();
    const emit = () => subs.forEach(f => f(state));
    const touch = () => { if (marks && !applying) set(PREFIX + 'touched', Date.now()); };
    const api = {
      get: () => state,
      set: v => { state = v; touch(); save(); emit(); },
      update: fn => { const r = fn(state); if (r !== undefined) state = r; touch(); save(); emit(); },
      on: f => { subs.push(f); return () => { const i = subs.indexOf(f); if (i >= 0) subs.splice(i, 1); }; },
      reset: () => { state = fresh(); save(); emit(); }
    };
    stores.push(api);
    return api;
  }

  // the visible part of the column, for gif.js's "middle of the paper"
  const bench = {
    getBoundingClientRect() {
      const r = world.getBoundingClientRect();
      const l = Math.max(r.left, 0), t = Math.max(r.top, 0);
      const rt = Math.min(r.right, window.innerWidth), b = Math.min(r.bottom, window.innerHeight);
      return { left: l, top: t, right: rt, bottom: b, x: l, y: t, width: Math.max(0, rt - l), height: Math.max(0, b - t) };
    }
  };

  const moves = [];                      // wall.js keeps the ink's own stack; this is the other one it compares against
  let clock = 0, uidN = 0;
  const Lab = {
    world, bench,
    get zoom() { return k; },
    get pan() { return { x: 0, y: 0 }; },
    toWorld(cx, cy) { const r = world.getBoundingClientRect(); return { x: (cx - r.left) / k, y: (cy - r.top) / k }; },
    toScreen(wx, wy) { const r = world.getBoundingClientRect(); return { x: r.left + wx * k, y: r.top + wy * k }; },
    reach() { return { x: 0, y: 0, w: WW, h: H }; },
    store, warn, prefix: PREFIX,
    uid: () => (Date.now().toString(36) + (uidN++).toString(36) + Math.floor(Math.random() * 1e6).toString(36)),
    stamp: () => ++clock,
    remember(back) { if (typeof back !== 'function') return; moves.push({ at: ++clock, back }); if (moves.length > 60) moves.shift(); },
    undoTop: () => (moves.length ? moves[moves.length - 1].at : 0),
    undoMove() { const m = moves.pop(); if (!m) return false; m.back(); return true; },
    undo() { if (window.Wall && Wall.undo) return Wall.undo(); return Lab.undoMove(); },
    // the bench's furniture, absent here: no grid to re-cut, no features to register or copy, no menu
    grid() {}, register() {}, place() {}, gizmos: [], isCopy: () => false, deleteCopy: () => false, menuUp: false,
    resetData: () => stores.forEach(s => s.reset())
  };
  window.Lab = Lab;

  const typing = t => !!(t && t.closest && t.closest('input,textarea,select,[contenteditable],[contenteditable="true"]'));
  document.addEventListener('keydown', e => {
    if (!(e.ctrlKey || e.metaKey) || e.shiftKey || e.altKey || typing(e.target)) return;
    if (e.key === 'z' || e.key === 'Z') { e.preventDefault(); Lab.undo(); }
  });

  // ── the published page ──────────────────────────────────────────────────
  let comp = null, pending = null, published = null;

  function apply(doc) {
    if (!doc || !doc.wall || !Array.isArray(doc.wall.items) || !window.Wall || !Wall.store) return false;
    applying = true;
    try {
      if (window.Tracer && Tracer.store) Tracer.store.set(copy(doc.flatfile && Array.isArray(doc.flatfile.list) ? doc.flatfile : { list: [] }));
      Wall.store.set(copy(doc.wall));
      if (comp && comp.applyDoc) comp.applyDoc(doc); else pending = doc;
    } finally { applying = false; }
    if (Wall.paint) Wall.paint();
    set(PREFIX + 'applied', doc.t || 1);
    del(PREFIX + 'touched');
    return true;
  }

  async function seed() {
    let doc = null;
    try {
      const r = await fetch(DOOR + '?hill=' + HILL, { cache: 'no-store' });
      const v = await r.json();
      if (v && v.ok && v.doc) doc = v.doc;
    } catch (e) {}
    if (!doc && !MINE) {                 // no door, or nothing behind it: the copy that shipped with the page (the owner's — see WHOSE HILL)
      try { const r = await fetch(SHIPPED, { cache: 'no-cache' }); if (r.ok) doc = await r.json(); } catch (e) {}
    }
    if (!doc || !doc.wall) return;
    published = doc;
    if (comp) comp.setState({ wallTick: Date.now() });   // the standing reads it (and on /YardView, counts off it)
    const applied = num(PREFIX + 'applied'), touched = num(PREFIX + 'touched');
    if ((doc.t || 1) === applied) return;        // already on this version (apply() writes a t of 0 as 1)
    if (touched > applied && !VIEW) return;       // this browser has work of its own since: keep it — a visitor's never outranks the owner's
    apply(doc);
  }

  function collect() {
    const mine = comp && comp.collectDoc ? comp.collectDoc() : {};
    return Object.assign({
      wall: { items: ((window.Wall && Wall.store && Wall.store.get().items) || []).filter(Boolean) },
      flatfile: { list: (window.Tracer && Tracer.store && Tracer.store.get().list) || [] }
    }, mine);
  }
  const postDoc = (doc, key) => fetch(DOOR, {
    method: 'POST',
    headers: Object.assign({ 'content-type': 'application/json' }, key ? { 'x-knoll-key': key } : {}),
    body: JSON.stringify({ hill: HILL, doc })
  });

  let busy = false;
  /* `say(word, ms)` is the save button's own face (index.html: said()). The
     owner's key is asked for once, the first time the door wants it, and
     kept in this browser under knoll-yard:key — for the owner's hill only: a
     yard of one's own goes on its session, and a 401 there is a sign-in that
     has lapsed, which the door's own words on the button say. */
  async function publish(say) {
    say = say || function () {};
    if (busy) return false;
    busy = true;
    say('saving…', 20000);
    try {
      const doc = collect();
      let key = MINE ? '' : get(PREFIX + 'key') || '';
      let r = await postDoc(doc, key);
      if (r.status === 401 && !MINE) {
        const asked = window.prompt(key ? 'that was not this yard\'s key — the owner\'s key, please:' : 'this yard wants its owner\'s key to publish:');
        if (!asked || !asked.trim()) { say('not saved — no key', 4000); return false; }
        key = asked.trim(); set(PREFIX + 'key', key);
        r = await postDoc(doc, key);
      }
      const v = await r.json().catch(() => ({}));
      if (r.ok && v.ok) {
        set(PREFIX + 'applied', v.t); del(PREFIX + 'touched');
        published = Object.assign({}, doc, { t: v.t, looks: v.looks });
        if (comp) comp.setState({ wallTick: Date.now() });
        say('saved ✓');
        return true;
      }
      if (r.status === 401) del(PREFIX + 'key');
      say('not saved: ' + (v.error || ('the door answered ' + r.status)), 8000);
      return false;
    } catch (e) {
      say('not saved: ' + (e && e.message || e), 8000);
      return false;
    } finally { busy = false; }
  }

  // ── the count, and the fence ────────────────────────────────────────────
  function me() {
    let id = get(PREFIX + 'me');
    if (!id || !/^[a-z0-9]{1,32}$/.test(id)) { id = Lab.uid().replace(/[^a-z0-9]/g, '').slice(0, 24) || ('g' + Date.now().toString(36)); set(PREFIX + 'me', id); }
    return id;
  }
  function beacon() {
    if (EMBED || LOCAL || navigator.webdriver) return;
    const t0 = Date.now();
    let sent = false;
    let coarse = false; try { coarse = matchMedia('(pointer:coarse)').matches; } catch (e) {}
    const dev = coarse ? (window.innerWidth < 700 ? 'mobile' : 'tablet') : 'desktop';
    let ref = '';
    try { const h = new URL(document.referrer).hostname.toLowerCase(); if (h && h !== location.hostname) ref = h.replace(/^www\./, ''); } catch (e) {}
    const send = () => {
      if (sent) return;
      sent = true;
      const body = JSON.stringify({ visit: { hill: HILL, id: me(), dev, ref, secs: Math.round((Date.now() - t0) / 1000) } });
      try {
        if (!navigator.sendBeacon || !navigator.sendBeacon(HITS, body))
          fetch(HITS, { method: 'POST', body, keepalive: true, headers: { 'content-type': 'text/plain;charset=utf-8' } }).catch(() => {});
      } catch (e) {}
    };
    window.addEventListener('pagehide', send);
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') send(); });
  }
  // text/plain keeps these "simple" requests, so the browser skips the CORS preflight Apps Script cannot answer
  const hitsPost = body => fetch(HITS, { method: 'POST', headers: { 'content-type': 'text/plain;charset=utf-8' }, body: JSON.stringify(body) }).then(r => r.json());
  const fence = {
    load: () => fetch(HITS + '?fence=1&hill=' + HILL).then(r => r.json()),
    like: on => hitsPost({ like: { hill: HILL, id: me(), on: on ? 1 : 0 } }),
    note: (name, text) => hitsPost({ note: { hill: HILL, id: me(), name, text } })
  };

  // ── the forest, as the sticker drawer's first kit ───────────────────────
  /* index.html hands over FOREST — the twenty-three drawings the plot is
     planted with — and they become stickers: the same artwork, stamped
     anywhere on the page instead of stood on the plot. Ids are permanent
     (lab2/STICKERS.md §5): a stamp remembers `forest-the-elder`, not a
     drawing, so the tree may be redrawn and every stamp of it follows. */
  const KIT_NAMES = { tree: 'Trees', grass: 'Grass', shroom: 'Mushrooms' };
  function forest(F) {
    if (!Array.isArray(F) || !F.length) return;
    const go = () => {
      if (!window.Stickers) return;
      const kits = [], seen = {};
      F.forEach(p => { if (!seen[p.kind]) { seen[p.kind] = 1; kits.push({ id: 'forest-' + p.kind, name: KIT_NAMES[p.kind] || p.kind }); } });
      Stickers.load({ kits, stickers: F.map(p => ({ id: 'forest-' + p.id, name: p.name, kit: 'forest-' + p.kind, w: p.vw, h: p.vh, d: p.art })) });
    };
    if (window.Stickers) go(); else ready(go);
  }

  // ── the page's component, when it is up ─────────────────────────────────
  function mounted(c) {
    comp = c;
    if (pending) { applying = true; try { c.applyDoc(pending); } finally { applying = false; } pending = null; }
    // the standing, the badges and 'your edits' read the wall: a change to it is a re-render
    if (window.Wall && Wall.store) Wall.store.on(() => { if (comp) comp.setState({ wallTick: Date.now() }); });
  }

  const ready = fn => { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn); else fn(); };

  window.YardTools = {
    forest, mounted, publish, collect, fence, me,
    touch() { if (!applying) set(PREFIX + 'touched', Date.now()); },
    dirty() { return num(PREFIX + 'touched') > num(PREFIX + 'applied'); },
    get published() { return published; },
    get embed() { return EMBED; }
  };

  ready(() => { seed(); beacon(); });
})();
