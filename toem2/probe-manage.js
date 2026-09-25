#!/usr/bin/env node
/* toem2/probe-manage.js — THE CORNER'S SETTINGS, end to end in headless Chrome on a safe server
   (lab2/perf/probe-gate-google.js as the preload: temp store, /_outbox for the sign-up code, the benches'
   doors 404'd). A gnome signs up, makes a space and, on its dashboard, arranges the town board's tabs, the
   chat's rules and the photo album (sections; a photo put up with a title, a description and a section, then
   changed); then the bench shows it all — the board's tabs and the notice, the chat shut to a stranger and
   counting the maker down, the album's section tab and the photo's description; then a moderator on TOEM 2's
   own dashboard finds the same three cards.

     node toem2/probe-manage.js          (needs Chrome + Playwright at Desktop/node_modules) */
'use strict';
const fs = require('fs'), os = require('os'), path = require('path'), { spawn } = require('child_process');
const net = require('net');
const { chromium } = require(process.env.PLAYWRIGHT || 'C:/Users/bobb9/Desktop/node_modules/playwright');
const SITE = path.join(__dirname, '..'), PORT = Number(process.env.PORT || 4332), BASE = 'http://localhost:' + PORT;
const gnome = require(path.join(SITE, 'lab2', 'perf', 'gnome.js'));
const store = fs.mkdtempSync(path.join(os.tmpdir(), 'knoll-manage-'));
const fails = []; let n = 0;
const ok = (c, what, extra) => { n++; if (!c) fails.push(what + (extra ? ' :: ' + String(extra).slice(0, 500) : '')); console.log((c ? '  ok   ' : '  FAIL ') + what); };
const waitPort = (port, tries = 80) => new Promise((res, rej) => { const t = () => { const s = net.connect(port, '127.0.0.1'); s.once('connect', () => { s.end(); res(); }); s.once('error', () => tries-- > 0 ? setTimeout(t, 250) : rej(new Error('port never opened'))); }; t(); });
const j = v => JSON.stringify(v);
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64');   // a real 1×1 png

(async () => {
  const srv = spawn(process.execPath, ['-r', path.join(SITE, 'lab2/perf/probe-gate-google.js'), 'serve.js', String(PORT)], { cwd: SITE, env: Object.assign({}, process.env, { GATE_STORE: store }), stdio: ['ignore', 'pipe', 'pipe'] });
  let log = ''; srv.stdout.on('data', d => log += d); srv.stderr.on('data', d => log += d);
  let b;
  try {
    await waitPort(PORT);
    b = await chromium.launch({ channel: 'chrome', headless: true });
    const ctx = await b.newContext({ viewport: { width: 1400, height: 1100 } });
    const api = (c, url) => c.request.get(BASE + url).then(r => r.json());
    const text = p => p.evaluate(() => document.body.innerText);
    const says = (p, s, ms) => p.waitForFunction(s => document.body.innerText.includes(s), s, { timeout: ms || 8000 }).then(() => true, () => false);

    // ── the maker, the space, its dashboard — and a stranger, for the search and the bench later ──
    await gnome.signIn(ctx, BASE);
    const me = (await api(ctx, '/api/auth')).me;
    const ctx2 = await b.newContext({ viewport: { width: 1400, height: 1000 } });
    await gnome.signIn(ctx2, BASE);
    const other = (await api(ctx2, '/api/auth')).me;
    const made = await ctx.request.post(BASE + '/api/wall', { headers: { origin: BASE }, data: { op: 'page', slug: 'probe-corner', title: 'Probe Corner' } }).then(r => r.json());
    ok(me && made.ok, 'a gnome signed up and made a space', j(made));
    const p = await ctx.newPage();
    const errs = []; p.on('pageerror', e => errs.push(String(e)));
    p.on('dialog', d => d.accept());
    await p.goto(BASE + '/dashboard/?space=probe-corner');
    ok(await p.waitForSelector('#dc-root #corner-manage .cm-card', { timeout: 20000 }).then(() => true, () => false), 'the space\'s dashboard shows the corner\'s three cards to its maker');
    const cards = p.locator('#dc-root #corner-manage .cm-card');
    ok(await cards.count() === 4 && /Town Board/.test(await cards.nth(0).innerText()) && /^Chat/m.test(await cards.nth(1).innerText()) && /Photo Album/.test(await cards.nth(2).innerText()) && /Leaderboard/.test(await cards.nth(3).innerText()), 'Town Board, Chat, Photo Album, Leaderboard', await cards.count());

    // ── the board's tabs ─────────────────────────────────────────────────
    const board = cards.nth(0);
    ok(await board.locator('.cm-row').count() === 4 && (await board.locator('.cm-row input.cm-in-title').evaluateAll(es => es.map(e => e.value))).join() === 'News,Updates,Rules,Forum', 'the four tabs a page starts with, in their rows');
    await board.locator('.cm-row').nth(0).locator('input.cm-in-title').fill('Announcements');
    await board.locator('.cm-row').nth(2).locator('textarea').fill('Be kind.\n\nNo spoilers.');
    await board.locator('.cm-row').nth(3).locator('.cm-x').click();                        // Forum, taken down (the dialog is accepted)
    await board.locator('text=+ add a tab').click();
    const added = board.locator('.cm-row').nth(3);
    await added.locator('input.cm-in-title').fill('Events');
    await added.locator('select.cm-sel').nth(1).selectOption('anyone');
    ok((await added.locator('.cm-chip').innerText()) === '/events', 'a new tab is named after its title', await added.locator('.cm-chip').innerText());
    await board.locator('text=Save the tabs').click();
    ok(await says(p, 'Saved — the board wears it now'), 'the tabs save');
    let bd = await api(ctx, '/api/board?page=probe-corner');
    ok(bd.tabs.map(t => t.ch + ':' + t.title + ':' + t.kind + ':' + t.who).join('|') === 'news:Announcements:posts:keepers|updates:Updates:posts:keepers|rules:Rules:notice:keepers|events:Events:posts:anyone' && bd.tabs[2].text === 'Be kind.\n\nNo spoilers.',
       'the door has them: renamed, the notice written, the forum gone, Events for anyone', j(bd.tabs));

    // ── the chat's rules ─────────────────────────────────────────────────
    const chat = cards.nth(1);
    await chat.locator('input[type=radio][value=keepers]').check();
    await chat.locator('select.cm-sel').selectOption('10');
    await chat.locator('text=Save the chat\'s rules').click();
    ok(await says(p, 'Saved — the chat keeps to it'), 'the chat\'s rules save');
    bd = await api(ctx, '/api/board?page=probe-corner&ch=chat');
    ok(bd.chat.who === 'keepers' && bd.chat.wait === 10, 'the door has them: the keepers only, ten seconds between lines', j(bd.chat));
    await chat.locator('input[type=radio][value=named]').check();
    ok(!(await chat.locator('.cm-named').isHidden()), 'naming people opens the search');
    await chat.locator('input[placeholder="Search a username…"]').fill(other.name.slice(0, 5));
    ok(await chat.locator('.cm-hit').first().waitFor({ timeout: 5000 }).then(() => true, () => false), 'a username search finds a gnome (not the one asking)');
    ok((await chat.locator('.cm-hit').allInnerTexts()).includes(other.tag), '…the stranger, by tag', j(await chat.locator('.cm-hit').allInnerTexts()));
    await chat.locator('.cm-hit', { hasText: other.tag }).first().click();
    ok(await chat.locator('.cm-chip.is-person').count() === 1 && /^Probe /.test(await chat.locator('.cm-chip.is-person').innerText()), '…who becomes a chip');
    await chat.locator('input[type=radio][value=keepers]').check();                          // back to the keepers for the bench check below

    // ── the album: a section, a photo put up, then changed ───────────────
    const album = cards.nth(2);
    await album.locator('text=+ add a section').click();
    await album.locator('.cm-row input.cm-in-title').first().fill('Sunsets');
    await album.locator('.cm-row input.cm-in-desc').first().fill('The sky going down');
    await album.locator('text=Save the sections').click();
    ok(await says(p, 'the album has one section now'), 'a section saves');
    let al = await api(ctx, '/api/gallery?page=probe-corner');
    ok(al.sections.length === 1 && al.sections[0].id === 'sunsets' && al.sections[0].title === 'Sunsets' && al.sections[0].desc === 'The sky going down', 'the door has the section', j(al.sections));
    await album.locator('#cm-file').setInputFiles({ name: 'red sun.png', mimeType: 'image/png', buffer: PNG });
    ok(await album.locator('.cm-pending .cm-photo').waitFor({ timeout: 8000 }).then(() => true, () => false), 'a chosen picture waits with a title from its file name');
    const pend = album.locator('.cm-pending .cm-photo').first();
    ok((await pend.locator('input.cm-in-title').inputValue()) === 'red sun', '…"red sun"', await pend.locator('input.cm-in-title').inputValue());
    await pend.locator('input.cm-in-title').fill('A red sun');
    await pend.locator('input.cm-in-desc').fill('Over the harbour');
    await pend.locator('select.cm-sel').selectOption('sunsets');
    await pend.locator('text=Put it up').click();
    ok(await says(p, '“A red sun” is in the album'), 'the photo is put up');
    al = await api(ctx, '/api/gallery?page=probe-corner');
    ok(al.photos.length === 1 && al.photos[0].cap === 'A red sun' && al.photos[0].desc === 'Over the harbour' && al.photos[0].sec === 'sunsets' && /^\/toem2\/album\/probe-corner\/[a-z0-9]+\.jpg$/.test(al.photos[0].src), 'the door has it: title, description, section, a jpeg', j(al.photos));
    const hung = album.locator('.cm-photos .cm-photo').first();
    ok(await hung.locator('button:has-text("Save")').isDisabled(), 'a hanging photo\'s Save waits for a change');
    await hung.locator('input.cm-in-title').fill('A redder sun');
    ok(!(await hung.locator('button:has-text("Save")').isDisabled()), '…and wakes on one');
    await hung.locator('button:has-text("Save")').click();
    ok(await says(p, '“A redder sun” saved'), 'the change saves');
    al = await api(ctx, '/api/gallery?page=probe-corner');
    ok(al.photos[0].cap === 'A redder sun' && al.photos[0].desc === 'Over the harbour', 'the door has the new title, the description kept', j(al.photos[0]));
    // ── the leaderboard: what it ranks ───────────────────────────────────
    const ranksCard = cards.nth(3);
    ok(await cards.count() === 4 && /Leaderboard/.test(await ranksCard.innerText()), 'a fourth card: the Leaderboard');
    const ticks = () => ranksCard.locator('.cm-row input[type=checkbox]').evaluateAll(es => es.map(e => e.value + (e.checked ? '+' : '-')).join());
    ok(await ticks() === 'edits+,days+,first+,posts-,photos-,hearts-', 'the six rankings, the three it starts with ticked and first', await ticks());
    await ranksCard.locator('.cm-row input[value=first]').uncheck();
    await ranksCard.locator('.cm-row input[value=photos]').check();
    await ranksCard.locator('.cm-row').nth(4).locator('.cm-mini').first().click();      // photos, up past posts…
    await ranksCard.locator('.cm-row').nth(3).locator('.cm-mini').first().click();      // …and past first
    ok(await ticks() === 'edits+,days+,photos+,first-,posts-,hearts-', '…photos ticked and moved up two places', await ticks());
    await ranksCard.locator('input[placeholder="Its title"]').fill('Hall of Fame');
    await ranksCard.locator('input[placeholder="A line under the title (optional)"]').fill('Who did the most');
    await ranksCard.locator('select.cm-sel').selectOption('5');
    await ranksCard.locator('text=Save the leaderboard').click();
    ok(await says(p, 'Saved — the leaderboard shows it now'), 'the leaderboard\'s settings save');
    let lb = await api(ctx, '/api/leaderboard?page=probe-corner');
    ok(lb.settings.tabs.join() === 'edits,days,photos' && lb.settings.title === 'Hall of Fame' && lb.settings.sub === 'Who did the most' && lb.settings.top === 5, 'the door has them', j(lb.settings));
    ok(lb.ranks.edits.length === 0 && lb.ranks.days.length === 0 && lb.ranks.photos.length === 1 && lb.ranks.photos[0].id === me.id && lb.ranks.photos[0].value === 1 && lb.you.photos.rank === 1 && lb.you.edits === null,
       'nobody has edited the wall: those boards are empty; the one photo puts its taker first on the photos', j(lb.ranks));
    // one revision of the wall, put straight into the store's log (the file store reads its file before every command), and the count asked afresh
    const dbf = path.join(store, 'wall-db.json'), d1 = JSON.parse(fs.readFileSync(dbf, 'utf8'));
    d1.l['toem2:p:probe-corner:log'] = [JSON.stringify({ rev: 2, edit: 'e2', by: me.id, name: me.tag, how: 'live', cls: 'live', at: Date.now() })].concat(d1.l['toem2:p:probe-corner:log'] || []);
    fs.writeFileSync(dbf, JSON.stringify(d1));
    lb = await api(ctx, '/api/leaderboard?page=probe-corner&fresh=1');
    ok(lb.ranks.edits.length === 1 && lb.ranks.edits[0].id === me.id && lb.ranks.edits[0].value === 1 && lb.ranks.days[0].value === 1 && lb.you.edits.rank === 1, 'one edit of the wall, and its maker leads the edits and the days', j(lb.ranks.edits));
    ok(errs.length === 0, 'no page errors on the dashboard', errs.join(' | '));

    // ── the bench, as the stranger: the board's tabs, the notice, the chat shut, the album's section ──
    const q = await ctx2.newPage();
    const errs2 = []; q.on('pageerror', e => errs2.push(String(e)));
    await q.goto(BASE + '/toem2/?page=probe-corner');
    await q.waitForSelector('#town-board-btn', { timeout: 20000 });
    await q.waitForFunction(() => window.Town && Town.tabs.length === 4 && Town.tabs[0].title === 'Announcements', null, { timeout: 15000 }).catch(() => {});
    await q.click('#town-board-btn'); await q.waitForTimeout(600);
    const labels = await q.evaluate(() => [...document.querySelectorAll('#town-board .town-tab')].map(b => b.firstChild.textContent));
    ok(labels.join() === 'Announcements,Updates,Rules,Events', 'the bench\'s board wears the tabs', labels.join());
    ok(/Announcements · Updates · Rules · Events/.test(await q.evaluate(() => document.querySelector('#town-board .town-title small').textContent)), '…and names them under its title');
    await q.click('#town-board .town-tab[data-tab="rules"]'); await q.waitForTimeout(300);
    ok(/Be kind\.\n\nNo spoilers\./.test(await q.evaluate(() => document.querySelector('#town-board .town-notice') && document.querySelector('#town-board .town-notice').textContent)), 'the Rules tab shows the notice the keeper wrote, line breaks kept');
    await q.click('#town-board .town-tab[data-tab="events"]'); await q.waitForTimeout(300);
    ok(await q.locator('#town-board .town-form').count() === 1, 'a stranger may write on Events (anyone)');
    await q.click('#town-board .town-tab[data-tab="news"]'); await q.waitForTimeout(300);
    ok(await q.locator('#town-board .town-form').count() === 0, '…and not on Announcements (the keepers)');
    await q.click('#town-chat-btn'); await q.waitForTimeout(800);
    ok(await q.evaluate(() => document.querySelector('#town-chat .town-say').hidden && !document.querySelector('#town-chat .town-chat-gate:not(.town-say)').hidden && /Only the keepers can chat here/.test(document.querySelector('#town-chat').innerText)),
       'the chat is shut to a stranger, and says why');
    ok(/The keepers · one message every 10 s/.test(await q.evaluate(() => document.querySelector('#town-chat .town-title small').textContent)), '…under its title: the keepers, one message every 10 s');
    await q.click('#gallery-btn'); await q.waitForTimeout(800);
    const gtabs = await q.evaluate(() => [...document.querySelectorAll('#gallery-panel .town-tab')].map(b => b.firstChild.textContent));
    ok(gtabs.join() === 'All,Mine,Favourites,Sunsets', 'the album has a Sunsets tab after the three', gtabs.join());
    await q.click('#gallery-panel .town-tab[data-tab="sec:sunsets"]'); await q.waitForTimeout(300);
    ok(await q.locator('#gallery-panel .gal-card').count() === 1, '…with the one photo in it');
    await q.click('#gallery-panel .gal-card'); await q.waitForTimeout(400);
    ok(/Over the harbour/.test(await q.evaluate(() => document.querySelector('#gallery-panel .gal-desc') && document.querySelector('#gallery-panel .gal-desc').textContent)) && /A redder sun/.test(await q.evaluate(() => document.querySelector('#gallery-panel .gal-who b').textContent)) && /Sunsets/.test(await q.evaluate(() => document.querySelector('#gallery-panel .gal-who small').textContent)),
       'full size: the title, the description and the section');
    await q.click('#ranks-btn'); await q.waitForTimeout(900);
    const rtabs = await q.evaluate(() => [...document.querySelectorAll('#ranks-panel .town-tab')].map(b => b.textContent.trim()));
    ok(rtabs.join() === 'Most edits,Most active,Most photos', 'the bench\'s leaderboard wears the rankings the keeper chose, in their order', rtabs.join());
    ok(/Hall of Fame/.test(await q.evaluate(() => document.querySelector('#ranks-panel .town-title b').textContent)) && /Who did the most/.test(await q.evaluate(() => document.querySelector('#ranks-panel .town-title small').textContent)), '…under its title and its line');
    ok(await q.evaluate(() => document.querySelectorAll('#ranks-panel .lb-stand:not(.is-empty)').length === 1 && !!document.querySelector('#ranks-panel .lb-stand.is-first .lb-crown') && document.querySelector('#ranks-panel .lb-stand.is-first .lb-name').textContent.startsWith('Probe') && document.querySelector('#ranks-panel .lb-stand.is-first .lb-value').textContent === '1'),
       'Most edits: the maker alone on the podium, first, crowned, with the one');
    ok(/not on this board yet/.test(await q.evaluate(() => document.querySelector('#ranks-panel .lb-foot').innerText)), 'the stranger\'s own line at the foot: not on it yet');
    await q.click('#ranks-panel .town-tab[data-tab="photos"]'); await q.waitForTimeout(300);
    ok(await q.evaluate(() => document.querySelector('#ranks-panel .lb-stand.is-first .lb-value').textContent === '1' && /photos in the album/i.test(document.querySelector('#ranks-panel .lb-blurb').textContent)), 'Most photos: the one photo, and the blurb');
    ok(errs2.length === 0, 'no page errors on the bench', errs2.join(' | '));

    // ── the bench, as the maker: a line, then the count-down ─────────────
    const m = await ctx.newPage();
    await m.goto(BASE + '/toem2/?page=probe-corner');
    await m.waitForSelector('#town-chat-btn', { timeout: 20000 });
    await m.waitForFunction(() => window.Town && Town.chat && Town.chat.wait === 10, null, { timeout: 15000 }).catch(() => {});
    await m.click('#town-chat-btn'); await m.waitForTimeout(800);
    ok(await m.evaluate(() => !document.querySelector('#town-chat .town-say').hidden), 'a keeper has the box');
    await m.fill('#town-chat .town-say input', 'hello from the keeper'); await m.press('#town-chat .town-say input', 'Enter'); await m.waitForTimeout(800);
    ok(await m.evaluate(() => document.querySelector('#town-chat .town-send').disabled && /next message in \d+ s/.test(document.querySelector('#town-chat .town-say input').placeholder)), 'after a line the box counts the wait down', await m.evaluate(() => document.querySelector('#town-chat .town-say input').placeholder));
    ok((await api(ctx, '/api/board?page=probe-corner&ch=chat')).posts.chat[0].text === 'hello from the keeper', '…and the line went');
    await m.click('#ranks-btn'); await m.waitForTimeout(900);
    ok(/You · 1st/.test(await m.evaluate(() => document.querySelector('#ranks-panel .lb-foot').innerText)) && await m.evaluate(() => document.querySelector('#town-chat').hidden), 'the maker\'s own line at the foot: You · 1st — and the chat put away for it');
    // TOEM 2 itself, untouched: the three tabs a page starts with, and nobody on the board
    await q.goto(BASE + '/toem2/'); await q.waitForSelector('#ranks-btn', { timeout: 20000 }); await q.click('#ranks-btn'); await q.waitForTimeout(900);
    ok(/Nobody on the board yet/.test(await q.evaluate(() => document.querySelector('#ranks-panel .town-body').innerText)) && (await q.evaluate(() => [...document.querySelectorAll('#ranks-panel .town-tab')].map(b => b.textContent.trim()).join())) === 'Most edits,Most active,First here',
       'TOEM 2, untouched: the three tabs it starts with, and nobody on the board — made of nothing', await q.evaluate(() => document.querySelector('#ranks-panel .town-body').innerText.slice(0, 200)));

    // ── TOEM 2's own dashboard, for a moderator ──────────────────────────
    const db = JSON.parse(fs.readFileSync(path.join(store, 'wall-db.json'), 'utf8'));
    db.h['toem2:user:' + me.id].role = 'mod';
    fs.writeFileSync(path.join(store, 'wall-db.json'), JSON.stringify(db));
    await p.goto(BASE + '/dashboard/?space=toem2');
    ok(await p.waitForSelector('#dc-root #corner-manage .cm-card', { timeout: 20000 }).then(() => true, () => false), 'TOEM 2\'s dashboard shows the corner\'s cards to a moderator');
    ok((await p.locator('h1').innerText()).trim() === 'TOEM 2 dashboard' && await p.locator('a[href="/settings/?space=toem2"]').count() === 0, '…titled "TOEM 2 dashboard", with no gear (it has no settings page)', await p.locator('h1').innerText());
    await p.goto(BASE + '/dashboard/?space=probe-corner');
    await p.waitForSelector('#dc-root #corner-manage .cm-card', { timeout: 20000 });
    const r = await ctx2.newPage();
    await r.goto(BASE + '/dashboard/?space=probe-corner'); await r.waitForTimeout(4000);
    ok(await r.locator('#dc-root #corner-manage .cm-card').count() === 0, 'a stranger on the space\'s dashboard sees no such cards');
  } catch (e) { fails.push('CRASH ' + (e && e.stack || e)); }
  if (b) await b.close().catch(() => {});
  srv.kill();
  fs.rmSync(store, { recursive: true, force: true });
  console.log('\nprobe-manage: ' + n + ' checks, ' + (fails.length ? fails.length + ' FAILED\n - ' + fails.join('\n - ') : 'all good'));
  if (fails.length) { console.log('\nserver log tail:\n' + log.slice(-1500)); process.exit(1); }
})();
