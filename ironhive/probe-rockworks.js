/* ironhive/probe-rockworks.js — the Rockworks kit (the eighth sheet,
   Downloads/assets/Rockworks Sticker Kit.html: sixteen pieces of ground
   cover in three rk-* kits) is really in the drawer, draws WHOLE, and paints
   on the paper. Driven through the dock and the drawer the way a hand does
   it: the fetch hangs off the STICKER tool going down (sticker-kits.js), so
   pressing the button is the only way to test the thing that actually ships.

     1   the catalogue lands whole — every sticker and kit sticker-kits.json
         holds, read off the file, no orphans, no id claimed twice — and all
         sixteen are in it, each at the size its sheet drew it (nothing grown)
     2   three chips, the sheet's kit names with "Rockworks" in front, each
         holding its own pieces and nothing else (5 · 6 · 5)
     3   the search: a piece's own name finds that piece alone; "rockworks"
         narrows to exactly the sixteen, and the count line says 16 OF N
     4   every pocket draws the whole drawing in its own box: the viewBox is
         the filed one, every path made it in, and — MEASURED BY RASTERISING,
         because Chrome ignores getBBox({stroke:true}) — all of the ink is
         inside the box and fills it (the sheet says "trimmed to ink"). And
         the measure can fail: the same drawing in a box 8u too tight all
         round must be caught spilling off all four sides
     5   nothing in the new art can leak into the bench (§3)
     6   a click on a card and a click on the paper stamp it, and every shape
         paints; the sheet's own paper test — the six it stamps together on
         the ground as its id-collision check — paints each of the six just as
         it paints alone; and no stylesheet was added
     7   two pictures: the drawer narrowed to Rockworks, and the six on the
         paper — rockworks-drawer.png, rockworks-paper.png

   Run with the site's serve.js already up on 4321:  node ironhive/probe-rockworks.js
*/
const fs = require('fs'), path = require('path');
const { chromium } = require('playwright');

/* What the drawer must end up holding is whatever the file it is filled from
   holds — the totals are read off sticker-kits.json, so the next sheet
   cannot turn this red. */
const FILE = JSON.parse(fs.readFileSync(path.join(__dirname, 'sticker-kits.json'), 'utf8'));

/* The three kits the sheet arrived with: id, the name they are filed under
   here, and how many pieces each brought. */
const KITS = [
  ['rk-scree', 'Rockworks Scree & Chips', 5],
  ['rk-bldr', 'Rockworks Boulders', 6],
  ['rk-slab', 'Rockworks Slabs & Outcrops', 5]
];

/* EVERY PIECE AT THE SIZE ITS SHEET DREW IT, copied off the export — so a
   box grown later is a decision this file has to be told about (growing a
   box that has shipped re-scales every stamp of it already on the paper). */
const SHEET = {
  'rk-scree-drift': [420, 144], 'rk-pebble-scatter': [420, 133], 'rk-rubble-pile': [440, 174],
  'rk-shale-flakes': [460, 145], 'rk-gravel-bar': [480, 144],
  'rk-boulder-pair': [400, 180], 'rk-boulder-trio': [430, 167], 'rk-boulder-heap': [470, 216],
  'rk-split-boulder': [420, 163], 'rk-perched-block': [400, 267], 'rk-lone-erratic': [400, 228],
  'rk-shelf-outcrop': [500, 199], 'rk-tilted-slab': [420, 339], 'rk-stack-cairn': [400, 295],
  'rk-bank-spur': [540, 207], 'rk-fallen-slab': [470, 129]
};
const IDS = Object.keys(SHEET);

/* THE SHEET'S OWN PAPER TEST: the six it stamps side by side on a ground
   plane under the heading "the id-collision check" (the export's
   renderVals(), `picks`). */
const PAPER = ['rk-bank-spur', 'rk-boulder-trio', 'rk-lone-erratic', 'rk-stack-cairn', 'rk-scree-drift', 'rk-tilted-slab'];

let fails = 0;
const say = (ok, what, extra) => {
  if (!ok) fails++;
  console.log((ok ? '  PASS  ' : '  FAIL  ') + what + (extra == null || extra === '' ? '' : '   ' + extra));
};
const paths = d => (d.match(/<path\b/g) || []).length;

/* INK, NOT GEOMETRY — probe-globe.js's measure. The markup is parsed the way
   a pocket parses it (innerHTML), serialised, and rasterised UNCLIPPED, 8 px
   to the unit, and every pixel at least half covered counts as ink. The
   answer is how far the ink runs past each edge of 0 0 w h, in the drawing's
   own units: at or under zero is inside. The margin is a flat 40u rather
   than half the long edge, which on a 540-wide piece would be a 200 MB
   readback — these strokes are 9 wide at most, and a spill of 40 or more
   reads as 40, which fails just the same. */
async function spill({ d, w, h }) {
  const M = 40, K = 8;
  const VW = w + 2 * M, VH = h + 2 * M, PW = Math.ceil(VW * K), PH = Math.ceil(VH * K);
  const box = document.createElement('div');
  box.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="' + PW + '" height="' + PH +
    '" viewBox="' + (-M) + ' ' + (-M) + ' ' + VW + ' ' + VH + '">' + d + '</svg>';
  const img = new Image();
  img.src = 'data:image/svg+xml;charset=utf-8,' +
    encodeURIComponent(new XMLSerializer().serializeToString(box.firstChild));
  await img.decode();
  const c = document.createElement('canvas');
  c.width = PW; c.height = PH;
  const cx = c.getContext('2d');
  cx.drawImage(img, 0, 0);
  const px = cx.getImageData(0, 0, PW, PH).data;
  let a = Infinity, b = Infinity, r = -1, q = -1;
  for (let y = 0; y < PH; y++)
    for (let x = 0; x < PW; x++)
      if (px[(y * PW + x) * 4 + 3] > 127) {
        if (x < a) a = x;
        if (x > r) r = x;
        if (y < b) b = y;
        if (y > q) q = y;
      }
  if (r < 0) return null;
  const f = v => Math.round(v * 100) / 100;
  return { L: f(M - a / K), T: f(M - b / K), R: f((r + 1) / K - M - w), B: f((q + 1) / K - M - h) };
}
const worst = s => Math.max(s.L, s.T, s.R, s.B);

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: false,
    args: ['--window-size=1616,1110', '--window-position=0,0'] });
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => { errs.push(String(e)); console.log('PAGEERROR', String(e)); });
  page.on('console', m => { if (m.type() === 'error') console.log('CONSOLE', m.text()); });

  const done = async () => {
    say(!errs.length, 'no page errors', errs.join(' | '));
    console.log('\n' + (fails ? fails + ' FAILED' : 'all checks passed'));
    await page.waitForTimeout(500);
    await browser.close();
    process.exit(fails ? 1 : 0);
  };

  await page.goto('http://localhost:4321/ironhive/', { waitUntil: 'load' });
  await page.evaluate(() => { try { localStorage.clear(); } catch (e) {} });
  await page.reload({ waitUntil: 'load' });
  await page.waitForFunction(() => window.Lab && window.Wall && window.Stickers);

  /* ── 1 · press STICKER, the way a hand does, and let the fetch happen ──── */
  await page.click('.dock-btn[data-tool="sticker"]');
  await page.waitForFunction(() => window.Stickers.list.length > 0, null, { timeout: 15000 });
  await page.waitForTimeout(400);

  const cat = await page.evaluate(() => {
    const kits = Stickers.kits, list = Stickers.list, known = new Set(kits.map(k => k.id));
    return { n: list.length, k: kits.length,
      orphans: list.filter(s => !known.has(s.kit)).map(s => s.id),
      dupes: list.map(s => s.id).filter((id, i, a) => a.indexOf(id) !== i) };
  });
  say(cat.n === FILE.stickers.length, 'the catalogue lands whole', cat.n + ' of ' + FILE.stickers.length + ' stickers');
  say(cat.k === FILE.kits.length, 'every kit is on the shelf', cat.k + ' of ' + FILE.kits.length + ' kits');
  say(!cat.orphans.length, 'no sticker points at a kit that is not there', cat.orphans.join(',') || 'none');
  say(!cat.dupes.length, 'no id is claimed twice', cat.dupes.join(',') || 'none');

  const rk = await page.evaluate(ids => ids.map(id => {
    const s = Stickers.get(id);
    return s ? { id, name: s.name, kit: s.kit, w: s.w, h: s.h, d: s.d } : { id, missing: true };
  }), IDS);
  const missing = rk.filter(s => s.missing).map(s => s.id);
  say(!missing.length, 'all sixteen Rockworks pieces are in the drawer',
    missing.length ? 'missing ' + missing.join(',') : rk.length + ' of ' + IDS.length);
  if (missing.length) return done();
  const grown = rk.filter(s => s.w !== SHEET[s.id][0] || s.h !== SHEET[s.id][1]).map(s => s.id + ' ' + s.w + '×' + s.h);
  say(!grown.length, 'each filed at the size its sheet drew it — nothing grown', grown.join(', '));
  const strays = await page.evaluate(ids =>
    Stickers.list.filter(s => /^rk-/.test(s.kit) && ids.indexOf(s.id) < 0).map(s => s.id), IDS);
  say(!strays.length, 'and nothing else is filed under an rk-* kit', strays.join(',') || 'none');

  /* ── 2 · the three chips, named, and holding their own ─────────────────── */
  const count = () => page.evaluate(() => (document.getElementById('sd-count') || {}).textContent || '');
  const cards = () => page.evaluate(() => [...document.querySelectorAll('.sd-card')].map(c => c.dataset.id));
  for (const [id, name, n] of KITS) {
    const label = await page.evaluate(k => {
      const c = document.querySelector('.sd-chip[data-kit="' + k + '"]');
      return c && c.textContent.trim();
    }, id);
    await page.click('.sd-chip[data-kit="' + id + '"]');
    await page.waitForTimeout(150);
    const held = (await cards()).sort();
    const own = rk.filter(s => s.kit === id).map(s => s.id).sort();
    say(label === name.toUpperCase() && held.length === n && JSON.stringify(held) === JSON.stringify(own),
      'chip ' + name.toUpperCase() + ' holds its ' + n + ' and nothing else',
      JSON.stringify(label) + ' · ' + held.length + ' card(s)');
  }
  await page.click('.sd-chip[data-kit=""]');            // back to ALL
  await page.waitForTimeout(150);

  /* ── 3 · the search, by a piece's name and by the word on the tin ──────── */
  const search = async q => {
    await page.fill('.sd-search input', q);
    await page.waitForTimeout(200);
    return cards();
  };
  const byName = await search('erratic');
  say(byName.length === 1 && byName[0] === 'rk-lone-erratic', 'searching "erratic" finds the Lone Erratic and nothing else',
    byName.join(',') || 'nothing');
  const byTin = await search('rockworks');
  say(byTin.length === IDS.length && byTin.every(id => SHEET[id]), 'searching "rockworks" finds the sixteen and nothing else',
    byTin.length + ' card(s)');
  const line = await count();
  say(line === IDS.length + ' OF ' + FILE.stickers.length + ' STICKERS', 'the count line says so', JSON.stringify(line));

  /* ── 4 · every pocket: the right box, every path, all the ink inside ───── */
  const pockets = await page.evaluate(ids => ids.map(id => {
    const svg = document.querySelector('.sd-card[data-id="' + id + '"] svg');
    if (!svg) return { id, why: 'no pocket' };
    const b = svg.getBBox();
    return { id, vb: svg.getAttribute('viewBox'), bw: b.width, bh: b.height, paths: svg.querySelectorAll('path').length };
  }), IDS);
  const badBox = pockets.filter(p => p.why || p.vb !== '0 0 ' + SHEET[p.id][0] + ' ' + SHEET[p.id][1] || !(p.bw > 1 && p.bh > 1))
    .map(p => p.id + ':' + (p.why || p.vb));
  say(!badBox.length, 'every pocket draws in the box its piece was filed at', badBox.join(' ') || pockets.length + ' of 16');
  const lost = pockets.filter(p => !p.why && p.paths !== paths(rk.find(s => s.id === p.id).d)).map(p => p.id);
  say(!lost.length, 'and every path of every drawing made it into its pocket',
    lost.join(',') || pockets.reduce((a, p) => a + (p.paths || 0), 0) + ' paths');

  const ink = [];
  for (const s of rk) ink.push({ id: s.id, w: s.w, h: s.h, m: await page.evaluate(spill, { d: s.d, w: s.w, h: s.h }) });
  const out = ink.filter(r => !r.m || worst(r.m) > 0.5).map(r => r.id + ' ' + (r.m ? JSON.stringify(r.m) : 'no ink'));
  const least = Math.min(...ink.filter(r => r.m).map(r => -worst(r.m)));
  say(!out.length, 'every bit of ink in all sixteen is inside its own box, so the pocket clips nothing',
    out.join('  ') || 'tightest clearance ' + least.toFixed(2) + 'u');
  const air = ink.filter(r => r.m && (r.w + r.m.L + r.m.R) * (r.h + r.m.T + r.m.B) < 0.9 * r.w * r.h)
    .map(r => r.id + ' ' + Math.round(100 * (r.w + r.m.L + r.m.R) * (r.h + r.m.T + r.m.B) / (r.w * r.h)) + '%');
  say(!air.length, 'and the ink fills its box — trimmed to the ink, as the sheet says (at least 90%)', air.join(' '));
  const T = rk.find(s => s.id === 'rk-bank-spur');
  const tight = await page.evaluate(spill, { d: '<g transform="translate(-8 -8)">' + T.d + '</g>', w: T.w - 16, h: T.h - 16 });
  say(!!tight && tight.L > 2 && tight.T > 2 && tight.R > 2 && tight.B > 2,
    '…and the same measure catches the Bank Spur in a box 8u too tight all round', tight ? JSON.stringify(tight) : 'no ink');

  /* The first picture, while the drawer is narrowed to the sixteen — pulled
     to its widest by its GRIP, so more of them are in the shot. A real pull,
     not a write of --lp-w: the grip's put() is what measures the dock and
     stops the panel above it (lab.js, AND IT MUST NOT COME TO REST ON THE
     DOCK), so the variable written by hand paints a drawer lying across the
     tool buttons that no hand could have made. */
  const g = await page.locator('#stickers .lp-grip').boundingBox();
  if (g) {
    const gx = g.x + g.width / 2, gy = g.y + g.height / 2;
    await page.mouse.move(gx, gy);
    await page.mouse.down();
    for (let i = 1; i <= 12; i++) await page.mouse.move(gx + 400 * i / 12, gy);
    await page.mouse.up();
  }
  await page.mouse.move(1500, 960);
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(__dirname, 'rockworks-drawer.png') });

  /* ── 5 · nothing in it can leak into the bench (§3) ────────────────────── */
  const RULES = [[/<style/i, '<style>'], [/\bclass\s*=/i, 'class'], [/currentColor/i, 'currentColor'],
    [/\sid\s*=/i, 'id'], [/url\(#/i, 'url(#)'], [/<script|href\s*=|<use\b|<image\b/i, 'external'],
    [/vector-effect/i, 'vector-effect']];
  const leaks = [];
  rk.forEach(s => RULES.forEach(([re, n]) => { if (re.test(s.d)) leaks.push(s.id + ':' + n); }));
  say(!leaks.length, 'no <style>, class, currentColor, id or external reference in any of the sixteen', leaks.join(' ') || 'clean');

  /* ── 6 · picked up off its card, stamped with a click ───────────────────── */
  const sheets = await page.evaluate(() => document.styleSheets.length);
  await page.evaluate(() => { Wall.store.update(st => { st.items = []; }); Wall.paint(); });
  const ID = 'rk-lone-erratic', card = '.sd-card[data-id="' + ID + '"]';
  await search('erratic');
  await page.click(card);
  say(await page.evaluate(() => (Stickers.armed() || {}).id) === ID, 'a click on its card puts the Lone Erratic on the pointer');
  await page.mouse.click(1060, 470);
  await page.waitForTimeout(300);
  const stamps = await page.evaluate(id => Wall.store.get().items.filter(it => it && it.k === 'd' && it.f === id), ID);
  say(stamps.length === 1, 'a click on the paper stamps it',
    stamps.length + ' stamp(s)' + (stamps[0] ? ' at ' + stamps[0].x + ',' + stamps[0].y + ' · long edge ' + stamps[0].z : ''));

  /* A DESCENDANT, NOT A CHILD: paint() hangs every stamp inside one named pile
     <g>, so this asks what wall.js itself asks. */
  const WI = 'svg.wall-ink .wall-item';
  const want = paths(rk.find(s => s.id === ID).d);
  const solo = await page.evaluate(sel => {
    const n = document.querySelectorAll(sel);
    if (n.length !== 1) return { n: n.length };
    const b = n[0].getBBox();
    return { n: 1, w: b.width, h: b.height, paths: n[0].querySelectorAll('path').length };
  }, WI);
  say(solo.n === 1 && solo.paths === want && solo.w > 1 && solo.h > 1, 'it paints on the paper, every one of its ' + want + ' shapes',
    solo.n === 1 ? solo.paths + ' shapes, ' + Math.round(solo.w) + ' × ' + Math.round(solo.h) : solo.n + ' painted');
  if (await page.evaluate(() => !!Stickers.armed())) await page.click(card);   // take it off the pointer

  /* THE SHEET'S PAPER TEST. Each of the six stamped ALONE and measured, then
     all six together and measured again: a drawing another one disturbs — a
     shared id, a leaked style — comes out a different size or short of
     shapes. Nothing has an L, so the pile paints in stamping order and the
     i-th node is the i-th stamp. */
  const at = i => [640 + (i % 3) * 400, 320 + Math.floor(i / 3) * 360];
  const alone = [];
  for (let i = 0; i < PAPER.length; i++) {
    alone.push(await page.evaluate(([id, x, y, sel]) => {
      Wall.store.update(st => { st.items = []; });
      Wall.stickerAt(Stickers.get(id), x, y);
      Wall.paint();
      const n = document.querySelectorAll(sel);
      if (n.length !== 1) return null;
      const b = n[0].getBBox();
      return { w: b.width, h: b.height, paths: n[0].querySelectorAll('path').length };
    }, [PAPER[i], ...at(i), WI]));
  }
  const together = await page.evaluate(([ids, pts, sel]) => {
    Wall.store.update(st => { st.items = []; });
    ids.forEach((id, i) => Wall.stickerAt(Stickers.get(id), pts[i][0], pts[i][1]));
    Wall.paint();
    return [...document.querySelectorAll(sel)].map(el => {
      const b = el.getBBox();
      return { w: b.width, h: b.height, paths: el.querySelectorAll('path').length };
    });
  }, [PAPER, PAPER.map((_, i) => at(i)), WI]);
  say(together.length === PAPER.length, "the sheet's paper test: all six stamped together paint", together.length + ' of ' + PAPER.length);
  const moved = PAPER.filter((id, i) => {
    const a = alone[i], t = together[i], n = paths(rk.find(s => s.id === id).d);
    return !a || !t || Math.abs(a.w - t.w) > 0.6 || Math.abs(a.h - t.h) > 0.6 || a.paths !== n || t.paths !== n;
  });
  say(!moved.length, '…each of the six exactly as it paints alone, every shape — no collision', moved.join(',') || '');
  say(await page.evaluate(() => document.styleSheets.length) === sheets, 'painting the art added no stylesheet to the bench');

  /* ── 7 · the second picture: the six on the ground ──────────────────────── */
  /* The search box still has focus, and a keystroke aimed at the bench would
     land in it — blur it, put the sticker tool down so the drawer steps
     aside, and frame the work the way shift 1 does. */
  await page.evaluate(() => { const i = document.querySelector('.sd-search input'); if (i) i.blur(); });
  await page.click('.dock-btn[data-tool="move"]');
  await page.evaluate(() => Lab.fit());
  await page.mouse.move(1560, 40);
  await page.waitForTimeout(900);
  await page.screenshot({ path: path.join(__dirname, 'rockworks-paper.png') });

  await done();
})();
