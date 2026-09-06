/* lab2/perf/swap-machine.js — a Design Canvas export → a machine on the bench.
   Steps 1–4 of about.md §8 (and ADDING.md §3, steps 1–2), done the same way
   every time, so a re-export of a machine is one command and not an
   afternoon of remembering which attribute goes where.

   USAGE (from C:/Users/bobb9/Desktop/site):
       node lab2/perf/swap-machine.js "<export.html>" <name> [outdir]
       node lab2/perf/swap-machine.js "C:/Users/bobb9/Downloads/features/Prize-O-Tron.html" prize-o-tron
   Writes <outdir>/<name>.dc.html — lab2/features by default. Then put the
   section in index.html if it is new, and rebuild the posters:
       node lab2/perf/posters.js          (serve.js up)

   WHAT IT DOES, in order, and it stops with a message if any step does not
   find exactly the one thing it expects (a changed export format is a thing
   to look at, not to guess through):

     1 · the export is a bundler page: the real document is JSON-encoded in
         <script type="__bundler/template">. Pull it out, JSON.parse it.
     2 · the head is swapped for the bench's — prelude.js, support.js,
         bare.css — copied verbatim from the head every other feature has.
         (The bundled support.js is compared against features/support.js
         and the difference, if any, is reported: a runtime that moved on is
         the one thing this script cannot paper over.)
     3 · the bundled @font-face blocks (UUID blobs that only exist inside the
         bundle) are dropped with the rest of the head, and
         ../fonts/fonts.css is linked at the top of the helmet instead — the
         faces are self-hosted, see SELF-HOSTED in index.html. A face the
         export asks Google for that fonts.css does not have is reported.
     4 · three attributes are added and no declaration is changed:
           data-lab-nopaper  the paper grain (the full-bleed noise overlay)
           data-lab-sheet    the second full-viewport div the export wraps
                             the drawing in — the one carrying `zoom:` —
                             which frames.js would otherwise MEASURE as the
                             drawing and bare.css would otherwise leave cream
           data-lab-nozoom   the zoom widget pinned to the corner
         and a note saying so goes at the top of the helmet <style>, the way
         knoll-cards.dc.html notes its one bench-forced change. bare.css, NO
         SECOND SHEET, is the argument.
     5 · the file is written with LF endings, like every other feature. */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const [,, exportPath, name, outDirArg] = process.argv;
if (!exportPath || !name) {
  console.error('usage: node lab2/perf/swap-machine.js "<export.html>" <name> [outdir]');
  process.exit(2);
}
const FEATURES = path.join(__dirname, '..', 'features');
const outDir = outDirArg ? path.resolve(outDirArg) : FEATURES;
const fail = (msg) => { console.error('swap-machine: ' + msg); process.exit(1); };
const once = (s, re, what) => {
  const n = (s.match(re) || []).length;
  if (n !== 1) fail(`expected exactly one ${what}, found ${n}`);
};

// 1 · the document out of the bundle
const bundle = fs.readFileSync(exportPath, 'utf8');
const grab = (type) => {
  const open = `<script type="__bundler/${type}">`;
  const i = bundle.indexOf(open);
  if (i < 0) return null;
  return bundle.slice(i + open.length, bundle.indexOf('</script>', i + open.length));
};
const tpl = grab('template');
if (!tpl) fail('no <script type="__bundler/template"> in ' + exportPath + ' — is it a Design Canvas export?');
let raw;
try { raw = JSON.parse(tpl.trim()); } catch (e) { fail('the template did not parse as JSON: ' + e.message); }
if (typeof raw !== 'string') fail('the template is not a string');
raw = raw.replace(/\r\n/g, '\n');

// 2 · the runtime: the same support.js, or say so
try {
  const manifest = JSON.parse((grab('manifest') || '{}').trim());
  const m = /<script src="([0-9a-f-]{36})"><\/script>/.exec(raw);
  const ent = m && manifest[m[1]];
  if (ent) {
    const js = ent.compressed ? zlib.gunzipSync(Buffer.from(ent.data, 'base64')).toString('utf8') : ent.data;
    const cur = fs.readFileSync(path.join(FEATURES, 'support.js'), 'utf8');
    if (js === cur) console.log('  runtime: the bundled support.js is the bench\'s, byte for byte');
    else console.log(`  ! runtime: the bundled support.js (${js.length} chars) differs from features/support.js (${cur.length}) — compare them before trusting the boot`);
  }
} catch (e) { console.log('  (could not compare the bundled runtime: ' + e.message + ')'); }

// 3 · the faces the export asks for, against fonts.css
try {
  const ext = JSON.parse((grab('ext_resources') || '[]').trim());
  const g = ext.map(r => r.id).find(u => /fonts\.googleapis\.com/.test(u));
  if (g) {
    const fams = [...g.matchAll(/family=([^&:]+)/g)].map(m => decodeURIComponent(m[1]).replace(/\+/g, ' '));
    const have = fs.readFileSync(path.join(FEATURES, '..', 'fonts', 'fonts.css'), 'utf8');
    const missing = fams.filter(f => !have.includes(`font-family:'${f}'`));
    console.log('  faces: ' + fams.join(', ') + (missing.length ? '  ! NOT in fonts/fonts.css: ' + missing.join(', ') : '  (all self-hosted)'));
  }
} catch (e) { console.log('  (could not read the export\'s font list: ' + e.message + ')'); }

// the head every feature has — copied from one that is on the bench
const model = fs.readFileSync(path.join(FEATURES, 'spawner.dc.html'), 'utf8').replace(/\r\n/g, '\n');
const head = model.slice(0, model.indexOf('<x-dc>'));
if (!/prelude\.js/.test(head) || !/support\.js/.test(head) || !/bare\.css/.test(head)) fail('features/spawner.dc.html no longer has the bench head to copy');

// the document: <x-dc> … </x-dc> and the feature's own <script type="text/x-dc"> after it
const i = raw.indexOf('<x-dc>'), j = raw.indexOf('</body>');
if (i < 0 || j < 0) fail('no <x-dc> … </body> in the export');
let body = raw.slice(i, j).replace(/\s+$/, '\n');

// 4 · the fonts link, and the note, at the top of the helmet
once(body, /<helmet>\n<style>\n/g, '"<helmet>\\n<style>" opening');
body = body.replace(/<helmet>\n<style>\n/,
  '<helmet>\n'
  + '<!-- lab 2 serves these faces itself — see SELF-HOSTED in index.html -->\n'
  + '<link rel="stylesheet" href="../fonts/fonts.css">\n'
  + '<style>\n'
  + '  /* THE BENCH\'S THREE MARKS — see features/bare.css, NO SECOND SHEET. Every\n'
  + '     line below is the machine as it was exported, verbatim; the bench adds\n'
  + '     three attributes and changes no declaration: data-lab-nopaper on the\n'
  + '     paper grain, data-lab-sheet on the full-viewport div the export wraps\n'
  + '     the drawing in (the one carrying the export\'s own zoom), and\n'
  + '     data-lab-nozoom on the zoom widget pinned to the corner. frames.js\n'
  + '     steps through the first two as sheets and bare.css draws none of the\n'
  + '     three; opened on its own, the file still zooms and shows its widget.\n'
  + '     Written by perf/swap-machine.js. */\n');

// the grain: absolutely positioned, inset 0, the noise svg
const GRAIN = /<div style="position: absolute; inset: 0; pointer-events: none; opacity: 0\.06; background-image: url\('data:image\/svg\+xml,[^"]*fractalNoise/g;
once(body, GRAIN, 'paper-grain overlay');
body = body.replace(/<div style="position: absolute; inset: 0; pointer-events: none; opacity: 0\.06; background-image: url\('data:image\/svg\+xml,/, '<div data-lab-nopaper style="position: absolute; inset: 0; pointer-events: none; opacity: 0.06; background-image: url(\'data:image/svg+xml,');

// the sheet inside the sheet: the div carrying the export's zoom
// (the zoom is not always the last declaration — the press puts its padding after it)
const SHEET = /<div style="([^"]*zoom: \{\{ zoomF \}\}[^"]*)"/g;
once(body, SHEET, 'full-viewport div carrying zoom: {{ zoomF }}');
body = body.replace(/<div style="([^"]*zoom: \{\{ zoomF \}\}[^"]*)"/, '<div data-lab-sheet style="$1"');

// the zoom widget
const WIDGET = /<div style="position: fixed; right: 18px; bottom: 18px; z-index: 60;/g;
once(body, WIDGET, 'zoom widget (position: fixed; right: 18px; bottom: 18px; z-index: 60)');
body = body.replace(/<div style="position: fixed; right: 18px; bottom: 18px; z-index: 60;/, '<div data-lab-nozoom style="position: fixed; right: 18px; bottom: 18px; z-index: 60;');

// 5 · written
const out = head + body + '</body>\n</html>\n';
fs.mkdirSync(outDir, { recursive: true });
const file = path.join(outDir, name + '.dc.html');
fs.writeFileSync(file, out.replace(/\r\n/g, '\n'));
const label = (/data-screen-label="([^"]*)"/.exec(body) || [])[1] || '?';
console.log(`  wrote ${path.relative(process.cwd(), file)}  (${out.length} chars, "${label}")`);
