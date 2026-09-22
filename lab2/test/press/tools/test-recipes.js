/* ─── TEST-RECIPES ─────────────────────────────────────────────────────────
   Refutes press/recipes.js. Node only, no browser, about a tenth of a second:
   the file is pure by contract, so it is loaded through lib/browser-module.js
   into a bare `window` that has no document, no fetch and no timers — a
   module that touched the page would throw at load, which is half the test.

   What it holds the file to, in the order the plan asks the questions:

   1. THE CHOICE. Each fixture's manifest through Recipes.choose(), against
      the recipe its expected.json names: pixelfort → poster, mosslight →
      widescreen with scrapbook SECOND, neonrun → widescreen. Then the two
      rules the fixtures cannot exercise: the vision call's override at
      confidence 0.6 and its silence at 0.59.

   2. THE COORDINATES ARE APPENDIX E'S, EXCEPT THE FIVE THE PROBE CORRECTED.
      Spot-checked on the fixture whose ruler makes k = 1 (pixelfort's 480-px
      key art for the poster, neonrun's 1600-px hero for the other two), so
      the numbers in the layout are the numbers in the file: every picture's
      x, y and placed width, every note's x and width, the sign, and both
      screenshot rows' y and stride. A recipe that drifts fails here.

      THE ROWS BELOW THAT ARE NOT THE APPENDIX'S say so in their own name,
      because plan §0.5 says Appendix E is a first guess and the probes are
      how it gets corrected (perf/shot-games.js and perf/verify-game.js,
      2026-09-07 — recipes.js's own header argues each one): the 34-unit
      body, the widescreen's word column beside the hero rather than on it,
      the poster's key art at 1.3, the 960-wide note column, the poster's
      flowed column, the opening rectangle that is no longer widened to the
      bench's aspect, the corner seal that is burst-round and not
      badge-round, and the banner's word. What is asserted of a flowed note
      is its x, its width and that it clears the note above it — its y is a
      measurement now, not a coordinate, and a test that pinned it would
      only be re-writing the arithmetic.

   3. THE LAYOUT IS THE PLAN'S OBJECT. Validated against
      press/schemas/layout.schema.json through press/tools/lib/validate.js —
      `Validate.check(data, schema, pool) → []`, the schemas agent's own
      signature. Neither file existed when this test was first written
      (press/schemas/ was empty and lib/ held browser-module, fixture-theme
      and png), so the check DETECTS them: with both present it runs, with
      either missing it SKIPs and says why out loud rather than passing
      quietly. And it refuses to believe a validator that cannot fail — before
      any verdict counts, the same call must accept a good layout AND reject a
      deliberately broken one, or a stub returning `undefined` would read as a
      pass on everything.

   4. THE SLOTS. Every ref exists: a pic's among the manifest's assets, a
      sticker's among the sheet's forty (READ OFF THE SHEET's data-props, not
      retyped — so this also proves Recipes.PARTS has not drifted from
      features/stickers-core.dc.html), an image-slot's picture among the
      assets, a note's and the sign's among the generator's own names. No two
      slots share the same {x, y, ref}. Scale, rot and z stay inside the
      schema's ranges and z is 0…n−1 exactly once each. AND NOTHING BLANK:
      no part with an image slot is placed without a picture in it and no
      text part without words, both lists read off the sheet — the two
      defects the built widescreen pages carried until 2026-09-07 (a white
      square in a badge, a wordless ribbon).

   5. THE OPENING RECTANGLE. Contains every slot's box; IS that box plus the
      margin, on both axes; and therefore wears the composition's own shape
      and not the bench's 3200:1390 (which is what it was held to until
      2026-09-07 — openOf() in recipes.js has the measurement that took the
      widening out, and OPEN.md §2 has what it cost). The narrow one sits on
      the wide one's y and height (lab.js's WHERE IT OPENS does the same), is
      no wider, and still contains the spine.

   6. IT IS DETERMINISTIC, and it FOLLOWS THE ART: a hero at 800 px instead of
      1600 gives every slot, both rectangles and the margin at exactly half —
      the placed hero halved, the composition's proportions untouched.

   7. THE RANKING. rankStickers against the sheet's own tag map: motifs beat
      moods, a tie breaks by Appendix D's order (bolt before gear, both 3),
      count is honoured, and with nothing to go on the answer IS Appendix D's
      order. Then the motif slots: with a vibe the scrapbook's three loose
      ornaments become the ranking's top three, and without one they are
      Appendix E's own parts.

       node lab2/test/press/tools/test-recipes.js         (from site/)

   Writes perf/results/recipes/summary.json (CONTRACTS §11) with every
   layout's slot count and both rectangles. Exit 1 on any failure.
   ───────────────────────────────────────────────────────────────────────── */
'use strict';
const fs = require('fs'), path = require('path');
const load = require('./lib/browser-module');

const TEST = path.resolve(__dirname, '..', '..');                 // lab2/test
const PRESS = path.join(TEST, 'press');
const FIX = path.join(PRESS, 'fixtures');
const SHEET = path.join(TEST, 'features', 'stickers-core.dc.html');
const OUT = path.join(TEST, 'perf', 'results', 'recipes');
const FIXTURES = ['pixelfort', 'mosslight', 'neonrun'];

let fails = 0, skips = 0;
const results = [];
const check = (name, ok, info) => {
  results.push({ name, ok: !!ok, info: info === undefined ? '' : String(info) });
  if (!ok) fails++;
  console.log((ok ? 'PASS ' : 'FAIL ') + name + (info !== undefined ? ' — ' + info : ''));
};
const skip = (name, why) => {
  results.push({ name, ok: null, info: String(why) });
  skips++;
  console.log('SKIP ' + name + ' — ' + why);
};
const near = (a, b, eps) => Math.abs(a - b) <= (eps === undefined ? 0.011 : eps);

/* ── the file under test, and the sheet it ranks against ─────────────────── */

const win = load(path.join(PRESS, 'recipes.js'));
const R = win.Recipes;
check('recipes.js loads with no document, no fetch, no bench', !!R && typeof R.resolve === 'function');
if (!R) finish();

const src = fs.readFileSync(path.join(PRESS, 'recipes.js'), 'utf8');
const bare = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
check('recipes.js names no document, fetch or Math.random outside its comments',
  !/\bdocument\b|\bfetch\s*\(|Math\.random/.test(bare));

/* The forty, read off the sheet rather than retyped: the ranking's tie-break
   and every sticker ref are checked against the sheet's own list. */
const sheetSrc = fs.readFileSync(SHEET, 'utf8');
const propsRaw = /data-props="([^"]*)"/.exec(sheetSrc);
const props = propsRaw ? JSON.parse(propsRaw[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&')) : null;
const SHEET_PARTS = props && props.part ? props.part.options : [];
const SHEET_TAGS = props && props.part ? props.part.tags : {};
check('the sheet declares forty parts and a tag per part',
  SHEET_PARTS.length === 40 && Object.keys(SHEET_TAGS).length === 40, SHEET_PARTS.length + ' parts');

/* …and the two lists a recipe can leave a hole in a page with, both read off
   the sheet rather than retyped: the parts drawn round an IMAGE SLOT (the
   data-props `slots` map — CONTRACTS §8) and the parts drawn round a TEXT
   slot (a `<g data-layer="text">` inside that part's own <sc-if> block). A
   part from either list is a blank on the page unless the recipe hands it a
   picture or a word, which is what the two checks in §4 refute. */
const SHEET_SLOTS = (props && props.part && props.part.slots) || {};
const TEXT_PARTS = SHEET_PARTS.filter(function (id) {
  const flag = 'is' + id.replace(/(^|-)([a-z])/g, (m, d, c) => c.toUpperCase());
  const at = sheetSrc.indexOf('{{ ' + flag + ' }}');
  if (at < 0) return false;
  const end = sheetSrc.indexOf('</sc-if>', at);
  return sheetSrc.slice(at, end < 0 ? sheetSrc.length : end).indexOf('data-layer="text"') >= 0;
});
check('the sheet has five image-slot parts and eight text parts (Appendix D)',
  Object.keys(SHEET_SLOTS).length === 5 && TEXT_PARTS.length === 8,
  Object.keys(SHEET_SLOTS).join(' ') + ' | ' + TEXT_PARTS.join(' '));
check('Recipes.PARTS is the sheet\'s own list, in the sheet\'s order',
  JSON.stringify(R.PARTS) === JSON.stringify(SHEET_PARTS));

/* ── the schema validator, if the schemas agent has landed it ────────────── */

const SCHEMA_FILE = path.join(PRESS, 'schemas', 'layout.schema.json');
const VALIDATE_FILE = path.join(__dirname, 'lib', 'validate.js');
let validate = null, validateWhy = '';
(function pickValidator() {
  if (!fs.existsSync(VALIDATE_FILE)) { validateWhy = 'press/tools/lib/validate.js does not exist yet (the schemas agent owns it); layout.schema.json is therefore unchecked here'; return; }
  if (!fs.existsSync(SCHEMA_FILE)) { validateWhy = 'press/schemas/layout.schema.json does not exist yet; the validator is there but has nothing to check against'; return; }
  let V, schema, pool = null;
  try {
    V = require(VALIDATE_FILE);
    schema = JSON.parse(fs.readFileSync(SCHEMA_FILE, 'utf8'));
    if (typeof V.loadDir === 'function') pool = V.loadDir(path.dirname(SCHEMA_FILE));
  } catch (e) { validateWhy = 'loading the validator or the schema threw: ' + e.message; return; }
  if (typeof V.check !== 'function') { validateWhy = 'validate.js exports ' + Object.keys(V).join(', ') + ', not check(data, schema, pool)'; return; }
  const call = d => V.check(d, schema, pool);
  /* The negative control. A validator that answers [] to everything would
     make every layout below pass for nothing, so the broken layout has to
     come back with complaints before the good one's silence means anything. */
  const good = R.resolve('poster', fixtureInput('pixelfort'));
  const bad = JSON.parse(JSON.stringify(good));
  bad.recipe = 'nope';                       // off the enum
  delete bad.open.h;                         // and `open` loses a number
  bad.slots[0].scale = 9;                    // and a scale goes past the schema's 4
  let g, b2;
  try { g = call(good); } catch (e) { validateWhy = 'check() threw on a good layout: ' + e.message; return; }
  try { b2 = call(bad); } catch (e) { b2 = null; }
  if (!Array.isArray(g)) { validateWhy = 'check() answered ' + JSON.stringify(g) + ', not a list of complaints'; return; }
  if (!Array.isArray(b2) || b2.length < 3) { validateWhy = 'check() did not complain about a deliberately broken layout, so its silence proves nothing'; return; }
  validate = { call: call, label: 'Validate.check(data, schema, pool)' };
})();
if (validate) check('press/tools/lib/validate.js is usable and can fail (' + validate.label + ')', true);
else skip('layout.schema.json validation', validateWhy);

/* ── fixtures ────────────────────────────────────────────────────────────── */

function fixtureInput(name) {
  const manifest = JSON.parse(fs.readFileSync(path.join(FIX, name, 'manifest.json'), 'utf8'));
  return { manifest, assets: manifest.assets };
}
function expectedOf(name) {
  return JSON.parse(fs.readFileSync(path.join(FIX, name, 'expected.json'), 'utf8'));
}

/* ── 1 · the choice ──────────────────────────────────────────────────────── */

for (const name of FIXTURES) {
  const inp = fixtureInput(name), exp = expectedOf(name);
  const got = R.choose({ assets: inp.assets, preset: exp.preset[0] });
  check(name + ': choose() ranks ' + exp.recipe.join(' then ') + ' first',
    got.slice(0, exp.recipe.length).join(',') === exp.recipe.join(','), got.join(', '));
  check(name + ': choose() offers all three, each once',
    got.length === 3 && new Set(got).size === 3, got.join(', '));
}
{
  const inp = fixtureInput('neonrun');
  const over = R.choose({ assets: inp.assets, preset: 'neon', vibe: { recipe: 'scrapbook', confidence: 0.6 } });
  const under = R.choose({ assets: inp.assets, preset: 'neon', vibe: { recipe: 'scrapbook', confidence: 0.59 } });
  check('the vision call overrides at confidence 0.6', over[0] === 'scrapbook', over.join(', '));
  check('…and not at 0.59', under[0] === 'widescreen', under.join(', '));
  check('a cozy preset offers scrapbook second, never first',
    R.choose({ assets: inp.assets, preset: 'cozy-soft' }).join(',') === 'widescreen,scrapbook,poster');
  check('with no art at all the answer is still three ids, Appendix E\'s order',
    R.choose({}).join(',') === 'poster,widescreen,scrapbook');
}

/* ── 2 · Appendix E, verbatim ────────────────────────────────────────────── */

/* k = 1 on these three, so the layout's numbers ARE the appendix's numbers. */
const slotOf = (L, kind, ref) => L.slots.filter(s => s.kind === kind && s.ref === ref)[0];
const noteOf = (L, ref) => L.slots.filter(s => s.kind === 'note' && s.ref === ref)[0];
const at = (s, x, y) => !!s && near(s.x, x) && near(s.y, y);

{
  const L = R.resolve('poster', fixtureInput('pixelfort'));
  const logo = slotOf(L, 'pic', 'logo'), art = slotOf(L, 'pic', 'keyart-portrait');
  check('poster: logo at (−300, −900) scale 0.5 of a 640-wide reference',
    at(logo, -300, -900) && near(logo.w, 320), logo && (logo.x + ',' + logo.y + ' w ' + logo.w));
  check('poster: key art at (−520, −700) at the CORRECTED scale 1.3 of its own 480 px (the appendix asked 0.55, which drew it narrower than one of its own polaroids)',
    at(art, -520, -700) && near(art.w, 624), art && (art.x + ',' + art.y + ' w ' + art.w));
  check('poster: title note at (240, −650) at the CORRECTED width 960 (the appendix asked 560, which is 26 characters a line at the 34-unit body)',
    at(noteOf(L, 'title'), 240, -650) && near(noteOf(L, 'title').width, 960));
  const pdesc = noteOf(L, 'description'), psign = slotOf(L, 'sign', 'links'), ptitle = noteOf(L, 'title');
  check('poster: the description is the same column, FLOWED 54 under the title',
    near(pdesc.x, 240) && near(pdesc.width, 960) && near(pdesc.y, ptitle.y + ptitle.h + 54),
    pdesc && (pdesc.x + ',' + pdesc.y + ' under ' + (ptitle.y + ptitle.h)));
  check('poster: the sign is the foot of that column, 102 under the description',
    near(psign.x, 240) && near(psign.width, 960) && near(psign.y, pdesc.y + pdesc.h + 102),
    psign && (psign.x + ',' + psign.y));
  check('poster: the column clears the screenshot row it used to sit on top of',
    psign.y + psign.h < 320, psign && ('the sign ends at ' + Math.round(psign.y + psign.h) + ', the row starts at 320'));
  const row = L.slots.filter(s => s.ref === 'frame-polaroid');
  check('poster: four polaroids at y 320, x −760 + 400·i, rot alternating −2/+2',
    row.length === 4 && row.every((s, i) => near(s.y, 320) && near(s.x, -760 + 400 * i) && s.rot === (i % 2 ? 2 : -2)),
    row.map(s => s.x + '@' + s.rot).join(' '));
  check('poster: each polaroid carries its screenshot',
    row.every((s, i) => s.image === 'shot-' + (i + 1)), row.map(s => s.image).join(' '));
  check('poster: the burst is under the logo in the pile',
    slotOf(L, 'sticker', 'burst').z < logo.z);
  check('poster: tag-wishlist carries its word',
    slotOf(L, 'sticker', 'tag-wishlist').text === 'WISHLIST');
  check('poster: the named stickers are all placed',
    ['burst', 'tape-strip', 'tag-wishlist', 'sparkle'].every(p => !!slotOf(L, 'sticker', p)) &&
    L.slots.filter(s => s.ref === 'sparkle').length === 2);
}
{
  const L = R.resolve('widescreen', fixtureInput('neonrun'));
  const hero = slotOf(L, 'pic', 'hero'), logo = slotOf(L, 'pic', 'logo');
  check('widescreen: hero at (−900, −950), 1600 wide at scale 1.0',
    at(hero, -900, -950) && near(hero.w, 1600) && near(hero.scale, 1), hero && (hero.w + ' @ ' + hero.scale));
  check('widescreen: logo at (−860, −380) scale 0.4', at(logo, -860, -380) && near(logo.w, 256));
  /* the CORRECTED word column: Appendix E's three text coordinates were all
     inside the hero's own rectangle (−900,−950 1600 × 900), which is a caption
     burnt into a photograph. Beside it, and the opening rectangle is the same
     rectangle it was — asserted below. */
  const wtitle = noteOf(L, 'title'), wdesc = noteOf(L, 'description'), wsign = slotOf(L, 'sign', 'links');
  const heroBox = { x0: hero.x, y0: hero.y, x1: hero.x + hero.w, y1: hero.y + hero.h };
  const clearOfHero = s => s.x >= heroBox.x1 || s.x + s.w <= heroBox.x0 || s.y >= heroBox.y1 || s.y + s.h <= heroBox.y0;
  check('widescreen: the title, the description and the sign are all CLEAR of the hero',
    [wtitle, wdesc, wsign].every(clearOfHero),
    [wtitle, wdesc, wsign].map(s => s.ref + (clearOfHero(s) ? ' clear' : ' OVER THE HERO')).join(', '));
  check('widescreen: one column at x 780, width 960, its top level with the hero',
    [wtitle, wdesc, wsign].every(s => near(s.x, 780) && near(s.width, 960)) && near(wtitle.y, hero.y),
    [wtitle, wdesc, wsign].map(s => s.x + '/' + s.width).join(' '));
  check('widescreen: the description flows 54 under the title, the sign 150 under the description',
    near(wdesc.y, wtitle.y + wtitle.h + 54) && near(wsign.y, wdesc.y + wdesc.h + 150),
    wtitle.y + '+' + wtitle.h + ' → ' + wdesc.y + ' → ' + wsign.y);
  check('widescreen: the whole column clears the screenshot row at y 80',
    wsign.y + wsign.h < 80, 'the sign ends at ' + Math.round(wsign.y + wsign.h));
  check('widescreen: moving the words off the hero cost no opening zoom — the rectangle is 2880 × 1716',
    near(L.open.w, 2880) && near(L.open.h, 1716.3), L.open.w + ' × ' + L.open.h);
  const row = L.slots.filter(s => s.ref === 'frame-film');
  check('widescreen: four film cells at y 80, x −880 + 460·i',
    row.length === 4 && row.every((s, i) => near(s.y, 80) && near(s.x, -880 + 460 * i)),
    row.map(s => s.x).join(' '));
  /* Appendix E named `badge-round` for the hero's corner; it is `burst-round`
     since 2026-09-07, because badge-round is drawn round a window and a word
     and a decoration has neither — recipes.js's widescreen() argues it, and
     the two checks under §4 below are what stop it coming back. */
  check('widescreen: the named stickers are all placed, the corner seal as burst-round',
    ['banner', 'arrow', 'burst-round'].every(p => !!slotOf(L, 'sticker', p)) && !slotOf(L, 'sticker', 'badge-round'));
  check('widescreen: the banner carries the release year off the manifest',
    slotOf(L, 'sticker', 'banner').text === '2027',
    JSON.stringify(slotOf(L, 'sticker', 'banner').text) + ' from releaseDate ' + JSON.stringify(fixtureInput('neonrun').manifest.releaseDate));
}
{
  const L = R.resolve('scrapbook', fixtureInput('neonrun'));
  const art = slotOf(L, 'pic', 'hero'), logo = slotOf(L, 'pic', 'logo');
  check('scrapbook: key art at (−600, −900) scale 0.5 rot −3',
    at(art, -600, -900) && near(art.w, 800) && art.rot === -3, art && (art.w + ' @ ' + art.rot));
  check('scrapbook: logo at (−100, −950) scale 0.45 rot 2',
    at(logo, -100, -950) && near(logo.w, 288) && logo.rot === 2);
  check('scrapbook: the notes start at (200, −700) rot 1',
    at(noteOf(L, 'title'), 200, -700) && noteOf(L, 'title').rot === 1);
  check('scrapbook: everything is rotated inside −4…+4',
    L.slots.every(s => s.rot >= -4 && s.rot <= 4), L.slots.map(s => s.rot).join(' '));
  check('scrapbook: tape-strip ×4, and the rest of the named parts',
    L.slots.filter(s => s.ref === 'tape-strip').length === 4 &&
    ['leaf-sprig', 'mushroom', 'heart', 'circle-mark', 'tape-x', 'pin'].every(p => !!slotOf(L, 'sticker', p)));
  const shots = L.slots.filter(s => s.ref === 'frame-polaroid');
  check('scrapbook: the polaroids are scattered on two rows',
    shots.length === 4 && new Set(shots.map(s => Math.round(s.y / 100))).size === 2, shots.map(s => s.y).join(' '));
}

/* ── 3-5 · every layout, against the schema and the geometry ─────────────── */

const NOTE_REFS = R.NOTE_REFS.concat([R.SIGN_REF]);
const ASPECT = R.OPEN.w / R.OPEN.h;
const report = [];

for (const name of FIXTURES) {
  const inp = fixtureInput(name);
  const assetIds = inp.assets.map(a => a.id);
  for (const id of R.IDS) {
    const tag = name + '/' + id;
    const L = R.resolve(id, inp);
    report.push({ fixture: name, recipe: id, slots: L.slots.length, open: L.open, openNarrow: L.openNarrow });

    if (validate) {
      const errs = validate.call(L);
      check(tag + ': validates against layout.schema.json', errs.length === 0,
        errs.map(e => (e.path || '<root>') + ' ' + e.message).join(' | '));
    }
    check(tag + ': is the plan\'s object', L.recipe === id && !!L.open && Array.isArray(L.slots) && L.slots.length > 0,
      L.slots.length + ' slots');

    const keys = L.slots.map(s => s.x + '|' + s.y + '|' + s.ref);
    check(tag + ': no two slots share the same {x, y, ref}', new Set(keys).size === keys.length,
      keys.filter((k, i) => keys.indexOf(k) !== i).join(' '));

    const badRef = L.slots.filter(s =>
      s.kind === 'pic' ? assetIds.indexOf(s.ref) < 0
        : s.kind === 'sticker' ? SHEET_PARTS.indexOf(s.ref) < 0
          : NOTE_REFS.indexOf(s.ref) < 0);
    check(tag + ': every ref is an asset, one of the forty, or a note name', badRef.length === 0,
      badRef.map(s => s.kind + ':' + s.ref).join(' '));
    const badImage = L.slots.filter(s => s.image != null && assetIds.indexOf(s.image) < 0);
    check(tag + ': every image-slot picture is one of the manifest\'s assets', badImage.length === 0,
      badImage.map(s => s.ref + '←' + s.image).join(' '));

    /* NO BLANK STICKER REACHES A PAGE (2026-09-07). A part drawn round an
       image slot with no picture in it draws an opaque --sk-paper rect — a
       white square on a light page, a black one on a dark one — and a text
       part with no words draws an empty ribbon. Both stood on the two
       widescreen pages until this run (perf/results/phase5/game-*.png), and
       both are a recipe's doing and not the sheet's: the parts are legal and
       something chose them. So a recipe may place a part from either list
       only with the thing that fills it. */
    const holes = L.slots.filter(s => s.kind === 'sticker' && SHEET_SLOTS[s.ref] && !s.image);
    check(tag + ': no part with an image slot is placed without a picture in it', holes.length === 0,
      holes.length ? holes.map(s => s.ref).join(' ') + ' — each would draw an opaque --sk-paper rect'
        : L.slots.filter(s => s.image).length + ' framed pictures, no empty windows');
    const mute = L.slots.filter(s => s.kind === 'sticker' && TEXT_PARTS.indexOf(s.ref) >= 0
      && !String(s.text == null ? '' : s.text).trim());
    check(tag + ': no text part is placed without words', mute.length === 0,
      mute.length ? mute.map(s => s.ref).join(' ') + ' — each would draw a blank slot'
        : (L.slots.filter(s => TEXT_PARTS.indexOf(s.ref) >= 0).map(s => s.ref + ' ' + JSON.stringify(s.text)).join(', ') || 'no text part in this recipe'));

    const badNum = L.slots.filter(s => !(s.scale >= 0.05 && s.scale <= 4) || !(s.rot >= -45 && s.rot <= 45)
      || !Number.isInteger(s.z) || !isFinite(s.x) || !isFinite(s.y) || !(s.w > 0) || !(s.h > 0));
    check(tag + ': scale, rot, z and every box are inside the schema\'s ranges', badNum.length === 0,
      badNum.map(s => s.ref + ' s' + s.scale + ' r' + s.rot + ' z' + s.z).join(' '));
    check(tag + ': z is 0…n−1, once each and in slot order',
      L.slots.every((s, i) => s.z === i));

    const out = L.slots.filter(s => s.x < L.open.x - 0.02 || s.y < L.open.y - 0.02
      || s.x + s.w > L.open.x + L.open.w + 0.02 || s.y + s.h > L.open.y + L.open.h + 0.02);
    check(tag + ': the opening rectangle contains every slot\'s box', out.length === 0,
      out.map(s => s.ref).join(' '));
    /* THE RECTANGLE IS THE COMPOSITION'S OWN SHAPE, and this check was the
       opposite one until 2026-09-07: it held `open` to the bench's 3200:1390
       within 1 %, because Appendix E said to widen or heighten it to that
       aspect. openOf() now carries the measurement that took the widening
       out — enlarging the rectangle can only lower the zoom a page lands at
       — so what is asserted is that the rectangle is the box plus the margin
       on BOTH axes, which the check under this one measures, and that its
       shape is therefore the composition's and not the bench's. The two
       aspects are reported so a reader can see how far apart they are. */
    const bench = Math.abs(L.open.w / L.open.h - ASPECT) / ASPECT;
    check(tag + ': the opening rectangle wears the COMPOSITION' + String.fromCharCode(39) + 's shape, not the bench' + String.fromCharCode(39) + 's aspect',
      bench > 0.01, (L.open.w / L.open.h).toFixed(4) + ':1 against the bench' + String.fromCharCode(39) + 's ' + ASPECT.toFixed(4) + ':1');

    /* never smaller than the box plus the margin: one of the two axes is
       exactly that, and neither is under it. */
    const xs = L.slots.map(s => s.x), ys = L.slots.map(s => s.y);
    const bx = Math.min.apply(null, xs), by = Math.min.apply(null, ys);
    const bw = Math.max.apply(null, L.slots.map(s => s.x + s.w)) - bx;
    const bh = Math.max.apply(null, L.slots.map(s => s.y + s.h)) - by;
    const k = kOf(inp, id);
    const m = R.MARGIN * k;
    check(tag + ': never smaller than the box plus ' + Math.round(m) + ' of margin, and tight on one axis',
      L.open.w >= bw + 2 * m - 0.02 && L.open.h >= bh + 2 * m - 0.02 &&
      (near(L.open.w, bw + 2 * m, 0.02) || near(L.open.h, bh + 2 * m, 0.02)),
      'box ' + bw.toFixed(1) + '×' + bh.toFixed(1) + ' → open ' + L.open.w + '×' + L.open.h);

    const n = L.openNarrow;
    check(tag + ': the narrow rectangle sits on the wide one\'s y and height, and is no wider',
      near(n.y, L.open.y) && near(n.h, L.open.h) && n.w <= L.open.w + 0.02,
      JSON.stringify(n));
    const spine = L.slots.filter(s => s.kind === 'note' || s.kind === 'sign' || s.kind === 'pic');
    const spineOut = spine.filter(s => s.x < n.x - 0.02 || s.x + s.w > n.x + n.w + 0.02);
    check(tag + ': the narrow rectangle still holds the spine', spineOut.length === 0,
      spineOut.map(s => s.ref).join(' '));

    check(tag + ': resolve() is deterministic',
      JSON.stringify(R.resolve(id, fixtureInput(name))) === JSON.stringify(L));
  }
}

/* k, recomputed here from the manifest rather than asked of the module, so
   the margin assertion above is not checked against the same arithmetic it is
   testing: the ruler is the recipe's own picture and REF follows orientation. */
function kOf(inp, id) {
  const list = inp.assets;
  const role = r => list.filter(a => a.role === r);
  const hero = role('hero')[0] || role('keyart').filter(a => a.w >= a.h)[0] || null;
  const keyart = role('keyart')[0] || null;
  const ruler = id === 'widescreen' ? (hero || keyart) : (keyart || hero);
  if (!ruler) return 1;
  return ruler.w / (ruler.h > ruler.w ? 480 : 1600);
}

/* ── 6 · the art sets the scale ──────────────────────────────────────────── */

for (const name of ['mosslight', 'neonrun']) {
  const full = fixtureInput(name);
  const half = JSON.parse(JSON.stringify(full));
  for (const a of half.assets) if (a.role === 'hero') { a.w = a.w / 2; a.h = a.h / 2; }
  half.manifest.assets = half.assets;
  const A = R.resolve('widescreen', full), B = R.resolve('widescreen', half);
  const heroA = slotOf(A, 'pic', 'hero'), heroB = slotOf(B, 'pic', 'hero');
  check(name + ': a hero at half the pixels is placed at half the size',
    near(heroB.w, heroA.w / 2) && near(heroB.h, heroA.h / 2) && near(heroB.scale, heroA.scale),
    heroA.w + ' → ' + heroB.w + ' at scale ' + heroB.scale);
  const off = [];
  A.slots.forEach((s, i) => {
    const t = B.slots[i];
    if (!t || t.kind !== s.kind || t.ref !== s.ref) { off.push('slot ' + i); return; }
    for (const key of ['x', 'y', 'w', 'h']) if (!near(s[key] / 2, t[key], 0.02)) off.push(s.ref + '.' + key);
  });
  check(name + ': …and every other slot with it, so the composition keeps its proportions',
    off.length === 0, off.join(' '));
  const rects = [];
  for (const key of ['x', 'y', 'w', 'h']) {
    if (!near(A.open[key] / 2, B.open[key], 0.02)) rects.push('open.' + key);
    if (!near(A.openNarrow[key] / 2, B.openNarrow[key], 0.02)) rects.push('narrow.' + key);
  }
  check(name + ': …and both rectangles, margin included', rects.length === 0, rects.join(' '));
}

/* ── 7 · the ranking ─────────────────────────────────────────────────────── */

{
  const plain = R.rankStickers(SHEET_TAGS, {});
  check('with nothing to rank by, the order is Appendix D\'s',
    plain.join(',') === SHEET_PARTS.join(','));
  const cozy = R.rankStickers(SHEET_TAGS, { motifs: ['leaf', 'mushroom', 'cloud'], mood: ['cozy'], count: 3 });
  check('motifs come first: leaf/mushroom/cloud → leaf-sprig, mushroom, cloud',
    cozy.join(',') === 'leaf-sprig,mushroom,cloud', cozy.join(', '));
  const tie = R.rankStickers(SHEET_TAGS, { motifs: ['storm', 'gear'], count: 2 });
  check('a tie breaks by Appendix D\'s order (bolt #32 before gear #35, both 3)',
    tie.join(',') === 'bolt,gear', tie.join(', '));
  const moodOnly = R.rankStickers(SHEET_TAGS, { mood: ['dread'], count: 3 });
  check('a mood alone still ranks (dread → the horror parts)',
    moodOnly.indexOf('skull') >= 0 && moodOnly.indexOf('crescent') >= 0, moodOnly.join(', '));
  const motif = R.rankStickers(SHEET_TAGS, { motifs: ['skull'], mood: ['cozy'] });
  check('a motif hit (3) outranks a mood hit (1)',
    motif[0] === 'skull', motif.slice(0, 3).join(', '));
  check('count is honoured, and the answer is deterministic',
    R.rankStickers(SHEET_TAGS, { motifs: ['fire'], count: 5 }).length === 5 &&
    R.rankStickers(SHEET_TAGS, { motifs: ['fire'] }).join(',') === R.rankStickers(SHEET_TAGS, { motifs: ['fire'] }).join(','));
  check('an extractOnly record ({tags, w, h}) ranks the same as a bare tag map',
    R.rankStickers(mapRecords(SHEET_TAGS), { motifs: ['leaf'], count: 3 }).join(',') ===
    R.rankStickers(SHEET_TAGS, { motifs: ['leaf'], count: 3 }).join(','));
  check('a prototype key is not a part (rankStickers over {constructor: …} answers nothing)',
    R.rankStickers({}, { motifs: ['fire'] }).length === 0);
  const nasty = R.rankStickers(SHEET_TAGS, { motifs: ['__proto__', 'toString', 'fire'], mood: ['constructor'] });
  check('a motif off the menu cannot poison the scoring (__proto__, toString, constructor)',
    nasty.length === 40 && nasty[0] === 'fire' && nasty.join(',') !== SHEET_PARTS.join(','), nasty.slice(0, 3).join(', '));
}
function mapRecords(tags) {
  const out = {};
  for (const id of Object.keys(tags)) out[id] = { tags: tags[id], w: 128, h: 128, still: '', text: '' };
  return out;
}

{
  const inp = fixtureInput('neonrun');
  const plain = R.resolve('scrapbook', inp);
  const vibed = R.resolve('scrapbook', Object.assign({}, inp, {
    stickers: SHEET_TAGS,
    vibe: { motifs: ['gear', 'storm', 'skull'], mood: ['neon'], recipe: 'scrapbook', confidence: 0.8 }
  }));
  check('with no vibe, the motif slots are Appendix E\'s own parts',
    ['leaf-sprig', 'mushroom', 'heart'].every(p => !!slotOf(plain, 'sticker', p)));
  check('with one, they become the ranking\'s top three',
    ['bolt', 'gear', 'skull'].every(p => !!slotOf(vibed, 'sticker', p)) &&
    !slotOf(vibed, 'sticker', 'leaf-sprig'),
    vibed.slots.filter(s => s.kind === 'sticker').map(s => s.ref).join(' '));
  check('and nothing else moves: the two layouts differ only in those refs',
    plain.slots.length === vibed.slots.length &&
    plain.slots.every((s, i) => near(s.x, vibed.slots[i].x) && near(s.y, vibed.slots[i].y) && near(s.w, vibed.slots[i].w)));
  check('a vibe with no tag map changes nothing (the sheet is the caller\'s to pass)',
    JSON.stringify(R.resolve('scrapbook', Object.assign({}, inp, { vibe: { motifs: ['gear'], confidence: 0.9 } }))) ===
    JSON.stringify(plain));
}

/* ── the report ──────────────────────────────────────────────────────────── */

console.log('\n  fixture / recipe        slots   opening rectangle (x, y, w, h)                narrow');
for (const r of report) {
  const o = r.open, n = r.openNarrow;
  console.log('  ' + (r.fixture + ' / ' + r.recipe).padEnd(22) + String(r.slots).padStart(4) + '    '
    + (o.x + ', ' + o.y + ', ' + o.w + ', ' + o.h).padEnd(42)
    + n.x + ', ' + n.w);
}

try { fs.mkdirSync(OUT, { recursive: true }); } catch (e) {}
fs.writeFileSync(path.join(OUT, 'summary.json'), JSON.stringify({
  date: new Date().toISOString(),
  file: 'lab2/test/press/recipes.js',
  schema: validate ? { checked: true, call: validate.label } : { checked: false, why: validateWhy },
  layouts: report,
  results
}, null, 2));

finish();

function finish() {
  const n = results.filter(r => r.ok !== null).length;
  console.log('\n' + (n - fails) + '/' + n + ' checks pass' + (fails ? ', ' + fails + ' FAIL' : '')
    + (skips ? ', ' + skips + ' skipped' : ''));
  console.log('wrote ' + path.join(OUT, 'summary.json'));
  process.exit(fails ? 1 : 0);
}
