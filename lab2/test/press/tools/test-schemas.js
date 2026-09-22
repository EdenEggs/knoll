/* ─── TEST-SCHEMAS ─────────────────────────────────────────────────────────
   Refutes press/schemas/*.json and lib/validate.js. No browser, no server,
   under a second: everything here is JSON and arithmetic.

       node lab2/test/press/tools/test-schemas.js        (from site/)

   Five things are asked, in this order.

   THE SEVEN FILES parse, are objects, declare draft 2020-12, carry a title
   and a description (a JSON file cannot hold a comment, so the description
   is where a schema says where it came from), and LINT CLEAN — no keyword
   the validator does not implement, no $ref that does not resolve. Then the
   menus are read back against the plan: the ten presets, nine pairings, five
   asset roles, nine platforms, four sources, three recipes, five slot kinds,
   seven shadings, six textures, four finishes, four palette sizes, ten art
   styles, ten moods and forty motifs are typed out again HERE from
   PRESS-TABLE-PLAN.md Appendices A and F and compared word for word and in
   order. A schema is a transcription, and this is the second pair of eyes on
   it: a dropped `mac`, a `melancoly`, a motif in the wrong place would all
   pass every other test in the folder and quietly narrow what a publisher or
   the model is allowed to say.

   THE REAL OBJECTS validate. The three fixtures' manifest.json (CONTRACTS
   §9) is the plan's own example of the manifest, and it is what every other
   tool in this folder reads. Beside it, and worth more than any hand-made
   sample: the palette press/palette.js quantises out of each fixture's hero
   (lib/fixture-theme.js, the same pipeline test-theme.js uses), the theme
   press/theme.js derives from it, and the style vector Phase 3 measured and
   left in fixtures/<name>/stats.json. Those are the actual outputs of the
   files this system is made of, so this is where a schema and a builder that
   disagree are caught — not later, on a page.

   THE MUTATIONS. Twenty-six documents, each a valid one with exactly one
   thing wrong, each expected to come back with an exact list of paths and
   keywords. A validator that answers `[]` to everything passes the paragraph
   above and nothing here; a validator that answers `[something]` to
   everything passes here and nothing above. Both halves are the test. The
   mutations are the plan's own edges — a slug with a capital, a title one
   character over, an http:// link, a truncated sha256, `attested: false`,
   `ps6`, no assets, thirteen assets, a 15-px image, a preset off the menu, a
   rotation past 45°, nine colours in an eight-colour palette, `#ABC`, a
   token named `--Bad`, an eighth key in a seven-key envelope — plus the two
   that only exist because the schemas cross-reference: a `preset` that
   breaks the enum it borrows from style.schema.json, and a `fontPairing`
   that breaks theme.schema.json's, three files deep inside a game.json.

   THE KEYWORDS THE SCHEMAS DO NOT USE YET are exercised on synthetic
   schemas — a type array, exclusiveMinimum, a local `#/…` ref, an object
   `const`, `additionalProperties: true`, integer against 3.0 and 3.5, a
   oneOf that matches twice — because the day a schema first uses one is not
   the day to find out whether it works.

   GARBAGE AND REPEATS. `check` is handed null, undefined, NaN, a BigInt, an
   object with a null prototype, one that points at itself, one whose getter
   throws, and a Proxy that throws on any read; it is handed a schema that is
   a number, a schema name that does not exist, a pattern that is not a
   regular expression, and two schemas that $ref each other in a circle. It
   must return an array of {path, message} every time and never throw —
   /_lab2/build answers 400 to a bad body, not a stack trace. And the whole
   mutation suite is run three times and compared byte for byte, because a
   validator that reports a different list on the second run cannot be held
   to a golden anything.

   Exit 1 on any failure; the last line is the count.
   ───────────────────────────────────────────────────────────────────────── */
'use strict';
const fs = require('fs');
const path = require('path');
const V = require('./lib/validate');
const fixtureTheme = require('./lib/fixture-theme');

const SCHEMAS = path.resolve(__dirname, '..', 'schemas');
const FIXTURES = path.resolve(__dirname, '..', 'fixtures');
const NAMES = ['pixelfort', 'mosslight', 'neonrun'];
const DRAFT = 'https://json-schema.org/draft/2020-12/schema';

let fails = 0, n = 0;
function check(name, ok, detail) {
  n++;
  if (!ok) fails++;
  console.log((ok ? '  ok   ' : '  FAIL ') + name + (detail !== undefined && (!ok || detail !== '') ? '   ' + detail : ''));
}
const copy = (v) => JSON.parse(JSON.stringify(v));
const read = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));

/* ── 1 · the seven files ───────────────────────────────────────────────── */
console.log('\nTHE FILES');

const onDisk = fs.readdirSync(SCHEMAS).sort();
check('press/schemas holds the seven files and nothing else',
  onDisk.length === 7 && V.FILES.slice().sort().every((f, i) => f === onDisk[i]), onDisk.join(' '));

const pool = {};
for (const f of V.FILES) {
  let doc = null, err = '';
  try { doc = read(path.join(SCHEMAS, f)); } catch (e) { err = e.message; }
  check(f + ' parses as JSON', doc !== null && typeof doc === 'object' && !Array.isArray(doc), err);
  if (!doc) continue;
  pool[f] = doc;
  check(f + ' declares draft 2020-12', doc.$schema === DRAFT, String(doc.$schema));
  check(f + ' says what it is and where it came from',
    typeof doc.title === 'string' && doc.title.length > 0 && typeof doc.description === 'string' && doc.description.length > 40, '');
  check(f + ' is object-typed with properties', doc.type === 'object' && !!doc.properties, '');
  const lint = V.lint(f, pool);
  check(f + ' lints clean (every keyword implemented, every $ref resolves)', lint.length === 0,
    lint.map((e) => e.path + ' ' + e.message).join(' | '));
}

/* The menus, typed again from the plan. Order matters as much as membership:
   these arrays are what a tray, a font picker and a vision prompt read. */
const MENUS = [
  ['manifest.schema.json', 'properties.assets.items.properties.role.enum', ['logo', 'keyart', 'hero', 'screenshot', 'misc']],
  ['manifest.schema.json', 'properties.platforms.items.enum', ['pc', 'mac', 'linux', 'switch', 'ps5', 'xbox', 'ios', 'android', 'web']],
  ['manifest.schema.json', 'properties.source.enum', ['manual', 'steam', 'presskit', 'intake']],
  ['theme.schema.json', 'properties.fonts.properties.id.enum', ['clean', 'pixel', 'hand', 'rustic', 'gothic', 'comic', 'cozy', 'scifi', 'typewriter']],
  ['style.schema.json', 'properties.preset.enum', ['pixel', 'flat', 'outline-cartoon', 'cel', 'painterly', 'ink-sketch', 'neon', 'retro-print', 'grunge', 'cozy-soft']],
  ['style.schema.json', 'properties.shading.enum', ['flat', 'cel', 'soft', 'hatch', 'halftone', 'dither', 'painterly']],
  ['style.schema.json', 'properties.texture.enum', ['none', 'paper', 'noise', 'scanlines', 'grunge', 'canvas']],
  ['style.schema.json', 'properties.finish.enum', ['none', 'diecut', 'shadow', 'glow']],
  ['style.schema.json', 'properties.paletteSize.enum', [0, 4, 8, 16]],
  ['layout.schema.json', 'properties.recipe.enum', ['poster', 'widescreen', 'scrapbook']],
  ['layout.schema.json', 'properties.slots.items.properties.kind.enum', ['pic', 'sticker', 'note', 'sign', 'machine']],
  ['vibe.schema.json', 'properties.artStyle.enum', ['pixel', 'hand-painted', 'vector-flat', 'cel-shaded-3d', 'realistic-3d', 'low-poly', 'ink', 'collage', 'claymation', 'other']],
  ['vibe.schema.json', 'properties.mood.items.enum', ['cozy', 'whimsical', 'dread', 'gritty', 'neon', 'epic', 'melancholy', 'chaotic', 'serene', 'retro']],
  ['vibe.schema.json', 'properties.motifs.items.enum', ['magic', 'fire', 'storm', 'skull', 'sword', 'gear', 'leaf', 'mushroom', 'cloud', 'moon', 'star', 'heart', 'water', 'ice', 'crystal', 'robot', 'ship', 'spaceship', 'castle', 'forest', 'city', 'desert', 'ocean', 'cat', 'fox', 'dragon', 'ghost', 'lantern', 'book', 'key', 'potion', 'coin', 'music', 'flower', 'bone', 'eye', 'mask', 'car', 'train', 'plant']],
  ['vibe.schema.json', 'properties.recipe.enum', ['poster', 'widescreen', 'scrapbook']],
  ['vibe.schema.json', 'properties.harmony.enum', ['calm', 'loud']]
];
const dig = (doc, dotted) => dotted.split('.').reduce((o, k) => (o === undefined || o === null ? undefined : o[k]), doc);
for (const [file, where, want] of MENUS) {
  const got = dig(pool[file], where);
  check('menu ' + file.replace('.schema.json', '') + '.' + where.replace(/properties\./g, '').replace(/\.enum$/, ''),
    JSON.stringify(got) === JSON.stringify(want), Array.isArray(got) ? got.length + ' entries' : String(got));
}

/* The other numbers of Appendix A, read back where a builder will lean on them. */
const RULES = [
  ['manifest.schema.json', 'required', ['slug', 'title', 'assets', 'rights']],
  ['manifest.schema.json', 'properties.slug.pattern', '^[a-z0-9-]{2,40}$'],
  ['manifest.schema.json', 'properties.title.maxLength', 80],
  ['manifest.schema.json', 'properties.description.maxLength', 1200],
  ['manifest.schema.json', 'properties.assets.minItems', 1],
  ['manifest.schema.json', 'properties.assets.maxItems', 12],
  ['manifest.schema.json', 'properties.assets.items.properties.sha256.pattern', '^[a-f0-9]{64}$'],
  ['manifest.schema.json', 'properties.assets.items.properties.w.minimum', 16],
  ['manifest.schema.json', 'properties.rights.properties.attested.const', true],
  ['manifest.schema.json', 'properties.links.additionalProperties.pattern', '^https://'],
  ['analysis.schema.json', 'properties.palette.maxItems', 8],
  ['analysis.schema.json', 'properties.palette.items.properties.hex.pattern', '^#[0-9a-f]{6}$'],
  ['analysis.schema.json', 'properties.stats.properties.pixelSize.maximum', 16],
  ['analysis.schema.json', 'properties.vibe.oneOf.1.$ref', 'vibe.schema.json'],
  ['theme.schema.json', 'properties.tokens.propertyNames.pattern', '^--[a-z0-9-]+$'],
  ['layout.schema.json', 'properties.slots.items.properties.rot.minimum', -45],
  ['layout.schema.json', 'properties.slots.items.properties.rot.maximum', 45],
  ['layout.schema.json', 'properties.slots.items.properties.scale.minimum', 0.05],
  ['layout.schema.json', 'properties.slots.items.properties.scale.maximum', 4],
  ['vibe.schema.json', 'properties.motifs.minItems', 3],
  ['vibe.schema.json', 'properties.motifs.maxItems', 5],
  ['vibe.schema.json', 'properties.confidence.maximum', 1],
  ['vibe.schema.json', 'properties.preset.$ref', 'style.schema.json#/properties/preset'],
  ['vibe.schema.json', 'properties.fontPairing.$ref', 'theme.schema.json#/properties/fonts/properties/id'],
  ['game.schema.json', 'required', ['version', 'builtAt', 'manifest', 'analysis', 'theme', 'style', 'layout']],
  ['game.schema.json', 'additionalProperties', false],
  ['game.schema.json', 'properties.version.const', 1],
  ['game.schema.json', 'properties.manifest.$ref', 'manifest.schema.json']
];
for (const [file, where, want] of RULES) {
  const got = dig(pool[file], where);
  check('rule ' + file.replace('.schema.json', '') + ' ' + where, JSON.stringify(got) === JSON.stringify(want), JSON.stringify(got));
}

/* ── 2 · the real objects ─────────────────────────────────────────────── */
console.log('\nTHE REAL OBJECTS');

const real = {};
for (const name of NAMES) {
  const dir = path.join(FIXTURES, name);
  const manifest = read(path.join(dir, 'manifest.json'));
  const errs = V.check(manifest, 'manifest.schema.json', pool);
  check(name + '/manifest.json validates', errs.length === 0, errs.map((e) => e.path + ' ' + e.message).join(' | '));

  const t = fixtureTheme.themeOf(dir);
  const te = V.check(t.theme, 'theme.schema.json', pool);
  check(name + ': the theme press/theme.js derives validates',
    te.length === 0, te.length ? te.map((e) => e.path + ' ' + e.message).join(' | ') : Object.keys(t.theme.tokens).length + ' tokens, pairing ' + t.theme.fonts.id);

  const stats = read(path.join(dir, 'stats.json'));
  const analysis = { palette: t.palette, dark: t.theme.dark, stats: stats.stats, vibe: null, vibeCacheKey: name + ':0' };
  const ae = V.check(analysis, 'analysis.schema.json', pool);
  check(name + ': an analysis built from press/palette.js + Phase 3 stats validates',
    ae.length === 0, ae.length ? ae.map((e) => e.path + ' ' + e.message).join(' | ') : t.palette.length + ' colours');

  const style = Object.assign({ preset: stats.rank[0].preset }, stats.vector);
  const se = V.check(style, 'style.schema.json', pool);
  check(name + ': the style vector Phase 3 measured validates',
    se.length === 0, se.length ? se.map((e) => e.path + ' ' + e.message).join(' | ') : 'preset ' + style.preset);

  real[name] = { manifest, analysis, theme: t.theme, style };
}

/* Appendix E's poster recipe, for pixelfort: the slot numbers are the plan's
   own (logo −300/−900 at 0.5, key art −520/−700 at 0.55, the title note at
   240/−650 width 560, the sign at 240/−80, a burst behind the logo). `open`
   is a rectangle around them and nothing more — Phase 5 computes the real one
   from the slots' bounding box plus 120 of margin; these four numbers are
   here only so the document is complete, and no test reads their values. */
const LAYOUT = {
  recipe: 'poster',
  open: { x: -880, y: -1020, w: 2000, h: 1600 },
  slots: [
    { kind: 'sticker', ref: 'burst', x: -340, y: -940, scale: 1.4, rot: -3, z: 5 },
    { kind: 'pic', ref: 'logo', x: -300, y: -900, scale: 0.5, z: 20 },
    { kind: 'pic', ref: 'keyart-portrait', x: -520, y: -700, scale: 0.55, z: 10 },
    { kind: 'note', ref: 'title', x: 240, y: -650, width: 560, text: 'Pixelfort - hold the wall.' },
    { kind: 'sign', ref: 'links', x: 240, y: -80 }
  ]
};
const le = V.check(LAYOUT, 'layout.schema.json', pool);
check('Appendix E poster layout validates', le.length === 0, le.map((e) => e.path + ' ' + e.message).join(' | '));

/* A vibe for pixelfort, answered the way the plan's system prompt asks for it
   (Appendix F) and agreeing with the fixture's expected.json: preset pixel,
   pairing pixel, recipe poster. */
const VIBE = {
  artStyle: 'pixel',
  mood: ['retro', 'epic'],
  motifs: ['castle', 'sword', 'star'],
  preset: 'pixel',
  alternates: ['cel'],
  fontPairing: 'pixel',
  recipe: 'poster',
  harmony: 'calm',
  confidence: 0.86,
  why: 'A four-pixel grid and sixteen flat colours with one-pixel outlines.'
};
const ve = V.check(VIBE, 'vibe.schema.json', pool);
check('a vibe answered from Appendix F menus validates', ve.length === 0, ve.map((e) => e.path + ' ' + e.message).join(' | '));

const GAME = {
  version: 1,
  builtAt: '2026-09-07T00:00:00.000Z',
  manifest: real.pixelfort.manifest,
  analysis: Object.assign({}, real.pixelfort.analysis, { vibe: VIBE, vibeCacheKey: 'pixelfort:86' }),
  theme: real.pixelfort.theme,
  style: real.pixelfort.style,
  layout: LAYOUT
};
const ge = V.check(GAME, 'game.schema.json', pool);
check('the whole game.json envelope validates through all five $refs', ge.length === 0, ge.map((e) => e.path + ' ' + e.message).join(' | '));

/* ── 3 · the mutations ────────────────────────────────────────────────── */
console.log('\nTHE MUTATIONS');

const MUTATIONS = [
  ['a slug with a capital', 'manifest.schema.json', () => real.pixelfort.manifest, (m) => { m.slug = 'Pixelfort'; }, [['slug', 'pattern:']]],
  ['a title 81 characters long', 'manifest.schema.json', () => real.pixelfort.manifest, (m) => { m.title = 'x'.repeat(81); }, [['title', 'maxLength: 81 > 80']]],
  ['an asset role off the menu', 'manifest.schema.json', () => real.pixelfort.manifest, (m) => { m.assets[0].role = 'banner'; }, [['assets[0].role', 'enum:']]],
  ['a link that is http://', 'manifest.schema.json', () => real.pixelfort.manifest, (m) => { m.links.steam = 'http://example.com/pixelfort'; }, [['links.steam', 'pattern:']]],
  ['a sha256 of fifteen characters', 'manifest.schema.json', () => real.pixelfort.manifest, (m) => { m.assets[2].sha256 = 'a'.repeat(15); }, [['assets[2].sha256', 'pattern:']]],
  ['rights.attested false', 'manifest.schema.json', () => real.pixelfort.manifest, (m) => { m.rights.attested = false; }, [['rights.attested', 'const:']]],
  ['a platform "ps6"', 'manifest.schema.json', () => real.pixelfort.manifest, (m) => { m.platforms[1] = 'ps6'; }, [['platforms[1]', 'enum:']]],
  ['no assets at all', 'manifest.schema.json', () => real.pixelfort.manifest, (m) => { m.assets = []; }, [['assets', 'minItems: 0 < 1']]],
  ['thirteen assets', 'manifest.schema.json', () => real.pixelfort.manifest, (m) => { const a = m.assets[0]; m.assets = []; for (let i = 0; i < 13; i++) m.assets.push(copy(a)); }, [['assets', 'maxItems: 13 > 12']]],
  ['an image 15 pixels wide', 'manifest.schema.json', () => real.pixelfort.manifest, (m) => { m.assets[1].w = 15; }, [['assets[1].w', 'minimum: 15 < 16']]],
  ['no rights block', 'manifest.schema.json', () => real.pixelfort.manifest, (m) => { delete m.rights; }, [['rights', 'required: missing']]],
  ['a style preset off the menu', 'style.schema.json', () => real.pixelfort.style, (s) => { s.preset = 'holographic'; }, [['preset', 'enum:']]],
  ['a layout slot kind off the menu', 'layout.schema.json', () => LAYOUT, (l) => { l.slots[1].kind = 'poster'; }, [['slots[1].kind', 'enum:']]],
  ['a rotation of 46 degrees', 'layout.schema.json', () => LAYOUT, (l) => { l.slots[0].rot = 46; }, [['slots[0].rot', 'maximum: 46 > 45']]],
  ['a scale of 5', 'layout.schema.json', () => LAYOUT, (l) => { l.slots[1].scale = 5; }, [['slots[1].scale', 'maximum: 5 > 4']]],
  ['nine colours in the palette', 'analysis.schema.json', () => real.pixelfort.analysis, (a) => { a.palette.push(copy(a.palette[0])); }, [['palette', 'maxItems: 9 > 8']]],
  ['a palette hex written "#ABC"', 'analysis.schema.json', () => real.pixelfort.analysis, (a) => { a.palette[0].hex = '#ABC'; }, [['palette[0].hex', 'pattern:']]],
  ['two motifs where three are asked for', 'vibe.schema.json', () => VIBE, (v) => { v.motifs = ['castle', 'sword']; }, [['motifs', 'minItems: 2 < 3']]],
  ['a confidence of 1.5', 'vibe.schema.json', () => VIBE, (v) => { v.confidence = 1.5; }, [['confidence', 'maximum: 1.5 > 1']]],
  ['a token named --Bad', 'theme.schema.json', () => real.pixelfort.theme, (t) => { t.tokens['--Bad'] = '#ffffff'; }, [['tokens["--Bad"]', 'propertyNames: pattern:']]],
  ['a preset that breaks the enum it borrows from style.schema.json', 'vibe.schema.json', () => VIBE, (v) => { v.preset = 'sparkly'; }, [['preset', 'enum:']]],
  ['an eighth key in the seven-key envelope', 'game.schema.json', () => GAME, (g) => { g.sneaky = true; }, [['sneaky', 'additionalProperties:']]],
  ['a game.json version 2', 'game.schema.json', () => GAME, (g) => { g.version = 2; }, [['version', 'const:']]],
  ['a builtAt that is only a date', 'game.schema.json', () => GAME, (g) => { g.builtAt = '2026-09-07'; }, [['builtAt', 'pattern:']]],
  ['a fontPairing off theme.schema.json’s menu, three files deep in a game.json', 'game.schema.json', () => GAME, (g) => { g.analysis.vibe.fontPairing = 'papyrus'; }, [['analysis.vibe', 'oneOf: matched none of 2'], ['analysis.vibe.fontPairing', 'enum:']]],
  ['a vibe that is neither null nor an object', 'game.schema.json', () => GAME, (g) => { g.analysis.vibe = 5; }, [['analysis.vibe', 'oneOf: matched none of 2'], ['analysis.vibe', 'type: expected null, got number']]]
];

function runMutations() {
  const out = [];
  for (const [what, file, base, mutate, want] of MUTATIONS) {
    const doc = copy(base());
    mutate(doc);
    out.push({ what: what, errs: V.check(doc, file, pool) });
  }
  return out;
}
const mutated = runMutations();
MUTATIONS.forEach(([what, file, base, mutate, want], i) => {
  const errs = mutated[i].errs;
  const ok = errs.length === want.length && want.every((w, j) => errs[j].path === w[0] && errs[j].message.indexOf(w[1]) === 0);
  check('rejects ' + what, ok, errs.map((e) => (e.path === '' ? '(root)' : e.path) + ' | ' + e.message).join('   ') || '(accepted it)');
});

/* ── 4 · the keywords the seven files do not use yet ──────────────────── */
console.log('\nTHE VALIDATOR ITSELF');

const bare = (data, schema, want) => {
  const errs = V.check(data, schema);
  return { errs: errs, ok: errs.length === want, line: errs.map((e) => e.path + ' ' + e.message).join(' | ') };
};
let r;
r = bare('a', { type: ['string', 'null'] }, 0); check('type: an array of types accepts a string', r.ok, r.line);
r = bare(null, { type: ['string', 'null'] }, 0); check('type: an array of types accepts null', r.ok, r.line);
r = bare(3, { type: ['string', 'null'] }, 1); check('type: an array of types rejects a number', r.ok && r.errs[0].message === 'type: expected string or null, got number', r.line);
r = bare(3, { type: 'integer' }, 0); check('type: 3 is an integer', r.ok, r.line);
r = bare(3.5, { type: 'integer' }, 1); check('type: 3.5 is not', r.ok, r.line);
r = bare(3.0, { type: 'integer' }, 0); check('type: 3.0 is (JSON has no other way to write it)', r.ok, r.line);
r = bare(NaN, { type: 'number' }, 1); check('type: NaN is not a number here', r.ok && r.errs[0].message === 'type: expected number, got NaN', r.line);
r = bare(Infinity, { type: 'number' }, 1); check('type: Infinity is not either', r.ok, r.line);
r = bare(0, { type: 'number', exclusiveMinimum: 0 }, 1); check('exclusiveMinimum: 0 is not above 0', r.ok && r.errs[0].message === 'exclusiveMinimum: 0 is not above 0', r.line);
r = bare(0.1, { type: 'number', exclusiveMinimum: 0 }, 0); check('exclusiveMinimum: 0.1 is', r.ok, r.line);
r = bare('', { type: 'string', minLength: 1 }, 1); check('minLength: an empty string fails 1', r.ok, r.line);
r = bare({ a: 1, b: 'x' }, { type: 'object', properties: { a: { type: 'integer' } }, additionalProperties: true }, 0); check('additionalProperties: true lets anything else through', r.ok, r.line);
r = bare({ a: 1, b: 'x' }, { type: 'object', properties: { a: { type: 'integer' } }, additionalProperties: { type: 'integer' } }, 1); check('additionalProperties: a schema is applied to the rest', r.ok && r.errs[0].path === 'b', r.line);
r = bare({ v: 2 }, { properties: { v: { const: { deep: [1, 2] } } } }, 1); check('const: an object const is compared by value', r.ok, r.line);
r = bare({ v: { deep: [1, 2] } }, { properties: { v: { const: { deep: [1, 2] } } } }, 0); check('const: and matches an equal object', r.ok, r.line);
r = bare('x', { oneOf: [{ type: 'string' }, { minLength: 0 }] }, 1); check('oneOf: matching twice is a failure', r.ok && r.errs[0].message === 'oneOf: matched 2 of 2 alternatives', r.line);
r = bare({ a: 'q' }, { properties: { a: { $ref: '#/properties/b' }, b: { enum: ['z'] } } }, 1); check('$ref: a local #/ pointer resolves in its own document', r.ok && r.errs[0].path === 'a' && r.errs[0].message.indexOf('enum:') === 0, r.line);
r = bare('x', { pattern: '(' }, 1); check('pattern: a pattern that is not a regular expression is said so', r.ok && r.errs[0].message.indexOf('pattern: "(" is not') === 0, r.line);
r = bare('https://a.example/' + 'x'.repeat(60), { pattern: '^https://' }, 0); check('pattern: ^https:// is a prefix, not an anchor at both ends', r.ok, r.line);
r = bare([1, 2, 3], { properties: { a: { type: 'string' } }, required: ['a'] }, 0); check('an object rule is not applied to an array', r.ok, r.line);
r = bare('text', { items: { type: 'integer' }, minItems: 3 }, 0); check('an array rule is not applied to a string', r.ok, r.line);
r = bare({ '--a': '1', '--B': '2' }, { propertyNames: { pattern: '^--[a-z]+$' } }, 1); check('propertyNames: names it and quotes the key', r.ok && r.errs[0].path === '["--B"]', r.line);

const cyclePool = { 'a.json': { $ref: 'b.json' }, 'b.json': { $ref: 'a.json' } };
const cyc = V.check({ any: 'thing' }, 'a.json', cyclePool);
check('two schemas that $ref each other stop at MAXDEPTH instead of the stack',
  Array.isArray(cyc) && cyc.length === 1 && cyc[0].message.indexOf('depth: past 32') === 0, JSON.stringify(cyc).slice(0, 90));

const lintBad = V.lint({ type: 'object', allOf: [{ type: 'object' }], properties: { a: { type: 'string', format: 'email' }, b: { $ref: 'nowhere.schema.json' } } });
check('lint names allOf, format and a $ref that does not resolve', lintBad.length === 3
  && lintBad[0].path === '/allOf' && lintBad[1].path === '/properties/a/format' && lintBad[2].path === '/properties/b/$ref',
  lintBad.map((e) => e.path).join(' '));

/* ── 5 · garbage, and the same answer twice ───────────────────────────── */
console.log('\nGARBAGE AND REPEATS');

const circular = { slug: 'ok' }; circular.self = circular;
const throwing = { get slug() { throw new Error('nope'); } };
const proxied = new Proxy({}, { get() { throw new Error('nope'); }, ownKeys() { throw new Error('nope'); } });
const bare0 = Object.create(null); bare0.slug = 'Bad Slug'; bare0.toString = undefined;
const deep = (() => { let a = []; for (let i = 0; i < 5000; i++) a = [a]; return a; })();
const GARBAGE = [
  ['null', null], ['undefined', undefined], ['true', true], ['0', 0], ['NaN', NaN], ['Infinity', Infinity],
  ['an empty string', ''], ['a string', 'manifest'], ['an empty array', []], ['an array of numbers', [1, 2, 3]],
  ['an empty object', {}], ['a BigInt', typeof BigInt === 'function' ? BigInt(1) : 1], ['a function', function () {}],
  ['a Date', new Date(0)], ['an object with no prototype', bare0], ['an object that points at itself', circular],
  ['an object whose getter throws', throwing], ['a Proxy that throws on every read', proxied],
  ['5000 nested arrays', deep]
];
let garbageOk = 0;
for (const [what, value] of GARBAGE) {
  let errs = null, threw = '';
  try { errs = V.check(value, 'manifest.schema.json', pool); } catch (e) { threw = e.message; }
  const shaped = Array.isArray(errs) && errs.every((e) => e && typeof e.path === 'string' && typeof e.message === 'string');
  if (shaped && !threw) garbageOk++;
  check('check(' + what + ') answers a list and does not throw', shaped && !threw, threw || errs.length + ' errors');
}
const BAD_CALLS = [
  ['a schema that is a number', () => V.check({}, 42, pool)],
  ['a schema that is null', () => V.check({}, null, pool)],
  ['a schema that is an array', () => V.check({}, [1, 2], pool)],
  ['a schema name that does not exist', () => V.check({}, 'nope.schema.json', pool)],
  ['no pool at all, with a $ref to follow', () => V.check({}, pool['game.schema.json'])],
  ['a pool that is a number', () => V.check({}, 'manifest.schema.json', 7)],
  ['lint of a schema that is a string', () => V.lint('nope.schema.json', pool)]
];
for (const [what, call] of BAD_CALLS) {
  let errs = null, threw = '';
  try { errs = call(); } catch (e) { threw = e.message; }
  check('check with ' + what + ' answers a list', Array.isArray(errs) && !threw && errs.length > 0, threw || JSON.stringify(errs).slice(0, 80));
}

const runs = [JSON.stringify(mutated), JSON.stringify(runMutations()), JSON.stringify(runMutations())];
check('three runs of the twenty-six mutations are byte-identical', runs[0] === runs[1] && runs[1] === runs[2],
  runs.map((s) => s.length + ' B').join(' '));
const pool2 = V.loadDir(SCHEMAS);
check('a second pool read off the same folder gives the same answers',
  JSON.stringify(V.check(GAME, 'game.schema.json', pool2)) === JSON.stringify(V.check(GAME, 'game.schema.json', pool)), '');
const once = JSON.stringify(V.check(copy(real.pixelfort.manifest), 'manifest.schema.json', pool));
let stable = true;
for (let i = 0; i < 50; i++) if (JSON.stringify(V.check(copy(real.pixelfort.manifest), 'manifest.schema.json', pool)) !== once) stable = false;
check('fifty checks of a valid manifest all answer []', stable && once === '[]', once);

console.log('\n' + (n - fails) + '/' + n + ' checks pass' + (fails ? ', ' + fails + ' FAIL' : '')
  + '  (7 schemas, ' + MENUS.length + ' menus, ' + RULES.length + ' rules, ' + NAMES.length + ' fixtures, '
  + MUTATIONS.length + ' mutations, ' + GARBAGE.length + ' garbage inputs)');
process.exit(fails ? 1 : 0);
