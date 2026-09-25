/* toem2/leaderboard.js — THE LEADERBOARD (2026-09-24): a trophy at the top right of the bench, under the header
   (the owner's call, 2026-09-25 — the other three buttons keep the bottom-left corner), and the panel it stands up
   — the sticker kit's "TOEM 2 Leaderboard", on the bench. Tabs for the rankings this page's keepers
   chose (dashboard/manage.js; api/leaderboard.js counts them from the page's wall, board and album), a blurb, a
   podium for the first three, the rows after them, and — signed in — your own line at the foot. Empty until
   people use the page: nothing is seeded or made up. It reads when it opens and once a minute while it is up.
   Shares the corner and the case (.town-*) with board.js. Not on the yard's picture of this page (?embed=1). */
window.Ranks = (function () {
  if (document.documentElement.classList.contains('toem-embed')) return null;
  const PAGE = document.documentElement.dataset.page || 'toem2', PQ = 'page=' + encodeURIComponent(PAGE);
  const API = '/api/leaderboard', CARD = '/api/wall?who=', TOKEN = 'knoll-toem2:token';
  const POLL = 60000;
  const SVG = {
    trophy: '<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M11 6h18v9a9 9 0 0 1-18 0Z" fill="#fff"/><path d="M11 9H5v3a6 6 0 0 0 6 6M29 9h6v3a6 6 0 0 1-6 6" fill="none"/><path d="M17 24h6v5h-6Z" fill="currentColor"/><path d="M12 29h16v6H12Z" fill="#fff"/></svg>',
    crown: '<svg viewBox="0 0 30 20" aria-hidden="true"><path d="M3 17 5 5l6 6 4-8 4 8 6-6 2 12Z" fill="#ffd23f" stroke="#17120b" stroke-width="3" stroke-linejoin="round"/></svg>'
  };
  const EMPTY = { edits: 'The first edits here will put someone on it.', days: 'The first edits here will put someone on it.', first: 'The first edit here will put someone on it.',
                  posts: 'The first posts on the board, or lines in the chat, will put someone on it.', photos: 'The first photos in the album will put someone on it.', hearts: 'The first hearts on a photo will put someone on it.' };
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const get = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const token = () => get(TOKEN);
  const headers = extra => Object.assign({}, extra || {}, token() ? { authorization: 'Bearer ' + token() } : {});
  const gate = () => (window.KnollAccount && KnollAccount.gate ? KnollAccount.gate('login') : '/login/?next=' + encodeURIComponent(location.pathname + location.search));
  const initial = tag => (String(tag || '?').replace(/#\d+$/, '').trim()[0] || '?').toUpperCase();
  const nameOf = tag => String(tag || 'a gnome').replace(/#\d+$/, '');
  const fmt = (m, v) => (m === 'first' ? (d => MON[d.getMonth()] + ' ' + d.getDate() + (d.getFullYear() !== new Date().getFullYear() ? ', ' + d.getFullYear() : ''))(new Date(+v || 0)) : String(+v || 0));
  const ordinal = n => n + (n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][Math.min(n % 10, 4)] || 'th');

  let me = null, data = null, tab = '', open = false, loading = false, timer = 0;
  let fab, panel, title, sub, tabsEl, body, foot;

  // ── the door ────────────────────────────────────────────────────────────
  async function load() {
    let out = null;
    try { const r = await fetch(API + '?' + PQ, { headers: headers(), cache: 'no-store' }); out = r.ok ? await r.json() : null; } catch (e) {}
    if (!out || !out.ok) return false;
    me = out.me || null; data = out;
    if (!out.settings.tabs.includes(tab)) tab = out.settings.tabs[0];
    return true;
  }

  // ── pictures: the card's, once per gnome ────────────────────────────────
  const pics = new Map();
  const showPic = (node, src) => { if (!src || node.querySelector('img')) return; const img = el('img'); img.src = src; img.alt = ''; node.replaceChildren(img); };
  function picIn(node, id) {
    const have = pics.get(id);
    if (typeof have === 'string') return showPic(node, have);
    if (!have) pics.set(id, fetch(CARD + encodeURIComponent(id), { cache: 'no-store' }).then(r => (r.ok ? r.json() : null))
      .then(o => { const src = (o && o.ok && o.who && o.who.avatar) || ''; pics.set(id, src); return src; }).catch(() => { pics.set(id, ''); return ''; }));
    pics.get(id).then(src => { if (src) panel.querySelectorAll('.town-pic[data-pic="' + id + '"]').forEach(n => showPic(n, src)); });
  }
  const face = (r, cls) => { const f = el('span', 'town-pic' + (cls ? ' ' + cls : ''), initial(r.tag)); f.dataset.pic = r.id; picIn(f, r.id); return f; };

  // ── the board ───────────────────────────────────────────────────────────
  function render() {
    if (!data) return;
    title.textContent = data.settings.title; sub.textContent = data.settings.sub || '';
    tabsEl.replaceChildren();
    data.settings.tabs.forEach(m => {
      const b = el('button', 'town-tab' + (m === tab ? ' is-on' : '')); b.type = 'button'; b.dataset.tab = m; b.setAttribute('role', 'tab'); b.setAttribute('aria-selected', m === tab ? 'true' : 'false'); b.tabIndex = m === tab ? 0 : -1;
      b.append((data.metrics[m] || {}).label || m);
      b.addEventListener('click', () => { tab = m; render(); });
      tabsEl.append(b);
    });
    body.replaceChildren(); body.scrollTop = 0;
    const list = data.ranks[tab] || [], m = data.metrics[tab] || {};
    body.append(el('p', 'town-intro lb-blurb', m.blurb || ''));
    if (!list.length) {
      const e = el('div', 'gal-empty lb-empty'); e.append(el('b', null, 'Nobody on the board yet'), el('span', null, EMPTY[tab] || 'It fills as people use this page.'));
      body.append(e);
    } else {
      const podium = el('div', 'lb-podium');
      [1, 0, 2].forEach(i => {
        const r = list[i], stand = el('div', 'lb-stand' + (i === 0 ? ' is-first' : '') + (r ? '' : ' is-empty'));
        if (r) {
          const f = face(r, 'lb-face'); if (i === 0) { const c = el('span', 'lb-crown'); c.innerHTML = SVG.crown; f.append(c); }
          stand.append(f, el('div', 'lb-name', nameOf(r.tag)));
        } else stand.append(el('span', 'lb-face is-empty'), el('div', 'lb-name', '—'));
        const block = el('div', 'lb-block'); block.append(el('div', 'lb-rank', String(i + 1)), el('div', 'lb-value', r ? fmt(tab, r.value) : ''));
        stand.append(block);
        podium.append(stand);
      });
      body.append(podium);
      if (list.length > 3) {
        const rows = el('div', 'lb-rows');
        list.slice(3).forEach((r, i) => {
          const row = el('div', 'lb-row' + (me && r.id === me.id ? ' is-me' : ''));
          const who = el('div', 'lb-who'); who.append(el('b', null, nameOf(r.tag)), el('small', null, r.sub || ''));
          row.append(el('span', 'lb-n', String(i + 4)), face(r), who, el('span', 'lb-val', fmt(tab, r.value)));
          rows.append(row);
        });
        body.append(rows);
      }
    }
    foot.replaceChildren();
    if (!me) { const a = el('a', null, 'Log in'); a.href = gate(); foot.append(a, ' to see where you stand.'); }
    else {
      const y = data.you && data.you[tab];
      const f = face({ id: me.id, tag: me.tag }); f.classList.add('lb-face-you');
      const who = el('div', 'lb-who');
      if (y) { who.append(el('b', null, 'You · ' + ordinal(y.rank)), el('small', null, y.sub || '')); foot.append(el('span', 'lb-n', String(y.rank)), f, who, el('span', 'lb-val', fmt(tab, y.value))); }
      else { who.append(el('b', null, 'You'), el('small', null, 'not on this board yet')); foot.append(el('span', 'lb-n', '—'), f, who); }
    }
  }

  // ── once a minute while it is up; when it opens; when the tab comes back ──
  function schedule() { clearTimeout(timer); if (open) timer = setTimeout(tick, POLL); }
  async function tick() {
    if (!loading && !document.hidden && open) { loading = true; const ok = await load(); loading = false; if (ok && open) render(); }
    schedule();
  }
  function show() {
    if (open) return hide();
    if (window.Town && Town.close) Town.close();
    if (window.Gallery && Gallery.close) Gallery.close();
    open = true; panel.hidden = false; fab.setAttribute('aria-expanded', 'true');
    render();
    load().then(ok => { if (ok && open) render(); });
    schedule();
  }
  function hide() {
    if (!open) return;
    open = false; panel.hidden = true; fab.setAttribute('aria-expanded', 'false');
    clearTimeout(timer);
  }

  // ── the furniture ───────────────────────────────────────────────────────
  function build() {
    fab = el('button', 'town-fab lb-fab'); fab.type = 'button'; fab.id = 'ranks-btn'; fab.title = 'the leaderboard'; fab.setAttribute('aria-label', 'the leaderboard');
    fab.setAttribute('aria-expanded', 'false'); fab.setAttribute('aria-controls', 'ranks-panel');
    fab.innerHTML = SVG.trophy;
    fab.addEventListener('click', show);
    const dock = el('div', 'lb-dock'); dock.append(fab); document.body.append(dock);   // the trophy stands at the top right, under the header — the other three keep the bottom-left

    panel = el('section', 'town-panel lb-panel'); panel.id = 'ranks-panel'; panel.hidden = true; panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-label', 'the leaderboard');
    const head = el('div', 'town-head'), tile = el('span', 'town-tile lb-tile'), tt = el('div', 'town-title');
    tile.innerHTML = SVG.trophy;
    title = el('b', null, 'Leaderboard'); sub = el('small', null, '');
    tt.append(title, sub);
    const x = el('button', 'town-close', '✕'); x.type = 'button'; x.setAttribute('aria-label', 'close'); x.addEventListener('click', hide);
    head.append(tile, tt, x);
    tabsEl = el('div', 'town-tabs'); tabsEl.setAttribute('role', 'tablist');
    tabsEl.addEventListener('keydown', e => {
      const T = data ? data.settings.tabs : [], i = T.indexOf(tab), d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (!d || !T.length) return;
      e.preventDefault(); tab = T[(i + d + T.length) % T.length]; render(); tabsEl.querySelector('.is-on').focus();
    });
    body = el('div', 'town-body lb-body');
    foot = el('div', 'lb-foot');
    panel.append(head, tabsEl, body, foot);
    document.body.append(panel);
  }

  document.addEventListener('DOMContentLoaded', () => {
    build();
    document.addEventListener('visibilitychange', () => { if (!document.hidden && open && !loading) tick(); });
    document.addEventListener('click', e => { if (open && e.target.closest('#town-board-btn,#town-chat-btn,#gallery-btn')) hide(); }, true);   // the other buttons put this away, as they put each other away
    window.addEventListener('keydown', e => { if (e.key === 'Escape' && open && !(window.Lab && Lab.menuUp)) hide(); });
  });

  return { open: show, close: hide, load, pick: m => { tab = m; render(); }, get me() { return me; }, get data() { return data; }, get isOpen() { return open; }, get tab() { return tab; } };
})();
