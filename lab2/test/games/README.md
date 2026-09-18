# games/ — one folder per page the Press Table has built

A game page is a **bench with one game on it**: lab 2's runtime — the same
`lab.js`, `frames.js`, `kits.js`, `wall.js` — on a page that is not the bench.
Its key art and screenshots are pictures on the paper, its words are notes, its
store links are a sign, and a handful of the forty stickers
(`../features/stickers-core.dc.html`) stand round them in the game's own
colours. It pans, it zooms, `ctrl` picks by the drawing, the dock draws on the
paper. There is no lockup, no field of machines and no groves.

Everything in this folder comes from `../PRESS-TABLE-PLAN.md` §9 (Phase 5);
`../press/CONTRACTS.md` §0 is the rule that makes the pages work in the sandbox
and after a merge alike.

## What a game folder holds

    games/<slug>/
      index.html      the page. Generated once from _template.html, then edited
                      by hand and by keep.js.
      game.json       { version, builtAt, manifest, analysis, theme, style,
                      layout } — CONTRACTS §10. The recipe that started the
                      page, kept so the Press Table can re-open it. It is the
                      STARTING POINT, not the record: once the owner has moved
                      things about, index.html is the truth.
      art/            the re-encoded images the page draws — `.webp` at 0.86,
                      `.png` where alpha is wanted, long edge capped at
                      2048 / 1600 / 1024 by role (plan §5.3). The names and
                      sha256s are in game.json's manifest.
      posters/        `index.json`, and a picture per machine once there is
                      one. It is `{}` on a v1 page and it is NOT optional:
                      `frames.js` fetches `posters/index.json` relative to the
                      page and nothing boots until it has answered, so a folder
                      without one takes a 404 on every visit.
      _src/           the originals the images were made from. **Gitignored**
                      (`.gitignore`: `games/*/_src/`), and never committed.
      index.html.keep-bak
                      one backup per run of the server, taken the first time it
                      writes this page. Gitignored (`*.keep-bak`).

## The template

`_template.html` is the skeleton every page is built from: the bench's own
head, header, docks and script list with the lockup, the field, the forest and
the village taken out, and nine placeholders left in —

    {{TITLE}}  {{DESCRIPTION_META}}  {{TOKENS_CSS}}  {{FONT_PRELOADS}}
    {{SK_STYLE}}  {{OPEN}}  {{OPEN_NARROW}}  {{SLUG}}  {{SECTIONS}}

— plus the `▼ ▲ copies written down by keep.js` markers and the
`  </div><!-- /bench-world -->` anchor, **verbatim**: `serve.js` scans the file
for those three strings byte for byte when it appends a pasted copy, and a page
that has lost one of them cannot be saved to.

Its own header comments say why each piece is where it is. Three of them matter
before you edit anything:

- **The paths are relative** (`../../lab.js`, `../../features/…`,
  `../../fonts/fonts.css`) — two folders up lands on the same files at
  `/lab2/test/games/<slug>/` in the sandbox, at `/lab2/games/<slug>/` after the
  merge, and at `/games/<slug>/` deployed, where `vercel.json` rewrites the
  bare `/lab.js` and `/features/…` back into `lab2/`. Paths that **leave**
  `lab2/` — the logo, the site root — are absolute (CONTRACTS §0).
- **`lab.css` first, the token block after it.** Both are `:root`, so the later
  one wins token by token; swap them and the page is Knoll pink again.
- **`kits.js` is lent two folders for the length of its script tag.** It
  fetches its sheets as `features/<kit>.dc.html`, resolved against the page, so
  from two folders down that is a 404 and forty bare stickers. The template
  wraps `fetch` immediately before `kits.js` and unwraps it immediately after.
  The real fix is one line in `kits.js` (resolve the sheet against
  `document.currentScript.src`); when it lands, those three lines come out.

## How to open one

The sandbox server, from `site/`:

    node lab2/test/serve.js 4322

- a game page ......... http://localhost:4322/lab2/test/games/<slug>/
- the template's probe  http://localhost:4322/lab2/test/games/_probe/
- the Press Table ..... http://localhost:4322/lab2/test/press/

Served from localhost the page is a **workbench**: the hint, the row of
switches and `keep.js`'s pill show (`html.lab-local`, decided in the head before
the first paint). Served from anywhere else it is the **game's page** and the
header is the wordmark and a small “← knoll”.

## keep.js writes the arrangement back

Drag a picture, turn a sticker, re-cut a note, then `ctrl+s` (or **save
layout**, or wait thirty seconds for the autosave). `keep.js` derives its door
from the page's own pathname — `/lab2[/<prefix>]/games/<slug>/` →
`/_lab2[/<prefix>]/games/<slug>`, CONTRACTS §0 — knocks once at boot, and goes
quiet for good if there is no door, which is what happens on the deployed site.
The door writes `data-home-x`, `-y`, `-z`, `data-cut` (+ the inline `style`),
`data-gone`, and for a sticker `data-palette`, `data-text` and `data-rot`, **in
place** on the tags already in the file; a pasted copy is appended between the
`▼ ▲` markers. It never removes a section, it refuses a write that would make
the file shorter than the bytes it meant to drop, and it takes one
`index.html.keep-bak` per run of the server before its first write.

So a comment you write into a generated page survives every save. A **rebuild**
does not: `build-game.js` refuses to overwrite an existing `index.html` unless
it is told to force, and forcing throws your arrangement away (after a backup).

## `_probe/` — the template's own fixture

`_probe/` is not a game. It is `_template.html` with its placeholders filled in
by hand with the smallest page that still exercises all three of the runtime's
halves: one `gz-pic` prop round a screenshot of the `neonrun` fixture, one
sticker section (`banner`, with `data-text`), the theme `press/theme.js` derives
for that fixture, and an opening rectangle round the pair.
`perf/verify-template.js` writes it fresh on every run and **leaves it on
disk**, so it is there to open by hand whenever the template changes:

    node lab2/test/perf/verify-template.js      # from site/, server up on 4322

The leading underscore is deliberate. `serve.js`'s slug is `^[a-z0-9-]{2,40}$`
(the manifest schema's own pattern), so `_probe` is not a slug: `/build` cannot
overwrite it and its save door answers 400. Nothing but that one script writes
it. `_template.html` is out of the way for the same reason — a folder listing of
`games/` is the pages, and the two files that are not pages both start with an
underscore.

## What is actually in here

`pixelfort`, `mosslight` and `neonrun` are the three fixtures, built by
`press/tools/build-game.js` and judged by `perf/verify-game.js`.
**`pixelfort-press` is a fourth, and it is deliberate**: it is the page the
Press Table itself built in the Phase 6 walk-through, left on the disk as the
evidence of that run (`press/CHANGELOG.md`, *Phase 6.1 + 6.2 + 6.7*). Nothing
depends on it and no test reads it; it is here so the owner can open the page
the browser made and compare it with the three the command line made. Named
here because the Phase 9 clean-tree check asks whether a `*-press` folder is a
stray or a decision, and this one is a decision.

Anything called `verify-*` is a **stray**. `perf/verify-press.js` and
`perf/verify-import.js` build into `games/verify-<fixture>/` and delete them in
a `finally`; one left behind means a run was killed part-way, and it is safe to
remove.

## Not in v1

- **No machine.** A trailer (`features/trailer.dc.html`, a document with a video
  embed in it) is Phase 10, and it is what brings React back to the page — the
  template leaves out the bench's two `<script>` lines and says so.
- **No `og:`/`twitter:` cards.** A press page that is shared into a chat wants a
  preview, and the plan does not ask for one; the head is where they would go,
  next to the description meta, and the hero in `art/` is the picture they would
  point at. Left for the owner to decide.
