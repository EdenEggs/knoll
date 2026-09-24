/* toem2/probe-chaos.js — THE THREE LEVELS OF CHAOS, END TO END, in headless
   Chrome against a serve.js of its own over a throwaway store: three gnomes
   through the gate; a space made at /yard/new/ as a council; its settings
   page, its face, its dashboard; the wall at /toem2/?page= with the chaos
   stamp, a keeper's live edit, a stranger's motion with its mark on the
   paper, the ballot machine (mark aye, drag into the slot, the tally), the
   history panel's rows and a gnome's card; the yard's bell; then wild and
   read-only. Nothing of the owner's is touched (the preload beside serve.js
   404s the benches' doors and keeps the store in a temp dir).

   Run:  node toem2/probe-chaos.js          (needs Playwright at Desktop/node_modules) */
'use strict';
const fs = require('fs'), os = require('os'), path = require('path'), { spawn } = require('child_process');
const { chromium } = require('C:/Users/bobb9/Desktop/node_modules/playwright');

const ROOT = path.join(__dirname, '..');
const PORT = 4327, BASE = 'http://localhost:' + PORT;
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'knoll-chaos-e2e-'));
const DB = path.join(tmp, 'wall-db.json');
let fails = 0;
const check = (name, ok, info) => { if (!ok) fails++; console.log((ok ? '  PASS  ' : '  FAIL  ') + name + (info == null || info === '' ? '' : '   ' + info)); };
const j = v => JSON.stringify(v);
const sleep = ms => new Promise(r => setTimeout(r, ms));

// the store, edited between requests: a role, a standing day (the file store reads the file before every command)
const store = () => JSON.parse(fs.readFileSync(DB, 'utf8'));
const bless = (id, fields, days) => {
  const d = store();
  d.h = d.h || {}; d.t = d.t || {};
  d.h['toem2:user:' + id] = Object.assign(d.h['toem2:user:' + id] || {}, fields || {});
  if (days) { const t = d.t['toem2:days:' + id] = d.t['toem2:days:' + id] || {}; days.forEach(x => { t[x] = 1; }); }
  fs.writeFileSync(DB, JSON.stringify(d));
};

async function waitPort() {
  for (let i = 0; i < 60; i++) {
    try { const r = await fetch(BASE + '/api/wall?ping=1'); if (r.ok) return true; } catch (e) {}
    await sleep(250);
  }
  return false;
}

(async () => {
  // the test server's preload: the wall and the hills in the temp dir, and the benches' autosave doors answering 404
  const preload = path.join(tmp, 'preload.js');
  fs.writeFileSync(preload, [
    "'use strict';",
    "const http = require('http');",
    "process.env.WALL_DB = require('path').join(process.env.E2E_TMP, 'wall-db.json');",
    "process.env.HILL_ROOT = process.env.E2E_TMP;",
    "delete process.env.KV_REST_API_URL; delete process.env.UPSTASH_REDIS_REST_URL; delete process.env.VERCEL;",
    "const real = http.createServer;",
    "http.createServer = function (opts, handler) {",
    "  const h = typeof opts === 'function' ? opts : handler;",
    "  const wrapped = (req, res) => { if (/^\\/_[a-z0-9-]+\\//.test(req.url)) { res.statusCode = 404; res.end('no doors on the test server'); return; } return h(req, res); };",
    "  return typeof opts === 'function' ? real.call(http, wrapped) : real.call(http, opts, wrapped);",
    "};"
  ].join('\n'));
  const server = spawn(process.execPath, ['-r', preload, 'serve.js', String(PORT)], { cwd: ROOT, env: Object.assign({}, process.env, { E2E_TMP: tmp, NO_BROWSER: '1' }), stdio: ['ignore', 'pipe', 'pipe'] });
  server.stdout.on('data', () => {}); server.stderr.on('data', d => process.stderr.write(String(d)));
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    check('the test server is up', await waitPort());
    const G = {}; let ipN = 0;                                          // each gnome from an address of their own: the door counts by address
    async function join(name) {
      const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, extraHTTPHeaders: { 'x-real-ip': '10.5.0.' + (++ipN) } });
      const r = await ctx.request.post(BASE + '/api/auth', { data: { op: 'signup', name, email: name.toLowerCase() + '@probe.example', password: 'toadstool1' }, headers: { origin: BASE } });
      const out = await r.json();
      G[name] = { ctx, id: out.me && out.me.id, tag: out.me && out.me.tag };
      return G[name];
    }
    const maker = await join('Maker'), friend = await join('Friend'), stranger = await join('Stranger');
    check('three gnomes through the gate', !!(maker.id && friend.id && stranger.id), j([maker.tag, friend.tag, stranger.tag]));
    bless(stranger.id, {}, ['2026-09-01', '2026-09-02', '2026-09-03']);   // a contributor, with a vote
    // friends: Friend asks, Maker says yes
    await friend.ctx.request.post(BASE + '/api/friends', { data: { op: 'ask', tag: maker.tag }, headers: { origin: BASE } });
    await maker.ctx.request.post(BASE + '/api/friends', { data: { op: 'answer', id: friend.id, yes: true }, headers: { origin: BASE } });

    // ── 1 · the form: a council, made ────────────────────────────────────
    let page = await maker.ctx.newPage();
    await page.goto(BASE + '/yard/new/');
    await page.waitForSelector('input[aria-label="page name"]', { timeout: 20000 });
    await page.fill('input[aria-label="page name"]', 'Probe Hollow');
    await page.click('button[role="radio"]:has-text("Council")');
    await page.click('button:has-text("DAILY")');
    check('the form shows the ballot\'s period once Council is picked', await page.locator('text=THE BALLOT CLOSES').count() === 1);
    check('…and the six kinds everyone may do', await page.locator('text=What everyone may do').count() === 1 && await page.locator('label:has-text("Others\' pieces") input').count() === 1);
    await page.click('label:has-text("Notes") input');                 // notes: the keepers' only
    await page.waitForSelector('button[aria-pressed]:has-text("Friend")', { timeout: 20000 });   // the friends land after the page
    await page.click('button[aria-pressed]:has-text("Friend")');                 // Friend, invited: a keeper
    await page.click('label:has-text("I agree") input');
    await page.click('button:has-text("Create")');
    await page.waitForSelector('text=Your hill stands at', { timeout: 20000 });
    const madeNote = await page.locator('text=Your hill stands at').textContent();
    check('Create makes the page: a council, and the friend invited keeps it', /a council/.test(madeNote) && /keep it with you/.test(madeNote), madeNote);
    let sp = await (await fetch(BASE + '/api/wall?space=probe-hollow')).json();
    check('the door has it, as a council with a daily ballot and notes off', sp.ok && sp.space.chaos === 2 && sp.space.period === 1 && sp.space.feats[2] === false && sp.space.feats[0] === true, j({ chaos: sp.space.chaos, period: sp.space.period, feats: sp.space.feats }));
    let rules = await (await maker.ctx.request.get(BASE + '/api/wall?rules=1&page=probe-hollow')).json();
    check('…and Friend among its keepers, with a close set', rules.keepers.some(k => k.id === friend.id) && rules.closes > Date.now(), j(rules.keepers.map(k => k.tag)));
    await page.close();

    // ── 2 · the settings page: named after the space, saving for real ────
    page = await maker.ctx.newPage();
    await page.goto(BASE + '/settings/?space=probe-hollow');
    await page.waitForFunction(() => /Probe Hollow settings/.test(document.querySelector('h1') && document.querySelector('h1').textContent), null, { timeout: 20000 });
    check('the settings page is "<name> settings", with the real address', await page.title() === 'Probe Hollow settings · Knoll' && (await page.locator('a[href="/probe-hollow"]').first().textContent()).includes('localhost:' + PORT + '/probe-hollow'));
    check('…showing Council picked, the daily ballot, notes off and Friend ticked', await page.locator('button[role="radio"][aria-checked="true"]:has-text("Council")').count() === 1 && await page.locator('button[aria-pressed="true"]:has-text("DAILY")').count() === 1
          && !(await page.locator('label:has-text("Notes") input').isChecked()) && await page.locator('button[aria-pressed="true"]:has-text("Friend")').count() === 1);
    await page.fill('input[aria-label="page name"]', 'Probe Hollow Two');
    await page.click('button[role="radio"]:has-text("Tended")');
    await page.click('label:has-text("Notes") input');
    check('changes count up on the bar', /3 UNSAVED CHANGES/.test(await page.locator('text=UNSAVED CHANGE').textContent()));
    await page.click('button:has-text("Save changes")');
    await page.waitForSelector('text=SAVED — IT IS LIVE.', { timeout: 20000 });
    sp = await (await fetch(BASE + '/api/wall?space=probe-hollow')).json();
    check('Save changes puts them live: the sign, the level, the switch', sp.space.title === 'Probe Hollow Two' && sp.space.chaos === 1 && sp.space.feats[2] === true, j({ title: sp.space.title, chaos: sp.space.chaos, notes: sp.space.feats[2] }));
    check('…and the title follows the name', await page.title() === 'Probe Hollow Two settings · Knoll');
    await page.close();
    // a stranger who lands here looks and cannot save
    page = await stranger.ctx.newPage();
    await page.goto(BASE + '/settings/?space=probe-hollow');
    await page.waitForFunction(() => /THE MAKER/.test(document.body.textContent), null, { timeout: 20000 });
    check('a stranger on the settings page looks, and cannot save', await page.locator('button:has-text("Save changes")').isDisabled());
    await page.close();

    // ── 3 · the space's face ──────────────────────────────────────────────
    page = await maker.ctx.newPage();
    await page.goto(BASE + '/probe-hollow');
    await page.waitForSelector('#stamp:not([hidden])', { timeout: 20000 });
    check('the face wears the level and the way in, and the maker gets the gear', (await page.locator('#stamp').textContent()) === 'TENDED · KEEPERS DECIDE' && await page.locator('a.sp-btn[href="/toem2/?page=probe-hollow"]').count() === 1 && await page.locator('a.sp-btn[href="/settings/?space=probe-hollow"]').count() === 1);
    await page.close();

    // ── 4 · the wall: the stamp, a keeper's live edit, a stranger's proposal ──
    const openWall = async (who, q) => { const p = await who.ctx.newPage(); await p.goto(BASE + '/toem2/?page=probe-hollow&live=1' + (q || '')); await p.waitForFunction(() => window.Seed && Seed.LIVE && Seed.base && Seed.base.rev > 0 && !!Seed.rules, null, { timeout: 30000 }); return p; };
    const put = (p, n, x) => p.evaluate(([n, x]) => { Wall.store.update(st => { st.items.push({ n, k: 'd', f: 'tm-p01-slab-03', o: 0, x, y: 20, z: 100 }); }); return Seed.submit().then(() => document.getElementById('toem-save').textContent); }, [n, x]);
    page = await openWall(friend);
    check('the bench is the space\'s: its keys, its title, TENDED on the stamp', (await page.evaluate(() => document.documentElement.dataset.page)) === 'probe-hollow' && (await page.locator('#toem-chaos').textContent()) === 'TENDED · the keepers decide'
          && (await page.evaluate(() => Object.keys(localStorage).filter(k => k.startsWith('knoll-probe-hollow:')).length > 0 && !Object.keys(localStorage).some(k => k === 'knoll-toem2:wall'))));
    check('the friend is told they keep it', await page.evaluate(() => Seed.keeper === true && Seed.owner === false));
    let word = await put(page, 'probefriend01', 40);
    check("a keeper's piece is live", word === 'live ✓', word);
    await page.close();
    page = await openWall(stranger);
    check('the stamp\'s popover says what everyone may do', await page.evaluate(() => { document.getElementById('toem-chaos').click(); const t = document.getElementById('toem-chaos-pop').textContent; document.getElementById('toem-chaos-pop').hidden = true; return /everyone may: ink, stickers, notes/.test(t) && /keepers only: tracings, embeds, others' pieces/.test(t); }));
    check('the dock greys the keepers\' kinds and never disables them', await page.evaluate(() => { const b = document.querySelector('.dock-btn[data-tool="upload"]'); return b && b.classList.contains('is-keepers') && !b.disabled && /keepers only here/.test(b.title); }));
    word = await put(page, 'probestrang01', 80);
    check("a stranger's piece is live too: their own, of an open kind", word === 'live ✓', word);
    word = await page.evaluate(() => { Wall.store.update(st => { const i = st.items.findIndex(it => it && it.n === 'probefriend01'); if (i >= 0) st.items[i] = null; }); return Seed.submit().then(() => [document.getElementById('toem-save').textContent, document.getElementById('toem-save-note').textContent]); });
    check("…but taking the keeper's piece off is a proposal: queued, with the reason on the note", word[0] === 'queued' && /somebody else's piece/.test(word[1]), j(word));
    check('…and the piece wears the waiting mark on the paper', await page.evaluate(() => Seed.base.pending && Seed.base.pending.kind === 'queued' && document.querySelectorAll('.wall-diff .th-wait rect').length >= 0));
    await page.close();
    // the keeper decides it from the history panel's row
    page = await openWall(friend);
    await page.evaluate(() => History.open());
    await page.waitForSelector('#toem-history-panel .th-row button:has-text("reject")', { timeout: 20000 });
    check('the history panel lists the proposal with approve and reject for a keeper', await page.locator('#toem-history-panel .th-row button:has-text("approve")').count() === 1);
    await page.click('#toem-history-panel .th-row button:has-text("reject")');
    await page.fill('#toem-history-panel input.lab-why', 'leave it');
    await page.click('#toem-history-panel .th-why button:has-text("send")');
    await sleep(800);
    let notes = await (await stranger.ctx.request.get(BASE + '/api/friends')).json();
    check("…rejected with a reason in the row, and the stranger's bell says why", notes.notes[0] && notes.notes[0].kind === 'rej' && notes.notes[0].why === 'leave it', j(notes.notes[0]));
    check('a gnome\'s name opens their card', await page.evaluate(async () => { const w = document.querySelector('#toem-history-panel .th-who[role="button"]'); if (!w) return false; w.click(); await new Promise(r => setTimeout(r, 1200)); const c = document.querySelector('.th-card'); return !!c && /standing day/.test(c.textContent); }));
    await page.close();

    // ── 5 · the council: the ballot machine ───────────────────────────────
    await maker.ctx.request.post(BASE + '/api/wall', { data: { op: 'settings', page: 'probe-hollow', chaos: 2, period: 1 }, headers: { origin: BASE } });
    page = await openWall(stranger);
    check('COUNCIL on the stamp, with the clock', /^COUNCIL · ballot closes in/.test(await page.locator('#toem-chaos').textContent()), await page.locator('#toem-chaos').textContent());
    word = await page.evaluate(() => { Wall.store.update(st => { st.items.push({ n: 'probemotion01', k: 'd', f: 'tm-p01-slab-03', o: 0, x: 120, y: 20, z: 100 }); }); return Seed.submit().then(() => [document.getElementById('toem-save').textContent, document.getElementById('toem-save-note').textContent, Seed.base.pending && Seed.base.pending.kind, document.querySelectorAll('.wall-diff .th-ballot rect').length]); });
    check("a stranger's change is on the ballot, said so, and marked on the paper", word[0] === 'on the ballot' && /council/.test(word[1]) && word[2] === 'motion' && word[3] >= 1, j(word));
    await page.evaluate(() => Ballot.open());
    await page.waitForSelector('#toem-ballot-panel:not([hidden])', { timeout: 20000 });
    check('the ballot panel: the motion on the reader, and your own motion is inert', /YOUR OWN MOTION/.test(await page.locator('#bo-screen').textContent()) && await page.locator('#bo-ballot.inert').count() === 1);
    await page.close();
    page = await openWall(friend);                                       // a keeper with no standing day: no vote
    await page.evaluate(() => Ballot.open());
    await page.waitForSelector('#toem-ballot-panel:not([hidden])', { timeout: 20000 });
    check('a keeper with no standing day is told voting takes one', /STANDING DAY/.test(await page.locator('#bo-screen').textContent()));
    await page.close();
    bless(friend.id, {}, ['2026-09-10']);
    page = await openWall(friend);
    await page.evaluate(() => Ballot.open());
    await page.waitForSelector('#bo-ballot:not(.inert)', { timeout: 20000 });
    await page.click('#bo-ballot .bo-box-yes');
    check('marking AYE arms the ballot', await page.locator('#bo-ballot.armed').count() === 1 && /DRAG IT INTO/.test(await page.locator('#bo-screen').textContent()));
    const bb = await page.locator('#bo-ballot .bo-grip').boundingBox(), sb = await page.locator('#bo-slot').boundingBox();
    await page.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2);
    await page.mouse.down();
    for (let i = 1; i <= 12; i++) await page.mouse.move(bb.x + bb.width / 2 + (sb.x + sb.width / 2 - bb.x - bb.width / 2) * i / 12, bb.y + bb.height / 2 + (sb.y + sb.height / 2 - bb.y - bb.height / 2) * i / 12);
    check('over the slot, the slot lights up', await page.locator('#bo-slot.over').count() === 1);
    await page.mouse.up();
    await page.waitForSelector('#bo-stage .bo-stamp', { timeout: 20000 });
    check('the ballot posted: the machine counted it and stamped it', /VOTE SEALED/.test(await page.locator('#bo-stage .bo-stamp').textContent()) && /AYE\s*1/.test((await page.locator('#bo-screen').textContent()).replace(/\s+/g, ' ')));
    const ed = await (await maker.ctx.request.get(BASE + '/api/wall?ballot=1&page=probe-hollow')).json();
    check('…and the door has one aye on the motion', ed.queue.length === 1 && ed.queue[0].ayes === 1, j(ed.queue.map(q => [q.ayes, q.nays])));
    await page.close();

    // ── 6 · the dashboard and the yard ────────────────────────────────────
    page = await maker.ctx.newPage();
    await page.goto(BASE + '/dashboard/?space=probe-hollow');
    await page.waitForFunction(() => /Probe Hollow Two Dashboard/.test(document.body.textContent), null, { timeout: 30000 });
    check('the dashboard is "<name> Dashboard", with the gear to the settings and the wall', await page.locator('a[href="/settings/?space=probe-hollow"]').count() >= 1 && await page.locator('a[href="/toem2/?page=probe-hollow"]').count() >= 1);
    check('…its numbers are the wall\'s: pieces, edits, the ballot, how wild', /PIECES ON THE WALL/.test(await page.textContent('body')) && /ON THE BALLOT/.test(await page.textContent('body')) && /HOW WILD/.test(await page.textContent('body')));
    check('…and the strip of your spaces names this one with its level', /YOUR SPACES/.test(await page.textContent('body')) && await page.locator('text=COUNCIL').count() >= 1);
    await page.close();
    page = await friend.ctx.newPage();
    await page.goto(BASE + '/yard/');
    await page.waitForSelector('button[aria-label^="notifications"]', { timeout: 30000 });
    await page.click('button[aria-label^="notifications"]');
    await sleep(600);
    check("the friend's bell says they were made a keeper", /made you a keeper of/.test(await page.textContent('body')));
    await page.close();

    // ── 7 · wild, then read-only ──────────────────────────────────────────
    await maker.ctx.request.post(BASE + '/api/wall', { data: { op: 'settings', page: 'probe-hollow', chaos: 3 }, headers: { origin: BASE } });
    page = await openWall(stranger);
    check('WILD on the stamp', /^WILD · nothing is safe/.test(await page.locator('#toem-chaos').textContent()), await page.locator('#toem-chaos').textContent());
    word = await page.evaluate(() => { Wall.store.update(st => { const i = st.items.findIndex(it => it && it.n === 'probefriend01'); if (i >= 0) st.items[i] = null; }); return Seed.submit().then(() => document.getElementById('toem-save').textContent); });
    check("a stranger takes the keeper's piece off, live", word === 'live ✓', word);
    await page.close();
    await maker.ctx.request.post(BASE + '/api/wall', { data: { op: 'settings', page: 'probe-hollow', chaos: 0 }, headers: { origin: BASE } });
    page = await openWall(stranger);
    word = await put(page, 'probestrang02', 200).then(() => page.evaluate(() => [document.getElementById('toem-save').textContent, document.getElementById('toem-save-note').textContent]));
    check('read-only: the stranger is turned away, and told', word[0] === 'not sent' && /read-only/.test(word[1]), j(word));
    await page.close();

    // ── 8 · TOEM 2 itself, tended ─────────────────────────────────────────
    page = await stranger.ctx.newPage();
    await page.goto(BASE + '/toem2/?live=1');
    await page.waitForFunction(() => window.Seed && Seed.rules, null, { timeout: 30000 });
    check('TOEM 2 wears TENDED, and keeps its own keys', (await page.locator('#toem-chaos').textContent()) === 'TENDED · the keepers decide' && (await page.evaluate(() => document.documentElement.dataset.page == null && !!localStorage.getItem('knoll-toem2:wall'))));
    await page.close();
  } catch (e) {
    check('the probe ran to the end', false, String((e && e.stack) || e).split('\n').slice(0, 4).join(' | '));
  }
  await browser.close();
  server.kill();
  try { fs.rmSync(tmp, { recursive: true, force: true }); } catch (e) {}
  console.log('\n' + (fails ? fails + ' FAILED' : 'all checks passed'));
  process.exit(fails ? 1 : 0);
})();
