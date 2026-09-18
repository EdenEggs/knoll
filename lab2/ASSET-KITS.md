# Asset kits for knoll benches: how to build the HTML

**Audience:** an AI design agent (Claude Design) making sticker sheets and
scene sheets that will be imported into a knoll bench. The benches are lab 2,
the iron hive, TOEM 2, and the empty `folder_N` benches made by lab 2's
"+ new bench" button. Read this whole file before generating anything.

**Why this exists.** The TOEM 2 level-piece kit took a small software project
to import. Its stickers existed only as JavaScript that drew them at runtime,
inside a gzipped bundle. The importer had to decode the bundle, run the code
in a real browser, rasterise every piece to find where its ink ends, dedupe
variants, and work out each placement. A sheet built to this spec imports as a
copy of data: no decoding, no rendering, no measuring.

---

## 1. The one rule

Everything the importer needs goes in **one plain-JSON data island** in the
page:

```html
<script type="application/json" id="knoll-kit">
{ "format": "knoll-kit", "version": 1, ... }
</script>
```

- **The island is all the importer reads.** It does not run the page's
  JavaScript, render it, or measure it. If a sticker only exists as code, it
  does not exist.
- **One island per file.** Strict JSON: no comments, no trailing commas, UTF-8.
- **Put it in the page markup,** not inside a JS module or a bundled resource.
  In a bundled export the markup is kept as text inside `__bundler/template`,
  so the island is still found with one search. Code resources are gzipped
  away.
- **Keep the visual sheet** (grids, specimen boards, labels, previews) around
  it. That is for people, and it can be drawn from the same data.

---

## 2. The schema (version 1)

```json
{
  "format": "knoll-kit",
  "version": 1,
  "set":      { "id": "moss", "name": "Moss Garden", "made": "2026-09-12" },
  "kits":     [ { "id": "moss-stones", "name": "Moss Garden · Stones" } ],
  "stickers": [ { "id": "moss-stone-round", "name": "Round Stone", "kit": "moss-stones",
                  "w": 124, "h": 84, "d": "<ellipse .../>" } ],
  "scenes":   [ { "id": "moss-bed", "name": "Moss Bed",
                  "items": [ { "f": "moss-stone-round", "x": 200, "y": 160, "z": 248 } ] } ]
}
```

### `set`

| field | | |
|---|---|---|
| `id` | required | `[a-z0-9-]+`, short. It prefixes every id below. |
| `name` | required | Human name of the whole sheet. |
| `made` | optional | `YYYY-MM-DD`. |

### `kits`: the chips in the sticker drawer, in this order

| field | | |
|---|---|---|
| `id` | required | `[a-z0-9-]+`, starts with the set id: `moss-stones`. |
| `name` | required | Shown uppercased on the chip. The drawer's search matches kit names as substrings, so if a bench may hold several sets, start the name with the set's name: `Moss Garden · Stones`. |

### `stickers`: exactly the drawer's own record, verbatim

| field | | |
|---|---|---|
| `id` | required | `[a-z0-9-]+`, unique across everything ever imported, starts with the set id. **Stable forever**: a stamp on the paper stores only this id, so renaming or renumbering an id blanks every stamp of it. Add new ids; never reuse or reorder old ones. |
| `name` | required | Shown under the card; searchable. |
| `kit` | required | A `kits[].id`. |
| `w`, `h` | required | The drawing's box: `d` is drawn in `viewBox="0 0 w h"`. Numbers > 0. |
| `d` | required | The INSIDE of that `<svg>`, as a string. Rules in §3. |
| `tile` | optional | `{ "axis": "x" \| "y" \| "xy", "module": <units>, "overlap": <units> }` for pieces meant to be butted edge to edge. See §4. |

### `scenes`: collages that arrive already placed, every piece movable

Leave `scenes` out (or `[]`) for a plain sticker kit.

| field | | |
|---|---|---|
| `id`, `name` | required | As above. |
| `items` | required | Placements in **paint order** (first is at the back). |
| `origin` | optional | `[x, y]` world px where the scene's own `[0, 0]` goes on the paper. Without it the importer lays scenes out four across with 360 px between them. |

Each **item** is the bench's own wall record, minus its type letter:

| field | | |
|---|---|---|
| `f` | required | A `stickers[].id`. |
| `x`, `y` | required | World px, in the scene's own frame: the **centre of the sticker's box** as placed. |
| `z` | required | World px: the **long edge of the sticker's box** as placed, so `z = max(w, h) × scale`. |
| `fx` | optional | `1` = mirrored left↔right about `x`. Omit when not mirrored; never write `0`. |
| `fy` | optional | `1` = mirrored top↔bottom about `y`. |
| `r` | optional | Rotation in degrees, clockwise, about the centre. |
| `o` | optional | Fade step: `0` = 1.0 (default), `1` = 0.55, `2` = 0.25. Any other opacity must be baked into the sticker (§3). |

The world is screen-like: x right, y down, 1 unit = 1 px at 100% zoom.

---

## 3. Drawing rules for `d`

Every stamp is pasted as markup into **one shared SVG** on the paper, many
times over. Every drawer card is a **separate little SVG**. Both facts drive
these rules.

1. **Only these elements:** `g`, `path`, `rect`, `circle`, `ellipse`, `line`,
   `polyline`, `polygon`.
2. **Only presentation attributes:** geometry (`d points x y width height rx ry
   cx cy r x1 y1 x2 y2`), `transform`, `fill`, `fill-rule`, `fill-opacity`,
   `stroke`, `stroke-width`, `stroke-linecap`, `stroke-linejoin`,
   `stroke-miterlimit`, `stroke-dasharray`, `stroke-dashoffset`,
   `stroke-opacity`, `opacity`.
3. **Never** use:
   - `id`, `class`, `style` attributes, `<style>`, `<defs>`, `<use>`
   - `url(#…)`: gradients, patterns, `clipPath`, `mask`, `filter`
   - `<text>`, `<image>`, `<foreignObject>`, `<script>`, `on*` handlers, `href`
   - `vector-effect`, `currentColor`, CSS variables

   Why: an id pasted twice collides, and one gradient definition would restyle
   every stamp. A card has no shared `<defs>`, and nothing may be fetched.
   `non-scaling-stroke` draws differently in a card than on the zoomed paper.
   Instead: a gradient is 2–4 flat bands, a soft shadow is a flat shape at low
   opacity, and text is drawn as paths.
4. **Colours** are literal `#rrggbb` / `#rgb` or `none`.
5. **Numbers** have at most 2 decimals, and never exponent notation. Prefer
   short relative path commands.
6. **Group opacity is fine:** `<g opacity=".7">…</g>`. The wall's own fade has
   only three steps (1, .55, .25), so any other fade that is part of the look
   is baked in.
7. **A shadow that belongs to a piece is drawn inside that piece's sticker**,
   so it moves with it. A piece with a shadow and the same piece without one
   are two stickers.
8. **Keep each sticker small:** aim ≤ 4 KB of `d`, never over 20 KB.

---

## 4. Boxes: `w`, `h`, and the viewBox

**The box must contain all the ink,** stroke included, with **2 units** of
margin. A card's `<svg>` clips at the viewBox, and the wall centres, scales,
mirrors and hit-tests a stamp by its box. Geometry alone is not enough, because
half of every stroke hangs outside its path.

- **Compute it** as the geometric bounds expanded by `max(stroke-width) / 2 + 2`
  on every side. That is exact for round and bevel joins. With miter joins on
  sharp corners, use round joins, or allow `stroke-width / 2 × miterlimit`.
- **If you can render, verify:** rasterise each sticker alone, unclipped, at
  2 px/unit or more, and check that no pixel with alpha > 0 lies outside
  `0 0 w h`. Do not trust `getBBox({stroke: true})`; Chrome ignores the
  option.
- **Units are yours to choose.** A loose sticker is stamped at a chosen long
  edge (160, 320 or 640 world px), so only proportions matter. A 400-unit
  drawing and a 40-unit one stamp the same.

**Tiles** (ground strips, walls, fences, floors, hill lines) are the one
exception. If a piece is meant to butt against copies of itself and its ink
runs past the box on purpose to hide the seam, keep the box at the module and
declare it: `"tile": { "axis": "x", "module": 480, "overlap": 10 }`. The
importer will not trim it.

**Mirrored pieces:**
- The wall mirrors a stamp about the **centre of its box**. If a scene uses a
  piece mirrored (`fx: 1`), its box must be **symmetric about the drawing's own
  axis**: extend the narrower side until left and right margins match.
- Otherwise ship the mirrored drawing as a sticker of its own.

---

## 5. Scenes: the placement maths

Say your design places sticker `s` (box `w × h`) at scale `k`, with its box's
top-left at `(X, Y)` in the scene's frame. Then:

```
x = X + w × k / 2
y = Y + h × k / 2
z = max(w, h) × k
```

If it is mirrored, add `"fx": 1` (and make the box symmetric, §4). If rotated,
add `"r"` in degrees.

- **Reuse ids.** Ten bicycles are ten items pointing at one sticker, each with
  its own `x`, `y`, `z` and `fx`. A different shadow or fade makes a separate
  sticker; a different size, position or mirror does not.
- **Paint order is array order.** Back first. Sort by your own depth key
  before writing.
- **Backdrops:** if a scene's backdrop should be movable, make it a sticker and
  the first item. If it is only a display frame, leave it out.
- **Size:**
  - Keep each scene within about 2000 × 1500 world px.
  - A piece's `z` usually lands between 20 and 1000.
  - At most 500 items a scene, 2000 in a file.

---

## 6. Budgets

- **Stickers:** the whole set's `d` markup should be ≤ 600 KB. The drawer
  fetches the catalogue in one piece; 900 KB works but is slow on phones.
- **Scenes:** as in §5.
- **The island must parse on its own:** `JSON.parse` of its text alone.

---

## 7. Checklist before you export

- [ ] Exactly one `<script type="application/json" id="knoll-kit">`, in the markup, and its text parses as JSON.
- [ ] `"format": "knoll-kit"` and `"version": 1`.
- [ ] Every id matches `[a-z0-9-]+`, starts with `set.id`, and is unique. None renamed or reused from an earlier export.
- [ ] Every `stickers[].kit` is a `kits[].id`. Every `scenes[].items[].f` is a `stickers[].id`.
- [ ] Every `d` uses only the elements and attributes of §3: no id/class/style/defs/use/url(#)/text/image/vector-effect.
- [ ] Every box holds its ink with 2 units of margin (§4), or declares `tile`.
- [ ] Pieces that scenes mirror have symmetric boxes.
- [ ] Numbers have ≤ 2 decimals. Budgets of §6 are respected.

---

## 8. A complete small example

```html
<script type="application/json" id="knoll-kit">
{"format":"knoll-kit","version":1,
 "set":{"id":"moss","name":"Moss Garden","made":"2026-09-12"},
 "kits":[{"id":"moss-stones","name":"Moss Garden · Stones"}],
 "stickers":[
  {"id":"moss-stone-round","name":"Round Stone","kit":"moss-stones","w":124,"h":84,
   "d":"<ellipse cx=\"62\" cy=\"42\" rx=\"56\" ry=\"36\" fill=\"#9e9e9e\" stroke=\"#1a1a1a\" stroke-width=\"8\"/>"},
  {"id":"moss-tuft","name":"Moss Tuft","kit":"moss-stones","w":66,"h":44,
   "d":"<path d=\"M6 38q6-24 20-30M32 38q0-26 10-32M50 38q6-18 10-22\" fill=\"none\" stroke=\"#4a7d45\" stroke-width=\"6\" stroke-linecap=\"round\"/>"}],
 "scenes":[{"id":"moss-bed","name":"Moss Bed","items":[
  {"f":"moss-stone-round","x":200,"y":160,"z":248},
  {"f":"moss-tuft","x":150,"y":120,"z":66},
  {"f":"moss-tuft","x":262,"y":118,"z":56,"fx":1}]}]}
</script>
```

Checking the boxes:
- **The stone:** ink runs 62 ± (56 + 4) = 2…122 across and 42 ± (36 + 4) = 2…82
  down, so the box is 124 × 84 with a margin of 2.
- **The tuft:** ink runs 6 − 3 … 60 + 3 = 3…63 across and 6 − 3 … 38 + 3 = 3…41
  down, so the box is 66 × 44. It is symmetric left to right (3 and 3), so the
  mirrored third item is exact.
- **The scene:** the stone stands at scale 2 (`z` 248 = 124 × 2) with a tuft
  either side, one of them mirrored.

---

## 9. For the importing agent (Claude Code)

A bench's artwork lives in two files beside its `index.html`:
`sticker-kits.json` (the drawer) and `wall-seed.json` (the wall a first visit
opens on).

1. **Find the island.**
   - In a plain file: the one `<script type="application/json" id="knoll-kit">`.
   - In a Design Canvas bundle: `JSON.parse` the `__bundler/template` script's
     text, then find the island in that string.
   - `JSON.parse` its text.
2. **Validate it against §7,** and fail loudly: list what breaks.
3. **File the kits:** append `kits` and `stickers` to the bench's
   `sticker-kits.json`, refusing any id already there.
   - Never add a script that calls `Stickers.load`: it replaces the catalogue,
     and a second caller empties the drawer.
   - Drop `tile` from the stored records, since the drawer ignores it.
4. **Place the scenes:** each item becomes `{"k":"d","f":…,"o":0,"x":X+ox,"y":Y+oy,"z":…}`,
   plus `fx`/`fy`/`r`/`o` when present, with `[ox, oy]` from the scene's
   `origin` or a four-across layout.
   - Write it into `wall-seed.json` in serve.js's `seedText` shape: one record
     per line.
   - Keep the file's `cam`, or frame the whole wall.
   - A browser that already has a wall for that bench keeps its own. To see the
     seed, use a fresh browser, or reset data and clear the bench's `…:seeded`
     key.
5. **Verify** in real Chrome: every item's `f` resolves, the drawer counts
   match, and take a screenshot.
