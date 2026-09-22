#!/usr/bin/env node
/* ─── VERIFY-PRESS ────────────────────────────────────────────────────────
   perf/verify-press.js — PRESS-TABLE-PLAN.md §10 6.3, the verifier Phase 6's
   own acceptance line names and which the "Phase 6.1 + 6.2 + 6.7" entry in
   `press/CHANGELOG.md` admits was still missing ("this entry's numbers come
   from a driver run by hand; the phase's own verifier is the next job"). It does not ask whether the Press Table LOOKS
   finished. It tries to refute one sentence — "an owner can go from a folder
   of images to a browsable game page in under two minutes without touching a
   file by hand" — by doing exactly that, three times, with a stopwatch on it,
   and then by attacking the page nine ways to see what it does when the
   folder is not a folder of nice images.

   USAGE (from site/, with the sandbox server up on 4322):

       node lab2/test/perf/verify-press.js                 # all three fixtures
       node lab2/test/perf/verify-press.js neonrun         # just the one
       node lab2/test/perf/verify-press.js --no-attacks    # the walk-through only
       node lab2/test/perf/verify-press.js --no-game       # skip the verify-game.js run
       node lab2/test/perf/verify-press.js --keep          # leave the games/verify-… folders on disk
       node lab2/test/perf/verify-press.js --no-restart    # do not restart the server

   ── WHAT IT WRITES, AND WHAT IT REFUSES TO WRITE ─────────────────────────
   IT BUILDS TO THROWAWAY SLUGS. Every build in this script goes to
   `games/verify-<fixture>/`, a folder that did not exist before the run, and
   the run deletes all three in its `finally` (`--keep` leaves them). Nothing
   under `games/` that was there when the script started is opened for
   writing, so `pixelfort`, `mosslight`, `neonrun` and `pixelfort-press` are
   never snapshotted because they are never touched. That is the cheaper half
   of the choice the brief offered: a snapshot-and-restore of four folders is
   four chances to put back the wrong bytes, and a slug nobody else owns is
   none.

   Two consequences of the throwaway slug that are worth knowing, because
   both were measured rather than assumed:

     · `serve.js`'s build door takes `index.html.keep-bak` only when the page
       ALREADY EXISTS (serve.js line 597, `if (gate.exists)`), so the first
       build of a fresh slug spends none of the one-backup-per-file-per-
       process budget the CHANGELOG warns about. The `?slug=` regeneration
       attack does force a second build, which spends it — so this script
       RESTARTS the sandbox server between the browser work and the
       `verify-game.js` run, and `verify-game.js`'s step 6 is answerable.
     · the results go to `results/press-verify/` and not to `results/press/`.
       `results/press/` holds the screenshots the Phase 6.1 CHANGELOG entry
       quotes by name; a verifier that overwrites the evidence a changelog
       cites is a verifier that erases its own argument.

   ── HOW THE TWO MINUTES IS MEASURED, AND WHAT THE NUMBER IS NOT ──────────
   The clock starts the instant the files are handed to the page (the call to
   `setInputFiles` returns — the browser has the File objects) and stops when
   the built page ANSWERS: `games/<slug>/` is fetched from the server and
   comes back 200 with the generated markup in it. Not when the button turns
   green; a page that is not servable is not a page.

   Between those two the run is broken into three parts and each is reported,
   because they are not the same kind of time:

     read   the drop to three drawn mockups — the machine's, entirely.
     form   the words typed in — a PERSON's, and a script types faster than
            one. It is reported twice: as the machine spent it, and as a
            person would at HUMAN_CPS characters a second over the exact
            character count this script typed, with the description PASTED
            because that is what somebody does with a paragraph out of a
            press kit.
     build  the button to the built page — the machine's again (re-encode,
            POST, generate, write).

   So the headline is `total`, and beside it `totalHuman` = total − form +
   the typing allowance. Both are reported against the plan's 120 s, and the
   verdict names which one it is judging. HUMAN_CPS 5 is a plain 60-words-a-
   minute typist at five characters a word; it is not measured here and is
   labelled an ALLOWANCE everywhere it appears, never a measurement.

   ── THE NUMBERS, AND WHERE EACH CAME FROM ────────────────────────────────
     VIEW 1600 × 1000 in a 1616 × 1110 window — the viewport every
       `lab2/perf/*.js` measures in, so a reading here lies beside one there.
       The Press Table's own header calls 1280 the narrow case and 1600 the
       comfortable one; the comfortable one is where the three mockups are
       widest and the sticker pixels are worth reading.
     BUDGET 120000 ms — plan §10 6.3's "under two minutes", in milliseconds.
     HUMAN_CPS 5 — the typing allowance above.
     READ_MS 120000 — how long the reading is given before it is called hung.
       The sheet is 224 KB and three mockups extract it; the measured read is
       three to six seconds, so this is twenty times the observation and is a
       hang detector, not a bar.
     TRAY 12 — press.js's own TRAY, plan §10 6.4's "the sticker tray's first
       twelve parts". Asserted as an equality: a tray of eleven is a defect.
     COL_TOL 6 per channel — `verify-game.js`'s, cited there: Chrome paints a
       flat fill exactly, and 6 is the allowance for the screenshot's own
       rounding. It is far under the 46 a 0.18-opacity texture blend moves a
       channel by, which is why the sticker colours are asked for by PRESENCE
       over every pixel of every sticker box and not by equality at a point.
     SOLID 0.0025 and DIFF 8 — verify-game.js's, and its reasons; they are
       argued again where they are defined, below. The same floor decides
       PRESENCE and ABSENCE, so it cannot be a thumb on the scale for one.
     RECOMPOSE_SETTLE 900 ms — how long the MOCKUPS are given to catch up
       with the last keystroke; argued where it is defined.
     BIG_MB 30 — the brief's "a 30 MB file", one file over press.js's
       MAX_BYTES of 25.
     SETTLE 3500 ms — `shot-games.js`'s number, used here only for the
       photograph of a built page.

   ── HOW A RESTYLED STICKER COLOUR IS TOLD FROM A WRONG ONE ───────────────
   The same way `verify-game.js` step 5 tells them apart, and for the same
   reason: `kits.js`'s style pass never invents a colour. It drops layers,
   swaps a fill for a `url(#…)`, lays a texture rect at 0.18 opacity and adds
   filters — so every literal colour in a restyled part is still one of the
   page's own `--sk-*` roles. A WRONG colour is one from the SHEET's own
   default palette (CONTRACTS §7 — Knoll's `#c93b82` and its five) that this
   theme does not itself use: that is what a page wears when the per-page
   palette never reached it. So the question is always PRESENCE of the
   theme's `--sk-primary` and ABSENCE of Knoll's, and it is put three times,
   on three independent things, because one instrument can be wrong:

     · THE TRAY, in pixels, at the size the extractor made it. The twelve
       drawings `Preview.trayFor` hands over are drawn on a page of their own
       at their own box and shot twice, on white and on black; a pixel
       identical in both is opaque drawing (trayPixels, below). Per card.
     · THE MOCKUPS, in pixels, on the paper they will be seen on. Isolated by
       hiding the stickers and shooting again, then narrowed to FILLS —
       because a ten-pixel sticker is nearly all edge. Presence is asked of
       the three cards together and absence of each; the reason is written
       where the check is.
     · THE SOURCE. Every `#rrggbb` literal in each of the twelve tray strings
       must be one of the seven roles this theme set, and none may be a Knoll
       default. A picture and a string are two different ways to be wrong.

   ── THE NINE ATTACKS (the brief's list, in its order) ─────────────────────
   Each runs in its own fresh context — one attack must not be answered by
   the wreckage of the last — and each asserts the REFUSAL and the fact that
   the page is still standing after it (`Press.state.assets.length` unmoved,
   the door never posted to).

     1 a thirteenth file            MAX_FILES 12
     2 a 30 MB file                 MAX_BYTES 25 MB
     3 a .png that is a text file   the decoder's own answer
     4 the slug `A B`               manifest.schema.json's pattern, by field
     5 BUILD with rights unticked   `rights.attested` is `const true`
     6 BUILD pressed twice at once  one POST, one folder, one good game.json
     7 a reload mid-flow            PressStore gives the words back
     8 the vibe door answering 500  the heuristics stand and the panel says so
     9 ?slug=<built>                the page reopens and regenerates

   Attack 6 is not run on a page of its own: it IS the pixelfort build, both
   clicks fired in one task from inside the page, because a double press that
   is tested somewhere else is not the double press an owner makes.

   ── THE SANDBOX IS SHARED ────────────────────────────────────────────────
   One server on 4322 serves every phase's scripts, and another phase
   restarting it mid-run reads here as `ERR_CONNECTION_REFUSED` from a
   `page.goto` — which is a fact about the machine and not about the page.
   Every step this script owns runs in one browser against a door it checks
   first; the one step it does not own, the `verify-game.js` child, is given
   ONE retry and only for that error. If the door is still shut, the failure
   is reported as it came back.

   Results: results/press-verify/summary.json and its PNGs.
   ───────────────────────────────────────────────────────────────────────── */
'use strict';
const fs = require('fs');
const path = require('path');
const { execSync, spawn, spawnSync } = require('child_process');
const { chromium } = require('playwright');
const PNG = require('../press/tools/lib/png.js');

const TEST = path.resolve(__dirname, '..');                    // …/lab2/test
const SITE = path.resolve(TEST, '..', '..');                   // …/site
const ORIGIN = 'http://localhost:4322';
const PRESS_URL = ORIGIN + '/lab2/test/press/';
const GAME_URL = slug => ORIGIN + '/lab2/test/games/' + slug + '/';
const OUT = path.join(__dirname, 'results', 'press-verify');
const SCRATCH = path.join(__dirname, 'fixtures', 'press-verify');
const GAMES_DIR = path.join(TEST, 'games');

const VIEW = { width: 1600, height: 1000 };
const BUDGET = 120000;
const HUMAN_CPS = 5;
const READ_MS = 120000;
const TRAY = 12;
const COL_TOL = 6;
const DIFF = 8;
/* SOLID 0.0025 and DIFF 8 — verify-game.js's, cited there. A colour counts
   as PAINTED when a quarter of one per cent of the sticker's own pixels wear
   it (one pixel is not a colour: an outline's antialiasing walks between two
   roles and can stand on a third on the way), and a pixel counts as the
   sticker's OWN when hiding the sticker moves a channel by more than 8. The
   SAME floor is used for presence and for absence, so it cannot be a thumb
   on the scale for one of them. */
const SOLID = 0.0025;
const BIG_MB = 30;
const SETTLE = 3500;
/* RECOMPOSE_SETTLE 900 ms — press.js debounces a re-compose by RECOMPOSE_MS
   350 and compose() itself measured 5 ms, so 900 is two and a half times the
   wait. It is how long this script gives the MOCKUPS to catch up with the
   last keystroke; the BUILD does not depend on it, because press.js flushes
   a pending compose before it reads the card — which is why the same
   question is put to the built page a second time, off the file. */
const RECOMPOSE_SETTLE = 900;
const PORT = 4322;

const SK_ROLES = ['--sk-primary', '--sk-secondary', '--sk-ink', '--sk-paper', '--sk-highlight', '--sk-shadow'];
// CONTRACTS §7 — the sheet's own palette, which is what a page wears when the
// per-page palette never reached it
const SHEET_DEFAULTS = ['#c93b82', '#5871f5', '#26212a', '#ffffff', '#ef4d98', '#8a2558'];

/* The three fixtures, and what each must answer. `roles` is the brief's own
   list; `presets` is `press/fixtures/<name>/expected.json`'s `preset` array,
   copied here so a change to the fixture shows up as a disagreement rather
   than as a silent pass; `says` are lines the analysis panel must actually
   carry, one regex per sentence the plan asks it to say. */
const FIXTURES = [
  {
    name: 'pixelfort', slug: 'verify-pixelfort',
    roles: { 'logo.png': 'logo', 'keyart-portrait.png': 'keyart', 'shot-1.png': 'screenshot', 'shot-2.png': 'screenshot', 'shot-3.png': 'screenshot', 'shot-4.png': 'screenshot' },
    presets: ['pixel'], recipe: 'poster',
    says: [
      /^pixel: native size 4 from 4 screenshots$/,
      /^outline: present, weight \d/,
      /^colour: \d+ colours a plate, mean chroma /,
      /^surface: texture /,
      /^preset: pixel \d/,
      /^recipe: poster, then /,
      /^dark: mean L \d/,
      /^accent: #[0-9a-f]{6} \(C /,
      /^no judgement from the model — /
    ]
  },
  {
    name: 'mosslight', slug: 'verify-mosslight',
    roles: { 'logo.png': 'logo', 'hero.png': 'hero', 'shot-1.png': 'screenshot', 'shot-2.png': 'screenshot', 'shot-3.png': 'screenshot', 'shot-4.png': 'screenshot' },
    presets: ['painterly', 'cozy-soft'], recipe: 'widescreen',
    says: [
      /^pixel: no grid in 4 screenshots — the art is not on one$/,
      /^outline: none found/,
      /^colour: \d+ colours a plate, mean chroma /,
      /^surface: texture /,
      /^preset: (painterly|cozy-soft) \d/,
      /^recipe: widescreen, then /,
      /^light: mean L \d/,
      /^accent: #[0-9a-f]{6} \(C /,
      /^no judgement from the model — /
    ]
  },
  {
    name: 'neonrun', slug: 'verify-neonrun',
    roles: { 'logo.png': 'logo', 'hero.png': 'hero', 'shot-1.png': 'screenshot', 'shot-2.png': 'screenshot', 'shot-3.png': 'screenshot', 'shot-4.png': 'screenshot' },
    presets: ['neon'], recipe: 'widescreen',
    says: [
      /^pixel: no grid in 4 screenshots — the art is not on one$/,
      /^outline: present, weight \d/,
      /^colour: \d+ colours a plate, mean chroma /,
      /^surface: texture /,
      /^preset: neon \d/,
      /^recipe: widescreen, then /,
      /^dark: mean L \d/,
      /^accent: #[0-9a-f]{6} \(C /,
      /^no judgement from the model — /
    ]
  }
];

// ── the ledger ────────────────────────────────────────────────────────────
const results = [];
let group = '';
const check = (name, ok, info) => {
  results.push({ group, name, ok: !!ok, info: info === undefined ? '' : String(info) });
  console.log((ok ? '  PASS ' : '  FAIL ') + name + (info !== undefined ? ' — ' + info : ''));
};
const note = (name, info) => {
  results.push({ group, name, ok: null, info: String(info) });
  console.log('  note  ' + name + ' — ' + info);
};
const sleep = ms => new Promise(r => setTimeout(r, ms));
const r2 = v => Math.round(v * 100) / 100;
const secs = ms => (ms / 1000).toFixed(1) + ' s';

// ── colour ────────────────────────────────────────────────────────────────
const hex2rgb = h => { const v = String(h).trim().replace('#', ''); return [parseInt(v.slice(0, 2), 16), parseInt(v.slice(2, 4), 16), parseInt(v.slice(4, 6), 16)]; };
const near = (a, b, tol) => Math.abs(a[0] - b[0]) <= tol && Math.abs(a[1] - b[1]) <= tol && Math.abs(a[2] - b[2]) <= tol;
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

// ── the server ────────────────────────────────────────────────────────────
async function doorAnswers() {
  try {
    const r = await fetch(ORIGIN + '/_lab2/test/default');
    if (!r.ok) return false;
    const j = await r.json();
    return !!(j && j.door);
  } catch (e) { return false; }
}

/* THE SHARED DOOR. One server on 4322 serves every phase, so a goto can meet
   it mid-restart; these two are the whole answer to that, and neither of them
   is allowed to hide a real failure. waitForDoor only WAITS — if the door
   never answers the caller throws, and the fixture says so. nav retries a
   navigation ONCE, and only when the error is a refused connection. */
async function waitForDoor(ms) {
  const until = Date.now() + (ms || 60000);
  for (;;) { if (await doorAnswers()) return true; if (Date.now() > until) return false; await sleep(300); }
}

async function nav(page, url) {
  try { await page.goto(url, { waitUntil: 'load' }); return; }
  catch (e) {
    if (!/ERR_CONNECTION|ERR_EMPTY_RESPONSE|ERR_SOCKET/.test(String((e && e.message) || e))) throw e;
    if (!await waitForDoor()) throw e;
    await page.goto(url, { waitUntil: 'load' });
  }
}

/* The listening PID, off `netstat`. Windows only, which is what this sandbox
   is; on anything else the restart is skipped and said to be skipped rather
   than half-done. */
function pidOn(port) {
  if (process.platform !== 'win32') return 0;
  let out = '';
  try { out = execSync('netstat -ano -p tcp', { encoding: 'utf8' }); } catch (e) { return 0; }
  for (const line of out.split(/\r?\n/)) {
    const m = /^\s*TCP\s+\S+:(\d+)\s+\S+\s+LISTENING\s+(\d+)\s*$/.exec(line);
    if (m && +m[1] === port) return +m[2];
  }
  return 0;
}

function startServer() {
  const child = spawn(process.execPath, ['lab2/test/serve.js', String(PORT)], {
    cwd: SITE, detached: true, stdio: 'ignore', windowsHide: true
  });
  child.unref();
  return child.pid;
}

/* Why this exists: `serve.js` keeps ONE `index.html.keep-bak` per file per
   PROCESS, and the `?slug=` attack forces a second build, which spends that
   file's backup. `verify-game.js` step 6 then has nothing to prove and says
   so instead of failing. A restart is the whole fix, it is the fix that
   file's own header prescribes, and it costs a second. */
async function restartServer() {
  const pid = pidOn(PORT);
  if (!pid) { note('the server', 'nothing is listening on ' + PORT + ' — starting one'); }
  else {
    try { execSync('taskkill /PID ' + pid + ' /F /T', { stdio: 'ignore' }); }
    catch (e) { check('the server restarted before verify-game', false, 'taskkill on PID ' + pid + ' failed: ' + ((e && e.message) || e)); return false; }
  }
  for (let i = 0; i < 40 && await doorAnswers(); i++) await sleep(100);
  const fresh = startServer();
  for (let i = 0; i < 100; i++) { if (await doorAnswers()) break; await sleep(100); }
  const up = await doorAnswers();
  check('the server restarted before verify-game (a fresh keep-bak budget)', up,
    up ? 'PID ' + pid + ' → ' + fresh + ', the door answers again' : 'the door does not answer on ' + PORT);
  return up;
}

// ── the page ──────────────────────────────────────────────────────────────
/* One Press Table in a context of its own, with the console, the page errors
   and every request to the build/intake doors on the record. `stub` is a
   route to install before the first load (the vibe attack's 500). */
async function openPress(browser, opts) {
  opts = opts || {};
  const ctx = await browser.newContext({ viewport: VIEW, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const bag = { ctx, page, errors: [], posts: [], ctx0: null };
  page.on('console', m => { if (m.type() === 'error') bag.errors.push('console: ' + m.text()); });
  page.on('pageerror', e => bag.errors.push('page: ' + ((e && e.message) || e)));
  page.on('request', r => { if (r.method() === 'POST' && /\/_lab2\/test\/(build|intake)$/.test(r.url())) bag.posts.push(r.url()); });
  if (opts.route) await page.route(opts.route.match, opts.route.handler);
  if (!await waitForDoor()) throw new Error('the sandbox door on ' + PORT + ' never answered — the server is down');
  await nav(page, PRESS_URL);
  // "clear the knoll-press:* keys first" — a fresh context has none, and the
  // clear is here so that is a FACT of the run and not an assumption about
  // Playwright
  await page.evaluate(() => { try { localStorage.clear(); } catch (e) {} });
  await nav(page, PRESS_URL);
  await page.waitForFunction(() => window.Press && window.Press.state.mode !== 'knocking', null, { timeout: 30000 });
  return bag;
}

const artOf = name => {
  const dir = path.join(TEST, 'press', 'fixtures', name, 'art');
  return fs.readdirSync(dir).sort().map(f => path.join(dir, f));
};

async function waitRead(page) {
  await page.waitForFunction(() => {
    const S = window.Press && window.Press.state;
    if (!S || S.cards.length !== 3) return false;
    const st = document.querySelectorAll('#pt-mocks .pt-stage');
    if (st.length !== 3) return false;
    for (const n of st) if (!n.querySelector('.pv-paper')) return false;
    return true;
  }, null, { timeout: READ_MS });
  await page.evaluate(() => document.fonts && document.fonts.ready);
  await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
}

/* The words. Typed, one field at a time, into the real inputs — the point of
   the two-minute claim is that nothing is touched by hand, and setting
   `.value` from a script would skip the very `input` listeners that write the
   draft into PressStore. The description is PASTED (one `insertText`), which
   is what a person does with a paragraph out of a press kit; every other
   field is typed. The character count of each road is returned, so the human
   allowance is arithmetic over what was actually entered. */
async function fillWords(page, m, slug) {
  let typed = 0, pasted = 0;
  const type = async (sel, text) => { if (!text) return; await page.click(sel); await page.type(sel, text); typed += text.length; };
  await type('#f-title', m.title);
  await page.click('#f-slug');
  await page.fill('#f-slug', '');
  await page.type('#f-slug', slug);
  typed += slug.length;
  await type('#f-tagline', m.tagline);
  if (m.description) {
    await page.click('#f-description');
    await page.evaluate(t => {
      const n = document.getElementById('f-description');
      n.focus(); n.value = t;
      n.dispatchEvent(new Event('input', { bubbles: true }));
    }, m.description);
    pasted += m.description.length;
  }
  await type('#f-developer', m.developer);
  await type('#f-publisher', m.publisher);
  await type('#f-release', m.releaseDate);
  for (const p of (m.platforms || [])) await page.click('#f-platforms .pt-chip[data-p="' + p + '"]');
  for (const k of Object.keys(m.links || {})) {
    const sel = '#f-link-' + k;
    if (await page.$(sel)) { await page.click(sel); await page.type(sel, m.links[k]); typed += m.links[k].length; }
  }
  await page.check('#f-rights');
  await type('#f-rights-by', m.publisher || 'the owner');
  return { typed, pasted };
}

/* THE STICKERS' OWN PIXELS, and why a single screenshot is not enough.
   A `.pv-sk` box is bigger than the drawing in it and the paper shows through
   the rest, so a colour found inside the box may belong to whatever is behind
   it. A first cut of this function read `#26212a` — the SHEET's own default
   ink, which is what a page wears when the palette never reached it — six
   times inside pixelfort's boxes, and it was the paper's own dark corner and
   not a sticker at all. So the reading is `verify-game.js` step 5's, done
   here: the card is shot twice, once as it stands and once with every
   `.pv-sk` in it set to `visibility: hidden`, and only the pixels that
   CHANGED by more than DIFF in a channel are the stickers' own. `visibility`
   and not `display`, so nothing moves between the two shots; the photographs
   in the frames are `.pv-shot`, a SIBLING drawn over the frame, and they stay
   up in both — a screenshot's colours are the game's and are nobody's
   evidence about a sticker. */
async function stickerPixels(page, stageIndex) {
  await page.locator('#pt-mock-card').scrollIntoViewIfNeeded();
  const geo = await page.evaluate(i => {
    const stage = document.getElementById('pt-stage-' + i);
    if (!stage) return null;
    const s = stage.getBoundingClientRect();
    const boxes = [];
    for (const n of stage.querySelectorAll('.pv-sk')) {
      const r = n.getBoundingClientRect();
      if (r.width < 3 || r.height < 3) continue;
      // clipped to the stage: a sticker hanging off the paper is not on screen
      const x0 = Math.max(r.left, s.left), y0 = Math.max(r.top, s.top);
      const x1 = Math.min(r.right, s.right), y1 = Math.min(r.bottom, s.bottom);
      if (x1 - x0 < 3 || y1 - y0 < 3) continue;
      boxes.push({ x: x0 - s.left, y: y0 - s.top, w: x1 - x0, h: y1 - y0 });
    }
    return { clip: { x: s.left, y: s.top, width: s.width, height: s.height }, boxes };
  }, stageIndex);
  if (!geo || !geo.boxes.length) return { boxes: 0, pixels: [], inBox: 0 };
  const hide = (i, v) => page.evaluate(a => {
    for (const n of document.querySelectorAll('#pt-stage-' + a.i + ' .pv-sk')) n.style.visibility = a.v;
  }, { i, v });
  const on = PNG.decode(await page.screenshot({ clip: geo.clip }));
  await hide(stageIndex, 'hidden');
  const off = PNG.decode(await page.screenshot({ clip: geo.clip }));
  await hide(stageIndex, '');
  const pixels = [];
  let inBox = 0, own = 0;
  for (const b of geo.boxes) {
    const x0 = Math.max(0, Math.floor(b.x)), y0 = Math.max(0, Math.floor(b.y));
    const x1 = Math.min(on.width, Math.ceil(b.x + b.w)), y1 = Math.min(on.height, Math.ceil(b.y + b.h));
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
      const i = (y * on.width + x) * 4;
      inBox++;
      if (Math.abs(on.data[i] - off.data[i]) <= DIFF && Math.abs(on.data[i + 1] - off.data[i + 1]) <= DIFF
        && Math.abs(on.data[i + 2] - off.data[i + 2]) <= DIFF) continue;   // the paper, not the sticker
      own++;
      /* AND ONLY A FILL. A mockup draws a 134-unit sticker about ten pixels
         across, so most of what survives the isolation is the antialiasing
         between two of the theme's own roles — and an edge walking from the
         ink to the paper stands on a third colour for a pixel on the way.
         (Measured: six such pixels landed within COL_TOL of the sheet's own
         #26212a on pixelfort's light twin, and #26212a is nowhere in that
         card's drawings.) A FILL is a pixel whose four neighbours are
         EXACTLY it; an antialiased edge never is. That is a fact about the
         bitmap and not a judgement about which colours are allowed, so it is
         the same filter for presence and for absence. */
      if (x <= 0 || y <= 0 || x >= on.width - 1 || y >= on.height - 1) continue;
      const same = j => on.data[j] === on.data[i] && on.data[j + 1] === on.data[i + 1] && on.data[j + 2] === on.data[i + 2];
      if (!(same(i - 4) && same(i + 4) && same(i - on.width * 4) && same(i + on.width * 4))) continue;
      pixels.push([on.data[i], on.data[i + 1], on.data[i + 2]]);
    }
  }
  return { boxes: geo.boxes.length, pixels, inBox, own };
}

/* THE TRAY AT ITS OWN SIZE, which is where the question "whose colours are
   these" can actually be answered. A mockup draws a 134-unit sticker about
   ten screen pixels across, and the scrapbook recipe — whose `open` is 5279
   units wide — draws it at three: measured, 0 fill pixels in twelve boxes.
   So the twelve drawings the tray HANDS OVER are put on a page of their own
   at their own measured box. It is the same string the mockup paints, only
   readable.

   OPAQUE PIXELS ONLY, and no colour is chosen to decide which: the page is
   shot twice, once on white and once on black, and a pixel IDENTICAL in both
   is opaque drawing. Everything else — the ground, the sheet's own 0.3-alpha
   drop shadow, a halo — moves with the ground and is not a fill. Animations
   are turned off first (every part carries an `sk-sway`), so the two shots
   are of one drawing and not of two moments. */
async function trayPixels(ctx, tray) {
  const page = await ctx.newPage();
  try {
    await page.setViewportSize({ width: 1600, height: 900 });
    await page.setContent('<style>*{animation:none!important;transition:none!important}'
      + 'body{margin:0;font-size:0}.pt{display:inline-block;vertical-align:top}</style><div id="t"></div>');
    await page.evaluate(list => {
      const host = document.getElementById('t');
      for (const r of list) {
        const d = document.createElement('div');
        d.className = 'pt';
        d.style.width = r.w + 'px'; d.style.height = r.h + 'px';
        const doc = new DOMParser().parseFromString(r.still, 'image/svg+xml');
        const root = doc.documentElement;
        if (root && String(root.nodeName).toLowerCase() === 'svg' && !doc.querySelector('parsererror')) {
          const node = document.importNode(root, true);
          node.setAttribute('width', r.w); node.setAttribute('height', r.h);
          node.style.animation = 'none';
          d.appendChild(node);
        }
        host.appendChild(d);
      }
    }, tray);
    await page.waitForTimeout(250);
    const shot = async bg => {
      await page.evaluate(c => { document.body.style.background = c; }, bg);
      return PNG.decode(await page.screenshot({ fullPage: true }));
    };
    const onWhite = await shot('#ffffff'), onBlack = await shot('#000000');
    const pixels = [];
    const len = Math.min(onWhite.data.length, onBlack.data.length);
    for (let i = 0; i < len; i += 4) {
      if (onWhite.data[i] !== onBlack.data[i] || onWhite.data[i + 1] !== onBlack.data[i + 1]
        || onWhite.data[i + 2] !== onBlack.data[i + 2]) continue;
      pixels.push([onWhite.data[i], onWhite.data[i + 1], onWhite.data[i + 2]]);
    }
    return { pixels, w: onWhite.width, h: onWhite.height };
  } finally { await page.close(); }
}

// ══ THE WALK-THROUGH, ONE FIXTURE ═══════════════════════════════════════════
async function walk(browser, fx, summary) {
  group = fx.name;
  console.log('\n══ ' + fx.name + ' ' + '═'.repeat(Math.max(0, 60 - fx.name.length)));
  const S = summary.fixtures[fx.name] = { slug: fx.slug };
  const B = await openPress(browser);
  const page = B.page;
  try {
    const mode = await page.$eval('#pt-mode', n => n.textContent.trim());
    check('the door answered: this is OWNER MODE', mode === 'OWNER MODE', mode);
    const keysBefore = await page.evaluate(() => Object.keys(localStorage).filter(k => k.indexOf('knoll-press:') === 0));
    note('the knoll-press:* keys at the start', keysBefore.length + ' (the draft the boot seeds: ' + keysBefore.join(', ') + ')');

    // ── 1 · THE DROP, AND THE ROLES ───────────────────────────────────────
    const files = artOf(fx.name);
    const t0 = Date.now();
    await page.setInputFiles('#pt-files', files);
    await waitRead(page);
    const tRead = Date.now();

    const got = await page.evaluate(() => window.Press.state.assets.map(a => ({ name: a.name, id: a.id, role: a.role, w: a.w, h: a.h, alpha: a.alpha })));
    S.assets = got;
    const want = fx.roles;
    const wrong = got.filter(a => want[a.name] !== a.role).map(a => a.name + ' read as ' + a.role + ', not ' + want[a.name]);
    check('1 · every picture is read as the role the brief names', got.length === Object.keys(want).length && !wrong.length,
      got.map(a => a.name + ' → ' + a.role + ' (' + a.w + '×' + a.h + (a.alpha ? ', alpha' : '') + ')').join(' · ') + (wrong.length ? ' — WRONG: ' + wrong.join('; ') : ''));
    const counts = got.reduce((m, a) => { m[a.role] = (m[a.role] || 0) + 1; return m; }, {});
    const wantCounts = Object.keys(want).reduce((m, k) => { m[want[k]] = (m[want[k]] || 0) + 1; return m; }, {});
    const roll = o => Object.keys(o).sort().map(k => k + ' ×' + o[k]).join(', ');
    check('1 · the roll-call is right', roll(counts) === roll(wantCounts), roll(counts) + ' against ' + roll(wantCounts));

    // ── 2 · THE PRESET, AND THE PANEL'S OWN SENTENCES ─────────────────────
    const read = await page.evaluate(() => {
      const S = window.Press.state;
      return {
        rank: S.read.rank, recipes: S.read.recipes, pairings: S.read.pairings,
        ambiguous: !!S.read.ambiguous, source: S.read.source, stats: S.analysis.stats,
        palette: S.analysis.palette.map(e => e.hex + ' ' + Math.round(e.weight * 100) + '%'),
        cards: S.cards.map(c => ({ recipe: c.recipe, dark: c.dark, label: c.label, slots: c.layout.slots.length, skPrimary: c.theme.tokens['--sk-primary'], preset: c.style.preset, fonts: c.theme.fonts.id })),
        why: Array.prototype.map.call(document.querySelectorAll('#pt-analysis .pt-why li'), n => n.textContent.trim()),
        state: document.getElementById('pt-analysis-state').textContent.trim()
      };
    });
    S.read = read;
    const top = read.rank[0] && read.rank[0].preset;
    check('2 · the top preset is the fixture\'s', fx.presets.indexOf(top) >= 0,
      top + ' at ' + r2(read.rank[0].score) + ', then ' + read.rank.slice(1).map(r => r.preset + ' ' + r2(r.score)).join(', ') + ' — expected.json wants one of [' + fx.presets.join(', ') + ']');
    check('2 · the top recipe is the fixture\'s', read.recipes[0] === fx.recipe,
      read.recipes.join(', then ') + ' — expected.json wants ' + fx.recipe + ' first');
    const missing = fx.says.filter(re => !read.why.some(l => re.test(l)));
    check('2 · the panel SAYS its reasons — every sentence §10 6.3 asks for is on the page',
      missing.length === 0, read.why.length + ' lines; missing: ' + (missing.length ? missing.map(String).join(' ') : 'none'));
    note('2 · what the panel says', read.why.join(' | '));

    // ── 3 · THREE PREVIEWS, THEIR TRAYS, AND WHOSE COLOURS THEY WEAR ──────
    const stages = await page.evaluate(() => Array.prototype.map.call(document.querySelectorAll('#pt-mocks .pt-stage'), n => ({
      paper: !!n.querySelector('.pv-paper'),
      w: n.querySelector('.pv-paper') ? Math.round(n.querySelector('.pv-paper').getBoundingClientRect().width) : 0,
      h: n.querySelector('.pv-paper') ? Math.round(n.querySelector('.pv-paper').getBoundingClientRect().height) : 0,
      sk: n.querySelectorAll('.pv-sk').length, pic: n.querySelectorAll('.pv-pic').length,
      shot: n.querySelectorAll('.pv-shot').length, note: n.querySelectorAll('.pv-note').length
    })));
    S.stages = stages;
    check('3 · three mockups are drawn, each with paper of its own',
      stages.length === 3 && stages.every(s => s.paper && s.w > 0 && s.h > 0),
      stages.map((s, i) => '#' + i + ' ' + s.w + '×' + s.h + ' px, ' + s.sk + ' stickers / ' + s.pic + ' pics / ' + s.shot + ' shots / ' + s.note + ' notes').join(' · '));
    check('3 · every mockup has stickers on it', stages.every(s => s.sk > 0),
      stages.map(s => s.sk).join(', ') + ' .pv-sk elements');

    const trays = await page.evaluate(async n => {
      const out = [];
      for (const c of window.Press.state.cards) {
        const t = await window.Preview.trayFor(c.theme, c.style, n);
        out.push(t.map(r => ({ part: r.part, len: (r.still || '').length, hex: (String(r.still || '').match(/#[0-9a-fA-F]{6}/g) || []).map(h => h.toLowerCase()) })));
      }
      return out;
    }, TRAY);
    check('3 · Preview.trayFor gives ' + TRAY + ' parts for every card, each with a drawing',
      trays.length === 3 && trays.every(t => t.length === TRAY && t.every(r => r.len > 0)),
      trays.map((t, i) => '#' + i + ' ' + t.length + ' parts, ' + t.reduce((n2, r) => n2 + r.len, 0) + ' chars').join(' · '));
    note('3 · the tray', trays[0].map(r => r.part).join(', '));

    // the SOURCE reading: no literal in a tray string may be off this theme
    const skHexes = read.cards.map((c, i) => null);
    const themeRoles = await page.evaluate(roles => window.Press.state.cards.map(c => roles.map(r => String(c.theme.tokens[r] || '').toLowerCase())), SK_ROLES);
    S.skRoles = themeRoles;
    let strayAll = [];
    trays.forEach((t, i) => {
      const own = themeRoles[i];
      for (const rec of t) for (const h of rec.hex) if (own.indexOf(h) < 0) strayAll.push('#' + i + ' ' + rec.part + ' ' + h);
    });
    check('3 · every colour in every tray drawing is one of that card\'s own seven --sk-* roles',
      strayAll.length === 0, strayAll.length ? strayAll.slice(0, 8).join(', ') : 'clean across ' + (trays.length * TRAY) + ' drawings; the roles: ' + themeRoles[0].join(' '));
    const knollInSource = [];
    trays.forEach((t, i) => {
      const own = themeRoles[i];
      for (const d of SHEET_DEFAULTS) { if (own.indexOf(d) >= 0) continue; for (const rec of t) if (rec.hex.indexOf(d) >= 0) knollInSource.push('#' + i + ' ' + rec.part + ' ' + d); }
    });
    check('3 · no tray drawing carries one of the SHEET\'s own defaults this theme does not use',
      knollInSource.length === 0, knollInSource.length ? knollInSource.slice(0, 8).join(', ') : 'clean (the sheet\'s six: ' + SHEET_DEFAULTS.join(' ') + ')');

    // the TRAY's own pixels, card by card, at the size the extractor made them
    const trayPix = [];
    for (let i = 0; i < 3; i++) {
      const t = await page.evaluate(async a => {
        const c = window.Press.state.cards[a.i];
        const list = await window.Preview.trayFor(c.theme, c.style, a.n);
        return list.map(r => ({ part: r.part, still: r.still, w: Math.round(r.w) || 134, h: Math.round(r.h) || 135 }));
      }, { i, n: TRAY });
      const got = await trayPixels(B.ctx, t);
      const primary = hex2rgb(read.cards[i].skPrimary);
      const own = themeRoles[i];
      let hits = 0, best = Infinity;
      for (const q of got.pixels) { const d = dist(q, primary); if (d < best) best = d; if (near(q, primary, COL_TOL)) hits++; }
      const floor = Math.max(1, Math.ceil(got.pixels.length * SOLID));
      const strays = [];
      for (const d of SHEET_DEFAULTS) {
        if (own.indexOf(d) >= 0) continue;
        const rgb = hex2rgb(d);
        let n2 = 0; for (const q of got.pixels) if (near(q, rgb, COL_TOL)) n2++;
        if (n2 >= floor) strays.push(d + ' x' + n2);
      }
      trayPix.push({ opaque: got.pixels.length, sheet: got.w + 'x' + got.h, primary: read.cards[i].skPrimary, hits, best: r2(best), floor, strays });
    }
    S.trayPixels = trayPix;
    check('3 · the TRAY is painted in this fixture\'s --sk-primary, card by card, at the size the extractor made it',
      trayPix.every(t => t.hits >= t.floor),
      trayPix.map((t, i) => '#' + i + ' ' + t.primary + ' ×' + t.hits + ' of ' + t.opaque + ' opaque pixels (floor ' + t.floor + ', nearest miss ' + t.best + ')').join(' · '));
    check('3 · and NOT ONE opaque tray pixel is a Knoll default this theme does not use',
      trayPix.every(t => !t.strays.length),
      trayPix.every(t => !t.strays.length)
        ? 'clean across ' + trayPix.reduce((a, t) => a + t.opaque, 0) + ' opaque pixels of ' + (3 * TRAY) + ' drawings'
        : trayPix.map((t, i) => '#' + i + ' ' + t.strays.join(', ')).filter(x => x.length > 3).join(' · '));

    // the PIXEL reading, card by card
    const pix = [];
    for (let i = 0; i < 3; i++) {
      const p = await stickerPixels(page, i);
      const primary = hex2rgb(read.cards[i].skPrimary);
      let hits = 0, best = Infinity;
      for (const q of p.pixels) { const d = dist(q, primary); if (d < best) best = d; if (near(q, primary, COL_TOL)) hits++; }
      const floor = Math.max(1, Math.ceil(p.pixels.length * SOLID));
      const own = themeRoles[i];
      const strays = [];
      for (const d of SHEET_DEFAULTS) {
        if (own.indexOf(d) >= 0) continue;
        const rgb = hex2rgb(d);
        let n2 = 0; for (const q of p.pixels) if (near(q, rgb, COL_TOL)) n2++;
        if (n2 >= floor) strays.push(d + ' ×' + n2 + ' (over the ' + floor + '-pixel floor)');
        else if (n2) strays.push('~' + d + ' ×' + n2 + ', under the ' + floor + '-pixel floor');
      }
      pix.push({ boxes: p.boxes, pixels: p.pixels.length, inBox: p.inBox, own: p.own, floor, primary: read.cards[i].skPrimary, hits, best: r2(best),
        strays: strays.filter(t => t[0] !== '~'), faint: strays.filter(t => t[0] === '~') });
    }
    S.stickerPixels = pix;
    /* Presence on the MOCKUPS is asked of the three cards together and not
       of each: a scrapbook card frames a 5279-unit composition in a 361-px
       stage and its stickers are three pixels across, with no fill in them
       to read (measured: 0 of 1592 own pixels on neonrun's third card). The
       per-card guarantee is the tray reading above, at the size the drawing
       was made; this one asks whether what is ON THE PAPER wears the same
       colour. Absence stays per card, because a Knoll pink among three
       pixels would still be a Knoll pink. */
    const totHits = pix.reduce((a, p) => a + p.hits, 0), totFloor = pix.reduce((a, p) => a + p.floor, 0);
    check('3 · the mockups\' own stickers are PAINTED in this fixture\'s --sk-primary (the three cards together)',
      totHits >= totFloor,
      totHits + ' of ' + pix.reduce((a, p) => a + p.pixels, 0) + ' sticker FILL pixels, floor ' + totFloor + ' — '
      + pix.map((p, i) => '#' + i + ' ' + p.primary + ' ×' + p.hits + '/' + p.pixels + ' fills (' + p.own + ' own of ' + p.inBox + ' in ' + p.boxes + ' boxes, nearest miss ' + p.best + ')').join(' · '));
    check('3 · and not one sticker pixel is a Knoll default this theme does not use',
      pix.every(p => !p.strays.length),
      pix.every(p => !p.strays.length)
        ? 'clean across ' + pix.reduce((n2, p) => n2 + p.pixels, 0) + ' sticker fill pixels'
          + (pix.some(p => p.faint.length) ? ' — and below the floor: ' + pix.map(p => p.faint.join(', ')).filter(Boolean).join(' · ') : '')
        : pix.map((p, i) => '#' + i + ' ' + p.strays.join(', ')).filter(s => s.length > 3).join(' · '));

    // ── 7 · NOTHING REACHES :root ─────────────────────────────────────────
    const root = await page.evaluate(() => {
      const inline = [];
      for (let i = 0; i < document.documentElement.style.length; i++) { const p = document.documentElement.style[i]; if (p.slice(0, 2) === '--') inline.push(p + ': ' + document.documentElement.style.getPropertyValue(p)); }
      const stageTok = Array.prototype.map.call(document.querySelectorAll('#pt-mocks .pt-stage'), n => (n.style.getPropertyValue('--paper') || '').trim());
      return {
        inline,
        bodyPaper: getComputedStyle(document.body).getPropertyValue('--paper').trim(),
        bodyBg: getComputedStyle(document.body).backgroundColor,
        rootPaper: getComputedStyle(document.documentElement).getPropertyValue('--paper').trim(),
        stageTok
      };
    });
    S.root = root;
    check('7 · with three themed mockups up, NOTHING has been written to :root',
      root.inline.length === 0, root.inline.length ? root.inline.join('; ') : 'the document root carries no inline custom property at all');
    check('7 · the table\'s own --paper is still press.css\'s #faf7f9 on body',
      root.bodyPaper === '#faf7f9', root.bodyPaper + ' on body, ' + root.rootPaper + ' on :root, body painted ' + root.bodyBg);
    check('7 · and the mockups DID get their tokens — on their own containers',
      root.stageTok.filter(Boolean).length === 3 && root.stageTok.some(v => v !== root.bodyPaper),
      root.stageTok.join(', ') + ' against the table\'s ' + root.bodyPaper);

    /* The reading, before a word is typed — which is the state the three
       mockups were composed in, and worth having a picture of on its own. */
    await page.screenshot({ path: path.join(OUT, 'press-' + fx.name + '-read.png') });
    await page.locator('#pt-mock-card').screenshot({ path: path.join(OUT, 'mocks-' + fx.name + '-read.png') });

    // ── 4 · THE WORDS, THE ATTESTATION, THE BUTTON ────────────────────────
    const man = JSON.parse(fs.readFileSync(path.join(TEST, 'press', 'fixtures', fx.name, 'manifest.json'), 'utf8'));
    const tForm0 = Date.now();
    const chars = await fillWords(page, man, fx.slug);
    const tForm1 = Date.now();
    await page.waitForFunction(() => !document.getElementById('pt-build').disabled, null, { timeout: 15000 })
      .catch(async () => {
        const faults = await page.$$eval('#pt-faults li', ns => ns.map(n => n.textContent));
        note('4 · the button never lit up; the faults on the form', faults.join(' | ') || 'none listed');
      });
    const enabled = await page.$eval('#pt-build', n => !n.disabled);
    check('4 · the form validates and BUILD lights up', enabled, 'BUILD reads "' + (await page.$eval('#pt-build', n => n.textContent)) + '"');

    /* THE WORDS HAVE TO BE IN THE COMPOSITION, not merely in the form. The
       reading runs when the first picture lands, so the three cards were
       resolved against a manifest with no title in it; recipes.js drops a
       note whose text is empty and a sign with no chips, and the layout that
       is BUILT is a card's. Before the debounce and the flush this check
       read 8 slots and no note at all. */
    await sleep(RECOMPOSE_SETTLE);
    const kinds = await page.evaluate(() => {
      const c = window.Press.state.cards[window.Press.dials.get().chosen | 0] || window.Press.state.cards[0];
      const m = {};
      for (const s of c.layout.slots) m[s.kind + (s.ref ? ':' + s.ref : '')] = 1;
      return { slots: c.layout.slots.length, refs: Object.keys(m), recipe: c.layout.recipe };
    });
    S.chosenLayout = kinds;
    check('4 · the typed words reached the COMPOSITION — the title, the description and the sign are slots',
      kinds.refs.indexOf('note:title') >= 0 && kinds.refs.indexOf('note:description') >= 0 && kinds.refs.indexOf('sign:links') >= 0,
      kinds.recipe + ', ' + kinds.slots + ' slots: ' + kinds.refs.join(', ') + ' (read ' + RECOMPOSE_SETTLE + ' ms after the last keystroke)');

    // and what a re-compose costs, which is the number RECOMPOSE_MS is set against
    const cost = await page.evaluate(async () => {
      const t = performance.now();
      await window.Press.compose();
      return Math.round(performance.now() - t);
    });
    note('4 · what one re-compose costs — compose() itself, sheet cached; the three Preview.renders it starts are not awaited by it', cost + ' ms');
    S.recomposeMs = cost;

    // the table as the owner sees it in the moment before they press BUILD
    await sleep(400);
    await page.screenshot({ path: path.join(OUT, 'press-' + fx.name + '.png') });
    await page.locator('#pt-mock-card').screenshot({ path: path.join(OUT, 'mocks-' + fx.name + '.png') });

    /* ATTACK 6, in the place an owner would make it: two clicks in ONE task.
       press() sets `b.disabled = true` before its first await, and its own
       first line is `if (b.disabled) return`, so the second click must find
       the door already shut. One POST is the whole assertion. */
    const tPress = Date.now();
    await page.evaluate(() => { const b = document.getElementById('pt-build'); b.click(); b.click(); });
    await page.waitForFunction(() => { const a = document.getElementById('pt-out'); return !a.hidden && a.getAttribute('href'); }, null, { timeout: 180000 })
      .catch(() => {});
    const said = await page.$eval('#pt-say', n => n.textContent.trim());
    const outHref = await page.$eval('#pt-out', n => n.hidden ? '' : n.getAttribute('href'));
    check('4 · the build door answered and the table gave a link', !!outHref, outHref + ' — "' + said.slice(0, 120) + '"');
    check('6 · BUILD pressed twice in one task posted to the door ONCE', B.posts.length === 1,
      B.posts.length + ' POST' + (B.posts.length === 1 ? '' : 's') + ' to ' + (B.posts[0] || 'the door'));

    const dir = path.join(GAMES_DIR, fx.slug);
    const okDir = fs.existsSync(path.join(dir, 'index.html')) && fs.existsSync(path.join(dir, 'game.json'));
    check('4 · games/' + fx.slug + '/ exists, with an index.html and a game.json', okDir,
      okDir ? fs.readdirSync(dir).join(', ') + ' · art: ' + fs.readdirSync(path.join(dir, 'art')).join(', ') : 'not written');
    let g = null;
    try { g = JSON.parse(fs.readFileSync(path.join(dir, 'game.json'), 'utf8')); } catch (e) {}
    check('4 · game.json is version 1 and carries all seven keys (CONTRACTS §10)',
      !!g && g.version === 1 && ['version', 'builtAt', 'manifest', 'analysis', 'theme', 'style', 'layout'].every(k => g[k] !== undefined),
      g ? 'version ' + g.version + ', built ' + g.builtAt + ', recipe ' + (g.layout && g.layout.recipe) + ', preset ' + (g.style && g.style.preset) + ', ' + (g.layout && g.layout.slots.length) + ' slots' : 'unreadable');
    check('6 · one press wrote ONE page, not two', okDir && fs.readdirSync(GAMES_DIR).filter(n => n.indexOf(fx.slug) === 0).length === 1,
      fs.readdirSync(GAMES_DIR).filter(n => n.indexOf('verify-') === 0).join(', '));

    // ── 5 · THE STOPWATCH ─────────────────────────────────────────────────
    let http = 0, tBrowsable = 0, body = '';
    for (let i = 0; i < 60; i++) {
      try {
        const r = await fetch(GAME_URL(fx.slug));
        http = r.status;
        if (r.ok) { body = await r.text(); tBrowsable = Date.now(); break; }
      } catch (e) { http = 0; }
      await sleep(100);
    }
    check('5 · the built page is BROWSABLE — ' + GAME_URL(fx.slug) + ' answers 200',
      http === 200 && /data-open=/.test(body) && /bench-world/.test(body),
      'HTTP ' + http + ', ' + body.length + ' bytes, ' + ((body.match(/<section class="gz/g) || []).length) + ' sections');

    const words = man.title && body.indexOf(man.title) >= 0;
    const para = man.description && body.indexOf(man.description.slice(0, 40)) >= 0;
    check('4 · and the built page CARRIES the words — the title and the description are in the file',
      !!words && !!para, 'title "' + man.title + '" ' + (words ? 'found' : 'MISSING') + ', the first 40 characters of the description ' + (para ? 'found' : 'MISSING'));

    const total = tBrowsable - t0;
    const form = tForm1 - tForm0;
    const allowance = Math.round(((chars.typed / HUMAN_CPS) + 2) * 1000);   // +2 s: a person pastes a paragraph and reaches for the mouse
    const human = total - form + allowance;
    S.timing = {
      totalMs: total, readMs: tRead - t0, formMs: form, buildMs: tBrowsable - tPress,
      typedChars: chars.typed, pastedChars: chars.pasted, humanAllowanceMs: allowance, totalHumanMs: human, budgetMs: BUDGET
    };
    note('5 · the stopwatch', 'total ' + secs(total) + ' = read ' + secs(tRead - t0) + ' + form ' + secs(form)
      + ' + build ' + secs(tBrowsable - tPress) + ' (and ' + secs(tPress - tForm1) + ' between the last keystroke and the press)');
    note('5 · the typing', chars.typed + ' characters typed, ' + chars.pasted + ' pasted; a person at ' + HUMAN_CPS + ' char/s would spend ' + secs(allowance) + ' on them (an ALLOWANCE, not a measurement)');
    check('5 · MACHINE clock, first file to browsable page, is under the plan\'s two minutes',
      total < BUDGET, secs(total) + ' of ' + secs(BUDGET));
    check('5 · and with a person doing the typing it is still under two minutes',
      human < BUDGET, secs(human) + ' of ' + secs(BUDGET) + ' (total − scripted form + the allowance)');

    check('4 · nothing went wrong in the console on the way', B.errors.length === 0,
      B.errors.length ? B.errors.slice(0, 4).join(' | ') : 'none');

    // the draft is cleared by a build that succeeded (plan §10 6.7)
    const after = await page.evaluate(() => Object.keys(localStorage).filter(k => k.indexOf('knoll-press:') === 0));
    check('4 · a build that succeeded cleared the knoll-press:* draft', after.length === 0,
      after.length ? after.join(', ') : 'no key left');
  } finally {
    await B.ctx.close();
  }
}

// ══ THE BUILT PAGE, PHOTOGRAPHED ════════════════════════════════════════════
async function shootBuilt(browser, fx, summary) {
  const ctx = await browser.newContext({ viewport: VIEW, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  /* the door is shut in the page below, so merely LOOKING writes nothing —
     and the 404 THIS SCRIPT causes is counted out by its own pathname, the
     way verify-game.js step 1 counts out the same 404. */
  page.on('console', m => {
    const at = (m.location() && m.location().url) || '';
    if (m.type() === 'error' && !/_lab2/.test(at) && !/_lab2/.test(m.text())) errs.push(m.text() + ' (' + at + ')');
  });
  page.on('pageerror', e => errs.push(String((e && e.message) || e)));
  await page.route('**/_lab2/**', r => r.fulfill({ status: 404, body: '{}' }));
  await waitForDoor();
  await nav(page, GAME_URL(fx.slug));
  await sleep(SETTLE);
  const shot = await page.evaluate(() => ({
    sections: document.querySelectorAll('#bench-world .gz').length,
    iframes: document.querySelectorAll('iframe').length,
    open: document.getElementById('bench-world').getAttribute('data-open'),
    paper: getComputedStyle(document.documentElement).getPropertyValue('--paper').trim(),
    skPrimary: getComputedStyle(document.documentElement).getPropertyValue('--sk-primary').trim(),
    title: document.title,
    zoom: window.Lab ? Math.round(Lab.zoom * 100) / 100 : null
  }));
  await page.screenshot({ path: path.join(OUT, 'built-' + fx.name + '.png') });
  await ctx.close();
  summary.fixtures[fx.name].built = shot;
  group = fx.name;
  check('4 · the built page boots with sections, no iframes and its own tokens',
    shot.sections > 0 && shot.iframes === 0 && /^#[0-9a-f]{6}$/.test(shot.paper) && errs.length === 0,
    shot.sections + ' sections, ' + shot.iframes + ' iframes, --paper ' + shot.paper + ', --sk-primary ' + shot.skPrimary
    + ', data-open="' + shot.open + '", zoom ' + shot.zoom + (errs.length ? ', ' + errs.length + ' console errors: ' + errs[0] : ', console clean'));
}

// ══ THE ATTACKS ════════════════════════════════════════════════════════════
async function attacks(browser, summary) {
  group = 'attacks';
  console.log('\n══ attacks ' + '═'.repeat(52));
  const art = artOf('pixelfort');
  const A = summary.attacks = {};

  // 1 · a thirteenth file
  {
    const B = await openPress(browser);
    try {
      const twelve = art.concat(art.map(f => { const to = path.join(SCRATCH, 'dup-' + path.basename(f)); fs.copyFileSync(f, to); return to; }));
      await B.page.setInputFiles('#pt-files', twelve);
      await B.page.waitForFunction(() => window.Press.state.assets.length === 12, null, { timeout: 60000 });
      const one = path.join(SCRATCH, 'thirteenth.png');
      fs.copyFileSync(art[0], one);
      await B.page.setInputFiles('#pt-files', [one]);
      await sleep(500);
      const n = await B.page.evaluate(() => window.Press.state.assets.length);
      const say = await B.page.$eval('#pt-drop-note', x => x.textContent.trim());
      A.thirteenth = { assets: n, note: say };
      check('attack 1 · a thirteenth file is refused, and the twelve stand', n === 12 && /limit is 12/.test(say),
        n + ' pictures kept — "' + say + '"');
    } finally { await B.ctx.close(); }
  }

  // 2 · a 30 MB file
  {
    const B = await openPress(browser);
    try {
      const big = path.join(SCRATCH, 'huge.png');
      if (!fs.existsSync(big) || fs.statSync(big).size !== BIG_MB * 1024 * 1024) {
        const head = fs.readFileSync(art[0]);
        const buf = Buffer.alloc(BIG_MB * 1024 * 1024, 0x41);
        head.copy(buf, 0);                      // a real PNG signature, so only the SIZE is wrong
        fs.writeFileSync(big, buf);
      }
      await B.page.setInputFiles('#pt-files', [big]);
      await sleep(1500);
      const n = await B.page.evaluate(() => window.Press.state.assets.length);
      const say = await B.page.$eval('#pt-drop-note', x => x.textContent.trim());
      A.big = { mb: BIG_MB, assets: n, note: say };
      check('attack 2 · a ' + BIG_MB + ' MB file is refused before it is decoded', n === 0 && /limit is 25 MB/.test(say),
        n + ' pictures — "' + say + '"');
    } finally { await B.ctx.close(); }
  }

  // 3 · a .png that is really a text file
  {
    const B = await openPress(browser);
    try {
      const liar = path.join(SCRATCH, 'not-really.png');
      fs.writeFileSync(liar, 'This is a text file wearing a .png. There is no image in it at all.\n');
      await B.page.setInputFiles('#pt-files', [liar]);
      await sleep(1500);
      const n = await B.page.evaluate(() => window.Press.state.assets.length);
      const say = await B.page.$eval('#pt-drop-note', x => x.textContent.trim());
      A.liar = { assets: n, note: say };
      check('attack 3 · a .png that is a text file is refused by the decoder, not by its name',
        n === 0 && /could not be decoded/.test(say), n + ' pictures — "' + say + '"');
      check('attack 3 · and the page is still standing', B.errors.length === 0 && await B.page.$eval('#pt-drop', x => !!x),
        B.errors.length ? B.errors.join(' | ') : 'no console error');
    } finally { await B.ctx.close(); }
  }

  // 4 · the slug `A B`
  {
    const B = await openPress(browser);
    try {
      await B.page.setInputFiles('#pt-files', art);
      await waitRead(B.page);
      await B.page.click('#f-title'); await B.page.type('#f-title', 'Pixelfort');
      await B.page.fill('#f-slug', ''); await B.page.click('#f-slug'); await B.page.type('#f-slug', 'A B');
      await B.page.check('#f-rights');
      await sleep(400);
      const out = await B.page.evaluate(() => ({
        disabled: document.getElementById('pt-build').disabled,
        faults: Array.prototype.map.call(document.querySelectorAll('#pt-faults li'), n => n.textContent.trim()),
        marked: !!document.querySelector('.pt-f[data-for="slug"].bad'),
        where: document.getElementById('f-slug-where').textContent
      }));
      A.slug = out;
      check('attack 4 · the slug "A B" is refused by the schema\'s own pattern, and the field is marked',
        out.disabled && out.marked && out.faults.some(f => /^slug/.test(f)),
        'BUILD ' + (out.disabled ? 'disabled' : 'ENABLED') + ', slug field ' + (out.marked ? 'marked' : 'unmarked') + ' — ' + out.faults.join(' | '));
      check('attack 4 · nothing was posted to any door', B.posts.length === 0, B.posts.length + ' POSTs');
    } finally { await B.ctx.close(); }
  }

  // 5 · BUILD with the rights box unticked
  {
    const B = await openPress(browser);
    try {
      await B.page.setInputFiles('#pt-files', art);
      await waitRead(B.page);
      const man = JSON.parse(fs.readFileSync(path.join(TEST, 'press', 'fixtures', 'pixelfort', 'manifest.json'), 'utf8'));
      await B.page.click('#f-title'); await B.page.type('#f-title', man.title);
      await B.page.fill('#f-slug', ''); await B.page.click('#f-slug'); await B.page.type('#f-slug', 'verify-norights');
      await sleep(400);
      const before = await B.page.evaluate(() => ({
        disabled: document.getElementById('pt-build').disabled,
        faults: Array.prototype.map.call(document.querySelectorAll('#pt-faults li'), n => n.textContent.trim()),
        marked: !!document.querySelector('.pt-f[data-for="rights"].bad')
      }));
      // and pressed anyway, two ways: the DOM click a person makes, and the
      // module's own entry point a script could reach for
      await B.page.evaluate(() => { document.getElementById('pt-build').click(); });
      await B.page.evaluate(() => window.Press.build());
      await sleep(1200);
      A.rights = { before, posts: B.posts.length, wrote: fs.existsSync(path.join(GAMES_DIR, 'verify-norights')) };
      check('attack 5 · with the rights box unticked BUILD is disabled and the fault names it',
        before.disabled && before.faults.some(f => /rights/.test(f)),
        'BUILD ' + (before.disabled ? 'disabled' : 'ENABLED') + ' — ' + before.faults.join(' | '));
      check('attack 5 · pressing it anyway — by click and by Press.build() — posts nothing and writes nothing',
        B.posts.length === 0 && !A.rights.wrote, B.posts.length + ' POSTs, games/verify-norights/ ' + (A.rights.wrote ? 'WRITTEN' : 'absent'));
    } finally { await B.ctx.close(); }
  }

  // 7 · a reload mid-flow
  {
    const B = await openPress(browser);
    try {
      await B.page.setInputFiles('#pt-files', art);
      await waitRead(B.page);
      const man = JSON.parse(fs.readFileSync(path.join(TEST, 'press', 'fixtures', 'pixelfort', 'manifest.json'), 'utf8'));
      const typed = await fillWords(B.page, man, 'verify-reload');
      await sleep(400);
      const before = await B.page.evaluate(() => {
        const v = id => document.getElementById(id).value;
        return { title: v('f-title'), slug: v('f-slug'), tagline: v('f-tagline'), description: v('f-description'),
          developer: v('f-developer'), publisher: v('f-publisher'), release: v('f-release'),
          steam: v('f-link-steam'), rights: document.getElementById('f-rights').checked,
          rightsBy: v('f-rights-by'), platforms: Array.prototype.filter.call(document.querySelectorAll('#f-platforms .pt-chip.on'), n => 1).map(n => n.dataset.p) };
      });
      await nav(B.page, PRESS_URL);
      await B.page.waitForFunction(() => window.Press && window.Press.state.mode !== 'knocking', null, { timeout: 30000 });
      await sleep(400);
      const after = await B.page.evaluate(() => {
        const v = id => document.getElementById(id).value;
        return { title: v('f-title'), slug: v('f-slug'), tagline: v('f-tagline'), description: v('f-description'),
          developer: v('f-developer'), publisher: v('f-publisher'), release: v('f-release'),
          steam: v('f-link-steam'), rights: document.getElementById('f-rights').checked,
          rightsBy: v('f-rights-by'), platforms: Array.prototype.filter.call(document.querySelectorAll('#f-platforms .pt-chip.on'), n => 1).map(n => n.dataset.p),
          assets: window.Press.state.assets.length,
          faults: Array.prototype.map.call(document.querySelectorAll('#pt-faults li'), n => n.textContent.trim()) };
      });
      const same = JSON.stringify(before) === JSON.stringify({ title: after.title, slug: after.slug, tagline: after.tagline,
        description: after.description, developer: after.developer, publisher: after.publisher, release: after.release,
        steam: after.steam, rights: after.rights, rightsBy: after.rightsBy, platforms: after.platforms });
      A.reload = { before, after, typed };
      check('attack 7 · a reload mid-flow gives every word back out of PressStore', same,
        same ? 'title, slug, tagline, ' + after.description.length + ' characters of description, developer, publisher, release, the Steam link, ' + after.platforms.length + ' platforms and the attestation, all as typed'
             : JSON.stringify(before) + ' became ' + JSON.stringify(after));
      check('attack 7 · and it asks for the folder again — the pictures are NOT kept (store.js\'s own trade)',
        after.assets === 0 && after.faults.some(f => /^assets/.test(f)) === false,
        after.assets + ' pictures after the reload; the table asks for them rather than pretending it has them');
    } finally { await B.ctx.close(); }
  }

  // 8 · the vibe door answering 500
  {
    const B = await openPress(browser, {
      route: { match: '**/_lab2/test/vibe', handler: r => r.fulfill({ status: 500, contentType: 'application/json', body: '{}' }) }
    });
    try {
      await B.page.setInputFiles('#pt-files', art);
      await waitRead(B.page);
      await B.page.waitForFunction(() => window.Press.state.read && window.Press.state.read.vibeSaid, null, { timeout: 120000 });
      await sleep(400);
      const out = await B.page.evaluate(() => ({
        vibe: window.Press.state.analysis.vibe,
        said: window.Press.state.read.vibeSaid,
        top: window.Press.state.read.rank[0].preset,
        recipes: window.Press.state.read.recipes,
        cards: window.Press.state.cards.length,
        why: Array.prototype.map.call(document.querySelectorAll('#pt-analysis .pt-why li'), n => n.textContent.trim()),
        state: document.getElementById('pt-analysis-state').textContent.trim()
      }));
      A.vibe500 = out;
      const line = out.why.filter(l => /^no judgement from the model/.test(l))[0] || '';
      check('attack 8 · a 500 from the vibe door leaves the heuristics standing',
        out.vibe === null && out.top === 'pixel' && out.recipes[0] === 'poster' && out.cards === 3,
        'preset ' + out.top + ', recipe ' + out.recipes[0] + ', ' + out.cards + ' cards, vibe ' + JSON.stringify(out.vibe));
      check('attack 8 · and the panel SAYS the door failed, in a line of its own',
        /the vibe door answered 500/.test(line), '"' + line + '" (the tag reads "' + out.state + '")');
    } finally { await B.ctx.close(); }
  }

  // 9 · ?slug=<built> — reopen a built page and regenerate it
  {
    const slug = FIXTURES[0].slug;
    const dir = path.join(GAMES_DIR, slug);
    if (!fs.existsSync(path.join(dir, 'game.json'))) { note('attack 9 · ?slug=', 'skipped — games/' + slug + '/ was not built'); }
    else {
      const before = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
      const ctx = await browser.newContext({ viewport: VIEW, deviceScaleFactor: 1 });
      const page = await ctx.newPage();
      const posts = [], errs = [];
      page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
      page.on('request', r => { if (r.method() === 'POST' && /\/_lab2\/test\/build$/.test(r.url())) posts.push(1); });
      let asked = '';
      page.on('dialog', d => { asked = d.message(); d.accept(); });
      try {
        await nav(page, PRESS_URL);
        await page.evaluate(() => { try { localStorage.clear(); } catch (e) {} });
        await nav(page, PRESS_URL + '?slug=' + slug);
        await waitRead(page);
        await page.waitForFunction(() => !document.getElementById('pt-build').disabled, null, { timeout: 30000 });
        const back = await page.evaluate(() => ({
          slug: window.Press.state.slug,
          assets: window.Press.state.assets.map(a => a.id + ':' + a.role),
          title: document.getElementById('f-title').value,
          slugField: document.getElementById('f-slug').value,
          rights: document.getElementById('f-rights').checked,
          button: document.getElementById('pt-build').textContent.trim(),
          cards: window.Press.state.cards.length
        }));
        check('attack 9 · ?slug= reopens the built page: the words, the roles and the pictures all come back',
          back.slug === slug && back.assets.length === 6 && back.title && back.rights && back.cards === 3,
          back.assets.join(' · ') + ' — title "' + back.title + '", slug "' + back.slugField + '", rights ' + back.rights + ', ' + back.cards + ' cards');
        await page.click('#pt-build');
        await page.waitForFunction(() => { const a = document.getElementById('pt-out'); return !a.hidden && a.getAttribute('href'); }, null, { timeout: 180000 }).catch(() => {});
        await sleep(500);
        const said = await page.$eval('#pt-say', n => n.textContent.trim());
        const after = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
        A.reopen = { asked: asked, posts: posts.length, said: said.slice(0, 160), bak: fs.existsSync(path.join(dir, 'index.html.keep-bak')), sameSize: before.length === after.length };
        check('attack 9 · rebuilding an existing page ASKS first, out loud',
          /already exists/.test(asked) && /Overwrite it\?/.test(asked), asked ? asked.split('\n')[0] : 'no dialog was raised');
        check('attack 9 · and once answered it regenerates the page and keeps a backup',
          posts.length === 1 && /^built\./.test(said) && A.reopen.bak,
          posts.length + ' POST, index.html.keep-bak ' + (A.reopen.bak ? 'written' : 'MISSING') + ' — "' + said.slice(0, 90) + '"');
        check('attack 9 · nothing went wrong in the console', errs.length === 0, errs.length ? errs.slice(0, 3).join(' | ') : 'none');
      } finally { await ctx.close(); }
    }
  }
}

// ══ THE RUN ════════════════════════════════════════════════════════════════
(async () => {
  const argv = process.argv.slice(2);
  const doAttacks = argv.indexOf('--no-attacks') < 0;
  const doGame = argv.indexOf('--no-game') < 0;
  const doRestart = argv.indexOf('--no-restart') < 0;
  const keep = argv.indexOf('--keep') >= 0;
  const named = argv.filter(a => !/^--/.test(a));
  const list = named.length ? FIXTURES.filter(f => named.indexOf(f.name) >= 0) : FIXTURES;

  fs.mkdirSync(OUT, { recursive: true });
  fs.mkdirSync(SCRATCH, { recursive: true });

  group = 'the run';
  console.log('══ the run ' + '═'.repeat(52));
  const up = await doorAnswers();
  check('the sandbox server is up on ' + PORT + ' and its door answers', up, ORIGIN + '/_lab2/test/default');
  if (!up) { console.log('\nStart it from site/:  node lab2/test/serve.js ' + PORT); process.exit(1); }

  /* THE ONE THING THIS SCRIPT REFUSES TO DO. A slug it is about to build to
     must not already exist: overwriting a page somebody made is exactly the
     act the build door asks out loud about, and a verifier does not get to
     answer that question for them. */
  const clash = list.map(f => f.slug).filter(s => fs.existsSync(path.join(GAMES_DIR, s)));
  check('the throwaway slugs are free — nothing that exists is about to be overwritten',
    clash.length === 0, clash.length ? 'games/' + clash.join('/, games/') + '/ is in the way; delete it or pass --keep off' : list.map(f => 'games/' + f.slug + '/').join(', ') + ' — none of them exists yet');
  if (clash.length) process.exit(1);

  const summary = { at: new Date().toISOString(), origin: ORIGIN, view: VIEW, budgetMs: BUDGET, fixtures: {}, attacks: {} };
  const browser = await chromium.launch({ channel: 'chrome', headless: false, args: ['--window-size=1616,1110', '--window-position=0,0'] });
  try {
    /* One fixture is one walk-through and they are independent, so a
       fixture that falls over is one FAIL and not the end of the run — the
       other two still have to answer. */
    for (const fx of list) {
      try { await walk(browser, fx, summary); await shootBuilt(browser, fx, summary); }
      catch (e) { group = fx.name; check('the walk-through ran to the end', false, String((e && e.message) || e).split('\n')[0]); }
    }
    if (doAttacks) { try { await attacks(browser, summary); } catch (e) { group = 'attacks'; check('the attacks ran to the end', false, String((e && e.message) || e).split('\n')[0]); } }
  } catch (e) {
    check('the run itself', false, String((e && e.stack) || e));
  } finally {
    try { await browser.close(); } catch (e) {}
  }

  // ── §10 6.3's last clause: "and the page passes verify-game.js" ─────────
  if (doGame) {
    group = 'verify-game';
    console.log('\n══ verify-game ' + '═'.repeat(48));
    let ready = true;
    if (doRestart) ready = await restartServer();
    else note('the server', 'left alone (--no-restart): verify-game step 6 may find its keep-bak already spent');
    if (ready) {
      const slugs = list.map(f => f.slug).filter(s => fs.existsSync(path.join(GAMES_DIR, s, 'game.json')));
      if (!slugs.length) note('verify-game', 'nothing was built to run it against');
      else {
        /* ONE RETRY, and only for a connection that went away. The sandbox
           server on 4322 is shared — another phase's script restarts it for
           its own run — and a page.goto that meets a server mid-restart is
           not an answer about the page. Anything else is reported as it
           came back. */
        let run = spawnSync(process.execPath, [path.join(__dirname, 'verify-game.js')].concat(slugs),
          { cwd: SITE, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
        if (run.status !== 0 && /ERR_CONNECTION_REFUSED/.test((run.stdout || '') + (run.stderr || ''))) {
          note('verify-game', 'the server went away mid-run (the sandbox is shared) — waiting for the door and running it once more');
          for (let i = 0; i < 100 && !(await doorAnswers()); i++) await sleep(200);
          if (!await doorAnswers()) { startServer(); for (let i = 0; i < 100 && !(await doorAnswers()); i++) await sleep(200); }
          run = spawnSync(process.execPath, [path.join(__dirname, 'verify-game.js')].concat(slugs),
            { cwd: SITE, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
        }
        const text = (run.stdout || '') + (run.stderr || '');
        console.log(text.split('\n').filter(l => /PASS|FAIL|note|══|FAILED|ALL PASS/.test(l)).join('\n'));
        let gs = null;
        try {
          gs = JSON.parse(fs.readFileSync(path.join(__dirname, 'results', 'game', 'summary.json'), 'utf8'));
          fs.writeFileSync(path.join(OUT, 'verify-game-summary.json'), JSON.stringify(gs, null, 1));
        } catch (e) {}
        const bad = gs ? gs.checks.filter(c => c.ok === false) : [];
        const asked = gs ? gs.checks.filter(c => c.ok !== null).length : 0;
        summary.verifyGame = { exit: run.status, checks: asked, failed: bad.length, failures: bad.map(b => b.slug + ' · ' + b.name + ' — ' + b.info) };
        check('the three built pages pass perf/verify-game.js', run.status === 0,
          bad.length ? bad.length + ' of ' + asked + ' checks failed: ' + bad.map(b => b.slug + ' · ' + b.name).join(' | ') : 'ALL PASS (' + asked + ' checks), exit ' + run.status);
        for (const b of bad) note('verify-game · ' + b.slug, b.name + ' — ' + b.info);
      }
    }
  }

  // ── put the sandbox back ───────────────────────────────────────────────
  group = 'clean-up';
  console.log('\n══ clean-up ' + '═'.repeat(51));
  if (keep) note('the throwaway pages', 'kept (--keep): games/' + list.map(f => f.slug).join('/, games/') + '/');
  else {
    for (const fx of list) {
      const dir = path.join(GAMES_DIR, fx.slug);
      try { if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true }); } catch (e) {}
      check('games/' + fx.slug + '/ is gone', !fs.existsSync(dir), 'the run built it and the run took it away');
    }
  }
  const strays = fs.existsSync(GAMES_DIR) ? fs.readdirSync(GAMES_DIR).filter(n => /^verify-/.test(n)) : [];
  check('nothing named verify-* is left under games/', keep || strays.length === 0, strays.length ? strays.join(', ') : 'none');
  try { fs.rmSync(SCRATCH, { recursive: true, force: true }); } catch (e) {}

  summary.checks = results;
  fs.writeFileSync(path.join(OUT, 'summary.json'), JSON.stringify(summary, null, 1));
  const bad = results.filter(r => r.ok === false);
  const asked = results.filter(r => r.ok !== null).length;
  console.log('\n' + (bad.length ? bad.length + ' FAILED of ' + asked : 'ALL PASS (' + asked + ' checks)'));
  bad.forEach(r => console.log('  FAIL ' + r.group + ' · ' + r.name + ' — ' + r.info));
  for (const fx of list) {
    const t = summary.fixtures[fx.name] && summary.fixtures[fx.name].timing;
    if (t) console.log('  ' + fx.name + ': ' + secs(t.totalMs) + ' machine (read ' + secs(t.readMs) + ', form ' + secs(t.formMs) + ', build ' + secs(t.buildMs) + ') · ' + secs(t.totalHumanMs) + ' with a person typing');
  }
  console.log('results → ' + OUT);
  process.exit(bad.length ? 1 : 0);
})();
