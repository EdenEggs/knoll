#!/usr/bin/env node
/* probe-note-cap.js — the text tool's box on every bench, in headless Chrome
   on the safe server (2026-09-27): nothing hangs under the box any more, and
   how many characters it holds goes by the size — a hundred at the smallest,
   twenty at the biggest, a straight line between (wall.js: capAt). Typing and
   pasting stop at the count, A+ will not take the words to a size that would
   not hold them, and — where a link pins as a film — a youtube address goes in
   whole at any size. The old lab writes at one size, so it holds what that
   size holds.

     node lab2/perf/probe-note-cap.js          (needs Chrome + Playwright) */
'use strict';
const { spawn } = require('child_process');
const net = require('net');
const path = require('path');
const { chromium } = require(process.env.PLAYWRIGHT || 'C:/Users/bobb9/Desktop/node_modules/playwright');
const gnome = require('./gnome.js');
const SITE = path.join(__dirname, '..', '..'), PORT = 4328, BASE = 'http://localhost:' + PORT;
const CAPS = [100, 91, 82, 73, 64, 56, 47, 38, 29, 20], TSZ = [12, 14, 16, 18, 22, 28, 36, 48, 64, 88];
const LINK = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
const fails = []; let n = 0;
const ok = (c, what, extra) => { n++; if (!c) fails.push(what + (extra ? ' :: ' + String(extra).slice(0, 400) : '')); console.log((c ? '  ok   ' : '  FAIL ') + what); };
const waitPort = (port, tries = 80) => new Promise((res, rej) => { const t = () => { const s = net.connect(port, '127.0.0.1'); s.once('connect', () => { s.end(); res(); }); s.once('error', () => tries-- > 0 ? setTimeout(t, 250) : rej(new Error('port never opened'))); }; t(); });

(async () => {
  const srv = spawn(process.execPath, ['-r', path.join(SITE, 'lab2/perf/probe-gate-google.js'), 'serve.js', String(PORT)], { cwd: SITE, stdio: ['ignore', 'pipe', 'pipe'] });
  let log = ''; srv.stdout.on('data', d => log += d); srv.stderr.on('data', d => log += d);
  let b;
  try {
    await waitPort(PORT);
    b = await chromium.launch({ channel: 'chrome', headless: true });
    const ctx = await b.newContext({ viewport: { width: 1500, height: 1000 } });
    const p = await ctx.newPage();
    const pageErrors = []; p.on('pageerror', e => pageErrors.push(String(e)));
    await gnome.signIn(ctx, BASE);                 // the yard is a signed-in account's page

    const box = () => p.evaluate(() => {
      const i = document.querySelector('.wall-note-in'), l = document.querySelector('.wall-note-left');
      return i ? { len: i.value.length, px: i.style.fontSize, left: l ? l.textContent : null, low: !!l && l.classList.contains('wall-note-low'),
                   hint: !!document.querySelector('.wall-note-hint'), max: i.maxLength, kids: document.querySelector('.wall-note').children.length } : null;
    });
    const key = async (k, times) => { for (let i = 0; i < (times || 1); i++) await p.keyboard.press(k); await p.waitForTimeout(120); };
    const clear = async () => { await key('Control+a'); await key('Delete'); };
    // the text tool, then a tap on bare paper: on a bench the ink lies under the features, and the header covers the top
    const open = async page => {
      await p.goto(BASE + page); await p.waitForTimeout(3500);
      await p.keyboard.press('Escape');            // the yard's tour, a drawer — whatever stands over the paper
      await p.click('#tool-dock [data-tool="text"]'); await p.waitForTimeout(300);
      const at = await p.evaluate(() => {
        for (let y = 400; y < window.innerHeight - 160; y += 40) for (let x = 500; x < window.innerWidth - 200; x += 40) {
          const e = document.elementFromPoint(x, y); if (e && e.closest('.wall-ink')) return { x, y };
        } return null;
      });
      if (!at) return false;
      await p.mouse.click(at.x, at.y); await p.waitForTimeout(400);
      return !!(await box());
    };

    for (const [page, film] of [['/lab2/', false], ['/toem2/', true], ['/ironhive/', true], ['/yard/', true]]) {
      const up = await open(page);
      ok(up, page + ': the text tool puts a box on the paper');
      if (!up) continue;
      let s = await box();
      ok(!s.hint && s.kids === 3, page + ': nothing hangs under the box — it is the words, the grip and the count', JSON.stringify(s));
      ok(s.px === '22px' && s.left === '64 left', page + ': a note at 22 holds 64', JSON.stringify(s));
      await p.keyboard.type('x'.repeat(70)); await p.waitForTimeout(200); s = await box();
      ok(s.len === 64 && s.left === '0 left' && s.low, page + ': seventy typed, sixty-four kept', JSON.stringify(s));
      await key('Control+]'); s = await box();
      ok(s.px === '22px' && s.len === 64 && s.left === 'too many characters to go bigger', page + ': sixty-four characters will not go up to 28, and the count says why', JSON.stringify(s));
      await p.keyboard.press('Backspace'); await p.waitForTimeout(120); s = await box();
      ok(s.len === 63 && s.left === '1 left', page + ': …and the count is a count again at the next key', JSON.stringify(s));
      await key('Control+[', 4); s = await box();
      ok(s.px === '12px' && s.left === '37 left', page + ': at 12 the same words have 37 to spare (a hundred in all)', JSON.stringify(s));
      await clear();
      const seen = [];
      for (let z = 0; z < TSZ.length; z++) { s = await box(); seen.push([s.px, s.left].join(' ')); await key('Control+]'); }
      ok(seen.join() === TSZ.map((px, z) => px + 'px ' + CAPS[z] + ' left').join(), page + ': the ten sizes hold 100 91 82 73 64 56 47 38 29 20', seen.join());
      await p.keyboard.insertText('y'.repeat(30)); await p.waitForTimeout(200); s = await box();   // all at once, the way a paste arrives
      ok(s.px === '88px' && s.len === 20 && s.left === '0 left', page + ': at 88, thirty pasted are cut to twenty', JSON.stringify(s));
      await key('ArrowLeft', 5); await p.keyboard.type('zz'); await p.waitForTimeout(200);
      ok(await p.evaluate(() => { const i = document.querySelector('.wall-note-in'); return i.value === 'y'.repeat(20) && i.selectionEnd === 15; }), page + ': a full box takes nothing more, and the caret stays where it was');
      await clear();
      await p.keyboard.insertText(LINK); await p.waitForTimeout(200); s = await box();
      if (film) {
        ok(s.len === LINK.length && s.left === (100 - LINK.length) + ' left', page + ': a youtube address goes in whole at 88', JSON.stringify(s));
        const had = await p.evaluate(() => Wall.store.get().items.filter(Boolean).length);
        await key('Enter'); await p.waitForTimeout(300);
        const last = await p.evaluate(() => { const it = Wall.store.get().items.filter(Boolean); return { n: it.length, k: it[it.length - 1].k, id: it[it.length - 1].id }; });
        ok(last.n === had + 1 && last.k === 'v' && last.id === 'dQw4w9WgXcQ', page + ': …and pins as the film', JSON.stringify(last));
        await key('Control+z');
      } else {
        ok(s.len === 20, page + ': no films on this bench, so an address is twenty characters like anything else', JSON.stringify(s));
        await key('Escape');
      }
      await p.waitForTimeout(200);
      ok(!(await box()), page + ': the box is put away');
    }

    // the old lab: one size, no count
    await p.goto(BASE + '/lab/'); await p.waitForTimeout(3500);
    await p.click('#tool-dock [data-tool="text"]'); await p.waitForTimeout(300);
    const at = await p.evaluate(() => {          // this bench is laid out edge to edge: bare paper is wherever it is
      for (let y = 140; y < window.innerHeight - 120; y += 20) for (let x = 20; x < window.innerWidth - 20; x += 20) {
        const e = document.elementFromPoint(x, y); if (e && e.closest('.wall-ink')) return { x, y };
      } return null;
    });
    if (at) { await p.mouse.click(at.x, at.y); await p.waitForTimeout(400); }
    const old = await box();
    ok(!!old && !old.hint && old.max === 64, '/lab/: nothing under the box, and it holds what 22 holds', JSON.stringify(old));
    await p.keyboard.press('Escape');

    ok(pageErrors.length === 0, 'no uncaught page errors along the way', pageErrors.join(' | '));
  } catch (e) { fails.push('CRASH ' + (e && e.stack || e)); }
  if (b) await b.close().catch(() => {});
  srv.kill();
  console.log('\nprobe-note-cap: ' + n + ' checks, ' + (fails.length ? fails.length + ' FAILED\n - ' + fails.join('\n - ') : 'all good'));
  if (fails.length) { console.log('\nserver log tail:\n' + log.slice(-1500)); process.exit(1); }
})();
