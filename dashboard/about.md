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

No markup was added or reshaped. If a future export replaces this file,
the same three swaps are very likely all it needs.

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

**Harmless console errors on first paint.** Loading this page logs a run of
`Expected number, "{{ k.spark }}"` / `Expected length, "{{ endX }}"` /
`Expected moveto path command …, "{{ linePath }}"` — the browser rejecting an
SVG attribute that briefly holds the literal, unsubstituted template text
during an initial render pass, before the component mounts and `renderVals()`
supplies the real numbers. Confirmed by reading the live DOM right after
load: `polyline points`, `path d`, and every `circle cx/cy` all hold correct
computed values, and the errors do not recur on interaction (switching date
range, toggling a table view, opening a look). Chase this only if the
*rendered* values are ever actually wrong — so far they have not been.

**Three Design Canvas props**, editable from the canvas's own props panel if
this is ever reopened there: `jitter` (the card-tilt jitter, on by default),
`heatRamp` (`'pond blue'` / `'gnome red'` / `'grass green'` — the heatmap's
low→high colour ramp), and `defaultRange` (`'1'|'7'|'30'|'90'`, which date
range is selected before a visitor clicks a filter).

**Visual system matches the Yard, not the coming-soon page.** Rye + VT323 on
the same ink/cream/red/yellow/green/blue/pink token set and pale-lavender
paper as `/yard` — the personal/owner side of the site has its own look,
distinct from the public Wallspace hero.
