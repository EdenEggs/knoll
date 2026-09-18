/* ─── TEST-VIBE ────────────────────────────────────────────────────────────
   Refutes Phase 7 — api/vibe.js, press/vibe.js and the three recorded
   judgements — without spending a penny and without a key, because there is
   no ANTHROPIC_API_KEY on this machine (NOTES §D.11) and there never was one
   while any of this was written.

       node lab2/test/press/tools/test-vibe.js              (from site/)
       node lab2/test/press/tools/test-vibe.js --no-mount   (skip the sockets)

   Exit 1 on any failure.

   WHAT IS AND IS NOT PROVED HERE. Everything below the model is proved: the
   schema, the server rules, the cache, the merge, the request this file
   would send and the shape it would answer with. The model itself is
   stubbed, always — every "response" in this run is one of the recorded
   judgements in press/fixtures/<name>/vibe-recorded.json, which are
   hand-written and say so in their own first key. So a green run means the
   PLUMBING is sound. It does not mean the call works; nothing on this
   machine can say that, and the first day a key exists this file should be
   run again with the stub taken out of one case.

   SIX SECTIONS.

   A · THE SCHEMA. Each recorded judgement validates against
   press/schemas/vibe.schema.json with an EMPTY error list, and then sixteen
   mutations of one of them are refused — one per keyword the schema uses on
   each of its ten properties, plus a missing required key and an over-long
   `why`. Each mutation asserts the PATH as well as the refusal, because a
   validator that refuses everything for the wrong reason passes a test that
   only counts failures. (Seventeenth case, asserted the other way: an extra
   key is ALLOWED — vibe.schema.json sets no `additionalProperties: false`,
   so a model that adds a field is not refused for it. Written down here so
   that the day somebody tightens the schema, this line is the one that says
   the behaviour changed on purpose.)

   B · THE SERVER RULES, in process, with the transport swapped
   (`__setTransport`). Each case deletes its own cache files first, because a
   file left by an earlier run would answer before the stub did and the case
   would pass for the wrong reason. Asserted: the request that would be sent
   (the pinned model, the forced tool, Appendix F's system prompt byte for
   byte, one image block per picture with the media type read from ITS OWN
   magic bytes, the canonical stats, the fixture line, and the two headers);
   the pixelSize override; the alternates repair; the cache written and the
   cache HIT on the second call with the transport untouched; the client's
   own cacheKey ignored; six ways for a model answer to be wrong, each of
   which must come back {vibe: null, error} and must NOT throw; and six bad
   payloads, which are a 400 and never reach the transport.

   C · THE MERGE, as a table — eighteen rows over every branch of plan §11
   step 5, including 0.59 against 0.60 on either side of the line and a model
   preset that is fourth in the ranking.

   D · NO KEY. With ANTHROPIC_API_KEY deleted from the environment the
   handler answers 200 and {vibe: null, error: 'no ANTHROPIC_API_KEY'}, and
   the transport is never called.

   E · THE REAL MOUNT, over a real socket, twice and for two different
   reasons:

     1. The sandbox server already running on 4322 is POSTed to at
        /_lab2/test/vibe. It has no key in its environment, so what comes
        back is D's answer through serve.js's mountApi — the no-key path
        end to end, on the port the README names, with nothing stubbed.
     2. A SECOND COPY of the same lab2/test/serve.js is spawned on a free
        port with ANTHROPIC_API_KEY and ANTHROPIC_BASE_URL set, the latter
        pointing at a stub HTTP server this file starts. That is the only
        way to drive the full round trip through the real mount: an env var
        is read by the process that has it, and the server on 4322 was
        started before this test existed and belongs to somebody else. Same
        serve.js, same handler, same door path — a different port and an
        environment this test controls. The deviation is written here rather
        than hidden, because "it went through the real mount" is a claim.

     The client half posts these: press/vibe.js's own `request()` is what
     sends them (Node has `fetch`), so the browser file's error handling and
     the function's answers are checked against each other rather than
     against a curl.

   F · CACHE HYGIENE. press/cache/ is listed before the run and again after,
   and every file that appeared or changed is searched for the fixtures' own
   image data — the whole base64 of each picture and a 96-character slice out
   of the middle of it. Appendix F says "never log images" and this is that
   sentence made a test. The same files must contain each image's sha256 and
   byte length, because a log that keeps nothing is not a log. Everything
   this run wrote is then deleted; it is stub output, not evidence.
   ───────────────────────────────────────────────────────────────────────── */
'use strict';
const fs = require('fs');
const path = require('path');
const http = require('http');
const net = require('net');
const { spawn } = require('child_process');

const TEST = path.resolve(__dirname, '..', '..');          // lab2/test
const SITE = path.resolve(TEST, '..', '..');               // site/
const PRESS = path.join(TEST, 'press');
const CACHE = path.join(PRESS, 'cache');
const FIXTURES = path.join(PRESS, 'fixtures');
const SERVE = path.join(TEST, 'serve.js');
const DOOR = '/_lab2/test/vibe';
const LIVE = 'http://127.0.0.1:4322';                      // the README's sandbox port
const NAMES = ['pixelfort', 'mosslight', 'neonrun'];
const STUB_KEY = 'test-key-that-is-not-a-key';             // never sent anywhere but this file's own stub

const MOUNT = process.argv.indexOf('--no-mount') < 0;

let fails = 0;
const results = [];
const ok = (name, pass, info) => {
  results.push({ name, ok: !!pass, info: info === undefined ? '' : String(info) });
  if (!pass) fails++;
  console.log((pass ? 'PASS ' : 'FAIL ') + name + (info !== undefined ? ' — ' + info : ''));
};

/* ── what is under test ───────────────────────────────────────────────── */

const vibeApi = require(path.join(TEST, 'api', 'vibe.js'));
const Validate = require(path.join(PRESS, 'tools', 'lib', 'validate.js'));
const loadBrowser = require(path.join(PRESS, 'tools', 'lib', 'browser-module.js'));

const POOL = {
  'vibe.schema.json': require(path.join(PRESS, 'schemas', 'vibe.schema.json')),
  'style.schema.json': require(path.join(PRESS, 'schemas', 'style.schema.json')),
  'theme.schema.json': require(path.join(PRESS, 'schemas', 'theme.schema.json'))
};
const VIBE_SCHEMA = POOL['vibe.schema.json'];

// press/vibe.js is a browser file; lib/browser-module.js runs it against a
// bare `window` in this realm, which is where its fetch, atob, crypto.subtle
// and TextEncoder come from — Node has all four, so cacheKey() and request()
// are the real functions and not stand-ins.
const { Vibe } = loadBrowser(path.join(PRESS, 'vibe.js'));

const recorded = {};
const fixtures = {};
for (const name of NAMES) {
  recorded[name] = JSON.parse(fs.readFileSync(path.join(FIXTURES, name, 'vibe-recorded.json'), 'utf8'));
  const manifest = JSON.parse(fs.readFileSync(path.join(FIXTURES, name, 'manifest.json'), 'utf8'));
  const stats = JSON.parse(fs.readFileSync(path.join(FIXTURES, name, 'stats.json'), 'utf8')).stats;
  // Four pictures at most, the plan's cap, and the same four every run so
  // the key is the same every run: the manifest's own order, cut at four.
  const images = manifest.assets.slice(0, vibeApi.MAX_IMAGES)
    .map(a => fs.readFileSync(path.join(FIXTURES, name, a.file)).toString('base64'));
  fixtures[name] = { manifest, stats, images };
}

/* ── small helpers ────────────────────────────────────────────────────── */

// The Messages API's own envelope round a tool call — what the transport
// would hand back on a good day.
function envelope(input, over) {
  return Object.assign({
    id: 'msg_stub', type: 'message', role: 'assistant', model: vibeApi.MODEL,
    content: [{ type: 'tool_use', id: 'toolu_stub', name: vibeApi.TOOL_NAME, input }],
    stop_reason: 'tool_use', usage: { input_tokens: 0, output_tokens: 0 }
  }, over || {});
}

function fakeRes() {
  const r = { code: 200, body: null, ended: false };
  r.status = c => { r.code = c; return r; };
  r.json = o => { r.body = o; r.ended = true; return r; };
  r.send = b => (b && typeof b === 'object' && !Buffer.isBuffer(b)) ? r.json(b) : (r.body = b, r.ended = true, r);
  return r;
}

async function call(payload) {
  const res = fakeRes();
  await vibeApi.handler({ method: 'POST', body: payload }, res);
  return res;
}

const keyOf = name => vibeApi.cacheKey(fixtures[name].images, fixtures[name].stats, vibeApi.MODEL);
const cacheFiles = key => [path.join(CACHE, 'vibe-' + key + '.json'), path.join(CACHE, 'vibe-' + key + '.raw.json')];
const forget = key => { for (const f of cacheFiles(key)) { try { fs.unlinkSync(f); } catch (e) { /* was not there */ } } };

const payloadFor = (name, over) => Object.assign({
  images: fixtures[name].images,
  stats: fixtures[name].stats,
  manifest: { title: fixtures[name].manifest.title, genres: fixtures[name].manifest.genres }
}, over || {});

function snapshot(dir) {
  const out = {};
  let names = [];
  try { names = fs.readdirSync(dir); } catch (e) { return out; }
  for (const n of names) {
    const f = path.join(dir, n);
    try { const s = fs.statSync(f); if (s.isFile()) out[n] = s.size + ':' + s.mtimeMs; } catch (e) { /* gone */ }
  }
  return out;
}

// Every $ref left anywhere in a schema, by KEY and not by a search of the
// text — vibe.schema.json's own description talks ABOUT its $refs, and a
// substring search called that a leak.
function refsIn(node, at) {
  at = at || '';
  if (Array.isArray(node)) return node.reduce((a, n, i) => a.concat(refsIn(n, at + '[' + i + ']')), []);
  if (node === null || typeof node !== 'object') return [];
  let out = [];
  for (const k of Object.keys(node)) {
    if (k === '$ref') out.push(at + '.$ref = ' + node[k]);
    else out = out.concat(refsIn(node[k], at + '.' + k));
  }
  return out;
}

function freePort() {
  return new Promise((resolve, reject) => {
    const s = net.createServer();
    s.on('error', reject);
    s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => resolve(p)); });
  });
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

/* ── the run ──────────────────────────────────────────────────────────── */

(async function run() {
  const before = snapshot(CACHE);
  const written = new Set();          // every key this run may have written under
  let child = null, stub = null;

  try {
    sectionA();
    await sectionB(written);
    sectionC();
    await sectionD(written);
    const spawned = await sectionE(written);
    child = spawned.child; stub = spawned.stub;
    sectionF(before);
  } catch (e) {
    ok('the run itself finished', false, (e && e.stack) || e);
  }

  if (child) { try { child.kill(); } catch (e) { /* already gone */ } }
  if (stub) { try { stub.close(); } catch (e) { /* already closed */ } }

  // Everything this run put in press/cache/ is stub output. It is gitignored
  // either way, but a file named vibe-<key>.json that holds a hand-written
  // judgement is exactly the thing somebody would later mistake for an
  // answer from the model, so it does not survive the test that wrote it.
  for (const key of written) forget(key);

  const n = results.length;
  console.log('\n' + (n - fails) + '/' + n + ' checks pass' + (fails ? ', ' + fails + ' FAIL' : ''));
  console.log('the model was stubbed in every one of them — there is no ANTHROPIC_API_KEY here (NOTES §D.11)');
  process.exit(fails ? 1 : 0);
})();

/* ── A · the schema ───────────────────────────────────────────────────── */

function sectionA() {
  console.log('\n── A · the schema ───────────────────────────────────────');

  for (const name of NAMES) {
    const errs = Validate.check(recorded[name].vibe, VIBE_SCHEMA, POOL);
    ok('recorded ' + name + ' validates', errs.length === 0, errs.map(e => e.path + ' ' + e.message).join('; '));
    const marked = String(recorded[name]._recorded || '');
    ok('recorded ' + name + ' says it is not model output', /RECORDED, NOT MODEL OUTPUT/.test(marked) && /2026-09-07/.test(String(recorded[name]._date)) && /ANTHROPIC_API_KEY/.test(String(recorded[name]._why)),
      marked.slice(0, 48) + '…');
  }

  const base = recorded.neonrun.vibe;
  const bend = f => { const c = JSON.parse(JSON.stringify(base)); f(c); return c; };
  const MUTATIONS = [
    ['artStyle off the menu', 'artStyle', v => v.artStyle = 'watercolour'],
    ['mood empty', 'mood', v => v.mood = []],
    ['mood of four', 'mood', v => v.mood = ['cozy', 'retro', 'neon', 'epic']],
    ['a mood off the menu', 'mood[0]', v => v.mood[0] = 'sleepy'],
    ['only two motifs', 'motifs', v => v.motifs = ['city', 'car']],
    ['a motif off the menu', 'motifs[1]', v => v.motifs[1] = 'dinosaur'],
    ['preset off the menu', 'preset', v => v.preset = 'watercolor'],
    ['three alternates', 'alternates', v => v.alternates = ['flat', 'cel', 'pixel']],
    ['an alternate off the menu', 'alternates[0]', v => v.alternates[0] = 'sketchy'],
    ['fontPairing off the menu', 'fontPairing', v => v.fontPairing = 'blackletter'],
    ['recipe off the menu', 'recipe', v => v.recipe = 'zine'],
    ['harmony off the menu', 'harmony', v => v.harmony = 'medium'],
    ['confidence over 1', 'confidence', v => v.confidence = 1.4],
    ['confidence as a string', 'confidence', v => v.confidence = '0.9'],
    ['no preset at all', 'preset', v => delete v.preset],
    ['why over 300 characters', 'why', v => v.why = 'x'.repeat(301)]
  ];
  for (const [what, at, f] of MUTATIONS) {
    const errs = Validate.check(bend(f), VIBE_SCHEMA, POOL);
    ok('the schema refuses ' + what + ' at ' + at, errs.length > 0 && errs[0].path === at,
      errs.length ? errs[0].path + ': ' + errs[0].message.slice(0, 60) : 'no error at all');
  }
  ok('MUTATIONS covers every property of the schema',
    Object.keys(VIBE_SCHEMA.properties).every(p => MUTATIONS.some(m => m[1] === p || m[1].indexOf(p + '[') === 0)),
    MUTATIONS.length + ' mutations over ' + Object.keys(VIBE_SCHEMA.properties).length + ' properties');

  const extra = Validate.check(bend(v => { v.zzz = 1; }), VIBE_SCHEMA, POOL);
  ok('an extra key is ALLOWED (no additionalProperties: false in the schema)', extra.length === 0, JSON.stringify(extra));
}

/* ── B · the server rules, transport stubbed ──────────────────────────── */

async function sectionB(written) {
  console.log('\n── B · the server rules, with the transport stubbed ──────');

  const hadKey = process.env.ANTHROPIC_API_KEY;
  process.env.ANTHROPIC_API_KEY = STUB_KEY;

  let sent = [];
  let answer = () => ({ status: 200, body: JSON.stringify(envelope(recorded.neonrun.vibe)) });
  vibeApi.__setTransport(async (url, headers, body) => {
    sent.push({ url, headers, body: JSON.parse(body) });
    return answer();
  });
  const fresh = () => { sent = []; };

  /* 1 · the request that would be sent ─────────────────────────────────── */
  {
    const key = keyOf('neonrun'); written.add(key); forget(key);
    fresh();
    const res = await call(payloadFor('neonrun'));
    ok('a good answer comes back 200 with the judgement', res.code === 200 && !!res.body.vibe && res.body.cached === false && res.body.model === vibeApi.MODEL,
      JSON.stringify({ code: res.code, cached: res.body && res.body.cached, model: res.body && res.body.model }));
    ok('exactly one call went out', sent.length === 1, sent.length);

    const req = sent[0];
    ok('it went to /v1/messages on api.anthropic.com', /^https:\/\/api\.anthropic\.com\/v1\/messages$/.test(req.url), req.url);
    ok('the key travels as x-api-key with the version header', req.headers['x-api-key'] === STUB_KEY && req.headers['anthropic-version'] === '2023-06-01',
      req.headers['anthropic-version']);
    ok('the model is the pinned one', req.body.model === 'claude-opus-5', req.body.model);
    ok('the tool is forced', req.body.tool_choice && req.body.tool_choice.type === 'tool' && req.body.tool_choice.name === vibeApi.TOOL_NAME, JSON.stringify(req.body.tool_choice));
    ok('there is exactly one tool and its input_schema has no $ref left in it',
      req.body.tools.length === 1 && refsIn(req.body.tools[0].input_schema).length === 0,
      req.body.tools.length + ' tool(s), refs ' + JSON.stringify(refsIn(req.body.tools[0].input_schema)));
    ok("and the repo's own commentary was not sent up as the tool description",
      !('description' in req.body.tools[0].input_schema) && !('title' in req.body.tools[0].input_schema) &&
      !('$schema' in req.body.tools[0].input_schema) && /menus/.test(req.body.tools[0].description),
      Object.keys(req.body.tools[0].input_schema).join(','));
    ok("the tool's menus are the schema file's",
      JSON.stringify(req.body.tools[0].input_schema.properties.preset.enum) === JSON.stringify(POOL['style.schema.json'].properties.preset.enum) &&
      JSON.stringify(req.body.tools[0].input_schema.properties.fontPairing.enum) === JSON.stringify(POOL['theme.schema.json'].properties.fonts.properties.id.enum),
      req.body.tools[0].input_schema.properties.preset.enum.length + ' presets, ' + req.body.tools[0].input_schema.properties.fontPairing.enum.length + ' pairings');
    ok('max_tokens and effort are the pinned ones', req.body.max_tokens === 2048 && req.body.output_config.effort === 'low',
      req.body.max_tokens + ', ' + req.body.output_config.effort);
    ok('no temperature is sent (the current model rejects sampling parameters)', !('temperature' in req.body) && !('top_p' in req.body) && !('top_k' in req.body));
    ok('the system prompt is Appendix F verbatim', req.body.system === APPENDIX_F_SYSTEM, req.body.system === APPENDIX_F_SYSTEM ? '' : req.body.system.slice(0, 80));
    ok('the system prompt in api/vibe.js is the exported one', vibeApi.SYSTEM === APPENDIX_F_SYSTEM);

    const content = req.body.messages[0].content;
    const imgs = content.filter(c => c.type === 'image');
    ok('the user turn is the images, then the stats, then the fixture line',
      content.length === imgs.length + 2 && content[content.length - 2].type === 'text' && content[content.length - 1].type === 'text' &&
      content.slice(0, imgs.length).every(c => c.type === 'image'),
      content.map(c => c.type).join(','));
    ok('four images at most went up', imgs.length === Math.min(4, fixtures.neonrun.images.length) && imgs.length <= 4, imgs.length);
    ok('every image is base64 with a media type read from its own bytes',
      imgs.every(i => i.source.type === 'base64' && i.source.media_type === 'image/png' && typeof i.source.data === 'string'),
      imgs.map(i => i.source.media_type).join(' '));
    ok('the stats block is the canonical JSON of the stats sent',
      content[content.length - 2].text === vibeApi.canonical(fixtures.neonrun.stats), content[content.length - 2].text.slice(0, 60));
    ok('the fixture line carries the title and the genres',
      content[content.length - 1].text === 'Fixture: Neon Run. Genres: runner, synthwave, arcade.', content[content.length - 1].text);
    ok('with no manifest the fixture line is the plan\'s "Fixture: none."', vibeApi.fixtureLine(null) === 'Fixture: none.', vibeApi.fixtureLine(null));
  }

  /* 2 · the cache: written, then hit without a second call ─────────────── */
  {
    const key = keyOf('neonrun');
    ok('the cache file was written under the server\'s own key', fs.existsSync(cacheFiles(key)[0]), path.basename(cacheFiles(key)[0]));
    const entry = JSON.parse(fs.readFileSync(cacheFiles(key)[0], 'utf8'));
    ok('the cache entry holds the judgement and the model', !!entry.vibe && entry.model === vibeApi.MODEL && entry.key === key, entry.model);

    fresh();
    const res = await call(payloadFor('neonrun'));
    ok('the second call is a HIT: cached true', res.code === 200 && res.body.cached === true && !!res.body.vibe, JSON.stringify({ cached: res.body.cached }));
    ok('and the transport was not called again', sent.length === 0, sent.length + ' call(s)');
    ok('the hit answers the same judgement', JSON.stringify(res.body.vibe) === JSON.stringify(entry.vibe));
  }

  /* 3 · a client-supplied cacheKey is a hint and nothing more ──────────── */
  {
    const key = keyOf('mosslight'); written.add(key); forget(key);
    const liar = 'f'.repeat(64);
    forget(liar); written.add(liar);
    fresh();
    answer = () => ({ status: 200, body: JSON.stringify(envelope(recorded.mosslight.vibe)) });
    const res = await call(payloadFor('mosslight', { cacheKey: liar }));
    ok('a client-named key does not name the file', res.body.vibe && fs.existsSync(cacheFiles(key)[0]) && !fs.existsSync(cacheFiles(liar)[0]),
      'wrote ' + path.basename(cacheFiles(key)[0]));
  }

  /* 4 · press/vibe.js computes the very same key ───────────────────────── */
  {
    for (const name of NAMES) {
      const mine = await Vibe.cacheKey(fixtures[name].images, fixtures[name].stats);
      ok('press/vibe.js and api/vibe.js agree on ' + name + "'s cache key", mine === keyOf(name), mine.slice(0, 12) + '… / ' + keyOf(name).slice(0, 12) + '…');
    }
    ok('the two canonicalisers agree on a nested object with unsorted keys',
      Vibe.canonical({ b: 1, a: { d: [3, 2], c: null } }) === vibeApi.canonical({ b: 1, a: { d: [3, 2], c: null } }),
      vibeApi.canonical({ b: 1, a: { d: [3, 2], c: null } }));
    ok('the two files pin the same MODEL', Vibe.MODEL === vibeApi.MODEL, Vibe.MODEL + ' / ' + vibeApi.MODEL);
    const different = vibeApi.cacheKey(fixtures.neonrun.images, fixtures.neonrun.stats, 'claude-some-other-model');
    ok('a different model id is a different key', different !== keyOf('neonrun'));
    const reordered = vibeApi.cacheKey(fixtures.neonrun.images.slice().reverse(), fixtures.neonrun.stats, vibeApi.MODEL);
    ok('the same pictures in another order are a different key', reordered !== keyOf('neonrun'));
  }

  /* 5 · the pixelSize override ─────────────────────────────────────────── */
  {
    const key = keyOf('pixelfort'); written.add(key); forget(key);
    fresh();
    const wrong = Object.assign({}, recorded.pixelfort.vibe, { preset: 'cel', alternates: ['grunge', 'flat'] });
    answer = () => ({ status: 200, body: JSON.stringify(envelope(wrong)) });
    const res = await call(payloadFor('pixelfort'));
    ok('pixelSize ' + fixtures.pixelfort.stats.pixelSize + ' rewrites the model\'s cel to pixel',
      res.body.vibe && res.body.vibe.preset === 'pixel', res.body.vibe && res.body.vibe.preset);
    ok("and pushes the model's own choice to the front of alternates",
      res.body.vibe && res.body.vibe.alternates[0] === 'cel' && res.body.vibe.alternates.length === 2,
      JSON.stringify(res.body.vibe && res.body.vibe.alternates));
    ok('the raw log records the repair', /rewritten to pixel/.test(fs.readFileSync(cacheFiles(key)[1], 'utf8')));

    // the rule applied straight, without a transport, on both sides of 0
    const r1 = vibeApi.serverRules({ preset: 'neon', alternates: ['flat', 'cel'] }, { pixelSize: 0 });
    ok('with pixelSize 0 the preset is left alone', r1.vibe.preset === 'neon' && r1.repairs.length === 0, JSON.stringify(r1.vibe.alternates));
    const r2 = vibeApi.serverRules({ preset: 'pixel', alternates: ['flat'] }, { pixelSize: 4 });
    ok('with pixelSize 4 and the model already saying pixel, nothing is pushed', r2.vibe.preset === 'pixel' && JSON.stringify(r2.vibe.alternates) === '["flat"]', JSON.stringify(r2.vibe.alternates));
  }

  /* 6 · the alternates rule ────────────────────────────────────────────── */
  {
    const dup = vibeApi.serverRules({ preset: 'neon', alternates: ['neon', 'flat'] }, { pixelSize: 0 });
    ok('the preset is dropped out of alternates', JSON.stringify(dup.vibe.alternates) === '["flat"]', JSON.stringify(dup.vibe.alternates));
    ok('and the repair is recorded', dup.repairs.length === 1, dup.repairs.join(' | '));
    const twice = vibeApi.serverRules({ preset: 'flat', alternates: ['cel', 'cel'] }, { pixelSize: 0 });
    ok('a duplicate alternate is dropped too', JSON.stringify(twice.vibe.alternates) === '["cel"]', JSON.stringify(twice.vibe.alternates));
    const three = vibeApi.serverRules({ preset: 'flat', alternates: ['cel', 'neon'] }, { pixelSize: 3 });
    ok('the override cannot push the list past the schema\'s two',
      three.vibe.preset === 'pixel' && three.vibe.alternates.length === 2 && three.vibe.alternates[0] === 'flat',
      JSON.stringify(three.vibe.alternates));
    ok('and the repaired object still validates', Validate.check(Object.assign({}, recorded.pixelfort.vibe, three.vibe), VIBE_SCHEMA, POOL).length === 0);
  }

  /* 7 · five ways to be wrong, and none of them throws ─────────────────── */
  {
    const bad = [
      ['a preset off the menu', () => ({ status: 200, body: JSON.stringify(envelope(Object.assign({}, recorded.neonrun.vibe, { preset: 'watercolor' }))) }), /did not validate/],
      ['three alternates', () => ({ status: 200, body: JSON.stringify(envelope(Object.assign({}, recorded.neonrun.vibe, { alternates: ['flat', 'cel', 'pixel'] }))) }), /did not validate/],
      ['no tool_use block', () => ({ status: 200, body: JSON.stringify({ content: [{ type: 'text', text: 'pixel art, I think' }], stop_reason: 'end_turn' }) }), /did not call the tool/],
      ['a body that is not JSON', () => ({ status: 200, body: '<html>gateway</html>' }), /answered 200/],
      ['a 429', () => ({ status: 429, body: JSON.stringify({ type: 'error', error: { type: 'rate_limit_error' } }) }), /answered 429/],
      ['a transport that throws', () => { throw new Error('socket hang up'); }, /could not be reached/]
    ];
    for (const [what, a, expect] of bad) {
      const key = keyOf('neonrun'); forget(key);
      answer = a;
      fresh();
      let res = null, threw = null;
      try { res = await call(payloadFor('neonrun')); } catch (e) { threw = e; }
      ok('a model answer with ' + what + ' is {vibe:null,error} and not a throw',
        !threw && res && res.code === 200 && res.body.vibe === null && expect.test(String(res.body.error)),
        threw ? 'THREW ' + threw.message : (res && res.body && res.body.error));
      ok('  … and nothing was cached for it', !fs.existsSync(cacheFiles(key)[0]), path.basename(cacheFiles(key)[0]));
    }
    answer = () => ({ status: 200, body: JSON.stringify(envelope(recorded.neonrun.vibe)) });
  }

  /* 8 · the input gate ─────────────────────────────────────────────────── */
  {
    fresh();
    const cases = [
      ['no body', { method: 'POST', body: undefined }, 400, /not JSON/],
      ['images that are not an array', { method: 'POST', body: { images: 'one.png' } }, 400, /must be an array/],
      ['no images at all', { method: 'POST', body: { images: [] } }, 400, /no images/],
      ['five images', { method: 'POST', body: { images: fixtures.neonrun.images.concat(fixtures.neonrun.images).slice(0, 5) } }, 400, /at most 4/],
      ['a ZIP called a PNG', { method: 'POST', body: { images: [Buffer.from('PK' + 'x'.repeat(40), 'latin1').toString('base64')] } }, 400, /first bytes/],
      ['a GET', { method: 'GET' }, 405, /POST/]
    ];
    for (const [what, req, code, expect] of cases) {
      const res = fakeRes();
      await vibeApi.handler(req, res);
      ok('the door refuses ' + what + ' with ' + code, res.code === code && res.body.vibe === null && expect.test(String(res.body.error)), res.code + ' ' + (res.body && res.body.error));
    }
    ok('none of the refusals reached the transport', sent.length === 0, sent.length);
  }

  /* 9 · the magic-byte sniff on its own ────────────────────────────────── */
  {
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const jpg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0]);
    const webp = Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WEBP')]);
    const gif = Buffer.from('GIF89a ', 'latin1');
    ok('the sniff reads png, jpeg, webp and gif and refuses a zip',
      vibeApi.mediaType(png) === 'image/png' && vibeApi.mediaType(jpg) === 'image/jpeg' &&
      vibeApi.mediaType(webp) === 'image/webp' && vibeApi.mediaType(gif) === 'image/gif' &&
      vibeApi.mediaType(Buffer.from('PK', 'latin1')) === null);
    const real = Buffer.from(fixtures.pixelfort.images[0], 'base64');
    ok("and it reads the fixtures' own art as png", vibeApi.mediaType(real) === 'image/png');
  }

  vibeApi.__setTransport(null);
  if (hadKey === undefined) delete process.env.ANTHROPIC_API_KEY; else process.env.ANTHROPIC_API_KEY = hadKey;
}

/* ── C · the merge ────────────────────────────────────────────────────── */

function sectionC() {
  console.log('\n── C · the merge, every branch of plan §11 step 5 ────────');

  const RANK = ['pixel', 'cel', 'grunge', 'flat'];   // Style.rank()'s top three plus a fourth
  const H = over => Object.assign({ presets: RANK, pixelSize: 0, fontPairing: 'clean', harmony: 'calm', recipe: 'poster' }, over || {});
  const V = over => Object.assign({ preset: 'cel', alternates: [], fontPairing: 'scifi', harmony: 'loud', motifs: ['gear', 'robot', 'city'], recipe: 'widescreen', confidence: 0.9 }, over || {});

  const rows = [
    ['no judgement at all: the ranking stands',
      H(), null, { preset: 'pixel', alternates: ['cel', 'grunge'], fontPairing: 'clean', harmony: 'calm', motifs: [], recipe: 'poster' }],
    ['a judgement with no preset in it: the ranking stands',
      H(), V({ preset: undefined }), { preset: 'pixel', alternates: ['cel', 'grunge'] }],
    ['a measured pixel grid outranks a confident model',
      H({ pixelSize: 4 }), V({ preset: 'painterly', confidence: 1 }), { preset: 'pixel', alternates: ['painterly', 'cel'] }],
    ['a measured grid when the model agreed: no duplicate in alternates',
      H({ pixelSize: 4 }), V({ preset: 'pixel' }), { preset: 'pixel', alternates: ['cel', 'grunge'] }],
    ['confidence 0.60 and in the top three: the model wins',
      H(), V({ preset: 'grunge', confidence: 0.6 }), { preset: 'grunge', alternates: ['pixel', 'cel'] }],
    ['confidence 0.59 and in the top three: the ranking wins, the model is second',
      H(), V({ preset: 'grunge', confidence: 0.59 }), { preset: 'pixel', alternates: ['grunge', 'cel'] }],
    ['confidence 1 but FOURTH in the ranking: the ranking wins',
      H(), V({ preset: 'flat', confidence: 1 }), { preset: 'pixel', alternates: ['flat', 'cel'] }],
    ['confidence 1 and not in the ranking at all: the ranking wins',
      H(), V({ preset: 'ink-sketch', confidence: 1 }), { preset: 'pixel', alternates: ['ink-sketch', 'cel'] }],
    ['the model agreeing with the ranking\'s first',
      H(), V({ preset: 'pixel' }), { preset: 'pixel', alternates: ['cel', 'grunge'] }],
    ['the font pairing is the model\'s',
      H(), V(), { fontPairing: 'scifi' }],
    ['a missing font pairing falls back to the heuristics\'',
      H(), V({ fontPairing: undefined }), { fontPairing: 'clean' }],
    ['the harmony is the model\'s',
      H(), V(), { harmony: 'loud' }],
    ['a missing harmony falls back to the theme\'s mood',
      H(), V({ harmony: undefined }), { harmony: 'calm' }],
    ['the motifs come through for the tray',
      H(), V(), { motifs: ['gear', 'robot', 'city'] }],
    ['no motifs is an empty list and not undefined',
      H(), V({ motifs: undefined }), { motifs: [] }],
    ['the recipe is overridden at 0.6 and over (Appendix E)',
      H(), V({ confidence: 0.6 }), { recipe: 'widescreen' }],
    ['and not below it',
      H(), V({ confidence: 0.59 }), { recipe: 'poster' }],
    ['Style.rank()\'s own [{preset,score}] shape is taken as readily as plain ids',
      H({ presets: [{ preset: 'pixel', score: 2.3 }, { preset: 'cel', score: 7 }, { preset: 'grunge', score: 7.2 }] }), null,
      { preset: 'pixel', alternates: ['cel', 'grunge'] }]
  ];

  for (const [what, h, v, want] of rows) {
    const got = Vibe.merge(h, v);
    const wrong = Object.keys(want).filter(k => JSON.stringify(got[k]) !== JSON.stringify(want[k]));
    ok('merge: ' + what, wrong.length === 0, wrong.map(k => k + ' = ' + JSON.stringify(got[k]) + ', wanted ' + JSON.stringify(want[k])).join('; '));
  }

  const full = Vibe.merge(H({ pixelSize: 4 }), V({ preset: 'painterly' }));
  ok('merge returns the six keys of the brief plus recipe',
    ['preset', 'alternates', 'fontPairing', 'harmony', 'motifs', 'reasons', 'recipe'].every(k => k in full) && Object.keys(full).length === 7,
    Object.keys(full).join(','));
  ok('reasons is one readable line per decision', Array.isArray(full.reasons) && full.reasons.length === 5 && full.reasons.every(r => typeof r === 'string' && r.length > 20 && /\.$/.test(r)),
    full.reasons.length + ' lines');
  ok('and the preset\'s reason says which branch fired and with what number', /pixel grid of 4 was measured/.test(full.reasons[0]), full.reasons[0]);
  const soft = Vibe.merge(H(), V({ preset: 'grunge', confidence: 0.59 }));
  ok('a model under the line is told so, with the line', /0\.59/.test(soft.reasons[0]) && /0\.6/.test(soft.reasons[0]), soft.reasons[0]);
  ok('CONF_LINE and TOP_N are the plan\'s 0.6 and 3', Vibe.CONF_LINE === 0.6 && Vibe.TOP_N === 3, Vibe.CONF_LINE + ', ' + Vibe.TOP_N);

  // merge() must not chew on the objects it is handed: the Press Table keeps
  // the heuristics and shows the raw judgement beside the merged answer.
  const h = H({ pixelSize: 4 }), v = V({ preset: 'painterly' });
  const hBefore = JSON.stringify(h), vBefore = JSON.stringify(v);
  Vibe.merge(h, v);
  ok('merge changes neither of its arguments', JSON.stringify(h) === hBefore && JSON.stringify(v) === vBefore);
  ok('merge with nothing at all still answers', (() => { const m = Vibe.merge(null, null); return m.preset === 'flat' && Array.isArray(m.reasons); })(), JSON.stringify(Vibe.merge(null, null).preset));
}

/* ── D · no key ───────────────────────────────────────────────────────── */

async function sectionD(written) {
  console.log('\n── D · no key in the environment ─────────────────────────');

  const hadKey = process.env.ANTHROPIC_API_KEY;
  delete process.env.ANTHROPIC_API_KEY;
  let calls = 0;
  vibeApi.__setTransport(async () => { calls++; return { status: 200, body: '{}' }; });

  const key = keyOf('mosslight'); written.add(key); forget(key);
  const res = await call(payloadFor('mosslight'));
  ok('with no key the door answers 200', res.code === 200, res.code);
  ok('with no key the vibe is null and the error says why', res.body.vibe === null && res.body.error === 'no ANTHROPIC_API_KEY', res.body.error);
  ok('with no key nothing is sent anywhere', calls === 0, calls);
  ok('with no key nothing is written to the cache', !fs.existsSync(cacheFiles(key)[0]) && !fs.existsSync(cacheFiles(key)[1]));

  vibeApi.__setTransport(null);
  if (hadKey === undefined) delete process.env.ANTHROPIC_API_KEY; else process.env.ANTHROPIC_API_KEY = hadKey;
}

/* ── E · the real mount, over a socket ────────────────────────────────── */

async function sectionE(written) {
  if (!MOUNT) { console.log('\n── E · skipped (--no-mount) ─────────────────────────────'); return {}; }
  console.log('\n── E · through serve.js\'s real mount ────────────────────');

  /* 1 · the server that is already up on 4322, unstubbed and keyless ───── */
  {
    const key = keyOf('mosslight'); written.add(key); forget(key);
    const got = await Vibe.request(LIVE + DOOR, payloadFor('mosslight'));
    ok('4322 answers the vibe door at all', !!got && 'vibe' in got, JSON.stringify(got).slice(0, 120));
    ok('and with no key in ITS environment it is the no-key answer',
      got && got.vibe === null && got.error === 'no ANTHROPIC_API_KEY', got && got.error);
    ok('nothing was cached by that call', !fs.existsSync(cacheFiles(key)[0]));
  }

  /* 2 · a twin of the same serve.js, with the transport pointed at a stub ─ */
  const seen = [];
  const stub = http.createServer((req, res) => {
    let body = '';
    req.on('data', c => { body += c; });
    req.on('end', () => {
      seen.push({ headers: req.headers, body: JSON.parse(body) });
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify(envelope(recorded.pixelfort.vibe)));
    });
  });
  await new Promise(r => stub.listen(0, '127.0.0.1', r));
  const stubPort = stub.address().port;

  const port = await freePort();
  const child = spawn(process.execPath, [SERVE, String(port)], {
    cwd: SITE,
    env: Object.assign({}, process.env, {
      ANTHROPIC_API_KEY: STUB_KEY,
      ANTHROPIC_BASE_URL: 'http://127.0.0.1:' + stubPort
    }),
    stdio: ['ignore', 'pipe', 'pipe']
  });
  let boot = '';
  child.stdout.on('data', d => { boot += d; });
  child.stderr.on('data', d => { boot += d; });

  let up = false;
  for (let i = 0; i < 60 && !up; i++) {
    try { const r = await fetch('http://127.0.0.1:' + port + '/lab2/test/press/vibe.js'); up = r.ok; } catch (e) { await sleep(100); }
  }
  ok('a second copy of lab2/test/serve.js came up on ' + port, up, boot.split('\n')[0]);

  if (up) {
    const key = keyOf('pixelfort'); written.add(key); forget(key);
    const url = 'http://127.0.0.1:' + port + DOOR;

    const first = await Vibe.request(url, payloadFor('pixelfort'));
    ok('the mount returns a judgement', !!(first && first.vibe), JSON.stringify(first && first.error || '').slice(0, 120));
    ok('it is not cached and it names the model', first && first.cached === false && first.model === vibeApi.MODEL, first && first.model);
    ok('the stub saw exactly one call', seen.length === 1, seen.length);
    ok('the request through the mount is the same request as in process',
      seen.length === 1 && seen[0].body.model === vibeApi.MODEL && seen[0].body.system === APPENDIX_F_SYSTEM &&
      seen[0].body.tool_choice.name === vibeApi.TOOL_NAME && seen[0].headers['x-api-key'] === STUB_KEY,
      seen.length ? seen[0].body.model : '');
    ok('the pixelSize override fired on the far side too',
      first && first.vibe && first.vibe.preset === 'pixel', first && first.vibe && first.vibe.preset);

    const second = await Vibe.request(url, payloadFor('pixelfort'));
    ok('the second POST through the mount is a cache HIT', !!(second && second.cached === true && second.vibe), JSON.stringify(second && second.cached));
    ok('and the stub was not called again', seen.length === 1, seen.length);

    const gate = await Vibe.request(url, { images: ['not-an-image'] });
    ok('a bad payload through the mount is {vibe:null,error} and not a stack trace',
      gate && gate.vibe === null && /first bytes/.test(String(gate.error)), gate && gate.error);

    const dead = await Vibe.request('http://127.0.0.1:1/nowhere', payloadFor('pixelfort'));
    ok('press/vibe.js turns a door that is not there into {vibe:null,error}', dead.vibe === null && /did not answer/.test(String(dead.error)), dead.error);
  }

  return { child, stub };
}

/* ── F · nothing in press/cache/ is a picture ─────────────────────────── */

function sectionF(before) {
  console.log('\n── F · press/cache/ holds no image data ──────────────────');

  const after = snapshot(CACHE);
  const touched = Object.keys(after).filter(n => before[n] !== after[n]);
  ok('this run wrote something to press/cache/ to look at', touched.length > 0, touched.join(', ') || 'nothing — the hygiene check would be vacuous');

  const needles = [];
  for (const name of NAMES) {
    for (const b64 of fixtures[name].images) {
      needles.push({ what: name + ' image, whole', s: b64 });
      needles.push({ what: name + ' image, 96 characters from its middle', s: b64.slice(Math.floor(b64.length / 2), Math.floor(b64.length / 2) + 96) });
    }
  }
  let found = [];
  for (const n of touched) {
    const text = fs.readFileSync(path.join(CACHE, n), 'utf8');
    for (const needle of needles) if (needle.s && text.indexOf(needle.s) >= 0) found.push(n + ' holds ' + needle.what);
  }
  ok('no file this run wrote holds any image data (' + touched.length + ' files against ' + needles.length + ' needles)', found.length === 0, found.join('; '));

  const raws = touched.filter(n => /\.raw\.json$/.test(n));
  ok('a raw log was written for the calls that were made', raws.length > 0, raws.join(', '));
  let good = raws.length > 0;
  for (const n of raws) {
    const log = JSON.parse(fs.readFileSync(path.join(CACHE, n), 'utf8'));
    if (!Array.isArray(log.images) || !log.images.length) { good = false; continue; }
    if (!log.images.every(i => /^[a-f0-9]{64}$/.test(i.sha256) && typeof i.bytes === 'number' && i.bytes > 0 && /^image\//.test(i.media) && !('data' in i))) good = false;
    if (!log.system || !log.stats) good = false;
  }
  ok('and each picture in it is a sha256, a media type and a length — nothing else', good);
}

/* Appendix F's system prompt, typed out again here from the plan and NOT
   imported, so that this test compares two independent copies. If somebody
   edits the prompt in api/vibe.js, this line is what says so. */
const APPENDIX_F_SYSTEM = 'You classify the visual style of video-game marketing art so a page template and a vector sticker set can match it. You will see up to four images (logo, key art, screenshots) and a JSON of measured statistics. Answer only by calling the tool with values from its menus; never invent ids. Prefer the measured `pixelSize` over your own judgement when it is greater than 0. `harmony` is `loud` when the art wants complementary accents and `calm` when analogous ones would sit better. `recipe`: `poster` for portrait key art, `widescreen` for landscape hero art, `scrapbook` for hand-drawn or cozy work. `why` is one sentence.';
