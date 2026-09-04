/* ─── THE GIF TOOL ─────────────────────────────────────────────────────────
   The fifth thing on the dock, next to TEXT: press it and the options row
   grows a search bar in KLIPY's place. Search, click a result, and it goes
   up where you press the paper — and stays on the pointer, so the next
   click puts up another, exactly like IMAGE's tracings do.

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
   production one. So there is no key to ship and none is pretended: paste
   your own below and it is kept in this store, on this device, only.

   A key in a page with no server is readable by anyone using that browser.
   That is the honest place for a capped test key and the wrong place for
   anything else, and the row says so.

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

  const store = Lab.store('gif', () => ({ key: '', last: '' }));
  const S = () => store.get();

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
    const key = (S().key || '').trim();
    if (!key) { showKey = true; throw new Error('klipy wants a key of its own — paste one below.'); }
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
    if (!(S().key || '').trim()) {
      showKey = true;
      say = 'klipy wants a key of its own — a free one goes in below.'; bad = true;
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
    showKey = !v;
    say = v ? 'key kept on this device.' : ''; bad = false;
    sync();
    if (v) search(S().last || '');
  }

  // a click on the paper with nothing armed: say why, don't stamp
  function nudge() {
    say = results.length ? 'pick a gif from the row first' : 'search for a gif first';
    bad = true;
    sync();
  }

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

    if (showKey || !S().key) {
      html += '<span class="opt-rule"></span>' +
        '<span class="opt-set opt-gif-key">' +
          '<span class="opt-lab">KLIPY KEY</span>' +
          '<input type="text" class="opt-gif-k" placeholder="paste a free key" ' +
            'autocomplete="off" spellcheck="false" value="' + esc(S().key || '') + '" aria-label="klipy key">' +
          '<button type="button" class="opt-btn" data-gif="keysave" title="keep it" aria-label="keep it">SAVE</button>' +
        '</span>' +
        '<span class="opt-say opt-gif-fine">free from <a href="https://klipy.com/developers" target="_blank" ' +
          'rel="noopener">klipy.com/developers</a> — 100 calls an hour on a test key, no cap once you ask ' +
          'for a production one. kept on this device only, and anyone using this browser can read it — a ' +
          'test key belongs here, not a live one.</span>';
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
    const said = say || (S().key && !showKey ? (armed ? 'click the paper for another' : results.length ? 'pick one' : '') : '');
    if (said) html += '<span class="opt-rule"></span><span class="opt-say opt-gif-fine' + (bad ? ' opt-gif-bad' : '') + '">' + esc(said) + '</span>';
    if (!showKey && S().key) html += '<button type="button" class="opt-btn opt-gif-mini" data-gif="keytoggle" ' +
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
    if (on && S().key && !results.length) trending();
  }

  return { opts, onOpt, tool, nudge, get armed() { return armed; } };
})();
