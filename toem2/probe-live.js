/* toem2/probe-live.js — THE LIVE WALL, DRIVEN: seed.js against api/wall.js, on
   a throwaway copy of the site with its own server and its own file store,
   and a hostname that is not this machine's, so the page runs the deployed
   path. A stranger and an admin, sessions minted straight into the store.

     1  a first visit opens on the wall from /api/wall — 384 pieces, revision 1
        — and the header shows the one button, reading "live", and nothing else
     2  a real drag makes it "submit"; a press with no session asks for a sign-in
        and keeps the edit; signed in (a session in storage) and back, the edit
        is sent on its own and reads "queued", the wall still revision 1 — and
        ctrl+z on the freshly loaded page takes nothing off the wall
     3  the admin opens ?review=<id>: the moved piece is picked and the camera
        is on it; approve puts it on the wall, and the stranger's tab, on its
        next pull, is at revision 2 with the piece where it was let go, "live"
     4  a gesture with a pull under it: the stranger drags the piece again, the
        admin moves X meanwhile, the stranger pulls — X lands, the drag stays in
        hand — and ctrl+z puts the piece back where revision 2 had it (the pull
        kept every index), X stays, and the paper reads "live"
     5  two edits at once: the stranger moves Y against revision 3 while the
        admin moves X again — the stranger's submit goes on (queued), and after
        a pull the paper has X where the admin left it and Y where the stranger did
     6  a paste of three pieces gets three new names, and its patch is three puts
     7  a server with no door: the page opens on wall-seed.json, the button says
        "offline"; plain localhost still reads "saved" with the file door
     8  the real site is untouched, and no page errors

   TWO HEADED WINDOWS: Chrome starves the one behind of animation frames, so
   the page being driven is brought to the front first, and every wait polls
   on a timer rather than on a frame.

   Run:  node toem2/probe-live.js    (PORT=4395 by default; any free port) */
const fs = require('fs'), path = require('path'), os = require('os'), crypto = require('crypto'), http = require('http');
const { spawn } = require('child_process');
const { chromium } = require('playwright');

const SITE = path.join(__dirname, '..');
const PORT = +(process.env.PORT || 4395);
const BASE = 'http://127.0.0.1:' + PORT;
const LIVE = 'http://toem2-live.test:' + PORT;          // mapped to this machine, but not a local hostname

let fails = 0;
const say = (ok, what, extra) => {
  if (!ok) fails++;
  console.log((ok ? '  PASS  ' : '  FAIL  ') + what + (extra == null || extra === '' ? '' : '   ' + extra));
};
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const hash = f => { try { return crypto.createHash('sha1').update(fs.readFileSync(f)).digest('hex'); } catch (e) { return 'missing'; } };
const REAL = ['toem2/wall-seed.json', 'toem2/index.html', 'toem2/seed.js', 'toem2/wall.js', 'api/wall.js', 'serve.js'].map(f => path.join(SITE, f));
const realBefore = REAL.map(hash);
const realDb = path.join(SITE, 'toem2', 'wall-db.json'), realDbBefore = fs.existsSync(realDb);

function get(url) {
  return new Promise(done => {
    const req = http.get(url, r => { let s = ''; r.on('data', c => { s += c; }); r.on('end', () => { let json = null; try { json = JSON.parse(s); } catch (e) {} done({ status: r.statusCode, body: s, json }); }); });
    req.on('error', e => done({ status: 0, error: String(e) }));
    req.setTimeout(4000, () => { req.destroy(); done({ status: 0, error: 'timeout' }); });
  });
}

// ── the bench, driven ─────────────────────────────────────────────────────
const POLL = { polling: 150 };
const button = p => p.evaluate(() => {
  const b = document.getElementById('toem-save'), n = document.getElementById('toem-save-note');
  return b ? { text: b.textContent, cls: b.className, shown: b.getClientRects().length > 0, disabled: b.disabled, title: b.title,
               note: n && !n.hidden ? n.textContent : '', buttons: n ? Array.from(n.querySelectorAll('button')).map(x => x.textContent) : [] } : null;
});
const waitText = (p, re, ms) => p.waitForFunction(src => {
  const b = document.getElementById('toem-save');
  return !!b && new RegExp(src).test(b.textContent);
}, re.source, Object.assign({ timeout: ms || 8000 }, POLL));
const waitRev = (p, rev) => p.waitForFunction(r => window.Seed && Seed.base && Seed.base.rev === r, rev, Object.assign({ timeout: 8000 }, POLL));
const items = p => p.evaluate(() => JSON.parse(JSON.stringify(Wall.store.get().items)));
const byName = (list, n) => list.find(it => it && it.n === n);
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
      if (owner === g) return { i, n: its[i].n, f: its[i].f, x, y };
    }
  }
  return null;
}, idx);
// the same, for one piece by name: a point of its own ink, or nothing if another piece is over it
const inkOf = (p, n) => p.evaluate(n => {
  const its = Wall.store.get().items, i = its.findIndex(it => it && it.n === n);
  const g = document.querySelector('svg.wall-ink .wall-item[data-i="' + i + '"]');
  if (!g) return null;
  const r = g.getBoundingClientRect();
  for (const [fx, fy] of [[0.5, 0.5], [0.5, 0.62], [0.42, 0.5], [0.58, 0.5], [0.5, 0.38]]) {
    const x = r.left + r.width * fx, y = r.top + r.height * fy;
    const hit = document.elementFromPoint(x, y), owner = hit && hit.closest && hit.closest('.wall-item');
    if (owner === g) return { i, n, x, y };
  }
  return null;
}, n);
const drag = async (p, x, y, dx, dy) => {
  await p.bringToFront();
  await p.mouse.move(x, y);
  await p.mouse.down();
  for (let s = 1; s <= 14; s++) { await p.mouse.move(x + dx * s / 14, y + dy * s / 14); await p.waitForTimeout(16); }
  await p.mouse.up();
  await p.waitForTimeout(300);
};
// a press on one of the note's buttons, and what the note held if it was not there to press
async function noteClick(p, label) {
  await p.bringToFront();
  const loc = p.locator('#toem-save-note button', { hasText: label }).first();
  try { await loc.click({ timeout: 10000 }); }
  catch (e) {
    const html = await p.evaluate(() => { const n = document.getElementById('toem-save-note'); return n ? n.outerHTML.slice(0, 300) : 'no note'; });
    throw new Error('no "' + label + '" to press — the note held: ' + html + ' — ' + String(e.message).split('\n').slice(0, 8).join(' | '));
  }
}
// a move made on the store by hand, the way a drag ends — no gesture, so undo does not know it
const nudge = (p, n, dx) => p.evaluate(({ n, dx }) => {
  Wall.store.update(st => { const it = st.items.find(it => it && it.n === n); it.x = Math.round((it.x + dx) * 10) / 10; });
}, { n, dx });
const submit = async (p, re, ms) => { await p.bringToFront(); await p.evaluate(() => Seed.submit()); await waitText(p, re, ms || 15000); };

(async () => {
  const taken = await get(BASE + '/');
  if (taken.status) { console.log('port ' + PORT + ' already answers — run with PORT=<a free port>'); process.exit(2); }

  // THE THROWAWAY SITE: serve.js, api/, toem2/, and nothing that is this machine's
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'toem2-live-'));
  const skip = /[\\/]results([\\/]|$)|\.(png|lnk|ico|bat|keep-bak|tmp)$|[\\/]probe-[^\\/]*\.js$|wall-db\.json$/;
  fs.copyFileSync(path.join(SITE, 'serve.js'), path.join(tmp, 'serve.js'));
  fs.mkdirSync(path.join(tmp, 'api'));
  fs.copyFileSync(path.join(SITE, 'api', 'wall.js'), path.join(tmp, 'api', 'wall.js'));
  fs.cpSync(path.join(SITE, 'toem2'), path.join(tmp, 'toem2'), { recursive: true, filter: src => !skip.test(src) });
  const DB = path.join(tmp, 'toem2', 'wall-db.json');
  const ORIGINAL = JSON.parse(fs.readFileSync(path.join(tmp, 'toem2', 'wall-seed.json'), 'utf8'));
  const N = ORIGINAL.wall.items.length;
  // the same module, in this process, on the same file: for minting sessions
  process.env.WALL_DB = DB; delete process.env.KV_REST_API_URL; delete process.env.UPSTASH_REDIS_REST_URL; delete process.env.VERCEL;
  const API = require(path.join(tmp, 'api', 'wall.js'));
  const env = Object.assign({}, process.env, { WALL_DB: DB });
  const server = spawn(process.execPath, [path.join(tmp, 'serve.js'), String(PORT)], { cwd: tmp, stdio: 'ignore', windowsHide: true, env });
  let browser = null;
  const errs = [];
  const wallNow = async () => (await get(BASE + '/api/wall')).json;

  const finish = async () => {
    try { if (browser) await browser.close(); } catch (e) {}
    try { server.kill(); } catch (e) {}
    await new Promise(r => setTimeout(r, 600));
    try { fs.rmSync(tmp, { recursive: true, force: true }); } catch (e) {}
    const changed = REAL.filter((f, i) => realBefore[i] !== hash(f));
    say(!changed.length && fs.existsSync(realDb) === realDbBefore, 'the real site was not written — all of it happened in the throwaway copy', changed.join(', ') || REAL.length + ' files unchanged, no db file made');
    say(!errs.length, 'no page errors', errs.join(' | '));
    console.log('\n' + (fails ? fails + ' FAILED' : 'all checks passed'));
    process.exit(fails ? 1 : 0);
  };

  try {
    let up = false;
    for (let i = 0; i < 40 && !up; i++) {
      const r = await get(BASE + '/api/wall?ping=1');
      up = r.status === 200 && r.json && r.json.door;
      if (!up) await new Promise(r => setTimeout(r, 250));
    }
    say(up, "the throwaway copy's own server answers the wall door", tmp);
    if (!up) return finish();
    const USER = { nu: 'b'.repeat(16), adm: 'a'.repeat(16) };
    await API.db('HSET', API.K.user(USER.nu), 'made', '1', 'name', 'stranger', 'role', 'user');
    await API.db('HSET', API.K.user(USER.adm), 'made', '1', 'name', 'owner', 'role', 'admin');
    const SESS = { nu: await API.mintSession(USER.nu), adm: await API.mintSession(USER.adm) };

    browser = await chromium.launch({ channel: 'chrome', headless: false,
      args: ['--window-size=1616,1110', '--window-position=0,0', '--host-resolver-rules=MAP toem2-live.test 127.0.0.1'] });
    const open = async () => {
      const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });
      const p = await ctx.newPage();
      p.on('pageerror', e => { errs.push(String(e)); console.log('PAGEERROR', String(e)); });
      return p;
    };
    const loaded = p => p.waitForFunction(n => window.Wall && window.Stickers && window.Seed && Seed.base && Seed.base.rev > 0 &&
      Wall.store.get().items.filter(Boolean).length === n && Stickers.list.length > 0 &&
      document.querySelectorAll('svg.wall-ink .wall-item').length === n, N, Object.assign({ timeout: 30000 }, POLL));

    /* ── 1 · a first visit ─────────────────────────────────────────────── */
    const page = await open();
    await page.goto(LIVE + '/toem2/', { waitUntil: 'load' });
    await page.evaluate(() => { try { localStorage.clear(); } catch (e) {} });
    await page.reload({ waitUntil: 'load' });
    await loaded(page);
    await waitText(page, /^live$/);
    const b1 = await button(page);
    const head = await page.evaluate(() => ({
      live: document.documentElement.classList.contains('lab-live'), local: document.documentElement.classList.contains('lab-local'),
      rev: Seed.base.rev, others: Array.from(document.querySelectorAll('.lab-tools > *')).filter(e => e.id !== 'toem-save' && e.id !== 'toem-save-note' && e.getClientRects().length > 0).map(e => e.textContent.trim()),
      named: Wall.store.get().items.filter(Boolean).every(it => /^[a-z0-9]{8,20}$/.test(it.n)) }));
    say(head.live && !head.local && head.rev === 1 && b1 && b1.shown && b1.text === 'live' && /\bis-clean\b/.test(b1.cls),
      'a first visit opens on the wall from /api/wall, revision 1, and the button reads "live"', JSON.stringify({ rev: head.rev, text: b1 && b1.text }));
    say(same(head.others, ['history']) && head.named, 'the header shows that button, the history link, and nothing else — and every piece is named', head.others.join(', ') || 'nothing else showing');

    /* ── 2 · a drag, a press without a session, then signed in and back ── */
    const idx = await frameOn(page, '05', 0.6);
    await page.waitForTimeout(400);
    const grab = await inkPoint(page, idx);
    say(!!grab, "a press finds one of Meadow Picnic's pieces by its ink", grab ? grab.f : 'nothing on top anywhere');
    if (!grab) return finish();
    const A = grab.n;
    const s0 = await items(page);
    await drag(page, grab.x, grab.y, 90, 50);
    const s1 = await items(page);
    await waitText(page, /^submit$/);
    const p1 = await page.evaluate(() => { const p = Seed.patch(); return { puts: Object.keys(p.put), dels: p.del, base: p.base }; });
    say(same(p1.puts, [A]) && !p1.dels.length && p1.base === 1 && byName(s1, A).x !== byName(s0, A).x, 'a real drag moves that piece, and the patch is that one put against revision 1', JSON.stringify(p1));
    await page.click('#toem-save');
    await page.waitForTimeout(300);
    const b2 = await button(page);
    const resume = await page.evaluate(() => localStorage.getItem('knoll-toem2:resume'));
    say(/sign in/i.test(b2.note) && b2.buttons.some(t => /google/i.test(t)) && resume === '1' && b2.text === 'submit',
      'a press with no session asks for a sign-in, keeps the edit, and marks the return', JSON.stringify({ note: b2.note.slice(0, 40), buttons: b2.buttons }));
    await page.evaluate(s => localStorage.setItem('knoll-toem2:token', s), SESS.nu);
    await page.reload({ waitUntil: 'load' });
    await loaded(page);
    await waitText(page, /^queued$/, 15000);
    const b3 = await button(page);
    const w1 = await wallNow();
    const q1 = (await get(BASE + '/api/wall?queue=1')).json;
    const s2 = await items(page);
    say(b3.text === 'queued' && /\bis-wait\b/.test(b3.cls) && w1.rev === 1 && q1.queue.length === 1 && q1.queue[0].by === USER.nu && byName(s2, A).x === byName(s1, A).x,
      'signed in and back, the edit is sent on its own: "queued", the wall still revision 1, the piece still where it was let go', JSON.stringify({ text: b3.text, rev: w1.rev, queue: q1.queue.length }));
    const editId = q1.queue[0].id;
    await page.bringToFront();
    await page.keyboard.press('Control+z');
    await page.waitForTimeout(500);
    const sz = await items(page);
    say(sz.filter(Boolean).length === N && same(sz, s2) && (await button(page)).text === 'queued', 'ctrl+z on the freshly loaded page takes nothing off the wall', sz.filter(Boolean).length + ' pieces');

    /* ── 3 · the admin reviews it ──────────────────────────────────────── */
    const admin = await open();
    await admin.goto(LIVE + '/toem2/', { waitUntil: 'load' });
    await admin.evaluate(s => { try { localStorage.clear(); localStorage.setItem('knoll-toem2:token', s); } catch (e) {} }, SESS.adm);
    await admin.bringToFront();
    await admin.goto(LIVE + '/toem2/?review=' + editId, { waitUntil: 'load' });
    await loaded(admin);
    await waitText(admin, /^reviewing$/, 15000);
    const rv = await admin.evaluate(n => {
      const its = Wall.store.get().items, picked = Array.from(document.querySelectorAll('svg.wall-ink .wall-item.wall-picked')).map(g => its[+g.dataset.i].n);
      const i = its.findIndex(it => it && it.n === n);
      const r = document.querySelector('svg.wall-ink .wall-item[data-i="' + i + '"]').getBoundingClientRect(), b = Lab.bench.getBoundingClientRect();
      return { picked, x: its[i].x, role: Seed.me && Seed.me.role, onScreen: r.left >= b.left && r.right <= b.right && r.top >= b.top && r.bottom <= b.bottom };
    }, A);
    const b4 = await button(admin);
    say(same(rv.picked, [A]) && rv.x === byName(s1, A).x && rv.role === 'admin' && b4.buttons.includes('approve') && b4.buttons.includes('reject'),
      'the admin sees the edit laid over the paper: that piece picked, where the stranger put it, approve and reject to hand', JSON.stringify({ picked: rv.picked.length, x: rv.x, buttons: b4.buttons }));
    say(rv.onScreen, 'and the camera is brought to it: the piece is on screen', '');
    await noteClick(admin, 'approve');
    await waitText(admin, /^live/, 15000);
    const w2 = await wallNow();
    say(w2.rev === 2 && byName(w2.wall.items, A).x === byName(s1, A).x && w2.wall.items.length === N, 'approve puts it on the wall: revision 2, the piece where it was let go, nothing else', 'rev ' + w2.rev);
    // the stranger's tab, on its next pull
    await page.bringToFront();
    await page.evaluate(() => Seed.pull(true));
    await waitRev(page, 2);
    await waitText(page, /^live/, 8000);
    const s3 = await items(page);
    const others = s3.filter(Boolean).every(it => it.n === A || same(it, byName(s0, it.n)));
    say(byName(s3, A).x === byName(s1, A).x && others, "the stranger's tab pulls revision 2: reads \"live\", the piece stays, nothing else moved", '');
    await page.waitForTimeout(6500);                       // the "approved" note settles back
    await waitText(page, /^live$/);

    /* ── 4 · a gesture, a pull under it, and its undo ──────────────────── */
    const again = await inkOf(page, A);
    say(!!again, 'the piece is still on top where it was let go, for a second press', '');
    if (!again) return finish();
    await drag(page, again.x, again.y, -60, 40);
    await waitText(page, /^submit$/);
    const s4 = await items(page);
    say(byName(s4, A).x !== byName(s3, A).x, 'a second drag moves it again — a gesture undo knows', '');
    const X = s0.filter(it => it && it.c && it.n !== A)[0].n, Y = s0.filter(it => it && it.c && it.n !== A)[1].n;
    await admin.bringToFront();
    await nudge(admin, X, 120);
    await submit(admin, /^live ✓$/);
    const w3 = await wallNow();
    say(w3.rev === 3 && byName(w3.wall.items, X).x === byName(s0, X).x + 120, "meanwhile the admin's move of X is live at once: revision 3", 'rev ' + w3.rev);
    await page.bringToFront();
    await page.evaluate(() => Seed.pull(true));
    await waitRev(page, 3);
    const s5 = await items(page);
    say(byName(s5, X).x === byName(s0, X).x + 120 && byName(s5, A).x === byName(s4, A).x && (await button(page)).text === 'submit',
      "the pull lays revision 3 under the stranger's unsent drag: X where the admin put it, the piece still in hand, \"submit\"", JSON.stringify({ X: byName(s5, X).x, A: byName(s5, A).x }));
    await page.keyboard.press('Control+z');
    await waitText(page, /^live$/, 9000);
    const s6 = await items(page);
    say(same(byName(s6, A), byName(s3, A)) && byName(s6, X).x === byName(s0, X).x + 120,
      'ctrl+z puts the piece back where revision 2 had it — the pull kept every index — X stays, and the paper reads "live"', JSON.stringify({ A: byName(s6, A).x, X: byName(s6, X).x }));

    /* ── 5 · two edits at once ─────────────────────────────────────────── */
    await nudge(page, Y, 80);
    await waitText(page, /^submit$/);
    await admin.bringToFront();
    await nudge(admin, X, 30);
    await submit(admin, /^live ✓$/);
    say((await wallNow()).rev === 4, "the admin moves X again: revision 4", '');
    await submit(page, /^queued$/);
    await page.evaluate(() => Seed.pull(true));
    await waitRev(page, 4);
    const s7 = await items(page);
    say(byName(s7, X).x === byName(s0, X).x + 150 && byName(s7, Y).x === byName(s0, Y).x + 80 && (await button(page)).text === 'queued',
      "the stranger's move of Y, made against revision 3, is queued, and the paper shows X where the admin left it and Y where the stranger did", JSON.stringify({ X: byName(s7, X).x, Y: byName(s7, Y).x }));

    /* ── 6 · a paste ───────────────────────────────────────────────────── */
    await admin.bringToFront();
    const pasted = await admin.evaluate(names => {
      const before = new Set(Wall.store.get().items.filter(Boolean).map(it => it.n));
      Wall.pickN(names); Wall.copy(); Wall.paste();
      const now = Wall.store.get().items.filter(Boolean);
      const fresh = now.filter(it => !before.has(it.n)).map(it => it.n);
      const p = Seed.patch();
      return { count: now.length, fresh, named: fresh.every(n => /^[a-z0-9]{8,20}$/.test(n)), puts: Object.keys(p.put).sort(), canon: now.filter(it => fresh.includes(it.n)).some(it => it.c) };
    }, [X, Y, A]);
    say(pasted.count === N + 3 && pasted.fresh.length === 3 && pasted.named && same(pasted.puts, pasted.fresh.slice().sort()) && !pasted.canon,
      'a paste of three pieces gets three new names — none canon — and its patch is those three puts', JSON.stringify(pasted.fresh));
    await admin.evaluate(() => { Wall.store.set({ items: JSON.parse(JSON.stringify(Seed.base.items)) }); });

    /* ── 7 · the history panel ─────────────────────────────────────────── */
    await admin.bringToFront();
    await admin.click('#toem-history');
    await admin.waitForFunction(() => { const p = document.getElementById('toem-history-panel'); return !!p && !p.hidden && p.querySelectorAll('.th-row[data-rev]').length >= 4; }, null, Object.assign({ timeout: 8000 }, POLL));
    const hist = await admin.evaluate(() => ({ rows: Array.from(document.querySelectorAll('#toem-history-panel .th-row[data-rev]')).map(r => +r.dataset.rev),
      waiting: document.querySelectorAll('#toem-history-panel div.th-row').length, me: document.querySelector('#toem-history-panel .th-me').textContent }));
    say(hist.rows[0] === 4 && hist.rows[hist.rows.length - 1] === 1 && hist.waiting === 1 && /owner/.test(hist.me),
      'the admin opens the history: four revisions newest first, one edit waiting, and who they are', JSON.stringify(hist));
    await admin.click('#toem-history-panel .th-row[data-rev="4"]');
    await admin.waitForFunction(() => document.querySelectorAll('svg.wall-diff rect').length > 0, null, Object.assign({ timeout: 8000 }, POLL));
    const d4 = await admin.evaluate(() => ({ chg: document.querySelectorAll('svg.wall-diff rect.th-chg').length, lines: document.querySelectorAll('svg.wall-diff line.th-line').length,
      foot: document.querySelector('#toem-history-panel .th-foot').textContent.slice(0, 40), buttons: Array.from(document.querySelectorAll('#toem-history-panel .th-foot button')).map(b => b.textContent) }));
    say(d4.chg === 1 && d4.lines === 1 && /#4/.test(d4.foot) && d4.buttons.includes('revert') && d4.buttons.includes('strike'),
      'revision 4 on the paper: one amber box and a line from where X was, with revert and strike to hand', JSON.stringify(d4));
    await admin.locator('#toem-history-panel .th-foot button', { hasText: 'revert' }).first().click();
    await admin.waitForFunction(() => window.Seed && Seed.base && Seed.base.rev === 5, null, Object.assign({ timeout: 15000 }, POLL));
    const w5 = await wallNow(), s8 = await items(admin);
    say(w5.rev === 5 && byName(w5.wall.items, X).x === byName(s0, X).x + 120 && byName(s8, X).x === byName(s0, X).x + 120,
      'revert from the panel: revision 5 puts X back where revision 4 found it, on the wall and on this paper', JSON.stringify({ X: byName(w5.wall.items, X).x }));
    await admin.click('#toem-history-panel .lp-x');
    const closed = await admin.evaluate(() => ({ hidden: document.getElementById('toem-history-panel').hidden, boxes: document.querySelectorAll('svg.wall-diff *').length }));
    say(closed.hidden && closed.boxes === 0, 'closing the panel takes the boxes off the paper', JSON.stringify(closed));

    /* ── 8 · no door, and the dev server's own half ────────────────────── */
    const page3 = await open();
    await page3.route('**/api/wall*', r => r.fulfill({ status: 404, contentType: 'text/plain', body: '404' }));
    await page3.goto(LIVE + '/toem2/?seed=on', { waitUntil: 'load' });
    await page3.waitForFunction(n => window.Wall && Wall.store.get().items.filter(Boolean).length === n, N, Object.assign({ timeout: 30000 }, POLL));
    await page3.waitForTimeout(500);
    const b6 = await button(page3);
    say(!!b6 && b6.shown && b6.text === 'offline' && b6.disabled && (await page3.evaluate(() => Seed.base.rev)) === 0,
      'with no door the page opens on wall-seed.json, read-only, and the button says "offline"', JSON.stringify({ text: b6 && b6.text, disabled: b6 && b6.disabled }));
    await page3.context().close();
    const page4 = await open();
    await page4.goto(BASE + '/toem2/?seed=on', { waitUntil: 'load' });
    await page4.waitForFunction(n => window.Wall && window.Seed && Wall.store.get().items.filter(Boolean).length === n, N, Object.assign({ timeout: 30000 }, POLL));
    await waitText(page4, /^saved$/);
    const b7 = await button(page4);
    say(b7.text === 'saved' && (await page4.evaluate(() => !Seed.LIVE && Seed.base === null)), 'on plain localhost the file door still runs: "saved", and no live half', b7.text);
    await page4.context().close();
  } catch (e) {
    say(false, 'the probe ran to the end', String((e && e.stack) || e).split('\n').slice(0, 3).join(' | '));
  }
  return finish();
})();
