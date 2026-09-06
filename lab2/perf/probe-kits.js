/* lab2/perf/probe-kits.js — two questions, one run:
   1. why a press on a kit section may not start a drag (event trace);
   2. what a live part costs at rest (idle rAF median with animations on/off,
      live parts on/off) at 400% over the sign and at 100% over a grove. */
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: false, args: ['--window-size=1616,1110', '--window-position=0,0'] });
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  page.on('pageerror', e => console.log('PAGEERROR', String(e)));
  await page.route('**/_lab2/default', r => r.fulfill({ status: 404, body: 'no door' }));
  await page.goto('http://localhost:4321/lab2/', { waitUntil: 'load' });
  await page.waitForFunction(() => window.Lab && window.Frames && window.Kits && Kits.stats().sheets.length === 3);
  await page.waitForTimeout(1500);
  const look = async (z, wx, wy, ms = 1200) => {
    await page.evaluate(([z, wx, wy]) => { const b = Lab.bench.getBoundingClientRect(); Lab.camTo(z, b.width / 2 - wx * z, b.height / 2 - wy * z, 0); }, [z, wx, wy]);
    await page.waitForTimeout(ms);
  };

  // ── 1 · the drag trace
  const tree = 'forest-slim-pine';
  const g = await page.evaluate(id => { const el = document.querySelector('[data-gizmo="' + id + '"]'); return { x: parseFloat(el.style.left), y: parseFloat(el.style.top), w: parseFloat(el.style.width), h: parseFloat(el.style.height) }; }, tree);
  await look(1, g.x + g.w / 2, g.y + g.h / 2);
  const s = await page.evaluate(id => { const r = document.querySelector('[data-gizmo="' + id + '"]').getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; }, tree);
  const pt = { x: s.x + s.w / 2, y: s.y + s.h * 0.9 };
  const under = await page.evaluate(p => {
    const t = document.elementFromPoint(p.x, p.y);
    const path = []; let n = t; while (n && path.length < 6) { path.push(n.tagName + (n.id ? '#' + n.id : '') + (n.className && typeof n.className === 'string' ? '.' + n.className.replace(/\s+/g, '.') : '')); n = n.parentElement; }
    const cs = t && getComputedStyle(t);
    return { path, pe: cs && cs.pointerEvents, stack: document.elementsFromPoint(p.x, p.y).slice(0, 5).map(e => e.tagName + (e.className && typeof e.className === 'string' ? '.' + e.className.split(' ')[0] : '')) };
  }, pt);
  console.log('under the trunk:', JSON.stringify(under));
  await page.evaluate(id => {
    window.__trace = [];
    const el = document.querySelector('[data-gizmo="' + id + '"]');
    ['pointerdown', 'pointermove', 'pointerup', 'click'].forEach(t => {
      document.addEventListener(t, e => { if (window.__trace.length < 40) window.__trace.push(t + ' tgt=' + e.target.tagName + '.' + (typeof e.target.className === 'string' ? e.target.className.split(' ')[0] : e.target.className.baseVal) + ' inSection=' + el.contains(e.target) + ' btn=' + e.button + ' def=' + e.defaultPrevented); }, true);
    });
    const mo = new MutationObserver(rows => rows.forEach(r => window.__trace.push('mut ' + r.attributeName + ' → ' + (r.attributeName === 'class' ? el.className : el.getAttribute('style').slice(0, 80)))));
    mo.observe(el, { attributes: true, attributeFilter: ['class', 'style'] });
  }, tree);
  await page.mouse.move(pt.x, pt.y);
  await page.mouse.down();
  await page.mouse.move(pt.x + 40, pt.y + 20, { steps: 4 });
  await page.mouse.move(pt.x + 120, pt.y + 60, { steps: 6 });
  await page.mouse.up();
  await page.waitForTimeout(300);
  const trace = await page.evaluate(() => window.__trace);
  console.log('trace:\n  ' + trace.join('\n  '));
  const g2 = await page.evaluate(id => { const el = document.querySelector('[data-gizmo="' + id + '"]'); return { x: parseFloat(el.style.left), y: parseFloat(el.style.top), cls: el.className, live: !!el.querySelector('.gz-art > svg') }; }, tree);
  console.log('after drag:', JSON.stringify(g2), 'was', g.x, g.y);
  await page.keyboard.press('Control+z');
  await page.waitForTimeout(300);

  // ── 2 · what a live part costs
  const idle = async (label) => {
    const r = await page.evaluate(() => new Promise(res => {
      const d = []; let last = performance.now(); const t0 = last;
      const tick = t => { d.push(t - last); last = t; if (t - t0 < 1500) requestAnimationFrame(tick); else { d.sort((a, b) => a - b); res({ median: d[d.length >> 1].toFixed(1), p90: d[Math.floor(d.length * .9)].toFixed(1), n: d.length }); } };
      requestAnimationFrame(tick);
    }));
    const st = await page.evaluate(() => ({ live: Kits.stats().live, tiles: Kits.stats().tiles, zoom: Lab.zoom.toFixed(2) }));
    console.log(label.padEnd(44), JSON.stringify(r), JSON.stringify(st));
  };
  for (const [z, wx, wy, name] of [[4, 2300, -1200, 'z400 sign'], [4, 2872, -1900, 'z400 east grove'], [1.66, 2300, -1200, 'z166 lockup'], [1, 300, -1500, 'z100 west grove']]) {
    await look(z, wx, wy, 1500);
    await idle(name + ' · as is');
    await page.evaluate(() => Kits.freeze(true)); await page.waitForTimeout(200);
    await idle(name + ' · animations frozen');
    await page.evaluate(() => Kits.freeze(false));
    // shadows off on the live roots
    await page.evaluate(() => document.querySelectorAll('.gz[data-kit] .gz-art > svg').forEach(s => { s.dataset.f = s.style.filter; s.style.filter = 'none'; })); await page.waitForTimeout(200);
    await idle(name + ' · live shadows off');
    await page.evaluate(() => document.querySelectorAll('.gz[data-kit] .gz-art > svg').forEach(s => { s.style.filter = s.dataset.f || ''; }));
    // every live part emptied (no svg at all)
    await page.evaluate(() => { window.__kept = [...document.querySelectorAll('.gz[data-kit] .gz-art')].map(a => [a, a.innerHTML]); window.__kept.forEach(([a]) => a.textContent = ''); }); await page.waitForTimeout(200);
    await idle(name + ' · no live parts');
    await page.evaluate(() => { window.__kept.forEach(([a, h]) => a.innerHTML = h); });
    // and the whole kit layer hidden too
    await page.evaluate(() => { document.getElementById('kit-layer').style.display = 'none'; window.__kept.forEach(([a]) => a.textContent = ''); }); await page.waitForTimeout(200);
    await idle(name + ' · no kits at all');
    await page.evaluate(() => { document.getElementById('kit-layer').style.display = ''; window.__kept.forEach(([a, h]) => a.innerHTML = h); });
    // all iframes hidden as well (the bench page alone)
    await page.evaluate(() => { document.querySelectorAll('iframe').forEach(f => f.style.visibility = 'hidden'); window.__kept.forEach(([a]) => a.textContent = ''); document.getElementById('kit-layer').style.display = 'none'; }); await page.waitForTimeout(200);
    await idle(name + ' · nothing (page alone)');
    await page.evaluate(() => { document.querySelectorAll('iframe').forEach(f => f.style.visibility = ''); window.__kept.forEach(([a, h]) => a.innerHTML = h); document.getElementById('kit-layer').style.display = ''; });
  }
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
