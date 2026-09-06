# yard — how it works

A tour of `site/yard/` for whoever opens it next, agent or otherwise. It
describes what is built and running today. `site/lab2/about.md` covers the
second bench; this one covers a single standalone page.

---

## 1 · What this is

**Your Yard** is a personal home base: a plot of trees you arrange yourself,
your standing on the hill (badges, spaces visited, your own edit history), and
a settings gear that opens a drawer for a display name and a few local
preferences. Everything here is scoped to *this device* (`knoll-yard:` in
`localStorage`, the same convention `lab/ABOUT.txt` uses) because there is no
account system behind any of it yet.

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
the helmet's existing Google Fonts link now asks for alongside Rye and VT323.
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
`#a52c68`. **The three ports disagree on this one value**, and if they are ever
unified this is the number to unify on.

**It sits in normal flow, pulled full-bleed by negative margins** — not on top
of the page by `position:absolute`, which is what `/signup` and `/login` do.
Those two had to: their root is a centred flex row, and a bar joining it would
shove the scroll off centre. This root is an ordinary block, so the bar can
simply *be* the first thing in it — which means the root needs no `position`,
no `z-index` and no padding arithmetic, and a bar that ever grew taller would
push the page down instead of landing on it. It is also what lab 2's own
header does (`flex:none` in a column, not absolute).

The one coupling to keep in step: `margin: -34px -30px 34px` **is the root
div's own padding** (`padding:34px 30px 56px` — 34 top, 30 sides) spelled out,
so the bar reaches the full width of the page instead of sitting inside the
gutter. Change the root's padding and change these. The `margin-bottom` puts
back the 34px of air the top padding used to give the heading.

**Five of lab 2's declarations are dropped.** `flex-wrap`, `max-height` and
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

Adding the bar does not disturb the plot: a piece dropped at a 60%/40% target
still records 59.6% across, so the pointer-to-percent maths is unaffected by
the 51px the page moved down.

---

## 2 · The files

| file | what it is |
|---|---|
| `index.html` | the whole page: helmet (fonts, base CSS, the house bar's rules, the forest's keyframes), the `<x-dc>` template, and the `class Component extends DCLogic` script that computes everything the template binds to — including `FOREST`, the twenty-three drawings. |
| `support.js` | the Design Canvas runtime, copied from `../support.js`. Not ours — do not edit here; edit the one at the site root and re-copy. |

No `yard.css` or `yard.js`. An earlier, hand-built version of this page
(plain HTML/CSS/JS, no Design Canvas) lived here first and was fully
replaced by a Design Canvas export.

---

## 3 · The plot

Under the "Your Plot" heading is a 16:9 box with **twenty-three forest parts
standing in it** — sixteen trees, four patches of grass, three clumps of
mushrooms. You drag any of them anywhere; `save layout`, `reset layout` and
`reset data` sit on the heading's line, and are lab 2's three controls doing
lab 2's three jobs.

**The drawings are lab 2's, verbatim.** They come out of
`site/lab2/features/forest.dc.html` — one Design Canvas sheet with a `part`
prop and twenty-three `<sc-if>` arms, which lab 2 points twenty-three iframes
at. This page is not a bench and has no iframes, so the SVG came across *as
SVG*: `FOREST` at the head of the script block is the export's own markup, part
by part, with the four palette holes the sheet fills in (`{{ leafMain }}`,
`{{ leafDark }}`, `{{ leafLite }}`, `{{ capA }}`) already filled in at the
sheet's own defaults — summer leaves, a red toadstool — and the
`{{ sparkles }}` gate resolved open, the way its default resolves it. Every
path, every stroke width and all four animations are the drawing's; the
extraction was checked element-for-element against the sheet.

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
layout for one window.

**The pile is the ground.** `z-index` is computed from `y` and nothing has a
stacking order of its own: lower down the plot is nearer, so it stands in
front. That is the one rule that makes a plot of trees read as depth rather
than as overlap. It costs the ability to put a small far tree in front of a big
near one, which is a thing a yard does not do anyway.

**The plot box isolates**, and not for tidiness. Those z-indexes run into the
hundreds; without a stacking context of its own they would be the *page's*
numbers, and a tree would paint straight through the settings drawer's scrim
(`z-index: 20`) and stay draggable behind an open modal. `isolation: isolate`
on `.plot-yard` is the whole fix.

**A carry is written straight onto the node.** `grab`/`haul`/`letGo` take
pointer capture and then set `style.left` / `style.top` directly until the
thing is put down; only the drop goes through `setState`. A drag is sixty of
these a second and the other twenty-two drawings have not moved. The handlers
use `e.currentTarget` and never `getElementById` — the piece that got the
pointerdown is the node to move.

**Arrows nudge a focused piece** one percent at a time, five with shift. The
pieces are `tabindex="0"` with their lab 2 names as `aria-label`.

### Save, reset, reset

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
this page ships with, and what a first visit gets. `reset data` wipes all three
`knoll-yard:` keys, settings included, and reloads.

The vocabulary is lab 2's, and worth keeping: **the pill is a state and the
button is an event.** `MOVED — NOT SAVED` answers a glance; `saved ✓` answers a
press, for 1600ms, on the button's own face — a press you cannot see the result
of is a press you make twice. `no change` is the other half of that, and the
half most worth copying: a save that did nothing and a save that did something
look identical on a page where the trees have not moved. `DEFAULT SAVED 14:32`
is `keep.js`'s clock, meaning the same thing it means over there.

The `save layout` tooltip is lab 2's, word for word: *"save this arrangement as
the default layout (ctrl+s) — reset layout comes back here"*.

---

## 4 · What used to be here

The "Your Plot" heading used to lead a *different* feature: a fenced plot you
decorated with flowers/trees/ponds/etc. from a palette, and a gnome you dressed
(hat/robe/beard/skin/accessory, a name). It was built, then removed on
2026-09-02 at the user's request — the plot, the palette, the fence artwork and
the whole character editor came out of both the template and the script, along
with everything that only existed to serve them (`pieceArt`/`pieceDown`/
`gnomeArt`/`gnomeAccessory`/`charPiece`/`fenceArt`/`darken`/`setCharacter`, the
`plot`/`character` state and their `knoll-yard:*` storage keys,
`CLOTHING`/`BEARDC`/`SKINC`/`PALETTE`). The heading was kept on purpose, and
this file said to ask before putting anything under it.

What went under it on 2026-09-04 is §3, and it is **not** that feature coming
back: there is no palette, no fence and no character, nothing is spawned or
deleted, and none of the old names were revived. It is lab 2's forest, stood on
the paper and arranged. A gnome you dress is still an open idea and still wants
asking about; the eyebrow under the title still says DRESS UP and is still
aspirational.

The footer caption moved with it. It said settings only, because with no plot
left "your plot and character are saved on this device" would have been false;
it now reads **YOUR PLOT AND SETTINGS ARE SAVED ON THIS DEVICE — NOTHING HERE
IS UPLOADED**, which is true again for exactly two things. The second clause
survives only while the layout never leaves the device — the page has no
`fetch`, no beacon and no analytics, and the caption is a lie the moment one
turns up.

---

## 5 · Storage

| key | what |
|---|---|
| `knoll-yard:settings` | display name, email-replies toggle, show-activity toggle, reduce-motion toggle |
| `knoll-yard:plot` | where each piece is now — `{ "the-oak": { x, y }, … }`, percentages, x/y only |
| `knoll-yard:plot-default` | the arrangement `save layout` kept; what `reset layout` returns to |

Only pieces that have been moved appear in `knoll-yard:plot`; anything missing
resolves to its `FOREST` home. `plot-default` is written whole, all
twenty-three, so a kept default does not drift if the shipped arrangement is
re-tuned.

"Standing" (contributions, hills joined, streak), "spaces you've visited"
and "your edits" are **written down, not stored** — fixed arrays in
`renderVals()`. There is no backing service yet for any of the three.

---

## 6 · Things worth knowing

**Corner-accent colours don't repeat.** Standing/badges/visited/edits use
pink, yellow, green and red respectively (one diamond, one circle, one
diamond, one circle) — a reader tells the cards apart at a glance before
reading any of them. The plot took **blue** (`#5a8fd6`), top-left, diamond: the
last colour in `this.C` that was not already an accent. A new card should pick
an unused corner+shape+colour pairing rather than repeat one.

**The plot does not jitter, and that is deliberate.** Every other card takes a
sticker tilt from `rot()` under the `jitter` prop. This one stands straight,
because a rotated box would make its own percentages a lie: the drag maths
reads `getBoundingClientRect()`, which is the axis-aligned box of a rotated
element, and every drop would land skewed. It is a window onto the yard rather
than a sticker on it.

**`reduceMotion` is honoured here first.** The drawer has promised "Reduce
motion (calmer wobbles and pops)" since the page was built and nothing had ever
read it; twenty-three swaying trees are the loudest thing on the page, so
`.plot-still` kills every animation inside the plot — the sways, the bobs, the
twinkle, the falling leaves and the carry-jiggle. `prefers-reduced-motion` from
the operating system does the same thing without asking. `emailReplies` and
`showActivity` are still inert.

**Visual system matches the Dashboard, not the coming-soon page.** Rye +
VT323, ink `#17120b` / cream `#fdf7e3` / red `#e8484a` / yellow `#ffd23f` /
green `#7bc264` / blue `#5a8fd6` / pink `#e0598c` on a pale lavender paper
(`#ece7f1`) — a different, more "hand-lettered sign" look than the
pink-and-Sora Wallspace hero. That appears to be deliberate: this is the
personal/owner side of the site, not the public marketing page. The forest came
over needing nothing: its summer `leafMain` is `#7bc264`, the same green.

**The page has never been responsive, and still is not.** The grid is
`minmax(0,1fr) 330px` with no media query, so below roughly 700px the sidebar's
fixed 330 squeezes the main column to nothing and the cards overflow and
overlap. This predates the plot — the original page put the "Your Plot" heading
under the standing card at 375px too — and was left alone rather than quietly
redesigned. The plot itself is fine down there; it is the column it sits in
that is not.
