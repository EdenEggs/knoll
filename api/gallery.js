/* ── api/gallery.js — THE PHOTO ALBUM ───────────────────────────────────────
   One Vercel function at /api/gallery, and the same module mounted by
   serve.js at the same path on the dev server (as api/board.js is).
   toem2/gallery.js reads and posts here: the photos taken around a page,
   newest first, and the hearts on them.

   A PHOTO IS A RECORD in the list album:<slug> — {id, by, at, cap, desc,
   sec, where, src, key} — its picture a file of its own (in the Vercel Blob
   store on the site, album/<slug>/<id>.jpg, public and cached a year — the
   store the yards publish to; beside the file store off it, under
   toem2/album/) and its hearts a set, album:<slug>:like:<id>, of who gave
   one. Names are looked up when read (tagsOf), so a rename shows; the
   takers' pictures are the gnome's card's (/api/wall?who=), which the page
   fetches once each.

   THE SECTIONS (2026-09-24, later that day): the keepers arrange the album
   into sections from the dashboard — {id, title, desc, open}, up to five
   (twelve until 2026-09-28), a description a hundred characters at most,
   kept on the page's hash (api/wall.js: page:<slug> `sections`) — and a
   photo names the one it hangs in (`sec`, or none). A section taken down
   leaves its photos in the album, unsectioned. A photo has a title (`cap`,
   twenty characters) and a description (`desc`, a hundred); its taker, or a
   keeper, may change them, and the section, after the fact (`edit`).

   WHO PUTS PHOTOS UP (2026-09-28). The keepers, from the dashboard, into
   any section or none. Anyone else signed in, from the album on the bench,
   into a section the keepers have OPENED to them (`open` — off until it is
   turned on, a section at a time) and nowhere else: a photo of theirs is
   not moved by them into a section that is shut, and they have twenty up
   at a time (MINE_MAX) — the album keeps two hundred, and one account's
   photos do not push everybody else's off the end of it. Anyone signed in
   gives a heart.

     GET  ?page=<slug>
          → { ok, me: {id, tag, keeper, mod} | null, sections: [{id, title, desc, open}],
              photos: [{id, by, tag, at, cap, desc, sec, where, src, likes, liked}] }
     POST { op: 'post', cap, desc?, sec?, where?, src: 'data:image/(jpeg|png|webp);base64,…' }
                                        → { ok, photo }        (a keeper; or anyone signed in, into an open section, twenty up at a time; twenty an hour; a picture ≤ 300 KB)
          { op: 'edit', id, cap?, desc?, sec? } → { ok, photo } (your own, or a keeper's)
          { op: 'like', id, on? }       → { ok, likes, liked } (on: false takes the heart back)
          { op: 'drop', id }            → { ok }               (your own, or a keeper's to hide — audited)
          { op: 'sections', sections: [{id, title, desc, open}] } → { ok, sections }   (the keepers)
          { op: 'sections', reset: true }                   → { ok, sections }   (back to none, as an album starts; the photos stay)

   ponytail: the hearts are one set a photo, read with a pipeline of SCARDs —
   fine to the 200 the list keeps; a count on the record if it ever grows. */
'use strict';

const crypto = require('crypto'), fs = require('fs'), path = require('path');
const W = require('./wall.js');
const H = require('./hill.js');
const { db, dbm, K, answer, readBody, Bad, bad, sameSite, whoIs, isMod, rulesOf, tagsOf, text, HOME, SLUG_RE } = W;

const KEEP = 200;                             // photos a page keeps; the oldest fall off the end
const MINE_MAX = 20;                          // …of which a visitor has this many up at a time, so one account cannot push the album off its own end (a moderator: as many as it keeps)
const CAP = { cap: 20, desc: 100, where: 40, src: 400000, sec: 40, secDesc: 100 };
const SECTIONS_MAX = 5, SEC_RE = /^[a-z0-9][a-z0-9-]{0,19}$/;
const BYTES = 300 * 1024;                     // the picture, decoded
const RATE = { post: 20, other: 200 };        // an hour, an account
const EXT = { jpeg: 'jpg', png: 'png', webp: 'webp' };
const hour = () => Math.floor(Date.now() / 36e5);
async function spend(u, what) {
  const k = K.rl('album:' + what + ':' + u, hour()), n = await db('INCR', k);
  if (n === 1) await db('EXPIRE', k, 3600);
  return n <= RATE[what];
}
const newId = () => Date.now().toString(36) + crypto.randomBytes(3).toString('hex');
const one = s => { try { const p = JSON.parse(s); return p && typeof p === 'object' ? p : null; } catch (e) { return null; } };

async function pageOf(q, body) {
  const s = String((body && body.page) || q.get('page') || HOME).toLowerCase();
  if (s === HOME) return s;
  if (!SLUG_RE.test(s) || !(await db('HGET', K.page(s), 'made'))) throw bad(404, 'page', 'no such page');
  return s;
}
async function meOf(req, slug) {              // who is asking, and what they are on this page
  const me = await whoIs(req);
  if (!me) return null;
  const rules = await rulesOf({ slug }, me), mod = isMod(me);
  return { id: me.id, tag: me.tag, banned: me.banned, mod, keeper: mod || !!rules.keeper };
}
const said = me => me && { id: me.id, tag: me.tag, keeper: me.keeper, mod: me.mod };

// ── THE SECTIONS, off the page's hash ──────────────────────────────────────
// what was saved under the old caps is read to the new ones: the first five, a description's first hundred — and shut to visitors' photos, as none was opened
const sectionsOf = p => {
  try { const s = p.sections ? JSON.parse(p.sections) : []; return Array.isArray(s) ? s.slice(0, SECTIONS_MAX).map(x => Object.assign({}, x, { desc: String((x && x.desc) || '').slice(0, CAP.secDesc), open: !!(x && x.open) })) : []; }
  catch (e) { return []; }
};
function cleanSections(v) {
  if (!Array.isArray(v) || v.length > SECTIONS_MAX) throw bad(400, 'sections', 'an album has up to ' + SECTIONS_MAX + ' sections');
  const seen = new Set();
  return v.map(s => {
    if (!s || typeof s !== 'object') throw bad(400, 'sections', 'a section is a title and a description');
    const id = String(s.id == null ? '' : s.id).toLowerCase(), title = text(s.title, CAP.sec);
    if (!SEC_RE.test(id)) throw bad(400, 'sections', 'a section\'s name is lower-case letters, numbers and dashes, 20 at most');
    if (seen.has(id)) throw bad(400, 'sections', 'two sections are called ' + id);
    seen.add(id);
    if (!title) throw bad(400, 'sections', 'every section needs a name');
    return { id, title, desc: text(s.desc, CAP.secDesc), open: s.open === true };
  });
}
const secOf = (v, sections) => { const id = String(v == null ? '' : v).toLowerCase(); return sections.some(s => s.id === id) ? id : ''; };
// WHO PUTS PHOTOS UP: a keeper anywhere; anyone else only in a section opened to them
function mayHang(me, sec, sections) {
  if (!me.keeper && !sections.some(s => s.id === sec && s.open)) throw bad(403, 'role', 'photos go up here from the moderators — or in a section they have opened to everyone');
}
const descOf = v => text(String(v == null ? '' : v).replace(/[\r\n\t]+/g, ' '), CAP.desc);   // a description is one line here: a line break typed in becomes a space, not nothing

// ── the picture: a data: url the browser made, checked twice — the header says jpeg, png or webp, and so must the bytes ──
function decode(v) {
  if (typeof v !== 'string' || v.length > CAP.src) throw bad(413, 'src', 'that picture is too big — 300 KB at most');
  const m = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(v);
  if (!m) throw bad(400, 'src', 'the picture has to be a jpeg, a png or a webp');
  const buf = Buffer.from(m[2], 'base64');
  if (buf.length > BYTES) throw bad(413, 'src', 'that picture is too big — 300 KB at most');
  const ok = m[1] === 'jpeg' ? buf[0] === 0xff && buf[1] === 0xd8
           : m[1] === 'png' ? buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
           : buf.subarray(0, 4).toString('latin1') === 'RIFF' && buf.subarray(8, 12).toString('latin1') === 'WEBP';
  if (!ok) throw bad(400, 'src', 'that is not the picture it says it is');
  return { buf, type: 'image/' + m[1], ext: EXT[m[1]] };
}
// where the pictures go: the Blob store on the site, files beside the wall's store off it, nowhere on a site with no store yet
const localDir = () => path.join(path.dirname(process.env.WALL_DB || path.join(__dirname, '..', 'toem2', 'wall-db.json')), 'album');
const fileOf = key => path.join(localDir(), key.replace(/^album\//, ''));
const pictures = H.blob.token() ? {
  async put(key, pic) {
    const r = await fetch(H.blob.api + '/?' + new URLSearchParams({ pathname: key }), {
      method: 'PUT',
      headers: H.blob.headers({ 'x-vercel-blob-access': 'public', 'x-content-type': pic.type, 'x-add-random-suffix': '0',
                                'x-allow-overwrite': '1', 'x-cache-control-max-age': '31536000' }),
      body: pic.buf
    });
    if (!r.ok) throw new Error('the store answered ' + r.status + ' writing ' + key + ': ' + (await r.text()).slice(0, 160));
    return H.blob.url(key);
  },
  del: keys => H.blob.del(keys)
} : process.env.VERCEL ? null : {
  async put(key, pic) { const f = fileOf(key); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, pic.buf); return '/toem2/album/' + key.replace(/^album\//, ''); },
  async del(keys) { keys.forEach(k => { try { fs.unlinkSync(fileOf(k)); } catch (e) {} }); }
};

const shown = (p, tag, likes, liked, sections) => ({ id: p.id, by: p.by, tag, at: p.at, cap: p.cap, desc: p.desc || '', sec: secOf(p.sec, sections), where: p.where || '', src: p.src, likes: +likes || 0, liked: !!liked });

async function get(req, res) {
  const q = new URL(req.url, 'http://x').searchParams, slug = await pageOf(q), sections = sectionsOf(await db('HGETALL', K.page(slug)));
  const me = await meOf(req, slug);
  const photos = (await db('LRANGE', K.album(slug), 0, KEEP - 1)).map(one).filter(Boolean);
  const cmds = photos.map(p => ['SCARD', K.albumLike(slug, p.id)]).concat(me ? photos.map(p => ['SISMEMBER', K.albumLike(slug, p.id), me.id]) : []);
  const n = cmds.length ? await dbm(cmds) : [];
  const tag = await tagsOf(photos.map(p => p.by));
  answer(res, 200, { ok: true, me: said(me), sections, photos: photos.map((p, i) => shown(p, tag[p.by], n[i], me && n[photos.length + i], sections)) });
}

async function post(req, res) {
  if (!sameSite(req)) throw bad(403, 'origin', 'that post came from another site');
  const body = await readBody(req);
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw bad(400, 'body', 'the post is not an op');
  const slug = await pageOf(new URL(req.url, 'http://x').searchParams, body), sections = sectionsOf(await db('HGETALL', K.page(slug)));
  const me = await meOf(req, slug);
  if (!me) throw bad(401, 'who', 'sign in to do that');
  if (me.banned) throw bad(403, 'banned', 'this account may not post');
  const key = K.album(slug), id = String(body.id == null ? '' : body.id);
  const find = async () => { const raw = await db('LRANGE', key, 0, -1); const i = raw.findIndex(s => { const p = one(s); return p && p.id === id; }); return i < 0 ? [null, null, -1] : [raw[i], one(raw[i]), i]; };
  switch (body.op) {
    case 'sections': {                        // THE SECTIONS: the keepers arrange the album
      if (!me.keeper) throw bad(403, 'role', 'the album\'s sections are the moderators\' to arrange');
      if (!(await spend(me.id, 'other'))) throw bad(429, 'rate', 'that is a lot in one hour — take a breath');
      const next = body.reset === true ? [] : cleanSections(body.sections);   // BACK TO THE DEFAULT: an album starts with none
      await db('HSET', K.page(slug), 'sections', JSON.stringify(next));
      await W.audit(me.id, 'sections', { page: slug, sections: next.map(s => s.id).join(',') });
      return answer(res, 200, { ok: true, sections: next });
    }
    case 'edit': {                            // the title, the description, the section — the taker's, or a keeper's, to change
      if (!(await spend(me.id, 'other'))) throw bad(429, 'rate', 'that is a lot in one hour — take a breath');
      const [, p, i] = await find();
      if (!p) throw bad(404, 'photo', 'no such photo');
      if (p.by !== me.id && !me.keeper) throw bad(403, 'role', 'that is somebody else\'s photo');
      if (body.cap != null) { p.cap = text(body.cap, CAP.cap); if (!p.cap) throw bad(400, 'cap', 'give it a title'); }
      if (body.desc != null) p.desc = descOf(body.desc);
      if (body.sec != null && secOf(body.sec, sections) !== secOf(p.sec, sections)) { p.sec = secOf(body.sec, sections); mayHang(me, p.sec, sections); }   // moved: where it may hang is asked again
      await db('LSET', key, i, JSON.stringify(p));   // ponytail: the index read a moment ago; a photo dropped in between moves it by one
      if (p.by !== me.id) await W.audit(me.id, 'edit', { page: slug, ch: 'album', id, of: p.by, text: String(p.cap || '').slice(0, 140) });
      const [likes, liked] = await dbm([['SCARD', K.albumLike(slug, id)], ['SISMEMBER', K.albumLike(slug, id), me.id]]);
      return answer(res, 200, { ok: true, photo: shown(p, (await tagsOf([p.by]))[p.by], likes, liked, sections) });
    }
    case 'post': {
      mayHang(me, secOf(body.sec, sections), sections);
      if (!(await spend(me.id, 'post'))) throw bad(429, 'rate', 'that is a lot of photos in one hour — take a breath');
      const cap = text(body.cap, CAP.cap);
      if (!cap) throw bad(400, 'cap', 'give it a title');
      const pic = decode(body.src);
      if (!pictures) throw bad(503, 'no-store', 'this site has no store for pictures yet');
      // ponytail: a count of the asker's own in the list as it stands — a quota a section if an album ever fills with visitors' photos
      const all = await db('LRANGE', key, 0, -1);
      if (!me.keeper && all.filter(s => (one(s) || {}).by === me.id).length >= MINE_MAX) throw bad(429, 'mine-full', 'you have ' + MINE_MAX + ' photos up here already — take one down to hang another');
      const pid = newId(), name = 'album/' + slug + '/' + pid + '.' + pic.ext;
      const src = await pictures.put(name, pic);
      const p = { id: pid, by: me.id, at: Date.now(), cap, desc: descOf(body.desc), sec: secOf(body.sec, sections), where: text(body.where, CAP.where), src, key: name };
      // the list keeps KEEP: what this one pushes off the end takes its picture and its hearts with it
      const over = all.slice(KEEP - 1), gone = over.map(one).filter(Boolean);
      if (over.length) {
        await dbm(over.map(s => ['LREM', key, 0, s]).concat(gone.map(g => ['DEL', K.albumLike(slug, g.id)])));
        await pictures.del(gone.map(g => g.key).filter(Boolean));
      }
      await db('LPUSH', key, JSON.stringify(p));
      // THE BELL (2026-09-27): a photo hung at a space rings its keepers' bells — once a place while unread (api/wall.js: tellOnce)
      await W.tellKeepers(await rulesOf({ slug }, null), me.id, 'photo', { what: cap });
      return answer(res, 200, { ok: true, photo: shown(p, me.tag, 0, false, sections) });
    }
    case 'like': {
      if (!(await spend(me.id, 'other'))) throw bad(429, 'rate', 'that is a lot in one hour — take a breath');
      const [, p] = await find();
      if (!p) throw bad(404, 'photo', 'no such photo');
      const on = body.on === undefined ? true : !!body.on;
      const fresh = await db(on ? 'SADD' : 'SREM', K.albumLike(slug, id), me.id);
      // THE BELL (2026-09-27): a heart — a new one, not one pressed twice — rings the bell of whoever took the photo
      if (on && fresh && p.by !== me.id && W.USER_RE.test(p.by)) await W.tellOnce(p.by, 'heart', me.id, { slug, title: (await rulesOf({ slug }, null)).title, what: p.cap });
      return answer(res, 200, { ok: true, likes: +(await db('SCARD', K.albumLike(slug, id))) || 0, liked: on });
    }
    case 'drop': {
      if (!(await spend(me.id, 'other'))) throw bad(429, 'rate', 'that is a lot in one hour — take a breath');
      const [raw, p] = await find();
      if (!p) throw bad(404, 'photo', 'no such photo');
      if (p.by !== me.id && !me.keeper) throw bad(403, 'role', 'that is somebody else\'s photo');
      await dbm([['LREM', key, 0, raw], ['DEL', K.albumLike(slug, id)]]);
      if (pictures && p.key) await pictures.del([p.key]);
      if (p.by !== me.id) await W.audit(me.id, 'hide', { page: slug, ch: 'album', id, of: p.by, text: String(p.cap || '').slice(0, 140) });
      return answer(res, 200, { ok: true });
    }
    default: throw bad(400, 'op', 'no such op');
  }
}

module.exports = async function handler(req, res) {
  try {
    if (!W.storeFor()) throw bad(503, 'no-store', 'this site has no store for the album yet');
    if (req.method === 'GET') return await get(req, res);
    if (req.method === 'POST') return await post(req, res);
    answer(res, 405, { ok: false, error: 'GET or POST' });
  } catch (e) {
    if (e instanceof Bad) return answer(res, e.status, { ok: false, code: e.code, error: e.message });
    if (e instanceof SyntaxError) return answer(res, 400, { ok: false, code: 'body', error: 'the post is not JSON' });
    console.error('api/gallery.js: ' + String((e && e.stack) || e));
    answer(res, 500, { ok: false, code: 'server', error: 'the album is having trouble — try again in a moment' });
  }
};
Object.assign(module.exports, { KEEP, MINE_MAX });   // for the probe
