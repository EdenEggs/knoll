#!/usr/bin/env node
/* verify-hill.js — the publish door (api/hill.js), driven in-process.

   No server, no socket, no store: the module is required and its handler
   called with a fake request and response, over a temporary folder
   (HILL_ROOT for the hills, WALL_DB for the accounts), so nothing it writes
   lands in the site. What it checks is the part that would lose or leak
   something if it broke: a bad hill name is refused, a doc is cleaned
   (junk pieces and junk plot spots dropped, names clipped) and CHECKED (a
   tracing that is not the tracing table's, a gif off KLIPY, a video with
   markup for a size — each refuses the save), a publish writes latest + a
   version and reports the looks list, a second publish keeps the first as
   history, a version can be read back, with VERCEL set and no key the door
   is shut — and a yard of one's own (u-<id>) takes its owner's session and
   nobody else's.

     node lab2/perf/verify-hill.js
*/
'use strict';
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'knoll-hill-'));
process.env.HILL_ROOT = TMP;
process.env.WALL_DB = path.join(TMP, 'wall-db.json');
delete process.env.BLOB_READ_WRITE_TOKEN;
delete process.env.VERCEL;
delete process.env.KNOLL_OWNER_KEY;
delete process.env.KV_REST_API_URL; delete process.env.UPSTASH_REDIS_REST_URL;
const ROOT = path.join(__dirname, '..', '..');
const hill = require(path.join(ROOT, 'api', 'hill.js'));
const W = require(path.join(ROOT, 'api', 'wall.js'));
const HILL = 'yard', DIR = path.join(TMP, 'yard');
const done = () => fs.rmSync(TMP, { recursive: true, force: true });

let n = 0;
const A = new Proxy(assert, { get: (a, k) => (...args) => { n++; return a[k](...args); } });   // every check counted

function call(method, url, body, headers) {
  return new Promise(resolve => {
    const req = { method, url, headers: Object.assign({ host: 'localhost:4321' }, headers || {}), body };
    const res = { statusCode: 200, headers: {}, setHeader(k, v) { this.headers[k] = v; }, end(s) { resolve({ status: this.statusCode, body: JSON.parse(s) }); } };
    hill(req, res);
  });
}
const PATH = '<path fill-rule="evenodd" fill="#aabbcc" d="M0 0L10 0L10 10Z"/>';
const tracing = extra => Object.assign({ id: 'tr1abcdefg', name: 'a leaf', w: 10, h: 10, d: PATH, colors: 1, paths: 1, at: 1 }, extra || {});

(async () => {
  let r = await call('GET', '/api/hill?hill=../etc');
  A.strictEqual(r.status, 400, 'a hill with a slash in it is refused');
  r = await call('GET', '/api/hill?hill=lab2');
  A.strictEqual(r.status, 400, 'a name that is only a folder of the site is no hill');

  r = await call('GET', '/api/hill?hill=' + HILL + '&ping=1');
  A.deepStrictEqual(r.body, { ok: true, door: true, store: 'file', save: true }, 'the file store answers the ping');

  r = await call('GET', '/api/hill?hill=' + HILL);
  A.strictEqual(r.body.empty, true, 'nothing published yet');

  const doc = {
    wall: { items: [{ k: 's', d: 'M1 1L2 2', when: 5 }, null, 'junk', { d: 'no kind' }] },
    flatfile: { list: [tracing(), { noid: 1 }] },
    plot: { 'the-elder': { x: '20', y: 60 }, 'bad key!': { x: 1, y: 1 }, 'the-pine': { x: 'nope', y: 1 } },
    name: ' Bobby with a very long name indeed ', plotName: 'x'.repeat(50)
  };
  const cleaned = hill.clean(doc);
  A.strictEqual(cleaned.wall.items.length, 1, 'only pieces with a kind survive');
  A.strictEqual(cleaned.wall.items[0].when, 5, "the yard's own `when` is kept");
  A.strictEqual(cleaned.flatfile.list.length, 1, 'only tracings with an id survive');
  A.deepStrictEqual(Object.keys(cleaned.plot), ['the-elder'], 'only sane plot spots survive');
  A.strictEqual(cleaned.plot['the-elder'].x, 20, 'plot numbers are numbers');
  A.strictEqual(cleaned.name, 'Bobby with a very long n', 'the name is clipped to 24 and stripped of control characters');
  A.strictEqual(cleaned.plotName.length, 28, 'the plot name is clipped to 28');

  // what other people's browsers would draw into markup: refused, whole, with the reason
  const refuses = (d, re, what) => A.throws(() => hill.clean(d), re, what);
  refuses({ flatfile: { list: [tracing({ d: '<image href="x" onerror="alert(1)"/>' })] } }, /tracing/, 'a tracing with markup of its own is refused');
  refuses({ flatfile: { list: [tracing({ d: PATH + '<script>alert(1)</script>' })] } }, /tracing/, '…and so is one with a script after the paths');
  refuses({ wall: { items: [{ k: 'v', id: 'dQw4w9WgXcQ', w: '"><svg onload=alert(1)>', h: 9, x: 0, y: 0, z: 90 }] } }, /size/, 'a video whose size is markup is refused');
  refuses({ wall: { items: [{ k: 'v', id: 'not a video', w: 16, h: 9 }] } }, /YouTube/, 'a video that is not a YouTube id is refused');
  refuses({ wall: { items: [{ k: 'g', u: 'https://evil.example/a.gif', w: 1, h: 1 }] } }, /KLIPY/, 'a gif from anywhere but KLIPY is refused');
  refuses({ wall: { items: [{ k: 's', d: { nested: 1 } }] } }, /not a piece/, 'a piece with an object in it is refused');
  refuses({ wall: { items: [{ k: 'x' }] } }, /kind/, 'a kind the wall does not know is refused');
  A.doesNotThrow(() => hill.clean({ wall: { items: [{ k: 'g', u: 'https://static.klipy.com/ii/abc/def.gif', w: 200, h: 150, x: 1, y: 2, z: 90 }, { k: 'v', id: 'dQw4w9WgXcQ', w: 16, h: 9, x: 0, y: 0, z: 90 }] } }),
    'a KLIPY gif and a YouTube video go through');

  r = await call('POST', '/api/hill', { hill: HILL, doc });
  A.strictEqual(r.status, 200, 'the first publish is taken: ' + JSON.stringify(r.body));
  A.strictEqual(r.body.n, 1, 'one piece counted');
  A.strictEqual(r.body.looks.length, 1, 'one look after one save');
  const t1 = r.body.t;
  A.ok(fs.existsSync(path.join(DIR, 'hill.json')), 'hill.json written');
  A.ok(fs.existsSync(path.join(DIR, 'looks', t1 + '.json')), 'the version written');
  r = await call('POST', '/api/hill', { hill: HILL, doc: { flatfile: { list: [tracing({ d: '<img src=x onerror=alert(1)>' })] } } });
  A.strictEqual(r.status, 400, 'a save carrying a bad tracing is a 400, and nothing is written');

  await new Promise(res => setTimeout(res, 3));
  r = await call('POST', '/api/hill', { hill: HILL, doc: { wall: { items: [{ k: 's' }, { k: 't', t: 'hi' }] } } });
  A.strictEqual(r.body.looks.length, 2, 'two looks after two saves');
  A.strictEqual(r.body.looks[1].t, t1, 'the first save is kept as history');
  const t2 = r.body.t;

  r = await call('GET', '/api/hill?hill=' + HILL);
  A.strictEqual(r.body.doc.t, t2, 'latest is the second save');
  A.strictEqual(r.body.doc.wall.items.length, 2);
  r = await call('GET', '/api/hill?hill=' + HILL + '&at=' + t1);
  A.strictEqual(r.body.doc.wall.items.length, 1, 'the first version reads back as it was');
  r = await call('GET', '/api/hill?hill=' + HILL + '&at=12345678901');
  A.strictEqual(r.status, 404, 'a version that never was is a 404');

  // ── a yard of one's own ─────────────────────────────────────────────────
  const u = 'ab12'.repeat(4), v = 'cd34'.repeat(4), ORIGIN = { origin: 'http://localhost:4321' };
  await W.db('HSET', W.K.user(u), 'made', '1', 'name', 'mine', 'role', 'user');
  await W.db('HSET', W.K.user(v), 'made', '1', 'name', 'theirs', 'role', 'user');
  const su = await W.mintSession(u), sv = await W.mintSession(v);
  const as = s => Object.assign({ cookie: 'knoll_s=' + s + '; knoll_in=x' }, ORIGIN);
  r = await call('POST', '/api/hill', { hill: 'u-' + u, doc }, ORIGIN);
  A.deepStrictEqual([r.status, r.body.code], [401, 'who'], 'a yard of one\'s own wants a session — no key will do');
  r = await call('POST', '/api/hill', { hill: 'u-' + u, doc }, as(sv));
  A.deepStrictEqual([r.status, r.body.code], [403, 'theirs'], '…and it wants ITS OWNER\'s session');
  r = await call('POST', '/api/hill', { hill: 'u-' + u, doc }, Object.assign(as(su), { origin: 'https://evil.example' }));
  A.deepStrictEqual([r.status, r.body.code], [403, 'origin'], '…posted from this site, not another');
  r = await call('POST', '/api/hill', { hill: 'u-' + u, doc }, as(su));
  A.strictEqual(r.status, 200, 'the owner of the yard publishes it: ' + JSON.stringify(r.body));
  A.ok(fs.existsSync(path.join(TMP, 'yard', 'looks', 'u-' + u, 'hill.json')), '…kept beside the yard\'s looks, not at the root');
  A.ok(!fs.existsSync(path.join(TMP, 'u-' + u)), '…and nothing at the root');
  r = await call('GET', '/api/hill?hill=u-' + u);
  A.strictEqual(r.body.doc.wall.items.length, 1, 'anybody can open it');
  r = await call('GET', '/api/hill?hill=u-' + v);
  A.strictEqual(r.body.empty, true, 'a yard never saved is empty, not somebody else\'s');
  let last = 0;
  for (let i = 0; i < 30; i++) last = (await call('POST', '/api/hill', { hill: 'u-' + u, doc: { wall: { items: [] } } }, as(su))).status;
  A.strictEqual(last, 429, 'thirty saves an hour, then it waits');
  process.env.KNOLL_OWNER_KEY = 'sesame';
  r = await call('POST', '/api/hill', { hill: 'u-' + v, doc }, as(sv));
  A.strictEqual(r.status, 200, 'the owner\'s key has nothing to do with a yard of one\'s own');
  delete process.env.KNOLL_OWNER_KEY;

  // deployed with no store: shut, and says so
  process.env.VERCEL = '1';
  r = await call('POST', '/api/hill', { hill: HILL, doc });
  A.strictEqual(r.status, 503, 'no store on Vercel refuses a publish');
  r = await call('GET', '/api/hill?hill=' + HILL + '&ping=1');
  A.deepStrictEqual([r.body.store, r.body.save], ['none', false], 'the ping says there is no store');
  delete process.env.VERCEL;

  // the owner's key, when one is set
  process.env.KNOLL_OWNER_KEY = 'sesame';
  r = await call('POST', '/api/hill', { hill: HILL, doc });
  A.strictEqual(r.status, 401, 'a key is wanted once one is set');
  r = await call('POST', '/api/hill', { hill: HILL, doc }, { 'x-knoll-key': 'sesame' });
  A.strictEqual(r.status, 200, 'the right key opens the door');
  r = await call('POST', '/api/hill', { hill: HILL, doc }, { 'x-knoll-key': 'sesamee' });
  A.strictEqual(r.status, 401, 'a wrong key does not');

  A.ok(!fs.existsSync(path.join(ROOT, 'u-' + u)) && !fs.existsSync(path.join(ROOT, 'yard', 'looks', 'u-' + u)), 'nothing landed in the site');
  done();
  console.log('verify-hill: ' + n + ' checks, all good');
})().catch(e => { done(); console.error('verify-hill FAILED:', e.message); process.exit(1); });
