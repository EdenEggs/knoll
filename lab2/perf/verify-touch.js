/* lab2/perf/verify-touch.js — two fingers are the camera (2026-09-11).

   Ported from the iron hive (ironhive/probe-touch.js, a6bc99a), where the
   report came from: "on mobile I can't move around; holding and dragging just
   moved assets". Lab 2 has the same lineage and the same hole — every pan it
   offers is a mouse's, and one finger only pans where nothing else wants the
   press, which on a bench covered in machines is almost nowhere.

   What lab 2 has that the hive does not is FEATURES, so the press a pinch has
   to take back is a third one: the feature drag in lab.js (carrying), beside
   the wall's and the tape's, and the resize corner in frames.js.

     0   which touch points the protocol KEEPS when one of two is lifted (a
         fact about this Chrome, established rather than assumed)
     1   ONE finger still drags a feature, and the camera holds still
     2   TWO fingers pan; the feature the first one landed on does not move —
         not on the paper and not in what was saved for it
     3   a pinch out zooms by the ratio of the spans, about the fingers' own
         middle, and the world point there does not wander
     4   …and a pinch in does the same going the other way
     5   lift one of the two and the sheet stays with the one still down
     6   the pen: one finger draws; a second finger takes the stroke back
     7   the text tool: a tap opens a note, a pinch opens none
     8   nothing is left holding anything afterwards

   USAGE (from site/): node lab2/perf/verify-touch.js — with serve.js up. */
const path = require('path');
const { chromium } = require('playwright');

let fails = 0, deformed = 0;
const say = (ok, what, extra) => { if (!ok) fails++; console.log((ok ? 'PASS ' : 'FAIL ') + what + (extra == null ? '' : ' — ' + extra)); };
const URL = 'http://localhost:4321/lab2/';
const lerp = (a, b, t) => a + (b - a) * t;
const near = (a, b, slop) => Math.abs(a - b) <= slop;

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: false,
    args: ['--window-size=960,1000', '--window-position=0,0'] });
  /* a touch screen, but not a phone: lab 2's dock does not wrap the way the
     hive's does, and what is under test is the gesture, not the layout */
  const ctx = await browser.newContext({ viewport: { width: 900, height: 900 }, deviceScaleFactor: 1, hasTouch: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => { errors.push(String(e)); console.log('PAGEERROR', String(e)); });
  // the layout door stays shut: this probe must never write the bench's file
  await page.route('**/_lab2/default', r => r.fulfill({ status: 404, body: 'no door' }));

  const cdp = await ctx.newCDPSession(page);
  const P = (id, x, y) => ({ x: Math.round(x), y: Math.round(y), id: id, radiusX: 10, radiusY: 10, force: 1, rotationAngle: 0 });
  const send = (type, points) => cdp.send('Input.dispatchTouchEvent', { type: type, touchPoints: points });
  const frames = () => page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));

  const state = () => page.evaluate(() => {
    const b = Lab.bench.getBoundingClientRect();
    const c = Lab.toWorld(b.left + b.width / 2, b.top + b.height / 2);
    const st = Wall.store.get();
    return { z: Lab.zoom, cx: c.x, cy: c.y, slots: st.items.length, items: JSON.stringify(st.items),
             pinching: Lab.pinching, panning: document.body.classList.contains('lab-panning'),
             notes: document.querySelectorAll('.wall-note').length };
  });
  const world = (x, y) => page.evaluate(([x, y]) => { const w = Lab.toWorld(x, y); return { x: w.x, y: w.y }; }, [x, y]);
  const cam = () => page.evaluate(() => ({ z: Lab.zoom, x: Lab.pan.x, y: Lab.pan.y }));
  const setCam = c => page.evaluate(c => Lab.camTo(c.z, c.x, c.y, 0), c).then(() => page.waitForTimeout(250));
  const emptyView = () => page.evaluate(() => Lab.camTo(Lab.zoom, -1e5, -1e5, 0)).then(() => page.waitForTimeout(250));

  /* WHERE A FEATURE IS, and what is remembered about it. The saved position is
     the honest half of check 2: the paper can be put back by a repaint, but a
     pinch that had written to localStorage would show up here. */
  const feature = () => page.evaluate(() => {
    const b = Lab.bench.getBoundingClientRect();
    const mx = b.left + b.width / 2, my = b.top + b.height / 2;
    let best = null, bestD = Infinity;
    document.querySelectorAll('#bench .gz[data-gizmo]').forEach(el => {
      if (el.hidden) return;
      const r = el.getBoundingClientRect();
      if (r.width < 60 || r.height < 60) return;
      const x = r.left + r.width / 2, y = r.top + r.height / 2;
      if (x < b.left + 80 || x > b.right - 80 || y < b.top + 80 || y > b.bottom - 200) return;
      const d = Math.hypot(x - mx, y - my);
      if (d < bestD) { bestD = d; best = { id: el.dataset.gizmo, x: x, y: y }; }
    });
    return best;
  });
  const where = id => page.evaluate(id => {
    const el = document.querySelector('.gz[data-gizmo="' + id + '"]');
    let saved = null; try { saved = localStorage.getItem('knoll-lab2:pos:' + id); } catch (e) {}
    return { left: el.style.left, top: el.style.top, saved: saved };
  }, id);

  let safe = null;
  const inSafe = p => !!p && p.x >= safe.l && p.x <= safe.r && p.y >= safe.t && p.y <= safe.b;
  const fit = p => {
    const q = { x: Math.max(safe.l, Math.min(safe.r, p.x)), y: Math.max(safe.t, Math.min(safe.b, p.y)) };
    if (Math.abs(q.x - p.x) > 0.5 || Math.abs(q.y - p.y) > 0.5) deformed++;
    return q;
  };
  /* A GESTURE THAT FITS ON THE BENCH. The shove is the SAME vector for both
     fingers, so the span between them is exactly unchanged and a pan is a pan.
     Clamping a stray point instead is what turned the hive's first check 2
     into a pinch nobody asked for, and it reported a zoom the code never did. */
  function rig(a0, apart, shove) {
    for (const s1 of [1, -1]) for (const s2 of [1, -1]) {
      const b0 = { x: a0.x + apart.x * s1, y: a0.y + apart.y * s1 };
      const d = { x: shove.x * s2, y: shove.y * s2 };
      const a1 = { x: a0.x + d.x, y: a0.y + d.y }, b1 = { x: b0.x + d.x, y: b0.y + d.y };
      if (inSafe(a0) && inSafe(b0) && inSafe(a1) && inSafe(b1)) return { a0: a0, b0: b0, a1: a1, b1: b1, d: d };
    }
    return null;
  }
  function rig1(a0, shove) {
    for (const s of [1, -1]) {
      const d = { x: shove.x * s, y: shove.y * s };
      const a1 = { x: a0.x + d.x, y: a0.y + d.y };
      if (inSafe(a0) && inSafe(a1)) return { a0: a0, a1: a1, d: d };
    }
    return null;
  }
  const barePoint = () => page.evaluate(() => {
    const b = Lab.bench.getBoundingClientRect();
    for (let y = b.top + 80; y < b.bottom - 200; y += 9)
      for (let x = b.left + 40; x < b.right - 40; x += 9) {
        const el = document.elementFromPoint(x, y);
        if (!el || !el.closest) continue;
        if (!Lab.bench.contains(el)) continue;
        if (el.closest('.gz') || el.closest('.wall-item') || el.closest('.wall-note') || el.closest('.tape')) continue;
        return { x: x, y: y };
      }
    return null;
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
    await page.waitForTimeout(150);
  }
  async function tap(p, hold) {
    await send('touchStart', [P(1, p.x, p.y)]);
    await page.waitForTimeout(hold || 60);
    await send('touchEnd', []);
    await page.waitForTimeout(220);
  }
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
    if (!opts.keepDown) { await send('touchEnd', []); await page.waitForTimeout(150); }
  }

  // ── the bench ─────────────────────────────────────────────────────────────
  await page.goto(URL, { waitUntil: 'load' });
  await page.waitForFunction(() => window.Lab && window.Wall && document.querySelectorAll('#bench .gz[data-gizmo]').length > 0, null, { timeout: 30000 });
  await page.waitForTimeout(3000);
  const homeCam = await cam();
  safe = await page.evaluate(() => {
    const b = Lab.bench.getBoundingClientRect();
    const d = document.getElementById('tool-dock').getBoundingClientRect();
    return { l: b.left + 30, r: b.right - 30, t: b.top + 60, b: Math.min(b.bottom, d.top) - 30 };
  });
  const gz = await feature();
  say(!!gz, 'a feature under the fingers', gz && gz.id);

  // ── 0 · the protocol ──────────────────────────────────────────────────────
  console.log('\n0 · the protocol: lifting one of two');
  let keeps = null;
  await emptyView();
  {
    const g = rig(await barePoint(), { x: 40, y: 0 }, { x: 50, y: 0 });
    await send('touchStart', [P(1, g.a0.x, g.a0.y)]);
    await page.waitForTimeout(40);
    await send('touchStart', [P(1, g.a0.x, g.a0.y), P(2, g.b0.x, g.b0.y)]);
    await page.waitForTimeout(40);
    await send('touchEnd', [P(1, g.a0.x, g.a0.y)]);
    await page.waitForTimeout(40);
    const before = await state();
    await send('touchMove', [P(1, g.a1.x, g.a1.y)]);
    await page.waitForTimeout(80);
    await frames();
    const after = await state();
    keeps = Math.abs(after.cx - before.cx) > 1;
    await send('touchEnd', []);
    await page.waitForTimeout(120);
    say(before.pinching === true, 'one of the two still holds the sheet after the other goes', 'Lab.pinching ' + before.pinching);
    console.log('     (a touchEnd lists the points it KEEPS in this Chrome: ' + (keeps ? 'yes' : 'no — it lists the ones it releases') + ')');
  }
  await setCam(homeCam);

  /* ── 1 · one finger, as it always was ─────────────────────────────────────
     AND ON LAB 2 THAT IS A PAN, EVEN OVER A MACHINE — which is not the hive's
     answer and is not a fault. lab.js's HANDS_OFF names controls, handles and
     lists, and a feature is none of the three: "a finger has no middle button
     and no space bar, so it gets more of the bench to drag". The camera's
     capture handler arms before the feature's own pointerdown and livePan then
     swallows the moves, so the sheet slides and the machine stands still. The
     hive could not do this because its paper is wall ink, which IS named in
     that list. So what this check is for is that the pinch did not change it. */
  console.log('\n1 · one finger, as it always was');
  {
    const p = await feature();
    const one = rig1(p, { x: 60, y: 45 });
    const was = await where(p.id), c0 = await state();
    await drag(one.a0, one.a1);
    const now = await where(p.id), c1 = await state();
    say(near(c1.cx - c0.cx, -one.d.x / c0.z, 8) && near(c1.cy - c0.cy, -one.d.y / c0.z, 8),
        'one finger pans the sheet, as it always did on a touch screen',
        'moved ' + (c1.cx - c0.cx).toFixed(1) + ',' + (c1.cy - c0.cy).toFixed(1) +
        ', wanted ' + (-one.d.x / c0.z).toFixed(1) + ',' + (-one.d.y / c0.z).toFixed(1));
    say(now.left === was.left && now.top === was.top, 'and the machine it passed over stands still', was.left + ',' + was.top);
  }

  // ── 2 · two fingers pan, and take the press back ──────────────────────────
  console.log('\n2 · two fingers: the sheet moves, the feature does not');
  await setCam(homeCam);
  {
    const p = await feature();
    const g = rig(p, { x: 90, y: 100 }, { x: 70, y: 80 });
    say(!!g, 'two fingers and a shove that fit on the bench', g && JSON.stringify(g.d));
    const was = await where(p.id), before = await state();
    let mid = null;
    await two(g, { mid: async () => { mid = await state(); } });
    const now = await where(p.id), after = await state();
    say(mid.pinching === true && mid.panning === true, 'mid-gesture the camera is in two fingers', 'pinching ' + mid.pinching + ', body.lab-panning ' + mid.panning);
    say(now.left === was.left && now.top === was.top, 'THE FEATURE DID NOT MOVE', was.left + ',' + was.top);
    say(now.saved === was.saved, 'and nothing was saved for it either', String(was.saved));
    say(after.items === before.items, 'nor was anything written to the wall', after.slots + ' slots');
    say(near(after.z, before.z, before.z * 0.02), 'the zoom is where it was — this was a pan', before.z.toFixed(4) + ' → ' + after.z.toFixed(4));
    say(near(after.cx - before.cx, -g.d.x / before.z, 8) && near(after.cy - before.cy, -g.d.y / before.z, 8),
        'and the sheet came with the hand', 'moved ' + (after.cx - before.cx).toFixed(1) + ',' + (after.cy - before.cy).toFixed(1) +
        ', wanted ' + (-g.d.x / before.z).toFixed(1) + ',' + (-g.d.y / before.z).toFixed(1));
  }

  // ── 3 · out, and 4 · in ───────────────────────────────────────────────────
  const pinchBy = async (k) => {
    const c = fit(await page.evaluate(() => { const b = Lab.bench.getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 - 40 }; }));
    const before = await state();
    const span0 = 90, span1 = span0 * k;
    const anchor = await world(c.x, c.y);
    await two({ a0: { x: c.x - span0, y: c.y }, b0: { x: c.x + span0, y: c.y },
                a1: { x: c.x - span1, y: c.y }, b1: { x: c.x + span1, y: c.y } }, { steps: 12 });
    const after = await state();
    const held = await world(c.x, c.y);
    return { before: before, after: after, k: k, drift: Math.hypot(held.x - anchor.x, held.y - anchor.y) };
  };
  console.log('\n3 · pinch out');
  let r = await pinchBy(2);
  say(near(r.after.z / r.before.z, r.k, 0.15), 'the zoom followed the span of the fingers', 'z ' + r.before.z.toFixed(4) + ' → ' + r.after.z.toFixed(4) + ' (×' + (r.after.z / r.before.z).toFixed(3) + ')');
  say(r.drift < 8, 'about the fingers\' own middle', 'drifted ' + r.drift.toFixed(2) + ' world px');
  console.log('\n4 · pinch in');
  r = await pinchBy(0.5);
  say(near(r.after.z / r.before.z, r.k, 0.08), 'the zoom came back down by the same rule', 'z ' + r.before.z.toFixed(4) + ' → ' + r.after.z.toFixed(4) + ' (×' + (r.after.z / r.before.z).toFixed(3) + ')');
  say(r.drift < 8, 'still about the middle of the two', 'drifted ' + r.drift.toFixed(2) + ' world px');

  // ── 5 · one of the two lifts ──────────────────────────────────────────────
  console.log('\n5 · lift one, the other keeps the sheet');
  await emptyView();
  {
    const g = rig(await barePoint(), { x: 60, y: 0 }, { x: 70, y: 0 });
    await two({ a0: g.a0, b0: g.b0, a1: g.a0, b1: g.b0 }, { steps: 2, keepDown: true });
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
    await page.waitForTimeout(200);
    const bare = await barePoint();
    const one = rig1(bare, { x: 70, y: 50 });
    const before = await state();
    await drag(one.a0, one.a1, 8);
    const drew = await state();
    say(drew.slots === before.slots + 1, 'one finger draws, as it always did', before.slots + ' → ' + drew.slots + ' slots');
    await page.evaluate(() => Wall.undo());
    await page.waitForTimeout(250);
    const back = await state();
    await two(rig(bare, { x: 80, y: 70 }, { x: 55, y: 50 }), { first: 150, steps: 8 });
    const after = await state();
    say(after.slots === back.slots && after.items === back.items, 'a second finger takes the whole stroke back — dot and all', back.slots + ' slots before, ' + after.slots + ' after');
    say(Math.hypot(after.cx - back.cx, after.cy - back.cy) > 20, 'and the gesture was a pan, which is what the fingers meant', 'moved ' + Math.hypot(after.cx - back.cx, after.cy - back.cy).toFixed(1) + ' world px');
    await page.evaluate(() => Wall.setTool('move'));
    await page.waitForTimeout(150);
  }

  // ── 7 · the text tool ─────────────────────────────────────────────────────
  console.log('\n7 · the text tool');
  {
    await emptyView();
    await page.evaluate(() => Wall.setTool('text'));
    await page.waitForTimeout(200);
    const bare = await barePoint();
    await two(rig(bare, { x: 70, y: 60 }, { x: 50, y: 45 }), { steps: 8 });
    say((await state()).notes === 0, 'a pinch opens no note box', '0 boxes');
    await tap(await barePoint(), 70);
    const tapped = await state();
    say(tapped.notes === 1, 'and a tap opens one', tapped.notes + ' box');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(250);
    const shut = await state();
    say(shut.notes === 0 && shut.slots === tapped.slots, 'escape throws it away again', shut.notes + ' boxes, ' + shut.slots + ' slots');
    await page.evaluate(() => Wall.setTool('move'));
    await page.waitForTimeout(150);
  }

  // ── 8 · afterwards ────────────────────────────────────────────────────────
  console.log('\n8 · afterwards');
  await setCam(homeCam);
  {
    const p = await feature();
    const one = rig1(p, { x: 55, y: 40 });
    const was = await where(p.id), c0 = await state();
    await drag(one.a0, one.a1);
    const now = await where(p.id), c1 = await state();
    say(Math.hypot(c1.cx - c0.cx, c1.cy - c0.cy) > 20 && now.left === was.left && now.top === was.top,
        'a one-finger drag still pans — the bench is not stuck in a gesture',
        'moved ' + Math.hypot(c1.cx - c0.cx, c1.cy - c0.cy).toFixed(1) + ' world px, ' + p.id + ' stood still');
    const end = await state();
    say(end.pinching === false && end.panning === false, 'no pinch left open, no class left on the body', JSON.stringify({ pinching: end.pinching, panning: end.panning }));
  }

  /* ── 9 · AND THE MOUSE IS UNTOUCHED ───────────────────────────────────────
     The three endings this change split in two — drawEnd, moveEnd and sizeEnd,
     each now a put-it-back half plus a file-it half — are the ordinary mouse
     gestures of this bench, and nothing else in lab2/perf drives them by hand
     (verify-wall builds its pieces through the store; probe-gestures asserts
     nothing at all, it only logs). So the refactor is checked here with a real
     mouse: a stroke drawn, a piece dragged, a note's width tab pulled. */
  console.log('\n9 · the mouse is untouched');
  await emptyView();
  {
    const bare = await barePoint();
    const to = { x: bare.x + 90, y: bare.y + 60 };
    await page.evaluate(() => Wall.setTool('draw'));
    await page.waitForTimeout(200);
    const before = await state();
    await page.mouse.move(bare.x, bare.y);
    await page.mouse.down();
    for (let i = 1; i <= 6; i++) { await page.mouse.move(lerp(bare.x, to.x, i / 6), lerp(bare.y, to.y, i / 6)); await page.waitForTimeout(16); }
    await page.mouse.up();
    await page.waitForTimeout(250);
    const drew = await state();
    say(drew.slots === before.slots + 1, 'a stroke drawn with the mouse is still filed', before.slots + ' → ' + drew.slots + ' slots');

    await page.evaluate(() => Wall.setTool('move'));
    await page.waitForTimeout(200);
    // a point where that stroke's own ink answers the pointer
    const on = await page.evaluate(([a, b]) => {
      for (let t = 0.15; t < 0.9; t += 0.03) {
        const x = Math.round(a.x + (b.x - a.x) * t), y = Math.round(a.y + (b.y - a.y) * t);
        for (let dx = -3; dx <= 3; dx++) for (let dy = -3; dy <= 3; dy++) {
          const el = document.elementFromPoint(x + dx, y + dy);
          if (el && el.closest && el.closest('.wall-item')) return { x: x + dx, y: y + dy };
        }
      }
      return null;
    }, [bare, to]);
    if (!on) {
      say(false, 'a point on the drawn stroke to press', 'not found');
    } else {
      const was = await page.evaluate(() => JSON.stringify(Wall.store.get().items.slice(-1)));
      await page.mouse.move(on.x, on.y);
      await page.mouse.down();
      for (let i = 1; i <= 6; i++) { await page.mouse.move(on.x + 8 * i, on.y + 6 * i); await page.waitForTimeout(16); }
      await page.mouse.up();
      await page.waitForTimeout(250);
      const now = await page.evaluate(() => JSON.stringify(Wall.store.get().items.slice(-1)));
      say(now !== was, 'a piece dragged with the mouse still moves and is still filed', 'the stroke changed');
      await page.evaluate(() => Wall.undo());
      await page.waitForTimeout(250);
      say((await page.evaluate(() => JSON.stringify(Wall.store.get().items.slice(-1)))) === was, 'and one undo puts it back', 'byte for byte');
    }
    await page.evaluate(() => Wall.undo());            // …and the stroke itself comes off
    await page.waitForTimeout(250);

    /* the note's width tab, which is the only thing sizeEnd sizes on this
       bench. The note is put in through the store so the check is about the
       TAB and not about typing. */
    await page.evaluate(() => {
      const b = Lab.bench.getBoundingClientRect();
      const w = Lab.toWorld(b.left + b.width / 2, b.top + b.height / 2);
      Wall.store.update(st => { st.items.push({ k: 't', c: 0, f: 0, x: Math.round(w.x) - 100, y: Math.round(w.y), t: 'a note to pull', sz: 22, w: 200, b: 0, i: 0, u: 0, a: 0 }); });
    });
    await page.waitForTimeout(400);
    const tab = await page.evaluate(() => {
      const n = document.querySelector('.wall-grip');
      if (!n) return null;
      const r = n.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    });
    if (!tab || !inSafe(tab)) {
      say(false, 'the note\'s width tab is on screen to pull', JSON.stringify(tab));
    } else {
      const w0 = await page.evaluate(() => Wall.store.get().items[Wall.store.get().items.length - 1].w);
      await page.mouse.move(tab.x, tab.y);
      await page.mouse.down();
      for (let i = 1; i <= 8; i++) { await page.mouse.move(tab.x + 12 * i, tab.y); await page.waitForTimeout(16); }
      await page.mouse.up();
      await page.waitForTimeout(300);
      const w1 = await page.evaluate(() => Wall.store.get().items[Wall.store.get().items.length - 1].w);
      say(w1 > w0 + 20, 'the note\'s width tab still widens the box and saves it', w0 + ' → ' + w1);
    }
  }

  say(errors.length === 0, 'no page errors anywhere in the run', errors.length ? errors.join(' | ') : '0');
  say(deformed === 0, 'every gesture fitted on the bench — none was clamped and quietly deformed', deformed + ' clamped points');
  await page.screenshot({ path: path.join(__dirname, 'results', 'touch-lab2.png') }).catch(() => {});

  console.log('\n' + (fails ? fails + ' FAIL' : 'all PASS'));
  await browser.close();
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
