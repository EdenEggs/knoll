/* lab2/perf/probe-anim.js — which animations cost a frame: the root sway/bob
   (a transform on the <svg>, composited) or the inner <g> ones (main thread),
   and whether pausing is any different from removing. */
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: false, args: ['--window-size=1616,1110', '--window-position=0,0'] });
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.route('**/_lab2/default', r => r.fulfill({ status: 404, body: 'no door' }));
  await page.goto('http://localhost:4321/lab2/', { waitUntil: 'load' });
  await page.waitForFunction(() => window.Lab && window.Frames && window.Kits && Kits.stats().sheets.length === 3);
  await page.waitForTimeout(1500);
  const look = async (z, wx, wy, ms = 1500) => {
    await page.evaluate(([z, wx, wy]) => { const b = Lab.bench.getBoundingClientRect(); Lab.camTo(z, b.width / 2 - wx * z, b.height / 2 - wy * z, 0); }, [z, wx, wy]);
    await page.waitForTimeout(ms);
  };
  const idle = async (label) => {
    const r = await page.evaluate(() => new Promise(res => {
      const d = []; let last = performance.now(); const t0 = last;
      const tick = t => { d.push(t - last); last = t; if (t - t0 < 1200) requestAnimationFrame(tick); else { d.sort((a, b) => a - b); res({ median: d[d.length >> 1].toFixed(1), p90: d[Math.floor(d.length * .9)].toFixed(1) }); } };
      requestAnimationFrame(tick);
    }));
    const n = await page.evaluate(() => ({ live: Kits.stats().live, inner: document.querySelectorAll('.gz[data-kit] .gz-art svg *[style*="animation"]').length, roots: [...document.querySelectorAll('.gz[data-kit] .gz-art > svg')].filter(s => /animation/.test(s.getAttribute('style') || '')).length }));
    console.log(label.padEnd(50), JSON.stringify(r), JSON.stringify(n));
  };
  const vary = async (label, on, off) => { await page.evaluate(on); await page.waitForTimeout(250); await idle(label); await page.evaluate(off); await page.waitForTimeout(100); };
  const INNER = '.gz[data-kit] .gz-art svg *';
  const ROOT = '.gz[data-kit] .gz-art > svg';
  for (const [z, wx, wy, name] of [[4, 2300, -1200, 'z400 sign (must set)'], [4, 2872, -1900, 'z400 east grove'], [1, 300, -1500, 'z100 west grove'], [0.35, 2300, -1200, 'z35 opening']]) {
    await look(z, wx, wy);
    await idle(name + ' · as is');
    await vary(name + ' · inner NONE, root kept', () => document.querySelectorAll('.gz[data-kit] .gz-art svg *').forEach(n => { n.dataset.a = n.style.animation; n.style.animation = 'none'; }),
                                                 () => document.querySelectorAll('.gz[data-kit] .gz-art svg *').forEach(n => { n.style.animation = n.dataset.a || ''; }));
    await vary(name + ' · inner PAUSED, root kept', () => document.querySelectorAll('.gz[data-kit] .gz-art svg *').forEach(n => { n.style.animationPlayState = 'paused'; }),
                                                   () => document.querySelectorAll('.gz[data-kit] .gz-art svg *').forEach(n => { n.style.animationPlayState = ''; }));
    await vary(name + ' · root NONE, inner kept', () => document.querySelectorAll('.gz[data-kit] .gz-art > svg').forEach(n => { n.dataset.a = n.style.animation; n.style.animation = 'none'; }),
                                                 () => document.querySelectorAll('.gz[data-kit] .gz-art > svg').forEach(n => { n.style.animation = n.dataset.a || ''; }));
    await vary(name + ' · root PAUSED, inner none', () => { document.querySelectorAll('.gz[data-kit] .gz-art > svg').forEach(n => { n.style.animationPlayState = 'paused'; }); document.querySelectorAll('.gz[data-kit] .gz-art svg *').forEach(n => { n.dataset.a = n.style.animation; n.style.animation = 'none'; }); },
                                                   () => { document.querySelectorAll('.gz[data-kit] .gz-art > svg').forEach(n => { n.style.animationPlayState = ''; }); document.querySelectorAll('.gz[data-kit] .gz-art svg *').forEach(n => { n.style.animation = n.dataset.a || ''; }); });
    await vary(name + ' · both NONE', () => document.querySelectorAll('.gz[data-kit] .gz-art svg, .gz[data-kit] .gz-art svg *').forEach(n => { n.dataset.a = n.style.animation; n.style.animation = 'none'; }),
                                      () => document.querySelectorAll('.gz[data-kit] .gz-art svg, .gz[data-kit] .gz-art svg *').forEach(n => { n.style.animation = n.dataset.a || ''; }));
    // and the off-screen live parts only (the must set) with everything none
    await vary(name + ' · off-screen live parts: both NONE', () => { const b = Lab.bench.getBoundingClientRect(); document.querySelectorAll('.gz[data-kit]').forEach(s => { const r = s.getBoundingClientRect(); const off = r.right < b.left - 200 || r.left > b.right + 200 || r.bottom < b.top - 200 || r.top > b.bottom + 200; if (off) s.querySelectorAll('.gz-art svg, .gz-art svg *').forEach(n => { n.dataset.a = n.style.animation; n.style.animation = 'none'; }); }); },
                                                              () => document.querySelectorAll('.gz[data-kit] .gz-art svg, .gz[data-kit] .gz-art svg *').forEach(n => { if (n.dataset.a !== undefined) { n.style.animation = n.dataset.a || ''; delete n.dataset.a; } }));
  }
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
