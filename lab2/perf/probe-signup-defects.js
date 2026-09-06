/* Two claims from the audit, checked rather than taken on trust:
   (a) the unguarded localStorage.getItem in componentDidMount kills the page
       in a context where storage access throws;
   (b) the once-measured paper height overflows on a narrow screen once the
       validation notes go inline underneath their fields.               */
const { chromium } = require('playwright');
const URL = 'http://localhost:4321/signup/';

(async () => {
  const b = await chromium.launch({ channel: 'chrome', headless: false });
  const out = {};

  // ── (a) storage that throws, the way a blocked-cookies browser behaves ──
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
    const errs = [];
    p.on('pageerror', e => errs.push(e.message));
    p.on('console', m => m.type() === 'error' && errs.push(m.text()));
    await p.goto(URL, { waitUntil: 'networkidle' });
    await p.waitForTimeout(3000);
    out.blockedStorage = {
      errors: errs,
      // did the scroll unroll? if componentDidMount threw, paperH stays '0px'
      paperHeight: await p.evaluate(() => {
        const d = [...document.querySelectorAll('div')].find(x => x.style.transition && x.style.transition.includes('height'));
        return d ? d.style.height : 'no paper element';
      }),
      formVisible: await p.evaluate(() => {
        const i = document.getElementById('f-name');
        return !!i && i.getBoundingClientRect().height > 0;
      }),
      textLen: (await p.evaluate(() => document.body.innerText.trim())).length,
    };
    await p.screenshot({ path: __dirname + '/results/signup-nostorage.png' });
    await c.close();
  }

  // ── (b) narrow + inline notes vs the frozen paper height ───────────────
  {
    const p = await (await b.newContext({ viewport: { width: 420, height: 900 } })).newPage();
    await p.goto(URL, { waitUntil: 'networkidle' });
    await p.waitForTimeout(2500);
    const measure = () => p.evaluate(() => {
      const paper = [...document.querySelectorAll('div')].find(x => x.style.transition && x.style.transition.includes('height'));
      const inner = paper && paper.firstElementChild;
      return paper ? {
        set: paper.style.height,
        box: Math.round(paper.getBoundingClientRect().height),
        content: inner ? Math.round(inner.scrollHeight) : null,
        overflow: getComputedStyle(paper).overflow,
      } : null;
    });
    out.narrowBefore = await measure();
    // make all four notes appear at once
    await p.click('#f-name');  await p.keyboard.type('x'); await p.keyboard.press('Backspace');
    await p.click('#f-email'); await p.keyboard.type('nope');
    await p.click('#f-pw');    await p.keyboard.type('short');
    await p.click('#f-pw2');   await p.keyboard.type('different');
    await p.click('button[type="submit"]');
    await p.waitForTimeout(900);
    out.narrowAfter = await measure();
    out.narrowNotes = await p.evaluate(() => [...document.querySelectorAll('[id^="e-"]')].map(e => e.id));
    out.narrowSpill = out.narrowAfter && out.narrowAfter.content > out.narrowAfter.box + 2;
    await p.screenshot({ path: __dirname + '/results/signup-narrow-notes.png' });
  }

  console.log(JSON.stringify(out, null, 2));
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
