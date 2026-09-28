#!/usr/bin/env node
/* toem2/probe-corner-knoll.js — KNOLL'S OWN CORNER, end to end in headless Chrome on a safe server
   (lab2/perf/probe-gate-google.js as the preload: temp store, /_outbox for the sign-up code, the benches'
   doors 404'd). A gnome makes a space and finds its corner in Knoll's hand — the Notice Board, the Town
   Chat, the Photo Wall and the Hall of Fame — EMPTY, every one; then uses all of it: a notice with a label,
   marked major; a thread begun on its own sheet, answered from the strip at the foot; a line of the chat at
   a press and another typed, which a second gnome reads on the left under a name and a face; a photo on the
   wall, on the fan and under a heart; a name on the podium. And TOEM 2 has its own corner still.

     node toem2/probe-corner-knoll.js          (needs Chrome + Playwright at Desktop/node_modules) */
'use strict';
const fs = require('fs'), os = require('os'), path = require('path'), { spawn } = require('child_process');
const net = require('net');
const { chromium } = require(process.env.PLAYWRIGHT || 'C:/Users/bobb9/Desktop/node_modules/playwright');
const SITE = path.join(__dirname, '..'), PORT = Number(process.env.PORT || 4337), BASE = 'http://localhost:' + PORT;
const gnome = require(path.join(SITE, 'lab2', 'perf', 'gnome.js'));
const store = fs.mkdtempSync(path.join(os.tmpdir(), 'knoll-corner-'));
const fails = []; let n = 0;
const ok = (c, what, extra) => { n++; if (!c) fails.push(what + (extra ? ' :: ' + String(extra).slice(0, 500) : '')); console.log((c ? '  ok   ' : '  FAIL ') + what); };
const waitPort = (port, tries = 80) => new Promise((res, rej) => { const t = () => { const s = net.connect(port, '127.0.0.1'); s.once('connect', () => { s.end(); res(); }); s.once('error', () => tries-- > 0 ? setTimeout(t, 250) : rej(new Error('port never opened'))); }; t(); });
const j = v => JSON.stringify(v);
const PAGE = 'probe-knoll', WALL = BASE + '/toem2/?page=' + PAGE + '&live=1', PQ = '?page=' + PAGE;

(async () => {
  const srv = spawn(process.execPath, ['-r', path.join(SITE, 'lab2/perf/probe-gate-google.js'), 'serve.js', String(PORT)], { cwd: SITE, env: Object.assign({}, process.env, { GATE_STORE: store }), stdio: ['ignore', 'pipe', 'pipe'] });
  let log = ''; srv.stdout.on('data', d => log += d); srv.stderr.on('data', d => log += d);
  let b;
  try {
    await waitPort(PORT);
    b = await chromium.launch({ channel: 'chrome', headless: true });
    const api = (c, url) => c.request.get(BASE + url).then(r => r.json());
    const post = (c, url, data) => c.request.post(BASE + url, { headers: { origin: BASE }, data }).then(r => r.json());
    const M = await b.newContext({ viewport: { width: 1440, height: 1000 } }), G = await b.newContext({ viewport: { width: 1440, height: 1000 } });
    await gnome.signIn(M, BASE); await gnome.signIn(G, BASE);
    const me = (await api(M, '/api/auth')).me, other = (await api(G, '/api/auth')).me;
    const made = await post(M, '/api/wall', { op: 'page', slug: PAGE, title: 'Probe Knoll' });
    ok(me && other && made.ok, 'a gnome made a space', j(made));

    const p = await M.newPage(); const errs = []; p.on('pageerror', e => errs.push('maker: ' + e)); p.on('dialog', d => d.accept());
    const css = (sel, prop) => p.evaluate(([s, k]) => { const e = document.querySelector(s); return e ? getComputedStyle(e)[k] : null; }, [sel, prop]);
    const txt = sel => p.evaluate(s => { const e = document.querySelector(s); return e ? e.textContent : null; }, sel);
    const count = sel => p.locator(sel).count();
    const says = (page, sel, s, ms) => page.waitForFunction(([sel, s]) => { const e = document.querySelector(sel); return !!e && e.textContent.includes(s); }, [sel, s], { timeout: ms || 8000 }).then(() => true, () => false);
    await p.goto(WALL);
    await p.waitForSelector('#ranks-btn', { timeout: 30000 }); await p.waitForFunction(() => window.Town && Town.me, null, { timeout: 15000 }).catch(() => {});

    // ── the corner wears Knoll's hand ─────────────────────────────────────
    ok(await p.evaluate(() => document.documentElement.dataset.page) === PAGE, 'the bench is the space\'s');
    ok(await css('#town-board-btn', 'backgroundColor') === 'rgb(232, 72, 74)' && await css('#town-chat-btn', 'backgroundColor') === 'rgb(232, 72, 74)' && await css('#ranks-btn', 'backgroundColor') === 'rgb(232, 72, 74)',
       'three round red buttons', await css('#town-board-btn', 'backgroundColor'));
    ok(await p.getAttribute('#town-board-btn', 'aria-label') === 'the notice board' && await p.getAttribute('#town-chat-btn', 'aria-label') === 'the town chat' && await p.getAttribute('#gallery-btn', 'aria-label') === 'the photo wall' && await p.getAttribute('#ranks-btn', 'aria-label') === 'the hall of fame',
       '…named the notice board, the town chat, the photo wall and the hall of fame');
    ok(await count('#gallery-btn.gal-fan .gal-fan-c') === 3 && await count('#gallery-btn .gal-fan-p img') === 0 && await txt('#gallery-btn .gal-fan-n') === 'Album · 0' && await txt('#gallery-btn .town-badge') === '',
       'the album\'s button is three blank prints fanned over a plate: Album · 0', await txt('#gallery-btn .gal-fan-n'));

    // ── empty, every one ──────────────────────────────────────────────────
    await p.click('#town-board-btn');
    ok(await txt('#town-board .town-title b') === 'Notice Board' && await txt('#town-board .town-title small') === 'News · Updates · Rules · Forum', 'the Notice Board, with the four tabs a page starts with');
    ok(await css('#town-board', 'backgroundColor') === 'rgb(244, 236, 213)' && await css('#town-board .town-head', 'backgroundColor') === 'rgb(138, 106, 66)' && await css('#town-board .town-plate', 'backgroundColor') === 'rgb(253, 247, 227)'
       && /Rye/.test(await css('#town-board .town-title b', 'fontFamily')) && /VT323/.test(await css('#town-board .town-tab', 'fontFamily')),
       'cream paper, a wooden head, the name in Rye on its plate, the tabs in VT323', await css('#town-board', 'backgroundColor'));
    ok(await css('#town-board .town-tab.is-on', 'backgroundColor') === 'rgb(255, 210, 63)', 'the open tab is yellow');
    ok(await txt('#town-board .town-empty') === 'Nothing here yet.' && await count('#town-board .town-card') === 0, 'News: nothing here yet');
    await p.click('#town-board .town-tab[data-tab="updates"]');
    ok(await txt('#town-board .town-empty') === 'Nothing here yet.' && await count('#town-board .town-card') === 0, 'Updates: nothing here yet');
    await p.click('#town-board .town-tab[data-tab="rules"]');
    ok(await count('#town-board .town-card') === 5 && (await p.locator('#town-board .town-card-h').allInnerTexts()).join('|') === 'Be kind|Credit the maker|No spoilers in titles|One thread per topic|No selling or ads'
       && /Keep the place friendly/.test(await txt('#town-board .town-intro')), 'Rules: the five a space starts with, until its keepers write their own', j(await p.locator('#town-board .town-card-h').allInnerTexts()));
    await p.click('#town-board .town-tab[data-tab="forum"]');
    ok(await txt('#town-board .town-empty') === 'No threads yet.' && await count('#town-board .town-start') === 1, 'Forum: no threads yet, and the way to start one');
    await p.click('#town-chat-btn');
    ok(await txt('#town-chat .town-title b') === 'Town Chat' && await txt('#town-chat .town-empty') === 'Nobody has said anything yet.' && await count('#town-chat .town-msg') === 0, 'the Town Chat: nobody has said anything yet');
    ok((await p.locator('#town-chat .town-quick button').allInnerTexts()).join('|') === 'Hello!|On my way|Brilliant' && await p.evaluate(() => !document.querySelector('#town-chat .town-quick').hidden), '…with three things to say at a press');
    await p.click('#gallery-btn');
    ok(await txt('#gallery-panel .town-title b') === 'Photo Wall' && await txt('#gallery-panel .town-title small') === '0 photos from around town' && await txt('#gallery-panel .gal-empty b') === 'No photos yet' && await count('#gallery-panel .gal-card') === 0,
       'the Photo Wall: no photos yet');
    await p.click('#ranks-btn'); await p.waitForFunction(() => window.Ranks && Ranks.data, null, { timeout: 8000 }).catch(() => {});
    ok(await txt('#ranks-panel .town-title b') === 'Hall of Fame' && /Nobody on the board yet/.test(await txt('#ranks-panel .town-body')) && await count('#ranks-panel .lb-stand') === 0, 'the Hall of Fame: nobody on the board yet');
    ok(await css('#ranks-panel .lb-foot', 'backgroundColor') === 'rgb(107, 74, 46)' && /not on this board yet/.test(await txt('#ranks-panel .lb-foot')), '…and your own line, on dark wood: not on it yet');
    const books = await Promise.all([api(M, '/api/board' + PQ + '&ch=board,chat'), api(M, '/api/gallery' + PQ), api(M, '/api/leaderboard' + PQ)]);
    ok(Object.values(books[0].posts).every(l => l.length === 0) && books[1].photos.length === 0 && books[1].sections.length === 0 && Object.values(books[2].ranks).every(l => l.length === 0),
       'the doors agree: no post, no line, no photo, no section, nobody ranked — nothing was seeded');

    // ── a notice, labelled and major ──────────────────────────────────────
    await p.click('#town-board-btn'); await p.click('#town-board .town-tab[data-tab="news"]');
    await p.fill('#town-board .town-form input[aria-label="title"]', 'Autumn meetup');
    await p.fill('#town-board .town-form input[aria-label="label"]', 'Fix <i>');
    await p.check('#town-board .town-form .town-check input');
    await p.fill('#town-board .town-form textarea', 'Saturday at the square.');
    await p.click('#town-board .town-form .town-btn');
    ok(await p.waitForSelector('#town-board .town-card.is-major', { timeout: 8000 }).then(() => true, () => false), 'a keeper pins a notice, marked major');
    ok(await txt('#town-board .town-card .town-pill') === 'Fix <i>' && await count('#town-board .town-card .town-pill i') === 0 && await txt('#town-board .town-card .town-card-h') === 'Autumn meetup' && /^[A-Z][a-z]{2} \d\d$/.test(await txt('#town-board .town-card .town-date'))
       && await css('#town-board .town-card.is-major', 'backgroundColor') === 'rgb(255, 210, 63)', '…its label over its title, as text; its day; and the card in yellow', await txt('#town-board .town-card .town-pill'));
    let bd = await api(M, '/api/board' + PQ);
    ok(bd.posts.news.length === 1 && bd.posts.news[0].label === 'Fix <i>' && bd.posts.news[0].major === true, 'the door has it', j(bd.posts.news));
    await p.click('#town-board .town-tab[data-tab="updates"]');
    await p.fill('#town-board .town-form input[aria-label="title"]', 'Plain one'); await p.fill('#town-board .town-form textarea', 'No label.');
    await p.click('#town-board .town-form .town-btn');
    ok(await says(p, '#town-board .town-body', 'Plain one') && await txt('#town-board .town-card .town-pill') === 'Updates' && await count('#town-board .town-card.is-major') === 0, 'a notice with no label wears its tab\'s name, and is not major');

    // ── a thread on its own sheet, an answer from the strip ───────────────
    await p.click('#town-board .town-tab[data-tab="forum"]'); await p.click('#town-board .town-start');
    ok(await txt('#town-board .town-sheet-h') === 'New thread' && await count('#town-board .town-form .town-btn.is-plain') === 1, 'Start a thread opens a sheet of its own, with a way back');
    await p.click('#town-board .town-form .town-btn.is-plain');
    ok(await count('#town-board .town-start') === 1 && await count('#town-board .town-sheet-h') === 0, 'Cancel goes back to the threads');
    await p.click('#town-board .town-start');
    await p.fill('#town-board .town-form input[aria-label="title"]', 'Best walk near the village?'); await p.fill('#town-board .town-form textarea', 'Under an hour, with a view.');
    await p.click('#town-board .town-form button[type=submit]');
    ok(await says(p, '#town-board .town-body', 'Under an hour, with a view.') && await count('#town-board .town-back') === 1 && await count('#town-board .town-form.is-reply') === 1, 'Post thread opens the thread, with the strip to answer on');
    await p.fill('#town-board .town-form.is-reply textarea', 'North road to the old bridge.'); await p.click('#town-board .town-form.is-reply .town-send');
    ok(await p.waitForSelector('#town-board .town-card.is-reply', { timeout: 8000 }).then(() => true, () => false) && await count('#town-board .town-card.is-reply .town-pic') === 1 && /North road/.test(await txt('#town-board .town-card.is-reply')), 'an answer hangs under it, beside its writer\'s face');
    await p.click('#town-board .town-back');
    ok(await count('#town-board .town-card.is-thread') === 1 && await txt('#town-board .town-card.is-thread .town-said span') === '1' && await count('#town-board .town-card.is-thread .town-pic') === 1, 'the list has the thread: whose, its title, one answer');

    // ── the chat: a press, a line, and how the other gnome reads them ─────
    await p.click('#town-chat-btn');
    await p.click('#town-chat .town-quick button >> nth=0');
    ok(await p.waitForSelector('#town-chat .town-msg.is-me', { timeout: 8000 }).then(() => true, () => false) && await txt('#town-chat .town-msg.is-me .town-bubble') === 'Hello!', '"Hello!" at a press is a line of the chat');
    await p.fill('#town-chat .town-say input', 'Bench by the pond?'); await p.press('#town-chat .town-say input', 'Enter');
    ok(await says(p, '#town-chat .town-chat-list', 'Bench by the pond?') && await count('#town-chat .town-msg.is-me') === 2 && await txt('#town-chat .town-day') === 'Today', 'a typed line follows it, under TODAY');
    ok(await css('#town-chat .town-msg.is-me .town-bubble', 'backgroundColor') === 'rgb(90, 143, 214)' && await css('#town-chat .town-msg.is-me .town-pic', 'display') === 'none', 'yours are blue, on the right, with no face');
    const q = await G.newPage(); q.on('pageerror', e => errs.push('other: ' + e));
    await q.goto(WALL); await q.waitForSelector('#town-chat-btn', { timeout: 30000 }); await q.waitForFunction(() => window.Town && Town.me, null, { timeout: 15000 }).catch(() => {});
    ok(await q.evaluate(() => document.querySelector('#town-chat-btn .town-badge').textContent) === '2' && await q.evaluate(() => getComputedStyle(document.querySelector('#town-chat-btn .town-badge')).backgroundColor) === 'rgb(255, 210, 63)', 'the other gnome\'s button counts two, in yellow');
    await q.click('#town-chat-btn'); await q.waitForSelector('#town-chat .town-msg', { timeout: 8000 });
    ok(await q.evaluate(() => { const m = document.querySelector('#town-chat .town-msg'); const c = getComputedStyle(m.querySelector('.town-bubble')); return !m.classList.contains('is-me') && getComputedStyle(m.querySelector('.town-pic')).display !== 'none' && m.querySelector('.town-name').textContent.startsWith('Probe') && c.backgroundColor === 'rgb(253, 247, 227)'; }),
       '…and reads them on the left, in cream, under a name and beside a face');
    await q.fill('#town-chat .town-say input', 'On my way.'); await q.press('#town-chat .town-say input', 'Enter');
    ok(await says(p, '#town-chat .town-chat-list', 'On my way.', 12000), 'what they answer reaches the first without a reload');

    // ── the photo wall, its fan, a heart ──────────────────────────────────
    const src = await p.evaluate(() => { const c = document.createElement('canvas'); c.width = c.height = 200; const g = c.getContext('2d'); g.fillStyle = '#9fc5e8'; g.fillRect(0, 0, 200, 200); g.fillStyle = '#35693c'; g.fillRect(0, 140, 200, 60); return c.toDataURL('image/jpeg', 0.8); });
    const hung = await post(M, '/api/gallery' + PQ, { op: 'post', cap: 'Morning fog', desc: 'By the pond.', src });
    ok(hung.ok, 'a photo is put up (the dashboard\'s door)', j(hung).slice(0, 200));
    await q.click('#gallery-btn');
    ok(await q.waitForSelector('#gallery-panel .gal-card', { timeout: 8000 }).then(() => true, () => false) && await q.evaluate(() => document.querySelector('#gallery-btn .gal-fan-n').textContent) === 'Album · 1' && await q.locator('#gallery-btn .gal-fan-p img').count() === 1,
       'it hangs on the wall, and on the first print of the fan: Album · 1');
    await q.click('#gallery-panel .gal-card');
    ok(await q.evaluate(() => document.querySelector('#gallery-panel .gal-who b').textContent) === 'Morning fog' && await q.evaluate(() => document.querySelector('#gallery-panel .gal-foot .town-btn').textContent) === 'Back to the wall', 'opened full size: its name, and the way back to the wall');
    await q.click('#gallery-panel .gal-like');
    ok(await q.waitForSelector('#gallery-panel .gal-like.is-on', { timeout: 8000 }).then(() => true, () => false) && await q.evaluate(() => getComputedStyle(document.querySelector('#gallery-panel .gal-like.is-on')).backgroundColor) === 'rgb(232, 72, 74)', 'a heart, in red');
    await q.click('#gallery-panel .gal-foot .town-btn'); await q.click('#gallery-panel .town-tab[data-tab="fav"]');
    ok(await q.locator('#gallery-panel .gal-card').count() === 1 && (await api(G, '/api/gallery' + PQ)).photos[0].likes === 1, '…and it is kept under FAVOURITES');

    // ── the hall of fame ──────────────────────────────────────────────────
    const set = await post(M, '/api/leaderboard' + PQ, { op: 'settings', tabs: ['posts', 'photos', 'hearts'], title: 'Hall of Fame', sub: '', top: 10 });
    ok(set.ok, 'the keeper has it rank posts, photos and hearts');
    await p.click('#ranks-btn'); await p.waitForFunction(() => window.Ranks && Ranks.data && Ranks.data.settings.tabs[0] === 'posts', null, { timeout: 12000 }).catch(() => {});
    ok(await count('#ranks-panel .lb-stand:not(.is-empty)') === 2 && /^Probe/.test(await txt('#ranks-panel .lb-stand.is-first .lb-name')) && await count('#ranks-panel .lb-stand.is-first .lb-crown') === 1
       && await css('#ranks-panel .lb-stand.is-first .lb-block', 'backgroundColor') === 'rgb(255, 210, 63)' && /You · 1st/.test(await txt('#ranks-panel .lb-foot')), 'two gnomes on the podium, the first under a crown on gold, and "You · 1st" at the foot', await txt('#ranks-panel .lb-foot'));

    // ── a phone ───────────────────────────────────────────────────────────
    await p.setViewportSize({ width: 390, height: 800 }); await p.waitForTimeout(500);
    ok(await p.evaluate(() => { const r = s => document.querySelector(s).getBoundingClientRect(); const f = r('#gallery-btn'), c = r('#town-chat-btn'), k = r('#ranks-btn'); return f.right <= 390 && c.width === 50 && f.width < 80 && k.right <= 390 && f.right < k.left; }), 'on a phone the buttons stand in one row under the header, the fan among them, small');
    await p.setViewportSize({ width: 1440, height: 1000 });

    // ── TOEM 2 keeps its own ──────────────────────────────────────────────
    await p.goto(BASE + '/toem2/?live=1'); await p.waitForSelector('#ranks-btn', { timeout: 30000 });
    ok(await p.evaluate(() => document.documentElement.dataset.page) === undefined && await css('#town-board-btn', 'backgroundColor') === 'rgb(255, 255, 255)' && await count('.gal-fan') === 0 && await count('.town-quick') === 0 && await count('#gallery-btn.town-fab') === 1,
       'TOEM 2: white square buttons, no fan, no quick lines');
    await p.click('#town-board-btn');
    ok(await txt('#town-board .town-title b') === 'Town Board' && await css('#town-board', 'backgroundColor') === 'rgb(255, 255, 255)' && await css('#town-board .town-plate', 'display') === 'contents', '…the Town Board, on white, its head as it was');
    await p.click('#town-board .town-tab[data-tab="rules"]');
    ok((await p.locator('#town-board .town-card-h').allInnerTexts()).join('|') === 'Be kind|Share your own photos|No spoilers in titles|One thread per topic|No selling or ads', '…with TOEM 2\'s own five rules');
    await p.click('#town-chat-btn'); ok(await txt('#town-chat .town-title b') === 'Chat', '…the Chat');
    await p.click('#gallery-btn'); ok(await txt('#gallery-panel .town-title b') === 'Photo Album', '…the Photo Album');
    await p.click('#ranks-btn'); await p.waitForFunction(() => window.Ranks && Ranks.data, null, { timeout: 8000 }).catch(() => {});
    ok(await txt('#ranks-panel .town-title b') === 'Leaderboard', '…and the Leaderboard');
    ok(!errs.length, 'no page threw', errs.join(' | '));
  } catch (e) { fails.push('CRASH ' + (e && e.stack || e)); }
  if (b) await b.close().catch(() => {});
  srv.kill();
  fs.rmSync(store, { recursive: true, force: true });
  console.log('\nprobe-corner-knoll: ' + n + ' checks, ' + (fails.length ? fails.length + ' FAILED\n - ' + fails.join('\n - ') : 'all good'));
  if (fails.length) { console.log('\nserver log tail:\n' + log.slice(-1200)); process.exit(1); }
})();
