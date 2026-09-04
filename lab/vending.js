/* ─── THE DISPENSARY ───────────────────────────────────────────────────────
   A vending machine on the hill. It does not take money — it takes TIME. The
   machine restocks itself one capsule every so often, up to a few banked up,
   and the little red display counts down to the next one whether you are
   watching or not. Press the knob, a capsule rattles into the tray, and it
   sits there until you twist it open.

   Sixteen trinkets across four tiers, and the odds are printed on the side,
   because we are not monsters. Every tenth capsule is guaranteed rare or
   better, so nobody goes home with ten pebbles.

     restock   one capsule every `every` ms, banking up to `cap`
     the roll  happens when the machine restocks, not when you press — which
               is why a moderator can peek at what is loaded next
     pity      ten capsules without a rare and the next one is one

   Roles:
     user       presses the knob, twists capsules open, fills the cabinet
     moderator  + peek in the hopper (what is loaded next), out-of-order sign
     owner      + sets the interval and how many bank up, restocks on the
                  spot, rigs the next capsule, empties your pockets
   State lives in Lab.store('vending') on this device. */

window.Vending = (function () {
  const $ = id => document.getElementById(id);
  const canvas = $('vm-canvas');
  if (!canvas || !window.Lab) return {};

  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const gz = $('gz-vending');
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  // ── the four tiers, and what they are worth ─────────────────────────────
  const TIERS = {
    common:   { n: 'common',        c: '#9d92a6', w: 58 },
    uncommon: { n: 'uncommon',      c: '#2fae76', w: 27 },
    rare:     { n: 'rare',          c: '#5871f5', w: 12 },
    oneoff:   { n: 'one of a kind', c: '#ef4d98', w: 3 }
  };
  const TORDER = ['common', 'uncommon', 'rare', 'oneoff'];

  // ── sixteen things worth having ─────────────────────────────────────────
  const PRIZES = [
    { id: 'pebble',  t: 'common',   n: 'a nice pebble',        f: 'smooth. grey. yours.' },
    { id: 'cap',     t: 'common',   n: 'a bottle cap',         f: 'from a bottle of something, once.' },
    { id: 'nail',    t: 'common',   n: 'a bent nail',          f: 'bent at some point by somebody.' },
    { id: 'acorn',   t: 'common',   n: 'an acorn',             f: 'technically a whole tree, eventually.' },
    { id: 'button',  t: 'common',   n: 'a spare button',       f: 'four holes. no coat.' },
    { id: 'shroom',  t: 'uncommon', n: 'a toadstool',          f: 'do not eat it. do not ask.' },
    { id: 'whistle', t: 'uncommon', n: 'a tin whistle',        f: 'one note. it is not a good note.' },
    { id: 'lantern', t: 'uncommon', n: 'a pocket lantern',     f: 'lit. it has always been lit.' },
    { id: 'duck',    t: 'uncommon', n: 'a wooden duck',        f: 'carved by hand, by somebody in a hurry.' },
    { id: 'beard',   t: 'uncommon', n: 'a spare beard',        f: 'gnome, medium, slightly used.' },
    { id: 'hat',     t: 'rare',     n: 'a pointy hat',         f: 'a size and a half too big. wear it anyway.' },
    { id: 'jar',     t: 'rare',     n: 'a jar of pond water',  f: 'Greg-adjacent. not Greg. legally distinct.' },
    { id: 'knob',    t: 'rare',     n: 'a brass door knob',    f: 'off a door nobody can find.' },
    { id: 'key',     t: 'rare',     n: 'a key to nothing',     f: 'it fits nothing. it fits it perfectly.' },
    { id: 'sash',    t: 'oneoff',   n: "the mayor's spare sash", f: 'the office has no powers. the sash has presence.' },
    { id: 'greg',    t: 'oneoff',   n: 'Greg, in miniature',   f: 'the pond. in a snow globe. do not shake it.' }
  ];
  const byId = id => PRIZES.find(p => p.id === id);
  const inTier = t => PRIZES.filter(p => p.t === t);

  // ── how often it fills up ───────────────────────────────────────────────
  const EVERY = [
    [30e3, '30 seconds'], [90e3, '90 seconds'], [6e5, '10 minutes'],
    [36e5, 'an hour'], [216e5, 'six hours'], [864e5, 'a day']
  ];
  const PITY = 10;

  function seed() {
    return { every: 90e3, cap: 3, tokens: 1, lastAt: Date.now(), pulls: 0, dry: 0,
             rig: '', nextUp: null, tray: null, last: null, broken: false, got: {} };
  }
  const store = Lab.store('vending', seed);
  const S = () => store.get();
  const isMod = () => Lab.role === 'moderator' || Lab.role === 'owner';
  const isOwner = () => Lab.role === 'owner';

  // ── rolling one ─────────────────────────────────────────────────────────
  function roll(s) {
    let tier = s.rig;
    if (!TIERS[tier]) {
      if (s.dry >= PITY - 1) tier = Math.random() < 0.8 ? 'rare' : 'oneoff';    // the pity capsule
      else {
        let r = Math.random() * 100;
        tier = 'common';
        for (const k of TORDER) { if (r < TIERS[k].w) { tier = k; break; } r -= TIERS[k].w; }
      }
    }
    const pool = inTier(tier);
    return { id: pool[Math.floor(Math.random() * pool.length)].id, t: tier };
  }

  // ── the clock: capsules accrue whether anybody is looking or not ────────
  // Works out what SHOULD be true first and only writes if it isn't. This
  // runs once a second forever, and store.update saves to localStorage and
  // re-renders on every call — so an unconditional write here would rebuild
  // the whole cabinet, once a second, for as long as the page is open.
  // A full machine banks no time: the countdown restarts when one is spent.
  function tick(quiet) {
    const s = S(), now = Date.now();
    let tokens = s.tokens, lastAt = s.lastAt, move = false;

    if (!lastAt || lastAt > now) { lastAt = now; move = true; }     // clock went backwards
    if (tokens < s.cap) {
      const gained = Math.floor((now - lastAt) / s.every);
      if (gained > 0) {
        tokens = Math.min(s.cap, tokens + gained);
        lastAt = tokens >= s.cap ? now : lastAt + gained * s.every;
        move = true;
      }
    }
    const load = tokens > 0 && !s.nextUp;
    if (!move && !load) { if (!quiet) face(); return false; }       // nothing to write

    store.update(v => {
      v.tokens = tokens; v.lastAt = lastAt;
      if (v.tokens > 0 && !v.nextUp) v.nextUp = roll(v);
    });
    return true;
  }

  const waitLeft = () => {
    const s = S();
    if (s.tokens >= s.cap) return 0;
    return Math.max(0, s.every - (Date.now() - s.lastAt));
  };
  function clock(ms) {
    if (ms <= 0) return '00:00';
    const t = Math.ceil(ms / 1000), h = Math.floor(t / 3600), m = Math.floor(t % 3600 / 60), sec = t % 60;
    const p = n => (n < 10 ? '0' : '') + n;
    return h ? p(h) + ':' + p(m) + ':' + p(sec) : p(m) + ':' + p(sec);
  }

  // ── the trinkets ────────────────────────────────────────────────────────
  // each one drawn in a -1..1 box, scaled by s. Kept small on purpose: they
  // are meant to read at 40px in the cabinet as well as at 90 in the tray.
  function trinket(g, id, s) {
    const P = byId(id); if (!P) return;
    g.save(); g.scale(s, s);
    g.lineWidth = 2.6 / s; g.lineJoin = 'round'; g.lineCap = 'round';
    g.strokeStyle = '#3a2f38';
    const fill = (c, path) => { g.fillStyle = c; g.beginPath(); path(); g.fill(); g.stroke(); };

    switch (id) {
      case 'pebble':
        fill('#a99e9a', () => g.ellipse(0, .12, .78, .55, -.2, 0, 7));
        g.fillStyle = 'rgba(255,255,255,.5)'; g.beginPath(); g.ellipse(-.24, -.1, .22, .13, -.3, 0, 7); g.fill();
        break;
      case 'cap':
        fill('#e0555c', () => g.arc(0, 0, .72, 0, 7));
        g.fillStyle = '#b83b45';
        for (let i = 0; i < 12; i++) { const a = i / 12 * 6.283;
          g.beginPath(); g.arc(Math.cos(a) * .72, Math.sin(a) * .72, .12, 0, 7); g.fill(); }
        g.fillStyle = '#f4a3a8'; g.beginPath(); g.arc(0, 0, .38, 0, 7); g.fill();
        break;
      case 'nail':
        g.strokeStyle = '#8d8f96'; g.lineWidth = 7 / s;
        g.beginPath(); g.moveTo(-.1, -.8); g.lineTo(-.05, .1); g.lineTo(.55, .68); g.stroke();
        g.strokeStyle = '#3a2f38'; g.lineWidth = 2.6 / s;
        fill('#a7a9b0', () => g.ellipse(-.12, -.82, .38, .16, 0, 0, 7));
        break;
      case 'acorn':
        fill('#d7a25c', () => { g.moveTo(-.5, -.1); g.quadraticCurveTo(0, 1.0, .5, -.1); g.closePath(); });
        fill('#8a5a33', () => { g.ellipse(0, -.24, .58, .3, 0, 0, 7); });
        g.beginPath(); g.moveTo(0, -.5); g.lineTo(.05, -.85); g.stroke();
        break;
      case 'button':
        fill('#eae2ec', () => g.arc(0, 0, .72, 0, 7));
        g.fillStyle = '#3a2f38';
        [[-.26, -.26], [.26, -.26], [-.26, .26], [.26, .26]].forEach(([x, y]) => {
          g.beginPath(); g.arc(x, y, .13, 0, 7); g.fill(); });
        break;
      case 'shroom':
        fill('#f0f0ea', () => { g.moveTo(-.3, .1); g.lineTo(-.24, .8); g.lineTo(.24, .8); g.lineTo(.3, .1); g.closePath(); });
        fill('#e0555c', () => { g.moveTo(-.86, .12); g.quadraticCurveTo(0, -1.15, .86, .12); g.closePath(); });
        g.fillStyle = '#fff';
        [[-.42, -.18, .15], [.18, -.34, .17], [.5, -.02, .12]].forEach(([x, y, r]) => {
          g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); });
        break;
      case 'whistle':
        fill('#cfd3d8', () => { g.roundRect ? g.roundRect(-.85, -.28, 1.7, .56, .2) : g.rect(-.85, -.28, 1.7, .56); });
        g.fillStyle = '#3a2f38'; g.beginPath(); g.arc(.3, 0, .14, 0, 7); g.fill();
        g.beginPath(); g.moveTo(-.2, -.28); g.lineTo(-.2, .28); g.stroke();
        break;
      case 'lantern':
        fill('#8a6a4a', () => g.rect(-.12, -1, .24, .22));
        fill('#ffd47e', () => { g.moveTo(-.5, -.7); g.lineTo(.5, -.7); g.lineTo(.62, .55); g.lineTo(-.62, .55); g.closePath(); });
        fill('#8a6a4a', () => g.rect(-.68, .5, 1.36, .28));
        g.fillStyle = 'rgba(255,146,33,.85)'; g.beginPath(); g.ellipse(0, 0, .2, .3, 0, 0, 7); g.fill();
        break;
      case 'duck':
        fill('#f0c65e', () => { g.ellipse(-.05, .3, .78, .45, 0, 0, 7); });
        fill('#f0c65e', () => { g.arc(.45, -.3, .36, 0, 7); });
        fill('#e58b33', () => { g.moveTo(.72, -.28); g.lineTo(1.05, -.16); g.lineTo(.72, -.05); g.closePath(); });
        g.fillStyle = '#3a2f38'; g.beginPath(); g.arc(.5, -.4, .09, 0, 7); g.fill();
        break;
      case 'beard':
        fill('#e8e4e8', () => { g.moveTo(-.7, -.55); g.quadraticCurveTo(-.95, .55, 0, .95);
          g.quadraticCurveTo(.95, .55, .7, -.55); g.quadraticCurveTo(0, -.25, -.7, -.55); });
        g.beginPath(); g.moveTo(-.3, -.1); g.quadraticCurveTo(0, .4, .3, -.1); g.stroke();
        break;
      case 'hat':
        fill('#c93b82', () => { g.moveTo(-.8, .42); g.quadraticCurveTo(-.35, -1.05, .3, -.95);
          g.quadraticCurveTo(.6, -.2, .8, .42); g.closePath(); });
        fill('#8b7f92', () => { g.ellipse(0, .46, .95, .24, 0, 0, 7); });
        break;
      case 'jar':
        fill('#dfeef6', () => { g.roundRect ? g.roundRect(-.55, -.6, 1.1, 1.35, .16) : g.rect(-.55, -.6, 1.1, 1.35); });
        g.fillStyle = 'rgba(80,160,140,.8)';
        g.beginPath(); g.rect(-.5, -.05, 1, .75); g.fill();
        g.fillStyle = '#8a6a4a'; g.beginPath(); g.rect(-.62, -.86, 1.24, .3); g.fill(); g.stroke();
        break;
      case 'knob':
        fill('#d7a83f', () => g.arc(0, -.15, .6, 0, 7));
        fill('#b8892a', () => { g.ellipse(0, .6, .5, .2, 0, 0, 7); });
        g.beginPath(); g.moveTo(-.12, .42); g.lineTo(-.12, .05); g.moveTo(.12, .42); g.lineTo(.12, .05); g.stroke();
        g.fillStyle = 'rgba(255,255,255,.55)'; g.beginPath(); g.ellipse(-.2, -.34, .16, .1, -.4, 0, 7); g.fill();
        break;
      case 'key':
        fill('#d7a83f', () => g.arc(-.5, 0, .38, 0, 7));
        g.fillStyle = '#f6eef2'; g.beginPath(); g.arc(-.5, 0, .14, 0, 7); g.fill();
        g.strokeStyle = '#3a2f38'; g.lineWidth = 5.5 / s;
        g.beginPath(); g.moveTo(-.14, 0); g.lineTo(.85, 0); g.stroke();
        g.lineWidth = 4 / s;
        g.beginPath(); g.moveTo(.55, 0); g.lineTo(.55, .34); g.moveTo(.8, 0); g.lineTo(.8, .28); g.stroke();
        break;
      case 'sash':
        fill('#ef4d98', () => { g.moveTo(-.75, -.85); g.lineTo(-.3, -.95); g.lineTo(.78, .78);
          g.lineTo(.3, .92); g.closePath(); });
        fill('#ffd47e', () => g.arc(.42, .5, .26, 0, 7));
        g.fillStyle = 'rgba(255,255,255,.45)';
        g.beginPath(); g.moveTo(-.42, -.5); g.lineTo(-.2, -.56); g.lineTo(.2, .1); g.lineTo(-.02, .18); g.fill();
        break;
      case 'greg':
        fill('#dfeef6', () => g.arc(0, -.1, .82, Math.PI, 0));
        g.save(); g.beginPath(); g.arc(0, -.1, .78, Math.PI, 0); g.clip();
        g.fillStyle = '#7fc4a8'; g.fillRect(-.8, -.35, 1.6, .3);
        g.fillStyle = '#4f9ec4'; g.beginPath(); g.ellipse(0, -.2, .5, .16, 0, 0, 7); g.fill();
        g.fillStyle = 'rgba(255,255,255,.7)';
        for (let i = 0; i < 7; i++) g.fillRect(-.7 + i * .2, -.75 + (i % 3) * .12, .07, .07);
        g.restore();
        fill('#8a6a4a', () => { g.moveTo(-.9, -.1); g.lineTo(.9, -.1); g.lineTo(.72, .5); g.lineTo(-.72, .5); g.closePath(); });
        break;
    }
    g.restore();
  }

  // ── the machine ─────────────────────────────────────────────────────────
  const GLASS = { x: 16, y: 44, w: 158, h: 108 };
  const TRAY = { x: 16, y: 176, w: 158, h: 56 };
  const CAPCOL = ['#ef4d98', '#5871f5', '#2fae76', '#f59321', '#f6eef2'];
  let anim = null, raf = 0, lastT = 0, hoverTray = false;

  function capsule(g, x, y, r, tier, split) {
    const c = TIERS[tier] ? TIERS[tier].c : '#dcd2da';
    g.save(); g.translate(x, y);
    g.lineWidth = 2; g.strokeStyle = '#3a2f38';
    g.fillStyle = '#f2ecef';
    g.beginPath(); g.arc(0, -(split || 0), r, Math.PI, 0); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = c;
    g.beginPath(); g.arc(0, (split || 0), r, 0, Math.PI); g.closePath(); g.fill(); g.stroke();
    if (!split) {
      g.strokeStyle = 'rgba(58,47,56,.5)'; g.lineWidth = 1.4;
      g.beginPath(); g.moveTo(-r, 0); g.lineTo(r, 0); g.stroke();
      g.fillStyle = 'rgba(255,255,255,.6)';
      g.beginPath(); g.ellipse(-r * .35, -r * .42, r * .22, r * .13, -.5, 0, 7); g.fill();
    }
    g.restore();
  }

  function paint(t) {
    const s = S();
    ctx.clearRect(0, 0, W, H);

    // body
    ctx.fillStyle = '#f6eef2'; ctx.strokeStyle = '#26212a'; ctx.lineWidth = 3;
    ctx.beginPath();
    (ctx.roundRect ? ctx.roundRect(2.5, 2.5, W - 5, H - 5, 14) : ctx.rect(2.5, 2.5, W - 5, H - 5));
    ctx.fill(); ctx.stroke();

    // the header plate
    ctx.fillStyle = s.broken ? '#8b7f92' : '#ef4d98';
    ctx.beginPath();
    (ctx.roundRect ? ctx.roundRect(2.5, 2.5, W - 5, 32, [12, 12, 0, 0]) : ctx.rect(2.5, 2.5, W - 5, 32));
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.font = '800 12px Sora, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.letterSpacing && (ctx.letterSpacing = '3px');
    ctx.fillText(s.broken ? 'OUT OF ORDER' : 'KNOLL DISPENSARY', W / 2, 19);
    ctx.letterSpacing && (ctx.letterSpacing = '0px');

    // the glass, and the pile behind it
    ctx.fillStyle = '#e7f1f6';
    ctx.beginPath();
    (ctx.roundRect ? ctx.roundRect(GLASS.x, GLASS.y, GLASS.w, GLASS.h, 8) : ctx.rect(GLASS.x, GLASS.y, GLASS.w, GLASS.h));
    ctx.fill();
    ctx.save(); ctx.clip();
    for (let r = 0; r < 4; r++) {
      for (let i = 0; i < 8; i++) {
        const seedy = (r * 13 + i * 7) % 10;
        const x = GLASS.x + 14 + i * 19 + (r % 2 ? 9 : 0);
        const y = GLASS.y + GLASS.h - 12 - r * 20 + Math.sin(t * 0.9 + seedy) * 1.2;
        capsule(ctx, x, y, 10, CAPCOL[(r + i) % CAPCOL.length] === '#f6eef2' ? null : ['oneoff', 'rare', 'uncommon', 'common'][(r + i) % 4]);
      }
    }
    ctx.restore();
    ctx.strokeStyle = '#26212a'; ctx.lineWidth = 3;
    ctx.beginPath();
    (ctx.roundRect ? ctx.roundRect(GLASS.x, GLASS.y, GLASS.w, GLASS.h, 8) : ctx.rect(GLASS.x, GLASS.y, GLASS.w, GLASS.h));
    ctx.stroke();
    const gl = ctx.createLinearGradient(GLASS.x, GLASS.y, GLASS.x + GLASS.w * .6, GLASS.y + GLASS.h);
    gl.addColorStop(0, 'rgba(255,255,255,.5)'); gl.addColorStop(.5, 'rgba(255,255,255,.06)');
    gl.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gl; ctx.fillRect(GLASS.x, GLASS.y, GLASS.w, GLASS.h);

    // the display
    const dx = 190, dy = 46;
    ctx.fillStyle = '#2b2430';
    ctx.beginPath();
    (ctx.roundRect ? ctx.roundRect(dx, dy, 96, 34, 6) : ctx.rect(dx, dy, 96, 34));
    ctx.fill(); ctx.strokeStyle = '#26212a'; ctx.lineWidth = 2.5; ctx.stroke();
    const ready = s.tokens > 0 && !s.broken;
    ctx.font = '700 15px ui-monospace, Consolas, monospace';
    ctx.fillStyle = ready ? '#ff6b6b' : '#7d5f70';
    ctx.textAlign = 'center';
    ctx.fillText(s.broken ? '--:--' : (s.tokens >= s.cap ? 'FULL' : clock(waitLeft())), dx + 48, dy + 18);

    // how many are banked
    for (let i = 0; i < s.cap; i++) {
      const on = i < s.tokens;
      ctx.beginPath(); ctx.arc(dx + 16 + i * 20, dy + 48, 6, 0, 7);
      ctx.fillStyle = on ? '#2fae76' : '#ded3da'; ctx.fill();
      ctx.strokeStyle = '#26212a'; ctx.lineWidth = 2; ctx.stroke();
    }

    // the knob
    const kx = dx + 48, ky = dy + 92;
    const turned = anim && anim.k === 'drop' ? Math.min(1, anim.t / .4) : 0;
    ctx.save(); ctx.translate(kx, ky); ctx.rotate(turned * 2.2);
    ctx.fillStyle = ready ? '#f59321' : '#cfc2c8';
    ctx.strokeStyle = '#26212a'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(0, 0, 21, 0, 7); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#26212a';
    ctx.beginPath();
    (ctx.roundRect ? ctx.roundRect(-4, -16, 8, 20, 3) : ctx.rect(-4, -16, 8, 20));
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#8b7f92'; ctx.font = '800 8px Public Sans, sans-serif';
    ctx.letterSpacing && (ctx.letterSpacing = '2px');
    ctx.fillText('TURN', kx, ky + 34);
    ctx.letterSpacing && (ctx.letterSpacing = '0px');

    // the tray
    ctx.fillStyle = '#2b2430';
    ctx.beginPath();
    (ctx.roundRect ? ctx.roundRect(TRAY.x, TRAY.y, TRAY.w, TRAY.h, 8) : ctx.rect(TRAY.x, TRAY.y, TRAY.w, TRAY.h));
    ctx.fill(); ctx.strokeStyle = '#26212a'; ctx.lineWidth = 3; ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.07)'; ctx.fillRect(TRAY.x + 6, TRAY.y + 6, TRAY.w - 12, 10);

    // whatever is in it
    const cx = TRAY.x + TRAY.w / 2, cy = TRAY.y + TRAY.h / 2 + 4;
    if (anim && anim.k === 'drop') {
      const q = clamp((anim.t - .35) / .75, 0, 1);
      const px = GLASS.x + GLASS.w - 30 + (cx - (GLASS.x + GLASS.w - 30)) * q;
      const py = GLASS.y + GLASS.h - 20 + (cy - (GLASS.y + GLASS.h - 20)) * (q * q);
      if (anim.t > .35) capsule(ctx, px, py, 15, anim.tier);
    } else if (anim && anim.k === 'open') {
      const q = clamp(anim.t / .55, 0, 1);
      capsule(ctx, cx, cy, 15, anim.tier, q * 26);
      const col = TIERS[anim.tier].c;
      ctx.save();
      ctx.globalAlpha = clamp(q * 1.4, 0, 1);
      ctx.translate(cx, cy - q * 6);
      ctx.strokeStyle = col; ctx.lineWidth = 2;
      for (let i = 0; i < 9; i++) {
        const a = i / 9 * 6.283 + anim.t * 1.5, r0 = 20 + q * 10, r1 = r0 + 8 + q * 14;
        ctx.beginPath(); ctx.moveTo(Math.cos(a) * r0, Math.sin(a) * r0);
        ctx.lineTo(Math.cos(a) * r1, Math.sin(a) * r1); ctx.stroke();
      }
      ctx.scale(clamp(q * 1.2, 0, 1), clamp(q * 1.2, 0, 1));
      trinket(ctx, anim.id, 17);
      ctx.restore();
    } else if (s.tray) {
      const wob = Math.sin(t * 3) * 0.09;
      ctx.save(); ctx.translate(cx, cy - 5); ctx.rotate(wob);
      capsule(ctx, 0, 0, 15, s.tray.t);
      ctx.restore();
      ctx.fillStyle = '#c8b6c4'; ctx.font = 'italic 9px Public Sans, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('twist it open', cx, TRAY.y + TRAY.h - 7);
      if (hoverTray) {
        ctx.strokeStyle = '#ef4d98'; ctx.lineWidth = 1.5; ctx.setLineDash([3, 3]);
        ctx.beginPath(); ctx.arc(cx, cy - 5, 21, 0, 7); ctx.stroke(); ctx.setLineDash([]);
      }
    } else {
      ctx.fillStyle = '#6b5f6a'; ctx.font = 'italic 10px Public Sans, sans-serif';
      ctx.fillText(s.broken ? 'the sign says it all' : ready ? 'turn the knob' : 'nothing in the tray', cx, cy + 3);
    }
  }

  const running = () => gz && !gz.classList.contains('shelved');
  function frame(now) {
    raf = 0;
    const dt = Math.min(0.05, (now - lastT) / 1000 || 0.016);
    lastT = now;
    if (anim) {
      anim.t += dt;
      if (anim.k === 'drop' && anim.t > 1.25) { anim = null; face(); }
      else if (anim.k === 'open' && anim.t > 1.5) { anim = null; face(); }
    }
    paint(now / 1000);
    if (running()) raf = requestAnimationFrame(frame);   // the pile jiggles and the display counts, always
  }
  function start() { if (!raf && running()) { lastT = performance.now(); raf = requestAnimationFrame(frame); } }
  const redraw = () => paint(performance.now() / 1000);

  // ── pressing it ─────────────────────────────────────────────────────────
  function pull() {
    tick(true);
    const s = S();
    if (s.broken) return say('it is out of order. the sign is right there.');
    if (s.tray) return say('there is one in the tray already. twist it open.');
    if (s.tokens < 1) return say('nothing in it yet — ' + clock(waitLeft()) + ' to go.');
    let got = null;
    const wasFull = s.tokens >= s.cap;
    store.update(v => {
      if (!v.nextUp) v.nextUp = roll(v);
      got = v.nextUp;
      v.tray = got;
      v.tokens--;
      v.pulls++;
      v.dry = (got.t === 'rare' || got.t === 'oneoff') ? 0 : v.dry + 1;
      v.rig = '';
      v.nextUp = roll(v);
      if (wasFull) v.lastAt = Date.now();      // a full machine only starts counting once one is spent
    });
    anim = { k: 'drop', t: 0, tier: got.t, id: got.id };
    say('something rattled down. go on then.');
    start();
  }

  function twist() {
    const s = S();
    if (!s.tray) return;
    const cap = s.tray;
    store.update(v => {
      v.got[cap.id] = (v.got[cap.id] || 0) + 1;
      v.last = { id: cap.id, t: cap.t, at: Date.now(), dupe: v.got[cap.id] > 1 };
      v.tray = null;
    });
    anim = { k: 'open', t: 0, tier: cap.t, id: cap.id };
    start();
    showPrize(S().last);
  }

  // ── the words ───────────────────────────────────────────────────────────
  const statusEl = $('vm-status');
  const say = t => { statusEl.textContent = t || ''; };

  // A trinket is painted into a canvas, so it cannot hold a panel of its own
  // — it gets a note instead, hung off wherever the thing actually is.
  function trinketNote(P, n, dupe, dressable) {
    const T = TIERS[P.t];
    return '<span class="vm-tier" style="background:' + T.c + '">' + T.n + '</span>'
      + '<canvas class="vm-note-shot" width="88" height="88"></canvas>'
      + '<b class="vm-name">' + esc(P.n) + '</b>'
      + '<i class="vm-flav">' + esc(P.f) + '</i>'
      + (n > 1 ? '<span class="vm-dupe">' + (dupe ? 'you had one already — that is ' : 'you have ')
                 + n + ' of them</span>' : '')
      + (dressable ? '<button type="button" class="vm-dress" data-act="fx">dress it up</button>' : '');
  }

  function drawNoteShot(el, id) {
    const c = el && el.querySelector('.vm-note-shot');
    if (!c) return;
    const g = c.getContext('2d');
    g.translate(44, 46); trinket(g, id, 30);
  }

  // hung off the tray, for whatever just came out of it
  function showPrize(last) {
    const P = byId(last.id);
    if (!P || !window.Note) return;
    const el = Note.open({
      cls: 'vm-note',
      at: () => { const r = canvas.getBoundingClientRect();
        if (!r.width) return null;
        return { x: r.left + (TRAY.x + TRAY.w / 2) * r.width / W,
                 y: r.top + (TRAY.y + 6) * r.height / H }; },
      html: trinketNote(P, S().got[P.id], last.dupe, false)
    });
    drawNoteShot(el, P.id);
  }

  // hung off a slot in the case, for something already won
  function showSlot(li) {
    const id = li.dataset.fx.split(':')[1], P = byId(id);
    if (!P || !window.Note) return;
    const el = Note.open({
      cls: 'vm-note',
      at: () => { const r = li.getBoundingClientRect();
        if (!r.width) return null;
        return { x: r.left + r.width / 2, y: r.top + 2 }; },
      html: trinketNote(P, S().got[id], false, !!window.FX),
      on: { '[data-act=fx]': () => { const t = li; Note.shut(); if (window.FX) FX.open(t, t.dataset.fx); } }
    });
    drawNoteShot(el, id);
  }

  function prizeCard() {
    const s = S(), el = $('vm-prize');
    if (s.tray) {
      el.className = 'vm-prize waiting';
      el.innerHTML = '<div class="vm-shut">a capsule, unopened</div>'
        + '<button type="button" class="gz-btn gz-btn-sm" id="vm-twist">twist it open</button>';
      $('vm-twist').addEventListener('click', twist);
      return;
    }
    if (!s.last) {
      el.className = 'vm-prize empty';
      el.innerHTML = '<div class="vm-shut">nothing yet. turn the knob.</div>';
      return;
    }
    const P = byId(s.last.id), T = TIERS[s.last.t];
    if (!P) { el.innerHTML = ''; return; }
    el.className = 'vm-prize got';
    el.innerHTML = '<span class="vm-tier" style="background:' + T.c + '">' + T.n + '</span>'
      + '<canvas class="vm-shot" width="120" height="120"></canvas>'
      + '<b class="vm-name">' + esc(P.n) + '</b>'
      + '<i class="vm-flav">' + esc(P.f) + '</i>'
      + (s.last.dupe ? '<span class="vm-dupe">you had one already — that is ' + S().got[P.id] + ' of them</span>' : '');
    const c = el.querySelector('.vm-shot');
    // save/restore so the base transform Lab.hidpi set stays put underneath
    Lab.hidpi(c, () => { const g = c.getContext('2d');
      g.save(); g.translate(60, 62); trinket(g, P.id, 40); g.restore(); });
  }

  function cabinet() {
    const s = S(), el = $('vm-cabinet');
    el.innerHTML = PRIZES.map(P => {
      const n = s.got[P.id] || 0, T = TIERS[P.t];
      if (!n) return '<li class="vm-slot none" title="not found yet"><span class="vm-q">?</span></li>';
      return '<li class="vm-slot" data-fx="vm:' + P.id + '" title="' + esc(P.n + ' — ' + T.n + '. ' + P.f) + '" style="--tc:' + T.c + '">'
        + '<canvas width="52" height="52"></canvas>'
        + (n > 1 ? '<i class="vm-n">×' + n + '</i>' : '') + '</li>';
    }).join('');
    el.querySelectorAll('.vm-slot[data-fx]').forEach(li => {
      const id = li.dataset.fx.split(':')[1], c = li.querySelector('canvas');
      Lab.hidpi(c, () => { const g = c.getContext('2d');
        g.save(); g.translate(26, 27); trinket(g, id, 17); g.restore(); });
    });
    const have = PRIZES.filter(P => s.got[P.id]).length;
    $('vm-have').textContent = have + ' of ' + PRIZES.length + ' found · ' + s.pulls
      + (s.pulls === 1 ? ' capsule' : ' capsules') + ' opened';
  }

  function face() {
    const s = S();
    const wait = waitLeft();
    $('vm-led').textContent = s.broken ? 'out of order'
      : s.tokens >= s.cap ? 'full — ' + s.tokens + ' banked'
      : s.tokens > 0 ? s.tokens + ' ready · next in ' + clock(wait)
      : 'next capsule in ' + clock(wait);
    const btn = $('vm-pull');
    btn.disabled = s.broken || s.tokens < 1 || !!s.tray;
    btn.textContent = s.tray ? 'one in the tray' : s.tokens > 0 ? 'turn the knob' : 'wait for it';
    $('vm-pity').textContent = 'a rare or better within ' + (PITY - s.dry) + ' more';
    const peek = $('vm-peek');
    if (peek) {
      const nx = s.nextUp && byId(s.nextUp.id);
      peek.textContent = nx ? 'loaded next: ' + nx.n + ' (' + TIERS[s.nextUp.t].n + ')' : 'nothing loaded yet';
    }
  }

  function render() {
    face(); prizeCard(); cabinet();
    const s = S();
    $('vm-every').value = String(s.every);
    $('vm-cap').value = String(s.cap);
    $('vm-rig').value = s.rig || '';
    $('vm-broken').textContent = s.broken ? 'put it back in service' : 'hang the out-of-order sign';
    start();
  }

  // ── the odds, printed on the side ───────────────────────────────────────
  $('vm-odds').innerHTML = TORDER.map(k =>
    '<li><i style="background:' + TIERS[k].c + '"></i><span>' + TIERS[k].n + '</span><b>' + TIERS[k].w + '%</b></li>').join('');

  // ── wiring ──────────────────────────────────────────────────────────────
  $('vm-pull').addEventListener('click', pull);

  // the case: a click describes the trinket. Dressing it up is a button
  // inside that note, so this one click is not fighting FX for the element.
  $('vm-cabinet').addEventListener('click', e => {
    const li = e.target.closest('.vm-slot[data-fx]');
    if (!li) return;
    e.stopPropagation();
    showSlot(li);
  });

  const at = e => { const r = canvas.getBoundingClientRect();
    return { x: (e.clientX - r.left) * W / r.width, y: (e.clientY - r.top) * H / r.height }; };
  const onTray = p => S().tray && Math.hypot(p.x - (TRAY.x + TRAY.w / 2), p.y - (TRAY.y + TRAY.h / 2 + 4)) < 26;
  canvas.addEventListener('pointermove', e => {
    const h = !!onTray(at(e));
    if (h !== hoverTray) { hoverTray = h; canvas.style.cursor = h ? 'pointer' : 'default'; redraw(); }
  });
  canvas.addEventListener('pointerleave', () => { hoverTray = false; canvas.style.cursor = 'default'; });
  canvas.addEventListener('click', e => {
    const p = at(e);
    if (onTray(p)) { e.stopPropagation(); return twist(); }
    if (Math.hypot(p.x - 238, p.y - 138) < 26) { e.stopPropagation(); pull(); }   // the knob itself
  });

  $('vm-every').addEventListener('change', e => {
    if (!isOwner()) return;
    store.update(s => { s.every = +e.target.value; s.lastAt = Date.now(); });
    say('restocking every ' + (EVERY.find(v => v[0] === +e.target.value) || [0, '?'])[1] + ' from now on.');
  });
  $('vm-cap').addEventListener('change', e => {
    if (!isOwner()) return;
    store.update(s => { s.cap = clamp(+e.target.value, 1, 6); s.tokens = Math.min(s.tokens, s.cap); });
  });
  $('vm-rig').addEventListener('change', e => {
    if (!isOwner()) return;
    const t = e.target.value;
    store.update(s => { s.rig = TIERS[t] ? t : ''; s.nextUp = roll(s); });
    say(TIERS[t] ? 'the next one is rigged: ' + TIERS[t].n + '. nobody will know.' : 'unrigged. back to the printed odds.');
  });
  $('vm-restock').addEventListener('click', () => {
    if (!isOwner()) return;
    store.update(s => { s.tokens = Math.min(s.cap, s.tokens + 1); if (!s.nextUp) s.nextUp = roll(s); });
    say('restocked by hand. that is one of the perks.');
  });
  $('vm-broken').addEventListener('click', () => {
    if (!isMod()) return;
    let now = false;
    store.update(s => { s.broken = !s.broken; now = s.broken; });
    say(now ? 'sign hung. it takes nothing and gives nothing.' : 'sign down. it hums back to life.');
  });
  $('vm-empty').addEventListener('click', () => {
    if (!isOwner()) return;
    if (!confirm('Empty their pockets — every trinket in the cabinet, and the count of capsules opened. Sure?')) return;
    store.update(s => { s.got = {}; s.last = null; s.tray = null; s.pulls = 0; s.dry = 0; });
    if (window.Note) Note.shut();
    say('pockets emptied. cruel, but within your rights.');
  });

  store.on(render);
  document.addEventListener('lab:role', render);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { tick(); start(); } });
  setInterval(() => { if (!tick()) face(); }, 1000);       // the clock runs whether or not anybody looks
  tick(true);
  // the machine is a bitmap: repaint it bigger when the camera moves in on it
  Lab.hidpi(canvas, () => paint(performance.now()));
  render();

  return { pull, twist, tick, redraw, start, render, roll: v => roll(v || S()), PRIZES, TIERS, PITY, store };
})();
