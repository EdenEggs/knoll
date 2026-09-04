/* ─── THE BALLOT-O-TRON 3000 ───────────────────────────────────────────────
   The petition board used to be voted on with two buttons on a card. It is
   now voted on with a machine: one issue on the reader, a paper ballot you
   mark YES or NO, and a slot you have to physically post it into. The
   machine chugs, counts, and prints the tally.

   NOTHING ABOUT THE VOTE ITSELF CHANGED. Posting a ballot calls
   Petition.vote(id, choice) — the same call the old buttons made — so the
   line, the carrying, the digging of the hill and the Article that lands in
   the law book all happen exactly as before. This file is the front panel,
   not a second set of books. It must load after petition.js.

   POSTING THE BALLOT IS A POINTER DRAG, not HTML5 drag-and-drop. The bench
   is a transformed, zoomable surface; a native drag image is laid out in
   screen space and comes adrift of the sheet the moment the camera is not at
   100%. A pointer drag reads the pointer through Lab.toWorld, so the ballot
   stays under your finger at 20% and at 400% alike.

   Own state is one number — how many ballots this device has posted, in
   Lab.store('ballot'). The votes themselves live where they always did, in
   Petition.store. */

window.Ballot = (function () {
  const $ = id => document.getElementById(id);
  const stage = $('bo-stage'), screen = $('bo-screen'), slot = $('bo-slot'),
        machine = $('bo-machine'), col = $('bo-machine-col'),
        qEl = $('bo-q'), nEl = $('bo-n'), castEl = $('bo-cast');
  if (!stage || !window.Petition) return null;

  const COUNT_MS = 1600;                   // how long the machine takes to count one
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const store = Lab.store('ballot', () => ({ cast: 0 }));
  const P = () => Petition.store.get();

  // the issues on the reader: everything still open, in board order
  const votable = () => P().items.filter(it => it.status === 'open');
  const find = id => P().items.find(it => it.id === id);

  let curId = null;        // the issue on the reader
  let choice = null;       // how this ballot is marked, before it is posted
  let phase = 'mark';      // mark → counting → done
  let outcome = null;      // what the machine has to announce, if anything
  let timer = 0;

  /* ── which issue is on the reader ────────────────────────────────────── */
  function current() {
    const open = votable();
    if (phase === 'done' && curId) return find(curId);      // hold the result up
    if (curId && open.some(it => it.id === curId)) return find(curId);
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
    const i = open.findIndex(it => it.id === curId);
    curId = open[(i + 1) % open.length].id;
    choice = null; phase = 'mark'; outcome = null;
    render();
  }

  /* ── posting one ─────────────────────────────────────────────────────── */
  function post() {
    const it = current();
    if (!it || phase !== 'mark' || !choice) return;
    const mine = it.my;                      // what this device said last time, if anything
    phase = 'counting';
    render();
    // the ballot visibly disappears into the slot. The element is taken back
    // out afterwards — its animation ends invisible, so leaving it would pile
    // up one dead span per vote for the life of the page.
    slot.insertAdjacentHTML('afterbegin', '<span class="bo-suck" aria-hidden="true"></span>');
    setTimeout(() => { const s = slot.querySelector('.bo-suck'); if (s) s.remove(); }, 800);
    timer = setTimeout(() => {
      const took = mine === choice;          // posting the same way again takes the vote back
      Petition.vote(it.id, choice);          // ← the real vote, the real hill, the real law book
      const after = find(it.id);
      outcome = took ? 'withdrawn'
        : after && after.status === 'passed' ? 'carried'
        : after && after.status === 'failed' ? 'fell'
        : 'recorded';
      if (!took) store.update(s => { s.cast++; });
      phase = 'done';
      render();
    }, COUNT_MS);
  }

  /* ── the ballot, and dragging it into the slot ───────────────────────── */
  function ballotHtml(it) {
    const mine = it.my;
    const armed = !!choice;
    const hint = armed ? 'grab me! drag me into the slot →'
      : mine ? 'you voted ' + mine.toUpperCase() + ' — mark one to change it'
      : 'mark one box to vote';
    const box = (v, label) =>
      '<button type="button" class="bo-box bo-box-' + v + '" data-mark="' + v + '" aria-pressed="' + (choice === v) + '">' +
        '<i>' + (choice === v ? '✗' : '') + '</i><b>' + label + '</b><u></u></button>';
    return '<div class="bo-ballot' + (armed ? ' armed' : '') + '" id="bo-ballot" data-nodrag>' +
      '<span class="st-tab">02 OFFICIAL BALLOT</span>' +
      '<div class="bo-grip" aria-hidden="true"><i></i><i></i><i></i></div>' +
      '<div class="bo-boxes">' + box('yes', 'YES') + box('no', 'NO') + '</div>' +
      '<p class="bo-hint">' + hint + '</p>' +
    '</div>';
  }

  /* The ballot is dragged with pointer events so it tracks the pointer at any
     zoom. It is moved by a transform on top of its resting rotation, and the
     drop is decided by the SLOT'S SCREEN RECT — both the pointer and the rect
     are in screen space, so the camera cancels out and no maths is needed. */
  function wireDrag() {
    const el = $('bo-ballot');
    if (!el) return;
    let live = false, ox = 0, oy = 0, moved = 0;
    const at = e => (window.Lab && Lab.toWorld) ? Lab.toWorld(e.clientX, e.clientY) : { x: e.clientX, y: e.clientY };
    const overSlot = e => {
      const r = slot.getBoundingClientRect();
      return e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
    };

    el.addEventListener('pointerdown', e => {
      if (!choice || phase !== 'mark') return;
      if (e.target.closest('[data-mark]')) return;          // marking a box is not a drag
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      const p = at(e);
      live = true; ox = p.x; oy = p.y; moved = 0;
      el.classList.add('lifted');
      try { el.setPointerCapture(e.pointerId); } catch (err) {}
      e.preventDefault(); e.stopPropagation();              // the bench must not pan under it
    });

    el.addEventListener('pointermove', e => {
      if (!live) return;
      const p = at(e), dx = p.x - ox, dy = p.y - oy;
      moved = Math.max(moved, Math.abs(dx) + Math.abs(dy));
      el.style.transform = 'translate(' + dx + 'px,' + dy + 'px) rotate(1.2deg) scale(1.03)';
      slot.classList.toggle('over', overSlot(e));
      e.stopPropagation();
    });

    const drop = e => {
      if (!live) return;
      live = false;
      el.classList.remove('lifted');
      el.style.transform = '';
      slot.classList.remove('over');
      try { el.releasePointerCapture(e.pointerId); } catch (err) {}
      if (moved > 4 && overSlot(e)) post();
    };
    el.addEventListener('pointerup', drop);
    el.addEventListener('pointercancel', drop);

    /* A ballot you cannot drag — a touch device, or you simply do not want to
       — can still be posted by pressing the slot. The drag is the joke, not
       the only door. */
    slot.onclick = () => { if (choice && phase === 'mark') post(); };
  }

  /* ── the screen ──────────────────────────────────────────────────────── */
  function say(text, warn) {
    screen.innerHTML = '<div class="bo-screen-in"><div class="bo-say' + (warn ? ' warn' : '') + '">' +
      '<p>' + esc(text) + '</p><i></i></div></div>';
  }

  function results(it) {
    const s = P(), total = it.yes + it.no;
    const pct = total ? Math.round(it.yes / total * 100) : 50;
    const margin = Math.abs(it.yes - it.no);
    const verdict =
      outcome === 'carried' ? 'CARRIED — DUG INTO THE HILL' :
      outcome === 'fell' ? 'FELL AT THE LINE' :
      outcome === 'withdrawn' ? 'BALLOT WITHDRAWN' :
      it.yes === it.no ? 'DEAD HEAT' :
      (it.yes > it.no ? 'YES LEADS BY ' + margin : 'NO LEADS BY ' + margin);
    const toLine = Math.max(0, s.quorum - total);
    screen.innerHTML = '<div class="bo-screen-in"><div class="bo-results">' +
      '<b>LIVE TALLY · ' + (toLine ? toLine + ' MORE TO THE LINE' : 'AT THE LINE') + '</b>' +
      '<div class="bo-bar bo-bar-yes"><span>YES</span><i><b style="width:' + pct + '%"></b></i><em>' + it.yes + '</em></div>' +
      '<div class="bo-bar bo-bar-no"><span>NO</span><i><b style="width:' + (100 - pct) + '%"></b></i><em>' + it.no + '</em></div>' +
      '<div class="bo-verdict">' + verdict + '</div>' +
      '<div class="bo-yours">YOUR VOTE: ' + (it.my ? it.my.toUpperCase() : 'NONE') + '</div>' +
    '</div></div>';
  }

  /* ── drawing the whole thing ─────────────────────────────────────────── */
  function render() {
    const it = current(), open = votable();

    castEl.textContent = String(store.get().cast).padStart(4, '0');
    machine.classList.toggle('counting', phase === 'counting');
    col.classList.toggle('counting', phase === 'counting');

    if (!it) {
      nEl.textContent = '— / —';
      qEl.innerHTML = 'nothing on the ballot.<small>pin a question on the board below and it comes up here.</small>';
      stage.innerHTML = '<p class="bo-empty">the reader is empty.<br>pin a question below.</p>';
      say('NO ISSUES\nON THE BALLOT');
      markList();
      return;
    }

    const i = open.findIndex(v => v.id === it.id);
    nEl.textContent = (i < 0 ? '—' : i + 1) + ' / ' + (open.length || '—');
    qEl.innerHTML = esc(it.q) + (it.status !== 'open' ? '<small>this one is settled — ' + it.status + '.</small>' : '');

    if (phase === 'counting') {
      stage.innerHTML = '<p class="bo-casting">BALLOT IN THE MACHINE…</p>';
      say('COUNTING\nYOUR BALLOT…');
      return;
    }

    if (phase === 'done') {
      const line =
        outcome === 'carried' ? 'IT CARRIED' :
        outcome === 'fell' ? 'IT FELL' :
        outcome === 'withdrawn' ? 'VOTE WITHDRAWN' : 'VOTE RECORDED';
      stage.innerHTML = '<div class="bo-done"><div class="bo-stamp">' + line + '</div>' +
        '<button type="button" class="bo-next" id="bo-next">NEXT ISSUE →</button></div>';
      $('bo-next').addEventListener('click', next);
      results(it);
      markList();
      return;
    }

    stage.innerHTML = ballotHtml(it);
    stage.querySelectorAll('[data-mark]').forEach(b =>
      b.addEventListener('click', () => { choice = b.dataset.mark; render(); }));
    wireDrag();
    say(choice ? 'BALLOT MARKED\nDRAG IT INTO\nTHE SLOT' : 'MARK YOUR\nBALLOT');
    markList();
  }

  // the card on the board that is currently on the machine wears a ring
  function markList() {
    const list = document.getElementById('pb-list');
    if (!list) return;
    list.querySelectorAll('.pb-card').forEach(li =>
      li.classList.toggle('on-machine', li.dataset.id === curId));
  }

  /* ── wiring ──────────────────────────────────────────────────────────── */
  // the board redrew (a vote, a new question, the owner stirring) — follow it,
  // but not while the machine is mid-count or it would swallow its own noise
  Petition.store.on(() => { if (phase !== 'counting') render(); else markList(); });
  document.addEventListener('lab:role', render);
  store.on(() => { castEl.textContent = String(store.get().cast).padStart(4, '0'); });
  render();

  return { show, next, post, store, get issue() { return curId; } };
})();
