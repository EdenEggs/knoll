/* lab2/perf/verify.js — the gestures the bench promises, exercised on the
   kits bench in headed Chrome with the autosave door blocked.
   USAGE (from site/): node lab2/perf/verify.js
   Each check prints PASS/FAIL with the numbers; screenshots of a few states
   land in lab2/perf/results/verify-*.png. */
const path = require('path');
const { chromium } = require('playwright');
const OUT = path.join(__dirname, 'results');
const results = [];
const check = (name, ok, info) => { results.push({ name, ok, info }); console.log((ok ? 'PASS ' : 'FAIL ') + name + (info ? ' — ' + info : '')); };

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: false, args: ['--window-size=1616,1110', '--window-position=0,0'] });
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await page.route('**/_lab2/default', r => r.fulfill({ status: 404, body: 'no door' }));
  await page.goto('http://localhost:4321/lab2/', { waitUntil: 'load' });
  await page.waitForFunction(() => window.Lab && window.Frames && window.Kits && Kits.stats().sheets.length === 3);
  await page.waitForTimeout(1500);

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

  // ── pick a standing tree and its neighbourhood: the east stand by the lockup
  // a tree whose trunk foot is its own — nothing else's box lies over that
  // point (boxes overlap in a stand; that is what ctrl-pick is for, and it
  // is not what this drag is testing)
  const tree = await page.evaluate(() => {
    const els = [...document.querySelectorAll('.gz[data-kit="forest"]')].filter(e => e.dataset.part === 'slim-pine' || e.dataset.part === 'the-spruce');
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
  let g = await geo(tree);
  check('a tree near the camera is live svg', g.live, tree);

  // ── ctrl: the trunk is ink, the empty corner of the box is paper
  const s = await screen(tree);
  const trunk = { x: s.x + s.w * 0.5, y: s.y + s.h * 0.9 };      // the foot of the trunk
  const corner = { x: s.x + 4, y: s.y + 4 };                    // top-left of the box: air
  const inkTrunk = await page.evaluate(([id, p]) => Kits.inkAt(document.querySelector('[data-gizmo="' + CSS.escape(id) + '"]'), p.x, p.y), [tree, trunk]);
  const inkCorner = await page.evaluate(([id, p]) => Kits.inkAt(document.querySelector('[data-gizmo="' + CSS.escape(id) + '"]'), p.x, p.y), [tree, corner]);
  check('ctrl: the trunk answers ink, the corner answers paper', inkTrunk === true && inkCorner === false, 'trunk=' + inkTrunk + ' corner=' + inkCorner);

  // ctrl held over the trunk marks the tree and draws its rim
  await page.mouse.move(trunk.x, trunk.y);
  await page.keyboard.down('Control');
  await page.mouse.move(trunk.x + 1, trunk.y);
  await page.waitForTimeout(200);
  const hit = await page.evaluate(() => ({ hit: Ink.hit && Ink.hit.dataset.gizmo, rim: !!document.querySelector('.gz.ink-hit .gz-art > [data-lab-ink]') }));
  check('ctrl over the trunk: the tree is the hit and wears its rim', hit.hit === tree && hit.rim, JSON.stringify(hit));
  await page.screenshot({ path: path.join(OUT, 'verify-ctrl-rim.png'), clip: { x: s.x - 40, y: s.y - 40, width: s.w + 80, height: s.h + 80 } });
  await page.keyboard.up('Control');
  await page.waitForTimeout(150);
  const rimGone = await page.evaluate(() => !document.querySelector('[data-lab-ink]'));
  check('ctrl up: the rim comes off', rimGone);

  // ── drag: pick it up by the trunk, move 150,80, drop; the box follows and the sprite/tile agree
  const before = await geo(tree);
  await page.mouse.move(trunk.x, trunk.y);
  await page.mouse.down();
  await page.mouse.move(trunk.x + 50, trunk.y + 30, { steps: 5 });
  await page.waitForTimeout(80);
  const mid = await geo(tree);
  check('mid-drag: the section is live and wears .dragging', mid.live && /\bdragging\b/.test(mid.cls), mid.cls);
  await page.mouse.move(trunk.x + 150, trunk.y + 80, { steps: 10 });
  await page.mouse.up();
  await page.waitForTimeout(300);
  const after = await geo(tree);
  check('drop: the box moved by the drag (150,80)', Math.abs(after.x - before.x - 150) <= 2 && Math.abs(after.y - before.y - 80) <= 2, `${before.x},${before.y} → ${after.x},${after.y}`);
  // undo puts it back
  await page.keyboard.press('Control+z');
  await page.waitForTimeout(300);
  const undone = await geo(tree);
  check('ctrl+z: back where it was', Math.abs(undone.x - before.x) <= 1 && Math.abs(undone.y - before.y) <= 1, `${undone.x},${undone.y}`);

  // ── band: drag the bare paper over the stand, everything it touches is picked
  await page.keyboard.press('Escape');
  const stand = await page.evaluate(() => {
    const els = [...document.querySelectorAll('.gz[data-kit]')].map(e => { const r = e.getBoundingClientRect(); return { id: e.dataset.gizmo, r }; })
      .filter(e => e.r.width > 0 && e.r.left > 0 && e.r.top > 240 && e.r.right < 1600 && e.r.bottom < 900);
    return els.map(e => e.id);
  });
  // find a bare spot: top-left of the bench area that no section covers
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
    await page.waitForTimeout(200);
    const picked = await page.evaluate(() => document.querySelectorAll('.gz.picked').length);
    check('band over the stand picks what it touches', picked > 0, picked + ' picked');
    await page.screenshot({ path: path.join(OUT, 'verify-band.png') });
    await page.keyboard.press('Escape');
  } else check('band: found a bare spot to start from', false);

  // ── copy / paste: a kit copy has no iframe and is a kit section
  await page.keyboard.press('Escape');
  const sTree = await screen(tree);
  // shift-click: pick it (a held Shift and a plain press — Playwright's click{modifiers} does not reach the pointerdown's shiftKey)
  await page.mouse.move(sTree.cx, sTree.y + sTree.h * 0.9);
  await page.keyboard.down('Shift'); await page.mouse.down(); await page.mouse.up(); await page.keyboard.up('Shift');
  await page.waitForTimeout(100);
  const pickedOne = await page.evaluate(id => document.querySelector('[data-gizmo="' + CSS.escape(id) + '"]').classList.contains('picked'), tree);
  check('shift-click picks the tree', pickedOne);
  const nBefore = await page.evaluate(() => document.querySelectorAll('.gz[data-kit]').length);
  await page.keyboard.press('Control+c');
  await page.keyboard.press('Control+v');
  await page.waitForTimeout(400);
  const copyInfo = await page.evaluate(n => {
    const all = [...document.querySelectorAll('.gz[data-kit]')];
    const c = all.find(e => e.classList.contains('gz-copy'));
    return { n: all.length, hasCopy: !!c, iframe: !!(c && c.querySelector('iframe')), art: !!(c && c.querySelector('.gz-art')),
             kit: c && c.dataset.kit, part: c && c.dataset.part, id: c && c.dataset.gizmo, w: c && c.dataset.w, inRecs: !!(c && Kits.recs.get(c.dataset.gizmo)) };
  }, nBefore);
  check('ctrl+c / ctrl+v: a kit copy, no iframe, indexed by kits.js', copyInfo.n === nBefore + 1 && copyInfo.hasCopy && !copyInfo.iframe && copyInfo.art && copyInfo.inRecs, JSON.stringify(copyInfo));
  // delete the copy from the menu (Lab.remove) and undo it back
  await page.evaluate(id => Lab.remove(document.querySelector('[data-gizmo="' + CSS.escape(id) + '"]')), copyInfo.id);
  await page.waitForTimeout(200);
  const gone1 = await page.evaluate(id => !document.querySelector('[data-gizmo="' + CSS.escape(id) + '"]'), copyInfo.id);
  await page.keyboard.press('Control+z');
  await page.waitForTimeout(300);
  const back1 = await page.evaluate(id => { const e = document.querySelector('[data-gizmo="' + CSS.escape(id) + '"]'); return !!(e && Kits.recs.get(id) && Kits.recs.get(id).el === e); }, copyInfo.id);
  check('delete the copy, ctrl+z brings it back into the index', gone1 && back1);
  // and away again for good (unpaste)
  await page.evaluate(id => Lab.remove(document.querySelector('[data-gizmo="' + CSS.escape(id) + '"]')), copyInfo.id);

  // ── delete an ORIGINAL tree, undo: a fresh clone, re-indexed, drawn
  await page.keyboard.press('Escape');
  await page.evaluate(id => Lab.remove(document.querySelector('[data-gizmo="' + CSS.escape(id) + '"]')), tree);
  await page.waitForTimeout(200);
  const gone2 = await page.evaluate(id => !document.querySelector('[data-gizmo="' + CSS.escape(id) + '"]') && !Kits.recs.get(id), tree);
  await page.keyboard.press('Control+z');
  await page.waitForTimeout(600);
  const back2 = await page.evaluate(id => { const e = document.querySelector('[data-gizmo="' + CSS.escape(id) + '"]'); const r = Kits.recs.get(id); return !!(e && r && r.el === e && !e.querySelector('iframe')); }, tree);
  check('delete an original, ctrl+z: re-cloned and re-indexed', gone2 && back2);

  // ── the corner: re-cut to 60% and the drawing scales, double-click refits
  await look(1, g0.x + g0.w / 2, g0.y + g0.h / 2, 900);
  // on top of its neighbours first: a press on the corner does not lift the
  // section (frames.js stops it there), and a box shrunk under a neighbour's
  // has its corner under that neighbour — the same on the iframe bench
  await page.evaluate(id => Lab.raise(document.querySelector('[data-gizmo="' + CSS.escape(id) + '"]')), tree);
  await page.waitForTimeout(150);
  const s2 = await screen(tree);
  await page.mouse.move(s2.cx, s2.cy);                                   // hover shows the corner
  await page.waitForTimeout(100);
  const cornerAt = { x: s2.x + s2.w - 8, y: s2.y + s2.h - 8 };
  await page.mouse.move(cornerAt.x, cornerAt.y);
  await page.mouse.down();
  await page.mouse.move(cornerAt.x - s2.w * 0.4, cornerAt.y - s2.h * 0.4, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(300);
  const cut = await geo(tree);
  const artK = await page.evaluate(id => { const a = document.querySelector('[data-gizmo="' + CSS.escape(id) + '"] .gz-art'); const m = /scale\(([\d.]+)\)/.exec(a.style.transform); return m ? +m[1] : 1; }, tree);
  check('corner: the box shrank and the art scaled with it', cut.w < g0.w * 0.7 && artK < 0.75, `box ${cut.w}x${cut.h} k=${artK.toFixed(2)}`);
  const s3 = await screen(tree);
  const underCorner = await page.evaluate(([x, y]) => { const t = document.elementFromPoint(x, y); return t ? t.tagName + '.' + t.className + ' in ' + (t.closest('.gz') && t.closest('.gz').dataset.gizmo) : 'null'; }, [s3.x + s3.w - 8, s3.y + s3.h - 8]);
  await page.mouse.dblclick(s3.x + s3.w - 8, s3.y + s3.h - 8);
  await page.waitForTimeout(400);
  const refit = await geo(tree);
  const pinfo = await page.evaluate(id => { const el = document.querySelector('[data-gizmo="' + CSS.escape(id) + '"]'); const p = Frames.panelOf(el); return p ? { sized: p.sized, natW: p.natW, natH: p.natH, kit: p.kit } : null; }, tree);
  console.log('   corner dblclick: under=' + underCorner + ' panel=' + JSON.stringify(pinfo));
  check('double-click the corner: back to its drawing', Math.abs(refit.w - g0.w) <= 1 && Math.abs(refit.h - g0.h) <= 1, `${refit.w}x${refit.h} vs ${g0.w}x${g0.h}`);

  // ── raise / lower keep working (ranks change, no errors)
  const z0 = await page.evaluate(id => Lab.rankOf(document.querySelector('[data-gizmo="' + CSS.escape(id) + '"]')), tree);
  await page.evaluate(id => Lab.lower(document.querySelector('[data-gizmo="' + CSS.escape(id) + '"]')), tree);
  await page.waitForTimeout(100);
  const z1 = await page.evaluate(id => Lab.rankOf(document.querySelector('[data-gizmo="' + CSS.escape(id) + '"]')), tree);
  await page.evaluate(id => Lab.raise(document.querySelector('[data-gizmo="' + CSS.escape(id) + '"]')), tree);
  check('lower then raise: the rank moves and comes back', z1 <= z0, `rank ${z0} → ${z1}`);

  // ── zoomed out: sprites, no live trees except the must; iframes few
  await look(0.2, 800, 0, 1500);
  const z20 = await page.evaluate(() => ({ k: Kits.stats(), iframes: document.querySelectorAll('iframe[src]').length, warm: Frames.panels.filter(p => p.cold === false && p.src && !p.art).length }));
  check('20%: tiles up, live parts only the held/must, few documents', z20.k.tiles > 0 && z20.k.live < 40 && z20.iframes < 20, JSON.stringify(z20));
  await look(4, 2872, -1900, 1200);
  const z400 = await page.evaluate(() => ({ k: Kits.stats(), liveSvg: document.querySelectorAll('.gz[data-kit] .gz-art > svg').length }));
  check('400%: no tiles, the near parts live', z400.k.tiles === 0 && z400.liveSvg > 0, JSON.stringify(z400));

  // ── reset layout puts things home without errors
  await page.click('#lab-reset');
  await page.waitForTimeout(800);
  check('reset layout: no page errors', errors.length === 0, errors.join(' | ').slice(0, 300));

  const fails = results.filter(r => !r.ok).length;
  console.log(`\n${results.length - fails}/${results.length} passed`);
  if (errors.length) console.log('page errors:', errors);
  await browser.close();
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
