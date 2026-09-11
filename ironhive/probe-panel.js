/* ironhive/probe-panel.js — the side panels pull wider, and the sticker
   drawer's grid answers with two, three, then four cards across and stops.
   Runs against BOTH benches from the one file, because the case is written
   once and worn by both (lab.css, THE SIDE PANELS) — a fix that only landed
   on one of them is the thing most likely to go wrong here.

     1   the grip is there, on the tab ring, and the panel opens at the
         export's own 344 with nothing saved
     2   a real pointer drag widens it, and stops at both ends of the range
     3   the card grid goes 2 → 3 → 4 across, and 4 is the end of it —
         measured off the cards' own left edges, not off the CSS
     4   the cards stay square and nothing is clipped as it reflows
     5   the drag never lands on the body's scrollbar, and never selects the
         bench's text underneath
     6   the width is remembered across a reload, per panel — the drawer and
         the tracing table do not share one — and double-click puts it back
     7   the two benches keep their widths apart, sharing an origin as they do

   Run with the site's serve.js already up on 4321:  node ironhive/probe-panel.js
*/
const { chromium } = require('playwright');

let fails = 0;
const say = (ok, what, extra) => {
  if (!ok) fails++;
  console.log((ok ? '  PASS  ' : '  FAIL  ') + what + (extra == null ? '' : '   ' + extra));
};

const DRAWER = '#stickers';

/* A REAL PULL: press the grip, travel, let go. Playwright's mouse is the
   whole point — the grip takes a pointer capture and the browser has to be
   the one honouring it. */
async function pull(page, to) {
  const g = await page.locator(DRAWER + ' .lp-grip').boundingBox();
  const box = await page.locator(DRAWER).boundingBox();
  await page.mouse.move(g.x + g.width / 2, g.y + g.height / 2);
  await page.mouse.down();
  await page.mouse.move(g.x + g.width / 2 + (to - box.width), g.y + g.height / 2, { steps: 12 });
  await page.mouse.up();
  await page.waitForTimeout(90);
  return page.locator(DRAWER).evaluate(el => el.offsetWidth);
}

/* HOW MANY ACROSS, read off the cards themselves: the number of distinct
   left edges in the first row. Counting the CSS would only prove the CSS
   says what I wrote; counting the boxes proves the browser agrees. */
const across = page => page.evaluate(() => {
  const cards = [...document.querySelectorAll('#stickers .sd-card')];
  if (!cards.length) return 0;
  const top = Math.round(cards[0].getBoundingClientRect().top);
  return cards.filter(c => Math.round(c.getBoundingClientRect().top) === top).length;
});

async function bench(page, name, url, opener, shot) {
  console.log('\n── ' + name + ' ' + '─'.repeat(Math.max(0, 46 - name.length)));
  await page.goto(url, { waitUntil: 'load' });
  await page.evaluate(() => { try { localStorage.clear(); } catch (e) {} });
  await page.reload({ waitUntil: 'load' });
  await page.waitForFunction(() => window.Lab && window.Wall && window.Stickers);
  await page.click('.dock-btn[data-tool="sticker"]');
  await page.waitForTimeout(300);
  if (opener) await opener(page);              // lab 2 ships an empty drawer
  /* WAIT FOR THE CARDS, not for a guess at how long the fetch takes. The hive
     pulls 800 KB of artwork when the tool goes down, and every measurement
     below is of a drawer with something in it — an empty one is short, and a
     short panel clears the dock for free. */
  await page.waitForFunction(() => document.querySelectorAll('#stickers .sd-card').length > 8,
    null, { timeout: 20000 });
  await page.waitForTimeout(250);

  /* ── 1 · it is there, and nothing has moved yet ─────────────────────────── */
  const grip = await page.locator(DRAWER + ' .lp-grip').count();
  say(grip === 1, 'the drawer has a grip');
  const tag = await page.evaluate(() => {
    const g = document.querySelector('#stickers .lp-grip');
    return g && { tag: g.tagName, label: g.getAttribute('aria-label'), cur: getComputedStyle(g).cursor };
  });
  say(tag && tag.tag === 'BUTTON' && !!tag.label, 'it is a real button with a label',
    tag ? tag.tag + ' "' + tag.label + '"' : '');
  say(tag && tag.cur === 'ew-resize', 'and says so with the cursor', tag && tag.cur);

  const w0 = await page.locator(DRAWER).evaluate(el => el.offsetWidth);
  say(w0 === 344, 'opens at the export’s own 344 with nothing saved', w0 + 'px');
  say(await across(page) === 2, 'two cards across at 344, as it always was');

  /* ── 2 · the pull, and both ends of it ──────────────────────────────────── */
  const wMid = await pull(page, 520);
  say(Math.abs(wMid - 520) <= 2, 'a real drag widens it', wMid + 'px');
  const wMax = await pull(page, 900);
  say(wMax === 720, 'and stops at the top of the range', wMax + 'px');
  const wMin = await pull(page, 100);
  say(wMin === 344, 'and at the bottom', wMin + 'px');

  /* ── 3 · two, three, four, and no fifth ─────────────────────────────────── */
  const steps = [];
  for (const w of [344, 420, 480, 560, 620, 680, 720]) {
    await pull(page, w);
    steps.push([await page.locator(DRAWER).evaluate(el => el.offsetWidth), await across(page)]);
  }
  console.log('        width → across:  ' + steps.map(s => s[0] + '→' + s[1]).join('   '));
  const cols = steps.map(s => s[1]);
  say(cols[0] === 2, 'two across at 344');
  say(cols.includes(3), 'three across somewhere in the middle');
  say(cols[cols.length - 1] === 4, 'four across at the widest', cols[cols.length - 1] + '');
  say(Math.max(...cols) === 4, 'and never a fifth column, however far it is pulled',
    'max ' + Math.max(...cols));
  const rising = cols.every((n, i) => i === 0 || n >= cols[i - 1]);
  say(rising, 'the count only ever goes up as it widens', cols.join(','));

  /* ── 3b · and it never comes to rest on the dock ────────────────────────── */
  /* THIS IS A REGRESSION THE PULL ITSELF CREATED. lab.css shortens a panel
     that would meet the dock, but by a media query on 1300px — a number that
     was arithmetic on a panel 344 wide. At 720 the drawer reached the tool
     buttons on a perfectly ordinary window and sat on top of them. */
  const sits = [];
  for (const w of [344, 480, 600, 720]) {
    await pull(page, w);
    sits.push(await page.evaluate(() => {
      const p = document.querySelector('#stickers').getBoundingClientRect();
      return ['tool-opts', 'tool-dock'].map(id => {
        const el = document.getElementById(id);
        /* NOT offsetParent — it is null for every position:fixed element, and
           the dock, the options row and the panel are all fixed. Asking it
           was what made the first cut of this check pass against a bench
           whose panel was sitting squarely on the dock. */
        if (!el || !el.getClientRects().length) return null;
        const r = el.getBoundingClientRect();
        const over = r.left < p.right && r.right > p.left && r.top < p.bottom && r.bottom > p.top;
        return over ? id : null;
      }).filter(Boolean);
    }));
  }
  const onDock = sits.filter(s => s.length);
  say(!onDock.length, 'the panel never overlaps the dock or its options row, at any width',
    onDock.length ? 'covered ' + [...new Set(onDock.flat())].join(', ') : '');

  /* THE TEST ABOVE IS ONLY WORTH ANYTHING IF IT COULD HAVE FAILED. A drawer
     too short to reach the dock's row clears it for free and proves nothing,
     which is exactly how the first cut of this check passed against a bench
     that WAS sitting on the dock. So: at its widest the panel must reach far
     enough right to be in the dock's column at all, and be tall enough that
     an unclamped one would have run past the dock's top. */
  await pull(page, 720);
  const real = await page.evaluate(() => {
    const p = document.querySelector('#stickers').getBoundingClientRect();
    const o = document.getElementById('tool-opts').getBoundingClientRect();
    return { right: Math.round(p.right), h: Math.round(p.height), bottom: Math.round(p.bottom),
      top: Math.round(p.top),
      dockL: Math.round(o.left), dockT: Math.round(o.top),
      free: Math.round(window.innerHeight - p.top - 34), vh: window.innerHeight };
  });
  say(real.right > real.dockL, 'at 720 it really is in the dock’s column',
    'panel right ' + real.right + ' vs dock left ' + real.dockL);
  const unclamped = real.top + real.free;      // where its bottom would land with only the CSS cap
  say(unclamped > real.dockT, 'and the room it would take unclamped runs past the dock',
    'unclamped bottom ~' + unclamped + ' vs dock top ' + real.dockT);
  say(real.bottom <= real.dockT, 'so the clearance is doing real work',
    'panel bottom ' + real.bottom + ' ≤ dock top ' + real.dockT);
  say(real.h > real.vh * 0.45, 'and it is still most of the screen tall',
    real.h + 'px of ' + real.vh);

  if (shot) { await pull(page, 720); await page.screenshot({ path: shot }); }

  /* ── 4 · the cards survive the reflow ───────────────────────────────────── */
  const shape = await page.evaluate(() => {
    const grid = document.querySelector('#stickers .sd-grid');
    const cards = [...document.querySelectorAll('#stickers .sd-card')].slice(0, 4);
    const gb = grid.getBoundingClientRect();
    return cards.map(c => {
      const r = c.getBoundingClientRect();
      const t = c.querySelector('.sd-thumb').getBoundingClientRect();
      return { w: r.width, sq: Math.abs(t.width - t.height), out: r.right - gb.right };
    });
  });
  say(shape.every(c => c.sq < 1.5), 'the thumbnails are still square',
    'worst ' + Math.max(...shape.map(c => c.sq)).toFixed(2) + 'px off');
  say(shape.every(c => c.out < 1.5), 'no card hangs out of the grid',
    'worst ' + Math.max(...shape.map(c => c.out)).toFixed(2) + 'px');

  /* ── 5 · the grip does not fight the scrollbar, or select the page ──────── */
  const lane = await page.evaluate(() => {
    const g = document.querySelector('#stickers .lp-grip').getBoundingClientRect();
    const b = document.querySelector('#stickers .lp-body');
    const r = b.getBoundingClientRect();
    return { gripL: g.left, bodyR: r.right, scrolls: b.scrollHeight > b.clientHeight + 1 };
  });
  say(lane.bodyR <= lane.gripL + 0.5, 'the scrolling body ends before the grip begins',
    'body right ' + lane.bodyR.toFixed(1) + ' vs grip left ' + lane.gripL.toFixed(1));
  say(lane.scrolls, 'and the body really does scroll, so that mattered');

  await pull(page, 560);
  const sel = await page.evaluate(() => String(window.getSelection()));
  say(!sel.trim(), 'pulling selected nothing on the bench behind it',
    sel.trim() ? JSON.stringify(sel.slice(0, 40)) : 'nothing');

  /* ── 6 · remembered, per panel, and put back ────────────────────────────── */
  const want = await pull(page, 600);
  await page.reload({ waitUntil: 'load' });
  await page.waitForFunction(() => window.Lab && window.Stickers);
  await page.click('.dock-btn[data-tool="sticker"]');
  await page.waitForTimeout(300);
  const back = await page.locator(DRAWER).evaluate(el => el.offsetWidth);
  say(back === want, 'the width comes back after a reload', back + 'px');

  /* THE KEYS ARE READ HERE, while one is actually saved. Reading them after
     the double-click below would hand back an empty list, and every claim
     made about an empty list is true — a check that cannot fail. */
  const keys = await page.evaluate(() => Object.keys(localStorage).filter(k => k.indexOf(':panelw:') > -1));
  say(keys.length === 1, 'exactly one width is on file, the drawer’s', keys.join(' ') || 'none');

  await page.click('.dock-btn[data-tool="upload"]');
  await page.waitForTimeout(300);
  const table = await page.locator('#tracer').evaluate(el => el.offsetWidth);
  say(table === 344, 'the tracing table kept its own width, not the drawer’s', table + 'px');
  const tableGrip = await page.locator('#tracer .lp-grip').count();
  say(tableGrip === 1, 'but it has a grip of its own');

  await page.click('.dock-btn[data-tool="sticker"]');
  await page.waitForTimeout(250);
  await page.locator(DRAWER + ' .lp-grip').dblclick();
  await page.waitForTimeout(150);
  const put = await page.locator(DRAWER).evaluate(el => el.offsetWidth);
  say(put === 344, 'double-click puts it back to 344', put + 'px');
  const gone = await page.evaluate(() =>
    Object.keys(localStorage).filter(k => k.indexOf(':panelw:') > -1 && k.indexOf('stickers') > -1).length);
  say(gone === 0, 'and the saved width GOES rather than being overwritten');

  return keys;
}

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: false,
    args: ['--window-size=1616,1110', '--window-position=0,0'] });
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => { errs.push(String(e)); console.log('PAGEERROR', String(e)); });
  page.on('console', m => { if (m.type() === 'error') console.log('CONSOLE', m.text()); });

  /* the hive ships 289 stickers; lab 2's drawer is empty on purpose, so it is
     given two made-up ones — the same trick verify-stickers.js plays, and for
     the same reason: the layout must be testable without shipping art. */
  const seed = async p => p.evaluate(() => {
    const box = '<rect x="4" y="4" width="92" height="92" fill="#5a635d" stroke="#0d0f0d" stroke-width="6"/>';
    Stickers.load({ kits: [{ id: 'probe', name: 'Probe' }],
      stickers: Array.from({ length: 24 }, (_, i) =>
        ({ id: 'probe-' + i, name: 'Probe ' + i, kit: 'probe', w: 100, h: 100, d: box })) });
  });

  const ih = await bench(page, 'the iron hive', 'http://localhost:4321/ironhive/', null,
    'ironhive/panel-wide.png');
  const l2 = await bench(page, 'lab 2', 'http://localhost:4321/lab2/', seed);

  console.log('\n── both at once ' + '─'.repeat(32));
  say(ih.length > 0 && ih.every(k => k.indexOf('knoll-ironhive:') === 0),
    'the hive saves under its own name', ih.join(' ') || 'NOTHING SAVED');
  say(l2.length > 0 && l2.every(k => k.indexOf('knoll-lab2:') === 0),
    'and lab 2 under its own, sharing the origin', l2.join(' ') || 'NOTHING SAVED');

  say(!errs.length, 'no page errors', errs.join(' | '));
  console.log('\n' + (fails ? fails + ' FAILED' : 'all checks passed'));
  await page.waitForTimeout(400);
  await browser.close();
  process.exit(fails ? 1 : 0);
})();
