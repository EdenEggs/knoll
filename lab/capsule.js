/* ─── THE TIME CAPSULE ─────────────────────────────────────────────────────
   Contribution, not votes. A chest is buried in the hill with a date on the
   sign. Anyone can lower one thing in — a note or a drawing — before it
   seals; nobody sees inside, and then one day the lid comes up and the lot
   spills back out. Roles:
     user       lowers one keepsake in, then waits like everybody else
     moderator  + can give the chest a shake and hear roughly how full it is
     owner      + sets the day, seals it, cracks it early, buries a fresh one
   State lives in Lab.store('capsule') on this device. */

window.Capsule = (function () {
  const $ = id => document.getElementById(id);
  const dig = $('tc-dig'), canvas = $('tc-canvas'), g = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height, GRASS = 58;
  const cap = $('tc-cap'), rattle = $('tc-rattle');
  const form = $('tc-form'), tabNote = $('tc-tab-note'), tabDraw = $('tc-tab-draw');
  const noteIn = $('tc-note'), padHost = $('tc-pad'), signIn = $('tc-sign');
  const shutMsg = $('tc-shut'), count = $('tc-count');
  const dateIn = $('tc-date'), sealBtn = $('tc-seal'), crackBtn = $('tc-crack'), freshBtn = $('tc-fresh');
  const spill = $('tc-spill'), spillCap = $('tc-spill-cap'), spillGrid = $('tc-spill-grid');
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const DAY = 864e5;

  // a small doodle for the seed — the hill, a sun, a flag — drawn once, kept as a data-url
  function doodle() {
    const c = document.createElement('canvas'); c.width = c.height = 96;
    const d = c.getContext('2d');
    d.fillStyle = '#fff'; d.fillRect(0, 0, 96, 96);
    d.lineCap = 'round'; d.lineJoin = 'round';
    d.strokeStyle = '#2fae76'; d.lineWidth = 5;
    d.beginPath(); d.moveTo(6, 80); d.quadraticCurveTo(48, 34, 90, 80); d.stroke();
    d.strokeStyle = '#f59321'; d.lineWidth = 3;
    d.beginPath(); d.arc(76, 20, 8, 0, Math.PI * 2); d.stroke();
    for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; d.beginPath(); d.moveTo(76 + Math.cos(a) * 12, 20 + Math.sin(a) * 12); d.lineTo(76 + Math.cos(a) * 15, 20 + Math.sin(a) * 15); d.stroke(); }
    d.strokeStyle = '#26212a'; d.lineWidth = 4;
    d.beginPath(); d.moveTo(48, 58); d.lineTo(48, 28); d.stroke();
    d.fillStyle = '#ef4d98'; d.beginPath(); d.moveTo(48, 28); d.lineTo(66, 34); d.lineTo(48, 40); d.closePath(); d.fill();
    return c.toDataURL('image/png');
  }

  function seed() {
    const now = Date.now(), buried = now - 9 * DAY;
    return {
      buried, opens: now + 21 * DAY, sealed: false, openedAt: null, mine: false,
      items: [
        { id: 'seed-1', type: 'note', text: 'if you are reading this, the hill still stands.', by: 'the founders', ts: buried + 36e5 },
        { id: 'seed-2', type: 'note', text: 'the gnome was here. he says hello across time.', by: 'the gnome (dictated)', ts: buried + 2 * DAY },
        { id: 'seed-3', type: 'drawing', art: doodle(), by: 'somebody with a pencil', ts: buried + 4 * DAY }
      ]
    };
  }
  const store = Lab.store('capsule', seed);
  const S = () => store.get();
  const isMod = () => Lab.role === 'moderator' || Lab.role === 'owner';
  const isOwner = () => Lab.role === 'owner';

  const fmtDate = t => new Date(t).toLocaleDateString();
  const fmtISO = t => { const d = new Date(t); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };

  function signText() {
    const s = S();
    if (s.openedAt) return 'it spilled';
    const n = Math.ceil((s.opens - Date.now()) / DAY);
    const when = n <= 0 ? 'opens today' : n === 1 ? 'opens tomorrow' : 'opens in ' + n + ' days';
    return (s.sealed ? 'sealed · ' : '') + when;
  }
  function idleCap() {
    const s = S();
    if (s.openedAt) return 'opened ' + fmtDate(s.openedAt) + '. everything it held is below, in the spill.';
    if (s.sealed) return 'sealed. the day is still ' + fmtDate(s.opens) + ' — the lock is not decorative.';
    return 'buried ' + fmtDate(s.buried) + ' · opens ' + fmtDate(s.opens) + '. the worm knows nothing.';
  }

  // ── the dig site ───────────────────────────────────────────────────────
  let anim = null;                                            // { t0, k } while the lid comes up
  const easeBack = k => 1 + 2.7 * Math.pow(k - 1, 3) + 1.7 * Math.pow(k - 1, 2);

  function drawLock(x, y, sc, lw, open) {
    g.save(); g.translate(x, y); g.scale(sc, sc);
    g.strokeStyle = '#8a6d1a'; g.lineWidth = lw / sc;
    g.beginPath();
    if (open) g.arc(-3, -7, 5, Math.PI * 0.7, Math.PI * 1.9);
    else g.arc(0, -6, 5, Math.PI, Math.PI * 2);
    g.stroke();
    g.fillStyle = '#f5c542';
    g.beginPath(); g.roundRect(-7, -6, 14, 12, 3); g.fill(); g.stroke();
    g.fillStyle = '#4a3524'; g.beginPath(); g.arc(0, -1, 1.8, 0, Math.PI * 2); g.fill(); g.fillRect(-0.8, -1, 1.6, 4.5);
    g.restore();
  }

  function draw() {
    const s = S(), now = Date.now();
    const lid = s.openedAt ? 1 : anim ? anim.k : 0;          // 0 shut … 1 ajar
    g.clearRect(0, 0, W, H);

    // sky, sun
    g.fillStyle = '#dfefff'; g.fillRect(0, 0, W, GRASS);
    g.fillStyle = '#fff3e3'; g.beginPath(); g.arc(38, 24, 13, 0, Math.PI * 2); g.fill();

    // soil
    const soil = g.createLinearGradient(0, GRASS, 0, H);
    soil.addColorStop(0, '#a5794e'); soil.addColorStop(1, '#7a5539');
    g.fillStyle = soil; g.fillRect(0, GRASS - 4, W, H - GRASS + 4);

    // grass band with tufts
    g.fillStyle = '#c9ead6'; g.fillRect(0, GRASS - 9, W, 8);
    g.strokeStyle = '#2fae76'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(0, GRASS - 9); g.lineTo(W, GRASS - 9); g.stroke();
    g.strokeStyle = '#8fd1ad'; g.lineWidth = 1.5;
    for (let i = 0; i < 11; i++) { const x = 10 + i * 32 + (i % 3) * 5, y = GRASS - 9; g.beginPath(); g.moveTo(x, y); g.lineTo(x - 2, y - 6); g.moveTo(x + 2, y); g.lineTo(x + 4, y - 5); g.stroke(); }

    // pebbles and speckles (the chest covers whichever it covers)
    for (let i = 0; i < 26; i++) {
      const px = Hill.hash('peb' + i) * W, py = GRASS + 10 + Hill.hash('bep' + i) * (H - GRASS - 18);
      if (i < 10) { g.fillStyle = i % 2 ? '#8a674a' : '#b08c62'; g.beginPath(); g.ellipse(px, py, 3 + (i % 3), 2 + (i % 2), 0, 0, Math.PI * 2); g.fill(); }
      else { g.fillStyle = 'rgba(58,40,25,.18)'; g.fillRect(px, py, 2, 2); }
    }

    // a root — it was here first
    g.strokeStyle = '#6f4a2c'; g.lineWidth = 4; g.lineCap = 'round';
    g.beginPath(); g.moveTo(44, GRASS - 2); g.quadraticCurveTo(30, 86, 40, 118); g.stroke();
    g.lineWidth = 2.5; g.beginPath(); g.moveTo(36, 92); g.quadraticCurveTo(26, 100, 22, 112); g.stroke();
    g.lineWidth = 1.5; g.beginPath(); g.moveTo(40, 112); g.lineTo(48, 120); g.stroke();

    // the worm, resident
    g.strokeStyle = '#ef8fb8'; g.lineWidth = 5;
    g.beginPath(); g.moveTo(244, 188); g.quadraticCurveTo(250, 180, 256, 186); g.quadraticCurveTo(262, 192, 268, 185); g.stroke();
    g.fillStyle = '#26212a'; g.beginPath(); g.arc(268, 184, 1.2, 0, Math.PI * 2); g.fill();

    // disturbed earth around the chest
    g.fillStyle = 'rgba(74,53,36,.4)';
    g.beginPath(); g.ellipse(170, 156, 60, 38, 0, 0, Math.PI * 2); g.fill();

    // interior, showing when the lid lifts
    if (lid > 0.05) { g.fillStyle = '#2f2318'; g.fillRect(131, 128, 78, 10); }

    // chest body: wood slats, iron bands
    g.lineJoin = 'round';
    g.fillStyle = '#8b5a3c'; g.strokeStyle = '#4a3524'; g.lineWidth = 2;
    g.beginPath(); g.roundRect(128, 134, 84, 44, 4); g.fill(); g.stroke();
    g.strokeStyle = '#6f4527'; g.lineWidth = 1.4;
    g.beginPath(); g.moveTo(130, 149); g.lineTo(210, 149); g.moveTo(130, 163); g.lineTo(210, 163); g.stroke();
    g.fillStyle = '#6e6275'; g.strokeStyle = '#4c4353'; g.lineWidth = 1.5;
    g.beginPath(); g.roundRect(140, 133, 8, 46, 2); g.fill(); g.stroke();
    g.beginPath(); g.roundRect(192, 133, 8, 46, 2); g.fill(); g.stroke();

    // the lid, hinged at the left corner
    const heavy = s.sealed && !s.openedAt;
    g.save(); g.translate(128, 134); g.rotate(-1.05 * Math.max(0, easeBack(lid)));
    g.fillStyle = '#a06a45'; g.strokeStyle = '#4a3524'; g.lineWidth = 2;
    g.beginPath(); g.roundRect(0, -17, 84, 17, [9, 9, 3, 3]); g.fill(); g.stroke();
    g.fillStyle = '#6e6275'; g.strokeStyle = '#4c4353'; g.lineWidth = 1.5;
    g.beginPath(); g.roundRect(12, -18, 8, 19, 2); g.fill(); g.stroke();
    g.beginPath(); g.roundRect(64, -18, 8, 19, 2); g.fill(); g.stroke();
    if (heavy) { g.beginPath(); g.roundRect(38, -18, 8, 19, 2); g.fill(); g.stroke(); }   // sealed: one strap more
    g.restore();

    // the lock — on the hasp while shut, in the dirt once it isn't
    if (lid < 0.05) drawLock(170, 140, heavy ? 1.3 : 1, heavy ? 2.4 : 1.6, false);
    else { g.save(); g.translate(228, 180); g.rotate(0.55); drawLock(0, 0, 1, 1.6, true); g.restore(); }

    // glitter, once there is a gap to get out of
    if (lid > 0.25) {
      const tw = Math.floor(now / 450);
      for (let i = 0; i < 12; i++) {
        if (Hill.hash('mote' + i + ':' + (tw % 3)) < 0.25) continue;
        const mx = 132 + Hill.hash('mx' + i) * 76;
        const my = 124 - Hill.hash('my' + i) * 52 * Math.min(1, lid);
        g.fillStyle = ['#f5c542', '#f59321', '#ef4d98'][i % 3];
        g.save(); g.translate(mx, my); g.rotate(Hill.hash('mr' + i) * Math.PI);
        g.fillRect(-2.2, -0.8, 4.4, 1.6); g.fillRect(-0.8, -2.2, 1.6, 4.4);
        g.restore();
      }
    }

    // the sign, planted on the grass — hand-etched, does not negotiate
    const txt = signText();
    g.strokeStyle = '#7a4a22'; g.lineWidth = 3; g.beginPath(); g.moveTo(252, GRASS - 8); g.lineTo(252, 34); g.stroke();
    g.font = 'bold 10.5px Sora, sans-serif';
    const pw = Math.min(168, Math.max(90, g.measureText(txt).width + 22));
    g.fillStyle = '#fdf3d7'; g.strokeStyle = '#7a4a22'; g.lineWidth = 2;
    g.beginPath(); g.roundRect(252 - pw / 2, 14, pw, 22, 3); g.fill(); g.stroke();
    g.fillStyle = '#4a3524'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(txt, 252, 26);
    g.fillStyle = '#8f8296';
    g.beginPath(); g.arc(252 - pw / 2 + 6, 18, 1.4, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.arc(252 + pw / 2 - 6, 18, 1.4, 0, Math.PI * 2); g.fill();
    g.textAlign = 'left'; g.textBaseline = 'alphabetic';
  }

  // ── actions ────────────────────────────────────────────────────────────
  function crack() {
    if (anim || S().openedAt) return;
    anim = { t0: Date.now(), k: 0 };
    const step = () => {
      if (!anim) return;
      anim.k = Math.min(1, (Date.now() - anim.t0) / 1200);
      draw();
      if (anim.k < 1) requestAnimationFrame(step);
      else { anim = null; store.update(s => { s.openedAt = Date.now(); }); }
    };
    requestAnimationFrame(step);
  }

  const nope = el => { el.classList.remove('tc-nope'); void el.offsetWidth; el.classList.add('tc-nope'); };
  const plop = () => { dig.classList.remove('tc-plop', 'tc-shaking'); void dig.offsetWidth; dig.classList.add('tc-plop'); };

  // ── rendering ──────────────────────────────────────────────────────────
  // a keepsake goes in a sleeve: the sleeve takes the animation, the scrap
  // inside keeps the tilt it landed at (see fx.js)
  const sleeve = (it, html) => '<div class="tc-fx" data-fx="tc:' + esc(it.id || it.ts || '') + '">' + html + '</div>';

  function scrap(it) {
    const meta = '<span class="tc-by">— ' + esc(it.by || 'anonymous') + ', ' + fmtDate(it.ts || S().buried) + '</span>';
    if (it.type === 'drawing' && typeof it.art === 'string' && /^data:image\//.test(it.art)) {
      return sleeve(it, '<figure class="tc-frame"><img src="' + esc(it.art) + '" alt="a drawing by ' + esc(it.by || 'anonymous') + '">' + meta + '</figure>');
    }
    return sleeve(it, '<div class="tc-scrap"><p>' + esc(it.text || '') + '</p>' + meta + '</div>');
  }

  function render() {
    const s = S(), n = s.items.length;

    // the deposit window — open, or shut for one of three kind reasons
    const why = s.openedAt ? 'it has already spilled — this one takes no more deposits, only credit. ask the owner to bury a fresh one.'
      : s.sealed ? 'sealed. the lid is down and the lock means it — nothing more goes in. the day is still ' + fmtDate(s.opens) + '.'
      : s.mine ? 'your keepsake is inside. no take-backs.' : null;
    form.hidden = !!why;
    shutMsg.hidden = !why;
    if (why) shutMsg.textContent = why;

    count.textContent = s.openedAt ? 'the chest is empty now — everything it held is below.'
      : n === 0 ? 'nothing inside yet. be the first, or the only.'
      : n + ' something' + (n === 1 ? '' : 's') + ' inside — nobody knows which.';

    // the owner's desk
    dateIn.value = fmtISO(s.opens);
    dateIn.min = fmtISO(Date.now() + DAY);
    dateIn.disabled = !!s.openedAt;
    sealBtn.disabled = s.sealed || !!s.openedAt;
    sealBtn.textContent = s.sealed ? 'sealed.' : 'seal it now';
    crackBtn.hidden = !!s.openedAt;
    freshBtn.hidden = !s.openedAt;

    // the spill
    spill.hidden = !s.openedAt;
    if (s.openedAt) {
      spillCap.textContent = n === 0
        ? 'dug up ' + fmtDate(s.openedAt) + ' — and it was empty. somebody write that down.'
        : 'dug up ' + fmtDate(s.openedAt) + ' — ' + n + ' something' + (n === 1 ? '' : 's') + ', all accounted for.';
      spillGrid.innerHTML = [...s.items].sort((a, b) => (a.ts || 0) - (b.ts || 0)).map(scrap).join('');
    } else spillGrid.innerHTML = '';

    rattle.textContent = '';
    hover = null;
    cap.textContent = idleCap();
    draw();
  }

  // ── wiring ─────────────────────────────────────────────────────────────
  const pad = Pad.mount(padHost, { size: 128 });
  let tab = 'note';
  function setTab(t) {
    tab = t;
    tabNote.setAttribute('aria-pressed', String(t === 'note'));
    tabDraw.setAttribute('aria-pressed', String(t === 'drawing'));
    noteIn.hidden = t !== 'note';
    padHost.hidden = t !== 'drawing';
  }
  tabNote.addEventListener('click', () => setTab('note'));
  tabDraw.addEventListener('click', () => setTab('drawing'));

  form.addEventListener('submit', e => {
    e.preventDefault();
    const s = S();
    if (s.mine || s.sealed || s.openedAt) return;
    const by = (signIn.value.trim() || 'anonymous').slice(0, 24);
    let item = null;
    if (tab === 'note') {
      const text = noteIn.value.replace(/\r/g, '').trim().slice(0, 140);
      if (!text) { nope(noteIn); noteIn.focus(); return; }
      item = { id: Lab.uid(), type: 'note', text, by, ts: Date.now() };
    } else {
      if (pad.isEmpty()) { nope(pad.el); return; }
      item = { id: Lab.uid(), type: 'drawing', art: pad.toDataURL(), by, ts: Date.now() };
    }
    plop();
    store.update(x => { x.items.push(item); x.mine = true; });
    pad.clear(); noteIn.value = ''; signIn.value = '';   // a fresh burial gets a blank form
  });

  $('tc-shake').addEventListener('click', () => {
    if (!isMod()) return;
    dig.classList.remove('tc-shaking', 'tc-plop'); void dig.offsetWidth; dig.classList.add('tc-shaking');
    const s = S(), n = s.items.length;
    rattle.textContent = s.openedAt ? '*nothing* — it has spilled. you are shaking furniture.'
      : n === 0 ? '*fft* — not a sound in it. worrying.'
      : '*clunk* *fft* — sounds like ' + (n <= 4 ? 'a few' : 'about ' + Math.round(n / 2) * 2) + ' somethings.';
  });

  sealBtn.addEventListener('click', () => {
    if (!isOwner() || S().sealed || S().openedAt) return;
    store.update(s => { s.sealed = true; });
  });
  crackBtn.addEventListener('click', () => {
    if (!isOwner() || S().openedAt) return;
    if (!confirm('Crack the capsule open early? There is no closing it again.')) return;
    crack();
  });
  freshBtn.addEventListener('click', () => {
    if (!isOwner() || !S().openedAt) return;
    if (!confirm('Bury a fresh capsule? The spill — every note and drawing — is gone for good, and the hill forgets this one.')) return;
    const now = Date.now();
    store.set({ buried: now, opens: now + 30 * DAY, sealed: false, openedAt: null, mine: false, items: [] });
  });
  dateIn.addEventListener('change', () => {
    if (!isOwner()) return;
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateIn.value || '');
    if (!m) { render(); return; }
    const t = new Date(+m[1], +m[2] - 1, +m[3], 12, 0, 0).getTime();
    if (!isFinite(t) || t <= Date.now()) { render(); return; }
    store.update(s => { if (!s.openedAt) s.opens = t; });
  });

  // pointer → canvas pixels; the rect already carries any page zoom
  let hover = null;
  const at = e => { const r = canvas.getBoundingClientRect(); return { x: (e.clientX - r.left) * W / r.width, y: (e.clientY - r.top) * H / r.height }; };
  function zones() {
    const s = S();
    return [
      { id: 'chest', x0: 122, y0: 108, x1: 218, y1: 184, cap: s.openedAt ? 'the chest, open at last. lighter than it looks.' : s.sealed ? 'the chest. sealed — the lock means it now.' : 'the chest. oak, iron, one lock. going nowhere.' },
      { id: 'sign', x0: 176, y0: 8, x1: 332, y1: 42, cap: 'the sign. etched, not printed. it reads: “' + signText() + '”.' },
      { id: 'worm', x0: 232, y0: 172, x1: 280, y1: 200, cap: 'the worm. it has seen the contents. it is not telling.' },
      { id: 'root', x0: 14, y0: 60, x1: 60, y1: 128, cap: 'a root. it was here first.' },
      { id: 'sun', x0: 22, y0: 8, x1: 56, y1: 42, cap: 'the sun, at its post. it has done this before.' }
    ];
  }
  canvas.addEventListener('pointermove', e => {
    const p = at(e);
    const z = zones().find(z => p.x >= z.x0 && p.x <= z.x1 && p.y >= z.y0 && p.y <= z.y1);
    const id = z ? z.id : null;
    if (id !== hover) { hover = id; cap.textContent = z ? z.cap : idleCap(); }
  });
  canvas.addEventListener('pointerleave', () => { hover = null; cap.textContent = idleCap(); });
  canvas.addEventListener('click', e => {
    const p = at(e);
    if (p.x < 122 || p.x > 218 || p.y < 108 || p.y > 184) return;
    if (S().openedAt) { cap.textContent = 'you knock on the open lid. it echoes. all done here.'; return; }
    plop();
    cap.textContent = '*knock knock* — nothing knocks back. patience.';
  });

  // ── the hill ───────────────────────────────────────────────────────────
  Hill.addSource(() => {
    const s = S();
    return [{
      // the id carries the burial date: a fresh burial is a new landmark, so
      // the naming ceremony can name each capsule in its turn
      id: 'the-capsule-' + s.buried, kind: 'chest', x: 0.34, born: s.buried, open: !!s.openedAt,
      label: s.openedAt
        ? 'the time capsule — opened ' + fmtDate(s.openedAt) + '. it spilled.'
        : 'the time capsule — sealed until ' + fmtDate(s.opens) + '. no peeking.'
    }];
  });

  store.on(() => { render(); Hill.redraw(); });
  document.addEventListener('lab:role', render);
  setTab('note');
  render();

  // the clock: due on load, or due while the page sits open
  if (!S().openedAt && Date.now() >= S().opens) crack();
  setInterval(() => {
    const s = S();
    if (!s.openedAt && Date.now() >= s.opens) crack();
    else if (!s.openedAt && !anim) draw();                    // the sign keeps honest time
  }, 60000);
  // glitter twinkles, but only once there is glitter
  setInterval(() => { if (S().openedAt && !anim) draw(); }, 450);
  Lab.hidpi(canvas, draw);              // repaint at the camera's resolution

  return { store, crack };
})();