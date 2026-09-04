/* ─── THE + TOOL ──────────────────────────────────────────────────────────
   The fifth thing on the dock: a plus. Press it and a sheet comes up over the
   bench with two ways to get a picture onto the paper — one off your own
   machine, one out of KLIPY — and whatever you choose lands where you asked
   for it and stays on the pointer, so a second click puts up another.

   IT DOES NOT KEEP A SECOND LIST OF PICTURES
     Pictures on this bench already have a home: THE ZOETROPE (KN-0013) holds
     them, drags them, dresses them up, takes them down, and gives the owner
     the size they land at and the switch that locks the drum. So the + tool
     owns none of that. It is a way IN — the sheet, the search, the key — and
     everything it finds is handed to Zoetrope.take / Zoetrope.takeRemote and
     becomes an ordinary pin. Undo on the dock reaches it (see wall.js's
     trail), the drum's list shows it, the drum's × takes it down.

   TWO KINDS OF PICTURE, KEPT TWO DIFFERENT WAYS
     A file off this device is read, shrunk and kept as a data-url, because
     there is nowhere to upload it to. A gif out of KLIPY is NOT copied here:
     what is kept is the URL they answered with, and the browser fetches the
     strip from them whenever it is looked at. That is their terms — a
     provider's media is linked, never re-hosted — and it is also why a 3MB
     strip that could never be kept costs about sixty characters.

   WHY KLIPY, AND WHY IT WANTS A KEY
     Tenor's public API shut down in June 2026. GIPHY charges for a production
     key and its old public beta one (dc6zaTOxFJmzC) is banned — asked in
     August 2026 it answers 403 BANNED. KLIPY is ex-Tenor people with a
     near-identical API: free, 100 calls an hour on a test key and no cap at
     all once you ask them for a production one, which is why the search here
     is theirs. So there is no key to ship and none is pretended: paste your
     own in the sheet and it is kept in this store, on this device.

     A key in a page with no server is readable by anyone using that browser.
     That is the honest place for a capped test key and the wrong place for
     anything else, and the sheet says so.

     Their terms shape three things here worth keeping: the request goes
     straight from the visitor's own browser and is never proxied (KLIPY
     REQUIRE that — it is how their ranking sees a real person, which is also
     why every call carries a per-window customer_id); results are rendered in
     the ORDER THEY ARRIVE with no filtering of our own; and their mark is on
     the sheet whenever their results are.

   State is Lab.store('picture'): the key and the last thing searched for.
   The picture on the pointer is a mood, not a document — it lives for the
   session, the way the dock's other settings do. */

window.Picture = (function () {
  const $ = id => document.getElementById(id);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g,
    c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // the key goes in the PATH, not the query string — .../api/v1/<key>/gifs/…
  const API = 'https://api.klipy.co/api/v1/';
  const LIMIT = 24;
  const RECENT = 6;                     // how many stay on the dock, this session only

  const store = Lab.store('picture', () => ({ key: '', last: '' }));
  const S = () => store.get();

  const Z = () => window.Zoetrope;      // loaded before this file, but never assumed
  const isMod = () => Lab.role === 'moderator' || Lab.role === 'owner';

  // what the next click on the paper will put up, and what has been up already
  let armed = null, recent = [], pendingAt = null;
  let results = [], job = null, busy = false;

  /* The drum can be locked to visitors by its owner, and the + tool is still
     the drum — so it answers the same way rather than quietly doing nothing. */
  function locked() {
    const z = Z();
    if (!z) return 'the drum is not on the bench.';
    if (!z.store.get().cfg.open && !isMod()) return 'the owner has the drum locked.';
    return '';
  }

  /* ── the sheet ──────────────────────────────────────────────────────────
     Built once, the first time it is asked for, and parked in the page rather
     than in the world: it is a panel about the bench, not a thing on it, so it
     holds still while the camera moves — the same way the dock does. */
  let sheet = null, tab = 'device';

  function build() {
    if (sheet) return sheet;
    sheet = document.createElement('div');
    sheet.className = 'pic-sheet';
    sheet.hidden = true;
    sheet.setAttribute('aria-label', 'put a picture up');
    sheet.innerHTML =
      '<div class="pic-top">' +
        '<div class="pic-tabs" role="tablist">' +
          '<button type="button" class="pic-tab" data-pic-tab="device" role="tab">this device</button>' +
          '<button type="button" class="pic-tab" data-pic-tab="klipy" role="tab">klipy</button>' +
        '</div>' +
        '<button type="button" class="pic-shut" aria-label="close">×</button>' +
      '</div>' +

      '<div class="pic-pane" data-pane="device">' +
        '<div class="pic-drop" id="pic-drop">' +
          '<svg class="pic-drop-icon" viewBox="0 0 40 30" width="38" height="29" aria-hidden="true">' +
            '<rect x="1.5" y="1.5" width="37" height="27" rx="4"/>' +
            '<path d="M1.5 22 12 12l7.5 7 6-5 13 8"/><circle cx="27" cy="9" r="3"/></svg>' +
          '<b>drop a picture here</b>' +
          '<small>png · jpeg · gif · webp · avif · svg</small>' +
          '<button type="button" class="pic-go">choose a file</button>' +
          '<input type="file" class="pic-file" hidden ' +
            'accept="image/png,image/jpeg,image/gif,image/webp,image/avif,image/svg+xml">' +
        '</div>' +
        '<p class="pic-fine">a still is shrunk to 900px and kept on this device. a gif is kept ' +
          'whole — a canvas would keep frame one and throw the strip away — so it has to be ' +
          'under 900KB. nothing is uploaded anywhere; there is nowhere to upload it to.</p>' +
      '</div>' +

      '<div class="pic-pane" data-pane="klipy" hidden>' +
        '<form class="pic-search">' +
          '<input type="search" class="pic-q" placeholder="search for a gif…" maxlength="60" ' +
            'aria-label="search klipy" autocomplete="off">' +
          '<button type="submit" class="pic-go">search</button>' +
        '</form>' +
        '<div class="pic-grid" role="list"></div>' +
        '<div class="pic-key" hidden>' +
          '<label>KLIPY KEY<input type="text" class="pic-keyin" placeholder="paste an app key" ' +
            'spellcheck="false" autocomplete="off"></label>' +
          '<button type="button" class="pic-go pic-keysave">keep it</button>' +
          '<p class="pic-fine">free from <a href="https://klipy.com/developers" target="_blank" ' +
            'rel="noopener">klipy.com/developers</a> — 100 calls an hour on a test key, no cap ' +
            'once you ask for a production one. it is kept on this device only, and anyone using ' +
            'this browser can read it, so put a test key here rather than a live one.</p>' +
        '</div>' +
        '<p class="pic-mark">gifs by <a href="https://klipy.com/" target="_blank" ' +
          'rel="noopener">KLIPY</a><button type="button" class="pic-linky" data-pic-key>key</button></p>' +
      '</div>' +

      '<p class="pic-say" role="status"></p>';

    document.body.appendChild(sheet);
    wire();
    return sheet;
  }

  const q = sel => sheet.querySelector(sel);

  function say(msg, kind) {
    if (!sheet) return;
    const p = q('.pic-say');
    p.textContent = msg || '';
    p.className = 'pic-say' + (kind ? ' pic-' + kind : '');
  }

  function showTab(t) {
    tab = t;
    sheet.querySelectorAll('[data-pic-tab]').forEach(b =>
      b.setAttribute('aria-selected', String(b.dataset.picTab === t)));
    sheet.querySelectorAll('[data-pane]').forEach(p => { p.hidden = p.dataset.pane !== t; });
    say('');
    if (t === 'klipy') {
      keyRow(!S().key);
      if (!results.length) trending();
      setTimeout(() => { const i = q('.pic-q'); if (i) i.focus(); }, 0);
    }
  }

  function keyRow(on) {
    const row = q('.pic-key');
    row.hidden = !on;
    if (on) { const i = q('.pic-keyin'); i.value = S().key || ''; setTimeout(() => i.focus(), 0); }
  }

  function open(at) {
    build();
    const why = locked();
    pendingAt = at || null;
    sheet.hidden = false;
    showTab(tab);
    if (why) say(why, 'warn');
    return true;
  }

  // returns whether it actually shut something, so escape can close the sheet
  // first and only drop the tool on the second press (see wall.js)
  function shut() {
    if (!sheet || sheet.hidden) return false;
    sheet.hidden = true;
    if (job) { job.abort(); job = null; }
    return true;
  }

  /* ── what a chosen picture does ─────────────────────────────────────────
     It goes up straight away, in the middle of what the camera is looking at
     (or where the paper was clicked, if that is what opened the sheet), and
     then STAYS ON THE POINTER: the tool is armed with it, so a click on the
     paper puts up another. That is the sticker tool's habit, and it is the
     reason the + tool is on the dock rather than being a button in a panel. */
  function arm(rec) {
    armed = rec;
    recent = [rec].concat(recent.filter(r => r.url !== rec.url)).slice(0, RECENT);
    if (window.Wall && Wall.syncOpts) Wall.syncOpts();
  }

  function landed(p) {
    if (!p) return;
    if (window.Wall && Wall.mark) Wall.mark('pic', p.pid);   // so the dock's undo reaches it
    pendingAt = null;
  }

  /* ── off this device ────────────────────────────────────────────────────
     The drum owns every rule about what a file may be and how big — this only
     hands the file over and repeats what comes back. */
  async function takeFile(file) {
    const z = Z();
    if (!z || busy) return;
    busy = true;
    try {
      const p = await z.take(file, pendingAt, say);
      if (!p) return;
      arm({ url: p.url, w: p.w, h: p.h, title: p.title, kind: p.kind });
      landed(p);
    } finally { busy = false; }
  }

  /* ── out of KLIPY ───────────────────────────────────────────────────────
     One request at a time: a new search aborts the one still in the air, or a
     slow answer to "gn" lands on top of the answer to "gnome".

     The key rides in the PATH — /api/v1/<key>/gifs/search — and customer_id is
     a stable per-window handle, which their ranking wants and their terms ask
     for. Nothing about the person goes with it: it is the same throwaway id
     the terminal gives a window, not a name, an email or a device fingerprint.

     An answer is unwrapped rather than assumed. Providers move a list about
     between .data, .data.data and .result over the years, so the reader looks
     for the first array of objects it recognises instead of trusting one
     shape and breaking silently on the day it changes. */
  const CUST = 'knoll-lab-' + Math.random().toString(36).slice(2, 12);

  const listOf = body => {
    for (const v of [body && body.data, body && body.data && body.data.data,
                     body && body.result, body && body.results, body])
      if (Array.isArray(v) && (!v.length || typeof v[0] === 'object')) return v;
    return null;
  };

  async function ask(path, params) {
    const key = (S().key || '').trim();
    if (!key) { keyRow(true); throw new Error('klipy wants a key of its own — paste one below.'); }
    if (job) job.abort();
    job = new AbortController();
    const url = API + encodeURIComponent(key) + '/gifs/' + path + '?' + new URLSearchParams(
      Object.assign({ per_page: LIMIT, page: 1, customer_id: CUST, content_filter: 'high' }, params));
    /* A cross-origin fetch that fails tells the page almost nothing — the
       browser hands back one opaque error whether the wire is down, the reply
       carried no CORS header, or the key was wrong. KLIPY's own "that key is
       invalid" comes back as a 404 with no such header, so the commonest
       cause of landing here is a bad key, and that is what it says first.
       Guessing precisely would be inventing detail we do not have. */
    let r;
    try { r = await fetch(url, { signal: job.signal }); }
    catch (e) {
      if (e && e.name === 'AbortError') return null;
      keyRow(true);
      throw new Error('the browser could not read klipy’s answer. usually that is the key; ' +
        'it can also be the connection. a free key comes from klipy.com/developers.');
    }
    const body = await r.json().catch(() => null);
    const msg = body && body.errors && body.errors.message;
    const why = Array.isArray(msg) ? msg[0] : msg;
    // a bad key is a 404 here rather than a 401, since the key IS the path
    if (r.status === 401 || r.status === 403 ||
        (r.status === 404 && /key/i.test(String(why || '')))) {
      keyRow(true);
      throw new Error('klipy refused that key. a free one comes from klipy.com/developers.');
    }
    if (r.status === 429) throw new Error('a test key does 100 calls an hour and this one has had them. try later.');
    const list = r.ok && body && body.result !== false ? listOf(body) : null;
    if (!list) throw new Error('klipy said ' + (why || r.status) + '.');
    return list;
  }

  /* Which copy of a gif to use. KLIPY files them by size (sm / md / hd) and
     then by kind (gif / webp / mp4), and a strip we can pin has to be one an
     <img> will play — so mp4 is passed over however small it is. If none of
     the expected places has one, the item is walked for anything that looks
     like a still picture, which is cheaper than being wrong about their shape. */
  const PLAY = /\.(gif|webp|png|jpe?g)(\?|$)/i;

  function pickFile(it, sizes) {
    const f = it && (it.file || it.files || it.media || it.images) || {};
    for (const sz of sizes) {
      const bag = f[sz] || (it && it[sz]);
      if (!bag) continue;
      for (const kind of ['gif', 'webp', 'png', 'jpg']) {
        const r = bag[kind];
        if (r && r.url) return { url: r.url, width: +r.width || 0, height: +r.height || 0 };
      }
      if (bag.url && PLAY.test(bag.url)) return { url: bag.url, width: +bag.width || 0, height: +bag.height || 0 };
    }
    return deepFind(it, 0);
  }

  // last resort: the first url in the object that a browser would animate
  function deepFind(o, depth) {
    if (!o || typeof o !== 'object' || depth > 4) return null;
    if (typeof o.url === 'string' && PLAY.test(o.url))
      return { url: o.url, width: +o.width || 0, height: +o.height || 0 };
    for (const k in o) { const hit = deepFind(o[k], depth + 1); if (hit) return hit; }
    return null;
  }

  const thumbOf = it => pickFile(it, ['sm', 'small', 'xs', 'md', 'medium', 'hd', 'original']);
  const fullOf = it => pickFile(it, ['md', 'medium', 'sm', 'small', 'hd', 'original']);
  const titleOf = it => (it && (it.title || it.slug || it.name)) || 'a gif';

  async function search(term) {
    const t = String(term || '').trim();
    // no key is not a failure, it is the next thing to do — so it is asked for
    // in the same voice the sheet asks for anything else
    if (!(S().key || '').trim()) {
      keyRow(true);
      say('klipy wants a key of its own — a free one goes in below.', 'warn');
      return;
    }
    store.update(st => { st.last = t; });
    say(t ? 'looking for “' + t + '”…' : 'fetching what is trending…');
    try {
      const data = t ? await ask('search', { q: t, locale: 'en' }) : await ask('trending', {});
      if (!data) return;                              // aborted by the next search
      results = data;
      grid();
      say(data.length ? '' : 'klipy has nothing for that word.', data.length ? '' : 'warn');
    } catch (e) {
      results = []; grid();
      say((e && e.message) || 'that search went nowhere.', 'bad');
    }
  }

  const trending = () => search(S().last || '');

  /* In the order they arrived. Sorting or dropping any of it would be putting
     our own judgement over the provider's rating filter, which their terms do
     not allow and we are in no position to do better at anyway. */
  function grid() {
    const g = q('.pic-grid');
    if (!results.length) { g.innerHTML = ''; return; }
    g.innerHTML = results.map((it, i) => {
      const th = thumbOf(it);
      if (!th) return '';
      const t = titleOf(it);
      return '<button type="button" class="pic-hit" role="listitem" data-hit="' + i + '" ' +
        'title="' + esc(t) + '"><img src="' + esc(th.url) + '" alt="' + esc(t) + '" loading="lazy"></button>';
    }).join('');
  }

  async function takeGif(i) {
    const z = Z(), it = results[i];
    if (!z || !it || busy) return;
    const r = fullOf(it);
    if (!r) { say('klipy sent no strip we could put up.', 'bad'); return; }
    busy = true;
    try {
      const p = await z.takeRemote({
        url: r.url, w: r.width || 200, h: r.height || 200,
        title: titleOf(it), kind: 'image/gif', via: 'KLIPY'
      }, pendingAt, say);
      if (!p) return;
      arm({ url: p.url, w: p.w, h: p.h, title: p.title, kind: p.kind, via: 'KLIPY' });
      landed(p);
    } finally { busy = false; }
  }

  /* ── the sheet's own wiring ─────────────────────────────────────────── */
  function wire() {
    sheet.addEventListener('click', e => {
      const t = e.target.closest('[data-pic-tab]');
      if (t) { showTab(t.dataset.picTab); return; }
      if (e.target.closest('.pic-shut')) { shut(); return; }
      if (e.target.closest('[data-pic-key]')) { keyRow(q('.pic-key').hidden); return; }
      if (e.target.closest('.pic-keysave')) {
        const v = q('.pic-keyin').value.trim();
        store.update(st => { st.key = v; });
        keyRow(!v);
        say(v ? 'key kept on this device.' : 'key cleared.', 'good');
        if (v) search(S().last || '');
        return;
      }
      if (e.target.closest('.pic-go') && e.target.closest('[data-pane="device"]')) { q('.pic-file').click(); return; }
      const hit = e.target.closest('[data-hit]');
      if (hit) takeGif(+hit.dataset.hit);
    });

    // the bench's own keys must not fire while somebody is typing in here
    sheet.addEventListener('keydown', e => e.stopPropagation());

    q('.pic-search').addEventListener('submit', e => { e.preventDefault(); search(q('.pic-q').value); });
    q('.pic-keyin').addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); q('.pic-keysave').click(); }
    });

    const file = q('.pic-file');
    file.addEventListener('change', () => {
      const f = file.files && file.files[0];
      file.value = '';                    // so choosing the same file twice still fires
      if (f) takeFile(f);
    });

    // the sheet takes a drop of its own. The bare paper takes one too, and
    // always did — that is the drum's, in zoetrope.js, and it stays there.
    const drop = q('.pic-drop');
    ['dragenter', 'dragover'].forEach(t => drop.addEventListener(t, e => {
      e.preventDefault(); e.stopPropagation();
      e.dataTransfer.dropEffect = 'copy';
      drop.classList.add('pic-over');
    }));
    ['dragleave', 'dragend'].forEach(t => drop.addEventListener(t, () => drop.classList.remove('pic-over')));
    drop.addEventListener('drop', e => {
      e.preventDefault(); e.stopPropagation();
      drop.classList.remove('pic-over');
      const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
      if (f) takeFile(f); else say('nothing in that drop was a file.', 'warn');
    });
  }

  /* ── what the dock asks for ─────────────────────────────────────────────
     The options row is wall.js's, so the + tool hands it a string and takes
     back the clicks. What it shows is the two ways in, and — once something
     has been chosen — the pictures already put up this session, so a second
     copy of one is a click rather than another search. */
  function opts() {
    const thumb = r => '<button type="button" class="opt-btn opt-pic' + (armed && armed.url === r.url ? ' opt-pic-on' : '') +
      '" data-pic="use" data-url="' + esc(r.url) + '" title="' + esc(r.title || 'a picture') +
      '" aria-pressed="' + String(!!armed && armed.url === r.url) + '">' +
      '<img src="' + esc(r.url) + '" alt=""></button>';
    return '<span class="opt-lab">PICTURE</span>' +
      '<button type="button" class="opt-btn opt-wide" data-pic="device" title="a picture off this device">' +
        '<svg viewBox="0 0 18 18" width="14" height="14" aria-hidden="true">' +
        '<path d="M9 2.5v8M5.5 6 9 2.5 12.5 6" fill="none" stroke="currentColor" stroke-width="2" ' +
        'stroke-linecap="round" stroke-linejoin="round"/>' +
        '<path d="M3 12v2.5h12V12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>' +
        'DEVICE</button>' +
      '<button type="button" class="opt-btn opt-wide" data-pic="klipy" title="a gif out of klipy">' +
        '<svg viewBox="0 0 18 18" width="14" height="14" aria-hidden="true">' +
        '<circle cx="8" cy="8" r="5.2" fill="none" stroke="currentColor" stroke-width="2"/>' +
        '<path d="M12 12l3.4 3.4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>' +
        'KLIPY</button>' +
      (recent.length
        ? '<span class="opt-rule"></span><span class="opt-lab">UP ALREADY</span>' + recent.map(thumb).join('')
        : '') +
      '<span class="opt-rule"></span><span class="opt-lab opt-say">' +
        (armed ? 'CLICK THE PAPER FOR ANOTHER' : 'PICK ONE') + '</span>';
  }

  function onOpt(b) {
    const k = b.dataset.pic;
    if (k === 'device') { open(); showTab('device'); return; }
    if (k === 'klipy') { open(); showTab('klipy'); return; }
    if (k === 'use') {
      const r = recent.find(x => x.url === b.dataset.url);
      if (r) { arm(r); place(null); }
    }
  }

  /* ── a click on the paper ───────────────────────────────────────────────
     With a picture on the pointer it puts one there. With nothing on it the
     sheet comes up instead, and remembers the spot, so what you choose lands
     where you asked rather than in the middle of the screen. */
  function place(at) {
    const z = Z();
    if (!z) return;
    if (!armed) { open(at); return; }
    const why = locked();
    if (why) { open(at); say(why, 'warn'); return; }
    const p = z.pinAt(armed, at || pendingAt);
    if (!p) { open(at); say('the paper is full — take one down first.', 'warn'); return; }
    landed(p);
  }

  // the tool coming up or going down: the sheet follows it, and a picture
  // already on the pointer means the sheet is not in the way of using it
  function tool(on) {
    if (!on) { shut(); return; }
    if (!armed) open();
  }

  /* Undo on the dock, reaching a picture. The pin goes, but what is on the
     pointer stays — undo takes back the piece you put down, not the tool you
     were holding, the same way it does not put the pen back in the pot. */
  function undo(pid) {
    const z = Z();
    if (!z || !z.store.get().pins.some(p => p.pid === pid)) return false;
    z.takeDown(pid);
    return true;
  }

  return { opts, onOpt, place, tool, shut, undo, open,
           get armed() { return armed; } };
})();
