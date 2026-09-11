#!/usr/bin/env node
/* ── THE BENCH'S OWN SERVER ────────────────────────────────────────────────
   `npx serve` with one extra door in it.

   Everything on lab 2 that you move, cut or paste is kept in localStorage —
   which is to say it is kept IN SOMEBODY'S BROWSER. index.html is where the
   DEFAULT LOOK lives: data-home-x / -y is where a section sits, data-cut is
   the size it was cut to, and a section written down is on the paper for
   every visitor rather than for this one machine. Promoting the first into
   the second used to be a hand job — read the numbers off the screen, type
   them into the file — and keep.js now does it every thirty seconds through
   the door below.

   WHY A SERVER AT ALL: a page cannot write the file it was served from, and
   the static host this site deploys to has nowhere to write one. So the
   autosave is a LOCAL thing by construction. Run this instead of `npx serve`
   while you are arranging the bench; keep.js finds the door, and on the
   deployed site it does not and goes quiet.

   WHAT IT WILL NOT DO: it will not delete a section. Copies are APPENDED to
   the block at the foot of the world and never taken out of it again — the
   file is 94k of hand-written prose with an argument in every comment, and a
   program that can remove parts of it automatically is a program that can
   lose them. Taking a copy off the bench for good is a line you delete by
   hand, which is the right amount of work for the only destructive edit
   there is.

   DELETE, FROM THE BENCH'S RIGHT-CLICK MENU, KEEPS THAT PROMISE FROM THE
   OTHER SIDE. A feature taken off the paper comes through the door as
   gone:true and its section gets data-gone="1" — one word on the tag, the
   tag and its comment left exactly where they are. Removing the word by
   hand is how one comes back for everybody; undo brings it back for whoever
   pressed it, and the next save takes the word off again. The pile is the
   same kind of thing: data-home-z is a number on the tag, never a
   reordering of the file. */

const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const PORT = Number(process.argv[2] || process.env.PORT || 4321);

// ── the doors ─────────────────────────────────────────────────────────────
/* ONE DOOR PER BENCH, and the door is what chooses the FILE. There are two
   benches on this server now — lab 2, and the empty one in ironhive — and
   they are the same program with different paper, so a single door would let
   whichever bench happened to be open write itself over the other. The
   emptier the bench the worse that is: ironhive has no sections at all, and
   the guard in save() below ('nothing to save') is the only thing that would
   have stood between an empty page and lab 2's eighty-four.

   A bench's keep.js names its own door and nothing else; adding a third is
   this line and that constant. */
const BENCHES = {
  '/_lab2/default':     path.join(ROOT, 'lab2', 'index.html'),
  '/_ironhive/default': path.join(ROOT, 'ironhive', 'index.html')
};

/* THE WALL DOOR (2026-09-11). The hive's seed.js posts the wall the bench
   should OPEN ON — the pieces, the tracings some of them are stamped from,
   and the camera — and it is written out whole as ironhive/wall-seed.json,
   one piece to a line so that a diff of it reads. Nothing is edited in place
   and nothing is merged: the post is the file. The bench reads it back on a
   browser's first visit (THE WALL THIS BENCH OPENS ON, in seed.js). */
const WALL_DOOR = '/_ironhive/wall';
const WALL_FILE = path.join(ROOT, 'ironhive', 'wall-seed.json');
function seedText(seed) {
  const lines = arr => arr.map(x => JSON.stringify(x)).join(',\n');
  return '{\n"cam": ' + JSON.stringify(seed.cam) +
         ',\n"wall": {"items": [\n' + lines(seed.wall.items) + '\n]}' +
         ',\n"flatfile": {"list": [\n' + lines(seed.flatfile.list) + '\n]}\n}\n';
}
function saveWall(body) {
  const cam = body && body.cam, wall = body && body.wall, ff = body && body.flatfile;
  if (!wall || !Array.isArray(wall.items)) return { ok: false, error: 'no wall in the post' };
  const items = wall.items.filter(it => it && typeof it === 'object' && typeof it.k === 'string');
  if (!items.length) return { ok: false, error: 'nothing on the wall to publish' };
  if (!cam || ![cam.z, cam.cx, cam.cy].every(Number.isFinite)) return { ok: false, error: 'no camera in the post' };
  const list = ff && Array.isArray(ff.list) ? ff.list.filter(t => t && t.id) : [];
  fs.writeFileSync(WALL_FILE, seedText({ cam, wall: { items }, flatfile: { list } }));
  return { ok: true, pieces: items.length, tracings: list.length };
}

/* Markers round the appended copies. The block is the ONE region of the file
   this program owns; everything else it touches is three attributes on a tag
   somebody else wrote. */
const MARK_TOP = '<!-- ▼ copies written down by keep.js — see THE COPIES BLOCK in about.md -->';
const MARK_END = '<!-- ▲ copies written down by keep.js -->';
const ANCHOR   = '  </div><!-- /bench-world -->';

// one backup per bench per run of this server, taken the first time that bench
// is written: enough to undo a bad session, and it does not grow a new file
// every thirty seconds. Per BENCH, not per run — two benches sharing the flag
// would mean whichever saved second was never backed up at all.
const backedUp = new Set();

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

/* An attribute that is already there is edited in place, which keeps the tag
   laid out the way the file laid it out. A new one goes in front of `style`,
   because data-cut is a size and that is where the sizes are. */
function setAttr(tag, name, value) {
  const re = new RegExp('(\\s' + name + '=")[^"]*(")');
  if (re.test(tag)) return tag.replace(re, '$1' + value + '$2');
  const ins = ' ' + name + '="' + value + '"';
  const s = tag.indexOf(' style="');
  if (s >= 0) return tag.slice(0, s) + ins + tag.slice(s);
  return tag.slice(0, -1).replace(/\s+$/, '') + ins + '>';
}

function dropAttr(tag, name) {
  return tag.replace(new RegExp('\\s' + name + '="[^"]*"'), '');
}

const esc = s => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const num = (v, d) => (Number.isFinite(+v) ? Math.round(+v) : d);

/* A copy, written out with the same five lines of chrome index.html gives
   every other feature. It is cloned from the prototype in the browser and
   written from scratch here, and the two have to agree — if the shape of a
   .gz ever changes, this is the second place. */
/* A KIT PART — a tree, a gnome, a village piece off one of the three kit
   sheets — is not a document (lab2/kits.js): its section carries a .gz-art
   and no iframe, poster or shield. Written that way here too, because an
   <iframe> in the markup is a document the browser builds while it parses,
   src or no src — seven hundred of them were the eight seconds before a
   first visitor saw anything (2026-09-04). */
const KIT_SRC = /features\/(forest|village|gnome)\.dc\.html#/;

function copyMarkup(g) {
  const id = esc(g.gizmo);
  const label = esc(g.label || g.gizmo);
  const inside = KIT_SRC.test(g.src || '')
    ? ['    <div class="gz-art"></div>']
    : ['    <iframe title="' + label + '"></iframe>',
       '    <div class="gz-poster"><b>waking up</b></div>',
       '    <div class="gz-shield"></div>'];
  return [
    '', '',                            // a section gets a blank line over it, as in the file
    '  <section class="gz" id="gz-' + id + '" data-gizmo="' + id + '"',
    '           data-src="' + esc(g.src) + '" data-w="' + num(g.dataW, 1120) + '" data-h="' + num(g.dataH, 780) + '"' +
      (g.scale ? ' data-scale="' + esc(g.scale) + '"' : ''),
    '           data-home-x="' + num(g.x, 0) + '" data-home-y="' + num(g.y, 0) + '"' +
      (g.z != null && Number.isFinite(+g.z) ? ' data-home-z="' + num(g.z, 0) + '"' : '') +
      (g.cut ? ' data-cut="' + num(g.w, 0) + 'x' + num(g.h, 0) + '"' : '') +
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
  // meant from a section it lost
  let dropped = 0;
  const drop = (tag, name) => { const t = dropAttr(tag, name); dropped += tag.length - t.length; return t; };

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
    tag = setAttr(tag, 'data-home-x', String(num(g.x, 0)));
    tag = setAttr(tag, 'data-home-y', String(num(g.y, 0)));
    /* A frame nobody has re-cut FOLLOWS ITS DRAWING, and that is where every
       default size on this bench comes from — so an uncut frame gets no
       data-cut and nothing written over its style. Only a size somebody
       chose is worth freezing. */
    if (g.cut) {
      tag = setAttr(tag, 'data-cut', num(g.w, 0) + 'x' + num(g.h, 0));
      tag = setAttr(tag, 'style', 'width:' + num(g.w, 0) + 'px;height:' + num(g.h, 0) + 'px');
    } else if (tag.indexOf(' data-cut="') >= 0) {
      tag = drop(tag, 'data-cut');       // re-cut once, then fitted back: the freeze comes off
    }
    /* THE PILE, and what has been taken off it. data-home-z is where in the
       stack a section sits (0 is the bottom); data-gone="1" says the bench
       does not put this one on the paper. Both are words on a tag that stays
       exactly where it is in the file — the promise at the top of this file
       is kept by writing on the tag, never by removing it. */
    if (g.z != null && Number.isFinite(+g.z)) tag = setAttr(tag, 'data-home-z', String(num(g.z, 0)));
    if (g.gone) tag = setAttr(tag, 'data-gone', '1');
    else if (tag.indexOf(' data-gone="') >= 0) tag = drop(tag, 'data-gone');   // back on the paper
    if (tag !== before) html = html.slice(0, t.start) + tag + html.slice(t.end);
  }

  return { html: html, promoted: promoted, missing: missing, dropped: dropped };
}

function save(body, file) {
  const gizmos = Array.isArray(body && body.gizmos) ? body.gizmos : null;
  if (!gizmos || !gizmos.length) return { ok: false, error: 'nothing to save' };

  const before = fs.readFileSync(file, 'utf8');
  const out = apply(before, gizmos);
  if (out.error) return { ok: false, error: out.error };

  /* THE FILE ONLY EVER GROWS HERE. Sections are edited in place and copies
     are appended, so anything shorter than what went in means a bug in the
     scanner above, and the write does not happen. */
  /* …minus exactly what it meant to take off: an attribute dropped on
     purpose (a data-cut whose frame went back to its drawing, a data-gone
     whose feature came back) is counted as it goes, so the budget is the
     sum of those plus a little slack, not a number that happens to be big
     enough today. */
  const secs = s => (s.match(/<section class="gz/g) || []).length;
  if (out.html.length < before.length - (out.dropped || 0) - 64 || secs(out.html) < secs(before))
    return { ok: false, error: 'the rewrite came back smaller — nothing written' };

  if (out.html === before)
    return { ok: true, wrote: false, promoted: out.promoted, missing: out.missing };

  if (!backedUp.has(file)) {
    try { fs.writeFileSync(file + '.keep-bak', before); backedUp.add(file); } catch (e) {}
  }
  const tmp = file + '.tmp';
  fs.writeFileSync(tmp, out.html);
  fs.renameSync(tmp, file);
  return { ok: true, wrote: true, promoted: out.promoted, missing: out.missing };
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

http.createServer((req, res) => {
  if (req.url.split('?')[0] === WALL_DOOR) {   // see THE WALL DOOR
    if (req.method === 'GET') {                // seed.js knocks here before it shows the button
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ ok: true, door: true }));
      return;
    }
    if (req.method !== 'POST') { res.writeHead(405); res.end(); return; }
    let raw = '';
    req.on('data', c => { raw += c; if (raw.length > 8e6) req.destroy(); });
    req.on('end', () => {
      let out;
      try { out = saveWall(JSON.parse(raw)); }
      catch (e) { out = { ok: false, error: String((e && e.message) || e) }; }
      if (out.ok) console.log('  ironhive: published the wall · ' + out.pieces + ' pieces, ' + out.tracings + ' tracings → wall-seed.json');
      else console.log('  ! ' + out.error);
      res.writeHead(out.ok ? 200 : 400, { 'content-type': 'application/json' });
      res.end(JSON.stringify(out));
    });
    return;
  }
  const bench = BENCHES[req.url.split('?')[0]];
  if (bench) {
    if (req.method === 'GET') {          // keep.js knocks here before it starts
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ ok: true, door: true }));
      return;
    }
    if (req.method !== 'POST') { res.writeHead(405); res.end(); return; }
    let raw = '';
    req.on('data', c => { raw += c; if (raw.length > 4e6) req.destroy(); });
    req.on('end', () => {
      let out;
      try { out = save(JSON.parse(raw), bench); }
      catch (e) { out = { ok: false, error: String((e && e.message) || e) }; }
      if (out.wrote) {
        const n = (out.promoted || []).length;
        console.log('  ' + path.basename(path.dirname(bench)) + ': saved the default look' +
                    (n ? ' · wrote down ' + n + ' cop' + (n === 1 ? 'y' : 'ies') : ''));
      } else if (!out.ok) console.log('  ! ' + out.error);
      res.writeHead(out.ok ? 200 : 400, { 'content-type': 'application/json' });
      res.end(JSON.stringify(out));
    });
    return;
  }
  serve(req, res);
}).listen(PORT, () => {
  console.log('site  → http://localhost:' + PORT + '/');
  console.log('lab 2 → http://localhost:' + PORT + '/lab2/   (autosave door open)');
  console.log('hive  → http://localhost:' + PORT + '/ironhive/   (empty bench, its own door)');
});
