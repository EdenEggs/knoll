/* probe-accounts.js — the whole walk a new gnome takes, in a real Chrome
   (headless), against a running serve.js: the account corner on the front
   page, SIGN UP and back, the yard's tour on the first visit only, the yard
   published to its own hill, SIGN OUT, the pages that want you signed in,
   TOEM 2's edit kept on the paper through LOG IN and sent on the way back,
   the wrong secret word, "keep the gate unlatched" unticked, a second
   gnome on the same browser, and the corner on a phone.

   It makes real accounts in whatever store that server has, so point it at
   a server with a throwaway one — e.g. WALL_DB and HILL_ROOT set to a temp
   folder — never the owner's toem2/wall-db.json. Each run also leaves one
   TOEM 2 edit queued from this machine's address, and the wall holds four
   per address (api/wall.js: CAP.pendingIp): after four runs, a fresh store.

     BASE=http://localhost:4323 node lab2/perf/probe-accounts.js          */
'use strict';
const { chromium } = require('playwright');
const BASE = (process.env.BASE || 'http://localhost:4321').replace(/\/$/, '');
const run = Date.now().toString(36);
const A = { name: 'Probe ' + run.slice(-4), email: 'probe-a-' + run + '@example.com', pw: 'toadstool-' + run };
const B = { name: 'Other ' + run.slice(-4), email: 'probe-b-' + run + '@example.com', pw: 'bramble-' + run };

let fails = 0;
const check = (name, ok, info) => { if (!ok) fails++; console.log((ok ? '  PASS  ' : '  FAIL  ') + name + (info == null || info === '' ? '' : '   ' + (typeof info === 'string' ? info : JSON.stringify(info)))); };
const errors = [];
function watch(p) {
  p.on('pageerror', e => errors.push(p.url() + ' PAGEERROR ' + e.message));
  /* Three errors are the walk's own and not faults: a bench's write door (/_lab2/default and the like)
     is a 404 wherever it is shut — the deployed site, a test server; the wrong-word step's 401 from the
     gate, which Chrome logs like any refused request; and the cursors' relay (cursors.js), a server
     that is not this site's and not always up. */
  p.on('console', m => {
    const at = (m.location() || {}).url || '', t = m.text();
    if (m.type() !== 'error' || /\/_[a-z0-9_-]+\//.test(at) || /favicon/.test(t) || (/\/api\/auth$/.test(at) && /\b401\b/.test(t)) || /WebSocket connection to 'wss:/.test(t)) return;
    errors.push(p.url() + ' ' + t);
  });
  return p;
}
const corner = p => p.evaluate(() => {
  const c = document.getElementById('knoll-account');
  if (!c) return null;
  const vis = s => { const el = c.querySelector(s); return !!el && !el.hidden && getComputedStyle(el).display !== 'none'; };
  const r = c.getBoundingClientRect(), head = c.parentElement.getBoundingClientRect();
  return { login: vis('.ka-in'), signup: vis('.ka-up'), gnome: vis('.ka-me'), lens: vis('.ka-lens'),
           right: Math.round(innerWidth - r.right), top: Math.round(r.top), barH: Math.round(head.height), vw: innerWidth,
           scrollW: document.scrollingElement.scrollWidth, inBar: c.parentElement.matches('.lab-head, .knoll-head'),
           loginHref: c.querySelector('.ka-in').getAttribute('href'), gnomeHref: c.querySelector('.ka-me').getAttribute('href') };
});
const waitCorner = p => p.waitForSelector('#knoll-account', { state: 'attached', timeout: 15000 });
const api = (p, body) => p.evaluate(b => fetch('/api/auth', b ? { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) } : { cache: 'no-store' }).then(r => r.json()), body || null);
async function signUp(p, who) {
  await p.waitForSelector('#f-name');
  await p.waitForTimeout(1200);                       // the scroll unrolls
  await p.fill('#f-name', who.name); await p.fill('#f-email', who.email); await p.fill('#f-pw', who.pw); await p.fill('#f-pw2', who.pw);
  await p.click('button[type="submit"]');
  // THE CODE (api/auth.js): the seal sends a code; the probe reads it (gnome.js — a server started with probe-gate-google.js
  // as its preload hands it over at /_outbox) and presses the seal again with it
  await p.waitForSelector('#f-code', { timeout: 15000 });
  await p.fill('#f-code', await require('./gnome.js').code(p.context(), BASE, who.email));
  await p.click('button[type="submit"]');
}
async function logIn(p, who, pw, remember) {
  await p.waitForSelector('#f-email');
  await p.waitForTimeout(1200);
  await p.fill('#f-email', who.email); await p.fill('#f-pw', pw || who.pw);
  if (remember === false) await p.uncheck('input[type="checkbox"]');
  await p.click('button[type="submit"]');
}

(async () => {
  const b = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
    const p = watch(await ctx.newPage());

    // ── 1 · the front page, signed out ─────────────────────────────────────
    await p.goto(BASE + '/lab2/?visitor', { waitUntil: 'domcontentloaded' });
    await waitCorner(p);
    let c = await corner(p);
    check('lab 2 (as the site shows it): the corner is in the header, at its right end', c && c.inBar && c.right <= 30 && c.lens, c);
    check('…with LOG IN and SIGN UP, and no gnome', c && c.login && c.signup && !c.gnome);
    check('…and the header is still one bar tall', c && c.barH <= 60, c && c.barH);
    check('…and log in comes back here', c && c.loginHref === '/login/?next=' + encodeURIComponent('/lab2/?visitor'), c && c.loginHref);
    await p.goto(BASE + '/lab2/', { waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(800);
    check('the workbench (lab 2 on localhost) goes without the corner', !(await p.$('#knoll-account')));

    // ── 2 · the search ─────────────────────────────────────────────────────
    await p.goto(BASE + '/lab2/?visitor', { waitUntil: 'domcontentloaded' });
    await waitCorner(p);
    await p.click('#knoll-account .ka-lens');
    const focused = await p.evaluate(() => document.activeElement && document.activeElement.matches('#knoll-account input'));
    await p.keyboard.type('toem');
    const hits = await p.$$eval('#knoll-account .ka-hits a', as => as.map(a => a.textContent));
    check('the lens opens the box, focused, and "toem" finds TOEM 2', focused && hits[0] === 'TOEM 2', hits);
    const bar0 = await p.evaluate(() => document.querySelector('.lab-head').getBoundingClientRect().height);
    check('…without the bar moving', bar0 <= 60, bar0);
    await p.keyboard.press('Escape');
    check('Escape puts it away', await p.evaluate(() => document.querySelector('#knoll-account .ka-box').hidden));

    // ── 3 · SIGN UP, and back ──────────────────────────────────────────────
    await p.click('#knoll-account .ka-up');
    await p.waitForURL(/\/signup\/\?next=/);
    await signUp(p, A);
    await p.waitForURL(u => u.pathname === '/lab2/' && /visitor/.test(u.search), { timeout: 15000 });
    await waitCorner(p);
    await p.waitForFunction(() => { const g = document.querySelector('#knoll-account .ka-me'); return g && !g.hidden; }, null, { timeout: 5000 });
    c = await corner(p);
    check('after SIGN UP you are back on the page you left, and the corner is your gnome', c && c.gnome && !c.login && !c.signup && c.gnomeHref === '/yard/', c);
    const jar = await ctx.cookies();
    const sess = jar.find(k => k.name === 'knoll_s'), hint = jar.find(k => k.name === 'knoll_in');
    check('the session is an HttpOnly cookie, the id a readable one', sess && sess.httpOnly && sess.sameSite === 'Lax' && hint && !hint.httpOnly && /^[0-9a-f]{16}$/.test(hint.value), { sess: sess && sess.httpOnly, hint: hint && hint.value });
    const eyes0 = await p.getAttribute('#knoll-account .ka-eyes', 'transform');
    await p.mouse.move(200, 600); await p.waitForTimeout(150); await p.mouse.move(1400, 20); await p.waitForTimeout(150);
    const eyes1 = await p.getAttribute('#knoll-account .ka-eyes', 'transform');
    check('the gnome\'s eyes follow the pointer', !!eyes1 && eyes1 !== eyes0, [eyes0, eyes1]);
    let me = (await api(p)).me;
    check('the door knows the account: named, not yet toured', me && me.name === A.name && me.toured === false, me);

    // ── 4 · the yard: the tour, once ───────────────────────────────────────
    await p.goto(BASE + '/yard/', { waitUntil: 'domcontentloaded' });
    const toured = await p.waitForSelector('[role="dialog"][aria-label="yard tour"]', { timeout: 8000 }).then(() => true, () => false);
    check('the first visit to your yard: the gnome shows you round', toured);
    check('…and it greets you by the account\'s name', await p.evaluate(n => document.body.innerText.includes(n), A.name));
    await p.waitForTimeout(600);
    me = (await api(p)).me;
    check('…and the door marks the tour shown', me && me.toured === true, me);
    await p.keyboard.press('Escape');
    await p.reload({ waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(3000);
    check('the second visit is just your yard', !(await p.$('[role="dialog"][aria-label="yard tour"]')));
    c = await corner(p);
    check('on the yard the gnome is named, not a link to the page you are on', c && c.gnome && c.gnomeHref === null, c);

    // ── 5 · the yard publishes to its own hill ─────────────────────────────
    const id = hint.value;
    const pub = await p.evaluate(async () => {
      Wall.store.update(st => { st.items.push({ k: 't', t: 'a note from the probe', x: 300, y: 300, sz: 22, c: 0 }); });
      const ok = await YardTools.publish(() => {});
      return { ok, hill: (await fetch('/api/hill?hill=u-' + document.cookie.match(/knoll_in=([0-9a-f]{16})/)[1]).then(r => r.json())) };
    });
    check('SAVE YARD publishes to u-<your id>, with no key asked for', pub.ok && pub.hill.ok && pub.hill.doc.hill === 'u-' + id && pub.hill.doc.wall.items.some(it => it.t === 'a note from the probe'), { ok: pub.ok, hill: pub.hill.doc && pub.hill.doc.hill });

    // ── 6 · the dashboard is yours too ─────────────────────────────────────
    await p.goto(BASE + '/dashboard/', { waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(1500);
    check('signed in, the dashboard opens', /\/dashboard\/$/.test(p.url()), p.url());

    // ── 7 · SIGN OUT ───────────────────────────────────────────────────────
    await p.goto(BASE + '/yard/', { waitUntil: 'domcontentloaded' });
    await p.waitForSelector('button[aria-label="settings"]');
    await p.waitForTimeout(800);
    await p.click('button[aria-label="settings"]');
    await p.click('text=SIGN OUT');
    await p.waitForURL(/\/login\/$/, { timeout: 8000 }).catch(() => {});
    check('SIGN OUT goes to the gate', /\/login\/$/.test(p.url()), p.url());
    await waitCorner(p);
    c = await corner(p);
    check('…signed out: the corner offers the other gate, not this one', c && !c.gnome && c.signup && !c.login, c);
    check('…and the door agrees', (await api(p)).me === null);
    await p.goto(BASE + '/yard/', { waitUntil: 'domcontentloaded' });
    await p.waitForURL(/\/login\/\?next=%2Fyard%2F/, { timeout: 5000 }).catch(() => {});
    check('signed out, /yard sends you to the gate, to come back', /\/login\/\?next=%2Fyard%2F$/.test(p.url()), p.url());
    await p.goto(BASE + '/dashboard/', { waitUntil: 'domcontentloaded' });
    await p.waitForURL(/\/login\/\?next=%2Fdashboard%2F/, { timeout: 5000 }).catch(() => {});
    check('…and so does /dashboard', /\/login\/\?next=%2Fdashboard%2F$/.test(p.url()), p.url());
    await p.goto(BASE + '/yard/?embed=1', { waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(800);
    check('…but not the dashboard\'s picture of the yard (?embed=1)', /\/yard\/\?embed=1$/.test(p.url()), p.url());

    // ── 8 · TOEM 2: an edit, the gate, and back with it ────────────────────
    await p.goto(BASE + '/toem2/?visitor', { waitUntil: 'domcontentloaded' });
    await p.waitForFunction(() => window.Seed && Seed.base && Seed.base.rev > 0 && window.Wall && Wall.store, null, { timeout: 30000 });
    await waitCorner(p);
    c = await corner(p);
    check('TOEM 2: the corner is there too, signed out', c && c.login && c.signup && c.inBar, c);
    const moved = await p.evaluate(() => {
      let n = null;
      Wall.store.update(st => { const it = st.items.find(x => x && x.n && x.k === 'd'); n = it.n; it.x += 40; });
      return { n, x: Wall.store.get().items.find(x => x && x.n === n).x };
    });
    await p.waitForTimeout(300);
    await p.click('#toem-save');
    await p.waitForSelector('#toem-save-note button', { timeout: 5000 });
    const offered = await p.$$eval('#toem-save-note button', bs => bs.map(x => x.textContent));
    check('SUBMIT, signed out: the note offers log in and sign up', JSON.stringify(offered) === JSON.stringify(['log in', 'sign up']), offered);
    // A is signed out; log in as A from here
    await p.click('#toem-save-note button:has-text("log in")');
    await p.waitForURL(/\/login\/\?next=%2Ftoem2%2F%3Fvisitor/);
    await logIn(p, A);
    await p.waitForURL(u => u.pathname === '/toem2/', { timeout: 15000 });
    await p.waitForFunction(() => window.Seed && Seed.base && Seed.base.rev > 0 && Seed.me, null, { timeout: 30000 });
    const after = await p.evaluate(n => ({ x: (Wall.store.get().items.find(x => x && x.n === n) || {}).x, me: Seed.me && Seed.me.id }), moved.n);
    check('back on TOEM 2 after LOG IN, with the edit still on the paper', after.x === moved.x && after.me === id, after);
    const sent = await p.waitForFunction(() => { const b = document.getElementById('toem-save'); return b && /queued|live/.test(b.textContent) && b.textContent; }, null, { timeout: 15000 }).then(h => h.jsonValue(), () => '');
    check('…and it goes up on its own: a newcomer\'s edit, queued', /queued/.test(sent), sent);
    const q = await p.evaluate(() => fetch('/api/wall?queue=1').then(r => r.json()));
    check('…where the queue has it, under the account', q.queue && q.queue.some(e => e.by === id), q.queue && q.queue.map(e => e.by));

    // ── 9 · the wrong word, and a session that ends with the browser ───────
    await api(p, { op: 'logout' });
    await p.goto(BASE + '/login/', { waitUntil: 'domcontentloaded' });
    await logIn(p, A, 'not-the-word');
    await p.waitForSelector('#e-pw', { timeout: 8000 }).catch(() => {});
    const note = await p.evaluate(() => { const e = document.getElementById('e-pw'); return e && e.textContent.trim(); });
    check('the wrong secret word jams the key, and the margin says so', /incorrect email or password/.test(note || '') && /\/login\/$/.test(p.url()), note);   // plain words since 2026-09-23
    await p.fill('#f-pw', A.pw);
    await p.uncheck('input[type="checkbox"]');
    await p.click('button[type="submit"]');
    await p.waitForURL(/\/yard\/$/, { timeout: 15000 }).catch(() => {});
    check('the right one opens the gate, and with nowhere to go back to, you land in your yard', /\/yard\/$/.test(p.url()), p.url());
    const s2 = (await ctx.cookies()).find(k => k.name === 'knoll_s');
    check('"keep the gate unlatched" unticked: the session ends with the browser', s2 && s2.expires === -1, s2 && s2.expires);
    await p.waitForTimeout(2500);
    check('logging back in is not a first visit: no tour', !(await p.$('[role="dialog"][aria-label="yard tour"]')));

    // ── 10 · a second gnome on the same browser ────────────────────────────
    await api(p, { op: 'logout' });
    await p.goto(BASE + '/signup/', { waitUntil: 'domcontentloaded' });
    await signUp(p, B);
    await p.waitForURL(/\/yard\/$/, { timeout: 15000 }).catch(() => {});
    await p.waitForTimeout(2500);
    const second = await p.evaluate(names => ({ b: document.body.innerText.includes(names[1]), a: document.body.innerText.includes(names[0]),
      note: document.body.innerText.includes('a note from the probe'), owner: localStorage.getItem('knoll-yard:owner'), cookie: (document.cookie.match(/knoll_in=([0-9a-f]{16})/) || [])[1] }), [A.name, B.name]);
    check('a second gnome signing up here lands in THEIR yard, not the first one\'s', second.b && !second.a && !second.note && second.owner === second.cookie, second);
    check('…and gets the tour, being new', !!(await p.$('[role="dialog"][aria-label="yard tour"]')));

    // ── 11 · a phone ───────────────────────────────────────────────────────
    const phone = await b.newContext({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true });
    const q1 = watch(await phone.newPage());
    await q1.goto(BASE + '/lab2/?visitor', { waitUntil: 'domcontentloaded' });
    await waitCorner(q1);
    c = await corner(q1);
    check('a phone: the corner fits, and nothing scrolls sideways', c && c.right >= 0 && c.right <= 24 && c.scrollW <= 375 && c.login && c.signup, c);
    await q1.click('#knoll-account .ka-lens');
    const box = await q1.evaluate(() => { const r = document.querySelector('#knoll-account .ka-box').getBoundingClientRect(); return { left: Math.round(r.left), right: Math.round(r.right) }; });
    check('…and the search opens on the screen', box.left >= 0 && box.right <= 375, box);
    await q1.goto(BASE + '/toem2/?visitor', { waitUntil: 'domcontentloaded' });
    await waitCorner(q1);
    c = await corner(q1);
    check('TOEM 2 on a phone: the corner is on the screen', c && c.right >= 0 && c.scrollW <= 375, c);

    check('no console errors on any page', !errors.length, errors.slice(0, 6));
  } catch (e) {
    check('the probe ran to the end', false, String((e && e.stack) || e).split('\n').slice(0, 3).join(' | '));
  }
  await b.close();
  console.log('\n' + (fails ? fails + ' FAILED' : 'all checks passed'));
  process.exit(fails ? 1 : 0);
})();
