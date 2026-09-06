const path = require('path');
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: false, args: ['--window-size=1616,1110', '--window-position=0,0'] });
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const bad = [];
  page.on('response', r => { if (r.status() >= 400) bad.push(r.status() + ' ' + r.url()); });
  page.on('pageerror', e => console.log('PAGEERROR', String(e)));
  await page.route('**/_lab2/default', r => r.fulfill({ status: 404, body: 'no door' }));
  await page.goto('http://localhost:4321/lab2/', { waitUntil: 'load' });
  await page.waitForFunction(() => window.Lab && window.Frames && window.Kits);
  await page.waitForTimeout(2500);
  const state = async (z) => {
    await page.evaluate(z => { const b = Lab.bench.getBoundingClientRect(); Lab.camTo(z, b.width / 2 - 1600 * z, b.height / 2 - (-1200) * z, 0); }, z);
    await page.waitForTimeout(2500);
    const rows = await page.evaluate(() => ['card-consensus', 'card-rules', 'card-fans', 'rulebook', 'bubbles'].map(id => {
      const el = document.querySelector('[data-gizmo="' + id + '"]'); if (!el) return { id, missing: true };
      const p = Frames.panelOf(el); const img = el.querySelector('.gz-poster img'); const f = el.querySelector('iframe');
      const r = el.getBoundingClientRect();
      return { id, cls: el.className, src: el.dataset.src, box: [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)],
               wanted: p && p.wanted, loading: p && p.loading, natW: p && p.natW, natH: p && p.natH,
               poster: img ? { src: img.getAttribute('src'), nw: img.naturalWidth, complete: img.complete, w: img.style.width, tf: img.style.transform, op: getComputedStyle(img.parentNode).opacity, disp: getComputedStyle(img.parentNode).display, vis: getComputedStyle(img).visibility, ir: img.getBoundingClientRect().width } : null,
               iframe: f ? { src: !!f.getAttribute('src'), disp: getComputedStyle(f).display } : null };
    }));
    console.log('--- zoom', z, 'postersAsked?', await page.evaluate(() => !!document.querySelector('.gz-poster img')));
    rows.forEach(r => console.log(JSON.stringify(r)));
    await page.screenshot({ path: path.join(__dirname, 'results', 'cards-' + z + '.png') });
  };
  await state(0.55);
  await state(1);
  await state(0.55);
  console.log('bad responses:', bad.length ? bad : 'none');
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
