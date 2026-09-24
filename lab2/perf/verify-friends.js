#!/usr/bin/env node
/* verify-friends.js — friends, invites and the bell (api/friends.js), with the
   spaces they invite to (api/wall.js: SPACES), driven in-process over a
   throwaway store the way verify-auth.js drives the gate. Four gnomes sign up
   through the gate itself; everything after is what they would do in the
   yard, the form at /yard/new/, and a space's page.

     node lab2/perf/verify-friends.js
*/
'use strict';
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'knoll-friends-'));
process.env.WALL_DB = path.join(TMP, 'wall-db.json');
delete process.env.KV_REST_API_URL; delete process.env.UPSTASH_REDIS_REST_URL; delete process.env.VERCEL;
const ROOT = path.join(__dirname, '..', '..');
const auth = require(path.join(ROOT, 'api', 'auth.js'));
const wall = require(path.join(ROOT, 'api', 'wall.js'));
const friends = require(path.join(ROOT, 'api', 'friends.js'));

let n = 0;
const A = new Proxy(assert, { get: (a, k) => (...args) => { n++; return a[k](...args); } });

const HERE = 'http://localhost:4321';
function call(fn, method, url, body, headers) {
  return new Promise(resolve => {
    const h = Object.assign({ host: 'localhost:4321', 'x-real-ip': '10.2.2.2' }, method === 'POST' ? { origin: HERE, 'content-type': 'application/json' } : {}, headers || {});
    const req = { method, url, headers: h, body: method === 'POST' ? body : undefined, socket: { remoteAddress: '127.0.0.1' } };
    const res = { statusCode: 200, headers: {}, setHeader(k, v) { this.headers[k.toLowerCase()] = v; },
                  end(s) { let json = {}; try { json = JSON.parse(s); } catch (e) {} resolve({ status: this.statusCode, json, cookies: [].concat(this.headers['set-cookie'] || []) }); } };
    fn(req, res).catch(e => resolve({ status: 599, json: { error: String(e && e.stack || e) }, cookies: [] }));
  });
}
const G = {};                                   // each gnome: { id, tag, h } — h is the cookie header they send
async function join(name) {
  const r = await call(auth, 'POST', '/api/auth', { op: 'signup', name, email: name.toLowerCase() + '@example.com', password: 'toadstool1' });
  const c = {}; r.cookies.forEach(s => { const m = /^([^=]+)=([^;]*)/.exec(s); if (m) c[m[1]] = m[2]; });
  G[name] = { id: r.json.me.id, tag: r.json.me.tag, h: { cookie: 'knoll_s=' + c.knoll_s + '; knoll_in=' + c.knoll_in } };
}
const see = who => call(friends, 'GET', '/api/friends', undefined, who && G[who].h);
const act = (who, body, headers) => call(friends, 'POST', '/api/friends', body, Object.assign({}, G[who].h, headers || {}));
const tags = list => list.map(f => f.tag).sort();

(async () => {
  for (const name of ['Mossy', 'Juno', 'Bram', 'Pip']) await join(name);
  A.deepStrictEqual(Object.values(G).map(g => g.tag), ['Mossy#1', 'Juno#1', 'Bram#1', 'Pip#1'], 'four gnomes, each with a tag');

  // ── asking, by tag ──────────────────────────────────────────────────────
  let r = await see();                            A.strictEqual(r.status, 401, 'nobody signed in has no friends to see');
  r = await act('Mossy', { op: 'ask', tag: 'Nobody#9' }); A.deepStrictEqual([r.status, r.json.code], [404, 'tag'], 'a tag nobody goes by is a 404');
  r = await act('Mossy', { op: 'ask', tag: 'Juno' });     A.strictEqual(r.status, 404, '…and so is a name without its number');
  r = await act('Mossy', { op: 'ask', tag: 'mossy#1' });  A.deepStrictEqual([r.status, r.json.code], [400, 'self'], 'your own tag, in any capitals, is yours');
  r = await act('Mossy', { op: 'ask', tag: ' juno#1 ' }); A.deepStrictEqual([r.status, r.json.friends], [200, false], 'Mossy asks Juno, by her tag in any capitals');
  r = await act('Mossy', { op: 'ask', tag: 'Juno#1' });   A.strictEqual(r.json.friends, false, '…twice');
  r = await see('Juno');
  A.deepStrictEqual([tags(r.json.asks), r.json.notes.length, r.json.notes[0].kind, r.json.notes[0].from.tag, r.json.unseen], [['Mossy#1'], 1, 'ask', 'Mossy#1', 1],
    'Juno is asked once, and her bell says so, unseen: ' + JSON.stringify(r.json.notes));
  A.deepStrictEqual(r.json.me, { id: G.Juno.id, tag: 'Juno#1' }, 'the answer says whose friends these are, by tag');

  // ── yes ─────────────────────────────────────────────────────────────────
  r = await act('Juno', { op: 'answer', id: G.Mossy.id, yes: true }); A.strictEqual(r.json.ok, true, 'Juno says yes');
  r = await act('Juno', { op: 'answer', id: G.Mossy.id, yes: true }); A.strictEqual(r.status, 404, '…and cannot answer an ask twice');
  r = await see('Juno');  A.deepStrictEqual([tags(r.json.friends), r.json.asks.length, r.json.notes.length], [['Mossy#1'], 0, 0], 'Juno has a friend, and the answered ask has left her bell');
  r = await see('Mossy'); A.deepStrictEqual([tags(r.json.friends), r.json.notes[0].kind, r.json.notes[0].from.tag, r.json.unseen], [['Juno#1'], 'friend', 'Juno#1', 1], 'Mossy has one too, and his bell says Juno said yes');
  r = await act('Mossy', { op: 'seen' }); r = await see('Mossy'); A.strictEqual(r.json.unseen, 0, 'opening the bell sees what is in it');

  // ── asking somebody who asked you is a yes; no is no ────────────────────
  await act('Bram', { op: 'ask', tag: 'Mossy#1' });
  r = await act('Mossy', { op: 'ask', tag: 'Bram#1' }); A.strictEqual(r.json.friends, true, 'Bram had asked Mossy, so Mossy asking back makes them friends');
  r = await see('Bram'); A.deepStrictEqual(tags(r.json.friends), ['Mossy#1'], '…both ways');
  await act('Pip', { op: 'ask', tag: 'Mossy#1' });
  r = await act('Mossy', { op: 'answer', id: G.Pip.id, yes: false }); A.strictEqual(r.json.ok, true, 'Mossy says no to Pip');
  r = await see('Mossy'); A.deepStrictEqual([tags(r.json.friends), r.json.asks.length], [['Bram#1', 'Juno#1'], 0], '…who is not a friend, and the ask is gone');
  r = await see('Pip'); A.deepStrictEqual([r.json.friends.length, r.json.notes.length], [0, 0], "…and Pip's bell says nothing of it");

  // ── invites, to a space ─────────────────────────────────────────────────
  r = await call(wall, 'POST', '/api/wall', { op: 'page', slug: 'hollow', title: 'Mossy Hollow' }, G.Mossy.h); A.strictEqual(r.json.ok, true, 'Mossy makes a space');
  r = await act('Mossy', { op: 'invite', slug: 'hollow', ids: [G.Juno.id, G.Bram.id, G.Pip.id, G.Juno.id, 'x'] });
  A.deepStrictEqual([r.json.ok, r.json.sent], [true, 2], 'and invites his two friends to it — not Pip, who is not one');
  r = await see('Juno');
  A.deepStrictEqual([r.json.notes[0].kind, r.json.notes[0].slug, r.json.notes[0].title, r.json.notes[0].from.tag, r.json.unseen], ['keeper', 'hollow', 'Mossy Hollow', 'Mossy#1', 1], "the invite is in Juno's bell, with the space's address — and it makes her a keeper (2026-09-24)");
  r = await see('Pip'); A.strictEqual(r.json.notes.length, 0, "…and not in Pip's");
  r = await act('Mossy', { op: 'invite', slug: 'hollow', ids: [G.Juno.id] }); A.strictEqual(r.json.sent, 0, 'nobody is invited twice');
  r = await act('Juno', { op: 'invite', slug: 'hollow', ids: [G.Mossy.id] }); A.deepStrictEqual([r.status, r.json.code], [403, 'owner'], 'only its maker invites to a space');
  r = await act('Mossy', { op: 'invite', slug: 'nowhere', ids: [G.Juno.id] }); A.strictEqual(r.status, 404, 'a space nobody made has nobody to invite');
  A.deepStrictEqual((await wall.db('SMEMBERS', wall.K.invited('hollow'))).sort(), [G.Juno.id, G.Bram.id].sort(), 'who was invited is kept with the space');

  // ── and the rest ────────────────────────────────────────────────────────
  r = await act('Mossy', { op: 'drop', id: G.Bram.id }); A.strictEqual(r.json.ok, true, 'Mossy drops Bram');
  A.deepStrictEqual([tags((await see('Mossy')).json.friends), (await see('Bram')).json.friends.length], [['Juno#1'], 0], '…both ways');
  r = await act('Mossy', { op: 'ask', tag: 'Juno#1' }, { origin: 'https://elsewhere.example' }); A.deepStrictEqual([r.status, r.json.code], [403, 'origin'], "another site's post is turned away");
  r = await act('Mossy', { op: 'wave' }); A.deepStrictEqual([r.status, r.json.code], [400, 'op'], 'an op nobody knows is a 400');
  await wall.db('HSET', wall.K.user(G.Pip.id), 'banned', '1');
  r = await act('Juno', { op: 'ask', tag: 'Pip#1' }); A.strictEqual(r.status, 404, 'a banned gnome cannot be asked');
  r = await act('Pip', { op: 'ask', tag: 'Juno#1' }); A.deepStrictEqual([r.status, r.json.code], [403, 'banned'], '…nor ask');
  for (let i = 0; i < 70 && r.status !== 429; i++) r = await act('Bram', { op: 'drop', id: G.Juno.id });
  A.strictEqual(r.status, 429, 'sixty posts an hour, then a breath');

  fs.rmSync(TMP, { recursive: true, force: true });
  console.log('verify-friends: ' + n + ' checks, all good');
})().catch(e => { fs.rmSync(TMP, { recursive: true, force: true }); console.error('verify-friends: FAILED after ' + n + ' checks\n' + (e && e.stack || e)); process.exit(1); });
