const { chromium } = require('playwright');
const desc = () => {
  const a = document.activeElement; if (!a) return 'null';
  return a.tagName + (a.id ? '#' + a.id : '') + (a.type ? '[' + a.type + ']' : '')
    + ' text="' + (a.textContent || '').trim().slice(0, 26) + '"'
    + ' disabled=' + (a.disabled === undefined ? 'n/a' : a.disabled);
};
(async () => {
  const b = await chromium.launch({ channel: 'chrome', headless: true });
  const out = {};

  // ── A. the 'taken' outcome: seal re-enables, where is focus? ──
  {
    const p = await (await b.newContext({ viewport: { width: 1500, height: 950 } })).newPage();
    await p.goto('http://localhost:4399/signup/_tmp-taken.html', { waitUntil: 'networkidle' });
    await p.waitForTimeout(2600);
    await p.fill('#f-name', 'Bramble'); await p.fill('#f-email', 'b@knoll.space');
    await p.fill('#f-pw', 'acorncellar'); await p.fill('#f-pw2', 'acorncellar');
    await p.evaluate(() => document.querySelector('button[type=submit]').focus());
    await p.keyboard.press('Enter');
    await p.waitForTimeout(80);
    out.taken_focus_80ms = await p.evaluate(desc);
    await p.waitForTimeout(2400);   // past the 2060ms 'cracked'
    out.taken_focus_2480ms = await p.evaluate(desc);
    out.taken_sealDisabled = await p.evaluate(() => document.querySelector('button[type=submit]').disabled);
    out.taken_note = await p.evaluate(() => { const e = document.getElementById('e-email'); return e ? e.innerText.trim() : 'no note'; });
    out.taken_live = await p.evaluate(() => { const l = document.querySelector('[aria-live]'); return l ? l.textContent : 'none'; });
    // how many tabs from body to get back to the seal?
    await p.evaluate(() => document.body.focus());
    const chain = []; for (let i = 0; i < 12; i++) { await p.keyboard.press('Tab'); chain.push(await p.evaluate(desc)); }
    out.taken_tabChain = chain;
    await p.close();
  }

  // ── B. the Google path: does refs.name.focus() at line 483 actually land? ──
  {
    const p = await (await b.newContext({ viewport: { width: 1500, height: 950 } })).newPage();
    await p.goto('http://localhost:4399/signup/', { waitUntil: 'networkidle' });
    await p.waitForTimeout(2600);
    await p.evaluate(() => [...document.querySelectorAll('button')].find(x => /Google vouch/.test(x.textContent)).click());
    for (const t of [100, 900, 2400, 3100, 3700, 4400]) {
      await p.waitForTimeout(t === 100 ? 100 : 0);
      out['google_@' + t] = null;
    }
    const marks = [];
    const stamps = [100, 500, 1000, 2000, 2500, 3000, 3500, 4000, 4600, 5200];
    let prev = 0;
    for (const s of stamps) { await p.waitForTimeout(s - prev); prev = s; marks.push(s + 'ms: ' + await p.evaluate(desc)); }
    out.google_focusOverTime = marks;
    out.google_heading = await p.evaluate(() => document.querySelector('h1') ? document.querySelector('h1').innerText : '?');
    await p.close();
  }
  for (const k of Object.keys(out)) if (out[k] === null) delete out[k];
  console.log(JSON.stringify(out, null, 2));
  await b.close();
})().catch(e => { console.error('FAIL', e.message, e.stack); process.exit(1); });
