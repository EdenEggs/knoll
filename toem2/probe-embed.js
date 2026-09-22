/* toem2/probe-embed.js — THE YARD'S PICTURE OF TOEM 2 (2026-09-21):
   toem2/index.html's ?embed=1, and the hill in yard/index.html that frames it.

     1  the embed, on the live path, in a page of this site whose TOEM 2 holds
        an edit left waiting on a sign-in (signed in, one piece moved,
        knoll-toem2:resume set): the frame opens on the whole wall with no
        header, no docks and no cursor room — sends nothing, and leaves every
        knoll-toem2: key byte for byte as it was. On the real storage this is
        the page that would have posted that edit.
     2  the hill, on a signed-in yard: TOEM 2's sign, a link to /toem2/, and in
        the mound an inert frame of /toem2/?embed=1 at 160 × 104 — and no frame
        in the dashboard's picture of the yard (?embed=1)
     3  the bin: on a flagged hill the flag shakes and the hill stays;
        unflagged, the hill goes, and stays gone after a reload; stored lists
        that are not arrays read as the defaults instead of throwing

   The gate and the wall's door are answered by the probe itself (route): no
   account is made, and nothing reaches the server but GETs.
   Needs a server:  node serve.js   then:  node toem2/probe-embed.js
   (URL=http://localhost:4321 by default) */
'use strict';
const path = require('path');
const { chromium } = require('playwright');

const BASE = (process.env.URL || 'http://localhost:4321').replace(/\/+$/, '');
const SEED = require(path.join(__dirname, 'wall-seed.json'));
const ID = '0123456789abcdef';
const POLL = { polling: 150, timeout: 20000 };
const HILL = '#dc-root nav[aria-label="hills"] a[href="../toem2/"]';
let fails = 0;
const say = (ok, what, extra) => {
  if (!ok) fails++;
  console.log((ok ? '  PASS  ' : '  FAIL  ') + what + (extra ? '   ' + extra : ''));
};
const keys = p => p.evaluate(() => JSON.stringify(Object.keys(localStorage).sort().map(k => [k, localStorage.getItem(k)])));

// a signed-in gnome, as far as a page can tell: the cookie that says so, and the gate agreeing
async function signedIn(ctx) {
  await ctx.addCookies([{ name: 'knoll_in', value: ID, url: BASE }]);
  await ctx.route('**/api/auth*', r => r.fulfill({ json: { ok: true, me: { id: ID, name: 'Probe', toured: true } } }));
}

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: false });
  const errors = [];
  try {
    // ── 1 · the picture leaves this browser's TOEM 2 alone ────────────────────
    {
      const ctx = await browser.newContext({ viewport: { width: 1000, height: 700 } });
      await signedIn(ctx);
      const items = SEED.wall.items, sent = [], relays = [];
      await ctx.route('**/api/wall*', r => {
        const req = r.request(), q = new URL(req.url()).searchParams;
        if (req.method() !== 'GET') { sent.push(req.method() + ' ' + req.url()); return r.fulfill({ status: 500, json: { ok: false } }); }
        if (q.get('me')) return r.fulfill({ json: { ok: true, id: ID, name: 'Probe', tier: 'contributor', role: 'user' } });
        if (q.get('rev')) return r.fulfill({ json: { ok: true, rev: 5, same: true } });
        return r.fulfill({ json: { ok: true, rev: 5, wall: { items }, flatfile: SEED.flatfile, cam: SEED.cam } });
      });
      const p = await ctx.newPage();
      p.on('pageerror', e => errors.push('1: ' + e.message));
      p.on('request', r => { if (/trystero/i.test(r.url())) relays.push(r.url()); });
      // a blank page of this site to hold the frame, answered here rather than by the server
      await p.route(BASE + '/__probe-host', r => r.fulfill({ contentType: 'text/html', body: '<!doctype html><title>host</title>' }));
      await p.goto(BASE + '/__probe-host');
      await p.evaluate(items => {
        const moved = JSON.parse(JSON.stringify(items));
        moved[0].x += 40;
        localStorage.setItem('knoll-toem2:base', JSON.stringify({ rev: 5, items, art: [] }));
        localStorage.setItem('knoll-toem2:wall', JSON.stringify({ items: moved }));
        localStorage.setItem('knoll-toem2:resume', '1');
        localStorage.setItem('knoll-toem2:seeded', '2026-09-01');
      }, items);
      const before = await keys(p);
      await p.evaluate(() => {
        const f = document.createElement('iframe');
        f.id = 'pic'; f.src = '/toem2/?embed=1&live=1'; f.style.cssText = 'width:800px;height:520px;border:0';
        document.body.appendChild(f);
      });
      const fr = await (await p.waitForSelector('#pic')).contentFrame();
      await fr.waitForFunction(() => window.Seed && Seed.base && Seed.base.rev === 5 && Wall.store.get().items.filter(Boolean).length > 300, null, POLL);
      await p.waitForTimeout(5000);   // past whoami, where a resume would submit, and cursors.js's idle start
      const inside = await fr.evaluate(() => ({
        items: Wall.store.get().items.filter(Boolean).length, own: !(localStorage instanceof Storage), company: window.Company,
        chrome: ['.lab-head', '.tool-dock', '.tool-opts', '.zoom-dock'].map(s => { const e = document.querySelector(s); return e ? getComputedStyle(e).display : 'none'; })
      }));
      say(inside.items === items.length && inside.chrome.every(d => d === 'none'), 'the frame opens on the whole wall, with no header and no docks', JSON.stringify(inside));
      say(inside.own && (await keys(p)) === before, "this browser's own TOEM 2 — its edit, its base, its resume — is byte for byte as it was", inside.own ? '' : 'the frame is on the real localStorage');
      say(!sent.length, 'the edit waiting on a sign-in is not sent from the picture', sent.join(' '));
      say(inside.company === null && !relays.length, 'no cursor room: the picture is not a visitor', relays.join(' '));
      await ctx.close();
    }

    // ── 2 · the hill: TOEM 2, the page itself in its mound ────────────────────
    const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } });
    await signedIn(ctx);
    const p = await ctx.newPage();
    p.on('pageerror', e => errors.push('2: ' + e.message));
    await p.goto(BASE + '/yard/', { waitUntil: 'load' });
    await p.waitForSelector(HILL + ' iframe', POLL);
    const hill = await p.evaluate(sel => {
      const a = document.querySelector(sel), f = a.querySelector('iframe'), r = f.getBoundingClientRect();
      return { sign: a.textContent.includes('TOEM 2'), src: f.getAttribute('src'), inert: f.inert, w: Math.round(r.width), h: Math.round(r.height) };
    }, HILL);
    say(hill.sign && hill.src === '../toem2/?embed=1' && hill.inert && hill.w === 160 && hill.h === 104,
      "the hill is TOEM 2's, and its mound is the page: an inert frame, 160 × 104", JSON.stringify(hill));
    const q = await ctx.newPage();
    await q.goto(BASE + '/yard/?embed=1', { waitUntil: 'load' });
    await q.waitForSelector(HILL, POLL);
    say(await q.evaluate(sel => !document.querySelector(sel + ' iframe'), HILL), "no frame in the dashboard's picture of the yard (?embed=1)");
    await q.close();

    // ── 3 · the bin ───────────────────────────────────────────────────────────
    await p.bringToFront();
    await p.hover(HILL);
    await p.click(HILL + ' button[aria-label^="TOEM 2 is flagged"]', { force: true });   // aria-disabled, which playwright will not press unforced
    const shook = await p.evaluate(sel => {
      const a = document.querySelector(sel);
      return { stays: !!a, shaking: a ? a.querySelector('.hill-flag svg').getAnimations().length : 0 };
    }, HILL);
    say(shook.stays && shook.shaking > 0 && new URL(p.url()).pathname === '/yard/', 'the bin on a flagged hill shakes the flag, and the hill stays', JSON.stringify(shook));
    await p.click(HILL + ' .hill-flag');
    await p.click(HILL + ' button[aria-label^="take TOEM 2 off"]');
    await p.waitForFunction(sel => !document.querySelector(sel), HILL, POLL);
    const gone = await p.evaluate(() => localStorage.getItem('knoll-yard:hills-gone'));
    await p.reload({ waitUntil: 'load' });
    await p.waitForSelector('#dc-root nav[aria-label="hills"]', POLL);
    await p.waitForTimeout(800);
    say(gone === '["TOEM 2"]' && (await p.evaluate(sel => !document.querySelector(sel), HILL)), 'unflagged, the bin takes the hill off — and it stays off after a reload', gone);
    await p.evaluate(() => { localStorage.setItem('yard.favHills', '{"not":"an array"}'); localStorage.setItem('knoll-yard:hills-gone', '"TOEM 2"'); });
    const n = errors.length;
    await p.reload({ waitUntil: 'load' });
    await p.waitForSelector(HILL, POLL);
    say(errors.length === n && (await p.evaluate(sel => document.querySelector(sel + ' .hill-flag').getAttribute('aria-pressed'), HILL)) === 'true',
      'stored lists that are not arrays read as the defaults, not as a crash', errors.slice(n).join(' | '));
    await ctx.close();
  } catch (e) {
    say(false, 'the probe ran to the end', String((e && e.stack) || e).split('\n').slice(0, 3).join(' | '));
  }
  say(!errors.length, 'no page errors', errors.join(' | '));
  await browser.close();
  console.log(fails ? '\n' + fails + ' FAILED' : '\nall passed');
  process.exit(fails ? 1 : 0);
})();
