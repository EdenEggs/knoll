/* toem2/probe-leaderboard-api.js — api/leaderboard.js, in this process, against a throwaway file store: no server,
   no browser, no network. The module is required with WALL_DB pointed at a temp file and called with a fake
   (req, res) the way serve.js and Vercel call it: an empty page, the six rankings counted from a seeded log, board
   and album, your own line, the settings (the keepers'; what they take; what they refuse), the count kept ten
   minutes and cleared by a save or asked afresh, the origin check. The real wall-db.json is never touched.

   Run:  node toem2/probe-leaderboard-api.js */
'use strict';
const fs = require('fs'), path = require('path'), os = require('os');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'toem2-ranks-'));
process.env.WALL_DB = path.join(tmp, 'wall-db.json');
delete process.env.KV_REST_API_URL; delete process.env.UPSTASH_REDIS_REST_URL; delete process.env.VERCEL;
const W = require('../api/wall.js'), API = require('../api/leaderboard.js');

let fails = 0;
const check = (name, ok, info) => { if (!ok) fails++; console.log((ok ? '  PASS  ' : '  FAIL  ') + name + (info == null ? '' : '   ' + JSON.stringify(info))); };
function call(method, url, body, token, origin) {
  return new Promise(resolve => {
    const req = { method, url, headers: { host: 'localhost:4321', 'x-real-ip': '10.0.0.1' }, socket: { remoteAddress: '127.0.0.1' }, body: method === 'POST' ? body || {} : undefined };
    if (token) req.headers.authorization = 'Bearer ' + token;
    if (origin) req.headers.origin = origin;
    const res = { statusCode: 200, setHeader() {}, end(s) { let json = null; try { json = JSON.parse(s); } catch (e) {} resolve({ status: this.statusCode, json: json || {} }); } };
    API(req, res).catch(e => resolve({ status: 500, json: { ok: false, error: String((e && e.message) || e) } }));
  });
}
const U = { mod: 'a'.repeat(16), nu: 'b'.repeat(16), nu2: 'c'.repeat(16), nu3: 'd'.repeat(16) }, T = {};
const GET = (q, who) => call('GET', '/api/leaderboard' + (q || ''), null, who && T[who]);
const POST = (body, who, q, origin) => call('POST', '/api/leaderboard' + (q || ''), body, who && T[who], origin);
const brief = r => ({ status: r.status, code: r.json.code });
const DAY = 86400000, T0 = Date.UTC(2026, 8, 20, 12);   // noon UTC, 20 Sep 2026
const ids = list => list.map(r => r.id);

(async () => {
  for (const [who, u] of Object.entries(U)) {
    await W.db('HSET', W.K.user(u), 'made', '1', 'name', who, 'role', who === 'mod' ? 'mod' : 'user');
    T[who] = await W.mintSession(u);
  }

  console.log('an empty page');
  let r = await GET();
  check('nobody signed in: the three rankings it starts with, all empty, no "you"', r.status === 200 && r.json.me === null && r.json.settings.tabs.join() === 'edits,days,first' && r.json.settings.title === 'Leaderboard' && r.json.settings.top === 10
        && Object.keys(r.json.ranks).join() === 'edits,days,first' && Object.values(r.json.ranks).every(l => Array.isArray(l) && !l.length) && r.json.you === undefined && r.json.metrics.edits.label === 'Most edits', r.json);
  r = await GET('', 'nu');
  check('signed in: "you" is on none of them', r.json.me && r.json.me.tag === 'nu#1' && r.json.you && Object.values(r.json.you).every(v => v === null), r.json.you);
  check('a page that is not one', (await GET('?page=nowhere')).json.code === 'page');

  console.log('the count');
  // the wall's log: nu edits on three days (4 revisions), nu2 on one day (2), mod once, the seed twice — newest first, as the wall keeps it
  const log = [
    { rev: 9, by: U.nu, at: T0 + 2 * DAY + 3600e3 }, { rev: 8, by: U.nu2, at: T0 + 2 * DAY }, { rev: 7, by: U.nu, at: T0 + 2 * DAY }, { rev: 6, by: U.mod, at: T0 + DAY + 7200e3 },
    { rev: 5, by: U.nu2, at: T0 + DAY }, { rev: 4, by: U.nu, at: T0 + DAY }, { rev: 3, by: U.nu, at: T0 }, { rev: 2, by: 'seed', at: T0 - DAY }, { rev: 1, by: 'seed', at: T0 - 2 * DAY }
  ];
  for (const e of log.slice().reverse()) await W.db('LPUSH', W.pageKeys('toem2').log, JSON.stringify(Object.assign({ edit: 'e' + e.rev, name: 'x', how: 'live', cls: 'live' }, e)));
  // the board: nu2 three posts and a chat line, nu one line
  for (const [ch, by, i] of [['news', U.nu2, 1], ['forum', U.nu2, 2], ['forum', U.nu2, 3], ['chat', U.nu2, 4], ['chat', U.nu, 5]]) await W.db('LPUSH', W.K.board('toem2', ch), JSON.stringify({ id: 'p' + i, by, at: T0 + i, text: 'x' }));
  // the album: nu3 two photos with three hearts between them, nu one photo with one heart
  for (const [by, id] of [[U.nu3, 'f1'], [U.nu3, 'f2'], [U.nu, 'f3']]) await W.db('LPUSH', W.K.album('toem2'), JSON.stringify({ id, by, at: T0, cap: id, src: '/x/' + id + '.png', key: 'album/toem2/' + id + '.png' }));
  await W.db('SADD', W.K.albumLike('toem2', 'f1'), U.nu, U.nu2); await W.db('SADD', W.K.albumLike('toem2', 'f2'), U.mod); await W.db('SADD', W.K.albumLike('toem2', 'f3'), U.nu3);
  r = await GET('', 'nu');
  check('still empty: the count made a moment ago is kept ten minutes', Object.values(r.json.ranks).every(l => !l.length));
  r = await POST({ op: 'settings', tabs: ['edits', 'days', 'first', 'posts', 'photos', 'hearts'], title: 'Hall of Fame', sub: 'Who did the most', top: 5 }, 'mod');
  check('a keeper\'s settings save takes: all six, in that order, a title, a line, five rows', r.json.ok && r.json.settings.tabs.length === 6 && r.json.settings.title === 'Hall of Fame' && r.json.settings.top === 5, r.json);
  r = await GET('', 'nu');
  const R = r.json.ranks;
  check('…and clears the count: the six rankings stand', Object.keys(R).join() === 'edits,days,first,posts,photos,hearts' && r.json.counted > T0, Object.keys(R));
  check('most edits: nu 4, nu2 2, mod 1 — the seed not counted — each with their days', ids(R.edits).join() === [U.nu, U.nu2, U.mod].join() && R.edits[0].value === 4 && R.edits[0].sub === '3 days active' && R.edits[1].value === 2 && R.edits[1].sub === '2 days active' && R.edits[2].sub === '1 day active' && R.edits[0].tag === 'nu#1', R.edits);
  check('most active: nu 3 days, nu2 2, mod 1', ids(R.days).join() === [U.nu, U.nu2, U.mod].join() && R.days.map(x => x.value).join() === '3,2,1' && R.days[0].sub === '4 edits', R.days);
  check('first here: nu (day 0), then nu2, then mod — the value their first edit\'s time', ids(R.first).join() === [U.nu, U.nu2, U.mod].join() && R.first[0].value === T0 && R.first[1].value === T0 + DAY, R.first);
  check('most posts: nu2 4 (three posts and a line), nu 1', ids(R.posts).join() === [U.nu2, U.nu].join() && R.posts[0].value === 4 && R.posts[1].value === 1, R.posts);
  check('most photos: nu3 2 (3 hearts), nu 1 (1 heart)', ids(R.photos).join() === [U.nu3, U.nu].join() && R.photos[0].value === 2 && R.photos[0].sub === '3 hearts' && R.photos[1].sub === '1 heart', R.photos);
  check('most hearts: nu3 3, nu 1', ids(R.hearts).join() === [U.nu3, U.nu].join() && R.hearts.map(x => x.value).join() === '3,1' && R.hearts[0].sub === '2 photos', R.hearts);
  check('you: first on edits, days and first; second on posts, photos and hearts', r.json.you.edits.rank === 1 && r.json.you.posts.rank === 2 && r.json.you.photos.rank === 2 && r.json.you.hearts.rank === 2 && r.json.you.first.value === T0, r.json.you);
  check('a stranger to it all is on none', Object.values((await GET('', 'mod')).json.you).map(v => (v ? v.rank : '-')).join() === '3,3,3,-,-,-');
  check('the rows are cut to the top', (await POST({ op: 'settings', tabs: ['edits'], title: 'x', sub: '', top: 3 }, 'mod')).json.ok && (await GET()).json.ranks.edits.length === 3 && Object.keys((await GET()).json.ranks).join() === 'edits');
  await W.db('LPUSH', W.pageKeys('toem2').log, JSON.stringify({ rev: 10, by: U.mod, at: T0 + 3 * DAY, edit: 'e10', name: 'x', how: 'live', cls: 'live' }));
  check('a new edit is not counted until the ten minutes are up…', (await GET('', 'mod')).json.you.edits.value === 1);
  check('…unless a keeper asks afresh', (await GET('?fresh=1', 'mod')).json.you.edits.value === 2);
  await W.db('LPUSH', W.pageKeys('toem2').log, JSON.stringify({ rev: 11, by: U.mod, at: T0 + 3 * DAY + 1, edit: 'e11', name: 'x', how: 'live', cls: 'live' }));
  check('(and not for anybody else: their ?fresh=1 gets the kept count)', (await GET('?fresh=1', 'nu2')).json.ranks.edits.find(x => x.id === U.mod).value === 2);

  console.log('the settings');
  check('signed out: no', (await POST({ op: 'settings', tabs: ['edits'], title: 'x', top: 5 })).status === 401);
  check('another site: no', brief(await POST({ op: 'settings', tabs: ['edits'], title: 'x', top: 5 }, 'nu', '', 'https://evil.example')).code === 'origin');
  check('not a keeper: no', brief(await POST({ op: 'settings', tabs: ['edits'], title: 'x', top: 5 }, 'nu')).code === 'role');
  for (const [what, b] of [['no rankings', { tabs: [], title: 'x', top: 5 }], ['a ranking that is not one', { tabs: ['edits', 'money'], title: 'x', top: 5 }], ['no title', { tabs: ['edits'], title: '  ', top: 5 }],
                           ['too few rows', { tabs: ['edits'], title: 'x', top: 2 }], ['too many rows', { tabs: ['edits'], title: 'x', top: 26 }]])
    check('settings refused: ' + what, brief(await POST(Object.assign({ op: 'settings' }, b), 'mod')).code === 'ranks');
  check('an op that is not one', brief(await POST({ op: 'frobnicate' }, 'mod')).code === 'op');
  r = await POST({ op: 'settings', tabs: ['photos', 'photos', 'edits'], title: ' The  Wall of  Fame ', sub: 'x'.repeat(80), top: 25 }, 'mod');
  check('a ranking twice is once; the title is one line; the line under it is cut to sixty', r.json.ok && r.json.settings.tabs.join() === 'photos,edits' && r.json.settings.title === 'The Wall of Fame' && r.json.settings.sub.length === 60, r.json.settings);
  check('the record says who arranged it', (await W.db('LRANGE', W.K.audit, 0, -1)).map(s => JSON.parse(s)).some(e => e.what === 'ranks' && e.by === U.mod && e.tabs === 'photos,edits'));
  check('the count is kept as a string that expires', typeof (await W.db('GET', W.K.lb('toem2'))) === 'string' || (await W.db('GET', W.K.lb('toem2'))) === null);

  fs.rmSync(tmp, { recursive: true, force: true });
  console.log(fails ? '\n' + fails + ' FAILED' : '\nall passed');
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
