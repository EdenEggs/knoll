/* lab2/test/perf/verify-keep.js — the autosave, through the sandbox's REAL door
   USAGE (from site/, with the sandbox server up on 4322): node lab2/test/perf/verify-keep.js

   Phase 0 found a hazard: keep.js hard-coded '/_lab2/default', so the
   sandbox bench opened on the owner's server (4321) would have posted its
   sections into the LIVE bench's index.html. keep.js now derives its door
   from the address (CONTRACTS.md §0), and lab.js scopes every localStorage
   key to the page's data-lab-page so a game page and the bench, on one
   origin, stop sharing one camera and one set of positions. This is the
   proof of both — and unlike every other script in this folder it does NOT
   block the door. The door here is the sandbox server's own, on 4322, and
   it writes lab2/test/index.html for real; the file is copied to
   results/keep/index.before.html before anything opens, and put back — and
   proved byte-identical — in a finally block, whatever happened in between.
   So it is only ever run against 4322 (the origin is a constant, not an
   argument), and only when nobody else is editing the sandbox page: the
   restore refuses to overwrite a file that has changed in any way this
   script did not cause, and says so.

   WHAT IT ASKS, in order:

     a · THE DOOR. The three lines are lifted out of keep.js itself (the
         text between `const dir = location.pathname` and `'/default';`),
         not copied here, and run in three pages: the bench at /lab2/test/,
         and two addresses that do not exist — /lab2/test/games/abc-1/ and
         /lab2/test/press/ — answered by page.route with a one-line page so
         only location.pathname is real. Expected /_lab2/test/default,
         /_lab2/test/games/abc-1, /_lab2/test/default. On the bench the
         knock itself is watched: every request under /_lab2/ must be to
         /_lab2/test/default, Keep.live must come up true, and the pill
         must have said 'autosave on' (a MutationObserver keeps every text
         the pill wore, because the boot save overwrites it within the
         second).

     b · A DRAG, SAVED. Camera to 100 % over stand-the-pine (Lab.camTo, no
         glide), mouse down on the box's centre, DRAG_PX to the right, up;
         ctrl+s; wait for the door's answer and the pill's 'default saved'.
         Then the file: the pine's data-home-x moved by DRAG_PX / zoom
         world units and its y did not; index.html.keep-bak exists and is
         byte-for-byte index.before.html; and every OTHER section's tag is
         unchanged — except data-home-z, which a drag changes by design
         (lab.js puts what you moved on top of the pile, and everything that
         was above it steps down one), so data-home-z is compared out of the
         tags and then checked on its own: every section's data-home-z must
         equal the rank lab.js reports for it. The boot save that lands
         before the drag is measured too: it may only have added data-home-z
         (the file carried none), nothing else.

     c · PAGE-SCOPED KEYS. Two fresh contexts with the door BLOCKED
         (page.route → 404, nothing is written): one where page.route
         stamps data-lab-page="probe" onto <html> on the way in, one as the
         file stands. Move the pine in each and read localStorage: in the
         first every key starts 'knoll-lab2:probe:' (pos, z and the stores
         seeded at boot among them) and none is bare; in the second the
         keys are bare 'knoll-lab2:…' — the live bench's — and none carries
         ':probe:'.

     d · THE THREE WORDS. On the live-door bench: data-text 'HELLO "quoted"'
         and data-rot -3 set on stand-the-oak by evaluate, ctrl+s, and the
         file's tag must carry data-text="HELLO &quot;quoted&quot;" and
         data-rot="-3" (serve.js escapes the quotes) and nothing else new;
         cleared (delete dataset.text/rot), ctrl+s, both gone — '' means
         DROP (CONTRACTS.md §7). Then the stamp: data-rot 7 set and NO key
         pressed — keep.js's own thirty-second timer must save it (the
         words are in stamp(), so a change in one is a change worth a
         save); cleared and ctrl+s'd away again.

   Every save is read off the wire: a POST to the door is awaited and its
   JSON kept, and a step passes on "some save since the change said
   wrote:true", not "THIS save did" — the timer can land in the gap between
   a change and the ctrl+s that follows it, and then the ctrl+s honestly
   answers 'no change'.

   THE NUMBERS. Viewport 1600 × 1000 in a 1616 × 1110 window, as every
   bench measurement (lab2/perf/verify.js). DRAG_PX 200 — the task's
   number: at 100 % it is two hundred world units, far past any rounding
   and well short of the edge-pan (lab.js edgeWatch) on a 1600-wide bench
   with the pine centred. XY_TOL 2 world units — keep.js rounds a drop to
   a whole unit and toWorld carries a float, one unit either side and one
   more for a y that should not have moved at all. SETTLE 300 ms — a camera
   jump with ms = 0 applies at once, but the part's lift to live and the
   drop's place() land on the following frames; 300 ms is eighteen frames
   at 60 Hz and fifty at the 165 Hz panel here. TIMER_WAIT 31 000 ms —
   keep.js's EVERY is 30 000; a whole period plus a second for the round
   trip, since the tick may have just gone by. SAVE_WAIT 10 000 ms — a
   ctrl+s answers in tens of milliseconds on localhost; ten seconds is
   where a hung door is called a failure. UNLOAD 500 ms before the restore
   — keep.js sends a keepalive POST on pagehide when the stamp moved since
   the last save; the last thing done before closing is a save, so none is
   due, and half a second is the allowance for one anyway, so it cannot
   land after the file was put back.

   Results: results/keep/summary.json, index.before.html, drag.png, probe.png. */
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');

const ORIGIN = 'http://localhost:4322';
const BENCH = ORIGIN + '/lab2/test/';
const HOME = path.resolve(__dirname, '..');                 // lab2/test
const FILE = path.join(HOME, 'index.html');
const BAK = FILE + '.keep-bak';
const TMP = FILE + '.tmp';
const KEEP_SRC = path.join(HOME, 'keep.js');
const OUT = path.join(__dirname, 'results', 'keep');
const BEFORE = path.join(OUT, 'index.before.html');
const DOOR = '/_lab2/test/default';

const DRAG_PX = 200;
const XY_TOL = 2;
const SETTLE = 300;
const TIMER_WAIT = 31000;
const SAVE_WAIT = 10000;
const UNLOAD = 500;

const PINE = 'stand-the-pine', OAK = 'stand-the-oak';

const results = [];
const check = (name, ok, info) => {
  results.push({ name, ok: !!ok, info: info === undefined ? '' : String(info) });
  console.log((ok ? 'PASS ' : 'FAIL ') + name + (info !== undefined ? ' — ' + info : ''));
};
const sleep = ms => new Promise(r => setTimeout(r, ms));

// ── the file, read the way serve.js reads it ──────────────────────────────
// a section's opening tag: data-gizmo="<id>" back to its '<section', forward
// to the '>' that is not inside a quoted value
function tagOf(html, id) {
  const at = html.indexOf('data-gizmo="' + id + '"');
  if (at < 0) return null;
  const start = html.lastIndexOf('<section', at);
  if (start < 0) return null;
  let i = start, q = '';
  for (; i < html.length; i++) {
    const ch = html[i];
    if (q) { if (ch === q) q = ''; continue; }
    if (ch === '"' || ch === "'") { q = ch; continue; }
    if (ch === '>') break;
  }
  return html.slice(start, i + 1);
}
const attrsOf = tag => { const o = {}; tag.replace(/([a-z][a-z0-9-]*)="([^"]*)"/g, (m, k, v) => { o[k] = v; return m; }); return o; };
const gizmosOf = html => { const ids = []; html.replace(/data-gizmo="([^"]+)"/g, (m, id) => { ids.push(id); return m; }); return ids; };
const stripZ = tag => tag.replace(/\s+data-home-z="[^"]*"/g, '');
/* what this run is allowed to have changed, taken out — the pile's
   data-home-z, the oak's two words, the pine's x — so the file before and
   the file after can be asked whether ANYTHING ELSE moved */
function neutral(html) {
  const pine = tagOf(html, PINE);
  if (pine) html = html.replace(pine, pine.replace(/data-home-x="[^"]*"/, 'data-home-x="#"'));
  return html.replace(/\s+data-home-z="[^"]*"/g, '').replace(/\s+data-text="[^"]*"/g, '').replace(/\s+data-rot="[^"]*"/g, '');
}

// ── the three lines, lifted out of keep.js ────────────────────────────────
function doorBlock() {
  const s = fs.readFileSync(KEEP_SRC, 'utf8').replace(/\r\n/g, '\n');
  const m = /  const dir = location\.pathname[\s\S]*?\/default';/.exec(s);
  if (!m) throw new Error('the door derivation was not found in keep.js');
  return m[0].replace(/^  /mg, '');
}

// ── a bench, opened ───────────────────────────────────────────────────────
async function openBench(browser, { door, rewrite } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });
  // the pill's every word, from before keep.js runs: the boot save rewrites
  // it within the second, and 'autosave on' is the one this script wants
  await ctx.addInitScript(() => {
    window.__pill = [];
    const look = () => {
      const p = document.getElementById('lab-keep');
      if (!p) return false;
      const note = () => { const t = p.textContent; if (window.__pill[window.__pill.length - 1] !== t) window.__pill.push(t); };
      new MutationObserver(note).observe(p, { childList: true, characterData: true, subtree: true });
      note();
      return true;
    };
    document.addEventListener('DOMContentLoaded', look);
  });
  const page = await ctx.newPage();
  const A = { ctx, page, consoleErrors: [], pageErrors: [], doorReqs: [], saves: [] };
  page.on('console', m => {
    if (m.type() !== 'error') return;
    const loc = (m.location() && m.location().url) || '';
    if (door === 'blocked' && /Failed to load resource/.test(m.text()) && /\/_lab2\//.test(loc)) return;   // the block, working
    A.consoleErrors.push(m.text() + (loc ? ' @ ' + loc : ''));
  });
  page.on('pageerror', e => A.pageErrors.push(String(e)));
  page.on('request', r => { const u = new URL(r.url()); if (u.pathname.startsWith('/_lab2/')) A.doorReqs.push(r.method() + ' ' + u.pathname); });
  page.on('response', async r => {
    const u = new URL(r.url());
    if (r.request().method() !== 'POST' || u.pathname !== DOOR) return;
    let body = null; try { body = await r.json(); } catch (e) { body = { unreadable: String(e) }; }
    A.saves.push({ t: Date.now(), status: r.status(), body });
  });
  if (door === 'blocked') await page.route('**/_lab2/**', r => r.fulfill({ status: 404, body: 'no' }));
  if (rewrite) await page.route(BENCH, async r => {
    const res = await r.fetch();
    r.fulfill({ response: res, body: rewrite(await res.text()) });
  });
  await page.goto(BENCH, { waitUntil: 'load' });
  await page.waitForFunction(() => window.Lab && window.Frames && window.Keep !== undefined, null, { timeout: 20000 });
  await page.waitForTimeout(1500);
  return A;
}

// the next answer from the door, awaited from BEFORE the thing that causes it
const nextSave = (A, timeout) => A.page.waitForResponse(r => r.request().method() === 'POST' && new URL(r.url()).pathname === DOOR, { timeout: timeout || SAVE_WAIT });
const wroteSince = (A, i) => A.saves.slice(i).some(s => s.body && s.body.ok && s.body.wrote);

// camera to 100 % over a section, a press on its centre, DRAG_PX across, up
async function dragBy(A, id, dx, dy) {
  const before = await A.page.evaluate(id => {
    const el = document.getElementById('gz-' + id);
    const x = parseFloat(el.style.left) || 0, y = parseFloat(el.style.top) || 0, w = el.offsetWidth, h = el.offsetHeight;
    const b = Lab.bench.getBoundingClientRect();
    Lab.camTo(1, b.width / 2 - (x + w / 2), b.height / 2 - (y + h / 2), 0);
    return { x, y };
  }, id);
  await A.page.waitForTimeout(SETTLE);
  const c = await A.page.evaluate(id => {
    const r = document.getElementById('gz-' + id).getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2, zoom: Lab.zoom };
  }, id);
  await A.page.mouse.move(c.x, c.y);
  await A.page.mouse.down();
  await A.page.mouse.move(c.x + dx / 2, c.y + dy / 2, { steps: 6 });
  await A.page.mouse.move(c.x + dx, c.y + dy, { steps: 6 });
  await A.page.mouse.up();
  await A.page.waitForTimeout(SETTLE);
  const after = await A.page.evaluate(id => {
    const el = document.getElementById('gz-' + id);
    return { x: parseFloat(el.style.left) || 0, y: parseFloat(el.style.top) || 0 };
  }, id);
  return { zoom: c.zoom, before, after, centre: { x: c.x, y: c.y } };
}

const ranksOf = A => A.page.evaluate(() => Lab.gizmos.map(g => [g.el.dataset.gizmo, g.rank]));

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const before = fs.readFileSync(FILE);
  fs.writeFileSync(BEFORE, before);
  const bakAtStart = fs.existsSync(BAK);
  if (bakAtStart) console.log('note: ' + BAK + ' already exists — the sandbox server has written once this run already, so no fresh backup can be expected');
  const summary = { date: new Date().toISOString(), origin: ORIGIN, file: FILE, bakAtStart, steps: {} };

  const browser = await chromium.launch({ channel: 'chrome', headless: false, args: ['--window-size=1616,1110', '--window-position=0,0'] });
  let A = null, B = null, C = null;
  try {
    const block = doorBlock();
    const derive = page => page.evaluate('(() => {' + block + '\nreturn DOOR; })()');

    // ── a · the door ──────────────────────────────────────────────────────
    A = await openBench(browser, { door: 'live' });
    await A.page.waitForFunction(() => window.Keep && Keep.live, null, { timeout: 10000 }).catch(() => {});
    // the boot save: keep.js pushes once the knock is answered
    if (!A.saves.length) await nextSave(A).catch(() => {});
    await A.page.waitForTimeout(SETTLE);
    const bootSaves = A.saves.length;
    const pill = await A.page.evaluate(() => ({ log: window.__pill || [], now: (document.getElementById('lab-keep') || {}).textContent, live: !!(window.Keep && Keep.live) }));
    check('a · Keep.live is true on /lab2/test/', pill.live, 'pill now: ' + JSON.stringify(pill.now));
    check("a · the pill said 'autosave on'", pill.log.indexOf('autosave on') >= 0, 'pill wore: ' + JSON.stringify(pill.log));
    check('a · every knock went to ' + DOOR, A.doorReqs.length > 0 && A.doorReqs.every(r => r.endsWith(' ' + DOOR)), A.doorReqs.join(', '));
    check('a · the first knock was a GET', A.doorReqs[0] === 'GET ' + DOOR, A.doorReqs[0]);
    const dA = await derive(A.page);
    check('a · /lab2/test/ derives ' + DOOR, dA === DOOR, dA);
    for (const [p, want] of [['/lab2/test/games/abc-1/', '/_lab2/test/games/abc-1'], ['/lab2/test/press/', DOOR]]) {
      const pg = await A.ctx.newPage();
      await pg.route(ORIGIN + p, r => r.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>probe</title><p>probe' }));
      await pg.goto(ORIGIN + p);
      const got = await derive(pg);
      check('a · ' + p + ' derives ' + want, got === want, got + ' (pathname ' + await pg.evaluate(() => location.pathname) + ')');
      await pg.close();
    }
    const base = fs.readFileSync(FILE, 'utf8');
    const bootWrote = A.saves.slice(0, bootSaves).map(s => s.body && s.body.wrote);
    check('a · the boot save changed nothing but data-home-z', neutral(base) === neutral(before.toString()), 'boot saves: ' + JSON.stringify(bootWrote) + ', sections ' + gizmosOf(base).length);
    summary.steps.a = { doorReqs: A.doorReqs.slice(), pill: pill.log, bootSaves: A.saves.slice(0, bootSaves).map(s => s.body) };

    // ── b · a drag, saved ─────────────────────────────────────────────────
    const i0 = A.saves.length;
    const d = await dragBy(A, PINE, DRAG_PX, 0);
    const wantDx = DRAG_PX / d.zoom;
    check('b · zoom is 1 for the drag', Math.abs(d.zoom - 1) < 1e-6, 'zoom=' + d.zoom);
    check('b · the pine moved ' + DRAG_PX + '/zoom on the page', Math.abs((d.after.x - d.before.x) - wantDx) <= XY_TOL && Math.abs(d.after.y - d.before.y) <= XY_TOL,
          'from ' + d.before.x + ',' + d.before.y + ' to ' + d.after.x + ',' + d.after.y + ' (want +' + wantDx + ',0)');
    await A.page.screenshot({ path: path.join(OUT, 'drag.png') });
    let sv = nextSave(A);
    await A.page.keyboard.press('Control+s');
    let out = await sv.then(r => r.json()).catch(e => ({ error: String(e) }));
    check('b · ctrl+s answered from the door', out && out.ok === true, JSON.stringify(out));
    check('b · a save since the drag wrote the file', wroteSince(A, i0), A.saves.slice(i0).map(s => JSON.stringify(s.body)).join(' | '));
    await A.page.waitForFunction(() => /^default saved/.test((document.getElementById('lab-keep') || {}).textContent || ''), null, { timeout: SAVE_WAIT }).catch(() => {});
    const pillB = await A.page.evaluate(() => document.getElementById('lab-keep').textContent);
    check("b · the pill says 'default saved'", /^default saved/.test(pillB), pillB);
    const after1 = fs.readFileSync(FILE, 'utf8');
    const pineB = attrsOf(tagOf(base, PINE)), pineA = attrsOf(tagOf(after1, PINE));
    check('b · the file: the pine\'s data-home-x moved by ~' + wantDx, Math.abs((+pineA['data-home-x'] - +pineB['data-home-x']) - wantDx) <= XY_TOL,
          pineB['data-home-x'] + ' → ' + pineA['data-home-x']);
    check('b · the file: the pine\'s data-home-y stayed', Math.abs(+pineA['data-home-y'] - +pineB['data-home-y']) <= XY_TOL, pineB['data-home-y'] + ' → ' + pineA['data-home-y']);
    const bakNow = fs.existsSync(BAK);
    check('b · index.html.keep-bak exists', bakNow, bakNow ? BAK : 'missing' + (bakAtStart ? ' (it existed before the run)' : ''));
    check('b · index.html.keep-bak equals index.before.html', bakNow && Buffer.compare(fs.readFileSync(BAK), before) === 0,
          bakNow ? fs.statSync(BAK).size + ' bytes against ' + before.length : 'no backup to compare' + (bakAtStart ? '' : ' — the server writes one only the first time it writes a file in its run; if it wrote before this script ran, restart it'));
    const ids = gizmosOf(base);
    check('b · the same sections, in the same order', JSON.stringify(gizmosOf(after1)) === JSON.stringify(ids), ids.length + ' sections');
    const changed = ids.filter(id => id !== PINE && stripZ(tagOf(after1, id)) !== stripZ(tagOf(base, id)));
    check('b · no other section\'s attributes changed (data-home-z aside)', changed.length === 0, changed.length ? 'changed: ' + changed.join(', ') : (ids.length - 1) + ' tags identical');
    const ranks = await ranksOf(A);
    const zBad = ranks.filter(([id, r]) => { const t = tagOf(after1, id); return !t || attrsOf(t)['data-home-z'] !== String(r); });
    check('b · every data-home-z is the rank lab.js reports', ranks.length === ids.length && zBad.length === 0,
          zBad.length ? 'off: ' + zBad.map(([id, r]) => id + ' page=' + r + ' file=' + (attrsOf(tagOf(after1, id) || '')['data-home-z'])).join(', ') : 'pine now rank ' + ranks.find(r => r[0] === PINE)[1] + ' of ' + ranks.length);
    summary.steps.b = { drag: d, saves: A.saves.slice(i0).map(s => s.body), pine: { before: pineB, after: pineA }, ranks };

    // ── d · the three words (on the same bench, before the door goes) ─────
    const oak0 = tagOf(after1, OAK);
    await A.page.evaluate(id => { const el = document.getElementById('gz-' + id); el.dataset.text = 'HELLO "quoted"'; el.dataset.rot = '-3'; }, OAK);
    const looked = await A.page.evaluate(id => { const g = Keep.look().find(g => g.gizmo === id); return { palette: g.palette, text: g.text, rot: g.rot }; }, OAK);
    check('d · Keep.look() reports the three words as strings', looked.palette === '' && looked.text === 'HELLO "quoted"' && looked.rot === '-3', JSON.stringify(looked));
    const i1 = A.saves.length;
    sv = nextSave(A); await A.page.keyboard.press('Control+s'); out = await sv.then(r => r.json()).catch(e => ({ error: String(e) }));
    check('d · ctrl+s after setting text/rot: a save wrote', out && out.ok && wroteSince(A, i1), JSON.stringify(out));
    const after2 = fs.readFileSync(FILE, 'utf8');
    const oak2 = tagOf(after2, OAK), oakA2 = attrsOf(oak2);
    check('d · the file\'s tag carries data-text, quotes escaped', oak2.indexOf('data-text="HELLO &quot;quoted&quot;"') >= 0, oak2.replace(/\s+/g, ' ').slice(0, 220));
    check('d · the file\'s tag carries data-rot="-3"', oakA2['data-rot'] === '-3', 'data-rot=' + JSON.stringify(oakA2['data-rot']));
    check('d · nothing else on the oak\'s tag changed', oak2.replace(/\s+data-text="[^"]*"/, '').replace(/\s+data-rot="[^"]*"/, '') === oak0, '');
    await A.page.evaluate(id => { const el = document.getElementById('gz-' + id); delete el.dataset.text; delete el.dataset.rot; }, OAK);
    const i2 = A.saves.length;
    sv = nextSave(A); await A.page.keyboard.press('Control+s'); out = await sv.then(r => r.json()).catch(e => ({ error: String(e) }));
    check('d · ctrl+s after clearing: a save wrote', out && out.ok && wroteSince(A, i2), JSON.stringify(out));
    const after3 = fs.readFileSync(FILE, 'utf8');
    const oak3 = tagOf(after3, OAK);
    check('d · data-text and data-rot are gone from the tag', oak3.indexOf('data-text=') < 0 && oak3.indexOf('data-rot=') < 0 && oak3 === oak0, oak3 === oak0 ? 'the tag is as it was' : oak3.replace(/\s+/g, ' ').slice(0, 220));
    // the stamp: a word changed is a change the TIMER saves — no key pressed
    await A.page.evaluate(id => { document.getElementById('gz-' + id).dataset.rot = '7'; }, OAK);
    const i3 = A.saves.length, t3 = Date.now();
    const timer = await nextSave(A, TIMER_WAIT).then(r => r.json()).catch(e => ({ error: String(e) }));
    check('d · the timer saved a changed data-rot on its own (stamp)', timer && timer.ok && wroteSince(A, i3), JSON.stringify(timer) + ' after ' + (Date.now() - t3) + ' ms');
    const after4 = fs.readFileSync(FILE, 'utf8');
    check('d · the file carries data-rot="7" from the timer\'s save', attrsOf(tagOf(after4, OAK) || '')['data-rot'] === '7', 'data-rot=' + JSON.stringify(attrsOf(tagOf(after4, OAK) || '')['data-rot']));
    await A.page.evaluate(id => { delete document.getElementById('gz-' + id).dataset.rot; }, OAK);
    const i4 = A.saves.length;
    sv = nextSave(A); await A.page.keyboard.press('Control+s'); out = await sv.then(r => r.json()).catch(e => ({ error: String(e) }));
    const after5 = fs.readFileSync(FILE, 'utf8');
    check('d · cleared again and saved: the tag is as it was', out && out.ok && wroteSince(A, i4) && tagOf(after5, OAK) === oak0, JSON.stringify(out));
    check('a–d · no page errors on the live-door bench', A.pageErrors.length === 0, A.pageErrors.join(' | ') || 'none');
    check('a–d · no console errors on the live-door bench', A.consoleErrors.length === 0, A.consoleErrors.slice(0, 5).join(' | ') || 'none');
    summary.steps.d = { saves: A.saves.slice(i1).map(s => s.body), oak: { before: oak0, set: oak2, cleared: oak3 } };
    await A.ctx.close(); A = null;

    // ── c · page-scoped keys, door blocked ────────────────────────────────
    B = await openBench(browser, { door: 'blocked', rewrite: html => html.replace('<html lang="en">', '<html lang="en" data-lab-page="probe">') });
    const stamped = await B.page.evaluate(() => ({ page: document.documentElement.dataset.labPage, key: Lab.storeKey('x'), live: !!(window.Keep && Keep.live) }));
    check('c · the probe page carries data-lab-page="probe"', stamped.page === 'probe', JSON.stringify(stamped));
    check("c · Lab.storeKey('x') is knoll-lab2:probe:x", stamped.key === 'knoll-lab2:probe:x', stamped.key);
    check('c · the blocked door kept Keep quiet', stamped.live === false, 'Keep.live=' + stamped.live);
    await dragBy(B, PINE, 100, 0);
    await B.page.screenshot({ path: path.join(OUT, 'probe.png') });
    const keysB = await B.page.evaluate(() => Object.keys(localStorage).sort());
    const bareB = keysB.filter(k => !k.startsWith('knoll-lab2:probe:'));
    check('c · every key is knoll-lab2:probe:… (' + keysB.length + ' keys)', keysB.length > 0 && bareB.length === 0, bareB.length ? 'bare: ' + bareB.join(', ') : keysB.join(', '));
    check('c · the moved pine is under knoll-lab2:probe:pos: and :z:', keysB.indexOf('knoll-lab2:probe:pos:' + PINE) >= 0 && keysB.indexOf('knoll-lab2:probe:z:' + PINE) >= 0, '');
    check('c · the boot-seeded stores are scoped too', ['copies', 'gone', 'wall', 'tape'].every(k => keysB.indexOf('knoll-lab2:probe:' + k) >= 0), keysB.filter(k => !/:(pos|z):/.test(k)).join(', '));
    check('c · no page errors on the probe page', B.pageErrors.length === 0 && B.consoleErrors.length === 0, (B.pageErrors.concat(B.consoleErrors)).slice(0, 5).join(' | ') || 'none');
    summary.steps.c = { probeKeys: keysB };
    await B.ctx.close(); B = null;

    C = await openBench(browser, { door: 'blocked' });
    const bare = await C.page.evaluate(() => ({ page: document.documentElement.dataset.labPage, key: Lab.storeKey('x') }));
    check("c · without the attribute Lab.storeKey('x') is knoll-lab2:x", bare.page === undefined && bare.key === 'knoll-lab2:x', JSON.stringify(bare));
    await dragBy(C, PINE, 100, 0);
    const keysC = await C.page.evaluate(() => Object.keys(localStorage).sort());
    const offC = keysC.filter(k => !k.startsWith('knoll-lab2:') || k.indexOf(':probe:') >= 0);
    check('c · in a fresh context the keys are bare knoll-lab2:… (' + keysC.length + ' keys)', keysC.length > 0 && offC.length === 0 && keysC.indexOf('knoll-lab2:pos:' + PINE) >= 0, offC.length ? 'off: ' + offC.join(', ') : keysC.join(', '));
    summary.steps.c.bareKeys = keysC;
    await C.ctx.close(); C = null;
  } catch (e) {
    check('the run itself', false, String(e && e.stack || e));
  } finally {
    for (const X of [A, B, C]) if (X) { try { await X.ctx.close(); } catch (e) {} }
    try { await browser.close(); } catch (e) {}
    await sleep(UNLOAD);
    // ── put the file back, and prove it ───────────────────────────────────
    const now = fs.readFileSync(FILE);
    const mine = neutral(now.toString()) === neutral(before.toString());
    if (mine) fs.writeFileSync(FILE, before);
    check('restore: only this run\'s edits were on the file', mine, mine ? 'restored from index.before.html' : 'NOT restored — index.html changed in a way this script did not make; index.before.html is in results/keep/');
    try { if (fs.existsSync(BAK)) fs.unlinkSync(BAK); } catch (e) {}
    try { if (fs.existsSync(TMP)) fs.unlinkSync(TMP); } catch (e) {}
    await sleep(UNLOAD);
    check('restore: index.html is byte-identical to before', Buffer.compare(fs.readFileSync(FILE), before) === 0, before.length + ' bytes');
    check('restore: index.html.keep-bak is gone', !fs.existsSync(BAK), BAK);
    summary.checks = results;
    fs.writeFileSync(path.join(OUT, 'summary.json'), JSON.stringify(summary, null, 2));
    const bad = results.filter(r => !r.ok).length;
    console.log(bad ? bad + ' FAILED' : 'ALL PASS (' + results.length + ' checks)');
    console.log('results → ' + OUT);
    process.exit(bad ? 1 : 0);
  }
})();
