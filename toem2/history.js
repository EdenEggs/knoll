/* toem2/history.js — THE WALL'S HISTORY, ON THE PAPER (2026-09-17).

   The live wall (seed.js: THE LIVE WALL) is a list of revisions, and this is
   where a person reads it: a panel in the drawer's own case, opened from
   "history" beside the submit button, listing every revision newest first —
   who, when, what, and how it got on (went live, approved, carried by the
   council, undone) — and the queue of edits waiting for a look and the
   motions up for a vote, for anybody to see and for the keepers to decide.

   A REVISION IS SHOWN ON THE CANVAS, not in words: press one and a box goes
   round every piece it touched, drawn on a second <svg> laid over the sheet
   exactly like the wall's own — green dashed for a piece it put up, red with
   a cross for one it took off (drawn where the piece was), amber for one it
   changed, with a line from where a moved piece stood to where it went. The
   pieces themselves are left alone: the boxes are all that is drawn, so the
   paper under them is the wall as it stands, and "zoom to it" brings the
   camera to the lot. A scrubber in the foot steps through the revisions.

   THE PIECES OF YOURS THAT WAIT wear a dashed box on the same sheet: amber
   while the keepers have them, blue while they are on the ballot (seed.js
   says which; markPending() draws it).

   UNDOING ONE is the foot of the panel: revert (a contributor or better, or
   a keeper of this page), and for a moderator strike (revert as vandalism,
   which costs the author — never on a wild wall) and undo everything by
   that person. All of it goes through api/wall.js's own ops, so what the
   panel can do is exactly what the door allows, and nothing the panel says
   is trusted by anybody but the reader.

   THE RULES (2026-09-24), for whoever keeps this wall: on TOEM 2 the
   moderators set its chaos level, the ballot's period and the six kind
   switches here (api/wall.js: THREE LEVELS OF CHAOS); a space's maker is
   sent to its settings page. THE GNOMES and THE RECORD, for moderators:
   every account with its habits (api/auth.js ?users=1) — watch, ban, and
   for the admin the rake — and the moderators' record (?audit=). A GNOME
   CARD opens on any name: tag, tier, standing days, streak, since, what
   landed; the counters in full for a moderator. */
window.History = (function () {
  const API = '/api/wall', TOKEN = 'knoll-toem2:token';
  const PAGE = document.documentElement.dataset.page || 'toem2', HOME = PAGE === 'toem2', PQ = 'page=' + encodeURIComponent(PAGE);
  const $ = id => document.getElementById(id);
  const token = () => { try { return localStorage.getItem(TOKEN); } catch (e) { return null; } };
  const driven = navigator.webdriver === true;
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const SVGNS = 'http://www.w3.org/2000/svg';
  const sv = (tag, attrs) => { const e = document.createElementNS(SVGNS, tag); Object.keys(attrs || {}).forEach(k => e.setAttribute(k, attrs[k])); return e; };
  const ago = t => {
    const s = Math.max(0, (Date.now() - t) / 1000);
    return s < 60 ? 'just now' : s < 3600 ? Math.floor(s / 60) + ' min ago' : s < 86400 ? Math.floor(s / 3600) + ' h ago'
         : s < 7 * 86400 ? Math.floor(s / 86400) + ' d ago' : new Date(t).toISOString().slice(0, 10);
  };
  const short = id => String(id || '').slice(0, 6);
  const who = e => (e.name || (e.by === 'seed' ? 'the shipped wall' : 'gnome ' + short(e.by))) + (e.by && e.by !== 'seed' ? ' · ' + short(e.by) : '');
  const how = e => {
    const h = String(e.how || ''), of = e.of != null ? ' #' + e.of : '';
    return h === 'seed' ? 'the wall it opened on' : h === 'live' ? 'went live' : h === 'approved' ? 'approved by ' + short(e.via)
         : h === 'motion' ? 'carried by the council' : h === 'fiat' ? 'put up by ' + short(e.via)
         : /^strike/.test(h) ? 'struck' + of : /^undo/.test(h) ? 'undone' + of : /^revert/.test(h) ? 'undid' + of : h;
  };
  const what = n => [n.put ? n.put + ' changed' : '', n.del ? n.del + ' deleted' : '', n.art ? n.art + ' tracings' : ''].filter(Boolean).join(' · ') || 'nothing';
  const LEVELS = [[0, 'Read-only', 'the maker alone draws on it'], [1, 'Tended', 'the keepers decide what stays'], [2, 'Council', 'every change from a non-keeper is a motion'], [3, 'Wild', 'anyone edits anything, live']];
  const KINDS = ['ink', 'stickers', 'notes', 'tracings', 'embeds', "others' pieces"];
  const PERIODS = [[1, 'daily'], [3, 'every 3 days'], [7, 'weekly']];
  const periodWord = d => (PERIODS.find(p => p[0] === d) || [0, 'every few days'])[1];

  let panel = null, body = null, foot = null, diff = null, rev = null, pend = null, open = false, shown = null, busy = false, lastLog = [];
  const me = () => (window.Seed && Seed.me) || null;
  const rules = () => (window.Seed && Seed.rules) || null;
  const isMod = () => { const m = me(); return !!m && (m.role === 'mod' || m.role === 'admin'); };
  const keeps = () => !!(window.Seed && (Seed.keeper || Seed.owner));
  const canRevert = () => { const m = me(); return !!m && (isMod() || keeps() || m.tier === 'contributor' || m.tier === 'trusted'); };
  const canVote = () => !!(window.Seed && Seed.canVote && Seed.canVote());
  const canDecide = q => !!(window.Seed && Seed.canDecide && Seed.canDecide(q));
  const closesIn = t => (window.Seed && Seed.closesIn ? Seed.closesIn(t) : 'soon');
  // the site's session cookie goes by itself; a Bearer only for toem2/session.js's pasted one; every op names the page
  const post = body => fetch(API, { method: 'POST', headers: Object.assign({ 'content-type': 'application/json' }, token() ? { authorization: 'Bearer ' + token() } : {}), body: JSON.stringify(Object.assign({ page: PAGE }, body)) })
    .then(r => r.json().catch(() => ({ ok: false, error: 'the door answered ' + r.status })));
  const get = q => fetch(API + q + '&' + PQ, { cache: 'no-store', headers: token() ? { authorization: 'Bearer ' + token() } : {} }).then(r => (r.ok ? r.json() : null)).catch(() => null);

  // ── the boxes on the canvas ───────────────────────────────────────────
  function box(rec) {
    if (!rec || !window.Wall || !Wall.boxOf) return null;
    let b = Wall.boxOf(rec, null);
    if (!b) {                                              // a stroke or a note is measured off its node, if it is on the wall
      const items = Wall.store.get().items, i = items.findIndex(it => it && it.n === rec.n);
      const node = i >= 0 ? document.querySelector('svg.wall-ink .wall-item[data-i="' + i + '"]') : null;
      if (node) b = Wall.boxOf(rec, node);
    }
    return b;
  }
  function sheet() {
    if (diff) return;
    const world = (window.Lab && Lab.world) || $('bench-world');
    if (!world) return;
    diff = sv('svg', { class: 'wall-diff', 'aria-hidden': 'true' });
    pend = sv('g', { class: 'th-pend' }); rev = sv('g', { class: 'th-rev' });
    diff.append(pend, rev);
    world.appendChild(diff);
  }
  function clear() {
    if (rev) rev.textContent = '';
    shown = null;
    if (foot) render.foot();
  }
  function draw(entry) {
    sheet();
    if (!rev) return [];
    rev.textContent = '';
    const boxes = [];
    const rect = (b, cls) => { boxes.push(b); rev.appendChild(sv('rect', { class: cls, x: b.x - 6, y: b.y - 6, width: b.w + 12, height: b.h + 12, rx: 8, 'stroke-width': 3, 'vector-effect': 'non-scaling-stroke' })); };
    Object.keys(entry.put || {}).forEach(n => {
      const now = entry.put[n], was = entry.prev ? entry.prev[n] : null;
      const b = box(now);
      if (!b) return;
      if (!was) { rect(b, 'th-add'); return; }
      rect(b, 'th-chg');
      const wb = box(was);
      if (wb && (Math.abs(wb.x - b.x) > 1 || Math.abs(wb.y - b.y) > 1)) {
        const x0 = wb.x + wb.w / 2, y0 = wb.y + wb.h / 2, x1 = b.x + b.w / 2, y1 = b.y + b.h / 2;
        rev.appendChild(sv('circle', { class: 'th-was', cx: x0, cy: y0, r: 6, 'stroke-width': 2, 'vector-effect': 'non-scaling-stroke' }));
        rev.appendChild(sv('line', { class: 'th-line', x1: x0, y1: y0, x2: x1, y2: y1, 'stroke-width': 2, 'vector-effect': 'non-scaling-stroke' }));
        boxes.push(wb);
      }
    });
    (entry.del || []).forEach(n => {
      const was = entry.prev ? entry.prev[n] : null, b = box(was);
      if (!b) return;
      rect(b, 'th-del');
      rev.appendChild(sv('line', { class: 'th-del', x1: b.x, y1: b.y, x2: b.x + b.w, y2: b.y + b.h, 'stroke-width': 3, 'vector-effect': 'non-scaling-stroke' }));
      rev.appendChild(sv('line', { class: 'th-del', x1: b.x + b.w, y1: b.y, x2: b.x, y2: b.y + b.h, 'stroke-width': 3, 'vector-effect': 'non-scaling-stroke' }));
    });
    return boxes;
  }
  // the pieces of yours that wait: a dashed box each, amber for the keepers' queue, blue for the ballot
  let pendingNames = [], pendingKind = null;
  function markPending(names, kind) {
    pendingNames = names || []; pendingKind = kind;
    paintPending();
  }
  function paintPending() {
    if (!pendingNames.length && !pend) return;
    sheet();
    if (!pend) return;
    pend.textContent = '';
    if (!pendingNames.length || !window.Wall || !Wall.store) return;
    const items = Wall.store.get().items, byN = new Map();
    items.forEach(it => { if (it && it.n) byN.set(it.n, it); });
    const g = sv('g', { class: pendingKind === 'motion' ? 'th-ballot' : 'th-wait' });
    const title = sv('title'); title.textContent = pendingKind === 'motion' ? 'on the ballot' : 'waiting for the keepers'; g.appendChild(title);
    pendingNames.forEach(n => {
      const b = box(byN.get(n));
      if (b) g.appendChild(sv('rect', { x: b.x - 5, y: b.y - 5, width: b.w + 10, height: b.h + 10, rx: 7, 'stroke-width': 2.5, 'vector-effect': 'non-scaling-stroke' }));
    });
    pend.appendChild(g);
  }
  function zoomTo(boxes) {
    if (!boxes.length || !window.Lab || !Lab.camTo) return;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    boxes.forEach(b => { x0 = Math.min(x0, b.x); y0 = Math.min(y0, b.y); x1 = Math.max(x1, b.x + b.w); y1 = Math.max(y1, b.y + b.h); });
    const br = Lab.bench.getBoundingClientRect(), pad = 90;
    const z = Math.max(0.02, Math.min(1, (br.width - pad * 2) / Math.max(x1 - x0, 1), (br.height - pad * 2) / Math.max(y1 - y0, 1)));
    Lab.camTo(z, br.width / 2 - (x0 + x1) / 2 * z, br.height / 2 - (y0 + y1) / 2 * z, 340);
  }
  async function show(r) {
    const out = await get('?at=' + r);
    if (!out || !out.ok) return;
    shown = out.rev;
    const boxes = draw(shown);
    zoomTo(boxes);
    if (body) body.querySelectorAll('.th-row').forEach(row => row.classList.toggle('is-on', +row.dataset.rev === r));
    render.foot();
  }

  // ── a gnome's name, and their card ────────────────────────────────────
  function whoEl(e) {
    const s = el('span', 'th-who', who(e));
    if (!e.by || e.by === 'seed') return s;
    s.tabIndex = 0; s.setAttribute('role', 'button'); s.title = 'their card';
    const go = ev => { ev.stopPropagation(); ev.preventDefault(); card(e.by, s); };
    s.addEventListener('click', go);
    s.addEventListener('keydown', ev => { if (ev.key === 'Enter' || ev.key === ' ') go(ev); });
    return s;
  }
  let cardEl = null;
  function closeCard() { if (!cardEl) return; const back = cardEl._opener; cardEl.remove(); cardEl = null; if (back && back.focus) back.focus(); }
  async function card(id, opener) {
    if (cardEl && cardEl._for === id) { closeCard(); return; }
    closeCard();
    const c = el('div', 'th-card'); c.setAttribute('role', 'dialog'); c.setAttribute('aria-label', 'a gnome'); c.tabIndex = -1; c._for = id; c._opener = opener;
    c.append(el('p', 'th-empty', 'looking…'));
    const x = el('button', 'lp-x', '×'); x.type = 'button'; x.setAttribute('aria-label', 'close the card'); x.addEventListener('click', closeCard);
    c.append(x);
    const host = opener && opener.closest('.th-row, .th-me, .bo-issue, .th-card') || opener;
    (host || body).after(c);
    cardEl = c;
    c.focus();
    const out = await get('?who=' + encodeURIComponent(id));
    if (cardEl !== c) return;
    c.textContent = ''; c.append(x);
    if (!out || !out.ok) { c.append(el('p', 'th-empty', 'the hill has no record of that gnome')); return; }
    const w = out.who, b = el('b', null, w.tag || w.name || 'gnome ' + short(w.id));
    const tier = el('span', 'th-stamp is-' + (w.role || w.tier), (w.role === 'admin' || w.role === 'mod' ? 'MODERATOR' : String(w.tier || 'newcomer')).toUpperCase());
    const head = el('div', 'th-card-head');
    if (w.avatar && /^data:image\/jpeg;base64,/.test(w.avatar)) { const img = el('img'); img.src = w.avatar; img.alt = ''; head.append(img); }
    head.append(b, tier);
    c.append(head);
    const since = w.since ? new Date(w.since + '-01T00:00:00Z').toLocaleDateString(undefined, { month: 'short', year: 'numeric' }) : '';
    c.append(el('div', null, [w.rep + ' standing day' + (w.rep === 1 ? '' : 's'), w.streak >= 2 ? w.streak + '-day streak' : '', since ? 'since ' + since : ''].filter(Boolean).join(' · ')));
    c.append(el('div', null, [(w.live || 0) + ' live', (w.okd || 0) + ' approved', (w.won || 0) + ' motion' + (w.won === 1 ? '' : 's') + ' carried', (w.votes || 0) + ' vote' + (w.votes === 1 ? '' : 's')].join(' · ')));
    if (w.rvd !== undefined) {                              // a moderator's view
      c.append(el('div', 'th-mod', [(w.held || 0) + ' waiting', (w.rej || 0) + ' turned back', (w.rvw || 0) + ' reviews given', (w.rvs || 0) + ' reverts', (w.rvd || 0) + ' reverted by others', (w.strikes || 0) + ' strike' + (w.strikes === 1 ? '' : 's'), w.seen ? 'seen ' + ago(w.seen) : ''].filter(Boolean).join(' · ')));
      const flags = el('div');
      if (w.watched) flags.append(el('span', 'th-flag', 'WATCHED'));
      if (w.banned) flags.append(el('span', 'th-flag is-bad', 'BANNED'));
      modActions(flags, { id: w.id, tag: w.tag || w.name, watched: w.watched, banned: w.banned, role: w.role || 'user' });
      c.append(flags);
    }
  }
  document.addEventListener('pointerdown', e => { if (cardEl && !cardEl.contains(e.target) && !(cardEl._opener && cardEl._opener.contains(e.target))) closeCard(); }, true);

  // ── the moderators' hands: watch, ban, the rake ───────────────────────
  function modActions(into, u) {
    const mk = (label, body, ask, bad) => { const b = el('button', 'th-link' + (bad ? ' is-bad' : ''), label); b.type = 'button'; b.addEventListener('click', () => act(body, ask)); into.append(b); };
    const name = u.tag || 'gnome ' + short(u.id);
    if (u.role === 'admin') return;
    mk(u.watched ? 'unwatch' : 'watch', { op: 'role', user: u.id, watch: !u.watched }, u.watched ? 'Stop watching ' + name + '? Their standing counts again.' : 'Watch ' + name + '? A watched gnome is a newcomer wherever they go.');
    mk(u.banned ? 'unban' : 'ban', { op: 'role', user: u.id, banned: !u.banned }, u.banned ? 'Let ' + name + ' back on the wall?' : 'Ban ' + name + '? They keep their account and lose the wall.', !u.banned);
    const m = me();
    if (m && m.role === 'admin') mk(u.role === 'mod' ? 'unmake mod' : 'make mod', { op: 'role', user: u.id, role: u.role === 'mod' ? 'user' : 'mod' }, (u.role === 'mod' ? 'Take the rake from ' : 'Hand the rake to ') + name + '?');
  }

  // ── the rules, for whoever keeps this wall ────────────────────────────
  function rulesSection(r) {
    const sec = el('div', 'th-rules'); sec.id = 'th-rules';
    sec.append(el('h3', 'th-h', 'THE RULES'));
    const L = LEVELS[r.chaos] || LEVELS[1];
    if (!HOME) {                                             // a space's rules are set on its settings page
      const p = el('p', 'th-me'); p.append(L[1] + ' — ' + L[2] + '. ');
      const a = el('a', 'th-link', 'the settings'); a.href = '/settings/?space=' + encodeURIComponent(PAGE); p.append(a);
      sec.append(p);
      return sec;
    }
    const draft = { chaos: r.chaos, period: r.period, feats: (r.feats || []).slice() };
    const dirty = () => draft.chaos !== r.chaos || draft.period !== r.period || JSON.stringify(draft.feats) !== JSON.stringify(r.feats || []);
    const group = el('div', 'th-levels'); group.setAttribute('role', 'radiogroup'); group.setAttribute('aria-label', 'how wild is it');
    const radios = LEVELS.map(([n, name, sub]) => {
      const b = el('button', 'th-row th-radio'); b.type = 'button'; b.setAttribute('role', 'radio'); b.dataset.n = n;
      b.append(name, el('small', null, sub));
      b.addEventListener('click', () => { if (n === 3 && draft.chaos !== 3 && !driven && !confirm('Wild means anyone may take anything off, and nothing waits for a look. The history keeps it all. Sure?')) return; draft.chaos = n; paint(); });
      b.addEventListener('keydown', e => { const d = e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1 : e.key === 'ArrowUp' || e.key === 'ArrowLeft' ? -1 : 0; if (!d) return; e.preventDefault(); const nx = radios[(LEVELS.findIndex(x => x[0] === draft.chaos) + d + LEVELS.length) % LEVELS.length]; nx.focus(); nx.click(); });
      group.append(b); return b;
    });
    sec.append(group);
    const per = el('div', 'th-period');
    const chips = PERIODS.map(([d, label]) => { const b = el('button', 'th-link', label); b.type = 'button'; b.addEventListener('click', () => { draft.period = d; paint(); }); per.append(b); return b; });
    per.append(el('small', null, 'the ballot closes at midnight UTC; a change of period takes effect at the next close'));
    sec.append(per);
    const sw = el('div', 'th-switches'); sw.append(el('div', 'th-h2', 'WHAT EVERYONE MAY DO · off means the keepers only'));
    const boxes = KINDS.map((k, i) => { const l = el('label'), c = el('input'); c.type = 'checkbox'; c.addEventListener('change', () => { draft.feats[i] = c.checked; paint(); }); l.append(c, ' ' + k); sw.append(l); return c; });
    const wildNote = el('small', null, "wild: everything is everyone's"); sw.append(wildNote);
    sec.append(sw);
    sec.append(el('p', 'th-me', 'keepers: the moderators and the trusted'));
    const seal = el('button', 'th-link th-seal', 'seal it'); seal.type = 'button'; const note = el('small', 'th-note');
    seal.addEventListener('click', async () => {
      if (!dirty() || busy) return;
      busy = true; seal.textContent = 'sealing…';
      const out = await post({ op: 'settings', chaos: draft.chaos, period: draft.period, feats: draft.feats });
      busy = false; seal.textContent = 'seal it';
      note.textContent = out.ok ? (out.rules.chaos === 2 && r.chaos !== 2 ? 'Sealed — the first ballot closes ' + closesIn(out.rules.closes) + '.' : 'Sealed.') : 'Not sealed: ' + (out.error || 'the door said no') + '.';
      if (out.ok && window.Seed && Seed.readRules) { await Seed.readRules(true); render.all(); }
    });
    sec.append(seal, note);
    function paint() {
      radios.forEach(b => { const on = +b.dataset.n === draft.chaos; b.setAttribute('aria-checked', on); b.classList.toggle('is-on', on); b.tabIndex = on ? 0 : -1; });
      per.hidden = draft.chaos !== 2;
      chips.forEach((b, i) => b.setAttribute('aria-pressed', PERIODS[i][0] === draft.period));
      boxes.forEach((c, i) => { c.checked = !!draft.feats[i]; c.parentNode.hidden = draft.chaos === 3; });
      wildNote.hidden = draft.chaos !== 3;
      seal.classList.toggle('is-dirty', dirty());
      seal.disabled = !dirty();
    }
    paint();
    return sec;
  }

  // ── a decision in a row, with its reason asked in the row ─────────────
  async function decideRow(q, what, row) {
    let why = '';
    if (what === 'reject') {                                        // the reason is asked in the row, driven or not — it is no dialog
      const boxEl = el('div', 'th-why'), inp = el('input', 'lab-why'); inp.maxLength = 140; inp.placeholder = 'why? optional'; inp.setAttribute('aria-label', 'why');
      const send = el('button', 'th-link', 'send'), cancel = el('button', 'th-link', 'cancel'); send.type = cancel.type = 'button';
      boxEl.append(inp, send, cancel); row.append(boxEl); inp.focus();
      why = await new Promise(res => {
        send.addEventListener('click', () => res(inp.value.trim())); cancel.addEventListener('click', () => res(null));
        inp.addEventListener('keydown', e => { if (e.key === 'Enter') res(inp.value.trim()); if (e.key === 'Escape') { e.stopPropagation(); res(null); } });
      });
      boxEl.remove();
      if (why === null) return;
    }
    if (busy) return;
    busy = true;
    const out = await post({ op: 'review', edit: q.id, do: what, why });
    busy = false;
    if (!out.ok) { alert('Not done: ' + (out.error || 'the door said no') + '.'); return; }
    if (window.Seed && Seed.pull) await Seed.pull(true);
    render.all();
  }

  // ── the moderators' lists ─────────────────────────────────────────────
  async function gnomesSection() {
    body.append(el('h3', 'th-h', 'THE GNOMES · newest 100'));
    const out = await fetch('/api/auth?users=1', { cache: 'no-store', credentials: 'same-origin' }).then(r => (r.ok ? r.json() : null)).catch(() => null);
    if (!out || !out.ok) { body.append(el('p', 'th-empty', 'the list did not answer')); return; }
    if (!out.users.length) { body.append(el('p', 'th-empty', 'nobody yet')); return; }
    out.users.forEach(u => {
      const row = el('div', 'th-row' + (u.flak > 0.5 && (u.landed || 0) >= 4 ? ' is-flak' : '') + (u.watched ? ' is-watched' : ''));
      row.append(whoEl({ by: u.id, name: u.tag || u.name }), ' · ' + (u.role || 'user') + (u.seen ? ' · seen ' + ago(u.seen) : ''));
      row.append(el('small', null, [(u.live || 0) + ' live', (u.okd || 0) + ' approved', (u.rej || 0) + ' turned back', (u.rvd || 0) + ' reverted by others', (u.rvw || 0) + ' reviews', (u.votes || 0) + ' votes', u.strikes ? u.strikes + ' strike' + (u.strikes === 1 ? '' : 's') : ''].filter(Boolean).join(' · ')));
      const flags = el('div');
      if (u.watched) flags.append(el('span', 'th-flag', 'WATCHED'));
      if (u.banned) flags.append(el('span', 'th-flag is-bad', 'BANNED'));
      if (u.flak > 0.5 && (u.landed || 0) >= 4) flags.append(el('span', 'th-flag is-flak', 'FLAK'));
      modActions(flags, u);
      row.append(flags);
      body.append(row);
    });
  }
  const RECORD = {
    role: e => 'role: ' + (e.role ? 'made ' + short(e.user) + ' ' + e.role : e.banned != null ? (e.banned ? 'banned ' : 'unbanned ') + short(e.user) : e.watch != null ? (e.watch ? 'watched ' : 'unwatched ') + short(e.user) : short(e.user)),
    page: e => 'page: made /' + e.page + (e.title ? ' — ' + e.title : ''),
    settings: e => 'settings: ' + [e.chaos != null ? (LEVELS[e.chaos] || LEVELS[1])[1].toLowerCase() : '', e.period ? periodWord(e.period) : '', e.feats ? e.feats.filter(Boolean).length + ' of 6 for everyone' : '', e.look ? 'the look' : ''].filter(Boolean).join(', '),
    invite: e => 'invite: ' + (e.ids || []).map(short).join(', ') + ' to /' + e.page,
    uninvite: e => 'uninvite: ' + (e.ids || []).map(short).join(', ') + ' from /' + e.page,
    review: e => 'review: ' + (e.how || e.do) + ' ' + e.edit + ' by ' + short(e.of) + (e.why ? ' — ' + e.why : '') + (e.skipped ? ' · ' + e.skipped + ' skipped' : ''),
    close: e => 'close: motion ' + e.edit + ' ' + e.result + ', ' + e.ayes + ' for, ' + e.nays + ' against',
    revert: e => 'revert #' + e.rev + (e.of ? ' (' + short(e.of) + ')' : '') + (e.status && e.status !== 'live' ? ' — ' + e.status : ''),
    strike: e => 'strike #' + e.rev + (e.of ? ' (' + short(e.of) + ')' : ''),
    undo: e => 'undo all by ' + short(e.user) + ' since #' + e.since + ': ' + e.reverted + ' back' + (e.strike ? ', struck' : ''),
    ban: e => 'ban: ' + short(e.user) + (e.auto ? ' (two strikes)' : ''),
    proposal: e => 'proposal ' + e.id + ' ' + e.status
  };
  let recordN = 200;
  async function recordSection() {
    body.append(el('h3', 'th-h', 'THE RECORD'));
    const out = await get('?audit=' + recordN);
    if (!out || !out.ok) { body.append(el('p', 'th-empty', 'the record did not answer')); return; }
    const rows = out.audit.filter(e => !e.page || e.page === PAGE);
    if (!rows.length) { body.append(el('p', 'th-empty', 'nothing on the record')); return; }
    rows.forEach(e => {
      const row = el('div', 'th-row');
      row.append(ago(e.at) + ' · ', whoEl({ by: e.by, name: e.by === 'vote' ? 'the vote' : '' }), ' · ' + (RECORD[e.what] ? RECORD[e.what](e) : e.what));
      body.append(row);
    });
    if (out.audit.length >= recordN) { const more = el('button', 'th-link', 'load more'); more.type = 'button'; more.addEventListener('click', () => { recordN += 200; render.all(); }); body.append(more); }
  }

  // ── the panel ─────────────────────────────────────────────────────────
  const render = {
    async all() {
      if (!body) return;
      body.textContent = '';
      closeCard();
      const m = me(), r = rules();
      const you = el('p', 'th-me');
      if (m) {
        you.append('you: ', Object.assign(el('b'), { textContent: m.tag || m.name || 'gnome ' + m.id.slice(0, 6) }), ' · ' + m.tier + (m.rep ? ' · ' + m.rep + ' standing day' + (m.rep === 1 ? '' : 's') : ''), ' ');
        const ren = el('button', 'th-link', 'rename'); ren.type = 'button';
        ren.addEventListener('click', async () => {
          const name = driven ? '' : (prompt('What should the wall call you? (24 letters at most)', m.name || '') || '').trim().slice(0, 24);
          if (!name) return;
          const out = await post({ op: 'me', name });
          if (out.ok) { m.name = out.name; m.tag = out.tag; render.all(); }
        });
        const yours = el('button', 'th-link', 'your card'); yours.type = 'button';
        yours.addEventListener('click', () => card(m.id, yours));
        you.append(ren, yours);
      } else you.textContent = 'not signed in — looking is free; submitting asks for a Knoll account';
      body.append(you);
      if (r && (r.owner || (HOME && isMod()))) body.append(rulesSection(r));
      const [log, queue] = await Promise.all([get('?log=100'), get('?queue=1')]);
      lastLog = log && log.ok ? log.log : [];
      if (queue && queue.ok && queue.queue.length) {
        const motions = queue.queue.filter(q => q.status === 'motion').length;
        body.append(el('h3', 'th-h', motions === queue.queue.length ? 'ON THE BALLOT' : motions ? 'WAITING · ON THE BALLOT' : 'WAITING'));
        queue.queue.forEach(q => {
          const row = el('div', 'th-row'), mine = !!m && q.by === m.id, motion = q.status === 'motion';
          row.append(whoEl(q), ' · ' + ago(q.at) + ' · ' + q.cls + (motion ? ' — a vote: ' + (q.ayes || 0) + ' for, ' + (q.nays || 0) + ' against' + (q.closes ? ' · closes ' + closesIn(q.closes) : '') : '') + (mine ? ' · yours' : ''));
          row.append(el('small', null, what(q.n) + (q.why && !/^(small|large|drastic|council)$/.test(q.why) ? ' · why: ' + q.why : '') + (q.look ? ' · look: ' + [q.look.title, q.look.palette].filter(Boolean).join(', ') : '')));
          const acts = el('div');
          const rv = el('button', 'th-link', 'look'); rv.type = 'button';
          rv.addEventListener('click', () => { close(); if (window.Seed && Seed.review) Seed.review(q.id); });
          acts.append(rv);
          if (motion && canVote() && !mine) {
            [['aye', true], ['nay', false]].forEach(([label, aye]) => {
              const b = el('button', 'th-link', label); b.type = 'button';
              b.addEventListener('click', async () => { const out = await post({ op: 'vote', edit: q.id, aye }); if (out.ok && out.status === 'live' && window.Seed) Seed.pull(true); render.all(); });
              acts.append(b);
            });
            const mach = el('button', 'th-link', 'vote at the machine'); mach.type = 'button';
            mach.addEventListener('click', () => { close(); if (window.Ballot) Ballot.open(q.id); });
            acts.append(mach);
          }
          if (!motion && canDecide(q)) ['approve', 'reject'].forEach(w => { const b = el('button', 'th-link' + (w === 'reject' ? ' is-bad' : ''), w); b.type = 'button'; b.addEventListener('click', () => decideRow(q, w, row)); acts.append(b); });
          row.append(acts);
          body.append(row);
        });
      }
      body.append(el('h3', 'th-h', 'REVISIONS'));
      if (!lastLog.length) body.append(el('p', 'th-empty', log ? 'nothing yet' : 'the log did not answer'));
      lastLog.forEach(e => {
        const row = el('button', 'th-row'); row.type = 'button'; row.dataset.rev = e.rev;
        row.append('#' + e.rev + ' · ' + ago(e.at) + ' · ', whoEl(e));
        row.append(el('small', null, what(e.n || {}) + ' — ' + how(e)));
        if (shown && shown.rev === e.rev) row.classList.add('is-on');
        row.addEventListener('click', () => show(e.rev));
        body.append(row);
      });
      if (isMod()) { await gnomesSection(); await recordSection(); }
      render.foot();
    },
    foot() {
      if (!foot) return;
      foot.textContent = '';
      const r = rules();
      if (r && r.chaos === 2) {
        const line = el('div', 'th-fine'); line.append('ballot closes ' + closesIn(r.closesAt) + (r.motions ? ' · ' + r.motions + (r.motions === 1 ? ' motion' : ' motions') : ''));
        const b = el('button', 'th-link', 'see the ballot'); b.type = 'button'; b.addEventListener('click', () => { close(); if (window.Ballot) Ballot.open(); }); line.append(' ', b);
        foot.append(line);
      }
      if (lastLog.length >= 2) {                            // the scrubber: step the boxes through the revisions
        const revs = lastLog.map(e => e.rev), lo = Math.min.apply(null, revs), hi = Math.max.apply(null, revs);
        const wrap = el('div', 'th-scrub-wrap'), range = el('input', 'th-scrub'), out = el('span', 'th-fine', shown ? '#' + shown.rev : '#' + hi);
        range.type = 'range'; range.min = lo; range.max = hi; range.value = shown ? shown.rev : hi; range.setAttribute('aria-label', 'a revision');
        let t = 0;
        range.addEventListener('input', () => { out.textContent = '#' + range.value; clearTimeout(t); t = setTimeout(() => show(+range.value), 150); });
        wrap.append(range, out); foot.append(wrap);
      }
      if (!shown) { foot.append('press a revision to see it on the paper'); return; }
      const e = shown;
      foot.append(Object.assign(el('b'), { textContent: '#' + e.rev }), ' by ' + who(e) + ', ' + how(e) + '. ');
      const acts = el('div');
      const mk = (label, fn, bad) => { const b = el('button', 'th-link' + (bad ? ' is-bad' : ''), label); b.type = 'button'; b.addEventListener('click', fn); acts.append(b); };
      mk('zoom to it', () => zoomTo(draw(e)));
      mk('clear', clear);
      if (e.how !== 'seed' && canRevert()) mk('revert', () => act({ op: 'revert', rev: e.rev }, 'Undo revision #' + e.rev + '? Every piece it touched goes back to how it was, where nothing has changed it since.'));
      if (e.how !== 'seed' && isMod()) {
        if (!(r && r.chaos === 3)) mk('strike', () => act({ op: 'strike', rev: e.rev }, 'Undo #' + e.rev + ' as vandalism? Its author loses five standing days (two strikes in thirty days bans).'), true);
        if (e.by && e.by !== 'seed') mk('undo all by ' + short(e.by), () => act({ op: 'undo', user: e.by, since: 2 }, 'Undo everything ' + who(e) + ' put up? Every one of their live revisions goes back, newest first.'), true);
      }
      foot.append(acts);
    }
  };
  async function act(body, ask) {
    if (busy) return;
    if (!driven && !confirm(ask)) return;
    busy = true;
    const out = await post(body);
    busy = false;
    if (!out.ok) { alert('Not done: ' + (out.error || 'the door said no') + '.'); return; }
    clear();
    if (window.Seed && Seed.pull) await Seed.pull(true);
    render.all();
  }
  function build() {
    panel = el('aside', 'lab-panel toem-history'); panel.id = 'toem-history-panel'; panel.hidden = true;
    const bar = el('div', 'lp-bar');
    bar.append(el('span', 'lp-plate', 'HISTORY'), el('span', 'lp-gap'));
    const x = el('button', 'lp-x', '×'); x.type = 'button'; x.setAttribute('aria-label', 'close the history'); x.addEventListener('click', close);
    bar.append(x);
    body = el('div', 'lp-body');
    foot = el('div', 'lp-foot th-foot');
    panel.append(bar, body, foot);
    document.body.appendChild(panel);
    if (window.Lab && Lab.gripPanel) try { Lab.gripPanel(panel); } catch (e) {}
    render.foot();
  }
  function toggle() { if (open) close(); else openUp(); }
  async function openUp(section) {
    if (!panel) build();
    if (window.Ballot && Ballot.isOpen) Ballot.close();
    open = true; panel.hidden = false;
    if (link) link.setAttribute('aria-expanded', 'true');
    await render.all();
    if (section === 'rules') { const s = $('th-rules'); if (s) s.scrollIntoView({ block: 'start' }); }
  }
  function close() {
    if (!panel) return;
    open = false; panel.hidden = true;
    closeCard();
    if (link) link.setAttribute('aria-expanded', 'false');
    clear();
  }
  let link = null;
  document.addEventListener('DOMContentLoaded', () => {
    if (!window.Seed || !Seed.LIVE || document.documentElement.classList.contains('toem-embed')) return;
    const tools = document.querySelector('.lab-tools');
    if (!tools) return;
    link = el('button', 'lab-link', 'history'); link.type = 'button'; link.id = 'toem-history'; link.setAttribute('aria-expanded', 'false');
    link.title = 'every revision of the wall, the queue, and the rules of this wall';
    link.addEventListener('click', toggle);
    tools.appendChild(link);
    window.addEventListener('keydown', e => { if (e.key !== 'Escape' || (window.Lab && Lab.menuUp)) return; if (cardEl) { closeCard(); return; } if (open) close(); });
    if (window.Wall && Wall.store && Wall.store.on) Wall.store.on(() => { if (pendingNames.length) paintPending(); });
  });
  return { open: openUp, close, show, clear, markPending, card, get shown() { return shown; }, get isOpen() { return open; } };
})();
