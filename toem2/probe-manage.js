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
    const asked = []; p.on('dialog', d => { asked.push(d.message()); d.accept(); });
    await p.goto(BASE + '/dashboard/?space=probe-corner');
    ok(await p.waitForSelector('#dc-root #corner-manage .cm-card', { timeout: 20000 }).then(() => true, () => false), 'the space\'s dashboard shows the corner\'s three cards to its maker');
    const cards = p.locator('#dc-root #corner-manage .cm-card');
    ok(await cards.count() === 6 && /Town Board/.test(await cards.nth(0).innerText()) && /^Chat/m.test(await cards.nth(1).innerText()) && /Photo Album/.test(await cards.nth(2).innerText()) && /Leaderboard/.test(await cards.nth(3).innerText())
       && /^Ballot/m.test(await cards.nth(4).innerText()) && /^History/m.test(await cards.nth(5).innerText()), 'Town Board, Chat, Photo Album, Leaderboard, Ballot — and the page\'s History', await cards.count());
    ok(/nothing yet/.test(await cards.nth(5).locator('.cm-story').innerText()) && await cards.nth(5).locator('.cm-line').count() === 0, 'the history of a page nobody has opened or drawn on is empty');
    // THE BALLOT (2026-09-28): how often the council's clock comes round — six hours until its maker says otherwise
    const timer = cards.nth(4);
    ok(await timer.locator('select.cm-sel').inputValue() === '6' && (await timer.locator('select.cm-sel option').allInnerTexts()).join('|') === 'every hour|every 3 hours|every 6 hours|every 12 hours|every day|every 3 days|every week' && /this page is tended/.test(await timer.innerText()),
       'the ballot\'s timer: every six hours, of seven ways — and the card says the page is no council yet');
    await timer.locator('select.cm-sel').selectOption('12');
    await timer.locator('text=Save the timer').click();
    ok(await says(p, 'Saved — the clock starts again from now.') && (await api(ctx, '/api/wall?rules=1&page=probe-corner')).every === 12, 'every twelve hours, saved: the door has it');
    await p.locator('#dc-root #corner-manage .cm-card').nth(4).locator('.cm-revert').click();
    ok(await says(p, 'Back to the default — every 6 hours.') && /^Put the ballot's timer back/.test(asked[asked.length - 1] || '') && (await api(ctx, '/api/wall?rules=1&page=probe-corner')).every === 6
       && await p.locator('#dc-root #corner-manage .cm-card').nth(4).locator('select.cm-sel').inputValue() === '6', '…and back to the default, which asks first: six hours again', asked[asked.length - 1]);

    // ── the board's tabs ─────────────────────────────────────────────────
    const board = cards.nth(0);
    ok(await board.locator('.cm-row').count() === 4 && (await board.locator('.cm-row > .cm-row-l > input.cm-in-title').evaluateAll(es => es.map(e => e.value))).join() === 'News,Updates,Rules,Forum', 'the four tabs a page starts with, in their rows');
    // A NOTICE'S RULES (2026-09-28): the five a space starts with stand in the Rules tab's rows — changed, taken off, added to
    const rulesTab = board.locator('.cm-row').nth(2), ruleTitles = () => rulesTab.locator('.cm-rule input.cm-in-title').evaluateAll(es => es.map(e => e.value).join('|'));
    ok(await ruleTitles() === 'Be kind|Credit the maker|No spoilers in titles|One thread per topic|No selling or ads' && /^Keep the place friendly\./.test(await rulesTab.locator('textarea').inputValue())
       && (await rulesTab.locator('.cm-rule .cm-n').allInnerTexts()).join('') === '12345', 'the Rules tab opens on its words and the five rules a space starts with, a numbered row each', await ruleTitles());
    ok(await board.locator('.cm-row').nth(0).locator('.cm-rules').isHidden() && !(await rulesTab.locator('.cm-rules').isHidden()), '…which a notice has, and a tab of posts has not');
    await rulesTab.locator('.cm-rule').nth(4).locator('.cm-x').click();
    await rulesTab.locator('.cm-rule').nth(0).locator('input.cm-in-title').fill('Be gentle');
    await rulesTab.locator('text=+ add a rule').click();
    await rulesTab.locator('.cm-rule').nth(4).locator('input.cm-in-title').fill('Have fun');
    await rulesTab.locator('.cm-rule').nth(4).locator('input.cm-in-desc').fill('It is a wall, after all.');
    await rulesTab.locator('.cm-rule').nth(4).locator('.cm-mini').first().click();        // …and moved up a place
    ok(await ruleTitles() === 'Be gentle|Credit the maker|No spoilers in titles|Have fun|One thread per topic', 'a rule renamed, one taken off, one added and moved up', await ruleTitles());
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
    ok(bd.tabs[2].rules.map(r => r.title + ':' + r.text).join('|') === 'Be gentle:No insults, name-calling or pile-ons.|Credit the maker:Say whose work it is when you share it.|No spoilers in titles:Keep surprises inside the thread.|Have fun:It is a wall, after all.|One thread per topic:Search before posting a new one.',
       '…and the rules, as they were arranged', j(bd.tabs[2].rules));
    ok(await ruleTitles() === 'Be gentle|Credit the maker|No spoilers in titles|Have fun|One thread per topic', 'the rows stand as they were saved');

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
    // FIVE AT MOST, A HUNDRED CHARACTERS, AND VISITORS' PHOTOS OFF UNTIL TICKED (2026-09-28)
    ok(await album.locator('.cm-row input.cm-in-desc').first().getAttribute('maxlength') === '100' && !(await album.locator('.cm-row .cm-open input').first().isChecked()), 'a section\'s line holds a hundred characters, and visitors\' photos are off until ticked');
    for (let i = 0; i < 4; i++) await album.locator('text=+ add a section').click();
    ok(await album.locator('.cm-row').count() === 5 && await album.locator('text=+ add a section').isDisabled(), 'five sections, and the way to a sixth is shut');
    for (let i = 0; i < 4; i++) await album.locator('.cm-row').last().locator('.cm-x').click();
    ok(await album.locator('.cm-row').count() === 1 && !(await album.locator('text=+ add a section').isDisabled()), '…four taken off again');
    await album.locator('.cm-row .cm-open input').first().check();
    await album.locator('text=Save the sections').click();
    ok(await says(p, 'the album has one section now'), 'a section saves');
    let al = await api(ctx, '/api/gallery?page=probe-corner');
    ok(al.sections.length === 1 && al.sections[0].id === 'sunsets' && al.sections[0].title === 'Sunsets' && al.sections[0].desc === 'The sky going down' && al.sections[0].open === true, 'the door has the section, open to visitors\' photos', j(al.sections));
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
    ok(await cards.count() === 6 && /Leaderboard/.test(await ranksCard.innerText()), 'a fourth card: the Leaderboard');
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
    // ── minimized, and remembered ────────────────────────────────────────
    await board.locator('.cm-fold').click();
    ok(await board.locator('.cm-row').first().isHidden() && await board.locator('text=Save the tabs').isHidden() && (await board.locator('.cm-fold').getAttribute('aria-expanded')) === 'false' && !(await board.locator('h2').isHidden()), 'the Town Board minimizes to its name and its line');
    await album.locator('.cm-fold').click();
    await p.reload(); await p.waitForSelector('#dc-root #corner-manage .cm-card', { timeout: 20000 }); await p.waitForTimeout(500);
    const again = p.locator('#dc-root #corner-manage .cm-card');
    ok((await again.evaluateAll(es => es.map(e => (e.classList.contains('is-shut') ? '-' : '+')))).join('') === '-+-+++', 'on the next visit the board and the album are still minimized; the chat, the leaderboard, the ballot and the history open', await again.evaluateAll(es => es.map(e => e.className)));
    ok(await p.evaluate(() => localStorage.getItem('knoll-corner:probe-corner:shut')) === '{"board":1,"album":1}', '…remembered in this browser, a page at a time');
    await again.nth(0).locator('.cm-fold').click();
    ok(!(await again.nth(0).locator('.cm-row').first().isHidden()) && await p.evaluate(() => localStorage.getItem('knoll-corner:probe-corner:shut')) === '{"album":1}', 'opened again, and that is remembered too');
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
    ok(/Be kind\.\n\nNo spoilers\./.test(await q.evaluate(() => document.querySelector('#town-board .town-intro') && document.querySelector('#town-board .town-intro').textContent))
       && await q.evaluate(() => getComputedStyle(document.querySelector('#town-board .town-intro')).whiteSpace) === 'pre-wrap', 'the Rules tab shows the words the moderator wrote, line breaks kept');
    ok(await q.evaluate(() => [...document.querySelectorAll('#town-board .town-card')].map(c => c.querySelector('.town-n').textContent + ' ' + c.querySelector('.town-card-h').textContent + ': ' + c.querySelector('.town-card-t').textContent).join('|'))
       === '1 Be gentle: No insults, name-calling or pile-ons.|2 Credit the maker: Say whose work it is when you share it.|3 No spoilers in titles: Keep surprises inside the thread.|4 Have fun: It is a wall, after all.|5 One thread per topic: Search before posting a new one.',
       '…and under them the rules as the dashboard arranged them, numbered');
    await q.click('#town-board .town-tab[data-tab="events"]'); await q.waitForTimeout(300);
    ok(await q.locator('#town-board .town-form').count() === 1, 'a stranger may write on Events (anyone)');
    await q.click('#town-board .town-tab[data-tab="news"]'); await q.waitForTimeout(300);
    ok(await q.locator('#town-board .town-form').count() === 0, '…and not on Announcements (the keepers)');
    await q.click('#town-chat-btn'); await q.waitForTimeout(800);
    ok(await q.evaluate(() => document.querySelector('#town-chat .town-say').hidden && !document.querySelector('#town-chat .town-chat-gate:not(.town-say)').hidden && /Only moderators can chat here/.test(document.querySelector('#town-chat').innerText)),
       'the chat is shut to a stranger, and says why');
    ok(/Moderators · one message every 10 s/.test(await q.evaluate(() => document.querySelector('#town-chat .town-title small').textContent)), '…under its title: moderators, one message every 10 s');
    // WHO IS HERE (2026-09-28): how many have the page open, a button under the chat's name
    ok(await q.evaluate(() => { const b = document.querySelector('#town-chat .town-here'); return !!b && !b.hidden && b.tagName === 'BUTTON' && b.textContent === '1 online' && getComputedStyle(b).cursor === 'pointer' && /underline/.test(getComputedStyle(b).textDecorationLine); }),
       '…and before it how many are on the page — one, the stranger — as a button that looks like one', await q.evaluate(() => document.querySelector('#town-chat .town-title small').textContent));
    await q.click('#gallery-btn'); await q.waitForTimeout(800);
    const gtabs = await q.evaluate(() => [...document.querySelectorAll('#gallery-panel .town-tab')].map(b => b.firstChild.textContent));
    ok(gtabs.join() === 'All,Mine,Favourites,Sunsets', 'the album has a Sunsets tab after the three', gtabs.join());
    await q.click('#gallery-panel .town-tab[data-tab="sec:sunsets"]'); await q.waitForTimeout(300);
    ok(await q.locator('#gallery-panel .gal-card').count() === 1, '…with the one photo in it');
    // A SECTION'S LINE, AND YOUR OWN PHOTOS (2026-09-28)
    ok(await q.evaluate(() => (document.querySelector('#gallery-panel .gal-sec') || {}).textContent) === 'The sky going down', 'the section opens on the line its moderators wrote about it');
    ok(await q.locator('#gallery-panel form.gal-add').count() === 1 && await q.locator('#gallery-panel .gal-add-f').isHidden(), '…and, open to visitors\' photos, on the way to hang one');
    await q.click('#gallery-panel .town-tab[data-tab="all"]'); await q.waitForTimeout(200);
    ok(await q.locator('#gallery-panel .gal-add').count() === 0 && await q.locator('#gallery-panel .gal-sec').count() === 0, '(ALL has neither: a photo is hung in a section)');
    await q.click('#gallery-panel .town-tab[data-tab="sec:sunsets"]'); await q.waitForTimeout(200);
    await q.locator('#gal-file').setInputFiles({ name: 'my_own-dusk.png', mimeType: 'image/png', buffer: PNG });
    ok(await q.locator('#gallery-panel .gal-add-f').waitFor({ state: 'visible', timeout: 8000 }).then(() => true, () => false), 'a picture chosen, and the form asks for its title and a line');
    const mine = q.locator('#gallery-panel form.gal-add');
    ok(await mine.locator('input[aria-label=title]').inputValue() === 'my own dusk' && await mine.locator('input[aria-label=title]').getAttribute('maxlength') === '20' && await mine.locator('input[aria-label=description]').getAttribute('maxlength') === '100',
       '…the title from the file\'s name, twenty characters at most; the line a hundred');
    await mine.locator('input[aria-label=title]').fill('Dusk, from the hill');
    await mine.locator('input[aria-label=description]').fill('Taken by a stranger');
    await mine.locator('button[type=submit]').click();
    ok(await q.waitForFunction(() => document.querySelectorAll('#gallery-panel .gal-card').length === 2, null, { timeout: 8000 }).then(() => true, () => false), 'hung: two prints in the section');
    al = await api(ctx, '/api/gallery?page=probe-corner');
    ok(al.photos.length === 2 && al.photos[0].by === other.id && al.photos[0].cap === 'Dusk, from the hill' && al.photos[0].desc === 'Taken by a stranger' && al.photos[0].sec === 'sunsets', 'the door has the stranger\'s photo, in the section', j(al.photos[0]));
    await q.click('#gallery-panel .gal-card >> nth=1'); await q.waitForTimeout(400);
    ok(/Over the harbour/.test(await q.evaluate(() => document.querySelector('#gallery-panel .gal-desc') && document.querySelector('#gallery-panel .gal-desc').textContent)) && /A redder sun/.test(await q.evaluate(() => document.querySelector('#gallery-panel .gal-who b').textContent)) && /Sunsets/.test(await q.evaluate(() => document.querySelector('#gallery-panel .gal-who small').textContent)),
       'full size: the title, the description and the section');
    // a heart, from somebody who did not take the photo
    await q.click('#gallery-panel .gal-like');
    ok(await q.waitForFunction(() => { const b = document.querySelector('#gallery-panel .gal-like'); return b && b.classList.contains('is-on') && /1/.test(b.textContent); }, null, { timeout: 8000 }).then(() => true, () => false)
       && (await api(ctx, '/api/gallery?page=probe-corner')).photos[1].likes === 1, 'the stranger gives the maker\'s photo a heart, and the door counts it');
    await q.keyboard.press('Escape'); await q.waitForTimeout(200);
    await q.click('#gallery-panel .town-tab[data-tab="fav"]'); await q.waitForTimeout(200);
    ok(await q.locator('#gallery-panel .gal-card').count() === 1, '…which keeps it under their FAVOURITES');
    await q.click('#ranks-btn'); await q.waitForTimeout(900);
    const rtabs = await q.evaluate(() => [...document.querySelectorAll('#ranks-panel .town-tab')].map(b => b.textContent.trim()));
    ok(rtabs.join() === 'Most edits,Most active,Most photos', 'the bench\'s leaderboard wears the rankings the keeper chose, in their order', rtabs.join());
    ok(/Hall of Fame/.test(await q.evaluate(() => document.querySelector('#ranks-panel .town-title b').textContent)) && /Who did the most/.test(await q.evaluate(() => document.querySelector('#ranks-panel .town-title small').textContent)), '…under its title and its line');
    ok(await q.evaluate(() => document.querySelectorAll('#ranks-panel .lb-stand:not(.is-empty)').length === 1 && !!document.querySelector('#ranks-panel .lb-stand.is-first .lb-crown') && document.querySelector('#ranks-panel .lb-stand.is-first .lb-name').textContent.startsWith('Probe') && document.querySelector('#ranks-panel .lb-stand.is-first .lb-value').textContent === '1'),
       'Most edits: the maker alone on the podium, first, crowned, with the one');
    ok(/not on this board yet/.test(await q.evaluate(() => document.querySelector('#ranks-panel .lb-foot').textContent)), 'the stranger\'s own line at the foot: not on it yet');   // its words, not its capitals: a space wears Knoll\'s corner, whose small lines are in capitals (corner-knoll.css)
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

    // ── A NAME'S MENU, AND WHO IS HERE (2026-09-28): the stranger again, now the maker is on the page too ──
    await q.click('#town-chat-btn');
    ok(await q.waitForFunction(() => /hello from the keeper/.test(document.querySelector('#town-chat .town-chat-list').textContent), null, { timeout: 15000 }).then(() => true, () => false), '(the maker\'s line reaches the stranger\'s chat)');
    const theirName = q.locator('#town-chat .town-msg .town-name .town-named').first();
    ok(await theirName.getAttribute('role') === 'button' && await theirName.getAttribute('tabindex') === '0', 'a name in the chat can be pressed, and reached by the keyboard');
    await theirName.click({ button: 'right' });
    ok(await q.locator('.town-menu').waitFor({ state: 'visible', timeout: 5000 }).then(() => true, () => false), 'a right click on it stands a menu up');
    const items = () => q.evaluate(() => [...document.querySelectorAll('.town-menu .town-menu-i')].map(i => i.textContent + (i.disabled ? ' (off)' : '') + (i.getAttribute('href') ? ' → ' + i.getAttribute('href') : '')).join('|'));
    ok(await items() === 'Send a friend request|See their page → /YardView/?u=' + me.id && /^Probe/.test(await q.evaluate(() => document.querySelector('.town-menu-h .town-who').textContent)) && await q.locator('.town-menu-h .town-pic').count() === 1
       && await q.evaluate(() => { const r = document.querySelector('.town-menu').getBoundingClientRect(); return r.left >= 0 && r.top >= 0 && r.right <= innerWidth && r.bottom <= innerHeight; }),
       '…with their name, the way to ask to be friends and the way to their page — all of it on the screen', await items());
    await q.locator('.town-menu .town-menu-i', { hasText: 'Send a friend request' }).click();
    ok(await q.waitForFunction(() => /Request sent/.test(document.querySelector('.town-menu').textContent), null, { timeout: 8000 }).then(() => true, () => false)
       && (await api(ctx, '/api/friends')).asks.some(a => a.id === other.id), 'asked from the menu: it says so, and the maker\'s bell has the ask');
    await q.keyboard.press('Escape');
    ok(await q.locator('.town-menu').count() === 0 && await q.evaluate(() => !document.querySelector('#town-chat').hidden), 'Escape puts the menu away, and the chat stays');
    await theirName.press('Enter');
    ok(await q.locator('.town-menu').waitFor({ state: 'visible', timeout: 5000 }).then(() => true, () => false) && /^Request sent \(off\)\|/.test(await items()), 'Enter on the name opens it too — and it remembers the ask', await items());
    await q.mouse.click(5, 5);
    ok(await q.locator('.town-menu').count() === 0, 'a press anywhere else puts it away');
    await q.click('#town-chat .town-here');
    ok(await q.waitForFunction(() => document.querySelectorAll('#town-here .town-person').length === 2, null, { timeout: 10000 }).then(() => true, () => false), 'how many are here is a button: pressed, the chat gives way to the list of them — two now');
    const people = await q.evaluate(() => ({ head: document.querySelector('#town-here .town-sheet-h').textContent, btn: document.querySelector('#town-chat .town-here').textContent, chatGone: getComputedStyle(document.querySelector('#town-chat .town-chat-list')).display === 'none',
      rows: [...document.querySelectorAll('#town-here .town-person')].map(r => ({ href: r.querySelector('a').getAttribute('href'), name: r.querySelector('.town-who').textContent, face: !!r.querySelector('.town-pic'), act: (r.querySelector('button') || r.querySelector('.town-you')).textContent, off: !!(r.querySelector('button') || {}).disabled })) }));
    const them = people.rows.find(r => r.href === '/YardView/?u=' + me.id), self = people.rows.find(r => r.href === '/yard/');
    ok(people.head === '2 people on this page' && people.btn === '2 online' && people.chatGone && !!them && them.face && /^Probe/.test(them.name) && them.act === 'Request sent' && them.off && !!self && self.act === 'you',
       'each a face and a name that lead to their page; the maker already asked, the stranger marked "you"', j(people));
    await q.click('#town-here .town-back');
    ok(await q.evaluate(() => document.querySelector('#town-here').hidden && getComputedStyle(document.querySelector('#town-chat .town-chat-list')).display !== 'none'), 'and back to the chat');
    // the maker, from the list: asking somebody who asked you first is saying yes
    await m.click('#town-chat-btn'); await m.waitForTimeout(500);
    await m.click('#town-chat .town-here');
    await m.waitForFunction(() => document.querySelectorAll('#town-here .town-person').length === 2, null, { timeout: 10000 }).catch(() => {});
    await m.locator('#town-here .town-person', { has: m.locator('a[href="/YardView/?u=' + other.id + '"]') }).locator('button').click();
    ok(await m.waitForFunction(id => { const r = [...document.querySelectorAll('#town-here .town-person')].find(r => r.querySelector('a').getAttribute('href') === '/YardView/?u=' + id); return r && r.querySelector('button').textContent === 'Friends' && r.querySelector('button').disabled; }, other.id, { timeout: 8000 }).then(() => true, () => false)
       && (await api(ctx, '/api/friends')).friends.some(f => f.id === other.id) && (await api(ctx2, '/api/friends')).friends.some(f => f.id === me.id), 'the maker adds the stranger from the list: friends, both ways, and the list says so');
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

    // ── BACK TO THE DEFAULT (2026-09-28): every card has the button, and each asks first ──
    const now = p.locator('#dc-root #corner-manage .cm-card');
    await now.nth(2).locator('.cm-fold').click();                                         // the album was left minimized
    ok((await now.evaluateAll(es => es.map(e => e.querySelectorAll('.cm-revert').length))).join() === '1,1,1,1,1,0', 'each of the five cards that set something has its way back to the default');
    // ── THE PAGE'S HISTORY (2026-09-28): who joined, and the edits that went up ──
    const story = now.nth(5), lines = () => story.locator('.cm-line').evaluateAll(es => es.map(e => e.querySelector('.cm-mark').textContent + ' ' + e.querySelector('.cm-said').textContent).join('|'));
    const gnomeOf = tag => tag;
    ok(await lines() === 'JOINED ' + gnomeOf(other.tag) + ' joined the page|EDIT ' + gnomeOf(me.tag) + '’s edit went live|JOINED ' + gnomeOf(me.tag) + ' joined the page',
       'the history, newest first: the stranger joined; the maker\'s edit went up — and before it, at the same moment, the maker joined', await lines());
    ok(await story.locator('.cm-line time').first().innerText() !== '' && /3 lines/.test(await story.innerText()), '…each with when, and the count of them');
    await story.locator('button', { hasText: 'Who joined' }).click();
    ok((await lines()).split('|').length === 2 && !/EDIT/.test(await lines()) && await story.locator('button[aria-pressed=true]').innerText() === 'Who joined', 'WHO JOINED: the two of them');
    await story.locator('button', { hasText: 'Edits' }).click();
    ok(await lines() === 'EDIT ' + gnomeOf(me.tag) + '’s edit went live', 'EDITS: the one');
    ok((await api(ctx2, '/api/wall?history=1&page=probe-corner')).code === 'role', 'the history is not a stranger\'s to read at the door');
    asked.length = 0;
    await now.nth(0).locator('.cm-revert').click();
    ok(await says(p, 'Back to the default — the four tabs and the five rules.') && /^Put the Town Board back/.test(asked[0] || ''), 'the Town Board asks first, and is put back', asked[0]);
    bd = await api(ctx, '/api/board?page=probe-corner');
    ok(bd.tabs.map(t => t.ch + ':' + t.title + ':' + t.kind + ':' + t.who).join('|') === 'news:News:posts:keepers|updates:Updates:posts:keepers|rules:Rules:notice:keepers|forum:Forum:threads:anyone' && /^Keep the place friendly\./.test(bd.tabs[2].text)
       && bd.tabs[2].rules.map(x => x.title).join('|') === 'Be kind|Credit the maker|No spoilers in titles|One thread per topic|No selling or ads', 'the door has the four tabs a page starts with — the forum back, Events gone — and the five rules', j(bd.tabs));
    ok((await p.locator('#dc-root #corner-manage .cm-card').nth(0).locator('.cm-row > .cm-row-l > input.cm-in-title').evaluateAll(es => es.map(e => e.value))).join() === 'News,Updates,Rules,Forum'
       && await p.locator('#dc-root #corner-manage .cm-card').nth(0).locator('.cm-rule').count() === 5, '…and the card is drawn again from it');
    await now.nth(1).locator('.cm-revert').click();
    ok(await says(p, 'Back to the default — anyone signed in, no wait.') && /^Put the chat back/.test(asked[1] || ''), 'the chat asks first, and is put back', asked[1]);
    bd = await api(ctx, '/api/board?page=probe-corner&ch=chat');
    ok(bd.chat.who === 'anyone' && bd.chat.wait === 0 && bd.chat.named.length === 0 && await p.locator('#dc-root #corner-manage .cm-card').nth(1).locator('input[type=radio][value=anyone]').isChecked()
       && await p.locator('#dc-root #corner-manage .cm-card').nth(1).locator('select.cm-sel').inputValue() === '0', 'the door has anyone and no wait, and so has the card', j(bd.chat));
    await now.nth(2).locator('.cm-revert').click();
    ok(await says(p, 'Back to the default — no sections; the photos stay.') && /^Put the album back/.test(asked[2] || ''), 'the album asks first, and is put back', asked[2]);
    al = await api(ctx, '/api/gallery?page=probe-corner');
    ok(al.sections.length === 0 && al.photos.length === 2 && al.photos.every(x => x.sec === '') && await now.nth(2).locator('.cm-photos select.cm-sel').first().inputValue() === '', 'no sections, the two photos still hanging, in none', j(al.sections));
    await now.nth(3).locator('.cm-revert').click();
    ok(await says(p, 'Back to the default — counted afresh.') && /^Put the leaderboard back/.test(asked[3] || ''), 'the leaderboard asks first, and is put back', asked[3]);
    lb = await api(ctx, '/api/leaderboard?page=probe-corner');
    ok(lb.settings.tabs.join() === 'edits,days,first' && lb.settings.title === 'Hall of Fame' && lb.settings.sub === 'Counted up every ten minutes' && lb.settings.top === 10
       && await p.locator('#dc-root #corner-manage .cm-card').nth(3).locator('input[placeholder="Its title"]').inputValue() === 'Hall of Fame', 'its first three rankings, its own name, ten rows', j(lb.settings));
    // …and said no to, nothing moves
    p.removeAllListeners('dialog'); p.on('dialog', d => d.dismiss());
    await p.locator('#dc-root #corner-manage .cm-card').nth(1).locator('input[type=radio][value=keepers]').check();
    await p.locator('#dc-root #corner-manage .cm-card').nth(1).locator('text=Save the chat\'s rules').click();
    await says(p, 'Saved — the chat keeps to it');
    await p.locator('#dc-root #corner-manage .cm-card').nth(1).locator('.cm-revert').click(); await p.waitForTimeout(600);
    ok((await api(ctx, '/api/board?page=probe-corner&ch=chat')).chat.who === 'keepers', 'a no at the question leaves the settings as they are');
    ok(errs.length === 0, 'no page errors on the dashboard, to the end', errs.join(' | '));
  } catch (e) { fails.push('CRASH ' + (e && e.stack || e)); }
  if (b) await b.close().catch(() => {});
  srv.kill();
  fs.rmSync(store, { recursive: true, force: true });
  console.log('\nprobe-manage: ' + n + ' checks, ' + (fails.length ? fails.length + ' FAILED\n - ' + fails.join('\n - ') : 'all good'));
  if (fails.length) { console.log('\nserver log tail:\n' + log.slice(-1500)); process.exit(1); }
})();
