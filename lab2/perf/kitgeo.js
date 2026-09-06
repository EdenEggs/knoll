/* lab2/perf/kitgeo.js — where every kit part (forest / village / gnome) sits
   and how big its drawing is, as the bench stands right now.

   USAGE (from C:/Users/bobb9/Desktop/site):  node lab2/perf/kitgeo.js <tag>
   Writes lab2/perf/results/kitgeo-<tag>.json. Run with tag 'before' on the
   iframe bench and 'after' on the kits bench; diff.js compares the two.

   Records, per standing section whose data-src is one of the three kit
   sheets: the box (style left/top/width/height), the panel's measured
   natural size (natW/natH), and the DRAWN rect — the on-paper rectangle the
   ink occupies, in world units, read off the iframe's (or .gz-art's) fitted
   transform. That last one is the number that must not move. */
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');

const tag = process.argv[2] || 'now';
const OUT = path.join(__dirname, 'results', 'kitgeo-' + tag + '.json');

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: false, args: ['--window-size=1616,1110', '--window-position=0,0'] });
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.route('**/_lab2/default', r => r.fulfill({ status: 404, body: 'no door' }));
  await page.goto('http://localhost:4321/lab2/', { waitUntil: 'load' });
  await page.waitForFunction(() => window.Lab && window.Frames);

  // every kit section on the paper
  const ids = await page.evaluate(() => [...document.querySelectorAll('#bench .gz[data-gizmo]')]
    .filter(el => /features\/(forest|village|gnome)\.dc\.html/.test(el.dataset.src || '') || el.dataset.kit)
    .map(el => el.dataset.gizmo));

  // visit each one at 100% so frames.js loads + fits it (iframe bench) — the
  // kits bench needs no visit, but the same walk costs nothing there
  const b = await page.evaluate(() => { const r = Lab.bench.getBoundingClientRect(); return { w: r.width, h: r.height }; });
  for (const id of ids) {
    await page.evaluate(([id, b]) => {
      const el = document.querySelector('[data-gizmo="' + CSS.escape(id) + '"]');
      if (!el) return;
      const x = parseFloat(el.style.left) || 0, y = parseFloat(el.style.top) || 0;
      const w = parseFloat(el.style.width) || 0, h = parseFloat(el.style.height) || 0;
      Lab.camTo(1, b.w / 2 - (x + w / 2), b.h / 2 - (y + h / 2), 0);
    }, [id, b]);
    // wait for a booted document (iframe bench) or a beat (kits bench)
    await page.waitForFunction(id => {
      const el = document.querySelector('[data-gizmo="' + CSS.escape(id) + '"]');
      if (!el) return true;
      if (el.dataset.kit) return true;
      return el.classList.contains('booted') || el.classList.contains('stalled');
    }, id, { timeout: 30000 }).catch(() => {});
  }
  // let the last fits land
  await page.waitForTimeout(1500);

  const rows = await page.evaluate(ids => ids.map(id => {
    const el = document.querySelector('[data-gizmo="' + CSS.escape(id) + '"]');
    if (!el) return { id, missing: true };
    const p = Frames.panels.find(q => q.el === el);
    const box = { x: parseFloat(el.style.left) || 0, y: parseFloat(el.style.top) || 0,
                  w: parseFloat(el.style.width) || 0, h: parseFloat(el.style.height) || 0 };
    const src = el.dataset.src || '';
    const m = /features\/(\w+)\.dc\.html#(?:part|who)=([\w-]+)/.exec(src);
    const f = el.querySelector('iframe');
    const art = el.querySelector('.gz-art');
    const node = f || art;
    let drawn = null, transform = '';
    if (node) {
      transform = node.style.transform || '';
      const t = /translate\((-?[\d.]+)px,\s*(-?[\d.]+)px\)\s*scale\(([\d.]+)\)/.exec(transform);
      const tx = t ? +t[1] : 0, ty = t ? +t[2] : 0, s = t ? +t[3] : 1;
      if (p && p.natW) {
        // iframe: ink starts at inkX/inkY inside the viewport, which is
        // translated by (-inkX*s, -inkY*s) plus the centring
        drawn = { x: box.x + tx + (p.inkX || 0) * s, y: box.y + ty + (p.inkY || 0) * s, w: p.natW * s, h: p.natH * s, s };
      } else if (art) {
        const aw = parseFloat(art.style.width) || 0, ah = parseFloat(art.style.height) || 0;
        drawn = { x: box.x + tx, y: box.y + ty, w: aw * s, h: ah * s, s };
      }
    }
    return { id, kit: m ? m[1] : (el.dataset.kit || ''), part: m ? m[2] : (el.dataset.part || ''),
             box, cut: !!(p && p.sized), dataCut: el.dataset.cut || '', dataW: el.dataset.w, dataH: el.dataset.h,
             nat: p ? { w: p.natW || null, h: p.natH || null, inkX: p.inkX || 0, inkY: p.inkY || 0, viewW: p.viewW || null, viewH: p.viewH || null } : null,
             z: el.style.zIndex, booted: el.classList.contains('booted'), transform, drawn };
  }), ids);

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify({ tag, at: new Date().toISOString(), count: rows.length, rows }, null, 2));
  const byKit = {};
  rows.forEach(r => { byKit[r.kit] = (byKit[r.kit] || 0) + 1; });
  console.log('kitgeo', tag, rows.length, 'kit sections', byKit, '→', OUT);
  console.log('not booted / no drawn rect:', rows.filter(r => !r.drawn).map(r => r.id).join(', ') || 'none');
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
