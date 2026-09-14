/* ─── THE STICKER KITS ─────────────────────────────────────────────────────
   The artwork the sticker drawer holds on this bench, and every drawing the
   wall it opens on is made of: 518 stickers in 18 kits, all out of ONE
   Design Canvas sheet, Downloads/assets/toem2-level-piece-kit.html ("TOEM 2 ·
   Phase 3 · Piece kit — Level blockouts, taken apart"). None of the iron
   hive's kits came across; this drawer was emptied first.

     · THE TEN BATCHES of the TOEM 2 sticker kit, filed as the sheet files
       them — Terrain, Flora, Structures, Props, Vehicles, Figures, Sky &
       Weather, Effects & Marks, Signs & Symbols, Backdrops: 202 stickers,
       their tm-* ids, names and drawings the sheet's own. Each keeps the
       sheet's w × h, which matters for the CONNECTORS (strips, floors,
       fences, walls, hill lines) and the backdrop washes: their ink runs
       past the box on purpose — the overlap that hides the seam when two are
       butted — so a pocket shows them cut to the module, as the sheet does.
       The few drawings that are not connectors and lost a flame, a trunk or
       a foot to the pocket had their boxes grown to their ink (a translate
       round the drawing) — free, since nothing had been stamped from them.
       The archway's and the chimney's long side dashes were left outside.

     · ONE KIT PER PLATE, "01 Town Square" … "08 Clocktower Rooftops": every
       distinct piece the sheet's eight level plates are built from, ids
       tm-pNN-<piece>. A slab, patch, wall, roof, stair, doorway or route line
       is the sheet's own engine's markup (tm-iso.js, in plate px) cropped to
       its ink. A sticker standing on a plate is filed AS THE PLATE STANDS
       IT — the engine's shadow ellipse under it and its fade baked in, since
       the wall's own fade has three steps and the plates use nine — once per
       sticker, shadow and fade, its box symmetric about the drawing's middle
       so that the wall's mirror (fx) is exactly the engine's flip.

   GENERATED, NOT HAND-WRITTEN (2026-09-12). The sheet is a bundle — a
   gzipped-base64 __bundler/manifest of JS resources that define
   window.TM_BATCH01..10, TM_ISO and TM_LEVELS — which was decoded and run in
   real Chrome, every piece measured by RASTERISING (Chrome ignores getBBox's
   stroke option), and the same pass wrote wall-seed.json, the eight plates
   laid out as stamps of these pieces (see the head of seed.js). The sheet in
   Downloads is the source of truth if this is ever redone, and
   probe-plates.js rasterises each plate off the wall against that sheet's own
   engine.

   A SHEET THAT ASKS FOR A SCRIPT TAG OF ITS OWN goes into sticker-kits.json
   instead, as on the iron hive: Stickers.load REPLACES the catalogue
   (STICKERS.md §1), so a second caller empties the drawer.

   IT IS NOT SHIPPED HERE. The markup is ~520 KB and the file ~620 KB, far
   past the weight STICKERS.md §2 says to stop loading at boot, so this
   file holds none of it: the drawings live in sticker-kits.json beside it and
   are fetched once, then handed to Stickers.load — which is designed for
   exactly this, and repaints the drawer and the wall on the way out. The
   bench's own boot never waits on them.

   FETCHED AT THE FIRST OF TWO MOMENTS, because there are two ways the art can
   be wanted and only one of them is a click:

     · the STICKER tool being picked up — the drawer is about to be looked at,
       so the fetch cannot wait for an idle that a busy page may not reach;
     · the page having loaded and gone idle — the paper may already be covered
       in stamps from a previous visit, and a stamp holds the sticker's id and
       none of its drawing (STICKERS.md §5). Until the catalogue lands those
       stamps paint NOTHING, silently. Idle is what fills them back in for
       somebody who reloads and never opens the drawer.

   Whichever comes first wins; the other finds the fetch already asked for and
   does nothing. A fetch that fails un-asks itself, so the next pick-up of the
   tool tries again rather than leaving a permanently empty drawer.

   The catalogue is MEMORY, NOT STORAGE — nothing here is written to
   localStorage, and this file runs on every page load. See STICKERS.md §1. */

(function () {
  'use strict';

  if (!window.Stickers) return;          // the drawer did not load; nothing to fill

  var SRC = 'sticker-kits.json';
  var asked = false;

  function fill() {
    if (asked) return;
    asked = true;
    fetch(SRC)
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        if (data && data.stickers) Stickers.load(data);
        else asked = false;
      })
      .catch(function () { asked = false; });   // let the next pick-up have another go
  }

  /* THE TOOL BEING PICKED UP. wall.js calls Stickers.tool(true) the moment
     STICKER goes down on the dock (wall.js: Stickers.tool(t === 'sticker')),
     so wrapping the property catches it without stickers.js knowing. The
     original is called either way and its return value passed straight back —
     this is a doorbell on the door, not a new door. */
  var tool = Stickers.tool;
  if (typeof tool === 'function') {
    Stickers.tool = function (up) {
      if (up) fill();
      return tool.apply(this, arguments);
    };
  }

  /* OR THE PAGE GOING IDLE, the way cursors.js fetches its bundle: after
     load, and then only when there is nothing better to do — with a timeout,
     so a bench that never goes idle still fills its drawer. */
  function idle() {
    if (typeof requestIdleCallback === 'function') requestIdleCallback(fill, { timeout: 4000 });
    else setTimeout(fill, 1200);
  }
  if (document.readyState === 'complete') idle();
  else window.addEventListener('load', idle, { once: true });
})();
