# lab 2 — how it works

A tour of `site/lab2/` for whoever opens it next, agent or otherwise. It
describes what is built and running today, not what was planned. Lab 1 has its
own, longer tour in `../lab/ABOUT.txt`, which covers what Knoll *is*; this one
covers only the second bench.

---

## 1 · What this is

Lab 1 is a workbench of hand-written gizmos in panels. **Lab 2 is the same idea
with the panels taken off.** Every feature on it is a *design-canvas export* —
a `.dc.html` file that was drawn in Design Canvas and is running here live,
sitting on the paper as itself. No cases, no title bars, no handles.

The bench moves like Figma's canvas — and picks things up like it too. Hold the
scroll wheel or space and drag to pan, scroll to pan, ctrl+scroll or pinch to
zoom, `shift 1` to fit everything. Dragging the **bare paper** pulls a band out:
everything it touches is picked, shift-click adds one or drops one, dragging any
picked feature carries the whole pick, and a click on the paper or `esc` puts it
down. §3 has where that lives.

There are **84 framed panels off 71 drawings** — the extra thirteen are the
two groves in §49, which are three of the forest's trees standing more than
once — plus one sign, a tool dock that draws on the paper, and a strip of
caution tape.

> **Both counts are written out in prose.** They mean different things and are
> not interchangeable: **eighty-four** is how many panels are on the paper,
> **seventy-one** is how many drawings they are of. If you add or remove
> either, `grep -rn "eighty-four|seventy-one"` and fix every one —
> `index.html` (×2), `lab.js`, `frames.js` (×3), `lab.css`, and here.

---

## 2 · The files

| file | what it is |
|---|---|
| `index.html` | the page, and **the layout**. One `<section class="gz">` per feature, each carrying its home position. The comments in here are where every position is argued for. |
| `lab.js` | the world: the camera, the grid, dragging, homes, z-order, the `store()` helper, the keyboard. |
| `frames.js` | the iframe machinery — loading, waking, un-papering, measuring and cutting each feature. The hardest file; read its header first. |
| `lab.css` | everything painted by the bench itself: the sign, the tape, the frames' chrome, the dock. |
| `sign.js` | the gnome who hoists the K when you click a letter. |
| `tape.js` | the caution tape prop. |
| `vol.js` | the dock's speaker, and every noise the bench makes (synthesised, no audio files). |
| `stickers.js` | the sticker drawer — STICKER on the dock: the kits that came with the bench, carried out onto the paper. |
| `wall.js` | the tool dock — pen, stickers, notes, colours, undo. The biggest file, and self-contained. |
| `ink.js` | ctrl held: the hitbox becomes the drawing rather than the box round it. §3 has it. |
| `spotlight.js` | a page a frame opens to read gets the whole screen: the bench dimmed edge to edge with a hole where the page is, the camera glided to it, a click in the dark to close. The feature asks by marks in its file (`data-lab-reads`, `-scrim`, `-page`, `-close`); ADDING.md §3 has them. |
| `cursors.js` | everybody else on the bench, as a cursor in a colour of their own: browser to browser over WebRTC, the visitors finding each other through the public Nostr relays via trystero (`vendor/trystero-nostr.js`, fetched after the page has loaded and gone idle). No server, nothing kept; what another visitor learns is your IP address, as at the other end of any WebRTC call, and where your pointer is. Its header has all of it. |
| `keep.js` | the autosave: every 30s it posts where everything is to `serve.js`, which writes it into `index.html` as the default look. §7 has all of it. |
| `kits.js` | the trees, the gnomes and the village pieces, drawn on the bench without a frame each — sprites on a tile far away, live svg near. §9 has it. |
| `posters/` | a picture of every machine, for the box to hold until the document is worth booting; built by `perf/posters.js`. §9. |
| `fonts/`, `vendor/` | the house faces, the two React builds and the trystero bundle, served from here rather than Google, unpkg or a CDN. |
| `perf/` | the measuring kit: `measure.js` (the pan harness), `verify.js` (the gestures), `kitgeo.js` (where every kit part sits), `posters.js`, and the probes that found the numbers in §9. |
| `../serve.js` | the local server — `npx serve` with the door `keep.js` posts through. Not deployed and not needed to *view* the bench, only to save one. |
| `features/*.dc.html` | the 71 drawings, in 16 files — four of them serve many frames apiece, `forest.dc.html` most of all at 36, then `village.dc.html` at 23. Three of the files are KITS (forest, village, gnome) and are read by `kits.js` rather than framed; see §9. |
| `features/support.js` | the Design Canvas runtime. Not ours — do not edit. |
| `features/bare.css` | three rules that take each feature's own full-bleed paper off, so it sits on the bench's. |

**Serve it over HTTP.** `node serve.js` from `site/`, or the `knoll-lab` config
in `site/.claude/launch.json`, which runs it. `npx serve` still works and is
still fine for looking — the only thing it costs you is the autosave in §7,
because that needs a server that can write. Opened off the disk the frames are cross-origin and
`frames.js` cannot reach into them — which is exactly why `bare.css` exists, so
the worst case is still legible rather than broken. React and the fonts are
served from `vendor/` and `fonts/` since 2026-09-04, so nothing on the bench
waits on unpkg or Google to paint; `features/support.js` keeps its own unpkg
fallback for a document opened off the disk.

---

## 3 · The world

`#bench` is the viewport. `#bench-world` is the sheet inside it, **scaled** by the
zoom and — since 2026-09-03 — **scrolled** rather than translated: the bench is
a scroll container with its scrollbars hidden, the sheet holds still inside a
room (`#bench-room`) sized to the camera's reach, and a pan is a scroll offset.
Nothing about the API below changed; see *Why a pan is a scroll* under §10.

```
Lab.zoom            the scale, Z
Lab.pan             {x, y}, the sheet's offset from the bench's top-left, in screen px
Lab.toWorld(cx,cy)  screen → world
Lab.toScreen(x,y)   world → screen
```

Everything on the sheet is positioned in **world units** and everything you
measure from a pointer must go through `Lab.toWorld`. World units are not
pixels; at 30% zoom one world unit is a third of a pixel.

### Where it opens

A first visit frames the lockup with the wood either side of it — `lab.js`,
search **WHERE IT OPENS**. The rectangle is `x 568 … 3768, y −2190 … −800`,
which on a wide screen lands at 80%: the mark top-centre, the scroll beside
it, the wordmark, the builder and the rule book, the cards' column just in
on the left, trees either side. On a laptop it is the same picture,
smaller. It is used once; the camera is saved the moment it moves, and
`reset data` is the way back to it.

**What a first visitor sees, and when** (`perf/boot.js`, cold cache, 2560
wide, 2026-09-04): the sign and the header faces at 235 ms, the kit sheets
parsed at 610, everything in the frame drawn at 955 — the trees live and
swaying, the gnomes, the mushrooms, the machines' posters — and the first
document booted at 1.15 s. It was 8.8 s to DOMContentLoaded before that
day, and the whole of it was the parser building an about:blank document
for every one of the seven hundred `<iframe>`s in the kit sections; the
kit sections carry a `.gz-art` and no iframe now (serve.js writes copies
the same way), and the opening frame's pieces are preloaded from the head.

### Picking things up

`lab.js`, search **AND WHAT IS PICKED** and **DRAGGING THE BARE PAPER: THE
BAND**. A `Set` of elements and a `.picked` class on each, which wears the same
dashed crop marks a feature wears while it is being carried — chosen and being
moved are one state a beat apart.

The band is anchored in **world** coordinates and painted in **screen** ones:
fixed to the viewport rather than a child of the sheet, so its dashes are one
weight at every zoom, while the corner you started from stays nailed to the
paper when the edge-scroll drags the camera out from under you. It waits for four screen pixels
of travel, the same threshold the pan uses — under that the gesture was a click
on the paper, which is how you put a pick down. Selection is **not** saved;
everything else about the bench is.

Two things it is worth knowing it does not do. A finger still **pans** anywhere
it lands, because a finger has no space bar and no middle button, so the band is
a mouse gesture only. And it picks what it **touches** rather than what it
encloses: half of what is on this sheet is bigger than a screenful at the zoom
you would want to gather it at.

### Ctrl: the hitbox becomes the drawing

`ink.js`. Every feature is a rectangle and most of the drawings in them are not
— a tree is a triangle with a lot of paper round it. Over the two groves in §49
that is not a nuisance but the whole problem: the boxes lie on top of one
another, so the tree you get is whichever box is on top rather than whichever
tree you were pointing at. Sampled across the west grove, **38%** of the points
a box catches disagree with what is painted there, and a third of them have
nothing painted on them at all.

Hold **ctrl** (or ⌘) and the boxes stop being clickable. What answers the
pointer is what is *painted* under it, so a click in the gap between two
branches goes past both of them. The tree you would get is **outlined along its
own silhouette**, and a dotted hairline shows the box you would then be
carrying.

That outline is a **flat copy of the drawing, laid behind the drawing** inside
the frame and spread 2.5px by four hard drop-shadows — so the rim that shows
past the edges is the real shape, overlapping leaves and trunk read as one, and
no path library had to union anything. The first version was a blurred
`drop-shadow` on the iframe from outside, and it was wrong twice over: a halo
rather than a line, and traced from the frame's finished pixels, which include
each drawing's own hard `drop-shadow(rgba(0,0,0,.3) 6px 7px 0)` — so it came
out fat and offset to the south-east, hugging the shadow instead of the tree.
From outside the frame that is not fixable; by then the shadow *is* the picture.

Two things keep the copy honest. It is **phase-locked** to what it outlines —
half these drawings move, and 1.2° of sway on a 130px canopy is very nearly
three pixels, so every animation on the copy is wound to where the original's
has got to. And it carries `data-lab-ink`, which `frames.js`'s `extent()` skips:
it is a copy of the thing being measured with 2.5px added on every side, so a
fit that ran while it was up would grow the frame, and go on growing it. That
one line is the whole contract between the two files.

**It re-targets and nothing else.** `pointer-events:none` goes on every feature
the pointer is not painted on, and the browser's own hit-testing delivers the
press where it was always going to — so the drag, the pick, shift-click, the
click-to-wake, the corner and the undo stack are all the same code acting on a
different element. Which is why the gestures compose for free: ctrl+drag carries
the one tree, and shift+ctrl+click puts that tree in the pick and nothing else.

The question is asked of the frame itself — map the pointer into its viewport,
call `elementFromPoint` **inside** it — so the geometry is the browser's real
SVG hit-testing and not a re-implementation of it. Three answers are a miss: the
body, the screen root, and *the outermost `<svg>`*, which means inside the
drawing's box but on none of its shapes. `ownerSVGElement` is null on that one
element and set on every shape in it, which is the whole test. The HTML machines
come out right for nothing: their own DOM is their ink, so the margin round the
Spawn-O-Matic misses and the machine hits.

Three things it deliberately does not do. It **will not guess** — a frame that
has not loaded, or one opened off the disk where `contentDocument` is null, is
treated as a hit on its box, so ctrl never makes anything unreachable. It
**freezes at the press**, because a drag carries the feature under the cursor
and a hit test re-run on every move of it is a test whose answer keeps changing.
And the copy is only made for a **drawing** — a screen holding svg and nothing
else. The machines are React layouts with canvases in them, and a flat copy of
one is a pink rectangle that says nothing the box outline has not; they, and the
sign, keep the plain outline.

One overlap to know about: **ctrl is also the zoom modifier.** A wheel puts this
to sleep so ctrl+scroll does not blink a highlight on under the cursor, and it
wakes on the next thing the pointer does.

### Putting it back

`ctrl`/`⌘` + `z`, and the dock's **undo** button, are the same thing. Two stacks
sit behind it: what has been **made** (ink and pictures, in `wall.js` — **ONE
UNDO, TWO STACKS**) and where things **are** (`lab.js` — **AND WHAT CAN BE TAKEN
BACK**). Every entry on both is stamped off **one counter**, `Lab.stamp()`, so
"the last thing you did" is a comparison rather than a guess. `wall.js` owns the
button and does the comparing; `lab.js` binds the key and asks it.

It is **chronological, not a priority**: a line drawn over a card you just moved
comes back off before the card goes home, because that is the order the two
happened in.

### Moving anything is undoable

The position stack is a list of **closures**, not of positions — each entry is a
way to put one gesture back, handed over by whoever owns the thing that moved:

| owner | what it puts back |
|---|---|
| `lab.js` | a feature, or a whole band-picked crew of them; `reset layout` |
| `tape.js` | a strip of caution tape — moved, or either end pulled |
| `wall.js` | anything the dock has put on the paper: notes, stickers, stamps, pixel art, a stroke dragged somewhere else |

`Lab.remember(fn)` is the whole of the contract, and none of the three needs to
know how to restore the other two. A note about the awkward ones: a stroke and a
square of pixel art carry their position *inside* their path data, so `wall.js`
keeps a **copy of the item** rather than an offset to undo by — one copy beats
three inverses.

One entry per *gesture*, not per thing — a drag carrying six picked features
comes back as one press. A press that moved nothing (every click that wakes a
feature is a drag of zero pixels) is not recorded at all. Undone features
**ping** rather than being lifted or flown to: re-stacking the sheet would be a
change undo could not itself take back.

What it does **not** cover: the camera, a frame re-cut by its corner, a note
re-wrapped by its grip, and destroying anything — a strip dropped on its own ✕,
or the dock's `clear`, which says in its own dialog that it cannot be undone.
Sixty deep, and — like the pick — **not saved**. The exceptions: a paste
(below), a **delete** off the right-click menu, and the **pile** — raise, lower,
and the top-of-the-pile a drag leaves its crew at all come back with one press.

### Copy and paste

`ctrl`/`⌘` + `c` takes whatever is **picked**, and if nothing is picked,
whatever is **awake** — so the plain gesture works: click a feature, `ctrl+c`,
`ctrl+v`. A band round six and one `ctrl+c` takes all six. `lab.js`, search
**COPY, AND PASTE**.

A copy is a **real feature**, not a picture of one: its own section, its own
name, its own saved position and size, running the same document. Two
Prize-O-Trons on the paper are two working machines — they share a `.dc.html`
the way the ten gnomes do, and nothing inside either is visible to the other.

Four things worth knowing:

- **The name is the trick.** Everything the bench remembers is keyed by
  `data-gizmo`, so a copy gets `<stem>-copy-<uid>`. The stem survives copying a
  copy, so you get siblings rather than a name growing a word each time.
- **They last.** The list lives in `knoll-lab2:copies` and is rebuilt at boot
  *before* anything is registered, so the sweep that registers the markup's
  sections picks the copies up in the same pass — and `frames.js` adopts them
  when it runs after `lab.js`. A feature you can make but not keep is a toy.
- **A paste is undoable**, and it is the only thing on the bench that destroys
  a feature. `unpaste()` tells the pick, the gizmo list, `frames.js`
  (`Frames.drop`), the saved position and the copies list.
- **The sign cannot be copied.** It has no `data-src` — it is live DOM with
  `sign.js` driving it, and a second one would be a gnome who does not lift.

`Frames.adopt(el)` is the other half: the per-feature setup, pulled out of its
boot loop so a section built at runtime gets the same shield, corner, lazy load
and fit as one that was written down.

---

## 4 · What a feature is

A `.dc.html` is a whole **document**, not a fragment: `support.js` boots it by
finding the one `<x-dc>` in `document` and appending a stylesheet to
`document.head`. Forty-eight of those on one page is not something you talk
into behaving, so each one gets an iframe. **The iframe is plumbing. Nothing
about it is drawn.**

`frames.js` solves four problems, all documented at length in its header:

1. **It must not eat the wheel.** A transparent `.gz-shield` sits over every
   feature; the document under it is dead until you click. Click and it drops;
   the shield returns when the pointer leaves, on `esc`, or when a drawing tool
   comes up.
2. **Without a handle bar, the shield is the handle.** A press that ends where
   it began is a click and wakes the feature; one that travels more than 5
   screen pixels was a drag, and the click after it is thrown away.
3. **It must not all load at once.** A frame's `src` is set only when it comes
   into view.
4. **It has no size of its own.** Every screen is `min-height:100vh`, so it is
   as big as the box it is handed. So the drawing is *measured* and the frame
   is given its own size.

### Box, ink and the fit

**A frame nobody has re-cut is the size of its drawing**, and that is where
every default on this bench comes from. `frames.js` walks the document, skips
the full-bleed wrappers, stops at anything that clips, adds each element's
shadow spill, and takes the resulting rectangle as the natural size.

So, as a rule you can rely on when laying things out:

> **A box is its artwork.** The gaps written down in `index.html` are the gaps
> you see on the paper.

Re-cutting a frame by its bottom-right corner **scales** the drawing rather
than cropping it — a smaller box is the same drawing smaller. Double-clicking
that corner fits it back. Sizes live in `knoll-lab2:size2:<feature>`.

### `data-scale`

The one way the markup gets an opinion about how big a feature is drawn: a
multiplier on that natural size. It is **not** a box — a box guessed at in the
markup goes stale the moment the drawing changes, which is why none are written
down any more — so the frame goes on following its drawing, at that fraction of
it, and the corner, the double-click and `reset layout` all work off the same
number. Use it for scale between two drawings that were never drawn to one, and
use it rarely: it is on exactly one section, `gz-gnome-librarian`, at two
thirds, because a gnome at his own full height beside the rule book is a man as
tall as the book he is reading.

One thing `data-scale` changes about the *fit*, and it is in `place()`: a
scaled frame is scaled **from the outside** even before it has been measured,
using the composed viewport as a stand-in for the ink. Every other box starts
out bigger than the document inside it, so an unmeasured frame at 1:1 crops
nothing and the stylesheet's `width:100%` is right; a scaled box starts out
*smaller*, and a document nothing is scaling would sit there cropped to its
middle. It matters most exactly where `measure()` cannot help — off the disk,
where every frame is cross-origin and `natW` never arrives at all — and it
works there because the frame's width, height and transform are the parent's
DOM, not the child's.

**Two exceptions to 'a box is its artwork', then: that one, and the rule
book.** Its drawing is a book that opens, and
the open spread's pages are parked in the layout *beside* the closed cover — so
its box is 1196 × 704 while the cover you can see is 444 × 624, sitting 478 in
from the box's left edge. That 478 is empty paper you can still grab. See `06 ·
THE RULE BOOK` in `index.html`.

### `data-w` / `data-h`

**Not the box.** They are the viewport the drawing was *composed against*, and
all they do now is give the measurement somewhere to happen. Set them big
enough that the drawing does not reflow or grow a scrollbar inside them.

### Drawings that must not change size

Some features animate. That is fine as long as the *measurement* is stable,
because `frames.js` measures at boot, again when the fonts land, once more a
beat later, and then watches the screen root — which is `min-height:100vh` and
never changes.

Both animated features solve this the same way: everything is positioned inside
a fixed-size **stage**.

- `gnome-bubbles.dc.html` — a `760 × 280` stage; a round thought bubble and a
  square speech bubble both live inside it.
- `mailbox.dc.html` — a `940 × 445` stage; the envelope flies, the door shuts,
  the flag rises and a receipt pops, and it measures 940 × 479 throughout.

Take the height off either stage and the frame starts re-cutting itself every
few seconds.

---

## 5 · The layout

Home is `data-home-x` / `data-home-y` on the section. `reset layout` puts
everything back there. Positions are saved per gizmo in
`knoll-lab2:pos:<gizmo>`.

The sheet has two regions:

### The lockup — negative y, around x 1408 … 3530

Eleven things that are **not a row of features but the coming-soon page, laid
out on paper**: badge and wordmark across the top with the scroll beside them,
three cards cascading down the left, the **builder** in the middle with the
speech bubble aimed at his hat, the rule book off to the right with the
**librarian** reading at the foot of it, the banner under the lot — and, below
all of that, the mailbox.

The opening rectangle stops at the **banner**, not at the mailbox: the banner is
the line the page is an argument for and the mailbox is what you do about it, so
the ask sits a nudge below the fold rather than shrinking everything above it to
fit. That is a choice, and `lab.js`'s four numbers are where it is made.

Its spine is **x = 2300**, the wordmark's own centre. The banner is middled on
it; nothing else is. The composition leans right on purpose.

### The field — y ≥ 0

The seven machines in rows from the origin, and **eight** of the ten gnomes in
two columns off to the left at negative x. Untouched, and a screen down and to
the right of where you land.

The other two gnomes are up in the lockup, and so are the speech bubbles, which
used to hang over the pointer down here.

### The forest — x −3300 … −1774, y 0 … 2406

Sixteen trees, four patches of grass and three clumps of mushrooms, off one
sheet, laid out as a nursery beside the gnome columns with 414 of paper between
the two troops. It is a **kit, not a composition** — parked on the side until
something up in the lockup wants a tree.

Four columns 400 apart and tree rows 460 apart, in the sheet's own reading
order; the grass and the mushrooms take the two rows under that at steps of 520
and 300, because a patch of grass is 160 of ink and the rhythm that suits a
canopy leaves a hole under one. `26–48` in `index.html` has every number.

**The name plates are gone** — the export prints one under each part, and they
come off in `forest.dc.html`, not out here. A plate makes a drawing a specimen,
and a tree with THE OAK printed under it is a page from a catalogue rather than
a tree in a wood.

### The village — x −1360 … −120, y 3060 … 4570

The second kit, and the same kind of thing: four houses, two pines, a well, a
fence, a lamp, the signpost, three villagers, three clumps of toadstools, a
bloom, a sprig, stepping stones, a boulder, the sun, the moon and a firefly —
twenty-three parts off one sheet, one of everything, in the sheet's own reading
order. `village.dc.html` serves all of them, the way `forest.dc.html` serves the
forest.

**Under the troop rather than beside it.** The paper to the left is spoken for,
and the 414 between forest and gnomes is a gap that is doing something — it is
what stops one troop reading as the far edge of the other. So the village sits
below the gnomes on their own left edge, and the paper between the two is that
break turned through ninety degrees: 407 under the troop's own feet, whose ink
ends at 2653, and 400 at its tightest, under the forest's last row of mushrooms
at 2660.

Six rows — houses, what stands up, the street, the villagers, the ground, the
sky. Columns 280 apart, 66 clear of the widest ink down here; the rows step by
what is in them (280 / 450 / 260 / 220 / 170), which lays 78 to 82 of air under
each, where a single step big enough for the 370 of the near pine would leave a
crater under the toadstools. **The ground row is five across**, not four:
everything in it is smaller than `frames.js`'s 120 × 90 floor and gets that box
anyway, so five near-empty windows read as a handful of small things where four
read as a row that lost one. `62–84` in `index.html` has every number.

There were **no name plates to take off** this one — the sheet is just the parts
side by side, which is the one job the forest needed doing that this did not.

### Numbers say where a thing was drawn

Four sections are numbered where they were **drawn** rather than where they now
live: the **rule book** at `06`, with the machines; the **builder** and
**librarian** at `20` and `21`, with the troop; and the **gnome bubbles** at
`15`, written down after the gnomes so the balloon paints over the builder's
hat. Renumbering the rest to tidy four moves would make every comment on the
page a liar, so each carries a note saying where it went and why.

### The sign

`#gz-logo` is the one `.gz` with **no `data-src`** — it is live DOM, not an
iframe, because an SVG in an `<img>` goes soft when you zoom into it and this
one is zoomed into. It takes the bench's dragging and none of the iframe
machinery. `lab.css` places its badge and wordmark; `sign.js` runs the gnome.

### Pile order is markup order — until you say otherwise

At rest a feature is drawn at `Z_FLOOR + rank`, and its **rank** starts out as
markup order: **the last section written is on top.** The three Knoll cards are
deliberately listed consensus → rules → fans so the pile deals downward, and the
gnome bubbles are written down after the gnomes so a speech balloon with the
point of a hat poking through its bottom edge is a balloon *behind* a gnome. The
cost is that markup order is pointer order too — the balloon's frame takes every
press inside it, including the top 165 of the builder, so he is grabbed by his
beard and not by his hat. `15` in `index.html` argues it out.

**Right-click a feature** and the menu has the other lever: **raise** puts it
just over the lowest thing that covers it, **lower** puts it just under the
highest thing it covers, and with nothing in the way either goes all the way.
One step *past something*, not one number — in a pile of eighty-four the next
number is usually a machine on the far side of the sheet. The menu stays open so
you can step again, and says `layer 12 of 84`. Both are undoable, and both act on
the whole pick if the feature is in it.

**A drag puts what it carried on top** — that is where it was while you were
moving it, and a thing that sinks when you let go reads as a bug. Undo puts the
pile back along with the positions. **A click does not**: waking a gnome lifts
him over the pile while he is in use (`Z_FLOOR + n + rank`, so a crew lifted
together keeps its own order) and the next press on anything else puts him back
down at his rank. The lift is a moment, not a fact, and nothing writes it down.

The rank *is* written down — `knoll-lab2:z:<gizmo>` here, `data-home-z` in
`index.html` once the autosave has been round — so the overlap you arranged is
the overlap everybody gets. `restack()` in `lab.js` is the one place a rank
becomes a `z-index`.

---

## 6 · The props, and the z-band

A sticky note and a strip of caution tape are **props**: they lie on top of the
bench by definition, because tape that goes under the thing it is cordoning off
is not tape. So the features get a band of their own — `Z_FLOOR = 10` to
`Z_CEIL = 1000` in `lab.js`, two ranks per feature (at rest, and lifted) with room
for four hundred more sections — and everything above `Z_CEIL` is in `lab.css`:
the notes at 1060, the tape at 1070, the band at 1080.

The **caution tape** (`tape.js`) spans two points rather than having a width:
each end is a handle you drag, so length *and* angle fall out of where the ends
are. Drag the printed middle to move the whole strip.

---

## 7 · Storage

Everything is `localStorage`, all under one prefix. `reset data` (top of the
page) wipes the lot; `reset layout` only sends the features home.

| key | what |
|---|---|
| `knoll-lab2:cam` | the camera — `{z, x, y}` |
| `knoll-lab2:pos:<gizmo>` | where a feature was dragged to |
| `knoll-lab2:size2:<feature>` | a frame the corner has re-cut |
| `knoll-lab2:tape` | the caution tape strips |
| `knoll-lab2:wall` | everything the dock has drawn |
| `knoll-lab2:copies` | the features pasted onto the paper, rebuilt at boot |
| `knoll-lab2:z:<gizmo>` | its place in the pile, once something has been raised, lowered or dragged |
| `knoll-lab2:gone` | the features the menu has taken off the paper, left off at boot |
| `knoll-lab2:flatfile` | the tracing table's flat file — every tracing filed, paths and all |

The **pick** and the **undo stacks** are the two things deliberately not in
here: both are a memory of the last few minutes of your hands, and a bench that
opens offering to undo something you did on Tuesday is remembering the wrong
thing. After a reload, undo pops ink, exactly as it always did.
| `knoll-lab2:vol` | the speaker |

`Lab.store(key, defaults)` is the helper — `get` / `set` / `update` / `on` /
`reset`, saved on every write and registered so `reset data` can reach it.

### The default look, and the autosave

The table above is **this browser**. `index.html` is **everybody's**: a
`data-home-x` is where a section sits for a visitor who has never been here,
and §49 says it about the planted trees — *a pasted copy lives in somebody's
browser and a grove that is part of the default look cannot*.

Moving the first into the second used to be done by hand: read the numbers off
the screen, type them into the file. `keep.js` does it **every 30 seconds**.

| in the browser | becomes, in `index.html` |
|---|---|
| where a feature was dragged | `data-home-x` / `data-home-y` |
| a frame the corner has re-cut | `data-cut="700x640"`, and its `style` |
| a feature you pasted | a whole `<section>`, in the copies block |
| what is over what — raise, lower, or a drag | `data-home-z` |
| a feature the menu took off the paper | `data-gone="1"` — the section stays, with a word on it |

### Save now

**save layout** in the header, or **ctrl+s**, does the same write the timer does
— asked for by hand. Thirty seconds is short and still long enough to close a
tab in, and *is what I just did written down?* is a question the bench should
answer on demand rather than eventually. The button says `saved ✓` (or
`no change`) for a beat; the pill says which minute.

**And `reset layout` moves with it.** That is the point of the button rather
than a side effect: the save writes `data-home-x` and `data-cut` onto the live
elements as well as into the file, so the moment it lands, reset comes back
*here* — no reload in between. Save, shove everything about, reset, and you are
back where you saved.

Like the pill, it is hidden unless `keep.js` found the door — a button that
cannot write is worse than no button. `ctrl+s` always calls `preventDefault`,
including inside a note being typed, because that is exactly when somebody hits
it and exactly when the browser's *save this page* dialog is least wanted.

**It only runs at home.** A page cannot write the file it was served from, so
there is a door in `serve.js` to post through; the static host lab 2 deploys to
has no such door, and out there `keep.js` knocks once, hears nothing and goes
quiet for good. The pill in the header only appears when the door answers — so
if you cannot see it, nothing is being written, and you are probably on
`npx serve`.

**It does not save the camera.** Where you are *looking* is not what the bench
*looks like*, and `lab.js` has an argued-for opening shot — the lockup, framed
to the banner — that a saved camera would quietly overwrite. WHERE IT OPENS, in
`lab.js`, is that argument. It does not save the tape or anything a gizmo
remembers either: those are things people make, not the shape of the room, and
`reset data` is what they answer to.

**It does not freeze a frame you have not re-cut.** An untouched frame follows
its own drawing at whatever size the drawing is, which is where every default
size on the bench comes from, and writing today's measurement down would break
it the day the drawing changes. Only `p.sized` gets a `data-cut`.

**`data-cut` reads after `localStorage`,** the same way `data-home-x` does:
what you did on this machine beats what the file says until you send it home.
And `reset layout` now goes back to `data-cut` where there is one, because for
a frame somebody kept a cut of, *that* is the drawn size.

### Delete, from the menu

Right-click → **delete** takes a feature off the paper. A pasted copy is simply
un-pasted (`deleteCopy`, the same path the delete tool takes). Anything else is
one of the sections in `index.html`, and the bench does not get to delete those
— `serve.js` refuses to remove a section and is right to — so it is **taken off
rather than destroyed**: out of the DOM, out of `Lab.gizmos` and out of
`frames.js`, its name on `knoll-lab2:gone` so it stays off after a reload, and
`data-gone="1"` on its tag once the autosave has been round. The section is still
in the file, comment and all; **removing that one attribute by hand puts it back
for everybody**, and `ctrl+z` puts it back for you now — a fresh clone of the
element, registered and adopted again like a paste, at its old rank.

`reset layout` restores a delete that has not been written down yet — it goes back
to the file, and the file still has the feature on the paper — and leaves alone
one the file already says is gone. `keep.js` keeps reporting a gone feature with
where it was and what it was cut to, so its `data-home-x` and `data-cut` stand and
only the word is added; `serve.js` counts every byte it drops on purpose, so its
never-shrinks guard still holds to the byte.

### The copies block

Copies go in between two markers at the foot of the world:

```html
  <!-- ▼ copies written down by keep.js — see THE COPIES BLOCK in about.md -->
  <!-- ▲ copies written down by keep.js -->
```

That block is the one region of `index.html` a program owns. **It is
append-only.** `serve.js` will not delete a section — the file is 94k of
hand-written prose with an argument in every comment, and a program that can
remove parts of it automatically is a program that can lose them. Taking a
copy off the bench for good is a line you delete by hand, which is the right
amount of work for the only destructive edit there is.

The hand-off matters: the moment a copy is written down, `keep.js` drops it
from `knoll-lab2:copies`, because `lab.js` rebuilds that list onto the paper at
boot and the markup now builds the same section — leaving it in both is how you
get two of everything, answering to one id. After the hand-off it is not a copy
any more, it is a section, exactly like the thirteen trees somebody planted by
hand. Undo still un-pastes one on the screen; it comes back on the next load.

Everything else `serve.js` touches is **three attributes on a tag somebody else
wrote**, edited in place so the tag keeps the layout the file gave it. It finds
a section by scanning for its `data-gizmo` and walking the quotes to the
closing `>` rather than by a regex over the whole file, refuses to write
anything shorter than what it read, writes through a temp file and a rename,
and keeps one `index.html.keep-bak` per run of the server — the copy from
before its first write, which is the session you undo if a session goes wrong.

---

### The upload tool, and the tracing table

**upload** on the dock — a **+**, in the half of the old **image** button that
was not given to **sticker** (below) — stands the tracing table up the LEFT OF
THE SCREEN and leaves it there: `tracer.js`, the Design Canvas export in
`Downloads/features/Tracing Table.html` transcribed into classes (`.tracer`,
on the shared `.lab-panel` case, in `lab.css`). It has no iframe and nothing
of its own to load, so it is driven from out here rather than adopted by
frames.js. The pipeline
is lab 1's `vectorize.js` lifted whole — k-means palette, marching-squares
loops, Douglas-Peucker — with SMOOTHING read as a percentage. Lay a picture
down (drop, click, or paste one), set the dials, **TRACE IT**, and **SAVE TO
LIBRARY** files the tracing in **THE LIBRARY**: `Lab.store('flatfile')` (the
store keeps its original key, so an existing save keeps its tracings), on
this device, with a read-back after every filing that says so when there is
no room. A picture can also be dragged straight onto the library, skipping
the table — it is loaded, traced and filed in one drop.

A filed tracing is **dragged out of the library onto the paper** and stamped
where it lands (`Wall.stampAt`) — a wall item `k:'i'` that paints the
tracing's own paths at the size the options row says (S / M / L, and the same
FADE the stamps had), so it moves, fades, deletes and undoes like any other
mark. A **click** on a pocket opens **the viewer** instead: the tracing large,
on the light table's own checker, with its name and its count; from there it
goes ON THE POINTER (click the paper to stamp it, as before) or comes OFF,
and **the × lives only there** — taking a tracing out of the library takes
its stamps off the paper with it, which is not a thing to do by brushing a
thumbnail. There is no download any more. The artwork stays in the library
and is looked up by name; the stamps already on the paper still paint —
`STAMPS` and `SK` are kept for them. (Since 2026-09-04; THE LIBRARY in
`tracer.js` has the argument, and `perf/verify-tracer.js` walks it.)

**It is the user's UI, not scenery** (2026-09-08). It used to be a gizmo: a
panel placed ON the paper, `Lab.register()`ed, dragged by its bar, and so
panned and zoomed with the drawing under it — which meant the tool you were
working with wandered off the screen the moment you moved the camera. It is
now fixed chrome beside the dock, the way the export always drew it. Gone with
that: `Lab.register`, `Lab.place`, `spawnAtView`, the drag handle, the fold,
and the one-frame `will-change` that kept it sharp inside the animated sheet
(a fixed panel is not in that sheet, so it never went soft). It is also no
longer copyable, no longer in `Lab.gizmos`, and no longer in keep.js's layout
— `perf/probe-tracer.js` and `perf/shot-tracer.js`, which existed to chase the
zoom-softness, are about a problem that cannot happen any more.

**And it was re-drawn by the same export.** The table was a 1270-wide cream
machine with four screws, a grill and three columns; the 2026-09-08 export
redrew it as a 344-wide panel in the dark palette — one scrolling column, the
dials stacked, the ink-flow gauge stood in its own box beside **TRACE IT**, and
**THE FLAT FILE** four pockets across the foot. The pipeline did not change,
and neither did the library or anything that reads it: only the case around
them. A picture LAID on the table is a bitmap and stays one; the tracing of it
is the vector.

---

### The sticker tool, and the sticker drawer

**sticker** on the dock, beside **upload**, puts **the sticker drawer** in the
same slot — `stickers.js`, transcribed from the same Design Canvas export
(`Downloads/features/Tracing Table.html`, which draws the whole lab dock: the
table and the drawer side by side under one strip of buttons). Its icon is the
export's own: a square with one corner peeled.

**The case is one thing, written once.** The export draws both panels with the
same border, radii, shadow and header — plate, spacer, × — so that shell is
`.lab-panel` and its `.lp-*` furniture in `lab.css`, and `.tracer` and
`.sticker-drawer` add only what is different inside them. Both are fixed to the
left of the viewport, from under the header (`--head-h`, lab.js's own
measurement) down to the foot of the screen; only one is ever up, because
**upload** and **sticker** are two tools and a tool is exclusive. The panel
only stops short of the tool dock below about 1300px, which is where the
centred dock first reaches its column — above that it runs the full height,
which matters because the table is about 830 tall and every pixel it does not
get is a scroll between the dials and the light table.

**It is not the flat file.** The table MAKES artwork — traced from a picture
of yours, filed in THE LIBRARY at its side, and that is where everything the
table makes lives. The drawer HOLDS artwork that came WITH the bench: kits of
stickers, drawn elsewhere and shipped, rummaged for by name and filtered by
kit. One is your own work, the other is stock, and neither writes into the
other.

**The catalogue is not a store**, and that is the one real difference from the
flat file. A shipped sticker is not the user's data: it must not answer to
`reset data`, it must not eat the few megabytes `localStorage` has, and its id
has to mean the same thing on every device or a stamped sticker would come
back blank on the next machine. So the kits live in memory and arrive through
one door:

```js
Stickers.load({
  kits: [ { id: 'pipeworks', name: 'Pipeworks' } ],
  stickers: [ { id: 'pw-elbow', name: 'Elbow Joint', kit: 'pipeworks',
                w: 400, h: 400, d: '<path d="…" fill="#5a635d"/>' } ]
});
```

`d` is the inside of an `<svg viewBox="0 0 w h">`, colours already in it — the
same shape a filed tracing keeps. Calling `load` again REPLACES the catalogue
rather than adding to it, so a sheet can be re-loaded without doubling, and it
repaints the wall on the way out: a stamp made before its sticker arrived drew
nothing, and draws itself the moment the kit lands. **Ids are written into
every stamp**, so name them rather than numbering them.

A sticker is **clicked** to go on the pointer (a second click takes it off) and
**dragged out onto the paper** to be stamped where it lands — `Wall.stickerAt`,
a wall item `k:'d'` that names the sticker and paints its drawing at the size
and fade the options row says, which is the SAME row the tracing uses and so
the same two numbers. (`k` was the five old stamps, still painted for the
artwork that used them, so the new one took the next free letter.) There is no
viewer behind a sticker the way there is behind a pocket: nothing can be taken
OUT of a drawer of shipped art, so there is nothing for a viewer to hold. A
sticker the catalogue has not got paints nothing and does not throw.

**The drawer ships empty** (2026-09-08). No kits have been drawn into it yet,
so the grid shows the export's own dashed pockets and says so; everything that
acts on a sticker is built and wired and waiting on `Stickers.load`.

---

## 8 · Adding a feature

1. **Export it** from Design Canvas. You get a bundler HTML file — one big
   document with the real page JSON-encoded inside
   `<script type="__bundler/template">`. Pull that string out and `JSON.parse`
   it; that is the file you want.

2. **Swap the head** for the bench's:

   ```html
   <script src="./support.js"></script>
   <!-- lab 2 shows this on its own paper — see features/bare.css -->
   <link rel="stylesheet" href="./bare.css">
   ```

3. **Replace the bundled fonts.** The export inlines `@font-face` blocks
   pointing at UUID blobs that do not exist outside the bundle. Swap the whole
   block for the Google Fonts links for the same faces.

4. **Mark the paper grain** — the full-bleed noise overlay every export
   carries — with `data-lab-nopaper`, so `bare.css` can hide it. Exports
   since 2026-09-04 carry two more things to mark: a second full-viewport div
   round the drawing (`data-lab-sheet` — a sheet the measurement steps
   through, or it would measure it) and a zoom widget pinned to the corner
   (`data-lab-nozoom`). `ADDING.md` §3 says what they are and why;
   `perf/swap-machine.js` does steps 1–4 in one go.

5. **Leave the drawing verbatim.** If the bench forces a change to it, say so
   in a comment where you make it. `knoll-cards.dc.html` is the model: two
   declarations changed, with a paragraph on why.

6. **Add the section** to `index.html`:

   ```html
   <section class="gz" id="gz-thing" data-gizmo="thing"
            data-src="features/thing.dc.html" data-w="1000" data-h="560"
            data-home-x="0" data-home-y="0" style="width:1000px;height:560px"
            aria-label="Thing">
     <iframe title="Thing"></iframe>
     <div class="gz-poster"><b>waking up</b></div>
     <div class="gz-shield"></div>
     <span class="gz-dim" aria-hidden="true"></span>
     <button type="button" class="gz-size" data-nodrag
             aria-label="re-cut it — double-click to fit it to its drawing"></button>
   </section>
   ```

7. **Measure it, then place it.** Load the bench, let the frame cut itself, and
   read `el.offsetWidth/offsetHeight` — that is the ink, and that is what the
   home position should be reasoned against. Do not guess the box.

8. **Update the count** (§1) and write the comment.

One file can serve several frames: put an argument on the end of `data-src`
(`#card=fans`, `#who=thinker`) and let the feature read it. The three cards and
the ten gnomes are each one file.

---

## 9 · What a frame costs — the kits and the posters

Measured on 2026-09-04 (`perf/results/baseline`, headed Chrome, 165 Hz
display, the numbers are ms per frame): **the pan was free and the bench was
slow standing still.** Every warm document — an iframe within 900px of the
screen — cost the main thread about half a millisecond EVERY FRAME, moving or
not, animated or not, and at 20% the whole bench is warm. 134 documents, 61 ms
a frame, sixteen frames a second; at 166% a screenful of them was fine, which
is why that zoom felt smooth and 35% did not. Hiding every iframe put the page
back on the 6 ms floor. So the work was to have fewer documents, and there
were two kinds of them.

### The kits (`kits.js`)

Forest, village and gnome are KITS: an `<svg>` and some CSS animation per part
and no script beyond the line that picks the part out of the sheet. 122 of the
134 documents were kit parts. They are not documents any more. A kit section
is still a `<section class="gz">` — the same box lab.js drags, picks, piles,
copies and deletes, the same box keep.js writes down, the same `data-src` that
names the drawing — but inside it is one of two things:

- **a sprite.** Far away, small, or not being touched, the part is painted on
  a canvas TILE of `#kit-layer` (z 9: over the wall's ink, under the pile).
  Tiles are 1024 screen px square, cut at the landed zoom, positioned in world
  units so a pan scrolls them with the sheet; nothing on them animates and
  they cost nothing per frame. Above 125% there are no tiles at all.
- **live svg.** Near, big, dragged, re-cut, picked, outlined under ctrl or on
  the menu, the part is lifted into its own `.gz-art` — frames.js sizes it the
  way it sizes the sign. Live comes in three grades, because the probe
  (`perf/probe-anim.js`) showed an animation on a `<g>` INSIDE an svg runs on
  the main thread and makes Chrome re-layerise the page every frame, on screen
  or off, **and pausing it is not enough** — only an animation that is not
  there costs nothing. So: *still* (no animation — a part that is live only
  because it stands over a machine, or is in the hand off screen), *sway* (the
  root's own sway or bob, which the compositor runs for free — the nearest
  parts drawn at 180px or more, up to twenty), *full* (everything the sheet drew —
  the nearest four on screen at 300px or more).

The drawings are lifted out of the sheets at run time (fetched once, parsed,
each `<sc-if>` opened, the palette filled in — what `support.js` does when it
boots a document, done once here). Nothing in the three sheets changed. ctrl
asks `Kits.inkAt`, which answers from the drawing's own alpha, never from
`elementsFromPoint`. A kit part's natural box is the box its frame used to
measure (a table in `kits.js`, taken from the iframe bench before the change);
the pointer's arm and the builder's hammer poke out of their svg boxes and are
in the table as the frame measured them. A pasted copy of a tree still lands
in the copies block as the five-line section it always was, and is reshaped
here at the next boot. `Z_CEIL` in lab.js went from 1000 to 9000 (and the
notes, the tape and the band above it), since a section is cheap now and a
wood of them is a reasonable thing to have.

### The posters (`posters/`, `frames.js` THE POSTERS)

The other twelve documents are the machines, and a machine at 20% is a
postage stamp nobody can use. So a machine does not boot until its box is
480 screen px wide — at the opening zoom that is the four big machines and
nothing else; until then the box holds its POSTER — a transparent 2×
picture of the drawing, taken from this very bench by `perf/posters.js`,
placed by the same sum `place()` uses for the drawing. Zoom in past the line
and the document boots and fades in over it; click it and it boots at once.
A booted machine that shrinks under the line is put away again (`display:none`
on the frame, the document alive underneath, the picture back on top), so a
bench zoomed out after a look round costs what one that was never zoomed in
costs. A machine with no poster boots the old way. **Rebuild the posters when
a machine's drawing changes:** `node lab2/perf/posters.js` with `serve.js` up. Two sections are marked `data-live` and are never
pictures — the scroll, whose wizard swings from the roller, and the builder
gnome, who hammers under his bubble (a kit part so marked is drawn in full
whatever its size): the two motions the bench opens on, paid for on purpose.
`ADDING.md` §5 has the rule.

### The numbers, after

Same harness, same cameras (`perf/results/after6`): 20%, 25%, 35%, 50%, 100%
and 400% pan at the display's own floor (6 ms on a 165 Hz screen) with no
frame over 34 ms, where 20–50% had been 55–67 ms a frame with every frame
over 34. The one zoom still at two frame slots is 166% over the lockup, where
the lockup's own eleven machines are live and add up to about six
milliseconds between them — the documents themselves, not the kits
(`perf/probe-166.js`). Documents drawn at 20%: 134 before, none after (the
four big machines boot at 35%; the rest are pictures until 50%). `node lab2/perf/measure.js <label>` re-runs it;
`node lab2/perf/verify.js` walks every gesture; `node lab2/perf/kitgeo.js
<tag>` records where every kit part sits so a change can be checked against
`results/kitgeo-before.json`.

---

## 10 · Things that will bite you

**The header is two headers.** Served from `serve.js` on localhost the page
puts `lab-local` on `<html>` before its stylesheet loads (one line in the
head of `index.html`), and `lab.css` shows the hint, the row of tools (save
layout, the autosave pill, reset layout, reset data, lab 1) and the "/ lab 2"
of the wordmark only under that class. Anywhere else — the deployed site,
which has no door for any of those switches to act through — the header is
the icon and "knoll" and nothing more. So a control you cannot find on the
live site is not missing; open the bench off `node serve.js`. (2026-09-04,
for the landing page.)

**Two tabs of lab 2 will fight over the file.** Each one posts its own idea of
the layout every 30 seconds, so the last tick wins and the two ping-pong
`index.html` between them for as long as both are open. Nothing is corrupted —
each save is a whole coherent layout — but the file is never the arrangement
you are looking at. Arrange in one tab; pause the pill in the other, or close
it. The same goes for a tab left open from yesterday: it is still saving.

**Anything draggable must be named in `onPaper` and `HANDS_OFF`.**
`lab.js` listens for `pointerdown` on the **capture** phase, so it has armed a
band (or, for a finger, a pan) before your own handler runs; `liveSweep()` and
`livePan()` then call `stopPropagation()` on the way down, and your
`pointermove` listeners never fire. You get a selection rectangle dragged over
your prop, and your thing stands still. `stopPropagation()` from inside the prop cannot fix
this — it bubbles, and the camera got there first. Both lists are
around `lab.js:673`, and the comment above them says so. This is the bug that
stopped the caution tape being draggable at all.

**Why a pan is a scroll (2026-09-03).** Three camera rounds, each measured. A
plain `transform` write on the sheet made the engine decide the page's layers
again every frame (twelve frames a second at 25%). Rewriting the keyframes of a
Web Animation instead was a hundred frames a second *with nothing else moving*
— but a trace of a fast pan with things moving showed **Layerize, PrePaint and
Commit on every frame** anyway, 2ms at rest and 90–140ms whenever a feature
crossed the pause line or the cold line or booted, at half a millisecond per
warm document. Dense stretches at low zoom were a slideshow. Native scrolling
is the one thing the engine moves for free: on the same busy stretch at 35%,
keyframes 11ms a frame with spikes to 127, an animation seek 8ms with spikes to
142, **a scroll 6ms flat with the worst frame under 10**. So `lab.js` keeps
`PX/PY` as the API and derives them from `bench.scrollLeft/Top`; the sheet's
pose (`translate(OX,OY) scale(Z)`) is rewritten only when the zoom or the room
changes; the grid is the room's floor (one element the size of the room,
pattern anchored by `background-position`) instead of a slid layer; and
`frames.js` **holds every tier change while the camera is moving fast**
(`Lab.moving()`: over 350px/s in the last 160ms) — no boots, no cold/warm
flips, no un-pausing — and flushes them on `lab:still`, so a flick sees what
was already drawn and everything it swept over catches up the moment it slows.
Whole-field pan at 35% on a first visit: median 6ms, worst 27ms, **no frame
over 34ms** (was median 11, p90 74, worst 128, 74 frames over). Things the
scroll brought with it and their answers are over `applyCam` in `lab.js`.

**The comments are the documentation, and they are load-bearing.** Nearly every
number in this project has a paragraph next to it saying where it came from.
If you change the number, change the paragraph — a stale comment here is worse
than none, because the next reader will trust it.

**A kit part is not a document.** There is no iframe to reach into: `docOf()`
answers null for it, ink.js asks kits.js, and frames.js's crowd count skips it.
A section is a kit part because its `data-src` names one of the three kit
sheets; `kits.js` reshapes it before lab.js runs. Add a `data-src` to a fourth
sheet and it will be framed, not painted, until `SHEETS` in `kits.js` knows it.

**Paused is not free.** An inner `<g>` animation on a live kit part is a
main-thread frame whether it is playing or paused (§9). kits.js takes them out
of the markup for every grade but *full*; if a part looks wrong mid-motion, that
is why — it is drawn at rest.

**The posters go stale.** They are pictures of the machines as they were on
the day `perf/posters.js` ran. Change a machine's drawing and rebuild them, or
the bench shows the old face until the document boots.

**`tape.js`, `keep.js` and this file are CRLF.** Every other file is LF. Match whatever
you are editing — and know that a JavaScript template literal normalises CRLF to
LF, so a patch script that carries its text in one will never match these three
until it converts to the file's own ending first.

**Measurement stops at anything that clips.** A container with `overflow:
hidden` is the design cropping its own art on purpose, and the walk does not
follow it inside. If a feature measures smaller than it looks, that is usually
why.

**Shadows are ink.** `getBoundingClientRect()` has never heard of them, so
`frames.js` lets every rectangle out by its own shadow spill. A drawing that
measures a few pixels narrow is usually a shadow the walk could not parse.

**`file://` silently breaks the reach-in.** Frames become cross-origin and
`frames.js` can no longer un-paper or MEASURE them. It looks *almost* right,
which is the problem. Serve it.

It no longer breaks the CORNER, which it used to and which was much worse than
almost right: with nothing measured, `place()` returned and left the frame at
the stylesheet's 100% × 100%, so cutting the box smaller re-flowed the document
into it and `html{overflow:hidden}` took both ends off. Every feature cropped
at the corner except the librarian, who carries a `data-scale` and so came
through the fallback that scales. Now every frame does: with no measurement the
viewport it was composed at — `data-w` × `data-h` — stands in for the drawing
and the window scales that. At the default box it is a scale of one, so nothing
about a served bench changed.

**Nothing on the paper crops at the corner.** All sixty-two panels — the
eighty-four frames and the sign — fit their drawing into the box and scale it,
whichever way the box is dragged and wherever the file was opened from. The one
thing a box can still be is the WRONG SHAPE: the fit takes the smaller of the
two ratios, so a tall box on a wide drawing is a small drawing with air either
side, never a cropped one.

---

## 11 · Where to read next

The header comment of each file is the real documentation and is worth reading
before touching it — particularly:

- `frames.js` — the five problems, **MEASURING IT**, and **AND THE BOX IS A
  WINDOW ON IT**
- `lab.js` — **WHAT STANDS ON WHAT**, and **WHERE IT OPENS**
- `index.html` — **THE LOCKUP**, then each numbered section
- `features/bare.css` — why the rule lives in a file and not in JavaScript
- `kits.js` — **THE KITS**, the three grades, and **THE INK**
- `frames.js` — **THE POSTERS**
