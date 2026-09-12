/* ─── THE STICKER KITS ─────────────────────────────────────────────────────
   The artwork the sticker drawer holds on this bench: 305 stickers in 37
   kits, baked out of the eight Design Canvas sheets in Downloads/assets —
   Pipeworks, Chainworks, Ironworks, Ruinworks, the Iron Hive kit IH-0004
   (Deadfall, Canopy and Crows, Twisted Timber), the Ruinworks Billboard
   Kit, whose eight bb-* kits kitbash an abandoned billboard out of faces,
   frames, legs, catwalks, lamp arms, footings, debris and toppers on a 120u
   bay module — so its pieces are meant to be butted edge to edge, not
   scattered — IH-0005, the Iron Globe: one sticker, ih-web-globe, a
   riveted meridian globe on a yoke and foot plate, drawn as a website link
   mark and filed, as its sheet asks, under a kit of its own, ih-social (the
   sheet gives that kit an id and no name; SOCIAL MARKS is ours, so the chip
   reads as a kit and a search for "social" finds it) — and Rockworks, the
   ground cover: sixteen pieces of cold granite in three rk-* kits — scree
   and chips, boulders, slabs and outcrops — cut to be strewn over bare
   ground rather than butted.

   THE GLOBE'S SHEET SAYS TO SHIP IT IN A social-marks.js OF ITS OWN — one
   more Stickers.load call, and a script tag after stickers.js. On this bench
   that empties the drawer: load REPLACES the catalogue (STICKERS.md §1), so
   whichever call ran second would wipe the other, and the fetch below always
   runs second. It was merged into sticker-kits.json instead, appended last,
   the way the billboard kit went in.

   ITS viewBox WAS GROWN ON THE WAY IN, 124×153 → 128×157 (the sheet's
   translate(-14.8 -13) is translate(-11 -9) here). The sheet trimmed to the
   GEOMETRY, and the meridian ring is a 14-wide stroke, which hung 4u off the
   top of that box and 3.8u off the left — a pocket clips that flat. Free to
   change, since nothing had been stamped from it yet (§5). Measured by
   rasterising the drawing, not with getBBox({stroke:true}), which Chrome
   ignores: it hands back the geometry box. probe-globe.js shows both.

   ROCKWORKS' SHEET ASKS FOR A FILE OF ITS OWN TOO — sticker-kits/rockworks.js,
   one more Stickers.load — and went into sticker-kits.json instead, for the
   same reason, appended after the globe. Two things about it differ from the
   sheets before it:

     · ITS KITS ARE FILED WITH THE SHEET'S NAME IN FRONT — "Rockworks
       Boulders" where the sheet says "Boulders" — because the search matches
       a kit's name (STICKERS.md §6): bare, a search for "rockworks" found
       nothing, and one for "rock" found only the sprockets. The ids are the
       sheet's, untouched. The billboard kit went in the same way.
     · NOTHING WAS GROWN. Its viewBoxes really are trimmed to the INK, strokes
       and all: rasterised, every one of the sixteen keeps at least 1.6u of
       its box clear on every side. probe-rockworks.js holds it to that, and
       proves the measure can catch a box that does clip.

   IT IS NOT SHIPPED HERE. The markup is ~830 KB and the file ~910 KB, nearly
   three times the weight STICKERS.md §2 says to stop loading at boot, so this
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
