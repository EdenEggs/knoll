# Contracts — what the phases agree on before any of them is built

The plan (`../../PRESS-TABLE-PLAN.md`) fixes most interfaces; this file pins
the ones it leaves open, so that Phases 1–4 (built in parallel) fit together
in Phase 5 without a meeting. When a builder needs to change a line here,
they change it here first and say so in `CHANGELOG.md`.

## 0 · The sandbox prefix

Everything runs under `lab2/test/`. Two constants say so, and a merge into
the live bench is changing them:

- pages: `/lab2/test/`, `/lab2/test/press/`, `/lab2/test/games/<slug>/`
- doors: `/_lab2/test/default`, `/_lab2/test/games/<slug>`, `/_lab2/test/build`,
  `/_lab2/test/vibe`, `/_lab2/test/intake` (all served by `test/serve.js` on **4322**)
- in `serve.js`: `PREFIX = '/test'`, `DIR = 'lab2/test'`. Merged: `''`, `'lab2'`.

**Door derivation** (`keep.js` and `press.js` both use it; write it once in
each, three lines, no shared file — the bench has no module system):

    dir = location.pathname.replace(/[^/]*$/, '')                 // up to the last '/'
    g   = /^\/lab2(\/.*?)?\/games\/([a-z0-9-]+)\/$/.exec(dir)
    door = g ? '/_lab2' + (g[1] || '') + '/games/' + g[2]
             : '/_lab2' + ((/^\/lab2(\/.*?)??\/(?:press\/)?$/.exec(dir) || [])[1] || '') + '/default'

So `/lab2/` → `/_lab2/default` (unchanged), `/lab2/games/x/` → `/_lab2/games/x`,
`/lab2/test/` → `/_lab2/test/default`, `/lab2/test/games/x/` → `/_lab2/test/games/x`,
and `/` (deployed) → `/_lab2/default`, which 404s as it always did. The Press
Table takes the same prefix and asks for `/build`, `/vibe`, `/intake` beside
`/default`; deployed, `vibe` and `intake` are `/api/vibe` and `/api/intake`.
The bench regex's prefix group is `??` — LAZILY optional (changed 2026-09-07,
Phase 5's autosave step): a greedy `?` tries the group first and reads
`/lab2/press/` as prefix `/press` (→ `/_lab2/press/default`, a door that does
not exist); lazily, the group is tried only when the bare `/lab2/` shape fails,
so `/lab2/press/` derives `/_lab2/default` as the line above says. The sandbox
paths came out right either way; the merged Press Table's would not have.

**Page-scoped stores.** A generated page carries `<html data-lab-page="games/<slug>">`.
`lab.js` reads it once and prefixes every localStorage key it and `Lab.store`
write (`knoll-lab2:` → `knoll-lab2:games/<slug>:`); `frames.js`'s size keys
and `keep.js`'s removeItem calls take the same prefix through `Lab.storeKey(k)`.
Absent → the keys are unchanged, so the main bench is unaffected. Without this
a game page at `/games/x/` and the bench at `/` share one camera, one set of
positions and one wall (verified on 4321 in Phase 0).

**A generated page always writes `data-open`.** The fallback is the main
bench's literal rectangle, which frames empty paper 2190 units above a game
page's content (Phase 0 verifier).

Paths that leave `lab2/` (the logo, the site root) are written **absolute**
(`/logo/logo-icon.svg`, `/`): they resolve on `serve.js` (root = `site/`) and
on Vercel, and the sandbox is one folder deeper than the merge target so a
`../` count could not be right in both places.

## 1 · `window.Palette` (press/palette.js)

    Palette.quantize(imageData, k, opts) → [{hex, weight, r, g, b}]  sorted by weight desc
      opts.ignoreEdges  (bool, default false)  drop the outer 4 % border first
      opts.minWeight    (0–1, default 0)        drop clusters under this share
      opts.rng          (() => number in [0,1)) the random source. DEFAULT Math.random —
                        the tracer's behaviour, verbatim. The press passes Palette.rng(seed).
    Palette.rng(seed)   → a mulberry32 generator (deterministic)
    Palette.sample(imageData, cap) → [[r,g,b], …]   (opaque pixels, ALPHA_T 16, stride to cap)
    Palette.kmeans(samples, K, rng) → [[r,g,b], …] centroids — the tracer's own k-means, moved
                        here verbatim. tracer.js calls sample() and kmeans() and NOT quantize():
                        it needs the centroids to label the full image with, and quantize is
                        sample + kmeans + weigh, which is what the press wants and the tracer
                        does not (perf/golden-tracer.js is the proof the tracing is unchanged).
    Palette.toOklch(hex) → {L, C, h}     Palette.fromOklch(L, C, h) → '#rrggbb' (gamut-clipped)
    Palette.toOklab / fromOklab — the same pair in Lab, which mix() works in
    Palette.contrast(hexA, hexB) → WCAG 2.x ratio ≥ 1
    Palette.clampL(hex, min, max) → hex with OKLCH L clamped, C and h kept
    Palette.mix(hexA, hexB, t) → hex, mixed in OKLab
    Palette.hueDist(h1, h2) → 0–180

`analysis.palette` entries are `{hex, weight, L, C, h}` (OKLCH; `h` in degrees
0–360, `C` unclamped, `L` 0–1). `Palette.describe(quantized)` adds L/C/h.

## 2 · `window.Theme` (press/theme.js) — pure, no DOM

    Theme.derive({ palette, saturation, mood, paletteSize, fonts }) → theme
      palette:      analysis.palette
      saturation:   stats.saturation (mean OKLCH chroma of a pixel sample)
      mood:         'calm' | 'loud' | undefined. Undefined → loud when EITHER saturation > 0.12
                    OR the accent candidate (highest-C entry with weight ≥ 2 %) has C > 0.15.
                    (A dark neon plate averages C ≈ 0.08 over its pixels — Phase 0 measured
                    0.084 on neonrun — while its accents sit at C ≈ 0.25; the pixel mean alone
                    would call it calm.)
      paletteSize:  0 | 4 | 8 | 16   (style.paletteSize; quantises every --sk-* role to a ramp)
      fonts:        a pairing id from press/fonts.js, or undefined → 'clean'
    theme = { dark, tokens: {'--paper': '#…', …, '--sk-halo': '0'|'1'}, fonts: {id, display, body, mono}, css }
    css = ':root{--paper:#…;…}' — one line per token, in the order of the plan's table,
          then the font tokens `--display`, `--body`, `--mono` as CSS font stacks.

    Theme.tokensOf(theme) → the tokens object, copied, in the table's order
    Theme.explain(theme)  → [string, …] short reasons ('dark: mean L 0.31', 'accent: #ff2fb0 (C 0.26, 13 %)', …)
                            for the Press Table's tweak panel; derive()'s own notes while the theme
                            still carries them (a non-enumerable `why`), else recomputed from the tokens
    Theme.FLOORS, Theme.ORDER, Theme.SIZES — the constants, frozen (the tests hold them to this file)

Deterministic: same input → byte-identical `css`. Every token is a 6-digit
lowercase hex except `--bench-dot` (`rgba(r,g,b,.06)`), `--drop-rgb`
(`r,g,b`), `--sk-halo` (`0`/`1`) and the three font tokens. (`tokensOf`,
`explain` and the constants added 2026-09-07, Phase 2 — CHANGELOG.)

## 3 · `window.Fonts` (press/fonts.js)

    Fonts.PAIRINGS = { clean: {display, body, mono, faces: [...woff2 basenames]}, pixel, hand, rustic, gothic: {…, accent}, comic, cozy, scifi, typewriter }
    Fonts.stacks(id) → { display: "'Sora',sans-serif", body: …, mono: …[, accent: …] }
    Fonts.preloads(id) → [woff2 basenames to <link rel=preload>]   (the display's main weight + the body's 400)
    Fonts.suggest({ style, dark, saturation }) → [id, id, id]   (the three the Press Table offers)

`display`, `body`, `mono`, `accent` are family names. `mono` is `'ui-monospace'`
— the bench's system stack, lab.css line 24 verbatim — for the seven pairings
on Public Sans, and `'Space Mono'` for `pixel` and `scifi`; `clean`'s three
stacks are lab.css's own. `faces` is computed: every file of every family the
pairing names, so it cannot drift from fonts.css. An unknown id throws a
RangeError (an off-menu id is a caller's bug, and the schema stops it first).

The new faces (latin subset, from Google Fonts on 2026-09-07): `Bangers-400`,
`Fredoka-400`, `Orbitron-400`, `Special-Elite-400` as `fonts/<Name>-<weight>.woff2`
— FOUR files behind SIX `@font-face` rows appended to `fonts/fonts.css` in the
file's own one-line style: Fredoka and Orbitron arrive as one variable file
each, saved once, and the `Fredoka` 600 and `Orbitron` 700 rows point at the
400 file (single-weight rows, as Public Sans's). Bangers, Fredoka and Orbitron
are OFL; **Special Elite is Apache 2.0** (`apache/specialelite` in google/fonts),
its LICENSE.txt beside the file — CHANGELOG Phase 2 (fonts) flags it for the owner.
All four carry their licence text in the folder (`Bangers-OFL.txt`,
`Fredoka-OFL.txt`, `Orbitron-OFL.txt`, `Special-Elite-LICENSE.txt`, each
byte-identical to google/fonts main): a woff2's `name` table holds only the
copyright line and a URL, never the licence, and a self-hosted font is a
redistributed copy (measured 2026-09-07 — NOTES §D.18, CHANGELOG Phase 2
verified). These four files are not `@font-face` rows and nothing loads them.

## 4 · `window.Style` (press/style.js) — browser, needs a canvas

    Style.measure({ screenshots: [ImageBitmap|HTMLImageElement|canvas…], keyart: […], logos: […] }) → stats
      stats = { pixelSize, outline: {present, weight}, paletteCount, saturation, contrast, hfEnergy, edgeDensity }
    Style.vector(stats, hints) → the style vector (Appendix B fields), hints = { dark, vibe }
    Style.rank(vector) → [{preset, score}, …] top three, ascending distance
    Style.PRESETS = { pixel: {…prototype}, flat, … }   (Appendix C, verbatim)
    Style.inspect(stats) → the working the measurement showed, for a harness to print
    Style.forPreset(preset, vector) → the vector the page bakes as data-sk-style
        (the preset's prototype with `pixel` and `saturation` taken from the measured vector)

Measurements: `pixelSize` and `hfEnergy` are taken on the **native** image
(or an integer-factor nearest-neighbour downsample when the long edge is over
1024) — a 512-px resample turns a 4-px grid into 3.2 px and blurs texture
(Phase 0 measured both). The pixel-grid rule is the **largest** `s` in 2…16
whose shrink-and-re-enlarge error is under the floor (2 divides 4, so the
error is also 0 at s = 2; the plan's "smallest" reads the wrong number).
Everything else on a 512-px-long-edge copy. `hfEnergy` uses a dilated (1 px)
edge mask so a thin neon line's aliasing does not count as texture. Every
threshold is a named constant with its provenance sentence, and Phase 3
replaces the words in `expected.json` (`'high'`, `'thin'`) with the measured
bounds it asserts, keeping `_from`.

## 5 · The style vector on the page

`<html data-sk-style='{"preset":"pixel","lineShow":true,…}'>` — the object
from `Style.forPreset`, validated against `press/schemas/style.schema.json`.
Absent → `{preset:'flat', lineShow:true}` (how the sheet was drawn).

## 6 · The sticker roles on the page

`:root{--sk-primary; --sk-secondary; --sk-ink; --sk-paper; --sk-highlight; --sk-shadow; --sk-halo}`.
`kits.js` reads them once at `loadSheet` time; role name → token is
`'--sk-' + kebab(role)` (`skPrimary` → `--sk-primary`).

Interpolation names in the sheet: `skPrimary skSecondary skInk skPaper
skHighlight skShadow skStroke skRadius skText` (+ the `is<Part>` flags).

## 7 · `Kits` extensions (kits.js)

    SHEETS.stickers = { file: 'features/stickers-core.dc.html', key: 'part', spill: {r: 6, b: 7},
                        palette: { skPrimary:'#c93b82', skSecondary:'#5871f5', skInk:'#26212a', skPaper:'#ffffff',
                                   skHighlight:'#ef4d98', skShadow:'#8a2558', skStroke: 3, skRadius: 6, skText: '' },
                        shadow: 'rgba(0,0,0,0.3)', jiggle: '50% 50%', swayShare: 1 }
      (swayShare is 1 — the plan's default, KEPT: the probe ACCEPTED all ten presets at
       166 % with fifty of sixty live and twenty swaying, so no per-preset cap was ever
       needed. kits.js's shareOf() already reads a per-preset object the day one is.)
    SRC_RE gains `stickers-core`.
    Kits.setStyle(vector)                → re-extracts the stickers sheet, re-bakes tiles; returns a Promise
    Kits.extractOnly(sheetFile, palette, style) → Promise<{ [part]: { still, w, h, tags, text } }>
                                           no bench needed; `window.Kits` exists on a page with no #bench-world
                                           and is exactly { extractOnly, kindOf, isKitSrc, SHEETS, setStyle } there
    section attributes: data-palette="{&quot;skPrimary&quot;:&quot;#…&quot;}"  data-text="WISHLIST"  data-rot="-3"
        (double-quoted, the JSON's quotes as &quot; — the form serve.js writes and reads back;
        its attribute scanner also accepts a hand-written single-quoted value)
    keep.js reports palette (JSON string), text, rot for every kit section; '' means "drop the
        attribute", an absent key means "leave it alone" (serve.js's rule, Phase 0).
    variant cache key: kit + '/' + part + '@' + hash(JSON palette + '|' + text)

`kits.js` on a page with no `#bench-world`: today it returns `null` at the first
line. The new shape: the extractor is defined first, the bench half is behind
`if (world)`, and the returned object is the bench API when there is a bench,
`{ extractOnly, kindOf, isKitSrc, SHEETS, setStyle }` when there is not
(`kits.js` line 900, the one `return` above THE BENCH HALF).

## 8 · The sheet (features/stickers-core.dc.html)

Per §3.6 and Appendix D of the plan, plus:

- box 128 × 128; `<svg width="128" height="128" sc-camel-view-box="0 0 128 128">`;
  root style carries `filter: drop-shadow(6px 7px 0 rgba(0,0,0,.3))` and a
  `sk-sway`/`sk-bob` animation like the forest's (`animation: sk-sway 4.2s ease-in-out -1.1s infinite alternate`, root only).
- layers, in this order as direct children: `halo`(hidden by default: `display:none` on the g), `shadow`, `body`, `line`, `highlight`, `detail`, then optionally `image-slot`, `text`.
- authored with the six placeholder literals (Appendix D); `press/tools/palette-keys.js`
  rewrites them and fails on any other literal colour.
- part fragments live in `press/tools/parts/<part>.html` (one `<sc-if>` block each) and
  `press/tools/build-sheet.js` assembles the sheet, the `data-props` and `renderVals()`.
- **the `data-props` carries `slots` beside `tags`** (added 2026-09-07, Phase 5 — CHANGELOG):
  `{part: {x, y, w, h, rot}}` for the five parts with an `image-slot` layer
  (`badge-round`, `frame-polaroid`, `frame-ornate`, `frame-pixel`, `frame-film`) — the slot's
  rect in the part's own 128 units, unrotated, plus the angle it is turned by about its own
  centre (`frame-polaroid` is −5°, the tilt of its card; the other four are 0). `build-sheet.js`
  reads it off the part file and REFUSES to build if a part Appendix D gives an image-slot to has
  a rect it cannot read; `build-game.js` reads it back off the sheet to place a screenshot in a
  frame. A page composes a picture in a slot as TWO sections, because a kit part may hold no
  `<image>` (ADDING.md §1.2): the frame, then a `gz gz-pic gz-shot` prop over it, cut to that
  rect mapped through the sticker's x/y/scale and turned by rect.rot + the section's `data-rot`
  about (64, 64) — kits.js's own rotation centre. The picture is over the frame because the
  `image-slot` layer is the part's last child and its rect is opaque `{{ skPaper }}`; the
  border still reads because every part insets its slot inside the outline that frames it.
- **a rect's corner radius is written `sc-camel-rx="{{ skRadius }}"`, not `rx=`**
  (changed 2026-09-07, Phase 4a — CHANGELOG; §6's interpolation names are unchanged).
  The sheet's markup is parsed by the browser before support.js fills anything, and
  `rx` is a length, so a raw one is `<rect> attribute rx: Expected length,
  "{{ skRadius }}"` in the console — twenty of them, one per radius, every time the
  sheet was opened. `sc-camel-` is the encoding `viewBox` already takes for the same
  kind of reason; support.js, `kits.js`'s `decodeAttrs` (already generic, kits.js
  line 287) and `press/tools/render-part.js` all decode it to `rx` before anything
  draws, so nothing downstream changes. `palette-keys.js` refuses a raw `rx`/`ry` on
  a rect and a `sc-camel-rx` that is not `{{ skRadius }}`.
- a `{{ }}` in a `<text>`'s CONTENT is rendered by support.js as a
  `<span class="sc-interp">` in the SVG namespace, which draws nothing (measured
  0 × 0 against 72 × 22 for a plain text node): the eight text parts show their
  words on a bench, where `kits.js` fills the string before it parses, and not in
  the Design Canvas view. `skText` defaults to `''` and the words come from the
  section's `data-text` (§7), so no part depends on the canvas showing them.

## 9 · Fixtures

`press/fixtures/<name>/manifest.json`, `art/<id>.png`, `expected.json` and,
after Phase 3, `stats.json` (golden). Names: `pixelfort`, `mosslight`,
`neonrun`. Asset ids: `logo`, `keyart-portrait` / `hero`, `shot-1..4`.

## 10 · `games/<slug>/game.json`

    { version: 1, builtAt: ISO, manifest, analysis, theme, style, layout }

`press/schemas/game.schema.json` is that line spelled out, and it pins three
things the line leaves open (added 2026-09-07, Phase 5 — CHANGELOG). All
seven keys are **required**; the envelope is **closed**
(`additionalProperties: false`), so a builder that wants to write an eighth
key adds it there first; `version` is `const 1`, so a reader that meets a 2
stops rather than guessing which half it still understands; and `builtAt` is
the shape `new Date().toISOString()` writes (`^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$`),
not a general ISO-8601 grammar. The five parts are `$ref`s to their own
files, so this file holds no copy of them.

## 11 · Verification results

Every probe/verifier writes under `test/perf/results/<label>/` (gitignored):
`summary.json` and PNGs. `CHANGELOG.md` quotes the numbers.

## 12 · The schemas, and `Validate` (press/schemas/, press/tools/lib/validate.js)

Seven files, Appendix A and F verbatim plus §10's envelope:
`manifest analysis theme style layout vibe game` `.schema.json`, JSON Schema
draft 2020-12, 11 KB in all. Nothing else may live in that folder — the
loader reads a fixed list and `test-schemas.js` fails on a stray file.

    Validate.check(data, schema, schemas) → [] | [{path, message}, …]   ([] is the only "valid"
        schema   a schema object, or the NAME of one in `schemas`
        schemas  {'manifest.schema.json': {…}, …} — the pool $ref resolves in
    Validate.lint(schema, schemas)  → the keywords this validator does not implement,
                                      and the $refs that do not resolve   (hold every schema to [])
    Validate.loadDir(dir)           → the pool, read off disk             (Node)
    Validate.loadFetch(baseUrl)     → Promise of the pool                 (browser)
    Validate.FILES                  → the seven names, in dependency order

`path` reads like the JavaScript that reaches the value (`assets[2].sha256`,
`tokens["--sk-halo"]`, `''` for the whole document); `message` names its
keyword first (`maxLength: 81 > 80`). Both are for a person, not a parser.
It never throws, on any data or any schema — a bad body is a 400, not a
stack trace — and it is deterministic and pure (no fetch, fs, Date or
Math.random in `check`; the two loaders are the only doors out).

`$ref` is one shape only: `style.schema.json#/properties/preset` — a file
name in the same pool, then a JSON pointer walked key by key (a bare `#/…`
means the document the ref was written in). No `$defs`, no remote refs.
Every caller validates: `build-game.js` before it writes, `api/vibe.js`
before it believes the model, `api/intake.js` before it believes a stranger,
and the Press Table in the browser before it posts to `/build` — the file is
a UMD-ish IIFE (`module.exports` in Node, `window.Validate` on a page).

## 13 · `window.Recipes` (press/recipes.js) — pure, no DOM

    Recipes.RECIPES = { poster: {id, ruler, build}, widescreen: {…}, scrapbook: {…} }
    Recipes.choose({ assets, preset, vibe }) → ['poster','widescreen','scrapbook']   ranked, ALWAYS all three
    Recipes.resolve(recipeId, { manifest, assets, theme, style, stickers, vibe }) → layout
    Recipes.rankStickers(tags, { motifs, mood, count }) → [part, …]   best first, ties by Appendix D order
    Recipes.RECIPES IDS PARTS MOTIF_PARTS MOOD_TAGS NOTE CHIP LINKS SK REF OPEN MARGIN
    Recipes.NOTE_REFS SIGN_REF SK_BOX SPILL   (the constants, frozen with the rest)

`layout` is Appendix A's object — `{recipe, open:{x,y,w,h}, slots:[…]}` — plus
four things the schema allows (it sets no `additionalProperties:false`) and
`build-game.js` needs:

- **`openNarrow`** beside `open`: the phone's rectangle, written to
  `data-open-narrow` on `#bench-world` as `open` is written to `data-open`
  (lab.js WHERE IT OPENS). It keeps `open`'s y and height and takes the width
  of the composition's SPINE — the pics, the notes and the sign, the
  screenshot row and the loose stickers left off the sides. It may come out
  EQUAL to `open` (the widescreen recipe's spine is its whole width), which
  is not a bug: there is nothing to leave off the sides of that composition.
- **`w`, `h`** on every slot: the placed box in world units (a picture's
  pixels × `scale`; a sticker's 134 × 135 × `scale`, or its extract record's
  box + spill; a note's width × the wrapped height). `open` is computed from
  these, so a caller that re-derives them must use the same numbers.
- **`image`** on a sticker that has an `image-slot` (frame-polaroid,
  frame-film): an ASSET id, the picture the generator clips into the frame.
  The slot's `ref` stays the PART id, and the generator composes the picture
  as a second section over it — §8's `slots` says how, and
  `layout.schema.json` names the key. (It is `image` and not `pic` because
  `pic` is already a slot KIND: `slot.pic` beside `kind === 'pic'` would be
  two different things one word apart.) `text` is the word for a text slot
  (`data-text`, §7); `width`/`size` are a note's column and its body type
  size in world units.
- **NEITHER OF THOSE TWO IS OPTIONAL WHEN THE PART HAS THE SLOT** (added
  2026-09-07 — CHANGELOG). A part drawn round an `image-slot` and placed with
  no `image` draws that slot's placeholder, an opaque `{{ skPaper }}` rect —
  a white square on a light page and a black one on a dark one. A part drawn
  round a text layer and placed with no `text` draws an empty one, because
  `skText` is `''` (§8). Both were on the two widescreen pages until this
  date. So a recipe places a part from either list only with the thing that
  fills it, and if it has nothing to put there it chooses a part that has no
  slot (Appendix E's `badge-round` on the hero's corner is `burst-round` for
  exactly that reason). The two lists are the sheet's own: the five parts in
  its `data-props` `slots` map (§8), and the eight with a
  `<g data-layer="text">`. `press/tools/test-recipes.js` refutes it for
  every recipe × every fixture, `press/tools/build-game.js` warns for a
  layout that arrives at the door from anywhere else, and
  `perf/verify-game.js` counts both on the built page (`emptySlots`,
  `wordless`).
- **`z` is 0…n−1**, one per slot, and is the pile order: the slots array is
  already in it, so markup order is just the index. On the PAGE, `data-home-z`
  is the index of the SECTION and not of the slot (changed 2026-09-07, Phase 5
  — CHANGELOG): a sticker slot carrying `image` is written as two sections,
  the frame and the picture over it, so the page has more sections than the
  layout has slots. Both numberings are still 0…n−1 in the same order; they
  are just over different lists.

Slot refs: `pic` → an asset id · `sticker` → one of the forty (Appendix D) ·
`note` → `title` (the title, a newline, the tagline), `description`, `release`
· `sign` → `links`, whose chips are `Recipes.LINKS`'s labels in that order, so
the generator draws the words this file measured.

**`open` IS THE SLOTS' BOUNDING BOX PLUS APPENDIX E'S 120 OF MARGIN, AND
NOTHING ELSE — changed 2026-09-07, and a READER OF LAYOUTS HAS TO KNOW.**
Until that date it was then widened or heightened to 3200 : 1390 (lab.js's
WIDE rectangle — not the plan's stale 1848 × 1928, NOTES §D.2), so every
`open` a caller had ever seen was 2.302 : 1. It is now the COMPOSITION's own
aspect, which is portrait on the poster recipe (2454 × 1998, 1.23 : 1) and
1.68 : 1 on widescreen. Nothing about the object's SHAPE changed — it is
still `{x, y, w, h}` in world units and still contains every slot's box —
but a caller that sizes something from `open.w` and assumes the height will
be `open.w / 2.302` now gets a box a third too short. `press/preview.js`
draws its mockup at `open.w × S` by `open.h × S`, which was right and still
is; `press/press.js` handed it `scale: stage.clientWidth / open.w`, which was
right only while every `open` wore the stage's own shape, and for a day the
Press Table's three mockups were CUT at the bottom because of it — the poster
lost 47 % of its height and the scrapbook 57 %, measured at both viewports.
Since 2026-09-07 press.js hands `min(stageW / open.w, stageH / open.h)` and
press.css makes the stage a 5 : 4 box of the GAME's own paper with the
composition centred on it, so a portrait card and a landscape card stand side
by side and neither is cropped (CHANGELOG, Phase 9 · the cropped mockups). The reason is in
`recipes.js`'s `openOf()`: lab.js lands a page at `min(w-fit, h-fit)`, so
enlarging the rectangle on the axis that does not bind can only lower the
zoom — measured at −4.4 % of the poster's landed zoom at 1366 × 768, which
is half a screen pixel of body type (CHANGELOG, Phase 5 · the three
defects). The composition's scale **k** = the ruler
picture's pixel width ÷ the width its recipe was written for (landscape 1600,
portrait key art 480, logo 640; the ruler is the hero for `widescreen` and the
key art for the other two): the ruler is placed at its natural pixel size ×
the recipe's scale, and every coordinate, box, type size and the margin
follows it — so art at half the pixels gives the same composition at half the
world size.

`stickers` is either the sheet's tag map (`{part: [tag…]}`, off its
`data-props`) or a whole `Kits.extractOnly` result (`{part: {w, h, tags, …}}`,
whose w/h are then the measured boxes). `theme` and `style` are accepted and
move NOTHING — a layout is geometry; the theme paints it and the style skins
the stickers afterwards. Deterministic, no `Math.random`, every number rounded
(2 dp world units, 4 dp scale and rot). Test: `press/tools/test-recipes.js`
(Node, no browser; it also holds `Recipes.PARTS` to the sheet's own list).
