/* ─── THE WORKSHOP SHED ────────────────────────────────────────────────────
   The roadmap, except it is a shed. Whatever is being built sits on the
   workbench as a half-finished contraption that gains parts as it gets closer;
   anything further out is a lump under a tarp with a question mark on it. When
   a thing ships, the gnome carries it out the door and screws it to the hill.
   Roles:
     user       sees the shed; tarps are just tarps
     moderator  can peek under tarps and leave notes
     owner      adds things, slides progress, moves bench ⇄ tarp, ships, scraps
   State lives in Lab.store('workshop') on this device. */

window.Workshop = (function () {
  const $ = id => document.getElementById(id);
  const canvas = $('sh-canvas'), g = canvas.getContext('2d'), W = canvas.width, H = canvas.height;
  const cap = $('sh-cap'), list = $('sh-list'), form = $('sh-add'), titleIn = $('sh-title');
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function seed() {
    const now = Date.now(), d = 864e5;
    return {
      next: 11,
      items: [
        { id: 's6', title: 'The character forge', stage: 'shipped', progress: 100, note: '', seed: 2, shipped: now - 12 * d },
        { id: 's1', title: 'The petition board', stage: 'shipped', progress: 100, note: '', seed: 3, shipped: now - 9 * d },
        { id: 's2', title: 'The naming ceremony', stage: 'shipped', progress: 100, note: '', seed: 7, shipped: now - 6 * d },
        { id: 's3', title: 'The law book', stage: 'shipped', progress: 100, note: '', seed: 11, shipped: now - 5 * d },
        { id: 's4', title: 'The museum', stage: 'shipped', progress: 100, note: '', seed: 5, shipped: now - 4 * d },
        { id: 's5', title: 'The monument', stage: 'shipped', progress: 100, note: '', seed: 9, shipped: now - 3 * d },
        { id: 's7', title: 'The elections', stage: 'shipped', progress: 100, note: '', seed: 4, shipped: now - 2 * d },
        { id: 's8', title: 'The time capsule', stage: 'shipped', progress: 100, note: '', seed: 8, shipped: now - d },
        { id: 's9', title: 'The weather machine', stage: 'bench', progress: 44, note: '', seed: 6 },
        { id: 's10', title: 'Season two of the hill', stage: 'tarp', progress: 0, note: '', seed: 13 }
      ]
    };
  }
  const store = Lab.store('workshop', seed);
  const S = () => store.get();
  const role = () => Lab.role;
  const isMod = () => role() === 'moderator' || role() === 'owner';
  const isOwner = () => role() === 'owner';

  const BENCH_Y = 152, FLOOR_Y = H * 0.74, DOOR_X = W - 50;
  let anim = null;        // { item, t0 } while the gnome is carrying something out
  let hover = null, hits = [];

  // ── drawing ────────────────────────────────────────────────────────────
  // a contraption: six parts that appear as progress climbs; the next missing ones show as ghosts
  const PARTS = [
    { at: 0, draw: (x, y, c) => { g.fillStyle = c ? '#6e6275' : 'transparent'; g.strokeStyle = '#6e6275'; g.beginPath(); g.rect(x - 22, y - 6, 44, 6); g.fill(); g.stroke(); } },
    { at: 15, draw: (x, y, c, body) => { g.fillStyle = c ? body : 'transparent'; g.strokeStyle = '#2e2636'; g.beginPath(); g.roundRect(x - 16, y - 30, 32, 24, 4); g.fill(); g.stroke(); } },
    { at: 35, draw: (x, y, c) => { g.strokeStyle = '#5871f5'; g.fillStyle = c ? '#dfe5ff' : 'transparent'; g.beginPath(); g.arc(x - 6, y - 18, 7, 0, Math.PI * 2); g.fill(); g.stroke(); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; g.beginPath(); g.moveTo(x - 6 + Math.cos(a) * 7, y - 18 + Math.sin(a) * 7); g.lineTo(x - 6 + Math.cos(a) * 10, y - 18 + Math.sin(a) * 10); g.stroke(); } } },
    { at: 55, draw: (x, y) => { g.strokeStyle = '#8f8296'; g.lineWidth = 4; g.beginPath(); g.moveTo(x + 8, y - 30); g.lineTo(x + 8, y - 42); g.lineTo(x + 22, y - 42); g.stroke(); g.lineWidth = 1.6; } },
    { at: 72, draw: (x, y, c) => { g.strokeStyle = '#2e2636'; g.fillStyle = c ? '#fff' : 'transparent'; g.beginPath(); g.arc(x + 7, y - 13, 5.5, Math.PI, Math.PI * 2); g.closePath(); g.fill(); g.stroke(); if (c) { g.strokeStyle = '#ef4d98'; g.beginPath(); g.moveTo(x + 7, y - 13); g.lineTo(x + 10, y - 17); g.stroke(); } } },
    { at: 90, draw: (x, y, c, body, lit) => { g.strokeStyle = '#2e2636'; g.beginPath(); g.moveTo(x - 6, y - 30); g.lineTo(x - 6, y - 38); g.stroke(); if (lit) { g.fillStyle = 'rgba(245,147,33,.25)'; g.beginPath(); g.arc(x - 6, y - 42, 10, 0, Math.PI * 2); g.fill(); } g.fillStyle = c ? (lit ? '#f59321' : '#f6cdb0') : 'transparent'; g.strokeStyle = '#2e2636'; g.beginPath(); g.arc(x - 6, y - 42, 4.5, 0, Math.PI * 2); g.fill(); g.stroke(); } }
  ];
  function drawContraption(x, y, p, seed, scale) {
    const body = 'hsl(' + ((seed * 47) % 360) + ',45%,88%)';
    g.save(); g.translate(x, y); g.scale(scale || 1, scale || 1); g.lineWidth = 1.6; g.lineJoin = 'round';
    let ghosts = 0;
    PARTS.forEach(part => {
      if (p >= part.at) part.draw(0, 0, true, body, p >= 100);
      else if (ghosts < 2) { ghosts++; g.save(); g.setLineDash([3, 3]); g.globalAlpha = 0.45; part.draw(0, 0, false, body, false); g.restore(); }
    });
    g.restore();
  }
  function drawTarp(x, y, n) {
    g.save(); g.lineWidth = 1.6; g.lineJoin = 'round';
    g.fillStyle = '#cbbfd2'; g.strokeStyle = '#8f8296';
    g.beginPath(); g.moveTo(x - 24, y);
    g.quadraticCurveTo(x - 22, y - 30 - n * 2, x - 4, y - 34 - n * 3);
    g.quadraticCurveTo(x + 14, y - 36 - n * 2, x + 24, y - 16);
    g.quadraticCurveTo(x + 28, y - 4, x + 22, y); g.closePath(); g.fill(); g.stroke();
    g.strokeStyle = '#b3a6bb'; g.beginPath(); g.moveTo(x - 10, y - 4); g.lineTo(x - 2, y - 24); g.moveTo(x + 8, y - 2); g.lineTo(x + 12, y - 20); g.stroke();
    g.fillStyle = '#2e2636'; g.font = 'bold 15px Sora, sans-serif'; g.textAlign = 'center'; g.fillText('?', x + 2, y - 10);
    g.restore();
  }
  function drawGnome(x, y, s, carrying) {
    g.save(); g.translate(x, y); g.scale(s, s);
    g.fillStyle = '#3d55c9'; g.beginPath(); g.roundRect(-6, -16, 12, 16, 3); g.fill();
    g.fillStyle = '#f6cdb0'; g.beginPath(); g.arc(0, -19, 5, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#fff'; g.beginPath(); g.moveTo(-4.5, -17); g.lineTo(4.5, -17); g.lineTo(0, -8); g.closePath(); g.fill();
    g.fillStyle = '#d93b4a'; g.beginPath(); g.moveTo(-6, -21); g.lineTo(6, -21); g.lineTo(1, -37); g.closePath(); g.fill();
    if (carrying) { g.strokeStyle = '#f6cdb0'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(-5, -14); g.lineTo(-9, -30); g.moveTo(5, -14); g.lineTo(9, -30); g.stroke(); }
    g.restore();
  }

  function draw(now) {
    g.clearRect(0, 0, W, H);
    // wall & floor
    g.fillStyle = '#f3e6d8'; g.fillRect(0, 0, W, FLOOR_Y);
    g.strokeStyle = '#e6d5c2'; g.lineWidth = 1; for (let y = 22; y < FLOOR_Y; y += 22) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
    g.fillStyle = '#d9c3a5'; g.fillRect(0, FLOOR_Y, W, H - FLOOR_Y);
    g.strokeStyle = '#c7ae8c'; for (let x = 0; x < W; x += 34) { g.beginPath(); g.moveTo(x, FLOOR_Y); g.lineTo(x, H); g.stroke(); }
    // window
    g.fillStyle = '#dfefff'; g.fillRect(22, 18, 64, 46);
    g.fillStyle = '#c9ead6'; g.beginPath(); g.moveTo(22, 64); g.quadraticCurveTo(54, 30, 86, 58); g.lineTo(86, 64); g.closePath(); g.fill();
    g.strokeStyle = '#8b6a4a'; g.lineWidth = 3; g.strokeRect(22, 18, 64, 46); g.beginPath(); g.moveTo(54, 18); g.lineTo(54, 64); g.moveTo(22, 41); g.lineTo(86, 41); g.stroke();
    // pegboard with tools
    g.fillStyle = '#e8d7c6'; g.fillRect(150, 14, 126, 52); g.strokeStyle = '#8b6a4a'; g.lineWidth = 2; g.strokeRect(150, 14, 126, 52);
    g.fillStyle = '#c7ae8c'; for (let y = 22; y < 64; y += 8) for (let x = 158; x < 276; x += 8) { g.beginPath(); g.arc(x, y, 1, 0, 7); g.fill(); }
    g.lineWidth = 1.6; g.strokeStyle = '#2e2636'; g.fillStyle = '#8f8296';
    g.fillRect(166, 26, 14, 7); g.fillStyle = '#b98a5a'; g.fillRect(171, 33, 4, 26);                                   // hammer
    g.strokeStyle = '#6e6275'; g.lineWidth = 4; g.beginPath(); g.moveTo(206, 24); g.lineTo(206, 58); g.stroke(); g.beginPath(); g.arc(206, 24, 6, 0, Math.PI * 2); g.stroke(); g.lineWidth = 1.6;   // wrench
    g.fillStyle = '#d9d2d8'; g.strokeStyle = '#6e6275'; g.beginPath(); g.moveTo(232, 26); g.lineTo(266, 26); g.lineTo(266, 34); g.lineTo(232, 52); g.closePath(); g.fill(); g.stroke();   // saw
    g.fillStyle = '#b98a5a'; g.fillRect(226, 22, 8, 16);
    // door, open onto the hill
    g.fillStyle = '#dfefff'; g.fillRect(DOOR_X, 36, 44, FLOOR_Y - 36);
    g.fillStyle = '#c9ead6'; g.beginPath(); g.moveTo(DOOR_X, FLOOR_Y); g.quadraticCurveTo(DOOR_X + 22, FLOOR_Y - 60, DOOR_X + 44, FLOOR_Y - 20); g.lineTo(DOOR_X + 44, FLOOR_Y); g.closePath(); g.fill();
    g.strokeStyle = '#8b6a4a'; g.lineWidth = 4; g.strokeRect(DOOR_X, 36, 44, FLOOR_Y - 36); g.lineWidth = 1.6;
    // bench
    g.fillStyle = '#b98a5a'; g.strokeStyle = '#7a4a22'; g.lineWidth = 2;
    g.beginPath(); g.rect(24, BENCH_Y, 252, 12); g.fill(); g.stroke();
    g.fillRect(32, BENCH_Y + 12, 8, FLOOR_Y - BENCH_Y - 8); g.fillRect(260, BENCH_Y + 12, 8, FLOOR_Y - BENCH_Y - 8);
    g.lineWidth = 1.6;

    hits = [];
    const s = S();
    const bench = s.items.filter(it => it.stage === 'bench' && !(anim && anim.item.id === it.id)).slice(0, 4);
    bench.forEach((it, i) => {
      const x = 60 + (i + 0.5) * (200 / Math.max(1, bench.length));
      drawContraption(x, BENCH_Y, it.progress, it.seed, bench.length > 3 ? 0.8 : 1);
      hits.push({ it, x, y: BENCH_Y - 22, w: 48, h: 54 });
    });
    const tarps = s.items.filter(it => it.stage === 'tarp');
    tarps.slice(0, 4).forEach((it, i) => {
      // two lumps by the door, then two more under the bench
      const tx = i < 2 ? 300 + i * 48 : 120 + (i - 2) * 60, ty = i < 2 ? H - 12 : H - 10;
      drawTarp(tx, ty, it.seed % 4);
      hits.push({ it, x: tx, y: ty - 18, w: 50, h: 40 });
    });
    if (tarps.length > 4) { g.fillStyle = '#6e6275'; g.font = 'bold 10px Sora, sans-serif'; g.textAlign = 'center'; g.fillText('+' + (tarps.length - 4) + ' more', 345, H - 48); }

    // the gnome
    if (anim) {
      const k = Math.min(1, (now - anim.t0) / 1800);
      const gx = anim.x0 + (DOOR_X + 22 - anim.x0) * k, gy = FLOOR_Y + 22 + Math.abs(Math.sin(k * 28)) * -3;
      drawGnome(gx, gy, 1.5, true);
      if (k < 1) drawContraption(gx, gy - 58, 100, anim.item.seed, 0.7);
    } else drawGnome(34, FLOOR_Y + 22 + Math.sin(now / 900) * 0.8, 1.5, false);

    // hover
    if (hover) { const h = hits.find(h => h.it.id === hover); if (h) { g.strokeStyle = '#c93b82'; g.setLineDash([3, 3]); g.lineWidth = 1.5; g.strokeRect(h.x - h.w / 2, h.y - h.h / 2, h.w, h.h); g.setLineDash([]); } }
  }

  let raf = 0;
  function loop() {
    draw(Date.now());
    if (anim && Date.now() - anim.t0 >= 1800) { anim = null; draw(Date.now()); Hill.redraw(); return; }
    raf = requestAnimationFrame(anim ? loop : () => {});
  }
  setInterval(() => { if (!anim) draw(Date.now()); }, 140);       // the gnome sways

  // ── actions ────────────────────────────────────────────────────────────
  const find = id => S().items.find(i => i.id === id);
  function setProgress(id, p) { store.update(s => { const it = s.items.find(i => i.id === id); if (it) it.progress = Math.max(0, Math.min(100, Math.round(p))); }); }
  function move(id, stage) { store.update(s => { const it = s.items.find(i => i.id === id); if (it && (stage === 'bench' || stage === 'tarp')) { it.stage = stage; if (stage === 'tarp') it.progress = Math.min(it.progress, 10); } }); }
  function ship(id) {
    const it = find(id); if (!it || it.stage === 'shipped') return;
    const h = hits.find(h => h.it.id === id);
    anim = { item: it, t0: Date.now(), x0: h ? h.x : 150 };
    store.update(s => { const x = s.items.find(i => i.id === id); x.stage = 'shipped'; x.progress = 100; x.shipped = Date.now() + 1700; });
    cancelAnimationFrame(raf); loop();
  }
  function add(title) { title = title.trim(); if (!title) return; store.update(s => { s.items.push({ id: Lab.uid(), title, stage: 'tarp', progress: 0, note: '', seed: s.next++ }); }); }
  function scrap(id) { store.update(s => { s.items = s.items.filter(i => i.id !== id); }); }
  function note(id, text) { store.update(s => { const it = s.items.find(i => i.id === id); if (it) it.note = text.slice(0, 200); }); }

  // ── the list ───────────────────────────────────────────────────────────
  const vague = p => p >= 90 ? 'looks nearly done' : p >= 60 ? 'looks mostly built' : p >= 30 ? 'looks half-built' : 'looks like a start';
  function card(it) {
    const peek = isMod();
    const title = it.stage === 'tarp' && !peek ? 'something under a tarp' : it.title;
    let ctl = '';
    if (isOwner()) {
      if (it.stage !== 'shipped') ctl += '<label class="sh-slider"><input type="range" min="0" max="100" value="' + it.progress + '" data-progress></label>';
      if (it.stage === 'tarp') ctl += '<button type="button" class="pb-act" data-act="bench">onto the bench</button>';
      if (it.stage === 'bench') ctl += '<button type="button" class="pb-act" data-act="tarp">under a tarp</button><button type="button" class="pb-act ok" data-act="ship">ship it</button>';
      ctl += '<button type="button" class="pb-act" data-act="scrap">scrap</button>';
    }
    const noteUi = isMod() && it.stage !== 'shipped' ? '<textarea class="sh-note" data-note rows="1" placeholder="mod note…">' + esc(it.note || '') + '</textarea>' : (it.note && isMod() ? '<p class="sh-notep">' + esc(it.note) + '</p>' : '');
    return '<li class="sh-card" data-id="' + it.id + '" data-stage="' + it.stage + '">' +
      '<div class="sh-card-top"><span class="sh-stage">' + (it.stage === 'bench' ? 'on the bench' : it.stage === 'tarp' ? 'under a tarp' : 'on the hill') + '</span>' + (it.stage === 'tarp' && peek ? '<span class="sh-peek">peeked</span>' : '') + '</div>' +
      '<p class="sh-title">' + esc(title) + '</p>' +
      (it.stage === 'bench' ? '<div class="sh-bar"><i style="width:' + it.progress + '%"></i></div><span class="sh-vague">' + (isOwner() ? it.progress + '%' : vague(it.progress)) + '</span>' : '') +
      (it.stage === 'shipped' ? '<span class="sh-vague">screwed to the hill' + (it.shipped ? ' · ' + new Date(it.shipped).toLocaleDateString() : '') + '</span>' : '') +
      noteUi + (ctl ? '<div class="pb-mod">' + ctl + '</div>' : '') +
      '</li>';
  }
  function render() {
    const rank = { bench: 0, tarp: 1, shipped: 2 };
    const items = [...S().items].sort((a, b) => (rank[a.stage] - rank[b.stage]) || (b.progress - a.progress));
    list.innerHTML = items.map(card).join('') || '<li class="pb-empty">an empty shed. the gnome is unsettled.</li>';
    if (!anim) draw(Date.now());
  }

  // ── the hill ───────────────────────────────────────────────────────────
  Hill.addSource(() => S().items.filter(it => it.stage === 'shipped').map(it => ({ id: it.id, kind: 'contraption', x: Hill.hash(it.id), born: it.shipped, label: it.title + ' — shipped, screwed to the hill' })));
  Hill.attach($('sh-hill'), $('sh-hill-cap'), 'things the gnome has screwed to the hill. hover one.');

  // ── wiring ─────────────────────────────────────────────────────────────
  canvas.addEventListener('pointermove', e => {
    const r = canvas.getBoundingClientRect();
    const mx = (e.clientX - r.left) * W / r.width, my = (e.clientY - r.top) * H / r.height;
    const h = hits.find(h => Math.abs(mx - h.x) <= h.w / 2 && Math.abs(my - h.y) <= h.h / 2);
    const id = h ? h.it.id : null;
    if (id !== hover) {
      hover = id;
      cap.textContent = !h ? CAP_IDLE : h.it.stage === 'tarp' ? (isMod() ? h.it.title + ' — under a tarp. you peeked.' : 'a lump under a tarp. could be anything.') : h.it.title + ' — ' + (isOwner() ? h.it.progress + '% done' : vague(h.it.progress));
      if (!anim) draw(Date.now());
    }
  });
  canvas.addEventListener('pointerleave', () => { hover = null; cap.textContent = CAP_IDLE; if (!anim) draw(Date.now()); });
  const CAP_IDLE = 'the roadmap. hover a contraption or a tarp.';
  cap.textContent = CAP_IDLE;

  list.addEventListener('click', e => {
    const li = e.target.closest('.sh-card'), a = e.target.closest('[data-act]'); if (!li || !a) return;
    const id = li.dataset.id, what = a.dataset.act;
    if (!isOwner()) return;
    if (what === 'bench' || what === 'tarp') move(id, what);
    else if (what === 'ship') ship(id);
    else if (what === 'scrap') scrap(id);
  });
  list.addEventListener('input', e => {
    const li = e.target.closest('.sh-card'); if (!li) return;
    if (e.target.matches('[data-progress]') && isOwner()) { setProgressQuiet(li.dataset.id, +e.target.value); }
  });
  list.addEventListener('change', e => {
    const li = e.target.closest('.sh-card'); if (!li) return;
    if (e.target.matches('[data-progress]') && isOwner()) setProgress(li.dataset.id, +e.target.value);
    if (e.target.matches('[data-note]') && isMod()) note(li.dataset.id, e.target.value);
  });
  // dragging the slider redraws the shed live without re-rendering the list under the pointer
  function setProgressQuiet(id, p) {
    const it = find(id); if (!it) return;
    it.progress = Math.max(0, Math.min(100, Math.round(p)));
    const li = list.querySelector('[data-id="' + id + '"]');
    if (li) { const bar = li.querySelector('.sh-bar i'); if (bar) bar.style.width = it.progress + '%'; const v = li.querySelector('.sh-vague'); if (v) v.textContent = it.progress + '%'; }
    if (!anim) draw(Date.now());
  }
  form.addEventListener('submit', e => { e.preventDefault(); add(titleIn.value); titleIn.value = ''; });
  store.on(render);
  document.addEventListener('lab:role', render);
  render();
  // the shed is a bitmap: repaint it bigger when the camera moves in on it
  Lab.hidpi(canvas, () => draw(Date.now()));

  return { ship, add, move, setProgress, scrap, store };
})();
