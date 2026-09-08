/* lab2/perf/shot-panels.js — the two side panels as they stand on the bench:
   the tracing table and the sticker drawer, both fixed to the left of the
   screen. USAGE (from site/): node lab2/perf/shot-panels.js */
const path = require('path');
const { chromium } = require('playwright');
const OUT = path.join(__dirname, 'results');
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: false, args: ['--window-size=1616,1110', '--window-position=0,0'] });
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.route('**/_lab2/default', r => r.fulfill({ status: 404, body: 'no door' }));
  await page.goto('http://localhost:4321/lab2/', { waitUntil: 'load' });
  await page.waitForFunction(() => window.Lab && window.Frames && window.Wall && window.Tracer && window.Stickers);
  await page.waitForTimeout(2000);
  await page.evaluate(() => { const b = Lab.bench.getBoundingClientRect(); Lab.camTo(0.55, b.width / 2 - 2600 * 0.55, b.height / 2 - 900 * 0.55, 0); });
  await page.waitForTimeout(900);
  await page.evaluate(() => Wall.setTool('upload'));
  await page.waitForTimeout(700);
  await page.screenshot({ path: path.join(OUT, 'panel-table.png') });
  await page.evaluate(() => Wall.setTool('sticker'));
  await page.waitForTimeout(700);
  await page.screenshot({ path: path.join(OUT, 'panel-drawer.png') });
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
