/* ironhive/seed.js — THE WALL THIS BENCH OPENS ON.

   Everything on the paper lives in the browser's localStorage, per site and
   per browser (index.html says so at its head), so the deployed page opened
   on bare paper for everyone but the person who built the wall — and this
   page is the Iron Hive's, built to be arrived at. So the wall ships beside
   the page after all: wall-seed.json holds the pieces, the tracings some of
   them are stamped from, and the camera, and a browser that has never had a
   wall of its own here opens on it, framed the way it was published.

   ONCE, AND ONLY WHERE THERE IS NOTHING. The seed goes on the first time
   this browser comes to the page — no wall store yet, or one with nothing
   live on it, and no mark from an earlier visit — and what the visitor does
   after that is theirs and is never written over: a wall they cleared stays
   cleared, a camera they moved stays where they left it. The mark is a
   plain key and not a Lab.store, so "reset data" wipes the paper and leaves
   the mark standing: a reset means bare paper, not the shipped wall back.

   READ BEFORE THE STORES OPEN. Lab.store writes a fresh, empty store the
   moment it is opened ("a fresh seed persists at once", it says), so whether
   this browser HAD a wall has to be read before wall.js and tracer.js run —
   which is why this file is loaded straight after lab.js. The seed is
   fetched then and applied when it lands, by which time both have run; if
   the fetch beats the parser, the apply waits for DOMContentLoaded.

   PUBLISHING IS THE OTHER HALF, and it is the dev server's alone. Served by
   serve.js (html.lab-local) the tools row gains "publish the wall": one press
   posts what is on this paper, with the tracings it uses and the camera as
   it stands, through /_ironhive/wall, and serve.js writes it out as
   ironhive/wall-seed.json — commit, push, and that is the wall everyone opens
   on. The camera is kept as the world point under the middle of the bench,
   the zoom, and the bench's width when it was published, so a narrower screen
   shows the same width of paper rather than a slice of it. (2026-09-11) */
window.Seed = (function () {
  const KEY = { wall: 'knoll-ironhive:wall', flatfile: 'knoll-ironhive:flatfile', cam: 'knoll-ironhive:cam', mark: 'knoll-ironhive:seeded' };
  const FILE = 'wall-seed.json', DOOR = '/_ironhive/wall';
  const get = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  // read now, before the stores open — see READ BEFORE THE STORES OPEN
  const had = { wall: get(KEY.wall) != null, cam: get(KEY.cam) != null, mark: get(KEY.mark) != null };
  /* PROBES GET BARE PAPER. Every probe in this folder wipes localStorage and
     reloads to start from nothing, and from here on nothing would be the
     shipped wall under whatever the probe stamps — probe-pick's band found
     itself picking the Iron Hive. Playwright says who it is
     (navigator.webdriver), and the one probe that wants the seed asks for
     it with ?seed=on. People are never driven, so people always get it. */
  const driven = navigator.webdriver === true && !/[?&]seed=on\b/.test(location.search);
  const live = st => (st && Array.isArray(st.items) ? st.items.filter(Boolean).length : 0);
  const mark = () => { try { localStorage.setItem(KEY.mark, new Date().toISOString().slice(0, 10)); } catch (e) {} };
  const ready = fn => { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn); else fn(); };

  /* the camera as published, on this bench: the same world point under the
     middle and the same zoom, scaled down on a bench narrower than the one
     it was published from so the same width of paper is on screen */
  function frame(c) {
    if (!c || !isFinite(c.z) || !isFinite(c.cx) || !isFinite(c.cy)) return false;
    const b = Lab.bench.getBoundingClientRect();
    if (b.width < 40 || b.height < 40) return false;
    const z = Math.max(0.02, Math.min(4, c.z * (c.w > 0 ? Math.min(1, b.width / c.w) : 1)));
    if (Lab.forget) Lab.forget();                          // the paper has just changed shape
    Lab.camTo(z, b.width / 2 - c.cx * z, b.height / 2 - c.cy * z, 0);
    return true;
  }

  function apply(seed) {
    if (!window.Lab || !window.Wall || !Wall.store) return;
    const bare = !had.wall || live(Wall.store.get()) === 0;
    if (had.mark || !bare) { mark(); return; }             // a wall of their own, or a visit before this: leave it
    const wall = seed && seed.wall && Array.isArray(seed.wall.items) ? seed.wall : null;
    if (!wall) return;
    Wall.store.set(JSON.parse(JSON.stringify(wall)));      // a copy — the seed object is nobody's to keep mutating
    const ff = seed.flatfile && Array.isArray(seed.flatfile.list) ? seed.flatfile : null;
    if (ff && window.Tracer && Tracer.store && !(Tracer.store.get().list || []).length) Tracer.store.set(JSON.parse(JSON.stringify(ff)));
    if (Wall.paint) Wall.paint();                          // the stamps from the tracings, now the library has them
    frame(seed.cam);
    mark();
  }
  if (!driven) fetch(FILE, { cache: 'no-cache' }).then(r => r.ok ? r.json() : null).then(seed => { if (seed) ready(() => apply(seed)); }).catch(() => {});

  // ── publishing, on the dev server only ──────────────────────────────────
  let btn = null;
  function collect() {
    const b = Lab.bench.getBoundingClientRect();
    const c = Lab.toWorld(b.left + b.width / 2, b.top + b.height / 2);
    const round = v => Math.round(v * 10) / 10;
    return { cam: { z: Math.round(Lab.zoom * 10000) / 10000, cx: round(c.x), cy: round(c.y), w: Math.round(b.width) },
             wall: { items: Wall.store.get().items.filter(Boolean) },
             flatfile: { list: (window.Tracer && Tracer.store && Tracer.store.get().list) || [] } };
  }
  async function publish() {
    if (!btn) return;
    btn.disabled = true; btn.textContent = 'publishing…';
    try {
      const r = await fetch(DOOR, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(collect()) });
      const v = await r.json().catch(() => ({}));
      btn.textContent = r.ok && v.ok ? 'published — ' + v.pieces + ' pieces on the wall' : 'not published: ' + (v.error || r.status);
    } catch (e) { btn.textContent = 'not published: ' + e.message; }
    btn.disabled = false;
    setTimeout(() => { if (btn) btn.textContent = 'publish the wall'; }, 5000);
  }
  if (document.documentElement.classList.contains('lab-local')) {
    fetch(DOOR, { method: 'GET' }).then(r => r.ok ? r.json() : null).then(v => {
      if (!v || !v.door) return;
      ready(() => { btn = document.getElementById('lab-seed'); if (!btn) return; btn.hidden = false; btn.addEventListener('click', publish); });
    }).catch(() => {});
  }

  return { get had() { return Object.assign({}, had); }, collect, frame };
})();
