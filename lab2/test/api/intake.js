/* ─── API / INTAKE ────────────────────────────────────────────────────────
   The publisher's door (plan §12). A person with a link and no account
   fills in the Press Table in publisher mode, presses SEND TO KNOLL, and
   this catches what they send: a bundle of words and up to twelve pictures.
   It checks it, strips the pictures of everything that is not picture,
   files it under a random token and hands the token back. The owner later
   lists the tokens and pulls one in — both behind `INTAKE_SECRET`, both on
   this same file. Nothing here publishes anything: an intake is a folder
   waiting for the owner to look at it (plan §12's acceptance line, "nothing
   on the deployed site holds a page that a person has not approved").

   It is a Vercel Node function — `module.exports = handler`, `(req, res)` —
   and it is also what `lab2/test/serve.js` mounts at `/_lab2/test/intake`,
   which is where these tests run it. The only res helpers it uses are
   `status()`, `json()` and `send()`, because those three are all the local
   mount shims (serve.js `mountApi`); every reply below goes through one
   `reply()` so that stays true.

   JSON, NOT MULTIPART. The plan says "accepts a multipart bundle
   (bundle.json + images)". This takes JSON:

       POST  { bundle: {…manifest…}, images: { "<asset id>": "<base64>" } }

   Multipart is a browser convenience — what a `<form>` posts — and there is
   no form here: the publisher page holds the images as canvases already
   (it has just measured them), so it has to serialise them either way, and
   `canvas.toDataURL()` gives base64. JSON is also what both runtimes hand
   the function already parsed (`req.body`), so the function needs no
   multipart parser and therefore no npm at all; a multipart one would need
   either a dependency or two hundred lines of boundary-splitting that no
   test would ever cover as well as this. A `data:image/png;base64,…` prefix
   is accepted and stripped, because that is what `toDataURL` returns. The
   cost of the choice is written down in THE NUMBERS: base64 is four bytes
   of body for three of picture.

   THE NUMBERS, every one of them a constant below

   MAX_FILES 12 — `manifest.schema.json`'s `assets.maxItems`. A thirteenth
     image could never be part of a valid manifest, so it is refused before
     anything is decoded rather than after.
   MAX_TOTAL_BYTES 25 MB — the plan's cap (§12 2), counted on the DECODED
     images, not on the request. Counted as each image is read, so an
     over-size bundle stops at the picture that crosses the line and the
     rest is never decoded.
   MAX_LONG_EDGE 4096 — the plan asks intake to "cap size"; with no encoder
     in this function (see IMAGES, below) capping means REFUSING. 4096 is
     twice the long edge of a 2× 1920-wide screenshot, which is the biggest
     thing a press kit sends on purpose; over it is a print master or a
     mistake, and the message says so.
   MAX_BODY_BYTES 36 MB — 25 MB of pictures is 33.3 MiB of base64
     (four bytes for three) plus the manifest, so the body cap must sit
     above that or the picture cap is unreachable. TWO SMALLER CAPS SIT
     UNDER IT IN THE REAL WORLD and the owner should know both: this
     sandbox's mount caps a POST at 32 MB (`CAP_INTAKE` in
     `lab2/test/serve.js`, which is not this agent's file to change), so
     over about 23.9 MB of pictures the socket is dropped by the server
     before the function sees a byte; and a Vercel Serverless Function's
     request body limit is 4.5 MB, an order of magnitude under the plan's
     25 MB. A deployed intake that really wants 25 MB has to hand the
     browser a client-upload token and let it PUT to Blob directly, with
     this function issuing the token and recording the result. That is a
     deployment decision, it is not needed to build or test anything here,
     and it is flagged in press/CHANGELOG.md rather than half-built.
   TOKEN_BYTES 16 → a 22-character token. `crypto.randomBytes(16)` is 128
     bits, and 128 bits in base64url is exactly 22 characters with no
     padding (⌈16 × 8 / 6⌉ = 22) — which is where the plan's "random
     22-char token" comes from. It is a capability: whoever holds it can
     ask the owner to look at that bundle, and 2¹²⁸ is far past guessing.
     The alphabet is base64url (`A–Z a–z 0–9 - _`) so the token is a legal
     path segment and a legal URL query with nothing escaped.
   RATE_LIMIT 10 per RATE_WINDOW_MS 1 hour — the plan's number, per IP,
     counted on every POST including the ones that are refused (otherwise a
     flood of malformed posts is free).
   RETENTION_DAYS 30 — the plan's. See RETENTION.
   MAX_BUNDLE_NODES 20000 / MAX_BUNDLE_DEPTH 32 — a manifest is about 60
     values; 20 000 is three hundred times that and still cheap to walk.
     They exist because a 10 MB body of `[[[[…]]]]` is legal JSON, and the
     walk that counts them is a loop over an explicit stack, never
     recursion, so a deep object cannot take the process down with it.
     MAX_BUNDLE_DEPTH is `validate.js`'s own MAXDEPTH, for the same reason.
   LIST_MAX 500 — how many tokens `?list=1` answers with. A folder with
     more than that is a folder the owner has not been pruning.

   IMAGES. Every file is identified by its MAGIC BYTES
   (`press/tools/lib/imagebytes.js`), never by the name or the extension the
   bundle claims — a `logo.png` that begins `PK` is a ZIP and is refused —
   and every one is stripped of metadata: PNG text and time chunks, JPEG
   APPn (EXIF, XMP, Photoshop) and comments, WebP EXIF and XMP. The strip
   never re-encodes a pixel, and this function contains no encoder: that is
   why an over-size image is refused instead of resized. WITH `sharp`
   INSTALLED (the plan allows this function to depend on it; the bench never
   may) the single call would go in `takeImage` where `stripMetadata` is
   now — `await sharp(buf).resize({width: MAX_LONG_EDGE, height:
   MAX_LONG_EDGE, fit: 'inside', withoutEnlargement: true}).toBuffer()` —
   and the long-edge check would become a resize. sharp is not installed on
   this machine and is not to be, so the reject path is what ships; the
   owner chooses at deploy time, and the two paths differ only in whether a
   publisher with a 6000-px key art is asked to shrink it themselves.

   WHAT COUNTS AS A VALID BUNDLE. `bundle` is the manifest itself — the
   shape `press/schemas/manifest.schema.json` describes and the publisher
   page fills in. A wrapper `{ manifest: {…} }` is also accepted, because
   that is the shape the `/build` door takes (serve.js `buildGate`) and a
   page that already holds one should not have to unwrap it. Two rules
   beyond the schema, both about the pictures matching the words: every
   image id must be an asset in the manifest, and every asset must have an
   image. A bundle is a whole thing or it is nothing.

   The manifest is NORMALISED before it is validated, and this is the
   "where it overlaps" of the schema check: the endpoint does not believe
   the publisher's `w`, `h`, `sha256` or `file` — it overwrites all four
   from the bytes it actually received and stored, and validates the
   result. So those four fields cannot be wrong in a stored bundle, and
   what the schema is really being asked is whether the WORDS are good:
   slug, title, roles, links, platforms, rights. One deliberate difference
   from the file on disk: the schema's `file` pattern allows only `.png`
   and `.webp`, while the plan tells intake to accept JPEG by magic bytes,
   so the check widens that one pattern to include `.jpg` (`FILE_PATTERN`
   below) and the reply carries a note saying the asset must be converted
   before `build-game.js` — which validates against the unwidened file —
   will take it. `alpha` is the one field kept as declared: nothing here
   decodes a pixel, so it cannot know whether a channel is used; a JPEG's
   is forced false because a JPEG has none.

   STORAGE, two paths. On Vercel, Vercel Blob when `BLOB_READ_WRITE_TOKEN`
   is in the environment: the REST API, called with `fetch`, so this file
   stays free of npm. Locally — and in this sandbox, which is the only
   place either path has been run — a folder,
   `lab2/test/press/cache/intake/<token>/`, which is gitignored
   (`test/.gitignore` line 2). The folder is the sandbox's STAND-IN for
   Blob and not a second product: same layout, same file names, same
   `meta.json`. The Blob half is written to the documented REST shape and
   is NOT exercised by any test here (no token on this machine) — it is
   marked so at the call, and it fails loudly rather than quietly if the
   shape has moved. With neither a Blob token nor a writable folder the
   endpoint answers 503 and stores nothing; it never pretends.

   Layout under a token, in both paths:

       intake/<token>/bundle.json     the normalised manifest
       intake/<token>/meta.json       when, how big, what came, what was stripped
       intake/<token>/art/<id>.<ext>  the stripped image bytes

   One thing to know about the local stand-in: `press/cache/` sits inside
   the folder `serve.js` serves, so on a machine with the sandbox server
   running, anyone who has the token can also fetch
   `/lab2/test/press/cache/intake/<token>/bundle.json` directly, without
   the secret. That is the token being a capability, which it is by design,
   and it is a local development server. Deployed there is no such path:
   the folder is gitignored and never uploaded, and the bundles live in
   Blob under the store's own random id.

   THE OWNER'S TWO DOORS need `INTAKE_SECRET` in the environment, and it is
   read from the `x-intake-secret` header or `authorization: Bearer …`,
   NEVER from the query string — a secret in a URL is a secret in a log
   file and a browser history. The compare is constant-time: both sides are
   SHA-256'd first and the digests handed to `crypto.timingSafeEqual`, which
   makes the comparison the same length and the same duration whatever the
   lengths of the two secrets were (timingSafeEqual throws on a length
   mismatch, so hashing is also what lets a wrong-length guess be answered
   in the same time as a right-length one). If `INTAKE_SECRET` is not set
   the two doors answer 503 and stay shut; an absent secret is never an
   open door.

   RATE LIMIT. In memory: a Map of IP → the times it posted, pruned to the
   window on every look. It is honest about what it is — AN IN-MEMORY
   LIMITER RESETS ON A COLD START, and Vercel gives a function a new
   instance whenever it feels like one, so a determined flood gets a fresh
   ten every time a lambda boots and a legitimate publisher's four earlier
   posts may be forgotten. The real one is a shared counter: Vercel KV or
   Upstash Redis, `INCR intake:<ip>:<hour>` with `EXPIRE 3600`, one round
   trip, no state in the function at all. That is a dependency and a
   binding, so it waits for the owner's deploy; this is the guard that runs
   with neither. The IP is `x-real-ip` first (Vercel sets it), then the
   first hop of `x-forwarded-for`, then the socket. Locally those headers
   are whatever the client typed — which is how test-intake.js gives each
   of its attacks its own bucket, and also why the local limiter is a
   speed bump and not a wall.

   RETENTION. Every bundle is filed with an `expires` 30 days out, listed
   with it, and NOTHING DELETES IT. There is no scheduled cleaner: the plan
   allows pruning by hand until there is volume (§12 4), and by hand means
   `rm -r lab2/test/press/cache/intake/<token>` locally or the Blob
   dashboard deployed. `?list=1` marks a past-date bundle `expired: true`
   so the owner can see what to sweep, and fetching one still works —
   nothing here refuses to hand the owner their own data because a date
   passed. A cron would be a `vercel.json` entry hitting `?prune=1`; it is
   not built because an unattended deleter is the one thing in this file
   that could lose a publisher's work.

   PRIVACY. The submitter's IP is stored as the first 12 hex digits of its
   SHA-256, not as an address: enough to tell two submissions apart or to
   see a flood in the folder, not enough to be a list of people. Nothing
   else about the sender is kept, no email is sent (plan §16 question 5's
   default), and nothing about a bundle is logged beyond a one-line
   "intake <token> — n files, m KB" on the server's own console.

       node lab2/test/press/tools/test-intake.js      (from site/, server on 4322)
   ───────────────────────────────────────────────────────────────────────── */
'use strict';
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const img = require('../press/tools/lib/imagebytes.js');
const Validate = require('../press/tools/lib/validate.js');

// ── the numbers ───────────────────────────────────────────────────────────
const MAX_FILES = 12;                        // manifest.schema.json assets.maxItems
const MAX_TOTAL_BYTES = 25 * 1024 * 1024;    // plan §12 2, on the decoded images
const MAX_LONG_EDGE = 4096;                  // no encoder here: the cap is a refusal
const MAX_BODY_BYTES = 36 * 1024 * 1024;     // 25 MiB of pictures is 33.3 MiB of base64, plus the words
const TOKEN_BYTES = 16;                      // 128 bits → 22 base64url characters
const TOKEN_CHARS = 22;
const TOKEN_RE = /^[A-Za-z0-9_-]{22}$/;
const RATE_LIMIT = 10;                       // plan §12 2
const RATE_WINDOW_MS = 60 * 60 * 1000;
const RATE_IPS_MAX = 5000;                   // past this the Map is swept of addresses whose hour has passed (live ones stay: forgetting a live limit would be the bug)
const RETENTION_DAYS = 30;                   // plan §12 4; nothing enforces it — see RETENTION
const MAX_BUNDLE_NODES = 20000;
const MAX_BUNDLE_DEPTH = 32;                 // validate.js's own MAXDEPTH
const LIST_MAX = 500;
const ID_RE = /^[a-z0-9-]{1,40}$/;           // manifest.schema.json's asset id pattern, and a safe file name
/* The schema's own pattern with `jpg` added — the one place this check is
   deliberately wider than press/schemas/manifest.schema.json. See WHAT
   COUNTS AS A VALID BUNDLE. */
const FILE_PATTERN = '^art/[a-z0-9-]+\\.(webp|png|jpg)$';

/* The mtime of this file at the moment the process required it — see the
   usage reply. `try` because a bundled deployment may not have the source
   beside the function, and a missing stamp is not a reason to fail a POST. */
const STAMP = (() => { try { return Math.round(fs.statSync(__filename).mtimeMs); } catch (e) { return 0; } })();

const LOCAL_ROOT = path.join(__dirname, '..', 'press', 'cache', 'intake');
const SCHEMA_DIR = path.join(__dirname, '..', 'press', 'schemas');
const BLOB_API = 'https://blob.vercel-storage.com';
const BLOB_API_VERSION = '7';                // the version header @vercel/blob sends; UNVERIFIED here — no token on this machine, so if a deployed call 400s this is the first line to check

// ── replies ───────────────────────────────────────────────────────────────
/* One way out. `res.status().json()` is the Vercel shape and the three
   helpers serve.js's mount provides; `code` is a short slug so a caller
   (and test-intake.js) can branch without reading English. */
function reply(res, status, body) {
  if (typeof res.status === 'function' && typeof res.json === 'function') return res.status(status).json(body);
  res.statusCode = status;
  res.setHeader('content-type', 'application/json');
  res.end(JSON.stringify(body));
  return res;
}
const bad = (res, status, code, error, extra) =>
  reply(res, status, Object.assign({ ok: false, code: code, error: error }, extra || {}));

// ── the rate limit ────────────────────────────────────────────────────────
const hits = new Map();                      // ip → [ms, ms, …], newest last

function clientIp(req) {
  const h = req.headers || {};
  const real = h['x-real-ip'];
  if (real) return String(real).trim();
  const fwd = h['x-forwarded-for'];
  if (fwd) return String(fwd).split(',')[0].trim();
  return (req.socket && req.socket.remoteAddress) || 'unknown';
}

function rateOk(ip, now) {
  if (hits.size > RATE_IPS_MAX) for (const [k, v] of hits) { if (!v.length || now - v[v.length - 1] > RATE_WINDOW_MS) hits.delete(k); }
  const seen = (hits.get(ip) || []).filter(t => now - t < RATE_WINDOW_MS);
  seen.push(now);
  hits.set(ip, seen);
  return { ok: seen.length <= RATE_LIMIT, count: seen.length, retryAfter: Math.ceil((RATE_WINDOW_MS - (now - seen[0])) / 1000) };
}

// ── the owner's secret ────────────────────────────────────────────────────
/* Constant time whatever the lengths: SHA-256 both sides first, so
   timingSafeEqual always compares 32 bytes against 32 bytes and a
   wrong-length guess costs exactly what a right-length one does. */
function sameSecret(a, b) {
  const ha = crypto.createHash('sha256').update(String(a), 'utf8').digest();
  const hb = crypto.createHash('sha256').update(String(b), 'utf8').digest();
  return crypto.timingSafeEqual(ha, hb);
}

function ownerOnly(req, res) {
  const want = process.env.INTAKE_SECRET;
  if (!want) { bad(res, 503, 'no-secret', 'INTAKE_SECRET is not set on this server, so the owner\'s doors are shut'); return false; }
  const h = req.headers || {};
  const auth = String(h['authorization'] || '');
  const got = h['x-intake-secret'] ? String(h['x-intake-secret']) : (/^Bearer\s+(.+)$/i.exec(auth) || [])[1] || '';
  if (!got || !sameSecret(got, want)) { bad(res, 401, 'unauthorized', 'this needs the intake secret in an x-intake-secret header'); return false; }
  return true;
}

// ── storage ───────────────────────────────────────────────────────────────
/* Two implementations of four calls. `local` is the sandbox's stand-in for
   Blob and the only one these tests run; `blob` is the deployed path,
   written to the REST shape and unexercised here. */
const local = {
  kind: 'local',
  writable() { try { fs.mkdirSync(LOCAL_ROOT, { recursive: true }); return true; } catch (e) { return false; } },
  put(token, name, buf) {
    const file = path.join(LOCAL_ROOT, token, name.split('/').join(path.sep));
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, buf);
    return 'intake/' + token + '/' + name;
  },
  list() {
    if (!fs.existsSync(LOCAL_ROOT)) return [];
    return fs.readdirSync(LOCAL_ROOT).filter(n => TOKEN_RE.test(n)).map(token => {
      let meta = null;
      try { meta = JSON.parse(fs.readFileSync(path.join(LOCAL_ROOT, token, 'meta.json'), 'utf8')); } catch (e) { meta = null; }
      return { token: token, meta: meta };
    });
  },
  get(token) {
    const dir = path.join(LOCAL_ROOT, token);
    if (!fs.existsSync(path.join(dir, 'bundle.json'))) return null;
    const bundle = JSON.parse(fs.readFileSync(path.join(dir, 'bundle.json'), 'utf8'));
    let meta = null;
    try { meta = JSON.parse(fs.readFileSync(path.join(dir, 'meta.json'), 'utf8')); } catch (e) { meta = null; }
    const images = {};
    const art = path.join(dir, 'art');
    if (fs.existsSync(art)) for (const f of fs.readdirSync(art)) images[f.replace(/\.[^.]+$/, '')] = fs.readFileSync(path.join(art, f)).toString('base64');
    return { bundle: bundle, meta: meta, images: images };
  }
};

/* THE BLOB PATH IS NOT EXERCISED BY ANY TEST IN THIS REPOSITORY — there is
   no BLOB_READ_WRITE_TOKEN on this machine. It is the documented REST
   shape: PUT the pathname, `x-add-random-suffix: 0` so the token in the
   path is the whole address, and the store's own random id keeps one
   customer's blobs off another's. Every call throws with the HTTP status
   in the message rather than returning something empty, so a shape that
   has moved shows up as a 503 with a reason and not as a lost bundle. */
const blob = {
  kind: 'blob',
  writable() { return !!process.env.BLOB_READ_WRITE_TOKEN; },
  head() {
    return { authorization: 'Bearer ' + process.env.BLOB_READ_WRITE_TOKEN, 'x-api-version': BLOB_API_VERSION };
  },
  async put(token, name, buf, type) {
    const pathname = 'intake/' + token + '/' + name;
    const r = await fetch(BLOB_API + '/' + pathname, {
      method: 'PUT',
      headers: Object.assign(blob.head(), { 'x-add-random-suffix': '0', 'x-content-type': type || 'application/octet-stream' }),
      body: buf
    });
    if (!r.ok) throw new Error('vercel blob PUT ' + pathname + ': HTTP ' + r.status);
    return pathname;
  },
  async list() {
    const r = await fetch(BLOB_API + '?prefix=intake/&limit=' + (LIST_MAX * 4), { headers: blob.head() });
    if (!r.ok) throw new Error('vercel blob list: HTTP ' + r.status);
    const out = new Map();
    for (const b of (await r.json()).blobs || []) {
      const m = /^intake\/([A-Za-z0-9_-]{22})\/meta\.json$/.exec(b.pathname);
      if (!m) continue;
      const meta = await fetch(b.url).then(x => x.ok ? x.json() : null).catch(() => null);
      out.set(m[1], { token: m[1], meta: meta });
    }
    return [...out.values()];
  },
  async get(token) {
    const r = await fetch(BLOB_API + '?prefix=intake/' + token + '/&limit=' + (MAX_FILES + 4), { headers: blob.head() });
    if (!r.ok) throw new Error('vercel blob list ' + token + ': HTTP ' + r.status);
    const blobs = (await r.json()).blobs || [];
    if (!blobs.length) return null;
    const out = { bundle: null, meta: null, images: {} };
    for (const b of blobs) {
      const name = b.pathname.slice(('intake/' + token + '/').length);
      const res = await fetch(b.url);
      if (!res.ok) throw new Error('vercel blob GET ' + b.pathname + ': HTTP ' + res.status);
      if (name === 'bundle.json') out.bundle = await res.json();
      else if (name === 'meta.json') out.meta = await res.json();
      else if (name.startsWith('art/')) out.images[name.slice(4).replace(/\.[^.]+$/, '')] = Buffer.from(await res.arrayBuffer()).toString('base64');
    }
    return out.bundle ? out : null;
  }
};

function storage() { return blob.writable() ? blob : (local.writable() ? local : null); }

// ── the bundle ────────────────────────────────────────────────────────────
/* How big is this object, without recursing into it. An explicit stack, a
   node count and a depth count: a 10 MB body of nested arrays is answered
   in milliseconds and takes nothing down with it. */
function measure(root) {
  let nodes = 0, deepest = 0;
  const stack = [[root, 0]];
  while (stack.length) {
    const [v, d] = stack.pop();
    if (++nodes > MAX_BUNDLE_NODES) return { nodes: nodes, depth: deepest, tooBig: true };
    if (d > deepest) deepest = d;
    if (d > MAX_BUNDLE_DEPTH) return { nodes: nodes, depth: deepest, tooDeep: true };
    if (v === null || typeof v !== 'object') continue;
    /* The budget is checked BEFORE the children go on the stack, not as
       they come off it: a five-million-element array would otherwise be
       five million pushes — the very thing the cap is here to refuse — and
       the walk would run out of memory proving the body was too big. */
    const keys = Array.isArray(v) ? null : Object.keys(v);
    const count = keys ? keys.length : v.length;
    if (nodes + count > MAX_BUNDLE_NODES) return { nodes: nodes + count, depth: deepest, tooBig: true };
    if (keys) { for (const k of keys) stack.push([v[k], d + 1]); }
    else { for (let i = 0; i < count; i++) stack.push([v[i], d + 1]); }
  }
  return { nodes: nodes, depth: deepest };
}

let POOL = null;
/* The seven schemas, read once per process. If they cannot be read the
   endpoint says so and refuses the POST: an intake that cannot check a
   bundle must not store one. */
function pool() {
  if (POOL) return POOL;
  POOL = Validate.loadDir(SCHEMA_DIR);
  return POOL;
}

/* manifest.schema.json with the one widened pattern. Cloned so the file on
   disk — another agent's, and build-game.js's — is never touched. */
function intakeSchema() {
  const p = pool();
  const s = JSON.parse(JSON.stringify(p['manifest.schema.json']));
  s.properties.assets.items.properties.file.pattern = FILE_PATTERN;
  return s;
}

function isObj(v) { return v !== null && typeof v === 'object' && !Array.isArray(v); }

// ── one image ─────────────────────────────────────────────────────────────
const B64_RE = /^[A-Za-z0-9+/=]*$/;
const DATA_URL = /^data:[^,]*;base64,/i;

/* Decode, identify, measure, strip. Throws an object with a `code` and a
   `status` — the caller turns it straight into a reply. */
function fault(status, code, error) { const e = new Error(error); e.status = status; e.code = code; return e; }

function takeImage(id, value, running) {
  if (typeof value !== 'string') throw fault(400, 'bad-image', 'image "' + id + '" is not a base64 string');
  let b64 = value.replace(DATA_URL, '').replace(/\s+/g, '');
  if (!B64_RE.test(b64)) throw fault(400, 'bad-image', 'image "' + id + '" is not base64');
  /* The decoded size, from the length of the string: checked BEFORE the
     decode, so an over-size bundle never allocates the buffer that would
     have broken the cap. */
  const pad = b64.endsWith('==') ? 2 : b64.endsWith('=') ? 1 : 0;
  const size = Math.floor(b64.length / 4) * 3 - pad;
  if (running + size > MAX_TOTAL_BYTES) {
    throw fault(413, 'too-many-bytes', 'the bundle is over ' + (MAX_TOTAL_BYTES / 1024 / 1024) + ' MB of images (it reached ' +
      Math.round((running + size) / 1024 / 1024 * 10) / 10 + ' MB at "' + id + '")');
  }
  const raw = Buffer.from(b64, 'base64');
  const type = img.sniff(raw);
  if (!type) {
    throw fault(415, 'not-an-image', 'image "' + id + '" is not a PNG, JPEG or WebP — its first bytes say otherwise, ' +
      'and the extension in the manifest is not what is read here');
  }
  let read;
  try { read = img.read(raw); } catch (e) { throw fault(400, 'broken-image', 'image "' + id + '": ' + ((e && e.message) || e)); }
  if (read.longEdge > MAX_LONG_EDGE) {
    throw fault(413, 'long-edge', 'image "' + id + '" is ' + read.w + '×' + read.h + '; the long edge must be ' + MAX_LONG_EDGE +
      ' or less. This endpoint never re-encodes a picture, so it cannot shrink it for you — send a smaller copy.');
  }
  let clean;
  try { clean = img.stripMetadata(raw, type); } catch (e) { throw fault(400, 'broken-image', 'image "' + id + '": ' + ((e && e.message) || e)); }
  return {
    id: id, type: type, w: read.w, h: read.h,
    file: 'art/' + id + '.' + img.EXT[type],
    bytes: clean.length, was: raw.length,
    dropped: clean.dropped || [],
    sha256: crypto.createHash('sha256').update(clean).digest('hex'),
    buf: clean
  };
}

// ── POST ──────────────────────────────────────────────────────────────────
async function submit(req, res) {
  const now = Date.now();
  const ip = clientIp(req);
  const rate = rateOk(ip, now);
  if (!rate.ok) {
    if (typeof res.setHeader === 'function') res.setHeader('retry-after', String(rate.retryAfter));
    return bad(res, 429, 'rate', 'that is ' + rate.count + ' posts from this address inside an hour; the limit is ' + RATE_LIMIT +
      '. Try again in ' + Math.ceil(rate.retryAfter / 60) + ' minutes.');
  }

  if (req.rawBody && req.rawBody.length > MAX_BODY_BYTES) return bad(res, 413, 'too-many-bytes', 'the request body is over ' + Math.round(MAX_BODY_BYTES / 1024 / 1024) + ' MB');
  let body = req.body;
  if (Buffer.isBuffer(body)) {
    if (body.length > MAX_BODY_BYTES) return bad(res, 413, 'too-many-bytes', 'the request body is over ' + Math.round(MAX_BODY_BYTES / 1024 / 1024) + ' MB');
    try { body = JSON.parse(body.toString('utf8')); } catch (e) { body = undefined; }
  }
  if (body === undefined || body === null) return bad(res, 400, 'not-json', 'post JSON: { bundle: {…}, images: { id: base64 } }');
  if (!isObj(body)) return bad(res, 400, 'bundle-shape', 'the body must be an object with `bundle` and `images`');

  /* Before anything walks it: how big is this thing. */
  const size = measure(body);
  if (size.tooBig) return bad(res, 413, 'bundle-too-big', 'the bundle holds more than ' + MAX_BUNDLE_NODES + ' values; a manifest holds about sixty');
  if (size.tooDeep) return bad(res, 413, 'bundle-too-deep', 'the bundle nests deeper than ' + MAX_BUNDLE_DEPTH + '; a manifest nests three deep');

  const wrapper = isObj(body.bundle) ? body.bundle : null;
  if (!wrapper) return bad(res, 400, 'bundle-shape', 'no `bundle` object in the body');
  const manifest = isObj(wrapper.manifest) ? wrapper.manifest : wrapper;   // {manifest:{…}} is the /build shape
  const images = isObj(body.images) ? body.images : null;
  if (!images) return bad(res, 400, 'bundle-shape', 'no `images` object in the body ({ id: base64 })');

  const ids = Object.keys(images);
  if (ids.length > MAX_FILES) return bad(res, 413, 'too-many-files', ids.length + ' images; the limit is ' + MAX_FILES);
  if (!ids.length) return bad(res, 400, 'no-images', 'a bundle with no pictures is not a game page');
  for (const id of ids) if (!ID_RE.test(id)) return bad(res, 400, 'bad-id', 'image id "' + String(id).slice(0, 40) + '" is not ' + ID_RE);

  /* The rights attestation, before the pictures are decoded: it is the one
     thing that makes storing a stranger's art lawful, and it is checked on
     whichever half of the bundle carries it. */
  const rights = isObj(manifest.rights) ? manifest.rights : (isObj(wrapper.rights) ? wrapper.rights : null);
  if (!rights || rights.attested !== true) {
    return bad(res, 403, 'rights', 'bundle.rights.attested must be true — the sender has to say they hold the rights to this art');
  }

  const assets = Array.isArray(manifest.assets) ? manifest.assets : [];
  if (assets.length > MAX_FILES) return bad(res, 413, 'too-many-files', assets.length + ' assets; the limit is ' + MAX_FILES);
  const declared = new Map();
  for (const a of assets) if (isObj(a) && typeof a.id === 'string') declared.set(a.id, a);
  const orphan = ids.filter(id => !declared.has(id));
  if (orphan.length) return bad(res, 400, 'orphan-image', 'no asset in the manifest for image' + (orphan.length > 1 ? 's ' : ' ') + orphan.join(', '));
  const missing = [...declared.keys()].filter(id => ids.indexOf(id) < 0);
  if (missing.length) return bad(res, 400, 'missing-image', 'the manifest names asset' + (missing.length > 1 ? 's ' : ' ') + missing.join(', ') + ' but no image came with ' + (missing.length > 1 ? 'them' : 'it'));

  const taken = [];
  let total = 0;
  for (const id of ids) {
    let one;
    try { one = takeImage(id, images[id], total); }
    catch (e) { return bad(res, e.status || 400, e.code || 'bad-image', (e && e.message) || String(e)); }
    total += one.bytes;
    taken.push(one);
  }

  /* Normalised: the four fields the endpoint knows better than the sender
     are overwritten from the bytes, and the manifest is then held to the
     schema. `alpha` is left as declared (nothing here decodes a pixel) but
     a JPEG's is forced false, because a JPEG has no alpha channel. */
  const notes = [];
  const clean = JSON.parse(JSON.stringify(manifest));
  clean.source = 'intake';
  clean.assets = taken.map(t => {
    const d = declared.get(t.id) || {};
    if (typeof d.file === 'string' && d.file !== t.file) notes.push('asset "' + t.id + '" was named ' + d.file + '; it is stored as ' + t.file + ' because its bytes say ' + t.type);
    if (t.type === 'jpeg') notes.push('asset "' + t.id + '" is a JPEG; manifest.schema.json allows only png and webp, so convert it before build-game.js');
    return {
      id: t.id,
      role: typeof d.role === 'string' ? d.role : 'misc',
      file: t.file, w: t.w, h: t.h,
      alpha: t.type === 'jpeg' ? false : d.alpha === true,
      sha256: t.sha256
    };
  });

  let errors;
  try { errors = Validate.check(clean, intakeSchema(), pool()); }
  catch (e) { return bad(res, 503, 'schemas', 'press/schemas could not be read, so this bundle cannot be checked: ' + ((e && e.message) || e)); }
  if (errors.length) {
    return bad(res, 400, 'schema', 'the bundle does not match manifest.schema.json', { errors: errors.slice(0, 20) });
  }

  const store = storage();
  if (!store) return bad(res, 503, 'storage', 'no BLOB_READ_WRITE_TOKEN and no writable cache folder — this intake has nowhere to put a bundle');

  const token = crypto.randomBytes(TOKEN_BYTES).toString('base64url');
  const at = new Date(now).toISOString();
  const expires = new Date(now + RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const meta = {
    token: token, at: at, expires: expires,
    title: typeof clean.title === 'string' ? clean.title : '',
    slug: typeof clean.slug === 'string' ? clean.slug : '',
    by: typeof rights.by === 'string' ? rights.by.slice(0, 80) : '',
    files: taken.length,
    bytes: total,
    /* Twelve hex digits of the SHA-256 of the address — see PRIVACY. */
    from: crypto.createHash('sha256').update(String(ip)).digest('hex').slice(0, 12),
    storage: store.kind,
    assets: taken.map(t => ({ id: t.id, file: t.file, type: t.type, w: t.w, h: t.h, bytes: t.bytes, was: t.was, sha256: t.sha256, stripped: t.dropped })),
    notes: notes
  };

  try {
    for (const t of taken) await store.put(token, t.file, t.buf, img.MIME[t.type]);
    await store.put(token, 'bundle.json', Buffer.from(JSON.stringify(clean, null, 2), 'utf8'), 'application/json');
    await store.put(token, 'meta.json', Buffer.from(JSON.stringify(meta, null, 2), 'utf8'), 'application/json');
  } catch (e) {
    return bad(res, 503, 'storage', 'the bundle could not be stored: ' + ((e && e.message) || e));
  }
  try { console.log('  intake ' + token + ' — ' + taken.length + ' file' + (taken.length === 1 ? '' : 's') + ', ' + Math.round(total / 1024) + ' KB'); } catch (e) { /* a log is never a reason to fail a request */ }

  return reply(res, 200, {
    ok: true, token: token, files: taken.length, bytes: total, expires: expires,
    storage: store.kind, notes: notes,
    stripped: taken.reduce((n, t) => n + t.was - t.bytes, 0)
  });
}

// ── GET, the owner's two doors ────────────────────────────────────────────
async function list(req, res) {
  const store = storage();
  if (!store) return bad(res, 503, 'storage', 'no storage is configured, so there is nothing to list');
  let rows;
  try { rows = await store.list(); } catch (e) { return bad(res, 503, 'storage', 'could not list: ' + ((e && e.message) || e)); }
  const now = Date.now();
  const out = rows.map(r => {
    const m = r.meta || {};
    return {
      token: r.token,
      title: m.title || '(no title)',
      slug: m.slug || '',
      by: m.by || '',
      date: m.at || '',
      bytes: typeof m.bytes === 'number' ? m.bytes : 0,
      files: typeof m.files === 'number' ? m.files : 0,
      expires: m.expires || '',
      expired: !!(m.expires && Date.parse(m.expires) < now),
      broken: !r.meta
    };
  }).sort((a, b) => String(b.date).localeCompare(String(a.date)));
  return reply(res, 200, { ok: true, storage: store.kind, count: out.length, intakes: out.slice(0, LIST_MAX) });
}

async function fetchOne(req, res, token) {
  if (!TOKEN_RE.test(token)) {
    return bad(res, 400, 'bad-token', 'a token is ' + TOKEN_CHARS + ' base64url characters; that one is ' + String(token).length);
  }
  const store = storage();
  if (!store) return bad(res, 503, 'storage', 'no storage is configured');
  let got;
  try { got = await store.get(token); } catch (e) { return bad(res, 503, 'storage', 'could not read ' + token + ': ' + ((e && e.message) || e)); }
  if (!got) return bad(res, 404, 'no-such-token', 'no intake under that token');
  const m = got.meta || {};
  return reply(res, 200, {
    ok: true, token: token, at: m.at || '', expires: m.expires || '',
    expired: !!(m.expires && Date.parse(m.expires) < Date.now()),
    from: m.by || '', storage: store.kind,
    bundle: got.bundle, meta: got.meta, images: got.images
  });
}

// ── the handler ───────────────────────────────────────────────────────────
async function handler(req, res) {
  const q = req.query || {};
  if (req.method === 'POST') return submit(req, res);
  if (req.method === 'GET' || req.method === 'HEAD') {
    if (q.list !== undefined && q.list !== '0') { if (!ownerOnly(req, res)) return; return list(req, res); }
    if (q.token !== undefined) { if (!ownerOnly(req, res)) return; return fetchOne(req, res, String(q.token)); }
    /* A GET with no question is the usage line — and it carries `stamp`, the
       mtime of this file when the process required it. A mounted function is
       required ONCE per server process (serve.js `mountApi`, and Vercel is no
       different), so a server left running across an edit answers with the
       old code; test-intake.js compares this number with the file on disk and
       says "restart the server" rather than reporting a stale pass. */
    return bad(res, 400, 'usage', 'POST a bundle here, or ask for ?list=1 or ?token=… with the intake secret', { stamp: STAMP });
  }
  if (typeof res.setHeader === 'function') res.setHeader('allow', 'GET, POST');
  return bad(res, 405, 'method', req.method + ' is not a thing this door does');
}

module.exports = handler;
module.exports.handler = handler;
/* The constants and the two halves, so press/tools/test-intake.js can hold
   the endpoint to its own numbers without re-typing them, and can call the
   handler in-process where the local mount's own body cap would stop a
   request before it arrived. */
module.exports.NUMBERS = Object.freeze({
  MAX_FILES, MAX_TOTAL_BYTES, MAX_LONG_EDGE, MAX_BODY_BYTES, TOKEN_BYTES, TOKEN_CHARS,
  RATE_LIMIT, RATE_WINDOW_MS, RETENTION_DAYS, MAX_BUNDLE_NODES, MAX_BUNDLE_DEPTH, LIST_MAX, FILE_PATTERN
});
module.exports.LOCAL_ROOT = LOCAL_ROOT;
module.exports.TOKEN_RE = TOKEN_RE;
