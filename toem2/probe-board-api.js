/* toem2/probe-board-api.js — api/board.js, in this process, against a throwaway
   file store: no server, no browser, no network. The module is required with
   WALL_DB pointed at a temp file and called with a fake (req, res) the way
   serve.js and Vercel call it, and every rule in its head is tried once —
   who reads, who writes where, the caps, replies, dropping, the rate, the
   origin check. The real wall-db.json is never touched.

   Run:  node toem2/probe-board-api.js */
'use strict';
const fs = require('fs'), path = require('path'), os = require('os');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'toem2-board-'));
process.env.WALL_DB = path.join(tmp, 'wall-db.json');
delete process.env.KV_REST_API_URL; delete process.env.UPSTASH_REDIS_REST_URL; delete process.env.VERCEL;
const W = require('../api/wall.js'), API = require('../api/board.js');

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
const GET = (q, who) => call('GET', '/api/board' + (q || ''), null, who && T[who]);
const POST = (body, who, q, origin) => call('POST', '/api/board' + (q || ''), body, who && T[who], origin);
const brief = r => ({ status: r.status, code: r.json.code });

(async () => {
  for (const [who, u] of Object.entries(U)) {
    await W.db('HSET', W.K.user(u), 'made', '1', 'name', who, 'role', who === 'mod' ? 'mod' : 'user');
    T[who] = await W.mintSession(u);
  }
  await W.db('HSET', W.K.user(U.ban), 'banned', '1');

  console.log('reading');
  let r = await GET();
  check('a blank board: three empty lists, nobody signed in', r.status === 200 && r.json.me === null && ['news', 'updates', 'forum'].every(ch => Array.isArray(r.json.posts[ch]) && !r.json.posts[ch].length), r.json);
  r = await GET('?ch=chat', 'nu');
  check('the chat, signed in: me is named, not a keeper', r.json.me && r.json.me.tag === 'nu#1' && r.json.me.keeper === false && r.json.posts.chat.length === 0, r.json.me);
  r = await GET('', 'mod');
  check('a moderator is a keeper', r.json.me && r.json.me.keeper === true && r.json.me.mod === true, r.json.me);
  check('a channel that is not one', (await GET('?ch=rules')).json.code === 'ch');
  check('a page that is not one', (await GET('?page=nowhere')).json.code === 'page');

  console.log('writing');
  check('signed out: no', (await POST({ op: 'post', ch: 'chat', text: 'hi' })).status === 401);
  check('another site: no', brief(await POST({ op: 'post', ch: 'chat', text: 'hi' }, 'nu', '', 'https://evil.example')).code === 'origin');
  check('banned: no', (await POST({ op: 'post', ch: 'chat', text: 'hi' }, 'ban')).status === 403);
  check('the news is the keepers\'', brief(await POST({ op: 'post', ch: 'news', title: 'Hello', text: 'x' }, 'nu')).code === 'role');
  r = await POST({ op: 'post', ch: 'news', title: '  Opening  day ', text: 'The wall is open.\r\n\r\n\r\n\r\nCome and draw.' }, 'mod');
  check('a keeper posts news: one-line title, paragraphs kept, tag on it', r.json.ok && r.json.post.title === 'Opening day' && r.json.post.text === 'The wall is open.\n\nCome and draw.' && r.json.post.tag === 'mod#1', r.json);
  check('news wants a title', brief(await POST({ op: 'post', ch: 'updates', text: 'no title' }, 'mod')).code === 'title');
  check('and words', brief(await POST({ op: 'post', ch: 'updates', title: 't', text: '   ' }, 'mod')).code === 'text');
  r = await POST({ op: 'post', ch: 'forum', title: 'First thread', text: 'Anyone here?' }, 'nu');
  const thread = r.json.post && r.json.post.id;
  check('anyone signed in starts a thread', r.json.ok && thread && !r.json.post.re, r.json);
  check('a thread wants a title', brief(await POST({ op: 'post', ch: 'forum', text: 'untitled' }, 'nu2')).code === 'title');
  r = await POST({ op: 'post', ch: 'forum', re: thread, text: 'Me.' }, 'nu2');
  check('a reply names its thread and needs no title', r.json.ok && r.json.post.re === thread && r.json.post.title == null, r.json);
  check('a reply to no thread', brief(await POST({ op: 'post', ch: 'forum', re: 'nope', text: 'x' }, 'nu2')).code === 're');
  check('a reply to a reply is not a thread', brief(await POST({ op: 'post', ch: 'forum', re: r.json.post.id, text: 'x' }, 'nu')).code === 're');
  r = await POST({ op: 'post', ch: 'chat', text: 'x'.repeat(600) + '\n\nmore' }, 'nu');
  check('a chat line is one line, cut at 500', r.json.ok && r.json.post.text.length === 500 && !r.json.post.text.includes('\n'), r.json.post && r.json.post.text.length);
  await POST({ op: 'post', ch: 'chat', text: 'second' }, 'nu2');
  r = await GET('?ch=chat,forum', 'nu');
  check('read back newest first, each with its author\'s tag', r.json.posts.chat.length === 2 && r.json.posts.chat[0].text === 'second' && r.json.posts.chat[0].tag === 'nu2#1' && r.json.posts.forum.length === 2 && r.json.posts.forum[1].id === thread, r.json.posts.chat.map(p => p.tag));
  const chatId = r.json.posts.chat[1].id;

  console.log('dropping');
  check('somebody else\'s: no', brief(await POST({ op: 'drop', ch: 'forum', id: thread }, 'nu2')).code === 'role');
  check('one that is not there', (await POST({ op: 'drop', ch: 'forum', id: 'nope' }, 'nu')).status === 404);
  r = await POST({ op: 'drop', ch: 'forum', id: thread }, 'nu');
  check('your own thread goes, and takes its reply', r.json.ok && r.json.gone === 2 && (await GET('?ch=forum')).json.posts.forum.length === 0, r.json);
  r = await POST({ op: 'drop', ch: 'chat', id: chatId }, 'mod');
  const audit = (await W.db('LRANGE', W.K.audit, 0, -1)).map(s => JSON.parse(s));
  check('a keeper hides another\'s line, and the record says so', r.json.ok && r.json.gone === 1 && audit.some(e => e.what === 'hide' && e.by === U.mod && e.of === U.nu && e.ch === 'chat'), audit[0]);
  check('and it is gone for everyone', (await GET('?ch=chat')).json.posts.chat.length === 1);

  console.log('the rate');
  let last = null;
  for (let i = 0; i < 62; i++) last = await POST({ op: 'post', ch: 'chat', text: 'line ' + i }, 'nu2');
  check('an hour\'s sixty and no more', last.status === 429 && last.json.code === 'rate', brief(last));
  const kept = (await GET('?ch=chat')).json.posts.chat;
  check('the list keeps its cap, newest first', kept.length <= 200 && kept[0].text.startsWith('line '), kept.length);

  fs.rmSync(tmp, { recursive: true, force: true });
  console.log(fails ? '\n' + fails + ' FAILED' : '\nall passed');
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
