/* ─── THE PRESS TABLE, THE FLOW ────────────────────────────────────────────
   press/press.js — window.Press. The page's own wiring: the drop zone, the
   form, the reading, the three compositions, the dials and the one button at
   the end that writes a game page. Plan §10 6.2 in order, and §12 1's second
   mode beside it.

   IT DOES NOT DO THE WORK, IT ARRANGES IT. Every hard thing on this page was
   built and tested before this file existed and is called here, never
   re-implemented: window.Palette reads the colours off a picture,
   window.Style measures its style, window.Theme turns a palette into a token
   sheet, window.Fonts names the pairings, window.Recipes lays a composition
   out, window.Vibe asks the model and decides who wins when a measurement
   and a judgement disagree, window.Validate holds every object to its
   schema, window.Kits cuts the stickers out of the sheet, and
   window.Preview draws the three mockups. What is left — and it is all this
   file is — is the ORDER those are called in, the state between them, and
   the sentences the panel says about what came back.

   ── THE TWO MODES (plan §12 1) ───────────────────────────────────────────
   The page knocks on its own door at boot, exactly as keep.js does, with the
   same three lines of derivation (CONTRACTS §0 — written out in each file
   because the bench has no module system and a shared file would have to be
   loaded by a page, a Vercel function and a Node script alike).

     the door answers → OWNER MODE. The build button posts the bundle to
       /_lab2/…/build, the local generator writes games/<slug>/, and the
       whole dial panel is there.
     no door (a 404 on the deployed site, or this page opened off a static
       host) → PUBLISHER MODE. The same drop zone, the same form, the same
       reading and the same three previews — a publisher should see exactly
       what the owner will see — but the button says SEND TO KNOLL and posts
       to /api/intake, and the dials are cut to accent, preset and hero. The
       rest of the dials are the owner's: font pairing, screenshot order and
       sticker sets are decisions about how the SITE looks, and the site is
       not the publisher's.

   ── EVERY NUMBER IN THIS FILE, AND WHERE IT CAME FROM ────────────────────

   MAX_FILES 12 / MAX_BYTES 25 MB — plan §10 6.1, and the same pair
     manifest.schema.json's `assets.maxItems` and api/intake.js's own caps
     enforce. Refused at the drop, so a thirteenth file never gets decoded.

   ALPHA_T 250 — a picture is a LOGO when it has an alpha channel that is
     actually used, and "used" is a pixel under this. Not 255: a PNG round
     through a browser's decoder and a canvas can land a nominally opaque
     pixel a step or two down, and a 255-only test would call a plain
     photograph transparent on some machines and not others. Not lower
     either: a logo's own soft edge is the thing being looked for and it
     runs all the way from 0 to 255, so anything at or under ~98 % opacity
     is real transparency. 250 is that line with five steps of decoder slop
     under it.

   ALPHA_EDGE 512 — the alpha scan runs on a copy no longer than this on its
     long edge, which is the same 512 window Style does its cheap statistics
     in (CONTRACTS §4), so a 4K key art costs one 512-px read and not eight
     million. Averaging cannot hide transparency: a single transparent pixel
     among opaque neighbours averages to about 191, well under ALPHA_T.

   ASPECT_TOL 0.05 — the plan's "within 5 %" for the screenshot test, taken
     as a relative error on the ratio (|a / t − 1| ≤ 0.05), so it is the same
     5 % at 16:9 and at 16:10.

   K 8 — the plan's k for the quantiser (§10 6.2 step 3), and also
     analysis.schema.json's `palette.maxItems`, so a ninth cluster could not
     be written down even if it were asked for.

   PALETTE_SEED 'knoll-press' — a FIXED seed, not the slug and not the clock.
     Palette.quantize seeds k-means++ from opts.rng, and the press passes
     Palette.rng(seed) precisely so that the same pictures give the same
     eight swatches every time (CONTRACTS §1). It is fixed rather than
     derived from the game because the slug is edited AFTER the reading has
     run — the swatches must not shuffle under the owner's hand while they
     are typing a title — and because a page rebuilt from its game.json a
     year later has to come out the same page.

   RANK_EPS 1e-6 — see THE SECOND READING, below.

   TRAY 12 — "the sticker tray's first twelve parts" (plan §10 6.4).

   STAGE_W0 260 / STAGE_AR 1.25 — the box a mockup is fitted into when the
     stage on the page has no measurable one of its own. press.css's
     `.pt-stage` is where the real box lives (5 : 4, and the sentence for it
     is there): a stage in the document has a width and a height, drawCard
     reads both, and this pair is only reached by a caller that renders into
     a stage with neither — a row inside a `display:none` panel, say. It is a
     PAIR and not a width because a mockup is fitted on both axes now; 260 is
     the width the file has always fallen back to and 1.25 is the
     stylesheet's own ratio, so the two must move together.

   VIBE_IMAGES 4 / VIBE_EDGE 1024 — plan §11 step 1 and api/vibe.js's own
     MAX_IMAGES: at most four pictures, each downsized to a long edge of
     1024 before it is sent.

   CAP — build-game.js's own per-role pixel caps, mirrored here so the Table
     sends bytes the builder will not have to warn about
     (`logo 1024, hero 2048, keyart 2048, screenshot 1600, misc 1600`), and
     WEBP_Q 0.86 is that file's constant too, marked "§5.3, verbatim".

   ── THE SECOND READING, AND WHAT "AMBIGUOUS" MEANS ───────────────────────
   Plan §10 6.4 asks for three mockups: "recipe A light, recipe A dark (if
   the palette is ambiguous), recipe B". It does not say what ambiguous is,
   so here is the definition this file uses, and it is a fact about the
   palette rather than a threshold somebody picked.

   A palette is a list of colours, each with the SHARE OF THE PIXELS it won.
   Theme.derive calls the page light or dark by the share-weighted mean of
   their OKLCH lightness (under 0.55 → dark). That is one honest reading of
   the picture. There is a second, equally honest: count each COLOUR once
   instead of each pixel once — a key art that is seventy per cent sky is
   not thereby a game about sky. The two readings usually agree, and when
   they do the palette is not ambiguous and the second card shows another
   composition instead. When they DISAGREE the palette genuinely does not
   say whether this is a light page or a dark one, and the second card is
   the same composition under the other reading.

   The second reading is made by handing Theme.derive the same swatches with
   their shares flattened. They are flattened to `1 − i·RANK_EPS` and not to
   a flat 1 for one reason: Theme.derive sorts by weight and breaks ties on
   the hex string, and it takes the PAPER'S HUE from the heaviest hued entry.
   Flat ones would hand the paper's hue to whichever colour happens to sort
   first alphabetically, which is not a reading of anything. A step of
   1e-6 per place keeps the picture's own ranking as the tie-break while
   moving the mean by less than a millionth — five orders of magnitude under
   theme.js's own STEP of 0.01, and Theme prints its means to two decimals.

   So the three cards are, always three and always different:

     ambiguous:      A · the palette read by pixel  |  A · read by colour  |  B
     not ambiguous:  A                              |  B                   |  C

   Recipes.choose always returns all three ids ranked, so there is always a
   B and a C to show.

   ── HOW THE ACCENT PICKER WORKS, AND WHY IT IS NOT A COLOUR INPUT ────────
   Plan §10 6.5: "accent from the extracted swatches (never a free picker)".
   Theme.derive chooses the accent itself — the highest-chroma swatch
   carrying at least 2 % of the pixels — so overriding it means changing
   which swatch wins that contest, not painting a colour over the answer
   (a colour painted over the answer would skip theme.js's contrast floors,
   which are the reason the tokens are readable at all).

   The contest is decided on CHROMA. So choosing swatch X hands derive the
   same palette with every swatch MORE chromatic than X clipped down to just
   under X's chroma, at its own lightness and its own hue. Everything else
   derive reads is untouched by that: the light/dark decision is over
   lightness, the paper's hue and the ink's complement are over hue and
   weight, and a clipped swatch keeps both. The one visible cost is that a
   reason line naming where the paper's hue came from can print the clipped
   hex rather than the extracted one — same hue, less chroma — and that is
   written here rather than hidden.

   Only swatches that could win the contest are offered: at least
   ACCENT_MIN_W of the pixels and at least GREY_C of chroma, theme.js's own
   two constants. A swatch with no hue cannot be an accent, and a swatch
   nobody can see cannot either.

   ── WHAT IS KEPT, AND WHAT IS NOT (plan §10 6.7) ─────────────────────────
   The words, the roles, the order and the dials go into PressStore under
   `knoll-press:*` on every keystroke, and a build that succeeds clears
   them. The PICTURES do not: a dozen screenshots as base64 is tens of
   megabytes against a five-megabyte store, and a store that quietly stops
   saving is worse than one that never promised. So a reload keeps the form
   and asks for the folder again — press/store.js's header has the argument.

   ── THE ORDER THE READING RUNS IN, AND WHY IT IS THAT ORDER ──────────────
   Theme.derive is called TWICE for the first reading and that is not waste:
   Style.vector needs to be told whether the page is dark (CONTRACTS §4 —
   "`dark` is analysis.dark (Theme's call), not something stats can say"),
   and Theme.derive needs to be told which preset's palette size and which
   font pairing to bake, and those come out of Style. So: derive once from
   the palette alone to ask the light/dark question, measure and rank with
   that answer, suggest the pairings, ask the door, merge — and then derive
   again, for real, with the preset and the pairing in hand. Both calls are
   pure arithmetic over eight colours.
   ───────────────────────────────────────────────────────────────────────── */
(function () {
  'use strict';

  /* ── the door: CONTRACTS §0's three lines, as keep.js writes them ─────── */
  const dir = location.pathname.replace(/[^/]*$/, '');
  const game = /^\/lab2(\/.*?)?\/games\/([a-z0-9-]+)\/$/.exec(dir);
  const DOOR = game ? '/_lab2' + (game[1] || '') + '/games/' + game[2]
                    : '/_lab2' + ((/^\/lab2(\/.*?)??\/(?:press\/)?$/.exec(dir) || [])[1] || '') + '/default';
  const HOUSE = DOOR.replace(/\/default$/, '');          // '/_lab2/test' here, '/_lab2' merged
  const BUILD = HOUSE + '/build';
  const VIBE = HOUSE + '/vibe';
  const INTAKE = HOUSE + '/intake';
  // where a built page can be opened: this folder, minus the trailing press/
  const GAMES = dir.replace(/press\/$/, '') + 'games/';

  /* ── the numbers (every one argued in the header) ─────────────────────── */
  const MAX_FILES = 12;
  const MAX_BYTES = 25 * 1024 * 1024;
  const ALPHA_T = 250;
  const ALPHA_EDGE = 512;
  const ASPECT_TOL = 0.05;
  const SHOT_ASPECTS = [16 / 9, 16 / 10];
  const K = 8;
  const PALETTE_SEED = 'knoll-press';
  const RANK_EPS = 1e-6;
  const TRAY = 12;
  const STAGE_W0 = 260;         // …and STAGE_AR: the fallback stage box — press.css's `.pt-stage` owns the real one
  const STAGE_AR = 1.25;
  const VIBE_IMAGES = 4;
  const VIBE_EDGE = 1024;
  const CAP = { logo: 1024, hero: 2048, keyart: 2048, screenshot: 1600, misc: 1600 };
  const WEBP_Q = 0.86;
  const ACCENT_MIN_W = 0.02;    // theme.js's ACCENT_MIN_W — a swatch under 2 % is not in the contest
  const GREY_C = 0.02;          // theme.js's GREY_C — under this a colour has no hue worth reading
  const PLATE_CELL = 320;       // the square each picture is drawn into for the palette read (see plateOf)
  const ROLES = ['logo', 'keyart', 'hero', 'screenshot', 'misc'];
  const PLATFORMS = ['pc', 'mac', 'linux', 'switch', 'ps5', 'xbox', 'ios', 'android', 'web'];
  const LINKS = [['steam', 'Steam'], ['itch', 'itch.io'], ['site', 'site'], ['press', 'press kit'], ['trailer', 'trailer']];

  /* ── the stores ───────────────────────────────────────────────────────── */
  const PS = window.PressStore;
  const words = PS.store('form', {
    title: '', slug: '', slugTouched: false, tagline: '', description: '',
    developer: '', publisher: '', releaseDate: '', platforms: [], links: {},
    rights: false, rightsBy: '', rightsAt: ''
  });
  const dials = PS.store('dials', {
    accent: null, preset: null, pairing: null, recipe: null, mood: null,
    stickers: true, chosen: 0, order: []
  });
  // a role the owner corrected, by file name, so re-dropping the same folder
  // does not undo the correction
  const roles = PS.store('roles', {});

  /* ── page state (never saved: it holds pictures) ──────────────────────── */
  const S = {
    mode: 'knocking',
    assets: [],          // {id, name, role, file, img, w, h, alpha, url}
    analysis: null,      // {palette, dark, stats, vibe, vibeCacheKey}
    read: null,          // the whole reading: rank, presets, recipes, pairings, merged, vector
    cards: [],
    schemas: null,
    run: 0,              // the reading's run token, so a stale pass cannot paint
    lay: 0,              // the composing token — two dials pressed a breath apart each start a
                         // compose, both await the sticker sheet, and without this the SLOWER
                         // one paints last and the page shows the dial nobody pressed second
    slug: null,          // ?slug= — the page being regenerated
    built: null
  };

  const $ = id => document.getElementById(id);
  const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
  const clear = n => { while (n.firstChild) n.removeChild(n.firstChild); return n; };
  const f2 = v => (Math.round(v * 100) / 100).toFixed(2);
  const f1 = v => (Math.round(v * 10) / 10).toFixed(1);
  const finite = v => (typeof v === 'number' && isFinite(v)) ? v : 0;

  function say(text, cls) {
    const n = $('pt-say');
    n.className = 'pt-say' + (cls ? ' ' + cls : '');
    n.textContent = text;
  }

  /* ══ 1 · THE DROP ═══════════════════════════════════════════════════════ */

  function wireDrop() {
    const zone = $('pt-drop'), input = $('pt-files');
    zone.addEventListener('click', () => input.click());
    zone.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); input.click(); } });
    input.addEventListener('change', () => { addFiles(input.files); input.value = ''; });
    ['dragenter', 'dragover'].forEach(t => zone.addEventListener(t, e => { e.preventDefault(); zone.classList.add('over'); }));
    ['dragleave', 'drop'].forEach(t => zone.addEventListener(t, e => { e.preventDefault(); zone.classList.remove('over'); }));
    zone.addEventListener('drop', e => { if (e.dataTransfer) addFiles(e.dataTransfer.files); });
    // a file let go anywhere else on the page must not navigate away from a
    // half-filled form — the browser's default for a dropped image is to open it
    window.addEventListener('dragover', e => e.preventDefault());
    window.addEventListener('drop', e => e.preventDefault());
  }

  function refuse(note) {
    const zone = $('pt-drop');
    zone.classList.remove('bad'); void zone.offsetWidth; zone.classList.add('bad');
    $('pt-drop-note').textContent = note;
  }

  async function addFiles(list) {
    const files = Array.prototype.slice.call(list || []);
    if (!files.length) return;
    const jsons = files.filter(f => /\.json$/i.test(f.name) || f.type === 'application/json');
    const pics = files.filter(f => jsons.indexOf(f) < 0);

    for (const j of jsons) {
      try { applyManifest(JSON.parse(await j.text())); $('pt-drop-note').textContent = j.name + ' read into the form.'; }
      catch (e) { refuse(j.name + ' is not JSON this page can read: ' + ((e && e.message) || e)); }
    }
    if (!pics.length) { if (jsons.length) { paintForm(); validateNow(); } return; }

    const bad = pics.filter(f => !/^image\/(png|jpeg|webp)$/.test(f.type));
    if (bad.length) { refuse(bad.length + ' file' + (bad.length === 1 ? '' : 's') + ' refused: PNG, JPG and WebP only (' + bad.map(f => f.name).join(', ') + ')'); }
    const ok = pics.filter(f => /^image\/(png|jpeg|webp)$/.test(f.type));
    if (!ok.length) return;

    if (S.assets.length + ok.length > MAX_FILES) { refuse('that would be ' + (S.assets.length + ok.length) + ' pictures; the limit is ' + MAX_FILES + ' (manifest.schema.json\'s own maxItems).'); return; }
    const bytes = S.assets.reduce((n, a) => n + a.file.size, 0) + ok.reduce((n, f) => n + f.size, 0);
    if (bytes > MAX_BYTES) { refuse('that would be ' + Math.round(bytes / 1048576) + ' MB; the limit is ' + Math.round(MAX_BYTES / 1048576) + ' MB.'); return; }

    say('reading ' + ok.length + ' picture' + (ok.length === 1 ? '' : 's') + '…');
    for (const f of ok) {
      try { S.assets.push(await decodeFile(f)); }
      catch (e) { refuse(f.name + ' could not be decoded: ' + ((e && e.message) || e)); }
    }
    classify();
    paintAssets();
    analyse();
  }

  /* One picture: decoded once, kept as an <img> because that is what
     Style.measure and the canvas both take, plus the one fact only a canvas
     can answer — whether the alpha channel is used. */
  function decodeFile(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const w = img.naturalWidth, h = img.naturalHeight;
        if (!w || !h) { URL.revokeObjectURL(url); reject(new Error('it decoded to nothing')); return; }
        resolve({ id: '', name: file.name, role: '', file: file, img: img, url: url, w: w, h: h, alpha: alphaOf(img, w, h) });
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('the browser would not decode it')); };
      img.src = url;
    });
  }

  /* Is the alpha channel USED? (ALPHA_T and ALPHA_EDGE, header.) */
  function alphaOf(img, w, h) {
    const k = Math.min(1, ALPHA_EDGE / Math.max(w, h));
    const cw = Math.max(1, Math.round(w * k)), ch = Math.max(1, Math.round(h * k));
    const c = document.createElement('canvas');
    c.width = cw; c.height = ch;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.clearRect(0, 0, cw, ch);
    ctx.drawImage(img, 0, 0, cw, ch);
    const d = ctx.getImageData(0, 0, cw, ch).data;
    for (let i = 3; i < d.length; i += 4) if (d[i] < ALPHA_T) return true;
    return false;
  }

  /* The plan's ladder, in the plan's order, and then one rung the plan left
     off (THE HERO THE SHAPE TEST EATS, below). A role the owner set by hand
     is never re-read; the rest are decided together, because "the largest
     landscape non-screenshot" is a fact about the set and not about a file. */
  function classify() {
    const kept = roles.get();
    const open = [];
    for (const a of S.assets) {
      const fixed = kept[a.name];
      if (fixed && ROLES.indexOf(fixed) >= 0) { a.role = fixed; continue; }
      if (a.alpha) { a.role = 'logo'; continue; }
      const ar = a.w / a.h;
      if (SHOT_ASPECTS.some(t => Math.abs(ar / t - 1) <= ASPECT_TOL)) { a.role = 'screenshot'; continue; }
      if (a.h > a.w) { a.role = 'keyart'; continue; }
      open.push(a);
    }
    open.sort((x, y) => (y.w * y.h) - (x.w * x.h));
    open.forEach((a, i) => { a.role = i === 0 && !S.assets.some(b => b !== a && b.role === 'hero') ? 'hero' : 'misc'; });

    /* THE HERO THE SHAPE TEST EATS, and why the ladder above cannot find it.
       A hero is exported at 16:9 — that is what a hero IS — so the aspect
       rule reads it as a screenshot and the plan's last rung, "the largest
       landscape non-screenshot", is left with nobody on it. Measured on the
       fixtures (2026-09-07, this file's own verifier): mosslight and neonrun
       ship a 1600 × 900 hero beside four 960 × 540 screenshots, and the
       ladder alone answered `logo + 5 screenshots` for both — no hero, so
       Recipes.choose scored nothing, fell back to its own id order, and
       offered a POSTER with no key art in it. Their own expected.json says
       `widescreen`.

       So: a hero is not a SHAPE, it is a JOB — the one big picture a page is
       built round — and when the ladder leaves that job empty the largest
       landscape picture takes it. Size is the signal shape cannot give: the
       fixtures' hero is 2.78× the area of a screenshot. Three guards, and
       each is the same sentence from a different side:

         · only when nothing is already a hero OR key art. A poster is built
           round key art and wants no hero (pixelfort keeps logo + key art +
           4 screenshots, unmoved by this block).
         · never a picture the owner set by hand — `kept` is their word.
         · and not at all once the owner has called something a screenshot:
           somebody who has told the table what a picture is has told it
           enough, and the reading does not then go looking for a hero to
           replace the one they just demoted.

       Ties go to the first picture dropped (Array#sort is stable), which is
       the honest answer for a folder of five plates one size: they are all
       the same picture to this rule, so the first of them is the big one. */
    const spoken = S.assets.some(a => kept[a.name] === 'screenshot');
    if (!spoken && !S.assets.some(a => a.role === 'hero' || a.role === 'keyart')) {
      const shots = S.assets.filter(a => a.role === 'screenshot' && !kept[a.name] && a.w >= a.h);
      shots.sort((x, y) => (y.w * y.h) - (x.w * x.h));
      if (shots.length) shots[0].role = 'hero';
    }
    renumber();
  }

  /* Asset ids: manifest.schema.json's ^[a-z0-9-]{1,40}$, off the file name,
     deduped by a numeric suffix. The id is what the built page's art file is
     named, so it is worth being readable. */
  function renumber() {
    const seen = Object.create(null);
    for (const a of S.assets) {
      let base = a.name.replace(/\.[a-z0-9]+$/i, '').toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
      if (!base) base = a.role || 'art';
      let id = base, n = 1;
      while (seen[id]) id = (base + '-' + (++n)).slice(0, 40);
      seen[id] = true;
      a.id = id;
    }
  }

  function paintAssets() {
    const card = $('pt-assets-card'), ul = clear($('pt-assets'));
    card.hidden = !S.assets.length;
    S.assets.forEach((a, i) => {
      const li = el('li', 'pt-asset');
      const img = new Image(); img.src = a.url; img.alt = '';
      li.appendChild(img);
      const idw = el('div', 'pt-asset-id');
      idw.appendChild(document.createTextNode(a.id));
      idw.appendChild(el('em', null, a.w + '×' + a.h + (a.alpha ? ' · alpha' : '') + ' · ' + Math.round(a.file.size / 1024) + ' KB'));
      li.appendChild(idw);
      const right = el('div', 'pt-asset-side');
      right.style.display = 'flex'; right.style.alignItems = 'center'; right.style.gap = '4px';
      const sel = el('select');
      ROLES.forEach(r => { const o = el('option', null, r); o.value = r; if (r === a.role) o.selected = true; sel.appendChild(o); });
      sel.addEventListener('change', () => {
        a.role = sel.value;
        roles.update(m => { m[a.name] = sel.value; });
        // "changing one re-runs the analysis" (plan §10 6.2 step 1)
        paintAssets(); analyse();
      });
      right.appendChild(sel);
      const x = el('button', 'pt-asset-x', '×');
      x.title = 'take this picture out';
      x.addEventListener('click', () => {
        URL.revokeObjectURL(a.url);
        S.assets.splice(i, 1);
        roles.update(m => { delete m[a.name]; });
        classify(); paintAssets(); analyse();
      });
      right.appendChild(x);
      li.appendChild(right);
      ul.appendChild(li);
    });
  }

  /* ══ 2 · THE WORDS ══════════════════════════════════════════════════════ */

  const FIELDS = [['f-title', 'title'], ['f-slug', 'slug'], ['f-tagline', 'tagline'],
                  ['f-description', 'description'], ['f-developer', 'developer'],
                  ['f-publisher', 'publisher'], ['f-release', 'releaseDate']];

  function slugify(t) {
    return String(t || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
  }

  /* ── THE WORDS ARE PART OF THE COMPOSITION ─────────────────────────────
     Found by driving the table rather than by reading it (perf/verify-press.js,
     2026-09-07): the reading runs the moment the first picture lands, and the
     three compositions are resolved THEN — against a manifest that has no
     title in it yet, because the owner has not typed one. `Recipes` drops a
     note whose text is empty and a sign with no chips (recipes.js's `note()`
     and `sign()` both return null), so those three cards carry pictures and
     stickers and nothing else. Typing the title afterwards changed the form,
     the draft and the validator — and not the layout. The page that came out
     of BUILD had 8 slots where the CLI generator's has 14: no title, no
     tagline, no description, no store links. The words were on the screen
     the whole time and never reached the paper.

     So a word the LAYOUT reads re-composes. LAYOUT_WORDS is exactly the list
     `Recipes.resolve` reads off the manifest (recipes.js line 895–898:
     titleText from title + tagline, description, releaseText from
     releaseDate, chips from links) and nothing else — slug, developer,
     publisher and platforms move no box on the page, and re-drawing three
     mockups for them would be work nobody asked for.

     RECOMPOSE_MS 350 — a debounce, because Preview.render is the most
     expensive thing on this page and a keystroke is not a decision. 350 is
     longer than the ~200 ms gap between keystrokes at a brisk sixty words a
     minute, so it fires between WORDS rather than between letters, and short
     enough that the mockups have caught up before a hand reaches the button.
     What it is buying, measured by perf/verify-press.js with the sheet
     already extracted (the extraction cache is keyed on palette + style, so
     a changed word never misses it): compose() itself — three
     Recipes.resolve, the panel, the mock row and the dials — returns in 3–5
     ms; the three Preview.renders it STARTS are not awaited by it and are
     the part that costs, which is exactly why a keystroke must not fire
     three of them.

     And because "before a hand reaches the button" is a guess about a
     person, press() does not rely on it: it FLUSHES a pending compose and
     waits for it before it reads the card it is about to build. The debounce
     is for the owner's eyes; the flush is what makes the file right. */
  const LAYOUT_WORDS = ['title', 'tagline', 'description', 'releaseDate'];
  const RECOMPOSE_MS = 350;
  let recomposeTimer = 0;

  function recompose() {
    if (!S.cards.length) return;          // nothing composed yet: analyse() will
    if (recomposeTimer) clearTimeout(recomposeTimer);
    recomposeTimer = setTimeout(() => { recomposeTimer = 0; compose(S.run); }, RECOMPOSE_MS);
  }

  function flushCompose() {
    if (!recomposeTimer) return Promise.resolve();
    clearTimeout(recomposeTimer); recomposeTimer = 0;
    return compose(S.run);
  }

  function wireForm() {
    for (const [id, key] of FIELDS) {
      const n = $(id);
      n.addEventListener('input', () => {
        words.update(w => {
          w[key] = n.value;
          if (key === 'slug') w.slugTouched = true;
          if (key === 'title' && !w.slugTouched) w.slug = slugify(n.value);
        });
        if (key === 'title' && !words.get().slugTouched) $('f-slug').value = words.get().slug;
        if (key === 'slug' || key === 'title') paintSlugWhere();
        if (key === 'description') $('f-description-n').textContent = String(n.value.length);
        validateNow();
        if (LAYOUT_WORDS.indexOf(key) >= 0) recompose();
      });
    }

    const chips = clear($('f-platforms'));
    PLATFORMS.forEach(p => {
      const b = el('button', 'pt-chip', p); b.type = 'button'; b.dataset.p = p;
      b.addEventListener('click', () => {
        words.update(w => {
          const at = w.platforms.indexOf(p);
          if (at < 0) w.platforms.push(p); else w.platforms.splice(at, 1);
        });
        paintChips(); validateNow();
      });
      chips.appendChild(b);
    });

    const links = clear($('f-links'));
    LINKS.forEach(([key, label]) => {
      links.appendChild(el('label', null, label));
      const i = el('input'); i.type = 'text'; i.id = 'f-link-' + key; i.placeholder = 'https://…'; i.maxLength = 300;
      i.addEventListener('input', () => {
        words.update(w => { if (i.value.trim()) w.links[key] = i.value.trim(); else delete w.links[key]; });
        validateNow();
        recompose();          // the sign is a slot, and its chips are these
      });
      links.appendChild(i);
    });

    $('f-rights').addEventListener('change', e => {
      words.update(w => {
        w.rights = e.target.checked;
        // the moment it was ticked, stamped once and kept (store.js seeds and
        // saves at once for exactly this reason)
        w.rightsAt = e.target.checked ? new Date().toISOString() : '';
      });
      validateNow();
    });
    $('f-rights-by').addEventListener('input', e => { words.update(w => { w.rightsBy = e.target.value; }); validateNow(); });
  }

  function paintChips() {
    const on = words.get().platforms;
    for (const b of $('f-platforms').children) b.classList.toggle('on', on.indexOf(b.dataset.p) >= 0);
  }

  function paintSlugWhere() {
    const s = words.get().slug;
    $('f-slug-where').textContent = s ? GAMES + s + '/' : GAMES + '…/';
  }

  function paintForm() {
    const w = words.get();
    $('f-title').value = w.title; $('f-slug').value = w.slug; $('f-tagline').value = w.tagline;
    $('f-description').value = w.description; $('f-developer').value = w.developer;
    $('f-publisher').value = w.publisher; $('f-release').value = w.releaseDate;
    $('f-description-n').textContent = String((w.description || '').length);
    $('f-rights').checked = !!w.rights; $('f-rights-by').value = w.rightsBy || '';
    for (const [key] of LINKS) { const n = $('f-link-' + key); if (n) n.value = w.links[key] || ''; }
    paintChips(); paintSlugWhere();
  }

  /* A manifest.json that was dropped, or a game.json being regenerated. */
  function applyManifest(m) {
    if (!m || typeof m !== 'object') return;
    const src = m.manifest && typeof m.manifest === 'object' ? m.manifest : m;
    words.update(w => {
      if (src.title) { w.title = String(src.title); }
      if (src.slug) { w.slug = String(src.slug); w.slugTouched = true; }
      for (const k of ['tagline', 'description', 'developer', 'publisher', 'releaseDate']) if (src[k] != null) w[k] = String(src[k]);
      if (Array.isArray(src.platforms)) w.platforms = src.platforms.filter(p => PLATFORMS.indexOf(p) >= 0);
      if (src.links && typeof src.links === 'object') w.links = Object.assign({}, src.links);
      if (src.rights && src.rights.attested === true) { w.rights = true; w.rightsBy = String(src.rights.by || ''); w.rightsAt = String(src.rights.at || new Date().toISOString()); }
    });
    // the roles a manifest declares are the owner's own corrections
    if (Array.isArray(src.assets)) {
      roles.update(map => {
        for (const a of src.assets) {
          if (!a || !a.role || ROLES.indexOf(a.role) < 0) continue;
          const base = String(a.file || '').split('/').pop();
          if (base) map[base] = a.role;
          if (a.id) map[a.id] = a.role;
        }
      });
    }
    paintForm();
    // a manifest.json dropped after the art carries the very words the notes
    // and the sign are made of, so it re-composes for the same reason typing
    // one does (THE WORDS ARE PART OF THE COMPOSITION)
    recompose();
  }

  /* The manifest as it stands, for the validator, the recipes and the door.
     `assets` carries what is known before the pictures are re-encoded; the
     three fields the schema wants and the browser cannot know yet — file,
     sha256 — are filled at build time and are written here as placeholders
     so the LIVE validation reads as the owner's own faults and not as
     twelve complaints about hashes nobody has typed. */
  function manifestOf(encoded) {
    const w = words.get();
    const m = { slug: w.slug, title: w.title, assets: [], rights: { attested: !!w.rights, by: w.rightsBy || '', at: w.rightsAt || new Date().toISOString() }, source: S.mode === 'publisher' ? 'intake' : 'manual' };
    for (const k of ['tagline', 'description', 'developer', 'publisher', 'releaseDate']) if (w[k]) m[k] = w[k];
    if (w.platforms.length) m.platforms = w.platforms.slice();
    const links = {};
    for (const [key] of LINKS) if (w.links[key]) links[key] = w.links[key];
    if (Object.keys(links).length) m.links = links;
    m.assets = S.assets.map(a => {
      const e = encoded && encoded[a.id];
      return {
        id: a.id, role: a.role,
        file: 'art/' + a.id + '.' + (e ? e.ext : 'webp'),
        w: e ? e.w : a.w, h: e ? e.h : a.h,
        alpha: e ? e.alpha : a.alpha,
        sha256: e ? e.sha256 : '0'.repeat(64)
      };
    });
    return m;
  }

  /* Live validation against press/schemas/manifest.schema.json, shown by
     field (plan §10 6.2 step 2). The hash placeholder above is a legal
     sha256 by shape, so nothing here complains about it. */
  function validateNow() {
    const faults = clear($('pt-faults'));
    for (const n of document.querySelectorAll('.pt-f')) n.classList.remove('bad');
    for (const n of document.querySelectorAll('.pt-links input')) n.classList.remove('bad');
    /* An untouched table is not a table full of mistakes. Nothing is marked
       until there is something to mark: a picture has landed, or a word has
       been typed. (A build that succeeded clears the form and this puts the
       page back to that same quiet state rather than lighting up three
       complaints under a green "built" line.) */
    const w0 = words.get();
    const quiet = !S.assets.length && !w0.title && !w0.slug && !w0.tagline && !w0.description;
    let list = [];
    if (quiet) list = [];
    else if (S.schemas) list = window.Validate.check(manifestOf(null), 'manifest.schema.json', S.schemas);
    else if (!w0.title) list = [{ path: 'title', message: 'required: a page needs a name' }];
    for (const f of list) {
      const top = String(f.path).replace(/[.[].*$/, '');
      const box = document.querySelector('.pt-f[data-for="' + top + '"]');
      if (box) box.classList.add('bad');
      // Validate writes a plain-identifier key as `links.steam` and anything
      // else as `links["press kit"]`; both spellings point at one input here
      const m = /^links(?:\.|\[")([a-z0-9-]+)/i.exec(f.path);
      if (m) { const n = $('f-link-' + m[1]); if (n) n.classList.add('bad'); }
      const li = el('li');
      li.appendChild(el('b', null, f.path || 'the form'));
      li.appendChild(document.createTextNode(' — ' + f.message));
      faults.appendChild(li);
    }
    // `assets` complaints when nothing has been dropped are noise, not faults
    if (!S.assets.length) for (const li of Array.prototype.slice.call(faults.children)) if (/^assets/.test(li.firstChild.textContent)) faults.removeChild(li);
    paintButton(list);
    return list;
  }

  function paintButton(faults) {
    const b = $('pt-build');
    const ready = S.assets.length > 0 && S.analysis && S.cards.length > 0 && (faults || []).length === 0;
    /* `pressing` and not just `ready`: a build in flight awaits a flushed
       compose, and compose() ends in validateNow() → here. Without the flag
       the button would light up again in the middle of its own build and a
       second press could start beside the first. */
    b.disabled = !ready || pressing;
    b.textContent = S.mode === 'publisher' ? 'SEND TO KNOLL' : (S.built ? 'BUILD IT AGAIN' : 'BUILD THE PAGE');
  }

  /* ══ 3 · THE READING ════════════════════════════════════════════════════ */

  /* The plate the palette is read off: hero and key art, each drawn into its
     own PLATE_CELL square, contained and centred, on a TRANSPARENT ground.
     Two reasons for the cells. Equal cells mean a 4K hero and a 480-px key
     art count for the same, rather than the palette being decided by which
     file somebody exported bigger. And the empty margin costs nothing:
     Palette.sample skips every pixel under alpha 16 (its ALPHA_T), so the
     transparent ground is not a colour of the picture. */
  function plateOf(pics) {
    const n = pics.length;
    const c = document.createElement('canvas');
    c.width = PLATE_CELL * n; c.height = PLATE_CELL;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.clearRect(0, 0, c.width, c.height);
    pics.forEach((p, i) => {
      const k = Math.min(PLATE_CELL / p.w, PLATE_CELL / p.h);
      const w = p.w * k, h = p.h * k;
      ctx.drawImage(p.img, i * PLATE_CELL + (PLATE_CELL - w) / 2, (PLATE_CELL - h) / 2, w, h);
    });
    return ctx.getImageData(0, 0, c.width, c.height);
  }

  const byRole = r => S.assets.filter(a => a.role === r);

  async function analyse() {
    const run = ++S.run;
    if (!S.assets.length) { S.analysis = null; S.cards = []; paintAnalysis(); paintMocks(); paintTweak(); validateNow(); return; }

    $('pt-analysis-state').textContent = 'reading…';
    $('pt-analysis-state').className = 'pt-tag-note';
    say('reading the art…');

    // — the colours: hero + key art (plan §10 6.2 step 3), k = 8, a fixed seed
    const shots = byRole('screenshot'), logos = byRole('logo');
    const keyart = byRole('keyart'), heroes = byRole('hero');
    let source = heroes.concat(keyart);
    let sourceNote = 'hero and key art';
    if (!source.length) { source = shots.concat(byRole('misc')); sourceNote = 'the screenshots (no hero and no key art were dropped)'; }
    if (!source.length) { source = S.assets.slice(); sourceNote = 'the logo (it is the only picture here)'; }
    const quant = window.Palette.quantize(plateOf(source), K, { rng: window.Palette.rng(PALETTE_SEED) });
    const palette = window.Palette.describe(quant);

    // — the light/dark question, which Style must be told and cannot answer
    const first = window.Theme.derive({ palette: palette });

    // — the style: every statistic off the screenshots, colour off all of it
    const stats0 = window.Style.measure({
      screenshots: shots.map(a => a.img),
      keyart: keyart.concat(heroes).map(a => a.img),
      logos: logos.map(a => a.img)
    });
    // a game with no screenshots leaves a mean over an empty list; the schema
    // asks for numbers and a panel that prints NaN helps nobody
    const stats = {};
    for (const k of Object.keys(stats0)) stats[k] = (k === 'outline')
      ? { present: !!stats0.outline.present, weight: finite(stats0.outline.weight) }
      : finite(stats0[k]);

    const vector = window.Style.vector(stats, { dark: first.dark });
    const rank = window.Style.rank(vector);
    const pairings = window.Fonts.suggest({ style: rank[0] && rank[0].preset, dark: first.dark, saturation: stats.saturation });
    const manifest = manifestOf(null);
    const chosenRecipes = window.Recipes.choose({ assets: manifest.assets, preset: rank[0] && rank[0].preset, vibe: null });

    if (run !== S.run) return;
    S.analysis = { palette: palette, dark: first.dark, stats: stats, vibe: null, vibeCacheKey: '' };
    S.read = {
      rank: rank, vector: vector, pairings: pairings, recipes: chosenRecipes,
      mood: moodOf(first), source: sourceNote,
      merged: window.Vibe.merge({
        presets: rank, pixelSize: stats.pixelSize, fontPairing: pairings[0],
        harmony: moodOf(first), recipe: chosenRecipes[0]
      }, null),
      vibeSaid: null
    };
    await compose(run);
    if (run !== S.run) return;

    // — the door, once (plan §10 6.2 step 3). With no key it answers
    //   {vibe:null}; the heuristics stand and the panel says so plainly.
    askVibe(run, manifest, stats);
  }

  /* theme.js does not hand back its mood as a field — it writes the decision
     into its own reasons, which is the one place the choice is recorded, so
     that is where it is read from (Theme.explain is the public door to it). */
  function moodOf(theme) {
    const line = (window.Theme.explain(theme) || []).filter(s => s.indexOf('mood: ') === 0)[0];
    return line ? line.slice(6).split(' ')[0] : undefined;
  }

  async function askVibe(run, manifest, stats) {
    const note = $('pt-analysis-state');
    let images = [];
    try { images = await vibeImages(); } catch (e) { images = []; }
    if (run !== S.run) return;
    if (!images.length) { S.read.vibeSaid = 'no pictures small enough to send'; paintAnalysis(); return; }
    let key = '';
    try { key = await window.Vibe.cacheKey(images, stats); } catch (e) { key = ''; }
    const answer = await window.Vibe.request(VIBE, { images: images, stats: stats, manifest: manifest });
    if (run !== S.run) return;
    S.analysis.vibe = answer.vibe || null;
    if (key) S.analysis.vibeCacheKey = key;
    S.read.vibeSaid = answer.vibe ? (answer.cached ? 'judged by the model (from the cache)' : 'judged by the model') : (answer.error || 'the door had no judgement');
    S.read.merged = window.Vibe.merge({
      presets: S.read.rank, pixelSize: stats.pixelSize, fontPairing: S.read.pairings[0],
      harmony: S.read.mood, recipe: S.read.recipes[0]
    }, S.analysis.vibe);
    if (S.analysis.vibe) {
      S.read.recipes = window.Recipes.choose({ assets: manifest.assets, preset: S.read.rank[0] && S.read.rank[0].preset, vibe: S.analysis.vibe });
      await compose(run);
    } else {
      paintAnalysis();
    }
  }

  /* Up to four pictures for the door, each at a long edge of VIBE_EDGE:
     the logo, the key art or hero, then the first screenshots. */
  function vibeImages() {
    const want = [].concat(byRole('logo').slice(0, 1), byRole('keyart').slice(0, 1), byRole('hero').slice(0, 1), byRole('screenshot')).slice(0, VIBE_IMAGES);
    return Promise.all(want.map(a => shrink(a, VIBE_EDGE, 'image/webp', WEBP_Q).then(r => r.b64)));
  }

  /* ══ 4 · THE PANEL ══════════════════════════════════════════════════════ */

  function paintAnalysis() {
    const panel = clear($('pt-analysis'));
    const note = $('pt-analysis-state');
    if (!S.analysis) {
      panel.appendChild(el('p', 'pt-empty', 'Nothing has been dropped yet. The reading starts the moment the first image lands.'));
      note.textContent = 'waiting for a picture'; note.className = 'pt-tag-note';
      return;
    }
    const A = S.analysis, R = S.read, theme = S.cards[0] ? S.cards[0].theme : null;

    note.textContent = A.vibe ? 'read, and judged' : 'read';
    note.className = 'pt-tag-note on';

    /* Two columns: WHAT was measured on the left, WHY it came out that way on
       the right. Stacked, the reasons alone are twelve to twenty lines and
       push the three compositions off a 900-px screen — and the compositions
       are the thing this page exists to show. Side by side the whole panel is
       about 300 px and everything below it is still on screen at 1280 × 900.
       (Under 1180 the page has already stacked its own two columns and this
       one follows it: one column, scrolled.) */
    const said = el('div', 'pt-an-b');
    const box = el('div', 'pt-an-a');
    panel.appendChild(box); panel.appendChild(said);

    // the swatches
    box.appendChild(el('p', 'pt-sub', 'the palette · k = ' + K + ' off ' + R.source));
    const strip = el('div', 'pt-strip');
    A.palette.forEach(e => {
      const s = el('div', 'pt-sw');
      const i = el('i'); i.style.background = e.hex; s.appendChild(i);
      s.appendChild(el('span', null, e.hex));
      s.appendChild(el('b', null, Math.round(e.weight * 100) + '% · L' + f2(e.L)));
      strip.appendChild(s);
    });
    box.appendChild(strip);

    // the statistics
    box.appendChild(el('p', 'pt-sub', 'the measurements'));
    const grid = el('div', 'pt-stats');
    const stat = (name, value, tail) => {
      const d = el('div', 'pt-stat');
      d.appendChild(el('b', null, name));
      const v = el('span', null, value);
      if (tail) v.appendChild(el('em', null, ' ' + tail));
      d.appendChild(v);
      grid.appendChild(d);
    };
    const st = A.stats;
    stat('pixel grid', st.pixelSize ? String(st.pixelSize) : 'none', st.pixelSize ? 'px' : '');
    stat('outline', st.outline.present ? f2(st.outline.weight) : 'none', st.outline.present ? 'weight' : '');
    stat('colours', String(st.paletteCount), 'a plate');
    stat('saturation', f2(st.saturation), 'mean C');
    stat('contrast', f2(st.contrast), '');
    stat('texture', f2(st.hfEnergy), 'hf');
    stat('edges', f2(st.edgeDensity), '');
    box.appendChild(grid);

    // the tokens
    if (theme) {
      box.appendChild(el('p', 'pt-sub', 'the tokens this palette makes'));
      const tok = el('div', 'pt-tok');
      const t = theme.tokens;
      ['--paper', '--card', '--ink', '--mute', '--line', '--pink', '--blue', '--green', '--amber', '--sk-primary', '--sk-secondary', '--sk-ink'].forEach(k => {
        if (!t[k]) return;
        const s = el('span');
        const i = el('i'); i.style.background = t[k]; s.appendChild(i);
        s.appendChild(document.createTextNode(k.replace(/^--/, '') + ' ' + t[k]));
        tok.appendChild(s);
      });
      box.appendChild(tok);
    }

    // the reasons
    said.appendChild(el('p', 'pt-sub', 'why'));
    const why = el('ul', 'pt-why');
    const line = (text, cls) => { const li = el('li', cls || null, text); why.appendChild(li); };

    for (const s of styleReasons()) line(s);
    if (theme) for (const s of window.Theme.explain(theme)) line(s);
    for (const s of (R.merged.reasons || [])) line(s);

    if (A.vibe) {
      line(R.vibeSaid + ': ' + [A.vibe.artStyle, A.vibe.mood, (A.vibe.motifs || []).join('/')].filter(Boolean).join(', ') + ' at confidence ' + A.vibe.confidence, 'pt-why-model');
    } else {
      line('no judgement from the model — ' + (R.vibeSaid || 'the door has not been asked yet') + '. Everything above is measured, and it stands on its own.', 'pt-why-off');
    }
    said.appendChild(why);
  }

  /* Style's own sentences. Theme writes its reasons itself (Theme.explain);
     Style answers numbers, so the sentences about them are written here —
     the plan's two examples are "dark: mean L 0.31" (Theme's) and "pixel:
     native size 4 from two screenshots" (this one). */
  function styleReasons() {
    const st = S.analysis.stats, R = S.read, n = byRole('screenshot').length;
    const out = [];
    const plural = n === 1 ? '1 screenshot' : n + ' screenshots';
    out.push(st.pixelSize
      ? 'pixel: native size ' + st.pixelSize + ' from ' + plural
      : 'pixel: no grid in ' + plural + ' — the art is not on one');
    out.push(st.outline.present
      ? 'outline: present, weight ' + f2(st.outline.weight) + ' (the median run of ink)'
      : 'outline: none found — nothing is drawn with a line round it');
    out.push('colour: ' + st.paletteCount + ' colours a plate, mean chroma ' + f2(st.saturation) + ', contrast ' + f2(st.contrast));
    out.push('surface: texture ' + f2(st.hfEnergy) + ', edges ' + f2(st.edgeDensity));
    out.push('preset: ' + R.rank.map(r => r.preset + ' ' + f1(r.score)).join(', then ') + ' — nearest first over Appendix B’s eleven numbers');
    out.push('recipe: ' + R.recipes.join(', then ') + ' — ranked by the shapes that arrived');
    return out;
  }

  /* ══ 5 · THE THREE COMPOSITIONS ═════════════════════════════════════════ */

  /* The palette handed to Theme for a chosen accent — see HOW THE ACCENT
     PICKER WORKS. Only `hex` and `weight` matter: Theme.normalise recomputes
     L, C and h off the hex itself. */
  function paletteFor(accent) {
    const pal = S.analysis.palette;
    if (!accent) return pal;
    const pick = pal.filter(e => e.hex === accent)[0];
    if (!pick) return pal;
    const to = Math.max(GREY_C, pick.C - 0.005);   // just under the chosen swatch, and never below "has a hue at all"
    return pal.map(e => (e.hex !== pick.hex && e.C > to)
      ? { hex: window.Palette.fromOklch(e.L, to, e.h), weight: e.weight }
      : { hex: e.hex, weight: e.weight });
  }

  const flatten = pal => pal.map((e, i) => ({ hex: e.hex, weight: 1 - i * RANK_EPS }));

  function accentCandidates() {
    const pal = S.analysis.palette;
    const cands = pal.filter(e => e.weight >= ACCENT_MIN_W && e.C >= GREY_C);
    return cands.length ? cands : pal.filter(e => e.C >= GREY_C);
  }

  /* One sticker sheet extraction per (palette, style), memoised: the sheet is
     224 KB and Recipes wants the measured boxes (CONTRACTS §13) while Preview
     wants the strings. */
  const kitCache = Object.create(null);
  function stickersFor(theme, style) {
    const pal = {
      skPrimary: theme.tokens['--sk-primary'], skSecondary: theme.tokens['--sk-secondary'],
      skInk: theme.tokens['--sk-ink'], skPaper: theme.tokens['--sk-paper'],
      skHighlight: theme.tokens['--sk-highlight'], skShadow: theme.tokens['--sk-shadow']
    };
    const key = JSON.stringify(pal) + '|' + JSON.stringify(style);
    if (!kitCache[key]) {
      kitCache[key] = window.Kits && window.Kits.extractOnly
        ? window.Kits.extractOnly('../features/stickers-core.dc.html', pal, style).catch(() => null)
        : Promise.resolve(null);
    }
    return kitCache[key];
  }

  /* THE STICKER TOGGLE, and the one thing it cannot do. Turning the core
     sheet off takes the LOOSE stickers out of the composition — the burst,
     the tape, the sparkles, the wishlist tag — by dropping their slots and
     renumbering the pile. It does NOT take out a sticker carrying an `image`,
     because those are the FRAMES the screenshots are mounted in (CONTRACTS
     §13: a sticker slot with `image: 'shot-1'`), and dropping the frame drops
     the photograph with it. So "no stickers" means "no decoration", which is
     what somebody reaching for that switch wants, and the fine print under it
     says so rather than leaving them to notice.

     `open` and `openNarrow` are deliberately NOT recomputed. They were
     measured round the whole composition, and leaving them is what keeps the
     two readings of a page comparable at a glance: the same rectangle, one
     with its stickers and one without. It also matches what a person would
     do on the bench — take a sticker off and the page does not re-frame
     itself round the hole. */
  function bare(layout, keep) {
    if (keep) return layout;
    const slots = layout.slots.filter(s => s.kind !== 'sticker' || s.image);
    // CONTRACTS §13: z is 0…n−1, one per slot, and the array is already in it
    slots.forEach((s, i) => { s.z = i; });
    return Object.assign({}, layout, { slots: slots });
  }

  /* The three cards. Ambiguity is defined in the header; the fall-through is
     "then just show the next recipe", so there are always three. */
  async function compose(run) {
    const lay = ++S.lay;
    const stale = () => run !== S.run || lay !== S.lay;
    const A = S.analysis, R = S.read, D = dials.get();

    const preset = D.preset && R.rank.some(r => r.preset === D.preset) ? D.preset : R.merged.preset;
    const pairing = D.pairing && R.pairings.indexOf(D.pairing) >= 0 ? D.pairing : (R.merged.fontPairing || R.pairings[0]);
    /* The mood is theme.js's own unless somebody has overruled it — the
       shuffle, or a confident model through Vibe.merge. Passing it back what
       it just worked out would be true but useless: derive() answers "mood:
       loud (given)" for a given mood and "mood: loud (saturation 0.08,
       accent C 0.26)" when it decides, and the panel wants the arithmetic. */
    const mood = D.mood || (R.merged.harmony && S.analysis.vibe ? R.merged.harmony : null);
    const style = window.Style.forPreset(preset, R.vector);
    const pal = paletteFor(D.accent);

    const base = { saturation: A.stats.saturation, paletteSize: style.paletteSize, fonts: pairing };
    if (mood) base.mood = mood;
    const main = window.Theme.derive(Object.assign({ palette: pal }, base));
    const twin = window.Theme.derive(Object.assign({ palette: flatten(pal) }, base));
    const ambiguous = main.dark !== twin.dark;

    // the recipe order: the owner's pick first if they made one
    let order = R.recipes.slice();
    if (D.recipe && order.indexOf(D.recipe) > 0) order = [D.recipe].concat(order.filter(r => r !== D.recipe));

    const plan = ambiguous
      ? [{ recipe: order[0], theme: main, label: 'read by pixel' },
         { recipe: order[0], theme: twin, label: 'read by colour' },
         { recipe: order[1], theme: main, label: 'the other shape' }]
      : [{ recipe: order[0], theme: main, label: 'the first reading' },
         { recipe: order[1], theme: main, label: 'the other shape' },
         { recipe: order[2], theme: main, label: 'the third shape' }];

    const manifest = manifestOf(null);
    const cards = [];
    for (const p of plan) {
      const stickers = await stickersFor(p.theme, style);
      if (stale()) return;
      const layout = bare(window.Recipes.resolve(p.recipe, {
        manifest: manifest, assets: manifest.assets, theme: p.theme, style: style,
        stickers: stickers, vibe: A.vibe
      }), D.stickers);
      cards.push({
        recipe: p.recipe, theme: p.theme, style: style, layout: layout,
        label: p.label, dark: p.theme.dark, ambiguous: ambiguous, warnings: []
      });
    }
    S.cards = cards;
    S.read.ambiguous = ambiguous;
    S.read.preset = preset; S.read.pairing = pairing; S.read.mood = mood || moodOf(main);
    if (dials.get().chosen >= cards.length) dials.update(d => { d.chosen = 0; });

    paintAnalysis();
    paintMocks();
    paintTweak();
    validateNow();
    say(ambiguous
      ? 'read. The palette does not say whether this is a light page or a dark one, so both are on the table.'
      : 'read. Three compositions, pick one.');
    for (let i = 0; i < cards.length; i++) drawCard(i, lay);
  }

  function paintMocks() {
    const box = clear($('pt-mocks'));
    $('pt-shuffle').disabled = !S.cards.length;
    if (!S.cards.length) { box.appendChild(el('p', 'pt-empty', 'The three compositions arrive with the reading.')); return; }
    const chosen = dials.get().chosen | 0;
    S.cards.forEach((c, i) => {
      const card = el('div', 'pt-mock' + (i === chosen ? ' on' : ''));
      /* markChosen and not paintMocks: rebuilding the row would throw away
         three rendered previews to move one outline, and Preview.render is
         the most expensive thing on the page. */
      card.addEventListener('click', () => { dials.update(d => { d.chosen = i; }); markChosen(); });
      const bar = el('div', 'pt-mock-bar');
      bar.appendChild(el('b', null, c.recipe));
      bar.appendChild(el('span', null, (c.dark ? 'DARK' : 'LIGHT') + ' · ' + c.label));
      card.appendChild(bar);
      const stage = el('div', 'pt-stage');
      stage.id = 'pt-stage-' + i;
      card.appendChild(stage);
      const foot = el('div', 'pt-mock-foot');
      const r = el('input'); r.type = 'radio'; r.name = 'pt-pick'; r.checked = i === chosen;
      foot.appendChild(r);
      foot.appendChild(document.createTextNode(c.layout.slots.length + ' pieces'));
      if (c.warnings.length) foot.appendChild(el('em', null, ' · ' + c.warnings.length + ' warning' + (c.warnings.length === 1 ? '' : 's')));
      card.appendChild(foot);
      box.appendChild(card);
    });
  }

  /* Which card is chosen, without touching what is drawn in them. */
  function markChosen() {
    const chosen = dials.get().chosen | 0;
    const cards = document.querySelectorAll('#pt-mocks .pt-mock');
    for (let i = 0; i < cards.length; i++) {
      cards[i].classList.toggle('on', i === chosen);
      const r = cards[i].querySelector('input[type=radio]');
      if (r) r.checked = i === chosen;
    }
  }

  /* One mockup. Preview.render is handed the whole spec and is safe to call
     again on the same container (the contract), so re-rendering one card
     touches nothing about the other two. */
  async function drawCard(i, lay) {
    const c = S.cards[i];
    const stage = $('pt-stage-' + i);
    if (!c || !stage) return;
    if (!window.Preview || typeof window.Preview.render !== 'function') {
      clear(stage).appendChild(el('p', 'pt-empty', 'preview.js is not on this page.'));
      return;
    }
    const stickers = dials.get().stickers
      ? await (window.Preview.trayFor ? window.Preview.trayFor(c.theme, Object.assign({}, c.style, { motifs: S.read.merged.motifs || [] }), TRAY) : Promise.resolve([]))
      : [];
    if (lay != null && lay !== S.lay) return;   // a newer compose owns the stages now
    /* THE MOCKUP IS FITTED TO THE STAGE, ON BOTH AXES. A composition wears
       its own aspect (CONTRACTS §13): the poster's is portrait, the
       scrapbook's is nearly square, and a scale taken off the WIDTH alone
       draws either of them straight through the bottom of the stage, where
       press.css's `overflow:hidden` cuts it. That is what the three cards
       did on 2026-09-07, when recipes.js stopped padding every composition
       out to the bench's 2.302 : 1 and this line had not been told. min() of
       the two fits is the largest scale at which the WHOLE composition is
       inside the box, whatever its shape; press.css centres what comes out
       on a sheet of the game's own paper, so nothing is cropped and a
       portrait card and a landscape card read side by side.
       The fallback pair is the bench's own WIDE rectangle (lab.js, 3200 ×
       1390) for a layout that carries no usable `open` — preview.js frames
       such a layout on the slots' bounding box and says so in a warning; the
       scale here only has to be sane, not right.
       The box is read off getBoundingClientRect and FLOORED. clientWidth and
       clientHeight are integers and they round up — a stage 288.8 px tall
       reports 289 — and preview.js draws the paper at Math.round(open.h × S),
       so a fit to 289 comes back as a 289-px mockup overhanging its own
       288.8-px stage by a fifth of a pixel, clipped at the bottom again. The
       rect is fractional and the floor is what makes "inside the box" true
       in whole pixels. Measured at 1600 × 1000, where the stage is
       361 × 288.8. */
    const rect = stage.getBoundingClientRect();    // fractional; clientWidth/Height round (above)
    const bw = Math.floor(rect.width || stage.clientWidth || STAGE_W0);
    const bh = Math.floor(rect.height || stage.clientHeight || STAGE_W0 / STAGE_AR);
    const open = c.layout.open || {};
    const ow = +open.w > 0 ? +open.w : 3200, oh = +open.h > 0 ? +open.h : 1390;
    const spec = {
      manifest: manifestOf(null),
      assets: S.assets.map(a => ({ id: a.id, role: a.role, url: a.url, w: a.w, h: a.h })),
      theme: c.theme, style: c.style, layout: c.layout,
      stickers: stickers || [], fonts: c.theme.fonts,
      scale: Math.min(bw / ow, bh / oh)
    };
    try {
      const out = await window.Preview.render(stage, spec);
      c.warnings = (out && out.warnings) || [];
    } catch (e) {
      clear(stage).appendChild(el('p', 'pt-empty', 'this preview did not draw: ' + ((e && e.message) || e)));
      c.warnings = ['render: ' + ((e && e.message) || e)];
    }
  }

  /* The shuffle (plan §10 6.4): the secondary accents' harmony and the
     recipe. Theme fills --blue/--green/--amber from HARMONY[mood] — analogous
     for calm, complementary for loud — so flipping the mood is exactly
     "re-roll the harmony", and it is the one dial theme.js takes for it. */
  function shuffle() {
    if (!S.cards.length) return;
    dials.update(d => {
      d.mood = (S.read.mood === 'loud') ? 'calm' : 'loud';
      const order = S.read.recipes;
      const at = order.indexOf(S.cards[0].recipe);
      d.recipe = order[(at + 1) % order.length];
    });
    compose(S.run);
  }

  /* ══ 6 · THE DIALS ══════════════════════════════════════════════════════ */

  function paintTweak() {
    const box = clear($('pt-tweak'));
    if (!S.cards.length) { box.appendChild(el('p', 'pt-empty', 'The dials arrive with the reading.')); return; }
    const D = dials.get(), R = S.read;
    const owner = S.mode !== 'publisher';

    const row = (label, node) => {
      const r = el('div', 'pt-row');
      r.appendChild(el('span', 'pt-l', label));
      r.appendChild(node);
      box.appendChild(r);
    };

    // accent — the extracted swatches, and nothing else
    const acc = el('div', 'pt-accents');
    const cands = accentCandidates();
    const now = D.accent || (cands[0] && cands[0].hex);
    cands.forEach(e => {
      const b = el('button', 'pt-accent' + (e.hex === D.accent ? ' on' : ''));
      b.type = 'button'; b.style.background = e.hex;
      b.title = e.hex + ' · ' + Math.round(e.weight * 100) + ' % of the pixels · C ' + f2(e.C);
      b.addEventListener('click', () => { dials.update(d => { d.accent = (d.accent === e.hex) ? null : e.hex; }); compose(S.run); });
      acc.appendChild(b);
    });
    const auto = el('button', 'pt-pick' + (D.accent ? '' : ' on'), 'as read');
    auto.type = 'button';
    auto.addEventListener('click', () => { dials.update(d => { d.accent = null; }); compose(S.run); });
    acc.appendChild(auto);
    row('accent', acc);

    // preset — the top three, the tray re-renders on change
    const pre = el('div', 'pt-picks');
    R.rank.forEach(r => {
      const b = el('button', 'pt-pick' + (r.preset === R.preset ? ' on' : ''));
      b.type = 'button';
      b.appendChild(document.createTextNode(r.preset));
      b.appendChild(el('small', null, 'distance ' + f1(r.score)));
      b.addEventListener('click', () => { dials.update(d => { d.preset = r.preset; }); compose(S.run); });
      pre.appendChild(b);
    });
    row('preset', pre);

    // hero — which wide picture the widescreen composition is built round
    const heroSel = el('select');
    const wide = S.assets.filter(a => a.w >= a.h);
    const none = el('option', null, wide.length ? '(none — the poster is built on the key art)' : '(no landscape picture was dropped)');
    none.value = ''; heroSel.appendChild(none);
    wide.forEach(a => { const o = el('option', null, a.id + ' · ' + a.w + '×' + a.h); o.value = a.id; if (a.role === 'hero') o.selected = true; heroSel.appendChild(o); });
    heroSel.addEventListener('change', () => {
      for (const a of S.assets) if (a.role === 'hero') { a.role = 'misc'; roles.update(m => { m[a.name] = 'misc'; }); }
      const pick = S.assets.filter(a => a.id === heroSel.value)[0];
      if (pick) { pick.role = 'hero'; roles.update(m => { m[pick.name] = 'hero'; }); }
      paintAssets(); analyse();
    });
    row('hero', heroSel);

    if (!owner) {
      box.appendChild(el('p', 'pt-fine', 'Publisher mode keeps three dials. The font pairing, the order of the screenshots and the sticker sets are decisions about how knoll.space looks, and they stay with the owner (plan §12 1).'));
      return;
    }

    // font pairing — the three Fonts.suggest gave
    const fp = el('div', 'pt-picks');
    R.pairings.forEach(id => {
      const b = el('button', 'pt-pick' + (id === R.pairing ? ' on' : ''));
      b.type = 'button';
      b.appendChild(document.createTextNode(id));
      const p = window.Fonts.PAIRINGS[id];
      b.appendChild(el('small', null, p ? p.display + ' / ' + p.body : ''));
      b.addEventListener('click', () => { dials.update(d => { d.pairing = id; }); compose(S.run); });
      fp.appendChild(b);
    });
    row('type', fp);

    // the screenshots, in the order they will be placed — drag to reorder
    const shots = byRole('screenshot');
    if (shots.length > 1) {
      const ul = el('ul', 'pt-shots');
      shots.forEach(a => {
        const li = el('li', 'pt-shot');
        li.draggable = true; li.dataset.id = a.id;
        const im = new Image(); im.src = a.url; im.alt = '';
        li.appendChild(im);
        li.appendChild(document.createTextNode(a.id));
        li.addEventListener('dragstart', e => { e.dataTransfer.setData('text/plain', a.id); li.classList.add('pt-dragging'); });
        li.addEventListener('dragend', () => li.classList.remove('pt-dragging'));
        li.addEventListener('dragover', e => { e.preventDefault(); li.classList.add('pt-drag-over'); });
        li.addEventListener('dragleave', () => li.classList.remove('pt-drag-over'));
        li.addEventListener('drop', e => {
          e.preventDefault(); li.classList.remove('pt-drag-over');
          moveShot(e.dataTransfer.getData('text/plain'), a.id);
        });
        ul.appendChild(li);
      });
      row('shots', ul);
      box.appendChild(el('p', 'pt-fine', 'Drag one onto another to put it there. The first is the one the composition places first.'));
    }

    // the sticker sets. One sheet exists (stickers-core); the plan's "mood
    // sheets" are Phase 10, so the toggle names the one there is and says so.
    const sets = el('div', 'pt-picks');
    const sb = el('button', 'pt-pick' + (D.stickers ? ' on' : ''));
    sb.type = 'button';
    sb.appendChild(document.createTextNode('core'));
    sb.appendChild(el('small', null, '40 parts'));
    sb.addEventListener('click', () => { dials.update(d => { d.stickers = !d.stickers; }); compose(S.run); });
    sets.appendChild(sb);
    const soon = el('button', 'pt-pick', 'mood sheets');
    soon.type = 'button'; soon.disabled = true; soon.style.opacity = '.45'; soon.style.cursor = 'not-allowed';
    soon.appendChild(el('small', null, 'not built yet'));
    sets.appendChild(soon);
    row('stickers', sets);
    box.appendChild(el('p', 'pt-fine', D.stickers
      ? 'The forty parts of the core sheet, drawn in this page’s own --sk-* roles.'
      : 'The loose stickers are off. The frames the screenshots are mounted in stay: they hold the photographs, and taking the frame away takes the picture with it.'));
  }

  /* Move one screenshot in front of another. The order lives in S.assets
     itself, because that is the list the manifest is written from and
     Recipes places the screenshots in the manifest's own order. */
  function moveShot(fromId, toId) {
    if (!fromId || fromId === toId) return;
    const a = S.assets.filter(x => x.id === fromId)[0];
    if (!a) return;
    S.assets.splice(S.assets.indexOf(a), 1);
    const at = S.assets.findIndex(x => x.id === toId);
    S.assets.splice(at < 0 ? S.assets.length : at, 0, a);
    dials.update(d => { d.order = S.assets.map(x => x.id); });
    paintAssets(); paintTweak(); compose(S.run);
  }

  /* ══ 7 · THE PICTURES, RE-ENCODED ═══════════════════════════════════════ */

  /* One picture at a long edge of `edge`, as bytes and as base64. WebP when
     the browser will write it (every browser that ships a canvas today will;
     the fallback is PNG and build-game accepts both — it refuses only JPEG,
     because a JPEG at the door is a picture that was never re-encoded). A
     measured pixel grid turns smoothing off: resampling a 4-px grid with
     bilinear filtering is how a pixel game stops being one. */
  function shrink(a, edge, mime, q) {
    const k = Math.min(1, edge / Math.max(a.w, a.h));
    const w = Math.max(1, Math.round(a.w * k)), h = Math.max(1, Math.round(a.h * k));
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d');
    ctx.imageSmoothingEnabled = !(S.analysis && S.analysis.stats.pixelSize > 0);
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(a.img, 0, 0, w, h);
    return new Promise(resolve => {
      c.toBlob(async blob => {
        const buf = await blob.arrayBuffer();
        resolve({ w: w, h: h, bytes: buf, b64: base64(buf), mime: blob.type, ext: blob.type === 'image/webp' ? 'webp' : 'png' });
      }, mime, q);
    });
  }

  function base64(buf) {
    const b = new Uint8Array(buf);
    let s = '';
    for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000));
    return btoa(s);
  }

  async function sha256(buf) {
    const d = await crypto.subtle.digest('SHA-256', buf);
    return Array.prototype.map.call(new Uint8Array(d), v => (v < 16 ? '0' : '') + v.toString(16)).join('');
  }

  /* Every picture, capped at build-game.js's own per-role ceiling. */
  async function encodeAll() {
    const out = {};
    for (const a of S.assets) {
      const cap = CAP[a.role] || CAP.misc;
      let r = await shrink(a, cap, 'image/webp', WEBP_Q);
      if (r.mime !== 'image/webp') r = await shrink(a, cap, 'image/png');
      out[a.id] = { b64: r.b64, w: r.w, h: r.h, ext: r.ext, alpha: a.alpha, sha256: await sha256(r.bytes), bytes: r.bytes.byteLength };
    }
    return out;
  }

  /* ══ 8 · THE BUTTON ═════════════════════════════════════════════════════ */

  /* Two presses a millisecond apart are ONE press. The old guard was the
     button's own `disabled`, set before the first await — which held, until
     press() gained an await of its own (the flush below) whose compose ends
     in validateNow() and would hand the button back mid-build. So the flag
     is the guard now and `disabled` follows it (paintButton). */
  let pressing = false;

  async function press() {
    const b = $('pt-build');
    if (pressing || b.disabled) return;
    pressing = true;
    b.disabled = true; b.classList.add('pt-busy');
    try { await pressOn(b); } finally { pressing = false; validateNow(); }
  }

  async function pressOn(b) {
    /* the words typed since the last compose are part of the composition,
       and this is the last moment they can reach it */
    await flushCompose();
    const card = S.cards[dials.get().chosen | 0] || S.cards[0];
    if (!card) { b.classList.remove('pt-busy'); return; }

    $('pt-out').hidden = true;
    say('re-encoding ' + S.assets.length + ' picture' + (S.assets.length === 1 ? '' : 's') + '…');

    let encoded;
    try { encoded = await encodeAll(); }
    catch (e) { say('the pictures could not be re-encoded: ' + ((e && e.message) || e), 'bad'); b.classList.remove('pt-busy'); validateNow(); return; }

    const manifest = manifestOf(encoded);
    const analysis = {
      palette: S.analysis.palette.map(e => ({ hex: e.hex, weight: e.weight, L: e.L, C: e.C, h: e.h })),
      // the page that is built is THIS card's, so the analysis written beside
      // it is this card's reading and not the first one's (the two differ
      // exactly when the palette was ambiguous — see THE SECOND READING)
      dark: card.theme.dark,
      stats: S.analysis.stats
    };
    if (S.analysis.vibe) analysis.vibe = S.analysis.vibe;
    if (S.analysis.vibeCacheKey) analysis.vibeCacheKey = S.analysis.vibeCacheKey;

    const style = Object.assign({}, card.style);
    delete style.motifs;
    const bundle = { manifest: manifest, analysis: analysis, theme: card.theme, style: style, layout: card.layout };

    // the browser holds every object to its schema before the door does
    // (CONTRACTS §12: "and the Press Table in the browser before it posts")
    if (S.schemas) {
      const faults = []
        .concat(window.Validate.check(manifest, 'manifest.schema.json', S.schemas).map(f => 'manifest.' + f.path + ': ' + f.message))
        .concat(window.Validate.check(analysis, 'analysis.schema.json', S.schemas).map(f => 'analysis.' + f.path + ': ' + f.message))
        .concat(window.Validate.check(card.theme, 'theme.schema.json', S.schemas).map(f => 'theme.' + f.path + ': ' + f.message))
        .concat(window.Validate.check(style, 'style.schema.json', S.schemas).map(f => 'style.' + f.path + ': ' + f.message))
        .concat(window.Validate.check(card.layout, 'layout.schema.json', S.schemas).map(f => 'layout.' + f.path + ': ' + f.message));
      if (faults.length) { say('not sent — ' + faults[0] + (faults.length > 1 ? ' (and ' + (faults.length - 1) + ' more)' : ''), 'bad'); b.classList.remove('pt-busy'); validateNow(); return; }
    }

    const images = {};
    for (const id of Object.keys(encoded)) images[id] = encoded[id].b64;

    if (S.mode === 'publisher') return sendToKnoll(bundle, images, b);

    // the force prompt: the generator refuses an existing page unless it is
    // told to overwrite, and this is the one act on the page that can throw
    // somebody's arrangement away, so it is asked for out loud
    let force = false;
    if (S.slug === manifest.slug || S.built === manifest.slug) {
      force = window.confirm('games/' + manifest.slug + '/index.html already exists.\n\nBuilding again overwrites the page — including anything you arranged on the bench and keep.js wrote back. A copy is kept as index.html.keep-bak.\n\nOverwrite it?');
      if (!force) { say('left alone.', ''); b.classList.remove('pt-busy'); validateNow(); return; }
    }

    say('building games/' + manifest.slug + '/…');
    let res, out;
    try {
      res = await fetch(BUILD, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(Object.assign({ force: force }, bundle, { images: images })) });
      out = await res.json();
    } catch (e) { say('the build door did not answer: ' + ((e && e.message) || e), 'bad'); b.classList.remove('pt-busy'); validateNow(); return; }

    b.classList.remove('pt-busy');
    if (!out || out.ok === false) {
      const err = String((out && out.error) || res.status);
      // the generator's own refusal, turned into the prompt it deserves
      if (/exists/.test(err)) {
        S.built = manifest.slug;
        say('games/' + manifest.slug + '/ is already there — press the button again to overwrite it.', 'bad');
      } else say('the build refused: ' + err, 'bad');
      validateNow();
      return;
    }

    S.built = manifest.slug;
    const url = GAMES + manifest.slug + '/';
    const link = $('pt-out');
    link.hidden = false; link.href = url; link.textContent = url;
    say('built. keep.js writes to games/' + manifest.slug + '/index.html from now on — open the page, move things about, and the arrangement goes back into that file.'
      + ((out.warnings && out.warnings.length) ? ' ' + out.warnings.length + ' warning' + (out.warnings.length === 1 ? '' : 's') + ': ' + out.warnings[0] : ''), 'ok');
    /* "kept until the build succeeds" (plan §10 6.7). The draft's whole job
       was to survive a reload while it was being written, and it has been
       written now, so the keys go. The PAGE is deliberately left standing:
       the owner's next act is almost always to look at what was built, come
       back, move one dial and build it again, and taking the form away from
       them at that moment would serve nobody. A reload from here starts
       clean, which is what the line asks for; a keystroke from here writes
       the key back, which is what a person would expect. */
    try { for (const k of PS.keys()) localStorage.removeItem(k); } catch (e) { /* a store that will not clear is not a reason to fail a build */ }
    validateNow();
  }

  async function sendToKnoll(bundle, images, b) {
    say('sending to knoll…');
    let res, out;
    try {
      res = await fetch(INTAKE, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ bundle: bundle, images: images }) });
      out = await res.json();
    } catch (e) { say('the intake door did not answer: ' + ((e && e.message) || e), 'bad'); b.classList.remove('pt-busy'); validateNow(); return; }
    b.classList.remove('pt-busy');
    if (!out || !out.ok) { say('not sent: ' + ((out && (out.message || out.error)) || res.status), 'bad'); validateNow(); return; }
    say('sent. Your token is ' + out.token + ' — keep it: it is how knoll finds this bundle. ' + out.files + ' pictures, ' + Math.round(out.bytes / 1024) + ' KB.', 'ok');
    validateNow();
  }

  /* ══ 9 · REGENERATING AN EXISTING PAGE (?slug=) ═════════════════════════ */

  async function loadSlug(slug) {
    say('opening games/' + slug + '/game.json…');
    let g;
    try {
      const r = await fetch(GAMES + slug + '/game.json', { cache: 'no-cache' });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      g = await r.json();
    } catch (e) { say('there is no games/' + slug + '/game.json to reopen (' + ((e && e.message) || e) + ').', 'bad'); return; }

    applyManifest(g.manifest || {});
    if (g.theme && g.theme.fonts && g.theme.fonts.id) dials.update(d => { d.pairing = g.theme.fonts.id; });
    if (g.style && g.style.preset) dials.update(d => { d.preset = g.style.preset; });
    if (g.layout && g.layout.recipe) dials.update(d => { d.recipe = g.layout.recipe; });

    // the art is on disk beside the page; fetch it back so the whole reading
    // can run again rather than being read out of the file
    const files = [];
    for (const a of (g.manifest && g.manifest.assets) || []) {
      try {
        const r = await fetch(GAMES + slug + '/' + a.file, { cache: 'no-cache' });
        if (!r.ok) continue;
        const blob = await r.blob();
        files.push(new File([blob], a.file.split('/').pop(), { type: blob.type || 'image/webp' }));
      } catch (e) { /* one missing picture is a warning, not a stop */ }
    }
    S.slug = slug;
    if (files.length) await addFiles(files);
    say('reopened games/' + slug + '/ — ' + files.length + ' picture' + (files.length === 1 ? '' : 's') + ' read back. Building will overwrite the page, and will ask first.');
  }

  /* ══ 10 · BOOT ══════════════════════════════════════════════════════════ */

  async function boot() {
    wireDrop();
    wireForm();
    paintForm();
    $('pt-shuffle').addEventListener('click', shuffle);
    $('pt-build').addEventListener('click', press);

    // the schemas, once (CONTRACTS §12: 11 KB of JSON, seven files)
    try { S.schemas = await window.Validate.loadFetch('schemas/'); }
    catch (e) { S.schemas = null; }

    // the knock — keep.js's own gesture, and the only thing that decides
    // which of the two pages this is
    let door = null;
    try { const r = await fetch(DOOR, { method: 'GET' }); door = r.ok ? await r.json() : null; }
    catch (e) { door = null; }
    S.mode = (door && door.door) ? 'owner' : 'publisher';
    const mode = $('pt-mode');
    mode.dataset.mode = S.mode;
    mode.textContent = S.mode === 'owner' ? 'OWNER MODE' : 'PUBLISHER MODE';
    $('pt-hint').textContent = S.mode === 'owner'
      ? 'Drop a folder of art on the left. The table reads its colours and its style, offers three compositions, and writes the page into games/.'
      : 'Drop a folder of art on the left. The table reads it and shows you exactly what knoll will see; SEND TO KNOLL files the bundle for the owner to look at. Nothing is published by pressing it.';
    say(S.mode === 'owner'
      ? 'the door answered — this table builds pages into ' + GAMES
      : 'no door on this host — this table sends a bundle to knoll instead of building.');

    if (!PS.kept()) say(PS.trouble(), 'bad');

    validateNow();
    paintMocks();
    paintTweak();

    const q = /[?&]slug=([a-z0-9-]{2,40})/.exec(location.search);
    if (q && S.mode === 'owner') loadSlug(q[1]);
  }

  window.Press = {
    DOOR: DOOR, BUILD: BUILD, VIBE: VIBE, INTAKE: INTAKE, GAMES: GAMES,
    state: S, words: words, dials: dials, roles: roles,
    analyse: analyse, compose: () => compose(S.run), shuffle: shuffle, build: press,
    addFiles: addFiles
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
