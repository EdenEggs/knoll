const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ channel: 'chrome', headless: true });
  const p = await (await b.newContext({ viewport: { width: 1400, height: 900 } })).newPage();
  await p.goto('http://localhost:4399/signup/', { waitUntil: 'networkidle' });
  await p.waitForTimeout(2600);
  const r = await p.evaluate(() => {
    const paper = [...document.querySelectorAll('div')].find(x => x.style.transition && x.style.transition.includes('height'));
    const name = document.getElementById('f-name');
    paper.inert = true;
    name.focus();
    const blocked = document.activeElement === name ? 'focus LANDED despite inert' : 'focus REFUSED (activeElement=' + document.activeElement.tagName + ')';
    paper.inert = false;
    name.focus();
    return { inertSupported: 'inert' in HTMLElement.prototype, whileInert: blocked,
             afterInertCleared: document.activeElement === name ? 'lands' : 'still refused' };
  });
  console.log(JSON.stringify(r, null, 2));
  await b.close();
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
