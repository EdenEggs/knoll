#!/usr/bin/env node
/* ─── TEST-BUILD-GAME ─────────────────────────────────────────────────────
   press/tools/test-build-game.js — the refutation of build-game.js (plan §9
   5.2–5.3). It builds all three fixtures into games/<slug>/ the way the
   command line does — press/theme.js and press/fonts.js through
   lib/fixture-theme.js, press/style.js's forPreset over the Phase-3 golden
   in fixtures/<name>/stats.json, press/recipes.js's choose + resolve, all of
   them loaded in Node through lib/browser-module.js, and one headless
   Playwright page for the pictures and the type — and then tries to catch
   the result out.

       node lab2/test/press/tools/test-build-game.js        (from site/)

   No server: the builder fetches nothing, so this needs neither 4322 nor
   4321. It DOES write games/pixelfort/, games/mosslight/ and
   games/neonrun/ — the three pages are the artefact of the phase — and it
   forces over them, which means it also exercises the backup. Nothing
   outside games/<those three>/ and perf/results/build-game/ is written, and
   nothing anywhere is deleted.

   WHAT IT ASKS, in the order the plan and the task ask it:

   1  game.json validates against press/schemas/game.schema.json through
      lib/validate.js — the whole envelope, which pulls in the manifest,
      analysis, theme, style and layout schemas by $ref. Not "the builder
      said it was fine": the file is read back off the disk and checked here.
   2  every asset in it exists on the disk, its sha256 is the sha256 of those
      bytes, its w/h are the ones the file's own header declares
      (lib/imagebytes.js), its long edge is inside §5.3's cap for its role,
      and its `alpha` is true only for a file whose container can carry one.
   3  the page holds ONE SECTION PER SLOT the builder did not skip, each slot
      in z order, each id unique, and every one of them the five-line shape:
      a sticker's data-src matches kits.js's own SRC_RE and resolves to a
      file, a pic's data-w/-h are its asset's pixel size and its <image>
      href is a file that is there.
   4  no placeholder survives: not one '{{' anywhere in the page, and the
      values that were substituted are the ones the bundle carried (the
      token block is theme.css to the byte, data-sk-style parses back to the
      style vector, data-open is the layout's four numbers).
   5  the copies markers and the anchor line are BYTE-IDENTICAL to the three
      constants in serve.js — read out of serve.js's source here, not
      retyped — because keep.js appends between them and a page whose
      markers differ by a space is a page that cannot be saved.
   6  a rebuild with no force is refused and CHANGES NOTHING (the page's md5
      before and after), and a forced one writes index.html.keep-bak with
      the bytes the page had before it.
   7  two forced builds in a row make the same page byte for byte — the
      generator is deterministic, or the owner's diff is noise.
   8  THE DOOR'S ROAD, which the command line never takes: the same bundle
      posted with `images` — the art it just wrote, as base64 — writes those
      bytes through unchanged (§5.3) and still gets the sizes and the sha256
      right, and a bundle with a corrupted picture, a bad slug or a slot kind
      nobody knows is refused rather than half-written.

   WHAT IT REPORTS (the task asks for these three): each page's section count
   and byte size, and each art folder's size. Everything lands in
   perf/results/build-game/summary.json (CONTRACTS §11), and the numbers in
   press/CHANGELOG.md's Phase 5 entry are that file's.

   Exit 1 on any FAIL. ──────────────────────────────────────────────────── */
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const HERE = __dirname;
const TEST = path.resolve(HERE, '..', '..');
const FIXTURES = path.join(TEST, 'press', 'fixtures');
const GAMES = path.join(TEST, 'games');
const OUT = path.join(TEST, 'perf', 'results', 'build-game');
const NAMES = ['pixelfort', 'mosslight', 'neonrun'];

const BG = require('./build-game.js');
const IMG = require('./lib/imagebytes.js');
const Validate = require('./lib/validate.js');

/* kits.js's own regex, lifted out of its source rather than retyped: a
   sticker's data-src has to match the file that will read it, and a copy of
   a regex in a test is a copy that can go stale. */
function kitsSrcRe() {
  const src = fs.readFileSync(path.join(TEST, 'kits.js'), 'utf8');
  const m = /const SRC_RE = (\/.*\/);/.exec(src);
  if (!m) throw new Error('kits.js: SRC_RE is not where this test looks for it');
  return eval(m[1]);                                   // eslint-disable-line no-eval — the file's own literal, read a line ago
}

/* serve.js's three constants, the same way. */
function serveConstants() {
  const src = fs.readFileSync(path.join(TEST, 'serve.js'), 'utf8');
  const pick = name => {
    const m = new RegExp('const ' + name + "\\s*=\\s*'((?:[^'\\\\]|\\\\.)*)';").exec(src);
    if (!m) throw new Error('serve.js: no ' + name);
    return m[1].replace(/\\'/g, "'").replace(/\\\\/g, '\\');
  };
  return { MARK_TOP: pick('MARK_TOP'), MARK_END: pick('MARK_END'), ANCHOR: pick('ANCHOR') };
}

const results = [];
let fails = 0;
function check(name, ok, info) {
  ok = !!ok;
  results.push({ name, ok, info: info == null ? undefined : String(info) });
  if (!ok) fails++;
  console.log((ok ? 'PASS ' : 'FAIL ') + name + (info != null ? ' — ' + info : ''));
}
const md5 = f => crypto.createHash('md5').update(fs.readFileSync(f)).digest('hex');
const dirBytes = d => fs.readdirSync(d).reduce((n, f) => n + fs.statSync(path.join(d, f)).size, 0);

/* every <section class="gz…"> on the page, with its attributes, read the way
   serve.js reads them: find the tag, then the attribute inside it. A regex
   over the whole file would find the word `data-src` in a comment. */
function sections(html) {
  const out = [];
  const re = /<section class="([^"]*)"([\s\S]*?)>/g;
  let m;
  while ((m = re.exec(html))) {
    const tag = m[2];
    const attr = n => { const a = new RegExp(' ' + n + '="([^"]*)"').exec(tag); return a ? a[1] : null; };
    out.push({
      cls: m[1], at: m.index,
      id: attr('id'), gizmo: attr('data-gizmo'), src: attr('data-src'),
      w: attr('data-w'), h: attr('data-h'), scale: attr('data-scale'),
      x: attr('data-home-x'), y: attr('data-home-y'), z: attr('data-home-z'),
      rot: attr('data-rot'), text: attr('data-text'), palette: attr('data-palette'),
      style: attr('style')
    });
  }
  return out;
}

async function main() {
  const SRC_RE = kitsSrcRe();
  const SERVE = serveConstants();
  check('serve.js\'s markers are this builder\'s', BG.MARK_TOP === SERVE.MARK_TOP && BG.MARK_END === SERVE.MARK_END && BG.ANCHOR === SERVE.ANCHOR,
    'MARK_TOP/MARK_END/ANCHOR byte-identical to serve.js\'s');

  const report = {};
  for (const name of NAMES) {
    const dir = path.join(GAMES, name);
    const page = path.join(dir, 'index.html');
    const warnings = [];
    const bundle = BG.bundleFromFolder(path.join(FIXTURES, name), warnings);
    const had = fs.existsSync(page);
    bundle.force = true;

    const res = await BG.build(bundle, { root: TEST, srcDir: bundle.srcDir, now: '2026-09-07T00:00:00.000Z' });
    check(name + ': the build says ok', res.ok, res.ok ? res.files.length + ' files' : res.error);
    if (!res.ok) continue;
    const html = fs.readFileSync(page, 'utf8');
    const game = JSON.parse(fs.readFileSync(path.join(dir, 'game.json'), 'utf8'));

    // 1 — the envelope
    const pool = Validate.loadDir(path.join(TEST, 'press', 'schemas'));
    const errs = Validate.check(game, 'game.schema.json', pool);
    check(name + ': game.json validates against game.schema.json', errs.length === 0, errs.map(e => (e.path || '(root)') + ' ' + e.message).join('; ') || 'no errors');

    // 2 — the pictures
    let artOk = true, artWhy = [];
    for (const a of game.manifest.assets) {
      const f = path.join(dir, a.file);
      if (!fs.existsSync(f)) { artOk = false; artWhy.push(a.file + ' is not there'); continue; }
      const bytes = fs.readFileSync(f);
      const sha = crypto.createHash('sha256').update(bytes).digest('hex');
      if (sha !== a.sha256) { artOk = false; artWhy.push(a.file + ' sha256 ' + sha.slice(0, 12) + ' ≠ ' + a.sha256.slice(0, 12)); }
      let head = null;
      try { head = IMG.read(bytes); } catch (e) { artOk = false; artWhy.push(a.file + ': ' + e.message); }
      if (head) {
        if (head.w !== a.w || head.h !== a.h) { artOk = false; artWhy.push(a.file + ' is ' + head.w + '×' + head.h + ', the manifest says ' + a.w + '×' + a.h); }
        const cap = BG.CAP[a.role];
        if (head.longEdge > cap) { artOk = false; artWhy.push(a.file + ' long edge ' + head.longEdge + ' > the ' + a.role + ' cap ' + cap); }
        const ext = path.extname(a.file).slice(1);
        if (ext !== IMG.EXT[head.type]) { artOk = false; artWhy.push(a.file + ' is a ' + head.type); }
        if (a.alpha && head.type !== 'png') { artOk = false; artWhy.push(a.file + ' claims alpha and is a ' + head.type); }
      }
    }
    check(name + ': every art file is there, hashes, and is inside its cap', artOk, artWhy.join('; ') || game.manifest.assets.length + ' assets');

    // 3 — one section per slot, in z order
    const secs = sections(html);
    const kept = game.layout.slots.filter(s => ['pic', 'sticker', 'note', 'sign'].indexOf(s.kind) >= 0 && !(s.kind === 'pic' && !game.manifest.assets.some(a => a.id === s.ref)));
    const counted = res.sections.pic + res.sections.sticker + res.sections.note + res.sections.sign;
    /* one section per slot, PLUS one more for every framed screenshot: a
       sticker slot carrying `image` is written as the frame AND a gz-pic
       clipped into its image-slot (build-game.js, THE SCREENSHOTS IN THEIR
       FRAMES), so the page has more sections than the layout has slots and
       the two counts are checked apart. */
    const framed = game.layout.slots.filter(s => s.kind === 'sticker' && s.image).length;
    check(name + ': one section per slot, and one more per framed screenshot',
      secs.length === counted + res.sections.shot && counted + res.sections.skipped === game.layout.slots.length && res.sections.shot === framed,
      secs.length + ' sections = ' + counted + ' for ' + game.layout.slots.length + ' slots (' + res.sections.skipped + ' skipped, kept ' + kept.length + ') + ' + res.sections.shot + ' shots for ' + framed + ' image-slots');
    check(name + ': every gizmo id is unique', new Set(secs.map(s => s.gizmo)).size === secs.length, secs.length + ' ids');
    check(name + ': id is gz- + data-gizmo on every section', secs.every(s => s.id === 'gz-' + s.gizmo), '');
    const zs = secs.map(s => (s.z == null ? 0 : +s.z));
    check(name + ': the sections are in z order', zs.every((v, i) => !i || zs[i - 1] <= v), zs.join(' '));
    check(name + ': every section carries the five-line chrome', secs.every(s => {
      const end = html.indexOf('</section>', s.at);
      const body = html.slice(s.at, end);
      return body.indexOf('<span class="gz-dim"') > 0 && body.indexOf('class="gz-size" data-nodrag') > 0;
    }), '');

    const stickers = secs.filter(s => s.src);
    let srcOk = true, srcWhy = [];
    for (const s of stickers) {
      if (!SRC_RE.test(s.src)) { srcOk = false; srcWhy.push(s.gizmo + ': ' + s.src + ' does not match kits.js SRC_RE'); }
      const f = path.resolve(dir, s.src.split('#')[0]);
      if (!fs.existsSync(f)) { srcOk = false; srcWhy.push(s.gizmo + ': ' + s.src + ' resolves to nothing'); }
      if (s.w !== '134' || s.h !== '135') { srcOk = false; srcWhy.push(s.gizmo + ': data-w/h ' + s.w + '×' + s.h + ', not the sheet\'s 134×135'); }
    }
    check(name + ': every sticker\'s data-src matches kits.js and resolves', srcOk, srcWhy.join('; ') || stickers.length + ' stickers');

    const pics = secs.filter(s => s.cls.indexOf('gz-pic') >= 0 && s.cls.indexOf('gz-shot') < 0);
    let picOk = true, picWhy = [];
    for (const p of pics) {
      const slot = game.layout.slots.filter(s => s.kind === 'pic').find(s => 'pic-' + s.ref === p.gizmo);
      const asset = game.manifest.assets.find(a => 'pic-' + a.id === p.gizmo);
      if (!asset) { picOk = false; picWhy.push(p.gizmo + ': no asset'); continue; }
      if (+p.w !== asset.w || +p.h !== asset.h) { picOk = false; picWhy.push(p.gizmo + ': data-w/h ' + p.w + '×' + p.h + ' ≠ the asset\'s ' + asset.w + '×' + asset.h); }
      if (slot && slot.scale && slot.scale !== 1 && +p.scale !== slot.scale) { picOk = false; picWhy.push(p.gizmo + ': data-scale ' + p.scale + ' ≠ the slot\'s ' + slot.scale); }
      const body = html.slice(p.at, html.indexOf('</section>', p.at));
      const href = /<image href="([^"]+)"/.exec(body);
      if (!href) { picOk = false; picWhy.push(p.gizmo + ': no <image href>'); continue; }
      if (href[1] !== asset.file) { picOk = false; picWhy.push(p.gizmo + ': href ' + href[1] + ' ≠ ' + asset.file); }
      if (!fs.existsSync(path.join(dir, href[1]))) { picOk = false; picWhy.push(p.gizmo + ': ' + href[1] + ' is not on the disk'); }
      const vb = /viewBox="0 0 (\d+) (\d+)"/.exec(body);
      if (!vb || +vb[1] !== asset.w || +vb[2] !== asset.h) { picOk = false; picWhy.push(p.gizmo + ': viewBox is not the asset\'s box'); }
    }
    check(name + ': every gz-pic is its asset\'s pixel size and points at it', picOk, picWhy.join('; ') || pics.length + ' pictures');

    /* THE FRAMED SCREENSHOTS. Each one is a gz-shot prop whose world box is
       the frame part's own image-slot rect, mapped through the sticker slot
       it belongs to: x = slot.x + rect.x × scale and so on, the rect turned
       by its own tilt plus the section's data-rot about (64, 64). The rect is
       read back out of the SHEET here, the same place build-game.js reads it,
       so what is checked is the arithmetic and not a second copy of the
       numbers. The picture must also be ON TOP of its frame in the markup:
       the frame's image-slot layer is opaque paper and would cover it. */
    const RECTS = BG.sheetSlots(TEST, []);
    const shots = secs.filter(s => s.cls.indexOf('gz-shot') >= 0);
    let shotOk = true, shotWhy = [];
    for (const sh of shots) {
      /* which picture this is, by the file it points at rather than by
         unpicking its gizmo: an asset id may itself end in a number
         (shot-1), and so may the suffix a repeated gizmo takes. */
      const body0 = html.slice(sh.at, html.indexOf('</section>', sh.at));
      const file = (/<image href="([^"]+)"/.exec(body0) || [])[1];
      const asset = game.manifest.assets.find(a => a.file === file);
      const slot = asset && game.layout.slots.find(s => s.kind === 'sticker' && s.image === asset.id
        && Math.round(BG.shotGeom(s, RECTS[s.ref] || { x: 0, y: 0, w: 1, h: 1, rot: 0 }).x) === +sh.x);
      if (!asset || !slot) { shotOk = false; shotWhy.push(sh.gizmo + ': no asset or no slot for ' + file); continue; }
      const rect = RECTS[slot.ref];
      if (!rect) { shotOk = false; shotWhy.push(sh.gizmo + ': the sheet has no image-slot for ' + slot.ref); continue; }
      const g = BG.shotGeom(slot, rect);
      if (+sh.x !== Math.round(g.x) || +sh.y !== Math.round(g.y)) { shotOk = false; shotWhy.push(sh.gizmo + ': at ' + sh.x + ',' + sh.y + ' not ' + Math.round(g.x) + ',' + Math.round(g.y)); }
      if (+sh.w !== g.bw || +sh.h !== g.bh) { shotOk = false; shotWhy.push(sh.gizmo + ': box ' + sh.w + ' by ' + sh.h + ' not ' + g.bw + ' by ' + g.bh); }
      const body = html.slice(sh.at, html.indexOf('</section>', sh.at));
      if (body.indexOf('preserveAspectRatio="xMidYMid slice"') < 0) { shotOk = false; shotWhy.push(sh.gizmo + ': the picture is not clipped to COVER its slot'); }
      const href = /<image href="([^"]+)"/.exec(body);
      if (!href || href[1] !== asset.file) { shotOk = false; shotWhy.push(sh.gizmo + ': href ' + (href && href[1]) + ' is not ' + asset.file); }
      if (body.indexOf('viewBox="0 0 ' + asset.w + ' ' + asset.h + '"') < 0) { shotOk = false; shotWhy.push(sh.gizmo + ': the inner viewBox is not the asset box'); }
      const frame = secs.filter(s => s.src && s.src.indexOf('#part=' + slot.ref) > 0).find(s => s.at < sh.at && +s.x === Math.round(slot.x));
      if (!frame) { shotOk = false; shotWhy.push(sh.gizmo + ': its frame is not written before it, so the frame would cover the picture'); }
      const want = slot.rot ? String(Math.round(slot.rot * 100) / 100) : null;
      if (frame && (frame.rot || null) !== want) { shotOk = false; shotWhy.push(sh.gizmo + ': the frame turns ' + frame.rot + ' and the slot says ' + slot.rot); }
    }
    check(name + ': every screenshot sits in its frame slot, over the frame, clipped to cover',
      shotOk && shots.length === framed, shotWhy.join('; ') || shots.length + ' screenshots, at the sheet own slot rects');

    // 4 — nothing left to substitute
    const left = (html.match(/\{\{[^}]*\}\}/g) || []);
    check(name + ': no placeholder survives', left.length === 0 && html.indexOf('{{') < 0, left.join(' ') || 'no {{ anywhere');
    check(name + ': the token block is theme.css to the byte', html.indexOf('<style>' + game.theme.css + '</style>') > 0, game.theme.css.length + ' B');
    const skm = /data-sk-style='([^']*)'/.exec(html);
    let sk = null;
    try { sk = JSON.parse((skm ? skm[1] : '').replace(/&#39;/g, "'").replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')); } catch (e) { /* reported below */ }
    check(name + ': data-sk-style parses back to the style vector', sk && JSON.stringify(sk) === JSON.stringify(game.style), sk ? JSON.stringify(sk).slice(0, 90) : 'it did not parse');
    const openm = /data-open="([^"]*)" data-open-narrow="([^"]*)"/.exec(html);
    const wide = [game.layout.open.x, game.layout.open.y, game.layout.open.w, game.layout.open.h].map(Math.round).join(',');
    check(name + ': data-open is the layout\'s rectangle', openm && openm[1] === wide, openm ? openm[1] + ' vs ' + wide : 'no data-open');
    check(name + ': data-open-narrow is four numbers', openm && /^-?\d+,-?\d+,\d+,\d+$/.test(openm[2]), openm ? openm[2] : '');
    check(name + ': the page is scoped to games/' + name, html.indexOf('data-lab-page="games/' + name + '"') > 0, 'CONTRACTS §0');
    const posters = path.join(dir, 'posters', 'index.json');
    check(name + ': the folder holds posters/index.json', fs.existsSync(posters) && fs.readFileSync(posters, 'utf8').trim() === '{}',
      'frames.js asks for it relative to the page before anything boots');

    // 5 — the markers
    check(name + ': the copies block is serve.js\'s, byte for byte',
      html.indexOf(SERVE.MARK_TOP) > 0 && html.indexOf(SERVE.MARK_END) > html.indexOf(SERVE.MARK_TOP) && html.indexOf('\n' + SERVE.ANCHOR + '\n') > 0,
      'markers and the ' + JSON.stringify(SERVE.ANCHOR) + ' anchor');

    // 6 — the guards
    const before = md5(page), bakBefore = fs.existsSync(page + '.keep-bak') ? md5(page + '.keep-bak') : null;
    const refused = await BG.build(Object.assign({}, bundle, { force: false }), { root: TEST, srcDir: bundle.srcDir });
    check(name + ': a rebuild with no force is refused', !refused.ok && /exists/.test(refused.error || ''), refused.error || 'it built anyway');
    check(name + ': …and the page is untouched', md5(page) === before, before.slice(0, 12));

    // 7 — and a forced one is deterministic, and backs the page up first
    const again = await BG.build(bundle, { root: TEST, srcDir: bundle.srcDir, now: '2026-09-07T00:00:00.000Z' });
    check(name + ': a forced rebuild writes index.html.keep-bak', again.ok && fs.existsSync(page + '.keep-bak') && again.files.indexOf('games/' + name + '/index.html.keep-bak') >= 0, 'keep-bak listed in files[]');
    check(name + ': the keep-bak is the page as it stood', fs.existsSync(page + '.keep-bak') && md5(page + '.keep-bak') === before, before.slice(0, 12) + (bakBefore ? ' (there was an older one: ' + bakBefore.slice(0, 12) + ')' : ''));
    check(name + ': two forced builds make the same page, byte for byte', md5(page) === before, md5(page).slice(0, 12) + ' vs ' + before.slice(0, 12));

    // 8 — the door's road: the same bundle with the art as base64
    const images = {};
    for (const a of game.manifest.assets) images[a.id] = fs.readFileSync(path.join(dir, a.file)).toString('base64');
    const door = await BG.build(Object.assign({}, bundle, { images, force: true }), { root: TEST, now: '2026-09-07T00:00:00.000Z' });
    check(name + ': the door\'s bundle (images as base64) builds', door.ok, door.ok ? door.art.map(a => a.how).join(', ') : door.error);
    check(name + ': …and writes the bytes it was sent, unchanged', door.ok && door.art.every(a => a.how === 'as sent')
      && JSON.stringify(door.art.map(a => [a.file, a.w, a.h, a.bytes])) === JSON.stringify(res.art.map(a => [a.file, a.w, a.h, a.bytes])), '');
    check(name + ': …and the page is the same page', md5(page) === before, '');

    const art = path.join(dir, 'art');
    report[name] = {
      sections: res.sections, page: fs.statSync(page).size, gameJson: fs.statSync(path.join(dir, 'game.json')).size,
      art: dirBytes(art), artFiles: res.art, type: res.type, recipe: game.layout.recipe,
      open: openm && openm[1], openNarrow: openm && openm[2], warnings: res.warnings
    };
    const tmp = fs.readdirSync(dir).filter(f => /\.tmp$/.test(f)).concat(fs.readdirSync(art).filter(f => /\.tmp$/.test(f)));
    check(name + ': no .tmp is left behind', tmp.length === 0, tmp.join(' ') || 'clean');
  }

  /* ── the three sticker words, which no recipe emits yet ───────────────────
     data-palette, data-text and data-rot are per-section variants (CONTRACTS
     §7) and Appendix E's recipes only ever ask for the last two, so the
     spelling of the first is checked on the writer itself rather than on a
     page. The form is serve.js's: double quotes on the tag, the JSON's own
     quotes as &quot;, rot to two decimals and clamped to kits.js's ±45. */
  {
    const w = [];
    const tag = BG.stickerSection({ kind: 'sticker', ref: 'tag-wishlist', x: 10, y: 20, z: 3, scale: 2, rot: -3.456, text: 'WISH "LIST"', palette: { skPrimary: '#ff2fb0', skInk: '#26212a' } }, 'sticker-tag', 'a tag', w);
    check('variants: data-palette is double-quoted with &quot; inside',
      tag.indexOf('data-palette="{&quot;skPrimary&quot;:&quot;#ff2fb0&quot;,&quot;skInk&quot;:&quot;#26212a&quot;}"') > 0, 'CONTRACTS §7');
    check('variants: data-text is escaped', tag.indexOf('data-text="WISH &quot;LIST&quot;"') > 0, '');
    check('variants: data-rot keeps two decimals', tag.indexOf('data-rot="-3.46"') > 0, 'serve.js variantValue');
    check('variants: they sit in front of style=, as serve.js writes them',
      tag.indexOf('data-palette') < tag.indexOf(' style="') && tag.indexOf('data-rot') < tag.indexOf(' style="'), '');
    check('variants: the box is 134 × 135 × the scale', tag.indexOf('style="width:268px;height:270px"') > 0, 'SK_BOX + spill, times 2');
    const spun = BG.stickerSection({ kind: 'sticker', ref: 'burst', x: 0, y: 0, rot: 88 }, 'sticker-spun', 'burst', w);
    check('variants: a rot past ±45 is clamped and said so', spun.indexOf('data-rot="45"') > 0 && w.some(t => /clamped/.test(t)), w.filter(t => /clamped/.test(t))[0]);
  }

  /* ── a slot kind v1 does not write ────────────────────────────────────────
     A machine slot is skipped with a warning and everything else is still
     built (plan §16 q3). Built over pixelfort with force, then pixelfort is
     rebuilt from its own bundle so the page that ships is the recipe's — and
     the md5 says it is. */
  {
    const page = path.join(GAMES, 'pixelfort', 'index.html');
    const good = md5(page);
    const w = [];
    const b = BG.bundleFromFolder(path.join(FIXTURES, 'pixelfort'), w);
    b.force = true;
    b.layout = JSON.parse(JSON.stringify(b.layout));
    b.layout.slots.push({ kind: 'machine', ref: 'trailer', x: 0, y: 1200, z: 99 });
    const r = await BG.build(b, { root: TEST, srcDir: b.srcDir, now: '2026-09-07T00:00:00.000Z' });
    const before = await BG.build(Object.assign({}, b, { layout: BG.bundleFromFolder(path.join(FIXTURES, 'pixelfort'), []).layout }), { root: TEST, srcDir: b.srcDir, now: '2026-09-07T00:00:00.000Z' });
    check('a machine slot is skipped, and every other section is still written',
      r.ok && r.sections.skipped === 1 && r.warnings.some(t => /machines are not in v1/.test(t))
      && r.sections.pic === before.sections.pic && r.sections.sticker === before.sections.sticker
      && r.sections.note === before.sections.note && r.sections.sign === before.sections.sign,
      r.ok ? 'skipped ' + r.sections.skipped + ' of ' + b.layout.slots.length + ' slots, wrote the other ' + (b.layout.slots.length - 1) : r.error);
    const back = BG.bundleFromFolder(path.join(FIXTURES, 'pixelfort'), []);
    back.force = true;
    await BG.build(back, { root: TEST, srcDir: back.srcDir, now: '2026-09-07T00:00:00.000Z' });
    check('…and pixelfort is put back as the recipe laid it out', md5(page) === good, good.slice(0, 12));
  }

  /* ── the refusals, on a bundle that is deliberately wrong ─────────────── */
  const w2 = [];
  const base = BG.bundleFromFolder(path.join(FIXTURES, 'pixelfort'), w2);
  const bad = async (label, mut, want) => {
    const b = JSON.parse(JSON.stringify({ manifest: base.manifest, analysis: base.analysis, theme: base.theme, style: base.style, layout: base.layout }));
    b.force = true;
    mut(b);
    const r = await BG.build(b, { root: TEST, srcDir: base.srcDir });
    check('refused: ' + label, !r.ok && want.test(r.error || ''), r.ok ? 'it BUILT' : r.error);
  };
  await bad('a slug that is not one', b => { b.manifest.slug = 'Pixel Fort'; }, /not one/);
  await bad('a manifest with no rights', b => { delete b.manifest.rights; }, /rights/);
  await bad('a style with an unknown preset', b => { b.style.preset = 'sparkly'; }, /preset/);
  await bad('a layout with no slots', b => { b.layout.slots = []; }, /no slots/);
  await bad('bytes at the door that are not a picture', b => {
    b.slug = 'pixelfort';
    b.images = {}; for (const a of b.manifest.assets) b.images[a.id] = Buffer.from('this is not a png').toString('base64');
  }, /not a PNG/);

  /* ── the report the task asks for ─────────────────────────────────────── */
  console.log('\n  page                sections                                   page B   game.json   art B');
  for (const n of NAMES) {
    const r = report[n];
    if (!r) continue;
    const s = r.sections;
    console.log('  ' + n.padEnd(12) + ('pic ' + s.pic + ', sticker ' + s.sticker + ', note ' + s.note + ', sign ' + s.sign + ', skipped ' + s.skipped).padEnd(46)
      + String(r.page).padStart(7) + String(r.gameJson).padStart(11) + String(r.art).padStart(9));
  }
  for (const n of NAMES) {
    const r = report[n];
    if (!r) continue;
    console.log('\n  ' + n + ' — ' + r.recipe + ', type ' + r.type.family + (r.type.measured ? ' (measured in a page)' : ' (FALLBACK advance)')
      + (r.type.tracking ? ', chip tracking by ' + r.type.tracking : ''));
    for (const a of r.artFiles) console.log('      ' + a.file.padEnd(24) + String(a.w + '×' + a.h).padEnd(11) + String(a.bytes).padStart(8) + ' B' + (a.src ? '   ' + (a.bytes / a.src).toFixed(2) + '× the source PNG' : ''));
    for (const t of r.type.notes) console.log('      ' + t.gizmo.padEnd(24) + 'width ' + t.width + ', box ' + t.h + ' (the recipe estimated ' + t.was + '): '
      + t.measured.map(m => m.role + ' ' + m.size + 'px ×' + m.lines + (m.em ? ' at ' + m.em + ' em/char, ' + m.chars + ' chars a line' : '')).join('; '));
    for (const w of r.warnings) console.log('      ! ' + w);
  }

  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, 'summary.json'), JSON.stringify({
    date: new Date().toISOString(),
    caps: BG.CAP, quality: BG.WEBP_Q, fallbackAdvance: BG.FALLBACK_ADVANCE,
    pages: report, results
  }, null, 2));
  const n = results.length;
  console.log('\n' + (n - fails) + '/' + n + ' checks pass' + (fails ? ', ' + fails + ' FAIL' : '') + ' — ' + path.join(OUT, 'summary.json'));
  process.exit(fails ? 1 : 0);
}

main().catch(e => { console.error(String((e && e.stack) || e)); process.exit(1); });
