#!/usr/bin/env node
/* ── TEST-SERVE: THE SANDBOX SERVER'S DOORS, WITHOUT A BROWSER ─────────────
   Node only. lab2/test/serve.js is required rather than run, which hands
   over the functions behind its doors — the tag scanner, the in-place edit,
   the copy writer, the never-shrinks guard, save() — and they are put
   through their paces against a SYNTHETIC bench written to
   perf/results/serve-test/index.html (gitignored): three sections, the
   copies-block markers, the bench-world anchor, and one attribute with a
   raw > in it so that a scanner that is secretly a regex shows itself.

   Then the server itself is started on 4399 for the length of the run —
   not 4322, which is the sandbox's own port and may be up, and never 4321,
   which is the owner's — and asked the questions a client would ask: is
   /_lab2/default shut (it must be: the live bench's autosave knocks there),
   is /_lab2/test/default open, does a game slug that is not one get 400,
   does a path that climbs out of site/ get 403, does a file come back with
   an ETag and then a 304. The one game page it needs — games/zz-serve-test/
   — is written into the sandbox's games/ for the test and removed after,
   whatever happens.

   Nothing here posts to the sandbox's real index.html: save() is always
   given the synthetic file's path. Every check prints PASS or FAIL, the lot
   is written to perf/results/serve-test/summary.json (CONTRACTS.md §11),
   and the exit code is the number of failures, capped at 1.

   SECTIONS 10 AND 11 were added by the verifier (2026-09-07) for the edges
   the first pass did not walk: a body over the cap (the socket must be cut
   and the server must live), a gizmo list that is not a list or holds a
   null, slugs like ../x and A at the door, a slug whose folder is missing,
   a forced build with no build-game.js (501, and the keep-bak it used to
   write over on the way to that 501 left alone), a stickers-core copy
   through the door, words with a quote in them re-found by findTag, two
   saves in one run and ONE keep-bak, a data-palette written single-quoted
   the way CONTRACTS.md §7 writes it (edited in place, not doubled), and the
   query string that took the server down (?%zz). Where a section needs a
   build-game.js or an api/vibe.js that is not built yet, it writes a STUB
   for the length of a few requests and removes it — in finally and again on
   exit — and skips those checks when the real file is there. */

const fs = require('fs');
const path = require('path');
const http = require('http');

const S = require(path.resolve(__dirname, '..', '..', 'serve.js'));

const PORT = 4399;
const OUT = path.join(S.HOME, 'perf', 'results', 'serve-test');
const FILE = path.join(OUT, 'index.html');
const GAME_SLUG = 'zz-serve-test';
const GAME_DIR = path.join(S.HOME, 'games', GAME_SLUG);
const GAME_FILE = path.join(GAME_DIR, 'index.html');

const checks = [];
function check(name, ok, detail) {
  ok = !!ok;
  checks.push({ name, ok, detail: ok ? undefined : detail });
  console.log((ok ? 'PASS  ' : 'FAIL  ') + name + (ok || detail == null ? '' : '\n        ' + detail));
  return ok;
}

// a file written for the length of a few requests where a phase has not yet
// written the real one; taken away in finally, and again when the process
// ends however it ends, so a dead run cannot leave a stub that a later phase
// mistakes for its own work
const STUBS = [];
function stub(file, code) {
  fs.writeFileSync(file, '// A STUB written by press/tools/test-serve.js for one run. If you are reading this in\n' +
    '// the folder, a run died before its cleanup: delete the file.\n' + code + '\n');
  STUBS.push(file);
}
function unstub(file) {
  try { fs.unlinkSync(file); } catch (e) {}
  const i = STUBS.indexOf(file); if (i >= 0) STUBS.splice(i, 1);
}
process.on('exit', () => { for (const f of STUBS) { try { fs.unlinkSync(f); } catch (e) {} } });

// ── the synthetic bench ───────────────────────────────────────────────────
const CHROME = [
  '    <span class="gz-dim" aria-hidden="true"></span>',
  '    <button type="button" class="gz-size" data-nodrag aria-label="re-cut it — double-click to fit it to its drawing"></button>',
  '  </section>'
].join('\n');

const PAL6 = '{&quot;skPrimary&quot;:&quot;#c93b82&quot;,&quot;skSecondary&quot;:&quot;#5871f5&quot;,&quot;skInk&quot;:&quot;#26212a&quot;,' +
             '&quot;skPaper&quot;:&quot;#ffffff&quot;,&quot;skHighlight&quot;:&quot;#ef4d98&quot;,&quot;skShadow&quot;:&quot;#8a2558&quot;}';

function fixture(withMarkers) {
  return [
    '<!doctype html>',
    '<!-- a synthetic bench for press/tools/test-serve.js: three sections, the markers, the anchor -->',
    '<html><head><meta charset="utf-8"><title>serve-test</title></head>',
    '<body>',
    '  <div id="bench-world">',
    '',
    '  <!-- a machine: an iframe document; its data-note carries a raw > on purpose -->',
    '  <section class="gz" id="gz-m-one" data-gizmo="m-one"',
    '           data-src="features/sticker-sheet.dc.html" data-w="1120" data-h="780"',
    '           data-home-x="4500" data-home-y="641" data-home-z="3" data-note="a > b" style="width:1120px;height:780px"',
    '           aria-label="Machine One">',
    '    <iframe title="Machine One"></iframe>',
    '    <div class="gz-poster"><b>waking up</b></div>',
    '    <div class="gz-shield"></div>',
    CHROME,
    '  <!-- a kit part, re-cut once -->',
    '  <section class="gz" id="gz-forest-the-elder" data-gizmo="forest-the-elder"',
    '           data-src="features/forest.dc.html#part=the-elder" data-w="400" data-h="460"',
    '           data-home-x="3380" data-home-y="-2201" data-home-z="15" data-cut="316x353" style="width:316px;height:353px"',
    '           aria-label="The Elder">',
    '    <div class="gz-art"></div>',
    CHROME,
    '  <!-- a sticker with its own palette and words -->',
    '  <section class="gz" id="gz-st-one" data-gizmo="st-one"',
    '           data-src="features/stickers-core.dc.html#part=burst" data-w="128" data-h="128"',
    '           data-home-x="100" data-home-y="200" data-home-z="7" data-palette="' + PAL6 + '" data-text="WISHLIST" style="width:128px;height:128px"',
    '           aria-label="Burst">',
    '    <div class="gz-art"></div>',
    CHROME,
    ''
  ].concat(withMarkers ? ['  ' + S.MARK_TOP, '  ' + S.MARK_END, ''] : []).concat([
    S.ANCHOR,
    '</body></html>',
    ''
  ]).join('\n');
}

const tagOf = (html, id) => { const t = S.findTag(html, id); return t ? html.slice(t.start, t.end) : null; };
const before = (s, a, b) => s.indexOf(a) >= 0 && s.indexOf(b) >= 0 && s.indexOf(a) < s.indexOf(b);
const count = (s, needle) => s.split(needle).length - 1;
const block = html => html.slice(html.indexOf(S.MARK_TOP), html.indexOf(S.MARK_END));

// ── 1 · the scanner ───────────────────────────────────────────────────────
function testScanner() {
  const html = fixture(true);
  const t = tagOf(html, 'm-one');
  check('findTag finds the section by its data-gizmo', t && t.startsWith('<section class="gz" id="gz-m-one"'));
  check('tagEnd reads past a > inside an attribute value', t && t.endsWith('aria-label="Machine One">') && t.indexOf('data-note="a > b"') >= 0,
    t && t.slice(-60));
  check('findTag returns null for a name the file has not', S.findTag(html, 'nobody') === null);
  check('findTag does not match a prefix of a longer name', S.findTag(html, 'st-on') === null);
}

// ── 2 · the in-place edit ─────────────────────────────────────────────────
function testEdit() {
  const html = fixture(true);
  const out = S.apply(html, [{ gizmo: 'm-one', x: 123, y: -45, cut: false, z: 3, gone: false }]);
  const t = tagOf(out.html, 'm-one');
  check('data-home-x edited in place', t && t.indexOf(' data-home-x="123" data-home-y="-45" data-home-z="3"') >= 0, t);
  check('one data-home-x on the tag after the edit', count(t, 'data-home-x=') === 1);
  check('the section count is unchanged', S.secs(out.html) === S.secs(html));
  check('an in-place shortening is counted (4500 → 123, 641 → -45 is 1 byte)', out.dropped === 1, 'dropped=' + out.dropped);
  check('nothing else in the file moved', out.html.replace(t, '') === html.replace(tagOf(html, 'm-one'), ''));

  // z, gone on and off
  const g1 = S.apply(html, [{ gizmo: 'm-one', x: 4500, y: 641, gone: true, z: 9 }]);
  const tg = tagOf(g1.html, 'm-one');
  // data-gone is new to this tag, so it goes where every new attribute goes: in front of style
  check('data-gone="1" written in front of style, data-home-z edited in place', tg.indexOf(' data-home-z="9" data-note=') >= 0 && tg.indexOf(' data-gone="1" style=') >= 0, tg);
  const g2 = S.apply(g1.html, [{ gizmo: 'm-one', x: 4500, y: 641, gone: false, z: 9 }]);
  check('data-gone dropped and counted when the feature comes back', tagOf(g2.html, 'm-one').indexOf('data-gone') < 0 && g2.dropped === ' data-gone="1"'.length,
    'dropped=' + g2.dropped);

  // a gizmo the file has not, and that is not a copy
  const m = S.apply(html, [{ gizmo: 'ghost', x: 0, y: 0 }]);
  check('a name the file has not, and not a copy, is reported missing', m.missing.length === 1 && m.missing[0] === 'ghost' && m.html === html);
}

// ── 3 · data-cut ──────────────────────────────────────────────────────────
function testCut() {
  const html = fixture(true);
  const on = S.apply(html, [{ gizmo: 'm-one', x: 4500, y: 641, cut: true, w: 300, h: 200 }]);
  const t = tagOf(on.html, 'm-one');
  check('data-cut added, in front of style, with the style rewritten',
    t.indexOf(' data-cut="300x200" style="width:300px;height:200px"') >= 0, t);
  check('data-cut goes after every attribute the tag already had', before(t, 'data-note=', 'data-cut='));
  const off = S.apply(on.html, [{ gizmo: 'm-one', x: 4500, y: 641, cut: false }]);
  const t2 = tagOf(off.html, 'm-one');
  check('data-cut dropped when cut=false', t2.indexOf('data-cut') < 0);
  check('the drop is counted, byte for byte', off.dropped === ' data-cut="300x200"'.length, 'dropped=' + off.dropped);
  check('an uncut frame keeps its style untouched', t2.indexOf('style="width:300px;height:200px"') >= 0);
  // the elder came cut in the fixture; fitted back, the freeze comes off
  const elder = S.apply(html, [{ gizmo: 'forest-the-elder', x: 3380, y: -2201, cut: false }]);
  check('a fixture data-cut comes off when the client says cut=false', tagOf(elder.html, 'forest-the-elder').indexOf('data-cut') < 0 && elder.dropped === ' data-cut="316x353"'.length,
    'dropped=' + elder.dropped);
}

// ── 4 · the never-shrinks guard ───────────────────────────────────────────
function testGuard() {
  const html = fixture(true);
  const t = S.findTag(html, 'st-one');
  const closeAt = html.indexOf('</section>', t.end) + '</section>'.length;
  const vanished = html.slice(0, t.start) + html.slice(closeAt);
  check('guard trips when a section vanishes', !S.grew(html, { html: vanished, dropped: 0 }));
  check('guard trips on a vanished section even with a huge dropped count (the section count)', !S.grew(html, { html: vanished, dropped: 1e6 }));
  const shorter = html.replace(' data-note="a > b"', '');
  check('guard trips on 200 uncounted bytes gone', !S.grew(html, { html: html.replace('data-palette="' + PAL6 + '"', 'data-palette="{}"'), dropped: 0 }));
  check('guard passes an honest drop that was counted', S.grew(html, { html: shorter, dropped: ' data-note="a > b"'.length }));
  check('guard leaves 64 bytes of slack for values that get shorter', S.grew(html, { html: shorter, dropped: 0 }));
  check('guard passes a file that grew', S.grew(html, { html: html + '\n<!-- more -->', dropped: 0 }));
}

// ── 5 · the copies ────────────────────────────────────────────────────────
function testCopies() {
  const html = fixture(true);
  const sticker = { gizmo: 'st-new', copy: true, src: 'features/stickers-core.dc.html#part=burst', x: 10.4, y: 20.6, w: 128, h: 128,
                    dataW: 128, dataH: 128, label: 'Burst <copy>', z: 4, palette: { skPrimary: '#112233' }, text: 'HELLO', rot: -3 };
  const machine = { gizmo: 'm-new', copy: true, src: 'features/sticker-sheet.dc.html', x: 1, y: 2, w: 500, h: 400, dataW: 1120, dataH: 780, label: 'Sheet' };
  const out = S.apply(html, [sticker, machine]);
  check('both copies promoted', out.promoted.join(',') === 'st-new,m-new', out.promoted.join(','));
  const b = block(out.html);
  check('the copies land inside the markers', b.indexOf('data-gizmo="st-new"') >= 0 && b.indexOf('data-gizmo="m-new"') >= 0);
  check('nothing lands after the closing marker', out.html.slice(out.html.indexOf(S.MARK_END)).indexOf('<section') < 0);
  const st = tagOf(out.html, 'st-new');
  const stSection = out.html.slice(out.html.indexOf('<section class="gz" id="gz-st-new"'), out.html.indexOf('</section>', out.html.indexOf('id="gz-st-new"')));
  check('a stickers-core copy is a kit part: .gz-art, no iframe', stSection.indexOf('<div class="gz-art"></div>') >= 0 && stSection.indexOf('<iframe') < 0);
  const mSection = out.html.slice(out.html.indexOf('<section class="gz" id="gz-m-new"'), out.html.indexOf('</section>', out.html.indexOf('id="gz-m-new"')));
  check('a machine copy gets iframe + poster + shield', mSection.indexOf('<iframe title="Sheet"></iframe>') >= 0 && mSection.indexOf('gz-poster') >= 0 && mSection.indexOf('gz-shield') >= 0);
  check('a copy carries data-palette (JSON, &quot;-escaped), data-text and data-rot, in front of style',
    st.indexOf(' data-palette="{&quot;skPrimary&quot;:&quot;#112233&quot;}" data-text="HELLO" data-rot="-3" style="width:128px;height:128px"') >= 0, st);
  check('a copy rounds its home to whole units', st.indexOf('data-home-x="10" data-home-y="21" data-home-z="4"') >= 0, st);
  check('a label with markup is escaped', st.indexOf('aria-label="Burst &lt;copy&gt;"') >= 0);
  check('a copy the file already has is not appended twice', S.apply(out.html, [sticker]).promoted.length === 0);
  check('a copy without a src is reported missing, not written', S.apply(html, [{ gizmo: 'x-no-src', copy: true, x: 0, y: 0 }]).missing[0] === 'x-no-src');

  // a second append leaves no ragged edge
  const again = S.apply(out.html, [{ gizmo: 'st-third', copy: true, src: 'features/stickers-core.dc.html#part=tape', x: 0, y: 0, w: 128, h: 128 }]);
  const tail = again.html.slice(again.html.lastIndexOf('</section>') + '</section>'.length, again.html.indexOf(S.MARK_END));
  check('the closing marker keeps exactly one blank line and its indent after two appends', tail === '\n\n  ', JSON.stringify(tail));
  const gap = again.html.slice(again.html.indexOf(S.MARK_TOP) + S.MARK_TOP.length, again.html.indexOf('<section', again.html.indexOf(S.MARK_TOP)));
  check('the first copy sits a blank line under the opening marker', gap === '\n\n  ', JSON.stringify(gap));

  // no markers → the block is made before the anchor
  const bare = fixture(false);
  const made = S.apply(bare, [sticker]);
  check('the block is created before the bench-world anchor when the file has none',
    made.html.indexOf(S.MARK_TOP) >= 0 && before(made.html, S.MARK_END, S.ANCHOR) && block(made.html).indexOf('data-gizmo="st-new"') >= 0);
  check('no anchor, no block: an error, not a write', S.apply(bare.replace(S.ANCHOR, ''), [sticker]).error === 'no bench-world anchor in the file');
}

// ── 6 · the sticker's own words ───────────────────────────────────────────
function testVariants() {
  const html = fixture(true);
  const set = S.apply(html, [{ gizmo: 'st-one', x: 100, y: 200, palette: { skPrimary: '#123456', skInk: '#000000' }, text: 'ADD ME', rot: 2.456 }]);
  const t = tagOf(set.html, 'st-one');
  check('data-palette edited in place to the new JSON, escaped',
    t.indexOf(' data-palette="{&quot;skPrimary&quot;:&quot;#123456&quot;,&quot;skInk&quot;:&quot;#000000&quot;}"') >= 0 && count(t, 'data-palette=') === 1, t);
  check('data-text edited in place', t.indexOf(' data-text="ADD ME"') >= 0 && count(t, 'data-text=') === 1);
  check('data-rot added in front of style, two decimals', t.indexOf(' data-rot="2.46" style="width:128px;height:128px"') >= 0, t);
  check('the palette shortening is counted so save() will not refuse it', set.dropped > 64, 'dropped=' + set.dropped);

  const off = S.apply(set.html, [{ gizmo: 'st-one', x: 100, y: 200, palette: '', text: '', rot: null }]);
  const t2 = tagOf(off.html, 'st-one');
  check('empty values take all three words off', t2.indexOf('data-palette') < 0 && t2.indexOf('data-text') < 0 && t2.indexOf('data-rot') < 0, t2);
  check('the three drops are counted', off.dropped ===
    ' data-palette="{&quot;skPrimary&quot;:&quot;#123456&quot;,&quot;skInk&quot;:&quot;#000000&quot;}"'.length + ' data-text="ADD ME"'.length + ' data-rot="2.46"'.length,
    'dropped=' + off.dropped);
  check('an empty palette object is an empty value', tagOf(S.apply(html, [{ gizmo: 'st-one', x: 100, y: 200, palette: {} }]).html, 'st-one').indexOf('data-palette') < 0);

  const silent = S.apply(html, [{ gizmo: 'st-one', x: 100, y: 200 }]);
  check('a client that sends none of the keys leaves the words alone', silent.html === html);

  const str = S.apply(html, [{ gizmo: 'st-one', x: 100, y: 200, palette: '{"skPrimary": "#abcdef"}' }]);
  check('a palette sent as a JSON string is parsed and written canonical', tagOf(str.html, 'st-one').indexOf(' data-palette="{&quot;skPrimary&quot;:&quot;#abcdef&quot;}"') >= 0);
  const junk = S.apply(html, [{ gizmo: 'st-one', x: 100, y: 200, palette: 'not json', rot: 'sideways' }]);
  check('a palette or rot that is not one leaves the tag as it was', junk.html === html);
  check('a palette that is an array is not one', S.apply(html, [{ gizmo: 'st-one', x: 100, y: 200, palette: ['#fff'] }]).html === html);

  const dollars = S.apply(html, [{ gizmo: 'st-one', x: 100, y: 200, text: 'SAVE $& NOW $\' "yes"' }]);
  // the & is escaped, so the tag carries `$&amp;` — which is STILL a replacement pattern to String.replace,
  // and the fixture's data-text exists, so this goes through the regex replace: the function replacer is what keeps it literal
  check('a $& or $\' in the words stays two characters (escaped), and a quote is &quot;',
    tagOf(dollars.html, 'st-one').indexOf(' data-text="SAVE $&amp; NOW $\' &quot;yes&quot;"') >= 0, tagOf(dollars.html, 'st-one'));
  check('data-rot of 0 is written, not dropped', tagOf(S.apply(html, [{ gizmo: 'st-one', x: 100, y: 200, rot: 0 }]).html, 'st-one').indexOf(' data-rot="0"') >= 0);
}

// ── 7 · save(): the file, the backup, the tmp ─────────────────────────────
function testSave() {
  fs.mkdirSync(OUT, { recursive: true });
  for (const f of [FILE, FILE + '.keep-bak', FILE + '.tmp']) { try { fs.unlinkSync(f); } catch (e) {} }
  S.backedUp.delete(FILE);
  const original = fixture(true);
  fs.writeFileSync(FILE, original);

  check('save() refuses an empty body', S.save({}, FILE).ok === false && S.save({ gizmos: [] }, FILE).error === 'nothing to save');

  const r1 = S.save({ gizmos: [{ gizmo: 'm-one', x: 1, y: 2 }] }, FILE);
  check('save() writes an edit', r1.ok && r1.wrote === true, JSON.stringify(r1));
  check('the file carries the edit', tagOf(fs.readFileSync(FILE, 'utf8'), 'm-one').indexOf(' data-home-x="1" data-home-y="2"') >= 0);
  check('index.html.keep-bak is the file as it was', fs.existsSync(FILE + '.keep-bak') && fs.readFileSync(FILE + '.keep-bak', 'utf8') === original);
  check('no index.html.tmp left behind', !fs.existsSync(FILE + '.tmp'));

  const r2 = S.save({ gizmos: [{ gizmo: 'm-one', x: 1, y: 2 }] }, FILE);
  check('save() of the same numbers writes nothing', r2.ok && r2.wrote === false);

  // the palette shrink, end to end: six roles down to one is > 64 bytes shorter
  const r3 = S.save({ gizmos: [{ gizmo: 'st-one', x: 100, y: 200, palette: { skPrimary: '#000001' } }] }, FILE);
  const now = fs.readFileSync(FILE, 'utf8');
  check('save() accepts a palette that got much shorter (the shrink was counted)', r3.ok && r3.wrote && now.length < original.length - 64, JSON.stringify(r3) + ' len ' + now.length + ' vs ' + original.length);
  check('the keep-bak is still the ORIGINAL after a second write (one per run)', fs.readFileSync(FILE + '.keep-bak', 'utf8') === original);

  const r4 = S.save({ gizmos: [{ gizmo: 'q-copy', copy: true, src: 'features/stickers-core.dc.html#part=star', x: 5, y: 6, w: 128, h: 128, text: 'NEW' }] }, FILE);
  const after = fs.readFileSync(FILE, 'utf8');
  check('save() appends a copy and reports it promoted', r4.ok && r4.promoted[0] === 'q-copy' && block(after).indexOf('data-text="NEW"') >= 0);
  check('the file only ever grows past what it meant to take off', after.length > now.length);
}

// ── 8 · slugs and the build gate ──────────────────────────────────────────
function testSlugs() {
  const good = ['pixelfort', 'ab', 'a-1', 'x'.repeat(40)];
  const bad = ['', 'a', 'Pixel', 'x'.repeat(41), '../x', 'a b', 'a_b', 'a.b', 'a/b', 'default', 'ünï'];
  check('SLUG accepts the good ones', good.every(s => S.SLUG.test(s)));
  check('SLUG refuses the bad ones', bad.filter(s => S.SLUG.test(s) && s !== 'default').length === 0, bad.filter(s => S.SLUG.test(s)).join(','));
  check('gameFile() maps a slug under the sandbox games/', S.gameFile('pixelfort') === path.join(S.HOME, 'games', 'pixelfort', 'index.html'));
  check('gameFile() is null for a slug that is not one', S.gameFile('../x') === null && S.gameFile('') === null && S.gameFile(undefined) === null);

  check('buildGate refuses a bundle without a slug', !!S.buildGate({}).error && !!S.buildGate(null).error && !!S.buildGate({ manifest: { slug: 'A' } }).error);
  const fresh = S.buildGate({ manifest: { slug: 'no-such-page-zz' } });
  check('buildGate passes a slug with no page yet', !fresh.error && fresh.exists === false && fresh.file === S.gameFile('no-such-page-zz'));

  fs.mkdirSync(GAME_DIR, { recursive: true });
  fs.writeFileSync(GAME_FILE, fixture(true));
  const exists = S.buildGate({ manifest: { slug: GAME_SLUG } });
  check('buildGate refuses to overwrite a page that exists', /exists/.test(exists.error || ''), JSON.stringify(exists));
  check('buildGate did not back up a page it refused', !fs.existsSync(GAME_FILE + '.keep-bak'));
  const forced = S.buildGate({ slug: GAME_SLUG, force: true });
  // the gate DECIDES; the door takes the backup once the builder is loaded (section 11 sees it happen)
  check('buildGate with force passes and says the page exists', !forced.error && forced.exists === true && forced.file === GAME_FILE, JSON.stringify(forced));
  check('buildGate itself writes nothing — no keep-bak from deciding', !fs.existsSync(GAME_FILE + '.keep-bak'));
}

// ── 9 · the server on 4399 ────────────────────────────────────────────────
function req(method, urlPath, body, headers) {
  return new Promise((resolve, reject) => {
    const data = body == null ? null : (Buffer.isBuffer(body) ? body : Buffer.from(typeof body === 'string' ? body : JSON.stringify(body)));
    const r = http.request({ host: '127.0.0.1', port: PORT, method, path: urlPath,
      headers: Object.assign({}, data ? { 'content-type': 'application/json', 'content-length': data.length } : {}, headers || {}) }, res => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        const text = Buffer.concat(chunks).toString('utf8');
        let json = null; try { json = JSON.parse(text); } catch (e) {}
        resolve({ code: res.statusCode, headers: res.headers, text, json });
      });
    });
    r.on('error', reject);
    if (data) r.write(data);
    r.end();
  });
}

async function testServer() {
  const server = S.listen(PORT, true);
  await new Promise(res => server.once('listening', res));
  try {
    let r = await req('GET', '/_lab2/default');
    check('GET /_lab2/default is 404 — the live bench never saves here', r.code === 404 && r.json && r.json.ok === false && r.json.error === 'no door here', r.code + ' ' + r.text);
    r = await req('POST', '/_lab2/default', { gizmos: [{ gizmo: 'm-one', x: 0, y: 0 }] });
    check('POST /_lab2/default is 404 too', r.code === 404);
    r = await req('GET', '/_lab2/anything/else');
    check('any other /_lab2/… is 404', r.code === 404 && r.json.error === 'no door here');
    r = await req('GET', '/_lab2/test/default');
    check('GET /_lab2/test/default is the door: {ok:true, door:true}', r.code === 200 && r.json && r.json.ok === true && r.json.door === true, r.code + ' ' + r.text);
    r = await req('PUT', '/_lab2/test/default');
    check('PUT on a save door is 405', r.code === 405);
    r = await req('GET', '/_lab2/test/games/BAD');
    check('a slug that is not one is refused with 400', r.code === 400 && r.json.ok === false, r.code + ' ' + r.text);
    r = await req('GET', '/_lab2/test/games/no-such-page-zz');
    check('a slug with no page is refused with 400', r.code === 400 && /no page/.test(r.json.error), r.code + ' ' + r.text);
    r = await req('GET', '/_lab2/test/games/' + GAME_SLUG);
    check('a slug with a page is a door, and says which file', r.code === 200 && r.json.door === true && r.json.file === S.DIR + '/games/' + GAME_SLUG + '/index.html', r.text);

    // the game door, end to end, against the test's own page
    S.backedUp.delete(GAME_FILE);
    r = await req('POST', '/_lab2/test/games/' + GAME_SLUG, { gizmos: [{ gizmo: 'st-one', x: 77, y: 88, rot: 15 }] });
    const page = fs.readFileSync(GAME_FILE, 'utf8');
    check('POST to the game door writes the game page', r.code === 200 && r.json.wrote === true && tagOf(page, 'st-one').indexOf(' data-home-x="77" data-home-y="88"') >= 0 && tagOf(page, 'st-one').indexOf(' data-rot="15"') >= 0, r.text);
    check('the game page got its own keep-bak', fs.existsSync(GAME_FILE + '.keep-bak') && fs.readFileSync(GAME_FILE + '.keep-bak', 'utf8') === fixture(true));
    r = await req('POST', '/_lab2/test/games/' + GAME_SLUG, 'not json');
    check('a body that is not JSON is 400', r.code === 400 && r.json.ok === false);

    // the build door
    r = await req('GET', '/_lab2/test/build');
    check('GET /_lab2/test/build is 405', r.code === 405);
    r = await req('POST', '/_lab2/test/build', '{bad');
    check('a bundle that is not JSON is 400', r.code === 400 && /not JSON/.test(r.json.error));
    r = await req('POST', '/_lab2/test/build', { manifest: { slug: GAME_SLUG } });
    check('the build door refuses to overwrite an existing page without force', r.code === 400 && /exists/.test(r.json.error), r.text);
    r = await req('POST', '/_lab2/test/build', { manifest: { slug: 'not a slug' } });
    check('the build door refuses a slug that is not one', r.code === 400 && /slug/.test(r.json.error), r.text);
    const toolThere = fs.existsSync(path.join(S.HOME, 'press', 'tools', 'build-game.js'));
    r = await req('POST', '/_lab2/test/build', { manifest: { slug: 'no-such-page-zz' } });
    check(toolThere ? 'the build door hands a fresh slug to build-game.js (present)' : 'the build door answers 501 while build-game.js is not built yet',
      toolThere ? r.code !== 501 : (r.code === 501 && r.json.error === 'build-game.js not built yet'), r.code + ' ' + r.text.slice(0, 200));
    if (toolThere) { try { fs.rmSync(path.join(S.HOME, 'games', 'no-such-page-zz'), { recursive: true, force: true }); } catch (e) {} }

    // the two functions
    for (const name of ['vibe', 'intake']) {
      const there = fs.existsSync(path.join(S.HOME, 'api', name + '.js'));
      r = await req('POST', '/_lab2/test/' + name, { probe: true });
      check(there ? '/_lab2/test/' + name + ' is mounted (api/' + name + '.js present)' : '/_lab2/test/' + name + ' answers 501 while api/' + name + '.js is not built yet',
        there ? r.code !== 501 : (r.code === 501 && r.json.error === name + '.js not built yet'), r.code + ' ' + r.text.slice(0, 200));
    }

    // static
    r = await req('GET', '/lab2/test/README.md');
    check('a file is served with its MIME and an ETag', r.code === 200 && /text\/plain/.test(r.headers['content-type']) && !!r.headers.etag && r.headers['cache-control'] === 'no-cache', r.code + ' ' + JSON.stringify(r.headers));
    const etag = r.headers.etag;
    r = await req('GET', '/lab2/test/README.md', null, { 'if-none-match': etag });
    check('the same ETag back gets a 304', r.code === 304 && r.text === '');
    r = await req('GET', '/lab2/test/README.md', null, { 'if-modified-since': new Date(Date.now() + 60000).toUTCString() });
    check('a fresh If-Modified-Since gets a 304', r.code === 304);
    r = await req('GET', '/lab2/test');
    check('a directory without its slash is a 302 to the slash', r.code === 302 && r.headers.location === '/lab2/test/');
    r = await req('GET', '/lab2/test/games/' + GAME_SLUG + '/');
    check('a directory serves its index.html', r.code === 200 && /text\/html/.test(r.headers['content-type']) && r.text.indexOf('data-gizmo="st-one"') >= 0);
    r = await req('GET', '/lab2/test/no-such-file.txt');
    check('a missing file is 404', r.code === 404);
    for (const bad of ['/../serve.js', '/%2e%2e/%2e%2e/etc/passwd', '/lab2/../../package.json', '/..%5c..%5cwindows']) {
      r = await req('GET', bad);
      check('path traversal ' + bad + ' is 403', r.code === 403 && r.text === 'no', r.code + ' ' + r.text.slice(0, 60));
    }
    r = await req('GET', '/lab2/test/README.md?x=1');
    check('a query string does not reach the file system', r.code === 200);
  } finally {
    await new Promise(res => server.close(res));
  }
}

// ── 10 · the edges the first pass did not walk (no socket) ────────────────
function testMore() {
  const html = fixture(true);

  // a gizmo list that is not a list, and entries that are not gizmos
  fs.writeFileSync(FILE, html);
  for (const f of [FILE + '.keep-bak', FILE + '.tmp']) { try { fs.unlinkSync(f); } catch (e) {} }
  S.backedUp.delete(FILE);
  const notLists = [[{ gizmos: {} }, 'an object'], [{ gizmos: 'x' }, 'a string'], [{ gizmos: null }, 'null'], [[], 'a bare array'],
    [null, 'a null body'], ['str', 'a string body'], [5, 'a number body'], [{ gizmos: [null] }, 'a list of one null'], [{ gizmos: [1, 'x', true] }, 'a list of scalars']];
  for (const [body, why] of notLists) {
    let r; try { r = S.save(body, FILE); } catch (e) { r = { error: 'THREW ' + e.message }; }
    check('save() says "nothing to save" for gizmos that are ' + why, r.ok === false && r.error === 'nothing to save', JSON.stringify(r));
  }
  const mixed = S.save({ gizmos: [null, { gizmo: 'm-one', x: 9, y: 9 }, 7, 'x'] }, FILE);
  check('a null beside a real gizmo is stepped over, and the real one is saved', mixed.ok && mixed.wrote === true && tagOf(fs.readFileSync(FILE, 'utf8'), 'm-one').indexOf(' data-home-x="9" data-home-y="9"') >= 0, JSON.stringify(mixed));

  // the words, with a quote in them: escaped, and the tag is still one tag
  const words = 'He said "hi" <b> & don\'t $& $\'';
  const escaped = ' data-text="He said &quot;hi&quot; &lt;b&gt; &amp; don\'t $&amp; $\'"';
  const w = S.apply(html, [{ gizmo: 'st-one', x: 100, y: 200, text: words }]);
  const t = tagOf(w.html, 'st-one');
  check('a quote, a <, an & in data-text are escaped; an apostrophe and a $& stay as they are', t && t.indexOf(escaped) >= 0, t);
  check('findTag re-finds that tag as ONE tag, ending at its aria-label', t && t.endsWith('aria-label="Burst">') && count(t, '<section') === 1 && S.tagEnd(t, 0) === t.length - 1, t);
  const w2 = S.apply(w.html, [{ gizmo: 'st-one', x: 100, y: 200, text: 'again "x"' }]);
  const t2 = tagOf(w2.html, 'st-one');
  check('a second edit lands on the same data-text, in place, one of them', t2 && count(t2, 'data-text=') === 1 && t2.indexOf(' data-text="again &quot;x&quot;"') >= 0 &&
    t2.replace(' data-text="again &quot;x&quot;"', '') === t.replace(escaped, ''), t2);
  const c = S.apply(html, [{ gizmo: 'st-q', copy: true, src: 'features/stickers-core.dc.html#part=burst', x: 1, y: 2, w: 128, h: 128, text: words, label: 'Say "so"' }]);
  const tc = tagOf(c.html, 'st-q');
  check('a copy carrying those words is re-found by findTag and ends at its escaped aria-label', tc && tc.indexOf(escaped) >= 0 && tc.endsWith('aria-label="Say &quot;so&quot;">') && S.tagEnd(tc, 0) === tc.length - 1, tc);
  const c2 = S.apply(c.html, [{ gizmo: 'st-q', x: 1, y: 2, text: '' }]);
  check('…and the words come off the copy in place, counted byte for byte', tagOf(c2.html, 'st-q').indexOf('data-text') < 0 && c2.dropped === escaped.length, 'dropped=' + c2.dropped);

  // words that spell an attribute cannot catch the scanner
  const spoof = S.apply(html, [{ gizmo: 'st-one', x: 100, y: 200, text: 'x data-rot=\'6\' data-home-x="5"' }]);
  const spoofed = S.apply(spoof.html, [{ gizmo: 'st-one', x: 101, y: 200, rot: 9 }]);
  const ts = tagOf(spoofed.html, 'st-one');
  check('a data-text that spells data-rot=\'6\' and data-home-x="5" catches neither edit',
    ts && ts.indexOf(' data-rot="9" style=') >= 0 && ts.indexOf(' data-home-x="101" data-home-y="200"') >= 0 &&
    ts.indexOf(' data-text="x data-rot=\'6\' data-home-x=&quot;5&quot;"') >= 0 && count(ts, 'data-rot=') === 2 && S.tagEnd(ts, 0) === ts.length - 1, ts);

  // a single-quoted attribute, the way CONTRACTS.md §7 writes data-palette
  const sqAttr = " data-palette='" + '{"skPrimary":"#c93b82","skInk":"#26212a"}' + "'";
  const sq = html.replace(' data-palette="' + PAL6 + '"', sqAttr);
  check('the single-quoted fixture is a different file', sq !== html && sq.indexOf(sqAttr) >= 0);
  const t0 = tagOf(sq, 'st-one');
  const a0 = S.attrAt(t0, 'data-palette'), a1 = S.attrAt(t0, 'data-text');
  check('attrAt finds a single-quoted attribute and a double-quoted one alike, leading space included',
    a0 && t0.slice(a0.at, a0.end) === sqAttr && a1 && t0.slice(a1.at, a1.end) === ' data-text="WISHLIST"', JSON.stringify([a0, a1]));
  check('attrAt does not find a name inside a value, a prefix, or an unquoted value',
    S.attrAt(t0, 'skPrimary') === null && S.attrAt(t0, 'data-home') === null && S.attrAt(t0, 'data-palette=') === null &&
    S.attrAt('<section data-nodrag data-x=5 data-y="1">', 'data-x') === null && S.attrAt('<section data-nodrag data-x=5 data-y="1">', 'data-y').at === '<section data-nodrag data-x=5 data-y="1">'.indexOf(' data-y='));
  const e1 = S.apply(sq, [{ gizmo: 'st-one', x: 100, y: 200, palette: { skPrimary: '#000001' } }]);
  const t1 = tagOf(e1.html, 'st-one');
  const newAttr = ' data-palette="{&quot;skPrimary&quot;:&quot;#000001&quot;}"';
  check('a single-quoted data-palette is edited IN PLACE, once, written back double-quoted',
    t1 && count(t1, 'data-palette=') === 1 && t1.indexOf(newAttr + ' data-text="WISHLIST"') >= 0 && t1.replace(newAttr, '') === t0.replace(sqAttr, ''), t1);
  check('…and what it lost in place is counted (nothing here: &quot; made it longer)', e1.dropped === Math.max(0, sqAttr.length - newAttr.length), 'dropped=' + e1.dropped);
  const e2 = S.apply(sq, [{ gizmo: 'st-one', x: 100, y: 200, palette: '' }]);
  check('a single-quoted data-palette comes OFF on an empty value, counted byte for byte', tagOf(e2.html, 'st-one').indexOf('data-palette') < 0 && e2.dropped === sqAttr.length, 'dropped=' + e2.dropped);
  check('…and is left alone when the client says nothing', S.apply(sq, [{ gizmo: 'st-one', x: 100, y: 200 }]).html === sq);
  const hand = html.replace(' data-cut="316x353"', " data-cut='316x353'").replace(' data-home-z="3" data-note', " data-gone='1' data-home-z='3' data-note");
  const handOut = S.apply(hand, [{ gizmo: 'forest-the-elder', x: 3380, y: -2201, cut: false }, { gizmo: 'm-one', x: 4500, y: 641, z: 4, gone: false }]);
  check('a hand-written single-quoted data-cut comes off on cut=false, a data-gone on gone=false, a data-home-z is edited in place',
    tagOf(handOut.html, 'forest-the-elder').indexOf('data-cut') < 0 && tagOf(handOut.html, 'm-one').indexOf('data-gone') < 0 &&
    tagOf(handOut.html, 'm-one').indexOf(' data-home-z="4" data-note') >= 0 && handOut.dropped === " data-cut='316x353'".length + " data-gone='1'".length, tagOf(handOut.html, 'm-one'));
  fs.writeFileSync(FILE, sq);
  for (const f of [FILE + '.keep-bak', FILE + '.tmp']) { try { fs.unlinkSync(f); } catch (e) {} }
  S.backedUp.delete(FILE);
  const rs = S.save({ gizmos: [{ gizmo: 'st-one', x: 100, y: 200, palette: { skPrimary: '#000001' } }] }, FILE);
  check('save() writes the single-quoted edit through the guard', rs.ok && rs.wrote === true && count(tagOf(fs.readFileSync(FILE, 'utf8'), 'st-one'), 'data-palette=') === 1, JSON.stringify(rs));

  // a data-text that is not words
  check('a data-text that is an object or an array leaves the tag alone',
    S.apply(html, [{ gizmo: 'st-one', x: 100, y: 200, text: { a: 1 } }]).html === html && S.apply(html, [{ gizmo: 'st-one', x: 100, y: 200, text: ['a'] }]).html === html);
  check('a data-text that is a number is words', tagOf(S.apply(html, [{ gizmo: 'st-one', x: 100, y: 200, text: 42 }]).html, 'st-one').indexOf(' data-text="42"') >= 0);

  // the query string a mounted function is handed
  const q = S.query('/_lab2/test/vibe?a=1&b=x%20y&c&d=1+2&%zz=%zz&e=%E2%9C%93');
  check('query() decodes pairs, a bare key, a +, and a unicode escape', q.a === '1' && q.b === 'x y' && q.c === '' && q.d === '1 2' && q.e === '✓', JSON.stringify(q));
  check('query() keeps a % that is not an escape as it came, and does not throw', q['%zz'] === '%zz');
  check('query() of a url with no ? is empty', Object.keys(S.query('/x')).length === 0);
}

// ── 11 · the same edges at the door, on 4399 ──────────────────────────────
// like req() but an error (a socket the server cut) is an answer, not a throw
function ask(method, urlPath, body, headers) {
  return new Promise(resolve => {
    const data = body == null ? null : (Buffer.isBuffer(body) ? body : Buffer.from(typeof body === 'string' ? body : JSON.stringify(body)));
    const r = http.request({ host: '127.0.0.1', port: PORT, method, path: urlPath,
      headers: Object.assign({}, data ? { 'content-type': 'application/json', 'content-length': data.length } : {}, headers || {}) }, res => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        const text = Buffer.concat(chunks).toString('utf8');
        let json = null; try { json = JSON.parse(text); } catch (e) {}
        resolve({ code: res.statusCode, headers: res.headers, text, json });
      });
    });
    r.on('error', e => resolve({ error: e.code || e.message }));
    if (data) r.write(data);
    r.end();
  });
}

async function testServerMore() {
  const server = S.listen(PORT, true);
  await new Promise(res => server.once('listening', res));
  fs.mkdirSync(GAME_DIR, { recursive: true });
  fs.writeFileSync(GAME_FILE, fixture(true));
  for (const f of [GAME_FILE + '.keep-bak', GAME_FILE + '.tmp']) { try { fs.unlinkSync(f); } catch (e) {} }
  S.backedUp.delete(GAME_FILE);
  const EMPTY_DIR = path.join(S.HOME, 'games', 'zz-empty-folder');
  const NO_DIR = path.join(S.HOME, 'games', 'zz-no-folder');
  const toolPath = path.join(S.HOME, 'press', 'tools', 'build-game.js');
  const vibePath = path.join(S.HOME, 'api', 'vibe.js');
  try {
    // a body over the cap: valid JSON that would edit the page, one byte too many
    const pageBefore = fs.readFileSync(GAME_FILE, 'utf8');
    const big = Buffer.concat([Buffer.from('{"gizmos":[{"gizmo":"st-one","x":1,"y":2}],"pad":"'), Buffer.alloc(S.CAP_SAVE + 1, 0x61), Buffer.from('"}')]);
    let r = await ask('POST', '/_lab2/test/games/' + GAME_SLUG, big);
    check('a save body over the 4 MB cap gets no answer: the socket is cut', r.error != null && r.code == null, JSON.stringify(r));
    check('…nothing was written: page as it was, no tmp, no keep-bak', fs.readFileSync(GAME_FILE, 'utf8') === pageBefore && !fs.existsSync(GAME_FILE + '.tmp') && !fs.existsSync(GAME_FILE + '.keep-bak'));
    r = await ask('GET', '/_lab2/test/games/' + GAME_SLUG);
    check('…and the server is still up', r.code === 200 && r.json && r.json.door === true, JSON.stringify(r));
    const bigBuild = Buffer.concat([Buffer.from('{"manifest":{"slug":"zz-no-folder"},"pad":"'), Buffer.alloc(S.CAP_BUILD + 1, 0x61), Buffer.from('"}')]);
    r = await ask('POST', '/_lab2/test/build', bigBuild);
    check('a build bundle over the 64 MB cap is cut the same way', r.error != null && r.code == null, JSON.stringify(r));
    r = await ask('GET', '/_lab2/test/default');
    check('…and the server is still up after that too', r.code === 200 && r.json && r.json.door === true, JSON.stringify(r));
    check('…and no games/zz-no-folder was made', !fs.existsSync(NO_DIR));

    // a gizmo list that is not a list, at the door
    for (const [body, why] of [['{"gizmos":{}}', 'an object'], ['{"gizmos":"x"}', 'a string'], ['{"gizmos":[null]}', 'a list of one null'], ['[]', 'a bare array'], ['null', 'null'], ['"str"', 'a string']]) {
      r = await ask('POST', '/_lab2/test/games/' + GAME_SLUG, body);
      check('POST gizmos that are ' + why + ' is 400 "nothing to save", not a TypeError', r.code === 400 && r.json && r.json.error === 'nothing to save', r.code + ' ' + r.text);
    }
    r = await ask('POST', '/_lab2/test/games/' + GAME_SLUG, { gizmos: [null, { gizmo: 'st-one', x: 5, y: 6 }, 7] });
    check('a null beside a real gizmo is stepped over at the door', r.code === 200 && r.json.wrote === true && tagOf(fs.readFileSync(GAME_FILE, 'utf8'), 'st-one').indexOf(' data-home-x="5" data-home-y="6"') >= 0, r.text);

    // two saves in one run, ONE keep-bak — the save above was the first
    check('the first save of the run took the keep-bak, and it is the page as it was', fs.existsSync(GAME_FILE + '.keep-bak') && fs.readFileSync(GAME_FILE + '.keep-bak', 'utf8') === pageBefore);
    fs.writeFileSync(GAME_FILE + '.keep-bak', 'SENTINEL — a second save in the same run must not rewrite this file');
    r = await ask('POST', '/_lab2/test/games/' + GAME_SLUG, { gizmos: [{ gizmo: 'st-one', x: 7, y: 8 }] });
    check('a second save in the same run writes the page', r.code === 200 && r.json.wrote === true && tagOf(fs.readFileSync(GAME_FILE, 'utf8'), 'st-one').indexOf(' data-home-x="7" data-home-y="8"') >= 0, r.text);
    check('…and leaves the keep-bak alone: one per file per run', fs.readFileSync(GAME_FILE + '.keep-bak', 'utf8').startsWith('SENTINEL'));
    check('…one keep-bak in the folder, no tmp', fs.readdirSync(GAME_DIR).filter(f => /keep-bak/.test(f)).length === 1 && !fs.existsSync(GAME_FILE + '.tmp'), fs.readdirSync(GAME_DIR).join(','));

    // slugs at the door, GET and POST alike
    for (const s of ['../x', 'A', '%2e%2e%2fx', '..', GAME_SLUG + '/', 'a', 'x'.repeat(41), 'a_b']) {
      const g = await ask('GET', '/_lab2/test/games/' + s);
      const p = await ask('POST', '/_lab2/test/games/' + s, { gizmos: [{ gizmo: 'st-one', x: 1, y: 2 }] });
      check('games/' + s + ' is 400 on GET and on POST', g.code === 400 && p.code === 400 && g.json && g.json.ok === false && p.json && p.json.ok === false && /slug/.test(g.json.error), g.code + ' ' + p.code + ' ' + g.text);
    }
    // a slug whose folder is missing, and one whose folder is there but empty
    let g = await ask('GET', '/_lab2/test/games/zz-no-folder');
    let p = await ask('POST', '/_lab2/test/games/zz-no-folder', { gizmos: [{ gizmo: 'st-one', x: 1, y: 2 }] });
    check('a slug with no folder is 400 "no page" on GET and POST, and no folder is made', g.code === 400 && p.code === 400 && /no page/.test(g.json.error) && /no page/.test(p.json.error) && !fs.existsSync(NO_DIR), g.text + ' ' + p.text);
    fs.mkdirSync(EMPTY_DIR, { recursive: true });
    g = await ask('GET', '/_lab2/test/games/zz-empty-folder');
    p = await ask('POST', '/_lab2/test/games/zz-empty-folder', { gizmos: [{ gizmo: 'st-one', x: 1, y: 2 }] });
    check('a slug whose folder has no index.html is 400 "no page" too, and no page is made', g.code === 400 && p.code === 400 && /no page/.test(g.json.error) && fs.readdirSync(EMPTY_DIR).length === 0, g.text + ' ' + p.text);

    // a copy whose src is a stickers-core part, through the door
    r = await ask('POST', '/_lab2/test/games/' + GAME_SLUG, { gizmos: [{ gizmo: 'st-door', copy: true, src: 'features/stickers-core.dc.html#part=star', x: 1, y: 2, w: 128, h: 128, dataW: 128, dataH: 128,
      label: 'Star', palette: { skPrimary: '#0a0b0c' }, text: 'DOOR' }] });
    const pg = fs.readFileSync(GAME_FILE, 'utf8');
    const sec = pg.slice(pg.indexOf('<section class="gz" id="gz-st-door"'), pg.indexOf('</section>', pg.indexOf('id="gz-st-door"')));
    check('a stickers-core copy through the door is promoted and lands inside the markers', r.code === 200 && r.json.promoted[0] === 'st-door' && block(pg).indexOf('data-gizmo="st-door"') >= 0, r.text);
    check('…as a .gz-art section: no iframe, no poster, no shield', sec.indexOf('<div class="gz-art"></div>') >= 0 && sec.indexOf('<iframe') < 0 && sec.indexOf('gz-poster') < 0 && sec.indexOf('gz-shield') < 0, sec);
    check('…with its palette and words in front of style, and the five-line chrome', tagOf(pg, 'st-door').indexOf(' data-palette="{&quot;skPrimary&quot;:&quot;#0a0b0c&quot;}" data-text="DOOR" style="width:128px;height:128px"') >= 0 && sec.indexOf('class="gz-size"') >= 0, tagOf(pg, 'st-door'));
    r = await ask('POST', '/_lab2/test/games/' + GAME_SLUG, { gizmos: [{ gizmo: 'st-door', copy: true, src: 'features/stickers-core.dc.html#part=star', x: 1, y: 2, w: 128, h: 128 }] });
    check('…and is not promoted twice', r.code === 200 && r.json.promoted.length === 0 && count(fs.readFileSync(GAME_FILE, 'utf8'), 'data-gizmo="st-door"') === 1, r.text);

    // a forced build with no builder: 501, and the keep-bak is not touched
    if (!fs.existsSync(toolPath)) {
      fs.writeFileSync(GAME_FILE + '.keep-bak', 'SENTINEL 2 — a build that cannot run must not write over this');
      const untouched = fs.readFileSync(GAME_FILE, 'utf8');
      r = await ask('POST', '/_lab2/test/build', { manifest: { slug: GAME_SLUG }, force: true });
      check('a forced build with no build-game.js is 501, not a crash', r.code === 501 && r.json && r.json.error === 'build-game.js not built yet', r.code + ' ' + r.text);
      check('…and touched neither the keep-bak nor the page', fs.readFileSync(GAME_FILE + '.keep-bak', 'utf8').startsWith('SENTINEL 2') && fs.readFileSync(GAME_FILE, 'utf8') === untouched);
      r = await ask('POST', '/_lab2/test/build', { manifest: { slug: 'zz-no-folder' } });
      check('a build of a fresh slug with no builder is 501 and makes no folder', r.code === 501 && !fs.existsSync(NO_DIR), r.code + ' ' + r.text);

      // a stub builder for the length of a few requests: the order of gate, backup, build
      stub(toolPath, "module.exports.build = (bundle, opts) => {\n" +
        "  if (bundle.boom) throw new Error('boom');\n" +
        "  if (bundle.scalar) return 'just a string';\n" +
        "  return { ok: true, slug: bundle.manifest.slug, root: opts.root, sawForce: !!bundle.force };\n};");
      const before = fs.readFileSync(GAME_FILE, 'utf8');
      r = await ask('POST', '/_lab2/test/build', { manifest: { slug: GAME_SLUG } });
      check('with a builder present, a page that exists is still refused without force, and nothing is backed up', r.code === 400 && /exists/.test(r.json.error) && fs.readFileSync(GAME_FILE + '.keep-bak', 'utf8').startsWith('SENTINEL 2'), r.text);
      r = await ask('POST', '/_lab2/test/build', { manifest: { slug: GAME_SLUG }, force: true });
      check('a forced build backs the page up as it stood, then builds, and says so', r.code === 200 && r.json.ok === true && r.json.sawForce === true &&
        r.json.backedUp === 'games/' + GAME_SLUG + '/index.html.keep-bak' && fs.readFileSync(GAME_FILE + '.keep-bak', 'utf8') === before, r.text);
      check('the builder was handed the bundle and the sandbox root', r.json.slug === GAME_SLUG && r.json.root === S.HOME, r.text);
      check("the forced build's backup counts as this run's for the save door", S.backedUp.get(GAME_FILE) === true);
      r = await ask('POST', '/_lab2/test/games/' + GAME_SLUG, { gizmos: [{ gizmo: 'st-one', x: 11, y: 12 }] });
      check("…so the next autosave does not write the built page over the owner's arranged one", r.code === 200 && r.json.wrote === true && fs.readFileSync(GAME_FILE + '.keep-bak', 'utf8') === before, r.text);
      r = await ask('POST', '/_lab2/test/build', { manifest: { slug: 'zz-no-folder' }, scalar: true });
      check('a builder answer that is not an object is wrapped, and a fresh slug reports no backup', r.code === 200 && r.json.ok === true && r.json.result === 'just a string' && r.json.backedUp === undefined, r.text);
      r = await ask('POST', '/_lab2/test/build', { manifest: { slug: 'zz-no-folder' }, boom: true });
      check('a builder that throws is 500 with its message', r.code === 500 && r.json && r.json.error === 'boom', r.code + ' ' + r.text);
      r = await ask('GET', '/_lab2/test/default');
      check('…and the server lives', r.code === 200 && r.json.door === true);
      unstub(toolPath);
    } else check('build-game.js is present: the stub-builder checks were skipped', true);

    // the api mount, with a stub function: the shims, and the query that took the server down
    if (!fs.existsSync(vibePath)) {
      stub(vibePath, "module.exports = (req, res) => {\n" +
        "  if (req.query.boom) throw new Error('vibe boom');\n" +
        "  if (req.query.later) return Promise.reject(new Error('later'));\n" +
        "  res.status(202).json({ q: req.query, body: req.body === undefined ? null : (Buffer.isBuffer(req.body) ? 'buffer:' + req.body.length : req.body), raw: req.rawBody.length });\n};");
      r = await ask('GET', '/_lab2/test/vibe?a=1&b=x%20y');
      check('a mounted function gets req.query and res.status().json()', r.code === 202 && r.json && r.json.q.a === '1' && r.json.q.b === 'x y' && r.json.body === null, r.code + ' ' + r.text);
      r = await ask('GET', '/_lab2/test/vibe?%zz=1&ok=%zz');
      check('a % that is not an escape in the query does not bring the server down', r.code === 202 && r.json && r.json.q['%zz'] === '1' && r.json.q.ok === '%zz', r.code + ' ' + r.text);
      r = await ask('POST', '/_lab2/test/vibe', { hello: 'there' });
      check('a JSON body reaches the function parsed, the raw bytes beside it', r.code === 202 && r.json.body && r.json.body.hello === 'there' && r.json.raw === 17, r.text);
      r = await ask('POST', '/_lab2/test/vibe', Buffer.from('abc'), { 'content-type': 'application/octet-stream' });
      check('a body that is not JSON reaches it as a Buffer', r.code === 202 && r.json.body === 'buffer:3', r.text);
      r = await ask('GET', '/_lab2/test/vibe?boom=1');
      check('a function that throws is 500 with its message', r.code === 500 && r.json && r.json.error === 'vibe boom', r.code + ' ' + r.text);
      r = await ask('GET', '/_lab2/test/vibe?later=1');
      check('a function that rejects is 500 too', r.code === 500 && r.json && r.json.error === 'later', r.code + ' ' + r.text);
      r = await ask('GET', '/_lab2/test/default');
      check('…and the server is still up', r.code === 200 && r.json.door === true);
      unstub(vibePath);
    } else check('api/vibe.js is present: the stub-function checks were skipped', true);
  } finally {
    for (const f of STUBS.slice()) unstub(f);
    try { fs.rmSync(EMPTY_DIR, { recursive: true, force: true }); } catch (e) {}
    try { fs.rmSync(NO_DIR, { recursive: true, force: true }); } catch (e) {}
    await new Promise(res => server.close(res));
  }
}

// ── run ───────────────────────────────────────────────────────────────────
(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  try {
    testScanner();
    testEdit();
    testCut();
    testGuard();
    testCopies();
    testVariants();
    testSave();
    testSlugs();
    testMore();
    await testServer();
    await testServerMore();
  } catch (e) {
    check('no exception escaped the tests', false, String((e && e.stack) || e));
  } finally {
    for (const f of STUBS.slice()) unstub(f);
    try { fs.rmSync(GAME_DIR, { recursive: true, force: true }); } catch (e) {}
  }
  const failed = checks.filter(c => !c.ok);
  const summary = { at: new Date().toISOString(), port: PORT, passed: checks.length - failed.length, failed: failed.length, checks };
  fs.writeFileSync(path.join(OUT, 'summary.json'), JSON.stringify(summary, null, 2) + '\n');
  console.log('\n' + summary.passed + ' passed, ' + summary.failed + ' failed → ' + path.relative(S.ROOT, path.join(OUT, 'summary.json')).replace(/\\/g, '/'));
  process.exit(failed.length ? 1 : 0);
})();
