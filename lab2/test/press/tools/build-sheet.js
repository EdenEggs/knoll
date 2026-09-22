#!/usr/bin/env node
/* ─── BUILD-SHEET ─────────────────────────────────────────────────────────
   Assembles features/stickers-core.dc.html — the fourth kit sheet, the
   forty stickers of PRESS-TABLE-PLAN.md Appendix D — from one file per part
   in press/tools/parts/<part>.html. The village and the forest were drawn
   as sheets and cut into <sc-if> blocks by hand; the stickers are drawn
   the other way round, one part per file by whichever agent has the pen,
   and this puts them on one sheet so kits.js and Design Canvas see what
   they have always seen: one document, #part= in the URL, renderVals()
   filling a palette, data-props listing every part (plan §8 4.1).

   USAGE (from site/):

       node lab2/test/press/tools/build-sheet.js

   It lints every part first (palette-keys.js — the linter is required
   here, not shelled to) and REFUSES TO BUILD on a fault: the sheet is what
   kits.js rasterises for every bench, and one literal colour in one part
   is a sticker that ignores its page's palette. It runs the same colour
   scan over sk-defs.html. A part in Appendix D with no file yet is a
   warning listing the missing ids, not a fault — the sheet is built with
   what is there, and its header says what is not — so the tooling can be
   proved on one part before the other thirty-nine exist. A file in parts/
   that is NOT in Appendix D is refused: the forty are the contract, and a
   forty-first goes into the plan first.

   WHAT IT WRITES:
     features/stickers-core.dc.html   the sheet, whole — never edit it, edit
                                      the part and rebuild
     press/tools/parts/INDEX.md       id · what · layers · tags, one row a
                                      part, the layers read off the file

   THE ORDER is Appendix D's, which is TAGS below — the one copy of the
   table in code (the plan is prose). The tray ranks by these tags; the
   motif words the vision call matches (MOTIFS) are among them, marked in
   INDEX.md. The eight text-slot parts here must be the eight
   palette-keys.js allows a <text> in, and the build checks that the two
   lists agree before it does anything else.

   THE SHEET'S SHAPE follows village.dc.html line for line where the two
   are the same kind of thing: the same four lines in <head> (prelude.js,
   support.js, bare.css, ../fonts/fonts.css — a text slot's var(--display)
   is Sora, which the sheet must be able to load), a <helmet><style> with
   the sheet's keyframes and lab 2's jiggle, a screen <div> with the shared
   data-defs svg first and every part after it, a data-dc-script whose
   data-props is HTML-escaped the way the village's is (the JSON's quotes
   as &quot;), and a Component whose renderVals() reads #part= and returns
   the palette at its Knoll defaults spread with the forty is-flags.
   ───────────────────────────────────────────────────────────────────────── */
'use strict';
const fs = require('fs'), path = require('path');
const PK = require('./palette-keys.js');

const TEST_DIR = path.resolve(__dirname, '..', '..');
const SHEET = path.join(TEST_DIR, 'features', 'stickers-core.dc.html');
const INDEX = path.join(PK.PARTS_DIR, 'INDEX.md');
const DEFS = path.join(__dirname, 'sk-defs.html');

/* Appendix D, verbatim: id, what, tags, extra layers (the text slot and the
   image slot beyond the six every part has). */
const TAGS = [
  ['burst',          '12-point starburst',          ['hype', 'sale', 'retro']],
  ['burst-round',    'soft 8-lobe burst',           ['hype', 'cozy']],
  ['banner',         'ribbon banner, text slot',    ['title', 'hype'],            ['text']],
  ['ribbon-corner',  'diagonal corner ribbon',      ['sale', 'new'],              ['text']],
  ['badge-round',    'circular badge',              ['award', 'seal'],            ['text', 'image-slot']],
  ['badge-shield',   'shield badge',                ['award', 'fantasy'],         ['text']],
  ['tape-strip',     'washi tape strip',            ['scrapbook', 'cozy']],
  ['tape-x',         'two crossed tape pieces',     ['scrapbook']],
  ['frame-polaroid', 'polaroid frame',              ['scrapbook', 'screenshot'],  ['image-slot']],
  ['frame-ornate',   'ornate gold frame',           ['fantasy', 'award'],         ['image-slot']],
  ['frame-pixel',    'chunky bevel frame',          ['retro', 'pixel'],           ['image-slot']],
  ['frame-film',     'film strip cell',             ['cinema', 'screenshot'],     ['image-slot']],
  ['arrow',          'bendy arrow',                 ['pointer']],
  ['arrow-double',   'two-headed arrow',            ['pointer']],
  ['pointer-hand',   'pointing hand',               ['pointer', 'retro']],
  ['circle-mark',    'hand-drawn circle',           ['pointer', 'sketch']],
  ['underline',      'squiggly underline',          ['pointer', 'sketch']],
  ['bubble-speech',  'speech bubble',               ['comic'],                    ['text']],
  ['bubble-thought', 'thought bubble',              ['comic'],                    ['text']],
  ['bubble-shout',   'jagged shout bubble',         ['comic', 'hype'],            ['text']],
  ['tag-new',        '"NEW" tag',                   ['new', 'sale']],
  ['tag-soon',       '"COMING SOON" tag',           ['new']],
  ['tag-wishlist',   '"WISHLIST" tag',              ['store']],
  ['tag-price',      'price tag',                   ['store'],                    ['text']],
  ['pin',            'pushpin',                     ['scrapbook']],
  ['clip',           'paperclip',                   ['scrapbook']],
  ['star',           'five-point star',             ['vote', 'award']],
  ['stars-3',        'three scattered stars',       ['sparkle']],
  ['sparkle',        'four-point sparkle cluster',  ['sparkle', 'magic']],
  ['heart',          'heart',                       ['vote', 'cozy']],
  ['fire',           'flame',                       ['hype', 'fire']],
  ['bolt',           'lightning bolt',              ['hype', 'storm', 'energy']],
  ['skull',          'small skull',                 ['skull', 'horror', 'grunge']],
  ['sword',          'crossed swords',              ['sword', 'fantasy']],
  ['gear',           'gear',                        ['gear', 'scifi', 'machine']],
  ['hex-grid',       'hex cluster',                 ['scifi', 'tech']],
  ['leaf-sprig',     'leafy sprig',                 ['leaf', 'cozy', 'nature']],
  ['mushroom',       'toadstool',                   ['mushroom', 'cozy', 'fantasy']],
  ['cloud',          'puffy cloud',                 ['cloud', 'cozy']],
  ['crescent',       'crescent moon',               ['moon', 'night', 'fantasy']],
];
/* The tags Appendix D sets in italics — what the vision call's `motifs`
   match against. */
const MOTIFS = new Set(['magic', 'fire', 'storm', 'skull', 'sword', 'gear', 'leaf', 'mushroom', 'cloud', 'moon']);

/* CONTRACTS.md §7's defaults — the bench's own tokens from lab.css :root
   (--pink, --blue, --ink, --pink-2) so the sheet opened on its own looks
   like Knoll. skShadow is the pink darkened, not a token the bench has. */
const DEFAULTS = { skPrimary: '#c93b82', skSecondary: '#5871f5', skInk: '#26212a', skPaper: '#ffffff', skHighlight: '#ef4d98', skShadow: '#8a2558', skStroke: 3, skRadius: 6, skText: '' };

const escAttr = s => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
const upper = s => s.toUpperCase().replace(/-/g, ' ');
const rel = f => path.relative(process.cwd(), f).replace(/\\/g, '/');

/* ── THE IMAGE SLOTS, READ OFF THE DRAWING ────────────────────────────────
   plan §3.6: `image-slot` holds "a <rect> placeholder that the page may
   replace with a clipped picture". A kit part may hold NO <image>
   (ADDING.md §1.2), so the picture cannot go inside the sticker — the PAGE
   composes it, a frame section and a gz-pic prop side by side, and the
   generator needs to know WHERE in the 128-unit box that rect is before it
   can put a picture there.

   THAT NUMBER IS RECORDED HERE, beside `tags` in the sheet's data-props, and
   not read out of parts/*.html by build-game.js. Three reasons, in order:
   this file is already the one parser of a part file, so the rect cannot
   drift from the drawing it came from; data-props is where the tray already
   reads a part's metadata (plan §3.6's own third bullet), so a reader of the
   sheet needs no second file; and the sheet is what kits.js actually
   rasterises, so what the generator measures and what the browser draws come
   out of the same artifact. A part re-drawn without a rebuild cannot leave a
   stale rect behind in a tool, because the tool has none.

   THE SHAPE is {x, y, w, h, rot}: the UNROTATED rect's top-left and size in
   the part's own 128 units, and the angle it is turned by about ITS OWN
   CENTRE. frame-polaroid is why the angle is there — its slot is a rect
   inside <g transform="translate(64 64) rotate(-5)">, the tilt of the card —
   and (64, 64) is also the point kits.js turns a whole sticker about when a
   section carries data-rot (kits.js placeLive, transform-origin P.w/2 P.h/2),
   so the two rotations compose about one centre and the generator can add
   them. Only translate() and rotate() are understood, which is every
   transform the five image-slot parts use; anything else is a fault, because
   a rect this cannot read is a picture that would land in the wrong place. */
const RAD = Math.PI / 180;
const r2 = v => Math.round(v * 100) / 100 + 0;

function slotRect(id, src) {
  const g = /<g\s+data-layer="image-slot"\s*>([\s\S]*?)<\/g>\s*(?:<g|<\/svg>)/.exec(src)
    || /<g\s+data-layer="image-slot"\s*>([\s\S]*)<\/svg>/.exec(src);
  if (!g) return null;
  const inner = g[1];
  const rm = /<rect\b([^>]*)>/.exec(inner);
  if (!rm) return { error: 'image-slot holds no <rect>' };
  const num = n => { const m = new RegExp('\\s' + n + '="(-?[\\d.]+)"').exec(rm[1]); return m ? +m[1] : NaN; };
  const x = num('x'), y = num('y'), w = num('width'), h = num('height');
  if (![x, y, w, h].every(Number.isFinite) || !(w > 0) || !(h > 0)) return { error: 'the image-slot rect has no x/y/width/height' };

  // every transform between the layer and the rect, outermost first
  let cx = x + w / 2, cy = y + h / 2, rot = 0;
  const chain = [];
  const tre = /<g\b[^>]*\stransform="([^"]*)"[^>]*>/g;
  let t;
  while ((t = tre.exec(inner)) && tre.lastIndex <= rm.index) chain.push(t[1]);
  for (let i = chain.length - 1; i >= 0; i--) {
    const ops = chain[i].match(/[a-z]+\s*\([^)]*\)/gi) || [];
    for (let j = ops.length - 1; j >= 0; j--) {
      const op = /^([a-z]+)\s*\(([^)]*)\)$/i.exec(ops[j]);
      const a = op[2].trim().split(/[\s,]+/).map(Number);
      if (op[1] === 'translate') { cx += a[0] || 0; cy += (a.length > 1 ? a[1] : 0) || 0; }
      else if (op[1] === 'rotate') {
        const ang = a[0] || 0, px = a.length > 2 ? a[1] : 0, py = a.length > 2 ? a[2] : 0;
        const c = Math.cos(ang * RAD), s = Math.sin(ang * RAD), dx = cx - px, dy = cy - py;
        cx = px + dx * c - dy * s; cy = py + dx * s + dy * c; rot += ang;
      } else return { error: 'the image-slot uses transform ' + op[1] + '(), which only translate() and rotate() are read here' };
    }
  }
  return { x: r2(cx - w / 2), y: r2(cy - h / 2), w: r2(w), h: r2(h), rot: r2(rot) };
}

function main() {
  // the two lists of text parts agree
  const textHere = TAGS.filter(t => (t[3] || []).includes('text')).map(t => t[0]);
  if (textHere.join(',') !== PK.TEXT_PARTS.join(',')) { console.log('build-sheet TAGS and palette-keys TEXT_PARTS disagree on the text parts:\n  ' + textHere.join(' ') + '\n  ' + PK.TEXT_PARTS.join(' ')); process.exit(1); }

  const ids = TAGS.map(t => t[0]);
  const present = PK.listParts();
  const stray = present.filter(p => !ids.includes(p));
  if (stray.length) { console.log('parts/ holds files that are not in Appendix D: ' + stray.join(' ') + ' — the forty are the contract'); process.exit(1); }
  const missing = ids.filter(id => !present.includes(id));

  // lint everything first
  let faults = 0;
  const parts = {};
  for (const id of ids) {
    if (!present.includes(id)) continue;
    const src = fs.readFileSync(PK.partFile(id), 'utf8');
    const res = PK.lint(id, src);
    res.faults.forEach(f => { console.log(`${rel(PK.partFile(id))}:${f.line}: ${f.msg}`); faults++; });
    res.warnings.forEach(w => console.log(`${rel(PK.partFile(id))}:${w.line}: warning: ${w.msg}`));
    parts[id] = { src: src.replace(/\r\n/g, '\n').trim(), layers: res.layers };
    /* the image slot, if the part has one. A part Appendix D gives an
       image-slot to and whose rect this cannot read is a FAULT and not a
       warning: the generator would draw the frame and put the picture
       somewhere else on the paper, which is worse than the empty frame it
       replaced. */
    const wantsSlot = (TAGS.find(t => t[0] === id)[3] || []).includes('image-slot');
    const rect = res.layers.includes('image-slot') ? slotRect(id, parts[id].src) : null;
    if (wantsSlot && (!rect || rect.error)) {
      console.log(`${rel(PK.partFile(id))}: ${rect ? rect.error : 'Appendix D gives it an image-slot and the part has no image-slot layer'}`); faults++;
    } else if (rect && !rect.error) parts[id].slot = rect;
  }
  if (!fs.existsSync(DEFS)) { console.log('no ' + rel(DEFS)); process.exit(1); }
  const defs = fs.readFileSync(DEFS, 'utf8').replace(/\r\n/g, '\n').trim();
  PK.scanColours(defs).forEach(c => { console.log(`${rel(DEFS)}:${c.line}: ${c.msg}`); faults++; });
  if (!/<svg[^>]*\sdata-defs\b/.test(defs)) { console.log(rel(DEFS) + ': no <svg data-defs>'); faults++; }
  if (faults) { console.log(`${faults} fault${faults === 1 ? '' : 's'} — not building`); process.exit(1); }
  if (missing.length) console.log(`warning: ${missing.length} of ${ids.length} parts not drawn yet — ${missing.join(' ')}`);

  // data-props, escaped like the village's
  /* `slots` beside `tags`: only the parts that have an image-slot are in it,
     so a reader can ask `slots[part]` and get undefined for the other
     thirty-five (THE IMAGE SLOTS, above). */
  const slots = {};
  for (const id of ids) if (parts[id] && parts[id].slot) slots[id] = parts[id].slot;
  const props = { part: { editor: 'select', default: 'burst', options: ids, tsType: 'string', section: 'Stickers', tags: Object.fromEntries(TAGS.map(t => [t[0], t[2]])), slots: slots } };
  const dataProps = escAttr(JSON.stringify(props));

  const drawn = ids.filter(id => parts[id]);
  const header = `<!-- ONE FILE, FORTY PARTS, FORTY FEATURES — AND IT IS BUILT, NOT DRAWN HERE.
     press/tools/build-sheet.js writes this file from press/tools/parts/<part>.html,
     one part per file, in the order Appendix D of PRESS-TABLE-PLAN.md lists
     them. Edit a part there and rebuild; the next build overwrites this file
     whole and an edit made here is lost. ${drawn.length === ids.length ? 'All forty are drawn.' : `${drawn.length} of the forty ${drawn.length === 1 ? 'is' : 'are'} drawn so far; NOT YET DRAWN: ${missing.join(', ')} — a section asking for one of those finds no block and draws nothing.`}

     WHY ONE FILE: the same reason village.dc.html gives at length — a kit
     part is picked up, put down and re-cut on its own, so each is its own
     .gz, and forty near-identical documents would be forty copies of the
     same helmet and the same keyframes. So there is ONE document and the
     section says which part it wants in its data-src —
     features/stickers-core.dc.html#part=burst — a hash and not a query, for
     the reason gnome.dc.html writes out (a static host's clean-URL 301
     drops the query string; a fragment never reaches the server).

     WHY THE COLOURS ARE ROLES AND NOT LITERALS, which is the one way this
     sheet is unlike the other three: a village house is red because the
     village is; a sticker is whatever colour the page it stands on is. So
     no part holds a colour — every fill and stroke is {{ skPrimary }},
     {{ skSecondary }}, {{ skInk }}, {{ skPaper }}, {{ skHighlight }} or
     {{ skShadow }}, every outline width is {{ skStroke }}, every corner
     {{ skRadius }}, every word {{ skText }} — and kits.js fills them ONCE
     per page load from the page's --sk-* tokens (CONTRACTS.md §6, plan
     §8 4.2): the main bench has no such tokens and gets the defaults below,
     which is the Knoll look; a game page's baked :root supplies its own,
     and the same forty drawings are that game's stickers. palette-keys.js
     refuses a part with a literal in it, so this is enforced by the tool
     and not by care.

     WHERE THE DEFAULTS COME FROM: renderVals() below returns the bench's
     own tokens from lab.css :root — --pink #c93b82 as skPrimary, --blue
     #5871f5 as skSecondary, --ink #26212a as skInk, white paper, --pink-2
     #ef4d98 as the highlight, the pink darkened to #8a2558 for the shadow,
     a 3-unit stroke, 6-unit corners and no text — the same nine values
     kits.js keeps in SHEETS.stickers.palette (CONTRACTS.md §7), so the
     sheet opened on its own in Design Canvas is a Knoll sticker.

     WHAT A PART IS (plan §3.6, CONTRACTS.md §8): one <sc-if> holding one
     128 × 128 <svg> whose direct children are <g data-layer="…"> in the
     order halo (hidden — the die-cut edge the style pass turns on), shadow
     (the offset silhouette, the cel shade), body, line (every outline —
     the layer the style pass re-weights, wobbles or removes), highlight
     (the one glint), detail (fine strokes a simple style drops), and for
     some parts image-slot (a paper rect the page may replace with a
     clipped picture) and text (a <text> holding {{ skText }} — a part with
     a <text> is always live, ADDING.md §1.2, which is why NEW and WISHLIST
     are paths). EVERY IMAGE-SLOT RECT IS IN THE data-props BELOW, under
     \`slots\`, beside \`tags\`: {x, y, w, h, rot} in the part's own 128 units,
     the rect unrotated and the angle it is turned by about its own centre.
     A part may hold no <image> (ADDING.md §1.2), so a picture in a slot is
     the PAGE's job — press/tools/build-game.js writes the frame section and
     a gz-pic prop clipped to that rect, and this is where it reads the
     rect. Change the drawing and rebuild and the number follows it.
     The sway and the drop-shadow ride on the root svg, the
     compositor's and free (kits.js's header). The shared data-defs svg
     first inside the screen holds the filters and patterns the style pass
     names (#sk-soft, #sk-wobble, #sk-hatch …; press/tools/sk-defs.html
     says what each number is); kits.js copies it into every part.

     THE PROBE NUMBERS (plan §8 4.6, perf/probe-stickers.js — 60 sticker
     sections at each preset, cameras at 20/35/50/100/166/400 %). Measured
     2026-09-07, headed system Chrome 152 on the sandbox server, viewport
     1600 × 1000 at DPR 1, all ten presets ACCEPTED; the floor is the same
     page with nothing at all on the paper, measured in the same run, so
     these are this machine on this day and not a number off a wall.
       idle median per preset — 6.1 ms at every camera, all ten presets,
         which is the empty page's own 6.1 ms at every camera. Sixty
         stickers cost a bench that is standing still NOTHING.
       worst frame per preset — 6.3 to 12.3 ms IN THAT RUN, taken over both
         the idle second and the four-second pan at every camera. ZERO
         frames over 34 ms anywhere in the sixty measurements, which is the
         clause that decides; the three worst of that run (12.1 pixel at
         166 %, 12.2 cel at 20 %, 12.3 ink-sketch at 166 %) are one dropped
         frame in a pan on a 165 Hz screen, not a second slot of work.
         READ THE RANGE AS ONE RUN'S TAIL AND THE 34 ms AS THE LINE. Three
         of the ten — pixel, flat, ink-sketch — were measured again TWICE on
         the same machine on 2026-09-07, each time against a floor measured
         again in the same run, and each time with another verifier's Chrome
         at work on the same machine. Everything the acceptance rests on
         came back to the digit all three times: idle median 6.1 at all six
         cameras, 50 of the sixty live at 166 %, ink-sketch's fifty of fifty
         filtered and twenty swaying, pixel's nought swaying, no documents
         at any camera. The tail wandered and nothing else did — flat's
         worst frame 6.6 → 30.5 → 6.6 ms, pixel's 12.1 → 12.2 → 18.3,
         ink-sketch's 12.3 → 12.3 → 18.3, every one of them a single frame
         in a pan and every one under 34. The idle second is the number to
         keep; a pan's maximum is the machine's mood that minute.
       live count at 166 % per preset — 50 of the sixty are live (over
         125 % kits.js keeps no tiles), 20 of them sway and none is full.
         For the seven presets whose vector reaches an SVG filter
         (outline-cartoon, painterly, ink-sketch, neon, retro-print,
         grunge, cozy-soft) ALL FIFTY are filtered — two and a half times
         the twenty the plan asks the 34 ms rule to be met with, and the
         part records and a walk of the live DOM agree on the count.
         flat, cel and pixel reach no filter at all; a pixel part is a
         canvas and never sways, so its sway count is 0.
       SWAY_MAX share for wobble / glow — 1, UNCHANGED. Nothing failed at
         166 %, so kits.js's SHEETS.stickers.swayShare keeps the plan's
         default; shareOf() there is already written to read a per-preset
         object the day one is needed. Numbers, tables and two screenshots
         a preset in perf/results/stickers/. -->`;

  const blocks = drawn.map((id, i) => {
    const t = TAGS.find(x => x[0] === id);
    return `  <!-- ${String(ids.indexOf(id) + 1).padStart(2, '0')} · ${upper(id)} — ${t[1]} · ${t[2].join(', ')} -->\n` + parts[id].src;
  });

  const sheet = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<script src="./prelude.js"></script>
<script src="./support.js"></script>
<!-- lab 2 shows this on its own paper — see features/bare.css -->
<link rel="stylesheet" href="./bare.css">
<!-- lab 2 serves these faces itself — see SELF-HOSTED in index.html. The
     text-slot parts set their words in var(--display), which is Sora on the
     bench; the sheet loads the faces so a slot opened here is set the way
     it will be set there. -->
<link rel="stylesheet" href="../fonts/fonts.css">
</head>
<body>
${header}
<x-dc>
<helmet>
<style>
  body { margin: 0; }

  /* The sheet's two keyframes. sk-sway is a skew and not the forest's
     rotate: a sticker is a flat thing on a flat page and a skew reads as
     the page breathing under it where a rotation reads as the sticker
     coming unstuck; ±2° is half the village's kh-sway (±4°), because a
     sticker sways less than a signpost. Every part's root runs it
     4.2 s ease-in-out alternate, started 1.1 s in so forty of them on a
     page do not swing together. sk-bob is 4 px straight down and back,
     for the parts that hang rather than stand — a pin, a bubble — and a
     part that uses it says why in its leading comment. */
  @keyframes sk-sway { from { transform: skewX(-2deg) } to { transform: skewX(2deg) } }
  @keyframes sk-bob { from { transform: translateY(0) } to { transform: translateY(4px) } }

  /* THE JIGGLE is lab 2's, not the sheet's — the same lines forest.dc.html
     and village.dc.html carry. frames.js writes data-lab-drag onto this
     document's <html> for as long as somebody is carrying the thing about,
     and a sticker picked up ought to shake. !important on both under
     data-lab-drag, as the forest has it: the sway rides on each root's own
     style= and an inline animation would otherwise beat this rule for the
     length of the carry. The bare rule keeps no !important on purpose.
     :not([data-defs]) because the first child of the screen is the shared
     defs svg, and animating that is animating nothing, slowly. The pivot is
     the centre — a sticker has no root to pivot on, unlike a tree. */
  @keyframes jiggle {
    0%, 100% { transform: rotate(-4deg); }
    25%      { transform: rotate(3.5deg); }
    50%      { transform: rotate(-2.5deg); }
    75%      { transform: rotate(4.5deg); }
  }
  html[data-lab-drag] [data-stickers] > svg:not([data-defs]) { animation: jiggle .3s ease-in-out infinite !important; transform-origin: 50% 50% !important; }
  [data-stickers] > svg:not([data-defs]) { transform-origin: 50% 50%; }
</style>
</helmet>
<div data-screen-label="Sticker Part" data-stickers style="min-height: 100vh; box-sizing: border-box; display: flex; align-items: center; justify-content: center; position: relative">

${defs}

${blocks.join('\n\n')}

</div>
</x-dc>
<script type="text/x-dc" data-dc-script data-props="${dataProps}">
/* The long note is the HTML comment at the top of <body>: one file, forty
   parts, colours as roles, built by press/tools/build-sheet.js.

   \`part\` is a real prop with a real default, so the file still opens as
   itself in Design Canvas with nothing on the end of it at all; a section
   on the bench says which part it wants with #part= in its data-src, and
   kits.js reads the same is-flags off the sc-ifs. The nine palette values
   are the Knoll defaults (CONTRACTS.md §7) and are what Design Canvas and a
   bare open of this file see; kits.js never calls renderVals() — it fills
   the {{ }} itself from the page's --sk-* tokens. */
class Component extends DCLogic {
  renderVals() {
    let part = this.props.part;
    try {
      const m = /(?:^|[#&?])part=([\\w-]+)/.exec(location.hash + location.search);
      if (m) part = m[1];
    } catch (e) {}
    part = part || 'burst';
    return {
${Object.entries(DEFAULTS).map(([k, v]) => `      ${k}: ${typeof v === 'string' ? `'${v}'` : v},`).join('\n')}
${ids.map(id => `      ${PK.flagOf(id)}: part === '${id}',`).join('\n')}
    };
  }
}
</script>
</body>
</html>
`;
  fs.writeFileSync(SHEET, sheet);

  const index = `# parts/INDEX.md — the forty stickers, as built

Written by \`press/tools/build-sheet.js\` (do not edit — it is overwritten on
every build). One row per part of PRESS-TABLE-PLAN.md Appendix D, in the
sheet's order; the layers are read off the part's file, and a part with no
file yet says so. A tag marked \\* is a motif the vision call matches.

| # | id | what | layers | tags |
|---|---|---|---|---|
${TAGS.map((t, i) => `| ${String(i + 1).padStart(2, '0')} | \`${t[0]}\` | ${t[1]} | ${parts[t[0]] ? parts[t[0]].layers.join(' ') : '— not drawn yet'} | ${t[2].map(x => MOTIFS.has(x) ? x + '\\*' : x).join(', ')} |`).join('\n')}

${drawn.length} of ${ids.length} drawn.
`;
  fs.writeFileSync(INDEX, index);

  console.log(`wrote ${rel(SHEET)} — ${drawn.length} of ${ids.length} parts, ${(sheet.length / 1024).toFixed(1)} KB`);
  console.log(`wrote ${rel(INDEX)}`);
}

if (require.main === module) main();

module.exports = { TAGS, MOTIFS, DEFAULTS };
