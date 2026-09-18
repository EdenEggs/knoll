# MERGE.md — how each piece of the sandbox goes into the live bench

The sandbox (`lab2/test/`) is a copy of the bench with the Press Table built
on top of it, and nothing in the live bench, `site/serve.js` or
`site/vercel.json` has been touched. **Nothing here has happened.** This is
the plan for making it happen, written so that the merge is a checklist and
not an archaeology exercise: every file accounted for, every hunk named,
every line to paste written out, and the order to do it in.

The rule that makes a merge mostly a MOVE: every page derives its door and
its prefix from `location.pathname` (`press/CONTRACTS.md` §0), every path that
leaves `lab2/` is absolute, and the sandbox's `serve.js` holds where it is in
two constants. So the merge is a folder move, three literals in `serve.js`,
five patched runtime files, six `@font-face` rows, one `<script>` line, the
`vercel.json` block in §2 and the gitignore lines in §4 — not a
search-and-replace through the pages.

**How to read this file.** §0 is the inventory: every one of the 238 files in
`lab2/test/` is in it, as one of three things — a byte-identical copy of a
live file (with the command that proves it), a copy WITH changes (with its
hunks), or new. §1–§4 are the four things that are not a file move: the
server's constants, `vercel.json`, the fonts, the gitignore. §5 is the order
and what to re-run after each step. §6 is what is NOT ready and why. Then two
blocks appended by earlier passes (the import field, the mockups' stage),
kept where they were; and last the paragraphs written for `about.md` and
`ADDING.md` — the two live files this sandbox may not edit.

Counted 2026-09-07: **238 files** under `lab2/test/` once `perf/results/`,
`perf/fixtures/`, `press/cache/` and `*.keep-bak` are left out (819 with
them). Of those, **31 are byte-identical**, **9 differ from a live file of the
same name**, and **198 are new**. The three numbers are reproducible — §0.4
has the script that recomputes them.

---

## 0 · The inventory

### 0.1 Byte-identical copies — 31 files, and the merge DELETES them

They exist so the game-page template's relative paths (`../../lab.js`,
`../../features/…`) resolve in the sandbox exactly as they will after the
merge. Nothing about them changes; the merge deletes the copy after an empty
`diff`. **If a diff is not empty, the sandbox drifted and the live file
wins.**

| where | files | the proof |
|---|---|---|
| `lab2/test/` | `wall.js ink.js tape.js vol.js gif.js sign.js spotlight.js lab.css` (8) | from `lab2/test/`: `for f in wall.js ink.js tape.js vol.js gif.js sign.js spotlight.js lab.css; do diff ../$f $f; done` — prints nothing |
| `features/` | `bare.css forest.dc.html gnome.dc.html village.dc.html prelude.js support.js` (6) | `diff -r lab2/features lab2/test/features` from `site/` — every line is an `Only in` one: fifteen machines the sandbox did not need, and `Only in lab2/test/features: stickers-core.dc.html` |
| `vendor/` | `react.production.min.js react-dom.production.min.js` (2) | `diff -r lab2/vendor lab2/test/vendor` — one line, `Only in lab2/vendor: trystero-nostr.js` (the cursors bundle; a game page has no cursors, `press/NOTES.md` §D.7) |
| `fonts/` | the fifteen house faces — `Kalam` ×2, `Pirata-One`, `Public-Sans` ×4, `Rye`, `Sora` ×3, `Space-Mono` ×2, `UnifrakturMaguntia`, `VT323` | `diff -rq lab2/fonts lab2/test/fonts` — ten lines, and every one of them is §3's business |

### 0.2 The nine files that differ — five are the merge, four are not

| file | what it is | what to do |
|---|---|---|
| `lab.js` | **copy with the plan's changes.** `diff lab2/lab.js lab2/test/lab.js` is **thirteen hunks**: three for the opening rectangle (the paragraph in WHERE IT OPENS at line 1555, the `rectAttr` reader and `OPEN_WIDE`/`OPEN_NARROW` after it at 1586, and `const HOME = phone ? OPEN_NARROW : OPEN_WIDE` at 1588), and ten for PAGE-SCOPED STORES (the `PAGE`/`NS` block replacing `const KEY` at 60; the four `'knoll-lab2:size2:'` literals at 367, 436, 497, 515; `ZKEY` at 545; `CAM_KEY`/`OLD_ZKEY` at 644; the twelve-line paragraph and `const storeKey` at 1166; `const K = NS + key` at 1169; and `storeKey` added to the returned object at 1978). | Apply all thirteen. The main bench carries neither `data-lab-page` nor `data-open`, so it opens where it did and its keys are the strings they were. |
| `frames.js` | **copy with one change.** One hunk at `const KEY` (line 69): the size key goes through `Lab.storeKey('size2:')`, with the old literal behind a guard for a `lab.js` from before `storeKey` existed. | Apply it **with** the `lab.js` hunks, never before them. |
| `kits.js` | **copy, rewritten.** Not a hunk list — the diff is about ninety hunks and the extraction half of the file is new: `SHEETS.stickers` (a fourth sheet, `SRC_RE` plus a one-row `SRC_KIT` map so a file name and a kit name cannot drift), the extractor hoisted above the `#bench-world` guard so a page with no bench still gets `{extractOnly, kindOf, isKitSrc, SHEETS, setStyle}`, the per-page palette read off `--sk-*`, per-section `data-palette` / `data-text` / `data-rot` variants keyed into the sprite cache, and the whole style pass (`restyle`, defs pruned and hashed per style, the pixel path). `press/CHANGELOG.md`, *Phase 4*, argues every one of them. | **Take the sandbox file whole.** The three old kits are asserted unmoved rather than reasoned about: `perf/verify-kits.js` 20/20 and `perf/verify-kits-adv.js` 47/47 here, and on the live bench `node lab2/perf/kitgeo.js after` against `results/kitgeo-before.json`. |
| `keep.js` | **copy with the plan's changes.** Seven hunks: two in the header (WHICH DOOR, and the three per-section words added to the list of what it writes), the door block and `skey()` at line 60, `look()` twice (the kit-section record at 129 and the copies record at 140), `stamp()` at 149, and the two `removeItem` calls at 207. On `/lab2/` the derived door is the same string it used to hard-code, `/_lab2/default`. | Apply all seven, with the `lab.js` hunks. **CRLF file** — patch by the file's own line endings, and remember a JS template literal normalises CRLF to LF (`about.md` §10). |
| `tracer.js` | **copy with the plan's changes.** Eight hunks: the header paragraph at 39, the `SAMPLE_CAP` line at 78, the 49-line `sampleOpaque` + `kMeansPalette` block at 283–331 replaced by a four-line note, the `if (!window.Palette)` guard at 474, `Palette.sample(imageData)` at 476, `Palette.kmeans(samples, K)` at 479, the `flash` condition at 514, and the library key through `Lab.storeKey('flatfile')` at 552. **It calls `Palette.sample` and `Palette.kmeans`, not `Palette.quantize`** — it needs the centroids themselves, to label the full image with. | Apply all eight, and **not before** `press/palette.js` is on the page (§5 step 2). `perf/golden-tracer.js` is the proof: byte-identical `d` on all three plates, 3/3. |
| `fonts/fonts.css` | **copy with one appended hunk** — 44 lines after line 19: a comment block and six `@font-face` rows. | §3. |
| `index.html` | **the SANDBOX bench, and it does not move.** The caption prop, the stand of eight kit parts and the tray of forty stickers are the sandbox's own furniture; 48 kit sections, 49 sections in all, no documents at any zoom. | Leave it here. What the LIVE `index.html` gains is one `<script>` line — §5 step 2 — and nothing else. **The live bench's prose counts do not change** (plan §0.3): eighty-four panels off seventy-one drawings, as they were. |
| `posters/index.json` | `{}` — the sandbox has no machines, and `frames.js` fetches this file unconditionally (`press/NOTES.md` §D.5), so a folder without one takes a 404 on every visit. | Delete. The live index is the live one, built by `perf/posters.js`. |
| `perf/verify-tracer.js` | `lab2/perf/verify-tracer.js` retargeted at the sandbox: the URL, a wider door block (`**/_lab2/**`), and its own results folder. **The only script name that exists in both `perf/` folders.** | **Delete it.** After the merge the live one is the one to run, and it is then testing the merged tracer against the merged `palette.js`. |

### 0.3 New — 198 files

Everything else. Nothing in this table exists in `lab2/` today, so "how" is
almost always "move it".

| where | count | what, and where it goes |
|---|---|---|
| `lab2/test/` | 5 | `serve.js` (→ merged into `site/serve.js`, §1), `README.md`, `OPEN.md`, `MERGE.md`, `.gitignore`. The four documents are the record and stay with the sandbox; the `.gitignore`'s lines are folded into `site/.gitignore` by §4 |
| `features/` | 1 | `stickers-core.dc.html` → `lab2/features/`. The fourth kit sheet, 224.4 KB, generated by `press/tools/build-sheet.js` and never hand-edited. `vercel.json` already rewrites `/features/:path*`, so **nothing to add for it** |
| `fonts/` | 8 | four `.woff2` and four licence texts → `lab2/fonts/`. §3 |
| `api/` | 2 | `vibe.js`, `intake.js` → **`site/api/`**, the project root's, not `lab2/`'s. File-system routing, no `vercel.json` entry — but `site/` must be the Vercel project root (`press/NOTES.md` §B.1, the plan's default, not verified against the dashboard) |
| `press/` | 16 | the twelve the page loads — `palette.js fonts.js theme.js style.js recipes.js vibe.js preview.js store.js press.js import.js press.css index.html` — and four documents: `README.md` (how to run it), `CONTRACTS.md`, `NOTES.md`, `CHANGELOG.md`. All → `lab2/press/` |
| `press/schemas/` | 7 | `manifest analysis theme style layout vibe game` `.schema.json`, 11.6 KB. **They ship**: the Press Table fetches them at boot (`Validate.loadFetch('schemas/')`, `press.js:1522`) |
| `press/tools/` | 28 | 18 Node scripts, 5 in `lib/`, 5 harness pages. **`tools/lib/validate.js` ships** — `press/index.html` loads it with a `<script>` tag. The rest are dev-only but must still RUN after the move (§5 step 6) |
| `press/tools/parts/` | 41 | the forty part files a sticker is actually drawn in, and the generated `INDEX.md` |
| `press/fixtures/` | 30 | three games × (`manifest.json`, `expected.json`, `stats.json`, `vibe-recorded.json`, six `art/*.png`). 676 KB. The test corpus, not content |
| `perf/` | 19 | the sandbox's probes and verifiers → `lab2/perf/`, beside the ones already there. §5 step 6 says which literals inside them move |
| `games/` | 2 | `README.md` and `_template.html` → `lab2/games/` |
| `games/_probe/` | 3 | the template's own fixture, rewritten by `perf/verify-template.js` on every run. Move it, or let the next run make it |
| `games/pixelfort/` `games/mosslight/` `games/neonrun/` | 9 each | `index.html`, `game.json`, `posters/index.json` and six `art/` files. The three fixture pages, built by the CLI and judged by `perf/verify-game.js`. **Regenerate nothing** — a generated page carries the owner's edits and `keep.js`'s saves, and a rebuild throws them away |
| `games/pixelfort-press/` | 9 | the page the Press Table itself built in the Phase 6 walk-through, kept as evidence. `games/README.md` says it is a decision and not a stray. Move it or delete it; nothing reads it |

### 0.4 Recomputing the three numbers

From `site/`, and it needs nothing but Node:

    node -e "const fs=require('fs');const root='lab2/test';
    function walk(d,o){for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=d+'/'+e.name;
    if(e.isDirectory()){if(/perf.results|perf.fixtures|press.cache/.test(p))continue;walk(p,o);}
    else{if(/keep-bak$/.test(p))continue;o.push(p);}}return o;}
    const f=walk(root,[]),s=[],d=[],n=[];
    for(const x of f){const l=x.replace('lab2/test/','lab2/');
    if(fs.existsSync(l)&&fs.statSync(l).isFile()){(Buffer.compare(fs.readFileSync(l),fs.readFileSync(x))===0?s:d).push(x);}else n.push(x);}
    console.log('total',f.length,'identical',s.length,'changed',d.length,'new',n.length);
    console.log('CHANGED:',d.join(' '));"

On 2026-09-07 it printed `total 238 identical 31 changed 9 new 198` and the
nine files of §0.2. **Run it before merging.** If `changed` names a file §0.2
does not, something drifted while this was being written, and the live file
wins until somebody has read the diff.

---

## 1 · `site/serve.js` — the constants, and the doors

The sandbox's `serve.js` **is** `site/serve.js` copied whole — the same static
handler, the same ETags, the same door functions, every guard
`press/NOTES.md` §C.1 lists kept — with the Press Table's doors added and the
whole thing running one folder deeper. So the merge is not "port the doors
across"; it is **take `lab2/test/serve.js`, change three literals, and let it
be `site/serve.js`.** (`diff site/serve.js lab2/test/serve.js` is 542 lines
over about forty hunks. Reading it once is worthwhile; applying it hunk by
hunk is not.)

**The three literals**, all within seven lines of each other:

| line | sandbox | merged | what it moves |
|---|---|---|---|
| 96 | `const PREFIX = '/test';` | `const PREFIX = '';` | the doors become `/_lab2/default`, `/_lab2/games/<slug>`, `/_lab2/build`, `/_lab2/vibe`, `/_lab2/intake` |
| 97 | `const DIR = 'lab2/test';` | `const DIR = 'lab2';` | `HOME` becomes `site/lab2`, `BENCH` becomes `site/lab2/index.html` |
| 102 | `… || 4322);` | `… || 4321);` | the live port. `PORT` is `process.argv[2] \|\| process.env.PORT \|\| <this>`, so `node serve.js 4321` never relied on the default anyway |

Two things that are not literals and are worth knowing before the swap:

- **The file's shape changes at the bottom.** The live server ends
  `}).listen(PORT, …)`; the sandbox's ends `if (require.main === module)
  listen(PORT); else module.exports = {…}`. That is deliberate —
  `press/tools/test-serve.js` REQUIRES the server and exercises the whole edit
  without opening a socket (163/163) — and it has to survive the merge or that
  test cannot run at all. The two `console.log` lines say "sandbox" and
  "press"; reword them to taste.
- **`KIT_SRC` gains `stickers-core`**, and the copy writer learns three
  attributes: `data-palette` (JSON, written double-quoted with the JSON's own
  quotes as `&quot;`), `data-text` and `data-rot`, each handled the way
  `data-cut` is — set in place on a value, dropped **and counted** on an empty
  one, left exactly alone when the client sends nothing, so an older `keep.js`
  cannot strip a word off a page somebody wrote it on. The never-shrinks guard
  grew to count the bytes a value loses IN PLACE as well as the bytes dropped,
  because a palette rewritten from six roles to one gets two hundred bytes
  shorter and would otherwise trip it. The slack stays at the original's 64. A
  lost `<section class="gz` is still refused.

**Restart the server after editing `api/*.js` or `press/tools/build-game.js`**
— Node caches those requires — and before any test that asserts on
`index.html.keep-bak`, since one backup is kept per file per server process.

---

## 2 · `site/vercel.json` — the exact lines

Appendix G of the plan, and `press/NOTES.md` §C.2. Written here in the shape
the file already uses, so they can be pasted. **Both rewrites use `:path*` on
both sides** — that is the form every other rewrite in the file takes;
Appendix G's `(.*)` → `$1` is Vercel's other syntax, and mixing the two in one
file is how a rewrite quietly stops matching.

Into `rewrites`, beside the `/features/:path*` line:

    { "source": "/press/:path*", "destination": "/lab2/press/:path*" },
    { "source": "/games/:path*", "destination": "/lab2/games/:path*" },

Into `headers`, beside the `/lab2/features/(.*)` rule (the 300-second one):

    {
      "source": "/lab2/press/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=300, stale-while-revalidate=86400"
        }
      ]
    },
    {
      "source": "/press/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=300, stale-while-revalidate=86400"
        }
      ]
    },

and beside the `(posters|fonts|vendor)` rules (the 3600-second ones):

    {
      "source": "/lab2/games/(.*)/art/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=3600, stale-while-revalidate=604800"
        }
      ]
    },
    {
      "source": "/games/(.*)/art/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=3600, stale-while-revalidate=604800"
        }
      ]
    },

**Both spellings of each path, and this is the thing about this file that
catches people.** Vercel matches a header rule against the path the BROWSER
asked for, not against the one a rewrite hands back, so a rule keyed on
`/lab2/press/(.*)` never sees a request for `/press/press.js`. `ADDING.md` §5
already says it for the bench's own top-level files; this is the same trap one
folder over.

**Nothing** for `/games/(.*)/index.html`. A game page changes every time the
owner saves it, and a long cache on it is the owner looking at yesterday's
arrangement. It falls through to Vercel's default, which is what Appendix G
asks for.

**No `functions` entry.** `api/vibe.js` and `api/intake.js` are file-system
routed from the project root's `api/`. What they do need is for `site/` to be
the Vercel project root — the plan's own default (§16 q1), and unverified.

**`.vercelignore`, which Appendix G does not mention.** It already holds
`lab2/perf`, so the nineteen scripts §0.3 moves there are off the deploy for
free. Two more lines are worth adding — and one must NOT be added:

    lab2/press/fixtures
    lab2/games/*/_src

**Do not exclude `lab2/press/tools`.** `press/index.html` loads
`tools/lib/validate.js` with a `<script>` tag, so excluding that folder ships
a Press Table that cannot validate anything and stops at its first schema
check. If the tools are to be kept off the deploy, that one file has to move
out of `tools/` first, and nobody has moved it.

---

## 3 · The fonts, and their licence files

**Four `.woff2`, six `@font-face` rows, four licence texts.** Copy the eight
files into `lab2/fonts/` and append the 44-line hunk to `lab2/fonts/fonts.css`
— it is the whole of that file's diff, after line 19 (`diff
lab2/fonts/fonts.css lab2/test/fonts/fonts.css`).

| file | family | rows it serves | licence beside it |
|---|---|---|---|
| `Bangers-400.woff2` | Bangers | 400 | `Bangers-OFL.txt` — OFL 1.1, 4 479 B, **CRLF upstream and it stays CRLF** (the md5 is what proves it verbatim) |
| `Fredoka-400.woff2` | Fredoka | 400 **and 600** — one variable file, two rows | `Fredoka-OFL.txt` — OFL 1.1, 4 388 B |
| `Orbitron-400.woff2` | Orbitron | 400 **and 700** — one variable file, two rows | `Orbitron-OFL.txt` — OFL 1.1, 4 426 B |
| `Special-Elite-400.woff2` | Special Elite | 400 | `Special-Elite-LICENSE.txt` — **Apache 2.0**, 11 358 B |

Three things a merge has to keep straight:

- **Special Elite is not OFL.** The plan (§6 step 4) asked for four OFL faces
  and three of them are. `ofl/specialelite/OFL.txt` on `google/fonts` is a
  404; the family lives under `apache/specialelite/` with `METADATA.pb:
  license "APACHE2"`. Apache 2.0 §4(a) allows the same self-hosting so long as
  the licence text travels with the copy, which is what
  `Special-Elite-LICENSE.txt` is. **It is `OPEN.md` §1's first decision**:
  keep it, or swap in an OFL typewriter (Courier Prime, Cutive Mono) — one
  file name and one row of `press/fonts.js` either way.
- **The licence texts are not `@font-face` rows and nothing loads them.** They
  are there because a self-hosted font is a redistributed copy and both
  licences ask a copy to carry its notice — and because the claim that a
  woff2 carries its own licence turned out to be false. All nineteen faces in
  `fonts/` were opened on 2026-09-07 (table stream brotli-inflated, `name`
  table parsed) and every one holds name record 0, the copyright line, and
  record 14, a URL — and not one holds record 13, the licence itself.
  `press/NOTES.md` §D.18 has the run.
- **The other eight families are in the same position and are left alone.**
  Sora, Public Sans, Space Mono, Kalam, Rye, Pirata One, UnifrakturMaguntia
  and VT323 arrived on 2026-09-04 with no licence text beside them. That is
  the owner's call, it predates this work, and the merge does not change it.

---

## 4 · Gitignore

Appendix G asks for three lines in `site/.gitignore`. **A fourth is needed**,
and Appendix G does not have it because the probes that write into that folder
were written after the plan was.

    lab2/press/cache/
    lab2/games/*/_src/
    lab2/games/*/index.html.keep-bak
    lab2/perf/fixtures/

- `press/cache/` — the vibe cache and the intake token folders.
- `games/*/_src/` — the originals an image was made from.
- `games/*/index.html.keep-bak` — `serve.js`'s one-per-run backup.
  `lab2/index.html.keep-bak` is already in the file; this is the same rule one
  folder down.
- **`lab2/perf/fixtures/`** — where `perf/probe-stickers.js` and
  `perf/verify-floor.js` write the pages they measure: eleven generated pages
  in a full probe run, each one `games/_template.html` with its placeholders
  filled, so that what is measured is the page that ships.
  `lab2/perf/results/` is already ignored; this is its sibling and is not.

The sandbox's own `.gitignore` is the same list relative to `test/`, plus
`*.tmp`; it stays with the sandbox.

---

## 5 · The order, and what to re-run after each step

Ten steps. Each ends with something runnable, so a merge that goes wrong is
wrong at a named step. Everything runs from `site/`, with the live server on
4321, unless a step says otherwise.

**Step 0 — take the baseline you will be judged against.** Before touching
anything:

    node lab2/perf/measure.js press-pre-merge
    node lab2/perf/boot.js press-pre-merge

`measure.js` was already run as `press-final` on 2026-09-07 and is the
comparison for the pan: identical to `press-baseline-2` at all seven cameras,
4 frames over 34 ms in the whole run, 7 panels booted and quiet after 2060 ms.
**`boot.js` has never been run for this work**, and step 2 is the step that
could move it — see §6.

**Step 1 — the runtime files, all five in one change.** `lab.js`, `frames.js`,
`keep.js`, `tracer.js`, `kits.js` (§0.2). In that order: `frames.js` reads
`Lab.storeKey`, so `lab.js` goes first, and `tracer.js` will not work until
step 2 puts `palette.js` on the page. Then:

    node lab2/perf/verify.js            # every gesture on the live bench
    node lab2/perf/kitgeo.js after      # then diff against results/kitgeo-before.json

**Step 2 — one `<script>` line in `lab2/index.html`.** Immediately before the
`<!-- the tracing table, which is IMAGE on the dock…` comment (line 9490 as
the file stands), paste the two-line comment and the tag exactly as the
sandbox bench has them:

    <!-- the quantiser the tracing table and the Press Table share — in press/, a
         folder, beside the table's other modules; before tracer.js, which calls it. -->
    <script src="press/palette.js"></script>

Then:

    node lab2/perf/verify-tracer.js     # 12/12 — the LIVE one, the sandbox's copy is deleted
    node lab2/perf/boot.js press-post-palette

and **compare that boot against step 0's**. Plan §13 1 is explicit about what
to do if it is slower: defer `palette.js` the way `cursors.js` is deferred
until idle. Nobody has taken that measurement (§6).

**Step 3 — the fonts.** §3. Then:

    node lab2/press/tools/test-fonts.js      # 357/357 — it reads fonts.css off disk
                                             # and fails if a row and a file disagree

**Step 4 — the sticker sheet.** `features/stickers-core.dc.html` into
`lab2/features/`. Nothing in `vercel.json` changes. Then:

    node lab2/press/tools/check-sheet.js     # 28/28, no browser, a fifth of a second

**Step 5 — the folders.** `press/` and `games/` into `lab2/`; `api/` into
`site/api/`; the nineteen new `perf/` scripts into `lab2/perf/`, and **delete
`lab2/test/perf/verify-tracer.js` rather than moving it** (§0.2).

**Step 6 — the literals inside the moved scripts.** Two substitutions and a
port, and they are only in the dev scripts and the documents:

    /lab2/test/   →  /lab2/          (page URLs)
    /_lab2/test/  →  /_lab2/         (door paths)
    4322          →  4321            (the port every harness talks to)

The `path.resolve(__dirname, '..')` constants in `perf/*.js` and
`press/tools/*.js` are **relative and move unchanged** — which is most of what
looks like a path in those files. `press/tools/test-serve.js` is the single
biggest edit (58 occurrences of the sandbox prefix; it is the door test, so
its expectations ARE the prefix). Everything that SHIPS carries the prefix in
comments only, with one exception: `press/index.html:130` has
`<em id="f-slug-where">/lab2/test/games/…/</em>` as placeholder text, which
`press.js` overwrites from `location.pathname` (`GAMES`, line 189) the moment
the slug field renders. Then re-run the suite — `README.md` lists all 31
commands — against `/lab2/` on 4321.

**Step 7 — `site/serve.js`.** §1. Then:

    node lab2/press/tools/test-serve.js      # 163/163, no socket
    node lab2/perf/verify-keep.js            # 44/44 — RESTART THE SERVER FIRST

**Step 8 — `site/.gitignore` and `site/.vercelignore`.** §4 and §2. `git
status` should show the moved files and nothing at all under `press/cache/`,
`games/*/_src/`, `*.keep-bak` or `perf/fixtures/`.

**Step 9 — `site/vercel.json`.** §2. This is the step only the deploy can
check. After it, `knoll.space/press/` is the Press Table in **publisher
mode** — there is no door on Vercel, so the last button says SEND TO KNOLL —
and `knoll.space/games/<slug>/` is a game page whose autosave has gone quiet
for good, which is what a non-200 on the knock means.

**Step 10 — the documents.** The paragraphs at the foot of this file into
`lab2/about.md` and `lab2/ADDING.md`, in the same change (plan §0.3). Then
`grep -rn "eighty-four\|seventy-one"` to confirm the bench's own two counts
did not need to move: **they did not**, because the plan adds no section to
the live `index.html`.

---

## 6 · What is NOT ready to merge, and why

Six things. None of them stops the merge; three of them decide what the merge
is allowed to claim afterwards.

1. **The deployed intake is not built, and the plan's §12 cannot be built as
   written.** A Vercel Serverless Function's request body limit is **4.5 MB**;
   the plan's bundle limit is **25 MB**. `api/intake.js` works — 59/59 against
   the local store, 55/55 through the whole loop over a socket — and a real
   deployment needs the browser to PUT straight to Blob storage with a token
   this function issues. That is a different shape from §12, it is the owner's
   call, and until it is made a deployed intake takes small bundles only.
2. **`INTAKE_SECRET` should be left UNSET on Vercel**, and `OPEN.md` §1 argues
   it at length. It is a long-lived SHARED bearer secret that unlocks EVERY
   publisher's bundle, with no expiry, no revocation and no audit; the fix is
   a real session (an `HttpOnly; Secure; SameSite=Strict` cookie the page
   cannot read) and it is not built. Unset, both owner doors answer 503 —
   `api/intake.js`'s own rule that an absent secret is never an open door —
   and the owner imports from a machine running the local server. **A
   publisher can still submit either way**: SEND TO KNOLL needs no secret at
   all.
3. **The vision call has never been made.** There is no `ANTHROPIC_API_KEY` on
   this machine (checked again 2026-09-07). Every model answer in every test
   is a hand-written fixture through a stubbed transport, and the recorded
   files say so in capitals in their own first field. The plumbing is proven —
   the request that would be sent, the schema, the server-side repair rules,
   the cache, the merge — and the call itself is not. `api/vibe.js` answers
   `200 {vibe: null, error: 'no ANTHROPIC_API_KEY'}` with no key, so a Press
   Table without one is a Press Table that still works.
4. **The merged bench's BOOT time is unmeasured.** Step 2 puts a 21 KB classic
   script in front of `tracer.js` on every visit to the bench. Plan §13 1
   asked for `boot.js press-final` and the Phase 9 suite took `measure.js`
   only. Nothing can be compared until step 0's baseline exists, which is why
   step 0 exists.
5. **`pixelfort` fails `verify-game.js` check 7 at both viewports and will go
   on failing it.** 28.40 % / 28.36 % of the screen empty left and right at
   2560 × 1111 against a floor of 24.24 %; 25.77 % / 25.76 % at 1366 × 768
   against a floor of 20.24 %. A composition of 1.26 : 1 centred in a bench of
   2.45 : 1 cannot do better, and `verify-game.js` prints that floor beside
   each failure so a reader can tell the arithmetic from the generosity.
   `OPEN.md` §2 has the whole adjudication. **The merge inherits two red lines
   and they are honest ones.** `mosslight` and `neonrun` pass at both
   viewports (L/R 19.96 % and 16.4 %, against floors of 13.43 % and 7.75 %).
6. **`scrapbook` has never been built as a page.** All three fixtures rank it
   second or third, so the recipe has been DRAWN as a mockup (0.99 : 1 on
   mosslight) and never generated, photographed or verified. The first person
   to build one should look at it at size.

And two smaller ones, both one line of `press/press.js`, both in `OPEN.md` §2:
a page built out of an intake records `source: "manual"` because `manifestOf`
writes the MODE rather than carrying the value the bundle brought; and a
publisher's `genres` are dropped by `applyManifest` before `api/intake.js`
ever sees them.

---

## 7 · The two blocks that follow, and what "the table above" means in them

Two earlier passes appended a block of their own to this file, and both are
kept below exactly as they were written. Both open by offering **rows to fold
into the table above** — and the table they mean was the row-per-item table
this file used to begin with, which §0 replaced with the full inventory. Their
rows are folded in already and nothing is lost by it: `press/import.js` is
named in §0.3's `press/` row, the appended `▼ … ▲` blocks in
`press/index.html` (lines 230–255) and `press/press.css` (lines 370–434) move
with those two files, `perf/verify-import.js` is one of the nineteen, and the
`INTAKE_SECRET` decision is §6 2. The mockups' pass added no file at all and
says so.

What is NOT folded in, and is the reason to read both blocks, is their
**paragraphs for `about.md` and `ADDING.md`** — three bites, a §9 paragraph,
a §2 row, a §12 sentence, a whole `ADDING.md` section and a bullet for its §5. The checklist at the
foot of this file lists every one of them beside the ones written there.

---

# ▼ The import field (plan §12 3) — what it adds to the merge, and the paragraphs the live docs want

Appended 2026-09-07 by the phase that built `press/import.js`. Everything
below is either a row to fold into the table above or a paragraph written for
a file this sandbox **must not edit** — `lab2/about.md` and `lab2/ADDING.md`
are the live bench's, so the words are kept here, finished, for the owner to
paste in the same change that moves the folder. Nothing here has happened.

## Rows to fold into the table above

| what | where it goes | how |
|---|---|---|
| `press/import.js` (new — `window.PressImport`) | `lab2/press/import.js` | Moves with the rest of `press/`. It derives its door from `location.pathname` in the same three lines `press.js` and `keep.js` use (CONTRACTS §0), so `/lab2/press/` gives `/_lab2/intake` and the deployed `/press/` gives `/api/intake` through the rewrite — no constant to change. |
| the appended block in `press/index.html` (`<div id="pt-import-mount" hidden>` + `<script src="import.js">`, between a `▼ … ▲` marker at the foot of the file) | `lab2/press/index.html` | Moves with the file. **It shrinks the day `press.js` grows a hook**: when press.js calls `PressImport.mount(el, {onBundle})` the panel is re-parented into whatever element press.js owns, the self-mount becomes a no-op, and the block is just the `<script>` line. |
| the appended block in `press/press.css` (the `.pi-*` rules, same marker) | `lab2/press/press.css` | Moves with the file. Every rule is `.pi-` prefixed and the block can be lifted out whole. |
| `perf/verify-import.js` (new) | `lab2/perf/verify-import.js` | Moves with `perf/`. It needs **no** running server: it starts one of its own on port 0 with `INTAKE_SECRET` in its environment and closes it in a `finally`. Merged, the two URLs inside it (`/lab2/test/press/`, `/lab2/test/games/…`) lose the `test/`, and `SLUG` stays `verify-import`. |
| Env, deployed | Vercel | `INTAKE_SECRET` is what unlocks the owner's two doors. **Read `OPEN.md` §1 before setting it on Vercel** — the honest deployed answer today is to leave it unset (both doors then answer 503) and import from a machine running the local server. |

## For `lab2/about.md` §2 · The files — one row

Fold into the `press/` row Phase 9 writes for the table, or stand it beside
it:

> | `press/import.js` | the owner's import field: paste an intake token (or press LIST and pick one), and a bundle a publisher sent through `api/intake.js` comes back as a filled-in Press Table — the words, the roles and the pictures, handed to the page as `File`s so that "as if they had been dropped" is literal. Owner mode only; the secret is typed once and kept for that tab alone. |

## For `lab2/about.md` §9 · What a frame costs — one paragraph

§9 is where a reader goes to ask what a thing costs the bench, so the answer
has to be findable even when it is "nothing":

> **The Press Table is not on the bench, and neither is the import field.**
> `press/index.html` is a plain page — no `lab.js`, no `#bench-world`, no
> frame and no kit — so nothing in this section is about it and no number
> here moves when it changes. The one cost worth writing down is the one it
> was measured for: the import field makes **no request at all** until the
> owner presses something, so a Press Table that opens raises nothing in the
> console and knocks on no door it does not need (`perf/verify-import.js`
> §11, 2026-09-07 — 60 requests on a load, none of them to the intake door).
> That is not politeness; it is what lets `perf/verify-press.js` keep
> asserting that the page boots with an empty console.

## For `lab2/about.md` §10 · Things that will bite you — two entries

> **An import replaces what is on the Press Table.** Pressing a row in the
> import list takes every picture already on the table off it first — the
> object URLs with them — before the bundle's own six go on. An intake is a
> whole thing: its own words, its own roles, its own art. Dropping one on top
> of a half-finished form would give you a page that agrees with neither, and
> a twelve-picture cap hit for a reason nothing on the screen explains. The
> words go the same way, because the bundle carries a `manifest.json` and
> press.js reads a dropped manifest as the owner's own corrections. If you
> were half way through typing something, build it or lose it before you
> import.

> **The intake secret lives in the tab, not in the browser.** It is kept in
> `sessionStorage`, so a reload keeps it and a NEW TAB does not — open the
> Press Table twice and the second one asks again, which is the store doing
> its job and not a bug. It is never written to `localStorage` (that is where
> the draft form lives, and it survives the browser being closed), never in
> the page's source, and never in a URL — it goes in an `x-intake-secret`
> header, and `api/intake.js` refuses it in a query string. Two more things
> the field will tell you rather than let you guess: a wrong secret re-locks
> the field and is forgotten, and a server started with **no**
> `INTAKE_SECRET` answers 503, which the panel reports as *the server* having
> no secret rather than as you having mistyped one.

## For `lab2/ADDING.md` — a new section, and one bullet for §5

A proposed **§6 · Adding a panel to the Press Table**, which is the reusable
half of what this phase learned:

> ## 6 · Adding a panel to the Press Table
>
> `press/index.html` is not a bench, so none of §1–§4 applies: there is no
> frame, no kit sheet and no `data-home-x`. A panel is a `<section
> class="pt-card">` in one of the two columns, its rules in `press/press.css`
> in the page's own classes, and its behaviour in a file of its own that
> exposes one global. `press/import.js` is the worked example, and it is the
> shape to copy when somebody else is editing `press.js` at the same time:
>
> 1. **One global, one entry point.** `window.PressImport` exposes
>    `mount(el, {onBundle})`. The panel is built in JavaScript and inserted
>    into the element it is handed, so the file owns its own markup and the
>    page's markup does not have to grow a hole for it.
> 2. **A documented mount id.** `press/index.html` carries an empty
>    `<div id="pt-import-mount" hidden>` and the `<script>` line in an
>    appended, `▼ … ▲`-marked block at the foot of the file. Appending is the
>    one edit two people cannot turn into a conflict; the panel is moved to
>    where it belongs (the top of the left column) at mount time, at runtime,
>    which is not an edit to anybody's markup.
> 3. **Last in the load order.** Every script on that page is a plain classic
>    one, so a panel that reads `window.Press` or `window.Validate` goes after
>    them and can read both at its first line.
> 4. **Nothing at load.** A panel must not fetch, knock or log on the way in.
>    The Press Table is asserted to boot with an empty console
>    (`perf/verify-press.js`), and a panel that knocks on a door to decide what
>    to say breaks that for every phase, not just its own.
> 5. **Ask press.js for the mode, do not knock again.** `Press.state.mode` is
>    `'knocking'` until the door answers and then `'owner'` or `'publisher'`;
>    poll it rather than making a second request. An owner-only panel draws
>    nothing at all in publisher mode.
> 6. **Hand it FILES.** Anything that wants to put art or words on the table
>    calls `Press.addFiles([...])` with `File` objects — a `manifest.json`
>    among them fills the whole form and the roles map. Setting the form's
>    fields by hand skips the listeners that write the draft store, and
>    setting `Press.state.assets` by hand skips the classifier.

And one bullet for **§5 · Things that keep the floor**:

> - **`[hidden]` loses to `display:`.** A rule that sets `display:flex` or
>   `display:block` on an element beats the browser's own
>   `[hidden]{display:none}`, so anything a script hides by setting `.hidden`
>   needs an explicit `selector[hidden]{display:none}` beside its display
>   rule. `press/press.css`'s import block spells it out four times, once per
>   element that is toggled.

## What still has no home

`press/README.md` (plan §13 4) is not written yet, and "how to import an
intake" is one of the four things §13 4 names for it. When it is written, the
three sentences it needs are: press LIST and pick a row, or paste the
22-character token the publisher was given; the secret is the server's
`INTAKE_SECRET` and it is kept for the tab; and an intake is a folder waiting
to be looked at — importing one publishes nothing, BUILD does.

# ▲ end of the import field's merge notes

---

# ▼ The mockups' stage — what it changes in the merge, and the one paragraph the live docs want

Appended 2026-09-07 by the pass that made a Press Table mockup FIT its stage
(`press/CHANGELOG.md`, Phase 9 · the cropped mockups). Same shape as the block
above: rows for the table where there are any, and paragraphs written out for
files this sandbox **must not edit**. `lab2/about.md` and `lab2/ADDING.md` are
the live bench's; the words are kept here, finished, for the owner to paste in
the same change that moves the folder. Nothing here has happened.

## Rows to fold into the table above

**None.** This pass added no file. It changed three that the `press/` row
already carries — `press.js`, `press.css`, `preview.js` — and one line of
`press/CONTRACTS.md`. The folder moves as it was going to.

## For `lab2/about.md` §10 · Things that will bite you — one entry

Paste as its own paragraph, in the section's own voice:

> **The paper round a mockup is the card's, not the page's.** The Press Table
> shows three compositions side by side and the three are three SHAPES — a
> poster comes out about 1.23 : 1, a widescreen 1.68 : 1, a scrapbook nearly
> square — so the stage they stand on is one 5 : 4 box, and each composition
> is fitted into it and centred with the game's own paper behind it. That is
> why one card can have a hand's width of empty paper down its sides and its
> neighbour a band above and below: it is the STAGE that is 5 : 4, not the page
> you are about to build. What the built page frames is `data-open`, which is
> the composition's own rectangle plus its margin and nothing else (§3's
> *Where it opens* is where that lands). Read a mockup for what is on the
> paper and in what order, never for how much paper there is round it.

## For `lab2/about.md` §2, §9 and `lab2/ADDING.md` — nothing from this pass, and why

Said plainly so a later pass does not go looking for it. §2's table gets its
`press/` and `games/` rows from the merge itself and this pass added no file
to them. §9 is what a FRAME costs — kits, posters and documents, per camera —
and a mockup is none of the three: it is a picture drawn in plain divs on a
page with no bench on it, and the numbers this pass measured (a stage's box, a
fold at two viewports) are page-layout numbers and live in
`press/CHANGELOG.md`, where they are. `ADDING.md` is how to add a part, a kit,
a machine or a prop and this pass added none of the four; the sentence its §2
will want about the sticker sheet, and the `gz-pic` row for its table, are the
sticker pass's and the game-page pass's to write.

## For `lab2/about.md` §12 · Game pages and the Press Table — one fragment

Not a paragraph: §12 does not exist yet and this pass does not own it. Where
it comes to describe the three cards, this is the sentence it needs and the
only claim about them this pass can make:

> the mockups are drawn by `press/preview.js`, which is handed a scale, a
> container and a layout and knows nothing else; the Press Table hands it
> `min(stageW / open.w, stageH / open.h)`, so a composition is never cropped
> by the card it is shown in whatever its shape, and every token of the game's
> theme is set on the card itself and never on the document root, which is
> what lets three different games' colours stand on one page.

# ▲ end of the mockups' stage notes

---

# ▼ To paste into about.md / ADDING.md at merge time

`lab2/about.md` and `lab2/ADDING.md` are the LIVE bench's documents and this
sandbox may not edit them, so the words are written out here, finished, in
those files' own voice, for the owner to paste in the same change that moves
the folder (plan §0.3, and §5 step 10 above). **Nothing in this section has
happened.**

Two earlier passes left paragraphs of their own further up this file; they are
part of the same paste and they are in the checklist below so that nobody has
to remember they exist.

## The checklist — every paragraph written for the two live documents

| target | what | where it is written |
|---|---|---|
| `about.md` §2 | four rows to ADD (`press/`, `games/`, `../api/`, and the `press/palette.js` line) | below, *§2 · The files* |
| `about.md` §2 | four rows to REPLACE (`lab.js`, `keep.js`, `kits.js`, `features/*.dc.html`) and two to amend (`fonts/, vendor/`, `perf/`) | below, *§2 · The files* |
| `about.md` §2 | one row for `press/import.js` | up in *The import field*, "For `lab2/about.md` §2 · The files" |
| `about.md` §9 | a new subsection, *The stickers* | below, *§9 · What a frame costs* |
| `about.md` §9 | the paragraph that says the Press Table is not on the bench and costs it nothing | up in *The import field*, "For `lab2/about.md` §9" |
| `about.md` §10 | two bites — two Press Tables, and `data-open` | below, *§10 · Things that will bite you* |
| `about.md` §10 | one bite — an import replaces what is on the table | up in *The import field*, "For `lab2/about.md` §10" |
| `about.md` §10 | one bite — the intake secret lives in the tab | up in *The import field*, "For `lab2/about.md` §10" |
| `about.md` §10 | one bite — the paper round a mockup is the card's | up in *The mockups' stage*, "For `lab2/about.md` §10" |
| `about.md` §12 | the whole new section | below, *§12 · Game pages and the Press Table* |
| `about.md` §12 | one sentence about how the three cards are drawn | up in *The mockups' stage*, "For `lab2/about.md` §12" — it belongs in *The three mockups* below |
| `about.md` §11 | two lines for *Where to read next* | below, *§11 · Where to read next* |
| `ADDING.md` (the kinds table) | a fifth kind, `gz-pic` | below, *the table at the top* |
| `ADDING.md` §2 | the fourth sheet is here, and it is unlike the other three | below, *§2 · Adding a new kit* |
| `ADDING.md` §5 | a sticker with a filter is never `full` | below, *§5 · Things that keep the floor* |
| `ADDING.md` §5 | `[hidden]` loses to `display:` | up in *The import field*, "one bullet for §5" |
| `ADDING.md` §6 | adding a preset | below, *§6 · Adding a preset* |
| `ADDING.md` §7 | adding a panel to the Press Table | up in *The import field* (it is written there as §6 — **renumber it to §7** if both are pasted) |

---

## For `about.md` §2 · The files

### Four rows to ADD, in the table's own order (after `kits.js`, before `posters/`)

> | `press/` | **the Press Table**: the page an owner drops a folder of game art onto and gets a game page out of. Twelve files — `palette.js` (the quantiser, shared with the tracing table), `theme.js` (a palette in, a `:root` of tokens out), `style.js` (what an art style measures as), `fonts.js` (nine pairings), `recipes.js` (three compositions), `vibe.js` (one model call, optional), `preview.js` (the three mockups), `store.js`, `press.js`, `import.js`, `press.css`, `index.html` — plus `schemas/` (seven JSON Schemas, and the page really does fetch them at boot), `tools/` (the Node scripts that build the sheet, build a page and test the lot), `fixtures/` (three synthetic games, which is the whole test corpus) and its own `README.md`. §12 has the flow. |
> | `games/` | one folder per page the Press Table has built — `index.html`, `game.json`, the re-encoded `art/`, and a `posters/index.json` that is `{}` because a v1 game page has no machine. A game page is a bench with one game on it: `lab.js`, `frames.js`, `kits.js`, `wall.js`, no lockup and no field. `games/README.md` says what each folder is; §12 has the rest. |
> | `../api/` | two Vercel functions at the SITE's root, not this folder's: `vibe.js` (one Claude call, and `{vibe:null}` with no key — the Press Table has heuristics for everything it asks) and `intake.js` (a publisher's bundle in, a 22-character token out). `serve.js` mounts both locally so they can be exercised without a deploy. |
> | `press/palette.js` | the k-means quantiser. It used to live inside `tracer.js`; the Press Table reads a game's key art with the same code and one copy cannot drift from another, so it moved out and `index.html` loads it **before** `tracer.js`. `perf/golden-tracer.js` is the proof a tracing came out the same to the byte. |

### Four rows to REPLACE

The current text is quoted first so the row can be found; the replacement
follows it.

**`lab.js`** — was *"the world: the camera, the grid, dragging, homes,
z-order, the `store()` helper, the keyboard."*

> | `lab.js` | the world: the camera, the grid, dragging, homes, z-order, the `store()` helper, the keyboard. Two things on it belong to the game pages: **WHERE IT OPENS** reads `data-open` / `data-open-narrow` off `#bench-world` before it falls back to the bench's own two rectangles, and **PAGE-SCOPED STORES** puts every localStorage key under `knoll-lab2:<page>:` when the page names itself in `<html data-lab-page>`. This page carries neither, so it opens where it always did and its keys are the strings they were. |

**`keep.js`** — was *"the autosave: every 30s it posts where everything is to
`serve.js`, which writes it into `index.html` as the default look. §7 has all
of it."*

> | `keep.js` | the autosave: every 30s it posts where everything is to `serve.js`, which writes it into `index.html` as the default look. §7 has all of it. **Which door it knocks on is read off the address** — `/lab2/` gives `/_lab2/default` exactly as it always did, and a game page at `/lab2/games/<slug>/` gives `/_lab2/games/<slug>`, so one file serves both without knowing where it is. It reports three more things per section than it used to, for the stickers: `data-palette`, `data-text`, `data-rot`. |

**`kits.js`** — was *"the trees, the gnomes and the village pieces, drawn on
the bench without a frame each — sprites on a tile far away, live svg near.
§9 has it."*

> | `kits.js` | the trees, the gnomes, the village pieces **and the stickers**, drawn on the bench without a frame each — sprites on a tile far away, live svg near. §9 has it. The fourth sheet is the reason the file grew: a sticker takes its colours from the page's `--sk-*` tokens rather than holding any of its own, a section may re-skin its own copy with `data-palette` / `data-text` / `data-rot`, and a whole style pass (`data-sk-style` on `<html>`) can re-draw all forty as pixel art, ink or neon. None of that runs on this bench — there are no stickers on the paper here — but the sheet is fetched at boot with the other three all the same. |

**`features/*.dc.html`** — was *"the 71 drawings, in 16 files — four of them
serve many frames apiece … Three of the files are KITS (forest, village,
gnome) and are read by `kits.js` rather than framed; see §9."*

> | `features/*.dc.html` | the 71 drawings, in 17 files — four of them serve many frames apiece, `forest.dc.html` most of all at 36, then `village.dc.html` at 23. **Four** of the files are KITS (forest, village, gnome, stickers-core) and are read by `kits.js` rather than framed; see §9. `stickers-core.dc.html` is the odd one: forty stickers, no colours in it at all, and **nothing on this bench draws from it** — it is the game pages' and the Press Table's sheet, and it lives here because that is where `kits.js` looks. |

### Two rows to amend in place

**`fonts/`, `vendor/`** — add one sentence at the end: *"The four faces the
Press Table added — Bangers, Fredoka, Orbitron, Special Elite — keep their
licence text beside them (`*-OFL.txt`, `Special-Elite-LICENSE.txt`), because a
self-hosted font is a redistributed copy and a woff2's name table holds the
copyright line and a URL but never the licence itself."*

**`perf/`** — add at the end: *"…and, since the Press Table, the verifiers
that judge what it makes: `verify-game.js` (is a generated page a page that
works), `verify-press.js` (a folder of art to a browsable page, timed),
`verify-sheet.js`, `verify-tray.js`, `probe-stickers.js`, `verify-floor.js`
and a dozen more. `lab2/press/README.md` lists them all with what each one
last said."*

---

## For `about.md` §9 · What a frame costs — a new subsection

Goes after *The posters*, before *The numbers, after*, so that the three kinds
of drawn thing are together.

> ### The stickers (`features/stickers-core.dc.html`)
>
> The fourth kit sheet is forty stickers and **it is not on this bench**: no
> section here names it, so nothing is drawn from it and none of the numbers
> above move. It is measured anyway, because a game page is forty of them on a
> page with a game's art, and because `kits.js` fetches all four sheets at
> boot — so this bench does pay for the 224.4 KB of it on every visit, whether
> or not it draws one.
>
> **Sixty of them, at ten styles, cost a still bench nothing.**
> `perf/probe-stickers.js` (2026-09-07, headed system Chrome 152 at
> 1600 × 1000, DPR 1) puts sixty sticker sections on a page of their own —
> ten across, six down, a real generated game page with its placeholders
> filled — and measures six cameras at 20, 35, 50, 100, 166 and 400 % for each
> of the ten style presets, against a floor page in the same run with nothing
> at all on the paper. **Idle median 6.1 ms at every camera of every preset**,
> which is the empty page's own 6.1 ms and this display's floor. Worst frame
> per preset **6.3–6.6 ms** in that run; **zero frames over 34 ms** anywhere
> in the sixty measurements, which is the clause that decides. **Zero
> documents at every camera of every preset.** All ten ACCEPT.
>
> At 166 % — over the line where `kits.js` keeps no tiles — **50 of the sixty
> are live, 20 of them sway and none is full.** For the seven presets whose
> style reaches an SVG filter (outline-cartoon, painterly, ink-sketch, neon,
> retro-print, grunge, cozy-soft) all fifty are filtered, which is two and a
> half times the twenty the 34 ms rule was asked to be met with. `pixel` sways
> nothing at all: a pixel part is a bitmap.
>
> **And the tray costs nothing standing still.** The sandbox bench carries all
> forty in Knoll's own colours — 48 kit sections, 49 in all, no documents at
> any zoom — and `perf/verify-floor.js` measures that page against the same
> page with the tray cut out between its own markers, in one run at three
> cameras. **The idle delta is 0.0 ms at every one of them.** What is live is
> the eight stickers with words in them, at every camera and for ever: a
> webfont cannot reach inside an image, so a part with a `<text>` is live for
> as long as it is on the paper. That is the bench's own rule (`ADDING.md`
> §1.2), not a new cost — but it is worth knowing before a recipe reaches for
> a ninth text sticker.

---

## For `about.md` §10 · Things that will bite you — two entries

> **Two Press Tables open will fight over a bundle.** The draft store is
> `knoll-press:*` in localStorage, one namespace for the origin, and every
> keystroke writes it — so two tabs of `/press/` ping-pong the words the way
> two tabs of the bench ping-pong `index.html`, and a reload of either gets
> whatever the other typed last. The PICTURES do not travel with them:
> `store.js` is handed the words and never the images (a dozen screenshots as
> base64 is tens of megabytes and localStorage is about five), so the two tabs
> end up agreeing about the title and disagreeing about the art. The intake
> secret is the other way round — `sessionStorage`, so the second tab asks for
> it again, which is the store doing its job. And if both tabs press BUILD on
> the same slug, the second is refused by the door: `/build` will not
> overwrite a page that exists unless the bundle says force, and forcing takes
> a backup first. Fill one in at a time.
>
> **A game page's `data-open` is the opening shot, and `keep.js` does not save
> it.** The four numbers on `#bench-world` are where the page opens — the
> generator's rectangle round the composition, argued for in
> `press/recipes.js` and not in `lab.js` — and the autosave never touches
> them. It writes `data-home-x`, `-y`, `-z`, `data-cut` and the inline
> `style`, `data-gone`, and for a sticker `data-palette`, `data-text`,
> `data-rot`. So you can drag the whole composition somewhere else, save it,
> reload, and the page will still open on the rectangle the generator drew —
> looking at where things used to be. Move the opening shot by editing
> `data-open` (and `data-open-narrow`, for a phone) in the page by hand. A
> rebuild would do it too, and would throw away every other thing you had
> moved.

---

## For `about.md` §12 · Game pages and the Press Table — the whole section

**At the end of the file, after §11 *Where to read next*, and nothing gets
renumbered.** The plan asks for "a new §12" and this is it; §11 is a list of
header comments to go and read rather than a chapter, so a chapter after it
reads fine and a renumber would touch every cross-reference in the file for
nothing.

> ## 12 · Game pages and the Press Table
>
> There is a second kind of page on this bench's runtime. A **game page** is a
> bench with one game on it: the same `lab.js`, `frames.js`, `kits.js` and
> `wall.js`, on a page that is not this one. Its key art and screenshots are
> pictures on the paper, its words are notes, its store links are a sign, and
> a handful of forty stickers stand round them in the game's own colours. It
> pans, it zooms, `ctrl` picks by the drawing, the dock draws on the paper.
> There is no lockup, no field of machines and no groves. They live in
> `games/<slug>/` and they are **built, once, and then arranged by hand like
> anything else here.**
>
> ### The flow
>
> Open `/lab2/press/` with `serve.js` running (deployed, it is `/press/`).
> Drop a folder of art on it — a logo, key art or a hero, up to twelve
> pictures in all. The table reads them: `palette.js` quantises the colours,
> `style.js` measures the art style (is there a pixel grid, are there
> outlines, how much texture), `theme.js` turns the palette into a `:root` of
> tokens with contrast floors met, `fonts.js` offers three type pairings, and
> — if there is an `ANTHROPIC_API_KEY` on the server — `vibe.js` asks the
> model for a second opinion and loses every argument with a measurement.
> `recipes.js` lays the same material out three ways (poster, widescreen,
> scrapbook) and `preview.js` draws all three as mockups. Pick one, turn the
> dials, type a slug, tick the rights box, press **BUILD**.
>
> That posts to `/_lab2/build`, `serve.js` hands it to
> `press/tools/build-game.js`, and a folder appears:
>
>     games/<slug>/
>       index.html      generated from games/_template.html, then yours
>       game.json       the recipe that started it — CONTRACTS §10 — kept so
>                       the table can re-open it. The STARTING POINT, not the
>                       record: once you have moved things, index.html is the truth
>       art/            the pictures, re-encoded (webp at 0.86, png where alpha
>                       is wanted, long edge capped by role)
>       posters/index.json   `{}`, and not optional — frames.js fetches it
>
> A folder of art to a page you can browse takes about **nine seconds** of
> machine time (8.6, 9.1 and 9.0 s for the three fixtures) and about
> **forty-five to forty-nine seconds** with a person typing the words at sixty
> words a minute and pasting the paragraph. The plan asked for under two
> minutes.
>
> ### The doors
>
> `serve.js` has five, all under `/_lab2/`, and every page works out which is
> its own from `location.pathname` — there is no module system here, so the
> three lines that do it are written out in `keep.js` and in `press.js` and
> `press/CONTRACTS.md` §0 is where they are argued.
>
> | door | who knocks | what it does |
> |---|---|---|
> | `/_lab2/default` | this bench's `keep.js` | writes `lab2/index.html`, as it always has |
> | `/_lab2/games/<slug>` | a game page's `keep.js` | writes `lab2/games/<slug>/index.html` |
> | `/_lab2/build` | the Press Table | runs the generator |
> | `/_lab2/vibe` | the Press Table | mounts `api/vibe.js`; deployed it is `/api/vibe` |
> | `/_lab2/intake` | the Press Table | mounts `api/intake.js`; deployed it is `/api/intake` |
>
> **On the deployed site there is no door at all**, and everything is built to
> notice: a game page's `keep.js` knocks once, hears a 404 and goes quiet for
> good; the Press Table knocks on the same door and, hearing nothing, comes up
> in **publisher mode** — the same drop zone, the same reading, the same three
> mockups, but the last button says SEND TO KNOLL and the dials are cut to
> accent, preset and hero, because how the SITE looks is not the publisher's
> decision. What SEND TO KNOLL posts goes to `api/intake.js`, which checks it,
> strips every picture of everything that is not picture, files it under a
> random 22-character token and hands the token back. **Nothing is published
> by that.** An intake is a folder waiting for somebody to look at it; the
> owner imports one into the table and builds it, or does not.
>
> ### The files
>
> `press/` is the table (§2 has the twelve). `games/_template.html` is the
> skeleton every page is built from — the bench's own head and dock with the
> lockup, the field, the forest and the village taken out, and nine
> placeholders left in. `features/stickers-core.dc.html` is the sticker sheet.
> `press/schemas/` holds the seven schemas that everything is checked against
> before it is believed — the generator before it writes, the functions before
> they believe a stranger, and the page before it posts. `../api/` is the two
> Vercel functions. `press/README.md` is how to run any of it.
>
> ### What `keep.js` writes, and where
>
> A game page carries `<html data-lab-page="games/<slug>">`, and `lab.js` puts
> every localStorage key it and `Lab.store` write under
> `knoll-lab2:games/<slug>:` because of it. Without that, a game page and this
> bench — same origin, same keys — would share one camera, one set of
> positions and one wall, and dragging a sticker on a game page would move the
> tree of the same name here. (Verified before it was built, which is the only
> reason it was built.)
>
> Saving is §7's, one folder down: `keep.js` derives `/_lab2/games/<slug>`,
> knocks once, and thereafter writes `data-home-x`, `-y`, `-z`, `data-cut`
> plus the inline `style`, `data-gone`, and for a sticker `data-palette`,
> `data-text` and `data-rot` — **in place**, on the tags already in the file. A
> pasted copy is appended between the `▼ ▲` markers. It never removes a
> section, it refuses a write that would leave the file shorter than the bytes
> it meant to drop, and it takes one `index.html.keep-bak` per run of the
> server before its first write. **So a comment you write into a generated
> page survives every save.** A rebuild does not: `build-game.js` refuses to
> overwrite an existing page unless it is told to force, and forcing throws
> your arrangement away after backing it up.
>
> ### The three mockups
>
> [paste here the sentence written in `MERGE.md` under *The mockups' stage —
> For `lab2/about.md` §12*: the mockups are drawn by `press/preview.js`, which
> is handed a scale, a container and a layout and knows nothing else…]
>
> ### What is not in v1
>
> No trailer machine — the sign carries a "watch the trailer" link instead, so
> a game page has no documents on it at all. No multiplayer cursors: they are
> a bench feature and a connection per visitor, and one `<script>` line puts
> them back if they are ever wanted. No `og:`/`twitter:` cards, which is the
> first thing somebody will miss when a page is shared into a chat.

---

## For `about.md` §11 · Where to read next — two lines

> - `press/press.js` — **THE PRESS TABLE, THE FLOW**, and the paragraph on the
>   two modes
> - `press/recipes.js` — the three recipes, and `openOf()`: why the rectangle
>   a page opens on is the composition's own shape and not the bench's

---

## For `ADDING.md` — the table at the top gets a fifth kind

The table is *"Everything on the bench is one of four kinds of thing"*. It is
five now, and the sentence above it changes with the row:

> Everything on the bench is one of **five** kinds of thing, and each kind
> costs a different amount per frame.

> | **picture prop** (`gz-pic`) | a photograph or a screenshot: a `.gz-art` section whose svg holds one `<image>`, drawn straight in the page | nothing | the page — `index.html`, or a generated `games/<slug>/index.html` |

And one sentence under the table, beside the rule of thumb:

> `gz-pic` is a **prop** with a picture in it rather than a drawing, and
> everything the prop row says still applies: `frames.js` sizes it from
> `data-w` × `data-h` × `data-scale` and fits it into its box, `ink.js` treats
> the whole rectangle as ink (an `<image>` has an `ownerSVGElement`, so ctrl
> picks it by its shape), and it costs nothing per frame. Game pages are made
> of them; the bench has none yet. A screenshot inside a sticker's frame is
> **two** sections, not one — the frame sticker, then a `gz gz-pic gz-shot`
> over it clipped to that part's own `image-slot` rect — because a kit part
> may hold no `<image>` at all (§1.2) and `kits.js` rebuilds a sticker's
> drawing from the sheet every time it changes grade.

---

## For `ADDING.md` §2 · Adding a new kit (a fourth sheet)

The section is called *"a fourth sheet"* and the fourth sheet now exists, so
the heading and a paragraph change. Retitle it **§2 · Adding a new kit (a
fifth sheet)**, keep the three-lines-in-`SHEETS` recipe exactly as it is, and
add this after it:

> **There are four sheets now, and the fourth is not like the other three.**
> `features/stickers-core.dc.html` is forty stickers, and **not one of them
> holds a colour**: every fill and stroke is a role — `{{ skPrimary }}`,
> `{{ skInk }}`, `{{ skPaper }}` and four more — every outline width is
> `{{ skStroke }}`, every corner `{{ skRadius }}`, every word `{{ skText }}`,
> and `kits.js` fills them once per page load from that page's `--sk-*`
> tokens. So the same forty drawings are Knoll's pinks here and a game's
> colours on a game page, and a section can go further with its own
> `data-palette`, `data-text` and `data-rot`. On top of that a page may bake a
> style vector into `<html data-sk-style='…'>` and the whole sheet is re-drawn
> as pixel art, ink, neon or seven other presets.
>
> **The sheet is BUILT, not drawn.** `press/tools/build-sheet.js` writes it
> from one file per part in `press/tools/parts/`, and an edit made in the
> sheet is lost at the next build. A part is drawn in its own file, linted
> (`palette-keys.js` fails on any literal colour), built, checked
> (`check-sheet.js`, no browser), booted (`perf/verify-sheet.js`) and then
> measured (`perf/probe-stickers.js`). `press/README.md` has the five commands
> in order, and it is the file to read before drawing a sticker.

---

## For `ADDING.md` §5 · Things that keep the floor — one bullet

> - **A sticker with a filter is never `full`, and a pixel sticker never even
>   sways.** A style preset can put an SVG filter on a part — a wobbled line,
>   a blurred shade, a glow — and a filtered surface is redrawn by the
>   compositor whenever anything inside it moves, so its inner animations are
>   not worth having and `kits.js` will not grant one the *full* grade at any
>   size. It sways, within its own share of the twenty (`SHEETS.stickers.
>   swayShare`, which is 1: the probe measured all ten presets at 166 % with
>   fifty of sixty live and twenty swaying, and none of them needed a smaller
>   share). A `pixel` part is a bitmap on a canvas and has nothing to animate,
>   so it is never lifted above *still*. `data-live` does not override either
>   of these — it raises a plain part, not a filtered or pixelled one.

---

## For `ADDING.md` — a new section, *Adding a preset*

Goes after §4 (adding a prop) or wherever the numbering lands once the import
field's *Adding a panel to the Press Table* is pasted too. Five places and a
probe:

> ## 6 · Adding a style preset
>
> A **preset** is what an art style measures as: a prototype vector that
> `press/style.js` ranks a measured game against, and the thing that decides
> how all forty stickers are re-drawn on that game's page. There are ten
> (Appendix C of `PRESS-TABLE-PLAN.md`). Adding an eleventh is five edits and
> a measurement, and the last one is the only one that can fail:
>
> 1. **The prototype vector**, in `press/style.js`'s `PRESETS` — the same ten
>    fields every row has: `lineShow lineWeight lineWobble linePasses corners
>    shading texture paletteSize pixel finish`, and a trailing comment saying
>    what kind of game it is for. The ranking is a weighted distance over
>    those fields (`W_PIXEL` 3.0, `W_LINE` 2.0, `W_SHADING` 1.5, `W_FINISH`
>    1.0, `W_TEXTURE` 1.0), so a row that is close to an existing one on every
>    weighted field will never win: give it at least one field of its own.
> 2. **The enum**, in `press/schemas/style.schema.json`'s `preset`. Nothing
>    validates without it — and `vibe.schema.json` `$ref`s that same enum, so
>    this is also what puts the new id on the model's menu. There is exactly
>    one list; do not add a second.
> 3. **Three font pairings**, in `press/fonts.js`'s `RULES` — one row, three
>    ids from `PAIRINGS`, best first. `suggest()` falls back to `flat`'s row
>    for a style it does not know, which is a working answer and a wrong one.
> 4. **A row in Appendix C** of the plan, so the table and the code still
>    agree.
> 5. **Nothing in `kits.js`.** The style pass reads the vector's FIELDS and
>    never the preset's name, which is the whole reason the vector exists.
>
> Then measure it, because a preset is a promise about frame time:
>
>     node lab2/perf/probe-stickers.js
>
> Sixty stickers at every preset, six cameras each, about ten minutes for the
> full table — and it must come back ACCEPT with an idle median at the display
> floor and no frame over 34 ms. **Run the whole table, not `--presets
> yours`**: a partial run writes `perf/results/stickers-partial/` on purpose,
> because `perf/results/stickers/` is the folder the shipped sheet's own
> header cites for all of them, and a one-preset check must not quietly
> replace it. Then update the sheet's header — it is `build-sheet.js`'s
> template, not the sheet, or the next build eats it.
>
> **Adding a font PAIRING is smaller**: a row in `press/fonts.js`'s
> `PAIRINGS` (display, body, mono, optionally accent), the families it names
> in `FAMILIES` with their weight→file map and a CSS stack, the woff2 in
> `fonts/` with its `@font-face` row in `fonts/fonts.css` **and its licence
> text beside it**, and the id in `theme.schema.json`'s pairing enum.
> `node lab2/press/tools/test-fonts.js` reads `fonts.css` off the disk and
> fails if a row and a file disagree; `press/README.md` walks it.

# ▲ end of the paragraphs for the live documents
