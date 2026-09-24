/* toem2/ballot.js — THE BALLOT (2026-09-24): the council's motions, voted on
   with a machine. lab 1's Ballot-O-Tron (lab/ballot.js) had the whole act —
   one motion on the reader, a paper ballot you mark AYE or NAY, and a slot
   you drag it into; the machine chugs, counts, and prints the tally — and
   this is that front panel put on the live wall, in the drawer's own case,
   opened from "ballot" beside "history". The books are the door's
   (api/wall.js: THREE LEVELS OF CHAOS — op vote, ?ballot=): posting the
   ballot is Seed.vote(), the same call the history panel's aye and nay
   make, so what the machine can do is exactly what the door allows.

   POSTING THE BALLOT IS A POINTER DRAG, not HTML5 drag-and-drop: the ballot
   follows the pointer, and the drop is decided by the slot's screen rect.
   A ballot you cannot drag — a touch screen, or you simply do not want to —
   is posted by pressing the slot, or the button under the ballot on a
   phone (the machine is hidden there). The drag is the joke, not the only
   door. Own state is one number, how many ballots this browser has posted,
   under knoll-<page>:ballot. */
window.Ballot = (function () {
  const API = '/api/wall', TOKEN = 'knoll-toem2:token';
  const PAGE = document.documentElement.dataset.page || 'toem2', PQ = 'page=' + encodeURIComponent(PAGE), CAST = 'knoll-' + PAGE + ':ballot';
  const COUNT_MS = 1600;
  const $ = id => document.getElementById(id);
  const token = () => { try { return localStorage.getItem(TOKEN); } catch (e) { return null; } };
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const ago = t => { const s = Math.max(0, (Date.now() - t) / 1000); return s < 60 ? 'just now' : s < 3600 ? Math.floor(s / 60) + ' min ago' : s < 86400 ? Math.floor(s / 3600) + ' h ago' : Math.floor(s / 86400) + ' d ago'; };
  const get = q => fetch(API + q + '&' + PQ, { cache: 'no-store', headers: token() ? { authorization: 'Bearer ' + token() } : {} }).then(r => (r.ok ? r.json() : null)).catch(() => null);
  const me = () => (window.Seed && Seed.me) || null;
  const closesIn = t => (window.Seed && Seed.closesIn ? Seed.closesIn(t) : 'soon');
  const canVote = () => !!(window.Seed && Seed.canVote && Seed.canVote());
  const what = n => [n && n.put ? n.put + ' changed' : '', n && n.del ? n.del + ' deleted' : '', n && n.art ? n.art + ' tracings' : ''].filter(Boolean).join(' · ');
  const summary = m => what(m.n) || (m.look ? 'the look only' : 'nothing');

  let panel = null, stage = null, screen = null, slot = null, machine = null, col = null, qEl = null, nEl = null, castEl = null, list = null, closeEl = null, foot = null, link = null;
  let data = null, curId = null, choice = null, phase = 'mark', outcome = null, timer = 0, open = false, poll = 0, tick = 0, cast = 0;
  try { cast = +localStorage.getItem(CAST) || 0; } catch (e) {}

  // ── which motion is on the reader ────────────────────────────────────
  const votable = () => (data && data.queue ? data.queue.filter(m => m.status === 'motion') : []);
  const find = id => votable().find(m => m.id === id) || null;
  function current() {
    const open = votable();
    if (phase === 'done' && curId) return find(curId) || (data && data.gone && data.gone[curId]) || null;
    if (curId && open.some(m => m.id === curId)) return find(curId);
    curId = open.length ? open[0].id : null;
    return curId ? find(curId) : null;
  }
  function show(id) {
    if (!find(id)) return;
    clearTimeout(timer);
    curId = id; choice = null; phase = 'mark'; outcome = null;
    render();
  }
  function next() {
    const open = votable();
    if (!open.length) { curId = null; choice = null; phase = 'mark'; outcome = null; render(); return; }
    const i = open.findIndex(m => m.id === curId);
    curId = open[(i + 1) % open.length].id;
    choice = null; phase = 'mark'; outcome = null;
    render();
  }

  // ── posting one ───────────────────────────────────────────────────────
  async function post() {
    const m = current();
    if (!m || phase !== 'mark' || !choice || !window.Seed || !Seed.vote) return;
    phase = 'counting';
    render();
    slot.insertAdjacentHTML('afterbegin', '<span class="bo-suck" aria-hidden="true"></span>');
    setTimeout(() => { const s = slot.querySelector('.bo-suck'); if (s) s.remove(); }, 800);
    const aye = choice === 'yes', started = Date.now();
    const out = await Seed.vote(m.id, aye);
    const wait = Math.max(0, COUNT_MS - (Date.now() - started));
    timer = setTimeout(async () => {
      if (out && out.ok) {
        outcome = out.status === 'live' ? 'carried' : out.status === 'rejected' ? 'fell' : 'recorded';
        cast++; try { localStorage.setItem(CAST, String(cast)); } catch (e) {}
        data = data || { queue: [] }; data.gone = data.gone || {};
        data.gone[m.id] = Object.assign({}, m, { ayes: out.ayes, nays: out.nays, status: out.status || 'motion', mine: aye ? 1 : 0 });
      } else outcome = !out ? 'silent' : out.code === 'closed' ? 'closed' : out.code === 'busy' ? 'busy' : out.http === 429 ? 'rate' : out.code === 'self' ? 'own' : out.code === 'role' ? 'nostanding' : 'refused';
      phase = 'done';
      await fetchBallot();
      render();
    }, wait);
  }

  // ── the ballot, and dragging it into the slot ─────────────────────────
  function ballotHtml(m, inert) {
    const mine = data && data.mine && data.mine[m.id] != null ? (data.mine[m.id] ? 'aye' : 'nay') : null;
    const armed = !!choice;
    const hint = inert ? inert : armed ? 'grab me — drag me into the slot →' : mine ? 'you voted ' + mine.toUpperCase() + ' — mark one to change it' : 'mark one box to vote';
    const box = (v, label) =>
      '<button type="button" class="bo-box bo-box-' + v + '" data-mark="' + v + '" aria-pressed="' + (choice === v) + '"' + (inert ? ' disabled' : '') + '>' +
        '<i>' + (choice === v ? '✗' : '') + '</i><b>' + label + '</b><u></u></button>';
    return '<div class="bo-ballot' + (armed ? ' armed' : '') + (inert ? ' inert' : '') + '" id="bo-ballot" data-nodrag>' +
      '<span class="st-tab">02 COUNCIL BALLOT</span>' +
      '<div class="bo-grip" aria-hidden="true"><i></i><i></i><i></i></div>' +
      '<div class="bo-boxes">' + box('yes', 'AYE') + box('no', 'NAY') + '</div>' +
      '<p class="bo-hint">' + esc(hint) + '</p>' +
      (inert ? '' : '<button type="button" class="bo-next bo-post" id="bo-post"' + (armed ? '' : ' disabled') + '>POST IT</button>') +
    '</div>';
  }
  function wireDrag() {
    const b = $('bo-ballot');
    if (!b) return;
    let live = false, ox = 0, oy = 0, moved = 0;
    const overSlot = e => { const r = slot.getBoundingClientRect(); return e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom; };
    b.addEventListener('pointerdown', e => {
      if (!choice || phase !== 'mark') return;
      if (e.target.closest('[data-mark], .bo-post')) return;      // marking a box, or the button, is not a drag
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      live = true; ox = e.clientX; oy = e.clientY; moved = 0;
      b.classList.add('lifted');
      try { b.setPointerCapture(e.pointerId); } catch (err) {}
      e.preventDefault(); e.stopPropagation();
    });
    b.addEventListener('pointermove', e => {
      if (!live) return;
      const dx = e.clientX - ox, dy = e.clientY - oy;
      moved = Math.max(moved, Math.abs(dx) + Math.abs(dy));
      b.style.transform = 'translate(' + dx + 'px,' + dy + 'px) rotate(1.2deg) scale(1.03)';
      slot.classList.toggle('over', overSlot(e));
      e.stopPropagation();
    });
    const drop = e => {
      if (!live) return;
      live = false;
      b.classList.remove('lifted');
      b.style.transform = '';
      slot.classList.remove('over');
      try { b.releasePointerCapture(e.pointerId); } catch (err) {}
      if (moved > 4 && overSlot(e)) post();
    };
    b.addEventListener('pointerup', drop);
    b.addEventListener('pointercancel', drop);
    const btn = $('bo-post'); if (btn) btn.addEventListener('click', post);
  }

  // ── the screen ────────────────────────────────────────────────────────
  function say(text, warn) {
    screen.innerHTML = '<div class="bo-screen-in"><div class="bo-say' + (warn ? ' warn' : '') + '"><p>' + esc(text) + '</p><i></i></div></div>';
  }
  function results(m) {
    const ayes = m.ayes || 0, nays = m.nays || 0, total = ayes + nays, quorum = (data && data.quorum) || 3;
    const pct = total ? Math.round(ayes / total * 100) : 50, margin = Math.abs(ayes - nays), toLine = Math.max(0, quorum - total);
    const verdict = outcome === 'carried' ? 'CARRIED' : outcome === 'fell' ? 'FELL' : m.status === 'queued' ? 'FELL TO THE KEEPERS'
                  : ayes === nays ? 'DEAD HEAT — A TIE FALLS' : ayes > nays ? 'AYE LEADS BY ' + margin : 'NAY LEADS BY ' + margin;
    const mine = data && data.mine && data.mine[m.id] != null ? (data.mine[m.id] ? 'AYE' : 'NAY') : m.mine != null ? (m.mine ? 'AYE' : 'NAY') : 'NONE';
    screen.innerHTML = '<div class="bo-screen-in"><div class="bo-results">' +
      '<b>LIVE TALLY · ' + (toLine ? toLine + ' MORE TO THE LINE' : 'AT THE LINE') + '</b>' +
      '<div class="bo-bar bo-bar-yes"><span>AYE</span><i><b style="width:' + pct + '%"></b></i><em>' + ayes + '</em></div>' +
      '<div class="bo-bar bo-bar-no"><span>NAY</span><i><b style="width:' + (100 - pct) + '%"></b></i><em>' + nays + '</em></div>' +
      '<div class="bo-verdict">' + verdict + '</div>' +
      '<div class="bo-yours">YOUR VOTE: ' + mine + '</div>' +
    '</div></div>';
  }
  const WARN = { silent: 'THE ENGINE\nDID NOT ANSWER', closed: 'TOO LATE —\nTHIS ONE CLOSED', busy: 'THE ENGINE IS BUSY —\nTRY AGAIN', rate: 'THAT IS A LOT\nOF BALLOTS\nFOR ONE HOUR',
                 own: 'YOUR OWN MOTION —\nTHE OTHERS DECIDE', nostanding: 'VOTING TAKES A\nSTANDING DAY\nON THE HILL', refused: 'THE ENGINE\nSAID NO' };

  // ── drawing the whole thing ───────────────────────────────────────────
  function render() {
    if (!panel) return;
    const m = current(), open = votable(), r = (window.Seed && Seed.rules) || null;
    castEl.textContent = String(cast).padStart(4, '0');
    machine.classList.toggle('counting', phase === 'counting');
    col.classList.toggle('counting', phase === 'counting');
    closeEl.textContent = data && data.chaos === 2 ? 'closes ' + closesIn(m && m.closes ? m.closes : data.closesAt) : r && r.chaos !== 2 ? 'a ' + (r.chaos === 3 ? 'wild' : r.chaos === 0 ? 'read-only' : 'tended') + ' wall' : '';
    renderList();
    if (!m) {
      nEl.textContent = '— / —';
      qEl.innerHTML = data && data.chaos !== 2 ? 'the ballot is for council walls.<small>this one is ' + (data.chaos === 3 ? 'wild — anything goes, live' : data.chaos === 0 ? 'read-only' : 'tended — the keepers decide') + '; a drastic edit still comes here as a motion.</small>'
                    : 'nothing on the ballot.<small>the wall is quiet. a change from anybody who is not a keeper lands here.</small>';
      stage.innerHTML = '<p class="bo-empty">the reader is empty.</p>';
      say('NO MOTIONS\nON THE BALLOT');
      return;
    }
    const i = open.findIndex(v => v.id === m.id);
    nEl.textContent = (i < 0 ? '—' : i + 1) + ' / ' + (open.length || '—');
    const who = esc(m.name || 'gnome ' + String(m.by || '').slice(0, 6));
    qEl.innerHTML = '<span class="bo-who" data-u="' + esc(m.by || '') + '">' + who + '</span>, ' + ago(m.at) + ' — ' + esc(m.cls) + ': ' + esc(summary(m)) +
      '<small>' + (m.why && !/^(small|large|drastic|council)$/.test(m.why) ? 'why: ' + esc(m.why) + ' · ' : '') +
      (m.look ? 'the look: ' + esc([m.look.title, m.look.palette].filter(Boolean).join(', ')) + ' · ' : '') +
      (m.closes ? 'closes ' + esc(closesIn(m.closes)) + ' · ' : '') +
      (m.status !== 'motion' ? 'this one is settled — ' + (m.status === 'live' ? 'carried' : m.status === 'rejected' ? 'fell' : 'fell to the keepers') + ' · ' : '') +
      '<a href="#" class="bo-look">look at it on the paper</a></small>';
    const lookA = qEl.querySelector('.bo-look'); if (lookA) lookA.addEventListener('click', e => { e.preventDefault(); const id = m.id; close(); if (window.Seed && Seed.review) Seed.review(id); });
    const whoS = qEl.querySelector('.bo-who'); if (whoS && m.by && window.History && History.card) { whoS.tabIndex = 0; whoS.setAttribute('role', 'button'); whoS.addEventListener('click', () => History.card(m.by, whoS)); }
    if (phase === 'counting') {
      stage.innerHTML = '<p class="bo-casting">BALLOT IN THE MACHINE…</p>';
      say('COUNTING\nYOUR BALLOT…');
      return;
    }
    if (phase === 'done') {
      const line = outcome === 'carried' ? 'CARRIED' : outcome === 'fell' ? 'FELL' : outcome === 'recorded' ? 'VOTE SEALED' : 'NOT COUNTED';
      stage.innerHTML = '<div class="bo-done"><div class="bo-stamp' + (outcome === 'recorded' || outcome === 'carried' || outcome === 'fell' ? '' : ' is-bad') + '">' + line + '</div>' +
        '<button type="button" class="bo-next" id="bo-next">' + (open.length > 1 ? 'NEXT MOTION →' : open.length === 1 && open[0].id !== m.id ? 'BACK TO THE FIRST →' : open.length ? 'AGAIN →' : 'THAT IS THE LOT') + '</button></div>';
      $('bo-next').addEventListener('click', next);
      if (WARN[outcome]) say(WARN[outcome], true); else results(m);
      return;
    }
    const mine = !!me() && m.by === me().id;
    const inert = !me() ? 'log in to vote' : mine ? 'your own motion — the others decide' : !canVote() ? 'voting takes a standing day on the hill' : null;
    stage.innerHTML = ballotHtml(m, inert);
    if (!inert) {
      stage.querySelectorAll('[data-mark]').forEach(b => b.addEventListener('click', () => { choice = b.dataset.mark; render(); }));
      wireDrag();
      say(choice ? 'BALLOT MARKED\nDRAG IT INTO\nTHE SLOT' : 'MARK YOUR\nBALLOT');
    } else say(!me() ? 'LOG IN\nTO VOTE' : mine ? WARN.own : WARN.nostanding, true);
  }
  function renderList() {
    if (!list) return;
    list.textContent = '';
    const open = votable(), r = (window.Seed && Seed.rules) || null;
    if (!open.length) { list.append(el('p', 'th-empty', 'nothing on the ballot — the wall is quiet')); }
    open.forEach(m => {
      const row = el('div', 'th-row' + (m.id === curId ? ' is-on' : '')), mine = !!me() && m.by === me().id;
      row.append((m.name || 'gnome ' + String(m.by || '').slice(0, 6)) + ' · ' + ago(m.at) + ' · ' + m.cls + ' · ' + (m.ayes || 0) + ' for, ' + (m.nays || 0) + ' against' + (m.closes ? ' · closes ' + closesIn(m.closes) : '') + (mine ? ' · yours' : ''));
      row.append(el('small', null, summary(m) + (m.look ? ' · look: ' + [m.look.title, m.look.palette].filter(Boolean).join(', ') : '') + (data.mine && data.mine[m.id] != null ? ' · you: ' + (data.mine[m.id] ? 'aye' : 'nay') : '')));
      const acts = el('div');
      const mk = (label, fn) => { const b = el('button', 'th-link', label); b.type = 'button'; b.addEventListener('click', fn); acts.append(b); };
      mk('look', () => { const id = m.id; close(); if (window.Seed && Seed.review) Seed.review(id); });
      if (m.id !== curId) mk('vote here', () => show(m.id));
      if (!mine && canVote() && window.innerWidth < 720) [['aye', true], ['nay', false]].forEach(([label, aye]) => mk(label, async () => { const out = await Seed.vote(m.id, aye); await fetchBallot(); render(); return out; }));
      row.append(acts);
      list.append(row);
    });
    if (data && data.last) {
      const l = data.last, parts = [l.carried ? l.carried + ' carried' : '', l.fell ? l.fell + ' fell' : '', l.kept ? l.kept + ' to the keepers' : ''].filter(Boolean);
      list.append(el('p', 'th-fine', 'last ballot closed ' + ago(l.at) + (parts.length ? ': ' + parts.join(' · ') : ': nothing was on it')));
    }
    if (foot) {
      foot.textContent = '';
      if (!me()) { foot.append('looking is free; '); if (window.Seed) { const a = el('a', 'th-link', 'log in to vote'); a.href = '/login/?next=' + encodeURIComponent(location.pathname + location.search); foot.append(a); } }
      else if (!canVote()) foot.append('a day of live edits on TOEM 2 earns a vote');
      else if (r && r.chaos === 2) foot.append('one ballot per motion · a simple majority at the close, three voters at least · a tie falls');
      else foot.append('drastic edits come here as motions; the rest of this wall is ' + (r && r.chaos === 3 ? 'wild' : r && r.chaos === 0 ? 'read-only' : "the keepers'"));
    }
  }
  async function fetchBallot() {
    const out = await get('?ballot=1');
    if (out && out.ok) { const gone = data && data.gone; data = out; if (gone) data.gone = gone; }
    else if (!data) data = { queue: [], chaos: (window.Seed && Seed.rules && Seed.rules.chaos) || 1, mine: {} };
    return data;
  }

  // ── the panel ─────────────────────────────────────────────────────────
  function build() {
    panel = el('aside', 'lab-panel toem-ballot'); panel.id = 'toem-ballot-panel'; panel.hidden = true;
    panel.innerHTML =
      '<div class="lp-bar"><span class="lp-plate">THE BALLOT</span><span class="lp-count" id="bo-close"></span><span class="lp-gap"></span><button type="button" class="lp-x" id="bo-x" aria-label="close the ballot">×</button></div>' +
      '<div class="lp-body"><div class="bo-rig">' +
        '<div class="bo-left">' +
          '<div class="st-sticky bo-note" aria-hidden="true">1. read the motion<br>2. mark your ballot<br>3. DRAG it into the slot<small>the engine counts the rest.</small></div>' +
          '<div class="bo-issue"><span class="st-tab st-tab-float">01 THE MOTION</span><span class="bo-issue-n" id="bo-n">— / —</span><p class="bo-issue-q" id="bo-q">nothing on the ballot.</p></div>' +
          '<div class="bo-stage" id="bo-stage" data-nodrag></div>' +
        '</div>' +
        '<div class="bo-machine-col" id="bo-machine-col">' +
          '<div class="sp-stack" aria-hidden="true"><span class="st-puff st-puff-1"></span><span class="st-puff st-puff-2"></span><span class="st-puff st-puff-1 st-puff-go"></span><span class="sp-stack-cap"></span><span class="sp-stack-pipe"></span></div>' +
          '<div class="bo-machine" id="bo-machine">' +
            '<div class="bo-top"><span class="st-plate">COUNCIL BALLOT</span><div class="bo-lamps" aria-hidden="true"><span class="st-lamp st-lamp-y"></span><span class="st-lamp st-lamp-r"></span><span class="st-lamp st-lamp-g"></span></div></div>' +
            '<div class="sp-grille" aria-hidden="true"></div>' +
            '<div class="bo-screen" id="bo-screen" aria-live="polite"></div>' +
            '<div class="bo-slot-wrap"><span class="st-tab">04 BALLOT SLOT</span><button type="button" class="bo-slot" id="bo-slot" data-nodrag aria-label="post the ballot"><i aria-hidden="true"></i><em aria-hidden="true">INSERT ↓</em></button></div>' +
            '<div class="bo-cast-row"><div class="bo-cast"><span>BALLOTS CAST</span><b class="st-digits" id="bo-cast">0000</b></div><p>one ballot per motion<br>tallies update live</p></div>' +
          '</div>' +
          '<div class="sp-legs" aria-hidden="true"><i></i><i></i></div>' +
        '</div>' +
      '</div><div class="bo-list" id="bo-list"></div></div>' +
      '<div class="lp-foot th-foot" id="bo-foot"></div>';
    document.body.appendChild(panel);
    stage = $('bo-stage'); screen = $('bo-screen'); slot = $('bo-slot'); machine = $('bo-machine'); col = $('bo-machine-col');
    qEl = $('bo-q'); nEl = $('bo-n'); castEl = $('bo-cast'); list = $('bo-list'); closeEl = $('bo-close'); foot = $('bo-foot');
    $('bo-x').addEventListener('click', close);
    slot.addEventListener('click', () => { if (choice && phase === 'mark') post(); });
    if (window.Lab && Lab.gripPanel) try { Lab.gripPanel(panel); } catch (e) {}
  }
  async function openUp(id) {
    if (!panel) build();
    if (window.History && History.isOpen) History.close();
    open = true; panel.hidden = false;
    if (link) link.setAttribute('aria-expanded', 'true');
    await fetchBallot();
    if (id && find(id)) { curId = id; choice = null; phase = 'mark'; outcome = null; }
    render();
    clearInterval(poll); poll = setInterval(async () => { if (phase === 'counting') return; await fetchBallot(); render(); }, 60000);
    clearInterval(tick); tick = setInterval(() => { if (open && phase !== 'counting') render(); }, 60000);
  }
  function close() {
    if (!panel) return;
    open = false; panel.hidden = true;
    clearInterval(poll); clearInterval(tick);
    if (link) link.setAttribute('aria-expanded', 'false');
  }
  document.addEventListener('DOMContentLoaded', () => {
    if (!window.Seed || !Seed.LIVE || document.documentElement.classList.contains('toem-embed')) return;
    const tools = document.querySelector('.lab-tools');
    if (!tools) return;
    link = el('button', 'lab-link', 'ballot'); link.type = 'button'; link.id = 'toem-ballot'; link.setAttribute('aria-expanded', 'false');
    link.title = "the council's ballot — mark aye or nay and post it in the machine";
    link.addEventListener('click', () => (open ? close() : openUp()));
    tools.appendChild(link);
    window.addEventListener('keydown', e => { if (e.key === 'Escape' && open && !(window.Lab && Lab.menuUp)) close(); });
  });
  return { open: openUp, close, show, next, post, get isOpen() { return open; }, get motion() { return curId; }, get data() { return data; } };
})();
