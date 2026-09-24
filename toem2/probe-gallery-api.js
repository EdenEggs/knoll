/* toem2/probe-gallery-api.js — api/gallery.js, in this process, against a
   throwaway file store: no server, no browser, no network. The module is
   required with WALL_DB pointed at a temp file (so its pictures land in a
   temp album/ folder beside it) and called with a fake (req, res) the way
   serve.js and Vercel call it, and every rule in its head is tried once —
   who reads, who posts, what a picture has to be, the hearts, dropping, the
   cap on the list, the rate, the origin check. Nothing real is touched.

   Run:  node toem2/probe-gallery-api.js */
'use strict';
const fs = require('fs'), path = require('path'), os = require('os');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'toem2-album-'));
process.env.WALL_DB = path.join(tmp, 'wall-db.json');
delete process.env.KV_REST_API_URL; delete process.env.UPSTASH_REDIS_REST_URL; delete process.env.VERCEL; delete process.env.BLOB_READ_WRITE_TOKEN;
const W = require('../api/wall.js'), API = require('../api/gallery.js');

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
const U = { mod: 'a'.repeat(16), nu: 'b'.repeat(16), nu2: 'c'.repeat(16), ban: 'd'.repeat(16) }, T = {};
const GET = (q, who) => call('GET', '/api/gallery' + (q || ''), null, who && T[who]);
const POST = (body, who, q, origin) => call('POST', '/api/gallery' + (q || ''), body, who && T[who], origin);
const brief = r => ({ status: r.status, code: r.json.code });
// a real 1×1 png, and the same bytes wearing the wrong label
const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
const JPG = 'data:image/jpeg;base64,' + Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(60)]).toString('base64');
const file = src => path.join(tmp, src.replace(/^\/toem2\//, ''));

(async () => {
  for (const [who, u] of Object.entries(U)) {
    await W.db('HSET', W.K.user(u), 'made', '1', 'name', who, 'role', who === 'mod' ? 'mod' : 'user');
    T[who] = await W.mintSession(u);
  }
  await W.db('HSET', W.K.user(U.ban), 'banned', '1');

  console.log('reading');
  let r = await GET();
  check('a blank album: no photos, nobody signed in', r.status === 200 && r.json.me === null && Array.isArray(r.json.photos) && !r.json.photos.length, r.json);
  r = await GET('', 'nu');
  check('signed in: me is named, not a keeper', r.json.me && r.json.me.tag === 'nu#1' && r.json.me.keeper === false, r.json.me);
  check('a moderator is a keeper', (await GET('', 'mod')).json.me.keeper === true);
  check('a page that is not one', (await GET('?page=nowhere')).json.code === 'page');

  console.log('posting');
  check('signed out: no', (await POST({ op: 'post', cap: 'x', src: PNG })).status === 401);
  check('another site: no', brief(await POST({ op: 'post', cap: 'x', src: PNG }, 'nu', '', 'https://evil.example')).code === 'origin');
  check('banned: no', (await POST({ op: 'post', cap: 'x', src: PNG }, 'ban')).status === 403);
  check('a photo wants a caption', brief(await POST({ op: 'post', cap: '  ', src: PNG }, 'nu')).code === 'cap');
  check('and a picture', brief(await POST({ op: 'post', cap: 'x', src: 'https://elsewhere.example/a.png' }, 'nu')).code === 'src');
  check('a gif is not one', brief(await POST({ op: 'post', cap: 'x', src: 'data:image/gif;base64,R0lGODlhAQABAAAAACw=' }, 'nu')).code === 'src');
  check('a label the bytes do not bear', brief(await POST({ op: 'post', cap: 'x', src: PNG.replace('image/png', 'image/jpeg') }, 'nu')).code === 'src');
  check('too big', brief(await POST({ op: 'post', cap: 'x', src: 'data:image/png;base64,' + 'A'.repeat(420000) }, 'nu')).status === 413);
  r = await POST({ op: 'post', cap: '  Gull  on the mast ', where: 'Basto Harbour', src: PNG }, 'nu');
  const p1 = r.json.photo;
  check('a photo posts: one-line caption, where, a url, no hearts, the tag on it', r.json.ok && p1.cap === 'Gull on the mast' && p1.where === 'Basto Harbour' && /^\/toem2\/album\/toem2\/[a-z0-9]+\.png$/.test(p1.src) && p1.likes === 0 && p1.liked === false && p1.tag === 'nu#1', r.json);
  check('and its picture is a file, the bytes it sent', fs.existsSync(file(p1.src)) && fs.readFileSync(file(p1.src)).equals(Buffer.from(PNG.split(',')[1], 'base64')));
  check('the record keeps no picture in it', !JSON.stringify(await W.db('LRANGE', W.K.album('toem2'), 0, -1)).includes('base64'));
  r = await POST({ op: 'post', cap: 'Lighthouse', src: JPG }, 'nu2');
  const p2 = r.json.photo;
  check('a jpeg lands as .jpg', r.json.ok && /\.jpg$/.test(p2.src) && fs.existsSync(file(p2.src)), r.json);
  r = await GET('', 'nu');
  check('read back newest first, each with its taker\'s tag', r.json.photos.length === 2 && r.json.photos[0].id === p2.id && r.json.photos[0].tag === 'nu2#1' && r.json.photos[1].tag === 'nu#1', r.json.photos.map(p => p.tag));

  console.log('hearts');
  check('signed out: no', (await POST({ op: 'like', id: p1.id })).status === 401);
  check('a photo that is not there', (await POST({ op: 'like', id: 'nope' }, 'nu2')).status === 404);
  r = await POST({ op: 'like', id: p1.id }, 'nu2');
  check('a heart: one, and yours', r.json.ok && r.json.likes === 1 && r.json.liked === true, r.json);
  r = await POST({ op: 'like', id: p1.id }, 'nu2');
  check('the same heart twice is still one', r.json.ok && r.json.likes === 1);
  await POST({ op: 'like', id: p1.id }, 'mod');
  r = await GET('', 'nu2');
  check('read: two hearts, and liked says whose is asking', r.json.photos[1].likes === 2 && r.json.photos[1].liked === true && (await GET('', 'nu')).json.photos[1].liked === false, r.json.photos[1]);
  r = await POST({ op: 'like', id: p1.id, on: false }, 'nu2');
  check('taken back', r.json.ok && r.json.likes === 1 && r.json.liked === false);
  check('signed out sees the hearts and no liked', (await GET()).json.photos[1].likes === 1 && (await GET()).json.photos[1].liked === false);

  console.log('dropping');
  check('somebody else\'s: no', brief(await POST({ op: 'drop', id: p1.id }, 'nu2')).code === 'role');
  check('one that is not there', (await POST({ op: 'drop', id: 'nope' }, 'nu')).status === 404);
  r = await POST({ op: 'drop', id: p2.id }, 'nu2');
  check('your own goes, picture and all', r.json.ok && !fs.existsSync(file(p2.src)) && (await GET()).json.photos.length === 1, r.json);
  r = await POST({ op: 'drop', id: p1.id }, 'mod');
  const audit = (await W.db('LRANGE', W.K.audit, 0, -1)).map(s => JSON.parse(s));
  check('a keeper hides another\'s, and the record says so', r.json.ok && audit.some(e => e.what === 'hide' && e.by === U.mod && e.of === U.nu && e.ch === 'album'), audit[0]);
  check('and its hearts go with it', (await W.db('SCARD', W.K.albumLike('toem2', p1.id))) === 0 && !fs.existsSync(file(p1.src)));

  console.log('the cap on the list');
  const dir = path.join(tmp, 'album', 'toem2'); fs.mkdirSync(dir, { recursive: true });
  for (let i = 0; i < API.KEEP; i++) {
    const id = 'old' + String(i).padStart(4, '0'), key = 'album/toem2/' + id + '.png';
    fs.writeFileSync(path.join(tmp, key), 'x');
    await W.db('RPUSH', W.K.album('toem2'), JSON.stringify({ id, by: U.nu2, at: 1000 - i, cap: 'old ' + i, src: '/toem2/' + key, key }));   // newest first: old0000 is the newest
  }
  await W.db('SADD', W.K.albumLike('toem2', 'old0199'), U.mod);
  r = await POST({ op: 'post', cap: 'the one that tips it', src: PNG }, 'nu');
  const kept = (await GET()).json.photos;
  check('a full album drops its oldest for the new one', r.json.ok && kept.length === API.KEEP && kept[0].id === r.json.photo.id && !kept.some(p => p.id === 'old0199') && kept.some(p => p.id === 'old0198'), kept.length);
  check('and the one that fell off takes its picture and its hearts', !fs.existsSync(path.join(tmp, 'album/toem2/old0199.png')) && fs.existsSync(path.join(tmp, 'album/toem2/old0198.png')) && (await W.db('SCARD', W.K.albumLike('toem2', 'old0199'))) === 0);

  console.log('the rate');
  let last = null;
  for (let i = 0; i < 21; i++) last = await POST({ op: 'post', cap: 'p ' + i, src: PNG }, 'nu2');
  check('an hour\'s twenty photos and no more', last.status === 429 && last.json.code === 'rate', brief(last));

  fs.rmSync(tmp, { recursive: true, force: true });
  console.log(fails ? '\n' + fails + ' FAILED' : '\nall passed');
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
