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
const JPG = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AVN//2Q==';   // a real JPEG, one pixel by one: the doors read a picture's size off its header (api/wall.js: HOW BIG ACROSS)
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

  // WHO PUTS PHOTOS UP (2026-09-28): a moderator anywhere; anyone else signed in only into a section opened to them — and none is, until one is
  console.log('who puts photos up');
  check('a page starts with no sections', Array.isArray((await GET()).json.sections) && !(await GET()).json.sections.length);
  check('with no section opened, a photo from somebody who is no moderator is turned away', brief(await POST({ op: 'post', cap: 'x', src: PNG }, 'nu')).code === 'role');
  r = await POST({ op: 'sections', sections: [{ id: 'town', title: 'Around town', open: true }, { id: 'shut', title: 'Shut' }, { id: 'nearly', title: 'Nearly', open: 'yes' }] }, 'mod');
  check('a section is shut to visitors\' photos until it is opened — and opened is true, or it is not', r.json.ok && r.json.sections.map(s => s.open).join() === 'true,false,false' && (await GET()).json.sections.map(s => s.open).join() === 'true,false,false', r.json.sections);
  check('into a section that is shut: no', brief(await POST({ op: 'post', cap: 'x', sec: 'shut', src: PNG }, 'nu')).code === 'role');
  check('into none at all: no', brief(await POST({ op: 'post', cap: 'x', sec: 'nowhere', src: PNG }, 'nu')).code === 'role');
  r = await POST({ op: 'post', cap: 'A title that runs on past twenty', desc: 'd'.repeat(140), src: PNG }, 'mod');
  check('a moderator hangs one anywhere — its title twenty characters, its description a hundred', r.json.ok && r.json.photo.sec === '' && r.json.photo.cap === 'A title that runs on' && r.json.photo.desc.length === 100, r.json.photo);
  await POST({ op: 'drop', id: r.json.photo.id }, 'mod');

  console.log('posting');
  check('signed out: no', (await POST({ op: 'post', cap: 'x', sec: 'town', src: PNG })).status === 401);
  check('another site: no', brief(await POST({ op: 'post', cap: 'x', sec: 'town', src: PNG }, 'nu', '', 'https://evil.example')).code === 'origin');
  check('banned: no', (await POST({ op: 'post', cap: 'x', sec: 'town', src: PNG }, 'ban')).status === 403);
  check('a photo wants a caption', brief(await POST({ op: 'post', cap: '  ', sec: 'town', src: PNG }, 'nu')).code === 'cap');
  check('and a picture', brief(await POST({ op: 'post', cap: 'x', sec: 'town', src: 'https://elsewhere.example/a.png' }, 'nu')).code === 'src');
  check('a gif is not one', brief(await POST({ op: 'post', cap: 'x', sec: 'town', src: 'data:image/gif;base64,R0lGODlhAQABAAAAACw=' }, 'nu')).code === 'src');
  check('a label the bytes do not bear', brief(await POST({ op: 'post', cap: 'x', sec: 'town', src: PNG.replace('image/png', 'image/jpeg') }, 'nu')).code === 'src');
  check('too big', brief(await POST({ op: 'post', cap: 'x', sec: 'town', src: 'data:image/png;base64,' + 'A'.repeat(420000) }, 'nu')).status === 413);
  // HOW BIG ACROSS (2026-09-28, api/wall.js): a picture is read for its size — a flat one weighs nothing and is thirty thousand a side
  const pngOf = (w, h) => { const ih = Buffer.alloc(13); ih.writeUInt32BE(w, 0); ih.writeUInt32BE(h, 4); ih[8] = 1; return 'data:image/png;base64,' + Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13]), Buffer.from('IHDR'), ih, Buffer.alloc(4)]).toString('base64'); };
  const jpgOf = (w, h) => 'data:image/jpeg;base64,' + Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 16]), Buffer.from('JFIF\0'), Buffer.alloc(9), Buffer.from([0xff, 0xc0, 0, 17, 8, h >> 8, h & 255, w >> 8, w & 255, 3, 1, 0x22, 0, 2, 0x11, 1, 3, 0x11, 1])]).toString('base64');
  U.big = 'f'.repeat(16); await W.db('HSET', W.K.user(U.big), 'made', '1', 'name', 'big', 'role', 'user'); T.big = await W.mintSession(U.big);   // (an account of its own, so the hour's twenty of the others are theirs)
  r = await POST({ op: 'post', cap: 'x', sec: 'town', src: pngOf(30000, 30000) }, 'big');
  check('thirty thousand pixels a side in a hundred bytes: too big across, whatever it weighs', r.status === 400 && r.json.code === 'src' && /too big across/.test(r.json.error), r.json);
  const wide = []; for (const s of [pngOf(2049, 10), pngOf(10, 2049), jpgOf(65535, 65535), jpgOf(2049, 1)]) wide.push(await POST({ op: 'post', cap: 'x', sec: 'town', src: s }, 'big'));
  check('…a side past 2048 either way, in a png or a jpeg', wide.every(x => x.status === 400 && x.json.code === 'src' && /too big across/.test(x.json.error)), wide.map(brief));
  r = await POST({ op: 'post', cap: 'x', sec: 'town', src: 'data:image/jpeg;base64,' + Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(60)]).toString('base64') }, 'big');
  check('a picture that will not say how big it is is not one', r.status === 400 && /not the picture it says it is/.test(r.json.error) && (await POST({ op: 'post', cap: 'x', sec: 'town', src: pngOf(0, 10) }, 'big')).status === 400, r.json);
  check('nothing was hung for any of them', (await GET()).json.photos.length === 0 && (!fs.existsSync(path.join(tmp, 'album', 'toem2')) || fs.readdirSync(path.join(tmp, 'album', 'toem2')).length === 0));
  r = await POST({ op: 'post', cap: 'at the edge', sec: 'town', src: pngOf(2048, 2048) }, 'big');
  check('2048 a side is taken', r.json.ok === true, r.json); await POST({ op: 'drop', id: r.json.photo.id }, 'big');
  r = await POST({ op: 'post', cap: '  Gull  on the mast ', where: 'Basto Harbour', sec: 'town', src: PNG }, 'nu');
  const p1 = r.json.photo;
  check('anyone signed in hangs a photo in an open section: one-line caption, where, a url, no hearts, the tag on it', r.json.ok && p1.cap === 'Gull on the mast' && p1.sec === 'town' && p1.where === 'Basto Harbour' && /^\/toem2\/album\/toem2\/[a-z0-9]+\.png$/.test(p1.src) && p1.likes === 0 && p1.liked === false && p1.tag === 'nu#1', r.json);
  check('and its picture is a file, the bytes it sent', fs.existsSync(file(p1.src)) && fs.readFileSync(file(p1.src)).equals(Buffer.from(PNG.split(',')[1], 'base64')));
  check('the record keeps no picture in it', !JSON.stringify(await W.db('LRANGE', W.K.album('toem2'), 0, -1)).includes('base64'));
  check('its taker does not move it into a section that is shut, nor out of every section', brief(await POST({ op: 'edit', id: p1.id, sec: 'shut' }, 'nu')).code === 'role' && brief(await POST({ op: 'edit', id: p1.id, sec: '' }, 'nu')).code === 'role'
        && (await GET()).json.photos[0].sec === 'town');
  r = await POST({ op: 'post', cap: 'Lighthouse', sec: 'town', src: JPG }, 'nu2');
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

  console.log('sections, titles and descriptions');
  check('the sections are the keepers\' to arrange', brief(await POST({ op: 'sections', sections: [] }, 'nu')).code === 'role');
  for (const [what, sections] of [['six', Array.from({ length: 6 }, (_, i) => ({ id: 's' + i, title: 's' + i }))], ['a bad name', [{ id: 'Bad!', title: 'x' }]], ['two alike', [{ id: 'a', title: 'x' }, { id: 'a', title: 'y' }]], ['no title', [{ id: 'a', title: '  ' }]]])
    check('sections refused: ' + what, brief(await POST({ op: 'sections', sections }, 'mod')).code === 'sections');
  // FIVE AT MOST, A HUNDRED CHARACTERS OF DESCRIPTION (2026-09-28) — and what was saved under the old caps is read to the new ones
  r = await POST({ op: 'sections', sections: Array.from({ length: 5 }, (_, i) => ({ id: 's' + i, title: 'S' + i, desc: 'd'.repeat(130) })) }, 'mod');
  check('five sections are taken, a description cut at a hundred', r.json.ok && r.json.sections.length === 5 && r.json.sections.every(s => s.desc.length === 100), r.json.sections && r.json.sections.map(s => s.desc.length));
  await W.db('HSET', W.K.page('toem2'), 'sections', JSON.stringify(Array.from({ length: 7 }, (_, i) => ({ id: 'old' + i, title: 'Old ' + i, desc: 'x'.repeat(200) }))));
  r = await GET();
  check('seven saved before the cap read as the first five, their descriptions a hundred long', r.json.sections.map(s => s.id).join() === 'old0,old1,old2,old3,old4' && r.json.sections.every(s => s.desc.length === 100), r.json.sections.map(s => s.id));
  check('back to the default is the moderators\' too', brief(await POST({ op: 'sections', reset: true }, 'nu')).code === 'role');
  r = await POST({ op: 'sections', reset: true }, 'mod');
  check('back to the default: an album with no sections', r.json.ok && r.json.sections.length === 0 && (await GET()).json.sections.length === 0, r.json);
  r = await POST({ op: 'sections', sections: [{ id: 'harbour', title: '  The  harbour ', desc: 'Boats and gulls', open: true }, { id: 'hills', title: 'The hills', open: true }] }, 'mod');
  check('a keeper arranges the album into sections', r.json.ok && r.json.sections.length === 2 && r.json.sections[0].title === 'The harbour' && r.json.sections[0].desc === 'Boats and gulls' && r.json.sections[1].desc === '', r.json);
  check('…which everyone reads', (await GET()).json.sections.map(s => s.id).join() === 'harbour,hills');
  r = await POST({ op: 'post', cap: 'Nets', desc: '  Drying on the quay,\nafter the catch. ', sec: 'harbour', src: PNG }, 'nu');
  const p3 = r.json.photo;
  check('a photo posts with a description and into a section', r.json.ok && p3.desc === 'Drying on the quay, after the catch.' && p3.sec === 'harbour', r.json.photo);
  r = await POST({ op: 'post', cap: 'Lost', sec: 'nowhere', src: PNG }, 'mod');
  const p4 = r.json.photo;
  check('a section that is not one is none, and no description is an empty one', r.json.ok && p4.sec === '' && p4.desc === '', r.json.photo);
  check('somebody else\'s title: no', brief(await POST({ op: 'edit', id: p3.id, cap: 'Mine now' }, 'nu2')).code === 'role');
  check('a photo that is not there', (await POST({ op: 'edit', id: 'nope', cap: 'x' }, 'nu')).status === 404);
  check('a title cannot be taken away', brief(await POST({ op: 'edit', id: p3.id, cap: '  ' }, 'nu')).code === 'cap');
  r = await POST({ op: 'edit', id: p3.id, cap: 'Nets drying', desc: '', sec: 'hills' }, 'nu');
  check('the taker changes the title, clears the description, moves it to another section', r.json.ok && r.json.photo.cap === 'Nets drying' && r.json.photo.desc === '' && r.json.photo.sec === 'hills' && r.json.photo.tag === 'nu#1', r.json);
  r = await POST({ op: 'edit', id: p3.id, desc: 'A keeper wrote this' }, 'mod');
  check('a keeper changes another\'s, and only what was sent', r.json.ok && r.json.photo.cap === 'Nets drying' && r.json.photo.desc === 'A keeper wrote this' && r.json.photo.sec === 'hills', r.json);
  r = await GET('', 'nu');
  const back = r.json.photos.find(p => p.id === p3.id);
  check('…and it reads back so, in its place among the others', back && back.cap === 'Nets drying' && back.desc === 'A keeper wrote this' && back.sec === 'hills' && r.json.photos.map(p => p.id).join() === [p4.id, p3.id, p2.id, p1.id].join(), r.json.photos.map(p => p.id));
  check('…with its hearts', back && back.likes === 0 && (await GET('', 'mod')).json.photos.find(p => p.id === p1.id).liked === true);
  check('the record says a keeper changed it', (await W.db('LRANGE', W.K.audit, 0, -1)).map(s => JSON.parse(s)).some(e => e.what === 'edit' && e.by === U.mod && e.of === U.nu && e.ch === 'album'));
  r = await POST({ op: 'sections', sections: [{ id: 'harbour', title: 'The harbour' }] }, 'mod');
  check('a section taken down leaves its photos, unsectioned', r.json.ok && (await GET()).json.photos.find(p => p.id === p3.id).sec === '');
  await POST({ op: 'drop', id: p3.id }, 'nu'); await POST({ op: 'drop', id: p4.id }, 'mod');   // the two of this section go, so the counts below are the album's first two again

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
  await POST({ op: 'sections', sections: [{ id: 'town', title: 'Around town', open: true }] }, 'mod');
  r = await POST({ op: 'post', cap: 'the one that tips it', sec: 'town', src: PNG }, 'nu');
  const kept = (await GET()).json.photos;
  check('a full album drops its oldest for the new one', r.json.ok && kept.length === API.KEEP && kept[0].id === r.json.photo.id && !kept.some(p => p.id === 'old0199') && kept.some(p => p.id === 'old0198'), kept.length);
  check('and the one that fell off takes its picture and its hearts', !fs.existsSync(path.join(tmp, 'album/toem2/old0199.png')) && fs.existsSync(path.join(tmp, 'album/toem2/old0198.png')) && (await W.db('SCARD', W.K.albumLike('toem2', 'old0199'))) === 0);

  // A VISITOR'S SHARE (2026-09-28, the hardening): twenty up at a time for whoever is no moderator, so one account's photos do not push the album off its own end
  console.log('a visitor\'s share of the album');
  r = await POST({ op: 'post', cap: 'one more', sec: 'town', src: PNG }, 'nu2');   // nu2 has the old ones to their name
  check('somebody with twenty up already hangs no more — and nothing is written for it', r.status === 429 && r.json.code === 'mine-full' && (await GET()).json.photos.length === API.KEEP && (await GET()).json.photos[0].cap === 'the one that tips it'
        && fs.readdirSync(dir).filter(f => !/^old/.test(f)).length === 1, brief(r));
  await W.db('DEL', W.K.album('toem2'));
  for (let i = 0; i < API.MINE_MAX - 1; i++) await W.db('RPUSH', W.K.album('toem2'), JSON.stringify({ id: 'mine' + i, by: U.nu, at: 2000 - i, cap: 'mine ' + i, src: '/toem2/album/toem2/none.png' }));
  r = await POST({ op: 'post', cap: 'the twentieth', sec: 'town', src: PNG }, 'nu');
  const p20 = r.json.photo;
  check('the twentieth goes up', r.json.ok && (await GET()).json.photos.length === API.MINE_MAX, brief(r));
  check('the twenty-first does not', brief(await POST({ op: 'post', cap: 'x', sec: 'town', src: PNG }, 'nu')).code === 'mine-full');
  check('one taken down makes room for one', (await POST({ op: 'drop', id: p20.id }, 'nu')).json.ok && (await POST({ op: 'post', cap: 'in its place', sec: 'town', src: PNG }, 'nu')).json.ok);
  await W.db('DEL', W.K.album('toem2'));
  for (let i = 0; i < API.MINE_MAX + 5; i++) await W.db('RPUSH', W.K.album('toem2'), JSON.stringify({ id: 'kept' + i, by: U.mod, at: 3000 - i, cap: 'kept ' + i, src: '/toem2/album/toem2/none.png' }));
  check('a moderator has as many up as the album keeps', (await POST({ op: 'post', cap: 'and another', src: PNG }, 'mod')).json.ok && (await GET()).json.photos.length === API.MINE_MAX + 6);

  // WHO TENDS THE CORNER (2026-09-28, api/wall.js): TOEM 2's trusted keep its wall, not its album
  console.log('who tends the album');
  U.old = 'e'.repeat(16); await W.db('HSET', W.K.user(U.old), 'made', '1', 'name', 'old', 'role', 'user'); T.old = await W.mintSession(U.old);
  await W.db('SADD', W.K.days(U.old), ...Array.from({ length: 12 }, (_, i) => '2026-08-' + String(i + 1).padStart(2, '0')));
  const kept0 = (await GET('', 'old')).json;
  check('ten standing days do not make the album somebody\'s to arrange: no sections, nobody else\'s photo changed or taken down, none hung where it is shut',
        kept0.me.keeper === false && [await POST({ op: 'sections', sections: [] }, 'old'), await POST({ op: 'sections', reset: true }, 'old'), await POST({ op: 'edit', id: kept0.photos[0].id, cap: 'mine now' }, 'old'),
                                      await POST({ op: 'drop', id: kept0.photos[0].id }, 'old'), await POST({ op: 'post', cap: 'x', src: PNG }, 'old')].map(x => x.status + ':' + x.json.code).join() === '403:role,403:role,403:role,403:role,403:role'
        && (await GET()).json.photos.length === kept0.photos.length, kept0.me);

  console.log('the rate');
  let last = null;
  for (let i = 0; i < 21; i++) last = await POST({ op: 'post', cap: 'p ' + i, sec: 'town', src: PNG }, 'nu2');
  check('an hour\'s twenty photos and no more', last.status === 429 && last.json.code === 'rate', brief(last));

  fs.rmSync(tmp, { recursive: true, force: true });
  console.log(fails ? '\n' + fails + ' FAILED' : '\nall passed');
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
