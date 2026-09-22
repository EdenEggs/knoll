/* toem2/probe-wall-api.js — api/wall.js, in this process, against a throwaway
   file store. No server, no browser, no network: the module is required with
   WALL_DB pointed at a temp file, called with a fake (req, res) the way
   serve.js and Vercel call it, and every rule in its head is tried once —
   the seed, the queue, the caps, canon, no-ops, the rate, the compare-and-
   set, roles, standing days and tiers, the footprint, revert, strike, undo.
   The real wall-seed.json is read (it is the seed) and never written.

   Run:  node toem2/probe-wall-api.js */
'use strict';
const fs = require('fs'), path = require('path'), os = require('os'), crypto = require('crypto');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'toem2-wall-'));
process.env.WALL_DB = path.join(tmp, 'wall-db.json');
delete process.env.KV_REST_API_URL; delete process.env.UPSTASH_REDIS_REST_URL; delete process.env.VERCEL;
process.env.ADMIN_EMAILS = 'owner@example.com';
const API = require('../api/wall.js');
const SEED = path.join(__dirname, 'wall-seed.json');
const hash = f => crypto.createHash('sha1').update(fs.readFileSync(f)).digest('hex');
const seedBefore = hash(SEED);

let fails = 0;
const check = (name, ok, info) => { if (!ok) fails++; console.log((ok ? '  PASS  ' : '  FAIL  ') + name + (info == null || info === '' ? '' : '   ' + info)); };
const j = v => JSON.stringify(v);
const brief = r => j({ status: r.status, ok: r.json.ok, s: r.json.status, code: r.json.code, rev: r.json.rev, cls: r.json.cls, why: r.json.why });

// ── the handler, called the way the hosts call it ─────────────────────────
function call(method, url, body, token, ip) {
  return new Promise(resolve => {
    const req = { method, url, headers: { 'x-real-ip': ip || '10.0.0.1', host: 'localhost:4321' }, socket: { remoteAddress: '127.0.0.1' },
                  body: method === 'POST' ? (body || {}) : undefined };
    if (token) req.headers.authorization = 'Bearer ' + token;
    const res = { statusCode: 200, headers: {}, setHeader(k, v) { this.headers[k] = v; },
                  end(s) { let json = null; try { json = JSON.parse(s); } catch (e) {} resolve({ status: this.statusCode, json: json || {}, text: String(s || ''), headers: this.headers }); } };
    API(req, res).catch(e => resolve({ status: 500, json: { ok: false, error: String((e && e.message) || e) } }));
  });
}
const U = { adm: 'a'.repeat(16), nu: 'b'.repeat(16), nu2: 'c'.repeat(16), tr: 'd'.repeat(16), mod: 'e'.repeat(16), mod2: 'f'.repeat(16), con: '1'.repeat(16), ban: '2'.repeat(16), nu3: '3'.repeat(16),
            nu4: '4'.repeat(16), con2: '5'.repeat(16), tr2: '6'.repeat(16), tr3: '7'.repeat(16), tr4: '8'.repeat(16), tr5: '9'.repeat(16), nu6: 'ab'.repeat(8) };
const ROLE = { adm: 'admin', mod: 'mod', mod2: 'mod', tr: 'trusted', tr2: 'trusted', tr3: 'trusted', tr4: 'trusted', tr5: 'trusted' };
const realDb = path.join(__dirname, 'wall-db.json'), realDbBefore = fs.existsSync(realDb);
const T = {};
const GET = (q, who) => call('GET', '/api/wall' + (q || ''), null, who ? T[who] : null);
const ipOf = who => '10.0.0.' + (Object.keys(U).indexOf(who) + 10);
const POST = (body, who, ip) => call('POST', '/api/wall', body, who ? T[who] : null, ip || (who ? ipOf(who) : '10.0.0.1'));
const doc = async () => (await GET()).json;
const head = async () => (await doc()).rev;
const at = (d, n) => d.wall.items.find(it => it.n === n);
const nm = i => 'test' + String(i).padStart(4, '0');
const fresh = (k, extra) => Object.assign({ k: k || 'd', f: 'tm-p01-slab-03', o: 0, x: 0, y: 0, z: 100 }, extra || {});
const edit = async (who, put, del, more) => POST(Object.assign({ op: 'edit', base: await head(), put: put || {}, del: del || [] }, more || {}), who);

(async () => {
  try {
    for (const [who, u] of Object.entries(U)) {
      await API.db('HSET', API.K.user(u), 'made', '1', 'name', who, 'role', ROLE[who] || 'user');
      T[who] = await API.mintSession(u);
    }
    await API.db('HSET', API.K.user(U.ban), 'banned', '1');
    await API.db('SADD', API.K.days(U.con), '2026-09-01', '2026-09-02', '2026-09-03');
    await API.db('SADD', API.K.days(U.con2), '2026-09-01', '2026-09-02', '2026-09-03');

    // ── 1 · the seed ─────────────────────────────────────────────────────
    let d = await doc(), items = d.wall.items, r;
    check('the first GET seeds revision 1 from wall-seed.json', d.ok && d.rev === 1 && items.length === 384 && d.flatfile.list.length === 3, 'rev ' + d.rev + ' · ' + items.length + ' pieces');
    check('every piece is named, no two alike', items.every(it => /^[a-z0-9]{8,20}$/.test(it.n)) && new Set(items.map(it => it.n)).size === 384);
    check("the plates' pieces are canon", items.filter(it => it.c === 1).length === 376, items.filter(it => it.c === 1).length + ' flagged');
    r = await GET('?rev=1'); check('?rev=1 answers same:true', r.json.same === true && r.json.rev === 1);
    r = await GET('?ping=1'); check('ping names the store', r.json.door === true && r.json.store === 'file' && r.json.login === false, j(r.json));
    check('every answer is no-store', /no-store/.test(r.headers['cache-control']));

    // ── 2 · who ──────────────────────────────────────────────────────────
    r = await POST({ op: 'edit' }); check('no session → 401', r.status === 401 && r.json.code === 'who');
    r = await call('POST', '/api/wall', { op: 'edit' }, 'not-a-session'); check('a malformed session → 401', r.status === 401);
    r = await POST({ op: 'edit', base: 1, put: {}, del: [] }, 'ban'); check('a banned account → 403', r.status === 403 && r.json.code === 'banned');
    r = await GET('?me=1', 'nu'); check('?me answers the account: newcomer, rep 0', r.json.ok && r.json.id === U.nu && r.json.tier === 'newcomer' && r.json.rep === 0, j(r.json));

    // ── 3 · a newcomer's edit waits ──────────────────────────────────────
    const canons = items.filter(it => it.k === 'd' && it.c === 1);
    const pick = canons[0], moved = Object.assign({}, pick, { x: pick.x + 50, y: pick.y + 30 });
    r = await edit('nu', { [pick.n]: moved }); const e1 = r.json.edit;
    check("a newcomer's one-piece move is queued, small", r.status === 200 && r.json.status === 'queued' && r.json.cls === 'small', j(r.json));
    d = await doc(); check('…and the wall is still revision 1, the piece where it was', d.rev === 1 && at(d, pick.n).x === pick.x);
    r = await GET('?queue=1'); check('the queue lists it', r.json.queue.length === 1 && r.json.queue[0].id === e1 && r.json.queue[0].n.put === 1 && r.json.queue[0].by === U.nu);
    r = await edit('nu', { [canons[1].n]: Object.assign({}, canons[1], { x: canons[1].x + 40 }) }); const e2 = r.json.edit;
    check('a second one is queued too', r.json.status === 'queued');
    r = await edit('nu', { [canons[2].n]: Object.assign({}, canons[2], { x: canons[2].x + 40 }) });
    check('a third, with two waiting, is refused: queue-full', r.status === 429 && r.json.code === 'queue-full', j(r.json));
    r = await GET('?me=1', 'nu'); check('?me lists the two pending', r.json.pending.length === 2 && r.json.pending[0] === e1);

    // ── 4 · approve, reject ──────────────────────────────────────────────
    r = await POST({ op: 'review', edit: e1, do: 'approve' }, 'nu3'); check('a newcomer cannot approve', r.status === 403, brief(r));
    r = await POST({ op: 'review', edit: e1, do: 'approve' }, 'adm');
    check('the admin approves it: revision 2', r.status === 200 && r.json.status === 'live' && r.json.rev === 2, j(r.json));
    d = await doc(); check('the wall has the moved piece, and 384 pieces still', d.rev === 2 && at(d, pick.n).x === moved.x && d.wall.items.length === 384);
    r = await GET('?log=1'); const l0 = r.json.log[0];
    check("the log's head is revision 2, by the newcomer, approved by the admin", l0.rev === 2 && l0.by === U.nu && l0.via === U.adm && l0.how === 'approved' && l0.n.put === 1, j(l0));
    const rev2 = JSON.parse(await API.db('GET', API.K.revN(2)));
    check('the revision keeps the put and what the piece was before', rev2.put[pick.n].x === moved.x && rev2.prev[pick.n].x === pick.x);
    r = await GET('?edit=' + e1); check('the edit reads live, at revision 2', r.json.edit.status === 'live' && r.json.edit.rev === 2);
    r = await POST({ op: 'review', edit: e2, do: 'reject', why: 'not there' }, 'adm'); check('the admin rejects the other', r.json.status === 'rejected');
    r = await GET('?edit=' + e2); check('…and it reads rejected: not there', r.json.edit.status === 'rejected' && r.json.edit.why === 'not there');
    r = await POST({ op: 'review', edit: e2, do: 'approve' }, 'adm'); check('a decided edit cannot be decided again', r.status === 409);
    d = await doc(); check('the wall is unchanged by a rejection', d.rev === 2);
    r = await GET('?me=1', 'nu'); check('the newcomer has one standing day, nothing pending', r.json.rep === 1 && r.json.pending.length === 0, j(r.json));
    r = await GET('?queue=1'); check('the queue is empty', r.json.queue.length === 0);

    // ── 5 · stale, and live at once ──────────────────────────────────────
    r = await POST({ op: 'edit', base: 1, put: { [pick.n]: Object.assign({}, pick, { x: pick.x + 90 }) }, del: [] }, 'mod');
    check('base 1 against revision 2, the same piece → 409 stale, with the wall inline', r.status === 409 && r.json.code === 'stale' && r.json.rev === 2 && r.json.doc && r.json.doc.wall.items.length === 384, brief(r));
    r = await edit('adm', { [canons[2].n]: Object.assign({}, canons[2], { x: canons[2].x + 40 }) });
    check("the admin's edit with the right base is live at once: revision 3", r.json.status === 'live' && r.json.rev === 3, j(r.json));

    // ── 6 · the caps ─────────────────────────────────────────────────────
    const big = {}; for (let i = 0; i < 501; i++) big[nm(i)] = fresh();
    r = await edit('adm', big); check('501 pieces in one edit → 413', r.status === 413 && r.json.code === 'ops');
    r = await edit('adm', { [nm(1)]: fresh('s', { d: 'M0 0' + 'L1 1'.repeat(9000), c: '#000', sw: 3 }) }); check('a 33 KB piece → 413', r.status === 413 && r.json.code === 'record');
    r = await edit('adm', { [nm(1)]: fresh('q') }); check('an unknown kind → 400', r.status === 400 && r.json.code === 'kind');
    r = await edit('adm', { [nm(1)]: { k: 't', x: 0, y: 0, t: 'x'.repeat(281), c: '#000', f: 0, sz: 20 } }); check('a 281-character note → 413', r.status === 413 && r.json.code === 'note');
    r = await edit('adm', { [nm(1)]: fresh('d', { abc: 'no', L: 5 }) }); d = await doc();
    check('a three-letter field is dropped from the stored piece', r.json.status === 'live' && at(d, nm(1)) && at(d, nm(1)).abc === undefined && at(d, nm(1)).L === 5, j(at(d, nm(1))));
    const tracing = { id: 'trace000', name: 'x', w: 10, h: 10, d: '<path fill-rule="evenodd" fill="#aabbcc" d="M0 0h10v10z"/>', colors: 1, paths: 1 };
    r = await edit('adm', { [nm(2)]: fresh() }, [], { art: [tracing] }); d = await doc();
    check('a tracing no stamp asks for is dropped', r.json.status === 'live' && d.flatfile.list.length === 3);
    r = await edit('adm', { [nm(3)]: fresh('i', { f: 'trace000' }) }, [], { art: Array.from({ length: 7 }, (_, i) => Object.assign({}, tracing, { id: 'trace00' + i })) });
    check('7 tracings → 413', r.status === 413 && r.json.code === 'art');
    r = await edit('adm', { [nm(3)]: fresh('i', { f: 'trace000' }) }); check('a stamp from a tracing the wall has not got → 400 no-art', r.status === 400 && r.json.code === 'no-art');
    r = await edit('adm', { [nm(3)]: fresh('i', { f: 'trace000' }) }, [], { art: [tracing] }); d = await doc();
    check('with the tracing along, the stamp lands and the tracing is filed', r.json.status === 'live' && d.flatfile.list.length === 4 && at(d, nm(3)).f === 'trace000');
    r = await edit('adm', { [nm(4)]: fresh('d', { x: 1e6 }) }); check('a piece a million px out → 400', r.status === 400 && r.json.code === 'where');
    r = await edit('adm', { [nm(4)]: fresh('v', { id: 'nope', w: 640, h: 360 }) }); check('a video that is not a YouTube id → 400', r.status === 400 && r.json.code === 'video');
    r = await edit('adm', { [nm(4)]: fresh('g', { u: 'https://evil.example/x.gif', w: 10, h: 10 }) }); check('a gif from off KLIPY → 400', r.status === 400 && r.json.code === 'gif');
    r = await edit('adm', { 'not a name': fresh() }); check('a piece with no name → 400', r.status === 400 && r.json.code === 'name');

    // ── 6b · the hardening: what a piece or a tracing may carry ─────────
    const evil = Object.assign({}, tracing, { id: 'trace0ev', d: '<path fill-rule="evenodd" fill="#aabbcc" d="M0 0h10v10z"/><image href="x" onerror="alert(1)"/>' });
    r = await edit('adm', { [nm(6)]: fresh('i', { f: 'trace0ev' }) }, [], { art: [evil] }); check('a tracing carrying anything but paths → 400', r.status === 400 && r.json.code === 'tracing', brief(r));
    const sly = Object.assign({}, tracing, { id: 'trace0sl', d: '<path fill-rule="evenodd" fill="#aabbcc" d="M0 0h10v10z" onclick="alert(1)"/>' });
    r = await edit('adm', { [nm(6)]: fresh('i', { f: 'trace0sl' }) }, [], { art: [sly] }); check('…or a path with an attribute the table never writes → 400', r.status === 400 && r.json.code === 'tracing', brief(r));
    const odd = Object.assign({}, tracing, { id: 'trace0od', extra: { deep: 'thing' }, __proto__: { polluted: 1 } });
    r = await edit('adm', { [nm(6)]: fresh('i', { f: 'trace0od' }) }, [], { art: [odd] }); d = await doc();
    check('a good tracing lands with exactly its own fields, nothing extra kept', r.json.status === 'live' && (() => { const t = d.flatfile.list.find(x => x.id === 'trace0od'); return t && t.extra === undefined && t.polluted === undefined && j(Object.keys(t).sort()) === j(['at', 'colors', 'd', 'h', 'id', 'name', 'paths', 'w']); })(), brief(r));
    r = await edit('adm', { [nm(7)]: fresh('g', { u: 'https://static.klipy.com/a/b.gif"><script>1</script>', w: 10, h: 10 }) }); check('a gif url with a quote in it → 400', r.status === 400 && r.json.code === 'gif');
    r = await edit('adm', { [nm(7)]: fresh('g', { u: 'https://klipy.evil.example/a.gif', w: 10, h: 10 }) }); check('a gif from a host that only mentions klipy → 400', r.status === 400 && r.json.code === 'gif');
    r = await edit('adm', { [nm(7)]: fresh('g', { u: 'https://static.klipy.com/a/b.gif?x=1', w: 10, h: 10 }) }); check('a gif from KLIPY, with a query, lands', r.json.status === 'live', brief(r));
    r = await edit('adm', { [nm(8)]: fresh('v', { id: 'rz-iZ1QvCDk', w: '640', h: 360 }) }); check('a video whose size is not a number → 400', r.status === 400);
    r = await edit('adm', { [nm(8)]: { k: 't', x: 0, y: 0, t: 'hi', c: '#000', f: 0, sz: 1e9 } }); check('a note sized a billion → 400', r.status === 400 && r.json.code === 'record');
    r = await edit('adm', { [nm(8)]: fresh('s', { d: 'M0 0L1 1', c: '#000', sw: 1e9 }) }); check('a stroke a billion wide → 400', r.status === 400 && r.json.code === 'record');
    r = await edit('adm', { [nm(8)]: fresh('s', { d: 'M0 0L1 1', c: '#000' }) }); check('a stroke with no width → 400', r.status === 400 && r.json.code === 'stroke');
    r = await edit('adm', { [nm(8)]: fresh('d', { L: 5e7 }) }); check('any number past a million → 400', r.status === 400 && r.json.code === 'record');
    r = await edit('adm', { [nm(8)]: { k: 't', x: 0, y: 0, t: 'hi', c: '#000', f: 0, sz: 20, w: 0, a: 2, b: 'yes' } }); d = await doc();
    check('a note with no width, right-aligned, bold as a word: kept, the word made a flag', r.json.status === 'live' && at(d, nm(8)).w === 0 && at(d, nm(8)).a === 2 && at(d, nm(8)).b === 1, j(at(d, nm(8))));
    const ck = at(d, canons[5].n);
    r = await edit('adm', { [ck.n]: Object.assign({}, ck, { c: 'yes' }) }); check('canon as a word is a no-op for a moderator (it was already a flag)', r.status === 400 && r.json.code === 'no-op', brief(r));
    r = await edit('tr', { [ck.n]: { n: ck.n, k: 'v', id: 'rz-iZ1QvCDk', w: 640, h: 360, x: ck.x, y: ck.y, z: 300 } });
    check("turning one of the plates' pieces into a video is one of them gone: drastic", r.json.status === 'motion' && r.json.cls === 'drastic', brief(r));
    r = await POST({ op: 'review', edit: r.json.edit, do: 'reject' }, 'adm');

    // ── 7 · canon ────────────────────────────────────────────────────────
    r = await edit('tr', { [nm(5)]: fresh('d', { c: 1 }) }); d = await doc();
    check('a non-moderator cannot make a piece canon', r.json.status === 'live' && at(d, nm(5)) && at(d, nm(5)).c === undefined, j(at(d, nm(5))));
    const cp = at(d, canons[3].n);
    r = await edit('nu3', {}, [cp.n]); check('a newcomer deleting a plate piece is refused as drastic', r.status === 400 && r.json.code === 'drastic', j(r.json));
    r = await edit('tr', {}, [cp.n]); check('a trusted user deleting one is a motion, drastic', r.json.status === 'motion' && r.json.cls === 'drastic', j(r.json));
    r = await edit('tr', { [cp.n]: Object.assign({}, cp, { x: cp.x + 12000 }) }); check('…and pushing one off the plates: a motion, drastic', r.json.status === 'motion' && r.json.cls === 'drastic', j(r.json));
    const drastic = (await GET('?queue=1')).json.queue.filter(e => e.cls === 'drastic').map(e => e.id);
    r = await POST({ op: 'review', edit: drastic[0], do: 'reject', why: 'not now' }, 'mod'); const r2 = await POST({ op: 'review', edit: drastic[1], do: 'reject' }, 'mod');
    check('a moderator can veto both', drastic.length === 2 && r.json.status === 'rejected' && r2.json.status === 'rejected');
    r = await edit('tr', { [cp.n]: Object.assign({}, cp, { x: cp.x + 100 }) }); check('…while moving one 100 px across the plates is small, and live for the trusted', r.json.status === 'live' && r.json.cls === 'small', j(r.json));
    d = await doc(); check('…and it is still canon afterwards', at(d, cp.n).c === 1 && at(d, cp.n).x === cp.x + 100);
    r = await edit('adm', { [cp.n]: Object.assign({}, at(d, cp.n), { c: undefined }) }); d = await doc();
    check('a moderator can take canon off a piece', r.json.status === 'live' && at(d, cp.n).c === undefined);
    r = await edit('adm', { [cp.n]: Object.assign({}, at(d, cp.n), { c: 1 }) }); d = await doc();
    check('…and give it back', r.json.status === 'live' && at(d, cp.n).c === 1);

    // ── 8 · no-ops ───────────────────────────────────────────────────────
    const cpNow = at(d, cp.n);
    r = await edit('adm', { [cp.n]: Object.assign({}, cpNow, { x: cpNow.x + 1 }) }); check('a 1 px nudge is a no-op → 400', r.status === 400 && r.json.code === 'no-op');
    r = await edit('adm', { [cp.n]: Object.assign({}, cpNow) }); check('a piece sent back unchanged is a no-op → 400', r.status === 400 && r.json.code === 'no-op');
    r = await edit('adm', {}, ['nothere0']); check('deleting a piece that is not there is a no-op → 400', r.status === 400 && r.json.code === 'no-op');

    // ── 9 · the rate ─────────────────────────────────────────────────────
    const outs = [];
    for (let i = 0; i < 4; i++) { r = await edit('nu2', { [nm(10 + i)]: fresh() }); outs.push(r.status + ':' + (r.json.status || r.json.code)); }
    check('a newcomer: two queued, the third queue-full, the fourth in the hour is the rate', j(outs) === j(['200:queued', '200:queued', '429:queue-full', '429:rate']), j(outs));

    // ── 10 · the compare-and-set ─────────────────────────────────────────
    const real = API.storeFor(); let stubbed = 0;
    API.useStore({ kind: 'stub', one: (...cmd) => (String(cmd[0]).toUpperCase() === 'EVAL' && !stubbed++ ? Promise.resolve(0) : real.one(...cmd)), many: cmds => real.many(cmds) });
    const was = await head();
    r = await edit('adm', { [nm(20)]: fresh() });
    API.useStore(real);
    check('a write whose script answered 0 measures again and lands at the next revision', stubbed === 2 && r.json.status === 'live' && r.json.rev === was + 1, brief(r) + ' evals ' + stubbed);
    // a concurrent edit to a DIFFERENT piece goes on; to the SAME piece is stale
    const revBefore = await head();
    d = await doc(); const a = at(d, nm(20)), b = at(d, nm(1));
    r = await POST({ op: 'edit', base: revBefore, put: { [a.n]: Object.assign({}, a, { x: 500 }) }, del: [] }, 'adm');
    r = await POST({ op: 'edit', base: revBefore, put: { [b.n]: Object.assign({}, b, { x: 500 }) }, del: [] }, 'mod');
    check('an edit made against an older revision, touching other pieces, goes on', r.json.status === 'live' && r.json.rev === revBefore + 2, brief(r));
    r = await POST({ op: 'edit', base: revBefore, put: { [a.n]: Object.assign({}, a, { x: 700 }) }, del: [] }, 'mod');
    check('…one touching the same piece is stale', r.status === 409 && r.json.code === 'stale', j({ status: r.status, code: r.json.code }));

    // ── 11 · roles ───────────────────────────────────────────────────────
    r = await POST({ op: 'role', user: U.mod2, banned: 1 }, 'mod'); check('a moderator cannot ban a moderator', r.status === 403);
    r = await POST({ op: 'role', user: U.mod2, banned: 1 }, 'adm'); check('the admin can', r.json.ok && r.json.banned === true);
    r = await edit('mod2', {}); check('…and the banned moderator is 403', r.status === 403);
    r = await POST({ op: 'role', user: U.nu, role: 'mod' }, 'mod'); check('a moderator cannot appoint', r.status === 403);
    r = await POST({ op: 'role', user: U.nu, role: 'admin' }, 'adm'); check('not even the admin makes an admin here — ADMIN_EMAILS does', r.status === 403);
    r = await POST({ op: 'role', user: U.adm, banned: 1 }, 'mod'); check('nobody bans the admin', r.status === 403);
    const login = await API.finishLogin('Owner@Example.com'); r = await GET('?me=1', null); r = await call('GET', '/api/wall?me=1', null, login.session);
    check('signing in with an ADMIN_EMAILS address makes the admin', r.json.role === 'admin' && r.json.id === API.userKey('owner@example.com'), j(r.json));
    const login2 = await API.finishLogin('fan@example.com'); r = await call('GET', '/api/wall?me=1', null, login2.session);
    check('…and any other address a newcomer', r.json.role === 'user' && r.json.tier === 'newcomer');
    process.env.ADMIN_EMAILS = '';
    const login3 = await API.finishLogin('owner@example.com'); r = await call('GET', '/api/wall?me=1', null, login3.session);
    check('an address taken off the list is an admin no longer', r.json.role === 'user');
    process.env.ADMIN_EMAILS = 'owner@example.com';
    r = await POST({ op: 'me', name: '  The <Owner> of it all, and then some more words  ' }, 'adm'); check('a name is cleaned and cut to 24', r.json.name === 'The <Owner> of it all, a', j(r.json.name));
    r = await POST({ op: 'logout' }, 'nu2'); r = await GET('?me=1', 'nu2'); check('logout ends the session', r.status === 401);
    // every op counts against the hour, not only edits
    const nu5 = '6'.repeat(15) + 'a'; await API.db('HSET', API.K.user(nu5), 'made', '1', 'name', 'nu5', 'role', 'user'); const t5 = await API.mintSession(nu5);
    const names = []; for (let i = 0; i < 4; i++) { r = await call('POST', '/api/wall', { op: 'me', name: 'n' + i }, t5, '10.0.0.99'); names.push(r.status); }
    check('a newcomer renaming four times in an hour hits the rate on the fourth', j(names) === j([200, 200, 200, 429]), j(names));
    // and a queue has a cap per address as well as per account
    const sess = [], ipq = '10.0.0.77', outq = [];
    for (let i = 0; i < 5; i++) { const u = String(i).repeat(15) + 'b'; await API.db('HSET', API.K.user(u), 'made', '1', 'name', 'q' + i, 'role', 'user'); sess.push(await API.mintSession(u)); }
    for (let i = 0; i < 5; i++) { r = await call('POST', '/api/wall', { op: 'edit', base: await head(), put: { [nm(100 + i)]: fresh() }, del: [] }, sess[i], ipq); outq.push(r.status + ':' + (r.json.status || r.json.code)); }
    check('five newcomers on one address: four queued, the fifth is queue-full', j(outq) === j(['200:queued', '200:queued', '200:queued', '200:queued', '429:queue-full']), j(outq));
    // the replies that are the same for everybody may be kept by the CDN; the rest may not
    r = await GET(); check('the wall itself says s-maxage', /s-maxage=10/.test(r.headers['cache-control']) && r.headers['x-content-type-options'] === 'nosniff', r.headers['cache-control']);
    r = await GET('?at=2'); check('a revision\'s record may be kept a day', /s-maxage=86400/.test(r.headers['cache-control']));
    r = await GET('?queue=1'); check('the queue is no-store', r.headers['cache-control'] === 'no-store');
    r = await GET('?me=1', 'nu'); check('…and so is who you are', r.headers['cache-control'] === 'no-store');
    r = await call('POST', '/api/wall', '{not json', T.adm); check('a post that is not JSON is a 400, not a 500', r.status === 400, r.status + ' ' + r.json.code);

    // ── 12 · standing days and tiers ─────────────────────────────────────
    r = await edit('con', { [nm(30)]: fresh() }); check('three standing days: a small edit goes live', r.json.status === 'live', j(r.json));
    const many = {}; for (let i = 0; i < 25; i++) many[nm(40 + i)] = fresh();
    r = await edit('con', many); check('…but 25 new pieces is large, and waits', r.json.status === 'queued' && r.json.cls === 'large', j(r.json));
    r = await edit('tr', many); check('for the trusted a large edit goes live', r.json.status === 'live' && r.json.cls === 'large', j(r.json));
    await API.db('SADD', API.K.fp(U.tr, new Date().toISOString().slice(0, 10)), ...Array.from({ length: 121 }, (_, i) => 'fp' + i));
    r = await edit('tr', { [nm(70)]: fresh() }); check('121 pieces changed today: even a small edit waits (footprint)', r.json.status === 'queued' && r.json.why === 'footprint', j(r.json));

    // ── 13 · revert, strike, undo ────────────────────────────────────────
    r = await POST({ op: 'revert', rev: 3 }, 'nu6'); check('a newcomer cannot revert', r.status === 403, brief(r));
    d = await doc(); const c2 = canons[2];
    check('(revision 3 moved a piece 40 px)', at(d, c2.n).x === c2.x + 40);
    const before = await head();
    r = await POST({ op: 'revert', rev: 3 }, 'adm'); d = await doc();
    check('the admin reverts revision 3: a new revision, the piece back where it was', r.json.status === 'live' && r.json.rev === before + 1 && at(d, c2.n).x === c2.x, j(r.json));
    r = await POST({ op: 'revert', rev: 1 }, 'adm'); check('revision 1 is not for reverting', r.status === 400);
    await API.db('SADD', API.K.days(U.tr), ...Array.from({ length: 10 }, (_, i) => '2026-08-' + String(i + 1).padStart(2, '0')));
    r = await GET('?me=1', 'tr'); const repWas = r.json.rep;
    check('the trusted user has ten standing days and more', repWas >= 10, repWas + ' days');
    const log = (await GET('?log=1')).json.log, trRevs = log.filter(e => e.by === U.tr && e.how === 'live').map(e => e.rev);
    const st1 = await POST({ op: 'strike', rev: trRevs[0] }, 'mod'); r = await GET('?me=1', 'tr');
    check('a strike takes five days off (to two at most) and counts one', st1.json.ok && r.json.rep === 2 && r.json.strikes === 1 && !r.json.banned, brief(st1) + ' → ' + j({ rep: r.json.rep, strikes: r.json.strikes }));
    const st2 = await POST({ op: 'strike', rev: trRevs[1] }, 'mod'); r = await GET('?me=1', 'tr');
    check('a second strike in thirty days bans', st2.json.ok && r.json.banned === true && r.json.strikes === 2, brief(st2) + ' → ' + j({ banned: r.json.banned, strikes: r.json.strikes }));
    r = await POST({ op: 'role', user: U.tr, banned: 0 }, 'adm'); r = await GET('?me=1', 'tr'); check('a ban lifted clears the strikes', !r.json.banned && r.json.strikes === 0);
    d = await doc(); check('(the contributor\'s piece is on the wall)', !!at(d, nm(30)));
    r = await POST({ op: 'undo', user: U.con, since: 2 }, 'adm'); d = await doc();
    check("undoing a person takes their live revisions back", r.json.reverted === 1 && !at(d, nm(30)), j(r.json));
    r = await POST({ op: 'undo', user: U.con, since: 2 }, 'con'); check('…and it is a moderator\'s to do', r.status === 403);
    r = await edit('mod', { [nm(90)]: fresh() }); const modRev = r.json.rev;
    r = await POST({ op: 'strike', rev: modRev }, 'mod2'); check("a moderator cannot strike a moderator's revision", r.status === 403, brief(r));
    r = await POST({ op: 'undo', user: U.mod, since: 2, strike: 1 }, 'mod2'); check("…nor undo a moderator's work", r.status === 403);
    r = await POST({ op: 'strike', rev: modRev }, 'adm'); check('the admin can strike it', r.json.ok, brief(r));
    r = await POST({ op: 'strike', rev: modRev }, 'adm'); r = await GET('?me=1', 'mod'); check('…and two strikes do not ban a moderator', r.json.strikes === 2 && !r.json.banned, j({ strikes: r.json.strikes, banned: r.json.banned }));
    r = await POST({ op: 'role', user: U.mod, banned: 1 }, 'adm'); r = await POST({ op: 'role', user: U.mod, banned: 0 }, 'adm');

    // ── 15 · the trusted decide the queue ────────────────────────────────
    r = await edit('nu4', { [nm(80)]: fresh() }); const nq = r.json.edit; check('(a newcomer queues a small edit)', r.json.status === 'queued', brief(r));
    r = await POST({ op: 'review', edit: nq, do: 'approve' }, 'con'); check('a contributor cannot decide the queue', r.status === 403);
    r = await POST({ op: 'review', edit: nq, do: 'approve' }, 'tr2'); check('a trusted user approves a small edit: live', r.json.status === 'live', brief(r));
    const approvedRev = r.json.rev;
    r = await POST({ op: 'revert', rev: approvedRev }, 'adm'); check('the admin reverts it', r.json.status === 'live', brief(r));
    r = await edit('tr2', { [nm(80)]: fresh() }); const cq = r.json.edit;
    check('an edit touching a piece a revert just touched waits, even a trusted user’s: contested', r.json.status === 'queued' && r.json.why === 'contested', brief(r));
    r = await POST({ op: 'review', edit: cq, do: 'approve' }, 'tr2'); check('…and its author cannot approve it', r.status === 403 && r.json.code === 'self', brief(r));
    r = await call('POST', '/api/wall', { op: 'review', edit: cq, do: 'approve' }, T.tr3, ipOf('tr2')); check('…nor may a trusted user from the same address', r.status === 403 && r.json.code === 'self', brief(r));
    r = await POST({ op: 'review', edit: cq, do: 'approve' }, 'tr3'); check('from another address a trusted user may', r.json.status === 'live', brief(r));
    await API.db('SADD', API.K.days(U.tr3), '2026-07-01', '2026-07-02', '2026-07-03', '2026-07-04', '2026-07-05');
    const st3 = await POST({ op: 'strike', rev: r.json.rev }, 'adm'); r = await GET('?me=1', 'tr3');
    check('a strike costs whoever approved the struck edit two days', st3.json.ok && r.json.rep === 3, brief(st3) + ' → rep ' + r.json.rep);

    // ── 16 · motions ─────────────────────────────────────────────────────
    d = await doc(); const canonLeft = () => d.wall.items.filter(it => it.c === 1 && it.n !== cp.n);
    const victim = canonLeft()[0];
    r = await edit('con2', {}, [victim.n]); const m1 = r.json.edit; check("a contributor's drastic edit is a motion", r.json.status === 'motion' && r.json.cls === 'drastic' && /deleted/.test(r.json.why), brief(r));
    r = await edit('nu4', {}, [victim.n]); check("a newcomer's is still refused", r.status === 400 && r.json.code === 'drastic');
    r = await POST({ op: 'vote', edit: m1, aye: true }, 'nu4'); check('a newcomer cannot vote', r.status === 403);
    r = await POST({ op: 'vote', edit: m1, aye: true }, 'con2'); check('a contributor cannot vote, its proposer included', r.status === 403);
    r = await POST({ op: 'review', edit: m1, do: 'approve' }, 'tr2'); check('a trusted user cannot decide a motion by review', r.status === 403);
    r = await POST({ op: 'vote', edit: m1, aye: true }, 'tr2'); check('one aye: still a motion', r.json.status === 'motion' && r.json.ayes === 1, brief(r) + ' ayes ' + r.json.ayes);
    r = await call('POST', '/api/wall', { op: 'vote', edit: m1, aye: true }, T.tr3, ipOf('tr2')); check('an aye from the same address replaces the first: still one', r.json.ayes === 1);
    r = await POST({ op: 'vote', edit: m1, aye: true }, 'tr4'); check('another, from its own address: two', r.json.ayes === 2 && r.json.status === 'motion');
    r = await POST({ op: 'vote', edit: m1, aye: false }, 'adm'); check('a nay: two to one, still a motion', r.json.nays === 1 && r.json.status === 'motion');
    r = await POST({ op: 'vote', edit: m1, aye: true }, 'tr5'); check('the third aye, three to one, passes it: live', r.json.status === 'live' && r.json.ayes === 3, brief(r));
    d = await doc(); check('…and the piece is off the wall', !at(d, victim.n));
    r = await GET('?edit=' + m1); check('the edit reads live, with the tally and without any address', r.json.edit.status === 'live' && r.json.edit.ip === undefined && r.json.edit.voters === undefined && r.json.edit.ayes === 3);
    r = await GET('?log=1'); check('the log says the vote put it up', r.json.log[0].how === 'motion' && r.json.log[0].by === U.con2, j(r.json.log[0].how));
    const age = async id => { const e = JSON.parse(await API.db('GET', API.K.edit(id))); e.at -= (API.MOTION_HOURS + 1) * 3600e3; await API.db('SET', API.K.edit(id), JSON.stringify(e)); };
    d = await doc(); const v2 = canonLeft()[0], v3 = canonLeft()[1];
    r = await edit('con2', {}, [v2.n]); const m2 = r.json.edit; r = await edit('tr', {}, [v3.n]); const m3 = r.json.edit;
    check('(two more motions)', !!m2 && !!m3 && r.json.status === 'motion', brief(r));
    r = await POST({ op: 'vote', edit: m3, aye: true }, 'tr'); check('a trusted proposer cannot vote on their own motion', r.status === 403 && r.json.code === 'self', brief(r));
    await POST({ op: 'vote', edit: m2, aye: true }, 'tr2'); await age(m2);
    r = await GET('?edit=' + m2); check("at the hour with one vote: no quorum, so the moderators' queue", r.json.edit.status === 'queued', r.json.edit.status);
    await POST({ op: 'vote', edit: m3, aye: false }, 'tr2'); await POST({ op: 'vote', edit: m3, aye: false }, 'tr3'); await POST({ op: 'vote', edit: m3, aye: true }, 'tr4'); await age(m3);
    r = await GET('?queue=1'); r = await GET('?edit=' + m3); check('at the hour with three votes, one for: rejected by the vote', r.json.edit.status === 'rejected' && /vote/.test(r.json.edit.why), r.json.edit.why);
    r = await POST({ op: 'review', edit: m2, do: 'approve' }, 'mod'); check('a moderator decides the one that fell to the queue', r.json.status === 'live', brief(r));
    d = await doc(); const v4 = canonLeft()[0], v5 = canonLeft()[1];
    r = await edit('con2', {}, [v4.n]); const m4 = r.json.edit; r = await POST({ op: 'review', edit: m4, do: 'approve' }, 'adm');
    check('a moderator fast-tracks a motion', r.json.status === 'live', brief(r)); r = await GET('?log=1'); check('…logged as fiat', r.json.log[0].how === 'fiat', r.json.log[0].how);
    r = await edit('con2', {}, [v5.n]); const m5 = r.json.edit; r = await POST({ op: 'review', edit: m5, do: 'reject', why: 'no' }, 'mod'); check('…or vetoes one', r.json.status === 'rejected');
    r = await GET('?at=2'); check('?at=2 is revision 2, with its put and what was before', r.json.rev && r.json.rev.rev === 2 && !!r.json.rev.prev && !!r.json.rev.put, j(Object.keys(r.json.rev || {})));
    r = await GET('?at=0'); check('?at=0 → 400', r.status === 400); r = await GET('?at=99999'); check('?at=99999 → 404', r.status === 404);

    // ── 14 · nothing else was touched ────────────────────────────────────
    check('the real wall-seed.json is untouched', hash(SEED) === seedBefore);
    check('the store is the temp file, not toem2/wall-db.json', API.storeFor().file === process.env.WALL_DB && fs.existsSync(realDb) === realDbBefore);
  } catch (e) {
    check('the probe ran to the end', false, String((e && e.stack) || e).split('\n').slice(0, 4).join(' | '));
  }
  try { fs.rmSync(tmp, { recursive: true, force: true }); } catch (e) {}
  console.log('\n' + (fails ? fails + ' FAILED' : 'all checks passed'));
  process.exit(fails ? 1 : 0);
})();
