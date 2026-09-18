# Open — what is waiting on you, and what is known-imperfect

Kept by the build as it goes. Everything here is either a decision only the
owner can make or a thing measured and left standing on purpose. Nothing in
this file blocks the sandbox from running; `press/CHANGELOG.md` is the record
of what was built, `press/NOTES.md` of what the code turned out to be.

## 1 · Decisions for you

**The typewriter face is Apache 2.0, not OFL.** The plan (§6 step 4) asked for
four OFL faces from Google Fonts. Three are: Bangers, Fredoka, Orbitron.
Special Elite is Apache 2.0 — `ofl/specialelite/OFL.txt` is a 404 and the
family's metadata says `APACHE2`. It ships as the `typewriter` pairing with
its licence text beside it in `fonts/`, which Apache §4(a) asks for. Keep it,
or swap in an OFL typewriter (Courier Prime, Cutive Mono): one filename and
one row in `press/fonts.js` change either way.

**The five questions of plan §16 were answered with the plan's own defaults**
(`press/NOTES.md` §B): `site/` is the Vercel root and may carry `api/`; no
Steam importer; no trailer machine in v1; rotation attempted then kept or
dropped on its measured cost; no intake notifications. Say the word on any of
them and the answer moves.

**Intake cannot resize an image without a native library.** `api/intake.js`
strips metadata by rewriting the container, never by re-encoding, so the size
cap is enforced by *rejecting* an oversized file rather than shrinking it. A
Vercel deployment with `sharp` installed would resize instead — the plan
allows that dependency for the function alone. Decide at deploy time.

**Nothing is merged.** `test/` is a sandbox; the live bench, `site/serve.js`
and `site/vercel.json` are untouched. `MERGE.md` is the plan for moving it
across, and it is a plan, not a thing that has happened.

**Vercel's request body limit is 4.5 MB; the plan's intake bundle is 25 MB.**
A serverless function cannot receive a full bundle at all. The endpoint is
built and tested against the local store, but a real deployment needs the
browser to upload straight to Blob storage with a token the function issues.
That is a different shape from the plan's §12, and it is your call before
Phase 8 deploys.

**The vision call has never been made.** There is no `ANTHROPIC_API_KEY` on
this machine, so every model answer in the tests is a hand-written fixture fed
through a stubbed transport. The plumbing is proven — the request that would
be sent, the schema, the server-side repair rules, the cache, the merge. The
call itself is not. The recorded files say so in capitals in their own first
field.

**Three of the plan's API parameters no longer hold**, found by reading the
current API reference rather than assuming: the pinned model rejects
`temperature`, so it is not sent; `max_tokens` is 2048 rather than 800,
because thinking is on by default and shares that ceiling, and 800 would let a
moment's thought truncate the tool call into a silent fallback; and the tool is
not marked strict, because a schema keyword the API refuses returns the same
400 as a model failing validation and there is no key here to tell them apart.
The plan's 800 is reachable by disabling thinking — the two go together.

**Intake accepts JPEG, the manifest schema does not.** Plan §12 tells the
endpoint to sniff JPEG by magic bytes; `manifest.schema.json` allows only
`.png` and `.webp` filenames. The endpoint validates against a widened copy
and returns a note saying to convert before building. Refusing JPEG at intake
instead is one constant.

**The import field's secret is a bearer secret. That is right locally and
wrong deployed.** `press/import.js` (new, plan §12 3) asks you to type
`INTAKE_SECRET` once and keeps it in `sessionStorage` — one tab, gone when
the tab closes, never in `localStorage`, never in the page's source, never in
a URL, sent in an `x-intake-secret` header. Locally that is the right amount:
the door only exists because your own `serve.js` is running, it guards a
folder that same server already serves as static files to anyone holding a
token, and the thing it protects you from is your second browser, a
screen-share and a laptop left open. Deployed it is a browser holding a
long-lived **shared** secret that unlocks **every** publisher's bundle, with
no expiry, no revocation and no audit; sessionStorage is not the weak part of
that, the bearer secret is. The fix is a real session — a login that sets an
`HttpOnly; Secure; SameSite=Strict` cookie the page cannot read, short-lived,
revocable, one per person, with the function checking the cookie instead of
the header — and it is not built. **Until it is, leave `INTAKE_SECRET` UNSET
on Vercel** (both owner doors then answer 503, which is `api/intake.js`'s own
rule that an absent secret is never an open door) and import from a machine
running the local server. Your call; nothing breaks either way, and a
publisher can still submit with the secret unset, because SEND TO KNOLL needs
no secret at all.

## 2 · Measured and left standing

**The live bench boots slower than it did in September's record.** `boot.js
press-final` reads 2027 ms to load against `boot-after`'s 1296 ms, with the
fonts still at 220 ms and the kit sheets at 1113 ms. It is the same growth the
idle numbers show — 247 panels where there were 138 — and the bench here is
byte-for-byte the one that was there before this work started. Nothing in the
Press Table is loaded by it.

**The live bench idles above the display floor close in.** The Phase 0
baseline (`lab2/perf/results/press-baseline/`, confirmed by a second pass)
reads 30 ms a frame at 100 % and 18 ms over the lockup at 166 %, against
`after6`'s 6.1 ms on 2026-09-04. The bench has grown from 138 panels and 77
trees to 247 and 186 since then. This is the bench as it stands today and has
nothing to do with the Press Table — but it is the floor everything here is
measured against, and it is worth a look.

**Eight stickers can never be sprites.** The eight that carry words in a text
slot are live SVG for as long as they are on the paper, because a webfont
cannot reach inside an image — that is the bench's own rule, not a new cost.
Measured at the still grade with nothing animating, the tray's idle cost
against a bench without it is 0.0 ms at every camera. Worth knowing before a
recipe reaches for a ninth text sticker.

**Every page that loads `kits.js` now fetches the 224 KB sticker sheet**,
whether it has stickers on it or not — the same thing the file has always
done with its other three sheets. Right for a game page and for the tray;
the merge is the moment to decide it for a live bench that has no stickers.

**A stat the schema does not bound.** `hfEnergy` is a mean absolute Laplacian
divided by contrast, so a heavily grained plate can exceed 1 (a probe measured
5.36). `analysis.schema.json` asks only for a number, which is right; but
`perf/test-style.js`'s shape assertion insisted every stat is 0–1. The test was
wrong there, not the module.

**Fixed 2026-09-07, in the Phase 9 suite pass — CHANGELOG.** `assertShape` now
asks `hfEnergy` for a finite number ≥ 0 and keeps 0–1 for `saturation`,
`contrast` and `edgeDensity`, which are shares and means of shares and really
are bounded. The number the fix rests on is `perf/attack-style.js`'s `grain`
plate (±4/255 on mid-grey), re-measured that day: **hfEnergy 5.362 against a
contrast of 0.0076**. `test-style.js` still reads 90/90 and `attack-style.js`
19/19 with its one WARN, whose sentence was rewritten in the same pass so it no
longer names an assertion that has gone. Nothing in `press/style.js` moved: the
vector is unaffected (5.4 and 0.16 are both “high”), and no threshold was
touched.

**The eight text stickers show no words in the Design Canvas view of the
sheet.** The Design Canvas runtime renders an interpolation inside `<text>` as
an SVG-namespaced `<span>`, which paints nothing. On the bench they are fine —
`kits.js` fills the string before the browser parses it. Fixing the view would
mean editing the vendored runtime, so it is documented, not fixed.

**A screenshot in a glowing frame sits about five units off centre.** A game
page composes a framed screenshot as two sections — the frame sticker, and a
`gz-pic` cut to that part's own `image-slot` rect (`press/CONTRACTS.md` §8).
The prop's box is exactly where the rect is in the part's 128 units; the
sticker's is wherever `kits.js` re-cuts it to, which is the ALPHA box of the
drawing plus whatever shadow the style pass gave it. A style whose `finish` is
`glow` swaps the sheet's 6,7 drop-shadow for `drop-shadow(0 0 6px)`, which
spills on all four sides, so `kits.js` seats the drawing 5 units in from its
own section's left edge (measured on neonrun 2026-09-07: `data-w` 134 → 141,
the svg at `left: 5px`; pixelfort's `pixel` and mosslight's `painterly` both
measure 0). The picture does not move with it, so under a glow style it sits
about 5 part-units — 16.6 world units, 8.2 screen px at the opening zoom
(re-measured 2026-09-07, after the rectangle stopped being widened: the
offset in world units is what it was, the page just opens nearer) — left of
centre in its window. It stays INSIDE the window; it is not centred in it.
Closing it needs the part's ink box at build time, which means rasterising the
part the way `kits.js` does, and that is a Phase 9 job rather than a guess.

**No fixture reaches the `scrapbook` recipe.** All three rank it second or
third (pixelfort poster·widescreen·scrapbook, mosslight
widescreen·scrapbook·poster, neonrun widescreen·poster·scrapbook), so no
scrapbook page has ever been BUILT, photographed by `perf/shot-games.js` or
put through `perf/verify-game.js`. It has been DRAWN, as the third mockup on
the Press Table: the cropping pass measured mosslight's scrapbook card at
2271.1 × 2289.25 world units, **0.99 : 1**, which is the one thing known
about its shape. Its numbers were kept consistent with the two recipes the
probes corrected (the 34-unit note body, the 960-wide column); its
composition is otherwise untouched and unjudged, and the first person to
build a scrapbook page should look at it at size.

**The mosslight fixture's texture is a compromise.** Appendix H wants "no
edges" and "high hfEnergy" from five plates inside a 300 KB folder, and
per-pixel grain is exactly what a PNG cannot compress. The generator weaves
texture in one dimension to buy both; `press/tools/make-fixtures.js` records
every number of that trade.

**A portrait poster cannot fill a landscape bench, and that is now the whole
of it.** `perf/verify-game.js` (§9 5.5) asks whether the opening rectangle
frames the composition with no more than ~25 % of the SCREEN empty on any
side, and pixelfort is the one page that still fails it, at both of the
plan's viewports: **28.4 % left and right at 2560 × 1111, 25.8 % at
1366 × 768** (it was 30.4 % and 28.9 %). Two things were in that number when
this was first written and only one of them was ever fixable.

*The part that was a choice is gone.* `press/recipes.js`'s `openOf()` widened
every composition to the bench's 2.302 : 1, which can only lower the zoom a
page lands at (`lab.js` fits `min(w-fit, h-fit)`, and both terms fall as the
rectangle grows). It does not any more — the rectangle is the slots' box plus
Appendix E's 120 of margin, in the composition's own shape — and the note
body went 30 → 34 with it. Measured at 1366 × 768: the poster's body type
**8.6 → 10.2 screen px**, the two widescreen pages' 10.0 → 12.6 and 11.8; the
bare paper inside `data-open` **28.1 % → 4.9 %** on the poster and 19.6 % →
4.2 % on the other two, so the second half of check 7 passes everywhere now.
CHANGELOG (Phase 5, third pass) has the before and after in full.

*The part that is arithmetic stays, and it is provable.* The poster's
composition is 2214 × 1758 — **1.26 : 1** — and the bench is 2.45 : 1 at
2560 × 1111. A rectangle can only be BIGGER than the box it holds, and
`lab.js` centres it, so **no `data-open` whatever can leave less than 24.2 %
of that bench empty on the left and the right** — and that floor ignores the
24-px pad `lab.js` puts round every rectangle. Put the pad back and take the
margin all the way to zero (`open.h` = the box's own 1758) and the best
reachable at 2560 × 1111 is **25.4 %**: over the line, with no paper round
the composition at all. At 1366 × 768 the floor is 20.2 % and the check WOULD
pass with a margin of 90 rather than Appendix E's 120 (that is `open.h` ≤
1937, which is 25.0 % exactly). That number was not taken. Trimming a
composition's paper to move one percentage a tenth of a point under a line —
on a page that fails the same check at the other viewport whatever is done —
is arranging the evidence rather than fixing anything. **A portrait poster on
a landscape screen has paper either side of it; that is what a poster is.**
The two failures are the honest report of it, and `verify-game.js` prints
the floor beside each one so a reader can tell the arithmetic from the
generosity.

**pixelfort's body type is 10.2 screen px on a laptop, and that is the
floor.** Phase 5 moved the note body 22 → 30 to put a paragraph at
10.1–11.8 px measured at 1600 × 1000; §9 5.5 judges at 1366 × 768, where 30
came out at **8.6 px** on the poster. 34 is `ceil(10 ÷ 0.2991)` — ten screen
pixels at the poster's landed zoom on the smaller of the plan's two screens,
which is the tightest case of the three pages — and it measures 10.2 there
and 17.0 at 2560 × 1111, against the two widescreen pages' 12.6 and
11.8–12.2 there (their bench's height moves a line with the header's wrap;
the poster's does not — CHANGELOG) and 19.8 at 2560. It cannot go much lower than that on this page without the composition
changing shape: the ceiling with a zero margin is 10.2 × (1998 ÷ 1758) =
11.6 px. If a future recipe wants a poster's paragraph bigger than that, the
thing to move is the composition's HEIGHT (1758 units of it, set by the
burst above the logo and the polaroid row at the foot), not the rectangle.

**The empty window and the wordless ribbon are answered** (2026-09-07, and
the entry above is what replaced them). `badge-round` stood on the hero's
corner with neither a picture for its `image-slot` nor a word for its text
layer, so both widescreen pages carried an opaque `--sk-paper` square and a
blank ribbon. The seal is `burst-round` now — the same round scalloped badge
with no window and no words in it — and the `banner` carries the manifest's
release year, or is left off the page when there is no year to carry.
`verify-game.js`'s two notes read `emptySlots` `[]` and `wordless` `[]` on
all three pages, and `test-recipes.js` refutes both at the source for every
recipe. **What is left open is one line of the plan:** Appendix E names
`badge-round` for that corner and `press/recipes.js` does not place it, which
is the only part swap in the file. Say the word if the badge should come back
— it needs a fifth picture the manifest has not got, or a way to drop an
`image-slot` layer at EXTRACT time, which belongs in `kits.js` and not in a
generator (CHANGELOG, Phase 5 third pass, has all three routes and what each
costs).

**The merged bench's BOOT time has not been measured.** Plan §13 1 asks for
`measure.js press-final` *and* `boot.js press-final` on the main bench, and
names the reason: after the merge `lab2/index.html` loads `press/palette.js`
before `tracer.js`, and "if it costs anything at boot, defer it the way
`cursors.js` is deferred until idle". The Phase 9 suite took the pan numbers
(`lab2/perf/results/press-final/`, identical to the baseline at all seven
cameras) and **not** the boot ones, and there is nothing to compare against
yet in any case: nothing is merged, so the live bench has never loaded
`palette.js`. The honest order is — take `node lab2/perf/boot.js
press-pre-merge` BEFORE the merge as the baseline (`press-final` is the label
the PAN run already took), add the `<script>` line, take it again as
`press-post-palette`, and if the second is slower, give `palette.js` the
`defer` that `cursors.js` has. `MERGE.md` §5 steps 0 and 2 say the same in
their own place.

**A page built out of an intake does not remember that it was.**
`press/press.js`'s `manifestOf` writes `source` from the MODE it is in —
`'intake'` in publisher mode, `'manual'` in owner mode — so a bundle a
publisher sent is filed under `source: "intake"` in `press/cache/intake/` and
then built as `source: "manual"` in `games/<slug>/game.json`. The schema
allows all four values and nothing reads the field yet, so nothing is broken;
but the one place the provenance would be useful is the built page, and that
is the one place it is thrown away. One line in `manifestOf` (carry the value
the imported manifest brought, if it brought one) closes it. Measured by
`perf/verify-import.js` on 2026-09-07 and left alone because `press.js` was
another pass's file that day.

**`genres` do not survive the Press Table.** `manifest.schema.json` allows up
to six and the pixelfort fixture declares three; `press.js`'s `applyManifest`
does not read the key and its `manifestOf` does not write it, so a publisher's
genres are dropped before `api/intake.js` ever sees them and no built page has
ever carried one. Nothing on a game page draws them today, which is why this
has gone unnoticed — but the words are being asked for and then quietly
discarded, which is worse than not asking. Two lines, one in each function.
