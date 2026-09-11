/* ironhive/probe-pick.js — the gestures added on 2026-09-08, driven for real
   rather than asserted. Real presses, real drags, real keys: the numbers this
   prints are read back out of the store after the browser has done the work.

     1   a band over bare paper gathers every sticker it touches
     2   one drag carries the whole pick, each piece by its own offset
     3   …and one ctrl+z puts all of them back
     4   a click that did not travel narrows the pick to one
     5-6 the corner scales that one, and only that one, undoably
     6b  the ring turns it, and the crop marks tilt with it
     7   shift-click adds, escape puts the pick down
     7b  a turned piece is still caught by the band — AND nothing starts a
         native drag under it, which used to cancel the pointer and kill the
         band a few pixels in (see lab.js, AND THE BROWSER'S OWN DRAG)
     7d  shift H / shift V mirror the pick about the pick's own middle — one
         piece about itself, a group about the group, and twice is a no-op
     7e  ctrl+c / ctrl+v on a group: three in, three out, still three apart
     7c  the note width tab, which shares startSize's door, still works
     8   positions, sizes and angles come back off the store after a reload

   Stamps its own stickers into a clean store first (localStorage is wiped on
   the way in) so the run says the same thing twice.

   Run with the site's serve.js already up on 4321:  node ironhive/probe-pick.js
*/
const { chromium } = require('playwright');

const say = (ok, what, extra) =>
  console.log((ok ? '  PASS  ' : '  FAIL  ') + what + (extra == null ? '' : '   ' + extra));

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: false,
    args: ['--window-size=1616,1110', '--window-position=0,0'] });
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => { errs.push(String(e)); console.log('PAGEERROR', String(e)); });
  page.on('console', m => { if (m.type() === 'error') console.log('CONSOLE', m.text()); });

  // once, on the way in — addInitScript would fire on the reload in step 8 too
  // and wipe the very store that step is there to read
  await page.goto('http://localhost:4321/ironhive/', { waitUntil: 'load' });
  await page.evaluate(() => { try { localStorage.clear(); } catch (e) {} });
  await page.reload({ waitUntil: 'load' });
  await page.waitForFunction(() => window.Lab && window.Wall && window.Stickers && Stickers.list.length > 0);
  await page.waitForTimeout(900);

  /* ── three stickers on clean paper, well apart, at a readable zoom ────── */
  const SIZE = 220;
  await page.evaluate(z => {
    Wall.store.update(st => { st.items = []; });
    Wall.setTool('move');
    Lab.setZoom(1);
    const id = Stickers.list[0].id;
    // braces matter: Lab.store's update takes a returned value as the NEW
    // state, and push() returns a length
    [[600, 420], [980, 420], [790, 700]].forEach(([x, y]) =>
      Wall.store.update(st => { st.items.push({ k: 'd', f: id, o: 0, x, y, z }); }));
    Wall.paint();
    /* centred on the BENCH, not on the window. The bench is the paper below
       the house bar, so a band anchored off the window's middle can start up
       in the header where there is nothing to drag. */
    const b = Lab.bench.getBoundingClientRect();
    const c = Lab.toScreen(790, 520);
    Lab.panBy(b.left + b.width / 2 - c.x, b.top + b.height / 2 - c.y);
  }, SIZE);
  await page.waitForTimeout(300);

  // a client point where a given sticker's OWN node answers the pointer. The
  // artwork is a chain link with a hole through the middle and svg hit-tests
  // what is painted, so the centre of one is bare paper.
  const solid = i => page.evaluate(n => {
    const it = Wall.store.get().items[n], c = Lab.toScreen(it.x, it.y);
    for (let r = 4; r < 140; r += 3) for (let a = 0; a < 360; a += 7) {
      const x = c.x + r * Math.cos(a * Math.PI / 180), y = c.y + r * Math.sin(a * Math.PI / 180);
      const el = document.elementFromPoint(x, y), w = el && el.closest && el.closest('.wall-item');
      if (w && +w.dataset.i === n) return { x, y };
    }
    return null;
  }, i);

  const pos = () => page.evaluate(() => Wall.store.get().items.map(it => it && [it.x, it.y, it.z, it.r || 0]));
  const state = () => page.evaluate(() => ({
    picked: Wall.picked,
    crops: document.querySelectorAll('.wall-crop').length,
    grips: document.querySelectorAll('.wall-scale').length,
  }));

  /* A RECTANGLE ROUND THE LOT, WORKED OUT FRESH EVERY TIME. Clipped 70px
     inside the bench at both ends, which is two things at once: the dock sits
     over the bottom of the paper and the house bar over the top of it, and
     lab.js edge-scrolls the camera whenever a band comes within 60px of the
     bench (edgeWatch, M = 60). Stopping short of that keeps the camera still
     between runs, and recomputing keeps the numbers honest if it moves. */
  const bandBox = () => page.evaluate(() => {
    const xs = [], ys = [];
    Wall.store.get().items.forEach(it => { const s = Lab.toScreen(it.x, it.y); xs.push(s.x); ys.push(s.y); });
    const b = Lab.bench.getBoundingClientRect(), M = 70;
    const lo = (v, min) => Math.max(v, min + M), hi = (v, max) => Math.min(v, max - M);
    return { x1: lo(Math.min(...xs) - 190, b.left), y1: lo(Math.min(...ys) - 150, b.top),
             x2: hi(Math.max(...xs) + 190, b.right), y2: hi(Math.max(...ys) + 150, b.bottom) };
  });
  const drawBand = async () => {
    const bx = await bandBox();
    await page.mouse.move(bx.x1, bx.y1);
    await page.mouse.down();
    for (let k = 1; k <= 8; k++)
      await page.mouse.move(bx.x1 + (bx.x2 - bx.x1) * k / 8, bx.y1 + (bx.y2 - bx.y1) * k / 8);
    await page.mouse.up();
    await page.waitForTimeout(150);
    return bx;
  };

  /* ── 1 · THE BAND ─────────────────────────────────────────────────────── */
  console.log('\n1 · drag a band over bare paper');
  const box = await drawBand();
  const bare = await page.evaluate(p => {
    const e = document.elementFromPoint(p.x1, p.y1);
    return { tag: e && e.tagName, cls: e && (e.getAttribute('class') || '') };
  }, box);
  console.log('  band from ' + Math.round(box.x1) + ',' + Math.round(box.y1) +
              ' to ' + Math.round(box.x2) + ',' + Math.round(box.y2) +
              ' — anchored on ' + bare.tag + '.' + bare.cls);
  let s = await state();
  say(s.picked === 3, 'the band picked all three', 'picked=' + s.picked);
  say(s.crops === 3, 'each picked piece wears crop marks', 'crops=' + s.crops);
  say(s.grips === 0, 'no resize corner while more than one is picked', 'grips=' + s.grips);

  /* ── 2 · ONE DRAG CARRIES THE PICK ────────────────────────────────────── */
  console.log('\n2 · drag any one of them');
  const before = await pos();
  const grip0 = await solid(0);
  const DX = 260, DY = -120;
  await page.mouse.move(grip0.x, grip0.y);
  await page.mouse.down();
  for (let k = 1; k <= 10; k++) await page.mouse.move(grip0.x + DX * k / 10, grip0.y + DY * k / 10);
  await page.mouse.up();
  await page.waitForTimeout(150);
  let after = await pos();
  const moved = before.map((b, i) => [after[i][0] - b[0], after[i][1] - b[1]]);
  const allSame = moved.every(m => Math.abs(m[0] - moved[0][0]) < 1.5 && Math.abs(m[1] - moved[0][1]) < 1.5);
  say(moved.every(m => Math.hypot(m[0], m[1]) > 100), 'all three travelled', JSON.stringify(moved));
  say(allSame, 'each by the same offset — the shape of the pick is kept');
  say(Math.abs(moved[0][0] - DX) < 6 && Math.abs(moved[0][1] - DY) < 6,
      'and by the distance the hand moved', 'wanted ' + DX + ',' + DY);
  s = await state();
  say(s.picked === 3, 'the pick survives the drop', 'picked=' + s.picked);

  /* ── 3 · ONE UNDO PUTS THE WHOLE CREW BACK ────────────────────────────── */
  console.log('\n3 · ctrl+z');
  await page.keyboard.press('Control+z');
  await page.waitForTimeout(150);
  after = await pos();
  say(JSON.stringify(after) === JSON.stringify(before),
      'one undo put all three back where they were');

  /* ── 4 · A CLICK NARROWS THE PICK, AND THE CORNER APPEARS ─────────────── */
  console.log('\n4 · click one of them');
  const p0 = await solid(0);
  await page.mouse.click(p0.x, p0.y);
  await page.waitForTimeout(150);
  s = await state();
  say(s.picked === 1, 'a click that did not travel collapses the pick to one', 'picked=' + s.picked);
  say(s.grips === 1, 'and that one is offered a resize corner', 'grips=' + s.grips);

  /* ── 5 · THE CORNER SCALES IT ─────────────────────────────────────────── */
  console.log('\n5 · drag the corner');
  const g = await page.evaluate(() => {
    const r = document.querySelector('.wall-scale');
    const p = Lab.toScreen(+r.getAttribute('x') + +r.getAttribute('width') / 2,
                           +r.getAttribute('y') + +r.getAttribute('height') / 2);
    return { x: p.x, y: p.y, i: +r.dataset.i };
  });
  const z0 = (await pos())[g.i][2];
  await page.mouse.move(g.x, g.y);
  await page.mouse.down();
  for (let k = 1; k <= 10; k++) await page.mouse.move(g.x + 90 * k / 10, g.y + 90 * k / 10);
  await page.mouse.up();
  await page.waitForTimeout(200);
  let z1 = (await pos())[g.i][2];
  say(z1 > z0 * 1.2, 'pulling the corner out made it bigger', z0 + ' -> ' + z1);
  const others = await pos();
  say(others.every((it, i) => i === g.i || it[2] === z0), 'and left the other two alone');

  console.log('\n6 · pull it back in, then ctrl+z');
  const g2 = await page.evaluate(() => {
    const r = document.querySelector('.wall-scale');
    const p = Lab.toScreen(+r.getAttribute('x') + +r.getAttribute('width') / 2,
                           +r.getAttribute('y') + +r.getAttribute('height') / 2);
    return { x: p.x, y: p.y };
  });
  await page.mouse.move(g2.x, g2.y);
  await page.mouse.down();
  for (let k = 1; k <= 10; k++) await page.mouse.move(g2.x - 120 * k / 10, g2.y - 120 * k / 10);
  await page.mouse.up();
  await page.waitForTimeout(200);
  const z2 = (await pos())[g.i][2];
  say(z2 < z1 * 0.9, 'pushing it in made it smaller', z1 + ' -> ' + z2);
  await page.keyboard.press('Control+z');
  await page.waitForTimeout(150);
  say((await pos())[g.i][2] === z1, 'and one undo took the resize back', 'back to ' + z1);

  /* ── 6b · THE RING TURNS IT ───────────────────────────────────────────── */
  console.log('\n6b · drag the turn handle');
  const ring = await page.evaluate(() => {
    const c = document.querySelector('.wall-turn');
    if (!c) return null;
    const it = Wall.store.get().items[+c.dataset.i];
    const p = Lab.toScreen(+c.getAttribute('cx'), +c.getAttribute('cy'));
    const mid = Lab.toScreen(it.x, it.y);
    return { x: p.x, y: p.y, cx: mid.x, cy: mid.y, i: +c.dataset.i };
  });
  say(!!ring, 'a picked piece is offered a turn handle');
  const r0 = await page.evaluate(i => Wall.store.get().items[i].r || 0, ring.i);
  // what the piece actually measures on screen before the turn, so the check
  // below is on the rendered geometry rather than on a transform string —
  // that string has been rewritten once already (see head/put in wall.js)
  const box0 = await page.evaluate(i => {
    const r = document.querySelector('.wall-item[data-i="' + i + '"]').getBoundingClientRect();
    return [r.width, r.height];
  }, ring.i);
  // swing the pointer 90° clockwise about the piece's centre
  const rad = Math.hypot(ring.x - ring.cx, ring.y - ring.cy);
  const a0 = Math.atan2(ring.y - ring.cy, ring.x - ring.cx);
  await page.mouse.move(ring.x, ring.y);
  await page.mouse.down();
  for (let k = 1; k <= 12; k++) {
    const a = a0 + (Math.PI / 2) * k / 12;
    await page.mouse.move(ring.cx + rad * Math.cos(a), ring.cy + rad * Math.sin(a));
  }
  await page.mouse.up();
  await page.waitForTimeout(200);
  const r1 = await page.evaluate(i => Wall.store.get().items[i].r || 0, ring.i);
  say(Math.abs(r1 - (r0 + 90)) < 4, 'a quarter turn of the hand is a quarter turn of the sticker',
      r0 + ' -> ' + r1);
  const box1 = await page.evaluate(i => {
    const r = document.querySelector('.wall-item[data-i="' + i + '"]').getBoundingClientRect();
    return [r.width, r.height];
  }, ring.i);
  say(Math.abs(box1[0] - box0[1]) < 3 && Math.abs(box1[1] - box0[0]) < 3,
      'and on screen it really is a quarter turn — the box transposed',
      box0.map(Math.round).join('×') + ' → ' + box1.map(Math.round).join('×'));
  const tilted = await page.evaluate(() => {
    const g = document.querySelector('.wall-marks > g');
    return g && g.getAttribute('transform');
  });
  say(/^rotate\(/.test(tilted || ''), 'the crop marks and handles went round with it', tilted);
  say(await page.evaluate(i => {
    const it = Wall.store.get().items[i];
    return Wall.store.get().items.every((o, n) => n === i || !o.r);
  }, ring.i), 'and the other two stayed upright');

  await page.keyboard.press('Control+z');
  await page.waitForTimeout(150);
  say(await page.evaluate((a) => (Wall.store.get().items[a.i].r || 0) === a.r0, { i: ring.i, r0 }),
      'one undo took the turn back', 'back to ' + r0);

  /* ── 7 · SHIFT ADDS, ESCAPE PUTS IT DOWN ──────────────────────────────── */
  console.log('\n7 · shift-click, then escape');
  const p1 = await solid(1);
  await page.keyboard.down('Shift');
  await page.mouse.click(p1.x, p1.y);
  await page.keyboard.up('Shift');
  await page.waitForTimeout(150);
  s = await state();
  say(s.picked === 2, 'shift-click added the second', 'picked=' + s.picked);
  say(s.grips === 0, 'and the corner went away again', 'grips=' + s.grips);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(150);
  s = await state();
  say(s.picked === 0 && s.crops === 0, 'escape put the pick down', 'picked=' + s.picked);

  /* ── 7b · A TURNED PIECE IS STILL FOUND BY THE BAND ───────────────────── */
  console.log('\n7b · turn one hard, then band the lot again');
  /* A NATIVE DRAG WOULD CANCEL THE POINTER AND KILL THE BAND, and by this
     point in the run there is a selection lying about for one to catch on —
     which is how that bug was found. The dragstart guard in lab.js and the
     user-select on body.lab-banding are what make this pass; without either,
     the band dies a few pixels in and keeps only what was in that first
     corner. Watched rather than assumed: the listener records what the
     browser actually did with the gesture. */
  await page.evaluate(() => {
    Wall.store.update(st => { st.items[2].r = 37; }); Wall.paint();
    window.__killed = [];
    ['dragstart', 'pointercancel'].forEach(t =>
      window.addEventListener(t, () => window.__killed.push(t), true));
  });
  await page.waitForTimeout(120);
  await drawBand();
  s = await state();
  const killed = await page.evaluate(() => window.__killed);
  say(s.picked === 3, 'the band still catches the turned one', 'picked=' + s.picked);
  say(killed.length === 0, 'and nothing cancelled the pointer under it',
      killed.length ? killed.join(',') : 'no dragstart, no pointercancel');
  say(await page.evaluate(() => !String(window.getSelection()).trim()),
      'a band across the paper selects none of the words behind it');
  await page.keyboard.press('Escape');

  /* ── 7d · MIRRORING ─────────────────────────────────────────────────────
     One piece flips about its own centre and does not move; a GROUP flips
     about the group, so the row comes back reading the other way. Both are
     checked here, and so is the exactness claim in wall.js's flip(): twice is
     the identity, byte for byte. */
  console.log('\n7d · shift H and shift V');
  await page.keyboard.press('Escape');
  await drawBand();
  let s7 = await state();
  say(s7.picked === 3, 'three picked to flip', 'picked=' + s7.picked);

  const snap = () => page.evaluate(() => JSON.stringify(Wall.store.get().items));
  const xs = () => page.evaluate(() => Wall.store.get().items.map(it => it.x));
  const before7 = await snap(), x7 = await xs();
  await page.keyboard.press('Shift+H');
  await page.waitForTimeout(200);
  const x8 = await xs();
  /* Asserted as a PROPERTY rather than against a number, on purpose: the line
     is the middle of the pick's bounding BOX (which is what Figma mirrors
     about, and is not the middle of the centres once the pieces are different
     sizes). Re-deriving that here would only be wall.js's own arithmetic
     copied out, and a test that repeats the code cannot catch it being wrong.
     What is actually promised is that ONE line served every piece, and that
     the row now reads the other way — both of which are checkable without
     knowing where the line fell. */
  const sums = x8.map((v, i) => v + x7[i]);
  say(sums.every(v => Math.abs(v - sums[0]) < 1.5),
      'every piece mirrored about one and the same line', 'x+x′ = ' + sums.map(Math.round).join(', '));
  const order = a => a.map((v, i) => i).sort((p, q) => a[p] - a[q]).join('');
  say(order(x8) === order(x7).split('').reverse().join(''),
      'and the row now reads the other way round', order(x7) + ' → ' + order(x8));
  say(String(await page.evaluate(() => {
    const n = document.querySelector('.wall-item[data-i="0"]');
    return n && n.getAttribute('transform');
  })).indexOf('scale(-1,1)') > -1, 'and the piece itself is drawn mirrored');
  say(await page.evaluate(w => Wall.store.get().items[2].r === ((360 - w) % 360),
      37), 'a turned piece has its angle negated too', 'was 37');

  await page.keyboard.press('Shift+H');
  await page.waitForTimeout(200);
  say(await snap() === before7, 'flipping twice is the identity, byte for byte');

  await page.keyboard.press('Control+z');
  await page.keyboard.press('Control+z');
  await page.waitForTimeout(200);
  say(await snap() === before7, 'and each flip cost exactly one undo');

  // one on its own: it must not travel
  await page.mouse.click((await solid(1)).x, (await solid(1)).y);
  await page.waitForTimeout(150);
  const one = await page.evaluate(() => { const it = Wall.store.get().items[1]; return [it.x, it.y]; });
  await page.keyboard.press('Shift+V');
  await page.waitForTimeout(200);
  const one2 = await page.evaluate(() => { const it = Wall.store.get().items[1]; return [it.x, it.y, it.fy]; });
  say(one2[0] === one[0] && one2[1] === one[1] && one2[2] === 1,
      'one piece flips about its own centre and stays put', JSON.stringify(one2));
  await page.keyboard.press('Control+z');
  await page.waitForTimeout(150);

  /* ── 7e · COPY AND PASTE ────────────────────────────────────────────────── */
  console.log('\n7e · ctrl+c, ctrl+v');
  await page.keyboard.press('Escape');
  await drawBand();
  const n0 = await page.evaluate(() => Wall.store.get().items.filter(Boolean).length);
  const spread = () => page.evaluate(() => {
    const p = Wall.store.get().items.filter(Boolean).slice(-3).map(it => [it.x, it.y]);
    return p;
  });
  const src = await spread();
  await page.keyboard.press('Control+c');
  await page.keyboard.press('Control+v');
  await page.waitForTimeout(250);
  const n1 = await page.evaluate(() => Wall.store.get().items.filter(Boolean).length);
  say(n1 === n0 + 3, 'pasting a pick of three makes three more', n0 + ' -> ' + n1);
  const cp = await spread();
  say(cp.every((p, i) => Math.abs(p[0] - src[i][0] - 48) < 1 && Math.abs(p[1] - src[i][1] - 48) < 1),
      'each landing one nudge down-right of its own original — the group keeps its shape');
  s7 = await state();
  say(s7.picked === 3, 'and the copies are what you now have hold of', 'picked=' + s7.picked);

  await page.keyboard.press('Control+v');
  await page.waitForTimeout(250);
  const cp2 = await spread();
  say(await page.evaluate(() => Wall.store.get().items.filter(Boolean).length) === n0 + 6
      && Math.abs(cp2[0][0] - src[0][0] - 96) < 1,
      'a second paste lands clear of the first', 'dx=' + Math.round(cp2[0][0] - src[0][0]));

  await page.keyboard.press('Control+z');
  await page.keyboard.press('Control+z');
  await page.waitForTimeout(250);
  say(await page.evaluate(() => Wall.store.get().items.filter(Boolean).length) === n0,
      'two undos take both pastes back off the paper');
  say(await page.evaluate(() => !document.querySelector('.wall-item[data-i="5"]')),
      'and the pasted nodes are gone from the layer');

  /* ── 7c · THE NOTE TAB STILL RESHAPES A NOTE ──────────────────────────────
     startSize used to serve one grip and now serves three, so the one that
     was already there is worth a look: a note's width tab is a different
     shape of gesture (one axis, its own clamp) sharing the same door. */
  console.log('\n7c · the note tab');
  await page.keyboard.press('Escape');
  await page.evaluate(() => {
    // on the bare paper ABOVE the stickers, and in view: a tab off the bottom
    // of the bench is a tab no pointer in this run can reach
    // its index is whatever the push returns — the pastes and undos above
    // leave nulled slots behind, so it is no longer simply 3
    Wall.store.update(st => { window.__note = st.items.push({ k: 't', t: 'a note wide enough to wrap', x: 470, y: 250, c: 0, f: 0, sz: 26, w: 260 }) - 1; });
    Wall.paint();
  });
  await page.waitForTimeout(250);
  const tab = await page.evaluate(() => {
    const n = document.querySelector('.wall-item[data-i="' + window.__note + '"] .wall-grip');
    if (!n) return null;
    const p = Lab.toScreen(+n.getAttribute('x') + 3.5, +n.getAttribute('y') + +n.getAttribute('height') / 2);
    const b = Lab.bench.getBoundingClientRect();
    const hit = document.elementFromPoint(p.x, p.y);
    return { x: p.x, y: p.y, inView: p.x > b.left && p.x < b.right && p.y > b.top && p.y < b.bottom,
             on: hit && (hit.getAttribute('class') || hit.tagName) };
  });
  say(!!tab && tab.inView && /wall-grip/.test(tab.on || ''),
      'a note on the paper still shows its width tab', tab && ('under the pointer: ' + tab.on));
  const w0 = await page.evaluate(() => Wall.store.get().items[window.__note].w);
  await page.mouse.move(tab.x, tab.y);
  await page.mouse.down();
  for (let k = 1; k <= 8; k++) await page.mouse.move(tab.x + 140 * k / 8, tab.y);
  await page.mouse.up();
  await page.waitForTimeout(200);
  const w1 = await page.evaluate(() => Wall.store.get().items[window.__note].w);
  say(Math.abs(w1 - (w0 + 140)) < 8, 'dragging it still widens the box', w0 + ' -> ' + w1);
  await page.keyboard.press('Control+z');
  await page.waitForTimeout(150);
  say(await page.evaluate(a => Wall.store.get().items[window.__note].w === a, w0),
      'and it now costs one undo, which it never used to', 'back to ' + w0);
  await page.evaluate(() => { Wall.store.update(st => { st.items[window.__note] = null; }); Wall.paint(); });

  /* ── 8 · THE SAVED SIZE SURVIVES A RELOAD ─────────────────────────────── */
  console.log('\n8 · reload');
  const want = await pos();
  await page.reload({ waitUntil: 'load' });
  // by now the array is longer than three: a paste appends and its undo NULLS
  // the slot rather than splicing it, so the live pieces are what to count
  await page.waitForFunction(() => window.Wall && Wall.store.get().items.filter(Boolean).length === 3);
  await page.waitForTimeout(600);
  // …and since 2026-09-11 those null slots are squeezed out at boot (DEAD
  // SLOTS ARE DROPPED AT BOOT, wall.js), so it is the live pieces, in order,
  // that have to come back — not the holes between them
  const live = list => JSON.stringify(list.filter(Boolean));
  const back = await pos();
  say(live(back) === live(want) && back.length === 3,
      'positions, sizes and angles came back off the store, the dead slots squeezed out', JSON.stringify(back));

  console.log('\n' + (errs.length ? errs.length + ' page error(s)' : 'no page errors'));
  await page.waitForTimeout(400);
  await browser.close();
})();
