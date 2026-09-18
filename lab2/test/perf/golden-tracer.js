/* lab2/test/perf/golden-tracer.js — did moving the quantiser change a tracing?
   USAGE (from site/, the live serve.js up on 4321 AND the sandbox's on 4322):
       node lab2/test/perf/golden-tracer.js

   Phase 1 of the Press Table (../../PRESS-TABLE-PLAN.md §5) lifted the
   tracing table's sampler and k-means out of tracer.js into press/palette.js
   and had the table call them there. The plan's acceptance is a golden
   diff: trace each fixture's key art before and after, and the path counts
   and colours are identical. So this opens the LIVE bench (lab2/, the old
   tracer, on the owner's 4321) and the SANDBOX bench (lab2/test/, the new
   one, on 4322), lays the same three pictures on each table, files each
   tracing, and compares what was filed: colors, paths, the set of fill
   colours in the path data, and the path data itself, to the byte.

   THE RANDOM NUMBERS. The k-means seeds with Math.random() — once for the
   first centroid, once per centroid after (press/NOTES.md §D.1) — so two
   traces of one picture differ by chance even on one bench. Both pages get
   a page.addInitScript that replaces Math.random with a seeded mulberry32
   (the same generator press/palette.js's Palette.rng is) and exposes
   window.__reseed(seed): it is called through page.evaluate immediately
   before the file is set on #tr-file, so both pipelines draw the same
   numbers from the same seed, and what is left to differ is the code.

   THE QUANTISER HAS THE STREAM TO ITSELF. The stub charges every draw to
   the file that made it (it reads its own stack; its own frames are
   anonymous, so the first frame naming a .js file is the caller) and
   serves the seeded sequence ONLY to the quantiser — tracer.js on the live
   bench, press/palette.js on the sandbox — while every other caller draws
   from a second stream. This was learned, not designed: the first run of
   this harness, with one stream for all, counted 70 draws on the live
   bench against the sandbox's 6 for mosslight and the tracings were still
   byte-identical (the 64 strays came after the k-means); the second run
   counted 70 again for mosslight AND neonrun and both tracings differed
   (257 paths to 209, 126 to 139 — the strays came first that time). So
   something on the bigger live page draws sixty-four numbers at a moment
   of its own choosing a few seconds after boot, and a shared stream made
   the golden diff a coin toss. window.__rngCalls() reports the draws since
   the reseed by file; the quantiser's must be 6 on both sides, one plus
   five for the dial's six colours, and the summary keeps every file's
   count beside it so the stray caller is named.

   Fresh context per page — no library from the last trace (the fixture is
   filed into localStorage; a full library would refuse the filing), no
   saved camera. The door is blocked wide on both benches
   (page.route('**\/_lab2/**') → 404), as every sandbox harness does: on 4321
   that door writes the owner's live index.html.

   The rest is verify-tracer.js's own choreography and numbers: headed
   system Chrome at 1600 × 1000 (the viewport every bench measurement was
   taken at), 1.5 s after the four globals appear for the sheets to settle,
   the camera put at 0.6 over the table, Wall.setTool('image'), 0.8 s for
   the table to build, then the file, then #tr-save enabled = traced. The
   wait for the trace is 60 s: a 1600 × 900 hero at the table's 640-px grid
   with six colours traces in a few seconds; the margin is for a cold
   Chrome, not the trace. SEED 0x5EED plus the fixture's index — any number
   would do, the same one on both sides is the point.

   Results: perf/results/golden-tracer/summary.json — per fixture, per side:
   colors, paths, the sorted fills, d's length and sha256, the draw count,
   the trace time; and per fixture whether colors, paths, fills and d were
   identical. Exit 1 on any difference or any page error. */
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { chromium } = require('playwright');

const FIX = path.resolve(__dirname, '..', 'press', 'fixtures');
const OUT = path.join(__dirname, 'results', 'golden-tracer');
const BENCH = { live: 'http://localhost:4321/lab2/', sandbox: 'http://localhost:4322/lab2/test/' };
const FIXTURES = [
  { name: 'pixelfort', file: 'pixelfort/art/keyart-portrait.png' },
  { name: 'mosslight', file: 'mosslight/art/hero.png' },
  { name: 'neonrun', file: 'neonrun/art/hero.png' },
];
const SEED = 0x5EED;
const sha = s => crypto.createHash('sha256').update(s).digest('hex');
const fills = d => Array.from(new Set(Array.from(d.matchAll(/fill="(#[0-9a-f]{6})"/g), m => m[1]))).sort();

// the seeded stand-in for Math.random, installed before any page script runs.
// Every draw is charged to the file that made it — the stub reads its own
// stack and takes the first frame that names a .js file, since its own
// frames are anonymous — and the QUANTISER's draws come from the seeded
// stream while everyone else's come from a second one, so nothing else on
// either bench can shift the sequence the k-means sees
function seededRandom(quantiser) {
  const mk = seed => { let a = seed >>> 0; return () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; };
  let ours = mk(1), theirs = mk(2), byFile = {};
  const whose = () => {
    for (const line of (new Error().stack || '').split('\n')) {
      const m = /\/([^\/\s:)]+\.js):\d+:\d+/.exec(line);
      if (m) return m[1];
    }
    return '?';
  };
  window.__reseed = seed => { ours = mk(seed); theirs = mk(seed ^ 0x9e3779b9); byFile = {}; };
  window.__rngCalls = () => byFile;
  Math.random = () => { const f = whose(); byFile[f] = (byFile[f] || 0) + 1; return f === quantiser ? ours() : theirs(); };
}
const QUANTISER = { live: 'tracer.js', sandbox: 'palette.js' };   // the file the k-means draws from, on each bench

async function trace(browser, which, fixture, seed) {
  const url = BENCH[which];
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await ctx.addInitScript(seededRandom, QUANTISER[which]);
  await page.route('**/_lab2/**', r => r.fulfill({ status: 404, body: 'no' }));
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForFunction(() => window.Lab && window.Frames && window.Wall && window.Tracer);
  await page.waitForTimeout(1500);
  await page.evaluate(() => { const b = Lab.bench.getBoundingClientRect(); Lab.camTo(0.6, b.width / 2 - 2300 * 0.6, b.height / 2 - 600 * 0.6, 0); });
  await page.waitForTimeout(800);
  await page.evaluate(() => Wall.setTool('image'));
  await page.waitForTimeout(800);
  const dials = await page.evaluate(() => ({ colors: +document.getElementById('tr-colors').value, smooth: +document.getElementById('tr-smooth').value }));
  await page.evaluate(s => window.__reseed(s), seed);
  const t0 = Date.now();
  await page.setInputFiles('#tr-file', { name: path.basename(fixture.file), mimeType: 'image/png', buffer: fs.readFileSync(path.join(FIX, fixture.file)) });
  await page.waitForFunction(() => !document.getElementById('tr-save').disabled, null, { timeout: 60000 });
  const ms = Date.now() - t0;
  const draws = await page.evaluate(() => window.__rngCalls());
  await page.click('#tr-save');
  await page.waitForTimeout(400);
  const filed = await page.evaluate(() => { const f = Tracer.store.get().list.slice(-1)[0]; return f ? { colors: f.colors, paths: f.paths, d: f.d, w: f.w, h: f.h } : null; });
  await ctx.close();
  if (!filed) throw new Error(url + ' ' + fixture.name + ': nothing was filed');
  const rngCalls = draws[QUANTISER[which]] || 0;
  return { colors: filed.colors, paths: filed.paths, w: filed.w, h: filed.h, fills: fills(filed.d), dLength: filed.d.length, dSha: sha(filed.d), rngCalls, draws, ms, dials, errors, d: filed.d };
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ channel: 'chrome', headless: false, args: ['--window-size=1616,1110', '--window-position=0,0'] });
  const summary = { at: new Date().toISOString(), seed: SEED, benches: BENCH, fixtures: {} };
  let bad = 0;
  for (let i = 0; i < FIXTURES.length; i++) {
    const f = FIXTURES[i], seed = SEED + i;
    // a pair of SVGs is written only when d differs; a green run must not leave a red run's pair behind
    for (const side of ['live', 'sandbox']) fs.rmSync(path.join(OUT, `${f.name}-${side}.svg`), { force: true });
    const live = await trace(browser, 'live', f, seed);
    const sandbox = await trace(browser, 'sandbox', f, seed);
    const same = {
      colors: live.colors === sandbox.colors,
      paths: live.paths === sandbox.paths,
      fills: JSON.stringify(live.fills) === JSON.stringify(sandbox.fills),
      d: live.d === sandbox.d,
      rngCalls: live.rngCalls === sandbox.rngCalls,
    };
    const errors = live.errors.concat(sandbox.errors);
    const ok = same.colors && same.paths && same.fills && same.d && same.rngCalls && !errors.length;
    if (!ok) bad++;
    const strip = r => { const o = Object.assign({}, r); delete o.d; return o; };
    summary.fixtures[f.name] = { file: f.file, seed, live: strip(live), sandbox: strip(sandbox), identical: same, ok };
    console.log((ok ? 'PASS ' : 'FAIL ') + f.name + ` — colors ${live.colors}/${sandbox.colors}, paths ${live.paths}/${sandbox.paths}, fills ${live.fills.length}/${sandbox.fills.length}, d ${live.dLength}/${sandbox.dLength} bytes ${same.d ? 'byte-identical' : 'DIFFER'}, quantiser draws ${live.rngCalls}/${sandbox.rngCalls} (all draws ${JSON.stringify(live.draws)} / ${JSON.stringify(sandbox.draws)}), ${live.ms}/${sandbox.ms} ms` + (errors.length ? ' — errors: ' + errors.join(' | ').slice(0, 200) : ''));
    if (!same.d) {
      fs.writeFileSync(path.join(OUT, f.name + '-live.svg'), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${live.w} ${live.h}">${live.d}</svg>`);
      fs.writeFileSync(path.join(OUT, f.name + '-sandbox.svg'), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${sandbox.w} ${sandbox.h}">${sandbox.d}</svg>`);
    }
  }
  await browser.close();
  summary.ok = bad === 0;
  fs.writeFileSync(path.join(OUT, 'summary.json'), JSON.stringify(summary, null, 2));
  console.log(`\n${FIXTURES.length - bad}/${FIXTURES.length} golden — ${path.relative(process.cwd(), path.join(OUT, 'summary.json'))}`);
  process.exit(bad ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
