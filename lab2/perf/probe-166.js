const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: false, args: ['--window-size=1616,1110', '--window-position=0,0'] });
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.route('**/_lab2/default', r => r.fulfill({ status: 404, body: 'no door' }));
  await page.goto('http://localhost:4321/lab2/', { waitUntil: 'load' });
  await page.waitForFunction(() => window.Lab && window.Frames && window.Kits && Kits.stats().sheets.length === 3);
  await page.waitForTimeout(1500);
  await page.evaluate(() => { const b = Lab.bench.getBoundingClientRect(); Lab.camTo(1.66, b.width / 2 - 2300 * 1.66, b.height / 2 - (-1200) * 1.66, 0); });
  await page.waitForTimeout(4000);
  const idle = async (label) => {
    const r = await page.evaluate(() => new Promise(res => {
      const d = []; let last = performance.now(); const t0 = last;
      const tick = t => { d.push(t - last); last = t; if (t - t0 < 1500) requestAnimationFrame(tick); else { d.sort((a, b) => a - b); res({ median: d[d.length >> 1].toFixed(1), p90: d[Math.floor(d.length * .9)].toFixed(1) }); } };
      requestAnimationFrame(tick);
    }));
    const st = await page.evaluate(() => ({ k: Kits.stats(), docs: Frames.panels.filter(p => p.loading).length, live: Frames.live }));
    console.log(label.padEnd(44), JSON.stringify(r), 'live', st.k.live, 'sway', st.k.sway, 'full', st.k.full, 'docs', st.docs);
  };
  const vary = async (label, on, off) => { await page.evaluate(on); await page.waitForTimeout(300); await idle(label); await page.evaluate(off); await page.waitForTimeout(150); };
  await idle('lockup166 as is');
  await vary('kit live parts emptied', () => { window.__k = [...document.querySelectorAll('.gz[data-kit] .gz-art')].map(a => [a, a.innerHTML]); window.__k.forEach(([a]) => a.textContent = ''); }, () => window.__k.forEach(([a, h]) => a.innerHTML = h));
  await vary('kit full parts → sway only', () => { window.__k = [...document.querySelectorAll('.gz[data-kit] .gz-art svg *')].map(n => [n, n.style.animation]); window.__k.forEach(([n]) => n.style.animation = 'none'); }, () => window.__k.forEach(([n, a]) => n.style.animation = a));
  await vary('kit roots animation none', () => { window.__k = [...document.querySelectorAll('.gz[data-kit] .gz-art > svg')].map(n => [n, n.style.animation]); window.__k.forEach(([n]) => n.style.animation = 'none'); }, () => window.__k.forEach(([n, a]) => n.style.animation = a));
  await vary('all iframes hidden', () => document.querySelectorAll('iframe').forEach(f => f.style.visibility = 'hidden'), () => document.querySelectorAll('iframe').forEach(f => f.style.visibility = ''));
  await vary('bubbles iframe hidden', () => document.querySelectorAll('#gz-bubbles iframe').forEach(f => f.style.visibility = 'hidden'), () => document.querySelectorAll('#gz-bubbles iframe').forEach(f => f.style.visibility = ''));
  await vary('every doc animation paused (data-lab-paused)', () => document.querySelectorAll('iframe').forEach(f => { try { f.contentDocument.documentElement.setAttribute('data-lab-paused', ''); } catch (e) {} }), () => document.querySelectorAll('iframe').forEach(f => { try { f.contentDocument.documentElement.removeAttribute('data-lab-paused'); } catch (e) {} }));
  await vary('poster imgs removed', () => { window.__p = [...document.querySelectorAll('.gz-poster img')].map(i => [i, i.parentNode]); window.__p.forEach(([i]) => i.remove()); }, () => window.__p.forEach(([i, p]) => p.appendChild(i)));
  await vary('kit layer hidden + live emptied + iframes hidden', () => { document.getElementById('kit-layer').style.display = 'none'; window.__k = [...document.querySelectorAll('.gz[data-kit] .gz-art')].map(a => [a, a.innerHTML]); window.__k.forEach(([a]) => a.textContent = ''); document.querySelectorAll('iframe').forEach(f => f.style.visibility = 'hidden'); }, () => { document.getElementById('kit-layer').style.display = ''; window.__k.forEach(([a, h]) => a.innerHTML = h); document.querySelectorAll('iframe').forEach(f => f.style.visibility = ''); });
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
