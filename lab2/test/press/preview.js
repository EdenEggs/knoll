/* ─── THE MOCKUPS ─────────────────────────────────────────────────────────
   press/preview.js — the three little pictures the Press Table puts side by
   side (PRESS-TABLE-PLAN.md §10 6.2 step 4). Each one is a scaled-down,
   STATIC rendition of one recipe under one theme: the paper the game page
   will have, its pictures where the layout puts them, its words in the
   pairing's faces, its link chips, and its stickers drawn in its own
   colours. The owner looks at three of them and picks one; then Build writes
   the real page with press/tools/build-game.js.

   It is NOT the page. It draws no bench, registers nothing with lab.js,
   loads no iframe and hangs no listener; it is a picture of a page, drawn in
   plain divs, and everything it knows it was handed. Two entry points and
   nothing else on window:

     Preview.render(container, spec) → Promise<{width, height, warnings}>
       spec = { manifest, assets: [{id, role, url, w, h}], theme, style,
                layout, stickers: [{part, still, w, h}], fonts, scale }
     Preview.trayFor(theme, style, count) → Promise<[{part, still, w, h}]>

   ── THE ONE RULE OF THIS FILE: NOTHING GOES TO :root ─────────────────────
   Three mockups with three themes stand on ONE page. A theme is a block of
   custom properties, and the one place they must never be written is the
   document root: `--paper` on :root repaints the whole Press Table, and the
   second mockup would overwrite the first's. So every token of
   spec.theme.tokens is set as a custom property ON THE CONTAINER ELEMENT
   (`el.style.setProperty('--paper', …)`), custom properties inherit, and
   every rule below reads `var(--paper)` and never a literal. That is the
   whole mechanism: three containers, three token blocks, no collision, and
   the Press Table's own chrome outside them untouched. The rule holds for
   the stylesheet too — the rules live in ONE <style> that goes inside the
   container's own subtree, every selector prefixed `.pv-`, so this file
   writes no global CSS at all and asks press/press.css for nothing.

   Everything else it touches, it puts back: it clears the container, writes
   its own subtree, and touches no node outside it. Called twice on the same
   container the second call wins and the first stops where it is (the render
   token in RENDERS below), so a fast tweak panel cannot leave half of one
   mockup inside another.

   ── HOW A STICKER STRING IS PAINTED ──────────────────────────────────────
   `Kits.extractOnly` hands back a STRING per part — the serialised <svg>,
   the sheet's drawing with the page's palette already in it. There are two
   ways to put a string on a page and this file takes the second:

     an <img src="data:image/svg+xml,…"> is the safest thing there is (an SVG
     inside an <img> can neither script nor fetch), and it is wrong here for
     two reasons that are both about the picture being right. An image is its
     own document: it cannot see the container's custom properties, and eleven
     of the forty parts set their words in `var(--display)` — the four tags,
     the banner, the two badges, the ribbon, the three bubbles — so every one
     of them would come out in the browser's default face instead of the
     game's. And an image clips at its own edge, where the drop-shadow every
     part wears (`filter: drop-shadow(6px 7px 0 …)`, the sheet's own root
     style) is thrown 6 right and 7 down and would be cut off.

     INLINE, SANITISED, AND RE-SUFFIXED, which is what happens below. The
     string is parsed with DOMParser (a parsed document runs nothing — it is
     connected to no view), then walked once: every <script>, <foreignObject>,
     <style>, <iframe>, <object>, <embed>, <audio>, <video> and SMIL
     <animate*>/<set> element is removed, every `on*` attribute goes, every
     href that is not a same-document `#fragment` goes, and any `url(` in a
     style attribute that does not point at `#` goes. <style> is on that list
     for the same reason :root is: a <style> inside an inline SVG is scoped to
     the DOCUMENT, so one of them in a mockup would paint the whole Press
     Table. Only then is the tree imported. Nothing that arrives in a string
     can execute, fetch, or leak out of the container.

     AND EVERY id IS RENAMED. kits.js suffixes the ids it copies with a hash
     of the STYLE vector, so two parts at two styles cannot share a filter —
     but two mockups of one game at the same style and two DIFFERENT themes
     get the same suffix, and a pattern like #sk-hatch is drawn in
     {{ skShadow }}, which is a colour. Duplicate ids resolve to the first in
     the document, so mockup 2's hatch would come out in mockup 1's shadow.
     Every id in an injected drawing therefore takes a further per-render
     suffix and every `url(#…)` and `href="#…"` that names it is rewritten
     with it. That also means an injected id can never collide with one the
     Press Table's own page happens to carry.

   ── THE CACHE, AND WHAT ITS KEY IS ───────────────────────────────────────
   `Kits.extractOnly` fetches the 224 KB sheet, parses it, and runs the style
   pass over forty drawings. Three mockups of one game want the same forty,
   so the extraction is cached — the PROMISE is cached and not the answer, so
   three renders that start in the same tick share one extraction rather than
   starting three.

   THE KEY IS the palette this file builds out of the theme, canonicalised to
   JSON, then the halo bit, then the style vector, canonicalised to JSON with
   `motifs` and `mood` left out:

       JSON(palette, keys sorted) + NUL + halo + NUL + JSON(style, keys sorted)

   Why the palette and not `theme.css`. theme.css is deterministic and
   byte-identical for a given theme (CONTRACTS §2), so it would work, and it
   is what the plan named. The palette is theme.css with everything that
   cannot change a drawing taken out of it: the sheet reads the seven
   `--sk-*` roles and nothing else (CONTRACTS §6, and kits.js's own
   pagePalette says so in as many words), so two themes that differ only in
   their paper or their line colour share one extraction instead of running
   the style pass twice over the same forty pictures. `--sk-halo` is in the
   key too — it is a token and not a role, but it turns a layer on.

   Why the keys are sorted. A style vector off `Style.forPreset` and one off
   a `game.json` hold the same fields in the same order today; a vector built
   by hand need not, and JSON.stringify is order-sensitive. Sorting makes the
   key a fact about the vector rather than about how it was typed.

   Why `motifs` and `mood` are left out. kits.js's style pass never reads
   them — they only reorder the tray, which is a sort of forty strings that
   are already in hand, and re-extracting for a re-sort would be the cache
   paying for nothing.

   ── THE HALO, WHICH HAD TO COME THE LONG WAY ROUND ───────────────────────
   `--sk-halo` is the one thing a theme says about a sticker that kits.js
   reads off the DOCUMENT ROOT rather than off the palette it is handed
   (`haloToken()`, kits.js line 331) — and the root is exactly where this
   file may not write. So the halo is applied where it lands: when the theme
   asks for it, each extracted string has the `display:none` taken off its
   `<g data-layer="halo">`, which is the same edit kits.js's own step 8 makes
   on the same node. It is done once, on the cached extraction, so the tray
   the owner sees and the stickers in the mockups are one drawing and not two.

   ── EVERYTHING IS LAID OUT IN WORLD UNITS ────────────────────────────────
   One layer holds the composition at the layout's own coordinates and the
   whole layer is scaled once (`transform: scale(S)`), which is what lab.js
   does with the room. Three things follow, and all three are why it is done
   that way: a note's type is laid out at its real 30 px and then shrunk, so
   the LINE BREAKS in a mockup are the ones the page will have and do not
   move when the mockup changes size; a sticker's 6 px drop-shadow is 6 WORLD
   units, the same 6 the built page has, instead of 6 screen pixels that
   would swamp a 30-px thumbnail; and nothing else in the file multiplies a
   coordinate by anything, so there is exactly one place a scale can be wrong.

   S comes from spec.scale. With none given the layer is fitted to the
   container's own width, and with no width either it falls back to 360 px
   across, which is about the width three mockups take side by side on a
   laptop and is only ever reached by a caller that gave nothing.

   A CALLER MAY HAND A FIT SCALE AND NOTHING IN HERE CHANGES. `open` is the
   composition's own rectangle and its aspect is the composition's (press/
   CONTRACTS.md §13) — portrait on the poster recipe — so the Press Table
   hands min(stageW / open.w, stageH / open.h) and centres the result on the
   game's paper (press/press.css `.pt-stage`), rather than a width-fit that
   would run a tall composition off the bottom of a fixed box. S is used in
   FIVE places below and no others: the paper's own width and height
   (open.w × S by open.h × S), the dot grid's cell and its two offsets, and
   the world layer's transform. Everything else — a picture's box, a
   sticker's, the window a screenshot is cut to, a note's type — is in world
   units inside that one transform, so a smaller S moves nothing relative to
   anything: it is the same composition, further away.

   ── THE PICTURE IN A FRAME'S WINDOW ──────────────────────────────────────
   A screenshot in `frame-polaroid` or `frame-film` is TWO things on the
   built page — the sticker, and a `gz gz-pic gz-shot` prop over it cut to
   the part's own image-slot rect (CONTRACTS §8) — and it is two here, in the
   same order and by the same arithmetic. `shotGeom` below is
   build-game.js's `shotGeom` line for line: the rect's centre is turned about
   (64, 64) by the section's data-rot, the rect's own tilt and that rotation
   ADD, and the prop is cut to the axis-aligned box of the four turned
   corners. The rects come from the sheet's own `data-props.slots`, read here
   the way build-game.js's `sheetSlots` reads them off the disk, so the mockup
   and the page compose with one number and a re-drawn part cannot leave a
   stale copy in this file. `object-fit: cover` is
   `preserveAspectRatio="xMidYMid slice"`: a 16:9 shot in the polaroid's
   square window is cropped at the sides, never letterboxed.

   The frame is drawn first and the picture second because markup order is
   pile order and the part's image-slot layer is its last child — the same
   two sentences build-game.js's header makes.

   ── WHAT IT DOES NOT DO, ON PURPOSE ──────────────────────────────────────
   It does not MEASURE the type. build-game.js loads the page's own face as a
   FontFace and measures every candidate line, because the boxes it writes
   into a file have to be right; a mockup lets the browser wrap the same words
   at the same size in the same face, which is the same greedy break and costs
   nothing. Where the two disagree the mockup's note is a line taller or
   shorter than the layout's box; that is reported as a warning and not
   corrected, because correcting it here would be a second answer to a
   question build-game.js already answers.

   It draws the sign's chips as SPANS and not anchors. A mockup is a picture
   of a page; a live store link inside a 40-px-wide thumbnail is a trap, and
   the whole point of the row is to compare three of them.

   A sticker slot's `data-palette` (a per-section skin, CONTRACTS §7) is not
   painted: it would be a second extraction of forty drawings per distinct
   skin, and no recipe uses one. A slot that carries one is reported.

   ── THE NUMBERS, AND WHERE EACH CAME FROM ────────────────────────────────
   Every constant below is somebody else's, and says whose. The type and the
   chip are press/recipes.js's own NOTE and CHIP, read off window.Recipes when
   it is on the page so that what this DRAWS and what that file MEASURED its
   boxes with cannot drift apart — the same borrowing, and the same fallback
   copies, that build-game.js's `recipeNumbers` makes.
   ───────────────────────────────────────────────────────────────────────── */

window.Preview = (function () {
  'use strict';

  /* ── WHERE THE SHEET IS ──────────────────────────────────────────────────
     Resolved against THIS FILE's own URL and not against the page. The Press
     Table sits at press/, its harness at press/tools/, and a merged bench
     would be one folder up from both; the sheet is always
     ../features/stickers-core.dc.html from press/preview.js. (kits.js still
     asks for its own sheets relative to the document — the game page template
     lends fetch two folders for the length of one <script> tag and says in
     its own comment that document.currentScript is the fix it is waiting for.
     This is that fix, in the one file that could have it today.) */
  var SELF = (function () {
    var s = document.currentScript;
    if (s && s.src) return s.src;
    var all = document.getElementsByTagName('script');
    for (var i = all.length - 1; i >= 0; i--) if (/preview\.js(?:[?#]|$)/.test(all[i].src || '')) return all[i].src;
    return location.href;
  })();
  var SHEET = new URL('../features/stickers-core.dc.html', SELF).href;

  /* A sticker's drawing is 128 units square and is turned about its middle:
     CONTRACTS §8's box, and kits.js's placeLive, which rotates about
     (P.w / 2, P.h / 2). */
  var SK_BOX = 128, SK_MID = SK_BOX / 2;
  var ROT_MAX = 45;              // kits.js ROT_MAX: past a quarter turn a sticker is a different drawing
  var RAD = Math.PI / 180;

  /* lab.js's own floor for the paper's dot grid: 20 world units a cell, and
     the cell DOUBLES until it is at least 10 screen px (lab.js gridUnit 20,
     GRID_MIN 10, paintGrid). A mockup at 8 % would otherwise draw a dot every
     1.6 px, which is a tint and not a grid. */
  var GRID_UNIT = 20, GRID_MIN = 10;

  /* press/recipes.js's numbers, when it is on the page; these copies are
     build-game.js's copies of the same ones, for a caller that loaded
     preview.js without it. */
  var NOTE_0 = { body: 30, title: 75, tagline: 40, line: 1.32, padX: 16, padY: 12, gap: 16 };
  var CHIP_0 = { size: 30, line: 1.2, padX: 36, padY: 15, border: 4.5, gap: 19 };
  var LINKS_0 = { steam: 'Steam', itch: 'itch.io', site: 'Website', press: 'Press kit', trailer: 'Trailer' };
  var CHIP_TRACK = 0.18;         // lab.css .gz-poster b's letter-spacing — build-game.js CHIP_TRACK
  var CHIP_LIFT = 2;             // …and its box-shadow, 0 2px 0 — build-game.js CHIP_LIFT

  /* The width a mockup falls back to when the caller gave no scale AND the
     container has no width of its own to fit: three of them side by side on a
     laptop's Press Table. It is a floor under a caller that said nothing, not
     a design number. */
  var FIT_W = 360;

  function R() {
    var Rc = window.Recipes;
    return {
      NOTE: (Rc && Rc.NOTE) || NOTE_0,
      CHIP: (Rc && Rc.CHIP) || CHIP_0,
      LINKS: (Rc && Rc.LINKS) || LINKS_0,
      ORDER: Object.keys((Rc && Rc.LINKS) || LINKS_0),
      PARTS: (Rc && Rc.PARTS) || null,
      rank: (Rc && Rc.rankStickers) || null
    };
  }

  /* ── small arithmetic ─────────────────────────────────────────────────── */

  var num = function (v, d) { return Number.isFinite(+v) ? +v : d; };
  var r2 = function (v) { return Math.round(v * 100) / 100 + 0; };
  var px = function (v) { return (Math.round(v * 1000) / 1000) + 'px'; };
  function scaleOf(slot) { return Number.isFinite(+slot.scale) && +slot.scale > 0 ? +slot.scale : 1; }
  function rotOf(slot) {         // build-game.js's rotOf, verbatim: the page's ±45 and its two decimals
    if (slot.rot == null || !Number.isFinite(+slot.rot)) return 0;
    var r = +slot.rot;
    if (Math.abs(r) > ROT_MAX) r = r < 0 ? -ROT_MAX : ROT_MAX;
    return Math.round(r * 100) / 100;
  }

  /* ── THE PALETTE, BUILT THE WAY kits.js READS ONE ────────────────────────
     kits.js turns a role into a token by kebabing the whole role name and
     putting two dashes in front of it — skPrimary → --sk-primary, skStroke →
     --sk-stroke (kits.js tokenOf, CONTRACTS §6). The same line is written
     here, and THE ROLES ARE TAKEN OFF Kits.SHEETS.stickers.palette rather
     than listed again, so the two files cannot come to hold different lists.

     Every role is passed, even one the theme does not name, and that is
     deliberate: extractOnly resolves the sheet's defaults, then the PAGE's
     own --sk-* tokens, then the caller's (its own header says so), and the
     page under a mockup is the Press Table, whose tokens are none of a game's
     business. Passing all nine closes that door. skStroke and skRadius are
     numbers and are overwritten a moment later by the style pass out of
     lineWeight and corners (kits.js foldStyle); they are here so the shape of
     the object is the shape kits.js expects. */
  var kebab = function (s) { return s.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase(); };

  function paletteOf(theme) {
    var K = window.Kits;
    var defs = (K && K.SHEETS && K.SHEETS.stickers && K.SHEETS.stickers.palette) || {};
    var tok = (theme && theme.tokens) || {};
    var out = {};
    for (var role in defs) {
      if (!Object.prototype.hasOwnProperty.call(defs, role)) continue;
      var def = defs[role];
      var raw = tok['--' + kebab(role)];
      if (raw == null || String(raw).trim() === '') { out[role] = def; continue; }
      if (typeof def === 'number') { var n = parseFloat(raw); out[role] = isFinite(n) ? n : def; }
      else out[role] = String(raw).trim();
    }
    return out;
  }

  function haloWanted(theme, vec) {
    var tok = (theme && theme.tokens) || {};
    return String(tok['--sk-halo'] == null ? '' : tok['--sk-halo']).trim() === '1' || !!(vec && vec.finish === 'diecut');
  }

  /* canonical JSON: the keys sorted, so a key is a fact about the object and
     not about the order somebody typed it in */
  function canon(o, skip) {
    if (!o || typeof o !== 'object') return JSON.stringify(o === undefined ? null : o);
    var keys = Object.keys(o).filter(function (k) { return !(skip && skip[k]); }).sort();
    var out = [];
    for (var i = 0; i < keys.length; i++) out.push(JSON.stringify(keys[i]) + ':' + JSON.stringify(o[keys[i]]));
    return '{' + out.join(',') + '}';
  }

  var SKIP_IN_KEY = { motifs: 1, mood: 1 };   // the tray's sort, never the drawing — see THE CACHE

  function cacheKey(theme, vec) {
    return canon(paletteOf(theme)) + ' ' + (haloWanted(theme, vec) ? '1' : '0') + ' ' + canon(vec || {}, SKIP_IN_KEY);
  }

  /* ── THE EXTRACTION, CACHED ──────────────────────────────────────────── */

  var trays = Object.create(null);            // key → Promise<{part: {still, w, h, tags, text}}>

  function extractionFor(theme, vec) {
    var key = cacheKey(theme, vec);
    if (trays[key]) return trays[key];
    var K = window.Kits;
    if (!K || typeof K.extractOnly !== 'function') {
      return Promise.reject(new Error('preview.js needs kits.js on the page — window.Kits.extractOnly is not there'));
    }
    var p = K.extractOnly(SHEET, paletteOf(theme), vec || {}).then(function (map) {
      if (haloWanted(theme, vec)) showHalo(map);
      return map;
    });
    // a failed extraction is not kept: the sheet may be one restart away
    p.catch(function () { if (trays[key] === p) delete trays[key]; });
    trays[key] = p;
    return p;
  }

  /* kits.js's restyle step 8, applied to the serialised string instead of to
     the live node — see THE HALO. The layer is drawn on every part and hidden
     with `display:none` on the <g>; showing it is taking that one declaration
     off, and nothing else. */
  function showHalo(map) {
    for (var part in map) {
      if (!Object.prototype.hasOwnProperty.call(map, part)) continue;
      var rec = map[part];
      var root = parseSvg(rec.still);
      if (!root) continue;
      var g = root.querySelector(':scope > g[data-layer="halo"]');
      if (!g) continue;
      var v = (g.getAttribute('style') || '').replace(/(?:^|;)\s*display\s*:[^;]*/i, '').replace(/^\s*;\s*/, '');
      if (v.trim()) g.setAttribute('style', v); else g.removeAttribute('style');
      rec.still = new XMLSerializer().serializeToString(root);
    }
  }

  /* ── THE SHEET'S OWN IMAGE-SLOT RECTS ────────────────────────────────────
     build-game.js's sheetSlots, in a browser: the same data-props, the same
     four-finite-numbers check, and the same rule that a missing rect is a
     WARNING and not a refusal — that frame is simply drawn empty. Fetched
     once per page load and kept, because the answer cannot change while the
     page is open. */
  var slotsP = null;

  function sheetSlots() {
    if (slotsP) return slotsP;
    slotsP = fetch(SHEET).then(function (r) {
      if (!r.ok) throw new Error('stickers-core.dc.html ' + r.status);
      return r.text();
    }).then(function (txt) {
      var m = /\sdata-props="([^"]*)"/.exec(txt);
      if (!m) throw new Error('the sheet carries no data-props');
      var props = JSON.parse(m[1].replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&'));
      var raw = (props && props.part && props.part.slots) || null;
      if (!raw || typeof raw !== 'object') throw new Error('the sheet carries no `slots` — rebuild it with press/tools/build-sheet.js');
      var out = {};
      for (var part in raw) {
        if (!Object.prototype.hasOwnProperty.call(raw, part)) continue;
        var q = raw[part];
        var ok = q && ['x', 'y', 'w', 'h'].every(function (k) { return Number.isFinite(+q[k]); }) && +q.w > 0 && +q.h > 0;
        if (!ok) continue;
        out[part] = { x: +q.x, y: +q.y, w: +q.w, h: +q.h, rot: Number.isFinite(+q.rot) ? +q.rot : 0 };
      }
      return { slots: out, error: null };
    }).catch(function (e) {
      return { slots: {}, error: String((e && e.message) || e) };
    });
    return slotsP;
  }

  /* ── PARSING, SANITISING AND RE-SUFFIXING A DRAWING ─────────────────────
     See HOW A STICKER STRING IS PAINTED. Nothing here trusts the string. */

  var BAD_EL = {
    script: 1, foreignobject: 1, style: 1, iframe: 1, object: 1, embed: 1, audio: 1, video: 1,
    animate: 1, animatetransform: 1, animatemotion: 1, set: 1, handler: 1
  };

  function parseSvg(str) {
    var doc;
    try { doc = new DOMParser().parseFromString(String(str == null ? '' : str), 'image/svg+xml'); }
    catch (e) { return null; }
    if (!doc || !doc.documentElement) return null;
    if (doc.getElementsByTagName('parsererror').length) return null;
    if (doc.documentElement.localName !== 'svg') return null;
    return doc.documentElement;
  }

  function walk(el, fn) {
    fn(el);
    var kids = el.children;
    for (var i = kids.length - 1; i >= 0; i--) walk(kids[i], fn);
  }

  /* Pass one: drop what may not be here, rename every id. Pass two: rewrite
     every reference to a renamed id. Two passes, because a `url(#x)` may be
     written before the #x it names. */
  function sanitise(root, sfx) {
    var ids = Object.create(null), doomed = [], any = false;
    walk(root, function (el) {
      if (BAD_EL[el.localName.toLowerCase()]) { doomed.push(el); return; }
      var attrs = [].slice.call(el.attributes);
      for (var i = 0; i < attrs.length; i++) {
        var name = attrs[i].name, val = attrs[i].value, low = name.toLowerCase();
        if (low.indexOf('on') === 0) { el.removeAttribute(name); continue; }
        if (low === 'href' || low === 'xlink:href' || low === 'src') {
          if (val.charAt(0) !== '#') { el.removeAttribute(name); continue; }
        }
        if (/javascript\s*:/i.test(val)) { el.removeAttribute(name); continue; }
        if (low === 'style' && /url\(\s*(?!#)/i.test(val)) {
          el.setAttribute(name, val.replace(/url\(\s*(?!#)[^)]*\)/gi, 'none'));
        }
        if (low === 'id' && val) { ids[val] = val + sfx; any = true; el.setAttribute('id', val + sfx); }
      }
    });
    for (var d = 0; d < doomed.length; d++) if (doomed[d].parentNode) doomed[d].parentNode.removeChild(doomed[d]);
    if (any) {
      walk(root, function (el) {
        var attrs = [].slice.call(el.attributes);
        for (var i = 0; i < attrs.length; i++) {
          var name = attrs[i].name, val = attrs[i].value;
          if (name.toLowerCase() === 'id') continue;
          var next = val.replace(/url\(\s*#([^)\s"']+)\s*\)/g, function (m, id) {
            return ids[id] ? 'url(#' + ids[id] + ')' : m;
          });
          if (next.charAt(0) === '#' && ids[next.slice(1)]) next = '#' + ids[next.slice(1)];
          if (next !== val) el.setAttribute(name, next);
        }
      });
    }
    return root;
  }

  var UID = 0;

  function drawingOf(str, words) {
    var root = parseSvg(str);
    if (!root) return null;
    sanitise(root, '-pv' + (++UID));
    /* THE WORDS. Every <text> in the sheet is exactly `{{ skText }}` and
       nothing else (all eleven of them — press/tools/parts/*.html), so a text
       node IS the slot a section's data-text fills, and a word can be written
       straight into it. kits.js reaches the same place by re-extracting the
       part with skText in its palette; a mockup does not need forty drawings
       re-parsed to put one word on one sticker. */
    if (words != null && words !== '') {
      var ts = root.getElementsByTagName('text');
      for (var i = 0; i < ts.length; i++) {
        if (!String(ts[i].textContent || '').trim()) { ts[i].textContent = String(words); break; }
      }
    }
    return document.importNode(root, true);
  }

  /* ── THE TRAY ────────────────────────────────────────────────────────── */

  function order(map, vec) {
    var names = Object.keys(map), r = R();
    var motifs = vec && Array.isArray(vec.motifs) ? vec.motifs : null;
    if (motifs && motifs.length && r.rank) {
      var ranked = r.rank(map, { motifs: motifs, mood: vec.mood, count: 0 });
      var seen = Object.create(null), out = [];
      for (var i = 0; i < ranked.length; i++) if (map[ranked[i]] && !seen[ranked[i]]) { seen[ranked[i]] = 1; out.push(ranked[i]); }
      for (var j = 0; j < names.length; j++) if (!seen[names[j]]) out.push(names[j]);
      return out;
    }
    /* Appendix D's order. The sheet is built in it and extractOnly walks the
       sheet in document order, so the map's own keys are already Appendix D;
       Recipes.PARTS is that same list written down, and it is used when it is
       there so the order is STATED and not merely inherited. */
    if (r.PARTS) {
      return names.slice().sort(function (a, b) {
        var ia = r.PARTS.indexOf(a), ib = r.PARTS.indexOf(b);
        if (ia < 0) ia = r.PARTS.length + names.indexOf(a);
        if (ib < 0) ib = r.PARTS.length + names.indexOf(b);
        return ia - ib;
      });
    }
    return names;
  }

  function trayFor(theme, vec, count) {
    return extractionFor(theme, vec).then(function (map) {
      var names = order(map, vec);
      var n = Number.isFinite(+count) && +count > 0 ? Math.min(Math.floor(+count), names.length) : names.length;
      var out = [];
      for (var i = 0; i < n; i++) {
        var rec = map[names[i]];
        out.push({ part: names[i], still: rec.still, w: rec.w, h: rec.h });
      }
      return out;
    });
  }

  /* ── THE STYLESHEET: ONE PER CONTAINER, EVERY SELECTOR .pv- ───────────── */

  var CSS = [
    '.pv-paper{position:relative;overflow:hidden;background:var(--bench-bg,#efe7ed);color:var(--ink,#26212a);',
    'font-family:var(--body,ui-sans-serif,system-ui,sans-serif);line-height:1.32}',
    '.pv-grid{position:absolute;inset:0;pointer-events:none;',
    'background-image:radial-gradient(var(--bench-dot,rgba(38,33,42,.06)) 1px,transparent 1px)}',
    '.pv-world{position:absolute;left:0;top:0;transform-origin:0 0}',
    '.pv-slot{position:absolute;left:0;top:0}',
    '.pv-pic img{display:block;width:100%;height:100%;object-fit:fill;border:0}',
    '.pv-miss{border:2px dashed var(--mute-2,#c9bfd0);box-sizing:border-box;opacity:.55}',
    '.pv-sk{transform-origin:0 0}',
    '.pv-sk>svg{display:block;overflow:visible}',
    '.pv-shot{transform-origin:0 0}',
    '.pv-win{position:absolute;overflow:hidden}',
    '.pv-win img{display:block;width:100%;height:100%;object-fit:cover;border:0}',
    '.pv-note{box-sizing:border-box}',
    '.pv-blk{margin:0;overflow-wrap:break-word}',
    '.pv-title{font-weight:700;color:var(--ink,#26212a)}',
    '.pv-tag{font-weight:400;color:var(--mute,#8b7f92)}',
    '.pv-body{font-weight:400;color:var(--ink-2,#3c3542)}',
    '.pv-sign{display:flex;flex-wrap:wrap;align-items:flex-start}',
    '.pv-chip{display:inline-block;box-sizing:border-box;font-family:var(--mono,ui-monospace,monospace);',
    'font-weight:700;text-transform:uppercase;letter-spacing:', CHIP_TRACK, 'em;white-space:nowrap;',
    'border-radius:999px;border-style:solid;background:var(--card,#fffdfe);color:var(--ink-3,#4a4150);',
    'border-color:var(--ink-2,#3c3542)}'
  ].join('');

  /* ── THE COMPOSITION ─────────────────────────────────────────────────── */

  var RENDERS = new WeakMap();   // container → the token of the render that owns it

  function box(cls, x, y, w, h) {
    var el = document.createElement('div');
    el.className = 'pv-slot ' + cls;
    el.style.left = px(x); el.style.top = px(y);
    if (w != null) el.style.width = px(w);
    if (h != null) el.style.height = px(h);
    return el;
  }

  /* build-game.js's shotGeom, line for line — see THE PICTURE IN A FRAME'S
     WINDOW. Every number is in the part's own 128 units except x and y, which
     are world. */
  function shotGeom(slot, rect) {
    var s = scaleOf(slot), th = rotOf(slot);
    var c = Math.cos(th * RAD), sn = Math.sin(th * RAD);
    var dx = rect.x + rect.w / 2 - SK_MID, dy = rect.y + rect.h / 2 - SK_MID;
    var cx = SK_MID + dx * c - dy * sn, cy = SK_MID + dx * sn + dy * c;
    var a = (+rect.rot || 0) + th;
    var ca = Math.cos(a * RAD), sa = Math.sin(a * RAD);
    var hw = rect.w / 2, hh = rect.h / 2;
    var pts = [[-hw, -hh], [hw, -hh], [hw, hh], [-hw, hh]];
    var x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (var i = 0; i < 4; i++) {
      var qx = cx + pts[i][0] * ca - pts[i][1] * sa, qy = cy + pts[i][0] * sa + pts[i][1] * ca;
      if (qx < x0) x0 = qx; if (qx > x1) x1 = qx;
      if (qy < y0) y0 = qy; if (qy > y1) y1 = qy;
    }
    return {
      s: s, a: r2(a), cx: r2(cx), cy: r2(cy), bx: r2(x0), by: r2(y0), bw: r2(x1 - x0), bh: r2(y1 - y0),
      x: r2(num(slot.x, 0) + x0 * s), y: r2(num(slot.y, 0) + y0 * s)
    };
  }

  /* build-game.js's noteBlocks: a title note's text is the title, a newline
     and the tagline; anything else is body copy; a slot with no text of its
     own names manifest fields in `ref`. */
  function noteBlocks(slot, manifest) {
    var text = slot.text == null ? '' : String(slot.text);
    if (text.trim()) {
      var lines = text.split('\n').map(function (t) { return t.trim(); }).filter(Boolean);
      if (slot.ref === 'title') return lines.map(function (t, i) { return { role: i ? 'tagline' : 'title', text: t }; });
      return [{ role: 'body', text: lines.join(' ') }];
    }
    var out = [], fields = String(slot.ref || '').split(/[+,]/).map(function (t) { return t.trim(); }).filter(Boolean);
    for (var i = 0; i < fields.length; i++) {
      var f = fields[i], v = manifest[f];
      if (typeof v === 'string' && v.trim()) out.push({ role: f === 'title' ? 'title' : f === 'tagline' ? 'tagline' : 'body', text: v.trim() });
      else if (Array.isArray(v) && v.length) out.push({ role: 'body', text: v.join(' · ') });
    }
    return out;
  }

  function signLinks(manifest, LABELS, ORDER, warnings) {
    var links = (manifest && manifest.links) || {};
    var keys = Object.keys(links);
    var ordered = ORDER.filter(function (k) { return keys.indexOf(k) >= 0; })
      .concat(keys.filter(function (k) { return ORDER.indexOf(k) < 0; }));
    var out = [];
    for (var i = 0; i < ordered.length; i++) {
      var k = ordered[i], href = links[k];
      if (typeof href !== 'string' || !/^https:\/\//.test(href)) {
        warnings.push('sign: link "' + k + '" is not an https URL — left off');
        continue;
      }
      out.push(LABELS[k] || (k.charAt(0).toUpperCase() + k.slice(1)));
    }
    return out;
  }

  function bboxOf(slots) {
    var x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (var i = 0; i < slots.length; i++) {
      var s = slots[i];
      x0 = Math.min(x0, num(s.x, 0)); y0 = Math.min(y0, num(s.y, 0));
      x1 = Math.max(x1, num(s.x, 0) + num(s.w, 0)); y1 = Math.max(y1, num(s.y, 0) + num(s.h, 0));
    }
    if (!isFinite(x0)) return { x: 0, y: 0, w: 1, h: 1 };
    return { x: x0 - 120, y: y0 - 120, w: (x1 - x0) + 240, h: (y1 - y0) + 240 };   // Appendix E's 120 of margin
  }

  /* ── render ──────────────────────────────────────────────────────────── */

  function render(container, spec) {
    if (!container || container.nodeType !== 1) {
      return Promise.reject(new TypeError('Preview.render: the first argument is the element to draw into'));
    }
    spec = spec || {};
    var token = ++UID;
    RENDERS.set(container, token);
    var mine = function () { return RENDERS.get(container) === token; };

    var warnings = [];
    var layout = spec.layout || {};
    var slots = Array.isArray(layout.slots) ? layout.slots : [];
    var theme = spec.theme || {};
    var vec = spec.style || {};

    var open = layout.open;
    if (!open || !(num(open.w, 0) > 0) || !(num(open.h, 0) > 0)) {
      open = bboxOf(slots);
      warnings.push('the layout carries no usable `open` — the mockup is framed on the slots\' own bounding box instead');
    }
    open = { x: num(open.x, 0), y: num(open.y, 0), w: num(open.w, 1), h: num(open.h, 1) };

    var S = num(spec.scale, 0) > 0 ? +spec.scale : 0;
    if (!S) S = (container.clientWidth || FIT_W) / open.w;
    var width = Math.max(1, Math.round(open.w * S)), height = Math.max(1, Math.round(open.h * S));

    var needParts = Object.create(null), wantsSlots = false;
    for (var i = 0; i < slots.length; i++) {
      var s0 = slots[i];
      if (!s0 || s0.kind !== 'sticker') continue;
      if (s0.ref) needParts[s0.ref] = 1;
      if (s0.image) wantsSlots = true;
    }

    var given = Object.create(null), missing = [];
    var list = spec.stickers;
    if (Array.isArray(list)) {
      for (var g = 0; g < list.length; g++) if (list[g] && list[g].part) given[list[g].part] = list[g];
    } else if (list && typeof list === 'object') {
      for (var k2 in list) if (Object.prototype.hasOwnProperty.call(list, k2)) given[k2] = list[k2];
    }
    for (var want in needParts) if (!given[want] || !given[want].still) missing.push(want);

    /* spec.stickers is the tray the caller already has; anything it is short
       of is extracted here through the same cache, so a caller showing the
       owner twelve parts does not have to know which forty a recipe reaches
       for. A hit costs nothing. */
    var pStickers = missing.length ? extractionFor(theme, vec).then(function (map) {
      for (var m = 0; m < missing.length; m++) if (map[missing[m]]) given[missing[m]] = map[missing[m]];
      return given;
    }).catch(function (e) {
      warnings.push('the sticker sheet would not extract (' + String((e && e.message) || e) + ') — those slots are drawn as empty boxes');
      return given;
    }) : Promise.resolve(given);

    var pSlots = wantsSlots ? sheetSlots() : Promise.resolve({ slots: {}, error: null });

    return Promise.all([pStickers, pSlots]).then(function (both) {
      if (!mine()) {
        return { width: width, height: height, warnings: warnings.concat(['superseded by a later render on the same container']) };
      }
      if (both[1].error) warnings.push('the sheet\'s image-slot rects would not read (' + both[1].error + ') — every frame is drawn empty');
      paint(container, spec, {
        open: open, S: S, width: width, height: height, slots: slots, theme: theme, vec: vec,
        manifest: spec.manifest || {}, sk: both[0], rects: both[1].slots || {}, warnings: warnings
      });
      return { width: width, height: height, warnings: warnings };
    });
  }

  function paint(container, spec, C) {
    var warnings = C.warnings, r = R(), N = r.NOTE, CH = r.CHIP;

    /* THE TOKEN BLOCK, ON THE CONTAINER — see THE ONE RULE. Whatever custom
       properties an earlier render left inline are taken off first, so a
       theme with fewer tokens than the last one cannot inherit its leftovers;
       ONLY custom properties are touched, never a caller's own width, margin
       or position. */
    for (var i = container.style.length - 1; i >= 0; i--) {
      var prop = container.style[i];
      if (prop.slice(0, 2) === '--') container.style.removeProperty(prop);
    }
    var tok = (C.theme && C.theme.tokens) || {};
    for (var t in tok) {
      if (!Object.prototype.hasOwnProperty.call(tok, t)) continue;
      if (t.slice(0, 2) !== '--' || tok[t] == null) continue;
      container.style.setProperty(t, String(tok[t]));
    }
    var fonts = spec.fonts || (C.theme && C.theme.fonts) || null;
    if (fonts) {
      if (fonts.display) container.style.setProperty('--display', fonts.display);
      if (fonts.body) container.style.setProperty('--body', fonts.body);
      if (fonts.mono) container.style.setProperty('--mono', fonts.mono);
    }

    container.textContent = '';
    var style = document.createElement('style');
    style.textContent = CSS;
    container.appendChild(style);

    var paper = document.createElement('div');
    paper.className = 'pv-paper';
    paper.style.width = px(C.width);
    paper.style.height = px(C.height);
    container.appendChild(paper);

    // the dot grid, at lab.js's own floor (GRID_UNIT, GRID_MIN above)
    var cell = GRID_UNIT * C.S;
    for (var d = 0; d < 20 && cell < GRID_MIN; d++) cell *= 2;
    var grid = document.createElement('div');
    grid.className = 'pv-grid';
    grid.style.backgroundSize = px(cell) + ' ' + px(cell);
    grid.style.backgroundPosition = px((((-C.open.x * C.S) % cell) + cell) % cell) + ' ' +
      px((((-C.open.y * C.S) % cell) + cell) % cell);
    paper.appendChild(grid);

    var world = document.createElement('div');
    world.className = 'pv-world';
    world.style.transform = 'scale(' + C.S + ') translate(' + px(-C.open.x) + ',' + px(-C.open.y) + ')';
    paper.appendChild(world);

    var assets = Object.create(null);
    var alist = Array.isArray(spec.assets) ? spec.assets : [];
    for (var a = 0; a < alist.length; a++) if (alist[a] && alist[a].id) assets[alist[a].id] = alist[a];

    // markup order is pile order: the slots in z, ties in the layout's own order
    var ordered = C.slots.map(function (s, n) { return { s: s, n: n }; })
      .sort(function (p, q) { return (num(p.s.z, 0) - num(q.s.z, 0)) || (p.n - q.n); });

    var counts = { pic: 0, sticker: 0, shot: 0, note: 0, sign: 0, skipped: 0 };
    for (var o = 0; o < ordered.length; o++) {
      var slot = ordered[o].s, kind = slot && slot.kind;
      if (kind === 'pic') drawPic(world, slot, assets, warnings, counts);
      else if (kind === 'sticker') drawSticker(world, slot, C, assets, warnings, counts);
      else if (kind === 'note') drawNote(world, slot, C, N, warnings, counts);
      else if (kind === 'sign') drawSign(world, slot, C, CH, r.LINKS, r.ORDER, warnings, counts);
      else { counts.skipped++; warnings.push('slot ' + ordered[o].n + ': kind "' + String(kind) + '" is not one a mockup draws — skipped'); }
    }
    if (!counts.pic && !counts.sticker && !counts.note && !counts.sign) {
      warnings.push('nothing was drawn — the layout has no slot a mockup understands');
    }
  }

  function drawPic(world, slot, assets, warnings, counts) {
    var w = num(slot.w, 0), h = num(slot.h, 0), asset = assets[slot.ref];
    if (!asset || !asset.url) {
      warnings.push('slot "' + slot.ref + '": no asset with that id in spec.assets — an empty box stands in for it');
      world.appendChild(box('pv-pic pv-miss', num(slot.x, 0), num(slot.y, 0), w, h));
      counts.skipped++;
      return;
    }
    if (num(asset.w, 0) > 0) {
      var expect = +asset.w * scaleOf(slot);
      if (Math.abs(expect - w) > 1) {
        warnings.push('slot "' + slot.ref + '": the layout box is ' + r2(w) + ' wide and the asset at scale ' +
          scaleOf(slot) + ' is ' + r2(expect) + ' — the mockup draws the layout\'s box');
      }
    }
    var el = box('pv-pic', num(slot.x, 0), num(slot.y, 0), w, h);
    var img = document.createElement('img');
    img.alt = ''; img.decoding = 'async'; img.src = asset.url;
    el.appendChild(img);
    world.appendChild(el);
    counts.pic++;
  }

  function drawSticker(world, slot, C, assets, warnings, counts) {
    var rec = C.sk[slot.ref], k = scaleOf(slot), rot = rotOf(slot);
    if (slot.palette) {
      warnings.push('slot "' + slot.ref + '" carries its own data-palette — a mockup draws the page\'s skin, so that section will look different on the built page');
    }
    var draw = rec && rec.still ? drawingOf(rec.still, slot.text) : null;
    if (!draw) {
      warnings.push(rec && rec.still
        ? 'sticker "' + slot.ref + '" would not parse as SVG — an empty box stands in for it'
        : 'sticker "' + slot.ref + '" is not in the tray — an empty box stands in for it');
      world.appendChild(box('pv-miss', num(slot.x, 0), num(slot.y, 0), num(slot.w, SK_BOX * k), num(slot.h, SK_BOX * k)));
      counts.skipped++;
    } else {
      /* the sticker's own box, then the drawing scaled into it — the two
         steps the page takes (frames.js scales the .gz-art; kits.js turns the
         svg about P.w / 2, P.h / 2 inside it). The svg keeps its natural 128,
         so its 6 px drop-shadow stays the 6 WORLD units the page has. */
      var el = box('pv-sk', num(slot.x, 0), num(slot.y, 0), null, null);
      el.style.transform = 'scale(' + k + ')';
      var w = num(rec.w, SK_BOX), h = num(rec.h, SK_BOX);
      draw.style.setProperty('width', w + 'px');
      draw.style.setProperty('height', h + 'px');
      if (rot) {
        draw.style.setProperty('rotate', rot + 'deg');
        draw.style.setProperty('transform-origin', (w / 2) + 'px ' + (h / 2) + 'px');
      }
      el.appendChild(draw);
      world.appendChild(el);
      counts.sticker++;
    }
    if (!slot.image) return;

    // …and then the picture in its window, over it
    var asset = assets[slot.image], rect = C.rects[slot.ref];
    if (!asset || !asset.url) {
      warnings.push('slot "' + slot.ref + '": no asset "' + slot.image + '" for its image-slot — the frame is drawn empty');
      return;
    }
    if (!rect) {
      warnings.push('slot "' + slot.ref + '": that part has no image-slot on the sheet — "' + slot.image + '" is not drawn');
      return;
    }
    var q = shotGeom(slot, rect);
    var outer = box('pv-shot', q.x, q.y, null, null);
    outer.style.transform = 'scale(' + q.s + ')';
    var frame = document.createElement('div');
    frame.style.position = 'relative';
    frame.style.width = px(q.bw);
    frame.style.height = px(q.bh);
    var win = document.createElement('div');
    win.className = 'pv-win';
    win.style.left = px(q.cx - rect.w / 2 - q.bx);
    win.style.top = px(q.cy - rect.h / 2 - q.by);
    win.style.width = px(rect.w);
    win.style.height = px(rect.h);
    if (q.a) { win.style.rotate = q.a + 'deg'; win.style.transformOrigin = '50% 50%'; }
    var img = document.createElement('img');
    img.alt = ''; img.decoding = 'async'; img.src = asset.url;
    win.appendChild(img);
    frame.appendChild(win);
    outer.appendChild(frame);
    world.appendChild(outer);
    counts.shot++;
  }

  function drawNote(world, slot, C, N, warnings, counts) {
    var blocks = noteBlocks(slot, C.manifest);
    if (!blocks.length) {
      warnings.push('note "' + slot.ref + '" carries no words and names nothing the manifest has — skipped');
      counts.skipped++;
      return;
    }
    var size = num(slot.size, 0) > 0 ? +slot.size : N.body;
    var k = size / N.body;
    var width = num(slot.width, num(slot.w, 0)) || 0;
    var el = box('pv-note', num(slot.x, 0), num(slot.y, 0), width || null, null);
    el.style.padding = px(N.padY * k) + ' ' + px(N.padX * k);
    for (var i = 0; i < blocks.length; i++) {
      var b = blocks[i];
      var role = b.role === 'title' ? 'title' : b.role === 'tagline' ? 'tagline' : 'body';
      var p = document.createElement('div');
      p.className = 'pv-blk pv-' + (role === 'title' ? 'title' : role === 'tagline' ? 'tag' : 'body');
      p.style.fontSize = px(N[role] * k);
      p.style.lineHeight = String(N.line);
      if (i) p.style.marginTop = px(N.gap * k);
      p.textContent = b.text;
      el.appendChild(p);
    }
    world.appendChild(el);
    counts.note++;
    /* the box the layout measured against the box the browser wrapped to.
       build-game.js measures the face and this does not (WHAT IT DOES NOT DO,
       above), so a line either way is expected and worth saying once —
       offsetHeight inside a scaled ancestor is the UNSCALED layout height,
       which is world units, the same units the slot is in.

       NOT WHILE THE FACE IS STILL COMING. A webfont loads on demand, so the
       first paint of a mockup may be laid out in the fallback stack, which
       wraps to a different number of lines: warning about that would tell the
       owner about a font download and not about their layout. 12 %: a note is
       set at line-height 1.32, so one line either way on a six-line paragraph
       is 17 % and one line on a nine-line one is 11 % — the threshold sits
       just under the shortest paragraph a recipe writes, and catches the
       overflow that matters (a column that has outgrown the gap under it)
       without firing on a single line of drift. */
    var want = num(slot.h, 0);
    if (want > 0 && el.offsetHeight > want * 1.12 + 1 && faceReady(el)) {
      warnings.push('note "' + slot.ref + '" wrapped to ' + Math.round(el.offsetHeight) + ' units where the layout gave it ' +
        r2(want) + ' — the built page measures the face and may break it differently');
    }
  }

  /* Is the FIRST family of the element's stack actually here? document.fonts
     .check() over a whole stack always says yes, because the stack ends in a
     generic the browser always has; so the first family is pulled off and
     asked about on its own, and a stack that starts with a generic (or a
     browser with no font API) counts as ready. */
  var GENERIC = /^(serif|sans-serif|monospace|cursive|fantasy|system-ui|math|ui-[\w-]+)$/i;
  function faceReady(el) {
    try {
      if (!document.fonts || typeof document.fonts.check !== 'function') return true;
      var stack = getComputedStyle(el).fontFamily || '';
      var first = stack.split(',')[0].trim().replace(/^["']|["']$/g, '');
      if (!first || GENERIC.test(first)) return true;
      return document.fonts.check('400 16px "' + first.replace(/"/g, '') + '"');
    } catch (e) { return true; }
  }

  function drawSign(world, slot, C, CH, LABELS, ORDER, warnings, counts) {
    var words = signLinks(C.manifest, LABELS, ORDER, warnings);
    if (!words.length) { warnings.push('the sign has no https link to show — skipped'); counts.skipped++; return; }
    var size = num(slot.size, 0) > 0 ? +slot.size : CH.size;
    var k = size / CH.size;
    var el = box('pv-sign', num(slot.x, 0), num(slot.y, 0), num(slot.width, num(slot.w, 0)) || null, null);
    el.style.gap = px(CH.gap * k);
    for (var i = 0; i < words.length; i++) {
      var chip = document.createElement('span');
      chip.className = 'pv-chip';
      chip.style.fontSize = px(CH.size * k);
      chip.style.lineHeight = String(CH.line);
      /* THE BORDER IS INSIDE THE PADDING, and that is not a nicety. An SVG
         stroke straddles the edge it is drawn on, so build-game.js's chip is
         `measured text + 2 × padX` wide with the 4.5 border sitting half in
         and half out of that box; a CSS border is wholly outside the padding
         box and would make every chip 9 units wider. Three chips at 9 is 27,
         and neonrun's row of three measures 705 in a 720-wide sign: the
         mockup wrapped TRAILER onto a second line where the page does not
         (measured 2026-09-07). Taking the border out of the padding puts the
         outer edge exactly where the page's rect is. */
      chip.style.padding = px((CH.padY - CH.border) * k) + ' ' + px((CH.padX - CH.border) * k);
      chip.style.borderWidth = px(CH.border * k);
      chip.style.boxShadow = '0 ' + px(CHIP_LIFT * k) + ' 0 var(--ink-2,#3c3542)';
      chip.textContent = words[i];
      el.appendChild(chip);
    }
    world.appendChild(el);
    counts.sign++;
  }

  return Object.freeze({ render: render, trayFor: trayFor });
})();
