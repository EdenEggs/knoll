# dashboard — how it works

A tour of `site/dashboard/` for whoever opens it next, agent or otherwise.
`site/yard/about.md` covers the personal home-base page next door; this one
covers the owner-facing analytics page.

---

## 1 · What this is

**Owner Dashboard** is what a hill's owner sees: key numbers (residents,
active residents, average time on the hill, total contributions), a
cumulative-residents trend chart, an interaction heatmap by zone and time of
day, three ranked breakdowns (tools people reach for, genre skins in use, how
they visit), a top-contributors list, and a gallery of past looks of the
hero — every saved snapshot, click one to see it bigger.

All of it is **mock data**, seeded and deterministic (page footer says so
outright). There is nothing behind it yet — no account, no real hill, nothing
persisted between visits. Reload and you get exactly the same numbers.

Served at `/dashboard`, alongside `/lab`, `/lab2` and `/yard` — its own page,
not a lab2 iframe feature.

---

## 1a · The house bar, and the switch (2026-09-06)

Across the top is **lab 2's header**: the white bar with the knoll mark and the
word `knoll`, linking `../`. This page was the last of the four standalone
Design Canvas pages to get it — `/yard`, `/signup` and `/login` have worn it
since 2026-09-05 — and it is here for the same reason it is there: so the page
reads as a room of the site rather than as a page that happens to share its
palette.

**The rules are `/yard`'s, copied**, not lab 2's directly. Yard already did the
work of writing `lab.css`'s `.lab-head` / `.lab-brand` out with the token values
in place (`--card` `#fdfbfd`, `--line` `#e2d4df`, `--ink` `#26212a`,
`--display` Sora) and of arguing which of lab 2's declarations do not belong on
a page that is not the bench. **`site/yard/about.md` § the house bar is the
record of that argument and applies here word for word** — including why the
wordmark is just `knoll`, why the hover is `#a52c68` and carried explicitly, and
why the bar has no `z-index`.

**The coupling to keep in step:** `margin: -34px -30px 34px` on `.knoll-head`
**is the root div's own padding** (`padding: 34px 30px 56px`) spelled out, so
the bar reaches the full width of the page instead of sitting in the gutter.
Change the root's padding and change these. Yard carries this coupling twice
because it has a breakpoint; this page has no `@media` at all, so it carries it
once. **If a breakpoint is ever added here, the bar's margins are the second
thing to add** — yard's own export broke exactly this and it took a measurement
in Chrome to see it, because `overflow-x: clip` had turned the symptom into
silent cropping.

### The switch

Beside the wordmark are two pills — **yard** and **dashboard** — and they are
how you get between this page and the one next door. Both belong to the same
person: the yard is your plot and your standing, this is the numbers off the
same hill.

**It lives in the bar and not in the page**, which is the whole of the decision.
The bar is the only thing both pages have in common and the only thing in the
same place on both, so a switch in it never moves, never has to be found, and
does not have to be redrawn in each page's own vocabulary. Put it in the two
headers instead and it is in two different places wearing two different looks,
which is a pair of links rather than a switch.

**It is drawn in lab 2's in-bar vocabulary, not this page's.** This page's own
controls are cream 4px-bordered stickers in VT323 with hard drop shadows; lab
2's bar has none of that. So the pills take `.lab-keep`'s shape, border and
padding (`lab.css:105`), **`.lab-keep.is-saved`**'s "this one is lit" palette
(`lab.css:130` — pink on pink-soft over `#fff6fb`) borrowed for the hover, and
`.lab-save`'s filled treatment for the page you are on — in `--ink` rather than
`--pink`, because *where you are* is a state, not a thing that just happened.
11.5px Public Sans 600, radius 999px.

**Not `.lab-keep:hover`** — that is a different rule with different colours
(`border-color:var(--mute-2); color:var(--ink-3)`, no background), and this file
cited it by mistake until 2026-09-06. Anyone re-syncing against `lab.css` would
have found grey where the note said pink.

**Two colours are darker than lab 2's, on purpose.** `--mute` `#8b7f92` and
`--pink` `#c93b82` measure 3.56:1 and 4.47:1 against their own backgrounds here,
under WCAG AA's 4.5:1 for 11.5px text — so the resting ink is `--ink-3`
`#3d3346` (11.2:1) and the lit pink is `#a52c68` (6.3:1). Both are lab 2's own
values. `site/yard/about.md` has the long version.

`aria-current="page"` is what says which pill is which. It is the correct word
for it and it is the hook the fill is keyed off, so the machine-readable answer
and the visible one cannot drift apart. **The current page's pill carries no
`href`**, which is what makes its `cursor: default` true — an `<a>` without one
is not focusable, not clickable and not a tab stop, so it cannot be pressed into
reloading the page you are already on.

**The same two blocks of CSS and the same two links stand in `/yard`'s bar.**
There is no shared stylesheet to put them in — these four pages each carry their
own copy of everything, by construction — so **keep them in step by hand.** The
long-form reasoning is written out once, at `site/yard/index.html` § THE SWITCH.

Measured after: bar 51px tall, `top: 0`, `left: 0`, `right` = viewport at both
1500px and 375px, both pills on screen at 360px, the correct one filled on each
page, and navigation working in both directions.

---

## 2 · The files

| file | what it is |
|---|---|
| `index.html` | the whole page: helmet, the `<x-dc>` template, and the `class Component extends DCLogic` script. |
| `support.js` | the Design Canvas runtime, copied from `../support.js`. Not ours — edit the root copy and re-copy, don't edit here. |

No `dashboard.css` or `dashboard.js` any more. An earlier hand-built version
(plain HTML/CSS/JS charts) lived here first and was fully replaced by the
export below.

---

## 3 · Where this came from

Design Canvas export — `Downloads/features/Knoll Owner Dashboard.html`, the
same single-file "bundler" shape as every other export on this site: the real
page is JSON inside `<script type="__bundler/template">`. Unlike the Yard
page next door, **this export arrived fully wired** — every `{{ }}` binding
in the template had a matching key in `renderVals()`'s return object, checked
by hand against the whole file rather than assumed. So the integration here
was the plain three-line swap and nothing more:

- head's `<script src="…">` UUID → `./support.js`
- the five inlined `@font-face` blobs → one Google Fonts link for **Rye**
  (headings) and **VT323** (everything else), both weight 400 only
- `<link rel="icon">` added to match the site's other Design Canvas pages

**That is no longer the whole list.** On 2026-09-06 the page stopped being a
pure three-line swap. If a future export replaces this file, it now needs:

| # | the export | what it must be |
|---|---|---|
| 1 | `<script src="<uuid>">` | `<script src="./support.js">` |
| 2 | the inlined `@font-face` blobs | the one Google Fonts link — and it now asks for **four** faces, not two: Rye, VT323, **Sora 800** (the wordmark) and **Public Sans 600** (the switch) |
| 3 | no favicon | `<link rel="icon" href="../logo/logo-icon.svg">` **in the real `<head>`, before the runtime** — see below |
| 4 | no title | `<title>Owner Dashboard · Knoll</title>` |
| 5 | no house bar | the `.knoll-head` / `.knoll-brand` / `.knoll-switch` CSS and the `<header>`, per §1a. Copy them from `site/yard/index.html`. |
| 6 | 16 SVG attributes carrying `{{ }}` | the same 16, prefixed `sc-camel-` — see §5 |

`site/yard/recut.js` does the first four of these for *that* page and is worth
reading as a model, but it is yard-specific; there is no recut script here.

**Why the favicon moved out of the helmet.** The helmet is hoisted into
`<head>` by `support.js`, i.e. *after* the runtime boots — and Chrome, finding
no icon before then, asks for `/dashboard/favicon.ico` and logs the 404 it gets.
One line earlier in the document and it never asks. `/signup` and `/login` have
carried this fix since they landed; `/yard` got it on 2026-09-06; this page was
the last that had not. Verified: zero failed requests on a clean load.

---

## 4 · The mock data, briefly

Everything numeric comes from `mulberry32`, a small seeded PRNG seeded with a
fixed constant (`0x5EED01`), run over a fixed 180-day window ending on a
hardcoded `TODAY` (2026-08-31 in the component's own constructor). That is
why the numbers are stable across reloads and across visitors — it is not
caching, there is simply no randomness left unseeded.

- **Residents / active / time-on-hill / contributions** are each their own
  generated daily series (`gen()`), summed or averaged over whatever date
  range is selected (Today / Last 7 / 30 / 90 days), with the *previous*
  equal-length window computed the same way to drive the up/down deltas.
- **The heatmap** is 8 zones × 8 three-hour buckets, each zone given a
  peak hour and spread so the pattern looks like real usage (the Wall peaks
  early evening, Signup Form is flatter, etc.) rather than being flat noise.
- **Tools / genres / devices** are three short fixed category lists, scaled
  by the selected date range and a small per-category random factor.
- **Top contributors** draws from a fixed pool of 15 named residents, weighted
  by `rng()²` so a few dominate, then shows the top 6.
- **Past looks** is a fixed list of 6 snapshots (`daysAgo`, a caption); the
  little preview art is generated per-snapshot, not a real screenshot.

None of this reads or writes `localStorage`. There is nothing to reset.

---

## 5 · Things worth knowing

**The console errors on first paint are gone (2026-09-06), and the way they went
is worth knowing.** This page used to log a run of `Expected number,
"{{ k.spark }}"` / `Expected length, "{{ endX }}"` / `Expected moveto path
command …, "{{ linePath }}"` — the browser's SVG parser reading a geometry
attribute that still held the literal template text, before the runtime
substituted the real numbers. The note here said it was harmless, and it was:
the drawing was always right, only the console was wrong.

It is fixed now, in sixteen places, by one prefix. **`sc-camel-` is the
runtime's own escape hatch:** `support.js:422-423` strips the prefix and
camel-cases what is left, with *no allowlist*, so `sc-camel-cx` decodes to
exactly `cx` — and the SVG parser skips an attribute it does not recognise
instead of complaining about one it does. Same attribute, same value on the
element, no error. The sixteen are `points`, `cx`/`cy` (twice), `y1`/`y2`/`y`,
`d` (three times), `x`/`y`, `x`, and `x1`/`x2`, all in the sparklines, the trend
chart and the tooltip.

`/yard` has the identical fix, where it is YARD FIX 10 of 10 and the reasoning
is written out in full. **The technique applies to any raw `{{ }}` in a geometry
attribute** — `d`, `cx`, `cy`, `x`, `y`, `x1`, `x2`, `points`, `transform` — so
if a future export reintroduces them, this is the change to re-apply.

Verified after: zero console errors and zero failed requests on a clean load,
with the chart, sparklines, gridlines, heatmap and tooltip all still carrying
real computed values.

**This page has no `@media` at all, and on a phone it is broken.** That predates
everything above — it has never had a breakpoint — but it is worth writing down
now, because as of 2026-09-06 the bar puts a link to this page on every phone
that opens `/yard`. Nothing here caused it; the switch just made it reachable.

Measured in Chrome, `/dashboard` at a 390px viewport:

| what | what happens |
|---|---|
| **the trend chart** | `Residents over time` renders at **0 × 0**. Its panel is 113px wide and `Top contributors` paints straight over the top of it. |
| **the heading row** | "Owner Dashboard" at Rye 36px in a flex row with no `min-width: 0`, so it cannot shrink |
| **the two heatmap grids** | `130px repeat(8,1fr)` and `150px repeat(8,1fr)` — nine columns that do not fit |
| **content past the right edge** | 30 elements at 640px, 50 at 480px, **86 at 375px**, 115 at 320px |
| **horizontal scroll** | none down to 375px; at **320px** the page scrolls (344 vs 305) and the full-bleed bar, sized to the viewport, stops 39px short of the right edge |

**The one line that causes the worst of it is `grid-template-columns:
minmax(0,2fr) minmax(280px,1fr)`** on the trend-chart row: the 280px floor on
the right column is what squeezes the chart to nothing. Most of the other grids
here already use `auto-fit`/`auto-fill` with a `minmax` and collapse on their
own — the two heatmaps and this row are the exceptions.

This was **not** fixed alongside the switch, deliberately: a responsive pass over
a chart, two nine-column heatmaps and a Rye heading is design work with real
choices in it (does the heatmap scroll, or shed columns?), and the page should
get one on purpose rather than as a side effect of gaining a link. `/yard`'s own
breakpoint arrived the same way — from a deliberate re-export, not from someone
patching it in passing. When it does happen, **the bar's negative margins are
the second thing to change**; see §1a.

**Three Design Canvas props**, editable from the canvas's own props panel if
this is ever reopened there: `jitter` (the card-tilt jitter, on by default),
`heatRamp` (`'pond blue'` / `'gnome red'` / `'grass green'` — the heatmap's
low→high colour ramp), and `defaultRange` (`'1'|'7'|'30'|'90'`, which date
range is selected before a visitor clicks a filter).

**Visual system matches the Yard, not the coming-soon page.** Rye + VT323 on
the same ink/cream/red/yellow/green/blue/pink token set and pale-lavender
paper as `/yard` — the personal/owner side of the site has its own look,
distinct from the public Wallspace hero.
