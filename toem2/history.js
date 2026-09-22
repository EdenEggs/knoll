/* toem2/history.js — THE WALL'S HISTORY, ON THE PAPER (2026-09-17).

   The live wall (seed.js: THE LIVE WALL) is a list of revisions, and this is
   where a person reads it: a panel in the drawer's own case, opened from
   "history" beside the submit button, listing every revision newest first —
   who, when, what, and how it got on (went live, approved, passed by vote,
   undone) — and, for the trusted and the moderators, the queue of edits
   waiting for a look and the motions up for a vote.

   A REVISION IS SHOWN ON THE CANVAS, not in words: press one and a box goes
   round every piece it touched, drawn on a second <svg> laid over the sheet
   exactly like the wall's own — green dashed for a piece it put up, red with
   a cross for one it took off (drawn where the piece was), amber for one it
   changed, with a line from where a moved piece stood to where it went. The
   pieces themselves are left alone: the boxes are all that is drawn, so the
   paper under them is the wall as it stands, and "zoom to it" brings the
   camera to the lot.

   UNDOING ONE is the foot of the panel: revert (a contributor or better;
   a newcomer's would be an edit they cannot make), and for a moderator strike
   (revert as vandalism, which costs the author) and undo everything by that
   person. All of it goes through api/wall.js's own ops, so what the panel
   can do is exactly what the door allows, and nothing the panel says is
   trusted by anybody but the reader. */
window.History = (function () {
  const API = '/api/wall', TOKEN = 'knoll-toem2:token';
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
  const who = e => (e.name || (e.by === 'seed' ? 'the shipped wall' : 'gnome ' + String(e.by || '').slice(0, 6))) + (e.by && e.by !== 'seed' ? ' · ' + String(e.by).slice(0, 6) : '');
  const how = e => {
    const h = String(e.how || ''), of = e.of != null ? ' #' + e.of : '';
    return h === 'seed' ? 'the wall it opened on' : h === 'live' ? 'went live' : h === 'approved' ? 'approved by ' + String(e.via || '').slice(0, 6)
         : h === 'motion' ? 'passed by vote' : h === 'fiat' ? 'fast-tracked by ' + String(e.via || '').slice(0, 6)
         : /^strike/.test(h) ? 'struck' + of : /^undo/.test(h) ? 'undone' + of : /^revert/.test(h) ? 'undid' + of : h;
  };
  const what = n => [n.put ? n.put + ' changed' : '', n.del ? n.del + ' deleted' : '', n.art ? n.art + ' tracings' : ''].filter(Boolean).join(' · ') || 'nothing';

  let panel = null, body = null, foot = null, diff = null, open = false, shown = null, busy = false;
  const me = () => (window.Seed && Seed.me) || null;
  const isMod = () => { const m = me(); return !!m && (m.role === 'mod' || m.role === 'admin'); };
  const canRevert = () => { const m = me(); return !!m && (isMod() || m.tier === 'contributor' || m.tier === 'trusted'); };
  const canVote = () => { const m = me(); return !!m && (isMod() || m.tier === 'trusted'); };
  // the site's session cookie goes by itself; a Bearer only for toem2/session.js's pasted one
  const post = body => fetch(API, { method: 'POST', headers: Object.assign({ 'content-type': 'application/json' }, token() ? { authorization: 'Bearer ' + token() } : {}), body: JSON.stringify(body) })
    .then(r => r.json().catch(() => ({ ok: false, error: 'the door answered ' + r.status })));
  const get = q => fetch(API + q, { cache: 'no-store' }).then(r => (r.ok ? r.json() : null)).catch(() => null);

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
  function clear() {
    if (diff) diff.textContent = '';
    shown = null;
    if (foot) render.foot();
  }
  function draw(entry) {
    if (!diff) {
      const world = (window.Lab && Lab.world) || $('bench-world');
      diff = sv('svg', { class: 'wall-diff', 'aria-hidden': 'true' });
      world.appendChild(diff);
    }
    diff.textContent = '';
    const boxes = [];
    const rect = (b, cls) => { boxes.push(b); diff.appendChild(sv('rect', { class: cls, x: b.x - 6, y: b.y - 6, width: b.w + 12, height: b.h + 12, rx: 8, 'stroke-width': 3, 'vector-effect': 'non-scaling-stroke' })); };
    Object.keys(entry.put || {}).forEach(n => {
      const now = entry.put[n], was = entry.prev ? entry.prev[n] : null;
      const b = box(now);
      if (!b) return;
      if (!was) { rect(b, 'th-add'); return; }
      rect(b, 'th-chg');
      const wb = box(was);
      if (wb && (Math.abs(wb.x - b.x) > 1 || Math.abs(wb.y - b.y) > 1)) {
        const x0 = wb.x + wb.w / 2, y0 = wb.y + wb.h / 2, x1 = b.x + b.w / 2, y1 = b.y + b.h / 2;
        diff.appendChild(sv('circle', { class: 'th-was', cx: x0, cy: y0, r: 6, 'stroke-width': 2, 'vector-effect': 'non-scaling-stroke' }));
        diff.appendChild(sv('line', { class: 'th-line', x1: x0, y1: y0, x2: x1, y2: y1, 'stroke-width': 2, 'vector-effect': 'non-scaling-stroke' }));
        boxes.push(wb);
      }
    });
    (entry.del || []).forEach(n => {
      const was = entry.prev ? entry.prev[n] : null, b = box(was);
      if (!b) return;
      rect(b, 'th-del');
      diff.appendChild(sv('line', { class: 'th-del', x1: b.x, y1: b.y, x2: b.x + b.w, y2: b.y + b.h, 'stroke-width': 3, 'vector-effect': 'non-scaling-stroke' }));
      diff.appendChild(sv('line', { class: 'th-del', x1: b.x + b.w, y1: b.y, x2: b.x, y2: b.y + b.h, 'stroke-width': 3, 'vector-effect': 'non-scaling-stroke' }));
    });
    return boxes;
  }
  function zoomTo(boxes) {
    if (!boxes.length || !window.Lab || !Lab.camTo) return;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    boxes.forEach(b => { x0 = Math.min(x0, b.x); y0 = Math.min(y0, b.y); x1 = Math.max(x1, b.x + b.w); y1 = Math.max(y1, b.y + b.h); });
    const br = Lab.bench.getBoundingClientRect(), pad = 90;
    const z = Math.max(0.02, Math.min(1, (br.width - pad * 2) / Math.max(x1 - x0, 1), (br.height - pad * 2) / Math.max(y1 - y0, 1)));
    Lab.camTo(z, br.width / 2 - (x0 + x1) / 2 * z, br.height / 2 - (y0 + y1) / 2 * z, 340);
  }
  async function show(rev) {
    const out = await get('?at=' + rev);
    if (!out || !out.ok) return;
    shown = out.rev;
    const boxes = draw(shown);
    zoomTo(boxes);
    body.querySelectorAll('.th-row').forEach(r => r.classList.toggle('is-on', +r.dataset.rev === rev));
    render.foot();
  }

  // ── the panel ─────────────────────────────────────────────────────────
  const render = {
    async all() {
      if (!body) return;
      body.textContent = '';
      const m = me();
      const you = el('p', 'th-me');
      if (m) {
        you.append('you: ', Object.assign(el('b'), { textContent: m.name || 'gnome ' + m.id.slice(0, 6) }), ' · ' + m.tier + (m.rep ? ' · ' + m.rep + ' standing day' + (m.rep === 1 ? '' : 's') : ''), ' ');
        const ren = el('button', 'th-link', 'rename'); ren.type = 'button';
        ren.addEventListener('click', async () => {
          const name = driven ? '' : (prompt('What should the wall call you? (24 letters at most)', m.name || '') || '').trim().slice(0, 24);
          if (!name) return;
          const out = await post({ op: 'me', name });
          if (out.ok) { m.name = out.name; render.all(); }
        });
        you.append(ren);
      } else you.textContent = 'not signed in — looking is free; submitting asks for a Google sign-in';
      body.append(you);
      const [log, queue] = await Promise.all([get('?log=100'), canVote() ? get('?queue=1') : null]);
      if (queue && queue.ok && queue.queue.length) {
        body.append(el('h3', 'th-h', 'WAITING'));
        queue.queue.forEach(q => {
          const row = el('div', 'th-row');
          row.append(who(q) + ' · ' + ago(q.at) + ' · ' + q.cls + (q.status === 'motion' ? ' — a vote: ' + (q.ayes || 0) + ' for, ' + (q.nays || 0) + ' against' : ''));
          row.append(el('small', null, what(q.n)));
          const acts = el('div');
          const rv = el('button', 'th-link', 'look'); rv.type = 'button';
          rv.addEventListener('click', () => { close(); if (window.Seed && Seed.review) Seed.review(q.id); });
          acts.append(rv);
          if (q.status === 'motion' && canVote() && q.by !== (m && m.id)) {
            [['aye', true], ['nay', false]].forEach(([label, aye]) => {
              const b = el('button', 'th-link', label); b.type = 'button';
              b.addEventListener('click', async () => { const out = await post({ op: 'vote', edit: q.id, aye }); if (out.ok && out.status === 'live' && window.Seed) Seed.pull(true); render.all(); });
              acts.append(b);
            });
          }
          row.append(acts);
          body.append(row);
        });
      }
      body.append(el('h3', 'th-h', 'REVISIONS'));
      if (!log || !log.ok || !log.log.length) { body.append(el('p', 'th-empty', 'nothing yet')); return; }
      log.log.forEach(e => {
        const row = el('button', 'th-row'); row.type = 'button'; row.dataset.rev = e.rev;
        row.append('#' + e.rev + ' · ' + ago(e.at) + ' · ' + who(e));
        row.append(el('small', null, what(e.n || {}) + ' — ' + how(e)));
        if (shown && shown.rev === e.rev) row.classList.add('is-on');
        row.addEventListener('click', () => show(e.rev));
        body.append(row);
      });
    },
    foot() {
      if (!foot) return;
      foot.textContent = '';
      if (!shown) { foot.append('press a revision to see it on the paper'); return; }
      const e = shown;
      foot.append(Object.assign(el('b'), { textContent: '#' + e.rev }), ' by ' + who(e) + ', ' + how(e) + '. ');
      const acts = el('div');
      const mk = (label, fn, bad) => { const b = el('button', 'th-link' + (bad ? ' is-bad' : ''), label); b.type = 'button'; b.addEventListener('click', fn); acts.append(b); };
      mk('zoom to it', () => zoomTo(draw(e)));
      mk('clear', clear);
      if (e.how !== 'seed' && canRevert()) mk('revert', () => act({ op: 'revert', rev: e.rev }, 'Undo revision #' + e.rev + '? Every piece it touched goes back to how it was, where nothing has changed it since.'));
      if (e.how !== 'seed' && isMod()) {
        mk('strike', () => act({ op: 'strike', rev: e.rev }, 'Undo #' + e.rev + ' as vandalism? Its author loses five standing days (two strikes in thirty days bans).'), true);
        if (e.by && e.by !== 'seed') mk('undo all by ' + String(e.by).slice(0, 6), () => act({ op: 'undo', user: e.by, since: 2 }, 'Undo everything ' + who(e) + ' put up? Every one of their live revisions goes back, newest first.'), true);
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
  function openUp() {
    if (!panel) build();
    open = true; panel.hidden = false;
    if (link) link.setAttribute('aria-expanded', 'true');
    render.all();
  }
  function close() {
    if (!panel) return;
    open = false; panel.hidden = true;
    if (link) link.setAttribute('aria-expanded', 'false');
    clear();
  }
  let link = null;
  document.addEventListener('DOMContentLoaded', () => {
    if (!window.Seed || !Seed.LIVE) return;
    const tools = document.querySelector('.lab-tools');
    if (!tools) return;
    link = el('button', 'lab-link', 'history'); link.type = 'button'; link.id = 'toem-history'; link.setAttribute('aria-expanded', 'false');
    link.title = 'every revision of the wall, and the queue';
    link.addEventListener('click', toggle);
    tools.appendChild(link);
    window.addEventListener('keydown', e => { if (e.key === 'Escape' && open && !(window.Lab && Lab.menuUp)) close(); });
  });
  return { open: openUp, close, show, clear, get shown() { return shown; }, get isOpen() { return open; } };
})();
