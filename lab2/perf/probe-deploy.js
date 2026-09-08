/* lab2/perf/probe-deploy.js — what the DEPLOYED bench does when a tool is
   pressed, as against what it does here. Written 2026-09-08, when the sticker
   drawer looked missing on knoll.space and was not: a cached index.html was
   serving the new dock (wall.js, lab.css) with no <script> tag for
   stickers.js, so window.Stickers was undefined and the guarded call did
   nothing. It reports the globals, every failed request, and the panel's
   computed geometry — enough to tell "not deployed" from "deployed and
   broken" from "your browser has an old page".
   USAGE (from site/): node lab2/perf/probe-deploy.js [url] [tool] */
const path = require('path');
const { chromium } = require('playwright');
const URL = process.argv[2] || 'https://www.knoll.space/lab2/';
const TOOL = process.argv[3] || 'sticker';
const PANEL = TOOL === 'sticker' ? 'stickers' : 'tracer';
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: false, args: ['--window-size=1616,1110', '--window-position=0,0'] });
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [], bad = [];
  page.on('pageerror', e => errs.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text().slice(0, 160)); });
  /* ERR_ABORTED is what an in-flight fetch reports when the browser closes
     under it — the kit sheets are still loading at that point and always
     said 'failed' here while serving 200 perfectly well. Noise that looks
     like a finding is worse than no finding. */
  page.on('requestfailed', r => { const e = (r.failure() || {}).errorText || '';
    if (!/ERR_ABORTED/.test(e)) bad.push('failed ' + r.url().slice(-58) + ' — ' + e); });
  page.on('response', r => { if (r.status() >= 400) bad.push(r.status() + ' ' + r.url().slice(-58)); });
  console.log(URL, '·', TOOL);
  await page.goto(URL, { waitUntil: 'load' });
  await page.waitForTimeout(4000);
  console.log('globals   ', JSON.stringify(await page.evaluate(() => ({
    Lab: typeof window.Lab, Wall: typeof window.Wall,
    Tracer: typeof window.Tracer, Stickers: typeof window.Stickers,
    // the tell: the tag is in the NEW index.html only, so a stale page has
    // the new dock (wall.js) and no drawer
    stickersTag: !!document.querySelector('script[src="stickers.js"]')
  }))));
  console.log('pressed   ', JSON.stringify(await page.evaluate(([tool, id]) => {
    const btn = document.querySelector('#tool-dock [data-tool="' + tool + '"]');
    if (!btn) return { err: 'no ' + tool + ' button on the dock' };
    btn.click();
    const say = document.querySelector('.opt-say');
    const el = document.getElementById(id);
    if (!el) return { tool: Wall.tool, panel: null, say: say && say.textContent };
    const r = el.getBoundingClientRect(), cs = getComputedStyle(el);
    return { tool: Wall.tool, hidden: el.hidden, parent: el.parentElement.tagName,
             pos: cs.position, display: cs.display, visibility: cs.visibility,
             box: [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)],
             say: say && say.textContent };
  }, [TOOL, PANEL])));
  // /_lab2/default is serve.js's autosave door and does not exist off localhost
  const noise = bad.filter(s => !/_lab2\/default/.test(s));
  if (errs.length) console.log('errors    ', errs.slice(0, 6));
  if (noise.length) console.log('bad reqs  ', noise.slice(0, 8));
  const shot = path.join(__dirname, 'results', 'deploy-' + TOOL + '.png');
  await page.screenshot({ path: shot });
  console.log('shot      ', shot);
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
