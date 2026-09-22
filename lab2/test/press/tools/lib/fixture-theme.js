/* ─── FIXTURE → THEME ─────────────────────────────────────────────────────
   The one pipeline that turns a fixture folder into a theme, in Node:
   read the manifest, take its hero (else its key art), decode the PNG
   (lib/png.js), quantise it with press/palette.js the way the Press Table
   will, describe, and hand the palette to press/theme.js. Written once so
   tools/test-theme.js (the assertions) and perf/shot-theme.js (the
   screenshots) cannot drift from each other — what the test holds to a
   floor is exactly what the screenshot shows.

   THE NUMBERS. k 8 is the plan's palette cap (analysis.palette ≤ 8, §3.2).
   The rng seed 7 is arbitrary and FIXED — the point of a seed is that the
   same picture gives the same palette in every process (CONTRACTS §1; the
   Press Table will seed with the slug). minWeight 0.01 drops clusters under
   1 % of the pixels — a centroid k-means parked on a few anti-aliased edge
   pixels is not a colour of the game; ignoreEdges drops the 4 % border, as
   the plan says a screenshot's letterbox should be. SATURATION is the
   weight-averaged chroma of the palette — a stand-in for stats.saturation
   (the plan's mean chroma of a 4 000-pixel sample, Phase 3's measurement,
   which replaces it in the builder); it is coarser (eight centroids, not
   four thousand pixels) but leans the same way, and the theme's mood rule
   also reads the accent candidate's chroma (CONTRACTS §2), which does not
   depend on it.

   Everything is loaded through lib/browser-module.js against one bare
   `window`, so Fonts and Theme see the same Palette. Paths are resolved
   from this file, so the callers may run from anywhere. */
'use strict';
const fs = require('fs');
const path = require('path');
const load = require('./browser-module');
const png = require('./png');

const PRESS = path.resolve(__dirname, '..', '..');
const K = 8, SEED = 7, MIN_WEIGHT = 0.01;

let win = null;
function modules() {
  if (!win) {
    win = load(path.join(PRESS, 'palette.js'));
    load(path.join(PRESS, 'fonts.js'), win);
    load(path.join(PRESS, 'theme.js'), win);
  }
  return win;
}

/* The picture the theme is read from: the manifest's hero, else its key
   art (pixelfort has a portrait key art and no hero; the other two have a
   hero) — CONTRACTS §9's asset ids. */
function heroOf(manifest) {
  return manifest.assets.find(a => a.role === 'hero') || manifest.assets.find(a => a.role === 'keyart') || manifest.assets[0];
}

function paletteOf(fixtureDir) {
  const { Palette } = modules();
  const manifest = JSON.parse(fs.readFileSync(path.join(fixtureDir, 'manifest.json'), 'utf8'));
  const asset = heroOf(manifest);
  const image = png.decode(fs.readFileSync(path.join(fixtureDir, asset.file)));
  const q = Palette.quantize(image, K, { rng: Palette.rng(SEED), minWeight: MIN_WEIGHT, ignoreEdges: true });
  const palette = Palette.describe(q);
  let saturation = 0;
  for (const e of palette) saturation += e.weight * e.C;
  return { manifest, asset, image: { width: image.width, height: image.height, filters: image.filters }, palette, saturation };
}

/* themeOf(fixtureDir, opts) → { manifest, asset, palette, saturation, input, theme }
   opts: { fonts, mood, paletteSize } passed through to Theme.derive. */
function themeOf(fixtureDir, opts) {
  const { Theme } = modules();
  const p = paletteOf(fixtureDir);
  opts = opts || {};
  const input = { palette: p.palette, saturation: p.saturation, mood: opts.mood, paletteSize: opts.paletteSize, fonts: opts.fonts };
  return Object.assign(p, { input, theme: Theme.derive(input) });
}

module.exports = { modules, paletteOf, themeOf, heroOf, K, SEED, MIN_WEIGHT };
