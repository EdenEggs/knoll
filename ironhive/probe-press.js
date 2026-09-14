/* ironhive/probe-press.js — the bulletin press on the iron hive (2026-09-13).

   The fourth section and the second MACHINE: the Design Canvas export
   "Ironhive Bulletin Press" (recut.js press), a web press that runs on its
   own beside a stand of five bulletins that open over it. Lab 2's machine
   furniture again (data-lab-sheet, data-lab-nozoom), its two steam puffs
   marked data-lab-drift, and nothing dragged. The feature paths it shares
   with the gallery (drag, pick, corner, menu, copy and paste, the pinch) are
   probe-gallery.js's. Real Chrome, real presses, values read back out of the
   press's own document.

     1   the section and its document: on the paper once, boots; the drawing
         measured (REPORTED) and no wider than its title row makes it at
         data-w — that row is a block as wide as the sheet, which is why
         data-w is 1160; its box the drawing at data-scale, inside frames.js's
         3200 ceiling; the machine marks do their work; the backdrop off; the
         sheet has nothing to scroll (its overflow-x:auto would draw a bar);
         the faces; nothing third-party; the press runs (the cylinder turns)
         and SHEETS PRESSED reads 146; and the steam, seen rising, never
         reaches past the top of the box
     2   the bulletins, with a mouse: a click wakes it; the fresh sheet opens
         NO. 005 of SEPTEMBER 9, 2026 and its lower half unfolds; the opened
         paper lies inside the box; the ✕ puts it away; a back issue opens
         NO. 004 of AUGUST 26, 2026; a click on the dark round the paper puts
         it away; Escape puts an open one away. REPORTED: what the export's
         copy says (it ships every headline, kicker and paragraph empty), and
         whether the press is still awake after that Escape
     3   THE BENCH'S ZOOM KEYS: with the focus in the live press, ctrl+= zooms
         the bench, and the export's own zoom (ironhive.press.zoom.v1) is
         never written; ctrl+− takes the bench back out
     4   the keys: ← → ↓ and page down in the live press move nothing outside
         it
     5   the published opening view (?seed=on, the deployed dress): where it
         lands and what it covers, REPORTED; asserted is that it boots there
     6   this probe wrote nothing, and no page errors

   A CHECK THAT CANNOT FAIL IS NOT A CHECK: CONTROL_FRAMES=<frames.js from
   before AND THE KEYS IT ZOOMS WITH> serves that in place of the bench's own,
   and 3 must then fail. 3 asserts the focus is in the press first, or a key
   landing on the bench would pass it either way.

   USAGE (from site/): node ironhive/probe-press.js — with serve.js up. Every
   context is a fresh profile. */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { chromium } = require('playwright');

const URL = 'http://localhost:4321/ironhive/';
const ID = 'ironhive-press';
let fails = 0, doorWrites = 0;
const errors = [];
const say = (ok, what, extra) => { if (!ok) fails++; console.log((ok ? 'PASS ' : 'FAIL ') + what + (extra == null ? '' : ' — ' + extra)); };
const info = (what, extra) => console.log('INFO ' + what + (extra == null ? '' : ' — ' + extra));
const near = (a, b, slop) => Math.abs(a - b) <= slop;
const hash = f => crypto.createHash('sha256').update(fs.readFileSync(path.join(__dirname, f))).digest('hex');

async function open(browser, opts) {
  const ctx = await browser.newContext(Object.assign({ viewport: { width: 1600, height: 900 } }, opts.ctx || {}));
  await ctx.route('**/_ironhive/**', r => {
    if (r.request().method() !== 'GET') doorWrites++;
    return r.fulfill({ status: 404, body: 'no door' });
  });
  if (process.env.CONTROL_FRAMES) await ctx.route('**/ironhive/frames.js*', r => r.fulfill({ path: process.env.CONTROL_FRAMES, contentType: 'application/javascript' }));
  if (opts.deployed) {
    // the landing dress; contains() is load-bearing — see probe-gallery.js
    await ctx.addInitScript(() => {
      new MutationObserver(() => {
        const h = document.documentElement;
        if (h && h.classList.contains('lab-local')) h.classList.remove('lab-local');
      }).observe(document, { subtree: true, childList: true, attributes: true, attributeFilter: ['class'] });
    });
  }
  const page = await ctx.newPage();
  page.on('pageerror', e => { errors.push(String(e)); console.log('PAGEERROR', String(e)); });
  page.frameRequests = [];
  page.on('request', r => { if (r.frame() !== page.mainFrame()) page.frameRequests.push(r.url()); });
  await page.goto(URL + (opts.query || ''), { waitUntil: 'load' });
  await page.waitForFunction(() => window.Lab && window.Frames && window.Wall && document.getElementById('gz-press'), null, { timeout: 30000 });
  return { ctx, page };
}

const booted = page => page.waitForFunction(() => {
  const el = document.getElementById('gz-press');
  return !!el && el.classList.contains('booted');
}, null, { timeout: 30000 }).then(() => true, () => false);

const frameOn = (page, frac, z) => page.evaluate(([frac, z]) => {
  const el = document.getElementById('gz-press'), b = Lab.bench.getBoundingClientRect();
  const x = parseFloat(el.style.left), y = parseFloat(el.style.top), w = el.offsetWidth, h = el.offsetHeight;
  const zz = z || Math.min(b.width * frac / w, b.height * frac / h);
  Lab.camTo(zz, b.width / 2 - (x + w / 2) * zz, b.height / 2 - (y + h / 2) * zz, 0);
}, [frac, z || 0]).then(() => page.waitForTimeout(450));

// what the press's document is showing, found by what things say
const press = page => page.evaluate(() => {
  const el = document.getElementById('gz-press'), p = Frames.panels.find(q => q.el === el) || {};
  const f = el.querySelector('iframe'), d = f.contentDocument, w = d.defaultView;
  const divs = [...d.querySelectorAll('div')];
  const txt = n => (n ? n.textContent.replace(/\s+/g, ' ').trim() : null);
  const sheet = d.querySelector('[data-lab-sheet]'), widget = d.querySelector('[data-lab-nozoom]');
  const x = [...d.querySelectorAll('button')].find(b => b.textContent.trim() === '✕');
  const paper = x ? x.parentElement : null;
  const flap = paper ? [...paper.children].find(c => /top/.test(c.style.transformOrigin || '')) : null;
  const pressed = divs.find(n => n.textContent.trim() === 'SHEETS PRESSED');
  const s = el.getBoundingClientRect(), r = f.getBoundingClientRect(), k = r.width / f.offsetWidth, z = Lab.zoom;
  let clip = null;
  if (paper) {
    const P = paper.getBoundingClientRect(), X = x.getBoundingClientRect();
    const u = { l: r.left + Math.min(P.left, X.left) * k, t: r.top + Math.min(P.top, X.top) * k, r: r.left + Math.max(P.right, X.right) * k, b: r.top + Math.max(P.bottom, X.bottom) * k };
    clip = Math.max(0, s.left - u.l, s.top - u.t, u.r - s.right, u.b - s.bottom) / z;
  }
  const inPaper = sel => (paper ? [...paper.querySelectorAll('div')].filter(sel) : []);
  return {
    natW: p.natW, natH: p.natH, w: el.offsetWidth, h: el.offsetHeight, cut: el.dataset.cut || null,
    scale: parseFloat(el.dataset.scale) || 1, dataW: +el.dataset.w, drawnAt: r.width / f.offsetWidth / z,
    live: el.classList.contains('live'), cls: el.className,
    focused: document.activeElement === f,
    sheetZoom: sheet ? w.getComputedStyle(sheet).zoom : null,
    sheetOver: sheet ? Math.max(sheet.scrollWidth - sheet.clientWidth, sheet.scrollHeight - sheet.clientHeight) : null,
    widget: widget ? w.getComputedStyle(widget).display : 'not in the document',
    root: (() => { const q = d.querySelector('[data-screen-label]'); return q ? q.dataset.screenLabel + ' / ' + w.getComputedStyle(q).backgroundImage : null; })(),
    sheetsPressed: pressed && pressed.previousElementSibling ? pressed.previousElementSibling.textContent.trim() : null,
    open: !!paper,
    no: paper ? ((/NO\. (\d{3})/.exec(paper.textContent) || [])[1] || null) : null,
    date: paper ? txt([...paper.querySelectorAll('span')].find(n => /\d{4}$/.test(n.textContent.trim()))) : null,
    unfolded: flap && flap.offsetHeight ? +(flap.getBoundingClientRect().height / flap.offsetHeight).toFixed(3) : null,
    clip,
    copy: paper ? {
      headline: txt(inPaper(n => n.style.fontSize === '38px')[0]),
      kicker: txt(inPaper(n => n.style.fontSize === '12px' && n.style.textTransform === 'uppercase')[0]),
      lines: inPaper(n => n.style.fontSize === '17px' || n.style.fontSize === '15px').map(n => n.textContent.trim())
    } : null
  };
});

// a point on the page over something in the press's document
const at = (page, want) => page.evaluate(want => {
  const f = document.querySelector('#gz-press iframe'), d = f.contentDocument, r = f.getBoundingClientRect(), k = r.width / f.offsetWidth;
  const divs = [...d.querySelectorAll('div')];
  let node = null, pt = null;
  if (want === 'title') node = divs.find(n => n.textContent.trim() === 'Ironhive Bulletin Press');
  if (want === 'latest') { const t = divs.find(n => n.textContent.trim() === 'JUST PRESSED'); node = t && t.parentElement; }
  if (want === 'issue4') { const s = [...d.querySelectorAll('span')].find(n => n.textContent.trim() === 'NO. 004'); node = s && s.parentElement && s.parentElement.parentElement; }
  if (want === 'close') node = [...d.querySelectorAll('button')].find(b => b.textContent.trim() === '✕');
  if (want === 'dark') {
    // on the dark round the paper: left of it, halfway down it, and still inside the drawing
    const x = [...d.querySelectorAll('button')].find(b => b.textContent.trim() === '✕');
    if (!x) return null;
    const P = x.parentElement.getBoundingClientRect();
    pt = { x: Math.max(60, P.left / 2), y: P.top + P.height / 2 };
  }
  if (node) { const q = node.getBoundingClientRect(); pt = { x: q.left + q.width / 2, y: q.top + q.height / 2 }; }
  if (!pt) return null;
  return { x: r.left + pt.x * k, y: r.top + pt.y * k };
}, want);
const click = async (page, want, wait) => {
  const pt = await at(page, want);
  if (!pt) throw new Error('nothing in the press for ' + want);
  await page.mouse.click(pt.x, pt.y);
  await page.waitForTimeout(wait == null ? 350 : wait);
};
const pan = page => page.evaluate(() => [Lab.pan.x, Lab.pan.y, Lab.zoom].join());
const zoomOf = page => page.evaluate(() => Lab.zoom);
const storedZoom = page => page.evaluate(() => localStorage.getItem('ironhive.press.zoom.v1'));

// the cylinder's transform now and a little later
const turning = page => page.evaluate(async () => {
  const d = document.querySelector('#gz-press iframe').contentDocument, w = d.defaultView;
  const cyl = [...d.querySelectorAll('div')].find(x => { const s = x.getAttribute('style') || ''; return /spinGear/.test(s) && /(^|[^\d.])9s/.test(s); });
  if (!cyl) return null;
  const a = w.getComputedStyle(cyl).transform;
  await new Promise(res => setTimeout(res, 600));
  return { a, b: w.getComputedStyle(cyl).transform };
});

// how high the steam gets against the top of the box, in world px, over a cycle of it
const steamInside = page => page.evaluate(async () => {
  const el = document.getElementById('gz-press'), f = el.querySelector('iframe'), d = f.contentDocument, w = d.defaultView;
  const puffs = [...d.querySelectorAll('div')].filter(x => /puffC/.test(x.getAttribute('style') || ''));
  let worst = -Infinity, seen = 0;
  const t0 = performance.now();
  while (performance.now() - t0 < 3400) {
    const r = f.getBoundingClientRect(), k = r.width / f.offsetWidth, top = el.getBoundingClientRect().top;
    for (const p of puffs) {
      if (+w.getComputedStyle(p).opacity < 0.05) continue;
      seen++;
      worst = Math.max(worst, (top - (r.top + p.getBoundingClientRect().top * k)) / Lab.zoom);
    }
    await new Promise(res => setTimeout(res, 50));
  }
  return { puffs: puffs.length, drifting: puffs.filter(p => p.hasAttribute('data-lab-drift')).length, seen, worst };
});

(async () => {
  const h0 = hash('index.html');
  if (process.env.CONTROL_FRAMES) console.log('CONTROL RUN — serving ' + process.env.CONTROL_FRAMES);
  const browser = await chromium.launch({ channel: 'chrome' });

  // ── 1 · the section and its document ────────────────────────────────────
  console.log('\n1 · the section and its document');
  let { ctx, page } = await open(browser, {});
  const secs = await page.evaluate(() => [...document.querySelectorAll('#bench-world > section.gz')].map(s => ({ gizmo: s.dataset.gizmo, src: s.dataset.src, w: s.dataset.w, scale: s.dataset.scale, home: s.dataset.homeX + ',' + s.dataset.homeY, cut: s.dataset.cut || null })));
  const mine = secs.filter(x => x.gizmo === ID);
  say(mine.length === 1 && mine[0].src === 'features/press.dc.html', 'the bulletin press is on the paper, once', secs.length + ' section(s): ' + JSON.stringify(secs));
  await frameOn(page, 0.8);
  say(await booted(page), 'its document boots');
  await page.waitForTimeout(1500);
  let p = await press(page);
  info('the drawing measures ' + p.natW + '×' + p.natH + ' at data-w ' + p.dataW);
  say(p.natW > 1000 && p.natW <= p.dataW - 80 + 24, 'no wider than its title row makes it: the viewport less the sheet\'s 80px of padding, and a shadow', p.natW + ' ≤ ' + (p.dataW - 80 + 24));
  if (!p.cut) say(near(p.w, Math.round(p.natW * p.scale), 2) && near(p.h, Math.round(p.natH * p.scale), 2) && near(p.drawnAt, p.scale, 0.01) && p.w <= 3200 && p.h <= 3200,
    'nobody has cut it, so the box is the drawing at data-scale ' + p.scale + ', inside frames.js\'s 3200 ceiling', p.w + '×' + p.h + ', drawn at ×' + p.drawnAt.toFixed(3));
  else { const [cw, ch] = p.cut.split('x').map(Number), k = Math.min(cw / p.natW, ch / p.natH); say(near(p.w, cw, 1) && near(p.h, ch, 1) && near(p.drawnAt, k, 0.02), 'cut on the bench to ' + p.cut + ': the box is the cut, the drawing fitted into it', 'drawn at ×' + p.drawnAt.toFixed(3) + ', fit ×' + k.toFixed(3)); }
  say(p.widget === 'none' && p.sheetZoom === '1', 'the machine marks do their work: the zoom widget is not drawn, the sheet inside the sheet stands at zoom 1', 'widget ' + p.widget + ' · sheet zoom ' + p.sheetZoom);
  say(/^Bulletin Press \/ none$/.test(p.root || ''), 'the screen root came marked, and its backdrop is off', p.root);
  say(p.sheetOver === 0, 'the sheet has nothing to scroll, so its overflow-x:auto draws no bar', 'overflow ' + p.sheetOver + 'px');
  const fonts = await page.evaluate(() => [...document.querySelector('#gz-press iframe').contentDocument.fonts].filter(ff => ff.status === 'loaded').map(ff => ff.family.replace(/"/g, '') + ' ' + ff.weight));
  say(['Oswald 600', 'Oswald 700', 'JetBrains Mono 400', 'JetBrains Mono 700'].every(f => fonts.includes(f)), 'its faces are loaded, off the bench\'s own fonts/', fonts.join(', '));
  const foreign = page.frameRequests.filter(u => !u.startsWith('http://localhost:4321/') && !/^(data|blob|about):/.test(u));
  say(foreign.length === 0, 'nothing inside the press asks a third party for anything', foreign.slice(0, 4).join(', ') || 'none');
  const t = await turning(page);
  say(!!t && t.a !== t.b && p.sheetsPressed === '146', 'the press is running — the cylinder turns — and SHEETS PRESSED reads 146', (t ? t.a + ' → ' + t.b : 'no cylinder found') + ' · ' + p.sheetsPressed);
  const steam = await steamInside(page);
  say(steam.puffs === 2 && steam.drifting === 2 && steam.seen > 0 && steam.worst < 0, 'its two puffs, marked drift, rise and fade inside the box and never past its top',
      'seen ' + steam.seen + ' times · at their highest ' + (steam.worst > -Infinity ? Math.round(-steam.worst) : '—') + ' world px below the top');

  // ── 2 · the bulletins ────────────────────────────────────────────────────
  console.log('\n2 · the bulletins');
  await click(page, 'title', 450);
  p = await press(page);
  say(p.live && !p.open, 'a click wakes it, nothing opened', p.cls);
  await click(page, 'latest', 1600);
  p = await press(page);
  say(p.open && p.no === '005' && p.date === 'SEPTEMBER 9, 2026' && near(p.unfolded || 0, 1, 0.02), 'the fresh sheet opens NO. 005 of SEPTEMBER 9, 2026, and its lower half unfolds', 'no ' + p.no + ' · ' + p.date + ' · unfolded ×' + p.unfolded);
  say(p.clip != null && p.clip <= 2, 'the opened paper lies inside the box', 'past its edge by ' + (p.clip == null ? '—' : p.clip.toFixed(1)) + ' world px at most');
  if (p.copy) info('the copy, as the export ships it', 'headline ' + JSON.stringify(p.copy.headline) + ' · kicker ' + JSON.stringify(p.copy.kicker) + ' · ' + p.copy.lines.filter(Boolean).length + ' of ' + p.copy.lines.length + ' lines with words in them');
  await page.screenshot({ path: path.join(__dirname, 'press-open.png') });
  await click(page, 'close', 500);
  p = await press(page);
  say(!p.open && p.live, 'its ✕ puts it away', 'open ' + p.open + ' · ' + p.cls);
  await click(page, 'issue4', 1600);
  p = await press(page);
  say(p.open && p.no === '004' && p.date === 'AUGUST 26, 2026', 'a back issue opens: NO. 004 of AUGUST 26, 2026', 'no ' + p.no + ' · ' + p.date);
  await click(page, 'dark', 500);
  p = await press(page);
  say(!p.open, 'a click on the dark round the paper puts it away', 'open ' + p.open);
  await click(page, 'latest', 1200);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(600);
  p = await press(page);
  say(!p.open, 'Escape puts an open one away', 'open ' + p.open);
  info('after that Escape the press is ' + (p.live ? 'still awake' : 'asleep: Escape is also the bench\'s let-go key (frames.js), so the next click only wakes it'));

  // ── 3 · the bench's zoom keys ────────────────────────────────────────────
  console.log('\n3 · the bench\'s zoom keys');
  await frameOn(page, 0.8);
  await click(page, 'title', 450);                          // wakes it if Escape put it to sleep…
  await click(page, 'title', 300);                          // …and a press inside it puts the focus in its document
  p = await press(page);
  const z0 = await zoomOf(page);
  await page.keyboard.press('Control+Equal');
  await page.waitForTimeout(400);
  const z1 = await zoomOf(page), s1 = await storedZoom(page);
  say(p.focused && near(z1 / z0, 1.2, 0.001) && s1 === null,
      'with the focus in the live press, ctrl+= zooms the BENCH a fifth closer and never reaches the export: nothing stored',
      'focus in the press ' + p.focused + ' · bench ×' + (z1 / z0).toFixed(3) + ' · stored ' + s1);
  await page.keyboard.press('Control+Minus');
  await page.waitForTimeout(400);
  const z2 = await zoomOf(page), s2 = await storedZoom(page);
  say(near(z2, z0, 1e-6) && s2 === null, '…and ctrl+− takes the bench back out, the export none the wiser', 'bench ' + z0.toFixed(4) + ' → ' + z2.toFixed(4) + ' · stored ' + s2);

  // ── 4 · the keys ─────────────────────────────────────────────────────────
  console.log('\n4 · the keys');
  await frameOn(page, 0.8);
  await click(page, 'title', 450);
  await click(page, 'title', 300);
  const cam1 = await pan(page);
  for (const k of ['ArrowRight', 'ArrowLeft', 'ArrowDown', 'PageDown']) await page.keyboard.press(k);
  await page.waitForTimeout(450);
  p = await press(page);
  say((await pan(page)) === cam1 && p.live, '← → ↓ and page down in the live press move nothing outside it, and it stays awake', 'camera ' + cam1 + ' → ' + (await pan(page)));
  await ctx.close();

  // ── 5 · the published opening view ──────────────────────────────────────
  console.log('\n5 · the published opening view');
  for (const vp of [{ width: 2048, height: 1152 }, { width: 1600, height: 900 }, { width: 412, height: 915 }]) {
    ({ ctx, page } = await open(browser, { ctx: { viewport: vp }, query: '?seed=on', deployed: true }));
    await page.waitForFunction(() => Wall.store.get().items.filter(Boolean).length > 200, null, { timeout: 20000 });
    await page.waitForFunction(() => document.querySelectorAll('svg.wall-ink .wall-item').length > 200, null, { timeout: 20000 });
    await page.waitForTimeout(2500);
    const view = await page.evaluate(() => {
      const bb = Lab.bench.getBoundingClientRect(), el = document.getElementById('gz-press'), r = el.getBoundingClientRect();
      const shown = { x: parseFloat(el.style.left), y: parseFloat(el.style.top) }, home = { x: +el.dataset.homeX, y: +el.dataset.homeY };
      const box = e => ({ x1: parseFloat(e.style.left), y1: parseFloat(e.style.top), x2: parseFloat(e.style.left) + e.offsetWidth, y2: parseFloat(e.style.top) + e.offsetHeight });
      const g = box(el), st = Wall.store.get().items, hits = [], over = [];
      document.querySelectorAll('svg.wall-ink .wall-item').forEach(n => {
        const i = +n.dataset.i, it = st[i];
        if (!it || it.k === 's') return;
        const q = n.getBoundingClientRect();
        if (!q.width) return;
        const a = Lab.toWorld(q.left, q.top), c = Lab.toWorld(q.right, q.bottom);
        if (a.x < g.x2 && c.x > g.x1 && a.y < g.y2 && c.y > g.y1) hits.push(it.k + ' ' + (it.f || it.id || ''));
      });
      document.querySelectorAll('#bench-world > section.gz').forEach(s => {
        if (s === el) return;
        const o = box(s);
        if (o.x1 < g.x2 && o.x2 > g.x1 && o.y1 < g.y2 && o.y2 > g.y1) over.push(s.id);
      });
      const onScreen = r.left >= bb.left && r.right <= bb.right && r.top >= bb.top && r.bottom <= bb.bottom ? 'wholly on screen'
        : (r.right <= bb.left || r.left >= bb.right || r.bottom <= bb.top || r.top >= bb.bottom) ? 'off screen' : 'partly on screen';
      return { z: Lab.zoom, onScreen, shown, home, hits, over, cut: el.dataset.cut || null };
    });
    const reined = view.shown.x !== view.home.x || view.shown.y !== view.home.y;
    info(vp.width + '×' + vp.height + ' at zoom ' + view.z.toFixed(3) + ': the press is ' + view.onScreen,
         'home ' + view.home.x + ',' + view.home.y + (reined ? ' — REINED on this screen to ' + view.shown.x + ',' + view.shown.y : '') +
         (view.cut ? ', cut ' + view.cut : '') + (view.over.length ? ', its box overlaps ' + view.over.join(' and ') : ', overlapping no other section') +
         (view.hits.length ? ', over ' + view.hits.length + ' piece(s) of the wall: ' + view.hits.slice(0, 5).join('; ') : ', over no piece of the wall'));
    if (vp.width === 2048) {
      await frameOn(page, 0, view.z);
      say(await booted(page), 'at the opening zoom it boots — no poster stands in for it');
    }
    await ctx.close();
  }

  // ── 6 · this probe wrote nothing ────────────────────────────────────────
  console.log('\n6 · nothing written');
  say(true, 'every door write this probe made was answered in the browser, none reached serve.js', doorWrites + ' write(s) turned away');
  if (hash('index.html') !== h0) info('index.html changed while this ran — not by this probe (its doors are shut); an open bench autosaving through serve.js');
  say(errors.length === 0, 'no page errors anywhere', errors.slice(0, 3).join(' | ') || 'none');

  await browser.close();
  console.log('\n' + (fails ? fails + ' FAILED' : 'all passed'));
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
