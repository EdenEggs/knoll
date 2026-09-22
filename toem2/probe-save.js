/* toem2/probe-save.js — TOEM 2's save button (seed.js: SAVE) writes the paper into the
   site, says whether there is anything to save, and never moves the bench doing it.

   RUN AGAINST A THROWAWAY COPY OF THE SITE: this probe copies serve.js and toem2/ into a
   temp folder, starts that copy's own server on a spare port, and deletes it all at the
   end — it never writes into the real site, and check 8 holds it to that.

     1  on a first visit the header has one save button, reading "saved" — no "save
        layout", no autosave pill, no "publish the wall" — and the row is one line
     2  a real drag makes it "save changes"; ctrl+s writes wall-seed.json with that piece
        where it was let go and every other piece as it was, keeps the opening view, backs
        the old file up once, and settles back to "saved" — and through all of it the
        button keeps one width, every word fits it, and THE BENCH DOES NOT MOVE (the first
        cut sized the button to its label, the hint beside it reflowed, and the whole
        paper slid with every press)
     3  what was saved is what a first visit opens on, in a fresh browser
     4  ctrl+z makes it "save changes" again (the file has the move); a click writes the
        original pieces back; the backup is still the file from before the first save
     5  a reload still reads "saved"
     6  shift-click saves the view on screen as the opening one — posted, written, and the
        same view before and after the press — and keeps the phone view
     7  a server with no door for it: the button still stands, a press says "not saved"
        and the note under it says to restart the server, and nothing is written; on a
        hostname that is not this machine — the deployed site — the button is THE LIVE
        WALL's (seed.js: THE LIVE WALL, 2026-09-17), and with no door for that either it
        stands disabled and says "offline"
     8  the real site is untouched, and no page errors

   Run:  node toem2/probe-save.js    (PORT=4394 by default; any free port) */
const fs = require('fs'), path = require('path'), os = require('os'), crypto = require('crypto'), http = require('http');
const { spawn } = require('child_process');
const { chromium } = require('playwright');

const SITE = path.join(__dirname, '..');
const PORT = +(process.env.PORT || 4394);
const BASE = 'http://127.0.0.1:' + PORT;
const DEPLOYED = 'http://toem2-deployed.test:' + PORT;       // mapped to this machine, but not a local hostname

let fails = 0;
const say = (ok, what, extra) => {
  if (!ok) fails++;
  console.log((ok ? '  PASS  ' : '  FAIL  ') + what + (extra == null || extra === '' ? '' : '   ' + extra));
};
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const hash = f => { try { return crypto.createHash('sha1').update(fs.readFileSync(f)).digest('hex'); } catch (e) { return 'missing'; } };
const REAL = ['toem2/wall-seed.json', 'toem2/index.html', 'toem2/seed.js', 'ironhive/wall-seed.json', 'lab2/index.html'].map(f => path.join(SITE, f));
const realBefore = REAL.map(hash);

function get(url) {
  return new Promise(done => {
    const req = http.get(url, r => { let s = ''; r.on('data', c => { s += c; }); r.on('end', () => done({ status: r.statusCode, body: s })); });
    req.on('error', e => done({ status: 0, error: String(e) }));
    req.setTimeout(2000, () => { req.destroy(); done({ status: 0, error: 'timeout' }); });
  });
}

// ── the bench, driven ─────────────────────────────────────────────────────
const button = p => p.evaluate(() => {
  const b = document.getElementById('toem-save'), n = document.getElementById('toem-save-note');
  return b ? { text: b.textContent, cls: b.className, shown: b.getClientRects().length > 0, title: b.title, disabled: b.disabled,
               width: b.offsetWidth, fits: b.scrollWidth <= b.clientWidth + 1,
               note: n && !n.hidden ? n.textContent : '', noteBad: !!(n && n.classList.contains('is-bad')) } : null;
});
const waitText = (p, re, ms) => p.waitForFunction(src => {
  const b = document.getElementById('toem-save');
  return !!b && new RegExp(src).test(b.textContent);
}, re.source, { timeout: ms || 8000 });
/* THE BENCH, WATCHED EVERY FRAME: its top and height, sampled on requestAnimationFrame for
   a stretch of time, as a set — one entry means it never moved */
const watchBench = (p, ms) => p.evaluate(ms => {
  window.__benchSeen = new Set();
  const t0 = performance.now();
  (function tick() {
    const r = Lab.bench.getBoundingClientRect();
    window.__benchSeen.add(Math.round(r.top) + ',' + Math.round(r.height));
    if (performance.now() - t0 < ms) requestAnimationFrame(tick);
  })();
}, ms);
const benchSeen = p => p.evaluate(() => Array.from(window.__benchSeen || []));
const items = p => p.evaluate(() => JSON.parse(JSON.stringify(Wall.store.get().items)));
const frameOn = (p, nn, fill) => p.evaluate(({ nn, fill }) => {
  const its = Wall.store.get().items, idx = [];
  its.forEach((it, i) => { if (it && it.f && it.f.indexOf('tm-p' + nn + '-') === 0) idx.push(i); });
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  idx.forEach(i => {
    const r = document.querySelector('svg.wall-ink .wall-item[data-i="' + i + '"]').getBoundingClientRect();
    x0 = Math.min(x0, r.left); y0 = Math.min(y0, r.top); x1 = Math.max(x1, r.right); y1 = Math.max(y1, r.bottom);
  });
  const a = Lab.toWorld(x0, y0), b = Lab.toWorld(x1, y1), br = Lab.bench.getBoundingClientRect();
  const z = Math.min(br.width * fill / (b.x - a.x), br.height * fill / (b.y - a.y));
  Lab.camTo(z, br.width / 2 - (a.x + b.x) / 2 * z, br.height / 2 - (a.y + b.y) / 2 * z, 0);
  return idx;
}, { nn, fill });
// a point on a stamp's own ink that is on top, for a press to find
const inkPoint = (p, idx) => p.evaluate(idx => {
  const ARCH = /^tm-p\d\d-(slab|patch|wall|roof|stairs|door|route|wire)(-\d\d)?$/;
  const its = Wall.store.get().items;
  const cands = idx.filter(i => !ARCH.test(its[i].f)).sort((a, b) => its[b].z - its[a].z);
  for (const i of cands) {
    const g = document.querySelector('svg.wall-ink .wall-item[data-i="' + i + '"]'), r = g.getBoundingClientRect();
    for (const [fx, fy] of [[0.5, 0.5], [0.5, 0.62], [0.42, 0.5], [0.58, 0.5], [0.5, 0.38]]) {
      const x = r.left + r.width * fx, y = r.top + r.height * fy;
      const hit = document.elementFromPoint(x, y), owner = hit && hit.closest && hit.closest('.wall-item');
      if (owner === g) return { i, f: its[i].f, x, y };
    }
  }
  return null;
}, idx);
const drag = async (p, x, y, dx, dy) => {
  await p.mouse.move(x, y);
  await p.mouse.down();
  for (let s = 1; s <= 14; s++) { await p.mouse.move(x + dx * s / 14, y + dy * s / 14); await p.waitForTimeout(16); }
  await p.mouse.up();
  await p.waitForTimeout(300);
};

(async () => {
  const taken = await get(BASE + '/');
  if (taken.status) { console.log('port ' + PORT + ' already answers — run with PORT=<a free port>'); process.exit(2); }

  // THE THROWAWAY SITE: serve.js and toem2/, and nothing that is this machine's
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'toem2-save-'));
  const skip = /[\\/]results([\\/]|$)|\.(png|lnk|ico|bat|keep-bak|tmp)$|[\\/]probe-[^\\/]*\.js$/;
  fs.copyFileSync(path.join(SITE, 'serve.js'), path.join(tmp, 'serve.js'));
  fs.cpSync(path.join(SITE, 'toem2'), path.join(tmp, 'toem2'), { recursive: true, filter: src => !skip.test(src) });
  const SEEDFILE = path.join(tmp, 'toem2', 'wall-seed.json'), BAK = SEEDFILE + '.keep-bak';
  const ORIGINAL = JSON.parse(fs.readFileSync(SEEDFILE, 'utf8')), ORIGINAL_BYTES = fs.readFileSync(SEEDFILE);
  const N = ORIGINAL.wall.items.length;
  const fileNow = () => JSON.parse(fs.readFileSync(SEEDFILE, 'utf8'));
  const server = spawn(process.execPath, [path.join(tmp, 'serve.js'), String(PORT)], { cwd: tmp, stdio: 'ignore', windowsHide: true });
  let browser = null;
  const errs = [];

  const finish = async () => {
    try { if (browser) await browser.close(); } catch (e) {}
    try { server.kill(); } catch (e) {}
    await new Promise(r => setTimeout(r, 600));
    try { fs.rmSync(tmp, { recursive: true, force: true }); } catch (e) {}
    const changed = REAL.filter((f, i) => realBefore[i] !== hash(f));
    say(!changed.length, 'the real site was not written — all of it happened in the throwaway copy', changed.join(', ') || REAL.length + ' files unchanged');
    say(!errs.length, 'no page errors', errs.join(' | '));
    console.log('\n' + (fails ? fails + ' FAILED' : 'all checks passed'));
    process.exit(fails ? 1 : 0);
  };

  try {
    let up = false;
    for (let i = 0; i < 40 && !up; i++) {
      const r = await get(BASE + '/_toem2/wall');
      up = r.status === 200 && /door/.test(r.body);
      if (!up) await new Promise(r => setTimeout(r, 250));
    }
    say(up, "the throwaway copy's own server answers TOEM 2's save door", tmp);
    if (!up) return finish();

    browser = await chromium.launch({ channel: 'chrome', headless: false,
      args: ['--window-size=1616,1110', '--window-position=0,0', '--host-resolver-rules=MAP toem2-deployed.test 127.0.0.1'] });
    const open = async () => {
      const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });
      const p = await ctx.newPage();
      p.on('pageerror', e => { errs.push(String(e)); console.log('PAGEERROR', String(e)); });
      return p;
    };
    const seeded = p => p.waitForFunction(n => window.Wall && window.Stickers && window.Seed &&
      Wall.store.get().items.filter(Boolean).length === n && Stickers.list.length > 0 &&
      document.querySelectorAll('svg.wall-ink .wall-item').length === n, N, { timeout: 30000 });

    /* ── 1 · a first visit ─────────────────────────────────────────────── */
    const page = await open();
    await page.goto(BASE + '/toem2/?seed=on', { waitUntil: 'load' });
    await page.evaluate(() => { try { localStorage.clear(); } catch (e) {} });
    await page.reload({ waitUntil: 'load' });
    await seeded(page);
    await waitText(page, /^saved$/);
    await page.waitForTimeout(400);
    const b1 = await button(page);
    const head = await page.evaluate(() => ({
      inTools: !!document.querySelector('.lab-tools #toem-save'),
      others: ['lab-save', 'lab-keep', 'lab-seed'].filter(id => { const e = document.getElementById(id); return e && e.getClientRects().length > 0; }),
      row: Math.round(document.querySelector('.lab-tools').getBoundingClientRect().height) }));
    say(!!b1 && b1.shown && b1.text === 'saved' && /\bis-clean\b/.test(b1.cls), 'on a first visit the header has a save button, and it reads "saved"',
      b1 && b1.text + ' (' + b1.cls + ')');
    say(head.inTools && !head.others.length, 'it is the only save in the header — no "save layout", no autosave pill, no "publish the wall"',
      head.others.join(', ') || 'none of them showing');
    say(head.row <= 40, 'and the row of tools is still one line', head.row + 'px tall');
    const widths = new Set([b1.width]), unfit = [];
    const note = b => { widths.add(b.width); if (!b.fits) unfit.push(b.text); };

    /* ── 2 · a real drag, then ctrl+s — watching the bench all the while ── */
    const idx = await frameOn(page, '05', 0.6);
    await page.waitForTimeout(400);
    const grab = await inkPoint(page, idx);
    say(!!grab, 'a press finds one of Meadow Picnic\'s pieces by its ink', grab ? grab.f : 'nothing on top anywhere');
    if (!grab) return finish();
    const s0 = await items(page);
    await watchBench(page, 1500);
    await drag(page, grab.x, grab.y, 90, 50);
    const s1 = await items(page);
    const moved = s1.map((it, i) => (same(it, s0[i]) ? -1 : i)).filter(i => i >= 0);
    await waitText(page, /^save changes$/);
    const b2 = await button(page);
    note(b2);
    await page.waitForTimeout(1300);
    const seenDrag = await benchSeen(page);
    say(moved.length === 1 && moved[0] === grab.i && b2.text === 'save changes' && !/\bis-clean\b/.test(b2.cls),
      'a real drag moves that piece, and the button says "save changes"', moved.length + ' moved · ' + b2.text);
    say(seenDrag.length === 1, '…and the bench does not move when the button changes its word', seenDrag.join(' / ') + ' (top,height)');

    await watchBench(page, 3200);
    await page.keyboard.press('Control+s');
    await waitText(page, /^saved/);
    note(await button(page));
    await page.waitForTimeout(300);
    const f1 = fileNow();
    const others1 = f1.wall.items.every((it, i) => i === grab.i || same(it, ORIGINAL.wall.items[i]));
    say(f1.wall.items.length === N && same(f1.wall.items[grab.i], s1[grab.i]) && !same(f1.wall.items[grab.i], ORIGINAL.wall.items[grab.i]) && others1,
      'ctrl+s writes wall-seed.json: that piece where it was let go, every other piece as it was',
      f1.wall.items.length + ' pieces · ' + grab.f + ' at ' + f1.wall.items[grab.i].x + ',' + f1.wall.items[grab.i].y);
    say(same(f1.cam, ORIGINAL.cam) && same(f1.cam_narrow, ORIGINAL.cam_narrow),
      'and the view a first visit opens on is kept — not replaced by where this bench is looking', JSON.stringify(f1.cam));
    say(fs.existsSync(BAK) && Buffer.compare(fs.readFileSync(BAK), ORIGINAL_BYTES) === 0,
      'the file as it stood before the first save is kept beside it', 'wall-seed.json.keep-bak');
    await waitText(page, /^saved$/, 6000);
    const b3 = await button(page);
    note(b3);
    await page.waitForTimeout(700);
    const seenSave = await benchSeen(page);
    say(b3.text === 'saved' && /\bis-clean\b/.test(b3.cls), 'then the button settles back to "saved"', b3.text);
    say(seenSave.length === 1, '…and through the whole save — saving, saved ✓, saved — the bench did not move', seenSave.join(' / ') + ' (top,height)');

    /* ── 3 · what was saved is what a first visit opens on ─────────────── */
    const page2 = await open();
    await page2.goto(BASE + '/toem2/?seed=on', { waitUntil: 'load' });
    await seeded(page2);
    const fresh = (await items(page2)).filter(Boolean);
    say(same(fresh, f1.wall.items), 'a fresh browser opens on what was saved, the moved piece and all',
      grab.f + ' at ' + fresh[grab.i].x + ',' + fresh[grab.i].y);
    await page2.context().close();

    /* ── 4 · undo, then a click ─────────────────────────────────────────── */
    await page.keyboard.press('Control+z');
    await waitText(page, /^save changes$/);
    const s2 = await items(page);
    const b4 = await button(page);
    say(same(s2, s0) && b4.text === 'save changes', 'ctrl+z puts the piece back, and the button says "save changes" — the file still has the move', b4.text);
    await page.click('#toem-save');
    await waitText(page, /^saved/);
    await page.waitForTimeout(300);
    const f2 = fileNow();
    say(same(f2.wall.items, ORIGINAL.wall.items) && same(f2.cam, ORIGINAL.cam), 'a click saves that: the file holds the original pieces again', '');
    say(Buffer.compare(fs.readFileSync(BAK), ORIGINAL_BYTES) === 0, 'and the backup is still the file from before the first save — one a run', '');

    /* ── 5 · a reload ───────────────────────────────────────────────────── */
    await page.reload({ waitUntil: 'load' });
    await seeded(page);
    await waitText(page, /^(saved|save changes)$/);
    const b5 = await button(page);
    say(b5.text === 'saved' && /\bis-clean\b/.test(b5.cls), 'after a reload it still reads "saved"', b5.text);

    /* ── 6 · shift-click saves the view on screen ───────────────────────── */
    await page.evaluate(() => { const b = Lab.bench.getBoundingClientRect(); Lab.camTo(0.5, b.width / 2 - 1500 * 0.5, b.height / 2 - 900 * 0.5, 0); });
    await page.waitForTimeout(300);
    const viewNow = () => page.evaluate(() => {
      const b = Lab.bench.getBoundingClientRect(), c = Lab.toWorld(b.left + b.width / 2, b.top + b.height / 2);
      return { z: Math.round(Lab.zoom * 10000) / 10000, cx: Math.round(c.x * 10) / 10, cy: Math.round(c.y * 10) / 10, w: Math.round(b.width) };
    });
    // three links, checked one at a time: what the press POSTED (read off the wire), whether that
    // is the view on screen, and whether the file holds what was posted
    let posted = null;
    const onRequest = req => {
      if (req.method() === 'POST' && /\/_toem2\/wall$/.test(req.url())) { try { posted = JSON.parse(req.postData()); } catch (e) {} }
    };
    page.on('request', onRequest);
    const before = await viewNow();
    await watchBench(page, 3500);
    await page.click('#toem-save', { modifiers: ['Shift'] });
    await waitText(page, /^saved/);
    const b6 = await button(page);
    note(b6);
    await page.waitForTimeout(3400);
    const after = await viewNow();
    const seenShift = await benchSeen(page);
    page.off('request', onRequest);
    const f3 = fileNow();
    console.log('        view before the press ' + JSON.stringify(before) + ' · posted ' + JSON.stringify(posted && posted.cam) +
                ' · written ' + JSON.stringify(f3.cam) + ' · view after ' + JSON.stringify(after));
    say(!!posted && same(f3.cam, posted.cam), 'shift-click posts a view, and that view is what the file now opens on', JSON.stringify(f3.cam));
    say(!!posted && same(posted.cam, before) && same(before, after) && seenShift.length === 1,
      '…and it is the view the bench was showing when it was pressed', seenShift.length === 1 ? 'the bench held still through the press' : 'the bench moved: ' + seenShift.join(' / '));
    say(/this view/.test(b6.note), '…and the note under the button says so', JSON.stringify(b6.note));
    say(same(f3.cam_narrow, ORIGINAL.cam_narrow) && same(f3.wall.items, ORIGINAL.wall.items), '…while the phone view and the pieces stay as they were', '');

    /* ── 7 · a server with no door, and the deployed site ───────────────── */
    const page3 = await open();
    await page3.route('**/_toem2/wall', r => r.fulfill({ status: 404, contentType: 'text/plain', body: '404 /_toem2/wall' }));
    await page3.goto(BASE + '/toem2/?seed=on', { waitUntil: 'load' });
    await seeded(page3);
    await waitText(page3, /^(saved|save changes)$/);
    const bytes3 = fs.readFileSync(SEEDFILE);
    const b7 = await button(page3);
    await page3.click('#toem-save');
    await waitText(page3, /^not saved$/);
    const b8 = await button(page3);
    note(b8);
    say(b7.shown && b8.text === 'not saved' && /\bis-bad\b/.test(b8.cls) && /older/.test(b8.note) && /shortcut/.test(b8.note) && b8.noteBad &&
        Buffer.compare(fs.readFileSync(SEEDFILE), bytes3) === 0,
      'on a server with no door for it the button still stands, says "not saved", the note says to restart the server, and nothing is written',
      JSON.stringify(b8.note));
    await page3.context().close();

    say(widths.size === 1 && !unfit.length, 'every word the button said fit it, at one width', Array.from(widths).join(', ') + 'px' + (unfit.length ? ' · did not fit: ' + unfit.join(', ') : ''));

    const page4 = await open();
    await page4.goto(DEPLOYED + '/toem2/?seed=on', { waitUntil: 'load' });
    await seeded(page4);
    await page4.waitForTimeout(800);
    const b9 = await button(page4);
    const local4 = await page4.evaluate(() => document.documentElement.classList.contains('lab-local'));
    say(!local4 && !!b9 && b9.shown && b9.text === 'offline' && b9.disabled, 'on the deployed site — a hostname that is not this machine — the button is the live wall’s, and with no door it stands disabled and says "offline"', JSON.stringify({ local: local4, shown: b9 && b9.shown, text: b9 && b9.text, disabled: b9 && b9.disabled }));
    await page4.context().close();
  } catch (e) {
    say(false, 'the probe ran to the end', String((e && e.stack) || e).split('\n').slice(0, 3).join(' | '));
  }
  return finish();
})();
