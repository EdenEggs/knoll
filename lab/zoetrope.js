/* ─── THE ZOETROPE ─────────────────────────────────────────────────────────
   Feed the drum a picture of your own and it goes up on the paper. A zoetrope
   is the Victorian drum that turns a strip of stills into something that
   moves, so a gif put in here turns and a still simply sits there — but
   either way the strip is YOURS now, off your own machine, chosen rather than
   searched for.

   Pinned pictures live on the bench: drag them anywhere, dress them up with
   the same card that dresses critters and drawings, take them down again.

   THE SEARCH LIVES SOMEWHERE ELSE NOW
     This gizmo used to crank a word at a gif provider itself. That half is
     gone from here: the searching, the key and the sheet of results belong to
     the dock's + tool (picture.js), and what it finds comes back through
     takeRemote() to be pinned like anything else. So this file still talks to
     nobody and keeps no key — it only knows that a picture may be a link.

   NOTHING LEAVES THE DEVICE
     A picture off this machine is read with FileReader, shrunk here, and kept
     as a data-url in Lab.store('zoetrope') like everything else on this
     bench. It is not uploaded anywhere, because there is nowhere to upload it
     to. A gif chosen out of a provider is the other way about: nothing of it
     is copied here at all, only the URL they answered with, and the browser
     fetches the strip from them each time it is looked at — which is their
     terms as much as our storage. Either way no picture of yours goes out.

   THE SIZE PROBLEM, HANDLED HONESTLY
     localStorage is a few megabytes for the WHOLE lab, and one photo out of a
     phone is bigger than that on its own. So:

       · a still is redrawn down to MAXPX on its long side and re-encoded — a
         4MB jpeg lands at about 60KB and looks identical at pin size
       · a GIF is kept byte for byte, because putting one through a canvas
         keeps frame one and throws the rest of the strip away. It gets a hard
         cap instead, and is refused above it rather than quietly ruined
       · an SVG is kept as it is: small already, and the one kind of picture
         that stays sharp however far the camera goes in
       · and before anything is kept the room is MEASURED, by actually trying
         to reserve it. Lab.store swallows a write that fails, so without this
         a picture would pin, look fine, and be gone on the next reload

   FOUR WAYS IN, all the same road: the button, a file dropped on the drum or
   on the bare paper (where it lands exactly where it was dropped), paste, and
   the + on the tool dock — which can also bring back a gif from GIPHY.

   State is Lab.store('zoetrope') on this device: the settings and the pins
   with their positions. Roles:
     user       puts pictures up, drags them, takes down their own
     moderator  takes down anybody's, sees who put what up
     owner      the size they land at, the master switch, clears the paper */

window.Zoetrope = (function () {
  const $ = id => document.getElementById(id);
  const world = (window.Lab && Lab.world) || $('bench-world') || $('bench');
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g,
    c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const MAXPX = 900;                    // longest side of a still, after shrinking
  const STILL_CAP = 600 * 1024;         // what a shrunk still may weigh
  const GIF_CAP = 900 * 1024;           // a gif is kept whole, so it gets its own
  const SVG_CAP = 256 * 1024;
  const LANDS = { small: 130, medium: 190, large: 280 };
  const MAX_PINS = 24;
  const OK = /^image\/(png|jpeg|gif|webp|avif|svg\+xml)$/i;

  const store = Lab.store('zoetrope', () => ({
    cfg: { land: 'medium', open: true },
    who: Lab.uid(),                     // stable per device — who put what up
    pins: []
  }));
  const S = () => store.get();
  const isMod = () => Lab.role === 'moderator' || Lab.role === 'owner';

  /* ── the intake ─────────────────────────────────────────────────────────── */
  const dropEl = $('zt-drop'), fileIn = $('zt-file'), pickBtn = $('zt-pick');
  const statusEl = $('zt-status');
  const wallEl = $('zt-wall'), countEl = $('zt-count');
  const landSel = $('zt-land'), openChk = $('zt-open'), clearBtn = $('zt-clear'), roomEl = $('zt-room');

  let busy = false;

  function say(msg, kind) {
    statusEl.textContent = msg || '';
    statusEl.className = 'zt-status' + (kind ? ' zt-' + kind : '');
  }

  const KB = n => n < 1024 ? n + ' B'
    : n < 1024 * 1024 ? (n / 1024).toFixed(0) + ' KB'
    : (n / (1024 * 1024)).toFixed(1) + ' MB';

  // a data-url is characters and localStorage counts characters — near enough
  // for a readout, and exactly right for asking whether one more will fit
  const weigh = u => (u || '').length;
  const kept = () => S().pins.reduce((n, p) => n + weigh(p.url), 0);

  /* localStorage is a handful of megabytes for the whole lab, and Lab.store
     swallows a write that fails. So the room is asked for BEFORE the picture
     is promised: reserve that many characters under a scratch key, then hand
     them straight back. Nothing else here finds out whether there was room —
     it simply would not be there next time. */
  function room(chars) {
    const K = 'knoll-lab:room-probe';
    try {
      localStorage.setItem(K, new Array(chars + 1).join('x'));
      localStorage.removeItem(K);
      return true;
    } catch (e) {
      try { localStorage.removeItem(K); } catch (e2) {}
      return false;
    }
  }

  // its true size, so a pin can keep the shape the picture came in
  function measure(url) {
    return new Promise((done, fail) => {
      const img = new Image();
      img.onload = () => done({ w: img.naturalWidth || MAXPX, h: img.naturalHeight || MAXPX });
      img.onerror = () => fail(new Error('this browser could not open that picture'));
      img.src = url;
    });
  }

  const readUrl = file => new Promise((done, fail) => {
    const r = new FileReader();
    r.onload = () => done(String(r.result));
    r.onerror = () => fail(new Error('could not read that file'));
    r.readAsDataURL(file);
  });

  // a still, redrawn small. webp where it is understood — everything this page
  // runs in encodes it — and png where it is not, which keeps whatever was
  // see-through see-through instead of filling it in white
  async function shrink(file) {
    const raw = await readUrl(file);
    const size = await measure(raw);
    const k = Math.min(1, MAXPX / Math.max(size.w, size.h));
    if (k === 1 && weigh(raw) <= STILL_CAP) return { url: raw, w: size.w, h: size.h };
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(size.w * k));
    c.height = Math.max(1, Math.round(size.h * k));
    const g = c.getContext('2d');
    g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
    const img = new Image();
    img.src = raw;
    try { await img.decode(); } catch (e) {}
    g.drawImage(img, 0, 0, c.width, c.height);
    let out = c.toDataURL('image/webp', 0.86);
    if (out.slice(0, 15) !== 'data:image/webp') out = c.toDataURL('image/png');
    return { url: out, w: size.w, h: size.h };
  }

  /* one road in for all four ways: the button, a drop, a paste, and the dock's
     + tool (picture.js). The dock has a line of its own to report on and this
     gizmo may well be on the shelf while it is used, so every message is also
     ECHOED to whoever asked — and the pin itself is handed back, since the +
     tool keeps what you chose on the pointer for the next click. */
  async function take(file, at, echo) {
    const tell = (m, k) => { say(m, k); if (echo) echo(m, k); };
    if (busy) return null;
    const s = S();
    if (!s.cfg.open && !isMod()) { tell('the owner has the drum locked.', 'warn'); return null; }
    if (!file) return null;
    if (!OK.test(file.type || '')) {
      tell('that is not a picture this drum takes — png, jpeg, gif, webp, avif or svg.', 'bad');
      return null;
    }
    if (s.pins.length >= MAX_PINS) { tell('the paper is full — take one down first.', 'warn'); return null; }

    busy = true;
    tell('reading ' + (file.name || 'it') + '…');
    try {
      const gif = /gif$/i.test(file.type), svg = /svg/i.test(file.type);
      let rec;
      if (gif) {
        if (file.size > GIF_CAP) {
          tell('that gif is ' + KB(file.size) + ', over the ' + KB(GIF_CAP) + ' a whole strip is allowed. ' +
              'a gif cannot be shrunk here without losing every frame but the first, so it is refused rather than ruined.', 'bad');
          return null;
        }
        const url = await readUrl(file);
        rec = Object.assign({ url }, await measure(url));
      } else if (svg) {
        if (file.size > SVG_CAP) { tell('that svg is ' + KB(file.size) + ', over the ' + KB(SVG_CAP) + ' allowed.', 'bad'); return null; }
        const url = await readUrl(file);
        rec = Object.assign({ url }, await measure(url));
      } else {
        rec = await shrink(file);
        if (weigh(rec.url) > STILL_CAP) {
          tell('even shrunk that one comes to ' + KB(weigh(rec.url)) + ' — too big to keep. try a smaller picture.', 'bad');
          return null;
        }
      }

      if (!room(weigh(rec.url) + 4096)) {
        tell('this device has no room left for it — the whole bench shares a few megabytes, and ' +
            KB(kept()) + ' of that is pictures. take some down and try again.', 'bad');
        return null;
      }

      const p = pin(rec, file, at);
      tell((file.name ? '“' + file.name + '”' : 'it') + ' is up on the paper' +
          (gif ? ' — turning, if it turns.' : '.'), 'good');
      return p;
    } catch (e) {
      tell((e && e.message) || 'that picture would not go in.', 'bad');
      return null;
    } finally {
      busy = false;
    }
  }

  /* ── a picture that is somebody else's to serve ─────────────────────────
     Everything above is read off this device. A gif chosen out of GIPHY is
     not: what is kept is the URL the provider answered with, and the browser
     fetches the strip from them every time it is looked at. That is their
     terms — a provider's media is linked, never re-hosted or cached — and it
     is also why a strip far too big to keep costs about sixty characters.

     No key, no request and no search lives in this file. picture.js does that
     half and hands over an answer; this end does what it does for any other
     picture — the lock, the count, the room, the pin. */
  async function takeRemote(rec, at, echo) {
    const tell = (m, k) => { say(m, k); if (echo) echo(m, k); };
    if (busy || !rec || !rec.url) return null;
    const s = S();
    if (!s.cfg.open && !isMod()) { tell('the owner has the drum locked.', 'warn'); return null; }
    if (!/^https:\/\//i.test(rec.url)) { tell('that picture is not on a secure address.', 'bad'); return null; }
    if (s.pins.length >= MAX_PINS) { tell('the paper is full — take one down first.', 'warn'); return null; }
    if (!room(weigh(rec.url) + 4096)) { tell('this device has no room left even for a link to it.', 'bad'); return null; }

    busy = true;
    tell('fetching it…');
    try {
      // the provider gives the size with the rendition; measure only if it did not
      const size = (rec.w && rec.h) ? { w: +rec.w, h: +rec.h } : await measure(rec.url);
      const p = pin(Object.assign({}, rec, size), null, at);
      tell('“' + (rec.title || 'it') + '” is up on the paper — turning, if it turns.', 'good');
      return p;
    } catch (e) {
      tell((e && e.message) || 'that one would not load.', 'bad');
      return null;
    } finally {
      busy = false;
    }
  }

  /* The same picture again, with none of the reading: the + tool keeps what
     you chose on the pointer, so the second and third copies are already
     known good and only the count and the spot are still in question. */
  function pinAt(rec, at) {
    const s = S();
    if (!rec || !rec.url) return null;
    if (!s.cfg.open && !isMod()) return null;
    if (s.pins.length >= MAX_PINS) return null;
    return pin(rec, null, at);
  }

  function takeAll(files, at) {
    const list = [...(files || [])].filter(f => OK.test(f.type || ''));
    if (!list.length) { say('nothing in that drop was a picture.', 'warn'); return; }
    if (list.length > 1) say('one at a time — taking the first of ' + list.length + '.', 'warn');
    take(list[0], at);
  }

  /* ── pinning ────────────────────────────────────────────────────────────── */

  // land it where it was dropped; failing that, in the middle of whatever the
  // camera is looking at, so you watch it arrive rather than hunting for it
  function dropPoint(at, w) {
    if (at) return { x: Math.round(at.x - w / 2), y: Math.round(at.y - 30) };
    const b = (Lab.bench || document.getElementById('bench')).getBoundingClientRect();
    const p = Lab.toWorld(b.left + b.width / 2, b.top + b.height / 2);
    const jig = () => (Math.random() - 0.5) * 90;
    return { x: Math.round(p.x - w / 2 + jig()), y: Math.round(p.y - 70 + jig()) };
  }

  // hands the pin back, because the + tool needs to know what it just put up
  // — which one to take down if undo is pressed, and what is on the pointer
  function pin(rec, file, at) {
    const w = LANDS[S().cfg.land] || LANDS.medium;
    const h = rec.w ? Math.round(w * (rec.h / rec.w)) : w;
    const spot = dropPoint(at, w);
    const p = {
      pid: Lab.uid(), url: rec.url, w, h,
      title: rec.title || (file && file.name) || 'a picture',
      kind: rec.kind || (file && file.type) || '', bytes: weigh(rec.url),
      by: S().who, at: Date.now(), x: spot.x, y: spot.y
    };
    if (rec.via) p.via = rec.via;        // whose picture it is, if it is not ours
    store.update(st => { st.pins.push(p); });
    return p;
  }

  function takeDown(pid) {
    store.update(st => { st.pins = st.pins.filter(p => p.pid !== pid); });
  }

  /* ── the pins on the paper ──────────────────────────────────────────────── */
  const layer = document.createElement('div');
  layer.className = 'zt-layer';
  world.appendChild(layer);

  function renderPins() {
    const s = S();
    const have = new Map([...layer.children].map(el => [el.dataset.pid, el]));

    s.pins.forEach(p => {
      let el = have.get(p.pid);
      if (!el) {
        el = document.createElement('div');
        el.className = 'zt-pin';
        el.dataset.pid = p.pid;
        // fx.js wants a STAGE carrying no transform of its own and a SKIN
        // child; .zt-pin-art is the skin, and the stage keeps position via
        // left/top so the animation is free to use transform
        el.innerHTML =
          '<div class="zt-pin-frame" data-fx="zt:' + esc(p.pid) + '">' +
            '<div class="zt-pin-art"><img alt="' + esc(p.title) + '" draggable="false"></div>' +
          '</div>' +
          '<span class="zt-tack" aria-hidden="true"></span>' +
          '<button type="button" class="zt-off" title="take it down" aria-label="take it down">×</button>' +
          '<span class="zt-cap"></span>';
        layer.appendChild(el);
        wireDrag(el, p.pid);
      }
      const img = el.querySelector('img');
      if (img.getAttribute('src') !== p.url) img.src = p.url;      // a data-url off this device
      el.style.left = p.x + 'px';
      el.style.top = p.y + 'px';
      el.style.width = p.w + 'px';
      el.querySelector('.zt-pin-art').style.aspectRatio = p.w + ' / ' + (p.h || p.w);
      el.querySelector('.zt-cap').textContent = p.title;
      const off = el.querySelector('.zt-off');
      off.hidden = !(isMod() || p.by === s.who);
      have.delete(p.pid);
    });

    have.forEach(el => el.remove());                                // gone from the store, gone from the paper
  }

  // Carrying a pin about. Two things make this work, and the first is not in
  // this file: '.zt-pin' has to be in lab.js's onPaper and HANDS_OFF lists,
  // the way .critter and .el-mayor are, or the bench reads the drag as a pan
  // and slides the whole sheet out from under the pin instead.
  // The second is that the move and up listeners go on WINDOW for the life of
  // the drag rather than on the pin itself. setPointerCapture is what critters
  // use and it is fine, but window listeners cannot lose the pointer at all —
  // if anything does move the element out from under the cursor mid-drag, an
  // element-bound handler simply stops firing and the pin sticks.
  function wireDrag(el, pid) {
    const frame = el.querySelector('.zt-pin-frame');
    let dx = 0, dy = 0, id = null;

    const move = e => {
      if (e.pointerId !== id) return;
      const w = Lab.toWorld(e.clientX, e.clientY);
      el.style.left = Math.round(w.x + dx) + 'px';
      el.style.top = Math.round(w.y + dy) + 'px';
      e.preventDefault();
    };

    const drop = e => {
      if (e && e.pointerId !== id) return;
      id = null;
      window.removeEventListener('pointermove', move, true);
      window.removeEventListener('pointerup', drop, true);
      window.removeEventListener('pointercancel', drop, true);
      el.classList.remove('zt-held');
      const x = parseFloat(el.style.left) || 0, y = parseFloat(el.style.top) || 0;
      store.update(st => {
        const p = st.pins.find(q => q.pid === pid);
        if (p) { p.x = Math.round(x); p.y = Math.round(y); }
      });
    };

    frame.addEventListener('pointerdown', e => {
      if (id !== null) return;
      if (e.button != null && e.button !== 0) return;
      const p = S().pins.find(q => q.pid === pid);
      if (!p) return;
      const w = Lab.toWorld(e.clientX, e.clientY);
      dx = p.x - w.x; dy = p.y - w.y; id = e.pointerId;
      el.classList.add('zt-held');
      // capture in the bubble phase, so a click on the × still lands
      window.addEventListener('pointermove', move, true);
      window.addEventListener('pointerup', drop, true);
      // a finger the browser steals for a scroll never sends pointerup
      window.addEventListener('pointercancel', drop, true);
      e.preventDefault();
      e.stopPropagation();                       // the bench must not read this as a pan
    });

    el.querySelector('.zt-off').addEventListener('click', e => {
      e.stopPropagation();
      takeDown(pid);
    });
  }

  /* ── the list inside the gizmo ──────────────────────────────────────────── */
  function renderWall() {
    const s = S();
    countEl.textContent = s.pins.length
      ? s.pins.length + (s.pins.length === 1 ? ' picture up' : ' pictures up')
      : 'nothing up yet';

    if (!s.pins.length) {
      wallEl.innerHTML = '<li class="pb-empty">nothing up. put a picture in the drum.</li>';
      return;
    }
    wallEl.innerHTML = s.pins.slice().reverse().map(p =>
      '<li class="zt-row">' +
        '<img src="' + esc(p.url) + '" alt="" loading="lazy">' +
        '<span class="zt-row-t">' + esc(p.title) +
          '<small>' + (p.by === s.who ? 'yours' : 'somebody') +
          // a linked picture weighs a URL, and saying "62 B" of a gif that is
          // three megabytes at the far end would be a lie about the wrong thing
          (p.via ? ' · from ' + esc(p.via) : p.bytes ? ' · ' + KB(p.bytes) : '') + '</small></span>' +
        '<button type="button" class="pb-act" data-find="' + esc(p.pid) + '">find</button>' +
        ((isMod() || p.by === s.who)
          ? '<button type="button" class="pb-act" data-down="' + esc(p.pid) + '">take down</button>' : '') +
      '</li>').join('');
  }

  wallEl.addEventListener('click', e => {
    const d = e.target.closest('[data-down]');
    if (d) { takeDown(d.dataset.down); return; }
    const f = e.target.closest('[data-find]');
    if (f) {
      const p = S().pins.find(q => q.pid === f.dataset.find);
      const el = layer.querySelector('[data-pid="' + (window.CSS && CSS.escape ? CSS.escape(f.dataset.find) : f.dataset.find) + '"]');
      if (p && el) {
        Lab.camTo(Lab.zoom, -p.x * Lab.zoom + Lab.bench.clientWidth / 2 - p.w * Lab.zoom / 2,
                            -p.y * Lab.zoom + Lab.bench.clientHeight / 2, 320);
        el.classList.remove('zt-ping'); void el.offsetWidth; el.classList.add('zt-ping');
        setTimeout(() => el.classList.remove('zt-ping'), 1000);
      }
    }
  });

  /* ── the works (owner) ──────────────────────────────────────────────────── */
  function renderWorks() {
    const s = S();
    landSel.value = s.cfg.land;
    openChk.checked = !!s.cfg.open;
    const n = kept();
    roomEl.textContent = n
      ? KB(n) + ' of pictures kept on this device' + (s.pins.length >= MAX_PINS ? ' · the paper is full' : '')
      : 'nothing kept on this device yet';
  }

  landSel.addEventListener('change', () => {
    store.update(st => { st.cfg.land = landSel.value; });
  });
  openChk.addEventListener('change', () => {
    store.update(st => { st.cfg.open = openChk.checked; });
  });
  clearBtn.addEventListener('click', () => {
    if (!S().pins.length) return;
    if (!confirm('Take every picture off the paper? This cannot be undone.')) return;
    store.update(st => { st.pins = []; });
    say('the paper is bare again.', 'good');
  });

  /* ── the three ways in ──────────────────────────────────────────────────── */
  pickBtn.addEventListener('click', () => fileIn.click());
  fileIn.addEventListener('change', () => {
    takeAll(fileIn.files);
    fileIn.value = '';                  // so choosing the same file twice still fires
  });

  // the drum itself
  ['dragenter', 'dragover'].forEach(t => dropEl.addEventListener(t, e => {
    e.preventDefault(); e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
    dropEl.classList.add('zt-over');
  }));
  ['dragleave', 'dragend'].forEach(t => dropEl.addEventListener(t, () => dropEl.classList.remove('zt-over')));
  dropEl.addEventListener('drop', e => {
    e.preventDefault(); e.stopPropagation();
    dropEl.classList.remove('zt-over');
    takeAll(e.dataTransfer && e.dataTransfer.files);
  });
  dropEl.addEventListener('click', e => { if (e.target === dropEl || e.target.closest('.zt-drop-word')) fileIn.click(); });

  /* The bare paper takes a drop too, and the picture lands exactly where it
     was let go. Anything dropped ON a gizmo is left alone — the forge has a
     drop zone of its own and it must keep it. */
  const bench = Lab.bench || document.getElementById('bench');
  const onPaper = e => !e.target.closest('.gz') && !e.target.closest('.shelf');
  ['dragenter', 'dragover'].forEach(t => bench.addEventListener(t, e => {
    if (!onPaper(e) || !e.dataTransfer) return;
    const kinds = [...(e.dataTransfer.types || [])];
    if (!kinds.includes('Files')) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    document.body.classList.add('zt-catching');
  }));
  ['dragleave', 'dragend'].forEach(t => bench.addEventListener(t, e => {
    if (e.relatedTarget && bench.contains(e.relatedTarget)) return;
    document.body.classList.remove('zt-catching');
  }));
  bench.addEventListener('drop', e => {
    document.body.classList.remove('zt-catching');
    if (!onPaper(e) || !e.dataTransfer || !e.dataTransfer.files.length) return;
    e.preventDefault();
    takeAll(e.dataTransfer.files, Lab.toWorld(e.clientX, e.clientY));
  });

  // and paste — but never out from under something being typed into
  document.addEventListener('paste', e => {
    const t = e.target;
    if (t && (t.isContentEditable || /^(input|textarea|select)$/i.test(t.tagName))) return;
    const items = [...((e.clipboardData && e.clipboardData.files) || [])];
    if (!items.length) return;
    e.preventDefault();
    takeAll(items);
  });

  /* ── wiring ─────────────────────────────────────────────────────────────── */
  function render() {
    renderPins();
    renderWall();
    renderWorks();
    if (Lab.applyGates) Lab.applyGates();
  }

  store.on(render);
  document.addEventListener('lab:role', render);
  render();

  return { take, takeRemote, pin, pinAt, takeDown, store, LANDS, MAX_PINS };
})();
