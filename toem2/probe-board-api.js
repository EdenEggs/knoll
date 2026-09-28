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
  check('a channel that is not one', (await GET('?ch=nothing')).json.code === 'ch');
  check('a notice tab asked for by name is an empty list', Array.isArray((await GET('?ch=rules')).json.posts.rules) && !(await GET('?ch=rules')).json.posts.rules.length);
  check('a page that is not one', (await GET('?page=nowhere')).json.code === 'page');

  console.log('writing');
  check('signed out: no', (await POST({ op: 'post', ch: 'chat', text: 'hi' })).status === 401);
  check('another site: no', brief(await POST({ op: 'post', ch: 'chat', text: 'hi' }, 'nu', '', 'https://evil.example')).code === 'origin');
  check('banned: no', (await POST({ op: 'post', ch: 'chat', text: 'hi' }, 'ban')).status === 403);
  check('the news is the keepers\'', brief(await POST({ op: 'post', ch: 'news', title: 'Hello', text: 'x' }, 'nu')).code === 'role');
  r = await POST({ op: 'post', ch: 'news', title: '  Opening  day ', text: 'The wall is open.\r\n\r\n\r\n\r\nCome and draw.' }, 'mod');
  check('a keeper posts news: one-line title, paragraphs kept, tag on it', r.json.ok && r.json.post.title === 'Opening day' && r.json.post.text === 'The wall is open.\n\nCome and draw.' && r.json.post.tag === 'mod#1', r.json);
  check('news wants a title', brief(await POST({ op: 'post', ch: 'updates', text: 'no title' }, 'mod')).code === 'title');
  // A NOTICE'S LABEL, AND MAJOR (2026-09-28): a posts tab's entries may carry both; a space's board draws them
  r = await POST({ op: 'post', ch: 'updates', title: 'Pins', text: 'One a board.', label: '  v1.2\n<b> ', major: true }, 'mod');
  check('a keeper\'s notice keeps its label — one line, as a title is, and set as text wherever it is drawn — and is major', r.json.ok && r.json.post.label === 'v1.2<b>' && r.json.post.major === true, r.json.post);
  r = await POST({ op: 'post', ch: 'updates', title: 'Long', text: 'x', label: 'L'.repeat(40), major: 'yes' }, 'mod');
  check('…sixteen letters of it, and major is true or it is not said', r.json.ok && r.json.post.label === 'L'.repeat(16) && !('major' in r.json.post), r.json.post);
  r = await POST({ op: 'post', ch: 'updates', title: 'Plain', text: 'x', label: '   ' }, 'mod');
  check('no label is no label', r.json.ok && !('label' in r.json.post) && !('major' in r.json.post), r.json.post);
  r = (await GET('?ch=updates')).json.posts.updates;
  check('the book keeps them, newest first', r.map(p => [p.title, p.label, p.major]).join('|') === 'Plain,,|Long,' + 'L'.repeat(16) + ',|Pins,v1.2<b>,true', r.map(p => [p.title, p.label, p.major]));
  for (const p of r) await POST({ op: 'drop', ch: 'updates', id: p.id }, 'mod');
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

  console.log('the tabs');
  r = await GET('', 'nu');
  check('a page starts with the four tabs, and a chat open to anyone', r.json.tabs.length === 4 && r.json.tabs.map(t => t.ch).join() === 'news,updates,rules,forum' && r.json.tabs[2].kind === 'notice' && r.json.chat.who === 'anyone' && r.json.chat.wait === 0 && r.json.chat.can === true && r.json.chat.named === undefined, r.json.tabs);
  check('…and ?ch=board is every tab that keeps posts', Object.keys(r.json.posts).join() === 'news,updates,forum', Object.keys(r.json.posts));
  // A NOTICE'S RULES (2026-09-28): the Rules tab nobody has written has the five its page starts with — the town's here, Knoll's on a space
  check('the Rules tab starts with its words and the town\'s five rules', /^Keep the town friendly\./.test(r.json.tabs[2].text) && r.json.tabs[2].rules.map(x => x.title).join('|') === 'Be kind|Share your own photos|No spoilers in titles|One thread per topic|No selling or ads'
        && r.json.tabs[2].rules[4].text === 'Stamp trades are fine, money is not.', r.json.tabs[2]);
  await W.db('HSET', W.K.page('glade'), 'made', '1', 'title', 'Glade', 'by', U.nu);
  r = await GET('?page=glade');
  check('a space\'s are Knoll\'s five', /^Keep the place friendly\./.test(r.json.tabs[2].text) && r.json.tabs[2].rules.map(x => x.title).join('|') === 'Be kind|Credit the maker|No spoilers in titles|One thread per topic|No selling or ads', r.json.tabs[2]);
  const notice = rules => [{ ch: 'rules', title: 'Rules', kind: 'notice', text: 'Mind these.', rules }];
  for (const [what, rules] of [['eleven', Array.from({ length: 11 }, (_, i) => ({ title: 'r' + i }))], ['one with no title', [{ title: '  ', text: 'x' }]], ['not a list', 'be kind'], ['a rule that is not one', [null]]])
    check('rules refused: ' + what, brief(await POST({ op: 'tabs', page: 'glade', tabs: notice(rules) }, 'nu')).code === 'tabs');
  r = await POST({ op: 'tabs', page: 'glade', tabs: notice([{ title: '  Be  gentle ', text: 'x'.repeat(260) }, { title: 'T'.repeat(80) }]) }, 'nu');
  check('its maker writes the rules: a title one line and sixty long, its words two hundred', r.json.ok && r.json.tabs[0].rules.length === 2 && r.json.tabs[0].rules[0].title === 'Be gentle' && r.json.tabs[0].rules[0].text.length === 200
        && r.json.tabs[0].rules[1].title.length === 60 && r.json.tabs[0].rules[1].text === '', r.json.tabs);
  r = await POST({ op: 'tabs', page: 'glade', tabs: notice([]) }, 'nu');
  check('every rule taken down is no rules — not the five again', r.json.ok && r.json.tabs[0].rules.length === 0 && (await GET('?page=glade')).json.tabs[0].rules.length === 0, r.json.tabs);
  check('back to the default is the moderators\' too', brief(await POST({ op: 'tabs', page: 'glade', reset: true }, 'nu2')).code === 'role');
  await W.db('LPUSH', W.K.board('glade', 'rules'), 'x');   // (a list where the notice is, to see that a reset leaves a notice's alone and clears nothing it should not)
  r = await POST({ op: 'tabs', page: 'glade', reset: true }, 'nu');
  check('back to the default: the four tabs, and the five rules again', r.json.ok && r.json.tabs.map(t => t.ch).join() === 'news,updates,rules,forum' && r.json.tabs[2].rules.length === 5 && r.json.tabs[2].rules[1].title === 'Credit the maker'
        && (await GET('?page=glade')).json.tabs[2].rules.length === 5 && (await W.db('HGET', W.K.page('glade'), 'tabs')) === '', r.json.tabs);
  check('the tabs are the keepers\' to arrange', brief(await POST({ op: 'tabs', tabs: API.TABS }, 'nu')).code === 'role');
  for (const [what, tabs] of [['none', []], ['nine', Array.from({ length: 9 }, (_, i) => ({ ch: 't' + i, title: 't' + i, kind: 'posts' }))], ['a bad name', [{ ch: 'Bad Name', title: 'x', kind: 'posts' }]],
                              ['"chat"', [{ ch: 'chat', title: 'x', kind: 'posts' }]], ['two alike', [{ ch: 'a', title: 'x', kind: 'posts' }, { ch: 'a', title: 'y', kind: 'posts' }]],
                              ['no title', [{ ch: 'a', title: ' ', kind: 'posts' }]], ['a kind that is not one', [{ ch: 'a', title: 'x', kind: 'video' }]]])
    check('tabs refused: ' + what, brief(await POST({ op: 'tabs', tabs }, 'mod')).code === 'tabs');
  await POST({ op: 'post', ch: 'updates', title: 'An update', text: 'x' }, 'mod');   // so a tab made another kind has something to clear
  const arranged = [{ ch: 'news', title: '  Announcements ', kind: 'posts', who: 'keepers' }, { ch: 'events', title: 'Events', kind: 'posts', who: 'anyone' },
                    { ch: 'rules', title: 'House rules', kind: 'notice', who: 'anyone', text: 'Be kind.\r\n\r\n\r\nNo spoilers.' }, { ch: 'updates', title: 'Updates', kind: 'threads', who: 'anyone' }];
  r = await POST({ op: 'tabs', tabs: arranged }, 'mod');
  check('a keeper arranges the board: a tab renamed, a new one for anyone, a notice with its text (the keepers\', whatever was said), one made another kind, one taken down',
        r.json.ok && r.json.tabs.length === 4 && r.json.tabs[0].title === 'Announcements' && r.json.tabs[1].who === 'anyone' && r.json.tabs[2].who === 'keepers' && r.json.tabs[2].text === 'Be kind.\n\nNo spoilers.' && r.json.tabs[3].kind === 'threads', r.json);
  check('a notice sent with its words and no rules (a dashboard from before them) has none', Array.isArray(r.json.tabs[2].rules) && r.json.tabs[2].rules.length === 0 && (await GET()).json.tabs[2].rules.length === 0, r.json.tabs[2]);
  r = await GET('', 'nu');
  check('…and the board reads back so: the news kept, the forum gone, the updates cleared', r.json.tabs.map(t => t.ch).join() === 'news,events,rules,updates' && r.json.posts.news.length === 1 && !('forum' in r.json.posts) && r.json.posts.updates.length === 0, r.json.posts);
  check('the lists that went are gone from the store', (await W.db('LLEN', W.K.board('toem2', 'forum'))) === 0 && (await W.db('LLEN', W.K.board('toem2', 'updates'))) === 0);
  r = await POST({ op: 'post', ch: 'events', title: 'A fair', text: 'Saturday' }, 'nu');
  check('anyone signed in posts on a tab for anyone', r.json.ok && r.json.post.title === 'A fair', r.json);
  check('a notice takes no posts', brief(await POST({ op: 'post', ch: 'rules', title: 'x', text: 'y' }, 'mod')).code === 'ch');
  check('a tab that is gone is no channel', brief(await POST({ op: 'post', ch: 'forum', title: 'x', text: 'y' }, 'nu')).code === 'ch');
  r = await POST({ op: 'post', ch: 'updates', title: 'A thread now', text: 'x' }, 'nu');
  check('the tab made threads takes a thread from anyone', r.json.ok && !r.json.post.re && r.json.post.title === 'A thread now', r.json);
  check('the record says who arranged it, and what went', (await W.db('LRANGE', W.K.audit, 0, -1)).map(s => JSON.parse(s)).some(e => e.what === 'tabs' && e.by === U.mod && e.gone === 'updates,forum'));
  // BACK TO THE DEFAULT (2026-09-28): the four tabs again — what was added goes with its posts, what was taken down comes back empty, what stayed keeps its posts
  r = await POST({ op: 'tabs', reset: true }, 'mod');
  check('back to the default: News, Updates, Rules, Forum — the five rules under the Rules tab', r.json.ok && r.json.tabs.map(t => t.ch + ':' + t.title + ':' + t.kind).join() === 'news:News:posts,updates:Updates:posts,rules:Rules:notice,forum:Forum:threads' && r.json.tabs[2].rules.length === 5, r.json.tabs);
  r = await GET('', 'nu');
  check('…the news kept, Events gone with its posts, the updates (threads a moment ago) cleared, the forum back and empty',
        r.json.posts.news.length === 1 && !('events' in r.json.posts) && r.json.posts.updates.length === 0 && r.json.posts.forum.length === 0 && (await W.db('LLEN', W.K.board('toem2', 'events'))) === 0, r.json.posts);
  check('…and the record says it was a reset', (await W.db('LRANGE', W.K.audit, 0, -1)).map(s => JSON.parse(s)).some(e => e.what === 'tabs' && e.reset === true && e.gone === 'events,updates'));

  console.log('the chat\'s rules');
  check('the rules are the keepers\' to set', brief(await POST({ op: 'chat', who: 'keepers', wait: 0 }, 'nu')).code === 'role');
  for (const [what, b] of [['a wait past an hour', { who: 'anyone', wait: 4000 }], ['a who that is not one', { who: 'friends', wait: 0 }], ['too many named', { who: 'named', wait: 0, named: Array.from({ length: 51 }, (_, i) => String(i).padStart(16, '0')) }]])
    check('chat rules refused: ' + what, brief(await POST(Object.assign({ op: 'chat' }, b), 'mod')).code === 'chat');
  r = await POST({ op: 'chat', who: 'keepers', wait: 0 }, 'mod');
  check('the keepers only: set, and said back', r.json.ok && r.json.chat.who === 'keepers' && r.json.chat.can === true && Array.isArray(r.json.chat.named), r.json);
  r = await GET('?ch=chat', 'nu');
  check('a gnome who is not a keeper reads that they may not', r.json.chat.who === 'keepers' && r.json.chat.can === false, r.json.chat);
  check('…and may not', brief(await POST({ op: 'post', ch: 'chat', text: 'hi' }, 'nu')).code === 'role');
  check('a keeper still may', (await POST({ op: 'post', ch: 'chat', text: 'hi' }, 'mod')).json.ok);
  r = await POST({ op: 'chat', who: 'named', wait: 0, named: [U.nu, U.nu, 'not-an-id'] }, 'mod');
  check('named people: kept once each, by id, and named back to a keeper with their tags', r.json.ok && r.json.chat.named.length === 1 && r.json.chat.named[0].tag === 'nu#1', r.json.chat);
  check('a named gnome may chat', (await POST({ op: 'post', ch: 'chat', text: 'hi' }, 'nu')).json.ok);
  check('one not named may not', brief(await POST({ op: 'post', ch: 'chat', text: 'hi' }, 'nu2')).code === 'role');
  check('…and the list of the named is not theirs to read', (await GET('?ch=chat', 'nu2')).json.chat.named === undefined);
  r = await POST({ op: 'chat', who: 'anyone', wait: 5 }, 'mod');
  check('a wait of five seconds', r.json.ok && r.json.chat.wait === 5);
  check('the first line goes', (await POST({ op: 'post', ch: 'chat', text: 'one' }, 'nu2')).json.ok);
  r = await POST({ op: 'post', ch: 'chat', text: 'two' }, 'nu2');
  check('the second, at once, waits — and is told how long', r.status === 429 && r.json.code === 'wait' && r.json.wait >= 1 && r.json.wait <= 5, r.json);
  check('somebody else\'s line is not held by it', (await POST({ op: 'post', ch: 'chat', text: 'three' }, 'nu')).json.ok);
  await W.db('DEL', W.K.rl('chat:toem2:' + U.nu2, 'wait'));
  check('once the wait is over, the line goes', (await POST({ op: 'post', ch: 'chat', text: 'two' }, 'nu2')).json.ok);
  await POST({ op: 'chat', who: 'named', wait: 30, named: [U.nu] }, 'mod');
  check('back to the default is the moderators\' too', brief(await POST({ op: 'chat', reset: true }, 'nu')).code === 'role');
  r = await POST({ op: 'chat', reset: true }, 'mod');
  check('back to the default: anyone signed in, no wait, nobody named', r.json.ok && r.json.chat.who === 'anyone' && r.json.chat.wait === 0 && r.json.chat.named.length === 0 && (await GET('?ch=chat', 'nu2')).json.chat.can === true, r.json);

  console.log('who is here');
  r = await GET('?ch=chat');
  check('a read that does not ask says nothing of who is here', !('here' in r.json));
  r = await GET('?ch=chat&here=1', 'nu');
  check('the one who asks is here — here=1 says how many, and names nobody', r.json.here && r.json.here.n === 1 && !('who' in r.json.here), r.json.here);
  r = await GET('?ch=chat&here=2', 'nu');
  check('here=2 names them: one, by tag', r.json.here.n === 1 && r.json.here.who.length === 1 && r.json.here.who[0].id === U.nu && r.json.here.who[0].tag === 'nu#1', r.json.here);
  r = await GET('?ch=chat&here=2', 'mod');
  check('asking twice is being here once; two are here, in the order of their names', r.json.here.n === 2 && r.json.here.who.map(x => x.tag).join() === 'mod#1,nu#1', r.json.here);
  r = await GET('?ch=chat&here=2', 'ban');
  check('a banned account reads the list and is not on it', r.json.here.n === 2 && !r.json.here.who.some(x => x.id === U.ban), r.json.here);
  r = await GET('?ch=chat&here=2');
  check('signed out: how many, and not who — however it is asked', r.json.here.n === 2 && !('who' in r.json.here), r.json.here);
  // only a page of this site marks anybody: a link on another site, followed with the cookie, is nobody arriving (and is told no names)
  r = await new Promise(resolve => { const req = { method: 'GET', url: '/api/board?ch=chat&here=2', headers: { host: 'localhost:4321', 'x-real-ip': '10.0.0.1', authorization: 'Bearer ' + T.nu2, 'sec-fetch-site': 'cross-site' }, socket: { remoteAddress: '127.0.0.1' } };
    API(req, { statusCode: 200, setHeader() {}, end(s) { resolve({ status: this.statusCode, json: JSON.parse(s) }); } }); });
  check('a read that came from another site marks nobody, and is told how many and no more', r.status === 200 && r.json.here.n === 2 && !('who' in r.json.here) && !(await W.db('HGET', W.K.joined('toem2'), U.nu2)), r.json.here);
  check('another page is another list', (await GET('?page=glade&ch=chat&here=2', 'nu2')).json.here.who.map(x => x.tag).join() === 'nu2#1');
  await W.db('ZADD', W.K.here('toem2'), Date.now() - 91000, U.nu);
  r = await GET('?ch=chat&here=2', 'mod');
  check('not seen for a minute and a half: gone from it, and swept from the store', r.json.here.n === 1 && r.json.here.who[0].id === U.mod && (await W.db('ZCARD', W.K.here('toem2'))) === 1, r.json.here);

  // THE PAGE'S HISTORY (2026-09-28, api/wall.js ?history=1): who joined — the first time each was seen here — and the edits that went up
  console.log('the page\'s history');
  const wall = (q, who) => new Promise(resolve => {
    const req = { method: 'GET', url: '/api/wall' + q, headers: Object.assign({ host: 'localhost:4321', 'x-real-ip': '10.0.0.1' }, who ? { authorization: 'Bearer ' + T[who] } : {}), socket: { remoteAddress: '127.0.0.1' } };
    W(req, { statusCode: 200, setHeader() {}, end(s) { resolve({ status: this.statusCode, json: JSON.parse(s) }); } });
  });
  const joinedAt = await W.db('HGETALL', W.K.joined('toem2'));
  check('whoever was seen here is kept, with when — the banned one not', Object.keys(joinedAt).sort().join() === [U.mod, U.nu].sort().join() && +joinedAt[U.nu] > 0, joinedAt);
  await W.db('ZADD', W.K.here('toem2'), Date.now() - 91000, U.mod);   // gone a while, and back
  await GET('?ch=chat&here=1', 'mod');
  check('…the first time only: coming back does not move it', (await W.db('HGET', W.K.joined('toem2'), U.mod)) === joinedAt[U.mod]);
  check('the history is not a stranger\'s to read, nor nobody\'s', brief(await wall('?history=1', 'nu')).code === 'role' && (await wall('?history=1')).status === 401);
  const t0 = Date.now() - 5 * 86400000, line = (rev, by, how, more) => JSON.stringify(Object.assign({ rev, edit: 'e' + rev, by, name: 'x', how, cls: 'small', at: t0 + rev * 1000, n: { put: rev, del: 0, art: 0 } }, more || {}));
  await W.db('RPUSH', W.pageKeys('toem2').log, line(7, U.nu, 'revert', { of: 6 }), line(6, U.nu2, 'motion'), line(5, U.nu2, 'approved', { via: U.mod }), line(4, U.nu, 'strike', { of: 3 }), line(3, U.nu2, 'live'), line(2, 'seed', 'seed'));
  r = await wall('?history=1', 'mod');
  const H = r.json.history || [];
  check('a moderator reads it: the edits that went up — live, approved, carried — and not what was undone, struck, or the wall it opened on',
        r.status === 200 && H.filter(e => e.kind === 'edit').map(e => e.rev + ':' + e.how).join() === '6:motion,5:approved,3:live' && H.find(e => e.rev === 5).via === 'mod#1' && H.find(e => e.rev === 5).tag === 'nu2#1' && H.find(e => e.rev === 3).n.put === 3, H);
  check('…and who joined: each the first time the page knew of them — seen here (mod), or a line of theirs in the log from before that was kept (nu2, and nu, whose oldest line is older than their being seen)',
        H.filter(e => e.kind === 'join').map(e => e.tag).sort().join() === 'mod#1,nu#1,nu2#1' && H.find(e => e.kind === 'join' && e.by === U.nu2).at === t0 + 3000
        && H.find(e => e.kind === 'join' && e.by === U.nu).at === t0 + 4000 && H.find(e => e.kind === 'join' && e.by === U.mod).at === +joinedAt[U.mod], H.filter(e => e.kind === 'join'));
  check('newest first — and at one moment the joining is under the edit it came with', H.every((e, i) => !i || H[i - 1].at >= e.at) && H.findIndex(e => e.kind === 'edit' && e.rev === 3) + 1 === H.findIndex(e => e.kind === 'join' && e.by === U.nu2), H.map(e => e.kind + ':' + e.at));
  check('another page has a history of its own', (await wall('?history=1&page=glade', 'nu')).json.history.map(e => e.kind + ':' + e.tag).join() === 'join:nu2#1');

  console.log('a label where it does not belong');
  await POST({ op: 'tabs', tabs: [{ ch: 'open', title: 'Open', kind: 'posts', who: 'anyone' }, { ch: 'forum', title: 'Forum', kind: 'threads', who: 'anyone' }] }, 'mod');
  await POST({ op: 'chat', who: 'anyone', wait: 0, named: [] }, 'mod');
  r = await POST({ op: 'post', ch: 'open', title: 'Mine', text: 'x', label: 'Hello', major: true }, 'nu2');
  check('anyone who may post labels their notice — and only a keeper makes one major', r.json.ok && r.json.post.label === 'Hello' && !('major' in r.json.post), r.json.post);
  r = await POST({ op: 'post', ch: 'forum', title: 'A thread', text: 'x', label: 'Hello', major: true }, 'mod');
  check('a thread carries neither', r.json.ok && !('label' in r.json.post) && !('major' in r.json.post), r.json.post);
  r = await POST({ op: 'post', ch: 'chat', text: 'x', label: 'Hello', major: true }, 'mod');
  check('nor does a line of the chat', r.json.ok && !('label' in r.json.post) && !('major' in r.json.post) && !('title' in r.json.post), r.json.post);

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
