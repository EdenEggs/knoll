/* lab2/test/perf/verify-kits.js — THE OLD THREE KITS, UNCHANGED.
   ../../perf/verify.js is the live bench's gesture sheet: ctrl-ink, drag,
   undo, the band, copy/paste, delete-and-undo, the corner, raise/lower, and
   the grades at 20 % and 400 %. This is that file pointed at the sandbox,
   whose kits.js has grown a fourth sheet, a style pass and three new section
   attributes. NOTHING in the forest/village/gnome path was meant to move, so
   the same gestures on the same kind of tree must give the same answers.
   Three things differ from the original, and only because the sandbox bench
   is not the live one: the trees are the stand's (stand-*), the sheet count
   is four rather than three, and the cameras are aimed at the stand.
   USAGE (from site/, sandbox server up on 4322):
       node lab2/test/perf/verify-kits.js
   The autosave door is 404'd before the first byte — this file must not
   write index.html. Screenshots land in perf/results/verify-kits-*.png. */
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');
const OUT = path.join(__dirname, 'results');
fs.mkdirSync(OUT, { recursive: true });
const results = [];
const check = (name, ok, info) => { results.push({ name, ok, info }); console.log((ok ? 'PASS ' : 'FAIL ') + name + (info ? ' — ' + info : '')); };

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: false, args: ['--window-size=1616,1110', '--window-position=0,0'] });
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  // the door this file blocks answers 404, and Chrome logs that as an error;
  // it is this script's own doing and not the bench's
  const consoleErrs = [];
  page.on('console', m => { if (m.type() === 'error' && !/404/.test(m.text())) consoleErrs.push(m.text()); });
  await page.route('**/_lab2/**', r => r.fulfill({ status: 404, body: 'no door' }));
  await page.goto('http://localhost:4322/lab2/test/', { waitUntil: 'load' });
  await page.waitForFunction(() => window.Lab && window.Frames && window.Kits && Kits.stats().sheets.length === 4);
  await page.waitForTimeout(1800);

  const look = async (z, wx, wy, ms = 900) => {
    await page.evaluate(([z, wx, wy]) => { const b = Lab.bench.getBoundingClientRect(); Lab.camTo(z, b.width / 2 - wx * z, b.height / 2 - wy * z, 0); }, [z, wx, wy]);
    await page.waitForTimeout(ms);
  };
  const screen = async (id) => page.evaluate(id => {
    const el = document.querySelector('[data-gizmo="' + CSS.escape(id) + '"]'); if (!el) return null;
    const r = el.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height, cx: r.left + r.width / 2, cy: r.top + r.height / 2 };
  }, id);
  const geo = async (id) => page.evaluate(id => {
    const el = document.querySelector('[data-gizmo="' + CSS.escape(id) + '"]'); if (!el) return null;
    return { x: parseFloat(el.style.left), y: parseFloat(el.style.top), w: parseFloat(el.style.width), h: parseFloat(el.style.height),
             z: el.style.zIndex, live: !!el.querySelector('.gz-art > svg'), cls: el.className };
  }, id);

  // ── the stand's own tree, picked the way the original picks one: a tree
  // whose foot is its own, nothing else's box lying over that point
  const tree = await page.evaluate(() => {
    const els = [...document.querySelectorAll('.gz[data-kit="forest"]')].filter(e => e.dataset.part === 'slim-pine' || e.dataset.part === 'the-pine');
    const b = Lab.bench.getBoundingClientRect();
    for (const el of els) {
      const x = parseFloat(el.style.left), y = parseFloat(el.style.top), w = parseFloat(el.style.width), h = parseFloat(el.style.height);
      Lab.camTo(1, b.width / 2 - (x + w / 2), b.height / 2 - (y + h / 2), 0);
      const r = el.getBoundingClientRect();
      const t = document.elementFromPoint(r.left + r.width / 2, r.top + r.height * 0.9);
      if (t && t.closest('.gz') === el) return el.dataset.gizmo;
    }
    return els[0].dataset.gizmo;
  });
  const g0 = await geo(tree);
  await look(1, g0.x + g0.w / 2, g0.y + g0.h / 2, 1200);
  const g = await geo(tree);
  check('a tree near the camera is live svg', g.live, tree);

  // ── ctrl: the trunk is ink, the empty corner of the box is paper
  const s = await screen(tree);
  const trunk = { x: s.x + s.w * 0.5, y: s.y + s.h * 0.9 };
  const corner = { x: s.x + 4, y: s.y + 4 };
  const inkTrunk = await page.evaluate(([id, p]) => Kits.inkAt(document.querySelector('[data-gizmo="' + CSS.escape(id) + '"]'), p.x, p.y), [tree, trunk]);
  const inkCorner = await page.evaluate(([id, p]) => Kits.inkAt(document.querySelector('[data-gizmo="' + CSS.escape(id) + '"]'), p.x, p.y), [tree, corner]);
  check('ctrl: the trunk answers ink, the corner answers paper', inkTrunk === true && inkCorner === false, 'trunk=' + inkTrunk + ' corner=' + inkCorner);

  await page.mouse.move(trunk.x, trunk.y);
  await page.keyboard.down('Control');
  await page.mouse.move(trunk.x + 1, trunk.y);
  await page.waitForTimeout(250);
  const hit = await page.evaluate(() => ({ hit: Ink.hit && Ink.hit.dataset.gizmo, rim: !!document.querySelector('.gz.ink-hit .gz-art > [data-lab-ink]') }));
  check('ctrl over the trunk: the tree is the hit and wears its rim', hit.hit === tree && hit.rim, JSON.stringify(hit));
  await page.screenshot({ path: path.join(OUT, 'verify-kits-ctrl-rim.png'), clip: { x: Math.max(0, s.x - 40), y: Math.max(0, s.y - 40), width: s.w + 80, height: s.h + 80 } });
  await page.keyboard.up('Control');
  await page.waitForTimeout(150);
  const rimGone = await page.evaluate(() => !document.querySelector('[data-lab-ink]'));
  check('ctrl up: the rim comes off', rimGone);

  // ── drag, and undo
  const before = await geo(tree);
  await page.mouse.move(trunk.x, trunk.y);
  await page.mouse.down();
  await page.mouse.move(trunk.x + 50, trunk.y + 30, { steps: 5 });
  await page.waitForTimeout(80);
  const mid = await geo(tree);
  check('mid-drag: the section is live and wears .dragging', mid.live && /\bdragging\b/.test(mid.cls), mid.cls);
  await page.mouse.move(trunk.x + 150, trunk.y + 80, { steps: 10 });
  await page.mouse.up();
  await page.waitForTimeout(350);
  const after = await geo(tree);
  check('drop: the box moved by the drag (150,80)', Math.abs(after.x - before.x - 150) <= 2 && Math.abs(after.y - before.y - 80) <= 2, before.x + ',' + before.y + ' -> ' + after.x + ',' + after.y);
  await page.keyboard.press('Control+z');
  await page.waitForTimeout(350);
  const undone = await geo(tree);
  check('ctrl+z: back where it was', Math.abs(undone.x - before.x) <= 1 && Math.abs(undone.y - before.y) <= 1, undone.x + ',' + undone.y);

  // ── the band over the stand
  await page.keyboard.press('Escape');
  const bare = await page.evaluate(() => {
    const b = Lab.bench.getBoundingClientRect();
    for (let y = b.top + 20; y < b.bottom - 20; y += 40) for (let x = b.left + 20; x < b.right - 20; x += 40) {
      const t = document.elementFromPoint(x, y);
      if (t && !t.closest('.gz,.tool-dock,.zoom-dock,.lab-head,.tracer')) return { x, y };
    }
    return null;
  });
  if (bare) {
    await page.mouse.move(bare.x, bare.y);
    await page.mouse.down();
    await page.mouse.move(bare.x + 600, bare.y + 500, { steps: 12 });
    await page.mouse.up();
    await page.waitForTimeout(250);
    const picked = await page.evaluate(() => document.querySelectorAll('.gz.picked').length);
    check('band over the stand picks what it touches', picked > 0, picked + ' picked');
    await page.screenshot({ path: path.join(OUT, 'verify-kits-band.png') });
    await page.keyboard.press('Escape');
  } else check('band: found a bare spot to start from', false);

  // ── copy / paste
  await page.keyboard.press('Escape');
  const sTree = await screen(tree);
  await page.mouse.move(sTree.cx, sTree.y + sTree.h * 0.9);
  await page.keyboard.down('Shift'); await page.mouse.down(); await page.mouse.up(); await page.keyboard.up('Shift');
  await page.waitForTimeout(120);
  const pickedOne = await page.evaluate(id => document.querySelector('[data-gizmo="' + CSS.escape(id) + '"]').classList.contains('picked'), tree);
  check('shift-click picks the tree', pickedOne);
  const nBefore = await page.evaluate(() => document.querySelectorAll('.gz[data-kit]').length);
  await page.keyboard.press('Control+c');
  await page.keyboard.press('Control+v');
  await page.waitForTimeout(500);
  const copyInfo = await page.evaluate(() => {
    const all = [...document.querySelectorAll('.gz[data-kit]')];
    const c = all.find(e => e.classList.contains('gz-copy'));
    return { n: all.length, hasCopy: !!c, iframe: !!(c && c.querySelector('iframe')), art: !!(c && c.querySelector('.gz-art')),
             kit: c && c.dataset.kit, part: c && c.dataset.part, id: c && c.dataset.gizmo, w: c && c.dataset.w, inRecs: !!(c && Kits.recs.get(c.dataset.gizmo)) };
  });
  check('ctrl+c / ctrl+v: a kit copy, no iframe, indexed by kits.js', copyInfo.n === nBefore + 1 && copyInfo.hasCopy && !copyInfo.iframe && copyInfo.art && copyInfo.inRecs, JSON.stringify(copyInfo));
  await page.evaluate(id => Lab.remove(document.querySelector('[data-gizmo="' + CSS.escape(id) + '"]')), copyInfo.id);
  await page.waitForTimeout(250);
  const gone1 = await page.evaluate(id => !document.querySelector('[data-gizmo="' + CSS.escape(id) + '"]'), copyInfo.id);
  await page.keyboard.press('Control+z');
  await page.waitForTimeout(400);
  const back1 = await page.evaluate(id => { const e = document.querySelector('[data-gizmo="' + CSS.escape(id) + '"]'); return !!(e && Kits.recs.get(id) && Kits.recs.get(id).el === e); }, copyInfo.id);
  check('delete the copy, ctrl+z brings it back into the index', gone1 && back1, 'gone=' + gone1 + ' back=' + back1);
  await page.evaluate(id => Lab.remove(document.querySelector('[data-gizmo="' + CSS.escape(id) + '"]')), copyInfo.id);

  // ── delete an ORIGINAL tree, undo: a fresh clone, re-indexed, drawn
  await page.keyboard.press('Escape');
  await page.evaluate(id => Lab.remove(document.querySelector('[data-gizmo="' + CSS.escape(id) + '"]')), tree);
  await page.waitForTimeout(250);
  const gone2 = await page.evaluate(id => !document.querySelector('[data-gizmo="' + CSS.escape(id) + '"]') && !Kits.recs.get(id), tree);
  await page.keyboard.press('Control+z');
  await page.waitForTimeout(700);
  const back2 = await page.evaluate(id => { const e = document.querySelector('[data-gizmo="' + CSS.escape(id) + '"]'); const r = Kits.recs.get(id); return !!(e && r && r.el === e && !e.querySelector('iframe')); }, tree);
  check('delete an original, ctrl+z: re-cloned and re-indexed', gone2 && back2, 'gone=' + gone2 + ' back=' + back2);

  // ── the corner: re-cut and refit
  await look(1, g0.x + g0.w / 2, g0.y + g0.h / 2, 900);
  await page.evaluate(id => Lab.raise(document.querySelector('[data-gizmo="' + CSS.escape(id) + '"]')), tree);
  await page.waitForTimeout(200);
  const s2 = await screen(tree);
  await page.mouse.move(s2.cx, s2.cy);
  await page.waitForTimeout(120);
  const cornerAt = { x: s2.x + s2.w - 8, y: s2.y + s2.h - 8 };
  await page.mouse.move(cornerAt.x, cornerAt.y);
  await page.mouse.down();
  await page.mouse.move(cornerAt.x - s2.w * 0.4, cornerAt.y - s2.h * 0.4, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(350);
  const cut = await geo(tree);
  const artK = await page.evaluate(id => { const a = document.querySelector('[data-gizmo="' + CSS.escape(id) + '"] .gz-art'); const m = /scale\(([\d.]+)\)/.exec(a.style.transform); return m ? +m[1] : 1; }, tree);
  check('corner: the box shrank and the art scaled with it', cut.w < g0.w * 0.7 && artK < 0.75, 'box ' + cut.w + 'x' + cut.h + ' k=' + artK.toFixed(2));
  const s3 = await screen(tree);
  await page.mouse.dblclick(s3.x + s3.w - 8, s3.y + s3.h - 8);
  await page.waitForTimeout(500);
  const refit = await geo(tree);
  check('double-click the corner: back to its drawing', Math.abs(refit.w - g0.w) <= 1 && Math.abs(refit.h - g0.h) <= 1, refit.w + 'x' + refit.h + ' vs ' + g0.w + 'x' + g0.h);

  // ── raise / lower
  const z0 = await page.evaluate(id => Lab.rankOf(document.querySelector('[data-gizmo="' + CSS.escape(id) + '"]')), tree);
  await page.evaluate(id => Lab.lower(document.querySelector('[data-gizmo="' + CSS.escape(id) + '"]')), tree);
  await page.waitForTimeout(150);
  const z1 = await page.evaluate(id => Lab.rankOf(document.querySelector('[data-gizmo="' + CSS.escape(id) + '"]')), tree);
  await page.evaluate(id => Lab.raise(document.querySelector('[data-gizmo="' + CSS.escape(id) + '"]')), tree);
  check('lower then raise: the rank moves and comes back', z1 <= z0, 'rank ' + z0 + ' -> ' + z1);

  // ── the grades, out and in
  await look(0.2, 900, 800, 1600);
  const z20 = await page.evaluate(() => ({ k: Kits.stats(), iframes: document.querySelectorAll('iframe[src]').length }));
  check('20%: tiles up, live parts only the held/must, few documents', z20.k.tiles > 0 && z20.k.live < 40 && z20.iframes < 20, JSON.stringify(z20.k) + ' iframes=' + z20.iframes);
  await look(4, g0.x + g0.w / 2, g0.y + g0.h / 2, 1300);
  const z400 = await page.evaluate(() => ({ k: Kits.stats(), liveSvg: document.querySelectorAll('.gz[data-kit] .gz-art > svg').length }));
  check('400%: no tiles, the near parts live', z400.k.tiles === 0 && z400.liveSvg > 0, JSON.stringify(z400));

  // ── and the grade the old kits earn at 100 %: a tree is still a mover
  await look(1, g0.x + g0.w / 2, g0.y + g0.h / 2, 1500);
  const grades = await page.evaluate(() => { const k = Kits.stats(); return { full: k.full, sway: k.sway, live: k.live }; });
  check('100% over the stand: the trees are moving', grades.sway + grades.full > 0, JSON.stringify(grades));

  await page.click('#lab-reset');
  await page.waitForTimeout(900);
  check('reset layout: no page errors', errors.length === 0, errors.join(' | ').slice(0, 300));
  check('no console errors the whole way', consoleErrs.length === 0, consoleErrs.join(' | ').slice(0, 300));

  const fails = results.filter(r => !r.ok).length;
  console.log('\n' + (results.length - fails) + '/' + results.length + ' passed');
  await browser.close();
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
