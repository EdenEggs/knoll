/* ironhive/probe-ballot.js — the council ballot on the iron hive (2026-09-13).

   The third section, and the first MACHINE on this bench: the export's
   drawing sits in a second full-viewport div that carries its own zoom,
   beside a +/−/RESET widget pinned to the corner — lab 2's machine furniture,
   marked here data-lab-sheet and data-lab-nozoom (recut.js, bare.css NO
   SECOND SHEET) — plus two marks of the hive's own: data-lab-grab on the
   ballot a finger drags, data-lab-drift on the steam that rises off it. And
   its script is changed where recut.js's BALLOT_SWAPS says: a blank ballot
   lifts and the slot refuses it, and the drag follows the zoom the ballot is
   drawn at. The feature paths it shares with the gallery (drag, pick, corner,
   menu, copy and paste, the pinch) are probe-gallery.js's. Real Chrome, real
   presses, values read back out of the ballot's document.

     1   the section and its document: on the paper once, boots, measures as
         drawn (1016×687), its box follows data-scale or the saved cut with the
         drawing fitted inside, the machine marks do their work (the sheet
         pinned at zoom 1, the widget not drawn), backdrop off, the faces,
         nothing third-party; and how far the steam, now unmeasured, rises
         past the top of the box (REPORTED)
     1b  THE STEAM HAS NO SAY IN THE SIZE: one fresh load with the puffs held
         at the top of their rise and one with them held out of sight measure
         the same drawing. Before data-lab-drift they did not — 687 on one load
         and 735 on the next, by where a puff happened to be.
     2   voting with a mouse: a click wakes it; motion 1 of 5; A BLANK BALLOT
         LIFTS and follows the pointer, and held over the engine the slot and
         its ring go red and the screen says MARK YOUR BALLOT FIRST; let go
         there it is refused — nothing cast, it springs back, the hint asks for
         aye or nay, and a moment later is its own again; AYE marks it; a drag
         let go short of the engine casts nothing and the ballot springs back;
         a drag onto the engine casts it — BALLOT IN THE ENGINE, then VOTE
         SEALED, the live tally one AYE up on the motion's own count, YOUR
         VOTE: AYE, BALLOTS CAST 0001 — and NEXT MOTION goes to 2 of 5
     3   THE BENCH'S ZOOM KEYS: ctrl+= in the live ballot zooms the bench, and
         the export's own zoom never hears it — nothing stored, the sheet at 1;
         ctrl+− takes the bench back out
     4   the keys: ← → ↓ and page down in the live document move nothing
         outside it
     5   remembered: a reload keeps BALLOTS CAST and the motion it had reached
         (the export's own localStorage, ironhive.ballot.v1)
     6   A ZOOM THE EXPORT STORED BEFORE: with 0.41 left in
         ironhive.ballot.zoom.v1 (what four ctrl+− used to leave there), the
         ballot follows the pointer one for one — it ran ×2.44 — and a drop
         on the engine counts
     7   touch: a finger wakes it, marks NAY and drags the ballot into the
         engine, the vote is counted, and the bench does not slide under it.
         Before data-lab-grab the browser took that drag for a pan two moves
         in: nothing cast, and the bench moved instead.
     8   the published opening view (?seed=on, the deployed dress): where it
         lands is REPORTED, not asserted; asserted is that it boots there
     9   this probe wrote nothing: every door request it made was answered in
         the browser and never reached serve.js

   A CHECK THAT CANNOT FAIL IS NOT A CHECK. CONTROL_BALLOT=<a ballot.dc.html>
   serves that document in place of the bench's own: one recut before the grab
   and drift marks must fail 1b and 7, and one recut before the swaps must fail
   2's blank-ballot checks and 6. CONTROL_FRAMES=<frames.js from before AND THE
   KEYS IT ZOOMS WITH> must fail 3.

   USAGE (from site/): node ironhive/probe-ballot.js — with serve.js up. Every
   context is a fresh profile, so every run votes on a clean slate. */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { chromium } = require('playwright');

const URL = 'http://localhost:4321/ironhive/';
const ID = 'ironhive-ballot';
let fails = 0, doorWrites = 0;
const errors = [];
const say = (ok, what, extra) => { if (!ok) fails++; console.log((ok ? 'PASS ' : 'FAIL ') + what + (extra == null ? '' : ' — ' + extra)); };
const info = (what, extra) => console.log('INFO ' + what + (extra == null ? '' : ' — ' + extra));
const near = (a, b, slop) => Math.abs(a - b) <= slop;
const hash = f => crypto.createHash('sha256').update(fs.readFileSync(path.join(__dirname, f))).digest('hex');
const RED = /181, 68, 44/;                   // #b5442c, the NAY swatch, as the browser writes it back

async function open(browser, opts) {
  const ctx = await browser.newContext(Object.assign({ viewport: { width: 1600, height: 900 } }, opts.ctx || {}));
  await ctx.route('**/_ironhive/**', r => {
    if (r.request().method() !== 'GET') doorWrites++;
    return r.fulfill({ status: 404, body: 'no door' });
  });
  if (process.env.CONTROL_BALLOT) await ctx.route('**/features/ballot.dc.html*', r => r.fulfill({ path: process.env.CONTROL_BALLOT, contentType: 'text/html; charset=utf-8' }));
  if (process.env.CONTROL_FRAMES) await ctx.route('**/ironhive/frames.js*', r => r.fulfill({ path: process.env.CONTROL_FRAMES, contentType: 'application/javascript' }));
  if (opts.stale) await ctx.addInitScript(z => { try { localStorage.setItem('ironhive.ballot.zoom.v1', z); } catch (e) {} }, opts.stale);
  if (opts.deployed) {
    // the landing dress; contains() is load-bearing — see probe-gallery.js
    await ctx.addInitScript(() => {
      new MutationObserver(() => {
        const h = document.documentElement;
        if (h && h.classList.contains('lab-local')) h.classList.remove('lab-local');
      }).observe(document, { subtree: true, childList: true, attributes: true, attributeFilter: ['class'] });
    });
  }
  if (opts.steam) {
    /* THE STEAM HELD STILL, in the ballot's own document and from its first
       paint, so every measurement frames.js takes sees the same puff: high is
       60% through its rise (up about 75px, still a quarter opaque), low is no
       animation at all (its inline opacity 0, so not drawn). Found by the
       animation in the style React writes, never by a mark, so it holds the
       unmarked control document the same way. */
    await ctx.addInitScript(mode => {
      if (!/ballot\.dc\.html/.test(location.pathname)) return;
      const css = mode === 'high'
        ? '[style*="puffA"]{animation-delay:-1.8s!important;animation-play-state:paused!important}'
        : '[style*="puffA"]{animation:none!important}';
      document.addEventListener('DOMContentLoaded', () => { const s = document.createElement('style'); s.textContent = css; document.head.appendChild(s); });
    }, opts.steam);
  }
  const page = await ctx.newPage();
  page.on('pageerror', e => { errors.push(String(e)); console.log('PAGEERROR', String(e)); });
  page.frameRequests = [];
  page.on('request', r => { if (r.frame() !== page.mainFrame()) page.frameRequests.push(r.url()); });
  await page.goto(URL + (opts.query || ''), { waitUntil: 'load' });
  await page.waitForFunction(() => window.Lab && window.Frames && window.Wall && document.getElementById('gz-ballot'), null, { timeout: 30000 });
  return { ctx, page };
}

const booted = page => page.waitForFunction(() => {
  const el = document.getElementById('gz-ballot');
  return !!el && el.classList.contains('booted');
}, null, { timeout: 30000 }).then(() => true, () => false);

const frameOn = (page, frac, z) => page.evaluate(([frac, z]) => {
  const el = document.getElementById('gz-ballot'), b = Lab.bench.getBoundingClientRect();
  const x = parseFloat(el.style.left), y = parseFloat(el.style.top), w = el.offsetWidth, h = el.offsetHeight;
  const zz = z || Math.min(b.width * frac / w, b.height * frac / h);
  Lab.camTo(zz, b.width / 2 - (x + w / 2) * zz, b.height / 2 - (y + h / 2) * zz, 0);
}, [frac, z || 0]).then(() => page.waitForTimeout(450));

// what the ballot's document is showing, found by what things say
const ballot = page => page.evaluate(() => {
  const el = document.getElementById('gz-ballot'), p = Frames.panels.find(q => q.el === el) || {};
  const f = el.querySelector('iframe'), d = f.contentDocument, w = d.defaultView;
  const divs = [...d.querySelectorAll('div')];
  const said = t => divs.some(x => x.textContent.trim() === t);
  const find = re => { const n = divs.find(x => re.test(x.textContent.trim())); return n ? n.textContent.replace(/\s+/g, ' ').trim() : null; };
  const motionTag = divs.find(x => x.textContent.trim() === '01 THE MOTION');
  const motion = motionTag ? motionTag.parentElement : null;
  const row = label => divs.find(x => x.children.length === 3 && x.children[1] && x.children[1].textContent.trim() === label && x.children[0].style.width === '40px');
  const count = label => { const l = divs.find(x => x.textContent.trim() === label && x.style.width === '46px'); return l ? l.parentElement.lastElementChild.textContent.trim() : null; };
  const castTag = divs.find(x => x.textContent.trim() === 'BALLOTS CAST');
  const sheet = d.querySelector('[data-lab-sheet]'), widget = d.querySelector('[data-lab-nozoom]');
  return {
    natW: p.natW, natH: p.natH, w: el.offsetWidth, h: el.offsetHeight, cut: el.dataset.cut || null,
    drawnAt: f.getBoundingClientRect().width / f.offsetWidth / Lab.zoom,
    live: el.classList.contains('live'), cls: el.className,
    num: motion ? motion.children[1].textContent.replace(/\s+/g, ' ').trim() : null,
    issue: motion ? motion.lastElementChild.textContent.trim() : null,
    showBallot: said('02 COUNCIL BALLOT'),
    aye: row('AYE') ? row('AYE').children[0].textContent.trim() : null,
    nay: row('NAY') ? row('NAY').children[0].textContent.trim() : null,
    hint: find(/^(drag the ballot into the slot|mark one box to vote|mark aye or nay first)/),
    engine: said('BALLOT IN THE ENGINE...'),
    sealed: said('VOTE SEALED'),
    ayes: count('AYE'), nays: count('NAY'),
    verdict: find(/^(Aye leads by|Nay leads by|Dead heat)/),
    yours: find(/^YOUR VOTE:/),
    cast: castTag && castTag.nextElementSibling ? castTag.nextElementSibling.textContent.trim() : null,
    sheetZoom: sheet ? w.getComputedStyle(sheet).zoom : null, sheetInline: sheet ? sheet.style.zoom : null,
    widget: widget ? w.getComputedStyle(widget).display : 'not in the document',
    root: (() => { const r = d.querySelector('[data-screen-label]'); return r ? r.dataset.screenLabel + ' / ' + w.getComputedStyle(r).backgroundImage : null; })()
  };
});

// a point on the page over something in the ballot's document
const at = (page, want) => page.evaluate(want => {
  const f = document.querySelector('#gz-ballot iframe'), d = f.contentDocument, r = f.getBoundingClientRect(), k = r.width / f.offsetWidth;
  const divs = [...d.querySelectorAll('div')];
  let node = null;
  if (want === 'AYE' || want === 'NAY') node = divs.find(x => x.children.length === 3 && x.children[1] && x.children[1].textContent.trim() === want && x.children[0].style.width === '40px');
  if (want === 'ballot') { const t = divs.find(x => x.textContent.trim() === '02 COUNCIL BALLOT'); node = t && t.parentElement; }
  if (want === 'slot') node = divs.find(x => x.textContent.trim() === 'INSERT ↓');
  if (want === 'motion') node = divs.find(x => x.textContent.trim() === '01 THE MOTION');
  if (want === 'next') node = [...d.querySelectorAll('button')].find(b => /next motion/i.test(b.textContent));
  if (!node) return null;
  const q = node.getBoundingClientRect();
  return { x: r.left + (q.left + q.width / 2) * k, y: r.top + (q.top + q.height / 2) * k, top: r.top + q.top * k, h: q.height * k };
}, want);

// the ballot while it is held: its centre on the page, the slot's outline, its
// ring, and what the tally screen says — read in its document
const held = page => page.evaluate(() => {
  const f = document.querySelector('#gz-ballot iframe'), d = f.contentDocument, w = d.defaultView, r = f.getBoundingClientRect(), k = r.width / f.offsetWidth;
  const divs = [...d.querySelectorAll('div')];
  const tag = divs.find(x => x.textContent.trim() === '02 COUNCIL BALLOT'), b = tag && tag.parentElement;
  const slot = divs.find(x => x.style.outlineOffset === '5px');     // the slot itself: nothing else is outlined
  const screen = divs.find(x => x.style.whiteSpace === 'pre-line');
  const q = b && b.getBoundingClientRect();
  return {
    x: q ? r.left + (q.left + q.width / 2) * k : null, y: q ? r.top + (q.top + q.height / 2) * k : null,
    outline: slot ? w.getComputedStyle(slot).outlineColor + ' ' + w.getComputedStyle(slot).outlineStyle : null,
    ring: b ? b.style.boxShadow : null,
    screen: screen ? screen.textContent : null
  };
});

const press = async (page, want, wait) => {
  const p = await at(page, want);
  if (!p) throw new Error('nothing in the ballot for ' + want);
  await page.mouse.click(p.x, p.y);
  await page.waitForTimeout(wait == null ? 350 : wait);
};
// the ballot is taken by its grip, the three bars along its top, never by a box it would mark
const grip = async page => { const b = await at(page, 'ballot'); return b && { x: b.x, y: b.top + b.h * 0.1 }; };
async function drag(page, from, to, steps) {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  for (let i = 1; i <= (steps || 16); i++) { await page.mouse.move(from.x + (to.x - from.x) * i / (steps || 16), from.y + (to.y - from.y) * i / (steps || 16)); await page.waitForTimeout(16); }
  await page.mouse.up();
}
// the same, but still held at the far end — the caller lets go
async function carry(page, from, to, steps) {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  for (let i = 1; i <= steps; i++) { await page.mouse.move(from.x + (to.x - from.x) * i / steps, from.y + (to.y - from.y) * i / steps); await page.waitForTimeout(16); }
  await page.waitForTimeout(120);
}
const pan = page => page.evaluate(() => [Lab.pan.x, Lab.pan.y, Lab.zoom].join());
const zoomOf = page => page.evaluate(() => Lab.zoom);
const storedZoom = page => page.evaluate(() => localStorage.getItem('ironhive.ballot.zoom.v1'));

// how far the steam rises above the top of the box, in world px, over one 3s cycle of it
const steamAbove = page => page.evaluate(async () => {
  const el = document.getElementById('gz-ballot'), f = el.querySelector('iframe'), d = f.contentDocument, w = d.defaultView;
  const puffs = [...d.querySelectorAll('div')].filter(x => /puffA/.test(x.getAttribute('style') || ''));
  let worst = -Infinity;
  const t0 = performance.now();
  while (performance.now() - t0 < 3100) {
    const r = f.getBoundingClientRect(), k = r.width / f.offsetWidth, top = el.getBoundingClientRect().top;
    for (const p of puffs) {
      if (+w.getComputedStyle(p).opacity < 0.05) continue;
      const y = r.top + p.getBoundingClientRect().top * k;
      worst = Math.max(worst, (top - y) / Lab.zoom);
    }
    await new Promise(res => setTimeout(res, 50));
  }
  return { puffs: puffs.length, drifting: puffs.filter(p => p.hasAttribute('data-lab-drift')).length, worst };
});

(async () => {
  const h0 = hash('index.html');
  if (process.env.CONTROL_BALLOT || process.env.CONTROL_FRAMES) console.log('CONTROL RUN — serving ' + [process.env.CONTROL_BALLOT, process.env.CONTROL_FRAMES].filter(Boolean).join(' and '));
  const browser = await chromium.launch({ channel: 'chrome' });

  // ── 1 · the section and its document ────────────────────────────────────
  console.log('\n1 · the section and its document');
  let { ctx, page } = await open(browser, {});
  const secs = await page.evaluate(() => [...document.querySelectorAll('#bench-world > section.gz')].map(s => ({ gizmo: s.dataset.gizmo, src: s.dataset.src, scale: s.dataset.scale, home: s.dataset.homeX + ',' + s.dataset.homeY, cut: s.dataset.cut || null })));
  const mine = secs.filter(x => x.gizmo === ID);
  say(mine.length === 1 && mine[0].src === 'features/ballot.dc.html', 'the council ballot is on the paper, once', secs.length + ' section(s): ' + JSON.stringify(secs));
  await frameOn(page, 0.8);
  say(await booted(page), 'its document boots');
  await page.waitForTimeout(1500);
  let b = await ballot(page);
  say(near(b.natW, 1016, 3) && near(b.natH, 687, 3), 'the drawing measures as drawn: 1016×687', b.natW + '×' + b.natH);
  const scale = +(mine[0] && mine[0].scale) || 1;
  if (!b.cut) say(near(b.w, b.natW * scale, 2) && near(b.h, b.natH * scale, 2) && near(b.drawnAt, scale, 0.01), 'nobody has cut it, so the box is the drawing at data-scale ' + scale, b.w + '×' + b.h + ', drawn at ×' + b.drawnAt.toFixed(3));
  else { const [cw, ch] = b.cut.split('x').map(Number), k = Math.min(cw / b.natW, ch / b.natH); say(near(b.w, cw, 1) && near(b.h, ch, 1) && near(b.drawnAt, k, 0.02), 'cut on the bench to ' + b.cut + ': the box is the cut, the drawing fitted into it', 'drawn at ×' + b.drawnAt.toFixed(3) + ', fit ×' + k.toFixed(3)); }
  say(b.widget === 'none' && b.sheetZoom === '1', 'the machine marks do their work: the zoom widget is not drawn, the sheet inside the sheet stands at zoom 1', 'widget ' + b.widget + ' · sheet zoom ' + b.sheetZoom);
  say(/^Council Ballot \/ none$/.test(b.root || ''), 'the screen root came marked, and its backdrop is off', b.root);
  const fonts = await page.evaluate(() => [...document.querySelector('#gz-ballot iframe').contentDocument.fonts].filter(ff => ff.status === 'loaded').map(ff => ff.family.replace(/"/g, '') + ' ' + ff.weight));
  say(['Oswald 500', 'Oswald 700', 'JetBrains Mono 700'].every(f => fonts.includes(f)), 'its faces are loaded, off the bench\'s own fonts/', fonts.join(', '));
  const foreign = page.frameRequests.filter(u => !u.startsWith('http://localhost:4321/') && !/^(data|blob|about):/.test(u));
  say(foreign.length === 0, 'nothing inside the ballot asks a third party for anything', foreign.slice(0, 4).join(', ') || 'none');
  const steam = await steamAbove(page);
  info('the steam rises up to ' + (steam.worst > -Infinity ? Math.round(steam.worst) : '—') + ' world px past the top of the box over a cycle (' + steam.puffs + ' puffs showing, ' + steam.drifting + ' marked drift)',
       steam.worst > 1 ? 'so the top of its rise, all but faded, is clipped at the edge of the box' : 'all of it inside the box');

  // ── 1b · the steam has no say in the size ───────────────────────────────
  console.log('\n1b · the steam and the measurement');
  const measured = {};
  for (const mode of ['high', 'low']) {
    const o = await open(browser, { steam: mode });
    await frameOn(o.page, 0.8);
    await booted(o.page);
    await o.page.waitForTimeout(2200);                      // past frames.js's +700ms look, and the fonts'
    const m = await ballot(o.page);
    measured[mode] = { w: m.natW, h: m.natH };
    await o.ctx.close();
  }
  say(near(measured.high.w, measured.low.w, 2) && near(measured.high.h, measured.low.h, 2),
      'with the steam held at the top of its rise and with it held out of sight, the same drawing is measured',
      'held high ' + measured.high.w + '×' + measured.high.h + ' · held low ' + measured.low.w + '×' + measured.low.h);

  // ── 2 · voting with a mouse ──────────────────────────────────────────────
  console.log('\n2 · voting with a mouse');
  await press(page, 'motion', 450);
  b = await ballot(page);
  say(b.live && b.num === '1 / 5' && /^Ration the forge/.test(b.issue || '') && b.cast === '0000', 'a click wakes it on motion 1 of 5, nothing cast', b.num + ' · ' + b.cast + ' · ' + (b.issue || '').slice(0, 40));

  /* A BLANK BALLOT LIFTS — the export's would not, and a press on it did
     nothing, which is how "the ballot can't be dragged" was reported. Taken
     by its grip to the slot and held there; followed is how far its centre
     went for each pixel the pointer did. */
  const g0 = await held(page), from0 = await grip(page), slot0 = await at(page, 'slot');
  await carry(page, from0, slot0, 20);
  let h = await held(page);
  const went = Math.hypot(slot0.x - from0.x, slot0.y - from0.y), followed = Math.hypot(h.x - g0.x, h.y - g0.y) / went;
  say(near(followed, 1, 0.05) && RED.test(h.outline || '') && RED.test(h.ring || '') && h.screen === 'MARK YOUR\nBALLOT FIRST',
      'a blank ballot lifts and follows the pointer; held over the engine the slot and its ring go red, and the screen asks for the mark',
      'followed ×' + followed.toFixed(3) + ' · slot ' + h.outline + ' · screen ' + JSON.stringify(h.screen));
  await page.mouse.up();
  await page.waitForTimeout(700);
  b = await ballot(page); h = await held(page);
  const back = h.x == null ? Infinity : Math.hypot(h.x - g0.x, h.y - g0.y);
  say(b.showBallot && !b.engine && b.cast === '0000' && back <= 3 && b.hint === 'mark aye or nay first',
      '…and let go there it is refused: nothing cast, it springs back to where it was, and the hint asks for aye or nay',
      'cast ' + b.cast + ' · back within ' + back.toFixed(1) + 'px · hint ' + b.hint);
  await page.waitForTimeout(1500);
  b = await ballot(page);
  say(b.hint === 'mark one box to vote', '…and a moment later the hint is its own again', b.hint);

  await press(page, 'AYE');
  b = await ballot(page);
  say(b.aye === '✗' && b.nay === '' && /^drag the ballot into the slot/.test(b.hint || ''), 'AYE marks it, and it asks to be dragged', b.aye + ' · ' + b.hint);
  let g = await grip(page);
  await drag(page, g, { x: g.x - 60, y: g.y - 40 }, 8);
  await page.waitForTimeout(600);
  b = await ballot(page);
  say(b.showBallot && !b.engine && b.cast === '0000', 'let go short of the engine, it springs back and nothing is cast', 'cast ' + b.cast);
  g = await grip(page);
  await carry(page, g, await at(page, 'slot'), 20);
  h = await held(page);
  say(/111, 143, 122/.test(h.outline || '') && h.screen === 'BALLOT MARKED\nDRAG IT TO\nTHE SLOT', 'a marked ballot held over the engine lights the slot green, as exported', 'slot ' + h.outline);
  await page.mouse.up();
  await page.waitForTimeout(250);
  b = await ballot(page);
  say(b.engine && !b.showBallot, 'dropped on the engine: BALLOT IN THE ENGINE, and the ballot is gone into it', 'engine ' + b.engine);
  await page.waitForTimeout(2300);
  b = await ballot(page);
  say(b.sealed && b.ayes === '813' && b.nays === '347' && b.verdict === 'Aye leads by 466' && b.yours === 'YOUR VOTE: AYE' && b.cast === '0001',
      'VOTE SEALED: the live tally is one AYE up on the motion\'s own 812, yours is AYE, and BALLOTS CAST reads 0001',
      [b.ayes, b.nays, b.verdict, b.yours, b.cast].join(' · '));
  await press(page, 'next', 450);
  b = await ballot(page);
  say(b.num === '2 / 5' && /^Admit the outer camps/.test(b.issue || '') && b.hint === 'mark one box to vote', 'NEXT MOTION: 2 of 5, a fresh ballot', b.num + ' · ' + (b.issue || '').slice(0, 40));

  // ── 3 · the bench's zoom keys ────────────────────────────────────────────
  console.log('\n3 · the bench\'s zoom keys');
  const z0 = await zoomOf(page);
  await page.keyboard.press('Control+Equal');
  await page.waitForTimeout(400);
  b = await ballot(page);
  const z1 = await zoomOf(page), s1 = await storedZoom(page);
  say(near(z1 / z0, 1.2, 0.001) && s1 === null && b.sheetInline === '1' && b.sheetZoom === '1',
      'ctrl+= in the live ballot zooms the BENCH a fifth closer, and never reaches the export: nothing stored, its sheet at 1',
      'bench ×' + (z1 / z0).toFixed(3) + ' · stored ' + s1 + ' · inline ' + b.sheetInline + ' · drawn ' + b.sheetZoom);
  await page.keyboard.press('Control+Minus');
  await page.waitForTimeout(400);
  const z2 = await zoomOf(page), s2 = await storedZoom(page);
  say(near(z2, z0, 1e-6) && s2 === null, '…and ctrl+− takes the bench back out, the export none the wiser', 'bench ' + z0.toFixed(4) + ' → ' + z2.toFixed(4) + ' · stored ' + s2);

  // ── 4 · the keys ─────────────────────────────────────────────────────────
  console.log('\n4 · the keys');
  await frameOn(page, 0.8);
  await press(page, 'motion', 450);
  const cam1 = await pan(page);
  for (const k of ['ArrowRight', 'ArrowLeft', 'ArrowDown', 'PageDown']) await page.keyboard.press(k);
  await page.waitForTimeout(450);
  b = await ballot(page);
  say((await pan(page)) === cam1 && b.live, '← → ↓ and page down in the live ballot move nothing outside it, and it stays awake', 'camera ' + cam1 + ' → ' + (await pan(page)));

  // ── 5 · remembered ───────────────────────────────────────────────────────
  console.log('\n5 · remembered');
  await page.reload({ waitUntil: 'load' });
  await page.waitForFunction(() => window.Lab && window.Frames && document.getElementById('gz-ballot'), null, { timeout: 30000 });
  await frameOn(page, 0.8);
  await booted(page);
  await page.waitForTimeout(1500);
  b = await ballot(page);
  say(b.cast === '0001' && b.num === '2 / 5', 'a reload keeps BALLOTS CAST and the motion it had reached', b.cast + ' · ' + b.num);
  await ctx.close();

  // ── 6 · a zoom the export stored before ─────────────────────────────────
  console.log('\n6 · a zoom the export stored before');
  ({ ctx, page } = await open(browser, { stale: '0.41' }));
  await frameOn(page, 0.8);
  await booted(page);
  await page.waitForTimeout(1500);
  await press(page, 'motion', 450);
  await press(page, 'AYE');
  b = await ballot(page);
  const st = await storedZoom(page);
  g = await grip(page);
  const c0 = await held(page), s6 = await at(page, 'slot');
  await carry(page, g, s6, 20);
  const c1 = await held(page);
  const fx = (c1.x - c0.x) / (s6.x - g.x), fy = (c1.y - c0.y) / (s6.y - g.y);
  say(st === '0.41' && b.sheetInline === '0.41' && b.aye === '✗' && near(fx, 1, 0.03) && near(fy, 1, 0.03),
      'with 0.41 left in the export\'s zoom, the ballot still follows the pointer one for one (on that number it used to run ×2.44)',
      'stored ' + st + ' · inline ' + b.sheetInline + ' · followed ×' + fx.toFixed(3) + ' across, ×' + fy.toFixed(3) + ' down');
  await page.mouse.up();
  await page.waitForTimeout(2600);
  b = await ballot(page);
  say(b.sealed && b.cast === '0001', '…and let go over the engine, the vote is counted', 'sealed ' + b.sealed + ' · cast ' + b.cast);
  await ctx.close();

  // ── 7 · touch ────────────────────────────────────────────────────────────
  console.log('\n7 · touch');
  ({ ctx, page } = await open(browser, { ctx: { viewport: { width: 1200, height: 900 }, hasTouch: true } }));
  await frameOn(page, 0.8);
  await booted(page);
  await page.waitForTimeout(1200);
  const cdp = await ctx.newCDPSession(page);
  const P = (x, y) => ({ x: Math.round(x), y: Math.round(y), id: 1, radiusX: 8, radiusY: 8, force: 1, rotationAngle: 0 });
  const tap = async p => { await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [P(p.x, p.y)] }); await page.waitForTimeout(60); await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await page.waitForTimeout(450); };
  await tap(await at(page, 'motion'));
  b = await ballot(page);
  say(b.live, 'a tap wakes it', b.cls);
  await tap(await at(page, 'NAY'));
  b = await ballot(page);
  say(b.nay === '✗', 'a tap marks NAY', 'nay ' + JSON.stringify(b.nay));
  const from = await grip(page), to = await at(page, 'slot'), camT = await pan(page);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [P(from.x, from.y)] });
  await page.waitForTimeout(60);
  for (let i = 1; i <= 20; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [P(from.x + (to.x - from.x) * i / 20, from.y + (to.y - from.y) * i / 20)] }); await page.waitForTimeout(16); }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await page.waitForTimeout(2600);
  b = await ballot(page);
  say(b.sealed && b.nays === '348' && b.yours === 'YOUR VOTE: NAY' && b.cast === '0001', 'a finger drags the ballot into the engine, and the NAY is counted', [b.sealed, b.nays, b.yours, b.cast].join(' · '));
  say((await pan(page)) === camT, '…and the bench did not slide under the finger', 'camera ' + camT + ' → ' + (await pan(page)));
  await ctx.close();

  // ── 8 · the published opening view ──────────────────────────────────────
  console.log('\n8 · the published opening view');
  for (const vp of [{ width: 2048, height: 1152 }, { width: 1600, height: 900 }, { width: 412, height: 915 }]) {
    ({ ctx, page } = await open(browser, { ctx: { viewport: vp }, query: '?seed=on', deployed: true }));
    await page.waitForFunction(() => Wall.store.get().items.filter(Boolean).length > 200, null, { timeout: 20000 });
    await page.waitForFunction(() => document.querySelectorAll('svg.wall-ink .wall-item').length > 200, null, { timeout: 20000 });
    await page.waitForTimeout(2500);
    const view = await page.evaluate(() => {
      const bb = Lab.bench.getBoundingClientRect(), el = document.getElementById('gz-ballot'), r = el.getBoundingClientRect();
      const shown = { x: parseFloat(el.style.left), y: parseFloat(el.style.top) }, home = { x: +el.dataset.homeX, y: +el.dataset.homeY };
      const box = e => ({ x1: parseFloat(e.style.left), y1: parseFloat(e.style.top), x2: parseFloat(e.style.left) + e.offsetWidth, y2: parseFloat(e.style.top) + e.offsetHeight });
      const g = box(el), st = Wall.store.get().items, hits = [], over = [];
      document.querySelectorAll('svg.wall-ink .wall-item').forEach(n => {
        const i = +n.dataset.i, it = st[i];
        if (!it || it.k === 's') return;
        const q = n.getBoundingClientRect();
        if (!q.width) return;
        const a = Lab.toWorld(q.left, q.top), c = Lab.toWorld(q.right, q.bottom);
        if (a.x < g.x2 && c.x > g.x1 && a.y < g.y2 && c.y > g.y1) hits.push(it.k + ' ' + (it.f || it.id || ''));
      });
      document.querySelectorAll('#bench-world > section.gz').forEach(s => {
        if (s === el) return;
        const o = box(s);
        if (o.x1 < g.x2 && o.x2 > g.x1 && o.y1 < g.y2 && o.y2 > g.y1) over.push(s.id);
      });
      const onScreen = r.left >= bb.left && r.right <= bb.right && r.top >= bb.top && r.bottom <= bb.bottom ? 'wholly on screen'
        : (r.right <= bb.left || r.left >= bb.right || r.bottom <= bb.top || r.top >= bb.bottom) ? 'off screen' : 'partly on screen';
      return { z: Lab.zoom, onScreen, shown, home, hits, over, cut: el.dataset.cut || null };
    });
    const reined = view.shown.x !== view.home.x || view.shown.y !== view.home.y;
    info(vp.width + '×' + vp.height + ' at zoom ' + view.z.toFixed(3) + ': the ballot is ' + view.onScreen,
         'home ' + view.home.x + ',' + view.home.y + (reined ? ' — REINED on this screen to ' + view.shown.x + ',' + view.shown.y : '') +
         (view.cut ? ', cut ' + view.cut : '') + (view.over.length ? ', its box overlaps ' + view.over.join(' and ') : '') +
         (view.hits.length ? ', over ' + view.hits.length + ' piece(s) of the wall: ' + view.hits.slice(0, 5).join('; ') : ', over no piece of the wall'));
    if (vp.width === 2048) {
      await frameOn(page, 0, view.z);
      say(await booted(page), 'at the opening zoom it boots — no poster stands in for it');
      await page.screenshot({ path: path.join(__dirname, 'ballot-open.png') });
    }
    await ctx.close();
  }

  // ── 9 · this probe wrote nothing ────────────────────────────────────────
  console.log('\n9 · nothing written');
  say(true, 'every door write this probe made was answered in the browser, none reached serve.js', doorWrites + ' write(s) turned away');
  if (hash('index.html') !== h0) info('index.html changed while this ran — not by this probe (its doors are shut); an open bench autosaving through serve.js');
  say(errors.length === 0, 'no page errors anywhere', errors.slice(0, 3).join(' | ') || 'none');

  await browser.close();
  console.log('\n' + (fails ? fails + ' FAILED' : 'all passed'));
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
