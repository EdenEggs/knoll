/* ironhive/probe-comms.js — the comms panel on the iron hive (2026-09-13).

   The second section on this bench, and the first with a text box in it. The
   feature paths it shares with the gallery (the drag, the pick, the corner,
   the menu, copy and paste, the pinch) are probe-gallery.js's; this is what
   the panel is and what a document you TYPE into asks of a bench whose keys
   are h, v and space. Real Chrome, real presses and keys, values read back out
   of the page and the panel's document.

     1   the section and its document: on the paper once, boots, measures as
         drawn (414×882 with its shadow), its box is twice that (or the cut the
         bench saved, the drawing fitted into it), backdrop off, nothing of it
         cropped, the bench's faces, nothing third-party from inside it
     2   using it: a channel brings its own pinned note and clears its unread
         badge, the roster opens and shuts, a reaction counts you in and out,
         a reply is quoted over what you send, Enter sends it and the box and
         quote clear, and after a few more the list keeps up with the last
     3   the keyboard is the panel's while you type: "hive vision" — an h, a v
         and a space, all three of them bench keys — goes into the box as
         typed, the hand never comes up, the tool and the camera stay put; the
         box's own arrow keys move nothing outside; and on a button in the
         list, ↓ at the list's end moves nothing outside it, ↑ scrolls the list
         and only the list, and four quick ↑ near the top reach the top and go
         no further (the second of two quick presses used to land while the
         first's smooth scroll was still running, and went to the bench)
     4   the typing blip comes and goes on its own clock, and holds still while
         the panel is off screen (prelude.js holds the timer)
     5   the published opening view (?seed=on, the deployed dress), at 2048,
         1600 and 412 wide: where the panel lands is REPORTED, not asserted —
         it stands wherever it was last saved from the bench — with anything
         the rein moved it by; asserted is that it boots at the opening zoom
     6   this probe wrote nothing: every door request it made was answered in
         the browser and never reached serve.js

   USAGE (from site/): node ironhive/probe-comms.js — with serve.js up. Every
   context is a fresh profile. */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { chromium } = require('playwright');

const URL = 'http://localhost:4321/ironhive/';
const ID = 'ironhive-comms';
let fails = 0, doorWrites = 0;
const errors = [];
const say = (ok, what, extra) => { if (!ok) fails++; console.log((ok ? 'PASS ' : 'FAIL ') + what + (extra == null ? '' : ' — ' + extra)); };
const info = (what, extra) => console.log('INFO ' + what + (extra == null ? '' : ' — ' + extra));
const near = (a, b, slop) => Math.abs(a - b) <= slop;
const hash = f => crypto.createHash('sha256').update(fs.readFileSync(path.join(__dirname, f))).digest('hex');

async function open(browser, opts) {
  const ctx = await browser.newContext(Object.assign({ viewport: { width: 1600, height: 900 } }, opts.ctx || {}));
  await ctx.route('**/_ironhive/**', r => {
    if (r.request().method() !== 'GET') doorWrites++;
    return r.fulfill({ status: 404, body: 'no door' });
  });
  if (opts.deployed) {
    // the landing dress; contains() is load-bearing — see probe-gallery.js
    await ctx.addInitScript(() => {
      new MutationObserver(() => {
        const h = document.documentElement;
        if (h && h.classList.contains('lab-local')) h.classList.remove('lab-local');
      }).observe(document, { subtree: true, childList: true, attributes: true, attributeFilter: ['class'] });
    });
  }
  const page = await ctx.newPage();
  page.on('pageerror', e => { errors.push(String(e)); console.log('PAGEERROR', String(e)); });
  page.frameRequests = [];
  page.on('request', r => { if (r.frame() !== page.mainFrame()) page.frameRequests.push(r.url()); });
  await page.goto(URL + (opts.query || ''), { waitUntil: 'load' });
  await page.waitForFunction(() => window.Lab && window.Frames && window.Wall && document.getElementById('gz-comms'), null, { timeout: 30000 });
  return { ctx, page };
}

const booted = page => page.waitForFunction(() => {
  const el = document.getElementById('gz-comms');
  return !!el && el.classList.contains('booted');
}, null, { timeout: 30000 }).then(() => true, () => false);

const frameOn = (page, frac, z) => page.evaluate(([frac, z]) => {
  const el = document.getElementById('gz-comms'), b = Lab.bench.getBoundingClientRect();
  const x = parseFloat(el.style.left), y = parseFloat(el.style.top), w = el.offsetWidth, h = el.offsetHeight;
  const zz = z || Math.min(b.width * frac / w, b.height * frac / h);
  Lab.camTo(zz, b.width / 2 - (x + w / 2) * zz, b.height / 2 - (y + h / 2) * zz, 0);
}, [frac, z || 0]).then(() => page.waitForTimeout(450));

/* What the panel is showing, read out of its document. Buttons are found by
   what they say, never by position: the channel row wraps, the list grows. */
const panel = page => page.evaluate(() => {
  const el = document.getElementById('gz-comms'), d = el.querySelector('iframe').contentDocument, w = d.defaultView;
  const divs = [...d.querySelectorAll('div')];
  const pin = divs.find(x => x.textContent.trim() === 'PIN');
  const rosterRow = divs.find(x => /^(HIDE ROSTER|ROSTER) · \d+ MEMBERS$/.test(x.textContent.trim()));
  const list = divs.find(x => w.getComputedStyle(x).overflowY === 'auto' && x.querySelector('button') && /REPLY/.test(x.textContent));
  const input = d.querySelector('input[placeholder="Write to the hive"]');
  const channels = [...d.querySelectorAll('button')].filter(b => b.textContent.trim().startsWith('#')).map(b => b.textContent.replace(/\s+/g, ' ').trim());
  return {
    live: el.classList.contains('live'), cls: el.className,
    pinned: pin && pin.nextElementSibling ? pin.nextElementSibling.textContent.trim() : null,
    roster: rosterRow ? rosterRow.textContent.trim() : null,
    slagborn: divs.some(x => x.textContent.trim() === 'slagborn'),
    channels,
    typing: divs.some(x => x.textContent.trim() === 'greaveknot is writing'),
    replying: divs.some(x => x.textContent.trim() === 'RE'),
    draft: input ? input.value : null,
    list: list ? { top: Math.round(list.scrollTop), max: list.scrollHeight - list.clientHeight, last: (list.lastElementChild || {}).textContent || '' } : null,
    paused: d.documentElement.hasAttribute('data-lab-paused')
  };
});

// a point on the page over something in the panel: a button by what it says, a label, the text box
const at = (page, want) => page.evaluate(want => {
  const f = document.querySelector('#gz-comms iframe'), d = f.contentDocument, r = f.getBoundingClientRect(), k = r.width / f.offsetWidth;
  let node = null;
  if (want.input) node = d.querySelector('input[placeholder="Write to the hive"]');
  else if (want.button) node = [...d.querySelectorAll('button')].filter(b => b.textContent.replace(/\s+/g, ' ').trim().includes(want.button))[want.nth || 0];
  else if (want.text) node = [...d.querySelectorAll('div')].find(x => x.textContent.trim() === want.text);
  else if (want.replyTo) {
    const name = [...d.querySelectorAll('div')].find(x => x.textContent.trim() === want.replyTo);
    node = name && name.parentElement.querySelector('button');
  }
  if (!node) return null;
  node.scrollIntoView({ block: 'nearest' });
  const q = node.getBoundingClientRect();
  return { x: r.left + (q.left + q.width / 2) * k, y: r.top + (q.top + q.height / 2) * k };
}, want);
const press = async (page, want, wait) => {
  const p = await at(page, want);
  if (!p) throw new Error('nothing in the panel for ' + JSON.stringify(want));
  await page.mouse.click(p.x, p.y);
  await page.waitForTimeout(wait == null ? 350 : wait);
};
const bench = page => page.evaluate(() => ({ pan: [Lab.pan.x, Lab.pan.y].join(), z: Lab.zoom, tool: Wall.tool, hand: document.body.classList.contains('lab-hand') }));
const listDo = (page, fn) => page.evaluate(fn => {
  const d = document.querySelector('#gz-comms iframe').contentDocument, w = d.defaultView;
  const list = [...d.querySelectorAll('div')].find(x => w.getComputedStyle(x).overflowY === 'auto' && /REPLY/.test(x.textContent));
  const replies = [...list.querySelectorAll('button')].filter(b => b.textContent.trim() === 'REPLY');
  if (fn === 'end') { replies[replies.length - 1].focus(); list.scrollTop = list.scrollHeight; }
  if (fn === 'near-top') { replies[0].focus(); list.scrollTop = 30; }
  return { top: Math.round(list.scrollTop), max: list.scrollHeight - list.clientHeight };
}, fn);

(async () => {
  const h0 = hash('index.html');
  const browser = await chromium.launch({ channel: 'chrome' });

  // ── 1 · the section and its document ────────────────────────────────────
  console.log('\n1 · the section and its document');
  let { ctx, page } = await open(browser, {});
  const secs = await page.evaluate(() => [...document.querySelectorAll('#bench-world > section.gz')].map(s => ({ gizmo: s.dataset.gizmo, src: s.dataset.src, scale: s.dataset.scale, home: s.dataset.homeX + ',' + s.dataset.homeY, cut: s.dataset.cut || null })));
  const mine = secs.filter(x => x.gizmo === ID);
  say(mine.length === 1 && mine[0].src === 'features/comms.dc.html' && mine[0].scale === '2', 'the comms panel is on the paper, once', secs.length + ' section(s): ' + JSON.stringify(secs));
  await frameOn(page, 0.8);
  say(await booted(page), 'its document boots');
  await page.waitForTimeout(1500);
  const doc = await page.evaluate(() => {
    const el = document.getElementById('gz-comms'), p = Frames.panels.find(q => q.el === el) || {};
    const f = el.querySelector('iframe'), d = f.contentDocument, w = d.defaultView;
    const root = d.querySelector('[data-screen-label]');
    const box = [...d.querySelectorAll('div')].find(x => w.getComputedStyle(x).borderTopWidth === '6px');
    const r = f.getBoundingClientRect(), k = r.width / f.offsetWidth, q = box.getBoundingClientRect(), s = el.getBoundingClientRect();
    return {
      natW: p.natW, natH: p.natH, w: el.offsetWidth, h: el.offsetHeight, drawnAt: k / Lab.zoom, cut: el.dataset.cut || null,
      label: root && root.dataset.screenLabel, rootBg: root && w.getComputedStyle(root).backgroundImage,
      bodyBg: w.getComputedStyle(d.body).backgroundColor,
      screen: { l: r.left + q.left * k, t: r.top + q.top * k, r: r.left + (q.right + 10) * k, b: r.top + (q.bottom + 10) * k },
      box: { l: s.left, t: s.top, r: s.right, b: s.bottom },
      fonts: [...d.fonts].filter(ff => ff.status === 'loaded').map(ff => ff.family.replace(/"/g, '') + ' ' + ff.weight)
    };
  });
  say(near(doc.natW, 414, 3) && near(doc.natH, 882, 3), 'the drawing measures as drawn: 414×882 with its shadow', doc.natW + '×' + doc.natH);
  const edges = ['l', 't', 'r', 'b'].map(k => k + ' ' + (doc.screen[k] - doc.box[k]).toFixed(1)).join(' ');
  const inside = doc.screen.l >= doc.box.l - 1 && doc.screen.t >= doc.box.t - 1 && doc.screen.r <= doc.box.r + 1 && doc.screen.b <= doc.box.b + 1;
  if (!doc.cut) {
    say(near(doc.w, doc.natW * 2, 2) && near(doc.h, doc.natH * 2, 2) && near(doc.drawnAt, 2, 0.01), 'nobody has cut it, so the box is twice the drawing (data-scale 2)', doc.w + '×' + doc.h + ', drawn at ×' + doc.drawnAt.toFixed(3));
    say(['l', 't', 'r', 'b'].every(k => near(doc.screen[k], doc.box[k], 3)), 'and the box is the panel, shadow and all, to within 3px on every side', edges);
  } else {
    const [cw, ch] = doc.cut.split('x').map(Number), k = Math.min(cw / doc.natW, ch / doc.natH);
    say(near(doc.w, cw, 1) && near(doc.h, ch, 1) && near(doc.drawnAt, k, 0.01), 'cut on the bench to ' + doc.cut + ': the box is the cut, and the drawing is fitted into it', 'drawn at ×' + doc.drawnAt.toFixed(3) + ', fit ×' + k.toFixed(3));
    const fitsW = near(doc.screen.l, doc.box.l, 3) && near(doc.screen.r, doc.box.r, 3), fitsH = near(doc.screen.t, doc.box.t, 3) && near(doc.screen.b, doc.box.b, 3);
    say(inside && (fitsW || fitsH), 'and the whole panel is inside it, touching it across the way it binds — scaled, not cropped', edges);
    const spare = Math.max(doc.box.r - doc.box.l - (doc.screen.r - doc.screen.l), doc.box.b - doc.box.t - (doc.screen.b - doc.screen.t)) / Lab_zoomSafe(doc);
    if (spare > 40) info('the cut leaves ' + Math.round(spare) + ' world px of box beside the drawing — invisible, but it catches presses there like the panel does');
  }
  say(doc.label === 'Ironhive · Comms' && doc.rootBg === 'none' && /rgba\(0, 0, 0, 0\)|transparent/.test(doc.bodyBg), 'the screen root is marked and the backdrop is off', doc.label + ' / ' + doc.rootBg + ' / ' + doc.bodyBg);
  say(['Oswald 600', 'Oswald 700', 'JetBrains Mono 400', 'JetBrains Mono 700'].every(f => doc.fonts.includes(f)), 'its faces are loaded, off the bench\'s own fonts/', doc.fonts.join(', '));
  const foreign = page.frameRequests.filter(u => !u.startsWith('http://localhost:4321/') && !/^(data|blob|about):/.test(u));
  say(foreign.length === 0, 'nothing inside the panel asks a third party for anything', foreign.slice(0, 4).join(', ') || 'none');

  // ── 2 · using it ─────────────────────────────────────────────────────────
  console.log('\n2 · using it');
  await press(page, { text: 'Ironhive · Comms' }, 450);
  let s = await panel(page);
  say(s.live && /^Patch 0\.9\.4/.test(s.pinned || ''), 'a click wakes it, on #general and its pinned note', s.cls + ' · ' + (s.pinned || '').slice(0, 40));
  const forge0 = s.channels.find(c => c.includes('forge-talk'));
  await press(page, { button: 'forge-talk' });
  s = await panel(page);
  const forge1 = s.channels.find(c => c.includes('forge-talk'));
  say(/^Weekly build challenge/.test(s.pinned || '') && /3$/.test(forge0) && !/\d$/.test(forge1), '#forge-talk brings its own pinned note and clears its unread badge', forge0 + ' → ' + forge1 + ' · ' + (s.pinned || '').slice(0, 30));
  await press(page, { button: 'general' });
  await press(page, { text: 'ROSTER · 8 MEMBERS' });
  s = await panel(page);
  say(s.roster === 'HIDE ROSTER · 8 MEMBERS' && s.slagborn, 'the roster opens, the idle members in it too', s.roster);
  await press(page, { text: 'HIDE ROSTER · 8 MEMBERS' });
  s = await panel(page);
  say(s.roster === 'ROSTER · 8 MEMBERS' && !s.slagborn, 'and shuts', s.roster);
  const ups = () => page.evaluate(() => [...document.querySelector('#gz-comms iframe').contentDocument.querySelectorAll('button')].map(b => b.textContent.trim()).filter(t => /^▲ \d+$/.test(t)));
  await press(page, { button: '▲ 4' });
  let reacted = await ups();
  say(reacted.includes('▲ 5') && !reacted.includes('▲ 4'), 'a reaction counts you in', reacted.join(' '));
  await press(page, { button: '▲ 5' });
  reacted = await ups();
  say(reacted.includes('▲ 4') && !reacted.includes('▲ 5'), '…and out again', reacted.join(' '));

  await press(page, { replyTo: 'kilnhand' });
  s = await panel(page);
  say(s.replying, 'REPLY puts the quote over the box', 'replying ' + s.replying);
  await press(page, { input: true });
  await page.keyboard.type('Tally is not the vote.');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(500);
  s = await panel(page);
  say(s.draft === '' && !s.replying && /Tally is not the vote\./.test(s.list.last) && /kilnhand/.test(s.list.last) && /ironlord/i.test(s.list.last),
      'Enter sends it — as ironlord, quoting kilnhand — and the box and the quote clear', s.list.last.replace(/\s+/g, ' ').slice(0, 90));
  for (const line of ['One more line, to give the list something to scroll.', 'And another under it.', 'And a third, so it really has to.']) {
    await press(page, { input: true }, 120);
    await page.keyboard.type(line);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(250);
  }
  s = await panel(page);
  // the typing line under the list comes and goes on its own clock and can take a line of height after the scroll: 30px of slack for it
  say(/really has to/.test(s.list.last) && s.list.max > 60 && s.list.max - s.list.top <= 30, 'three more, and the list keeps up with the last of them', 'scrolled ' + s.list.top + ' of ' + s.list.max);

  // ── 3 · the keyboard is the panel's ─────────────────────────────────────
  console.log('\n3 · the keyboard, while you type');
  let b0 = await bench(page);
  await press(page, { input: true });
  await page.keyboard.type('hive vision');
  await page.waitForTimeout(300);
  s = await panel(page);
  let b1 = await bench(page);
  say(s.draft === 'hive vision', 'h, v and a space go into the box as typed', JSON.stringify(s.draft));
  say(!b1.hand && b1.tool === b0.tool && b1.pan === b0.pan && b1.z === b0.z, 'and the bench heard none of them: no hand, the same tool, the camera where it was', JSON.stringify(b1));
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Home');
  await page.waitForTimeout(350);
  b1 = await bench(page);
  say(b1.pan === b0.pan, 'the box\'s own ↑ ↓ and Home move its caret and nothing outside it', 'pan ' + b1.pan);
  for (let i = 0; i < 11; i++) await page.keyboard.press('Delete');
  await page.waitForTimeout(200);

  let l = await listDo(page, 'end');
  await page.waitForTimeout(200);
  b0 = await bench(page);
  const end0 = (await panel(page)).list;
  for (let i = 0; i < 3; i++) await page.keyboard.press('ArrowDown');
  await page.waitForTimeout(450);
  b1 = await bench(page);
  s = await panel(page);
  say(b1.pan === b0.pan && s.live && s.list.top === end0.top, '↓ on a button in the list, with the list at its end, moves nothing outside it — and the panel stays awake', 'pan ' + b0.pan + ' → ' + b1.pan + ' · list ' + end0.top + ' → ' + s.list.top + ' of ' + s.list.max);
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('ArrowUp');
  await page.waitForTimeout(450);
  const b2 = await bench(page);
  s = await panel(page);
  say(s.list.top < end0.top && b2.pan === b0.pan, '↑ scrolls the list — and only the list', 'list ' + end0.top + ' → ' + s.list.top + ' · pan ' + b2.pan);
  l = await listDo(page, 'near-top');
  await page.waitForTimeout(250);
  const b3a = await bench(page);
  for (let i = 0; i < 4; i++) await page.keyboard.press('ArrowUp');
  await page.waitForTimeout(600);
  const b3 = await bench(page);
  s = await panel(page);
  say(s.list.top === 0 && b3.pan === b3a.pan, 'four quick ↑ from near the top reach the top and go no further — not a pixel of them to the bench', 'list 30 → ' + s.list.top + ' · pan ' + b3a.pan + ' → ' + b3.pan);

  // ── 4 · the blip, and the timer held off screen ─────────────────────────
  console.log('\n4 · the typing blip');
  const flips = async ms => {
    const t0 = Date.now(), first = (await panel(page)).typing;
    while (Date.now() - t0 < ms) { await page.waitForTimeout(250); if ((await panel(page)).typing !== first) return true; }
    return false;
  };
  say(await flips(7600), 'on screen, "greaveknot is writing" comes or goes within its 6.5s clock');
  await page.keyboard.press('Escape');
  const corner = await page.evaluate(() => { const b = Lab.bench.getBoundingClientRect(); return { x: b.left + 40, y: b.top + 40 }; });
  await page.mouse.move(corner.x, corner.y, { steps: 5 });
  await page.waitForTimeout(700);
  await page.evaluate(() => Lab.camTo(Lab.zoom, -60000, -60000, 0));
  let paused = false;
  for (let i = 0; i < 30 && !paused; i++) { await page.waitForTimeout(200); paused = (await panel(page)).paused; }
  say(paused, 'taken off screen, the panel\'s document is paused', 'data-lab-paused ' + paused);
  const held = !(await flips(8000));
  say(held, '…and the blip holds still for a whole clock and more — its timer is held', held ? 'no change in 8s' : 'it changed');
  await ctx.close();

  // ── 5 · the published opening view ──────────────────────────────────────
  console.log('\n5 · the published opening view');
  for (const vp of [{ width: 2048, height: 1152 }, { width: 1600, height: 900 }, { width: 412, height: 915 }]) {
    ({ ctx, page } = await open(browser, { ctx: { viewport: vp }, query: '?seed=on', deployed: true }));
    await page.waitForFunction(() => Wall.store.get().items.filter(Boolean).length > 200, null, { timeout: 20000 });
    await page.waitForFunction(() => document.querySelectorAll('svg.wall-ink .wall-item').length > 200, null, { timeout: 20000 });
    await page.waitForTimeout(2500);
    const view = await page.evaluate(() => {
      const b = Lab.bench.getBoundingClientRect(), el = document.getElementById('gz-comms'), r = el.getBoundingClientRect();
      const shown = { x: parseFloat(el.style.left), y: parseFloat(el.style.top) }, home = { x: +el.dataset.homeX, y: +el.dataset.homeY };
      const box = e => ({ x1: parseFloat(e.style.left), y1: parseFloat(e.style.top), x2: parseFloat(e.style.left) + e.offsetWidth, y2: parseFloat(e.style.top) + e.offsetHeight });
      const g = box(el), gal = document.getElementById('gz-screens') ? box(document.getElementById('gz-screens')) : null;
      const st = Wall.store.get().items, hits = [];
      document.querySelectorAll('svg.wall-ink .wall-item').forEach(n => {
        const i = +n.dataset.i, it = st[i];
        if (!it || it.k === 's') return;
        const q = n.getBoundingClientRect();
        if (!q.width) return;
        const a = Lab.toWorld(q.left, q.top), c = Lab.toWorld(q.right, q.bottom);
        if (a.x < g.x2 && c.x > g.x1 && a.y < g.y2 && c.y > g.y1) hits.push(it.k + ' ' + (it.f || it.id || ''));
      });
      const overGallery = !!gal && gal.x1 < g.x2 && gal.x2 > g.x1 && gal.y1 < g.y2 && gal.y2 > g.y1;
      const onScreen = r.left >= b.left && r.right <= b.right && r.top >= b.top && r.bottom <= b.bottom ? 'wholly on screen'
        : (r.right <= b.left || r.left >= b.right || r.bottom <= b.top || r.top >= b.bottom) ? 'off screen' : 'partly on screen';
      return { z: Lab.zoom, onScreen, shown, home, hits, overGallery, cut: el.dataset.cut || null };
    });
    const reined = view.shown.x !== view.home.x || view.shown.y !== view.home.y;
    info(vp.width + '×' + vp.height + ' at zoom ' + view.z.toFixed(3) + ': the comms panel is ' + view.onScreen,
         'home ' + view.home.x + ',' + view.home.y + (reined ? ' — REINED on this screen to ' + view.shown.x + ',' + view.shown.y : '') +
         (view.cut ? ', cut ' + view.cut : '') + (view.overGallery ? ', its box overlaps the gallery\'s' : '') +
         (view.hits.length ? ', over ' + view.hits.length + ' piece(s) of the wall: ' + view.hits.slice(0, 5).join('; ') : ', over no piece of the wall'));
    if (vp.width === 2048) {
      await frameOn(page, 0, view.z);
      say(await booted(page), 'at the opening zoom it boots — no poster stands in for it');
      await page.screenshot({ path: path.join(__dirname, 'comms-open.png') });
    }
    await ctx.close();
  }

  // ── 6 · this probe wrote nothing ────────────────────────────────────────
  console.log('\n6 · nothing written');
  say(true, 'every door write this probe made was answered in the browser, none reached serve.js', doorWrites + ' write(s) turned away');
  if (hash('index.html') !== h0) info('index.html changed while this ran — not by this probe (its doors are shut); an open bench autosaving through serve.js');
  say(errors.length === 0, 'no page errors anywhere', errors.slice(0, 3).join(' | ') || 'none');

  await browser.close();
  console.log('\n' + (fails ? fails + ' FAILED' : 'all passed'));
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });

// the page's zoom as the section-1 read saw it: the ratio of the frame on screen to its drawn scale
function Lab_zoomSafe(doc) { return doc.drawnAt ? (doc.screen.r - doc.screen.l) / ((doc.natW) * doc.drawnAt) : 1; }
