/* lab2/perf/verify-tracer.js — the tracing table's library, since 2026-09-04:
   a picture in, traced, filed; a click on the pocket opens the viewer; the
   × lives only there; a drag out of the library stamps on the paper; there
   is no download. USAGE (from site/): node lab2/perf/verify-tracer.js */
const path = require('path');
const { chromium } = require('playwright');
const OUT = path.join(__dirname, 'results');
const results = [];
const check = (name, ok, info) => { results.push({ name, ok }); console.log((ok ? 'PASS ' : 'FAIL ') + name + (info ? ' — ' + info : '')); };

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: false, args: ['--window-size=1616,1110', '--window-position=0,0'] });
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await page.route('**/_lab2/default', r => r.fulfill({ status: 404, body: 'no door' }));
  await page.goto('http://localhost:4321/lab2/', { waitUntil: 'load' });
  await page.waitForFunction(() => window.Lab && window.Frames && window.Wall && window.Tracer);
  await page.waitForTimeout(1500);
  await page.evaluate(() => { const b = Lab.bench.getBoundingClientRect(); Lab.camTo(0.6, b.width / 2 - 2300 * 0.6, b.height / 2 - 600 * 0.6, 0); });
  await page.waitForTimeout(800);
  await page.evaluate(() => Wall.setTool('upload'));
  await page.waitForTimeout(800);
  check('the table opens on the upload tool', await page.evaluate(() => !!document.getElementById('tracer') && !document.getElementById('tracer').hidden));
  /* IT IS CHROME, NOT SCENERY (2026-09-08): fixed to the left of the screen,
     not a gizmo, and it holds still while the camera moves. */
  const placed = await page.evaluate(async () => {
    const el = document.getElementById('tracer');
    const at = () => { const r = el.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top)]; };
    const was = at(), pos = getComputedStyle(el).position;
    const gizmo = Lab.gizmos.some(g => g.el.dataset.gizmo === 'tracer');
    const b = Lab.bench.getBoundingClientRect();
    Lab.camTo(0.35, b.width / 2 - 5000 * 0.35, b.height / 2 - 5000 * 0.35, 0);
    await new Promise(r => setTimeout(r, 500));
    return { pos, gizmo, was, now: at(), w: Math.round(el.getBoundingClientRect().width) };
  });
  check('the table is fixed chrome, not a gizmo, and holds still while the bench moves',
    placed.pos === 'fixed' && !placed.gizmo && placed.w === 344 && placed.was.join() === placed.now.join(),
    JSON.stringify(placed));
  check('no download button anywhere on the table', await page.evaluate(() => !document.querySelector('#tracer [data-dl], #tracer .tr-slot-dl')));

  /* BLANK ON A FRESH DEVICE — what a visitor to the deployed site gets. The
     flat file is Lab.store('flatfile'): THIS browser's localStorage and
     nothing else. No tracing is baked into index.html, and serve.js's
     autosave door only ever sees gizmo geometry, never a store — but the
     shipped default is worth saying out loud rather than trusting, so this
     runs on a context with no storage at all, before anything is filed. */
  const fresh = await page.evaluate(() => ({
    filled: document.querySelectorAll('#tr-slots .tr-slot.tr-filled').length,
    pockets: document.querySelectorAll('#tr-slots .tr-slot').length,
    foot: document.getElementById('tr-foot').textContent,
    // Lab.store writes its own default the first time it is read, so the key
    // exists on a fresh device — what matters is that the LIST in it is empty
    stored: JSON.parse(localStorage.getItem('knoll-lab2:flatfile') || '{"list":[]}').list.length
  }));
  check('the flat file is blank on a fresh device — four empty pockets, nothing filed',
    fresh.filled === 0 && fresh.pockets === 4 && /pile up here/.test(fresh.foot) && fresh.stored === 0,
    JSON.stringify(fresh));

  // a picture: a red blob with a black outline, drawn on a canvas
  const png = await page.evaluate(() => { const c = document.createElement('canvas'); c.width = 160; c.height = 160; const x = c.getContext('2d'); x.fillStyle = '#17120b'; x.beginPath(); x.arc(80, 80, 60, 0, 7); x.fill(); x.fillStyle = '#e8484a'; x.beginPath(); x.arc(80, 80, 50, 0, 7); x.fill(); x.fillStyle = '#ffd23f'; x.fillRect(60, 60, 40, 40); return c.toDataURL('image/png').split(',')[1]; });
  await page.setInputFiles('#tr-file', { name: 'blob.png', mimeType: 'image/png', buffer: Buffer.from(png, 'base64') });
  await page.waitForFunction(() => !document.getElementById('tr-save').disabled, null, { timeout: 15000 }).catch(() => {});
  check('a picture traces', await page.evaluate(() => !document.getElementById('tr-save').disabled));
  await page.click('#tr-save');
  await page.waitForTimeout(400);
  const slots = await page.evaluate(() => document.querySelectorAll('#tr-slots .tr-slot.tr-filled').length);
  check('filed in the library', slots >= 1, slots + ' filled');
  check('a pocket carries no × of its own', await page.evaluate(() => !document.querySelector('#tr-slots .tr-slot-x')));

  // click a pocket → the viewer
  const slot = await page.evaluate(() => { const s = document.querySelector('#tr-slots .tr-slot.tr-filled'); const r = s.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, id: s.dataset.id }; });
  await page.mouse.move(slot.x, slot.y); await page.mouse.down(); await page.mouse.up();
  await page.waitForTimeout(300);
  const viewer = await page.evaluate(() => { const v = document.getElementById('tr-viewer'); return { open: !v.hidden, svg: !!v.querySelector('#tr-viewer-table svg'), name: v.querySelector('#tr-viewer-name').textContent, remove: !!v.querySelector('#tr-viewer-remove') }; });
  check('a click on the pocket opens the viewer, large, with the × inside it', viewer.open && viewer.svg && viewer.remove, JSON.stringify(viewer));
  await page.screenshot({ path: path.join(OUT, 'tracer-viewer.png') });
  // on the pointer from the viewer, then close
  // filing put it on the pointer already, so the button reads OFF THE
  // POINTER: it toggles both ways
  const wasArmed = await page.evaluate(() => !!Tracer.armed());
  await page.click('#tr-viewer-arm');
  await page.waitForTimeout(150);
  const nowArmed = await page.evaluate(() => !!Tracer.armed());
  await page.click('#tr-viewer-arm');
  await page.waitForTimeout(150);
  const againArmed = await page.evaluate(() => !!Tracer.armed());
  check('ON/OFF THE POINTER from the viewer toggles it', nowArmed !== wasArmed && againArmed === wasArmed, `${wasArmed} → ${nowArmed} → ${againArmed}`);
  await page.click('#tr-viewer-close');
  await page.waitForTimeout(150);
  check('the viewer closes', await page.evaluate(() => document.getElementById('tr-viewer').hidden));

  // drag the pocket onto the paper → a stamp lands where it is let go
  const before = await page.evaluate(() => Wall.store.get().items.filter(Boolean).length);
  const bare = await page.evaluate(() => {
    const b = Lab.bench.getBoundingClientRect();
    for (let y = b.bottom - 120; y > b.top + 40; y -= 40) for (let x = b.left + 40; x < b.right - 40; x += 40) {
      const t = document.elementFromPoint(x, y);
      if (t && !t.closest('#tracer,.tool-dock,.tool-opts,.zoom-dock,.lab-head,.gz')) return { x, y };
    }
    return null;
  });
  await page.mouse.move(slot.x, slot.y); await page.mouse.down();
  await page.mouse.move(slot.x + 30, slot.y + 30, { steps: 4 });
  const ghost = await page.evaluate(() => !!document.querySelector('.lp-ghost'));
  await page.mouse.move(bare.x, bare.y, { steps: 12 });
  await page.waitForTimeout(100);
  await page.screenshot({ path: path.join(OUT, 'tracer-drag.png') });
  await page.mouse.up();
  await page.waitForTimeout(400);
  const after = await page.evaluate(() => { const items = Wall.store.get().items.filter(Boolean); const last = items[items.length - 1]; return { n: items.length, last }; });
  const w = await page.evaluate(([x, y]) => Lab.toWorld(x, y), [bare.x, bare.y]);
  const landed = after.n === before + 1 && after.last && after.last.k === 'i' && Math.abs(after.last.x - w.x) < 3 && Math.abs(after.last.y - w.y) < 3;
  check('a pocket dragged onto the paper stamps where it lands', ghost && landed, JSON.stringify({ ghost, n: after.n, before, last: after.last, w }));
  check('the stamp is drawn on the wall', await page.evaluate(() => !!document.querySelector('.wall-ink .wall-item')));

  // take it out from the viewer: the pocket and its stamp go
  await page.mouse.move(slot.x, slot.y); await page.mouse.down(); await page.mouse.up();
  await page.waitForTimeout(250);
  await page.click('#tr-viewer-remove');
  await page.waitForTimeout(400);
  const gone = await page.evaluate(() => ({ slots: document.querySelectorAll('#tr-slots .tr-slot.tr-filled').length, viewer: document.getElementById('tr-viewer').hidden, stamps: document.querySelectorAll('.wall-ink .wall-item').length }));
  check('TAKE IT OUT removes the tracing and its stamp', gone.slots === 0 && gone.viewer && gone.stamps === 0, JSON.stringify(gone));
  check('no page errors', errors.length === 0, errors.join(' | ').slice(0, 200));
  const fails = results.filter(r => !r.ok).length;
  console.log(`\n${results.length - fails}/${results.length} passed`);
  await browser.close();
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
