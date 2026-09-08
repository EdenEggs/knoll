/* lab2/perf/verify-stickers.js — the sticker drawer, 2026-09-08: STICKER and
   UPLOAD in place of IMAGE; the drawer ships empty and says so; a catalogue
   loaded through Stickers.load fills it; the chips are the kits and the
   search rummages by both; a click puts a sticker on the pointer and a second
   takes it off; a click on the paper and a drag out of the drawer both stamp
   a k:'d'; a sticker the catalogue has not got paints nothing and does not
   throw; the drawer and the tracing table swap with the tool; and both
   panels are FIXED chrome — they hold still while the bench moves under
   them, and neither is a gizmo.
   USAGE (from site/): node lab2/perf/verify-stickers.js */
const path = require('path');
const { chromium } = require('playwright');
const OUT = path.join(__dirname, 'results');
const results = [];
const check = (name, ok, info) => { results.push({ name, ok }); console.log((ok ? 'PASS ' : 'FAIL ') + name + (info ? ' — ' + info : '')); };

/* two drawings and two kits, made up here rather than shipped: the drawer is
   empty on purpose until real kits are drawn into it, and a test that needed
   real ones would go stale the day they arrive. */
const KITS = [{ id: 'pipeworks', name: 'Pipeworks' }, { id: 'critters', name: 'Critters' }];
const STICKERS = [
  { id: 'v-cog', name: 'Cog', kit: 'pipeworks', w: 100, h: 100,
    d: '<circle cx="50" cy="50" r="34" fill="none" stroke="#5a635d" stroke-width="14"/>' },
  { id: 'v-beetle', name: 'Beetle', kit: 'critters', w: 100, h: 100,
    d: '<ellipse cx="50" cy="55" rx="28" ry="34" fill="#e8479c" stroke="#100c16" stroke-width="6"/>' }
];

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: false, args: ['--window-size=1616,1110', '--window-position=0,0'] });
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await page.route('**/_lab2/default', r => r.fulfill({ status: 404, body: 'no door' }));
  await page.goto('http://localhost:4321/lab2/', { waitUntil: 'load' });
  await page.waitForFunction(() => window.Lab && window.Frames && window.Wall && window.Tracer && window.Stickers);
  await page.waitForTimeout(1500);

  // ── the dock ─────────────────────────────────────────────────────────────
  const tools = await page.evaluate(() => [...document.querySelectorAll('#tool-dock [data-tool]')].map(b => b.dataset.tool));
  check('STICKER and UPLOAD are on the dock, and IMAGE is not',
    tools.includes('sticker') && tools.includes('upload') && !tools.includes('image'), tools.join(' '));
  check('the sticker wears the export\'s own icon, in CSS',
    await page.evaluate(() => !!document.querySelector('#tool-dock [data-tool="sticker"] .dock-sticker-ico')));

  // nothing is built until the tool is picked up — a drawer nobody opens
  // should cost the boot nothing at all
  check('the drawer is not built until it is opened',
    await page.evaluate(() => !document.getElementById('stickers')));

  await page.evaluate(() => Wall.setTool('sticker'));
  await page.waitForTimeout(700);
  check('the drawer opens on the sticker tool',
    await page.evaluate(() => !!document.getElementById('stickers') && !document.getElementById('stickers').hidden));

  /* IT IS CHROME, NOT SCENERY. Fixed to the left of the screen, clear of the
     header above it and the dock below it, never registered as a gizmo — and
     it does not move when the camera does, which is the whole reason it
     stopped being a panel on the paper. */
  const placed = await page.evaluate(() => {
    const r = document.getElementById('stickers').getBoundingClientRect();
    const head = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--head-h')) || 52;
    const dock = document.querySelector('.tool-dock').getBoundingClientRect();
    return { pos: getComputedStyle(document.getElementById('stickers')).position,
             left: Math.round(r.left), top: Math.round(r.top), bottom: Math.round(r.bottom),
             w: Math.round(r.width), head: Math.round(head), dockTop: Math.round(dock.top),
             gizmo: Lab.gizmos.some(g => g.el.dataset.gizmo === 'stickers'),
             inWorld: !!document.getElementById('bench-world').contains(document.getElementById('stickers')) };
  });
  check('it is fixed to the left, clear of the header and the dock, and is not a gizmo',
    placed.pos === 'fixed' && placed.left < 40 && placed.top >= placed.head &&
    placed.bottom <= placed.dockTop && placed.w === 344 && !placed.gizmo && !placed.inWorld,
    JSON.stringify(placed));

  const moved = await page.evaluate(async () => {
    const at = () => { const r = document.getElementById('stickers').getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top)]; };
    const was = at();
    const b = Lab.bench.getBoundingClientRect();
    Lab.camTo(0.4, b.width / 2 - 4000 * 0.4, b.height / 2 - 4000 * 0.4, 0);
    await new Promise(r => setTimeout(r, 500));
    return { was, now: at() };
  });
  check('it holds still while the bench moves under it',
    moved.was.join() === moved.now.join(), JSON.stringify(moved));

  // ── empty, on purpose ────────────────────────────────────────────────────
  const bare = await page.evaluate(() => ({
    count: document.getElementById('sd-count').textContent,
    pockets: document.querySelectorAll('.lp-pocket').length,
    cards: document.querySelectorAll('.sd-card').length,
    chips: [...document.querySelectorAll('.sd-chip')].map(c => c.textContent),
    foot: document.getElementById('sd-foot').textContent
  }));
  check('it ships empty, in the export\'s own dashed pockets',
    bare.cards === 0 && bare.pockets === 4 && /EMPTY/.test(bare.count) && bare.chips.join() === 'ALL', JSON.stringify(bare));
  await page.screenshot({ path: path.join(OUT, 'stickers-empty.png') });

  // ── the catalogue ────────────────────────────────────────────────────────
  await page.evaluate(([kits, stickers]) => Stickers.load({ kits, stickers }), [KITS, STICKERS]);
  await page.waitForTimeout(300);
  const full = await page.evaluate(() => ({
    cards: [...document.querySelectorAll('.sd-name')].map(n => n.childNodes[0].textContent),
    kitLine: [...document.querySelectorAll('.sd-name span')].map(n => n.textContent),
    count: document.getElementById('sd-count').textContent,
    chips: [...document.querySelectorAll('.sd-chip')].map(c => c.textContent)
  }));
  check('a loaded catalogue fills the grid, and the chips are its kits',
    full.cards.join() === 'Cog,Beetle' && full.count === '2 STICKERS ON HAND' &&
    full.chips.join() === 'ALL,PIPEWORKS,CRITTERS' && full.kitLine.join() === 'Pipeworks,Critters', JSON.stringify(full));
  await page.screenshot({ path: path.join(OUT, 'stickers-loaded.png') });

  // ── rummaging ────────────────────────────────────────────────────────────
  const rummage = async q => page.evaluate(v => {
    const i = document.getElementById('sd-q');
    i.value = v; i.dispatchEvent(new Event('input', { bubbles: true }));
    return { cards: [...document.querySelectorAll('.sd-name')].map(n => n.childNodes[0].textContent),
             count: document.getElementById('sd-count').textContent,
             none: !!document.querySelector('.sd-none') };
  }, q);
  const byName = await rummage('beet');
  const byKit = await rummage('pipe');
  const byNothing = await rummage('zzz');
  await rummage('');
  check('the search rummages by name and by kit, and says when nothing answers',
    byName.cards.join() === 'Beetle' && byName.count === '1 OF 2 STICKERS' &&
    byKit.cards.join() === 'Cog' && byNothing.none && byNothing.cards.length === 0,
    JSON.stringify({ byName, byKit, byNothing }));

  const chipped = await page.evaluate(() => {
    [...document.querySelectorAll('.sd-chip')].find(c => c.textContent === 'CRITTERS').click();
    return { cards: [...document.querySelectorAll('.sd-name')].map(n => n.childNodes[0].textContent),
             on: [...document.querySelectorAll('.sd-chip.on')].map(c => c.textContent) };
  });
  await page.evaluate(() => [...document.querySelectorAll('.sd-chip')].find(c => c.textContent === 'ALL').click());
  check('a chip narrows the drawer to its kit',
    chipped.cards.join() === 'Beetle' && chipped.on.join() === 'CRITTERS', JSON.stringify(chipped));

  // ── picked up, not looked at ─────────────────────────────────────────────
  check('a sticker carries no viewer behind it', await page.evaluate(() => !document.getElementById('sd-viewer')));
  const card = await page.evaluate(() => {
    const c = document.querySelector('.sd-card'); const r = c.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2, id: c.dataset.id };
  });
  await page.mouse.move(card.x, card.y); await page.mouse.down(); await page.mouse.up();
  await page.waitForTimeout(250);
  const armed1 = await page.evaluate(() => ({ armed: Stickers.armed() && Stickers.armed().id,
    badge: !!document.querySelector('.sd-card.on .sd-on'),
    say: (document.querySelector('.opt-say') || {}).textContent }));
  await page.mouse.move(card.x, card.y); await page.mouse.down(); await page.mouse.up();
  await page.waitForTimeout(250);
  const armed2 = await page.evaluate(() => Stickers.armed());
  check('a click puts it on the pointer, and a second takes it off',
    armed1.armed === 'v-cog' && armed1.badge && /Cog/.test(armed1.say || '') && armed2 === null,
    JSON.stringify({ armed1, armed2 }));

  // ── a press on the paper ─────────────────────────────────────────────────
  const paper = await page.evaluate(() => {
    const b = Lab.bench.getBoundingClientRect();
    for (let y = b.bottom - 160; y > b.top + 40; y -= 40) for (let x = b.left + 40; x < b.right - 40; x += 40) {
      const t = document.elementFromPoint(x, y);
      if (t && !t.closest('#stickers,#tracer,.tool-dock,.tool-opts,.zoom-dock,.lab-head,.gz')) return { x, y };
    }
    return null;
  });
  // nothing on the pointer: the drawer says why rather than the paper saying nothing
  await page.mouse.move(paper.x, paper.y); await page.mouse.down(); await page.mouse.up();
  await page.waitForTimeout(250);
  const nudged = await page.evaluate(() => ({ foot: document.getElementById('sd-foot').textContent,
    items: Wall.store.get().items.filter(Boolean).length }));
  check('a press with nothing on the pointer nudges instead of stamping',
    /pick a sticker/.test(nudged.foot) && nudged.items === 0, JSON.stringify(nudged));

  await page.mouse.move(card.x, card.y); await page.mouse.down(); await page.mouse.up();   // arm the cog again
  await page.waitForTimeout(200);
  const before = await page.evaluate(() => Wall.store.get().items.filter(Boolean).length);
  await page.mouse.move(paper.x, paper.y); await page.mouse.down(); await page.mouse.up();
  await page.waitForTimeout(400);
  const pressed = await page.evaluate(() => { const it = Wall.store.get().items.filter(Boolean); return it[it.length - 1]; });
  const pw = await page.evaluate(([x, y]) => Lab.toWorld(x, y), [paper.x, paper.y]);
  check('a press with one on the pointer stamps a k:\'d\' where it landed',
    pressed && pressed.k === 'd' && pressed.f === 'v-cog' &&
    Math.abs(pressed.x - pw.x) < 3 && Math.abs(pressed.y - pw.y) < 3, JSON.stringify(pressed));
  check('the stamp is drawn on the wall', await page.evaluate(() => !!document.querySelector('.wall-ink .wall-item')));

  // ── dragged out of the drawer ────────────────────────────────────────────
  const card2 = await page.evaluate(() => {
    const c = document.querySelectorAll('.sd-card')[1]; const r = c.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  });
  const drop = await page.evaluate(() => {
    const b = Lab.bench.getBoundingClientRect();
    for (let y = b.top + 60; y < b.bottom - 160; y += 40) for (let x = b.right - 80; x > b.left + 40; x -= 40) {
      const t = document.elementFromPoint(x, y);
      if (t && !t.closest('#stickers,#tracer,.tool-dock,.tool-opts,.zoom-dock,.lab-head,.gz')) return { x, y };
    }
    return null;
  });
  const n1 = await page.evaluate(() => Wall.store.get().items.filter(Boolean).length);
  await page.mouse.move(card2.x, card2.y); await page.mouse.down();
  await page.mouse.move(card2.x + 30, card2.y + 30, { steps: 4 });
  const ghost = await page.evaluate(() => !!document.querySelector('.lp-ghost'));
  await page.mouse.move(drop.x, drop.y, { steps: 12 });
  await page.waitForTimeout(100);
  await page.screenshot({ path: path.join(OUT, 'stickers-drag.png') });
  await page.mouse.up();
  await page.waitForTimeout(400);
  const dragged = await page.evaluate(() => { const it = Wall.store.get().items.filter(Boolean); return { n: it.length, last: it[it.length - 1] }; });
  const dw = await page.evaluate(([x, y]) => Lab.toWorld(x, y), [drop.x, drop.y]);
  check('a sticker dragged out of the drawer stamps where it lands',
    ghost && dragged.n === n1 + 1 && dragged.last.k === 'd' && dragged.last.f === 'v-beetle' &&
    Math.abs(dragged.last.x - dw.x) < 3 && Math.abs(dragged.last.y - dw.y) < 3,
    JSON.stringify({ ghost, n: dragged.n, n1, last: dragged.last }));

  // let go over the drawer itself: refused, and nothing lands
  const n2 = await page.evaluate(() => Wall.store.get().items.filter(Boolean).length);
  await page.mouse.move(card2.x, card2.y); await page.mouse.down();
  await page.mouse.move(card2.x + 30, card2.y + 30, { steps: 4 });
  await page.mouse.move(card.x, card.y, { steps: 6 });
  await page.mouse.up();
  await page.waitForTimeout(300);
  const refused = await page.evaluate(() => ({ foot: document.getElementById('sd-foot').textContent,
    n: Wall.store.get().items.filter(Boolean).length }));
  check('a sticker let go over the drawer is refused', refused.n === n2 && /let go over the paper/.test(refused.foot), JSON.stringify(refused));

  // ── a stamp whose sticker the catalogue has not got ──────────────────────
  const orphan = await page.evaluate(() => {
    const painted0 = document.querySelectorAll('.wall-ink .wall-item').length;
    let threw = null;
    try { Stickers.load({ kits: [], stickers: [] }); } catch (e) { threw = String(e); }
    return { threw, painted0, painted1: document.querySelectorAll('.wall-ink .wall-item').length,
             stillStored: Wall.store.get().items.filter(Boolean).length,
             count: document.getElementById('sd-count').textContent };
  });
  check('pulling the catalogue leaves the stamps stored but unpainted, and does not throw',
    !orphan.threw && orphan.painted1 === 0 && orphan.stillStored > 0 && /EMPTY/.test(orphan.count), JSON.stringify(orphan));

  // …and putting it back paints them again, without doubling the kits
  const back = await page.evaluate(([kits, stickers]) => {
    Stickers.load({ kits, stickers });
    Stickers.load({ kits, stickers });                  // load REPLACES, it does not add
    return { painted: document.querySelectorAll('.wall-ink .wall-item').length,
             cards: document.querySelectorAll('.sd-card').length,
             chips: document.querySelectorAll('.sd-chip').length };
  }, [KITS, STICKERS]);
  check('re-loading the same ids repaints the stamps and does not double the drawer',
    back.painted > 0 && back.cards === 2 && back.chips === 3, JSON.stringify(back));

  // ── the two tools swap their panels ──────────────────────────────────────
  await page.evaluate(() => Wall.setTool('upload'));
  await page.waitForTimeout(500);
  const swapped = await page.evaluate(() => ({ drawer: document.getElementById('stickers').hidden,
    table: document.getElementById('tracer').hidden, say: (document.querySelector('.opt-say') || {}).textContent }));
  await page.evaluate(() => Wall.setTool('sticker'));
  await page.waitForTimeout(500);
  const back2 = await page.evaluate(() => ({ drawer: document.getElementById('stickers').hidden, table: document.getElementById('tracer').hidden }));
  check('UPLOAD brings the table up and puts the drawer away, and back again',
    swapped.drawer && !swapped.table && /tracing/.test(swapped.say || '') && !back2.drawer && back2.table,
    JSON.stringify({ swapped, back2 }));

  // ── put the paper back the way it was found ──────────────────────────────
  await page.evaluate(() => { let n = Wall.store.get().items.filter(Boolean).length; while (n-- > 0) Wall.undo(); });
  await page.waitForTimeout(300);
  check('every stamp undoes', await page.evaluate(() => Wall.store.get().items.filter(Boolean).length === 0));

  check('no page errors', errors.length === 0, errors.join(' | ').slice(0, 200));
  const fails = results.filter(r => !r.ok).length;
  console.log(`\n${results.length - fails}/${results.length} passed`);
  await browser.close();
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
