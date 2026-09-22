/* probe-yard-audit.js — reproduces (or refutes) the defects the audit raised
   against the Gnome Tour export that a static read cannot settle. Each block
   prints what actually happened, not what the code looks like it would do.
   node serve.js first, then: node probe-yard-audit.js                        */
const { chromium } = require('playwright');
const URL = process.env.URL || 'http://localhost:4321/yard/';

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: false });
  const R = {};

  // ── A · the house bar's negative margins vs the ≤860 root padding ────────
  {
    const ctx = await browser.newContext({ viewport: { width: 375, height: 812 } });
    const p = await ctx.newPage();
    await require('./gnome').signIn(ctx, URL);   // /yard is a signed-in gnome's page now (gnome.js)
    await p.goto(URL, { waitUntil: 'networkidle' }); await p.waitForTimeout(900);
    R.A_houseBar = await p.evaluate(() => {
      const h = document.querySelector('.knoll-head'), root = document.querySelector('.yard-root');
      const hr = h.getBoundingClientRect(), rr = root.getBoundingClientRect();
      const rs = getComputedStyle(root), hs = getComputedStyle(h);
      return { rootPadding: rs.paddingTop + ' ' + rs.paddingRight + ' ' + rs.paddingBottom + ' ' + rs.paddingLeft, barMargin: hs.marginTop + ' ' + hs.marginRight + ' ' + hs.marginBottom + ' ' + hs.marginLeft, barTop: Math.round(hr.top), barLeft: Math.round(hr.left), barRight: Math.round(hr.right), rootTop: Math.round(rr.top), viewportW: document.documentElement.clientWidth, barCroppedAbove: hr.top < -0.5, barBleedsSideways: hr.left < -0.5 || hr.right > document.documentElement.clientWidth + 0.5 };
    });
    await p.screenshot({ path: 'results/yard-audit-bar-375.png', clip: { x: 0, y: 0, width: 375, height: 200 } });
    await ctx.close();
  }

  const ctx = await browser.newContext({ viewport: { width: 1500, height: 950 } });
  const page = await ctx.newPage();
  await require('./gnome').signIn(ctx, URL);   // /yard is a signed-in gnome's page now (gnome.js)
  const pageErrors = [];
  page.on('pageerror', e => pageErrors.push(String(e.message)));
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1600);

  // ── B · does the gnome cover the dashboard link? ─────────────────────────
  R.B_gnomeOverDashboard = await page.evaluate(() => {
    const g = document.querySelector('[aria-label*="gnome" i]');
    const a = document.querySelector('a[href="#dashboard"]');
    if (!g || !a) return { gnome: !!g, dashboard: !!a };
    const gr = g.getBoundingClientRect(), ar = a.getBoundingClientRect();
    const overlap = !(gr.right < ar.left || gr.left > ar.right || gr.bottom < ar.top || gr.top > ar.bottom);
    const mid = document.elementFromPoint(ar.left + ar.width / 2, ar.top + ar.height / 2);
    return { gnomeRect: [Math.round(gr.left), Math.round(gr.top), Math.round(gr.right), Math.round(gr.bottom)], dashRect: [Math.round(ar.left), Math.round(ar.top), Math.round(ar.right), Math.round(ar.bottom)], boxesOverlap: overlap, whatIsAtTheDashboardsCentre: mid ? (mid.tagName + ' ' + (mid.getAttribute('aria-label') || mid.textContent || '').trim().slice(0, 28)) : null, dashboardIsHittable: !!(mid && (mid === a || a.contains(mid))) };
  });

  // ── L · does the tour's overlay hand swallow the target's clicks? ────────
  R.L_overlaySwallows = await page.evaluate(() => {
    const svgs = [...document.querySelectorAll('svg')].filter(s => { const st = getComputedStyle(s); return st.position === 'fixed' || st.position === 'absolute'; });
    const overlay = svgs.find(s => +getComputedStyle(s).zIndex >= 19);
    if (!overlay) return 'no overlay found';
    return { zIndex: getComputedStyle(overlay).zIndex, pointerEvents: getComputedStyle(overlay).pointerEvents, childrenWithPointerEvents: [...overlay.querySelectorAll('*')].filter(c => getComputedStyle(c).pointerEvents !== 'none').length };
  });

  // ── D/W · is the tour's `next` button on screen at each step? ────────────
  R.D_stepsOnScreen = [];
  for (let i = 0; i < 5; i++) {
    const s = await page.evaluate(() => {
      const h = [...document.querySelectorAll('h3')].find(x => x.offsetParent !== null);
      if (!h) return null;
      const card = h.parentElement, cr = card.getBoundingClientRect();
      const btn = [...card.querySelectorAll('button')].find(b => /next|done/i.test(b.textContent));
      const br = btn ? btn.getBoundingClientRect() : null;
      return { title: h.textContent.trim(), cardH: Math.round(cr.height), cardBottom: Math.round(cr.bottom), vh: window.innerHeight, nextBottom: br ? Math.round(br.bottom) : null, nextFullyVisible: br ? br.bottom <= window.innerHeight && br.top >= 0 : null };
    });
    if (!s) break;
    R.D_stepsOnScreen.push(s);
    const btn = page.locator('button').filter({ hasText: /next|done/i }).first();
    if (!(await btn.count())) break;
    await btn.click(); await page.waitForTimeout(750);
  }

  // ── C · does a resize yank the page back to the step? ────────────────────
  await page.evaluate(() => { try { localStorage.clear(); } catch (e) {} });
  await page.reload({ waitUntil: 'networkidle' }); await page.waitForTimeout(1500);
  await page.evaluate(() => window.scrollTo(0, 1400));
  await page.waitForTimeout(500);
  const beforeResize = await page.evaluate(() => Math.round(window.scrollY));
  await page.setViewportSize({ width: 1400, height: 900 });
  await page.waitForTimeout(900);
  const afterResize = await page.evaluate(() => Math.round(window.scrollY));
  R.C_resizeYanksScroll = { scrollBefore: beforeResize, scrollAfter: afterResize, moved: Math.abs(afterResize - beforeResize) > 30 };
  await page.setViewportSize({ width: 1500, height: 950 }); await page.waitForTimeout(400);

  // ── F · does picking a file hijack the save button? ──────────────────────
  await page.keyboard.press('Escape'); await page.waitForTimeout(300);
  const saveFace = () => page.evaluate(() => { const b = document.querySelector('button[title*="save" i]'); return b ? { text: b.textContent.trim(), bg: getComputedStyle(b).backgroundColor } : null; });
  R.F_saveBefore = await saveFace();
  await page.setInputFiles('input[type=file]', { name: 'toadstool.png', mimeType: 'image/png', buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47]) });
  await page.waitForTimeout(400);
  R.F_saveAfterPickingAFile = await saveFace();
  await page.waitForTimeout(1800);
  R.F_saveAfterTheFlash = await saveFace();

  // ── E · does an empty plot claim to be unsaved? ───────────────────────────
  R.E_dirtyPillOnEmptyPlot = await page.evaluate(() => {
    const pill = [...document.querySelectorAll('span, div')].find(d => /MOVED — NOT SAVED|DEFAULT SAVED/.test(d.textContent) && d.children.length === 0);
    return pill ? pill.textContent.trim() : null;
  });
  // now with a plot saved by the previous version of the page
  await page.evaluate(() => { try { localStorage.setItem('knoll-yard:plot', JSON.stringify({ 'the-oak': { x: 40, y: 70 }, 'a-birch': { x: 62, y: 55 } })); } catch (e) {} });
  await page.reload({ waitUntil: 'networkidle' }); await page.waitForTimeout(1200);
  R.E_dirtyPillWithAnOldSavedPlot = await page.evaluate(() => {
    const pill = [...document.querySelectorAll('span, div')].find(d => /MOVED — NOT SAVED|DEFAULT SAVED/.test(d.textContent) && d.children.length === 0);
    return pill ? pill.textContent.trim() : null;
  });

  // ── K · a malformed favourites value ─────────────────────────────────────
  await page.evaluate(() => { try { localStorage.setItem('yard.favHills', '{"not":"an array"}'); } catch (e) {} });
  const errsBefore = pageErrors.length;
  await page.reload({ waitUntil: 'networkidle' }); await page.waitForTimeout(1200);
  R.K_malformedFavHills = { newPageErrors: pageErrors.slice(errsBefore), pageStillRenders: await page.evaluate(() => !!document.querySelector('.yard-title')) };
  await page.evaluate(() => { try { localStorage.clear(); } catch (e) {} });

  // ── P · does the rename input honour its 28-char cap? ────────────────────
  await page.reload({ waitUntil: 'networkidle' }); await page.waitForTimeout(1400);
  await page.keyboard.press('Escape'); await page.waitForTimeout(300);
  const rn = page.locator('button[title*="rename" i]').first();
  if (await rn.count()) {
    await rn.click(); await page.waitForTimeout(300);
    await page.keyboard.press('Control+a');
    await page.keyboard.type('abcdefghijklmnopqrstuvwxyz0123456789');
    R.P_renameCap = await page.evaluate(() => { const i = document.querySelector('input[aria-label="plot name"]'); return i ? { value: i.value, length: i.value.length, maxLengthAttr: i.getAttribute('maxlength'), maxLengthProp: i.maxLength } : null; });
    await page.keyboard.press('Escape');
  }

  R.pageErrors = pageErrors;
  console.log(JSON.stringify(R, null, 2));
  await browser.close();
})().catch(e => { console.error('PROBE FAILED', e); process.exit(1); });
