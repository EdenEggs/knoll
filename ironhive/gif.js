/* ─── THE GIF TOOL ─────────────────────────────────────────────────────────
   The fifth thing on the dock, next to TEXT: press it and the options row
   grows a search bar in KLIPY's place. Search, and then DRAG a result onto
   the paper, where it lands as you let go — or CLICK one and it goes into
   the middle of what you are looking at. Either way it stays on the pointer
   afterwards, so pressing the paper puts up another, exactly like IMAGE's
   tracings do. OUT OF THE ROW AND ONTO THE PAPER, further down, is the whole
   of that gesture and why it is three routes and not one.

   IT IS NOT COPIED HERE. A gif is not traced or shrunk, it is LINKED: what
   is kept, in the item on the wall, is the strip's own url off KLIPY and the
   size it plays at — the browser fetches the pixels whenever it is looked
   at. That is KLIPY's terms (a provider's media is linked, never re-hosted)
   and it is also the only way an animated strip could be kept at all; a
   canvas snapshot would keep frame one and throw the rest away.

   WHY KLIPY, AND WHY IT WANTS A KEY. Tenor's public API shut down in June
   2026. GIPHY charges for a production key and its old public beta one is
   banned. KLIPY is ex-Tenor people with a near-identical API: free, 100
   calls an hour on a test key and no cap at all once you ask them for a
   production one.

   THE SITE CAN CARRY ONE, and where it does is HOUSE_KEY below, which has
   the whole of that argument — the short of it being that KLIPY require the
   call to come from the visitor's own browser, so a key in the page is the
   deployment they ask for rather than a secret got out. Left empty, nothing
   changes: the row asks each visitor for a key and keeps it on that device.
   Either way a key of your own wins over the site's, so the KEY button is
   how you spend your own allowance instead of everybody's.

   Their terms shape three things worth keeping here: the request goes
   straight from the visitor's own browser and is never proxied (KLIPY
   require that — it is how their ranking sees a real person, which is also
   why every call carries a per-window customer_id); results show in the
   ORDER THEY ARRIVE, no filtering of our own; and their mark sits under the
   row whenever their results do.

   State is Lab.store('gif'): the key and the last thing searched for. What
   is on the pointer and what came back from a search are a mood, not a
   document — they live for the session, the way the dock's other settings
   do, and reset on reload the same as the pen's width or the pixel size. */

window.Gif = (function () {
  if (!window.Lab) return null;
  const $ = id => document.getElementById(id);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g,
    c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // the key goes in the PATH, not the query string — .../api/v1/<key>/gifs/…
  const API = 'https://api.klipy.co/api/v1/';
  const LIMIT = 24;

  /* ── THE KEY THE SITE SHIPS WITH ─────────────────────────────────────────
     Paste a KLIPY key here and every visitor can search without one of their
     own. Leave it empty and the bench behaves exactly as it did before this
     existed: the row asks for a key and keeps it on that device.

     IT IS NOT A SECRET LEAKING OUT. KLIPY require the call to go straight
     from the visitor's own browser and never be proxied — so a key in the
     page is the deployment they ask for, the way a maps key or a search key
     is, and there is nowhere else to put it on a site with no server.

     WHAT IT IS is SHARED and READABLE. Every visitor spends the same
     allowance, and anyone who opens this file can spend it too. A TEST key
     does 100 calls an hour, which a public page will eat before lunch and
     which anyone can then eat on purpose; a PRODUCTION key — free from
     klipy.com/developers once you ask — has no cap and is what belongs
     here. Rotate it if it is ever abused; nothing else on the bench cares.

     A KEY OF YOUR OWN STILL WINS. keyNow() reads the visitor's saved key
     first, so pasting one into the row is still how you spend your own
     allowance rather than the site's — and the KEY button is still there to
     do it with. (2026-09-04) */
  const HOUSE_KEY = '';

  const store = Lab.store('gif', () => ({ key: '', last: '' }));
  const S = () => store.get();
  const keyNow = () => (S().key || '').trim() || HOUSE_KEY;

  let armed = null;                          // what the next paper click puts up
  let results = [], job = null, busy = false;
  let showKey = false, say = '', bad = false;

  const sync = () => { if (window.Wall && Wall.syncOpts) Wall.syncOpts(); };

  function arm(rec) {
    armed = rec;
    sync();
  }

  /* ── out of KLIPY ───────────────────────────────────────────────────────
     One request at a time: a new search aborts the one still in the air, or
     a slow answer to "gn" lands on top of the answer to "gnome".

     The key rides in the PATH — /api/v1/<key>/gifs/search — and customer_id
     is a stable per-window handle, which their ranking wants and their
     terms ask for. Nothing about the visitor goes with it: it is the same
     throwaway id the sticker chat gives a window, not a name or a device
     fingerprint.

     An answer is unwrapped rather than assumed. Providers move a list about
     between .data, .data.data and .result over the years, so the reader
     looks for the first array of objects it recognises instead of trusting
     one shape and breaking silently on the day it changes. */
  const CUST = 'knoll-lab2-' + Math.random().toString(36).slice(2, 12);

  const listOf = body => {
    for (const v of [body && body.data, body && body.data && body.data.data,
                     body && body.result, body && body.results, body])
      if (Array.isArray(v) && (!v.length || typeof v[0] === 'object')) return v;
    return null;
  };

  async function ask(path, params) {
    const key = keyNow();
    if (!key) { showKey = true; throw new Error('klipy wants a key — paste one below.'); }
    if (job) job.abort();
    job = new AbortController();
    const url = API + encodeURIComponent(key) + '/gifs/' + path + '?' + new URLSearchParams(
      Object.assign({ per_page: LIMIT, page: 1, customer_id: CUST, content_filter: 'high' }, params));
    /* A cross-origin fetch that fails tells the page almost nothing — the
       browser hands back one opaque error whether the wire is down, the
       reply carried no CORS header, or the key was wrong. KLIPY's own "that
       key is invalid" comes back as a 404 with no such header, so the
       commonest cause of landing here is a bad key, and that is what it
       says first. Guessing precisely would be inventing detail we do not
       have. */
    let r;
    try { r = await fetch(url, { signal: job.signal }); }
    catch (e) {
      if (e && e.name === 'AbortError') return null;
      showKey = true;
      throw new Error('the browser could not read klipy’s answer. usually that is the key; ' +
        'it can also be the connection. a free key comes from klipy.com/developers.');
    }
    const body = await r.json().catch(() => null);
    const msg = body && body.errors && body.errors.message;
    const why = Array.isArray(msg) ? msg[0] : msg;
    // a bad key is a 404 here rather than a 401, since the key IS the path
    if (r.status === 401 || r.status === 403 ||
        (r.status === 404 && /key/i.test(String(why || '')))) {
      showKey = true;
      throw new Error('klipy refused that key. a free one comes from klipy.com/developers.');
    }
    if (r.status === 429) throw new Error('a test key does 100 calls an hour and this one has had them. try later.');
    const list = r.ok && body && body.result !== false ? listOf(body) : null;
    if (!list) throw new Error('klipy said ' + (why || r.status) + '.');
    return list;
  }

  /* Which copy of a gif to use. KLIPY files them by size (sm / md / hd) and
     then by kind (gif / webp / mp4), and a strip that has to become an
     <image> in an svg has to be one a browser will animate on its own — so
     mp4 is passed over however small it is. If none of the expected places
     has one, the item is walked for anything that looks like a still
     picture, which is cheaper than being wrong about their shape. */
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
  // a stable identity for "is this the one on the pointer" — the array index
  // alone would mislabel a thumbnail after a new search reorders the row
  function keyOf(it, i) {
    if (it && it.id != null) return 'id:' + it.id;
    if (it && it.slug != null) return 'slug:' + it.slug;
    return 'i:' + i;
  }

  async function search(term) {
    const t = String(term || '').trim();
    if (!keyNow()) {
      showKey = true;
      say = 'klipy wants a key — a free one goes in below.'; bad = true;
      sync();
      return;
    }
    busy = true;
    store.update(st => { st.last = t; });
    say = t ? 'looking for “' + t + '”…' : 'fetching what is trending…'; bad = false;
    sync();
    try {
      const data = t ? await ask('search', { q: t, locale: 'en' }) : await ask('trending', {});
      if (!data) return;                              // aborted by the next search
      results = data;
      say = data.length ? '' : 'klipy has nothing for that word.'; bad = !data.length;
    } catch (e) {
      results = [];
      say = (e && e.message) || 'that search went nowhere.'; bad = true;
    } finally {
      busy = false;
      sync();
    }
  }

  const trending = () => search(S().last || '');

  async function saveKey(v) {
    v = String(v || '').trim();
    store.update(st => { st.key = v; });
    /* clearing your own key does not put the row back up when the site has
       one of its own — it falls back to the house key and carries on */
    showKey = !keyNow();
    say = v ? 'key kept on this device.' : (HOUSE_KEY ? 'back to the site’s own key.' : ''); bad = false;
    sync();
    if (keyNow()) search(S().last || '');
  }

  // a click on the paper with nothing armed: say why, don't stamp
  function nudge() {
    say = results.length ? 'drag a gif out of the row, or click one' : 'search for a gif first';
    bad = true;
    sync();
  }

  /* ── OUT OF THE ROW AND ONTO THE PAPER ───────────────────────────────────
     A gif used to be armed and then aimed: click a thumbnail, then click the
     paper, and the strip went up where you pressed. That is one gesture too
     many for the commonest thing anyone wants — a gif, on the bench, now —
     and it was also the ONLY route, so when Wall's press called Gif.armed()
     on a getter and threw, nothing could put a gif up at all.

     There are three routes now and they are all the same write (Wall.gifAt):

       · DRAG a thumbnail onto the paper .... it lands where you let go
       · CLICK a thumbnail .................. it lands in the middle of what
                                              you are looking at
       · press the paper .................... another of whatever was last
                                              taken out of the row

     The drag is the tracer library's gesture, and deliberately the same one:
     past six pixels a ghost of the thumbnail follows the pointer and letting
     go over the paper puts the strip there. Pointer events and not HTML
     drag-and-drop, for the reason tracer.js gives — the bench is pointer
     events all the way down and a native drag would fight lab.js for the
     capture. A press that never travelled is a click, and a click is the
     middle of the view.

     EVERY ROUTE ALSO ARMS, so the old gesture is still underneath: take one
     out of the row however you like and the paper keeps putting up more.

     THE MIDDLE OF THE VIEW IS NOT THE MIDDLE OF THE BENCH. The options row
     carrying these thumbnails is fixed over the foot of the screen and is
     tall — two dozen results wrap into a slab of it — so the middle of the
     bench is often UNDER the row, and a gif put there would arrive
     invisible. The point is the middle of the paper still showing above the
     row instead. (2026-09-04) */
  const SLOP = 6;
  let press = null, ghost = null;

  function middle() {
    const b = Lab.bench.getBoundingClientRect();
    let foot = b.bottom;
    ['tool-opts', 'tool-dock'].forEach(id => {
      const el = $(id);
      if (!el || el.hidden) return;
      const r = el.getBoundingClientRect();
      if (r.height && r.top > b.top) foot = Math.min(foot, r.top);
    });
    // …unless the row has left no paper worth aiming at, in which case the
    // bench's own middle is the honest answer and the row is simply over it
    if (foot - b.top < 120) foot = b.bottom;
    return Lab.toWorld(b.left + b.width / 2, (b.top + foot) / 2);
  }

  const put = (rec, wx, wy) => !!(window.Wall && Wall.gifAt && Wall.gifAt(rec, wx, wy));

  // the record a thumbnail stands for — the FULL strip, not the thumbnail:
  // the row shows sm and the paper gets md, exactly as the click-to-arm did
  function recOf(b) {
    const i = +b.dataset.i, it = results[i];
    if (!it) return null;
    const r = fullOf(it);
    return r ? { key: keyOf(it, i), url: r.url, w: r.width || 200, h: r.height || 200 } : null;
  }

  const carry = e => {
    if (!press) return;
    if (!press.moved) {
      if (Math.abs(e.clientX - press.x) + Math.abs(e.clientY - press.y) < SLOP) return;
      press.moved = true;
      ghost = document.createElement('img');
      ghost.className = 'gif-ghost';
      ghost.alt = '';
      ghost.src = press.thumb;
      document.body.appendChild(ghost);
    }
    ghost.style.left = e.clientX + 'px';
    ghost.style.top = e.clientY + 'px';
  };

  const letGo = e => {
    if (!press) return;
    const p = press; press = null;
    window.removeEventListener('pointermove', carry, true);
    window.removeEventListener('pointerup', letGo, true);
    window.removeEventListener('pointercancel', letGo, true);
    if (ghost) { ghost.remove(); ghost = null; }
    if (e.type === 'pointercancel') { sync(); return; }

    if (!p.moved) {                                   // a click: the middle of the view
      const w = middle();
      if (put(p.rec, w.x, w.y)) { say = 'put in the middle — drag one to place it yourself'; bad = false; }
      else { say = 'that strip would not go up.'; bad = true; }
    } else {
      /* let go over the paper, and not over the row it came out of. The row
         and the dock are the body's own children rather than the bench's, so
         one question answers both: is what is under the pointer inside the
         bench at all. */
      const t = document.elementFromPoint(e.clientX, e.clientY);
      if (!t || !t.closest || !t.closest('#bench')) { say = 'let go over the paper'; bad = true; }
      else {
        const w = Lab.toWorld(e.clientX, e.clientY);
        if (put(p.rec, w.x, w.y)) { say = 'dropped — drag another, or press the paper for one more'; bad = false; }
        else { say = 'that strip would not go up.'; bad = true; }
      }
    }
    arm(p.rec);                                       // …and it syncs the row
  };

  /* Delegated at the document, because the row this listens to is a STRING:
     wall.js rebuilds the whole options row out of opts() on every search,
     every arm and every tool switch, so a listener hung on a thumbnail would
     be thrown away with it. Capture, so it is ahead of wall.js's own click
     on the row — the press is handled here from end to end, and onOpt's
     'use' is left as the plain-click fallback for a browser that still sends
     one through. */
  document.addEventListener('pointerdown', e => {
    const b = e.target.closest && e.target.closest('.opt-gif-hit');
    if (!b || press) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    const rec = recOf(b);
    if (!rec) { say = 'klipy sent no strip we could put up.'; bad = true; sync(); return; }
    e.preventDefault(); e.stopPropagation();
    const img = b.querySelector('img');
    press = { rec, thumb: (img && img.src) || rec.url, x: e.clientX, y: e.clientY, moved: false };
    window.addEventListener('pointermove', carry, true);
    window.addEventListener('pointerup', letGo, true);
    window.addEventListener('pointercancel', letGo, true);
  }, true);

  /* ── what the dock asks for ─────────────────────────────────────────────
     Built fresh into the options row every time it is asked for — the row
     itself is wall.js's, rebuilt on every tool switch and every option
     changed, so this hands back a string rather than keeping a panel of its
     own the way the tracing table does. */
  function opts() {
    const q = esc(S().last || '');
    let html = '<span class="opt-lab">GIF</span>' +
      '<span class="opt-set opt-gif-bar">' +
        '<input type="text" class="opt-gif-q" placeholder="search for a gif…" maxlength="60" ' +
          'autocomplete="off" spellcheck="false" value="' + q + '" aria-label="search klipy">' +
        '<button type="button" class="opt-btn opt-gif-go" data-gif="search" title="search" ' +
          'aria-label="search"' + (busy ? ' disabled' : '') + '>' +
          '<svg viewBox="0 0 18 18" width="13" height="13" aria-hidden="true">' +
          '<circle cx="7.5" cy="7.5" r="5" fill="none" stroke="currentColor" stroke-width="2"/>' +
          '<line x1="11.5" y1="11.5" x2="16" y2="16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>' +
          '</svg></button>' +
      '</span>';

    if (showKey || !keyNow()) {
      html += '<span class="opt-rule"></span>' +
        '<span class="opt-set opt-gif-key">' +
          '<span class="opt-lab">KLIPY KEY</span>' +
          '<input type="text" class="opt-gif-k" placeholder="paste a free key" ' +
            'autocomplete="off" spellcheck="false" value="' + esc(S().key || '') + '" aria-label="klipy key">' +
          '<button type="button" class="opt-btn" data-gif="keysave" title="keep it" aria-label="keep it">SAVE</button>' +
        '</span>' +
        /* what the fine print says depends on whether the site is carrying a
           key: with one, this box is an OVERRIDE and wants explaining as
           one; without, it is the only way to search at all */
        '<span class="opt-say opt-gif-fine">' + (HOUSE_KEY
          ? 'this bench searches on its own key — paste one here to spend your own allowance instead. ' +
            'free from <a href="https://klipy.com/developers" target="_blank" rel="noopener">' +
            'klipy.com/developers</a>; kept on this device only, and anyone using this browser can read it. ' +
            'clear it to go back to the bench’s.'
          : 'free from <a href="https://klipy.com/developers" target="_blank" rel="noopener">' +
            'klipy.com/developers</a> — 100 calls an hour on a test key, no cap once you ask ' +
            'for a production one. kept on this device only, and anyone using this browser can read it — a ' +
            'test key belongs here, not a live one.') + '</span>';
    } else if (results.length) {
      html += '<span class="opt-rule"></span><span class="opt-set opt-gif-grid">' +
        results.map((it, i) => {
          const th = thumbOf(it);
          if (!th) return '';
          const on = armed && armed.key === keyOf(it, i);
          const t = esc(titleOf(it));
          return '<button type="button" class="opt-btn opt-gif-hit' + (on ? ' opt-gif-on' : '') +
            '" data-gif="use" data-i="' + i + '" title="' + t + '" aria-label="' + t +
            '" aria-pressed="' + on + '"><img src="' + esc(th.url) + '" alt="" loading="lazy"></button>';
        }).join('') + '</span>';
    }

    // the status line: what klipy said, or what to do next — shown whatever
    // the row above is, since a key error is exactly what showKey shows for
    const said = say || (keyNow() && !showKey
      ? (armed ? 'press the paper for another'
               : results.length ? 'drag one onto the paper, or click it for the middle' : '')
      : '');
    if (said) html += '<span class="opt-rule"></span><span class="opt-say opt-gif-fine' + (bad ? ' opt-gif-bad' : '') + '">' + esc(said) + '</span>';
    if (!showKey && keyNow()) html += '<button type="button" class="opt-btn opt-gif-mini" data-gif="keytoggle" ' +
      'title="change the klipy key" aria-label="change the klipy key">KEY</button>';

    html += '<span class="opt-gif-mark">gifs by <a href="https://klipy.com/" target="_blank" ' +
      'rel="noopener">KLIPY</a></span>';
    return html;
  }

  function onOpt(b) {
    const k = b.dataset.gif;
    if (k === 'search') { const i = $('tool-opts').querySelector('.opt-gif-q'); search(i ? i.value : ''); return; }
    if (k === 'keysave') { const i = $('tool-opts').querySelector('.opt-gif-k'); saveKey(i ? i.value : ''); return; }
    if (k === 'keytoggle') { showKey = !showKey; if (showKey) say = ''; sync(); return; }
    if (k === 'use') {
      const i = +b.dataset.i, it = results[i];
      if (!it) return;
      const r = fullOf(it);
      if (!r) { say = 'klipy sent no strip we could put up.'; bad = true; sync(); return; }
      arm({ key: keyOf(it, i), url: r.url, w: r.width || 200, h: r.height || 200 });
    }
  }

  // the search box: Enter searches, same as pressing the button beside it
  document.addEventListener('keydown', e => {
    if (e.target.classList && e.target.classList.contains('opt-gif-q') && e.key === 'Enter') {
      e.preventDefault(); search(e.target.value);
    }
    if (e.target.classList && e.target.classList.contains('opt-gif-k') && e.key === 'Enter') {
      e.preventDefault(); saveKey(e.target.value);
    }
  });

  // the tool coming up: a first look shows what's trending, once there's a
  // key to ask with — going down leaves the pointer armed, the way IMAGE
  // leaves a tracing on it, so switching tools and back does not lose it
  function tool(on) {
    if (on && keyNow() && !results.length) trending();
  }

  return { opts, onOpt, tool, nudge, get armed() { return armed; } };
})();
