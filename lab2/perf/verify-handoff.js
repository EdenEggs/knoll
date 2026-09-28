#!/usr/bin/env node
/* verify-handoff.js — THE MASTER, AND A PAGE HANDED ON (api/wall.js), driven
   in-process over a throwaway store the way verify-friends.js drives the
   friends' door: the master stands as every page's maker, asks for a code,
   and a gnome claims the page with it — a space, somebody else's space, and
   TOEM 2 — with every way a code must NOT open anything beside it.

     node lab2/perf/verify-handoff.js
*/
'use strict';
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'knoll-handoff-'));
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
    const h = Object.assign({ host: 'localhost:4321', 'x-real-ip': '10.3.3.3' }, method === 'POST' ? { origin: HERE, 'content-type': 'application/json' } : {}, headers || {});
    const req = { method, url, headers: h, body: method === 'POST' ? body : undefined, socket: { remoteAddress: '127.0.0.1' } };
    const res = { statusCode: 200, headers: {}, setHeader(k, v) { this.headers[k.toLowerCase()] = v; },
                  end(s) { let json = {}; try { json = JSON.parse(s); } catch (e) {} resolve({ status: this.statusCode, json, cookies: [].concat(this.headers['set-cookie'] || []) }); } };
    fn(req, res).catch(e => resolve({ status: 599, json: { error: String(e && e.stack || e) }, cookies: [] }));
  });
}
const { codeIn } = require('./gnome.js');      // the sign-up code, out of the outbox beside the temp store (api/auth.js: THE CODE)
const G = {};                                   // each gnome: { id, tag, h } — h is what they send: their cookie, and an address of their own
let ip = 10;
async function join(name) {
  const who = { op: 'signup', name, email: name.toLowerCase() + '@example.com', password: 'toadstool1' }, from = { 'x-real-ip': '10.3.4.' + ip++ };
  await call(auth, 'POST', '/api/auth', who, from);
  const r = await call(auth, 'POST', '/api/auth', Object.assign({ code: codeIn(auth.OUTBOX, who.email) }, who), from);
  const c = {}; r.cookies.forEach(s => { const m = /^([^=]+)=([^;]*)/.exec(s); if (m) c[m[1]] = m[2]; });
  G[name] = { id: r.json.me.id, tag: r.json.me.tag, h: Object.assign({ cookie: 'knoll_s=' + c.knoll_s + '; knoll_in=' + c.knoll_in }, from) };
}
const read = (who, q) => call(wall, 'GET', '/api/wall' + q, undefined, who ? G[who].h : {});
const door = (who, body, headers) => call(wall, 'POST', '/api/wall', body, Object.assign({}, who ? G[who].h : {}, headers || {}));
const keep = (who, body) => call(friends, 'POST', '/api/friends', body, G[who].h);
const bell = async who => (await call(friends, 'GET', '/api/friends', undefined, G[who].h)).json.notes;
const pageRec = slug => wall.db('HGETALL', wall.K.page(slug));
const rested = who => wall.db('DEL', wall.K.rl('u:' + G[who].id, Math.floor(Date.now() / 36e5)));   // a new hour for them: a newcomer makes a page three posts an hour (api/wall.js: rateOk)
const CODE = /^[0-9A-HJKMNP-TV-Z]{4}(-[0-9A-HJKMNP-TV-Z]{4}){3}$/;
const bare = c => c.replace(/-/g, '');
const wrong = i => 'ZZZZ-ZZZZ-ZZZZ-' + String(1000 + i);   // well formed, and nobody's

(async () => {
  for (const name of ['Mossy', 'Juno', 'Bram', 'Pip', 'Tansy', 'Wren']) await join(name);
  await wall.db('HSET', wall.K.user(G.Mossy.id), 'role', 'admin');   // Mossy is the master (ADMIN_EMAILS gives this at a proved sign-in; verify-auth.js checks that road)

  // ── the desk is the master's ────────────────────────────────────────────
  let r = await read(null, '?desk=1');   A.deepStrictEqual([r.status, r.json.code], [403, 'role'], 'nobody signed in has no desk');
  r = await read('Juno', '?desk=1');     A.deepStrictEqual([r.status, r.json.code], [403, 'role'], 'nor has a gnome who is not the master');
  r = await read('Mossy', '?desk=1');
  A.deepStrictEqual([r.status, r.json.pages.map(p => p.slug), r.json.pages[0].title, r.json.pages[0].by, r.json.pages[0].code, r.json.days], [200, ['toem2'], 'TOEM 2', '', null, wall.HANDOFF_DAYS],
    'the master\'s desk opens on the first page, nobody\'s yet, with no code out');

  r = await call(auth, 'GET', '/api/auth', undefined, G.Mossy.h); A.strictEqual(r.json.me.master, true, 'the gate tells the master that it is the master');
  r = await call(auth, 'GET', '/api/auth', undefined, G.Juno.h);  A.ok(r.json.me.id === G.Juno.id && !('master' in r.json.me), '…and says nothing of it to anybody else');

  // ── the master is every page's maker ────────────────────────────────────
  r = await door('Juno', { op: 'page', slug: 'hollow', title: 'Juno Hollow' });  A.strictEqual(r.json.ok, true, 'Juno makes a space');
  r = await door('Mossy', { op: 'page', slug: 'green', title: 'The Green' });    A.strictEqual(r.json.ok, true, 'and the master makes one');
  r = await read('Mossy', '?rules=1&page=hollow'); A.deepStrictEqual([r.json.owner, r.json.keeper, r.json.master, r.json.by], [true, true, true, G.Juno.id], 'on Juno\'s space the master stands where its maker stands — and it is still Juno\'s');
  r = await read('Bram', '?rules=1&page=hollow');  A.deepStrictEqual([r.json.owner, r.json.keeper, r.json.master], [false, false, false], '…which a stranger does not');
  r = await read('Mossy', '?rules=1');             A.deepStrictEqual([r.json.owner, r.json.keeper, r.json.by], [true, true, ''], 'on TOEM 2 too, which has no maker of its own yet');
  r = await read('Juno', '?rules=1');              A.deepStrictEqual([r.json.owner, r.json.master], [false, false], '…and is not Juno\'s');
  r = await door('Mossy', { op: 'settings', page: 'hollow', chaos: 3 }); A.deepStrictEqual([r.status, r.json.rules.chaos], [200, 3], 'the master sets the rules of a space it did not make');
  r = await keep('Mossy', { op: 'invite', slug: 'hollow', ids: [G.Bram.id] }); A.deepStrictEqual([r.status, r.json.sent], [200, 1], '…and names its keepers');
  r = await keep('Bram', { op: 'invite', slug: 'hollow', ids: [G.Pip.id] });   A.deepStrictEqual([r.status, r.json.code], [403, 'owner'], 'a keeper still does not');
  r = await keep('Mossy', { op: 'invite', slug: 'toem2', ids: [G.Wren.id] });  A.deepStrictEqual([r.status, r.json.sent], [200, 1], 'the master names a keeper of TOEM 2');
  r = await read('Wren', '?rules=1');              A.deepStrictEqual([r.json.keeper, r.json.owner], [true, false], '…who keeps it, and does not own it');
  A.deepStrictEqual([(await bell('Wren'))[0].kind, (await bell('Wren'))[0].title], ['keeper', 'TOEM 2'], '…and is told so, by its name');
  r = await keep('Juno', { op: 'invite', slug: 'toem2', ids: [G.Pip.id] });    A.deepStrictEqual([r.status, r.json.code], [403, 'owner'], 'nobody else names one');
  r = await keep('Mossy', { op: 'uninvite', slug: 'toem2', ids: [G.Wren.id] }); A.deepStrictEqual([r.status, r.json.gone], [200, 1], 'the master takes the keeper back off');

  // ── a code, asked for ───────────────────────────────────────────────────
  r = await door('Juno', { op: 'handoff', page: 'hollow' });   A.deepStrictEqual([r.status, r.json.code], [403, 'role'], 'a page is not its maker\'s to hand on by code — that is the master\'s');
  r = await door(null, { op: 'handoff', page: 'green' });      A.strictEqual(r.status, 401, 'nor anybody\'s who is signed out');
  r = await door('Mossy', { op: 'handoff', page: 'nowhere' }); A.deepStrictEqual([r.status, r.json.code], [404, 'page'], 'a page nobody made has no code');
  const t0 = Date.now();
  r = await door('Mossy', { op: 'handoff', page: 'green' });
  A.deepStrictEqual([r.status, r.json.page, r.json.title, CODE.test(r.json.code)], [200, 'green', 'The Green', true], 'the master asks for a code for The Green: ' + JSON.stringify(r.json));
  A.ok(Math.abs(r.json.expires - (t0 + wall.HANDOFF_DAYS * 86400e3)) < 5000, 'it lasts ' + wall.HANDOFF_DAYS + ' days');
  const green = r.json.code;
  const kept = fs.readFileSync(process.env.WALL_DB, 'utf8');
  A.ok(!kept.includes(green) && !kept.includes(bare(green)), 'the store keeps the code\'s sha256 and never the code');
  A.ok(kept.includes(wall.sha('handoff|' + bare(green))), '…under this key');
  r = await read('Mossy', '?desk=1');
  const onDesk = slug => r.json.pages.find(p => p.slug === slug);
  A.deepStrictEqual([r.json.pages.map(p => p.slug), onDesk('green').tag, onDesk('hollow').tag, !!onDesk('green').code, onDesk('green').code.expires > t0, onDesk('hollow').code], [['toem2', 'hollow', 'green'], 'Mossy#1', 'Juno#1', true, true, null],
    'the desk lists every page with whose it is, and says a code is out for The Green');
  A.ok(!JSON.stringify(r.json).includes(bare(green)) && !JSON.stringify(r.json).includes(wall.sha('handoff|' + bare(green))), '…without the code, or its sha');
  r = await read('Juno', '?space=green'); A.ok(!('hand' in r.json.space) && !JSON.stringify(r.json).includes('"h"'), 'and the space\'s own face says nothing of it');

  // ── a code, claimed ─────────────────────────────────────────────────────
  r = await door(null, { op: 'claim', code: green });           A.strictEqual(r.status, 401, 'a claim wants somebody signed in');
  r = await door('Pip', { op: 'claim', code: green }, { origin: 'https://elsewhere.example' }); A.deepStrictEqual([r.status, r.json.code], [403, 'origin'], 'and a post from this site');
  for (const c of [undefined, '', 'short', green + 'X', 'UUUU-UUUU-UUUU-UUUU', { a: 1 }, 'x'.repeat(5000)]) { r = await door('Pip', { op: 'claim', code: c }); A.deepStrictEqual([r.status, r.json.code], [400, 'code'], 'not a code at all: ' + String(JSON.stringify(c)).slice(0, 30)); }
  r = await door('Pip', { op: 'claim', code: wrong(0) });       A.deepStrictEqual([r.status, r.json.code], [404, 'code'], 'a code nobody was given opens nothing');
  A.strictEqual((await pageRec('green')).by, G.Mossy.id, '…and The Green is still the master\'s');
  const typed = ' ' + bare(green).toLowerCase().replace(/0/g, 'o').replace(/1/g, 'l').replace(/(.{4})/g, '$1 ') + ' ';   // as somebody would type it: small letters, spaces, an o for a nought
  r = await door('Pip', { op: 'claim', code: typed });
  A.deepStrictEqual([r.status, r.json.ok, r.json.page.slug, r.json.page.title], [200, true, 'green', 'The Green'], 'Pip types it in — small letters, spaces, an o for a 0 — and The Green is handed over: ' + JSON.stringify(r.json));
  let p = await pageRec('green');
  A.deepStrictEqual([p.by, p.giver, p.hand, +p.given >= t0, p.title], [G.Pip.id, G.Mossy.id, '', true, 'The Green'], 'its record says whose it is now, who handed it on and when — and the code is gone from it');
  A.deepStrictEqual([await wall.db('SMEMBERS', wall.K.given(G.Pip.id)), await wall.db('SMEMBERS', wall.K.spaces(G.Mossy.id))], [['green'], []], 'it stands among Pip\'s, and no longer among the master\'s');
  r = await read('Pip', '?spaces=1');
  A.deepStrictEqual([r.json.spaces.map(s => [s.slug, s.handed, s.by]), r.json.full], [[['green', true, G.Pip.id]], false], 'Pip\'s spaces show it, marked as handed');
  r = await read('Mossy', '?spaces=1'); A.deepStrictEqual(r.json.spaces.map(s => s.slug), [], '…and the master\'s do not');
  r = await read('Pip', '?rules=1&page=green'); A.deepStrictEqual([r.json.owner, r.json.keeper, r.json.master, r.json.keepers.map(k => k.tag)], [true, true, false, ['Pip#1']], 'Pip is its maker now, by the rules every door asks');
  r = await door('Pip', { op: 'settings', page: 'green', title: 'Pip Green', chaos: 0 }); A.deepStrictEqual([r.status, r.json.rules.title, r.json.rules.chaos], [200, 'Pip Green', 0], '…and sets its name and its rules');
  r = await keep('Pip', { op: 'invite', slug: 'green', ids: [G.Tansy.id] }); A.deepStrictEqual([r.status, r.json.sent], [200, 1], '…and names its keepers');
  let notes = await bell('Mossy');
  A.deepStrictEqual([notes[0].kind, notes[0].from.tag, notes[0].slug, notes[0].title], ['claimed', 'Pip#1', 'green', 'The Green'], 'the master\'s bell says Pip claimed it');
  r = await read('Mossy', '?audit=20');
  A.deepStrictEqual(r.json.audit.filter(e => e.what === 'claim' || e.what === 'handoff').map(e => [e.what, e.by, e.page, e.from, e.giver]), [['claim', G.Pip.id, 'green', G.Mossy.id, G.Mossy.id], ['handoff', G.Mossy.id, 'green', undefined, undefined]], 'both are on the record');
  r = await read('Mossy', '?desk=1'); A.deepStrictEqual([onDesk('green').tag, onDesk('green').code, onDesk('green').given >= t0], ['Pip#1', null, true], 'the desk says The Green is Pip\'s, with no code out');

  // ── once, and only the newest ───────────────────────────────────────────
  r = await door('Bram', { op: 'claim', code: green }); A.deepStrictEqual([r.status, r.json.code], [404, 'code'], 'a code opens once: Bram, with the same one, gets nothing');
  A.strictEqual((await pageRec('green')).by, G.Pip.id, '…and The Green stays Pip\'s');
  const first = (await door('Mossy', { op: 'handoff', page: 'hollow' })).json.code, second = (await door('Mossy', { op: 'handoff', page: 'hollow' })).json.code;
  A.ok(CODE.test(first) && CODE.test(second) && first !== second && second !== green, 'two codes asked for one page are two codes');
  r = await door('Bram', { op: 'claim', code: first }); A.deepStrictEqual([r.status, r.json.code], [404, 'code'], 'the second ended the first');
  r = await door('Bram', { op: 'claim', code: second });
  A.deepStrictEqual([r.status, r.json.page.slug, r.json.page.was], [200, 'hollow', G.Juno.id], 'Bram claims Juno\'s space with the newest — the master\'s to hand on, as every page is');
  A.deepStrictEqual([(await pageRec('hollow')).by, await wall.db('SMEMBERS', wall.K.spaces(G.Juno.id)), await wall.db('SMEMBERS', wall.K.given(G.Bram.id)), await wall.db('SMEMBERS', wall.K.invited('hollow'))],
    [G.Bram.id, [], ['hollow'], []], 'it is Bram\'s, gone from Juno\'s, and Bram — a keeper of it before — is its maker and not a keeper twice');
  r = await read('Juno', '?rules=1&page=hollow'); A.deepStrictEqual([r.json.owner, r.json.keeper], [false, false], 'Juno neither owns it nor keeps it');
  r = await door('Juno', { op: 'settings', page: 'hollow', chaos: 1 }); A.deepStrictEqual([r.status, r.json.code], [403, 'owner'], '…and cannot set its rules any more');
  notes = await bell('Juno');
  A.deepStrictEqual([notes[0].kind, notes[0].from.tag, notes[0].slug], ['handed', 'Bram#1', 'hollow'], 'Juno\'s bell says where it went');
  await rested('Juno');
  r = await door('Juno', { op: 'page', slug: 'hollow-two', title: 'Another' }); A.strictEqual(r.json.ok, true, 'and the room it took is Juno\'s again: ' + JSON.stringify(r.json));

  // ── taken back, run out, theirs already ─────────────────────────────────
  const back = (await door('Mossy', { op: 'handoff', page: 'green' })).json.code;
  r = await door('Mossy', { op: 'handoff', page: 'green', revoke: true }); A.deepStrictEqual([r.status, r.json.revoked], [200, true], 'the master takes a code back');
  r = await door('Juno', { op: 'claim', code: back }); A.deepStrictEqual([r.status, r.json.code], [404, 'code'], '…and it opens nothing');
  r = await door('Juno', { op: 'handoff', page: 'green', revoke: true }); A.deepStrictEqual([r.status, r.json.code], [403, 'role'], 'taking one back is the master\'s too');
  r = await door('Mossy', { op: 'handoff', page: 'green', revoke: true }); A.deepStrictEqual([r.status, r.json.revoked], [200, false], 'with none out there is none to take back');
  const old = (await door('Mossy', { op: 'handoff', page: 'green' })).json.code;
  await wall.db('EXPIRE', wall.K.handoff(wall.sha('handoff|' + bare(old))), 0);   // its seven days, gone in one line
  r = await door('Juno', { op: 'claim', code: old }); A.deepStrictEqual([r.status, r.json.code], [404, 'code'], 'a code past its days opens nothing');
  const stale = (await door('Mossy', { op: 'handoff', page: 'green' })).json.code;
  p = await pageRec('green'); await wall.db('HSET', wall.K.page('green'), 'hand', JSON.stringify(Object.assign(JSON.parse(p.hand), { ex: Date.now() - 1 })));
  r = await door('Juno', { op: 'claim', code: stale }); A.deepStrictEqual([r.status, r.json.code, (await pageRec('green')).by], [404, 'code', G.Pip.id], '…nor one the page says has run out');
  r = await read('Mossy', '?desk=1'); A.strictEqual(onDesk('green').code, null, '…and the desk does not show it');
  const own = (await door('Mossy', { op: 'handoff', page: 'green' })).json.code;
  r = await door('Pip', { op: 'claim', code: own }); A.deepStrictEqual([r.status, r.json.yours, (await pageRec('green')).by, (await pageRec('green')).hand], [200, true, G.Pip.id, ''], 'a code for a page that is theirs already is spent, and nothing moves');

  // ── TOEM 2, handed on ───────────────────────────────────────────────────
  r = await door('Juno', { op: 'settings', page: 'toem2', chaos: 2 }); A.deepStrictEqual([r.status, r.json.code], [403, 'owner'], 'TOEM 2\'s rules are not Juno\'s to set');
  r = await read('Juno', '?space=toem2'); A.deepStrictEqual([r.status, r.json.space.slug, r.json.space.title, r.json.space.by], [200, 'toem2', 'TOEM 2', ''], 'the first page has a face like any space, and no maker');
  const home = (await door('Mossy', { op: 'handoff', page: 'toem2' })).json;
  A.deepStrictEqual([CODE.test(home.code), home.page, home.title], [true, 'toem2', 'TOEM 2'], 'the master asks for a code for TOEM 2');
  r = await door('Juno', { op: 'claim', code: home.code });
  A.deepStrictEqual([r.status, r.json.page.slug, r.json.page.title], [200, 'toem2', 'TOEM 2'], 'Juno claims TOEM 2');
  p = await pageRec('toem2');
  A.deepStrictEqual([p.by, p.made, p.giver], [G.Juno.id, undefined, G.Mossy.id], 'its record has a maker now, and still no `made` — everything that knows the first page by name still does');
  r = await read('Juno', '?space=toem2'); A.deepStrictEqual([r.json.space.by, r.json.space.tag, r.json.space.title], [G.Juno.id, 'Juno#1', 'TOEM 2'], 'its face says whose');
  r = await read('Juno', '?spaces=1'); A.deepStrictEqual(r.json.spaces.map(s => [s.slug, s.title, !!s.handed]), [['hollow-two', 'Another', false], ['toem2', 'TOEM 2', true]], 'it stands among Juno\'s spaces');
  r = await read('Juno', '?rules=1'); A.deepStrictEqual([r.json.owner, r.json.keeper, r.json.keepers.map(k => k.tag)], [true, true, ['Juno#1']], 'Juno is TOEM 2\'s maker by the rules');
  r = await door('Juno', { op: 'settings', page: 'toem2', chaos: 2, period: 7, feats: [true, false, true, false, false, false] });
  A.deepStrictEqual([r.status, r.json.rules.chaos, r.json.rules.period, r.json.rules.feats[1]], [200, 2, 7, false], '…sets its rules');
  r = await door('Juno', { op: 'settings', page: 'toem2', title: 'Juno\'s Wall' }); A.deepStrictEqual([r.status, (await pageRec('toem2')).title], [400, undefined], '…but not its name: TOEM 2 is TOEM 2');
  r = await keep('Juno', { op: 'invite', slug: 'toem2', ids: [G.Tansy.id] }); A.deepStrictEqual([r.status, r.json.sent], [200, 1], '…and names its keepers');
  r = await read('Tansy', '?rules=1'); A.deepStrictEqual([r.json.keeper, r.json.owner, r.json.keepers.map(k => k.tag)], [true, false, ['Juno#1', 'Tansy#1']], 'who keep it');
  r = await door('Bram', { op: 'settings', page: 'toem2', chaos: 3 }); A.deepStrictEqual([r.status, r.json.code], [403, 'owner'], 'a stranger still sets nothing there');
  r = await read('Mossy', '?rules=1'); A.deepStrictEqual([r.json.owner, r.json.by], [true, G.Juno.id], 'and the master stands where Juno stands');
  r = await door('Mossy', { op: 'settings', page: 'toem2', chaos: 1 }); A.strictEqual(r.status, 200, '…still');
  r = await read(null, '?pages=1'); A.deepStrictEqual(r.json.pages[0], { slug: 'toem2', title: 'TOEM 2', kind: 'wall' }, 'the list of pages says of the first what it always said');

  // ── a handed page takes none of the three ───────────────────────────────
  await rested('Pip');
  for (const s of ['pip-one', 'pip-two', 'pip-three']) { r = await door('Pip', { op: 'page', slug: s, title: s }); A.strictEqual(r.json.ok, true, 'Pip, who was handed one, makes ' + s + ': ' + JSON.stringify(r.json).slice(0, 120)); }
  await rested('Pip');
  r = await door('Pip', { op: 'page', slug: 'pip-four', title: 'four' }); A.deepStrictEqual([r.status, r.json.code], [409, 'full'], '…and the fourth is one too many, as for anybody');
  r = await read('Pip', '?spaces=1'); A.deepStrictEqual([r.json.spaces.length, r.json.full, r.json.spaces.filter(s => s.handed).map(s => s.slug)], [4, true, ['green']], 'four stand in Pip\'s yard: three made, one handed');

  // ── who may not, and how often ──────────────────────────────────────────
  const gift = (await door('Mossy', { op: 'handoff', page: 'green' })).json.code;
  const lost = await wall.finishLogin('nameless@example.com');   // vouched for, and never named (a first Google sign-in, before /signup asks)
  r = await call(wall, 'POST', '/api/wall', { op: 'claim', code: gift }, { authorization: 'Bearer ' + lost.session, 'x-real-ip': '10.3.5.1' });
  A.deepStrictEqual([r.status, r.json.code], [400, 'name'], 'an account with no name yet is asked for one first');
  await wall.db('HSET', wall.K.user(G.Wren.id), 'banned', '1');
  r = await door('Wren', { op: 'claim', code: gift }); A.deepStrictEqual([r.status, r.json.code], [403, 'banned'], 'a banned account claims nothing');
  await wall.db('HSET', wall.K.user(G.Mossy.id), 'banned', '1');
  r = await door('Mossy', { op: 'handoff', page: 'green' }); A.deepStrictEqual([r.status, r.json.code], [403, 'banned'], 'and a banned master hands nothing on');
  r = await read('Mossy', '?desk=1'); A.strictEqual(r.status, 403, '…and has no desk');
  r = await read('Mossy', '?rules=1&page=green'); A.deepStrictEqual([r.json.owner, r.json.master], [false, false], '…and is nobody\'s maker');
  await wall.db('HSET', wall.K.user(G.Mossy.id), 'banned', '0');
  A.strictEqual((await pageRec('green')).by, G.Pip.id, 'none of which moved The Green');
  for (let i = 1; i <= wall.CLAIM_TRIES; i++) { r = await door('Tansy', { op: 'claim', code: wrong(i) }); A.deepStrictEqual([r.status, r.json.code], [404, 'code'], 'wrong code ' + i + ' of ' + wall.CLAIM_TRIES); }
  r = await door('Tansy', { op: 'claim', code: wrong(99) }); A.deepStrictEqual([r.status, r.json.code], [429, 'rate'], 'then a wait: ' + wall.CLAIM_TRIES + ' guesses an hour, an account');
  r = await door('Tansy', { op: 'claim', code: gift }); A.deepStrictEqual([r.status, (await pageRec('green')).by], [429, G.Pip.id], '…the right code included, which is still good when the hour is up');
  r = await door('Bram', { op: 'claim', code: gift }); A.deepStrictEqual([r.status, r.json.page.slug], [200, 'green'], 'Bram, who has guessed nothing, claims it');

  fs.rmSync(TMP, { recursive: true, force: true });
  console.log('verify-handoff: ' + n + ' checks, all good');
})().catch(e => { fs.rmSync(TMP, { recursive: true, force: true }); console.error('verify-handoff: FAILED after ' + n + ' checks\n' + (e && e.stack || e)); process.exit(1); });
