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
  // the lockup at 100%, then open the table there so the note, the book and the sign share a screen
  await page.evaluate(() => { const b = Lab.bench.getBoundingClientRect(); Lab.camTo(1, b.width / 2 - 2450 * 1, b.height / 2 - (-1250) * 1, 0); });
  await page.waitForTimeout(1500);
  await page.evaluate(() => Wall.setTool('image'));
  await page.waitForTimeout(800);
  const rectOf = async (sel) => page.evaluate(sel => { const e = document.querySelector(sel); if (!e) return null; const b = e.getBoundingClientRect(); return { x: b.left, y: b.top, w: b.width, h: b.height }; }, sel);
  // zoom in by real wheel steps over the note
  const note = await rectOf('#tracer .tr-note');
  await page.mouse.move(note.x + note.w / 2, note.y + note.h / 2);
  for (let i = 0; i < 9; i++) { await page.mouse.wheel(0, -120); await page.waitForTimeout(60); }   // ctrl is not held by page.mouse.wheel: use the keyboard
  await page.waitForTimeout(300);
  let z = await page.evaluate(() => Lab.zoom);
  if (z < 1.5) {                       // the wheel panned instead: zoom by the API about the note, as ctrl+wheel would
    await page.evaluate(([x, y]) => { for (let i = 0; i < 6; i++) Lab.setZoom(Lab.zoom * 1.18, x, y); }, [note.x + note.w / 2, note.y + note.h / 2]);
  }
  z = await page.evaluate(() => Lab.zoom);
  console.log('zoom now', z.toFixed(2));
  const shots = async (tag) => {
    for (const [sel, name] of [['#tracer .tr-note', 'note'], ['#tracer .tr-plate', 'plate'], ['#tracer .tr-file-bar .tr-plate', 'library'], ['#gz-logo .sign-caption', 'sign-caption'], ['#gz-rulebook', 'rulebook']]) {
      const r = await rectOf(sel); if (!r || r.w < 4 || r.h < 4) { console.log('  no rect', sel); continue; }
      const clip = { x: Math.max(0, r.x), y: Math.max(220, r.y), width: Math.min(600, r.w), height: Math.min(300, r.h) };
      if (clip.width < 4 || clip.height < 4 || clip.x > 1590 || clip.y > 990) { console.log('  off screen', sel); continue; }
      await page.screenshot({ path: path.join(__dirname, 'results', 'crisp-' + tag + '-' + name + '.png'), clip });
    }
  };
  await page.waitForTimeout(80); await shots('t0');
  await page.waitForTimeout(1500); await shots('t1500');
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
