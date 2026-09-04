/* ─── THE PETITION BOARD ───────────────────────────────────────────────────
   Anyone can put a daft question to the hill. ask → vote → pass → dig.
   When yes carries it past the line it isn't a poll result, it's a pond (or a
   tree, a flag, a bench, a sign, a stone) on the hill, and an Article in the
   law book. Roles:
     user       ask, vote at the BALLOT-O-TRON (ballot.js — one ballot per
                question, post another to change it), read the book
     moderator  + review queue, close a vote early, take a question down
     owner      + set the line, toggle pre-review, dig / drain, stir the hill
   State lives in Lab.store('petitions') on this device. */

window.Petition = (function () {
  const $ = id => document.getElementById(id);
  const list = $('pb-list'), review = $('pb-review'), law = $('pb-law'), form = $('pb-ask'), qIn = $('pb-q');
  const quorumIn = $('pb-quorum'), quorumV = $('pb-quorum-v'), reviewToggle = $('pb-review-toggle');
  const loop = $('pb-loop');

  const POND_NAMES = ['Greg', 'Susan', 'Big Dave', 'Colin', 'Pam', 'Nigel', 'Brenda', 'Keith'];
  const KINDS = [
    [/pond|lake|puddle|water|pool|moat|swamp/i, 'pond'],
    [/tree|oak|forest|wood|orchard|bush|hedge/i, 'tree'],
    [/flag|banner|pennant/i, 'flag'],
    [/bench|seat|chair|sofa/i, 'bench'],
    [/sign|name|call|rename|notice|label/i, 'sign']
  ];
  const kindOf = q => (KINDS.find(([re]) => re.test(q)) || [null, 'stone'])[1];
  const roman = n => { const m = [[1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']]; let s = ''; for (const [v, r] of m) while (n >= v) { s += r; n -= v; } return s; };
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function seed() {
    const now = Date.now(), d = 864e5;
    const mk = (n, q, yes, no, status, extra) => ({ id: 'seed-' + n, n, q, yes, no, my: null, status, kind: kindOf(q), created: now - (20 - n) * d, ...extra });
    return {
      next: 6, quorum: 5, review: true,
      items: [
        mk(1, 'Should the hill have a pond?', 6, 1, 'passed', { decided: now - 12 * d, name: 'Greg' }),
        mk(2, 'Should the pond be called Greg?', 5, 2, 'passed', { decided: now - 9 * d }),
        mk(3, 'Should Tuesdays be cancelled?', 2, 3, 'open', {}),
        mk(4, 'Can the gnome have a bigger hat?', 3, 0, 'open', {}),
        mk(5, 'Is a hot dog a sandwich? (binding)', 0, 0, 'pending', { mine: true })
      ]
    };
  }
  const store = Lab.store('petitions', seed);
  const S = () => store.get();
  const role = () => Lab.role;
  const isMod = () => role() === 'moderator' || role() === 'owner';
  const isOwner = () => role() === 'owner';
  const find = id => S().items.find(i => i.id === id);

  // ── the loop indicator ────────────────────────────────────────────────
  function setPhase(p) {
    loop.querySelectorAll('[data-phase]').forEach(e => e.classList.toggle('on', e.dataset.phase === p));
  }

  // ── actions ────────────────────────────────────────────────────────────
  function decide(it, force) {
    const total = it.yes + it.no;
    if (!force && total < S().quorum) return false;
    if (it.yes > it.no) {
      it.status = 'passed'; it.decided = Date.now(); it.born = Date.now();
      if (it.kind === 'pond' && !it.name) it.name = POND_NAMES[(it.n * 7) % POND_NAMES.length];
      return 'passed';
    }
    it.status = 'failed'; it.decided = Date.now();
    return 'failed';
  }

  function vote(id, v) {
    let outcome = null;
    store.update(s => {
      const it = s.items.find(i => i.id === id);
      if (!it || it.status !== 'open') return;
      if (it.my === v) { it[v]--; it.my = null; }          // tap again to take your vote back
      else { if (it.my) it[it.my]--; it[v]++; it.my = v; }
      outcome = decide(it);
    });
    setPhase(outcome === 'passed' ? 'dig' : outcome === 'failed' ? 'pass' : 'vote');
    if (outcome === 'passed') Hill.redraw();
  }

  function submit(q) {
    q = q.trim().replace(/\s+/g, ' ');
    if (!q) return;
    if (!/[?]$/.test(q)) q += '?';
    store.update(s => {
      s.items.unshift({ id: Lab.uid(), n: s.next++, q, yes: 0, no: 0, my: null, status: (s.review && !isMod()) ? 'pending' : 'open', kind: kindOf(q), created: Date.now(), mine: true });
    });
    setPhase('ask');
  }

  function act(id, what) {
    let outcome = null;
    store.update(s => {
      const it = s.items.find(i => i.id === id); if (!it) return;
      if (what === 'approve' && isMod()) it.status = 'open';
      else if (what === 'reject' && isMod()) it.status = 'removed';
      else if (what === 'close' && isMod() && it.status === 'open') { outcome = it.yes === it.no ? (it.status = 'failed', it.decided = Date.now(), 'failed') : decide(it, true); }
      else if (what === 'remove' && isMod()) it.status = 'removed';
      else if (what === 'restore' && isOwner()) it.status = it.decided ? (it.yes > it.no ? 'passed' : 'failed') : 'open';
      else if (what === 'dig' && isOwner()) { it.yes = Math.max(it.yes, it.no + 1); outcome = decide(it, true); }
      else if (what === 'drain' && isOwner() && it.status === 'passed') { it.status = 'drained'; it.drained = Date.now(); }
    });
    if (outcome === 'passed') { setPhase('dig'); Hill.redraw(); }
    else if (outcome === 'failed') setPhase('pass');
    else if (what === 'drain') Hill.redraw();
  }

  // the owner can make the hill turn up and vote, to watch the loop go round
  function stir() {
    let passed = false;
    store.update(s => {
      for (const it of s.items) {
        if (it.status !== 'open') continue;
        const n = 1 + Math.floor(Math.random() * 3);
        for (let k = 0; k < n; k++) { if (Math.random() < 0.62) it.yes++; else it.no++; }
        if (decide(it) === 'passed') passed = true;
      }
    });
    setPhase(passed ? 'dig' : 'vote');
    if (passed) Hill.redraw();
  }

  // ── rendering ──────────────────────────────────────────────────────────
  function card(it) {
    const s = S(), total = it.yes + it.no, pct = total ? Math.round(it.yes / total * 100) : 50;
    const toLine = Math.max(0, s.quorum - total);
    const open = it.status === 'open';
    const statusText = { open: toLine ? toLine + ' more to the line' : 'at the line', passed: 'carried ' + it.yes + '–' + it.no, failed: 'fell ' + it.yes + '–' + it.no, pending: 'awaiting review', removed: 'taken down', drained: 'drained' }[it.status] || it.status;
    let mod = '';
    if (isMod() && open) mod += '<button type="button" class="pb-act" data-act="close">close early</button><button type="button" class="pb-act" data-act="remove">take down</button>';
    if (isOwner() && open) mod += '<button type="button" class="pb-act" data-act="dig">dig it anyway</button>';
    if (isOwner() && it.status === 'passed') mod += '<button type="button" class="pb-act" data-act="drain">drain it</button>';
    if (isOwner() && it.status === 'removed') mod += '<button type="button" class="pb-act" data-act="restore">put it back</button>';
    return '<li class="pb-card" data-id="' + it.id + '" data-status="' + it.status + '">' +
      '<div class="pb-card-top"><span class="pb-num">#' + String(it.n).padStart(3, '0') + '</span><span class="pb-kind">' + it.kind + '</span><span class="pb-status">' + it.status + '</span></div>' +
      '<p class="pb-qtext">' + esc(it.q) + (it.name ? ' <small>— it\'s called ' + esc(it.name) + '</small>' : '') + '</p>' +
      '<div class="pb-tally' + (total ? '' : ' empty') + '"><i style="width:' + pct + '%"></i><b style="left:' + Math.min(100, s.quorum ? Math.round(Math.min(total, s.quorum) / s.quorum * 100) : 0) + '%"></b></div>' +
      /* The tallies are a readout now, not a control. Voting moved into the
         Ballot-O-Tron (ballot.js) — a card can only send itself to the
         machine; the machine is where a ballot is marked and posted. */
      '<div class="pb-row">' +
        '<span class="pb-vote yes' + (it.my === 'yes' ? ' mine' : '') + '">YES <b>' + it.yes + '</b></span>' +
        '<span class="pb-vote no' + (it.my === 'no' ? ' mine' : '') + '">NO <b>' + it.no + '</b></span>' +
        (open ? '<button type="button" class="pb-act load" data-act="load">' +
          (it.my ? 'change my vote' : 'put it on the machine') + '</button>' : '') +
        '<span class="pb-line">' + statusText + '</span>' +
      '</div>' +
      (mod ? '<div class="pb-mod">' + mod + '</div>' : '') +
      '</li>';
  }

  function render() {
    const s = S();
    const rank = { open: 0, pending: 1, passed: 2, failed: 3, drained: 4, removed: 5 };
    const visible = s.items.filter(it => {
      if (it.status === 'removed') return isOwner();
      if (it.status === 'pending') return !isMod() && it.mine;     // you can see your own question waiting
      return true;
    }).sort((a, b) => (rank[a.status] - rank[b.status]) || (b.created - a.created));
    list.innerHTML = visible.map(card).join('') || '<li class="pb-empty">nothing pinned. ask something daft.</li>';

    const pending = s.items.filter(it => it.status === 'pending');
    review.innerHTML = isMod() && pending.length
      ? '<div class="pb-review-h">REVIEW QUEUE · ' + pending.length + '</div>' + pending.map(it =>
        '<div class="pb-review-item" data-id="' + it.id + '"><span>' + esc(it.q) + '</span><button type="button" class="pb-act ok" data-act="approve">post it</button><button type="button" class="pb-act" data-act="reject">bin it</button></div>').join('')
      : (isMod() ? '<div class="pb-review-h quiet">REVIEW QUEUE · empty</div>' : '');

    const articles = s.items.filter(it => it.status === 'passed' || it.status === 'drained').sort((a, b) => a.decided - b.decided);
    law.innerHTML = articles.map((it, i) =>
      '<li' + (it.status === 'drained' ? ' class="repealed"' : '') + '><b>Article ' + roman(i + 1) + '.</b> ' + esc(it.q) + ' <span>carried ' + it.yes + '–' + it.no + (it.name ? '. The pond is called ' + esc(it.name) + '.' : '.') + (it.status === 'drained' ? ' Repealed by the owner.' : '') + '</span></li>').join('')
      || '<li class="pb-empty">no articles yet. the constitution is a blank page.</li>';

    quorumIn.value = s.quorum; quorumV.textContent = s.quorum + ' votes';
    reviewToggle.checked = !!s.review;
    qIn.placeholder = isMod() ? 'put a daft question to the hill… (posts straight away)' : s.review ? 'put a daft question to the hill… (a moderator reads it first)' : 'put a daft question to the hill…';
  }

  // ── the hill ───────────────────────────────────────────────────────────
  Hill.addSource(() => S().items.filter(it => it.status === 'passed').map(it => ({
    id: it.id, kind: it.kind, n: it.n, x: Hill.hash(it.id), born: it.born,
    label: '"' + it.q + '" — carried ' + it.yes + '–' + it.no + (it.name ? '. the pond, for the record, is called ' + it.name : '')
  })));
  Hill.attach($('pb-hill'), $('pb-hill-cap'), 'every passed petition is a thing on the hill. hover one.');

  // ── wiring ─────────────────────────────────────────────────────────────
  form.addEventListener('submit', e => { e.preventDefault(); submit(qIn.value); qIn.value = ''; });
  list.addEventListener('click', e => {
    const li = e.target.closest('.pb-card'); if (!li) return;
    const a = e.target.closest('[data-act]'); if (!a) return;
    // "put it on the machine" is not a moderation action — it loads the reader
    if (a.dataset.act === 'load') { if (window.Ballot) Ballot.show(li.dataset.id); return; }
    act(li.dataset.id, a.dataset.act);
  });
  review.addEventListener('click', e => {
    const row = e.target.closest('.pb-review-item'), a = e.target.closest('[data-act]');
    if (row && a) act(row.dataset.id, a.dataset.act);
  });
  quorumIn.addEventListener('input', () => { store.update(s => { s.quorum = +quorumIn.value; }); });
  reviewToggle.addEventListener('change', () => { store.update(s => { s.review = reviewToggle.checked; }); });
  $('pb-stir').addEventListener('click', stir);
  $('pb-wipe').addEventListener('click', () => { if (confirm('Wipe every petition on this device and start the board again?')) store.reset(); });
  store.on(render);
  document.addEventListener('lab:role', render);
  render();
  setPhase(S().items.some(it => it.status === 'open') ? 'vote' : 'ask');

  return { vote, submit, act, stir, store };
})();
