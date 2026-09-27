#!/usr/bin/env node
/* verify-bell.js — what rings the bell since 2026-09-27, across the doors
   that ring it, driven in-process over a throwaway store the way
   verify-chaos.js is. Three gnomes sign up through the gate: Mossy makes a
   space and invites Juno to keep it; Bram is a stranger. Then: an edit
   waiting for a look (api/wall.js), a thread and a reply (api/board.js), a
   photo and a heart (api/gallery.js) — who hears of each, that a place says
   a thing once while it is unread (tellOnce) and again once it has been
   read, and what the friends' door says of the bell and the fence
   (api/friends.js: noted, hearts, op seen). The yard's proposals ring it too:
   verify-hill.js has those.

     node lab2/perf/verify-bell.js
*/
'use strict';
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'knoll-bell-'));
process.env.WALL_DB = path.join(TMP, 'wall-db.json');
process.env.HILL_ROOT = TMP;
delete process.env.KV_REST_API_URL; delete process.env.UPSTASH_REDIS_REST_URL; delete process.env.VERCEL; delete process.env.BLOB_READ_WRITE_TOKEN; delete process.env.RESEND_API_KEY;
const ROOT = path.join(__dirname, '..', '..');
const auth = require(path.join(ROOT, 'api', 'auth.js'));
const wall = require(path.join(ROOT, 'api', 'wall.js'));
const friends = require(path.join(ROOT, 'api', 'friends.js'));
const board = require(path.join(ROOT, 'api', 'board.js'));
const gallery = require(path.join(ROOT, 'api', 'gallery.js'));
const done = () => fs.rmSync(TMP, { recursive: true, force: true });

let n = 0;
const A = new Proxy(assert, { get: (a, k) => (...args) => { n++; return a[k](...args); } });

const HERE = 'http://localhost:4321';
let ipN = 0;
function call(fn, method, url, body, headers) {
  return new Promise(resolve => {
    const h = Object.assign({ host: 'localhost:4321', 'x-real-ip': '10.2.2.2' }, method === 'POST' ? { origin: HERE, 'content-type': 'application/json' } : {}, headers || {});
    const req = { method, url, headers: h, body: method === 'POST' ? body : undefined, socket: { remoteAddress: '127.0.0.1' } };
    const res = { statusCode: 200, headers: {}, setHeader(k, v) { this.headers[k.toLowerCase()] = v; },
                  end(s) { let json = {}; try { json = JSON.parse(s); } catch (e) {} resolve({ status: this.statusCode, json, cookies: [].concat(this.headers['set-cookie'] || []) }); } };
    fn(req, res).catch(e => resolve({ status: 599, json: { error: String(e && e.stack || e) }, cookies: [] }));
  });
}
const { codeIn } = require('./gnome.js');
const G = {};
async function join(name) {
  const who = { op: 'signup', name, email: name.toLowerCase() + '@example.com', password: 'toadstool1' };
  await call(auth, 'POST', '/api/auth', who);
  const r = await call(auth, 'POST', '/api/auth', Object.assign({ code: codeIn(auth.OUTBOX, who.email) }, who));
  const c = {}; r.cookies.forEach(s => { const m = /^([^=]+)=([^;]*)/.exec(s); if (m) c[m[1]] = m[2]; });
  G[name] = { id: r.json.me.id, tag: r.json.me.tag, h: { cookie: 'knoll_s=' + c.knoll_s + '; knoll_in=' + c.knoll_in, 'x-real-ip': '10.3.0.' + (++ipN) } };
}
const see = who => call(friends, 'GET', '/api/friends', undefined, G[who].h);
const act = (who, body) => call(friends, 'POST', '/api/friends', body, G[who].h);
const door = (who, body) => call(wall, 'POST', '/api/wall', body, G[who].h);
const read = (who, q) => call(wall, 'GET', '/api/wall' + q, undefined, who ? G[who].h : undefined);
const post = (who, body) => call(board, 'POST', '/api/board', body, G[who].h);
const hang = (who, body) => call(gallery, 'POST', '/api/gallery', body, G[who].h);
const piece = x => ({ k: 'd', f: 'tm-p01-slab-03', o: 0, x: x || 0, y: 0, z: 100 });
const edit = async (who, page, put) => door(who, { op: 'edit', page, base: (await read(null, '?page=' + page)).json.rev, put: put || {}, del: [] });
const breathe = who => { const h = Math.floor(Date.now() / 36e5); return wall.dbm([['DEL', wall.K.rl('u:' + G[who].id, h)], ['DEL', wall.K.rl('e:' + G[who].id, h)]]); };
const of = (r, kind) => r.json.notes.filter(x => x.kind === kind);
const JPEG = 'data:image/jpeg;base64,' + Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4, 5]).toString('base64');

(async () => {
  for (const name of ['Mossy', 'Juno', 'Bram']) await join(name);
  let r = await door('Mossy', { op: 'page', slug: 'hollow', title: 'Mossy Hollow', chaos: 1, period: 3 });
  A.strictEqual(r.json.ok, true, '(Mossy makes a tended space)');
  await act('Mossy', { op: 'invite', slug: 'hollow', ids: [G.Juno.id] });
  await act('Juno', { op: 'seen' });

  // ── what the friends' door says of the bell itself ──────────────────────
  r = await see('Mossy');
  A.deepStrictEqual([r.json.noted, r.json.hearts, r.json.unseen, r.json.notes.length], [0, 0, 0, 0], 'a bell never opened: noted 0, no hearts seen, nothing in it');
  const before = Date.now();
  r = await act('Mossy', { op: 'seen', hearts: 7 });
  r = await see('Mossy');
  A.ok(r.json.noted >= before && r.json.hearts === 7, 'opening it says when, and how many likes the fence had: ' + JSON.stringify([r.json.noted, r.json.hearts]));
  await act('Mossy', { op: 'seen' });
  r = await see('Mossy');
  A.strictEqual(r.json.hearts, 7, 'opened with no count, the count is left as it was');
  for (const [v, want] of [[-3, 0], ['12.9', 12], [1e12, 1e9], ['many', 7], [null, 7], [{ n: 1 }, 7]]) {
    await act('Mossy', { op: 'seen', hearts: 7 }); await act('Mossy', { op: 'seen', hearts: v });
    A.strictEqual((await see('Mossy')).json.hearts, want, 'a count of ' + JSON.stringify(v) + ' is kept as ' + want);
  }

  // ── an edit waiting for a look rings the bells of those who can give it one ──
  r = await edit('Bram', 'hollow', { abcdefgh0001: piece(10) });
  A.strictEqual(r.json.status, 'queued', '(Bram, a stranger, waits for the keepers)');
  const q1 = r.json.edit;
  for (const who of ['Mossy', 'Juno']) {
    r = await see(who);
    A.deepStrictEqual([of(r, 'waiting').length, of(r, 'waiting')[0].slug, of(r, 'waiting')[0].title, of(r, 'waiting')[0].from.tag, r.json.unseen], [1, 'hollow', 'Mossy Hollow', 'Bram#1', 1],
      who + ', who keeps the space, hears that an edit is waiting there, and whose');
  }
  r = await see('Bram');
  A.strictEqual(of(r, 'waiting').length, 0, 'the one who sent it hears nothing of it');
  r = await edit('Bram', 'hollow', { abcdefgh0002: piece(20) });
  const q2 = r.json.edit;
  r = await see('Mossy');
  A.deepStrictEqual([of(r, 'waiting').length, r.json.unseen], [1, 1], 'a second one waiting while the first note is unread is not a second note');
  await act('Mossy', { op: 'seen' });
  await door('Juno', { op: 'review', edit: q1, do: 'approve' });
  await breathe('Bram');
  r = await edit('Bram', 'hollow', { abcdefgh0003: piece(30) });
  A.strictEqual(r.json.status, 'queued', '(a third waits)');
  r = await see('Mossy');
  A.deepStrictEqual([of(r, 'waiting').length, r.json.unseen], [2, 1], 'once the bell has been opened, the next one is said again');
  r = await see('Juno');
  A.deepStrictEqual([of(r, 'waiting').length, r.json.unseen], [1, 1], '…but not to Juno, whose note is still unread');
  r = await edit('Juno', 'hollow', { abcdefgh0004: piece(40) });
  A.deepStrictEqual([r.json.status, of(await see('Mossy'), 'waiting').length], ['live', 2], 'an edit that goes straight up waits for nobody, and rings nothing');
  await door('Juno', { op: 'review', edit: q2, do: 'reject', why: 'not there' });   // two waiting is the most one gnome has
  await breathe('Bram');
  r = await edit('Bram', 'toem2', { abcdefgh0005: piece(50) });
  A.ok(r.json.status === 'queued' && of(await see('Mossy'), 'waiting').length === 2, 'TOEM 2 has no maker and no keepers of its own: an edit waiting there rings no bell: ' + JSON.stringify(r.json).slice(0, 200));

  // ── the board: a thread rings the keepers, a reply the one who began it ──
  await act('Mossy', { op: 'seen' }); await act('Juno', { op: 'seen' });
  r = await post('Bram', { op: 'post', page: 'hollow', ch: 'forum', title: 'Where is the well?', text: 'I cannot find it.' });
  const th = r.json.post.id;
  A.strictEqual(r.status, 200, '(Bram begins a thread at Mossy Hollow)');
  for (const who of ['Mossy', 'Juno']) {
    r = await see(who);
    A.deepStrictEqual([of(r, 'thread').length, of(r, 'thread')[0].what, of(r, 'thread')[0].title, of(r, 'thread')[0].from.tag], [1, 'Where is the well?', 'Mossy Hollow', 'Bram#1'], who + ' hears of the thread, by its title');
  }
  r = await post('Bram', { op: 'post', page: 'hollow', ch: 'forum', title: 'And the bridge?', text: 'Same question.' });
  A.strictEqual(of(await see('Mossy'), 'thread').length, 1, 'a second thread while the first note is unread is not a second note');
  r = await post('Juno', { op: 'post', page: 'hollow', ch: 'forum', re: th, text: 'Behind the oak.' });
  r = await see('Bram');
  A.deepStrictEqual([of(r, 'reply').length, of(r, 'reply')[0].what, of(r, 'reply')[0].from.tag, of(r, 'reply')[0].slug], [1, 'Where is the well?', 'Juno#1', 'hollow'], 'Bram, who began it, hears of the reply — and to which thread');
  A.strictEqual(of(await see('Mossy'), 'reply').length, 0, '…and nobody else does');
  r = await post('Bram', { op: 'post', page: 'hollow', ch: 'forum', re: th, text: 'Found it.' });
  A.strictEqual(of(await see('Bram'), 'reply').length, 1, 'a reply to one\'s own thread rings nothing');
  r = await post('Mossy', { op: 'post', page: 'hollow', ch: 'news', title: 'Open day', text: 'Saturday.' });
  r = await post('Bram', { op: 'post', page: 'hollow', ch: 'chat', text: 'hello' });
  r = await see('Juno');
  A.deepStrictEqual(r.json.notes.map(x => x.kind).sort(), ['keeper', 'thread', 'waiting'], 'the keepers\' own news and the chat ring nothing: Juno\'s bell is the invite, one edit waiting and one thread');
  r = await post('Bram', { op: 'post', ch: 'forum', title: 'On TOEM 2', text: 'Hello town.' });
  const town = r.json.post.id;
  r = await post('Juno', { op: 'post', ch: 'forum', re: town, text: 'Hello.' });
  r = await see('Bram');
  A.deepStrictEqual([of(r, 'reply').length, of(r, 'reply')[0].slug, of(r, 'reply')[0].title, of(await see('Mossy'), 'thread').length], [2, 'toem2', 'TOEM 2', 1],
    'on TOEM 2 a thread rings no keeper\'s bell, and its reply rings Bram\'s: once is once A PLACE, and this is another');
  r = await post('Juno', { op: 'post', ch: 'forum', re: town, text: 'Again.' });
  A.strictEqual(of(await see('Bram'), 'reply').length, 2, 'a second reply there, the first unread, is not a second note');
  await act('Bram', { op: 'seen' });
  r = await post('Juno', { op: 'post', ch: 'forum', re: town, text: 'And again.' });
  A.strictEqual(of(await see('Bram'), 'reply').length, 3, '…and read, the next reply there is said');

  // ── the album: a photo rings the keepers, a heart the one who took it ────
  await act('Mossy', { op: 'seen' }); await act('Juno', { op: 'seen' }); await act('Bram', { op: 'seen' });
  r = await hang('Bram', { op: 'post', page: 'hollow', cap: 'The oak at dusk', src: JPEG });
  A.strictEqual(r.status, 200, '(Bram hangs a photo at Mossy Hollow): ' + JSON.stringify(r.json).slice(0, 120));
  const ph = r.json.photo.id;
  r = await see('Mossy');
  A.deepStrictEqual([of(r, 'photo').length, of(r, 'photo')[0].what, of(r, 'photo')[0].from.tag], [1, 'The oak at dusk', 'Bram#1'], 'Mossy hears of the photo, by its title');
  r = await hang('Juno', { op: 'like', page: 'hollow', id: ph });
  r = await see('Bram');
  A.deepStrictEqual([of(r, 'heart').length, of(r, 'heart')[0].what, of(r, 'heart')[0].from.tag, of(r, 'heart')[0].title], [1, 'The oak at dusk', 'Juno#1', 'Mossy Hollow'], 'Bram, who took it, hears of the heart, and whose');
  r = await hang('Juno', { op: 'like', page: 'hollow', id: ph });
  r = await hang('Juno', { op: 'like', page: 'hollow', id: ph, on: false });
  r = await hang('Bram', { op: 'like', page: 'hollow', id: ph });
  await act('Bram', { op: 'seen' });
  r = await hang('Juno', { op: 'like', page: 'hollow', id: ph });
  r = await see('Bram');
  A.strictEqual(of(r, 'heart').length, 2, 'a heart pressed twice, taken back, or one\'s own rings nothing; given again after the bell was opened, it does');
  r = await hang('Mossy', { op: 'post', page: 'hollow', cap: 'Mine', src: JPEG });
  A.strictEqual(of(await see('Juno'), 'photo').length, 1, 'Juno, who also keeps the space, heard of Bram\'s photo once — and not again for Mossy\'s, hers being unread');

  // ── a space with a great many keepers: one post is not a store call for each of them ──
  const crowd = [];
  for (let i = 0; i < 30; i++) { const u = 'c' + String(i).padStart(2, '0') + '0'.repeat(13); crowd.push(u); await wall.db('HSET', wall.K.user(u), 'made', '1', 'name', 'Crowd' + i, 'role', 'user'); }
  await wall.db('SADD', wall.K.invited('hollow'), ...crowd);
  r = await post('Bram', { op: 'post', page: 'hollow', ch: 'forum', title: 'To all the keepers', text: 'hello' });
  const rang = (await wall.dbm(crowd.map(u => ['LLEN', wall.K.notes(u)]))).filter(Boolean).length;
  A.ok(r.status === 200 && rang === 23, 'of a space\'s thirty-two keepers twenty-five are told — the maker and Juno first, and twenty-three of the thirty after them: ' + rang);
  await wall.db('SREM', wall.K.invited('hollow'), ...crowd);

  // ── the bell holds fifty, and an ask outlives the note that carried it ──
  await act('Bram', { op: 'ask', tag: 'Mossy#1' });
  for (let i = 0; i < wall.NOTES_KEEP + 5; i++) await wall.tell(G.Mossy.id, 'okd', G.Juno.id, { slug: 'hollow', title: 'Mossy Hollow' });
  r = await see('Mossy');
  A.ok(r.json.notes.length === wall.NOTES_KEEP && of(r, 'ask').length === 0 && r.json.asks.length === 1 && r.json.asks[0].tag === 'Bram#1',
    'fifty newer notes push the ask\'s note off the end — and the ask is still in `asks`, by tag, for the page to draw');

  done();
  console.log('verify-bell: ' + n + ' checks, all good');
})().catch(e => { done(); console.error('verify-bell FAILED:', e.message); process.exit(1); });
