/* toem2/board.js — THE TOWN BOARD AND THE CHAT (2026-09-24): two buttons in
   the bottom-left corner of the bench, a megaphone and a speech bubble, and
   the two panels they stand up. THE TOWN BOARD has four tabs — NEWS and
   UPDATES (the page's keepers write them; api/wall.js: THE RULES), RULES
   (the five below, the page's own words) and the FORUM (threads and
   replies, anyone signed in). THE CHAT is one line at a time from whoever
   is signed in, each under the gnome's own name and picture — the card's
   (/api/wall?who=), the same face the yard and the account corner draw.
   Both are blank until people fill them: nothing here is seeded. The books
   are api/board.js's; what this browser keeps is only when each tab was
   last looked at (knoll-<page>:town:seen), which is what the little counts
   are. Not on the yard's picture of this page (?embed=1).

   ponytail: the chat polls — every 4 s open, every minute closed — rather
   than riding cursors.js's room; a 'chat' action on that room is the
   upgrade if the wait shows. Pictures are one card fetch per author per
   page load. */
window.Town = (function () {
  if (document.documentElement.classList.contains('toem-embed')) return null;
  const PAGE = document.documentElement.dataset.page || 'toem2', PQ = 'page=' + encodeURIComponent(PAGE);
  const API = '/api/board', CARD = '/api/wall?who=', TOKEN = 'knoll-toem2:token', SEEN = 'knoll-' + PAGE + ':town:seen';
  const POLL_OPEN = 4000, POLL_SHUT = 60000, CAP = { title: 80, line: 500, body: 2000 };
  const RULES = [
    ['Be kind', 'No insults, name-calling or pile-ons.'],
    ['Share your own photos', 'Credit others when posting their shots.'],
    ['No spoilers in titles', 'Put quest solutions inside the thread.'],
    ['One thread per topic', 'Search before posting a new one.'],
    ['No selling or ads', 'Stamp trades are fine, money is not.']
  ];
  const TABS = [['news', 'News'], ['updates', 'Updates'], ['rules', 'Rules'], ['forum', 'Forum']];
  const SVG = {
    horn: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 9.5v5h3.2l7.3 4.5V5L6.7 9.5z"/><path d="M17.3 9.2a3.6 3.6 0 0 1 0 5.6M19.6 6.8a7 7 0 0 1 0 10.4" fill="none"/><path d="M6.2 14.5v4.3h3.2" fill="none"/></svg>',
    bubble: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5.5h16v10.5h-8.2L7.5 19.6v-3.6H4z"/></svg>',
    plane: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 11.2L20.5 3.5l-7.4 17-2.2-7.4z"/></svg>'
  };

  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const get = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const set = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };
  const token = () => get(TOKEN);
  const headers = extra => Object.assign({}, extra || {}, token() ? { authorization: 'Bearer ' + token() } : {});
  const ago = t => { const s = Math.max(0, (Date.now() - t) / 1000); return s < 60 ? 'just now' : s < 3600 ? Math.floor(s / 60) + ' min ago' : s < 86400 ? Math.floor(s / 3600) + ' h ago' : Math.floor(s / 86400) + ' d ago'; };
  const gate = () => (window.KnollAccount && KnollAccount.gate ? KnollAccount.gate('login') : '/login/?next=' + encodeURIComponent(location.pathname + location.search));
  const initial = tag => (String(tag || '?').replace(/#\d+$/, '').trim()[0] || '?').toUpperCase();
  const initialFor = tag => { const m = /^(.*?)(#\d+)?$/.exec(String(tag || '')); return [m[1] || 'a gnome', m[2] || '']; };

  let me = null, seen = {}, tab = 'news', thread = null, loading = false, busy = false, timer = 0, openPanel = null, drawn = '';
  const posts = { news: [], updates: [], forum: [], chat: [] };
  try { seen = JSON.parse(get(SEEN)) || {}; } catch (e) { seen = {}; }
  let fabs, boardBtn, chatBtn, board, chat, tabsEl, boardBody, chatList, chatForm, chatIn, chatSend, chatGate, chatNote;

  // ── the door ────────────────────────────────────────────────────────────
  async function load(chs) {
    let out = null;
    try { const r = await fetch(API + '?' + PQ + '&ch=' + chs, { headers: headers(), cache: 'no-store' }); out = r.ok ? await r.json() : null; } catch (e) {}
    if (!out || !out.ok) return false;
    me = out.me || null;
    Object.assign(posts, out.posts);
    return true;
  }
  const send = body => fetch(API + '?' + PQ, { method: 'POST', headers: headers({ 'content-type': 'application/json' }), body: JSON.stringify(body) })
    .then(r => r.json()).catch(() => ({ ok: false, error: 'the door did not answer' }));
  const canDrop = p => !!me && (p.by === me.id || me.keeper);
  async function drop(ch, p, after) {
    if (busy || !confirm(p.by === me.id ? 'Take your post down?' : 'Hide this post? It goes for everyone.')) return;
    busy = true;
    const out = await send({ op: 'drop', ch, id: p.id });
    busy = false;
    if (!out.ok) { alert('Not done: ' + (out.error || 'the door said no') + '.'); return; }
    posts[ch] = posts[ch].filter(x => x.id !== p.id && x.re !== p.id);
    after();
  }

  // ── the little counts ───────────────────────────────────────────────────
  const unread = ch => (posts[ch] || []).filter(p => p.at > (seen[ch] || 0)).length;
  const look = ch => { if (!ch || ch === 'rules') return; seen[ch] = Date.now(); set(SEEN, JSON.stringify(seen)); badges(); };
  const fill = (b, n) => { b.textContent = n > 9 ? '9+' : n ? String(n) : ''; };
  function badges() {
    fill(boardBtn.querySelector('.town-badge'), unread('news') + unread('updates') + unread('forum'));
    fill(chatBtn.querySelector('.town-badge'), openPanel === chat ? 0 : unread('chat'));
    TABS.forEach(([ch]) => { const b = tabsEl.querySelector('[data-tab="' + ch + '"] .town-badge'); if (b) fill(b, ch === 'rules' || ch === tab && openPanel === board ? 0 : unread(ch)); });
  }

  // ── pictures: the card's, once per author ───────────────────────────────
  const pics = new Map();                       // account → its picture ('' for none), or the fetch on its way
  const showPic = (node, src) => { if (!src || node.querySelector('img')) return; const img = el('img'); img.src = src; img.alt = ''; node.replaceChildren(img); };
  function picIn(node, id) {
    const have = pics.get(id);
    if (typeof have === 'string') return showPic(node, have);
    if (!have) pics.set(id, fetch(CARD + encodeURIComponent(id), { cache: 'no-store' }).then(r => (r.ok ? r.json() : null))
      .then(o => { const src = (o && o.ok && o.who && o.who.avatar) || ''; pics.set(id, src); return src; }).catch(() => { pics.set(id, ''); return ''; }));
    pics.get(id).then(src => { if (src) document.querySelectorAll('.town-pic[data-pic="' + id + '"]').forEach(n => showPic(n, src)); });
  }
  const whoEl = tag => { const [name, n] = initialFor(tag), s = el('span', 'town-who'); s.append(name); if (n) s.append(el('small', null, n)); return s; };

  // ── the board ───────────────────────────────────────────────────────────
  const empty = words => el('p', 'town-empty', words);
  const note = (p, words) => { p.textContent = words || ''; p.hidden = !words; };
  function meta(ch, p, after, more) {
    const m = el('div', 'town-meta');
    m.append('by ', whoEl(p.tag), ' · ' + ago(p.at) + (more ? ' · ' + more : ''));
    if (canDrop(p)) { const x = el('button', 'town-x', '×'); x.type = 'button'; x.title = p.by === me.id ? 'take it down' : 'hide it'; x.setAttribute('aria-label', x.title); x.addEventListener('click', () => drop(ch, p, after)); m.append(x); }
    return m;
  }
  function card(ch, p, after) {
    const c = el('article', 'town-card'), b = el('div', 'town-card-b');
    if (p.title) b.append(el('span', 'town-card-h', p.title));
    b.append(el('p', 'town-card-t', p.text), meta(ch, p, after));
    c.append(b);
    return c;
  }
  const gateLine = words => { const p = el('p', 'town-gate'), a = el('a', null, 'Log in'); a.href = gate(); p.append(a, ' ' + words); return p; };
  function form(ch, opts) {                     // a title (unless a reply), the words, and the button that sends them
    const f = el('form', 'town-form'), err = el('p', 'town-note'); err.hidden = true;
    let title = null;
    if (!opts.re) { title = el('input'); title.type = 'text'; title.maxLength = CAP.title; title.placeholder = opts.titleHint; title.setAttribute('aria-label', 'title'); title.autocomplete = 'off'; f.append(title); }
    const ta = el('textarea'); ta.maxLength = CAP.body; ta.placeholder = opts.hint; ta.setAttribute('aria-label', 'the post'); f.append(ta);
    const go = el('button', 'town-btn', opts.verb); go.type = 'submit';
    f.append(go, err);
    f.addEventListener('submit', async e => {
      e.preventDefault();
      if (busy) return;
      const body = { op: 'post', ch, text: ta.value };
      if (title) body.title = title.value;
      if (opts.re) body.re = opts.re;
      if (!body.text.trim() || (title && !title.value.trim())) { note(err, title && !title.value.trim() ? 'Give it a title.' : 'Say something.'); return; }
      busy = true; go.disabled = true;
      const out = await send(body);
      busy = false; go.disabled = false;
      if (!out.ok) { note(err, 'Not posted: ' + (out.error || 'the door said no') + '.'); return; }
      posts[ch].unshift(out.post);
      opts.after(out.post);
    });
    return f;
  }
  function renderFeed(ch) {
    const list = posts[ch];
    if (!list.length) boardBody.append(empty('Nothing here yet.'));
    list.forEach(p => boardBody.append(card(ch, p, renderBoard)));
    if (me && me.keeper) boardBody.append(form(ch, { titleHint: 'A title', hint: 'What is new?', verb: 'post', after: () => { renderBoard(); look(ch); } }));
  }
  function renderRules() {
    boardBody.append(el('p', 'town-intro', 'Keep the town friendly. Moderators can hide posts that break these.'));
    RULES.forEach(([h, t], i) => {
      const c = el('article', 'town-card'), b = el('div', 'town-card-b');
      b.append(el('span', 'town-card-h', h), el('p', 'town-card-t', t));
      c.append(el('span', 'town-n', String(i + 1)), b);
      boardBody.append(c);
    });
  }
  function renderForum() {
    const threads = posts.forum.filter(p => !p.re), replies = id => posts.forum.filter(p => p.re === id).length;
    if (!threads.length) boardBody.append(empty('No threads yet.'));
    threads.forEach(t => {
      const c = el('button', 'town-card is-thread'); c.type = 'button';
      const b = el('div', 'town-card-b'), m = el('div', 'town-meta'), n = replies(t.id);
      m.append('by ', whoEl(t.tag), ' · ' + ago(t.at) + ' · ' + (n === 1 ? '1 reply' : n + ' replies'));
      b.append(el('span', 'town-card-h', t.title), m);
      c.append(b);
      c.addEventListener('click', () => { thread = t.id; renderBoard(); });
      boardBody.append(c);
    });
    if (me) boardBody.append(form('forum', { titleHint: 'A title for the thread', hint: 'Start it off…', verb: 'start a thread', after: p => { thread = p.id; renderBoard(); look('forum'); } }));
    else boardBody.append(gateLine('to start a thread.'));
  }
  function renderThread() {
    const t = posts.forum.find(p => p.id === thread && !p.re);
    const back = el('button', 'town-back', '← all threads'); back.type = 'button'; back.addEventListener('click', () => { thread = null; renderBoard(); });
    boardBody.append(back);
    if (!t) { boardBody.append(empty('That thread is gone.')); return; }
    const leave = () => { thread = null; renderBoard(); };
    boardBody.append(card('forum', t, leave));
    posts.forum.filter(p => p.re === t.id).reverse().forEach(p => boardBody.append(card('forum', p, renderBoard)));
    if (me) boardBody.append(form('forum', { re: t.id, hint: 'Reply…', verb: 'reply', after: () => { renderBoard(); look('forum'); } }));
    else boardBody.append(gateLine('to reply.'));
  }
  function renderBoard() {
    tabsEl.querySelectorAll('.town-tab').forEach(b => { const on = b.dataset.tab === tab; b.classList.toggle('is-on', on); b.setAttribute('aria-selected', on ? 'true' : 'false'); b.tabIndex = on ? 0 : -1; });
    boardBody.replaceChildren();
    boardBody.scrollTop = 0;
    if (tab === 'rules') renderRules();
    else if (tab === 'forum') (thread ? renderThread : renderForum)();
    else renderFeed(tab);
    badges();
  }
  function pick(ch) { tab = ch; thread = null; renderBoard(); look(ch); }

  // ── the chat ────────────────────────────────────────────────────────────
  function renderChat() {
    const list = posts.chat.slice().reverse(), print = (me ? me.id + (me.keeper ? '+' : '') : '') + '|' + list.map(m => m.id).join(',');
    chatForm.hidden = !me; chatGate.hidden = !!me;
    if (print === drawn) return;                // nothing new: the list stands (and so does a selection in it)
    drawn = print;
    const stick = chatList.scrollHeight - chatList.scrollTop - chatList.clientHeight < 48;
    chatList.replaceChildren();
    if (!list.length) chatList.append(empty('Nobody has said anything yet.'));
    let prev = null;
    list.forEach(m => {
      const more = !!prev && prev.by === m.by && m.at - prev.at < 5 * 60000;
      const row = el('div', 'town-msg' + (me && m.by === me.id ? ' is-me' : '') + (more ? ' is-more' : ''));
      row.dataset.id = m.id;
      const pic = el('span', 'town-pic', initial(m.tag)); pic.dataset.pic = m.by; picIn(pic, m.by);
      const name = el('span', 'town-name'); name.append(whoEl(m.tag));
      const bubble = el('div', 'town-bubble', m.text); bubble.title = new Date(m.at).toLocaleString();
      row.append(name, pic, bubble);
      if (canDrop(m)) { const x = el('button', 'town-x', '×'); x.type = 'button'; x.title = m.by === me.id ? 'take it back' : 'hide it'; x.setAttribute('aria-label', x.title); x.addEventListener('click', () => drop('chat', m, () => { drawn = ''; renderChat(); })); row.append(x); }
      chatList.append(row);
      prev = m;
    });
    if (stick) chatList.scrollTop = chatList.scrollHeight;
  }
  async function say(e) {
    e.preventDefault();
    const text = chatIn.value.trim();
    if (!text || busy) return;
    busy = true; chatSend.disabled = true;
    const out = await send({ op: 'post', ch: 'chat', text });
    busy = false; chatSend.disabled = false;
    if (!out.ok) { note(chatNote, 'Not sent: ' + (out.error || 'the door said no') + '.'); chatIn.focus(); return; }
    note(chatNote, '');
    chatIn.value = '';
    posts.chat.unshift(out.post);
    renderChat(); look('chat');
    chatList.scrollTop = chatList.scrollHeight;
    chatIn.focus();
  }

  // ── polling: the chat every 4 s while it is up, everything every minute otherwise ──
  function schedule() { clearTimeout(timer); timer = setTimeout(tick, openPanel === chat ? POLL_OPEN : POLL_SHUT); }
  async function tick() {
    if (!loading && !document.hidden) {
      loading = true;
      await load(openPanel === chat ? 'chat' : 'chat,news,updates,forum');
      loading = false;
      if (openPanel === chat) { renderChat(); look('chat'); }
      badges();
    }
    schedule();
  }

  // ── opening and closing ─────────────────────────────────────────────────
  function show(p) {
    if (openPanel === p) return hide();
    hide();
    openPanel = p; p.hidden = false;
    (p === board ? boardBtn : chatBtn).setAttribute('aria-expanded', 'true');
    if (p === board) { renderBoard(); look(tab); load('news,updates,forum').then(ok => { if (ok && openPanel === board) { renderBoard(); look(tab); } }); }
    else { drawn = ''; renderChat(); look('chat'); load('chat').then(ok => { if (ok && openPanel === chat) { renderChat(); look('chat'); chatList.scrollTop = chatList.scrollHeight; } }); if (me) chatIn.focus(); }
    schedule();
  }
  function hide() {
    if (!openPanel) return;
    openPanel.hidden = true;
    (openPanel === board ? boardBtn : chatBtn).setAttribute('aria-expanded', 'false');
    openPanel = null;
    badges(); schedule();
  }

  // ── the furniture ───────────────────────────────────────────────────────
  function fab(id, label, icon, panelId) {
    const b = el('button', 'town-fab'); b.type = 'button'; b.id = id; b.title = label; b.setAttribute('aria-label', label);
    b.setAttribute('aria-expanded', 'false'); b.setAttribute('aria-controls', panelId);
    b.innerHTML = icon; b.append(el('i', 'town-badge'));
    return b;
  }
  function panel(id, icon, title, sub) {
    const p = el('section', 'town-panel'); p.id = id; p.hidden = true; p.setAttribute('role', 'dialog'); p.setAttribute('aria-label', title);
    const head = el('div', 'town-head'), tile = el('span', 'town-tile'), tt = el('div', 'town-title');
    tile.innerHTML = icon;
    tt.append(el('b', null, title), el('small', null, sub));
    const x = el('button', 'town-close', '✕'); x.type = 'button'; x.setAttribute('aria-label', 'close'); x.addEventListener('click', hide);
    head.append(tile, tt, x);
    p.append(head);
    return p;
  }
  function build() {
    fabs = el('div', 'town-fabs');
    boardBtn = fab('town-board-btn', 'the town board', SVG.horn, 'town-board');
    chatBtn = fab('town-chat-btn', 'the chat', SVG.bubble, 'town-chat');
    boardBtn.addEventListener('click', () => show(board));
    chatBtn.addEventListener('click', () => show(chat));
    fabs.append(boardBtn, chatBtn);

    board = panel('town-board', SVG.horn, 'Town Board', 'News, updates, rules & forum');
    tabsEl = el('div', 'town-tabs'); tabsEl.setAttribute('role', 'tablist');
    TABS.forEach(([ch, label]) => {
      const b = el('button', 'town-tab'); b.type = 'button'; b.dataset.tab = ch; b.setAttribute('role', 'tab'); b.setAttribute('aria-selected', 'false');
      b.append(label, el('i', 'town-badge'));
      b.addEventListener('click', () => pick(ch));
      tabsEl.append(b);
    });
    tabsEl.addEventListener('keydown', e => {   // the arrow keys walk the tabs, as a tablist's do
      const i = TABS.findIndex(([ch]) => ch === tab), d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (!d) return;
      e.preventDefault(); pick(TABS[(i + d + TABS.length) % TABS.length][0]); tabsEl.querySelector('.is-on').focus();
    });
    boardBody = el('div', 'town-body');
    board.append(tabsEl, boardBody);

    chat = panel('town-chat', SVG.bubble, 'Chat', 'Everyone on this wall');
    chatList = el('div', 'town-body town-chat-list'); chatList.setAttribute('aria-live', 'polite');
    chatNote = el('p', 'town-note town-chat-note'); chatNote.hidden = true;
    chatGate = gateLine('to chat.'); chatGate.className = 'town-gate town-chat-gate'; chatGate.hidden = true;
    chatForm = el('form', 'town-say'); chatForm.hidden = true;
    chatIn = el('input'); chatIn.type = 'text'; chatIn.maxLength = CAP.line; chatIn.placeholder = 'Say something nice…'; chatIn.autocomplete = 'off'; chatIn.setAttribute('aria-label', 'your message');
    chatSend = el('button', 'town-send'); chatSend.type = 'submit'; chatSend.title = 'send'; chatSend.setAttribute('aria-label', 'send'); chatSend.innerHTML = SVG.plane;
    chatForm.append(chatIn, chatSend);
    chatForm.addEventListener('submit', say);
    chat.append(chatList, chatNote, chatGate, chatForm);

    document.body.append(fabs, board, chat);
  }

  document.addEventListener('DOMContentLoaded', () => {
    build();
    tick();
    window.addEventListener('focus', () => { if (!loading) tick(); });
    document.addEventListener('visibilitychange', () => { if (!document.hidden && !loading) tick(); });
    window.addEventListener('keydown', e => { if (e.key === 'Escape' && openPanel && !(window.Lab && Lab.menuUp)) hide(); });
  });

  return { open: which => show(which === 'chat' ? chat : board), close: hide, pick, load, get me() { return me; }, get posts() { return posts; },
           get isOpen() { return openPanel === board ? 'board' : openPanel === chat ? 'chat' : null; } };
})();
