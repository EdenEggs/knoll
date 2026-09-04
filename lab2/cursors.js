/* ─── knoll / lab 2 — cursors: everybody else on the bench ─────────────────
   Open the bench while somebody else has it open and you see their pointer
   moving over the paper — an arrow in a colour of its own, with a ring of
   the same colour round its tip — and they see yours. One colour per
   visitor, the same colour on every screen, and nothing else about them:
   no name, no picture. It is figma's trick, here for the reason it is
   there — a canvas is a better place when you can see who else is on it.

   WHAT TRAVELS. A pair of numbers, twenty times a second at most, in WORLD
   coordinates (Lab.toWorld) — so a cursor lands on the thing it is over,
   at whatever zoom the other screen is at, and not on the same pixel of a
   different view. A zero means 'gone': the tab hidden, the pointer out of
   the window, a finger lifted. That is the whole protocol.

   HOW IT TRAVELS, AND WHY THERE IS NO SERVER. The site is static files on
   a host with nowhere to keep a socket open, so the visitors talk to each
   other directly, browser to browser, over WebRTC. Finding each other is
   the one part that needs anybody in the middle, and trystero
   (vendor/trystero-nostr.js — one bundled file, see its header) does that
   over the public Nostr relays: a room named after the host, so a bench
   served from localhost never meets the one at knoll.space. Once two
   browsers have found each other the relays hear nothing more; the cursors
   go over a data channel, encrypted end to end. What another visitor CAN
   learn is what the other end of any WebRTC call learns — your IP address,
   in the connection itself — and where your pointer is on the paper; the
   relays and the STUN servers see a visitor come and go, and nothing of
   the pointer. The handshake hashes and encrypts with SubtleCrypto, which
   only a secure context has (https, or localhost) — a bench served over
   plain http to a phone on the LAN has no cursors, and nothing else is
   missing. A network that will not let two browsers connect at all (some
   office ones) simply never shows a cursor, and nothing else on the bench
   knows or cares: this file is a passenger, started after the page has
   loaded and gone idle, and it fails silent.

   WHAT A STRANGER CAN DO. The room is public and has no door, so anyone
   who reads this file can join it and send what they like. What they get
   for it is bounded here: a point from one visitor that arrives within
   HEARD ms of the last is dropped unheard — no hand moves faster than the
   sender's own RATE — and a visitor who keeps that up for a second is cut
   off; a point off the edge of any sane paper (LIMIT) is dropped; past CAP
   visitors a newcomer is turned away at the handshake, since every visitor
   is joined to every other and that is a crowd of a few dozen, not a chat
   server. What is not bounded is the library's own reassembly of a
   payload sent in pieces (see the vendor header): a hostile visitor can
   run an open tab out of memory, which costs that tab a reload and nothing
   else — nothing here is kept.

   THE LIBRARY IS FETCHED LATE, ON PURPOSE. trystero makes itself a keypair
   the moment it runs — sixty-odd milliseconds of arithmetic — and a
   deferred <script> runs before DOMContentLoaded, which is the line the
   bench's own start waits on. So index.html loads only this file, and
   this file adds the bundle's <script> tag itself once the page has loaded
   and gone idle: the opening frame pays nothing, and a visitor who leaves
   inside a second never fetches it at all.

   WHERE THEY ARE DRAWN. In a layer INSIDE #bench-world, at world
   coordinates, so a pan — which is a scroll (lab.js: THE CAMERA IS A
   SCROLL) — carries every cursor with the paper and this file does not
   hear about it. What a cursor pays for that is a counter-scale of 1/zoom
   so it stays the size of a cursor: every pose reads the zoom as it is,
   and the ones already drawn are redrawn when it changes. 'lab:zoom' says
   so at the end of a zoom; a GLIDE (shift 1, reset) moves the zoom a
   little every frame and says so only when it lands, so the scroll each
   of those frames brings is checked for a zoom that moved, and the
   cursors keep step. A cursor moves the way the sheet does: its transform
   is a Web Animation whose keyframes are rewritten (the drive() argument
   in lab.js — a plain transform write re-layerises the page), and each
   arrival is a short tween from wherever the cursor is NOW, mid-flight,
   so twenty points a second read as a movement and not a stutter.

   WHAT THIS FILE HEARS. pointermove on the window, in the capture phase,
   because lab.js stops a move propagating during a pan or a band
   (about.md §10). The shield lying over every frame means the pointer is
   the page's almost everywhere; the one place it is not is inside the
   frame you have clicked into, whose document takes the pointer for
   itself — so every document that boots gets listeners of its own, and a
   move inside it is put back into the page's coordinates through the
   frame's rectangle; a finger lifted in there says 'gone' the same way it
   does on the paper. A pan or a zoom under a still pointer re-sends it,
   since the world point under it has changed even though it has not.

   Nothing here is kept: no storage, no cookies, no id that outlives the
   tab. Two people on the same bench, pointing. */

window.Company = (function () {
  if (!window.Lab || !window.Frames) return null;
  // no WebRTC, or no SubtleCrypto (plain http off localhost): no cursors, and nothing else is missing
  if (typeof window.RTCPeerConnection !== 'function' || !(window.crypto && window.crypto.subtle)) return null;

  const world = Lab.world, bench = Lab.bench;

  const LIB   = 'vendor/trystero-nostr.js';   // relative, like every other src on the page
  const APP   = 'knoll-lab2';
  const ROOM  = location.host || 'nowhere';   // one bench per host
  const RATE  = 50;      // ms between sends: twenty a second
  const TWEEN = 70;      // ms a remote cursor spends getting to its next point — a shade over RATE, so it is still moving when the next one lands
  const AWAY  = 60000;   // ms of silence before a cursor is taken off the paper
  const SWEEP = 15000;   // how often silence is checked
  const HEARD = 20;      // ms: a point from one visitor closer than this to their last is dropped — nobody sends faster than RATE
  const FLOOD = 200;     // points dropped in one second that get a visitor cut off
  const LIMIT = 1e5;     // world px: further out than this is not a pointer on the paper
  const CAP   = 48;      // visitors at once — 'a few dozen'; a newcomer past it is turned away at the handshake

  /* twelve colours that read on cream paper — the house pink, blue, green
     and amber first, then the rest of the wheel, each far enough from its
     neighbours to tell apart at a glance. A visitor's colour is a hash of
     the id trystero gave them, so every screen paints them the same. */
  const PALETTE = ['#c93b82', '#5871f5', '#2fae76', '#f59321', '#8e44d9', '#1aa3b8',
                   '#e04b3c', '#3b6fd6', '#7cb518', '#d63d9a', '#0f8f6a', '#b8741f'];
  const colour = id => {
    let h = 2166136261;                                          // FNV-1a, 32 bit
    for (let i = 0; i < id.length; i++) { h ^= id.charCodeAt(i); h = Math.imul(h, 16777619); }
    return PALETTE[(h >>> 0) % PALETTE.length];
  };

  // ── the layer, and one cursor per visitor ───────────────────────────────
  const layer = document.createElement('div');
  layer.className = 'company';
  layer.setAttribute('aria-hidden', 'true');
  world.appendChild(layer);

  // the tip is at 3,2.5 of the 24-box; lab.css sits the svg so that point is the element's origin
  const ARROW = '<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">'
              + '<path d="M3 2.5v17.8l4.9-4.3 3.3 7.2 3-1.4-3.2-7h6.8z"/></svg>';

  const cursors = new Map();   // peerId → { el, anim, fx, fy, tx, ty, t0, seen, heard, win, over, away, fresh }
  let Z = Lab.zoom;            // the zoom the cursors were last drawn at

  // a pose reads the zoom AS IT IS, so a point arriving mid-glide is drawn right the first time
  const pose = (x, y) => 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px) scale(' + (1 / Lab.zoom).toFixed(4) + ')';

  function make(id) {
    const el = document.createElement('div');
    el.className = 'company-cursor';
    el.style.setProperty('--c', colour(id));
    el.innerHTML = ARROW;
    layer.appendChild(el);
    const c = { el, anim: null, fx: 0, fy: 0, tx: 0, ty: 0, t0: 0, seen: 0, heard: 0, win: 0, over: 0, away: false, fresh: true };
    cursors.set(id, c);
    return c;
  }

  // where a cursor IS at this moment: partway along its tween
  function now(c) {
    const k = Math.min(1, Math.max(0, (performance.now() - c.t0) / TWEEN));
    return { x: c.fx + (c.tx - c.fx) * k, y: c.fy + (c.ty - c.fy) * k };
  }

  // the tween, as a Web Animation with its keyframes rewritten — never a style.transform write
  function drive(c, from, to) {
    const frames = [{ transform: pose(from.x, from.y) }, { transform: pose(to.x, to.y) }];
    if (c.anim) {
      c.anim.effect.setKeyframes(frames);
      c.anim.currentTime = 0;
      c.anim.play();
    } else {
      c.anim = c.el.animate(frames, { duration: TWEEN, fill: 'both', easing: 'linear' });
    }
  }

  function place(id, x, y) {
    const c = cursors.get(id) || make(id);
    const from = c.fresh ? { x, y } : now(c);    // first sight: appear there, no tween in from the origin
    c.fx = from.x; c.fy = from.y; c.tx = x; c.ty = y; c.t0 = performance.now();
    drive(c, from, { x, y });
    c.seen = c.heard = c.t0;
    c.fresh = false;
    if (c.away) { c.away = false; c.el.classList.remove('away'); }
  }

  function hide(id) {
    const c = cursors.get(id);
    if (c && !c.away) { c.away = true; c.el.classList.add('away'); }
  }

  function drop(id) {
    const c = cursors.get(id);
    if (!c) return;
    if (c.anim) c.anim.cancel();
    c.el.remove();
    cursors.delete(id);
  }

  // the zoom changed since the cursors were drawn: every one keeps its place and takes the new counter-scale
  function rescale() {
    const z = Lab.zoom;
    if (!(z > 0) || z === Z) return;
    Z = z;
    cursors.forEach(c => {
      const p = now(c);
      c.fx = p.x; c.fy = p.y; c.t0 = performance.now();
      drive(c, p, { x: c.tx, y: c.ty });
    });
  }
  document.addEventListener('lab:zoom', rescale);

  function sweep() {
    const t = performance.now();
    cursors.forEach((c, id) => { if (!c.away && t - c.seen > AWAY) hide(id); });
  }

  // ── saying where you are ────────────────────────────────────────────────
  let room = null, send = null, peers = 0;
  let last = 0, timer = 0, pend = null, cx = NaN, cy = NaN, out = true;

  function flush() {
    timer = 0;
    if (!send || pend === null) return;
    last = performance.now();
    const m = pend; pend = null;
    if (!peers) return;                       // nobody to tell — it is not queued; the next move says it
    try { Promise.resolve(send(m)).catch(() => {}); } catch (e) {}   // send is async: a closed channel rejects rather than throws
  }

  function queue(m) {
    pend = m;
    const wait = RATE - (performance.now() - last);
    if (wait <= 0) flush();
    else if (!timer) timer = setTimeout(flush, wait);
  }

  // the pointer is here, in the page's client pixels
  function at(x, y) {
    cx = x; cy = y; out = false;
    const w = Lab.toWorld(x, y);
    queue([Math.round(w.x), Math.round(w.y)]);
  }

  function gone() {
    if (out) return;
    out = true; cx = cy = NaN;
    queue(0);
  }

  // a finger only points while it is down; a mouse points whenever it moves
  const touching = e => e.pointerType !== 'touch' || (e.buttons & 1) === 1;
  const finger = e => e.pointerType === 'touch';
  const opts = { capture: true, passive: true };
  window.addEventListener('pointermove', e => { if (touching(e)) at(e.clientX, e.clientY); }, opts);
  window.addEventListener('pointerdown', e => { if (finger(e)) at(e.clientX, e.clientY); }, opts);
  window.addEventListener('pointerup', e => { if (finger(e)) gone(); }, opts);
  window.addEventListener('pointercancel', e => { if (finger(e)) gone(); }, opts);
  document.documentElement.addEventListener('pointerleave', gone);
  document.addEventListener('visibilitychange', () => { if (document.hidden) gone(); });

  /* the paper moved under a still pointer: the world point under it is a
     new one. And a scroll that came with a zoom step — every frame of a
     glide is one — is where a zoom the event has not announced yet is
     caught (WHERE THEY ARE DRAWN, above). lab.js's own scroll listener is
     registered first and has already adopted the scroll into PX/PY by the
     time this one runs, so toWorld is current. */
  const resay = () => { if (!out && !isNaN(cx)) at(cx, cy); };
  bench.addEventListener('scroll', () => { rescale(); resay(); }, { passive: true });
  document.addEventListener('lab:zoom', resay);

  /* ── reaching into the frames ──────────────────────────────────────────
     A booted document that has been clicked into takes the pointer for
     itself, so it gets listeners of its own, and a move inside it comes
     back out through the frame's rectangle — read at most every 150ms
     while the pointer is in there, since a frame being used is a frame
     the camera has stopped over. A finger's down and up are heard here
     too, since the window never sees them from inside a frame. Same
     origin, so the reach works; opened off the disk it does not, and the
     frame is simply a gap, like every other reach-in on the bench
     (about.md §10). */
  const HOOK = '__knollCursors';
  function reach(f) {
    let doc; try { doc = f.contentDocument; } catch (e) { return; }
    if (!doc || doc[HOOK]) return;
    doc[HOOK] = true;
    let box = null, when = 0;
    const inside = e => {                     // the frame's pixels, put back into the page's
      const t = performance.now();
      if (!box || t - when > 150) { box = f.getBoundingClientRect(); when = t; }
      const w = f.contentWindow, k = w && w.innerWidth ? box.width / w.innerWidth : 1;
      at(box.left + e.clientX * k, box.top + e.clientY * k);
    };
    doc.addEventListener('pointermove', e => { if (touching(e)) inside(e); }, opts);
    doc.addEventListener('pointerdown', e => { if (finger(e)) inside(e); }, opts);
    doc.addEventListener('pointerup', e => { if (finger(e)) gone(); }, opts);
    doc.addEventListener('pointercancel', e => { if (finger(e)) gone(); }, opts);
  }
  window.addEventListener('message', e => {
    if (!e.data || e.data.type !== '__dc_booted') return;
    const p = Frames.panels.find(q => {
      if (q.art) return false;
      try { return q.el.querySelector('iframe').contentWindow === e.source; } catch (err) { return false; }
    });
    if (p) reach(p.el.querySelector('iframe'));
  });
  document.querySelectorAll('.gz.booted iframe').forEach(reach);   // anything up before this file ran

  // ── the room ────────────────────────────────────────────────────────────
  const banned = new Set();                   // cut off for flooding; not let back in this session

  function cut(id) {
    banned.add(id);
    drop(id);
    try { const pc = room && room.getPeers()[id]; if (pc && pc.close) pc.close(); } catch (e) {}
  }

  function hear(m, meta) {
    const id = meta && meta.peerId;
    if (!id) return;
    const c = cursors.get(id);
    if (m === 0) { if (c) hide(id); return; }
    if (!Array.isArray(m) || m.length !== 2) return;
    const x = +m[0], y = +m[1];
    if (!(Math.abs(x) <= LIMIT && Math.abs(y) <= LIMIT)) return;     // off any paper — and NaN fails this too
    const t = performance.now();
    if (c) {
      if (t - c.heard < HEARD) {                                      // faster than any hand: dropped, and counted
        if (t - c.win > 1000) { c.win = t; c.over = 0; }
        if (++c.over > FLOOD) cut(id);
        return;
      }
    } else if (cursors.size >= CAP) return;
    place(id, x, y);
  }

  function join() {
    if (room) return room;
    const T = window.Trystero;
    if (!T || typeof T.joinRoom !== 'function') return null;
    let r;
    try {
      r = T.joinRoom({ appId: APP, relayConfig: { warnOnRelayFailure: false } }, ROOM, {
        // before a newcomer becomes a peer: a full room, or one cut off, is turned away (a throw is a no)
        onPeerHandshake: id => { if (banned.has(id) || peers >= CAP) throw new Error('full'); }
      });
    } catch (e) { return null; }
    room = r;
    const a = r.makeAction('cursor');         // trystero 0.25's shape: an object with send and onMessage
    send = m => a.send(m);
    a.onMessage = hear;
    r.onPeerJoin = () => { peers++; resay(); };                 // whoever just arrived is told where you are
    r.onPeerLeave = id => { peers = Math.max(0, peers - 1); drop(id); };
    window.addEventListener('pagehide', () => { try { r.leave(); } catch (e) {} }, { once: true });
    setInterval(sweep, SWEEP);
    return r;
  }

  // the bundle, fetched only now (THE LIBRARY IS FETCHED LATE, above); joins the moment it has run
  let lib = null;
  function fetchLib() {
    if (lib || window.Trystero) { join(); return; }
    lib = document.createElement('script');
    lib.src = LIB;
    lib.async = true;
    lib.onload = join;
    lib.onerror = () => { lib = null; };      // a host without the file, or offline: no cursors, no fuss
    document.head.appendChild(lib);
  }

  // after the page has loaded and gone idle — the opening frame comes first
  function start() {
    if (typeof requestIdleCallback === 'function') requestIdleCallback(fetchLib, { timeout: 4000 });
    else setTimeout(fetchLib, 1500);
  }
  if (document.readyState === 'complete') start();
  else window.addEventListener('load', start, { once: true });

  return {
    join,
    get id() { return window.Trystero ? window.Trystero.selfId : null; },
    get peers() { return peers; },
    get cursors() { return cursors.size; },
    get room() { return room; }
  };
})();
