#!/usr/bin/env node
// /lab2 in headless Chrome on the safe server (bench doors 404'd, so nothing autosaves):
// the dock has a Redo button; a feature dragged 60px comes back with undo and goes again
// with redo (Lab.snapshot/restore through wall.js's redo); a stroke does the same.
const { spawn } = require('child_process');
const net = require('net');
const path = require('path');
const { chromium } = require(process.env.PLAYWRIGHT || 'C:/Users/bobb9/Desktop/node_modules/playwright');
const SITE = path.join(__dirname, '..', '..'), PORT = 4327, BASE = 'http://localhost:' + PORT;
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
    for (const page of ['/lab2/', '/toem2/', '/ironhive/', '/lab/']) {
      await p.goto(BASE + page); await p.waitForTimeout(3500);
      const dock = await p.evaluate(() => ({ undo: !!document.querySelector('#dock-undo'), redo: !!document.querySelector('#dock-redo'), redoTitle: (document.querySelector('#dock-redo') || {}).title, next: (document.querySelector('#dock-undo') || {}).nextElementSibling === document.querySelector('#dock-redo') }));
      ok(dock.undo && dock.redo && dock.next, page + ' dock has Redo right beside Undo', JSON.stringify(dock));
    }
    await p.goto(BASE + '/lab2/'); await p.waitForTimeout(3500);
    // a feature below the page header (the header covers the top ~340px), dragged by its handle or itself
    const feat = await p.evaluate(() => {
      const els = [...document.querySelectorAll('[data-gizmo]')].filter(el => !el.hidden);
      for (const el of els) {
        const h = el.querySelector('[data-handle]') || el, r = h.getBoundingClientRect();
        if (r.width > 20 && r.height > 10 && r.top > 360 && r.bottom < window.innerHeight - 40 && r.left > 20 && r.right < window.innerWidth - 20)
          return { id: el.dataset.gizmo, x: r.left + Math.min(r.width / 2, 40), y: r.top + Math.min(r.height / 2, 12), left: el.style.left };
      }
      return null;
    });
    ok(!!feat, 'a feature with a reachable handle is on screen', JSON.stringify(feat));
    if (feat) {
      const leftOf = () => p.evaluate(id => document.querySelector('[data-gizmo="' + id + '"]').style.left, feat.id);
      await p.mouse.move(feat.x, feat.y); await p.mouse.down();
      for (let i = 1; i <= 8; i++) { await p.mouse.move(feat.x + i * 10, feat.y); await p.waitForTimeout(20); }
      await p.mouse.up(); await p.waitForTimeout(400);
      const moved = await leftOf();
      const dx = parseFloat(moved) - parseFloat(feat.left || 0);
      ok(dx > 30, 'the feature was carried right (' + feat.left + ' → ' + moved + ')');
      if (dx > 30) {
        await p.keyboard.press('Control+z'); await p.waitForTimeout(400);
        ok(await leftOf() === feat.left, 'ctrl+z puts the feature back', await leftOf());
        await p.keyboard.press('Control+Shift+z'); await p.waitForTimeout(400);
        ok(await leftOf() === moved, 'ctrl+shift+z carries it again', await leftOf());
        await p.click('#dock-undo'); await p.waitForTimeout(400);
        ok(await leftOf() === feat.left, 'the Undo button puts it back', await leftOf());
        await p.click('#dock-redo'); await p.waitForTimeout(400);
        ok(await leftOf() === moved, 'the Redo button carries it again', await leftOf());
        await p.keyboard.press('Control+z'); await p.waitForTimeout(400);
        ok(await leftOf() === feat.left, 'and undo takes the redo back', await leftOf());
      }
    }
    // a stroke on the bench: undo, redo
    await p.click('#tool-dock [data-tool="draw"]'); await p.waitForTimeout(200);
    const c0 = await p.evaluate(() => Wall.store.get().items.filter(Boolean).length);
    const bare = await p.evaluate(() => {   // on a bench the ink lies under the features, so a stroke starts on bare paper
      for (let y = 380; y < window.innerHeight - 60; y += 40) for (let x = 60; x < window.innerWidth - 60; x += 40) {
        const e = document.elementFromPoint(x, y); if (e && e.closest('.wall-ink')) return { x, y };
      } return null;
    });
    ok(!!bare, 'bare paper is reachable for a stroke', JSON.stringify(bare));
    const sx = bare ? bare.x : 700, sy = bare ? bare.y : 600;
    await p.mouse.move(sx, sy); await p.mouse.down(); for (let i = 1; i <= 6; i++) { await p.mouse.move(sx + i * 8, sy + (i % 2) * 6); await p.waitForTimeout(16); } await p.mouse.up(); await p.waitForTimeout(200);
    const cnt = () => p.evaluate(() => Wall.store.get().items.filter(Boolean).length);
    ok(await cnt() === c0 + 1, 'a stroke lands on the bench');
    await p.keyboard.press('Control+z'); await p.waitForTimeout(200);
    ok(await cnt() === c0, 'ctrl+z takes it off', await cnt());
    await p.keyboard.press('Control+y'); await p.waitForTimeout(200);
    ok(await cnt() === c0 + 1, 'ctrl+y puts it back', await cnt());
    // ── lab 2's sticker tool moves a piece too (the referee ported 2026-09-24) ──
    await p.click('#tool-dock [data-tool="sticker"]'); await p.waitForTimeout(300);
    ok(await p.evaluate(() => document.querySelector('.wall-ink').classList.contains('wall-holdable') && getComputedStyle(document.querySelector('.wall-ink path.wall-item')).pointerEvents === 'auto'), 'with the sticker tool up the pieces answer the pointer');
    const far = await p.evaluate(() => { for (let y = 380; y < window.innerHeight - 60; y += 40) for (let x = 720; x < window.innerWidth - 60; x += 40) { const e = document.elementFromPoint(x, y); if (e && e.closest('.wall-ink')) return { x, y }; } return null; });
    ok(!!far, 'bare paper to the right of the sticker drawer', JSON.stringify(far));
    await p.click('#tool-dock [data-tool="draw"]'); await p.waitForTimeout(150);
    await p.mouse.move(far.x, far.y); await p.mouse.down(); for (let i = 1; i <= 6; i++) { await p.mouse.move(far.x + i * 8, far.y + (i % 2) * 6); await p.waitForTimeout(16); } await p.mouse.up(); await p.waitForTimeout(200);
    await p.click('#tool-dock [data-tool="sticker"]'); await p.waitForTimeout(300);
    const sp = await p.evaluate(() => { const r = [...document.querySelectorAll('.wall-ink path.wall-item')].pop().getBoundingClientRect(); return { l: Math.round(r.left), x: r.left + 4, y: r.top + 3, under: (document.elementFromPoint(r.left + 4, r.top + 3) || {}).tagName }; });
    ok(sp.under === 'path', 'the press point is the piece itself, not the drawer', JSON.stringify(sp));
    await p.mouse.move(sp.x, sp.y); await p.mouse.down(); for (let i = 1; i <= 6; i++) { await p.mouse.move(sp.x + i * 10, sp.y); await p.waitForTimeout(16); } await p.mouse.up(); await p.waitForTimeout(300);
    const spl = await p.evaluate(() => Math.round([...document.querySelectorAll('.wall-ink path.wall-item')].pop().getBoundingClientRect().left));
    ok(spl - sp.l >= 50, 'a drag on a piece with the sticker tool carries it (' + sp.l + ' → ' + spl + ')');
    ok(await cnt() === c0 + 2, '…and stamps nothing', await cnt());
    ok(pageErrors.length === 0, 'no uncaught page errors', pageErrors.join(' | ').slice(0, 300));
  } catch (e) { fails.push('CRASH ' + (e && e.stack || e)); }
  if (b) await b.close().catch(() => {});
  srv.kill();
  console.log('\nprobe-bench-redo: ' + n + ' checks, ' + (fails.length ? fails.length + ' FAILED\n - ' + fails.join('\n - ') : 'all good'));
  if (fails.length) { console.log('\nserver log tail:\n' + log.slice(-800)); process.exit(1); }
})();
