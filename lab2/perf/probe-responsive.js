#!/usr/bin/env node
/* probe-responsive.js — EVERY PAGE, AT A PHONE'S WIDTH AND A TABLET'S AND A DESK'S
   (2026-09-28), in headless Chrome against a serve.js of its own over a throwaway
   store (probe-gate-google.js as the preload: the benches' doors shut, the codes
   handed out at /_outbox).

   THE BROWSER REACHES IT AS knoll.test, not localhost. On localhost a bench wears
   the workbench's header — the hint, the row of switches, no account corner
   (html.lab-local) — and none of that is what a visitor is given; by any other
   name it is the page the site serves. The name is mapped to this machine for
   the one browser (--host-resolver-rules), so nothing is written anywhere.

   What it holds the site to:
     1  no page is wider than its screen, at 320, 390, 768, 1024 and 1440;
     2  on the walls, what is fixed to the screen — the tools, the zoom, the
        corner's buttons, the trophy, the header — stands clear of each other
        and inside the screen, at ten shapes of screen from a phone on its side
        to a desk, and with a space's ten inks on the dock;
     3  what opens, opens where it can be read and put away again: the keymap
        under the header and over nothing, a drawer clear of the tools and
        their options, a panel's ✕ under the finger, what hangs from the
        header OVER the furniture and not behind it;
     4  the gate on a phone: the words by the lock in a column they can be read
        in, the scroll's rollers inside the screen, a note under its field;
     5  the dashboard's two cards one over the other on a phone;
     6  the yard: the end of the page clear of the dock, and the settings
        drawer over it;
     7  an address nothing stands at, read whole on a phone;
     8  the ballot's ✕ on the narrowest phone.

     node lab2/perf/probe-responsive.js          (needs Chrome + Playwright) */
'use strict';
const fs = require('fs'), os = require('os'), path = require('path'), net = require('net');
const { spawn } = require('child_process');
const { chromium } = require(process.env.PLAYWRIGHT || 'C:/Users/bobb9/Desktop/node_modules/playwright');
const gnome = require('./gnome.js');
const SITE = path.join(__dirname, '..', '..'), PORT = Number(process.env.PORT || 4349);
const LOCAL = 'http://localhost:' + PORT, BASE = 'http://knoll.test:' + PORT;

const fails = []; let n = 0;
const ok = (cond, what, extra) => { n++; if (!cond) fails.push(what + (extra ? ' :: ' + String(extra).slice(0, 400) : '')); console.log((cond ? '  ok   ' : '  FAIL ') + what + (!cond && extra ? '   ' + String(extra).slice(0, 300) : '')); return !!cond; };
const j = v => JSON.stringify(v);
const waitPort = (port, tries = 80) => new Promise((res, rej) => { const t = () => { const s = net.connect(port, '127.0.0.1'); s.once('connect', () => { s.end(); res(); }); s.once('error', () => tries-- > 0 ? setTimeout(t, 250) : rej(new Error('port ' + port + ' never opened'))); }; t(); });
const PHONE = { isMobile: true, hasTouch: true, deviceScaleFactor: 2 };

// ── asked of the page ──────────────────────────────────────────────────────
const wider = () => { const d = document.documentElement; return Math.max(d.scrollWidth, document.body.scrollWidth) - d.clientWidth; };
// the boxes of what is fixed to the screen and showing, by name
const furniture = () => {
  const W = document.documentElement.clientWidth, H = innerHeight, out = {};
  for (const [k, s] of [['head', '.lab-head'], ['tools', '.tool-dock'], ['options', '.tool-opts'], ['zoom', '.zoom-dock'], ['keymap', '.keymap'], ['buttons', '.town-fabs'], ['trophy', '.lb-dock'], ['drawer', '.lab-panel:not([hidden])'], ['panel', '.town-panel:not([hidden])']]) {
    const e = document.querySelector(s);
    if (!e || e.hidden || !e.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })) continue;
    const r = e.getBoundingClientRect(); if (r.width < 2 || r.height < 2) continue;
    out[k] = [r.left, r.top, r.right, r.bottom].map(Math.round);
  }
  return { W, H, box: out };
};
const clash = (f, names) => {
  const hit = [], b = f.box, k = names.filter(x => b[x]);
  for (let i = 0; i < k.length; i++) for (let m = i + 1; m < k.length; m++) {
    const A = b[k[i]], B = b[k[m]], w = Math.min(A[2], B[2]) - Math.max(A[0], B[0]), h = Math.min(A[3], B[3]) - Math.max(A[1], B[1]);
    if (w > 1 && h > 1) hit.push(k[i] + ' on ' + k[m] + ' ' + w + '×' + h);
  }
  for (const x of k) { const A = b[x]; if (A[0] < -1 || A[1] < -1 || A[2] > f.W + 1 || A[3] > f.H + 1) hit.push(x + ' off the screen ' + j(A)); }
  return hit;
};
// is the thing itself what a finger meets at its middle (nothing lying over it)?
const onTop = sel => { const e = document.querySelector(sel); if (!e) return 'no ' + sel; const r = e.getBoundingClientRect(), t = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return t && (t === e || e.contains(t)) ? '' : 'under ' + (t ? t.tagName.toLowerCase() + (t.id ? '#' + t.id : '') + '.' + String(t.className).split(' ')[0] : 'nothing') + ' at ' + [r.left, r.top, r.right, r.bottom].map(Math.round); };

(async () => {
  const store = fs.mkdtempSync(path.join(os.tmpdir(), 'knoll-wide-'));
  const srv = spawn(process.execPath, ['-r', path.join(__dirname, 'probe-gate-google.js'), 'serve.js', String(PORT)], { cwd: SITE, env: Object.assign({}, process.env, { GATE_STORE: store, NO_BROWSER: '1' }), stdio: ['ignore', 'pipe', 'pipe'] });
  let log = ''; srv.stdout.on('data', d => log += d); srv.stderr.on('data', d => log += d);
  let b;
  try {
    await waitPort(PORT);
    b = await chromium.launch({ channel: 'chrome', headless: true, args: ['--host-resolver-rules=MAP knoll.test 127.0.0.1'] });
    const errs = [];
    const open = async (w, h, { state, phone } = {}) => {
      const ctx = await b.newContext(Object.assign({ viewport: { width: w, height: h } }, phone === false || w > 900 ? {} : PHONE, state ? { storageState: state } : {}));
      const p = await ctx.newPage();
      p.on('pageerror', e => errs.push(w + '×' + h + ' ' + String(e.message).slice(0, 160)));
      p.go = async url => { await p.goto(BASE + url, { waitUntil: 'load', timeout: 30000 }); await p.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {}); await p.waitForTimeout(1500); };
      p.press = async sel => { await p.locator(sel).first().click({ timeout: 5000 }); await p.waitForTimeout(700); };
      return p;
    };
    const shut = p => p.context().close();

    // ── a gnome through the gate, and a page of their own ───────────────────
    const home = await b.newContext({ viewport: { width: 1280, height: 900 } });
    let p = await home.newPage();
    await p.goto(BASE + '/privacy/', { waitUntil: 'domcontentloaded' });
    const who = { op: 'signup', name: 'Maker', email: 'maker@wide.example', password: 'toadstool1' };
    const post = (url, body) => p.evaluate(([u, x]) => fetch(u, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(x) }).then(r => r.json()), [url, body]);
    await post('/api/auth', who);
    const made = await post('/api/auth', Object.assign({ code: await gnome.code(home, LOCAL, who.email) }, who));
    await p.goto(BASE + '/yard/new/');
    await p.waitForSelector('input[aria-label="page name"]', { timeout: 20000 });
    await p.fill('input[aria-label="page name"]', 'Probe Hollow');
    await p.click('button[role="radio"]:has-text("Council")');
    await p.click('label:has-text("I agree") input');
    await p.click('button:has-text("Create")');
    const stood = await p.waitForSelector('text=Your hill stands at', { timeout: 20000 }).then(() => true, () => false);
    ok(made.ok && stood, 'a gnome is through the gate and has made a page', j(made).slice(0, 200));
    const state = await home.storageState();
    await p.close();

    // ── 1 · no page is wider than its screen ────────────────────────────────
    console.log('\n1 · no page is wider than its screen');
    const PAGES = [['/', 0], ['/login/', 0], ['/signup/', 0], ['/privacy/', 0], ['/terms/', 0], ['/toem2/', 0], ['/ironhive/', 0], ['/probe-hollow', 0], ['/YardView/', 0], ['/nothing-stands-here', 0], ['/no/such/page.html', 0],
      ['/yard/', 1], ['/yard/new/', 1], ['/dashboard/', 1], ['/dashboard/?space=probe-hollow', 1], ['/dashboard/edits/', 1], ['/settings/', 1], ['/settings/?space=probe-hollow', 1], ['/toem2/', 1], ['/probe-hollow', 1]];
    for (const [w, h] of [[320, 568], [390, 844], [768, 1024], [1024, 768], [1440, 900]]) {
      const over = [];
      for (const [url, inn] of PAGES) {
        p = await open(w, h, { state: inn ? state : null });
        try { await p.go(url); const d = await p.evaluate(wider); if (d > 1) over.push(url + (inn ? ' (signed in)' : '') + ' by ' + d); } catch (e) { over.push(url + ' did not open: ' + String(e.message).slice(0, 80)); }
        await shut(p);
      }
      ok(!over.length, 'at ' + w + ' wide, none of the ' + PAGES.length + ' pages is wider than the screen', over.join(' · '));
    }

    // ── 2 · the walls' furniture stands clear ───────────────────────────────
    console.log('\n2 · what is fixed to the screen stands clear of the rest');
    const TEN = ['#e8474c', '#ffd23f', '#76c15f', '#5b8fd6', '#de5a8c', '#c63b82', '#5871f5', '#2fae74', '#f5941f', '#17120b'];
    const REST = ['head', 'tools', 'zoom', 'buttons', 'trophy'];
    for (const [w, h] of [[360, 640], [390, 844], [568, 320], [667, 375], [768, 1024], [1024, 768], [1210, 800], [1211, 800], [1280, 720], [1440, 900]]) {
      const bad = [];
      for (const [name, url, inn] of [['the front page', '/', 0], ['TOEM 2', '/toem2/', 1], ['a space', '/probe-hollow', 1]]) {
        p = await open(w, h, { state: inn ? state : null });
        await p.go(url);
        let hit = clash(await p.evaluate(furniture), REST);
        if (hit.length) bad.push(name + ': ' + hit.join(', '));
        if (name === 'a space') {   // …and with the most inks a space may choose
          await p.evaluate(inks => { if (window.Wall && Wall.setInks) Wall.setInks(inks); }, TEN);
          await p.waitForTimeout(500);
          hit = clash(await p.evaluate(furniture), REST);
          if (hit.length) bad.push(name + ' with ten inks: ' + hit.join(', '));
          if (w >= 701) { const d = (await p.evaluate(furniture)).box.tools; if (d && d[2] - d[0] > 700) bad.push('ten inks make the dock ' + (d[2] - d[0]) + ' across'); }
        }
        await shut(p);
      }
      ok(!bad.length, 'at ' + w + '×' + h + ' the tools, the zoom, the corner\'s buttons, the trophy and the header stand clear, on the three walls', bad.join(' · '));
    }

    // ── 3 · what opens ──────────────────────────────────────────────────────
    console.log('\n3 · what opens, opens where it can be read and put away');
    for (const [w, h] of [[390, 844], [667, 375], [1024, 768], [1280, 720]]) {
      p = await open(w, h, { state });
      await p.go('/toem2/');
      await p.press('#zoom-keys');
      let f = await p.evaluate(furniture);
      ok(f.box.keymap && !clash(f, ['keymap', 'head', 'tools', 'trophy', 'buttons']).length, 'at ' + w + '×' + h + ' the keymap is on the screen, under the header and over none of the tools, the buttons or the trophy', j(clash(f, ['keymap', 'head', 'tools', 'trophy', 'buttons'])) + ' ' + j(f.box.keymap));
      await p.press('#zoom-keys');
      await p.press('.tool-dock [data-tool="sticker"]');
      f = await p.evaluate(furniture);
      ok(f.box.drawer && f.box.options && !clash(f, ['drawer', 'tools', 'options']).length, '…the sticker drawer stands clear of the tools and of the row of sizes that goes with it', j(clash(f, ['drawer', 'tools', 'options'])) + ' ' + j(f.box));
      ok(!(await p.evaluate(onTop, '.lab-panel:not([hidden]) .lp-x')), '…and its ✕ is under the finger', await p.evaluate(onTop, '.lab-panel:not([hidden]) .lp-x'));
      await p.press('.tool-dock [data-tool="move"]');
      for (const [btn, panel] of [['#town-chat-btn', '#town-chat'], ['#ranks-btn', '#ranks-panel']]) {
        await p.press(btn);
        f = await p.evaluate(furniture);
        const under = await p.evaluate(onTop, panel + ' .town-close'), inside = await p.evaluate(sel => { const e = document.querySelector(sel), pr = e.getBoundingClientRect(); return [...e.querySelectorAll('input, .town-send')].filter(x => x.checkVisibility()).every(x => { const r = x.getBoundingClientRect(); return r.bottom <= pr.bottom + 1 && r.right <= pr.right + 1; }); }, panel);
        ok(f.box.panel && !clash(f, ['panel', 'tools']).length && !under && inside, '…' + panel + ' is on the screen and clear of the tools, its ✕ under the finger, and what is typed in it inside it', j(clash(f, ['panel', 'tools'])) + ' ' + under + ' ' + j(f.box.panel));
        await p.press(panel + ' .town-close');
      }
      await shut(p);
    }
    p = await open(390, 844, { state });
    await p.go('/toem2/');
    await p.press('#knoll-account .ka-lens');
    ok(!(await p.evaluate(onTop, '#knoll-account .ka-hits li:nth-child(3) a')), 'on a phone what the search finds hangs OVER the corner\'s buttons and the zoom dock, not behind them', await p.evaluate(onTop, '#knoll-account .ka-hits li:nth-child(3) a'));
    await p.keyboard.press('Escape');
    await p.press('#toem-chaos');
    ok(!(await p.evaluate(onTop, '#toem-chaos-pop')), '…and so does what the stamp says', await p.evaluate(onTop, '#toem-chaos-pop'));
    await shut(p);

    // ── 4 · the gate on a phone ─────────────────────────────────────────────
    console.log('\n4 · the gate on a phone');
    for (const w of [320, 360]) {
      p = await open(w, 640);
      await p.go('/login/');
      await p.waitForTimeout(2500);   // the scroll unrolls and swings once: measured at rest
      const g = await p.evaluate(() => {
        const W = document.documentElement.clientWidth, words = [...document.querySelectorAll('#dc-root div')].find(d => !d.children.length || /^By logging in/.test(d.textContent.trim()) && d.querySelector('a') && !d.querySelector('div'));
        const by = [...document.querySelectorAll('#dc-root div')].filter(d => /^By logging in/.test(d.textContent.trim())).pop();
        const knobs = [...document.querySelectorAll('#dc-root div')].filter(d => { const s = d.style; return s.borderRadius === '50%' && s.width === '22px' && s.position === 'absolute'; }).map(d => d.getBoundingClientRect()).map(r => [Math.round(r.left), Math.round(r.right)]);
        return { W, by: by ? Math.round(by.getBoundingClientRect().width) : 0, lines: by ? Math.round(by.getBoundingClientRect().height / parseFloat(getComputedStyle(by).lineHeight || 20)) : 0, knobs };
      });
      ok(g.by >= 200, 'at ' + w + ' the words by the lock have a column to be read in (' + g.by + ' wide)', j(g));
      ok(g.knobs.length >= 4 && g.knobs.every(k => k[0] >= 0 && k[1] <= g.W), '…and the scroll\'s rollers, knobs and all, are inside the screen', j(g.knobs) + ' in ' + g.W);
      await shut(p);
      p = await open(w, 640);
      await p.go('/signup/');
      await p.press('button[aria-label="Sign up"]');
      const notes = await p.evaluate(() => { const W = document.documentElement.clientWidth; return ['e-name', 'e-email', 'e-pw'].map(id => { const e = document.querySelector('#dc-root #' + id); if (!e) return id + ' missing'; const r = e.getBoundingClientRect(); return r.left >= 0 && r.right <= W && r.width >= 150 ? '' : id + ' ' + Math.round(r.left) + '…' + Math.round(r.right); }).filter(Boolean); });
      ok(!notes.length, '…a sign-up\'s notes stand under their fields, inside the screen', j(notes));
      ok((await p.evaluate(wider)) <= 1, '…and the page with them up is no wider than the screen');
      await shut(p);
    }

    // ── 5 · the dashboard's two cards ───────────────────────────────────────
    console.log('\n5 · the dashboard on a phone');
    p = await open(390, 844, { state });
    await p.go('/dashboard/');
    const two = await p.evaluate(() => [...document.querySelectorAll('#dc-root .dash-two > *')].map(e => Math.round(e.getBoundingClientRect().width)));
    ok(two.length === 2 && two.every(x => x >= 250), 'the trend and where they came from stand one over the other, each the width of the page', j(two));
    await shut(p);

    // ── 6 · the yard ────────────────────────────────────────────────────────
    console.log('\n6 · the yard on a phone');
    p = await open(390, 844, { state });
    await p.go('/yard/');
    const skip = p.locator('#dc-root button:visible, #dc-root a:visible').filter({ hasText: /skip tour/i }).first();
    if (await skip.count()) { await skip.click(); await p.waitForTimeout(500); }
    await p.evaluate(() => scrollTo(0, document.documentElement.scrollHeight)); await p.waitForTimeout(500);
    const foot = await p.evaluate(() => { const d = document.querySelector('.tool-dock').getBoundingClientRect(); const last = [...document.querySelectorAll('#dc-root section, #dc-root .yard-ui')].map(e => e.getBoundingClientRect()).filter(r => r.height > 20).reduce((m, r) => Math.max(m, r.bottom), 0); return { dock: Math.round(d.top), last: Math.round(last) }; });
    ok(foot.last > 0 && foot.last <= foot.dock, 'scrolled to its end, the last card is clear of the dock', j(foot));
    await p.evaluate(() => scrollTo(0, 0));
    await p.press('#dc-root button[aria-label*="settings" i], #dc-root button[title*="settings" i]');
    const out = await p.evaluate(() => { const d = document.querySelector('#dc-root [role="dialog"][aria-label="settings"]'); if (!d) return 'no drawer'; d.scrollTop = d.scrollHeight; const b = [...d.querySelectorAll('button')].pop(), r = b.getBoundingClientRect(), t = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return t && (t === b || b.contains(t)) ? '' : 'its last button is under ' + (t ? t.tagName.toLowerCase() + '.' + String(t.className).split(' ')[0] : 'nothing'); });
    ok(!out, 'the settings drawer stands over the dock: its last button is under the finger', out);
    await p.keyboard.press('Escape');
    await shut(p);
    p = await open(390, 844, { state });
    await p.go('/yard/');
    if (await p.locator('#dc-root button:visible, #dc-root a:visible').filter({ hasText: /skip tour/i }).first().count()) { await p.locator('#dc-root button:visible, #dc-root a:visible').filter({ hasText: /skip tour/i }).first().click(); await p.waitForTimeout(500); }
    await p.press('.tool-dock [data-tool="sticker"]');
    const yf = await p.evaluate(furniture);
    ok(yf.box.drawer && yf.box.options && !clash(yf, ['drawer', 'tools', 'options']).length, 'its sticker drawer stands clear of the tools and their options', j(clash(yf, ['drawer', 'tools', 'options'])) + ' ' + j(yf.box));
    await shut(p);

    // ── 7 · an address nothing stands at ────────────────────────────────────
    console.log('\n7 · an address nothing stands at');
    p = await open(360, 640);
    await p.go('/coming-soon');
    const crumb = await p.evaluate(() => { const c = document.getElementById('crumb'); return c ? { w: Math.round(c.getBoundingClientRect().width), all: c.scrollWidth <= c.clientWidth + 1, t: c.textContent } : null; });
    ok(crumb && crumb.all && crumb.t === 'coming-soon', 'on a phone the bar says the whole of the address asked for', j(crumb));
    await shut(p);

    // ── 8 · the ballot's ✕ ──────────────────────────────────────────────────
    console.log('\n8 · the ballot on the narrowest phone');
    p = await open(320, 568, { state });
    await p.go('/probe-hollow');
    await p.press('#toem-ballot');
    const x = await p.evaluate(() => { const e = document.getElementById('bo-x'); if (!e) return null; const r = e.getBoundingClientRect(); return { r: Math.round(r.right), W: document.documentElement.clientWidth }; });
    ok(x && x.r <= x.W && !(await p.evaluate(onTop, '#bo-x')), 'its ✕ is on the screen and under the finger', j(x));
    await shut(p);

    ok(!errs.length, 'no page threw', errs.slice(0, 5).join(' · '));
  } catch (e) {
    ok(false, 'the probe ran to its end', e && e.stack ? e.stack.split('\n').slice(0, 4).join(' | ') : e);
    console.log(log.slice(-1500));
  } finally {
    if (b) await b.close().catch(() => {});
    srv.kill();
    try { fs.rmSync(store, { recursive: true, force: true }); } catch (e) {}
  }
  console.log('\nprobe-responsive: ' + n + ' checks' + (fails.length ? ', ' + fails.length + ' FAILED' : ', all passed'));
  fails.forEach(f => console.log('  ✗ ' + f));
  process.exit(fails.length ? 1 : 0);
})();
