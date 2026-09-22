#!/usr/bin/env node
/* ── THE SANDBOX'S OWN SERVER ──────────────────────────────────────────────
   site/serve.js, run one folder deeper, with the Press Table's doors in it.

   WHY A SECOND SERVER. The Press Table (../PRESS-TABLE-PLAN.md) is being
   built in lab2/test/ — a miniature of the bench, the plan's changes made to
   copies — and nothing in the live bench is to be touched while it is,
   site/serve.js included. But a bench cannot be arranged without a door to
   save through, a game page cannot be made without a door to build through,
   and the plan's Phase 5 (§9 5.4) wants doors the live server does not have.
   So this file is site/serve.js copied whole — the static handler as it is,
   the door functions the same in every behaviour, every guard the original
   keeps (press/NOTES.md §C.1 lists them) kept — with the doors it needs
   added, running on 4322 beside the live one on 4321. The owner's server is
   never posted to and never stopped.

   THE TWO CONSTANTS. PREFIX and DIR say where the sandbox is. A merge into
   site/serve.js is setting them to '' and 'lab2' and changing nothing else
   in this file; the door derivation in keep.js and press.js (CONTRACTS.md §0)
   is written so the same three lines find the door in both places.

   THE DOORS, all under /_lab2/test:
     /default        the sandbox bench's autosave. GET is the knock keep.js
                     makes at boot, POST is the same save() the live door
                     does, against lab2/test/index.html.
     /games/<slug>   the same door for a game page, against
                     lab2/test/games/<slug>/index.html. A slug that is not
                     ^[a-z0-9-]{2,40}$ (the manifest schema's own pattern,
                     Appendix A) or that has no page yet is refused with 400
                     on GET and POST alike — a knock that hears 400 is a knock
                     that heard no door, which is what keep.js wants.
     /build          POST the Press Table's bundle and press/tools/build-game.js
                     writes games/<slug>/. It refuses to overwrite a page that
                     exists unless the bundle says force, and even then it
                     backs the page up first; that check is made HERE as well
                     as in the builder, belt and braces, because the page it
                     protects is one the owner has arranged by hand.
     /vibe, /intake  the two Vercel functions in api/, mounted so they can be
                     exercised without a deploy. They are required the first
                     time they are asked for, and a file that is not there yet
                     answers 501 rather than crashing the server — the phases
                     that write them come after the one that needs this file.

   AND ONE THAT IS SHUT ON PURPOSE. /_lab2/default — the live bench's door —
   answers 404 here, and so does every other /_lab2/… path not listed. The
   live bench's keep.js knocks on /_lab2/default at boot and goes quiet for
   good on a non-200; if this server answered, a live bench opened on 4322
   would write ITS positions into the sandbox file, and nobody could tell
   the two benches' saves apart afterwards. The sandbox's own pages derive
   /_lab2/test/… from their pathname and never knock on the bare door.

   WHAT THE COPY WRITER AND THE EDIT LEARNED. A sticker off
   features/stickers-core.dc.html is a kit part like a tree (KIT_SRC), so a
   pasted one is written with a .gz-art and no iframe. Three per-section
   words the plan gives a sticker — data-palette (a JSON object of role
   colours, CONTRACTS.md §7), data-text (the words in its text slot) and
   data-rot (degrees) — are written the way data-cut is: set in place when
   the client sends a value, dropped and COUNTED when it sends an empty one,
   and left exactly alone when it sends nothing at all, so an older keep.js
   that does not know the word cannot strip it off a page somebody wrote it
   on. data-palette goes on the tag double-quoted with the JSON's own quotes
   as &quot;. An attribute is FOUND by the same quote-aware walk tagEnd
   makes, whichever quote the file put round it: CONTRACTS.md §7 writes
   data-palette='{"skPrimary":"#…"}', which is how a hand writes JSON into
   HTML, and a pattern that only knew ="…" never found that — it put a
   second data-palette beside the first, which the browser ignores, so the
   edit never showed. Whatever it finds, it writes back double-quoted.

   ONE GUARD GREW A LITTLE, in the direction of catching more. The original
   counts bytes taken off on purpose so the never-shrinks check can tell a
   drop it meant from a section it lost, and leaves 64 bytes of slack for
   values that get shorter in place (a four-digit x becoming a one-digit
   one). A palette re-written from six roles to one gets shorter by two
   hundred bytes, which would trip the check and refuse an honest save; so
   the bytes a value loses in place are counted too, and the slack stays at
   the original's 64. A lost section is still hundreds of uncounted bytes
   and one fewer <section class="gz, and is still refused.

   THE NUMBERS. 4322 because 4321 is the live server (NOTES.md §D.10). The
   body caps: 4 MB on the save doors is the original's number. 64 MB on
   /build is roughly four times what twelve images at the plan's caps (§9
   5.3: 2048 px hero, 1600 px screenshots, 1024 px PNG logo) come to as
   base64 — a WebP at those sizes is under a megabyte and an alpha PNG a
   few, so twelve of them plus the JSON is around 15 MB, and the rest is for
   the day a publisher sends twelve PNG logos. 12 MB on /vibe is §11.1's
   four images at 1.5 MB, as base64 (×4/3, 8 MB), plus the stats and room.
   32 MB on /intake is §12.2's 25 MB bundle limit as base64 with the same
   room. A cap trips by dropping the socket, as the original does, not by
   answering — a body that big is not a client this server knows. */

const http = require('http');
const fs = require('fs');
const path = require('path');

// the sandbox. A merge into site/serve.js is setting these to '' and 'lab2'.
const PREFIX = '/test';
const DIR = 'lab2/test';

const ROOT = path.resolve(__dirname, '..', '..');          // site/
const HOME = path.join(ROOT, DIR);                          // site/lab2/test
const BENCH = path.join(HOME, 'index.html');
const PORT = Number(process.argv[2] || process.env.PORT || 4322);

// ── the doors ─────────────────────────────────────────────────────────────
const DOORS  = '/_lab2' + PREFIX;                           // /_lab2/test
const SAVE   = DOORS + '/default';
const GAMES  = DOORS + '/games/';
const BUILD  = DOORS + '/build';
const VIBE   = DOORS + '/vibe';
const INTAKE = DOORS + '/intake';

const SLUG = /^[a-z0-9-]{2,40}$/;

const CAP_SAVE   = 4e6;     // the original's
const CAP_BUILD  = 64e6;    // see THE NUMBERS
const CAP_VIBE   = 12e6;
const CAP_INTAKE = 32e6;

/* Markers round the appended copies. The block is the ONE region of the file
   this program owns; everything else it touches is a few attributes on a tag
   somebody else wrote. A game page carries the same markers (plan §9 5.1). */
const MARK_TOP = '<!-- ▼ copies written down by keep.js — see THE COPIES BLOCK in about.md -->';
const MARK_END = '<!-- ▲ copies written down by keep.js -->';
const ANCHOR   = '  </div><!-- /bench-world -->';

// one backup per FILE per run of this server, taken the first time it writes
// that file: enough to undo a bad session, and it does not grow a new file
// every thirty seconds. Keyed by path because this server writes more than one.
const backedUp = new Map();

// ── tags ──────────────────────────────────────────────────────────────────
/* Finding a section is done by SCANNING, not by a regex over the whole file:
   `[^>]*` is a lie the moment an attribute value has a > in it, and the thing
   being edited is not one that gets a second chance. */
function tagEnd(html, open) {
  let q = 0;
  for (let i = open + 1; i < html.length; i++) {
    const c = html[i];
    if (q) { if (c === q) q = 0; }
    else if (c === '"' || c === "'") q = c;
    else if (c === '>') return i;
  }
  return -1;
}

function findTag(html, gizmo) {
  const needle = 'data-gizmo="' + gizmo + '"';
  let at = html.indexOf(needle);
  while (at >= 0) {
    const open = html.lastIndexOf('<section', at);
    if (open >= 0) {
      const end = tagEnd(html, open);
      if (end > at) return { start: open, end: end + 1 };
    }
    at = html.indexOf(needle, at + 1);
  }
  return null;
}

/* WHERE AN ATTRIBUTE SITS ON THE TAG — by the same quote-aware walk tagEnd
   makes, not by a regex, and for the same reason: a value may carry
   anything but its own quote, and the quote is whichever one the file used.
   CONTRACTS.md §7 writes data-palette='{"skPrimary":"#…"}', the way a hand
   writes JSON into HTML, and a pattern that only knew ="…" walked straight
   past it. The span returned is ` name="…"` with its leading whitespace, so
   a drop takes off exactly the bytes a drop always took off and the count
   the guard is given is the same number. An unquoted value is not one this
   file writes and is not found. */
function attrAt(tag, name) {
  let q = 0;
  for (let i = 1; i < tag.length; i++) {
    const c = tag[i];
    if (q) { if (c === q) q = 0; continue; }
    if (c === '"' || c === "'") { q = c; continue; }
    if (!/\s/.test(c) || !tag.startsWith(name + '=', i + 1)) continue;
    const open = i + name.length + 2;                      // the quote after `name=`
    const qc = tag[open];
    if (qc !== '"' && qc !== "'") continue;
    const close = tag.indexOf(qc, open + 1);
    return close < 0 ? null : { at: i, end: close + 1 };
  }
  return null;
}

/* An attribute that is already there is edited in place, which keeps the tag
   laid out the way the file laid it out — and is written back double-quoted
   whatever it was, since every value here has been through esc() and carries
   no raw ". A new one goes in front of `style`, because data-cut is a size
   and that is where the sizes are. No String.replace anywhere in this: the
   words in data-text are a person's, and to a replacement string a `$&` is
   an instruction, not two characters. */
function setAttr(tag, name, value) {
  const a = attrAt(tag, name);
  if (a) return tag.slice(0, a.at + 1) + name + '="' + value + '"' + tag.slice(a.end);
  const ins = ' ' + name + '="' + value + '"';
  const s = tag.indexOf(' style="');
  if (s >= 0) return tag.slice(0, s) + ins + tag.slice(s);
  return tag.slice(0, -1).replace(/\s+$/, '') + ins + '>';
}

function dropAttr(tag, name) {
  const a = attrAt(tag, name);
  return a ? tag.slice(0, a.at) + tag.slice(a.end) : tag;
}

const esc = s => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const num = (v, d) => (Number.isFinite(+v) ? Math.round(+v) : d);

/* THE THREE STICKER WORDS, normalised. Each returns the string that goes on
   the tag, '' for "the client sent an empty value — take the word off", or
   null for "the client sent something that is not one — leave the tag be".
   data-palette is a JSON object of role colours; an object is written as
   JSON, a string is parsed and re-serialised so the tag carries one canonical
   form, and an empty object is an empty value. data-rot is degrees, kept to
   two decimals: a hundredth of a degree over a 128-unit box is a thousandth
   of a unit, under anything a screen can draw, and it keeps a float's tail
   off the tag. data-text is the words as sent. */
const VARIANTS = [['data-palette', 'palette'], ['data-text', 'text'], ['data-rot', 'rot']];

function variantValue(key, v) {
  if (v == null || v === '') return '';
  if (key === 'palette') {
    let o = v;
    if (typeof o === 'string') { try { o = JSON.parse(o); } catch (e) { return null; } }
    if (!o || typeof o !== 'object' || Array.isArray(o)) return null;
    return Object.keys(o).length ? JSON.stringify(o) : '';
  }
  if (key === 'rot') return Number.isFinite(+v) ? String(Math.round(+v * 100) / 100) : null;
  if (typeof v === 'object') return null;               // words are a string; an object is not one
  return String(v);
}

/* A copy, written out with the same five lines of chrome index.html gives
   every other feature. It is cloned from the prototype in the browser and
   written from scratch here, and the two have to agree — if the shape of a
   .gz ever changes, this is the second place. */
/* A KIT PART — a tree, a gnome, a village piece off one of the three kit
   sheets, and now a sticker off the fourth — is not a document (kits.js):
   its section carries a .gz-art and no iframe, poster or shield. Written
   that way here too, because an <iframe> in the markup is a document the
   browser builds while it parses, src or no src — seven hundred of them
   were the eight seconds before a first visitor saw anything (2026-09-04). */
const KIT_SRC = /features\/(forest|village|gnome|stickers-core)\.dc\.html#/;

function copyMarkup(g) {
  const id = esc(g.gizmo);
  const label = esc(g.label || g.gizmo);
  const inside = KIT_SRC.test(g.src || '')
    ? ['    <div class="gz-art"></div>']
    : ['    <iframe title="' + label + '"></iframe>',
       '    <div class="gz-poster"><b>waking up</b></div>',
       '    <div class="gz-shield"></div>'];
  // the sticker words go where setAttr would put them: in front of style
  let variant = '';
  for (const [attr, key] of VARIANTS) {
    if (!(key in g)) continue;
    const v = variantValue(key, g[key]);
    if (v) variant += ' ' + attr + '="' + esc(v) + '"';
  }
  return [
    '', '',                            // a section gets a blank line over it, as in the file
    '  <section class="gz" id="gz-' + id + '" data-gizmo="' + id + '"',
    '           data-src="' + esc(g.src) + '" data-w="' + num(g.dataW, 1120) + '" data-h="' + num(g.dataH, 780) + '"' +
      (g.scale ? ' data-scale="' + esc(g.scale) + '"' : ''),
    '           data-home-x="' + num(g.x, 0) + '" data-home-y="' + num(g.y, 0) + '"' +
      (g.z != null && Number.isFinite(+g.z) ? ' data-home-z="' + num(g.z, 0) + '"' : '') +
      (g.cut ? ' data-cut="' + num(g.w, 0) + 'x' + num(g.h, 0) + '"' : '') +
      variant +
      ' style="width:' + num(g.w, 400) + 'px;height:' + num(g.h, 400) + 'px"',
    '           aria-label="' + label + '">'].concat(inside, [
    '    <span class="gz-dim" aria-hidden="true"></span>',
    '    <button type="button" class="gz-size" data-nodrag aria-label="re-cut it — double-click to fit it to its drawing"></button>',
    '  </section>'
  ]).join('\n');
}

function ensureBlock(html) {
  if (html.indexOf(MARK_TOP) >= 0 && html.indexOf(MARK_END) >= 0) return html;
  const at = html.indexOf(ANCHOR);
  if (at < 0) return null;
  return html.slice(0, at) + '  ' + MARK_TOP + '\n  ' + MARK_END + '\n\n' + html.slice(at);
}

// ── the edit ──────────────────────────────────────────────────────────────
function apply(html, gizmos) {
  const promoted = [], missing = [];
  // every byte taken off on purpose is counted, so save() can tell a drop it
  // meant from a section it lost — a dropped attribute, and a value that got
  // shorter in place (see ONE GUARD GREW A LITTLE at the top)
  let dropped = 0;
  const drop = (tag, name) => { const t = dropAttr(tag, name); dropped += tag.length - t.length; return t; };
  const set = (tag, name, value) => { const t = setAttr(tag, name, value); if (t.length < tag.length) dropped += tag.length - t.length; return t; };

  // 1 · anything the browser has that the file has not, appended to the block
  const fresh = gizmos.filter(g => g.gizmo && !findTag(html, g.gizmo));
  const news = fresh.filter(g => g.copy && g.src);
  fresh.filter(g => !(g.copy && g.src)).forEach(g => missing.push(g.gizmo));

  if (news.length) {
    const withBlock = ensureBlock(html);
    if (!withBlock) return { error: 'no bench-world anchor in the file' };
    html = withBlock;
    /* Wind back over the closing marker's own indent and the blank line above
       it before writing, or every append leaves the last one's whitespace
       behind and the block grows a ragged edge one save at a time. */
    const at = html.indexOf(MARK_END);
    let from = at;
    while (from > 0 && /\s/.test(html[from - 1])) from--;
    html = html.slice(0, from) + news.map(copyMarkup).join('\n') + '\n\n  ' + html.slice(at);
    news.forEach(g => promoted.push(g.gizmo));
  }

  // 2 · where everything sits, and how big anything re-cut was cut
  for (const g of gizmos) {
    const t = findTag(html, g.gizmo);
    if (!t) continue;
    const before = html.slice(t.start, t.end);
    let tag = before;
    tag = set(tag, 'data-home-x', String(num(g.x, 0)));
    tag = set(tag, 'data-home-y', String(num(g.y, 0)));
    /* A frame nobody has re-cut FOLLOWS ITS DRAWING, and that is where every
       default size on this bench comes from — so an uncut frame gets no
       data-cut and nothing written over its style. Only a size somebody
       chose is worth freezing. */
    if (g.cut) {
      tag = set(tag, 'data-cut', num(g.w, 0) + 'x' + num(g.h, 0));
      tag = set(tag, 'style', 'width:' + num(g.w, 0) + 'px;height:' + num(g.h, 0) + 'px');
    } else if (attrAt(tag, 'data-cut')) {
      tag = drop(tag, 'data-cut');       // re-cut once, then fitted back: the freeze comes off
    }
    /* THE PILE, and what has been taken off it. data-home-z is where in the
       stack a section sits (0 is the bottom); data-gone="1" says the bench
       does not put this one on the paper. Both are words on a tag that stays
       exactly where it is in the file — the promise at the top of this file
       is kept by writing on the tag, never by removing it. */
    if (g.z != null && Number.isFinite(+g.z)) tag = set(tag, 'data-home-z', String(num(g.z, 0)));
    if (g.gone) tag = set(tag, 'data-gone', '1');
    else if (attrAt(tag, 'data-gone')) tag = drop(tag, 'data-gone');   // back on the paper
    /* THE STICKER'S OWN WORDS, the data-cut pattern exactly: a value is set
       in place, an empty value takes the word off (counted), and a key the
       client did not send leaves the tag as it was — the client that does
       not know a word does not get to remove it. */
    for (const [attr, key] of VARIANTS) {
      if (!(key in g)) continue;
      const v = variantValue(key, g[key]);
      if (v === null) continue;
      if (v) tag = set(tag, attr, esc(v));
      else if (attrAt(tag, attr)) tag = drop(tag, attr);
    }
    if (tag !== before) html = html.slice(0, t.start) + tag + html.slice(t.end);
  }

  return { html: html, promoted: promoted, missing: missing, dropped: dropped };
}

/* THE FILE ONLY EVER GROWS HERE. Sections are edited in place and copies
   are appended, so anything shorter than what went in means a bug in the
   scanner above, and the write does not happen. */
/* …minus exactly what it meant to take off: an attribute dropped on
   purpose (a data-cut whose frame went back to its drawing, a data-gone
   whose feature came back, a palette that got shorter) is counted as it
   goes, so the budget is the sum of those plus a little slack, not a
   number that happens to be big enough today. */
const secs = s => (s.match(/<section class="gz/g) || []).length;
function grew(before, out) {
  return !(out.html.length < before.length - (out.dropped || 0) - 64 || secs(out.html) < secs(before));
}

function save(body, file) {
  file = file || BENCH;
  // a list of objects is what gets saved; an entry that is not an object (a
  // null from a client mid-crash) is not a gizmo, and is stepped over rather
  // than tripped on — one bad entry does not refuse the other eighty
  const gizmos = Array.isArray(body && body.gizmos) ? body.gizmos.filter(g => g && typeof g === 'object') : null;
  if (!gizmos || !gizmos.length) return { ok: false, error: 'nothing to save' };

  const before = fs.readFileSync(file, 'utf8');
  const out = apply(before, gizmos);
  if (out.error) return { ok: false, error: out.error };

  if (!grew(before, out))
    return { ok: false, error: 'the rewrite came back smaller — nothing written' };

  if (out.html === before)
    return { ok: true, wrote: false, promoted: out.promoted, missing: out.missing };

  if (!backedUp.get(file)) {
    try { fs.writeFileSync(file + '.keep-bak', before); backedUp.set(file, true); } catch (e) {}
  }
  const tmp = file + '.tmp';
  fs.writeFileSync(tmp, out.html);
  fs.renameSync(tmp, file);
  return { ok: true, wrote: true, promoted: out.promoted, missing: out.missing };
}

// ── the game pages ────────────────────────────────────────────────────────
// where a slug's page is, or null for a slug that is not one. The regex is
// the whole of the path-safety argument: nothing but [a-z0-9-] can be in it,
// so nothing in it can be a separator, a dot or a drive letter.
function gameFile(slug) {
  return SLUG.test(slug || '') ? path.join(HOME, 'games', slug, 'index.html') : null;
}

/* The build door's own refusal, made before build-game.js is even loaded: a
   page that exists is a page the owner may have arranged by hand through the
   door above, and overwriting it is the one thing on this server that can
   throw work away. force:true is the owner saying so, and even then the page
   as it stood is written to index.html.keep-bak first — every time, not once
   per run, because a forced build is a deliberate act and not a timer.
   The gate only DECIDES. The door takes the backup itself, and only once the
   builder is loaded and about to run: a forced build that went on to answer
   501 or 500 had, before this, already written over the keep-bak the save
   door took at the start of the session — the one copy of the page from
   before anything touched it — for a request that then did nothing. */
function buildGate(bundle) {
  const slug = bundle && ((bundle.manifest && bundle.manifest.slug) || bundle.slug);
  const file = gameFile(slug);
  if (!file) return { error: 'no slug, or not one: ^[a-z0-9-]{2,40}$' };
  const exists = fs.existsSync(file);
  if (exists && !bundle.force) return { error: 'games/' + slug + '/index.html exists — send force:true to overwrite it' };
  return { slug: slug, file: file, exists: exists };
}

// ── static ────────────────────────────────────────────────────────────────
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp',
  '.ico': 'image/x-icon', '.woff': 'font/woff', '.woff2': 'font/woff2',
  '.ttf': 'font/ttf', '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/plain; charset=utf-8', '.mp3': 'audio/mpeg', '.wav': 'audio/wav'
};

/* no-cache means "ask every time", not "never keep a copy" — so the polite
   thing is to make asking cheap. The bench opens 159 frames over 16 files;
   with a validator each of those is one real download and then a stream of
   304s, and an edit to any file still shows on the very next reload because
   the mtime moved. ETag first (milliseconds, so two saves in one second
   still tell apart), Last-Modified as the fallback for a client that only
   kept the date. */
function send(req, res, file) {
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) { res.writeHead(404, { 'content-type': 'text/plain' }); res.end('404'); return; }
    const etag = 'W/"' + st.size.toString(36) + '-' + Math.round(st.mtimeMs).toString(36) + '"';
    const headers = {
      'content-type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream',
      'cache-control': 'no-cache',
      'etag': etag,
      'last-modified': new Date(st.mtimeMs).toUTCString()
    };
    const inm = req.headers['if-none-match'];
    const ims = Date.parse(req.headers['if-modified-since'] || '');
    if (inm ? inm === etag
            : (!isNaN(ims) && Math.floor(st.mtimeMs / 1000) * 1000 <= ims)) {
      res.writeHead(304, headers); res.end(); return;
    }
    fs.readFile(file, (err2, buf) => {
      if (err2) { res.writeHead(404, { 'content-type': 'text/plain' }); res.end('404'); return; }
      res.writeHead(200, headers); res.end(buf);
    });
  });
}

function serve(req, res) {
  let p;
  try { p = decodeURIComponent(req.url.split('?')[0]); } catch (e) { p = '/'; }
  const file = path.resolve(ROOT, '.' + p);
  if (file !== ROOT && !file.startsWith(ROOT + path.sep)) {
    res.writeHead(403, { 'content-type': 'text/plain' }); res.end('no'); return;
  }
  fs.stat(file, (err, st) => {
    if (!err && st.isDirectory()) {
      if (!p.endsWith('/')) { res.writeHead(302, { Location: p + '/' }); res.end(); return; }
      return send(req, res, path.join(file, 'index.html'));
    }
    if (err) { res.writeHead(404, { 'content-type': 'text/plain' }); res.end('404 ' + p); return; }
    send(req, res, file);
  });
}

// ── the doors, answered ───────────────────────────────────────────────────
function json(res, code, obj) {
  res.writeHead(code, { 'content-type': 'application/json' });
  res.end(JSON.stringify(obj));
}

// the body, whole, or the socket dropped past the cap — the original's way
function readBody(req, cap, cb) {
  const chunks = []; let n = 0;
  req.on('data', c => { chunks.push(c); n += c.length; if (n > cap) req.destroy(); });
  req.on('end', () => cb(Buffer.concat(chunks)));
}

// one save door: the knock, then the same save() against one file
function saveDoor(req, res, file, what) {
  if (req.method === 'GET') {          // keep.js knocks here before it starts
    json(res, 200, what);
    return;
  }
  if (req.method !== 'POST') { res.writeHead(405); res.end(); return; }
  readBody(req, CAP_SAVE, buf => {
    let out;
    try { out = save(JSON.parse(buf.toString('utf8')), file); }
    catch (e) { out = { ok: false, error: String((e && e.message) || e) }; }
    if (out.wrote) {
      const n = (out.promoted || []).length;
      console.log('  saved ' + path.relative(ROOT, file).replace(/\\/g, '/') +
        (n ? ' · wrote down ' + n + ' cop' + (n === 1 ? 'y' : 'ies') : ''));
    } else if (!out.ok) console.log('  ! ' + out.error);
    json(res, out.ok ? 200 : 400, out);
  });
}

/* The two Vercel functions, mounted. A Vercel Node function is (req, res)
   over the same http objects this server has, plus a parsed body on req.body,
   the query on req.query, and three helpers on res — status(), json(),
   send() — that a function written for Vercel will reach for. Those are put
   on here so api/*.js can stay dependency-free and run under both (plan §11
   2). The body is the parsed JSON when it is JSON, else the raw Buffer
   (intake is multipart, §12 2), and the Buffer is always on req.rawBody. */
/* The query string the way Vercel hands it to a function: a plain object of
   decoded pairs. The decoding FORGIVES — a % that is not an escape stays the
   two characters it came as — because this runs in the server's own request
   handler, outside any promise, and a throw here is the whole process going
   down on one bad URL (it did, in verification, on ?%zz). */
function query(url) {
  const dec = s => { try { return decodeURIComponent(s); } catch (e) { return s; } };
  const out = {};
  for (const pair of (url.split('?')[1] || '').split('&')) {
    if (!pair) continue;
    const eq = pair.indexOf('=');
    const k = dec(eq < 0 ? pair : pair.slice(0, eq));
    out[k] = eq < 0 ? '' : dec(pair.slice(eq + 1).replace(/\+/g, ' '));
  }
  return out;
}

function mountApi(req, res, name, cap) {
  const file = path.join(__dirname, 'api', name + '.js');
  if (!fs.existsSync(file)) { json(res, 501, { ok: false, error: name + '.js not built yet' }); return; }
  let mod;
  try { mod = require(file); }
  catch (e) { json(res, 500, { ok: false, error: 'api/' + name + '.js: ' + String((e && e.message) || e) }); return; }
  const handler = typeof mod === 'function' ? mod : (mod.handler || mod.default);
  if (typeof handler !== 'function') { json(res, 500, { ok: false, error: 'api/' + name + '.js exports no handler' }); return; }

  const run = buf => {
    req.rawBody = buf;
    req.body = undefined;
    if (buf.length) {
      const type = String(req.headers['content-type'] || '');
      if (/json/i.test(type)) { try { req.body = JSON.parse(buf.toString('utf8')); } catch (e) { req.body = undefined; } }
      else req.body = buf;
    }
    req.query = query(req.url);
    res.status = code => { res.statusCode = code; return res; };
    res.json = obj => { res.setHeader('content-type', 'application/json'); res.end(JSON.stringify(obj)); return res; };
    res.send = body => {
      if (body != null && typeof body === 'object' && !Buffer.isBuffer(body)) return res.json(body);
      res.end(body); return res;
    };
    Promise.resolve().then(() => handler(req, res)).catch(e => {
      console.log('  ! api/' + name + '.js: ' + String((e && e.stack) || e));
      if (!res.headersSent) json(res, 500, { ok: false, error: String((e && e.message) || e) });
      else res.end();
    });
  };
  if (req.method === 'GET' || req.method === 'HEAD') run(Buffer.alloc(0));
  else readBody(req, cap, run);
}

function buildDoor(req, res) {
  if (req.method !== 'POST') { res.writeHead(405); res.end(); return; }
  readBody(req, CAP_BUILD, buf => {
    let bundle;
    try { bundle = JSON.parse(buf.toString('utf8')); }
    catch (e) { json(res, 400, { ok: false, error: 'the bundle is not JSON: ' + String((e && e.message) || e) }); return; }
    let gate;
    try { gate = buildGate(bundle); }
    catch (e) { json(res, 500, { ok: false, error: String((e && e.message) || e) }); return; }
    if (gate.error) { console.log('  ! build: ' + gate.error); json(res, 400, { ok: false, error: gate.error }); return; }

    const tool = path.join(__dirname, 'press', 'tools', 'build-game.js');
    if (!fs.existsSync(tool)) { json(res, 501, { ok: false, error: 'build-game.js not built yet' }); return; }
    let build;
    try { build = require(tool).build; }
    catch (e) { json(res, 500, { ok: false, error: 'build-game.js: ' + String((e && e.message) || e) }); return; }
    if (typeof build !== 'function') { json(res, 500, { ok: false, error: 'build-game.js exports no build()' }); return; }

    /* The forced build's backup, taken now that the builder is here to run.
       It is also marked as THIS RUN'S backup of the file for the save door,
       so the first autosave after the build does not write the page just
       built over the copy of the page the owner had arranged by hand. */
    if (gate.exists) {
      try { fs.copyFileSync(gate.file, gate.file + '.keep-bak'); backedUp.set(gate.file, true); }
      catch (e) { json(res, 500, { ok: false, error: 'could not back up games/' + gate.slug + '/index.html: ' + String((e && e.message) || e) }); return; }
    }

    Promise.resolve().then(() => build(bundle, { root: HOME })).then(out => {
      out = (out && typeof out === 'object') ? out : { ok: true, result: out };
      if (out.ok == null) out.ok = true;
      if (gate.exists) out.backedUp = 'games/' + gate.slug + '/index.html.keep-bak';
      console.log(out.ok ? '  built games/' + gate.slug + '/' : '  ! build: ' + out.error);
      json(res, out.ok ? 200 : 400, out);
    }).catch(e => {
      console.log('  ! build: ' + String((e && e.stack) || e));
      json(res, 500, { ok: false, error: String((e && e.message) || e) });
    });
  });
}

function handle(req, res) {
  const p = req.url.split('?')[0];

  if (p === SAVE) return saveDoor(req, res, BENCH, { ok: true, door: true });

  if (p.startsWith(GAMES)) {
    const slug = p.slice(GAMES.length);
    const file = gameFile(slug);
    if (!file) return json(res, 400, { ok: false, error: 'not a slug: ^[a-z0-9-]{2,40}$' });
    if (!fs.existsSync(file)) return json(res, 400, { ok: false, error: 'no page at games/' + slug + '/index.html' });
    return saveDoor(req, res, file, { ok: true, door: true, file: DIR + '/games/' + slug + '/index.html' });
  }

  if (p === BUILD)  return buildDoor(req, res);
  if (p === VIBE)   return mountApi(req, res, 'vibe', CAP_VIBE);
  if (p === INTAKE) return mountApi(req, res, 'intake', CAP_INTAKE);

  /* Every other /_lab2/… path, /_lab2/default first among them, is not a
     door here. The live bench must never save through this server: its
     keep.js knocks on /_lab2/default, hears this 404, and goes quiet for
     good, which is exactly the deployed site's behaviour and the only safe
     one — a 200 here would have a live bench opened on this port writing
     its positions into the sandbox's file. */
  if (p === '/_lab2' || p.startsWith('/_lab2/')) return json(res, 404, { ok: false, error: 'no door here' });

  serve(req, res);
}

function listen(port, quiet) {
  return http.createServer(handle).listen(port, () => {
    if (quiet) return;
    console.log('site    → http://localhost:' + port + '/');
    console.log('sandbox → http://localhost:' + port + '/' + DIR + '/   (doors under ' + DOORS + ')');
    console.log('press   → http://localhost:' + port + '/' + DIR + '/press/');
  });
}

// run directly it is a server; required (press/tools/test-serve.js) it is a
// bag of the functions above, so the edit can be tested without a socket
if (require.main === module) listen(PORT);
else module.exports = {
  PREFIX, DIR, ROOT, HOME, BENCH, DOORS, SLUG, MARK_TOP, MARK_END, ANCHOR, KIT_SRC,
  CAP_SAVE, CAP_BUILD, CAP_VIBE, CAP_INTAKE,
  tagEnd, findTag, attrAt, setAttr, dropAttr, esc, num, variantValue, copyMarkup, ensureBlock,
  apply, grew, secs, save, gameFile, buildGate, query, handle, listen, backedUp
};
