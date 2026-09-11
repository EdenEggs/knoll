/* ironhive/probe-billboard.js — the Ruinworks Billboard Kit is really in the
   drawer, and every piece of it really draws. Driven through the dock, not by
   calling Stickers directly: the fetch this bench does is hung off the STICKER
   tool going down (sticker-kits.js), so pressing the button is the only way to
   test the thing that actually ships.

     1   the catalogue lands whole — every sticker and kit sticker-kits.json
         holds, read off the file (it was 288 in 33 when this was written;
         a later sheet must not turn this red), no orphans
     2   the eight bb-* chips are there, named so a search for "billboard"
         finds them (STICKERS.md §6), and each chip counts what it holds
     3   the search narrows to exactly the 67 new pieces, by kit name
     4   every one of the 67 draws something in its pocket — a non-empty
         bbox is the one cheap test that catches markup that died on the
         way in, and the thumbnail is the whole drawing, not a corner
     5   nothing in the new art can leak into the bench: no <style>, no
         class, no currentColor, no id worth colliding over (§3)
     6   stamped on the paper they paint, and two stamped together look the
         same as each alone — the id-collision test §8 asks for
     7   and the kit does what it is for: the proof sheet's own "Kilometre
         40" scene, butted edge to edge on the real paper

   Run with the site's serve.js already up on 4321:  node ironhive/probe-billboard.js
*/
const fs = require('fs'), path = require('path');
const { chromium } = require('playwright');

/* What the drawer must end up holding is whatever the file it is filled from
   holds — so the totals are read off sticker-kits.json, not written in here. */
const FILE = JSON.parse(fs.readFileSync(path.join(__dirname, 'sticker-kits.json'), 'utf8'));

let fails = 0;
const say = (ok, what, extra) => {
  if (!ok) fails++;
  console.log((ok ? '  PASS  ' : '  FAIL  ') + what + (extra == null ? '' : '   ' + extra));
};

/* The eight kits the sheet arrived with, and what each should hold. */
const BB = [
  ['bb-face',   'Billboard Faces'],
  ['bb-frame',  'Billboard Backing & Frames'],
  ['bb-leg',    'Billboard Legs & Columns'],
  ['bb-deck',   'Billboard Catwalks & Ladders'],
  ['bb-lamp',   'Billboard Lamp Arms'],
  ['bb-base',   'Billboard Footings & Bases'],
  ['bb-debris', 'Billboard Debris'],
  ['bb-extra',  'Billboard Toppers & Growth']
];

/* THE PROOF SHEET'S OWN SCENE, copied off the Billboard Kit export's
   scenes() — piece id, then the x/y it is dropped at. The point of the kit is
   that these butt against each other on a 120u bay module, so a scene that
   comes out looking like a billboard is the real proof the geometry survived
   the trip; a scene that comes out as a scatter of parts is not. */
const KM40 = [
  ['bb-face-3bay-tag', 74, 54], ['bb-catwalk-3bay', 62, 206],
  ['bb-lamps-3bay', 52, 244], ['bb-monopole-fat', 218, 262],
  ['bb-collar', 197, 508], ['bb-ladder-cage', 436, 268],
  ['bb-scrub-run', 118, 512], ['bb-rubble', 330, 508]
];

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
  await page.waitForFunction(() => window.Lab && window.Wall && window.Stickers);

  /* ── 1 · press STICKER, the way a hand does, and let the fetch happen ──── */
  await page.click('.dock-btn[data-tool="sticker"]');
  await page.waitForFunction(() => window.Stickers.list.length > 0, null, { timeout: 15000 });
  await page.waitForTimeout(400);

  const cat = await page.evaluate(() => {
    const kits = Stickers.kits, list = Stickers.list;
    const known = new Set(kits.map(k => k.id));
    return { n: list.length, k: kits.length,
      orphans: list.filter(s => !known.has(s.kit)).map(s => s.id),
      dupes: list.map(s => s.id).filter((id, i, a) => a.indexOf(id) !== i) };
  });
  say(cat.n === FILE.stickers.length, 'the catalogue lands whole', cat.n + ' of ' + FILE.stickers.length + ' stickers');
  say(cat.k === FILE.kits.length, 'all ' + FILE.kits.length + ' kits are on the shelf', cat.k + ' kits');
  say(!cat.orphans.length, 'no sticker points at a kit that is not there', cat.orphans.join(',') || 'none');
  say(!cat.dupes.length, 'no id is claimed twice', cat.dupes.join(',') || 'none');

  /* ── 2 · the eight new chips, named and counted ────────────────────────── */
  const chips = await page.evaluate(() =>
    [...document.querySelectorAll('.sd-chip')].map(c => (c.textContent || '').trim()));
  const counts = await page.evaluate(BBIDS =>
    BBIDS.map(id => Stickers.list.filter(s => s.kit === id).length), BB.map(b => b[0]));

  let bbTotal = 0;
  BB.forEach(([id, name], i) => {
    const label = name.toUpperCase();
    const there = chips.some(t => t.toUpperCase().includes(label));
    bbTotal += counts[i];
    say(there && counts[i] > 0, 'chip ' + label, counts[i] + ' pieces');
  });
  say(bbTotal === 67, 'the sheet brought all 67 pieces', String(bbTotal));

  /* ── 3 · a search for the word on the tin ──────────────────────────────── */
  await page.fill('.sd-search input, input.sd-search, .sd-find input', 'billboard').catch(async () => {
    const sel = await page.evaluate(() => {
      const i = document.querySelector('.lab-panel input[type="search"], .lab-panel input[type="text"]');
      return i ? (i.className ? '.' + i.className.split(/\s+/)[0] : 'input') : null;
    });
    if (sel) await page.fill(sel, 'billboard');
  });
  await page.waitForTimeout(250);
  const found = await page.evaluate(() => document.querySelectorAll('.sd-card').length);
  say(found === 67, 'searching "billboard" finds the kit and nothing else', found + ' cards');
  const line = await page.evaluate(() => {
    const el = [...document.querySelectorAll('.lab-panel *')]
      .find(n => /STICKERS?$/i.test((n.textContent || '').trim()) && n.children.length === 0);
    return el ? el.textContent.trim() : '';
  });
  say(new RegExp('67\\s+OF\\s+' + FILE.stickers.length, 'i').test(line), 'the count line says so too', JSON.stringify(line));

  /* ── 4 · every pocket has a drawing in it, and it fills the pocket ─────── */
  const pockets = await page.evaluate(() => {
    const out = [];
    document.querySelectorAll('.sd-card').forEach(c => {
      const svg = c.querySelector('svg');
      if (!svg) return out.push({ id: c.dataset.id, why: 'no svg' });
      /* STROKE-AWARE, OR MEANT TO BE. The plain bbox is the geometry alone,
         and almost every piece here is a stroke — a 7-wide rebar whisker
         centred on the box edge hangs 3.5u into the clip and a geometry bbox
         never sees it.
         BUT CHROME IGNORES THE OPTIONS (found 2026-09-10, Chrome 153): its
         getBBox takes no argument, so {stroke:true} hands back the geometry
         box — a 10-wide stroke round a 10×10 rect measures 10×10 on a <rect>,
         a <g> and an <svg> alike. So the overhang check below is GEOMETRY-
         ONLY and cannot see a stroke past the box. Rasterised instead (the
         way probe-globe.js measures), 15 of these 67 do run past their
         viewBox — by at most 3.7u, at most 1.8% of a long edge. Not fixed
         with the globe: growing a box that has shipped re-scales and shifts
         every stamp of it already on the paper, which un-butts a scene. */
      let b;
      try { b = svg.getBBox({ stroke: true, fill: true, markers: true }); }
      catch (e) {
        try { b = svg.getBBox(); } catch (e2) { return out.push({ id: c.dataset.id, why: 'getBBox threw' }); }
      }
      const vb = (svg.getAttribute('viewBox') || '').split(/\s+/).map(Number);
      out.push({ id: c.dataset.id, x: b.x, y: b.y, w: b.width, h: b.height, vw: vb[2], vh: vb[3] });
    });
    return out;
  });
  const empty = pockets.filter(p => p.why || !(p.w > 0.5 && p.h > 0.5));
  say(!empty.length, 'all 67 draw something in the pocket',
    empty.length ? empty.slice(0, 5).map(p => p.id + ':' + (p.why || 'empty')).join(' ') : '');

  /* The ink should fill the box it declares. A drawing that covers a third of
     its own viewBox is a thumbnail with a hole in it, and a stamp that misses
     the point the user clicked (§4). Slack is generous — round pieces and
     scatters legitimately leave corners — but a piece under 25% is wrong. */
  const thin = pockets.filter(p => !p.why && p.vw &&
    (p.w * p.h) / (p.vw * p.vh) < 0.25);
  say(!thin.length, 'no viewBox is mostly empty air',
    thin.length ? thin.map(p => p.id + ' ' + Math.round(100 * p.w * p.h / (p.vw * p.vh)) + '%').join(' ') : '');

  /* OVERHANG. The pocket's <svg> clips at its viewBox, so ink outside the box
     is ink the drawer cuts off — and the same corner goes missing on the
     paper. Measured against the box the piece declares, with a hair of slack
     for round joins. */
  const clipped = pockets.filter(p => !p.why && p.vw &&
      (p.x < -0.5 || p.y < -0.5 || p.x + p.w > p.vw + 0.5 || p.y + p.h > p.vh + 0.5))
    .map(p => ({ id: p.id, spill: 'L' + Math.max(0, -p.x).toFixed(1) + ' T' + Math.max(0, -p.y).toFixed(1) +
      ' R' + Math.max(0, p.x + p.w - p.vw).toFixed(1) + ' B' + Math.max(0, p.y + p.h - p.vh).toFixed(1) }));
  say(!clipped.length, 'no GEOMETRY overhangs its viewBox (strokes unseen — see the note above)',
    clipped.length ? clipped.map(p => p.id + ' ' + p.spill).join('  ') : '');

  await page.screenshot({ path: 'ironhive/billboard-drawer.png' });

  /* ── 5 · nothing in the new art can leak into the bench (§3) ───────────── */
  const leaks = await page.evaluate(() => {
    const bad = [];
    Stickers.list.filter(s => s.kit.startsWith('bb-')).forEach(s => {
      const d = s.d;
      if (/<style/i.test(d)) bad.push(s.id + ':style');
      if (/\bclass\s*=/i.test(d)) bad.push(s.id + ':class');
      if (/currentColor/i.test(d)) bad.push(s.id + ':currentColor');
      if (/\sid\s*=/i.test(d)) bad.push(s.id + ':id');
      if (/url\(#/i.test(d)) bad.push(s.id + ':url(#)');
      if (/<script|href\s*=|<use\b|<image\b/i.test(d)) bad.push(s.id + ':external');
      if (/vector-effect/i.test(d)) bad.push(s.id + ':vector-effect');
    });
    return bad;
  });
  say(!leaks.length, 'no <style>, class, currentColor, id or external reference', leaks.join(' '));

  const sheetCount = await page.evaluate(() => document.styleSheets.length);

  /* ── 6 · stamped on the paper, alone and together ──────────────────────── */
  const A = 'bb-face-3bay-tag', B = 'bb-lamps-3bay';
  /* A DESCENDANT, NOT A CHILD (fixed 2026-09-10). paint() now hangs every
     stamp inside one named pile <g> — the smear blurs the wall through it —
     so the child selector this had found nothing, and these paint checks
     failed on art that was painting fine. It asks what wall.js asks now. */
  const WI = 'svg.wall-ink .wall-item';
  const solo = await page.evaluate(([a, sel]) => {
    Wall.store.update(st => { st.items = []; });
    Wall.paint();
    Wall.stickerAt(Stickers.get(a), 900, 700);
    Wall.paint();
    const one = document.querySelector(sel);
    if (!one) return null;
    const r = one.getBBox();
    return { w: r.width, h: r.height, n: one.querySelectorAll('*').length };
  }, [A, WI]);

  const both = await page.evaluate(([a, b, sel]) => {
    Wall.store.update(st => { st.items = []; });
    Wall.paint();
    Wall.stickerAt(Stickers.get(a), 900, 700);
    Wall.stickerAt(Stickers.get(b), 900, 1100);
    Wall.paint();
    return [...document.querySelectorAll(sel)].map(g => {
      const r = g.getBBox();
      return { w: r.width, h: r.height, n: g.querySelectorAll('*').length };
    });
  }, [A, B, WI]);

  say(solo && solo.w > 1 && solo.h > 1, 'a billboard face stamps and paints',
    solo ? Math.round(solo.w) + '×' + Math.round(solo.h) : 'nothing painted');
  say(both.length >= 2, 'two stamps at once both paint', both.length + ' painted');
  if (solo && both.length >= 2) {
    const same = Math.abs(both[0].w - solo.w) < 0.6 && Math.abs(both[0].h - solo.h) < 0.6;
    say(same, 'the first is unchanged by the second — no id collision',
      Math.round(both[0].w) + '×' + Math.round(both[0].h) + ' vs ' + Math.round(solo.w) + '×' + Math.round(solo.h));
  }
  say(await page.evaluate(() => document.styleSheets.length) === sheetCount,
    'painting the art added no stylesheet to the bench');

  /* ── 7 · the kit assembled, as the sheet intends it ────────────────────── */
  /* Hand the search box back first. It still has focus and still holds the
     query, so a keystroke aimed at the bench would land in it and the drawer
     would sit over the scene in the shot. */
  await page.evaluate(() => {
    const i = document.querySelector('.lab-panel input');
    if (i) { i.value = ''; i.dispatchEvent(new Event('input', { bubbles: true })); i.blur(); }
    const x = document.querySelector('.lab-panel .lp-close, .lab-panel [aria-label*="lose"], .lab-panel button');
    if (x) x.click();
  });
  await page.waitForTimeout(200);

  /* AT TRUE RELATIVE SCALE, which takes a word of explanation. stickerAt
     normalises every stamp to a common long edge — 160/320/640 world px,
     whatever the piece's own size (§4) — so a 368-wide face and a 32-wide post
     come out the same length, and pieces cut to butt on a 120u module cannot
     butt at one size setting. That is the bench's design, not a fault in the
     kit, and by hand you fix it with the scale corner.
     Here we stamp through the ordinary door and then set each piece's own z
     to its natural long edge × one shared K, which is exactly what hand-
     scaling arrives at — so the scene comes out as the sheet draws it, and
     any piece whose geometry did not survive the trip shows up as a gap. */
  await page.evaluate(scene => {
    Wall.store.update(st => { st.items = []; });
    Wall.paint();
    scene.forEach(([id]) => {
      const s = Stickers.get(id);
      if (s) Wall.stickerAt(s, 0, 0);          // the real door, for real item fields
    });
    const OX = 300, OY = 120, K = 1.9;         // the scene's own coords, scaled up
    Wall.store.update(st => {
      st.items.forEach((it, i) => {
        const [id, x, y] = scene[i];
        const s = Stickers.get(id);
        it.z = K * Math.max(s.w, s.h);         // paint's sc = z / max(w,h) → K
        it.x = Math.round(OX + (x + s.w / 2) * K);   // x/y is the centre
        it.y = Math.round(OY + (y + s.h / 2) * K);
      });
    });
    Wall.paint();
  }, KM40);
  await page.waitForTimeout(200);

  const placed = await page.evaluate(() =>
    [...document.querySelectorAll('svg.wall-ink .wall-item')]
      .filter(g => { const r = g.getBBox(); return r.width > 1 && r.height > 1; }).length);
  say(placed === KM40.length, 'the "Kilometre 40" scene assembles, every piece drawing',
    placed + ' of ' + KM40.length + ' pieces');

  const framed = await page.evaluate(() => {
    if (!(window.Lab && typeof Lab.fit === 'function')) return false;
    Lab.fit();                                  // what shift 1 does, called directly
    return true;
  });
  say(framed, 'the camera frames the scene');
  await page.waitForTimeout(900);
  await page.screenshot({ path: 'ironhive/billboard-scene.png' });

  say(!errs.length, 'no page errors', errs.join(' | '));
  console.log('\n' + (fails ? fails + ' FAILED' : 'all checks passed'));
  await page.waitForTimeout(500);
  await browser.close();
  process.exit(fails ? 1 : 0);
})();
