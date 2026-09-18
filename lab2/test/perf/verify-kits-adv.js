/* lab2/test/perf/verify-kits-adv.js — THE FIVE QUESTIONS AN ADVERSARY ASKS
   of the sandbox's kits.js. verify-kits.js next door re-runs the live
   bench's gestures and proves the old three kits still behave; this file
   goes after the new work, and every check here is written to FAIL if the
   thing it names is wrong rather than to agree with the builder.

     A · the old three kits extract byte for byte the same as the live
         lab2/kits.js does — all fifty-six parts, every field, both servers
         open at once with the door blocked.
     B · the sprite cache key. Two sections of the SAME part carrying
         DIFFERENT data-palette, zoomed out until both are sprites: the two
         tile regions must hold different colours. The contract warns about
         exactly this and it is invisible while you are zoomed in.
     C · data-rot answers ctrl on the DRAWING and not on the unrotated box:
         a point inside the turned ink and outside the flat ink must read
         ink, and a point inside the flat ink and outside the turned one
         must read paper — both directions, and the tile must agree.
     D · the style pass, all ten of Appendix C's presets: the DOM edits the
         plan's table promises, and then the sprite against the live part —
         the raster string re-shadowed by the painter, against the still
         string wearing its own filter, in the same padded frame. Mean pixel
         difference under 2 %, which is the bar the picture has to clear for
         a sticker not to change as it crosses the live line.
     E · a page with no bench: press/tools/no-bench.html, one <script> and
         no world, must not throw, must make no #kit-layer, and must hand
         back forty strings in the palette it was given.

   USAGE (from site/, BOTH servers up — 4321 for the live bench, 4322 for
   the sandbox):  node lab2/test/perf/verify-kits-adv.js
   Headed system Chrome, because B, C and D all read painted pixels. The
   autosave door is 404'd on both pages: this file writes no markup.
   Pictures land in perf/results/kits-adv/. */
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');
const OUT = path.join(__dirname, 'results', 'kits-adv');
fs.mkdirSync(OUT, { recursive: true });
const results = [];
const check = (name, ok, info) => { results.push({ name, ok: !!ok, info }); console.log((ok ? 'PASS ' : 'FAIL ') + name + (info ? ' — ' + info : '')); };
const PRESETS = ['pixel', 'flat', 'outline-cartoon', 'cel', 'painterly', 'ink-sketch', 'neon', 'retro-print', 'grunge', 'cozy-soft'];

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: false, args: ['--window-size=1616,1110', '--window-position=0,0'] });
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });

  // ══ A · the old three kits, live against sandbox ═══════════════════════
  const dump = async (url, needSheets) => {
    const p = await ctx.newPage();
    await p.route('**/_lab2/**', r => r.fulfill({ status: 404, body: 'no door' }));
    await p.goto(url, { waitUntil: 'load' });
    await p.waitForFunction(n => window.Kits && Kits.stats().sheets.length >= n, needSheets);
    await p.waitForTimeout(2500);
    const out = await p.evaluate(() => {
      const o = {};
      ['forest', 'village', 'gnome'].forEach(kit => {
        const sh = Kits.sheets[kit]; if (!sh) return;
        Object.keys(sh.parts).sort().forEach(part => {
          const P = sh.parts[part];
          o[kit + '/' + part] = { w: P.w, h: P.h, full: P.full, sway: P.sway, still: P.still, raster: P.raster,
                                  spill: P.spill, shadow: P.shadow, motion: P.motion, text: P.text, ink: P.ink };
        });
        o['@kf:' + kit] = sh.keyframes.join('\n');
      });
      return o;
    });
    await p.close();
    return out;
  };
  const live = await dump('http://localhost:4321/lab2/', 3);
  const sand = await dump('http://localhost:4322/lab2/test/', 4);
  const lk = Object.keys(live).sort(), sk = Object.keys(sand).sort();
  check('A · the same fifty-six parts and three keyframe blocks come out of both', lk.length === sk.length && lk.join() === sk.join(),
        lk.length + ' live, ' + sk.length + ' sandbox');
  const bad = [];
  for (const k of lk) {
    if (JSON.stringify(live[k]) !== JSON.stringify(sand[k])) bad.push(k);
  }
  check('A · every field of every old-kit part is byte-identical', bad.length === 0, bad.length ? bad.slice(0, 6).join(', ') : lk.length + ' records, no difference');

  // ══ the sandbox bench, for B, C and D ══════════════════════════════════
  const page = await ctx.newPage();
  const errors = []; page.on('pageerror', e => errors.push(String(e)));
  const cerrs = []; page.on('console', m => { if (m.type() === 'error' && !/404/.test(m.text())) cerrs.push(m.text()); });
  await page.route('**/_lab2/**', r => r.fulfill({ status: 404, body: 'no door' }));
  await page.goto('http://localhost:4322/lab2/test/', { waitUntil: 'load' });
  await page.waitForFunction(() => window.Kits && Kits.stats().sheets.length === 4);
  await page.waitForTimeout(2000);

  const look = async (z, wx, wy, ms = 900) => {
    await page.evaluate(([z, wx, wy]) => { const b = Lab.bench.getBoundingClientRect(); Lab.camTo(z, b.width / 2 - wx * z, b.height / 2 - wy * z, 0); }, [z, wx, wy]);
    await page.waitForTimeout(ms);
  };
  const rect = id => page.evaluate(id => {
    const el = document.querySelector('[data-gizmo="' + CSS.escape(id) + '"]'); if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.left, y: r.top, w: r.width, h: r.height, cx: r.left + r.width / 2, cy: r.top + r.height / 2,
             wx: parseFloat(el.style.left), wy: parseFloat(el.style.top) };
  }, id);

  /* the pointer's colour on the KIT LAYER: the tile canvas under the point,
     read at its own resolution. Nothing here reaches into kits.js — a tile
     is a <canvas> on the page and this is what a person's eye would see.
     addInitScript and not addScriptTag: this file reloads the bench twice
     and a script tag does not survive that. */
  await ctx.addInitScript(`window.__pix = function (x, y, rad) {
    rad = rad || 3;
    const cvs = [...document.querySelectorAll('#kit-layer canvas')];
    for (const c of cvs) {
      const r = c.getBoundingClientRect();
      if (x < r.left || x > r.right || y < r.top || y > r.bottom) continue;
      const px = Math.round((x - r.left) / r.width * c.width), py = Math.round((y - r.top) / r.height * c.height);
      const g = c.getContext('2d');
      const n = rad * 2 + 1;
      const d = g.getImageData(Math.max(0, px - rad), Math.max(0, py - rad), n, n).data;
      const tally = new Map(); let best = null, bestN = 0;
      for (let i = 0; i < d.length; i += 4) {
        if (d[i + 3] < 200) continue;
        const k = d[i] + ',' + d[i + 1] + ',' + d[i + 2];
        const v = (tally.get(k) || 0) + 1; tally.set(k, v);
        if (v > bestN) { bestN = v; best = k; }
      }
      let alpha = 0; for (let i = 3; i < d.length; i += 4) alpha = Math.max(alpha, d[i]);
      return { on: c.id || 'tile', rgb: best, n: bestN, alpha: alpha };
    }
    return null;
  };`);
  await page.reload({ waitUntil: 'load' });
  await page.waitForFunction(() => window.Kits && Kits.stats().sheets.length === 4);
  await page.waitForTimeout(2000);

  // a copy of one tray sticker, dragged clear of the tray by the bench's own
  // gestures — the only way to get two sections of ONE part on the paper
  async function twinOf(id, dx) {
    const r0 = await rect(id);
    await page.mouse.move(r0.cx, r0.cy);
    await page.keyboard.down('Shift'); await page.mouse.down(); await page.mouse.up(); await page.keyboard.up('Shift');
    await page.waitForTimeout(120);
    await page.keyboard.press('Control+c');
    await page.keyboard.press('Control+v');
    await page.waitForTimeout(500);
    const copyId = await page.evaluate(part => {
      const c = [...document.querySelectorAll('.gz.gz-copy[data-kit="stickers"]')].find(e => e.dataset.part === part);
      return c ? c.dataset.gizmo : null;
    }, id.replace(/^sticker-/, ''));
    await page.keyboard.press('Escape');
    if (!copyId) return null;
    /* WHERE THE COPY IS PICKED UP MATTERS. lab.js pastes a copy offset down
       and right, so the copy's own CENTRE sits over the original's
       bottom-right corner — which is where the original's .gz-size button
       is, and a press there re-cuts the original instead of carrying the
       copy. The grab is therefore low and left: below the original's bottom
       edge (the +48 offset puts 0.92 of the copy's height past it) and well
       away from the copy's own corner. */
    const rc = await rect(copyId);
    const gx = rc.x + rc.w * 0.25, gy = rc.y + rc.h * 0.92;
    await page.mouse.move(gx, gy);
    await page.mouse.down();
    await page.mouse.move(gx + dx, gy, { steps: 12 });
    await page.mouse.up();
    await page.waitForTimeout(350);
    await page.keyboard.press('Escape');
    // neither box may have been re-cut on the way — a resized twin would
    // make every reading below a comparison of two different things
    const boxes = await page.evaluate(([a, b]) => [a, b].map(i => { const r = Kits.recs.get(i); return r ? [r.w, r.h] : null; }), [id, copyId]);
    check('· the copy carried, and neither box was re-cut (' + id + ')',
          JSON.stringify(boxes) === JSON.stringify([[134, 135], [134, 135]]), JSON.stringify(boxes));
    return copyId;
  }

  // ══ B · the sprite cache key ═══════════════════════════════════════════
  await look(1, 67, 967, 1200);
  const twinB = await twinOf('sticker-burst', 420);
  check('B · a copy of one sticker stands beside it', !!twinB, twinB || 'no copy');
  const RED = '{"skPrimary":"#e01010","skSecondary":"#e01010","skHighlight":"#ff5555","skShadow":"#7a0808"}';
  const GRN = '{"skPrimary":"#10a010","skSecondary":"#10a010","skHighlight":"#55dd55","skShadow":"#075007"}';
  await page.evaluate(([a, b, pa, pb]) => {
    document.querySelector('[data-gizmo="' + CSS.escape(a) + '"]').setAttribute('data-palette', pa);
    document.querySelector('[data-gizmo="' + CSS.escape(b) + '"]').setAttribute('data-palette', pb);
  }, ['sticker-burst', twinB, RED, GRN]);
  await page.waitForTimeout(900);
  const vk = await page.evaluate(() => Object.keys(Kits.sheets.stickers.variants).filter(k => k.indexOf('stickers/burst@') === 0));
  check('B · the two sections made TWO variant records for the one part', vk.length === 2, vk.join(' | '));
  // out to 50 %: below ZOOM_NO_TILES, and a 134-unit sticker draws 67 px, far
  // under SWAY_PX — both are sprites on a tile
  await look(0.5, 300, 967, 1600);
  const spr = await page.evaluate(([a, b]) => {
    const one = id => { const e = document.querySelector('[data-gizmo="' + CSS.escape(id) + '"]');
      return { live: !!e.querySelector('.gz-art > svg, .gz-art > canvas'), key: Kits.recs.get(id).vkey }; };
    return { a: one(a), b: one(b), tiles: Kits.stats().tiles };
  }, ['sticker-burst', twinB]);
  check('B · both are sprites at 50 %, on tiles, each with its own variant key',
        !spr.a.live && !spr.b.live && spr.tiles > 0 && spr.a.key && spr.b.key && spr.a.key !== spr.b.key, JSON.stringify(spr));
  const rA = await rect('sticker-burst'), rB = await rect(twinB);
  const pA = await page.evaluate(([x, y]) => window.__pix(x, y, 4), [rA.cx, rA.cy]);
  const pB = await page.evaluate(([x, y]) => window.__pix(x, y, 4), [rB.cx, rB.cy]);
  const near = (rgb, r, g, b, tol) => { if (!rgb) return false; const v = rgb.split(',').map(Number);
    return Math.abs(v[0] - r) <= tol && Math.abs(v[1] - g) <= tol && Math.abs(v[2] - b) <= tol; };
  check('B · the two tile regions are painted in DIFFERENT colours', !!pA && !!pB && pA.rgb !== pB.rgb, 'A=' + JSON.stringify(pA) + ' B=' + JSON.stringify(pB));
  check('B · …and each is its own section’s palette, not its neighbour’s',
        near(pA.rgb, 224, 16, 16, 12) && near(pB.rgb, 16, 160, 16, 12), 'A=' + (pA && pA.rgb) + ' wanted 224,16,16 · B=' + (pB && pB.rgb) + ' wanted 16,160,16');
  await page.screenshot({ path: path.join(OUT, 'B-two-palettes.png'), clip: { x: Math.max(0, Math.min(rA.x, rB.x) - 30), y: Math.max(0, rA.y - 30), width: Math.abs(rB.x - rA.x) + rB.w + 60, height: rA.h + 60 } });

  /* and then the Press Table's own move, on the same two sections: a whole
     new style vector mid-page. setStyle re-extracts the sheet from the text
     it kept, which throws every variant away — so both must be BUILT AGAIN
     against the new style, and both bitmaps re-baked. A re-extract that
     forgot them would leave the two sections drawing the page's own sticker
     in one colour, which is the same bug as the shared cache key wearing a
     different hat. */
  await page.evaluate(async () => {
    await Kits.setStyle({ preset: 'ink-sketch', lineShow: true, lineWeight: 0.5, lineWobble: 0.6, linePasses: 2,
                          corners: 0.2, shading: 'hatch', texture: 'paper', paletteSize: 0, pixel: 0, saturation: 0.2, finish: 'none' });
  });
  await page.waitForTimeout(1400);
  const restyled = await page.evaluate(([a, b]) => {
    const k = id => Kits.recs.get(id).vkey;
    return { a: k(a), b: k(b), n: Object.keys(Kits.sheets.stickers.variants).length, style: Kits.stats().style,
             wobble: /url\(#sk-wobble-/.test(Kits.sheets.stickers.parts.burst.still) };
  }, ['sticker-burst', twinB]);
  const qA = await page.evaluate(([x, y]) => window.__pix(x, y, 4), [rA.cx, rA.cy]);
  const qB = await page.evaluate(([x, y]) => window.__pix(x, y, 4), [rB.cx, rB.cy]);
  const hue = p => { const v = (p && p.rgb || '0,0,0').split(',').map(Number); return v[0] - v[1]; };
  check('B · setStyle re-skins the sheet and BOTH variants come back, each still its own colour',
        restyled.style === 'ink-sketch' && restyled.wobble && restyled.a && restyled.b && restyled.a !== restyled.b &&
        qA && qB && qA.rgb !== qB.rgb && hue(qA) > 40 && hue(qB) < -40,
        JSON.stringify(restyled) + ' A=' + (qA && qA.rgb) + ' B=' + (qB && qB.rgb));

  // ══ C · data-rot ═══════════════════════════════════════════════════════
  await page.reload({ waitUntil: 'load' });
  await page.waitForFunction(() => window.Kits && Kits.stats().sheets.length === 4);
  await page.waitForTimeout(2200);
  await look(1, 67, 1747, 1200);                      // the tape-strip's row
  const tapeId = 'sticker-tape-strip';
  const haveTape = await page.evaluate(id => !!document.querySelector('[data-gizmo="' + CSS.escape(id) + '"]'), tapeId);
  check('C · the tray holds a tape-strip to turn', haveTape, tapeId);
  const rt = await rect(tapeId);
  await look(1, rt.wx + 67, rt.wy + 67, 1000);
  const twinC = await twinOf(tapeId, 420);
  check('C · a twin of the tape-strip stands beside it', !!twinC, twinC || 'no copy');
  await page.evaluate(id => document.querySelector('[data-gizmo="' + CSS.escape(id) + '"]').setAttribute('data-rot', '45'), twinC);
  await page.waitForTimeout(800);
  const rotOn = await page.evaluate(id => {
    const r = Kits.recs.get(id);
    return { rot: r.rot, live: !!r.live };
  }, twinC);
  check('C · the record took the turn (clamped to ROT_MAX)', rotOn.rot === 45, JSON.stringify(rotOn));

  // the grid: the same relative point in each box, one turned and one not
  const rTwin = await rect(twinC), rPlain = await rect(tapeId);
  const grid = await page.evaluate(([idR, idP, rr, rp]) => {
    const R = document.querySelector('[data-gizmo="' + CSS.escape(idR) + '"]');
    const P = document.querySelector('[data-gizmo="' + CSS.escape(idP) + '"]');
    const out = [];
    const N = 28;
    for (let j = 0; j <= N; j++) for (let i = 0; i <= N; i++) {
      const u = i / N, v = j / N;
      const a = Kits.inkAt(R, rr.x + u * rr.w, rr.y + v * rr.h);
      const b = Kits.inkAt(P, rp.x + u * rp.w, rp.y + v * rp.h);
      out.push({ u, v, a: a === true, b: b === true });
    }
    return out;
  }, [twinC, tapeId, rTwin, rPlain]);
  const onlyRot = grid.filter(g => g.a && !g.b);
  const onlyFlat = grid.filter(g => !g.a && g.b);
  check('C · there are points INSIDE the turned ink and OUTSIDE the flat ink', onlyRot.length > 0, onlyRot.length + ' of ' + grid.length);
  check('C · …and points inside the FLAT ink that the turned one calls paper', onlyFlat.length > 0, onlyFlat.length + ' of ' + grid.length);
  // and the turned answer is the flat one read at the back-rotated point
  const agree = await page.evaluate(([idR, idP, rr, rp]) => {
    const R = document.querySelector('[data-gizmo="' + CSS.escape(idR) + '"]');
    const P = document.querySelector('[data-gizmo="' + CSS.escape(idP) + '"]');
    const rec = Kits.recs.get(idR);
    const part = Kits.sheets.stickers.parts[rec.part];
    const k = rec.k, ink = part.ink;
    const tx = (rec.w - rec.natW * k) / 2, ty = (rec.h - rec.natH * k) / 2;
    const px = tx + (part.w / 2 - ink.x) * k, py = ty + (part.h / 2 - ink.y) * k;
    const a = -rec.rot * Math.PI / 180, ca = Math.cos(a), sa = Math.sin(a);
    let same = 0, n = 0, N = 28;
    for (let j = 0; j <= N; j++) for (let i = 0; i <= N; i++) {
      const lx = (i / N) * rr.w, ly = (j / N) * rr.h;      // box px, both boxes are one size at zoom 1
      const dx = lx - px, dy = ly - py;
      const bx = px + dx * ca - dy * sa, by = py + dx * sa + dy * ca;
      if (bx < 0 || by < 0 || bx > rp.w || by > rp.h) continue;
      const A = Kits.inkAt(R, rr.x + lx, rr.y + ly) === true;
      const B = Kits.inkAt(P, rp.x + bx, rp.y + by) === true;
      n++; if (A === B) same++;
    }
    return { same, n, pct: n ? Math.round(same / n * 1000) / 10 : 0 };
  }, [twinC, tapeId, rTwin, rPlain]);
  check('C · the turned mask IS the flat mask, back-rotated (>= 92 % of the points)', agree.pct >= 92, agree.same + '/' + agree.n + ' = ' + agree.pct + ' %');

  // the real gesture: ctrl over a point the flat box calls paper
  const gA = onlyRot[Math.floor(onlyRot.length / 2)];
  const ptA = { x: rTwin.x + gA.u * rTwin.w, y: rTwin.y + gA.v * rTwin.h };
  await page.mouse.move(ptA.x - 1, ptA.y);
  await page.keyboard.down('Control');
  await page.mouse.move(ptA.x, ptA.y);
  await page.waitForTimeout(280);
  const hitA = await page.evaluate(() => Ink.hit && Ink.hit.dataset.gizmo);
  await page.screenshot({ path: path.join(OUT, 'C-rot-ctrl.png'), clip: { x: Math.max(0, rTwin.x - 40), y: Math.max(0, rTwin.y - 40), width: rTwin.w + 80, height: rTwin.h + 80 } });
  await page.keyboard.up('Control');
  check('C · ctrl over the turned ink picks the turned sticker', hitA === twinC, 'hit=' + hitA + ' at u=' + gA.u.toFixed(2) + ' v=' + gA.v.toFixed(2));
  const gB = onlyFlat[Math.floor(onlyFlat.length / 2)];
  const ptB = { x: rTwin.x + gB.u * rTwin.w, y: rTwin.y + gB.v * rTwin.h };
  await page.mouse.move(ptB.x - 1, ptB.y);
  await page.keyboard.down('Control');
  await page.mouse.move(ptB.x, ptB.y);
  await page.waitForTimeout(280);
  const hitB = await page.evaluate(() => Ink.hit && Ink.hit.dataset.gizmo);
  await page.keyboard.up('Control');
  check('C · ctrl where only the FLAT drawing would be does NOT pick it', hitB !== twinC, 'hit=' + hitB + ' at u=' + gB.u.toFixed(2) + ' v=' + gB.v.toFixed(2));

  // the tile agrees with the mask: the sprite is turned too
  await look(0.5, rTwin.wx + 200, rTwin.wy + 67, 1600);
  const rT2 = await rect(twinC);
  const tileRot = await page.evaluate(([r, a, b]) => ({
    inTurned: window.__pix(r.x + a.u * r.w, r.y + a.v * r.h, 1),
    inFlat: window.__pix(r.x + b.u * r.w, r.y + b.v * r.h, 1)
  }), [rT2, gA, gB]);
  check('C · the SPRITE is turned as well: paint where the turn put it, none where the flat drawing was',
        tileRot.inTurned && tileRot.inTurned.alpha > 120 && tileRot.inFlat && tileRot.inFlat.alpha < 90, JSON.stringify(tileRot));

  // ══ D · the style pass, all ten presets ════════════════════════════════
  await page.reload({ waitUntil: 'load' });
  await page.waitForFunction(() => window.Kits && Kits.stats().sheets.length === 4);
  await page.waitForTimeout(2200);
  await page.addScriptTag({ url: 'press/style.js' });
  await page.waitForFunction(() => !!window.Style);

  // the picture check, done in the page: the raster string the sprite is
  // made of, re-shadowed by the painter's own recipe, against the still
  // string the live part is, in one padded frame
  await page.addScriptTag({ content: `window.__agree = async function (part) {
    const P = Kits.sheets.stickers.parts[part];
    const NS = 'http://www.w3.org/2000/svg';
    const rw = parseFloat(new DOMParser().parseFromString(P.raster, 'image/svg+xml').documentElement.getAttribute('width'));
    const PAD = (rw - P.w) / 2, W = Math.round(P.w + 2 * PAD), H = Math.round(P.h + 2 * PAD);
    const pad = str => {
      const el = new DOMParser().parseFromString(str, 'image/svg+xml').documentElement;
      el.setAttribute('overflow', 'visible'); el.setAttribute('x', PAD); el.setAttribute('y', PAD);
      const w = document.createElementNS(NS, 'svg');
      w.setAttribute('xmlns', NS); w.setAttribute('width', W); w.setAttribute('height', H);
      w.appendChild(el);
      return new XMLSerializer().serializeToString(w);
    };
    const img = s => new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no;
      i.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(s); });
    const shadow = P.shadow ? 'drop-shadow(' + P.shadow.x + 'px ' + P.shadow.y + 'px ' + P.shadow.blur + 'px ' + P.shadow.color + ')' : 'none';
    const draw = async (s, filter) => {
      const c = document.createElement('canvas'); c.width = W; c.height = H;
      const g = c.getContext('2d', { willReadFrequently: true });
      g.filter = filter;
      g.drawImage(await img(s), 0, 0);
      return g.getImageData(0, 0, W, H).data;
    };
    const A = await draw(P.raster, shadow);          // what the sprite bakes
    const B = await draw(pad(P.still), 'none');      // what the live part wears
    let sum = 0, ink = 0;
    for (let i = 0; i < A.length; i += 4) {
      sum += Math.abs(A[i] - B[i]) + Math.abs(A[i+1] - B[i+1]) + Math.abs(A[i+2] - B[i+2]) + Math.abs(A[i+3] - B[i+3]);
      if (A[i+3] > 8 || B[i+3] > 8) ink++;
    }
    return { pct: Math.round(sum / (A.length) / 255 * 10000) / 100, ink: ink, w: W, h: H, shadow: shadow };
  };` });

  const styleRows = [];
  for (const preset of PRESETS) {
    const row = await page.evaluate(async p => {
      const v = Style.forPreset(p, { pixel: p === 'pixel' ? 4 : 0, saturation: 0.2 });
      await Kits.setStyle(v);
      const sh = Kits.sheets.stickers;
      const P = sh.parts.burst;
      const doc = new DOMParser().parseFromString(P.still, 'image/svg+xml');
      const svg = doc.documentElement;
      const L = n => svg.querySelector(':scope > g[data-layer="' + n + '"]');
      const halo = L('halo'), line = L('line'), shadow = L('shadow'), detail = L('detail');
      const tex = svg.querySelector(':scope > rect[data-layer="texture"]');
      const defIds = [...svg.querySelectorAll(':scope > defs > *')].map(n => n.getAttribute('id'));
      const wob = svg.querySelector(':scope > defs > filter[id^="sk-wobble"] feDisplacementMap');
      return {
        preset: p, vector: v,
        line: !!line, lineFilter: line && line.getAttribute('filter'),
        linejoin: line && line.getAttribute('stroke-linejoin'),
        line2: !!svg.querySelector(':scope > g[data-layer="line-2"]'),
        stroke: line && (line.getAttribute('stroke-width') || (line.querySelector('[stroke-width]') && line.querySelector('[stroke-width]').getAttribute('stroke-width'))),
        shadow: !!shadow, shadowFilter: shadow && shadow.getAttribute('filter'),
        shadowFill: shadow && (shadow.getAttribute('fill') || (shadow.querySelector('[fill]') && shadow.querySelector('[fill]').getAttribute('fill'))),
        detail: !!detail,
        haloStyle: halo && halo.getAttribute('style'),
        haloShown: !!halo && !/display\s*:\s*none/i.test(halo.getAttribute('style') || ''),
        texture: !!tex, textureFill: tex && tex.getAttribute('fill'), textureClip: tex && tex.getAttribute('clip-path'),
        rootStyle: svg.getAttribute('style') || '',
        defIds: defIds, wobbleScale: wob && wob.getAttribute('scale'),
        pixel: P.pixel, filtered: P.filtered, text: P.text,
        statsStyle: Kits.stats().style
      };
    }, preset);
    const agree = await page.evaluate(() => window.__agree('burst'));
    row.agree = agree;
    styleRows.push(row);
    console.log('   ' + preset.padEnd(16) + ' line=' + (row.line ? 'y' : 'n') + ' filt=' + (row.lineFilter || '-') +
                ' shade=' + (row.shadowFilter || row.shadowFill || (row.shadow ? 'as-drawn' : 'gone')) +
                ' tex=' + (row.textureFill || '-') + ' halo=' + (row.haloShown ? 'y' : 'n') +
                ' pixel=' + row.pixel + ' filtered=' + row.filtered + ' Δ=' + agree.pct + '%');
  }
  const R = p => styleRows.find(r => r.preset === p);

  check('D · lineShow:false takes the line layer away (flat, painterly)', !R('flat').line && !R('painterly').line,
        'flat=' + R('flat').line + ' painterly=' + R('painterly').line);
  check('D · lineShow:true keeps it (the other eight)', PRESETS.filter(p => p !== 'flat' && p !== 'painterly').every(p => R(p).line),
        PRESETS.filter(p => !R(p).line).join(',') || 'all eight have a line');
  check('D · a wobbled line wears a filter, and a second pass makes a line-2',
        /url\(#sk-wobble-/.test(R('ink-sketch').lineFilter || '') && R('ink-sketch').line2 && /url\(#sk-wobble-/.test(R('grunge').lineFilter || '') && !R('grunge').line2,
        'ink-sketch ' + R('ink-sketch').lineFilter + ' line2=' + R('ink-sketch').line2 + ' · grunge line2=' + R('grunge').line2);
  check('D · the wobble scale is the vector’s, written into the part’s own copy', R('ink-sketch').wobbleScale === '2.4',
        'scale=' + R('ink-sketch').wobbleScale + ' (0.6 × 4)');
  check('D · a soft or painterly shade wears #sk-soft', /url\(#sk-soft-/.test(R('neon').shadowFilter || '') && /url\(#sk-soft-/.test(R('painterly').shadowFilter || '') && /url\(#sk-soft-/.test(R('cozy-soft').shadowFilter || ''),
        'neon=' + R('neon').shadowFilter + ' painterly=' + R('painterly').shadowFilter);
  check('D · hatch / halftone / dither swap the shade for their pattern',
        /url\(#sk-hatch-/.test(R('ink-sketch').shadowFill || '') && /url\(#sk-dots-/.test(R('retro-print').shadowFill || '') && /url\(#sk-dither-/.test(R('pixel').shadowFill || ''),
        R('ink-sketch').shadowFill + ' | ' + R('retro-print').shadowFill + ' | ' + R('pixel').shadowFill);
  check('D · flat drops the shadow layer, cel keeps it as drawn', !R('flat').shadow && R('cel').shadow && !R('cel').shadowFilter,
        'flat=' + R('flat').shadow + ' cel=' + R('cel').shadow + '/' + R('cel').shadowFilter);
  check('D · the texture rect is the pattern, clipped to the body — and absent where the vector says none',
        /url\(#sk-paper-/.test(R('ink-sketch').textureFill || '') && /url\(#sk-body-burst-/.test(R('ink-sketch').textureClip || '') &&
        /url\(#sk-scanlines-/.test(R('neon').textureFill || '') && /url\(#sk-grunge-/.test(R('grunge').textureFill || '') &&
        /url\(#sk-paper-/.test(R('painterly').textureFill || '') && !R('flat').texture && !R('cel').texture,
        'ink-sketch ' + R('ink-sketch').textureFill + ' clip ' + R('ink-sketch').textureClip + ' · flat=' + R('flat').texture);
  check('D · diecut shows the halo, and nothing else does',
        R('outline-cartoon').haloShown && R('cozy-soft').haloShown && PRESETS.filter(p => p !== 'outline-cartoon' && p !== 'cozy-soft').every(p => !R(p).haloShown),
        'shown: ' + (PRESETS.filter(p => R(p).haloShown).join(',') || 'none') + ' · halo at flat = "' + R('flat').haloStyle + '"');
  check('D · glow replaces the root drop-shadow with a bloom in the primary; none removes it; shadow keeps it',
        /drop-shadow\(0px 0px 6px/.test(R('neon').rootStyle) && !/filter/.test(R('ink-sketch').rootStyle) && /drop-shadow\(6px 7px/.test(R('cel').rootStyle),
        'neon="' + R('neon').rootStyle.slice(0, 90) + '" ink-sketch filter=' + /filter/.test(R('ink-sketch').rootStyle));
  check('D · every def id copied into a part is suffixed with the style’s hash',
        styleRows.every(r => r.defIds.every(id => /-[0-9a-z]+$/.test(id) && !/^sk-(soft|wobble|wobble-2|hatch|dots|dither|paper|noise|scanlines|grunge)$/.test(id))),
        styleRows.map(r => r.preset + ':' + r.defIds.length).join(' '));
  check('D · pixel = 4 reaches the record, and only the pixel preset', R('pixel').pixel === 4 && PRESETS.filter(p => p !== 'pixel').every(p => R(p).pixel === 0),
        'pixel=' + R('pixel').pixel + ' others=' + PRESETS.filter(p => p !== 'pixel').map(p => R(p).pixel).join(','));
  check('D · `filtered` is set for wobble-with-a-line, soft/painterly shade and glow — and not otherwise',
        R('ink-sketch').filtered && R('neon').filtered && R('painterly').filtered && R('cozy-soft').filtered && R('outline-cartoon').filtered &&
        !R('flat').filtered && !R('cel').filtered && !R('pixel').filtered,
        PRESETS.filter(p => R(p).filtered).join(','));

  // the picture: sprite against live, every preset
  const worst = styleRows.slice().sort((a, b) => b.agree.pct - a.agree.pct)[0];
  check('D · the sprite is the live part’s picture at every preset (mean pixel difference < 2 %)',
        styleRows.every(r => r.preset === 'pixel' || r.agree.pct < 2),
        styleRows.map(r => r.preset + ' ' + r.agree.pct + '%').join(' · ') + ' — worst ' + worst.preset);

  // the pixel preset is a bitmap on BOTH paths, so it is proved on the bench
  await page.evaluate(async () => { await Kits.setStyle(Style.forPreset('pixel', { pixel: 4, saturation: 0.2 })); });
  await page.waitForTimeout(1200);
  await look(2, 67, 967, 1400);                       // past ZOOM_NO_TILES: live
  const pixLive = await page.evaluate(() => {
    const e = document.querySelector('[data-gizmo="sticker-burst"]');
    const c = e.querySelector('.gz-art > canvas');
    if (!c) return { canvas: false, svg: !!e.querySelector('.gz-art > svg') };
    const r = c.getBoundingClientRect();
    return { canvas: true, sw: c.width, sh: c.height, rendering: c.style.imageRendering, box: { x: r.left, y: r.top, w: r.width, h: r.height } };
  });
  check('D · a pixel sticker is a <canvas> in the live DOM, at the sheet box over its grid',
        pixLive.canvas && pixLive.sw === Math.round(134 / 4) && pixLive.rendering === 'pixelated', JSON.stringify(pixLive));
  const pixText = await page.evaluate(() => {
    const e = document.querySelector('[data-gizmo="sticker-banner"]');
    const s = e.querySelector('.gz-art > svg');
    return { svg: !!s, crisp: s && s.style.shapeRendering, canvas: !!e.querySelector('.gz-art > canvas') };
  });
  // Chrome lower-cases a CSS keyword when it reads it back, so the value is
  // compared the way CSS compares it and not the way the file spells it
  check('D · a text part keeps its live svg under pixel, with crispEdges',
        pixText.svg && String(pixText.crisp).toLowerCase() === 'crispedges' && !pixText.canvas, JSON.stringify(pixText));
  // and the same bitmap on the tile
  await look(0.5, 67, 967, 1600);
  const rp = await rect('sticker-burst');
  const pixTile = await page.evaluate(([x, y]) => window.__pix(x, y, 4), [rp.cx, rp.cy]);
  check('D · the pixel sprite paints the same drawing on the tile', !!pixTile && pixTile.alpha > 120, JSON.stringify(pixTile));
  await page.screenshot({ path: path.join(OUT, 'D-pixel-tile.png'), clip: { x: Math.max(0, rp.x - 20), y: Math.max(0, rp.y - 20), width: rp.w + 40, height: rp.h + 40 } });

  check('D · no page or console errors through all ten presets', errors.length === 0 && cerrs.length === 0, (errors.concat(cerrs)).join(' | ').slice(0, 300));

  // ══ E · a page with no bench ═══════════════════════════════════════════
  const bare = await ctx.newPage();
  const bErr = [], bCon = [], b404 = [];
  bare.on('pageerror', e => bErr.push(String(e)));
  bare.on('console', m => { if (m.type() === 'error') bCon.push(m.text()); });
  // a browser asks any page for /favicon.ico and this one has none; what the
  // check below wants to know is whether anything ELSE failed to answer
  bare.on('response', r => { if (r.status() >= 400 && !/favicon/.test(r.url())) b404.push(r.status() + ' ' + r.url()); });
  await bare.goto('http://localhost:4322/lab2/test/press/tools/no-bench.html', { waitUntil: 'load' });
  await bare.waitForFunction(() => !!document.getElementById('answer'), null, { timeout: 20000 });
  const ans = await bare.evaluate(() => JSON.parse(document.getElementById('answer').textContent));
  check('E · kits.js on a page with no #bench-world does not throw', !ans.threw && bErr.length === 0, ans.threw || bErr.join(' | ') || 'clean');
  check('E · it makes no #kit-layer and no keyframe style', ans.layer === false, 'kit-layer=' + ans.layer);
  check('E · window.Kits is the extractor half only', ans.keys.join(',') === 'SHEETS,extractOnly,isKitSrc,kindOf,setStyle', '{ ' + ans.keys.join(', ') + ' }');
  check('E · extractOnly answered with all forty parts, each a string at the sheet box',
        ans.parts === 40 && ans.sample && ans.sample.w === 128 && ans.sample.h === 128 &&
        Object.keys(ans.strings).every(k => typeof ans.strings[k] === 'string' && ans.strings[k].indexOf('<svg') === 0),
        ans.parts + ' parts, ' + JSON.stringify(ans.sample));
  const noBraces = Object.keys(ans.strings).filter(k => /\{\{/.test(ans.strings[k]));
  check('E · not one interpolation survives — attributes or words', noBraces.length === 0, noBraces.join(',') || 'none of 40');
  const painted = Object.keys(ans.strings).filter(k => ans.strings[k].indexOf('#123456') >= 0);
  const knollLeft = Object.keys(ans.strings).filter(k => /#c93b82/i.test(ans.strings[k]));
  check('E · the caller’s palette reached the drawings and the sheet’s own primary is gone',
        painted.length >= 30 && knollLeft.length === 0, painted.length + ' of 40 carry #123456; ' + knollLeft.length + ' still carry Knoll pink');
  const fellBack = Object.keys(ans.strings).filter(k => /#ef4d98/i.test(ans.strings[k]));
  check('E · a role the caller left out fell back to the sheet’s own (skHighlight #ef4d98)', fellBack.length > 0, fellBack.length + ' parts');
  const words = Object.keys(ans.strings).filter(k => ans.strings[k].indexOf('NO BENCH') >= 0);
  check('E · the caller’s skText is set into the text parts', words.length >= 6, words.join(',') || 'none');
  const styled = Object.keys(ans.strings).filter(k => /url\(#sk-wobble-/.test(ans.strings[k]));
  check('E · the style vector was applied with no bench under it (ink-sketch: a wobbled line)', styled.length >= 30, styled.length + ' of 40');
  await bare.screenshot({ path: path.join(OUT, 'E-no-bench.png'), fullPage: false });
  check('E · every file the page asked for answered (the favicon aside)', b404.length === 0, b404.join(' | ') || 'nothing over 400');
  await bare.close();

  fs.writeFileSync(path.join(OUT, 'summary.json'), JSON.stringify({ when: new Date().toISOString(), results, styleRows }, null, 1));
  const fails = results.filter(r => !r.ok).length;
  console.log('\n' + (results.length - fails) + '/' + results.length + ' passed');
  await browser.close();
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
