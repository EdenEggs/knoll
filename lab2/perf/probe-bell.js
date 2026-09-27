#!/usr/bin/env node
/* probe-bell.js — THE BELL, OPENED, and the screen it leads to (2026-09-27), in headless
   Chrome on the safe server (probe-gate-google.js as the preload: temp store, /_outbox for
   the sign-up code, the benches' doors 404'd). Three gnomes: Holly, whose yard it is, and
   Ash and Birch, who visit it.

     1  /YardView: "Propose edits" sends — nothing to send, signed out, the line of why,
        sent, and not twice
     2  /yard: the bell's number, the sheet it lays over the page (bell.js) in place of the
        card it let down — the headings, a friend's ask answered on it, the fence's notes
        and likes counted and drawn as TEXT, Escape, and the number gone once it is read
     3  /dashboard/edits/: what waits and what it would change, the two pictures (the yard
        as it stands, and with the chosen edits taken), unsaved work in this browser
        holding the taking back, one taken, one left with a reason, two taken together,
        the history, and a past save brought back
     4  the proposers' own bells hear how it went

     node lab2/perf/probe-bell.js          (needs Chrome + Playwright) */
'use strict';
const { spawn } = require('child_process');
const net = require('net');
const path = require('path');
const { chromium } = require(process.env.PLAYWRIGHT || 'C:/Users/bobb9/Desktop/node_modules/playwright');
const SITE = path.join(__dirname, '..', '..'), PORT = Number(process.env.PORT || 4336), BASE = 'http://localhost:' + PORT;
const gnome = require('./gnome.js');
const fails = []; let n = 0;
const ok = (c, what, extra) => { n++; if (!c) fails.push(what + (extra ? ' :: ' + String(extra).slice(0, 500) : '')); console.log((c ? '  ok   ' : '  FAIL ') + what); };
const waitPort = (port, tries = 80) => new Promise((res, rej) => { const t = () => { const s = net.connect(port, '127.0.0.1'); s.once('connect', () => { s.end(); res(); }); s.once('error', () => tries-- > 0 ? setTimeout(t, 250) : rej(new Error('port never opened'))); }; t(); });
const j = v => JSON.stringify(v);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const stroke = i => ({ k: 's', d: 'M' + (40 + i * 60) + ' 40 L' + (400 + i * 60) + ' 300', c: 1, sw: 4 });

(async () => {
  const srv = spawn(process.execPath, ['-r', path.join(SITE, 'lab2/perf/probe-gate-google.js'), 'serve.js', String(PORT)], { cwd: SITE, stdio: ['ignore', 'pipe', 'pipe'] });
  let log = ''; srv.stdout.on('data', d => log += d); srv.stderr.on('data', d => log += d);
  let b;
  try {
    await waitPort(PORT);
    b = await chromium.launch({ channel: 'chrome', headless: true });
    const errs = [];
    // a gnome: a browser of their own, signed up, named, the tour already shown
    const gnomeOf = async name => {
      const ctx = await b.newContext({ viewport: { width: 1500, height: 1000 } });
      await gnome.signIn(ctx, BASE);
      const api = (door, data) => ctx.request.post(BASE + door, { headers: { origin: BASE }, data }).then(r => r.json());
      await api('/api/auth', { op: 'name', name }); await api('/api/auth', { op: 'toured' });
      const me = (await ctx.request.get(BASE + '/api/auth').then(r => r.json())).me;
      const p = await ctx.newPage();
      p.on('pageerror', e => errs.push(name + ': ' + String(e)));
      return { ctx, p, api, id: me.id, tag: me.tag, hill: 'u-' + me.id, get: q => ctx.request.get(BASE + q).then(r => r.json()) };
    };
    const holly = await gnomeOf('Holly'), ash = await gnomeOf('Ash'), birch = await gnomeOf('Birch');
    const yard0 = { wall: { items: [stroke(0), stroke(1)] }, flatfile: { list: [] }, plot: {}, name: 'Holly', plotName: 'Holly\'s' };
    const s0 = await holly.api('/api/hill', { hill: holly.hill, doc: yard0 });
    ok(s0.ok && s0.t > 0, '(Holly saves her yard: two strokes)', j(s0));
    await holly.api('/api/friends', { op: 'seen' });   // …and has opened her bell before: what is older than that is not new
    await sleep(30);

    // ── 1 · /YardView: Propose edits sends ────────────────────────────────
    const pill = g => g.p.locator('#dc-root button.lab-save');
    const pillSays = (g, re, ms) => g.p.waitForFunction(src => new RegExp(src).test((document.querySelector('#dc-root button.lab-save') || {}).textContent || ''), re.source, { timeout: ms || 10000 }).then(() => true, () => false);
    const visit = async g => { await g.p.goto(BASE + '/YardView/?u=' + holly.id); await g.p.waitForFunction(() => window.Wall && window.YardTools && Wall.store.get().items.length >= 2, null, { timeout: 25000 }); await g.p.waitForTimeout(600); };
    const draw = (g, i) => g.p.evaluate(it => Wall.store.update(st => { st.items.push(it); }), stroke(i));
    await visit(ash);
    ok((await pill(ash).textContent()).trim() === 'Propose edits' && /they decide/.test(await pill(ash).getAttribute('title')), 'the visitor\'s pill says Propose edits, and no longer that it is not wired up');
    await pill(ash).click();
    ok(await pillSays(ash, /no edits yet/), 'with nothing changed there is nothing to send');
    await draw(ash, 2);
    ok(await ash.p.evaluate(() => YardTools.dirty()), '(Ash draws a stroke on Holly\'s yard)');
    let asked = '';
    ash.p.once('dialog', d => { asked = d.message(); d.dismiss(); });
    await pill(ash).click(); await ash.p.waitForTimeout(500);
    ok(/A line for Holly/.test(asked) && (await holly.get('/api/hill?proposals=1&hill=' + holly.hill)).proposals.length === 0, 'it asks for a line of why, by the owner\'s name — and cancelled, sends nothing', asked);
    ash.p.once('dialog', d => d.accept('a third path, <b>by the pond</b>'));
    await pill(ash).click();
    ok(await pillSays(ash, /sent ✓ — it is in their bell/), 'sent: the pill says so');
    let inbox = (await holly.get('/api/hill?proposals=1&hill=' + holly.hill)).proposals;
    ok(inbox.length === 1 && inbox[0].name === ash.tag && inbox[0].why === 'a third path, <b>by the pond</b>' && j(inbox[0].to.changes) === j({ add: 1, del: 0, moved: 0, filed: 0 }) && inbox[0].base === s0.t,
      'the door has it: whose, why, against which save, and that it puts one piece up', j(inbox));
    const a1 = inbox[0].id;
    await ash.p.waitForTimeout(5200);
    await pill(ash).click();
    ok(await pillSays(ash, /already sent ✓/) && (await holly.get('/api/hill?proposals=1&hill=' + holly.hill)).proposals.length === 1, 'the same edits are not sent twice');
    const out = await b.newContext({ viewport: { width: 1500, height: 1000 } }), op = await out.newPage();
    await op.goto(BASE + '/YardView/?u=' + holly.id); await op.waitForFunction(() => window.Wall && window.YardTools && Wall.store.get().items.length >= 2, null, { timeout: 25000 });
    await op.evaluate(it => Wall.store.update(st => { st.items.push(it); }), stroke(5));
    await op.locator('#dc-root button.lab-save').click();
    ok(await op.waitForURL(/\/login\/\?next=%2Fyard%2F/, { timeout: 10000 }).then(() => true, () => false), 'signed out, Propose edits goes to the gate — and back to this yard\'s address after', op.url());
    await out.close();
    await ash.api('/api/friends', { op: 'ask', tag: holly.tag });

    // ── 2 · /yard: the bell, opened ───────────────────────────────────────
    const hp = holly.p, bellBtn = hp.locator('#dc-root button[title="notifications"]');
    await hp.goto(BASE + '/yard/');
    await hp.waitForFunction(() => window.yard && window.yard.state.fr && window.KnollBell, null, { timeout: 25000 });
    await hp.waitForTimeout(600);
    ok((await bellBtn.getAttribute('aria-label')) === 'notifications, 2 new' && (await bellBtn.getAttribute('aria-haspopup')) === 'dialog', 'the bell counts what is new: Ash\'s proposal and Ash\'s ask', await bellBtn.getAttribute('aria-label'));
    // the fence is the Apps Script's, and nothing is asked of it from localhost: handed to the page as the script would say it
    await hp.evaluate(t => window.yard.setState({ fence: { likes: 3, notes: [{ t, name: 'Wren', text: 'lovely <img src=x onerror=alert(1)> yard' }, { t: 5, name: 'Old', text: 'from long ago' }] } }), Date.now());
    await hp.waitForTimeout(300);
    ok((await bellBtn.getAttribute('aria-label')) === 'notifications, 6 new', '…and the fence\'s new note and three new likes with them', await bellBtn.getAttribute('aria-label'));
    await bellBtn.click();
    const sheet = hp.locator('.kb-sheet[role="dialog"]');
    ok(await sheet.waitFor({ timeout: 8000 }).then(() => true, () => false) && (await sheet.getAttribute('aria-modal')) === 'true', 'a press lays a sheet over the page: a dialog');
    ok(await hp.locator('#dc-root [role="region"][aria-label="notifications"]').count() === 0 && !(await hp.evaluate(() => document.querySelector('#dc-root').innerText.includes('NOTHING YET — FRIENDS'))), 'the card the bell used to let down is gone');
    const box = await sheet.boundingBox();
    ok(box.width >= 600 && await hp.evaluate(() => getComputedStyle(document.querySelector('.kb-veil')).position === 'fixed' && document.documentElement.classList.contains('kb-open')), 'it is over the whole page, which holds still under it', j(box));
    ok(await hp.evaluate(() => document.activeElement && document.activeElement.classList.contains('kb-x')), 'the focus is on its close button');
    const items = () => hp.evaluate(() => [...document.querySelectorAll('.kb-item')].map(li => ({ kind: li.dataset.kind, cat: li.dataset.cat, isNew: li.classList.contains('kb-new'), text: li.querySelector('.kb-text').textContent,
      quote: (li.querySelector('.kb-quote') || {}).textContent || '', go: (li.querySelector('.kb-go') || { getAttribute() { return ''; } }).getAttribute('href'), tags: [...li.querySelectorAll('.kb-tag')].map(t => t.textContent).join() })));
    let li = await items();
    ok(j(li.map(i => i.kind)) === j(['ask', 'likes', 'note', 'proposal', 'note']), 'what waits on her first, then what is new, then the rest: the ask, the likes, Wren\'s note, the proposal — and the old note last', j(li.map(i => i.kind)));
    ok(li[0].text === ash.tag + ' wants to be friends' && li[0].tags === 'WAITS ON YOU' && li[0].go === '/YardView/?u=' + ash.id, 'the ask: who, that it waits on her, and the way to their yard', j(li[0]));
    ok(li[1].text === '3 new likes on your yard' && li[2].text === 'Wren left a note at your fence' && li[2].isNew && !li[4].isNew, 'the fence: three new likes, Wren\'s note new, the old one not', j([li[1], li[2], li[4]]));
    ok(li[2].quote === 'lovely <img src=x onerror=alert(1)> yard' && await hp.evaluate(() => !document.querySelector('.kb-sheet img') && !window.__pwned), 'what a visitor wrote is drawn as the text it is, never as markup');
    ok(li[3].text === ash.tag + ' proposes changes to your page' && li[3].go === '/dashboard/edits/#' + a1 && li[3].cat === 'page', 'the proposal leads to the screen that reviews it, at that edit', j(li[3]));
    const tabs = () => hp.evaluate(() => [...document.querySelectorAll('.kb-tab')].map(t => t.textContent + (t.getAttribute('aria-pressed') === 'true' ? '*' : '')));
    ok(j(await tabs()) === j(['All54*', 'Friends11', 'Your page43', 'Your spaces0', 'Your edits0']), 'five headings, each with how many and how many new', j(await tabs()));
    await hp.locator('.kb-tab[data-cat="page"]').click();
    ok((await items()).length === 4 && (await items()).every(i => i.cat === 'page'), 'a heading shows its own');
    await hp.locator('.kb-tab[data-cat="spaces"]').click();
    ok(/NOTHING UNDER THIS HEADING/i.test(await sheet.innerText()), '…and an empty one says so');
    await hp.locator('.kb-tab[data-cat="all"]').click();
    await hp.waitForFunction(() => window.yard.state.fr && window.yard.state.fr.unseen === 0 && window.yard.state.fr.hearts === 3, null, { timeout: 8000 }).catch(() => {});
    const seen = await holly.get('/api/friends');
    ok(seen.unseen === 0 && seen.hearts === 3 && seen.noted > 0, 'opening it told the door what was seen — the fence\'s likes with it', j([seen.unseen, seen.hearts]));
    ok((await items()).filter(i => i.isNew).length === 4, '…and what was new when it went up is still marked while it is up');
    await hp.locator('.kb-item[data-kind="ask"] .kb-yes').click();
    await hp.waitForFunction(() => !document.querySelector('.kb-item[data-kind="ask"]'), null, { timeout: 8000 }).catch(() => {});
    li = await items();
    ok(!li.some(i => i.kind === 'ask') && (await holly.get('/api/friends')).friends.some(f => f.id === ash.id), 'yes, on the sheet: they are friends, and the ask is gone from it', j(li.map(i => i.kind)));
    ok(await hp.evaluate(tag => document.querySelector('#dc-root').innerText.includes(tag.toUpperCase() + ' · THEIR YARD'), ash.tag), '…and the page\'s own friends card has heard');
    await hp.keyboard.press('Escape'); await hp.waitForTimeout(300);
    ok(await sheet.count() === 0 && await hp.evaluate(() => !document.documentElement.classList.contains('kb-open') && document.activeElement.getAttribute('title') === 'notifications'), 'Escape puts it away, and the focus is back on the bell');
    ok((await bellBtn.getAttribute('aria-label')) === 'notifications', 'read, the bell has no number', await bellBtn.getAttribute('aria-label'));
    await bellBtn.click(); await sheet.waitFor({ timeout: 8000 });
    ok((await items()).every(i => !i.isNew) && /NOTHING NEW/.test(await hp.locator('.kb-sub').textContent()), 'opened again, nothing in it is new');
    await hp.mouse.click(20, 500); await hp.waitForTimeout(300);
    ok(await sheet.count() === 0, 'a press on the page beside the sheet puts it away too');

    // ── 3 · /dashboard/edits/: the screen that reviews them ───────────────
    await birch.api('/api/friends', { op: 'seen' });
    await visit(birch);
    await draw(birch, 3);
    birch.p.once('dialog', d => d.accept(''));
    await pill(birch).click();
    ok(await pillSays(birch, /sent ✓/), '(Birch proposes a stroke of their own, with no line of why)');
    await hp.goto(BASE + '/dashboard/edits/#' + a1);
    await hp.waitForFunction(() => window.EditsPage && document.querySelectorAll('#props .prop').length === 2, null, { timeout: 20000 });
    await hp.waitForTimeout(500);
    const rows = () => hp.evaluate(() => [...document.querySelectorAll('#props .prop')].map(li => ({ id: li.id, hit: li.classList.contains('hit'), on: li.querySelector('input').checked, who: li.querySelector('.who').textContent,
      why: (li.querySelector('.why') || {}).textContent || '', chips: [...li.querySelectorAll('.chip')].map(c => c.textContent), acts: [...li.querySelectorAll('.acts .btn')].map(x => x.textContent + (x.disabled ? ' (off)' : '')) })));
    let rs = await rows();
    ok(rs.length === 2 && rs[1].id === a1 && rs[1].hit && rs[1].on && !rs[0].on, 'two wait, newest first; the one the bell pointed at is marked and chosen', j(rs.map(r => [r.id === a1, r.hit, r.on])));
    ok(rs[1].who === ash.tag + ' proposes changes to your yard' && rs[1].why === 'a third path, <b>by the pond</b>' && j(rs[1].chips) === j(['+ 1 piece']) && j(rs[1].acts) === j(['look', 'take it', 'leave it']) && !(await hp.locator('#props b').count()),
      'each says who, why (as text), what it would change, and can be looked at, taken or left', j(rs[1]));
    ok(/2 EDITS WAIT/i.test(await hp.locator('#wait-sub').textContent()) && (await hp.locator('#chosen').textContent()) === '1 edit chosen' && !(await hp.locator('#take').isDisabled()), 'the bar counts them and what is chosen');
    const frames = () => hp.evaluate(() => [...document.querySelectorAll('.frame')].map(f => (f.querySelector('iframe') || { getAttribute() { return ''; } }).getAttribute('src')));
    ok(j(await frames()) === j(['/yard/?embed=1&at=' + s0.t, '/yard/?embed=1&with=' + a1]), 'two pictures: the yard as it stands, and with the chosen edit taken', j(await frames()));
    const drawn = async part => { const f = hp.frames().find(fr => fr.url().includes(part)); if (!f) return -1;
      await f.waitForFunction(() => window.Wall && document.querySelectorAll('#bench-world svg.wall-ink .wall-item').length > 0, null, { timeout: 25000 }).catch(() => {});
      return f.evaluate(() => document.querySelectorAll('#bench-world svg.wall-ink .wall-item').length); };
    ok(await drawn('at=' + s0.t) === 2 && await drawn('with=' + a1) === 3, 'the pictures are the yard itself: two strokes now, three with Ash\'s', j([await drawn('at=' + s0.t), await drawn('with=' + a1)]));
    await hp.locator('#all').check(); await hp.waitForTimeout(400);
    const both = rs.map(r => r.id).reverse().join(',');   // oldest first is how the door takes them; the page names them in the order they are listed
    ok((await hp.locator('#take').textContent()) === 'take the 2 together' && /with=p[a-z0-9]+,p[a-z0-9]+$/.test((await frames())[1]) && await drawn('with=' + (await frames())[1].split('with=')[1]) === 4,
      'choose all: the picture is the yard with both taken — four strokes — and the button says together', j([await frames(), both]));
    ok((await holly.get('/api/hill?hill=' + holly.hill)).doc.wall.items.length === 2 && await hp.evaluate(() => !localStorage.getItem('knoll-yard:wall') || JSON.parse(localStorage.getItem('knoll-yard:wall')).items.length <= 2),
      'looking took nothing: the yard is as Holly saved it, at the door and in this browser');
    // unsaved work in this browser holds the taking back
    await hp.evaluate(me => { localStorage.setItem('knoll-yard:owner', me); localStorage.setItem('knoll-yard:applied', '5'); localStorage.setItem('knoll-yard:touched', '9'); }, holly.id);
    await hp.reload(); await hp.waitForFunction(() => document.querySelectorAll('#props .prop').length === 2, null, { timeout: 20000 });
    rs = await rows();
    ok(await hp.locator('#warn').isVisible() && rs.every(r => r.acts.join() === 'look,take it (off),leave it') && await hp.locator('#take').isDisabled(), 'with unsaved changes to the yard in this browser, taking waits — and the page says to save first', j(rs.map(r => r.acts)));
    await hp.evaluate(() => { localStorage.removeItem('knoll-yard:touched'); });
    await hp.reload(); await hp.waitForFunction(() => document.querySelectorAll('#props .prop').length === 2, null, { timeout: 20000 });
    ok(!(await hp.locator('#warn').isVisible()), '…saved, it does not');
    const says = (re, ms) => hp.waitForFunction(src => new RegExp(src).test(document.getElementById('say').textContent), re.source, { timeout: ms || 10000 }).then(() => true, () => false);
    await hp.locator('#' + a1 + ' .acts .btn.ink').click();
    ok(await says(/taken ✓ — your page is saved with it/), 'take it: taken, and the page says so');
    let yardNow = (await holly.get('/api/hill?hill=' + holly.hill)).doc;
    ok(yardNow.wall.items.length === 3 && yardNow.looks.length === 2, 'the yard is saved with Ash\'s stroke on it, as a new save', j(yardNow.looks));
    rs = await rows();
    ok(rs.length === 1 && rs[0].who === birch.tag + ' proposes changes to your yard', 'one waits now');
    const hist = () => hp.evaluate(() => [...document.querySelectorAll('#hist > li')].map(li => li.querySelector('.t').textContent.replace(/\s+/g, ' ').trim()));
    let h = await hist();
    ok(h.length === 3 && /^you took an edit from Ash#1/.test(h[0]) && /^saved with 1 edit taken · 3 pieces\s*THIS IS YOUR PAGE NOW/.test(h[1]) && /^your yard was saved · 2 pieces/.test(h[2]), 'the history: the decision, the save that took it, and the save before', j(h));
    hp.once('dialog', d => d.accept('not the corner for it'));
    await hp.locator('#props .prop .acts .btn:has-text("leave it")').click();
    ok(await says(/1 edit left ✓ — Birch#1 has been told/), 'leave it, with a reason: left, and the page says they were told');
    ok(/NOTHING WAITS/i.test(await hp.locator('#wait-sub').textContent()) && /Nobody has proposed anything/i.test(await hp.locator('#props').innerText()) && await hp.locator('#bar').isHidden(), 'nothing waits, and the page says so');
    h = await hist();
    ok(/^you left an edit from Birch#1/.test(h[0]) && /not the corner for it/.test(h[0]), 'the history has the leaving, and why', h[0]);
    // two together
    await visit(ash); await draw(ash, 4); ash.p.once('dialog', d => d.accept('another')); await pill(ash).click(); await pillSays(ash, /sent ✓/);
    await visit(birch); await draw(birch, 6); birch.p.once('dialog', d => d.accept('and mine')); await pill(birch).click(); await pillSays(birch, /sent ✓/);
    await hp.reload(); await hp.waitForFunction(() => document.querySelectorAll('#props .prop').length === 2, null, { timeout: 20000 });
    await hp.locator('#all').check(); await hp.locator('#take').click();
    ok(await says(/2 edits taken together ✓/), 'two chosen and taken together: one save');
    yardNow = (await holly.get('/api/hill?hill=' + holly.hill)).doc;
    ok(yardNow.wall.items.length === 5 && yardNow.looks.length === 3, 'the yard has Ash\'s first stroke and both new ones — five — in three saves', j(yardNow.looks));
    h = await hist();
    ok(h.filter(x => /with 1 other/.test(x)).length === 2 && /^saved with 2 edits taken · 5 pieces/.test(h[2]), 'the history says they went together', j(h.slice(0, 3)));
    // a past save, looked at and brought back
    await hp.locator('#hist > li:last-child .btn:has-text("look")').click(); await hp.waitForTimeout(500);
    ok(j(await frames()) === j(['/yard/?embed=1&at=' + yardNow.t, '/yard/?embed=1&at=' + s0.t]) && /AS SAVED/i.test(await hp.locator('#then-h').textContent()), 'look, in the history: that save beside the yard as it stands', j(await frames()));
    hp.once('dialog', d => d.accept());
    await hp.locator('#hist > li:last-child .btn:has-text("bring this back")').click();
    ok(await says(/brought back ✓/), 'bring this back: the page says so');
    yardNow = (await holly.get('/api/hill?hill=' + holly.hill)).doc;
    ok(yardNow.wall.items.length === 2 && yardNow.looks.length === 4, 'the yard is the two strokes Holly first saved, as a new save — and the ones between are still in the history', j(yardNow.looks));
    await hp.goto(BASE + '/yard/'); await hp.waitForFunction(() => window.Wall && window.yard && Wall.store.get().items.length === 2, null, { timeout: 25000 }).then(() => ok(true, 'the yard itself opens on what was brought back'), () => ok(false, 'the yard itself opens on what was brought back'));

    // ── 4 · the proposers' bells ──────────────────────────────────────────
    const bellOf = async g => (await g.get('/api/friends')).notes.map(x => x.kind + (x.why ? ':' + x.why : ''));
    ok(j(await bellOf(ash)) === j(['taken', 'taken', 'friend']), 'Ash\'s bell: friends with Holly, and both edits taken', j(await bellOf(ash)));
    ok(j(await bellOf(birch)) === j(['taken', 'left:not the corner for it']), 'Birch\'s: one left, with Holly\'s reason, and one taken', j(await bellOf(birch)));
    await ash.p.goto(BASE + '/yard/'); await ash.p.waitForFunction(() => window.yard && window.yard.state.fr && window.KnollBell, null, { timeout: 25000 });
    await ash.p.locator('#dc-root button[title="notifications"]').click();
    await ash.p.locator('.kb-sheet').waitFor({ timeout: 8000 });
    const at = await ash.p.evaluate(() => [...document.querySelectorAll('.kb-item')].map(li => li.dataset.cat + ': ' + li.querySelector('.kb-text').textContent));
    ok(j(at) === j(['yours: Holly#1 took the change you proposed to their page', 'yours: Holly#1 took the change you proposed to their page', 'friends: Holly#1 said yes — you are friends now']), 'and on Ash\'s sheet they read so, each under its heading', j(at));

    // narrow: the sheet fits a phone
    await ash.p.setViewportSize({ width: 390, height: 800 }); await ash.p.waitForTimeout(300);
    const nb = await ash.p.locator('.kb-sheet').boundingBox();
    ok(nb.x >= 0 && nb.x + nb.width <= 390 && await ash.p.evaluate(() => document.documentElement.scrollWidth <= 390), 'on a phone the sheet is within the screen', j(nb));

    ok(errs.length === 0, 'no uncaught page errors along the way', errs.join(' | '));
  } catch (e) { fails.push('CRASH ' + (e && e.stack || e)); }
  if (b) await b.close().catch(() => {});
  srv.kill();
  console.log('\nprobe-bell: ' + n + ' checks, ' + (fails.length ? fails.length + ' FAILED\n - ' + fails.join('\n - ') : 'all good'));
  if (fails.length) { console.log('\nserver log tail:\n' + log.slice(-1500)); process.exit(1); }
})();
