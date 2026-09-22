/* ─── TEST-FONTS ───────────────────────────────────────────────────────────
   Refutes press/fonts.js against the folder it describes, then against a
   browser. Two halves:

   NODE, no browser. fonts.js is run in a bare vm context that has a
   `window` and NOTHING else — no document, no fetch, no timers — so a
   module that touched the page would throw at load, and its source is
   also searched (comments stripped) for the word `document`, because a
   touch behind an `if` would not throw. Then: every face every pairing
   names exists in fonts/ and begins with the four bytes 'wOF2' (a woff2's
   magic; a 404 page saved as a font begins with '<'); every @font-face row
   in fonts/fonts.css names a file that exists and begins the same way, and
   every family fonts.css declares is used by some pairing (a row nobody
   wears is a file nobody needs) and every family a pairing names is
   declared (a stack the browser cannot resolve to a file falls to the
   system face and nobody notices); every file fonts.css declares appears
   in some pairing's `faces`, so `faces` is complete; suggest() returns
   three distinct valid ids for every preset × dark × {0.05, 0.3} — either
   side of the 0.12 line, so the nudge is exercised both ways — and for an
   unknown style; stacks() quotes every family name with a space in it
   (a bare `Public Sans` is two families to a browser); preloads() names
   two existing files.

   BROWSER, headless. fonts-check.html served from 4322 (never 4321: that
   is the owner's) is opened with every /_lab2/ door answering 404 and
   every request that leaves localhost:4322 ABORTED and counted — a page
   that reached fonts.googleapis.com would fail here, which is the plan's
   "no network at paint time" made a test. After document.fonts.ready, each
   of the twelve self-hosted families must answer document.fonts.check()
   true, and every @font-face row of the four new families (six rows —
   Fredoka and Orbitron twice, both weights drawn on the page) must be a
   FontFace with status 'loaded': check() alone returns true when NO face
   matches, so it cannot tell a loaded font from a misspelt one. The woff2
   responses are recorded (URL, bytes) and the page is screenshotted to
   perf/results/fonts/pairings.png beside a summary.json (CONTRACTS §11).

       node lab2/test/press/tools/test-fonts.js        (from site/)
       node lab2/test/press/tools/test-fonts.js --node  (skip the browser)

   Exit 1 on any failure.
   ───────────────────────────────────────────────────────────────────────── */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');

const TEST = path.resolve(__dirname, '..', '..');                  // lab2/test
const FONTS = path.join(TEST, 'fonts');
const OUT = path.join(TEST, 'perf', 'results', 'fonts');
const URL = 'http://localhost:4322/lab2/test/press/tools/fonts-check.html';
const IDS = ['clean', 'pixel', 'hand', 'rustic', 'gothic', 'comic', 'cozy', 'scifi', 'typewriter'];   // theme.schema.json's enum
const PRESETS = ['pixel', 'flat', 'outline-cartoon', 'cel', 'painterly', 'ink-sketch', 'neon', 'retro-print', 'grunge', 'cozy-soft'];  // Appendix C
const NEW = ['Bangers', 'Fredoka', 'Orbitron', 'Special Elite'];

let fails = 0;
const results = [];
const check = (name, ok, info) => {
  results.push({ name, ok: !!ok, info: info === undefined ? '' : String(info) });
  if (!ok) fails++;
  console.log((ok ? 'PASS ' : 'FAIL ') + name + (info !== undefined ? ' — ' + info : ''));
};
const isWoff2 = file => { try { const fd = fs.openSync(file, 'r'), b = Buffer.alloc(4); fs.readSync(fd, b, 0, 4, 0); fs.closeSync(fd); return b.toString('latin1') === 'wOF2'; } catch (e) { return false; } };

/* ── the module, in a bare context ─────────────────────────────────────── */
const src = fs.readFileSync(path.join(TEST, 'press', 'fonts.js'), 'utf8');
const sandbox = { window: {} };
let Fonts = null;
try { vm.runInNewContext(src, sandbox, { filename: 'fonts.js' }); Fonts = sandbox.window.Fonts; } catch (e) { check('fonts.js loads with only a window', false, e.message); }
check('fonts.js loads with only a window', !!Fonts);
check('fonts.js is LF', !/\r/.test(src));
const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
check('fonts.js never names document', !/\bdocument\b/.test(code));
if (!Fonts) { finish(); return; }

check('PAIRINGS has exactly the nine ids', JSON.stringify(Object.keys(Fonts.PAIRINGS).sort()) === JSON.stringify(IDS.slice().sort()), Object.keys(Fonts.PAIRINGS).join(','));

/* ── faces exist and are woff2 ─────────────────────────────────────────── */
const named = new Set();
for (const id of IDS) {
  const p = Fonts.PAIRINGS[id];
  check(id + ': has display, body, mono, faces', p && typeof p.display === 'string' && typeof p.body === 'string' && typeof p.mono === 'string' && Array.isArray(p.faces) && p.faces.length > 0);
  for (const f of p.faces) {
    named.add(f);
    const file = path.join(FONTS, f);
    check(id + ': ' + f + ' exists and starts with wOF2', fs.existsSync(file) && isWoff2(file), fs.existsSync(file) ? fs.statSync(file).size + ' B' : 'missing');
  }
}

/* ── fonts.css agrees with the folder and the table ────────────────────── */
const css = fs.readFileSync(path.join(FONTS, 'fonts.css'), 'utf8');
check('fonts.css is LF', !/\r/.test(css));
const rows = [];
const re = /@font-face\{font-family:'([^']+)';font-style:normal;font-weight:(\d+);font-display:swap;src:url\(([^)]+)\) format\('woff2'\);unicode-range:([^}]+)\}/g;
let m; while ((m = re.exec(css))) rows.push({ family: m[1], weight: +m[2], file: m[3], range: m[4] });
check('fonts.css rows parse in the one-line style', rows.length >= 20, rows.length + ' rows');
const latin = rows.length ? rows[0].range : '';
for (const r of rows) {
  const file = path.join(FONTS, r.file);
  check('fonts.css ' + r.family + ' ' + r.weight + ' → ' + r.file + ' exists and is woff2', fs.existsSync(file) && isWoff2(file));
  check('fonts.css ' + r.family + ' ' + r.weight + ' has the latin unicode-range', r.range === latin);
  check('fonts.css ' + r.file + ' is in some pairing\'s faces', named.has(r.file));
}
for (const fam of NEW) check('fonts.css declares ' + fam, rows.some(r => r.family === fam));
check('fonts.css has both Fredoka rows on one file', rows.filter(r => r.family === 'Fredoka').length === 2 && new Set(rows.filter(r => r.family === 'Fredoka').map(r => r.file)).size === 1);
check('fonts.css has both Orbitron rows on one file', rows.filter(r => r.family === 'Orbitron').length === 2 && new Set(rows.filter(r => r.family === 'Orbitron').map(r => r.file)).size === 1);
const declared = new Set(rows.map(r => r.family)), worn = new Set();
for (const id of IDS) for (const role of ['display', 'body', 'mono', 'accent']) if (Fonts.PAIRINGS[id][role]) worn.add(Fonts.PAIRINGS[id][role]);
for (const fam of declared) check('fonts.css family ' + fam + ' is worn by a pairing', worn.has(fam));
for (const fam of worn) if (fam !== 'ui-monospace') check('pairing family ' + fam + ' is declared in fonts.css', declared.has(fam));

/* ── stacks and preloads ────────────────────────────────────────────────── */
const split = s => { const out = []; let cur = '', q = null; for (const ch of s) { if (q) { cur += ch; if (ch === q) q = null; } else if (ch === '"' || ch === "'") { q = ch; cur += ch; } else if (ch === ',') { out.push(cur.trim()); cur = ''; } else cur += ch; } out.push(cur.trim()); return out; };
const GENERICS = ['serif', 'sans-serif', 'monospace', 'cursive', 'fantasy', 'system-ui'];
for (const id of IDS) {
  const s = Fonts.stacks(id), p = Fonts.PAIRINGS[id];
  for (const role of ['display', 'body', 'mono', 'accent']) {
    if (!p[role]) { check(id + ': stacks has no ' + role, !(role in s)); continue; }
    const st = s[role], parts = split(st);
    check(id + ': ' + role + ' stack names ' + p[role] + ' first', parts[0].replace(/^['"]|['"]$/g, '') === p[role], st);
    check(id + ': ' + role + ' stack ends in a generic', GENERICS.indexOf(parts[parts.length - 1]) >= 0, parts[parts.length - 1]);
    check(id + ': ' + role + ' stack quotes names with spaces', parts.every(t => !/\s/.test(t) || /^(['"]).*\1$/.test(t)), st);
  }
  const pre = Fonts.preloads(id);
  check(id + ': preloads two existing files', pre.length === 2 && pre.every(f => named.has(f) && fs.existsSync(path.join(FONTS, f))), pre.join(' + '));
  check(id + ': preloads the body at 400', pre.some(f => /-400\.woff2$/.test(f) && f.replace(/-\d+\.woff2$/, '') === p.body.replace(/ /g, '-')), pre.join(' + '));
}
let threw = false; try { Fonts.stacks('nope'); } catch (e) { threw = e.name === 'RangeError'; }   // by name: the vm realm's RangeError is not this realm's
check('stacks(unknown id) throws a RangeError', threw);

/* ── suggest ───────────────────────────────────────────────────────────── */
const table = {};
for (const style of PRESETS.concat(['no-such-preset', undefined])) {
  for (const dark of [false, true]) for (const sat of [0.05, 0.3]) {
    const three = Fonts.suggest({ style, dark, saturation: sat });
    const ok = Array.isArray(three) && three.length === 3 && new Set(three).size === 3 && three.every(x => IDS.indexOf(x) >= 0);
    check('suggest(' + style + ', dark ' + dark + ', sat ' + sat + ') → three distinct valid ids', ok, three.join('/'));
    table[style + '|' + dark + '|' + sat] = three;
  }
}
check('suggest(): pixel stays first on a dark saturated pixel game', table['pixel|true|0.3'][0] === 'pixel', table['pixel|true|0.3'].join('/'));
check('suggest(): dark + saturated lifts scifi (cel)', table['cel|true|0.3'].indexOf('scifi') === 1 && table['cel|false|0.3'].indexOf('scifi') === 2, table['cel|true|0.3'].join('/'));
check('suggest(): dark alone does not lift scifi (cel, 0.05)', table['cel|true|0.05'].indexOf('scifi') === 2, table['cel|true|0.05'].join('/'));
check('suggest(): light + saturated does not lift scifi (flat)', table['flat|false|0.3'].indexOf('scifi') === 2, table['flat|false|0.3'].join('/'));
check('suggest(): scifi enters third from off the list (painterly, dark, 0.3)', table['painterly|true|0.3'][2] === 'scifi', table['painterly|true|0.3'].join('/'));
check('suggest(): unknown style is flat', table['no-such-preset|false|0.05'].join() === table['flat|false|0.05'].join());
/* A style that is a key of Object.prototype — constructor, __proto__, toString — must fall to flat like any
   other unknown, not hand back a function off the prototype (the adversarial pass found suggest() throwing on
   these, 2026-09-07; RULES is read through hasOwnProperty now). */
check('suggest(): prototype-named styles are flat, not a throw', ['constructor', '__proto__', 'toString', 'hasOwnProperty'].every(st => { try { return Fonts.suggest({ style: st, dark: true, saturation: 0.3 }).join() === table['flat|true|0.3'].join(); } catch (e) { return false; } }));
check('suggest() takes no arguments', (() => { try { const t = Fonts.suggest(); return t.length === 3; } catch (e) { return false; } })());
check('PAIRINGS is frozen', Object.isFrozen(Fonts.PAIRINGS) && Object.isFrozen(Fonts.PAIRINGS.clean));

/* ── the browser half ──────────────────────────────────────────────────── */
if (process.argv.indexOf('--node') >= 0) { finish(); return; }
(async () => {
  let chromium;
  try { chromium = require('playwright').chromium; } catch (e) { check('playwright resolves', false, e.message); finish(); return; }
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1120, height: 900 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errors = [], left = [], woff = [], doors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  await page.route('**/*', r => {
    const u = r.request().url();
    if (/\/_lab2\//.test(u)) { doors.push(u); return r.fulfill({ status: 404, body: 'no' }); }
    if (!/^http:\/\/localhost:4322\//.test(u)) { left.push(u); return r.abort(); }
    return r.continue();
  });
  const pending = [];
  page.on('response', res => {                 // the server sends no Content-Length, so the size is the body's
    const u = res.url(); if (!/\.woff2$/.test(u)) return;
    pending.push(res.body().then(b => b.length, () => -1).then(bytes => woff.push({ file: u.replace(/.*\//, ''), status: res.status(), bytes })));
  });
  let loaded = false;
  try { await page.goto(URL, { waitUntil: 'load', timeout: 15000 }); loaded = true; } catch (e) { check('fonts-check.html loads from 4322 (is `node lab2/test/serve.js 4322` up?)', false, e.message); }
  if (loaded) {
    const r = await page.evaluate(async (NEW) => {
      await document.fonts.ready;
      /* One entry per @font-face row, asked at ITS weight: check("16px
         'Sora'") asks for 400, which Sora has no row for, so the nearest
         (600) answers — and it is only loaded if the page drew it. The
         strip at the foot of the page draws every row at its weight. */
      const faces = [...document.fonts].map(f => ({ family: f.family.replace(/^"|"$/g, ''), weight: f.weight, status: f.status,
        check: document.fonts.check(f.weight + " 16px '" + f.family.replace(/^"|"$/g, '') + "'") }));
      const rows = document.querySelectorAll('.row').length, strip = document.querySelectorAll('#strip span').length;
      return { faces, rows, strip, height: document.documentElement.scrollHeight };
    }, NEW);
    check('page draws nine rows', r.rows === 9, r.rows);
    check('page draws every @font-face row in its strip', r.strip === rows.length, r.strip + ' of ' + rows.length);
    check('page has no console or page errors', errors.length === 0, errors.join(' | '));
    check('no request left localhost:4322', left.length === 0, left.join(' '));
    check('the door was never knocked on', doors.length === 0, doors.join(' '));
    check('document.fonts holds one FontFace per fonts.css row', r.faces.length === rows.length, r.faces.length + ' of ' + rows.length);
    for (const row of rows) {
      const f = r.faces.find(x => x.family === row.family && x.weight === String(row.weight));
      check('FontFace ' + row.family + ' ' + row.weight + ' is loaded and document.fonts.check() is true', !!f && f.status === 'loaded' && f.check === true, f ? f.status + ', check ' + f.check : 'no such face');
    }
    for (const fam of NEW) check('document.fonts.check ' + fam, r.faces.filter(x => x.family === fam).every(x => x.check) && r.faces.some(x => x.family === fam));
    await Promise.all(pending);
    for (const fam of NEW) {
      const got = woff.filter(x => x.file.replace(/-\d+\.woff2$/, '') === fam.replace(/ /g, '-'));
      const disk = got.map(x => fs.statSync(path.join(FONTS, x.file)).size);
      check(fam + ' woff2 served 200 at its size on disk', got.length > 0 && got.every((x, i) => x.status === 200 && x.bytes === disk[i]), got.map(x => x.file + ' ' + x.bytes + ' B').join(', '));
    }
    await page.screenshot({ path: path.join(OUT, 'pairings.png'), fullPage: true });
    check('screenshot written', fs.existsSync(path.join(OUT, 'pairings.png')), path.join(OUT, 'pairings.png'));
  }
  await browser.close();
  fs.writeFileSync(path.join(OUT, 'summary.json'), JSON.stringify({ date: new Date().toISOString(), url: URL, woff2: woff, errors, left, doors, suggest: table, results }, null, 2));
  finish();
})().catch(e => { check('browser half ran', false, e.stack || e.message); finish(); });

function finish() {
  const n = results.length;
  console.log('\n' + (n - fails) + '/' + n + ' checks pass' + (fails ? ', ' + fails + ' FAIL' : ''));
  process.exit(fails ? 1 : 0);
}
