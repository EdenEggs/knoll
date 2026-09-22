/* ── api/hill.js — THE DOOR A HILL IS PUBLISHED THROUGH ─────────────────────
   One Vercel function, reached at /api/hill on the deployed site, and the
   same module mounted by serve.js at the same path on the dev server — so
   the yard's save button posts to one address wherever it is opened.

   WHAT IS KEPT is a hill's DOC: everything on the page that is the owner's
   to publish — the wall (every stroke, sticker, tracing, note and gif),
   the tracing library the stamps are drawn from, where the plot's trees
   stand, and the two names. It is the benches' wall-seed.json with a page
   around it, and it is written whole: the post is the file.

   THREE STORES, ONE SHAPE.
     blob · deployed, with a Vercel Blob store linked to the project
            (BLOB_READ_WRITE_TOKEN). latest.json is overwritten with a 60 s
            edge cache, so a visitor sees a save inside a minute; every save
            is also kept as v/<t>.json, immutable, which is what the
            dashboard's "past looks" open. Reads go to the store's public
            URL — a cache HIT is free, a MISS is one simple operation; only
            a save spends the two advanced operations (2,000 a month on
            Hobby), never a visit.
     file · the dev server: <hill>/hill.json and <hill>/looks/<t>.json.
            hill.json is committed and deploys, so a site with no Blob
            store still opens on the last wall published from here — the
            page falls back to it when this door says it has nothing.
     none · deployed with no store: GET says empty, POST says 503.

   WHO MAY WRITE. KNOLL_OWNER_KEY, compared in constant time against the
   x-knoll-key header; the yard asks the owner for it once and keeps it in
   that browser. With no key set the door is open on the dev server (there
   is nobody else on localhost) and shut on Vercel — an unset key must
   never mean "anyone".

   A YARD OF ONE'S OWN (2026-09-21). Since /signup made accounts
   (api/auth.js), /yard is the signed-in gnome's page, and it publishes to a
   hill named for them: u-<the account's id>. That hill wants no key — it
   wants THEIR session (api/wall.js: THE SITE'S SESSION IS A COOKIE), and
   nobody else's; thirty saves an hour. On the dev server it is kept under
   yard/looks/<hill>/, which git and the deploy both leave alone. 'yard' —
   the owner's hill, the one the dashboard began on — is as it was, and no
   other name is a hill (a name was a folder at the site's root).

   ANYONE CAN OPEN A PUBLISHED YARD, so every save is checked for what
   yard/wall.js draws straight into markup before it is kept: a tracing's
   paths (the tracing table's own shape and nothing else — api/wall.js's
   cleanTracing), a video's id and size, a gif's address (KLIPY's hosts).

   ponytail: a save is two Blob advanced operations — Hobby's 2,000 a month
   is a thousand saves across every yard on the site. */
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const W = require('./wall.js');

const ROOT = process.env.HILL_ROOT || path.join(__dirname, '..');   // the file store's; a probe points it at a temp folder
const BLOB_API = 'https://blob.vercel-storage.com';
const BLOB_VERSION = '12';                   // @vercel/blob 2.8's x-api-version
const KEEP = 40;                             // versions kept per hill
const MAX_BODY = 4 * 1024 * 1024;            // Vercel's own body limit is 4.5 MB
const HILL = /^(yard|u-[0-9a-f]{16})$/, MINE = /^u-[0-9a-f]{16}$/;
const SAVES = 30;                            // an hour, per yard of one's own

// ── replies ───────────────────────────────────────────────────────────────
function answer(res, status, out) {
  res.statusCode = status;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.setHeader('cache-control', 'no-store');
  res.end(JSON.stringify(out));
}

// ── the body, on either host ──────────────────────────────────────────────
/* Vercel parses it (req.body is an object for JSON, a string for text/plain,
   and throws on malformed JSON); serve.js hands over the raw stream. */
function readBody(req) {
  if (req.body !== undefined) {
    const b = req.body;
    if (b && typeof b === 'object' && !Buffer.isBuffer(b)) return Promise.resolve(b);
    return Promise.resolve(JSON.parse(Buffer.isBuffer(b) ? b.toString('utf8') : (String(b || '') || '{}')));
  }
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', c => { raw += c; if (raw.length > MAX_BODY) { req.destroy(); reject(new Error('the post is too big')); } });
    req.on('end', () => { try { resolve(raw ? JSON.parse(raw) : {}); } catch (e) { reject(new Error('the post is not JSON')); } });
    req.on('error', reject);
  });
}

// ── the owner's key ───────────────────────────────────────────────────────
function sameSecret(a, b) {
  const ha = crypto.createHash('sha256').update(String(a), 'utf8').digest();
  const hb = crypto.createHash('sha256').update(String(b), 'utf8').digest();
  return crypto.timingSafeEqual(ha, hb);
}

// ── the three stores ──────────────────────────────────────────────────────
const token = () => process.env.BLOB_READ_WRITE_TOKEN || '';
const storeId = () => token().split('_')[3] || '';   // vercel_blob_rw_<STORE>_<secret>, as @vercel/blob reads it
const publicUrl = name => 'https://' + storeId() + '.public.blob.vercel-storage.com/' + name;
const blobHeaders = extra => Object.assign({ authorization: 'Bearer ' + token(), 'x-api-version': BLOB_VERSION, 'x-vercel-blob-store-id': storeId() }, extra || {});

const blob = {
  kind: 'blob',
  async get(name) {
    const r = await fetch(publicUrl(name), { cache: 'no-store' });
    if (r.status === 404 || r.status === 403) return null;
    if (!r.ok) throw new Error('the store answered ' + r.status + ' reading ' + name);
    return r.json();
  },
  async put(name, obj, maxAge) {
    const r = await fetch(BLOB_API + '/' + name, {
      method: 'PUT',
      headers: blobHeaders({ 'x-content-type': 'application/json', 'x-add-random-suffix': '0',
                             'x-allow-overwrite': '1', 'x-cache-control-max-age': String(maxAge) }),
      body: JSON.stringify(obj)
    });
    if (!r.ok) throw new Error('the store answered ' + r.status + ' writing ' + name + ': ' + (await r.text()).slice(0, 160));
    return r.json();
  },
  async del(names) {
    if (!names.length) return;
    await fetch(BLOB_API + '/delete', { method: 'POST', headers: blobHeaders({ 'content-type': 'application/json' }),
                                        body: JSON.stringify({ urls: names.map(publicUrl) }) }).catch(() => {});
  }
};

const fileOf = name => {
  const [hill, rest] = [name.split('/')[1], name.split('/').slice(2).join('/')];
  // a yard of one's own is this machine's: beside the yard's looks, never at the root
  const dir = MINE.test(hill) ? path.join(ROOT, 'yard', 'looks', hill) : path.join(ROOT, hill);
  return rest === 'latest.json' ? path.join(dir, 'hill.json') : path.join(MINE.test(hill) ? dir : path.join(dir, 'looks'), rest.replace(/^v\//, ''));
};
const file = {
  kind: 'file',
  async get(name) { try { return JSON.parse(fs.readFileSync(fileOf(name), 'utf8')); } catch (e) { return null; } },
  async put(name, obj) {
    const f = fileOf(name);
    fs.mkdirSync(path.dirname(f), { recursive: true });
    fs.writeFileSync(f + '.tmp', JSON.stringify(obj));
    fs.renameSync(f + '.tmp', f);
    return { url: f };
  },
  async del(names) { names.forEach(n => { try { fs.unlinkSync(fileOf(n)); } catch (e) {} }); }
};

const none = {
  kind: 'none',
  async get() { return null; },
  async put() { throw new Error('no store: link a Vercel Blob store to the project (BLOB_READ_WRITE_TOKEN) — see yard/about.md'); },
  async del() {}
};

const storeFor = () => token() ? blob : (process.env.VERCEL ? none : file);
const canSave = (st, hill) => st.kind === 'file' || (st.kind === 'blob' && (MINE.test(hill) || !!process.env.KNOLL_OWNER_KEY));

// ── the doc, checked ──────────────────────────────────────────────────────
const str = (s, n) => String(s == null ? '' : s).replace(/[\x00-\x1f\x7f]/g, '').trim().slice(0, n).trim();
const fin = v => typeof v === 'number' && Number.isFinite(v);
/* ONE PIECE, AS OTHER PEOPLE'S BROWSERS WILL DRAW IT (see ANYONE CAN OPEN A
   PUBLISHED YARD): every value a number, a string or a flag; a kind the
   wall knows; and the two kinds yard/wall.js writes into markup held to
   what the dock makes — a video is a YouTube id and a size in numbers
   (videoArt() puts the size straight into its markup), a gif is on KLIPY. */
function piece(it, i) {
  const bad = why => new Error('piece ' + (i + 1) + ' ' + why + ' — not saved');
  for (const v of Object.values(it)) if (!(fin(v) || typeof v === 'string' || typeof v === 'boolean' || v == null)) throw bad('is not a piece');
  if (!W.KINDS.has(it.k)) throw bad('is of no kind this wall knows');
  if ((it.k === 'v' || it.k === 'g') && !(fin(it.w) && fin(it.h) && it.w >= 1 && it.h >= 1)) throw bad('has no size');
  if (it.k === 'v' && !(typeof it.id === 'string' && W.VID_RE.test(it.id))) throw bad('is not a YouTube video');
  if (it.k === 'g' && !(typeof it.u === 'string' && it.u.length <= 512 && W.GIF_RE.test(it.u))) throw bad('is a gif from somewhere other than KLIPY');
  return it;
}
function clean(d) {
  if (!d || typeof d !== 'object') throw new Error('no doc in the post');
  const items = (d.wall && Array.isArray(d.wall.items) ? d.wall.items : []).filter(it => it && typeof it === 'object' && typeof it.k === 'string');
  const raw = (d.flatfile && Array.isArray(d.flatfile.list) ? d.flatfile.list : []).filter(t => t && typeof t === 'object' && t.id);
  if (items.length > W.CAP.items) throw new Error('a yard holds ' + W.CAP.items + ' pieces at most');
  if (raw.length > W.CAP.tracings) throw new Error('a yard files ' + W.CAP.tracings + ' tracings at most');
  items.forEach(piece);
  const list = raw.map(t => W.cleanTracing(t));
  const plot = {};
  if (d.plot && typeof d.plot === 'object') {
    for (const [k, v] of Object.entries(d.plot)) {
      if (/^[a-z0-9-]{1,40}$/.test(k) && v && Number.isFinite(+v.x) && Number.isFinite(+v.y)) plot[k] = { x: +v.x, y: +v.y };
    }
  }
  return { wall: { items }, flatfile: { list }, plot, name: str(d.name, 24), plotName: str(d.plotName, 28) };
}

// ── GET ───────────────────────────────────────────────────────────────────
async function get(res, q) {
  const hill = q.get('hill') || 'yard';
  if (!HILL.test(hill)) return answer(res, 400, { ok: false, error: 'not a hill' });
  const st = storeFor();
  if (q.get('ping')) return answer(res, 200, { ok: true, door: true, store: st.kind, save: canSave(st, hill) });
  const at = q.get('at');
  if (at) {
    if (!/^\d{10,16}$/.test(at)) return answer(res, 400, { ok: false, error: 'not a version' });
    const doc = await st.get('hills/' + hill + '/v/' + at + '.json');
    return doc ? answer(res, 200, { ok: true, doc }) : answer(res, 404, { ok: false, error: 'no such version' });
  }
  const doc = await st.get('hills/' + hill + '/latest.json');
  if (!doc) return answer(res, 200, { ok: false, empty: true, store: st.kind });
  answer(res, 200, { ok: true, doc });
}

// ── POST ──────────────────────────────────────────────────────────────────
async function post(req, res) {
  let body;
  try { body = await readBody(req); } catch (e) { return answer(res, 400, { ok: false, error: e.message }); }
  const hill = str(body.hill || 'yard', 32);
  if (!HILL.test(hill)) return answer(res, 400, { ok: false, error: 'not a hill' });

  const st = storeFor();
  if (st.kind === 'none') return answer(res, 503, { ok: false, error: 'this site has no store to publish into yet — link a Vercel Blob store to the project (see yard/about.md)' });
  const want = process.env.KNOLL_OWNER_KEY;
  if (MINE.test(hill)) {                     // see A YARD OF ONE'S OWN
    if (!W.sameSite(req)) return answer(res, 403, { ok: false, code: 'origin', error: 'that post came from another site' });
    if (!W.storeFor()) return answer(res, 503, { ok: false, error: 'this site has no store for accounts yet, so nobody is signed in to publish' });
    const me = await W.whoIs(req);
    if (!me) return answer(res, 401, { ok: false, code: 'who', error: 'your sign-in has lapsed — log in again to save' });
    if ('u-' + me.id !== hill) return answer(res, 403, { ok: false, code: 'theirs', error: 'that yard is somebody else\'s' });
    const k = W.K.rl('hill:' + me.id, Math.floor(Date.now() / 36e5)), n = await W.db('INCR', k);
    if (n === 1) await W.db('EXPIRE', k, 3600);
    if (n > SAVES) return answer(res, 429, { ok: false, code: 'rate', error: SAVES + ' saves in an hour is the most a yard takes — try again in a while' });
  } else if (want) {
    const got = req.headers['x-knoll-key'];
    if (!got || !sameSecret(got, want)) return answer(res, 401, { ok: false, error: 'this yard wants its owner\'s key' });
  } else if (process.env.VERCEL) {
    return answer(res, 503, { ok: false, error: 'KNOLL_OWNER_KEY is not set on this site, so nobody may publish (see yard/about.md)' });
  }

  let doc;
  try { doc = clean(body.doc); } catch (e) { return answer(res, 400, { ok: false, error: e.message }); }
  const t = Date.now(), n = doc.wall.items.length;
  const prev = await st.get('hills/' + hill + '/latest.json');
  const was = (prev && Array.isArray(prev.looks) ? prev.looks : []).filter(l => l && Number.isFinite(+l.t));
  const looks = [{ t, n }].concat(was).slice(0, KEEP);
  Object.assign(doc, { hill, t, looks });

  await st.put('hills/' + hill + '/v/' + t + '.json', doc, 31536000);
  await st.put('hills/' + hill + '/latest.json', doc, 60);
  await st.del(was.slice(KEEP - 1).map(l => 'hills/' + hill + '/v/' + l.t + '.json'));   // the versions that fell off the end
  answer(res, 200, { ok: true, t, n, looks, store: st.kind });
}

module.exports = async function handler(req, res) {
  try {
    const q = new URL(req.url, 'http://x').searchParams;
    if (req.method === 'GET') return await get(res, q);
    if (req.method === 'POST') return await post(req, res);
    answer(res, 405, { ok: false, error: 'GET or POST' });
  } catch (e) {
    answer(res, 500, { ok: false, error: String((e && e.message) || e) });
  }
};
module.exports.clean = clean;
