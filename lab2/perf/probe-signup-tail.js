const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ channel: 'chrome', headless: false });
  const p = await (await b.newContext({ viewport: { width: 1500, height: 950 } })).newPage();
  const reqs = [], resp = [];
  p.on('request', r => reqs.push(r.url()));
  p.on('response', r => resp.push(r.status() + ' ' + r.url()));
  p.on('requestfailed', r => resp.push('FAILED ' + r.url() + ' :: ' + (r.failure()||{}).errorText));
  await p.goto('http://localhost:4321/signup/', { waitUntil: 'networkidle' });
  await p.waitForTimeout(2500);
  console.log('--- every request ---'); reqs.forEach(u => console.log('  ' + u));
  console.log('--- non-200 ---'); resp.filter(r => !r.startsWith('200') && !r.startsWith('304')).forEach(r => console.log('  ' + r));
  console.log('--- head links ---');
  console.log(await p.evaluate(() => [...document.head.querySelectorAll('link,title')].map(e => e.tagName + ' ' + (e.rel||'') + ' ' + (e.getAttribute('href')||e.textContent)).join('\n')));
  // full success path
  await p.click('#f-name'); await p.keyboard.type('Bramblefoot');
  await p.click('#f-email'); await p.keyboard.type('bramble@knoll.space');
  await p.click('#f-pw'); await p.keyboard.type('eightletters');
  await p.click('#f-pw2'); await p.keyboard.type('eightletters');
  await p.click('button[type="submit"]');
  await p.waitForTimeout(5000);
  console.log('--- after seal, full text ---');
  console.log((await p.evaluate(() => document.body.innerText.replace(/\s+/g,' ').trim())).slice(0, 400));
  await p.screenshot({ path: __dirname + '/results/signup-sealed.png' });
  console.log('--- localStorage ---', await p.evaluate(() => JSON.stringify(Object.entries(localStorage))));
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
