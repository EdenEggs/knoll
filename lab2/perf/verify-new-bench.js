/* lab2/perf/verify-new-bench.js — lab 2's "+ new bench" (lab2/benches.js) makes folder_1, folder_2 …:
   empty benches from lab2/bench-template, each with its own storage and doors, an empty sticker drawer,
   a save button, and a name beside knoll / that changes when it is pressed.

   RUN AGAINST A THROWAWAY COPY OF THE SITE: serve.js and lab2/ (without perf/ and test/) are copied into a
   temp folder with a server of its own on a spare port, so no folder_N is ever made in the real site —
   and check 7 holds it to that.

     1  lab 2 has the button upper left, beside knoll / lab 2, at one width; a press makes folder_1 and
        opens it in a new tab, and the bench does not move while it works
     2  folder_1 is a whole empty bench on disk — its files, fonts and vendor, a bench.json, no @@token and
        nothing of TOEM 2 — and in the browser: knoll / folder_1, an empty drawer, bare paper, "saved", and
        everything it keeps under its own key
     3  the name changes by pressing it: letters reach the field and not the bench's shortcuts, and the
        link home is not followed; Enter writes the <title>, the header and bench.json; a reload keeps it;
        Escape changes nothing; a name with < > & " $ in it is written as text
     4  its save works through the generic door: a drawn stroke, ctrl+s, and wall-seed.json holds it
     5  a second press makes folder_2, under a different key: it opens on bare paper, not folder_1's stroke
     6  a server with no door for it: "not made", a note saying to restart, no tab left open, no folder; no
        server answering at all: a note to open lab 2 from its shortcut; on a hostname that is not this
        machine there is no button and no renaming
     7  the real site is untouched: no folder_N in it, and no file written

   Run from site/:  node lab2/perf/verify-new-bench.js    (PORT=4395 by default; any free port) */
const fs = require('fs'), path = require('path'), os = require('os'), crypto = require('crypto'), http = require('http');
const { spawn } = require('child_process');
const { chromium } = require('playwright');

const SITE = path.join(__dirname, '..', '..');
const PORT = +(process.env.PORT || 4395);
const BASE = 'http://127.0.0.1:' + PORT;
const AWAY = 'http://bench-deployed.test:' + PORT;          // this machine, but not a local hostname

let fails = 0;
const say = (ok, what, extra) => {
  if (!ok) fails++;
  console.log((ok ? '  PASS  ' : '  FAIL  ') + what + (extra == null || extra === '' ? '' : '   ' + extra));
};
const note = (what, extra) => console.log('  NOTE  ' + what + (extra == null ? '' : '   ' + extra));
const hash = f => { try { return crypto.createHash('sha1').update(fs.readFileSync(f)).digest('hex'); } catch (e) { return 'missing'; } };
const REAL = ['serve.js', 'lab2/index.html', 'lab2/benches.js', 'toem2/index.html', 'ironhive/index.html'].map(f => path.join(SITE, f));
const realBefore = REAL.map(hash);
const realFolders = () => fs.readdirSync(SITE).filter(n => /^\.?folder_\d+/.test(n));
const foldersBefore = realFolders();

function get(url) {
  return new Promise(done => {
    const req = http.get(url, r => { let s = ''; r.on('data', c => { s += c; }); r.on('end', () => done({ status: r.statusCode, body: s })); });
    req.on('error', e => done({ status: 0, error: String(e) }));
    req.setTimeout(2000, () => { req.destroy(); done({ status: 0, error: 'timeout' }); });
  });
}
const walk = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(d => d.isDirectory() ? walk(path.join(dir, d.name)) : [path.join(dir, d.name)]);

(async () => {
  const taken = await get(BASE + '/');
  if (taken.status) { console.log('port ' + PORT + ' already answers — run with PORT=<a free port>'); process.exit(2); }

  // THE THROWAWAY SITE
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'knoll-benches-'));
  const skip = /[\\/]lab2[\\/](perf|test)([\\/]|$)|\.(keep-bak|tmp|bat|lnk|ico)$/;
  fs.copyFileSync(path.join(SITE, 'serve.js'), path.join(tmp, 'serve.js'));
  fs.cpSync(path.join(SITE, 'lab2'), path.join(tmp, 'lab2'), { recursive: true, filter: src => !skip.test(src) });
  if (fs.existsSync(path.join(SITE, 'logo'))) fs.cpSync(path.join(SITE, 'logo'), path.join(tmp, 'logo'), { recursive: true });
  const server = spawn(process.execPath, [path.join(tmp, 'serve.js'), String(PORT)], { cwd: tmp, stdio: 'ignore', windowsHide: true });
  let browser = null;
  const benchErrors = [], labErrors = [];

  const finish = async () => {
    try { if (browser) await browser.close(); } catch (e) {}
    try { server.kill(); } catch (e) {}
    await new Promise(r => setTimeout(r, 700));
    try { fs.rmSync(tmp, { recursive: true, force: true }); } catch (e) {}
    const changed = REAL.filter((f, i) => realBefore[i] !== hash(f));
    const made = realFolders().filter(n => foldersBefore.indexOf(n) < 0);
    say(!changed.length && !made.length, 'the real site is untouched — no folder_N made in it, no file written',
      (made.length ? 'made: ' + made.join(', ') + ' · ' : '') + (changed.join(', ') || REAL.length + ' files unchanged'));
    say(!benchErrors.length, 'no page errors on the new benches', benchErrors.join(' | '));
    if (labErrors.length) note('page errors on lab 2 itself (not under test here)', labErrors.slice(0, 3).join(' | '));
    console.log('\n' + (fails ? fails + ' FAILED' : 'all checks passed'));
    process.exit(fails ? 1 : 0);
  };

  try {
    let up = false;
    for (let i = 0; i < 40 && !up; i++) {
      const r = await get(BASE + '/_lab2/new-bench');
      up = r.status === 200 && /"next":"folder_1"/.test(r.body);
      if (!up) await new Promise(r => setTimeout(r, 250));
    }
    say(up, "the throwaway copy's server answers the new-bench door, and the next bench is folder_1", tmp);
    if (!up) return finish();

    browser = await chromium.launch({ channel: 'chrome', headless: false,
      args: ['--window-size=1616,1110', '--window-position=0,0', '--host-resolver-rules=MAP bench-deployed.test 127.0.0.1'] });
    const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });
    ctx.on('page', p => p.on('pageerror', e => {
      const m = String(e);
      (/\/lab2\//.test(p.url()) ? labErrors : benchErrors).push(m);
      console.log('PAGEERROR (' + p.url().replace(BASE, '') + ')', m);
    }));
    const lab = await ctx.newPage();
    lab.on('pageerror', e => { labErrors.push(String(e)); });

    /* ── 1 · the button, and a press ────────────────────────────────────── */
    await lab.goto(BASE + '/lab2/', { waitUntil: 'load', timeout: 60000 });
    await lab.waitForFunction(() => { const b = document.getElementById('lab-new-bench'); return window.Lab && b && !b.hidden; }, null, { timeout: 60000 });
    await lab.waitForTimeout(800);
    const where = await lab.evaluate(() => {
      const b = document.getElementById('lab-new-bench'), brand = document.querySelector('.lab-brand');
      const r = b.getBoundingClientRect(), rb = brand.getBoundingClientRect();
      return { afterBrand: b.previousElementSibling === brand, left: Math.round(r.left), brandRight: Math.round(rb.right),
               sameRow: r.top < rb.bottom && r.bottom > rb.top, width: b.offsetWidth, fits: b.scrollWidth <= b.clientWidth + 1, text: b.textContent };
    });
    say(where.afterBrand && where.sameRow && where.left - where.brandRight < 60 && where.left < 400 && where.text === '+ new bench',
      'lab 2 has "+ new bench" upper left, beside knoll / lab 2', JSON.stringify(where));

    await lab.evaluate(() => {
      window.__seen = new Set();
      const t0 = performance.now();
      (function tick() {
        const r = Lab.bench.getBoundingClientRect();
        window.__seen.add(Math.round(r.top) + ',' + Math.round(r.height));
        if (performance.now() - t0 < 3000) requestAnimationFrame(tick);
      })();
    });
    const [tab1] = await Promise.all([ctx.waitForEvent('page', { timeout: 20000 }), lab.click('#lab-new-bench')]);
    await tab1.waitForURL('**/folder_1/', { timeout: 20000 });
    await lab.waitForFunction(() => /^made/.test(document.getElementById('lab-new-bench').textContent), null, { timeout: 10000 });
    const pressed = await lab.evaluate(() => {
      const b = document.getElementById('lab-new-bench'), n = document.getElementById('lab-new-bench-note');
      return { text: b.textContent, width: b.offsetWidth, fits: b.scrollWidth <= b.clientWidth + 1, note: n && !n.hidden ? n.textContent : '' };
    });
    await lab.waitForTimeout(2400);
    const seen = await lab.evaluate(() => Array.from(window.__seen));
    say(/folder_1/.test(pressed.note) && pressed.width === where.width && pressed.fits && where.fits,
      'a press makes folder_1, opens it in a new tab, and says so at the same width', pressed.text + ' · ' + JSON.stringify(pressed.note));
    say(seen.length === 1, '…and lab 2\'s bench does not move while the button works', seen.join(' / ') + ' (top,height)');

    /* ── 2 · folder_1, on disk and in the browser ───────────────────────── */
    const F1 = path.join(tmp, 'folder_1');
    const files = walk(F1).map(f => path.relative(F1, f).split(path.sep).join('/'));
    const need = ['index.html', 'lab.js', 'lab.css', 'wall.js', 'stickers.js', 'sticker-kits.js', 'sticker-kits.json', 'seed.js', 'name.js',
                  'keep.js', 'tape.js', 'tracer.js', 'wall-seed.json', 'bench.json', 'posters/index.json', 'vendor/react.production.min.js', 'fonts/fonts.css'];
    const missing = need.filter(f => files.indexOf(f) < 0);
    const texts = files.filter(f => /\.(html|js|css|json)$/.test(f) && !/^(fonts|vendor)\//.test(f));
    const tokens = texts.filter(f => fs.readFileSync(path.join(F1, f), 'utf8').includes('@@'));
    const toem = texts.filter(f => /toem2|TOEM|Town Square/.test(fs.readFileSync(path.join(F1, f), 'utf8')));
    const bench1 = JSON.parse(fs.readFileSync(path.join(F1, 'bench.json'), 'utf8'));
    const kits1 = JSON.parse(fs.readFileSync(path.join(F1, 'sticker-kits.json'), 'utf8'));
    const seed1 = JSON.parse(fs.readFileSync(path.join(F1, 'wall-seed.json'), 'utf8'));
    say(!missing.length && !tokens.length && !toem.length, 'folder_1 is a whole bench on disk: every file, fonts and vendor, no @@token, nothing of TOEM 2',
      files.length + ' files' + (missing.length ? ' · missing ' + missing.join(', ') : '') + (tokens.length ? ' · tokens in ' + tokens.join(', ') : '') + (toem.length ? ' · TOEM in ' + toem.join(', ') : ''));
    say(bench1.slug === 'folder_1' && /^folder_1-[a-z0-9]{2,6}$/.test(bench1.key) && bench1.name === 'folder_1' &&
        kits1.kits.length === 0 && kits1.stickers.length === 0 && seed1.wall.items.length === 0,
      'its bench.json names it, its kits and its wall are empty', JSON.stringify(bench1));

    await tab1.waitForFunction(() => window.Lab && window.Wall && window.Stickers && window.Seed && document.getElementById('bench-save') &&
      /^(saved|save changes)$/.test(document.getElementById('bench-save').textContent), null, { timeout: 30000 });
    await tab1.waitForTimeout(1200);
    const b1 = await tab1.evaluate(() => ({ title: document.title, brand: document.querySelector('.lab-brand').textContent.replace(/\s+/g, ' ').trim(),
      save: document.getElementById('bench-save').textContent, items: Wall.store.get().items.filter(Boolean).length, keys: Object.keys(localStorage),
      doorBase: document.baseURI }));
    say(b1.title === 'Knoll · folder_1' && /knoll\s*\/\s*folder_1/.test(b1.brand), 'the page says knoll / folder_1', b1.title + ' · ' + b1.brand);
    say(b1.items === 0 && b1.save === 'saved', 'its paper is bare, and its save button reads "saved"', b1.items + ' pieces · ' + b1.save);
    /* ITS OWN KEY, CHECKED TWICE. In this browser lab 2 was open first, and localStorage belongs to
       the ORIGIN, not the page: lab 2's keys sit in the same store (the first cut of this probe read
       them as a leak). So here nothing may be under any third name — and then the decisive check: the
       bench opened ALONE, in a browser that has never seen lab 2, keeps everything under its own key. */
    const own = 'knoll-' + bench1.key + ':';
    const strangers = b1.keys.filter(k => k.indexOf(own) !== 0 && k.indexOf('knoll-lab2:') !== 0);
    say(b1.keys.some(k => k.indexOf(own) === 0) && !strangers.length, 'what it keeps is under its own key, beside lab 2\'s in the origin they share',
      strangers.length ? 'strangers: ' + strangers.join(', ') : b1.keys.filter(k => k.indexOf(own) === 0).length + ' keys of its own');
    const solo = await browser.newContext({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });
    const alone = await solo.newPage();
    alone.on('pageerror', e => { benchErrors.push(String(e)); console.log('PAGEERROR (alone)', String(e)); });
    await alone.goto(BASE + '/folder_1/', { waitUntil: 'load' });
    await alone.waitForFunction(() => window.Wall && window.Seed && document.getElementById('bench-save') &&
      /^(saved|save changes)$/.test(document.getElementById('bench-save').textContent), null, { timeout: 30000 });
    await alone.waitForTimeout(1500);
    const aloneKeys = await alone.evaluate(() => Object.keys(localStorage));
    say(aloneKeys.length > 0 && aloneKeys.every(k => k.indexOf(own) === 0), 'opened alone in a fresh browser, everything it keeps is under its own key', aloneKeys.join(', '));
    await solo.close();
    await tab1.click('.dock-btn[data-tool="sticker"]');
    await tab1.waitForFunction(() => { const c = document.getElementById('sd-count'); return c && c.textContent; }, null, { timeout: 15000 });
    await tab1.waitForTimeout(1500);
    const drawer = await tab1.evaluate(() => ({ count: document.getElementById('sd-count').textContent, n: Stickers.list.length, kits: Stickers.kits.length }));
    say(drawer.n === 0 && drawer.kits === 0 && drawer.count === 'THE DRAWER IS EMPTY', 'its sticker drawer is empty', JSON.stringify(drawer));
    await tab1.evaluate(() => Wall.setTool('move'));

    /* ── 3 · renaming ───────────────────────────────────────────────────── */
    const indexOf1 = () => fs.readFileSync(path.join(F1, 'index.html'), 'utf8');
    const zoom0 = await tab1.evaluate(() => Lab.zoom);
    await tab1.click('.lab-name');
    await tab1.waitForSelector('.lab-name-field', { timeout: 5000 });
    const field0 = await tab1.evaluate(() => ({ value: document.querySelector('.lab-name-field').value, url: location.pathname,
      focused: document.activeElement && document.activeElement.classList.contains('lab-name-field') }));
    say(field0.value === 'folder_1' && field0.url === '/folder_1/' && field0.focused, 'pressing the name opens a field holding it, and does not follow the link home', JSON.stringify(field0));
    await tab1.keyboard.press('Control+a');
    await tab1.keyboard.type('h+-v Moss Garden', { delay: 15 });
    const typing = await tab1.evaluate(() => ({ value: document.querySelector('.lab-name-field').value, zoom: Lab.zoom }));
    say(typing.value === 'h+-v Moss Garden' && Math.abs(typing.zoom - zoom0) < 1e-9, 'letters reach the field, not the bench\'s shortcuts (no zoom, no hand)', JSON.stringify(typing));
    await tab1.keyboard.press('Control+a');
    await tab1.keyboard.type('Moss Garden', { delay: 15 });
    await tab1.keyboard.press('Enter');
    await tab1.waitForFunction(() => { const n = document.getElementById('bench-name-note'); return n && !n.hidden && /Renamed|Not renamed/.test(n.textContent); }, null, { timeout: 10000 });
    const r1 = await tab1.evaluate(() => ({ name: document.querySelector('.lab-name').textContent, title: document.title,
      note: document.getElementById('bench-name-note').textContent, field: !!document.querySelector('.lab-name-field') }));
    const html1 = indexOf1(), marker1 = JSON.parse(fs.readFileSync(path.join(F1, 'bench.json'), 'utf8'));
    say(r1.name === 'Moss Garden' && r1.title === 'Knoll · Moss Garden' && !r1.field && /Renamed/.test(r1.note),
      'Enter renames it on the page', JSON.stringify(r1));
    say(html1.includes('<title>Knoll · Moss Garden</title>') && html1.includes('<span class="lab-name">Moss Garden</span>') && marker1.name === 'Moss Garden',
      '…and writes the name into its index.html (title and header) and its bench.json', marker1.name);
    await tab1.reload({ waitUntil: 'load' });
    await tab1.waitForFunction(() => window.Wall && document.querySelector('.lab-name'), null, { timeout: 30000 });
    const r2 = await tab1.evaluate(() => ({ name: document.querySelector('.lab-name').textContent, title: document.title }));
    say(r2.name === 'Moss Garden' && r2.title === 'Knoll · Moss Garden', 'a reload keeps the new name', JSON.stringify(r2));

    const before3 = hash(path.join(F1, 'index.html'));
    await tab1.click('.lab-name');
    await tab1.waitForSelector('.lab-name-field');
    await tab1.keyboard.press('Control+a');
    await tab1.keyboard.type('Nope', { delay: 15 });
    await tab1.keyboard.press('Escape');
    await tab1.waitForTimeout(600);
    const r3 = await tab1.evaluate(() => ({ name: document.querySelector('.lab-name').textContent, field: !!document.querySelector('.lab-name-field') }));
    say(r3.name === 'Moss Garden' && !r3.field && hash(path.join(F1, 'index.html')) === before3, 'Escape leaves the name, and the file, as they were', JSON.stringify(r3));

    const odd = '<b>$& "x"</b> & $1';
    await tab1.click('.lab-name');
    await tab1.waitForSelector('.lab-name-field');
    await tab1.keyboard.press('Control+a');
    await tab1.keyboard.type(odd, { delay: 10 });
    await tab1.keyboard.press('Enter');
    await tab1.waitForFunction(o => document.querySelector('.lab-name').textContent === o && /Renamed|Not renamed/.test(document.getElementById('bench-name-note').textContent), odd, { timeout: 10000 });
    await tab1.waitForTimeout(400);
    const html4 = indexOf1();
    await tab1.reload({ waitUntil: 'load' });
    await tab1.waitForFunction(() => window.Wall && document.querySelector('.lab-name'), null, { timeout: 30000 });
    const r4 = await tab1.evaluate(() => ({ name: document.querySelector('.lab-name').textContent, bold: !!document.querySelector('.lab-brand b'), title: document.title }));
    say(r4.name === odd && !r4.bold && r4.title === 'Knoll · ' + odd && html4.includes('&lt;b&gt;$&amp; &quot;x&quot;&lt;/b&gt; &amp; $1'),
      'a name with < > & " $ in it is written as text, not markup', JSON.stringify(r4));
    // back to a plain name for what follows
    await tab1.click('.lab-name');
    await tab1.waitForSelector('.lab-name-field');
    await tab1.keyboard.press('Control+a');
    await tab1.keyboard.type('Moss Garden', { delay: 10 });
    await tab1.keyboard.press('Enter');
    await tab1.waitForFunction(() => document.querySelector('.lab-name').textContent === 'Moss Garden', null, { timeout: 10000 });

    /* ── 4 · its save, through the generic door ─────────────────────────── */
    const drawTool = await tab1.evaluate(() => {
      const b = Array.from(document.querySelectorAll('.dock-btn')).find(x => /draw/i.test(x.dataset.tool || '') || /draw/i.test(x.textContent));
      return b ? b.dataset.tool : null;
    });
    await tab1.click('.dock-btn[data-tool="' + drawTool + '"]');
    const bb = await tab1.evaluate(() => { const r = Lab.bench.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
    await tab1.mouse.move(bb.x - 120, bb.y);
    await tab1.mouse.down();
    for (let s = 1; s <= 16; s++) { await tab1.mouse.move(bb.x - 120 + 15 * s, bb.y + (s % 2 ? 12 : -12)); await tab1.waitForTimeout(16); }
    await tab1.mouse.up();
    await tab1.waitForTimeout(400);
    await tab1.waitForFunction(() => document.getElementById('bench-save').textContent === 'save changes', null, { timeout: 8000 });
    await tab1.keyboard.press('Escape');
    await tab1.keyboard.press('Control+s');
    await tab1.waitForFunction(() => /^saved/.test(document.getElementById('bench-save').textContent), null, { timeout: 8000 });
    await tab1.waitForTimeout(400);
    const seedAfter = JSON.parse(fs.readFileSync(path.join(F1, 'wall-seed.json'), 'utf8'));
    const stroke = await tab1.evaluate(() => Wall.store.get().items.filter(Boolean));
    say(drawTool && stroke.length === 1 && seedAfter.wall.items.length === 1 && JSON.stringify(seedAfter.wall.items[0]) === JSON.stringify(stroke[0]),
      'a drawn stroke and ctrl+s: folder_1\'s wall-seed.json holds it, through the door made from its folder', (drawTool || 'no draw tool') + ' · ' + seedAfter.wall.items.length + ' piece');

    /* ── 5 · a second press ─────────────────────────────────────────────── */
    await lab.bringToFront();
    const [tab2] = await Promise.all([ctx.waitForEvent('page', { timeout: 20000 }), lab.click('#lab-new-bench')]);
    await tab2.waitForURL('**/folder_2/', { timeout: 20000 });
    await tab2.waitForFunction(() => window.Wall && window.Seed && document.getElementById('bench-save') &&
      /^(saved|save changes)$/.test(document.getElementById('bench-save').textContent), null, { timeout: 30000 });
    await tab2.waitForTimeout(1000);
    const bench2 = JSON.parse(fs.readFileSync(path.join(tmp, 'folder_2', 'bench.json'), 'utf8'));
    const b2 = await tab2.evaluate(() => ({ title: document.title, items: Wall.store.get().items.filter(Boolean).length, keys: Object.keys(localStorage) }));
    say(bench2.slug === 'folder_2' && bench2.key !== bench1.key && b2.title === 'Knoll · folder_2' && b2.items === 0 &&
        b2.keys.filter(k => k.indexOf('knoll-' + bench2.key + ':') === 0).length > 0,
      'a second press makes folder_2 under its own key, and it opens on bare paper — not folder_1\'s stroke', bench2.key + ' vs ' + bench1.key + ' · ' + b2.items + ' pieces');
    await tab2.close();

    /* ── 6 · no door, and not this machine ──────────────────────────────── */
    await lab.bringToFront();
    await lab.waitForFunction(() => document.getElementById('lab-new-bench').textContent === '+ new bench', null, { timeout: 12000 });
    await lab.route('**/_lab2/new-bench', r => (r.request().method() === 'POST' ? r.fulfill({ status: 404, contentType: 'text/plain', body: '404' }) : r.continue()));
    const pagesBefore = ctx.pages().length;
    await lab.click('#lab-new-bench');
    await lab.waitForFunction(() => document.getElementById('lab-new-bench').textContent === 'not made', null, { timeout: 10000 });
    await lab.waitForTimeout(800);
    const bad = await lab.evaluate(() => { const n = document.getElementById('lab-new-bench-note'); return { note: n && !n.hidden ? n.textContent : '', bad: n.classList.contains('is-bad') }; });
    const folder3 = fs.existsSync(path.join(tmp, 'folder_3'));
    say(/older/.test(bad.note) && bad.bad && ctx.pages().length === pagesBefore && !folder3,
      'on a server with no door for it: "not made", a note to restart, no tab left open, no folder', JSON.stringify(bad.note));
    await lab.unroute('**/_lab2/new-bench');

    // no server at all (the page is open, the server has gone): the note says to open lab 2 from its shortcut
    await lab.waitForFunction(() => document.getElementById('lab-new-bench').textContent === '+ new bench', null, { timeout: 12000 });
    await lab.route('**/_lab2/new-bench', r => (r.request().method() === 'POST' ? r.abort('connectionrefused') : r.continue()));
    const pagesBeforeGone = ctx.pages().length;
    await lab.click('#lab-new-bench');
    await lab.waitForFunction(() => document.getElementById('lab-new-bench').textContent === 'not made', null, { timeout: 10000 });
    await lab.waitForTimeout(800);
    const gone = await lab.evaluate(() => { const n = document.getElementById('lab-new-bench-note'); return n && !n.hidden ? n.textContent : ''; });
    say(/not running/.test(gone) && /shortcut/.test(gone) && ctx.pages().length === pagesBeforeGone && !fs.existsSync(path.join(tmp, 'folder_3')),
      'with no server answering at all: "not made", a note to open lab 2 from its shortcut, no tab left open, no folder', JSON.stringify(gone));
    await lab.unroute('**/_lab2/new-bench');

    const away = await ctx.newPage();
    await away.goto(AWAY + '/folder_1/', { waitUntil: 'load' });
    await away.waitForFunction(() => window.Wall && document.querySelector('.lab-name'), null, { timeout: 30000 });
    await away.waitForTimeout(600);
    const awayBench = await away.evaluate(() => ({ local: document.documentElement.classList.contains('lab-local'),
      renamable: document.querySelector('.lab-name').classList.contains('is-renamable'), save: !document.getElementById('bench-save').hidden }));
    say(!awayBench.local && !awayBench.renamable && !awayBench.save, 'off this machine a bench has no renaming and no save button', JSON.stringify(awayBench));
    await away.goto(AWAY + '/lab2/', { waitUntil: 'load', timeout: 60000 });
    await away.waitForFunction(() => window.Lab && document.getElementById('lab-new-bench'), null, { timeout: 60000 });
    await away.waitForTimeout(600);
    const awayLab = await away.evaluate(() => { const b = document.getElementById('lab-new-bench'); return { hidden: b.hidden, shown: b.getClientRects().length > 0 }; });
    say(awayLab.hidden && !awayLab.shown, '…and lab 2 has no "+ new bench"', JSON.stringify(awayLab));
  } catch (e) {
    say(false, 'the probe ran to the end', String((e && e.stack) || e).split('\n').slice(0, 3).join(' | '));
  }
  return finish();
})();
