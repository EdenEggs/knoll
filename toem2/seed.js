/* toem2/seed.js — THE WALL THIS BENCH OPENS ON. (Copied from ironhive/seed.js;
   only its keys, its door and this head differ.)

   Everything on the paper lives in the browser's localStorage, per site and
   per browser (index.html says so at its head), so a page would open on bare
   paper for everyone but the person who arranged it. So the wall ships beside
   the page: wall-seed.json holds the pieces, the tracings some of them are
   stamped from, and the camera, and a browser that has never had a wall of
   its own here opens on it, framed the way it was published.

   WHAT THE SEED IS ON THIS BENCH (2026-09-12): the eight level plates of the
   TOEM 2 level piece kit (Downloads/assets/toem2-level-piece-kit.html) —
   Town Square, Floating Forest, Candlelit Study, Harbour & Jetty, Meadow
   Picnic, Hillside Farm, Rainy Station and Clocktower Rooftops — four across
   and two down, and EVERY PIECE of them its own sticker stamp (k:'d'): each
   slab, patch, wall, roof, stair, doorway and route line, and every sticker
   standing on them, at the place, size, mirror and stacking order the kit's
   own engine gives it, so each one can be picked up and moved on its own.
   The drawings are filed in the drawer, one kit per plate, in
   sticker-kits.json; the seed only names them. Both files were GENERATED
   from the kit, not drawn by hand — see the head of sticker-kits.js.

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

   SAVING IS THE OTHER HALF, and it is the dev server's alone: the save button
   in the header (SAVE, at the foot of this file) posts what is on this paper,
   with the tracings it uses, through /_toem2/wall, and serve.js writes it out
   as toem2/wall-seed.json — commit, push, and that is the wall everyone opens
   on. A camera goes with it as the world point under the middle of the bench,
   the zoom, and the bench's width, so a wider screen shows the same width of
   paper and more of it either side.

   A PHONE GETS ITS OWN FRAMING. The wide view scaled to a phone's width is
   the whole composition at 4%, a map of the place rather than the place —
   so the seed carries a second camera, cam_narrow, and a bench under 700
   wide (the line lab.css stands the zoom dock up at) opens on that one: the
   first plate, Town Square, filling the width. It is published the
   same way, from a window that is itself narrower than 700 — the control
   says "phone view" when it is about to publish that one — and serve.js
   keeps whichever framing the post did not carry. (2026-09-11) */
window.Seed = (function () {
  const KEY = { wall: 'knoll-toem2:wall', flatfile: 'knoll-toem2:flatfile', cam: 'knoll-toem2:cam', mark: 'knoll-toem2:seeded' };
  const FILE = 'wall-seed.json', DOOR = '/_toem2/wall';
  const NARROW = 700;                       // under this the bench is a phone's — the same line as lab.css's zoom dock
  const isNarrow = () => Lab.bench.getBoundingClientRect().width < NARROW;
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
     middle and the same zoom scaled by the bench's width against the one it
     was published from, so the same width of paper is on screen — the wide
     framing only ever scaled DOWN (a wider screen shows more, not bigger),
     the phone framing both ways (a phone is a phone) */
  function frame(seed) {
    const b = Lab.bench.getBoundingClientRect();
    if (b.width < 40 || b.height < 40) return false;
    const narrow = b.width < NARROW && seed.cam_narrow;
    const c = narrow ? seed.cam_narrow : seed.cam;
    if (!c || !isFinite(c.z) || !isFinite(c.cx) || !isFinite(c.cy)) return false;
    const by = c.w > 0 ? b.width / c.w : 1;
    const z = Math.max(0.02, Math.min(4, c.z * (narrow ? by : Math.min(1, by))));
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
    frame(seed);
    mark();
  }
  /* ── SAVE: THE PAPER, WRITTEN INTO THE SITE (2026-09-12) ──────────────────
     What you do on the paper is already kept — in THIS browser's storage,
     every change as it happens. SAVE is the other kind of keeping: the wall as
     it stands goes into toem2/wall-seed.json, the file every first visit opens
     on, which lives in the site rather than in one browser, and deploys with
     it. It is the iron hive's "publish the wall" — the same write through the
     same door — made a button that looks like one, says whether there is
     anything to save, answers to ctrl+s, and says so plainly when it cannot.

     SAVED OR NOT is a comparison with the FILE, not a flag: the pieces and the
     tracings as they stand, against wall-seed.json as it was fetched or as the
     last save wrote it. So an undo back to what was saved reads "saved" again,
     and a browser whose wall was never the file's reads "save changes" from
     the start. Where the camera is looking is not a change.

     THE OPENING VIEW IS KEPT. A save writes the pieces and leaves the view a
     first visit opens on as the file has it — saving while zoomed in on one
     plate should not make everybody open zoomed in on it. SHIFT-click saves
     this view as the opening one too (from a window under 700 wide, the phone
     view; serve.js keeps the other).

     Only on the dev server (html.lab-local): the deployed site has no door to
     write through. And the button stands even when this page's server is
     older than the door, and then says so when pressed — rather than being a
     button that is simply not there. keep.js's "save layout" and its autosave
     pill are not on this bench at all: they save SECTIONS, and it has none. */
  const OLD = 'Not saved: the server running this page is older than its save button. ' +
              'Close that server’s window, open TOEM 2 from its shortcut, and save again.';
  const TITLE = 'save the paper into the site (ctrl+s): every piece as it is now becomes what TOEM 2 opens on. ' +
                'Shift-click to make this view the opening one too.';
  let btn = null, savedPrint = null, savedCam = null, busy = false, settle = 0;
  const round1 = v => Math.round(v * 10) / 10;
  const pieces = () => Wall.store.get().items.filter(Boolean);
  const tracings = () => (window.Tracer && Tracer.store && Tracer.store.get().list) || [];
  const print = (items, list) => JSON.stringify([items, list]);

  // where the bench is looking: the world point under its middle, the zoom, and the bench's width
  function view() {
    const b = Lab.bench.getBoundingClientRect();
    const c = Lab.toWorld(b.left + b.width / 2, b.top + b.height / 2);
    return { z: Math.round(Lab.zoom * 10000) / 10000, cx: round1(c.x), cy: round1(c.y), w: Math.round(b.width) };
  }
  // what a save posts: the pieces and tracings as they stand, and the opening view — the file's,
  // unless this press asked for this one (which under 700 wide is the phone's framing)
  function collect(withView) {
    const own = !!withView || !savedCam;
    return { which: withView && isNarrow() ? 'narrow' : 'wide', cam: own ? view() : savedCam,
             wall: { items: pieces() }, flatfile: { list: tracings() } };
  }
  /* THE BUTTON SAYS ONE SHORT WORD, AND THE SENTENCE GOES UNDERNEATH. The first
     cut put whole sentences on the button ("saved ✓ with this view", "not saved:
     restart the server"), and a wider button squeezed the long hint beside it
     onto more lines: the header grew, and the whole bench slid down and back
     with every save — while a shift-click, measuring the view mid-slide, saved a
     view 20 world px off the one on screen (probe-save.js, 2026-09-12). So the
     button is one fixed width (lab.css) and only says save changes / saving… /
     saved ✓ / saved / not saved, and anything longer is the note hung under it,
     out of the header's flow. */
  function show(state, text, note, bad) {
    if (!btn) return;
    btn.textContent = text;
    btn.className = 'lab-save' + (state ? ' is-' + state : '');
    btn.title = TITLE;
    const n = document.getElementById('toem-save-note');
    if (n) { n.textContent = note || ''; n.hidden = !note; n.classList.toggle('is-bad', !!bad); }
  }
  // saved or not: the paper against the file
  function refresh() {
    if (!btn || busy || settle || !window.Wall || !Wall.store) return;
    const same = savedPrint !== null && print(pieces(), tracings()) === savedPrint;
    show(same ? 'clean' : '', same ? 'saved' : 'save changes');
  }
  async function save(withView) {
    if (!btn || busy || !window.Wall || !Wall.store) return;
    const post = collect(withView);            // what is on screen NOW, before anything on the page changes for the press
    busy = true;
    clearTimeout(settle); settle = 0;
    show('', 'saving…');
    let why = '';
    try {
      const r = await fetch(DOOR, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(post) });
      const out = await r.json().catch(() => null);
      if (!(r.ok && out && out.ok)) why = out && out.error ? out.error : (r.status === 404 ? 'old' : 'the server answered ' + r.status);
    } catch (e) { why = (e && e.message) || String(e); }
    busy = false;
    if (!why) {
      savedPrint = print(post.wall.items, post.flatfile.list);
      if (post.which === 'wide') savedCam = post.cam;
      show('done', 'saved ✓', withView ? 'Saved, with this view as the one ' + (post.which === 'narrow' ? 'a phone opens on.' : 'TOEM 2 opens on.') : '');
    } else if (why === 'old') show('bad', 'not saved', OLD, true);
    else show('bad', 'not saved', 'Not saved: ' + why, true);
    settle = setTimeout(() => { settle = 0; refresh(); }, why ? 8000 : withView ? 3000 : 1800);
  }

  // ONE FETCH OF THE FILE: a first visit opens on it, and the save button measures against it
  const seedP = fetch(FILE, { cache: 'no-cache' }).then(r => r.ok ? r.json() : null).catch(() => null);
  seedP.then(seed => ready(() => {
    if (seed && !driven) apply(seed);
    if (!document.documentElement.classList.contains('lab-local')) return;
    btn = document.getElementById('toem-save');
    if (!btn) return;
    if (seed && seed.wall && Array.isArray(seed.wall.items)) {
      savedPrint = print(seed.wall.items.filter(Boolean), seed.flatfile && Array.isArray(seed.flatfile.list) ? seed.flatfile.list : []);
      savedCam = seed.cam || null;
    }
    btn.hidden = false;
    btn.addEventListener('click', e => save(e.shiftKey));
    if (window.Wall && Wall.store) Wall.store.on(refresh);
    if (window.Tracer && Tracer.store && Tracer.store.on) Tracer.store.on(refresh);
    refresh();
  }));
  /* ctrl+s, on the capture phase like keep.js's — which on this bench has no
     sections to save and does nothing with it. Held down, it saves once. */
  window.addEventListener('keydown', e => {
    if (!(e.ctrlKey || e.metaKey) || e.altKey || e.key.toLowerCase() !== 's') return;
    e.preventDefault();
    if (btn && !e.repeat) save(e.shiftKey);
  }, true);

  return { get had() { return Object.assign({}, had); }, collect, frame, save,
           get saved() { return savedPrint !== null && !!window.Wall && print(pieces(), tracings()) === savedPrint; } };
})();
