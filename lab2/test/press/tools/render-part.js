#!/usr/bin/env node
/* ─── RENDER-PART ─────────────────────────────────────────────────────────
   Draws a sticker part the way the bench will draw it, so the agent drawing
   it can LOOK. A part in press/tools/parts/<part>.html is written in roles
   ({{ skPrimary }} …) and never shows its colours until a sheet fills them;
   this fills them from one of three palettes, puts the svg on a page of the
   matching paper, and screenshots it big.

   USAGE (from site/):

       node lab2/test/press/tools/render-part.js <part|all> [--palette knoll|neon|moss|all] [--scale 4] [--halo]

   Writes lab2/test/perf/results/parts/<part>.png (knoll) and
   <part>-neon.png / <part>-moss.png — with no --palette it renders knoll AND
   neon, because a part that reads on white paper and on near-black is a part
   whose roles are used the right way round; --palette all adds moss. `all`
   renders every part in parts/ and also writes contact.png (knoll) and
   contact-<palette>.png: every part at ×1.5 in a grid of 8 across with its
   id under it, the tray at a glance.

   THE THREE PALETTES:
     knoll  CONTRACTS.md §7's defaults — the bench's own pink, blue and ink
            (lab.css :root) on white paper, stroke 3, radius 6, the word
            HELLO in a text slot; the page is the bench paper, #efe7ed
            (--bench-bg), because that is what a sticker on the bench stands
            on and a white page would hide the halo test.
     neon   the neonrun fixture's magenta and cyan on near-black paper,
            light ink, a thinner stroke (2) and rounder corners (10); page
            #07060c, the fixture's ground. A part whose "paper" role is
            really "white" breaks here, which is the point.
     moss   the mosslight fixture's green and ochre on parchment, dark ink,
            the heaviest stroke (4) and the roundest corners (14); page
            #ece6d2. A part whose line layer has a literal width shows it
            here.

   HOW IT DRAWS. Playwright launches headless system Chrome ({channel:
   'chrome', headless:true} — rendering only, as make-fixtures.js does; perf
   numbers are always headed). The page is built in memory and served from
   a made-up origin, http://sk.local/, through page.route(): the stage page
   at /__stage__, and everything else — fonts/fonts.css and the woff2 files
   a text part's var(--display) wants — straight off lab2/test/ on disk. One
   origin for page and fonts means no CORS dance, and no server needs to be
   up. The svg keeps its 128 css px and the CONTEXT is scaled
   (deviceScaleFactor = --scale, default 4 → 512 px), so the root
   drop-shadow's 6px 7px stays 6/7 units of the drawing as it does on the
   bench, rather than shrinking to a quarter as it would if the svg were
   simply set to 512 px wide. 40 device px of page all round (PAD = 40 /
   scale css px), enough for the 6/7-unit shadow (28 px at ×4) and the
   halo's 3 (12 px). Animations are switched off for the shot (a sway
   caught mid-skew would move the box); --halo shows the halo layer so the
   die-cut edge can be checked, and writes <part>[-<palette>]-halo.png so
   the plain render stands. The sheet's defs (sk-defs.html) are on the
   stage too, filled from the same palette, so a part that reaches for a
   url(#sk-…) by mistake renders as it would on the bench — and the linter
   flags it.

   THE INK BOX it prints is measured the way kits.js measures a part — off
   the pixels, not the geometry: the svg is cloned without its drop-shadow
   and with the halo off, serialised to a data: URL, drawn on a canvas at ×4
   and its alpha scanned; a pixel counts as ink above alpha 16 of 255 (the
   same ALPHA_T Palette.sample uses — an antialiased edge at a sixteenth of
   coverage is not ink). Two warnings follow from it: `spills` when the box
   goes past 0..128 by more than 3 in any direction (the halo's own
   allowance; anything more and kits.js lets the section's box out and the
   sticker's neighbours move), and `small` when the ink fills less than 60 %
   of the box in BOTH axes (a sticker fills its box; a thin arrow may be
   narrow, but not narrow and short). Note the canvas cannot use the page's
   webfont (an svg in an <img> loads no external font), so a text part's
   box is measured with the fallback face — inside its slot either way.
   ───────────────────────────────────────────────────────────────────────── */
'use strict';
const fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const PK = require('./palette-keys.js');

const TEST_DIR = path.resolve(__dirname, '..', '..');                       // lab2/test
const OUT_DIR = path.join(TEST_DIR, 'perf', 'results', 'parts');
const DEFS_FILE = path.join(__dirname, 'sk-defs.html');
const ALPHA_T = 16, SPILL = 3, FILL_MIN = 0.6, PAD_PX = 40, CONTACT_SCALE = 1.5, CONTACT_ACROSS = 8;

const PALETTES = {
  knoll: { page: '#efe7ed', skPrimary: '#c93b82', skSecondary: '#5871f5', skInk: '#26212a', skPaper: '#ffffff', skHighlight: '#ef4d98', skShadow: '#8a2558', skStroke: 3, skRadius: 6, skText: 'HELLO' },
  neon:  { page: '#07060c', skPrimary: '#ff2fb0', skSecondary: '#22e6ff', skInk: '#f4f0ff', skPaper: '#0b0a12', skHighlight: '#ffffff', skShadow: '#7a1560', skStroke: 2, skRadius: 10, skText: 'NEON' },
  moss:  { page: '#ece6d2', skPrimary: '#6c8f4a', skSecondary: '#b58a3c', skInk: '#2b2a20', skPaper: '#f4efe0', skHighlight: '#d8e6b0', skShadow: '#3d5a2a', skStroke: 4, skRadius: 14, skText: 'MOSS' },
};

/* sc-camel-x-y → xY, {{ role }} → the palette's value, comments dropped. The
   same two rewrites kits.js's decodeAttrs makes, done on the text. */
function fill(src, pal) {
  return PK.blankComments(src)
    .replace(/\bsc-camel-([\w-]+)=/g, (m, k) => k.replace(/-([a-z])/g, (x, c) => c.toUpperCase()) + '=')
    .replace(/\{\{\s*(\w+)\s*\}\}/g, (m, k) => (k in pal ? String(pal[k]) : ''));
}
/* The part's own <svg>, lifted out of its <sc-if> verbatim. */
function partSvg(part) {
  const src = fs.readFileSync(PK.partFile(part), 'utf8');
  const doc = PK.parse(src), svg = PK.els(doc).find(e => e.tag === 'svg');
  if (!svg) throw new Error(part + ': no <svg>');
  return src.slice(svg.start, svg.end);
}
function defsSvg() { return fs.existsSync(DEFS_FILE) ? fs.readFileSync(DEFS_FILE, 'utf8') : ''; }

function stagePage(parts, pal, opts) {
  const scale = opts.scale, pad = PAD_PX / scale;
  const contact = opts.contact;
  const fonts = '<link rel="stylesheet" href="/fonts/fonts.css">';
  const css = `
    :root { --display: 'Sora', sans-serif; --body: 'Public Sans', sans-serif; }
    html, body { margin: 0; background: ${pal.page}; }
    * { animation: none !important; }
    #stage { display: inline-block; padding: ${pad}px; }
    #stage > svg:not([data-defs]) { display: block; width: 128px; height: 128px; }
    .grid { display: grid; grid-template-columns: repeat(${CONTACT_ACROSS}, max-content); gap: 8px 10px; padding: 14px; }
    .cell { display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 10px 10px 6px; }
    .cell > svg { display: block; width: 128px; height: 128px; }
    .lbl { font: 600 11px/1.2 'Public Sans', sans-serif; color: ${pal.skInk}; opacity: .8; }
    ${opts.halo ? '[data-layer="halo"] { display: inline !important; }' : ''}`;
  let body;
  if (contact) {
    body = '<div class="grid">' + parts.map(p => `<div class="cell" data-part="${p.id}">${fill(p.svg, pal)}<div class="lbl">${p.id}</div></div>`).join('') + '</div>';
  } else {
    body = `<div id="stage">${fill(defsSvg(), pal)}${fill(parts[0].svg, pal)}</div>`;
  }
  return `<!doctype html><html><head><meta charset="utf-8">${fonts}<style>${css}</style></head><body>${body}</body></html>`;
}

/* In-page: the ink box off the pixels (see the header). Returns units. A
   real function, not a string — Playwright evaluates a string as an
   EXPRESSION and would hand back the function unserialised. The svg is
   drawn into the middle of a canvas twice its size so ink that spills the
   box is counted, not clipped. */
async function measureInPage({ sel, alphaT }) {
  const svg = document.querySelector(sel);
  const c = svg.cloneNode(true);
  c.style.filter = 'none'; c.style.animation = 'none';
  c.querySelectorAll('[data-layer="halo"]').forEach(h => h.remove());
  c.setAttribute('width', '128'); c.setAttribute('height', '128');
  if (!c.getAttribute('xmlns')) c.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  const S = 4, N = 128 * S;
  const img = new Image();
  await new Promise((ok, no) => { img.onload = ok; img.onerror = () => no(new Error('svg did not load as an image')); img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(new XMLSerializer().serializeToString(c)); });
  const cv = document.createElement('canvas'); cv.width = N * 2; cv.height = N * 2;
  const ctx = cv.getContext('2d');
  ctx.drawImage(img, N / 2, N / 2, N, N);
  const d = ctx.getImageData(0, 0, N * 2, N * 2).data;
  let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1, n = 0;
  for (let y = 0; y < N * 2; y++) for (let x = 0; x < N * 2; x++) {
    if (d[(y * N * 2 + x) * 4 + 3] > alphaT) { n++; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  }
  if (!n) return null;
  return { x0: (x0 - N / 2) / S, y0: (y0 - N / 2) / S, x1: (x1 + 1 - N / 2) / S, y1: (y1 + 1 - N / 2) / S };
}

function report(part, pal, box) {
  const notes = [];
  if (!box) return `  ${part} [${pal}] ink box: NOTHING DRAWN`;
  const w = box.x1 - box.x0, h = box.y1 - box.y0;
  const spill = Math.max(-box.x0, -box.y0, box.x1 - 128, box.y1 - 128);
  if (spill > SPILL) notes.push(`spills ${spill.toFixed(1)} past the box (the halo may spill ${SPILL})`);
  if (w < FILL_MIN * 128 && h < FILL_MIN * 128) notes.push(`small: fills ${(w / 128 * 100).toFixed(0)} % × ${(h / 128 * 100).toFixed(0)} % (a sticker fills 60 % of its box in one axis at least)`);
  const f = v => v.toFixed(1);
  return `  ${part} [${pal}] ink box ${f(box.x0)}..${f(box.x1)} × ${f(box.y0)}..${f(box.y1)} (${f(w)} × ${f(h)}, ${(w / 128 * 100).toFixed(0)} % × ${(h / 128 * 100).toFixed(0)} %)` + (notes.length ? '\n    WARNING ' + notes.join('\n    WARNING ') : '');
}

async function serveFrom(context, html) {
  await context.route('http://sk.local/**', route => {
    const u = new URL(route.request().url());
    if (u.pathname === '/__stage__') return route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: html.current });
    const file = path.join(TEST_DIR, decodeURIComponent(u.pathname));
    if (!file.startsWith(TEST_DIR) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) return route.fulfill({ status: 404, body: 'not here' });
    const ext = path.extname(file).toLowerCase();
    const type = { '.css': 'text/css', '.woff2': 'font/woff2', '.woff': 'font/woff', '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png', '.svg': 'image/svg+xml' }[ext] || 'application/octet-stream';
    return route.fulfill({ status: 200, contentType: type, body: fs.readFileSync(file) });
  });
}

async function main() {
  const args = process.argv.slice(2);
  const opt = (name, dflt) => { const i = args.indexOf(name); return i >= 0 && args[i + 1] !== undefined ? args[i + 1] : dflt; };
  const names = args.filter((a, i) => !a.startsWith('--') && !(args[i - 1] === '--palette' || args[i - 1] === '--scale'));
  if (!names.length) { console.log('usage: node lab2/test/press/tools/render-part.js <part|all> [--palette knoll|neon|moss|all] [--scale 4] [--halo]'); process.exit(2); }
  const scale = parseFloat(opt('--scale', '4')) || 4, halo = args.includes('--halo');
  const palArg = opt('--palette', null);
  const palettes = palArg === 'all' ? Object.keys(PALETTES) : palArg ? [palArg] : ['knoll', 'neon'];
  palettes.forEach(p => { if (!PALETTES[p]) { console.log('no palette ' + p + ' — knoll, neon, moss or all'); process.exit(2); } });
  const all = names[0] === 'all';
  const list = all ? PK.listParts() : names;
  if (!list.length) { console.log('no parts in ' + PK.PARTS_DIR); process.exit(1); }
  const parts = [];
  for (const id of list) {
    if (!fs.existsSync(PK.partFile(id))) { console.log(id + ': no such part'); process.exit(1); }
    parts.push({ id, svg: partSvg(id) });
  }
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  let warnings = 0;
  try {
    const html = { current: '' };
    const ctx = await browser.newContext({ viewport: { width: 400, height: 400 }, deviceScaleFactor: scale });
    await serveFrom(ctx, html);
    const page = await ctx.newPage();
    page.on('pageerror', e => console.log('  page error: ' + e.message));
    for (const palName of palettes) {
      const pal = PALETTES[palName];
      for (const p of parts) {
        html.current = stagePage([p], pal, { scale, halo });
        await page.goto('http://sk.local/__stage__', { waitUntil: 'load' });
        await page.evaluate(() => document.fonts ? document.fonts.ready : null);
        const file = path.join(OUT_DIR, p.id + (palName === 'knoll' ? '' : '-' + palName) + (halo ? '-halo' : '') + '.png');
        await page.locator('#stage').screenshot({ path: file, omitBackground: false });
        let box = null;
        try { box = await page.evaluate(measureInPage, { sel: '#stage > svg:not([data-defs])', alphaT: ALPHA_T }); } catch (e) { console.log('  measure failed: ' + e.message); }
        const line = report(p.id, palName, box);
        if (/WARNING/.test(line)) warnings++;
        console.log(path.relative(process.cwd(), file).replace(/\\/g, '/'));
        console.log(line);
      }
    }
    await ctx.close();

    if (all) {
      // 160 css px a cell (128 + the cell's own padding and the grid gap), a
      // short viewport so fullPage grows the shot to the rows there are
      const cctx = await browser.newContext({ viewport: { width: CONTACT_ACROSS * 160 + 40, height: 200 }, deviceScaleFactor: CONTACT_SCALE });
      await serveFrom(cctx, html);
      const cpage = await cctx.newPage();
      for (const palName of palettes) {
        html.current = stagePage(parts, PALETTES[palName], { scale: CONTACT_SCALE, halo, contact: true });
        await cpage.goto('http://sk.local/__stage__', { waitUntil: 'load' });
        await cpage.evaluate(() => document.fonts ? document.fonts.ready : null);
        const file = path.join(OUT_DIR, 'contact' + (palName === 'knoll' ? '' : '-' + palName) + '.png');
        await cpage.screenshot({ path: file, fullPage: true });
        console.log(path.relative(process.cwd(), file).replace(/\\/g, '/') + ` — ${parts.length} parts at ×${CONTACT_SCALE}, ${CONTACT_ACROSS} across`);
      }
      await cctx.close();
    }
  } finally {
    await browser.close();
  }
  if (warnings) console.log(`${warnings} render${warnings === 1 ? '' : 's'} with a warning — look at the PNGs`);
}

if (require.main === module) main().catch(e => { console.error(e && e.stack || e); process.exit(1); });

module.exports = { PALETTES, fill, partSvg, stagePage };
