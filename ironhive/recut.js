/* ironhive/recut.js — a Design Canvas export → a machine on this bench.

   USAGE (from C:/Users/bobb9/Desktop/site):
       node ironhive/recut.js gallery
       node ironhive/recut.js comms
       node ironhive/recut.js ballot
       node ironhive/recut.js press
       node ironhive/recut.js <which> "<export.html>" ["<folder of originals>"]
   <which> is a row of FEATURES below: the export it comes from (looked for
   in Downloads/assets unless a path is given), the document it becomes in
   features/, the label its screen root is marked with, and what else about
   the export's shape the script should expect. It writes that document (and,
   for a feature with pictures, features/shots/*.webp) and nothing else: the
   section in index.html is left alone, so a re-export lands where the feature
   already stands, at the size it is already drawn at.

   WHAT IT DOES, and it stops with a message if any step does not find exactly
   the one thing it expects — lab 2's rule (perf/swap-machine.js), because a
   changed export is a thing to look at, not to guess through:

     1 · the document out of the bundle. <script type="__bundler/template"> is
         a JSON string holding the .dc.html, resource UUIDs and all.
     2 · the runtime must BE features/support.js, byte for byte. swap-machine
         only reports a difference; this stops, because a feature booted on a
         runtime it was not exported against fails without saying so.
     3 · the head becomes the bench's (prelude.js, support.js, bare.css), and
         the bundled @font-face block — faces that exist only inside the
         bundle — becomes ../fonts/fonts.css, which must already carry every
         family and weight that block declared. The preconnect to Google goes
         with it: nothing on this bench waits on a third party.
     4 · the pictures, for a feature that has them: every <img src="UUID">
         becomes shots/<name>.webp. WHICH ORIGINAL IS WHICH SLOT IS NOT READ
         OFF THE FILE NAMES. The export carries its own smaller copy of each
         picture, so each copy is matched to the original it was made from by
         a 48×27 grey thumbnail, and a match that is not clear by a wide margin
         stops the script with the table. A feature marked as having none must
         have none.
     5 · the marks frames.js and bare.css read. data-screen-label on the screen
         root is how they tell the sheet from the drawing: the gallery and the
         comms panel shipped without one and get it, the ballot and the press
         shipped with one and it is checked. Unmarked, the backdrop an export
         paints round its drawing would be MEASURED — the drawing would come
         out the size of its viewport — and painted on the bench. A MACHINE
         (the ballot, the press) also gets lab 2's two machine marks, the ones
         perf/swap-machine.js writes: data-lab-sheet on the second
         full-viewport div that carries the export's own zoom, data-lab-nozoom
         on the zoom widget pinned to the corner. And two of the hive's own,
         each where a row names it: data-lab-grab on what a finger drags
         (bare.css gives it touch-action:none) and data-lab-drift on ink that
         moves about (frames.js does not measure it). Nothing else is changed
         but a row's SWAPS (7).
     6 · the originals are resampled to 1920 wide (never up) in real Chrome
         and written as WebP at q0.88 (THE GALLERY, below, says why both).
     7 · a row's SWAPS: exact passages of the export replaced with others — the
         ballot's script, the press's backdrop. Each must be found exactly
         once, so a re-export that has changed one stops here instead of being
         patched blind, and the note written into the document says what they
         do.

   Playwright comes from Desktop/node_modules, with the installed Chrome
   (channel 'chrome'), like every probe on this bench — and only a feature
   with pictures needs it. */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

/* THE BALLOT'S SCRIPT, CHANGED (2026-09-13), and every line of it is the
   ballot being dragged. As exported it would not lift until AYE or NAY was
   marked, and a press on a blank one did nothing at all — which reads as a
   ballot that cannot be dragged, and was reported as exactly that. So it
   lifts either way, and the SLOT is what asks for the mark: a blank ballot
   held over it turns the slot's outline and the ballot's ring red (#b5442c,
   the NAY swatch) instead of green and does not shrink towards it, the
   screen reads MARK YOUR BALLOT FIRST while a blank one is held, and let go
   over the slot it springs back with the hint asking for aye or nay for
   1.8s. And the drag divided the pointer by the zoom the export STORES,
   which on the bench is pinned away (bare.css) — four ctrl+− and it ran
   2.44× the pointer — so it multiplies up the zoom the ballot is DRAWN at
   instead, its own computed zoom and every ancestor's: the stored zoom when
   the file is opened on its own, 1 on the bench. */
const BALLOT_SWAPS = {
  count: 12,
  what: 'a blank ballot lifts and the slot refuses it; the drag follows the zoom it is drawn at',
  note: 'Its script is not quite the export\'s, though: it is changed in twelve places, all of them the ballot '
    + 'being dragged. It lifts whether or not a box is marked, and follows the pointer by the zoom it is drawn at, '
    + 'not the zoom the export stores, which the bench pins at 1; the slot takes only a marked ballot, and a blank '
    + 'one held over it turns the slot and its own ring red instead of green while the screen asks for the mark, '
    + 'and let go it springs back with the hint asking for aye or nay.',
  list: [
    { from: "    if (this.state.phase !== 'mark' || !this.state.choice) return;\n    if (e.button) return;\n    const sx = e.clientX, sy = e.clientY;\n    const z = this.state.zoom || 1;",
      to:   "    if (this.state.phase !== 'mark') return;\n    if (e.button) return;\n    const sx = e.clientX, sy = e.clientY;\n    let z = 1;\n    for (let n = e.currentTarget; n && n.nodeType === 1; n = n.parentElement) z *= parseFloat(getComputedStyle(n).zoom) || 1;" },
    { from: "      if (this.state.overSlot) { this.cast(); return; }\n      this.setState({ draggingBallot: false, overSlot: false, dragDX: 0, dragDY: 0 });",
      to:   "      if (this.state.overSlot && this.state.choice) { this.cast(); return; }\n      const refused = this.state.overSlot;\n      this.setState({ draggingBallot: false, overSlot: false, dragDX: 0, dragDY: 0, refused });\n      if (refused) { clearTimeout(this._t2); this._t2 = setTimeout(() => this.setState({ refused: false }), 1800); }" },
    { from: "lastVote: null, zoom: 1, dragDX: 0, dragDY: 0 };",
      to:   "lastVote: null, zoom: 1, dragDX: 0, dragDY: 0, refused: false };" },
    { from: "    clearTimeout(this._t1);\n    window.removeEventListener('keydown', this.onZoomKey);",
      to:   "    clearTimeout(this._t1);\n    clearTimeout(this._t2);\n    window.removeEventListener('keydown', this.onZoomKey);" },
    { from: "zoom, dragDX, dragDY } = this.state;",
      to:   "zoom, dragDX, dragDY, refused } = this.state;" },
    { from: ": 'MARK YOUR\\nBALLOT';",
      to:   ": ((refused || draggingBallot) ? 'MARK YOUR\\nBALLOT FIRST' : 'MARK YOUR\\nBALLOT');" },
    { from: "ballotCursor: draggingBallot ? 'grabbing' : (choice ? 'grab' : 'default'),",
      to:   "ballotCursor: draggingBallot ? 'grabbing' : 'grab'," },
    { from: "ballotScale: overSlot ? '0.88' :",
      to:   "ballotScale: overSlot && choice ? '0.88' :" },
    { from: "(overSlot ? '10px 12px 0 rgba(23,21,15,0.3), 0 0 0 6px #6f8f7a' :",
      to:   "(overSlot ? '10px 12px 0 rgba(23,21,15,0.3), 0 0 0 6px ' + (choice ? '#6f8f7a' : '#b5442c') :" },
    { from: ": 'mark one box to vote',",
      to:   ": (refused ? 'mark aye or nay first' : 'mark one box to vote')," },
    { from: "hintColor: choice ? '#8f3a1e' : '#413a2f',",
      to:   "hintColor: choice || refused ? '#8f3a1e' : '#413a2f'," },
    { from: "slotOutline: overSlot ? '5px solid #6f8f7a' :",
      to:   "slotOutline: overSlot ? '5px solid ' + (choice ? '#6f8f7a' : '#b5442c') :" }
  ]
};

/* THE PRESS'S BACKDROP, EIGHT PIXELS LOWER (2026-09-13). An opened bulletin
   sits on a dark round padded 44px from the top of the document, and the ✕
   on the paper's corner hangs 18px above the paper — at 26, eight pixels
   above the top of the drawing, which the sheet's own padding puts at 34.
   The bench cuts a frame to its drawing, so those eight pixels were past the
   edge of the box and the ✕ lost the top of itself: 23.6 world px at ×2.95
   (probe-press.js). Padded 52, the ✕ comes to the drawing's top edge and the
   paper's foot to 601, far above the drawing's own. */
const PRESS_SWAPS = {
  count: 1,
  what: 'the dark round an opened bulletin sits on starts 8px lower, so its ✕ is not cut off at the top of the box',
  note: 'One declaration is changed, though: the dark round an opened bulletin sits on is padded 52px from the top '
    + 'rather than 44, because the ✕ on the paper\'s corner hangs 18px above the paper, and at 44 that put its top '
    + 'eight pixels above the drawing and past the edge of the box the bench cuts the frame to.',
  list: [
    { from: 'background: rgba(6,7,6,0.72); display: flex; align-items: flex-start; justify-content: center; padding: 44px 20px 60px; overflow: auto',
      to:   'background: rgba(6,7,6,0.72); display: flex; align-items: flex-start; justify-content: center; padding: 52px 20px 60px; overflow: auto' }
  ]
};

const FEATURES = {
  /* THE GALLERY (2026-09-13): seven screenshots of the game. The originals
     are 3840-wide PNGs of 8–14 MB each; the export carried 1600-wide JPEG
     copies. 1920 is the pixel the paper shows them at: the document draws
     one 928 CSS px wide and the section stands it at twice that
     (data-scale="2"). At q0.82 the window lattices in the busier screenshots
     went to mush; q0.88 holds them. First run's match: best 2.1–4.5 of 255
     against a runner-up of 20 or more. */
  gallery: { exportFile: 'Ironhive Screenshot Gallery.html', doc: 'gallery.dc.html', label: 'Ironhive · Screens', shots: true,
             changed: 'every <img> points into shots/, resampled from the original screenshots rather than the 1600-wide copies the export carried;' },
  /* THE COMMS PANEL (2026-09-13): a mock of the game's community chat —
     channels, a pinned note, the roster, replies, reactions, a typing blip
     and a send box, all in its own memory. No pictures. */
  comms:   { exportFile: 'Ironhive Comms Panel.html', doc: 'comms.dc.html', label: 'Ironhive · Comms', shots: false, changed: '' },
  /* THE COUNCIL BALLOT (2026-09-13): a motion, a paper ballot marked AYE or
     NAY and DRAGGED into the engine's slot, and a tally screen that counts it
     in. It came with its screen root already marked and with lab 2's machine
     furniture — the drawing inside a second full-viewport div carrying the
     export's own zoom, and a +/−/RESET widget pinned to the corner — so it is
     a MACHINE here. The ballot is what a finger drags (grab: as exported, a
     finger's drag was taken for a pan two moves in and slid the bench), and
     the three steam puffs over the chimney are ink that drifts (drift: they
     made the measured height 687 on one load and 735 on the next). It keeps
     its votes in localStorage (ironhive.ballot.v1). Its script is changed
     where BALLOT_SWAPS, above, says. */
  ballot:  { exportFile: 'Ironhive Council Ballot.html', doc: 'ballot.dc.html', label: 'Council Ballot', shots: false, changed: '',
             marked: true, machine: true,
             grab: { tag: '<div sc-camel-on-pointer-down="{{ onBallotDown }}"', count: 1, what: 'the ballot' },
             drift: { style: 'animation: puffA', count: 3, what: 'the steam puffs' },
             swaps: BALLOT_SWAPS },
  /* THE BULLETIN PRESS (2026-09-13): a salvaged web press that runs on its
     own — the cylinder and a gear turning, the platen stamping, the ink
     needle bobbing — above the sheet it has just pressed, beside "the stand"
     of back issues; click any of the five bulletins and it opens over the
     machine and its flap unfolds. Lab 2's machine furniture again, zoom sheet
     and widget, so it is a MACHINE. Nothing in it is dragged, so no grab; its
     two steam puffs rise over the chimney, so drift. It keeps only its zoom in
     localStorage (ironhive.press.zoom.v1). The export ships its five
     bulletins with every headline, kicker and paragraph EMPTY, and so does
     this: the words are the designer's to write, not this script's. Its
     backdrop is moved where PRESS_SWAPS, above, says. */
  press:   { exportFile: 'Ironhive Bulletin Press.html', doc: 'press.dc.html', label: 'Bulletin Press', shots: false, changed: '',
             marked: true, machine: true,
             drift: { style: 'animation: puffC', count: 2, what: 'the steam puffs' },
             swaps: PRESS_SWAPS }
};

const which = process.argv[2];
const F = FEATURES[which];
if (!F) { console.error('usage: node ironhive/recut.js <' + Object.keys(FEATURES).join('|') + '> ["<export.html>"] ["<folder of originals>"]'); process.exit(2); }
const HERE = __dirname;
const DIR = path.join(HERE, 'features');
const SHOTS = path.join(DIR, 'shots');
const exportPath = path.resolve(process.argv[3] || path.join('C:/Users/bobb9/Downloads/assets', F.exportFile));
const originals = path.resolve(process.argv[4] || path.dirname(exportPath));
const WIDTH = 1920, QUALITY = 0.88;

const fail = msg => { console.error('recut ' + which + ': ' + msg); process.exit(1); };
const once = (s, needle, what) => {
  const n = s.split(needle).length - 1;
  if (n !== 1) fail(`expected exactly one ${what}, found ${n}`);
};
['support.js', 'prelude.js', 'bare.css'].forEach(f => {
  if (!fs.existsSync(path.join(DIR, f))) fail(`features/${f} is missing — it is lab 2's, copy it from lab2/features`);
});
if (!!F.marked !== !!F.machine) fail('a row is either an unmarked screen (gallery, comms) or a marked machine (ballot, press) — there is no note written for anything else yet');
if (F.swaps && F.swaps.list.length !== F.swaps.count) fail(`the swaps say ${F.swaps.count} and list ${F.swaps.list.length} — the note written into the document names the count`);

// wrap a paragraph for a CSS comment, the width every comment on the bench keeps to
function wrap(text, first, rest, width) {
  const out = [];
  let line = first, words = 0;              // words on this line — `first` carries the /* and must not count as one
  for (const word of text.split(/\s+/)) {
    if (words && (line + ' ' + word).length > width) { out.push(line); line = rest + word; words = 1; }
    else { line = words ? line + ' ' + word : line + word; words++; }
  }
  out.push(line);
  return out.join('\n');
}

// 1 · the document out of the bundle
const bundle = fs.readFileSync(exportPath, 'utf8');
const grab = type => {
  const open = `<script type="__bundler/${type}">`;
  once(bundle, open, open);
  const i = bundle.indexOf(open) + open.length;
  return bundle.slice(i, bundle.indexOf('</script>', i)).trim();
};
let doc;
try { doc = JSON.parse(grab('template')); } catch (e) { fail('the template did not parse as JSON: ' + e.message); }
if (typeof doc !== 'string') fail('the template is not a string');
doc = doc.replace(/\r\n/g, '\n');
let manifest;
try { manifest = JSON.parse(grab('manifest')); } catch (e) { fail('the manifest did not parse as JSON: ' + e.message); }
const resource = id => {
  const e = manifest[id];
  if (!e) return null;
  const raw = Buffer.from(e.data, 'base64');
  return { mime: e.mime, buf: e.compressed ? zlib.gunzipSync(raw) : raw };
};

// 2 · the runtime
const rt = /<script src="([0-9a-f-]{36})"><\/script>/.exec(doc.slice(0, doc.indexOf('<x-dc>')));
if (!rt) fail('no runtime <script src="UUID"> in the template head');
const runtime = resource(rt[1]);
if (!runtime || !runtime.buf.equals(fs.readFileSync(path.join(DIR, 'support.js'))))
  fail('the bundled runtime is not features/support.js byte for byte — compare them (and lab2/features/support.js) before going on');
console.log('  runtime: the bundled support.js is the bench\'s, byte for byte');

// 3 · the head and the faces
const xi = doc.indexOf('<x-dc>'), bi = doc.lastIndexOf('</body>');
if (xi < 0 || bi < 0) fail('no <x-dc> … </body> in the template');
let body = doc.slice(xi, bi).replace(/\s+$/, '\n');

const PRECONNECT = '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="">\n';
if (body.split(PRECONNECT).length > 2) fail('more than one preconnect to fonts.gstatic.com');
body = body.replace('<helmet>\n' + PRECONNECT, '<helmet>\n');
once(body, '<helmet>\n<style>', 'bundled @font-face <style> at the top of the helmet');
const fs0 = body.indexOf('<helmet>\n<style>') + '<helmet>\n<style>'.length;
const fs1 = body.indexOf('</style>\n', fs0);
const faces = body.slice(fs0, fs1);
const RULE = /@font-face\s*\{[^}]*\}/g;
const rules = faces.match(RULE) || [];
if (!rules.length || faces.replace(RULE, '').replace(/\/\*[\s\S]*?\*\//g, '').trim())
  fail('the first helmet <style> is not only @font-face rules — not the export shape this script knows');
const fontsCss = fs.readFileSync(path.join(HERE, 'fonts', 'fonts.css'), 'utf8');
const wanted = [...new Set(rules.map(r => {
  const fam = /font-family:\s*'([^']+)'/.exec(r), w = /font-weight:\s*(\d+)/.exec(r);
  if (!fam || !w) fail('an @font-face rule without a family or a weight: ' + r.slice(0, 120));
  return fam[1] + '|' + w[1];
}))];
const missing = wanted.filter(k => { const [fam, w] = k.split('|'); return !fontsCss.includes(`font-family:'${fam}';font-style:normal;font-weight:${w};`); });
if (missing.length) fail('fonts/fonts.css has no face for: ' + missing.join(', ').replace(/\|/g, ' ') + ' — add the woff2 and the @font-face there first');
const families = [...new Set(wanted.map(k => k.split('|')[0]))];
console.log('  faces: ' + wanted.join(', ').replace(/\|/g, ' ') + ' (all in fonts/fonts.css)');

body = body.slice(0, body.indexOf('<helmet>\n')) + '<helmet>\n'
  + '<!-- the iron hive serves these faces itself — see SELF-HOSTED in index.html -->\n'
  + '<link rel="stylesheet" href="../fonts/fonts.css">\n'
  + body.slice(fs1 + '</style>\n'.length);

// the hive's own marks, in the note as they are in the markup: either, both or neither
const hiveMarks = [
  F.grab && 'data-lab-grab on ' + F.grab.what + ', which a finger drags and bare.css gives touch-action:none',
  F.drift && 'data-lab-drift on ' + F.drift.what + ', ink that moves about and that frames.js therefore does not measure'
].filter(Boolean);
const marksNote = F.machine
  ? 'the screen root came marked with data-screen-label, the mark frames.js and bare.css tell the sheet from the drawing by, '
    + 'and the bench adds the two marks a machine wears: data-lab-sheet on the full-viewport div that carries the export\'s own zoom, '
    + 'so it is stepped through, drawn clear and pinned at zoom 1, and data-lab-nozoom on the zoom widget pinned to the corner, '
    + 'which is not drawn — the bench has its own camera (bare.css, NO SECOND SHEET). '
    + (hiveMarks.length ? 'The hive adds ' + (hiveMarks.length === 2 ? 'two more: ' : 'one more: ') + hiveMarks.join(', and ') + '. ' : '')
    + 'Opened on its own, the file is still the export, widget, zoom and all. '
  : 'and the screen root wears data-screen-label, which this export shipped without — '
    + 'it is how frames.js and bare.css tell the sheet (the backdrop the export paints round '
    + 'its drawing) from the drawing. Opened on its own, the file is still the export. ';
const note = 'WHAT THE BENCH CHANGED — see features/bare.css. Every line below is the '
  + 'export as it came out of Design Canvas, verbatim, '
  + (F.swaps ? 'but for what the last sentences name. ' : 'and no declaration is changed. ')
  + 'Round it: the head is the bench\'s (prelude.js, support.js, bare.css); the bundled '
  + '@font-face block is ../fonts/fonts.css, where ' + families.join(' and ') + ' are self-hosted; '
  + (F.changed ? F.changed + ' ' : '')
  + marksNote
  + (F.swaps ? F.swaps.note + ' ' : '')
  + 'Written by ../recut.js (' + which + '): for a re-export, run that again rather than editing here.';
once(body, '<style>\n  body {', 'page <style> opening on its body rule');
body = body.replace('<style>\n  body {', () => '<style>\n' + wrap(note, '  /* ', '     ', 78) + ' */\n  body {');

// 5 · the marks — asked of the EXPORT for the label, not of body, whose note above names it
const labelled = /<[^>]*\sdata-screen-label[\s=>]/.test(doc);
if (F.marked) {
  const m = /<\/helmet>\n<div data-screen-label="([^"]*)" style="min-height: 100vh;/.exec(body);
  if (!labelled || !m) fail('this export was expected to come with its screen root marked, right after the helmet — look before going on');
  if (m[1] !== F.label) fail(`its screen root is labelled "${m[1]}", not "${F.label}" — look before going on`);
  if ((doc.match(/\sdata-screen-label=/g) || []).length !== 1) fail('more than one data-screen-label in the export');
} else {
  if (labelled) fail('the export already has a data-screen-label — look before marking a second one');
  const ROOT = '</helmet>\n<div style="min-height: 100vh;';
  once(body, ROOT, 'screen root (the first div after the helmet, min-height: 100vh)');
  body = body.replace(ROOT, `</helmet>\n<div data-screen-label="${F.label}" style="min-height: 100vh;`);
}
if (F.machine) {
  const SHEET = /<div style="([^"]*zoom: \{\{ zoomF \}\}[^"]*)"/g;
  const sheets = (body.match(SHEET) || []).length;
  if (sheets !== 1) fail(`expected exactly one full-viewport div carrying zoom: {{ zoomF }}, found ${sheets}`);
  body = body.replace(/<div style="([^"]*zoom: \{\{ zoomF \}\}[^"]*)"/, (all, style) => '<div data-lab-sheet style="' + style + '"');
  const WIDGET = '<div style="position: fixed; right: 18px; bottom: 18px; z-index: 60;';
  once(body, WIDGET, 'zoom widget (position: fixed; right: 18px; bottom: 18px; z-index: 60)');
  body = body.replace(WIDGET, () => '<div data-lab-nozoom style="position: fixed; right: 18px; bottom: 18px; z-index: 60;');
  console.log('  marks: screen root came labelled "' + F.label + '"; data-lab-sheet and data-lab-nozoom added');
}
if (F.grab) {
  const n = body.split(F.grab.tag).length - 1;
  if (n !== F.grab.count) fail(`expected ${F.grab.count} of ${F.grab.what} (${F.grab.tag}), found ${n}`);
  body = body.split(F.grab.tag).join('<div data-lab-grab' + F.grab.tag.slice(4));
  console.log(`  marks: data-lab-grab on ${F.grab.what}`);
}
if (F.drift) {
  const DRIFT = /<div style="([^"]*)"/g;
  let drifts = 0;
  body = body.replace(DRIFT, (all, style) => {
    if (!style.includes(F.drift.style)) return all;
    drifts++;
    return '<div data-lab-drift style="' + style + '"';
  });
  if (drifts !== F.drift.count) fail(`expected ${F.drift.count} of ${F.drift.what} (${F.drift.style}), found ${drifts}`);
  console.log(`  marks: data-lab-drift on ${F.drift.what} (${drifts})`);
}

// 7 · the swaps — each passage found exactly once, or nothing is written
if (F.swaps) {
  F.swaps.list.forEach((s, n) => {
    const found = body.split(s.from).length - 1;
    if (found !== 1) fail(`swap ${n + 1} of ${F.swaps.list.length}: expected the export to say this exactly once, found ${found} — ${JSON.stringify(s.from)}`);
    body = body.split(s.from).join(s.to);
  });
  console.log(`  swaps: ${F.swaps.list.length} place${F.swaps.list.length === 1 ? '' : 's'} changed — ${F.swaps.what}`);
}

const head = '<!DOCTYPE html>\n<html>\n<head>\n<meta charset="utf-8">\n'
  + '<meta name="viewport" content="width=device-width, initial-scale=1">\n'
  + '<script src="./prelude.js"></script>\n<script src="./support.js"></script>\n'
  + '<!-- the iron hive shows this on its own paper — see features/bare.css -->\n'
  + '<link rel="stylesheet" href="./bare.css">\n</head>\n<body>\n';
const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g;
const write = () => {
  const left = body.match(UUID);
  if (left) fail('bundle UUIDs survived the recut: ' + [...new Set(left)].join(', '));
  fs.writeFileSync(path.join(DIR, F.doc), head + body + '</body>\n</html>\n');
  console.log(`  wrote features/${F.doc}`);
};

// 4 · the pictures
const slots = [...body.matchAll(/<img src="([0-9a-f-]{36})"/g)].map(m => m[1]);
if (!F.shots) {
  if (slots.length) fail(`${slots.length} pictures in an export this script was told has none — give "${which}" shots: true`);
  write();
  return;
}
if (!slots.length) fail('no <img src="UUID"> in the export');
slots.forEach((id, n) => {
  const r = resource(id);
  if (!r || !/^image\//.test(r.mime)) fail(`slot ${n + 1}: ${id} is not an image resource in the manifest`);
});
const candidates = fs.readdirSync(originals).filter(f => /\.(png|jpe?g|webp)$/i.test(f)).sort();
if (candidates.length < slots.length) fail(`${slots.length} pictures in the export but only ${candidates.length} images in ${originals}`);

let chromium;
try { ({ chromium } = require('playwright')); } catch (e) { fail('playwright is not installed where node can find it (Desktop/node_modules)'); }

(async () => {
  const browser = await chromium.launch({ channel: 'chrome' });
  const page = await browser.newPage();
  const out = new Map();
  await page.route('http://recut.local/**', route => {
    const req = route.request(), p = decodeURIComponent(new URL(req.url()).pathname);
    if (p.startsWith('/orig/')) return route.fulfill({ path: path.join(originals, p.slice(6)) });
    if (p.startsWith('/bundled/')) { const r = resource(slots[+p.slice(9)]); return route.fulfill({ body: r.buf, contentType: r.mime }); }
    if (p.startsWith('/out/') && req.method() === 'POST') { out.set(p.slice(5), req.postDataBuffer()); return route.fulfill({ body: 'ok' }); }
    return route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>recut</title>' });
  });
  await page.goto('http://recut.local/');

  const thumbs = await page.evaluate(async ({ candidates, n }) => {
    async function thumb(url) {
      const bmp = await createImageBitmap(await (await fetch(url)).blob(), { resizeWidth: 48, resizeHeight: 27, resizeQuality: 'high' });
      const c = new OffscreenCanvas(48, 27), g = c.getContext('2d');
      g.drawImage(bmp, 0, 0);
      const d = g.getImageData(0, 0, 48, 27).data, a = [];
      for (let i = 0; i < d.length; i += 4) a.push(d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114);
      return a;
    }
    const orig = {}, bundled = [];
    for (const f of candidates) orig[f] = await thumb('/orig/' + encodeURIComponent(f));
    for (let i = 0; i < n; i++) bundled.push(await thumb('/bundled/' + i));
    return { orig, bundled };
  }, { candidates, n: slots.length });

  const dist = (a, b) => a.reduce((t, v, i) => t + Math.abs(v - b[i]), 0) / a.length;
  const table = slots.map((id, n) => {
    const ranked = candidates.map(f => ({ f, d: dist(thumbs.bundled[n], thumbs.orig[f]) })).sort((x, y) => x.d - y.d);
    const best = ranked[0], next = ranked[1] || { f: '—', d: Infinity };
    const num = /screenshot\s*0*(\d+)/i.exec(best.f);
    const name = (num ? 'screenshot' + num[1].padStart(2, '0') : path.basename(best.f, path.extname(best.f)).toLowerCase().replace(/[^a-z0-9]+/g, '-')) + '.webp';
    return { slot: n + 1, uuid: id.slice(0, 8), original: best.f, d: +best.d.toFixed(2), runnerUp: next.f, d2: +next.d.toFixed(2), name };
  });
  console.table(table);
  const unclear = table.filter(r => !(r.d <= 10 && r.d2 >= Math.max(r.d * 2.5, r.d + 8)));
  if (unclear.length) { await browser.close(); fail('no clear original for slot ' + unclear.map(r => r.slot).join(', ') + ' — see the table'); }
  const names = table.map(r => r.name);
  if (new Set(table.map(r => r.original)).size !== table.length || new Set(names).size !== names.length) {
    await browser.close(); fail('two slots came out as the same original — see the table');
  }

  // 6 · the pictures, resampled
  for (const r of table) {
    r.size = await page.evaluate(async ({ file, name, WIDTH, QUALITY }) => {
      const blob = await (await fetch('/orig/' + encodeURIComponent(file))).blob();
      const full = await createImageBitmap(blob);
      const w = Math.min(WIDTH, full.width), h = Math.round(full.height * w / full.width);
      const bmp = await createImageBitmap(blob, { resizeWidth: w, resizeHeight: h, resizeQuality: 'high' });
      const c = new OffscreenCanvas(w, h);
      c.getContext('2d').drawImage(bmp, 0, 0);
      const webp = await c.convertToBlob({ type: 'image/webp', quality: QUALITY });
      if (webp.type !== 'image/webp') throw new Error('this Chrome would not encode WebP');
      await fetch('/out/' + encodeURIComponent(name), { method: 'POST', body: webp });
      return `${full.width}×${full.height} → ${w}×${h}`;
    }, { file: r.original, name: r.name, WIDTH, QUALITY });
  }
  await browser.close();

  // and only now, with everything in hand, anything written
  table.forEach((r, n) => { body = body.split(`<img src="${slots[n]}"`).join(`<img src="shots/${r.name}"`); });
  write();
  fs.mkdirSync(SHOTS, { recursive: true });
  let total = 0;
  for (const r of table) {
    const buf = out.get(r.name);
    fs.writeFileSync(path.join(SHOTS, r.name), buf);
    total += buf.length;
    console.log(`  slot ${r.slot}: ${r.original} (${r.size}) → shots/${r.name}, ${(buf.length / 1024).toFixed(0)} KB`);
  }
  const stale = fs.readdirSync(SHOTS).filter(f => !names.includes(f));
  if (stale.length) console.log('  ! in shots/ and no longer used (delete them by hand): ' + stale.join(', '));
  console.log(`  and ${table.length} pictures, ${(total / 1024).toFixed(0)} KB between them`);
})().catch(e => fail(e.stack || e.message));
