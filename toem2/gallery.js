/* toem2/gallery.js — THE PHOTO ALBUM (2026-09-24): a third button in the
   bottom-left corner, beside the board and the chat, and the panel it stands
   up — the sticker kit's "TOEM 2 Gallery Widget", on the bench. The photos
   taken around this page hang in a grid of tilted prints under three tabs,
   ALL, MINE and FAVOURITES; a print opens full size with the taker's name
   and picture (the gnome card's, as the chat draws it), where and when it
   was taken, a heart to keep it under FAVOURITES, ← → through the rest, and
   — for its taker, or a keeper — the way to take it down.

   IT OPENS EMPTY. Nothing on the bench takes a photo yet; the book it reads
   is api/gallery.js's, and the door a camera will post through is there. What
   this browser keeps is only when the album was last looked at
   (knoll-<page>:album:seen), which is what the little "new" count is. Not on
   the yard's picture of this page (?embed=1).

   ponytail: the album asks the door once a minute for the count and when it
   opens — no live push; the board's poll is the pattern if one is wanted. */
window.Gallery = (function () {
  if (document.documentElement.classList.contains('toem-embed')) return null;
  const PAGE = document.documentElement.dataset.page || 'toem2', PQ = 'page=' + encodeURIComponent(PAGE);
  const API = '/api/gallery', CARD = '/api/wall?who=', TOKEN = 'knoll-toem2:token', SEEN = 'knoll-' + PAGE + ':album:seen';
  const POLL = 60000;
  const TABS = [['all', 'All'], ['mine', 'Mine'], ['fav', 'Favourites']];
  const EMPTY = { all: ['No photos yet', 'Photos taken around town will hang here.'],
                  mine: ['None of yours yet', 'The photos you take will be kept here.'],
                  fav: ['No favourites yet', 'Tap the heart on a photo to keep it here.'] };
  const TILT = [-2, 1.5, -1, 2, -1.5, 1];
  const SVG = {
    album: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="7" width="13" height="14" rx="1.5" fill="none" transform="rotate(-8 9.5 14)"/><rect x="9" y="4" width="12" height="13" rx="1.5" fill="#fff"/><rect x="11" y="6" width="8" height="6.5" stroke="none"/></svg>',
    heart: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 17S3 12.5 3 7.5A3.5 3.5 0 0 1 10 6a3.5 3.5 0 0 1 7 1.5C17 12.5 10 17 10 17Z"/></svg>',
    prev: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M13 3 6 10l7 7" fill="none"/></svg>',
    next: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M7 3l7 7-7 7" fill="none"/></svg>'
  };

  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const get = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const set = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };
  const token = () => get(TOKEN);
  const headers = extra => Object.assign({}, extra || {}, token() ? { authorization: 'Bearer ' + token() } : {});
  const gate = () => (window.KnollAccount && KnollAccount.gate ? KnollAccount.gate('login') : '/login/?next=' + encodeURIComponent(location.pathname + location.search));
  const initial = tag => (String(tag || '?').replace(/#\d+$/, '').trim()[0] || '?').toUpperCase();
  const nameOf = tag => String(tag || 'a gnome').replace(/#\d+$/, '');
  const day = t => { const d = new Date(t); return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime(); };
  const when = t => { const gap = (day(Date.now()) - day(t)) / 864e5; return gap < 1 ? 'Today' : gap < 2 ? 'Yesterday' : new Date(t).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }); };

  let me = null, photos = [], tab = 'all', viewing = null, seen = +get(SEEN) || 0, open = false, loading = false, busy = false, timer = 0;
  let fab, panel, tabsEl, body, view, sub, note;

  // ── the door ────────────────────────────────────────────────────────────
  async function load() {
    let out = null;
    try { const r = await fetch(API + '?' + PQ, { headers: headers(), cache: 'no-store' }); out = r.ok ? await r.json() : null; } catch (e) {}
    if (!out || !out.ok) return false;
    me = out.me || null;
    photos = Array.isArray(out.photos) ? out.photos : [];
    return true;
  }
  const send = body => fetch(API + '?' + PQ, { method: 'POST', headers: headers({ 'content-type': 'application/json' }), body: JSON.stringify(body) })
    .then(r => r.json()).catch(() => ({ ok: false, error: 'the door did not answer' }));
  const canDrop = p => !!me && (p.by === me.id || me.keeper);

  // ── the tabs' lists, the counts ─────────────────────────────────────────
  const listOf = t => photos.filter(p => t === 'all' || (t === 'mine' ? !!me && p.by === me.id : p.liked));
  const unread = () => photos.filter(p => p.at > seen).length;
  const look = () => { seen = Date.now(); set(SEEN, String(seen)); badge(); };
  function badge() {
    const b = fab.querySelector('.town-badge'), n = open ? 0 : unread();
    b.textContent = n > 9 ? '9+' : n ? String(n) : '';
    sub.textContent = photos.length === 1 ? '1 photo from around town' : photos.length + ' photos from around town';
    TABS.forEach(([t]) => { const c = tabsEl.querySelector('[data-tab="' + t + '"] .gal-n'); if (c) c.textContent = String(listOf(t).length); });
  }

  // ── pictures of the takers: the card's, once per author ─────────────────
  const pics = new Map();
  const showPic = (node, src) => { if (!src || node.querySelector('img')) return; const img = el('img'); img.src = src; img.alt = ''; node.replaceChildren(img); };
  function picIn(node, id) {
    const have = pics.get(id);
    if (typeof have === 'string') return showPic(node, have);
    if (!have) pics.set(id, fetch(CARD + encodeURIComponent(id), { cache: 'no-store' }).then(r => (r.ok ? r.json() : null))
      .then(o => { const src = (o && o.ok && o.who && o.who.avatar) || ''; pics.set(id, src); return src; }).catch(() => { pics.set(id, ''); return ''; }));
    pics.get(id).then(src => { if (src) panel.querySelectorAll('.town-pic[data-pic="' + id + '"]').forEach(n => showPic(n, src)); });
  }

  // ── the grid ────────────────────────────────────────────────────────────
  function print(p, i) {
    const c = el('button', 'gal-card'); c.type = 'button'; c.style.setProperty('--tilt', TILT[i % TILT.length] + 'deg');
    c.setAttribute('aria-label', p.cap + (p.likes ? ', ' + p.likes + (p.likes === 1 ? ' heart' : ' hearts') : ''));
    const pic = el('span', 'gal-pic'), img = el('img'); img.src = p.src; img.alt = ''; img.loading = 'lazy'; pic.append(img);
    const cap = el('span', 'gal-cap'), likes = el('span', 'gal-likes' + (p.liked ? ' is-on' : ''));
    likes.innerHTML = SVG.heart; likes.append(String(p.likes));
    cap.append(el('span', 'gal-cap-t', p.cap), likes);
    c.append(pic, cap);
    c.addEventListener('click', () => { viewing = p.id; render(); });
    return c;
  }
  function renderGrid() {
    body.replaceChildren();
    const list = listOf(tab);
    if (!list.length) {
      const e = el('div', 'gal-empty'), [h, t] = EMPTY[tab];
      e.append(el('b', null, h), el('span', null, t));
      body.append(e);
      return;
    }
    const grid = el('div', 'gal-grid');
    list.forEach((p, i) => grid.append(print(p, i)));
    body.append(grid);
  }

  // ── one photo, full size ────────────────────────────────────────────────
  function renderView() {
    const list = listOf(tab), pos = list.findIndex(p => p.id === viewing), p = list[pos];
    if (!p) { viewing = null; view.hidden = true; return; }
    view.hidden = false; view.replaceChildren();
    const sheet = el('div', 'gal-sheet'), frame = el('div', 'gal-frame'), img = el('img'); img.src = p.src; img.alt = p.cap;
    const step = d => { if (list.length < 2) return; viewing = list[(pos + d + list.length) % list.length].id; renderView(); };
    const arrow = (cls, icon, label, d) => { const b = el('button', 'gal-arrow ' + cls); b.type = 'button'; b.innerHTML = icon; b.setAttribute('aria-label', label); b.disabled = list.length < 2; b.addEventListener('click', () => step(d)); return b; };
    frame.append(img, arrow('is-prev', SVG.prev, 'previous', -1), arrow('is-next', SVG.next, 'next', 1));
    const row = el('div', 'gal-row'), face = el('span', 'town-pic', initial(p.tag)); face.dataset.pic = p.by; picIn(face, p.by);
    const who = el('div', 'gal-who');
    who.append(el('b', null, p.cap), el('small', null, nameOf(p.tag) + (p.where ? ' · ' + p.where : '') + ' · ' + when(p.at)));
    const like = el('button', 'gal-like' + (p.liked ? ' is-on' : '')); like.type = 'button'; like.innerHTML = SVG.heart; like.append(String(p.likes));
    like.setAttribute('aria-pressed', String(!!p.liked)); like.setAttribute('aria-label', p.liked ? 'take your heart back' : 'keep it — a heart');
    like.addEventListener('click', () => heart(p, like));
    row.append(face, who, like);
    const foot = el('div', 'gal-foot'), pos2 = el('span', 'gal-pos', (pos + 1) + ' of ' + list.length);
    foot.append(pos2);
    if (canDrop(p)) { const x = el('button', 'town-x', p.by === me.id ? 'take it down' : 'hide it'); x.type = 'button'; x.addEventListener('click', () => drop(p)); foot.append(x); }
    const back = el('button', 'town-btn', 'Back to album'); back.type = 'button'; back.addEventListener('click', () => { viewing = null; render(); });
    foot.append(back);
    note = el('p', 'town-note'); note.hidden = true;
    sheet.append(frame, row, note, foot);
    if (!me) { const g = el('p', 'town-gate'), a = el('a', null, 'Log in'); a.href = gate(); g.append(a, ' to keep favourites.'); sheet.append(g); }
    view.append(sheet);
    back.focus({ preventScroll: true });
  }
  async function heart(p, btn) {
    if (busy || !me) return;
    busy = true; btn.disabled = true;
    const on = !p.liked;
    const out = await send({ op: 'like', id: p.id, on });
    busy = false; btn.disabled = false;
    if (!out.ok) { note.textContent = 'Not kept: ' + (out.error || 'the door said no') + '.'; note.hidden = false; return; }
    p.liked = !!out.liked; p.likes = +out.likes || 0;
    render();
  }
  async function drop(p) {
    if (busy || !confirm(p.by === me.id ? 'Take your photo down?' : 'Hide this photo? It goes for everyone.')) return;
    busy = true;
    const out = await send({ op: 'drop', id: p.id });
    busy = false;
    if (!out.ok) { note.textContent = 'Not done: ' + (out.error || 'the door said no') + '.'; note.hidden = false; return; }
    photos = photos.filter(x => x.id !== p.id);
    viewing = null; render();
  }

  function render() {
    tabsEl.querySelectorAll('.town-tab').forEach(b => { const on = b.dataset.tab === tab; b.classList.toggle('is-on', on); b.setAttribute('aria-selected', on ? 'true' : 'false'); b.tabIndex = on ? 0 : -1; });
    renderGrid();
    if (viewing) renderView(); else view.hidden = true;
    badge();
  }
  function pick(t) { tab = t; viewing = null; render(); }

  // ── once a minute for the count; when it opens, and whenever the tab comes back ──
  function schedule() { clearTimeout(timer); timer = setTimeout(tick, POLL); }
  async function tick() {
    if (!loading && !document.hidden) {
      loading = true;
      const ok = await load();
      loading = false;
      if (ok && open) render(); else badge();
    }
    schedule();
  }

  // ── opening and closing ─────────────────────────────────────────────────
  function show() {
    if (open) return hide();
    if (window.Town && Town.close) Town.close();
    open = true; panel.hidden = false; fab.setAttribute('aria-expanded', 'true');
    render(); look();
    load().then(ok => { if (ok && open) { render(); look(); } });
    schedule();
  }
  function hide() {
    if (!open) return;
    open = false; viewing = null; panel.hidden = true; fab.setAttribute('aria-expanded', 'false');
    badge(); schedule();
  }

  // ── the furniture ───────────────────────────────────────────────────────
  function build() {
    fab = el('button', 'town-fab gal-fab'); fab.type = 'button'; fab.id = 'gallery-btn'; fab.title = 'the photo album'; fab.setAttribute('aria-label', 'the photo album');
    fab.setAttribute('aria-expanded', 'false'); fab.setAttribute('aria-controls', 'gallery-panel');
    fab.innerHTML = SVG.album; fab.append(el('i', 'town-badge'));
    fab.addEventListener('click', show);
    const fabs = document.querySelector('.town-fabs') || (() => { const d = el('div', 'town-fabs'); document.body.append(d); return d; })();
    fabs.append(fab);

    panel = el('section', 'town-panel gal-panel'); panel.id = 'gallery-panel'; panel.hidden = true; panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-label', 'the photo album');
    const head = el('div', 'town-head'), tile = el('span', 'town-tile'), tt = el('div', 'town-title');
    tile.innerHTML = SVG.album;
    sub = el('small', null, '');
    tt.append(el('b', null, 'Photo Album'), sub);
    const x = el('button', 'town-close', '✕'); x.type = 'button'; x.setAttribute('aria-label', 'close'); x.addEventListener('click', hide);
    head.append(tile, tt, x);
    tabsEl = el('div', 'town-tabs'); tabsEl.setAttribute('role', 'tablist');
    TABS.forEach(([t, label]) => {
      const b = el('button', 'town-tab'); b.type = 'button'; b.dataset.tab = t; b.setAttribute('role', 'tab'); b.setAttribute('aria-selected', 'false');
      b.append(label, el('small', 'gal-n', '0'));
      b.addEventListener('click', () => pick(t));
      tabsEl.append(b);
    });
    tabsEl.addEventListener('keydown', e => {
      const i = TABS.findIndex(([t]) => t === tab), d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (!d) return;
      e.preventDefault(); pick(TABS[(i + d + TABS.length) % TABS.length][0]); tabsEl.querySelector('.is-on').focus();
    });
    body = el('div', 'town-body gal-body');
    view = el('div', 'gal-view'); view.hidden = true;
    panel.append(head, tabsEl, body, view);
    document.body.append(panel);
  }

  document.addEventListener('DOMContentLoaded', () => {
    build();
    tick();
    window.addEventListener('focus', () => { if (!loading) tick(); });
    document.addEventListener('visibilitychange', () => { if (!document.hidden && !loading) tick(); });
    // the board's and the chat's buttons put this away, as they put each other away
    document.addEventListener('click', e => { if (open && e.target.closest('#town-board-btn,#town-chat-btn')) hide(); }, true);
    window.addEventListener('keydown', e => {
      if (!open || (window.Lab && Lab.menuUp)) return;
      if (e.key === 'Escape') { if (viewing) { viewing = null; render(); } else hide(); return; }
      if (viewing && (e.key === 'ArrowLeft' || e.key === 'ArrowRight') && !e.target.closest('input,textarea')) {
        const list = listOf(tab), pos = list.findIndex(p => p.id === viewing);
        if (list.length > 1 && pos >= 0) { viewing = list[(pos + (e.key === 'ArrowRight' ? 1 : -1) + list.length) % list.length].id; renderView(); e.preventDefault(); }
      }
    });
  });

  return { open: show, close: hide, pick, load, view: id => { viewing = id; if (open) render(); },
           get me() { return me; }, get photos() { return photos; }, get isOpen() { return open; }, get viewing() { return viewing; }, get tab() { return tab; } };
})();
