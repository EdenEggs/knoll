/* ─── THE HILL ─────────────────────────────────────────────────────────────
   One shared hill, drawn on as many canvases as want it. Gizmos register a
   source (a function returning items); every attached canvas shows the union.
     item: { id, kind: 'pond'|'tree'|'flag'|'bench'|'sign'|'stone'|'contraption',
             label, x: 0..1 along the hill, born: timestamp, n?: number }
   Things born in the last ~1.5s grow in. Hovering an item shows its label in
   the view's caption element. */

window.Hill = (function () {
  const sources = [], views = [];
  let raf = 0;
  let namer = null;       // the naming ceremony: id → the name the hill voted for
  let mayor = null;       // the elections: while someone holds office, the lawn gnome wears the sash
  function setNamer(fn) { namer = typeof fn === 'function' ? fn : null; redrawAll(); }
  function setMayor(m) { mayor = m || null; redrawAll(); }
  const captionFor = it => {
    const nm = namer ? namer(it.id) : null;
    return nm ? '“' + nm + '” — ' + it.label : it.label;
  };

  const ease = k => 1 + 2.7 * Math.pow(k - 1, 3) + 1.7 * Math.pow(k - 1, 2);   // ease-out-back
  const hash = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return ((h >>> 0) % 1000) / 1000; };

  function items() {
    return sources.flatMap(f => { try { return f() || []; } catch (e) { return []; } });
  }

  // the hill's surface: a mound with a second, smaller shoulder
  function surface(t, h) {
    return h * 0.94 - Math.pow(Math.sin(Math.PI * t), 1.15) * h * 0.5 - Math.sin(Math.PI * t * 2 + 1) * h * 0.045;
  }

  function draw(view, now) {
    const { canvas } = view;
    // the size the hill is drawn in, which is no longer the size of the bitmap:
    // Lab.hidpi grows the backing store with the camera and pre-scales the
    // context to match, so everything below stays in these coordinates
    const w = view.w, h = view.h, g = canvas.getContext('2d');
    g.clearRect(0, 0, w, h);
    // sky: a faint sun
    g.fillStyle = '#fff3e3'; g.beginPath(); g.arc(w * 0.8, h * 0.24, h * 0.13, 0, Math.PI * 2); g.fill();
    // hill
    g.beginPath(); g.moveTo(0, h);
    for (let x = 0; x <= w; x += 4) g.lineTo(x, surface(x / w, h));
    g.lineTo(w, h); g.closePath();
    g.fillStyle = '#c9ead6'; g.fill();
    g.strokeStyle = '#2fae76'; g.lineWidth = 2; g.lineJoin = 'round';
    g.beginPath(); for (let x = 0; x <= w; x += 4) { const y = surface(x / w, h); x ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke();
    // a few tufts of grass
    g.strokeStyle = '#8fd1ad'; g.lineWidth = 1.5;
    for (let i = 0; i < 9; i++) { const t = 0.06 + (i * 0.107) % 0.9, x = t * w, y = surface(t, h) + 4 + (i % 3) * 5; g.beginPath(); g.moveTo(x, y + 5); g.lineTo(x - 2, y); g.moveTo(x + 1, y + 5); g.lineTo(x + 3, y - 1); g.stroke(); }

    const list = items().map(it => ({ ...it, px: (0.07 + (isFinite(it.x) ? it.x : hash(it.id)) * 0.86) * w }))
      .map(it => ({ ...it, py: surface(it.px / w, h) }))
      .sort((a, b) => a.py - b.py);
    view.hits = [];
    let growing = false;
    for (const it of list) {
      let s = 1;
      if (it.born && now - it.born < 1500) { growing = true; if (now < it.born) continue; s = Math.max(0.02, ease((now - it.born) / 1500)); }
      drawItem(g, it, s);
      view.hits.push({ it, x: it.px, y: it.py - 10 });
    }
    drawGnome(g, w * 0.9, surface(0.9, h), now);
    // hover ring
    if (view.hover) { const hv = view.hits.find(x => x.it.id === view.hover); if (hv) { g.strokeStyle = '#c93b82'; g.lineWidth = 1.5; g.setLineDash([3, 3]); g.beginPath(); g.arc(hv.x, hv.y, 19, 0, Math.PI * 2); g.stroke(); g.setLineDash([]); } }
    return growing;
  }

  function drawItem(g, it, s) {
    const x = it.px, y = it.py;
    g.save(); g.translate(x, y); g.scale(s, s);
    g.lineWidth = 1.6; g.lineJoin = 'round';
    switch (it.kind) {
      case 'pond':
        g.fillStyle = '#a9d8f5'; g.strokeStyle = '#3d55c9';
        g.beginPath(); g.ellipse(0, 0, 22, 8, 0, 0, Math.PI * 2); g.fill(); g.stroke();
        g.strokeStyle = '#fff'; g.beginPath(); g.ellipse(-5, -2, 9, 2.5, 0, Math.PI, Math.PI * 1.9); g.stroke();
        break;
      case 'tree':
        g.fillStyle = '#8b5a3c'; g.fillRect(-2.5, -14, 5, 14);
        g.fillStyle = '#2fae76'; g.strokeStyle = '#1d7a52';
        g.beginPath(); g.arc(0, -20, 11, 0, Math.PI * 2); g.fill(); g.stroke();
        break;
      case 'flag':
        g.strokeStyle = '#2e2636'; g.lineWidth = 2; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -26); g.stroke();
        g.fillStyle = '#ef4d98'; g.beginPath(); g.moveTo(0, -26); g.lineTo(16, -21); g.lineTo(0, -16); g.closePath(); g.fill();
        break;
      case 'bench':
        g.fillStyle = '#c98a4b'; g.strokeStyle = '#7a4a22';
        g.beginPath(); g.rect(-13, -8, 26, 4); g.fill(); g.stroke();
        g.beginPath(); g.rect(-13, -15, 26, 3); g.fill(); g.stroke();
        g.fillRect(-11, -4, 3, 4); g.fillRect(8, -4, 3, 4); g.fillRect(-11, -12, 2, 4); g.fillRect(9, -12, 2, 4);
        break;
      case 'sign':
        g.strokeStyle = '#7a4a22'; g.lineWidth = 2; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -14); g.stroke();
        g.fillStyle = '#fdf3d7'; g.strokeStyle = '#7a4a22'; g.lineWidth = 1.5;
        g.beginPath(); g.rect(-14, -26, 28, 13); g.fill(); g.stroke();
        g.strokeStyle = '#bfa77a'; g.beginPath(); g.moveTo(-10, -22); g.lineTo(10, -22); g.moveTo(-10, -17); g.lineTo(4, -17); g.stroke();
        break;
      case 'contraption':
        g.fillStyle = '#fdfbfd'; g.strokeStyle = '#2e2636';
        g.beginPath(); g.roundRect(-10, -16, 20, 16, 3); g.fill(); g.stroke();
        g.strokeStyle = '#5871f5'; g.lineWidth = 2; g.beginPath(); g.arc(-3, -8, 4, 0, Math.PI * 2); g.stroke();
        g.strokeStyle = '#2e2636'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(6, -16); g.lineTo(6, -23); g.stroke();
        g.fillStyle = '#f59321'; g.beginPath(); g.arc(6, -25, 2.5, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#8f8296';                               // the screws
        [[-8, -3], [8, -3]].forEach(([sx, sy]) => { g.beginPath(); g.arc(sx, sy, 1.6, 0, Math.PI * 2); g.fill(); });
        break;
      case 'chest':   // the time capsule: a barrow of turned earth, the lid just showing
        g.fillStyle = '#d9b98a'; g.strokeStyle = '#7a4a22';
        g.beginPath(); g.ellipse(0, 0, 17, 6, 0, 0, Math.PI * 2); g.fill(); g.stroke();
        g.fillStyle = it.open ? '#e8c07c' : '#8b5a3c'; g.strokeStyle = '#4a3524';
        g.beginPath(); g.roundRect(-9, -10, 18, 10, 2); g.fill(); g.stroke();
        g.beginPath(); g.moveTo(-9, -5.5); g.lineTo(9, -5.5); g.stroke();
        g.fillStyle = '#f5c542'; g.fillRect(-1.5, -6.8, 3, 3.2);
        if (it.open) {          // it has been cracked: a little glitter gets out
          g.strokeStyle = '#f59321'; g.lineWidth = 1.4;
          g.beginPath(); g.moveTo(-4, -13); g.lineTo(-6, -17); g.moveTo(0, -14); g.lineTo(0, -18); g.moveTo(4, -13); g.lineTo(6, -17); g.stroke();
        }
        break;
      default:  // stone
        g.fillStyle = '#d9d2d8'; g.strokeStyle = '#6e6275';
        g.beginPath(); g.roundRect(-9, -12, 18, 12, 4); g.fill(); g.stroke();
        if (it.n != null) { g.fillStyle = '#2e2636'; g.font = 'bold 8px Sora, sans-serif'; g.textAlign = 'center'; g.fillText(String(it.n), 0, -3.5); }
    }
    g.restore();
  }

  // the lawn gnome, who lives here and sways a little
  function drawGnome(g, x, y, now) {
    const sway = Math.sin(now / 900) * 1.2;
    g.save(); g.translate(x, y); g.rotate(sway * Math.PI / 180);
    g.fillStyle = '#3d55c9'; g.beginPath(); g.roundRect(-5, -14, 10, 14, 3); g.fill();          // coat
    if (mayor) {                                                                                // the sash of office
      g.strokeStyle = '#ef4d98'; g.lineWidth = 2.6; g.lineCap = 'round';
      g.beginPath(); g.moveTo(-4.5, -13); g.lineTo(4.5, -4.5); g.stroke();
    }
    g.fillStyle = '#f6cdb0'; g.beginPath(); g.arc(0, -17, 4.5, 0, Math.PI * 2); g.fill();       // face
    g.fillStyle = '#fff'; g.beginPath(); g.moveTo(-4, -15); g.lineTo(4, -15); g.lineTo(0, -7); g.closePath(); g.fill();   // beard
    g.fillStyle = '#d93b4a'; g.beginPath(); g.moveTo(-5, -19); g.lineTo(5, -19); g.lineTo(1, -33); g.closePath(); g.fill(); // hat
    g.restore();
  }

  function redrawAll() {
    cancelAnimationFrame(raf);
    const tick = () => {
      const now = Date.now();
      let growing = false;
      for (const v of views) if (draw(v, now)) growing = true;
      raf = requestAnimationFrame(growing ? tick : () => { for (const v of views) draw(v, Date.now()); });
    };
    tick();
  }
  // the gnome sways: a slow idle redraw
  setInterval(() => { if (views.length) for (const v of views) draw(v, Date.now()); }, 120);

  function attach(canvas, caption, idle) {
    const view = { canvas, caption, idle: idle || '', hover: null, hits: [],
                   w: canvas.width, h: canvas.height };
    views.push(view);
    // redraw at whatever resolution the camera is asking for
    if (window.Lab && Lab.hidpi) Lab.hidpi(canvas, () => draw(view, Date.now()));
    if (caption) caption.textContent = view.idle;
    canvas.addEventListener('pointermove', e => {
      const r = canvas.getBoundingClientRect();
      const mx = (e.clientX - r.left) * view.w / r.width, my = (e.clientY - r.top) * view.h / r.height;
      let best = null, bd = 20;
      for (const h of view.hits) { const d = Math.hypot(h.x - mx, h.y - my); if (d < bd) { bd = d; best = h; } }
      const id = best ? best.it.id : null;
      if (id !== view.hover) { view.hover = id; if (caption) caption.textContent = best ? captionFor(best.it) : view.idle; draw(view, Date.now()); }
    });
    canvas.addEventListener('pointerleave', () => { view.hover = null; if (caption) caption.textContent = view.idle; draw(view, Date.now()); });
    draw(view, Date.now());
    return view;
  }

  function addSource(fn) { sources.push(fn); redrawAll(); }

  return { attach, addSource, items, redraw: redrawAll, hash, setNamer, setMayor };
})();
