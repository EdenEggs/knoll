/* recut.js — turn a Design Canvas export of "Your Yard" into site/yard/index.html.
   A DC export cannot know it will be served out of site/yard/, so four things
   come back wrong every time and are put back here. Run:
     node recut.js "<export.html>" "<out.html>"                                  */
const fs = require('fs'), zlib = require('zlib');
const [, , SRC, OUT] = process.argv;
const bundle = fs.readFileSync(SRC, 'utf8');

// 1 · the inner document, out of the self-unpacking bundle
const m = /<script type="__bundler\/template"[^>]*>([\s\S]*?)<\/script>/.exec(bundle);
if (!m) throw new Error('no __bundler/template block');
let doc = JSON.parse(m[1]);
const edits = [];
const sub = (what, find, repl) => {
  const before = doc;
  doc = typeof find === 'string' ? doc.replace(find, repl) : doc.replace(find, repl);
  if (doc === before) throw new Error('recut failed, nothing matched: ' + what);
  edits.push(what);
};

// 2 · the DC runtime is a uuid in the bundle; here it is the copy next door.
//     The icon goes in ahead of it, in the REAL <head> and NOT in the helmet:
//     the helmet is hoisted into <head> by support.js, i.e. after the runtime
//     boots, and Chrome asks for /yard/favicon.ico in the meantime and logs the
//     404 it gets. /signup and /login already do it this way.
sub('runtime src + favicon', /<script src="[0-9a-f-]{36}"><\/script>/,
  '<link rel="icon" href="../logo/logo-icon.svg">\n<script src="./support.js"></script>');

// 3 · the fonts. The export inlines Google's CSS as @font-face rules pointing at
//     bundled woff2 uuids. Yard asks the CDN for the same three faces in one
//     request to an origin it already preconnects to — see about.md § the house bar.
{
  const i = doc.indexOf('<style>/* latin-ext */');
  const j = doc.indexOf('</style>', i);
  if (i < 0 || j < 0) throw new Error('recut failed, no bundled font block');
  doc = doc.slice(0, i)
      + '<link href="https://fonts.googleapis.com/css2?family=Rye&family=Sora:wght@800&family=VT323&display=swap" rel="stylesheet">'
      + doc.slice(j + '</style>'.length);
  edits.push('bundled @font-face block -> the CDN link');
}

// 4 · the mark in the house bar. The export has no file to point at and draws a
//     black disc in its place; the real one is the site's logo.
sub('house-bar mark',
  '<span aria-hidden="true" style="display:inline-block; width:26px; height:26px; background:#17120b; border-radius:50%"></span>',
  '<img src="../logo/logo-icon.svg" alt="" width="26" height="26">');

fs.writeFileSync(OUT, doc);
console.log('recut ->', OUT, doc.length, 'bytes');
edits.forEach(e => console.log('  ·', e));
const left = doc.match(/["'(][0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}["')]/g);
console.log(left ? '  !! bundle uuids still referenced: ' + left.length : '  · no bundle uuids left');
