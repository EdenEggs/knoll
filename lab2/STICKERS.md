# Filling the sticker drawer

**STICKER** on the dock opens the sticker drawer (`stickers.js`). It ships
**empty**: the panel, the search, the chips, picking a sticker up, carrying one
out onto the paper and the wall item that paints it are all built and tested —
they are waiting on artwork. This file is what to hand an agent that is adding
some.

Everything below is the real contract, not a sketch. `perf/verify-stickers.js`
(23 checks) exercises it end to end.

---

## 1 · The one door in

```js
Stickers.load({
  kits:     [ { id: 'pipeworks', name: 'Pipeworks' } ],
  stickers: [ { id: 'pw-elbow', name: 'Elbow Joint', kit: 'pipeworks',
                w: 400, h: 400, d: '<path d="…" fill="#5a635d"/>' } ]
});
```

| field | what it is |
|---|---|
| `kits[].id` | matched against each sticker's `kit`. Any string. |
| `kits[].name` | the chip's label, upper-cased for display. Defaults to the id. |
| `stickers[].id` | **permanent** — see §5. Written into every stamp made from it. |
| `stickers[].name` | the card's first line, and what the search matches. Defaults to the id. |
| `stickers[].kit` | a `kits[].id`. Optional; a sticker with no kit only ever shows under **ALL**. |
| `stickers[].w`, `.h` | the drawing's own units — the `viewBox` numbers. Default 100. |
| `stickers[].d` | the **inside** of `<svg viewBox="0 0 w h">`. No `<svg>` wrapper. |

`load` **replaces** the catalogue rather than adding to it, so pass the whole
lot every time; calling it twice with the same data does not double anything.
It re-renders the drawer and repaints the wall on the way out, so stamps made
before their kit arrived draw themselves the moment it lands.

**The catalogue is memory, not storage.** Nothing here goes to
`localStorage`: shipped art is not the user's data, it must not answer to
`reset data`, it must not eat the few megabytes localStorage has, and its id
has to mean the same thing on every device. That means **`load` must run on
every page load** — it is a script, not a save.

---

## 2 · Where the files go

There is no build step in lab 2 and nothing here needs one. Start with one
file and one script tag:

```
lab2/sticker-kits.js      ← the kits, and the Stickers.load call at the end
```

```html
<!-- index.html, immediately after stickers.js -->
<script src="stickers.js"></script>
<script src="sticker-kits.js"></script>
```

The order matters: `sticker-kits.js` calls `Stickers.load`, so `stickers.js`
has to have defined `window.Stickers` first. Both come after `wall.js`.

Shape of the file:

```js
/* ─── THE STICKER KITS ─────────────────────────────────────────────────────
   The artwork the sticker drawer holds …  */
(function () {
  if (!window.Stickers) return;          // the drawer did not load; nothing to fill

  const KITS = [
    { id: 'pipeworks', name: 'Pipeworks' },
    { id: 'critters',  name: 'Critters'  }
  ];

  const STICKERS = [
    { id: 'pw-elbow', name: 'Elbow Joint', kit: 'pipeworks', w: 400, h: 400,
      d: '<path d="M60 340V200a60 60 0 0 1 60-60h140" fill="none" stroke="#5a635d" stroke-width="62"/>' },
    // …
  ];

  Stickers.load({ kits: KITS, stickers: STICKERS });
})();
```

**Split it when it gets unwieldy**, not before — one file per kit
(`sticker-kits/pipeworks.js`) with a small `sticker-kits/load.js` that
concatenates and makes the single `Stickers.load` call. One call, not one per
kit: `load` replaces.

**If the art gets heavy** (past roughly 300 KB of markup, or ~50 detailed
drawings) stop shipping it at boot and fetch it when the tool is first picked
up, the way `cursors.js` lazily fetches its bundle. `Stickers.load` is
designed for exactly this — call it late and the drawer fills, the chips
appear and any stamps already on the paper paint themselves.

---

## 3 · What makes a good `d`

The markup is injected with `innerHTML` into **one shared document** — an
`<svg>` in each drawer pocket, and a `<g>` inside the wall's single `<svg>`
for every stamp. That is the whole source of the rules below.

**Namespace every `id`.** This is the one that will actually bite. A
`<linearGradient id="a">` in two different stickers means the second one wins
for both, and the same goes for `clipPath`, `mask`, `filter`, `pattern` and
`symbol`. Prefix every id with the sticker's own id and rewrite every
reference — `url(#…)`, `href="#…"`, `clip-path`, `mask`, `filter`:

```
id="a"  →  id="pw-elbow-a"      fill="url(#a)"  →  fill="url(#pw-elbow-a)"
```

Better still: flatten gradients and clip paths away entirely where the drawing
does not need them. The house style is flat fills and hard strokes.

**No `<style>` blocks and no class names.** A `<style>` inside inline SVG
lands in the *document's* stylesheet and leaks over the whole bench; class
names collide with `lab.css`. Every colour, width and cap must be an **inline
attribute** (`fill="#5a635d"`, `stroke-width="62"`).

**No `currentColor`.** It would inherit from the wrapping `<g>`, which sets
no colour — you get black. Name your colours.

**No `<script>`, no external references.** No `href` to a file, no remote
image, no `<use>` pointing outside the sticker. Everything the drawing needs
travels in `d`.

**Strokes scale with the stamp**, because the wall applies a `scale()` to the
wrapping `<g>`. That is what you want — the drawing gets bigger, not spindlier
— so do **not** add `vector-effect="non-scaling-stroke"`.

**Transparent background.** No white backing rectangle: the pocket's checker
and the paper are meant to show through.

**Strip the export cruft.** Run it through SVGO or equivalent: drop
`<metadata>`, editor namespaces, `width`/`height` on the root (the `viewBox` is
what matters), and round path precision to 1–2 decimals. A simplified drawing
is typically 1–10 KB; if one is 200 KB it has not been cleaned.

**Set `w`/`h` from the `viewBox`.** If the source is
`viewBox="0 0 400 400"`, then `w: 400, h: 400`. If the source has no
`viewBox`, add one before converting — the numbers are how the drawing is
scaled and centred.

---

## 4 · Aspect ratio is the only size that matters

A stamp is scaled so its **long edge** is 160 / 320 / 640 world px (the
options row's S / M / L) and centred on the press. So the absolute numbers in
`w`/`h` are irrelevant — only their ratio is. A 1000 × 20 sticker at **S** is
160 × 3 px and effectively invisible.

Draw stickers on a roughly square canvas unless the thing genuinely is long,
and trim the `viewBox` to the ink: whitespace inside the `viewBox` is
whitespace the stamp pays for, and it pushes the drawing off the point the
user clicked.

---

## 5 · Ids are permanent

A stamp on the paper is `{ k: 'd', f: '<sticker id>', x, y, z, o }` — it names
the sticker and holds none of the drawing. So:

- **Never change an id** once artwork has shipped. Every stamp made from it
  goes blank. (Silently: an unknown id paints nothing and does not throw,
  which is deliberate so a kit that has not loaded yet is not an error.)
- **Changing the drawing under a stable id is fine** and is how you fix or
  restyle a sticker: every stamp of it repaints.
- **Removing a sticker blanks its stamps.** Same rule as taking a tracing out
  of the flat file — the artwork lives in one place.
- Name ids, do not number them: `pw-elbow`, not `sticker-07`.

Kit ids are looser — a sticker whose `kit` is not in `kits` still appears
under **ALL**, and its card shows the raw kit id where the kit's name would
be. Keep them in step anyway.

---

## 6 · What the drawer does with it

- **Chips** are `ALL` + one per kit, in the order `kits` is given.
- **Search** matches the sticker's `name` and its **kit's name**,
  case-insensitively, as a substring. Name things the way you would look for
  them.
- **The count line** reads `N STICKERS ON HAND`, or `N OF M STICKERS` once a
  chip or the search has narrowed it, or `THE DRAWER IS EMPTY`.
- **A card** is the drawing on a checker, its name, and its kit underneath.
- **A click** puts a sticker on the pointer (a second click takes it off);
  **a drag** carries it out and stamps it where it is let go. There is no
  viewer behind a card — nothing can be taken *out* of a drawer of shipped
  art, so there is nothing for one to hold.

---

## 7 · The checklist

1. Put the source vectors somewhere sensible and keep them — the originals,
   before cleaning.
2. For each one: ensure a `viewBox`, trim it to the ink, run SVGO, flatten or
   namespace every `id`, inline every colour, remove `<style>`/classes.
3. Write the entry: stable `id`, searchable `name`, a `kit`, `w`/`h` from the
   `viewBox`, and `d` as the inner markup.
4. Add the kit to `KITS` if it is new.
5. One `Stickers.load({ kits, stickers })` at the end of the file — never one
   call per kit.
6. Add the `<script>` tag after `stickers.js` in `index.html`, if it is not
   there yet.
7. Verify (§8).

---

## 8 · Verifying

From `site/`:

```bash
node lab2/perf/verify-stickers.js
```

23 checks, in real Chrome. It loads its **own** two made-up stickers rather
than yours — deliberately, so it does not go stale the day real kits arrive —
and covers the panel, the chips, the search, arming, both stamping paths, the
undo, and the empty state.

Then look at the real thing: `node serve.js` from `site/` (not `npx serve` —
lab 2's autosave door is in `serve.js`), open `/lab2/`, press **STICKER** and
check, for a handful of stickers across the kits:

- the thumbnail is the whole drawing, not a corner of it, and nothing is
  clipped by the pocket;
- the colours are right — a wrong or black fill means a leaked `id`, a
  `<style>` block, or `currentColor`;
- stamping one on the paper at **L** looks like the thumbnail, and two
  different stickers on the paper at once both look right (this is the
  `id`-collision test — it only shows when two are painted together);
- the search finds it by name and by kit.

The last of the 23 checks is the odd one out: it loads the bench with
`stickers.js` **blocked**, and asserts the options row says *the sticker
drawer did not load* rather than naming a drawer that is not there. wall.js
builds the dock and loads before `stickers.js`, so it cannot test for the file
— that row is the only place the failure can surface.

Measure and screenshot with Playwright and real Chrome, never the hidden
Browser pane — the pane does not run `requestAnimationFrame`, so anything that
settles through one reads stale there. `perf/shot-panels.js` shoots both
panels.

---

## 9 · Where the code is

| file | what it holds |
|---|---|
| `stickers.js` | the drawer: the catalogue, the panel, search, chips, arming, drag-out. `Stickers.load` is at the foot, under **FILLING THE DRAWER**. |
| `wall.js` | `stickerAt()` writes the stamp; `paint()`'s `k === 'd'` branch draws it. `IMG` is the S/M/L long edges. |
| `lab.css` | **THE SIDE PANELS** — the shared `.lab-panel` case and the `.sd-*` insides. |
| `about.md` | §7, *The sticker tool, and the sticker drawer* — the design argument. |
| `perf/verify-stickers.js` | the 23 checks. |
