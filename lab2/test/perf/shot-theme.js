/* ─── SHOT-THEME ──────────────────────────────────────────────────────────
   The acceptance picture for plan §6 (Phase 2): "a theme for each fixture
   renders the main bench convincingly when pasted into :root by hand
   (screenshot in perf/results/theme-<fixture>/)". This does the pasting:
   for each fixture the theme is derived in Node through
   press/tools/lib/fixture-theme.js — the SAME pipeline tools/test-theme.js
   asserts on, so the picture is of the tokens the test passed — and its
   css string is added to the sandbox bench as a <style> after lab.css
   (page.addStyleTag appends to <head>, so it is the later rule of equal
   specificity and every var() on the page re-resolves), the bench is given
   800 ms to settle (the boot queue is quiet by 2 s on the live bench,
   NOTES §E.2; the tokens repaint in one frame, and 800 ms lets the
   forest's sprites re-bake), and the viewport is written to
   perf/results/theme-<fixture>/bench.png beside theme.css and a
   summary.json of the tokens.

       node lab2/test/perf/shot-theme.js          (from site/, 4322 up)

   Headed system Chrome at 1600 × 1000, DPR 1 — the folder's launch line
   (verify-tracer.js), so the picture is the one the owner sees. The door
   is blocked wide (page.route '**\/_lab2/**' → 404) as every sandbox
   harness blocks it: keep.js knocks once, hears 404, and never posts. A
   fresh context per fixture so no theme sits on top of another. Nothing
   in the bench's files is touched; the style lives in the page and dies
   with it. The looking is done by a person (or the orchestrator's Read)
   after: this script only measures that the tokens landed — it reads
   getComputedStyle(:root)'s --paper, --ink and --pink back and checks they
   are the theme's. The one console line the block itself makes — Chrome's
   "Failed to load resource … 404" for the door — is not an error of the
   page's and is set aside the way smoke-bench.js and verify-keep.js set it
   aside; every other console error, and every page error, counts. */
'use strict';
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');
const fx = require('../press/tools/lib/fixture-theme');

const FIXTURES = path.join(__dirname, '..', 'press', 'fixtures');
const RESULTS = path.join(__dirname, 'results');
const NAMES = ['pixelfort', 'mosslight', 'neonrun'];
const URL = 'http://localhost:4322/lab2/test/';
const SETTLE_MS = 800;

const results = [];
let fails = 0;
const check = (name, ok, info) => { ok = !!ok; results.push({ name, ok, info }); if (!ok) fails++; console.log((ok ? 'PASS ' : 'FAIL ') + name + (info != null ? ' — ' + info : '')); };

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: false, args: ['--window-size=1616,1110', '--window-position=0,0'] });
  try {
    for (const n of NAMES) {
      const exp = JSON.parse(fs.readFileSync(path.join(FIXTURES, n, 'expected.json'), 'utf8'));
      const r = fx.themeOf(path.join(FIXTURES, n), { fonts: exp.pairing });
      const out = path.join(RESULTS, 'theme-' + n);
      fs.mkdirSync(out, { recursive: true });
      fs.writeFileSync(path.join(out, 'theme.css'), r.theme.css + '\n');
      const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });
      const page = await ctx.newPage();
      const errors = [], doors = [];
      page.on('pageerror', e => errors.push(String(e)));
      page.on('console', m => {
        if (m.type() !== 'error') return;
        const loc = (m.location() && m.location().url) || '';
        if (/Failed to load resource/.test(m.text()) && /\/_lab2\//.test(loc)) return;   // the block below, working
        errors.push(m.text() + (loc ? ' @ ' + loc : ''));
      });
      await page.route('**/_lab2/**', rt => { doors.push(rt.request().url()); rt.fulfill({ status: 404, body: 'no' }); });
      await page.goto(URL, { waitUntil: 'load' });
      await page.waitForFunction(() => window.Lab && window.Frames && window.Wall);
      await page.waitForTimeout(1500);
      const before = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--paper').trim());
      await page.addStyleTag({ content: r.theme.css });
      await page.waitForTimeout(SETTLE_MS);
      const got = await page.evaluate(() => { const s = getComputedStyle(document.documentElement); return ['--paper', '--ink', '--pink', '--bench-bg', '--sk-primary', '--display'].map(k => [k, s.getPropertyValue(k).trim()]); });
      const want = r.theme.tokens;
      const landed = got.every(([k, v]) => v === want[k]);
      check(n + ': the theme\'s tokens landed on :root (was ' + before + ')', landed, got.map(([k, v]) => k + ' ' + v).join(' '));
      await page.screenshot({ path: path.join(out, 'bench.png') });
      check(n + ': bench.png written', fs.existsSync(path.join(out, 'bench.png')), path.join(out, 'bench.png'));
      check(n + ': no page or console errors', errors.length === 0, errors.join(' | '));
      check(n + ': the door was knocked on at most once and never posted', doors.length <= 1 && doors.every(u => /\/_lab2\/test\/default$/.test(u)), doors.join(' '));
      fs.writeFileSync(path.join(out, 'summary.json'), JSON.stringify({ date: new Date().toISOString(), fixture: n, asset: r.asset.file, palette: r.palette, saturation: r.saturation, dark: r.theme.dark, fonts: r.theme.fonts, tokens: r.theme.tokens, why: fx.modules().Theme.explain(r.theme), computed: Object.fromEntries(got), errors, doors }, null, 2));
      await ctx.close();
    }
  } catch (e) {
    check('the run completed', false, e.stack || e.message);
  }
  await browser.close();
  fs.writeFileSync(path.join(RESULTS, 'theme-shots.json'), JSON.stringify({ date: new Date().toISOString(), results }, null, 2));
  console.log('\n' + (results.length - fails) + '/' + results.length + ' checks pass' + (fails ? ', ' + fails + ' FAIL' : ''));
  process.exit(fails ? 1 : 0);
})();
