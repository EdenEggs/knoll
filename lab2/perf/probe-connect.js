/* probe-connect.js — walks every door between the four standalone pages and
   reports what actually happens, rather than what the hrefs say.
   /signup ─┐                    ┌─ /dashboard
            ├→ /yard ←→ ────────┤
   /login ──┘   └─ SIGN OUT → /login
   node serve.js first, then: node probe-connect.js                           */
const { chromium } = require('playwright');
const ROOT = process.env.ROOT || 'http://localhost:4321';

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: false });
  const ctx = await browser.newContext({ viewport: { width: 1500, height: 950 } });
  const page = await ctx.newPage();
  const errors = {}, bad = {};
  let where = 'start';
  page.on('console', m => { if (m.type() === 'error') (errors[where] = errors[where] || []).push(m.text()); });
  page.on('pageerror', e => (errors[where] = errors[where] || []).push('PAGEERROR: ' + e.message));
  page.on('response', r => { if (r.status() >= 400) (bad[where] = bad[where] || []).push(r.status() + ' ' + r.url()); });

  const R = {};
  const path = () => new URL(page.url()).pathname;

  const readBar = () => page.evaluate(() => {
    const head = document.querySelector('.knoll-head');
    if (!head) return { bar: false };
    const hr = head.getBoundingClientRect();
    const brand = document.querySelector('.knoll-brand');
    const sw = document.querySelector('.knoll-switch');
    const pills = sw ? [...sw.querySelectorAll('a')].map(a => {
      const s = getComputedStyle(a), r = a.getBoundingClientRect();
      return { text: a.textContent.trim(), href: a.getAttribute('href'), current: a.getAttribute('aria-current') || null,
               bg: s.backgroundColor, color: s.color, font: s.fontFamily.split(',')[0].replace(/"/g, ''), size: s.fontSize,
               radius: s.borderRadius, onScreen: r.left >= -1 && r.right <= document.documentElement.clientWidth + 1 };
    }) : null;
    return { bar: true, barTop: Math.round(hr.top), barLeft: Math.round(hr.left), barRight: Math.round(hr.right),
             barHeight: Math.round(hr.height), viewport: document.documentElement.clientWidth,
             fullBleed: Math.abs(hr.left) < 0.6 && Math.abs(hr.right - document.documentElement.clientWidth) < 0.6,
             flushTop: Math.abs(hr.top) < 0.6,
             brandHref: brand ? brand.getAttribute('href') : null,
             markLoaded: brand && brand.querySelector('img') ? brand.querySelector('img').naturalWidth : null,
             navLabel: sw ? sw.getAttribute('aria-label') : null, pills };
  });

  // ── 1 · the bar and the switch, on both pages ───────────────────────────
  for (const p of ['/yard/', '/dashboard/']) {
    where = p;
    await page.goto(ROOT + p, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1200);
    R['bar' + p] = await readBar();
  }

  // ── 2 · the switch actually switches, both ways ─────────────────────────
  where = 'switch';
  await page.goto(ROOT + '/yard/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1400);
  await page.keyboard.press('Escape');                      // dismiss the tour
  await page.waitForTimeout(300);
  await page.click('.knoll-switch a[href="../dashboard/"]');
  await page.waitForLoadState('networkidle'); await page.waitForTimeout(700);
  R.yardSwitchToDashboard = path();
  await page.click('.knoll-switch a[href="../yard/"]');
  await page.waitForLoadState('networkidle'); await page.waitForTimeout(900);
  R.dashboardSwitchToYard = path();

  // ── 3 · the yard's own header pill ──────────────────────────────────────
  where = 'headerPill';
  await page.keyboard.press('Escape'); await page.waitForTimeout(400);
  const pill = page.locator('a[title*="dashboard" i]').first();
  R.headerPillHref = await pill.getAttribute('href');
  await pill.click();
  await page.waitForLoadState('networkidle'); await page.waitForTimeout(600);
  R.headerPillLandsOn = path();

  // ── 4 · sign out → the gate ─────────────────────────────────────────────
  where = 'signout';
  await page.goto(ROOT + '/yard/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1400);
  await page.keyboard.press('Escape'); await page.waitForTimeout(300);
  await page.locator('button[title*="setting" i], button[aria-label*="setting" i]').first().click();
  await page.waitForTimeout(400);
  await page.locator('button').filter({ hasText: /^SIGN OUT$/ }).first().click();
  await page.waitForTimeout(400);
  R.signoutNote = await page.evaluate(() => {
    const d = [...document.querySelectorAll('div')].find(x => /no account system yet/.test(x.textContent) && x.querySelector('a'));
    if (!d) return null;
    const a = d.querySelector('a');
    return { text: d.textContent.replace(/\s+/g, ' ').trim(), linkText: a.textContent.trim(), linkHref: a.getAttribute('href') };
  });
  if (R.signoutNote) {
    await page.locator('a[href="../login/"]').first().click();
    await page.waitForLoadState('networkidle'); await page.waitForTimeout(900);
    R.signoutLandsOn = path();
  }

  // ── 5 · the gates' doors into the village ───────────────────────────────
  for (const gate of ['/signup/', '/login/']) {
    where = gate;
    await page.goto(ROOT + gate, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2200);
    const link = await page.evaluate(() => {
      const a = [...document.querySelectorAll('a')].find(x => /into the village/i.test(x.textContent));
      return a ? { href: a.getAttribute('href'), text: a.textContent.trim(), visible: a.offsetParent !== null } : null;
    });
    R['villageLink' + gate] = link;
    // and it works once the form is done — force the done state through the form
    R['gateHasNoOtherDeadLinks' + gate] = await page.evaluate(() => [...document.querySelectorAll('a[href="#"]')].map(a => a.textContent.trim().slice(0, 30)));
  }

  // ── 6 · does the village link land, when it is reachable ────────────────
  where = 'signupWalk';
  await page.goto(ROOT + '/signup/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2400);
  await page.fill('input[type=text]', 'Bramble').catch(() => {});
  const inputs = await page.locator('input:visible').all();
  const vals = ['Bramble', 'bramble@knoll.space', 'toadstool99', 'toadstool99'];
  for (let i = 0; i < inputs.length && i < vals.length; i++) { await inputs[i].fill(vals[i]).catch(() => {}); }
  await page.locator('button[type=submit]').first().click().catch(() => {});
  await page.waitForTimeout(3600);
  R.signupReachedDone = await page.evaluate(() => !![...document.querySelectorAll('a')].find(x => /into the village/i.test(x.textContent) && x.offsetParent !== null));
  if (R.signupReachedDone) {
    await page.locator('a').filter({ hasText: /into the village/i }).first().click();
    await page.waitForLoadState('networkidle'); await page.waitForTimeout(800);
    R.signupVillageLandsOn = path();
  }

  // ── 7 · narrow: does the bar's switch still fit? ────────────────────────
  where = 'narrow';
  await page.setViewportSize({ width: 375, height: 812 });
  for (const p of ['/yard/', '/dashboard/']) {
    await page.goto(ROOT + p, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1300);
    R['narrowBar' + p] = await readBar();
    await page.screenshot({ path: 'results/connect-narrow-' + p.replace(/\//g, '') + '.png', clip: { x: 0, y: 0, width: 375, height: 150 } });
  }
  await page.setViewportSize({ width: 1500, height: 950 });
  for (const p of ['/yard/', '/dashboard/']) {
    await page.goto(ROOT + p, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1400);
    await page.screenshot({ path: 'results/connect-wide-' + p.replace(/\//g, '') + '.png', clip: { x: 0, y: 0, width: 900, height: 130 } });
  }

  R.consoleErrors = Object.fromEntries(Object.entries(errors).map(([k, v]) => [k, [...new Set(v)]]));
  R.failedRequests = bad;
  console.log(JSON.stringify(R, null, 2));
  await browser.close();
})().catch(e => { console.error('PROBE FAILED', e); process.exit(1); });
