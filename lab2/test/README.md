# lab 2 / test — the Press Table, built in a sandbox

This folder is **a miniature lab 2**: the bench's runtime copied in, the Press
Table system from `../PRESS-TABLE-PLAN.md` built on top of it, and nothing in
the live bench (`../index.html`, `../kits.js`, `../../serve.js`,
`../../vercel.json`) touched. The point of the sandbox is that the game-page
template's relative paths (`../../lab.js`, `../../features/…`) resolve here
exactly as they will after a merge, so what is verified here is what ships.

## Run it

From `site/` (the folder with `serve.js`), with the real server left alone:

    node lab2/test/serve.js 4322

- the sandbox bench ............ http://localhost:4322/lab2/test/
- the Press Table .............. http://localhost:4322/lab2/test/press/
- a game page .................. http://localhost:4322/lab2/test/games/<slug>/
- the sticker sheet, on its own  http://localhost:4322/lab2/test/features/stickers-core.dc.html#part=burst

The sandbox server serves the whole of `site/` the way `serve.js` does (same
static handler, same ETags) and adds the doors the plan asks for, all under
`/_lab2/test/…`. It answers **404 to `/_lab2/default`** on purpose: the live
bench's autosave must never find a door on this server.

### The whole suite, in the order it is run

Thirty-one commands, all from `site/`. This is the list `press/CHANGELOG.md`'s
Phase 9 step 1 entry ran on 2026-09-07 with its result and wall time beside
each; run them **one at a time** — two headed Chromes on one machine skew each
other's frame times. The twelve Node-only tools need no server; everything
from `verify-tracer.js` down needs the sandbox server up on 4322, except
`verify-bench.js` and `smoke-bench.js` — which open the SANDBOX bench at
`http://localhost:4321/lab2/test/`, i.e. served by the owner's own server, so
that its door 404s and nothing can be written — and `verify-import.js`, which
starts a server of its own on a free port.

    # no browser, no server — twelve tools, about twenty seconds in all
    node lab2/test/press/tools/test-palette.js         # 51/51    the quantiser and the OKLCH arithmetic
    node lab2/test/press/tools/test-fonts.js           # 357/357  the nine pairings against fonts.css
    node lab2/test/press/tools/test-theme.js           # 3477/3477  palette → token sheet
    node lab2/test/press/tools/attack-theme.js         # 162698/162698 over 2000 random palettes
    node lab2/test/press/tools/test-schemas.js         # 174/174  the seven schemas + the validator
    node lab2/test/press/tools/test-recipes.js         # 197/197  the three layouts
    node lab2/test/press/tools/test-serve.js           # 163/163  the server's doors, required not run
    node lab2/test/press/tools/check-fixtures.js       # all 3 fixture folders hold, and each is under 300 KB
    node lab2/test/press/tools/check-sheet.js          # 28/28    the built sheet as text
    node lab2/test/press/tools/test-vibe.js            # 133/133  the vision call over a stubbed transport
    node lab2/test/press/tools/test-intake.js          # 59/59    api/intake.js against a local token folder
    node lab2/test/press/tools/test-build-game.js      # 98/98    the generator

    # browser, server up on 4322 — seventeen verifiers
    node lab2/test/perf/verify-tracer.js               # 12/12    the tracing table still works
    node lab2/test/perf/golden-tracer.js               # 3/3      byte-identical `d` after the k-means moved out
    node lab2/test/perf/test-style.js [--update]       # 90/90    style.js goldens
    node lab2/test/perf/attack-style.js                # 19/19, 1 WARN
    node lab2/test/perf/verify-sheet.js …              # 387/387  RESTART THE SERVER FIRST
    node lab2/test/perf/verify-kits.js                 # 20/20    the three old kits, unmoved
    node lab2/test/perf/verify-kits-adv.js             # 47/47    kits.js under attack
    node lab2/test/perf/verify-kits-skin.js            # 62/62    re-skinning from --sk-* and data-sk-style
    node lab2/test/perf/verify-tray.js                 # 9/9      the tray on the bench
    node lab2/test/perf/verify-bench.js                # 24/24    the sandbox bench — but served from 4321, the LIVE server
    node lab2/test/perf/smoke-bench.js                 # ALL PASS  the same, five questions, load 826 ms, 0 documents
    node lab2/test/perf/verify-keep.js                 # 44/44    RESTART THE SERVER FIRST
    node lab2/test/perf/verify-template.js             # 17/17    writes games/_probe/ and leaves it
    node lab2/test/perf/verify-game.js [slug…]         # 145/147  RESTART THE SERVER FIRST — the two are pixelfort's, OPEN.md §2
    node lab2/test/perf/verify-press.js                # 119/120  (its one failure is verify-game's two)
    node lab2/test/perf/verify-import.js               # 55/55    starts its own server on a free port
    node lab2/test/perf/verify-floor.js                # 8/8      the tray against a bench without it
    node lab2/test/perf/probe-stickers.js              # 10/10 ACCEPT — ten minutes

    # and the live bench, read-only, on 4321
    node lab2/perf/measure.js press-final              # 7 scenarios, no regression

Two more that photograph rather than judge, and are not part of the suite:

    node lab2/test/perf/shot-games.js [slug…] [--label X]   # the three game pages at their own opening zoom
    node lab2/test/perf/shot-theme.js                       # a fixture's theme, drawn
    node lab2/test/press/tools/shot-preview.js              # the three mockups off the preview harness

### The flags, where a script has any

    node lab2/test/press/tools/make-fixtures.js            # the three synthetic games, regenerated
    node lab2/test/press/tools/build-game.js lab2/test/press/fixtures/pixelfort
    node lab2/test/perf/test-style.js [--update]          # style.js goldens, headless, server up on 4322
    node lab2/test/perf/attack-style.js                   # style.js under its own adversarial plates
    node lab2/test/perf/shot-games.js [slug…] [--label X]  # the three game pages, photographed at their own opening zoom
    node lab2/test/perf/verify-game.js [slug…] [--no-door] # §9 5.5: does a generated page WORK — server up on 4322, RESTART IT FIRST
    node lab2/test/perf/verify-press.js [fixture…] [--no-attacks|--no-game|--keep|--no-restart]
                                                           # §10 6.3: the Press Table driven from a folder of art to a built
                                                           # page, timed against the plan's two minutes, then attacked nine
                                                           # ways — server up on 4322; it builds to games/verify-<fixture>/
                                                           # and deletes them, and RESTARTS the server before verify-game
    node lab2/test/perf/verify-import.js [--keep] [--headless]
                                                           # §12 3+5: the WHOLE intake loop — publisher mode sends a bundle, the
                                                           # import field lists it, imports it and builds from it. Starts a server
                                                           # of its OWN on a free port with INTAKE_SECRET set, and stops it; it
                                                           # does not use 4322 and does not touch it

`shot-games.js` is how a composition is judged: it opens each page with the
door shut, shoots the whole viewport and a crop of the words, and writes a
`summary.json` with the opening zoom and the type's size in screen pixels.
Appendix E's coordinates were corrected against it and against
`verify-game.js` (`press/recipes.js`'s header lists the eight, and
CHANGELOG's Phase 5 entries have the before and after — the newest of them is
the opening rectangle that stopped being widened to the bench's aspect, the
34-unit note body it took to put a paragraph over 10 screen px on a laptop,
and the two blanks the widescreen pages carried).

`verify-game.js` is how a page is judged — the plan's own eight questions,
asked of the built page rather than of the generator that wrote it: it boots
clean; no panel is a document at any camera; every picture measures to its
own shape; **every screenshot is in its frame**, at the rect read back off
the sheet, over it in the pile, and PAINTED (a lattice of real screen pixels,
matched against a canvas cover-crop of each of the game's plates, so the
right picture in the wrong frame fails a check a count of four cannot); every
sticker wears the page's `--sk-*` and none of the sheet's own defaults; a
drop survives a ctrl+s and a reload in a fresh context; the opening rectangle
frames the composition at 2560 × 1111 and at 1366 × 768; and the store keys
are the page's alone, with the sandbox bench in the same storage seeing none
of them. Like `verify-sheet.js`'s second half and `verify-keep.js` it **writes
`games/<slug>/index.html` for real** and puts it back byte-identical in a
`finally` — so **restart the sandbox server first** (`serve.js` keeps one
`index.html.keep-bak` per file per process) and do not run it while another
phase is editing a game page.

`verify-import.js` is the whole of plan §12 in one run, and the only BROWSER
script here that needs no server already running (the twelve Node-only tools
above need none either): both halves of the intake — the publisher's door
in `api/intake.js` and the owner's import field in `press/import.js` — meet
over a real socket. It sets a random `INTAKE_SECRET` in its own environment
and starts a second `serve.js` on **port 0**, so the OS picks a free port and
it can never collide with 4322 or with another run of itself; it drives the
Press Table in publisher mode until SEND TO KNOLL hands back a token, then in
owner mode until that token is a filled-in form with six decoded pictures in
it, then presses BUILD. The token folder and `games/verify-import/` are
deleted in a `finally` (the token only if it is the 22-character one the run
recorded — the folder beside it may be a real bundle), and the server it
started is stopped. It also watches the secret: no request may carry it in a
URL, every intake request must carry `x-intake-secret`, and it must be in
`sessionStorage` and nowhere in `localStorage`.

The sticker kit has ten commands of its own, and they run in the order a
sticker is made — lint a part, look at it, build the sheet, check the sheet,
boot the sheet, re-skin it, put the tray on the bench and look at that, and
last measure what sixty of them cost on a page of their own and what the forty
of them cost the bench they stand on:

    node lab2/test/press/tools/palette-keys.js <part|all> [--fix]   # the linter: no literal colour survives
    node lab2/test/press/tools/render-part.js <part|all> [--palette knoll|neon|moss|all] [--scale 4] [--halo]
    node lab2/test/press/tools/build-sheet.js               # parts/*.html → features/stickers-core.dc.html
    node lab2/test/press/tools/check-sheet.js               # the built sheet as text, no browser, a tenth of a second
    node lab2/test/perf/verify-sheet.js [all | <part> …] [--shots N|all] [--no-sheet|--no-bench]
                                                           # two halves: the sheet booted part by part, then §8 4.7 on the bench — server up on 4322
    node lab2/test/perf/verify-kits-skin.js                # kits.js re-skinning the sheet from --sk-* and data-sk-style
    node lab2/test/perf/verify-tray.js                     # the tray on the bench: 48 kit parts, ZERO documents, and the photo
    node lab2/test/perf/probe-stickers.js [--presets a,b] [--cameras 20,166] [--out label]
                                                           # §8 4.6: sixty stickers per preset at six cameras, ~10 minutes for all ten
    node lab2/test/perf/verify-floor.js                    # §0.3's floor: the bench WITH the tray against the same bench without it, one run
    node lab2/test/perf/smoke-bench.js                     # the same bench, five questions — this one runs against 4321

`build-sheet.js` **overwrites `features/stickers-core.dc.html` whole** — the
sheet is built, never hand-edited; the part files in `press/tools/parts/` are
where a sticker is drawn, and it refuses to build if `palette-keys.js` finds a
literal colour in one of them. **The probe's numbers therefore live in
`build-sheet.js`'s header template**, not in the sheet: written into the sheet
they would last until the next build.

`probe-stickers.js` writes its own pages into `perf/fixtures/` (gitignored,
like `perf/results/`) — one per preset plus an empty one for the floor, each
`games/_template.html` with its placeholders filled, so what is measured is
the page that ships. It lands in `perf/results/stickers/` **only when it
measures the whole table**; give it `--presets` or `--cameras` and it writes
`perf/results/stickers-partial/` instead (or `--out <label>`), because
`stickers/` is the folder the shipped sheet's header cites for all ten presets
and a three-preset check must not quietly replace it.

`verify-floor.js` writes two more pages into `perf/fixtures/` — `index.html`
itself with a `<base>`, and the same file with the tray cut out between its own
markers — and measures both in one run at the same three cameras, so what it
reports is what the forty sections added and not what the machine felt like
that minute. Eight checks: no documents, no iframes, every sticker a kit part,
no `filter`/`mix-blend-mode` on a section or `#bench-world`, no `{{ }}` in any
drawing, the copy behaving like the bench, the idle delta inside half a frame,
and silence in the console.

`verify-sheet.js`'s second half is the one script here
besides `verify-keep.js` that writes `index.html` for real (it copies, pastes
and saves a sticker through the sandbox's own door, then puts the file back
and proves it byte-identical): **restart the server before running it**, since
`serve.js` keeps one `index.html.keep-bak` per process, and do not run it
while another phase is editing the page.

Playwright resolves from `Desktop/node_modules` when run from `site/`
(headed system Chrome, as every `lab2/perf/*.js` does; the sheet renderers and
`test-style.js` run the same channel headless, because they only draw).

## What is a copy and what is new

| here | what |
|---|---|
| `wall.js ink.js tape.js vol.js gif.js sign.js spotlight.js lab.css` | copies of the bench, **unchanged**. From here, `for f in wall.js ink.js tape.js vol.js gif.js sign.js spotlight.js lab.css; do diff ../$f $f; done` prints nothing |
| `lab.js frames.js kits.js keep.js tracer.js` | copies **with the plan's changes** — the `diff` IS the merge. `lab.js` 13 hunks, `frames.js` 1, `keep.js` 7, `tracer.js` 8; `kits.js` is a rewrite of its extraction half and is not a hunk list. `MERGE.md` names every one of them and what it does |
| `fonts/` | the house faces (copies) plus **four new woff2 behind six `@font-face` rows** appended to `fonts.css`, and the four licence texts beside them. `diff -rq ../fonts fonts` is ten lines: the eight new files, `fonts.css differ`, and `google.css.txt` which is the live folder's own note and was not copied |
| `features/` | the three kit sheets, `bare.css`, `prelude.js`, `support.js` (copies) and the new `stickers-core.dc.html` |
| `features/stickers-core.dc.html` | **the fourth kit sheet, and the only new drawing in the folder**: the forty stickers of the plan's Appendix D in one Design Canvas document, one `<sc-if>` per part, `#part=` in the URL — the shape `village.dc.html` has. It is unlike the other three in one way, which is the whole point of it: not one part holds a colour. Every fill and stroke is a role — `{{ skPrimary }}`, `{{ skInk }}`, `{{ skPaper }}` … — every outline width is `{{ skStroke }}`, every corner `{{ skRadius }}` and every word `{{ skText }}`, and `kits.js` fills them once per page load from that page's `--sk-*` tokens. So the same forty drawings are Knoll's pinks on this bench (the sheet's own defaults, taken from `lab.css`) and a game's colours on a game page. 224 K, the biggest sheet by four times; **it is generated** — `build-sheet.js` writes it and an edit made in it is lost at the next build |
| `press/tools/parts/` | where a sticker is actually drawn: one `<part>.html` per part, one `<sc-if>` wrapping one 128-unit `<svg>` whose direct children are the `<g data-layer="halo shadow body line highlight detail">` groups the style pass edits. One file per part so forty of them can be drawn, linted and reviewed one at a time; `INDEX.md` beside them is the built table of all forty (also generated). `palette-keys.js` is the contract's enforcement — it rewrites Appendix D's six placeholder literals into roles and fails on any colour it does not know |
| `vendor/` | the two React builds (copies) |
| `posters/index.json` | empty — the sandbox has no machines |
| `index.html` | the sandbox bench: one caption prop, a stand of eight kit parts, and the tray — all forty stickers in Knoll colours, eight across and five down. 48 kit sections and **no documents at any zoom** (`ADDING.md` §5), which is what `perf/smoke-bench.js` counts |
| `press/` | the Press Table: twelve files at its root (`palette.js theme.js style.js fonts.js recipes.js preview.js store.js vibe.js press.js import.js press.css index.html`), `schemas/` (7 JSON, 11.6 KB), `tools/` (18 Node scripts, `lib/` ×5, five harness pages, `parts/` ×40 + `INDEX.md`), `fixtures/` (30 files, three games), and its own `README.md`, `CONTRACTS.md`, `NOTES.md`, `CHANGELOG.md` |
| `games/` | `README.md`, `_template.html`, `_probe/` and one folder per generated page — `pixelfort`, `mosslight`, `neonrun` (the CLI's) and `pixelfort-press` (the Press Table's, kept as evidence). `games/README.md` says which is which |
| `api/` | `vibe.js`, `intake.js` — Vercel functions, mounted locally by `serve.js`. **Restart the server after editing either**: Node caches the require |
| `perf/` | the sandbox's twenty probes and verifiers; results under `perf/results/` and generated pages under `perf/fixtures/`, both gitignored |
| `serve.js` | the sandbox server. Two constants say where the sandbox is (`PREFIX`, `DIR`) and the port default is the third |
| `MERGE.md` | how each piece goes into the live bench, `serve.js` and `vercel.json` — and the paragraphs written for `about.md` and `ADDING.md`, which this sandbox may not edit |
| `OPEN.md` | what is waiting on the owner, and what was measured and left standing on purpose |

`press/README.md` is the one to read if you want to USE the thing — running
it, importing an intake, adding a sticker part, adding a font pairing, the env
vars and the deploy checklist. `press/NOTES.md` is the discovery record (the
plan's five questions, and every place the codebase disagreed with the plan).
`press/CONTRACTS.md` is what the phases agreed on before any of them was
built. `press/CHANGELOG.md` is the per-phase note the plan's definition of
done asks for, newest at the top, and its first entry is the way in.
