# lab 2 — adding things so they stay fast

Everything on the bench is one of four kinds of thing, and each kind costs a
different amount per frame. Decide which kind a new asset is BEFORE exporting
it, because the cost is set by the kind, not by the drawing. The measurements
behind every rule here are in `about.md` §9 and `perf/results/`.

| kind | what it is | cost per frame while warm | file it lives in |
|---|---|---|---|
| **kit part** | a drawing: `<svg>` + CSS animation, no inputs, no script | nothing (a sprite on a tile), or one compositor layer when near | one of the kit sheets — `forest`, `village`, `gnome` — or a new sheet listed in `kits.js` |
| **prop** | a small drawing that is drawn straight in `index.html` (the sign, the pond, the campfire) | nothing | `index.html`, as a `.gz-art` section |
| **machine** | a document: React layout, inputs, timers, a canvas, typing | ~0.5 ms every frame it is warm and drawn — so it is drawn only when it is worth it | its own `features/<name>.dc.html`, with a poster |
| **wall ink** | a stroke, a stamp, a note, a filed tracing | nothing (one `<svg>` in world units) | `wall.js` / the tracing table |

The rule of thumb: **if it has no button, it is not a machine.** A tree, a
lamp post, a signpost, a gnome, a cloud, a house — all kit parts. If you find
yourself exporting a document for something that only sways, stop and put it
on a sheet.

---

## 1 · Adding a kit part (a tree, a creature, a village piece)

1. **Draw it on the sheet, not as its own document.** Open the kit's `.dc.html`
   in Design Canvas (`features/forest.dc.html`, `village.dc.html`,
   `gnome.dc.html`) and add the part the way the others are: one
   `<sc-if value="{{ isYourPart }}">` block wrapping exactly ONE `<svg>`, a
   flag in `renderVals()`, and the part's name in the `options` list of the
   `data-props` JSON. The sheets' own header comments say why it is one file
   per kit and `#part=` in the URL.
2. **Keep it an svg and nothing else.** Elements allowed: `path circle rect
   ellipse line g text`. No `<foreignObject>`, no `<image>`, no `<script>`,
   no inputs. `<text>` is allowed but the part will always be live (an svg
   image cannot use the page's webfont), so keep text to a signpost, not a
   forest.
3. **Animate the root, not the insides, if you can.** A `sway`/`bob` on the
   root `<svg>` is the compositor's and free. An animation on a `<g>` inside
   is a main-thread frame for as long as that part is live at the *full*
   grade — kits.js allows four of those on screen at once, so a leaf or a
   waving arm is fine, but do not build a part whose whole character is
   inner motion and expect it everywhere. Never `<animate>`/SMIL.
4. **The shadow goes on the root as a CSS filter** (`filter: drop-shadow(6px
   7px 0 rgba(0,0,0,.3))`), as every forest and gnome part has it. kits.js
   bakes it into the sprite and keeps it on the live svg. (The village sheet
   uses an SVG `<filter id="ds">` instead; that works too, but the shadow is
   then clipped at the svg box, as it always was.)
5. **Keep the ink inside the svg box** (`width`/`height`), or know that
   whatever pokes out is measured: kits.js reads the alpha of the raster and
   lets the box out to cover it, the way frames.js used to. A `?` floating
   above a head makes a taller box.
6. **Put it on the paper** as a section, exactly like the others in
   `index.html` (§8 of `about.md` has the five lines): `data-src` naming the
   sheet and the part, `data-home-x/y`, an inline width/height. Leave
   `data-w`/`data-h` at whatever the sheet composed at; kits.js corrects them
   at boot. **No iframe is needed** — kits.js strips one if present, so the
   old five-line shape still works; the copies block still writes that shape.
7. **Sizes.** kits.js has a table (`NAT`) of the boxes the old frames measured,
   so nothing that stood on the paper moved. A NEW part is not in it: its box
   comes from its raster (svg box + shadow spill + anything that pokes out),
   which is the same answer to the pixel for a drawing that fills its box.
   Add it to the table only if you need a different box for a reason.
8. **Check it:** open the bench, zoom to 100% over it (live: it sways), zoom
   to 30% (a sprite on a tile: `Kits.stats()` in the console), hold ctrl over
   it (the silhouette rim), drag it, ctrl+c/ctrl+v it. `node lab2/perf/verify.js`
   runs those for the forest; `node lab2/perf/kitgeo.js after` records where
   every part sits.

## 2 · Adding a new kit (a fourth sheet)

Three lines in `kits.js` → `SHEETS`: the file, the prop the sheet picks its
part by (`part` or `who`), the shadow spill (`{r:6,b:7}` for a root
drop-shadow of 6,7; `{r:0,b:0}` for an SVG filter), the palette the sheet's
`renderVals()` fills in, and where a carried part pivots. Add the sheet's
regex to `SRC_RE`. If the sheet has a shared `<defs>` (the village's `#pine`
and `#ds`), put it in a 0×0 `<svg data-defs>` as the first child of the
screen and kits.js copies it into every part. Then every section whose
`data-src` names the sheet is a kit part.

## 3 · Adding a machine (a document with buttons)

1. Export it from Design Canvas and swap the head for the bench's — §8 of
   `about.md`, unchanged. Use `../fonts/fonts.css` in place of the Google
   `<link>` (every other feature does) so it never waits on the network; if
   it needs a face that is not in `fonts/`, add the woff2 there and a
   `@font-face` to `fonts.css` rather than linking Google.
   **`node lab2/perf/swap-machine.js "<export.html>" <name>` does this step
   and the next one** and stops with a message if the export is not the shape
   it expects; it also says whether the bundled runtime is still the bench's
   `support.js` and whether every face the export asks for is in `fonts/`.
2. **Mark the export's own furniture** so `bare.css` can take it off —
   marked in the file, never found by shape, and no declaration changed (the
   note saying so goes at the top of the helmet `<style>`, as in every
   machine):
   - the paper grain, the full-bleed noise overlay: `data-lab-nopaper`;
   - **the sheet inside the sheet.** Exports since 2026-09-04 leave the
     screen root as a bare box and wrap the drawing in a SECOND full-viewport
     cream div — the one carrying the export's `zoom:` — beside a zoom
     widget pinned to the corner. `frames.js` measures every element that
     is not a sheet, so unmarked that div reports the drawing as the size of
     its viewport and paints a cream rectangle round the machine.
     `data-lab-sheet` on it makes it a sheet: stepped through, transparent,
     its zoom pinned at 1;
   - the zoom widget, the `position: fixed` box of + / − / RESET:
     `data-lab-nozoom`. The bench has its own camera; a zoom inside a frame
     scales the drawing under a measurement that never re-runs.

   Leave the `zoomUI` prop and the ctrl+= / ctrl+− handler exactly as
   exported: with the zoom pinned by CSS they are inert here, and the file
   still works opened on its own. `bare.css`, NO SECOND SHEET, is the
   argument.
3. Put its section in `index.html` with the five lines and an `<iframe>`.
   A machine being REPLACED keeps its section as it is — same id, same
   `data-src`, same home and cut — so it stands where it stood, at the size
   it was cut to; only the poster changes.
4. **Build its poster:** `node lab2/perf/posters.js` with `serve.js` up. The
   script pictures every machine on the paper and writes `posters/index.json`.
   Without a poster the machine boots the old way (the moment it is within
   400px) and costs its half-millisecond wherever it is warm — the poster is
   what lets it be a picture at 20%.
5. **Rebuild the posters whenever a machine's drawing changes**, or the bench
   shows the old face until the document boots.
6. Keep its idle cost down inside the document: no `requestAnimationFrame`
   loop that runs with nothing to draw, no timer faster than it needs.
   `prelude.js` freezes timers while the panel is off screen, and the crowd
   rule pauses inner animations, but a paused animation is NOT free (§9) —
   prefer animating the root of a thing, or a transform on an element that
   gets its own layer.

## 4 · Adding a prop (drawn straight in the page)

A drawing that is one of a kind and never needs its own document — the sign,
the connective pieces — is a section with a `.gz-art` child holding inline
svg and NO `data-src`. It is painted by the page, costs nothing per frame,
and gets the corner, the readout and ctrl-pick for free. The seven
`gz-conn-*` sections in `index.html` are the pattern. Use this for a few
things; for a family of things, make a kit.

## 5 · Things that keep the floor

- **No new documents at 20%.** Whatever you add, the bench zoomed out should
  still count four documents (`Frames.panels.filter(p => p.loading).length`).
  If your addition raises that, it needs a poster or it should be a kit part.
  **The two exceptions are marked `data-live`** on their section in
  `index.html` — the scroll (its wizard swings from the roller) and the
  builder gnome (he hammers under his bubble): a machine so marked is never a
  poster and boots the moment it is within reach; a kit part so marked is
  drawn in full whenever it is near the screen, whatever its size. That is
  one warm document and one inner animation the bench opens on, on purpose.
  Do not add a third without measuring (`perf/measure.js`); the word is
  there so the choice is visible on the tag, not buried in a script.
- **No per-frame work on the main thread while the camera is still.** If
  `node lab2/perf/measure.js <label>` shows an idle median above the display
  floor after your change, something animates on the main thread: an inner
  `<g>` animation on a live part, a script loop in a document, a CSS
  animation on a non-composited property.
- **Never a `filter` or `mix-blend-mode` on a section or on `#bench-world`.**
- **Measure, do not guess.** `perf/measure.js` (frame times per zoom),
  `perf/probe-anim.js` and `perf/probe-live.js` (what a live thing costs),
  `perf/kitgeo.js` (where everything sits). Compare against
  `perf/results/baseline` and `perf/results/after3`.
- **Serve it** (`node serve.js`), never `file://`: kits.js fetches the sheets
  and frames.js reaches into the frames; neither works off the disk.
- **A new file at lab2's ROOT needs a line in `../vercel.json`.** The deployed
  site serves this bench at `/`, by rewrite rather than redirect: the URL bar
  says `knoll.space/` while the files still live under `/lab2/`, so the page
  asks for `/lab.css` and a rewrite points it at `/lab2/lab.css`. The four
  folders are covered by wildcards (`features`, `fonts`, `posters`, `vendor`)
  and need nothing; every top-level `.js` and `.css` is listed by name. Add a
  `whatsit.js` beside `lab.js` and it is a 404 in production until it is
  listed too — locally, at `/lab2/`, it will work fine and hide the mistake.
  A wildcard would spare the list, but only by making every unknown path on
  the whole site fall through to this bench.
