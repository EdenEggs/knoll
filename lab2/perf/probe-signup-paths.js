/* the three paths probe-signup.js does not walk: Google's, the "taken"
   outcome that the page's one Design Canvas prop selects, and the narrow
   layout. Same rules — real Chrome, real typing.  node probe-signup-paths.js */
const { chromium } = require('playwright');
const URL = 'http://localhost:4321/signup/';
const txt = p => p.evaluate(() => document.body.innerText.replace(/\s+/g, ' ').trim());

(async () => {
  const b = await chromium.launch({ channel: 'chrome', headless: false });
  const out = {};

  // ── 1 · the Google path ────────────────────────────────────────────────
  {
    const p = await (await b.newContext({ viewport: { width: 1500, height: 950 } })).newPage();
    const errs = []; p.on('pageerror', e => errs.push(e.message));
    p.on('console', m => m.type() === 'error' && errs.push(m.text()));
    await p.goto(URL, { waitUntil: 'networkidle' }); await p.waitForTimeout(2200);
    await p.click('button:has-text("Let Google vouch for me")');
    await p.waitForTimeout(1900);                       // the interlude card
    out.googleInterlude = (await txt(p)).includes('Google vouches for you.');
    await p.waitForTimeout(3200);                       // the short form comes back
    const t = await txt(p);
    out.googleShortForm = t.includes('One thing more');
    out.googleSubhead = t.includes('Form 1-C');
    out.googleFieldsLeft = await p.evaluate(() => document.querySelectorAll('input').length);
    await p.click('#f-name'); await p.keyboard.type('Bramblefoot');
    await p.click('button[type="submit"]'); await p.waitForTimeout(4200);
    out.googleWelcome = (await txt(p)).includes('Welcome to Knoll.');
    out.googleErrors = errs;
    await p.screenshot({ path: __dirname + '/results/signup-google.png' });
  }

  // ── 2 · outcome = "taken" (the page's only prop) ───────────────────────
  {
    const p = await (await b.newContext({ viewport: { width: 1500, height: 950 } })).newPage();
    const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.goto(URL, { waitUntil: 'networkidle' }); await p.waitForTimeout(2200);
    out.propApplied = await p.evaluate(() => {
      const n = window.__dcRootName && window.__dcRootName();
      if (!window.__dcSetProps || !n) return 'no prop bridge';
      window.__dcSetProps(n, { outcome: 'taken' }); return n;
    });
    await p.waitForTimeout(600);
    await p.click('#f-name'); await p.keyboard.type('Bramblefoot');
    await p.click('#f-email'); await p.keyboard.type('bramble@knoll.space');
    await p.click('#f-pw'); await p.keyboard.type('eightletters');
    await p.click('#f-pw2'); await p.keyboard.type('eightletters');
    await p.click('button[type="submit"]'); await p.waitForTimeout(3400);
    const t = await txt(p);
    out.takenCracked = t.includes('already gets post there');
    out.takenNotWelcomed = !t.includes('Welcome to Knoll.');
    out.takenErrors = errs;
    await p.screenshot({ path: __dirname + '/results/signup-taken.png' });
  }

  // ── 3 · narrow: the margin notes go inline under their field ───────────
  {
    const p = await (await b.newContext({ viewport: { width: 420, height: 900 } })).newPage();
    const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.goto(URL, { waitUntil: 'networkidle' }); await p.waitForTimeout(2200);
    await p.click('#f-email'); await p.keyboard.type('nope');
    await p.click('#f-name'); await p.waitForTimeout(500);
    out.narrowNotePosition = await p.evaluate(() => {
      const n = document.getElementById('e-email');
      return n ? getComputedStyle(n).position : 'no note';
    });
    out.narrowNoOverflow = await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
    out.narrowErrors = errs;
    await p.screenshot({ path: __dirname + '/results/signup-narrow.png', fullPage: false });
  }

  // ── 4 · second visit: the scroll unrolls faster ────────────────────────
  {
    const c = await b.newContext({ viewport: { width: 1500, height: 950 } });
    const p = await c.newPage();
    await p.goto(URL); await p.waitForTimeout(2000);
    out.firstVisitFlag = await p.evaluate(() => localStorage.getItem('knoll-signup:seen'));
    await p.reload(); await p.waitForTimeout(2000);
    out.secondVisitOpens = await p.evaluate(() =>
      !!document.body.innerText.includes('Let it be known that'));
  }

  console.log(JSON.stringify(out, null, 2));
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
