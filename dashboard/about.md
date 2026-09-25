# dashboard — how it works

A tour of `site/dashboard/` for whoever opens it next, agent or otherwise.
`site/yard/about.md` covers the personal home-base page next door; this one
covers the owner-facing analytics page.

---

## 1 · What this is

**Owner Dashboard** is what a hill's owner sees, and since 2026-09-17 the
numbers are the hill's own. The hill is `/yard` — the page next door, which
now carries lab 2's tool dock and publishes itself (yard/about.md §0). This
page reads two things and sums them for the range chosen (Today / 7 / 30 /
90 days):

| source | what it is | where it comes from |
|---|---|---|
| **the page** | the published doc: every piece on the wall with `when` it went on, where the trees stand, the list of saves | `GET /api/hill?hill=yard` (`site/api/hill.js`), falling back to `../yard/hill.json`, the copy that ships with the site |
| **the visits** | one row per visit — `[t, visitor, device, seconds, referrer]` — as the yard's beacon reported it when the visitor left | the Apps Script the waitlist posts to, `?stats=1&hill=yard&days=180` (`apps-script/Code.gs`) |

What each card shows, and what it shows when a source is missing:

| card | with data | without |
|---|---|---|
| RESIDENTS / ACTIVE / AVG. TIME | distinct visitors seen (180 days), distinct per day in the range, mean seconds of a visit | `—` and a `NOT COUNTING YET` chip |
| PIECES PUT ON THE PAGE | pieces whose `when` falls in the range, against the range before | always real (a shipped page with no pieces shows 0) |
| the trend | **Residents over time**, cumulative distinct visitors by day | switches to **Pieces over time** |
| Where they came from | referrer hosts of the range's visits; `DIRECT / TYPED IN` for none | a line saying so |
| Where the work happens | see §4 | the map still draws; the list says nothing landed |
| Tools people reach for | pieces by the tool that made them (DRAW = strokes, pixels and smears; STICKER; UPLOAD = tracings; TEXT; GIF) | a line saying so |
| How they visit | desktop / tablet / mobile off the beacon | a line saying so |
| Past looks | every press of SAVE YARD, newest first, each drawn small; click for a bigger one | a line saying so |

The footer says where each source stands: `PAGE: LIVE · 3 PIECES · LAST
SAVED …` or `THE COPY THAT SHIPPED WITH THE SITE`, and `VISITS: 41 COUNTED IN
180 DAYS` or `NOT COUNTING YET — THE APPS SCRIPT WANTS ITS NEW VERSION
DEPLOYED`. Both sentences point at yard/about.md, where the setup is.

**Genre skins in use** is gone (2026-09-17): there are no genre skins on the
yard, and the card was a made-up list scaled by a random factor.

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
Change the root's padding and change these. This page has no `@media` at all,
so it carries the coupling once. **If a breakpoint is ever added here, the
bar's margins are the second thing to add.**

### The switch

Beside the wordmark are two pills — **yard** and **dashboard** — and they are
how you get between this page and the one next door. Both belong to the same
person: the yard is your plot and your standing, this is the numbers off the
same hill.

**It lives in the bar and not in the page**: the bar is the only thing both
pages have in common and the only thing in the same place on both. **It is
drawn in lab 2's in-bar vocabulary** — `.lab-keep`'s pill (`lab.css:105`),
`.lab-keep.is-saved`'s lit palette (`:130`) for the hover, `.lab-save`'s fill
for the page you are on, in `--ink`. Two colours are darker than lab 2's on
purpose for AA at 11.5px (`--ink-3` `#3d3346`, `#a52c68`); `site/yard/about.md`
has the long version. `aria-current="page"` is both the semantics and the hook
the fill keys off, and the current page's pill carries no `href`.

**The same two blocks of CSS and the same two links stand in `/yard`'s bar.
Keep them in step by hand.**

The chip in the heading, `YOUR HILL · /yard`, is a link to the page these
numbers are about (2026-09-17; it used to be a made-up address).

---

## 2 · The files

| file | what it is |
|---|---|
| `index.html` | the whole page: helmet, the `<x-dc>` template, and the `class Component extends DCLogic` script. The component exposes itself as `window.dash` for probes. |
| `support.js` | the Design Canvas runtime, copied from `../support.js`. Not ours — edit the root copy and re-copy, don't edit here. |

Nothing else. The data lives behind `/api/hill` and the Apps Script; the
picture of the page is `/yard` itself, in a frame.

---

## 3 · Where this came from

Design Canvas export — `Downloads/features/Knoll Owner Dashboard.html`. The
integration edits a future re-export would need are the same as before
(`support.js` path, the one Google Fonts link for Rye / VT323 / Sora 800 /
Public Sans 600, the favicon in the real `<head>`, the `<title>`, the house bar
per §1a, and the `sc-camel-` prefix on the sixteen SVG geometry attributes,
§5) — **plus the whole of the script**, which no longer resembles the export's:
the export's `renderVals()` generated its numbers; this one fetches them.
Re-exporting the look means re-applying the data layer by hand, section by
section, against §1's table.

---

## 4 · Where the work happens

The heat map is **the page itself, zoomed out**: an `<iframe>` of
`../yard/?embed=1` rendered at 1260 CSS px wide — the width at which the
yard's content column is exactly 1200, which is the wall's world width, so a
piece's world `x, y` is the frame's `x, y` once the world's own offset is
added — scaled down to fit a map at most 460 wide and 720 tall. `?embed=1`
makes the yard wear no dock and no side panels, start no tour and count no
visit (yard/tools.js and the `EMBED` flag in its script).

Over it, a canvas. Every piece in the range contributes points — a stroke's
path points, thinned to thirty; a stamp, note or gif its spot — drawn as soft
black blobs on a scratch canvas and then coloured by how much piled up, through
the same `heatRamp` ramp the legend shows (`pond blue` / `gnome red` / `grass
green`, a Design Canvas prop).

**The zones are read off the page, not invented.** `measure()` reads the frame's
document once its React has mounted (`#dc-root .yard-col` present — the
template copy still inside `<x-dc>` is skipped) and takes the rectangles of the
house bar, the greeting, the hills strip and every `section` in the column,
named by its `h2` (`THE PLOT` for the one holding `.plot-yard`). Each piece is
charged to the smallest zone its first point lands in, else `BARE PAPER`. That
is the ranked list beside the map, the hover tooltip (which sits at the zone's
centre, so it re-renders when the zone changes and not per pixel), and the
table behind VIEW AS TABLE — zones × DRAW / STICKER / UPLOAD / TEXT / GIF / ALL.

**The page's height is the column's foot plus the root's 56px of padding**,
never the frame document's `scrollHeight`: the yard's root is
`min-height: 100vh`, so a document in a 2400px frame answers 2400 whatever is
on it, and the map would size itself to itself.

The frame's React mounts a moment after `load`, and the yard's fonts land
after that, so `measure()` runs on load, a few times in the seconds after, then
once a second for fifteen seconds and every five after that; while the frame is
not ready the last good map stands. A `map` is only replaced when something in
it changed (compared as JSON), so the steady state re-renders nothing.

---

## 5 · Things worth knowing

**The console is clean, and the way it got clean is worth knowing.** SVG
geometry attributes that hold `{{ }}` bindings are prefixed `sc-camel-`
(`support.js:422-423` strips it and camel-cases the rest, with no allowlist), so
the SVG parser never sees the literal template text. Sixteen places, in the
sparklines, the trend chart and the tooltip. `/yard` has the identical fix.
**The technique applies to any raw `{{ }}` in a geometry attribute.**

**Ranges are whole local days ending today.** TODAY is since local midnight;
LAST 7 is today and the six before. A piece with no `when` (one that shipped
in `hill.json` before pieces carried a time) counts in every range.

**Pieces carry `when`, not `t` or `at`**: in wall.js a note's `t` is its text
and a gif's `at` is where it starts. `yard/wall.js` stamps `when` in `add()`;
the bench's own wall.js does not.

**Past looks fetch lazily.** The newest look is the doc itself; the six after
it are fetched one at a time (`/api/hill?hill=yard&at=<t>`) once the doc has
arrived from the live door, and only then — a page running on the shipped
copy has no door to ask. Until a version lands its card reads FETCHING….

**This page has no `@media` at all, and on a phone it is still cramped**: the
trend row's `minmax(280px, 1fr)` floor squeezes the chart, and the heading is a
Rye 36px in a flex row that cannot shrink. The heat map now fits itself to the
card (at most 460 wide) and the zone table scrolls sideways, so the worst of
the old note — a nine-column grid that did not fit — is gone. A deliberate
responsive pass is still owed, and **the bar's negative margins are the second
thing to change** when it happens (§1a).

**Three Design Canvas props**, unchanged: `jitter`, `heatRamp`, `defaultRange`.

**Visual system matches the Yard, not the coming-soon page.** Rye + VT323 on
the same ink/cream/red/yellow/green/blue/pink token set and pale-lavender
paper as `/yard`.

**The corner's settings (2026-09-24).** On a page's dashboard (`?space=<slug>`,
and `?space=toem2` for TOEM 2's own, which its moderators reach from the
stamp's popover), the keepers get four more cards under the numbers — the
Town Board's tabs, the Chat's rules, the Photo Album's sections, uploads and
hanging photos, and the Leaderboard's rankings — built by `manage.js`
(`manage.css`) into the `#corner-manage` slot the template leaves, plain DOM
outside React's care; the slot stays empty for everyone else. Those cards post
to `api/board.js`, `api/gallery.js` and `api/leaderboard.js`, and the bench's
`toem2/board.js`, `gallery.js` and `leaderboard.js` read the result on their
next poll. The rendered slot is `#dc-root #corner-manage`: the raw template
inside `<x-dc>` keeps a hidden copy with the same id. A space's dashboard is
titled `<its title> dashboard`, and the YOUR SPACES strip starts with a Profile
card back to this page's own numbers. `node toem2/probe-manage.js` walks it all
in headless Chrome.
