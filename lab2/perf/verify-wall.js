/* lab2/perf/verify-wall.js — the wall's list of pieces, 2026-09-11: nothing
   on it is dropped any more. Until today wall.js kept MAX = 600 and add()
   spliced the oldest pieces off the FRONT of the list past that — every
   stroke of the pen is a piece, so a wall of stickers and one afternoon's
   drawing lost its first stickers silently, and the splice renamed every
   index anything held. Ported from the iron hive (092761c). Checks: seven
   hundred pieces and three dead slots come back off the store with the slots
   squeezed out and the order kept; a gif and a pen stroke past six hundred
   push and drop nothing; an emptied note nulls its slot instead of splicing
   the list; that null is squeezed out on the next boot; a store with no list
   is given one; and a save that does not fit in localStorage puts a line
   over the dock, which the first save that fits again takes down.
   USAGE (from site/): node lab2/perf/verify-wall.js
   A screenshot of the line over the dock lands in lab2/perf/results/. */
const path = require('path');
const { chromium } = require('playwright');
const OUT = path.join(__dirname, 'results');
const results = [];
const check = (name, ok, info) => { results.push({ name, ok }); console.log((ok ? 'PASS ' : 'FAIL ') + name + (info ? ' — ' + info : '')); };

// a 1×1 gif, so the pinned gif is a real image and not a request to nowhere
const GIF = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

/* 150 notes then 550 strokes — the shape of the day that lost its stickers:
   a scene, then an afternoon of drawing on top of it. Three dead slots are
   sown in, one at the very end, the way a delete or an emptied note leaves
   them. */
const NOTES = 150, STROKES = 550;
const live = [];
for (let i = 0; i < NOTES; i++) live.push({ k: 't', c: 0, f: 0, x: 200 + (i % 10) * 140, y: 200 + Math.floor(i / 10) * 60,
                                             t: 'note ' + i, sz: 22, w: 120, b: 0, i: 0, u: 0, a: 0 });
for (let i = 0; i < STROKES; i++) {
  const x = 100 + (i % 25) * 60, y = 1200 + Math.floor(i / 25) * 40;
  live.push({ k: 's', c: 1, w: 1, d: 'M' + x + ' ' + y + 'L' + (x + 30) + ' ' + (y + 20) });
}
const seeded = live.slice();
seeded.splice(5, 0, null); seeded.splice(300, 0, null); seeded.push(null);

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: false, args: ['--window-size=1616,1110', '--window-position=0,0'] });
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await page.route('**/_lab2/default', r => r.fulfill({ status: 404, body: 'no door' }));
  const open = async () => {
    await page.goto('http://localhost:4321/lab2/', { waitUntil: 'load' });
    await page.waitForFunction(() => window.Lab && window.Frames && window.Wall);
    await page.waitForTimeout(1200);
  };
  const items = () => page.evaluate(() => Wall.store.get().items);
  const saved = () => page.evaluate(() => { try { return JSON.parse(localStorage.getItem('knoll-lab2:wall')); } catch (e) { return null; } });
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

  // ── seven hundred pieces come back, the dead slots squeezed out ─────────
  await open();
  await page.evaluate(seed => localStorage.setItem('knoll-lab2:wall', JSON.stringify({ items: seed, ink: 3 })), seeded);
  await open();
  let it = await items();
  check('700 live pieces and 3 dead slots come back as 700, in order, none dropped',
    it.length === live.length && it.every(Boolean) && same(it, live), it.length + ' pieces');
  const onDisk = await saved();
  check('the squeeze is saved at once, and the rest of the store is left alone',
    !!onDisk && onDisk.items.length === live.length && onDisk.ink === 3, onDisk && onDisk.items.length + ' saved, ink ' + onDisk.ink);
  const painted = await page.evaluate(() => document.querySelectorAll('.wall-item').length);
  check('every one of them is painted', painted === live.length, painted + ' .wall-item');

  // ── past six hundred, a push and nothing else ───────────────────────────
  await page.evaluate(g => Wall.gifAt({ url: g, w: 100, h: 100 }, 640, 640), GIF);
  it = await items();
  check('a gif pinned past 600 pushes; the first note is still the first note',
    it.length === live.length + 1 && it[0].t === 'note 0' && it[it.length - 1].k === 'g', it.length + ' pieces');

  /* THE PEN NEEDS BARE PAPER. The features sit above the ink layer, so a
     press on one of them is theirs and never reaches the wall — the same
     as for a person. Bare paper is wherever the press would land on the
     wall's own press-catching rect, so that is what is looked for. */
  await page.evaluate(() => Wall.setTool('draw'));
  await page.waitForTimeout(300);
  const spot = await page.evaluate(() => {
    for (let y = 140; y < 880; y += 40) for (let x = 400; x < 1500; x += 40) {
      const e = document.elementFromPoint(x, y);
      if (e && e.tagName === 'rect' && e.closest('.wall-ink')) return { x, y };
    }
    return null;
  });
  check('there is bare paper on screen to draw on', !!spot, JSON.stringify(spot));
  if (spot) {
    await page.mouse.move(spot.x, spot.y);
    await page.mouse.down();
    await page.mouse.move(spot.x + 60, spot.y + 30, { steps: 6 });
    await page.mouse.move(spot.x + 120, spot.y + 70, { steps: 6 });
    await page.mouse.up();
    await page.waitForTimeout(300);
  }
  it = await items();
  check('a pen stroke past 600 pushes too, and drops nothing',
    it.length === live.length + 2 && it[it.length - 1].k === 's' && it[0].t === 'note 0' && it[NOTES].k === 's',
    it.length + ' pieces, last ' + JSON.stringify(it[it.length - 1]).slice(0, 60));
  const n2 = it.length;

  // ── an emptied note nulls its slot ──────────────────────────────────────
  await page.evaluate(() => Wall.setTool('move'));
  await page.waitForTimeout(300);
  const opened = await page.evaluate(() => {
    const node = document.querySelector('.wall-item[data-i="10"]');
    if (!node) return 'no node at 10';
    node.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, cancelable: true, clientX: 0, clientY: 0 }));
    const ta = document.querySelector('.wall-note-in');
    return ta ? ta.value : 'no box';
  });
  check('two presses on note 10 open it with its words', opened === 'note 10', JSON.stringify(opened));
  await page.evaluate(() => {
    const ta = document.querySelector('.wall-note-in');
    ta.value = '';
    ta.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
  });
  await page.waitForTimeout(300);
  it = await items();
  // the box must be gone once the note is pinned: one left open would be a
  // second commit waiting on the next blur
  const boxGone = await page.evaluate(() => !document.querySelector('.wall-note-in'));
  check('pinning it empty NULLS slot 10 — the list is the same length, 9 and 11 are still 9 and 11, the box is gone',
    it.length === n2 && it[10] === null && it[9].t === 'note 9' && it[11].t === 'note 11' && boxGone,
    it.length + ' pieces, slot 10 = ' + JSON.stringify(it[10]) + (boxGone ? '' : ', box still open'));

  // ── …and the next boot squeezes it out ──────────────────────────────────
  await open();
  it = await items();
  check('after a reload the dead slot is gone and note 11 is at 10',
    it.length === n2 - 1 && it.every(Boolean) && it[10].t === 'note 11' && it[it.length - 1].k === 's', it.length + ' pieces');

  // ── a store with no list at all is given one ────────────────────────────
  const errsBefore = errors.length;
  await page.evaluate(() => localStorage.setItem('knoll-lab2:wall', JSON.stringify({ items: 7, ink: 2 })));
  await open();
  const bare = await page.evaluate(() => { const s = Wall.store.get(); return { list: Array.isArray(s.items), n: s.items && s.items.length, ink: s.ink }; });
  check('a store whose items are not a list boots with an empty one, keeps its ink, and throws nothing',
    bare.list && bare.n === 0 && bare.ink === 2 && errors.length === errsBefore, JSON.stringify(bare));

  // ── a save that does not fit is said out loud ───────────────────────────
  check('Lab.warn is a door', await page.evaluate(() => typeof Lab.warn === 'function'));
  check('nothing is said while every save fits',
    await page.evaluate(() => { const w = document.querySelector('.lab-warn'); return !w || w.hidden; }));
  /* FILLED TO THE LAST FEW CHARACTERS, not the last few kilobytes: a first
     cut stopped at 4 KB steps, which left the wall's two-hundred-character
     save fitting comfortably and nothing to say. Each pass writes a smaller
     filler until that one no longer fits either. */
  const filled = await page.evaluate(() => {
    let n = 0, chars = 0;
    for (const size of [1 << 20, 1 << 14, 1 << 10, 1 << 6, 1 << 2, 1]) {
      const s = 'x'.repeat(size);
      try { for (;;) { localStorage.setItem('fill-' + n, s); n++; chars += size; } } catch (e) {}
    }
    return { keys: n, mb: (chars / 1048576).toFixed(3) };
  });
  const before = await saved();
  await page.evaluate(g => Wall.gifAt({ url: g, w: 100, h: 100 }, 640, 640), GIF);
  await page.waitForTimeout(300);
  const said = await page.evaluate(() => {
    const w = document.querySelector('.lab-warn'); if (!w) return null;
    const r = w.getBoundingClientRect(), cs = getComputedStyle(w);
    const dock = document.getElementById('tool-dock'), d = dock && dock.getBoundingClientRect();
    return { hidden: w.hidden, text: w.textContent, display: cs.display, position: cs.position, role: w.getAttribute('role'),
             bottom: r.bottom, dockTop: d ? d.top : null, onScreen: r.width > 0 && r.left >= 0 && r.right <= innerWidth,
             inMemory: Wall.store.get().items.length };
  });
  const after = await saved();
  check('with localStorage full (' + filled.mb + ' MB in ' + filled.keys + ' keys) a pin that cannot be saved puts the line up over the dock',
    !!said && !said.hidden && said.display !== 'none' && said.position === 'fixed' && said.role === 'alert' &&
    /storage is full/.test(said.text) && /not saved/.test(said.text) && said.onScreen &&
    said.dockTop != null && said.bottom <= said.dockTop, JSON.stringify(said));
  check('…the screen keeps the piece and the disk does not, which is what the line is for',
    !!said && !!before && !!after && said.inMemory === before.items.length + 1 && after.items.length === before.items.length,
    'memory ' + (said && said.inMemory) + ', saved ' + (after && after.items.length));
  await page.screenshot({ path: path.join(OUT, 'verify-wall-full.png') });

  await page.evaluate(() => { Object.keys(localStorage).filter(k => /^fills?-/.test(k)).forEach(k => localStorage.removeItem(k)); });
  await page.evaluate(g => Wall.gifAt({ url: g, w: 100, h: 100 }, 700, 700), GIF);
  await page.waitForTimeout(300);
  const down = await page.evaluate(() => { const w = document.querySelector('.lab-warn'); return { hidden: !w || w.hidden, n: Wall.store.get().items.length }; });
  const fits = await saved();
  check('the first save that fits again takes the line down, and everything is on the disk',
    down.hidden && !!fits && fits.items.length === down.n && fits.items.length === before.items.length + 2, JSON.stringify(down) + ', saved ' + (fits && fits.items.length));

  check('no page errors', errors.length === 0, errors.join(' | '));
  const fails = results.filter(r => !r.ok).length;
  console.log(`\n${results.length - fails}/${results.length} passed`);
  await browser.close();
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
