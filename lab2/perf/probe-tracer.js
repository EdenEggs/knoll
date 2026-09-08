/* lab2/perf/probe-tracer.js — why the tracing table goes soft when you zoom
   in. Opens the table, zooms to 200% on it, crops the plate lettering at
   several settings and measures edge sharpness (mean gradient magnitude
   across the crop: crisp text scores high, a blown-up raster scores low).
   Variations: as is; the world's pose as a plain style transform instead of
   a running Web Animation; the tracer with will-change; the tracer's lamp
   animation off; the tracer's zoom:.72 swapped for a transform. */
const path = require('path');
const { chromium } = require('playwright');
const OUT = path.join(__dirname, 'results');
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: false, args: ['--window-size=1616,1110', '--window-position=0,0'] });
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.route('**/_lab2/default', r => r.fulfill({ status: 404, body: 'no door' }));
  await page.goto('http://localhost:4321/lab2/', { waitUntil: 'load' });
  await page.waitForFunction(() => window.Lab && window.Frames && window.Wall && window.Tracer);
  await page.waitForTimeout(1500);
  // open the table via the dock's image tool
  await page.evaluate(() => Wall.setTool('upload'));
  await page.waitForTimeout(600);
  const plate = async () => page.evaluate(() => { const el = document.querySelector('#tracer .tr-plate'); const r = el.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; });
  const sharp = async (label) => {
    const r = await plate();
    const clip = { x: Math.max(0, r.x - 4), y: Math.max(0, r.y - 4), width: Math.min(700, r.w + 8), height: r.h + 8 };
    const buf = await page.screenshot({ clip });
    // measure in-page: decode the png on a canvas and take the mean |gradient|
    const score = await page.evaluate(async (b64) => {
      const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode();
      const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
      const x = c.getContext('2d'); x.drawImage(img, 0, 0);
      const d = x.getImageData(0, 0, c.width, c.height).data;
      let g = 0, n = 0;
      for (let y = 1; y < c.height - 1; y++) for (let i = 0; i < c.width - 1; i++) {
        const p = (y * c.width + i) * 4, q = p + 4, s = p + c.width * 4;
        const l = d[p] * .3 + d[p + 1] * .59 + d[p + 2] * .11, lr = d[q] * .3 + d[q + 1] * .59 + d[q + 2] * .11, ld = d[s] * .3 + d[s + 1] * .59 + d[s + 2] * .11;
        g += Math.abs(l - lr) + Math.abs(l - ld); n++;
      }
      // edges: how much of the contrast is in near-binary steps (crisp) vs spread (blurry)
      let big = 0, mid = 0;
      for (let y = 1; y < c.height - 1; y++) for (let i = 0; i < c.width - 1; i++) {
        const p = (y * c.width + i) * 4, q = p + 4;
        const l = d[p] * .3 + d[p + 1] * .59 + d[p + 2] * .11, lr = d[q] * .3 + d[q + 1] * .59 + d[q + 2] * .11;
        const a = Math.abs(l - lr); if (a > 120) big++; else if (a > 25) mid++;
      }
      return { meanGrad: (g / n).toFixed(2), crispRatio: (big / Math.max(1, big + mid)).toFixed(3), w: c.width, h: c.height };
    }, buf.toString('base64'));
    console.log(label.padEnd(46), JSON.stringify(score));
    await page.screenshot({ path: path.join(OUT, 'tracer-' + label.replace(/[^\w]+/g, '-') + '.png'), clip });
  };
  const zoomOn = async (z) => {
    const r = await plate();
    await page.evaluate(([z, x, y]) => Lab.setZoom(z, x, y), [z, r.x + r.w / 2, r.y + r.h / 2]);
    await page.waitForTimeout(900);
  };
  await zoomOn(1); await sharp('z100 as is');
  await zoomOn(2); await sharp('z200 as is');
  // variation A: the world's pose as a static transform (animation cancelled)
  await page.evaluate(() => { const w = document.getElementById('bench-world'); const a = w.getAnimations()[0]; if (a) { const t = a.effect.getKeyframes()[0].transform; window.__poseAnim = a; a.cancel(); w.style.transform = t; } });
  await page.waitForTimeout(700); await sharp('z200 pose as static transform');
  await page.evaluate(() => { const w = document.getElementById('bench-world'); const t = w.style.transform; w.style.transform = ''; w.animate([{ transform: t }, { transform: t }], { duration: 1e9, iterations: Infinity, fill: 'both' }); });
  await page.waitForTimeout(700);
  // variation B: the tracer's lamp animation off
  await page.evaluate(() => document.querySelectorAll('#tracer .tr-lamp, #tracer .tr-empty i').forEach(n => n.style.animation = 'none'));
  await page.waitForTimeout(700); await sharp('z200 lamp animation off');
  await page.evaluate(() => document.querySelectorAll('#tracer .tr-lamp, #tracer .tr-empty i').forEach(n => n.style.animation = ''));
  // variation C: zoom:.72 → transform scale(.72)
  await page.evaluate(() => { const z = document.querySelector('#tracer .tr-zoom'); z.style.zoom = '1'; z.style.transform = 'scale(.72)'; z.style.transformOrigin = '0 0'; });
  await page.waitForTimeout(700); await sharp('z200 zoom→transform');
  await page.evaluate(() => { const z = document.querySelector('#tracer .tr-zoom'); z.style.zoom = ''; z.style.transform = ''; z.style.transformOrigin = ''; });
  // variation D: tracer will-change:transform
  await page.evaluate(() => { document.getElementById('tracer').style.willChange = 'transform'; });
  await page.waitForTimeout(700); await sharp('z200 tracer will-change');
  await page.evaluate(() => { document.getElementById('tracer').style.willChange = ''; });
  // variation E: contain:paint off on the tracer? it is not a .gz; try the sign for comparison
  const signRect = await page.evaluate(() => { const el = document.querySelector('#gz-logo .sign-caption, #gz-logo .sign-word'); if (!el) return null; const r = el.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; });
  console.log('sign lettering rect for comparison:', JSON.stringify(signRect));
  // what layers does the tracer get? (compositing reasons via CDP)
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('DOM.enable'); await cdp.send('LayerTree.enable');
  const layers = await new Promise(res => cdp.once('LayerTree.layerTreeDidChange', e => res(e.layers || [])));
  const doc = await cdp.send('DOM.getDocument', { depth: -1 });
  const ids = await cdp.send('DOM.querySelectorAll', { nodeId: doc.root.nodeId, selector: '#tracer, #tracer *' });
  const backend = new Set();
  for (const id of ids.nodeIds.slice(0, 400)) { try { const d = await cdp.send('DOM.describeNode', { nodeId: id }); backend.add(d.node.backendNodeId); } catch (e) {} }
  const tracerLayers = layers.filter(l => backend.has(l.backendNodeId));
  console.log('layers total', layers.length, '· layers owned by tracer nodes', tracerLayers.length);
  for (const l of tracerLayers.slice(0, 12)) {
    let reasons = [];
    try { reasons = (await cdp.send('LayerTree.compositingReasons', { layerId: l.layerId })).compositingReasons; } catch (e) {}
    console.log('  layer', l.width + 'x' + l.height, 'paintCount', l.paintCount, reasons.join(','));
  }
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
