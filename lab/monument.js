/* ─── THE MONUMENT ─────────────────────────────────────────────────────────
   Contribution, not votes. A stone gnome too big for one person: it only
   rises when enough people each lay a single block — one per shift, whoever
   you are. The scaffolding is the progress bar. Lay the last block and the
   scaffolding comes down and every builder goes on a brass plaque. Roles:
     user       lays one block a shift, signed or not
     moderator  can prise out a wonky block (the last one laid)
     owner      calls shifts, lends the hill's hands, tears it down
   State lives in Lab.store('monument') on this device. */

window.Monument = (function () {
  const $ = id => document.getElementById(id);
  const canvas = $('mo-canvas'), g = canvas.getContext('2d'), W = canvas.width, H = canvas.height;
  const cap = $('mo-cap'), barFill = $('mo-bar-fill'), countEl = $('mo-count');
  const nameIn = $('mo-name'), placeBtn = $('mo-place'), shiftEl = $('mo-shift');
  const plaque = $('mo-plaque'), plaqueNames = $('mo-plaque-names'), plaqueDate = $('mo-plaque-date');
  const lendBtn = $('mo-lend'), nextBtn = $('mo-next'), razeBtn = $('mo-raze'), priseBtn = $('mo-prise');
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // the plan: a great stone gnome, laid in courses from the boots up
  const PLAN = [
    '......#......',
    '.....###.....',
    '.....###.....',
    '....#####....',
    '....#####....',
    '...#######...',
    '.###########.',
    '....#####....',
    '....#####....',
    '....#####....',
    '.....###.....',
    '....#####....',
    '...#######...',
    '...#######...',
    '...#######...',
    '....##.##....',
    '...###.###...'
  ];
  const COLS = PLAN[0].length, ROWS = PLAN.length;
  const ORDER = [];                                     // bottom course first, each course left → right
  for (let y = ROWS - 1; y >= 0; y--) for (let x = 0; x < COLS; x++) if (PLAN[y][x] === '#') ORDER.push({ x, y });
  const TOTAL = ORDER.length;                           // 89, derived from the plan — never stored
  const IDX = {}; ORDER.forEach((c, i) => { IDX[c.y * COLS + c.x] = i; });

  // stone: greys per region, three tints each, picked per cell
  const REGION = y => y <= 6 ? 0 : y <= 8 ? 1 : y <= 10 ? 2 : y <= 14 ? 3 : 4;
  const TINTS = [
    ['#d8c9d3', '#cec0ca', '#c3b5c0'],                  // the hat
    ['#ded2cc', '#d5c8c2', '#cbbdb6'],                  // the head
    ['#e7e1e4', '#dedade', '#d4cfd4'],                  // the beard
    ['#c9c8d5', '#bfbecd', '#b5b4c4'],                  // the coat
    ['#b1a7b3', '#a79daa', '#9c92a0']                   // the boots
  ];

  const CELL = 17, GW = COLS * CELL, GH = ROWS * CELL;
  const OX = Math.round((W - GW) / 2), GROUND = H - 24, OY = GROUND - GH;
  const POOL = ['Maud', 'Wilf', 'Petra', 'Dot', 'Ern', 'Sal', 'Bram', 'Ivy', 'Nel', 'Otto'];
  const SHIFT_MS = 864e5;                               // a shift goes stale after a day

  function seed() {
    const now = Date.now(), span = 9 * 864e5, placed = [];
    for (let i = 0; i < 47; i++) placed.push({
      by: POOL[(i * 7 + ((i / 11) | 0)) % POOL.length],
      ts: now - span + Math.round(i * span / 47)
    });
    return { placed, shift: 6, shiftStart: now, minePlacedShift: null, done: null };
  }
  const store = Lab.store('monument', seed);
  const S = () => store.get();
  const isMod = () => Lab.role === 'moderator' || Lab.role === 'owner';
  const isOwner = () => Lab.role === 'owner';
  const ago = ts => {
    const d = Math.floor((Date.now() - ts) / 864e5);
    return d <= 0 ? 'today' : d === 1 ? '1 day ago' : d + ' days ago';
  };

  // ── a finite animation: a flash on the newest block, or the finishing glitter
  let anim = null, raf = 0, hover = null;
  const CAP_IDLE = 'every block was laid by somebody. hover one.';
  function startAnim(kind, dur) {
    anim = { kind, t0: performance.now(), dur };
    cancelAnimationFrame(raf);
    const loop = () => {
      if (!anim) return;
      if (performance.now() - anim.t0 >= anim.dur) { anim = null; draw(); return; }
      draw();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
  }
  function stopAnim() { cancelAnimationFrame(raf); anim = null; }

  // ── actions ────────────────────────────────────────────────────────────
  function lay(by, mine) {
    let finished = false, laid = false;
    store.update(s => {
      if (s.done || s.placed.length >= TOTAL) return;
      if (mine) {
        if (s.minePlacedShift === s.shift) return;
        s.minePlacedShift = s.shift;
      }
      s.placed.push({ by, ts: Date.now() });
      laid = true;
      if (s.placed.length >= TOTAL) { s.done = Date.now(); finished = true; }
    });
    if (finished) startAnim('sparkle', 1500);
    else if (laid) startAnim('flash', 450);
    return laid;
  }

  function layMine() {
    const s = S();
    if (s.done || s.minePlacedShift === s.shift) return;
    lay((nameIn.value.trim().replace(/\s+/g, ' ') || 'a passing gnome').slice(0, 18), true);
  }

  function nextShift() {
    store.update(s => { if (!s.done) { s.shift++; s.shiftStart = Date.now(); } });
  }

  let lending = false, lendTimer = 0;
  function lend() {
    if (lending || S().done) return;
    lending = true;
    const base = S();                                   // a reset swaps the state object out
    let left = 3 + Math.floor(Math.random() * 5);       // 3–7 blocks, while you watch
    const step = () => {
      if (S() !== base) { lending = false; render(); return; }   // torn down / wiped mid-lend
      lay(POOL[Math.floor(Math.random() * POOL.length)], false);
      left--;
      if (left > 0 && !S().done) lendTimer = setTimeout(step, 430);
      else { lending = false; render(); }
    };
    lendTimer = setTimeout(step, 180);
    render();
  }

  function prise() {
    store.update(s => {
      if (!s.placed.length) return;
      s.placed.pop();
      if (s.done) s.done = null;                        // the plaque comes down with it
    });
  }

  function raze() {
    if (!confirm('Tear the monument down to the grass? Every block, every name.')) return;
    clearTimeout(lendTimer); lending = false; stopAnim();
    store.set({ placed: [], shift: 1, shiftStart: Date.now(), minePlacedShift: null, done: null });
  }

  // ── drawing ────────────────────────────────────────────────────────────
  function drawScaffold(n) {
    const topY = OY + ORDER[n - 1].y * CELL;            // the course being worked
    const lx = OX - 15, rx = OX + GW + 15;
    g.strokeStyle = '#8b5a3c'; g.lineWidth = 3; g.lineCap = 'round';
    g.beginPath();
    g.moveTo(lx, GROUND); g.lineTo(lx, topY - 8);
    g.moveTo(rx, GROUND); g.lineTo(rx, topY - 8);
    g.stroke();
    g.lineWidth = 1.4;
    for (let y = GROUND - CELL * 3; y >= topY; y -= CELL * 3) {   // walk-boards, every third course
      g.fillStyle = '#c98a4b'; g.strokeStyle = '#7a4a22';
      g.beginPath(); g.rect(lx - 4, y, 26, 4); g.fill(); g.stroke();
      g.beginPath(); g.rect(rx - 22, y, 26, 4); g.fill(); g.stroke();
    }
    g.fillStyle = '#c98a4b'; g.strokeStyle = '#7a4a22';           // the top board, behind the work
    g.beginPath(); g.rect(lx, topY - 8, rx - lx, 4); g.fill(); g.stroke();
  }

  function drawSparkle(k) {
    g.save(); g.globalAlpha = 1 - k;
    const hop = Math.floor(k * 8);
    for (let i = 0; i < 14; i++) {
      const c = ORDER[(i * 13 + hop * 7) % TOTAL];
      const x = OX + c.x * CELL + CELL / 2 + Math.sin(i * 5 + k * 9) * 7;
      const y = OY + c.y * CELL + CELL / 2 + Math.cos(i * 3 + k * 7) * 7;
      const r = 2.5 + (i % 3);
      g.strokeStyle = i % 3 ? '#f5c542' : '#ef4d98';
      g.lineWidth = 1.5;
      g.beginPath();
      g.moveTo(x - r, y); g.lineTo(x + r, y);
      g.moveTo(x, y - r); g.lineTo(x, y + r);
      g.stroke();
    }
    g.restore();
  }

  function draw() {
    const s = S(), n = Math.min(s.placed.length, TOTAL);
    g.clearRect(0, 0, W, H);
    // a faint sun, back behind the hat
    g.fillStyle = '#fff3e3'; g.beginPath(); g.arc(W * 0.85, 40, 20, 0, Math.PI * 2); g.fill();
    // the grass it stands on
    g.fillStyle = '#c9ead6'; g.fillRect(0, GROUND, W, H - GROUND);
    g.strokeStyle = '#2fae76'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(0, GROUND); g.lineTo(W, GROUND); g.stroke();
    g.strokeStyle = '#8fd1ad'; g.lineWidth = 1.5;
    for (let i = 0; i < 8; i++) {
      const x = 14 + (i * 41) % (W - 28), y = GROUND + 6 + (i % 3) * 4;
      g.beginPath(); g.moveTo(x, y + 5); g.lineTo(x - 2, y); g.moveTo(x + 1, y + 5); g.lineTo(x + 3, y - 1); g.stroke();
    }
    if (!s.done && n > 0 && n < TOTAL) drawScaffold(n);
    // the plan still to come: faint dashed courses
    if (!s.done) {
      g.save(); g.setLineDash([3, 3]); g.strokeStyle = 'rgba(139,127,146,.4)'; g.lineWidth = 1;
      for (let i = n; i < TOTAL; i++) {
        const c = ORDER[i];
        g.strokeRect(OX + c.x * CELL + 1.5, OY + c.y * CELL + 1.5, CELL - 3, CELL - 3);
      }
      g.restore();
    }
    // the stone so far
    for (let i = 0; i < n; i++) {
      const c = ORDER[i];
      g.fillStyle = TINTS[REGION(c.y)][(c.x * 7 + c.y * 13) % 3];
      g.fillRect(OX + c.x * CELL, OY + c.y * CELL, CELL, CELL);
      g.strokeStyle = 'rgba(46,38,54,.5)'; g.lineWidth = 1;               // the mortar
      g.strokeRect(OX + c.x * CELL + 0.5, OY + c.y * CELL + 0.5, CELL - 1, CELL - 1);
    }
    if (anim) {
      const k = Math.min(1, (performance.now() - anim.t0) / anim.dur);
      if (anim.kind === 'flash' && n) {
        const c = ORDER[n - 1];
        g.save(); g.globalAlpha = 1 - k;
        g.strokeStyle = '#ef4d98'; g.lineWidth = 2.5;
        g.strokeRect(OX + c.x * CELL - 2, OY + c.y * CELL - 2, CELL + 4, CELL + 4);
        g.restore();
      } else if (anim.kind === 'sparkle') drawSparkle(k);
    }
    if (hover != null) {
      const c = ORDER[hover];
      g.strokeStyle = '#c93b82'; g.setLineDash([3, 3]); g.lineWidth = 1.5;
      g.strokeRect(OX + c.x * CELL - 1, OY + c.y * CELL - 1, CELL + 2, CELL + 2);
      g.setLineDash([]);
    }
  }

  // ── rendering ──────────────────────────────────────────────────────────
  function render() {
    const s = S(), n = Math.min(s.placed.length, TOTAL);
    const hands = new Set(s.placed.map(b => b.by)).size;
    barFill.style.width = Math.round(n / TOTAL * 100) + '%';
    countEl.textContent = n + ' of ' + TOTAL + ' blocks · ' + hands + (hands === 1 ? ' hand' : ' hands');
    const minePlaced = s.minePlacedShift === s.shift;
    placeBtn.disabled = !!s.done || minePlaced;
    nameIn.disabled = !!s.done;
    shiftEl.textContent = s.done ? 'the monument stands. down tools.'
      : minePlaced ? 'your block is in — shift ' + s.shift + ' works on.'
      : 'shift ' + s.shift + ' is on. one block each.';
    if (s.done) {
      const first = [], count = Object.create(null);   // null proto: 'constructor' is a fine mark
      s.placed.forEach(b => { if (!(b.by in count)) { count[b.by] = 0; first.push(b.by); } count[b.by]++; });
      plaqueNames.innerHTML = first.map(nm =>
        '<span>' + esc(nm) + (count[nm] > 1 ? ' <b>×' + count[nm] + '</b>' : '') + '</span>').join('<i>·</i>');
      plaqueDate.textContent = 'raised by the hill, ' + new Date(s.done).toLocaleDateString();
    }
    plaque.hidden = !s.done;
    lendBtn.disabled = lending || !!s.done;
    nextBtn.disabled = !!s.done;
    priseBtn.disabled = !n;
    draw();
  }

  // ── wiring ─────────────────────────────────────────────────────────────
  canvas.addEventListener('pointermove', e => {
    const r = canvas.getBoundingClientRect();
    const mx = (e.clientX - r.left) * W / r.width, my = (e.clientY - r.top) * H / r.height;
    const cx = Math.floor((mx - OX) / CELL), cy = Math.floor((my - OY) / CELL);
    let idx = null;
    if (cx >= 0 && cx < COLS && cy >= 0 && cy < ROWS) {
      const i = IDX[cy * COLS + cx];
      if (i !== undefined) idx = i;
    }
    if (idx === hover) return;
    hover = idx;
    if (idx == null) cap.textContent = CAP_IDLE;
    else {
      const s = S();
      cap.textContent = idx < s.placed.length
        ? 'placed by ' + s.placed[idx].by + ' · ' + ago(s.placed[idx].ts)
        : 'an empty course — block ' + (idx + 1) + ' of ' + TOTAL + ' goes here.';
    }
    draw();
  });
  canvas.addEventListener('pointerleave', () => { hover = null; cap.textContent = CAP_IDLE; draw(); });
  cap.textContent = CAP_IDLE;

  placeBtn.addEventListener('click', layMine);
  nameIn.addEventListener('keydown', e => { if (e.key === 'Enter') layMine(); });
  priseBtn.addEventListener('click', () => { if (isMod()) prise(); });
  lendBtn.addEventListener('click', () => { if (isOwner()) lend(); });
  nextBtn.addEventListener('click', () => { if (isOwner()) nextShift(); });
  razeBtn.addEventListener('click', () => { if (isOwner()) raze(); });

  store.on(render);
  document.addEventListener('lab:role', render);

  // a shift left out overnight goes stale: the next visitor starts a new one
  (function () {
    const s = S();
    if (!s.done && Date.now() - s.shiftStart > SHIFT_MS) {
      store.update(st => { st.shift++; st.shiftStart = Date.now(); });
    }
  })();
  render();
  Lab.hidpi(canvas, draw);              // repaint at the camera's resolution

  return { lay, nextShift, lend, prise, raze, store, TOTAL };
})();