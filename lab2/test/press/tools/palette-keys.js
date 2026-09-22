#!/usr/bin/env node
/* ─── PALETTE-KEYS ────────────────────────────────────────────────────────
   The sticker kit's linter, and the one tool that lets a part be DRAWN in
   colours and SHIPPED in roles. PRESS-TABLE-PLAN.md §3.6 says a sticker part
   holds no literal colour at all — every fill and stroke is {{ skPrimary }},
   {{ skInk }} and the rest, so that kits.js can fill a game page's palette
   into it once per page and the same drawing is a Knoll sticker on the bench
   and a neon one on a dark game page — and Appendix D says the contract is
   "enforced by the tool rather than by care". This is the tool.

   USAGE (from site/):

       node lab2/test/press/tools/palette-keys.js <part|all> [--fix]

   It reads press/tools/parts/<part>.html — one file per part, one <sc-if>
   wrapping one <svg> (CONTRACTS.md §8). With --fix it first rewrites the six
   placeholder literals Appendix D names — magenta #ff00ff → skPrimary, cyan
   #00ffff → skSecondary, #000000 → skInk, #ffffff → skPaper, #ffff00 →
   skHighlight, navy #000080 → skShadow, upper or lower case, the 3-digit
   forms too — wherever they sit in a fill/stroke/stop-color/flood-color
   attribute or a style string, writes the file back, and lints the result.
   Then it LINTS, and a fault is one line, `<file>:<line>: <what>`, and exit
   1; a clean part prints `OK <part>` and exits 0. Warnings are printed with
   the word `warning:` and do not fail the run — they are the things a
   drawing agent should look at, not things a build must refuse.

   WHAT IS A FAULT — the contract in §3.6 and CONTRACTS.md §8, item by item:
     · a literal colour anywhere in the block: hex of 3/4/6/8 digits (an id
       after `url(#` is not a colour), rgb()/rgba()/hsl()/hsla(), a CSS named
       colour or `transparent` in a colour attribute or a style declaration,
       currentColor. The ONE exception is the root svg's own
       `drop-shadow(6px 7px 0 rgba(0,0,0,.3))`, which the contract mandates
       verbatim (ADDING.md §1.4 — kits.js bakes it into the sprite) and
       which is blanked out before the scan;
     · a fill or stroke that is not one of the six roles or `none` — so a
       `url(#sk-hatch)` written by hand is a fault too: the style pass adds
       those (plan §8 4.4), a part never does;
     · an interpolation name that is not one of the nine the sheet fills
       (six roles, skStroke, skRadius, skText) or the part's own is-flag;
       skStroke anywhere but a stroke-width, skRadius anywhere but a
       sc-camel-rx/sc-camel-ry, skText anywhere but the content of a <text>;
     · more or fewer than one <sc-if>, more or fewer than one <svg>, or the
       svg not the sole child of the sc-if;
     · a wrong box: width/height not 128, sc-camel-view-box not
       `0 0 128 128`, xmlns missing, or `viewBox` spelled out — an HTML parser
       lower-cases it to `viewbox`, which is why every sheet writes
       sc-camel-view-box (support.js turns the prefix back into camel case,
       and so does kits.js's decodeAttrs);
     · an element that is not path circle rect ellipse line g text (plus the
       sc-if and svg wrappers) — image, foreignObject, script, animate*,
       set, use, style and filter get their own message, because those are
       the ones somebody will reach for;
     · a filter attribute or a `filter:` style on anything but the root; an
       `href`/`xlink:href`; an on* handler;
     · a root style without the drop-shadow, or without an animation, or
       with an animation not named sk-sway or sk-bob;
     · a direct child of the svg that is not a <g data-layer="…">, a layer
       name that is not one of the eight, a layer twice, or layers out of
       the order halo shadow body line highlight detail [image-slot] [text];
     · a missing halo, body or line layer (shadow, highlight and detail may
       be absent — a warning says so);
     · a halo that is not display:none (the style pass turns it on);
     · a <text> outside the text layer, or in a part not on Appendix D's
       text list — the words of a NEW or WISHLIST tag are paths, because a
       <text> part is always live and can never be a sprite (ADDING.md
       §1.2); a text part without a text layer, or with no {{ skText }};
     · a stroke-width in the line layer that is not {{ skStroke }} — the
       line layer is the one the style pass re-weights, and a literal there
       would not follow;
     · a corner radius written as a plain rx/ry on a rect. A radius is
       written sc-camel-rx="{{ skRadius }}" — the same encoding viewBox
       takes, and for the same kind of reason: the sheet's markup is parsed
       by the BROWSER before support.js fills a single interpolation, and
       rx is a length, so Chrome answers a raw one with
       `<rect> attribute rx: Expected length, "{{ skRadius }}"` in the
       console. Twenty rects carried a radius and the sheet opened with
       twenty of those errors (measured 2026-09-07, Phase 4a); written
       sc-camel-rx the parser never looks at it, and support.js, kits.js's
       decodeAttrs and render-part.js all turn the prefix back into `rx`
       before anything draws. A sc-camel-rx/ry that is not {{ skRadius }}
       is a fault too (absent is fine: a square-cornered rect stays square
       in every style);
     · an is-flag that does not match the file name (burst-round →
       isBurstRound).
   And WHAT IS A WARNING: a path with more than 60 commands (MAX_CMDS — a
   sticker is simple, and a part that is a traced photograph will not read
   at 40 px whatever the style pass does to it); a halo painted in anything
   but a {{ skPaper }} stroke; a line-layer shape that fills, or strokes in
   something other than {{ skInk }}; a detail stroke-width outside 1–1.5
   when it is a literal; a <text> without text-anchor middle or the house
   font; an image-slot without its {{ skPaper }} rect; a root attribute the
   contract does not name; CRLF line endings (new files are LF).

   HOW IT READS THE FILE. A tag scanner of its own — no dependency, the
   rules of §0.3 — that walks `<tag attr="…">`, `</tag>`, `<… />` and
   comments and keeps the line of every element and attribute, which is all
   a fragment this regular needs; the HTML parser in a browser would
   lower-case the attributes it is here to check the spelling of. Comments
   are blanked to spaces of the same length before the colour scan, so a
   comment may say "#ff00ff" and line numbers still hold.

   AS A MODULE: render-part.js and build-sheet.js require() this file for
   the parser, the colour scan and the constants below, so the contract is
   written down once. Nothing runs at require time.
   ───────────────────────────────────────────────────────────────────────── */
'use strict';
const fs = require('fs'), path = require('path');

const PARTS_DIR = path.join(__dirname, 'parts');

/* The six roles a part may paint with, and the three other values the sheet
   fills (CONTRACTS.md §6). */
const ROLES = ['skPrimary', 'skSecondary', 'skInk', 'skPaper', 'skHighlight', 'skShadow'];
const VALUES = ['skStroke', 'skRadius', 'skText'];

/* Appendix D's authoring shortcut: the six literals a part may be drawn in,
   and the role each one becomes. #000080 has no 3-digit form (0,0,8 would be
   #000088), so it has one spelling. */
const PLACEHOLDERS = {
  '#ff00ff': 'skPrimary', '#00ffff': 'skSecondary', '#000000': 'skInk',
  '#ffffff': 'skPaper', '#ffff00': 'skHighlight', '#000080': 'skShadow',
};

/* The eight parts Appendix D marks with a text slot — the only ones that may
   carry a <text>. */
const TEXT_PARTS = ['banner', 'ribbon-corner', 'badge-round', 'badge-shield', 'bubble-speech', 'bubble-thought', 'bubble-shout', 'tag-price'];

/* The layer order (CONTRACTS.md §8), and the three every part must have. */
const LAYERS = ['halo', 'shadow', 'body', 'line', 'highlight', 'detail', 'image-slot', 'text'];
const REQUIRED = ['halo', 'body', 'line'];
const OPTIONAL = ['shadow', 'highlight', 'detail'];

const ELEMENTS = new Set(['path', 'circle', 'rect', 'ellipse', 'line', 'g', 'text', 'sc-if', 'svg']);
const NAMED_BAD = {
  image: 'no <image> — a picture goes in the image-slot rect, filled by the page',
  foreignobject: 'no <foreignObject>',
  script: 'no <script>',
  animate: 'no SMIL — animate the root with sk-sway/sk-bob',
  animatetransform: 'no SMIL',
  animatemotion: 'no SMIL',
  set: 'no SMIL <set>',
  use: 'no <use> — the sheet defs are filters and patterns, not shapes',
  style: 'no <style> — the keyframes live in the sheet helmet',
  filter: 'no <filter> in a part — the style pass adds filters from the sheet data-defs',
  tspan: 'no <tspan> — one <text> holding {{ skText }}',
};
const COLOUR_ATTRS = new Set(['fill', 'stroke', 'stop-color', 'flood-color', 'color', 'lighting-color']);
const ANIMS = ['sk-sway', 'sk-bob'];
const MAX_CMDS = 60;
const DROP_RE = /drop-shadow\(\s*6px\s+7px\s+0(?:px)?\s+rgba\(\s*0\s*,\s*0\s*,\s*0\s*,\s*0?\.3\s*\)\s*\)/g;
const ROLE_RE = /^\{\{\s*(skPrimary|skSecondary|skInk|skPaper|skHighlight|skShadow)\s*\}\}$/;
const INTERP_RE = /\{\{\s*([\w.]+)\s*\}\}/g;

/* The 148 CSS named colours (plus transparent), lower case. */
const NAMED = new Set(('aliceblue antiquewhite aqua aquamarine azure beige bisque black blanchedalmond blue blueviolet brown burlywood cadetblue chartreuse chocolate coral cornflowerblue cornsilk crimson cyan darkblue darkcyan darkgoldenrod darkgray darkgreen darkgrey darkkhaki darkmagenta darkolivegreen darkorange darkorchid darkred darksalmon darkseagreen darkslateblue darkslategray darkslategrey darkturquoise darkviolet deeppink deepskyblue dimgray dimgrey dodgerblue firebrick floralwhite forestgreen fuchsia gainsboro ghostwhite gold goldenrod gray green greenyellow grey honeydew hotpink indianred indigo ivory khaki lavender lavenderblush lawngreen lemonchiffon lightblue lightcoral lightcyan lightgoldenrodyellow lightgray lightgreen lightgrey lightpink lightsalmon lightseagreen lightskyblue lightslategray lightslategrey lightsteelblue lightyellow lime limegreen linen magenta maroon mediumaquamarine mediumblue mediumorchid mediumpurple mediumseagreen mediumslateblue mediumspringgreen mediumturquoise mediumvioletred midnightblue mintcream mistyrose moccasin navajowhite navy oldlace olive olivedrab orange orangered orchid palegoldenrod palegreen paleturquoise palevioletred papayawhip peachpuff peru pink plum powderblue purple rebeccapurple red rosybrown royalblue saddlebrown salmon sandybrown seagreen seashell sienna silver skyblue slateblue slategray slategrey snow springgreen steelblue tan teal thistle tomato turquoise violet wheat white whitesmoke yellow yellowgreen transparent').split(' '));

/* ── the scanner ─────────────────────────────────────────────────────────── */

function lineStarts(src) {
  const st = [0];
  for (let i = 0; i < src.length; i++) if (src.charCodeAt(i) === 10) st.push(i + 1);
  return st;
}
function lineAt(starts, idx) {           // 1-based
  let lo = 0, hi = starts.length - 1;
  while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (starts[mid] <= idx) lo = mid; else hi = mid - 1; }
  return lo + 1;
}
/* Comments become spaces of the same length: the offsets and lines of
   everything after them stay put, and the colour scan cannot see them. */
function blankComments(src) {
  return src.replace(/<!--[\s\S]*?-->/g, m => m.replace(/[^\n]/g, ' '));
}

const TOKEN_RE = /<!--[\s\S]*?-->|<\/([A-Za-z][\w:-]*)\s*>|<([A-Za-z][\w:-]*)((?:\s+[^\s=>\/]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+))?)*)\s*(\/?)>/g;
const ATTR_RE = /([^\s=\/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;

/* parse(src) → { children: [node], errors: [{line, msg}] }
   node = { type:'el', tag, tagRaw, attrs:[{name, value, line}], children, parent, line, start, end }
        | { type:'text', text, line, parent }
   start/end are offsets into src — the whole element, open tag to close —
   so a caller can lift the svg's own text out of the file verbatim. */
function parse(src) {
  const starts = lineStarts(src), errors = [];
  const root = { type: 'root', tag: '', children: [], parent: null };
  const stack = [root];
  let last = 0, m;
  TOKEN_RE.lastIndex = 0;
  const text = (from, to) => {
    const t = src.slice(from, to);
    if (t.trim()) stack[stack.length - 1].children.push({ type: 'text', text: t, line: lineAt(starts, from + (t.length - t.trimStart().length)), parent: stack[stack.length - 1] });
  };
  while ((m = TOKEN_RE.exec(src))) {
    text(last, m.index); last = TOKEN_RE.lastIndex;
    if (m[0].startsWith('<!--')) continue;
    if (m[1]) {                                  // closing tag
      const open = stack[stack.length - 1];
      if (open === root || open.tagRaw.toLowerCase() !== m[1].toLowerCase()) errors.push({ line: lineAt(starts, m.index), msg: `</${m[1]}> closes nothing that is open` });
      else { open.end = last; stack.pop(); }
      continue;
    }
    const el = { type: 'el', tag: m[2].toLowerCase(), tagRaw: m[2], attrs: [], children: [], parent: stack[stack.length - 1], line: lineAt(starts, m.index), start: m.index, end: last };
    ATTR_RE.lastIndex = 0; let a;
    const attrsOff = m.index + m[0].indexOf(m[3]);
    while ((a = ATTR_RE.exec(m[3]))) el.attrs.push({ name: a[1], value: a[2] !== undefined ? a[2] : a[3] !== undefined ? a[3] : a[4] !== undefined ? a[4] : '', line: lineAt(starts, attrsOff + a.index) });
    el.parent.children.push(el);
    if (!m[4]) stack.push(el);
  }
  text(last, src.length);
  while (stack.length > 1) { const open = stack.pop(); errors.push({ line: open.line, msg: `<${open.tagRaw}> is never closed` }); open.end = src.length; }
  return { children: root.children, errors };
}
const attr = (el, name) => { const a = el.attrs.find(x => x.name.toLowerCase() === name); return a ? a.value : undefined; };
function walk(node, fn) { for (const c of node.children || []) { if (c.type === 'el') { fn(c); walk(c, fn); } } }
function els(node) { const out = []; walk(node, e => out.push(e)); return out; }
function layerOf(el) { for (let p = el.parent; p; p = p.parent) { if (p.type === 'el' && p.tag === 'g' && p.parent && p.parent.tag === 'svg') return attr(p, 'data-layer') || ''; } return ''; }
const flagOf = part => 'is' + part.replace(/(^|-)(\w)/g, (m, s, c) => c.toUpperCase());

/* ── the colour scan ─────────────────────────────────────────────────────── */

/* scanColours(src, {allowDrop}) → [{line, msg}] — every literal colour in
   the text, comments blanked, the root drop-shadow blanked when allowed. Used
   on parts here and on sk-defs.html by build-sheet.js. */
function scanColours(src, opts = {}) {
  const out = [];
  let s = blankComments(src);
  if (opts.allowDrop) s = s.replace(DROP_RE, mm => ' '.repeat(mm.length));
  const lines = s.split('\n');
  lines.forEach((ln, i) => {
    const L = i + 1, hit = msg => out.push({ line: L, msg });
    let m;
    const hex = /(url\(\s*)?#([0-9a-fA-F]{3,8})\b/g;
    while ((m = hex.exec(ln))) { if (m[1]) continue; hit(`literal colour #${m[2]} — use a role ({{ skPrimary }} …)`); }
    const fn = /\b(rgba?|hsla?)\s*\(/g;
    while ((m = fn.exec(ln))) hit(`literal colour ${m[1]}(…) — use a role`);
    if (/currentcolor/i.test(ln)) hit('currentColor — use a role');
    // named colours, only where a colour is expected
    const attrs = /\b(fill|stroke|stop-color|flood-color|color|lighting-color)\s*=\s*["']([^"']*)["']/g;
    while ((m = attrs.exec(ln))) { const v = m[2].trim().toLowerCase(); if (NAMED.has(v)) hit(`named colour ${m[2]} in ${m[1]} — use a role`); }
    const style = /style\s*=\s*["']([^"']*)["']/g;
    while ((m = style.exec(ln))) {
      const decl = /(?:^|;)\s*(fill|stroke|stop-color|flood-color|color|lighting-color)\s*:\s*([^;]+)/g; let d;
      while ((d = decl.exec(m[1]))) { const v = d[2].trim().toLowerCase(); if (NAMED.has(v)) hit(`named colour ${d[2].trim()} in style ${d[1]} — use a role`); }
    }
  });
  return out;
}

/* ── --fix ───────────────────────────────────────────────────────────────── */

function expandHex(h) { const x = h.slice(1); return x.length === 3 ? '#' + x[0] + x[0] + x[1] + x[1] + x[2] + x[2] : h; }
/* fix(src) → { src, count }: the six placeholders → roles, in colour
   attributes and style strings only (a `#000000` in a comment is left to say
   what it says). */
function fix(src) {
  let count = 0;
  const rep = v => v.replace(/#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})\b/g, m => {
    const role = PLACEHOLDERS[expandHex(m).toLowerCase()];
    if (!role) return m;
    count++; return '{{ ' + role + ' }}';
  });
  const out = src.replace(/\b(fill|stroke|stop-color|flood-color|color|lighting-color|style)(\s*=\s*)("[^"]*"|'[^']*')/g,
    (m, name, eq, q) => name + eq + q[0] + rep(q.slice(1, -1)) + q[q.length - 1]);
  return { src: out, count };
}

/* ── the lint ────────────────────────────────────────────────────────────── */

/* lint(part, src) → { faults: [{line,msg}], warnings: [{line,msg}], layers, svg } */
function lint(part, src) {
  const faults = [], warnings = [];
  const fault = (line, msg) => faults.push({ line, msg }), warn = (line, msg) => warnings.push({ line, msg });
  const doc = parse(src);
  doc.errors.forEach(e => fault(e.line, e.msg));
  const all = els(doc);
  const scifs = all.filter(e => e.tag === 'sc-if'), svgs = all.filter(e => e.tag === 'svg');
  doc.children.filter(n => n.type === 'text').forEach(n => fault(n.line, 'text outside the <sc-if> block'));
  if (scifs.length !== 1) fault(scifs[1] ? scifs[1].line : 1, `${scifs.length} <sc-if> blocks — a part is exactly one`);
  if (svgs.length !== 1) fault(svgs[1] ? svgs[1].line : 1, `${svgs.length} <svg> elements — a part is exactly one`);
  const scif = scifs[0], svg = svgs[0];
  const isText = TEXT_PARTS.includes(part), flag = flagOf(part);

  if (scif) {
    if (scif.parent.type !== 'root') fault(scif.line, 'the <sc-if> is nested inside something');
    const v = attr(scif, 'value') || '', m = /^\{\{\s*(is\w+)\s*\}\}$/.exec(v);
    if (!m) fault(scif.line, `sc-if value="${v}" is not one {{ isFlag }}`);
    else if (m[1] !== flag) fault(scif.line, `is-flag ${m[1]} does not match the file name — ${part} → ${flag}`);
    scif.attrs.filter(a => !['value', 'hint-placeholder-val'].includes(a.name)).forEach(a => warn(a.line, `attribute ${a.name} on the <sc-if> — only value (and hint-placeholder-val) belong there`));
    const kids = scif.children.filter(n => n.type === 'el' || n.text.trim());
    if (kids.length !== 1 || kids[0] !== svg) fault(scif.line, 'the <sc-if> must hold the one <svg> and nothing else');
  }
  if (!svg) return { faults, warnings, layers: [] };
  if (svg.parent !== scif) fault(svg.line, 'the <svg> is not the child of the <sc-if>');

  // the box
  if (attr(svg, 'width') !== '128' || attr(svg, 'height') !== '128') fault(svg.line, `box is ${attr(svg, 'width')}×${attr(svg, 'height')} — a sticker is width="128" height="128"`);
  if (attr(svg, 'viewbox') !== undefined) fault(svg.line, 'viewBox spelled out — write sc-camel-view-box="0 0 128 128" (an HTML parser lower-cases viewBox)');
  else if (attr(svg, 'sc-camel-view-box') !== '0 0 128 128') fault(svg.line, `sc-camel-view-box="${attr(svg, 'sc-camel-view-box')}" — must be "0 0 128 128"`);
  if (attr(svg, 'xmlns') !== 'http://www.w3.org/2000/svg') fault(svg.line, 'missing xmlns="http://www.w3.org/2000/svg"');
  const rootStyle = attr(svg, 'style') || '';
  if (!new RegExp(DROP_RE.source).test(rootStyle)) fault(svg.line, 'root style lacks filter: drop-shadow(6px 7px 0 rgba(0,0,0,.3))');
  const an = /animation\s*:\s*([\w-]+)/.exec(rootStyle);
  if (!an) fault(svg.line, 'root style has no animation — sk-sway (or sk-bob, with a reason in the leading comment)');
  else if (!ANIMS.includes(an[1])) fault(svg.line, `root animation "${an[1]}" — must be sk-sway or sk-bob`);
  svg.attrs.filter(a => !['width', 'height', 'sc-camel-view-box', 'xmlns', 'style'].includes(a.name)).forEach(a => warn(a.line, `root attribute ${a.name} — the contract names width, height, sc-camel-view-box, xmlns and style only`));

  // direct children: layers, in order
  const layers = [], layerEls = {};
  svg.children.forEach(c => {
    if (c.type === 'text') { fault(c.line, 'text directly inside the <svg>'); return; }
    const L = attr(c, 'data-layer');
    if (c.tag !== 'g' || !L) { fault(c.line, `direct child <${c.tagRaw}> of the svg is not a <g data-layer="…">`); return; }
    if (!LAYERS.includes(L)) { fault(c.line, `unknown layer "${L}" — one of ${LAYERS.join(' ')}`); return; }
    if (layers.includes(L)) { fault(c.line, `layer "${L}" appears twice`); return; }
    layers.push(L); layerEls[L] = c;
  });
  let idx = -1, ordered = true;
  layers.forEach(L => { const i = LAYERS.indexOf(L); if (i <= idx) ordered = false; idx = i; });
  if (!ordered) fault(svg.line, `layers out of order (${layers.join(' ')}) — halo shadow body line highlight detail [image-slot] [text]`);
  REQUIRED.forEach(L => { if (!layers.includes(L)) fault(svg.line, `no <g data-layer="${L}">`); });
  OPTIONAL.forEach(L => { if (!layers.includes(L)) warn(svg.line, `no ${L} layer — fine if the part has none, but say so in its leading comment`); });

  // halo
  const halo = layerEls.halo;
  if (halo) {
    if (!/display\s*:\s*none/.test(attr(halo, 'style') || '')) fault(halo.line, 'halo is not style="display:none" — the style pass turns it on');
    els(halo).forEach(e => {
      const st = attr(e, 'stroke'), fl = attr(e, 'fill');
      if (e.tag === 'g') return;
      if (st !== '{{ skPaper }}') warn(e.line, `halo <${e.tag}> strokes "${st}" — the die-cut edge is a {{ skPaper }} stroke`);
      if (fl && fl !== 'none' && fl !== '{{ skPaper }}') warn(e.line, `halo <${e.tag}> fills "${fl}" — a halo is a stroke behind the body`);
    });
  }

  // text
  const texts = els(svg).filter(e => e.tag === 'text');
  texts.forEach(t => {
    const L = layerOf(t);
    if (L !== 'text') fault(t.line, `<text> in the ${L || 'no'} layer — words in a drawing are paths; a live <text> goes in <g data-layer="text">`);
    if (!isText) fault(t.line, `<text> in "${part}", which is not on Appendix D's text list (${TEXT_PARTS.join(' ')}) — draw the word as paths`);
    const content = t.children.map(n => n.type === 'text' ? n.text : '').join('');
    if (isText && !/\{\{\s*skText\s*\}\}/.test(content)) fault(t.line, '<text> content is not {{ skText }}');
    if (attr(t, 'text-anchor') !== 'middle') warn(t.line, '<text> without text-anchor="middle"');
    if (!/font-family\s*:\s*var\(--display\)/.test(attr(t, 'style') || '')) warn(t.line, '<text> style should carry font-family:var(--display),sans-serif;font-weight:700');
    if (attr(t, 'fill') !== '{{ skInk }}') warn(t.line, '<text> fill is not {{ skInk }}');
  });
  if (isText) {
    if (!layers.includes('text')) fault(svg.line, `"${part}" is a text part — it needs <g data-layer="text"><text>{{ skText }}</text></g>`);
    else if (!texts.length) fault(layerEls.text.line, 'text layer holds no <text>');
  } else if (layers.includes('text')) fault(layerEls.text.line, `a text layer on "${part}", which is not a text part`);
  if (layerEls['image-slot']) {
    const rects = els(layerEls['image-slot']).filter(e => e.tag === 'rect');
    if (!rects.length || !rects.some(r => attr(r, 'fill') === '{{ skPaper }}')) warn(layerEls['image-slot'].line, 'image-slot without a <rect fill="{{ skPaper }}"> placeholder');
  }

  // every element
  els(svg).forEach(e => {
    const L = layerOf(e);
    if (!ELEMENTS.has(e.tag)) fault(e.line, NAMED_BAD[e.tag] ? NAMED_BAD[e.tag] + ` (<${e.tagRaw}>)` : `<${e.tagRaw}> is not one of path circle rect ellipse line g text`);
    e.attrs.forEach(a => {
      const n = a.name.toLowerCase(), v = a.value;
      if (n === 'filter') fault(a.line, 'filter attribute in a part — the style pass adds filters');
      if (n === 'style' && /(?:^|;)\s*filter\s*:/.test(v)) fault(a.line, 'filter: in a style — the style pass adds filters');
      if (n === 'href' || n === 'xlink:href') fault(a.line, `${a.name} — a part references nothing outside itself`);
      if (/^on\w+/.test(n)) fault(a.line, `${a.name} — no script in a part`);
      if (n === 'fill' || n === 'stroke') {
        if (v !== 'none' && !ROLE_RE.test(v)) fault(a.line, `${n}="${v}" — a fill or stroke is one of the six roles or none`);
      }
      if (n === 'stroke-width') {
        const lit = parseFloat(v), isRole = /^\{\{\s*skStroke\s*\}\}$/.test(v);
        if (L === 'line' && !isRole) fault(a.line, `stroke-width="${v}" in the line layer — must be {{ skStroke }}`);
        else if (L === 'detail' && !isRole && !(lit >= 1 && lit <= 1.5)) warn(a.line, `detail stroke-width ${v} — a detail stroke is {{ skStroke }} scaled by a transform or a literal 1–1.5`);
        else if (!isRole && isNaN(lit)) fault(a.line, `stroke-width="${v}" is neither a number nor {{ skStroke }}`);
      }
      /* A rect's corner radius: sc-camel-rx="{{ skRadius }}", never a raw
         rx. The browser parses the sheet's markup before renderVals fills
         anything, and a raw rx is "Expected length" in the console — twenty
         of them, one per radius on the sheet (Phase 4a). */
      if (e.tag === 'rect' && (n === 'rx' || n === 'ry')) fault(a.line, `${n}="${v}" on a rect — write sc-camel-${n}="{{ skRadius }}": the browser parses the sheet before support.js fills it, and a raw rx is an "Expected length" console error`);
      if (e.tag === 'rect' && (n === 'sc-camel-rx' || n === 'sc-camel-ry') && !/^\{\{\s*skRadius\s*\}\}$/.test(v)) fault(a.line, `${n}="${v}" on a rect — corner radii are {{ skRadius }} or absent`);
      // interpolation names, and where each may sit
      let im; INTERP_RE.lastIndex = 0;
      while ((im = INTERP_RE.exec(v))) {
        const k = im[1];
        if (e.tag === 'sc-if') continue;
        if (ROLES.includes(k)) { if (!(COLOUR_ATTRS.has(n) || n === 'style')) fault(a.line, `{{ ${k} }} in ${a.name} — a role is a colour`); }
        else if (k === 'skStroke') { if (n !== 'stroke-width' && n !== 'transform') fault(a.line, `{{ skStroke }} in ${a.name} — it is a stroke-width`); }
        else if (k === 'skRadius') { if (n !== 'sc-camel-rx' && n !== 'sc-camel-ry') fault(a.line, `{{ skRadius }} in ${a.name} — it is a rect sc-camel-rx/sc-camel-ry`); }
        else fault(a.line, `{{ ${k} }} is not an interpolation the sheet fills (${ROLES.concat(VALUES).join(' ')})`);
      }
    });
    if (L === 'line' && e.tag !== 'g') {
      const fl = attr(e, 'fill'), st = attr(e, 'stroke');
      if (fl && fl !== 'none') warn(e.line, `line-layer <${e.tag}> fills ${fl} — the line layer holds outline strokes (fill="none")`);
      if (st !== '{{ skInk }}') warn(e.line, `line-layer <${e.tag}> strokes "${st}" — outlines are {{ skInk }}`);
    }
    if (e.tag === 'path') {
      const d = attr(e, 'd') || '', cmds = (d.match(/[MLHVCSQTAZ]/gi) || []).length;
      if (cmds > MAX_CMDS) warn(e.line, `path with ${cmds} commands — a sticker is simple (${MAX_CMDS} is the line)`);
    }
    // text content interpolations
    e.children.filter(n => n.type === 'text').forEach(n => {
      let im; INTERP_RE.lastIndex = 0;
      while ((im = INTERP_RE.exec(n.text))) {
        if (im[1] === 'skText') { if (e.tag !== 'text') fault(n.line, '{{ skText }} outside a <text>'); }
        else fault(n.line, `{{ ${im[1]} }} in text content — only {{ skText }} belongs there`);
      }
      if (e.tag !== 'text' && n.text.trim()) fault(n.line, `stray text "${n.text.trim().slice(0, 30)}" inside <${e.tag}>`);
    });
  });

  scanColours(src, { allowDrop: true }).forEach(c => fault(c.line, c.msg));
  faults.sort((a, b) => a.line - b.line); warnings.sort((a, b) => a.line - b.line);
  return { faults, warnings, layers, svg };
}

/* ── the command line ────────────────────────────────────────────────────── */

function listParts() {
  if (!fs.existsSync(PARTS_DIR)) return [];
  return fs.readdirSync(PARTS_DIR).filter(f => /\.html$/.test(f)).map(f => f.slice(0, -5)).sort();
}
function partFile(part) { return path.join(PARTS_DIR, part + '.html'); }

function run(part, doFix) {
  const file = partFile(part), rel = path.relative(process.cwd(), file).replace(/\\/g, '/');
  if (!fs.existsSync(file)) { console.log(`${rel}:0: no such part`); return false; }
  let src = fs.readFileSync(file, 'utf8'), fixed = 0;
  if (doFix) {
    const r = fix(src);
    if (r.count) { src = r.src; fs.writeFileSync(file, src); fixed = r.count; }
  }
  if (/\r\n/.test(src)) console.log(`${rel}:1: warning: CRLF line endings — new files are LF`);
  const res = lint(part, src);
  res.warnings.forEach(w => console.log(`${rel}:${w.line}: warning: ${w.msg}`));
  res.faults.forEach(f => console.log(`${rel}:${f.line}: ${f.msg}`));
  if (!res.faults.length) console.log(`OK ${part}` + (fixed ? ` (fixed ${fixed} placeholder literal${fixed === 1 ? '' : 's'})` : '') + (res.warnings.length ? ` — ${res.warnings.length} warning${res.warnings.length === 1 ? '' : 's'}` : ''));
  return !res.faults.length;
}

if (require.main === module) {
  const args = process.argv.slice(2), doFix = args.includes('--fix'), names = args.filter(a => !a.startsWith('--'));
  if (!names.length) { console.log('usage: node lab2/test/press/tools/palette-keys.js <part|all> [--fix]'); process.exit(2); }
  const list = names[0] === 'all' ? listParts() : names;
  if (!list.length) { console.log('no parts in ' + PARTS_DIR); process.exit(1); }
  let bad = 0;
  list.forEach(p => { if (!run(p, doFix)) bad++; });
  if (list.length > 1) console.log(bad ? `${bad} of ${list.length} parts have faults` : `all ${list.length} parts OK`);
  process.exit(bad ? 1 : 0);
}

module.exports = { lint, fix, parse, els, attr, scanColours, blankComments, listParts, partFile, flagOf, PARTS_DIR, ROLES, VALUES, TEXT_PARTS, LAYERS, REQUIRED, MAX_CMDS };
