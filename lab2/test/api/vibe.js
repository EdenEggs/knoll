/* ─── THE VISION CALL ──────────────────────────────────────────────────────
   api/vibe.js — one Claude call per game, in and out. Up to four pictures
   and the numbers style.js measured go up; a strict little JSON judgement
   comes back — art style, mood, three to five motifs, a preset and two
   alternates, a font pairing, a layout recipe, calm or loud, and how sure it
   is. That object is validated against press/schemas/vibe.schema.json before
   anybody downstream sees it, and on ANY doubt this file answers
   `{vibe: null, error}` and the Press Table quietly uses the heuristics it
   already had (plan §11).

   IT IS A VERCEL FUNCTION AND IT IS ALSO A MODULE. Deployed it is
   `site/api/vibe.js`, Node runtime, reached at `/api/vibe`; locally
   `lab2/test/serve.js` requires this file and calls the same exported
   `handler(req, res)` at `/_lab2/test/vibe` (CONTRACTS §0). So it uses
   NOTHING but node builtins — no SDK, no npm, not one line of the bench —
   because the two hosts have nothing else in common. `res` is only ever
   asked for `.status()` and `.json()` — two of the three things serve.js's
   mountApi shims, and both of them Vercel's own response has. `req.body`
   arrives parsed on both.

   NO KEY IS NOT AN ERROR. With no ANTHROPIC_API_KEY in the environment this
   answers 200 with `{vibe: null, error: 'no ANTHROPIC_API_KEY'}` — not 500,
   not a throw. The whole point of the phase's acceptance is that a Press
   Table without a key is a Press Table that still works, and a non-200 would
   put a red line in the owner's console for a thing that is fine. That is
   the state of THIS machine: `ANTHROPIC_API_KEY` is not set here (NOTES
   §D.11), so no call has ever been made from it and the tests drive a
   stubbed transport over the recorded judgements in
   press/fixtures/<name>/vibe-recorded.json.

   ── THE NUMBERS AND THE IDS, EACH WITH ITS REASON ──────────────────────

   MODEL = 'claude-opus-5'. Chosen 2026-09-07. It is the current Claude model
   id, read out of the `claude-api` skill's model table on that date, not out
   of anybody's memory — an id invented from a recollection is a 404 at the
   first real call, and this file cannot be tested against the API from here.
   press/vibe.js repeats it (the browser needs it to build a cache key before
   it has ever heard from this door) and press/tools/test-vibe.js reads the
   constant out of both files and fails if they drift.

   MAX_TOKENS = 2048, where plan §11 says 800. The judgement itself is about
   120 tokens of JSON, which is what 800 was sized for — but on this model
   THINKING IS ON BY DEFAULT and shares the same ceiling, so 800 would let a
   moment's thought about a hard plate truncate the tool call, which arrives
   here as `stop_reason: 'max_tokens'`, no tool_use block, and a silent
   fallback to the heuristics on exactly the games that most needed a second
   opinion. 2048 leaves the thinking about 1,900 tokens and the answer its
   120. This is the plan disagreeing with the API, not with itself; the
   alternative is below.

   EFFORT = 'low'. Picking from four closed menus after looking at four
   pictures is not deep work, and effort is the first lever that trades
   quality for spend. If the judgements come back shallow, this is the line
   to move before anything else is touched.

   NO `temperature`. Plan §11 asks for temperature 0. The current model does
   not take a sampling parameter at all — `temperature`, `top_p` and `top_k`
   are rejected with a 400 — so sending the plan's 0 would fail every call.
   Determinism, as far as there is any, comes from the closed menus, the
   forced tool and the cache: the same pictures with the same stats are
   answered once and read from disk afterwards. If the owner wants the
   plan's determinism more than the model's judgement, add
   `thinking: {type:'disabled'}` to the request body (accepted on this model
   at effort 'high' and below) and put MAX_TOKENS back to 800; the two go
   together and neither alone.

   TIMEOUT_MS = 60000. A vision call with four images is seconds, not
   minutes; a minute is the point at which something is wrong and the Press
   Table would rather have its heuristics than a spinner. No retry: one call,
   and a failure is a fallback, because a retried call is a doubled bill for
   a judgement the page can do without.

   MAX_IMAGES = 4, the plan's cap (§11 step 1). More than four is refused
   rather than trimmed — trimming would silently change the question and the
   cache key that names it.

   ── THE TOOL'S SCHEMA IS THE SCHEMA FILE, LOADED, NOT COPIED ───────────

   The tool's `input_schema` is press/schemas/vibe.schema.json, `require`d at
   module load and with its two `$ref`s resolved inline (the Messages API
   fetches nothing, so a `$ref` to another file would be a menu the model
   never sees). LOADED, not inlined by hand, and that is the whole argument:
   the same file is what tools/lib/validate.js judges the answer with a
   moment later — `Validate.check(input, VIBE_SCHEMA, SCHEMAS)`, the pool
   being the three files this one requires, inside which vibe's two $refs
   resolve. A hand-copied schema drifts the day a preset is added to
   style.schema.json, and the failure it causes is the nastiest kind — the
   model is offered nine presets, answers correctly, and is failed by a
   validator that knows ten. One file, one menu, one verdict.

   `require` and not `readFileSync`, because Vercel's file tracing follows a
   literal `require` and includes the JSON in the bundle. Those requires are
   what a merge into the live bench has to edit — the sandbox is a folder
   deeper than the merge target, so no single relative path is right in both
   places (the same reason CONTRACTS §0 writes page paths site-absolute).
   FIVE literals, one word each: the three `'../press/schemas/…'` requires,
   the `'../press/tools/lib/validate.js'` beside them and PRESS_DIR just
   below, all of which gain `lab2/`. They are together at the top of the file
   for exactly that reason.

   validate.js IS required across that line, from `press/tools/`, and the
   media-type sniff below deliberately is not. The difference is whether
   there is a shared truth to keep: the schema check has to be the same code
   the builder and the intake run, or three doors disagree about what a valid
   object is — validate.js's own header names this file as one of its four
   callers. Reading four magic numbers has no such truth, so
   `press/tools/lib/imagebytes.js` stays where it is and this file spends ten
   lines instead of a require on the workbench.

   No `strict: true` on the tool. It would guarantee schema-shaped arguments,
   but it also requires the schema to satisfy rules this one has not been
   checked against, and a 400 from a bad tool definition looks from out here
   exactly like a model that failed validation — every call silently falling
   back. Nothing on this machine can make a real call to find out. The
   server-side validator has to exist either way, so it is the guarantee, and
   `strict` is a line to add the first day a key is present and the fixtures
   can be run for real.

   ── THE CACHE ─────────────────────────────────────────────────────────

   key = sha256( every image's sha256, in order, joined | canonical stats |
   MODEL ) (plan §11 step 3). Order matters (the same four pictures in
   another order are another question), the stats matter (the same pictures
   measured differently are another question), and the model id matters (a
   new model is a new answer). press/vibe.js computes the identical string so
   the client can skip the call on a hit; the two canonicalisers are written
   out twice on purpose — the bench has no module system and a browser and a
   serverless function cannot share a file — and test-vibe.js holds them to
   each other over the fixtures.

   The client MAY send its key. It is never trusted: this file recomputes the
   key from the payload it actually received and stores under that. A client
   that could name its own cache file could serve any game any judgement.

   WHERE: locally, `press/cache/vibe-<key>.json` (gitignored). On Vercel,
   Vercel KV **over its REST API** when `KV_REST_API_URL` and
   `KV_REST_API_TOKEN` are both set — plain https to an endpoint, no
   `@vercel/kv`, because this file may not have dependencies — else no cache
   at all, which the plan allows ("the call is cheap"). Every cache
   operation is best-effort: a cache that errors is a cache miss, never a
   failed request.

   AND THE RAW ANSWER IS LOGGED, LOCALLY, WITHOUT THE PICTURES.
   `press/cache/vibe-<key>.raw.json` keeps what came back and what was asked,
   for tuning the prompt (Appendix F). What it does NOT keep is one byte of
   image data: the images are recorded as their sha256 and their length and
   nothing else. press/tools/test-vibe.js greps everything this file writes
   for the fixtures' own base64 and fails if it finds any of it.

   ── THE SERVER RULES (Appendix F) ─────────────────────────────────────

   1. The tool input is validated against the schema. A failure — any
      failure — is `{vibe: null, error}` and the Press Table falls back. The
      model is not asked again.
   2. If `stats.pixelSize > 0` and the preset is not `pixel`, the preset is
      REWRITTEN to `pixel` and the model's own choice is pushed to the front
      of `alternates`. A measured grid is not an opinion.
   3. `preset` may not appear in `alternates`. This is repaired, not
      refused: the duplicate is dropped, the list deduped and cut back to
      the schema's two. Rule 2 can create the duplicate itself, so a refusal
      here would fail the answer for a tidy-up this file just caused. Every
      repair is written into the raw log under `repairs`.
   Then the repaired object is validated a second time, because a repair
   that breaks the schema (a third alternate, say) must not leave here.

   ── TESTING IT WITHOUT A KEY ──────────────────────────────────────────

   `module.exports.__setTransport(fn)` swaps the one function that talks to
   the network, for an in-process test. Over a socket — the test that goes
   through serve.js's real mount — there is no reaching in, so
   `ANTHROPIC_BASE_URL` (the name the SDKs use for the same job, and a real
   need for anyone behind a gateway) points this file at another origin, and
   an `http://` one is spoken to over node:http rather than node:https. Both
   are the same seam and neither is a back door: no request can choose them.
   ───────────────────────────────────────────────────────────────────────── */
'use strict';

const https = require('node:https');
const http = require('node:http');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

/* The schema files, by literal require so Vercel's tracer bundles them.
   MERGE: '../press/…' → '../lab2/press/…' (see the header). */
const VIBE_SCHEMA = require('../press/schemas/vibe.schema.json');
const STYLE_SCHEMA = require('../press/schemas/style.schema.json');
const THEME_SCHEMA = require('../press/schemas/theme.schema.json');
const Validate = require('../press/tools/lib/validate.js');

// MERGE: the fifth of the five paths — '..','press' → '..','lab2','press'.
const PRESS_DIR = path.resolve(__dirname, '..', 'press');
const CACHE_DIR = path.join(PRESS_DIR, 'cache');

/* ── the pinned call ──────────────────────────────────────────────────── */

const MODEL = 'claude-opus-5';          // chosen 2026-09-07 — see the header
const API_VERSION = '2023-06-01';        // the Messages API's only version header
const API_BASE = 'https://api.anthropic.com';
const API_PATH = '/v1/messages';
const MAX_TOKENS = 2048;                 // the plan's 800 plus room to think — header
const EFFORT = 'low';                    // a menu pick after four pictures is not deep work
const MAX_IMAGES = 4;                    // plan §11 step 1
const TIMEOUT_MS = 60000;
const TOOL_NAME = 'vibe';

/* Appendix F, verbatim. The menus are the point: they are in the tool's
   schema, and this prompt's job is to say the four things the schema cannot
   (which measurement outranks a judgement, what calm and loud mean, which
   recipe follows which shape of art, and how long `why` is). */
const SYSTEM = 'You classify the visual style of video-game marketing art so a page template and a vector sticker set can match it. You will see up to four images (logo, key art, screenshots) and a JSON of measured statistics. Answer only by calling the tool with values from its menus; never invent ids. Prefer the measured `pixelSize` over your own judgement when it is greater than 0. `harmony` is `loud` when the art wants complementary accents and `calm` when analogous ones would sit better. `recipe`: `poster` for portrait key art, `widescreen` for landscape hero art, `scrapbook` for hand-drawn or cozy work. `why` is one sentence.';

const TOOL_DESCRIPTION = 'Record the style judgement for this game. Every value must come from this schema\'s menus.';

/* ── the schema, with its $refs folded in ─────────────────────────────── */

const SCHEMAS = {
  'vibe.schema.json': VIBE_SCHEMA,
  'style.schema.json': STYLE_SCHEMA,
  'theme.schema.json': THEME_SCHEMA
};

// '#/properties/fonts/properties/id' against a loaded schema. Only the plain
// pointer shape the schemas use; a '~0'/'~1' escape would be a schema this
// project does not write, and guessing at one silently would be worse than
// the throw below, which happens at module load and not at request time.
function pointer(doc, ptr) {
  let at = doc;
  for (const raw of String(ptr || '').split('/')) {
    if (raw === '' || raw === '#') continue;
    if (at === null || typeof at !== 'object' || !(raw in at)) throw new Error('vibe.js: $ref pointer ' + ptr + ' misses at ' + raw);
    at = at[raw];
  }
  return at;
}

/* A deep copy with every {"$ref": "<file>#<pointer>"} replaced by what it
   points at, and the keys the API has no use for dropped. The Messages API
   resolves nothing, so a $ref left in the tool's input_schema is a menu the
   model is never shown — it would answer freely and fail validation for a
   reason nothing in the response explains.

   `$schema` and `$id` go at every level: they are addresses of a file that
   is not being served. `title` and `description` go AT THE ROOT ONLY, and
   this one was measured rather than assumed — vibe.schema.json's own
   description is a note to whoever reads the repo ("`preset`, `alternates`
   and `fontPairing` are $refs rather than copies so a preset added to
   style.schema.json…"), which is both noise in a prompt and, after this
   function has run, untrue of the copy the model is looking at. The tool's
   own `description` is written for the model and says the one thing that
   matters. A description deeper in the schema is a note about a FIELD and
   stays. */
function flatten(node, seen, depth) {
  if (Array.isArray(node)) return node.map(n => flatten(n, seen, depth + 1));
  if (node === null || typeof node !== 'object') return node;
  if (typeof node.$ref === 'string') {
    const [file, ptr] = node.$ref.split('#');
    const doc = file ? SCHEMAS[file] : SCHEMAS['vibe.schema.json'];
    if (!doc) throw new Error('vibe.js: $ref to an unloaded schema: ' + node.$ref);
    if (seen.indexOf(node.$ref) >= 0) throw new Error('vibe.js: $ref cycle at ' + node.$ref);
    return flatten(pointer(doc, ptr), seen.concat(node.$ref), depth);
  }
  const out = {};
  for (const k of Object.keys(node)) {
    if (k === '$schema' || k === '$id') continue;
    if (depth === 0 && (k === 'title' || k === 'description')) continue;
    out[k] = flatten(node[k], seen, depth + 1);
  }
  return out;
}

const TOOL_SCHEMA = flatten(VIBE_SCHEMA, [], 0);

/* ── the transport (one function, swappable) ──────────────────────────── */

function post(url, headers, body) {
  return new Promise((resolve, reject) => {
    let u;
    try { u = new URL(url); } catch (e) { reject(new Error('bad API base: ' + url)); return; }
    const mod = u.protocol === 'http:' ? http : https;
    const req = mod.request({
      protocol: u.protocol,
      hostname: u.hostname,
      port: u.port || (u.protocol === 'http:' ? 80 : 443),
      path: u.pathname + u.search,
      method: 'POST',
      headers: Object.assign({ 'content-length': Buffer.byteLength(body) }, headers)
    }, res => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString('utf8') }));
    });
    req.setTimeout(TIMEOUT_MS, () => { req.destroy(new Error('the model did not answer inside ' + (TIMEOUT_MS / 1000) + ' s')); });
    req.on('error', reject);
    req.end(body);
  });
}

let transport = post;

/* ── the small shared arithmetic (twinned in press/vibe.js) ───────────── */

function canonical(v) {
  if (v === null || typeof v !== 'object') return JSON.stringify(v === undefined ? null : v);
  if (Array.isArray(v)) return '[' + v.map(canonical).join(',') + ']';
  return '{' + Object.keys(v).sort().map(k => JSON.stringify(k) + ':' + canonical(v[k])).join(',') + '}';
}

const sha256 = buf => crypto.createHash('sha256').update(buf).digest('hex');

const bytesOf = b64 => Buffer.from(String(b64).replace(/^data:[^,]*,/, ''), 'base64');

function cacheKey(images, stats, model) {
  const hashes = (images || []).map(b64 => sha256(bytesOf(b64)));
  return sha256(Buffer.from(hashes.join('') + '|' + canonical(stats || {}) + '|' + (model || MODEL), 'utf8'));
}

/* The four formats the Messages API takes, read from the MAGIC BYTES and
   never from a name or a declared type — the client hands over base64 with
   no label at all, so the bytes are the only thing there is to read.
   press/tools/lib/imagebytes.js does the same sniff for the intake and does
   it better (it reads dimensions too), and this is still ten lines rather
   than a require: four magic numbers are not a shared truth that can drift,
   which is the test the header applies to every reach out of api/ — and a
   Vercel bundle should carry what it uses. */
function mediaType(buf) {
  if (buf.length >= 8 && buf[0] === 0x89 && buf.toString('latin1', 1, 4) === 'PNG') return 'image/png';
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  if (buf.length >= 12 && buf.toString('latin1', 0, 4) === 'RIFF' && buf.toString('latin1', 8, 12) === 'WEBP') return 'image/webp';
  if (buf.length >= 6 && buf.toString('latin1', 0, 4) === 'GIF8') return 'image/gif';
  return null;
}

/* ── the cache ────────────────────────────────────────────────────────── */

const kvOn = () => !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
const localOn = () => !process.env.VERCEL;      // the read-only filesystem has no press/cache

function cacheFile(key) { return path.join(CACHE_DIR, 'vibe-' + key + '.json'); }

/* Vercel KV's REST shape: the command and its key are the path, the VALUE is
   the body — not another path segment, which would put a whole judgement in a
   URL. Written to the documented shape and NOT EXERCISED BY ANY TEST: there
   is no KV binding on this machine, so `kvOn()` is false in every run of
   press/tools/test-vibe.js and this function is dead code here. The first
   deploy with KV configured is where it is first tried; until then the honest
   description of this branch is "believed correct, never run". */
async function kv(command, value) {
  const base = String(process.env.KV_REST_API_URL).replace(/\/+$/, '');
  const r = await transport(base + '/' + command.map(encodeURIComponent).join('/'),
    { 'content-type': 'application/json', authorization: 'Bearer ' + process.env.KV_REST_API_TOKEN },
    value === undefined ? '' : value);
  if (r.status !== 200) throw new Error('KV answered ' + r.status);
  return JSON.parse(r.body);
}

// Every read is best-effort: a cache that throws is a cache that missed.
async function cacheRead(key) {
  try {
    if (kvOn()) {
      const got = await kv(['get', 'vibe-' + key]);
      return got && got.result ? JSON.parse(got.result) : null;
    }
    if (localOn() && fs.existsSync(cacheFile(key))) return JSON.parse(fs.readFileSync(cacheFile(key), 'utf8'));
  } catch (e) { /* a miss */ }
  return null;
}

async function cacheWrite(key, entry) {
  try {
    if (kvOn()) { await kv(['set', 'vibe-' + key], JSON.stringify(entry)); return true; }
    if (localOn()) {
      fs.mkdirSync(CACHE_DIR, { recursive: true });
      fs.writeFileSync(cacheFile(key), JSON.stringify(entry, null, 2) + '\n');
      return true;
    }
  } catch (e) { /* not being able to remember is not a failure to answer */ }
  return false;
}

/* The tuning log. Local only, and it holds NO IMAGE DATA — each picture is
   its sha256, its media type and its length. Everything else that was said
   to the model is here, because a prompt is only tunable if you can read
   what it actually asked. */
function logRaw(key, record) {
  if (!localOn()) return;
  try {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
    fs.writeFileSync(path.join(CACHE_DIR, 'vibe-' + key + '.raw.json'), JSON.stringify(record, null, 2) + '\n');
  } catch (e) { /* the log is a convenience */ }
}

/* ── the request body ─────────────────────────────────────────────────── */

function messageBody(images, stats, manifest) {
  const content = [];
  for (const img of images) {
    content.push({ type: 'image', source: { type: 'base64', media_type: img.media, data: img.data } });
  }
  content.push({ type: 'text', text: canonical(stats) });
  content.push({ type: 'text', text: fixtureLine(manifest) });
  return {
    model: MODEL,
    max_tokens: MAX_TOKENS,
    output_config: { effort: EFFORT },
    system: SYSTEM,
    tools: [{ name: TOOL_NAME, description: TOOL_DESCRIPTION, input_schema: TOOL_SCHEMA }],
    tool_choice: { type: 'tool', name: TOOL_NAME },
    messages: [{ role: 'user', content }]
  };
}

/* Appendix F's last line of the user turn: '"Fixture: none." (or the
   manifest's title and genres when known)'. One shape either way, so the
   prompt prefix is the same string for every game that has no manifest —
   which is what makes it cacheable at the model's end. */
function fixtureLine(manifest) {
  const title = manifest && typeof manifest.title === 'string' ? manifest.title.trim() : '';
  if (!title) return 'Fixture: none.';
  const genres = manifest && Array.isArray(manifest.genres)
    ? manifest.genres.filter(g => typeof g === 'string' && g.trim()).map(g => g.trim()) : [];
  return 'Fixture: ' + title + '.' + (genres.length ? ' Genres: ' + genres.join(', ') + '.' : '');
}

/* ── the server rules ─────────────────────────────────────────────────── */

/* Validate.check answers [{path, message}, …] — a list for a person reading
   a terminal. The Press Table gets ONE line of it, because the error is an
   explanation of a fallback and not a bug report: the first three, joined,
   with the count when there are more. The whole list goes in the raw log. */
function say(errors) {
  const head = errors.slice(0, 3).map(e => (e.path ? e.path + ': ' : '') + e.message).join('; ');
  return errors.length > 3 ? head + ' (and ' + (errors.length - 3) + ' more)' : head;
}

function serverRules(vibe, stats) {
  const repairs = [];
  const out = JSON.parse(JSON.stringify(vibe));
  if (!Array.isArray(out.alternates)) out.alternates = [];

  const pixelSize = stats && Number(stats.pixelSize) > 0 ? Number(stats.pixelSize) : 0;
  if (pixelSize > 0 && out.preset !== 'pixel') {
    repairs.push('pixelSize ' + pixelSize + ' was measured and the model said ' + out.preset + ': preset rewritten to pixel, its choice pushed to the front of alternates');
    out.alternates.unshift(out.preset);
    out.preset = 'pixel';
  }

  const before = out.alternates.length;
  out.alternates = out.alternates.filter((p, i, a) => p !== out.preset && a.indexOf(p) === i).slice(0, 2);
  if (out.alternates.length !== before) repairs.push('alternates: the preset and any duplicate dropped, the list cut to two — ' + before + ' → ' + out.alternates.length);

  return { vibe: out, repairs };
}

/* ── the handler ──────────────────────────────────────────────────────── */

function bodyOf(req) {
  const b = req.body;
  if (b && typeof b === 'object' && !Buffer.isBuffer(b)) return b;
  const raw = Buffer.isBuffer(b) ? b : req.rawBody;
  if (!raw || !raw.length) return null;
  try { return JSON.parse(raw.toString('utf8')); } catch (e) { return null; }
}

async function handler(req, res) {
  const answer = (code, obj) => { res.status(code); res.json(obj); };

  if (req.method !== 'POST') return answer(405, { vibe: null, error: 'POST a JSON body to this door' });

  const body = bodyOf(req);
  if (!body) return answer(400, { vibe: null, error: 'the body is not JSON' });

  const raw = Array.isArray(body.images) ? body.images : null;
  if (!raw) return answer(400, { vibe: null, error: 'images must be an array of base64 strings' });
  if (raw.length < 1) return answer(400, { vibe: null, error: 'no images to look at' });
  if (raw.length > MAX_IMAGES) return answer(400, { vibe: null, error: 'at most ' + MAX_IMAGES + ' images; ' + raw.length + ' were sent' });

  const images = [];
  for (let i = 0; i < raw.length; i++) {
    if (typeof raw[i] !== 'string' || !raw[i]) return answer(400, { vibe: null, error: 'image ' + i + ' is not a base64 string' });
    const buf = bytesOf(raw[i]);
    const media = mediaType(buf);
    if (!media) return answer(400, { vibe: null, error: 'image ' + i + ' is not a PNG, JPEG, WebP or GIF by its first bytes' });
    images.push({ data: String(raw[i]).replace(/^data:[^,]*,/, ''), media, bytes: buf.length, sha256: sha256(buf) });
  }

  const stats = (body.stats && typeof body.stats === 'object' && !Array.isArray(body.stats)) ? body.stats : {};
  const manifest = (body.manifest && typeof body.manifest === 'object') ? body.manifest : null;

  // The client's key is a hint at best; this is the one that names the file.
  const key = cacheKey(raw, stats, MODEL);

  const hit = await cacheRead(key);
  if (hit && hit.vibe) return answer(200, { vibe: hit.vibe, cached: true, model: hit.model || MODEL });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return answer(200, { vibe: null, error: 'no ANTHROPIC_API_KEY' });

  const request = messageBody(images, stats, manifest);
  const url = String(process.env.ANTHROPIC_BASE_URL || API_BASE).replace(/\/+$/, '') + API_PATH;

  // Never the images, and never the key: what the log keeps of a picture is
  // its hash, its type and its size.
  const log = {
    _what: 'the raw exchange for one vision call, kept for tuning the prompt (Appendix F). NO IMAGE DATA is here by design — a picture is its sha256, its media type and its length.',
    at: new Date().toISOString(),
    key,
    model: MODEL,
    max_tokens: MAX_TOKENS,
    effort: EFFORT,
    images: images.map(i => ({ sha256: i.sha256, media: i.media, bytes: i.bytes })),
    system: SYSTEM,
    stats: canonical(stats),
    fixtureLine: fixtureLine(manifest)
  };

  let reply;
  try {
    reply = await transport(url, {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': API_VERSION
    }, JSON.stringify(request));
  } catch (e) {
    log.error = 'transport: ' + ((e && e.message) || e);
    logRaw(key, log);
    return answer(200, { vibe: null, error: 'the model could not be reached: ' + ((e && e.message) || e) });
  }

  let parsed = null;
  try { parsed = JSON.parse(reply.body); } catch (e) { parsed = null; }
  log.status = reply.status;
  log.response = parsed || String(reply.body).slice(0, 4000);

  if (reply.status !== 200 || !parsed) {
    logRaw(key, log);
    return answer(200, { vibe: null, error: 'the model answered ' + reply.status });
  }

  const call = Array.isArray(parsed.content) ? parsed.content.find(b => b && b.type === 'tool_use' && b.name === TOOL_NAME) : null;
  if (!call || !call.input || typeof call.input !== 'object') {
    log.error = 'no ' + TOOL_NAME + ' tool_use block (stop_reason ' + parsed.stop_reason + ')';
    logRaw(key, log);
    return answer(200, { vibe: null, error: 'the model did not call the tool (stop_reason ' + parsed.stop_reason + ')' });
  }

  const first = Validate.check(call.input, VIBE_SCHEMA, SCHEMAS);
  if (first.length) {
    log.error = 'schema: ' + say(first);
    logRaw(key, log);
    return answer(200, { vibe: null, error: 'the judgement did not validate: ' + say(first) });
  }

  const ruled = serverRules(call.input, stats);
  log.repairs = ruled.repairs;

  // The repair is validated in its turn: rule 2 can push a third alternate
  // past the schema's maxItems, and a repaired answer that breaks the schema
  // must not leave here just because the model's did not.
  const second = Validate.check(ruled.vibe, VIBE_SCHEMA, SCHEMAS);
  if (second.length) {
    log.error = 'after the server rules: ' + say(second);
    logRaw(key, log);
    return answer(200, { vibe: null, error: 'the judgement did not survive the server rules: ' + say(second) });
  }

  log.vibe = ruled.vibe;
  log.cached = await cacheWrite(key, { key, model: MODEL, at: new Date().toISOString(), vibe: ruled.vibe });
  logRaw(key, log);          // last, so the log can say whether the cache took it

  return answer(200, { vibe: ruled.vibe, cached: false, model: MODEL });
}

module.exports = handler;
module.exports.handler = handler;
module.exports.MODEL = MODEL;
module.exports.MAX_IMAGES = MAX_IMAGES;
module.exports.SYSTEM = SYSTEM;
module.exports.TOOL_NAME = TOOL_NAME;
module.exports.TOOL_SCHEMA = TOOL_SCHEMA;
module.exports.CACHE_DIR = CACHE_DIR;
module.exports.canonical = canonical;
module.exports.cacheKey = cacheKey;
module.exports.fixtureLine = fixtureLine;
module.exports.mediaType = mediaType;
module.exports.serverRules = serverRules;
module.exports.messageBody = messageBody;

/* The one seam a test may reach through. Nothing a request can say gets
   here; it is a module-level function swap, so only code in this process
   that already required this file can use it. */
module.exports.__setTransport = fn => { transport = typeof fn === 'function' ? fn : post; };
