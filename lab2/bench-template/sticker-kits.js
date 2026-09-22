/* ─── THE STICKER KITS ─────────────────────────────────────────────────────
   The artwork this bench's sticker drawer holds, fetched from
   sticker-kits.json beside this file — which on a bench made from
   lab2/bench-template is EMPTY: {"kits": [], "stickers": []}.

   FILING A KIT means merging its kits and stickers INTO sticker-kits.json.
   Never ship a kit as a script of its own calling Stickers.load: load
   REPLACES the catalogue (lab2/STICKERS.md §1), so whichever call ran second
   would empty the drawer. How an asset sheet should be made so that filing it
   is a copy of data rather than a rendering job: lab2/ASSET-KITS.md.

   IT IS NOT SHIPPED IN THE PAGE. The drawings can run to hundreds of KB, so
   this file holds none of them: they are fetched once and handed to
   Stickers.load, which repaints the drawer and the wall on the way out. The
   bench's own boot never waits on them.

   FETCHED AT THE FIRST OF TWO MOMENTS, because there are two ways the art can
   be wanted and only one of them is a click:

     · the STICKER tool being picked up — the drawer is about to be looked at,
       so the fetch cannot wait for an idle that a busy page may not reach;
     · the page having loaded and gone idle — the paper may already be covered
       in stamps from a previous visit, and a stamp holds the sticker's id and
       none of its drawing (STICKERS.md §5). Until the catalogue lands those
       stamps paint NOTHING, silently.

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
