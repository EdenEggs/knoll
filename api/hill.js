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

   PROPOSALS (2026-09-22). A profile is a gnome's name and their yard. The
   owner changes either whenever they like (a save here; op 'name' at
   api/auth.js). Anybody else signed in may PROPOSE a change — a new name for
   them, their yard as the proposer would have it, or both, and a line on
   why — and it waits for the owner to take it or leave it. A moderator may
   leave it for them (spam, say), and never takes one: nobody's name or yard
   changes but by their own hand.

     POST { op: 'propose', hill: 'u-<id>', name?, doc?, why? } → { ok, id }
          { op: 'decide', id, do: 'accept' | 'decline' | 'withdraw', why?, force? }
          { op: 'take', ids: [id, …] }   → { ok, t, took }   (the owner: what each CHANGES, made to the yard as it stands — see below)
          { op: 'restore', t }           → { ok, t }         (the owner: a past save put up again, as a new one)
     GET  ?proposals=1&hill=u-<id>   the open ones, the decided ones (`done`) and the yard's saves (`looks`) (the owner, a moderator)
          ?proposal=<id>             one, with its yard (the owner, the proposer, a moderator)
          ?hill=u-<id>&with=<id>,…   the yard as it would be with those taken, and nothing kept (the owner)

   WHAT A PROPOSAL CHANGES (2026-09-27). A proposal is still the whole yard as
   its proposer would have it, but what it changes can be told by holding it
   against the yard it was made on (`base`, that save's version): the pieces
   it has that the base has not are put up, the ones the base has that it has
   not are taken down, a tree stood somewhere else has moved, a tracing the
   base's library lacks is filed, the plot's name may be new. Pieces have no
   names, so they are told apart by what they are — every field — and two
   alike are counted. `take` makes those changes to the yard AS IT STANDS
   NOW, for one proposal or for several together (oldest first), as one save:
   so the owner's own saves since are kept, which `accept` — the whole yard,
   in place of the owner's — cannot do, and two people's ideas can both be
   had. A base that has fallen off the end of the versions (KEEP) cannot be
   told apart from its proposal any more: that one is `accept`'s, or nobody's.
   Every decision rings the proposer's bell, and a proposal the owner's.

   Taking a yard puts it up as the owner's own save would, a version like
   any other. It was proposed against the yard as it stood (`base`, that
   save's t): if the owner has saved since, taking it would throw that save
   away, so it is refused as stale unless the owner says `force`. A proposed
   yard is checked as a save is (clean()) before it is kept; the proposer may
   withdraw it; open ones lapse after PROP_DAYS, and a decided one keeps its
   record — not its yard — PROP_KEEP days. Caps: PROP_BY open per proposer,
   PROP_IP per address, PROP_ON per yard, PROPS_HOUR an hour, PROP_MAX bytes.

   A banned account publishes nothing, and proposes and decides nothing.

   ponytail: a save is two Blob advanced operations — Hobby's 2,000 a month
   is a thousand saves across every yard on the site. And a proposal is the
   whole yard, not a patch: the yard's pieces carry no names to patch by
   (TOEM 2's do — api/wall.js); when they do, a proposal can be only the
   pieces it changes. Until then a piece MOVED is one taken down and one put
   up, and two proposals that move the same piece leave it in both places.
   A yard over PROP_MAX cannot be proposed whole. The stale check
   reads latest.json through the Blob store's 60 s edge cache, so a save
   made in the minute before can slip past it — as it can past the looks
   list of a save made that soon after another; a cache-busting read (a MISS,
   one simple operation) is the upgrade if that ever bites. */
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
const PROP_RE = /^p[a-z0-9]{12,40}$/, PROP_MAX = 1024 * 1024;   // a proposed yard: the wall's own cap on a post (api/wall.js)
const PROP_BY = 3, PROP_IP = 6, PROP_ON = 20, PROPS_HOUR = 10, PROP_DAYS = 7, PROP_KEEP = 30;
const DONE_KEEP = 50;                        // decided proposals a yard's history lists
const LOOKS = 240;                           // looks ahead (?with=) an hour, an owner
const TAKING_S = 20;                         // how long a proposal being taken is held, so two takes at once cannot both have it

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
    // THE PATHNAME RIDES IN THE QUERY, NOT THE PATH (2026-09-24): x-api-version 12 — what
    // @vercel/blob 2.x sends as requestApi('?pathname=…') — answers a pathname in the URL
    // path with 400 "Invalid pathname", which is what every yard save on Vercel got until now.
    const r = await fetch(BLOB_API + '/?' + new URLSearchParams({ pathname: name }), {
      method: 'PUT',
      headers: blobHeaders({ 'x-vercel-blob-access': 'public', 'x-content-type': 'application/json', 'x-add-random-suffix': '0',
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

// ── what a proposal changes (see WHAT A PROPOSAL CHANGES) ──────────────────
const blank = () => ({ wall: { items: [] }, flatfile: { list: [] }, plot: {}, name: '', plotName: '' });
const sameAs = it => JSON.stringify(Object.keys(it).sort().map(k => [k, it[k]]));   // a piece, as what it is
function changesOf(base, doc) {
  const had = new Map(), add = [], del = [], plot = {};
  base.wall.items.forEach(it => { const k = sameAs(it); had.set(k, (had.get(k) || 0) + 1); });
  doc.wall.items.forEach(it => { const k = sameAs(it), n = had.get(k) || 0; if (n) had.set(k, n - 1); else add.push(it); });
  had.forEach((n, k) => { for (let i = 0; i < n; i++) del.push(k); });
  /* a tree the base gives no place to stands where the page puts it by default, which this door does not
     know: its place in the proposal is kept (it is that default, or a move) but only a tree the base DID
     place, somewhere else, is counted as moved */
  let moved = 0;
  Object.keys(doc.plot).forEach(k => { const a = base.plot[k], b = doc.plot[k]; if (!a || a.x !== b.x || a.y !== b.y) { plot[k] = b; if (a) moved++; } });
  const filed = doc.flatfile.list.filter(t => !base.flatfile.list.some(b => b.id === t.id));
  return Object.assign({ add, del, plot, moved, filed }, doc.plotName !== base.plotName ? { plotName: doc.plotName } : {});
}
function change(doc, c) {                    // …made to a yard
  c.del.forEach(k => { const i = doc.wall.items.findIndex(it => sameAs(it) === k); if (i >= 0) doc.wall.items.splice(i, 1); });   // already gone is gone
  doc.wall.items.push(...c.add);
  Object.assign(doc.plot, c.plot);
  c.filed.forEach(t => { if (!doc.flatfile.list.some(b => b.id === t.id)) doc.flatfile.list.push(t); });
  if (c.plotName != null) doc.plotName = c.plotName;
  return doc;
}
const counts = c => ({ add: c.add.length, del: c.del.length, moved: c.moved, filed: c.filed.length, plotName: c.plotName });
// the yard a proposal was made on: that version, nothing at all if there was no yard yet, null if the version is gone
const baseOf = async (st, p) => (p.base ? st.get('hills/' + p.hill + '/v/' + p.base + '.json').then(d => (d ? clean(d) : null)) : blank());
const gone = (code, error, extra) => Object.assign(new Error(error), { status: 409, code, extra });
/* The yard as it stands with these proposals' changes made to it, oldest first. Throws what
   `take` and the preview both answer with: `old` for a base that is gone, `doc` for a yard that
   no longer passes the checks a save does — one proposal's, or all of them together. */
async function together(st, hill, ps) {
  const latest = await st.get('hills/' + hill + '/latest.json');
  let doc = latest ? clean(latest) : blank();
  for (const p of ps.filter(p => p.to.doc).sort((a, b) => a.at - b.at)) {
    const base = await baseOf(st, p);
    if (!base) throw gone('old', 'the yard ' + (p.name || 'that one') + ' proposed against is too many saves ago to tell what they changed — take theirs whole, or leave it', { id: p.id });
    let theirs;
    try { theirs = clean(JSON.parse((await W.db('GET', W.K.propDoc(p.id))) || 'null')); }
    catch (e) { throw gone('doc', 'that yard no longer passes the checks a save does: ' + e.message, { id: p.id }); }
    change(doc, changesOf(base, theirs));
  }
  try { doc = clean(doc); } catch (e) { throw gone('doc', 'taken together they are more than a yard holds: ' + e.message); }
  return doc;
}
// the proposals named, each open and each to this yard — or what is wrong with the asking
async function theirsToTake(ids, hill) {
  if (!ids.length || ids.length > PROP_ON || !ids.every(id => PROP_RE.test(id))) throw Object.assign(new Error('name the proposals to take — one to ' + PROP_ON + ' of them'), { status: 400, code: 'take' });
  const ps = (await W.dbm(ids.map(id => ['GET', W.K.prop(id)]))).map(r => r && JSON.parse(r));
  ps.forEach((p, i) => {
    if (!p) throw Object.assign(new Error('no such proposal (an open one lapses after ' + PROP_DAYS + ' days)'), { status: 404, code: 'proposal', extra: { id: ids[i] } });
    if (p.hill !== hill) throw Object.assign(new Error('that proposal is to somebody else\'s yard'), { status: 403, code: 'theirs', extra: { id: p.id } });
    if (p.status !== 'open') throw gone('decided', 'that proposal is ' + p.status + ' already', { id: p.id });
  });
  return ps;
}
const idsOf = v => [...new Set((Array.isArray(v) ? v : String(v || '').split(',')).map(String).filter(Boolean))];
const says = (res, e) => answer(res, e.status, Object.assign({ ok: false, code: e.code, error: e.message }, e.extra || {}));

// ── GET ───────────────────────────────────────────────────────────────────
async function get(req, res, q) {
  if (q.get('proposal') || q.get('proposals')) return readProposals(req, res, q);
  const hill = q.get('hill') || 'yard';
  if (!HILL.test(hill)) return answer(res, 400, { ok: false, error: 'not a hill' });
  const st = storeFor();
  if (q.get('with')) {                       // the owner's look at their yard with some proposals taken: nothing is kept
    const me = W.storeFor() ? await W.whoIs(req) : null;
    if (!me) return answer(res, 401, { ok: false, code: 'who', error: 'sign in to see that' });
    if ('u-' + me.id !== hill) return answer(res, 403, { ok: false, code: 'theirs', error: 'that is for the yard\'s owner' });
    if (!(await withinHour('look:' + me.id, LOOKS))) return answer(res, 429, { ok: false, code: 'rate', error: 'that is a lot of looking in one hour — take a breath' });   // each reads a yard per proposal
    try { return answer(res, 200, { ok: true, doc: await together(st, hill, await theirsToTake(idsOf(q.get('with')), hill)) }); }
    catch (e) { if (e.status) return says(res, e); throw e; }
  }
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
  if (body && body.op) return proposalOp(req, res, body);   // a save is a hill and a doc; anything with an op is a PROPOSAL's
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
    if (me.banned) return answer(res, 403, { ok: false, code: 'banned', error: 'this account may not publish' });
    if ('u-' + me.id !== hill) return answer(res, 403, { ok: false, code: 'theirs', error: 'that yard is somebody else\'s' });
    if (!(await withinHour('hill:' + me.id, SAVES))) return answer(res, 429, { ok: false, code: 'rate', error: SAVES + ' saves in an hour is the most a yard takes — try again in a while' });
  } else if (want) {
    const got = req.headers['x-knoll-key'];
    if (!got || !sameSecret(got, want)) return answer(res, 401, { ok: false, error: 'this yard wants its owner\'s key' });
  } else if (process.env.VERCEL) {
    return answer(res, 503, { ok: false, error: 'KNOLL_OWNER_KEY is not set on this site, so nobody may publish (see yard/about.md)' });
  }

  let doc;
  try { doc = clean(body.doc); } catch (e) { return answer(res, 400, { ok: false, error: e.message }); }
  answer(res, 200, Object.assign({ ok: true, store: st.kind }, await save(st, hill, doc)));
}
// a clean doc goes up: latest, and a version beside it — the owner's save, or a proposal they took
async function save(st, hill, doc) {
  const t = Date.now(), n = doc.wall.items.length;
  const prev = await st.get('hills/' + hill + '/latest.json');
  const was = (prev && Array.isArray(prev.looks) ? prev.looks : []).filter(l => l && Number.isFinite(+l.t));
  const looks = [{ t, n }].concat(was).slice(0, KEEP);
  Object.assign(doc, { hill, t, looks });
  await st.put('hills/' + hill + '/v/' + t + '.json', doc, 31536000);
  await st.put('hills/' + hill + '/latest.json', doc, 60);
  await st.del(was.slice(KEEP - 1).map(l => 'hills/' + hill + '/v/' + l.t + '.json'));   // the versions that fell off the end
  return { t, n, looks };
}
async function withinHour(who, cap) {        // one more against the hour (api/wall.js's rl: keys); false once past the cap
  const k = W.K.rl(who, Math.floor(Date.now() / 36e5)), n = await W.db('INCR', k);
  if (n === 1) await W.db('EXPIRE', k, 3600);
  return n <= cap;
}

// ── PROPOSALS ─────────────────────────────────────────────────────────────
async function openOnes(key) {               // a list of proposal ids, kept to the ones still open
  const ids = await W.db('LRANGE', key, 0, -1);
  if (!ids.length) return [];
  const raws = await W.dbm(ids.map(id => ['GET', W.K.prop(id)])), open = [], gone = [];
  raws.forEach((raw, i) => { const p = raw && JSON.parse(raw); if (p && p.status === 'open') open.push(p); else gone.push(['LREM', key, 0, ids[i]]); });
  if (gone.length) await W.dbm(gone);
  return open;
}
async function proposalOp(req, res, body) {
  if (!W.sameSite(req)) return answer(res, 403, { ok: false, code: 'origin', error: 'that post came from another site' });
  if (!W.storeFor()) return answer(res, 503, { ok: false, error: 'this site has no store for accounts yet' });
  const me = await W.whoIs(req);
  if (!me) return answer(res, 401, { ok: false, code: 'who', error: 'sign in to do that' });
  if (me.banned) return answer(res, 403, { ok: false, code: 'banned', error: 'this account may not change anybody\'s yard' });
  if (body.op === 'propose') return propose(req, res, me, body);
  if (body.op === 'decide') return decide(res, me, body);
  if (body.op === 'take') return take(res, me, body);
  if (body.op === 'restore') return restore(res, me, body);
  answer(res, 400, { ok: false, code: 'op', error: 'no such op' });
}
// a decision, written down: the record kept PROP_KEEP days and its yard let go, off the lists of the open, onto the yard's history — and the proposer told
async function decided(p, status, me, extra) {
  Object.assign(p, { status, decided: { by: me.id, at: Date.now() } }, extra || {});
  await W.dbm([['SET', W.K.prop(p.id), JSON.stringify(p), 'EX', PROP_KEEP * 86400], ['DEL', W.K.propDoc(p.id)],
               ['LREM', W.K.props(p.hill), 0, p.id], ['LREM', W.K.propsBy(p.by), 0, p.id],
               ['LPUSH', W.K.propsDone(p.hill), p.id], ['LTRIM', W.K.propsDone(p.hill), 0, DONE_KEEP - 1], ['EXPIRE', W.K.propsDone(p.hill), PROP_KEEP * 86400]]);
  if (status !== 'withdrawn' && me.id !== p.by) await W.tell(p.by, status === 'accepted' ? 'taken' : 'left', me.id, Object.assign({ prop: p.id }, p.answer ? { why: p.answer } : {}));
}
/* THE OWNER TAKES ONE, OR SEVERAL TOGETHER: what each changes, made to the yard as it stands,
   as one save (see WHAT A PROPOSAL CHANGES). One name at most among them — two proposed names
   are two decisions. */
async function take(res, me, body) {
  const hill = 'u-' + me.id, st = storeFor();
  try {
    const ps = await theirsToTake(idsOf(body.ids), hill);
    const named = ps.filter(p => p.to.name), names = [...new Set(named.map(p => p.to.name))];
    if (names.length > 1) throw gone('names', 'two of these propose different names for you — take them one at a time');
    const yards = ps.some(p => p.to.doc);
    if (yards && st.kind === 'none') return answer(res, 503, { ok: false, error: 'this site has no store for yards yet' });
    if (yards && !(await withinHour('hill:' + me.id, SAVES))) return answer(res, 429, { ok: false, code: 'rate', error: SAVES + ' saves in an hour is the most a yard takes — try again in a while' });
    /* EACH IS HELD WHILE IT IS TAKEN: two takes at once — a button pressed twice, two tabs — would
       both find them open, and the second would put every piece up again on top of the first.
       The hold is let go of whatever happens; a take that died holding it frees in TAKING_S. */
    const held = [];
    try {
      for (const p of ps) { if (!(await W.db('SET', W.K.lock(p.id), me.id, 'NX', 'EX', TAKING_S))) throw gone('busy', 'that one is being taken already — give it a moment', { id: p.id }); held.push(p.id); }
      const doc = yards ? await together(st, hill, ps) : null;
      if (names.length) await W.rename(me.id, names[0], named[0].by);   // first: a name that cannot be had leaves the yard as it was, and the proposals open
      const t = doc ? (await save(st, hill, doc)).t : undefined;
      for (const p of ps) await decided(p, 'accepted', me, Object.assign(p.to.doc ? { took: t } : {}, ps.length > 1 ? { among: ps.length } : {}));
      answer(res, 200, { ok: true, t, took: ps.map(p => p.id) });
    } finally { if (held.length) await W.dbm(held.map(id => ['DEL', W.K.lock(id)])).catch(() => {}); }
  } catch (e) { if (e.status) return says(res, e); throw e; }
}
// a past save, put up again as a new one: what undoes a change taken and regretted
async function restore(res, me, body) {
  const hill = 'u-' + me.id, st = storeFor(), t = String(body.t == null ? '' : body.t);
  if (!/^\d{10,16}$/.test(t)) return answer(res, 400, { ok: false, code: 'version', error: 'not a version' });
  if (st.kind === 'none') return answer(res, 503, { ok: false, error: 'this site has no store for yards yet' });
  const was = await st.get('hills/' + hill + '/v/' + t + '.json');
  if (!was) return answer(res, 404, { ok: false, code: 'version', error: 'no such save (a yard keeps its last ' + KEEP + ')' });
  if (!(await withinHour('hill:' + me.id, SAVES))) return answer(res, 429, { ok: false, code: 'rate', error: SAVES + ' saves in an hour is the most a yard takes — try again in a while' });
  let doc;
  try { doc = clean(was); } catch (e) { return answer(res, 409, { ok: false, code: 'doc', error: 'that save no longer passes the checks a save does: ' + e.message }); }
  answer(res, 200, Object.assign({ ok: true, from: +t }, await save(st, hill, doc)));
}
async function propose(req, res, me, body) {
  const hill = str(body.hill, 32), owner = hill.slice(2);
  if (!MINE.test(hill)) return answer(res, 400, { ok: false, error: 'a proposal goes to a gnome\'s own yard' });
  if (owner === me.id) return answer(res, 400, { ok: false, code: 'yours', error: 'it is your own yard — change it and save' });
  if (!(await W.db('HGET', W.K.user(owner), 'made'))) return answer(res, 404, { ok: false, code: 'user', error: 'no such gnome' });
  const to = {};
  let doc = null;
  if (body.name != null && !(to.name = W.cleanName(body.name))) return answer(res, 400, { ok: false, code: 'name', error: 'a proposed name has to be a name' });
  if (body.doc != null) {
    try { doc = JSON.stringify(clean(body.doc)); } catch (e) { return answer(res, 400, { ok: false, code: 'doc', error: e.message }); }
    if (doc.length > PROP_MAX) return answer(res, 413, { ok: false, code: 'size', error: 'a proposed yard can be ' + (PROP_MAX >> 10) + ' KB at most' });
    Object.assign(to, { doc: true, pieces: JSON.parse(doc).wall.items.length });
  }
  if (body.why != null && typeof body.why !== 'string') return answer(res, 400, { ok: false, code: 'why', error: 'why is a line of words' });
  if (!to.name && !doc) return answer(res, 400, { ok: false, code: 'empty', error: 'propose a name, or a yard, or both' });
  const st = storeFor();
  if (doc && st.kind === 'none') return answer(res, 503, { ok: false, error: 'this site has no store for yards yet' });
  if (!(await withinHour('prop:' + me.id, PROPS_HOUR))) return answer(res, 429, { ok: false, code: 'rate', error: PROPS_HOUR + ' proposals in an hour is plenty — try again in a while' });
  const ip = W.ipHash(req);
  const [mine, here, there] = await Promise.all([openOnes(W.K.propsBy(me.id)), openOnes(W.K.propsIp(ip)), openOnes(W.K.props(hill))]);
  if (mine.length >= PROP_BY) return answer(res, 429, { ok: false, code: 'full', error: 'you have ' + PROP_BY + ' proposals waiting already — wait for one of them' });
  if (here.length >= PROP_IP) return answer(res, 429, { ok: false, code: 'full', error: 'this address has ' + PROP_IP + ' proposals waiting already' });
  if (there.length >= PROP_ON) return answer(res, 429, { ok: false, code: 'full', error: 'that yard has ' + PROP_ON + ' proposals waiting already' });
  const latest = doc ? await st.get('hills/' + hill + '/latest.json') : null;
  // what it changes, counted while the yard it was made on is to hand (WHAT A PROPOSAL CHANGES): the owner's list says so without opening each
  if (doc) { try { to.changes = counts(changesOf(latest ? clean(latest) : blank(), JSON.parse(doc))); } catch (e) {} }
  if (doc && to.changes && !to.name && !(to.changes.add || to.changes.del || to.changes.moved || to.changes.filed || to.changes.plotName != null))
    return answer(res, 400, { ok: false, code: 'same', error: 'that is their yard as it already is — change something first' });
  const id = 'p' + Date.now().toString(36) + crypto.randomBytes(6).toString('hex'), ex = PROP_DAYS * 86400;
  const p = { id, hill, by: me.id, name: me.tag || me.name, at: Date.now(), base: latest ? latest.t : 0, why: W.text(body.why, 140), to, status: 'open' };
  const cmds = [['SET', W.K.prop(id), JSON.stringify(p), 'EX', ex], ['RPUSH', W.K.props(hill), id], ['RPUSH', W.K.propsBy(me.id), id],
                ['RPUSH', W.K.propsIp(ip), id], ['EXPIRE', W.K.propsIp(ip), ex]];
  if (doc) cmds.push(['SET', W.K.propDoc(id), doc, 'EX', ex]);
  await W.dbm(cmds);
  await W.tell(owner, 'proposal', me.id, Object.assign({ prop: id }, to.name ? { what: to.name } : {}));   // THE BELL: the owner hears of it
  answer(res, 200, { ok: true, id, status: 'open' });
}
async function decide(res, me, body) {
  const id = String(body.id || ''), what = body.do;
  if (!PROP_RE.test(id) || !['accept', 'decline', 'withdraw'].includes(what)) return answer(res, 400, { ok: false, code: 'decide', error: 'decide wants a proposal id, and accept, decline or withdraw' });
  const raw = await W.db('GET', W.K.prop(id));
  if (!raw) return answer(res, 404, { ok: false, code: 'proposal', error: 'no such proposal (an open one lapses after ' + PROP_DAYS + ' days)' });
  const p = JSON.parse(raw), owner = p.hill.slice(2);
  if (p.status !== 'open') return answer(res, 409, { ok: false, code: 'decided', error: 'that proposal is ' + p.status + ' already' });
  const may = what === 'withdraw' ? p.by === me.id : what === 'accept' ? me.id === owner : me.id === owner || W.isMod(me);
  if (!may) return answer(res, 403, { ok: false, code: 'theirs', error: { withdraw: 'only its proposer withdraws a proposal', accept: 'only the yard\'s owner takes a change to it', decline: 'that is for the yard\'s owner to decide' }[what] });
  if (what === 'accept') {
    const st = storeFor();
    let doc = null;
    if (p.to.doc) {
      if (st.kind === 'none') return answer(res, 503, { ok: false, error: 'this site has no store for yards yet' });
      const latest = await st.get('hills/' + p.hill + '/latest.json');
      if ((latest ? latest.t : 0) !== p.base && !body.force) return answer(res, 409, { ok: false, code: 'stale', error: 'the yard has been saved since this was proposed — look again, or take it anyway (force)', t: latest && latest.t });
      try { doc = clean(JSON.parse((await W.db('GET', W.K.propDoc(id))) || 'null')); }
      catch (e) { return answer(res, 409, { ok: false, code: 'doc', error: 'that yard no longer passes the checks a save does: ' + e.message }); }
    }
    if (p.to.name) await W.rename(owner, p.to.name, p.by);   // first: a name that cannot be had leaves the yard as it was, and the proposal open
    if (doc) p.took = (await save(st, p.hill, doc)).t;
  }
  if (body.why) p.answer = W.text(body.why, 140);
  await decided(p, { accept: 'accepted', decline: 'declined', withdraw: 'withdrawn' }[what], me);
  if (me.id !== owner && me.id !== p.by) await W.audit(me.id, 'proposal', { id, hill: p.hill, status: p.status });   // a moderator, declining on the owner's behalf
  answer(res, 200, { ok: true, id, status: p.status, t: p.took });
}
async function readProposals(req, res, q) {
  if (!W.storeFor()) return answer(res, 503, { ok: false, error: 'this site has no store for accounts yet' });
  const me = await W.whoIs(req);
  if (!me) return answer(res, 401, { ok: false, code: 'who', error: 'sign in to see proposals' });
  const id = q.get('proposal');
  if (id) {
    if (!PROP_RE.test(id)) return answer(res, 400, { ok: false, error: 'not a proposal id' });
    const raw = await W.db('GET', W.K.prop(id));
    if (!raw) return answer(res, 404, { ok: false, code: 'proposal', error: 'no such proposal' });
    const p = JSON.parse(raw);
    if (p.by !== me.id && p.hill !== 'u-' + me.id && !W.isMod(me)) return answer(res, 403, { ok: false, code: 'theirs', error: 'that proposal is between two other gnomes' });
    if (p.status === 'open' && p.to.doc) p.doc = JSON.parse((await W.db('GET', W.K.propDoc(id))) || 'null');
    return answer(res, 200, { ok: true, proposal: p });
  }
  const hill = q.get('hill') || '';
  if (!MINE.test(hill)) return answer(res, 400, { ok: false, error: 'not a gnome\'s yard' });
  if (hill !== 'u-' + me.id && !W.isMod(me)) return answer(res, 403, { ok: false, code: 'theirs', error: 'those are for the yard\'s owner' });
  // …and the yard's history beside them: what was decided (while its record lasts), and the saves a look can open
  const ids = await W.db('LRANGE', W.K.propsDone(hill), 0, DONE_KEEP - 1);
  const done = (ids.length ? await W.dbm(ids.map(id => ['GET', W.K.prop(id)])) : []).map(r => r && JSON.parse(r)).filter(Boolean);
  const latest = await storeFor().get('hills/' + hill + '/latest.json').catch(() => null);
  const tags = await W.tagsOf(done.map(p => p.by));
  answer(res, 200, { ok: true, proposals: await openOnes(W.K.props(hill)), done: done.map(p => Object.assign(p, { name: tags[p.by] || p.name })),
                     looks: latest && Array.isArray(latest.looks) ? latest.looks : [], t: latest ? latest.t : 0 });
}

module.exports = async function handler(req, res) {
  try {
    const q = new URL(req.url, 'http://x').searchParams;
    if (req.method === 'GET') return await get(req, res, q);
    if (req.method === 'POST') return await post(req, res);
    answer(res, 405, { ok: false, error: 'GET or POST' });
  } catch (e) {
    if (e instanceof W.Bad) return answer(res, e.status, { ok: false, code: e.code, error: e.message });   // a name that cannot be had, from api/wall.js
    // what went wrong is the log's (a store's answer names the store); the visitor gets the same line the other doors give
    console.error('api/hill.js: ' + String((e && e.stack) || e));
    answer(res, 500, { ok: false, code: 'server', error: 'the yard is having trouble — try again in a moment' });
  }
};
module.exports.clean = clean;
// for api/gallery.js, which keeps a page's photos in the same Blob store: the door, its headers, a name's public url, and the delete
module.exports.blob = { api: BLOB_API, headers: blobHeaders, url: publicUrl, token, del: names => blob.del(names) };
