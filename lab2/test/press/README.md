# press/README.md — the Press Table: running it, feeding it, extending it

A folder of game art goes in and a **game page** comes out: a bench with one
game on it, in that game's own colours, its screenshots in stickers' frames,
its words as notes and its store links as a sign. This file is how to run
that, how to feed it somebody else's press kit, and how to add the four kinds
of thing it can be extended with.

`CONTRACTS.md` is what the parts promise each other, `NOTES.md` is where the
codebase disagreed with the plan, `CHANGELOG.md` is what was built and what
was measured, and `../MERGE.md` is how all of it goes into the live bench.
This one is for using it.

**Paths.** Every command here runs from `site/` — the folder with `serve.js` —
and carries the sandbox's `lab2/test/` prefix. After the merge
(`../MERGE.md` §5 step 6) that prefix is `lab2/` and the port is 4321; nothing
else about these commands changes.

---

## 1 · Run it

    node lab2/test/serve.js 4322          # from site/, in the background

- the Press Table ......... http://localhost:4322/lab2/test/press/
- a game page ............. http://localhost:4322/lab2/test/games/&lt;slug&gt;/
- the sandbox bench ....... http://localhost:4322/lab2/test/
- the sticker sheet ....... http://localhost:4322/lab2/test/features/stickers-core.dc.html#part=burst

It has to be **served**, never opened off the disk: the page fetches its
schemas, `kits.js` fetches the sticker sheet, and the build button posts
through a door. 4322 is the sandbox's port; 4321 is the owner's own server and
this one answers **404 to `/_lab2/default`** on purpose, so a live bench
opened against it can never save into the sandbox.

**Restart the server** after editing `api/vibe.js`, `api/intake.js` or
`press/tools/build-game.js` — Node caches those requires — and before any test
that asserts on `index.html.keep-bak`, because one backup is kept per file per
server process.

### The two modes

The page knocks on its own door at boot, the same three lines `keep.js` uses
(`CONTRACTS.md` §0).

- **the door answers → owner mode.** The last button is BUILD, it posts to
  `/_lab2/test/build`, and the whole dial panel is there.
- **no door → publisher mode.** The same drop zone, the same reading and the
  same three mockups — a publisher should see exactly what the owner will —
  but the button says SEND TO KNOLL, it posts to the intake, and the dials are
  cut to accent, preset and hero. How the SITE looks is not the publisher's
  decision. **This is what the deployed page is**, because there is no door on
  Vercel.

To see publisher mode locally, open the page and block the door in devtools,
or run `node lab2/test/perf/verify-import.js --headless`, which drives both
modes end to end on a server of its own.

---

## 2 · A folder of art to a page

1. **Drop the art.** Up to twelve files, 25 MB in all — PNG, JPEG or WebP.
   A logo (alpha channel actually used), key art or a hero, and screenshots.
   The table classifies them and you can override any of it.
   **Drop a `manifest.json` in with them** and the words fill themselves in;
   that is what the three fixtures do.
2. **Watch the reading.** `palette.js` quantises the colours, `style.js`
   measures the style — is there a pixel grid, are there outlines, how much
   texture — `theme.js` turns the palette into a `:root` of tokens with the
   contrast floors met, `fonts.js` offers three pairings, and `vibe.js` asks
   the model if there is a key on the server. **A measurement always beats a
   judgement**, and with no key the panel says so in a line of its own and
   everything above it still stands.
3. **Type the words.** Title, slug, tagline, description, developer,
   publisher, release, store links. Every keystroke is kept in
   `knoll-press:*` in localStorage, so a reload in the middle is an
   inconvenience; the PICTURES are not kept (a dozen screenshots as base64 is
   tens of megabytes) and the drop zone asks for the folder again.
4. **Pick one of three compositions.** `recipes.js` lays the same material out
   as a poster, a widescreen and a scrapbook, and `preview.js` draws all
   three. Each card is a 5 : 4 stage of the GAME's own paper with the
   composition fitted into it and centred, so a portrait card and a landscape
   card stand side by side and neither is cropped — read a card for what is on
   the paper and in what order, never for how much paper is round it.
5. **Tick the rights box and press BUILD.** It refuses without it, by DOM
   click and by `Press.build()` alike, because the schema says
   `rights.attested` is `const: true`.

Out comes `games/<slug>/` — `index.html`, `game.json`, the re-encoded `art/`
and a `posters/index.json` of `{}` (not optional: `frames.js` fetches it and a
folder without one takes a 404 on every visit). `games/README.md` has the
folder in full.

**How long it takes, measured** (`perf/verify-press.js`, 2026-09-07, headed
Chrome 152 at 1600 × 1000): first file landing to the page answering 200 was
**8.6 s / 9.1 s / 9.0 s** for the three fixtures of machine time, and
**48.6 s / 49.1 s / 44.5 s** with the typing put back at five characters a
second and the description pasted. The plan asked for under two minutes. What
neither number contains is the owner's own thinking — the script picks the
first card and turns no dial.

**A rebuild is not a save.** `build-game.js` refuses to overwrite an existing
`index.html` unless it is told to force, and forcing throws your arrangement
away after taking a backup. Everything you move on the page afterwards is
`keep.js`'s, written back in place; a comment you type into a generated page
survives every save.

### Or from the command line

    node lab2/test/press/tools/build-game.js lab2/test/press/fixtures/pixelfort

Same generator, same output, no browser. `[--force]` overwrites,
`[--out <slug>]` builds somewhere else.

---

## 3 · Importing an intake

A publisher with a link and no account fills in the same page in publisher
mode and presses SEND TO KNOLL. `api/intake.js` checks the bundle, strips
every picture of everything that is not picture, files it under a random
22-character token and hands the token back. **Nothing is published by that** —
an intake is a folder waiting for somebody to look at it.

To pull one in, on the Press Table in owner mode:

1. **Press LIST and pick a row**, or paste the 22-character token the
   publisher was given. A row reads like
   `"Pixelfort" — Sep 7, 2026 · 34 KB · 6 pictures · fixture`.
2. **The secret is the server's `INTAKE_SECRET`**, typed once and kept **for
   that tab** — `sessionStorage`, so a reload keeps it and a new tab asks
   again. It is never in `localStorage`, never in the page's source and never
   in a URL: it goes in an `x-intake-secret` header, and `api/intake.js`
   refuses it in a query string. A wrong secret re-locks the field and is
   forgotten; a server started with **no** `INTAKE_SECRET` answers 503, and
   the panel says that is the SERVER having no secret rather than you having
   mistyped one.
3. **The bundle arrives as if it had been dropped** — the words, the roles and
   the pictures, handed to the page as real `File` objects. Then continue to
   BUILD as usual. **Importing publishes nothing; BUILD does.**

An import **replaces** what is on the table: every picture already on it is
taken off first, object URLs and all, because an intake is a whole thing with
its own words, its own roles and its own art. If you were half way through
typing something, build it or lose it before you import.

Locally the intake is on your own `serve.js` and the token folders are
`press/cache/intake/<token>/` (gitignored). **Deployed, read `../OPEN.md` §1
before setting `INTAKE_SECRET` on Vercel** — the honest answer today is to
leave it unset, which shuts both owner doors with a 503, and to import from a
machine running the local server. A publisher can still submit either way:
SEND TO KNOLL needs no secret at all.

To exercise the whole loop without touching anything:

    node lab2/test/perf/verify-import.js [--headless]

It sets its own random `INTAKE_SECRET`, starts a second server on **port 0**
so the OS picks a free port, drives publisher mode until a token comes back,
then owner mode until that token is a filled-in form, presses BUILD, and
deletes everything it made. 55/55, about seventy seconds, and it never opens
4322.

---

## 4 · Adding a sticker part

The sheet is **built, never drawn in**. `features/stickers-core.dc.html` is
written whole by `tools/build-sheet.js` out of one file per part in
`tools/parts/`, and an edit made in the sheet is lost at the next build.

**A part holds no colour at all.** Every fill and stroke is a role —
`{{ skPrimary }} {{ skSecondary }} {{ skInk }} {{ skPaper }} {{ skHighlight }}
{{ skShadow }}` — every outline width is `{{ skStroke }}`, every corner
`sc-camel-rx="{{ skRadius }}"` (never a raw `rx=`, which the browser reads as
a length and answers with a console error), and every word `{{ skText }}`.
`kits.js` fills them once per page load from that page's `--sk-*` tokens, so
the same drawing is a Knoll sticker here and a neon one on a dark game page.

**The shape of a part file** (`CONTRACTS.md` §8): one `<sc-if>` wrapping one
128 × 128 `<svg>` whose direct children are `<g data-layer="…">` in this
order — `halo` (hidden by default), `shadow`, `body`, `line`, `highlight`,
`detail`, then optionally `image-slot` and `text`. The style pass edits those
layers by name, so a drawing that puts its outlines in `body` cannot be
re-weighted or wobbled. Allowed elements are the kit rules of `ADDING.md`
§1.2: `path circle rect ellipse line g text`, and **no `<image>`** — a picture
in a frame is composed by the PAGE, as a second section over the sticker.

The six steps, in the order a sticker is actually made:

    node lab2/test/press/tools/palette-keys.js <part> --fix   # 1. rewrite literals → roles, then lint
    node lab2/test/press/tools/render-part.js <part> --palette all --scale 4
                                                             # 2. look at it, in three palettes
    node lab2/test/press/tools/build-sheet.js                # 3. parts/*.html → the sheet
    node lab2/test/press/tools/check-sheet.js                # 4. 28/28, the sheet as text, no browser
    node lab2/test/perf/verify-sheet.js <part>               # 5. boot it — server up on 4322
    node lab2/test/perf/probe-stickers.js                    # 6. what sixty of them cost, ~10 minutes

`palette-keys.js` is the contract's enforcement rather than its description:
draw in the six placeholder literals Appendix D names (magenta, cyan, black,
white, yellow, navy), and `--fix` rewrites them into roles. It **fails on any
other colour**, on a raw `rx`, and on a `sc-camel-rx` that is not
`{{ skRadius }}`; `build-sheet.js` refuses to build a sheet with a fault in
it, and refuses a `parts/` file that is not one of the forty.

**A forty-first part is four edits, not one.** The forty are a contract that
four files hold each other to:

1. the drawing, `tools/parts/<id>.html`;
2. a row in `TAGS` in `tools/build-sheet.js` — `[id, what it is, [tags],
   [extra layers]]`;
3. a row in **Appendix D of `../../PRESS-TABLE-PLAN.md`** — `check-sheet.js`
   reads the plan's own table and holds the sheet to it, id for id, tag for
   tag, in order;
4. the id in `Recipes.PARTS` in `recipes.js` — `tools/test-recipes.js` holds
   that list to the sheet's own.

And two rules a recipe will hold you to (`CONTRACTS.md` §13): a part drawn
round an `image-slot` is **never placed without a picture** (the empty slot
draws an opaque `{{ skPaper }}` rect — a white square on a light page), and a
part with a `text` layer is never placed without words (`skText` defaults to
`''`). If there is nothing to put there, choose a part that has no slot.

**A part with `<text>` in it is live for ever.** A webfont cannot reach inside
an image, so those eight are never sprites at any distance. Eight is what was
measured; think before adding a ninth.

---

## 5 · Adding a font pairing

`fonts.js` has nine — `clean pixel hand rustic gothic comic cozy scifi
typewriter` — and each is a display face, a body face, a mono and sometimes an
accent. A tenth is five things:

1. **The woff2 in `../fonts/`.** Ask the Google Fonts CSS2 API with a Chrome
   desktop User-Agent so it answers woff2 with unicode-ranges, save the latin
   block, and copy its `unicode-range` into the row. A family that arrives as
   one variable file serves several weights from the one file (Fredoka and
   Orbitron do).
2. **The `@font-face` row in `../fonts/fonts.css`**, one line, in the file's
   own style, one weight per row.
3. **The licence text beside the face** — `<Family>-OFL.txt`, byte-identical
   to `google/fonts` main. This is not optional and it is not decoration: a
   self-hosted font is a redistributed copy, and a woff2's `name` table holds
   the copyright line and a URL to the licence but **never the licence
   itself** (all nineteen faces in `fonts/` were opened and checked —
   `NOTES.md` §D.18). Check the licence while you are there: three of the four
   this project added are OFL and **Special Elite is Apache 2.0**, which is
   `../OPEN.md` §1's first open decision.
4. **The family in `FAMILIES` and the pairing in `PAIRINGS`**, in `fonts.js`.
   `FAMILIES` is weight → file plus a CSS stack with real fallbacks; `faces`
   is COMPUTED from it, so it cannot drift. An unknown family throws at load.
5. **The id in the enum** in `schemas/theme.schema.json`, and a row in
   `RULES` in `fonts.js` if a style preset should offer it.

Then:

    node lab2/test/press/tools/test-fonts.js     # 357/357 — it reads fonts.css off
                                                 # the disk and fails if a row and a
                                                 # file disagree
    node lab2/test/press/tools/fonts-check.html  # open it in the browser to see them set

## 5.1 · Adding a style preset

Ten presets (`style.js`'s `PRESETS`, the plan's Appendix C). An eleventh is
the prototype vector in `style.js`, the id in `schemas/style.schema.json`'s
`preset` enum (`vibe.schema.json` `$ref`s the same enum, so that is also what
puts it on the model's menu), a row in `fonts.js`'s `RULES`, a row in Appendix
C — and **nothing in `kits.js`**, which reads the vector's fields and never
the preset's name. Then `node lab2/test/perf/probe-stickers.js`, the whole
table and not `--presets yours`: a partial run writes
`perf/results/stickers-partial/` on purpose, because `perf/results/stickers/`
is the folder the shipped sheet's header cites for all ten. The full run
takes about ten minutes and must come back ACCEPT, with an idle median at the
display floor and no frame over 34 ms.

---

## 6 · The environment

Everything reads the same names locally and on Vercel. **All four are
optional, and the page is built so that each one being absent is a stated
condition rather than a broken screen.**

| variable | who reads it | absent |
|---|---|---|
| `ANTHROPIC_API_KEY` | `api/vibe.js` | `200 {vibe: null, error: 'no ANTHROPIC_API_KEY'}` — **not** a 500, because a Press Table without a key is a Press Table that still works. Every preset, pairing and recipe has a measured heuristic behind it and the panel says the judgement is missing. **This is the state of this machine: the call has never been made** (`NOTES.md` §D.11) |
| `INTAKE_SECRET` | `api/intake.js`, for the owner's two doors (`?list=1` and `?token=`) | both answer **503**, and that is the rule rather than an accident: an absent secret is never an open door. SEND TO KNOLL still works — a publisher needs no secret |
| `BLOB_READ_WRITE_TOKEN` | `api/intake.js` | it writes to `press/cache/intake/<token>/` on the local filesystem instead. On Vercel the filesystem is read-only, so **deployed without it the intake cannot store anything** |
| `KV_REST_API_URL` + `KV_REST_API_TOKEN` | `api/vibe.js`, for the judgement cache | it caches to `press/cache/` locally (`!process.env.VERCEL`), and does not cache at all on Vercel. A repeated call is then a repeated bill, not an error |

`ANTHROPIC_BASE_URL` is read if set, for a proxy. Nothing else is read
anywhere.

Locally, put them in the environment of the shell that starts `serve.js` —
the server passes its own `process.env` to the two functions it mounts.
`start-lab2.bat` is unchanged and knows nothing about any of this.

---

## 7 · The deploy checklist

`../MERGE.md` is the whole merge; this is the part of it that is the deploy.
In order:

1. **`site/vercel.json`** — two rewrites (`/press/:path*` and `/games/:path*`)
   and four header rules, each cache rule written **twice**, once for
   `/lab2/press/(.*)` and once for `/press/(.*)`. Vercel matches a header rule
   against the path the browser asked for and not against the one the rewrite
   returns, so one spelling of each is a file that goes out with no cache time
   at all. **Nothing** for `/games/(.*)/index.html`: it changes every time the
   owner saves. `../MERGE.md` §2 has the exact JSON.
2. **`site/api/`** — `vibe.js` and `intake.js` at the PROJECT ROOT's `api/`,
   which means `site/` must be the Vercel project root. File-system routing;
   no `functions` entry. (The plan's own default, and unverified against the
   dashboard.)
3. **The environment**, §6. `ANTHROPIC_API_KEY` if the vision call is wanted;
   the Blob token if the intake is to store anything; **`INTAKE_SECRET` left
   UNSET** until there is a real session — `../OPEN.md` §1 argues it, and the
   short version is that a long-lived shared bearer secret unlocks every
   publisher's bundle with no expiry, no revocation and no audit.
4. **`.vercelignore`** — it already excludes `lab2/perf`. Add
   `lab2/press/fixtures` and `lab2/games/*/_src`. **Do not exclude
   `lab2/press/tools`**: `index.html` loads `tools/lib/validate.js` with a
   `<script>` tag, and without it the page dies at its first schema check.
5. **`site/.gitignore`** — `lab2/press/cache/`, `lab2/games/*/_src/`,
   `lab2/games/*/index.html.keep-bak`, `lab2/perf/fixtures/`.
6. **Rebuild the posters if a machine's drawing changed** —
   `node lab2/perf/posters.js` with `serve.js` up. A game page has no machines
   and needs none; this is the bench's own rule (`about.md` §9) and it is on
   the list because a merge is when it gets forgotten.
7. **Commit `games/<slug>/` for every page that is to be public.** The pages
   are static files in the repo: `index.html`, `game.json`, `art/` and
   `posters/index.json`. Not `_src/` and not `index.html.keep-bak`.
8. **Know what the deployed page IS.** `knoll.space/press/` is the Press Table
   in publisher mode, because there is no door on Vercel; `knoll.space/games/
   <slug>/` is a game page whose autosave knocked once, heard a 404 and went
   quiet for good. Neither of those is a fault to go looking for.

**One thing the plan asks for cannot be built as written.** A Vercel
Serverless Function's request body limit is 4.5 MB and the plan's intake
bundle is 25 MB, so a real deployment needs the browser to PUT straight to
Blob storage with a token the function issues. `../OPEN.md` §1 has it, and it
is the owner's call before this is deployed in earnest.

---

## 8 · Testing it

`../README.md` lists all thirty-one commands of the suite in the order they
are run, with what each one last said. The four that are about this folder:

    node lab2/test/press/tools/test-schemas.js    # 174/174  the seven schemas + the validator
    node lab2/test/press/tools/test-recipes.js    # 197/197  the three layouts
    node lab2/test/press/tools/test-build-game.js #  98/98   the generator
    node lab2/test/perf/verify-press.js           # 119/120  the table driven from art to a page,
                                                  #          timed, then attacked nine ways

The one standing failure is `pixelfort`'s opening rectangle and it is
arithmetic: a 1.26 : 1 composition centred in a 2.45 : 1 bench cannot leave
less than 24.24 % of the screen bare at the sides. `../OPEN.md` §2 has the
adjudication, and `verify-game.js` prints the floor beside each failure so a
reader can tell the arithmetic from the generosity.
