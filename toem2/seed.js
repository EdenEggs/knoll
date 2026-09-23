/* toem2/seed.js — THE WALL THIS BENCH OPENS ON, AND THE DOOR IT IS EDITED
   THROUGH. (The first half was copied from ironhive/seed.js — the seed, and
   the dev server's SAVE; the second half, THE LIVE WALL, is this bench's own.)

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

   SAVING IS THE OTHER HALF, and on the dev server it is the file's: the save
   button in the header (SAVE, below) posts what is on this paper, with the
   tracings it uses, through /_toem2/wall, and serve.js writes it out as
   toem2/wall-seed.json — commit, push, and that is the wall a site with no
   door opens on. A camera goes with it as the world point under the middle
   of the bench, the zoom, and the bench's width, so a wider screen shows
   the same width of paper and more of it either side.

   A PHONE GETS ITS OWN FRAMING. The wide view scaled to a phone's width is
   the whole composition at 4%, a map of the place rather than the place —
   so the seed carries a second camera, cam_narrow, and a bench under 700
   wide (the line lab.css stands the zoom dock up at) opens on that one: the
   first plate, Town Square, filling the width. It is published the
   same way, from a window that is itself narrower than 700 — the control
   says "phone view" when it is about to publish that one — and serve.js
   keeps whichever framing the post did not carry. (2026-09-11)

   ── THE LIVE WALL (2026-09-17) ─────────────────────────────────────────────
   Served from the site rather than the dev server, the wall is not a file
   any more: api/wall.js holds ONE document for everybody, with a revision
   number on it, and what this browser opens on is that document as it
   stands. What you do on the paper is still yours, in this browser, as it
   happens; SUBMIT sends the DIFFERENCE — the pieces you changed, whole and by
   name (wall.js: EVERY PIECE HAS A NAME), the ones you took off, and any
   tracing a new stamp needs — measured against the revision this browser
   loaded, which is kept in a store of its own (`base`). The door answers
   LIVE (it is on the wall for everybody, and base moves up), QUEUED (a
   moderator will look; the edit stays on this paper, and the button says so
   until it is decided), or NOT SENT, with the reason. Signing in — a Knoll
   account, made at /signup or opened at /login (2026-09-21; until then a
   Google account, handed over in the address) — is asked for at SUBMIT and
   nowhere else: looking and editing want no account, and the edit waits on
   the paper while you go to the gate and come back, and goes up the moment
   you are back (KEY.resume). The rules — who goes live, who waits, what
   counts as drastic — are the head of api/wall.js.

   THE WALL MOVES UNDER YOU, and that is fine. On focus, and every minute the
   tab is showing, the door is asked whether the revision has moved; if it
   has, the new wall is laid IN PLACE under whatever you have changed: a
   piece you have not touched takes its new record in the SAME SLOT, one
   somebody took off is nulled the way the delete tool nulls, a new one is
   pushed on the end, and yours stay yours — so the pick, a move in flight
   and every undo closure keep the indices they hold. A submit the door
   answers 409 to (somebody changed one of the same pieces) does the same
   and sends again. Two people moving different pieces never collide; two
   moving the same one land in the order they arrived.

   REVIEW is this page too: ?review=<edit id> (or ?review=next) lays a queued
   edit over the paper exactly as it would look — its pieces picked, the
   camera on them, the ones it deletes shown faded rather than gone — with
   approve and reject under the button for a moderator, and close for
   anyone. Leaving puts the paper back to base, so it is refused while you
   have edits of your own unsent.

   WHICH HALF RUNS: the dev server keeps its SAVE-to-file, unless the page is
   opened with ?live=1, which takes the deployed path against the same
   module serve.js mounts; the deployed site is always live, and where its
   door is not there (no store yet, a deploy without the function) it falls
   back to wall-seed.json, read-only, and the button says "offline". */
window.Seed = (function () {
  const KEY = { wall: 'knoll-toem2:wall', flatfile: 'knoll-toem2:flatfile', cam: 'knoll-toem2:cam', mark: 'knoll-toem2:seeded',
                token: 'knoll-toem2:token', resume: 'knoll-toem2:resume', before: 'knoll-toem2:wall-before-live' };
  const FILE = 'wall-seed.json', DOOR = '/_toem2/wall', API = '/api/wall';
  const NARROW = 700;                       // under this the bench is a phone's — the same line as lab.css's zoom dock
  const LOCAL = document.documentElement.classList.contains('lab-local');
  const LIVE = !LOCAL || /[?&]live=1\b/.test(location.search);
  const isNarrow = () => Lab.bench.getBoundingClientRect().width < NARROW;
  const get = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const set = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };
  const del = k => { try { localStorage.removeItem(k); } catch (e) {} };
  // read now, before the stores open — see READ BEFORE THE STORES OPEN
  const had = { wall: get(KEY.wall) != null, cam: get(KEY.cam) != null, mark: get(KEY.mark) != null };
  /* PROBES GET BARE PAPER. Every probe in this folder wipes localStorage and
     reloads to start from nothing, and from here on nothing would be the
     shipped wall under whatever the probe stamps — probe-pick's band found
     itself picking the Iron Hive. Playwright says who it is
     (navigator.webdriver), and the one probe that wants the seed asks for
     it with ?seed=on. People are never driven, so people always get it.
     (The live wall is not a seed: a driven browser gets it like anyone.) */
  const driven = navigator.webdriver === true && !/[?&]seed=on\b/.test(location.search);
  const alive = st => (st && Array.isArray(st.items) ? st.items.filter(Boolean).length : 0);
  const mark = () => set(KEY.mark, new Date().toISOString().slice(0, 10));
  const ready = fn => { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn); else fn(); };
  const copy = v => JSON.parse(JSON.stringify(v));

  /* THE SESSION IS THE SITE'S COOKIE (api/wall.js: THE SITE'S SESSION IS A
     COOKIE): a script never holds it, so this page only knows THAT it is
     signed in — the knoll_in cookie beside it — and the door knows who.
     KEY.token is the dev server's other way in, a Bearer session pasted in
     from toem2/session.js; either will do. */
  const token = () => get(KEY.token);
  const hasSession = () => !!token() || /(?:^|;\s*)knoll_in=[0-9a-f]{16}(?:;|$)/.test(document.cookie);
  const bearer = () => (token() ? { authorization: 'Bearer ' + token() } : {});
  // to the gate, and back here after — with the edit still on the paper, and KEY.resume set to send it
  const toGate = page => () => { set(KEY.resume, '1'); location.assign('/' + page + '/?next=' + encodeURIComponent(location.pathname + location.search)); };
  const GATE = [['log in', toGate('login')], ['sign up', toGate('signup')]];

  // the revision this browser loaded: what SUBMIT measures against (THE LIVE WALL)
  const base = LIVE ? Lab.store('base', () => ({ rev: 0, items: [], art: [] })) : null;

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
    const bare = !had.wall || alive(Wall.store.get()) === 0;
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

     Only on the dev server (html.lab-local), and only when the page is not
     live: the deployed site has no door to write a file through — it has the
     other door, below. The button stands even when this page's server is
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
  const printFile = (items, list) => JSON.stringify([items, list]);

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
     out of the header's flow. The note can carry a button or two (sign in,
     approve, reject): links, set like the row's. */
  function show(state, text, note, bad, actions) {
    if (!btn) return;
    btn.textContent = text;
    btn.className = 'lab-save' + (state ? ' is-' + state : '');
    btn.title = title();
    const n = document.getElementById('toem-save-note');
    if (!n) return;
    n.textContent = note || '';
    (actions || []).forEach(([label, fn]) => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'lab-link'; b.textContent = label;
      b.addEventListener('click', fn);
      n.appendChild(b);
    });
    n.hidden = !note && !(actions && actions.length);
    n.classList.toggle('is-bad', !!bad);
  }
  // saved or not: the paper against the file (the dev server's half)
  function refreshFile() {
    const same = savedPrint !== null && printFile(pieces(), tracings()) === savedPrint;
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
      savedPrint = printFile(post.wall.items, post.flatfile.list);
      if (post.which === 'wide') savedCam = post.cam;
      show('done', 'saved ✓', withView ? 'Saved, with this view as the one ' + (post.which === 'narrow' ? 'a phone opens on.' : 'TOEM 2 opens on.') : '');
    } else if (why === 'old') show('bad', 'not saved', OLD, true);
    else show('bad', 'not saved', 'Not saved: ' + why, true);
    settle = setTimeout(() => { settle = 0; refresh(); }, why ? 8000 : withView ? 3000 : 1800);
  }

  /* ── THE LIVE WALL: the paper against the revision, and SUBMIT ───────────── */
  let me = null, pulling = false, reviewing = null, lastPull = 0, hands = 0;
  const isMod = () => !!me && (me.role === 'mod' || me.role === 'admin');
  const artIds = doc => ((doc && doc.flatfile && doc.flatfile.list) || []).map(t => t.id);
  const canon = rec => JSON.stringify(rec, Object.keys(rec).sort());   // key order is not a change
  const title = () => {
    if (!LIVE) return TITLE;
    const who = me ? 'you: ' + (me.tag || me.name || 'gnome ' + me.id.slice(0, 6)) + ' · ' + me.tier +
                     (me.rep ? ' · ' + me.rep + ' standing day' + (me.rep === 1 ? '' : 's') : '') : 'not signed in';
    return who + ' — submit (ctrl+s) puts what you changed on the wall for everybody' +
           (isMod() ? '; shift-click makes this view the opening one too' : '') + '.';
  };
  // the door's tracings, filed in the library where the library has not got them (a tracing of your own stays)
  function mergeArt(doc) {
    const list = doc && doc.flatfile && doc.flatfile.list;
    if (!list || !list.length || !window.Tracer || !Tracer.store) return;
    const have = new Set((Tracer.store.get().list || []).map(t => t.id));
    const fresh = list.filter(t => t && t.id && !have.has(t.id));
    if (fresh.length) Tracer.store.update(st => { st.list = (st.list || []).concat(copy(fresh)); });
  }
  /* THE PATCH: every piece on the paper that is not, field for field, the
     piece base has under that name — new or changed, the whole record — the
     names base has that the paper has not, and the tracings a new stamp
     wants that the wall has not got. */
  function patch() {
    const b = base.get(), byN = new Map(b.items.map(it => [it.n, it]));
    const put = {}, seen = new Set(), art = [];
    pieces().forEach(it => {
      if (!it.n) return;
      seen.add(it.n);
      const was = byN.get(it.n);
      if (!was || canon(was) !== canon(it)) put[it.n] = it;
    });
    const gone = b.items.map(it => it.n).filter(n => n && !seen.has(n));
    const have = new Set(b.art || []);
    Object.keys(put).forEach(n => {
      const it = put[n];
      if (it.k !== 'i' || have.has(it.f) || art.some(a => a.id === it.f)) return;
      const t = tracings().find(x => x.id === it.f);
      if (t) art.push(t);
    });
    return { base: b.rev, put, del: gone, art };
  }
  const dirty = p => !!(Object.keys(p.put).length || p.del.length);
  const print = p => JSON.stringify([Object.keys(p.put).sort().map(n => canon(p.put[n])), p.del.slice().sort()]);
  const post = body => fetch(API, { method: 'POST', headers: Object.assign({ 'content-type': 'application/json' }, bearer()), body: JSON.stringify(body) })
    .then(r => r.json().catch(() => ({ ok: false, error: 'the door answered ' + r.status })).then(out => Object.assign({ http: r.status }, out)));

  /* THE NEW WALL, LAID UNDER YOUR CHANGES — see THE WALL MOVES UNDER YOU. In
     one write to the store, slot by slot, so nothing that holds an index is
     renamed: yours stay, theirs land in place, the taken-off are nulled, the
     new are pushed on the end. Then base is the new revision. */
  function rebase(doc) {
    if (!doc || !doc.wall || !Array.isArray(doc.wall.items) || !window.Wall || !Wall.store) return;
    const mine = patch();
    const byN = new Map(doc.wall.items.filter(it => it && it.n).map(it => [it.n, it]));
    const had = new Set(base.get().items.map(it => it.n));
    const held = new Set(), gone = new Set(mine.del);
    Wall.store.update(st => {
      st.items.forEach((it, i) => {
        if (!it || !it.n) return;
        // yours stays — unless it was on the wall and somebody took it off since: a delete beats a move, or the piece would come back under your name
        if (mine.put[it.n] && (byN.has(it.n) || !had.has(it.n))) { held.add(it.n); return; }
        const theirs = byN.get(it.n);
        if (theirs) { st.items[i] = copy(theirs); held.add(it.n); }
        else st.items[i] = null;
      });
      byN.forEach((it, n) => { if (!held.has(n) && !gone.has(n)) st.items.push(copy(it)); });
    });
    mergeArt(doc);
    const b = base.get();
    base.set({ rev: doc.rev, items: copy(doc.wall.items.filter(Boolean)), art: artIds(doc), pending: b.pending });
    if (window.Lab && Lab.forget) Lab.forget();
  }
  /* THE FIRST LIVE LOAD: the wall everybody shares replaces whatever this
     browser had — which is kept aside under KEY.before rather than thrown
     away; nothing reads it, a person can. A camera of their own stays where
     they left it. After that, a load is a pull. */
  function applyLive(doc) {
    if (!window.Lab || !window.Wall || !Wall.store) return;
    const b = base.get();
    if (b.rev) { if (doc.rev !== b.rev) rebase(doc); return; }
    const was = Wall.store.get();
    if (alive(was)) set(KEY.before, JSON.stringify(was));
    Wall.store.set(copy(doc.wall));
    mergeArt(doc);
    base.set({ rev: doc.rev, items: copy(doc.wall.items.filter(Boolean)), art: artIds(doc) });
    if (Wall.paint) Wall.paint();
    if (!had.cam) frame(doc);
    mark();
  }
  // what the button says, on the live wall: the paper against base
  function refresh() {
    if (!btn || busy || settle || reviewing || !window.Wall || !Wall.store) return;
    if (!LIVE) return refreshFile();
    const b = base.get();
    if (!b.rev) { show('clean', 'offline'); return; }
    const p = patch();
    if (!dirty(p)) { if (b.pending) base.update(st => { delete st.pending; }); show('clean', 'live'); return; }
    if (b.pending && print(p) === b.pending.print) { show('wait', 'queued'); return; }
    show('', 'submit');
  }
  async function submit(withView) {
    if (!btn || busy || reviewing || !window.Wall || !Wall.store) return;
    let p = patch();
    if (!dirty(p) && !(withView && isMod())) { refresh(); return; }
    if (!hasSession()) {
      show('', 'submit', 'Log in to put this on the wall for everybody — your edit stays on this paper meanwhile, and goes up when you are back.', false, GATE);
      return;
    }
    busy = true;
    clearTimeout(settle); settle = 0;
    show('', 'sending…');
    let out = null;
    try {
      for (let go = 0; go < 3; go++) {
        if (withView && isMod()) { p.cam = view(); p.which = isNarrow() ? 'narrow' : 'wide'; }
        out = await post(Object.assign({ op: 'edit' }, p));
        if (out.http === 409 && out.doc) {           // the wall moved: lay it under what is here, measure again, send again
          rebase(out.doc);
          p = patch();
          if (!dirty(p) && !withView) { out = { ok: true, status: 'live', rev: out.rev, nothing: true }; break; }
          continue;
        }
        break;
      }
    } catch (e) { out = { ok: false, error: (e && e.message) || String(e) }; }
    busy = false;
    if (out.ok && out.status === 'live') {
      const b = base.get();
      const art = (b.art || []).concat(p.art.map(a => a.id)).filter((v, i, a) => a.indexOf(v) === i);
      base.set({ rev: out.rev, items: copy(pieces()), art });
      show('done', 'live ✓', out.nothing ? 'Somebody had already made that change.'
        : withView ? 'On the wall — and this view is the one ' + (p.which === 'narrow' ? 'a phone' : 'TOEM 2') + ' opens on.' : '');
    } else if (out.ok && out.status === 'queued') {
      base.update(st => { st.pending = { id: out.edit, print: print(p), at: Date.now() }; });
      show('wait', 'queued', out.why === 'footprint'
        ? 'You have changed a lot of the wall today, so this one waits for a moderator’s look. It stays on your paper meanwhile.'
        : 'Waiting for a moderator’s look; it shows for everybody once it is approved. It stays on your paper meanwhile.');
    } else if (out.http === 401) {
      del(KEY.token); me = null;
      show('bad', 'not sent', 'Your sign-in has lapsed — log in again to submit; the edit stays on this paper.', true, GATE);
    } else {
      show('bad', 'not sent', 'Not sent: ' + (out.error || 'the door answered ' + out.http) + '.', true);
    }
    settle = setTimeout(() => { settle = 0; refresh(); }, !out.ok ? 8000 : out.status === 'queued' ? 6000 : withView ? 3000 : 1800);
  }
  /* THE PULL: has the revision moved? Asked on focus, on the tab showing
     again, and once a minute while it shows — never while a hand is on the
     paper (a rebase mid-drag would move the ground under it), and at most
     every thirty seconds unless forced. While an edit of yours is queued,
     the same pull asks after it. */
  window.addEventListener('pointerdown', () => { hands++; }, true);
  window.addEventListener('pointerup', () => { hands = Math.max(0, hands - 1); }, true);
  window.addEventListener('pointercancel', () => { hands = Math.max(0, hands - 1); }, true);
  async function pull(force) {
    if (!LIVE || !base || pulling || busy || reviewing || hands || !window.Wall) return false;
    if (!base.get().rev) return false;
    if (!force && Date.now() - lastPull < 30000) return false;
    lastPull = Date.now(); pulling = true;
    let said = null;
    try {
      const pending = base.get().pending;
      if (pending) {
        const r = await fetch(API + '?edit=' + encodeURIComponent(pending.id), { cache: 'no-store' });
        const out = r.ok ? await r.json() : null, ed = out && out.edit;
        if (r.status === 404 || (ed && ed.status !== 'queued')) {
          base.update(st => { delete st.pending; });
          said = ed && ed.status === 'live' ? ['done', 'live ✓', 'Your edit was approved — it is on the wall for everybody.']
               : ['bad', 'not sent', 'Your edit was ' + (ed ? ed.status : 'not kept') + (ed && ed.why ? ': ' + ed.why : '') +
                  '. It is still on your paper — change it and submit again.', true];
        }
      }
      const r = await fetch(API + '?rev=' + base.get().rev, { cache: 'no-store' });
      const out = r.ok ? await r.json() : null;
      if (out && out.ok && !out.same && out.wall && out.rev !== base.get().rev) rebase(out);
    } catch (e) {}
    pulling = false;
    if (said) { clearTimeout(settle); show.apply(null, said); settle = setTimeout(() => { settle = 0; refresh(); }, 6000); }
    else refresh();
    return true;
  }
  async function whoami() {
    me = null;
    if (!hasSession()) return;
    try {
      // the account's name was chosen at the gate (/signup), so nothing is asked here any more
      const r = await fetch(API + '?me=1', { headers: bearer(), cache: 'no-store' });
      if (r.status === 401) { del(KEY.token); return; }
      const out = r.ok ? await r.json() : null;
      me = out && out.ok ? out : null;
    } catch (e) { me = null; }
    if (btn) btn.title = title();
  }

  /* ── REVIEW: a queued edit, laid over the paper ────────────────────────── */
  async function review(id) {
    if (!LIVE || !base || !window.Wall || busy) return;
    if (reviewing) leave();
    if (dirty(patch())) { show('bad', 'not sent', 'Submit or undo your own edits before reviewing one.', true); settleIn(6000); return; }
    let ed = null;
    try {
      if (id === 'next') {
        const q = await fetch(API + '?queue=1', { cache: 'no-store' }).then(r => r.json());
        id = q && q.queue && q.queue[0] ? q.queue[0].id : null;
      }
      if (id) { const out = await fetch(API + '?edit=' + encodeURIComponent(id), { cache: 'no-store' }).then(r => r.json()); ed = out && out.edit; }
    } catch (e) {}
    if (!ed) { show('clean', 'live', id ? 'No such edit.' : 'The queue is empty — nothing is waiting for a look.'); settleIn(4000); return; }
    if (ed.status !== 'queued') { show('clean', 'live', 'That edit is already ' + ed.status + '.'); settleIn(4000); return; }
    const touched = new Set(), added = [];
    if (ed.art && ed.art.length && window.Tracer && Tracer.store) {       // the tracings it brings, filed for the look and taken out after
      const have = new Set((Tracer.store.get().list || []).map(t => t.id));
      const fresh = ed.art.filter(t => t && t.id && !have.has(t.id));
      if (fresh.length) { Tracer.store.update(st => { st.list = (st.list || []).concat(copy(fresh)); }); fresh.forEach(t => added.push(t.id)); }
    }
    Wall.store.update(st => {
      const byN = new Map();
      st.items.forEach((it, i) => { if (it && it.n) byN.set(it.n, i); });
      Object.keys(ed.put).forEach(n => { const rec = copy(ed.put[n]), i = byN.get(n); if (i != null) st.items[i] = rec; else st.items.push(rec); touched.add(n); });
      (ed.del || []).forEach(n => { const i = byN.get(n); if (i != null && st.items[i]) { st.items[i].o = 2; touched.add(n); } });   // faded, not gone: a delete you can see
    });
    reviewing = { id: ed.id, added };
    base.update(st => { st.review = { added }; });   // written down: a page left mid-review puts the paper back at its next load
    Wall.pickN(touched);
    Wall.fitPick();
    const who = (ed.name || 'gnome ' + String(ed.by).slice(0, 6)) + ' (' + String(ed.by).slice(0, 6) + ')';
    const what = Object.keys(ed.put).length + ' changed · ' + (ed.del || []).length + ' deleted (shown faded)' + ((ed.art || []).length ? ' · ' + ed.art.length + ' tracings' : '');
    show('', 'reviewing', who + ' — ' + ed.cls + ': ' + what + (isMod() ? '' : ' · a moderator decides'), false,
         isMod() ? [['approve', () => decide('approve')], ['reject', () => decide('reject')], ['close', leave]] : [['close', leave]]);
  }
  function leave() {
    if (!reviewing) return;
    const gone = new Set(reviewing.added);
    reviewing = null;
    base.update(st => { delete st.review; });
    Wall.store.set({ items: copy(base.get().items) });
    if (gone.size && window.Tracer && Tracer.store) Tracer.store.update(st => { st.list = (st.list || []).filter(t => !gone.has(t.id)); });
    Wall.clearPick();
    try { history.replaceState(null, '', location.pathname); } catch (e) {}
    refresh();
  }
  async function decide(what) {
    if (!reviewing || busy) return;
    const id = reviewing.id;
    const why = what === 'reject' && !driven ? (prompt('Why? (shown to whoever made it — optional)') || '') : '';
    busy = true;
    show('', 'sending…');
    let out;
    try { out = await post({ op: 'review', edit: id, do: what, why }); } catch (e) { out = { ok: false, error: (e && e.message) || String(e) }; }
    busy = false;
    leave();
    if (out.ok) {
      await pull(true);
      clearTimeout(settle);
      show(what === 'approve' ? 'done' : 'clean', what === 'approve' ? 'live ✓' : 'rejected',
           what === 'approve' ? 'Approved — it is on the wall for everybody.' : 'Rejected.', false, [['next', () => review('next')]]);
    } else show('bad', 'not sent', 'Not decided: ' + (out.error || 'the door answered ' + out.http) + '.', true);
    settleIn(6000);
  }
  const settleIn = ms => { clearTimeout(settle); settle = setTimeout(() => { settle = 0; refresh(); }, ms); };

  /* ── ONE FETCH OF THE WALL ────────────────────────────────────────────────
     Live: the door, and where it does not answer, the file, read-only.
     Local: the file — a first visit opens on it, and the save button
     measures against it. */
  const fromFile = () => fetch(FILE, { cache: 'no-cache' }).then(r => (r.ok ? r.json() : null)).catch(() => null);
  const fromDoor = () => fetch(API, { cache: 'no-store' }).then(r => (r.ok ? r.json() : null)).catch(() => null)
    .then(d => (d && d.ok !== false && Number.isFinite(d.rev) && d.wall && Array.isArray(d.wall.items) ? d : null));
  const seedP = LIVE ? fromDoor().then(d => d || fromFile().then(s => (s ? Object.assign(s, { rev: 0, readonly: true }) : null))) : fromFile();
  seedP.then(seed => ready(() => {
    btn = document.getElementById('toem-save');
    if (!LIVE) {
      if (seed && !driven) apply(seed);
      if (!LOCAL || !btn) return;
      if (seed && seed.wall && Array.isArray(seed.wall.items)) {
        savedPrint = printFile(seed.wall.items.filter(Boolean), seed.flatfile && Array.isArray(seed.flatfile.list) ? seed.flatfile.list : []);
        savedCam = seed.cam || null;
      }
      btn.hidden = false;
      btn.addEventListener('click', e => save(e.shiftKey));
      if (window.Wall && Wall.store) Wall.store.on(refresh);
      if (window.Tracer && Tracer.store && Tracer.store.on) Tracer.store.on(refresh);
      refresh();
      return;
    }
    // THE LIVE WALL
    if (!seed || !window.Wall || !Wall.store) return;
    document.documentElement.classList.add('lab-live');
    if (!seed.rev) {                                       // no door: the shipped wall, read-only
      if (!driven) apply(seed);
      if (btn) { btn.hidden = false; btn.disabled = true; btn.title = 'Editing is offline right now — this is the wall as last published.'; show('clean', 'offline'); }
      return;
    }
    /* A REVIEW LEFT BY NAVIGATING AWAY (or a reload mid-review) is still on
       the paper: the edit's pieces laid over base, which the next patch()
       would take for this browser's own. Base is put back FIRST — before
       applyLive, whose rebase would otherwise hold those pieces as "mine". */
    const left = base.get().review;
    if (left) {
      Wall.store.set({ items: copy(base.get().items) });
      if (left.added && left.added.length && window.Tracer && Tracer.store) { const gone = new Set(left.added); Tracer.store.update(st => { st.list = (st.list || []).filter(t => !gone.has(t.id)); }); }
      base.update(st => { delete st.review; });
    }
    applyLive(seed);
    if (btn) { btn.hidden = false; btn.addEventListener('click', e => submit(e.shiftKey)); }
    window.addEventListener('pagehide', () => { if (reviewing) leave(); });
    Wall.store.on(refresh);
    if (window.Tracer && Tracer.store && Tracer.store.on) Tracer.store.on(refresh);
    refresh();
    whoami().then(() => {
      const m = /[?&]review=([^&]+)/.exec(location.search);
      if (m) review(decodeURIComponent(m[1]));
      else if (get(KEY.resume)) { del(KEY.resume); if (me) submit(false); }
      else refresh();
    });
    window.addEventListener('focus', () => { pull(); });
    document.addEventListener('visibilitychange', () => { if (!document.hidden) pull(); });
    setInterval(() => { if (!document.hidden) pull(); }, 60000);
  }));
  /* ctrl+s, on the capture phase like keep.js's — which on this bench has no
     sections to save and does nothing with it. Held down, it saves once. */
  window.addEventListener('keydown', e => {
    if (!(e.ctrlKey || e.metaKey) || e.altKey || e.key.toLowerCase() !== 's') return;
    e.preventDefault();
    if (btn && !e.repeat) (LIVE ? submit : save)(e.shiftKey);
  }, true);

  return { get had() { return Object.assign({}, had); }, collect, frame, save,
           get saved() { return savedPrint !== null && !!window.Wall && printFile(pieces(), tracings()) === savedPrint; },
           // the live half, for the probes and the console
           LIVE, patch, submit, pull, review, leave, rebase,
           get base() { return base ? base.get() : null; },
           get me() { return me; },
           get reviewing() { return !!reviewing; } };
})();
