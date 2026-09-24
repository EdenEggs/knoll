/* ── api/gallery.js — THE PHOTO ALBUM ───────────────────────────────────────
   One Vercel function at /api/gallery, and the same module mounted by
   serve.js at the same path on the dev server (as api/board.js is).
   toem2/gallery.js reads and posts here: the photos taken around a page,
   newest first, and the hearts on them.

   A PHOTO IS A RECORD in the list album:<slug> — {id, by, at, cap, where,
   src, key} — its picture a file of its own (in the Vercel Blob store on the
   site, album/<slug>/<id>.jpg, public and cached a year — the store the
   yards publish to; beside the file store off it, under toem2/album/) and
   its hearts a set, album:<slug>:like:<id>, of who gave one. Names are
   looked up when read (tagsOf), so a rename shows; the takers' pictures are
   the gnome's card's (/api/wall?who=), which the page fetches once each.

     GET  ?page=<slug>
          → { ok, me: {id, tag, keeper, mod} | null,
              photos: [{id, by, tag, at, cap, where, src, likes, liked}] }
     POST { op: 'post', cap, where?, src: 'data:image/(jpeg|png|webp);base64,…' }
                                        → { ok, photo }        (anyone signed in; twenty an hour; a picture ≤ 300 KB)
          { op: 'like', id, on? }       → { ok, likes, liked } (on: false takes the heart back)
          { op: 'drop', id }            → { ok }               (your own, or a keeper's to hide — audited)

   NOTHING TAKES A PHOTO YET (2026-09-24): the album opens empty, and 'post'
   is the door a camera posts through when there is one.

   ponytail: the hearts are one set a photo, read with a pipeline of SCARDs —
   fine to the 200 the list keeps; a count on the record if it ever grows. */
'use strict';

const crypto = require('crypto'), fs = require('fs'), path = require('path');
const W = require('./wall.js');
const H = require('./hill.js');
const { db, dbm, K, answer, readBody, Bad, bad, sameSite, whoIs, isMod, rulesOf, tagsOf, text, HOME, SLUG_RE } = W;

const KEEP = 200;                             // photos a page keeps; the oldest fall off the end
const CAP = { cap: 60, where: 40, src: 400000 };
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

const shown = (p, tag, likes, liked) => ({ id: p.id, by: p.by, tag, at: p.at, cap: p.cap, where: p.where || '', src: p.src, likes: +likes || 0, liked: !!liked });

async function get(req, res) {
  const q = new URL(req.url, 'http://x').searchParams, slug = await pageOf(q);
  const me = await meOf(req, slug);
  const photos = (await db('LRANGE', K.album(slug), 0, KEEP - 1)).map(one).filter(Boolean);
  const cmds = photos.map(p => ['SCARD', K.albumLike(slug, p.id)]).concat(me ? photos.map(p => ['SISMEMBER', K.albumLike(slug, p.id), me.id]) : []);
  const n = cmds.length ? await dbm(cmds) : [];
  const tag = await tagsOf(photos.map(p => p.by));
  answer(res, 200, { ok: true, me: said(me), photos: photos.map((p, i) => shown(p, tag[p.by], n[i], me && n[photos.length + i])) });
}

async function post(req, res) {
  if (!sameSite(req)) throw bad(403, 'origin', 'that post came from another site');
  const body = await readBody(req);
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw bad(400, 'body', 'the post is not an op');
  const slug = await pageOf(new URL(req.url, 'http://x').searchParams, body);
  const me = await meOf(req, slug);
  if (!me) throw bad(401, 'who', 'sign in to do that');
  if (me.banned) throw bad(403, 'banned', 'this account may not post');
  const key = K.album(slug), id = String(body.id == null ? '' : body.id);
  const find = async () => { const raw = await db('LRANGE', key, 0, -1); const hit = raw.map(s => [s, one(s)]).find(([, p]) => p && p.id === id); return hit || [null, null]; };
  switch (body.op) {
    case 'post': {
      if (!(await spend(me.id, 'post'))) throw bad(429, 'rate', 'that is a lot of photos in one hour — take a breath');
      const cap = text(body.cap, CAP.cap);
      if (!cap) throw bad(400, 'cap', 'give it a caption');
      const pic = decode(body.src);
      if (!pictures) throw bad(503, 'no-store', 'this site has no store for pictures yet');
      const pid = newId(), name = 'album/' + slug + '/' + pid + '.' + pic.ext;
      const src = await pictures.put(name, pic);
      const p = { id: pid, by: me.id, at: Date.now(), cap, where: text(body.where, CAP.where), src, key: name };
      // the list keeps KEEP: what this one pushes off the end takes its picture and its hearts with it
      const over = (await db('LRANGE', key, KEEP - 1, -1)), gone = over.map(one).filter(Boolean);
      if (over.length) {
        await dbm(over.map(s => ['LREM', key, 0, s]).concat(gone.map(g => ['DEL', K.albumLike(slug, g.id)])));
        await pictures.del(gone.map(g => g.key).filter(Boolean));
      }
      await db('LPUSH', key, JSON.stringify(p));
      return answer(res, 200, { ok: true, photo: shown(p, me.tag, 0, false) });
    }
    case 'like': {
      if (!(await spend(me.id, 'other'))) throw bad(429, 'rate', 'that is a lot in one hour — take a breath');
      const [, p] = await find();
      if (!p) throw bad(404, 'photo', 'no such photo');
      const on = body.on === undefined ? true : !!body.on;
      await db(on ? 'SADD' : 'SREM', K.albumLike(slug, id), me.id);
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
module.exports.KEEP = KEEP;                   // for the probe
