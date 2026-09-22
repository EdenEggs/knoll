# NOTES — discovery, and where the codebase disagreed with the plan

Phase 0 of `../../PRESS-TABLE-PLAN.md`. Written 2026-09-07 from reading the
files, not from the plan's guesses. When this file and the plan disagree,
this file is what was true in the code.

## A · The one decision the plan did not make: where this is built

The owner asked for the system in `lab2/test/`. So `test/` is **a sandbox
copy of the bench** — the runtime files copied in, the plan's changes made
to the copies, the new files beside them — and the live `index.html`,
`kits.js`, `keep.js`, `lab.js`, `tracer.js`, `site/serve.js` and
`site/vercel.json` are not touched. `MERGE.md` (folder root) lists what moves
where. `CONTRACTS.md` §0 has the prefix rule that makes every page work in
both places.

## B · The plan's five questions (§16), answered with the defaults

1. `site/` is the Vercel project root (`vercel.json` is there, `api/` is not
   yet). The sandbox keeps its functions in `test/api/`; merged they go to
   `site/api/`. Not verified against the Vercel dashboard — the deploy is the
   owner's.
2. No Steam importer in v1.
3. No trailer machine in v1; the sign prop carries a "watch the trailer" link.
4. `data-rot` IS IN — attempted in Phase 4 and KEPT, so the default was not
   taken. Live it is the CSS `rotate` property (not a transform, which the
   sheet's sway and lab.css's jiggle both write, and not a wrapping `<g>`,
   which would clip at the viewBox); the sprite turns the bitmap about the
   drawing's own centre, and `Kits.inkAt` turns the pointer back by −rot
   before it reads the mask. `ROT_MAX` is 45. CHANGELOG, Phase 4.
5. No intake notifications; the owner lists intakes with the secret.

## C · The five Phase-0 answers

### C.1 The door (`site/serve.js`), exactly

- `GET /_lab2/default` → `200 {"ok":true,"door":true}`. `keep.js` knocks once
  at boot; a non-200 means "no door" and it goes quiet for good.
- `POST /_lab2/default`, body `{"gizmos":[…]}`, one entry per section:
  `{gizmo, x, y, w, h, cut:bool, z, gone:bool, copy:bool, src, dataW, dataH, scale, label}`
  (`w`/`h` only matter when `cut`; `src`/`dataW`/`dataH`/`scale`/`label` only
  when `copy`). Body cap 4 MB (the socket is destroyed past it).
- Response `{ok:true, wrote:bool, promoted:[gizmo…], missing:[gizmo…]}` or
  `{ok:false, error}` with 400. `promoted` = copies it appended (the client
  drops them from `Lab.copies`); `missing` = names in the file it could not
  find and that were not copies.
- **Guards it keeps, in order:** finds a tag by scanning for
  `data-gizmo="<id>"` back to its `<section` and forward to the real `>`
  (quote-aware, never a regex over the file); edits `data-home-x`,
  `data-home-y`, `data-cut` + `style`, `data-home-z`, `data-gone` **in place**
  (a new attribute goes in before ` style="`); drops `data-cut`/`data-gone`
  only when the client says so and **counts every byte dropped**; appends
  copies inside the `▼ … ▲ copies written down by keep.js` markers (creating
  the block before `  </div><!-- /bench-world -->` if absent); refuses the
  write if the result is shorter than `before − dropped − 64` or has fewer
  `<section class="gz` than before; writes `index.html.keep-bak` once per
  server run before the first write; writes through `index.html.tmp` and
  `renameSync`; never removes a section.
- A copy is written as the five-line section; `KIT_SRC`
  (`forest|village|gnome`) decides `.gz-art` vs `iframe + poster + shield`.
  **The sandbox's `serve.js` adds `stickers-core` to that regex** and writes
  `data-palette`, `data-text`, `data-rot` the way it writes `data-cut`.

### C.2 `vercel.json` — the lines a merge needs (not applied; see MERGE.md)

Rewrites (beside `/features/:path*`): `/press/:path*` → `/lab2/press/$1`
form (`:path*` on both sides), `/games/:path*` → `/lab2/games/:path*`.
Headers: `/lab2/press/(.*)` and `/press/(.*)` get the 300 s rule the js/css
get; `/lab2/games/(.*)/art/(.*)` and `/games/(.*)/art/(.*)` get the 3600 s
rule the posters get; **nothing** for `/games/(.*)/index.html`. Functions:
`api/vibe.js`, `api/intake.js` need no `vercel.json` entry (file-system
routing) but do need `site/` to be the project root.

### C.3 How `frames.js` sizes a `.gz-art`

`adopt(el)`: a section with no `data-src` (or with `data-kit`) is an art
panel: `p.art = el.querySelector('.gz-art')`. Its natural size is
`natural(p)` = `(p.natW || data-w) × (p.natH || data-h)` × `data-scale`, and
`cut(p, w, h)` sets the box to that unless a saved size (`knoll-lab2:size2:`)
or `data-cut` stands. `place(p)` then fits the art into the box:
`art.style.width/height = ink; transform = translate(centre) scale(min(w/ink.w, h/ink.h))`,
reading `el.offsetWidth/Height` (a layout read — once per place). So a
`gz-pic` is a prop whose `data-w`/`data-h` are the image's pixel size and
whose `data-scale` is the recipe's scale; nothing in `frames.js` needs to
change for it. **This was verified by reading, and Phase 5 verified it by
measuring:** `frames.js` is unchanged, and `perf/verify-game.js` check 3
measures every picture on all three built pages to its own shape.

### C.4 How `kits.js` decides sprite vs live

`relive()` on `lab:still`, `lab:zoom`, resize: every record is a sprite on a
tile unless (a) it is held (`dragging sizing picked ink-hit menued ping`),
stands over a non-kit section it out-ranks (`must`), or its part has
`<text>` → `still`; (b) the zoom is past `ZOOM_NO_TILES` 1.25 and it is
within `DROP_MARGIN` 400 px → `still`; (c) it is on screen (±`LIVE_MARGIN`
200 px) drawn ≥ `SWAY_PX` 180 px tall → the nearest `SWAY_MAX` 20 are `sway`,
and of those the nearest `FULL_MAX` 4 on screen at ≥ `FULL_PX` 300 px are
`full`; (d) `data-live` → `full` whenever near. Sprites are rasterised per
`kit/part@scale` (scale = zoom × dpr × the box's fit, rounded to 1/64) from
the part's `raster` string through an `<img>` and drawn onto 1024-px tiles.
The palette is filled **once per sheet load** in `extract()` (`conv()`
replaces `{{ name }}` from `SHEETS[kit].palette`), and `still`/`sway`/`full`
/`raster` are four serialised strings per part. The plan's per-page palette,
per-section variants and style pass all hang off `extract()`.

### C.5 Where `lab.js` reads the opening rectangle

`lab.js` "WHERE IT OPENS" (~line 1522): behind `if (!restored)`, two literal
rectangles — `WIDE {x:568, y:-2190, w:3200, h:1390}` and `NARROW {x:1390,
y:-2190, w:1250, h:1390}` — chosen by `box().width < 700`; zoom = fit with a
24 px (16 px phone) pad, clamped to `[ZMIN, 1]`. The sandbox's `lab.js` reads
`data-open="x,y,w,h"` (and `data-open-narrow`) off `#bench-world` first and
falls back to those two literals, so the main bench is unchanged.

## D · Where the codebase disagrees with the plan

1. **The tracer's k-means is not deterministic.** `kMeansPalette()` seeds
   with `Math.random()` twice per centroid. The plan wants it "moved
   verbatim" *and* a golden trace diff *and* byte-identical themes.
   Resolution (CONTRACTS §1): `Palette.quantize` takes `opts.rng`, default
   `Math.random` (the tracer passes nothing — unchanged), and the press passes
   a seeded mulberry32. The golden test stubs `Math.random` in the page with
   the same seeded generator for both the old and the new tracer.
2. **The opening aspect in Appendix E is stale.** The plan says the main
   bench's opening rectangle is 1848 × 1928; `lab.js` has framed
   3200 × 1390 (wide) / 1250 × 1390 (narrow) since 2026-09-04 (the
   `index.html` comment still says the old numbers — that comment is in the
   live file and is left alone). **Recipes DID use the wide aspect, 3200:1390,
   and stopped on 2026-09-07** (Phase 5, third pass): `openOf()` padded every
   composition out to 2.302 : 1, which can only LOWER the zoom a page lands
   at, and it cost the poster a fifth of its type. `layout.open` is the
   slots' bounding box plus Appendix E's 120 of margin and nothing else, in
   the composition's own shape — CONTRACTS §13 says it in capitals, because a
   caller that assumed the bench's aspect (`press.js` did) draws a cropped
   mockup. The one place 3200 × 1390 still stands is `lab.js's` own fallback,
   for a page that writes no `data-open`.
3. **`kits.js` returns `null` on a page with no `#bench-world`**, so the
   Press Table could not call `Kits.extractOnly`. The extractor is hoisted
   above that guard (CONTRACTS §7).
4. **`keep.js` hard-codes the door.** It derives it from the pathname now
   (CONTRACTS §0); on `/lab2/` the result is the same string.
5. **`frames.js` fetches `posters/index.json` unconditionally.** A sandbox
   and a game page with no machines would log a 404; `test/posters/index.json`
   is `{}` and the template's relative path reaches it.
6. **`ink.js` on a `.gz-art` prop** answers from `document.elementsFromPoint`
   and treats any node inside the art whose `ownerSVGElement` is set as ink.
   An `<image>` inside a `gz-pic`'s svg qualifies, so the picture's whole
   rectangle is ink, which is what §3.7 wants. Phase 5 measured and nothing
   was needed: there is no `data-pic` anywhere in the sandbox, and `ink.js`
   is one of the eight files copied in unchanged.
7. **`cursors.js` is not on game pages.** The plan's scope says a game page
   gets the dock and nothing more; the multiplayer cursors are a bench
   feature and a Nostr connection per visitor. One `<script>` line puts
   them back.
8. **A `sticker-sheet.dc.html` already exists** — a machine (a mock-up of a
   sticker sheet), not a kit. The kit is `stickers-core.dc.html`; no clash.
9. **Playwright** resolves from `Desktop/node_modules` (1.61) when scripts
   run from `site/`, launching system Chrome headed, as every `perf/*.js`
   does. Rendering-only steps (fixtures, part previews) run headless Chrome
   through the same channel; perf numbers are always headed.
10. **`site/serve.js` was already running on 4321** (`node serve.js 4321`)
    when Phase 0 started; the sandbox server takes **4322** and answers 404
    on `/_lab2/default` so the live bench can never save through it.
11. **`ANTHROPIC_API_KEY` is not set** in this environment; Phase 7 runs
    against the recorded fixture responses and reports that.
12. **Special Elite is not OFL.** The plan (§6 step 4) adds the four faces
    "after checking each is OFL-licensed on Google Fonts"; three are, and
    Special Elite is Apache 2.0 (`google/fonts` keeps it under
    `apache/specialelite/`; `ofl/specialelite/OFL.txt` is 404). Apache 2.0
    allows the same self-hosting and redistribution with the licence text
    kept beside the file (`fonts/Special-Elite-LICENSE.txt`). Shipped as the
    `typewriter` pairing and flagged in CHANGELOG for the owner to keep or
    swap; an OFL typewriter (Courier Prime, Cutive Mono) would change one
    file name and one row of `press/fonts.js`.
13. **Two of the four new faces are variable files.** The CSS2 API hands one
    URL for Fredoka 400/600 and one for Orbitron 400/700, so the folder holds
    each once and two `@font-face` rows share it (CONTRACTS §3 said six files;
    it says four now). The 2026-09-04 house faces took the other road — the
    same variable file saved under each weight name (Public Sans's four files
    and Sora's three are byte-identical, by md5) — and `fonts.js` maps
    family + weight → file, so either layout works and neither is repeated.
14. **Plan §7 step 1's "anything else stays above 6 % everywhere" is
    false.** Soft pictures sit UNDER the 2 % floor at every s (mosslight
    0.0052–0.0115, a plain gradient 0.0020–0.0048) with shallow dips, so
    the floor alone reads them as grids. `style.js` requires a deep
    minimum (`PIXEL_DIP` 0.5) — CHANGELOG Phase 3 has the numbers.
15. **Plan §7 step 2's "dark-pixel runs" reads the gaps on a dark plate.**
    neonrun's dark runs are the spaces between its lines (median 11–14
    px). `style.js` measures runs of ink — dark on a light plate, bright
    on a dark one — at half depth, so a glow is not the line.
16. **A raw `rx="{{ skRadius }}"` is a console error on the sheet's own
    page.** Plan §3.6 says corner radii on a `rect` are `{{ skRadius }}`.
    The sheet's markup is authored in the document, so the BROWSER parses
    it before support.js fills a single interpolation, and `rx` is a
    length: Chrome answers each one with `<rect> attribute rx: Expected
    length, "{{ skRadius }}"`. Twenty rects on the sheet carry a radius, so
    opening `stickers-core.dc.html` printed twenty errors (measured
    2026-09-07, Phase 4a). The fix is the encoding `viewBox` already
    takes: parts write `sc-camel-rx="{{ skRadius }}"`, which the parser
    never reads as a length, and support.js, `kits.js`'s `decodeAttrs` and
    `press/tools/render-part.js` each turn the prefix back into `rx`
    before anything draws (CONTRACTS §8; `palette-keys.js` enforces it and
    refuses a raw `rx`). The bench never saw the error — `kits.js` fills
    the string before it parses — so this is the sheet's page and Design
    Canvas only, which is exactly where the sheet is authored.
17. **A `{{ }}` in TEXT CONTENT does not render inside an SVG `<text>` on
    the sheet's own page.** support.js renders a text-content interpolation
    as `<span class="sc-interp">value</span>`, and inside an `<svg>` React
    makes that span in the SVG namespace, where it is an unknown element:
    measured with `getBBox()`, the word in the span is 0 × 0 while the same
    word as a plain text node is 72 × 22 (Phase 4a, `banner` at font-size
    20). So the eight text-slot parts show their words on a BENCH, where
    `kits.js` substitutes into the string before it parses, and never in
    the Design Canvas view of the sheet. Nothing is done about it: the
    words come from a section's `data-text` (plan §8 4.2), the sheet's own
    default `skText` is `''` (CONTRACTS §7), and the alternative is editing
    a copy of the Design Canvas runtime. `perf/verify-sheet.js` counts that
    span out of a layer's element count and says why.
18. **A Google Fonts woff2 does not carry its licence text.** `fonts.css`
    said the OFL faces "carry their licence in the woff2's own name table",
    and that was the reason no licence text was saved beside them. It is
    not true. Every one of the nineteen faces in `fonts/` was opened on
    2026-09-07 (the woff2 table stream brotli-inflated, the `name` table
    parsed — `press/CHANGELOG.md` has the run) and every one holds name
    record 0, the copyright line, and record 14, a URL to the licence, and
    NONE holds record 13, the licence itself. A self-hosted font is a
    redistributed copy, and OFL 1.1 §2 asks each copy to carry "the above
    copyright notice and this license"; Apache 2.0 §4(a) asks the same, and
    that is why `Special-Elite-LICENSE.txt` was already there. So the three
    OFL faces this phase added now keep their own upstream `OFL.txt` beside
    them (`Bangers-OFL.txt`, `Fredoka-OFL.txt`, `Orbitron-OFL.txt`, each
    md5-identical to `google/fonts` main, saved verbatim — Bangers's is CRLF
    upstream and stays CRLF, so the md5 still proves it). Per family rather
    than one shared text: Orbitron's copyright line reserves the font name,
    which is part of its notice. **Open for the owner:** the eight families
    the 2026-09-04 block brought in (Sora, Public Sans, Space Mono, Kalam,
    Rye, Pirata One, UnifrakturMaguntia, VT323 — all OFL by their name
    records) are in the same position; they predate this phase and were
    left alone.

## E · Phase 0 baseline — steps 2 and 5, run 2026-09-07 against the live bench

Nothing was edited for this section; it only ran the harness that already
existed against the owner's server on 4321 (`node serve.js 4321`, left
alone). Both scripts block the door in-page (`/_lab2/default` → 404) before
the bench loads, so `keep.js` never went live and nothing was POSTed: each
summary lists exactly one knock, a GET, answered 404. The two Chrome jobs ran
one after the other, never together.

### E.1 Step 2 — the Playwright setup works as the harness expects

    cd C:/Users/bobb9/Desktop/site
    node lab2/perf/verify-tracer.js

12/12 PASS, exit 0, ~20 s. `require('playwright')` resolved to
`Desktop/node_modules/playwright` (1.61.0); `channel: 'chrome'` launched the
system Chrome (152.0.7977.77), headed, at 1616 × 1110 outer / 1600 × 1000
viewport, DPR 1. No fix was needed. The same launch line is the one
`measure.js` and `boot.js` use, so the whole `perf/` folder runs here.

### E.2 Step 5 — the pan harness over the main bench

    node lab2/perf/measure.js press-baseline      # 67 s → perf/results/press-baseline/
    node lab2/perf/measure.js press-baseline-2    # 66 s, the confirmation pass

The second pass is not in the plan; the harness's own header says to compare
`idle` first and to run twice before trusting a difference, and the first
pass's close-in idles sat well above `after6`. They reproduced, so
**`press-baseline` is the baseline** and `press-baseline-2` is the evidence
that it is the bench and not the machine. Seven scenarios, `--drive scroll`
(the default), the rail cap at z35/z25/z20 the same as `after6`.

| scenario | idle med · after6 → pb → pb2 | pan med (pb / pb2) | p95 | max | >34 | warm |
|---|---|---|---|---|---|---|
| z400 (lockup @400 %) | 6.1 → 18.1 → 12.2 | 12.2 / 12.2 | 18.3 / 18.3 | 30.3 / 24.3 | 0 / 0 | 3 |
| lockup166 | 12.1 → 18.2 → 18.2 | 24.2 / 18.2 | 36.5 / 24.4 | 54.6 / 30.6 | 18 / 0 | 7 |
| z100 | 6.1 → 30.4 → 30.3 | 24.3 / 24.3 | 30.5 / 30.5 | 42.6 / 36.5 | 4 / 6 | 10 |
| z50 | 6.1 → 12.1 → 12.1 | 12.1 / 12.1 | 18.3 / 18.2 | 30.3 / 42.4 | 0 / 1 | 12 |
| z35 | 6.1 → 12.1 → 12.1 | 6.2 / 6.1 | 12.3 / 12.2 | 24.5 / 24.4 | 0 / 0 | 13 |
| z25 | 6.1 → 6.1 → 6.1 | 6.1 / 6.1 | 12.0 / 6.2 | 18.2 / 12.3 | 0 / 0 | 13 |
| z20 | 6.1 → 6.1 → 6.1 | 6.1 / 6.1 | 6.2 / 6.2 | 24.2 / 24.3 | 0 / 0 | 13 |

Milliseconds per rAF frame; `warm` is the count of warm documents before the
pan (the same in both passes, and the same as `after6` at every camera); the
13 iframes are the 13 machines, and at z35 and out every one of them is warm.
6.1 ms is the display floor here (a 165 Hz panel), where the field scenarios
sit in every run.

What the comparison says, measured not guessed:

- **The far field is unchanged.** z25 and z20 idle at the floor with 13 warm
  documents, exactly `after6`; z35 idles at 12.1 where `after6` had 6.1 but
  pans at the floor.
- **Close in, the bench idles above the floor now, and it repeats.** z100
  30.4 / 30.3 (after6 6.1), lockup166 18.2 / 18.2 (12.1), z50 12.1 / 12.1
  (6.1). The bench grew between `after6` (2026-09-04) and today: 138 panels
  with 77 standing trees then, **247 panels with 186 standing trees** now;
  1,438 DOM nodes at boot then, 2,385 now; iframes 13 both times. Nothing in
  this phase touched the bench — this is the ground the Press Table will be
  measured against, and §0.4's "no idle-frame regression" is judged against
  `press-baseline`, not `after6`. (`perf/results/baseline`, the label §0.4
  names, is the 2026-09-04 run from before the kit sprites: 134 iframes and
  55–67 ms idles across the field, so anything clears it; `press-baseline`
  is the bar that binds.)
- **One hitch that repeats.** Both passes carry a single ~950 ms frame in
  the z400 idle sample (977 ms, then 934 ms): the first look after boot, the
  jump from the opening rectangle to 400 %. It is a cost of that jump, not
  the machine (what the jump spends it on is not separated out here). It
  leaves only 23 / 17 idle frames at z400, too few for the median (18.1 /
  12.2) to mean much; the pan itself, 287 / 283 frames, is 12.2 in both.
  lockup166's 18 frames over 34 ms in the first pass did not repeat (none in
  the second).
- **Boot:** 7 panels booted in 4.6 s / 4.4 s (quiet after 2.0 / 2.1 s; not
  capped), against `after6`'s 2 panels in 8.7 s — a different opening
  rectangle since 2026-09-04 (D.2), not a like-for-like number. First-second
  rAF median 12.1 ms, worst 48.6 ms, the 3-at-a-time boot queue at work.
- No page errors in either pass.
