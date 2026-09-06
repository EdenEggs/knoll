/* lab2/perf/probe-live.js — what, exactly, a live kit part costs per frame.
   At 400% over the sign the live set is the 'must' parts (village pieces
   standing over machines), static and off screen, and they cost a frame
   slot. Variations, then a CDP trace of the main thread. */
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
    console.log(label.padEnd(52), JSON.stringify(r));
  };
  await look(4, 2300, -1200);
  const live = await page.evaluate(() => [...document.querySelectorAll('.gz[data-kit] .gz-art > svg')].map(s => s.closest('.gz').dataset.kit + ':' + s.closest('.gz').dataset.part));
  console.log('live at the sign @400%:', live.join(' '));
  await idle('as is');
  const vary = async (label, on, off) => {
    await page.evaluate(on); await page.waitForTimeout(250);
    await idle(label);
    await page.evaluate(off); await page.waitForTimeout(100);
  };
  await vary('village url(#ds) filters removed', () => { document.querySelectorAll('.gz[data-kit] .gz-art [filter]').forEach(g => { g.dataset.f = g.getAttribute('filter'); g.removeAttribute('filter'); }); },
                                                  () => { document.querySelectorAll('.gz[data-kit] .gz-art [data-f]').forEach(g => g.setAttribute('filter', g.dataset.f)); });
  await vary('all animations set to none (not paused)', () => { document.querySelectorAll('.gz[data-kit] .gz-art svg, .gz[data-kit] .gz-art svg *').forEach(n => { n.dataset.a = n.style.animation; n.style.animation = 'none'; }); },
                                                        () => { document.querySelectorAll('.gz[data-kit] .gz-art svg, .gz[data-kit] .gz-art svg *').forEach(n => { n.style.animation = n.dataset.a || ''; }); });
  await vary('both: no filters, no animations', () => { document.querySelectorAll('.gz[data-kit] .gz-art [filter]').forEach(g => { g.dataset.f = g.getAttribute('filter'); g.removeAttribute('filter'); }); document.querySelectorAll('.gz[data-kit] .gz-art svg, .gz[data-kit] .gz-art svg *').forEach(n => { n.dataset.a = n.style.animation; n.style.animation = 'none'; n.dataset.fl = n.style.filter; n.style.filter = 'none'; }); },
                                                () => { document.querySelectorAll('.gz[data-kit] .gz-art [data-f]').forEach(g => g.setAttribute('filter', g.dataset.f)); document.querySelectorAll('.gz[data-kit] .gz-art svg, .gz[data-kit] .gz-art svg *').forEach(n => { n.style.animation = n.dataset.a || ''; n.style.filter = n.dataset.fl || ''; }); });
  await vary('live sections display:none', () => { document.querySelectorAll('.gz[data-kit]').forEach(s => { if (s.querySelector('.gz-art > svg')) { s.dataset.d = '1'; s.style.display = 'none'; } }); },
                                            () => { document.querySelectorAll('.gz[data-kit][data-d]').forEach(s => { s.style.display = ''; delete s.dataset.d; }); });
  await vary('live svgs visibility:hidden', () => { document.querySelectorAll('.gz[data-kit] .gz-art > svg').forEach(s => s.style.visibility = 'hidden'); },
                                             () => { document.querySelectorAll('.gz[data-kit] .gz-art > svg').forEach(s => s.style.visibility = ''); });
  await vary('live svgs replaced by a plain <div> of the same size', () => { document.querySelectorAll('.gz[data-kit] .gz-art').forEach(a => { const s = a.querySelector('svg'); if (!s) return; a.dataset.h = a.innerHTML; a.innerHTML = '<div style="width:' + s.getAttribute('width') + 'px;height:' + s.getAttribute('height') + 'px;background:#7bc264"></div>'; }); },
                                                                       () => { document.querySelectorAll('.gz[data-kit] .gz-art[data-h]').forEach(a => { a.innerHTML = a.dataset.h; delete a.dataset.h; }); });
  await vary('live svgs replaced by an <img> of the raster', () => { document.querySelectorAll('.gz[data-kit] .gz-art').forEach(a => { const s = a.querySelector('svg'); if (!s) return; a.dataset.h = a.innerHTML; const P = Kits.sheets[a.closest('.gz').dataset.kit].parts[a.closest('.gz').dataset.part]; a.innerHTML = '<img src="data:image/svg+xml;charset=utf-8,' + encodeURIComponent(P.raster) + '" style="display:block">'; }); },
                                                              () => { document.querySelectorAll('.gz[data-kit] .gz-art[data-h]').forEach(a => { a.innerHTML = a.dataset.h; delete a.dataset.h; }); });
  await vary('root svg overflow:hidden', () => { document.querySelectorAll('.gz[data-kit] .gz-art > svg').forEach(s => s.style.overflow = 'hidden'); },
                                          () => { document.querySelectorAll('.gz[data-kit] .gz-art > svg').forEach(s => s.style.overflow = ''); });
  await vary('sections contain:strict', () => { document.querySelectorAll('.gz[data-kit]').forEach(s => s.style.contain = 'strict'); },
                                         () => { document.querySelectorAll('.gz[data-kit]').forEach(s => s.style.contain = ''); });

  // the trace: what the main thread does per frame, as is
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Tracing.start', { categories: 'devtools.timeline,disabled-by-default-devtools.timeline,blink,cc', options: 'sampling-frequency=0', transferMode: 'ReportEvents' });
  const events = [];
  cdp.on('Tracing.dataCollected', d => events.push(...d.value));
  await page.evaluate(() => new Promise(res => { let n = 0; const tick = () => { if (++n < 120) requestAnimationFrame(tick); else res(); }; requestAnimationFrame(tick); }));
  await cdp.send('Tracing.end');
  await new Promise(res => cdp.on('Tracing.tracingComplete', res));
  const agg = {};
  events.forEach(e => { if (e.ph === 'X' && e.dur) { agg[e.name] = agg[e.name] || { n: 0, ms: 0 }; agg[e.name].n++; agg[e.name].ms += e.dur / 1000; } });
  const top = Object.entries(agg).sort((a, b) => b[1].ms - a[1].ms).slice(0, 18);
  console.log('trace, 120 frames, top events by total ms:');
  top.forEach(([k, v]) => console.log('  ' + k.padEnd(36) + v.ms.toFixed(1).padStart(8) + ' ms  ×' + v.n));
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
