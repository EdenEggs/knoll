/* ironhive/probe-touch.js — two fingers are the camera (2026-09-11).

   The report was "on mobile I can't move around; holding and dragging just
   moved assets", and the answer is lab.js's TWO FINGERS ARE THE CAMERA: one
   finger goes on meaning what it always meant, two fingers pan and pinch, and
   the second one takes the first one's press back so a pinch leaves nothing
   behind.

     0   which touch points the protocol KEEPS when one of two is lifted (a
         fact about this Chrome, established rather than assumed — check 5
         rests on it)
     1   ONE finger still drags a piece, and the camera holds still
     2   TWO fingers pan; the piece the first one landed on does not move, the
         crop marks it flashed up are put back, and not a byte is filed
     3   a pinch out zooms by the ratio of the spans, about the fingers' own
         middle — the world point there does not wander
     4   …and a pinch in does the same going the other way
     5   lift one of the two and the sheet stays with the one still down
     6   the pen: one finger draws; a second finger takes the stroke back
     7   the sticker tool: a tap stamps one, a pinch stamps none
     8   the text tool: a tap opens a note, a pinch opens none
     9   the play badge: a tap starts the film, a pinch starts none
    10   the scale corner: a pinch off it leaves the piece the size it was
    11   nothing is left holding anything — the bench takes a one-finger drag
         straight afterwards

   Driven through CDP's own touch events in real Chrome, on a phone-sized
   context with the SHIPPED wall under it (?seed=on), because a bench covered
   in stickers is the bench the report came from.

   WHY THE CAMERA IS MOVED ABOUT MID-PROBE. At the published phone framing
   there is no bare paper on screen at all — the title's tracing and the film
   cover it corner to corner, which is precisely why one finger could never
   move the sheet. So the checks that need INK (1, 2, 9, 10, 11) are taken at
   that framing, and the ones that need BARE PAPER (0, 5, 6, 7, 8) shove the
   camera off the work first: clampCam keeps 120px of it on screen, so
   everything else is paper.

   AND WHY EVERY GESTURE IS RIGGED TO FIT (see rig). The first cut of this
   file simply CLAMPED any finger that fell off the edge of the bench into it
   — which silently shortened the span between the two, so check 2's rigid pan
   arrived as a pinch and the probe reported a zoom the code had never done.
   A gesture that does not fit is now refused rather than bent, and `deformed`
   is asserted to be zero at the end: a check whose premise was quietly
   changed is not a check.

   Run with the site's serve.js up on 4321:  node ironhive/probe-touch.js */
const path = require('path');
const { chromium } = require('playwright');

let fails = 0, deformed = 0;
const say = (ok, what, extra) => { if (!ok) fails++; console.log((ok ? '  PASS  ' : '  FAIL  ') + what + (extra == null ? '' : '   ' + extra)); };
const skip = why => console.log('  ----  ' + why);
const URL = 'http://localhost:4321/ironhive/?seed=on';
const lerp = (a, b, t) => a + (b - a) * t;
const near = (a, b, slop) => Math.abs(a - b) <= slop;

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: false,
    args: ['--window-size=460,980', '--window-position=0,0'] });
  const ctx = await browser.newContext({ viewport: { width: 412, height: 915 },
    deviceScaleFactor: 2.625, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => { errors.push(String(e)); console.log('PAGEERROR', String(e)); });
  // the layout door stays shut, the way every probe here keeps it
  await page.route('**/_ironhive/default', r => r.fulfill({ status: 404, body: 'no door' }));
  // …and no film is ever actually fetched: what is under test is whether one STARTS
  await page.route('**youtube-nocookie.com/**', r => r.fulfill({ status: 200, contentType: 'text/html', body: '<title>film</title>' }));
  /* the dev server's hint is 42vh of a phone and the bench it leaves would
     frame the wrong thing — probe-seed.js's trick, for the same reason (an
     init script runs before <html> exists, so the style goes in the moment
     there is a root to hang it on) */
  await page.addInitScript(() => {
    const add = () => { const root = document.head || document.documentElement; if (!root) return false;
      const st = document.createElement('style'); st.textContent = 'html.lab-local .lab-hint{display:none!important}'; root.appendChild(st); return true; };
    if (!add()) new MutationObserver((m, o) => { if (add()) o.disconnect(); }).observe(document, { childList: true, subtree: true });
  });

  const cdp = await ctx.newCDPSession(page);
  const P = (id, x, y) => ({ x: Math.round(x), y: Math.round(y), id: id, radiusX: 10, radiusY: 10, force: 1, rotationAngle: 0 });
  const send = (type, points) => cdp.send('Input.dispatchTouchEvent', { type: type, touchPoints: points });
  const frames = () => page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));

  // where the camera is, what is on the paper, and what the bench is holding
  const state = () => page.evaluate(() => {
    const b = Lab.bench.getBoundingClientRect();
    const c = Lab.toWorld(b.left + b.width / 2, b.top + b.height / 2);
    const st = Wall.store.get();
    return { z: Lab.zoom, cx: c.x, cy: c.y, items: JSON.stringify(st.items), slots: st.items.length,
             n: st.items.filter(Boolean).length, picked: Wall.picked, pinching: Lab.pinching,
             panning: document.body.classList.contains('lab-panning'),
             notes: document.querySelectorAll('.wall-note').length,
             films: document.querySelectorAll('.wall-video').length,
             drawn: document.querySelectorAll('svg.wall-ink .wall-item').length };
  });
  const world = (x, y) => page.evaluate(([x, y]) => { const w = Lab.toWorld(x, y); return { x: w.x, y: w.y }; }, [x, y]);
  const item = i => page.evaluate(i => JSON.parse(JSON.stringify(Wall.store.get().items[i] || null)), i);
  const cam = () => page.evaluate(() => ({ z: Lab.zoom, x: Lab.pan.x, y: Lab.pan.y }));
  const setCam = c => page.evaluate(c => Lab.camTo(c.z, c.x, c.y, 0), c).then(() => page.waitForTimeout(250));
  /* somewhere the work is NOT: the clamp keeps 120px of it on screen however
     hard the camera is shoved, so a hundred thousand pixels leaves the wall in
     one corner and bare paper over the rest of the bench. */
  const emptyView = () => page.evaluate(() => Lab.camTo(Lab.zoom, -1e5, -1e5, 0)).then(() => page.waitForTimeout(250));

  /* the rectangle a finger may be put down in: the bench, less the dock
     standing over the foot of it. Measured once the page is up. */
  let safe = null;
  const measure = () => page.evaluate(() => {
    const b = Lab.bench.getBoundingClientRect();
    const d = document.getElementById('tool-dock').getBoundingClientRect();
    return { l: b.left + 20, r: b.right - 20, t: b.top + 50, b: Math.min(b.bottom, d.top) - 20 };
  });
  const inSafe = p => !!p && p.x >= safe.l && p.x <= safe.r && p.y >= safe.t && p.y <= safe.b;
  const fit = p => {
    const q = { x: Math.max(safe.l, Math.min(safe.r, p.x)), y: Math.max(safe.t, Math.min(safe.b, p.y)) };
    if (Math.abs(q.x - p.x) > 0.5 || Math.abs(q.y - p.y) > 0.5) deformed++;
    return q;
  };

  /* A GESTURE THAT FITS ON THE BENCH. Given where the first finger must land,
     it puts the second one down `apart` from it and shoves both by `shove` —
     trying both signs of each until all four points are inside the safe
     rectangle. The shove is the same vector for both fingers, so the span
     between them is EXACTLY unchanged and a pan is a pan; clamping a stray
     point instead is what turned check 2 into a pinch nobody asked for. */
  function rig(a0, apart, shove) {
    for (const s1 of [1, -1]) for (const s2 of [1, -1]) {
      const b0 = { x: a0.x + apart.x * s1, y: a0.y + apart.y * s1 };
      const d = { x: shove.x * s2, y: shove.y * s2 };
      const a1 = { x: a0.x + d.x, y: a0.y + d.y }, b1 = { x: b0.x + d.x, y: b0.y + d.y };
      if (inSafe(a0) && inSafe(b0) && inSafe(a1) && inSafe(b1)) return { a0: a0, b0: b0, a1: a1, b1: b1, d: d };
    }
    return null;
  }
  // …and the same for one finger, which only has to get itself there and back
  function rig1(a0, shove) {
    for (const s of [1, -1]) {
      const d = { x: shove.x * s, y: shove.y * s };
      const a1 = { x: a0.x + d.x, y: a0.y + d.y };
      if (inSafe(a0) && inSafe(a1)) return { a0: a0, a1: a1, d: d };
    }
    return null;
  }

  /* A POINT WHERE THE INK ACTUALLY IS. Hit-testing on this wall is
     visiblePainted (wall.js), so the middle of a piece's box is regularly a
     hole — the bbox centre of an elbow is nothing at all. The paper is swept
     for a point where elementFromPoint really does answer a .wall-item, which
     is exactly what a finger has to land on. The one nearest the middle of the
     bench is taken, so there is room round it for a gesture; a film is passed
     over (its badge is check 9's business) and a piece with a corner to pull
     is preferred. Move mode only: a piece is pointer-events:none until a tool
     that can reach it is up. */
  const inkPoint = () => page.evaluate(() => {
    const b = Lab.bench.getBoundingClientRect();
    const mx = b.left + b.width / 2, my = b.top + b.height / 2;
    const items = Wall.store.get().items;
    let best = null, bestD = Infinity;
    for (let y = b.top + 60; y < b.bottom - 150; y += 9) {
      for (let x = b.left + 24; x < b.right - 24; x += 9) {
        const el = document.elementFromPoint(x, y);
        if (!el || !el.closest) continue;
        if (el.closest('.wall-play')) continue;        // the badge is a gesture of its own
        const n = el.closest('.wall-item');
        if (!n) continue;
        const i = +n.dataset.i, it = items[i];
        if (!it || it.k === 'v') continue;
        const rank = (it.k === 'd' || it.k === 'i' || it.k === 'g') ? 0 : 1e6;   // one with a corner to pull
        const d = rank + Math.hypot(x - mx, y - my);
        if (d < bestD) { bestD = d; best = { x: x, y: y, i: i, k: it.k }; }
      }
    }
    return best;
  });

  // bare paper: a point with no piece under it and no chrome over it
  const barePoint = () => page.evaluate(() => {
    const b = Lab.bench.getBoundingClientRect();
    const mx = b.left + b.width / 2, my = b.top + b.height / 2;
    let best = null, bestD = Infinity;
    for (let y = b.top + 60; y < b.bottom - 150; y += 9) {
      for (let x = b.left + 24; x < b.right - 24; x += 9) {
        const el = document.elementFromPoint(x, y);
        if (!el || !el.closest) continue;
        if (!Lab.bench.contains(el)) continue;         // the docks stand over the bench, not in it
        if (el.closest('.wall-item') || el.closest('.wall-note')) continue;
        const d = Math.hypot(x - mx, y - my);
        if (d < bestD) { bestD = d; best = { x: x, y: y }; }
      }
    }
    return best;
  });

  async function drag(p0, p1, steps) {
    steps = steps || 10;
    await send('touchStart', [P(1, p0.x, p0.y)]);
    await page.waitForTimeout(40);
    for (let i = 1; i <= steps; i++) {
      await send('touchMove', [P(1, lerp(p0.x, p1.x, i / steps), lerp(p0.y, p1.y, i / steps))]);
      await page.waitForTimeout(16);
    }
    await frames();
    await send('touchEnd', []);
    await page.waitForTimeout(100);
  }

  async function tap(p, hold) {
    await send('touchStart', [P(1, p.x, p.y)]);
    await page.waitForTimeout(hold || 60);
    await send('touchEnd', []);
    await page.waitForTimeout(200);
  }

  /* TWO FINGERS, the first landing a moment before the second — which is the
     whole hazard: by the time the second arrives, the first is already holding
     whatever it came down on. */
  async function two(g, opts) {
    opts = opts || {};
    const steps = opts.steps || 10;
    const a0 = fit(g.a0), b0 = fit(g.b0), a1 = fit(g.a1), b1 = fit(g.b1);
    await send('touchStart', [P(1, a0.x, a0.y)]);
    await page.waitForTimeout(opts.first == null ? 70 : opts.first);
    await send('touchStart', [P(1, a0.x, a0.y), P(2, b0.x, b0.y)]);
    await page.waitForTimeout(20);
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      await send('touchMove', [P(1, lerp(a0.x, a1.x, t), lerp(a0.y, a1.y, t)),
                               P(2, lerp(b0.x, b1.x, t), lerp(b0.y, b1.y, t))]);
      await page.waitForTimeout(16);
    }
    await frames();
    if (opts.mid) await opts.mid();
    if (!opts.keepDown) { await send('touchEnd', []); await page.waitForTimeout(100); }
  }

  // ── the bench, opened on the shipped wall ─────────────────────────────────
  await page.goto(URL, { waitUntil: 'load' });
  await page.waitForFunction(() => window.Seed && window.Wall && window.Lab && localStorage.getItem('knoll-ironhive:seeded') != null, null, { timeout: 20000 });
  await page.waitForTimeout(1800);
  let s = await state();
  const seedCam = await cam();
  safe = await measure();
  console.log('\nthe bench: ' + s.n + ' pieces, ' + s.drawn + ' painted, zoom ' + s.z.toFixed(4) + ', phone 412 × 915');
  say(s.n > 100 && s.drawn > 50, 'the shipped wall is under the fingers', s.n + ' pieces');
  say((await barePoint()) === null, 'and it covers the screen — there is no bare paper to pan from, which is the report',
      'every point of the bench answers a piece');

  // ── 0 · what CDP does when one of two fingers is lifted ───────────────────
  console.log('\n0 · the protocol: lifting one of two');
  let keeps = null;
  await emptyView();
  {
    const g = rig(await barePoint(), { x: 40, y: 0 }, { x: 50, y: 0 });
    await send('touchStart', [P(1, g.a0.x, g.a0.y)]);
    await page.waitForTimeout(40);
    await send('touchStart', [P(1, g.a0.x, g.a0.y), P(2, g.b0.x, g.b0.y)]);
    await page.waitForTimeout(40);
    await send('touchEnd', [P(1, g.a0.x, g.a0.y)]);      // 1 is NAMED: kept, or released?
    await page.waitForTimeout(40);
    const before = await state();
    await send('touchMove', [P(1, g.a1.x, g.a1.y)]);
    await page.waitForTimeout(80);
    await frames();
    const after = await state();
    keeps = Math.abs(after.cx - before.cx) > 1;
    await send('touchEnd', []);
    await page.waitForTimeout(100);
    say(before.pinching === true, 'one of the two still holds the sheet after the other goes', 'Lab.pinching ' + before.pinching);
    console.log('         (a touchEnd lists the points it KEEPS in this Chrome: ' + (keeps ? 'yes' : 'no — it lists the ones it releases') + ')');
  }

  // ── 1 · one finger still moves a piece ────────────────────────────────────
  console.log('\n1 · one finger, as it always was');
  await setCam(seedCam);
  await page.evaluate(() => Wall.clearPick());
  let ink = await inkPoint();
  say(!!ink, 'a point on a piece\'s own ink', ink && JSON.stringify(ink));
  const g1 = rig1(ink, { x: 55, y: 35 });
  let was = await item(ink.i), cam0 = await state();
  await drag(g1.a0, g1.a1);
  let now = await item(ink.i), cam1 = await state();
  const moved = Math.hypot((now.x || 0) - (was.x || 0), (now.y || 0) - (was.y || 0));
  say(JSON.stringify(now) !== JSON.stringify(was) && moved > 10, 'the piece went with the finger', 'piece ' + ink.i + ' (' + ink.k + ') moved ' + moved.toFixed(1) + ' world px');
  say(near(cam1.cx, cam0.cx, 1) && near(cam1.cy, cam0.cy, 1) && near(cam1.z, cam0.z, 1e-6), 'and the camera held still under it', 'centre ' + cam1.cx.toFixed(1) + ',' + cam1.cy.toFixed(1));
  await page.evaluate(() => Wall.undo());            // the wall back the way it shipped
  await page.waitForTimeout(200);
  say(JSON.stringify(await item(ink.i)) === JSON.stringify(was), 'and one undo puts it back', 'piece ' + ink.i);

  // ── 2 · two fingers pan, and take the press back ──────────────────────────
  console.log('\n2 · two fingers: the sheet moves, the piece does not');
  await setCam(seedCam);
  await page.evaluate(() => Wall.clearPick());
  ink = await inkPoint();
  const g2 = rig(ink, { x: 80, y: 95 }, { x: 65, y: 75 });
  say(!!g2, 'two fingers and a shove that fit on the bench', g2 && JSON.stringify(g2.d));
  const before2 = await state();
  let midState = null;
  await two(g2, { mid: async () => { midState = await state(); } });
  const after2 = await state();
  say(midState.pinching === true && midState.panning === true, 'mid-gesture the camera is in two fingers', 'pinching ' + midState.pinching + ', body.lab-panning ' + midState.panning);
  say(midState.picked === 0, 'and the crop marks the first finger flashed up are put back', midState.picked + ' picked');
  say(after2.items === before2.items, 'NOTHING ON THE PAPER CHANGED — not one byte of the store', after2.n + ' pieces, ' + after2.slots + ' slots');
  say(near(after2.z, before2.z, before2.z * 0.02), 'the zoom is where it was — this was a pan', before2.z.toFixed(4) + ' → ' + after2.z.toFixed(4));
  say(near(after2.cx - before2.cx, -g2.d.x / before2.z, 8) && near(after2.cy - before2.cy, -g2.d.y / before2.z, 8),
      'and the sheet came with the hand', 'moved ' + (after2.cx - before2.cx).toFixed(1) + ',' + (after2.cy - before2.cy).toFixed(1) +
      ' world px, wanted ' + (-g2.d.x / before2.z).toFixed(1) + ',' + (-g2.d.y / before2.z).toFixed(1));
  say(after2.notes === 0 && after2.films === 0 && after2.pinching === false && after2.panning === false,
      'and nothing was left behind or left holding', JSON.stringify({ notes: after2.notes, films: after2.films, pinching: after2.pinching, panning: after2.panning }));

  // ── 3 · a pinch out, and 4 · back in ──────────────────────────────────────
  const pinchBy = async (k) => {
    const c = fit(await page.evaluate(() => { const b = Lab.bench.getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 - 40 }; }));
    const before = await state();
    const span0 = 70, span1 = span0 * k;
    const anchor = await world(c.x, c.y);
    await two({ a0: { x: c.x - span0, y: c.y }, b0: { x: c.x + span0, y: c.y },
                a1: { x: c.x - span1, y: c.y }, b1: { x: c.x + span1, y: c.y } }, { steps: 12 });
    const after = await state();
    const held = await world(c.x, c.y);
    return { before: before, after: after, k: k, drift: Math.hypot(held.x - anchor.x, held.y - anchor.y) };
  };
  console.log('\n3 · pinch out');
  let r = await pinchBy(2);
  say(near(r.after.z / r.before.z, r.k, 0.15), 'the zoom followed the span of the fingers', 'z ' + r.before.z.toFixed(4) + ' → ' + r.after.z.toFixed(4) + ' (×' + (r.after.z / r.before.z).toFixed(3) + ', fingers ×' + r.k + ')');
  say(r.drift < 6, 'about the fingers\' own middle — the point under it did not wander', 'drifted ' + r.drift.toFixed(2) + ' world px');
  say(r.after.items === r.before.items, 'and the paper is untouched', r.after.n + ' pieces');

  console.log('\n4 · pinch in');
  r = await pinchBy(0.5);
  say(near(r.after.z / r.before.z, r.k, 0.08), 'the zoom came back down by the same rule', 'z ' + r.before.z.toFixed(4) + ' → ' + r.after.z.toFixed(4) + ' (×' + (r.after.z / r.before.z).toFixed(3) + ')');
  say(r.drift < 6, 'still about the middle of the two', 'drifted ' + r.drift.toFixed(2) + ' world px');
  say(r.after.items === r.before.items, 'and the paper is untouched', r.after.n + ' pieces');

  // ── 5 · one of the two lifts ──────────────────────────────────────────────
  console.log('\n5 · lift one, the other keeps the sheet');
  await emptyView();
  {
    const g = rig(await barePoint(), { x: 50, y: 0 }, { x: 60, y: 0 });
    await two({ a0: g.a0, b0: g.b0, a1: g.a0, b1: g.b0 }, { steps: 2, keepDown: true });
    // the point this Chrome keeps (established in 0) is the one that pans on
    const id = keeps ? 1 : 2, p = keeps ? g.a0 : g.b0;
    await send('touchEnd', [P(1, g.a0.x, g.a0.y)]);
    await page.waitForTimeout(60);
    const mid = await state();
    const to = fit({ x: p.x + g.d.x, y: p.y + g.d.y });
    const shove = to.x - p.x;
    for (let i = 1; i <= 8; i++) { await send('touchMove', [P(id, p.x + shove * i / 8, p.y)]); await page.waitForTimeout(16); }
    await frames();
    const after = await state();
    await send('touchEnd', []);
    await page.waitForTimeout(150);
    const done = await state();
    say(mid.pinching === true, 'with one finger down the camera is still held', 'pinching ' + mid.pinching);
    say(near(after.cx - mid.cx, -shove / mid.z, 10), 'and it pans with the finger that is left', 'moved ' + (after.cx - mid.cx).toFixed(1) + ', wanted ' + (-shove / mid.z).toFixed(1));
    say(near(after.z, mid.z, 1e-6), 'without changing the zoom — one finger spans nothing', 'z ' + after.z.toFixed(5));
    say(done.pinching === false && done.panning === false, 'and the last finger up ends the gesture', JSON.stringify({ pinching: done.pinching, panning: done.panning }));
  }

  // ── 6 · the pen ───────────────────────────────────────────────────────────
  console.log('\n6 · the pen');
  {
    await emptyView();
    await page.evaluate(() => Wall.setTool('draw'));
    await page.waitForTimeout(150);
    const bare = await barePoint();
    const one = rig1(bare, { x: 60, y: 40 });
    const before = await state();
    await drag(one.a0, one.a1, 8);                                  // one finger: a line
    const drew = await state();
    say(drew.slots === before.slots + 1, 'one finger draws, as it always did', before.slots + ' → ' + drew.slots + ' slots');
    await page.evaluate(() => Wall.undo());
    await page.waitForTimeout(200);
    const back = await state();
    const g = rig(bare, { x: 70, y: 70 }, { x: 50, y: 45 });
    await two(g, { first: 150, steps: 8 });
    const after = await state();
    say(after.slots === back.slots && after.items === back.items, 'a second finger takes the whole stroke back — dot and all', back.slots + ' slots before, ' + after.slots + ' after');
    say(after.drawn === back.drawn, 'and no line is left hanging on the glass', back.drawn + ' painted, still ' + after.drawn);
    say(Math.hypot(after.cx - back.cx, after.cy - back.cy) > 20, 'the gesture was a pan, which is what the fingers meant', 'moved ' + Math.hypot(after.cx - back.cx, after.cy - back.cy).toFixed(1) + ' world px');
    await page.evaluate(() => Wall.setTool('move'));
    await page.waitForTimeout(120);
  }

  // ── 7 · the sticker tool ──────────────────────────────────────────────────
  console.log('\n7 · the sticker tool');
  {
    await emptyView();
    const armed = await page.evaluate(() => {
      const it = Wall.store.get().items.find(v => v && v.k === 'd');
      if (!it || !window.Stickers) return null;
      Wall.setTool('sticker');
      Stickers.arm(it.f);
      return Stickers.armed() ? it.f : null;
    });
    await page.waitForTimeout(200);
    say(!!armed, 'a sticker on the pointer, out of the drawer\'s own catalogue', armed);
    const bare = await barePoint();
    const before = await state();
    await tap(bare, 70);
    const tapped = await state();
    say(tapped.slots === before.slots + 1, 'a tap stamps one where the finger went down', before.slots + ' → ' + tapped.slots + ' slots');
    await page.evaluate(() => Wall.undo());
    await page.waitForTimeout(200);
    const back = await state();
    await two(rig(bare, { x: 80, y: 60 }, { x: 50, y: 45 }), { steps: 8 });
    const after = await state();
    say(after.slots === back.slots && after.items === back.items, 'a pinch stamps nothing at all', back.slots + ' slots before, ' + after.slots + ' after');
    await page.evaluate(() => Wall.setTool('move'));
    await page.waitForTimeout(120);
  }

  // ── 8 · the text tool ─────────────────────────────────────────────────────
  console.log('\n8 · the text tool');
  {
    await emptyView();
    await page.evaluate(() => Wall.setTool('text'));
    await page.waitForTimeout(150);
    const bare = await barePoint();
    await two(rig(bare, { x: 70, y: 50 }, { x: 45, y: 40 }), { steps: 8 });
    const pinched = await state();
    say(pinched.notes === 0, 'a pinch opens no note box', pinched.notes + ' boxes');
    await tap(await barePoint(), 70);
    const tapped = await state();
    say(tapped.notes === 1, 'and a tap opens one', tapped.notes + ' box');
    await page.keyboard.press('Escape');              // thrown away, not pinned
    await page.waitForTimeout(200);
    const shut = await state();
    say(shut.notes === 0 && shut.slots === tapped.slots, 'escape throws it away again', shut.notes + ' boxes, ' + shut.slots + ' slots');
    await page.evaluate(() => Wall.setTool('move'));
    await page.waitForTimeout(120);
  }

  // ── 9 · the play badge ────────────────────────────────────────────────────
  console.log('\n9 · the film');
  await setCam(seedCam);
  {
    const badge = await page.evaluate(() => {
      const n = document.querySelector('.wall-play');
      if (!n) return null;
      const r = n.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: Math.round(r.width) };
    });
    const g = badge && inSafe(badge) && rig(badge, { x: 80, y: 70 }, { x: 45, y: 50 });
    if (!g) {
      skip('no play badge within reach at this framing — ' + JSON.stringify(badge));
    } else {
      await two(g, { steps: 8 });
      const pinched = await state();
      say(pinched.films === 0, 'a pinch that starts on the badge starts no film', pinched.films + ' players');
      await setCam(seedCam);
      const again = await page.evaluate(() => { const n = document.querySelector('.wall-play'); if (!n) return null; const r = n.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
      await tap(again, 70);
      const tapped = await state();
      say(tapped.films === 1, 'and a tap on it does', tapped.films + ' player');
      await page.keyboard.press('Escape');
      await page.waitForTimeout(250);
      say((await state()).films === 0, 'escape stops it again', 'players 0');
    }
  }

  // ── 10 · the scale corner ─────────────────────────────────────────────────
  console.log('\n10 · the corner');
  await setCam(seedCam);
  {
    await page.evaluate(() => Wall.clearPick());
    const p = await inkPoint();
    await tap(p, 70);                                 // a press picks it; the corner is drawn for a pick of one
    await page.waitForTimeout(250);
    const corner = await page.evaluate(() => {
      const n = document.querySelector('.wall-scale');
      if (!n) return null;
      const r = n.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2, i: +n.dataset.i };
    });
    const g = corner && inSafe(corner) && rig(corner, { x: 90, y: 90 }, { x: 60, y: 60 });
    if (!g) {
      skip('no scale corner within reach for piece ' + p.i + ' — ' + JSON.stringify(corner));
    } else {
      const wasIt = await item(corner.i);
      await two(g, { steps: 8 });
      const nowIt = await item(corner.i);
      say(JSON.stringify(nowIt) === JSON.stringify(wasIt), 'a pinch off the scale corner leaves the piece exactly as it was', 'z ' + wasIt.z + ' → ' + nowIt.z);
    }
    await page.evaluate(() => Wall.clearPick());
  }

  // ── 11 · nothing is left holding anything ─────────────────────────────────
  console.log('\n11 · afterwards');
  await setCam(seedCam);
  {
    const p = await inkPoint();
    const one = rig1(p, { x: 50, y: 30 });
    const was2 = await item(p.i);
    const before = await state();
    await drag(one.a0, one.a1);
    const now2 = await item(p.i);
    const after = await state();
    say(JSON.stringify(now2) !== JSON.stringify(was2), 'one finger drags a piece again — the bench is not stuck in a gesture', 'piece ' + p.i + ' (' + p.k + ')');
    say(near(after.cx, before.cx, 1) && near(after.cy, before.cy, 1), 'and the camera is still the two fingers\' business alone', 'centre held');
    await page.evaluate(() => Wall.undo());
    await page.waitForTimeout(200);
    const end = await state();
    say(end.pinching === false && end.panning === false, 'no pinch left open, no class left on the body', JSON.stringify({ pinching: end.pinching, panning: end.panning }));
  }

  say(errors.length === 0, 'no page errors anywhere in the run', errors.length ? errors.join(' | ') : '0');
  /* AND NOT ONE GESTURE WAS BENT TO FIT. Every finger above went down where
     the check meant it to: no point was clamped at the edge of the bench, so
     no rigid pan was quietly turned into a pinch. */
  say(deformed === 0, 'every gesture fitted on the bench — none was clamped and quietly deformed', deformed + ' clamped points');
  await setCam(seedCam);
  await page.screenshot({ path: path.join(__dirname, 'results', 'touch-phone.png') }).catch(() => {});

  console.log('\n' + (fails ? fails + ' FAIL' : 'all PASS'));
  await browser.close();
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
