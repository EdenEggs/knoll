// verify-spotlight.js — the Knoll Times reader gets the whole screen; run from site/ with serve.js up:
// NODE_PATH=C:/Users/bobb9/Desktop/node_modules node lab2/perf/verify-spotlight.js http://localhost:4321/lab2/ [shot.png]
// (2026-09-04; the autosave door is 404'd, like measure.js)
// The spotlight, in real Chrome: open an issue on the Knoll Times stand and the
// bench must dim edge to edge with a hole on the paper, glide the paper to the
// middle, keep the frame live, and put it all back on a click in the dark, the
// X, Esc, or a click on the document's own scrim.
const { chromium } = require('playwright');
const URL = process.argv[2] || 'http://localhost:4321/lab2/';
const OUT = process.argv[3] || 'C:/Users/bobb9/AppData/Local/Temp/claude/C--Users-bobb9-Desktop-align/4895d421-3402-44f6-8f80-a4f8e4692c39/scratchpad/spot.png';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const results = [];
const check = (name, ok, detail) => { results.push({ name, ok: !!ok }); console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail ? ' — ' + detail : '')); };
const near = (a, b, tol) => Math.abs(a - b) <= tol;

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: false, args: ['--window-size=1440,960', '--window-position=0,0'] });
  const page = await (await browser.newContext({ viewport: { width: 1400, height: 880 }, deviceScaleFactor: 1 })).newPage();
  await page.route('**/_lab2/**', r => r.fulfill({ status: 404, body: 'no door' }));
  const errors = [];
  page.on('pageerror', e => errors.push(String(e.message || e)));
  await page.goto(URL);
  await page.waitForFunction(() => window.Lab && window.Frames && window.Spotlight);

  // fly to the press and wait for it to boot
  await page.evaluate(() => Lab.jumpTo(document.getElementById('gz-press')));
  const booted = await page.waitForFunction(() => document.getElementById('gz-press').classList.contains('booted'), null, { timeout: 30000 }).then(() => true).catch(() => false);
  check('press boots after jumpTo', booted);
  await sleep(600);

  // helpers that live in the page
  const geo = () => page.evaluate(() => {
    const sec = document.getElementById('gz-press'), f = sec.querySelector('iframe'), doc = f.contentDocument, fr = f.getBoundingClientRect();
    const k = fr.width / f.contentWindow.innerWidth;
    const map = r => ({ l: fr.left + r.left * k, t: fr.top + r.top * k, r: fr.left + r.right * k, b: fr.top + r.bottom * k });
    const leaf = [...doc.querySelectorAll('[data-screen-label] *')].filter(e => !e.children.length && /ROARS TO LIFE/.test(e.textContent) && !e.closest('[data-lab-scrim]'))[0];
    const scrim = doc.querySelector('[data-lab-scrim]'), pg = doc.querySelector('[data-lab-page]'), x = doc.querySelector('[data-lab-close]');
    const hole = document.querySelector('.spotlight');
    const hb = hole && hole.getBoundingClientRect();
    return {
      frame: { l: fr.left, t: fr.top, r: fr.right, b: fr.bottom }, k,
      clip: leaf ? map(leaf.getBoundingClientRect()) : null,
      paper: pg ? map(pg.getBoundingClientRect()) : null,
      x: x ? map(x.getBoundingClientRect()) : null,
      scrim: !!scrim, scrimBg: scrim ? doc.defaultView.getComputedStyle(scrim).backgroundColor : null,
      spotlit: doc.documentElement.hasAttribute('data-lab-spotlit'),
      hole: hb ? { l: hb.left, t: hb.top, r: hb.right, b: hb.bottom, on: hole.classList.contains('on'), shadow: getComputedStyle(hole).boxShadow } : null,
      bx: (() => { const b = document.querySelector('.spotlight-x'); if (!b) return null; const r = b.getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom }; })(),
      docX: x ? doc.defaultView.getComputedStyle(x).visibility : null,
      live: Frames.live, spot: Spotlight.on, cam: { z: Lab.zoom, x: Lab.pan.x, y: Lab.pan.y },
      bench: (() => { const b = Lab.bench.getBoundingClientRect(); const d = document.querySelector('.tool-dock'); const r = d && d.getBoundingClientRect(); const strip = r && r.width && r.top >= b.top + b.height / 2 ? Math.max(0, b.top + b.height - r.top + 12) : 0; return { l: b.left, t: b.top, w: b.width, h: b.height, H: b.height - strip }; })(),
      band: (() => { const b = document.querySelector('.lab-band'); return !!b && !b.hidden && getComputedStyle(b).display !== 'none'; })(),
      picked: [...document.querySelectorAll('.gz.picked')].map(e => e.id),
    };
  });
  const mid = r => [(r.l + r.r) / 2, (r.t + r.b) / 2];

  async function openLatest() {
    let g = await geo();
    if (!g.clip) throw new Error('no clipping found');
    const [cx, cy] = mid(g.clip);
    if (g.live !== 'knoll-times') { await page.mouse.click(cx, cy); await sleep(150); }   // the shield: first click wakes it
    await page.mouse.click(cx, cy);                                                       // the clipping
    await page.waitForFunction(() => !!document.querySelector('.spotlight.on'), null, { timeout: 3000 }).catch(() => {});
    await sleep(1500);   // the glide, the pop, the unfold
    return geo();
  }

  // ── open: dim, hole on the paper, paper in the middle, frame live ─────
  const before = (await geo()).cam;
  let g = await openLatest();
  check('reader opens with the spotlight on', g.scrim && g.hole && g.hole.on && g.spot, JSON.stringify({ spot: g.spot, live: g.live }));
  check('the document\'s own scrim goes clear', g.spotlit && /rgba\(0, 0, 0, 0\)|transparent/.test(g.scrimBg || ''), g.scrimBg);
  check('the dark is up (shadow rgba .55)', g.hole && /0\.55/.test(g.hole.shadow), g.hole && g.hole.shadow.slice(0, 60));
  if (g.paper && g.hole) {
    const want = { l: g.paper.l, t: g.paper.t, r: g.paper.r, b: g.paper.b };
    want.l = Math.max(want.l, g.frame.l); want.t = Math.max(want.t, g.frame.t); want.r = Math.min(want.r, g.frame.r); want.b = Math.min(want.b, g.frame.b);
    const tol = 6;   // the paper's -0.4deg tilt grows its bounding box a few px past its layout box, which is what the hole is cut from
    check('the hole is the paper and nothing else (clipped to the frame)', near(g.hole.l, want.l, tol) && near(g.hole.t, want.t, tol) && near(g.hole.r, want.r, tol) && near(g.hole.b, want.b, tol),
      `hole ${[g.hole.l, g.hole.t, g.hole.r, g.hole.b].map(v => v.toFixed(0))} want ${[want.l, want.t, want.r, want.b].map(v => v.toFixed(0))}`);
    const [hx, hy] = mid(g.hole), bx = g.bench.l + g.bench.w / 2, by = g.bench.t + g.bench.H / 2;
    check('the paper is in the middle of the screen (above the dock)', near(hx, bx, 3) && near(hy, by, 3), `hole centre ${hx.toFixed(0)},${hy.toFixed(0)} middle ${bx.toFixed(0)},${by.toFixed(0)}`);
    const dockTop = g.bench.t + g.bench.H + 12 - 12;
    check('the paper stays clear of the dock', g.hole.b <= g.bench.t + g.bench.H + 1, `hole bottom ${g.hole.b.toFixed(0)}, dock strip from ${(g.bench.t + g.bench.H).toFixed(0)}`);
    const fill = Math.max((g.hole.r - g.hole.l) / g.bench.w, (g.hole.b - g.hole.t) / g.bench.H);
    check('…at a zoom that fills 90% of the shorter way', near(fill, 0.9, 0.02), `fills ${(fill * 100).toFixed(1)}% (zoom ${g.cam.z.toFixed(3)})`);
  }
  check('the frame is live while reading', g.live === 'knoll-times', g.live);
  check("the document's X is hidden and the bench's sits at the paper's corner", g.docX === 'hidden' && g.bx && near((g.bx.l + g.bx.r) / 2, g.hole.r - 4, 2) && near((g.bx.t + g.bx.b) / 2, g.hole.t + 4, 2), JSON.stringify({ docX: g.docX, bx: g.bx, holeCorner: [g.hole.r, g.hole.t] }));
  const rim = await page.evaluate(() => ({ body: document.body.classList.contains('lab-spotlit'), outline: getComputedStyle(document.getElementById('gz-press')).outlineColor }));
  check('the live rim goes quiet under the light', rim.body && /rgba\(0, 0, 0, 0\)|transparent/.test(rim.outline), JSON.stringify(rim));
  await page.screenshot({ path: OUT });

  // pan while reading: the hole follows
  const h0 = g.hole;
  await page.evaluate(() => Lab.panBy(60, 40));
  await sleep(150);
  g = await geo();
  check('a pan moves the hole with the paper', near(g.hole.l - h0.l, 60, 1) && near(g.hole.t - h0.t, 40, 1), `moved ${(g.hole.l - h0.l).toFixed(1)},${(g.hole.t - h0.t).toFixed(1)}`);
  await page.evaluate(() => Lab.panBy(-60, -40));
  await sleep(150);

  // leave the frame, come back: the frame is woken before the click lands
  await page.mouse.move(g.frame.l - 40, g.frame.t + 40);
  await sleep(450);
  const released = (await geo()).live;
  await page.mouse.move(...mid((await geo()).paper), { steps: 6 });
  await sleep(120);
  g = await geo();
  check('leaving the frame let the shield back (frames.js), coming back woke it (spotlight)', released !== 'knoll-times' && g.live === 'knoll-times', `after leave: ${released}, after return: ${g.live}`);

  // the X, one click — the bench's own
  await page.mouse.click(...mid(g.bx));
  await sleep(700);
  g = await geo();
  check('the X closes it in one click', !g.scrim && !g.spot && !g.hole, JSON.stringify({ scrim: g.scrim, spot: g.spot, hole: !!g.hole }));
  check('the camera glides back to where it was', near(g.cam.z, before.z, 0.002) && near(g.cam.x, before.x, 1.5) && near(g.cam.y, before.y, 1.5), `now ${JSON.stringify(g.cam)} was ${JSON.stringify(before)}`);

  // a click in the dark OUTSIDE the frame
  g = await openLatest();
  check('opens again', g.scrim && g.spot);
  const dark = [g.frame.l > 120 ? g.frame.l - 60 : g.frame.r + 60, g.bench.t + g.bench.h * 0.5];
  const pickedBefore = g.picked.join(',');
  await page.mouse.move(...dark);
  await page.mouse.down(); await sleep(60);
  const midDrag = await geo();            // a band would be drawn by now if the press had reached lab.js
  await page.mouse.move(dark[0] + 80, dark[1] + 60, { steps: 4 }); await sleep(60);
  const dragged = await geo();
  await page.mouse.up();
  await sleep(700);
  g = await geo();
  check('a click in the dark outside the frame closes it', !g.scrim && !g.spot, JSON.stringify({ scrim: g.scrim, spot: g.spot }));
  // (the press may still be live afterwards: the glide back can carry it under the resting pointer, which is frames.js's own rule)
  check('…and starts no band, picks nothing new, wakes nothing else', !midDrag.band && !dragged.band && dragged.picked.join(',') === pickedBefore && (g.live === null || g.live === 'knoll-times'), JSON.stringify({ bandMid: midDrag.band, bandDragged: dragged.band, pickedBefore, pickedAfter: dragged.picked, live: g.live }));

  // a click in the dark INSIDE the frame (the document's own scrim)
  g = await openLatest();
  await page.mouse.click(g.frame.l + 12 * g.k, g.frame.t + 12 * g.k);
  await sleep(700);
  g = await geo();
  check('a click on the document\'s scrim closes it too', !g.scrim && !g.spot, JSON.stringify({ scrim: g.scrim, spot: g.spot }));

  // Esc
  g = await openLatest();
  await page.keyboard.press('Escape');
  await sleep(700);
  g = await geo();
  check('Esc closes it', !g.scrim && !g.spot, JSON.stringify({ scrim: g.scrim, spot: g.spot }));
  check('the camera is back again', near(g.cam.z, before.z, 0.002) && near(g.cam.x, before.x, 1.5) && near(g.cam.y, before.y, 1.5), JSON.stringify(g.cam));

  check('no page errors', errors.length === 0, errors.join(' | ').slice(0, 300));
  await browser.close();
  const fails = results.filter(r => !r.ok).length;
  console.log(`\n${results.length - fails}/${results.length} passed`);
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error('HARNESS ERROR', e); process.exit(2); });
