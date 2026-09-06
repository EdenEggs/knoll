const path = require('path');
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: false, args: ['--window-size=1616,1110', '--window-position=0,0'] });
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.route('**/_lab2/default', r => r.fulfill({ status: 404, body: 'no door' }));
  await page.goto('http://localhost:4321/lab2/', { waitUntil: 'load' });
  await page.waitForFunction(() => window.Lab && window.Frames && window.Wall && window.Tracer);
  await page.waitForTimeout(1500);
  await page.evaluate(() => Wall.setTool('image'));
  await page.waitForTimeout(600);
  const z = async (k) => { const r = await page.evaluate(() => { const e = document.querySelector('#tracer .tr-win'); const q = e.getBoundingClientRect(); return { x: q.left + 300, y: q.top + 60 }; }); await page.evaluate(([k, x, y]) => Lab.setZoom(k, x, y), [k, r.x, r.y]); await page.waitForTimeout(1200); };
  await z(2.5);
  await page.screenshot({ path: path.join(__dirname, 'results', 'tracer-full-250.png') });
  // the sign at the same zoom for comparison
  await page.evaluate(() => { const b = Lab.bench.getBoundingClientRect(); Lab.camTo(2.5, b.width / 2 - 1900 * 2.5, b.height / 2 - (-1700) * 2.5, 0); });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: path.join(__dirname, 'results', 'sign-full-250.png') });
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
