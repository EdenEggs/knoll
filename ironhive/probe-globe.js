/* ironhive/probe-globe.js — the Iron Globe (ih-web-globe, off the sheet
   marked IH-0005) is really in the drawer, draws WHOLE, and paints on the
   paper. Driven through the dock and the drawer the way a hand does it: the
   fetch hangs off the STICKER tool going down (sticker-kits.js), so pressing
   the button is the only way to test the thing that actually ships.

     1   the catalogue lands whole — every sticker and kit sticker-kits.json
         holds, no orphans, no id claimed twice — and the globe is in it, at
         the size it was filed at
     2   its chip reads SOCIAL MARKS and holds the globe and nothing else
     3   the search finds it by its own name ("globe") and by its kit's
         ("social"), and the count line says 1 OF N
     4   every bit of its ink is inside its own viewBox. MEASURED BY
         RASTERISING, because Chrome ignores getBBox({stroke:true}) — this
         probe prints whether it still does — and a stroke is exactly what
         hung out of the sheet's box. And the check can fail: the sheet's own
         box, 0 0 124 153, goes through the same measure and must be caught
         clipping the top and the left of the ring
     5   nothing in it can leak into the bench (§3)
     6   a click on its card and a click on the paper stamp it; all of it
         paints; a second sticker stamped beside it changes nothing about it;
         and no stylesheet was added
     7   a picture: the drawer narrowed to the globe, and the globe on the
         paper — globe-drawer.png

   Run with the site's serve.js already up on 4321:  node ironhive/probe-globe.js
*/
const fs = require('fs'), path = require('path');
const { chromium } = require('playwright');

const FILE = JSON.parse(fs.readFileSync(path.join(__dirname, 'sticker-kits.json'), 'utf8'));
const ID = 'ih-web-globe', KIT = 'ih-social';

/* THE SHEET'S OWN BOX, for the check that has to be able to fail: the sheet
   hung this same drawing in 0 0 124 153 through translate(-14.8 -13), where
   the drawer's entry uses 0 0 128 157 through translate(-11 -9). */
const SHEET = { w: 124, h: 153, was: 'translate(-14.8 -13)', now: 'translate(-11 -9)' };

let fails = 0;
const say = (ok, what, extra) => {
  if (!ok) fails++;
  console.log((ok ? '  PASS  ' : '  FAIL  ') + what + (extra == null ? '' : '   ' + extra));
};
const note = (what, extra) => console.log('  NOTE  ' + what + (extra == null ? '' : '   ' + extra));

/* INK, NOT GEOMETRY. Runs in the page. The markup is parsed the way a pocket
   parses it (innerHTML), serialised, and rasterised UNCLIPPED — half its long
   edge of margin all round, 8 px to the unit — and every pixel at least half
   covered counts as ink. The answer is how far the ink runs past each edge of
   0 0 w h, in the drawing's own units: at or under zero is inside. */
async function spill({ d, w, h }) {
  const L = Math.max(w, h), M = L / 2, K = 8;
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

  const g = await page.evaluate(id => {
    const s = Stickers.get(id);
    return s && { name: s.name, kit: s.kit, w: s.w, h: s.h, d: s.d };
  }, ID);
  say(!!g && g.name === 'Iron Globe' && g.kit === KIT && g.w === 128 && g.h === 157,
    'the globe is in the drawer, filed at 128 × 157', g ? g.name + ' · ' + g.kit + ' · ' + g.w + ' × ' + g.h : 'missing');
  if (!g) return done();

  /* ── 2 · its chip, named, and holding it ───────────────────────────────── */
  const count = () => page.evaluate(() => (document.getElementById('sd-count') || {}).textContent || '');
  const cards = () => page.evaluate(() => [...document.querySelectorAll('.sd-card')].map(c => c.dataset.id));
  const chip = await page.evaluate(k => {
    const c = document.querySelector('.sd-chip[data-kit="' + k + '"]');
    return c && c.textContent.trim();
  }, KIT);
  say(chip === 'SOCIAL MARKS', 'its chip reads SOCIAL MARKS', JSON.stringify(chip));
  await page.click('.sd-chip[data-kit="' + KIT + '"]');
  await page.waitForTimeout(200);
  const inKit = await cards();
  say(inKit.length === 1 && inKit[0] === ID, 'and the chip holds the globe and nothing else', inKit.join(',') || 'empty');
  await page.click('.sd-chip[data-kit=""]');            // back to ALL
  await page.waitForTimeout(150);

  /* ── 3 · a search for it by name, and by its kit's name ────────────────── */
  const search = async q => {
    await page.fill('.sd-search input', q);
    await page.waitForTimeout(200);
    return cards();
  };
  const byKit = await search('social');
  say(byKit.includes(ID), 'searching "social" finds it by its kit\'s name', byKit.length + ' card(s)');
  const byName = await search('globe');
  say(byName.length === 1 && byName[0] === ID, 'searching "globe" finds it and nothing else', byName.join(',') || 'nothing');
  const line = await count();
  say(line === '1 OF ' + FILE.stickers.length + ' STICKERS', 'the count line says so', JSON.stringify(line));

  /* ── 4 · all of its ink inside its own box ──────────────────────────────── */
  const honoured = await page.evaluate(() => {
    const NS = 'http://www.w3.org/2000/svg';
    const s = document.createElementNS(NS, 'svg'), r = document.createElementNS(NS, 'rect');
    s.setAttribute('width', '40'); s.setAttribute('height', '40');
    s.style.cssText = 'position:absolute;left:-999px;top:0';
    [['x', 10], ['y', 10], ['width', 10], ['height', 10], ['fill', 'none'], ['stroke', '#000'], ['stroke-width', 10]]
      .forEach(([k, v]) => r.setAttribute(k, v));
    s.appendChild(r);
    document.body.appendChild(s);
    const w = r.getBBox({ stroke: true }).width;
    s.remove();
    return w;
  });
  note('getBBox({stroke:true}) on a 10-wide stroke round a 10×10 rect gives width ' + honoured,
    honoured === 20 ? '— honoured now; a stroke-aware bbox would do' : '— the option is IGNORED, hence the raster');

  const vb = await page.evaluate(id => {
    const svg = document.querySelector('.sd-card[data-id="' + id + '"] svg');
    return svg && svg.getAttribute('viewBox');
  }, ID);
  say(vb === '0 0 ' + g.w + ' ' + g.h, 'its pocket draws it in its own box', JSON.stringify(vb));

  const mine = await page.evaluate(spill, { d: g.d, w: g.w, h: g.h });
  say(!!mine && worst(mine) <= 0.5, 'every bit of its ink is inside that box, so the pocket clips nothing',
    mine ? 'past each edge, in units: ' + JSON.stringify(mine) : 'no ink found');
  const was = g.d.indexOf(SHEET.now) >= 0
    ? await page.evaluate(spill, { d: g.d.replace(SHEET.now, SHEET.was), w: SHEET.w, h: SHEET.h }) : null;
  say(!!was && was.T > 3 && was.L > 3,
    "…and the same measure catches the sheet's own 0 0 124 153 clipping the ring", was ? JSON.stringify(was) : 'could not rebuild it');

  /* ── 5 · nothing in it can leak into the bench (§3) ────────────────────── */
  const leaks = [[/<style/i, '<style>'], [/\bclass\s*=/i, 'class'], [/currentColor/i, 'currentColor'],
    [/\sid\s*=/i, 'id'], [/url\(#/i, 'url(#)'], [/<script|href\s*=|<use\b|<image\b/i, 'external'],
    [/vector-effect/i, 'vector-effect']].filter(([re]) => re.test(g.d)).map(([, n]) => n);
  say(!leaks.length, 'no <style>, class, currentColor, id or external reference', leaks.join(' ') || 'clean');

  /* ── 6 · picked up off its card, stamped with a click ───────────────────── */
  const sheets = await page.evaluate(() => document.styleSheets.length);
  await page.evaluate(() => { Wall.store.update(st => { st.items = []; }); Wall.paint(); });
  const card = '.sd-card[data-id="' + ID + '"]';
  await page.click(card);
  say(await page.evaluate(() => (Stickers.armed() || {}).id) === ID, 'a click on its card puts it on the pointer');
  await page.mouse.click(1060, 470);
  await page.waitForTimeout(300);
  const stamps = await page.evaluate(id => Wall.store.get().items.filter(it => it && it.k === 'd' && it.f === id), ID);
  say(stamps.length === 1, 'a click on the paper stamps it',
    stamps.length + ' stamp(s)' + (stamps[0] ? ' at ' + stamps[0].x + ',' + stamps[0].y + ' · long edge ' + stamps[0].z : ''));

  /* A DESCENDANT, NOT A CHILD: paint() hangs every stamp inside one named pile
     <g> (the smear blurs the wall through it), so 'svg.wall-ink > g.wall-item'
     finds nothing — this asks what wall.js itself asks. */
  const WI = 'svg.wall-ink .wall-item';              // paint() hangs each stamp here
  const solo = await page.evaluate(sel => {
    const n = document.querySelectorAll(sel);
    if (n.length !== 1) return { n: n.length };
    const b = n[0].getBBox();
    return { n: 1, w: b.width, h: b.height, parts: n[0].querySelectorAll('path,circle,ellipse,rect').length };
  }, WI);
  say(solo.n === 1 && solo.parts >= 24 && solo.w > 1 && solo.h > 1, 'it paints on the paper, all 24 pieces of the drawing',
    solo.n === 1 ? solo.parts + ' shapes, ' + Math.round(solo.w) + ' × ' + Math.round(solo.h) : solo.n + ' painted');

  /* ── 7 · the picture, taken before a second sticker crowds it ───────────── */
  if (await page.evaluate(() => !!Stickers.armed())) await page.click(card);   // take it off the pointer
  await page.mouse.move(200, 960);
  await page.waitForTimeout(250);
  await page.screenshot({ path: path.join(__dirname, 'globe-drawer.png') });

  /* ── 6, continued · a second sticker beside it changes nothing about it ── */
  const both = await page.evaluate(([sel, id]) => {
    const other = Stickers.list.find(s => s.kit === 'ih-spheres');
    const it = Wall.store.get().items.find(i => i && i.f === id);
    Wall.stickerAt(other, it.x + it.z, it.y);
    Wall.paint();
    const n = [...document.querySelectorAll(sel)].map(el => { const b = el.getBBox(); return [b.width, b.height]; });
    return { other: other.id, n };
  }, [WI, ID]);
  say(both.n.length === 2, 'a second sticker stamped beside it paints too', both.other + ', ' + both.n.length + ' painted');
  if (solo.n === 1 && both.n.length === 2) {
    const same = Math.abs(both.n[0][0] - solo.w) < 0.6 && Math.abs(both.n[0][1] - solo.h) < 0.6;
    say(same, 'and the globe is unchanged by it — no collision',
      Math.round(both.n[0][0]) + ' × ' + Math.round(both.n[0][1]) + ' vs ' + Math.round(solo.w) + ' × ' + Math.round(solo.h));
  }
  say(await page.evaluate(() => document.styleSheets.length) === sheets, 'painting it added no stylesheet to the bench');

  await done();
})();
