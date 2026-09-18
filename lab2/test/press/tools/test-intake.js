/* ─── TEST-INTAKE ──────────────────────────────────────────────────────────
   Refutes `api/intake.js` — the publisher's door (plan §12) — through the
   REAL mount, and then attacks it. Nothing here is a mock: every POST goes
   over a socket to `http://localhost:4322/_lab2/test/intake`, which is
   `serve.js`'s `mountApi` requiring the same file Vercel would, with the
   same three res helpers and nothing else.

   THREE MOUNTS, and why there have to be three.

   1. THE REAL ONE, 4322. Every POST goes here — the happy path, all ten
      attacks, the rate limit. It is the mount the plan asks for.
   2. A SECOND SERVER, in this process, on a port the OS picks. The owner's
      two doors (`?list=1`, `?token=…`) need `INTAKE_SECRET` in the SERVER's
      environment, and the server on 4322 was started without one (the
      owner's key is not in a test script). So the test sets a random secret
      in its OWN environment and starts a second `test/serve.js` here — the
      same file, the same mount, the same cache folder on disk — and knocks
      on that. The tokens it lists are the ones 4322 wrote, because storage
      is the filesystem. And 4322 is still asked one question about the
      secret, the important one: with no `INTAKE_SECRET` set, does the door
      stay SHUT? (503, never 200. An absent secret is not an open door.)
   3. THE HANDLER ITSELF, called in this process with a fake req/res, for
      exactly one check — the 25 MB cap. THE ARITHMETIC IS THE REASON: 25 MB
      of images is 33.3 MiB of base64, and `serve.js`'s own POST cap is
      `CAP_INTAKE` 32 MB, so a bundle big enough to break the endpoint's
      limit is destroyed by the transport first and the function never sees
      it. The over-the-wire half of that attack is still run and still has
      to be REFUSED — that is what a publisher would meet — and the
      in-process half proves the function's own 413 exists and fires. The
      fake req/res copies `mountApi`'s five lines exactly, and uses
      serve.js's own `query()` so the two cannot drift.

   WHAT IS ASSERTED. A fixture bundle stores and returns a 22-character
   token, the folder on disk holds `bundle.json`, `meta.json` and one file
   per image, the stored bundle's `w`, `h`, `sha256` and `file` are the
   BYTES' values and not the sender's claims, and `expires` is thirty days
   out. Then, each with its own X-Forwarded-For so the rate limiter does not
   confuse them: 13 files; 26 MB; a `.png` that is really a ZIP (magic bytes
   win); a 5000-px image; `rights.attested` false, and missing; a bad slug
   (the schema); a token that is not 22 characters, and one that is but is
   nobody's; the owner's doors with no secret, with a WRONG SECRET OF THE
   SAME LENGTH (a different length would not test the constant-time compare
   at all), and with the right one; eleven posts from one address in an hour
   (the eleventh is 429, and so is a good bundle from that address, because
   the limit is on the address and not on the failures); and two ten-megabyte
   JSON bombs, one wide and one deep, both of which must be ANSWERED — the
   test fails them on a clock, not on a hang.

   AND THE ONE THAT NEEDED A BROWSER. Metadata is not "gone" because a
   `dropped` list says so. A PNG is written here with a `tEXt` comment, a
   `zTXt` and a `tIME`; a JPEG and a WebP are made by Chrome (`toDataURL`),
   and an APP1 EXIF block and a COM go into the one, an EXIF and an XMP
   chunk (with the VP8X flags set to claim them) into the other. All three
   are posted, all three are read back off the disk, and then: the chunk
   names and the words inside them must be absent from the stored bytes,
   the WebP's flags byte must no longer claim metadata it does not have,
   and the PIXELS must be identical — each pair decoded in a Playwright
   canvas, before and after, and compared sample by sample. That is the
   promise `imagebytes.js` makes (it never re-encodes) held to a number
   rather than to a comment.

   EVERY TOKEN THIS TEST WRITES IS DELETED in a finally block, including the
   ones written by a run that failed half way. The folders are under
   `press/cache/intake/`, which is gitignored; the test refuses to delete
   anything whose name is not a 22-character token, so a slip cannot reach a
   real folder.

       node lab2/test/press/tools/test-intake.js            (from site/)
       node lab2/test/press/tools/test-intake.js --node     (skip the browser half)

   The server on 4322 must be up (`node lab2/test/serve.js 4322`). A mounted
   function is required ONCE per server process, so a server left running
   across an edit to `api/intake.js` would answer with the old code: the
   first thing this does is compare the mount's `stamp` with the file's
   mtime and stop with exit 2 if they differ. Exit 1 on any failed check.
   ───────────────────────────────────────────────────────────────────────── */
'use strict';
const fs = require('fs');
const path = require('path');
const http = require('http');
const zlib = require('zlib');
const crypto = require('crypto');

const TEST = path.resolve(__dirname, '..', '..');                 // lab2/test
const API_FILE = path.join(TEST, 'api', 'intake.js');
const OUT = path.join(TEST, 'perf', 'results', 'intake');
const HOST = 'localhost', PORT = 4322, DOOR = '/_lab2/test/intake';
const API = require(API_FILE);
const N = API.NUMBERS;
const SERVE = require(path.join(TEST, 'serve.js'));

/* The secret this run uses, and a wrong one of exactly the same length —
   the only kind of wrong guess that tests a constant-time compare. */
const SECRET = 'knoll-' + crypto.randomBytes(12).toString('hex');
const WRONG = 'wrong-' + crypto.randomBytes(12).toString('hex');
process.env.INTAKE_SECRET = SECRET;

/* One address per attack, so each has its own hour of rate limit and no
   attack can spend another's — and a fresh BLOCK of addresses per run,
   because the limiter lives in the server's memory and the server outlives
   a test run: a fixed address would arrive at the second run with the first
   run's ten posts already spent (it did, on the first full pass). The block
   is in 2001:db8::/32, the range RFC 3849 reserves for documentation, which
   is where a test's invented addresses belong. */
const RUN = crypto.randomBytes(3).toString('hex');
const IP = n => '2001:db8:' + RUN + '::' + n;

let fails = 0;
const results = [];
const sizes = {};
const check = (name, ok, info) => {
  results.push({ name: name, ok: !!ok, info: info === undefined ? '' : String(info) });
  if (!ok) fails++;
  console.log((ok ? 'PASS ' : 'FAIL ') + name + (info !== undefined ? ' — ' + info : ''));
};
const tokens = [];          // every token this run created, for the finally

// ── the wire ──────────────────────────────────────────────────────────────
function request(method, qs, body, headers) {
  return new Promise(resolve => {
    const started = Date.now();
    const req = http.request({
      host: HOST, port: headers && headers.__port ? headers.__port : PORT, method: method,
      path: DOOR + (qs || ''),
      headers: Object.assign({ 'content-length': body ? Buffer.byteLength(body) : 0 }, body ? { 'content-type': 'application/json' } : {},
        Object.fromEntries(Object.entries(headers || {}).filter(([k]) => k !== '__port')))
    }, res => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        const raw = Buffer.concat(chunks);
        let json = null;
        try { json = JSON.parse(raw.toString('utf8')); } catch (e) { json = null; }
        resolve({ status: res.statusCode, headers: res.headers, raw: raw, json: json, ms: Date.now() - started });
      });
    });
    /* A socket the server destroyed (the body cap) arrives here, not as a
       status: it is an answer too, and the test says which kind it got. */
    req.on('error', e => resolve({ status: 0, error: (e && e.code) || String(e), json: null, raw: Buffer.alloc(0), ms: Date.now() - started }));
    if (body) req.write(body);
    req.end();
  });
}
const post = (bundle, images, ip, port) =>
  request('POST', '', JSON.stringify({ bundle: bundle, images: images }), Object.assign({ 'x-forwarded-for': ip }, port ? { __port: port } : {}));
const postRaw = (text, ip, port) => request('POST', '', text, Object.assign({ 'x-forwarded-for': ip }, port ? { __port: port } : {}));
const get = (qs, headers, port) => request('GET', qs, null, Object.assign({}, headers || {}, port ? { __port: port } : {}));
const withSecret = s => ({ 'x-intake-secret': s });

// ── pictures, written here ────────────────────────────────────────────────
const PNG_SIG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
function chunk(name, payload) {
  const b = Buffer.alloc(8 + payload.length + 4);
  b.writeUInt32BE(payload.length, 0);
  b.write(name, 4, 'latin1');
  payload.copy(b, 8);
  b.writeUInt32BE(zlib.crc32(b.subarray(4, 8 + payload.length)) >>> 0, 8 + payload.length);
  return b;
}
/* An 8-bit RGB PNG, no filtering, written the way make-fixtures.js writes
   one. `level` 0 for the big ones: a 2000 × 1000 field of noise deflated
   properly would take a second and still be six megabytes, and the point of
   those files is their SIZE, not their contents. */
function pngBytes(w, h, pixel, extra, level) {
  const stride = w * 3 + 1;
  const raw = Buffer.alloc(stride * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const p = pixel(x, y), o = y * stride + 1 + x * 3;
      raw[o] = p[0]; raw[o + 1] = p[1]; raw[o + 2] = p[2];
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 2;                            // 8-bit, colour type 2 (RGB)
  return Buffer.concat([PNG_SIG, chunk('IHDR', ihdr)]
    .concat(extra || [])
    .concat([chunk('IDAT', zlib.deflateSync(raw, { level: level === undefined ? 6 : level })), chunk('IEND', Buffer.alloc(0))]));
}
/* A deterministic little picture: bands and a block, so a pixel comparison
   has something to disagree about. */
const PATTERN = (x, y) => [(x * 4) & 255, (y * 5) & 255, ((x ^ y) * 3) & 255];
const sha = b => crypto.createHash('sha256').update(b).digest('hex');
const tiny = () => pngBytes(16, 16, PATTERN);

// ── bundles ───────────────────────────────────────────────────────────────
function manifestFor(list, over) {
  return Object.assign({
    slug: 'intake-fixture',
    title: 'Intake Fixture',
    tagline: 'a bundle written by test-intake.js',
    developer: 'The Sandbox',
    platforms: ['pc'],
    genres: ['puzzle'],
    links: { site: 'https://knoll.space/' },
    assets: list.map(a => ({
      id: a.id, role: a.role || 'screenshot', file: 'art/' + a.id + '.png',
      w: a.w, h: a.h, alpha: false, sha256: sha(a.buf)
    })),
    rights: { attested: true, by: 'test-intake.js', at: new Date().toISOString() },
    source: 'intake'
  }, over || {});
}
const imagesOf = list => Object.fromEntries(list.map(a => [a.id, a.buf.toString('base64')]));

// ── the in-process handler, mounted the way serve.js mounts it ────────────
/* serve.js's mountApi, its five lines: a parsed body, the query through
   serve.js's own `query()`, and status/json/send on the response. Nothing
   else is provided, because nothing else exists there. */
function direct(method, url, bodyObj, headers) {
  return new Promise(resolve => {
    /* No `rawBody`: the one thing this call is for is the endpoint's own
       cap on the DECODED images, and a rawBody would let the body cap
       answer first and look like the same pass. The wire covers the body
       cap — that is what dropped the socket. */
    const req = {
      method: method, url: url, headers: headers || {},
      socket: { remoteAddress: '127.0.0.1' },
      body: bodyObj, rawBody: undefined,
      query: SERVE.query(url)
    };
    const res = {
      statusCode: 200, headersSent: false, _headers: {},
      setHeader(k, v) { this._headers[k] = v; },
      status(c) { this.statusCode = c; return this; },
      json(o) { resolve({ status: this.statusCode, json: o }); return this; },
      send(o) { return this.json(o); }
    };
    Promise.resolve().then(() => API.handler(req, res)).catch(e => resolve({ status: 500, json: { ok: false, error: String((e && e.message) || e) } }));
  });
}

// ── the run ───────────────────────────────────────────────────────────────
(async function run() {
  let server = null;
  try {
    // 0 · the mount is up, and it is running THIS file
    const usage = await get('');
    if (usage.status === 0) {
      console.log('the sandbox server is not answering on ' + PORT + ' — start it with:  node lab2/test/serve.js 4322');
      process.exit(2);
    }
    check('GET with no question is the usage line', usage.status === 400 && usage.json && usage.json.code === 'usage', usage.status + ' ' + (usage.json && usage.json.error));
    const mtime = Math.round(fs.statSync(API_FILE).mtimeMs);
    if (!usage.json || usage.json.stamp !== mtime) {
      console.log('\nthe server on ' + PORT + ' has an OLDER api/intake.js required into it (stamp ' +
        (usage.json && usage.json.stamp) + ', file ' + mtime + ').');
      console.log('a mounted function is required once per server process — restart it:  node lab2/test/serve.js 4322');
      process.exit(2);
    }
    check('the mount is running the file on disk', true, 'stamp ' + mtime);

    // the second server, with the secret, for the owner's doors
    server = SERVE.listen(0, true);
    await new Promise(r => server.once('listening', r));
    const own = server.address().port;
    check('a second mount is up for the owner\'s doors', own > 0, 'port ' + own + ', INTAKE_SECRET set in this process');

    // ── 1 · the happy path ────────────────────────────────────────────────
    const art = [
      { id: 'logo', role: 'logo', buf: pngBytes(64, 48, PATTERN), w: 64, h: 48 },
      { id: 'hero', role: 'hero', buf: pngBytes(96, 54, PATTERN), w: 96, h: 54 },
      { id: 'shot-1', role: 'screenshot', buf: pngBytes(80, 45, PATTERN), w: 80, h: 45 }
    ];
    /* One asset lies about itself — wrong size, wrong name, wrong hash — to
       prove the endpoint believes the bytes and not the sender. */
    const man = manifestFor(art);
    man.assets[2].w = 9999; man.assets[2].h = 1; man.assets[2].file = 'art/wrong.png'; man.assets[2].sha256 = '0'.repeat(64);
    const posted = art.reduce((n, a) => n + a.buf.length, 0);
    const r1 = await post(man, imagesOf(art), IP(1));
    check('a good bundle is accepted', r1.status === 200 && r1.json && r1.json.ok === true, r1.status + ' ' + JSON.stringify(r1.json && r1.json.error || ''));
    const token = r1.json && r1.json.token;
    if (token) tokens.push(token);
    check('the token is ' + N.TOKEN_CHARS + ' base64url characters', !!token && token.length === N.TOKEN_CHARS && API.TOKEN_RE.test(token), token);
    check('the reply counts the files', r1.json && r1.json.files === art.length, r1.json && r1.json.files);
    sizes.happy = { postedBytes: posted, storedBytes: r1.json && r1.json.bytes, files: art.length };

    const dir = path.join(API.LOCAL_ROOT, String(token));
    check('the folder is on disk', fs.existsSync(dir), dir.replace(/\\/g, '/'));
    check('bundle.json and meta.json are in it', fs.existsSync(path.join(dir, 'bundle.json')) && fs.existsSync(path.join(dir, 'meta.json')));
    const stored = JSON.parse(fs.readFileSync(path.join(dir, 'bundle.json'), 'utf8'));
    const meta = JSON.parse(fs.readFileSync(path.join(dir, 'meta.json'), 'utf8'));
    check('one file per image was written', art.every(a => fs.existsSync(path.join(dir, 'art', a.id + '.png'))), fs.readdirSync(path.join(dir, 'art')).join(' '));
    const onDisk = fs.readFileSync(path.join(dir, 'art', 'shot-1.png'));
    check('the lying asset was corrected from the bytes', stored.assets[2].w === 80 && stored.assets[2].h === 45 &&
      stored.assets[2].file === 'art/shot-1.png' && stored.assets[2].sha256 === sha(onDisk),
      stored.assets[2].w + '×' + stored.assets[2].h + ' ' + stored.assets[2].file);
    check('the reply said so in a note', Array.isArray(r1.json.notes) && r1.json.notes.some(s => /wrong\.png/.test(s)), (r1.json.notes || []).join(' | '));
    check('the stored bundle is marked source: intake', stored.source === 'intake', stored.source);
    check('meta.json expires ' + N.RETENTION_DAYS + ' days after it arrived',
      Math.abs(Date.parse(meta.expires) - Date.parse(meta.at) - N.RETENTION_DAYS * 864e5) < 1000,
      meta.at + ' → ' + meta.expires);
    check('the submitter is stored as a 12-hex digest of the address, not the address',
      meta.from === crypto.createHash('sha256').update(IP(1)).digest('hex').slice(0, 12) && (meta.from || '').indexOf(':') < 0,
      meta.from + ' for ' + IP(1));
    check('the reply\'s byte count is what is on disk',
      r1.json.bytes === art.reduce((n, a) => n + fs.statSync(path.join(dir, 'art', a.id + '.png')).size, 0), r1.json.bytes);

    /* The /build wrapper shape, {manifest:{…}}, is accepted too. */
    const r1b = await post({ manifest: manifestFor([art[0]]) }, imagesOf([art[0]]), IP(2));
    check('a { manifest: … } wrapper is accepted', r1b.status === 200 && r1b.json.ok === true, r1b.status);
    if (r1b.json && r1b.json.token) tokens.push(r1b.json.token);

    // ── 2 · thirteen files ────────────────────────────────────────────────
    const many = [];
    for (let i = 0; i < N.MAX_FILES + 1; i++) many.push({ id: 'shot-' + i, role: 'screenshot', buf: tiny(), w: 16, h: 16 });
    const r2 = await post(manifestFor(many), imagesOf(many), IP(3));
    check(N.MAX_FILES + 1 + ' files are refused', r2.status === 413 && r2.json.code === 'too-many-files', r2.status + ' ' + (r2.json && r2.json.code));

    // ── 3 · twenty-six megabytes, both ways ───────────────────────────────
    /* Five images of about 5.4 MB each. Level 0 so the deflate is a copy:
       the file has to be big, not interesting. */
    const big = [];
    for (let i = 0; i < 5; i++) big.push({ id: 'big-' + i, role: 'screenshot', buf: pngBytes(1800, 1000, (x, y) => [x & 255, y & 255, (x + y + i) & 255], null, 0), w: 1800, h: 1000 });
    const bigBytes = big.reduce((n, a) => n + a.buf.length, 0);
    const bigImages = imagesOf(big);
    const bigBody = JSON.stringify({ bundle: manifestFor(big), images: bigImages });
    sizes.oversize = { images: bigBytes, body: Buffer.byteLength(bigBody), capIntake: SERVE.CAP_INTAKE, limit: N.MAX_TOTAL_BYTES };
    const r3 = await postRaw(bigBody, IP(4));
    check(Math.round(bigBytes / 1048576) + ' MB of images is refused over the wire',
      r3.status === 0 || (r3.status >= 400 && r3.json && (r3.json.code === 'too-many-bytes')),
      r3.status === 0 ? 'the socket was dropped (' + r3.error + ') — the mount\'s own CAP_INTAKE (' + SERVE.CAP_INTAKE +
        ' B) fired first, on a ' + Buffer.byteLength(bigBody) + ' B body carrying ' + bigBytes + ' B of images'
        : r3.status + ' ' + (r3.json && r3.json.code));
    const r3b = await direct('POST', '/intake', { bundle: manifestFor(big), images: bigImages }, { 'x-forwarded-for': IP(5) });
    check('and the function itself answers 413 on the IMAGES in-process',
      r3b.status === 413 && r3b.json.code === 'too-many-bytes' && /of images/.test(r3b.json.error || ''),
      r3b.status + ' ' + (r3b.json && r3b.json.code) + ' — ' + (r3b.json && r3b.json.error));

    // ── 4 · a ZIP wearing .png ────────────────────────────────────────────
    const zip = Buffer.concat([Buffer.from([0x50, 0x4b, 0x03, 0x04]), crypto.randomBytes(400)]);
    const r4 = await post(manifestFor([{ id: 'logo', role: 'logo', buf: zip, w: 16, h: 16 }]), { logo: zip.toString('base64') }, IP(6));
    check('a ZIP named .png is refused by its magic bytes', r4.status === 415 && r4.json.code === 'not-an-image', r4.status + ' ' + (r4.json && r4.json.code));

    // ── 5 · five thousand pixels ──────────────────────────────────────────
    const wide = pngBytes(5000, 8, (x, y) => [x & 255, y & 255, 0], null, 0);
    const r5 = await post(manifestFor([{ id: 'hero', role: 'hero', buf: wide, w: 5000, h: 8 }]), { hero: wide.toString('base64') }, IP(7));
    check('a 5000-px long edge is refused', r5.status === 413 && r5.json.code === 'long-edge', r5.status + ' ' + (r5.json && r5.json.error));

    // ── 6 · the rights attestation ────────────────────────────────────────
    const one = [{ id: 'logo', role: 'logo', buf: tiny(), w: 16, h: 16 }];
    const noRights = manifestFor(one); noRights.rights.attested = false;
    const r6 = await post(noRights, imagesOf(one), IP(8));
    check('rights.attested false is refused', r6.status === 403 && r6.json.code === 'rights', r6.status + ' ' + (r6.json && r6.json.code));
    const goneRights = manifestFor(one); delete goneRights.rights;
    const r6b = await post(goneRights, imagesOf(one), IP(9));
    check('no rights at all is refused', r6b.status === 403 && r6b.json.code === 'rights', r6b.status + ' ' + (r6b.json && r6b.json.code));

    // ── 7 · the schema still runs on the words ────────────────────────────
    const badSlug = manifestFor(one); badSlug.slug = 'Not A Slug!';
    const r7 = await post(badSlug, imagesOf(one), IP(10));
    check('a bad slug is caught by manifest.schema.json', r7.status === 400 && r7.json.code === 'schema' && (r7.json.errors || []).some(e => e.path === 'slug'),
      JSON.stringify((r7.json && r7.json.errors || [])[0] || {}));

    // ── 8 · the owner's doors ─────────────────────────────────────────────
    const noSecretHere = await get('?list=1');
    check('with no INTAKE_SECRET in its environment the door stays shut', noSecretHere.status === 503 && noSecretHere.json.code === 'no-secret',
      noSecretHere.status + ' on ' + PORT + ' — never 200');
    const l0 = await get('?list=1', {}, own);
    check('?list=1 with no secret is 401', l0.status === 401 && l0.json.code === 'unauthorized', l0.status);
    const l1 = await get('?list=1', withSecret(WRONG), own);
    check('?list=1 with a wrong secret of the same length is 401', l1.status === 401 && WRONG.length === SECRET.length, l1.status + ', both ' + SECRET.length + ' characters');
    const l2 = await get('?list=1', withSecret(SECRET), own);
    const row = l2.json && (l2.json.intakes || []).find(x => x.token === token);
    check('?list=1 with the secret lists this run\'s token with its title, date and size',
      l2.status === 200 && !!row && row.title === 'Intake Fixture' && row.bytes === r1.json.bytes && !!Date.parse(row.date) && !row.expired,
      row ? row.title + ', ' + row.date + ', ' + row.bytes + ' B, expires ' + row.expires : 'not listed');

    const f0 = await get('?token=' + token, {}, own);
    check('?token=… with no secret is 401', f0.status === 401 && f0.json.code === 'unauthorized', f0.status);
    const f1 = await get('?token=' + token, withSecret(WRONG), own);
    check('?token=… with a wrong secret of the same length is 401', f1.status === 401, f1.status);
    const f2 = await get('?token=' + token, withSecret(SECRET), own);
    check('?token=… with the secret returns the bundle and its images',
      f2.status === 200 && f2.json.bundle && f2.json.bundle.slug === 'intake-fixture' && Object.keys(f2.json.images || {}).length === art.length,
      f2.status + ', ' + Object.keys((f2.json && f2.json.images) || {}).join(' '));
    check('the images it returns are the bytes on disk',
      f2.json && f2.json.images && f2.json.images['shot-1'] === onDisk.toString('base64'));
    const f3 = await get('?token=abc', withSecret(SECRET), own);
    check('a token that is not ' + N.TOKEN_CHARS + ' characters is refused before any file is touched',
      f3.status === 400 && f3.json.code === 'bad-token', f3.status + ' ' + (f3.json && f3.json.error));
    const f4 = await get('?token=' + 'a'.repeat(N.TOKEN_CHARS), withSecret(SECRET), own);
    check('a well-formed token that is nobody\'s is 404', f4.status === 404 && f4.json.code === 'no-such-token', f4.status);

    // ── 9 · eleven posts in an hour ───────────────────────────────────────
    const floodIp = IP(20);
    const flood = [];
    for (let i = 0; i < N.RATE_LIMIT + 1; i++) flood.push(await postRaw('{"bundle":{},"images":{}}', floodIp));
    const first = flood.slice(0, N.RATE_LIMIT), last = flood[N.RATE_LIMIT];
    check('the first ' + N.RATE_LIMIT + ' posts from one address are answered', first.every(r => r.status >= 400 && r.status !== 429),
      first.map(r => r.status).join(' '));
    check('the ' + (N.RATE_LIMIT + 1) + 'th is 429', last.status === 429 && last.json.code === 'rate', last.status + ' ' + (last.json && last.json.error));
    check('and it carries a retry-after', !!last.headers['retry-after'], last.headers['retry-after'] + ' s');
    const good = await post(manifestFor(one), imagesOf(one), floodIp);
    if (good.json && good.json.token) tokens.push(good.json.token);
    check('a GOOD bundle from that address is 429 too (the limit is on the address)', good.status === 429, good.status);

    // ── 10 · two JSON bombs ───────────────────────────────────────────────
    const wideBomb = '{"bundle":{"a":[' + '0,'.repeat(5000000) + '0]},"images":{}}';
    const b1 = await postRaw(wideBomb, IP(21));
    check(Math.round(wideBomb.length / 1048576) + ' MB of nested arrays is answered, not hung',
      b1.status >= 400 && b1.ms < 5000, b1.status + ' ' + (b1.json && b1.json.code) + ' in ' + b1.ms + ' ms');
    const deepBomb = '{"bundle":' + '['.repeat(50000) + ']'.repeat(50000) + ',"images":{}}';
    const b2 = await postRaw(deepBomb, IP(22));
    check('50 000 levels of nesting is answered, not hung',
      b2.status >= 400 && b2.ms < 5000, b2.status + ' ' + (b2.json && b2.json.code) + ' in ' + b2.ms + ' ms');
    sizes.bombs = { wide: wideBomb.length, wideMs: b1.ms, deep: deepBomb.length, deepMs: b2.ms };

    // ── 11 · the metadata, and the pixels ─────────────────────────────────
    if (process.argv.indexOf('--node') >= 0) {
      console.log('\n(--node: the browser half is skipped, so the pixel comparison did not run)');
    } else {
      await metadataHalf(art);
    }
  } catch (e) {
    check('the run finished without throwing', false, (e && e.stack) || String(e));
  } finally {
    /* Every token this run wrote, gone — and nothing else can be: the name
       has to be a token before rm is called on it. */
    let removed = 0;
    for (const t of tokens) {
      if (!API.TOKEN_RE.test(String(t))) { check('refused to delete a name that is not a token', false, t); continue; }
      const d = path.join(API.LOCAL_ROOT, t);
      try { fs.rmSync(d, { recursive: true, force: true }); if (!fs.existsSync(d)) removed++; } catch (e) { /* reported below */ }
    }
    check('every token this run wrote was deleted', removed === tokens.length, removed + ' of ' + tokens.length);
    if (server) server.close();
    finish();
  }
})();

// ── the browser half ──────────────────────────────────────────────────────
/* Chrome makes the JPEG (nothing here can encode one), Chrome decodes both
   copies of both pictures, and the comparison is over the samples. */
async function metadataHalf(art) {
  const { chromium } = require('playwright');
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage();
  try {
    const made = await page.evaluate(() => {
      const c = document.createElement('canvas'); c.width = 320; c.height = 200;
      const g = c.getContext('2d');
      const grd = g.createLinearGradient(0, 0, 320, 200);
      grd.addColorStop(0, '#c93b82'); grd.addColorStop(1, '#5871f5');
      g.fillStyle = grd; g.fillRect(0, 0, 320, 200);
      g.fillStyle = '#26212a'; g.fillRect(40, 40, 100, 60);
      return { jpeg: c.toDataURL('image/jpeg', 0.9).split(',')[1], webp: c.toDataURL('image/webp', 0.9).split(',')[1] };
    });
    const jpegClean = Buffer.from(made.jpeg, 'base64');
    const webpClean = Buffer.from(made.webp, 'base64');

    /* An APP1 EXIF block (the identifier, a little-endian TIFF header and a
       block of filler) and a COM, spliced in after the SOI where a camera
       would have put them. */
    const seg = (marker, payload) => {
      const b = Buffer.alloc(4 + payload.length);
      b[0] = 0xff; b[1] = marker; b.writeUInt16BE(payload.length + 2, 2); payload.copy(b, 4);
      return b;
    };
    const exif = seg(0xe1, Buffer.concat([Buffer.from('Exif\u0000\u0000', 'latin1'), Buffer.from('II*\u0000', 'latin1'), Buffer.alloc(240, 0x41)]));
    const com = seg(0xfe, Buffer.from('taken on a phone belonging to a person'));
    const jpegDirty = Buffer.concat([jpegClean.subarray(0, 2), exif, com, jpegClean.subarray(2)]);

    /* A PNG with a tEXt, a zTXt and a tIME. */
    const pngClean = pngBytes(64, 48, PATTERN);
    const text = chunk('tEXt', Buffer.from('Comment\u0000a comment nobody asked for', 'latin1'));
    const ztxt = chunk('zTXt', Buffer.concat([Buffer.from('Software\u0000\u0000', 'latin1'), zlib.deflateSync(Buffer.from('a camera, and its serial number'))]));
    const time = chunk('tIME', Buffer.from([0x07, 0xe8, 1, 2, 3, 4, 5]));
    const pngDirty = Buffer.concat([pngClean.subarray(0, 8 + 25), text, ztxt, time, pngClean.subarray(8 + 25)]);

    /* And a WebP with EXIF and XMP chunks appended to its RIFF, with the
       VP8X flags told to expect them (0x08 EXIF, 0x04 XMP) — a container
       that still advertised metadata it no longer held would be the bug
       this catches. Chrome's own WebP begins with a VP8X and an ICCP, so
       byte 20 is its flags byte. */
    const riff = (cc, payload) => {
      const h = Buffer.alloc(8); h.write(cc, 0, 'latin1'); h.writeUInt32LE(payload.length, 4);
      return Buffer.concat([h, payload, payload.length & 1 ? Buffer.from([0]) : Buffer.alloc(0)]);
    };
    const webpDirty = Buffer.concat([webpClean, riff('EXIF', Buffer.alloc(101, 0x45)), riff('XMP ', Buffer.from('<x:xmpmeta>a name and a place</x:xmpmeta>'))]);
    webpDirty.writeUInt32LE(webpDirty.length - 8, 4);
    webpDirty[20] |= 0x0c;

    const pair = [
      { id: 'logo', role: 'logo', buf: pngDirty, w: 64, h: 48, ext: 'png', clean: pngClean, mime: 'image/png', gone: ['tEXt', 'zTXt', 'tIME'] },
      { id: 'hero', role: 'hero', buf: jpegDirty, w: 320, h: 200, ext: 'jpg', clean: jpegClean, mime: 'image/jpeg', gone: ['Exif', 'taken on a phone'] },
      { id: 'shot-1', role: 'screenshot', buf: webpDirty, w: 320, h: 200, ext: 'webp', clean: webpClean, mime: 'image/webp', gone: ['EXIF', 'xmpmeta', 'a name and a place'] }
    ];
    const man = manifestFor(pair);
    man.assets[1].file = 'art/hero.png';                 // the sender's guess; the bytes say jpeg
    const r = await post(man, imagesOf(pair), IP(30));
    check('the bundle with metadata in it is accepted', r.status === 200 && r.json.ok === true, r.status + ' ' + JSON.stringify((r.json && r.json.error) || ''));
    if (!r.json || !r.json.token) return;
    tokens.push(r.json.token);
    const dir = path.join(API.LOCAL_ROOT, r.json.token);
    check('the JPEG is stored as .jpg and noted for the owner',
      fs.existsSync(path.join(dir, 'art', 'hero.jpg')) && (r.json.notes || []).some(s => /JPEG/.test(s)), (r.json.notes || []).join(' | '));
    sizes.metadata = { postedBytes: pair.reduce((n, a) => n + a.buf.length, 0), storedBytes: r.json.bytes, stripped: r.json.stripped };

    /* From the start-of-scan to the end of the file is the entropy-coded
       picture itself; comparing that is how a JPEG says "the pixels are
       the same bytes" without trusting the stripper's own code. (The clean
       JPEG that came out of Chrome carries an APP2 ICC profile, which the
       strip also drops, so the two files are NOT equal end to end — only
       the picture in them is.) */
    const scanOf = b => { const i = b.indexOf(Buffer.from([0xff, 0xda])); return i < 0 ? Buffer.alloc(0) : b.subarray(i); };
    const shots = [];
    for (const p of pair) {
      const back = fs.readFileSync(path.join(dir, 'art', p.id + '.' + p.ext));
      for (const g of p.gone) check(p.ext.toUpperCase() + ': "' + g + '" is gone from the stored bytes', back.indexOf(Buffer.from(g, 'latin1')) < 0,
        back.length + ' B stored, ' + p.buf.length + ' B posted');
      if (p.ext === 'png') {
        check('PNG: the stored file is the picture as it was written here, byte for byte',
          back.equals(p.clean), back.length + ' vs ' + p.clean.length);
      } else if (p.ext === 'webp') {
        check('WebP: the stored file is Chrome\'s own picture again, byte for byte',
          back.equals(p.clean), back.length + ' vs ' + p.clean.length);
        check('WebP: the VP8X flags no longer claim EXIF or XMP', (back[20] & 0x0c) === 0,
          '0x' + back[20].toString(16) + ' (was 0x' + p.buf[20].toString(16) + ')');
      } else {
        check('JPEG: no APP1 segment survives', back.indexOf(Buffer.from([0xff, 0xe1])) < 0);
        check('JPEG: the scan data is byte-identical to the picture before the metadata went in',
          scanOf(back).length > 0 && scanOf(back).equals(scanOf(p.clean)), scanOf(back).length + ' B of scan');
      }
      shots.push({ id: p.id, mime: p.mime, before: p.buf.toString('base64'), after: back.toString('base64') });
    }

    const same = await page.evaluate(async list => {
      const load = async (mime, b64) => {
        const im = new Image();
        im.src = 'data:' + mime + ';base64,' + b64;
        await im.decode();
        const c = document.createElement('canvas');
        c.width = im.naturalWidth; c.height = im.naturalHeight;
        const g = c.getContext('2d', { willReadFrequently: true });
        g.drawImage(im, 0, 0);
        return { w: c.width, h: c.height, data: g.getImageData(0, 0, c.width, c.height).data };
      };
      const out = [];
      for (const s of list) {
        const A = await load(s.mime, s.before), B = await load(s.mime, s.after);
        let differ = 0, max = 0;
        const n = Math.min(A.data.length, B.data.length);
        for (let i = 0; i < n; i++) { const d = Math.abs(A.data[i] - B.data[i]); if (d) { differ++; if (d > max) max = d; } }
        out.push({ id: s.id, w: A.w, h: A.h, sameSize: A.w === B.w && A.h === B.h, samples: A.data.length, differ: differ, max: max });
      }
      return out;
    }, shots);
    for (const s of same) {
      check(s.id + ': the pixels are unchanged by the strip', s.sameSize && s.differ === 0 && s.samples > 0,
        s.w + '×' + s.h + ', ' + s.samples + ' samples, ' + s.differ + ' differ (max ' + s.max + ')');
    }
    sizes.pixels = same;
  } finally {
    await browser.close();
  }
}

function finish() {
  const n = results.length;
  try {
    fs.mkdirSync(OUT, { recursive: true });
    fs.writeFileSync(path.join(OUT, 'summary.json'), JSON.stringify({
      date: new Date().toISOString(), door: 'http://' + HOST + ':' + PORT + DOOR,
      numbers: N, sizes: sizes, tokens: tokens.length, results: results
    }, null, 2));
  } catch (e) { console.log('  (could not write ' + OUT + ': ' + ((e && e.message) || e) + ')'); }
  console.log('\nsizes: ' + JSON.stringify(sizes));
  console.log((n - fails) + '/' + n + ' checks pass' + (fails ? ', ' + fails + ' FAIL' : '') + ' — ' + tokens.length + ' tokens written and deleted');
  process.exit(fails ? 1 : 0);
}
