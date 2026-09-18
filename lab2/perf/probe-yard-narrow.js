/* probe-yard-narrow.js — what the 860px media query in the Gnome Tour export
   does and does not fix. Names every element that lands outside the viewport
   at 375px, and says whether overflow-x:clip is hiding a real control.
   node serve.js first, then: URL=... node probe-yard-narrow.js               */
const { chromium } = require('playwright');
const URL = process.env.URL || 'http://localhost:4321/yard/';

const describe = (el) => el;

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: false });
  const ctx = await browser.newContext({ viewport: { width: 375, height: 812 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e.message)));
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1800);

  const R = {};
  R.offscreen = await page.evaluate(() => {
    const W = document.documentElement.clientWidth;
    const out = [];
    const label = (el) => {
      const t = (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 34);
      const a = el.getAttribute('aria-label') || el.getAttribute('title') || '';
      return el.tagName.toLowerCase() + (a ? ' [' + a.slice(0, 28) + ']' : '') + (t ? ' "' + t + '"' : '');
    };
    // only leaf-ish interactive or text-bearing nodes, so we do not list every wrapper
    document.querySelectorAll('a, button, input, h1, h2, h3, [role="button"]').forEach(el => {
      const r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) return;
      const hiddenRight = r.left >= W - 2;      // starts past the edge: entirely gone
      const cutRight = r.right > W + 2 && !hiddenRight;
      const hiddenLeft = r.right <= 2;
      if (hiddenRight || cutRight || hiddenLeft) {
        out.push({ what: label(el), left: Math.round(r.left), right: Math.round(r.right), state: hiddenRight ? 'ENTIRELY OFF-SCREEN' : hiddenLeft ? 'OFF LEFT' : 'cut at the right edge' });
      }
    });
    return { viewportW: W, items: out };
  });

  R.clipAncestors = await page.evaluate(() => {
    const out = [];
    document.querySelectorAll('body *').forEach(el => {
      const s = getComputedStyle(el);
      if (s.overflowX === 'clip' || s.overflowX === 'hidden') out.push({ tag: el.tagName + '.' + (el.className || '').toString().slice(0, 20), overflowX: s.overflowX });
    });
    return out.slice(0, 12);
  });

  R.mediaQueryApplied = await page.evaluate(() => {
    const root = document.querySelector('.yard-root'), grid = document.querySelector('.yard-grid'), t = document.querySelector('.yard-title'), s = document.querySelector('.yard-sub');
    return {
      rootExists: !!root, gridExists: !!grid, titleExists: !!t, subExists: !!s,
      rootPadding: root ? getComputedStyle(root).padding : null,
      gridCols: grid ? getComputedStyle(grid).gridTemplateColumns : null,
      titleSize: t ? getComputedStyle(t).fontSize : null,
      titleWhiteSpace: t ? getComputedStyle(t).whiteSpace : null,
      titleWidth: t ? Math.round(t.getBoundingClientRect().width) : null,
    };
  });

  // the tour, on a phone, from a clean slate
  await page.evaluate(() => { try { localStorage.clear(); } catch (e) {} });
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  R.narrowTour = await page.evaluate(() => {
    const h = [...document.querySelectorAll('h3')].find(x => x.offsetParent !== null);
    if (!h) return null;
    const b = h.parentElement.getBoundingClientRect();
    const W = document.documentElement.clientWidth;
    return { title: h.textContent.trim(), left: Math.round(b.left), right: Math.round(b.right), top: Math.round(b.top), bottom: Math.round(b.bottom), fitsHorizontally: b.left >= -2 && b.right <= W + 2, onScreenVertically: b.top >= -2 && b.top < window.innerHeight };
  });
  R.narrowTourSteps = [];
  for (let i = 0; i < 5; i++) {
    const c = await page.evaluate(() => {
      const h = [...document.querySelectorAll('h3')].find(x => x.offsetParent !== null);
      if (!h) return null;
      const b = h.parentElement.getBoundingClientRect();
      const W = document.documentElement.clientWidth;
      return { title: h.textContent.trim(), left: Math.round(b.left), right: Math.round(b.right), top: Math.round(b.top), fits: b.left >= -2 && b.right <= W + 2 };
    });
    if (!c) break;
    R.narrowTourSteps.push(c);
    const btn = page.locator('button').filter({ hasText: /next|done/i }).first();
    if (!(await btn.count())) break;
    await btn.click(); await page.waitForTimeout(800);
  }

  await page.screenshot({ path: 'results/yard-narrow-top.png' });
  await page.evaluate(() => window.scrollTo(0, 900));
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'results/yard-narrow-mid.png' });

  R.errors = errors;
  console.log(JSON.stringify(R, null, 2));
  await browser.close();
})().catch(e => { console.error('PROBE FAILED', e); process.exit(1); });
