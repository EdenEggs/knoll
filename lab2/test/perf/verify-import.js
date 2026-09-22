#!/usr/bin/env node
/* ─── VERIFY-IMPORT ────────────────────────────────────────────────────────
   perf/verify-import.js — PRESS-TABLE-PLAN.md §12 3 and §12 5, end to end.
   Both halves of Phase 8 existed before this ran and neither had ever met
   the other: `api/intake.js` files a publisher's bundle under a token, and
   `press/import.js` is the owner's field that pulls one back. The plan's own
   acceptance line for the phase is one sentence — "a publisher with a link
   and no account can submit; the owner can import and build" — and this
   script is that sentence, done, with a ledger.

   THE LOOP, in the order it happens. Nothing here is a mock: every request
   goes over a socket to a real `lab2/test/serve.js`, which mounts the real
   `api/intake.js` the way Vercel would.

     1. a server of this script's own, on a port the OS picks, with
        INTAKE_SECRET in ITS environment (see THE PORT);
     2. the Press Table in PUBLISHER mode — the door blocked in the page, the
        way a deployed host has no door — takes the pixelfort fixture's six
        plates and its manifest.json, reads them, and presses SEND TO KNOLL;
     3. the token that comes back is a real token: the folder is on disk;
     4. the Press Table in OWNER mode, in a context of its own with nothing
        in its storage, meets the import field: locked, then wrong-secreted,
        then unlocked, then LIST, then the row clicked;
     5. the words, the roles and the six pictures arrive as if they had been
        dropped, "from fixture, <date>" is on the panel, and
     6. BUILD writes `games/verify-import/`, which the server then serves.

   THE PORT. The sandbox server on 4322 is shared with every other phase and
   was started without a secret, so the owner's two doors answer 503 there —
   which is the right behaviour and useless for this test. `test-intake.js`
   already found the answer to that and this borrows it: set the secret in
   THIS process's environment and start a second `serve.js` in it on port 0.
   The OS picks a free port, so this script cannot collide with 4322, with
   the live bench's 4321, or with another agent's run of itself. Two things
   are asserted about that rather than assumed: the port is not 4322, and
   the door on it answers.

   WHAT IT WRITES AND WHAT IT PUTS BACK. One intake token (recorded the
   moment it is handed back) and one `games/verify-import/`. The `finally`
   deletes both, and it deletes the token ONLY if the name matches the
   22-character shape and is the one this run recorded — the folder beside it
   may be somebody's real bundle. `--keep` leaves both, and says so. Nothing
   that existed when the script started is opened for writing: `verify-import`
   is a slug nobody else owns, and the first build of a fresh slug takes no
   `index.html.keep-bak` (serve.js only backs up a page that already exists),
   so this run spends none of the one-backup-per-process budget either.

   THE SECRET IS WATCHED, NOT JUST USED. `api/intake.js` says in capitals
   that the secret goes in a header and NEVER in the query string. Three
   checks hold the pair to it: every request the owner's page makes is
   recorded and none of them may carry the secret in its URL; the two GETs
   to the intake door must carry `x-intake-secret`; and a GET with the
   secret in the query string and no header must be a 401 — the query
   string is not a second door.

   AND WHERE THE SECRET LIVES. sessionStorage, this tab, nothing else. The
   test reads both stores after the unlock: the key must be in
   sessionStorage and there must be no trace of it in localStorage, which is
   where press.js keeps the draft form and which survives the browser being
   closed.

   THE NUMBERS
     VIEW 1600 × 1000 — `perf/verify-press.js`'s viewport, so a screenshot
       from here sits beside one from there.
     READ_MS 120000 — verify-press.js's, and for its reason: the sticker
       sheet is 224 KB and three mockups extract it, the measured read is
       three to six seconds, and this is a hang detector rather than a bar.
     BUILD_MS 180000 — verify-press.js's wait on the build door.
     ASSETS 6 — the pixelfort fixture's own plate count (one logo, one
       portrait key art, four screenshots), asserted as an equality because
       five pictures arriving out of six is the failure this whole script
       exists to catch.

   USAGE (from site/ — the folder with serve.js):

       node lab2/test/perf/verify-import.js
       node lab2/test/perf/verify-import.js --keep       # leave the token and the built page
       node lab2/test/perf/verify-import.js --headless   # no window (the default is headed, house rule)

   It does NOT need the server on 4322 and does not touch it. Exit 1 on any
   failed check. Results: results/import/summary.json and its PNGs.
   ───────────────────────────────────────────────────────────────────────── */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { chromium } = require('playwright');

const TEST = path.resolve(__dirname, '..');                    // …/lab2/test
const OUT = path.join(__dirname, 'results', 'import');
const GAMES_DIR = path.join(TEST, 'games');
const FIXTURE = path.join(TEST, 'press', 'fixtures', 'pixelfort');
const INTAKE_ROOT = path.join(TEST, 'press', 'cache', 'intake');
const SLUG = 'verify-import';

const VIEW = { width: 1600, height: 1000 };
const READ_MS = 120000;
const BUILD_MS = 180000;
const ASSETS = 6;
const TOKEN_RE = /^[A-Za-z0-9_-]{22}$/;

const KEEP = process.argv.includes('--keep');
const HEADLESS = process.argv.includes('--headless');

/* The secret this run's server is started with. Random, so a run cannot
   pass by accident on a secret somebody left in an environment, and so the
   "wrong secret" attack below can be the SAME LENGTH — which is the only
   kind of wrong secret that tests the constant-time compare at all. */
const SECRET = 'verify-' + crypto.randomBytes(12).toString('hex');
const WRONG = 'verify-' + crypto.randomBytes(12).toString('hex');
process.env.INTAKE_SECRET = SECRET;

// serve.js is required AFTER the variable is set; it reads it per request,
// but requiring it second is what makes that ordering obvious to a reader
const SERVE = require(path.join(TEST, 'serve.js'));

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
const head = t => { group = t; console.log('\n' + t); };
const sleep = ms => new Promise(r => setTimeout(r, ms));

// ── the page ──────────────────────────────────────────────────────────────
/* One Press Table in a context of its own, with the console, the page
   errors and every request on the record — the URL and the headers both,
   because the headers are half of what this script is checking. */
async function openPress(browser, origin, opts) {
  opts = opts || {};
  const ctx = await browser.newContext({ viewport: VIEW, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const bag = { ctx, page, errors: [], reqs: [] };
  /* THE KNOCK'S OWN 404 IS NOT AN ERROR. Publisher mode is made by answering
     `/_lab2/test/default` with a 404 (below), and Chrome logs every 404 to
     the console whether the page cared or not — press.js's knock is supposed
     to meet one, and so is import.js's. Those two lines are excluded BY URL,
     which is the only way to exclude exactly them; everything else on the
     console still counts. */
  page.on('console', m => {
    if (m.type() !== 'error') return;
    const url = (m.location() && m.location().url) || '';
    if (opts.noDoor && /\/_lab2\/test\/default$/.test(url)) return;
    bag.errors.push('console: ' + m.text() + (url ? ' [' + url + ']' : ''));
  });
  page.on('pageerror', e => bag.errors.push('page: ' + ((e && e.message) || e)));
  page.on('request', r => { bag.reqs.push({ url: r.url(), method: r.method(), headers: r.headers() }); });
  /* PUBLISHER MODE is made the way a deployed host makes it: the door is not
     there. 404 is exactly what serve.js answers for every /_lab2 path that
     is not one of its own doors, and what Vercel answers for all of them. */
  if (opts.noDoor) {
    await page.route('**/_lab2/test/default', route =>
      route.fulfill({ status: 404, contentType: 'application/json', body: '{"ok":false,"error":"no door here"}' }));
  }
  await page.goto(origin + '/lab2/test/press/', { waitUntil: 'load' });
  await page.evaluate(() => { try { localStorage.clear(); sessionStorage.clear(); } catch (e) {} });
  await page.goto(origin + '/lab2/test/press/', { waitUntil: 'load' });
  await page.waitForFunction(() => window.Press && window.Press.state.mode !== 'knocking', null, { timeout: 30000 });
  /* And then wait for the IMPORT FIELD to have made its own decision.
     `PressImport.mount()` awaits the same knock press.js does but polls it on
     its own 60 ms tick, so `Press.state.mode` settling is a moment BEFORE
     the panel exists (or is decided not to). `mode()` is null until then. */
  await page.waitForFunction(() => window.PressImport && window.PressImport.mode() !== null, null, { timeout: 30000 });
  return bag;
}

/* The reading is done when press.js has three cards and preview.js has
   painted three papers — verify-press.js's own predicate, so "read" means
   the same thing in both scripts. */
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
}

const artOf = () => fs.readdirSync(path.join(FIXTURE, 'art')).sort().map(f => path.join(FIXTURE, 'art', f));

// ── the run ───────────────────────────────────────────────────────────────
async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const manifest = JSON.parse(fs.readFileSync(path.join(FIXTURE, 'manifest.json'), 'utf8'));

  let server = null, browser = null, token = null, built = false;
  try {
    /* ══ 1 · A SERVER OF THIS RUN'S OWN ═════════════════════════════════ */
    head('1 · the server, on a free port, with the secret in its environment');
    server = SERVE.listen(0, true);
    await new Promise((res, rej) => { server.once('listening', res); server.once('error', rej); });
    const port = server.address().port;
    const ORIGIN = 'http://localhost:' + port;
    check('a second sandbox server is up on a port the OS picked', port > 0 && port !== 4322,
      'port ' + port + ' (4322 is another agent\'s and is not touched)');
    check('INTAKE_SECRET is set in this process, so the owner\'s doors are open', !!process.env.INTAKE_SECRET,
      SECRET.length + ' characters, random per run');

    const door = await fetch(ORIGIN + '/_lab2/test/default').then(r => r.json()).catch(() => null);
    check('the door on that port answers, so the page will be in owner mode', !!(door && door.door), JSON.stringify(door));

    /* The query string is not a second door — api/intake.js's own capitals. */
    const viaQuery = await fetch(ORIGIN + '/_lab2/test/intake?list=1&secret=' + encodeURIComponent(SECRET));
    const viaQueryJson = await viaQuery.json().catch(() => null);
    check('the secret in the QUERY STRING is not a door (401, not 200)', viaQuery.status === 401 && viaQueryJson && viaQueryJson.code === 'unauthorized',
      viaQuery.status + ' ' + ((viaQueryJson && viaQueryJson.code) || '?'));
    const viaHeader = await fetch(ORIGIN + '/_lab2/test/intake?list=1', { headers: { 'x-intake-secret': SECRET } });
    check('the secret in the HEADER is', viaHeader.status === 200, 'HTTP ' + viaHeader.status);

    browser = await chromium.launch({ channel: 'chrome', headless: HEADLESS, args: ['--window-size=1616,1110', '--window-position=0,0'] });

    /* ══ 2 · PUBLISHER MODE SENDS ONE ═══════════════════════════════════ */
    head('2 · publisher mode: a folder of art and a manifest, then SEND TO KNOLL');
    const P = await openPress(browser, ORIGIN, { noDoor: true });
    const pmode = await P.page.evaluate(() => window.Press.state.mode);
    check('with no door the table is in PUBLISHER mode', pmode === 'publisher', pmode);

    /* The field is the owner's. This is the check that says a stranger's
       page never shows an import box to guess tokens at. */
    const pPanel = await P.page.evaluate(() => {
      const host = document.getElementById('pt-import-mount');
      return { host: !!host, hidden: host ? host.hidden : null, kids: host ? host.children.length : -1,
               panel: !!document.getElementById('pt-import'), mode: window.PressImport ? window.PressImport.mode() : 'no PressImport' };
    });
    check('publisher mode draws NO import field', pPanel.host && pPanel.panel === false && pPanel.kids === 0 && pPanel.hidden === true,
      'mount div present and empty, PressImport.mode() ' + pPanel.mode);

    await P.page.setInputFiles('#pt-files', [path.join(FIXTURE, 'manifest.json')].concat(artOf()));
    /* Every asset, WITH a role and an id: `addFiles` pushes the decoded
       pictures before it classifies them, so a wait on the count alone can
       land between the two and read six blank roles. */
    await P.page.waitForFunction(n => {
      const S = window.Press.state;
      return S.assets.length === n && S.assets.every(a => a.role && a.id);
    }, ASSETS, { timeout: 60000 });
    await waitRead(P.page);
    check('the manifest and ' + ASSETS + ' plates read into the publisher\'s form',
      (await P.page.evaluate(() => window.Press.state.assets.length)) === ASSETS,
      'title "' + (await P.page.$eval('#f-title', n => n.value)) + '", rights ' + (await P.page.$eval('#f-rights', n => n.checked)));

    /* The slug is retyped so the build at the end of this script writes a
       folder nobody owns. It is typed, not set, because press.js's store
       listens on `input`. */
    await P.page.fill('#f-slug', SLUG);
    await sleep(600);
    check('the slug is retyped to ' + SLUG + ', so nothing real is overwritten',
      (await P.page.evaluate(() => window.Press.words.get().slug)) === SLUG, SLUG);

    const label = await P.page.$eval('#pt-build', n => n.textContent.trim());
    check('the button says SEND TO KNOLL', label === 'SEND TO KNOLL', label);
    await P.page.waitForFunction(() => !document.getElementById('pt-build').disabled, null, { timeout: 30000 });
    await P.page.click('#pt-build');
    await P.page.waitForFunction(() => /Your token is [A-Za-z0-9_-]{22}/.test(document.getElementById('pt-say').textContent), null, { timeout: BUILD_MS });
    const said = await P.page.$eval('#pt-say', n => n.textContent.trim());
    token = (/Your token is ([A-Za-z0-9_-]{22})/.exec(said) || [])[1] || null;
    check('the intake door answered with a 22-character token', !!token && TOKEN_RE.test(token), token || said.slice(0, 120));
    await P.page.screenshot({ path: path.join(OUT, 'publisher-sent.png') });

    const dir = token ? path.join(INTAKE_ROOT, token) : '';
    const onDisk = !!token && fs.existsSync(path.join(dir, 'bundle.json')) && fs.existsSync(path.join(dir, 'meta.json'));
    check('the bundle is on disk under that token', onDisk,
      onDisk ? fs.readdirSync(dir).join(', ') + ' · art: ' + fs.readdirSync(path.join(dir, 'art')).length + ' files' : 'nothing at ' + dir);
    check('publisher mode raised no console or page error', P.errors.length === 0, P.errors.slice(0, 3).join(' | ') || 'none');
    await P.ctx.close();
    if (!token) throw new Error('no token came back, so there is nothing to import');

    /* ══ 3 · OWNER MODE MEETS THE FIELD ═════════════════════════════════ */
    head('3 · owner mode: the import field, locked');
    const O = await openPress(browser, ORIGIN, {});
    const omode = await O.page.evaluate(() => window.Press.state.mode);
    check('with a door the table is in OWNER mode', omode === 'owner', omode);

    const where = await O.page.evaluate(() => {
      const p = document.getElementById('pt-import');
      const host = document.getElementById('pt-import-mount');
      const drop = document.getElementById('pt-drop-card');
      return {
        panel: !!p,
        inHost: !!(p && host && p.parentNode === host),
        inLeft: !!(host && host.parentNode && host.parentNode.classList.contains('pt-left')),
        beforeDrop: !!(host && drop && (host.compareDocumentPosition(drop) & Node.DOCUMENT_POSITION_FOLLOWING)),
        state: (document.querySelector('#pt-import .pt-tag-note') || {}).textContent,
        listDisabled: document.getElementById('pi-list').disabled,
        getDisabled: document.getElementById('pi-get').disabled,
        intake: window.PressImport.INTAKE
      };
    });
    check('the panel is drawn in #pt-import-mount', where.panel && where.inHost, 'the documented element id');
    check('and the mount div was moved to the top of the left column', where.inLeft && where.beforeDrop, 'above "1 · the art"');
    check('the intake door it derived is the sandbox\'s', where.intake === '/_lab2/test/intake', where.intake);
    check('with no secret the field is LOCKED and both buttons are dead', where.listDisabled && where.getDisabled,
      'the tag reads "' + where.state + '"');

    head('4 · a wrong secret of the same length');
    await O.page.fill('#pi-secret', WRONG);
    await O.page.click('#pi-unlock');
    await O.page.click('#pi-list');
    await O.page.waitForFunction(() => /not the secret/.test(document.getElementById('pi-said').textContent), null, { timeout: 15000 })
      .catch(() => {});
    const afterWrong = await O.page.evaluate(() => ({
      said: document.getElementById('pi-said').textContent,
      bad: document.getElementById('pi-said').classList.contains('bad'),
      relocked: document.getElementById('pi-list').disabled,
      kept: (() => { try { return sessionStorage.getItem('knoll-press:intake-secret'); } catch (e) { return 'threw'; } })(),
      rows: document.getElementById('pi-rows').hidden
    }));
    check('a wrong secret is refused, and the field re-locks', /not the secret/.test(afterWrong.said) && afterWrong.bad && afterWrong.relocked,
      '"' + afterWrong.said + '"');
    check('and the wrong secret is not left in the tab', !afterWrong.kept, String(afterWrong.kept));
    check('nothing was listed', afterWrong.rows, 'the rows stayed hidden');

    head('5 · the right secret, and where it is kept');
    await O.page.fill('#pi-secret', SECRET);
    await O.page.click('#pi-unlock');
    const stores = await O.page.evaluate(k => {
      const ss = (() => { try { return sessionStorage.getItem(k); } catch (e) { return null; } })();
      const ls = (() => { try { return Object.keys(localStorage).map(n => n + '=' + localStorage.getItem(n)).join('\n'); } catch (e) { return ''; } })();
      return { ss: ss, lsKeys: (() => { try { return Object.keys(localStorage); } catch (e) { return []; } })(), lsBlob: ls };
    }, 'knoll-press:intake-secret');
    check('the secret is in sessionStorage — this tab only', stores.ss === SECRET, 'knoll-press:intake-secret is set');
    check('and NOWHERE in localStorage', stores.lsBlob.indexOf(SECRET) < 0,
      'localStorage holds ' + stores.lsKeys.length + ' key' + (stores.lsKeys.length === 1 ? '' : 's') + ', none of them the secret');
    check('the panel says where it lives and how long a bundle is kept',
      /sessionStorage/.test(await O.page.$eval('#pi-fine', n => n.textContent)) &&
      /30 days/.test(await O.page.$eval('#pi-fine', n => n.textContent)) &&
      /by hand/.test(await O.page.$eval('#pi-fine', n => n.textContent)),
      '"' + (await O.page.$eval('#pi-fine', n => n.textContent)).replace(/\s+/g, ' ').slice(0, 150) + '…"');

    head('6 · the list, behind the same secret');
    await O.page.click('#pi-list');
    await O.page.waitForFunction(t => {
      const rows = document.querySelectorAll('#pi-rows .pi-take code');
      for (const c of rows) if (c.textContent === t) return true;
      return false;
    }, token, { timeout: 20000 });
    const row = await O.page.evaluate(t => {
      for (const b of document.querySelectorAll('#pi-rows .pi-take')) {
        if (b.querySelector('code').textContent !== t) continue;
        return { title: b.querySelector('strong').textContent, meta: b.querySelector('em').textContent };
      }
      return null;
    }, token);
    check('the token is in the listing with its title, date and size', !!row && row.title === 'Pixelfort' && /\d/.test(row.meta),
      row ? '"' + row.title + '" — ' + row.meta : 'not listed');
    check('the listing is drawn from the door and not from the page',
      /intake/.test((await O.page.$eval('#pi-said', n => n.textContent))), '"' + (await O.page.$eval('#pi-said', n => n.textContent)) + '"');
    await O.page.locator('#pt-import').screenshot({ path: path.join(OUT, 'import-list.png') });

    head('7 · two tokens that are not this one');
    await O.page.fill('#pi-token', 'nope');
    await O.page.click('#pi-get');
    await sleep(400);
    const shortSaid = await O.page.$eval('#pi-said', n => n.textContent);
    check('a token that is not 22 characters is refused before a request is made', /22 base64url characters/.test(shortSaid),
      '"' + shortSaid + '"');
    const ghost = crypto.randomBytes(16).toString('base64url');
    await O.page.fill('#pi-token', ghost);
    await O.page.click('#pi-get');
    await O.page.waitForFunction(() => /no intake under that token/.test(document.getElementById('pi-said').textContent), null, { timeout: 15000 })
      .catch(() => {});
    const ghostSaid = await O.page.$eval('#pi-said', n => n.textContent);
    check('a well-formed token that is nobody\'s is a 404 with a sentence', /no intake under that token/.test(ghostSaid),
      '"' + ghostSaid + '"');
    check('and nothing was loaded by either of them', (await O.page.evaluate(() => window.Press.state.assets.length)) === 0, '0 pictures on the table');

    /* ══ 8 · THE IMPORT ═════════════════════════════════════════════════ */
    head('8 · the row clicked: the bundle arrives as if it had been dropped');
    await O.page.evaluate(t => {
      for (const b of document.querySelectorAll('#pi-rows .pi-take')) if (b.querySelector('code').textContent === t) { b.click(); return; }
      throw new Error('the row for ' + t + ' is not there');
    }, token);
    /* The same wait as the publisher leg, plus the credit line: `#pi-from`
       is written only after the hand-over has RESOLVED, so waiting on it is
       waiting for import.js to have finished rather than for press.js to
       have started. */
    await O.page.waitForFunction(n => {
      const S = window.Press.state;
      const f = document.getElementById('pi-from');
      return S.assets.length === n && S.assets.every(a => a.role && a.id) && f && !f.hidden;
    }, ASSETS, { timeout: 60000 });

    const got = await O.page.evaluate(() => {
      const S = window.Press.state;
      const v = id => (document.getElementById(id) || {}).value;
      return {
        assets: S.assets.map(a => ({ id: a.id, name: a.name, role: a.role, w: a.w, h: a.h,
                                     natW: a.img.naturalWidth, natH: a.img.naturalHeight,
                                     bytes: a.file.size, type: a.file.type })),
        words: {
          title: v('f-title'), slug: v('f-slug'), tagline: v('f-tagline'), description: v('f-description'),
          developer: v('f-developer'), publisher: v('f-publisher'), release: v('f-release'),
          rights: document.getElementById('f-rights').checked, by: v('f-rights-by'),
          platforms: [...document.querySelectorAll('#f-platforms .on')].map(n => n.dataset.p),
          links: [...document.querySelectorAll('#f-links input')].filter(n => n.value).map(n => n.value)
        },
        from: document.getElementById('pi-from').hidden ? '' : document.getElementById('pi-from').textContent,
        said: document.getElementById('pi-said').textContent
      };
    });

    check('all ' + ASSETS + ' pictures arrived', got.assets.length === ASSETS,
      got.assets.map(a => a.id).join(', '));
    const roleWant = { logo: 'logo', 'keyart-portrait': 'keyart', 'shot-1': 'screenshot', 'shot-2': 'screenshot', 'shot-3': 'screenshot', 'shot-4': 'screenshot' };
    const rolesOk = got.assets.every(a => roleWant[a.id] === a.role) && got.assets.length === Object.keys(roleWant).length;
    check('every role came back as the publisher declared it', rolesOk,
      got.assets.map(a => a.id + ':' + a.role).join(' '));

    /* A picture "arrived" when the browser DECODED it to the size the
       manifest claims — not when a file of some length turned up. */
    const decoded = got.assets.every(a => a.natW === a.w && a.natH === a.h && a.natW > 0 && a.bytes > 0);
    const want = {};
    for (const a of manifest.assets) want[a.id] = a.w + '×' + a.h;
    const sizesOk = got.assets.every(a => want[a.id] === a.natW + '×' + a.natH);
    check('every picture DECODED, at the pixel size the fixture drew it', decoded && sizesOk,
      got.assets.map(a => a.id + ' ' + a.natW + '×' + a.natH + ' ' + Math.round(a.bytes / 1024) + 'KB ' + a.type).join(' · '));

    check('the title, tagline and description came with them', got.words.title === manifest.title &&
      got.words.tagline === manifest.tagline && got.words.description === manifest.description,
      '"' + got.words.title + '" / "' + got.words.tagline + '" / ' + got.words.description.length + ' characters of description');
    check('the developer, publisher and release date too',
      got.words.developer === manifest.developer && got.words.publisher === manifest.publisher && got.words.release === manifest.releaseDate,
      got.words.developer + ' · ' + got.words.publisher + ' · ' + got.words.release);
    check('the platform chips are the manifest\'s', got.words.platforms.join(',') === manifest.platforms.join(','),
      got.words.platforms.join(', '));
    check('the links are the manifest\'s', got.words.links.length === Object.keys(manifest.links).length,
      got.words.links.join(' '));
    check('the rights attestation came across, attested and named',
      got.words.rights === true && got.words.by === manifest.rights.by, got.words.by);
    check('the slug is the publisher\'s own', got.words.slug === SLUG, got.words.slug);
    check('"from <publisher name>, <date>" is on the panel (plan §12 3)', /^from fixture, .+/.test(got.from), '"' + got.from + '"');
    note('what the panel said', '"' + got.said.replace(/\s+/g, ' ') + '"');

    head('9 · the secret was never in a URL');
    const intakeReqs = O.reqs.filter(r => /\/_lab2\/test\/intake/.test(r.url));
    const leaked = O.reqs.filter(r => r.url.indexOf(SECRET) >= 0 || r.url.indexOf(WRONG) >= 0);
    check('not one request this page made carried a secret in its URL', leaked.length === 0,
      O.reqs.length + ' requests watched, ' + intakeReqs.length + ' of them to the intake door');
    const headered = intakeReqs.filter(r => r.headers['x-intake-secret']);
    check('and every intake request carried x-intake-secret instead', intakeReqs.length > 0 && headered.length === intakeReqs.length,
      headered.length + ' / ' + intakeReqs.length + ' — ' + intakeReqs.map(r => r.url.split('?')[1]).join(', '));

    /* ══ 10 · AND IT BUILDS ═════════════════════════════════════════════ */
    head('10 · continue to Build as usual');
    await waitRead(O.page);
    await O.page.waitForFunction(() => !document.getElementById('pt-build').disabled, null, { timeout: 30000 });
    const bLabel = await O.page.$eval('#pt-build', n => n.textContent.trim());
    check('the build button is lit and says BUILD THE PAGE', bLabel === 'BUILD THE PAGE', bLabel);
    await O.page.locator('#pt-import').screenshot({ path: path.join(OUT, 'import-done.png') });
    await O.page.screenshot({ path: path.join(OUT, 'owner-imported.png') });
    await O.page.click('#pt-build');
    await O.page.waitForFunction(() => { const a = document.getElementById('pt-out'); return !a.hidden && a.getAttribute('href'); }, null, { timeout: BUILD_MS })
      .catch(() => {});
    const href = await O.page.$eval('#pt-out', n => n.hidden ? '' : n.getAttribute('href'));
    check('the build door answered and the table gave a link', !!href, href || (await O.page.$eval('#pt-say', n => n.textContent.trim())).slice(0, 140));

    const gdir = path.join(GAMES_DIR, SLUG);
    built = fs.existsSync(path.join(gdir, 'index.html')) && fs.existsSync(path.join(gdir, 'game.json'));
    check('games/' + SLUG + '/ was written, with an index.html and a game.json', built,
      built ? fs.readdirSync(gdir).join(', ') + ' · art: ' + fs.readdirSync(path.join(gdir, 'art')).join(', ') : 'not written');

    let g = null;
    try { g = JSON.parse(fs.readFileSync(path.join(gdir, 'game.json'), 'utf8')); } catch (e) {}
    check('game.json is version 1 with all seven keys, built from the IMPORTED manifest (CONTRACTS §10)',
      !!g && g.version === 1 && ['version', 'builtAt', 'manifest', 'analysis', 'theme', 'style', 'layout'].every(k => g[k] !== undefined) &&
      g.manifest.title === manifest.title && g.manifest.assets.length === ASSETS,
      g ? 'recipe ' + g.layout.recipe + ', preset ' + g.style.preset + ', ' + g.layout.slots.length + ' slots, source "' + g.manifest.source + '"' : 'unreadable');
    /* Two things the round trip loses, both of them press.js's and neither
       of them this field's to fix — recorded here because a note in a
       verifier is how they get looked at rather than rediscovered. */
    if (g) note('the built manifest says source "' + g.manifest.source + '"',
      'press.js writes `source` from the MODE it is in (press.js manifestOf), so a page the owner built out of an intake records "manual". ' +
      'The bundle in the intake folder says "intake"; the built page does not remember where it came from.');
    if (g) note('genres do not survive the round trip',
      'manifest.schema.json allows `genres` and the fixture declares three; press.js\'s applyManifest does not read the key and manifestOf does not write it, ' +
      'so they are dropped on the publisher\'s side before intake ever sees them (stored bundle: ' + (g.manifest.genres ? g.manifest.genres.join(', ') : 'none') + ').');

    const pageRes = await fetch(ORIGIN + '/lab2/test/games/' + SLUG + '/');
    const pageText = await pageRes.text();
    check('the server serves the built page', pageRes.status === 200 && /data-lab-page="games\/verify-import"/.test(pageText),
      'HTTP ' + pageRes.status + ', ' + Math.round(pageText.length / 1024) + ' KB');
    check('every imported picture is beside it on disk',
      built && fs.readdirSync(path.join(gdir, 'art')).length === ASSETS,
      built ? fs.readdirSync(path.join(gdir, 'art')).length + ' files' : '-');
    /* THE TWO CONSOLE ERRORS THIS SCRIPT ORDERED. Chrome logs a 401 and a
       404 to the console whoever asked for them, and section 4 asked for the
       401 (a wrong secret) and section 7 for the 404 (a token that is
       nobody's). They are matched by URL AND BY COUNT — two, no more — and
       nothing else on the console is allowed. This cannot hide a broken
       import: the real token's fetch answered 200 or the six pictures above
       would not be on the table. */
    const PROVOKED = [/intake\?list=1\b/, /intake\?token=/];
    const provoked = O.errors.filter(e => PROVOKED.some(re => re.test(e)));
    const unexpected = O.errors.filter(e => !PROVOKED.some(re => re.test(e)));
    check('owner mode raised no console or page error but the two it asked for',
      unexpected.length === 0 && provoked.length === 2,
      unexpected.length ? unexpected.slice(0, 3).join(' | ')
        : provoked.length + ' provoked (the 401 of §4 and the 404 of §7), nothing else');

    await O.ctx.close();

    /* ══ 11 · THE CONFIGURATION EVERY OTHER VERIFIER RUNS IN ════════════ */
    /* The shared sandbox server on 4322 is started WITHOUT a secret, so that
       is the state the Press Table is in for `perf/verify-press.js` — which
       asserts that the page raises no console error at all. This section is
       that assertion, made here so it is this phase's own responsibility:
       the field must cost the page NOTHING at load. It makes no request
       until the owner presses something, which is why it can be on a page
       that has to boot silent. The variable is dropped from this process and
       the SAME server picks the change up, because `api/intake.js` reads it
       per request. */
    head('11 · with no INTAKE_SECRET on the server (the 4322 configuration)');
    delete process.env.INTAKE_SECRET;
    const N = await openPress(browser, ORIGIN, {});
    check('the field is still drawn in owner mode', await N.page.evaluate(() => !!document.getElementById('pt-import')),
      'the server\'s secret is not the page\'s business until something is pressed');
    check('and the page booted with an EMPTY console — the field costs nothing at load',
      N.errors.length === 0, N.errors.slice(0, 3).join(' | ') || 'none');
    check('no request went to the intake door before the owner pressed anything',
      N.reqs.filter(r => /\/intake/.test(r.url)).length === 0, N.reqs.length + ' requests, none of them to /intake');
    // the field as an owner first meets it, for the record
    await N.page.locator('#pt-import').screenshot({ path: path.join(OUT, 'import-locked.png') });
    await N.page.fill('#pi-secret', SECRET);
    await N.page.click('#pi-unlock');
    await N.page.click('#pi-list');
    await N.page.waitForFunction(() => /INTAKE_SECRET/.test(document.getElementById('pi-said').textContent), null, { timeout: 15000 })
      .catch(() => {});
    const shut = await N.page.$eval('#pi-said', n => n.textContent);
    check('and a LIST says the SERVER has no secret, not that the owner mistyped one', /no INTAKE_SECRET in its environment/.test(shut),
      '"' + shut + '"');
    await N.ctx.close();
  } finally {
    head('cleanup');
    if (browser) { try { await browser.close(); } catch (e) { /* a browser that will not close is not a result */ } }

    if (KEEP) {
      note('--keep', 'games/' + SLUG + '/ and intake/' + (token || '—') + '/ were left on disk on purpose');
    } else {
      const gdir = path.join(GAMES_DIR, SLUG);
      if (fs.existsSync(gdir)) {
        try { fs.rmSync(gdir, { recursive: true, force: true }); } catch (e) {}
      }
      check('games/' + SLUG + '/ is gone', !fs.existsSync(gdir), built ? 'deleted' : 'was never written');

      /* Only the token this run recorded, and only if it still looks like a
         token. The folder beside it may be somebody's real bundle. */
      if (token && TOKEN_RE.test(token)) {
        const d = path.join(INTAKE_ROOT, token);
        try { fs.rmSync(d, { recursive: true, force: true }); } catch (e) {}
        check('the intake token this run wrote is gone', !fs.existsSync(d), token);
      } else {
        note('no token to delete', 'the publisher leg never got one');
      }
      const left = fs.existsSync(INTAKE_ROOT) ? fs.readdirSync(INTAKE_ROOT) : [];
      note('intakes left in the folder', left.length ? left.join(', ') + ' — not this run\'s, and not touched' : 'none');
    }

    if (server) { await new Promise(r => server.close(r)); check('the server this run started is stopped', true, 'closed'); }

    const pass = results.filter(r => r.ok === true).length;
    const fail = results.filter(r => r.ok === false).length;
    fs.mkdirSync(OUT, { recursive: true });
    fs.writeFileSync(path.join(OUT, 'summary.json'),
      JSON.stringify({ at: new Date().toISOString(), slug: SLUG, token: token, pass, fail, results }, null, 2));
    console.log('\n' + (fail ? 'FAIL' : 'PASS') + '  ' + pass + '/' + (pass + fail) + '  → ' + path.relative(process.cwd(), OUT));
    process.exitCode = fail ? 1 : 0;
  }
}

main().catch(e => { console.error('\n' + ((e && e.stack) || e)); process.exitCode = 1; });
