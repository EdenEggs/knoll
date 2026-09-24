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

  // ── proposals: anybody proposes, the owner (or a moderator) decides ─────
  const ow = '0a'.repeat(8), pr = '0b'.repeat(8), th = '0c'.repeat(8), md = '0d'.repeat(8), bn = '0e'.repeat(8), S = {};
  for (const [id, name, role] of [[ow, 'Owner', 'user'], [pr, 'Pal', 'user'], [th, 'Third', 'user'], [md, 'Mod', 'mod'], [bn, 'Banned', 'user']]) {
    await W.db('HSET', W.K.user(id), 'made', '1', 'name', name, 'role', role);
    S[id] = await W.mintSession(id);
  }
  await W.db('HSET', W.K.user(bn), 'banned', '1');
  const by = id => Object.assign(as(S[id]), { 'x-real-ip': '10.9.0.' + id.charCodeAt(1) });
  const P = (body, id) => call('POST', '/api/hill', body, by(id));
  const G = (q, id) => call('GET', '/api/hill?' + q, undefined, by(id));
  const idea = { wall: { items: [{ k: 't', t: 'from a friend', x: 1, y: 2 }] }, plotName: 'Their idea' };
  r = await P({ hill: 'u-' + ow, doc: { wall: { items: [{ k: 's', d: 'M0 0' }] } } }, ow);
  A.strictEqual(r.status, 200, '(the owner saves their yard)');
  r = await P({ op: 'propose', hill: 'u-' + ow, doc: idea, why: 'a note for you' }, pr);
  A.ok(r.status === 200 && r.body.status === 'open', 'somebody else proposes a yard for the owner: ' + JSON.stringify(r.body));
  const p1 = r.body.id;
  r = await P({ op: 'propose', hill: 'u-' + pr, doc: idea }, pr);
  A.deepStrictEqual([r.status, r.body.code], [400, 'yours'], 'one\'s own yard is saved, not proposed to');
  r = await P({ op: 'propose', hill: 'u-' + 'ff'.repeat(8), doc: idea }, pr);
  A.strictEqual(r.status, 404, 'a yard nobody owns takes no proposals');
  r = await P({ op: 'propose', hill: 'u-' + ow, doc: { flatfile: { list: [tracing({ d: '<img src=x onerror=alert(1)>' })] } } }, pr);
  A.deepStrictEqual([r.status, r.body.code], [400, 'doc'], 'a proposed yard is checked as a save is: markup in a tracing is refused');
  r = await P({ op: 'propose', hill: 'u-' + ow }, pr);
  A.deepStrictEqual([r.status, r.body.code], [400, 'empty'], 'a proposal proposes something');
  r = await call('POST', '/api/hill', { op: 'propose', hill: 'u-' + ow, doc: idea }, Object.assign(by(pr), { origin: 'https://evil.example' }));
  A.deepStrictEqual([r.status, r.body.code], [403, 'origin'], 'a proposal posted from another site is refused');
  r = await call('POST', '/api/hill', { op: 'propose', hill: 'u-' + ow, doc: idea }, ORIGIN);
  A.deepStrictEqual([r.status, r.body.code], [401, 'who'], 'a proposal wants somebody signed in');
  r = await P({ op: 'propose', hill: 'u-' + ow, doc: idea }, bn);
  A.deepStrictEqual([r.status, r.body.code], [403, 'banned'], 'a banned account proposes nothing');
  r = await P({ hill: 'u-' + bn, doc: idea }, bn);
  A.deepStrictEqual([r.status, r.body.code], [403, 'banned'], '…and publishes nothing, not even its own yard');

  r = await G('proposals=1&hill=u-' + ow, ow);
  const inbox = r.body.proposals || [];
  A.ok(inbox.length === 1 && inbox[0].id === p1 && inbox[0].name === 'Pal#1' && inbox[0].to.pieces === 1 && inbox[0].doc === undefined && inbox[0].why === 'a note for you',
    'the owner\'s inbox lists it — who, why, how many pieces — without the yard itself: ' + JSON.stringify(inbox));
  r = await G('proposals=1&hill=u-' + ow, th);
  A.deepStrictEqual([r.status, r.body.code], [403, 'theirs'], 'nobody else reads the owner\'s inbox');
  r = await G('proposal=' + p1, th);
  A.strictEqual(r.status, 403, '…nor one of its proposals');
  r = await G('proposal=' + p1, pr);
  A.ok(r.status === 200 && r.body.proposal.doc.plotName === 'Their idea', 'the proposer reads theirs back, yard and all');
  r = await P({ op: 'decide', id: p1, do: 'accept' }, pr);
  A.deepStrictEqual([r.status, r.body.code], [403, 'theirs'], 'the proposer does not decide');
  r = await P({ hill: 'u-' + ow, doc: { wall: { items: [{ k: 's', d: 'M9 9' }] } } }, ow);
  r = await P({ op: 'decide', id: p1, do: 'accept' }, ow);
  A.deepStrictEqual([r.status, r.body.code], [409, 'stale'], 'the owner saved since it was proposed: taking it would lose that save, so it is stale');
  r = await P({ op: 'decide', id: p1, do: 'accept', force: true }, ow);
  A.ok(r.status === 200 && r.body.status === 'accepted' && r.body.t > 0, 'taken anyway (force), it goes up: ' + JSON.stringify(r.body));
  r = await call('GET', '/api/hill?hill=u-' + ow);
  A.ok(r.body.doc.plotName === 'Their idea' && r.body.doc.looks.length === 3, '…as the yard, a version like any other');
  r = await P({ op: 'decide', id: p1, do: 'decline' }, ow);
  A.deepStrictEqual([r.status, r.body.code], [409, 'decided'], 'a decided proposal stays decided');
  A.strictEqual(await W.db('GET', W.K.propDoc(p1)), null, '…and the yard it carried is not kept once it is decided');

  r = await P({ op: 'propose', hill: 'u-' + ow, name: 'Bramble#7' }, pr);
  const p2 = r.body.id;
  r = await P({ op: 'decide', id: p2, do: 'decline', why: 'no thanks' }, ow);
  r = await G('proposal=' + p2, pr);
  A.ok(r.body.proposal.status === 'declined' && r.body.proposal.answer === 'no thanks' && (await W.db('HGET', W.K.user(ow), 'name')) === 'Owner', 'a name proposed and declined: the owner is who they were');
  r = await P({ op: 'propose', hill: 'u-' + ow, name: 'Bramble' }, pr);
  const p3 = r.body.id;
  r = await P({ op: 'decide', id: p3, do: 'accept' }, md);
  A.deepStrictEqual([r.status, r.body.code], [403, 'theirs'], 'not even a moderator takes a change for the owner');
  r = await P({ op: 'decide', id: p3, do: 'accept' }, ow);
  const hist = JSON.parse((await W.db('LRANGE', W.K.names(ow), 0, 0))[0]);
  A.ok(r.status === 200 && hist.name === 'Bramble' && hist.n === 1 && hist.by === pr, 'the owner takes the name: Bramble#1, and who proposed it is written down');
  r = await P({ op: 'propose', hill: 'u-' + ow, name: 'Spam' }, pr);
  r = await P({ op: 'decide', id: r.body.id, do: 'decline' }, md);
  A.ok(r.body.status === 'declined' && JSON.parse((await W.db('LRANGE', W.K.audit, 0, 0))[0]).what === 'proposal', 'a moderator may decline one for the owner, and the moderators\' record says so');
  r = await P({ op: 'propose', hill: 'u-' + ow, name: 'Thistle' }, pr);
  const p4 = r.body.id;
  r = await P({ op: 'decide', id: p4, do: 'withdraw' }, th);
  A.strictEqual(r.status, 403, 'only its proposer withdraws a proposal');
  r = await P({ op: 'decide', id: p4, do: 'withdraw' }, pr);
  A.strictEqual(r.body.status, 'withdrawn', '…who can');
  const out = [];
  for (let i = 0; i < 4; i++) out.push((await P({ op: 'propose', hill: 'u-' + ow, name: 'Idea' + i }, pr)).status);
  A.deepStrictEqual(out, [200, 200, 200, 429], 'three open proposals per gnome, then wait for one of them');
  r = await G('proposals=1&hill=u-' + ow, md);
  A.strictEqual(r.body.proposals.length, 3, 'a moderator reads any inbox');
  await W.db('HSET', W.K.user(md), 'banned', '1');
  r = await G('proposals=1&hill=u-' + ow, md);
  A.strictEqual(r.status, 403, '…and a banned one, none but their own');

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

  // ── the Blob store's PUT, the way Vercel's API (x-api-version 12) wants it (2026-09-24) ──
  // The pathname rides in ?pathname=, not in the URL path — a path got 400 "Invalid
  // pathname" and no yard on Vercel ever saved. Vercel is played by this script.
  {
    process.env.BLOB_READ_WRITE_TOKEN = 'vercel_blob_rw_STOREID_secret';
    const calls = []; const realFetch = global.fetch;
    global.fetch = async (url, init) => {
      calls.push({ url: String(url), init: init || {} });
      const write = !!(init && init.method);                       // reads carry no method and find nothing
      return { ok: write, status: write ? 200 : 404, json: async () => ({ url: String(url) }), text: async () => '' };
    };
    r = await call('POST', '/api/hill', { hill: HILL, doc }, { 'x-knoll-key': 'sesame' });
    A.strictEqual(r.status, 200, 'a publish into Blob goes through: ' + JSON.stringify(r.body).slice(0, 200));
    const puts = calls.filter(c => c.init.method === 'PUT');
    A.strictEqual(puts.length, 2, 'two PUTs: the version, then latest');
    const pu = new URL(puts[0].url);
    A.ok(pu.origin + pu.pathname === 'https://blob.vercel-storage.com/' && /^hills\/yard\/v\/\d+\.json$/.test(pu.searchParams.get('pathname')),
      'the pathname rides in ?pathname= and the URL path is bare: ' + puts[0].url);
    A.strictEqual(new URL(puts[1].url).searchParams.get('pathname'), 'hills/yard/latest.json', '…and latest.json goes the same way');
    const h = puts[0].init.headers;
    A.ok(h.authorization === 'Bearer vercel_blob_rw_STOREID_secret' && h['x-api-version'] === '12' && h['x-vercel-blob-store-id'] === 'STOREID'
      && h['x-vercel-blob-access'] === 'public' && h['x-allow-overwrite'] === '1' && h['x-add-random-suffix'] === '0' && h['x-content-type'] === 'application/json',
      'the headers @vercel/blob sends: token, version, store id, public access, overwrite, no suffix, content type: ' + JSON.stringify(h));
    A.ok(calls.some(c => !c.init.method && c.url === 'https://STOREID.public.blob.vercel-storage.com/hills/yard/latest.json'), 'latest.json is read from the store\'s public URL first');
    global.fetch = realFetch; delete process.env.BLOB_READ_WRITE_TOKEN;
  }

  A.ok(!fs.existsSync(path.join(ROOT, 'u-' + u)) && !fs.existsSync(path.join(ROOT, 'yard', 'looks', 'u-' + u)), 'nothing landed in the site');
  done();
  console.log('verify-hill: ' + n + ' checks, all good');
})().catch(e => { done(); console.error('verify-hill FAILED:', e.message); process.exit(1); });
