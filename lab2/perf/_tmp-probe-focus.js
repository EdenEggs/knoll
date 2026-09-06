const { chromium } = require('playwright');
const URL = 'http://localhost:4399/signup/';
const desc = () => {
  const a = document.activeElement;
  if (!a) return 'null';
  return a.tagName + (a.id ? '#' + a.id : '') + (a.type ? '[' + a.type + ']' : '')
    + ' text="' + (a.textContent || '').trim().slice(0, 28) + '"'
    + ' disabled=' + (a.disabled === undefined ? 'n/a' : a.disabled);
};
(async () => {
  const b = await chromium.launch({ channel: 'chrome', headless: true });
  const p = await (await b.newContext({ viewport: { width: 1500, height: 950 } })).newPage();
  const out = {};
  await p.goto(URL, { waitUntil: 'networkidle' });
  await p.waitForTimeout(2600);           // unroll done

  // fill a valid form with the keyboard only
  await p.fill('#f-name', 'Bramble');
  await p.fill('#f-email', 'b@knoll.space');
  await p.fill('#f-pw', 'acorncellar');
  await p.fill('#f-pw2', 'acorncellar');
  await p.waitForTimeout(300);

  // tab from the confirm field to the seal, the way a keyboard user reaches it
  await p.focus('#f-pw2');
  const chain = [];
  for (let i = 0; i < 6; i++) {
    await p.keyboard.press('Tab');
    chain.push(await p.evaluate(desc));
  }
  out.tabChainFromPw2 = chain;

  // put focus on the seal explicitly and press it with the keyboard
  const sealOK = await p.evaluate(() => {
    const btn = [...document.querySelectorAll('button[type=submit]')][0];
    if (!btn) return false; btn.focus(); return document.activeElement === btn;
  });
  out.sealFocusable = sealOK;
  out.beforePress = await p.evaluate(desc);
  await p.keyboard.press('Enter');
  await p.waitForTimeout(60);
  out.afterPress_60ms = await p.evaluate(desc);
  out.sealDisabled_60ms = await p.evaluate(() =>
    [...document.querySelectorAll('button[type=submit]')][0].disabled);
  await p.waitForTimeout(500);
  out.afterPress_560ms = await p.evaluate(desc);

  // ride it out to the done state
  await p.waitForTimeout(3200);
  out.doneText = await p.evaluate(() => document.body.innerText.replace(/\s+/g, ' ').trim().slice(0, 160));
  out.afterDone_activeElement = await p.evaluate(desc);
  out.paper = await p.evaluate(() => {
    const d = [...document.querySelectorAll('div')].find(x => x.style.transition && x.style.transition.includes('height'));
    const cs = d && getComputedStyle(d);
    return d ? { height: d.style.height, boxH: Math.round(d.getBoundingClientRect().height), overflow: cs.overflow, visibility: cs.visibility } : null;
  });
  out.nameInputBox = await p.evaluate(() => {
    const i = document.getElementById('f-name'); if (!i) return 'gone from the DOM';
    const r = i.getBoundingClientRect(); const cs = getComputedStyle(i);
    return { w: Math.round(r.width), h: Math.round(r.height), top: Math.round(r.top), display: cs.display, visibility: cs.visibility };
  });
  // tab from the top of the document after success
  await p.evaluate(() => document.body.focus());
  const after = [];
  for (let i = 0; i < 10; i++) { await p.keyboard.press('Tab'); after.push(await p.evaluate(desc)); }
  out.tabChainAfterDone = after;
  console.log(JSON.stringify(out, null, 2));
  await b.close();
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
