/* probe-yard-motion.js — two questions the static read cannot answer:
   1. does the drawer's "Reduce motion" promise reach the new gnome and tour,
      or does it still only reach the plot?
   2. what does the tour's spring cost per frame — it goes through setState,
      which the plot's own drag handlers deliberately do not.
   node serve.js first, then: URL=... node probe-yard-motion.js               */
const { chromium } = require('playwright');
const URL = process.env.URL || 'http://localhost:4321/yard/';

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: false });
  const ctx = await browser.newContext({ viewport: { width: 1500, height: 950 } });
  const page = await ctx.newPage();
  await require('./gnome').signIn(ctx, URL);   // /yard is a signed-in gnome's page now (gnome.js)
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(300);

  const R = {};
  const armD = () => page.evaluate(() => { const p = [...document.querySelectorAll('svg path')].filter(q => +(q.getAttribute('stroke-width') || 0) > 8 && (q.getAttribute('d') || '').indexOf('C') >= 0); return p.length ? p[p.length - 1].getAttribute('d') : null; });
  const headDeg = () => page.evaluate(() => { const g = document.querySelector('[aria-label*="gnome" i]'); if (!g) return null; const h = [...g.querySelectorAll('g')].map(x => x.style.transform).filter(Boolean); return h.slice(0, 3).join(' | '); });

  // ── 1 · does the gnome follow the cursor at all, and does reduce-motion stop it?
  await page.mouse.move(300, 300); await page.waitForTimeout(200);
  const h1 = await headDeg();
  await page.mouse.move(1300, 800); await page.waitForTimeout(300);
  const h2 = await headDeg();
  R.gnomeFollowsCursor = { before: h1, after: h2, moved: h1 !== h2 };

  // turn reduce motion on through the drawer, the way a person would
  await page.keyboard.press('Escape'); await page.waitForTimeout(200);
  await page.evaluate(() => { try { localStorage.setItem('knoll-yard:tour', '1'); } catch (e) {} });
  await page.reload({ waitUntil: 'networkidle' }); await page.waitForTimeout(600);
  const gear = page.locator('button[title*="setting" i], button[aria-label*="setting" i]').first();
  await gear.click(); await page.waitForTimeout(400);
  const motion = page.locator('label', { hasText: /reduce motion/i }).locator('input[type=checkbox]').first();
  R.reduceMotionCheckboxFound = await motion.count();
  if (R.reduceMotionCheckboxFound) { await motion.check(); await page.waitForTimeout(300); }
  await page.keyboard.press('Escape'); await page.waitForTimeout(400);
  R.reduceMotionStored = await page.evaluate(() => { try { return JSON.parse(localStorage.getItem('knoll-yard:settings')).reduceMotion; } catch (e) { return 'unreadable'; } });

  await page.mouse.move(200, 200); await page.waitForTimeout(250);
  const h3 = await headDeg();
  await page.mouse.move(1350, 850); await page.waitForTimeout(350);
  const h4 = await headDeg();
  R.gnomeStillFollowsWithReduceMotion = { before: h3, after: h4, moved: h3 !== h4 };

  R.plotStillClassApplied = await page.evaluate(() => { const p = document.querySelector('.plot-yard'); return p ? p.className : null; });

  // does the tour still animate + smooth-scroll under reduce motion?
  await page.evaluate(() => { const g = document.querySelector('[aria-label*="gnome" i]'); if (g) g.click(); });
  await page.waitForTimeout(150);
  const s1 = await armD(); await page.waitForTimeout(120); const s2 = await armD(); await page.waitForTimeout(120); const s3 = await armD();
  R.tourArmAnimatesUnderReduceMotion = !!(s1 && (s1 !== s2 || s2 !== s3));

  // scroll behaviour used by place()
  R.smoothScrollUsed = await page.evaluate(() => { const src = [...document.querySelectorAll('script')].map(s => s.textContent).join(''); const m = src.match(/scrollTo\(\{[^}]*\}\)/); return m ? m[0] : null; });

  // ── 2 · what a tour frame costs ─────────────────────────────────────────
  await page.evaluate(() => { try { localStorage.clear(); } catch (e) {} });
  await page.reload({ waitUntil: 'networkidle' }); await page.waitForTimeout(300);
  await page.evaluate(() => {
    window.__f = { frames: 0, longest: 0, t0: performance.now() };
    const tick = (t) => { const n = performance.now(); const d = n - (window.__f.last || n); window.__f.last = n; if (window.__f.frames) { window.__f.longest = Math.max(window.__f.longest, d); (window.__f.d = window.__f.d || []).push(d); } window.__f.frames++; requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  });
  await page.waitForTimeout(1000);                       // idle baseline (tour fires at 900ms)
  R.idle = await page.evaluate(() => { const d = (window.__f.d || []).slice(); window.__f.d = []; d.sort((a, b) => a - b); return { frames: d.length, median: +d[Math.floor(d.length / 2)]?.toFixed(1), p95: +d[Math.floor(d.length * 0.95)]?.toFixed(1), longest: +Math.max(...d).toFixed(1) }; });
  await page.waitForTimeout(1200);                       // the tour is up and the arm is springing
  R.duringTourSpring = await page.evaluate(() => { const d = (window.__f.d || []).slice(); window.__f.d = []; d.sort((a, b) => a - b); return { frames: d.length, median: +d[Math.floor(d.length / 2)]?.toFixed(1), p95: +d[Math.floor(d.length * 0.95)]?.toFixed(1), longest: +Math.max(...d).toFixed(1) }; });
  // drag the hand: the spring runs flat out, one setState per frame
  const hand = await page.evaluate(() => { const p = [...document.querySelectorAll('svg path')].filter(q => +(q.getAttribute('stroke-width') || 0) > 8 && (q.getAttribute('d') || '').indexOf('C') >= 0); if (!p.length) return null; const d = p[p.length - 1].getAttribute('d'); const m = d.match(/([-\d.]+),([-\d.]+)$/); return m ? { x: +m[1], y: +m[2] } : null; });
  R.handTip = hand;
  if (hand) {
    await page.mouse.move(hand.x, hand.y); await page.mouse.down();
    await page.evaluate(() => { window.__f.d = []; });
    for (let i = 0; i < 30; i++) { await page.mouse.move(hand.x + i * 12, hand.y + Math.sin(i / 3) * 60); await page.waitForTimeout(16); }
    R.duringHandDrag = await page.evaluate(() => { const d = (window.__f.d || []).slice(); d.sort((a, b) => a - b); return { frames: d.length, median: +d[Math.floor(d.length / 2)]?.toFixed(1), p95: +d[Math.floor(d.length * 0.95)]?.toFixed(1), longest: +Math.max(...d).toFixed(1) }; });
    await page.mouse.up(); await page.waitForTimeout(600);
  }

  // how many DOM nodes a tour frame re-walks
  R.domNodes = await page.evaluate(() => document.querySelectorAll('*').length);

  console.log(JSON.stringify(R, null, 2));
  await browser.close();
})().catch(e => { console.error('PROBE FAILED', e); process.exit(1); });
