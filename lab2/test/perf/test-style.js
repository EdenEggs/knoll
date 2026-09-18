/* ─── TEST-STYLE ──────────────────────────────────────────────────────────
   perf/test-style.js — the golden test for press/style.js (plan §7 step 7;
   CONTRACTS §4 and §9). Headless system Chrome opens
   press/tools/style-harness.html on the sandbox server (4322, never 4321),
   and for each of the three fixtures this reads manifest.json, loads the
   PNGs from disk as data URLs sorted by role (screenshot → screenshots;
   keyart and hero → keyart; logo → logos; misc ignored — the harness page
   fetches nothing), calls window.runStyle, and asserts what
   fixtures/<name>/expected.json says: pixelfort a 4-px grid ranking
   `pixel`; mosslight no outline, high texture, `painterly` or `cozy-soft`;
   neonrun a dark plate with thin outlines ranking `neon`. Every bound it
   holds a number to is the one Phase 3 wrote back into expected.json in
   place of the plan's words ('high', 'thin'), with `_measured` beside it.

   THE GOLDEN. {fixture, stats, vector, rank, hints} is serialised with
   every key sorted, two-space indent, and written to
   fixtures/<name>/stats.json. The whole run happens TWICE, in two browser
   contexts, and the two serialisations must be byte-identical — that is
   the plan's "golden files stable across runs". If a stats.json already
   stands and differs from the fresh bytes, the test FAILS and names the
   paths that moved (a stat drifted, or a rule changed and the golden was
   not re-blessed); `--update` re-blesses. A fresh folder is written
   without complaint.

   TWO ADVERSARIAL PLATES that no fixture covers, drawn on a canvas in the
   page and fed through the same data-URL road: a flat single-colour
   640 × 360 (#6a8f4a) must read pixelSize 0, no outline, hfEnergy 0 and
   edgeDensity 0 — the plan's floor alone would call it a grid of every
   size, since its error is 0 at every s; and a smooth linear gradient
   (#102030 → #f0e0c0 across 640 px) must read pixelSize 0 — its error
   curve sits under the 2 % floor everywhere. Both are given twice so the
   two-screenshot vote is exercised; the flat plate is also given once, so
   the one-screenshot path is. A third check shrinks pixelfort's first shot
   ×2 nearest-neighbour in the page (a 2-px grid) and expects 2 — the one
   size whose lower neighbour is the identity, which the depth rule treats
   specially.

   Every stat table, every ranking with its scores, every per-picture
   number (inspect's) and every check land in perf/results/style/
   summary.json; the three stat tables and the rankings are printed. No
   request may leave for /_lab2/ (the harness has no keep.js; the route is
   blocked and counted anyway), and no page or console error is allowed.

       node lab2/test/perf/test-style.js [--update]      (from site/, 4322 up)

   Exit 1 on any FAIL. Headless is fine: nothing here is a perf number
   (NOTES §D.9). Playwright 1.61 resolves from Desktop/node_modules when
   run from site/. ────────────────────────────────────────────────────── */
'use strict';
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const TEST = path.resolve(__dirname, '..');
const FIXTURES = path.join(TEST, 'press', 'fixtures');
const RESULTS = path.join(__dirname, 'results', 'style');
const URL = 'http://localhost:4322/lab2/test/press/tools/style-harness.html';
const NAMES = ['pixelfort', 'mosslight', 'neonrun'];
const PRESET_IDS = ['pixel', 'flat', 'outline-cartoon', 'cel', 'painterly', 'ink-sketch', 'neon', 'retro-print', 'grunge', 'cozy-soft'];
const SHADINGS = ['flat', 'cel', 'dither', 'painterly', 'hatch', 'soft', 'halftone'];
const TEXTURES = ['none', 'paper', 'canvas', 'grunge', 'scanlines'];
const FINISHES = ['none', 'shadow', 'diecut', 'glow'];
const UPDATE = process.argv.includes('--update');
const HF_ZERO = 1e-4;                   // "hfEnergy ≈ 0" for the flat plate: four decimals are kept, so this is one unit of the last place

const checks = [];
let fails = 0;
const check = (name, ok, info) => { ok = !!ok; checks.push({ name, ok, info: info == null ? undefined : String(info) }); if (!ok) fails++; console.log((ok ? 'PASS ' : 'FAIL ') + name + (info != null ? ' — ' + info : '')); };

/* JSON with every key sorted at every depth, two-space indent, trailing newline — the golden's bytes */
function stable(v) {
  const sort = x => Array.isArray(x) ? x.map(sort) : (x && typeof x === 'object') ? Object.fromEntries(Object.keys(x).sort().map(k => [k, sort(x[k])])) : x;
  return JSON.stringify(sort(v), null, 2) + '\n';
}
/* the paths at which two parsed goldens differ */
function diffPaths(a, b, at, out) {
  at = at || ''; out = out || [];
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) diffPaths(a[k], b[k], at + '/' + k, out);
  } else if (a !== b) out.push(at + ': ' + JSON.stringify(a) + ' → ' + JSON.stringify(b));
  return out;
}

function inputOf(dir) {
  const m = JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8'));
  const url = f => 'data:image/png;base64,' + fs.readFileSync(path.join(dir, f)).toString('base64');
  const g = { screenshots: [], keyart: [], logos: [], ids: { screenshots: [], keyart: [], logos: [] } };
  for (const a of m.assets) {
    const role = a.role === 'screenshot' ? 'screenshots' : (a.role === 'keyart' || a.role === 'hero') ? 'keyart' : a.role === 'logo' ? 'logos' : null;
    if (!role) continue;
    g[role].push(url(a.file)); g.ids[role].push(a.id);
  }
  return g;
}

/* one bound from expected.json against a measured number: a number is equality; {min, max} is a range */
function holds(exp, got) {
  if (exp && typeof exp === 'object') return (exp.min === undefined || got >= exp.min) && (exp.max === undefined || got <= exp.max);
  return exp === got;
}
const f4 = v => typeof v === 'number' ? v.toFixed(4) : String(v);

function assertShape(tag, r) {
  const s = r.stats, v = r.vector;
  check(tag + ': stats has exactly CONTRACTS §4\'s seven keys', Object.keys(s).sort().join() === 'contrast,edgeDensity,hfEnergy,outline,paletteCount,pixelSize,saturation', Object.keys(s).join());
  // hfEnergy is the one stat with no ceiling, and until 2026-09-07 this line
  // said it had one. It is a mean absolute Laplacian DIVIDED BY contrast, so a
  // grained low-contrast plate drives the denominator to nothing and the ratio
  // past 1: perf/attack-style.js's `grain` plate (±4/255 on mid-grey) measures
  // hfEnergy 5.362 against contrast 0.0076, and analysis.schema.json asks only
  // for "number". Asserting 0–1 for it would have failed a heavily grained game
  // for a rule nobody wrote — the TEST was wrong, not style.js (OPEN.md §2, and
  // attack-style.js has printed the WARN since Phase 3). The other three —
  // saturation, contrast, edgeDensity — are shares and means of shares, and
  // stay bounded.
  check(tag + ': stats types — pixelSize int 0–16, outline {present bool, weight 0–1}, paletteCount int, saturation/contrast/edgeDensity 0–1, hfEnergy a finite number ≥ 0',
    Number.isInteger(s.pixelSize) && s.pixelSize >= 0 && s.pixelSize <= 16 && typeof s.outline.present === 'boolean' && s.outline.weight >= 0 && s.outline.weight <= 1 &&
    Number.isInteger(s.paletteCount) && s.paletteCount >= 0 && [s.saturation, s.contrast, s.edgeDensity].every(x => typeof x === 'number' && x >= 0 && x <= 1) &&
    typeof s.hfEnergy === 'number' && Number.isFinite(s.hfEnergy) && s.hfEnergy >= 0,
    JSON.stringify(s));
  check(tag + ': vector has Appendix B\'s eleven fields with valid values',
    Object.keys(v).sort().join() === 'corners,finish,linePasses,lineShow,lineWeight,lineWobble,paletteSize,pixel,saturation,shading,texture' &&
    typeof v.lineShow === 'boolean' && v.lineWeight >= 0 && v.lineWeight <= 1 && v.lineWobble >= 0 && v.lineWobble <= 1 && [1, 2, 3].includes(v.linePasses) &&
    v.corners >= 0 && v.corners <= 1 && SHADINGS.includes(v.shading) && TEXTURES.includes(v.texture) && [0, 4, 8, 16].includes(v.paletteSize) &&
    Number.isInteger(v.pixel) && v.pixel >= 0 && v.pixel <= 16 && v.saturation >= 0 && v.saturation <= 1 && FINISHES.includes(v.finish), JSON.stringify(v));
  check(tag + ': rank is three distinct presets, scores ascending', Array.isArray(r.rank) && r.rank.length === 3 && r.rank.every(e => PRESET_IDS.includes(e.preset) && typeof e.score === 'number') &&
    new Set(r.rank.map(e => e.preset)).size === 3 && r.rank[0].score <= r.rank[1].score && r.rank[1].score <= r.rank[2].score, r.rank.map(e => e.preset + ' ' + e.score).join(', '));
  check(tag + ': vector.pixel is stats.pixelSize and lineShow is outline.present', v.pixel === s.pixelSize && v.lineShow === s.outline.present);
}

(async () => {
  fs.mkdirSync(RESULTS, { recursive: true });
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const summary = { date: new Date().toISOString(), url: URL, passes: [], fixtures: {}, adversarial: {}, checks };
  const goldens = [{}, {}];
  try {
    const inputs = Object.fromEntries(NAMES.map(n => [n, inputOf(path.join(FIXTURES, n))]));
    for (let pass = 0; pass < 2; pass++) {
      const ctx = await browser.newContext();
      const page = await ctx.newPage();
      const errors = [], doors = [], requests = [];
      page.on('pageerror', e => errors.push(String(e)));
      page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
      page.on('request', rq => { if (!rq.url().startsWith('data:')) requests.push(rq.url()); });
      await page.route('**/_lab2/**', rt => { doors.push(rt.request().url()); rt.fulfill({ status: 404, body: 'no' }); });
      await page.goto(URL, { waitUntil: 'load' });
      await page.waitForFunction(() => window.runStyle && window.Style && window.Palette && window.Theme);
      const tagP = 'pass ' + (pass + 1);

      for (const n of NAMES) {
        const exp = JSON.parse(fs.readFileSync(path.join(FIXTURES, n, 'expected.json'), 'utf8'));
        const t0 = Date.now();
        const r = await page.evaluate(i => window.runStyle(i), inputs[n]);
        const ms = Date.now() - t0;
        const tag = tagP + ' ' + n;
        const s = r.stats, es = exp.stats || {};
        assertShape(tag, r);
        if (es.pixelSize !== undefined) check(tag + ': pixelSize ' + JSON.stringify(es.pixelSize), holds(es.pixelSize, s.pixelSize), 'measured ' + s.pixelSize + ' (per shot ' + r.game.sizes.join('/') + ')');
        if (es.outline && es.outline.present !== undefined) check(tag + ': outline.present ' + es.outline.present, s.outline.present === es.outline.present, 'dark share ' + r.game.darkShare + ', density ' + r.game.density);
        if (es.outline && es.outline.weight !== undefined) check(tag + ': outline.weight ' + JSON.stringify(es.outline.weight), holds(es.outline.weight, s.outline.weight), 'measured ' + s.outline.weight + ' (median ' + r.game.ink + ' run ' + r.game.run + ' px on a ' + (r.game.darkPlate ? 'dark' : 'light') + ' plate, pooled median luma ' + r.game.plate + ')');
        if (es.paletteCount !== undefined) check(tag + ': paletteCount ' + JSON.stringify(es.paletteCount), holds(es.paletteCount, s.paletteCount), 'measured ' + s.paletteCount + ' (per picture ' + r.game.paletteCounts.join('/') + ')');
        if (es.hfEnergy !== undefined) check(tag + ': hfEnergy ' + JSON.stringify(es.hfEnergy), holds(es.hfEnergy, s.hfEnergy), 'measured ' + f4(s.hfEnergy) + ' (per shot ' + r.pictures.filter(p => p.role === 'screenshot').map(p => f4(p.texture.hfEnergy)).join('/') + ')');
        if (es.saturation !== undefined) check(tag + ': saturation ' + JSON.stringify(es.saturation), holds(es.saturation, s.saturation), 'measured ' + f4(s.saturation) + ' (per picture ' + r.pictures.map(p => f4(p.saturation)).join('/') + ')');
        if (es.dark !== undefined) check(tag + ': dark ' + es.dark + ' (Theme\'s call on the key art)', r.dark === es.dark, 'palette L ' + r.palette.map(e => e.L.toFixed(2) + '@' + e.weight.toFixed(2)).join(' '));
        check(tag + ': rank[0] ∈ ' + JSON.stringify(exp.preset), exp.preset.includes(r.rank[0].preset), r.rank.map(e => e.preset + ' ' + e.score.toFixed(3)).join(', '));
        if (n === 'neonrun') {
          const plates = r.pictures.filter(p => p.role === 'screenshot');
          check(tag + ': dark plate stats consistent — every plate\'s median luma under 0.25, the pooled plate dark, ink read from the bright class, mean plate L under 0.35, contrast over 0.05',
            plates.every(p => p.plate.medianLuma < 0.25) && r.game.darkPlate && r.game.ink === 'brightHalf' && plates.every(p => p.meanL < 0.35) && s.contrast > 0.05,
            'medians ' + plates.map(p => p.plate.medianLuma).join('/') + ', mean L ' + plates.map(p => p.meanL.toFixed(3)).join('/') + ', contrast ' + s.contrast);
        }
        const fp = await page.evaluate(([id, v]) => window.Style.forPreset(id, v), [r.rank[0].preset, r.vector]);
        check(tag + ': forPreset(rank[0]) is the prototype with the measured pixel and saturation', fp.preset === r.rank[0].preset && fp.pixel === r.vector.pixel && fp.saturation === r.vector.saturation && fp.shading === (await page.evaluate(id => window.Style.PRESETS[id].shading, r.rank[0].preset)), JSON.stringify(fp));

        goldens[pass][n] = stable({ fixture: n, stats: r.stats, vector: r.vector, rank: r.rank, hints: { dark: r.dark } });
        if (pass === 0) {
          summary.fixtures[n] = { ms, stats: r.stats, vector: r.vector, rank: r.rank, dark: r.dark, palette: r.palette, game: r.game, ids: inputs[n].ids, pictures: r.pictures.map(p => Object.assign({}, p, { plate: p.plate && Object.assign({}, p.plate, { hist: undefined }) })) };
        } else summary.fixtures[n].msPass2 = ms;
      }

      // adversarial plates, drawn in the page
      const adv = await page.evaluate(async () => {
        const c = document.createElement('canvas'); c.width = 640; c.height = 360;
        const x = c.getContext('2d');
        x.fillStyle = '#6a8f4a'; x.fillRect(0, 0, 640, 360);
        const flat = c.toDataURL('image/png');
        const g = x.createLinearGradient(0, 0, 640, 0); g.addColorStop(0, '#102030'); g.addColorStop(1, '#f0e0c0');
        x.fillStyle = g; x.fillRect(0, 0, 640, 360);
        const grad = c.toDataURL('image/png');
        const strip = r => ({ stats: r.stats, vector: r.vector, rank: r.rank, game: r.game, pixel: r.pictures[0].pixel, texture: r.pictures[0].texture, edges: r.pictures[0].edges });
        return { flat: strip(await window.runStyle({ screenshots: [flat, flat] })), flat1: strip(await window.runStyle({ screenshots: [flat] })), grad: strip(await window.runStyle({ screenshots: [grad, grad] })) };
      });
      check(tagP + ' flat plate (two shots): pixelSize 0', adv.flat.stats.pixelSize === 0, 'errors ' + adv.flat.pixel.errors.join('/'));
      check(tagP + ' flat plate: outline.present false, weight 0', adv.flat.stats.outline.present === false && adv.flat.stats.outline.weight === 0, JSON.stringify(adv.flat.stats.outline) + ' strong edges ' + adv.flat.edges.strong);
      check(tagP + ' flat plate: hfEnergy ≈ 0 (≤ ' + HF_ZERO + ') and edgeDensity 0', adv.flat.stats.hfEnergy <= HF_ZERO && adv.flat.stats.edgeDensity === 0, 'hfEnergy ' + adv.flat.stats.hfEnergy + ', contrast ' + adv.flat.stats.contrast + ', paletteCount ' + adv.flat.stats.paletteCount);
      check(tagP + ' flat plate (one shot): the same stats', JSON.stringify(adv.flat1.stats) === JSON.stringify(adv.flat.stats), JSON.stringify(adv.flat1.stats));
      check(tagP + ' gradient: pixelSize 0', adv.grad.stats.pixelSize === 0, 'errors ' + adv.grad.pixel.errors.join('/') + ' — all under 0.02, no deep minimum');
      check(tagP + ' gradient: no outline', adv.grad.stats.outline.present === false, 'dark share ' + adv.grad.game.darkShare + ', density ' + adv.grad.game.density);
      summary.adversarial['pass' + (pass + 1)] = adv;

      // a 2-px grid: pixelfort's first shot shrunk ×2 nearest-neighbour in the page
      const two = await page.evaluate(async (url) => {
        const img = new Image(); img.src = url; await img.decode();
        const c = document.createElement('canvas'); c.width = img.naturalWidth / 2; c.height = img.naturalHeight / 2;
        const x = c.getContext('2d'); x.imageSmoothingEnabled = false; x.drawImage(img, 0, 0, c.width, c.height);
        const r = await window.runStyle({ screenshots: [c.toDataURL('image/png')] });
        return { w: c.width, h: c.height, stats: r.stats, pixel: r.pictures[0].pixel };
      }, inputs.pixelfort.screenshots[0]);
      check(tagP + ' pixelfort shot-1 shrunk ×2 (' + two.w + ' × ' + two.h + '): pixelSize 2 — the s = 2 branch, whose lower neighbour is the identity', two.stats.pixelSize === 2, 'errors ' + two.pixel.errors.slice(0, 6).join('/'));
      summary.adversarial['twoPx' + (pass + 1)] = two;

      check(tagP + ': no page or console errors', errors.length === 0, errors.join(' | '));
      check(tagP + ': nothing asked for /_lab2/', doors.length === 0, doors.join(' '));
      check(tagP + ': the page fetched only itself and its four scripts', requests.every(u => /\/lab2\/test\/press\/(tools\/style-harness\.html|palette\.js|fonts\.js|theme\.js|style\.js)$/.test(u)), requests.join(' '));
      summary.passes.push({ pass: pass + 1, errors, doors, requests });
      await ctx.close();
    }

    // the goldens: two passes byte-identical, then against the file on disk
    for (const n of NAMES) {
      const a = goldens[0][n], b = goldens[1][n];
      check(n + ': the two passes\' goldens are byte-identical', a === b, a === b ? a.length + ' bytes' : diffPaths(JSON.parse(a), JSON.parse(b)).join('; '));
      const file = path.join(FIXTURES, n, 'stats.json');
      if (fs.existsSync(file)) {
        const old = fs.readFileSync(file, 'utf8');
        if (old === a) check(n + ': stats.json on disk is unchanged', true, file);
        else {
          const moved = diffPaths(JSON.parse(old), JSON.parse(a));
          if (UPDATE) { fs.writeFileSync(file, a); check(n + ': stats.json re-blessed (--update)', true, moved.join('; ')); }
          else check(n + ': stats.json on disk matches (run with --update to re-bless)', false, moved.join('; '));
        }
      } else { fs.writeFileSync(file, a); check(n + ': stats.json written (no golden stood)', true, file); }
    }
  } catch (e) {
    check('the run completed', false, e.stack || e.message);
  }
  await browser.close();

  // the three stat tables and the rankings
  const rows = ['pixelSize', 'outline.present', 'outline.weight', 'paletteCount', 'saturation', 'contrast', 'hfEnergy', 'edgeDensity'];
  const get = (s, k) => k.split('.').reduce((o, p) => o == null ? o : o[p], s);
  const names = Object.keys(summary.fixtures);
  if (names.length) {
    console.log('\n  stat             ' + names.map(n => n.padStart(11)).join(''));
    for (const k of rows) console.log('  ' + k.padEnd(17) + names.map(n => String(get(summary.fixtures[n].stats, k)).padStart(11)).join(''));
    console.log('  dark (Theme)     ' + names.map(n => String(summary.fixtures[n].dark).padStart(11)).join(''));
    console.log('\n  vector');
    for (const k of ['lineShow', 'lineWeight', 'lineWobble', 'corners', 'shading', 'texture', 'paletteSize', 'pixel', 'saturation', 'finish']) console.log('  ' + k.padEnd(17) + names.map(n => String(summary.fixtures[n].vector[k]).padStart(11)).join(''));
    console.log('\n  rank');
    for (const n of names) console.log('  ' + n.padEnd(11) + summary.fixtures[n].rank.map(e => e.preset + ' ' + e.score.toFixed(3)).join('  ·  ') + '   (' + summary.fixtures[n].ms + ' ms)');
  }
  summary.fails = fails; summary.total = checks.length;
  fs.writeFileSync(path.join(RESULTS, 'summary.json'), JSON.stringify(summary, null, 2));
  console.log('\n' + (checks.length - fails) + '/' + checks.length + ' PASS — ' + path.join(RESULTS, 'summary.json'));
  process.exit(fails ? 1 : 0);
})();
