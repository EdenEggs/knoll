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
  const r = await page.evaluate(() => { const e = document.querySelector('#tracer .tr-plate'); const q = e.getBoundingClientRect(); return { x: q.left + q.width / 2, y: q.top + q.height / 2 }; });
  await page.evaluate(([x, y]) => Lab.setZoom(2.5, x, y), [r.x, r.y]);
  await page.waitForTimeout(1200);
  const crop = async (name) => { const q = await page.evaluate(() => { const e = document.querySelector('#tracer .tr-plate'); const b = e.getBoundingClientRect(); return { x: b.left - 10, y: b.top - 10, width: Math.min(560, b.width + 20), height: b.height + 20 }; }); await page.screenshot({ path: path.join(__dirname, 'results', 'trplate-' + name + '.png'), clip: q }); };
  await crop('a-as-is');
  await page.evaluate(() => { const w = document.getElementById('bench-world'); const a = w.getAnimations()[0]; if (a) a.pause(); });
  await page.waitForTimeout(900); await crop('b-anim-paused');
  await page.evaluate(() => { const w = document.getElementById('bench-world'); const a = w.getAnimations()[0]; if (a) a.play(); });
  await page.waitForTimeout(500);
  await page.evaluate(() => { const w = document.getElementById('bench-world'); const a = w.getAnimations()[0]; if (a) { const t = a.effect.getKeyframes()[0].transform; a.cancel(); w.style.transform = t; } });
  await page.waitForTimeout(900); await crop('c-static-transform');
  // and with the static transform, force the tracer's layer to be remade
  await page.evaluate(() => { const t = document.getElementById('tracer'); t.style.willChange = 'transform'; });
  await page.waitForTimeout(500); await crop('d-static-plus-willchange');
  await page.evaluate(() => { const t = document.getElementById('tracer'); t.style.willChange = ''; });
  // back to the animation, then a zoom step in and out (does landing re-raster?)
  await page.evaluate(() => { const w = document.getElementById('bench-world'); const t = w.style.transform; w.style.transform = ''; w.animate([{ transform: t }, { transform: t }], { duration: 1e9, iterations: Infinity, fill: 'both' }); });
  await page.waitForTimeout(500);
  await page.evaluate(([x, y]) => { Lab.setZoom(2.4, x, y); }, [r.x, r.y]); await page.waitForTimeout(300);
  await page.evaluate(([x, y]) => { Lab.setZoom(2.5, x, y); }, [r.x, r.y]); await page.waitForTimeout(1200);
  await crop('e-anim-after-restep');
  // the sign's caption at the same zoom, painted in the world layer: the reference
  await page.evaluate(() => { const b = Lab.bench.getBoundingClientRect(); Lab.camTo(2.5, b.width / 2 - 2000 * 2.5, b.height / 2 - (-1420) * 2.5, 0); });
  await page.waitForTimeout(1200);
  const s = await page.evaluate(() => { const e = document.querySelector('#gz-logo .sign-caption'); if (!e) return null; const b = e.getBoundingClientRect(); return { x: b.left, y: b.top, width: Math.min(700, b.width), height: b.height }; });
  if (s && s.width > 10 && s.height > 4) await page.screenshot({ path: path.join(__dirname, 'results', 'trplate-f-sign-caption.png'), clip: s });
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
