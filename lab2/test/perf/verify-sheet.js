/* lab2/test/perf/verify-sheet.js — the sticker sheet, twice over
   USAGE (from site/, with the sandbox server up on 4322):

       node lab2/test/perf/verify-sheet.js [all | <part> …] [--shots N|all]
                                           [--no-sheet] [--no-bench]
                                          (default: all forty, the first 8 shot)

   TWO HALVES, and they ask different questions of the same forty parts.

   ── THE SHEET (as Design Canvas shows it) ────────────────────────────────
   Opens features/stickers-core.dc.html#part=<part> — the built sheet, the
   way frames.js opens it in a frame and Design Canvas opens it on its own
   — in headless system Chrome (rendering only; perf numbers are always
   headed), once per part, THROUGH about:blank between two parts: a goto
   that changes only the hash is a same-document navigation, support.js
   would not boot again, and forty checks would be forty looks at the
   first part. Then it asks, per part:
     · support.js booted it — an <svg> that is not the data-defs one stands
       under the screen within 5 s;
     · zero console errors, zero page errors, zero responses 4xx/5xx — the
       favicon Chrome asks a bare page for excepted, as smoke-bench.js
       excepts the door's; support.js's own "never resolved" warnings are
       printed, not failed, and none is expected;
     · no "{{" in any ATTRIBUTE or TEXT NODE — an interpolation that
       survived is a role renderVals() did not fill. The blunter reading,
       document.body.innerHTML, is 11 on this sheet and always will be: ten
       are the long note at the top of <body> naming the roles it explains
       and one is the dc-script's own comment, and a comment draws nothing.
       The run prints all three counts and fails only the drawn one;
     · exactly one <svg> in the whole document that is not [data-defs] —
       the part support.js picked out of the forty sc-ifs, and not two
       because a flag matched twice;
     · its direct children are the part's own layers — the data-layer
       groups the part's file has (palette-keys.js lint reads them), in
       that order, each holding as many elements as the file's does —
       support.js's own <span class="sc-interp">, the placeholder it puts
       where an interpolation sits in TEXT CONTENT, left out of the count
       — so the part on screen is THIS part and not a stale one that
       happens to have the same six layers;
     · a fill among the Knoll defaults (#c93b82 …, CONTRACTS.md §7) — the
       proof the roles were filled with the sheet's own palette and not
       with empty strings, which React renders without a word;
     · the shared defs under the screen; the 128 box; the root's
       drop-shadow and its sk-sway or sk-bob.
   The first --shots parts (8: enough to look at two and keep the rest for
   the record, without forty 1200-px PNGs a run) are screenshotted to
   perf/results/parts/sheet-<part>.png; --shots all shoots every part.
   Viewport 600 × 600 at DPR 2: the part is drawn at its 128 css px in the
   middle of the screen, and DPR 2 is enough to read a 3-unit line.

   ── THE BENCH (as kits.js pulls the parts out of it) — the plan's §8 4.7 ──
   Added 2026-09-07, Phase 4.7. The half above proves the sheet is a
   Design Canvas document; this half proves it is a KIT, which is a
   different claim and the one the bench depends on. Five questions, in
   this order, on the sandbox bench at /lab2/test/:

     A · EVERY PART EXTRACTS. Kits.extractOnly over the sheet, at a WITNESS
         palette — six colours (#010203 #040506 #070809 #0a0b0c #0d0e0f
         #101112) that no drawing on earth holds by accident — and at two
         styles: the default vector ({preset:'flat', lineShow:true}, which
         is how the sheet was drawn and a pass that does nothing) and
         ink-sketch, which is the busiest row of Appendix C's table (a
         wobbled line drawn twice, a hatch shade, a paper texture) and so
         copies the most defs into a part. Forty parts back, both times,
         each with a non-empty `still`, a 128 box and its Appendix D tags.
     B · NO LITERAL COLOUR SURVIVES. Every '#' in every extracted string
         must be either a url(#…) reference — the style pass's own filters
         and patterns, whose ids carry a hash of the style vector — or one
         of the six witness colours. That is the plan's "grep for # outside
         url(#" made decidable: with a witness palette any other hex is
         provably a literal that palette-keys.js let through, and the run
         prints it. The root drop-shadow is rgba(0,0,0,0.3) and carries no
         '#' at all, which is why the plan's second exception needs no
         clause here.
     C · EACH data-layer EXACTLY ONCE. On the default vector, the direct
         children of each part's root are counted by their data-layer, and
         no value appears twice — and the set is the one the part's own
         file has, so a layer cannot go missing either. The one deliberate
         exception is measured rather than excused: at ink-sketch,
         linePasses is 2 and the style pass clones the line layer, so
         `line` appears exactly TWICE there and every other layer once.
     D · CTRL-OUTLINE READS THE DRAWING'S ALPHA. Kits.inkAt, on the bench,
         over six of the forty chosen across shapes — burst (a star),
         badge-round (a disc), tape-strip (a band), star, heart, cloud. For
         each: true at the box's centre, false at all four corners (2 px
         in), and the inked share of an 11 × 11 grid over the box strictly
         between 10 % and 90 % — a reader answering a constant would sit at
         0 or 1, and only a reader of the silhouette lands in between.
     E · COPY AND PASTE LANDS IN THE COPIES BLOCK AS THE FIVE-LINE SECTION.
         shift+click a sticker to pick it, ctrl+c, ctrl+v, ctrl+s, and then
         read lab2/test/index.html: the copies block has gained one
         section, it is inside the two markers, it holds a
         <div class="gz-art"></div> and NO <iframe>, its data-src is the
         stickers sheet at the same #part=, its id is <stem>-copy-<uid>,
         and — the strong form — the eight lines in the file are
         byte-identical to what serve.js's own copyMarkup() writes for the
         attributes the file now carries. So the five-line shape is checked
         against the function that wrote it and not against a description
         of it.

   E IS THE ONE THING IN THIS FOLDER THAT WRITES index.html FOR REAL, and
   it is done the way perf/verify-keep.js does it: the door is NOT blocked
   for that context (it is the sandbox's own, on 4322), the file is copied
   to results/parts/index.before.html before anything opens, and it is put
   back — and proved byte-identical — in a finally block whatever happened
   in between. The restore refuses to overwrite a file that changed in any
   way this run did not cause and says so instead. Two consequences:
   RESTART THE SANDBOX SERVER FIRST (serve.js keeps one index.html.keep-bak
   per PROCESS, and this run deletes the one it caused — a stale one from
   an earlier run is another script's evidence), and do not run it while
   another phase is editing the page. Every other context in this file
   blocks '**\/_lab2/**' with a 404, so keep.js hears "no door" and cannot
   post. --no-bench skips this half; --no-sheet skips the other.

   Results: perf/results/parts/sheet-summary.json (CONTRACTS §11). */
'use strict';
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');
const PK = require('../press/tools/palette-keys.js');
const { TAGS } = require('../press/tools/build-sheet.js');
/* required, not run: serve.js is a server when it is the main module and a
   bag of its own functions when it is not (its last two lines say so), so
   the copies block's markers and the writer of a copied section are the
   ones the door actually uses. */
const SRV = require('../serve.js');

const ORIGIN = 'http://localhost:4322';
const BASE = ORIGIN + '/lab2/test/features/stickers-core.dc.html';
const BENCH = ORIGIN + '/lab2/test/';
const HOME = path.resolve(__dirname, '..');                  // lab2/test
const OUT = path.join(__dirname, 'results', 'parts');
const FILE = path.join(HOME, 'index.html');
const BAK = FILE + '.keep-bak';
const TMP = FILE + '.tmp';
const BEFORE = path.join(OUT, 'index.before.html');
const KNOLL = ['#c93b82', '#5871f5', '#26212a', '#ffffff', '#ef4d98', '#8a2558'];
const SHOTS = 8;

/* ── 4.7's numbers ────────────────────────────────────────────────────────
   THE WITNESS PALETTE. Six colours in a row nothing draws with — the point
   is not what they look like but that they cannot be confused with a
   literal somebody left in a part. skStroke 3 and skRadius 6 are the
   sheet's own defaults (CONTRACTS §7), kept so the geometry is the geometry
   the other half of this file looked at; skText is a word rather than the
   default '' so the eight text parts carry something the walk can see. */
const WITNESS = { skPrimary: '#010203', skSecondary: '#040506', skInk: '#070809',
                  skPaper: '#0a0b0c', skHighlight: '#0d0e0f', skShadow: '#101112',
                  skStroke: 3, skRadius: 6, skText: 'WITNESS' };
const WITNESS_HEX = ['#010203', '#040506', '#070809', '#0a0b0c', '#0d0e0f', '#101112'];
/* THE TWO STYLES. The default vector is how the sheet was drawn and is a
   pass that does nothing (kits.js: every step asks whether its field is
   there). ink-sketch is Appendix C's busiest row — lineWobble 0.6 with
   linePasses 2, shading hatch, texture paper — so it is the vector that
   copies the most defs into a part and the only one that clones a layer. */
const STYLE_DEFAULT = { preset: 'flat', lineShow: true };
const STYLE_BUSY = { preset: 'ink-sketch', lineShow: true, lineWeight: 0.5, lineWobble: 0.6, linePasses: 2,
                     corners: 0.2, shading: 'hatch', texture: 'paper', paletteSize: 0, pixel: 0, finish: 'none' };
/* SIX PARTS ACROSS SHAPES for the ink reader: a star, a disc, a band, a
   five-point star, a curve and a puff. Each is a centred motif with empty
   corners, which is what makes "true in the middle, false in the corners" a
   question about the silhouette rather than about the box. */
const INK_PARTS = ['burst', 'badge-round', 'tape-strip', 'star', 'heart', 'cloud'];
const GRID = 11;                    // 11 × 11 = 121 points over the box, ~13 px apart at 1:1
const INK_LO = 0.05, INK_HI = 0.95; // a constant reader sits at 0 or 1; a silhouette lands between
const CORNER_IN = 2;                // px inside the box's corner — inside the section, outside every motif
const COPY_PART = 'burst';          // the sticker the copy is made of: the first of the tray, easy to find
const SETTLE_MS = 400;              // a lift, a place() and a tile bake land within a few frames
const SAVE_WAIT = 10000;            // a ctrl+s answers in tens of ms on localhost; ten seconds is a hung door
const UNLOAD = 500;                 // keep.js's pagehide POST, allowed for before the restore

fs.mkdirSync(OUT, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));

const results = [];
const check = (name, ok, info) => {
  results.push({ name, ok: !!ok, info: info === undefined ? '' : String(info) });
  console.log((ok ? 'PASS ' : 'FAIL ') + name + (info !== undefined ? ' — ' + info : ''));
  return !!ok;
};

/* What the part's file says the screen should hold: the root's <g> layers in
   order, each with its element count — the linter's own parse, so the
   reading is the linter's. */
function expected(id) {
  const res = PK.lint(id, fs.readFileSync(PK.partFile(id), 'utf8'));
  const svg = res.svg;
  const layers = svg ? svg.children.filter(c => c.type === 'el').map(c => [c.tag === 'g' ? (PK.attr(c, 'data-layer') || '') : c.tag, PK.els(c).length]) : [];
  return { layers, faults: res.faults.length };
}
const show = layers => layers.map(l => l[0] + ' ' + l[1]).join(', ');

/* ══ THE SHEET ═══════════════════════════════════════════════════════════ */
async function sheetPass(args) {
  const si = args.indexOf('--shots'), shotsArg = si >= 0 ? args[si + 1] : undefined;
  const names = args.filter((a, i) => !a.startsWith('--') && i !== si + 1);
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const ctx = await browser.newContext({ viewport: { width: 600, height: 600 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  const errors = [], warnings = [], pageErrors = [], notOk = [];
  /* A console error names its source: a resource that answered 4xx/5xx is
     reported with the URL the browser attached to the line. Chrome asks a
     bare page for /favicon.ico and the sheet has none — that one 404 is
     expected and is listed on its own; any other 404 is a broken path on
     the sheet and fails the run. */
  const isFavicon = u => /\/favicon\.ico$/.test(u || '');
  page.on('console', m => {
    const u = (m.location() || {}).url || '';
    if (m.type() === 'error') { if (!isFavicon(u)) errors.push(m.text() + (u ? ' @ ' + u : '')); }
    else if (m.type() === 'warning') warnings.push(m.text());
  });
  page.on('response', r => { if (r.status() >= 400 && !isFavicon(r.url())) notOk.push(r.status() + ' ' + r.url()); });
  page.on('pageerror', e => pageErrors.push(e.message));

  const forty = TAGS.map(t => t[0]);
  let list;
  if (!names.length || names[0] === 'all') {
    await page.goto(BASE, { waitUntil: 'load' });
    const opts = await page.evaluate(() => JSON.parse(document.querySelector('script[data-dc-script]').getAttribute('data-props')).part.options);
    check('the sheet lists the forty of Appendix D, in order', JSON.stringify(opts) === JSON.stringify(forty), opts.length + ' options');
    list = opts;
  } else list = names;
  const shots = shotsArg === 'all' ? list.length : shotsArg ? Math.max(0, +shotsArg || 0) : SHOTS;
  const shot = [];

  for (const [i, part] of list.entries()) {
    errors.length = warnings.length = pageErrors.length = notOk.length = 0;
    await page.goto('about:blank');
    await page.goto(BASE + '#part=' + part, { waitUntil: 'load' });
    const booted = await page.waitForFunction(() => document.querySelector('[data-stickers] > svg:not([data-defs])'), null, { timeout: 5000 }).then(() => true, () => false);
    // the faces and the first paint, the way frames.js waits on a frame
    await page.waitForTimeout(300);
    const info = await page.evaluate(() => {
      const screen = document.querySelector('[data-stickers]');
      const svgs = [...document.querySelectorAll('svg:not([data-defs])')];
      const svg = svgs[0];
      const fills = new Set();
      svgs.forEach(s => s.querySelectorAll('[fill],[stroke]').forEach(e => { ['fill', 'stroke'].forEach(a => { const v = e.getAttribute(a); if (v && v !== 'none') fills.add(v.toLowerCase()); }); }));
      return {
        screen: !!screen, svgCount: svgs.length, onScreen: !!(screen && svg && svg.parentElement === screen),
        /* WHERE AN INTERPOLATION MAY STILL SIT. document.body.innerHTML is
           the blunt reading and it is never 0 on this sheet: the long note
           at the top of <body> names the roles it explains ({{ skPrimary }}
           and the rest, ten of them) and the dc-script's own comment names
           one more, and a comment renders nothing. What must be 0 is every
           place the browser DRAWS from: an attribute and a text node. So
           the walk counts the three separately, and only `live` is failed. */
        braces: (() => {
          const n = { live: 0, comment: 0, script: 0, where: [] };
          const w = document.createTreeWalker(document.body, NodeFilter.SHOW_ALL);
          for (let node = w.currentNode; node; node = w.nextNode()) {
            const hits = t => (t.match(/\{\{/g) || []).length;
            if (node.nodeType === 8) n.comment += hits(node.nodeValue);
            else if (node.nodeType === 3) {
              const inScript = node.parentElement && node.parentElement.tagName === 'SCRIPT';
              const c = hits(node.nodeValue);
              if (inScript) n.script += c;
              else if (c) { n.live += c; n.where.push('text in <' + (node.parentElement || {}).tagName + '>'); }
            } else if (node.nodeType === 1) for (const a of node.attributes) if (hits(a.value)) { n.live += hits(a.value); n.where.push(node.tagName + '[' + a.name + ']'); }
          }
          return n;
        })(),
        fills: [...fills], defs: !!(screen && screen.querySelector(':scope > svg[data-defs] defs')),
        /* The layer's element count, with support.js's own scaffolding
           left out: an interpolation in TEXT CONTENT is rendered as a
           <span class="sc-interp"> holding the value, one per {{ skText }},
           and that span is not a shape the part drew. (It is also not a
           shape the browser draws: React makes it in the SVG namespace, so
           an SVG <span> inside <text> measures 0 x 0 — the eight text
           parts show their words on a BENCH, where kits.js fills the
           string before it parses, and never here. Recorded 2026-09-07,
           Phase 4a, in press/NOTES.md.) */
        layers: svg ? [...svg.children].map(c => [c.tagName.toLowerCase() === 'g' ? (c.getAttribute('data-layer') || '') : c.tagName.toLowerCase(), [...c.querySelectorAll('*')].filter(e => !e.classList.contains('sc-interp')).length]) : [],
        interp: svg ? svg.querySelectorAll('span.sc-interp').length : 0,
        box: svg ? [svg.getAttribute('width'), svg.getAttribute('height'), svg.getAttribute('viewBox')].join(' ') : '',
        style: svg ? svg.getAttribute('style') || '' : '',
        rect: svg ? (r => [r.width, r.height])(svg.getBoundingClientRect()) : null,
      };
    });
    const want = expected(part);
    const layersOk = JSON.stringify(info.layers) === JSON.stringify(want.layers);
    check(part + ': support.js booted the part', booted && info.screen && info.onScreen, booted ? 'svg under the screen' : 'no svg under [data-stickers] within 5 s');
    check(part + ': no console errors', !errors.length && !pageErrors.length && !notOk.length, (errors.concat(pageErrors, notOk).join(' | ') || 'none (favicon.ico 404 excepted)') + (warnings.length ? `; ${warnings.length} warning(s): ` + warnings.join(' | ') : ''));
    check(part + ': no {{ left where the browser draws', info.braces.live === 0, info.braces.live + ' in attributes and text' + (info.braces.where.length ? ' (' + info.braces.where.join(', ') + ')' : '') + `; ${info.braces.comment} in the sheet's comments and ${info.braces.script} in the dc-script's, which render nothing`);
    check(part + ': exactly one svg that is not data-defs', info.svgCount === 1, info.svgCount);
    check(part + ": layers are the part file's, in order, element for element", layersOk && want.layers.length > 0 && !want.faults, show(info.layers) + (layersOk ? '' : ' — the file has: ' + show(want.layers)));
    check(part + ': roles filled with the Knoll defaults', info.fills.some(f => KNOLL.includes(f)), info.fills.join(' '));
    check(part + ': shared defs under the screen', info.defs);
    check(part + ': box 128 128 0 0 128 128', info.box === '128 128 0 0 128 128', info.box);
    // React writes the style back through the CSSOM, which serialises the
    // colour first: drop-shadow(rgba(0, 0, 0, 0.3) 6px 7px 0px)
    check(part + ': root carries the drop-shadow and sk-sway/sk-bob', /drop-shadow\([^)]*\)?[^;]*6px 7px 0/.test(info.style) && /sk-(sway|bob)/.test(info.style), info.style);
    if (i < shots) {
      const file = path.join(OUT, 'sheet-' + part + '.png');
      await page.screenshot({ path: file });
      shot.push(part);
      console.log('  ' + path.relative(process.cwd(), file).replace(/\\/g, '/') + (info.rect ? ` — drawn at ${info.rect[0]} × ${info.rect[1]} css px` : ''));
    }
  }
  await browser.close();
  return { parts: list, shot };
}

/* ══ THE BENCH — the plan's 4.7 ══════════════════════════════════════════ */

/* Every '#' in an extracted string, with the url(#…) references taken out
   first: what is left is a colour claim, and every one of them must be a
   witness. Written here rather than in the page so the reading is this
   file's and can be read beside the sentence that explains it. */
function strayHexes(s) {
  const noRefs = String(s).replace(/url\(\s*#[^)]*\)/g, 'url(REF)');
  const hits = noRefs.match(/#[0-9a-fA-F]{3,8}\b/g) || [];
  return hits.map(h => h.toLowerCase()).filter(h => WITNESS_HEX.indexOf(h) < 0);
}

async function benchPass() {
  const browser = await chromium.launch({ channel: 'chrome', headless: false,
    args: ['--window-size=1616,1110', '--window-position=0,0'] });
  const summary = {};
  let ctx = null, live = null;
  const before = fs.readFileSync(FILE);
  fs.writeFileSync(BEFORE, before);
  const bakAtStart = fs.existsSync(BAK);
  try {
    /* ── A, B, C, D: the door BLOCKED, nothing can be written ───────────── */
    ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    await page.route('**/_lab2/**', r => r.fulfill({ status: 404, body: 'no door' }));
    const errors = [], pageErrors = [];
    page.on('console', m => { const u = (m.location() || {}).url || ''; if (m.type() === 'error' && !u.includes('/_lab2/')) errors.push(m.text()); });
    page.on('pageerror', e => pageErrors.push(String(e.message || e)));
    await page.goto(BENCH, { waitUntil: 'load' });
    await page.waitForFunction(() => window.Lab && window.Frames && window.Kits && Kits.stats().sheets.length === 4, null, { timeout: 30000 });
    await sleep(SETTLE_MS);

    // A · every part extracts, at two styles
    const ex = await page.evaluate(async ([wit, sA, sB]) => {
      const file = 'features/stickers-core.dc.html';
      const a = await Kits.extractOnly(file, wit, sA);
      const b = await Kits.extractOnly(file, wit, sB);
      const trim = o => Object.fromEntries(Object.keys(o).map(k => [k, { still: o[k].still, w: o[k].w, h: o[k].h, tags: o[k].tags, text: o[k].text }]));
      return { a: trim(a), b: trim(b) };
    }, [WITNESS, STYLE_DEFAULT, STYLE_BUSY]);
    const forty = TAGS.map(t => t[0]);
    for (const [label, got] of [['the default vector', ex.a], ['ink-sketch', ex.b]]) {
      const ids = Object.keys(got);
      const missing = forty.filter(p => !got[p] || !got[p].still);
      const box = ids.filter(p => got[p].w !== 128 || got[p].h !== 128);
      check('4.7 A · all forty parts extract at ' + label, ids.length === 40 && !missing.length && !box.length,
        ids.length + ' parts' + (missing.length ? ', NO string for ' + missing.join(', ') : '') + (box.length ? ', off the 128 box: ' + box.join(', ') : ', every box 128 × 128'));
    }
    const tagsOk = forty.filter(p => JSON.stringify((ex.a[p] || {}).tags || []) !== JSON.stringify(TAGS.find(t => t[0] === p)[2]));
    check('4.7 A · every part carries its Appendix D tags', !tagsOk.length, tagsOk.length ? tagsOk.join(', ') : '40/40, e.g. burst ' + JSON.stringify(ex.a.burst.tags));
    const textParts = forty.filter(p => ex.a[p].text);
    check('4.7 A · the text-slot parts are the ones with a <text>', textParts.length === 8, textParts.join(', '));

    // B · no literal colour survives
    const strays = [];
    for (const [label, got] of [['default', ex.a], ['ink-sketch', ex.b]])
      for (const p of Object.keys(got)) {
        const bad = strayHexes(got[p].still);
        if (bad.length) strays.push(label + '/' + p + ': ' + [...new Set(bad)].join(' '));
      }
    const witnessSeen = new Set();
    Object.keys(ex.a).forEach(p => WITNESS_HEX.forEach(h => { if (ex.a[p].still.toLowerCase().indexOf(h) >= 0) witnessSeen.add(h); }));
    check('4.7 B · no literal colour survives in any of the eighty extracted strings', !strays.length,
      strays.length ? strays.slice(0, 6).join(' | ') : 'every # is a url(#…) or one of the six witnesses; ' + witnessSeen.size + '/6 witnesses actually reached the drawings');
    // the refutation: a hex that is NOT a witness is caught when there is one
    const canary = strayHexes('<path fill="#010203" filter="url(#sk-soft-abc)" stroke="#ff00ff"/>');
    check('4.7 B · …and the reading catches one when there is one', canary.length === 1 && canary[0] === '#ff00ff', canary.join(' ') || 'nothing caught');

    // C · each data-layer exactly once
    const layers = await page.evaluate(([a, b]) => {
      const read = s => {
        const d = new DOMParser().parseFromString(s, 'image/svg+xml');
        const root = d.documentElement;
        const out = {};
        // the same naming palette-keys.js's lint uses, so the two sets compare:
        // a <g> is its data-layer, anything else is its tag
        [...root.children].forEach(c => {
          const t = c.tagName.toLowerCase();
          const k = t === 'g' ? (c.getAttribute('data-layer') || '') : t;
          out[k] = (out[k] || 0) + 1;
        });
        return out;
      };
      const map = o => Object.fromEntries(Object.keys(o).map(k => [k, read(o[k].still)]));
      return { a: map(a), b: map(b) };
    }, [ex.a, ex.b]);
    const dup = [], gone = [], dupB = [];
    for (const p of forty) {
      const want = expected(p).layers.map(l => l[0]);
      const got = layers.a[p];
      Object.keys(got).forEach(k => { if (got[k] !== 1) dup.push(p + '/' + k + ' × ' + got[k]); });
      want.forEach(k => { if (!got[k]) gone.push(p + '/' + k); });
      Object.keys(layers.b[p]).forEach(k => { if (layers.b[p][k] !== 1) dupB.push(p + '/' + k + ' × ' + layers.b[p][k]); });
    }
    check('4.7 C · each data-layer appears exactly once in every part', !dup.length && !gone.length,
      (dup.length ? 'twice: ' + dup.join(', ') + ' ' : '') + (gone.length ? 'missing: ' + gone.join(', ') : '') ||
      forty.length + ' parts, ' + forty.reduce((n, p) => n + Object.keys(layers.a[p]).length, 0) + ' layers, none twice');
    /* THE SECOND PASS OF A SKETCHED LINE IS NOT A SECOND `line` LAYER, which
       is the thing to check rather than to assume: linePasses 2 clones the
       line layer, and if the clone kept the name the rule above would be
       false at ink-sketch. kits.js marks it `line-2` instead, so the count
       stays one apiece and a reader that asks "which layer is this" still
       gets one answer. */
    const withLine = forty.filter(p => layers.a[p].line);
    const gained = withLine.filter(p => layers.b[p]['line-2'] === 1);
    check('4.7 C · …and it still holds at ink-sketch, where linePasses 2 adds a line-2', !dupB.length && gained.length === withLine.length,
      dupB.length ? 'twice: ' + dupB.join(', ') : gained.length + ' of the ' + withLine.length + ' parts with a line gained exactly one line-2, and no layer at either style appears twice');

    // D · ctrl-outline reads the drawing's alpha
    const ink = await page.evaluate(async ([parts, grid, cornerIn]) => {
      // 100 %, so a 134-px box is 134 screen px and the grid is ~13 px apart
      const b = Lab.bench.getBoundingClientRect();
      const out = {};
      for (const part of parts) {
        const el = document.getElementById('gz-sticker-' + part);
        if (!el) { out[part] = { error: 'no section' }; continue; }
        const x = +el.dataset.homeX + 67, y = +el.dataset.homeY + 67;
        Lab.camTo(1, b.width / 2 - x, b.height / 2 - y, 0);
        await new Promise(r => setTimeout(r, 250));
        const r0 = el.getBoundingClientRect();
        const centre = Kits.inkAt(el, r0.left + r0.width / 2, r0.top + r0.height / 2);
        const corners = [[cornerIn, cornerIn], [r0.width - cornerIn, cornerIn], [cornerIn, r0.height - cornerIn], [r0.width - cornerIn, r0.height - cornerIn]]
          .map(([dx, dy]) => Kits.inkAt(el, r0.left + dx, r0.top + dy));
        let hit = 0, seen = 0;
        for (let i = 0; i < grid; i++) for (let j = 0; j < grid; j++) {
          const a = Kits.inkAt(el, r0.left + (i + 0.5) * r0.width / grid, r0.top + (j + 0.5) * r0.height / grid);
          if (a === null) continue;
          seen++; if (a) hit++;
        }
        out[part] = { centre, corners, hit, seen, box: [Math.round(r0.width), Math.round(r0.height)] };
      }
      return out;
    }, [INK_PARTS, GRID, CORNER_IN]);
    for (const part of INK_PARTS) {
      const r = ink[part] || {};
      const share = r.seen ? r.hit / r.seen : -1;
      const ok = r.centre === true && Array.isArray(r.corners) && r.corners.every(c => c === false) && share > INK_LO && share < INK_HI;
      check('4.7 D · Kits.inkAt reads ' + part + "'s silhouette", ok,
        'centre ' + r.centre + ', corners [' + (r.corners || []).join(', ') + '], ' + r.hit + '/' + r.seen + ' of the grid inked (' + Math.round(share * 100) + ' %), box ' + (r.box || []).join(' × '));
    }
    check('4.7 · zero console errors and zero page errors while all of that ran', !errors.length && !pageErrors.length, errors.concat(pageErrors).join(' | ') || 'none');
    summary.extract = { parts: Object.keys(ex.a).length, strays, witnessSeen: [...witnessSeen], layersDefault: layers.a, layersBusy: layers.b, ink };
    await ctx.close(); ctx = null;

    /* ── E: the door LIVE. This is the half that writes index.html. ─────── */
    live = await browser.newContext({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });
    const lp = await live.newPage();
    const saves = [];
    lp.on('response', async r => {
      if (r.request().method() !== 'POST' || !r.url().includes('/_lab2/')) return;
      try { saves.push(await r.json()); } catch (e) { saves.push({ unreadable: true }); }
    });
    await lp.goto(BENCH, { waitUntil: 'load' });
    await lp.waitForFunction(() => window.Lab && window.Kits && window.Keep && Kits.stats().sheets.length === 4, null, { timeout: 30000 });
    await lp.waitForFunction(() => window.Keep && Keep.live === true, null, { timeout: 10000 }).then(() => true, () => false);
    check('4.7 E · the sandbox door answered (Keep.live)', await lp.evaluate(() => !!(window.Keep && Keep.live)), 'door ' + SRV.DOORS + '/default');
    await sleep(SETTLE_MS);

    // put the sticker under the camera at 100 %, then shift+click to pick it
    const box = await lp.evaluate(async (part) => {
      const el = document.getElementById('gz-sticker-' + part);
      const b = Lab.bench.getBoundingClientRect();
      Lab.camTo(1, b.width / 2 - (+el.dataset.homeX + 67), b.height / 2 - (+el.dataset.homeY + 67), 0);
      await new Promise(r => setTimeout(r, 250));
      const r0 = el.getBoundingClientRect();
      return { x: r0.left + r0.width / 2, y: r0.top + r0.height / 2 };
    }, COPY_PART);
    await lp.mouse.click(box.x, box.y, { modifiers: ['Shift'] });
    await sleep(150);
    const picked = await lp.evaluate(() => document.querySelectorAll('.gz.picked').length);
    check('4.7 E · shift+click picked the sticker', picked === 1, picked + ' picked');
    await lp.keyboard.press('Control+c');
    await sleep(120);
    await lp.keyboard.press('Control+v');
    await sleep(400);
    const made = await lp.evaluate(() => {
      const el = [...document.querySelectorAll('#bench-world .gz[data-gizmo*="-copy-"]')].pop();
      if (!el) return null;
      const s = el.getAttribute('style') || '';
      return { gizmo: el.dataset.gizmo, src: el.dataset.src, label: el.getAttribute('aria-label'),
               dataW: el.dataset.w, dataH: el.dataset.h, x: el.dataset.homeX, y: el.dataset.homeY,
               z: el.dataset.homeZ, style: s, art: !!el.querySelector('.gz-art'), iframe: !!el.querySelector('iframe'),
               copies: (JSON.parse(localStorage.getItem(Lab.storeKey('copies')) || '{"list":[]}').list || []).length };
    });
    check('4.7 E · ctrl+c / ctrl+v made a copy on the paper', !!made && /-copy-/.test(made.gizmo || '') && made.art && !made.iframe,
      made ? made.gizmo + ', data-src=' + made.src + ', .gz-art ' + made.art + ', iframe ' + made.iframe : 'no copy section appeared');

    const savedBefore = saves.length;
    await lp.keyboard.press('Control+s');
    const t0 = Date.now();
    while (saves.length <= savedBefore && Date.now() - t0 < SAVE_WAIT) await sleep(100);
    const wrote = saves.slice(savedBefore).some(s => s && s.ok);
    check('4.7 E · ctrl+s was answered by the door', wrote, JSON.stringify(saves.slice(savedBefore)));
    await lp.evaluate(() => { const p = document.getElementById('lab-keep'); if (p && window.Keep && Keep.live) p.click(); });  // pause the autosave before the close (the pagehide trap, CHANGELOG Phase 5 step 3)
    await sleep(200);
    await live.close(); live = null;

    // …and now the file
    const now = fs.readFileSync(FILE, 'utf8');
    const top = now.indexOf(SRV.MARK_TOP), end = now.indexOf(SRV.MARK_END);
    const block = top >= 0 && end > top ? now.slice(top + SRV.MARK_TOP.length, end) : '';
    const secs = (block.match(/<section class="gz"/g) || []).length;
    check('4.7 E · the copies block gained exactly one section', secs === 1, secs + ' sections between the two markers');
    const gz = made && made.gizmo;
    check('4.7 E · it is the copy, inside the block, with a .gz-art and no iframe',
      !!gz && block.indexOf('data-gizmo="' + gz + '"') >= 0 && /<div class="gz-art"><\/div>/.test(block) && block.indexOf('<iframe') < 0,
      gz + (block.indexOf('<iframe') >= 0 ? ' — THERE IS AN IFRAME IN THE BLOCK' : ''));
    check('4.7 E · its data-src is the stickers sheet at the same part',
      block.indexOf('data-src="features/stickers-core.dc.html#part=' + COPY_PART + '"') >= 0,
      (block.match(/data-src="[^"]*"/) || ['none'])[0]);
    /* THE STRONG FORM. The eight lines in the file are compared with what
       serve.js's own copyMarkup() writes for the attributes the file now
       carries — so the shape is checked against the function that wrote it
       rather than against a description of it. The section's own tag is the
       input, so a wrong VALUE cannot be caught this way; a wrong SHAPE (an
       iframe, a missing gz-art, an indent, a line out of order) cannot slip
       through. */
    const secStart = block.indexOf('  <section class="gz"');
    const secEnd = block.indexOf('</section>', secStart);
    const inFile = secStart >= 0 && secEnd > secStart ? block.slice(secStart, secEnd + '</section>'.length) : '';
    const attr = (s, n) => { const m = new RegExp('\\s' + n + '="([^"]*)"').exec(s); return m ? m[1] : undefined; };
    const wh = /style="width:(\d+)px;height:(\d+)px"/.exec(inFile) || [0, 0, 0];
    const rebuilt = SRV.copyMarkup({
      gizmo: attr(inFile, 'data-gizmo'), src: attr(inFile, 'data-src'), label: attr(inFile, 'aria-label'),
      dataW: attr(inFile, 'data-w'), dataH: attr(inFile, 'data-h'),
      x: attr(inFile, 'data-home-x'), y: attr(inFile, 'data-home-y'), z: attr(inFile, 'data-home-z'),
      w: +wh[1], h: +wh[2], copy: true
    }).replace(/^\n\n/, '');
    const lines = inFile.split('\n').length;
    check('4.7 E · the section in the file is byte-identical to serve.js copyMarkup()', inFile === rebuilt && lines === 8,
      lines + ' lines' + (inFile === rebuilt ? ', identical' : ',\n  file:  ' + JSON.stringify(inFile) + '\n  wrote: ' + JSON.stringify(rebuilt)));
    summary.copy = { gizmo: gz, made, sections: secs, lines, identical: inFile === rebuilt, saves: saves.slice(savedBefore), inFile };
  } catch (e) {
    check('4.7 · the run itself', false, String(e && e.stack || e));
  } finally {
    for (const c of [ctx, live]) if (c) { try { await c.close(); } catch (e) {} }
    try { await browser.close(); } catch (e) {}
    await sleep(UNLOAD);
    /* ── put the file back, and prove it ─────────────────────────────────
       What THIS run is allowed to have changed: one section appended inside
       the copies block, and data-home-z on every section (lab.js puts what
       you just made on top of the pile and everything above it steps down
       one). Anything else is somebody else's edit and the restore refuses,
       loudly, rather than writing over it. */
    const neutral = s => {
      const top = s.indexOf(SRV.MARK_TOP), end = s.indexOf(SRV.MARK_END);
      if (top >= 0 && end > top) s = s.slice(0, top + SRV.MARK_TOP.length) + s.slice(end);
      return s.replace(/\s+data-home-z="[^"]*"/g, '');
    };
    const nowBuf = fs.readFileSync(FILE);
    const mine = neutral(nowBuf.toString()) === neutral(before.toString());
    if (mine) fs.writeFileSync(FILE, before);
    check('4.7 restore: only this run\'s edits were on the file', mine,
      mine ? 'restored from results/parts/index.before.html' : 'NOT restored — index.html changed in a way this script did not make; the copy is in results/parts/index.before.html');
    try { if (!bakAtStart && fs.existsSync(BAK)) fs.unlinkSync(BAK); } catch (e) {}
    try { if (fs.existsSync(TMP)) fs.unlinkSync(TMP); } catch (e) {}
    await sleep(UNLOAD);
    check('4.7 restore: index.html is byte-identical to before', Buffer.compare(fs.readFileSync(FILE), before) === 0, before.length + ' bytes');
    check('4.7 restore: index.html.keep-bak is gone', bakAtStart || !fs.existsSync(BAK), bakAtStart ? 'one was here before this run and was left alone' : BAK);
  }
  return summary;
}

/* ══ the run ═════════════════════════════════════════════════════════════ */
(async () => {
  const args = process.argv.slice(2);
  let sheet = null, bench = null;
  if (!args.includes('--no-sheet')) sheet = await sheetPass(args);
  if (!args.includes('--no-bench')) bench = await benchPass();
  const failed = results.filter(r => !r.ok).length;
  fs.writeFileSync(path.join(OUT, 'sheet-summary.json'), JSON.stringify({
    when: new Date().toISOString(), parts: sheet ? sheet.parts : null, shot: sheet ? sheet.shot : null,
    bench, results
  }, null, 2));
  console.log(`${results.length - failed}/${results.length} PASS — ${sheet ? sheet.parts.length + ' parts, ' + sheet.shot.length + ' shot' : 'sheet half skipped'}${bench ? ', the bench half ran' : ', bench half skipped'}`);
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e && e.stack || e); process.exit(1); });
