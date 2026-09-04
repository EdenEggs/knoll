/* ─── THE KITS ─────────────────────────────────────────────────────────────
   Three of the sheets in ./features are KITS and not machines: forest
   (twenty-three parts), village (twenty-three) and gnome (ten). A kit part is
   an <svg> and a few CSS animations and nothing else — no inputs, no timers,
   no canvas, no script beyond the line that picks the part out of the sheet.
   Until now every one of them stood on the bench as a DOCUMENT: an iframe, a
   React root, support.js booted, its own layer tree, its own paint. Measured
   on 2026-09-04 (perf/results/baseline), a warm document costs the main
   thread roughly half a millisecond EVERY FRAME whether or not anything in it
   moves, and at 20% the whole bench is warm: 134 documents, 15 frames a
   second, standing still. 122 of the 134 were kit parts.

   So a kit part is not a document any more. It is still a <section class="gz">
   — the same box lab.js drags, picks, piles, copies and deletes, the same box
   keep.js writes down, the same data-src that says which drawing it is — but
   what is INSIDE the box is one of two things, and this file decides which:

     A SPRITE. Far away, small on screen, or simply not being touched, the
     part is painted onto a shared canvas TILE that lies under every section
     (#kit-layer, z 9 — over the wall's ink, under the pile). The tiles are
     rasterised once per landed zoom, positioned in world units so a pan is
     the same native scroll the rest of the sheet rides, and nothing on them
     ever animates: at the zooms where a part is a sprite its 1.2° sway is a
     pixel or two, and the eye does not miss it. A tile costs the main thread
     nothing per frame. That is the whole point.

     LIVE. Near, big, or in the hand — dragged, re-cut, picked, outlined
     under ctrl, on the menu — the part is LIFTED into live inline SVG
     inside its own .gz-art, in this document: the drawing itself, its sway
     or bob on the compositor exactly as it ran inside the frame, its inner
     animations, its shadow, its jiggle when carried. frames.js already knows
     how to size a .gz-art into a box (the sign is drawn that way); a lifted
     part is the sign with a different picture. What goes live is decided on
     'lab:still' and when a zoom lands — never mid-pan, the same rule the
     tiers in frames.js keep — except that a press lifts at once, because a
     thing in the hand has to be drawn where the hand is.

     A LIVE PART COMES IN THREE GRADES, and this was measured, not guessed
     (perf/probe-anim.js, 2026-09-04). An animation on a <g> INSIDE an svg
     — a falling leaf, a gnome's arm, a mushroom's bob — runs on the main
     thread, and its mere presence makes Chrome work out the page's layers
     again every frame, on screen or off, and PAUSED IS NOT ENOUGH: only an
     animation that is not there costs nothing. A sway or bob on the root
     <svg> is the compositor's and free — until a few dozen of them stand
     together, each behind its own drop-shadow, and the compositor is
     drawing that many filtered surfaces a frame. So:

       still  no animation at all — for a part that is live only because
              it must be (over a machine, or in the hand off screen) or is
              too small to be seen moving;
       sway   the root's own sway or bob, nothing inside — the nearest
              twenty parts big enough to be seen moving (SWAY_MAX);
       full   everything the sheet drew — the nearest four on screen and
              big enough for a leaf to matter (FULL_MAX, FULL_PX).

     bare.css's crowd rule paused the inner animations inside a frame; the
     same drawings out here have them TAKEN OUT instead, which is what the
     probe said the crowd rule should have done all along.

   Above ZOOM_NO_TILES there are no tiles at all. At 400% a sprite would be
   megabytes each, and a screen holds a handful of parts, so every part within
   a screen's margin is live and the rest are off screen anyway.

   The drawings come out of the sheets themselves, at run time: the .dc.html
   is fetched once, parsed, and each <sc-if> block's <svg> is lifted whole
   with the sheet's own palette filled in — the same transformation
   support.js does when it boots the document, done once here instead of
   once per frame. See THE EXTRACTOR. Nothing about forest.dc.html, village.
   dc.html or gnome.dc.html changed; opened on their own they are still
   themselves, and a fourth kit is three lines in SHEETS below.

   WHAT DID NOT CHANGE, on purpose: the section, and everything that reads
   it. lab.js sees a .gz with a box; frames.js sees an art panel with a
   natural size; ink.js asks this file what is painted under the pointer and
   gets the same true/false it used to get from elementFromPoint inside the
   frame; keep.js reports the same data-src, and serve.js writes the same
   tags. A pasted copy of a tree lands in the copies block as the same five
   lines it always did, and is converted here the next time the bench boots.

   The numbers: SWAY_PX and FULL_PX are the drawn heights, in screen px,
   under which a sway or a falling leaf is a pixel or two and not worth its
   layer or its main-thread frame; SWAY_MAX and FULL_MAX are what the probe
   found the compositor and the main thread carry without dropping a frame;
   the tile is 1024 screen px because Chrome's own raster tiles are. */

window.Kits = (function () {
  const world = document.getElementById('bench-world');
  if (!world) return null;

  const SVG_NS = 'http://www.w3.org/2000/svg';
  const SRC_RE = /features\/(forest|village|gnome)\.dc\.html#(?:part|who)=([\w-]+)/;

  /* ── THE SHEETS ──────────────────────────────────────────────────────────
     key: the prop the sheet picks its part by (forest/village 'part', gnome
     'who' — see the sheets' own comments on why it is a hash and not a
     query). spill: the root drop-shadow's reach, right and bottom, which
     frames.js counted as ink when it measured the frame ("shadows are ink")
     and which the natural box therefore includes. The village parts throw
     their shadow with an SVG filter (#ds) that frames.js's spill() never
     parsed, so their measured box was the svg box and their spill is nought;
     what falls past the box's edge is clipped there, as it was.
     palette: the interpolations the sheet's renderVals() fills in, at the
     sheet's defaults. jiggle: where the sheet pivots a carried part. */
  const SHEETS = {
    forest:  { file: 'features/forest.dc.html',  key: 'part', spill: { r: 6, b: 7 }, grassSpill: { r: 5, b: 6 },
               palette: { leafMain: '#7bc264', leafDark: '#4e8c3f', leafLite: '#a8d68a', capA: '#e8484a', sparkles: true },
               shadow: 'rgba(0,0,0,0.3)', jiggle: '50% 80%' },
    village: { file: 'features/village.dc.html', key: 'part', spill: { r: 0, b: 0 }, palette: {}, shadow: null, jiggle: '50% 80%' },
    gnome:   { file: 'features/gnome.dc.html',   key: 'who',  spill: { r: 6, b: 7 }, palette: {}, shadow: 'rgba(0,0,0,0.3)', jiggle: '50% 30%' }
  };

  /* ── THE NATURAL BOX, BEFORE THE SHEET HAS ARRIVED ───────────────────────
     lab.js reads a section's box the moment it registers it and frames.js
     cuts the box the moment it adopts it — both synchronously, at boot, long
     before a fetch could answer. So the size of every part is written down
     here: [w, h] of the box the iframe version measured at rest (svg box +
     shadow spill), recorded by perf/geometry.js on 2026-09-04 for the forest
     and read off the sheets for the other two. Once a sheet is parsed the
     same numbers are recomputed from the svg and, if they ever disagreed,
     the table is what the boxes were cut to and the svg is what is drawn
     into them — a one-pixel fit, never a shifted tree. */
  const NAT = {
    forest: { 'the-elder': [306, 353], 'the-younger': [256, 349], 'the-broad': [326, 351], 'the-ancient': [326, 363],
              'the-pine': [276, 375], 'slim-pine': [216, 357], 'the-spruce': [306, 353], 'bent-pine': [256, 349],
              'the-sapling': [256, 383], 'the-leaner': [256, 383], 'the-twins': [256, 383], 'the-sprout': [206, 307],
              'the-oak': [316, 353], 'the-acorn': [316, 353], 'the-hollow': [316, 353], 'the-gnarled': [316, 353],
              'tall-tuft': [265, 160], 'meadow-mound': [265, 160], 'wild-sprigs': [265, 160], 'plain-blades': [265, 160],
              'grand-toadstool': [265, 206], 'honey-caps': [265, 206], 'pink-bonnets': [265, 206] },
    village: { 'toadstool-house': [214, 201], 'bonnet-house': [174, 161], 'butter-cap': [130, 123], 'stump-house': [156, 128],
               'village-pine': [200, 370], 'far-pine': [112, 180], 'the-well': [124, 152], 'picket-run': [150, 88],
               'lamp-post': [54, 178], 'the-signpost': [144, 133], 'pink-hat': [82, 136], 'red-hat': [92, 140],
               'blue-hat': [80, 140], 'red-caps': [86, 74], 'mixed-caps': [100, 66], 'pink-caps': [80, 72],
               'bloom': [52, 72], 'sprig': [44, 44], 'stepping-stones': [140, 80], 'boulder': [80, 62],
               'the-sun': [130, 130], 'the-moon': [130, 130], 'firefly': [48, 48] },
    /* the gnomes are 400×545 with a 6,7 shadow, so 406×552 — except that
       frames.js measured the arm the pointer holds out (473 wide) and the
       builder's hammer (418) as ink, because they poke out of the svg box,
       and the seven standing ones came out 407×553 by its rounding. The
       numbers here are those measurements; the three gnomes not on the
       paper when they were taken (thinker, puppy-eyes, officer) are left
       out and get their size from their own raster once the sheet is in
       (see inkOf) — the thinker's ? floats a long way above his box. */
    gnome: { pointer: [473, 552], farmer: [407, 553], mechanic: [407, 553], librarian: [407, 553],
             politician: [407, 553], builder: [418, 553], legend: [407, 553] }
  };

  const SWAY_PX = 180;          // drawn height, screen px, under which a sway is a pixel and not worth a layer
  const FULL_PX = 300;          // …and under which a falling leaf or a waving arm is not worth the main thread
  const SWAY_MAX = 20;          // filtered, swaying layers at once — 21 measured free at 100%, 29 a frame at 35% (probe-anim)
  const FULL_MAX = 4;           // parts whose insides move — each is a main-thread frame's worth of layer work
  const TILE_PX = 1024;         // a tile is this many screen px square at the landed zoom
  const ZOOM_NO_TILES = 1.25;   // past this, no tiles: everything near is live, everything else is off screen
  const LIVE_MARGIN = 200;      // screen px round the viewport a live part may sit in (frames.js's pause line)
  const DROP_MARGIN = 400;      // …and how far out it has to go before it is dropped back to a sprite
  const HELD = ['dragging', 'sizing', 'picked', 'ink-hit', 'menued', 'ping'];   // classes that keep a part live
  const SPRITE_ROUND = 64;      // sprite scales are rounded to 1/64 so neighbouring zooms share a raster
  const PAD = 160;              // room round a drawing when it is rasterised, for whatever pokes out of its box

  const dpr = () => Math.min(3, window.devicePixelRatio || 1);
  const zoomOf = () => (window.Lab && Lab.zoom) || 1;
  const kebab = s => s.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
  const hash = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0) / 4294967296; };

  // ── what a part is ───────────────────────────────────────────────────────
  function kindOf(src) {
    const m = SRC_RE.exec(src || '');
    return m ? { kit: m[1], part: m[2] } : null;
  }
  const wants = el => !!(el && el.dataset && (el.dataset.kit || kindOf(el.dataset.src)));
  const isKitSrc = src => !!kindOf(src);

  function natural(kit, part) {
    // the table first: those are the boxes the frames measured, and a box
    // that was cut to one must keep fitting the same way. The ink from the
    // raster answers for a kind the table never met.
    const t = NAT[kit] && NAT[kit][part];
    if (t) return { w: t[0], h: t[1] };
    const P = sheets[kit] && sheets[kit].parts[part];
    if (P && P.ink) return { w: P.ink.w, h: P.ink.h };
    if (P) return { w: P.w + P.spill.r, h: P.h + P.spill.b };
    return { w: 400, h: 460 };            // the viewport every part was composed at
  }
  // where the drawing's box sits inside its ink: (0,0) for nearly every
  // part; negative where something pokes out to the left or above
  const inkOrigin = P => (P && P.ink ? { x: P.ink.x, y: P.ink.y } : { x: 0, y: 0 });
  const label = part => part.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  /* ── THE SHAPE OF A KIT SECTION ──────────────────────────────────────────
     The five lines index.html gives every feature, minus the three that only
     mean something over a document: no iframe (there is no document), no
     poster (nothing to wait for — and an un-booted poster is a full-box
     element that takes the pointer and says "waking up" for ever), no shield
     (a shield keeps the wheel out of a document; a press on bare paper inside
     the box already lands on the section). What stays is .gz-art — the
     wrapper frames.js sizes and scales, empty until the part is lifted —
     the readout and the corner. lab.js drags the section by itself, exactly
     as it drags the sign. */
  function shape(el, kit, part) {
    el.dataset.kit = kit;
    el.dataset.part = part;
    ['iframe', '.gz-poster', '.gz-shield'].forEach(sel => { const n = el.querySelector(sel); if (n) n.remove(); });
    if (!el.querySelector('.gz-art')) {
      const art = document.createElement('div');
      art.className = 'gz-art';
      el.insertBefore(art, el.firstChild);
    }
    if (!el.querySelector('.gz-dim')) {
      const d = document.createElement('span'); d.className = 'gz-dim'; d.setAttribute('aria-hidden', 'true'); el.appendChild(d);
    }
    if (!el.querySelector('.gz-size')) {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'gz-size'; b.setAttribute('data-nodrag', '');
      b.setAttribute('aria-label', 're-cut it — double-click to fit it to its drawing'); el.appendChild(b);
    }
    const n = natural(kit, part);
    el.dataset.w = n.w; el.dataset.h = n.h;
    if (!el.dataset.cut) { el.style.width = n.w + 'px'; el.style.height = n.h + 'px'; }
    if (!el.getAttribute('aria-label')) el.setAttribute('aria-label', label(part));
    return el;
  }

  /* A copy, built for lab.js's paste (and for last session's copies at boot)
     from the entry the clipboard keeps: the same section a hand-written one
     is, with 'gz-copy' on it so the delete tool can tell. */
  function make(e) {
    const k = kindOf(e.src); if (!k) return null;
    const el = document.createElement('section');
    el.className = 'gz gz-copy';
    el.id = 'gz-' + e.id;
    el.dataset.gizmo = e.id;
    el.dataset.src = e.src;
    if (e.scale) el.dataset.scale = e.scale;
    el.dataset.homeX = e.x; el.dataset.homeY = e.y;
    el.setAttribute('aria-label', e.label || label(k.part));
    shape(el, k.kit, k.part);
    return el;
  }

  // every kit section the markup (and lab.js's copies) put on the paper,
  // reshaped before lab.js registers a single one of them
  function convertAll() {
    document.querySelectorAll('#bench .gz[data-src]').forEach(el => {
      const k = kindOf(el.dataset.src);
      if (k) shape(el, k.kit, k.part);
    });
  }

  // ── the layer ────────────────────────────────────────────────────────────
  const layer = document.createElement('div');
  layer.id = 'kit-layer';
  layer.setAttribute('aria-hidden', 'true');
  world.appendChild(layer);

  const style = document.createElement('style');
  style.id = 'kit-keyframes';
  document.head.appendChild(style);

  // ── THE EXTRACTOR ────────────────────────────────────────────────────────
  /* What support.js does to a sheet when it boots the document, done once
     here, without the document: the template is parsed, the one <sc-if>
     whose flag the part answers to is opened, its <svg> lifted, the sheet's
     encoded attributes decoded (viewBox was written sc-camel-view-box so
     the HTML parser would not lowercase it; stdDeviation likewise), the
     {{ interpolations }} filled from the palette, nested <sc-if>s resolved
     the same way (sparkles is on; hint-placeholder-val is a streaming
     placeholder and is ignored, as the runtime ignores it once renderVals
     has answered). Verified against the runtime's own DOM for all 23 forest
     parts (reports/forest-svg.md): identical, attribute for attribute.

     Two strings come out per part. LIVE is the svg as the sheet drew it,
     sway and shadow and all, for .gz-art. RASTER has the root's filter,
     animation and transform-origin and every inner animation stripped: a
     standalone svg has no @keyframes, so an animation left in would resolve
     to nothing anyway, but the raster is drawn at rest ON PURPOSE and the
     shadow is baked by the painter, which can put it exactly where the
     frame's filter did.

     The village parts share a <defs> (#pine, #ds) that lives in a 0×0 svg
     at the head of that sheet; each part gets its own copy, first child.
     Two identical #ds in one document resolve to the first, and they are
     the same filter, so a bench with thirty live boulders is fine. */
  const sheets = {};                     // kit → { parts: { part: { w, h, live, raster, spill, sway, text } }, keyframes }
  const loading = {};

  function decodeAttrs(src, dst, pal) {
    for (const a of src.attributes) {
      let name = a.name, val = a.value;
      if (name.indexOf('sc-camel-') === 0) name = name.slice(9).replace(/-([a-z])/g, (m, c) => c.toUpperCase());
      else if (name === 'hint-placeholder-val') continue;
      if (val.indexOf('{{') >= 0) val = val.replace(/\{\{\s*([\w]+)\s*\}\}/g, (m, k) => (k in pal ? String(pal[k]) : ''));
      dst.setAttribute(name, val);
    }
  }
  function truthy(expr, pal) {
    const m = /\{\{\s*(\w+)\s*\}\}/.exec(expr || '');
    if (!m) return !!expr;
    const k = m[1];
    if (k === 'true') return true;
    if (k === 'false') return false;
    return !!pal[k];
  }
  function conv(node, pal, out) {
    // out: the element children go into
    for (const c of node.childNodes) {
      if (c.nodeType !== 1) continue;
      const tag = c.localName;
      if (tag === 'sc-if') { if (truthy(c.getAttribute('value'), pal)) conv(c, pal, out); continue; }
      if (tag === 'sc-else' || tag === 'sc-for') continue;
      const el = document.createElementNS(SVG_NS, tag);
      decodeAttrs(c, el, pal);
      if (tag === 'text' || tag === 'tspan') el.textContent = c.textContent;
      else conv(c, pal, el);
      out.appendChild(el);
    }
  }
  function extract(kit, html) {
    const S = SHEETS[kit], pal = S.palette;
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const parts = {};
    // the option list is the sheet's own spelling of every part name
    const props = doc.querySelector('script[data-dc-script]');
    let names = [];
    try { names = JSON.parse(props.getAttribute('data-props'))[S.key].options || []; } catch (e) {}
    const byFlag = {};
    names.forEach(n => { byFlag['is' + n.replace(/(^|-)(\w)/g, (m, s, c) => c.toUpperCase())] = n; });

    const defs = doc.querySelector('svg[data-defs]');
    const kf = [];
    doc.querySelectorAll('style').forEach(s => {
      const re = /@keyframes\s+[\w-]+\s*\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}/g; let m;
      while ((m = re.exec(s.textContent))) kf.push(m[0]);
    });

    doc.querySelectorAll('sc-if').forEach(block => {
      const m = /\{\{\s*(is\w+)\s*\}\}/.exec(block.getAttribute('value') || '');
      if (!m) return;
      const part = byFlag[m[1]] || kebab(m[1].slice(2));
      const src = block.querySelector(':scope > svg'); if (!src) return;
      const svg = document.createElementNS(SVG_NS, 'svg');
      decodeAttrs(src, svg, pal);
      if (!svg.getAttribute('xmlns')) svg.setAttribute('xmlns', SVG_NS);
      if (defs) {
        const d = document.createElementNS(SVG_NS, 'defs');
        conv(defs.querySelector('defs') || defs, pal, d);
        svg.appendChild(d);
      }
      conv(src, pal, svg);
      const w = parseFloat(svg.getAttribute('width')) || 0, h = parseFloat(svg.getAttribute('height')) || 0;
      const rootStyle = svg.getAttribute('style') || '';
      const sway = /animation:\s*([\w-]+)\s+([\d.]+)s[^;]*?(?:infinite\s+([\d.]+)s)?/.exec(rootStyle);
      const ser = n => new XMLSerializer().serializeToString(n);
      const stripStyle = (n, props) => {
        const re = new RegExp('(?:^|;)\\s*(' + props.join('|') + ')\\s*:[^;]*', 'g');
        const v = (n.getAttribute('style') || '').replace(re, '').replace(/^\s*;\s*/, '');
        if (v.trim()) n.setAttribute('style', v); else n.removeAttribute('style');
      };
      const full = ser(svg);                                   // everything the sheet drew
      const swayEl = svg.cloneNode(true);                      // the root's own motion, nothing inside
      swayEl.querySelectorAll('[style]').forEach(n => stripStyle(n, ['animation']));
      const swayStr = ser(swayEl);
      const stillEl = swayEl.cloneNode(true);                  // and at rest
      stripStyle(stillEl, ['animation']);
      const stillStr = ser(stillEl);
      // the raster: at rest, no filter (the painter bakes the shadow), and
      // inside a wider viewport so an arm or a hat that pokes out of the
      // box is painted rather than clipped — an svg image clips at its edge
      const rasterEl = stillEl.cloneNode(true);
      stripStyle(rasterEl, ['filter', 'transform-origin']);
      rasterEl.setAttribute('overflow', 'visible');
      rasterEl.setAttribute('x', PAD); rasterEl.setAttribute('y', PAD);
      const wrap = document.createElementNS(SVG_NS, 'svg');
      wrap.setAttribute('xmlns', SVG_NS);
      wrap.setAttribute('width', w + 2 * PAD); wrap.setAttribute('height', h + 2 * PAD);
      wrap.appendChild(rasterEl);
      const raster = ser(wrap);
      const grass = kit === 'forest' && /(tuft|mound|sprigs|blades|toadstool|caps|bonnets)$/.test(part);
      const spill = grass ? S.grassSpill : S.spill;
      // the shadow the filter threw, if there was one, in svg px
      const sh = /drop-shadow\(\s*(-?[\d.]+)px\s+(-?[\d.]+)px\s+([\d.]+)px\s+(rgba?\([^)]*\)|#[0-9a-f]+)/i.exec(rootStyle);
      parts[part] = {
        w, h, full, sway: swayStr, still: stillStr, raster, spill, ink: null,
        shadow: sh ? { x: +sh[1], y: +sh[2], blur: +sh[3], color: sh[4] } : null,
        motion: sway ? { name: sway[1], dur: +sway[2], delay: +(sway[3] || 0) } : null,
        text: !!svg.querySelector('text')
      };
    });
    return { parts, keyframes: kf };
  }

  function loadSheet(kit) {
    if (sheets[kit]) return Promise.resolve(sheets[kit]);
    if (loading[kit]) return loading[kit];
    const S = SHEETS[kit];
    loading[kit] = fetch(S.file, { cache: 'no-cache' }).then(r => {
      if (!r.ok) throw new Error(S.file + ' ' + r.status);
      return r.text();
    }).then(html => {
      const sh = extract(kit, html);
      sheets[kit] = sh;
      style.textContent += '\n' + sh.keyframes.join('\n');
      // every part's ink and mask, now, so ctrl has an answer the first
      // time it asks and a part that pokes out of its box gets its true
      // size before anyone looks at it
      Object.keys(sh.parts).forEach(part => inkOf(kit, part));
      return sh;
    }).catch(e => {
      console.warn('[kits] could not read ' + S.file + ' — its parts stay bare:', e && e.message);
      sheets[kit] = { parts: {}, keyframes: [] };
      return sheets[kit];
    });
    return loading[kit];
  }

  // ── SPRITES ──────────────────────────────────────────────────────────────
  /* A sprite is a part rasterised at one scale — device pixels per svg
     pixel — with its shadow baked in, cached by kit/part@scale. It is drawn
     from a data: url through an <img>, which is the one way a browser
     rasterises svg onto a canvas, and the shadow goes on through the
     context's own filter, scaled with it: the frame's drop-shadow(6px 7px)
     on a tree drawn at k× is a 6k,7k shadow, and so is this one.

     Never scaled UP from a smaller raster: strokes in these drawings are two
     to seven units, and a hairline blown up is mud. A new zoom rasterises
     anew; the last three zooms' sprites are kept and older ones dropped, so
     stepping back and forth costs nothing and a long session does not hoard
     bitmaps. */
  const sprites = new Map();          // key → { canvas, w, h, s, base, ready, waiting: Set<tile> }
  const masks = new Map();            // kit/part → { data: Uint8ClampedArray alpha, w, h }
  const bases = [];                   // the last few base scales (zoom × dpr), newest last

  function svgImage(str) {
    return new Promise((res, rej) => {
      const img = new Image();
      img.onload = () => res(img);
      img.onerror = () => rej(new Error('svg image failed'));
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(str);
    });
  }

  const images = new Map();           // kit/part → Promise<Image> of the padded raster
  const imageOf = (kit, part, P) => {
    const key = kit + '/' + part;
    if (!images.has(key)) images.set(key, svgImage(P.raster));
    return images.get(key);
  };
  const shadowFilter = (P, s) => P.shadow
    ? 'drop-shadow(' + (P.shadow.x * s) + 'px ' + (P.shadow.y * s) + 'px ' + (P.shadow.blur * s) + 'px ' + P.shadow.color + ')' : 'none';

  /* THE INK is what frames.js used to measure: the drawing's box let out by
     its shadow, and anything that pokes out of the box — a pointing arm, a
     hat — because the frame measured that too. Found once per part from the
     padded raster: the alpha box of the shadowed drawing, unioned with the
     svg box plus spill. For nearly every part that is the box; where it is
     bigger, the panel is re-cut to it (see recut). The MASK is the same
     crop of the drawing WITHOUT its shadow: the answer to ctrl, which never
     picks a thing up by its shadow. */
  function inkOf(kit, part) {
    const key = kit + '/' + part;
    if (masks.has(key)) return masks.get(key);
    const P = sheets[kit] && sheets[kit].parts[part];
    if (!P) return null;
    const m = { data: null, w: 0, h: 0, ready: false };
    masks.set(key, m);
    imageOf(kit, part, P).then(img => {
      const W = P.w + 2 * PAD, H = P.h + 2 * PAD;
      const c = document.createElement('canvas'); c.width = W; c.height = H;
      const ctx = c.getContext('2d', { willReadFrequently: true });
      ctx.filter = shadowFilter(P, 1);
      ctx.drawImage(img, 0, 0);
      const d = ctx.getImageData(0, 0, W, H).data;
      let x0 = W, y0 = H, x1 = -1, y1 = -1;
      for (let y = 0; y < H; y++) for (let x = 0, i = (y * W) * 4 + 3; x < W; x++, i += 4) {
        if (d[i] > 8) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
      }
      // the box plus spill, and whatever went past it
      const bx = Math.min(0, x0 - PAD), by = Math.min(0, y0 - PAD);
      const bw = Math.max(P.w + P.spill.r, x1 + 1 - PAD) - bx, bh = Math.max(P.h + P.spill.b, y1 + 1 - PAD) - by;
      const t = NAT[kit] && NAT[kit][part];
      // the table's numbers are frames.js's own measurements and stand
      // unless the drawing plainly goes past them
      const ink = t ? { x: bx, y: by, w: Math.max(t[0], Math.ceil(bw)), h: Math.max(t[1], Math.ceil(bh)) }
                    : { x: bx, y: by, w: Math.ceil(bw), h: Math.ceil(bh) };
      P.ink = ink;
      // the mask: no shadow, cropped to the ink
      ctx.filter = 'none'; ctx.clearRect(0, 0, W, H); ctx.drawImage(img, 0, 0);
      const md = ctx.getImageData(PAD + ink.x, PAD + ink.y, ink.w, ink.h).data;
      const a = new Uint8ClampedArray(ink.w * ink.h);
      for (let i = 0, j = 3; i < a.length; i++, j += 4) a[i] = md[j];
      m.data = a; m.w = ink.w; m.h = ink.h; m.ready = true;
      // a part on the paper whose box was cut from the table: re-cut it to
      // the ink if the two disagree (they do for the pointer's arm)
      recs.forEach(r => { if (r.kit === kit && r.part === part) recut(r); });
    }).catch(() => { m.ready = true; });
    return m;
  }
  const mask = inkOf;

  function recut(r) {
    const p = r.panel; if (!p || !window.Frames || !Frames.cut) return;
    const n = natural(r.kit, r.part);
    if (n.w === p.natW && n.h === p.natH) { if (r.live) placeLive(r); return; }
    p.natW = n.w; p.natH = n.h;
    r.el.dataset.w = n.w; r.el.dataset.h = n.h;
    const k = parseFloat(r.el.dataset.scale) > 0 ? parseFloat(r.el.dataset.scale) : 1;
    if (p.sized) Frames.cut(p, parseFloat(r.el.style.width) || r.w, parseFloat(r.el.style.height) || r.h, false);
    else Frames.cut(p, Math.round(n.w * k), Math.round(n.h * k), false);
    readGeo(r);
    if (r.live) placeLive(r);
  }

  function sprite(kit, part, s) {
    const key = kit + '/' + part + '@' + s;
    let sp = sprites.get(key);
    if (sp) return sp;
    const P = sheets[kit] && sheets[kit].parts[part];
    if (!P || !P.ink) return null;
    const ink = P.ink;
    const W = Math.ceil(ink.w * s), H = Math.ceil(ink.h * s);
    sp = { key, canvas: null, w: W, h: H, s, ready: false, waiting: new Set() };
    sprites.set(key, sp);
    imageOf(kit, part, P).then(img => {
      const c = document.createElement('canvas');
      c.width = Math.max(1, W); c.height = Math.max(1, H);
      const ctx = c.getContext('2d');
      try { ctx.filter = shadowFilter(P, s); } catch (e) {}
      // the ink's crop of the padded image, scaled: the vector is rasterised
      // at the destination size, so a sprite is never a blown-up bitmap
      ctx.drawImage(img, PAD + ink.x, PAD + ink.y, ink.w, ink.h, 0, 0, ink.w * s, ink.h * s);
      sp.canvas = c; sp.ready = true;
      const t = [...sp.waiting]; sp.waiting.clear();
      t.forEach(dirtyTile);
    }).catch(() => { sp.ready = true; });   // a part that will not raster is a part that stays bare
    return sp;
  }

  function noteBase(b) {
    const i = bases.indexOf(b);
    if (i >= 0) bases.splice(i, 1);
    bases.push(b);
    while (bases.length > 3) bases.shift();
    for (const [key, sp] of sprites) if (bases.indexOf(sp.base) < 0 && sp.base != null) sprites.delete(key);
  }

  // ── THE INDEX ────────────────────────────────────────────────────────────
  /* One record per kit section on the paper, keyed by its gizmo name rather
     than by the element, because undo hands lab.js a FRESH clone of a
     section it puts back (lab.js: unhide, deleteCopy) and the name is what
     survives. Geometry is read off the section's own inline style — the
     numbers lab.js and frames.js write, in world units — and re-read
     whenever that style changes. */
  const recs = new Map();             // gizmo → rec
  const byEl = new WeakMap();         // element → rec
  const CELL = 1024;                  // the grid the paper is hashed on, world units
  const grid = new Map();             // "cx,cy" → Set<rec>

  function cellsOf(r) {
    const out = [];
    const x0 = Math.floor(r.x / CELL), y0 = Math.floor(r.y / CELL);
    const x1 = Math.floor((r.x + r.w) / CELL), y1 = Math.floor((r.y + r.h) / CELL);
    for (let cy = y0; cy <= y1; cy++) for (let cx = x0; cx <= x1; cx++) out.push(cx + ',' + cy);
    return out;
  }
  function unhash(r) { r.cells.forEach(k => { const s = grid.get(k); if (s) { s.delete(r); if (!s.size) grid.delete(k); } }); r.cells = []; }
  function rehash(r) { unhash(r); r.cells = cellsOf(r); r.cells.forEach(k => { let s = grid.get(k); if (!s) grid.set(k, s = new Set()); s.add(r); }); }

  function readGeo(r) {
    const st = r.el.style;
    const x = parseFloat(st.left) || 0, y = parseFloat(st.top) || 0;
    const w = parseFloat(st.width) || r.el.offsetWidth || 0, h = parseFloat(st.height) || r.el.offsetHeight || 0;
    const z = parseInt(st.zIndex, 10) || 0;
    const n = natural(r.kit, r.part);
    const k = Math.min(w / n.w, h / n.h) || 1;
    const changed = x !== r.x || y !== r.y || w !== r.w || h !== r.h || z !== r.z || k !== r.k;
    if (changed) {
      const old = { x: r.x, y: r.y, w: r.w, h: r.h };
      r.x = x; r.y = y; r.w = w; r.h = h; r.z = z; r.k = k;
      r.natW = n.w; r.natH = n.h;
      rehash(r);
      if (!r.live) { dirtyRect(old); dirtyRect(r); }
    }
    return changed;
  }

  const watcher = new MutationObserver(rows => {
    let geo = false;
    rows.forEach(row => {
      const r = byEl.get(row.target); if (!r) return;
      if (row.attributeName === 'style') { if (readGeo(r)) geo = true; }
      else if (row.attributeName === 'class') held(r);
    });
    if (geo) mustSoon();
  });

  function held(r) {
    const cl = r.el.classList;
    const on = HELD.some(c => cl.contains(c));
    r.held = on;
    if (on && !r.live) { lift(r, true, 'still'); relive(); }
  }

  function adopt(el, panel) {
    const k = kindOf(el.dataset.src) || (el.dataset.kit ? { kit: el.dataset.kit, part: el.dataset.part } : null);
    if (!k) return null;
    let r = recs.get(el.dataset.gizmo);
    if (r && r.el !== el) drop(r.el);   // a fresh clone under an old name: undo did this
    if (r && r.el === el) return r;
    r = { id: el.dataset.gizmo, el, kit: k.kit, part: k.part, x: 0, y: 0, w: 0, h: 0, z: 0, k: 1,
          natW: 0, natH: 0, live: false, held: false, must: false, cells: [], panel: panel || null };
    const art = el.querySelector('.gz-art');
    if (art) art.textContent = '';       // a clone of a lifted part carries its svg; it is a sprite again
    recs.set(r.id, r); byEl.set(el, r);
    readGeo(r);
    watcher.observe(el, { attributes: true, attributeFilter: ['style', 'class'] });
    held(r);
    loadSheet(r.kit).then(() => { if (recs.get(r.id) === r) { dirtyRect(r); mustSoon(); } });
    return r;
  }
  function drop(el) {
    const r = byEl.get(el); if (!r) return false;
    if (r.live) unlift(r);
    unhash(r); dirtyRect(r);
    byEl.delete(el);
    if (recs.get(r.id) === r) recs.delete(r.id);
    return true;
  }

  // ── TILES ────────────────────────────────────────────────────────────────
  const tiles = new Map();            // "tx,ty" → { key, tx, ty, canvas, dirty }
  const pendingInk = new Set();       // tiles that asked for a part whose ink was not in yet
  let tileZ = 0, tileT = 0;           // the zoom the tiles were cut at, and their side in world units
  const dirty = new Set();
  let paintT = 0;

  function viewRect() {
    const b = Lab.bench.getBoundingClientRect();
    const a = Lab.toWorld(b.left, b.top), c = Lab.toWorld(b.right, b.bottom);
    return { x: a.x, y: a.y, w: c.x - a.x, h: c.y - a.y, sx: b.width, sy: b.height };
  }
  function dirtyRect(q) {
    if (!tileT) return;
    const x0 = Math.floor(q.x / tileT), y0 = Math.floor(q.y / tileT);
    const x1 = Math.floor((q.x + q.w) / tileT), y1 = Math.floor((q.y + q.h) / tileT);
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) { const t = tiles.get(tx + ',' + ty); if (t) dirtyTile(t); }
  }
  function dirtyTile(t) { t.dirty = true; dirty.add(t); schedulePaint(); }
  function schedulePaint() { if (!paintT) paintT = requestAnimationFrame(paintSome); }

  function paintSome() {
    paintT = 0;
    if (!dirty.size) return;
    if (window.Lab && Lab.moving && Lab.moving()) { paintT = requestAnimationFrame(paintSome); return; }
    let n = 0;
    for (const t of dirty) {
      if (!t.canvas.isConnected) { dirty.delete(t); continue; }
      paintTile(t); dirty.delete(t);
      if (++n >= 4) break;
    }
    if (dirty.size) schedulePaint();
  }

  function paintTile(t) {
    t.dirty = false;
    const Z = tileZ, d = dpr(), px = TILE_PX * d;
    const c = t.canvas;
    if (c.width !== px || c.height !== px) { c.width = px; c.height = px; }
    const ctx = c.getContext('2d');
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, px, px);
    const wx = t.tx * tileT, wy = t.ty * tileT;
    ctx.setTransform(Z * d, 0, 0, Z * d, -wx * Z * d, -wy * Z * d);   // draw in world units
    const rect = { x: wx, y: wy, w: tileT, h: tileT };
    const list = [];
    cellsOf(rect).forEach(k => { const s = grid.get(k); if (s) s.forEach(r => { if (list.indexOf(r) < 0) list.push(r); }); });
    list.sort((a, b) => (a.z - b.z) || (a.id < b.id ? -1 : 1));
    for (const r of list) {
      if (r.live || !r.w || !r.h) continue;
      if (r.x + r.w < wx || r.y + r.h < wy || r.x > wx + tileT || r.y > wy + tileT) continue;
      const P = sheets[r.kit] && sheets[r.kit].parts[r.part];
      if (!P) continue;
      const base = Math.round(Z * d * SPRITE_ROUND) / SPRITE_ROUND;
      const s = Math.round(base * r.k * SPRITE_ROUND) / SPRITE_ROUND;
      const sp = sprite(r.kit, r.part, s);
      if (!sp) { pendingInk.add(t); continue; }
      sp.base = base;
      if (!sp.ready) { sp.waiting.add(t); continue; }
      if (!sp.canvas) continue;
      // the drawing's top left inside the box — the same sum frames.js's
      // place() does for .gz-art: fitted, centred, origin at the corner
      const ox = r.x + (r.w - r.natW * r.k) / 2, oy = r.y + (r.h - r.natH * r.k) / 2;
      const dw = sp.w / s * r.k, dh = sp.h / s * r.k;
      if (dw > r.natW * r.k + 0.5 || dh > r.natH * r.k + 0.5) {
        // more ink than box — an arm at rest reaching past where the frame
        // measured it mid-swing: the box clips it, as .gz's overflow did
        ctx.save(); ctx.beginPath(); ctx.rect(r.x, r.y, r.w, r.h); ctx.clip();
        ctx.drawImage(sp.canvas, ox, oy, dw, dh);
        ctx.restore();
      } else ctx.drawImage(sp.canvas, ox, oy, dw, dh);
    }
  }

  function layoutTiles() {
    if (!window.Lab) return;
    const Z = zoomOf();
    if (Z > ZOOM_NO_TILES) { clearTiles(); tileZ = Z; tileT = 0; return; }
    if (Z !== tileZ) { clearTiles(); tileZ = Z; tileT = TILE_PX / Z; noteBase(Math.round(Z * dpr() * SPRITE_ROUND) / SPRITE_ROUND); }
    const v = viewRect();
    const x0 = Math.floor(v.x / tileT) - 1, y0 = Math.floor(v.y / tileT) - 1;
    const x1 = Math.floor((v.x + v.w) / tileT) + 1, y1 = Math.floor((v.y + v.h) / tileT) + 1;
    const keep = new Set();
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
      const key = tx + ',' + ty; keep.add(key);
      if (tiles.has(key)) continue;
      const canvas = document.createElement('canvas');
      canvas.className = 'kit-tile';
      canvas.style.left = (tx * tileT) + 'px'; canvas.style.top = (ty * tileT) + 'px';
      canvas.style.width = tileT + 'px'; canvas.style.height = tileT + 'px';
      layer.appendChild(canvas);
      const t = { key, tx, ty, canvas, dirty: true };
      tiles.set(key, t); dirtyTile(t);
    }
    // two rings out, a tile is let go
    for (const [key, t] of tiles) {
      if (keep.has(key)) continue;
      if (t.tx < x0 - 1 || t.tx > x1 + 1 || t.ty < y0 - 1 || t.ty > y1 + 1) { t.canvas.remove(); tiles.delete(key); dirty.delete(t); }
    }
  }
  function clearTiles() { for (const t of tiles.values()) t.canvas.remove(); tiles.clear(); dirty.clear(); }

  // ── LIVE ─────────────────────────────────────────────────────────────────
  // grade: 'still' | 'sway' | 'full' — see the header
  function lift(r, now, grade) {
    const P = sheets[r.kit] && sheets[r.kit].parts[r.part];
    if (!P) return false;
    const art = r.el.querySelector('.gz-art'); if (!art) return false;
    grade = grade || 'still';
    if (r.live && r.grade === grade) return true;
    art.innerHTML = grade === 'full' ? P.full : grade === 'sway' ? P.sway : P.still;
    const svg = art.firstElementChild;
    if (svg && P.motion && grade !== 'still') {
      // in step with itself: the sprite it was a moment ago stood at rest,
      // so the animation starts within half a degree of rest — and not at
      // the same point as its neighbour, or a stand of pines would sway as
      // one
      const ph = P.motion.dur * (0.25 + 0.08 * hash(r.id));
      svg.style.animationDelay = (-ph).toFixed(3) + 's';
    }
    const was = r.live;
    r.live = true; r.grade = grade;
    placeLive(r);
    if (!was) { if (now) { dirtyRect(r); paintDirtyNow(); } else dirtyRect(r); }
    return true;
  }
  // the svg sits where its ink starts: (0,0) of the art for nearly every
  // part, further in for one that pokes out to the left or above
  function placeLive(r) {
    const art = r.el.querySelector('.gz-art');
    if (!art) return;
    const o = inkOrigin(sheets[r.kit] && sheets[r.kit].parts[r.part]);
    art.querySelectorAll(':scope > svg').forEach(n => { n.style.left = (-o.x) + 'px'; n.style.top = (-o.y) + 'px'; });
  }
  function unlift(r) {
    const art = r.el.querySelector('.gz-art');
    if (art) art.textContent = '';
    r.live = false; r.grade = null;
    dirtyRect(r);
  }
  function paintDirtyNow() {
    for (const t of dirty) if (t.canvas.isConnected) paintTile(t);
    dirty.clear();
  }

  /* Who is live: the held (a press, a carry, the corner, the pick, the
     outline, the menu), the must (a part standing OVER a machine — a tile
     lies under every section, so a part ranked above a non-kit gizmo it
     overlaps has to be drawn in the document to keep its place), the parts
     with text in them (a webfont does not reach an image), and then the
     nearest of what is on screen and big enough to be seen moving, up to a
     cap. Recomputed when the camera settles and when a zoom lands. */
  function relive() {
    if (!window.Lab) return;
    const Z = zoomOf();
    const v = viewRect();
    const m = LIVE_MARGIN / Z, dm = DROP_MARGIN / Z;
    const near = { x: v.x - m, y: v.y - m, w: v.w + 2 * m, h: v.h + 2 * m };
    const far = { x: v.x - dm, y: v.y - dm, w: v.w + 2 * dm, h: v.h + 2 * dm };
    const cx = v.x + v.w / 2, cy = v.y + v.h / 2;
    const noTiles = Z > ZOOM_NO_TILES;
    const want = new Map();              // rec → grade
    const moving = [];                   // on screen and big enough to move, nearest first
    recs.forEach(r => {
      const P = sheets[r.kit] && sheets[r.kit].parts[r.part];
      if (!P) return;
      const inNear = r.x + r.w > near.x && r.x < near.x + near.w && r.y + r.h > near.y && r.y < near.y + near.h;
      const inFar = r.x + r.w > far.x && r.x < far.x + far.w && r.y + r.h > far.y && r.y < far.y + far.h;
      const px = r.h * r.k * Z;          // drawn height on screen
      const seen = r.live ? inFar : inNear;
      // live for a reason of its own: still, unless it is also near and big
      if (r.held || r.must || P.text) want.set(r, 'still');
      // a part with no tile under it is live whatever its size
      else if (noTiles && inFar) want.set(r, 'still');
      if (seen && px >= (r.live && r.grade !== 'still' ? 0.85 : 1) * SWAY_PX) {
        const dx = (r.x + r.w / 2) - cx, dy = (r.y + r.h / 2) - cy;
        moving.push({ r, d: dx * dx + dy * dy, px });
      }
    });
    moving.sort((a, b) => a.d - b.d);
    let sways = 0, fulls = 0;
    for (const c of moving) {
      if (sways >= SWAY_MAX) break;
      const onScreen = c.r.x + c.r.w > v.x && c.r.x < v.x + v.w && c.r.y + c.r.h > v.y && c.r.y < v.y + v.h;
      const full = fulls < FULL_MAX && c.px >= FULL_PX && onScreen;
      want.set(c.r, full ? 'full' : 'sway');
      sways++; if (full) fulls++;
    }
    /* THE EXCEPTION. A part whose section carries data-live (index.html says
       which and why) is drawn in full — everything its sheet drew, the
       hammer and all — whenever it is anywhere near the screen, whatever
       its size on it and outside the caps above: the builder hammering
       under his speech bubble is the bench's opening shot, not incidental
       sway, and one inner animation is what the caps were budgeted for.
       Off the paper he is a sprite like the rest. frames.js has the same
       word for a machine. */
    recs.forEach(r => {
      if (!r.el.hasAttribute('data-live')) return;
      const inNear = r.x + r.w > near.x && r.x < near.x + near.w && r.y + r.h > near.y && r.y < near.y + near.h;
      if (inNear) want.set(r, 'full');
    });
    recs.forEach(r => {
      const g = want.get(r);
      if (g) lift(r, false, g);
      else if (r.live) unlift(r);
    });
  }

  // the must: a part over a machine. Cheap — a few dozen non-kit boxes.
  let mustT = 0;
  function mustSoon() { if (!mustT) mustT = setTimeout(remust, 120); }
  function remust() {
    mustT = 0;
    const others = [];
    document.querySelectorAll('#bench-world > .gz:not([data-kit])').forEach(el => {
      const st = el.style;
      others.push({ x: parseFloat(st.left) || 0, y: parseFloat(st.top) || 0,
                    w: parseFloat(st.width) || el.offsetWidth, h: parseFloat(st.height) || el.offsetHeight,
                    z: parseInt(st.zIndex, 10) || 0 });
    });
    let changed = false;
    recs.forEach(r => {
      let must = false;
      for (const o of others) {
        if (r.z <= o.z) continue;
        if (r.x < o.x + o.w && r.x + r.w > o.x && r.y < o.y + o.h && r.y + r.h > o.y) { must = true; break; }
      }
      if (must !== r.must) { r.must = must; changed = true; }
    });
    if (changed) relive();
  }

  // ── CTRL: WHAT IS PAINTED UNDER THE POINTER ──────────────────────────────
  /* ink.js asks. The answer comes from the drawing's own alpha at 1×, mapped
     back through the box: never from elementsFromPoint, which cannot see
     through the pointer-events:none ink.js puts on every other section. */
  function inkAt(el, cx, cy) {
    const r = byEl.get(el); if (!r) return null;
    const m = mask(r.kit, r.part); if (!m || !m.data) return null;
    const b = el.getBoundingClientRect(); if (!b.width) return null;
    const Z = b.width / (r.w || 1);
    const lx = (cx - b.left) / Z, ly = (cy - b.top) / Z;              // box px
    const tx = (r.w - r.natW * r.k) / 2, ty = (r.h - r.natH * r.k) / 2;
    const ax = Math.round((lx - tx) / r.k), ay = Math.round((ly - ty) / r.k);   // ink px at 1×
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const x = ax + dx, y = ay + dy;
      if (x < 0 || y < 0 || x >= m.w || y >= m.h) continue;
      if (m.data[y * m.w + x] > 8) return true;
    }
    return false;
  }

  /* The outline: ink.js's own recipe, in this document — a flat copy of the
     drawing behind the drawing, painted pink and spread 2.5px by four hard
     shadows, so the rim that shows past the edges is the silhouette. */
  let outlined = null;
  function outline(el) {
    if (outlined) { const n = outlined.querySelector('.gz-art > [data-lab-ink]'); if (n) n.remove(); outlined = null; }
    if (!el) return false;
    const r = byEl.get(el); if (!r) return false;
    if (!r.live && !lift(r, true, 'still')) return false;
    const art = el.querySelector('.gz-art'), svg = art && art.querySelector(':scope > svg');
    if (!svg) return false;
    const copy = svg.cloneNode(true);
    copy.setAttribute('data-lab-ink', '');
    copy.removeAttribute('style');
    copy.setAttribute('width', svg.getAttribute('width')); copy.setAttribute('height', svg.getAttribute('height'));
    copy.querySelectorAll('[style]').forEach(n => n.removeAttribute('style'));
    copy.querySelectorAll('[filter]').forEach(n => n.removeAttribute('filter'));
    art.insertBefore(copy, svg);
    outlined = el;
    return true;
  }

  // frames.js's drag signal: a carried part is drawn in the hand, at once
  function drag(el, on) {
    const r = byEl.get(el); if (!r) return;
    if (on && !r.live) { lift(r, true, 'still'); relive(); }
  }

  // ── boot ─────────────────────────────────────────────────────────────────
  convertAll();
  // the three sheets are asked for NOW, while the rest of the page is still
  // parsing — index.html preloads them too — so the parts near the opening
  // camera are drawn the moment lab.js and frames.js have run, not a fetch
  // later
  Object.keys(SHEETS).forEach(loadSheet);
  const kf = document.createElement('style');
  kf.id = 'kit-css';
  document.head.appendChild(kf);

  let started = false;
  function start() {
    if (started || !window.Lab) return; started = true;
    // every kit section frames.js adopted before this ran, and any it missed
    document.querySelectorAll('#bench .gz[data-kit]').forEach(el => { if (!byEl.get(el)) adopt(el); });
    Promise.all(Object.keys(SHEETS).map(loadSheet)).then(() => { layoutTiles(); relive(); remust(); });
    document.addEventListener('lab:still', () => { layoutTiles(); relive(); });
    // tiles that asked for a part before its ink was known are painted
    // once the sheet has settled — a beat after each sheet arrives
    const flushInk = () => { const t = [...pendingInk]; pendingInk.clear(); t.forEach(dirtyTile); };
    Object.keys(SHEETS).forEach(k => loadSheet(k).then(() => setTimeout(flushInk, 400)));
    document.addEventListener('lab:zoom', () => { layoutTiles(); relive(); });
    window.addEventListener('resize', () => { layoutTiles(); relive(); });
    // a lab:zoom lands only at the end of a glide; meanwhile the tiles are
    // scaled by the sheet and that is fine — but the ring must follow a
    // scroll that outruns lab:still, so the scroll itself asks for tiles
    let scrollT = 0;
    Lab.bench.addEventListener('scroll', () => {
      if (scrollT) return;
      scrollT = setTimeout(() => { scrollT = 0; if (!(Lab.moving && Lab.moving())) layoutTiles(); }, 90);
    }, { passive: true });
    layoutTiles();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();

  function stats() {
    let live = 0; recs.forEach(r => { if (r.live) live++; });
    let bytes = 0; sprites.forEach(s => { if (s.canvas) bytes += s.canvas.width * s.canvas.height * 4; });
    let full = 0, sway = 0; recs.forEach(r => { if (r.grade === 'full') full++; else if (r.grade === 'sway') sway++; });
    return { parts: recs.size, live, full, sway, tiles: tiles.size, sprites: sprites.size, spriteBytes: bytes, tileZ, sheets: Object.keys(sheets) };
  }
  function freeze(on) { Lab.bench.toggleAttribute('data-kit-freeze', !!on); }

  return { natural, adopt, drop, inkAt, outline, drag, wants, isKitSrc, make, kindOf, start, stats, freeze,
           relive, get recs() { return recs; }, get sheets() { return sheets; } };
})();
