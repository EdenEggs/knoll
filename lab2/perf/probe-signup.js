/* probe-signup.js — drives /signup end to end in a real Chrome and reports
   what the page actually did. Not a perf probe: this one is a correctness
   check for the Design Canvas export that became site/signup/index.html.
   Run the site's server first (node serve.js), then: node probe-signup.js  */
const { chromium } = require('playwright');
const URL = process.env.URL || 'http://localhost:4321/signup/';

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: false });
  const ctx = await browser.newContext({ viewport: { width: 1500, height: 950 } });
  const page = await ctx.newPage();

  const errors = [], warnings = [], requests = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); if (m.type() === 'warning') warnings.push(m.text()); });
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
  page.on('request', r => requests.push(r.url()));
  const failed = [];
  page.on('response', async r => { if (r.status() >= 400) failed.push(r.status() + ' ' + r.url()); });

  const report = {};
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);   // the scroll unrolls ~350ms in, over 700ms

  report.thirdParty = requests.filter(u => !u.startsWith('http://localhost:4321'));
  report.title = await page.title();
  report.unrendered = await page.evaluate(() => (document.body.innerHTML.match(/\{\{[^}]{1,40}\}\}/g) || []).slice(0, 5));

  // 1 · the scroll unrolled
  report.paper = await page.evaluate(() => {
    const el = document.querySelector('[style*="overflow"]');
    const sc = [...document.querySelectorAll('div')].find(d => d.style.height && d.style.height !== '0px' && d.style.transition.includes('height'));
    return sc ? { height: sc.style.height, overflow: sc.style.overflow } : null;
  });

  // 2 · the gnome's arm is being drawn by the rAF loop
  const armA = await page.evaluate(() => document.querySelector('path[d^="M"][stroke-width]')?.getAttribute('d'));
  await page.mouse.move(400, 300); await page.waitForTimeout(120);
  await page.mouse.move(1100, 700); await page.waitForTimeout(400);
  const armB = await page.evaluate(() => document.querySelector('path[d^="M"][stroke-width]')?.getAttribute('d'));
  report.armFollowsCursor = !!(armA && armB && armA !== armB);

  // 3 · validation, by real typing
  await page.click('#f-name'); await page.keyboard.type('Bramblefoot');
  await page.click('#f-email'); await page.keyboard.type('not-an-email');
  await page.click('#f-pw');   await page.keyboard.type('short');
  await page.click('#f-pw2');  await page.keyboard.type('mismatch');
  await page.click('body', { position: { x: 30, y: 300 } });
  await page.waitForTimeout(600);
  report.errorNotes = await page.evaluate(() =>
    [...document.querySelectorAll('[id^="e-"]')].map(e => e.id + ' → ' + e.textContent.trim()));
  report.liveAfterErrors = await page.evaluate(() => document.querySelector('[aria-live]')?.textContent.trim());

  // 4 · the seal refuses a bad form
  report.sealLabelBefore = await page.evaluate(() => document.body.innerText.match(/PRESS SEAL|SEALING…|SEALED/)?.[0]);

  // 5 · fix the form, then press the seal and watch the wax state machine
  await page.fill('#f-email', ''); await page.click('#f-email'); await page.keyboard.type('bramble@knoll.space');
  await page.fill('#f-pw', '');   await page.click('#f-pw');   await page.keyboard.type('eightletters');
  await page.fill('#f-pw2', '');  await page.click('#f-pw2');  await page.keyboard.type('eightletters');
  await page.click('body', { position: { x: 30, y: 300 } });
  await page.waitForTimeout(400);
  report.errorNotesAfterFix = await page.evaluate(() =>
    [...document.querySelectorAll('[id^="e-"]')].map(e => e.id + ' → ' + e.textContent.trim()));

  // the seal is the only submit button on the page; its label is a sibling
  // div, not its own text, so it has to be found by role rather than by words
  await page.click('button[type="submit"]');
  const seen = new Set();
  for (let i = 0; i < 40; i++) {
    const l = await page.evaluate(() => document.body.innerText.match(/PRESS SEAL|SEALING…|SEALED/)?.[0] || '');
    if (l) seen.add(l);
    await page.waitForTimeout(100);
  }
  report.sealLabelsSeen = [...seen];
  await page.waitForTimeout(1800);
  report.finalScreen = await page.evaluate(() => document.body.innerText.replace(/\s+/g, ' ').trim().slice(0, 220));

  await page.screenshot({ path: __dirname + '/results/signup-done.png' });

  report.failedResponses = failed;
  report.consoleErrors = errors;
  report.consoleWarnings = warnings.slice(0, 10);
  console.log(JSON.stringify(report, null, 2));
  await browser.close();
})().catch(e => { console.error('PROBE FAILED:', e); process.exit(1); });
