# press/CHANGELOG.md — what each phase built, why, and what was measured

Newest at the top. One entry per phase, as `PRESS-TABLE-PLAN.md` §0.4 asks:
what, why, what was measured (with the `perf/results/<label>/` it came from).

## READ THIS FIRST — what this is, and the four things to know (Phase 9, steps 2–3, 2026-09-07)

**The entry a person should read before any of the thirty-four below it.** It
is also the record of the pass that wrote it: plan §13 steps 2–3, the
documentation, and a truth pass over the four documents several agents had
been editing at once. **No code was touched.** Seven files changed and every one
is prose: `../MERGE.md` (finished), `press/README.md` (**new**), `../README.md`,
`press/CONTRACTS.md`, `press/NOTES.md`, `../OPEN.md`, and this entry. Nothing
outside `lab2/test` was written, and `lab2/about.md` and `lab2/ADDING.md` —
the live bench's, and off limits here — were **read and not edited**: the
paragraphs plan §13 2 and 3 ask for are written out, finished, at the foot of
`../MERGE.md` under *To paste into about.md / ADDING.md at merge time*.

### What the system is

A folder of game art goes in and a **game page** comes out: a bench with one
game on it, in that game's own colours, its screenshots in stickers' frames,
its words as notes, its store links as a sign. It runs on lab 2's own runtime
— the same `lab.js`, `frames.js`, `kits.js`, `wall.js` — and it is generated
once and then arranged by hand like anything else on the bench. The **Press
Table** (`press/index.html`) is where a person does that: drop the art, watch
it be read, pick one of three compositions, press BUILD. The same page in
**publisher mode** — which is what the deployed one is, because there is no
door on Vercel — lets somebody with a link and no account send a bundle
instead, which the owner imports and builds, or does not.

**It is all built in a sandbox and NOTHING IS MERGED.** `lab2/test/` is a
miniature of the bench with the plan's changes made to copies; the live
`lab2/index.html`, `kits.js`, `keep.js`, `lab.js`, `tracer.js`,
`site/serve.js` and `site/vercel.json` have not been touched. `../MERGE.md` is
the plan for moving it across, and it is a plan.

### Which phases were built

Nine of the plan's ten, in this order, one entry each below —
Phase 0 (discovery, the sandbox, three synthetic fixtures, the live bench's
baseline), 1 (`palette.js`, the quantiser the tracing table and the Press
Table now share), 2 (`theme.js` and `fonts.js` — a palette in, a `:root` of
tokens and a type pairing out), 3 (`style.js` — what an art style measures
as), 4 (the forty-sticker sheet, and `kits.js` learning to re-skin and
re-style it), 5 (the page template, the generator, the doors, page-scoped
stores), 6 (the Press Table itself), 7 (the vision call), 8 (public intake,
and the import field beside it), 9 (the whole suite run once, the three
mockups' stage, and these documents). Phase 10 is deliberately not built.

### Where the evidence lives

- **`Phase 9 · step 1`, the entry directly below this one** — the whole suite
  run once in order: 31 commands, 3 failures, and all three the same one
  defect. It is the single best picture of what works.
- **`../README.md`** — the 31 commands with what each last said, and what is a
  copy of the bench and what is new.
- **`perf/results/<label>/`** — every number quoted in this file, as
  `summary.json` plus plates. Gitignored: it is evidence, not source.
- **`press/README.md`** — how to run the thing, import an intake, add a
  sticker part, add a font pairing, and what the four environment variables
  do.
- **`../OPEN.md`** — what is waiting on the owner, and what was measured and
  left standing on purpose. Read it before believing anything is finished.
- **`press/CONTRACTS.md`** (what the parts promise each other) and
  **`press/NOTES.md`** (every place the codebase disagreed with the plan).

### The four things to know before touching it

1. **Two files are generated and an edit made in them is lost.**
   `features/stickers-core.dc.html` is written whole by
   `press/tools/build-sheet.js` out of one file per part in
   `press/tools/parts/` — that is where a sticker is drawn — and
   `press/tools/parts/INDEX.md` with it. A generated *page*
   (`games/<slug>/index.html`) is the opposite: it is written once and is then
   the owner's, and a rebuild throws the arrangement away.
2. **Three scripts write a real `index.html` and put it back.**
   `perf/verify-keep.js`, `perf/verify-sheet.js`'s second half and
   `perf/verify-game.js` copy, edit and restore a live file through the
   sandbox's own door. **Restart the server first** — `serve.js` keeps one
   `index.html.keep-bak` per file per server process — and never run two of
   them at once. The same restart is needed after editing `api/*.js` or
   `press/tools/build-game.js`, because Node caches those requires.
3. **The numbers here are this machine on this day, and headed Chrome one at a
   time.** Two headed Chromes on one machine skew each other's frame times;
   the suite was run strictly in sequence for that reason. The display floor
   is 6.1 ms (a 165 Hz panel) and it is the number most of the sticker
   measurements come back as. The live bench's own baseline is
   `lab2/perf/results/press-baseline/`, not the older `after6` — the bench
   grew between them.
4. **One check fails on purpose and it is arithmetic.** `pixelfort` is a
   1.26 : 1 poster on a 2.45 : 1 bench, so no opening rectangle whatever can
   leave less than 24.24 % of the screen bare at the sides, and
   `perf/verify-game.js` prints that floor beside each failure. Nothing was
   tuned to move a number under a line (plan §0.5). `../OPEN.md` §2 has the
   adjudication in full.

### What this pass changed, and the disagreements it settled

`../MERGE.md` was a table with eight *TBD after Phase N* rows in it. It is now
a merge that can be followed without re-deriving anything: an inventory in
which **every one of the 238 files** in the sandbox is a byte-identical copy
(31, with the command that proves it), a copy with changes (9, hunk by hunk)
or new (198); the three `serve.js` literals; the exact `vercel.json` lines;
the fonts and their four licence texts; four gitignore lines where Appendix G
has three; a ten-step order with what to re-run after each step; and a plain
statement of the six things that are not ready. `press/README.md` did not
exist and now does.

Six places where two documents disagreed, all settled by reading the code:

- **`../README.md` said `frames.js` was an unchanged copy and listed `lab.js`
  twice**, once as unchanged and once as changed. `frames.js` has one hunk and
  `lab.js` has thirteen. Fixed, with the hunk counts.
- **`../README.md`'s command list held 22 of the 31 commands** the suite runs,
  and called `smoke-bench.js` a measurement of the live bench. It opens the
  SANDBOX bench at `http://localhost:4321/lab2/test/` — served by the owner's
  server so that the door 404s — and so does `verify-bench.js`. Both fixed,
  and the list is complete now.
- **`press/CONTRACTS.md` §7 described `SHEETS.stickers.swayShare` as a
  per-preset object "from the probe".** `kits.js` has `swayShare: 1`: the
  probe ACCEPTED all ten presets, so the plan's default was kept and
  `shareOf()` is merely still able to read an object. Corrected, with the
  reason.
- **`press/CONTRACTS.md` §7 said a bench-less page gets `extractOnly`,
  `kindOf` and `isKitSrc` only.** `kits.js:900` returns five things —
  `SHEETS` and `setStyle` as well. Corrected in both places §7 says it.
- **`press/CONTRACTS.md` §1 did not mention `Palette.kmeans`, and
  `../MERGE.md` said the tracer calls `Palette.quantize`.** It calls
  `Palette.sample` and `Palette.kmeans`: it wants the centroids themselves, to
  label the full image with. Both corrected. §1 and §4 and §13 also gained the
  exports they had grown since (`kmeans`, `toOklab`/`fromOklab`,
  `Style.inspect`, `Recipes.IDS`/`SK_BOX`/`SPILL`).
- **`press/NOTES.md` §D.2 said "Recipes use the WIDE aspect, 3200:1390".**
  They did, and stopped on 2026-09-07: `openOf()` no longer pads a
  composition out to the bench's shape, which is the whole of Phase 5's third
  pass and the reason the mockups had to be re-staged. Rewritten as what
  happened. §B.4 (`data-rot` "attempted… dropped if") and §C.3/§D.6 ("Phase 5
  verifies by measuring") were futures that have happened, and now read as
  past tense with the measurement beside them.

And one thing `../OPEN.md` was more sure of than the evidence: it said
`scrapbook` "has never been built or photographed". It has never been BUILT,
photographed by `shot-games.js` or verified — and it HAS been drawn, as the
third mockup, where mosslight's card measured 2271.1 × 2289.25 units, 0.99 : 1.
That is the one thing known about its shape and it is in the entry now. A new
`../OPEN.md` item was opened in the same pass: **the merged bench's boot time
is unmeasured.** Plan §13 1 asks for `boot.js press-final` as well as
`measure.js` and names the reason — after the merge `lab2/index.html` loads
`press/palette.js` before `tracer.js`, and if it costs anything at boot it
should be deferred the way `cursors.js` is. The suite took the pan numbers
only, and there is nothing to compare against until a pre-merge baseline
exists, which is why `../MERGE.md` §5 opens with taking one.

---

## Phase 9 · step 1 — the whole suite, run once, in order (2026-09-07)

- **What:** plan §13 step 1. Every test in the sandbox run **once, in the plan's
  order, one at a time** — twelve Node-only tools, seventeen browser verifiers,
  the full ten-preset sticker probe, and `lab2/perf/measure.js press-final` on
  the **live** bench. The Chrome jobs were run strictly one at a time: two
  headed Chromes on one machine skew each other's frame times, which is exactly
  the tail the Phase 4 re-measure had to explain away. **31 runs; 3 checks
  failed, all three the same one defect, and it was already written down.** Four
  files were changed and none of them is code the bench runs:
  `perf/test-style.js` and `perf/attack-style.js` (a test that lied, below),
  `OPEN.md` (that item closed) and `games/README.md` (a folder that was
  deliberate but unnamed). Five stale `.keep-bak` files were deleted. **Not
  touched:** every `press/*.js`, `kits.js`, `keep.js`, `lab.js`, the sheet, the
  schemas, the three fixtures, `serve.js`, and anything outside `lab2/test`
  except `lab2/perf/results/press-final/`, which is where the plan asks the live
  bench's number to land.
- **Why:** thirty-odd scripts written over one day, each verified as it was
  built, had never been run **as a suite** against the files as they finally
  stand. A pass is only a pass against the code that exists now, and several of
  these scripts share `index.html`, the games folders and the 4322 server — the
  kind of coupling that only shows up when they run in sequence.

### The table

Wall time is this machine, this run. "Left behind" is what is on the disk
afterwards; everything under `perf/results/` and `perf/fixtures/` is gitignored
evidence.

| # | command (from `site/`) | result | wall | left behind |
|---|---|---|---|---|
| 1 | `node lab2/test/press/tools/test-palette.js` | **51/51** | 0.5 s | — |
| 2 | `node lab2/test/press/tools/test-fonts.js` | **357/357** | 1.6 s | `results/fonts/pairings.png` |
| 3 | `node lab2/test/press/tools/test-theme.js` | **3477/3477** | 1.6 s | `results/theme/summary.json` |
| 4 | `node lab2/test/press/tools/attack-theme.js` | **162698/162698** over 2000 palettes | 1.5 s | `results/attack-theme/summary.json` |
| 5 | `node lab2/test/press/tools/test-schemas.js` | **174/174** | 0.5 s | — |
| 6 | `node lab2/test/press/tools/test-recipes.js` | **197/197** | 0.2 s | `results/recipes/summary.json` |
| 7 | `node lab2/test/press/tools/test-serve.js` | **163/163** | 0.4 s | `results/serve-test/` |
| 8 | `node lab2/test/press/tools/check-fixtures.js` | **3/3 folders hold** (silent on pass) | 0.3 s | — |
| 9 | `node lab2/test/press/tools/check-sheet.js` | **28/28** | 0.2 s | `results/parts/check-sheet.json` |
| 10 | `node lab2/test/press/tools/test-vibe.js` | **133/133** | 0.4 s | nothing — it writes into `press/cache/` and deletes it |
| 11 | `node lab2/test/press/tools/test-intake.js` | **59/59**, 3 tokens written and deleted | 2.1 s | — |
| 12 | `node lab2/test/press/tools/test-build-game.js` | **98/98** | 12.9 s | `results/build-game/summary.json` |
| 13 | `node lab2/test/perf/verify-tracer.js` | **12/12** | 8.3 s | `results/verify-tracer/` |
| 14 | `node lab2/test/perf/golden-tracer.js` | **3/3 golden**, byte-identical `d` on all three | 36.0 s | `results/golden-tracer/` |
| 15 | `node lab2/test/perf/test-style.js` | **90/90** | 15.6 s | `results/style/summary.json` |
| 16 | `node lab2/test/perf/attack-style.js` | **19/19, 1 WARN** | 12.4 s | `results/attack-style/` |
| 17 | `node lab2/test/perf/verify-sheet.js` *(server restarted first)* | **387/387** — 40 parts, 8 shot, the bench half ran | 24.8 s | `results/parts/`; `index.html` put back byte-identical |
| 18 | `node lab2/test/perf/verify-kits.js` | **20/20** | 17.0 s | `results/verify-kits-*.png` |
| 19 | `node lab2/test/perf/verify-kits-adv.js` | **47/47** | 43.1 s | `results/kits-adv/` |
| 20 | `node lab2/test/perf/verify-kits-skin.js` | **62/62** | 27.8 s | `results/kits-skin/summary.json` |
| 21 | `node lab2/test/perf/verify-tray.js` | **9/9 — ALL PASS** | 9.3 s | `results/phase4/tray.png` |
| 22 | `node lab2/test/perf/verify-bench.js` | **24/24 — ALL PASS** | 20.2 s | `results/phase0/verify-bench*.png` |
| 23 | `node lab2/test/perf/smoke-bench.js` *(runs against **4321**)* | **ALL PASS**, load 826 ms, 0 documents | 4.2 s | `results/phase0/bench.png` |
| 24 | `node lab2/test/perf/verify-keep.js` *(server restarted first)* | **44/44 — ALL PASS** | 39.8 s | `results/keep/`; `index.html` put back byte-identical |
| 25 | `node lab2/test/perf/verify-template.js` | **17/17** | 7.5 s | `games/_probe/` (by design), `results/phase5/template.png` |
| 26 | `node lab2/test/perf/verify-game.js` *(all three, server restarted first)* | **145/147 — 2 FAIL** | 148.1 s | `results/game/`; the three pages put back byte-identical |
| 27 | `node lab2/test/perf/verify-press.js` | **119/120 — 1 FAIL** (which is #26's two) | 215.5 s | `results/press-verify/`; `games/verify-*/` built and deleted |
| 28 | `node lab2/test/perf/verify-import.js` | **55/55**, on port **56515** — 4322 untouched | 9.3 s | `results/import/`; its token and `games/verify-import/` deleted |
| 29 | `node lab2/test/perf/verify-floor.js` | **8/8** | 85.7 s | `perf/fixtures/bench-tray.html`, `bench-no-tray.html`, `results/floor/` |
| 30 | `node lab2/test/perf/probe-stickers.js` (all ten presets) | **10/10 ACCEPT** | 585.4 s | `perf/fixtures/stickers-*.html`, `results/stickers/` |
| 31 | `node lab2/perf/measure.js press-final` (**the live bench**) | 7 scenarios, no regression | 66.7 s | `lab2/perf/results/press-final/` |

Re-run after the two test fixes: `test-style.js` **90/90** (15.7 s),
`attack-style.js` **19/19, 1 WARN** (12.4 s).

### The three failures, which are one defect, and it was already written down

`verify-game.js` fails **2 of 147**, and `verify-press.js`'s single failure of
120 is its own nested run of that same script reporting those same two. Both
are `pixelfort`, both are check 7, and both are the entry OPEN.md §2 already
carries under *"A portrait poster cannot fill a landscape bench"*:

    FAIL pixelfort · 7 · 2560×1111 · no side of the SCREEN is more than 25.0 % empty margin
         L 28.40 R 28.36 T 8.02 B 8.02 %  — floor 24.24 %
    FAIL pixelfort · 7 · 1366×768  · no side of the SCREEN is more than 25.0 % empty margin
         L 25.77 R 25.76 T 9.37 B 9.18 %  — floor 20.24 %

**The numbers re-measured to OPEN.md's own, to the tenth** (it says 28.4 % and
25.8 %), which is the point of re-running them: the failure is stable, and it is
arithmetic rather than weather. A composition of 2214.4 × 1757.83 world units —
**1.26 : 1** — centred in a bench of 2.45 : 1 cannot leave less than 24.24 % of
the screen bare on the left and the right at any zoom whatever, and
`verify-game.js` prints that floor beside each failure so a reader can tell the
arithmetic from the generosity. Nothing was tuned to move a number under a line,
and the plan's §0.5 is why. `mosslight` and `neonrun` pass check 7 at both
viewports (L/R 19.96 % and 16.4 %, against floors of 13.43 % and 7.75 %).

### The one test that lied, and it is fixed

`perf/attack-style.js` has printed a WARN since Phase 3 saying that
`perf/test-style.js`'s `assertShape` asserts **every** stat is 0–1, and that
`hfEnergy` is not bounded by 1 — and OPEN.md §2 has carried it as *"the test is
wrong there, not the module. Fix in the Phase 9 pass."* This is that pass, so it
is fixed. `hfEnergy` is a mean absolute Laplacian **divided by contrast**, so a
grained low-contrast plate drives the denominator to nothing and the ratio past
1: `attack-style.js`'s `grain` plate (±4/255 on mid-grey) measures **hfEnergy
5.362 against a contrast of 0.0076**, re-measured today. A heavily grained game
would have failed that assertion for a rule nobody wrote, and
`analysis.schema.json` asks only for `"number"`.

`assertShape` now asks `hfEnergy` for a **finite number ≥ 0**, and keeps 0–1 for
`saturation`, `contrast` and `edgeDensity`, which are shares and means of shares
and really are bounded; the sentence above the check says all of that and cites
the 5.362. `attack-style.js`'s WARN is kept — a stat with no ceiling is worth
saying out loud on every run — but its second half was rewritten in the same
hour, because a warning that names an assertion which has gone is itself a thing
that lies. **`press/style.js` was not touched**: no threshold moved, the vector
is unaffected (5.4 and 0.16 are both "high"), and both scripts read the same as
before — 90/90 and 19/19 — because none of the three fixtures ever exceeded 1.
That is the honest shape of this fix. It changes nothing that is measured today,
and it stops a plate only slightly grainier than `mosslight` from failing a
shape check tomorrow.

### The sticker probe was re-run, because `kits.js` moved after the last one

`perf/results/stickers/` held a run finished **2026-09-07 13:57**, and `kits.js`
was last written at **14:09** — the two defects the `verify-kits-adv` pass fixed
(`pagePalette()` reading the page's tokens for all four kits, and the flag that
`!!'false'` would have turned on). A probe taken before the file it measures
changed is not a measurement of that file, so **the full ten-preset table was
re-run** (585 s, headed system Chrome 152, 1600 × 1000 at DPR 1, sandbox server
on 4322, the door 404'd before the first byte; the floor page measured in the
same run). It lands in `perf/results/stickers/` — the folder the shipped sheet's
header cites — and it is a full table, which is the only kind allowed to write
there.

**Everything the acceptance rests on came back:** all **ten presets ACCEPT**;
idle median **6.1 ms at every camera of every preset**, equal to the empty
page's own 6.1; **50 of the sixty live at 166 %**, 20 swaying; all fifty
filtered for each of the seven presets whose vector reaches an SVG filter;
`pixel` swaying 0; **zero documents at every camera of every preset**; zero
console errors, page errors and responses ≥ 400 across all eleven pages. The
worst frame per preset came in at **6.3–6.6 ms**, the tightest of the four runs
now on record. The sheet's header cites 6.3–12.3 as one run's tail and the 34 ms
as the line; nothing in it is falsified by this run and it was left alone — a
pan's maximum is the machine's mood that minute, and this minute was a quiet
one.

### The live bench is where Phase 0 left it

`node lab2/perf/measure.js press-final` on **4321**, read-only, blocking its own
door (`GET /_lab2/default` → 404, and that is the only knock in the run).
Against `lab2/perf/results/press-baseline-2/` — the Phase 0 baseline's
confirming second pass, taken at 13:15 the same day — the pan medians are
**identical at all seven cameras**:

| camera | baseline-2 median | press-final median | idle then / now |
|---|---|---|---|
| z400 | 12.2 | **12.2** | 12.2 / 12.2 |
| lockup166 | 18.2 | **18.2** | 18.2 / 18.2 |
| z100 | 24.3 | **24.2** | 30.3 / **24.3** |
| z50 | 12.1 | **12.1** | 12.1 / 12.1 |
| z35 | 6.1 | **6.1** | 12.1 / **6.1** |
| z25 | 6.1 | **6.1** | 6.1 / 6.1 |
| z20 | 6.1 | **6.1** | 6.1 / 6.1 |

247 panels, 186 standing trees, 13 iframes; 7 panels booted, quiet after **2060
ms** against the baseline pair's 2006 and 2070 — the same number. Frames over
34 ms: 4 in the whole run (3 at z100, 1 at z50) against the pair's 4 and 7.
**Nothing regressed, and nothing was expected to**: nothing has been merged, so
the live bench has never seen `press/palette.js` or the sticker sheet. Plan
§13 1's clause about `palette.js` at boot is a question for the merge, and this
run is the number the merged bench will be compared against.
`results/press-final/` now sits beside `press-baseline/` and `press-baseline-2/`,
which is where §13 asks for it. (§13 1 also names `boot.js press-final`; this
pass was scoped to `measure.js`, and the boot run is still to take.)

### The sandbox, swept

- **`games/`**: `_template.html`, `_probe/`, the three fixtures, and
  `pixelfort-press/`. No `verify-*` — `verify-press.js` and `verify-import.js`
  both proved their own folders gone in their own `finally`. `pixelfort-press/`
  is the Phase 6 walk-through's evidence and was deliberate but **unnamed in any
  README**, which is how a decision starts to look like a stray;
  `games/README.md` now has a *What is actually in here* section naming it, and
  saying that anything called `verify-*` is a stray and safe to remove.
- **Five `.keep-bak` deleted**, each first proved byte-identical to the page
  beside it: `games/{pixelfort,mosslight,neonrun}/index.html.keep-bak` (this
  run's `verify-game.js` door step), `games/pixelfort-press/index.html.keep-bak`
  (14:45, the Phase 6 walk-through's), and
  `perf/results/serve-test/index.html.keep-bak` (`test-serve.js`'s own scratch,
  rewritten every run). No `.tmp` and no `_tmp-*` anywhere under `lab2/test`.
- **`press/cache/`** holds one thing and it is not this pass's:
  `intake/H_hhnz_MsjSuVHNbeWSTWA/`, the publisher-mode bundle a
  `perf/verify-press.js` run sent on 2026-09-07 at 14:42. `verify-import.js`
  names it in its own cleanup as *"not this run's, and not touched"*, and it is
  still not touched. `test-vibe.js`'s three cache files were written and deleted
  inside its own run.
- **`lab2/test/index.html` is md5 `6cddd2f6d3ff1ee5a6048c2b7c776fb0`**, the same
  hash the Phase 4 entry recorded, after two scripts wrote to it for real and
  put it back.
- **`git status` is what it was before the pass began**: eight modified files in
  `dashboard/`, `login/`, `signup/` and `yard/`, and the untracked
  `lab2/PRESS-TABLE-PLAN.md`, five `lab2/perf/probe-yard*.js` /
  `probe-connect.js`, `yard/recut.js` and `lab2/test/` — **all of them from
  before this work and none of them touched by it**. `lab2/perf/results/` is
  gitignored, so `press-final/` does not show. The nine `_tmp-*.png` in
  `lab2/perf/results/` are the yard/dashboard pass's scratch and are **outside
  this sandbox**: they are named here rather than deleted, because the rule for
  this build is that nothing outside `lab2/test/` is written.

## Phase 9 · the import field, re-verified after the mockup pass moved `press.js` and `press.css` under it (2026-09-07)

- **What:** no new code. `press/import.js` (`window.PressImport`), the
  appended block in `press/index.html` (lines 230–255: the `▼ … ▲` comment,
  `<div id="pt-import-mount" hidden>` and `<script src="import.js">`) and the
  appended `.pi-*` block in `press/press.css` (lines 370–434, still the last
  thing in the file) are the entry below, unchanged. This pass re-ran the
  whole intake loop against the files **as they stand after the entry above**
  — Phase 9's stage rewrite edited `press.js`, `press.css` and `preview.js`
  in the same hour the field was written — and wrote this note. **Not
  touched:** `press/press.js`, `press/press.css`, `press/index.html`,
  `press/store.js`, `press/preview.js`, `api/intake.js`, `serve.js`, and
  anything outside `lab2/test`.
- **Why:** the field's only two edits to shared files are *appended regions*
  in files another pass owned that minute. An appended region is the one edit
  two agents cannot turn into a conflict, but it is not proof that the file
  around it still says what the region assumes — and only a run can tell.
  Three things could have come loose and none had:
  - the thirteen `--` tokens the `.pi-*` rules read (`--pink-soft --tint-2
    --field --line --chip --mute-2 --amber --green --ink-3 --mono --tint
    --pink --mute`) are each still defined once in `press.css`;
  - `.pt-left` and `#pt-drop-card` are still there, so the self-mount still
    lands the panel above *1 · the art* (§3 of the run);
  - `Press.addFiles`, `Press.state.mode` and `Press.state.schemas` still
    answer in the shapes `import.js` reads (§8 of the run: 6 pictures, the
    roles, the words).
- **Measured — `perf/verify-import.js`, 55/55 PASS, twice, today.**
  `node lab2/test/perf/verify-import.js --headless` and then the same script
  headed (system Chrome, the house channel), both exit 0, ~70 s each, on
  ports the OS picked (**54894** on the headed run) with a fresh 31-character
  `INTAKE_SECRET` per run: **4322 was never opened and never touched**, which
  is the point of the port-0 rule. 59 results, 55 of them checks and 4 of
  them notes, in twelve groups — 5 the server · 8 publisher → intake ·
  5 the field, locked · 3 a wrong secret of the same length · 3 the right
  secret and where it is kept · 2 the list · 3 two tokens that are not this
  one · 11 the row clicked · 2 the secret was never in a URL · 9 continue to
  Build as usual · 4 the no-`INTAKE_SECRET` configuration · 4 cleanup. The
  numbers that matter are the same ones the entry below reports, re-measured
  rather than re-quoted: the row reads `"Pixelfort" — Sep 7, 2026 · 34 KB ·
  6 pictures · fixture`; the panel reads `from fixture, Sep 7, 2026`; six
  pictures **decode** at the sizes the fixture drew them (480×640, 256×96,
  four at 640×360); `knoll-press:intake-secret` is in `sessionStorage` and
  the whole of `localStorage` (3 keys) does not hold it; **71 requests
  watched, not one with a secret in its URL**, and 4/4 intake requests
  carrying `x-intake-secret`; BUILD wrote `games/verify-import/` with a
  `game.json` (version 1, seven keys, recipe `poster`, preset `pixel`, 14
  slots) the server served at 200; and with the secret dropped from the
  server's environment the page still boots with an **empty console** and
  makes **no request to the intake door at all** (60 requests, none of them
  to `/intake`) until the owner presses something. → `perf/results/import/`
  (`summary.json` + the five plates).
- **Cleanup, again in a `finally`:** `games/verify-import/` deleted, this
  run's token (`7RG4pCe0kiIFHBY1FEC-RQ`) deleted, the server it started
  closed. `press/cache/intake/H_hhnz_MsjSuVHNbeWSTWA/` is still on disk and
  is still not this phase's — a `perf/verify-press.js` publisher-mode send
  that does not delete its token (entry below, §7).
- **The two notes the run prints are still true, and still `press.js`'s.**
  A page built out of an intake records `source: "manual"` because
  `manifestOf` writes the MODE, and `genres` are dropped by `applyManifest`
  before intake ever sees them. Both are one line each in a file this phase
  does not own; both are in `OPEN.md` §2.

---

## Phase 9 · the three mockups were cropped — the stage is a box the composition is FITTED into, not a strip it is laid along (2026-09-07)

- **What:** the regression the entry below predicted and did not close. Phase
  5's third pass stopped `recipes.js` padding every composition out to the
  bench's 2.302 : 1, so `layout.open` became the composition's OWN shape —
  and `press/press.js` was still handing `Preview.render` a scale of
  `stage.clientWidth / open.w` while `press.css` gave the stage a fixed
  landscape box. A portrait composition was therefore drawn at full width and
  cut off at the bottom by the stage's own `overflow:hidden`. **Three files:**
  `press/press.js` (the scale), `press/press.css` (the stage's box, its
  background, and 40 px taken off `.pt-why`'s ceiling to pay for it),
  `press/preview.js` (**its header only** — the file drew `open.w × S` by
  `open.h × S` all along and needed no code). `press/CONTRACTS.md` §13 had one
  paragraph corrected: it described the scale press.js no longer hands.
  **Not touched:** `recipes.js` (the change it made is a real fix and stands),
  `store.js`, `index.html`, `vibe.js`, `import.js`, the schemas, the tools,
  `kits.js`, the sheet, `games/`, and anything outside `lab2/test`.
- **Why:** it is in the photograph. `perf/results/press/table-after5b.png`
  against `table-final.png`, same fixture, same viewport: the screenshot row
  is gone off the foot of all three cards in the first and is there in the
  second. The owner picks one of three compositions by LOOKING at them, and
  half a composition is not a thing to pick from.

### What was cut, measured before the fix

Dropped `press/fixtures/<name>/art/*` plus its `manifest.json` on the table
(the words matter: a poster with no description note is a different shape),
then measured the stage's box against the paper `preview.js` drew in it.
`results/press-stage/stage-before-words.json`.

| at 1280 × 900, stage 254.3 × 110.5 | composition | paper drawn | cut off |
|---|---|---|---|
| pixelfort · poster (×2 cards) | 2454.4 × 1997.83, **1.23 : 1** | 254 × 207 | **96.5 px, 47 %** |
| pixelfort / mosslight · widescreen | 2880 × 1716.3, 1.68 : 1 | 254 × 151 | 40.5 px, 27 % |
| mosslight · scrapbook | 2271.1 × 2289.25, **0.99 : 1** | 254 × 256 | **145.5 px, 57 %** |
| mosslight · poster | 2892 × 2227.77, 1.30 : 1 | 254 × 196 | 85.5 px, 44 % |

At 1600 × 1000 the stage is 361 × 156.8 and the same three fractions come out
137.2 / 58.2 / 207.2 px. **The stage's aspect was `3200/1390`** — lab.js's
WIDE rectangle, which is exactly the shape `openOf()` used to pad every
composition into. The two had been quietly agreeing with each other since
Phase 6, and only one of them was told.

### The fix, and the two things it is

**One: fit, on both axes.** `scale: Math.min(bw / open.w, bh / open.h)` — the
largest scale at which the WHOLE composition is inside the box, whatever its
shape. The box is read off `getBoundingClientRect` and FLOORED: `clientWidth`
and `clientHeight` are integers and round up, so a stage 288.8 px tall reports
289, `preview.js` draws the paper at `Math.round(open.h × S)`, and the mockup
came back 289 px in a 288.8 px box — a fifth of a pixel, clipped, at the
bottom, again. With the floor every card measures **inside** its stage at both
viewports (worst overhang −0.2 px, which is 0.2 px of paper to spare).

**Two: the stage is a sheet of the GAME's paper.** `.pt-stage` centres what
comes out (`display:flex; align-items:center; justify-content:center`) and
takes `background: var(--bench-bg, var(--paper-2))`. `--bench-bg` is readable
there because `preview.js` puts every token of the theme on that element and
nowhere else (its one rule: nothing goes to `:root`), and it is the same
colour `.pv-paper` is painted in — so the leftover is not a house-pink band
round a picture, it is more of the game's own page. The composition's own
rectangle still shows: the dot grid stops at its edge.

### Level row or ragged? Level — and the ragged one was photographed to be sure

The brief left it open: one box as tall as the tallest of the three cards, or
each stage its own composition's shape. Both were built and looked at
(`results/press-stage/table-own-*.png` is the ragged one).

- **The ragged row loses the comparison.** The three feet stop lining up, and
  a card whose stage is short still stretches to the row's height, so the
  widescreen card carries a slab of empty card under its own foot. The eye is
  asked to compare three compositions and is handed three different pieces of
  furniture to do it in.
- **It puts the fold at the mercy of the art.** Measured: mosslight's three
  (widescreen 1.68, scrapbook 0.99, poster 1.30) make a row **851.1 px** deep
  at 1280 × 900 against a fold at 830.1, and **958.6** at 1600 × 1000 against
  930.1 — the third card below the fold at both. pixelfort's three fit
  (801.8 / 888.6). Which side of the fold a card lands on would depend on
  which recipes that game's pictures ranked, and that is not a promise a
  stylesheet can make.
- **And "as tall as the tallest" IS the fixed box, with a wobble.** The
  tallest of three is the scrapbook or the poster in every set measured, and
  both want more height than the fold has — so the rule would sit pinned at
  its cap in every case here, and the cap is then the design. A fixed box is
  the same thing with nothing moving under the owner's hand.
- **Level costs the compositions almost nothing.** A widescreen is width-bound
  in any box up to 1.68 : 1, so no taller stage draws it one pixel bigger; the
  poster at 1.23 : 1 comes out at 98 % of the card's width in a 5 : 4 box; only
  the scrapbook pays, at 79 %, and it is whole.

### 5 : 4, and where the room came from

The stage is **5 : 4** — 254.3 × 203.5 at 1280 × 900 and 361 × 288.8 at
1600 × 1000, against 254.3 × 110.5 and 361 × 156.8 before. It is within 2 % of
the poster's own shape, which is the composition a width-fit was cutting in
half. **It costs the page 93 px of height at 1280 and 132 at 1600, and the
room came from two places, both stated:**

- **53 px (94 at 1600) was already there.** The row ended 84.9 px above the
  fold at 1280 and 138.6 above it at 1600, and nothing was standing in it.
- **40 px came off `.pt-why`'s ceiling**, 380 → 340 (about twenty lines to
  about eighteen). That column is the one that could spare it: it is measured
  SCROLLING at both viewports either way (603 px of reasons at 1280, 486 at
  1600), so the forty came off a window onto a longer list and went to the
  cards the window was cut for — which is what that rule's own comment has
  said since it was written. Under about 317 px it would stop buying anything
  at all: the measurements in the other half of the card are 341 px tall at
  1280 and set the card's height from there down.

**The three cards clear the fold at both viewports, and so does the line of
type under them:** the row ends **31.9 px** above the fold at 1280 × 900
(798.2 against 830.1) and **46.6 px** above it at 1600 × 1000 (883.5 against
930.1). The analysis card above it shrank 457.3 → 417.3 px with the trim.

### What it measures, after — every composition whole

`results/press-stage/stage-final.json` and the photographs beside it
(`table-final-<fixture>-<width>.png`, `row-final-*.png`). Two fixtures, two
viewports, six compositions each way, **overhang ≤ 0 on every one**:

| at 1280 × 900, stage 254.3 × 203.5 | paper drawn | paper left over |
|---|---|---|
| poster 1.23 : 1 | 249 × 203 | 2.7 px each side |
| widescreen 1.68 : 1 | 254 × 151 | 13 px above and below |
| scrapbook 0.99 : 1 | 201 × 203 | 26.7 px each side |
| poster 1.30 : 1 | 254 × 196 | 3.7 px above and below |

At 1600 × 1000, stage 361 × 288.8: 354 × 288, 361 × 215, 286 × 288 and
361 × 278. No console error on any run, and the pictures show what the numbers
say — the polaroid row at the foot of both poster cards, the film strip at the
foot of the widescreen, all four of the scrapbook's pictures.

### preview.js: nothing to change, and why that is a fact rather than a hope

The file needed no code. `S` is used in **five** places and no others — the
paper's own width and height, the dot grid's cell and its two offsets, and the
world layer's transform — and every coordinate below that (a picture's box, a
sticker's, the window a screenshot is cut to through `shotGeom`, a note's
type) is in world units INSIDE that one transform. A smaller S moves nothing
relative to anything: it is the same composition, further away. That is the
file's own claim in its header (*"nothing else in the file multiplies a
coordinate by anything, so there is exactly one place a scale can be wrong"*),
this is the pass that leant on it, and a paragraph under the S paragraph now
says so. That is the whole of the edit.

Looked at rather than asserted: **`press/tools/preview-harness.html` still
renders all nine mockups**, one per fixture per recipe, at three different
fit-scales. `node lab2/test/press/tools/shot-preview.js --label press-stage`
reports **9 cards, 0 warnings, no console error and no custom property on the
document root**, boxes 520 × 310 / 401 / 423 / 524, and the pictures show every
frame holding its own screenshot at 18.06 %, 21.19 % and 22.9 %. The harness
scales by width and its card has no height of its own, so a portrait mockup
there is simply a taller card and was never cropped. `--label` is passed so
the shots the Phase 6.1 entry cites by name are not overwritten.

### The tests

`node lab2/test/perf/verify-press.js`, headed system Chrome at 1600 × 1000,
sandbox restarted by the script: **119 of 120**, unchanged. The one failure is
the one it has always been — `verify-game.js` on the three built pages, 145 of
147, the two being pixelfort's SCREEN margin at 2560 × 1111 and 1366 × 768
(28.40 % and 25.77 % against a 25 % line, with floors of 24.24 % and 20.24 %
printed beside them). That is `OPEN.md` §2's arithmetic about a portrait poster
on a landscape bench and has nothing to do with the Press Table's stage. The
three walk-throughs: pixelfort 9.9 s, mosslight 10.2 s, neonrun 8.9 s (49.0 /
49.9 / 44.3 s with the typing allowance) against the plan's 120.

### Verified again, after this pass was cut off (appended 2026-09-07)

The pass that wrote the entry above was interrupted, so every claim it makes
about the state the files are in NOW was re-run against those files as they
stand, under a fresh label: `results/press-stage/stage-confirm.json`,
`table-confirm-<fixture>-<width>.png`, `row-confirm-*.png`. (The *before*
table cannot be re-measured — the fix is in — and stands as the record of the
state `results/press/table-after5b.png` photographs. That photograph and
`row-confirm-pixelfort-1280.png` were put side by side and they are the whole
argument: the polaroid row is off the foot of all three cards in the first and
is there in the second.)

- **The six compositions measure what the table above says.** Stage 254.3 ×
  203.5 at 1280 × 900 and 361 × 288.8 at 1600 × 1000; paper 249 × 203,
  254 × 151, 201 × 203 and 254 × 196 at 1280, and 354 × 288, 361 × 215,
  286 × 288 and 361 × 278 at 1600 — every one of the twelve **inside** its
  stage, worst overhang −0.2 px at 1280 and −0.4 px at 1600. The row ends
  **31.9 px** above the fold at 1280 and **46.6 px** at 1600; `.pt-why` is
  340 px tall over 603 px of reasons at 1280 and 486 at 1600. No console error
  on any of the four runs.
- **A check the pass above did not make: the pieces are PLACED, not merely
  fitted.** Size is not placement — a scale that shrank the paper and left a
  sticker behind would pass every number in the table above. So every
  `.pv-slot` on all six cards was measured against the paper it stands on:
  **not one of them is outside it** (18, 18, 16 pieces on pixelfort's three
  and 16, 28, 18 on mosslight's — more than the layout has slots, because a
  framed screenshot is two nodes), and the ink box is inset from the paper's
  own left and top edge by **exactly 120 × S**, which is Appendix E's margin:
  12.2 px at S = 0.1016, 10.6 at 0.0882, 10.5 at 0.0878, to the tenth of a
  pixel this measures in. Right and bottom come out 0.3–2.1 px wider, which is
  the paper's own `Math.round` plus a note whose wrapped text does not fill
  its declared box. Two of the six cards are height-bound (pixelfort's two
  posters, mosslight's scrapbook) and are the ones that could only be measured
  once a fit scale existed. It is the same composition, further away.
- **The ragged row was looked at again**, `row-own-*` beside `row-confirm-*`,
  and it loses for the reason given above: three feet that do not line up, and
  a slab of empty card under the short one.
- **The harness, again.** `node lab2/test/press/tools/shot-preview.js --label
  press-stage-confirm` — **9 cards, 0 warnings**, no console error, no custom
  property on the document root, boxes 520 × 423 / 310 / 524 / 401 at scales
  21.19 / 18.06 / 22.90 / 17.98 %, and every frame holding its own screenshot.
- **`verify-press.js`, again: 119 of 120**, and the one failure is the one
  named above — pixelfort's SCREEN margin, 28.40 % at 2560 × 1111 and 25.77 %
  at 1366 × 768, against floors of 24.24 % and 20.24 % printed beside them.
  The three walk-throughs came out **8.7 / 9.1 / 9.1 s** (48.6 / 49.0 / 44.5 s
  with the typing allowance) against the 9.9 / 10.2 / 8.9 s written above:
  the same machine on a different minute, and all six of those numbers are
  inside the two minutes the plan allows a walk-through.

## Phase 8 · the IMPORT FIELD — the one line of the plan that was never built (2026-09-07)

- **What:** `press/import.js` (new, `window.PressImport`) — the owner's field
  that turns an intake token back into a filled-in Press Table; a marked,
  **appended** block in `press/index.html` (an empty `<div id="pt-import-mount">`
  and the `<script src="import.js">`) and another in `press/press.css` (the
  `.pi-*` rules); and `perf/verify-import.js` (new), which drives the whole
  loop end to end. Docs: this entry, `MERGE.md` (the paragraphs for
  `about.md` §2/§9/§10 and `ADDING.md`, ready to paste, plus the four new
  rows), `OPEN.md`, `README.md`. **Not touched:** `press/press.js`,
  `press/store.js`, `press/preview.js`, `api/intake.js`, `serve.js`, anything
  else in `press/index.html` or `press/press.css`, and anything outside
  `lab2/test`. Another pass owned press.js and press.css while this was
  written, which is why both of this phase's edits to shared files are
  appended regions with a `▼ … ▲` marker and nothing above them moved.
- **Why:** plan §12 3 is four lines long and was the only part of the Press
  Table plan with no code behind it. Both halves of Phase 8 already existed
  and had never met: `api/intake.js` files a publisher's bundle under a
  22-character token behind `INTAKE_SECRET`, and `press/press.js` fills a
  form from dropped files and posts a build. Without the field between them
  the phase's own acceptance line — *"a publisher with a link and no account
  can submit; the owner can import and build"* — was half true.

### 1 · The flow, and the one design decision in it

`PressImport.mount(el, {onBundle})` is the entry point the plan asks for. The
field: a secret box, a token box, a **LIST** button, the listing behind the
same secret (title · date · size · files · who), each row clickable, and
`from <publisher name>, <date>` when a bundle lands.

**It hands the Press Table FILES, not state.** The obvious implementation is
to set the form fields, the roles map and `S.assets` by hand; this does not,
because press.js already has a door for exactly this shape.
`Press.addFiles(list)` takes a FileList or an array of `File`s, reads any
`.json` among them through `applyManifest` — which fills every word, every
platform chip, every link, the rights attestation **and** the roles map, a
manifest's declared roles being treated as the owner's own corrections — and
then decodes the pictures, classifies, paints and analyses. It is the same
call the drop zone and the file input make. So an import builds
`manifest.json` (the stored bundle) plus one `File` per asset, named
`<id>.<ext>` from the manifest's own `file`, and calls it. The name matters:
press.js's `renumber()` derives an asset id **from the file name**, so naming
the file after the id is what makes the ids come out the same on the owner's
side as they were on the publisher's, and `applyManifest` keys its role map
on that same basename. "As if the files had been dropped" is meant literally.

Two consequences worth knowing. The pictures already on the table are taken
off first (and their object URLs revoked): an import is a whole bundle, and
dropping one on top of a half-finished one gives a form that agrees with
neither and a twelve-file cap hit for a reason nobody can see. And the moment
press.js grows a hook of its own it passes `onBundle` to `mount()` and takes
over — `mount()` is idempotent and re-parents, so the self-mount becomes a
no-op and the block in `index.html` shrinks to the script line.

**Where it mounts, since press.js has no hook yet: `#pt-import-mount`**, an
empty hidden div in the appended block at the foot of `press/index.html`. In
owner mode `import.js` moves that div to the top of the left column (before
`#pt-drop-card`, so the card reads *0 · bring in an intake* one step ahead of
*1 · the art*) and draws the panel inside it — a runtime move, not an edit to
somebody else's markup. In publisher mode nothing is drawn and the div stays
hidden and empty: the field is the owner's, and an import box on a stranger's
page is an invitation to sit and guess tokens at it.

### 2 · What is checked before the form is touched

The bundle is validated against `press/schemas/manifest.schema.json` through
`window.Validate`, reusing the pool press.js already fetched
(`Press.state.schemas`). **This is not a repeat of the check `api/intake.js`
did.** That one ran against a copy of the schema with the `file` pattern
widened to accept `.jpg`, because the plan tells intake to sniff JPEG;
`press/tools/build-game.js` validates against the unwidened file. So a stored
bundle carrying a JPEG is a bundle the generator will refuse, and the right
place to find that out is in a sentence here, before six pictures and a form
full of somebody's words land on top of whatever the owner was doing. A
bundle that fails is reported and **not** loaded — there is no "bring it in
anyway", because intake validated it before storing it, so a fault here means
either the schema moved under an old bundle or the picture is a format the
generator will not take, and both fixes are upstream of this form.

### 3 · Where the secret comes from, and why that is the right amount here

Not the page's source (a constant in a served file is a published constant),
and **not `localStorage`** — that is where press.js keeps the draft form, it
survives the browser being closed and reopened, and it is two clicks away in
the devtools of any machine the owner walks away from. The owner types it
once and it is kept in **`sessionStorage`**: one tab, gone when the tab
closes, kept across a reload (which is the point — the owner reloads the
Press Table constantly, and being asked every time is how a person ends up
pasting the secret into a text file on the desktop). It goes in an
`x-intake-secret` header, and the only things this file ever puts in a URL
are `list=1` and `token=…`. A browser that refuses sessionStorage falls back
to a variable in memory, and the panel says which one is in use.

**Why that is enough here.** This is a local door. The Press Table is in
owner mode only when `/_lab2/<prefix>/default` answered, which on this
machine means `node lab2/test/serve.js` is running for that person, and the
secret guards a folder (`press/cache/intake/`) that the same server already
serves as static files to anyone holding a token (`api/intake.js` says so
itself). The threat is not a remote attacker: it is the owner's own second
browser, a screen-share, and a laptop left open. A secret that is not on disk
and not in the page cannot be read off any of those after the tab is shut.
That is exactly what sessionStorage is, and it costs one typed line a day.

**What would be wrong for a deployed door.** On knoll.space the same field is
a browser holding a long-lived *shared* secret that unlocks **every**
publisher's bundle, over a network, with no expiry, no revocation and no
audit — and any XSS anywhere on the origin reads sessionStorage as happily as
localStorage. sessionStorage is not the weak part of that; **the bearer
secret is.** A deployed owner door wants a real session: a login that sets an
`HttpOnly; Secure; SameSite=Strict` cookie the page cannot read at all,
short-lived, revocable, one per person rather than one per site, with the
function checking the cookie instead of a header. Until there is such a
login, the honest deployed configuration is to leave `INTAKE_SECRET` **unset**
on Vercel — the two doors then answer 503 and stay shut, which is
`api/intake.js`'s own rule that an absent secret is never an open door — and
to import from a machine running the local server. That is the owner's call
and it is in `OPEN.md` §1, not a thing this file can make true by itself.

### 4 · The retention line, in the UI

Plan §12 4 in one honest sentence on the panel, because a rule nobody is told
is not a rule: *"An intake is kept for 30 days and nothing deletes it —
pruning is by hand (plan §12 4): delete the folder under press/cache/intake/
locally, or the blob on Vercel. A row past its date is marked EXPIRED and
still opens."* The listing marks an expired row in amber and still opens it,
which is `api/intake.js`'s own behaviour — nothing refuses the owner their
own data because a date passed.

### 5 · Measured — `perf/verify-import.js`, **55/55 PASS**

`node lab2/test/perf/verify-import.js` from `site/`, run headed (system
Chrome 152, the house channel) and again `--headless`: 55/55 both times, in
about 70 s. It does **not** use 4322 and does not touch it. It sets a random
`INTAKE_SECRET` in its own environment and starts a second `lab2/test/serve.js`
on **port 0** — the OS picks a free one, so it cannot collide with 4322, with
the live bench's 4321, or with another run of itself; the port and the door
are asserted rather than assumed (`test-intake.js` found this pattern first).
The whole loop is real: no mock, no stubbed transport, every request over a
socket to the same `api/intake.js` Vercel would mount.

- **publisher → intake.** The door is 404'd *in the page*, the way a deployed
  host has none, so the table is in publisher mode; the pixelfort fixture's
  `manifest.json` and six plates are dropped, the slug retyped to
  `verify-import`, and SEND TO KNOLL answers with a 22-character token whose
  folder is then read off disk (`bundle.json`, `meta.json`, 6 files in
  `art/`). Publisher mode draws **no import field** — the mount div is present
  and empty.
- **the field, locked.** Panel drawn in `#pt-import-mount`, the div moved
  above `1 · the art`, the derived door `/_lab2/test/intake`, both buttons
  dead with no secret.
- **a wrong secret of the same length** (the only kind that tests the
  constant-time compare at all) is refused, the field re-locks, and the wrong
  secret is not left in the tab. Nothing is listed.
- **the right secret**: `knoll-press:intake-secret` is in **sessionStorage**
  and the whole of localStorage (3 keys) is searched for it and does not hold
  it.
- **the list**: the token's row reads `"Pixelfort" — Sep 7, 2026 · 34 KB ·
  6 pictures · fixture`.
- **two tokens that are not this one**: a 4-character one is refused before a
  request is made; a well-formed one that is nobody's is a 404 with a
  sentence; neither loads anything.
- **the import**: all 6 pictures arrive with the roles the publisher declared
  (`logo:logo keyart-portrait:keyart shot-1..4:screenshot`) and each one
  **decodes** to the pixel size the fixture drew it (480×640, 256×96, four at
  640×360, webp, 2–7 KB) — a picture "arrived" means the browser decoded it,
  not that a file of some length turned up. Title, tagline, 274 characters of
  description, developer, publisher, release, both platform chips, all three
  links and the attestation (`fixture`) are in the form, and the panel reads
  **`from fixture, Sep 7, 2026`**.
- **the secret is watched, not just used**: 71 requests recorded, **not one**
  with a secret in its URL; all 4 requests to the intake door carried
  `x-intake-secret`; and a Node-side `?list=1&secret=…` with no header is a
  **401**, so the query string is not a second door.
- **and it builds**: BUILD writes `games/verify-import/` with `index.html`,
  `game.json` (version 1, seven keys, recipe `poster`, preset `pixel`, 14
  slots) and six pictures, and the server serves the page at 200 with
  `data-lab-page="games/verify-import"`.
- **the 4322 configuration**: with the secret dropped from the environment
  the page still boots with an **empty console** and makes **no request to
  the intake door at all** until the owner presses something — the field costs
  a load nothing, which is what `perf/verify-press.js`'s "nothing went wrong
  in the console" assertion needs. Pressing LIST then says *the server* has no
  `INTAKE_SECRET`, not that the owner mistyped one.
- **cleanup**: the token folder and `games/verify-import/` are deleted in a
  `finally`, the token only if it matches the 22-character shape and is the
  one the run recorded (the folder beside it may be somebody's real bundle),
  and the server is closed. `--keep` leaves both and says so.

### 6 · Two things the round trip loses, both of them press.js's

Found by the verifier and left as notes rather than changed, because
`press/press.js` is another pass's file this minute:

- **`source` is written from the MODE, not from where the bundle came from**
  (`press.js` `manifestOf`). A page the owner builds out of an intake records
  `"manual"`; the bundle in the intake folder says `"intake"`. The built page
  does not remember that a publisher sent it.
- **`genres` do not survive.** `manifest.schema.json` allows the key and the
  pixelfort fixture declares three; `applyManifest` does not read it and
  `manifestOf` does not write it, so they are dropped on the *publisher's*
  side before intake ever sees them. One line in each function.

### 7 · A leftover, not this phase's

`press/cache/intake/H_hhnz_MsjSuVHNbeWSTWA/` (slug `pixelfort-press-pub`) was
already on disk when this phase started — a publisher-mode send from a
`perf/verify-press.js` run that does not delete its token. It is not touched
by anything here and it is why the verifier asserts *its own* token is in the
listing rather than asserting a count.

---

## Phase 5, third pass — the three defects `verify-game.js` found: a blank window, a wordless ribbon, and a rectangle that threw away a fifth of the type (2026-09-07)

- **What:** the three things the Phase-5 verifier reported and nobody had
  answered — an `image-slot` drawn empty on both widescreen pages, a `banner`
  drawn with no words, and `openOf()` widening every composition to the
  bench's 2.302 : 1. **`press/recipes.js` is where all three were fixed.**
  `press/tools/build-game.js` gained a warning apiece for the first two, and
  its copies of the recipe's numbers were brought up to date;
  `press/tools/test-recipes.js` gained the two invariants that stop them
  coming back and had eight assertions moved to the new numbers;
  `perf/verify-game.js` had ONE INFO STRING corrected (it told the reader the
  rest of the rectangle was `openOf()`'s widening, which is no longer true) —
  **no check of the judge was changed**. Docs: `press/CONTRACTS.md` §13,
  `OPEN.md`, `README.md`, this file. The three `games/<slug>/` were rebuilt.
  **Not touched:** `press/index.html`, `press.css`, `press.js`, `store.js`,
  `preview.js` (another pass owns them), `kits.js`,
  `features/stickers-core.dc.html`, `games/_template.html`, and anything
  outside `lab2/test`.
- **Why:** all three were on the built pages and in the verifier's own
  output, counted and named, waiting for somebody to decide
  (`perf/results/phase5/game-*.png`, `emptySlots` / `wordless` in
  `perf/results/game/summary.json`, `OPEN.md` §2). A page that ships a white
  square where a picture would go, and a ribbon with nothing on it, is not
  finished, whatever the plan permits.

### 1 · The blank window: the seal is `burst-round`, not `badge-round`

Appendix E puts `badge-round` on the hero's top-right as decoration.
Appendix D gives `badge-round` an `image-slot` **and** a text layer, and
`press/tools/parts/badge-round.html` says in its own header what it is: *"a
face that holds a square for a picture, with the page's word under the
picture"*. The recipe had neither to give it, so both pages drew the
placeholder — an opaque `--sk-paper` rect, `#ffffff` on mosslight and
`#161323` on neonrun — in the middle of the badge.

Three ways out, and what chose between them:

- **Give it a picture.** The four screenshots are all spoken for, and a
  fifth image slot makes the page claim a screenshot the manifest has not
  got: `verify-game.js` check 4 asserts `shots === manifest screenshots ===
  image slots`, so a badge holding `shot-1` (or the logo) fails a check that
  is right to fail. A 2.67 : 1 logo cover-cropped into a 36 × 36 window is the
  middle third of a wordmark, besides.
- **Hide the placeholder from the generator.** The only lever a generator has
  is a per-section `data-palette` painting `skPaper` `none` — which also
  erases the die-cut halo (the halo's stroke is `{{ skPaper }}`) on any page
  whose theme turns halos on, and makes a colour role mean "not drawn". The
  honest place for that is `kits.js`'s restyle path, which this pass does not
  own.
- **Choose a part with no window.** `burst-round` is the same round scalloped
  seal — Appendix D: *"soft 8-lobe burst"*, tags hype and cozy — with no
  image slot and no text layer. It cannot be blank.

The third. It is the only part swap in the file, and the file's header says
so where it lists what is not Appendix E's.

### 2 · The wordless ribbon: the banner carries the release year

`banner` is a text part; its words come from the section's `data-text` and
the sheet's `skText` is `''` (CONTRACTS §7, §8), so a banner nobody gave a
word to is a blank ribbon. The word had to come from the MANIFEST rather than
be invented, and the ribbon's face is 84 of its 128-unit box — about six
capitals at its own 20-unit type (`parts/banner.html` measures five at ~72
wide). `releaseDate` is the only field that is both: `ribbonWord()` takes the
first four-digit year out of it, which reads "2027", "2026" and "2027" on the
three fixtures and survives every spelling a 40-character free string can
carry ("2026-11-05", "2027-03", "Q1 2027"). A date with no year in it is used
whole when it is short enough for the face ("TBA"); with nothing usable the
banner is **not placed at all** — a text part with nothing to say does not go
on the page.

### 3 · The opening rectangle: no composition is padded into the bench's shape

`openOf()` widened or heightened every rectangle to 3200 : 1390 because
Appendix E says to. **Enlarging the rectangle can only lower the zoom a page
lands at**: `lab.js` frames it at `min((bench.w − 48) ÷ open.w,
(bench.h − 48) ÷ open.h)`, and both terms fall as the rectangle grows. So the
widening was not a way of putting paper round a composition — the screen
gives that away free when the two aspects differ, and a narrow screen has
`data-open-narrow`, which is the division of labour `lab.js`'s own WIDE and
NARROW rectangles make. On the poster it turned a 2254 × 1998 rectangle into
4599 × 1998 — 28.1 % of it bare paper on each side — and took the landed zoom
at 1366 × 768 from 0.2991 to 0.2866.

**That alone does not reach the floor, and the arithmetic says why.** The
target was the type: the poster's body read 8.6 screen px at 1366 × 768
against the two widescreen pages' 10.0. Dropping the widening buys 9.0. The
composition is 1758 tall in a 645-px bench, so **a rectangle with no margin
at all lands at 0.34 and reads 10.2 px** — that is the ceiling, and no
`data-open` can pass it. The number that could was the type's own, so the
note body went **30 → 34** = ceil(10 ÷ 0.2991), measured at the smallest
screen plan §9 5.5 judges on, on the recipe that frames tightest. Everything
that hangs off the body went with it, each keeping its own stated ratio: the
title 75 → 85 (2.5 ×), the tagline 40 → 45, the note padding 16 × 12 → 18 × 14,
the chip ×3 → ×3.4 of the bench's poster chip, and the columns 760 / 720 →
**960**, which is 44 characters a line at the new body and which the
widescreen recipe needed anyway — at 720 the taller lines put its sign at
y 158 and the film strip starts at y 80.

### What it measures, before and after

`node lab2/test/perf/verify-game.js`, headed system Chrome, sandbox server
restarted first, `perf/results/game/summary.json`. Body type is the smallest
of the three sizes in `.gz-note text`, in SCREEN pixels at the landed camera.

| at 2560 × 1111 | pixelfort | mosslight | neonrun |
|---|---|---|---|
| landed zoom | 0.50 → 0.50 | 0.58 → 0.58 | 0.58 → 0.58 |
| note body | 15.0 → **17.0** px | 17.5 → **19.8** | 17.5 → **19.8** |
| widest screen margin | 30.3 → **28.4 %** | 22.7 → **20.0 %** | 22.7 → **20.0 %** |
| bare paper inside `data-open` | 28.1 → **4.9 %** | 19.6 → **4.2 %** | 19.6 → **4.2 %** |

| at 1366 × 768 | pixelfort | mosslight | neonrun |
|---|---|---|---|
| landed zoom | 0.2866 → **0.2991** | 0.3336 → **0.3706** | 0.3336 → **0.3470–0.3588** |
| note body | 8.6 → **10.2** px | 10.0 → **12.6** | 10.0 → **11.8–12.2** |
| widest screen margin | 28.9 → **25.8 %** | 20.7 → **14.2 %** | 20.7 → **15.2–16.4 %** |
| bare paper inside `data-open` | 28.1 → **4.9 %** | 19.6 → **4.2 %** | 19.6 → **4.2 %** |

(**The laptop row of the two widescreen pages moves between runs and the
poster's does not**, which is worth knowing before anyone reads a tenth of a
pixel off it. The bench's height is the viewport minus the page HEADER, and
that paragraph wraps to one line more or fewer depending on where the webfont
is when it is measured: mosslight's bench came out 665 px in the run before
this work and 684.5 px in the two after it, neonrun's 626 and then 645.5, and
the two neonrun runs of this pass differ by that one line — hence the range.
pixelfort's bench is **645.5 px in every run**, which is the row the 10-px
floor was set against, and its 10.2 px reproduced exactly. Only the
1366 × 768 row moves: at 2560 × 1111 every page's bench is 1047 px in every
run.)

`open` and the composition's box, in world units: pixelfort 4599 × 1998 round
2014 × 1758 → **2454 × 1998 round 2214 × 1758**; the two widescreen pages
3951 × 1716 round 2400 × 1476 → **2880 × 1716 round 2640 × 1476**. Every
rectangle is now the box plus Appendix E's 120 of margin on both axes, and
nothing else.

**The tally: 145 of 147 pass, against 143 before.** The two that still fail
are the same check on the same page at two viewports — pixelfort's SCREEN
margin, 28.4 % and 25.8 % against the 25 % line — and it is the arithmetic
`OPEN.md` §2 has carried since the verifier was written, now with better
numbers: a 1.26 : 1 composition centred in a 2.45 : 1 bench cannot leave less
than 24.2 % of it empty at either side at ANY zoom, and with `lab.js`'s own
24-px pad and the composition's real height the best reachable at 2560 × 1111
is **25.4 %** — over the line with a margin of ZERO. At 1366 × 768 it would
pass with a margin of 90 rather than Appendix E's 120, and that number was
not taken: trimming a composition's paper to move a percentage under a line
it fails at the other viewport anyway is arranging the evidence. Both are in
`OPEN.md` §2 with the arithmetic.

**Two of the verifier's notes are now empty on all three pages**, which is
defects 1 and 2 in the judge's own words: `emptySlots` `[]` and `wordless`
`[]` (they read `badge-round` and `banner` on both widescreen pages before).
And `test-recipes.js` refutes them at the source now — for every recipe ×
every fixture, no part with an image slot is placed without a picture and no
text part without words, both lists READ OFF THE SHEET (`data-props`'s
`slots`, and a `<g data-layer="text">` in the part's own `<sc-if>`) rather
than retyped.

### The other tests

`test-recipes.js` **197/197** (was 177: eight assertions moved to the new
numbers, the aspect check inverted — the rectangle wears the composition's
shape now, not the bench's — and four checks added).
`test-build-game.js` **98/98**, three pages rebuilt: pixelfort 38 101 B,
mosslight 36 599 B, neonrun 36 552 B, art byte-for-byte unchanged.
`test-schemas.js` **174/174**. `perf/shot-games.js` re-shot all three at
their own opening zoom: pixelfort **0.4249** (was 0.3375), mosslight
**0.5061** and neonrun **0.4948** (both 0.3928) — a fifth more of the
composition on the screen at the viewport the compositions were judged in.

### Read this if you read a layout

`layout.open` is no longer 2.302 : 1. It never was part of the object's
SHAPE and no schema pinned it, but every `open` any caller had seen since
Phase 5 was that aspect, and the poster's is now PORTRAIT (2454 × 1998).
`press/preview.js` sizes its mockup `open.w × S` by `open.h × S`, which is
correct as written and simply draws a taller mockup for a poster.
CONTRACTS §13 says it in capitals.

## Phase 6 verified — `perf/verify-press.js`: a folder of art to a browsable page, timed and then attacked (2026-09-07)

- **What:** plan §10 6.3, the verifier the entry below admits was still missing
  ("this entry's numbers come from a driver run by hand; the phase's own
  verifier is the next job"). **`perf/verify-press.js` is the only file this
  pass added.** Two others were changed and both are `press/press.js`, both
  for defects this script found by driving the table rather than by reading
  it; `README.md`'s command list lost its *NOT WRITTEN YET*. `press.css`,
  `store.js`, `preview.js`, `recipes.js`, `theme.js`, `style.js`,
  `build-game.js`, `kits.js` and `perf/verify-game.js` were **not** touched,
  and nothing outside `lab2/test` was written.
- **Why:** everything Phase 6 claimed had been claimed by a driver that no
  longer exists. The plan's acceptance line for this phase is a sentence about
  a PERSON — *"an owner can go from a folder of images to a browsable game
  page in under two minutes without touching a file by hand"* — which is a
  claim to refute with a stopwatch, not a thing to assert.

### The two defects, both found by doing it rather than reading it

- **A 16:9 hero is eaten by the shape test, so two of the three fixtures had
  no hero at all.** The plan's ladder (§10 6.2 step 1) reads a picture within
  5 % of 16:9 as a `screenshot` and then gives `hero` to "the largest
  landscape non-screenshot" — a rung nobody can ever stand on, because a hero
  IS exported at 16:9. Measured: mosslight and neonrun ship a 1600 × 900 hero
  beside four 960 × 540 screenshots and the table read **logo + 5
  screenshots** for both. With no hero and no key art `Recipes.choose` scores
  nothing, falls back to its own id order and offers a **poster with no key
  art in it** — 6 slots, one picture — while both fixtures' `expected.json`
  says `widescreen`. `classify()` has a last rung now: when the ladder leaves
  the hero's job empty, the largest landscape picture takes it, never one the
  owner has spoken about, and not at all once they have called something a
  screenshot. pixelfort is unmoved (it has key art). The reasoning is in the
  file under THE HERO THE SHAPE TEST EATS.
- **The words were on the screen the whole time and never reached the paper.**
  The reading runs when the first picture lands, so the three compositions are
  resolved against a manifest with **no title in it yet** — and `recipes.js`
  drops a note whose text is empty and a sign with no chips. Typing the title
  afterwards changed the form, the draft and the validator, and not the
  layout. The page that came out of BUILD had **8 slots where the CLI
  generator's has 14**: no title, no tagline, no description, no store links.
  (The Phase 6.1 walk-through never saw it because it dropped the fixture's
  `manifest.json` beside the art, which fills the words *before* the analysis
  runs.) A word the layout reads now re-composes on a `RECOMPOSE_MS` 350
  debounce, and — because "the mockups will have caught up before a hand
  reaches the button" is a guess about a person — `press()` **flushes** a
  pending compose and waits for it before it reads the card it is about to
  build. The debounce is for the owner's eyes; the flush is what makes the
  file right. The button's own `disabled` was the double-press guard and that
  await would have handed it back mid-build, so the guard is a `pressing` flag
  now and `disabled` follows it.

### What was measured — headed system Chrome 152 at 1600 × 1000, DPR 1, sandbox on 4322

Results, and nine screenshots, in `perf/results/press-verify/`. **119 of 120
checks pass**; the one failure is the `verify-game.js` gate and is read below.

|  | pixelfort | mosslight | neonrun |
|---|---|---|---|
| roles read off the art | logo + keyart + 4 shots | logo + hero + 4 shots | logo + hero + 4 shots |
| preset (expected.json) | **pixel** 2.3, cel 7.0, grunge 7.2 | **painterly** 2.6, flat 3.6, cozy-soft 4.7 | **neon** 0.2, cozy-soft 2.9, cel 3.6 |
| recipes, ranked | poster, widescreen, scrapbook | widescreen, scrapbook, poster | widescreen, poster, scrapbook |
| the palette ambiguous? | **yes** — two cards of one recipe | no | no |
| mockups drawn / stickers on them | 3 / 6·6·6 | 3 / 6·12·6 | 3 / 6·6·12 |
| the tray, per card | 12 parts, 25 356 chars | 12 parts, 29 540 | 12 parts, 33 073 |
| built page | 18 sections, 0 iframes, `--paper #131524` | 16, 0, `#eeedd6` | 16, 0, `#0d0917` |

- **The tray wears the game's colours and not Knoll's, asked three ways.**
  Every `#rrggbb` in all 36 tray drawings is one of that card's own seven
  `--sk-*` roles and none is one of the sheet's six defaults. In PIXELS, the
  twelve drawings are put on a page of their own at the size the extractor
  made them and shot twice, on white and on black — a pixel identical in both
  is opaque drawing: **39 722 of 109 088 opaque pixels are pixelfort's
  `#9fc751`** (mosslight 53 263 / 96 019 of `#8a8853`, neonrun 33 212 /
  101 182 of `#963f81`), and **not one** of the 918 867 opaque pixels read
  across the three fixtures is a Knoll default the theme does not use.
- **And on the mockups themselves**, isolated by hiding the stickers and
  shooting again, then narrowed to FILLS: 494 of 555 sticker fill pixels are
  pixelfort's primary, 474 of 590 mosslight's, 348 of 353 neonrun's, and every
  card is clean of Knoll's six. **The fill filter is the whole trick and it
  was not the first idea:** a first cut read the whole box and found the
  sheet's own `#26212a` six times inside pixelfort's light twin — the paper's
  dark corner, not a sticker; a second cut isolated the sticker and still
  found six, this time the antialiasing walking between two of the theme's own
  roles. A fill is a pixel whose four neighbours are exactly it, an edge never
  is, and that is a fact about the bitmap rather than a judgement about which
  colours are allowed — so it is the same filter for presence and for absence.
- **Nothing reaches `:root`.** With three themed mockups up, the document root
  carries **no inline custom property at all** on any of the three runs, the
  table's own `--paper` is still press.css's `#faf7f9` on `body`, and the
  three stages carry their own (`#131524 / #e6eaff / #131524` for pixelfort).
  Preview's one rule holds under the Press Table and not only under its own
  harness.
- **THE STOPWATCH — the acceptance line, measured.** First file landing to
  `games/<slug>/` answering 200 with the generated markup in it:

  | | total | read | form (scripted) | build | with a person typing |
  |---|---|---|---|---|---|
  | pixelfort | **9.4 s** | 1.3 | 2.7 | 1.5 | **49.1 s** |
  | mosslight | **9.5 s** | 1.5 | 2.8 | 1.3 | **49.3 s** |
  | neonrun | **10.2 s** | 1.7 | 3.0 | 1.2 | **45.0 s** |

  The last column is the honest one and it is labelled an ALLOWANCE, not a
  measurement: the machine's typing is taken out and 202 / 203 / 179
  characters put back at five characters a second (a plain sixty-words-a-
  minute typist), with the 274 / 299 / 226-character description PASTED,
  because that is what somebody does with a paragraph out of a press kit.
  **The plan's two minutes holds with 70 seconds to spare**, and it holds
  under either reading. What it does not cover is the person's own thinking —
  choosing among three cards and turning a dial — and this script does neither.
- **Nine attacks, nine refusals, and the page still standing after each.** A
  thirteenth file — *"that would be 13 pictures; the limit is 12
  (manifest.schema.json's own maxItems)"*, the twelve kept. A 30 MB file —
  refused by size before it is decoded. A `.png` that is a text file — *"the
  browser would not decode it"*, refused by the decoder and not by its name.
  The slug `A B` — BUILD disabled, the slug field marked, `pattern: "A B" does
  not match ^[a-z0-9-]{2,40}$`, nothing posted. BUILD with the rights box
  unticked — `rights.attested — const: expected true, got false`; pressed
  anyway by DOM click AND by `Press.build()`, **0 POSTs and no folder**. BUILD
  pressed twice in one task — **one POST, one page**. A reload mid-flow — the
  title, slug, tagline, 274 characters of description, developer, publisher,
  release, the Steam link, two platforms and the attestation all come back out
  of PressStore, and the pictures do not, which is `store.js`'s own trade. The
  vibe door answering 500 — the preset, the recipe and the three cards stand,
  and the panel says it in a line of its own: *"no judgement from the model —
  the vibe door answered 500. Everything above is measured, and it stands on
  its own."* `?slug=verify-pixelfort` — the words, the roles and all six
  pictures come back, rebuilding **asks out loud**, and once answered it
  regenerates and keeps `index.html.keep-bak`.
- **`verify-game.js` on the three pages the Press Table built: 143 of 147.**
  mosslight and neonrun pass every check including step 6, the drop that is
  saved through the door and read back from the file. The four failures are
  **pixelfort's opening rectangle, and they are the ones the entry below
  already adjudicated** — a 1.15 : 1 poster on a 2.45 : 1 bench cannot leave
  less than 26.6 % on the sides at any zoom, and `openOf()`'s widening is the
  other two. They are not the Press Table's: `games/pixelfort`, built by the
  CLI from the same fixture, fails the same four with the same numbers to the
  hundredth (L 30.31 R 30.35 T 8.02 B 8.02 %; `open` 4599.32 × 1997.83),
  measured at the start of this pass before anything here was changed. Left
  standing, in `OPEN.md` §2, exactly as the Phase 5 pass left it.

### How it runs, and what it leaves behind

It builds to **`games/verify-<fixture>/`** — folders that did not exist when
it started and that it deletes in its `finally` (`--keep` leaves them). No
page that was on the disk is opened for writing, so there is nothing to
snapshot and nothing to put back wrong. Two consequences, both measured
rather than assumed: `serve.js` takes a `keep-bak` only when the page already
exists, so a fresh slug's first build spends none of the one-per-file-per-
process budget; and because the `?slug=` attack forces a second build, which
does spend it, the script **restarts the sandbox server** between the browser
work and the `verify-game.js` child, which is the fix that file's own header
prescribes. Results go to `results/press-verify/` and not to `results/press/`,
because that folder holds the screenshots the entry below cites by name.

**The sandbox is shared** and it showed: another phase restarting 4322 mid-run
reads here as `ERR_CONNECTION_REFUSED` from a `page.goto`, which is a fact
about the machine and not about the page. Two runs were lost to it before the
script learned to wait for the door, retry a navigation once, and treat each
fixture as its own walk-through so one falling over is one FAIL and not the
end of the run.

### Open, and known

- **The scrapbook card cannot be read in pixels on a mockup.** Its `open` is
  5279 units wide in a 361-px stage, so its stickers are three pixels across
  and have **0 fill pixels in twelve boxes** (measured on neonrun). Presence
  on the mockups is therefore asked of the three cards together; the per-card
  guarantee is the tray reading, at the size the drawing was made. Absence is
  still asked of every card.
- **The vision call has still never been made** (NOTES §D.11). Attack 8 proves
  what the page does when the door FAILS; what it does when a vibe actually
  comes back is still only exercised by `Vibe.merge`'s own tests.
- **Two things the two-minute number does not contain:** the owner's thinking
  (this script picks the first card and turns no dial), and a real folder of
  art — the fixtures are 300 KB of generated PNGs, and a press kit of twelve
  4K plates would spend its time in `Style.measure` and the WebP encode, not
  in anything measured here.

## Phase 5 verified — `perf/verify-game.js`: is a generated page a page that WORKS (2026-09-07)

- **What:** the plan's §9 5.5, written and run against all three fixtures.
  **`perf/verify-game.js` is the only file this pass added**; `README.md` is
  the only other one it edited — its command list carried the script as
  *NOT WRITTEN YET*, which is exactly what the acceptance line said too
  (*"produces a page that passes `verify-game.js`"* could not be run because
  nobody had written the thing it names). `press/recipes.js`,
  `press/tools/build-game.js`, `games/_template.html` and `kits.js` were
  **not** changed, and nothing outside `lab2/test` was written:
  `site/serve.js` and `site/vercel.json` are still dated 2026-09-04, and all
  three `games/<slug>/index.html` end this pass byte-identical to the
  build's own output (the script writes them for real through the sandbox
  door and puts them back in a `finally`).
- **Why:** every claim Phase 5 made had been checked either by the
  generator's own tests — `test-build-game.js` asks whether `build-game.js`
  writes what `build-game.js` meant to write — or by looking at a
  photograph. Neither can say that the picture in the third frame is the
  third screenshot and not the first, that a sticker is wearing the page's
  green rather than the sheet's pink, or that the file on disk is still the
  file the recipe wrote. All three turned out to be worth asking.

### 147 checks and 9 measurements over three pages: 143 pass, 4 fail, and the four are one thing

`node lab2/test/perf/verify-game.js` — headed system Chrome, 1600 × 1000 at
DPR 1, sandbox server restarted first, results in `perf/results/game/` and
six screenshots in `perf/results/phase5/verify-<slug>-<width>.png`.

| | pixelfort (poster, `pixel`) | mosslight (widescreen, `painterly`) | neonrun (widescreen, `neon`) |
|---|---|---|---|
| 0 · stands where it was built | 18 sections = 14 slots + 4 shots | 16 = 12 + 4 | 16 = 12 + 4 |
| 1 · console / page errors / ≥ 400 | 0 / 0 / 0 | 0 / 0 / 0 | 0 / 0 / 0 |
| 2 · document panels at 20 %, 100 %, open | 0 of 18 | 0 of 16 | 0 of 16 |
| 3 · picture aspect against its asset | 0.00 % on both | 0.00 % | 0.00 % |
| 4a · picture box against the sheet's rect | Δ ≤ 0.31 world units | ≤ 0.38 | ≤ 0.38 |
| 4d · nearest asset (mad, v. runner-up) | 4.0–4.6 v 25.3–34.6 | 1.1–1.2 v 14.9–17.9 | 3.1–4.5 v 11.3–18.6 |
| 5 · parts live, own pixels read | 9 canvases, 151 373 px | 7 SVG, 136 360 px | 7 SVG, 172 427 px |
| 6 · drop → ctrl+s → fresh context | burst −345 → −145, kept | banner 301 → 501, kept | banner 301 → 501, kept |
| 7 · opening zoom, 2560 / 1366 | 0.50 / 0.29 | 0.58 / 0.33 | 0.58 / 0.33 |
| 7 · note body on screen, 2560 / 1366 | 15.0 / **8.6** px | 17.5 / 10.0 px | 17.5 / 10.0 px |
| 7 · widest screen margin, 2560 / 1366 | **30.4 % / 28.9 %** | 22.7 % / 20.7 % | 22.7 % / 20.7 % |

**Every one of the twelve screenshots is in its own frame, and the reading
is decidable.** 4d shoots each `gz-shot` at 100 %, takes a 48 × 48 lattice
**in the picture's own turned frame** and matches it against a canvas
cover-crop of each of the game's four plates at the picture's own screen
size. A first cut used a 9 × 9 lattice and a mean colour and got two of
neonrun's four wrong — not because the page was wrong but because four
plates of one game share a palette: the closest two are **11.8** apart on
that scale and the coarse lattice's own resample noise was **12**. At 48
every plate reads **3.1–4.5** against its own and **11.3** against the next.
A count of four frames could never have caught a picture in the wrong one.

**The four failures are pixelfort's opening rectangle, and two of them are
arithmetic.** The poster's composition is 2014 × 1758 — **1.15 : 1**, a
portrait — and the bench is 2.45 : 1 at 2560 × 1111. A rectangle can only be
BIGGER than the box it frames (`lab.js` fits `min(w-fit, h-fit)` and
centres), so **no `data-open` can leave less than 26.6 % of a 2560-wide
bench empty on the left and the right**; the page leaves 30.4 %. That is a
portrait poster on a landscape screen and it is not a defect the generator
can fix. At 1366 × 768 the floor is 22.9 % against a measured 28.9 %, so
there the difference IS the generator's, and it has a name:
**`recipes.js`'s `openOf()` widens every composition to the bench's
2.302 : 1**, which takes pixelfort's rectangle from Appendix E's own
2254 × 1998 to 4599 × 1998 — **28.1 % of it bare paper on each side**, and
that is the other two failures. Measured cost, since the widening can only
lower the zoom and never raise it: **0 % at 2560 × 1111** (height binds
anyway), **−4.2 % at 1366 × 768**, and **−20.6 % at the 1600 × 1000 the
compositions were judged at** (pixelfort 0.3375 where the bare rectangle
gives 0.425). It is Appendix E's own instruction, argued for in
`recipes.js`'s header, and undoing it moves `data-open` on all three pages
and the opening zooms quoted in four files — so it is **measured and left
for the owner**, in `OPEN.md` §2, and not changed here.

### Three things the pass found that were not on its list

- **A page had been left dragged, and three runs in a row called it
  restored.** `games/mosslight/index.html` carried its banner at
  `data-home-x="501"` — exactly this script's own DRAG_PX right of the
  recipe's 301 — with four sections' `data-home-z` shuffled behind it. Two
  faults, one on top of the other. **The drift got in** because the restore
  asserted byte-identity in the same breath as the write, and `keep.js`
  sends a keepalive POST on `pagehide`: a save can land after the file was
  put back, and an assertion made that early is an assertion about the write
  and not about the file. **It then stayed in** because every later run
  snapshots the page at its own start and puts THAT back, so the next run
  took the drift for the baseline and said so with a PASS. Repaired from the
  build's own `index.html.keep-bak` (byte-identical to the build output;
  `neonrun`'s deleted backup was put back the same way), and closed three
  times over: the restore now waits **UNLOAD 800 ms** after putting every
  page back, reads them off disk again and undoes a late save if one
  arrived (`verify-keep.js` has always done that and this did not);
  **check 0** expands `game.json`'s layout the way `build-game.js` does and
  holds every section's `data-home-x/y/z` to it before anything else is
  measured, so an inherited drop is the FIRST thing a run says; and
  **`pressPoint()`** asks the page with `elementFromPoint` where a sticker
  is actually on top before pressing it — the press that started all of this
  landed on the middle of pixelfort's burst, which the logo is sitting over,
  and carried the logo instead.
- **Two windows on every widescreen page are drawn empty.** `badge-round`
  carries an `image-slot` (Appendix D) and Appendix E puts it on the hero's
  top-right as decoration, so its placeholder rect is painted in opaque
  `--sk-paper` — a white square on mosslight, a black one on neonrun. The
  plan (§3.6) says a page MAY replace an image-slot, so this is not a
  failure; it is the same defect Phase 5 fixed for the frames, standing
  where nobody looked. Counted and named by the verifier every run.
- **`banner` and `badge-round` are drawn with no words.** A text part's
  words come from `data-text` (CONTRACTS §7) and `skText` defaults to `''`,
  and neither recipe gives them any — so both widescreen pages carry a blank
  ribbon. Also counted every run. Both are taste calls for the owner; both
  are now numbers rather than something you notice or do not.

### What the verifier measures, and the numbers behind the hardest checks

- **The picture is over the frame's window, and the window is where the
  sheet says.** 4a recomputes CONTRACTS §8's mapping here — the sheet's own
  `slots` rect off `features/stickers-core.dc.html`, turned by
  `rect.rot + data-rot` about (64, 64), mapped through the slot — rather
  than calling `build-game.js`'s function, because a verifier that calls the
  generator's own arithmetic can only prove the generator agrees with
  itself. Δ ≤ 0.38 world units on all twelve.
- **`kits.js`'s re-cut, measured per page.** 4c maps the frame's window
  through the box `kits.js` actually left (`data-w` and the `left:` it
  seated the drawing at, read off layout properties so the sway cannot move
  the answer). pixelfort **0.26** world units off centre, mosslight
  **0.10**, neonrun **16.55** (6.5 screen px at its opening zoom) — the glow
  finish's four-sided spill, exactly the number `OPEN.md` §2 already
  carries, now reproduced by a script instead of by hand.
- **How a restyled colour is told from a wrong one.** `kits.js`'s
  `restyle()` never invents a colour: it removes layers, swaps a fill for a
  `url(#pattern)`, lays a texture rect at 0.18 opacity and adds filters. So
  every literal in a live part is still one of the page's seven `--sk-*`,
  and a WRONG colour is the SHEET's own default palette. The pixels are read
  by shooting each sticker's box twice, once as it stands and once with the
  section hidden, and keeping what changed — a section's box is bigger than
  its drawing, and a first cut read the sheet's `#26212a` off 31 pixels that
  belonged to the paper behind a tape-strip. A colour counts when a sample
  AND its four neighbours two pixels away carry it, which is what tells a
  flat from an outline's antialiasing. Every part is read at **1.3**, the
  first camera past `kits.js`'s `ZOOM_NO_TILES`, because a part drawn on a
  tile does not go away when its section is hidden — a first cut read zero
  own pixels for six of pixelfort's nine and passed them in silence.
- **`animations: 'disabled'` cannot be used on this page.** Playwright's own
  way of stilling a screenshot cancels every animation, and `lab.js` drives
  the camera with a Web Animations keyframe — so the world snaps back to its
  untransformed transform and the shot comes back as bare bench paper. It
  passed a "no placeholder colour" check on an empty page before anyone
  noticed. The sway is stopped with one `animation: none` rule on
  `.gz-art > svg, .gz-art > canvas` instead, and nothing else changes.

### Also measured

Zero console errors, zero page errors and zero responses ≥ 400 on all three
pages at all three viewports; zero iframes and zero document panels at 20 %,
100 % and the opening camera (a document panel is one with no `.gz-art` of
its own — `Frames.panels.length` is every section on the page and counting
IT would have been wrong); every store key `knoll-lab2:games/<slug>:` (27 on
pixelfort, 25 on the other two) with the sandbox bench opened in the SAME
storage deriving 8 bare `knoll-lab2:` keys and reading none of them; the
door answering `{"ok":true,"wrote":true}` on all three,
`index.html.keep-bak` written by the door and byte-identical to the page as
it stood, and the drop still there after a reload in a context with an empty
`localStorage`.

## Phase 6.1 + 6.2 + 6.7 — the Press Table: the page, the store, the flow (2026-09-07)

- **What:** the owner-facing table itself — `press/index.html`, `press/press.css`,
  `press/store.js` and `press/press.js` (`window.Press`) — plan §10 6.1, 6.2 and
  6.7, with §12 1's second mode built beside the first. Four new files, nothing
  else in the sandbox written; `press/preview.js` is the other half of the phase
  and is the entry above this one. **`press.css` holds no `.pv-` rule and Preview
  asked for none**: the mockups are painted entirely by preview.js's own injected
  styles, and the only mention of the prefix in this stylesheet is the comment
  saying so.
- **Why:** everything Phases 1–5 built was callable and none of it was reachable.
  This file is the ORDER those modules are called in, the state between them, and
  the sentences the panel says about what came back — it measures nothing and
  derives nothing of its own.

### The page

A plain page, not a bench and not a machine: no `lab.js`, no `#bench-world`, no
iframe, no Design Canvas export. The look is the house's own — lab.css's token
block copied (nineteen lines, the one duplication in the file, argued at the top
of `press.css`), Sora on Public Sans with a mono for the stamped labels, and the
hard-edged dark pill both docks are cut from wearing the one irreversible button.
The page never scrolls; the two columns do, which is lab.css's own rule for the
bench and holds here for the same reason — a build button you have to hunt for is
a bad button.

Left is what the owner puts in (the drop zone, then the pictures with the role
each was read as, then the words); right is what the machine says back (the
reading, the three compositions, the dials). **The reading panel is two columns —
what was measured on the left, why it came out that way on the right — because
stacked it runs to 640 px and pushes the three compositions off a 900-px screen.**
Measured after the change: at 1280 × 900 the reading is 65–522 and the three
mockups 536–786, all three above the fold, each stage 254 px across; at
1600 × 1000, 536–832 and 361 px across.

### Three definitions the plan left open, and what each is

- **"the palette is ambiguous"** (§10 6.4's condition for the light/dark pair).
  A palette is a list of colours each with a share of the pixels, and
  `Theme.derive` calls the page dark by the share-weighted mean of their
  lightness. There is a second, equally honest reading: count each COLOUR once —
  a key art that is seventy per cent sky is not a game about sky. **Ambiguous is
  "the two readings disagree"**, which is a fact about the palette rather than a
  threshold somebody picked, and the second card is then the same composition
  under the other reading. When they agree there is no twin and the three cards
  are recipes A, B and C — `Recipes.choose` always returns all three, so there is
  always a third thing to show. The second reading is made by handing
  `Theme.derive` the same swatches with their shares flattened to `1 − i·1e-6`
  rather than to a flat 1: derive breaks weight ties on the hex string and takes
  the paper's hue from the heaviest hued entry, so flat ones would hand the
  paper's hue to whichever colour sorts first alphabetically. A step of 1e-6 per
  place keeps the picture's own ranking and moves the mean by less than a
  millionth — five orders under theme.js's own STEP of 0.01, and it prints its
  means to two decimals. **pixelfort is ambiguous**: weighted mean L 0.44 (dark),
  per-colour light, so its three cards are poster/dark, poster/light,
  widescreen/dark.
- **the accent picker, "never a free picker"** (§10 6.5). `Theme.derive` picks
  the accent itself — the highest-chroma swatch carrying at least 2 % of the
  pixels — so overriding it means changing which swatch wins that contest, not
  painting a colour over the answer (a colour painted over the answer skips
  theme.js's contrast floors, which are the only reason the tokens are readable).
  Choosing swatch X therefore hands derive the same palette with every swatch
  MORE chromatic than X clipped down to just under X's chroma **at its own
  lightness and its own hue** — so the light/dark decision (lightness), the
  paper's hue and the ink's complement (hue and weight) are all untouched, and
  only the contest changes. Only swatches that could win it are offered:
  theme.js's own ACCENT_MIN_W 0.02 and GREY_C 0.02. The one cost, written into
  the file rather than hidden: a reason line naming where the paper's hue came
  from can print a clipped hex — same hue, less chroma — instead of the extracted
  one.
- **the sticker toggle.** It cannot be expressed as an empty `spec.stickers`:
  preview.js deliberately fills in whatever parts the layout needs and the caller
  did not hand it, which is right (a caller showing twelve parts should not have
  to know which forty a recipe reaches for). So the toggle filters the LAYOUT,
  dropping every sticker slot **except one carrying an `image`** — those are the
  frames the screenshots are mounted in (CONTRACTS §13), and dropping the frame
  drops the photograph with it. pixelfort's poster goes 14 pieces → 9. `open` and
  `openNarrow` are deliberately not recomputed, so the two readings stay
  comparable and the page does not re-frame itself round the hole, which is also
  what happens when a sticker is taken off on the bench.

`PALETTE_SEED` is the fixed string `knoll-press` and not the slug: the slug is
edited AFTER the reading has run, and the swatches must not shuffle under the
owner's hand while they type a title. The palette is read off a plate of
`PLATE_CELL` 320-px cells, one per hero/key-art picture, each contained on a
transparent ground — equal cells so a 4K hero and a 480-px key art count the
same, and the margin costs nothing because `Palette.sample` skips anything under
alpha 16. `ALPHA_T` 250 (five steps of decoder slop under opaque) on a copy no
longer than 512 decides `logo`.

### `press/store.js`

`Lab.store`'s shape copied, not imported, under `knoll-press:` — with the four
differences from lab.js written down where they are made: the namespace (the
bench's `reset data` must not walk a half-typed press kit), **the read-back**
(lab.js's save is `try { setItem } catch {}`, which is right for a camera
position and wrong for a paragraph somebody typed, so the key is read back and
`kept` says whether the write survived, the way tracer.js checks a filed
tracing), no pictures (a dozen screenshots as base64 against a five-megabyte
store), and a `reset()` that is a method rather than a dock button. A build that
succeeds removes the keys and **leaves the page standing**: the draft's job was
to survive a reload while it was being written and it has been written, but the
owner's next act is usually to look at the page, come back and build it again.

### What was measured — headed system Chrome 152 at 1280 × 900 and 1600 × 1000, DPR 1, sandbox on 4322

Results and screenshots in `perf/results/press/`.

- **The reading is the golden file.** Dropping `press/fixtures/pixelfort/art/`'s
  six PNGs plus its `manifest.json` by `setInputFiles` gives stats **byte-identical
  to `press/fixtures/pixelfort/stats.json`** — pixelSize 4, outline present at
  0.6, paletteCount 17, saturation 0.076, contrast 0.2048, hfEnergy 0,
  edgeDensity 0.1521 — the same rank (pixel 2.3, cel 7.0, grunge 7.2) and the
  same `hints.dark` true, from a browser drop rather than from the test harness.
- **The roles are read right, six of six**: `logo` by its alpha channel,
  `keyart-portrait` by being portrait, `shot-1…4` by sitting within 5 % of 16:9.
- **The layout is the CLI generator's.** `games/pixelfort-press/game.json` and
  the Phase-5 `games/pixelfort/game.json` carry the same recipe (`poster`), the
  same 14 slots and the same opening rectangle to the last hundredth
  (`{-2052.46, -1166.33, 4599.32, 1997.83}`). The sk tokens differ by a step or
  two (`#9fc751` against `#9cc754`) because the two read their palettes off
  different plates.
- **The whole flow, to a built page.** Two-step force, as designed: the first
  press is refused by the door with 400 `exists`, the footer says "press the
  button again to overwrite it", the second press asks out loud and forces.
  `games/pixelfort-press/` is written — six `.webp`, `game.json` version 1,
  `index.html.keep-bak` — and the page **boots with 18 sections, zero iframes,
  `data-open="-2052,-1166,4599,1998"` and `--paper #131524`**, its title in VT323
  and its stickers in the game's greens
  (`perf/results/press/game-pixelfort-press.png`). `perf/verify-game.js
  pixelfort-press` answers 31 of 42; the failures are read below.
- **Publisher mode.** With `/_lab2/test/default` answered 404 in the page, the
  mode plate says PUBLISHER MODE, the button says SEND TO KNOLL, the dial panel
  is exactly `accent, preset, hero`, and the bundle posts to `/_lab2/test/intake`
  and comes back with a token (22 characters, 6 files, 34 KB, filed under
  `press/cache/intake/`). The draft is deliberately NOT cleared: an intake is not
  a build, and the owner has still to approve it.
- **`?slug=pixelfort-press`** reads `games/<slug>/game.json`, re-fetches the six
  art files off the disk beside it so the whole reading runs again rather than
  being read out of the file, restores the roles from the manifest, and rebuilds
  behind the force prompt.
- **The guards.** `README.md` → "1 file refused: PNG, JPG and WebP only"; twelve
  pictures accepted and an eighteenth refused by count with the schema's own
  reason; `http://…` in a link marks that input and lists `links.steam —
  pattern`; the rights box unticked keeps BUILD disabled. A reload keeps the
  title, the link, the platforms and the attestation and loses the pictures,
  which is the trade `store.js`'s header argues for.
- **Nothing in the console** on any run except two deliberate lines: the 400 from
  the exists gate, and the 404 from the publisher-mode route stub.

### Four defects found by driving it, and fixed

- **Choosing a card threw away three rendered previews.** The click handler
  called `paintMocks()`, which clears `#pt-mocks` and rebuilds three empty
  stages; `markChosen()` now moves the outline and the radio and touches nothing
  that was drawn. `Preview.render` is the most expensive thing on this page.
- **The sticker toggle did nothing** — the third definition above is the fix.
- **A bad link marked no field.** `Validate` writes a plain-identifier key as
  `links.steam`; the matcher expected `links["steam"]`. It takes both spellings.
- **The theme's mood was handed back to the theme.** Passing derive the mood it
  had just worked out is true and useless: it answers `mood: loud (given)`
  instead of `mood: loud (saturation 0.08, accent C 0.15)`, and the panel wants
  the arithmetic. The mood is derive's own now unless the shuffle or a confident
  model has overruled it.

### Open, and known

- **`perf/verify-press.js` (§10 6.3) is still not written.** This entry's numbers
  come from a driver run by hand; the phase's own verifier is the next job.
- **The poster recipe leaves 28–30 % of empty margin on the sides**, so
  `verify-game.js`'s step 7 fails at both viewports. It fails **identically for
  the CLI-built `pixelfort`**, whose `open` is the same rectangle to the
  hundredth: it is `openOf` widening a 2014 × 1758 box to the bench's 3200 : 1390
  aspect, which is Appendix E and `recipes.js`, and nothing the Press Table does
  can move it.
- `verify-game.js`'s keep-bak step is unanswerable straight after a build:
  `serve.js` keeps one backup per file per PROCESS and the build has already
  spent it. Restart the sandbox server before that run — the verifier's own
  header says so.
- **The vision call has still never been made** (NOTES §D.11). The door answers
  `{vibe:null, error:'no ANTHROPIC_API_KEY'}` and the panel says, in a line of
  its own: "no judgement from the model — no ANTHROPIC_API_KEY. Everything above
  is measured, and it stands on its own." `judged by the model` appears only when
  a vibe actually comes back.
- `games/pixelfort-press/` is left on the disk as the evidence of the
  walk-through. It is a fourth generated page in the sandbox and nothing depends
  on it.

## Phase 6.4 — `press/preview.js`: the three mockups (2026-09-07)

- **What:** `press/preview.js` (`window.Preview`, two entry points and nothing
  else), `press/tools/preview-harness.html` (the mockups off the Press Table:
  three fixtures × three recipes, nine pictures and no forms) and
  `press/tools/shot-preview.js` (the shooter — `perf/shot-games.js`'s
  companion, and the reason there is a picture to argue with). Nothing else in
  the sandbox was written; `press/index.html`, `press.css`, `store.js` and
  `press.js` are the other half of Phase 6 and were not touched.
- **Why:** plan §10 6.2 step 4. The owner does not read a layout, they look at
  three of them side by side and pick one, so the mockup has to be the page's
  paper, the page's fonts and the page's stickers at a twelfth of the size —
  near enough that a choice made on the mockup is a choice about the page.

### The contract, and the one rule of the file

`Preview.render(container, spec) → Promise<{width, height, warnings}>` and
`Preview.trayFor(theme, style, count) → Promise<[{part, still, w, h}]>`, frozen
onto `window.Preview` and nothing else on window (the harness asserts the key
list: `{ render, trayFor }`).

**No token reaches `:root`.** Three mockups with three themes stand on one
page, so `--paper` on the document root would repaint the whole Press Table
and the second mockup would overwrite the first's. Every token of
`theme.tokens` is set as a custom property ON THE CONTAINER
(`el.style.setProperty`), custom properties inherit, and every rule reads
`var(--…)`. The rules themselves live in ONE `<style>` inside the container's
own subtree with every selector prefixed `.pv-`; **no rule was asked of
`press/press.css`** and no global CSS is written. The harness reads the
document root's inline custom properties after all nine renders and publishes
the list; it is empty.

Two more things the file does not do: it clears and rewrites only the
container (a second `render` on the same container supersedes the first
through a `WeakMap` token, so a fast tweak panel cannot leave half of one
mockup inside another), and it draws the sign's chips as `<span>`s rather than
anchors — a live store link inside a 40-px-wide thumbnail is a trap.

### The cache key

    JSON(palette, keys sorted) + NUL + halo + NUL + JSON(style vector, keys sorted, no motifs/mood)

- **the palette, not `theme.css`.** `theme.css` is byte-identical for a given
  theme (CONTRACTS §2) and is what the plan named; the palette is `theme.css`
  with everything that cannot change a drawing taken out. The sheet reads the
  seven `--sk-*` roles and nothing else (CONTRACTS §6; `kits.js`'s own
  `pagePalette`), so two themes that differ only in their paper share one
  extraction. **Measured:** a theme with `--paper` changed to `#ff0000` was a
  cache hit at 0 ms; the same theme with `--sk-halo` flipped to `1` re-extracted
  in 81 ms.
- **the keys sorted**, so the key is a fact about the vector and not about the
  order somebody typed it in.
- **`motifs` and `mood` left out**: `kits.js`'s style pass never reads them,
  they only reorder a tray of forty strings that are already in hand.
- **the PROMISE is cached, not the answer**, so three renders that start in the
  same tick share one extraction. **Measured:** nine mockups across three
  themes and three styles made **4 requests for the 224 KB sheet** — three
  extractions and one read of the `data-props` for the image-slot rects — where
  nine uncached `extractOnly` calls would have made nine. A rejected extraction
  is dropped from the cache so a later call retries.

### How a sticker string is painted

**Inlined, sanitised and re-suffixed**, not `<img src="data:image/svg+xml,…">`.
An `<img>` is the safer of the two and is wrong here twice over: an image is
its own document, so it cannot see the container's custom properties and all
eleven text parts would set their words in the browser's default face instead
of `var(--display)`; and an image clips at its own edge, where the
`drop-shadow(6px 7px 0 …)` every part wears is thrown 6 right and 7 down.

So: `DOMParser` (a parsed document is connected to no view and runs nothing),
then one walk that removes `<script> <foreignObject> <style> <iframe> <object>
<embed> <audio> <video>` and the SMIL `<animate*>/<set>` elements, drops every
`on*` attribute, drops every `href`/`src` that is not a same-document
`#fragment`, drops anything matching `javascript:`, and neuters any `url(` in a
style attribute that does not point at `#`. `<style>` is on that list for the
same reason `:root` is — a `<style>` inside an inline SVG is scoped to the
DOCUMENT. **Measured** against a hand-written hostile string carrying a
`<script>`, a `<style>{body{background:#f0f}}`, an `onload=`, a `javascript:`
href and an external `<image href>`: none ran, none survived into the DOM, and
the page's own background was unchanged.

**And every id is renamed** with a per-render suffix, references rewritten.
`kits.js` suffixes its ids with a hash of the STYLE vector, so two mockups of
one game at the same style and two different themes get the SAME suffix — and
`#sk-hatch` is drawn in `{{ skShadow }}`, a colour, so mockup 2's hatch would
have come out in mockup 1's shadow. **Measured:** two renders of the same part
under two themes share **0** ids of 9.

### The halo, which had to come the long way round

`--sk-halo` is the one thing a theme says about a sticker that `kits.js` reads
off the DOCUMENT ROOT (`haloToken()`, kits.js line 331) rather than off the
palette it is handed — and the root is where this file may not write. So the
halo is applied to the extracted string: the `display:none` comes off
`<g data-layer="halo">`, which is the same edit `kits.js`'s own `restyle` step
8 makes on the same node, done once on the cached extraction so the tray and
the mockups are one drawing. **Measured:** halo off → the layer is hidden in
the string; `--sk-halo: '1'` → it is not.

### Everything is laid out in world units

One layer at the layout's own coordinates, scaled once (`transform: scale(S)`),
the way `lab.js` scales the room. Three things follow and all three are the
reason: a note's type is laid out at its real 30 px and then shrunk, so **the
line breaks in a mockup are the ones the page will have** and do not move when
the mockup changes size; a sticker's 6 px drop-shadow is 6 WORLD units, the
same 6 the built page has, instead of 6 screen pixels that would swamp a 30-px
thumbnail; and nothing else multiplies a coordinate, so there is one place a
scale can be wrong. The paper's dot grid takes `lab.js`'s own floor (20 world
units a cell, doubled until it is ≥ 10 screen px — `gridUnit`, `GRID_MIN`,
`paintGrid`).

**The line breaks agree with the built page.** neonrun's description wraps to
the same seven lines in the mockup as in `games/neonrun/index.html`, and
mosslight's to the same seven; measured by reading both.

### The picture in a frame's window

`shotGeom` is `build-game.js`'s `shotGeom` line for line — the rect's centre
turned about (64, 64) by the section's `data-rot`, the rect's own tilt added to
that rotation, the prop cut to the axis-aligned box of the four turned corners
— and the rects come from the sheet's own `data-props.slots`, read the way
`build-game.js`'s `sheetSlots` reads them, so the mockup and the page compose
with one number. `object-fit: cover` is `preserveAspectRatio="xMidYMid slice"`.
The frame is drawn first and the picture second, markup order being pile order.

### Two defects, found by looking and fixed

- **The sign wrapped a chip the page does not wrap.** An SVG stroke straddles
  the edge it is drawn on, so `build-game.js`'s chip is `measured text + 2 ×
  padX` wide with its 4.5 border half in and half out; a CSS border sits wholly
  outside the padding box and made every chip 9 units wider. neonrun's row of
  three measures **705 in a 720-wide sign** — three chips at 9 is 27, so the
  mockup pushed TRAILER onto a second line where the page keeps one row. The
  border now comes out of the padding and the outer edge is exactly the page's
  rect. (mosslight really does wrap — ITCH.IO WEBSITE / PRESS KIT — on both.)
- **A warning about a font download, dressed up as a warning about a layout.**
  A webfont loads on demand, so the first paint of a mockup is laid out in the
  fallback stack and its notes wrap to a different number of lines; the
  note-height check would have told the owner about that. It now asks
  `document.fonts.check` about the FIRST family of the stack only — a check
  over a whole stack always says yes, because the stack ends in a generic the
  browser always has — and says nothing while the face is still coming. The
  harness draws every card, waits for `document.fonts.ready`, and draws all
  nine again, which is also nine more goes at "safe to call repeatedly on the
  same container".

### What was measured, and where it is

`node lab2/test/press/tools/shot-preview.js` → `perf/results/press/`:
`preview-all.png`, `preview-row-<slug>.png`, `preview-<slug>-<recipe>.png` and
`preview-summary.json` (named so it cannot tread on the `summary.json` the
other half of Phase 6 writes into the same folder). 1720 × 1000 at DPR 2,
headed system Chrome, the launch line every `lab2/perf` script uses;
`--w 1400 --label press-zoom` is the same nine at a size type can be read at.

**Nine mockups, nine renders twice over, ZERO warnings, no page error, no
failed request, and no custom property on the document root.**

What the three fixtures look like, judged against
`perf/results/phase5/game-<slug>.png`:

- **pixelfort / poster (as built)** — dark navy paper, the lime burst behind
  the logo, the tape strip across the key art's corner, VT323 title over Space
  Mono body, two sparkles, three chips in one row, the WISHLIST tag with its
  word in it, four polaroids with their screenshots inside. Every piece of the
  photograph is there and in the same place.
- **mosslight / widescreen (as built)** — the pale olive paper with its dot
  grid, the hero, the scalloped badge on its top-right, the logo over its
  lower-left, the moss-green banner at its foot, the curved arrow above a sign
  that wraps to ITCH.IO WEBSITE / PRESS KIT, four film cells with soft plates
  in them. Public Sans throughout, painterly stickers with their blurred shade.
- **neonrun / widescreen (as built)** — near-black paper, the magenta glow on
  every sticker, the wireframe hero with NEONRUN over it, the badge, the
  banner, the arrow, four glowing film cells, three chips in ONE row.

Side by side they are three different games at a glance — paper, accent, face
and sticker finish all read at 520 px — and each row's three recipes are three
visibly different compositions of the same game. A person could choose.

### Left standing, and for somebody else

- **`scrapbook` has now been composed, three times, and it is the first look
  anybody has had at it** (OPEN.md §2: no fixture reaches it). It works —
  polaroids on pins, tape crosses, a ring round the release date, the loose
  motifs — but on all three fixtures the `circle-mark` and the release note
  land ON the description's last lines, and the mushroom sits over the column.
  That is `press/recipes.js`'s geometry, not the mockup's, and it is worth a
  look before a scrapbook page is built.
- **The ranked-2 and ranked-3 recipes are honest about art they were not
  chosen for.** mosslight under `poster` puts the note column over a
  landscape key art standing in for a portrait one, and the tagline is
  unreadable on it; `poster` and `scrapbook` frame a composition inside an
  `open` widened to the bench's 2.3 : 1, so the paper either side is a third of
  the card. Both are `recipes.js`'s `openOf` and the recipe chooser doing what
  they say; the mockup is the first place either has been visible.
- **A sticker slot's `data-palette` is not painted** — it would be a second
  extraction of forty drawings per distinct skin, and no recipe uses one. A
  slot carrying one is reported in `warnings`.
- **The mockup does not MEASURE the type**, on purpose: `build-game.js` loads
  the face as a `FontFace` and measures every candidate line because the boxes
  it writes into a file have to be right; a mockup lets the browser wrap the
  same words at the same size in the same face. Where the two disagree by more
  than 12 % of the slot's height it is a warning, not a correction.

## Phase 4 verified — `kits.js` under attack: the old kits, the cache key, the turn, the ten presets, the bench-less page (2026-09-07)

- **What:** an adversarial pass over `lab2/test/kits.js` — the file Phase 4
  rewrote from 953 to 1768 lines — asking whether the forest, village and
  gnome path still does what the live `lab2/kits.js` does, and whether the
  new work is right rather than merely present. Every hunk of
  `diff lab2/kits.js lab2/test/kits.js` was read. **Two defects were found
  and fixed in `kits.js`** (below); two files were added,
  **`perf/verify-kits.js`** (the live bench's own gesture sheet, pointed at
  the sandbox) and **`perf/verify-kits-adv.js`** (the five questions), plus
  **`press/tools/no-bench.html`**, the page a bench-less `kits.js` is proved
  on. Nothing else in the sandbox was written and nothing outside it was
  touched; `index.html` is byte-for-byte what it was (md5
  `6cddd2f6d3ff1ee5a6048c2b7c776fb0`), the autosave door 404'd before the
  first byte of every run.
- **Why:** the restructure moved the extractor above the `if (world)` guard
  and put a palette resolver in front of every sheet load. Either could have
  changed what a tree looks like without anyone noticing, and the contract's
  own warning — two sections of one part in two colours sharing a bitmap —
  is a bug that is invisible while you are zoomed in on it.

### The two defects

- **`pagePalette()` read the page's custom properties for all four kits.**
  The file's own header says *"None of that reaches the other three sheets …
  the pass is skipped for them"* and `CONTRACTS.md` §6 lists the `--sk-*`
  roles and no others — but the resolver walked whatever palette the sheet
  declared, so a page carrying `--leaf-main`, `--leaf-dark`, `--leaf-lite`
  or `--cap-a` would have silently repainted every tree on the bench. Worse,
  the forest's `sparkles` is a **flag and not a colour**: a token would have
  come back through the string branch, and `!!'false'` is `true`, so
  `--sparkles:false` would have turned the sparkles *on* and nothing could
  have turned them off. Fixed: the token lookup is the stickers' alone and
  the other three are handed a copy of their own palette, with the sentence
  saying why. No page on either bench defines those tokens, so the fifty-six
  old-kit strings were already identical — the fix makes that true by
  construction instead of by luck.
- **`neededDefs()` copied `#sk-wobble` without asking whether there was a
  line to wobble.** Appendix C's `painterly` is wobble 0.3 with `lineShow`
  false: step 1 removes the line layer, step 5 never reaches for the filter,
  and a turbulence map went into all forty strings and into every sprite's
  `data:` URL pointing at nothing. The same file's `filtered` flag already
  makes the right reading two hundred lines further down; `neededDefs` now
  makes it too. Painterly's copied defs go **4 → 3**
  (`sk-soft, sk-paper, sk-body-<part>`); every other preset is unchanged.

### What was measured — headed system Chrome 152, 1600 × 1000 at DPR 1, door blocked

**`perf/verify-kits.js` — 20/20 PASS** (sandbox on 4322). `../../perf/verify.js`
adapted to the stand's trees: ctrl-ink on the trunk and paper in the corner,
the rim on and off, drag 150 × 80 and `ctrl+z` back, the band, copy/paste
(a kit copy, no iframe, in `Kits.recs`), delete-and-undo of a copy and of an
original, the corner re-cut to 166 × 225 at k = 0.60 and double-clicked back
to 276 × 375, lower/raise, and the grades: 20 % → 16 tiles / 8 live / 0
documents, 400 % → 0 tiles / 11 live, 100 % over the stand → `full 4, sway 1`.
A tree still behaves exactly as a tree.

**`perf/verify-kits-adv.js` — 47/47 PASS**, results in
`perf/results/kits-adv/`.

- **A · the old three kits, live against sandbox.** `4321/lab2/` and
  `4322/lab2/test/` open at once; all **fifty-six parts plus the three
  keyframe blocks byte-identical** across `w h full sway still raster spill
  shadow motion text ink`. Fifty-nine records, no difference.
- **B · the sprite cache key.** A tray sticker copied by the bench's own
  gestures and carried 420 px clear, the two sections given different
  `data-palette` (`#e01010` and `#10a010`), the camera taken to 50 % —
  under `ZOOM_NO_TILES`, and a 134-unit sticker draws 67 px, far under
  `SWAY_PX`, so both are sprites on tiles. Two variant records
  (`stickers/burst@1vxr4t9`, `stickers/burst@1bg42wy`), and the two tile
  regions read **`224,16,16` and `16,160,16`** — two bitmaps, each its own
  section's palette. The bug the contract warns about is not present.
  Then `Kits.setStyle` to ink-sketch mid-page: both variants are built again
  against the new style and both colours survive the re-bake.
- **C · `data-rot`.** A `tape-strip` twin at `data-rot="45"`. Over a 29 × 29
  grid of each box, **91 points inside the turned ink and outside the flat
  ink, 95 the other way** — both directions, which is what makes the reading
  decidable. Against the flat twin sampled at the back-rotated point,
  **669/669 = 100 %**. Ctrl over a turned-only point picks the turned
  sticker; ctrl over a flat-only point picks **nothing**. And the sprite is
  turned too: paint (alpha 255) where the turn put it, none (alpha 0) where
  the flat drawing was.
- **D · the style pass, all ten of Appendix C's presets.** `lineShow:false`
  takes the line away (flat, painterly) and nowhere else; the wobble filter
  and its `line-2` second pass; the displacement scale written into the
  part's own copy at **2.4 = 0.6 × 4**; `#sk-soft` for soft and painterly;
  `#sk-hatch` / `#sk-dots` / `#sk-dither` swapped into the shade; flat drops
  the shadow layer and cel keeps it as drawn; the texture rect clipped
  `url(#sk-body-burst-…)` and absent for flat and cel; **the halo shown for
  outline-cartoon and cozy-soft and for nothing else**; glow →
  `drop-shadow(0px 0px 6px #c93b82)` and `finish:none` → no root filter at
  all; every copied def id suffixed with the style's hash.
  **And the sprite against the live part:** the raster string re-shadowed by
  the painter's own recipe against the still string wearing its own filter,
  both rasterised in the same 448 × 448 padded frame — **mean pixel
  difference 0 – 0.12 %** at every preset (worst: painterly 0.12 %), against
  a 2 % bar. The `0px 0px` spelling of the glow does round-trip.
  Pixel = 4: a `<canvas>` 34 × 34 at `image-rendering:pixelated` in the live
  DOM, the same bitmap on the tile, and a text part keeping its live svg at
  `shape-rendering:crispedges`.
- **E · a page with no bench.** New `press/tools/no-bench.html`: one
  `<script>`, no `lab.css`, no world. It does not throw, makes **no
  `#kit-layer`**, and `Kits.extractOnly` hands back **forty strings at
  128 × 128** in the caller's palette — 35 of 40 carry the caller's
  `#123456`, **none carries the Knoll pink**, the two roles the caller left
  out fall back to the sheet's own, `skText` reaches all eight text parts,
  the ink-sketch vector is applied on all forty, and **not one `{{ }}`
  survives** anywhere. Zero console errors, nothing over 400.

**Re-run after the fix:** `verify-kits.js` 20/20, `verify-kits-adv.js` 47/47,
`perf/verify-kits-skin.js` 62/62, `perf/verify-tray.js` ALL PASS,
`perf/smoke-bench.js` ALL PASS (48 parts, 20 tiles, 8 live, **0 documents**,
zoom 0.3667). `perf/verify-sheet.js`'s bench half was **not** run: it writes
`index.html` for real and another phase was editing that file during this
pass, which is the case its own README warning names.

### Left open, deliberately

- `CONTRACTS.md` §7's prose says a bench-less `window.Kits` exposes *"ONLY
  extractOnly + kindOf + isKitSrc"* while its own shape line on the next
  page says four keys; the file returns five (`+ setStyle`). A superset, and
  harmless — `setStyle` on a page with no sheet loaded resolves to `null` —
  but the contract owes itself one sentence.
- `Object.keys(SHEETS).forEach(loadSheet)` fetches the 224 K sticker sheet at
  boot on any page that loads `kits.js`, asked for or not. Right here (the
  tray uses it, and `index.html` preloads it) and the same thing the file has
  always done with its three; the merge owner should decide it for a live
  bench that has no stickers.
- `foldStyle` lets the style vector's `lineWeight`/`corners` write over the
  page's `--sk-stroke` / `--sk-radius`. Unspecified in §6, and a no-op under
  the default vector, which carries neither field.
- `swayShare` stays the scalar `1`: §8 4.6 found every preset at the floor
  with twenty filtered parts swaying, so the cap was never reached.

**A note for whoever writes the next bench test:** the first run of section C
read 61.5 % agreement, and the fault was the harness, not `kits.js` — a
pasted copy lands offset down and right, so **the copy's own centre sits over
the ORIGINAL's `.gz-size` corner**, and a press there re-cuts the original
(it went to 554 px wide) instead of carrying the copy. `twinOf()` now grabs
low and left and asserts neither box was re-cut.

## Phase 5 finished — the screenshots are on the page, and the words are off the art (2026-09-07)

- **What:** two defects found by LOOKING at the three built pages
  (`perf/results/phase5-before/game-*.png`), and the harness that found them.
  **1 · every generated page showed four EMPTY frames and none of the game's
  four screenshots.** `press/tools/build-sheet.js` now records each part's
  `image-slot` rect in the sheet's own `data-props` under `slots`, and
  `press/tools/build-game.js` composes a framed screenshot as TWO sections —
  the frame sticker, and a `gz gz-pic gz-shot` prop clipped into that rect over
  it. **2 · on `widescreen` the title, tagline, description and store chips
  were laid over the hero's lower half** (Appendix E's own coordinates), and on
  a busy key art they were unreadable; on `poster` the key art drew narrower
  than one of its own screenshots and the text column sat alone on the right.
  Five of Appendix E's numbers are corrected in `press/recipes.js`, each
  argued where it is written. New: `perf/shot-games.js` (the `_tmp-shot-games.js`
  scratch harness folded into a real one and deleted). Also edited:
  `press/schemas/layout.schema.json`, `press/tools/test-recipes.js`,
  `press/tools/test-build-game.js`, `press/CONTRACTS.md` §8 and §13,
  `README.md`, `OPEN.md`. `kits.js`, `frames.js`, `lab.js` and everything
  outside `lab2/test` were NOT touched.
- **Why:** plan §3.6 says an `image-slot` is "a `<rect>` placeholder that the
  page may replace with a clipped picture" and Appendix E puts the screenshots
  in `frame-polaroid` and `frame-film` slots — a page that draws the frames and
  not the pictures is a press kit with no press kit in it. And plan §0.5 says
  Appendix E's coordinates are "a first guess … the fixture tests and probes
  are how it gets corrected"; this is the probe, and it corrected them.

### 1 · The screenshots, and why it is two sections

A kit part may hold **no `<image>`** (ADDING.md §1.2), and `kits.js` rebuilds a
sticker's `.gz-art` from the sheet every time it changes grade, so the picture
cannot live inside the sticker. The page composes it instead.

- **The rect is recorded in the sheet, not read out of a part file by the
  generator.** `build-sheet.js` is already the one parser of
  `press/tools/parts/*.html`, so the rect cannot drift from the drawing it came
  from; `data-props` is where the tray already reads a part's metadata (§3.6's
  own third bullet); and the sheet is the artifact `kits.js` rasterises, so the
  generator and the browser work off one file. It survives a rebuild by
  construction — it *is* the rebuild. `{x, y, w, h, rot}` in the part's 128
  units, the rect unrotated plus the angle it is turned by about its own
  centre. Measured off the five parts that have one: `badge-round`
  46,34 36×36 · `frame-polaroid` 29.3,22.03 68×68 **rot −5** (the tilt of its
  card, a `<g transform="translate(64 64) rotate(-5)">` reduced to an angle) ·
  `frame-ornate` 32,28 64×72 · `frame-pixel` 36,36 56×56 · `frame-film`
  20,38 88×52. A part Appendix D gives an image-slot to whose rect cannot be
  read is a **fault** and the sheet does not build: a frame in the wrong place
  is worse than the empty frame it replaced.
- **The mapping.** A sticker slot at (x, y) scale s puts part-unit (u, v) at
  world (x + u·s, y + v·s). The rect turns twice about ONE centre — its own
  tilt inside the drawing, and the section's `data-rot`, which `kits.js`
  applies as a CSS rotate about (P.w/2, P.h/2) = (64, 64) — so the angles add,
  and the prop is cut to the axis-aligned box of the four turned corners.
  neonrun's first film cell: slot (−880, 80) scale 3.3, rect 20,38 88×52,
  data-rot −2 → prop at (−817, 200), box 89.76 × 55.04 at scale 3.3,
  `viewBox="19.12 36.48 89.76 55.04"`, the picture inside a
  `<g transform="rotate(-2 64 64)">`.
- **COVER, not fit:** the picture is a nested `<svg>` carrying the asset's own
  viewBox and `preserveAspectRatio="xMidYMid slice"`. A nested svg is its own
  viewport and clips to it, so the crop costs no `clipPath` and no id anything
  else could collide with — a 16:9 shot in the polaroid's square window is
  cropped at the sides, not letterboxed.
- **Order: the frame first, the picture over it.** The `image-slot` layer is
  the part's LAST child and its rect is opaque `{{ skPaper }}`, so a frame
  drawn after the picture would cover it. The border still reads over the
  picture's edges because every part insets its slot inside the outline that
  frames it (frame-film's cell is stroked at y 36 and its slot starts at 38,
  "so the picture does not sit on the inner half of that stroke and thin it").
- **Rotation was KEPT, not dropped** (plan §16 q4): `data-rot` landed in
  `kits.js` in Phase 4b, so the recipes' ±2° is honoured and the picture turns
  with the frame by the sum above. `build-game.js` now takes both angles from
  one `rotOf(slot)`, so the frame and the picture cannot be turned by two
  numbers that nearly agree.
- **`data-home-z` is now the SECTION's index, not the slot's** (CONTRACTS §13,
  edited): a framed shot is two sections where the layout had one slot, so the
  two numberings parted company and it is the pile that has to be right.
- **What is still loose, measured:** `kits.js` re-cuts a sticker's box to the
  ALPHA box of the drawing plus its shadow, and a style whose `finish` is
  `glow` swaps the sheet's 6,7 drop-shadow for `drop-shadow(0 0 6px)`, which
  spills on all four sides. On neonrun that seats the drawing 5 units in from
  its section's left edge (`data-w` 134 → 141, the svg at `left: 5px`), where
  pixelfort (`pixel`) and mosslight (`painterly`) both measure 0. A prop has no
  such re-cut, so under a glow style the picture sits ~5 part-units — 17 world
  units, 6 screen px at the opening zoom — left of centre in its window. It
  stays inside the window. Closing it needs the part's ink box at build time,
  i.e. rasterising the part the way `kits.js` does — `OPEN.md` §2 carries it.

### 2 · The composition, judged by looking

`perf/shot-games.js`: each page opened at 1600 × 1000 with the door 404'd, the
whole viewport shot at the page's OWN opening zoom, plus a crop of the note and
sign props so the words can be read at the size the page opened them.
`perf/results/phase5-before/` is the before, `perf/results/phase5/` the after.

| | before | after |
|---|---|---|
| screenshots on the page | 0 of 4 (three pages: 0 of 12) | 12 of 12, each in its frame |
| sections (pixelfort / mosslight / neonrun) | 14 / 12 / 12 | 18 / 16 / 16 |
| body type, on screen at the opening zoom | 7.4 px (pixelfort) · 8.6 px (the other two) | 10.1 px · 11.8 px |
| title / tagline, on screen | 18.9 / 10.1 · 22.0 / 11.8 | 25.3 / 13.5 · 29.5 / 15.7 |
| widescreen's words | title, tagline, description and sign ALL inside the hero's rectangle | a column at x 780, width 720, clear of it |
| widescreen's opening rectangle | 3951.19 × 1716.3 | **3951.19 × 1716.3 — the same, to the unit** |
| poster's key art | 264 world units wide (a polaroid is 389) | 624 × 832 |
| poster's opening zoom | 0.3375 | 0.3375 (unchanged) |

**The five numbers that moved, and why each one:**

1. **the note's body: 22 → 30** (`NOTE`, and `CHIP` × 3 with it). The first cut
   took the bench's wall note verbatim on the argument that a note is a note.
   It is not read at the same size: the bench frames its own opening rectangle
   at 0.72 and a game page frames its composition at 0.34–0.39, because
   `openOf` widens a ~1.2:1 composition to the bench's 2.3:1. 22 units was
   7.4–8.6 px of type. 30 is 10.1–11.8, and it cost neither recipe any opening
   zoom because on both the composition's HEIGHT is set by the pictures.
2. **widescreen's words moved off the hero and beside it.** Under it would have
   added ~500 of height — and height is what sets the zoom, since the opening
   rectangle is the box widened to 2.3:1 — so the words would have been moved
   off the art and shrunk in the same stroke. Beside it the box grows only in
   x, 1842 → 2400, and 2400 + 240 is still under the 3948 the aspect was going
   to demand: the opening rectangle came out identical. The LOGO stays on the
   hero — Appendix E asks for it there and it is art with alpha drawn to sit on
   art. The arrow "from the description to the sign" turns 45° to point down at
   the chips (not the 58° a first cut had: `kits.js` clamps `data-rot` to ±45
   and `layout.schema.json` holds a slot to the same bound, so 58 was a number
   the page could never have drawn — the schema caught it).
3. **poster's key art: scale 0.55 → 1.3.** At 0.55 the picture the page is
   about drew 264 units across, narrower than one of the four polaroids under
   it. At 1.3 it is 624 × 832 and lands inside the box the logo, the burst and
   the screenshot row already made, so the opening rectangle did not move.
4. **poster's and scrapbook's note column: 560 → 760.** 560 is 32 characters a
   line at the 30-unit body; 760 is ~44. On the poster it also closes the gap
   the second defect named: the art now reaches 104 and the column starts at
   Appendix E's own 240, a 136 gutter instead of 496 of bare paper.
5. **poster's column FLOWS** from (240, −650) instead of standing on Appendix
   E's three fixed y's — at the new body size the title note is ~190 tall
   against the 230 that y allowed, which the first fixture's two-line tagline
   already ate.

**And one estimate corrected by the same looking: `NOTE.em` 0.55 → 0.62.** The
recipe cannot measure a face, so it wraps at an average advance; plan §9 5.2
offers 0.55. `build-game.js` measured the real ones — Public Sans 0.4527, Kalam
0.4225, **Space Mono 0.6120** — so 0.55 is LOW for the body of the `pixel` and
`scifi` pairings, and neonrun's description came out one line taller than its
estimated box with the arrow under it landing on the last line (seen on the
built page). 0.62 is a shade over the widest of the three, so the estimate is
high for all nine pairings, which is what a box is for. It cost the fixtures no
opening zoom.

**Left alone, and said out loud:** no fixture reaches `scrapbook` (all three
resolve to `poster` or `widescreen`), so it has never been built or
photographed. Its two shared numbers were kept consistent with the recipes that
were corrected; its composition is untouched and unjudged — a taste call nobody
has looked at, not a defect anybody has seen. `OPEN.md` §2 carries it. The
poster's tape-strip overlapping the burst, and the tag-wishlist hanging off the
sign's right, are taste and were left.

### Measured

- `perf/results/phase5/summary.json` — three pages: **zero console errors, zero
  page errors, zero responses ≥ 400, zero iframes, zero panels still loading**;
  4 screenshot props each; 18 / 16 / 16 sections; zoom 0.3375 / 0.3928 / 0.3928;
  type on screen 25.3/13.5/10.1 (pixelfort) and 29.5/15.7/11.8 (the other two).
- `node lab2/test/press/tools/build-sheet.js` — 40 of 40 parts, 224.4 KB, five
  `slots` recorded. `check-sheet.js` **28/28**, `perf/verify-sheet.js`
  **387/387** (both halves, the bench half restoring `index.html` byte-identical).
- `test-schemas.js` **174/174** (`layout.schema.json` gained the `image` row;
  it sets no `additionalProperties: false` at the slot level, so the row
  documents the key rather than admitting it).
- `test-recipes.js` **177/177** (was 171 checks; the five corrected coordinates
  are asserted under their own names, and a flowed note is asserted by its x,
  its width and that it clears the note above it — its y is a measurement now,
  not a coordinate).
- `test-build-game.js` **98/98** (was 95; two new checks — the section count
  against slots + framed shots, and every screenshot at the sheet's own slot
  rect, over its frame, clipped to cover, turned by the same angle).
- `test-serve.js` **163/163**, `perf/verify-template.js` **17/17**,
  `perf/verify-tray.js` all pass. The server was restarted after
  `build-game.js` changed (`serve.js` requires it once per process).

## Phase 4 verified — the floor and the sheet, re-measured rather than read (2026-09-07)

- **What:** an adversarial pass over `PRESS-TABLE-PLAN.md` §0.3's two claims —
  *the perf floor holds* and *stickers are kit parts, never machines* — by
  running the measurements again instead of believing the table. Two files
  were changed and both for a defect found in the pass: `perf/probe-stickers.js`
  (a narrowed run no longer overwrites the ten-preset record the shipped sheet
  cites) and `press/tools/build-sheet.js`'s header template (the worst-frame
  sentence, recomputed), with the sheet rebuilt from it and the one number that
  moved with the rebuild — `223 K` → `224 K` — corrected in `README.md` and in
  `index.html`'s head comment. One file was added: **`perf/verify-floor.js`**,
  which is this pass's own measurement made repeatable — eight checks, the
  bench with the tray against the same bench without it. **`kits.js` was not
  touched** (another verifier owns it) and nothing outside `lab2/test` was
  written.
- **Why:** §8 4.6's numbers are the whole warrant for putting forty stickers on
  a bench, and they were a single run on a single machine. A claim that cannot
  be reproduced is not a measurement.

### What reproduced — `perf/results/stickers-partial/`, two more runs

`probe-stickers.js --presets ink-sketch,pixel,flat` run twice (215 s each,
headed system Chrome 152, 1600 × 1000 at DPR 1, sandbox server on 4322, door
404'd before the first byte), each with its own floor page measured in the same
run. One filtered preset (ink-sketch, wobble + a second line pass), `pixel`,
and `flat`, as the three the plan's rules pull apart.

- **The floor came back 6.1 ms at all six cameras, both runs** — the same
  number the builder measured, and the same 165 Hz slot.
- **Idle median 6.1 ms at every camera, every preset, both runs.** Equal to the
  floor, not merely inside the 1.5 × slack.
- **The live counts came back to the digit:** 15 live at 20/35/50/100 %, **50
  at 166 %**, 22 at 400 %; ink-sketch **50 of 50 filtered at 166 %** (record
  and DOM walk agreeing at every camera, in both runs), 20 swaying; `pixel`
  swaying 0 at every camera; `flat` reaching `full 4` only at 400 %.
- **Zero documents at every camera of every preset, both runs**, and zero
  console errors, page errors and responses ≥ 400 across all eight pages.
- **The method holds under audit** (asked of the summaries, not of the header):
  every one of the 66 `LOOK`s in the builder's ten-preset run and all 24 in
  each of mine resolved on `lab:still` and not on the 1500 ms timeout, so the
  camera really had stopped; every `SETTLE` settled inside its cap on a
  signature that includes `Kits.stats()`'s live/tiles/sprites, so no raster was
  in flight; the live counts are read from `Kits.stats()` immediately before
  the idle sample **and again after the pan**, and the two agree everywhere.
  The floor is measured on this machine in the same run, never assumed.
- **What did NOT reproduce is the tail, and only the tail.** `flat`'s worst
  frame went 6.6 → **30.5** → 6.6 ms, `pixel`'s 12.1 → 12.2 → **18.3**,
  ink-sketch's 12.3 → 12.3 → **18.3** — each a single frame inside a four-second
  pan, each still under the 34 ms line, with the idle second untouched at 6.1.
  Some of that is other agents' Chrome on the same machine while these ran
  (`results/kits-adv/` and `results/phase5-before/` were written during run b).
  The sheet's header now says so: the range is one run's tail, the 34 ms is the
  line. Console output for both runs is kept beside the summary as
  `console-run-a.log` / `console-run-b.log`.

### What the tray costs — `perf/verify-floor.js`, `perf/results/floor/`

The question the tray's own stage could not answer: the bench **with** the
forty sticker sections against the same bench **without** them, in one run, at
the same cameras. `perf/fixtures/bench-tray.html` and `bench-no-tray.html` are
`index.html` with a `<base href="../../">` and, in the second, the block
between the two `THE STICKER TRAY` markers cut out — nothing else differs,
`data-open` included, so the delta is the tray and not the page. It was run
twice: once by hand (`results/adversary/summary.json`) and then again through
the new `perf/verify-floor.js`, which writes the two fixtures itself, asks all
of it as **eight checks — 8/8 PASS** (`results/floor/summary.json`), and is
there so the next hand can repeat this rather than take it.

| camera | with tray | without | Δ idle | both runs |
|---|---|---|---|---|
| 20 % (the whole page) | 6.1 ms | 6.1 ms | **0.0** | **0.0** |
| 100 % over the tray's middle | 6.1 ms | 6.1 ms | **0.0** | **0.0** |
| 100 % over the stand (both pages have it) | 6.1 ms | 6.1 ms | **0.0** | **0.0** |

`bench-tray.html` reproduces the real bench at every camera to the number
(49 panels, 0 documents, live 8 / 8 / 13, tiles 16 / 12 / 19 — a check of its
own, because the pair is worth nothing if the copy is not the page). Documents
are **0 on both pages at every camera**, in both runs. The tray costs no idle
frame anywhere; the pan tails moved by up to a couple of frames in either
direction, with the biggest of them (30.5 ms) on the page WITHOUT the tray,
which is the same machine noise as above and not the stickers.

**What the tray does cost, plainly:** eight parts that are live SVG for ever.
The eight text-slot stickers (`banner ribbon-corner badge-round badge-shield
bubble-speech bubble-thought bubble-shout tag-price`) can never be sprites —
ADDING.md §1.2's rule — so at 20 %, where the no-tray page has **0** live kit
parts, the tray page has **8**, at the `still` grade with nothing animating.
Measured: it does not move the idle median off the floor at any camera. It is
worth knowing before a recipe asks for a ninth.

### Stickers are kit parts, never machines — asked of the DOM

On the sandbox bench at the opening camera (0.3667), 20 %, and 400 % over both
the tray and the stand — twice, by hand (`results/adversary/bench2.json`) and
then as checks 1–5 of `verify-floor.js` (`results/floor/summary.json`):

- **`Frames.panels.filter(p => p.loading).length === 0` at all four**, and 0 on
  the no-tray copy too. `iframes` on the page: **0**. Sticker sections holding
  an iframe: **0 of 40**, at every camera.
- All forty carry `data-kit` and a `.gz-art`; none carries `data-live`, so the
  bench's two marked exceptions are still two.
- **The hard rule holds:** computed `filter`, `mix-blend-mode` and
  `backdrop-filter` read on `#bench`, `#bench-world`, `#kit-layer`, all 49
  sections and all 49 `.gz-art`s — **not one is anything but `none` /
  `normal`**. The eight live sticker svgs carry a `filter:` in their own root
  style (the contract's drop-shadow, §8) and that is inside the part, which
  ADDING.md §5 allows and this check counts separately so the two can never be
  confused. `lab.css` is byte-identical to the live bench's, and its one
  filter-on-a-`.gz-art` rule is `:not([data-kit])`.
- **The Phase-4a trap is closed where it matters.** `#bench-world`'s innerHTML
  does hold four `{{`, and all four are in **two comment nodes** — the tray's
  own prose in `index.html` quoting the role names. Walking TEXT nodes instead:
  **0 of 320 hold a `{{`**, the eight rendered `<text>` elements are `WISHLIST`
  (the `data-text` variant) and seven empty ones (`skText ''`), and there is
  **not one `sc-interp` span** on the paper.

### The sheet's header, and the two defects fixed

- **`features/stickers-core.dc.html`'s four Phase-4.6 lines ARE the numbers the
  probe produced** — checked line by line against `results/stickers/summary.json`
  (idle 6.1 everywhere; worst 6.3–12.3 with the three worst 12.1 pixel z166,
  12.2 cel z20, 12.3 ink-sketch z166; 50 live / 20 sway / 0 full at 166 %;
  swayShare 1). **`build-sheet.js` preserves them on a rebuild**: rebuilt with
  no edit, the sheet came back **byte-identical** (md5 `924c55cf…` before and
  after), because they live in the generator's header template and not in the
  generated file, which is what `README.md` says.
- **DEFECT 1, fixed — a narrowed probe run overwrote the record the sheet
  cites.** `OUT` was `results/stickers/` whatever `--presets` said, so this
  pass's first three-preset run replaced the ten-preset `summary.json` the
  sheet header points at, with nothing to say it had happened (it was put back
  from a copy). The label is now `stickers` only when the whole table is
  measured, `stickers-partial` the moment `--presets` or `--cameras` narrows
  the run, and `--out <label>` overrides either; the summary carries `label`,
  `narrowed`, `presetsMeasured` and `camerasMeasured` so a folder of numbers
  can never be read as the whole table. Proved by re-running the three presets
  after the fix: they landed in `results/stickers-partial/` and `results/stickers/`
  was untouched. `README.md` says it in the command list and in the paragraph.
- **DEFECT 2, fixed — the sheet header stated one run's tail as a property.**
  "worst frame per preset — 6.3 to 12.3 ms" does not reproduce (30.5 and 18.3
  above). Recomputed rather than deleted: the header keeps that run's numbers,
  marks them as that run's, records the two re-runs and what moved in them, and
  says which clause decides (zero frames over 34 ms, which held in all three
  runs). Rebuilt through `build-sheet.js`, `check-sheet.js` **28/28 PASS**, and
  the only bytes that changed in the sheet are lines 85–90 of its header
  comment; the drawings are byte-identical, so the 387/387 above still stands
  for them. The rebuild grew the sheet 223.4 → 224.4 KB, which is the
  `223 K` → `224 K` in `README.md` and `index.html`'s preload paragraph.

### The rest of the pass

- **`perf/verify-sheet.js`: 387/387 PASS** (sandbox server restarted first, as
  its own README line asks). Its copy/paste half wrote `index.html` for real
  and **put it back byte-identically** — `50 084` bytes, and diffed against a
  snapshot this pass took itself before starting, not only against the one the
  script keeps; no `index.html.keep-bak`, no `.tmp` left behind.
- **`perf/verify-tray.js`: 9/9 PASS** after the rebuild — 48 kit parts, the
  opening zoom still the fit of `data-open` to four decimals, 0 documents at
  the opening zoom and at 20 %, both variant attributes on their sections, all
  forty stickers inside the shot.
- **`perf/verify-floor.js`: 8/8 PASS**, the new file, and `README.md` carries it
  in the sticker kit's command list (nine commands there became ten).
- **`check-sheet.js` 28/28** and the rebuild is idempotent (built twice, second
  build byte-identical — md5 `4cfddfb5…` both times).
- **`index.html`'s md5 moved** with the `224 K` word: `88d01841…` →
  `6cddd2f6…`, the length unchanged at 50 084 bytes. Anything holding the old
  hash (the Phase 4.6 + 4.7 entry above quotes it) should read this line.
- Note for whoever runs a probe next: a page under `perf/fixtures/` derives its
  door as `/_lab2/test/perf/fixtures/default`, which no server answers, so a
  fixture page cannot autosave even with the door open. The probe blocks it as
  well; the run log shows one GET and nothing else.
- **Still open, unchanged by this pass:** `about.md` §9 and `ADDING.md` §2 are
  outside the sandbox and still say "three sheets" with no §4.6 numbers — the
  merge's docs pass. And the CHANGELOG entry above says the rebuilt sheet was
  `222.4 KB`; it was `223.4` before this pass touched it, so that figure was a
  build behind even then.

## Phase 4.6 + 4.7 — sixty stickers measured, and the kit verifier extended (2026-09-07)

- **What:** `perf/probe-stickers.js` (new, the plan's §8 4.6), the second half
  of `perf/verify-sheet.js` (the plan's §8 4.7), the four `measured in Phase
  4.6` placeholders filled in **`press/tools/build-sheet.js`'s header
  template** and the sheet rebuilt from it, `perf/fixtures/` added to
  `.gitignore`, and `README.md`'s sticker-command list brought up to date (it
  said `probe-stickers.js` and `verify-kits-skin.js` were not written; both
  are). **`kits.js` was NOT edited** — the constant the plan reserved for this
  stage did not need to move; see the verdict below.
- **Why:** §8 4.5 says a filtered part is never `full` and sways only within a
  share of `SWAY_MAX`, and left the share at the plan's 1 "until the probe
  measures it". §8 4.7 asks the sheet four questions the Design-Canvas half of
  `verify-sheet.js` cannot ask, because they are about the sheet AS A KIT and
  not as a document.

### The probe, and the page it writes

`perf/probe-stickers.js` **generates its own pages** into `perf/fixtures/`
(gitignored): one per preset plus an empty one for the floor, each of them
`games/_template.html` with its nine placeholders filled, so what is measured
is the page that ships — same script order, same fetch stopgap round
`kits.js`, same two `:root` blocks in the same order. `perf/fixtures/` is two
folders under `lab2/test`, exactly as `games/<slug>/` is, so every `../../` in
the template resolves.

- **Sixty sections, 10 × 6 at a pitch of 200 world units** (paper 1934 × 1135).
  Sixty is the plan's number; 200 is measured against the acceptance rule:
  a box is 134 × 135, so 200 leaves 66 × 65 of clear paper (no sticker in its
  neighbour's shadow) and is as tight as that allows — and it has to be tight,
  because a 1600 × 1000 viewport at 166 % sees 964 × 602 of world, which at
  200 apart (plus `kits.js`'s 200-px live margin) holds twenty-four boxes and
  at the tray's 260 would hold twelve. **At 260 the plan's "20 live filtered
  parts on screen" could not have been reached at all.** Parts are Appendix
  D's forty in order and then the first twenty again (`ORDER[i % 40]`), so
  every part is drawn at least once and the extra twenty are named by a rule.
- **The colours and the style are measured, not typed.** The `:root` is
  `press/theme.js`'s answer for a real fixture through
  `press/tools/lib/fixture-theme.js`, derived at the preset's own
  `paletteSize` so the roles reach the page already quantised (which is where
  §8 4.4's last row puts that step). **neonrun for the dark presets,
  mosslight for the light ones** — and dark/light was asked of the derived
  theme (`theme.dark` came back `true` and `false`), not assumed. A preset
  counts as dark when its prototype carries a marker Appendix B derives from
  a dark plate: `finish: glow`, `texture: scanlines`, `texture: grunge`, or a
  pixel grid — so **neon, grunge and pixel** take neonrun and the other seven
  mosslight. The vector is `Style.forPreset(preset, v)` with `v.pixel` read
  off `press/fixtures/pixelfort/stats.json` (**4**, Phase 3's measurement,
  read from the file rather than typed) for the pixel preset and 0 elsewhere,
  and `v.saturation` Appendix B's normalisation of that fixture's own mean
  chroma. The pairing is `Fonts.suggest()`'s first answer.
- **The method is `lab2/perf/measure.js`'s, copied and not required** — that
  file is outside the sandbox. Its five in-page routines (LOOK, SETTLE, IDLE,
  PAN, `stats()`) are written out again shape for shape, with attribution in
  the header, so a number from either file means the same thing; and its two
  conventions are kept, headed system Chrome and the door 404'd before the
  first byte.
- **The floor is measured in the same run**, on `stickers-floor.html` — the
  same template, the same scripts, the same rectangle, **not one section** —
  at the same six cameras. `about.md` §9's 6 ms is history, not a threshold,
  and nothing here compares against it.

### Measured — `perf/results/stickers/summary.json`, 588 s, Chrome 152.0.7977.77

Headed system Chrome, viewport 1600 × 1000 in a 1616 × 1110 window at DPR 1,
sandbox server on 4322, door blocked in every context. Cameras 20/35/50/100/
166/400 %, each centring the paper (967, 568); the pan is measure.js's own
3500/2500/2000/1500/1200/800 px out-and-back over 2 s a leg, capped to the
scroll room left (a `*` in the run's table marks the four low zooms where it
railed — the whole paper is on screen there and there is nowhere to pan).

- **FLOOR: 6.1 ms idle median at all six cameras** (a 165 Hz screen).
- **ALL TEN PRESETS ACCEPT.** Idle median **6.1 ms at every camera for every
  preset** — equal to the floor, not merely within the 1.5 × slack the run
  allows. Sixty stickers cost a bench standing still nothing at all.
- **Worst frame 6.3 → 12.3 ms**, over the idle second *and* the four-second
  pan at every camera. **Zero frames over 34 ms in all sixty measurements**
  (and zero over 50). The three worst are `ink-sketch` 12.3 at 166 %, `cel`
  12.2 at 20 %, `pixel` 12.1 at 166 % — one dropped frame in a pan on a
  165 Hz screen, which is two 6.06 ms slots, not a second slot of work.
  Per preset: pixel 12.1, flat 6.6, outline-cartoon 6.4, cel 12.2,
  painterly 6.5, ink-sketch 12.3, neon 6.5, retro-print 6.5, grunge 6.3,
  cozy-soft 6.3.
- **At 166 %: 50 of the sixty live** (over `ZOOM_NO_TILES` 1.25 there are no
  tiles, so everything near the screen is live), **20 sway, 0 full**, 0
  documents, ~3.0–3.1 MB of sprite. For the **seven presets whose vector
  reaches a filter** (outline-cartoon, painterly, ink-sketch, neon,
  retro-print, grunge, cozy-soft) **all fifty are filtered** — two and a half
  times the twenty the plan asks the 34 ms rule to be met with. The count is
  read twice and the two agree at every camera: `kits.js`'s own `filtered`
  flag on the part record, and a walk of the live DOM for an element with
  `filter:url(#…)` or a root bloom (50 and 50). `flat`, `cel` and `pixel`
  reach no filter at all and are recorded `n/a` for that clause rather than
  failed. **`pixel` sways 0** at every camera — a bitmap has nothing to
  animate — and `flat`/`cel` reach `full 4` at 400 %, which a filtered
  preset never does.
- **Docs 0 at every camera on every preset**, which is ADDING.md §5's floor
  with sixty stickers on the paper. **Zero console errors, zero page errors
  and no response ≥ 400** across all eleven pages.
- **`SHEETS.stickers.swayShare` stays 1, and `kits.js` was not touched.** The
  plan's fallback ("if wobble or glow fails at 166 %, lower that preset's
  share and re-measure") was not reached: wobble (ink-sketch 12.3 ms, grunge
  6.3, cozy-soft 6.3, retro-print 6.5, outline-cartoon 6.4) and glow (neon
  6.5) all sat at the floor with twenty filtered parts swaying. `shareOf()`
  already reads either a number or a per-preset object, so the day a slower
  machine says otherwise it is one edit in one place.
- **Two screenshots a preset**, at 166 % (live) and 35 % (sprites), in
  `perf/results/stickers/`. Looked at: `neon-z166.png` is the glow finish on
  neonrun's dark plate — magenta bodies, blue-violet keylines, a bloom on
  every edge — and `pixel-z35.png` is the whole 10 × 6 grid as chunky 4-px
  bitmaps on the same dark plate (the pixel preset takes neonrun's theme and
  pixelfort's measured grid of 4), forty parts and then the first twenty
  again, evenly spaced, none clipped.
- **Where the numbers were written.** `build-sheet.js` **rebuilds**
  `features/stickers-core.dc.html` whole, so the four `measured in Phase 4.6`
  lines were filled in **its header template** and the sheet was rebuilt
  (`40 of 40 parts, 222.4 KB`; `check-sheet.js` **28/28 PASS** after). Written
  into the sheet they would have survived until the next build and no longer.
  `about.md` §9, which §4.6 also names, is **outside the sandbox** and is left
  for the merge, beside the fourth-sheet paragraph Phase 4 already owes it.

### `verify-sheet.js`'s second half — the plan's 4.7

The file now has two halves and says so: **the sheet** (unchanged — forty
parts booted one at a time in headless Chrome, as Design Canvas shows them)
and **the bench** (new), which asks the same forty a different set of
questions through `kits.js`. `--no-sheet` and `--no-bench` run one or the
other.

- **A · every part extracts.** `Kits.extractOnly` over the sheet at a
  **witness palette** — `#010203 #040506 #070809 #0a0b0c #0d0e0f #101112`,
  six colours no drawing holds by accident — and at **two styles**: the
  default vector (`{preset:'flat', lineShow:true}`, how the sheet was drawn,
  a pass that does nothing) and **ink-sketch**, Appendix C's busiest row and
  the one that copies the most defs into a part.
- **B · no literal colour survives.** Every `#` in an extracted string, with
  `url(#…)` references taken out first, must be one of the six witnesses.
  That is the plan's "grep for `#` outside `url(`" made decidable: with a
  witness palette any other hex is provably a literal `palette-keys.js` let
  through. The reading is refuted in the same run — handed
  `fill="#010203" filter="url(#sk-soft-abc)" stroke="#ff00ff"` it returns
  exactly `#ff00ff`.
- **C · each `data-layer` exactly once**, and the set is the part file's own
  (read by `palette-keys.js`'s lint, so the two namings match). Also checked
  at ink-sketch, where `linePasses: 2` clones the line layer: **the clone is
  marked `line-2`, not a second `line`**, so the rule holds at both styles —
  measured rather than excused.
- **D · `Kits.inkAt` reads the drawing's alpha**, on the bench at 100 %, for
  six parts across shapes: true at the box's centre, false at all four
  corners, and the inked share of an 11 × 11 grid strictly inside 5–95 %,
  because a reader answering a constant sits at 0 or 1 and only a reader of
  the silhouette lands between.
- **E · copy and paste lands in the copies block as the five-line section.**
  shift+click, ctrl+c, ctrl+v, ctrl+s **through the sandbox's real door on
  4322** — the one thing in this folder besides `verify-keep.js` that writes
  `index.html` for real. Snapshot first, restore in a `finally` block with a
  byte-identity assertion, exactly `verify-keep.js`'s pattern; the restore
  refuses a file that changed in a way this run did not cause. **The strong
  form of the check:** the eight lines in the file are compared
  byte-for-byte with what **`serve.js`'s own `copyMarkup()`** writes for the
  attributes the file now carries (`serve.js` is `require`d, not run — its
  last two lines make it a bag of functions when it is not the main module),
  so the shape is checked against the function that wrote it rather than
  against a description of it.

### Measured — `perf/results/parts/sheet-summary.json`

**387/387 PASS** (`node lab2/test/perf/verify-sheet.js` from `site/`, the
sandbox server **restarted first**, since `serve.js` keeps one
`index.html.keep-bak` per process). 361 of those are the sheet half (forty
parts × nine questions, plus the options list), 26 are 4.7. The bench half
was also run on its own first (`--no-sheet`), 26/26.

- **A:** 40 parts at each of the two styles, every box 128 × 128, tags equal
  to Appendix D's for all forty, and the eight text-slot parts are exactly
  `banner ribbon-corner badge-round badge-shield bubble-speech bubble-thought
  bubble-shout tag-price`.
- **B:** **no literal colour in any of the eighty extracted strings**, and
  **6/6 witnesses actually reached the drawings** (a palette that never
  arrived would also produce no strays, so the second number is what makes
  the first one mean something).
- **C:** 40 parts, **247 layers, none twice**; at ink-sketch **40 of the 40
  parts with a line gained exactly one `line-2`** and no layer at either
  style appears twice.
- **D:** centre true and all four corners false for all six, with the grid
  share in between every time — burst 71/121 (59 %), badge-round 75/121
  (62 %), tape-strip 42/121 (35 %), star 41/121 (34 %), heart 66/121 (55 %),
  cloud 52/121 (43 %), each box 134 × 135.
- **E:** `Keep.live` true against `/_lab2/test/default`; shift+click picked
  one; ctrl+c/ctrl+v made `sticker-burst-copy-mtrl4oxh05ww` with a `.gz-art`
  and **no iframe**; ctrl+s answered `{"ok":true,"wrote":true,"promoted":
  ["sticker-burst-copy-mtrl4oxh05ww"]}`; the copies block gained **exactly
  one** section, `data-src="features/stickers-core.dc.html#part=burst"`,
  **8 lines, byte-identical to `copyMarkup()`**. Restored: `index.html` back
  to its 50 084 bytes and md5 `88d01841c306d486f91a766a7c221505`, no
  `keep-bak`, no `.tmp`.
- **Zero console errors and zero page errors** through all of it.

### Two things for the next hand

1. `perf/fixtures/` is generated and gitignored; the probe rewrites it every
   run, so a page in it is never edited by hand — change the page by changing
   `games/_template.html` or the probe.
2. `about.md` §9 and `ADDING.md` §2 are outside the sandbox and still say
   "three sheets"; §4.6 wants the probe's numbers in §9 as well. Both belong
   to the docs pass at the merge, and `MERGE.md` is where that is tracked.

## Phase 5, steps 2–3 — the generator: `press/tools/build-game.js` (2026-09-07)

- **What:** the file that turns a bundle into a page. `build(bundle, opts)` is
  what `serve.js`'s `/_lab2/test/build` door calls, and the same file runs from
  the line — `node lab2/test/press/tools/build-game.js <fixture folder>
  [--force] [--out <slug>]` — where it also makes the four objects a fixture
  folder has not got: the theme through `tools/lib/fixture-theme.js`
  (palette.js → theme.js, no browser), the style vector from the Phase-3
  golden `fixtures/<name>/stats.json` through `Style.forPreset`, and the layout
  from `press/recipes.js` (`choose()` then `resolve()`). Out come
  `games/<slug>/index.html` from `games/_template.html`, `game.json`
  (CONTRACTS §10), `art/*.webp|png` and a two-byte `posters/index.json`.
  `press/tools/test-build-game.js` is the refutation: **95/95 checks pass**,
  `perf/results/build-game/summary.json`.
- **Why the shape it has:** every section it writes is `serve.js`'s
  `copyMarkup` line for line — the same four attribute lines, the same blank
  line over a section, the sticker's `data-palette` / `data-text` / `data-rot`
  in front of `style=` — so a generated section and a pasted copy are the same
  markup and `keep.js` edits both the same way. The three constants it needs
  from `serve.js` (`MARK_TOP`, `MARK_END`, `ANCHOR`) are asserted
  byte-identical by the test, which reads them out of `serve.js`'s own source
  rather than retyping them, and `kits.js`'s `SRC_RE` is lifted the same way.
- **Measured — the type (§5.2 says measure, do not guess, and record which).**
  The wrap is measured, in the same headless Playwright page that re-encodes
  the pictures: the page's `--body` face is loaded out of `fonts/` as a
  `FontFace` from a data: URL (every weight the folder has for that family, so
  a 700 title is the real 700), `ctx.font` is set to the very string the
  `<text>` will carry, and each candidate line is measured whole — one
  round trip per block, the greedy break done in the page. Baselines are the
  face's `fontBoundingBoxAscent`. **Average advance per character, at 100 px
  over a fixture description: Public Sans 400 = 0.4527 em, Space Mono 400 =
  0.6120 (monospaced), Kalam 400 = 0.4225.** The plan's 0.55-em allowance is
  21 % wide for Public Sans and 10 % narrow for Space Mono; those three
  numbers are also the fallback table for a machine with no browser, and the
  build says in its warnings when it used them. One `<text>` per line at an
  absolute `y`, not a `<tspan dy>` chain: `index.html`'s caption prop is
  already two `<text>` elements at y 84 and 150, and a `dy` chain moves every
  baseline under a line the wrap did not produce.
- **Measured — the boxes.** The type SIZES are `recipes.js`'s (the bench's own
  wall note: 22 body, 56 title, 30 tagline, line 1.32, padding 12 × 9), read
  out of that file so the drawn note and the box it estimated cannot drift.
  Its 0.55-em estimate against this measurement: mosslight's title note 144
  against 144 and its description 134 against 163 (the estimate is high for
  Public Sans, as its header says it would be), **pixelfort's description 250
  against 221 — low, because its body is Space Mono at 0.612 em.** A note is
  cut to the width the recipe gave by the height the measurement made, so the
  page is right and the opening rectangle is a few units generous or tight.
- **Measured — the pictures (§5.3).** Long edge capped at 2048 hero/key art,
  1600 screenshot, 1024 logo; never enlarged; WebP at 0.86 through the page's
  canvas; PNG where alpha is needed, through `make-fixtures.js`'s own writer
  (required lazily — one PNG encoder in the folder). Alpha is measured off the
  drawn pixels, not believed from the manifest. Art folders: **pixelfort
  33 847 B, mosslight 136 162 B, neonrun 125 540 B.** Against the fixtures'
  own PNGs, WebP 0.86 is 0.37–0.50× on the painterly and neon plates and
  **1.37–1.75× on pixel art** (pixelfort's 640 × 360 shots and its key art) —
  a 16-colour 4-px grid is what PNG is best at. The plan's rule stands; the
  number is written down for the day somebody argues for PNG on `pixel`.
  A picture whose `analysis.stats.pixelSize > 0` is resized with smoothing
  off. Pages: **pixelfort 34 613 B (pic 2, sticker 9, note 2, sign 1),
  mosslight 32 515 B and neonrun 32 445 B (pic 2, sticker 7, note 2, sign 1)**;
  `game.json` 10.0–10.8 KB.
- **The sign is SVG anchors,** drawn as `lab.css`'s `.gz-poster b` chip (mono,
  uppercase, .18 em tracking, a pill, a 0 2px 0 shadow) at the ×2.2
  `recipes.js` measured with, and labelled from that file's own `LINKS`. SVG
  rather than HTML because an `<a>` inside the art is ink to `ink.js` (NOTES
  §D.6) where an HTML one is invisible to it, and because the box is then the
  box that was measured. **`data-nodrag` was NOT needed** — `lab.js`'s NODRAG
  is `'button,a,input,select,textarea,[data-nodrag]'` (line 1365) and an SVG
  anchor's local name is `a`, so `closest('a')` already finds it — and the
  plan asks for it anyway, so every anchor carries both.
- **Verified in a browser** (not part of the test, which needs no server):
  all three pages on 4322 boot with **zero console errors and no failed
  requests**, `Frames.panels.filter(p => p.loading).length` is 0, the sticker
  sheet extracts in the game's colours (`--sk-primary` #9cc754 on pixelfort),
  and a `gz-pic` measures to its asset's box × its scale × the zoom (the logo
  108 × 40 at 33.7 %, which is 320 × 120 of world, which is 256 × 96 × 1.25).
- **Two things the builder now writes that the plan did not name.**
  `games/<slug>/posters/index.json` = `{}` (never overwritten): `frames.js`
  fetches it relative to the page before anything boots, and without it every
  load carried a 404 — the only one the first built page made. And
  `data-open-narrow`: the template asks for `{{OPEN}}` and `{{OPEN_NARROW}}`
  where the plan §5.1 says `{{OPENING_RECT}}`, so the builder fills both
  spellings, and a layout with no narrow rectangle of its own gets the wide
  one cropped to the bench's 1250 : 1390 about the composition's spine.
- **OPEN, and the one thing this phase could not build.** `recipes.js` puts
  the screenshots in the frame stickers' IMAGE SLOTS — a sticker slot carrying
  `image: 'shot-1'`, which is §3.6's "a `<rect>` placeholder that the page may
  replace with a clipped picture". **No markup can do that:** `kits.js` draws a
  sticker from the sheet and a section can hand it colours and words and
  nothing else, and a picture laid over the frame instead would not be turned
  with it (`frame-polaroid`'s card sits at −5° inside the part and its slot is
  turned another ±2° by `data-rot`, which props have not got). So the frame is
  written, the picture is not, and each one says so in the warnings — **four
  screenshots a page are drawn as empty frames on all three fixtures.** It
  wants either a per-section picture in `kits.js` (the `image-slot` layer
  replaced at extract time, beside `data-palette` and `data-text`) or a recipe
  that places the shots as their own `pic` slots. Owner's call; nothing here
  guesses at it.

## Phase 8 (the endpoint half) — public intake: `api/intake.js`, `lib/imagebytes.js` (2026-09-07)

- **What:** the publisher's door and the reader it leans on.
  `press/tools/lib/imagebytes.js` — dependency-free: sniff PNG / JPEG / WebP
  from MAGIC BYTES, read the size out of each container (PNG IHDR; JPEG by
  walking the segments to a start-of-frame, so a progressive file answers as
  readily as a baseline one; WebP VP8X, VP8 and VP8L), and
  `stripMetadata(buf, type)` that removes the metadata containers WITHOUT
  re-encoding a pixel (PNG: a keep-list of IHDR/PLTE/tRNS/IDAT/IEND, every
  chunk's CRC checked on the way past and every kept chunk copied whole so no
  CRC is recomputed; JPEG: every APPn but a real JFIF APP0, every COM, and
  the bytes after the EOI, with the entropy-coded scan copied to the next
  real marker; WebP: EXIF and XMP chunks out, the RIFF size rewritten and the
  VP8X flags' EXIF and XMP bits cleared). `api/intake.js` — the Vercel
  function `serve.js` mounts at `/_lab2/test/intake`: POST a JSON bundle,
  get a 22-character token; `GET ?list=1` and `GET ?token=…` behind
  `INTAKE_SECRET` for the owner's import. `press/tools/test-intake.js` — 59
  checks through the real mount.
- **Why these numbers**, each a named constant with its sentence in the file:
  MAX_FILES 12 (`manifest.schema.json`'s `assets.maxItems` — a thirteenth
  file could never be part of a valid manifest, so it is refused before
  anything is decoded); MAX_TOTAL_BYTES 25 MB on the DECODED images, counted
  as each is read so the bundle stops at the picture that crosses the line;
  MAX_LONG_EDGE 4096; TOKEN_BYTES 16 → 22 base64url characters with no
  padding, which is where the plan's "22-char token" comes from and what
  makes it a legal path segment; RATE_LIMIT 10/hour per address counted on
  EVERY post including the refused ones; RETENTION_DAYS 30;
  MAX_BUNDLE_NODES 20000 / MAX_BUNDLE_DEPTH 32 (a manifest is about sixty
  values) walked over an explicit stack, never recursion, with the budget
  checked BEFORE children are pushed so a five-million-element array is
  refused rather than walked.
- **Three decisions worth arguing with, all written into the headers.**
  1. **JSON, not multipart.** The plan says multipart; multipart is what a
     `<form>` posts and there is no form — the publisher page holds canvases
     and has to serialise them either way, `toDataURL` gives base64, and both
     runtimes hand the function a parsed `req.body`. So the function needs no
     multipart parser and therefore no npm at all. `data:…;base64,` prefixes
     are stripped on the way in.
  2. **No `sharp`, so the size cap is a REFUSAL.** The plan has intake
     re-encode every image with sharp to strip metadata and cap size. sharp
     is not installed here and is not to be, so `imagebytes.js` strips by
     rewriting the container (which is stronger: the pixels are provably
     untouched) and an over-4096 image is rejected with a message that says
     why. The one line a deployment with sharp would change is marked in
     `takeImage`. The owner chooses at deploy time.
  3. **The manifest is normalised, then validated.** `w`, `h`, `sha256` and
     `file` are overwritten from the bytes actually stored and the result is
     held to `manifest.schema.json`, so what the schema is really asked is
     whether the WORDS are good. One widened pattern: `file` gains `.jpg`,
     because the plan tells intake to accept JPEG by magic bytes while the
     schema allows only png and webp — and the reply says so in a `notes`
     line so the owner converts before `build-game.js`.
- **Measured** (`perf/results/intake/summary.json`; server on 4322, system
  Chrome 152 headless for the browser half). **59/59 checks**, twice in a
  row, 3 tokens written and deleted each run, `press/cache/intake/` empty
  after.
  - **The strip is exact.** A PNG carrying a `tEXt`, a `zTXt` and a `tIME`
    (8 438 B) came back as the 8 312 B picture it was written as, BYTE FOR
    BYTE. A Chrome-made WebP with EXIF and XMP chunks appended and its VP8X
    flags set to claim them (1 742 B) came back as Chrome's own 1 582 B file,
    byte for byte, flags 0x2c → 0x20. A Chrome-made JPEG with an APP1 EXIF
    block and a COM spliced in (3 249 B) came back at 2 479 B with no APP1
    and a byte-identical 2 146 B scan.
  - **And the pixels did not move.** Each pair decoded in a Playwright canvas
    before and after: 12 288 samples (64 × 48 PNG), 256 000 (320 × 200 JPEG),
    256 000 (320 × 200 WebP) — **0 differ, max 0** in all three.
  - **APP2 ICC_PROFILE goes with the rest**, which is the one strip that
    could have changed a picture: Chrome writes an sRGB profile into its own
    JPEG and dropping it moved 0 of 256 000 samples. A Display-P3 photograph
    WOULD shift; the fix is one more entry on `imagebytes.js`'s
    `JPEG_APP_KEEP`, and it is flagged rather than taken.
  - **The attacks.** 13 files → 413; a ZIP named `.png` → 415 by magic bytes;
    5000 × 8 → 413 `long-edge`; `rights.attested` false and absent → 403;
    `slug: "Not A Slug!"` → 400 from the schema with the path; a 3-character
    token → 400 before any file is touched; a well-formed token that is
    nobody's → 404; `?list=1` and `?token=` with no secret and with a WRONG
    SECRET OF THE SAME LENGTH → 401 both; the eleventh post from one address
    → 429 with a `retry-after`, and a GOOD bundle from that address → 429 too.
  - **Two JSON bombs, answered on a clock.** 10 000 032 bytes of nested
    arrays → 413 `bundle-too-big` in 80–93 ms; 100 023 bytes at 50 000 levels
    of nesting → 413 `bundle-too-deep` in 6–20 ms (V8's parser took the depth
    without complaint; the walk refused it).
  - **The 25 MB cap cannot be reached over this wire, and that is arithmetic,
    not a bug.** 27 009 415 B of images is a 36 013 779 B JSON body, and
    `serve.js`'s `CAP_INTAKE` is 32 000 000 B: the socket was dropped
    (ECONNRESET) before the function saw a byte. So the wire half asserts it
    is REFUSED — which is what a publisher would meet — and the function's
    own 413 is proved by calling the handler in-process with `mountApi`'s own
    five shims: `too-many-bytes`, "it reached 25.8 MB at big-4".
- **Open for the owner, four things.**
  1. **A deployed Vercel function's request body limit is 4.5 MB**, an order
     of magnitude under the plan's 25 MB bundle. A real 25 MB intake has to
     hand the browser a client-upload token and let it PUT to Blob directly,
     with this function issuing the token. Not half-built; flagged.
  2. **`CAP_INTAKE` in `test/serve.js` is 32 000 000 B** and a full-size
     bundle needs about 35 MB of body. Raising it to 36e6 is a one-line
     change in a file this agent does not own.
  3. **The Vercel Blob path is written and NOT EXERCISED** — there is no
     `BLOB_READ_WRITE_TOKEN` on this machine. It is the documented REST shape
     called with `fetch` (no npm), it throws with the HTTP status rather than
     losing a bundle, and `x-api-version: 7` is the header @vercel/blob
     sends, unverified here. The local folder `press/cache/intake/<token>/`
     is the sandbox's stand-in and the only path any test has run.
  4. **Retention is a date and a note, not a deleter.** Every bundle carries
     an `expires` 30 days out and `?list=1` marks the passed ones `expired`;
     nothing deletes anything (plan §12 4). Pruning is
     `rm -r press/cache/intake/<token>` or the Blob dashboard.
- **For the Press Table (Phase 6/8b), the contract this half offers:**
  POST `{bundle, images:{id: base64}}` → `{ok, token, files, bytes, expires,
  notes, stripped}`; errors are `{ok:false, code, error[, errors]}` with
  `code` one of `usage not-json bundle-shape bundle-too-big bundle-too-deep
  too-many-files no-images bad-id rights orphan-image missing-image bad-image
  broken-image not-an-image long-edge too-many-bytes schema rate storage
  schemas no-secret unauthorized bad-token no-such-token method`. The
  owner's two GETs want the secret in an **`x-intake-secret` header** (or
  `authorization: Bearer`) and never in the query string — a secret in a URL
  is a secret in a log. With `INTAKE_SECRET` unset those doors answer 503:
  an absent secret is never an open door. The submitter's address is stored
  as twelve hex digits of its SHA-256, never as an address.
- **One housekeeping note:** the server on 4322 was restarted three times
  during this phase. A mounted function is `require`d once per server
  process, so a server left running across an edit answers with the old
  code; the endpoint now returns a `stamp` (its own mtime at load) on a bare
  GET and `test-intake.js` stops with exit 2 and the restart line rather than
  reporting a stale pass.

## Phase 5 (Appendix E) — `press/recipes.js`: the three layout recipes (2026-09-07)

- **What:** `press/recipes.js` (`window.Recipes` — `RECIPES`, `choose`,
  `resolve`, `rankStickers`, and the constants the generator has to share)
  and `press/tools/test-recipes.js`. Appendix E's three compositions with its
  coordinates typed in unchanged, the opening rectangle COMPUTED as the
  appendix says, a second rectangle for a phone, and the sticker ranking that
  turns the vision call's motifs into the parts a recipe reaches for. Pure:
  no document, no fetch, no bench, no `Math.random`, so the test loads it in
  Node through `lib/browser-module.js`. `CONTRACTS.md` gained **§13** for the
  four things the layout object carries beyond Appendix A (`openNarrow`, per
  slot `w`/`h`, `image` on an image-slot sticker, and `z` = 0…n−1 = the pile
  order); the schema allows all four, since Appendix A sets no
  `additionalProperties:false`.
- **Why these numbers.** Everything Appendix E wrote down is in the file
  unchanged. What it left out is written down with its reason:
  - **The aspect is 3200 : 1390**, lab.js's own WIDE rectangle, not the plan's
    1848 × 1928 (NOTES §D.2). A game composition is nearer 1.2 : 1, so the
    rectangle is nearly always WIDENED and a first visit sees paper either
    side of the composition. That is what the plan asked for and what the
    bench's frame is shaped like; the phone gets the narrow rectangle instead.
  - **The narrow rectangle** follows lab.js's own move (WHERE IT OPENS): the
    wide one's y and height, the width of the SPINE — the pictures that name
    the game and the words that explain it — with the screenshot row and the
    loose stickers left off the sides, as lab.js leaves the groves off the
    lockup. On pixelfort's poster that is 1560 against the wide rectangle's
    4599, which a 390-px phone frames at 23 % instead of 8 %.
  - **A composition follows its art.** Appendix E's "the recipe gives `scale`
    for a 1600-px-wide hero and the generator rescales proportionally" is read
    as: the recipe's RULER picture (the hero for widescreen, the key art for
    the other two) is placed at its natural pixel size × the recipe's scale,
    and the whole composition — every coordinate, box, type size and the 120
    of margin — is multiplied by k = the ruler's pixels ÷ the width its recipe
    was written for. Every other picture is normalised to a reference width
    first (hero/landscape 1600 from Appendix E, portrait key art 480 and logo
    640 from Appendix H's fixtures), so the same logo exported at 256 px and
    at 1024 px lays out identically. Consequence, said out loud: world size
    follows the art's resolution and lab.js clamps the opening zoom to 1, so a
    page built from small art opens at 100 % rather than blown up past its own
    pixels.
  - **A sticker's box** is the sheet's contract, 128 + 6 × 128 + 7 (kits.js's
    `natural()`, CONTRACTS §7) — the SVG box, not the ink, so a thin part
    claims more paper than it draws on and the opening rectangle comes out
    generous. `resolve()` uses the real measured box for any part handed in as
    a `Kits.extractOnly` record.
  - **A note's type** is the bench's own: 22 px at line-height 1.32 with
    12 × 9 of padding, `lab.css` `.wall-note-in` lines 801–802, verbatim; the
    title is 2.5× and the tagline 1.35× of it (no precedent — no game page
    existed). Heights are ESTIMATED at 0.55 em average advance, plan §9 5.2's
    own allowance for a generator with no canvas; §5.2 asks the builder to
    measure for real, and this file is pure and cannot.
  - **Sticker sizes** are each a ratio against the thing they sit on (the
    burst is 28 % wider than the logo it backs, tape runs half a picture's
    width, the ring is 25 % past the note it circles) or a number the row's
    own stride fixes (the poster's 400 stride and a 134-wide box give a
    polaroid 2.9, an 11-unit gutter; the widescreen's 460 gives film 3.3).
  - **The scrapbook's tape lies at ±4, the poster's at −20.** Appendix E caps
    that recipe at −4…+4, and the plan's rule beat the gesture.
  - **The chooser** is Appendix E's four lines scored so the answer is a
    ranked three (§10 6.2 wants three mockups): a fit is 100, "scrapbook
    offered second" is 50, the vision call's override at confidence ≥ 0.6 is
    1000, and ties fall back to Appendix E's own order.
  - **The ranking** scores a motif hit 3 and a mood hit 1 (§11 step 5: motifs
    rank the tray; a motif is a thing the model SAW). The sheet's motif tags
    already come from Appendix F's menu; its mood words do not, so `MOOD_TAGS`
    is a hand-written join between the two vocabularies and is flagged in the
    file as taste, not measurement.
- **Measured** (`node lab2/test/press/tools/test-recipes.js`, from `site/`,
  under a second, results in `perf/results/recipes/summary.json`): **174/174
  checks pass, 0 skipped.**
  - The three layouts the fixtures ask for, slot counts and rectangles:
    **pixelfort / poster — 14 slots**, open (−2152.46, −1166.33, 4599.32,
    1997.83), narrow x −640 w 1560; **mosslight / widescreen — 12 slots**,
    open (−1954.5, −1070.8, 3951.19, 1716.3), narrow x −1020 w 1940;
    **neonrun / widescreen — 12 slots**, the same rectangle to the unit (its
    hero and its shots are the same sizes as mosslight's, and its shorter
    description still wraps inside the same box). The other six: poster 14
    slots and scrapbook 24 on every fixture, the scrapbook framing
    (−2533.56, −1144.25, 5270.22, 2289.25) with a 1600-wide narrow. Every
    rectangle is 2.3022 against the bench's 2.3022.
  - `choose()` answers **poster** for pixelfort, **widescreen then scrapbook**
    for mosslight, **widescreen** for neonrun — the three `expected.json`
    files' own words — and overrides at confidence 0.60 but not at 0.59.
  - Appendix E's coordinates are asserted VERBATIM on the fixtures where
    k = 1: every picture's x/y/width, both note columns, both signs, and both
    screenshot rows' y, stride and alternation.
  - Halving a hero (1600 → 800 px) halves the placed hero, **every other slot,
    both rectangles and the margin**, to 0.02 of a unit, with the ruler's
    scale unchanged at 1.0 — the composition's proportions held exactly.
  - The schema check RUNS: `press/tools/lib/validate.js` and
    `layout.schema.json` landed while this was being built, and all nine
    layouts validate through `Validate.check(data, schema, pool)`. The test
    will not believe a validator that cannot fail — it first feeds it a
    deliberately broken layout (a bad enum, a missing `open.h`, a scale of 9)
    and requires at least three complaints back before any of the nine passes
    counts for anything.
  - `Recipes.PARTS` is checked against the SHEET's own `data-props` list, so
    the ranking's tie-break cannot drift from `features/stickers-core.dc.html`.
  - One hazard found and closed while testing: the score map was a plain
    `{}`, and a motif called `toString` or `__proto__` (the model answers from
    a menu, but nothing in the pipe enforces that before this file) read a
    function off `Object.prototype` and turned every score into `NaN`. Both
    maps are `Object.create(null)` now, and a test feeds those three words in.
- **Left for the next hands, deliberately:**
  - A pixel game keeps `frame-polaroid` round its screenshots, and its
    polaroid row keeps Appendix E's ±2. The plan named the part, and although
    a rotated pixel picture is a resampled one, the tweak panel and the bench
    are where that is changed — not in the recipe.
  - The note heights are estimates. `build-game.js` should measure the wrap
    (plan §9 5.2) and record which method it used; the estimate is high rather
    than low, so a measured note shrinks inside its box and the opening
    rectangle stays valid.
  - Appendix E's poster leaves about 500 units of paper between the picture
    column (ending at x −256 on pixelfort) and the text column (starting at
    240). Verbatim is verbatim; it is the owner's to close on the bench, and
    `keep.js` will write down where it lands.

## Phase 7 — the vision call (2026-09-07)

- **What:** `api/vibe.js` (the serverless function, dependency-free, mounted
  locally at `/_lab2/test/vibe`), `press/vibe.js` (`window.Vibe` — the cache
  key, the POST, and the merge), the three recorded judgements
  `press/fixtures/<name>/vibe-recorded.json`, and `press/tools/test-vibe.js`
  (133 checks, all green). Five files, nothing else touched.
- **Why:** plan §11. The heuristics rank ten presets by a distance over
  eleven numbers and the top three are usually within a point of each other
  (pixelfort: pixel 2.3, cel 7.0, grunge 7.2 — but mosslight's painterly and
  cozy-soft are neighbours); choosing among near-ties is what a look at the
  picture is for. Everything else about the phase follows from one rule — the
  judgement is an IMPROVEMENT and never a DEPENDENCY. No key, no door, a 429,
  a model that answers off-menu: every one of them is `{vibe: null, error}`
  with a 200 and a Press Table that works exactly as it did before Phase 7
  existed.

### The model, and where the id came from

`MODEL = 'claude-opus-5'`, pinned in one constant at the top of
`api/vibe.js` and repeated in `press/vibe.js` (the browser needs it to build
a cache key before it has ever heard from the door; `test-vibe.js` reads the
constant out of both files and fails if they drift). **It was looked up, not
recalled**: the `claude-api` skill's model table, read on 2026-09-07. An id
written from memory is a 404 at the first real call, and nothing here can
make a real call to find out.

### Three places the API disagreed with the plan, and what was done

1. **`temperature: 0` is not sent.** Plan §11 asks for it. The pinned model
   rejects `temperature`, `top_p` and `top_k` with a 400, so the plan's line
   would fail every call. What determinism there is comes from the closed
   menus, the forced tool and the cache: the same pictures with the same
   stats are answered once and read off disk afterwards.
2. **`max_tokens` is 2048, not the plan's 800.** The judgement is ~120
   tokens of JSON, which is what 800 was sized for — but thinking is ON BY
   DEFAULT on this model and shares the ceiling, so 800 would let a moment's
   thought truncate the tool call. That arrives as `stop_reason:
   'max_tokens'`, no `tool_use` block, and a silent fallback on exactly the
   plates that most needed a second opinion. **Open for the owner:** the
   plan's 800 is reachable by adding `thinking: {type:'disabled'}` (accepted
   on this model at effort `high` and below) — the two go together and
   neither alone. `output_config.effort` is `low`, because picking from four
   closed menus after looking at four pictures is not deep work.
3. **No `strict: true` on the tool.** It would guarantee schema-shaped
   arguments, but a schema `strict` refuses is a 400 that looks from outside
   exactly like a model failing validation — every call silently falling
   back — and no call can be made here to find out which keywords it takes.
   The server-side validator has to exist anyway, so it is the guarantee.
   Worth adding the first day a key is present.

### The choices worth writing down

- **The tool's `input_schema` is `press/schemas/vibe.schema.json`, loaded
  and `$ref`-resolved at require time, not a hand copy.** `Validate.check`
  judges the answer against the same file a moment later; a copy drifts the
  day a preset is added to `style.schema.json`, and then the model is offered
  nine presets, answers correctly, and is failed by a validator that knows
  ten. The `require`s are literal so Vercel's tracer bundles the JSON.
  Root-level `title`/`description` are stripped, and that one was measured
  rather than assumed: `vibe.schema.json`'s description is a note to whoever
  reads the repo (it talks about the `$ref`s the flattener has just removed)
  and was going up as the tool's description of its own input. The test now
  walks the schema for `$ref` KEYS rather than searching its text, because
  the text search found that description and called it a leak.
- **The cache key is computed TWICE, once in each file, and the test holds
  the two to each other over all three fixtures** — the bench has no module
  system and a browser and a Vercel function cannot share a file, the same
  situation CONTRACTS §0 handles by writing the door derivation out twice.
  `sha256(every image's sha256, in order | canonical stats | MODEL)`; the
  test also asserts that reordering the pictures and changing the model id
  each give a different key. The client may send its key; it is never
  trusted — the server recomputes from the payload it actually received,
  because a client that could name its own cache file could serve any game
  any judgement.
- **`Vibe.merge` returns SEVEN keys, not the six §11 step 5 lists.** The
  seventh is `recipe`: Appendix E ends with "the vision call may override
  with its `recipe` when confidence ≥ 0.6", and `merge` is the only function
  that sees both a recipe and a confidence.
- **The alternates rule repairs, it does not refuse.** Appendix F's pixel
  rewrite can itself put the preset into `alternates`, so refusing there
  would fail an answer for a tidy-up the server just caused. The repaired
  object is validated a second time; every repair is written into the raw
  log.
- **The raw log keeps everything except the pictures.**
  `press/cache/vibe-<key>.raw.json` holds the response, the system prompt,
  the canonical stats, the fixture line and the repairs; a picture in it is a
  sha256, a media type and a byte count. Appendix F's "never log images" is
  section F of the test: every file the run writes is searched for each
  fixture's whole base64 and for a 96-character slice out of its middle — 3
  files against 24 needles, zero hits.

### What was measured, and what was NOT

**133/133 checks pass** (`node lab2/test/press/tools/test-vibe.js` from
`site/`, a few seconds; `--no-mount` skips the sockets and runs 120). Six
sections: 16 schema mutations each asserted at the right PATH (plus one
asserted the other way — an extra key IS allowed, `vibe.schema.json` sets no
`additionalProperties: false`, written down so the day somebody tightens the
schema that line says the behaviour changed on purpose); the server rules
with the transport stubbed, including the pixelSize override, the alternates
repair, the cache written and the second call a HIT with the transport
untouched, six ways for a model answer to be wrong and six bad payloads,
none of which throws; **18 merge rows** covering every branch of §11 step 5,
with 0.59 and 0.60 on either side of the line and a model preset that is
fourth in the ranking; the no-key path; and the real mount twice.

**The model was stubbed in every one of them.** There is no
`ANTHROPIC_API_KEY` on this machine (NOTES §D.11) and there never was one
while any of this was written — **no call to api.anthropic.com has been made
from here, not once, for any fixture**. The three `vibe-recorded.json` files
are hand-written and say so in their own first key, in capitals, with the
date and the reason. A green run means the plumbing is sound; it says
nothing about whether the call works, and the first day a key exists this
file should be run again with the stub taken out of one case.

The recorded judgements are the plan's own expectations for each fixture
(Appendix H) with one deliberate wrinkle each, so the fixtures exercise the
merge rather than agreeing with it: mosslight answers `scrapbook` at
confidence 0.72, which fires Appendix E's recipe override; neonrun answers
`harmony: loud` where `theme.js` reads that plate as CALM (its accent
candidate sits at C 0.14, a hundredth under the 0.15 line, while the picture
is plainly magenta against cyan) — which is exactly the disagreement the
vision call exists to settle, and `merge` takes the model's harmony whenever
it has one.

Two more honest gaps. The **Vercel KV branch is dead code here** — no KV
binding on this machine, so `kvOn()` is false in every run; believed correct,
never run. And the **second half of section E is a deviation worth naming**.
The sandbox server on 4322 IS posted to, unstubbed, and answers the no-key
path end to end through `serve.js`'s real `mountApi`. But the full round trip
needs `ANTHROPIC_BASE_URL` in the SERVER's environment, and that server was
started before this test existed and belongs to another agent — so the test
spawns **a second copy of the same `lab2/test/serve.js`** on a free port with
the two env vars set, pointing at a stub HTTP server it starts itself. Same
file, same handler, same door path; a different port. Both halves POST
through `press/vibe.js`'s own `request()` (Node has `fetch`), so the browser
file's error handling is checked against the function's answers rather than
against a curl.

One operational note: `serve.js`'s `mountApi` `require`s `api/vibe.js` once
and Node caches it, so **a running sandbox server does not pick up an edit to
this file** — restart it after changing `api/vibe.js`.

### For the merge into the live bench

`api/vibe.js` has five path literals at the top, together for this reason:
three schema `require`s, the `validate.js` `require` beside them, and
`PRESS_DIR`. Each gains one word — `'../press/…'` → `'../lab2/press/…'`. The
sandbox is a folder deeper than the merge target, so no single relative path
is right in both places (CONTRACTS §0's reason for site-absolute page paths).
`validate.js` is required across that line and the media-type sniff
deliberately is not: the schema check has to be the same code the builder and
the intake run or three doors disagree about what a valid object is, while
four magic numbers are not a shared truth that can drift. Env on Vercel:
`ANTHROPIC_API_KEY`, optionally `KV_REST_API_URL` + `KV_REST_API_TOKEN`,
optionally `ANTHROPIC_BASE_URL` for a gateway.

## Phase 4 — `kits.js` learns to re-skin: page palette, variants, the style pass (2026-09-07)

- **What:** `lab2/test/kits.js` rewritten to the plan's §8 4.2–4.5 and
  CONTRACTS §7, and a new verifier `perf/verify-kits-skin.js`. No other file
  changed (the tray in `index.html` is the other half of Phase 4 and is its
  owner's; `ADDING.md` §2 and `about.md` §9 still say "three sheets" and want
  a paragraph each in the docs pass).
  - **A fourth sheet.** `SHEETS.stickers` — `features/stickers-core.dc.html`,
    key `part`, spill `{r:6,b:7}`, the nine Knoll defaults (`skStroke` 3,
    `skRadius` 6, `skText` ''), shadow `rgba(0,0,0,0.3)`, jiggle `50% 50%`,
    `swayShare: 1`. `SRC_RE` gains `stickers-core`, and a one-row `SRC_KIT`
    map turns that file name into the kit name `stickers` so the two can
    never drift. **No `NAT` rows:** the older kits' table is HISTORY — the
    boxes their iframes measured, written down so nothing moved when the
    frames went away — while the sticker sheet was drawn to a contract, every
    part 128 × 128, so its box is one pair of numbers. `natural()` falls
    through the table to the sheet's own box, and to 128 + spill before the
    sheet has arrived, so a tray section is cut right on the first frame.
  - **A page with no bench.** The extractor half (SHEETS, the palette, the
    style pass, `conv`/`extract`/`loadSheet`/`extractOnly`/`setStyle`) is
    defined first and unconditionally; the bench half (layer, tiles, sprites,
    records, relive, ink, boot) is behind `if (world)`, which is now an early
    `return`. `window.Kits` on a page with no `#bench-world` is exactly
    `{ extractOnly, kindOf, isKitSrc, SHEETS, setStyle }`.
  - **Per-page palette.** Each role is read as `'--' + kebab(role)` off
    `documentElement` (`skPrimary` → `--sk-primary`; the plan's
    `'--sk-' + kebab(r)` assumes the bare role name, and these carry the `sk`)
    and falls back to the sheet's default. `skStroke`/`skRadius` come through
    the same path parsed as numbers; a token that is not a number is ignored.
    Resolved **once per page load** — the strings are cached and the sprites
    are baked from them — with two deliberate doors out: `data-palette` on a
    section, and `Kits.setStyle()`.
  - **Per-section variants.** `data-palette` (JSON) and `data-text` extract
    that section on its own, keyed `kit/part@hash(json + '|' + text)` and
    cached in `sheets[kit].variants`, so a hundred sections with the same skin
    extract once. **The sprite key is the variant key**, which is the bug this
    was written around: with `kit/part@scale` two differently-coloured
    stickers share one bitmap and swap colours the moment they are far enough
    away to be sprites. A variant reuses the base part's ink and mask through
    a getter — colour does not move an edge — and the sticker sheet's text is
    kept in memory (≈222 kB) because it is the only sheet a section may
    re-skin.
  - **`data-rot` is IN** (plan §16 q4's default not taken; `NOTES.md` §B.4
    can be closed). Live, the turn is the CSS **`rotate` property**, not a
    `transform` and not a wrapping `<g>`: the sheet's sway animates the root's
    `transform` and lab.css's jiggle overrides it with `!important`, so
    anything written there loses, while an individual transform property
    composes instead of competing. A `<g>` would also clip at the viewBox and
    would leave the drop-shadow square while the drawing turned. The sprite
    turns the bitmap about the same point (the drawing's own centre in world
    units, not the ink box's, which is three units off), clipped to the box as
    `.gz`'s `overflow:hidden` clips the live one. `Kits.inkAt` turns the
    pointer back by −rot about that centre before it reads the mask.
    `frames.js` is untouched and still measures the unrotated box; `ROT_MAX`
    is 45 because past that a sticker loses its corners to its own box.
  - **The style pass.** `document.documentElement.dataset.skStyle` at boot,
    absent → `{preset:'flat', lineShow:true}`, and every step asks whether its
    field is there, so the default vector is a pass that does nothing.
    `skStroke = 0.5 + 5.5 × lineWeight` and `skRadius = corners × 18` fold
    into the palette **before** `conv()`; the rest is `restyle(svg, style,
    part, suf)` after it, one commented step per row of §4.4's table.
    `paletteSize` is asserted in a comment and NOT re-quantised — `theme.js`
    put the roles on the ramp before they reached the page.
  - **The defs are pruned and renamed per style.** Only the ids a style
    actually reaches for are copied into a part (a wobble filter's scale is
    fixed where it is declared, so `wobble × 4` has to be written into the
    part's own copy), and every id carries a hash of the style vector, so two
    parts extracted at two different styles in one document — the Press
    Table's preview row — cannot share the first one's filter.
  - **Two choices worth the sentence.** The texture is clipped with a
    `<clipPath>` cut from the body layer and not a `<mask>`: a mask is read by
    luminance, so a dark body would mask the texture away and a light one
    would not — a bug that shows on some palettes only. And the glow finish is
    written `drop-shadow(0px 0px 6px …)` and not the plan's `0 0 6px`, because
    the sprite's shadow is baked from the drop-shadow this file parses back
    out of the root style, and that parser wants units: a bare `0` is the same
    declaration to CSS and a different one to the regex, and the sprite would
    have come out with no bloom while the live part glowed.
  - **Pixel.** `pixel = s` rasterises the still string at 1/s of its box once
    per part and re-enlarges it with `imageSmoothingEnabled = false`; the SAME
    bitmap is the sprite and the live part, which holds a `<canvas>` at
    `image-rendering:pixelated` instead of inline svg, and is always `still`.
    A text part cannot be a canvas (its words need the page's webfont) and
    takes the plan's fallback, live svg at `shape-rendering:crispEdges`. Ctrl
    over a canvas part cuts its rim from the still string.
  - **Grades.** A part carrying an SVG filter or a bloom — a wobbled line
    (only when there IS a line), a soft or painterly shade, the glow finish —
    is marked `filtered` at extraction: never `full`, and `sway` only within
    `SHEETS.stickers.swayShare` of `SWAY_MAX`. The constant is **1 until
    `perf/probe-stickers.js` (plan §8 4.6) measures it**; `shareOf()` reads
    either a number or the per-preset object the probe will write, so filling
    it in is one edit in one place. Pixel parts never sway.
  - **Two small extras.** `SHEETS[kit].jiggle` had no reader — lab.css's
    jiggle rule was written for the three kits that existed — so kits.js
    writes the stickers' pivot into its own `#kit-css`. And the MutationObserver
    watches `data-palette`, `data-text` and `data-rot` beside `style` and
    `class`, so a skin changed on the tag re-lifts at the grade it was drawn
    at.
  - **The trap Phase 4a found is closed.** `conv()` copied a `<text>`'s
    textContent raw, so a text part would have shown the literal
    `{{ skText }}`; it interpolates the palette in text content now, with the
    same regex the attributes use.
- **Measured** (from `site/`, headed system Chrome on the sandbox server 4322,
  the door blocked in every context; results in `perf/results/kits-skin/`):
  - **`perf/verify-kits-skin.js` — 62/62 PASS**, eight screenshots and
    `summary.json`. It splices its own eight sections into the tray's closing
    marker with `page.route` and writes nothing to `index.html`.
  - **No `--sk-*` on the page:** all forty parts extract, no `{{` survives in
    any of them, the palette is the Knoll nine to the character, a live burst
    is `rgb(201, 59, 130)` = `#c93b82` and its outline `3px` of
    `rgb(38, 33, 42)` = `#26212a`.
  - **A `:root` of eight injected tokens** (`--sk-primary #0a7d3f`, ink
    `#101820`, `--sk-stroke 5`, `--sk-radius 2`, …): **LIVE** the body reads
    `rgb(10, 125, 63)` and the outline `5px` of `rgb(16, 24, 32)`; **SPRITE**
    at 50 %, with the part proven to be a sprite (no svg, no canvas, 16
    tiles), the tile pixel at the box centre reads `[10, 125, 63, 255]`. The
    skin reached both paths.
  - **Variants:** the `data-palette` burst is `rgb(226, 35, 26)` live while
    its neighbour, the same part, stays `rgb(10, 125, 63)`; on the tiles the
    two read `[226,35,26,255]` and `[10,125,63,255]` — two bitmaps, not one —
    and a third section with the identical `data-palette` reads the variant's
    colour. **3 variants for 3 distinct skins over 56 sections** (the
    verifier's WISHLIST banner and the tray's are the same skin and share one
    extraction).
  - **`data-rot="40"`:** the svg carries `rotate: 40deg` and its unturned twin
    carries none; `Kits.inkAt` over a 21 × 21 grid of each box **differs at 97
    of 441 points** (so the turn moved real ink) and **agrees with the twin
    sampled at the back-rotated point 332/349 = 95.1 %** — the ~5 % are
    boundary points, where inkAt's ±1-pixel neighbourhood and a sub-pixel turn
    land on either side of an edge; an inkAt that did not turn the pointer
    back would answer the flat grid, ≈78 %. On the tile, a point at 23 %,
    11 % of the box is opaque (alpha 217) on the turned sticker and bare
    (alpha 0) on its twin — the sprite is drawn turned. And a big turned part
    at a moving grade came back `grade: 'full'`, `rotate: -25deg`,
    `animation-name: sk-sway`, `transform: matrix(1, 0, 0.00777018, 1, 0, 0)`:
    the turn holds while the sway runs, which is the whole reason for the
    `rotate` property.
  - **Grades:** at 100 % over a `data-scale=3` sticker, `cel` gives
    `full = 3, sway = 0`; `ink-sketch` (wobble 0.6) gives `full = 0,
    sway = 3` — a filtered part never reaches the full grade.
  - **All ten presets of Appendix C applied with no console error and ten
    DISTINCT renderings of the burst.** Row by row: `flat` has no line layer;
    `outline-cartoon` 0.7 → stroke `4.35`, `cel` 0.4 → `2.7`; `cozy-soft` 0.9
    → `rx 16.2` and a round join, `grunge` 0.1 → `rx 1.8` and mitre; the
    detail layer is dropped at `flat`/`painterly` and kept at
    `cozy-soft`/`grunge`; `flat` loses the shadow layer and keeps the root
    drop-shadow; `neon`'s shadow wears `url(#sk-soft-r3qu0y)`; the shadow fill
    becomes `url(#sk-hatch-…)` / `url(#sk-dots-…)` / `url(#sk-dither-…)` for
    ink-sketch / retro-print / pixel; `ink-sketch`'s line wears
    `url(#sk-wobble-1bfq2iy)` at **scale 2.4** (0.6 × 4) and is drawn a second
    time through `#sk-wobble-2`; the texture rect is `url(#sk-paper-…)` /
    `scanlines` / `grunge` / paper-for-canvas, clipped
    `url(#sk-body-burst-1bfq2iy)`, and absent for flat and cel; `neon`'s root
    is `filter: drop-shadow(0px 0px 6px #0a7d3f)` with the line struck in
    `#ffd166`; the halo shows for `outline-cartoon` and `cozy-soft` only;
    `ink-sketch`, `retro-print` and `pixel` carry no root filter at all; a
    `cel` part copies **0** defs and an `ink-sketch` part copies **5**, every
    id suffixed.
  - **`pixel: 4`:** the part is marked `pixel 4` with its detail dropped, the
    live sticker is a `<canvas>` and not svg, the WISHLIST banner keeps its
    live svg, the tile still reads `[10,125,63,255]` (the same bitmap on both
    paths), `sway = 0, full = 0`, and ctrl over the canvas part raises a
    `[data-lab-ink]` rim in front of it with `Kits.inkAt` still true at the
    centre.
  - **A page with no bench:** `Object.keys(window.Kits)` is exactly
    `SHEETS, extractOnly, isKitSrc, kindOf, setStyle`, no `#kit-layer` was
    made, and `Kits.extractOnly` returned **40 parts**, `burst` 128 × 128 with
    `tags [hype, sale, retro]` and `text false`, `banner.text true`, painted
    in the one role it was handed (`#123456`, and the Knoll pink nowhere in
    the string) with the other eight off the page's own tokens, at the style
    it was handed (stroke 4.35, halo shown). Zero console errors.
  - **Regression, the three old kits: 56 of 56 parts extract BYTE-IDENTICALLY**
    to the live pre-Phase-4 `lab2/kits.js` — `full`, `sway`, `still`,
    `raster`, `w`, `h`, `spill`, `shadow`, `motion`, `text` and the measured
    `ink` box, all four sheets' keyframes 5/8/14 on both — compared by opening
    `/lab2/` and `/lab2/test/` side by side on 4321 with the door blocked.
    The three sheets are md5-identical to the live ones and no `<text>` in any
    of them holds a `{{ }}`, so the text interpolation is a no-op there.
  - **`perf/smoke-bench.js` — 5/5 PASS** after the change: parts 48, 20 tiles,
    8 live, 40 sprites, docs 0, zoom 0.3667 (the fit of `data-open` to four
    decimals), no console error, no page error, no response ≥ 400 but the
    blocked door.
- **Open, for the phases after this one:** `swayShare` is the plan's default
  1 until `probe-stickers.js` measures the wobble and glow presets; the sheet
  header's four "measured in Phase 4.6" lines are still placeholders;
  `ADDING.md` §2 and `about.md` §9 want the fourth sheet and what `--sk-*` and
  `data-sk-style` do; `CONTRACTS.md` §7's `extractOnly` row could say that
  `text` is a boolean (the part has a slot) and that the palette resolves in
  three layers — sheet defaults, then the page's tokens, then the caller's.

## Phase 5 (Appendix A) — the seven schemas and the validator (2026-09-07)

- **What:** `press/schemas/` — `manifest analysis theme style layout vibe game`
  `.schema.json`, JSON Schema draft 2020-12, 11 088 B in all — plus
  `press/tools/lib/validate.js`, the small validator every writer and every
  door runs its object past, and `press/tools/test-schemas.js`, which refutes
  both. CONTRACTS gains §12 (the schema folder and the `Validate` API) and §10
  gains the three things `game.schema.json` pins.
- **Why:** the plan asks for real files and "a 60-line validator is enough:
  types, enums, required, min/max, pattern; do not vendor a full library"
  (Appendix A). Until now every tool that needed a rule wrote the rule out
  again — `check-fixtures.js`'s header says so in as many words, "the rules
  are written out here because press/schemas/ is Phase 5's and was empty".
  Now there is one place each rule lives.
- **The five Appendix A files and `vibe.schema.json` (Appendix F) are
  transcriptions.** Not one rule was changed, tightened or dropped. A JSON
  file cannot hold a comment, so each carries three keys the appendix does not
  — `$schema` (the draft it is written in), `title`, and a `description`
  naming the appendix and section it came from — and nothing else was added.
  `game.schema.json` is CONTRACTS §10's one line spelled out: seven required
  keys, five of them `$ref`s to the files above, and three pins written into
  §10 — the envelope is **closed** (`additionalProperties: false`, so a
  builder that wants an eighth key adds it to the schema first), `version` is
  `const 1` (a reader that meets a 2 stops rather than guessing which half it
  understands), and `builtAt` is the shape `new Date().toISOString()` writes,
  read off that method rather than a general ISO-8601 grammar.
- **`$ref` is resolved the way a small validator can:** a file name in the
  same folder, then a JSON pointer walked key by key —
  `style.schema.json#/properties/preset`, exactly the shape Appendix F uses.
  Files are handed in as a pool (`Validate.loadDir` in Node,
  `Validate.loadFetch` in the browser); no `$defs`, no remote refs, no URI
  resolution. So the vision call's menus cannot drift from the page's: add a
  preset to `style.schema.json` and the model is offered it in the same
  breath.
- **The validator, and the one thing that makes hand-rolling it safe.** It
  does type (including `integer` and an array of types), required, properties,
  additionalProperties (`false` or a schema), propertyNames, items,
  minItems/maxItems, minLength/maxLength, minimum/maximum, exclusiveMinimum,
  pattern, enum, const, oneOf, $ref. It does not do allOf/anyOf/not,
  if/then/else, `format`, `$defs`, patternProperties, prefixItems,
  uniqueItems, multipleOf or exclusiveMaximum. The danger of that list is not
  the keyword it rejects, it is the one it would silently IGNORE — a rule
  written into a schema in good faith that never runs. So `Validate.lint`
  walks a schema and names every keyword outside the list, and every `$ref`
  that does not resolve, and the test holds all seven files to zero. Add
  `allOf` to a schema and the test fails the same minute.
- **Three deliberate departures, each measured against what this system
  actually carries.** A non-finite number fails `type: number`, because
  everything validated here is about to be `JSON.stringify`'d, where NaN and
  Infinity become `null` — a value that survives the check but not the file is
  worse than a rejection. A string's length is counted in UTF-16 units
  (JavaScript's own `.length`), not code points: these caps are guard rails on
  a text box, not a measurement. And when a `oneOf` matches nothing, the list
  carries the complaints of the alternative that got FURTHEST into the
  document (longest path named; ties to the fewer complaints, then the earlier
  branch), so a bad vibe three files deep in a `game.json` reports
  `analysis.vibe.fontPairing` and not only `analysis.vibe` — measured: with
  the naive "fewest errors" rule it reported `type: expected null`, which is
  true and useless, because the `null` alternative always fails in exactly one
  line and always won the tie.
- **Measured**, `node lab2/test/press/tools/test-schemas.js` from `site/`:
  **174/174 checks pass, exit 0, 517 ms**, no browser and no server.
  - The seven files parse, declare draft 2020-12, and **lint clean, 0 errors
    each**. The fourteen menus (10 presets, 9 pairings, 5 asset roles, 9
    platforms, 4 sources, 3 recipes, 5 slot kinds, 7 shadings, 6 textures, 4
    finishes, 4 palette sizes, 10 art styles, 10 moods, **40 motifs**) and 28
    numbered rules are typed out AGAIN in the test from the plan and compared
    word for word and in order — a schema is a transcription, and that is the
    second pair of eyes on it.
  - **The real objects validate, not only hand-made ones.** All three
    fixtures' `manifest.json`; the theme `press/theme.js` derives from the
    palette `press/palette.js` quantises out of each fixture's hero
    (`lib/fixture-theme.js`, 41 tokens each, pairing `clean`); the analysis
    built from that palette and Phase 3's `stats.json`; and the style vectors
    Phase 3 measured (`pixel`, `painterly`, `neon`). Appendix E's poster
    recipe, an Appendix F vibe, and the whole `game.json` envelope through all
    five `$ref`s.
  - **26 mutations, each rejected at exactly the expected path**: a slug with
    a capital, an 81-character title, an asset role off the menu, an `http://`
    link, a 15-character sha256, `attested: false`, `ps6`, no assets, thirteen
    assets, `w: 15`, no rights block, a preset off the menu, a slot kind off
    the menu, `rot: 46`, `scale: 5`, nine colours in an eight-colour palette,
    `#ABC`, two motifs, `confidence: 1.5`, a token named `--Bad`, an eighth
    key in the seven-key envelope, `version: 2`, a `builtAt` that is only a
    date, a `preset` breaking the enum it borrows from `style.schema.json`,
    and a `fontPairing` breaking `theme.schema.json`'s three files deep inside
    a `game.json`.
  - **Nothing throws.** 19 garbage inputs (null, undefined, NaN, Infinity, a
    BigInt, a function, a Date, an object with no prototype, one that points
    at itself, one whose getter throws, a Proxy that throws on every read,
    5 000 nested arrays) and 7 bad calls (a schema that is a number, null, an
    array, a name that is not in the pool, no pool at all, a pool that is a
    number) each came back as a list of `{path, message}`. Two schemas that
    `$ref` each other stop at MAXDEPTH 32 with one error instead of taking the
    stack down. A pattern that is not a regular expression is reported, not
    thrown.
  - **Deterministic:** three runs of the 26 mutations are byte-identical
    (3 764 B each), a second pool read off the same folder gives the same
    answers, and fifty checks of a valid manifest all answer `[]`.
  - **The browser half works**, measured in headless Chrome against the
    sandbox server on 4322 (ad-hoc probe, not a repo file — the repeatable
    test is Node-only and runs in half a second): loaded as a plain
    `<script>`, `window.Validate` is an object and `window.module` is
    undefined (nothing leaked), `loadFetch('/lab2/test/press/schemas/')`
    pulled all seven and they lint clean **in the page too**, the pixelfort
    manifest validated, a copy with two faults reported `slug` and
    `assets[0].w`, five garbage values answered lists, **zero page errors**.
- **`exclusiveMinimum` is implemented and no schema uses it yet** — it is in
  the plan's keyword list, so it is here, and the test exercises it (and the
  type array, the local `#/…` ref, an object `const`,
  `additionalProperties: true`, `integer` against 3.0 and 3.5, a `oneOf` that
  matches twice) on synthetic schemas: the day a schema first reaches for one
  is not the day to find out whether it works.
- **For the builder after this one:** `check-fixtures.js` still carries its
  own hand-written copy of the manifest rules (its header explains why —
  `press/schemas/` was empty when it was written). It is now a duplicate, and
  the two agree today: the schema accepts all three fixtures and so does it.
  Whoever touches that file next should read the pool instead.

## Phase 5.1 — the game page template (2026-09-07)

- **What:** `games/_template.html`, the skeleton every generated page is built
  from — the sandbox bench's head, header, docks, keymap and script list with
  the lockup, the field, the forest and the village taken out, nine
  placeholders left in (`{{TITLE}} {{DESCRIPTION_META}} {{TOKENS_CSS}}
  {{FONT_PRELOADS}} {{SK_STYLE}} {{OPEN}} {{OPEN_NARROW}} {{SLUG}}
  {{SECTIONS}}`) and `keep.js`'s two copy markers and its
  `  </div><!-- /bench-world -->` anchor kept byte for byte. Beside it,
  `games/README.md` (what a game folder holds, how `keep.js` writes back, how to
  open one) and `perf/verify-template.js`, which fills the placeholders by hand
  and boots the result. Its output, `games/_probe/`, is left on disk as the
  template's own fixture.
- **Why:** plan §9 5.1. `build-game.js` is next and every page it writes
  inherits whatever this file gets wrong; the two things a reading could not
  settle were whether the relative paths resolve from two folders down and
  whether `lab.js`, `frames.js` and `kits.js` behave on a page that is not the
  bench. Both are now measured rather than argued.
- **Measured** — `perf/results/phase5/` (`template.png`, `template-narrow.png`,
  `template.json`), **17/17 PASS**, system Chrome headed on 4322 with
  `**/_lab2/**` blocked:
  - **Zero console errors, zero page errors, zero failed requests, and the only
    response ≥ 400 is the blocked door itself.** No `[kits]` or `[keep]` line —
    those two warnings are how a path that did not resolve announces itself.
  - **The camera framed `data-open`:** `Lab.zoom` **0.8641** against the fit of
    `-301,-120,1796,780` at 1600 × 897, which is 0.8641; the rectangle sits
    inside the bench off-centre by **0.1 × 0.2 px**. A second, fresh context at
    390 × 729 read `data-open-narrow` instead: **0.2983** against that
    rectangle's fit 0.2983, where the wide one would have been 0.1993.
  - **The picture measured to its asset:** the `gz-pic` box came out
    **829.6 × 466.6 = 1.7778** against the asset's 960 : 540 = 1.7778 — exact,
    not within tolerance. `frames.js`'s art-panel path needed no change, which
    NOTES §C.3 had predicted from reading and nobody had measured.
  - **The sticker extracted in the page's colours:** 40 parts off
    `stickers-core.dc.html`, `banner` among them with its text slot filled;
    `kits.js`'s `skPrimary` is **#944689**, which is the page's `--sk-primary`
    token, which is `theme.js`'s answer for the neonrun fixture — so the token
    block, `kits.js`'s read of it and the extraction all agree. One live part
    (a text part is always live) and 20 tiles. **No iframe on the page and no
    booted document**, which is the perf floor a game page starts from.
  - **The theme beat lab.css:** `--paper` **#161323**, `--body` `'Space Mono',…`
    — the `<style>` after the stylesheet, as the head's comment argues.
- **Two paths that did NOT resolve from two folders down, both found by this
  run and both fixed in the template with a comment:**
  1. **`posters/index.json`.** `frames.js` fetches it relative to the page and
     nothing boots until it answers; from `games/<slug>/` that is
     `games/<slug>/posters/index.json`. So **every game folder holds its own**,
     `{}` until a machine on that page has a poster — which is also what plan
     §5.4.4 wants (`perf/posters.js` takes a page path). Not a borrowed path:
     pointing it at the bench's index would hand a game page the bench's
     machines.
  2. **The kit sheets.** `kits.js` holds them as `features/<kit>.dc.html`
     (CONTRACTS §7) and fetches that string against the document — a 404 from
     here, and forty bare stickers. It is fetched the instant `kits.js` runs, so
     `Kits.SHEETS` cannot be re-pointed afterwards and the section's own
     `data-src` does not help (`loadSheet` never reads it). **Stopgap in the
     template:** `fetch` is wrapped immediately before `kits.js`'s `<script>`
     and unwrapped immediately after, rewriting only a bare `features/…`.
     **The real fix is one line in `kits.js`** — resolve `S.file` against
     `document.currentScript.src` — and it belongs to whoever next owns that
     file; the guard stops matching the day it lands, so the two files can be
     changed in either order. `verify-template.js` asserts on the *response*, so
     it fails if the stopgap is removed before the fix arrives.
- **What the template leaves out, and why:** `sign.js` (verified: it looks for
  `.sign-word-row` and returns at its second statement when there is none, so it
  is a request that buys nothing), `spotlight.js` (it watches machines; there are
  none), `cursors.js` (NOTES §D.7), and **both React builds** — verified by
  reading that neither `frames.js` nor `kits.js` touches React, which only the
  iframed documents do. Phase 10's trailer machine brings all three of the last
  ones back.
- **Open, for the owner:** a game page carries no `og:`/`twitter:` cards. A
  press page shared into a chat wants a preview and the plan does not ask for
  one; `games/README.md` says where they would go.

## Phase 4c — the sticker tray on the sandbox bench, and the docs (2026-09-07)

- **What:** the forty sticker sections written into `lab2/test/index.html`
  between the `▼ ▲ THE STICKER TRAY` markers — Appendix D's order, eight
  across and five down at `x = 260·col`, `y = 900 + 260·row`, each the same
  five-line kit section the stand's parts have. Two of them carry a
  per-section variant (CONTRACTS §7) so the mechanism is on the paper and not
  only in the contract: `burst-round` a `data-palette` overriding two roles,
  `banner` a `data-text`. `data-open` recomputed round the whole page; the
  header hint, the caption's sub-line and the head's preload list brought up
  to date; `README.md` given the Phase 4 tools and two table rows; a new
  `perf/verify-tray.js`; the counts in `perf/smoke-bench.js` and
  `perf/verify-bench.js` moved to the new bench.
- **Why:** the tray is the acceptance test of the whole sticker half — "40
  parts on the main bench in Knoll colours" (plan §8, Acceptance) — and it is
  the only place the cost model can be checked with the WHOLE sheet on the
  paper at once. Forty new sections must not cost the page a single document
  (ADDING.md §5, plan §0.3); if `kits.js` did not know the sheet, `frames.js`
  would fall back to forty iframes and the count would say 40.
- **The numbers on the page, each one measured before it was written:**
  - **`data-w="134" data-h="135"`, every part.** The sheet's 128 box plus the
    root drop-shadow's 6 right and 7 down. All forty parts were rendered in
    Chrome and their layers' bounds read against the box: the furthest ink in
    the set is `burst`'s, **126.9 across and 124.3 down**, so nothing draws
    past its box, the alpha bounds never beat box + spill, and `natural()`
    answers 134 × 135 for all forty. `kits.js` agrees in its own words
    (`SK_BOX + S.spill.r`, line 270), and the bench measured **134 × 135 on
    all forty boxes** at boot — nothing to re-cut. (The stage brief asked for
    140 × 147 *and* for "the 128 box plus the 6/7 spill"; those are two
    different numbers and the arithmetic is the one that was kept.)
  - **`data-open="-120,-120,2194,2315"`.** The bounding box of everything on
    the paper — caption 0,0→1600,200; stand 0,400→1910,775; tray
    0,900→1954,2075 — plus Appendix E's 120 of margin. It was
    `-120,-120,2150,1015` (the caption and the stand), and the tray is the
    point of the page now. `data-open-narrow` is deliberately **unchanged**:
    on a screen under 700 wide the width binds and eight columns would be a
    smudge, so a phone still opens on the caption band.
  - **the grid, 260 apart from x 0, y 900.** A 134 box and 126 of paper — no
    sticker in its neighbour's shadow; eight columns end at 1954, within 44
    of the stand's 1910; y 900 is 125 under the stand's ground line.
  - **`burst-round`'s two roles**: `skPrimary` → `#5871f5`, the sheet's own
    secondary blue, and `skShadow` → `#3c4da7`, that blue at **0.68 of each
    channel** — the fraction the sheet's own `#8a2558` is of its `#c93b82`.
- **Measured** (from `site/`, results in `perf/results/phase4/`):
  - **`perf/verify-tray.js` — 9/9 PASS, headed Chrome on 4322, door blocked.**
    `Kits.stats().parts = 48`, all forty tray sections kit records; **docs = 0
    at the opening zoom (0.3667) and docs = 0 at 20 %** — ADDING.md §5's floor
    held with the whole sheet on the paper; the opening zoom is the fit of
    `data-open` to four decimals; zero console errors, zero page errors, no
    response ≥ 400 but the blocked door; 40/40 stickers wholly inside the
    photograph. Grades at the opening zoom: 40 sprites on 20 tiles, 8 live
    (the stand's trees), 0 full, 0 sway, 565 KB of sprite. `variants: 2` —
    the two per-section overrides were extracted and cached.
  - **`perf/results/phase4/tray.png`, looked at.** Forty stickers on the
    paper in Knoll's pinks and blues, eight across and five down, evenly
    spaced, none clipped, none touching. `burst-round` is **blue** beside the
    default pink `burst` — the `data-palette` override, visible at a glance —
    and `banner` reads **WISHLIST**, which is `data-text`. The other seven
    text-slot parts show empty slots, which is `skText: ''`, and **no part
    shows a literal `{{ skText }}`** — the trap Phase 4a found (`conv()`
    copied `<text>` textContent raw, kits.js line 309) is closed in the
    kits.js half. `tape.js`'s default caution strip (60,1100 → 700,1088) lies
    across the tray in the photograph; it falls in the gutter between rows 0
    and 1 and covers no sticker, and it is the runtime's own default, not
    part of the tray.
  - **`perf/smoke-bench.js` — 5/5 PASS** against the live server on 4321 with
    the door blocked: parts 48, 20 tiles, 8 live, docs 0, load 998 ms, sheets
    in at 1039 ms, no failed request. Its expectation moved **8 → 48** and the
    sheets it waits for **3 → 4** (`kits.js` fetches every sheet in `SHEETS`
    at boot, whether or not a section asks for it), and its header says so.
  - **`perf/verify-bench.js` — 21/21 PASS.** It carried the same two counts
    and the as-is rectangle, so all three moved with the page; nothing else in
    it changed. Its narrow pass is the proof the unchanged `data-open-narrow`
    still binds on a phone: at 390 × 423 the fit is **0.1946** against the
    wide rectangle's 0.1632. The caption's sub-line now measures **1022 px**
    (it was 1156; its words got shorter), and the comment that names the
    number was changed with it.
- **Two things the next hand should know.** (1) A run of the sandbox bench
  with the door OPEN autosaves `data-home-z` onto all forty-nine sections
  (markup order, so nothing moves); one such run landed mid-stage and the
  attributes were stripped back out, since the stand's own comment says
  markup order is pile order. Block the door (`page.route('**/_lab2/**')`)
  in anything that only reads. (2) `perf/verify-kits-skin.js` and
  `perf/probe-stickers.js`, which the plan asks for in §8 4.6–4.7, are still
  unwritten; `README.md` says so rather than listing commands that do not
  exist.

## Phase 5, step 3 — verified a second time: keep.js and the page scoping (2026-09-07)

- **What:** a second, independent adversarial pass over the same five claims
  (the CRLF, the door derivation, `verify-keep.js` twice on a fresh server,
  the page scoping, the pill). Everything below was measured before the
  verifier entry further down was read, so where the two agree they agree
  separately. Nothing in `lab2/test` was edited by this pass; the sandbox
  server on 4322 was killed and restarted before each verifier run (the
  once-per-process `keep-bak` the verifier deletes on restore) and is left
  running, PID 24656.
- **Measured:**
  - `keep.js` is CRLF throughout — 331 CR, 331 LF, 331 CRLF pairs, no bare
    LF and no bare CR — and 331 − 289 = 42 more lines than `lab2/keep.js`,
    which is exactly what its seven hunks add. `tape.js` is md5
    `f67b18864220fed42aec4a6472ae3434`, byte-identical to `lab2/tape.js`.
    `diff --strip-trailing-cr lab2/keep.js lab2/test/keep.js` is those seven
    hunks and nothing else: two header paragraphs (WHICH DOOR, the sticker's
    own words), the door block + `skey`, `palette`/`text`/`rot` in `look()`'s
    live map and again in its `gone` map, the array `stamp()`, and the
    `removeItem` line. `lab.js` is thirteen hunks (ten scoping, three the
    Phase-0 `data-open` read), `frames.js` one, `tracer.js` the palette move
    plus one `Lab.storeKey('flatfile')` hunk. All four pass `node --check`.
  - **The derivation.** The three lines were lifted out of `keep.js`'s own
    source at test time (not retyped) and run in Node beside CONTRACTS §0's
    four lines transcribed by hand: the two agree on all fifteen pathnames
    tried. `/lab2/` `/lab2/index.html` `/` `/index.html` `/dashboard/`
    `/lab2/press/` → `/_lab2/default`; `/lab2/games/abc/` → `/_lab2/games/abc`;
    `/lab2/test/games/abc/index.html` and `/lab2/test/games/abc-1/` →
    `/_lab2/test/games/abc` and `…/abc-1`; `/lab2/test/`, `/lab2/test/press/`
    and `/lab2/test/press/index.html` → `/_lab2/test/default`. Two the task's
    list did not pin: a bad slug `/lab2/games/ABC/` takes the default branch
    but comes out `/_lab2/games/ABC/default`, and any other folder under
    `lab2/` (`/lab2/test/perf/`) likewise — doors that exist nowhere, so
    `keep.js` hears a 404 and goes quiet, which is the safe fall; the hazard
    this step closed was falling to the BARE `/_lab2/default` from a
    non-bench path, and neither case does that. `dir` always ends in `/`
    because 4322 answers 302 to `/lab2/test`, `/lab2/test/press` and
    `/lab2/test/games`.
  - **`node lab2/test/perf/verify-keep.js` twice**, the server killed
    (PID 26580 → 24592 → 24656) and restarted from `site/` before each, the
    door answering `{"ok":true,"door":true}` on the first poll: **44/44 PASS
    both runs**, exit 0. `lab2/test/index.html` md5
    `1f0b4fc51b9639fde229361dfefa3d56` before run 1, after run 1 and after
    run 2; no `index.html.keep-bak` and no `.tmp` left either time. Pine
    340,400 → 540,400; the keep-bak 23 648 B equal to the before-snapshot;
    the timer's own save landed at 26.8 s and 26.9 s.
  - **The scoping, on its own harness** (a scratchpad script, not shipped;
    the door blocked in every context, never a POST): **31/31**. With
    `data-lab-page="probe-v"` stamped in by `page.route`, `Lab.setZoom(0.8)`
    then `panBy(-160,-90)`, a pointer stroke drawn on the wall
    (`M1176.7 1147.6L…`, no NaN), a note typed with the text tool and pinned
    with Enter, and a tape strip added: eight keys, every one
    `knoll-lab2:probe-v:…` (`cam copies flatfile gif gone tape vol wall`). A
    reload brought back the stroke's exact `d`, the note's words, the second
    tape strip and the camera at 0.8 / −241 / −521, with the stroke painted
    (2 `.wall-item` nodes). The SAME browser profile, unstamped, saw 0 wall
    items, 0 painted, the default single tape strip and its own opening
    camera (0.3235) under bare `knoll-lab2:…` keys — and the named page,
    reopened after that, still had only its own. A fresh profile saw nothing
    of either. Isolation both ways.
  - **The pill.** A door that answers → `Keep.live` true and the pill wore
    `autosave on`, every knock to `/_lab2/test/default`. A door that 404s →
    the pill stays `hidden` and empty and `Keep.live` is false.
  - **The pagehide trap, met independently.** The first run of that harness
    closed a context whose door GET had been answered; `keep.js`'s `pagehide`
    handler posts with `keepalive: true`, and Playwright's route does not
    intercept a request made during teardown, so it reached the real 4322 and
    wrote `index.html` (`data-home-z` 0–8 on the nine sections, nothing else)
    a minute after the harness's own md5 check had passed. Put back from
    `perf/results/keep/index.before.html`. The harness now clicks the pill
    before closing — `on` → false, and the guard is `if (!live || !on) return`
    — and a re-run left md5 `166c3def…` identical before and after, 0
    `data-home-z`, no keep-bak. That is the second separate sighting of the
    same trap; the rule stands: block the GET too, or pause it before you
    close.
  - **The literals.** `grep -rn 'knoll-lab2:'` over the sandbox's js/html
    finds the `NS` definition (`lab.js:65`), three guarded fallbacks
    (`frames.js:74`, `keep.js:87`, `tracer.js:516`), the Phase-0 report-only
    probe (`perf/verify-bench.js:129`), `verify-keep.js`'s own assertions,
    and comments. Every `localStorage` call in `lab2/test` goes through
    `NS`/`KEY`/`ZKEY`/`CAM_KEY`/`skey`/`Lab.store`; `press/`, `features/`,
    `games/` and `api/` make none, and nothing in the folder uses
    `sessionStorage`, `indexedDB` or `document.cookie`. `index.html` loads
    `lab.js` (line 724) before `frames.js` (726) — `frames.js` reads `KEY` at
    load time — so `games/_template.html`, when Phase 5 writes it, must keep
    that order.
  - **The live bench, read-only.** `http://localhost:4321/lab2/` with the
    door blocked: one GET knock to `/_lab2/default`, `Keep.live` false, the
    pill hidden, no `Lab.storeKey` and no `data-lab-page`; the sandbox's
    lifted derivation at that pathname is `/_lab2/default`. The served
    `keep.js` is md5 `777221b877e844ce3d9b287901cb1827`, equal to the file on
    disk, and still reads `const DOOR = '/_lab2/default';`. `lab2/keep.js
    lab.js frames.js tracer.js kits.js index.html`, `site/serve.js` and
    `site/vercel.json` carry mtimes of 2026-09-03/04 and are clean in
    `git status`; the only modifications outside `lab2/test` are the
    dashboard/login/signup/yard files from 2026-09-05/06.
- **Two things to hand on:** (1) `lab2/test/index.html` was being rewritten
  by a concurrent phase throughout this pass (23 648 B / 9 sections →
  49 788 B / 49 sections, the sticker tray). `verify-keep.js` writes that
  file for real and puts it back, so it must not be run while another phase
  is editing it — its restore guard is what makes a clash loud rather than
  silent, and it is why the two runs above were done back to back. (2) The
  session scratchpad is shared between the phases running at once: two files
  written there under ordinary names (`entry.md`, `splice.js`) were
  overwritten by another phase mid-task. Name scratch files for your phase.
- **Verdict:** holds. No defect found, nothing changed.

## Phase 3 — verified: style.js under attack, two rules put back (2026-09-07)

- **What:** an adversarial pass over `press/style.js` set to refute Phase 3,
  and a new adversary, `perf/attack-style.js` — nine plates it draws itself
  (three pixel grids, a noisy grid, a value-noise photograph, a stroked
  cartoon, a diagonal hatch, a grain plate, a strokeless flat-vector plate),
  every one built as `ImageData` by plain arithmetic from `Palette.rng` so a
  run is the same run tomorrow, plus a probe that re-implements
  copy512/luma/Sobel on its own and a ranking sanity check. Results in
  `perf/results/attack-style/summary.json`. Two real defects found and
  fixed in `style.js`; the goldens did not move.
- **The goldens hold.** `perf/test-style.js` run twice before the fixes and
  twice after: **90/90 PASS** each time, exit 0, and the three
  `fixtures/<name>/stats.json` are byte-identical across all four runs
  (md5 `ea0ff728…` / `e49cd197…` / `d280b6ba…`, 736 / 746 / 741 B).
  `expected.json`'s bounds match what the goldens hold, number for number:
  pixelfort 4 / present / 16–23 against 4 / true / 17; mosslight dark false,
  no outline, hfEnergy ≥ 0.1 against 0.1601; neonrun dark true, saturation
  ≥ 0.065 against 0.1051, weight ≤ 0.3 against 0.3.
- **Fixed 1 — the outline's dark share was not the statistic the file said
  it was.** `inkNear()` counted a strong edge as dark when the DARKEST pixel
  of the 3 × 3 window the Sobel kernel read was under `DARK_LUMA`, while
  plan §7 step 2 and style.js's own header say the strong-edge PIXEL's luma.
  The two are not the same population — the window minimum counts both sides
  of every dark-to-light edge — and the probe measured the gap: pixelfort
  **0.9365** where the header claims 0.4589, neonrun **0.9755** where it
  claims 0.7075. The header's numbers were the per-pixel rule's, reproduced
  to four decimals by a probe that shares no code with `style.js`
  (0.4604/0.4511/0.4609/0.4633 and 0.6237/0.6563/0.8639/0.6861), so the
  header was true of an earlier cut and the window rule went in without it.
  It matters: `DARK_SHARE` 0.45 is a line the plan wrote for the per-pixel
  share, and against twice the number it stops discriminating. Measured — a
  512 × 512 plate of flat unaligned rectangles from five dark and five light
  colours with **no stroke anywhere** (edge density 0.036, inside the
  0.02–0.18 window, so the dark share is the only gate) read the window
  share 0.5007 → `outline.present` **true at weight 0.9**, ranking
  `outline-cartoon` first; its per-pixel share is 0.2902 and it now reads
  **false**. A real 6-px-black-stroke cartoon reads 0.4950 per-pixel and
  0.9571 window, so the window rule left an outlined picture and a
  strokeless one on the same side of the line. `inkNear` is gone, the count
  is `L[i] < DARK_LUMA`, and header §2 records the measurement. All three
  fixtures' `present` is the same under either rule — which is why the
  goldens are unchanged — and `game.darkShare` in
  `perf/results/style/summary.json` now reads the header's 0.4589 / 0 /
  0.7075.
- **Fixed 2 — `paletteCount` 0 was read as "very limited".** The count is
  5-bit bins holding ≥ 0.1 % of the pixels, so a picture whose colours are
  spread too thin for any bin to clear the floor counts **0** — the
  many-colour case wearing the many-colour number's opposite — and the
  vector's ladder (`< 12 → 8`) then handed it `paletteSize` **8**, the
  tightest quantisation in the table, plus shading `flat`. Measured: the
  640 × 360 value-noise photograph counts 0 bins holding **0.0000** of its
  pixels; it now reads `paletteSize` 0 and shading `soft` (its rank moves
  flat 1.6 → flat 2.6). The three fixtures' counted bins hold **0.9942 /
  0.9916 / 0.9624** of their pictures, so 17 / 55 / 61 mean what the ladder
  thinks they mean and none of them moved. A count of 1–11 covering only a
  sliver is the same inversion in miniature and is left as a stated limit in
  the header: catching it needs the coverage share, which is not one of
  CONTRACTS §4's seven stats.
- **What survived the attack, with the numbers** (`perf/attack-style.js`,
  19/19 PASS and one WARN, the hfEnergy note below): a ×3 nearest-neighbour enlargement of 100 × 60 random blocks
  reads **pixelSize 3** (errors 0.0935 / **0.0000** / 0.1705 / 0.1959 …), a
  ×6 reads **6 and not 2 or 3** even though the error is 0 at all three
  (0.0000 / 0.0000 / 0.0937 / 0.1096 / **0.0000** / 0.1480 — the largest-s
  rule with the depth guard), a ×4 with ±2/255 on every channel still reads
  **4** (0.0046 / 0.1197 / **0.0057** / 0.1986, the grid's error now the
  noise's own, well under `PIXEL_FLOOR` 0.02); the photograph reads **0**
  with no outline (dark share 0.0021), the hatch — 1-px diagonals on a 6-px
  period, every 6 × 6 block's centre pixel on a line — reads **0** and ranks
  `flat`; the cartoon reads **present at weight 0.9** (median dark run 6 px
  at half depth, density 0.057) and ranks **outline-cartoon 1.1, cel 2.0**;
  a clean ×4 grid handed in as key art AND logo leaves `pixelSize` 0 and
  `outline` false while moving `paletteCount` and `saturation`, which is
  §7's opening line exactly; and every one of the ten presets' own prototype
  vectors ranks that preset **first with score 0** (nearest rival 1.7 for
  the `outline-cartoon`/`cel` pair, 6.85 for `pixel`).
- **Open, not fixed here (it is not `style.js`'s):** `hfEnergy` is
  |Δ| ÷ contrast and is not bounded by 1 — `analysis.schema.json` says only
  "number" — but `perf/test-style.js`'s `assertShape` asserts every stat is
  0–1. A mid-grey plate with ±4/255 grain measures **hfEnergy 5.362**
  (contrast 0.0076: the grain survives on the native picture and is averaged
  out of the 512 copy the denominator is read from), so a heavily grained
  low-contrast game would fail that assertion rather than the rule it was
  written for. The vector is unaffected — 5.362 and 0.16 are both "high".

## Phase 2 — verified a second time: the licence claim, and the fixture's mood word (2026-09-07)

- **What:** a second adversarial pass over the fonts and theme halves, run
  against the files as they stand rather than against either builder's or the
  first verifier's summary. Everything the entry below claims was re-measured
  and holds; two things it did not look at did not.
- **Re-run green, nothing changed to make them so:** `test-fonts.js`
  **357/357** (Node + headless Chrome 152 on 4322; 21 FontFaces loaded,
  nothing left the origin, the door never knocked), `test-theme.js`
  **3477/3477** with the three fixtures' css still 833 / 851 / 847 B,
  `attack-theme.js` **162 698/162 698** over 2000 palettes, and
  `perf/shot-theme.js` **12/12** re-rendered the three bench PNGs from the
  same tokens (looked at: pixelfort dusk-navy with a lime accent and a
  readable cream headline; mosslight cream and olive; neonrun near-black
  purple, pale-cyan headline, magenta MOVE — it reads dark).
- **Checked by hand, again and further:** all 19 `.woff2` in `fonts/` begin
  `wOF2`; the 21 `@font-face` rows share one latin `unicode-range`, name
  exactly the 19 files (Fredoka-400 and Orbitron-400 twice), and no file in
  the folder sits outside a row; every `faces`/`preloads`/`stacks` entry of
  every pairing names a file that exists and every stack ends in a generic;
  `stacks('nope')` and `preloads('__proto__')` are RangeErrors, and
  `suggest()` gives three distinct valid ids over 19 styles × dark/light × 8
  saturations (304 calls, including `constructor`, `__proto__`, `toString`,
  `valueOf`). The three OFL URLs answer **200 at 4 479 / 4 388 / 4 426 B**,
  `ofl/specialelite/OFL.txt` is **404**, `apache/specialelite/METADATA.pb`
  says `license: "APACHE2"`. New this pass: the four woff2 were fetched again
  from the CSS2 API with a Chrome UA and are **md5-identical to what
  fonts.gstatic.com serves today**, and the two-weight query really does hand
  ONE url for both weights (asking for one weight gives a smaller static
  instance — 16 076 B for Fredoka, 6 396 B for Orbitron — so the saved files
  are the variable ones the comment says they are).
- **DEFECT FOUND AND FIXED — `fonts/fonts.css` said something untrue about
  the fonts it ships.** The licence block read "the OFL faces carry their
  licence in the woff2's own name table", and that sentence was the reason no
  licence text was saved beside them. It is false: every one of the nineteen
  faces was opened (`name` table read out by inflating each woff2's brotli
  table stream and parsing the records) and every one holds record **0**, the
  copyright line, and record **14**, a URL — `https://scripts.sil.org/OFL`,
  or `http://www.apache.org/licenses/LICENSE-2.0` for Special Elite — and
  **not one holds record 13, the licence text**. A self-hosted font is a
  redistributed copy and OFL 1.1 §2 asks each copy to carry "the above
  copyright notice and this license" (Apache 2.0 §4(a) asks the same, which
  is why `Special-Elite-LICENSE.txt` was already there). Fixed both ways:
  the sentence now says what was measured, and the three OFL faces this phase
  added keep their own upstream text beside them — `Bangers-OFL.txt` (4 479 B,
  md5 `579eddf3…`, CRLF upstream and kept CRLF so the md5 still proves it),
  `Fredoka-OFL.txt` (4 388 B, `21f5400b…`), `Orbitron-OFL.txt` (4 426 B,
  `11406755…`), each byte-for-byte `google/fonts` main. Per family rather
  than one shared text because Orbitron's copyright line reserves the font
  name. Nothing loads these files and no test enumerates the folder;
  `test-fonts.js` is 357/357 after the edit. CONTRACTS §3 and NOTES §D.18
  say so. **Open for the owner:** the EIGHT families the 2026-09-04 block
  brought in (Sora, Public Sans, Space Mono, Kalam, Rye, Pirata One,
  UnifrakturMaguntia, VT323, all OFL by their name records) are in the same
  position and were left alone — they predate this phase.
- **Made visible, not changed — `expected.json`'s `harmony` word.** neonrun's
  says `loud`; the rule reads `calm` (weighted chroma 0.07, accent centroid
  C 0.14, both under CONTRACTS §2's 0.12 / 0.15 — and Phase 3's real
  `stats.saturation`, 0.1051, is under 0.12 too). Nothing asserted it, so the
  disagreement lived only in the CHANGELOG. `test-theme.js` now REPORTS every
  fixture's `harmony` against the mood the rule reads, agreeing or not, and
  still asserts nothing: fitting `LOUD_C` to one fixture would be tuning a
  constant to a wish. Still the open decision for Phase 7 / the owner.
- **Held on my own constructions, not the attack's shapes:** `derive()` with
  no argument, `{}`, `{palette: []}` and `{palette: null}` all give a valid
  theme; `explain()` on a theme round-tripped through JSON (no `why` — the
  CONTRACTS §2 recompute branch, which neither test covered) gives six clean
  lines and `explain(null)`/`explain({})` are `[]`; `tokensOf()` is a copy;
  `Theme.ORDER` writes every one of `lab.css`'s 48 `:root` tokens except the
  fourteen the plan reserves (`--gn-*`, `--st-*`, `--sticky-edge`), plus the
  seven `--sk-*` roles. THE MOOD RULE on 29 hues built here: `fromOklch`
  gamut-clips, so an accent "at C 0.25" only exists on the hues sRGB can hold
  it (43 of 72 five-degree steps cannot — 35° peaks at C 0.229) — on the 29
  that can, a dark plate with `saturation: 0.08` reads **loud** every time,
  fills all three secondaries from the loud fan, and the farthest sits
  **179.4°** from the accent at worst; the same plates with `mood:'calm'`
  given keep calm and stay under 120°; `saturation: 0.13` with a C 0.10
  accent reads loud by the other branch.
- Line endings: everything touched is LF except the three verbatim licence
  texts (Bangers's is CRLF as published); `keep.js`/`tape.js` still CRLF.
  Nothing outside `lab2/test` was written — `lab2/index.html kits.js keep.js
  lab.js tracer.js fonts/fonts.css`, `site/serve.js` and `site/vercel.json`
  still carry their 2026-09-03/04 mtimes; 4321 was never used.

## Phase 4a — the sticker sheet: forty parts, the tooling, and the proof (2026-09-07)

- **What:** the fourth kit sheet, `features/stickers-core.dc.html`, built —
  not drawn — from forty part files in `press/tools/parts/<part>.html`
  (Appendix D, id for id) plus the shared `press/tools/sk-defs.html`. The
  tooling around them: `palette-keys.js` (the linter that holds a part to
  §3.6 — six roles or `none`, no literal colour, the eight layers in order,
  the 128 box, the elements ADDING.md §1 allows), `render-part.js` (draws a
  part at ×4 in three palettes so the agent with the pen can LOOK, and
  writes the contact sheets), `build-sheet.js` (lints, then assembles the
  sheet, its `data-props`, `renderVals()` and `parts/INDEX.md`; it refuses
  to build on a fault and warns on a missing id), `check-sheet.js` (reads
  the built sheet as text and holds it to Appendix D and to the plan's own
  table) and `perf/verify-sheet.js` (boots each of the forty in headless
  Chrome at `#part=<id>` and asks what the page shows).
- **Why:** the sheet is one 221 KB document that `kits.js` rasterises for
  every bench and every game page; one literal colour in one part is a
  sticker that ignores its page's palette, and a part is far easier to keep
  honest as its own file with its own leading comment than as a block in the
  middle of three thousand lines. The tools are the contract's enforcement:
  §3.6 is checked by a linter rather than by care.
- **Measured** (from `site/`, sandbox server on 4322, results in
  `perf/results/parts/`):
  - **the lint pass** — `build-sheet.js` lints all forty through
    `palette-keys.js` before it writes: **0 faults, 6 warnings**, and every
    warning is a layer a part deliberately has not got, named in that
    part's own comment (`frame-polaroid` no highlight — a glint on a paper
    card reads as a folded flap; `circle-mark` and `underline` no highlight
    and no detail — each is one open stroke; `clip` no detail). Written:
    **40 of 40 parts, 220.9 KB, 3326 lines, LF**.
  - **the render pass** — `render-part.js all`: eighty PNGs (Knoll on bench
    paper, neon on near-black) and two contact sheets. **No part's ink
    leaves the 128 box** in either palette: the extremes over all eighty
    renders are 2.3 and 127.3, both `burst-round`. Thirteen of the forty
    come within 3 of an edge (`burst` 2.5..127.0, `banner`, `gear`, the
    three tags, …), so their halo spills into the 3 units the contract
    allows it and no further. The widest are `burst-round` 98 % × 98 % and
    `burst` 97 % × 97 %; the thinnest is `underline` at 96 % × 29 % (a
    squiggle is a line) and the narrowest `clip` at 58 % wide (a wire).
    Both contact sheets were looked at — forty parts at ×1.5, 192 px each:
    they read as one die-cut set, and the neon sheet is the test that no
    part treats `{{ skPaper }}` as "white". None does.
  - **the sheet boots in Design Canvas** — `perf/verify-sheet.js`:
    **361/361 PASS over the forty**, nine checks a part (support.js booted
    it; zero console errors, page errors and 4xx/5xx bar the favicon; no
    `{{` where the browser draws; exactly one `<svg>` that is not
    `[data-defs]`; its layers are the part file's, in order and element for
    element; a Knoll default among its fills; the shared defs under the
    screen; the 128 box; the root's drop-shadow and its sway or bob), the
    first eight shot to `sheet-<id>.png` (`sheet-burst.png` and
    `sheet-banner.png` looked at: the part stands in the middle of the
    screen in Knoll colours, drawn 130.36 × 128 css px — 128 tall and a
    little over 128 wide because the shot catches the sway mid-skew, and
    `sk-sway` is `skewX(±2deg)`, which widens a 128 box by up to 4.5 and
    never changes its height).
  - **the sheet reads as Appendix D** — `press/tools/check-sheet.js`:
    **28/28 PASS**. The `data-props` unescapes and parses (1743 chars);
    forty options, unique, in the plan's own order (read off
    `PRESS-TABLE-PLAN.md`, not off `build-sheet.js`'s copy, so a drift
    between the two is caught); forty tag lists, 76 tags, part for part as
    the plan has them, the ten motif words among them; forty `<sc-if>`
    flags, each the camel of its option, none twice; every block lifted back
    out of the sheet re-lints clean as its part (0 faults); every `{{ name }}`
    is one of the nine values or a flag and all nine are used; `renderVals()`
    carries the nine Knoll defaults; the screen's first element is the one
    `<svg data-defs>` and it holds the nine ids the style pass names.
- **The judge rounds, and what they caught.** Two rounds of
  `verify-sheet.js` over all forty, and a look at the PNGs:
  - **Round 1: 273/361.** Every part failed twice, and both failures were
    real findings rather than broken drawings. **(a) Twenty console errors
    per page load**: `<rect> attribute rx: Expected length,
    "{{ skRadius }}"` — one per radius on the sheet. The sheet's markup is
    authored in the document, so the BROWSER parses it before support.js
    fills a single interpolation, and `rx` is a length. Fixed with the
    encoding `viewBox` already takes: six part files now write
    `sc-camel-rx="{{ skRadius }}"` (20 rects), `palette-keys.js` refuses a
    raw `rx`/`ry` on a rect, and support.js, `kits.js`'s `decodeAttrs` and
    `render-part.js` each turn it back into `rx` before anything draws —
    re-rendered and looked at, the radii still land (`badge-round`'s image
    slot, `sword`'s grip, `frame-polaroid`'s card at neon's radius 10).
    Round 2 measured **zero** console errors on all forty. The bench never
    had them — `kits.js` fills the string before it parses — and a probe of
    the sandbox bench before and after the change printed the same single
    line either way, the 404 from the door the probe forces shut.
    CONTRACTS §8 changed to say so; `NOTES.md` D.16 has the reasoning.
    **(b) `no {{ left in document.body` was the wrong reading**: 11 on every
    part, and all eleven are in COMMENTS — ten in the sheet's own note at
    the top of `<body>`, which names the roles it explains, and one in the
    dc-script's. Zero were in an attribute or a text node. The check now
    walks the DOM, fails only on the drawn ones and prints all three counts.
  - **Round 1 also caught the text-slot parts** reporting one element too
    many in their `text` layer. That is support.js rendering a text-content
    interpolation as `<span class="sc-interp">` — and, measured with
    `getBBox()`, that span draws NOTHING inside an `<svg>`: React makes it
    in the SVG namespace, so `banner`'s word is 0 × 0 there against
    72 × 22 as a plain text node. The eight text parts show their words on a
    bench, where `kits.js` fills the string before it parses, and never in
    the canvas view. Nothing was changed for it (the words come from a
    section's `data-text`, and `skText` is `''` by CONTRACTS §7); the
    verifier counts the span out and says why, `NOTES.md` D.17 records it.
  - **Round 2: 361/361, and `check-sheet.js` 28/28.**
- **Open for the rest of Phase 4:** `kits.js` has no `extractOnly` yet and
  the sandbox bench carries no sticker sections, so the bench half of the
  decode (`sc-camel-rx` → `rx` through `decodeAttrs`, kits.js line 287) is
  proven by reading that line and by `render-part.js`'s identical rule, not
  by a bench that draws one. The first sticker placed on the sandbox bench
  should be a part with a radius.

## Phase 2 — verified: the fonts and the theme, the adversarial pass (2026-09-07)

- **What:** an independent reading and re-running of both halves of Phase 2
  (`fonts/`, `press/fonts.js`, `press/theme.js`, their two tests and the
  three screenshots), set to refute them, plus a new adversary,
  `press/tools/attack-theme.js` (2000 seeded palettes through
  `Theme.derive`; results under `perf/results/attack-theme/`).
- **The fonts, checked by hand, not from the builder's summary:** every one
  of the nineteen `.woff2` in `fonts/` begins `wOF2` (the four new ones at
  23 528 / 29 732 / 11 800 / 53 296 B); `fonts.css` has 21 `@font-face` rows
  over one latin `unicode-range`, and the six appended rows point at exactly
  the four new files — Bangers 400 → Bangers-400, Fredoka 400 AND 600 →
  Fredoka-400, Orbitron 400 AND 700 → Orbitron-400, Special Elite 400 →
  Special-Elite-400 — no file in the folder is outside a row and no row
  names a missing file; every `faces` entry of every pairing exists and is
  declared; every declared family is worn and every worn family declared.
  The licence URLs were fetched again: the three OFL.txt answer 200 at
  4 479 / 4 388 / 4 426 B; `ofl/specialelite/OFL.txt` is 404 and
  `apache/specialelite/METADATA.pb` says `license: "APACHE2"` — so the
  builder's flag stands (the plan asked for OFL; Special Elite is Apache
  2.0), and `fonts/Special-Elite-LICENSE.txt` is md5-identical to the
  upstream LICENSE.txt (`3b83ef96…`). `perf/results/fonts/pairings.png`
  looked at: Fredoka 600 and Orbitron 700 are visibly heavier than their
  400 beside them, so the single variable file does carry both rows.
- **Fixed, `press/fonts.js`:** `Fonts.suggest({style})` read `RULES[o.style]`
  off a plain object, so a style named `constructor`, `__proto__`,
  `toString` or `hasOwnProperty` got a function off `Object.prototype` and
  `.slice()` threw a TypeError, where the header (and CONTRACTS §3's
  "always three valid ids") promise `flat`. It reads through
  `hasOwnProperty` now; `stacks()` already did. One regression check
  added to `test-fonts.js` (356 → **357/357**, node + headless Chrome on
  4322, nothing left the origin, the door never knocked).
- **The theme, the plan's table (§6 step 3) read against the code row by
  row** and then held numerically on all 2000 by the attack: paper in its
  band at C ≤ 0.03 on the heaviest hued entry; paper-2 / card ∓ 0.03 / ± 0.01
  L, reversed on a dark page; bench-bg −0.035; ink nearest the complement at
  L 0.22 / 0.92, C ≤ 0.04; mute / mute-2 / line at 55 / 75 / 88 %; the accent
  named in explain() is the highest-C entry carrying ≥ 2 % (ties by weight
  then hex); pink-2 + 0.08 L; pink-soft L 0.90 / 0.30 C 0.06; field the
  paper and tint / tint-2 / chip at 4 / 3 / 2 % accent (`Palette.mix`,
  exact); hard-edge the ink at L 0.10 (light) / the paper at L 0.06 (dark);
  the four pads on the accent + 0 / 90 / 180 / 270 at L ≥ 0.88 light /
  ≤ 0.35 dark; the pill tokens; the seven `--sk-*` roles; the halo against
  `FLOORS.HALO_C`. The floors are READ from `Theme.FLOORS`, not retyped.
- **`attack-theme.js` — 162 698 / 162 698 checks over 2000 palettes (1.5 s),**
  nineteen shapes in rotation: random 1–8; C = 0 only; one hex up to eight
  times; weights all 0; weights summing to 37 / 1e-6 / 1e9 / 0.001; entries
  with h (and L, C) NaN beside a good hex; #000000 and #ffffff as entries;
  two entries; eight entries within 5° of hue (all three secondaries then
  come from the harmony); paletteSize 4 with every entry under C 0.01;
  near-black; near-white; six at C 0.4; one entry; random with every option
  set; garbage options (hex uppercase / no hash / `#rgb` / `#ggg` / `red` /
  null / 12, weights as strings / negative / NaN / Infinity / objects,
  entries that are null / strings / bare hexes, the palette itself a string
  or a number, paletteSize `'8'` / 3 / −1 / NaN, fonts 42 / {} / 'nope', mood
  'LOUD' / 0 / 'both', saturation NaN / '' / −1 / Infinity). On every one:
  no throw, twice, css bytes-equal; the input not mutated; the entries
  SHUFFLED give the same css; every floor in `Theme.FLOORS` holds; every
  colour a six-digit hex; `--sk-halo` '0' / '1' and true to HALO_C; a second
  Node process derives the same css for the first 120. THE MOOD RULE
  (CONTRACTS §2) on three built shapes × 105 seeds: a dark plate (85 %) with
  saturation 0.08 and an accent at C 0.25 reads **loud** and, nothing else
  in the palette qualifying, fills all three secondaries from +180 / +150 /
  −150 — at least one ≥ 120° from the accent every time; the same palette
  with `mood: 'calm'` keeps calm and the fan stays under 120°; saturation
  0.13 with a C 0.10 accent reads loud by the other branch. On all 2000 the
  mood explain() names equals the rule recomputed from the input.
- **One reading learned, not a defect:** the 40° a palette secondary must
  keep from the accent is measured from the accent TOKEN's hue (the pushed,
  hex-rounded `--pink`), not the raw entry's — seed 5756 (near-white, accent
  C 0.04 pushed 31 steps) has an entry 39.2° from the entry and 40.1° from
  the token. The plan says "from the accent" and the token is the accent;
  the attack measures the same way and says so in its header.
- **Fixed, one comment, `press/theme.js`:** the inline `GREY_C` sentence still
  quoted the pre-recompute 6.8° per 8-bit step; the header, the test's own
  table (7.0° at C 0.02, 172 colours in the band) and now the comment agree.
  No code moved: `test-theme.js` **3477/3477** before and after, the three
  fixtures' css 833 / 851 / 847 B byte-for-byte the builder's.
- **Looked at** `perf/results/theme-*/bench.png`: pixelfort — dusk-navy
  paper, cream headline, the lime accent on MOVE, the links and the swatch,
  the subtitle in --mute dim but read; mosslight — cream paper, black ink,
  the olive accent on the dock; neonrun — near-black purple, pale-cyan
  headline, magenta MOVE / swatch / links: it reads dark. Nothing plainly
  wrong; the builder's two open readings (pixelfort dark at mean L 0.44,
  neonrun calm by the rule at accent C 0.14) stand as reported, for Phase
  3's real `stats.saturation` and the owner to settle.
- Line endings: every file touched is LF (keep.js / tape.js still CRLF);
  nothing outside `lab2/test` was written; 4321 untouched.

## Phase 5, step 3 — verified: keep.js and the page scoping, the adversarial pass (2026-09-07)

- **What:** an independent re-reading and re-running of the pulled-forward
  step (`keep.js`, `lab.js`, `frames.js`, `tracer.js`, `perf/verify-keep.js`)
  trying to refute five claims: the CRLF, the door derivation, the verifier
  under a fresh server twice, the page scoping, and the pill. Nothing was
  edited; the sandbox server on 4322 was restarted twice (the verifier
  deletes the once-per-process `keep-bak`, so a second run on one process
  cannot pass its two keep-bak checks) and left running, PID 2072.
- **Measured:**
  - `keep.js`: 331 CRLF pairs, 0 bare LF, 0 bare CR, no BOM (counted by
    byte); `tape.js` byte-identical to `lab2/tape.js`. `diff lab2/keep.js
    lab2/test/keep.js` is the seven hunks the entry below names and nothing
    else: two header paragraphs, the door block + `skey`, `palette`/`text`/
    `rot` in `look()` twice, the array `stamp()`, the `removeItem` line.
  - The derivation: the block lifted out of `keep.js` and the four lines of
    CONTRACTS §0 are the same tokens (only `const`, the local names and the
    semicolons differ; both regex literals verbatim) and agree on 24
    pathnames in Node: `/lab2/` `/lab2/index.html` `/` → `/_lab2/default`;
    `/lab2/games/abc/` → `/_lab2/games/abc`; `/lab2/test/games/abc/index.html`
    → `/_lab2/test/games/abc`; `/lab2/test/press/` → `/_lab2/test/default`;
    `/lab2/press/` → `/_lab2/default`. A bad slug, `/lab2/games/ABC/`, falls
    to the default branch as `/_lab2/games/ABC/default` — a door nowhere
    (4321 answers 404 to it, 4322 answers 400 to its `/test` twin, both read
    by GET), so keep.js goes quiet; that is the safe fall, since a fall to
    the bare `/_lab2/default` from a sandbox path is the hazard this step
    closed. On Windows `games/ABC/` serves `games/abc/index.html`, so a
    page opened with the wrong case simply does not autosave.
  - `node lab2/test/perf/verify-keep.js` twice, the server killed and
    restarted before each (PID 8324 → 23280 → 2072, the door answering
    within one poll): **44/44 PASS both runs**; `index.html` md5
    `1f0b4fc51b9639fde229361dfefa3d56` before, between and after; no
    `index.html.keep-bak` or `.tmp` left either time; the server log shows
    six saves a run and nothing else. Timer save landed at 26.8 s.
  - Scoping, in one browser context so the two pages share one
    localStorage (door blocked, 32/32 checks, zero errors, never a POST):
    with `data-lab-page=probe` stamped in by `page.route`, a mouse stroke
    with the draw tool, a note typed in the text tool (`PROBE NOTE`, Enter)
    and `camTo(0.5, 123, 456)` left 8 keys, every one `knoll-lab2:probe:…`
    (`cam copies flatfile gif gone tape vol wall`); a reload brought back
    both items, the note drawn, and the camera at 0.5 / 123 / 456. The bare
    page in the same context saw 0 wall items and the opening camera
    (0.7219), drew its own stroke + `BARE NOTE` under bare keys and left
    the probe's 8 keys and wall store untouched; the probe page then saw
    only `PROBE NOTE` at 0.5 and the bare page only `BARE NOTE` at 0.7 —
    isolation both ways. A fresh context without the attribute: 0 items.
  - The literals: `grep -rn "knoll-lab2:"` over the sandbox's js/html
    finds the NS definition (`lab.js:65`), three guarded fallbacks
    (`frames.js:74`, `keep.js:87`, `tracer.js:516`), the Phase 0 report-only
    probe `perf/verify-bench.js:129`, the verifier's own assertions, and
    comments; `gif.js:105` `knoll-lab2-…` is a request name, not a key.
    Every `localStorage` call in the folder goes through `NS`/`KEY`/`ZKEY`/
    `CAM_KEY`/`storeKey`; `features/`, `press/` and `kits.js` make none.
    `lab.js` (324) loads before `frames.js` (326) in `index.html`, which
    `frames.js`'s load-time `KEY` needs — the game template must keep that
    order.
  - The pill: on 4322 with the real GET knock (the POSTs 404'd by
    `page.route`) `Keep.live` true, the pill wore `autosave on`, the button
    shown — AND ONE THING LEARNED: closing that context fired keep.js's
    pagehide `keepalive` POST (live, stamp ≠ the never-settled `last`), which
    Playwright's route does not intercept during teardown; the server wrote
    `index.html` at 12:25:07 (a seventh `saved` line on the process, the
    boot-save shape exactly: `data-home-z` 0–8 on the nine sections, nothing
    else) a beat after the probe's own md5 check had passed. Put back from
    `perf/results/keep/index.before.html` (md5 `1f0b4fc5…` again) and the
    server restarted so the next write takes a fresh `keep-bak`. The rule
    for harnesses: a door is blocked only when the GET is blocked too —
    every builder harness does that, so Keep never goes live and the
    pagehide guard (`if (!live || !on) return`) holds; allowing the knock
    and blocking the POSTs is not a block. With the door blocked the pill and
    button stay `hidden` and `Keep.live` is false after one GET. On the
    live bench `http://localhost:4321/lab2/` (door blocked, every
    off-localhost request aborted, read-only) the lifted block derives
    `/_lab2/default`, one GET knock, pill hidden, no `Lab.storeKey`, and
    the served `keep.js` still reads `const DOOR = '/_lab2/default';`.
    Live `lab2/keep.js lab.js frames.js tracer.js kits.js index.html`,
    `site/serve.js`, `site/vercel.json` carry mtimes of 2026-09-03/04.
- **Verdict:** holds. No defect found; nothing changed. Two notes, not
  fixes: the diff carries two header-comment hunks beside the code hunks
  (the house rule wants them); and `verify-keep.js` needs a fresh server
  process per run, as its own message says.

## Phase 1 — verified: the palette and the tracer, the adversarial pass (2026-09-07)

- **What:** an independent reading and re-running of Phase 1 (`press/palette.js`,
  the sandbox `tracer.js`, `press/tools/test-palette.js`, `perf/golden-tracer.js`,
  `perf/verify-tracer.js`), set to refute it. Nine checks were ADDED to
  `test-palette.js` (42 → **51/51**), each with its bound's sentence in the
  test's header: the six bench tokens of `lab.css`'s `:root` (read from the
  sheet at test time) through a SECOND road — sRGB → XYZ (IEC 61966-2-1's D65
  matrix) → LMS (Ottosson's XYZ→LMS matrix) → OKLab — agree with the module's
  direct sRGB→LMS road to **8.4e-5 worst** (`--paper`'s b; the bound is 1e-3,
  twelve times that); `--pink #c93b82` reads L 0.581, **C 0.1890, h 354.03°**;
  `fromOklch(0.5, 0.4, 140)` → `#217700`, L 0.4986, C 0.1606, h 140.03°
  (hue within 3°, L within 0.03); `contrast(#777777, #ffffff)` 4.4781; a 1 × 1
  picture is one entry of weight 1 (k 1, and k 8 with `ignoreEdges`); a 1 × 1
  transparent picture is `[]` at alpha 0 and at alpha 15, and counts at 16;
  a 2 × 2 of four colours asked for k 50 gives the four at 0.25 without
  throwing; k 0 / −3 / NaN / undefined floor to one cluster as the tracer's
  `K = max(1, min(K, n))` does.
- **Read, line by line:** `diff lab2/tracer.js lab2/test/tracer.js` is the
  header sentence (39), the SAMPLE_CAP comment (78), the quantiser block
  (283–331 → a four-line comment), the `window.Palette` guard and the two
  calls in `vectorize` (474–479), the null branch of `runTrace` (514), and
  one hunk that is Phase 5's (`Lab.storeKey('flatfile')` in `file()`, 552,
  declared in that phase's entry) — nothing else: `MAX_DIM` 640, `ALPHA_T`
  16, `dpTol = smooth × 0.55`, `minArea = 1.5 + smooth² × 1.2`, the collinear
  removal and Douglas-Peucker are line-for-line the same on both sides, and
  `Math.random` appears nowhere in the sandbox tracer and only in the two
  quantiser lines of the live one. `Palette.kmeans` against the live
  `kMeansPalette`: the same first seed `samples[(rand() × n) | 0]`, the same
  k-means++ pick (`r -= dist2[i]; if (r <= 0)`, `pick = n − 1` as the
  fallback), the same 8 rounds, the same strict `<` assignment, the same
  empty-cluster rule (`sums[k][3] > 0`, else the centroid stands), the same
  `max(0, min(255, round))` at the end; `sample` walks the same row-major
  order with the same stride. The only deviation is the declared one,
  `Math.random()` → `rand()`, resolved at call time.
- **Run** (all from `site/`, 4322 up, 4321 read only with the door routed to
  404 on both sides — the live `index.html`'s mtime is still 2026-09-04):
  `verify-tracer.js` **12/12** twice (before and after the fix below);
  `golden-tracer.js` **3/3 three times** — the sandbox `d` is byte-identical
  run to run to run AND to the builder's summary, and to the live bench's
  each time: pixelfort 395 paths, 22719 B, sha `11a6e2fe9f95`; mosslight 209 paths, 33973 B, sha `7681fda4ed90`; neonrun 139 paths, 6907 B, sha `f944e4b5abce`. The
  quantiser drew exactly 6 numbers on each side in every run; the live
  bench's `trystero-nostr.js` drew 256 / 64 / 64, then 0 / 0 / 0, then
  320 / 64 / 0 strays (pixelfort / mosslight / neonrun) at moments of its
  own, and none of them reached the seeded stream — which is what the
  harness's per-file attribution is for. Trace times live/sandbox over the
  three runs: pixelfort 354/259, 375/263, 430/272; mosslight 571/438, 442/388, 426/384; neonrun 420/333, 463/321, 406/356 ms. Zero page
  errors in every context.
- **Fixed (one header sentence, `press/palette.js`):** the CLIP_STEPS sentence
  said the clipped colour lands within "0.4 / 2^20 ≈ 4e-7 of the gamut edge
  (sRGB chroma tops out near 0.4, blue's)". Measured over the cube's six
  faces (393 216 colours), sRGB's widest OKLCH chroma is **magenta's 0.322**
  (`#ff00ff`, L 0.70); blue's is 0.313, red's 0.258. And the bisection halves
  a FRACTION of the asked chroma, so the precision is C / 2^20 of whatever C
  was asked, not of 0.4. The sentence now says both; the constant did not
  move and the code did not change (the post-fix runs above are the proof).
- **Found, not changed:** `Palette.kmeans([], k)` throws (`undefined.slice`),
  exactly as the live `kMeansPalette` does on an empty sample — both callers
  (`quantize`, the tracer's `vectorize`) guard it with `if (!samples.length)`,
  and the verbatim rule wins over a guard the original never had. The existing
  `contrast(#777777, #ffffff)` check holds ±0.005, tighter than the ±0.02
  asked for; both stand. `clampL(hex, NaN, NaN)` and `fromOklch` at L 0.01
  (`#000001`, the hue lost to the 8-bit floor) give valid hexes for nonsense
  asks and are a caller's bug, not the module's.

## Phase 2 — `press/theme.js`: palette → the token sheet (2026-09-07)

- **What:** `press/theme.js` (`window.Theme`: `derive`, `tokensOf`,
  `explain`, and the frozen `FLOORS`, `ORDER`, `SIZES` for the tests) —
  the plan's derivation table (§6 step 3) row by row in OKLCH over
  `window.Palette`, every contrast floor a named constant with its
  sentence (ink/paper 7.0; ink-2, ink-3 4.5; mute 3.0, mute-2 2.0; accent
  3.0 on paper and 1.5 on ink; blue/green/amber 3.0; pink-2 2.5; the pads
  4.5 under the ink; sk-highlight/sk-shadow 1.5; `--sk-halo` '1' under 2.2
  primary-on-bench-bg), enforced by walking a colour's L away from the
  paper (or the ink) in 0.01 steps until the floor holds — chroma and hue
  kept, so the colour stays the game's, only deeper — capped at the whole
  of L, with a neutral (ink mixed half way to paper, pushed to the floor)
  and an explain() line when a wall is hit; the mood rule of CONTRACTS §2;
  `paletteSize` 4/8/16 snapping every hued `--sk-*` to N hues 360/N apart
  anchored on the accent's hue at the role's own L and C (so `--sk-primary`
  is always on the ramp and the sheet's light/dark hierarchy survives; the
  highlight/shadow floor and the halo are judged after the snap); the
  fonts from `Fonts.stacks(id)` (an unknown id → `clean`, named in
  explain(); no `window.Fonts` → lab.css's three stacks verbatim); `css` as
  `:root{` + `name:value;` in the table's order + `}` on one line. Tooling:
  `press/tools/lib/png.js` (a no-dependency PNG decoder — 8-bit, colour
  types 0/2/4/6, non-interlaced, the five filters, CRCs checked, and a
  `filters` row count on the result; it refuses 16-bit, PLTE, tRNS and
  Adam7 by name), `press/tools/lib/fixture-theme.js` (the one
  fixture → palette → theme pipeline the test and the screenshot share:
  hero else key art, `quantize(k 8, rng(7), minWeight 0.01, ignoreEdges)`,
  `describe`, saturation as the weight-averaged C of the palette — a
  stand-in for `stats.saturation` until Phase 3 measures it),
  `press/tools/test-theme.js`, `perf/shot-theme.js`.
- **Why:** plan §6 — a page's tokens must be deterministic (a page rebuilt
  from its `game.json` is the same page) and readable (no text/paper pair
  under its floor, whatever the key art). The decoder exists so the theme
  test runs without a browser; the shared pipeline so what the test holds
  to a floor is what the screenshot shows.
- **A contract line added** (CONTRACTS §2): `Theme.tokensOf(theme)` and
  `Theme.explain(theme)` (the task asked for both; the Press Table's tweak
  panel reads the second) and the three frozen constants. The earlier,
  cut-off attempt at this phase had written all five files; they were read,
  kept where right, and finished: the header's measured hue-swing figures
  were RECOMPUTED (they had been asserted a little low: 7.0° per 8-bit step
  at C 0.02, 4.7° at 0.03, 2.2° at 0.06 against the 6.8/4.4/2.1 written, and
  the test's ramp tolerance of 0.14 / C sat under the measurement at C 0.03
  — it is 0.15 / C now and the test measures and asserts it each run), the
  sticky pads' white/black fallback got its sentence, `png.js` got the
  filter count, the test got the decoder proofs, and `shot-theme.js` had
  been counting the blocked door's own "Failed to load resource … 404" as
  a console error (every other harness in the folder sets that one line
  aside; it does now, and everything else still counts).
- **Measured:**
  - `node lab2/test/press/tools/test-theme.js` — **3477/3477 PASS**, no
    browser (`perf/results/theme/summary.json`). The three fixtures, then
    paletteSize 4/8/16 on each (`--sk-primary` unmoved, every hued `--sk-*`
    within the measured hue rounding of a ramp step, floors still holding),
    css byte-identical across two derivations and a second Node process
    (833 / 851 / 847 B); 200 seeded palettes (seeds 1000–1199, eight shapes
    × 25: random, one colour, all greys, all near-black, all near-white, two
    at L 0.5, six at C 0.4, random with random paletteSize/mood/pairing
    including a bad size and an unknown pairing) — derive() never threw and
    all 3180 checks over them pass; an empty palette, null input, one entry
    with no weight, a bad hex among good, `#rgb` short hexes all derive
    valid themes. `png.js`: twenty forced-filter files (5 filters × 4
    colour types, 37 × 23 seeded noise) decode back to the byte;
    make-fixtures' own adaptive `encodePNG` round-trips RGB (rows per filter
    4/6/6/6/1) and RGBA (5/3/8/4/3); a flipped IDAT byte fails the CRC; the
    four refusals are by name. The fixtures' heroes use filters 1/2/4
    (pixelfort 0/11/544/0/85), 1/2 (mosslight 0/1/899/0/0) and 1/2/3/4
    (neonrun 0/88/281/123/408) — filter 0 never, which is why the forced
    files exist.
  - Hue swing per 8-bit step (20 000 colours from `rng(11)`, L 0.2–0.9,
    every channel ±1): C 0.005 → 35.5°, 0.01 → 14.3°, 0.02 → 7.0°,
    0.03 → 4.7°, 0.06 → 2.2°, 0.15 → 0.8°, 0.2 → 0.5°. GREY_C 0.02 stands.
    knoll's own sheet, for the floors' sentences: ink/paper 14.80,
    pink/paper 4.45, pink/ink 3.32; paper C 0.004, ink 0.018, pink-soft
    0.049.
  - The fixtures (hero else key art, weight-averaged C as saturation):

    | | pixelfort (`keyart-portrait`, 8 colours, sat 0.07) | mosslight (`hero`, 8, 0.07) | neonrun (`hero`, 7, 0.09) |
    |---|---|---|---|
    | dark (mean L) | **true** (0.44) — expected.json silent, REPORTED | false (0.63) ✓ | true (0.26) ✓ |
    | `--paper` | `#121524` (276° from `#1f2340`, 33 %) | `#ededd6` (106°) | `#161323` (292°) |
    | `--ink` | `#f7e1c9` (69°, from the sand; 14.3 on paper) | `#1c1c05` (14.5) | `#c7ecf4` (211°, the cyan; 14.5) |
    | `--pink` (accent) | `#9cc754` (from `#9fca57` C 0.15, 13 %; pushed 1 for 1.5 on ink) | `#888852` (from `#a0a06a` C 0.07; pushed 8 to 3.1 on paper) | `#944689` (from `#62155a` C 0.14, 14 %; pushed 16 to 3.0) |
    | mood | loud (accent C 0.15) | calm | **calm** (sat 0.09, accent C 0.14) |
    | `--blue` `--green` `--amber` | `#daa971` `#6b5c8f` `#ce9bff` (two from the palette, +180° filled) | `#6e8f63` `#9d7f4f` `#54937c` (all three from the calm fan) | `#6959a1` `#197c9d` `#a44061` (two from the palette, +30° filled) |
    | `--sk-highlight` / `--sk-shadow` / halo | `#d1f69c` / `#657d40` / 0 (9.8) | `#b5b68a` / `#48482b` / 0 (2.8) | `#bc7bb1` / `#441b3e` / 0 (3.2) |
    | fonts | pixel | hand | scifi |

  - `node lab2/test/perf/shot-theme.js` — **12/12 PASS**, headed Chrome 152 at
    1600 × 1000 on 4322, door blocked (one knock on `/_lab2/test/default`,
    404, never a POST), the theme's css added after lab.css, 800 ms, zero
    page or console errors; `perf/results/theme-<fixture>/bench.png`,
    `theme.css`, `summary.json`. **Looked at:** pixelfort is a dusk-navy
    bench with cream ink and the grass-lime on the dock and the links, in
    VT323 — the key art's dusk, read as a dark page (mean L 0.44); mosslight
    is olive-on-cream, the dock's tool in moss, Kalam in the caption — more
    khaki than leaf-green because the plate's every centroid sits at hue
    103–111° and C 0.06–0.07, which is what the weave is; neonrun is
    near-black purple with a pale-cyan headline and a magenta swatch and
    MOVE button in Orbitron. None is plainly wrong, so the table's rules
    were not touched. Two things to know, not fixes: neonrun's accent is
    the centroid's chroma (0.14 — a neon line averaged with the dark plate
    around it; Phase 0's 0.25 was the lines' own pixels), so it is a dusty
    magenta rather than a neon one, and by CONTRACTS §2's rule its mood is
    calm (0.09 < 0.12 and 0.14 < 0.15) though its expected.json says
    `harmony: loud` — the vision call's mood hint (Phase 7) or Phase 3's
    real `stats.saturation` is where that is decided, and the plan's table
    has no chroma boost, so none was invented.
- **Readings the plan's table left open**, each a named constant in the
  header: the "dominant hue" is the heaviest entry with C ≥ GREY_C 0.02
  (none → a true grey paper); the ink is the hued entry nearest the paper's
  complement (none → the complement itself, grey); the accent ties break by
  weight then hex; the secondaries are drawn from the same ≥ 2 % pool as
  the accent; a harmony fill has at least HARMONY_C 0.06 chroma (knoll's
  `--pink-soft`); the calm fan is +30°, −30°, +60°; `--bench-bg` is paper
  −0.035 L on both pages (the plan does not reverse it); `--field` is the
  paper (0 % accent, as the table says, not lab.css's `#fff`); HALO_C 2.2
  is a first guess for Phase 4's probe to move.
- **Open for Phase 5/7:** pixelfort reads as a dark page — its expected.json
  should say whether that is wanted; `--sticky-edge`, `--gn-*`, `--st-*`
  are left alone as the plan says.

## Phase 3 — `press/style.js`: image statistics → style vector → preset ranking (2026-09-07)

- **What:** `press/style.js` (`window.Style`, CONTRACTS §4 exactly, plus
  `inspect` and a `detail` argument on `measure` for the harness): seven
  measurements — the pixel grid, the outline and its weight, the palette
  count, saturation and contrast, the texture and the edge density —
  read on the NATIVE picture where the pixels matter (the grid, the
  texture, the run length) and on a plain-arithmetic area-averaged 512
  copy for the rest (§4's split); `vector` (Appendix B), `PRESETS`
  (Appendix C verbatim), `rank` (the weights as the build order words
  them: pixel 3.0 on `|a − b| > 0` with the `pixel` preset's grid the
  measured one, lineShow 2.0, shading 1.5, finish 1.0, texture 1.0, the
  rest `|diff|` with paletteSize scaled by 16), `forPreset`.
  `press/tools/style-harness.html` (a bare page: palette, fonts, theme,
  style; `window.runStyle({screenshots, keyart, logos, hints})` decodes
  data URLs through an `<img>`, derives `dark` the way the theme tests do
  — Theme.derive on the first key art's k 8 / rng 7 / minWeight 0.01 /
  ignoreEdges palette — and returns stats, vector, rank, dark, palette,
  every picture's `inspect` and measure's game-level `detail`).
  `perf/test-style.js` (headless Chrome on 4322, two contexts, the door
  route blocked and counted, every request off the harness's five files
  a failure). Goldens `press/fixtures/<name>/stats.json` ({fixture, stats,
  vector, rank, hints} with every key sorted). The three `expected.json`
  files re-written: `hfEnergy 'high'` → `{min: 0.1}`, `saturation 'high'`
  → `{min: 0.065}`, `weight 'thin'` → `{max: 0.3}`, `paletteCount {max:
  23}` → `{min: 16, max: 23}`, `_from` kept, `_measured` added with the
  numbers and the date. (`tools/make-fixtures.js` still writes the word
  form; re-running it would put the words back and the test would fail
  loudly on `'high'` against a number — a tripwire, left as one.)
- **Why:** plan §7 — the things a vision model is bad at estimating,
  measured deterministically so a page rebuilt from its `game.json` is the
  same page; CONTRACTS §4 for the native-vs-512 split (Phase 0's 3.2-px
  finding) and the largest-`s` rule.
- **Where the plan was wrong, measured (also NOTES §D.14–15):**
  - §7 step 1 says a non-grid picture "stays above 6 % everywhere". It
    does not: mosslight's shrink-and-re-enlarge error runs 0.0052–0.0115
    across s = 2…16, neonrun's 0.0099–0.045, a plain gradient's
    0.0020–0.0048 — all under the 2 % floor, with shallow dips. The floor
    alone read mosslight as a 16-px grid, neonrun as 2 and the gradient
    as 11. A size now needs a DEEP minimum (`PIXEL_DIP` 0.5: the error
    under half of both neighbours'; s = 2 is tested on its upper side
    only, its lower neighbour being the identity). A grid's ratio is 0
    (pixelfort: 0 against 0.014–0.026); the deepest dip any soft plate
    made was 0.80 (the gradient at s = 3), so a half is 1.6 × clear.
  - §7 step 2's "dark-pixel runs" measures the GAPS on a dark plate —
    neonrun's dark runs have a median of 11–14 px (weight 0.9). A run is
    a run of INK (the dark class on a light plate, the bright class on a
    dark one, the plate being the pooled median luma of the screenshots
    against 0.25 — pooled because pixelfort's night scene alone, median
    0.141, would flip to bright ink and read 8-px runs), and its width is
    the full width at half depth, so a glow does not count as the line:
    neonrun's bright runs are 2–3 px whole and 2 px at half depth (the
    1.2-px core over two pixels) → 0.3; pixelfort's black 4-px outlines
    are 4 either way → 0.6.
  - The thinnest line in the file, said in the header: pixelfort's
    strong-edge dark share is 0.459 against the plan's 0.45 (geometry: a
    black line puts one strong pixel each side of each of its two edges,
    so half are dark). Left at the plan's number, margin recorded.
- **Measured** (`perf/results/style/summary.json`, **90/90 PASS**, two
  passes × three fixtures + the adversarial plates; 1.5 / 1.9 / 2.4 s a
  fixture headless; zero page or console errors; zero knocks on
  `/_lab2/`; the two contexts' goldens byte-identical, 736 / 746 / 741
  bytes; the second run against the standing goldens unchanged):

    | stat | pixelfort | mosslight | neonrun |
    |---|---|---|---|
    | pixelSize | **4** (4/4/4/4 a shot) | 0 | 0 |
    | outline.present · weight | true · **0.6** (dark 0.4589, density 0.1521; 4-px runs) | false · 0 (dark 0.000, density 0.0000) | true · **0.3** (dark 0.7075, density 0.1496; 2-px runs) |
    | paletteCount | 17 (20/21/21/17 · 17 · 6) | 55 | 61 |
    | saturation | 0.0760 | 0.0652 | 0.1051 (plates 0.084, logo 0.205) |
    | contrast | 0.2048 | 0.0627 | 0.1161 |
    | hfEnergy | 0.0000 | **0.1601** (0.129–0.218 a plate) | 0.0058 |
    | edgeDensity | 0.1521 | 0.0000 | 0.1496 |
    | dark (Theme, key art) | true | false | true |

    Vectors: pixelfort `{lineShow, 0.6, dither, scanlines, 16 roles,
    pixel 4, sat 0.311, shadow}`; mosslight `{no line, painterly, paper,
    0 roles, sat 0.251, diecut}`; neonrun `{lineShow, 0.3, soft,
    scanlines, sat 0.473, glow}`. Rankings: **pixelfort → pixel 2.300**,
    cel 7.000, grunge 7.200; **mosslight → painterly 2.600**, flat 3.600,
    cozy-soft 4.700; **neonrun → neon 0.200**, cozy-soft 2.900, cel 3.600.
    Adversarial: a flat #6a8f4a 640 × 360 → pixelSize 0 (error 0 at every
    s, no minimum), outline false, hfEnergy 0, edgeDensity 0, one shot
    and two the same, ranks flat 1.600; a #102030 → #f0e0c0 gradient →
    pixelSize 0 (0.0020–0.0048, no deep minimum), no outline, ranks flat
    2.700; pixelfort's first shot shrunk ×2 in the page → pixelSize 2
    (the s = 2 branch). Lines and margins: HF_HIGH 0.1 (mosslight's
    lowest plate 0.129, 1.3 ×); SAT_LINE 0.25 normalised / chroma 0.065
    (neonrun 0.473, pixelfort 0.311; mosslight 0.2511 sits on it to the
    fourth place, nothing in its vector turning on it; at Theme's loud
    line, chroma 0.12, neonrun would lose glow and scanlines and cel
    would rank first, 1.6 against neon's 2.2 — checked with the module).
- **Left for later:** a grid offset from the picture's origin (a window
  frame in a capture) is not searched for; a 2-px grid must be exact
  (its lower neighbour is the identity, so a lossy capture reads 0); the
  outline's dark share for a game whose outlines are dark grey rather
  than black will fall under the plan's 45 %.

## Phase 1 — `press/palette.js`: one quantiser, two callers (2026-09-07)

- **What:** `press/palette.js` (`window.Palette`, CONTRACTS §1 plus
  `kmeans`, `toOklab`, `fromOklab`): the tracer's `sampleOpaque` and
  `kMeansPalette` lifted verbatim as `sample` and `kmeans` (SAMPLE_CAP 3000,
  ALPHA_T 16, k-means++ seeding, 8 rounds of Lloyd's), the one change being
  that every `Math.random()` is `opts.rng()` with `Math.random` as the
  default read at call time; `quantize` (label every opaque pixel, weights
  summing to 1 over kept clusters, `ignoreEdges` dropping 4 % a side from
  the sample AND the weighing, `minWeight`, empty clusters always dropped);
  `rng` (mulberry32, a string seed hashed FNV-1a); OKLab/OKLCH both ways on
  Ottosson's matrices (source and date in the header), gamut clipping by
  bisecting chroma toward 0 (20 steps); WCAG contrast; `clampL`, `mix` (in
  OKLab), `hueDist`, `describe`. `tracer.js` calls `Palette.sample` and
  `Palette.kmeans` in place of its own copies — `labelPixels`, `MAX_DIM`,
  the smoothing map untouched; the SAMPLE_CAP line became a comment saying
  where the cap went — and `vectorize()` returns null with the table
  flashing `the palette module is missing (press/palette.js)` when
  `window.Palette` is absent (the `runTrace` null branch keeps its
  "fully transparent" line for the other case). `index.html` loads
  `press/palette.js` immediately before `tracer.js`. New tooling:
  `press/tools/lib/browser-module.js` (runs a bench IIFE against a bare
  `window` in Node — Theme and Style tests reuse it),
  `press/tools/test-palette.js`, `perf/golden-tracer.js`, and
  `perf/verify-tracer.js` (the live harness against 4322).
- **Why:** the Press Table reads a game's key art with the same quantiser
  the tracing table uses (plan §5); two copies drift, and a page rebuilt
  from its `game.json` must come out the same page, which is what the
  seeded `rng` is for. The tracer passes nothing and so behaves exactly as
  before — the golden diff is the proof.
- **Measured:**
  - `node lab2/test/press/tools/test-palette.js` — **42/42 PASS**, no browser.
    Ottosson's check values reproduced to four places (red L 0.6280 a 0.2249
    b 0.1258; green 0.8664 −0.2339 0.1795; blue 0.4520 −0.0325 −0.3115);
    500 seeded hexes round-trip through OKLCH **exactly** (worst channel step
    0); `contrast(#000, #fff)` = 21, `#777`/`#fff` 4.478; the live
    `lab2/tracer.js`'s own `sampleOpaque`/`kMeansPalette`, lifted from its
    source text and run with the same seeded `Math`, give identical samples
    (3067 pixels) and identical centroids for 3 seeds × K 2/6/12; `quantize`
    with `rng(seed)` is byte-identical across two calls and across two Node
    processes; a 4 % blue frame on a red 100 × 100 is a 15.36 % cluster
    without `ignoreEdges` and gone with it (k 2, minWeight 0.01, weights
    still 1). `clampL`'s hue bound is **measured**: one 8-bit step turns an
    OKLCH hue by up to 0.62° at C 0.15 (0.52° at C 0.2), and the rounding
    drift across a 0.3–0.7 band is 0.55–0.57° worst at C ≥ 0.15 but 0.40°
    worst / 0.013° mean at C ≥ 0.2 (100 000 colours from `rng(11)`), so the
    test holds 0.5° at C ≥ 0.2 and asserts hue-by-construction for every
    colour. kmeans on a 3000-pixel sample: 15 ms.
  - `node lab2/test/perf/verify-tracer.js` (sandbox, 4322) — **12/12 PASS**,
    no page errors; `perf/results/verify-tracer/`.
  - `node lab2/test/perf/golden-tracer.js` — **3/3 golden**, live 4321
    against sandbox 4322, fresh context per page, door blocked on both, the
    same seeded mulberry32 in place of `Math.random` (seed 0x5EED + i,
    reseeded through `page.evaluate` right before `setInputFiles`), dials at
    their defaults (6 colours, 50 % smoothing); `perf/results/golden-tracer/summary.json`:

    | fixture | grid | colours | paths | `d` bytes | sha256 (12) | quantiser draws live/sandbox | trace ms live/sandbox |
    |---|---|---|---|---|---|---|---|
    | pixelfort `keyart-portrait.png` | 480 × 640 | 6 / 6 | 395 / 395 | 22 719 / 22 719 **byte-identical** | `11a6e2fe9f95` | 6 / 6 | 238 / 175 |
    | mosslight `hero.png` | 640 × 360 | 6 / 6 | 209 / 209 | 33 973 / 33 973 **byte-identical** | `7681fda4ed90` | 6 / 6 | 285 / 250 |
    | neonrun `hero.png` | 640 × 360 | 6 / 6 | 139 / 139 | 6 907 / 6 907 **byte-identical** | `f944e4b5abce` | 6 / 6 | 258 / 213 |

    The sorted fill sets match too (pixelfort `#0c0a10 #1f2340 #4a3b6b
    #527b35 #91969c #b8c968`; mosslight `#6b6f48 #7b7a4f #868355 #928f5e
    #9c9a67 #a9a671`; neonrun `#0b0616 #160b32 #164869 #1b89aa #241453
    #67165c`). **One thing learned on the way:** with a single seeded stream
    shared by every caller, the live bench's `trystero-nostr.js` (the
    cursors bundle, lazily fetched — not on the sandbox, NOTES §D.7) drew 64
    then 128 numbers at a moment of its own a few seconds after boot; the
    first run happened to land them after the k-means (tracings identical,
    counts 70/6), the second before (mosslight 257 paths against 209,
    neonrun 126 against 139). The harness now charges every draw to the
    file that made it from the stub's own stack and serves the seeded
    sequence only to the quantiser (`tracer.js` live, `palette.js`
    sandbox); the summary keeps every file's count so a stray is named.
- **Noted, not mine:** `lab2/test/tracer.js` also carries a hunk in
  `file()` (`Lab.storeKey('flatfile')`, the page-scoped stores of the
  Phase 5 step above) that landed while this phase was under way; the diff
  against `lab2/tracer.js` is therefore this phase's hunks (the PIPELINE
  paragraph, the SAMPLE_CAP line, the quantiser block, three lines in
  `vectorize`, one in `runTrace`) plus that one.

## Phase 5, step 3 pulled forward — the door derived, the stores page-scoped (2026-09-07)

- **What:** `keep.js` derives its door from `location.pathname` (the three
  lines of CONTRACTS §0, in place of the literal `'/_lab2/default'`), reports
  `palette`, `text`, `rot` for every section as strings (`''` = drop, an
  absent key = leave alone — serve.js's rule, §7) and carries them in
  `stamp()` so a change in one is a change the timer saves; `lab.js` reads
  `<html data-lab-page>` once and prefixes every localStorage key it and
  `Lab.store` write (`knoll-lab2:` → `knoll-lab2:<page>:`), exposing
  `Lab.storeKey(k)`; `frames.js`'s size key and `tracer.js`'s one raw read of
  the library key go through it (the literal stands behind a guard for a
  lab.js without it). `perf/verify-keep.js` is the proof, and the only script
  in the folder that does NOT block the door: it saves through the sandbox
  server's real one on 4322 and puts `index.html` back, byte-identical, in a
  finally block.
- **Why:** Phase 0 found the hazard — the sandbox's `keep.js` still knocked on
  `/_lab2/default`, so the sandbox bench opened on the owner's 4321 would
  have posted its sections into the LIVE bench's file. Pulled forward from
  §9 5.4.3 (and §8 4.2's keep.js line) so nothing built after it can trip on
  it. The page scoping is CONTRACTS §0's "Page-scoped stores": one origin,
  one `knoll-lab2:` namespace, and a game page's positions were the bench's.
- **A contract line changed** (CONTRACTS §0, said there too): the bench
  regex's prefix group is `(\/.*?)??` — lazily optional — not `(\/.*?)?`. The
  greedy form reads `/lab2/press/` as prefix `/press` and derives
  `/_lab2/press/default`, a door that does not exist; the sandbox paths
  derived right either way, the merged Press Table's would not have. Every
  shape the contract names was run through the three lines lifted out of
  `keep.js` (twelve cases, all as §0 says).
- **Measured** (`perf/results/keep/summary.json`, 44/44 PASS, headed Chrome
  on 4322): the knock from `/lab2/test/` went to `/_lab2/test/default` and
  nowhere else, `Keep.live` true, the pill wore `autosave on`;
  `/lab2/test/games/abc-1/` → `/_lab2/test/games/abc-1`, `/lab2/test/press/`
  → `/_lab2/test/default`. The boot save wrote only `data-home-z` (the file
  carried none). A 200 px drag of `stand-the-pine` at 100 % + ctrl+s moved
  its `data-home-x` 340 → 540, y stayed 400, the other eight tags were
  identical with `data-home-z` factored out, and every `data-home-z` equalled
  the rank lab.js reported (the pine went to rank 8 of 9 — a drop goes on top
  of the pile by design, so the ranks above it step down; that is why the
  z is compared on its own). `index.html.keep-bak` was written once and was
  byte-for-byte the file before the run. `data-text='HELLO "quoted"'` and
  `data-rot=-3` on the oak landed as `data-text="HELLO &quot;quoted&quot;"
  data-rot="-3"` and cleared to the original tag; a `data-rot=7` set with no
  key pressed was saved by keep.js's own timer after 27.1 s. With
  `data-lab-page="probe"` stamped in by `page.route`, all 18 keys a drag
  leaves were `knoll-lab2:probe:…` (cam, the seven boot-seeded stores, pos
  and nine z's); in a fresh context without it the same 18 were bare. Zero
  console or page errors. The restore left `index.html` byte-identical.
- **Left as they are, and why:** `perf/verify-bench.js:129` reads the bare
  `knoll-lab2:cam` — a Phase 0 probe of the un-scoped bench, reporting only;
  header comments in `keep.js`, `lab.js`, `frames.js`, `vol.js` and a comment
  in `index.html` name the bare keys, which is still what the bench writes.
  `tracer.js` carries another phase's palette hunks beside this one (the
  read-modify-write took them as found).

## Phase 2 — the fonts half: four faces and `press/fonts.js` (2026-09-07)

- **What:** `fonts/Bangers-400.woff2` (23 528 B), `Fredoka-400.woff2`
  (29 732 B — one variable file serving the 400 and 600 rows),
  `Orbitron-400.woff2` (11 800 B — likewise 400 and 700),
  `Special-Elite-400.woff2` (53 296 B): each family's latin block from the
  Google Fonts CSS2 API asked with a Chrome desktop User-Agent, every file
  beginning `wOF2`; six `@font-face` rows and a licence block appended to
  `fonts/fonts.css` in its one-line style with the same latin unicode-range;
  `fonts/Special-Elite-LICENSE.txt`; `press/fonts.js` (`window.Fonts`: the
  nine pairings with computed `faces`, `stacks`, `preloads`, `suggest` and
  its rule table, no `document`); `press/tools/test-fonts.js` and the page it
  opens, `press/tools/fonts-check.html`.
- **Why:** plan §6 step 4 and CONTRACTS §3 — nine pairings a schema can name
  and the vision call can pick by id, every face self-hosted, never a link to
  Google; the network was used for this build step only.
- **Licences** (github.com/google/fonts, main, 2026-09-07): Bangers, Fredoka
  and Orbitron are OFL 1.1 — `ofl/bangers/OFL.txt`, `ofl/fredoka/OFL.txt`,
  `ofl/orbitron/OFL.txt` all 200 (4 479 / 4 388 / 4 426 B). **Special Elite
  is Apache 2.0, not OFL:** `ofl/specialelite/OFL.txt` is 404 and the family
  lives at `apache/specialelite/` (METADATA.pb `license: "APACHE2"`,
  designer Astigmatic). Apache 2.0 permits the same self-hosting; its
  LICENSE.txt (11 358 B) is saved beside the file as §4(a) asks. The plan
  said OFL, so this is **the owner's call**: keep it, or swap in an OFL
  typewriter (Courier Prime, Cutive Mono) — one file name and one row of
  `fonts.js` would change, the pairing id `typewriter` would not.
- **Contract changes (CONTRACTS §3, edited):** the files are FOUR, not six —
  `Fredoka-600` and `Orbitron-700` are rows, not files (the API hands one
  variable file per family; saved once, the 600/700 rows point at the 400
  file, each row a single weight as Public Sans's are); `mono` is the bench's
  system stack (`ui-monospace`, lab.css line 24 verbatim) for the seven
  pairings on Public Sans and Space Mono for `pixel` and `scifi`; `gothic`
  carries `accent: 'UnifrakturMaguntia'` and `stacks('gothic')` returns a
  fourth stack for it. `clean`'s three stacks are lab.css's own, so an
  unthemed page is byte-for-byte the bench.
- **Measured** (`perf/results/fonts/`): `node lab2/test/press/tools/test-fonts.js`
  356/356. Node: every face in every `faces` on disk and `wOF2`; every row of
  fonts.css on disk, latin-ranged and in some pairing's `faces`; every family
  declared is worn and every family worn is declared; `suggest` gives three
  distinct valid ids for 10 presets × light/dark × {0.05, 0.3} plus an unknown
  and an absent style, `pixel` stays first on a dark saturated pixel game,
  `scifi` climbs one place only when dark AND over 0.12; stacks quote every
  spaced name and end in a generic. Browser (headless Chrome 152 on 4322,
  every request off localhost:4322 aborted — none was made; no console error;
  no door knocked): all 21 FontFaces `loaded` with `document.fonts.check()`
  true at each row's weight, the four new files served 200 at their disk
  sizes; `pairings.png` looked at — Bangers is Bangers, both Fredoka and both
  Orbitron weights render off one file, the fraktur drop cap sits on Pirata One.
- **Open for Phase 5:** lab.css asks 700/800 of `--display`; a single-weight
  display face (Bangers, Rye, Pirata One, Special Elite, VT323) is synthesised
  bold on the bench's chrome. The template should set headings at the
  pairing's main weight (a `--display-weight` token); `fonts.js`'s header
  says which weight that is per face.

## Phase 0 — discovery, sandbox, fixtures, baseline (2026-09-07)

- **What:** `lab2/test/` scaffolded as a sandbox copy of the bench
  (README.md says what is a copy and what is new); `press/NOTES.md` with the
  five answers and eleven places the code disagreed with the plan;
  `press/CONTRACTS.md` pinning the interfaces Phases 1–4 build against in
  parallel; `press/tools/make-fixtures.js` and the three synthetic games;
  `test/serve.js` with the sandbox doors; the sandbox bench `test/index.html`.
- **Why:** the owner asked for the system in `test/`; a sandbox that runs the
  real runtime is the only way the template's paths and the perf floor can be
  checked before anything touches the live bench.
- **Measured:** see the Phase 0 verification note appended below by the
  build.

### Phase 0 — verification note (appended by the build, 2026-09-07)

- **Playwright:** `node lab2/perf/verify-tracer.js` from `site/` — 12/12 PASS
  on system Chrome 152 headed, Playwright 1.61 from `Desktop/node_modules`.
- **Baseline of the live bench** (`lab2/perf/results/press-baseline/`, and a
  confirming `press-baseline-2/`): far field at the 6.1 ms floor with 13 warm
  documents (z20/z25), z35 idles 12.1; close in the bench idles above the floor
  — z100 30.4 ms, lockup166 18.2, z50 12.1 — on both passes. That is the live
  bench as it stands today (247 panels / 186 trees against `after6`'s 138 / 77
  on 2026-09-04), not anything this phase did; flagged for the owner.
- **Fixtures** (`press/tools/check-fixtures.js`, all three valid against
  Appendix A; sizes 24 KB / 296 KB / 292 KB): pixelfort's shrink-and-re-enlarge
  error is 0.000 % at s = 4 (and at s = 2, since 2 divides 4 — CONTRACTS §4 says
  "largest s"), 12–16 colours a shot; mosslight has no edges (Sobel p99 0.126
  against neonrun's 1.1–2.1), mean L 0.61–0.66, and after a fix carries real
  texture (a column-weave the PNG budget can afford); neonrun's mean relative
  luminance is 0.02–0.03 with magenta (315°) and cyan (180–195°) as its two
  hues and a pixel-mean chroma of only 0.084 (CONTRACTS §2's mood rule).
- **Sandbox server** (`press/tools/test-serve.js`, 179 checks): every guard of
  `site/serve.js` kept; three defects found and fixed under attack — a `%zz`
  query string killed the process, a forced build that then answered 501 had
  already overwritten the page's keep-bak, and a single-quoted `data-palette`
  grew a second attribute instead of being edited (the scanner is quote-aware
  now).
- **Sandbox bench** (`perf/smoke-bench.js`, `perf/verify-bench.js`): boots with
  zero console errors, 8 kit parts on tiles and live, ctrl-pick answers on the
  pine's trunk; `data-open` framed at 0.7219 and every malformed attribute
  falls back to the live literal.
