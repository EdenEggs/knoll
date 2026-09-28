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
   under knoll-<page>:ballot.

   THE PICTURES, THE HEARTS AND THE CLOCK (2026-09-28). Over the machine, on a
   tended wall as on a council, stands every edit that waits as a PICTURE of
   the page with it on — the way the dashboard's past looks are the page
   itself: each is this bench again in a frame (?embed=1&review=<edit>, which
   lays the edit over the wall and brings the camera to what it touches) —
   with who sent it, when, and how much it changes; the one that changes the
   most first (the door's order). Each has a HEART and the count of them: on
   a motion a heart is an aye (op heart), on an edit that waits for the
   moderators it decides nothing. A council has a CLOCK: when it comes round
   the motion with the most hearts goes up, and the clock counts down here,
   to the second. ponytail: LOOKS pictures are drawn at once and the rest on
   asking — each is a whole bench; a thumbnail drawn from the edit's own
   pieces when a page has dozens waiting. */
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
  const send = body => fetch(API, { method: 'POST', cache: 'no-store', headers: Object.assign({ 'content-type': 'application/json' }, token() ? { authorization: 'Bearer ' + token() } : {}), body: JSON.stringify(Object.assign({ page: PAGE }, body)) })
    .then(r => r.json().then(o => Object.assign(o, { http: r.status }))).catch(() => ({ ok: false, error: 'the door did not answer' }));
  const me = () => (window.Seed && Seed.me) || null;
  const closesIn = t => (window.Seed && Seed.closesIn ? Seed.closesIn(t) : 'soon');
  const canVote = () => !!(window.Seed && Seed.canVote && Seed.canVote());
  const what = n => [n && n.put ? n.put + ' changed' : '', n && n.del ? n.del + ' deleted' : '', n && n.art ? n.art + ' tracings' : ''].filter(Boolean).join(' · ');
  const summary = m => what(m.n) || (m.look ? 'the look only' : 'nothing');

  let panel = null, stage = null, screen = null, slot = null, machine = null, col = null, qEl = null, nEl = null, castEl = null, list = null, closeEl = null, foot = null, link = null;
  let rig = null, looks = null, clockEl = null, looksN = 6, second = 0;
  const LOOKS = 6, cards = new Map();           // THE PICTURES: how many are drawn at once, and the ones that are, by their edit
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
  // THE COUNCIL'S CLOCK: of the motions it decides, the one that would go up were it to come round now — the most hearts, one at least
  // (a drastic edit's, the quorum), and more than its nays: the door's rule (api/wall.js: leads), said here before the door says it
  const needs = m => (m.cls === 'drastic' ? (data && data.quorum) || 3 : 1);
  const leader = () => votable().filter(m => m.tick && (m.ayes || 0) >= needs(m) && (m.ayes || 0) > (m.nays || 0)).sort((a, b) => b.ayes - a.ayes || (a.nays || 0) - (b.nays || 0) || a.at - b.at)[0] || null;
  function results(m) {
    const ayes = m.ayes || 0, nays = m.nays || 0, total = ayes + nays, quorum = (data && data.quorum) || 3;
    const pct = total ? Math.round(ayes / total * 100) : 50, margin = Math.abs(ayes - nays), toLine = Math.max(0, quorum - total), lead = leader();
    const verdict = outcome === 'carried' ? 'CARRIED' : outcome === 'fell' ? 'FELL' : m.status === 'queued' ? 'FELL TO THE MODERATORS'
                  : m.tick ? (lead && lead.id === m.id ? 'LEADS THE BALLOT' : !ayes ? 'NO HEART YET' : ayes < needs(m) ? (needs(m) - ayes) + ' MORE TO RUN — IT IS DRASTIC' : ayes <= nays ? 'NO MORE HEARTS THAN NAYS'
                             : lead && lead.ayes - ayes ? (lead.ayes - ayes) + ' BEHIND THE LEADER' : 'LEVEL — THE OLDER LEADS')
                  : ayes === nays ? 'DEAD HEAT — A TIE FALLS' : ayes > nays ? 'AYE LEADS BY ' + margin : 'NAY LEADS BY ' + margin;
    const mine = data && data.mine && data.mine[m.id] != null ? (data.mine[m.id] ? 'AYE' : 'NAY') : m.mine != null ? (m.mine ? 'AYE' : 'NAY') : 'NONE';
    screen.innerHTML = '<div class="bo-screen-in"><div class="bo-results">' +
      '<b>LIVE TALLY · ' + (m.tick ? 'THE MOST HEARTS GOES UP' : toLine ? toLine + ' MORE TO THE LINE' : 'AT THE LINE') + '</b>' +
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
    closeEl.textContent = data && data.chaos === 2 ? 'next round ' + closesIn(data.closesAt) : r && r.chaos !== 2 ? 'a ' + (r.chaos === 3 ? 'wild' : r.chaos === 0 ? 'read-only' : 'tended') + ' wall' : '';
    renderLooks();
    renderList();
    rig.hidden = !m && !!data && data.chaos !== 2;   // the machine is for motions: a wall that is no council has it only while one is up
    if (!m) {
      nEl.textContent = '— / —';
      qEl.innerHTML = data && data.chaos !== 2 ? 'no motion on the ballot.<small>this wall is ' + (data.chaos === 3 ? 'wild — anything goes, live' : data.chaos === 0 ? 'read-only' : 'tended — the moderators decide what waits') + '; a drastic edit still comes here as a motion.</small>'
                    : 'nothing on the ballot.<small>the wall is quiet. a change from anybody who is not a moderator lands here.</small>';
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
      (m.closes ? 'decided ' + esc(closesIn(m.closes)) + ' · ' : '') +
      (m.status !== 'motion' ? 'this one is settled — ' + (m.status === 'live' ? 'carried' : m.status === 'rejected' ? 'fell' : 'fell to the moderators') + ' · ' : '') +
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
      row.append((m.name || 'gnome ' + String(m.by || '').slice(0, 6)) + ' · ' + ago(m.at) + ' · ' + m.cls + ' · ' + (m.ayes || 0) + ' for, ' + (m.nays || 0) + ' against' + (m.closes ? ' · decided ' + closesIn(m.closes) : '') + (mine ? ' · yours' : ''));
      row.append(el('small', null, summary(m) + (m.look ? ' · look: ' + [m.look.title, m.look.palette].filter(Boolean).join(', ') : '') + (data.mine && data.mine[m.id] != null ? ' · you: ' + (data.mine[m.id] ? 'aye' : 'nay') : '')));
      const acts = el('div');
      const mk = (label, fn) => { const b = el('button', 'th-link', label); b.type = 'button'; b.addEventListener('click', fn); acts.append(b); };
      mk('look', () => { const id = m.id; close(); if (window.Seed && Seed.review) Seed.review(id); });
      if (m.id !== curId) mk('vote here', () => show(m.id));
      if (!mine && canVote() && window.innerWidth < 720) [['aye', true], ['nay', false]].forEach(([label, aye]) => mk(label, async () => { const out = await Seed.vote(m.id, aye); await fetchBallot(); render(); return out; }));
      row.append(acts);
      list.append(row);
    });
    if (data && data.last) {                    // the last round: what went up, and what waited on (a round from before the clock says what carried, fell and was kept)
      const l = data.last, parts = [l.carried ? (l.waiting != null && l.carried === 1 ? 'one went up' : l.carried + ' carried') : '', l.fell ? l.fell + ' fell' : '', l.kept ? l.kept + ' to the moderators' : '', l.waiting ? l.waiting + ' waited on' : ''].filter(Boolean);
      list.append(el('p', 'th-fine', 'the clock last came round ' + ago(l.at) + (parts.length ? ': ' + parts.join(' · ') : ': nothing was on the ballot')));
    }
    if (foot) {
      foot.textContent = '';
      if (!me()) { foot.append('looking is free; '); if (window.Seed) { const a = el('a', 'th-link', 'log in to vote'); a.href = '/login/?next=' + encodeURIComponent(location.pathname + location.search); foot.append(a); } }
      else if (!canVote()) foot.append('a day of live edits on TOEM 2 earns a vote');
      else if (r && r.chaos === 2) foot.append('a heart is an aye · when the clock comes round the motion with the most hearts goes up — one at least (three, if it is drastic), and more than its nays');
      else foot.append('drastic edits come here as motions; the rest of this wall is ' + (r && r.chaos === 3 ? 'wild' : r && r.chaos === 0 ? 'read-only' : "the moderators'"));
    }
  }
  /* ── THE PICTURES: every edit that waits, as the page would look with it on ──
     A card is built once for an edit and kept (its frame is a whole bench): a redraw moves the cards into the door's
     order, takes away the ones that were decided, and repaints the words and the hearts in place. */
  const frameOf = id => location.pathname + '?embed=1&live=1' + (PAGE === 'toem2' ? '' : '&page=' + encodeURIComponent(PAGE)) + '&review=' + encodeURIComponent(id);
  const FRAME_W = 560;                          // the bench in a picture is this wide (ballot.css), and drawn as small as its print
  const fit = typeof ResizeObserver === 'function' ? new ResizeObserver(es => es.forEach(e => { const f = e.target.firstElementChild; if (f && e.contentRect.width) f.style.transform = 'scale(' + (e.contentRect.width / FRAME_W).toFixed(4) + ')'; })) : null;
  const whyNot = w => (!me() ? 'log in to give a heart' : w.by === me().id ? 'your own edit — the others give the hearts' : w.status === 'motion' && !canVote() ? 'a heart on a motion is a vote: it takes a standing day on the hill' : '');
  function cardOf(w) {
    const c = el('article', 'bo-print'), pic = el('button', 'bo-print-pic'), f = el('iframe');
    pic.type = 'button'; pic.title = 'look at it on the paper';
    f.src = frameOf(w.id); f.loading = 'lazy'; f.tabIndex = -1; f.title = ''; f.setAttribute('aria-hidden', 'true'); f.setAttribute('inert', ''); f.setAttribute('scrolling', 'no');
    pic.append(f);
    if (fit) fit.observe(pic);
    pic.addEventListener('click', () => { close(); if (window.Seed && Seed.review) Seed.review(w.id); });
    const cap = el('div', 'bo-print-cap'), who = el('b', 'bo-print-who'), when = el('span', 'bo-print-when'), n = el('span', 'bo-print-n'), kind = el('span', 'bo-print-kind');
    const heart = el('button', 'bo-heart'); heart.type = 'button';
    heart.innerHTML = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 17S3 12.5 3 7.5A3.5 3.5 0 0 1 10 6a3.5 3.5 0 0 1 7 1.5C17 12.5 10 17 10 17Z"/></svg><b></b>';
    const note = el('p', 'bo-print-note'); note.hidden = true;
    heart.addEventListener('click', async () => {
      const now = c.w, no = whyNot(now);
      if (no) { note.textContent = no; note.hidden = false; return; }
      heart.disabled = true;
      const out = await send({ op: 'heart', edit: now.id, on: !now.hearted });
      heart.disabled = false;
      if (!out.ok) { note.textContent = 'Not counted: ' + (out.error || 'the door said no') + '.'; note.hidden = false; return; }
      note.hidden = true;
      await fetchBallot();
      if (out.status === 'live' && window.Seed && Seed.pull) Seed.pull(true);
      render();
    });
    cap.append(who, when, n, kind);
    c.append(pic, cap, heart, note);
    c.paint = now => {
      c.w = now;
      const hearts = now.hearts || 0, mine = !!me() && now.by === me().id;
      who.textContent = now.name || 'gnome ' + String(now.by || '').slice(0, 6);
      when.textContent = ago(now.at) + (mine ? ' · yours' : '');
      n.textContent = summary(now);
      kind.textContent = now.status === 'motion' ? 'ON THE BALLOT' : 'WAITS FOR THE MODERATORS';
      pic.setAttribute('aria-label', 'look at ' + who.textContent + '’s edit on the paper');
      heart.classList.toggle('is-on', !!now.hearted);
      heart.setAttribute('aria-pressed', String(!!now.hearted));
      heart.setAttribute('aria-label', (now.hearted ? 'take your heart back' : 'give it a heart') + ' — ' + hearts + (hearts === 1 ? ' heart' : ' hearts'));
      heart.title = whyNot(now) || (now.hearted ? 'take your heart back' : now.status === 'motion' ? 'a heart: an aye for this one' : 'a heart: it says which you like — the moderators decide');
      heart.lastChild.textContent = String(hearts);
    };
    return c;
  }
  function renderLooks() {
    const all = (data && data.waiting) || [], shown = all.slice(0, looksN), council = !!data && data.chaos === 2;
    looks.hidden = !all.length && !council;
    const head = looks.querySelector('.bo-looks-h'), grid = looks.querySelector('.bo-looks-grid'), more = looks.querySelector('.bo-more'), none = looks.querySelector('.bo-looks-none');
    head.textContent = all.length === 1 ? 'ONE EDIT WAITS' : all.length + ' EDITS WAIT' + (all.length > 1 ? ' · THE BIGGEST FIRST' : '');
    clockEl.parentNode.hidden = !council;
    none.hidden = !!all.length;
    const keep = new Set(shown.map(w => w.id));
    cards.forEach((c, id) => { if (!keep.has(id)) { c.remove(); cards.delete(id); } });
    shown.forEach((w, i) => {
      let c = cards.get(w.id);
      if (!c) { c = cardOf(w); cards.set(w.id, c); }
      c.paint(w);
      if (grid.children[i] !== c) grid.insertBefore(c, grid.children[i] || null);
    });
    more.hidden = all.length <= looksN;
    more.textContent = 'show ' + Math.min(LOOKS, all.length - looksN) + ' more';
    paintClock();
  }
  // the clock, to the second — and when it has come round, the ballot is read again (which is what settles the round at the door)
  const two = v => String(v).padStart(2, '0');
  function paintClock() {
    if (!clockEl || !data || data.chaos !== 2 || !data.closesAt) return;
    const s = Math.max(0, Math.ceil((data.closesAt - Date.now()) / 1000)), d = Math.floor(s / 86400);
    clockEl.textContent = (d ? d + 'd ' : '') + two(Math.floor(s % 86400 / 3600)) + ':' + two(Math.floor(s % 3600 / 60)) + ':' + two(s % 60);
    clockEl.setAttribute('datetime', new Date(data.closesAt).toISOString());
    if (!s && !paintClock.asked) {
      paintClock.asked = true;
      fetchBallot().then(() => { paintClock.asked = false; if (window.Seed && Seed.pull) Seed.pull(true); if (window.Seed && Seed.readRules) Seed.readRules(true); if (open && phase !== 'counting') render(); });
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
      '<div class="lp-body">' +
      '<section class="bo-looks" id="bo-looks" aria-label="the edits that wait"><div class="bo-looks-top"><span class="st-tab bo-looks-h">0 EDITS WAIT</span>' +
        '<p class="bo-clock">THE MOST HEARTED GOES UP IN <time id="bo-clock" role="timer" aria-live="off">--:--:--</time></p></div>' +
        '<p class="bo-looks-none">nothing waits — an edit that does stands here as a picture of the page with it on, with a heart to give it.</p>' +
        '<div class="bo-looks-grid"></div><button type="button" class="th-link bo-more" hidden>show more</button></section>' +
      '<div class="bo-rig" id="bo-rig">' +
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
    rig = $('bo-rig'); looks = $('bo-looks'); clockEl = $('bo-clock');
    looks.querySelector('.bo-more').addEventListener('click', () => { looksN += LOOKS; renderLooks(); });
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
    clearInterval(second); second = setInterval(paintClock, 1000);
  }
  function close() {
    if (!panel) return;
    open = false; panel.hidden = true;
    clearInterval(poll); clearInterval(tick); clearInterval(second);
    cards.forEach(c => c.remove()); cards.clear(); looksN = LOOKS;   // the pictures are whole benches: they go when the panel does
    if (link) link.setAttribute('aria-expanded', 'false');
  }
  document.addEventListener('DOMContentLoaded', () => {
    if (!window.Seed || !Seed.LIVE || document.documentElement.classList.contains('toem-embed')) return;
    const tools = document.querySelector('.lab-tools');
    if (!tools) return;
    link = el('button', 'lab-link', 'ballot'); link.type = 'button'; link.id = 'toem-ballot'; link.setAttribute('aria-expanded', 'false');
    link.title = 'the ballot — the edits that wait, as pictures of the page, and a heart for the ones you like';
    link.addEventListener('click', () => (open ? close() : openUp()));
    tools.appendChild(link);
    window.addEventListener('keydown', e => { if (e.key === 'Escape' && open && !(window.Lab && Lab.menuUp)) close(); });
  });
  return { open: openUp, close, show, next, post, get isOpen() { return open; }, get motion() { return curId; }, get data() { return data; } };
})();
