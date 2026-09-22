# The Press Table — build plan for a coding agent

**Project:** Knoll, lab 2 (`site/lab2/`) — publisher game pages generated from uploaded marketing art, with a vector sticker kit that re-skins itself to each game's colours and art style.

**Audience:** the coding agent that will build it. Read all of §0 before touching anything.

**Status of this document:** a plan, not a record. Where it says "verify", the author of this plan could not see the file and you must read it before relying on the claim.

---

## 0 · Read this first

### 0.1 What the codebase actually is

The connected folder is **not** a React/Next.js application. It is a static, build-less, vanilla-JavaScript workbench:

- `lab2/index.html` is a single page: an infinite pan/zoom "bench" (`lab.js`) holding `<section class="gz">` boxes. Each section is a *feature*: either a Design Canvas export (`features/*.dc.html`) running in an iframe (a **machine**), an SVG **kit part** lifted out of a kit sheet by `kits.js` and painted as a sprite or as live inline SVG, or a **prop** drawn inline in a `.gz-art`.
- There is no bundler, no `package.json` inside `lab2/`, no TypeScript, no framework code of the bench's own. React 18 UMD (`vendor/`) exists only so Design Canvas machines can boot in their frames.
- Everything a visitor makes is `localStorage` (`Lab.store`). The **default look is the file**: `keep.js` posts positions every 30 s to a door in `../serve.js` (local only), which rewrites attributes in `index.html`. Deployed (Vercel, `knoll.space/`, served at `/` by rewrites in `../vercel.json`) the site is static and the door does not exist.
- Multiplayer cursors are peer-to-peer over WebRTC (`vendor/trystero-nostr.js`). No server holds state.
- The docs are `about.md` and `ADDING.md`, and the header comment of every file. **The comments are load-bearing**: numbers have paragraphs explaining where they came from. Keep that voice and that discipline. Three files are CRLF (`tape.js`, `keep.js`, `about.md`); everything else is LF. Match the file you edit.

Two things in the codebase already do half of this plan's work, and the plan reuses them rather than adding parallel versions:

1. **Palette-parametric SVG already exists.** Kit sheets (`features/forest.dc.html`, `village`, `gnome`) are Design Canvas documents whose SVG parts carry `{{ interpolations }}` and `<sc-if>` blocks; `kits.js` (THE EXTRACTOR, ~line 257) fills them from `SHEETS[kit].palette` at load. The sticker kit is a fourth sheet on exactly this mechanism, with the palette supplied per page instead of hard-coded.
2. **k-means palette extraction already exists** in `tracer.js` (the tracing table: k-means++ seeding, Lloyd's on a 3000-pixel sample, `MAX_DIM` 640). The theme extractor lifts that code into a shared module and the tracer keeps using it unchanged.

Also already present and reused: the token sheet in `lab.css` (`--paper`, `--ink`, `--pink`, `--blue`, `--green`, `--amber`, `--display`, `--body`, `--mono`, `--bench-bg`, …), the self-hosted fonts in `fonts/`, the `perf/` Playwright harness (`measure.js`, `verify.js`, `probe-*.js`, `posters.js`), and `perf/swap-machine.js` for turning a Design Canvas export into a machine.

If a separate Next.js/TypeScript app exists elsewhere and is the intended home, stop and ask. The analysis modules in this plan (Phases 1–3, §5–§7) are written framework-free so they port, but the sticker kit and the page generator (Phases 4–5, §8–§9) are specific to this bench.

### 0.2 Files outside the connected folder you must read before Phase 0 ends

- `site/serve.js` — the local server and the autosave door (`/_lab2/default`, GET returns `{door:…}`, POST writes `index.html`). You will add a second door. Read its guards first: it edits three attributes in place, refuses to write anything shorter than it read, writes through a temp file and rename, keeps one `index.html.keep-bak` per run, and never deletes a section. Preserve every one of those properties in anything you add.
- `site/vercel.json` — rewrites and cache headers. A new file at `lab2/` **root** needs two lines there (ADDING.md §5). Folders `features`, `fonts`, `posters`, `vendor` are wildcarded. This plan adds new **folders** (`press/`, `games/`) rather than root files wherever possible; each new folder needs its own wildcard rewrite and header rule. Verify whether the Vercel project root is `site/` (it must be, for `api/` functions to deploy).
- `site/package.json` (if it exists) — how `playwright` is installed for `perf/`. If there is none, `perf/*.js` are run with a globally available `playwright`; do not introduce a build step.
- `site/.claude/launch.json` — the `knoll-lab` config that runs `serve.js`.
- `lab/vectorize.js` (lab 1) — the original of the tracer's pipeline; only for reference.

### 0.3 Conventions to follow (non-negotiable)

- **No bundler, no transpiler, no framework.** Plain ES2020 in script files, IIFE modules exposing one global (`window.Press`, `window.Palette`), the way `wall.js` exposes `Wall` and `kits.js` exposes `Kits`. No `import`/`export` in browser files (the bench is loaded by `<script src>`); Node scripts under `perf/` and `press/tools/` use `require`.
- **No CDN, no network at paint time.** Fonts are self-hosted (`fonts/fonts.css`); a new face is a `.woff2` in `fonts/` plus an `@font-face`. Vendored libraries go in `vendor/` with their licence and version in a header comment. Prefer writing 80 lines over vendoring 80 KB.
- **The perf floor holds.** Zoomed out, the bench counts four booted documents (`Frames.panels.filter(p => p.loading).length`). Nothing you add may raise that. Stickers are **kit parts**, never machines. Never put `filter` or `mix-blend-mode` on a section or on `#bench-world` (ADDING.md §5). Filters *inside* a kit part's SVG are allowed but are measured (Phase 4.6). Measure with `perf/measure.js`; do not guess.
- **Measure, then place.** A box is its artwork. Read `el.offsetWidth/Height` after the frame cuts itself; never write a guessed box into markup.
- **Header comment first.** Every new file opens with a header in the house style: what it is, why it is shaped this way, the numbers and where they came from. Every constant that is a choice gets a sentence.
- **Counts in prose.** The main bench's `index.html` says "eighty-four" and "seventy-one" in several places. This plan does **not** add sections to the main bench (game pages are separate files), so those counts do not change. If you do add one, `grep -rn "eighty-four\|seventy-one"` and fix every one.
- **`about.md` and `ADDING.md` are updated in the same change** as the code they describe. A stale paragraph is worse than none.
- **Serve it, never `file://`.** `kits.js` fetches sheets and `frames.js` reaches into frames; neither works off disk. Use `node serve.js` from `site/` (or `start-lab2.bat`).

### 0.4 Definition of done, for every phase

1. The code runs on the local bench from `node serve.js` with no console errors.
2. The probe or verification script named in the phase passes and its output is saved under `perf/results/<label>/`.
3. `perf/measure.js` shows no idle-frame regression versus `perf/results/baseline` (median at the display floor; no new warm documents at 20 %).
4. The header comments, `about.md` and `ADDING.md` describe what was built.
5. A short note in `press/CHANGELOG.md`: what, why, what was measured.

### 0.5 How to work through this plan

- Start at Phase 0 and go in order (§15 says which phases may run in parallel). Finish a phase, run its acceptance, write the changelog note, and **stop and report** before starting the next one. Do not begin Phase 6 with Phase 5's verification red.
- Ask the five questions in §16 once, at the start, then proceed with the defaults for anything unanswered.
- When the codebase disagrees with this document, the codebase wins; note the disagreement in `press/NOTES.md` and adjust the plan there rather than silently diverging.
- Every number in this plan that came from measurement is marked as such in `about.md` or `perf/results/`; every number that is a first guess (thresholds in Phase 3, filter parameters in Phase 4, recipe coordinates in Appendix E) is a starting point, and the fixture tests and probes are how it gets corrected. Change the number, change its sentence.
- Never commit an API key, an intake bundle, a `press/cache/` file, or a `_src/` folder.

---

## 1 · Goal and scope

### 1.1 Goal

A publisher hands over a handful of images (key art, logo, screenshots) and a little text. Within seconds there is a **mockup** of a fan page in the game's own colours and art style: the bench's paper, ink and accents re-derived from the art; the house fonts swapped for a pairing that fits; the game's art laid out on the paper in one of a few compositions; and a tray of **vector stickers** that have re-coloured and re-styled themselves to the game (pixel-stepped for pixel art, wobbly ink for hand-drawn, glowing for neon). The owner reviews it, adjusts, and publishes it as a static page at `/games/<slug>/`.

### 1.2 In scope

- `press/palette.js` — shared colour quantisation (lifted from `tracer.js`).
- `press/theme.js` — palette → the bench's token sheet + sticker roles, with contrast enforcement (OKLCH).
- `press/style.js` — image statistics → a style vector and candidate presets.
- `press/vibe.js` + `api/vibe.js` — one Claude vision call returning a strict JSON judgement (mood, style, motifs, preset, font pairing, layout recipe), with heuristics as fallback.
- `features/stickers-core.dc.html` (+ later mood sheets) — the sticker kit, palette-parametric, layered for style variants.
- `kits.js` extensions — per-page palette, per-section palette override, the style pass, sprite baking of styled parts.
- `games/_template.html` + `press/tools/build-game.js` — the game page template and the generator that writes `games/<slug>/index.html`, `game.json` and re-encoded assets.
- `serve.js` door for game pages; `keep.js` aware of which page it is on.
- `press/index.html` — the Press Table: the owner-facing generator UI (local), and later the publisher-facing intake page (public).
- `api/intake.js` — public upload endpoint (Vercel function) storing bundles for the owner to import.
- Probes, fixtures, docs.

### 1.3 Out of scope (do not build, do not stub)

- Fan-side features on game pages (fan stickers from the Prize-O-Tron, chat, voting, moderation queues). Game pages get the same `wall.js` dock every bench has, and nothing more.
- Accounts, publisher logins, databases.
- Generative image models. §14 has the deliberately-not-built note.
- Any change to the three existing kit sheets' drawings.

---

## 2 · Architecture

```
 publisher / owner                 browser (press/)                          files (lab2/)
 ─────────────────                 ────────────────────────────────────      ─────────────────────────────
 drops images ───────────────▶  press/palette.js   k-means palette  ─┐
 + title, links, text          press/style.js     image statistics  ─┼─▶ analysis.json (in memory)
                               press/vibe.js  ──▶ api/vibe (Claude) ─┘        │
                                                                              ▼
                               press/theme.js  tokens + sticker roles ──▶ theme.json
                               press/recipes.js layout recipe (slots)  ──▶ layout.json
                               press/preview.js 3 mockups side by side
                                     │ owner picks / tweaks
                                     ▼
                               POST /_lab2/build  (serve.js, local only)
                                     │
                                     ▼
                               press/tools/build-game.js ──▶ games/<slug>/index.html
                                                             games/<slug>/game.json
                                                             games/<slug>/art/*.webp
                                                             (theme baked in as :root tokens)
                                     │
                               open /games/<slug>/  → lab.js + frames.js + kits.js + wall.js
                                                      kits.js fills features/stickers-*.dc.html
                                                      from the page's own tokens, applies the
                                                      style pass, bakes sprites
                                     │ keep.js autosaves positions through
                                     │ POST /_lab2/games/<slug> into games/<slug>/index.html
                                     ▼
                               git commit → Vercel → knoll.space/games/<slug>/
```

Public intake (Phase 8) is the same left-hand column running on `knoll.space/press/` for a publisher, ending in `POST api/intake` (a bundle in Vercel Blob) instead of the local door; the owner then imports the bundle into the local Press Table and continues from "owner picks / tweaks".

**Why the page is a file and the review is a person.** This site's whole design is that the default look is the file and a program only edits attributes on tags a person wrote. A game page follows suit: the generator writes a page once, the owner rearranges it on the bench and `keep.js` writes the arrangement back, and deployment is a commit. There is no CMS to add and no moderation queue to build for a partner flow that is a few pages a month.

---

## 3 · Data model

All JSON is written by the generator into `games/<slug>/game.json` and read back by the Press Table when a page is re-opened for editing. Schemas are in Appendix A; this section says what each object means.

### 3.1 `manifest`

The publisher's content: `slug`, `title`, `tagline`, `description` (plain text, ≤ 1200 chars), `developer`, `publisher`, `releaseDate` (ISO or free text like "2027"), `platforms[]`, `genres[]`, `links{steam,itch,site,press,trailer,...}`, `assets[]` (each: `id`, `role` ∈ `logo|keyart|screenshot|hero|misc`, `file`, `w`, `h`, `alpha:bool`, `sha256`), `rights` (`{attested:true, by:"name", at:ISO}`), `source` (`manual|steam|presskit|intake`).

### 3.2 `analysis`

Machine-derived facts, kept so a page can be regenerated without re-running the vision call: `palette[]` (≤ 8 entries `{hex, weight, L, C, h}` in OKLCH), `dark:bool`, `stats` (`pixelSize`, `outline{present,weight}`, `paletteCount`, `saturation`, `contrast`, `hfEnergy`, `edgeDensity`), `vibe` (the vision JSON, or `null`), `vibeCacheKey`.

### 3.3 `theme`

The bench token sheet for this page (every `--token` from `lab.css` `:root` that the page overrides) plus the sticker roles `--sk-*` and the font pairing id. This is what gets baked into `games/<slug>/index.html` as a `<style>` block right after `lab.css`. Sticker roles use the `--sk-` prefix because `--st-*` is already taken by the caution tape and `--gn-*` by the gnome stamps.

### 3.4 `style`

The style vector (Appendix B, derived in Phase 3, §7) and the chosen preset id. Baked into the page as `data-sk-style='{…}'` on `<html>` so `kits.js` can read it at boot.

### 3.5 `layout`

The recipe id and the resolved slots: for each placed thing, `{kind: 'pic'|'sticker'|'note'|'sign'|'machine', ref, x, y, scale, rot, z}` in world units, plus the opening rectangle `{x, y, w, h}` that `lab.js` frames on a first visit. After the owner rearranges on the bench, the file is the truth and `layout` in `game.json` is only the recipe's starting point.

### 3.6 Sticker kit contract (sheet side)

A sticker part is one `<sc-if value="{{ isBurst }}">` block wrapping exactly one `<svg>`, obeying ADDING.md §1 (elements: `path circle rect ellipse line g text`; no `<image>`, `<foreignObject>`, `<script>`, SMIL; shadow as a root CSS `filter: drop-shadow(6px 7px 0 rgba(0,0,0,.3))`). On top of that:

- **No literal colours.** Every `fill`/`stroke` is an interpolation of a role: `{{ skPrimary }}`, `{{ skSecondary }}`, `{{ skInk }}`, `{{ skPaper }}`, `{{ skHighlight }}`, `{{ skShadow }}`. Stroke widths are `{{ skStroke }}` (a number in the part's own units, 0–6). Corner radii on `rect` are `{{ skRadius }}`.
- **Layers are tagged.** Direct children of the root are `<g data-layer="shadow|body|line|highlight|detail|image-slot">`. `line` holds every outline stroke; `detail` holds fine strokes a simple style may drop; `image-slot` (frames, badges, tape) holds a `<rect>` placeholder that the page may replace with a clipped picture.
- **Tags in the sheet's `data-props`.** Each part's option carries `tags` (mood and motif words, Appendix D) so the tray can rank parts per game.
- **Drawn in one projection and one scale**: 128-unit box, the die-cut halo (`{{ skPaper }}` stroke behind the body) as its own `<g data-layer="halo">` so it can be turned on when contrast against the paper is poor.
- **Text slots.** A part with words (banner, bubbles, tags) holds them in `<g data-layer="text"><text>{{ skText }}</text></g>`, filled per section from `data-text` on the section (a per-section variant, like `data-palette` in §8 4.2). ADDING.md §1 already says a part with `<text>` is always live because an SVG image cannot use the page's webfont; text stickers therefore never become sprites and count against the live budget. Keep them few in any recipe (Appendix E uses at most three).

### 3.7 Section kinds on a game page

A game page uses the three kinds every bench has (machine, kit part, prop) plus one narrow addition:

- **`gz-pic`** — a prop (`.gz-art`, no `data-src`) whose inline SVG is `<svg viewBox="0 0 W H"><image href="art/x.webp" width="W" height="H"/></svg>`. It is a raster in a vector box so `frames.js` sizes it like the sign and `ink.js` treats its box as its ink. Verify in Phase 5 (§9.2) that `frames.js`'s art-panel path (`p.art`, ~line 1240) accepts it; if `Kits.inkAt` or the ctrl-outline assumes a kit, mark the section `data-pic` and short-circuit those two readers.

---

## 4 · Phase 0 — Discovery and scaffolding

**Goal:** know the ground before building. Nothing user-visible ships in this phase.

1. Read, in this order: `about.md`, `ADDING.md`, the headers of `lab.js`, `frames.js`, `kits.js`, `wall.js`, `keep.js`, `tracer.js`, `ink.js`; then `site/serve.js` and `site/vercel.json` in full. Write `press/NOTES.md`: the door's exact request/response shape, the `vercel.json` rules that will need lines, how `frames.js` sizes a `.gz-art`, how `kits.js` decides sprite vs live, and where `lab.js` reads the opening rectangle (WHERE IT OPENS).
2. Confirm the Playwright setup used by `perf/boot.js` (`chromium.launch({channel:'chrome', headless:false})`) runs on this machine. Record the command that works.
3. Create the folders: `press/`, `press/tools/`, `press/fixtures/`, `games/`. Add the wildcard rewrite and header rule for `press/` and `games/` to `site/vercel.json` (copy the shape used for `features/`). Add `api/` at the Vercel project root if it does not exist (Phase 7 needs it; adding the folder now confirms the project root).
4. Build three **synthetic fixture games** with `press/tools/make-fixtures.js` (Node, using Playwright's page canvas so no native image library is needed): `pixelfort` (16-colour pixel art at 4× nearest-neighbour, thick dark outlines), `mosslight` (soft painterly noise, low contrast, muted greens, no outlines), `neonrun` (dark, two saturated accents, glow, thin lines). Each fixture has a logo (transparent PNG), one portrait key art, one landscape key art, four 16:9 screenshots, and a `manifest.json`. These are the test inputs for every later phase.
5. Baseline: run `node lab2/perf/measure.js press-baseline` and keep the results.

**Acceptance:** `press/NOTES.md` exists with the five answers; fixtures render; baseline recorded.

---

## 5 · Phase 1 — `press/palette.js`: one quantiser, two callers

**Goal:** lift the tracer's k-means into a shared module without changing a single tracing.

1. Create `press/palette.js` exposing `window.Palette = { quantize(imageData, k, opts), sample(imageData, cap), toOklch(hex), fromOklch(L,C,h), contrast(hexA, hexB), clampL(hex, min, max) }`.
   - `quantize` is the tracer's k-means++ seeding + Lloyd's, moved verbatim (`SAMPLE_CAP` 3000, `ALPHA_T` 16). Return `[{hex, weight, r,g,b}]` sorted by weight. Add an `opts.ignoreEdges` (drop the outer 4 % border — screenshots often carry letterboxing) and `opts.minWeight` (drop clusters under 1 %).
   - OKLCH conversions: write them (sRGB → linear → LMS → OKLab → OKLCH and back, ~60 lines; Björn Ottosson's published matrices). No dependency.
   - `contrast` is WCAG 2.x relative-luminance contrast; it is what the theme enforces against.
2. `tracer.js` requires `Palette.quantize` in place of its own copy. Keep the tracer's `MAX_DIM`, sample cap and smoothing untouched. Load order in `index.html`: `press/palette.js` before `tracer.js`. (This is a new **folder**, not a root file, so `vercel.json` needs the folder wildcard from Phase 0, not per-file lines.)
3. Verify: `perf/verify-tracer.js` passes unchanged; add a golden test — trace each fixture's key art before and after and diff the path counts and colours (identical).

**Acceptance:** tracer golden diff empty; `Palette` documented in its header including the matrices' source.

---

## 6 · Phase 2 — `press/theme.js`: palette → the token sheet

**Goal:** a deterministic, contrast-safe mapping from extracted colours to the bench's tokens and the sticker roles. Pure functions; no DOM.

1. **Input:** `analysis.palette` (≤ 8 OKLCH entries with weights), `stats.saturation`, an optional `mood` hint (`calm|loud`, from the vision call or from saturation > 0.12 → loud).
2. **Light or dark:** weight-averaged L of the palette < 0.55 → dark page. Store `dark`.
3. **Derivation table** (all in OKLCH; `L` lightness 0–1, `C` chroma, `h` hue):

   | token | rule |
   |---|---|
   | `--paper` | dominant hue, `C ≤ 0.03`, `L` clamped to 0.94–0.98 (light) or 0.14–0.20 (dark) |
   | `--paper-2`, `--card` | paper −0.03 L / +0.01 L (light); reversed for dark |
   | `--bench-bg` | paper −0.035 L; `--bench-dot` = ink at 6 % alpha; `--drop-rgb` = ink's rgb |
   | `--ink` | the palette entry nearest the paper's complement in hue, at `L` 0.22 (light) / 0.92 (dark), `C ≤ 0.04`; `--ink-2` ±0.04 L, `--ink-3` ±0.10 L |
   | `--mute`, `--mute-2`, `--line` | ink mixed 55 % / 75 % / 88 % toward paper |
   | `--pink` (the accent) | highest-chroma entry with weight ≥ 2 %; adjust `L` until `contrast(accent, paper) ≥ 3.0` and `contrast(accent, ink) ≥ 1.5`; `--pink-2` = accent +0.08 L; `--pink-soft` = accent at L 0.90 / C 0.06 (light) or L 0.30 / C 0.06 (dark) |
   | `--blue`, `--green`, `--amber` | the next three most chromatic entries with hue distance ≥ 40° from the accent and each other; if fewer than three qualify, fill from harmonies: analogous ±30° when `mood=calm`, complementary +180° and split ±150° when `mood=loud`; each contrast-adjusted against paper like the accent |
   | `--field`, `--tint`, `--tint-2`, `--chip` | paper with 0 / 4 / 3 / 2 % of the accent mixed in |
   | `--hard-edge` | ink at L 0.10 (light) or paper at L 0.06 (dark) |
   | `--sticky-a..d` | four pads at L 0.88 C 0.10 on hues accent, +90°, +180°, +270° (light) or L 0.35 (dark) |
   | `--gz-handle-bg`, `--gz-handle-ink`, `--grip`, `--serial-ink` | ink-2 / paper / ink mixed 30 % toward paper / mute-2 |
   | `--sk-primary` | the accent |
   | `--sk-secondary` | `--blue` (the first secondary) |
   | `--sk-ink` | ink |
   | `--sk-paper` | `#fff` on a light page, paper on a dark page |
   | `--sk-highlight` | primary +0.15 L, C ×0.8 |
   | `--sk-shadow` | primary −0.22 L, C ×0.6 |
   | `--sk-halo` | `1` if `contrast(primary, bench-bg) < 2.2`, else `0` (the die-cut halo switch) |

   Leave the gnome (`--gn-*`) and caution-tape (`--st-*`) tokens alone: they are props with their own identity.
4. **Fonts:** `press/fonts.js` holds the pairing table keyed by id, each `{display, body, mono, faces:[…woff2 files that must exist in fonts/]}`. Start with what `fonts/` has: `clean` (Sora / Public Sans), `pixel` (VT323 / Space Mono), `hand` (Kalam / Public Sans), `rustic` (Rye / Public Sans), `gothic` (UnifrakturMaguntia display for accents, Pirata One headings / Public Sans). Add four faces as self-hosted `.woff2` + `@font-face` in `fonts/fonts.css` after checking each is OFL-licensed on Google Fonts: a comic display (Bangers), a cozy rounded (Fredoka), a sci-fi geometric (Orbitron), a typewriter/horror (Special Elite). That gives nine pairings. Never link Google.
5. **Output:** `theme = { dark, tokens:{'--paper':'#…', …}, fonts:{id, display, body, mono}, css }` where `css` is the `:root{…}` block ready to bake.
6. **Tests** (`press/tools/test-theme.js`, Node, no browser): for each fixture and for 200 random palettes, assert every text/paper pair meets its contrast floor, no token is `NaN`, light/dark decision matches the fixture's expectation, and the output is byte-identical across runs (determinism).

**Acceptance:** tests pass; a theme for each fixture renders the main bench convincingly when pasted into `:root` by hand (screenshot in `perf/results/theme-<fixture>/`).

---

## 7 · Phase 3 — `press/style.js`: image statistics → style vector

**Goal:** cheap, deterministic measurements that catch what a vision model is bad at estimating, producing a style vector and a ranked list of candidate presets. Browser module (needs a canvas); also runnable under Playwright for tests.

Work on a 512-px-long-edge copy of each **screenshot** (key art and logos are excluded from pixel-grid and outline statistics; they are included in saturation and palette count).

1. **Pixel grid (`stats.pixelSize`).** For `s` in 2…16: shrink by `s` with nearest-neighbour, re-enlarge by `s` nearest-neighbour, mean absolute RGB error against the original. Pixel art shows a sharp minimum (< 2 % of full scale) at its native `s` and its multiples; anything else stays above 6 % everywhere. `pixelSize` is the smallest `s ≥ 2` under the floor, else 0. Run on two screenshots and require agreement.
2. **Outline (`stats.outline`).** Sobel magnitude; strong-edge pixels (top 8 %); `present` if ≥ 45 % of strong-edge pixels have luminance < 0.25 and edge density is between 2 % and 18 % of pixels. `weight` is the median run length of dark-pixel runs crossing strong edges (1–2 → 0.3, 3–4 → 0.6, ≥ 5 → 0.9).
3. **Palette count (`stats.paletteCount`).** Posterise to 5 bits per channel, count bins holding ≥ 0.1 % of pixels. Under 24 → limited palette; under 12 → very limited.
4. **Saturation and contrast.** Mean OKLCH chroma of a 4 000-pixel sample (`saturation`), standard deviation of L (`contrast`).
5. **Texture (`stats.hfEnergy`).** Mean absolute Laplacian, normalised by contrast, on the non-edge pixels. High → painterly/noisy; near zero → flat vector or pixel.
6. **Style vector.** Map the stats to the fields in Appendix B (`lineShow`, `lineWeight`, `lineWobble`, `corners`, `shading`, `texture`, `paletteSize`, `pixel`, `saturation`, `finish`). Then score each preset in Appendix C by a weighted distance to its prototype vector and return the top three with scores. `pixelSize > 0` forces `pixel` to the top with the measured size.
7. **Tests:** the three fixtures rank `pixel`, `painterly`/`cozy-soft`, `neon` first respectively; the pixel fixture reports `pixelSize` 4. Save a stats dump per fixture under `press/fixtures/<name>/stats.json` as a golden file.

**Acceptance:** golden files stable across runs; each stat documented with the threshold's provenance in the header (which fixture, which number).

---
## 8 · Phase 4 — The sticker kit, and `kits.js` learning to re-skin

**Goal:** a fourth kit sheet of decorative vector stickers that takes its colours from the page and its rendering from a style preset, painted as sprites far away and live SVG near, at the cost model ADDING.md promises for kit parts.

### 4.1 The sheet

1. Author `features/stickers-core.dc.html` as a Design Canvas document in the same shape as `village.dc.html` (one file, `#part=` in the URL, `renderVals()` filling a palette, `data-props` listing every part under `part.options`). Draw the 40 core parts in Appendix D to the contract in §3.6. Keep every part inside its 128-unit box; the halo layer may spill 3 units and the shadow spills 6/7 — put both in `SHEETS.stickers.spill`.
2. `renderVals()` defaults: the bench's own tokens (`skPrimary '#c93b82'`, `skInk '#26212a'`, `skPaper '#fff'`, …) so the sheet opened on its own looks like Knoll.
3. Add the `tags` array to each option in `data-props` (Appendix D has them). The extractor reads them; the tray ranks by them.
4. Mark the sheet's shared `<defs>` (filters for the style pass, §4.4) in a 0×0 `<svg data-defs>` as the first child of the screen, the way the village sheet carries `#pine` and `#ds`, so `kits.js` copies it into every part.

### 4.2 Per-page palette in `kits.js`

Today `SHEETS[kit].palette` is a constant. Make it a function of the page:

1. At `loadSheet` time, build the palette from the page: `Object.fromEntries(roles.map(r => [r, getComputedStyle(document.documentElement).getPropertyValue('--sk-' + kebab(r)).trim() || SHEETS[kit].palette[r]]))`. The main bench has no `--sk-*` tokens, so it gets the sheet's defaults, which are the Knoll look. A game page's baked `:root` block supplies them.
2. Because the extracted strings are cached per kit and sprites are rasterised from them, the palette is resolved **once per page load**. That is correct for a game page (one skin per page). Document it.
3. **Per-section override** (`data-palette` on the section, a JSON object of role → hex): a sticker that must keep another page's colours — the "frozen at pull time" case the site will want later — is extracted as a variant keyed by `kit + part + hash(palette)`. Cache the variant; a bench with a hundred of them extracts a hundred strings once. The same variant path serves `data-text` on text-slot parts (§3.6). Add `data-palette` and `data-text` to what `keep.js` reports and `serve.js` writes (two more attributes on the tag; follow the `data-cut` pattern exactly, including the never-shrinks guard). The generator (Phase 5) writes both when a recipe asks for them.

### 4.3 Reading the style

`kits.js` reads `document.documentElement.dataset.skStyle` (JSON, Appendix B) at boot; absent → the `flat` preset with `lineShow:true`, which is how the sheet was drawn. Expose `Kits.setStyle(vector)` for the Press Table's live preview; it re-extracts the stickers sheet and re-bakes its tiles, nothing else. Also expose `Kits.extractOnly(sheetFile, palette, style) → Promise<{ [part]: { still, w, h } }>`: the extractor and the style pass with no bench behind them, so a page that is not a bench (the Press Table, Phase 6) can render sticker strings into plain `<div>`s. It must not touch `#bench-world`, `#kit-layer` or `Lab`; guard every reference the way the file's first line guards `world`.

### 4.4 The style pass

Applied inside `extract()`. Two of the steps (`skStroke`, `skRadius`) are interpolation values and go into the palette object **before** `conv()` runs; every other step is a DOM edit on the part's `<svg>` **after** `conv()` and before the `full/sway/still/raster` strings are serialised. Keep the DOM edits in one function `restyle(svg, style, part)` with a comment per step.

| style field | what the pass does |
|---|---|
| `lineShow:false` | remove `<g data-layer="line">` |
| `lineWeight` | set `{{ skStroke }}` before `conv()` runs: `0.5 + 5.5 × lineWeight` units |
| `corners` | set `{{ skRadius }}` = `corners × 18`; also `stroke-linejoin` `miter` (< 0.3) / `round` (≥ 0.3) on the line layer |
| `detail` (derived: `lineWeight < 0.35 or pixel > 0` → low) | remove `<g data-layer="detail">` when low |
| `shading: flat` | remove the shadow layer's inner shading, keep the root drop-shadow |
| `shading: cel` | shadow layer opaque, hard-edged (as drawn) |
| `shading: soft` | shadow layer gets `filter:url(#sk-soft)` (a 2-unit blur) |
| `shading: hatch / halftone / dither` | shadow layer's fill becomes `url(#sk-hatch)` / `url(#sk-dots)` / `url(#sk-dither)` pattern in `skShadow` over transparent |
| `lineWobble > 0` | line layer gets `filter:url(#sk-wobble)` (feTurbulence baseFrequency `0.04`, feDisplacementMap scale `wobble × 4`); `linePasses` > 1 clones the line layer with a different seed at 55 % opacity |
| `texture` | a `<rect>` filled with `url(#sk-paper|#sk-noise|#sk-scanlines|#sk-grunge)` masked by the body silhouette, at 18 % opacity, appended last |
| `finish: glow` | root filter becomes `drop-shadow(0 0 6px skPrimary)` in place of the hard shadow; line layer stroke = `skHighlight` |
| `finish: diecut` or `--sk-halo:1` | show `<g data-layer="halo">` |
| `paletteSize` 4/8/16 | quantise every role colour to the nearest of an evenly spaced OKLCH ramp of that size (done in `theme.js` before the palette reaches `kits.js`, so live and raster agree) |
| `pixel` = s (> 0) | **raster path only**: rasterise the *still* string at `1/s` of its box, re-enlarge with `imageSmoothingEnabled=false`, and use that bitmap for the sprite **and** for the live grade (the live `.gz-art` holds a `<canvas>` painted with the same bitmap rather than inline SVG; the part is always `still`) — a pixel sticker does not sway. Where a canvas is not possible, fall back to the live SVG with `shape-rendering:crispEdges`. |

The `<defs>` for `#sk-soft`, `#sk-wobble`, `#sk-hatch`, `#sk-dots`, `#sk-dither`, `#sk-paper`, `#sk-noise`, `#sk-scanlines`, `#sk-grunge` live in the sheet's `data-defs` svg (§4.1 step 4). Patterns take `{{ skShadow }}`/`{{ skInk }}` so they follow the palette.

### 4.5 Sprites and grades

The existing three grades stand. Two rules specific to stickers, measured in 4.6:

- A part that carries an SVG filter (`wobble`, `soft`, `glow`) is **never `full`** and is `sway` only within the `SWAY_MAX` budget; otherwise `still`. The sprite bakes the filtered look, so far away it looks the same for free.
- Pixel-preset parts are always `still` (above).

### 4.6 Measure

`perf/probe-stickers.js`: a game page with 60 sticker sections at each preset; `measure.js` cameras at 20/35/50/100/166/400 %. Record per preset: idle median, worst frame, live count. Accept a preset only if the idle median stays at the display floor and no frame exceeds 34 ms with 20 live filtered parts on screen. If `wobble` or `glow` fails at 166 %, lower that preset's `SWAY_MAX` share (a per-preset cap in `SHEETS.stickers`) and re-measure. Write the numbers into the header of `stickers-core.dc.html` and into `about.md` §9.

### 4.7 Verify

Extend `perf/verify.js`'s kit checks to the stickers sheet: every part extracts; no literal colour survives in any part (grep the extracted string for `#` outside `url(#`); each `data-layer` present exactly once; ctrl-outline reads the drawing's alpha; copy/paste of a sticker section lands in the copies block as the five-line section.

**Acceptance:** 40 parts on the main bench in Knoll colours, and on a fixture game page in the fixture's colours and style; probe numbers recorded; docs updated (ADDING.md §2 gets "the stickers sheet, and what `--sk-*` and `data-sk-style` do").

---

## 9 · Phase 5 — The game page: template, generator, door

**Goal:** `press/tools/build-game.js` turns `manifest + analysis + theme + style + layout` into a working bench at `games/<slug>/`, and the bench's autosave writes back into that file.

### 5.1 `games/_template.html`

A copy of `index.html`'s skeleton with the lockup, field, forest and village sections removed, and these placeholders: `{{TITLE}}`, `{{DESCRIPTION_META}}`, `{{TOKENS_CSS}}` (the `:root{…}` block, placed **after** `lab.css`), `{{FONT_PRELOADS}}`, `{{SK_STYLE}}` (the `data-sk-style` attribute value), `{{OPENING_RECT}}` (four numbers, read by `lab.js` from `data-open="x,y,w,h"` on `#bench-world` — add that read to `lab.js` WHERE IT OPENS with the main bench's four numbers as the fallback), `{{SECTIONS}}`, and the `keep.js` copies-block markers. Script and stylesheet paths are relative (`../../lab.js`), which works both locally at `/lab2/games/<slug>/` and deployed at `/games/<slug>/` once the folder wildcard rewrite exists. Keep every header comment from `index.html` that still applies; drop the ones that argue for lockup positions; add one that says this file is generated once and edited by hand and by `keep.js` thereafter.

The header on a game page is the landing-page header (wordmark only) plus a small "← knoll" link; the `lab-local` switches appear locally exactly as on the main bench.

### 5.2 Sections the generator writes

For each slot in `layout.slots`, in `z` order (markup order is pile order):

- `pic` → a `gz-pic` prop (§3.7) around `art/<file>`, sized to the asset's pixel size × `scale`, `data-home-x/y`, `data-home-z` if the recipe says so.
- `sticker` → a kit-part section with `data-src="features/stickers-core.dc.html#part=<part>"`, the five-line shape, `data-rot` if rotation is wanted (add `data-rot` support to `kits.js`'s live/sprite placement — a rotated sprite is drawn rotated into the tile; verify `frames.js` measures the unrotated box and that `ink.js` maps the pointer through the rotation. If that is more than a day, drop rotation from v1 and note it).
- `note` → a wall note in `Lab.store('wall')` is per-browser, so the generator instead writes a **prop**: a `.gz-art` with an inline `<svg>` `<text>` block in the page's `--body` face (title, tagline, description at the recipe's width; wrap with the same canvas-measure `wall.js` uses, or a simple greedy wrap at 0.55 em average — measure, do not guess, and record which).
- `sign` → the store-links prop: a `.gz-art` with anchors styled as the dock's chips. Verify how `lab.js` treats a press inside a `.gz-art` (the band and the drag arm on capture); anchors will need `data-nodrag` and a click that does not drag — the `gz-size` button is the precedent.
- `machine` (optional, v2) → the trailer: `features/trailer.dc.html`, a React document holding a YouTube/Steam embed that only boots when its box is 480 px wide; needs a poster. Skip in v1 unless the fixtures have trailer links.

### 5.3 Assets

`build-game.js` re-encodes every image: strip metadata by re-encoding, cap the long edge at 2048 (hero) / 1600 (screenshots) / 1024 (logo, PNG to keep alpha), write `.webp` at quality 0.86 (PNG for alpha), compute `sha256`, and write the `assets[]` entries into `game.json`. Called from `/_lab2/build`, the images arrive already re-encoded by the Press Table's canvas in the browser and are written as they are; called from the command line on a fixture folder, the script does the encoding itself through a Playwright page's canvas (no native image library in this repo, and none is to be added to the bench side). Keep originals out of the repo (`games/<slug>/_src/` is gitignored).

### 5.4 The door

1. In `site/serve.js`, add `/_lab2/games/<slug>` beside `/_lab2/default`: same GET handshake (`{door:true, file:'games/<slug>/index.html'}`), same POST body, same in-place attribute editing, same guards, same one-backup-per-run (`games/<slug>/index.html.keep-bak`). Refuse a slug that is not `^[a-z0-9-]{2,40}$` or whose file does not exist.
2. Add `/_lab2/build` (POST, local only): accepts the Press Table's bundle (`manifest, analysis, theme, style, layout`, plus the images as base64) and runs `build-game.js` in-process, returning the slug and any warnings. It refuses to overwrite an existing `games/<slug>/index.html` unless `{force:true}`; even then it writes `index.html.keep-bak` first.
3. `keep.js` derives its door from `location.pathname`: `/lab2/games/<slug>/` → `/_lab2/games/<slug>`, else `/_lab2/default`. Nothing else in `keep.js` changes.
4. `perf/posters.js` takes an optional page path so a game page's machines (the trailer, later) get posters.

### 5.5 Verify

`perf/verify-game.js <slug>`: the page boots with zero console errors; `Frames.panels.filter(p=>p.loading).length` is 0 at 20 %; every `gz-pic` measures to its asset's aspect; every sticker section extracts in the page's colours (sample a pixel from a live part and compare to `--sk-primary`); drag a sticker, `ctrl+s`, reload, it is where it was dropped; the `.keep-bak` exists; opening rectangle frames the composition at 2560×1111 and at 1366×768.

**Acceptance:** `node lab2/press/tools/build-game.js press/fixtures/pixelfort` produces a page that passes `verify-game.js`; same for the other two fixtures; docs updated (`about.md` gets a §12 "Game pages"; `ADDING.md` gets "a fifth kind: `gz-pic`").

---

## 10 · Phase 6 — The Press Table (owner-facing, local)

**Goal:** the generator has a face. Drop images, see the analysis, compare three mockups, tweak, build.

### 6.1 Where it lives

`press/index.html`, a plain page (not a bench and not a machine): it has forms, previews and a job to do, and the bench's camera would be in the way. It loads `press/palette.js`, `theme.js`, `style.js`, `fonts.js`, `recipes.js`, `preview.js`, `press.js`, and `fonts/fonts.css`. Design it in Design Canvas if you like (the tracing table was), but transcribe it to classes in `press/press.css` the way `tracer.js` did; no iframe.

### 6.2 Flow

1. **Drop zone.** Images (PNG/JPG/WebP, ≤ 12 files, ≤ 25 MB total) and an optional `manifest.json`. Each image is classified on arrival: alpha channel present → `logo`; aspect within 5 % of 16:9 or 16:10 → `screenshot`; portrait → `keyart`; the largest landscape non-screenshot → `hero`. The owner can change a role from a dropdown.
2. **Fields.** Title (required), slug (auto from title, editable), tagline, description, developer, publisher, release, platforms (chips), links (Steam, itch, site, press kit, trailer). Rights attestation checkbox with the publisher's name.
3. **Analyse** runs automatically when the first image lands and again when roles change: `Palette.quantize` on hero + key art (k = 8), `Style.measure` on screenshots, `Theme.derive`, top-three presets, top-three recipes (Appendix E chooses by asset shapes: portrait key art → `poster`, landscape hero → `widescreen`, hand-drawn or cozy preset → `scrapbook`). Show the palette swatches, the stats, the chosen tokens and the reasons ("dark: mean L 0.31"; "pixel: native size 4 from two screenshots").
4. **Three mockups side by side** (`preview.js`): each is a scaled-down static rendition of the recipe with the theme applied — the page's paper, the pictures placed, the notes set in the pairing, and the sticker tray's first twelve parts rendered live through `kits.js`'s extractor (load `kits.js` in the Press Table with a `Kits.extractOnly(sheet, palette, style)` entry point added in Phase 4; the preview needs strings, not a bench). Variants: recipe A light, recipe A dark (if the palette is ambiguous), recipe B; a **shuffle** re-rolls the secondary accents' harmony and the recipe.
5. **Tweak panel:** accent from the extracted swatches (never a free picker), preset from the top three (with the tray re-rendered on change), font pairing from the three suggested, hero choice, screenshot order (drag), sticker set toggles (core + mood sheets when they exist).
6. **Build** → `POST /_lab2/build`. On success, a link to `/lab2/games/<slug>/` and a note that `keep.js` is now writing to that file. Re-opening the Press Table with `?slug=<slug>` loads `game.json` and lets the owner regenerate (with the `force` prompt).
7. Everything the owner typed is kept in `localStorage` under `knoll-press:*` until built, so a refresh does not lose a form. The Press Table does not load `lab.js` (it is not a bench), so it cannot use `Lab.store`; copy that helper's shape (`get/set/update/on/reset`, saved on every write, quota errors swallowed and read back) into `press/store.js` rather than importing the bench for one function.

### 6.3 Verify

`perf/verify-press.js`: drop the three fixtures by script, assert the auto roles, the top preset per fixture, three previews rendered with non-empty sticker trays in the fixture's colours, build succeeds, `games/<slug>/` exists, and the page passes `verify-game.js`.

**Acceptance:** an owner can go from a folder of images to a browsable game page in under two minutes without touching a file by hand.

---

## 11 · Phase 7 — The vision call

**Goal:** one Claude call per game, returning a strict JSON judgement; the heuristics stay the fallback and the tie-breaker.

1. **`api/vibe.js`** (Vercel serverless function at the project root's `api/`, Node runtime). Input: up to four images as base64 (the Press Table downsizes each to ≤ 1024 px long edge, ≤ 1.5 MB), plus the heuristic stats. Output: the JSON in Appendix F, validated server-side against the schema; on any validation failure return `{vibe:null, error}` and let the client fall back. Use the Anthropic Messages API with the model id pinned in one constant (`MODEL`) at the top of the file with a comment saying when it was chosen; use tool-use with the schema as the tool's input schema so the model must return structured output; `max_tokens` 800; temperature 0. The API key is `ANTHROPIC_API_KEY` in Vercel env; never in the repo, never in the browser.
2. **Local mount:** `serve.js` mounts the same handler at `/_lab2/vibe` (require `api/vibe.js`'s handler function; keep the function file dependency-free so it runs under both). Locally the key comes from the environment of the `node serve.js` process.
3. **Cache:** key = sha256 of the concatenated image hashes + stats + `MODEL`. On Vercel, cache in Vercel KV if configured, else no cache (the call is cheap). Locally, `press/cache/vibe-<key>.json` (gitignored). The Press Table sends the key and skips the call on a hit.
4. **Prompt** (Appendix F): the model is told the fixed menus (preset ids, font pairing ids, recipe ids, tag vocabulary) and asked for `artStyle`, `mood`, `motifs[3–5]`, `preset` + two alternates, `fontPairing`, `recipe`, `harmony` (`calm|loud`), and `confidence`. It never invents ids; anything off-menu fails validation.
5. **Merge rules** in `press/vibe.js`: `pixelSize > 0` from heuristics overrides the model's preset; otherwise the model's preset wins if its confidence ≥ 0.6 and it is within the heuristics' top three, else the heuristics' first with the model's as the second option shown. `harmony` and `fontPairing` are the model's unless absent. `motifs` rank the sticker tray (tag overlap).
6. **Verify:** `press/tools/test-vibe.js` posts the fixtures and asserts schema-valid output and that `pixelfort` comes back `pixel`; run it against the local mount. Mock the API in CI-style runs with a recorded response so the suite does not spend money.

**Acceptance:** with the key present the Press Table shows "judged by the model" next to the reasons; without it, nothing breaks.

---

## 12 · Phase 8 — Public intake (publisher-facing)

**Goal:** a publisher can do the left-hand column of §2 themselves on `knoll.space/press/` and hand the owner a bundle.

1. **The same page, two modes.** `press/index.html` knocks on `/_lab2/default` on load, exactly the way `keep.js` does. Door present → owner mode (Phase 6). No door → publisher mode: the same drop zone, fields, analysis and three previews, but the last button is **Send to Knoll**, and the tweak panel is reduced to accent, preset and hero (the owner keeps the rest).
2. **`api/intake.js`** (Vercel function): accepts a multipart bundle (`bundle.json` + images), enforces limits (≤ 12 files, ≤ 25 MB, PNG/JPG/WebP by magic bytes, not by extension), re-encodes every image with `sharp` (this function may depend on `sharp`; the bench never does) to strip metadata and cap size, stores under `intake/<token>/` in Vercel Blob with a random 22-char token, and returns `{token}`. Rate-limit by IP (10 per hour). Require the rights attestation flag in `bundle.json`. Optional: email the owner the token (Resend), else the owner lists intakes with `GET api/intake?list=1` behind `INTAKE_SECRET`.
3. **Import.** Owner mode's Press Table gets an **Import** field: paste a token → `GET api/intake?token=…` (secret-protected) → the bundle loads into the form as if dropped, with "from <publisher name>, <date>" shown. Continue to Build as usual.
4. **Retention:** bundles expire after 30 days (a scheduled cleanup, or a note in the docs to prune by hand until there is volume).
5. **Verify:** `press/tools/test-intake.js` posts a fixture bundle to the local mount (mount `api/intake.js` in `serve.js` with a local folder in place of Blob), imports it, builds, verifies.

**Acceptance:** a publisher with a link and no account can submit; the owner can import and build; nothing on the deployed site holds a page that a person has not approved.

---

## 13 · Phase 9 — Verification pass and documentation

1. Run the whole suite: `verify.js`, `verify-tracer.js`, `verify-game.js` for each fixture, `verify-press.js`, `probe-stickers.js`, `measure.js press-final`, `boot.js press-final` on the main bench (nothing about its opening time may regress — `press/palette.js` is loaded by `index.html` now; if it costs anything at boot, defer it the way `cursors.js` is deferred until idle).
2. Update `about.md`: §2 file table (new files and folders), §9 numbers for stickers, a new §12 "Game pages and the Press Table" (the flow, the door, the files, what `keep.js` writes where), and §10 bites: "two Press Tables open will fight over a bundle", "a game page's `data-open` is the opening shot and is not saved by keep.js".
3. Update `ADDING.md`: the stickers sheet under §2; `gz-pic` as a kind in the table; the rule that a sticker with a filter is never `full`; "adding a preset" (a prototype vector in `style.js`, a row in Appendix C, a probe run).
4. `press/README.md`: how to run the Press Table locally, how to import an intake, how to add a sticker part, how to add a font pairing, the env vars (`ANTHROPIC_API_KEY`, `INTAKE_SECRET`, Blob/KV bindings), and the deploy checklist (`vercel.json` lines, posters rebuilt, `games/<slug>/` committed).

---

## 14 · Phase 10 — Later, and deliberately not now

- **Stroke renderer** for hand-made media (pencil, marker, watercolour): stamp a brush texture along each path with seeded jitter; rasterise once per game per part; cache. Only worth it once several painterly games exist.
- **Authored variants** of the top 30 stickers in the top 4 styles, as separate parts (`burst-pixel`, `burst-paint`) chosen by the preset before the filter pass. Decide from Press Table usage logs which parts and styles.
- **Mood sheets** (`stickers-fantasy`, `stickers-scifi`, `stickers-cozy`, `stickers-horror`) once the core sheet's tags show what is missing.
- **Steam and presskit() importers** for the manifest (Steam's `appdetails` endpoint is unofficial: cache, never depend on it).
- **Generative style transfer** is out. A large part of the indie and fan audience is hostile to AI-generated art, and the filter and renderer paths reach most of the effect. If ever added, it is opt-in per publisher, labelled, and never the default. Do not stub it.

---
## 15 · Order of work and milestones

| # | phase | depends on | ships |
|---|---|---|---|
| 0 | Discovery, fixtures, baseline | — | `press/NOTES.md`, fixtures, `vercel.json` folder rules |
| 1 | `press/palette.js` | 0 | shared quantiser; tracer unchanged in behaviour |
| 2 | `press/theme.js`, `press/fonts.js` | 1 | tokens + sticker roles, nine pairings |
| 3 | `press/style.js` | 0 | stats, style vector, preset ranking |
| 4 | stickers sheet + `kits.js` re-skin and style pass | 2, 3 | 40 stickers that follow any page's colours and style |
| 5 | template, `build-game.js`, doors, `keep.js` | 2, 4 | a working game page per fixture, autosaving to its own file |
| 6 | Press Table (owner mode) | 3, 5 | images → page in two minutes |
| 7 | vision call | 6 | better preset/font/recipe choices; motif-ranked tray |
| 8 | public intake | 6 | publishers submit; owner imports |
| 9 | verification and docs | all | suite green, docs current |
| 10 | later | — | not now |

Milestone A (end of 5): the owner can generate a page from a folder by command line. Milestone B (end of 6): from the Press Table. Milestone C (end of 8): publishers self-serve.

Phases 1–3 are independent of 4 and can be built in parallel with it; 5 needs 2 and 4; 6 needs everything before it.

## 16 · Questions for the owner before starting (ask once, then proceed with the defaults)

1. Is `site/` the Vercel project root, and may `api/` functions be added to this deployment? *Default: yes.*
2. Is a Steam URL importer wanted in v1 (adds an unofficial dependency)? *Default: no; Phase 10.*
3. Should game pages carry the trailer machine in v1? *Default: no; a "watch the trailer" link in the sign prop.*
4. Rotation on placed stickers (`data-rot`) in v1 if it costs more than a day? *Default: drop it.*
5. Who receives intake notifications, and by what channel? *Default: none; the owner lists intakes with the secret.*

---

# Appendices

## Appendix A · JSON schemas (`press/schemas/*.json`, JSON Schema draft 2020-12)

Write these as real files and validate against them in `build-game.js`, `api/vibe.js` and `api/intake.js` (a 60-line validator is enough: types, enums, required, min/max, pattern; do not vendor a full library).

```jsonc
// manifest.schema.json
{
  "type": "object",
  "required": ["slug", "title", "assets", "rights"],
  "properties": {
    "slug":        { "type": "string", "pattern": "^[a-z0-9-]{2,40}$" },
    "title":       { "type": "string", "minLength": 1, "maxLength": 80 },
    "tagline":     { "type": "string", "maxLength": 140 },
    "description": { "type": "string", "maxLength": 1200 },
    "developer":   { "type": "string", "maxLength": 80 },
    "publisher":   { "type": "string", "maxLength": 80 },
    "releaseDate": { "type": "string", "maxLength": 40 },
    "platforms":   { "type": "array", "items": { "enum": ["pc","mac","linux","switch","ps5","xbox","ios","android","web"] } },
    "genres":      { "type": "array", "items": { "type": "string", "maxLength": 30 }, "maxItems": 6 },
    "links":       { "type": "object", "additionalProperties": { "type": "string", "pattern": "^https://", "maxLength": 300 } },
    "assets": {
      "type": "array", "minItems": 1, "maxItems": 12,
      "items": {
        "type": "object", "required": ["id", "role", "file", "w", "h", "alpha", "sha256"],
        "properties": {
          "id":     { "type": "string", "pattern": "^[a-z0-9-]{1,40}$" },
          "role":   { "enum": ["logo", "keyart", "hero", "screenshot", "misc"] },
          "file":   { "type": "string", "pattern": "^art/[a-z0-9-]+\\.(webp|png)$" },
          "w":      { "type": "integer", "minimum": 16 }, "h": { "type": "integer", "minimum": 16 },
          "alpha":  { "type": "boolean" },
          "sha256": { "type": "string", "pattern": "^[a-f0-9]{64}$" }
        }
      }
    },
    "rights": { "type": "object", "required": ["attested", "by", "at"],
                "properties": { "attested": { "const": true }, "by": { "type": "string" }, "at": { "type": "string" } } },
    "source": { "enum": ["manual", "steam", "presskit", "intake"] }
  }
}
```

```jsonc
// analysis.schema.json
{
  "type": "object", "required": ["palette", "dark", "stats"],
  "properties": {
    "palette": { "type": "array", "maxItems": 8, "items": { "type": "object",
      "required": ["hex", "weight", "L", "C", "h"],
      "properties": { "hex": { "type": "string", "pattern": "^#[0-9a-f]{6}$" }, "weight": { "type": "number" },
                      "L": { "type": "number" }, "C": { "type": "number" }, "h": { "type": "number" } } } },
    "dark": { "type": "boolean" },
    "stats": { "type": "object", "properties": {
      "pixelSize": { "type": "integer", "minimum": 0, "maximum": 16 },
      "outline": { "type": "object", "properties": { "present": { "type": "boolean" }, "weight": { "type": "number" } } },
      "paletteCount": { "type": "integer" }, "saturation": { "type": "number" }, "contrast": { "type": "number" },
      "hfEnergy": { "type": "number" }, "edgeDensity": { "type": "number" } } },
    "vibe": { "oneOf": [ { "type": "null" }, { "$ref": "vibe.schema.json" } ] },
    "vibeCacheKey": { "type": "string" }
  }
}
```

```jsonc
// theme.schema.json
{
  "type": "object", "required": ["dark", "tokens", "fonts"],
  "properties": {
    "dark": { "type": "boolean" },
    "tokens": { "type": "object", "propertyNames": { "pattern": "^--[a-z0-9-]+$" },
                "additionalProperties": { "type": "string" } },
    "fonts": { "type": "object", "required": ["id"], "properties": {
      "id": { "enum": ["clean", "pixel", "hand", "rustic", "gothic", "comic", "cozy", "scifi", "typewriter"] } } }
  }
}
```

```jsonc
// style.schema.json  — the style vector (Appendix B) plus the preset
{
  "type": "object", "required": ["preset"],
  "properties": {
    "preset":      { "enum": ["pixel","flat","outline-cartoon","cel","painterly","ink-sketch","neon","retro-print","grunge","cozy-soft"] },
    "lineShow":    { "type": "boolean" },
    "lineWeight":  { "type": "number", "minimum": 0, "maximum": 1 },
    "lineWobble":  { "type": "number", "minimum": 0, "maximum": 1 },
    "linePasses":  { "type": "integer", "minimum": 1, "maximum": 3 },
    "corners":     { "type": "number", "minimum": 0, "maximum": 1 },
    "shading":     { "enum": ["flat","cel","soft","hatch","halftone","dither","painterly"] },
    "texture":     { "enum": ["none","paper","noise","scanlines","grunge","canvas"] },
    "paletteSize": { "enum": [0, 4, 8, 16] },
    "pixel":       { "type": "integer", "minimum": 0, "maximum": 16 },
    "saturation":  { "type": "number", "minimum": 0, "maximum": 1 },
    "finish":      { "enum": ["none","diecut","shadow","glow"] }
  }
}
```

```jsonc
// layout.schema.json
{
  "type": "object", "required": ["recipe", "open", "slots"],
  "properties": {
    "recipe": { "enum": ["poster", "widescreen", "scrapbook"] },
    "open":   { "type": "object", "required": ["x","y","w","h"], "additionalProperties": { "type": "number" } },
    "slots":  { "type": "array", "items": { "type": "object", "required": ["kind","ref","x","y"],
      "properties": {
        "kind":  { "enum": ["pic","sticker","note","sign","machine"] },
        "ref":   { "type": "string" },
        "x": { "type": "number" }, "y": { "type": "number" },
        "scale": { "type": "number", "minimum": 0.05, "maximum": 4 },
        "rot":   { "type": "number", "minimum": -45, "maximum": 45 },
        "z":     { "type": "integer" },
        "text":  { "type": "string", "maxLength": 1200 },
        "width": { "type": "number" }
      } } }
  }
}
```

`vibe.schema.json` is in Appendix F.

## Appendix B · The style vector

| field | type | meaning | derived from (Phase 3) |
|---|---|---|---|
| `lineShow` | bool | outlines exist | `outline.present` |
| `lineWeight` | 0–1 | stroke width | `outline.weight` |
| `lineWobble` | 0–1 | hand-drawn wobble | `hfEnergy` high and `outline.present` → 0.5; model may raise |
| `linePasses` | 1–3 | sketchy multi-stroke | `ink-sketch` preset only |
| `corners` | 0–1 | angular → rounded | `pixelSize>0` → 0; `saturation` low and `hfEnergy` low → 0.6; else 0.3 |
| `shading` | enum | shadow rendering | `paletteCount<24` → `cel` or `flat`; `hfEnergy` high → `painterly`; `pixelSize` → `dither` |
| `texture` | enum | overlay | `hfEnergy` high → `paper`/`grunge`; dark + saturated → `scanlines` (neon) else `none` |
| `paletteSize` | 0/4/8/16 | quantised roles | `paletteCount<12` → 8; `<24` → 16; else 0 |
| `pixel` | int | native pixel size | `pixelSize` |
| `saturation` | 0–1 | for the harmony choice | `saturation` normalised (0.02 → 0, 0.2 → 1) |
| `finish` | enum | halo/shadow/glow | dark + saturated + thin lines → `glow`; light → `diecut`; else `shadow` |

## Appendix C · Presets (prototype vectors for ranking, and what they look like)

| id | lineShow | weight | wobble | corners | shading | texture | palette | finish | typical games |
|---|---|---|---|---|---|---|---|---|---|
| `pixel` | true | 0.9 | 0 | 0 | dither | none | 16 | none | 2D pixel art; `pixel` = measured size |
| `flat` | false | 0 | 0 | 0.4 | flat | none | 0 | shadow | clean vector, minimal |
| `outline-cartoon` | true | 0.7 | 0.1 | 0.6 | cel | none | 0 | diecut | bold cartoon, comic |
| `cel` | true | 0.4 | 0 | 0.3 | cel | none | 0 | shadow | anime-style, toon shaded 3D |
| `painterly` | false | 0.1 | 0.3 | 0.5 | painterly | canvas | 0 | shadow | hand-painted, soft |
| `ink-sketch` | true | 0.5 | 0.6 | 0.2 | hatch | paper | 0 | none | pen-and-ink, storybook |
| `neon` | true | 0.3 | 0 | 0.5 | soft | scanlines | 0 | glow | synthwave, cyberpunk |
| `retro-print` | true | 0.6 | 0.15 | 0.4 | halftone | paper | 8 | none | risograph, 60s print |
| `grunge` | true | 0.8 | 0.4 | 0.1 | cel | grunge | 0 | shadow | horror, metal |
| `cozy-soft` | true | 0.35 | 0.25 | 0.9 | soft | paper | 0 | diecut | cozy, farming, pastel |

Ranking distance weights: `pixel` 3.0 (a mismatch here is decisive), `lineShow` 2.0, `shading` 1.5 (0 if equal, 1 otherwise), `finish` 1.0, everything else 1.0 × absolute difference.

## Appendix D · The core sticker sheet (40 parts, `features/stickers-core.dc.html`)

Layers per part unless noted: `shadow`, `body`, `line`, `highlight`, `detail`, `halo`. Tags feed the tray's ranking (motif tags in *italics* are what the vision call's `motifs` match against).

| part | what | extra layers / slots | tags |
|---|---|---|---|
| `burst` | 12-point starburst | — | hype, sale, retro |
| `burst-round` | soft 8-lobe burst | — | hype, cozy |
| `banner` | ribbon banner, text slot | `text` | title, hype |
| `ribbon-corner` | diagonal corner ribbon | `text` | sale, new |
| `badge-round` | circular badge | `text`, `image-slot` | award, seal |
| `badge-shield` | shield badge | `text` | award, fantasy |
| `tape-strip` | washi tape strip | — | scrapbook, cozy |
| `tape-x` | two crossed tape pieces | — | scrapbook |
| `frame-polaroid` | polaroid frame | `image-slot` | scrapbook, screenshot |
| `frame-ornate` | ornate gold frame | `image-slot` | fantasy, award |
| `frame-pixel` | chunky bevel frame | `image-slot` | retro, pixel |
| `frame-film` | film strip cell | `image-slot` | cinema, screenshot |
| `arrow` | bendy arrow | — | pointer |
| `arrow-double` | two-headed arrow | — | pointer |
| `pointer-hand` | pointing hand | — | pointer, retro |
| `circle-mark` | hand-drawn circle | — | pointer, sketch |
| `underline` | squiggly underline | — | pointer, sketch |
| `bubble-speech` | speech bubble | `text` | comic |
| `bubble-thought` | thought bubble | `text` | comic |
| `bubble-shout` | jagged shout bubble | `text` | comic, hype |
| `tag-new` | "NEW" tag | — | new, sale |
| `tag-soon` | "COMING SOON" tag | — | new |
| `tag-wishlist` | "WISHLIST" tag | — | store |
| `tag-price` | price tag | `text` | store |
| `pin` | pushpin | — | scrapbook |
| `clip` | paperclip | — | scrapbook |
| `star` | five-point star | — | vote, award |
| `stars-3` | three scattered stars | — | sparkle |
| `sparkle` | four-point sparkle cluster | — | sparkle, *magic* |
| `heart` | heart | — | vote, cozy |
| `fire` | flame | — | hype, *fire* |
| `bolt` | lightning bolt | — | hype, *storm*, energy |
| `skull` | small skull | — | *skull*, horror, grunge |
| `sword` | crossed swords | — | *sword*, fantasy |
| `gear` | gear | — | *gear*, scifi, machine |
| `hex-grid` | hex cluster | — | scifi, tech |
| `leaf-sprig` | leafy sprig | — | *leaf*, cozy, nature |
| `mushroom` | toadstool | — | *mushroom*, cozy, fantasy |
| `cloud` | puffy cloud | — | *cloud*, cozy |
| `crescent` | crescent moon | — | *moon*, night, fantasy |

Three more the site needs and the tray should always show: `tape-caution` is already a prop (`tape.js`), leave it; `seal-wax` (steward seal) and `tape-review` ("under review" tape) are reserved ids for the moderation language and are drawn later.

Authoring shortcut: draw each part once in the flat style with placeholder colours (magenta `#ff00ff` primary, cyan `#00ffff` secondary, black ink, white paper, `#ffff00` highlight, `#000080` shadow); `press/tools/palette-keys.js` rewrites those six literals to the `{{ skRole }}` interpolations and fails loudly on any other literal colour, so the contract in §3.6 is enforced by the tool rather than by care.

## Appendix E · Layout recipes (world units; y grows downward; the bench's opening rectangle is framed by `lab.js`)

All three: the composition's spine is x = 0 (the generator may offset the whole recipe). The opening rectangle is computed, not fixed: the bounding box of every slot plus 120 of margin, widened or heightened to the main bench's opening aspect (1848 × 1928, which lands at ~80 % on a 2560-wide screen and ~50 % on a laptop), never smaller than the box. Pictures are placed at their natural pixel size × `scale`; the recipe gives `scale` for a 1600-px-wide hero and the generator rescales proportionally.

**`poster`** (portrait key art, logo with alpha):
logo at (−300, −900) scale 0.5 · key art at (−520, −700) scale 0.55 · title/tagline note at (240, −650) width 560 · description note at (240, −420) width 560 · sign (links) at (240, −80) · screenshots as `frame-polaroid` image-slot stickers in a row at y 320, x −760 + 400·i, rot alternating −2/+2 · stickers: `burst` behind the logo (z under it), `tape-strip` on the key art's top-left, `tag-wishlist` beside the sign, `sparkle` ×2 near the title.

**`widescreen`** (landscape hero):
hero at (−900, −950) scale 1.0 (1600 wide) · logo overlapping the hero's bottom-left at (−860, −380) scale 0.4 · title note right of the logo at (−200, −330) width 700 · description at (−860, −140) width 900 · sign at (300, −140) · screenshots row at y 80 in `frame-film` slots, x −880 + 460·i · stickers: `banner` under the hero's right end, `arrow` from the description to the sign, `badge-round` on the hero's top-right.

**`scrapbook`** (hand-drawn and cozy presets):
everything rotated −4…+4 · key art at (−600, −900) scale 0.5 rot −3 · logo at (−100, −950) scale 0.45 rot 2 · notes on `tape-x` at (200, −700) rot 1 · screenshots as polaroids scattered on two rows with pins · stickers: `leaf-sprig`, `mushroom`, `heart`, `tape-strip` ×4, `circle-mark` around the release date.

The recipe chooser: portrait key art present → `poster`; landscape hero present and no portrait → `widescreen`; preset ∈ {`ink-sketch`, `cozy-soft`, `painterly`} → `scrapbook` offered second; the vision call may override with its `recipe` when confidence ≥ 0.6.

## Appendix F · The vision call

`vibe.schema.json`:

```jsonc
{
  "type": "object",
  "required": ["artStyle", "mood", "motifs", "preset", "alternates", "fontPairing", "recipe", "harmony", "confidence"],
  "properties": {
    "artStyle":    { "enum": ["pixel", "hand-painted", "vector-flat", "cel-shaded-3d", "realistic-3d", "low-poly", "ink", "collage", "claymation", "other"] },
    "mood":        { "type": "array", "minItems": 1, "maxItems": 3, "items": { "enum": ["cozy", "whimsical", "dread", "gritty", "neon", "epic", "melancholy", "chaotic", "serene", "retro"] } },
    "motifs":      { "type": "array", "minItems": 3, "maxItems": 5, "items": { "enum": ["magic","fire","storm","skull","sword","gear","leaf","mushroom","cloud","moon","star","heart","water","ice","crystal","robot","ship","spaceship","castle","forest","city","desert","ocean","cat","fox","dragon","ghost","lantern","book","key","potion","coin","music","flower","bone","eye","mask","car","train","plant"] } },
    "preset":      { "$ref": "style.schema.json#/properties/preset" },
    "alternates":  { "type": "array", "maxItems": 2, "items": { "$ref": "style.schema.json#/properties/preset" } },
    "fontPairing": { "$ref": "theme.schema.json#/properties/fonts/properties/id" },
    "recipe":      { "enum": ["poster", "widescreen", "scrapbook"] },
    "harmony":     { "enum": ["calm", "loud"] },
    "confidence":  { "type": "number", "minimum": 0, "maximum": 1 },
    "why":         { "type": "string", "maxLength": 300 }
  }
}
```

System prompt (keep it this short; the menus are the point):

> You classify the visual style of video-game marketing art so a page template and a vector sticker set can match it. You will see up to four images (logo, key art, screenshots) and a JSON of measured statistics. Answer only by calling the tool with values from its menus; never invent ids. Prefer the measured `pixelSize` over your own judgement when it is greater than 0. `harmony` is `loud` when the art wants complementary accents and `calm` when analogous ones would sit better. `recipe`: `poster` for portrait key art, `widescreen` for landscape hero art, `scrapbook` for hand-drawn or cozy work. `why` is one sentence.

User turn: the images, then `stats` as JSON, then: "Fixture: none." (or the manifest's title and genres when known).

Validation on the server: schema check; `preset` not in `alternates`; if `pixelSize > 0` and `preset != 'pixel'`, rewrite `preset` to `pixel` and push the model's choice into `alternates`. Log the raw response locally under `press/cache/` for tuning; never log images.

## Appendix G · Deployment bits

`site/vercel.json` — add, in the shape the file already uses for `features`:

- rewrites: `/press/(.*)` → `/lab2/press/$1`; `/games/(.*)` → `/lab2/games/$1`.
- headers: the same cache rule the other folders get for `/lab2/press/(.*)` and `/lab2/games/(.*)/art/(.*)` (long cache, immutable — filenames carry content hashes); **no** long cache on `/lab2/games/(.*)/index.html` (it changes on every owner save).
- functions: `api/vibe.js` and `api/intake.js` at the project root's `api/` (verify the root is `site/`).

Env: `ANTHROPIC_API_KEY`, `INTAKE_SECRET`, Blob read/write token (and KV if used). Locally, `node serve.js` reads the same names from the environment; `start-lab2.bat` is unchanged.

Gitignore: `lab2/press/cache/`, `lab2/games/*/_src/`, `lab2/games/*/index.html.keep-bak`.

## Appendix H · Fixture generation (`press/tools/make-fixtures.js`)

Playwright page + canvas, deterministic seeds, written once and committed (small: ≤ 300 KB per fixture).

- `pixelfort`: 160×90 scene drawn at 1:1 with a 16-colour palette and 1-px black outlines, scaled ×4 nearest-neighbour to 640×360 screenshots; logo 256×96 pixel type on alpha; portrait key art 480×640 at ×4. Expected: `pixelSize` 4, `outline.present` true, `paletteCount` < 24, preset `pixel`, pairing `pixel`, recipe `poster`.
- `mosslight`: 1280×720 screenshots from layered low-frequency noise in muted greens and ochres, soft radial light, no edges; logo hand-lettered on alpha; landscape hero 1600×900. Expected: `dark` false, `outline.present` false, `hfEnergy` high, preset `painterly` or `cozy-soft`, pairing `hand`, recipe `widescreen` (or `scrapbook` second).
- `neonrun`: 1280×720 near-black backgrounds, two saturated accents (magenta, cyan) as thin glowing lines and grids; logo in a geometric face on alpha; landscape hero. Expected: `dark` true, `saturation` high, thin outlines, preset `neon`, pairing `scifi`, recipe `widescreen`, harmony `loud`.

Each fixture folder: `manifest.json` (rights attested by "fixture"), `art/*.png`, `expected.json` (the values above, asserted by the tests).
