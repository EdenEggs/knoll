# yard — how it works

A tour of `site/yard/` for whoever opens it next, agent or otherwise. It
describes what is built and running today. `site/lab2/about.md` covers the
second bench; this one covers a single standalone page.

Rewritten 2026-09-06, when the page was re-cut from a new Design Canvas export
("Your Yard - Gnome Tour") that brought a gnome, a guided tour, a hills strip,
a fence, a friends list, a plot rename and the page's first breakpoint. §9 is
the part to read first if you are about to re-cut it again.

---

## 0 · The dock, the publish door and the fence (2026-09-17)

The yard is now a page you can **draw on, stamp, write on and pin gifs to** —
lab 2's tool dock (MOVE · DRAW · STICKER · UPLOAD · TEXT · GIF · COLOUR ·
UNDO · DELETE), the same one the benches carry — and **SAVE YARD publishes the
whole page** so everyone who opens it sees it as you left it.

### The files

| file | what it is |
|---|---|
| `tools.js` | the `Lab` the four bench files below were written against, over a page that has no camera (~300 lines): the world, the store, undo, the seed, the publish, the beacon, the fence, and the forest handed to the sticker drawer. Read its header first. |
| `wall.js` `tracer.js` `stickers.js` `gif.js` | **`lab2/bench-template`'s copies**, byte for byte but for two things: `wall.js`'s `add()` stamps `when` (the time a piece went on — the dashboard reads it), and `tracer.js`'s one template token is filled (`knoll-yard:flatfile`). Re-copy from the template to take a bench fix; re-apply those two. |
| `hill.json` | **the copy of the page that ships with the site**: what a visitor opens on when there is no store behind the door (§ the door). Written by the dev server's door on every SAVE YARD; committed. |
| `looks/` | every local save, as a version, by the same door. Ignored by git and by the deploy. |
| `../api/hill.js` | the door itself — one Vercel function, mounted at the same path by `serve.js`. Its header is the record. |
| `../lab2/lab.css`, `../lab2/fonts/fonts.css` | linked from the real `<head>`: the dock, the ink, the type case and the two side panels are lab 2's rules, and Kalam (the panels' handwriting) is one of lab 2's faces. The Google Fonts link went with it — all four of this page's faces were already in `fonts.css`. |

### The world is the content column

`#bench-world` is a box laid over the 1200px column — 1200 world px wide,
the column's height tall — and **scaled to the column's real width**
(`transform: scale(k)`, `k = Lab.zoom`), so a mark made on a wide screen
lands on the same part of the page on a narrow one. Measured: at 1280 the
world is `33,85 1200×1915` at `scale(1)`; at 375 it is `14,71` at
`scale(0.289)`, exactly the column, and the document is 375 wide with no
sideways scroll. **Below 860px the page reflows to one column**, so a mark's
`y` no longer points at the card it was drawn on; `x` still does. That is
the ceiling of drawing over a responsive page, and it is left there on
purpose.

The box takes no pointer of its own (`.yard-world { pointer-events: none }`),
so the page under it works as it always did; the wall's own svg answers the
pointer exactly when lab.css says a tool is up, and the note box and a playing
gif are the two children that must (`.yard-world > .wall-note, .wall-video`).
The world is found **after React has rendered it** — the `.yard-col` inside
the `<x-dc>` template is skipped (`liveCol()` in tools.js); grabbing that
copy watched a detached node and laid nothing out, which is how it shipped for
twenty minutes.

Three of lab.css's rules are the bench's alone and are put back in the
helmet (THE DOCK'S STYLESHEET, TAMED): the bench never scrolls, its body is
a flex column, and it sizes everything border-box — this export was drawn
against content-box, so `.yard-root *` goes back to it. On a phone the dock
**wraps into two rows** (`@media (max-width: 700px)`) where the bench lets it
run off both edges.

### The forest is the sticker drawer's first kit

The twenty-three drawings the plot is planted with go into the drawer as
stickers — kits **Trees · Grass · Mushrooms**, ids `forest-<slug>` — handed
over from the component's constructor (`YardTools.forest(FOREST)`), not from
a `sticker-kits.json`. Ids are permanent (lab2/STICKERS.md §5): a stamp
remembers `forest-the-elder`, not a drawing.

### The door

`POST /api/hill` with `{ hill: 'yard', doc }` publishes; `GET
/api/hill?hill=yard` reads the latest; `&at=<t>` a version; `&ping=1` says
which store stands behind it and whether a save can go through. The doc is
the wall, the tracing library, where every tree stands and the two names.
Three stores, one shape:

| where | store | reads | writes |
|---|---|---|---|
| the dev server | files | `hill.json` | `hill.json` + `looks/<t>.json`, door open |
| Vercel, with a Blob store linked | Vercel Blob | `hills/yard/latest.json` off the store's public URL (60 s edge cache: a visitor sees a save inside a minute) | `latest.json` + immutable `v/<t>.json`, the 40 newest kept; needs `x-knoll-key` |
| Vercel, nothing linked | none | says `empty`; the page falls back to `hill.json` | 503, and the button says why |

**Setting it up on Vercel** (the two things this repository cannot do):

1. Storage → Create → **Blob**, connect it to the project. That adds
   `BLOB_READ_WRITE_TOKEN` to the environment; `api/hill.js` reads the store
   id out of it the way `@vercel/blob` does.
2. Settings → Environment Variables → **`KNOLL_OWNER_KEY`**, any long
   secret. The yard asks for it the first time SAVE YARD is refused with a
   401 and keeps it in that browser (`knoll-yard:key`). **Unset means shut**
   on Vercel and open on localhost; never "anyone".
3. Redeploy.

Budget: a save is two Blob "advanced operations" (Hobby: 2,000 a month);
reads are cache hits, free. Nothing about a visit touches Blob — see the
fence.

### Which page you see

Everything the tools make lives in this browser (`Lab.store` →
`localStorage`, under `knoll-yard:`). On open, the published doc is
fetched and laid on the paper **unless this browser has work of its own on
it**: every write by a hand marks `knoll-yard:touched`, a publish clears it,
and a doc is applied only while `touched ≤ applied`. So a visitor always sees
the latest page (verified: clear storage, reload, the published stroke is
there), and the owner's unsaved work is never written over. `reset data`
sweeps the marks with everything else — the published page comes back.

SAVE YARD (the header button, and ctrl+s, and `save layout` on the plot —
they are one `savePlot()`) keeps the trees' arrangement on this device as
before, then publishes. The pill reads `CHANGED — NOT SAVED` for a moved tree
or anything the dock put on the page; the button's face says `saving…`,
`saved ✓`, `no change`, or `not saved: <why>` in red for eight seconds.

### The fence, the count, and what is still written down

Visits, likes and notes go to **the Apps Script the waitlist already posts
to** (`apps-script/Code.gs`, the same `/exec` URL, in `tools.js` as
`HITS`): a visit is one `sendBeacon` as the page is left (visitor id from
`knoll-yard:me`, device, referrer host, seconds), a like and a note one post
each. Nothing is sent from localhost or from `?embed=1`. **The script has to
be redeployed** (Deploy → Manage deployments → New version) with the Code.gs
in this repository before any of it counts; until then the yard reads the old
`ok` answer, knows it for the waitlist-only script (no `notes` array), and
keeps the fence on this device, saying so. The sheet grows two tabs, Visits
and Fence, on first use. Anyone can post to it — there are no accounts — so
every field is clipped, notes are 140 characters, and clearing a tab is the
moderation tool.

What is real now: the eyebrow, VIEWS (30 days), LIKES, the notes, **Your
standing** (pieces, streak of days with a piece, member since the first piece),
**Badges** (earned off the same counts; the pin is still nobody's), **Your
edits** (the six newest pieces, in words), and — on this device only —
**Spaces you've visited** and the **hills** you saved from it (§5). Since
2026-09-23 **Friends**, **the bell** and **the spaces you made** are real too (§5a).

**`plotEmpty` is back to true** (2026-09-21, §3, §12): the plot ships blank,
as §3 describes. It was false from 2026-09-17; flip it again to plant the
forest.

### Checking it

`node lab2/perf/verify-hill.js` drives the door in-process, no server (24
checks: refusals, cleaning, versions, the shut door, the key). The rest was
checked in Chrome on 2026-09-17: zero console errors on the yard and the
dashboard; a stroke lands at world `M299.5 400` for a pointer 300,400 into
the column; a sticker and a note pin; the dashboard charges the stroke to THE
HILLS; a cleared browser opens on the published page.

---

## 0a · Yours: accounts (2026-09-21)

Since `/signup` and `/login` became real (`api/auth.js`), **the yard is the
signed-in gnome's own page**:

- **Signed out, you go to the gate first** and come back after
  (`/login/?next=/yard/`) — from the real head, before the runtime, off the
  `knoll_in` cookie; and again if the door says the session has lapsed. The
  dashboard's picture (`?embed=1`) is let through. `/dashboard` does the same.
- **The device's copy is one account's.** Every `knoll-yard:` key belongs to
  `knoll-yard:owner`; a different gnome signing in on this browser has them
  swept first (unpublished work from before accounts is kept for the first one
  in). SIGN OUT ends the session at the door and goes to the gate, and leaves
  the yard on the device for whoever comes back to it.
- **It publishes to its own hill**, `u-<the account's id>` (`tools.js: WHOSE
  HILL`, `api/hill.js: A YARD OF ONE'S OWN`): the session, not the owner's
  key; thirty saves an hour; checked for what `wall.js` draws into markup,
  since anybody can open it. A yard never published opens on nothing.
  `/dashboard` reads the same hill. `'yard'` — the owner's hill — is as it was,
  for `/YardView`.
- **The tour is the account's** (§4): it runs on a new gnome's first visit to
  their yard, on whatever device, and never again.
- **The name is the account's**: an unnamed yard takes the account's name, and
  an edit to it (the drawer, the greeting) is sent to the account as well —
  what the account corner and TOEM 2 call you. The fallback is `gnome`, not
  `Morgan`.
- **No search box of its own** (2026-09-22): the account corner's lens in the
  bar is the one search.
- **The K is your picture** (2026-09-22): press it and pick an image; it is
  cut square from the middle, 128 across, a JPEG on cream, and kept on the
  account (`api/auth.js`: THE PICTURE — op `avatar`, a JPEG `data:` URL of at
  most 60 000 characters whose bytes are a JPEG's, back in every `me`). It
  goes over the K once the door has it; a refusal says why in the line under
  the greeting for six seconds. There is no taking it off yet, only another
  in its place. Yard View's K is still a plain K.

Across the top, at the right of the house bar, is the **account corner**
(`/account.js`, on every page with a bar): the search, and your gnome's head —
eyes on the pointer — or your picture in its place, linking here (on this
page, the menu with LOG OUT). This device keeps the last picture the door gave
it for the account signed in (`knoll-account:pic`), so a page draws it at once;
signed out, it is forgotten.

---

## 1 · What this is

**Your Yard** is a personal home base: a plot you arrange yourself, the hill
you are standing on, your standing (badges, spaces visited, your own edit
history), a fence other gnomes leave notes on, and a settings gear that opens a
drawer for a display name and a few local preferences. A gnome stands beside
the title and, on a first visit, walks you round the page.

Everything here is scoped to *this device* (`localStorage`, the same convention
`lab/ABOUT.txt` uses) because there is no account system behind any of it yet.
The page makes no `fetch`, opens no socket and has no analytics; the only
things that leave the origin are the Google Fonts request and the two React
files `support.js` pulls off unpkg.

It is served at `/yard`, alongside `/lab` and `/lab2`, but it is neither of
those: it is not a workbench of gizmos and not a paper of loose Design Canvas
exports. It is one page, built the same way the coming-soon page itself is —
a real `<x-dc>` document, `support.js` and all.

### The house bar

Across the top is **lab 2's header**: the white bar with the knoll mark and the
word `knoll`, linking `../`. It is `lab2/lab.css`'s `.lab-head` / `.lab-brand`
rules with the token values written out (`--card` `#fdfbfd`, `--line`
`#e2d4df`, `--ink` `#26212a`, `--display` Sora) — this page does not load
`lab.css`, and the only other thing it would want from it is Sora 800, which
the helmet's existing Google Fonts link asks for alongside Rye and VT323.
(lab 2 and the two gate pages self-host their faces out of `lab2/fonts/`;
extending the one request yard already makes is the smaller change, and yard
has been a Google-Fonts page since it was cut. Worth revisiting if the whole
page ever moves off the CDN.)

Checked property by property against lab 2's own rendered bar — background,
border, padding, gap, alignment, family, weight, size, letter-spacing,
decoration, the 26×26 mark, colour and hover — with **no differences**.

**The wordmark is just `knoll`, and that is not a shortcut — it is what lab 2's
bar says.** `lab.css:94-97` hides `.lab-slash` and `.lab-name` unless `<html>`
carries `.lab-local` ("the `/ lab 2` that says which bench this is belongs to
the workbench too"), and `lab2/index.html:29` adds that class on localhost
only. So the bar a visitor sees on lab 2 is the mark and one word. A
`knoll / yard` here would have copied the bar that stands in front of a
developer rather than the one on the site. Confirmed by dropping `.lab-local`
off a running lab 2: the bar goes to `knoll`, 51px tall, the same as this one.

**The hover is lab 2's too, and lab 2 has no `.lab-brand:hover`.** Its brand
turns `#a52c68` because bare `a:hover` at `lab.css:67` (0,1,1) outspecifies
`.lab-brand` (0,1,0). In this page that same slot is yard's own `a:hover`
(`#b8302f`, rust), which would outspecify `.knoll-brand` for exactly the same
reason — so `.knoll-brand:hover` carries the colour explicitly to land on lab
2's. Note `/signup` and `/login` use `#c93b82` (`--pink`) here; lab 2 renders
`#a52c68`. **Four ports now, and they still disagree on this one value** —
`/yard` and `/dashboard` say `#a52c68`, `/signup` and `/login` say `#c93b82` —
and if they are ever
unified this is the number to unify on.

**It sits in normal flow, pulled full-bleed by negative margins** — not on top
of the page by `position:absolute`, which is what `/signup` and `/login` do.
Those two had to: their root is a centred flex row, and a bar joining it would
shove the scroll off centre. This root is an ordinary block, so the bar can
simply *be* the first thing in it — which means the root needs no `position`,
no `z-index` and no padding arithmetic, and a bar that ever grew taller would
push the page down instead of landing on it. It is also what lab 2's own
header does (`flex:none` in a column, not absolute).

**The one coupling to keep in step: `margin: -34px -30px 34px` is the root
div's own padding** (`padding:34px 30px 56px` — 34 top, 30 sides) spelled out,
so the bar reaches the full width of the page instead of sitting inside the
gutter. Change the root's padding and change these. The `margin-bottom` puts
back the 34px of air the top padding used to give the heading.

**That coupling now exists twice**, because the page has a breakpoint. Below
860px the root's padding is `20px 14px 40px` and the bar's margins are
`-20px -14px 20px` to match — see YARD FIX 2 in §9, which is that coupling
being broken by the export and put back. Measured after: at 375px and at 900px
the bar is flush to the top (`top: 0`) and exactly full-bleed (`left: 0`,
`right` = viewport), 51px tall in both.

**Six of lab 2's declarations are dropped** (this said five until 2026-09-06,
and quietly omitted `position:relative` from its own list — `.lab-head` sets it
so the bench's `z-index:20` has something to be relative to, and with the
`z-index` gone it has nothing left to do). `flex-wrap`, `max-height` and
`overflow` carry the bench's hint paragraph and its tools row, and one brand
link can neither wrap nor outgrow 42vh. `flex:none` is for being a child of lab
2's column-flex body, which this is not. And `z-index:20` would be actively
wrong here: the settings scrim is `position:fixed` at 20 and the drawer at 21,
so a bar at 20 *ties* the scrim and wins or loses only on tree order. With no
`z-index` at all the modal paints over the bar, which is what a modal should
do — verified by hit-testing the bar's own coordinates with the drawer open and
getting the scrim back.

`href="../"` is where lab 2's own brand link goes. **Locally that is a 404** —
there is no `site/index.html`, and the `/` → `/lab2/index.html` rewrite lives
in `vercel.json` and is Vercel-only. On the deployed site it lands on the front
page. Same behaviour as lab 2's brand and as the two gate pages', not a bug in
this one.

### The switch (2026-09-06)

Beside the wordmark are two pills — **yard** and **dashboard**. Two rooms belong
to the same person: this page is your plot and your standing, `/dashboard` is
the numbers off the same hill, and this is how you get between them.

**It lives in the bar and not in the page**, which is the whole of the decision.
The bar is the only thing both pages have in common and the only thing that is
in the same place on both, so a switch in it never moves, never has to be found,
and does not have to be redrawn in each page's own vocabulary. Put it in the two
headers instead and it is in two different places wearing two different looks,
which is a pair of links rather than a switch.

**It is drawn in lab 2's in-bar vocabulary, not this page's.** The yard's own
controls are cream 4px-bordered stickers in VT323 with a hard drop shadow; lab
2's bar has none of that — `.lab-keep` and `.lab-save` are small 999px-radius
pills, 11.5px Public Sans 600, quiet. A yard sticker sat in this bar would be a
yard sticker sitting in lab 2's bar. So the pills take `.lab-keep`'s shape,
border and padding (`lab.css:105`), **`.lab-keep.is-saved`'s** "this one is lit"
palette (`lab.css:130` — pink on pink-soft over `#fff6fb`) borrowed for the
hover, and `.lab-save`'s filled treatment for the page you are on — in `--ink`
rather than `--pink`, because *where you are* is a state, not a thing that just
happened.

**The lit palette is `.lab-keep.is-saved`, not `.lab-keep:hover`**, and this
file said the wrong one until 2026-09-06. They are different rules with
different colours: `:hover` (`lab.css:129`) is a grey nudge —
`border-color:var(--mute-2); color:var(--ink-3)`, no background — and
`is-saved` is the pink one. Anyone re-syncing the two copies against `lab.css`
would have found grey where this said pink and concluded the switch had drifted.
Borrowing a *state's* palette for a hover is the right analogy anyway: over
there the pill lights because something happened, here because you are pointing
at the way out.

**Two colours are darker than lab 2's, on purpose.** lab 2 rests `.lab-keep` at
`--mute` `#8b7f92` and lights it at `--pink` `#c93b82`; measured against their
own backgrounds on this bar those are **3.56:1** and **4.47:1**, and at 11.5px
WCAG AA wants 4.5:1. So the resting ink is `--ink-3` `#3d3346` (11.2:1) — which
is the very colour lab 2 moves `.lab-keep` *to* on hover, so it is still lab 2's
ink — and the lit pink is `#a52c68` (6.3:1), which is lab 2's own
`.lab-save:hover` and `.lab-brand:hover`. Both are house values; neither is
invented. The filled pill was already fine at 15.3:1.

Still short of AA and left alone: the pill's 1.5px `#e2d4df` border on the
`#fdfbfd` bar is 1.39:1. It is a boundary, not text, and the label carries the
affordance — but a pill you can barely see the edge of is worth revisiting if
the bar ever grows a third control.

`aria-current="page"` says which is which. It is the correct word for it and it
is the hook the fill is keyed off, so the machine-readable answer and the
visible one cannot drift apart. **The current page's pill has no `href`**, which
is what makes its `cursor: default` true: an `<a>` without one is not focusable,
not clickable and not a tab stop, so it cannot be pressed into reloading the
page you are already on — and a reload here throws away an unsent note at the
fence, an open drawer and where you had scrolled to. It still announces as the
current page; that is `aria-current`'s job, not the href's.

**Public Sans 600 is the fourth face on the font link, and it is here for this
and nothing else.** Same argument the bar itself made for Sora 800: extending
the one request this page already makes, to an origin it already preconnects to,
beats a second origin or a self-hosting move — and `/signup` and `/login` already
carry Public Sans out of `lab2/fonts/`, so it is a house face rather than a new
one. Worth revisiting only if the whole page moves off the CDN.

**The `:hover` rule is written out to ADD a hover, not to beat one** — and this
file claimed the wrong reason until 2026-09-06. `.knoll-brand` is (0,1,0) and
genuinely loses to this page's `a:hover` (0,1,1), which is why *that* hover has
to be restated. `.knoll-switch a` is (0,1,1) and **ties** `a:hover`; being later
in the sheet it wins, so the rust never lands on a pill either way. Without the
rule, a hovered pill would simply keep its resting colour and there would be no
hover at all.

**The same CSS block and the same two links stand in `/dashboard`'s bar**, with
`aria-current` moved across. There is no shared stylesheet to put them in, so
**keep them in step by hand.**

---

## 2 · The files

| file | what it is |
|---|---|
| `index.html` | the whole page: helmet (fonts, base CSS, the house bar's rules, the forest's keyframes, the breakpoint), the `<x-dc>` template, and the `class Component extends DCLogic` script that computes everything the template binds to — including `FOREST`, the twenty-three drawings, and `TOUR`, the four stops. 1,426 lines. |
| `recut.js` | turns a Design Canvas export of this page into this file. Four edits, listed in §9. Run it, do not do them by hand. |
| `support.js` | the Design Canvas runtime, copied from `../support.js`. Not ours — do not edit here; edit the one at the site root and re-copy. Byte-identical to the copy the export bundles, so the runtime has not moved. |

No `yard.css` or `yard.js`. An earlier, hand-built version of this page
(plain HTML/CSS/JS, no Design Canvas) lived here first and was fully
replaced by a Design Canvas export.

Four Playwright probes live next door in `lab2/perf/`, in the shape of
`probe-signup.js` and run the same way (`node serve.js`, then `node probe-*.js`
from `lab2/perf/`):

| probe | what it answers |
|---|---|
| `probe-yard.js` | the whole page end to end — recut, tour, drawer, rename, reset, narrow. Prints a report; `URL=…` points it at a candidate file. |
| `probe-yard-narrow.js` | what is off-screen at 375px, and whether the tour still works there |
| `probe-yard-motion.js` | whether reduce-motion reaches the gnome and the tour, and what a tour frame costs |
| `probe-yard-audit.js` | the specific defects §9 fixes, each with a before/after measurement |
| `probe-connect.js` | every door between the four standalone pages (§9a) — walks them rather than reading the hrefs, and checks both bars and both switch pills at 1500px and 375px |

---

## 3 · The plot

Under the plot's heading is a 16:9 box. **It ships empty**, and that is a
choice, not an oversight: the export declares a `plotEmpty` prop
(`"Empty plot (hide the sample forest)"`) defaulting to **true**, and the page
is shipped as exported. `pieces` is `[]`, the caption reads `NOTHING PLANTED
YET.`, and the box is a bordered rectangle of paper going green at the bottom.

**The twenty-three forest parts are still in the file.** `FOREST` and
`drawing()` are untouched and the constructor still builds all twenty-three SVG
strings on mount; only the `pieces` list is gated. Setting `plotEmpty`'s default
to `false` in the `data-props` block at the head of the script brings the whole
plot back — sixteen trees, four patches of grass, three clumps of mushrooms,
draggable, with the caption that describes them — and everything in the rest of
this section applies again the moment it is flipped. Nothing else needs
changing: the fix in §9 that quiets the save controls over an empty plot
un-quiets itself when `planted` goes true.

The rest of this section describes the plot **with the forest on**.

**The drawings are lab 2's, verbatim.** They come out of
`site/lab2/features/forest.dc.html` — one Design Canvas sheet with a `part`
prop and twenty-three `<sc-if>` arms, which lab 2 points twenty-three iframes
at. This page is not a bench and has no iframes, so the SVG came across *as
SVG*: `FOREST` at the head of the script block is the export's own markup, part
by part, with the four palette holes the sheet fills in (`leafMain`, `leafDark`,
`leafLite`, `capA`) already filled in at the sheet's own defaults — summer
leaves, a red toadstool — and the sparkles gate resolved open, the way its
default resolves it. Every path, every stroke width and all four animations are
the drawing's; the extraction was checked element-for-element against the sheet.

Which means **the sheet is still the original**. If a tree is redrawn over
there, this table does not hear about it, and re-cutting it is a re-run of the
extraction rather than a hand edit. That is the price of not shipping
twenty-three iframes to a settings page, and it is the right way round: the
yard is a place the forest is USED, and lab 2 is where it is kept.

### How a piece is positioned

Everything is a percentage of the plot box, and `left`/`top` is where the piece
**stands** — the point its trunk meets the ground — not its top-left corner.
`foot` in the `FOREST` table is how far down its own viewBox that point sits,
and it is the same number the sheet uses for the sway's pivot. The wrapper
carries `translate(-50%, -<foot>%)` to hang the drawing off it.

Percentages all the way down, and the box has an `aspect-ratio` rather than a
height, so the arrangement is the same arrangement at any width rather than a
layout for one window. **That invariant is why the plot's `min-height` is
dropped below 860px** rather than its ratio being changed — see YARD FIX 1 in
§9. On a phone the box is 332×187 instead of the 533×300 the `min-height` was
silently forcing it to, and it is the same yard.

**The pile is the ground.** `z-index` is computed from `y` and nothing has a
stacking order of its own: lower down the plot is nearer, so it stands in
front. That is the one rule that makes a plot of trees read as depth rather
than as overlap. It costs the ability to put a small far tree in front of a big
near one, which is a thing a yard does not do anyway.

**The plot box isolates**, and not for tidiness. Those z-indexes run into the
hundreds; without a stacking context of its own they would be the *page's*
numbers, and a tree would paint straight through the settings drawer's scrim
(`z-index: 20`) and stay draggable behind an open modal. `isolation: isolate`
on `.plot-yard` is the whole fix, and it is still there.

**A carry is written straight onto the node.** `grab`/`haul`/`letGo` take
pointer capture and then set `style.left` / `style.top` directly until the
thing is put down; only the drop goes through `setState`. A drag is sixty of
these a second and the other twenty-two drawings have not moved. The handlers
use `e.currentTarget` and never `getElementById` — the piece that got the
pointerdown is the node to move.

**Arrows nudge a focused piece** one percent at a time, five with shift. The
pieces are `tabindex="0"` with their lab 2 names as `aria-label`.

### Save, reset, reset — and now a fourth control

Lab 2 keeps where everything is in `localStorage` and keeps THE DEFAULT LOOK in
`index.html`, and `save layout` promotes the first into the second through a
door in `serve.js`. A page cannot write the file it was served from, so on the
deployed bench that button is not there at all.

This page has the same two tiers and **neither of them is the file**, because a
yard is one person's and this one is scoped to this device like everything else
here:

| tier | key | written by |
|---|---|---|
| where the trees are right now | `knoll-yard:plot` | every drop, so a drag is never lost to a reload |
| the arrangement you kept | `knoll-yard:plot-default` | `save layout`, and ctrl+s |

`reset layout` goes back to the second. Never having pressed save leaves it
empty, and then the default is the arrangement written down in `FOREST` — what
this page ships with, and what a first visit gets. `reset data` wipes every key
this page owns and reloads (see §7 and YARD FIX 3).

The vocabulary is lab 2's, and worth keeping: **the pill is a state and the
button is an event.** `MOVED — NOT SAVED` answers a glance; `saved ✓` answers a
press, for 1600ms, on the button's own face — a press you cannot see the result
of is a press you make twice. `no change` is the other half of that, and the
half most worth copying: a save that did nothing and a save that did something
look identical on a page where the trees have not moved. `DEFAULT SAVED 14:32`
is `keep.js`'s clock, meaning the same thing it means over there.

The `save layout` tooltip is lab 2's, word for word: *"save this arrangement as
the default layout (ctrl+s) — reset layout comes back here"*.

**There are now two buttons for that one action, and they do not agree.** The
new page header carries a `save yard` button bound to the same `savePlot`, with
its own word (`ySaveWord`), its own colours (`ySaveBg`/`ySaveFg`/`ySaveIcon`),
its own dirty dot (`yDirty`) and its own tooltip, *"save your yard (ctrl+s)"*.
So the same press is called "save layout" in one place and "save yard" 500px
above it, and only one of them wears lab 2's sentence. **This is the clearest
open design question the new export leaves**: either the header button is the
real one and the heading's three controls should lose their save, or the
reverse. Nothing is broken by having both; it is just two vocabularies for one
verb. Left exactly as exported.

The plot's heading is also **renameable** now: click it (or its pencil) and it
becomes a 28-character input. Enter or blur commits, Escape abandons, and the
name lands in `knoll-yard:settings` as `plotName`. It defaults to `Your Plot`.

---

## 4 · The gnome, and the tour

A gnome stands beside the K tile at the top of the page, `position:absolute` at
`left:-16px; top:66px`, 96×135. It is a fixed drawing — one hat, one robe, one
beard, no props, no stored state — with three moving parts: its head rotates,
its pupils shift, and its left arm points.

**Idle, it watches your cursor.** A `mousemove` listener on `window` works out
head rotation, pupil offset and arm angle from the pointer's position relative
to the gnome's own box, throttled to one `requestAnimationFrame`. It is off
entirely when the page has been asked to be still (§6).

**Clicked — or focused and Entered — it runs the tour.** Four stops, in this
order, each a card beside the thing it describes with a dashed red ring drawn
round it and the gnome's arm reaching across the page to touch it:

| # | points at | title |
|---|---|---|
| 1 | the plot | Your Plot |
| 2 | the K tile | Your mark |
| 3 | the badges card | Badges & trophies |
| 4 | the spaces-visited card | Spaces you've visited |

**The copy is dummy and knowingly so** — the source says `Copy is dummy for now`
above the `TOUR` table, and all four bodies open `Lorem ipsum dolor sit amet`.
It ships that way on purpose; the four `body` strings in `TOUR` are the only
thing to edit.

### How a stop is placed

`place()` is the whole of it. It measures the target and the gnome with
`getBoundingClientRect`, converts both into page coordinates, and works out
four things: where the card goes (`inside` the target, to its `right`, or to
its `left`, and below 860px a fifth mobile arrangement), where the ring goes,
where the arm should reach, and whether the page needs scrolling to bring the
step into view. It runs on `startTour`, on every `tourNext`, and on `resize`.

**The arm is a spring-mass chasing a target.** `aimArm` sets the target,
`runArm` integrates it at 60fps (`K = 160`, `C = 9`) and stops when it is
within 0.4px and nearly still. **You can grab the hand and throw it** —
`handDown` takes over, tracks the pointer, measures a velocity from it, and on
release hands the spring back its target so it snaps home with a wobble.

The arm is drawn twice: a short one on the gnome's own body for the idle look,
and a long bowed cubic on an overlay `<svg>` at `z-index:17` that runs from the
gnome's shoulder to the target, with the hand rotated to point along the curve.

**A tour frame goes through `setState`, and that is fine here** — which is worth
writing down, because §3 says the opposite about dragging a tree, and the
reasoning is not contradictory, it is measured. The drag optimisation exists
because the plot's twenty-three drawings are expensive to re-walk. With the
plot empty this document is 508 nodes, and the measurement is flat: median
frame 6.1ms idle, 6.1ms while the spring runs, 6.0ms while the hand is being
dragged. **If `plotEmpty` is ever flipped back to false, measure it again** —
that is the change that would make this paragraph wrong.

### Ending it, and remembering

`endTour` clears the state and cancels the spring.
**Whether it runs is the account's, not the device's** (2026-09-21):
`componentDidMount` asks the door (`KnollAccount.me`, account.js) and, for
an account not yet `toured` with the `autoTour` prop on (default true),
starts the tour 900ms after load and tells the door it has (`{ op: 'toured' }`).
So it runs once per account, wherever that first visit is, and `reset data`
does not bring it back. (Until then it was `knoll-yard:tour` on the device, so
every new browser got it.) `skip tour` and Escape both end it; the fourth stop's button
says `done ✓` and ends it too. Clicking the gnome afterwards runs it again
without clearing the key.

---

## 5 · The hills, the fence, the friends

Three regions arrived with the tour and are worth knowing are **mock**, in the
same way §7 says "standing" is mock: they are written down in `renderVals()`,
nothing is fetched, and nothing but the saved spaces and the visits is stored.
(The one hill's mound is the exception to "nothing is fetched": it is a live
page, below.)

**The hills** are a horizon strip under the greeting: mounds on a line, each
one a space you saved, with a signpost, your gnome standing on the one you
were on last, and its flag raised. Hovering lifts a
mound and tilts its sign. **`SPACES` currently holds exactly one entry, and it
is real (2026-09-21): `TOEM 2`**, the hill that stood where the export had
`Mossy's Hollow`. Its sign links to `/toem2/`, and its mound is **the page itself**: an
`<iframe>` of `../toem2/?embed=1` at 800 × 520, scaled by 0.2 to the mound's
160 × 104 inside, `inert` so nothing in it takes a focus or a click. It is the
wall as it is now, not a picture of it — the embed opens the way a first visit
does and seed.js's once-a-minute pull (visible tabs only) keeps it current.
What `?embed=1` leaves out, and why the frame runs on a localStorage of its own,
is the head of `toem2/index.html`; `toem2/probe-embed.js` holds it to that. The
dashboard's picture of this page (`?embed=1` here) draws the mound without the
frame — a whole second bench for a 60px dome.

**The hills are the spaces you saved; Spaces you've visited is where you went**
(2026-09-22). `account.js` writes a visit — path and time, into
`knoll-yard:visits` (§7) — on a space's page when you are signed in; never from
a picture of one (`?embed`). The history lists them newest first ("NOWHERE YET"
until there is one), each a link, with **a flag** beside it: raised, the space
is saved into `yard.favHills` and stands on the hills, in the order saved, your
gnome on the one you were on last. The same flag on a hill, lowered, takes it
down; the visit stays in the history, its flag lowered there too. Nothing is
saved until you save it, and there is no bin any more — every hill up there is
one you chose. Name, link and frame come from the page's own `SPACES` table,
never from storage. Beside the hills, one dashed "unclaimed" mound says `create
page`, and opens Create a Space (§5a).

**The fence** is "At the fence" (its subtitle and its not-wired notice came off
2026-09-22, as Yard View's already had): a like count
you can toggle, a view count, and three notes on tilted paper with initial
avatars. You can leave a note; it is prepended to `this.state.notes` and lost on
reload, which is the honest behaviour for a page with no server.

**Friends** are real now (§5a).

The things in these that ARE stored are the spaces you saved, under
`yard.favHills`, and the spaces you visited, under `knoll-yard:visits` — see §7.

## 5a · Spaces, friends and the bell (2026-09-23)

**Create a Space** is `yard/new/` — the Design Canvas export of that name,
unpacked like the 404 page (every blob was a file the site already keeps).
The `create page` mound opens it. It makes a real page (api/wall.js: SPACES):
the name is its address, `knoll.space/<slug>` (the form shows this host's), and
`space.html` draws it there — vercel.json's last two rewrites and serve.js send
every one-word address with no file behind it to that page. **Two an account**;
the mound, once you have made both, shows YOU CAN ONLY HAVE 2 SPACES PER
ACCOUNT instead of going, and the form says the same before you fill it. The
"?" beside the title is the space's picture (the K's 128px JPEG cut). Steps 3
and 4 are still the export's COMING LATER / PLACEHOLDERS, kept with the space
as chosen. The spaces you made stand first on the hills, with no flag (they
are yours, not saved), their picture in the grass.

**Friends** (api/friends.js) are both ways: ask by tag (`Mossy#3`) in the
Friends box, where your own tag is written; the other gnome says yes or no in
**the bell**, which also hears your yes and every **invite** to a space — sent
by its maker from the form's step 5 or the space's own page. The bell's number
is what came since it was last opened. `lab2/perf/verify-friends.js` checks the
door; the form, the space and the bell were driven with two accounts in
headless Chrome.

---

## 6 · Reduce motion

The drawer has promised **"Reduce motion (calmer wobbles and pops)"** since the
page was built. Both halves of the promise are honoured — the drawer's switch,
and `prefers-reduced-motion` from the operating system, which says the same
thing without being asked — and they now reach everything on the page that
moves:

| what | how it is stilled |
|---|---|
| the plot's sways, bobs, twinkle, falling leaves, carry-jiggle | `.plot-still` on `.plot-yard`, plus a `prefers-reduced-motion` media query beside it. CSS only; these are all CSS `animation`s. |
| the gnome watching your cursor | `this._mouse` returns on its first line |
| the tour's pointing arm | `runArm` snaps to the target instead of springing |
| the tour's scroll to the next step | `behavior: 'auto'` instead of `'smooth'` |

The last three are YARD FIX 6 (§9) and were not honoured as exported. The
gnome and the arm keep *doing their job* — the gnome still points, the tour
still takes you to the step — they just arrive rather than travel. **Dragging
the hand is deliberately still springy**, because that is a thing the visitor is
doing with their own hand, and taking it away would read "reduce motion" as
"reduce the page".

One thing is deliberately left moving: the `transition: transform .25s` on the
arm's own group. With the two rAF loops stilled, that fires once per tour step,
which is what "calmer" ought to mean rather than "nothing at all".

`emailReplies` and `showActivity` are still inert.

---

## 7 · Storage

| key | what |
|---|---|
| `knoll-yard:settings` | display name, `plotName`, email-replies toggle, show-activity toggle, reduce-motion toggle |
| `knoll-yard:plot` | where each piece is now — `{ "the-oak": { x, y }, … }`, percentages, x/y only |
| `knoll-yard:plot-default` | the arrangement `save layout` kept; what `reset layout` returns to |
| `knoll-yard:owner` | the account these keys belong to (§0a); another account signing in sweeps them first. (`knoll-yard:tour`, the tour's old per-device mark, is no longer written or read.) |
| `yard.favHills` | a JSON array of the names of the spaces you saved, in the order saved — the hills (§5) |
| `knoll-yard:visits` | a JSON array of `{ path, at }`, newest first, at most 12 — the spaces you visited, written by `/account.js` (§5). Both lists read as empty when what is stored is not an array. |
| `knoll-yard:wall` `knoll-yard:flatfile` `knoll-yard:gif` | the dock's stores (tools.js: `Lab.store`) — the pieces, the tracing library, the gif tool's key |
| `knoll-yard:touched` `knoll-yard:applied` | when a hand last wrote to the wall or the library; the `t` of the published doc last laid on the paper (§0, which page you see) |
| `knoll-yard:key` `knoll-yard:me` `knoll-yard:liked` | the owner's key for the door; this browser's visitor id for the beacon; whether this browser liked the fence |

**`yard.favHills` is the one key that does not wear the prefix**, and it should:
`knoll-yard:fav-hills` is the name it wants. Renaming it is a migration for
anyone who has already favourited a hill, not a find-and-replace, which is why
it still has the wrong name and why `resetData` names it by hand. If you rename
it, that is the line to change.

`reset data` now sweeps **every key beginning `knoll-yard:`**, plus that one, so
a key invented tomorrow is covered the day it is invented rather than the day
somebody remembers the line (YARD FIX 3).

Only pieces that have been moved appear in `knoll-yard:plot`; anything missing
resolves to its `FOREST` home. `plot-default` is written whole, all
twenty-three, so a kept default does not drift if the shipped arrangement is
re-tuned.

"Standing" (contributions, hills joined, streak), "spaces you've visited",
"your edits", the fence and the friends list are **written down, not stored** —
fixed arrays in `renderVals()`. There is no backing service yet for any of them.
So is the greeting's fallback name, `Morgan`, which is what the page says until
somebody sets a display name.

---

## 8 · Narrow screens

**The page is responsive now**, which it never was before. The old note here
said so plainly: the grid was `minmax(0,1fr) 330px` with no media query, so
below roughly 700px the sidebar's fixed 330 squeezed the main column to nothing
and the cards overflowed and overlapped.

The export brings a real breakpoint at 860px — one column, tighter gutters, a
smaller title and eyebrow — and `overflow-x: clip` on the root. Four hooks
(`.yard-root`, `.yard-grid`, `.yard-title`, `.yard-sub`) exist to carry it.

**`overflow-x: clip` deserves its own paragraph, because it is what hid the
three things §9's first two fixes had to find.** A page that overflows sideways
used to say so with a scrollbar; a page that clips says nothing, and the parts
that fall off the right edge are simply not there. Everything below 860px is
therefore worth *measuring* rather than looking at. As it stands, at 375px:
nothing interactive is off-screen or cut, the document's scroll width equals its
client width, the house bar is flush and full-bleed, and all four tour cards fit
horizontally and land on screen.

---

## 9 · Changes to the export

This file is a Design Canvas export with edits on top. There are two kinds, and
they are different kinds.

### The four edits `recut.js` makes

A DC export cannot know it will be served out of `site/yard/`, so it gets these
four wrong every single time. **Do not do them by hand — run the script:**

```
cd site/yard && node recut.js "<the export .html>" index.html
```

| # | the export | what it must be |
|---|---|---|
| 1 | `<script src="<uuid>">` | `<script src="./support.js">` |
| 2 | the favicon, absent | `<link rel="icon" href="../logo/logo-icon.svg">` **in the real `<head>`, before the runtime** |
| 3 | a block of `@font-face` rules pointing at bundled woff2 uuids | the one Google Fonts `<link>` for Rye + Sora 800 + VT323 |
| 4 | a black `<span>` disc in the house bar | `<img src="../logo/logo-icon.svg" alt="" width="26" height="26">` |

`recut.js` fails loudly if any of the four does not match, rather than writing a
half-recut file, and it checks that no bundle uuid survives.

**Edit 2 is a fix `/signup` and `/login` already carry**, under the same
comment: the helmet is hoisted into `<head>` by `support.js`, i.e. *after* the
runtime boots, and Chrome — finding no icon before then — asks for
`/yard/favicon.ico` and logs the 404 it gets. One line earlier in the document
and it never asks. `/dashboard` still keeps its icon in the helmet and still
takes the 404; that is the next page to fix.

### The ten fixes to the export's own code

Each is marked `YARD FIX n of 10` at the line it changes, with the reasoning
there. Every one was reproduced in a real Chrome before it was written and
measured again after. **Re-apply all ten after a re-cut** — `recut.js` does not
do these, on purpose: they are judgement, not mechanics, and some of them may
have been fixed upstream by the time you read this.

| # | what was wrong | how it showed |
|---|---|---|
| 1 | the 860px query fixes the grid and misses the header, the greeting and the plot | at 360px the **settings button sat at 414→466 — entirely off-screen**, `save yard` was cut at 400, a long display name ran to 581, and the plot box was 543 wide. All silently clipped. |
| 2 | the same query changes the root's padding and not the house bar's negative margins — **the coupling §1 names** | the bar sat 14px above the top of the page with its top cropped, and hung 16px past each edge |
| 3 | `resetData` forgets three keys and there are now five | "wipe everything your yard has saved on this device" left the tour marked seen and your hills favourited |
| 4 | Escape's two arms are in the wrong order | with the drawer open **over** a running tour, Escape reached past it and ended the tour, leaving the drawer standing |
| 5 | the gnome is `role="button" tabindex="0"` with only an onClick | focus it, hear "button", press Enter, nothing happens |
| 6 | nothing new is gated on reduce motion (§6) | with the switch on, the gnome still tracked the cursor and the arm still sprang |
| 7 | `place()` re-runs its scroll on `resize`, not just on step change | resizing during a tour threw the scroll from 1283 back to 594 |
| 8 | `onFile` reports through `said()`, which writes on the **save button** | picking an avatar put "got toadstool.png ✓" on a green save button, for a file that is stored nowhere |
| 9 | `moved` reads stored spots, which load whether or not the plot draws them | an empty plot wore **`MOVED — NOT SAVED`** for anyone who had arranged trees on the previous version |
| 10 | nine SVG geometry attributes carry `{{ }}` the browser's parser reads first | **nine console errors on every load** of a page that used to have none |

Fix 10 is worth knowing as a technique. `sc-camel-` is the runtime's own escape
hatch — `support.js:422-423` strips the prefix and camel-cases the rest with no
allowlist — so `sc-camel-x2` decodes to exactly `x2`, and an SVG parser skips an
attribute it does not recognise instead of complaining about one it does. Same
attribute, same value, no error. It applies to any raw `{{ }}` in a geometry
attribute (`d`, `cx`, `cy`, `x2`, `transform`, …).

Not fixed, and not accidentally: the **Lorem ipsum tour copy** and the **empty
plot** are both shipped as exported at the author's choice. See §3 and §4.

---

## 9a · The doors out (2026-09-06)

Four pages, and until now none of them went to any of the others. Every door
below except the switch was **already drawn by an export and pointed at
nothing** — the work was pointing them somewhere.

| from | the control | was | now |
|---|---|---|---|
| the bar, on `/yard` and `/dashboard` | the two-pill switch | — (new) | each other |
| `/yard`'s page header | the `dashboard` pill | `href="#dashboard"` | `../dashboard/` |
| `/yard`'s settings drawer | SIGN OUT's note | a dead end | a link to `../login/` |
| `/signup`, once sealed | "into the village →" | `href="#"` | `../yard/` |
| `/login`, once through | "into the village →" | `href="#"` | `../yard/` |

**Two ways to the dashboard is deliberate, not an oversight.** The switch is
chrome and the header pill is the page's own call to action, which is an
ordinary pair. If one has to go it is the pill — the switch is the thing that is
in the same place on both pages. (Note this is *not* the same problem as the two
save buttons in §12: navigation is idempotent and both routes say "dashboard".)

**SIGN OUT is a note with a link in it, not a button that navigates**, and the
order matters. There is still no account system: pressing it signs nothing out,
and your plot, your settings and the tour flag all stay on this device. Sending
you to `/login` on the press would have been the page quietly claiming
otherwise. So the press still opens the note the export wrote, the note now says
what it can and cannot do, and the door out of it is a link you take on purpose.
It names `reset data` as the control that actually clears you off this machine.

**The gate pages still send nothing.** `signup/about.md` §5's claim — no
`fetch`, no `XMLHttpRequest`, no `sendBeacon`, no `WebSocket`, no `action=` —
is untouched by this: a link is not a submission. "Into the village →" is simply
the one link on either page that now goes anywhere.

**The gate pages did not get the switch**, and should not: you are not signed in
at a gate, so there is nothing to switch between. Their bars stay as they were.

Verified end to end in Chrome: yard→dashboard, dashboard→yard, header pill→
dashboard, SIGN OUT→`/login`, signup's done state→`/yard`, login's done state→
`/yard`. Zero console errors and zero failed requests on all four.

---

## 10 · Things worth knowing

**Corner-accent colours repeat now, and they did not use to.** The old rule
here was that standing/badges/visited/edits took pink, yellow, green and red,
the plot took blue, and "a new card should pick an unused corner+shape+colour
pairing rather than repeat one". The census today is seven accents and three
blues:

| card | colour | corner | shape |
|---|---|---|---|
| plot | `#5a8fd6` blue | top-left | diamond |
| **fence** | **`#5a8fd6` blue** | **top-left** | **diamond** |
| standing | `#e0598c` pink | top-left | diamond |
| friends | `#5a8fd6` blue | top-right | diamond |
| badges | `#ffd23f` yellow | bottom-left | circle |
| visited | `#7bc264` green | top-right | diamond |
| edits | `#e8484a` red | bottom-right | circle |

The plot and the fence are an **exact** triple match — same colour, same
corner, same shape — and friends shares its corner and shape with visited. The
rule is a good one and it is worth restoring, but which card moves is a design
call, so nothing was changed. Left as exported.

**There are two pinks, three hex digits apart.** `#e0598c` is the documented
one, in `this.C` and on three cards. `#e05a8f` appears once, as a fence note's
avatar background. Almost certainly a typo for the first; changing it is a
one-character edit somebody should make on purpose.

**The plot does not jitter, and that is deliberate.** Every other card takes a
sticker tilt from `rot()` under the `jitter` prop. This one stands straight,
because a rotated box would make its own percentages a lie: the drag maths
reads `getBoundingClientRect()`, which is the axis-aligned box of a rotated
element, and every drop would land skewed. It is a window onto the yard rather
than a sticker on it.

**Visual system matches the Dashboard, not the coming-soon page.** Rye +
VT323, ink `#17120b` / cream `#fdf7e3` / red `#e8484a` / yellow `#ffd23f` /
green `#7bc264` / blue `#5a8fd6` / pink `#e0598c` on a pale lavender paper
(`#ece7f1`) — a different, more "hand-lettered sign" look than the
pink-and-Sora Wallspace hero. That appears to be deliberate: this is the
personal/owner side of the site, not the public marketing page. The gnome, the
hills and the fence bring about a dozen colours from outside that list, but
almost all of them are shading inside a drawing and read as ink rather than as
system.

**React still comes off unpkg.** `support.js` ends in `loadReactUmd()`, which
fetches React and ReactDOM from `unpkg.com` unless they are already on
`window`. `/signup` and `/login` put them there first from `lab2/vendor/`;
`/yard` and `/dashboard` do not, and take two third-party requests per load.
Pre-existing, untouched by this re-cut, and the obvious next thing to copy from
the gate pages.

---

## 11 · What used to be here

The plot's heading used to lead a *different* feature: a fenced plot you
decorated with flowers/trees/ponds/etc. from a palette, and a gnome you dressed
(hat/robe/beard/skin/accessory, a name). It was built, then removed on
2026-09-02 at the user's request, and this file said to ask before putting
anything under the heading.

What went under it on 2026-09-04 was lab 2's forest, stood on the paper and
arranged — §3 — and that was **not** the old feature coming back.

**And the gnome that arrived on 2026-09-06 is not it either, but the slot is
now taken.** The new gnome is a fixed drawing with one job, running the tour: no
palette, no clothing, no name, no stored state, and none of the removed
feature's identifiers (`gnomeArt`, `gnomeAccessory`, `charPiece`, `fenceArt`,
`setCharacter`, `CLOTHING`, `BEARDC`, `SKINC`, `PALETTE`) come back. So a gnome
you dress is *still* an open idea — but "add a gnome to the yard" no longer
means what it meant four days ago, the eyebrow that carried the aspiration
("· YOUR PLOT ON THE HILL · DIG IN, DRESS UP ·") is gone, replaced by a
streak-and-notes line, and the word "fence" has been taken by a visitor wall.
If dressing a gnome is still wanted, it wants asking about again, in those new
terms.

The footer caption used to read **YOUR PLOT AND SETTINGS ARE SAVED ON THIS
DEVICE — NOTHING HERE IS UPLOADED**, and it was true until 2026-09-17. It now
says the page is this device's until SAVE YARD, and published after (§0).

---

## 12 · Open questions

Things this re-cut deliberately did not decide. None of them is broken.

1. **Two save buttons, two vocabularies** for one action (§3). Both now
   publish (§0), so the question is only which word to keep.
2. ~~The empty plot.~~ Settled 2026-09-21: `plotEmpty` defaults true and the
   plot ships blank (it was false from 2026-09-17 to 2026-09-21).
3. **The tour copy** is Lorem ipsum (§4).
4. **`HILLS` has one entry** and the default favourites name three hills that
   do not exist (§5).
5. **Corner accents repeat**, and there are two pinks (§10).
6. **`yard.favHills` is off the `knoll-yard:` prefix** (§7).
7. **React off unpkg** on this page and `/dashboard` (§10).
8. The tour is a `role="dialog"` that **never takes focus** and has no
   `aria-modal`; its buttons are last in the tab order. Keyboard users can now
   start it (fix 5) and end it (Escape), but stepping through it means tabbing
   the whole page. A focus trap is the right fix and a bigger change than
   anything in §9.
