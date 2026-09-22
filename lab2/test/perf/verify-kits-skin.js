/* lab2/test/perf/verify-kits-skin.js — does kits.js really re-skin?
   USAGE (from site/, with the SANDBOX server up on 4322):
       node lab2/test/serve.js 4322        (in another shell, if it is down)
       node lab2/test/perf/verify-kits-skin.js

   Phase 4 (PRESS-TABLE-PLAN.md §8 4.2–4.5) taught kits.js three new things:
   a palette read off the page, a per-section variant, and a style pass. Each
   is easy to write and easy to get subtly wrong in a way that only shows on
   ONE of the two paths — the LIVE svg or the SPRITE bitmap — so every check
   here asks both. The bug this file exists to catch is the sprite cache key:
   two stickers of the same part in two different colours would, under the old
   key, share one bitmap and be drawn in each other's colours the moment they
   were far enough away to be sprites, which is exactly when nobody is
   looking closely.

   HOW IT GETS ITS STICKERS. index.html's tray is another agent's file, so
   nothing here writes to it: the page's HTML is rewritten ON THE WAY IN by
   page.route — eight sections spliced in at the tray's closing marker,
   press/style.js added so the presets can be read in the page, and (in the
   second pass) a :root block of --sk-* tokens before </head>. Nothing on
   disk changes but this script's own results folder.

   THE EIGHT SECTIONS. Six at the sheet's own box (134 × 135, data-scale
   absent) for the colour, text and rotation checks, and two at data-scale=3
   (a 402 × 405 box) for the grade checks, which need a part drawn over
   FULL_PX 300:

     sk-plain    burst                          the page's own palette
     sk-var      burst, data-palette             its own primary
     sk-var2     burst, the SAME data-palette    proves the variant cache
     sk-text     banner, data-text="WISHLIST"    a word in a text slot
     sk-rot      tape-strip, data-rot="40"       turned
     sk-norot    tape-strip                      the same part, not turned
     sk-big1/2   burst, data-scale="3"           big enough to earn a grade

   THE CAMERAS, and why each one. LIVE checks at 200 %: past ZOOM_NO_TILES
   1.25 there are no tiles at all and every part near the middle is lifted,
   whatever its size. SPRITE checks at 50 %: tiles exist, and 135 × 0.5 = 67
   screen px is well under SWAY_PX 180, so nothing near is live and what is
   painted on the tile is the whole answer. GRADE checks at 100 % over the
   two data-scale=3 sections, which are drawn at 1215 px there (kits.js's px
   is the box times its fit) and so are the only parts on the page eligible
   for 'sway' or 'full'.

   A tile pixel is read straight out of the tile canvas: a tile carries its
   world rectangle in style.left/top/width/height, so a world point maps to a
   canvas pixel by one division.

   THE DOOR IS BLOCKED (page.route('**\/_lab2/**') → 404) in every context,
   as every verifier in this folder does it, so keep.js knocks once, is told
   there is no door, and goes quiet. Nothing is ever POSTed.

   Results: perf/results/kits-skin/summary.json and eight PNGs. */
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');

const BASE = 'http://localhost:4322/lab2/test/';
const NOBENCH = BASE + '_verify-no-bench.html';       // never on disk — fulfilled by page.route
const OUT = path.join(__dirname, 'results', 'kits-skin');
fs.mkdirSync(OUT, { recursive: true });

/* the nine Knoll defaults, CONTRACTS §7 — the sheet's own, and what a page
   with no --sk-* must come out as */
const KNOLL = { skPrimary: '#c93b82', skSecondary: '#5871f5', skInk: '#26212a', skPaper: '#ffffff',
                skHighlight: '#ef4d98', skShadow: '#8a2558', skStroke: 3, skRadius: 6, skText: '' };
/* the injected skin: six colours nowhere near the Knoll six (so a stale
   default cannot pass by luck) and two numbers that are not 3 and 6 */
const SKIN = { primary: '#0a7d3f', secondary: '#7a1fbf', ink: '#101820', paper: '#fffdf5',
               highlight: '#ffd166', shadow: '#04381c', stroke: 5, radius: 2 };
const VAR_PRIMARY = '#e2231a';        // the two sections that keep their own colour
const WORD = 'WISHLIST';
const ROT = 40;                       // degrees, inside kits.js's ROT_MAX 45

const results = [];
const check = (name, ok, info) => {
  results.push({ name, ok: !!ok, info: info === undefined ? '' : String(info) });
  console.log((ok ? 'PASS ' : 'FAIL ') + name + (info !== undefined ? ' — ' + info : ''));
};
const hexRgb = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const near = (a, b, tol) => !!a && !!b && Math.abs(a[0] - b[0]) <= tol && Math.abs(a[1] - b[1]) <= tol && Math.abs(a[2] - b[2]) <= tol;
const parseRgb = s => { const m = /rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/.exec(String(s || '')); return m ? [Math.round(+m[1]), Math.round(+m[2]), Math.round(+m[3])] : null; };

// ── the sections spliced into the tray, and the two other rewrites ─────────
function section(id, part, x, y, extra, scale) {
  const w = scale ? 134 * scale : 134, h = scale ? 135 * scale : 135;
  return '  <section class="gz" id="gz-' + id + '" data-gizmo="' + id + '"\n'
       + '           data-src="features/stickers-core.dc.html#part=' + part + '" data-w="134" data-h="135"\n'
       + (scale ? '           data-scale="' + scale + '"\n' : '')
       + '           data-home-x="' + x + '" data-home-y="' + y + '"' + (extra || '') + '\n'
       + '           style="width:' + w + 'px;height:' + h + 'px" aria-label="' + id + '">\n'
       + '    <div class="gz-art"></div>\n'
       + '    <span class="gz-dim" aria-hidden="true"></span>\n'
       + '    <button type="button" class="gz-size" data-nodrag aria-label="re-cut it"></button>\n'
       + '  </section>\n';
}
const VAR_ATTR = ' data-palette=\'{"skPrimary":"' + VAR_PRIMARY + '"}\'';
const TRAY = [
  section('sk-plain', 'burst', 0, 2400),
  section('sk-var', 'burst', 300, 2400, VAR_ATTR),
  section('sk-var2', 'burst', 600, 2400, VAR_ATTR),
  section('sk-text', 'banner', 900, 2400, ' data-text="' + WORD + '"'),
  section('sk-rot', 'tape-strip', 0, 2700, ' data-rot="' + ROT + '"'),
  section('sk-norot', 'tape-strip', 300, 2700),
  section('sk-big1', 'burst', 0, 3200, '', 3),
  section('sk-big2', 'burst', 500, 3200, '', 3),
  section('sk-rotbig', 'burst', 1000, 3200, ' data-rot="-25"', 3)
].join('');
const MARK = '<!-- ▲ THE STICKER TRAY -->';
const TOKENS = ':root{--sk-primary:' + SKIN.primary + ';--sk-secondary:' + SKIN.secondary + ';--sk-ink:' + SKIN.ink
             + ';--sk-paper:' + SKIN.paper + ';--sk-highlight:' + SKIN.highlight + ';--sk-shadow:' + SKIN.shadow
             + ';--sk-stroke:' + SKIN.stroke + ';--sk-radius:' + SKIN.radius + '}';

function rewrite(html, withTokens) {
  if (html.indexOf(MARK) < 0) throw new Error('the sticker-tray marker is gone from index.html — this script splices its sections there');
  let out = html.replace(MARK, TRAY + MARK);
  out = out.replace('</head>', '<script src="press/style.js"></script>' + (withTokens ? '<style>' + TOKENS + '</style>' : '') + '\n</head>');
  if (out === html) throw new Error('the rewrite changed nothing');
  return out;
}

/* the page with no bench: kits.js and nothing else. It lives at a URL that is
   not on disk and is fulfilled here, so the sandbox folder is unchanged. Its
   relative paths (features/…, press/…) resolve from /lab2/test/. */
const NOBENCH_HTML = '<!doctype html><html><head><meta charset="utf-8"><title>no bench</title>'
  + '<style>' + TOKENS + '</style><script src="press/style.js"></script></head>'
  + '<body><p>no #bench-world here</p><script src="kits.js"></script></body></html>';

// ── one visit ─────────────────────────────────────────────────────────────
async function visit(browser, { tokens }) {
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const consoleLines = [], pageErrors = [], notOk = [];
  page.on('console', m => consoleLines.push({ type: m.type(), text: m.text(), url: (m.location() && m.location().url) || '' }));
  page.on('pageerror', e => pageErrors.push(String(e)));
  page.on('response', r => { if (r.status() >= 400) notOk.push(r.status() + ' ' + r.url()); });
  await page.route('**/_lab2/**', r => r.fulfill({ status: 404, body: 'no' }));
  await page.route(BASE, async r => {
    const res = await r.fetch();
    const html = await res.text();
    await r.fulfill({ response: res, body: rewrite(html, tokens), headers: { 'content-type': 'text/html; charset=utf-8' } });
  });
  await page.goto(BASE, { waitUntil: 'load' });
  await page.waitForFunction(() => window.Lab && window.Frames && window.Kits && window.Style
    && Kits.stats().sheets.indexOf('stickers') >= 0
    && Kits.sheets.stickers.parts.burst && Kits.sheets.stickers.parts.burst.ink, null, { timeout: 30000 });
  await page.waitForTimeout(900);
  await install(page);
  return { page, ctx, consoleLines, pageErrors, notOk };
}

// the helpers that live in the page, installed once per visit
async function install(page) {
  await page.evaluate(() => {
    window.__vk = {
      box(id) {
        const el = document.querySelector('[data-gizmo="' + id + '"]');
        return { x: parseFloat(el.style.left), y: parseFloat(el.style.top), w: parseFloat(el.style.width), h: parseFloat(el.style.height) };
      },
      look(id, z) {
        const b = window.__vk.box(id), r = Lab.bench.getBoundingClientRect();
        Lab.camTo(z, r.width / 2 - (b.x + b.w / 2) * z, r.height / 2 - (b.y + b.h / 2) * z, 0);
      },
      // the fill the browser actually computed for a layer's first painted shape
      layerFill(id, layer) {
        const el = document.querySelector('[data-gizmo="' + id + '"]');
        const n = el.querySelector('.gz-art > svg > g[data-layer="' + layer + '"] > *');
        return n ? getComputedStyle(n).fill : null;
      },
      layerStroke(id, layer) {
        const el = document.querySelector('[data-gizmo="' + id + '"]');
        const n = el.querySelector('.gz-art > svg > g[data-layer="' + layer + '"] > *');
        return n ? { stroke: getComputedStyle(n).stroke, width: getComputedStyle(n).strokeWidth, join: getComputedStyle(n).strokeLinejoin } : null;
      },
      live(id) {
        const el = document.querySelector('[data-gizmo="' + id + '"]');
        const svg = el.querySelector('.gz-art > svg'), cv = el.querySelector('.gz-art > canvas');
        return { svg: !!svg, canvas: !!cv, rotate: (svg || cv) ? (svg || cv).style.rotate : '',
                 words: [...el.querySelectorAll('.gz-art > svg text')].map(t => t.textContent) };
      },
      // a pixel out of the tile the sprites are painted on, by world point
      tile(wx, wy) {
        for (const c of document.querySelectorAll('#kit-layer canvas.kit-tile')) {
          const L = parseFloat(c.style.left), T = parseFloat(c.style.top), W = parseFloat(c.style.width), H = parseFloat(c.style.height);
          if (wx >= L && wx < L + W && wy >= T && wy < T + H) {
            const px = Math.floor((wx - L) / W * c.width), py = Math.floor((wy - T) / H * c.height);
            const d = c.getContext('2d').getImageData(px, py, 1, 1).data;
            return [d[0], d[1], d[2], d[3]];
          }
        }
        return null;
      },
      centreTile(id) { const b = window.__vk.box(id); return window.__vk.tile(b.x + b.w / 2, b.y + b.h / 2); },
      // ink.js's question, asked over an n × n grid of the box, client coords
      inkGrid(id, n) {
        const el = document.querySelector('[data-gizmo="' + id + '"]'), r = el.getBoundingClientRect(), out = [];
        for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
          out.push(Kits.inkAt(el, r.left + r.width * (i + 0.5) / n, r.top + r.height * (j + 0.5) / n) ? 1 : 0);
        }
        return out;
      },
      // how many DISTINCT skins the page's sticker sections ask for
      distinctSkins() {
        const s = new Set();
        document.querySelectorAll('.gz[data-kit="stickers"]').forEach(e => {
          const p = e.dataset.palette || '', t = e.dataset.text || '';
          if (p || t) s.add(e.dataset.part + '|' + p + '|' + t);
        });
        return s.size;
      },
      // what the style pass left in one part's still string
      finger(part) {
        const P = Kits.sheets.stickers.parts[part];
        const d = new DOMParser().parseFromString(P.still, 'image/svg+xml');
        const svg = d.documentElement;
        const g = n => svg.querySelector(':scope > g[data-layer="' + n + '"]');
        const line = g('line'), shadow = g('shadow'), halo = g('halo'), detail = g('detail');
        const first = e => (e && e.firstElementChild) || null;
        const tex = svg.querySelector('[data-layer="texture"]');
        return {
          line: !!line, line2: !!g('line-2'), detail: !!detail, shadow: !!shadow,
          strokeWidth: line && first(line) ? first(line).getAttribute('stroke-width') : null,
          strokeColour: line && first(line) ? first(line).getAttribute('stroke') : null,
          join: line ? line.getAttribute('stroke-linejoin') : null,
          radius: (svg.querySelector('[rx]') || { getAttribute: () => null }).getAttribute('rx'),
          lineFilter: line ? line.getAttribute('filter') : null,
          shadowFilter: shadow ? shadow.getAttribute('filter') : null,
          shadowFill: shadow && first(shadow) ? first(shadow).getAttribute('fill') : null,
          texture: !!tex, textureFill: tex ? tex.getAttribute('fill') : null,
          textureClip: tex ? tex.getAttribute('clip-path') : null,
          haloShown: !!halo && !/display\s*:\s*none/.test(halo.getAttribute('style') || ''),
          rootStyle: svg.getAttribute('style') || '',
          defs: [...svg.querySelectorAll(':scope > defs > *')].map(n => n.getAttribute('id')),
          wobbleScale: (svg.querySelector('feDisplacementMap') || { getAttribute: () => null }).getAttribute('scale'),
          filtered: !!P.filtered, pixel: P.pixel, text: P.text, bytes: P.still.length
        };
      }
    };
  });
}

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: false, args: ['--window-size=1616,1110', '--window-position=0,0'] });
  const summary = { date: new Date().toISOString(), url: BASE, skin: SKIN, knoll: KNOLL };

  /* ══ 1 · THE PAGE SAYS NOTHING: the sheet must come out in Knoll ══════ */
  {
    const A = await visit(browser, { tokens: false });
    const pal = await A.page.evaluate(() => ({
      resolved: Kits.sheets.stickers.palette, parts: Object.keys(Kits.sheets.stickers.parts).length,
      leftovers: Object.keys(Kits.sheets.stickers.parts).filter(p => /\{\{/.test(Kits.sheets.stickers.parts[p].full))
    }));
    check('defaults: the stickers sheet extracted all forty parts', pal.parts === 40, 'parts=' + pal.parts);
    check('defaults: no {{ interpolation }} survived in any part', pal.leftovers.length === 0, pal.leftovers.join(',') || 'none');
    check('defaults: with no --sk-* on the page the palette is the Knoll nine',
      Object.keys(KNOLL).every(k => String(pal.resolved[k]) === String(KNOLL[k])), JSON.stringify(pal.resolved));
    await A.page.evaluate(() => window.__vk.look('sk-plain', 2));
    await A.page.waitForTimeout(700);
    const fill = await A.page.evaluate(() => window.__vk.layerFill('sk-plain', 'body'));
    const st = await A.page.evaluate(() => window.__vk.layerStroke('sk-plain', 'line'));
    check('defaults: a live burst is painted --pink #c93b82', near(parseRgb(fill), hexRgb(KNOLL.skPrimary), 1), fill + ' (want ' + KNOLL.skPrimary + ')');
    check('defaults: its outline is the sheet\'s 3 units in --ink',
      !!st && st.width === '3px' && near(parseRgb(st.stroke), hexRgb(KNOLL.skInk), 1), JSON.stringify(st));
    await A.page.screenshot({ path: path.join(OUT, '1-knoll.png') });
    const bad = A.consoleLines.filter(l => l.type === 'error' && !/\/_lab2\//.test(l.url));
    check('defaults: no console error and no page error', bad.length === 0 && A.pageErrors.length === 0,
      (bad.map(l => l.text).join(' | ') + ' ' + A.pageErrors.join(' | ')).trim() || 'none');
    summary.defaults = { palette: pal.resolved, parts: pal.parts, fill, stroke: st };
    await A.ctx.close();
  }

  /* ══ 2 · THE PAGE SPEAKS: --sk-* on :root, live AND sprite ════════════ */
  const B = await visit(browser, { tokens: true });
  {
    const pal = await B.page.evaluate(() => Kits.sheets.stickers.palette);
    const ok = pal.skPrimary === SKIN.primary && pal.skSecondary === SKIN.secondary && pal.skInk === SKIN.ink
            && pal.skPaper === SKIN.paper && pal.skHighlight === SKIN.highlight && pal.skShadow === SKIN.shadow
            && pal.skStroke === SKIN.stroke && pal.skRadius === SKIN.radius;
    check('tokens: every --sk-* role reached the palette, the two numbers as numbers',
      ok && typeof pal.skStroke === 'number' && typeof pal.skRadius === 'number', JSON.stringify(pal));

    await B.page.evaluate(() => window.__vk.look('sk-plain', 2));
    await B.page.waitForTimeout(700);
    const fill = await B.page.evaluate(() => window.__vk.layerFill('sk-plain', 'body'));
    const st = await B.page.evaluate(() => window.__vk.layerStroke('sk-plain', 'line'));
    check('tokens · LIVE: the burst body is painted the injected --sk-primary', near(parseRgb(fill), hexRgb(SKIN.primary), 1), fill + ' (want ' + SKIN.primary + ')');
    check('tokens · LIVE: the outline is the injected --sk-ink at --sk-stroke 5',
      !!st && st.width === '5px' && near(parseRgb(st.stroke), hexRgb(SKIN.ink), 1), JSON.stringify(st));
    await B.page.screenshot({ path: path.join(OUT, '2-live-tokens.png') });

    await B.page.evaluate(() => window.__vk.look('sk-plain', 0.5));
    await B.page.waitForTimeout(1400);
    const sp = await B.page.evaluate(() => ({ px: window.__vk.centreTile('sk-plain'), live: window.__vk.live('sk-plain'), stats: Kits.stats() }));
    check('tokens · SPRITE: at 50 % the burst is a sprite, not live svg',
      !sp.live.svg && !sp.live.canvas && sp.stats.tiles > 0, 'svg=' + sp.live.svg + ' canvas=' + sp.live.canvas + ' tiles=' + sp.stats.tiles);
    check('tokens · SPRITE: the tile pixel at its centre is the injected --sk-primary',
      near(sp.px, hexRgb(SKIN.primary), 6), JSON.stringify(sp.px) + ' (want ' + JSON.stringify(hexRgb(SKIN.primary)) + ')');
    await B.page.screenshot({ path: path.join(OUT, '3-sprite-tokens.png') });
    summary.tokens = { palette: pal, live: { fill, stroke: st }, sprite: sp.px };
  }

  /* ══ 3 · THE VARIANTS: one section's own colours, its neighbour's not ══ */
  {
    await B.page.evaluate(() => window.__vk.look('sk-var', 2));
    await B.page.waitForTimeout(700);
    const a = await B.page.evaluate(() => window.__vk.layerFill('sk-var', 'body'));
    await B.page.evaluate(() => window.__vk.look('sk-plain', 2));
    await B.page.waitForTimeout(700);
    const b = await B.page.evaluate(() => window.__vk.layerFill('sk-plain', 'body'));
    check('variant · LIVE: the data-palette section is painted its own primary', near(parseRgb(a), hexRgb(VAR_PRIMARY), 1), a + ' (want ' + VAR_PRIMARY + ')');
    check('variant · LIVE: its neighbour, the same part, keeps the page\'s', near(parseRgb(b), hexRgb(SKIN.primary), 1), b + ' (want ' + SKIN.primary + ')');

    await B.page.evaluate(() => window.__vk.look('sk-var', 0.5));
    await B.page.waitForTimeout(1400);
    const two = await B.page.evaluate(() => ({
      v: window.__vk.centreTile('sk-var'), v2: window.__vk.centreTile('sk-var2'), p: window.__vk.centreTile('sk-plain'),
      keys: Object.keys(Kits.sheets.stickers.variants), distinct: window.__vk.distinctSkins(), stats: Kits.stats()
    }));
    /* THE BUG THIS IS FOR: with a sprite key that did not carry the variant,
       the two bursts would come back the SAME colour — whichever was
       rasterised first. */
    check('variant · SPRITE: the two bursts are two different bitmaps, each its own colour',
      near(two.v, hexRgb(VAR_PRIMARY), 6) && near(two.p, hexRgb(SKIN.primary), 6),
      'variant=' + JSON.stringify(two.v) + ' page=' + JSON.stringify(two.p));
    check('variant · SPRITE: a second section with the SAME data-palette is the same colour',
      near(two.v2, hexRgb(VAR_PRIMARY), 6), JSON.stringify(two.v2));
    check('variant: one extraction per DISTINCT skin, not per section',
      two.keys.length === two.distinct && two.distinct >= 3,
      two.keys.length + ' variants for ' + two.distinct + ' distinct skins over ' + two.stats.parts + ' sections: ' + two.keys.join(' | '));
    await B.page.screenshot({ path: path.join(OUT, '4-variants.png') });
    summary.variants = { live: { variant: a, neighbour: b }, sprite: two };
  }

  /* ══ 4 · data-text: the word is in the slot ═══════════════════════════ */
  {
    await B.page.evaluate(() => window.__vk.look('sk-text', 2));
    await B.page.waitForTimeout(700);
    const t = await B.page.evaluate(() => window.__vk.live('sk-text'));
    const plain = await B.page.evaluate(() => Kits.sheets.stickers.parts.banner.still);
    check('text: the data-text section shows its word', t.words.indexOf(WORD) >= 0, JSON.stringify(t.words));
    check('text: nothing shows the literal {{ skText }} (the conv() trap)',
      !/\{\{/.test(plain) && t.words.every(w => !/\{\{/.test(w)), JSON.stringify(t.words));
    check('text: a text part is live even where every other part is a sprite', t.svg === true, JSON.stringify(t));
    summary.text = { words: t.words };
  }

  /* ══ 5 · data-rot: live, ctrl and sprite ══════════════════════════════ */
  {
    await B.page.evaluate(() => window.__vk.look('sk-rot', 2));
    await B.page.waitForTimeout(700);
    const L = await B.page.evaluate(() => window.__vk.live('sk-rot'));
    const T = await B.page.evaluate(() => window.__vk.live('sk-norot'));
    check('rot · LIVE: the turned section\'s svg carries the rotation, its twin does not',
      /40deg/.test(L.rotate) && !T.rotate, 'rot=' + JSON.stringify(L.rotate) + ' norot=' + JSON.stringify(T.rotate));

    /* CTRL. The mask is the UNROTATED drawing, so a turned sticker is only
       answered correctly if inkAt turns the pointer back first. Both boxes
       are sampled on the same 21 × 21 grid; the two answers must DIFFER (a
       turn that changed nothing would prove nothing) and the turned one must
       agree with the twin sampled at the back-rotated point. */
    const grids = await B.page.evaluate(deg => {
      const N = 21, rot = window.__vk.inkGrid('sk-rot', N), flat = window.__vk.inkGrid('sk-norot', N);
      const el = document.querySelector('[data-gizmo="sk-norot"]'), r = el.getBoundingClientRect();
      const a = -deg * Math.PI / 180, ca = Math.cos(a), sa = Math.sin(a);
      let agree = 0, tested = 0;
      for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
        const u = (i + 0.5) / N - 0.5, v = (j + 0.5) / N - 0.5;      // −0.5…0.5 of the box
        const x = u * ca - v * sa, y = u * sa + v * ca;              // the same point, un-turned
        if (Math.abs(x) > 0.48 || Math.abs(y) > 0.48) continue;      // fell outside the twin's box
        const want = Kits.inkAt(el, r.left + r.width * (x + 0.5), r.top + r.height * (y + 0.5));
        tested++; if ((want ? 1 : 0) === rot[j * N + i]) agree++;
      }
      const differ = rot.reduce((s, v, i) => s + (v !== flat[i] ? 1 : 0), 0);
      return { rotInk: rot.reduce((s, v) => s + v, 0), flatInk: flat.reduce((s, v) => s + v, 0), differ, agree, tested, n: N * N };
    }, ROT);
    check('rot · CTRL: the turned box answers ink where its twin answers paper',
      grids.differ >= 20, grids.differ + ' of ' + grids.n + ' grid points differ (turned ink ' + grids.rotInk + ', flat ink ' + grids.flatInk + ')');
    /* The bar is 92 % and not 100 % because of the boundary: inkAt reads a
       3 × 3 neighbourhood of the mask, and a point a fraction of a unit
       inside an edge here can be a fraction outside it there. The separation
       is not close — an inkAt that did NOT turn the pointer back would
       answer the flat grid, which agrees with only about 78 % of the turned
       one (the two grids differ at 97 of 441 points, reported above). */
    check('rot · CTRL: Kits.inkAt maps the pointer back through the rotation (≥ 92 % agreement with the twin)',
      grids.tested > 100 && grids.agree / grids.tested >= 0.92,
      grids.agree + '/' + grids.tested + ' = ' + (100 * grids.agree / grids.tested).toFixed(1) + ' %');

    /* THE SPRITE. Walk the tile alpha of both boxes for a point painted on
       the turned one and bare on the twin. There is no such point unless the
       tile draw turns the bitmap. */
    await B.page.evaluate(() => window.__vk.look('sk-rot', 0.5));
    await B.page.waitForTimeout(1400);
    const sp = await B.page.evaluate(() => {
      const bR = window.__vk.box('sk-rot'), bN = window.__vk.box('sk-norot');
      const N = 41; let best = null, tested = 0;
      for (let j = 0; j < N && !best; j++) for (let i = 0; i < N; i++) {
        const u = (i + 0.5) / N, v = (j + 0.5) / N;
        const A = window.__vk.tile(bR.x + bR.w * u, bR.y + bR.h * v);
        const C = window.__vk.tile(bN.x + bN.w * u, bN.y + bN.h * v);
        if (!A || !C) continue;
        tested++;
        if (A[3] > 200 && C[3] === 0) { best = { u, v, turned: A, flat: C }; break; }
      }
      return { best, tested, live: window.__vk.live('sk-rot'), tiles: Kits.stats().tiles };
    });
    check('rot · SPRITE: the tile is painted with the sticker turned',
      !!sp.best && !sp.live.svg, sp.best
        ? 'at ' + (100 * sp.best.u).toFixed(0) + '%,' + (100 * sp.best.v).toFixed(0) + '% of the box the turned tile is opaque ('
          + sp.best.turned[3] + ') and the twin\'s is bare (' + sp.best.flat[3] + '); ' + sp.tested + ' points walked'
        : 'no such point in ' + sp.tested + ' — the sprite is not rotated');
    await B.page.screenshot({ path: path.join(OUT, '5-rot.png') });
    summary.rot = { live: L, twin: T, ctrl: grids, sprite: sp };
  }

  /* ══ 6 · THE GRADES: a filtered part is never 'full' ══════════════════ */
  {
    const at = async preset => {
      await B.page.evaluate(p => Kits.setStyle(Style.forPreset(p, { pixel: 0, saturation: 0.3 })), preset);
      await B.page.evaluate(() => window.__vk.look('sk-big1', 1));
      await B.page.waitForTimeout(1000);
      return B.page.evaluate(() => Kits.stats());
    };
    const cel = await at('cel');
    const ink = await at('ink-sketch');
    check('grades: an UNfiltered preset (cel) puts a big part at the full grade',
      cel.full > 0, 'full=' + cel.full + ' sway=' + cel.sway + ' live=' + cel.live);
    check('grades: a FILTERED preset (ink-sketch, wobble 0.6) never does — it sways instead',
      ink.full === 0 && ink.sway > 0, 'full=' + ink.full + ' sway=' + ink.sway + ' live=' + ink.live);

    /* THE ROTATION COMPOSES WITH THE SWAY. This is the whole reason the turn
       is the CSS `rotate` property and not a transform: at a moving grade the
       sheet's own animation owns `transform`, and a rotation written there
       would be overwritten forty times a second. */
    await B.page.evaluate(() => Kits.setStyle(Style.forPreset('cel', { pixel: 0, saturation: 0.3 })));
    await B.page.evaluate(() => window.__vk.look('sk-rotbig', 1));
    await B.page.waitForTimeout(1000);
    const swung = await B.page.evaluate(() => {
      const el = document.querySelector('[data-gizmo="sk-rotbig"]'), svg = el && el.querySelector('.gz-art > svg');
      if (!svg) return { live: false };
      const cs = getComputedStyle(svg);
      const rec = [...Kits.recs.values()].find(r => r.id === 'sk-rotbig');
      return { live: true, grade: rec && rec.grade, rotate: cs.rotate, animation: cs.animationName,
               transform: cs.transform, delay: svg.style.animationDelay };
    });
    check('rot + sway: a turned part at a moving grade keeps its turn AND runs the sheet\'s sway',
      swung.live && /sway|bob/.test(String(swung.animation)) && swung.grade !== 'still'
      && /-25|335/.test(String(swung.rotate)) && swung.transform !== 'none',
      JSON.stringify(swung));
    check('the jiggle pivot: kits.js wrote SHEETS.stickers.jiggle into #kit-css',
      await B.page.evaluate(() => {
        const s = document.getElementById('kit-css');
        return !!s && s.textContent.indexOf('data-kit="stickers"') >= 0 && s.textContent.indexOf('50% 50%') >= 0;
      }), await B.page.evaluate(() => (document.getElementById('kit-css') || {}).textContent || '(no #kit-css)'));
    summary.grades = { cel, inkSketch: ink, rotSway: swung };
  }

  /* ══ 7 · EVERY PRESET APPLIES, AND CHANGES SOMETHING ══════════════════ */
  {
    const before = B.consoleLines.length;
    const presets = await B.page.evaluate(() => Object.keys(Style.PRESETS));
    const fingers = {};
    for (const p of presets) {
      // pixel 0 for the sweep: Style.forPreset takes `pixel` from the MEASURED
      // vector, not from the preset, so a non-zero one would put every preset
      // on a grid and there would be nothing to tell them apart by
      await B.page.evaluate(x => Kits.setStyle(Style.forPreset(x, { pixel: 0, saturation: 0.3 })), p);
      await B.page.waitForTimeout(300);
      fingers[p] = await B.page.evaluate(() => ({ burst: window.__vk.finger('burst'), badge: window.__vk.finger('badge-round'), stats: Kits.stats() }));
    }
    check('presets: press/style.js has the ten of Appendix C', presets.length === 10, presets.join(','));
    const errs = B.consoleLines.slice(before).filter(l => l.type === 'error' && !/\/_lab2\//.test(l.url));
    check('presets: all ten applied with no console error', errs.length === 0, errs.map(l => l.text).join(' | ') || 'none');
    const seen = new Map();
    let dup = '';
    for (const p of presets) {
      const f = fingers[p].burst;
      const sig = JSON.stringify([f.line, f.line2, f.detail, f.shadow, f.strokeWidth, f.join, f.lineFilter, f.shadowFilter,
                                  f.shadowFill, f.texture, f.textureFill, f.haloShown, f.rootStyle]);
      if (seen.has(sig)) dup = p + ' renders the burst exactly as ' + seen.get(sig);
      seen.set(sig, p);
    }
    check('presets: no two presets render the burst the same way', !dup, dup || (seen.size + ' distinct renderings of ' + presets.length + ' presets'));

    // the rows of the plan's §4.4 table, each asked of a preset that uses it
    const f = id => fingers[id].burst, bg = id => fingers[id].badge;
    check('§4.4 lineShow:false — flat has no line layer', f('flat').line === false, 'line=' + f('flat').line);
    check('§4.4 lineWeight — outline-cartoon 0.7 → stroke 0.5 + 5.5 × 0.7 = 4.35, cel 0.4 → 2.7',
      f('outline-cartoon').strokeWidth === '4.35' && f('cel').strokeWidth === '2.7',
      'cartoon=' + f('outline-cartoon').strokeWidth + ' cel=' + f('cel').strokeWidth);
    check('§4.4 corners — cozy-soft 0.9 → rx 16.2 and a round join; grunge 0.1 → rx 1.8 and mitre',
      bg('cozy-soft').radius === '16.2' && f('cozy-soft').join === 'round' && bg('grunge').radius === '1.8' && f('grunge').join === 'miter',
      'cozy rx=' + bg('cozy-soft').radius + '/' + f('cozy-soft').join + ' grunge rx=' + bg('grunge').radius + '/' + f('grunge').join);
    check('§4.4 detail — dropped where lineWeight < 0.35 (flat 0, painterly 0.1, cozy-soft 0.35 keeps it), kept at grunge 0.8',
      f('flat').detail === false && f('painterly').detail === false && f('grunge').detail === true && f('cozy-soft').detail === true,
      'flat=' + f('flat').detail + ' painterly=' + f('painterly').detail + ' cozy=' + f('cozy-soft').detail + ' grunge=' + f('grunge').detail);
    check('§4.4 shading flat — the shadow layer is gone, the root drop-shadow stays',
      f('flat').shadow === false && /drop-shadow/.test(f('flat').rootStyle), 'shadow=' + f('flat').shadow + ' root=' + f('flat').rootStyle.slice(0, 40));
    check('§4.4 shading cel — the shadow layer is as drawn: opaque, unfiltered',
      f('cel').shadow === true && !f('cel').shadowFilter && /^#/.test(String(f('cel').shadowFill)),
      JSON.stringify({ fill: f('cel').shadowFill, filter: f('cel').shadowFilter }));
    check('§4.4 shading soft — neon\'s shadow wears url(#sk-soft…)', /url\(#sk-soft/.test(String(f('neon').shadowFilter)), String(f('neon').shadowFilter));
    check('§4.4 shading hatch / halftone / dither — the shadow fill becomes the pattern',
      /url\(#sk-hatch/.test(String(f('ink-sketch').shadowFill)) && /url\(#sk-dots/.test(String(f('retro-print').shadowFill)) && /url\(#sk-dither/.test(String(f('pixel').shadowFill)),
      'ink-sketch=' + f('ink-sketch').shadowFill + ' retro=' + f('retro-print').shadowFill + ' pixel=' + f('pixel').shadowFill);
    check('§4.4 lineWobble — the line wears url(#sk-wobble…) at scale wobble × 4 (ink-sketch 0.6 → 2.4)',
      /url\(#sk-wobble/.test(String(f('ink-sketch').lineFilter)) && f('ink-sketch').wobbleScale === '2.4' && !f('cel').lineFilter,
      'ink-sketch filter=' + f('ink-sketch').lineFilter + ' scale=' + f('ink-sketch').wobbleScale + ' cel=' + f('cel').lineFilter);
    check('§4.4 linePasses > 1 — ink-sketch draws the line twice, the second through #sk-wobble-2',
      f('ink-sketch').line2 === true && f('cel').line2 === false, 'ink-sketch=' + f('ink-sketch').line2 + ' cel=' + f('cel').line2);
    check('§4.4 texture — paper for ink-sketch/retro-print/cozy-soft, scanlines for neon, grunge for grunge, canvas→paper for painterly; none for flat and cel; clipped to the body',
      /sk-paper/.test(String(f('ink-sketch').textureFill)) && /sk-scanlines/.test(String(f('neon').textureFill))
      && /sk-grunge/.test(String(f('grunge').textureFill)) && /sk-paper/.test(String(f('painterly').textureFill))
      && /sk-body-burst/.test(String(f('ink-sketch').textureClip))
      && f('flat').texture === false && f('cel').texture === false,
      'ink=' + f('ink-sketch').textureFill + ' neon=' + f('neon').textureFill + ' grunge=' + f('grunge').textureFill
      + ' painterly=' + f('painterly').textureFill + ' clip=' + f('ink-sketch').textureClip);
    check('§4.4 finish glow — neon\'s root filter is a bloom in the primary and the line is struck in the highlight',
      /drop-shadow\(0px 0px 6px/.test(f('neon').rootStyle) && f('neon').rootStyle.toLowerCase().indexOf(SKIN.primary) >= 0
      && String(f('neon').strokeColour).toLowerCase() === SKIN.highlight,
      'root=' + f('neon').rootStyle.slice(0, 70) + ' stroke=' + f('neon').strokeColour);
    check('§4.4 finish diecut — outline-cartoon and cozy-soft show the halo; the others do not',
      f('outline-cartoon').haloShown && f('cozy-soft').haloShown && !f('cel').haloShown && !f('ink-sketch').haloShown,
      'cartoon=' + f('outline-cartoon').haloShown + ' cozy=' + f('cozy-soft').haloShown + ' cel=' + f('cel').haloShown + ' ink=' + f('ink-sketch').haloShown);
    check('§4.4 finish none — ink-sketch, retro-print and pixel carry no root filter at all',
      !/filter/.test(f('ink-sketch').rootStyle) && !/filter/.test(f('retro-print').rootStyle) && !/filter/.test(f('pixel').rootStyle)
      && /drop-shadow/.test(f('cel').rootStyle),
      'ink=' + JSON.stringify(f('ink-sketch').rootStyle) + ' cel=' + JSON.stringify(f('cel').rootStyle.slice(0, 40)));
    check('§4.4 defs — only what the style reaches for is copied into a part, each id suffixed per style',
      f('cel').defs.length === 0 && f('ink-sketch').defs.length >= 4 && f('ink-sketch').defs.every(id => /^sk-[\w-]+-[0-9a-z]+$/.test(id)),
      'cel=[' + f('cel').defs.join(',') + '] ink-sketch=[' + f('ink-sketch').defs.join(',') + ']');
    /* §4.5's rule read back off the presets themselves rather than from a
       hand-written list: a part is filtered when the pass gave it an SVG
       filter or a bloom — a wobbled line (and only when there IS a line),
       a soft or painterly shade, or the glow finish. Six of the ten qualify;
       flat, cel, pixel and (because its line is off) nothing else. */
    const wantFiltered = await B.page.evaluate(() => {
      const o = {};
      Object.keys(Style.PRESETS).forEach(k => {
        const p = Style.PRESETS[k];
        o[k] = !!((p.lineWobble > 0 && p.lineShow !== false) || p.shading === 'soft' || p.shading === 'painterly' || p.finish === 'glow');
      });
      return o;
    });
    const wrong = presets.filter(k => f(k).filtered !== wantFiltered[k]);
    check('§4.5 filtered — every preset whose pass adds a filter or a bloom is marked filtered, and no other',
      wrong.length === 0 && !f('flat').filtered && !f('cel').filtered && !f('pixel').filtered,
      presets.map(k => k + '=' + (f(k).filtered ? 1 : 0)).join(' ') + (wrong.length ? ' · wrong: ' + wrong.join(',') : ''));

    /* the pixel preset, both paths — with a measured grid of 4 this time */
    await B.page.evaluate(() => Kits.setStyle(Style.forPreset('pixel', { pixel: 4, saturation: 0.3 })));
    await B.page.evaluate(() => window.__vk.look('sk-plain', 2));
    await B.page.waitForTimeout(1100);
    const p4 = await B.page.evaluate(() => window.__vk.finger('burst'));
    const px = await B.page.evaluate(() => ({ plain: window.__vk.live('sk-plain'), text: window.__vk.live('sk-text'), stats: Kits.stats() }));
    check('§4.4 pixel — the part is marked pixel 4 and its detail layer is dropped', p4.pixel === 4 && p4.detail === false, 'pixel=' + p4.pixel + ' detail=' + p4.detail);
    check('§4.4 pixel — a live pixel sticker is a <canvas> and not inline svg', px.plain.canvas === true && px.plain.svg === false, JSON.stringify(px.plain));
    check('§4.4 pixel — a TEXT part cannot be a canvas and keeps live svg (the plan\'s fallback)',
      px.text.svg === true && px.text.canvas === false, JSON.stringify(px.text));
    /* ctrl over a pixel part: there is no svg in the art to clone the rim
       from, so kits.js cuts it out of the part's still string instead */
    const rim = await B.page.evaluate(() => {
      const el = document.querySelector('[data-gizmo="sk-plain"]');
      const on = Kits.outline(el);
      const n = el.querySelector('.gz-art > [data-lab-ink]');
      const order = n && n.nextElementSibling ? n.nextElementSibling.localName : '';
      const inkMid = Kits.inkAt(el, el.getBoundingClientRect().left + el.getBoundingClientRect().width / 2,
                                el.getBoundingClientRect().top + el.getBoundingClientRect().height / 2);
      Kits.outline(null);
      return { on, rim: !!n, order, inkMid, gone: !document.querySelector('[data-lab-ink]') };
    });
    check('§4.4 pixel — ctrl still outlines a canvas part and Kits.inkAt still answers',
      rim.on && rim.rim && rim.order === 'canvas' && rim.inkMid === true && rim.gone, JSON.stringify(rim));
    await B.page.screenshot({ path: path.join(OUT, '6-pixel.png') });
    await B.page.evaluate(() => window.__vk.look('sk-plain', 0.5));
    await B.page.waitForTimeout(1400);
    const pxs = await B.page.evaluate(() => ({ px: window.__vk.centreTile('sk-plain'), stats: Kits.stats() }));
    check('§4.4 pixel — the SPRITE is the same bitmap: the tile still reads the page primary',
      near(pxs.px, hexRgb(SKIN.primary), 10), JSON.stringify(pxs.px));
    check('§4.5 pixel parts never sway and are never full', pxs.stats.sway === 0 && pxs.stats.full === 0, 'sway=' + pxs.stats.sway + ' full=' + pxs.stats.full);
    await B.page.screenshot({ path: path.join(OUT, '7-pixel-sprite.png') });

    summary.presets = {};
    for (const p of presets) summary.presets[p] = { burst: fingers[p].burst, badgeRadius: fingers[p].badge.radius };
    summary.pixel = { finger: p4, live: px, sprite: pxs.px, stats: pxs.stats };
  }

  /* ══ 8 · A PAGE WITH NO BENCH ═════════════════════════════════════════ */
  {
    const ctx = await browser.newContext({ viewport: { width: 900, height: 700 }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    const lines = [], errs = [];
    page.on('console', m => lines.push({ type: m.type(), text: m.text() }));
    page.on('pageerror', e => errs.push(String(e)));
    await page.route('**/_lab2/**', r => r.fulfill({ status: 404, body: 'no' }));
    await page.route(NOBENCH, r => r.fulfill({ status: 200, body: NOBENCH_HTML, headers: { 'content-type': 'text/html; charset=utf-8' } }));
    await page.goto(NOBENCH, { waitUntil: 'load' });
    await page.waitForFunction(() => window.Kits && window.Style, null, { timeout: 15000 });
    const shape = await page.evaluate(() => ({
      world: !!document.getElementById('bench-world'), keys: Object.keys(window.Kits).sort(),
      layer: !!document.getElementById('kit-layer'), lab: !!window.Lab
    }));
    check('no bench: window.Kits exists on a page with no #bench-world', !shape.world && shape.keys.length > 0, JSON.stringify(shape.keys));
    check('no bench: it is exactly { extractOnly, kindOf, isKitSrc, SHEETS, setStyle }',
      shape.keys.join(',') === 'SHEETS,extractOnly,isKitSrc,kindOf,setStyle', shape.keys.join(','));
    check('no bench: no #kit-layer was made', shape.layer === false, 'layer=' + shape.layer);
    const ex = await page.evaluate(() => Kits.extractOnly('features/stickers-core.dc.html',
      { skPrimary: '#123456' }, Style.forPreset('outline-cartoon', { pixel: 0, saturation: 0.2 }))
      .then(o => ({ n: Object.keys(o).length, burst: o.burst, banner: o.banner })));
    check('no bench: Kits.extractOnly returned all forty parts with still/w/h/tags/text',
      ex.n === 40 && !!ex.burst && ex.burst.w === 128 && ex.burst.h === 128 && Array.isArray(ex.burst.tags)
      && ex.burst.tags.length === 3 && ex.burst.text === false && ex.banner.text === true,
      'n=' + ex.n + ' burst ' + ex.burst.w + '×' + ex.burst.h + ' tags=[' + ex.burst.tags + '] text=' + ex.burst.text + ' banner.text=' + ex.banner.text);
    check('no bench: the palette it was handed is what the drawing is painted in',
      ex.burst.still.indexOf('#123456') >= 0 && ex.burst.still.indexOf(KNOLL.skPrimary) < 0,
      'has #123456=' + (ex.burst.still.indexOf('#123456') >= 0) + ' · has the Knoll pink=' + (ex.burst.still.indexOf(KNOLL.skPrimary) >= 0));
    check('no bench: the roles it was NOT handed came off the page\'s own --sk-* tokens',
      ex.burst.still.indexOf(SKIN.ink) >= 0, 'has ' + SKIN.ink + '=' + (ex.burst.still.indexOf(SKIN.ink) >= 0));
    check('no bench: the style it was handed was applied (outline-cartoon shows the halo, stroke 4.35)',
      ex.burst.still.indexOf('stroke-width="4.35"') >= 0 && !/data-layer="halo"[^>]*display:none/.test(ex.burst.still),
      'stroke 4.35=' + (ex.burst.still.indexOf('stroke-width="4.35"') >= 0));
    const bad = lines.filter(l => l.type === 'error');
    check('no bench: no console error, no page error', bad.length === 0 && errs.length === 0,
      (bad.map(l => l.text).join(' | ') + ' ' + errs.join(' | ')).trim() || 'none');
    await page.screenshot({ path: path.join(OUT, '8-no-bench.png') });
    summary.noBench = { shape, parts: ex.n, tags: ex.burst.tags };
    await ctx.close();
  }

  const late = B.consoleLines.filter(l => l.type === 'error' && !/\/_lab2\//.test(l.url));
  check('the whole run: no console error on the bench page (the blocked door aside), no page error',
    late.length === 0 && B.pageErrors.length === 0, (late.map(l => l.text).join(' | ') + ' ' + B.pageErrors.join(' | ')).trim() || 'none');
  const kitLines = B.consoleLines.filter(l => /\[kits\]/.test(l.text));
  check('the whole run: kits.js never warned', kitLines.length === 0, kitLines.map(l => l.text).join(' | ') || 'none');

  await B.ctx.close();
  await browser.close();

  const pass = results.filter(r => r.ok).length;
  summary.results = results;
  summary.score = pass + '/' + results.length;
  fs.writeFileSync(path.join(OUT, 'summary.json'), JSON.stringify(summary, null, 2));
  console.log('\n' + pass + '/' + results.length + ' PASS → ' + path.join(OUT, 'summary.json'));
  process.exit(pass === results.length ? 0 : 1);
})().catch(e => { console.error(e); process.exit(2); });
