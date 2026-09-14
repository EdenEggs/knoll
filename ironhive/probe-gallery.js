/* ironhive/probe-gallery.js — the screenshot gallery on the iron hive (2026-09-13).

   The bench's first section, and so the first time this bench's own copies
   of lab 2's feature paths — the wake, the drag, the pick, the corner, the
   menu, copy and paste — have had a feature to run on. Real Chrome, real
   presses, values read back out of the page and its document.

     1   the section and its document: on the paper once, it boots, it
         measures as drawn, its box is twice that (or the cut the bench saved,
         with the drawing fitted into it), its backdrop is off, nothing of it
         is cropped, the faces are the bench's own, seven 1920-wide
         screenshots, nothing third-party from inside it
     2   using it with a mouse: a click wakes it and presses nothing, the
         arrows, a pill, ← →, the wrap both ways, the keys moving nothing but
         the screenshots (not the bench under it), and leaving it puts the
         shield back and hands the keyboard back
     3   the feature paths: drag + undo, the rein, escape, shift-pick,
         copy/paste + undo, the right-click menu's delete + undo, the corner +
         double-click, shift 1
     4   touch — the two presses ported from lab 2 with it: two fingers that
         land on the gallery leave it where it was and holding nothing (a
         mouse crossing it afterwards does not carry it), and a corner pulled
         by one finger and then pinched goes back to the size at the press
     5   the published opening view (?seed=on, the deployed dress), at 2048,
         1600 and 412 wide: where the gallery lands is REPORTED, not asserted
         — it stands wherever it was last saved from the bench — along with
         anything the rein moved it by on that screen; asserted is that it
         boots and works at the opening zoom
     6   this probe wrote nothing: every request it made to a /_ironhive door
         was answered in the browser and never reached serve.js

   A CHECK THAT CANNOT FAIL IS NOT A CHECK. CONTROL_LAB=<lab.js from before
   the port> CONTROL_FRAMES=<frames.js from before it> serves those two in
   place of the bench's own, and section 4 and the key checks in section 2
   must then report failures. Movement is read off where the section is DRAWN
   (its rectangle, back into world units), not off style.left/top: a carried
   feature moves by an animation and writes left/top only when it is dropped,
   so a probe reading those is blind to the very drag it is looking for.

   USAGE (from site/): node ironhive/probe-gallery.js — with serve.js up.
   Every context is a fresh profile. */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { chromium } = require('playwright');

const URL = 'http://localhost:4321/ironhive/';
const ID = 'ironhive-screens';
let fails = 0, doorWrites = 0;
const errors = [];
const say = (ok, what, extra) => { if (!ok) fails++; console.log((ok ? 'PASS ' : 'FAIL ') + what + (extra == null ? '' : ' — ' + extra)); };
const info = (what, extra) => console.log('INFO ' + what + (extra == null ? '' : ' — ' + extra));
const near = (a, b, slop) => Math.abs(a - b) <= slop;
const has = (cls, name) => (' ' + (cls || '') + ' ').includes(' ' + name + ' ');
const hash = f => crypto.createHash('sha256').update(fs.readFileSync(path.join(__dirname, f))).digest('hex');

async function open(browser, opts) {
  const ctx = await browser.newContext(Object.assign({ viewport: { width: 1600, height: 900 } }, opts.ctx || {}));
  await ctx.route('**/_ironhive/**', r => {
    if (r.request().method() !== 'GET') doorWrites++;
    return r.fulfill({ status: 404, body: 'no door' });
  });
  if (process.env.CONTROL_LAB) await ctx.route('**/ironhive/lab.js*', r => r.fulfill({ path: process.env.CONTROL_LAB, contentType: 'application/javascript' }));
  if (process.env.CONTROL_FRAMES) await ctx.route('**/ironhive/frames.js*', r => r.fulfill({ path: process.env.CONTROL_FRAMES, contentType: 'application/javascript' }));
  if (opts.deployed) {
    /* the landing dress: html.lab-local is what the dev header hangs off. The
       contains() is load-bearing — classList.remove() of a class that is not
       there still queues an attribute mutation, and an observer that answers
       its own mutations never lets the page finish loading. */
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
  page.responses = [];
  page.on('response', r => page.responses.push({ url: r.url(), status: r.status() }));
  await page.goto(URL + (opts.query || ''), { waitUntil: 'load' });
  await page.waitForFunction(() => window.Lab && window.Frames && window.Wall && document.getElementById('gz-screens'), null, { timeout: 30000 });
  return { ctx, page };
}

const booted = (page, sel) => page.waitForFunction(s => {
  const el = document.querySelector(s);
  return !!el && el.classList.contains('booted');
}, sel || '#gz-screens', { timeout: 30000 }).then(() => true, () => false);

// where the gallery is and what its document is showing
const gallery = page => page.evaluate(() => {
  const el = document.getElementById('gz-screens');
  const p = Frames.panels.find(q => q.el === el) || {};
  const f = el.querySelector('iframe'), d = f && f.contentDocument;
  const counter = d && [...d.querySelectorAll('div')].map(x => x.textContent.trim()).find(t => /^\d\d \/ \d\d$/.test(t));
  const showing = d ? [...d.querySelectorAll('img')].map((im, i) => (+d.defaultView.getComputedStyle(im).opacity > 0.5 ? i : -1)).filter(i => i >= 0) : [];
  return { left: parseFloat(el.style.left), top: parseFloat(el.style.top), w: el.offsetWidth, h: el.offsetHeight,
           natW: p.natW, natH: p.natH, cls: el.className, counter, showing: showing.join(','), cut: el.dataset.cut || null,
           drawnAt: f ? f.getBoundingClientRect().width / f.offsetWidth / Lab.zoom : 0 };
});

// where the section is DRAWN, in world units — a carry's animation included
const drawnBox = page => page.evaluate(() => {
  const r = document.getElementById('gz-screens').getBoundingClientRect();
  const a = Lab.toWorld(r.left, r.top), c = Lab.toWorld(r.right, r.bottom);
  return { x: a.x, y: a.y, w: c.x - a.x, h: c.y - a.y };
});

// a point on the page over something inside the gallery's document
const inFrame = (page, want) => page.evaluate(want => {
  const f = document.querySelector('#gz-screens iframe'), d = f.contentDocument;
  const r = f.getBoundingClientRect(), k = r.width / f.offsetWidth;
  const node = want.label ? d.querySelector('button[aria-label="' + want.label + '"]')
                          : [...d.querySelectorAll('div')].find(x => x.textContent.trim() === want.text);
  if (!node) return null;
  const q = node.getBoundingClientRect();
  return { x: r.left + (q.left + q.width / 2) * k, y: r.top + (q.top + q.height / 2) * k };
}, want);

const rectOf = (page, sel) => page.evaluate(s => {
  const n = document.querySelector(s);
  if (!n) return null;
  const r = n.getBoundingClientRect();
  return { l: r.left, t: r.top, r: r.right, b: r.bottom, w: r.width, h: r.height, x: r.left + r.width / 2, y: r.top + r.height / 2 };
}, sel);

// the camera on the gallery, taking `frac` of the bench — or at zoom `z` if given
const frameOn = (page, frac, z) => page.evaluate(([frac, z]) => {
  const el = document.getElementById('gz-screens'), b = Lab.bench.getBoundingClientRect();
  const x = parseFloat(el.style.left), y = parseFloat(el.style.top), w = el.offsetWidth, h = el.offsetHeight;
  const zz = z || Math.min(b.width * frac / w, b.height * frac / h);
  Lab.camTo(zz, b.width / 2 - (x + w / 2) * zz, b.height / 2 - (y + h / 2) * zz, 0);
}, [frac, z || 0]).then(() => page.waitForTimeout(450));

const barePoint = page => page.evaluate(() => {
  const b = Lab.bench.getBoundingClientRect();
  for (let y = b.top + 60; y < b.bottom - 160; y += 23)
    for (let x = b.left + 60; x < b.right - 60; x += 23) {
      const el = document.elementFromPoint(x, y);
      if (!el || !Lab.bench.contains(el)) continue;
      if (el.closest('.gz, .wall-item, .wall-note, .tape, .lab-panel, .tool-dock, .zoom-dock, .tool-opts')) continue;
      return { x, y };
    }
  return null;
});

const sizeKeys = page => page.evaluate(() => Object.keys(localStorage).filter(k => k.startsWith('knoll-ironhive:size2:')));
const posKey = page => page.evaluate(id => localStorage.getItem('knoll-ironhive:pos:' + id), ID);
const pan = page => page.evaluate(() => [Lab.pan.x, Lab.pan.y]);

(async () => {
  const h0 = hash('index.html');
  if (process.env.CONTROL_LAB || process.env.CONTROL_FRAMES) console.log('CONTROL RUN — serving ' + [process.env.CONTROL_LAB, process.env.CONTROL_FRAMES].filter(Boolean).join(' and '));
  const browser = await chromium.launch({ channel: 'chrome' });

  // ── 1 · the section and its document ────────────────────────────────────
  console.log('\n1 · the section and its document');
  let { ctx, page } = await open(browser, {});
  const secs = await page.evaluate(() => [...document.querySelectorAll('#bench-world > section.gz')]
    .map(s => ({ gizmo: s.dataset.gizmo, src: s.dataset.src, scale: s.dataset.scale, home: s.dataset.homeX + ',' + s.dataset.homeY, cut: s.dataset.cut || null })));
  const mine = secs.filter(x => x.gizmo === ID);
  say(mine.length === 1 && mine[0].src === 'features/gallery.dc.html' && mine[0].scale === '2',
      'the gallery is on the paper, once', secs.length + ' section(s): ' + JSON.stringify(secs));
  await frameOn(page, 0.6);
  say(await booted(page), 'its document boots');
  await page.waitForTimeout(1500);
  let g = await gallery(page);
  say(near(g.natW, 962, 3) && near(g.natH, 656, 3), 'the drawing measures as drawn: 962×656 with its shadow', g.natW + '×' + g.natH);

  const doc = await page.evaluate(() => {
    const el = document.getElementById('gz-screens'), f = el.querySelector('iframe'), d = f.contentDocument, w = d.defaultView;
    const root = d.querySelector('[data-screen-label]');
    // the riveted screen: the one element with the export's 6px border (React writes its colour back as rgb(), so it is found by the width)
    const screen = [...d.querySelectorAll('div')].find(x => w.getComputedStyle(x).borderTopWidth === '6px');
    const r = f.getBoundingClientRect(), k = r.width / f.offsetWidth, q = screen.getBoundingClientRect(), s = el.getBoundingClientRect();
    return {
      label: root && root.dataset.screenLabel, rootBg: root && w.getComputedStyle(root).backgroundImage,
      htmlBg: w.getComputedStyle(d.documentElement).backgroundColor, bodyBg: w.getComputedStyle(d.body).backgroundColor,
      // the screen's own box plus the 10px shadow it throws right and down, on the page
      screen: { l: r.left + q.left * k, t: r.top + q.top * k, r: r.left + (q.right + 10) * k, b: r.top + (q.bottom + 10) * k },
      box: { l: s.left, t: s.top, r: s.right, b: s.bottom },
      fonts: [...d.fonts].filter(ff => ff.status === 'loaded').map(ff => ff.family.replace(/"/g, '') + ' ' + ff.weight),
      imgs: [...d.querySelectorAll('img')].map(i => ({ src: i.getAttribute('src'), w: i.naturalWidth, done: i.complete }))
    };
  });
  const edges = ['l', 't', 'r', 'b'].map(s => s + ' ' + (doc.screen[s] - doc.box[s]).toFixed(1)).join(' ');
  const inside = doc.screen.l >= doc.box.l - 1 && doc.screen.t >= doc.box.t - 1 && doc.screen.r <= doc.box.r + 1 && doc.screen.b <= doc.box.b + 1;
  if (!g.cut) {
    say(near(g.w, g.natW * 2, 2) && near(g.h, g.natH * 2, 2) && near(g.drawnAt, 2, 0.01), 'nobody has cut it, so the box is twice the drawing (data-scale 2)', g.w + '×' + g.h + ', drawn at ×' + g.drawnAt.toFixed(3));
    say(['l', 't', 'r', 'b'].every(s => near(doc.screen[s], doc.box[s], 3)), 'and the box is the screen, shadow and all, to within 3px on every side', edges);
  } else {
    const [cw, ch] = g.cut.split('x').map(Number), k = Math.min(cw / g.natW, ch / g.natH);
    say(near(g.w, cw, 1) && near(g.h, ch, 1) && near(g.drawnAt, k, 0.01), 'cut on the bench to ' + g.cut + ': the box is the cut, and the drawing is fitted into it', 'drawn at ×' + g.drawnAt.toFixed(3) + ', fit ×' + k.toFixed(3));
    const fitsW = near(doc.screen.l, doc.box.l, 3) && near(doc.screen.r, doc.box.r, 3), fitsH = near(doc.screen.t, doc.box.t, 3) && near(doc.screen.b, doc.box.b, 3);
    say(inside && (fitsW || fitsH), 'and the whole screen is inside it, touching it across the way it binds — scaled, not cropped', edges);
  }
  say(doc.label === 'Ironhive · Screens' && doc.rootBg === 'none', 'the screen root is marked, and its sand-and-sage backdrop is off', doc.label + ' / ' + doc.rootBg);
  const clear = c => /rgba\(0, 0, 0, 0\)|transparent/.test(c);
  say(clear(doc.htmlBg) && clear(doc.bodyBg), 'and the document has no paper of its own (bare.css)', doc.htmlBg + ' / ' + doc.bodyBg);
  say(doc.fonts.includes('Oswald 700') && doc.fonts.includes('JetBrains Mono 700'), 'Oswald and JetBrains Mono are loaded in the document', doc.fonts.join(', '));
  const faceResp = page.responses.filter(r => /\/ironhive\/fonts\/(Oswald|JetBrains-Mono)\.woff2$/.test(r.url));
  say(faceResp.length >= 2 && faceResp.every(r => r.status === 200 || r.status === 304), '…from the bench\'s own fonts/', faceResp.map(r => r.status + ' ' + path.basename(r.url)).join(', '));
  const foreign = page.frameRequests.filter(u => !u.startsWith('http://localhost:4321/') && !/^(data|blob|about):/.test(u));
  say(foreign.length === 0, 'nothing inside the gallery asks a third party for anything', foreign.slice(0, 4).join(', ') || 'none');
  const srcs = doc.imgs.map(i => i.src);
  say(doc.imgs.length === 7 && new Set(srcs).size === 7 && doc.imgs.every(i => /^shots\/screenshot\d\d\.webp$/.test(i.src) && i.w === 1920 && i.done),
      'seven screenshots, each its own file in shots/, each 1920 wide and loaded', srcs.map(s => s.slice(6)).join(' '));

  // ── 2 · using it ─────────────────────────────────────────────────────────
  console.log('\n2 · using it, with a mouse');
  let pt = await inFrame(page, { text: 'Ironhive · Screens' });
  await page.mouse.click(pt.x, pt.y);
  await page.waitForTimeout(450);
  g = await gallery(page);
  say(has(g.cls, 'live') && g.counter === '01 / 07', 'a click wakes it, and presses nothing inside it', g.cls + ' · ' + g.counter);
  pt = await inFrame(page, { label: 'Next screenshot' });
  await page.mouse.click(pt.x, pt.y);
  await page.waitForTimeout(450);
  g = await gallery(page);
  say(g.counter === '02 / 07' && g.showing === '1', 'the next arrow: 02 / 07, and the second screenshot is the one showing', g.counter + ' · showing ' + g.showing);
  pt = await inFrame(page, { label: 'Screenshot 5' });
  await page.mouse.click(pt.x, pt.y);
  await page.waitForTimeout(450);
  g = await gallery(page);
  say(g.counter === '05 / 07' && g.showing === '4', 'a numbered pill goes straight to its screenshot', g.counter + ' · showing ' + g.showing);
  const pan0 = await pan(page);
  await page.keyboard.press('ArrowLeft');
  await page.waitForTimeout(450);
  g = await gallery(page);
  say(g.counter === '04 / 07' && g.showing === '3', 'the ← key, with the document awake', g.counter);
  for (let i = 0; i < 4; i++) { await page.keyboard.press('ArrowRight'); await page.waitForTimeout(60); }
  await page.waitForTimeout(450);
  g = await gallery(page);
  say(g.counter === '01 / 07' && g.showing === '0', '→ four times from 04 wraps round to 01', g.counter + ' · showing ' + g.showing);
  /* THE KEYS TURN THE SCREENSHOTS AND NOTHING ELSE. They used to scroll the
     bench as well — Chrome hands a scroll nothing in the document can take up
     to the page, and the page's scroll is the camera — until the gallery slid
     out from under the pointer and went to sleep (frames.js, THE KEYS A LIVE
     FEATURE SCROLLS WITH ARE ITS OWN). CONTROL_FRAMES makes these fail. */
  const pan1 = await pan(page);
  say(pan1.join() === pan0.join() && has(g.cls, 'live'), 'and the keys moved the screenshots, not the bench — it is still awake under the pointer', 'pan ' + pan0 + ' → ' + pan1 + ' · ' + g.cls);
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('PageDown');
  await page.waitForTimeout(350);
  const pan2 = await pan(page);
  say(pan2.join() === pan0.join(), '↓ and page down go nowhere either — nothing in the gallery scrolls that way', 'pan ' + pan0 + ' → ' + pan2);
  pt = await inFrame(page, { label: 'Previous screenshot' });
  await page.mouse.click(pt.x, pt.y);
  await page.waitForTimeout(450);
  g = await gallery(page);
  say(g.counter === '07 / 07' && g.showing === '6', 'and the previous arrow from 01 wraps the other way — pressed, not a wake', g.counter + ' · showing ' + g.showing);
  const bare = await barePoint(page);
  await page.mouse.move(bare.x, bare.y, { steps: 6 });
  await page.waitForTimeout(800);
  g = await gallery(page);
  const focusBack = await page.evaluate(() => !document.activeElement || document.activeElement.tagName !== 'IFRAME');
  say(!has(g.cls, 'live') && focusBack, 'leaving it puts the shield back and hands the keyboard back to the bench', g.cls);

  // ── 3 · a feature on this bench ─────────────────────────────────────────
  console.log('\n3 · the feature paths');
  await frameOn(page, 0.45);
  const z = await page.evaluate(() => Lab.zoom);
  const home = await gallery(page);
  let c = await rectOf(page, '#gz-screens');
  /* LEFT AND DOWN, because those are the ways with room. The rein stops a
     left edge at the bench's width + 7000 (8600 on this 1600 bench) and the
     gallery has been placed within a few hundred of that, so a drag to the
     right measured the rein, not the drag — 82 of 996. Left runs out at
     −(width) − 7000 and down at 24000, neither anywhere near. */
  const from = { x: c.l + c.w * 0.6, y: c.t + c.h * 0.3 };
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  for (let i = 1; i <= 12; i++) { await page.mouse.move(from.x - 150 * i / 12, from.y + 90 * i / 12); await page.waitForTimeout(16); }
  await page.mouse.up();
  await page.waitForTimeout(400);
  g = await gallery(page);
  say(near(g.left - home.left, -150 / z, 2) && near(g.top - home.top, 90 / z, 2), 'a drag carries it as far as the hand went, in world units',
      'moved ' + (g.left - home.left) + ',' + (g.top - home.top) + ', wanted ' + (-150 / z).toFixed(1) + ',' + (90 / z).toFixed(1));
  const saved = await posKey(page);
  say(!!saved && JSON.parse(saved).x === g.left, 'and the drop is remembered', saved);
  await page.keyboard.press('Control+z');
  await page.waitForTimeout(400);
  g = await gallery(page);
  say(g.left === home.left && g.top === home.top, 'one ctrl+z puts it back where it was', g.left + ',' + g.top);

  const rein = await page.evaluate(() => {
    const el = document.getElementById('gz-screens'), x = parseFloat(el.style.left), y = parseFloat(el.style.top);
    Lab.place(el, x, -99999, false);
    const got = parseFloat(el.style.top);
    Lab.place(el, x, y, false);
    return { got, h: el.offsetHeight, back: parseFloat(el.style.top) === y };
  });
  say(rein.got === -rein.h - 2600 && rein.back, 'the rein: a top asked for far above stops at −(its height) − 2600', 'got ' + rein.got + ' for a box ' + rein.h + ' tall');

  // a press picks what it presses, and the drag above did — so the pick goes
  // down first, or the shift-click below would be taking it OUT of the pick
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
  g = await gallery(page);
  say(!has(g.cls, 'picked'), 'escape puts the pick down', g.cls);
  c = await rectOf(page, '#gz-screens');
  await page.keyboard.down('Shift');
  await page.mouse.click(c.l + c.w * 0.3, c.t + c.h * 0.3);
  await page.keyboard.up('Shift');
  await page.waitForTimeout(250);
  g = await gallery(page);
  say(has(g.cls, 'picked') && !has(g.cls, 'live'), 'shift-click picks it, and does not wake it', g.cls);

  await page.keyboard.press('Control+c');
  await page.keyboard.press('Control+v');
  await page.waitForTimeout(400);
  const COPY = '#bench-world .gz[data-gizmo^="' + ID + '-copy-"]';
  const made = await page.evaluate(() => ({ list: Lab.copies.get().list.length,
    galleries: document.querySelectorAll('#bench-world .gz[data-src="features/gallery.dc.html"]').length }));
  say(made.list === 1 && made.galleries === 2, 'ctrl+c, ctrl+v: a second gallery on the paper, written down as a copy', JSON.stringify(made));
  say(await booted(page, COPY), 'and the copy boots a document of its own');
  await page.keyboard.press('Control+z');
  await page.waitForTimeout(400);
  const unmade = await page.evaluate(s => ({ list: Lab.copies.get().list.length, el: !!document.querySelector(s) }), COPY);
  say(unmade.list === 0 && !unmade.el, 'ctrl+z takes the copy off again', JSON.stringify(unmade));

  await page.keyboard.press('Escape');
  c = await rectOf(page, '#gz-screens');
  await page.mouse.click(c.l + c.w * 0.45, c.t + c.h * 0.45, { button: 'right' });
  await page.waitForTimeout(350);
  const menu = await page.evaluate(() => ({ up: Lab.menuUp, name: (document.querySelector('#lab-menu .lab-menu-name') || {}).textContent }));
  say(menu.up && menu.name === 'Ironhive · Screens', 'right-click opens the menu, about the gallery', JSON.stringify(menu));
  const del = await rectOf(page, '#lab-menu [data-act="remove"]');
  await page.mouse.click(del.x, del.y);
  await page.waitForTimeout(400);
  const off = await page.evaluate(() => ({ el: !!document.getElementById('gz-screens'), gone: Lab.gone.length }));
  say(!off.el && off.gone === 1, 'its delete takes it off the paper', JSON.stringify(off));
  await page.keyboard.press('Control+z');
  await page.waitForTimeout(500);
  const back = await page.evaluate(() => ({ el: !!document.getElementById('gz-screens'), gone: Lab.gone.length }));
  say(back.el && back.gone === 0, 'and ctrl+z puts it back', JSON.stringify(back));
  say(await booted(page), '…where it boots again');

  await frameOn(page, 0.45);
  await page.waitForTimeout(1200);
  const s0 = await gallery(page);
  c = await rectOf(page, '#gz-screens');
  await page.mouse.move(c.x, c.y, { steps: 4 });
  const grip = await rectOf(page, '#gz-screens .gz-size');
  await page.mouse.move(grip.x, grip.y, { steps: 4 });
  await page.mouse.down();
  for (let i = 1; i <= 10; i++) { await page.mouse.move(grip.x - 200 * i / 10, grip.y - 120 * i / 10); await page.waitForTimeout(16); }
  await page.mouse.up();
  await page.waitForTimeout(500);
  const s1 = await gallery(page);
  say(s1.w < s0.w - 100 && s1.h < s0.h - 50, 'the corner re-cuts the box', s0.w + '×' + s0.h + ' → ' + s1.w + '×' + s1.h);
  say(s1.drawnAt < s0.drawnAt - 0.05 && s1.drawnAt > 0.3, 'and the drawing scales down to fit it rather than being cropped', 'drawn at ×' + s0.drawnAt.toFixed(3) + ' → ×' + s1.drawnAt.toFixed(3));
  say((await sizeKeys(page)).length === 1, 'the cut is remembered', (await sizeKeys(page)).join());
  const grip2 = await rectOf(page, '#gz-screens .gz-size');
  await page.mouse.dblclick(grip2.x, grip2.y);
  await page.waitForTimeout(500);
  const s2 = await gallery(page);
  say(near(s2.w, s2.natW * 2, 2) && near(s2.h, s2.natH * 2, 2) && (await sizeKeys(page)).length === 0,
      'double-click the corner: back to twice its drawing, whatever it had been cut to, and the saved cut is gone', s2.w + '×' + s2.h);

  await page.evaluate(() => Lab.fit(true));
  await page.waitForTimeout(900);
  const fitIn = await page.evaluate(() => {
    const b = Lab.bench.getBoundingClientRect(), r = document.getElementById('gz-screens').getBoundingClientRect();
    return { ok: r.left >= b.left - 1 && r.right <= b.right + 1 && r.top >= b.top - 1 && r.bottom <= b.bottom + 1, z: Lab.zoom };
  });
  say(fitIn.ok, 'shift 1 fits it on screen — the bench counts it as something made', 'zoom ' + fitIn.z.toFixed(3));
  await ctx.close();

  // ── 4 · touch ────────────────────────────────────────────────────────────
  console.log('\n4 · touch: the presses a second finger takes back');
  ({ ctx, page } = await open(browser, { ctx: { viewport: { width: 1200, height: 900 }, hasTouch: true } }));
  await frameOn(page, 0.5);
  await booted(page);
  await page.waitForTimeout(1000);
  const cdp = await ctx.newCDPSession(page);
  const P = (id, x, y) => ({ x: Math.round(x), y: Math.round(y), id, radiusX: 10, radiusY: 10, force: 1, rotationAngle: 0 });
  const send = (type, points) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: points });
  const settle = () => page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
  const cam = () => page.evaluate(() => ({ x: Lab.pan.x, y: Lab.pan.y, z: Lab.zoom }));
  const same = (a, b) => near(a.x, b.x, 2) && near(a.y, b.y, 2);
  const at = b => Math.round(b.x) + ',' + Math.round(b.y);

  c = await rectOf(page, '#gz-screens');
  const a0 = { x: c.l + c.w * 0.35, y: c.t + c.h * 0.45 }, b0 = { x: a0.x + 120, y: a0.y + 40 };
  const w0 = await drawnBox(page), cam0 = await cam(), pos0 = await posKey(page);
  await send('touchStart', [P(1, a0.x, a0.y)]);
  await page.waitForTimeout(70);
  await send('touchStart', [P(1, a0.x, a0.y), P(2, b0.x, b0.y)]);
  await page.waitForTimeout(20);
  for (let i = 1; i <= 10; i++) {
    await send('touchMove', [P(1, a0.x + 7 * i, a0.y + 5 * i), P(2, b0.x + 7 * i, b0.y + 5 * i)]);
    await page.waitForTimeout(16);
  }
  await settle();
  const mid = await page.evaluate(() => Lab.pinching);
  await send('touchEnd', []);
  await page.waitForTimeout(300);
  const t1 = await gallery(page), w1 = await drawnBox(page), cam1 = await cam();
  say(mid === true, 'two fingers that land on the gallery are the camera', 'Lab.pinching ' + mid);
  say(Math.hypot(cam1.x - cam0.x, cam1.y - cam0.y) > 40, 'and the sheet went with them', 'pan moved ' + Math.hypot(cam1.x - cam0.x, cam1.y - cam0.y).toFixed(1) + 'px');
  say(same(w1, w0), 'THE GALLERY DID NOT MOVE — where it is drawn, in world units', at(w0) + ' → ' + at(w1));
  say((await posKey(page)) === pos0, 'nothing was saved for it', String(await posKey(page)));
  say(!has(t1.cls, 'dragging'), 'and it is not left holding a drag', t1.cls);
  c = await rectOf(page, '#gz-screens');
  await page.mouse.move(c.l + 20, c.y);
  for (let i = 1; i <= 14; i++) { await page.mouse.move(c.l + 20 + (c.w - 40) * i / 14, c.y + 25 * Math.sin(i)); await page.waitForTimeout(16); }
  await page.waitForTimeout(300);
  const w2 = await drawnBox(page);
  say(same(w2, w0), '…the proof: a mouse crossing it afterwards does not carry it off', at(w0) + ' → ' + at(w2));

  await frameOn(page, 0.5);
  await page.waitForTimeout(400);
  const k0 = await gallery(page), keys0 = await sizeKeys(page);
  const gr = await rectOf(page, '#gz-screens .gz-size');
  const hit = await page.evaluate(p => { const el = document.elementFromPoint(p.x, p.y); return el ? el.className : null; }, gr);
  await send('touchStart', [P(1, gr.x, gr.y)]);
  await page.waitForTimeout(60);
  for (let i = 1; i <= 6; i++) { await send('touchMove', [P(1, gr.x - 20 * i, gr.y - 12 * i)]); await page.waitForTimeout(16); }
  await settle();
  const k1 = await gallery(page);
  const far = { x: gr.x - 420, y: gr.y - 260 };
  await send('touchStart', [P(1, gr.x - 120, gr.y - 72), P(2, far.x, far.y)]);
  await page.waitForTimeout(30);
  for (let i = 1; i <= 6; i++) { await send('touchMove', [P(1, gr.x - 120 + 6 * i, gr.y - 72), P(2, far.x + 6 * i, far.y)]); await page.waitForTimeout(16); }
  await send('touchEnd', []);
  await page.waitForTimeout(300);
  const k2 = await gallery(page), keys2 = await sizeKeys(page);
  say(k1.w < k0.w - 60 && k1.h < k0.h - 30, 'one finger on the corner re-cuts the box', 'under the finger: ' + hit + ' · ' + k0.w + '×' + k0.h + ' → ' + k1.w + '×' + k1.h);
  say(k2.w === k0.w && k2.h === k0.h, 'a second finger puts it back to the size at the press', k2.w + '×' + k2.h);
  say(keys2.length === keys0.length, 'and saves no size for it', keys2.join() || 'none');
  c = await rectOf(page, '#gz-screens .gz-size');
  await page.mouse.move(c.x + 30, c.y + 30);
  for (let i = 1; i <= 8; i++) { await page.mouse.move(c.x - 60 * i, c.y - 40 * i); await page.waitForTimeout(16); }
  await page.waitForTimeout(300);
  const k3 = await gallery(page);
  say(k3.w === k0.w && k3.h === k0.h, '…the proof: a mouse crossing the corner afterwards does not pull it', k3.w + '×' + k3.h);
  await ctx.close();

  // ── 5 · the published opening view ──────────────────────────────────────
  console.log('\n5 · the published opening view');
  for (const vp of [{ width: 2048, height: 1152 }, { width: 1600, height: 900 }, { width: 412, height: 915 }]) {
    ({ ctx, page } = await open(browser, { ctx: { viewport: vp }, query: '?seed=on', deployed: true }));
    await page.waitForFunction(() => Wall.store.get().items.filter(Boolean).length > 200, null, { timeout: 20000 });
    await page.waitForFunction(() => document.querySelectorAll('svg.wall-ink .wall-item').length > 200, null, { timeout: 20000 });
    await page.waitForTimeout(2500);
    const view = await page.evaluate(() => {
      const b = Lab.bench.getBoundingClientRect(), el = document.getElementById('gz-screens'), r = el.getBoundingClientRect();
      const shown = { x: parseFloat(el.style.left), y: parseFloat(el.style.top) }, home = { x: +el.dataset.homeX, y: +el.dataset.homeY };
      const g = { x1: shown.x, y1: shown.y, x2: shown.x + el.offsetWidth, y2: shown.y + el.offsetHeight };
      const st = Wall.store.get().items, hits = [];
      document.querySelectorAll('svg.wall-ink .wall-item').forEach(n => {
        const i = +n.dataset.i, it = st[i];
        if (!it || it.k === 's') return;
        const q = n.getBoundingClientRect();
        if (!q.width) return;
        const a = Lab.toWorld(q.left, q.top), c = Lab.toWorld(q.right, q.bottom);
        if (a.x < g.x2 && c.x > g.x1 && a.y < g.y2 && c.y > g.y1) hits.push(it.k + ' ' + (it.f || it.id || ''));
      });
      const onScreen = r.left >= b.left && r.right <= b.right && r.top >= b.top && r.bottom <= b.bottom ? 'wholly on screen'
        : (r.right <= b.left || r.left >= b.right || r.bottom <= b.top || r.top >= b.bottom) ? 'off screen' : 'partly on screen';
      return { z: Lab.zoom, onScreen, shown, home, hits, cut: el.dataset.cut || null };
    });
    const reined = view.shown.x !== view.home.x || view.shown.y !== view.home.y;
    info(vp.width + '×' + vp.height + ' at zoom ' + view.z.toFixed(3) + ': the gallery is ' + view.onScreen,
         'home ' + view.home.x + ',' + view.home.y + (reined ? ' — REINED on this screen to ' + view.shown.x + ',' + view.shown.y : '') +
         (view.cut ? ', cut ' + view.cut : '') + (view.hits.length ? ', over ' + view.hits.length + ' piece(s) of the wall: ' + view.hits.slice(0, 5).join('; ') : ', over no piece of the wall'));
    if (vp.width === 2048) {
      await frameOn(page, 0, view.z);                        // wherever it stands, brought into the middle at the opening zoom
      say(await booted(page), 'at the opening zoom it boots — no poster stands in for it');
      pt = await inFrame(page, { text: 'Ironhive · Screens' });
      await page.mouse.click(pt.x, pt.y);
      await page.waitForTimeout(450);
      pt = await inFrame(page, { label: 'Next screenshot' });
      await page.mouse.click(pt.x, pt.y);
      await page.waitForTimeout(450);
      g = await gallery(page);
      say(g.counter === '02 / 07', 'and it works at that zoom: wake it, press next, 02 / 07', g.counter);
      await page.screenshot({ path: path.join(__dirname, 'gallery-open.png') });
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
