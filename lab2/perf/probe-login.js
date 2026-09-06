/* probe-login.js — drives /login end to end in a real Chrome. Twin of
   probe-signup.js: the log-in page is the sign-up page's counterpart and shares
   its architecture, so this checks the same things, plus the key-and-lock state
   machine and the wrong-secret-word path that replace the wax seal.

   node serve.js first, then: node probe-login.js                            */
const { chromium } = require('playwright');
const URL = process.env.URL || 'http://localhost:4321/login/';
const txt = p => p.evaluate(() => document.body.innerText.replace(/\s+/g, ' ').trim());
const label = p => p.evaluate(() => {
  const m = document.body.innerText.match(/TURN THE KEY|TURNING|UNLOCKED/);
  return m ? m[0] : '';
});

(async () => {
  const b = await chromium.launch({ channel: 'chrome', headless: false });
  const out = {};

  // ── 1 · boot, wiring, validation, the happy path ───────────────────────
  {
    const p = await (await b.newContext({ viewport: { width: 1500, height: 950 } })).newPage();
    const errs = [], reqs = [], bad = [];
    p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
    p.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
    p.on('request', r => reqs.push(r.url()));
    p.on('response', r => { if (r.status() >= 400) bad.push(r.status() + ' ' + r.url()); });
    await p.goto(URL, { waitUntil: 'networkidle' });
    await p.waitForTimeout(2500);

    out.title = await p.title();
    out.thirdParty = reqs.filter(u => !u.startsWith('http://localhost:4321'));
    out.badResponses = bad;
    out.unrendered = await p.evaluate(() => (document.body.innerHTML.match(/\{\{[^}]{1,40}\}\}/g) || []).slice(0, 5));
    out.undefinedOrNaN = await p.evaluate(() => (document.body.innerHTML.match(/undefined|NaN/g) || []).length);
    out.fields = await p.evaluate(() => [...document.querySelectorAll('input')].map(i => i.id + ':' + i.type));
    out.signupLink = await p.evaluate(() => {
      const a = document.querySelector('a[href="../signup/"]');
      return a ? a.textContent.trim() : 'MISSING';
    });
    out.houseBar = await p.evaluate(() => {
      const h = document.querySelector('.knoll-head'), a = document.querySelector('.knoll-brand');
      if (!h || !a) return 'MISSING';
      const r = h.getBoundingClientRect(), cs = getComputedStyle(a);
      return { top: r.top, left: r.left, width: Math.round(r.width), height: Math.round(r.height),
               spansViewport: Math.abs(r.width - innerWidth) < 2,
               text: a.textContent.trim(), href: a.getAttribute('href'),
               font: cs.fontFamily.split(',')[0].replace(/["']/g, ''), weight: cs.fontWeight,
               logo: !!h.querySelector('img') };
    });
    out.scrollClearsBar = await p.evaluate(() => {
      const bar = document.querySelector('.knoll-head');
      const sc = document.querySelector('form') || document.body;
      return bar.getBoundingClientRect().bottom <= sc.getBoundingClientRect().top + 1;
    });

    // the arm follows the cursor
    const a1 = await p.evaluate(() => { const e = document.querySelector('path[d^="M"][stroke-width]'); return e && e.getAttribute('d'); });
    await p.mouse.move(400, 300); await p.waitForTimeout(120);
    await p.mouse.move(1100, 700); await p.waitForTimeout(400);
    const a2 = await p.evaluate(() => { const e = document.querySelector('path[d^="M"][stroke-width]'); return e && e.getAttribute('d'); });
    out.armFollowsCursor = !!(a1 && a2 && a1 !== a2);

    // validation
    await p.click('#f-email'); await p.keyboard.type('not-an-email');
    await p.click('#f-pw'); await p.keyboard.type('x'); await p.keyboard.press('Backspace');
    await p.click('body', { position: { x: 30, y: 300 } });
    await p.waitForTimeout(600);
    out.errorNotes = await p.evaluate(() => [...document.querySelectorAll('[id^="e-"]')].map(e => e.id + ' -> ' + e.textContent.trim()));
    out.live = await p.evaluate(() => { const e = document.querySelector('[aria-live]'); return e && e.textContent.trim(); });

    // fix it, then turn the key
    await p.fill('#f-email', ''); await p.click('#f-email'); await p.keyboard.type('bramble@knoll.space');
    await p.fill('#f-pw', ''); await p.click('#f-pw'); await p.keyboard.type('eightletters');
    await p.click('body', { position: { x: 30, y: 300 } }); await p.waitForTimeout(400);
    out.notesCleared = await p.evaluate(() => document.querySelectorAll('[id^="e-"]').length);

    out.labelBefore = await label(p);
    await p.click('button[type="submit"]');
    const seen = new Set();
    for (let i = 0; i < 45; i++) { const l = await label(p); if (l) seen.add(l); await p.waitForTimeout(100); }
    out.lockLabels = [...seen];
    await p.waitForTimeout(1500);
    out.welcomed = (await txt(p)).indexOf('Welcome back') >= 0;
    out.consoleErrors = errs;
    await p.screenshot({ path: __dirname + '/results/login-done.png' });
  }

  // ── 2 · the wrong secret word. The pretend server is `pw === '0'`. ──────
  {
    const p = await (await b.newContext({ viewport: { width: 1500, height: 950 } })).newPage();
    const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.goto(URL, { waitUntil: 'networkidle' }); await p.waitForTimeout(2400);
    await p.click('#f-email'); await p.keyboard.type('bramble@knoll.space');
    await p.click('#f-pw'); await p.keyboard.type('0');
    await p.click('button[type="submit"]');
    await p.waitForTimeout(6500);
    const t = await txt(p);
    out.wrongWordRejected = t.indexOf('not the secret word the gate remembers') >= 0;
    out.wrongWordNotWelcomed = t.indexOf('Welcome back') < 0;
    out.wrongWordErrors = errs;
    await p.screenshot({ path: __dirname + '/results/login-wrong.png' });
  }

  // ── 3 · Google, remember-me, and the narrow layout ─────────────────────
  {
    const p = await (await b.newContext({ viewport: { width: 1500, height: 950 } })).newPage();
    await p.goto(URL, { waitUntil: 'networkidle' }); await p.waitForTimeout(2400);
    out.rememberDefault = await p.evaluate(() => { const c = document.querySelector('input[type=checkbox]'); return c ? c.checked : 'no checkbox'; });
    await p.click('button:has-text("Google knows me")');
    await p.waitForTimeout(3800);
    out.googleWelcomed = (await txt(p)).indexOf('Welcome back') >= 0;
  }
  {
    const p = await (await b.newContext({ viewport: { width: 420, height: 900 } })).newPage();
    await p.goto(URL, { waitUntil: 'networkidle' }); await p.waitForTimeout(2400);
    await p.click('#f-email'); await p.keyboard.type('nope');
    await p.click('button[type="submit"]'); await p.waitForTimeout(900);
    const m = await p.evaluate(() => {
      const paper = [...document.querySelectorAll('div')].find(x => x.style.transition && x.style.transition.indexOf('height') >= 0);
      const inner = paper && paper.firstElementChild;
      return paper ? { box: Math.round(paper.getBoundingClientRect().height), content: inner ? Math.round(inner.scrollHeight) : null } : null;
    });
    out.narrow = m;
    out.narrowSpill = !!(m && m.content > m.box + 2);
    out.narrowNoPageOverflow = await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1);
    out.narrowBarSpans = await p.evaluate(() => {
      const h = document.querySelector('.knoll-head');
      return h ? Math.abs(h.getBoundingClientRect().width - innerWidth) < 2 : 'MISSING';
    });
    await p.screenshot({ path: __dirname + '/results/login-narrow.png' });
  }

  // ── 4 · storage that throws (fix 1's reproduction) ─────────────────────
  {
    const c = await b.newContext({ viewport: { width: 1500, height: 950 } });
    await c.addInitScript(() => {
      const boom = () => { throw new DOMException('Access is denied for this document.', 'SecurityError'); };
      Object.defineProperty(window, 'localStorage', {
        configurable: true,
        get() { return { getItem: boom, setItem: boom, removeItem: boom, clear: boom, key: boom, length: 0 }; },
      });
    });
    const p = await c.newPage();
    const errs = []; p.on('pageerror', e => errs.push(e.message));
    p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
    await p.goto(URL, { waitUntil: 'networkidle' }); await p.waitForTimeout(3000);
    out.blockedStorage = {
      errors: errs,
      unrolled: await p.evaluate(() => {
        const d = [...document.querySelectorAll('div')].find(x => x.style.transition && x.style.transition.indexOf('height') >= 0);
        return d ? d.style.height : 'NEVER UNROLLED';
      }),
    };
  }

  console.log(JSON.stringify(out, null, 2));
  await b.close();
})().catch(e => { console.error('PROBE FAILED:', e); process.exit(1); });
