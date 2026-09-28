#!/usr/bin/env node
/* verify-chaos.js — the three levels of chaos across the three doors: the gate
   (api/auth.js), the wall (api/wall.js: THREE LEVELS OF CHAOS) and the
   friends list with its bell (api/friends.js), driven in-process over a
   throwaway store the way verify-friends.js is. Four gnomes sign up through
   the gate; one is made a moderator by hand. Everything after is what they
   would do on a space's page, the wall and the yard's bell.

     node lab2/perf/verify-chaos.js
*/
'use strict';
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'knoll-chaos-'));
process.env.WALL_DB = path.join(TMP, 'wall-db.json');
delete process.env.KV_REST_API_URL; delete process.env.UPSTASH_REDIS_REST_URL; delete process.env.VERCEL;
const ROOT = path.join(__dirname, '..', '..');
const auth = require(path.join(ROOT, 'api', 'auth.js'));
const wall = require(path.join(ROOT, 'api', 'wall.js'));
const friends = require(path.join(ROOT, 'api', 'friends.js'));

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
const { codeIn } = require('./gnome.js');      // the sign-up code, out of the outbox beside the temp store (api/auth.js: THE CODE)
const G = {};                                   // each gnome: { id, tag, h } — h is the cookie header they send, from an address of their own
async function join(name) {
  const who = { op: 'signup', name, email: name.toLowerCase() + '@example.com', password: 'toadstool1' };
  await call(auth, 'POST', '/api/auth', who);   // the code goes out…
  const r = await call(auth, 'POST', '/api/auth', Object.assign({ code: codeIn(auth.OUTBOX, who.email) }, who));   // …and comes back
  const c = {}; r.cookies.forEach(s => { const m = /^([^=]+)=([^;]*)/.exec(s); if (m) c[m[1]] = m[2]; });
  G[name] = { id: r.json.me.id, tag: r.json.me.tag, h: { cookie: 'knoll_s=' + c.knoll_s + '; knoll_in=' + c.knoll_in, 'x-real-ip': '10.3.0.' + (++ipN) } };
}
const see = who => call(friends, 'GET', '/api/friends', undefined, G[who].h);
const act = (who, body) => call(friends, 'POST', '/api/friends', body, G[who].h);
const door = (who, body) => call(wall, 'POST', '/api/wall', body, G[who].h);
const read = (who, q) => call(wall, 'GET', '/api/wall' + q, undefined, who ? G[who].h : undefined);
const gate = (who, q) => call(auth, 'GET', '/api/auth' + q, undefined, who ? G[who].h : undefined);
const piece = (x, i) => ({ k: 'd', f: 'tm-p01-slab-03', o: 0, x: x || 0, y: 0, z: 100 });
const edit = async (who, page, put, del) => door(who, { op: 'edit', page, base: (await read(null, '?page=' + page)).json.rev, put: put || {}, del: del || [] });
const kinds = notes => notes.map(x => x.kind);
// a newcomer makes three edits an hour; the test's stranger makes more, so the hour is wound on by hand between sections
const breathe = who => { const h = Math.floor(Date.now() / 36e5); return wall.dbm([['DEL', wall.K.rl('u:' + G[who].id, h)], ['DEL', wall.K.rl('e:' + G[who].id, h)]]); };

(async () => {
  for (const name of ['Mossy', 'Juno', 'Bram', 'Pip']) await join(name);
  await wall.db('HSET', wall.K.user(G.Pip.id), 'role', 'mod');
  A.deepStrictEqual(Object.values(G).map(g => g.tag), ['Mossy#1', 'Juno#1', 'Bram#1', 'Pip#1'], 'four gnomes through the gate, one made a moderator by hand');

  // ── a space, tended: its maker, an invited friend who keeps it, a stranger who proposes ──
  let r = await door('Mossy', { op: 'page', slug: 'hollow', title: 'Mossy Hollow', chaos: 1, feats: [true, true, true, false, false, false] });
  A.strictEqual((await read(null, '?rules=1&page=hollow')).json.every, 6, 'a page\'s clock comes round every six hours unless its maker says otherwise');
  A.deepStrictEqual([r.json.ok, r.json.page.chaos, r.json.page.feats], [true, 1, [true, true, true, false, false, false]], 'Mossy makes a tended space with its six switches');
  await act('Mossy', { op: 'ask', tag: 'Juno#1' }); await act('Juno', { op: 'answer', id: G.Mossy.id, yes: true });
  r = await act('Mossy', { op: 'invite', slug: 'hollow', ids: [G.Juno.id] }); A.strictEqual(r.json.sent, 1, 'Mossy invites Juno');
  r = await see('Juno'); A.deepStrictEqual([r.json.notes[0].kind, r.json.notes[0].slug, r.json.notes[0].title, r.json.notes[0].from.tag], ['keeper', 'hollow', 'Mossy Hollow', 'Mossy#1'], "Juno's bell says she keeps Mossy Hollow now");
  r = await read('Juno', '?rules=1&page=hollow'); A.deepStrictEqual([r.json.keeper, r.json.owner, r.json.keepers.map(k => k.tag)], [true, false, ['Mossy#1', 'Juno#1']], '?rules names the keepers by tag, and says Juno is one');
  r = await read('Mossy', '?rules=1&page=hollow'); A.deepStrictEqual([r.json.keeper, r.json.owner], [true, true], '…and Mossy the maker');
  r = await edit('Juno', 'hollow', { abcdefgh0001: piece(10) }); A.strictEqual(r.json.status, 'live', "Juno's edit is live: a keeper needs no standing");
  r = await edit('Bram', 'hollow', { abcdefgh0002: piece(20) }); const q1 = r.json.edit; A.deepStrictEqual([r.json.status, r.json.why], ['queued', 'small'], "Bram, a stranger with no standing, waits for the keepers");
  r = await door('Juno', { op: 'review', edit: q1, do: 'approve' }); A.strictEqual(r.json.status, 'live', 'Juno, a keeper, accepts it');
  r = await see('Bram'); A.deepStrictEqual([r.json.notes[0].kind, r.json.notes[0].title, r.json.notes[0].from.tag, r.json.unseen], ['okd', 'Mossy Hollow', 'Juno#1', 1], "Bram's bell says his edit at Mossy Hollow went up, and who put it up");
  r = await edit('Bram', 'hollow', { abcdefgh0003: piece(30) }); const q2 = r.json.edit;
  r = await door('Juno', { op: 'review', edit: q2, do: 'reject', why: 'not there' }); A.strictEqual(r.json.status, 'rejected', 'Juno turns the next one back');
  r = await see('Bram'); A.deepStrictEqual([r.json.notes[0].kind, r.json.notes[0].why], ['rej', 'not there'], '…and Bram reads why');
  r = await edit('Bram', 'hollow', { abcdefgh0001: piece(99) }); A.deepStrictEqual([r.json.status, r.json.why], ['queued', 'others'], "Bram moving Juno's piece is a proposal: others");
  await door('Juno', { op: 'review', edit: r.json.edit, do: 'reject', why: 'leave it' });   // two waiting is the cap, site-wide

  // ── the council ───────────────────────────────────────────────────────
  await breathe('Bram');
  r = await door('Juno', { op: 'settings', page: 'hollow', chaos: 2 }); A.deepStrictEqual([r.status, r.json.code], [403, 'owner'], 'a keeper does not set the rules');
  r = await door('Mossy', { op: 'settings', page: 'hollow', every: 5 }); A.deepStrictEqual([r.status, r.json.code], [400, 'every'], 'the clock comes round every 1, 3, 6, 12, 24, 72 or 168 hours, and no other');
  r = await door('Mossy', { op: 'settings', page: 'hollow', chaos: 2, every: 24 });
  A.deepStrictEqual([r.json.rules.chaos, r.json.rules.every, Math.abs(r.json.rules.closes - Date.now() - 24 * 3600e3) < 5000], [2, 24, true], 'the maker calls a council whose clock comes round daily: the first round is a day from now');
  r = await edit('Bram', 'hollow', { abcdefgh0004: piece(40) }); A.deepStrictEqual([r.json.status, r.json.why], ['motion', 'council'], "Bram's next edit is a motion on the ballot");
  r = await see('Juno'); A.strictEqual(kinds(r.json.notes)[0], 'ballot', "…and Juno's bell rings: the ballot has a motion on it");
  r = await see('Mossy'); A.strictEqual(kinds(r.json.notes)[0], 'ballot', "…so does Mossy's");
  r = await edit('Bram', 'hollow', { abcdefgh0005: piece(50) }); A.strictEqual(r.json.status, 'motion', 'a second motion');
  r = await see('Juno'); A.strictEqual(kinds(r.json.notes).filter(k => k === 'ballot').length, 1, '…rings no bell: the keepers are told once per ballot');
  r = await read('Bram', '?ballot=1&page=hollow'); A.deepStrictEqual([r.json.queue.length, r.json.chaos, r.json.quorum], [2, 2, 3], 'the ballot lists both, with the rules');
  r = await door('Bram', { op: 'vote', edit: r.json.queue[0].id, aye: true }); A.deepStrictEqual([r.status, r.json.code], [403, 'self'], 'Bram cannot vote on his own');
  r = await door('Juno', { op: 'vote', edit: (await read(null, '?ballot=1&page=hollow')).json.queue[0].id, aye: true }); A.deepStrictEqual([r.status, r.json.code], [403, 'role'], 'Juno, with no standing day, cannot vote either — a keeper is not a voter');
  await wall.db('SADD', wall.K.days(G.Juno.id), '2026-09-01');
  r = await door('Juno', { op: 'vote', edit: (await read(null, '?ballot=1&page=hollow')).json.queue[0].id, aye: true }); A.deepStrictEqual([r.json.ok, r.json.ayes], [true, 1], '…with one, she can');

  // ── uninvite ──────────────────────────────────────────────────────────
  r = await act('Bram', { op: 'uninvite', slug: 'hollow', ids: [G.Juno.id] }); A.deepStrictEqual([r.status, r.json.code], [403, 'owner'], 'only the maker uninvites');
  r = await act('Mossy', { op: 'uninvite', slug: 'hollow', ids: [G.Juno.id, 'x'] }); A.deepStrictEqual([r.json.ok, r.json.gone], [true, 1], 'Mossy uninvites Juno');
  r = await read('Juno', '?rules=1&page=hollow'); A.deepStrictEqual([r.json.keeper, r.json.keepers.length], [false, 1], '…who keeps it no longer');
  r = await edit('Juno', 'hollow', { abcdefgh0006: piece(60) }); A.strictEqual(r.json.status, 'motion', "…and whose next edit is a motion like anybody's");
  r = await door('Mossy', { op: 'review', edit: r.json.edit, do: 'reject', why: 'no' }); A.strictEqual(r.json.status, 'rejected', 'the maker vetoes it');
  r = await see('Juno'); A.deepStrictEqual([r.json.notes[0].kind, r.json.notes[0].ayes, r.json.notes[0].nays], ['failed', 0, 0], "Juno's bell says her motion fell, with the tally");

  // ── the moderators' list of gnomes carries the habits ────────────────
  r = await gate('Bram', '?users=1'); A.strictEqual(r.status, 403, 'the list of gnomes is the moderators\'');
  r = await gate('Pip', '?users=1'); const bram = r.json.users.find(u => u.id === G.Bram.id), juno = r.json.users.find(u => u.id === G.Juno.id);
  A.deepStrictEqual([bram.held, bram.okd, bram.rej, bram.watched, juno.rvw, juno.votes, bram.pw, bram.avatar], [5, 1, 2, false, 3, 1, undefined, undefined], 'the moderators see what each gnome held, had approved or rejected, reviewed and voted — and never a secret word');
  r = await door('Pip', { op: 'role', user: G.Bram.id, watch: true }); A.strictEqual(r.json.watched, true, 'Pip watches Bram');
  r = await gate('Pip', '?users=1'); A.strictEqual(r.json.users.find(u => u.id === G.Bram.id).watched, true, '…and the list says so');
  r = await read('Pip', '?audit=50'); const what = r.json.audit.map(e => e.what);
  A.ok(what.includes('invite') && what.includes('uninvite') && what.includes('settings') && what.includes('review') && what.includes('role'), 'the record holds the invite, the uninvite, the settings, the reviews and the watch: ' + what.join(' '));

  // ── THE COUNCIL'S CLOCK, AND HEARTS (2026-09-28): Bram's two motions wait on the ballot, the first with Juno's aye ──
  const ballot = async who => (await read(who, '?ballot=1&page=hollow')).json, from = (who, ip) => Object.assign({}, G[who].h, { 'x-real-ip': ip });
  const round = async () => { await wall.db('HSET', wall.K.page('hollow'), 'closes', String(Date.now() - 1)); return ballot(null); };   // the clock, wound on to a moment ago (what was filed after it came round waits for the next)
  await wall.db('SADD', wall.K.days(G.Mossy.id), '2026-09-01');   // Mossy has a standing day now, as Juno has
  let b = await ballot('Juno');
  const [m4, m5] = b.queue.map(m => m.id);
  A.deepStrictEqual([b.every, b.waiting.map(w => [w.id, w.size, w.hearts, w.hearted, w.name])], [24, [[m4, 1, 1, true, 'Bram#1'], [m5, 1, 0, false, 'Bram#1']]], 'the ballot\'s pictures: each edit that waits, how much it changes, its hearts and whether one is yours');
  r = await door('Bram', { op: 'heart', edit: m5 }); A.deepStrictEqual([r.status, r.json.code], [403, 'self'], 'no heart for your own');
  r = await call(wall, 'POST', '/api/wall', { op: 'heart', edit: m5 }, from('Mossy', G.Bram.h['x-real-ip'])); A.deepStrictEqual([r.status, r.json.code], [403, 'self'], '…nor from the address it was sent from');
  r = await door('Bram', { op: 'heart', edit: 'nonsense' }); A.deepStrictEqual([r.status, r.json.code], [400, 'heart'], 'a heart wants an edit');
  r = await door('Pip', { op: 'heart', edit: m5 }); A.deepStrictEqual([r.json.ok, r.json.hearts, r.json.hearted, r.json.status], [true, 1, true, 'motion'], 'Pip gives the second a heart: on a motion, that is an aye — and nothing goes up before the clock comes round');
  r = await door('Mossy', { op: 'heart', edit: m5 }); A.deepStrictEqual([r.json.hearts, r.json.ayes, r.json.nays], [2, 2, 0], 'Mossy another');
  r = await door('Pip', { op: 'heart', edit: m5, on: false }); A.deepStrictEqual([r.json.hearts, r.json.hearted], [1, false], 'a heart taken back is no vote at all');
  r = await door('Pip', { op: 'heart', edit: m5 }); A.strictEqual(r.json.hearts, 2, '…and given again');
  b = await ballot('Pip'); A.deepStrictEqual(b.waiting.map(w => [w.id, w.hearts, w.hearted]), [[m5, 2, true], [m4, 1, false]], 'of two that change as much, the one with more hearts is first');
  b = await round();
  A.deepStrictEqual([b.waiting.map(w => w.id), b.last.carried, b.last.waiting, Math.abs(b.closesAt - Date.now() - 24 * 3600e3) < 5000], [[m4], 1, 1, true], 'the clock comes round: the one with the most hearts goes up, the other waits, and the next round is a day on');
  r = await read(null, '?edit=' + m5 + '&page=hollow'); A.deepStrictEqual([r.json.edit.status, (await read(null, '?page=hollow')).json.wall.items.some(it => it.n === 'abcdefgh0005')], ['live', true], '…and is on the wall');
  r = await see('Bram'); A.deepStrictEqual([r.json.notes[0].kind, r.json.notes[0].ayes], ['passed', 2], 'Bram\'s bell says his motion carried, with its hearts');
  r = await door('Pip', { op: 'vote', edit: m4, aye: false }); A.deepStrictEqual([r.json.ayes, r.json.nays], [1, 1], 'a nay against the one that waits: one heart, one nay');
  b = await round(); A.deepStrictEqual([b.waiting.map(w => w.id), b.last.carried, b.last.waiting], [[m4], 0, 1], 'with no more hearts than nays it does not go up, and waits on');
  await door('Juno', { op: 'heart', edit: m4, on: false }); await door('Pip', { op: 'heart', edit: m4, on: false });
  b = await round(); A.deepStrictEqual([b.waiting.map(w => [w.id, w.hearts]), b.last.carried], [[[m4, 0]], 0], 'nor with no heart at all');
  r = await door('Mossy', { op: 'heart', edit: m4 }); b = await round(); A.deepStrictEqual([b.waiting.length, b.last.carried, b.last.waiting], [0, 1, 0], 'one heart is enough when it is the most there is');
  // …but not for a drastic edit, which wants three to be in the running at all
  await breathe('Juno');
  const many = {}; for (let i = 0; i < 45; i++) many['abcdefgh1' + String(i).padStart(3, '0')] = piece(i * 5);
  r = await edit('Juno', 'hollow', many); const big = r.json.edit; A.deepStrictEqual([r.json.status, r.json.cls], ['motion', 'drastic'], 'forty-five pieces at once is a drastic motion');
  await door('Mossy', { op: 'heart', edit: big }); await door('Pip', { op: 'heart', edit: big });
  b = await round(); A.deepStrictEqual([b.waiting.map(w => [w.id, w.hearts, w.size]), b.last.carried], [[[big, 2, 45]], 0], 'two hearts do not carry it');
  await wall.db('SADD', wall.K.days(G.Bram.id), '2026-09-01'); await wall.db('HSET', wall.K.user(G.Bram.id), 'watch', '0');
  r = await door('Bram', { op: 'heart', edit: big }); b = await round(); A.deepStrictEqual([r.json.hearts, b.waiting.length, b.last.carried], [3, 0, 1], 'three do');
  // a motion the clock never takes lapses in a week; and on a page that is a council no longer, what waited for the clock falls to the moderators
  await breathe('Juno');
  r = await edit('Juno', 'hollow', { abcdefgh0007: piece(70) }); const m7 = r.json.edit; A.deepStrictEqual([r.json.status, Math.abs(r.json.closes - b.closesAt) < 5], ['motion', true], 'a new motion is told when the clock next comes round');
  r = await edit('Juno', 'hollow', { abcdefgh0008: piece(80) }); const m8 = r.json.edit;
  const old = JSON.parse(await wall.db('GET', wall.K.edit(m7))); old.at = Date.now() - 8 * 86400e3; await wall.db('SET', wall.K.edit(m7), JSON.stringify(old));
  await wall.sweepQueue(wall.pageKeys('hollow'));
  A.strictEqual(JSON.parse(await wall.db('GET', wall.K.edit(m7))).status, 'expired', 'a motion eight days old has lapsed');
  r = await door('Mossy', { op: 'settings', page: 'hollow', chaos: 1 }); await wall.sweepQueue(wall.pageKeys('hollow'));
  const fell = JSON.parse(await wall.db('GET', wall.K.edit(m8))); A.deepStrictEqual([fell.status, fell.tick, (await read(null, '?queue=1&page=hollow')).json.queue.map(q => q.status)], ['queued', undefined, ['queued']], 'tended again: the motion that waited for the clock waits for the moderators');
  // on a tended page a heart decides nothing, and anybody signed in gives one
  r = await door('Bram', { op: 'heart', edit: m8 }); A.deepStrictEqual([r.json.ok, r.json.hearts, r.json.status], [true, 1, 'queued'], 'Bram — watched, with no standing — gives Juno\'s waiting edit a heart');
  r = await door('Bram', { op: 'vote', edit: m8, aye: false }); A.deepStrictEqual([r.status, r.json.code], [409, 'decided'], '…and no nay: an edit that waits for the moderators is not voted on');
  b = await ballot('Bram'); A.deepStrictEqual([b.queue.length, b.waiting.map(w => [w.id, w.status, w.hearts, w.hearted])], [0, [[m8, 'queued', 1, true]]], 'the ballot of a tended page has its picture too, and no motion');
  r = await door('Mossy', { op: 'review', edit: m8, do: 'approve' }); A.strictEqual(r.json.status, 'live', 'the moderators decide it, hearts or none');

  fs.rmSync(TMP, { recursive: true, force: true });
  console.log('verify-chaos: ' + n + ' checks, all good');
})().catch(e => { fs.rmSync(TMP, { recursive: true, force: true }); console.error('verify-chaos: FAILED after ' + n + ' checks\n' + (e && e.stack || e)); process.exit(1); });
