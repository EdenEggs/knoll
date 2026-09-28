#!/usr/bin/env node
/* probe-stickers.js — THE TWO STICKERS, AND THE SEARCH THAT FINDS THE PAGES PEOPLE MAKE (2026-09-28), end to end in
   headless Chrome on a safe server (probe-gate-google.js as the preload: a temp store, /_outbox for the sign-up's
   code, the benches' doors 404'd).

     1  a new gnome's yard: the Founding Gnome sticker is the first of the badges and as wide as the card, its own
        number on the plate — No. 1 for the first account there is — and the Founder's Pin is gone; I was here is
        still to earn
     2  the gnome opens TOEM 2, signed in: the wall's card says so, and the yard has the sticker
     3  the public view of that yard (/YardView/?u=) shows a visitor the owner's two; the next gnome is No. 2
     4  five figures and six sit on the plate too
     5  the search: a page somebody made is found by a piece of its name, a moment after the last key, with its
        address beside it; Enter goes there; the site's own places are still found at once and said once; a name
        that is markup is drawn as the words it is

     node lab2/perf/probe-stickers.js          (needs Chrome + Playwright at Desktop/node_modules) */
'use strict';
const fs = require('fs'), os = require('os'), path = require('path'), net = require('net'), { spawn } = require('child_process');
const { chromium } = require(process.env.PLAYWRIGHT || 'C:/Users/bobb9/Desktop/node_modules/playwright');
const SITE = path.join(__dirname, '..', '..'), PORT = Number(process.env.PORT || 4341), BASE = 'http://localhost:' + PORT;
const gnome = require('./gnome.js');
const store = fs.mkdtempSync(path.join(os.tmpdir(), 'knoll-stickers-'));
const fails = []; let n = 0;
const ok = (c, what, extra) => { n++; if (!c) fails.push(what + (extra ? ' :: ' + String(extra).slice(0, 600) : '')); console.log((c ? '  ok   ' : '  FAIL ') + what); };
const waitPort = (port, tries = 80) => new Promise((res, rej) => { const t = () => { const s = net.connect(port, '127.0.0.1'); s.once('connect', () => { s.end(); res(); }); s.once('error', () => tries-- > 0 ? setTimeout(t, 250) : rej(new Error('port ' + port + ' never opened'))); }; t(); });
const j = v => JSON.stringify(v);
const MON = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
// the server's store is one JSON file, read before every command: a field written here is the server's at its next read
const inStore = fn => { const f = path.join(store, 'wall-db.json'), d = JSON.parse(fs.readFileSync(f, 'utf8')); fn(d); fs.writeFileSync(f, JSON.stringify(d)); };

// the badges as the page has drawn them: each tile's words, how wide it is beside the grid, and what its art is
const badges = p => p.evaluate(() => {
  const h2 = [...document.querySelectorAll('#dc-root h2')].find(h => h.textContent.trim() === 'Badges & trophies');
  if (!h2) return null;
  const grid = [...h2.parentNode.children].find(e => getComputedStyle(e).display === 'grid');
  if (!grid) return null;
  const gw = grid.getBoundingClientRect().width;
  return [...grid.children].map(t => {
    const spans = [...t.querySelectorAll(':scope > span')].map(s => s.textContent.trim()), svg = t.querySelector('svg'), img = t.querySelector('img'), text = svg && svg.querySelector('text'), image = svg && svg.querySelector('image');
    const tb = text && text.getBBox();
    return { name: spans[0], sub: spans[1], wide: Math.round(t.getBoundingClientRect().width / gw * 100), op: +getComputedStyle(t).opacity,
             art: image ? 'sticker' : img ? 'picture' : svg ? 'icon' : 'none', href: image ? image.getAttribute('href') : img ? img.getAttribute('src') : null,
             no: text ? text.textContent : null, label: svg ? svg.getAttribute('aria-label') : null, drawn: img ? img.naturalWidth : svg ? Math.round(svg.getBoundingClientRect().width) : 0,
             plate: tb ? { x0: Math.round(tb.x), x1: Math.round(tb.x + tb.width), y0: Math.round(tb.y), y1: Math.round(tb.y + tb.height), face: getComputedStyle(text).fontFamily } : null };
  });
});
const drawn = (p, ms) => p.waitForFunction(() => { const h2 = [...document.querySelectorAll('#dc-root h2')].find(h => h.textContent.trim() === 'Badges & trophies'); return !!h2 && /FOUNDING GNOME/.test(h2.parentNode.textContent) && /No\. /.test(h2.parentNode.textContent); }, null, { timeout: ms || 20000 }).then(() => true, () => false);

(async () => {
  const srv = spawn(process.execPath, ['-r', path.join(SITE, 'lab2/perf/probe-gate-google.js'), 'serve.js', String(PORT)], { cwd: SITE, env: Object.assign({}, process.env, { GATE_STORE: store }), stdio: ['ignore', 'pipe', 'pipe'] });
  let log = ''; srv.stdout.on('data', d => log += d); srv.stderr.on('data', d => log += d);
  let b;
  try {
    await waitPort(PORT);
    b = await chromium.launch({ channel: 'chrome', headless: true });
    const api = (c, url) => c.request.get(BASE + url).then(r => r.json());
    const ctx = await b.newContext({ viewport: { width: 1400, height: 1100 } });
    await gnome.signIn(ctx, BASE);
    const me = (await api(ctx, '/api/auth')).me;
    const errs = [], alerts = [];
    const watch = p => { p.on('pageerror', e => errs.push(String(e))); p.on('dialog', d => { alerts.push(d.message()); d.dismiss().catch(() => {}); }); return p; };

    // ── 1 · a new gnome's yard ───────────────────────────────────────────
    console.log('\na new gnome\'s yard');
    let card = (await api(ctx, '/api/wall?who=' + me.id)).who;
    ok(card && card.founder === 1 && card.here === undefined, 'the first account there is is Founding Gnome No. 1, and has not been to TOEM 2', j(card));
    for (const f of ['founding-gnome', 'i-was-here-toem2']) {
      const r = await ctx.request.get(BASE + '/logo/' + f + '.webp'), body = await r.body();
      ok(r.status() === 200 && /image\/webp/.test(r.headers()['content-type'] || '') && body.length > 8000 && body.length < 60000 && body.slice(0, 4).toString() === 'RIFF' && body.slice(8, 12).toString() === 'WEBP', '/logo/' + f + '.webp is served, a WebP of a size for a badge', r.status() + ' ' + body.length);
    }
    const p = watch(await ctx.newPage());
    await p.goto(BASE + '/yard/');
    ok(await drawn(p), 'the yard draws its badges, the wall\'s card among them');
    let B = await badges(p);
    ok(B && B.length === 7 && j(B.map(t => t.name)) === j(['FOUNDING GNOME', 'FIRST PLANTING', 'HILL TENDER', 'A STREAK', 'WALL SCRIBBLER', '100 EDITS', 'I WAS HERE']), 'seven badges: the Founding Gnome first, I was here last, the five between as they were', j(B && B.map(t => t.name)));
    ok(!/FOUNDER.S PIN/i.test(await p.evaluate(() => document.getElementById('dc-root').innerText)), 'the Founder\'s Pin is gone');
    let F = B[0];
    ok(F.art === 'sticker' && F.href === '/logo/founding-gnome.webp' && F.no === 'NO. 0001' && F.sub === 'No. 1 of 100,000' && F.op === 1 && F.label === 'Founding Gnome number 1', 'the sticker is the kit\'s art with this gnome\'s own number on the plate: NO. 0001', j(F));
    ok(F.wide >= 95 && B.slice(1).every(t => t.wide > 40 && t.wide < 50) && F.drawn >= 150, 'it is as wide as the card, the rest two to a row', j(B.map(t => t.wide)) + ' drawn ' + F.drawn);
    // the plate in the picture's own measure: its black is 172…332 across and 265…306 down (the art, 480 by 337) — the number sits inside it
    ok(F.plate && F.plate.x0 >= 160 && F.plate.x1 <= 316 && F.plate.y0 >= 262 && F.plate.y1 <= 312 && /VT323/.test(F.plate.face), 'the number sits on the plate, in the house\'s own face', j(F.plate));
    ok(B[6].art === 'icon' && B[6].sub === 'open TOEM 2 to earn it' && B[6].op < 1, 'I was here is still to earn, and says how', j(B[6]));

    // ── 2 · the gnome opens TOEM 2 ───────────────────────────────────────
    console.log('\nTOEM 2, signed in');
    const t = watch(await ctx.newPage());
    await t.goto(BASE + '/toem2/?live=1');
    let here = null;
    for (let i = 0; i < 40 && !here; i++) { await t.waitForTimeout(500); here = (await api(ctx, '/api/wall?who=' + me.id)).who.here; }
    const now = new Date(), month = now.toISOString().slice(0, 7);
    ok(here === month, 'a gnome with TOEM 2 open is told to the wall, and their card says I was here, to the month', j(here));
    await t.close();
    await p.goto(BASE + '/yard/');
    ok(await drawn(p) && await p.waitForFunction(() => /TOEM 2 · /.test(document.getElementById('dc-root').innerText), null, { timeout: 15000 }).then(() => true, () => false), 'back on the yard, the sticker is there');
    B = await badges(p);
    const H = B[6];
    ok(H.name === 'I WAS HERE' && H.sub === 'TOEM 2 · ' + MON[now.getUTCMonth()] + ' ' + now.getUTCFullYear() && H.art === 'picture' && H.href === '/logo/i-was-here-toem2.webp' && H.op === 1, 'I was here — TOEM 2, and the month', j(H));
    ok(await p.waitForFunction(() => { const i = document.querySelector('#dc-root img[src="/logo/i-was-here-toem2.webp"]'); return !!i && i.complete && i.naturalWidth === 480; }, null, { timeout: 10000 }).then(() => true, () => false), '…its picture drawn');

    // ── 3 · the public view, and the next gnome ──────────────────────────
    console.log('\nthe public view');
    const out = await b.newContext({ viewport: { width: 1400, height: 1100 } });
    const v = watch(await out.newPage());
    await v.goto(BASE + '/YardView/?u=' + me.id);
    ok(await drawn(v), 'somebody signed out opens that gnome\'s yard');
    let V = await badges(v);
    ok(V && V.length === 7 && V[0].no === 'NO. 0001' && V[0].sub === 'No. 1 of 100,000' && V[0].wide >= 95 && V[6].name === 'I WAS HERE' && V[6].art === 'picture' && /^TOEM 2 · /.test(V[6].sub), 'and sees the owner\'s two stickers', j(V && [V[0], V[6]]));
    ok(!/FOUNDER.S PIN/i.test(await v.evaluate(() => document.getElementById('dc-root').innerText)), 'no Founder\'s Pin there either');
    const ctx2 = await b.newContext({ viewport: { width: 1400, height: 1100 } });
    await gnome.signIn(ctx2, BASE);
    const me2 = (await api(ctx2, '/api/auth')).me, p2 = watch(await ctx2.newPage());
    await p2.goto(BASE + '/yard/');
    ok(await drawn(p2), 'a second gnome signs up');
    const B2 = await badges(p2);
    ok(B2[0].no === 'NO. 0002' && B2[0].sub === 'No. 2 of 100,000' && B2[6].sub === 'open TOEM 2 to earn it', 'and is No. 2, with I was here still to earn', j([B2[0], B2[6]]));

    // ── 4 · five figures, and six ────────────────────────────────────────
    console.log('\nthe number on the plate');
    for (const [no, plate, sub] of [[12345, 'NO. 12345', 'No. 12,345 of 100,000'], [100000, 'NO. 100000', 'No. 100,000 of 100,000']]) {
      inStore(d => { d.h['toem2:user:' + me2.id].founder = String(no); });
      await p2.goto(BASE + '/yard/');
      await drawn(p2);
      const f = (await badges(p2))[0];
      ok(f.no === plate && f.sub === sub && f.plate.x0 >= 160 && f.plate.x1 <= 316, plate + ' is drawn closer, and still on the plate', j(f));
    }

    // ── 5 · the search ───────────────────────────────────────────────────
    console.log('\nthe search');
    const make = (slug, title) => ctx.request.post(BASE + '/api/wall', { headers: { origin: BASE }, data: { op: 'page', slug, title } }).then(r => r.json());
    const m1 = await make('probe-orchard', 'Probe Orchard'), m2 = await make('probe-markup', '<img src=x onerror=alert(1)> Orchid');
    ok(m1.ok && m2.ok, 'a gnome makes two pages', j([m1.ok, m2.ok, m1.error, m2.error]));
    const s = watch(await out.newPage());
    await s.goto(BASE + '/privacy/');
    await s.waitForSelector('#knoll-account .ka-lens', { timeout: 15000 });
    await s.click('#knoll-account .ka-lens');
    const hits = () => s.evaluate(() => [...document.querySelectorAll('#knoll-account .ka-hits li')].map(li => { const a = li.querySelector('a'), sm = li.querySelector('small'); return a ? [a.firstChild.textContent, a.getAttribute('href'), sm ? sm.textContent : '', a.className] : ['(' + li.textContent + ')']; }));
    const until = (fn, arg, ms) => s.waitForFunction(fn, arg, { timeout: ms || 8000 }).then(() => true, () => false);
    ok((await hits()).some(h => h[0] === 'TOEM 2') && !(await hits()).some(h => /Probe/.test(h[0])), 'the box opens on the site\'s own places');
    await s.fill('#knoll-account input', 'orch');
    ok(await until(() => [...document.querySelectorAll('#knoll-account .ka-hits a')].some(a => /Probe Orchard/.test(a.textContent))), 'four letters of its name, and a page somebody made is found');
    let L = await hits();
    ok(j((L.find(h => h[0] === 'Probe Orchard') || []).slice(0, 3)) === j(['Probe Orchard', '/probe-orchard', '/probe-orchard']) && L[0][3] === 'is-first' && L.filter(h => h[3] === 'is-first').length === 1, '…by its name, its address beside it; the first of the list is the one Enter takes', j(L));
    ok(L.some(h => h[0] === '<img src=x onerror=alert(1)> Orchid') && await s.evaluate(() => !document.querySelector('#knoll-account .ka-hits img')) && !alerts.length, 'a name that is markup is drawn as the words it is', j(L) + ' ' + j(alerts));
    await s.fill('#knoll-account input', 'toem');
    await s.waitForTimeout(900);
    L = await hits();
    ok(L.filter(h => h[1] === '/toem2/').length === 1 && L[0][0] === 'TOEM 2', 'the site\'s own places are found at once, and TOEM 2 is said once though the door has it too', j(L));
    await s.fill('#knoll-account input', 'zzqx');
    ok(await until(() => /nothing on the hill by that name/.test(document.querySelector('#knoll-account .ka-hits').textContent)) && !/still to come/.test(await s.evaluate(() => document.querySelector('#knoll-account .ka-hits').textContent)), 'what no page is called finds nothing, and says so plainly');
    await s.fill('#knoll-account input', 'probe orch');
    await until(() => [...document.querySelectorAll('#knoll-account .ka-hits a')].some(a => /Probe Orchard/.test(a.textContent)));
    // by way of its own address, /probe-orchard — the space's page, which sends it on to its wall
    await Promise.all([s.waitForURL(/\/toem2\/\?page=probe-orchard/, { timeout: 20000 }), s.press('#knoll-account input', 'Enter')]);
    ok(await s.waitForFunction(() => location.pathname === '/toem2/' && /[?&]page=probe-orchard/.test(location.search) && document.documentElement.dataset.page === 'probe-orchard', null, { timeout: 20000 }).then(() => true, () => false), 'Enter goes to the page, which opens on its wall', s.url());
    // renamed, it is found by the name it has now
    const rn = await ctx.request.post(BASE + '/api/wall', { headers: { origin: BASE }, data: { op: 'settings', page: 'probe-orchard', title: 'Plum Walk' } }).then(r => r.json());
    const f2 = await api(out, '/api/wall?find=plum');
    ok(rn.ok && j(f2.pages) === j([{ slug: 'probe-orchard', title: 'Plum Walk' }]), 'renamed in its settings, it is found by the name it has now', j(f2));

    ok(!errs.length, 'no page threw', j(errs.slice(0, 3)));
    ok(!alerts.length, 'and nothing a page drew ran as script', j(alerts));
  } catch (e) {
    ok(false, 'the probe ran to the end', String((e && e.stack) || e).split('\n').slice(0, 4).join(' | '));
  } finally {
    if (b) await b.close().catch(() => {});
    srv.kill();
    await new Promise(r => setTimeout(r, 400));
    try { fs.rmSync(store, { recursive: true, force: true }); } catch (e) {}
  }
  if (fails.length) { console.log('\nFAILED:'); fails.forEach(f => console.log('  - ' + f)); if (/Error|EADDRINUSE/.test(log)) console.log('\nserver said:\n' + log.split('\n').filter(l => /Error|EADDR|api\//.test(l)).slice(0, 12).join('\n')); }
  console.log('\nprobe-stickers: ' + n + ' checks, ' + (fails.length ? fails.length + ' FAILED' : 'all good'));
  process.exit(fails.length ? 1 : 0);
})();
