#!/usr/bin/env node
/* lab2/perf/probe-handoff.js — THE MASTER, AND A PAGE HANDED ON, end to end in headless Chrome on a safe server
   (probe-gate-google.js as the preload: temp store, /_outbox for the sign-up code, the benches' doors 404'd).
   The master finds its desk on the dashboard, makes a code for a space, and a second gnome types it into the
   yard's settings: the space stands in their yard, its settings are theirs. Then TOEM 2 goes the same way, and
   its settings page — the first page's own — opens for its new maker. A stranger sees no desk at all.
   (The door itself, and every way a code must not open anything, is lab2/perf/verify-handoff.js.)

     node lab2/perf/probe-handoff.js          (needs Chrome + Playwright at Desktop/node_modules) */
'use strict';
const fs = require('fs'), os = require('os'), path = require('path'), { spawn } = require('child_process');
const net = require('net');
const { chromium } = require(process.env.PLAYWRIGHT || 'C:/Users/bobb9/Desktop/node_modules/playwright');
const SITE = path.join(__dirname, '..', '..'), PORT = Number(process.env.PORT || 4336), BASE = 'http://localhost:' + PORT;
const gnome = require('./gnome.js');
const store = fs.mkdtempSync(path.join(os.tmpdir(), 'knoll-handoff-e2e-'));
const fails = []; let n = 0;
const ok = (c, what, extra) => { n++; if (!c) fails.push(what + (extra ? ' :: ' + String(extra).slice(0, 500) : '')); console.log((c ? '  ok   ' : '  FAIL ') + what); };
const waitPort = (port, tries = 80) => new Promise((res, rej) => { const t = () => { const s = net.connect(port, '127.0.0.1'); s.once('connect', () => { s.end(); res(); }); s.once('error', () => tries-- > 0 ? setTimeout(t, 250) : rej(new Error('port never opened'))); }; t(); });
const j = v => JSON.stringify(v);
const CODE = /^[0-9A-HJKMNP-TV-Z]{4}(-[0-9A-HJKMNP-TV-Z]{4}){3}$/;

(async () => {
  const srv = spawn(process.execPath, ['-r', path.join(SITE, 'lab2/perf/probe-gate-google.js'), 'serve.js', String(PORT)], { cwd: SITE, env: Object.assign({}, process.env, { GATE_STORE: store }), stdio: ['ignore', 'pipe', 'pipe'] });
  let log = ''; srv.stdout.on('data', d => log += d); srv.stderr.on('data', d => log += d);
  let b;
  try {
    await waitPort(PORT);
    b = await chromium.launch({ channel: 'chrome', headless: true });
    const api = (c, url) => c.request.get(BASE + url).then(r => r.json());
    const post = (c, url, data) => c.request.post(BASE + url, { headers: { origin: BASE }, data }).then(r => r.json());
    const says = (p, s, ms) => p.waitForFunction(s => document.body.innerText.includes(s), s, { timeout: ms || 8000 }).then(() => true, () => false);
    const fresh = async () => { const c = await b.newContext({ viewport: { width: 1400, height: 1100 } }); await gnome.signIn(c, BASE); await post(c, '/api/auth', { op: 'toured' }); return c; };

    // ── three gnomes: the master, the one who is handed things, and a stranger ──
    const M = await fresh(), G = await fresh(), S = await fresh();
    const master = (await api(M, '/api/auth')).me, got = (await api(G, '/api/auth')).me;
    const db = JSON.parse(fs.readFileSync(path.join(store, 'wall-db.json'), 'utf8'));
    db.h['toem2:user:' + master.id].role = 'admin';   // what ADMIN_EMAILS gives at a proved sign-in
    fs.writeFileSync(path.join(store, 'wall-db.json'), JSON.stringify(db));
    const made = await post(M, '/api/wall', { op: 'page', slug: 'probe-gift', title: 'Probe Gift' });
    ok(master && got && made.ok, 'a master, a gnome and a space the master made', j(made));

    // ── the desk, on the master's dashboard ──────────────────────────────
    const m = await M.newPage(); const errs = []; m.on('pageerror', e => errs.push('master: ' + e)); m.on('dialog', d => d.accept());
    await m.goto(BASE + '/dashboard/');
    ok(await m.waitForSelector('#dc-root #master-desk .cm-card', { timeout: 20000 }).then(() => true, () => false), 'the master\'s dashboard has the desk');
    const desk = m.locator('#dc-root #master-desk');
    ok(/The Master's Desk/.test(await desk.innerText()) && await desk.locator('.cm-row').count() === 2, 'with a row for every page: TOEM 2 and the space', await desk.innerText());
    const rowOf = name => desk.locator('.cm-row', { has: m.locator('.md-name', { hasText: name }) });
    ok(/NOBODY'S YET/.test(await rowOf('TOEM 2').innerText()) && /YOURS/.test(await rowOf('Probe Gift').innerText()), 'TOEM 2 is nobody\'s yet; the space is the master\'s own', await desk.innerText());
    await rowOf('Probe Gift').locator('button', { hasText: 'make a code' }).click();
    ok(await rowOf('Probe Gift').locator('.md-word').waitFor({ timeout: 8000 }).then(() => true, () => false), 'a press makes a code');
    const code = (await rowOf('Probe Gift').locator('.md-word').innerText()).trim();
    ok(CODE.test(code), 'sixteen letters and numbers in four fours', code);
    ok(/A CODE IS OUT · ENDS IN 7 DAYS/.test(await rowOf('Probe Gift').innerText()) && /They open their yard, press the gear/.test(await rowOf('Probe Gift').innerText()), 'the row says a code is out, when it ends, and what to tell them');
    await m.reload(); await m.waitForSelector('#dc-root #master-desk .cm-card', { timeout: 20000 });
    ok(await rowOf('Probe Gift').locator('.md-word').count() === 0 && /A CODE IS OUT/.test(await rowOf('Probe Gift').innerText()), 'read again, the desk says one is out — and cannot show it twice');

    // ── the code, typed into the yard's settings ─────────────────────────
    const g = await G.newPage(); g.on('pageerror', e => errs.push('gnome: ' + e));
    await g.goto(BASE + '/yard/');
    await g.waitForSelector('button[aria-label="settings"]', { timeout: 20000 });
    await g.click('button[aria-label="settings"]');
    const box = g.locator('input[aria-label="the code you were sent"]');
    ok(await box.waitFor({ timeout: 8000 }).then(() => true, () => false) && await says(g, 'A PAGE HANDED TO YOU'), 'the yard\'s settings have a box for a code');
    ok(await g.locator('button', { hasText: 'CLAIM' }).isDisabled(), '…whose button waits for one');
    await box.fill('ZZZZ-ZZZZ-ZZZZ-ZZZZ'); await g.locator('button', { hasText: 'CLAIM' }).click();
    ok(await says(g, 'that code opens nothing'), 'a code nobody made opens nothing, and the drawer says so');
    await box.fill(code.toLowerCase().replace(/-/g, ' ')); await g.locator('button', { hasText: 'CLAIM' }).click();
    ok(await says(g, 'Probe Gift is yours now.'), 'the real one, typed small and with spaces: "Probe Gift is yours now."');
    ok(await g.locator('a[href="/dashboard/?space=probe-gift"]', { hasText: 'open its dashboard' }).count() === 1 && (await box.inputValue()) === '', '…with the way to its dashboard, and the box emptied');
    let sp = await api(G, '/api/wall?spaces=1');
    ok(sp.spaces.length === 1 && sp.spaces[0].slug === 'probe-gift' && sp.spaces[0].handed === true && sp.spaces[0].by === got.id, 'the door has it among the gnome\'s spaces, handed', j(sp.spaces.map(s => [s.slug, s.handed])));
    await g.keyboard.press('Escape'); await g.locator('button[aria-label="close settings"]').click().catch(() => {});
    ok(await g.waitForFunction(() => window.yard && (window.yard.state.spaces || []).some(s => s.slug === 'probe-gift'), null, { timeout: 8000 }).then(() => true, () => false) && await says(g, 'Probe Gift'), 'and it stands on a hill in YOUR SPACES without a reload');

    // ── it is theirs: the dashboard's gear, the settings that save ───────
    await g.goto(BASE + '/dashboard/?space=probe-gift');
    ok(await g.waitForSelector('#dc-root a[href="/settings/?space=probe-gift"]', { timeout: 20000 }).then(() => true, () => false), 'its dashboard gives the new maker the gear');
    ok(await g.locator('#dc-root #master-desk .cm-card').count() === 0, '…and no desk: that is the master\'s');
    await g.goto(BASE + '/settings/?space=probe-gift');
    ok(await says(g, 'ALL CHANGES SAVED.', 20000) && !(await g.evaluate(() => document.body.innerText.includes('THE MAKER\'S TO CHANGE'))), 'its settings open as the maker\'s own');
    await g.locator('input[aria-label="page name"]').fill('Gift Opened');
    await g.locator('button', { hasText: 'Save changes' }).click();
    ok(await says(g, 'SAVED — IT IS LIVE.') && (await api(G, '/api/wall?space=probe-gift')).space.title === 'Gift Opened', 'a new name saves');
    await m.goto(BASE + '/settings/?space=probe-gift');
    ok(await says(m, 'ALL CHANGES SAVED.', 20000), 'the master, who stands where every maker stands, may set them too');
    await m.goto(BASE + '/dashboard/'); await m.waitForSelector('#dc-root #master-desk .cm-card', { timeout: 20000 });
    ok(new RegExp(got.tag.toUpperCase().replace(/[#]/g, '#') + '\'S · HANDED ON').test(await rowOf('Gift Opened').innerText()) && !/A CODE IS OUT/.test(await rowOf('Gift Opened').innerText()), 'the desk says whose it is now, and that no code is out', await rowOf('Gift Opened').innerText());

    // ── TOEM 2, the same way ─────────────────────────────────────────────
    await m.goto(BASE + '/dashboard/?space=toem2');
    ok(await m.waitForSelector('#dc-root #master-desk .cm-card', { timeout: 20000 }).then(() => true, () => false) && await desk.locator('.cm-row').count() === 1 && /TOEM 2/.test(await desk.locator('.md-name').innerText()), 'on TOEM 2\'s dashboard the desk has TOEM 2 alone');
    ok(await m.locator('#dc-root a[href="/settings/?space=toem2"]').count() >= 1, '…and the master has its gear');
    await desk.locator('button', { hasText: 'make a code' }).click();
    await desk.locator('.md-word').waitFor({ timeout: 8000 });
    const home = (await desk.locator('.md-word').innerText()).trim();
    const claimed = await post(G, '/api/wall', { op: 'claim', code: home });
    ok(CODE.test(home) && claimed.ok && claimed.page.slug === 'toem2', 'a code for TOEM 2, claimed', j(claimed));
    await g.goto(BASE + '/settings/?space=toem2');
    ok(await says(g, 'TOEM 2 settings', 20000) && await says(g, 'ALL CHANGES SAVED.', 20000), 'TOEM 2 has a settings page, and it is its new maker\'s');
    const words = await g.evaluate(() => document.querySelector('#dc-root').innerText);
    ok(!/PAGE NAME/.test(words) && !/THE PAPER · ONE SET/.test(words) && !/How it looks/.test(words) && /Who can edit/.test(words) && /What everyone may do/.test(words) && /ON TOEM 2 THE SITE'S MODERATORS/.test(words),
       'its name, its paper and the preview stand aside; who can edit and what everyone may do are there', words.slice(0, 300));
    await g.locator('button[role=radio]', { hasText: 'Council' }).click();
    await g.locator('button', { hasText: 'Save changes' }).click();
    ok(await says(g, 'SAVED — IT IS LIVE.') && (await api(G, '/api/wall?rules=1')).chaos === 2, 'Council, saved: the door says TOEM 2 is a council now');
    sp = await api(G, '/api/wall?spaces=1');
    ok(j(sp.spaces.map(s => s.slug)) === j(['probe-gift', 'toem2']), 'both stand among the gnome\'s spaces', j(sp.spaces.map(s => s.slug)));
    await g.goto(BASE + '/dashboard/?space=toem2');
    ok(await g.waitForSelector('#dc-root a[href="/settings/?space=toem2"]', { timeout: 20000 }).then(() => true, () => false) && await g.waitForSelector('#dc-root #corner-manage .cm-card', { timeout: 20000 }).then(() => true, () => false),
       'TOEM 2\'s dashboard gives its maker the gear and the corner\'s cards');
    await g.goto(BASE + '/toem2/?live=1');   // the live wall, on a host whose bench is otherwise the workbench
    ok(await g.waitForFunction(() => window.Seed && !!Seed.rules && document.querySelector('#toem-chaos') && !document.querySelector('#toem-chaos').hidden, null, { timeout: 30000 }).then(() => true, () => false), 'on the wall, the stamp');
    await g.click('#toem-chaos');
    const pop = await g.evaluate(() => document.querySelector('#toem-chaos-pop').innerText);
    ok(/you: the maker/.test(pop) && /settings/.test(pop) && /dashboard/.test(pop) && new RegExp('keepers: ' + got.tag.replace('#', '#') + ', the moderators and the trusted').test(pop), 'its popover says "you: the maker", names the keepers, and has the maker\'s doors', pop);

    // ── a stranger ───────────────────────────────────────────────────────
    const s = await S.newPage();
    await s.goto(BASE + '/dashboard/'); await s.waitForTimeout(4000);
    ok(await s.locator('#dc-root #master-desk .cm-card').count() === 0 && (await api(S, '/api/wall?desk=1')).code === 'role', 'a stranger\'s dashboard has no desk, and the door has none for them');
    await s.goto(BASE + '/settings/?space=toem2');
    ok(await says(s, 'THE MAKER\'S TO CHANGE.', 20000), '…and TOEM 2\'s settings are not theirs to change');
    ok(!errs.length, 'no page threw', errs.join(' | '));
  } catch (e) { fails.push('CRASH ' + (e && e.stack || e)); }
  if (b) await b.close().catch(() => {});
  srv.kill();
  fs.rmSync(store, { recursive: true, force: true });
  console.log('\nprobe-handoff: ' + n + ' checks, ' + (fails.length ? fails.length + ' FAILED\n - ' + fails.join('\n - ') : 'all good'));
  if (fails.length) { console.log('\nserver log tail:\n' + log.slice(-1500)); process.exit(1); }
})();
