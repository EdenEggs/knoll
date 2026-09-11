/* ironhive/probe-seed.js — the wall this bench opens on (seed.js, 2026-09-11).

     1   a browser that has never been here opens on the shipped wall — every
         piece of wall-seed.json on the paper, the tracings it uses in the
         library — framed as it was published: the same world point under the
         middle of the bench, the zoom scaled to this bench's width
     2   a reload keeps it: it is that browser's wall now, saved like any
         other, and the mark says the seed has been and gone
     3   a browser with a wall of its own is left alone — one piece stamped
         before the page loads is still the one piece after it
     4   "reset data" means bare paper: the stores are wiped, the mark stays,
         and the next load does not put the shipped wall back
     5   the dev server's door answers the knock, refuses a post with no wall
         in it, and the "publish the wall" control stands in the tools row

   Run with the site's serve.js already up on 4321:  node ironhive/probe-seed.js */
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const say = (ok, what, extra) => { if (!ok) fails++; console.log((ok ? '  PASS  ' : '  FAIL  ') + what + (extra == null ? '' : '   ' + extra)); };
let fails = 0;
const seed = JSON.parse(fs.readFileSync(path.join(__dirname, 'wall-seed.json'), 'utf8'));
// ?seed=on: a driven browser (navigator.webdriver) is otherwise given bare paper — see PROBES GET BARE PAPER in seed.js
const URL = 'http://localhost:4321/ironhive/?seed=on';

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: false,
    args: ['--window-size=1616,1110', '--window-position=0,0'] });
  const fresh = async () => {
    const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    page.on('pageerror', e => console.log('PAGEERROR', String(e)));
    // the layout door stays shut, the way every probe here keeps it; the wall door is what is under test
    await page.route('**/_ironhive/default', r => r.fulfill({ status: 404, body: 'no door' }));
    return { ctx, page };
  };
  const state = page => page.evaluate(() => {
    const b = Lab.bench.getBoundingClientRect();
    const c = Lab.toWorld(b.left + b.width / 2, b.top + b.height / 2);
    return { pieces: Wall.store.get().items.filter(Boolean).length, painted: document.querySelectorAll('.wall-item').length,
             tracings: (Tracer.store.get().list || []).length, zoom: +Lab.zoom.toFixed(4), centre: [Math.round(c.x), Math.round(c.y)],
             bench: Math.round(b.width), mark: localStorage.getItem('knoll-ironhive:seeded'), had: Seed.had };
  });
  const settled = page => page.waitForFunction(() => window.Seed && window.Wall && localStorage.getItem('knoll-ironhive:seeded') != null, null, { timeout: 15000 });

  // ── 0 · a driven browser gets bare paper ──────────────────────────────────
  console.log('\n0 · a probe that does not ask for the seed');
  let { ctx, page } = await fresh();
  await page.goto('http://localhost:4321/ironhive/', { waitUntil: 'load' });
  await page.waitForFunction(() => window.Seed && window.Wall);
  await page.waitForTimeout(1500);
  const bare = await page.evaluate(() => ({ pieces: Wall.store.get().items.filter(Boolean).length, mark: localStorage.getItem('knoll-ironhive:seeded'), driven: navigator.webdriver }));
  say(bare.driven === true && bare.pieces === 0 && bare.mark == null, 'navigator.webdriver without ?seed=on: nothing seeded, nothing marked', JSON.stringify(bare));
  await ctx.close();

  // ── 1 · a first visit ─────────────────────────────────────────────────────
  console.log('\n1 · a browser that has never been here');
  ({ ctx, page } = await fresh());
  await page.goto(URL, { waitUntil: 'load' });
  await settled(page);
  await page.waitForTimeout(800);
  let s = await state(page);
  const want = seed.wall.items.length;
  say(s.had.wall === false && s.had.cam === false && s.had.mark === false, 'seed.js saw no wall, no camera and no mark', JSON.stringify(s.had));
  say(s.pieces === want, 'every piece of the seed is on the paper', s.pieces + ' of ' + want);
  say(s.painted >= want - 20, 'and they are painted', s.painted + ' .wall-item (stickers whose kit is not filed paint nothing)');
  say(s.tracings === seed.flatfile.list.length, 'the tracings the seed uses are in the library', s.tracings + ' of ' + seed.flatfile.list.length);
  const wantZ = +(seed.cam.z * Math.min(1, s.bench / seed.cam.w)).toFixed(4);
  say(Math.abs(s.zoom - wantZ) < 0.002, 'framed at the published zoom, scaled to this bench', 'zoom ' + s.zoom + ' (published ' + seed.cam.z + ' on ' + seed.cam.w + ' wide, this bench ' + s.bench + ' → ' + wantZ + ')');
  say(Math.hypot(s.centre[0] - seed.cam.cx, s.centre[1] - seed.cam.cy) < 40, 'with the published world point under the middle of the bench', s.centre.join(',') + ' vs ' + seed.cam.cx + ',' + seed.cam.cy);
  await page.screenshot({ path: path.join(__dirname, 'results', 'seed-first-visit.png') }).catch(() => {});

  // ── 2 · a reload keeps it ─────────────────────────────────────────────────
  console.log('\n2 · the same browser, again');
  await page.evaluate(() => Lab.setZoom(0.4));            // a camera of their own
  await page.waitForTimeout(400);
  await page.reload({ waitUntil: 'load' });
  await settled(page);
  await page.waitForTimeout(600);
  s = await state(page);
  say(s.pieces === want, 'the wall is still there — theirs now', s.pieces + ' pieces');
  say(s.had.wall === true && s.had.mark === true, 'seed.js saw the wall and the mark and left both alone', JSON.stringify(s.had));
  say(Math.abs(s.zoom - 0.4) < 0.002, 'and the camera is where they left it, not the published one', 'zoom ' + s.zoom);
  await ctx.close();

  // ── 3 · a wall of their own ───────────────────────────────────────────────
  console.log('\n3 · a browser with one piece of its own');
  ({ ctx, page } = await fresh());
  await page.goto(URL, { waitUntil: 'load' });
  await settled(page);
  await page.evaluate(() => { localStorage.setItem('knoll-ironhive:wall', JSON.stringify({ items: [{ k: 't', c: 0, f: 0, x: 100, y: 100, t: 'mine', sz: 22, w: 120, b: 0, i: 0, u: 0, a: 0 }] })); localStorage.removeItem('knoll-ironhive:seeded'); });
  await page.reload({ waitUntil: 'load' });
  await settled(page);
  await page.waitForTimeout(600);
  s = await state(page);
  say(s.pieces === 1, 'their one piece is the whole wall — nothing seeded over it', s.pieces + ' piece(s)');
  say(s.mark != null, 'and the mark is set so it is not asked again', s.mark);
  await ctx.close();

  // ── 4 · reset data ────────────────────────────────────────────────────────
  console.log('\n4 · reset data');
  ({ ctx, page } = await fresh());
  await page.goto(URL, { waitUntil: 'load' });
  await settled(page);
  await page.waitForTimeout(400);
  await page.evaluate(() => Lab.resetData());
  await page.waitForTimeout(400);
  await page.reload({ waitUntil: 'load' });
  await settled(page);
  await page.waitForTimeout(600);
  s = await state(page);
  say(s.pieces === 0, 'after reset data the paper stays bare on the next load', s.pieces + ' pieces, mark ' + s.mark);
  await ctx.close();

  // ── 5 · the door ──────────────────────────────────────────────────────────
  console.log('\n5 · the dev server\'s wall door');
  ({ ctx, page } = await fresh());
  await page.goto(URL, { waitUntil: 'load' });
  await settled(page);
  await page.waitForTimeout(800);
  const door = await page.evaluate(async () => {
    const knock = await fetch('/_ironhive/wall').then(r => r.json()).catch(e => ({ error: String(e) }));
    const bad = await fetch('/_ironhive/wall', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ cam: { z: 1, cx: 0, cy: 0 } }) });
    const badBody = await bad.json().catch(() => ({}));
    const b = document.getElementById('lab-seed');
    return { knock, badStatus: bad.status, badError: badBody.error, button: !!b, shown: !!b && !b.hidden, label: b && b.textContent };
  });
  say(door.knock && door.knock.door === true, 'the door answers the knock', JSON.stringify(door.knock));
  say(door.badStatus === 400 && /no wall/.test(door.badError || ''), 'a post with no wall in it is refused', door.badStatus + ' ' + door.badError);
  say(door.button && door.shown && /publish the wall/.test(door.label || ''), '"publish the wall" stands in the header on the dev server', JSON.stringify({ shown: door.shown, label: door.label }));
  say(seed.wall.items.length > 0 && Number.isFinite(seed.cam.z) && Number.isFinite(seed.cam.cx) && Number.isFinite(seed.cam.cy) && seed.cam.w > 0, 'wall-seed.json carries pieces and a camera', seed.wall.items.length + ' pieces, cam ' + JSON.stringify(seed.cam));
  await ctx.close();

  console.log('\n' + (fails ? fails + ' FAIL' : 'all PASS'));
  await browser.close();
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
