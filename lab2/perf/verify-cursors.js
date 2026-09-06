// verify-cursors.js — three real Chrome sessions on one bench: does everybody see everybody?
// Run from site/ with serve.js up:  NODE_PATH=C:/Users/bobb9/Desktop/node_modules node lab2/perf/verify-cursors.js http://localhost:4321/lab2/
// or against the live site:         ... verify-cursors.js https://www.knoll.space/ out.png
// (2026-09-04; the autosave door is 404'd from these pages, like measure.js)
// Two real Chrome contexts (separate localStorage, so separate cameras) on the
// same bench: A moves, B must draw A's cursor at the right world point, hide it
// when A leaves, keep it right through a zoom, and take at most ~20 msgs/s.
const { chromium } = require('playwright');
const URL = process.argv[2] || 'http://localhost:4321/lab2/';
const OUT = process.argv[3] || 'C:/Users/bobb9/AppData/Local/Temp/claude/C--Users-bobb9-Desktop-align/4895d421-3402-44f6-8f80-a4f8e4692c39/scratchpad/two-B.png';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const results = [];
const check = (name, ok, detail) => { results.push({ name, ok: !!ok, detail }); console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail ? ' — ' + detail : '')); };

(async () => {
  const browser = await chromium.launch({
    channel: 'chrome', headless: false,
    args: ['--disable-backgrounding-occluded-windows', '--disable-renderer-backgrounding', '--window-size=1100,750'],
  });
  const A = await (await browser.newContext({ viewport: { width: 1000, height: 650 } })).newPage();
  const B = await (await browser.newContext({ viewport: { width: 1000, height: 650 } })).newPage();
  const C = await (await browser.newContext({ viewport: { width: 1000, height: 650 } })).newPage();
  for (const p of [A, B, C]) {
    p.on('pageerror', e => console.log('PAGEERROR', e.message));
    // no autosave through serve.js's door from these throwaway pages (same as perf/measure.js)
    await p.route('**/_lab2/**', r => r.fulfill({ status: 404, body: 'no door' }));
  }
  await Promise.all([A.goto(URL), B.goto(URL), C.goto(URL)]);

  // wait for both to join and peer
  const peered = async (p, ms) => {
    const t0 = Date.now();
    while (Date.now() - t0 < ms) {
      const s = await p.evaluate(() => window.Company ? { room: !!Company.room, peers: Company.peers, id: Company.id } : null);
      if (s && s.peers >= 2) return s;
      await sleep(500);
    }
    return await p.evaluate(() => window.Company ? { room: !!Company.room, peers: Company.peers, id: Company.id, relays: Object.entries(Trystero.getRelaySockets()).map(([u, s]) => u + ':' + s.readyState) } : 'no Company');
  };
  const [sa, sb, sc] = await Promise.all([peered(A, 60000), peered(B, 60000), peered(C, 60000)]);
  check('A, B and C peered', sa.peers >= 2 && sb.peers >= 2 && sc.peers >= 2, JSON.stringify({ sa, sb, sc }));

  // cameras differ on purpose
  await B.evaluate(() => Lab.panBy(180, 120));
  await sleep(300);

  // A moves; B must draw it at the same WORLD point
  await A.mouse.move(500, 400); await A.mouse.move(520, 410, { steps: 4 });
  await sleep(700);
  const wa = await A.evaluate(() => { const w = Lab.toWorld(520, 410); return [w.x, w.y]; });
  const rb = await B.evaluate(([wx, wy]) => {
    const e = document.querySelector('.company-cursor'); if (!e) return null;
    const r = e.getBoundingClientRect(); const s = Lab.toScreen(wx, wy);
    const a = e.getAnimations().find(x => x.constructor.name === 'Animation');
    const m = a && a.effect.getKeyframes()[1].transform.match(/translate\(([-\d.]+)px, ([-\d.]+)px\) scale\(([\d.]+)\)/);
    return { n: document.querySelectorAll('.company-cursor').length, tip: [r.left, r.top], expected: [s.x, s.y], target: m && [+m[1], +m[2]], scale: m && +m[3], zoom: Lab.zoom, colour: e.style.getPropertyValue('--c'), opacity: getComputedStyle(e).opacity, away: e.classList.contains('away') };
  }, wa);
  check('B draws one cursor', rb && rb.n === 1, JSON.stringify(rb));
  check('B cursor at A\'s world point (≤1.5px)', rb && Math.hypot(rb.tip[0] - rb.expected[0], rb.tip[1] - rb.expected[1]) <= 1.5, rb && `tip ${rb.tip.map(v => v.toFixed(1))} expected ${rb.expected.map(v => v.toFixed(1))} target ${rb.target} sent ${wa.map(Math.round)}`);
  check('B cursor visible', rb && rb.opacity === '1' && !rb.away, rb && rb.opacity);
  const AC = rb && rb.colour;   // A's colour, to find A's cursor in B from here on
  const qA = `.company-cursor[style*="${AC}"]`;
  check('counter-scale is 1/zoom', rb && Math.abs(rb.scale - 1 / rb.zoom) < 0.01, rb && `scale ${rb.scale} zoom ${rb.zoom}`);
  await C.mouse.move(640, 300); await C.mouse.move(660, 310, { steps: 4 });
  await sleep(700);
  const two = await B.evaluate(() => [...document.querySelectorAll('.company-cursor')].map(e => ({ c: e.style.getPropertyValue('--c'), tip: [Math.round(e.getBoundingClientRect().left), Math.round(e.getBoundingClientRect().top)] })));
  check('B shows two cursors in two colours', two.length === 2 && two[0].c !== two[1].c, JSON.stringify(two));
  await B.screenshot({ path: OUT });

  // rate: A moves every 8ms for 2s; B counts arrivals
  await B.evaluate(() => { window.__n = 0; const layer = document.querySelector('.company'); window.__mo = new MutationObserver(() => {}); document.querySelectorAll('.company-cursor').forEach(e => { const a = e.getAnimations().find(x => x.constructor.name === 'Animation'); const orig = a.effect.setKeyframes.bind(a.effect); a.effect.setKeyframes = k => { window.__n++; return orig(k); }; }); });
  const t0 = Date.now(); let i = 0;
  while (Date.now() - t0 < 2000) { await A.mouse.move(300 + (i % 50) * 4, 300 + (i % 30) * 3); i++; await sleep(8); }
  await sleep(300);
  const n = await B.evaluate(() => window.__n);
  check('rate ≤ ~22/s over 2s of 8ms moves', n <= 46 && n >= 20, `${n} keyframe rewrites in 2s (${i} moves sent)`);

  // smoothness: B samples the tip while A glides
  const sampler = B.evaluate(async (Q) => { const e = document.querySelector(Q); const xs = []; const t0 = performance.now(); while (performance.now() - t0 < 600) { xs.push(e.getBoundingClientRect().left); await new Promise(r => requestAnimationFrame(r)); } return xs; }, qA);
  await A.mouse.move(200, 400); await A.mouse.move(700, 400, { steps: 30 });
  const xs = await sampler;
  const distinct = new Set(xs.map(v => Math.round(v))).size;
  check('cursor glides (many distinct x over 600ms)', distinct >= 8, `${distinct} distinct positions in ${xs.length} frames`);

  // zoom in B keeps it in place, and 24px
  const z = await B.evaluate(() => { Lab.setZoom(1.3, 500, 300); return Lab.zoom; });
  await sleep(300);
  const wa2 = await A.evaluate(() => { const w = Lab.toWorld(700, 400); return [w.x, w.y]; });
  const rz = await B.evaluate(([wx, wy, Q]) => { const e = document.querySelector(Q); const r = e.getBoundingClientRect(); const s = Lab.toScreen(wx, wy); const svg = e.querySelector('svg').getBoundingClientRect(); return { tip: [r.left, r.top], expected: [s.x, s.y], svgW: svg.width, zoom: Lab.zoom }; }, [...wa2, qA]);
  check('after zoom B cursor still at world point', Math.hypot(rz.tip[0] - rz.expected[0], rz.tip[1] - rz.expected[1]) <= 1.5, JSON.stringify(rz));
  check('after zoom arrow still 24px', Math.abs(rz.svgW - 24) < 0.6, `svg ${rz.svgW.toFixed(2)}px at zoom ${rz.zoom}`);

  // pan in B: the cursor rides the scroll
  const before = await B.evaluate(Q => { const r = document.querySelector(Q).getBoundingClientRect(); return [r.left, r.top]; }, qA);
  await B.evaluate(() => Lab.panBy(-90, -60));
  await sleep(200);
  const after = await B.evaluate(Q => { const r = document.querySelector(Q).getBoundingClientRect(); return [r.left, r.top]; }, qA);
  check('pan in B moves the cursor with the paper', Math.abs((after[0] - before[0]) + 90) <= 1 && Math.abs((after[1] - before[1]) + 60) <= 1, `moved ${(after[0] - before[0]).toFixed(1)},${(after[1] - before[1]).toFixed(1)}`);

  // screenshot B with A's cursor on it (A parks it somewhere clear first)
  await A.mouse.move(650, 380, { steps: 5 });
  await sleep(400);

  // A leaves the window → B fades it; A comes back → B shows it
  await A.evaluate(() => document.documentElement.dispatchEvent(new PointerEvent('pointerleave')));
  await sleep(900);
  const gone = await B.evaluate(Q => { const e = document.querySelector(Q); return { away: e.classList.contains('away'), opacity: getComputedStyle(e).opacity }; }, qA);
  check('A leaving hides it in B', gone.away && gone.opacity === '0', JSON.stringify(gone));
  await A.mouse.move(640, 370);
  await sleep(600);
  const back = await B.evaluate(Q => { const e = document.querySelector(Q); return { away: e.classList.contains('away'), opacity: getComputedStyle(e).opacity }; }, qA);
  check('A returning shows it in B', !back.away && back.opacity === '1', JSON.stringify(back));

  // A closes → B drops the cursor
  await A.close();
  await sleep(2500);
  const left = await B.evaluate(() => ({ n: document.querySelectorAll('.company-cursor').length, peers: Company.peers }));
  check('A closing removes its cursor from B, C stays', left.n === 1 && left.peers === 1, JSON.stringify(left));
  await C.close();
  await sleep(2500);
  const none = await B.evaluate(() => ({ n: document.querySelectorAll('.company-cursor').length, peers: Company.peers }));
  check('C closing empties B', none.n === 0 && none.peers === 0, JSON.stringify(none));

  await browser.close();
  const fails = results.filter(r => !r.ok).length;
  console.log(`\n${results.length - fails}/${results.length} passed`);
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error('HARNESS ERROR', e); process.exit(2); });
