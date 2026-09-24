#!/usr/bin/env node
// /yard in headless Chrome, signed in on a safe server (lab2/perf/probe-gate-google.js as the
// preload: temp store, 404'd bench doors): with the draw tool live the pointer falls through
// the cards to the ink layer, a stroke started on a card is drawn, the UI wrappers stand
// above the world (z 13/14 over 12), the plot board stays under it, and in move mode the
// cards take the pointer again. Also: the save after a stroke lands (no "not saved").
const { spawn } = require('child_process');
const net = require('net');
const path = require('path');
const { chromium } = require(process.env.PLAYWRIGHT || 'C:/Users/bobb9/Desktop/node_modules/playwright');
const SITE = path.join(__dirname, '..', '..'), PORT = 4326, BASE = 'http://localhost:' + PORT;
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
    const ctx = await b.newContext({ viewport: { width: 1400, height: 1000 } });
    const p = await ctx.newPage();
    const pageErrors = []; p.on('pageerror', e => pageErrors.push(String(e)));
    await p.goto(BASE + '/login/');
    const su = await p.evaluate(() => fetch('/api/auth', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ op: 'signup', name: 'Inky', email: 'inky@example.com', password: 'toadstool1' }) }).then(r => r.json()));
    ok(su.ok, 'a test account signs up', JSON.stringify(su));
    await p.goto(BASE + '/yard/'); await p.waitForTimeout(4000);
    const tools = await p.evaluate(() => [...document.querySelectorAll('#tool-dock [data-tool]')].map(b => b.dataset.tool));
    ok(tools.includes('draw') && tools.includes('move'), 'the dock offers draw and move', tools.join(','));
    const since = await p.evaluate(() => { const k = [...document.querySelectorAll('div')].find(d => d.textContent.trim() === 'MEMBER SINCE'); return k ? k.previousElementSibling.textContent.trim() : null; });
    ok(/^\d{1,2} [A-Z][a-z]{2} \d{4}$/.test(since || ''), 'the standing card records the full member-since date', since);
    const z = await p.evaluate(() => ({ world: getComputedStyle(document.querySelector('.yard-world')).zIndex, ui: [...document.querySelectorAll('.yard-ui')].map(e => getComputedStyle(e).zIndex), uiCount: document.querySelectorAll('.yard-ui').length, board: getComputedStyle(document.querySelector('.plot-yard').parentElement).zIndex }));
    ok(z.world === '12' && z.uiCount >= 7 && z.ui.every(v => +v >= 13), 'the UI wrappers stand above the world (z 13+ over 12)', JSON.stringify(z));
    ok(z.board === 'auto', 'the plot board stays under the world', z.board);
    // where the "Your standing" card is
    const card = await p.evaluate(() => { const h = [...document.querySelectorAll('h2')].find(e => /Your standing/.test(e.textContent)); const r = h.closest('section').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
    const under = (x, y) => p.evaluate(([x, y]) => { const e = document.elementFromPoint(x, y); if (!e) return 'none'; if (e.closest('.wall-ink')) return 'wall-ink'; return e.tagName.toLowerCase() + (typeof e.className === 'string' && e.className ? '.' + e.className.split(' ').join('.') : ''); }, [x, y]);
    ok(!/wall-ink/.test(await under(card.x, card.y)), 'in move mode the card takes the pointer', await under(card.x, card.y));
    await p.click('#tool-dock [data-tool="draw"]'); await p.waitForTimeout(300);
    ok(await p.evaluate(() => document.querySelector('.wall-ink').classList.contains('wall-live')), 'the draw tool makes the ink layer live');
    ok(/wall-ink/.test(await under(card.x, card.y)), 'with draw live the pointer falls through the card to the ink layer', await under(card.x, card.y));
    const paths0 = await p.evaluate(() => document.querySelectorAll('.wall-ink path').length);
    await p.mouse.move(card.x - 40, card.y); await p.mouse.down();
    for (let i = 1; i <= 12; i++) { await p.mouse.move(card.x - 40 + i * 30, card.y + Math.sin(i) * 20); await p.waitForTimeout(16); }
    await p.mouse.up(); await p.waitForTimeout(400);
    const paths1 = await p.evaluate(() => document.querySelectorAll('.wall-ink path').length);
    ok(paths1 > paths0, 'a stroke started on the card is drawn (' + paths0 + ' → ' + paths1 + ' paths)');
    const gn = await p.evaluate(() => { const r = document.querySelector('.yard-ui[role=button]').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
    ok(/wall-ink/.test(await under(gn.x, gn.y)), 'the gnome lets the pointer through too while drawing', await under(gn.x, gn.y));
    await p.click('#tool-dock [data-tool="move"]'); await p.waitForTimeout(300);
    ok(!/wall-ink/.test(await under(card.x, card.y)), 'back in move mode the card takes the pointer again', await under(card.x, card.y));
    ok(!/wall-ink/.test(await under(gn.x, gn.y)), '…and the gnome is clickable (it stands above the ink now)', await under(gn.x, gn.y));
    await p.waitForTimeout(2500);
    const t = await p.evaluate(() => document.body.innerText);
    ok(!/not saved:/.test(t), 'the save after the stroke landed (no "not saved" banner)', (t.match(/not saved:[^\n]*/) || [''])[0]);
    // ── the band: with the move tool, a drag on bare paper picks what it touches ──
    const BUSY = '.yard-ui,.tool-dock,.tool-opts,.lab-panel,.lab-warn,.knoll-head,.wall-item,.wall-note,.wall-video,.plot-piece,a,button,input,textarea,select,label,summary,[contenteditable],[role=button],[role=dialog],[data-handle]';
    const bp = await p.evaluate(BUSY => { const r = document.querySelector('.plot-yard').getBoundingClientRect();
      for (let fy = 0.1; fy <= 0.5; fy += 0.1) for (let fx = 0.1; fx <= 0.6; fx += 0.1) { const x = r.left + r.width * fx, y = r.top + r.height * fy; const e = document.elementFromPoint(x, y); if (e && !e.closest(BUSY)) return { x, y }; } return null; }, BUSY);
    ok(!!bp, 'a bare spot on the plot board exists to start a band from', JSON.stringify(bp));
    await p.click('#tool-dock [data-tool="draw"]'); await p.waitForTimeout(200);
    const stroke = async (x, y) => { await p.mouse.move(x, y); await p.mouse.down(); for (let i = 1; i <= 6; i++) { await p.mouse.move(x + i * 8, y + (i % 2) * 6); await p.waitForTimeout(16); } await p.mouse.up(); await p.waitForTimeout(200); };
    await stroke(bp.x + 30, bp.y + 30); await stroke(bp.x + 120, bp.y + 70);
    ok(await p.evaluate(() => Wall.store.get().items.filter(Boolean).length) >= 3, 'three strokes on the page');
    await p.click('#tool-dock [data-tool="move"]'); await p.waitForTimeout(200);
    await p.mouse.move(bp.x, bp.y); await p.mouse.down();
    for (let i = 1; i <= 10; i++) { await p.mouse.move(bp.x + i * 20, bp.y + i * 12); await p.waitForTimeout(16); }
    ok(await p.evaluate(() => { const b = document.querySelector('.lab-band'); return !!b && !b.hidden && b.getBoundingClientRect().width > 100 && document.body.classList.contains('lab-banding'); }), 'the band is drawn while dragging bare paper');
    await p.mouse.up(); await p.waitForTimeout(200);
    const pickedN = () => p.evaluate(() => document.querySelectorAll('.wall-ink .wall-picked').length);
    ok(await pickedN() === 2, 'the two strokes the band touched are picked', await pickedN());
    const rects = () => p.evaluate(() => [...document.querySelectorAll('.wall-ink .wall-picked')].map(n => { const r = n.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top)]; }));
    const r0 = await rects();
    await p.mouse.move(bp.x + 34, bp.y + 33); await p.mouse.down();   // on the first stroke's first segment
    for (let i = 1; i <= 6; i++) { await p.mouse.move(bp.x + 34 + i * 10, bp.y + 33); await p.waitForTimeout(16); }
    await p.mouse.up(); await p.waitForTimeout(300);
    const r1 = await rects();
    ok(r1.length === 2 && r1.every((r, i) => Math.abs(r[0] - r0[i][0] - 60) <= 4 && Math.abs(r[1] - r0[i][1]) <= 4), 'dragging one picked stroke carries both, 60px right', JSON.stringify([r0, r1]));
    await p.mouse.click(bp.x, bp.y); await p.waitForTimeout(200);
    ok(await pickedN() === 0, 'a click on bare paper puts the pick down', await pickedN());
    await p.mouse.move(card.x, card.y); await p.mouse.down(); await p.mouse.move(card.x + 60, card.y + 60); await p.waitForTimeout(60);
    ok(await p.evaluate(() => document.querySelector('.lab-band').hidden), 'a drag that starts on a card is not a band'); await p.mouse.up();
    await p.mouse.move(bp.x, bp.y); await p.mouse.down(); for (let i = 1; i <= 10; i++) { await p.mouse.move(bp.x + i * 26, bp.y + i * 12); await p.waitForTimeout(16); } await p.mouse.up(); await p.waitForTimeout(200);
    ok(await pickedN() === 2, 'a second band picks them again', await pickedN());
    await p.keyboard.press('Escape'); await p.waitForTimeout(150);
    ok(await pickedN() === 0, 'Escape puts the pick down', await pickedN());
    ok(await p.evaluate(() => getComputedStyle(document.body).cursor !== 'crosshair' && !document.body.classList.contains('lab-banding') && document.querySelector('.lab-band').hidden), 'the band left nothing behind (no crosshair, no banding class, band hidden)');
    // ── redo: the other button, the keys, and a new mark emptying the pile ──
    const count = () => p.evaluate(() => Wall.store.get().items.filter(Boolean).length);
    await p.click('#tool-dock [data-tool="draw"]'); await p.waitForTimeout(150);   // so the last thing done is a stroke, not the band's move
    await stroke(bp.x + 20, bp.y + 100); await p.click('#tool-dock [data-tool="move"]'); await p.waitForTimeout(150);
    const n0 = await count();
    ok(await p.evaluate(() => !!document.querySelector('#tool-dock #dock-redo')), 'the dock has a Redo button beside Undo');
    await p.click('#tool-dock #dock-undo'); await p.waitForTimeout(150);
    ok(await count() === n0 - 1, 'undo takes the last stroke off (' + n0 + ' → ' + (n0 - 1) + ')', await count());
    await p.click('#tool-dock #dock-redo'); await p.waitForTimeout(150);
    ok(await count() === n0, 'the Redo button puts it back', await count());
    await p.keyboard.press('Control+z'); await p.waitForTimeout(150);
    ok(await count() === n0 - 1, 'ctrl+z takes the stroke off again', await count());
    const rectsAB = () => p.evaluate(() => [...document.querySelectorAll('.wall-ink path.wall-item')].slice(1, 3).map(n => { const r = n.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top)]; }));
    const r2 = await rectsAB();   // the band's two: the next undo, chronologically, is their group move
    await p.keyboard.press('Control+z'); await p.waitForTimeout(200);
    const r3 = await rectsAB();
    ok(await count() === n0 - 1 && r3.length === 2 && r3.every((r, i) => Math.abs(r[0] - (r2[i][0] - 60)) <= 4), 'the second ctrl+z takes back the group move, in order (count unchanged, both 60px back)', JSON.stringify([r2, r3]));
    await p.keyboard.press('Control+Shift+z'); await p.waitForTimeout(200);
    ok(await count() === n0 - 1 && (await rectsAB()).every((r, i) => Math.abs(r[0] - r2[i][0]) <= 4), 'ctrl+shift+z puts the group move back', JSON.stringify(await rectsAB()));
    await p.keyboard.press('Control+y'); await p.waitForTimeout(150);
    ok(await count() === n0, 'ctrl+y puts the stroke back', await count());
    await p.keyboard.press('Control+Shift+z'); await p.waitForTimeout(150);
    ok(await count() === n0, 'with nothing left to redo, redo does nothing', await count());
    await p.keyboard.press('Control+z'); await p.waitForTimeout(150);
    await p.click('#tool-dock [data-tool="draw"]'); await p.waitForTimeout(150);
    await stroke(bp.x + 60, bp.y + 110); await p.click('#tool-dock [data-tool="move"]'); await p.waitForTimeout(150);
    ok(await count() === n0, 'a new stroke after an undo replaces what was undone (' + n0 + ')', await count());
    await p.keyboard.press('Control+Shift+z'); await p.waitForTimeout(150);
    ok(await count() === n0, '…and the redo pile was emptied by it', await count());
    // a moved stroke: undo puts it back, redo moves it again
    const one = await p.evaluate(() => { const r = [...document.querySelectorAll('.wall-ink path.wall-item')].pop().getBoundingClientRect(); return { l: Math.round(r.left), x: r.left + 4, y: r.top + 3 }; });
    await p.mouse.move(one.x, one.y); await p.mouse.down(); for (let i = 1; i <= 5; i++) { await p.mouse.move(one.x + i * 10, one.y); await p.waitForTimeout(16); } await p.mouse.up(); await p.waitForTimeout(250);
    const left = () => p.evaluate(() => Math.round([...document.querySelectorAll('.wall-ink path.wall-item')].pop().getBoundingClientRect().left));
    const moved = await left();
    if (moved - one.l >= 40) {
      await p.keyboard.press('Control+z'); await p.waitForTimeout(200);
      ok(await left() === one.l, 'undo puts a moved stroke back', await left() + ' vs ' + one.l);
      await p.keyboard.press('Control+Shift+z'); await p.waitForTimeout(200);
      ok(await left() === moved, 'redo moves it again', await left() + ' vs ' + moved);
    } else console.log('  (skip: the press did not catch the stroke, ' + one.l + ' → ' + moved + ')');
    // ── the sticker tool moves a piece: press one and drag (PRESS AND HOLD) ──
    await p.click('#tool-dock [data-tool="sticker"]'); await p.waitForTimeout(300);
    ok(await p.evaluate(() => document.querySelector('.wall-ink').classList.contains('wall-holdable') && getComputedStyle(document.querySelector('.wall-ink path.wall-item')).pointerEvents === 'auto'), 'with the sticker tool up the pieces answer the pointer');
    await p.click('#tool-dock [data-tool="draw"]'); await p.waitForTimeout(150);
    await stroke(bp.x + 520, bp.y + 30);   // well to the right of the sticker drawer, which opens on the left
    await p.click('#tool-dock [data-tool="sticker"]'); await p.waitForTimeout(300);
    const sp = await p.evaluate(() => { const r = [...document.querySelectorAll('.wall-ink path.wall-item')].pop().getBoundingClientRect(); return { l: Math.round(r.left), x: r.left + 4, y: r.top + 3, under: (document.elementFromPoint(r.left + 4, r.top + 3) || {}).tagName }; });
    ok(sp.under === 'path', 'the press point is the piece itself, not the drawer', JSON.stringify(sp));
    await p.mouse.move(sp.x, sp.y); await p.mouse.down(); for (let i = 1; i <= 6; i++) { await p.mouse.move(sp.x + i * 10, sp.y); await p.waitForTimeout(16); } await p.mouse.up(); await p.waitForTimeout(300);
    const spl = await p.evaluate(() => Math.round([...document.querySelectorAll('.wall-ink path.wall-item')].pop().getBoundingClientRect().left));
    ok(spl - sp.l >= 50, 'a drag on a piece with the sticker tool carries it (' + sp.l + ' → ' + spl + ')');
    ok(await count() === n0 + 1, '…and stamps nothing', await count());
    await p.click('#tool-dock [data-tool="move"]'); await p.waitForTimeout(150);
    // ── the dashboard: the map has no table view any more; the trend keeps its toggle ──
    await p.goto(BASE + '/dashboard/'); await p.waitForTimeout(3500);
    const dash = await p.evaluate(() => { const h = [...document.querySelectorAll('h2')].find(e => /Where the work happens/.test(e.textContent)); const sec = h && h.closest('section'); return { found: !!sec, mapToggle: sec ? [...sec.querySelectorAll('button')].filter(b => /VIEW AS (TABLE|MAP)/.test(b.textContent)).length : -1, table: sec ? /VIEW AS TABLE/.test(sec.innerText) : null, trendToggle: [...document.querySelectorAll('button')].filter(b => /VIEW AS (TABLE|CHART)/.test(b.textContent)).length, map: sec ? !!sec.querySelector('canvas') : false }; });
    ok(dash.found && dash.mapToggle === 0 && dash.map, 'Where the work happens shows the map with no table toggle', JSON.stringify(dash));
    ok(dash.trendToggle >= 1, 'the trend chart keeps its own view toggle', JSON.stringify(dash));
    ok(pageErrors.length === 0, 'no uncaught page errors', pageErrors.join(' | '));
  } catch (e) { fails.push('CRASH ' + (e && e.stack || e)); }
  if (b) await b.close().catch(() => {});
  srv.kill();
  console.log('\nprobe-yard-ink: ' + n + ' checks, ' + (fails.length ? fails.length + ' FAILED\n - ' + fails.join('\n - ') : 'all good'));
  if (fails.length) { console.log('\nserver log tail:\n' + log.slice(-1200)); process.exit(1); }
})();
