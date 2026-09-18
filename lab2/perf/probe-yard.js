/* probe-yard.js — drives /yard in a real Chrome and reports what the page
   actually did. A correctness check for the Design Canvas export that becomes
   site/yard/index.html, in the shape of probe-signup.js.
   Run the site's server first (node serve.js), then: node probe-yard.js
   URL=... points it at a candidate file instead of the live page.           */
const { chromium } = require('playwright');
const URL = process.env.URL || 'http://localhost:4321/yard/';

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: false });
  const ctx = await browser.newContext({ viewport: { width: 1500, height: 950 } });
  const page = await ctx.newPage();

  const errors = [], warnings = [], requests = [], failed = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); if (m.type() === 'warning') warnings.push(m.text()); });
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
  page.on('request', r => requests.push(r.url()));
  page.on('response', r => { if (r.status() >= 400) failed.push(r.status() + ' ' + r.url()); });

  const R = {};
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);

  R.title = await page.title();
  R.thirdParty = [...new Set(requests.filter(u => !u.startsWith('http://localhost:4321')))];
  R.failedRequests = failed;
  R.unrendered = await page.evaluate(() => (document.body.innerHTML.match(/\{\{[^}]{1,40}\}\}/g) || []).slice(0, 8));
  R.favicon = await page.evaluate(() => { const l = document.querySelector('link[rel=icon]'); return l ? l.getAttribute('href') : null; });
  R.barMark = await page.evaluate(() => { const i = document.querySelector('.knoll-brand img'); return i ? { src: i.getAttribute('src'), w: i.naturalWidth, h: i.naturalHeight } : null; });

  R.plot = await page.evaluate(() => {
    const box = document.querySelector('.plot-yard');
    const cap = [...document.querySelectorAll('div')].find(d => /NOTHING PLANTED|SIXTEEN TREES/.test(d.textContent) && d.children.length === 0);
    return { pieces: document.querySelectorAll('.plot-piece').length, caption: cap ? cap.textContent.trim().slice(0, 60) : null, isolation: box ? getComputedStyle(box).isolation : null };
  });

  // ── the tour ────────────────────────────────────────────────────────────
  const tourCard = () => page.evaluate(() => {
    const h = [...document.querySelectorAll('h3')].find(x => x.offsetParent !== null);
    if (!h) return null;
    const box = h.parentElement;
    const r = box.getBoundingClientRect();
    return { title: h.textContent.trim(), body: (box.textContent || '').replace(h.textContent, '').trim().slice(0, 60), x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) };
  });
  const armD = () => page.evaluate(() => { const p = [...document.querySelectorAll('svg path')].filter(q => +(q.getAttribute('stroke-width') || 0) > 8 && (q.getAttribute('d') || '').indexOf('C') >= 0); return p.length ? p[p.length - 1].getAttribute('d') : null; });

  await page.waitForTimeout(1400);                       // auto-tour fires at 900ms
  R.tourAutoStarted = await tourCard();
  R.tourKeyAfterStart = await page.evaluate(() => localStorage.getItem('knoll-yard:tour'));

  const a1 = await armD(); await page.waitForTimeout(400); const a2 = await armD();
  R.arm = { drawn: !!a1, changedWhileSettling: a1 !== a2 };

  R.tourSteps = [];
  for (let i = 0; i < 6; i++) {
    const c = await tourCard(); if (!c) break;
    R.tourSteps.push(c.title + ' @' + c.x + ',' + c.y + ' ' + c.w + 'x' + c.h);
    const btn = page.locator('button').filter({ hasText: /next|got it|done|finish/i }).first();
    if (!(await btn.count())) { R.noNextButton = true; break; }
    await btn.click(); await page.waitForTimeout(700);
  }
  R.tourEnded = !(await tourCard());
  R.tourKeyAfterEnd = await page.evaluate(() => localStorage.getItem('knoll-yard:tour'));

  await page.reload({ waitUntil: 'networkidle' }); await page.waitForTimeout(1700);
  R.tourRepeatsOnReload = !!(await tourCard());

  await page.evaluate(() => { const g = document.querySelector('[aria-label*="gnome" i]'); if (g) g.click(); });
  await page.waitForTimeout(600);
  R.gnomeRestartsTour = !!(await tourCard());

  await page.keyboard.press('Escape'); await page.waitForTimeout(350);
  R.escapeEndsTour = !(await tourCard());

  // gnome must be keyboard-operable, not just clickable
  R.gnomeKeyboard = await page.evaluate(() => { const g = document.querySelector('[aria-label*="gnome" i]'); return g ? { tag: g.tagName, role: g.getAttribute('role'), tabindex: g.getAttribute('tabindex'), hasKeyHandler: !!(g.onkeydown || g.onkeypress) } : null; });
  await page.evaluate(() => { const g = document.querySelector('[aria-label*="gnome" i]'); if (g) g.focus(); });
  await page.keyboard.press('Enter'); await page.waitForTimeout(600);
  R.enterStartsTour = !!(await tourCard());
  await page.keyboard.press('Escape'); await page.waitForTimeout(300);

  // ── the drawer, and what paints over what ───────────────────────────────
  await page.evaluate(() => { const g = document.querySelector('[aria-label*="gnome" i]'); if (g) g.click(); });
  await page.waitForTimeout(700);
  const gear = page.locator('button[title*="setting" i], button[aria-label*="setting" i]').first();
  R.gearFound = await gear.count();
  if (R.gearFound) { await gear.click(); await page.waitForTimeout(450); }
  R.drawerOverTour = await page.evaluate(() => {
    const fixed = [...document.querySelectorAll('div')].filter(d => { const s = getComputedStyle(d); return s.position === 'fixed'; }).map(d => ({ z: getComputedStyle(d).zIndex, cls: (d.className || '').toString().slice(0, 20) }));
    const pts = [[0.30, 0.30], [0.20, 0.55], [0.50, 0.20]].map(([fx, fy]) => {
      const el = document.elementFromPoint(window.innerWidth * fx, window.innerHeight * fy);
      if (!el) return 'none';
      const fx2 = el.closest('[style*="position:fixed"], [style*="position: fixed"]');
      return el.tagName + (el.namespaceURI && el.namespaceURI.indexOf('svg') >= 0 ? '(svg)' : '') + (fx2 ? ' [in fixed]' : ' [in flow]');
    });
    return { fixedLayers: fixed, hitsWithDrawerOpen: pts };
  });
  await page.keyboard.press('Escape'); await page.waitForTimeout(250);
  await page.keyboard.press('Escape'); await page.waitForTimeout(250);

  // ── settings + rename persistence ───────────────────────────────────────
  if (R.gearFound) {
    await gear.click(); await page.waitForTimeout(400);
    const nameIn = page.locator('input[type=text]').first();
    if (await nameIn.count()) { await nameIn.fill('Bramble'); await page.waitForTimeout(300); }
    await page.keyboard.press('Escape'); await page.waitForTimeout(300);
  }
  R.settingsStored = await page.evaluate(() => localStorage.getItem('knoll-yard:settings'));
  R.greeting = await page.evaluate(() => { const t = document.querySelector('.yard-title'); return t ? t.textContent.trim() : null; });

  // rename the plot
  const renameBtn = page.locator('button[title*="rename" i]').first();
  R.renameFound = await renameBtn.count();
  if (R.renameFound) {
    await renameBtn.click(); await page.waitForTimeout(300);
    await page.keyboard.type('The Long Meadow'); await page.keyboard.press('Enter'); await page.waitForTimeout(400);
  }
  R.settingsAfterRename = await page.evaluate(() => localStorage.getItem('knoll-yard:settings'));
  await page.reload({ waitUntil: 'networkidle' }); await page.waitForTimeout(900);
  R.plotNameAfterReload = await page.evaluate(() => { const b = document.querySelector('button[title*="rename" i]'); return b ? b.textContent.trim() : null; });

  // ── reset data: which keys survive it ───────────────────────────────────
  await page.evaluate(() => { try { localStorage.setItem('yard.favHills', '["x"]'); localStorage.setItem('knoll-yard:tour', '1'); } catch (e) {} });
  R.keysBeforeReset = await page.evaluate(() => Object.keys(localStorage).sort());
  page.on('dialog', d => d.accept());
  const rd = page.locator('button').filter({ hasText: /^reset data$/i }).first();
  R.resetDataFound = await rd.count();
  if (R.resetDataFound) { await rd.click(); await page.waitForTimeout(1500); }
  R.keysAfterResetData = await page.evaluate(() => Object.keys(localStorage).sort());

  // ── narrow ──────────────────────────────────────────────────────────────
  await page.setViewportSize({ width: 375, height: 812 });
  await page.reload({ waitUntil: 'networkidle' }); await page.waitForTimeout(1900);
  R.narrow = await page.evaluate(() => {
    const de = document.documentElement;
    const over = [...document.querySelectorAll('body *')].filter(el => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && (r.right > de.clientWidth + 2 || r.left < -2); }).slice(0, 8).map(el => el.tagName + '.' + (el.className || '').toString().slice(0, 22) + ' @' + Math.round(el.getBoundingClientRect().left) + '..' + Math.round(el.getBoundingClientRect().right));
    return { docW: de.clientWidth, scrollW: de.scrollWidth, hOverflow: de.scrollWidth > de.clientWidth + 1, offenders: over };
  });
  R.narrowTourCard = await tourCard();
  await page.screenshot({ path: 'results/yard-narrow.png', fullPage: false });
  await page.setViewportSize({ width: 1500, height: 950 });
  await page.waitForTimeout(600);
  await page.screenshot({ path: 'results/yard-wide.png', fullPage: false });

  R.errors = errors; R.warnings = warnings.slice(0, 6);
  console.log(JSON.stringify(R, null, 2));
  await browser.close();
})().catch(e => { console.error('PROBE FAILED', e); process.exit(1); });
