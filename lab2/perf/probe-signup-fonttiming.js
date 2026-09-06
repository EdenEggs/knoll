/* When does the font stylesheet actually get asked for, and has the paper
   settled by the time a visitor could look at it? */
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ channel: 'chrome', headless: false });
  const rows = [];
  for (const pass of [1, 2, 3]) {
    const c = await b.newContext({ viewport: { width: 1500, height: 950 } });
    const p = await c.newPage();
    const t0 = Date.now(); const marks = {};
    p.on('request', r => {
      const u = r.url();
      if (u.endsWith('fonts.css')) marks.cssReq ??= Date.now() - t0;
      if (u.endsWith('.woff2')) marks.firstWoff ??= Date.now() - t0;
      if (u.endsWith('support.js')) marks.supportReq ??= Date.now() - t0;
    });
    await p.goto('http://localhost:4321/signup/', { waitUntil: 'domcontentloaded' });
    marks.domReady = Date.now() - t0;
    await p.waitForTimeout(2600);
    marks.fontsReady = await p.evaluate(() => document.fonts.status);
    marks.paperH = await p.evaluate(() => {
      const d = [...document.querySelectorAll('div')].find(x => x.style.height && x.style.height.endsWith('px') && x.style.height !== '0px');
      return d ? d.style.height : null;
    });
    // and again after everything has certainly settled
    await p.waitForTimeout(1500);
    marks.paperHSettled = await p.evaluate(() => {
      const d = [...document.querySelectorAll('div')].find(x => x.style.height && x.style.height.endsWith('px') && x.style.height !== '0px');
      return d ? d.style.height : null;
    });
    rows.push(marks); await c.close();
  }
  console.log(JSON.stringify(rows, null, 2));
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
