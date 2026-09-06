/* lab2/perf/probe-gestures.js — the two gestures verify.js could not land:
   shift-click to pick a kit part, and a double-click on the corner to refit.
   Logs what was under the pointer and what changed. */
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: false, args: ['--window-size=1616,1110', '--window-position=0,0'] });
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  page.on('pageerror', e => console.log('PAGEERROR', String(e)));
  await page.route('**/_lab2/default', r => r.fulfill({ status: 404, body: 'no door' }));
  await page.goto('http://localhost:4321/lab2/', { waitUntil: 'load' });
  await page.waitForFunction(() => window.Lab && window.Frames && window.Kits && Kits.stats().sheets.length === 3);
  await page.waitForTimeout(1500);
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
  await page.waitForTimeout(1000);
  const state = async () => page.evaluate(id => { const el = document.querySelector('[data-gizmo="' + id + '"]'); const r = el.getBoundingClientRect(); return { cls: el.className, w: el.style.width, h: el.style.height, picked: el.classList.contains('picked'), sx: r.left, sy: r.top, sw: r.width, sh: r.height }; }, tree);
  let st = await state();
  console.log('tree', tree, JSON.stringify(st));
  const under = async (x, y) => page.evaluate(([x, y]) => { const t = document.elementFromPoint(x, y); const g = t && t.closest('.gz'); return (t ? t.tagName + '.' + (typeof t.className === 'string' ? t.className : t.className.baseVal) : 'null') + ' in ' + (g ? g.dataset.gizmo : '-'); }, [x, y]);
  // shift-click at the trunk foot
  const tx = st.sx + st.sw / 2, ty = st.sy + st.sh * 0.9;
  console.log('under trunk:', await under(tx, ty));
  await page.mouse.move(tx, ty);
  await page.keyboard.down('Shift');
  await page.mouse.down(); await page.mouse.up();
  await page.keyboard.up('Shift');
  await page.waitForTimeout(200);
  st = await state(); console.log('after shift-click:', JSON.stringify(st));
  // and via page.mouse.click with modifiers
  await page.keyboard.press('Escape');
  await page.mouse.click(tx, ty, { modifiers: ['Shift'] });
  await page.waitForTimeout(200);
  st = await state(); console.log('after mouse.click{Shift}:', JSON.stringify(st));
  await page.keyboard.press('Escape');
  // the corner: cut to 60%, then double-click the corner
  await page.mouse.move(st.sx + st.sw / 2, st.sy + st.sh / 2);
  await page.waitForTimeout(100);
  const cx = st.sx + st.sw - 8, cy = st.sy + st.sh - 8;
  console.log('under corner:', await under(cx, cy));
  await page.mouse.move(cx, cy); await page.mouse.down();
  await page.mouse.move(cx - st.sw * 0.4, cy - st.sh * 0.4, { steps: 8 }); await page.mouse.up();
  await page.waitForTimeout(300);
  st = await state(); console.log('after cut:', JSON.stringify(st));
  const cx2 = st.sx + st.sw - 8, cy2 = st.sy + st.sh - 8;
  console.log('under new corner:', await under(cx2, cy2));
  await page.mouse.dblclick(cx2, cy2);
  await page.waitForTimeout(400);
  st = await state(); console.log('after dblclick:', JSON.stringify(st));
  // programmatic dblclick event on the corner button, to separate Playwright from the handler
  await page.evaluate(id => { const b = document.querySelector('[data-gizmo="' + id + '"] .gz-size'); b.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, cancelable: true })); }, tree);
  await page.waitForTimeout(300);
  st = await state(); console.log('after dispatched dblclick:', JSON.stringify(st));
  // the gnome inks
  const inks = await page.evaluate(() => Object.fromEntries(Object.entries(Kits.sheets.gnome.parts).map(([k, P]) => [k, P.ink])));
  console.log('gnome inks:', JSON.stringify(inks));
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
