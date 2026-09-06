/* lab2/perf/verify-live.js — THE EXCEPTIONS, checked: the two sections marked
   data-live (the scroll and the builder gnome) move on the default view,
   with nobody having clicked anything. Opens the bench as a fresh visitor
   would (no storage, the door blocked), waits for the boot queue, and asks:
   is the scroll a document rather than a poster, is its wizard swinging, is
   the builder drawn in full with his hammer going — and how many documents
   the opening view costs (ADDING.md §5 says four, plus this one).
   USAGE (from site/, serve.js up): node lab2/perf/verify-live.js */
const path = require('path');
const { chromium } = require('playwright');
const OUT = path.join(__dirname, 'results');
const results = [];
const check = (name, ok, info) => { results.push({ name, ok }); console.log((ok ? 'PASS ' : 'FAIL ') + name + (info ? ' — ' + info : '')); };

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: false, args: ['--window-size=1616,1110', '--window-position=0,0'] });
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await page.route('**/_lab2/default', r => r.fulfill({ status: 404, body: 'no door' }));
  await page.goto('http://localhost:4321/lab2/', { waitUntil: 'load' });
  await page.waitForFunction(() => window.Lab && window.Frames && window.Kits);
  await page.waitForFunction(() => document.getElementById('gz-scroll').classList.contains('booted'), null, { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(2500);

  const r = await page.evaluate(async () => {
    const sc = document.getElementById('gz-scroll');
    const p = Frames.panelOf(sc);
    const out = { zoom: +Lab.zoom.toFixed(3), docs: Frames.panels.filter(q => q.loading).map(q => q.id) };
    const bb = Lab.bench.getBoundingClientRect(), sr = sc.getBoundingClientRect();
    out.scroll = { booted: sc.classList.contains('booted'), postered: sc.classList.contains('gz-postered'), posterImg: !!sc.querySelector('.gz-poster img'),
      onScreen: sr.right > bb.left && sr.left < bb.right && sr.bottom > bb.top && sr.top < bb.bottom, widthPx: Math.round(sr.width), nat: [p.natW, p.natH] };
    try {
      const d = sc.querySelector('iframe').contentDocument, w = d.defaultView;
      const g = d.querySelector('[data-clinger] g[style*="swing"]');
      const t1 = g && w.getComputedStyle(g).transform;
      await new Promise(res => setTimeout(res, 800));
      const t2 = g && w.getComputedStyle(g).transform;
      out.wizard = { found: !!g, play: g && w.getComputedStyle(g).animationPlayState, moved: !!g && t1 !== t2, paused: d.documentElement.hasAttribute('data-lab-paused'), crowd: d.documentElement.hasAttribute('data-lab-crowd') };
    } catch (e) { out.wizard = { error: String(e) }; }
    const b = document.getElementById('gz-gnome-builder');
    const svg = b.querySelector('.gz-art svg');
    const hg = svg && svg.querySelector('g[style*="hammerSwing"]');
    const samples = [];
    if (hg) for (let i = 0; i < 8; i++) { samples.push(getComputedStyle(hg).transform); await new Promise(res => setTimeout(res, 200)); }
    const br = b.getBoundingClientRect();
    out.builder = { live: !!svg, full: !!hg, play: hg && getComputedStyle(hg).animationPlayState, moved: new Set(samples).size > 1, heightPx: Math.round(br.height),
      onScreen: br.right > bb.left && br.left < bb.right && br.bottom > bb.top && br.top < bb.bottom };
    // every other document DRAWN on the opening view earned it the usual way:
    // a box 480 screen px wide (THE POSTERS, frames.js) — the exception is the
    // one word on the two tags and nothing leaks past it. A panel that booted
    // on its composed box and was then re-cut under the line (the fan banner:
    // 1000 wide as written, 941 as drawn) is put away behind its poster
    // (gz-postered) and costs nothing drawn, so it is not a leak — nor is one
    // still in flight (loading, not yet booted), which is put away the moment
    // it boots. A leak is a BOOTED, DRAWN document under the line.
    out.leaked = Frames.panels.filter(q => q.loading && q.el.classList.contains('booted') && !q.el.hasAttribute('data-live') && !q.el.classList.contains('gz-postered') && q.el.getBoundingClientRect().width < 480).map(q => q.id);
    return out;
  });
  console.log(JSON.stringify(r));
  check('the scroll is a document on the opening view, not a poster', r.scroll.booted && !r.scroll.postered && !r.scroll.posterImg, `booted=${r.scroll.booted} onScreen=${r.scroll.onScreen} ${r.scroll.widthPx}px wide at ${r.zoom}`);
  check('the wizard is swinging', r.wizard && r.wizard.moved && r.wizard.play === 'running' && !r.wizard.paused, JSON.stringify(r.wizard));
  check('the builder is drawn in full, hammer going', r.builder.live && r.builder.full && r.builder.moved, JSON.stringify(r.builder));
  check('the scroll is the only document under the boot line', r.docs.includes('scroll-sticker') && r.leaked.length === 0, 'documents: ' + r.docs.join(', ') + (r.leaked.length ? ' — under the line without the word: ' + r.leaked.join(', ') : ''));
  check('no page errors', errors.length === 0, errors.join(' | ').slice(0, 200));
  await page.screenshot({ path: path.join(OUT, 'live-default.png') });
  const fails = results.filter(x => !x.ok).length;
  console.log(`\n${results.length - fails}/${results.length} passed`);
  await browser.close();
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
