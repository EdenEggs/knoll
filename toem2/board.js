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

   THE TABS ARE THE KEEPERS' (2026-09-24, later that day): the door says
   which tabs this page's board has — each a title, a kind (posts, threads
   or a notice the keepers wrote) and who writes there (the keepers, or
   anyone signed in) — arranged on the page's dashboard (dashboard/manage.js);
   the four above are what a page starts with. THE CHAT'S RULES come the same
   way: who may say something (anyone, the keepers, or the people the keepers
   named) and the wait one account keeps between two lines, which the box
   counts down after each.

   KNOLL'S OWN CORNER (2026-09-28): on every page that is not TOEM 2 — the
   pages gnomes make — the pair wears Knoll's hand instead of TOEM 2's: the
   NOTICE BOARD and the TOWN CHAT of the "Knoll Announcement Board" and
   "Knoll Chat Window" sheets (corner-knoll.css: cream paper, a wooden head
   with its name on a plate, round red buttons). The books, the tabs, the
   rules and the counts are the same ones; what a space has that TOEM 2 has
   not is a notice's LABEL and whether it is MAJOR (api/board.js), a thread
   begun on a sheet of its own, faces beside the threads and the replies,
   the days between the chat's lines, three things to say at a press, and
   how many are on the page (cursors.js's room, when it is up). Nothing is
   seeded there either.

   ponytail: the chat polls — every 4 s open, every minute closed — rather
   than riding cursors.js's room; a 'chat' action on that room is the
   upgrade if the wait shows. Pictures are one card fetch per author per
   page load. */
window.Town = (function () {
  if (document.documentElement.classList.contains('toem-embed')) return null;
  const PAGE = document.documentElement.dataset.page || 'toem2', PQ = 'page=' + encodeURIComponent(PAGE);
  const KNOLL = PAGE !== 'toem2';               // KNOLL'S OWN CORNER: a space's; TOEM 2 keeps its own
  const API = '/api/board', CARD = '/api/wall?who=', TOKEN = 'knoll-toem2:token', SEEN = 'knoll-' + PAGE + ':town:seen';
  const POLL_OPEN = 4000, POLL_SHUT = 60000, CAP = { title: 80, line: 500, body: 2000, label: 16 };
  const RULES = KNOLL ? [
    ['Be kind', 'No insults, name-calling or pile-ons.'],
    ['Credit the maker', 'Say whose work it is when you share it.'],
    ['No spoilers in titles', 'Keep surprises inside the thread.'],
    ['One thread per topic', 'Search before posting a new one.'],
    ['No selling or ads', 'Swaps are fine, money is not.']
  ] : [
    ['Be kind', 'No insults, name-calling or pile-ons.'],
    ['Share your own photos', 'Credit others when posting their shots.'],
    ['No spoilers in titles', 'Put quest solutions inside the thread.'],
    ['One thread per topic', 'Search before posting a new one.'],
    ['No selling or ads', 'Stamp trades are fine, money is not.']
  ];
  const WORDS = KNOLL ? { board: 'Notice Board', boardBtn: 'the notice board', chat: 'Town Chat', chatBtn: 'the town chat', intro: 'Keep the place friendly. Moderators can hide posts that break these.' }
                      : { board: 'Town Board', boardBtn: 'the town board', chat: 'Chat', chatBtn: 'the chat', intro: 'Keep the town friendly. Moderators can hide posts that break these.' };
  const QUICK = ['Hello!', 'On my way', 'Brilliant'];   // the town chat's three things to say at a press
  // THE TABS (api/board.js): the four a page starts with, until the door says what the keepers arranged
  let tabs = [{ ch: 'news', title: 'News', kind: 'posts', who: 'keepers' }, { ch: 'updates', title: 'Updates', kind: 'posts', who: 'keepers' },
              { ch: 'rules', title: 'Rules', kind: 'notice', who: 'keepers', text: '' }, { ch: 'forum', title: 'Forum', kind: 'threads', who: 'anyone' }];
  let chatRules = { who: 'anyone', wait: 0, can: false };   // THE CHAT'S RULES, the door's word
  const tabOf = ch => tabs.find(t => t.ch === ch) || null;
  const isNotice = ch => { const t = tabOf(ch); return !!t && t.kind === 'notice'; };
  const mayWrite = ch => { const t = tabOf(ch); return !!me && !!t && t.kind !== 'notice' && (t.who === 'anyone' || me.keeper); };
  const waitWord = s => (s % 3600 === 0 ? (s / 3600) + (s === 3600 ? ' hour' : ' hours') : s % 60 === 0 ? (s / 60) + ' min' : s + ' s');
  const SVG = {
    horn: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 9.5v5h3.2l7.3 4.5V5L6.7 9.5z"/><path d="M17.3 9.2a3.6 3.6 0 0 1 0 5.6M19.6 6.8a7 7 0 0 1 0 10.4" fill="none"/><path d="M6.2 14.5v4.3h3.2" fill="none"/></svg>',
    bubble: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5.5h16v10.5h-8.2L7.5 19.6v-3.6H4z"/></svg>',
    plane: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 11.2L20.5 3.5l-7.4 17-2.2-7.4z"/></svg>'
  };
  /* Knoll's marks, as its sheets draw them — each shape carries its own paint (style, which no rule of the
     corner's outranks): on a button the mark is cream, on a panel's plate it has its colours */
  const INK = 'stroke:#17120b;stroke-width:2.5;stroke-linejoin:round;stroke-linecap:round', DOT = 'fill:#17120b;stroke:none';
  const hornK = (a, b) => '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M5 13h5l12-7v20l-12-7H5a2 2 0 0 1-2-2v-2a2 2 0 0 1 2-2Z" style="fill:' + a + ';' + INK + '"/><path d="M8 19l2 7h4l-2-7" style="fill:' + b + ';' + INK + '"/><path d="M26 12.5a4.5 4.5 0 0 1 0 7" style="fill:none;' + INK + '"/></svg>';
  const bubbleK = a => '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M5 7h22a3 3 0 0 1 3 3v11a3 3 0 0 1-3 3H15l-6 5v-5H5a3 3 0 0 1-3-3V10a3 3 0 0 1 3-3Z" style="fill:' + a + ';' + INK + '"/><circle cx="10.5" cy="15.5" r="2" style="' + DOT + '"/><circle cx="16" cy="15.5" r="2" style="' + DOT + '"/><circle cx="21.5" cy="15.5" r="2" style="' + DOT + '"/></svg>';
  const KSVG = {
    hornFab: hornK('#fdf7e3', '#fdf7e3'), hornTile: hornK('#ffd23f', '#e8484a'), bubbleFab: bubbleK('#fdf7e3'), bubbleTile: bubbleK('#5a8fd6'),
    plane: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12 20 5 15 20 11.5 13.5Z" style="fill:#fdf7e3;stroke:#17120b;stroke-width:2;stroke-linejoin:round"/></svg>',
    plus: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 3v14M3 10h14" style="fill:none;stroke:#17120b;stroke-width:3;stroke-linecap:round"/></svg>',
    back: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M13 3 6 10l7 7" style="fill:none;stroke:#17120b;stroke-width:3;stroke-linecap:round;stroke-linejoin:round"/></svg>',
    said: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3 4h14v9H9l-4 3v-3H3Z" style="fill:#5a8fd6;stroke:#17120b;stroke-width:2.2;stroke-linejoin:round"/></svg>'
  };
  const TONES = ['#ffd23f', '#5a9e58', '#f5b8c4', '#5a8fd6', '#f0cfae'];   // a face with no picture: its letter on one of the sheet's five, by the account
  const tone = id => TONES[(parseInt(String(id || '0').slice(0, 4), 16) || 0) % TONES.length];
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const dayStart = t => { const d = new Date(t); return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime(); };
  const dayWord = t => { const gap = Math.round((dayStart(Date.now()) - dayStart(t)) / 864e5), d = new Date(t); return gap <= 0 ? 'Today' : gap === 1 ? 'Yesterday' : MON[d.getMonth()] + ' ' + d.getDate() + (d.getFullYear() !== new Date().getFullYear() ? ', ' + d.getFullYear() : ''); };
  const dateWord = t => { const d = new Date(t); return MON[d.getMonth()] + ' ' + String(d.getDate()).padStart(2, '0'); };

  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const get = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const set = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };
  const token = () => get(TOKEN);
  const headers = extra => Object.assign({}, extra || {}, token() ? { authorization: 'Bearer ' + token() } : {});
  const ago = t => { const s = Math.max(0, (Date.now() - t) / 1000); return s < 60 ? 'just now' : s < 3600 ? Math.floor(s / 60) + ' min ago' : s < 86400 ? Math.floor(s / 3600) + ' h ago' : Math.floor(s / 86400) + ' d ago'; };
  const gate = () => (window.KnollAccount && KnollAccount.gate ? KnollAccount.gate('login') : '/login/?next=' + encodeURIComponent(location.pathname + location.search));
  const initial = tag => (String(tag || '?').replace(/#\d+$/, '').trim()[0] || '?').toUpperCase();
  const initialFor = tag => { const m = /^(.*?)(#\d+)?$/.exec(String(tag || '')); return [m[1] || 'a gnome', m[2] || '']; };

  let me = null, seen = {}, tab = 'news', thread = null, loading = false, busy = false, timer = 0, openPanel = null, drawn = '', coolT = 0, tabsKey = '';
  const posts = { chat: [] };
  try { seen = JSON.parse(get(SEEN)) || {}; } catch (e) { seen = {}; }
  let fabs, boardBtn, chatBtn, board, chat, tabsEl, boardBody, boardSub, chatList, chatForm, chatIn, chatSend, chatGate, chatNote, chatWhy, chatSub, chatQuick = null;

  // ── the door ────────────────────────────────────────────────────────────
  async function load(chs) {
    let out = null;
    try { const r = await fetch(API + '?' + PQ + '&ch=' + chs, { headers: headers(), cache: 'no-store' }); out = r.ok ? await r.json() : null; } catch (e) {}
    if (!out || !out.ok) return false;
    me = out.me || null;
    Object.assign(posts, out.posts);
    if (Array.isArray(out.tabs) && out.tabs.length) setTabs(out.tabs);
    if (out.chat) chatRules = out.chat;
    return true;
  }
  // THE TABS, as the door has them: the buttons are rebuilt when the list changes, and the subtitle names them
  function setTabs(list) {
    const key = JSON.stringify(list);
    if (key === tabsKey) return;
    tabsKey = key; tabs = list;
    if (tabsEl) buildTabs();
    if (boardSub) boardSub.textContent = tabs.map(t => t.title).join(' · ');
    if (openPanel === board) renderBoard();
  }
  function buildTabs() {
    tabsEl.replaceChildren();
    tabs.forEach(t => {
      const b = el('button', 'town-tab'); b.type = 'button'; b.dataset.tab = t.ch; b.setAttribute('role', 'tab'); b.setAttribute('aria-selected', 'false');
      b.append(t.title, el('i', 'town-badge'));
      b.addEventListener('click', () => pick(t.ch));
      tabsEl.append(b);
    });
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
  const look = ch => { if (!ch || isNotice(ch)) return; seen[ch] = Date.now(); set(SEEN, JSON.stringify(seen)); badges(); };
  const fill = (b, n) => { b.textContent = n > 9 ? '9+' : n ? String(n) : ''; };
  function badges() {
    fill(boardBtn.querySelector('.town-badge'), tabs.reduce((n, t) => n + (t.kind === 'notice' ? 0 : unread(t.ch)), 0));
    fill(chatBtn.querySelector('.town-badge'), openPanel === chat ? 0 : unread('chat'));
    tabs.forEach(t => { const b = tabsEl.querySelector('[data-tab="' + t.ch + '"] .town-badge'); if (b) fill(b, t.kind === 'notice' || t.ch === tab && openPanel === board ? 0 : unread(t.ch)); });
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
  const face = p => { const f = el('span', 'town-pic', initial(p.tag)); f.dataset.pic = p.by; f.style.setProperty('--tone', tone(p.by)); picIn(f, p.by); return f; };
  function card(ch, p, after) {
    const c = el('article', 'town-card'), b = el('div', 'town-card-b');
    if (KNOLL && (tabOf(ch) || {}).kind === 'posts') {   // a notice, pinned up: its label and its day over its title — and MAJOR, which stands out
      const top = el('div', 'town-top');
      top.append(el('span', 'town-pill', p.label || tabOf(ch).title), el('span', 'town-date', dateWord(p.at)));
      b.append(top);
      if (p.major) c.classList.add('is-major');
    }
    if (p.title) b.append(el('span', 'town-card-h', p.title));
    b.append(el('p', 'town-card-t', p.text), meta(ch, p, after));
    if (KNOLL && p.re) { c.classList.add('is-reply'); c.append(face(p)); }   // a reply: whose, by their face
    c.append(b);
    return c;
  }
  const gateLine = words => { const p = el('p', 'town-gate'), a = el('a', null, 'Log in'); a.href = gate(); p.append(a, ' ' + words); return p; };
  function form(ch, opts) {                     // a title (unless a reply), the words, and the button that sends them
    const f = el('form', 'town-form' + (opts.re ? ' is-reply' : '')), err = el('p', 'town-note'); err.hidden = true;
    let title = null, label = null, major = null;
    if (!opts.re) { title = el('input'); title.type = 'text'; title.maxLength = CAP.title; title.placeholder = opts.titleHint; title.setAttribute('aria-label', 'title'); title.autocomplete = 'off'; f.append(title); }
    if (KNOLL && !opts.re && (tabOf(ch) || {}).kind === 'posts') {   // a notice's LABEL (Notice, v1.2, Fix — the tab's name when there is none), and MAJOR, the keepers' to tick
      const row = el('div', 'town-form-row');
      label = el('input'); label.type = 'text'; label.maxLength = CAP.label; label.placeholder = 'A label — Notice, Fix… (optional)'; label.setAttribute('aria-label', 'label'); label.autocomplete = 'off';
      row.append(label);
      if (me && me.keeper) { const l = el('label', 'town-check'); major = el('input'); major.type = 'checkbox'; l.append(major, ' major'); row.append(l); }
      f.append(row);
    }
    const ta = el('textarea'); ta.maxLength = CAP.body; ta.placeholder = opts.hint; ta.setAttribute('aria-label', 'the post'); f.append(ta);
    const go = el('button', 'town-btn', opts.verb); go.type = 'submit';
    if (KNOLL && opts.re) { go.className = 'town-send'; go.textContent = ''; go.innerHTML = KSVG.plane; go.title = opts.verb; go.setAttribute('aria-label', opts.verb); ta.rows = 1; }
    if (opts.cancel) { const no = el('button', 'town-btn is-plain', 'Cancel'); no.type = 'button'; no.addEventListener('click', opts.cancel); const row = el('div', 'town-form-acts'); row.append(no, go); f.append(row, err); }
    else f.append(go, err);
    f.addEventListener('submit', async e => {
      e.preventDefault();
      if (busy) return;
      const body = { op: 'post', ch, text: ta.value };
      if (title) body.title = title.value;
      if (label && label.value.trim()) body.label = label.value;
      if (major && major.checked) body.major = true;
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
    const list = posts[ch] || [];
    if (!list.length) boardBody.append(empty('Nothing here yet.'));
    list.forEach(p => boardBody.append(card(ch, p, renderBoard)));
    if (mayWrite(ch)) boardBody.append(form(ch, { titleHint: 'A title', hint: 'What is new?', verb: 'post', after: () => { renderBoard(); look(ch); } }));
    else if (!me && tabOf(ch).who === 'anyone') boardBody.append(gateLine('to post.'));
  }
  function renderNotice(t) {                    // what the keepers wrote from the dashboard — or, on an unwritten Rules tab, the five the town started with
    if (t.text) { boardBody.append(el('p', 'town-intro town-notice', t.text)); return; }
    if (t.ch !== 'rules') { boardBody.append(empty('Nothing written here yet.')); return; }
    boardBody.append(el('p', 'town-intro', WORDS.intro));
    RULES.forEach(([h, t2], i) => {
      const c = el('article', 'town-card'), b = el('div', 'town-card-b');
      b.append(el('span', 'town-card-h', h), el('p', 'town-card-t', t2));
      c.append(el('span', 'town-n', String(i + 1)), b);
      boardBody.append(c);
    });
  }
  /* KNOLL'S FORUM: the way to a new thread first (a sheet of its own), then the threads — whose, by their face, its title,
     when, and how many have answered */
  function renderForumK(ch) {
    const all = posts[ch] || [], threads = all.filter(p => !p.re), replies = id => all.filter(p => p.re === id).length;
    if (mayWrite(ch)) {
      const b = el('button', 'town-start'); b.type = 'button'; b.innerHTML = KSVG.plus; b.append(el('span', null, 'Start a thread'));
      b.addEventListener('click', () => { thread = 'new'; renderBoard(); });
      boardBody.append(b);
    } else if (!me && tabOf(ch).who === 'anyone') boardBody.append(gateLine('to start a thread.'));
    else if (me) boardBody.append(el('p', 'town-gate', 'The keepers start the threads here.'));
    if (!threads.length) boardBody.append(empty('No threads yet.'));
    threads.forEach(t => {
      const c = el('button', 'town-card is-thread'); c.type = 'button';
      const b = el('div', 'town-card-b'), m = el('div', 'town-meta'), n = replies(t.id), said = el('span', 'town-said');
      m.append(whoEl(t.tag), ' · ' + ago(t.at));
      b.append(el('span', 'town-card-h', t.title), m);
      said.innerHTML = KSVG.said; said.append(el('span', null, String(n))); said.title = n === 1 ? '1 reply' : n + ' replies';
      c.append(face(t), b, said);
      c.addEventListener('click', () => { thread = t.id; renderBoard(); });
      boardBody.append(c);
    });
  }
  function renderNewK(ch) {                     // a new thread, on its own sheet: a title, what it says, and the two buttons
    const leave = () => { thread = null; renderBoard(); };
    if (!mayWrite(ch)) return leave();
    boardBody.append(el('b', 'town-sheet-h', 'New thread'));
    boardBody.append(form(ch, { titleHint: 'What\'s it about?', hint: 'Tell everyone…', verb: 'Post thread', cancel: leave, after: p => { thread = p.id; renderBoard(); look(ch); } }));
    const first = boardBody.querySelector('.town-form input'); if (first) first.focus();
  }
  function renderForum(ch) {
    if (KNOLL) return renderForumK(ch);
    const all = posts[ch] || [], threads = all.filter(p => !p.re), replies = id => all.filter(p => p.re === id).length;
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
    if (mayWrite(ch)) boardBody.append(form(ch, { titleHint: 'A title for the thread', hint: 'Start it off…', verb: 'start a thread', after: p => { thread = p.id; renderBoard(); look(ch); } }));
    else if (!me && tabOf(ch).who === 'anyone') boardBody.append(gateLine('to start a thread.'));
    else if (me) boardBody.append(el('p', 'town-gate', 'The keepers start the threads here.'));
  }
  function renderThread(ch) {
    if (KNOLL && thread === 'new') return renderNewK(ch);
    const all = posts[ch] || [], t = all.find(p => p.id === thread && !p.re);
    const back = el('button', 'town-back', KNOLL ? null : '← all threads'); back.type = 'button'; back.addEventListener('click', () => { thread = null; renderBoard(); });
    if (KNOLL) { back.innerHTML = KSVG.back; back.append(el('span', null, 'All threads')); }
    boardBody.append(back);
    if (!t) { boardBody.append(empty('That thread is gone.')); return; }
    const leave = () => { thread = null; renderBoard(); };
    boardBody.append(card(ch, t, leave));
    all.filter(p => p.re === t.id).reverse().forEach(p => boardBody.append(card(ch, p, renderBoard)));
    if (mayWrite(ch)) boardBody.append(form(ch, { re: t.id, hint: 'Reply…', verb: 'reply', after: () => { renderBoard(); look(ch); } }));
    else if (!me && tabOf(ch).who === 'anyone') boardBody.append(gateLine('to reply.'));
  }
  function renderBoard() {
    if (!tabOf(tab)) { tab = tabs[0].ch; thread = null; }   // the tab this browser was on is gone: the first one, then
    tabsEl.querySelectorAll('.town-tab').forEach(b => { const on = b.dataset.tab === tab; b.classList.toggle('is-on', on); b.setAttribute('aria-selected', on ? 'true' : 'false'); b.tabIndex = on ? 0 : -1; });
    boardBody.replaceChildren();
    boardBody.scrollTop = 0;
    const t = tabOf(tab);
    if (t.kind === 'notice') renderNotice(t);
    else if (t.kind === 'threads') (thread ? renderThread : renderForum)(tab);
    else renderFeed(tab);
    badges();
  }
  function pick(ch) { tab = ch; thread = null; renderBoard(); look(ch); }

  // ── the chat ────────────────────────────────────────────────────────────
  function renderChat() {
    const list = posts.chat.slice().reverse(), print = (me ? me.id + (me.keeper ? '+' : '') : '') + '|' + (chatRules.can ? 'c' : '') + '|' + list.map(m => m.id).join(',');
    // THE CHAT'S RULES: the box for those who may; a word for the signed-in who may not; the gate for the signed-out
    chatForm.hidden = !me || !chatRules.can; chatGate.hidden = !!me;
    chatWhy.hidden = !me || chatRules.can;
    chatWhy.textContent = chatRules.who === 'keepers' ? 'Only the keepers can chat here — everyone can read along.' : 'This chat is for the people the keepers named — everyone can read along.';
    // how many are on the page, where the room is up (cursors.js) — counted, never made up; then whose chat it is
    const here = KNOLL && window.Company && Company.room ? (Company.peers + 1) + ' online · ' : '';
    chatSub.textContent = here + (chatRules.who === 'keepers' ? 'The keepers' : chatRules.who === 'named' ? 'The people the keepers named' : 'Everyone on this wall') + (chatRules.wait ? ' · one message every ' + waitWord(chatRules.wait) : '');
    if (chatQuick) chatQuick.hidden = chatForm.hidden;
    if (print === drawn) return;                // nothing new: the list stands (and so does a selection in it)
    drawn = print;
    const stick = chatList.scrollHeight - chatList.scrollTop - chatList.clientHeight < 48;
    chatList.replaceChildren();
    if (!list.length) chatList.append(empty('Nobody has said anything yet.'));
    let prev = null;
    list.forEach(m => {
      const newDay = KNOLL && (!prev || dayStart(prev.at) !== dayStart(m.at));
      if (newDay) chatList.append(el('div', 'town-day', dayWord(m.at)));   // the days between the lines
      const more = !newDay && !!prev && prev.by === m.by && m.at - prev.at < 5 * 60000;
      const row = el('div', 'town-msg' + (me && m.by === me.id ? ' is-me' : '') + (more ? ' is-more' : ''));
      row.dataset.id = m.id;
      const pic = el('span', 'town-pic', initial(m.tag)); pic.dataset.pic = m.by; pic.style.setProperty('--tone', tone(m.by)); picIn(pic, m.by);
      const name = el('span', 'town-name'); name.append(whoEl(m.tag));
      const bubble = el('div', 'town-bubble', m.text); bubble.title = new Date(m.at).toLocaleString();
      row.append(name, pic, bubble);
      if (canDrop(m)) { const x = el('button', 'town-x', '×'); x.type = 'button'; x.title = m.by === me.id ? 'take it back' : 'hide it'; x.setAttribute('aria-label', x.title); x.addEventListener('click', () => drop('chat', m, () => { drawn = ''; renderChat(); })); row.append(x); }
      chatList.append(row);
      prev = m;
    });
    if (stick) chatList.scrollTop = chatList.scrollHeight;
  }
  async function say(e, quick) {                // what is in the box — or one of the three things to say at a press, which leaves the box as it is
    if (e) e.preventDefault();
    const text = (quick || chatIn.value).trim();
    if (!text || busy || (quick && chatSend.disabled)) return;
    busy = true; chatSend.disabled = true;
    const out = await send({ op: 'post', ch: 'chat', text });
    busy = false; chatSend.disabled = false;
    if (!out.ok) { note(chatNote, 'Not sent: ' + (out.error || 'the door said no') + '.'); if (out.code === 'wait' && out.wait) cooldown(out.wait); chatIn.focus(); return; }
    note(chatNote, '');
    if (!quick) chatIn.value = '';
    posts.chat.unshift(out.post);
    renderChat(); look('chat');
    chatList.scrollTop = chatList.scrollHeight;
    if (chatRules.wait) cooldown(chatRules.wait);
    chatIn.focus();
  }
  // THE WAIT: after a line, the box counts the seconds down before the next (the door counts too)
  function cooldown(s) {
    clearInterval(coolT);
    let left = Math.ceil(s);
    const step = () => { chatSend.disabled = left > 0; if (chatQuick) chatQuick.querySelectorAll('button').forEach(b => { b.disabled = left > 0; }); chatIn.placeholder = left > 0 ? 'next message in ' + left + ' s…' : 'Say something nice…'; if (left <= 0) clearInterval(coolT); left--; };
    step(); coolT = setInterval(step, 1000);
  }

  // ── polling: the chat every 4 s while it is up, everything every minute otherwise ──
  function schedule() { clearTimeout(timer); timer = setTimeout(tick, openPanel === chat ? POLL_OPEN : POLL_SHUT); }
  async function tick() {
    if (!loading && !document.hidden) {
      loading = true;
      await load(openPanel === chat ? 'chat' : 'board,chat');
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
    if (p === board) { renderBoard(); look(tab); load('board').then(ok => { if (ok && openPanel === board) { renderBoard(); look(tab); } }); }
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
    const head = el('div', 'town-head'), plate = el('span', 'town-plate'), tile = el('span', 'town-tile'), tt = el('div', 'town-title');
    tile.innerHTML = icon;
    tt.append(el('b', null, title), el('small', null, sub));
    const x = el('button', 'town-close', '✕'); x.type = 'button'; x.setAttribute('aria-label', 'close'); x.addEventListener('click', hide);
    plate.append(tile, tt);                     // the name plate: nothing of its own on TOEM 2 (board.css: display contents), a plate nailed to the wood on a space
    head.append(plate, x);
    p.append(head);
    return p;
  }
  function build() {
    fabs = el('div', 'town-fabs');
    boardBtn = fab('town-board-btn', WORDS.boardBtn, KNOLL ? KSVG.hornFab : SVG.horn, 'town-board');
    chatBtn = fab('town-chat-btn', WORDS.chatBtn, KNOLL ? KSVG.bubbleFab : SVG.bubble, 'town-chat');
    boardBtn.addEventListener('click', () => show(board));
    chatBtn.addEventListener('click', () => show(chat));
    fabs.append(boardBtn, chatBtn);

    board = panel('town-board', KNOLL ? KSVG.hornTile : SVG.horn, WORDS.board, tabs.map(t => t.title).join(' · '));
    boardSub = board.querySelector('.town-title small');
    tabsEl = el('div', 'town-tabs'); tabsEl.setAttribute('role', 'tablist');
    buildTabs();
    tabsEl.addEventListener('keydown', e => {   // the arrow keys walk the tabs, as a tablist's do
      const i = tabs.findIndex(t => t.ch === tab), d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (!d) return;
      e.preventDefault(); pick(tabs[(i + d + tabs.length) % tabs.length].ch); tabsEl.querySelector('.is-on').focus();
    });
    boardBody = el('div', 'town-body');
    board.append(tabsEl, boardBody);

    chat = panel('town-chat', KNOLL ? KSVG.bubbleTile : SVG.bubble, WORDS.chat, 'Everyone on this wall');
    chatSub = chat.querySelector('.town-title small');
    chatList = el('div', 'town-body town-chat-list'); chatList.setAttribute('aria-live', 'polite');
    chatNote = el('p', 'town-note town-chat-note'); chatNote.hidden = true;
    chatWhy = el('p', 'town-gate town-chat-gate'); chatWhy.hidden = true;
    chatGate = gateLine('to chat.'); chatGate.className = 'town-gate town-chat-gate'; chatGate.hidden = true;
    chatForm = el('form', 'town-say'); chatForm.hidden = true;
    chatIn = el('input'); chatIn.type = 'text'; chatIn.maxLength = CAP.line; chatIn.placeholder = 'Say something nice…'; chatIn.autocomplete = 'off'; chatIn.setAttribute('aria-label', 'your message');
    chatSend = el('button', 'town-send'); chatSend.type = 'submit'; chatSend.title = 'send'; chatSend.setAttribute('aria-label', 'send'); chatSend.innerHTML = KNOLL ? KSVG.plane : SVG.plane;
    chatForm.append(chatIn, chatSend);
    chatForm.addEventListener('submit', say);
    if (KNOLL) {                                // three things to say at a press, over the box — for whoever has the box
      chatQuick = el('div', 'town-quick'); chatQuick.hidden = true;
      QUICK.forEach(q => { const b = el('button', null, q); b.type = 'button'; b.addEventListener('click', () => say(null, q)); chatQuick.append(b); });
      chat.append(chatList, chatNote, chatWhy, chatGate, chatQuick, chatForm);
    } else chat.append(chatList, chatNote, chatWhy, chatGate, chatForm);

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
           get tabs() { return tabs; }, get chat() { return chatRules; }, get tab() { return tab; },
           get isOpen() { return openPanel === board ? 'board' : openPanel === chat ? 'chat' : null; } };
})();
