/* ironhive/probe-camera.js — the wheel zoom lands where the pointer is, and
   shift 1 frames what you made. Driven for real: a real wheel with a real
   ctrl held, and the answer read back by asking the page which world point is
   under the pointer before and after.

     1   BEFORE and AFTER, side by side. contentBox() used to count features
         and nothing else, and this bench has none — so the camera was clamped
         inside a viewport-sized rectangle at world 0,0 however far out the
         work actually sat, and a zoom in was reeled back towards it. The old
         behaviour is reproduced exactly by taking Wall.bounds away, since
         that is the one thing contentBox now asks for.
     2   the point under the pointer stays under it, in and out, at nine
         places on the bench including all four corners
     3   …after a pan, too — the clamp is written in screen pixels, so a
         camera that has been moved is a different question
     4   shift 1 frames the work rather than the empty sheet
     5   and the clamp has NOT been thrown away: the work cannot be pushed
         off the screen entirely

   Stamps its own stickers into a clean store first (localStorage is wiped on
   the way in) so the run says the same thing twice.

   Run with the site's serve.js already up on 4321:  node ironhive/probe-camera.js
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

  await page.goto('http://localhost:4321/ironhive/', { waitUntil: 'load' });
  await page.evaluate(() => { try { localStorage.clear(); } catch (e) {} });
  await page.reload({ waitUntil: 'load' });
  await page.waitForFunction(() => window.Lab && window.Wall && window.Stickers && Stickers.list.length > 0);
  await page.waitForTimeout(900);

  /* A FIELD OF STICKERS WELL AWAY FROM WORLD 0,0, which is the whole point:
     the rectangle the camera used to be clamped inside is the viewport, at
     the origin, and a scene stamped inside it would never have shown this. */
  const FIELD = { x0: 1400, y0: 1200, x1: 3200, y1: 2400 };
  await page.evaluate(f => {
    Wall.store.update(st => { st.items = []; });
    Wall.setTool('move');
    const id = Stickers.list[0].id;
    for (let x = f.x0; x <= f.x1; x += 300)
      for (let y = f.y0; y <= f.y1; y += 300)
        Wall.store.update(st => { st.items.push({ k: 'd', f: id, o: 0, x, y, z: 160 }); });
    Wall.paint();
  }, FIELD);
  await page.waitForTimeout(400);

  const b = await page.evaluate(() => { const r = Lab.bench.getBoundingClientRect();
    return { left: r.left, top: r.top, w: r.width, h: r.height }; });
  const at = p => page.evaluate(q => { const w = Lab.toWorld(q.x, q.y); return { x: w.x, y: w.y }; }, p);
  const zoom = () => page.evaluate(() => Lab.zoom);
  const fit = async () => { await page.evaluate(() => Lab.fit(true)); await page.waitForTimeout(350); };
  const home = () => page.evaluate(() => ({ z: Lab.zoom, x: Lab.pan.x, y: Lab.pan.y }));
  const goHome = h => page.evaluate(v => Lab.camTo(v.z, v.x, v.y), h);

  // one gesture: hold ctrl, four notches at P, let go — and how far the world
  // point that was under the pointer has slid out from under it
  const wheelAt = async (P, dir, notches) => {
    const before = await at(P);
    await page.mouse.move(P.x, P.y);
    await page.keyboard.down('Control');
    for (let k = 0; k < (notches || 4); k++) {
      await page.mouse.wheel(0, dir === 'in' ? -120 : 120);
      await page.waitForTimeout(50);
    }
    await page.keyboard.up('Control');
    await page.waitForTimeout(250);
    const after = await at(P);
    return { before, after, drift: Math.hypot(after.x - before.x, after.y - before.y) };
  };

  /* ── 1 · WHAT IT USED TO DO ────────────────────────────────────────────────
     Wall.bounds is the one line contentBox() gained, so taking it away is the
     old file's behaviour and not an impression of it. */
  console.log('\n1 · the old camera — contentBox with no wall in it');
  await page.evaluate(() => { window.__bounds = Wall.bounds; delete Wall.bounds; Lab.forget(); });
  await fit();
  const oldFitMid = await at({ x: b.left + b.w / 2, y: b.top + b.h / 2 });
  const midX = (FIELD.x0 + FIELD.x1) / 2, midY = (FIELD.y0 + FIELD.y1) / 2;
  const oldOff = Math.hypot(oldFitMid.x - midX, oldFitMid.y - midY);
  say(oldOff > 400, 'shift 1 framed the empty sheet, not the work',
      'bench middle sat at ' + Math.round(oldFitMid.x) + ',' + Math.round(oldFitMid.y) +
      ' — the work is centred on ' + midX + ',' + midY);
  // put the work on screen by hand and try to zoom into it
  await page.evaluate(m => { const b = Lab.bench.getBoundingClientRect(), c = Lab.toScreen(m.x, m.y);
    Lab.panBy(b.left + b.width / 2 - c.x, b.top + b.height / 2 - c.y); }, { x: midX, y: midY });
  await page.waitForTimeout(250);
  const oldAim = { x: Math.round(b.left + b.w * 0.28), y: Math.round(b.top + b.h * 0.28) };
  const oldIn = await wheelAt(oldAim, 'in');
  say(oldIn.drift > 20, 'and a zoom in slid out from under the pointer',
      'drift ' + Math.round(oldIn.drift) + ' world px at ' + Math.round(await zoom() * 100) + '%');

  /* ── 2 · AND WHAT IT DOES NOW, AT NINE PLACES ─────────────────────────── */
  console.log('\n2 · the wheel zoom, nine points');
  await page.evaluate(() => { Wall.bounds = window.__bounds; Lab.forget(); });
  await fit();
  const H = await home();
  const spots = [];
  [0.2, 0.5, 0.8].forEach(fx => [0.2, 0.5, 0.8].forEach(fy =>
    spots.push({ x: Math.round(b.left + b.w * fx), y: Math.round(b.top + b.h * fy) })));
  let worstIn = 0, worstOut = 0;
  for (const P of spots) {
    await goHome(H); await page.waitForTimeout(200);
    worstIn = Math.max(worstIn, (await wheelAt(P, 'in')).drift);
    await goHome(H); await page.waitForTimeout(200);
    worstOut = Math.max(worstOut, (await wheelAt(P, 'out')).drift);
  }
  say(worstIn < 0.5, 'zooming IN holds the point under the pointer',
      'worst drift ' + worstIn.toFixed(3) + ' world px over ' + spots.length + ' points');
  say(worstOut < 0.5, 'zooming OUT holds it too', 'worst drift ' + worstOut.toFixed(3) + ' world px');

  /* ── 3 · AND AFTER A PAN ──────────────────────────────────────────────── */
  console.log('\n3 · pan, then zoom');
  await goHome(H); await page.waitForTimeout(200);
  await page.evaluate(() => Lab.panBy(-260, 180));
  await page.waitForTimeout(200);
  const panned = await wheelAt({ x: Math.round(b.left + b.w * 0.7), y: Math.round(b.top + b.h * 0.3) }, 'in');
  say(panned.drift < 0.5, 'a moved camera zooms about the pointer just the same',
      'drift ' + panned.drift.toFixed(3) + ' world px');

  /* ── 4 · SHIFT 1 ──────────────────────────────────────────────────────── */
  console.log('\n4 · shift 1');
  await goHome(H); await page.waitForTimeout(200);
  await page.evaluate(() => Lab.setZoom(2));
  await page.waitForTimeout(200);
  await page.keyboard.press('Shift+!');
  await page.waitForTimeout(600);
  const mid = await at({ x: b.left + b.w / 2, y: b.top + b.h / 2 });
  const off = Math.hypot(mid.x - midX, mid.y - midY);
  say(off < 60, 'frames what is on the wall, and centres it',
      'bench middle at ' + Math.round(mid.x) + ',' + Math.round(mid.y) + ' — the work is centred on ' + midX + ',' + midY);
  const corners = await page.evaluate(f => {
    const b = Lab.bench.getBoundingClientRect();
    const a = Lab.toScreen(f.x0 - 80, f.y0 - 80), z = Lab.toScreen(f.x1 + 80, f.y1 + 80);
    return { in: a.x > b.left && a.y > b.top && z.x < b.right && z.y < b.bottom };
  }, FIELD);
  say(corners.in, 'with the whole field on screen');

  /* ── 5 · THE CLAMP IS STILL THERE ─────────────────────────────────────────
     The rectangle grew; it did not go away. Shove the camera a long way past
     the work and it should still be holding some of it on screen. */
  console.log('\n5 · the clamp still holds');
  await page.evaluate(() => Lab.panBy(-90000, -90000));
  await page.waitForTimeout(250);
  const still = await page.evaluate(() => {
    const b = Lab.bench.getBoundingClientRect();
    const w = Wall.bounds(), a = Lab.toScreen(w.x, w.y), z = Lab.toScreen(w.x + w.w, w.y + w.h);
    const ox = Math.min(z.x, b.right) - Math.max(a.x, b.left);
    const oy = Math.min(z.y, b.bottom) - Math.max(a.y, b.top);
    return { ox: Math.round(ox), oy: Math.round(oy) };
  });
  say(still.ox > 0 && still.oy > 0, 'a shove of 90,000px still leaves the work on screen',
      still.ox + '×' + still.oy + ' px of it');

  console.log('\n' + (errs.length ? errs.length + ' page error(s)' : 'no page errors'));
  await page.waitForTimeout(400);
  await browser.close();
})();
