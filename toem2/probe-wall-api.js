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
            nu4: '4'.repeat(16), con2: '5'.repeat(16), tr2: '6'.repeat(16), tr3: '7'.repeat(16), tr4: '8'.repeat(16), tr5: '9'.repeat(16), nu6: 'ab'.repeat(8),
            sp: 'ac'.repeat(8), nu7: 'ad'.repeat(8) };
const ROLE = { adm: 'admin', mod: 'mod', mod2: 'mod', tr: 'trusted', tr2: 'trusted', tr3: 'trusted', tr4: 'trusted', tr5: 'trusted', sp: 'trusted' };
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
    const rev2 = JSON.parse(await API.db('GET', API.pageKeys(API.HOME).revN(2)));
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
    const age = async id => { const e = JSON.parse(await API.db('GET', API.K.edit(id))); e.at -= (API.MOTION_HOURS + 1) * 3600e3; if (e.closes) e.closes = Date.now() - 1000; await API.db('SET', API.K.edit(id), JSON.stringify(e)); };
    r = await POST({ op: 'vote', edit: m1, aye: true }, 'nu6'); check('a gnome with no standing day cannot vote', r.status === 403 && r.json.code === 'role', brief(r));
    r = await POST({ op: 'vote', edit: m1, aye: true }, 'con2'); check('a contributor cannot vote, its proposer included', r.status === 403);
    r = await POST({ op: 'review', edit: m1, do: 'approve' }, 'tr2'); check('a trusted user cannot decide a motion by review', r.status === 403);
    r = await POST({ op: 'vote', edit: m1, aye: true }, 'tr2'); check('one aye: still a motion', r.json.status === 'motion' && r.json.ayes === 1, brief(r) + ' ayes ' + r.json.ayes);
    r = await call('POST', '/api/wall', { op: 'vote', edit: m1, aye: true }, T.tr3, ipOf('tr2')); check('an aye from the same address replaces the first: still one', r.json.ayes === 1);
    r = await POST({ op: 'vote', edit: m1, aye: true }, 'tr4'); check('another, from its own address: two', r.json.ayes === 2 && r.json.status === 'motion');
    r = await POST({ op: 'vote', edit: m1, aye: false }, 'adm'); check('a nay: two to one, still a motion', r.json.nays === 1 && r.json.status === 'motion');
    r = await POST({ op: 'vote', edit: m1, aye: true }, 'tr5'); check('the third aye, three to one: still a motion — nothing passes before the close', r.json.status === 'motion' && r.json.ayes === 3, brief(r));
    await age(m1); r = await GET('?edit=' + m1); check('at the close, three to one carries it: live', r.json.edit.status === 'live', r.json.edit.status);
    d = await doc(); check('…and the piece is off the wall', !at(d, victim.n));
    r = await GET('?edit=' + m1); check('the edit reads live, with the tally and without any address', r.json.edit.status === 'live' && r.json.edit.ip === undefined && r.json.edit.voters === undefined && r.json.edit.ayes === 3);
    r = await GET('?log=1'); check('the log says the vote put it up', r.json.log[0].how === 'motion' && r.json.log[0].by === U.con2, j(r.json.log[0].how));
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

    // ── 17 · more pages than one ─────────────────────────────────────────
    r = await POST({ op: 'page', slug: 'Bad Slug!' }, 'mod'); check('a page is named in lower-case letters, numbers and dashes', r.status === 400 && r.json.code === 'slug', brief(r));
    r = await POST({ op: 'page', slug: 'toem2' }, 'mod'); check('…and not after the first page', r.status === 409, brief(r));
    r = await POST({ op: 'page', slug: 'meadow', title: 'The Meadow' }, 'mod'); check('a moderator makes one', r.json.ok && r.json.page.slug === 'meadow', j(r.json));
    r = await POST({ op: 'page', slug: 'meadow' }, 'adm'); check('…once', r.status === 409 && r.json.code === 'taken');
    r = await GET('?pages=1'); check('?pages lists the first page and the new one', j(r.json.pages.map(p => p.slug)) === j(['toem2', 'meadow']) && r.json.pages[1].title === 'The Meadow', j(r.json.pages));
    r = await GET('?page=nowhere'); check('a page nobody made is a 404', r.status === 404 && r.json.code === 'page');
    r = await POST({ op: 'edit', page: '../doc', base: 1, put: { [nm(199)]: fresh() }, del: [] }, 'adm'); check('…and so is an edit to one', r.status === 404, brief(r));
    const toemRev = await head();
    r = await GET('?page=meadow'); check('a new page opens blank, at revision 1', r.json.rev === 1 && r.json.wall.items.length === 0 && r.json.flatfile.list.length === 0, brief(r));
    r = await POST({ op: 'edit', page: 'meadow', base: 1, put: { [nm(200)]: fresh() }, del: [] }, 'adm');
    check("the admin's edit to it is live, at the page's own revision 2", r.json.status === 'live' && r.json.rev === 2, brief(r));
    check("…and TOEM 2's wall has not moved", (await head()) === toemRev);
    r = await POST({ op: 'edit', page: 'meadow', base: 2, put: { [nm(201)]: fresh() }, del: [] }, 'nu6'); const mq = r.json.edit;
    check("a newcomer's edit to it waits, in the page's own queue", r.json.status === 'queued' && (await GET('?queue=1&page=meadow')).json.queue.some(e => e.id === mq) && !(await GET('?queue=1')).json.queue.some(e => e.id === mq), brief(r));
    r = await POST({ op: 'review', edit: mq, do: 'approve' }, 'mod'); d = (await GET('?page=meadow')).json;
    check('approved, it lands on its own page — found from the edit, not the request', r.json.rev === 3 && !!at(d, nm(201)) && (await head()) === toemRev && (await GET('?edit=' + mq)).json.edit.page === 'meadow', brief(r));
    r = await GET('?log=1&page=meadow'); check('the page keeps its own log', j(r.json.log.map(e => e.rev)) === j([3, 2, 1]), j(r.json.log.map(e => e.rev)));
    check("…its entries carry the author's tag", /#\d+$/.test(r.json.log[1].name) && r.json.log[1].by === U.adm, r.json.log[1].name);
    r = await POST({ op: 'revert', page: 'meadow', rev: 2 }, 'adm'); d = (await GET('?page=meadow')).json;
    check('a revert names its page: the piece comes off the meadow, and TOEM 2 is untouched', r.json.status === 'live' && !at(d, nm(200)) && (await head()) === toemRev, brief(r));
    r = await GET('?audit=1', 'tr'); check("the moderators' record is theirs", r.status === 403);
    r = await GET('?audit=1', 'mod2'); check('…and not a banned moderator\'s (section 11 banned one)', r.status === 403);
    r = await GET('?audit=1', 'mod'); check('…and it says who made the page, and who banned whom', r.json.audit.some(e => e.what === 'page' && e.page === 'meadow' && e.by === U.mod) && r.json.audit.some(e => e.what === 'role' && e.banned === true), j(r.json.audit.slice(0, 3)));

    // ── 18 · spaces: a page anybody makes, two each ──────────────────────
    const JPEG = 'data:image/jpeg;base64,' + Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 16]).toString('base64');
    r = await POST({ op: 'page', slug: 'yard', title: 'Yard' }, 'sp'); check('a space may not take a word the site already answers at', r.status === 409 && r.json.code === 'taken', brief(r));
    r = await POST({ op: 'page', slug: 'hollow', title: 'Mossy Hollow', palette: 'sticky', inks: ['#E8484A', '#e8484a', 'red', '#5a8fd6'], mod: 'read', feats: [true, 0, 'x'], pic: JPEG }, 'sp');
    check('a gnome makes a space, its look cut to what the form offers', r.json.ok && r.json.page.slug === 'hollow' && r.json.page.paper === '#ffe27a' && j(r.json.page.inks) === j(['#e8484a', '#5a8fd6']) &&
          r.json.page.mod === 'read' && j(r.json.page.feats) === j([true, false, true, false, false, false]) && r.json.page.pic === JPEG, brief(r));
    r = await POST({ op: 'page', slug: 'glen', title: 'The Glen', palette: 'plaid', mod: 'anyone', pic: 'data:image/png;base64,iVBORw0KGgo=' }, 'sp');
    check('…a second, where a paper, a rule or a picture the form does not offer falls back', r.json.ok && r.json.page.palette === 'yard' && r.json.page.mod === 'open' && r.json.page.pic === '', brief(r));
    r = await POST({ op: 'page', slug: 'dell', title: 'The Dell' }, 'sp'); check('…and not a third: two an account', r.status === 409 && r.json.code === 'full' && /only have 2 spaces per account/.test(r.json.error), brief(r));
    r = await GET('?space=dell'); check('…and the refused one was never claimed', r.status === 404);
    r = await GET('?spaces=1', 'sp'); check('?spaces lists its own, oldest first, and says it is full', r.json.ok && j(r.json.spaces.map(s => s.slug)) === j(['hollow', 'glen']) && r.json.full === true && r.json.max === 2, j({ full: r.json.full, n: (r.json.spaces || []).length }));
    r = await GET('?spaces=1'); check('…to the account signed in, and nobody else', r.status === 401);
    r = await GET('?space=hollow'); check('?space answers anybody: the name, the look, and whose it is', r.json.ok && r.json.space.title === 'Mossy Hollow' && r.json.space.accent === '#c93b82' && /^sp#\d+$/.test(r.json.space.tag) && r.json.space.by === U.sp, j(r.json.space && r.json.space.tag));
    check('…kept at the edge ten seconds, like the log', /s-maxage=10/.test(r.headers['cache-control']));
    r = await GET('?space=toem2'); check('the first page is not a space', r.status === 404);
    r = await GET('?space=' + encodeURIComponent('../doc')); check('…nor is a path', r.status === 404);
    r = await GET('?page=hollow'); check("a space's wall opens blank, like any page's", r.json.rev === 1 && r.json.wall.items.length === 0, brief(r));
    r = await POST({ op: 'page', slug: 'hollow', title: 'Mine Now' }, 'mod'); check("a space's address is its maker's", r.status === 409 && r.json.code === 'taken');
    r = await POST({ op: 'page', slug: 'meadow-2' }, 'mod'); const m3r = await POST({ op: 'page', slug: 'meadow-3' }, 'mod');
    check("a moderator's pages are not counted", r.json.ok && m3r.json.ok && (await GET('?spaces=1', 'mod')).json.full === false, brief(m3r));
    r = await POST({ op: 'page', slug: 'nook', title: 'Nook' }, 'nu7'); check('a newcomer makes one too', r.json.ok && r.json.page.by === U.nu7, brief(r));

    // ── 19 · THREE LEVELS OF CHAOS: ownership and keepers (tended) ───────
    const mk = async (name, role, days) => { const id = crypto.createHash('sha256').update('chaos:' + name).digest('hex').slice(0, 16); U[name] = id;
      await API.db('HSET', API.K.user(id), 'made', '1', 'name', name, 'role', role || 'user'); if (days) await API.db('SADD', API.K.days(id), ...days); T[name] = await API.mintSession(id); return id; };
    const D3 = ['2026-08-01', '2026-08-02', '2026-08-03'], D1 = ['2026-08-05'];
    for (const [nme, role, days] of [['c1', 'user', D3], ['c2', 'user', D3], ['k1', 'trusted'], ['k2', 'trusted'], ['mk1'], ['kp1'], ['st0'], ['st1', 'user', D3], ['st2', 'user', D3], ['w0'], ['w1'], ['w2', 'user', D3],
                                     ['v0'], ['v1', 'user', D1], ['v2', 'user', D1], ['v3', 'user', D1], ['v4', 'user', D1], ['v5', 'user', D1]]) await mk(nme, role, days);
    const pdoc = async page => (await GET('?page=' + page)).json;
    const breathe = async who => { const h = Math.floor(Date.now() / 36e5); await API.dbm([['DEL', API.K.rl('u:' + U[who], h)], ['DEL', API.K.rl('e:' + U[who], h)]]); };
    const closeNow = () => API.db('HSET', API.K.page('brook'), 'closes', String(Date.now() - 1000));   // the ballot's own close has come
    const pedit = async (who, page, put, del, more) => POST(Object.assign({ op: 'edit', page, base: (await pdoc(page)).rev, put: put || {}, del: del || [] }, more || {}), who);
    const canonOf = dd => dd.wall.items.filter(it => it.c === 1);
    r = await edit('c1', { [nm(301)]: fresh('d', { by: U.adm }) }); d = await doc();
    check("a new piece lands stamped 'by' its sender, whatever 'by' the client sent", r.json.status === 'live' && at(d, nm(301)).by === U.c1, brief(r) + ' by ' + (at(d, nm(301)) || {}).by);
    r = await edit('c1', { [nm(301)]: fresh('d', { by: U.adm }) }); check("…and a piece sent back with only 'by' changed is no change at all", r.status === 400 && r.json.code === 'no-op', brief(r));
    const cp2 = canonOf(d)[0];
    r = await edit('c1', { [cp2.n]: Object.assign({}, cp2, { x: cp2.x + 50 }) }); check("a contributor moving one of the plates' pieces (nobody's, so the wall's) waits for the keepers: others", r.json.status === 'queued' && r.json.why === 'others', brief(r));
    await POST({ op: 'review', edit: r.json.edit, do: 'reject', why: 'no' }, 'mod');   // two waiting is the cap: cleared as we go
    r = await edit('c1', { [nm(301)]: fresh('d', { x: 50 }) }); check('…and moving a piece of their own is live', r.json.status === 'live', brief(r));
    r = await edit('k1', { [nm(302)]: fresh('d', { x: 90 }) }); check("(a trusted user — a keeper on TOEM 2 — puts a piece up, live)", r.json.status === 'live', brief(r));
    r = await edit('c1', {}, [nm(302)]); const q302 = r.json.edit; check("a contributor deleting a keeper's piece is a proposal, not a refusal: queued, others", r.json.status === 'queued' && r.json.why === 'others', brief(r));
    r = await POST({ op: 'review', edit: q302, do: 'approve' }, 'k2'); d = await doc(); check('…which another keeper accepts, and the piece is gone', r.json.status === 'live' && !at(d, nm(302)), brief(r));
    r = await POST({ op: 'settings', page: 'toem2', feats: [1, 1, 0, 0, 0, 0] }, 'mod'); check("a moderator sets TOEM 2's kind switches: notes off", r.json.ok && r.json.rules.feats[2] === false, brief(r));
    r = await edit('c1', { [nm(303)]: { k: 't', t: 'a note', x: 0, y: 0, c: '#000000' } }); check("a contributor's note, with notes the keepers' only, waits: keeper", r.json.status === 'queued' && r.json.why === 'keeper', brief(r));
    await POST({ op: 'review', edit: r.json.edit, do: 'reject', why: 'no' }, 'mod');
    r = await POST({ op: 'settings', page: 'toem2', feats: [1, 1, 1, 0, 0, 0] }, 'mod'); r = await edit('c1', { [nm(303)]: { k: 't', t: 'a note', x: 0, y: 0, c: '#000000' } });
    check('…and with notes open to everyone again, the same note is live', r.json.status === 'live', brief(r));
    r = await POST({ op: 'settings', page: 'toem2', chaos: 1 }, 'k1'); check("TOEM 2's rules are the moderators' to set: a trusted user gets 403", r.status === 403 && r.json.code === 'owner', brief(r));
    r = await GET('?rules=1'); check('?rules tells anybody the level and the six switches, and that a stranger keeps nothing', r.json.ok && r.json.chaos === 1 && r.json.feats.length === 6 && r.json.keeper === false && r.json.period === 3, j({ chaos: r.json.chaos, feats: r.json.feats, keeper: r.json.keeper }));
    r = await GET('?rules=1', 'k1'); check('…and a trusted user that they are a keeper here', r.json.keeper === true && r.json.owner === false);
    r = await edit('k1', {}, [nm(301)]); const del301 = r.json.rev; r = await POST({ op: 'revert', rev: del301 }, 'c1'); d = await doc();
    check("a contributor reverting the deletion of their own piece is live, and the piece comes back as theirs", r.json.status === 'live' && at(d, nm(301)) && at(d, nm(301)).by === U.c1, brief(r));
    const cp3 = canonOf(d)[1]; r = await edit('mod', {}, [cp3.n]); r = await POST({ op: 'revert', rev: r.json.rev }, 'mod'); d = await doc();
    check("a restored plate piece stays nobody's", r.json.status === 'live' && at(d, cp3.n) && at(d, cp3.n).by === undefined, brief(r));
    r = await edit('k1', { [nm(304)]: fresh('d', { x: 10 }), [nm(305)]: fresh('d', { x: 20 }) });
    r = await edit('c1', { [nm(304)]: fresh('d', { x: 500 }) }); const q304 = r.json.edit; r = await edit('c1', {}, [nm(305)]); const q305 = r.json.edit;
    check('(two proposals on keeper pieces wait)', !!q304 && !!q305 && r.json.status === 'queued', brief(r));
    await edit('k1', { [nm(304)]: fresh('d', { x: 700 }) }); await edit('k1', {}, [nm(305)]);
    r = await POST({ op: 'review', edit: q304, do: 'approve' }, 'k2'); d = await doc();
    check('a proposal accepted after its piece moved leaves the newer place alone: skipped', r.json.nothing === true && r.json.skipped === 1 && at(d, nm(304)).x === 700, brief(r) + ' skipped ' + r.json.skipped);
    r = await POST({ op: 'review', edit: q305, do: 'approve' }, 'k2'); d = await doc();
    check('…and one accepted after its piece was deleted does not bring it back', r.json.nothing === true && !at(d, nm(305)), brief(r));
    r = await edit('k1', { [nm(308)]: fresh('d', { x: 30 }) }); r = await POST({ op: 'revert', rev: r.json.rev }, 'c1');
    check("a contributor's revert of a keeper's work is a proposal too: queued, others", r.json.status === 'queued' && r.json.why === 'others', brief(r));
    d = await doc(); const ninety = {}; canonOf(d).slice(0, 90).forEach(it => { ninety[it.n] = Object.assign({}, it, { x: it.x + 100 }); });
    r = await edit('mod', ninety); const bigRev = r.json.rev; r = await POST({ op: 'revert', rev: bigRev }, 'c2');
    check("undoing ninety moves is drastic: a contributor's revert becomes a motion", r.json.status === 'motion' && r.json.cls === 'drastic', brief(r));
    await POST({ op: 'review', edit: r.json.queued, do: 'reject', why: 'leave it' }, 'mod');
    r = await POST({ op: 'page', slug: 'brook', title: 'The Brook', chaos: 1, period: 3, feats: [1, 1, 1, 0, 0, 0] }, 'mk1'); check('a newcomer makes a space with its rules', r.json.ok && r.json.page.chaos === 1, brief(r));
    await API.db('SADD', API.K.friends(U.mk1), U.kp1); await API.db('SADD', API.K.friends(U.kp1), U.mk1); await API.db('SADD', API.K.invited('brook'), U.kp1);
    r = await GET('?rules=1&page=brook', 'kp1'); check("an invited friend is a keeper of the space, and ?rules names both by tag", r.json.keeper === true && r.json.keepers.length === 2 && /^kp1#\d+$/.test(r.json.keepers[1].tag), j(r.json.keepers));
    r = await pedit('kp1', 'brook', { [nm(320)]: fresh('d') }); check("…and edits live there, standing days or none", r.json.status === 'live', brief(r));
    await API.db('SREM', API.K.friends(U.mk1), U.kp1);
    r = await pedit('kp1', 'brook', { [nm(320)]: fresh('d', { x: 40 }) }); check('friends no longer: keeper no longer — the same hand waits', r.json.status === 'queued', brief(r));
    await API.db('SADD', API.K.friends(U.mk1), U.kp1);
    const dozen = {}; for (let i = 0; i < 12; i++) dozen[nm(330 + i)] = fresh('d', { x: i * 10 });
    r = await pedit('mk1', 'brook', dozen); r = await pedit('mk1', 'brook', {}, Object.keys(dozen)); check("the maker takes twelve pieces off their own space: live — it is their page", r.json.status === 'live', brief(r));
    r = await edit('mk1', {}, [canonOf(await doc())[2].n]); check('…and on TOEM 2 the same newcomer is refused a drastic edit, as ever', r.status === 400 && r.json.code === 'drastic', brief(r));
    r = await POST({ op: 'settings', page: 'brook', chaos: 2 }, 'st1'); check("a stranger cannot set a space's rules", r.status === 403 && r.json.code === 'owner', brief(r));
    r = await POST({ op: 'settings', page: 'brook', chaos: 9 }, 'mk1'); check('chaos is 0, 1, 2 or 3', r.status === 400 && r.json.code === 'chaos', brief(r));
    r = await POST({ op: 'settings', page: 'brook', period: 2 }, 'mk1'); check('a period is 1, 3 or 7 days', r.status === 400 && r.json.code === 'period', brief(r));
    r = await POST({ op: 'settings', page: 'brook', title: 'Brook Rules', palette: 'sticky' }, 'mk1'); const sp2 = (await GET('?space=brook')).json.space;
    check("the maker changes the sign and the paper", r.json.ok && sp2.title === 'Brook Rules' && sp2.palette === 'sticky' && sp2.chaos === 1, j({ title: sp2.title, palette: sp2.palette }));
    r = await GET('?spaces=1', 'mk1'); check('?spaces carries each space\'s level and how many wait there', r.json.spaces[0].chaos === 1 && r.json.spaces[0].waiting === 1, j(r.json.spaces.map(x => [x.slug, x.chaos, x.waiting])));
    r = await GET('?who=' + U.c1); check("?who answers anybody with a gnome's card — tag, tier, standing, streak, what landed — and nothing private", r.json.ok && /^c1#\d+$/.test(r.json.who.tag) && r.json.who.rep >= 3 && r.json.who.live >= 2 && r.json.who.pw === undefined && r.json.who.watched === undefined && r.json.who.rvd === undefined && typeof r.json.who.streak === 'number', j(r.json.who));
    r = await GET('?who=' + U.c1, 'mod'); check('…and a moderator with the counters in full', r.json.who.rvd !== undefined && r.json.who.watched === false && r.json.who.held >= 1, j({ rvd: r.json.who.rvd, held: r.json.who.held }));
    r = await GET('?who=nope'); check('a bad id is a 400', r.status === 400); r = await GET('?who=' + 'f'.repeat(15) + '0'); check('an unknown gnome a 404', r.status === 404);
    r = await POST({ op: 'settings', page: 'brook', chaos: 0 }, 'mk1'); r = await pedit('st1', 'brook', { [nm(340)]: fresh('d') }); check('a read-only space turns a stranger away: 403', r.status === 403 && r.json.code === 'read', brief(r));
    r = await pedit('kp1', 'brook', { [nm(340)]: fresh('d') }); check('…and its keeper too — it is the maker\'s alone', r.status === 403 && r.json.code === 'read', brief(r));
    r = await pedit('mk1', 'brook', { [nm(340)]: fresh('d') }); check('…while the maker draws on', r.json.status === 'live', brief(r));

    // ── 20 · the council ─────────────────────────────────────────────────
    r = await POST({ op: 'settings', page: 'brook', chaos: 2 }, 'mk1'); const rulesB = r.json.rules;
    check('the maker calls a council: the next close is set, at a UTC midnight, at least the period away', r.json.ok && rulesB.chaos === 2 && rulesB.closes % 86400e3 === 0 && rulesB.closes > Date.now() + 2 * 86400e3, j({ closes: rulesB.closes, now: Date.now() }));
    r = await pedit('kp1', 'brook', { [nm(341)]: fresh('d') }); check("a keeper's edit is live on a council page", r.json.status === 'live', brief(r));
    r = await pedit('st1', 'brook', { [nm(342)]: fresh('d') }); const cm1 = r.json.edit;
    check("a stranger's small edit is a motion on the ballot, with the close it is decided at", r.json.status === 'motion' && r.json.why === 'council' && r.json.closes === rulesB.closes, brief(r) + ' closes ' + r.json.closes);
    r = await pedit('st0', 'brook', { [nm(343)]: fresh('d') }); check("a newcomer's too — nothing queues, nothing is refused", r.json.status === 'motion', brief(r));
    const lots = {}; for (let i = 0; i < 45; i++) lots[nm(350 + i)] = fresh('d', { x: i });
    r = await pedit('st0', 'brook', lots); check("even a newcomer's drastic edit is a motion here, not a 400", r.json.status === 'motion' && r.json.cls === 'drastic', brief(r));
    r = await pedit('mk1', 'brook', { [nm(341)]: fresh('d', { x: 60 }) }); check('(the maker moves a keeper\'s piece: live)', r.json.status === 'live', brief(r));
    r = await POST({ op: 'revert', page: 'brook', rev: r.json.rev }, 'mk1'); check('(…and reverts their own move: live, the piece contested)', r.json.status === 'live', brief(r));
    r = await pedit('kp1', 'brook', { [nm(341)]: fresh('d', { x: 70 }) }); check("a keeper's edit on a piece a revert just touched waits: keepers keep the cooldowns", r.json.status === 'queued' && r.json.why === 'contested', brief(r));
    r = await POST({ op: 'vote', edit: cm1, aye: true }, 'v0'); check('a vote takes a standing day: none, no vote', r.status === 403 && r.json.code === 'role', brief(r));
    r = await POST({ op: 'vote', edit: cm1, aye: true }, 'st1'); check('the proposer does not vote', r.status === 403 && r.json.code === 'self', brief(r));
    r = await POST({ op: 'vote', edit: cm1, aye: true }, 'v1'); check('one standing day votes: one aye, and the ballot says which way you went', r.json.ok && r.json.ayes === 1 && r.json.mine === 1 && r.json.status === 'motion', brief(r) + ' ayes ' + r.json.ayes);
    r = await POST({ op: 'vote', edit: cm1, aye: true }, 'v2'); r = await POST({ op: 'vote', edit: cm1, aye: true }, 'v3');
    check('three ayes and it is still a motion: nothing passes before the close', r.json.status === 'motion' && r.json.ayes === 3, brief(r) + ' ayes ' + r.json.ayes);
    r = await call('POST', '/api/wall', { op: 'vote', edit: cm1, aye: false }, T.v4, ipOf('v3')); check("a nay from v3's address replaces v3's aye: two ayes, one nay", r.json.ayes === 2 && r.json.nays === 1, brief(r) + ' ' + r.json.ayes + '/' + r.json.nays);
    r = await POST({ op: 'vote', edit: cm1, aye: true }, 'v3'); check('…and v3 back from their own address takes it back: three ayes', r.json.ayes === 3 && r.json.nays === 0, r.json.ayes + '/' + r.json.nays);
    r = await GET('?edit=' + cm1); check('the motion reads its tally and never who voted which way', r.json.edit.ayes === 3 && r.json.edit.votes === undefined && r.json.edit.voters === undefined, j(Object.keys(r.json.edit)));
    r = await GET('?edit=' + cm1, 'mod'); check('…except to a moderator', r.json.edit.votes && Object.keys(r.json.edit.votes).length === 3);
    r = await GET('?ballot=1&page=brook', 'v1'); check('?ballot lists the motions with the clock, the quorum and my own votes', r.json.ok && r.json.chaos === 2 && r.json.closesAt === rulesB.closes && r.json.quorum === 3 && r.json.mine[cm1] === 1 && r.json.queue.every(q => q.status === 'motion') && r.json.queue.length === 3, j({ n: r.json.queue.length, mine: r.json.mine }));
    await API.db('SET', API.K.lock(cm1), '1', 'NX', 'EX', 5); r = await POST({ op: 'vote', edit: cm1, aye: true }, 'v5'); await API.db('DEL', API.K.lock(cm1));
    check('a ballot landing while another lands on the same motion waits: 503 busy', r.status === 503 && r.json.code === 'busy', brief(r));
    await API.db('HSET', API.K.page('brook'), 'closes', String(Date.now() + 1000));
    r = await pedit('st2', 'brook', { [nm(344)]: fresh('d') }); const cm2 = r.json.edit; check('a motion filed a second before the close joins the ballot after: twelve hours at least', r.json.closes > Date.now() + 11 * 3600e3, j({ closes: r.json.closes, now: Date.now() }));
    await API.db('HSET', API.K.page('brook'), 'closes', String(rulesB.closes));
    r = await pedit('st1', 'brook', {}, [], { look: { title: 'New Brook', palette: 'knoll', inks: ['#000000', 'nope'], mod: 'wild', by: 'x', feats: [0, 0, 0, 0, 0, 0] } }); const cm3 = r.json.edit;
    check('a motion may carry only the look — the sign, the paper, the inks, and nothing else', r.json.status === 'motion' && !!cm3, brief(r));
    r = await GET('?ballot=1&page=brook'); const lookRow = r.json.queue.find(q => q.id === cm3);
    check('…and the ballot shows it, cut to those three', lookRow && lookRow.n.put === 0 && j(lookRow.look) === j({ title: 'New Brook', palette: 'knoll', inks: '["#000000"]' }), j(lookRow && lookRow.look));
    for (const v of ['v1', 'v2', 'v3']) await POST({ op: 'vote', edit: cm3, aye: true }, v);
    await age(cm1); await age(cm3); r = await GET('?edit=' + cm1); const dB = await pdoc('brook');
    check('at the close, three to none carries the first: live, the piece on the wall, and the proposer has a motion carried', r.json.edit.status === 'live' && !!at(dB, nm(342)) && (await GET('?me=1', 'st1')).json.won === 1, r.json.edit.status);
    r = await GET('?edit=' + cm3); const sp3 = (await GET('?space=brook')).json.space; check('…and the look motion changes the sign and the paper', r.json.edit.status === 'live' && sp3.title === 'New Brook' && sp3.palette === 'knoll', j({ st: r.json.edit.status, title: sp3.title }));
    r = await GET('?me=1', 'st1'); check('a standing day is earned on the hill only: three still, after a motion carried on a space', r.json.rep === 3, 'rep ' + r.json.rep);
    r = await pedit('st1', 'brook', { [nm(345)]: fresh('d') }); const cm4 = r.json.edit; r = await pedit('st2', 'brook', { [nm(346)]: fresh('d') }); const cm5 = r.json.edit;
    for (const [v, aye] of [['v1', true], ['v2', true], ['v3', false], ['v4', false]]) await POST({ op: 'vote', edit: cm4, aye }, v);
    await POST({ op: 'vote', edit: cm5, aye: true }, 'v1');
    await age(cm4); await age(cm5); const e5 = JSON.parse(await API.db('GET', API.K.edit(cm5))); e5.at -= 8 * 86400e3; await API.db('SET', API.K.edit(cm5), JSON.stringify(e5));
    await closeNow();
    r = await GET('?queue=1&page=brook'); const a4 = (await GET('?edit=' + cm4)).json.edit, a5 = (await GET('?edit=' + cm5)).json.edit;
    check('two to two falls: a tie is rejected by the vote', a4.status === 'rejected' && /vote/.test(a4.why), a4.status + ' ' + a4.why);
    check("one vote is no quorum: it falls to the keepers' queue, and its week starts then, not when it was filed", a5.status === 'queued' && !!a5.queued, a5.status);
    r = await GET('?ballot=1&page=brook'); check("the ballot's clock moved on, and remembers the last close", r.json.closesAt > Date.now() && r.json.last && r.json.last.fell >= 1 && r.json.last.kept >= 1, j(r.json.last));
    r = await POST({ op: 'review', edit: cm5, do: 'approve' }, 'kp1'); check("a motion that fell to the queue is a keeper's to decide: approved", r.json.status === 'live', brief(r));
    r = await pedit('st2', 'brook', { [nm(346)]: fresh('d', { x: 9 }) }); const cm5b = r.json.edit;
    r = await POST({ op: 'review', edit: cm5b, do: 'approve' }, 'kp1'); check('a keeper who is not the maker cannot decide a motion still on the ballot', r.status === 403, brief(r));
    r = await POST({ op: 'review', edit: cm5b, do: 'approve' }, 'mk1'); check('the maker can: fast-tracked', r.json.status === 'live', brief(r));
    r = await GET('?log=1&page=brook'); check('…as fiat', r.json.log[0].how === 'fiat', r.json.log[0].how);
    r = await pedit('kp1', 'brook', { [nm(347)]: fresh('d', { x: 5 }) }); r = await pedit('st1', 'brook', { [nm(347)]: fresh('d', { x: 100 }) }); const cm6 = r.json.edit;
    r = await pedit('st2', 'brook', { [nm(347)]: fresh('d', { x: 200 }) }); const cm7 = r.json.edit;
    for (const id of [cm6, cm7]) for (const v of ['v1', 'v2', 'v3']) await POST({ op: 'vote', edit: id, aye: true }, v);
    await age(cm6); await age(cm7); await closeNow(); r = await GET('?queue=1&page=brook'); const dB2 = await pdoc('brook'), a7 = (await GET('?edit=' + cm7)).json.edit;
    check('two motions on one piece: the first filed lands, the second finds it changed and leaves it', at(dB2, nm(347)).x === 100 && a7.status === 'live' && a7.nothing === true && a7.skipped === 1, j({ x: at(dB2, nm(347)).x, a7: [a7.status, a7.skipped] }));
    r = await GET('?audit=300', 'mod'); const closes = r.json.audit.filter(e => e.what === 'close');
    check('every close is on the record, with the tally', closes.filter(e => e.page === 'brook').length >= 4 && closes.every(e => e.by === 'vote' && typeof e.ayes === 'number'), closes.length + ' closes');
    r = await pedit('st2', 'brook', { [nm(348)]: fresh('d') }); const cm8 = r.json.edit; r = await POST({ op: 'review', edit: cm8, do: 'reject', why: 'not this' }, 'mk1');
    check('…and the maker vetoes one', r.json.status === 'rejected', brief(r));
    const notes = (await API.db('LRANGE', API.K.notes(U.st2), 0, -1)).map(x => JSON.parse(x));
    check("the proposer's bell heard of each: a motion that failed, with the tally, one that passed, one that carried", notes.some(x => x.kind === 'failed' && x.slug === 'brook' && x.nays === 0) && notes.some(x => x.kind === 'passed' && x.title === 'New Brook'), j(notes.map(x => x.kind)));
    const kn = (await API.db('LRANGE', API.K.notes(U.kp1), 0, -1)).map(x => JSON.parse(x));
    check("the keepers' bells rang for the ballot — once per ballot, not once per motion (nine were filed)", kn.filter(x => x.kind === 'ballot').length >= 1 && kn.filter(x => x.kind === 'ballot').length < 9, j(kn.map(x => x.kind)));

    // ── 21 · wild ─────────────────────────────────────────────────────────
    r = await POST({ op: 'settings', page: 'meadow', chaos: 3 }, 'mod'); check('a moderator turns their page wild', r.json.ok && r.json.rules.chaos === 3, brief(r));
    const heap = {}; for (let i = 0; i < 25; i++) heap[nm(500 + i)] = fresh('d', { x: i });
    r = await pedit('w0', 'meadow', heap); check("a newcomer's twenty-five pieces are live", r.json.status === 'live', brief(r));
    r = await pedit('w0', 'meadow', {}, Object.keys(heap)); const wipe = r.json.rev; check('…and so is taking them all off: nothing is safe', r.json.status === 'live', brief(r));
    r = await POST({ op: 'revert', page: 'meadow', rev: wipe }, 'st1'); check("a contributor's revert is live", r.json.status === 'live', brief(r));
    r = await POST({ op: 'strike', page: 'meadow', rev: wipe }, 'mod'); check('a strike is refused on a wild wall', r.status === 400 && r.json.code === 'wild', brief(r));
    r = await POST({ op: 'undo', page: 'meadow', user: U.w0 }, 'mod'); check('undo everything by a person still works', r.json.ok && r.json.reverted >= 1, brief(r) + ' reverted ' + r.json.reverted);
    r = await pedit('w0', 'meadow', { [nm(500)]: fresh('d') }); check('an edit on a piece a revert just touched is live: no cooldown', r.json.status === 'live', brief(r));
    r = await pedit('w0', 'meadow', { [nm(501)]: fresh('d') }); check('the fourth post in an hour is still too many: 429', r.status === 429, brief(r));
    r = await pedit('w2', 'meadow', { [nm(502)]: Object.assign(fresh('d'), { t: 'x'.repeat(33 * 1024) }) }); check('a 33 KB piece is still 413', r.status === 413, brief(r));
    r = await pedit('w2', 'meadow', { [nm(503)]: fresh('d', { x: 1e5 }) }); check('a piece off the paper is still 400', r.status === 400, brief(r));
    r = await GET('?me=1', 'st1'); check('no standing day is earned on a wild wall', r.json.rep === 3, 'rep ' + r.json.rep);
    r = await POST({ op: 'settings', page: 'toem2', chaos: 3 }, 'mod'); const cp4 = canonOf(await doc())[3];
    r = await edit('w1', {}, [cp4.n]); const wild1 = r.json.rev; check("TOEM 2 wild: a newcomer takes one of the plates' pieces off, live", r.json.status === 'live', brief(r));
    await POST({ op: 'revert', rev: wild1 }, 'mod'); await POST({ op: 'settings', page: 'toem2', chaos: 1 }, 'mod');
    r = await edit('w1', {}, [cp4.n]); check('…tended again, the plates are canon again: the same deletion is drastic', r.status === 400 && r.json.code === 'drastic', brief(r));

    // ── 22 · habits ──────────────────────────────────────────────────────
    r = await GET('?me=1', 'st1'); check("the counters: what st1 sent, what landed, what was held, what carried, what was reverted", r.json.held >= 3 && r.json.okd >= 2 && r.json.won >= 1 && r.json.rvs >= 1 && r.json.watched === undefined, j({ live: r.json.live, held: r.json.held, okd: r.json.okd, won: r.json.won, rvs: r.json.rvs }));
    r = await GET('?me=1', 'v1'); check('…votes cast, counted once each', r.json.votes === 6, 'votes ' + r.json.votes);
    r = await GET('?me=1', 'mod'); check('…reviews given and reverts made', r.json.rvw >= 2 && r.json.rvs >= 2, j({ rvw: r.json.rvw, rvs: r.json.rvs }));
    r = await GET('?who=' + U.w0, 'mod'); check("…and w0's work reverted by others", r.json.who.rvd >= 1, 'rvd ' + r.json.who.rvd);
    r = await POST({ op: 'role', user: U.c1, watch: true }, 'tr'); check('watching is a moderator\'s', r.status === 403, brief(r));
    r = await POST({ op: 'role', user: U.c1, watch: true }, 'mod'); check('a moderator watches c1', r.json.ok && r.json.watched === true, brief(r));
    r = await GET('?me=1', 'c1'); check('watched: a newcomer wherever they go, and not told', r.json.tier === 'newcomer' && r.json.rep >= 3 && r.json.watched === undefined, j({ tier: r.json.tier }));
    await breathe('c1'); r = await edit('c1', { [nm(301)]: fresh('d', { x: 55 }) }); check('…their own small edit waits', r.json.status === 'queued', brief(r));
    r = await pedit('st2', 'brook', { [nm(349)]: fresh('d') }); r = await POST({ op: 'vote', edit: r.json.edit, aye: true }, 'c1'); check('…and their vote is refused', r.status === 403, brief(r));
    r = await POST({ op: 'role', user: U.c1, watch: false }, 'mod'); r = await GET('?me=1', 'c1'); check('unwatched: a contributor again', r.json.tier === 'contributor');
    r = await GET('?audit=50', 'mod'); check('both on the record', r.json.audit.filter(e => e.what === 'role' && e.user === U.c1 && e.watch !== undefined).length === 2);
    r = await POST({ op: 'role', user: U.mod2, watch: true }, 'mod'); check('a moderator is not another\'s to watch', r.status === 403, brief(r));
    r = await edit('c2', { [nm(600)]: fresh('d') }); r = await POST({ op: 'strike', rev: r.json.rev }, 'mod');
    r = await edit('c2', { [nm(601)]: fresh('d') }); r = await POST({ op: 'review', edit: r.json.edit, do: 'approve' }, 'mod'); r = await POST({ op: 'strike', rev: r.json.rev }, 'mod');
    r = await GET('?audit=50', 'mod'); const ban = r.json.audit.find(e => e.what === 'ban' && e.user === U.c2);
    check('a second strike bans, and the ban is on the record as automatic', !!ban && ban.auto === true && ban.by === U.mod && (await GET('?me=1', 'c2')).json.banned === true, j(ban));
    r = await GET('?audit=400', 'mod'); const kinds = new Set(r.json.audit.map(e => e.what));
    check('the record now holds settings, reviews, reverts, strikes, undos, closes and bans', ['settings', 'review', 'revert', 'strike', 'undo', 'close', 'ban', 'role', 'page'].every(k => kinds.has(k)), j([...kinds]));

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
