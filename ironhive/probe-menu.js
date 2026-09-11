/* ironhive/probe-menu.js — the right-click menu on the wall, driven for real
   rather than asserted. Real presses, real right-clicks, real keys: every
   number printed is read back out of the store, or off the layer, after the
   browser has done the work. Sister to probe-pick.js and written in its shape.

     1   right-click a sticker and lab.js's menu comes up about THAT sticker —
         named after it, saying where in the pile it is — and the press does
         not start a drag or move anything
     2   raise steps it PAST WHAT IT OVERLAPS, not one number: item 0 clears
         item 2 in a single press, over the top of an item 1 it never touched
     3   …with nothing in the way, a step goes all the way (lower, item 3)
     4   a step that would change nothing changes nothing — no store write,
         and so nothing for ctrl+z to find
     5   ctrl+z walks each step back, and a piece that had no layer gets NO
         layer back — deleted, not left at 0, the same rule the mirror keeps
     6   delete takes it off the paper; ctrl+z puts it back
     7   a pick of two: right-clicking one KEEPS the pick, the menu says so,
         and raise and delete do the pair — one ctrl+z between them
     8   the menu is only about what is on the paper: bare paper keeps the
         browser's own menu, and escape / a press elsewhere put it away
     9   a pasted copy lands on top whatever it was copied off
    10   the pile survives a reload

   Stamps its own stickers into a clean store first (localStorage is wiped on
   the way in) so the run says the same thing twice.

   Run with the site's serve.js already up on 4321:  node ironhive/probe-menu.js
*/
const { chromium } = require('playwright');

const say = (ok, what, extra) =>
  console.log((ok ? '  PASS  ' : '  FAIL  ') + what + (extra == null ? '' : '   ' + extra));

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: false,
    args: ['--window-size=1616,1110', '--window-position=0,0'] });
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => { errs.push(String(e)); console.log('PAGEERROR', String(e)); });
  page.on('console', m => { if (m.type() === 'error') console.log('CONSOLE', m.text()); });

  // once, on the way in — addInitScript would fire on the reload in step 10
  // too and wipe the very store that step is there to read
  await page.goto('http://localhost:4321/ironhive/', { waitUntil: 'load' });
  await page.evaluate(() => { try { localStorage.clear(); } catch (e) {} });
  await page.reload({ waitUntil: 'load' });
  await page.waitForFunction(() => window.Lab && window.Wall && window.Stickers && Stickers.list.length > 0);
  await page.waitForTimeout(900);

  /* ── FOUR STICKERS, AND WHICH OF THEM TOUCH IS THE WHOLE POINT ───────────
     A step is measured against what a piece OVERLAPS, so a layout where
     everything touches everything cannot tell that apart from "one number
     up". These four are cut so that

       0 touches 2 and nothing else        (0 raising must clear 2 in one go,
       1 touches 2                          over the top of a 1 it never met)
       3 touches nothing                   (so its step goes all the way)

     at 220 world px a piece is ±110 about its centre, which is where the
     numbers below come from. */
  const SIZE = 220;
  await page.evaluate(z => {
    Wall.store.update(st => { st.items = []; });
    Wall.setTool('move');
    Lab.setZoom(0.75);
    const id = Stickers.list[0].id;
    // braces matter: Lab.store's update takes a returned value as the NEW
    // state, and push() returns a length
    [[600, 420], [900, 420], [660, 560], [1250, 780]].forEach(([x, y]) =>
      Wall.store.update(st => { st.items.push({ k: 'd', f: id, o: 0, x, y, z }); }));
    Wall.paint();
    // centred on the BENCH, not on the window: the bench is the paper below
    // the house bar, and a point put in the window's middle can land in it
    const b = Lab.bench.getBoundingClientRect();
    const c = Lab.toScreen(925, 600);
    Lab.panBy(b.left + b.width / 2 - c.x, b.top + b.height / 2 - c.y);
  }, SIZE);
  await page.waitForTimeout(300);

  // a client point where a given sticker's OWN node answers the pointer. The
  // artwork is a chain link with a hole through the middle and svg hit-tests
  // what is painted, so the centre of one is bare paper.
  const solid = i => page.evaluate(n => {
    const it = Wall.store.get().items[n], c = Lab.toScreen(it.x, it.y);
    for (let r = 4; r < 140; r += 3) for (let a = 0; a < 360; a += 7) {
      const x = c.x + r * Math.cos(a * Math.PI / 180), y = c.y + r * Math.sin(a * Math.PI / 180);
      const el = document.elementFromPoint(x, y), w = el && el.closest && el.closest('.wall-item');
      if (w && +w.dataset.i === n) return { x, y };
    }
    return null;
  }, i);

  // the pile, read off the LAYER — what is hung last is what is on top, so
  // this is the answer the eye gets and not the one the store was told
  const pile = () => page.evaluate(() =>
    [...document.querySelectorAll('.wall-item')].map(e => +e.dataset.i).join(','));
  // …and the layer numbers as they were written down, '-' for a piece that
  // has never been through the pile
  const layers = () => page.evaluate(() =>
    Wall.store.get().items.map(it => (it && isFinite(it.L) ? it.L : '-')).join(' '));
  const pos = () => page.evaluate(() => JSON.stringify(Wall.store.get().items.map(it => it && [it.x, it.y])));
  const live = () => page.evaluate(() => Wall.store.get().items.filter(Boolean).length);
  const menu = () => page.evaluate(() => {
    const m = document.getElementById('lab-menu');
    return { open: !m.hidden, name: m.querySelector('.lab-menu-name').textContent,
             where: m.querySelector('.lab-menu-where').textContent };
  });
  const rightClick = async i => {
    const p = await solid(i);
    await page.mouse.click(p.x, p.y, { button: 'right' });
    await page.waitForTimeout(150);
  };
  const press = async act => {
    await page.click('#lab-menu [data-act="' + act + '"]');
    await page.waitForTimeout(150);
  };
  const undo = async () => { await page.keyboard.press('Control+z'); await page.waitForTimeout(150); };

  /* ── 1 · THE MENU COMES UP ABOUT THE THING UNDER THE POINTER ──────────── */
  console.log('\n1 · right-click a sticker');
  const where0 = await pos();
  await rightClick(0);
  let m = await menu();
  const name0 = await page.evaluate(() => Stickers.list[0].name);
  say(m.open, 'the menu is up');
  say(m.name === name0, 'named after the sticker itself', m.name);
  say(m.where === 'layer 1 of 4', 'and says where in the pile it is', m.where);
  say(await pos() === where0, 'the right-click moved nothing');
  say(await page.evaluate(() => Wall.picked) === 1,
      'it is picked, which is how you can see what the menu is about');
  say(await pile() === '0,1,2,3', 'and the pile has not moved yet', await pile());

  /* ── 2 · A STEP IS PAST WHAT IT OVERLAPS ──────────────────────────────────
     0 touches 2 and does not touch 1, so ONE press must put it over 2. A
     menu that walked the pile a number at a time would answer 1,0,2,3 here
     and look identical on any layout where everything overlaps. */
  console.log('\n2 · raise');
  await press('raise');
  say(await pile() === '1,2,0,3', 'one press clears the thing it overlaps, not the next number', await pile());
  m = await menu();
  say(m.open, 'and the menu stays open — one step is rarely the answer');
  say(m.where === 'layer 3 of 4', 'the line follows it up the pile', m.where);

  /* ── 3 · NOTHING IN THE WAY, SO ALL THE WAY ───────────────────────────── */
  console.log('\n3 · lower something that touches nothing');
  await page.keyboard.press('Escape');
  await rightClick(3);
  say((await menu()).where === 'layer 4 of 4', '3 is on top to start with', (await menu()).where);
  await press('lower');
  say(await pile() === '3,1,2,0', 'with nothing under it to clear, it goes to the bottom', await pile());

  /* ── 4 · A STEP THAT CHANGES NOTHING WRITES NOTHING ───────────────────── */
  console.log('\n4 · lower it again, from the bottom');
  const wrote = await layers();
  await press('lower');
  say(await layers() === wrote, 'nothing written down', await layers());
  say(await pile() === '3,1,2,0', 'nothing moved', await pile());
  await page.keyboard.press('Escape');
  await undo();
  say(await pile() === '1,2,0,3', 'so ctrl+z finds the lower before it, not a no-op', await pile());

  /* ── 5 · AND BACK TO NO LAYER AT ALL ──────────────────────────────────────
     The same rule the mirror keeps about its flags: a piece that had no layer
     gets NO layer back, or the store quietly grows an L on everything ever
     raised and "undo put it back" would be true of the drawing only. */
  console.log('\n5 · ctrl+z again');
  await undo();
  say(await pile() === '0,1,2,3', 'the first raise came back off too', await pile());
  say(await layers() === '- - - -', 'and no piece is left carrying a layer', await layers());

  /* ── 6 · DELETE, AND CTRL+Z ───────────────────────────────────────────── */
  console.log('\n6 · delete');
  await rightClick(1);
  await press('remove');
  say(!(await menu()).open, 'the menu closes — there is nothing left to point at');
  say(await live() === 3, 'the sticker is off the paper', await live() + ' left');
  say(await page.evaluate(() => Wall.picked) === 0, 'and the pick drops the dead slot');
  await undo();
  say(await live() === 4, 'one ctrl+z puts it back', await live() + ' on the paper');
  say(await pile() === '0,1,2,3', 'in the place it came off', await pile());

  /* ── 7 · A PICK OF TWO GOES TOGETHER ──────────────────────────────────── */
  console.log('\n7 · right-click one of a picked pair');
  const p0 = await solid(0), p2 = await solid(2);
  await page.mouse.click(p0.x, p0.y);
  await page.keyboard.down('Shift');
  await page.mouse.click(p2.x, p2.y);
  await page.keyboard.up('Shift');
  await page.waitForTimeout(150);
  say(await page.evaluate(() => Wall.picked) === 2, 'two picked');
  await rightClick(0);
  say(await page.evaluate(() => Wall.picked) === 2,
      'the right-click did NOT collapse the pick onto the one pressed',
      'picked=' + await page.evaluate(() => Wall.picked));
  m = await menu();
  say(/^2 picked · layer \d of 4$/.test(m.where), 'and the menu says so', m.where);
  /* BOTH OF THEM STEP, AS A PROPERTY and not as a literal pile: each member
     of the crew steps past what IT overlaps, so where the two of them land is
     the layout's answer and not a number worth writing down here.

     Each is measured by HOW MANY PIECES OUTSIDE THE CREW IT IS OVER, which is
     the only reading that means anything: a crew member's raw place in the
     pile moves when the OTHER member is lifted out and put back above it, so
     a piece that genuinely stepped can come back to the number it started on.
     Counting only the pieces that stood still asks the real question — is it
     over more of the paper than it was? */
  const overRest = async (i, crew) => {
    const p = (await pile()).split(',');
    return p.slice(0, p.indexOf(String(i))).filter(j => crew.indexOf(+j) < 0).length;
  };
  const crew = [0, 2];
  const was0 = await overRest(0, crew), was2 = await overRest(2, crew);
  await press('raise');
  const now0 = await overRest(0, crew), now2 = await overRest(2, crew);
  say(now0 > was0 && now2 > was2, 'both members of the crew stepped',
      '0 is over ' + was0 + '->' + now0 + ', 2 over ' + was2 + '->' + now2 + '   pile ' + await pile());
  const after = await pile();
  await press('remove');
  say(await live() === 2, 'delete took the pair, not the one pressed', await live() + ' left');
  await undo();
  say(await live() === 4, 'and ONE ctrl+z put the pair back', await live() + ' on the paper');
  say(await pile() === after, 'still in the order the raise left them', await pile());

  /* ── 8 · WHAT THE MENU IS NOT ABOUT ───────────────────────────────────── */
  console.log('\n8 · bare paper, escape, and a press elsewhere');
  await page.keyboard.press('Escape');
  const bare = await page.evaluate(() => {
    const b = Lab.bench.getBoundingClientRect();
    const x = Math.round(b.left + 60), y = Math.round(b.top + 60);
    const el = document.elementFromPoint(x, y);
    const ev = new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: x, clientY: y });
    el.dispatchEvent(ev);
    return { open: !document.getElementById('lab-menu').hidden, prevented: ev.defaultPrevented,
             on: el.tagName + '.' + (el.getAttribute('class') || '') };
  });
  say(!bare.open, 'no menu on bare paper', 'pointer was over ' + bare.on);
  say(!bare.prevented, "…and the browser's own menu is left alone there");
  await rightClick(0);
  say((await menu()).open, 'up again');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(100);
  say(!(await menu()).open, 'escape puts it away');
  await rightClick(0);
  const away = await page.evaluate(() => {
    const b = Lab.bench.getBoundingClientRect();
    return { x: Math.round(b.left + 60), y: Math.round(b.top + 60) };
  });
  await page.mouse.click(away.x, away.y);
  await page.waitForTimeout(150);
  say(!(await menu()).open, 'and so does a press anywhere else');

  /* ── 9 · A COPY LANDS ON TOP OF WHAT IT CAME OFF ──────────────────────────
     A pasted piece is a deep copy of the record, layer and all, so without
     wall.js dropping it a copy of something you had just pushed to the bottom
     would paste itself back down there — under the thing it was copied from,
     which is a paste you cannot see. */
  console.log('\n9 · copy something that has been pushed down the pile');
  await rightClick(0);
  await press('lower');
  await page.keyboard.press('Escape');
  await page.evaluate(() => { Wall.clearPick(); });
  const low = await solid(0);
  await page.mouse.click(low.x, low.y);
  await page.waitForTimeout(120);
  const pile9 = await pile();
  say(pile9.split(',').pop() !== '0', 'it is no longer on top', pile9);
  await page.keyboard.press('Control+c');
  await page.keyboard.press('Control+v');
  await page.waitForTimeout(250);
  const pasted = (await pile()).split(',').pop();
  say(await live() === 5, 'a copy landed', await live() + ' on the paper');
  say(pasted === '4', 'and it is on top, not down where its original sits', 'pile ' + await pile());
  await undo();
  say(await live() === 4, 'one ctrl+z takes the paste off', await live() + ' left');

  /* ── 10 · THE PILE SURVIVES A RELOAD ──────────────────────────────────── */
  console.log('\n10 · reload');
  const want = await pile();
  await page.reload({ waitUntil: 'load' });
  await page.waitForFunction(() => window.Wall && Wall.store.get().items.filter(Boolean).length === 4);
  await page.waitForTimeout(700);
  say(await pile() === want, 'the layers came back off the store', await pile() + '   (was ' + want + ')');

  console.log('\n' + (errs.length ? errs.length + ' page error(s)' : 'no page errors'));
  await page.waitForTimeout(400);
  await browser.close();
})();
