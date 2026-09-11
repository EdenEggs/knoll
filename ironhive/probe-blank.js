/* ironhive/probe-blank.js — the paper going blank in bands while a film
   plays, reported twice on knoll.space/ironhive (2026-09-11): the stickers
   vanish below a straight line across the whole width, the paper's dots
   still showing, the youtube player still drawn. Chrome's GPU-raster tiles
   are strips as wide as the window and a quarter as tall, so a straight cut
   is a tile row the compositor has not drawn.

   WHAT THIS FOUND, driving the bench in system Chrome and asking the
   compositor what it was doing through the devtools protocol (a cc.debug
   trace carries every layer's ideal and raster scale and every tile's
   memory): with `will-change: transform` on the sheet, cc rasters the sheet
   at its NATURAL scale — 1× the device scale — whenever the zoom is within
   a factor of four below it, and follows the zoom only further out. So at
   25% (the screenshot's zoom: the 640-px video piece measures 160 px in it)
   the sheet was 96 tiles and 111 MB where it needs 12 tiles and 14 MB —
   eight times the tiles, sixteen times the pixels, twenty-five at a device
   scale of 1.25 — and every re-raster of the visible paper (a tab coming
   back, a memory-pressure signal, a change on the sheet) costs that much
   more. With the hint off, the raster scale follows the zoom everywhere.
   The held pose animation is not involved: blink never runs it on the
   compositor (its Animation trace events carry a compositeFailed reason at
   every zoom), and a plain transform style gives the same numbers.

   THE BLANK ITSELF WAS NOT REPRODUCED HERE — not by three minutes of
   hovering, clicking, zooming and panning round the playing film, not by
   hiding the tab and coming back, not by a simulated critical memory-
   pressure signal — so this is the strongest mitigation the compositor's
   own numbers point at, not a watched-it-happen root cause.

     (no args)   THE CHECK: a wall of real stickers and a film, the raster
                 scale read back at 25%, 50%, 10% and 400% — PASS when it is
                 the ideal at each and the sheet's tiles stay small.
     --will      put the hint back on the sheet for the run (the regime
                 before the fix, which the check then reports as FAIL)
     anim        walk the camera's own moves and read the sheet after each
     why         blink's own Animation trace events round good and bad zooms
     stress N    N minutes round the playing film, a screenshot each round
                 read back in-page: a sticker that lost its ink is a blank tile
     hide        the tab behind another for three seconds, three times, and
                 how long the paper stays blank on coming back
     --user      seed the wall, tracings and camera posted off the reporter's
                 own browser (USER_STORES=dir of user-ironhive-*.json); their
                 window is 2048×1017 at a device scale of 1.25
     --static    the pose as a transform style instead of the held animation
     --zoom=Z    start at this zoom, and keep the stress near it

   USAGE (from site/, serve.js up on 4321):  node ironhive/probe-blank.js
   Screenshots land in ironhive/results/ (PROBE_OUT to put them elsewhere). */
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const MODE = ['anim', 'why', 'stress', 'hide', 'check'].includes(process.argv[2]) ? process.argv[2] : 'check';
const MINUTES = +(process.argv[3]) || 2;
const STATIC = process.argv.includes('--static');
const WILL = process.argv.includes('--will');       // put will-change: transform back on the sheet for the run
const USER = process.argv.includes('--user');
const ZOOM = +((process.argv.find(a => a.startsWith('--zoom=')) || '').split('=')[1]) || 0;
const OUT = process.env.PROBE_OUT || path.join(__dirname, 'results');
const USER_DIR = process.env.USER_STORES || OUT;
fs.mkdirSync(OUT, { recursive: true });
const VIDEO = 'aqz-KE-bpKQ';             // Big Buck Bunny, 10 minutes, embeddable, 60fps — a real decoder load
const tag = (STATIC ? 'static' : 'held') + (WILL ? '-will' : '');
const say = (ok, what, extra) => console.log((ok ? '  PASS  ' : '  FAIL  ') + what + (extra == null ? '' : '   ' + extra));
const note = (what, extra) => console.log('  ·     ' + what + (extra == null ? '' : '   ' + extra));
let fails = 0;
const check = (ok, what, extra) => { if (!ok) fails++; say(ok, what, extra); };

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: false,
    args: ['--window-size=' + (USER ? '2064,1127' : '1616,1110'), '--window-position=0,0'] });
  const ctx = await browser.newContext(USER ? { viewport: { width: 2048, height: 1017 }, deviceScaleFactor: 1.25 }
                                            : { viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => { errs.push(String(e)); console.log('PAGEERROR', String(e)); });
  await page.route('**/_ironhive/**', r => r.fulfill({ status: 404, body: 'no door' }));

  try {
    const bcdp = await browser.newBrowserCDPSession();
    const info = await bcdp.send('SystemInfo.getInfo');
    const d = info.gpu && info.gpu.devices && info.gpu.devices[0];
    note('gpu', (d ? d.vendorString + ' ' + d.deviceString : '?'));
    await bcdp.detach();
  } catch (e) { note('gpu', 'SystemInfo not available: ' + e.message); }

  await page.goto('http://localhost:4321/ironhive/', { waitUntil: 'load' });
  await page.evaluate(() => { try { localStorage.clear(); } catch (e) {} });
  if (USER) {
    const stores = {};
    for (const k of ['wall', 'flatfile', 'cam']) {
      const f = path.join(USER_DIR, 'user-ironhive-' + k + '.json');
      if (fs.existsSync(f)) stores['knoll-ironhive:' + k] = fs.readFileSync(f, 'utf8');
    }
    await page.evaluate(s => { for (const k in s) localStorage.setItem(k, s[k]); }, stores);
    note('user stores', Object.keys(stores).map(k => k.replace('knoll-ironhive:', '') + ' ' + stores[k].length + 'b').join(', '));
  }
  await page.reload({ waitUntil: 'load' });
  await page.waitForFunction(() => window.Lab && window.Wall && window.Stickers && Stickers.list.length > 0);
  await page.waitForTimeout(900);
  note('chrome', await page.evaluate(() => navigator.userAgent.match(/Chrome\/[\d.]+/)[0]) + ', dpr ' + await page.evaluate(() => devicePixelRatio));

  if (WILL) {
    await page.evaluate(() => { Lab.world.style.willChange = 'transform'; });
    note('sheet hint', 'will-change: transform put back on for the run');
  }
  if (STATIC) {
    /* lab.js keeps its pose animation in a WeakMap and rewrites its keyframes
       through a.effect.setKeyframes on every pose change, so that method is
       wrapped: each rewrite is also written as the transform style, and the
       animation itself is cancelled. */
    await page.evaluate(() => {
      const world = Lab.world;
      const a = world.getAnimations().find(x => x.effect && x.effect.target === world);
      if (!a) return;
      const eff = a.effect, orig = eff.setKeyframes.bind(eff);
      const last = kf => (kf && kf.length ? kf[kf.length - 1].transform : '');
      eff.setKeyframes = kf => { orig(kf); world.style.transform = last(eff.getKeyframes()); };
      world.style.transform = last(eff.getKeyframes());
      a.cancel();
    });
    note('sheet pose', 'static transform (the held animation cancelled)');
  }

  /* A WALL LIKE THE ONE REPORTED: a spread of the real stickers, big, over a
     stretch of paper a few screens across, and one youtube piece among them
     — or the reporter's own, with --user. */
  const seeded = USER
    ? await page.evaluate(() => { Wall.setTool('move'); const items = Wall.store.get().items;
        return { stickers: items.filter(it => it && it.k === 'd').length, video: items.findIndex(it => it && it.k === 'v'), n: items.length }; })
    : await page.evaluate(vid => {
        Wall.store.update(st => { st.items = []; });
        Wall.setTool('move');
        const list = Stickers.list;
        let n = 0;
        for (let row = 0; row < 5; row++)
          for (let col = 0; col < 9; col++) {
            const s = list[(row * 9 + col) % list.length];
            Wall.store.update(st => { st.items.push({ k: 'd', f: s.id, o: 0, x: 600 + col * 700, y: 500 + row * 650, z: 320 + ((row + col) % 3) * 200 }); });
            n++;
          }
        Wall.store.update(st => { st.items.push({ k: 'v', id: vid, w: 640, h: 360, z: 640, x: 3400, y: 1800 }); });
        Wall.paint();
        return { stickers: n, video: Wall.store.get().items.length - 1, n: n + 1 };
      }, VIDEO);
  if (!USER) await page.evaluate(() => Lab.fit(true));
  if (ZOOM) await page.evaluate(z => Lab.setZoom(z), ZOOM);
  await page.waitForTimeout(600);
  note('seeded', seeded.stickers + ' stickers of ' + seeded.n + ' pieces, video at ' + seeded.video + ', zoom ' + await page.evaluate(() => Math.round(Lab.zoom * 100) + '%'));

  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Page.enable');

  // ── the film ─────────────────────────────────────────────────────────────
  const badge = async () => page.evaluate(i => {
    const g = document.querySelector('.wall-item[data-i="' + i + '"] .wall-play');
    if (!g) return null;
    const r = g.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }, seeded.video);
  const play = async () => {
    // the piece has to be on screen to be pressed: bring the camera to it at the current zoom
    await page.evaluate(i => { const it = Wall.store.get().items[i]; if (!it) return; const b = Lab.bench.getBoundingClientRect();
      Lab.camTo(Lab.zoom, b.width / 2 - it.x * Lab.zoom, b.height / 2 - it.y * Lab.zoom, 0); }, seeded.video);
    await page.waitForTimeout(500);
    const b = await badge();
    if (!b) return false;
    await page.mouse.click(b.x, b.y);
    await page.waitForTimeout(2500);
    return page.evaluate(() => !!document.querySelector('.wall-video iframe'));
  };
  const videoRect = () => page.evaluate(() => { const v = document.querySelector('.wall-video'); if (!v) return null; const r = v.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; });

  // ── reading the paper back: ink per sticker box, and per 32px strip ──────
  const INK = async () => {
    const shot = await cdp.send('Page.captureScreenshot', { format: 'png', fromSurface: true });
    return page.evaluate(async b64 => {
      const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode();
      const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
      const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(img, 0, 0);
      const W = c.width, H = c.height, d = g.getImageData(0, 0, W, H).data;
      const k = (x, y) => { const i = (y * W + x) * 4; return (d[i] >> 3) << 10 | (d[i + 1] >> 3) << 5 | (d[i + 2] >> 3); };
      // the paper is the two most common colours (base and dots); everything else is ink
      const hist = new Map();
      for (let y = 0; y < H; y += 2) for (let x = 0; x < W; x += 2) { const q = k(x, y); hist.set(q, (hist.get(q) || 0) + 1); }
      const paper = new Set([...hist.entries()].sort((a, b) => b[1] - a[1]).slice(0, 2).map(e => e[0]));
      const sx = W / innerWidth, sy = H / innerHeight;     // the screenshot is in device px
      const isInk = (x, y) => !paper.has(k(Math.min(W - 1, Math.round(x * sx)), Math.min(H - 1, Math.round(y * sy))));
      const bench = Lab.bench.getBoundingClientRect();
      const vid = document.querySelector('.wall-video'); const vr = vid && vid.getBoundingClientRect();
      const boxes = [];
      document.querySelectorAll('.wall-item').forEach(n => {
        const r = n.getBoundingClientRect();
        if (r.width < 24 || r.height < 24) return;
        if (r.left < bench.left || r.top < bench.top || r.right > bench.right || r.bottom > bench.bottom) return;
        if (vr && !(r.right < vr.left || r.left > vr.right || r.bottom < vr.top || r.top > vr.bottom)) return;
        let ink = 0, all = 0;
        for (let y = Math.ceil(r.top); y < r.bottom; y += 2) for (let x = Math.ceil(r.left); x < r.right; x += 2) { all++; if (isInk(x, y)) ink++; }
        boxes.push({ i: +n.dataset.i, top: Math.round(r.top), bottom: Math.round(r.bottom), f: all ? ink / all : 0 });
      });
      const strips = [];
      for (let y0 = Math.ceil(bench.top); y0 < bench.bottom; y0 += 32) {
        let ink = 0, all = 0;
        for (let y = y0; y < Math.min(y0 + 32, bench.bottom); y += 2) for (let x = Math.ceil(bench.left); x < bench.right; x += 4) {
          if (vr && x >= vr.left && x <= vr.right && y >= vr.top && y <= vr.bottom) continue;
          all++; if (isInk(x, y)) ink++;
        }
        strips.push(all ? ink / all : 0);
      }
      return { boxes, strips };
    }, shot.data);
  };
  const bar = strips => strips.map(f => f > 0.08 ? '█' : f > 0.02 ? '▓' : f > 0.004 ? '░' : '·').join('');

  /* ── WHAT THE COMPOSITOR SAYS ABOUT THE SHEET, one short trace, parsed here.
     The sheet's content layer is the biggest layer whose ideal contents scale
     is the zoom. Its ideal contents scale is what the screen needs; its
     raster scale is what the tiles were actually drawn at; the difference
     squared is how many times more tile memory the visible paper costs than
     it should. */
  const sheet = async (label) => {
    const events = [];
    const onData = e => { for (const v of e.value) events.push(v); };
    cdp.on('Tracing.dataCollected', onData);
    await cdp.send('Tracing.start', { transferMode: 'ReportEvents', traceConfig: {
      recordMode: 'recordContinuously', includedCategories: ['disabled-by-default-cc.debug', 'cc'] } });
    for (let k = 0; k < 4; k++) { await page.evaluate(() => Lab.panBy(1, 0)); await page.waitForTimeout(40); await page.evaluate(() => Lab.panBy(-1, 0)); await page.waitForTimeout(40); }
    await cdp.send('Tracing.end');
    await new Promise(r => cdp.once('Tracing.tracingComplete', r));
    cdp.off('Tracing.dataCollected', onData);
    const snaps = events.filter(e => e.name === 'LayerTreeHostImpl:snapshot' && e.args && e.args.snapshot);
    if (!snaps.length) return { label, none: true };
    const s = snaps[snaps.length - 1].args.snapshot;
    const z = await page.evaluate(() => ({ zoom: Lab.zoom, dpr: devicePixelRatio }));
    const layers = ((s.active_tree && s.active_tree.layers) || []).filter(l => l.bounds && l.draws_content && l.ideal_contents_scale > 0);
    const area = l => l.bounds.width * l.bounds.height;
    const near = (a, b) => Math.abs(a - b) < b * 0.03;
    let cand = layers.filter(l => near(l.ideal_contents_scale, z.zoom * z.dpr) || near(l.ideal_contents_scale, z.zoom)).sort((a, b) => area(b) - area(a));
    if (!cand.length) cand = layers.slice().sort((a, b) => area(b) - area(a));
    const L = cand[0];
    const tiles = (s.active_tiles || []).filter(t => L && t.layer_id === L.layer_id);
    const now = tiles.filter(t => t.combined_priority && t.combined_priority.priority_bin === 'NOW');
    const bytes = tiles.reduce((a, t) => a + (t.gpu_memory_usage || 0), 0);
    const all = (s.active_tiles || []).reduce((a, t) => a + (t.gpu_memory_usage || 0), 0);
    const tm = s.tile_manager_basic_state || {};
    return { label, layer: L && L.layer_id, bounds: L && [L.bounds.width, L.bounds.height],
      ideal: L && +(+L.ideal_contents_scale).toFixed(4), raster: L && +(+(L.raster_scales && L.raster_scales.contents_scale[0])).toFixed(4),
      tiles: tiles.length, now: now.length, nowUnready: now.filter(t => !t.is_using_gpu_memory).length,
      layerMB: +(bytes / 1048576).toFixed(1), allMB: +(all / 1048576).toFixed(1),
      oom: tm.did_oom_on_last_assign, limitMB: tm.global_state && Math.round(tm.global_state.hard_memory_limit_in_bytes / 1048576) };
  };
  const row = r => r.none ? `  ${r.label.padEnd(30)} no snapshot`
    : `  ${r.label.padEnd(30)} ideal ${String(r.ideal).padStart(7)}  raster ${String(r.raster).padStart(7)}${r.raster > r.ideal * 1.05 ? ' <<' : '   '}  tiles ${String(r.tiles).padStart(4)} now ${String(r.now).padStart(3)} unready ${String(r.nowUnready).padStart(3)}  sheet ${String(r.layerMB).padStart(6)} MB  all ${String(r.allMB).padStart(6)} / ${r.limitMB} MB  oom ${r.oom}`;
  const zoomPct = () => page.evaluate(() => Math.round(Lab.zoom * 100));

  if (MODE === 'check') {
    console.log('\ncheck — ' + tag + ' pose: the sheet rasters at the zoom, not at 1×');
    const started = await play();
    check(started, 'the film started');
    const at = async (z, cap) => {
      await page.evaluate(v => Lab.setZoom(v), z);
      await page.waitForTimeout(700);
      const r = await sheet('Lab.setZoom(' + z + ') z' + await zoomPct() + '%');
      console.log(row(r));
      const ideal = !r.none && Math.abs(r.raster - r.ideal) <= r.ideal * 0.03;
      check(ideal, 'at ' + Math.round(z * 100) + '% the sheet is rastered at its ideal scale', r.none ? 'no snapshot' : 'ideal ' + r.ideal + ', raster ' + r.raster + (ideal ? '' : ' — ' + (r.raster / r.ideal).toFixed(1) + '× the scale, ' + Math.round((r.raster / r.ideal) ** 2) + '× the pixels'));
      if (cap) check(!r.none && r.layerMB <= cap, 'and its tiles stay under ' + cap + ' MB', r.layerMB + ' MB in ' + r.tiles + ' tiles');
      return r;
    };
    await at(0.25, USER ? 60 : 40);
    await at(0.5, USER ? 60 : 40);
    await at(0.1, USER ? 60 : 40);
    await at(4);
    // a zoom step's cost on the main thread, for the record: the three frames after one
    const frames = await page.evaluate(() => new Promise(res => {
      const t = []; let last = performance.now(), n = 0;
      Lab.setZoom(0.3);
      const f = now => { t.push(Math.round(now - last)); last = now; if (++n < 4) requestAnimationFrame(f); else res(t); };
      requestAnimationFrame(f);
    }));
    note('frames after a zoom step (ms)', frames.join(', '));
    await page.screenshot({ path: path.join(OUT, 'blank-' + tag + (USER ? '-user' : '') + '-check.png') });
  } else if (MODE === 'anim') {
    console.log('\nanim — ' + tag + ' pose' + (USER ? ", the reporter's wall and window" : ''));
    const bench = await page.evaluate(() => { const r = Lab.bench.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; });
    const anims = () => page.evaluate(() => Lab.world.getAnimations().map(a => a.playState + (a.pending ? '(pending)' : '')).join(',') || 'none');
    const step = async (label, act) => {
      await act();
      await page.waitForTimeout(120);
      let r = await sheet(label + ' +0.1s z' + await zoomPct() + '%');
      console.log(row(r) + '  anims ' + await anims());
      await page.waitForTimeout(2500);
      r = await sheet('  …+2.6s');
      console.log(row(r) + '  anims ' + await anims());
    };
    await step('film started', async () => { await play(); });
    await step('Lab.fit(true)', () => page.evaluate(() => Lab.fit(true)));
    await step('Lab.setZoom(0.25)', () => page.evaluate(() => Lab.setZoom(0.25)));
    await step('Lab.setZoom(0.1)', () => page.evaluate(() => Lab.setZoom(0.1)));
    await step('Lab.setZoom(0.2) at a point', () => page.evaluate(b => Lab.setZoom(0.2, b.x + b.w * 0.3, b.y + b.h * 0.3), bench));
    await step('Lab.camTo(z*0.5, …, 300ms)', () => page.evaluate(() => Lab.camTo(Lab.zoom * 0.5, Lab.pan.x, Lab.pan.y, 300)));
    await step('Lab.fit()', () => page.evaluate(() => Lab.fit()));
    await step('Lab.setZoom(0.5)', () => page.evaluate(() => Lab.setZoom(0.5)));
    await step('Lab.setZoom(0.1)', () => page.evaluate(() => Lab.setZoom(0.1)));
    await step('shift 1 (the key)', async () => { await page.mouse.click(bench.x + bench.w / 2, bench.y + 20); await page.keyboard.press('Shift+1'); });
    await step('Lab.setZoom(0.25)', () => page.evaluate(() => Lab.setZoom(0.25)));
  } else if (MODE === 'why') {
    /* Blink's own "Animation" trace events carry compositeFailed (a bitmask of
       CompositorAnimations::FailureReason) each time an animation is (re)started. */
    console.log('\nwhy — ' + tag + ' pose' + (USER ? ", the reporter's wall and window" : ''));
    await play();
    const around = async (label, act) => {
      const events = [];
      const onData = e => { for (const v of e.value) events.push(v); };
      cdp.on('Tracing.dataCollected', onData);
      await cdp.send('Tracing.start', { transferMode: 'ReportEvents', traceConfig: { recordMode: 'recordContinuously',
        includedCategories: ['blink.animations', 'devtools.timeline', 'cc', 'disabled-by-default-cc.debug'] } });
      await page.waitForTimeout(150);
      await act();
      await page.waitForTimeout(900);
      for (let k = 0; k < 3; k++) { await page.evaluate(() => Lab.panBy(1, 0)); await page.waitForTimeout(40); await page.evaluate(() => Lab.panBy(-1, 0)); await page.waitForTimeout(40); }
      await cdp.send('Tracing.end');
      await new Promise(r => cdp.once('Tracing.tracingComplete', r));
      cdp.off('Tracing.dataCollected', onData);
      const an = events.filter(e => e.name === 'Animation' && e.args && e.args.data);
      const snaps = events.filter(e => e.name === 'LayerTreeHostImpl:snapshot' && e.args && e.args.snapshot);
      const s = snaps.length && snaps[snaps.length - 1].args.snapshot;
      const layers = s ? (s.active_tree.layers || []).filter(l => l.bounds && l.draws_content && l.ideal_contents_scale > 0).sort((a, b) => b.bounds.width * b.bounds.height - a.bounds.width * a.bounds.height) : [];
      const L = layers[0];
      const kf = await page.evaluate(() => { const a = Lab.world.getAnimations()[0]; return a ? { state: a.playState, kf: a.effect.getKeyframes().map(k => k.transform).join(' → ') } : null; });
      console.log('\n  ' + label + '  zoom ' + await zoomPct() + '%   sheet ideal ' + (L && (+L.ideal_contents_scale).toFixed(3)) + ' raster ' + (L && (+L.raster_scales.contents_scale[0]).toFixed(3)));
      console.log('    world animation: ' + JSON.stringify(kf));
      const seen = new Set();
      for (const e of an) { const d = e.args.data; const key = JSON.stringify({ ph: e.ph, state: d.state, compositeFailed: d.compositeFailed, unsupported: d.unsupportedProperties, name: d.name || d.displayName }); if (seen.has(key)) continue; seen.add(key); console.log('    Animation ' + key); }
    };
    await around('Lab.setZoom(0.1)', () => page.evaluate(() => Lab.setZoom(0.1)));
    await around('Lab.setZoom(0.25)', () => page.evaluate(() => Lab.setZoom(0.25)));
    await around('Lab.setZoom(0.2)', () => page.evaluate(() => Lab.setZoom(0.2)));
    await around('Lab.setZoom(0.5)', () => page.evaluate(() => Lab.setZoom(0.5)));
  } else if (MODE === 'hide') {
    const started = await play();
    check(started, 'the film started');
    await page.waitForTimeout(1500);
    console.log('\nhide — ' + tag + ' pose' + (USER ? ", the reporter's wall and window" : '') + ', zoom ' + await zoomPct() + '%');
    const base = await INK();
    const baseline = new Map(base.boxes.map(b => [b.i, b.f]));
    console.log(row(await sheet('before')) + '  ' + bar(base.strips));
    const lost = async () => { const ink = await INK(); const l = ink.boxes.filter(b => baseline.has(b.i) && baseline.get(b.i) > 0.12 && b.f < baseline.get(b.i) * 0.15); return { n: l.length, of: ink.boxes.length, bar: bar(ink.strips) }; };
    const other = await ctx.newPage();
    await other.goto('about:blank');
    let worst = 0, longest = 0;
    for (let k = 1; k <= 3; k++) {
      await other.bringToFront();
      await page.waitForTimeout(3000);
      await page.bringToFront();
      const t0 = Date.now();
      let blankUntil = 0, shot = false;
      for (;;) {
        const l = await lost();
        const t = Date.now() - t0;
        if (l.n) { blankUntil = t; worst = Math.max(worst, l.n); if (!shot) { shot = true; await page.screenshot({ path: path.join(OUT, 'blank-' + tag + (USER ? '-user' : '') + '-hide.png') }); } }
        console.log(`  back ${k}  +${String(t).padStart(5)} ms  ${l.bar}  ${l.n ? 'LOST ' + l.n + '/' + l.of : 'all there'}`);
        if (t > 5000 || (!l.n && t > 700)) break;
      }
      longest = Math.max(longest, blankUntil);
      await page.waitForTimeout(1000);
    }
    await other.close();
    check(longest === 0, 'nothing stayed blank on coming back to the tab (' + tag + ')', longest ? 'blank for up to ' + longest + ' ms, ' + worst + ' stickers gone at worst' : '');
    console.log(row(await sheet('after')));
  } else {
    console.log('\nstress — ' + tag + ' pose, ' + MINUTES + ' minute(s)' + (USER ? ", the reporter's wall and window" : ''));
    const started = await play();
    check(started, 'the film started');
    const base = await INK();
    const baseline = new Map(base.boxes.map(b => [b.i, b.f]));
    note('baseline', base.boxes.length + ' boxes, strips: ' + bar(base.strips));
    const end = Date.now() + MINUTES * 60000;
    let round = 0, hits = 0, firstHit = null;
    const bench = await page.evaluate(() => { const r = Lab.bench.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; });
    while (Date.now() < end) {
      round++;
      const vr = await videoRect();
      // hover round and over the film, the way a hand does; every third round a press to pause or play
      if (vr) {
        for (let k = 0; k < 4; k++) { await page.mouse.move(vr.x + vr.w * (0.1 + 0.2 * k), vr.y + vr.h * (0.3 + 0.1 * k), { steps: 6 }); await page.waitForTimeout(120); }
        await page.mouse.move(vr.x - 60, vr.y - 60, { steps: 8 }); await page.waitForTimeout(150);
        if (round % 3 === 0) { await page.mouse.click(vr.x + vr.w / 2, vr.y + vr.h / 2); await page.waitForTimeout(400); }
      }
      // a zoom step in or out at a point (one notch with a zoom to sit at, else two), and a pan
      const P = { x: bench.x + bench.w * (0.2 + 0.6 * Math.random()), y: bench.y + bench.h * (0.2 + 0.6 * Math.random()) };
      await page.mouse.move(P.x, P.y);
      await page.keyboard.down('Control');
      await page.mouse.wheel(0, round % 2 ? -120 : 120); await page.waitForTimeout(80);
      if (!ZOOM) { await page.mouse.wheel(0, round % 2 ? -120 : 120); await page.waitForTimeout(80); }
      await page.keyboard.up('Control');
      await page.waitForTimeout(250);
      await page.mouse.wheel(round % 4 < 2 ? 300 : -300, round % 2 ? 200 : -200);
      await page.waitForTimeout(500);
      if (round % 5 === 0) { await page.evaluate(z => z ? Lab.setZoom(z) : Lab.fit(true), ZOOM); await page.waitForTimeout(500); }
      const ink = await INK();
      const lost = ink.boxes.filter(b => baseline.has(b.i) && baseline.get(b.i) > 0.12 && b.f < baseline.get(b.i) * 0.15);
      process.stdout.write(`  r${String(round).padStart(3)} z${String(await zoomPct()).padStart(3)}% ${bar(ink.strips)} ${lost.length ? 'LOST ' + lost.map(b => b.i + '@' + b.top + '-' + b.bottom).join(' ') : ''}\n`);
      if (lost.length >= 2) {
        hits++;
        if (!firstHit) {
          firstHit = round;
          await page.screenshot({ path: path.join(OUT, 'blank-' + tag + (USER ? '-user' : '') + '-hit.png') });
          console.log(row(await sheet('at the hit')));
        }
      }
    }
    check(hits === 0, 'no blank bands in ' + round + ' rounds (' + tag + ' pose)', hits ? hits + ' hit(s), first at round ' + firstHit : '');
  }
  check(errs.length === 0, 'no page errors', errs.join(' | '));
  console.log('\n' + (fails ? fails + ' FAIL' : 'all PASS'));
  await browser.close();
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
