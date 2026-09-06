/* lab2/perf/posters.js — THE POSTERS: a picture of every machine, taken from
   the bench itself, for frames.js to stand in the box until the document
   is worth booting (see THE POSTERS in frames.js and about.md).

   USAGE (from C:/Users/bobb9/Desktop/site, serve.js up on :4321):
       node lab2/perf/posters.js
   Writes lab2/posters/<name>.png (2× — the box's size doubled) and
   lab2/posters/index.json { "<data-src>": { file, w, h } }.

   HOW: open the bench with the autosave door blocked; for every standing
   section with a data-src that is not a kit part (kits.js draws those
   itself), centre it at 100%, wait for its document to boot and be fitted,
   then — with the paper, the grid and every animation held — screenshot
   exactly its box, transparent. The box at 100% and uncut IS the drawing
   (frames.js cuts a box to its ink), so the poster is the ink, 1:1, and
   frames.js can place it with the same sum it places the drawing. A re-cut
   panel is captured at its natural size all the same: its cut is a window
   on the drawing, and the poster is the drawing. */
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');
const OUT = path.join(__dirname, '..', 'posters');

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ channel: 'chrome', headless: false, args: ['--window-size=1616,1110', '--window-position=0,0'] });
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  await page.route('**/_lab2/default', r => r.fulfill({ status: 404, body: 'no door' }));
  await page.goto('http://localhost:4321/lab2/', { waitUntil: 'load' });
  await page.waitForFunction(() => window.Lab && window.Frames);
  await page.waitForTimeout(1500);

  // the paper comes off for the camera: no bench colour, no grid, and no
  // poster of an older run under the document
  // …and the document is always SHOWN for its picture: a machine cut under
  // the boot line is put away behind its poster (frames.js repost), which
  // is exactly what photographed three blank cards on 2026-09-04
  await page.addStyleTag({ content: 'html,body,#bench{background:transparent!important}#bench-grid{display:none!important}.gz-poster{display:none!important}.gz-shield::after{display:none!important}.tool-dock,.tool-opts,.zoom-dock,.keymap,.lab-band{display:none!important}.gz.gz-postered iframe{display:block!important}' });

  // …and not of a panel marked data-live: it is never a picture (THE
  // EXCEPTION in frames.js), so a poster of it would only be a file in the
  // deploy that nothing looks at
  const list = await page.evaluate(() => [...document.querySelectorAll('#bench .gz[data-gizmo][data-src]:not([data-kit]):not([data-live])')].map(el => ({
    id: el.dataset.gizmo, src: el.dataset.src, label: el.getAttribute('aria-label') || el.dataset.gizmo
  })));
  console.log(list.length, 'machines to picture');
  const index = {};
  const b = await page.evaluate(() => { const r = Lab.bench.getBoundingClientRect(); return { w: r.width, h: r.height, top: r.top, left: r.left }; });

  for (const it of list) {
    if (index[it.src]) continue;            // the cards share a file: one poster per src, first section wins
    // its natural size: forget any cut for the capture, refit after
    await page.evaluate(id => {
      const el = document.querySelector('[data-gizmo="' + CSS.escape(id) + '"]');
      const x = parseFloat(el.style.left) || 0, y = parseFloat(el.style.top) || 0;
      const w = parseFloat(el.style.width) || 0, h = parseFloat(el.style.height) || 0;
      const r = Lab.bench.getBoundingClientRect();
      Lab.camTo(1, r.width / 2 - (x + w / 2), r.height / 2 - (y + h / 2), 0);
      // a machine cut under the boot line would keep its poster: this is
      // the one time it must boot regardless (warm() loads whatever its size)
      if (Frames.warm) Frames.warm(el);
    }, it.id);
    const ok = await page.waitForFunction(id => {
      const el = document.querySelector('[data-gizmo="' + CSS.escape(id) + '"]');
      return el && el.classList.contains('booted');
    }, it.id, { timeout: 30000 }).then(() => true).catch(() => false);
    if (!ok) { console.log('  skip (never booted):', it.id); continue; }
    await page.waitForTimeout(1200);          // fonts, the fit's late pass
    // …and MEASURED, not just booted: a panel whose box is under the boot line
    // at 100% (the cards, cut small) is put away behind its poster, and a
    // put-away frame is measured only once it is shown — which the style
    // above does. Without a measurement place() has nothing to fit by and the
    // picture would be the drawing at whatever scale it was left at, cropped
    // to the box (the three cards, 2026-09-04). So wait for one, and say so
    // rather than keep a picture that is not the drawing.
    const measured = await page.waitForFunction(id => {
      const el = document.querySelector('[data-gizmo="' + CSS.escape(id) + '"]');
      const p = Frames.panelOf ? Frames.panelOf(el) : Frames.panels.find(q => q.el === el);
      return !!(p && p.viewW && p.viewH && p.natW && p.natH);
    }, it.id, { timeout: 8000 }).then(() => true).catch(() => false);
    if (!measured) { console.log('  skip (booted but never measured — its old poster stands):', it.id); continue; }
    // the box at its natural size, whatever it was cut to
    const nat = await page.evaluate(id => {
      const el = document.querySelector('[data-gizmo="' + CSS.escape(id) + '"]');
      const p = Frames.panelOf ? Frames.panelOf(el) : Frames.panels.find(q => q.el === el);
      if (!p) return null;
      const was = { w: parseFloat(el.style.width), h: parseFloat(el.style.height), sized: p.sized };
      const n = { w: p.natW || +el.dataset.w, h: p.natH || +el.dataset.h };
      Frames.cut(p, n.w, n.h, false);
      const r = Lab.bench.getBoundingClientRect();
      Lab.camTo(1, r.width / 2 - ((parseFloat(el.style.left) || 0) + n.w / 2), r.height / 2 - ((parseFloat(el.style.top) || 0) + n.h / 2), 0);
      return { was, n };
    }, it.id);
    if (!nat) { console.log('  skip (no panel):', it.id); continue; }
    await page.waitForTimeout(500);
    // hold every animation inside, then the box
    await page.evaluate(id => {
      const el = document.querySelector('[data-gizmo="' + CSS.escape(id) + '"]');
      const f = el.querySelector('iframe');
      try {
        const d = f.contentDocument;
        const st = d.createElement('style'); st.id = 'lab-poster-hold';
        st.textContent = '*,*::before,*::after{animation-play-state:paused!important;transition:none!important;caret-color:transparent!important}';
        d.head.appendChild(st);
      } catch (e) {}
    }, it.id);
    await page.waitForTimeout(200);
    // ALONE: everything else on the paper is hidden for the shot — a gnome
    // standing in front of a machine would otherwise be baked into the
    // machine's picture and stand twice, once faint, when the machine is a
    // poster and the gnome is drawn over it (seen 2026-09-04)
    await page.evaluate(id => {
      let st = document.getElementById('lab-poster-alone');
      if (!st) { st = document.createElement('style'); st.id = 'lab-poster-alone'; document.head.appendChild(st); }
      st.textContent = '#bench .gz:not([data-gizmo="' + id.replace(/"/g, '') + '"]),#kit-layer,.wall-ink,.tape-layer,.wall-note,.tracer{visibility:hidden!important}';
    }, it.id);
    await page.waitForTimeout(150);
    const rect = await page.evaluate(id => { const r = document.querySelector('[data-gizmo="' + CSS.escape(id) + '"]').getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; }, it.id);
    if (rect.w < 2 || rect.h < 2 || rect.x < 0 || rect.y < b.top || rect.x + rect.w > b.left + b.w || rect.y + rect.h > b.top + b.h) {
      console.log('  skip (box off screen or larger than the screen):', it.id, JSON.stringify(rect));
      // a machine bigger than the viewport: capture in a taller viewport
      await page.setViewportSize({ width: Math.max(1600, Math.ceil(rect.w) + 100), height: Math.max(1000, Math.ceil(rect.h) + 300) });
      await page.waitForTimeout(600);
    }
    const rect2 = await page.evaluate(id => { const el = document.querySelector('[data-gizmo="' + CSS.escape(id) + '"]'); const r = Lab.bench.getBoundingClientRect(); Lab.camTo(1, r.width / 2 - ((parseFloat(el.style.left) || 0) + parseFloat(el.style.width) / 2), r.height / 2 - ((parseFloat(el.style.top) || 0) + parseFloat(el.style.height) / 2), 0); const q = el.getBoundingClientRect(); return { x: q.left, y: q.top, w: q.width, h: q.height }; }, it.id);
    await page.waitForTimeout(300);
    const name = it.src.replace(/^features\//, '').replace(/\.dc\.html|\.html/, '').replace(/#(?:card|part|who)=/, '-').replace(/[^\w-]+/g, '-');
    const file = name + '.png';
    const buf = await page.screenshot({ clip: { x: rect2.x, y: rect2.y, width: rect2.w, height: rect2.h }, omitBackground: true });
    // never a blank picture: count the painted pixels before keeping it
    const painted = await page.evaluate(async (b64) => {
      const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode();
      const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
      const x = c.getContext('2d'); x.drawImage(img, 0, 0);
      const d = x.getImageData(0, 0, c.width, c.height).data; let n = 0;
      for (let i = 3; i < d.length; i += 4) if (d[i] > 8) n++;
      return n / (c.width * c.height);
    }, buf.toString('base64'));
    if (painted < 0.02) { console.log('  ! blank picture, not kept:', it.id, (painted * 100).toFixed(1) + '% painted'); }
    else {
      fs.writeFileSync(path.join(OUT, file), buf);
      index[it.src] = { file, w: Math.round(rect2.w), h: Math.round(rect2.h), label: it.label };
      console.log('  ' + file.padEnd(34), Math.round(rect2.w) + 'x' + Math.round(rect2.h), (painted * 100).toFixed(0) + '% painted');
    }
    // the hold comes off, the others come back, and the cut goes back
    await page.evaluate(([id, was]) => {
      const st = document.getElementById('lab-poster-alone'); if (st) st.textContent = '';
      const el = document.querySelector('[data-gizmo="' + CSS.escape(id) + '"]');
      try { const s = el.querySelector('iframe').contentDocument.getElementById('lab-poster-hold'); if (s) s.remove(); } catch (e) {}
      const p = Frames.panelOf ? Frames.panelOf(el) : Frames.panels.find(q => q.el === el);
      if (p && was.sized) Frames.cut(p, was.w, was.h, false);
    }, [it.id, nat.was]);
    if ((await page.viewportSize()).width !== 1600) { await page.setViewportSize({ width: 1600, height: 1000 }); await page.waitForTimeout(300); }
  }
  fs.writeFileSync(path.join(OUT, 'index.json'), JSON.stringify({ at: new Date().toISOString(), scale: 2, posters: index }, null, 2));
  console.log('wrote', Object.keys(index).length, 'posters →', OUT);
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
