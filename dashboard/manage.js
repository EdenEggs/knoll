/* dashboard/manage.js — THE CORNER'S SETTINGS (2026-09-24): on a page's dashboard (?space=<slug>, TOEM 2's own
   included), for its keepers, the three things in the bench's bottom-left corner are arranged from here —
     THE TOWN BOARD's tabs: each a title, a kind (posts · threads · a notice the keepers write here) and who writes there;
     THE CHAT's rules: who may say something (anyone signed in · the keepers · people named here) and the wait between
       two lines from one person;
     THE PHOTO ALBUM: its sections; photos put up here (a picture, shrunk in the browser, a title, a description, a
       section); and the ones hanging — title, description and section changed, or taken down.
   Plain DOM, built into the #corner-manage slot the dashboard's template leaves (outside React's care) once the door
   says who is asking is a keeper; the profile dashboard has no slot to fill. The books are api/board.js's and
   api/gallery.js's; the bench's board.js and gallery.js read what is saved here on their next poll.

   ponytail: each card redraws its rows on a structural change (add, move, remove) and edits the draft in place on a
   keystroke, so nothing loses the caret; one Save a card sends the whole draft. */
(function () {
  'use strict';
  const SLUG = String(new URLSearchParams(location.search).get('space') || '').toLowerCase();
  if (!/^[a-z0-9](?:[a-z0-9-]{0,30}[a-z0-9])?$/.test(SLUG)) return;
  const PQ = 'page=' + encodeURIComponent(SLUG), BOARD = '/api/board', ALBUM = '/api/gallery', RANKS = '/api/leaderboard', FIND = '/api/friends?find=';
  const KINDS = [['posts', 'posts'], ['threads', 'threads'], ['notice', 'a notice']];
  const KIND_WORDS = { posts: 'titled entries, newest first', threads: 'a forum: threads and their replies', notice: 'one text, written here by the keepers, that everyone reads' };
  const WHOS = [['keepers', 'the keepers write here'], ['anyone', 'anyone signed in writes here']];
  const WAITS = [[0, 'no wait'], [5, '5 seconds'], [10, '10 seconds'], [30, '30 seconds'], [60, '1 minute'], [300, '5 minutes'], [900, '15 minutes'], [3600, '1 hour']];
  const CAP = { tab: 24, notice: 4000, sec: 40, secDesc: 200, cap: 60, desc: 300, bytes: 300 * 1024, side: 1600, tabs: 8, sections: 12 };

  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const line = (cls, ...nodes) => { const d = el('div', cls); d.append(...nodes); return d; };
  const btn = (cls, words, on) => { const b = el('button', cls, words); b.type = 'button'; b.addEventListener('click', on); return b; };
  const input = (cls, value, max, hint) => { const i = el('input', cls); i.type = 'text'; i.value = value || ''; if (max) i.maxLength = max; if (hint) i.placeholder = hint; i.autocomplete = 'off'; return i; };
  const select = (cls, options, value) => { const s = el('select', cls); options.forEach(([v, words]) => { const o = el('option', null, words); o.value = String(v); s.append(o); }); s.value = String(value); return s; };
  const noteEl = () => { const p = el('p', 'cm-note'); p.hidden = true; return p; };
  const say = (p, words, bad) => { p.textContent = words || ''; p.hidden = !words; p.classList.toggle('is-bad', !!bad); };
  const get = url => fetch(url, { cache: 'no-store', credentials: 'same-origin' }).then(r => r.json()).catch(() => ({ ok: false, error: 'the door did not answer' }));
  const send = (api, body) => fetch(api + '?' + PQ, { method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json' }, body: JSON.stringify(Object.assign({ page: SLUG }, body)) })
    .then(r => r.json()).catch(() => ({ ok: false, error: 'the door did not answer' }));
  const slugify = s => String(s).toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 20);
  const unique = (base, taken) => { let id = base, n = 2; while (taken.has(id)) id = id.replace(/-\d+$/, '').slice(0, 17) + '-' + n++; return id; };
  // ↑ ↓ for a row of a list the cards draw
  const mover = (list, i, redraw) => {
    const m = el('span', 'cm-move');
    const up = btn('cm-mini', '↑', () => { [list[i - 1], list[i]] = [list[i], list[i - 1]]; redraw(); }); up.disabled = i === 0; up.title = 'move up'; up.setAttribute('aria-label', 'move up');
    const dn = btn('cm-mini', '↓', () => { [list[i + 1], list[i]] = [list[i], list[i + 1]]; redraw(); }); dn.disabled = i === list.length - 1; dn.title = 'move down'; dn.setAttribute('aria-label', 'move down');
    m.append(up, dn);
    return m;
  };
  // MINIMIZED OR NOT is this browser's to remember, a page at a time (knoll-corner:<slug>:shut) — so the numbers below stay in reach
  const FOLD = 'knoll-corner:' + SLUG + ':shut';
  const shutOnes = () => { try { return JSON.parse(localStorage.getItem(FOLD)) || {}; } catch (e) { return {}; } };
  function card(title, sub, pip, rot, key) {
    const c = el('div', 'cm-card'); c.style.setProperty('--rot', rot); c.style.setProperty('--pip', pip); c.dataset.card = key;
    const fold = el('button', 'cm-fold'); fold.type = 'button';
    const set = shut => {
      c.classList.toggle('is-shut', shut);
      fold.textContent = shut ? '+' : '–'; fold.title = (shut ? 'open ' : 'minimize ') + title; fold.setAttribute('aria-label', fold.title); fold.setAttribute('aria-expanded', shut ? 'false' : 'true');
    };
    fold.addEventListener('click', () => {
      const shut = !c.classList.contains('is-shut'); set(shut);
      const o = shutOnes(); if (shut) o[key] = 1; else delete o[key];
      try { localStorage.setItem(FOLD, JSON.stringify(o)); } catch (e) {}
    });
    set(!!shutOnes()[key]);
    c.append(el('i', 'cm-pip'), fold, el('h2', null, title), el('div', 'cm-sub', sub));
    return c;
  }

  let me = null, tabs = [], chat = { who: 'anyone', wait: 0, named: [] }, sections = [], photos = [], lb = null;

  // ── THE TOWN BOARD: its tabs ────────────────────────────────────────────
  function boardCard() {
    const c = card('Town Board', 'THE TABS · WHAT EACH IS · WHO WRITES THERE', '#e8484a', '-0.4deg', 'board');
    let draft = tabs.map(t => Object.assign({}, t, { _old: true }));
    const rows = el('div', 'cm-rows'), note = noteEl();
    const draw = () => { rows.replaceChildren(); draft.forEach((t, i) => rows.append(tabRow(t, i))); add.disabled = draft.length >= CAP.tabs; };
    const tabRow = (t, i) => {
      const r = el('div', 'cm-row'), top = el('div', 'cm-row-l');
      const chip = el('code', 'cm-chip', '/' + t.ch); chip.title = 'its name in the door — settled once saved';
      const title = input('cm-in cm-in-title', t.title, CAP.tab, 'The tab\'s title'); title.setAttribute('aria-label', 'title of tab ' + (i + 1));
      title.addEventListener('input', () => { t.title = title.value; if (!t._old) { t.ch = unique(slugify(t.title) || 'tab', new Set(draft.filter(x => x !== t).map(x => x.ch).concat(['chat', 'board']))); chip.textContent = '/' + t.ch; } });
      const kind = select('cm-sel', KINDS, t.kind); kind.setAttribute('aria-label', 'kind of tab ' + (i + 1));
      const who = select('cm-sel', WHOS, t.who); who.setAttribute('aria-label', 'who writes on tab ' + (i + 1));
      const text = el('textarea', 'cm-notice'); text.maxLength = CAP.notice; text.value = t.text || ''; text.placeholder = 'The notice — what this tab says to everyone (line breaks kept)'; text.setAttribute('aria-label', 'the notice of tab ' + (i + 1));
      text.addEventListener('input', () => { t.text = text.value; });
      const hint = el('span', 'cm-hint');
      const show = () => { const n = kind.value === 'notice'; who.hidden = n; text.hidden = !n; hint.textContent = KIND_WORDS[kind.value]; };
      kind.addEventListener('change', () => { t.kind = kind.value; if (t.kind === 'notice') t.who = 'keepers'; show(); });
      who.addEventListener('change', () => { t.who = who.value; });
      const x = btn('cm-x', '×', () => { if (t._old && t.kind !== 'notice' && !confirm('Take the ' + (t.title || t.ch) + ' tab down? Its posts go with it.')) return; draft.splice(i, 1); draw(); });
      x.title = 'take this tab down'; x.setAttribute('aria-label', x.title);
      top.append(mover(draft, i, draw), title, chip, kind, who, x);
      r.append(top, hint, text);
      show();
      return r;
    };
    const add = btn('cm-btn', '+ add a tab', () => {
      if (draft.length >= CAP.tabs) return;
      draft.push({ ch: unique('tab', new Set(draft.map(x => x.ch))), title: '', kind: 'posts', who: 'keepers' }); draw();
      const last = rows.lastElementChild.querySelector('input'); if (last) last.focus();
    });
    const save = btn('cm-btn is-main', 'Save the tabs', async () => {
      if (draft.some(t => !t.title.trim())) { say(note, 'Every tab needs a title.', true); return; }
      const was = ch => tabs.find(o => o.ch === ch) || {};
      if (draft.some(t => t._old && was(t.ch).kind !== 'notice' && t.kind !== was(t.ch).kind) && !confirm('A tab made another kind starts empty — its posts go. Save anyway?')) return;
      save.disabled = true; say(note, 'Saving…');
      const out = await send(BOARD, { op: 'tabs', tabs: draft.map(t => ({ ch: t.ch, title: t.title, kind: t.kind, who: t.who, text: t.text })) });
      save.disabled = false;
      if (!out.ok) { say(note, 'Not saved: ' + (out.error || 'the door said no') + '.', true); return; }
      tabs = out.tabs; draft = tabs.map(t => Object.assign({}, t, { _old: true })); draw();
      say(note, 'Saved — the board wears it now.');
    });
    draw();
    c.append(rows, line('cm-actions', add, save), note);
    return c;
  }

  // ── THE CHAT: its rules ─────────────────────────────────────────────────
  function chatCard() {
    const c = card('Chat', 'WHO MAY SAY SOMETHING · THE WAIT BETWEEN TWO LINES', '#5a8fd6', '0.5deg', 'chat');
    let who = chat.who, wait = chat.wait, named = (chat.named || []).slice();
    const note = noteEl(), radios = el('div', 'cm-radios'), namedBox = el('div', 'cm-named'), chips = el('div', 'cm-chips'), hits = el('div', 'cm-hits');
    const drawChips = () => {
      chips.replaceChildren();
      if (!named.length) chips.append(el('span', 'cm-hint', 'nobody named yet — search a username below'));
      named.forEach(n => {
        const ch = el('span', 'cm-chip is-person', n.tag || n.id);
        const x = btn('cm-x', '×', () => { named = named.filter(m => m.id !== n.id); drawChips(); }); x.title = 'take ' + (n.tag || 'them') + ' off the list'; x.setAttribute('aria-label', x.title);
        ch.append(x); chips.append(ch);
      });
    };
    [['anyone', 'Anyone signed in'], ['keepers', 'The keepers only'], ['named', 'People named here (and the keepers)']].forEach(([v, words]) => {
      const l = el('label', 'cm-radio'), r = el('input'); r.type = 'radio'; r.name = 'cm-chat-who'; r.value = v; r.checked = who === v;
      r.addEventListener('change', () => { if (r.checked) { who = v; namedBox.hidden = who !== 'named'; } });
      l.append(r, words); radios.append(l);
    });
    const search = input('cm-in', '', 24, 'Search a username…'); search.setAttribute('aria-label', 'search a username');
    let findT = 0;
    search.addEventListener('input', () => {        // a name's start, asked of api/friends.js a beat after the last keystroke (settings/ does the same)
      const q = search.value.trim(); clearTimeout(findT); hits.replaceChildren();
      if (!q) return;
      findT = setTimeout(async () => {
        const out = await get(FIND + encodeURIComponent(q));
        if (search.value.trim() !== q) return;
        hits.replaceChildren();
        const list = out.ok ? out.users.filter(u => !named.some(n => n.id === u.id)) : [];
        if (!list.length) { hits.append(el('span', 'cm-hint', out.ok ? 'nobody by that name' : 'the search did not answer')); return; }
        list.forEach(u => hits.append(btn('cm-hit', u.tag, () => { named.push({ id: u.id, tag: u.tag }); drawChips(); hits.replaceChildren(); search.value = ''; })));
      }, 250);
    });
    namedBox.append(chips, search, hits); namedBox.hidden = who !== 'named';
    const waitSel = select('cm-sel', WAITS.some(([v]) => v === wait) ? WAITS : WAITS.concat([[wait, wait + ' seconds']]), wait);
    waitSel.setAttribute('aria-label', 'wait between messages');
    waitSel.addEventListener('change', () => { wait = +waitSel.value; });
    const save = btn('cm-btn is-main', 'Save the chat\'s rules', async () => {
      if (who === 'named' && !named.length && !confirm('Nobody is named, so only the keepers will be able to chat. Save anyway?')) return;
      save.disabled = true; say(note, 'Saving…');
      const out = await send(BOARD, { op: 'chat', who, wait, named: named.map(n => n.id) });
      save.disabled = false;
      if (!out.ok) { say(note, 'Not saved: ' + (out.error || 'the door said no') + '.', true); return; }
      chat = out.chat; named = (chat.named || []).slice(); drawChips();
      say(note, 'Saved — the chat keeps to it from now on.');
    });
    drawChips();
    c.append(line('cm-field', el('span', 'cm-label-t', 'WHO CAN MESSAGE'), radios, namedBox),
             line('cm-field', el('span', 'cm-label-t', 'WAIT BETWEEN MESSAGES'), waitSel, el('span', 'cm-hint', 'how long one person waits after a line before the next — the keepers wait too')),
             line('cm-actions', save), note);
    return c;
  }

  // ── THE PHOTO ALBUM: its sections, photos put up, the ones hanging ──────
  // a picture as the door takes it: 1600 px a side at most and under 300 KB, as a JPEG — smaller and softer until it fits
  function shrink(file) {
    return new Promise((ok, no) => {
      const url = URL.createObjectURL(file), img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        const c = document.createElement('canvas'), x = c.getContext('2d');
        for (const side of [CAP.side, 1200, 900, 640, 480]) {
          const s = Math.min(1, side / Math.max(img.naturalWidth, img.naturalHeight));
          c.width = Math.max(1, Math.round(img.naturalWidth * s)); c.height = Math.max(1, Math.round(img.naturalHeight * s));
          x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(img, 0, 0, c.width, c.height);
          for (const q of [0.86, 0.76, 0.66, 0.56]) { const out = c.toDataURL('image/jpeg', q); if (out.length * 0.75 <= CAP.bytes) return ok(out); }
        }
        no(new Error('too big'));
      };
      img.onerror = () => { URL.revokeObjectURL(url); no(new Error('not a picture')); };
      img.src = url;
    });
  }
  function albumCard() {
    const c = card('Photo Album', 'ITS SECTIONS · PHOTOS PUT UP HERE · THE ONES HANGING', '#7bc264', '-0.3deg', 'album'); c.classList.add('is-wide');
    const secOptions = () => [['', 'no section']].concat(sections.map(s => [s.id, s.title]));
    // the sections
    let draft = sections.map(s => Object.assign({}, s, { _old: true }));
    const secRows = el('div', 'cm-rows'), secNote = noteEl();
    const drawSecs = () => {
      secRows.replaceChildren(); draft.forEach((s, i) => secRows.append(secRow(s, i))); addSec.disabled = draft.length >= CAP.sections;
      if (!draft.length) secRows.append(el('span', 'cm-hint', 'no sections yet — the album is one grid until there are'));
    };
    const secRow = (s, i) => {
      const r = el('div', 'cm-row cm-row-l');
      const chip = el('code', 'cm-chip', '/' + s.id); chip.title = 'its name in the door — settled once saved';
      const title = input('cm-in cm-in-title', s.title, CAP.sec, 'The section\'s title'); title.setAttribute('aria-label', 'title of section ' + (i + 1));
      title.addEventListener('input', () => { s.title = title.value; if (!s._old) { s.id = unique(slugify(s.title) || 'section', new Set(draft.filter(x => x !== s).map(x => x.id))); chip.textContent = '/' + s.id; } });
      const desc = input('cm-in cm-in-desc', s.desc, CAP.secDesc, 'A line about it (optional)'); desc.setAttribute('aria-label', 'description of section ' + (i + 1));
      desc.addEventListener('input', () => { s.desc = desc.value; });
      const x = btn('cm-x', '×', () => { if (s._old && !confirm('Take the ' + (s.title || s.id) + ' section down? Its photos stay in the album, unsectioned.')) return; draft.splice(i, 1); drawSecs(); });
      x.title = 'take this section down'; x.setAttribute('aria-label', x.title);
      r.append(mover(draft, i, drawSecs), title, chip, desc, x);
      return r;
    };
    const addSec = btn('cm-btn', '+ add a section', () => {
      if (draft.length >= CAP.sections) return;
      draft.push({ id: unique('section', new Set(draft.map(x => x.id))), title: '', desc: '' }); drawSecs();
      const last = secRows.lastElementChild.querySelector('input'); if (last) last.focus();
    });
    const saveSecs = btn('cm-btn is-main', 'Save the sections', async () => {
      if (draft.some(s => !s.title.trim())) { say(secNote, 'Every section needs a title.', true); return; }
      saveSecs.disabled = true; say(secNote, 'Saving…');
      const out = await send(ALBUM, { op: 'sections', sections: draft.map(s => ({ id: s.id, title: s.title, desc: s.desc })) });
      saveSecs.disabled = false;
      if (!out.ok) { say(secNote, 'Not saved: ' + (out.error || 'the door said no') + '.', true); return; }
      sections = out.sections; draft = sections.map(s => Object.assign({}, s, { _old: true })); drawSecs(); drawPending(); drawPhotos();
      say(secNote, 'Saved — the album has ' + (sections.length === 1 ? 'one section' : sections.length + ' sections') + ' now.');
    });
    // photos put up here
    const file = el('input', 'cm-file'); file.type = 'file'; file.accept = 'image/*'; file.multiple = true; file.id = 'cm-file';
    const pick = el('label', 'cm-btn', 'Choose photos…'); pick.htmlFor = 'cm-file';
    const pending = el('div', 'cm-pending'), upNote = noteEl();
    let queue = [];
    file.addEventListener('change', async () => {
      const files = [...(file.files || [])]; file.value = '';
      for (const f of files) {
        say(upNote, 'Reading ' + f.name + '…');
        try { queue.push({ src: await shrink(f), cap: f.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim().slice(0, CAP.cap), desc: '', sec: '' }); say(upNote, ''); }
        catch (e) { say(upNote, f.name + ' is not a picture this album takes.', true); }
      }
      drawPending();
    });
    const drawPending = () => {
      pending.replaceChildren();
      queue.forEach(p => {
        const r = el('div', 'cm-photo'), img = el('img', 'cm-thumb'); img.src = p.src; img.alt = '';
        const cap = input('cm-in cm-in-title', p.cap, CAP.cap, 'A title'); cap.setAttribute('aria-label', 'title'); cap.addEventListener('input', () => { p.cap = cap.value; });
        const desc = input('cm-in cm-in-desc', p.desc, CAP.desc, 'A description (optional)'); desc.setAttribute('aria-label', 'description'); desc.addEventListener('input', () => { p.desc = desc.value; });
        const sec = select('cm-sel', secOptions(), p.sec); sec.setAttribute('aria-label', 'section'); sec.addEventListener('change', () => { p.sec = sec.value; });
        const go = btn('cm-btn is-main', 'Put it up', async () => {
          if (!p.cap.trim()) { say(upNote, 'Give it a title first.', true); cap.focus(); return; }
          go.disabled = true; say(upNote, 'Putting it up…');
          const out = await send(ALBUM, { op: 'post', cap: p.cap, desc: p.desc, sec: p.sec, src: p.src });
          go.disabled = false;
          if (!out.ok) { say(upNote, 'Not put up: ' + (out.error || 'the door said no') + '.', true); return; }
          queue = queue.filter(x => x !== p); photos.unshift(out.photo); drawPending(); drawPhotos();
          say(upNote, '“' + out.photo.cap + '” is in the album.');
        });
        const never = btn('cm-x', '×', () => { queue = queue.filter(x => x !== p); drawPending(); }); never.title = 'never mind'; never.setAttribute('aria-label', never.title);
        r.append(img, line('cm-photo-f', cap, desc, sec), line('cm-photo-a', go, never));
        pending.append(r);
      });
    };
    // the ones hanging
    const list = el('div', 'cm-photos'), listNote = noteEl();
    const drawPhotos = () => {
      list.replaceChildren();
      if (!photos.length) { list.append(el('span', 'cm-hint', 'nothing hangs in the album yet')); return; }
      photos.forEach(p => {
        const r = el('div', 'cm-photo'), img = el('img', 'cm-thumb'); img.src = p.src; img.alt = ''; img.loading = 'lazy';
        const cap = input('cm-in cm-in-title', p.cap, CAP.cap, 'A title'), desc = input('cm-in cm-in-desc', p.desc || '', CAP.desc, 'A description (optional)'), sec = select('cm-sel', secOptions(), p.sec || '');
        cap.setAttribute('aria-label', 'title'); desc.setAttribute('aria-label', 'description'); sec.setAttribute('aria-label', 'section');
        const changed = () => cap.value !== p.cap || desc.value !== (p.desc || '') || sec.value !== (p.sec || '');
        const save = btn('cm-btn', 'Save', async () => {
          if (!cap.value.trim()) { say(listNote, 'A photo keeps a title.', true); cap.focus(); return; }
          save.disabled = true;
          const out = await send(ALBUM, { op: 'edit', id: p.id, cap: cap.value, desc: desc.value, sec: sec.value });
          if (!out.ok) { save.disabled = false; say(listNote, 'Not saved: ' + (out.error || 'the door said no') + '.', true); return; }
          Object.assign(p, out.photo); cap.value = p.cap; desc.value = p.desc; sec.value = p.sec; say(listNote, '“' + p.cap + '” saved.');
        });
        save.disabled = true;
        [cap, desc].forEach(x => x.addEventListener('input', () => { save.disabled = !changed(); }));
        sec.addEventListener('change', () => { save.disabled = !changed(); });
        const down = btn('cm-x', '×', async () => {
          if (!confirm('Take “' + p.cap + '” down? It goes for everyone.')) return;
          const out = await send(ALBUM, { op: 'drop', id: p.id });
          if (!out.ok) { say(listNote, 'Not taken down: ' + (out.error || 'the door said no') + '.', true); return; }
          photos = photos.filter(x => x.id !== p.id); drawPhotos(); say(listNote, 'Taken down.');
        });
        down.title = 'take it down'; down.setAttribute('aria-label', down.title);
        const by = el('span', 'cm-hint', 'by ' + String(p.tag || 'a gnome').replace(/#\d+$/, '') + (p.likes ? ' · ' + p.likes + (p.likes === 1 ? ' heart' : ' hearts') : ''));
        r.append(img, line('cm-photo-f', cap, desc, sec, by), line('cm-photo-a', save, down));
        list.append(r);
      });
    };
    drawSecs(); drawPending(); drawPhotos();
    c.append(el('span', 'cm-label-t', 'SECTIONS'), secRows, line('cm-actions', addSec, saveSecs), secNote,
             el('span', 'cm-label-t', 'PUT PHOTOS UP'), el('span', 'cm-hint', 'a JPEG, PNG or WebP — shrunk here to 1600 px and 300 KB before it goes'), line('cm-actions', pick, file), pending, upNote,
             el('span', 'cm-label-t', 'HANGING NOW'), list, listNote);
    return c;
  }

  // ── THE LEADERBOARD: what it ranks, in what order, its title, how many rows ──
  function ranksCard() {
    const c = card('Leaderboard', 'WHAT IT RANKS · IN WHAT ORDER · ITS TITLE · HOW MANY ROWS', '#ffd23f', '0.4deg', 'ranks');
    const all = Object.keys(lb.metrics), chosen = lb.settings.tabs.filter(m => lb.metrics[m]);
    const order = chosen.concat(all.filter(m => !chosen.includes(m))), on = new Set(chosen);
    const rows = el('div', 'cm-rows'), note = noteEl();
    const draw = () => {
      rows.replaceChildren();
      order.forEach((m, i) => {
        const r = el('div', 'cm-row cm-row-l'), l = el('label', 'cm-radio'), cb = el('input'); cb.type = 'checkbox'; cb.checked = on.has(m); cb.value = m;
        cb.addEventListener('change', () => { if (cb.checked) on.add(m); else on.delete(m); });
        l.append(cb, el('b', null, lb.metrics[m].label), el('span', 'cm-hint', ' — ' + lb.metrics[m].blurb.toLowerCase()));
        r.append(mover(order, i, draw), l);
        rows.append(r);
      });
    };
    const title = input('cm-in cm-in-title', lb.settings.title, 24, 'Its title'), sub = input('cm-in cm-in-desc', lb.settings.sub, 60, 'A line under the title (optional)');
    title.setAttribute('aria-label', 'the leaderboard\'s title'); sub.setAttribute('aria-label', 'the line under its title');
    const tops = [5, 10, 15, 20, 25], top = select('cm-sel', tops.map(v => [v, v + ' rows']), tops.includes(lb.settings.top) ? lb.settings.top : 10); top.setAttribute('aria-label', 'rows');
    const save = btn('cm-btn is-main', 'Save the leaderboard', async () => {
      const tabs = order.filter(m => on.has(m));
      if (!tabs.length) { say(note, 'Tick at least one ranking.', true); return; }
      if (!title.value.trim()) { say(note, 'Give it a title.', true); return; }
      save.disabled = true; say(note, 'Saving…');
      const out = await send(RANKS, { op: 'settings', tabs, title: title.value, sub: sub.value, top: +top.value });
      save.disabled = false;
      if (!out.ok) { say(note, 'Not saved: ' + (out.error || 'the door said no') + '.', true); return; }
      lb.settings = out.settings; say(note, 'Saved — the leaderboard shows it now, counted afresh.');
    });
    draw();
    c.append(el('span', 'cm-label-t', 'RANKINGS, IN THE ORDER THEIR TABS STAND'), rows,
             line('cm-field cm-field-row', line('cm-label', el('span', 'cm-label-t', 'TITLE'), title), line('cm-label', el('span', 'cm-label-t', 'UNDER THE TITLE'), sub), line('cm-label', el('span', 'cm-label-t', 'ROWS'), top)),
             line('cm-actions', save), note);
    return c;
  }

  // ── the slot, and who is asking ─────────────────────────────────────────
  // the slot React rendered (#dc-root) — the raw template inside <x-dc> keeps a hidden copy with the same id, which is not it
  const slot = () => new Promise(ok => { let n = 0; const t = setInterval(() => { const s = document.querySelector('#dc-root #corner-manage'); if (s || ++n > 200) { clearInterval(t); ok(s); } }, 100); });
  async function boot() {
    const [s, b, g, r] = await Promise.all([slot(), get(BOARD + '?' + PQ + '&ch=board'), get(ALBUM + '?' + PQ), get(RANKS + '?' + PQ)]);
    if (!s || !b.ok || !b.me || !b.me.keeper) return;   // not a page, or not one of its keepers: nothing to arrange here
    me = b.me; tabs = b.tabs; chat = b.chat; sections = g.ok ? g.sections : []; photos = g.ok ? g.photos : []; lb = r.ok ? r : null;
    s.classList.add('cm');
    s.append(line('cm-head', el('span', 'cm-label-t', 'THE CORNER'), el('span', 'cm-hint', 'the town board, the chat, the photo album and the leaderboard — the four buttons in the page\'s bottom-left corner, arranged here by its keepers')),
             boardCard(), chatCard(), albumCard());
    if (lb) s.append(ranksCard());
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
  window.CornerManage = { get me() { return me; }, get tabs() { return tabs; }, get chat() { return chat; }, get sections() { return sections; }, get photos() { return photos; }, get ranks() { return lb && lb.settings; } };   // for the probes
})();
