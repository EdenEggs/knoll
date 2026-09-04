/* ─── THE NAMING CEREMONY ──────────────────────────────────────────────────
   When a new landmark turns up on the hill — a passed petition, a shipped
   contraption — the hill votes on what it is called. Names are put forward,
   one vote per landmark per device, and the first name to reach the line
   carries. Names stick forever and show on hover. The pond, for the record,
   is called Greg. Roles:
     user       propose a name, vote (switching moves it, tap again takes it back)
     moderator  + strike a name off a ballot (it stays up, crossed out)
     owner      + set the line, christen a name outright, make the hill mutter
   State lives in Lab.store('naming') on this device. Open ceremonies are
   derived from the hill each render — if a landmark vanishes its ballot goes
   with it, but the register keeps every decided name. The hill remembers. */

window.Naming = (function () {
  const $ = id => document.getElementById(id);
  const list = $('nm-list'), reg = $('nm-register');
  const lineIn = $('nm-line'), lineV = $('nm-line-v');
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function seed() {
    const now = Date.now(), d = 864e5;
    return {
      line: 4,
      names: { 'seed-1': 'Greg' },
      ceremonies: [
        { id: 'nm-greg', targetId: 'seed-1', targetLabel: 'Should the hill have a pond?', kind: 'pond',
          proposals: [{ id: 'nm-greg-p1', name: 'Greg', votes: 6, my: false, struck: false }],
          status: 'done', winner: 'Greg', decided: now - 10 * d },
        { id: 'nm-forge', targetId: 's6', targetLabel: 'The character forge', kind: 'contraption',
          proposals: [
            { id: 'nm-forge-p1', name: 'Beryl', votes: 3, my: false, struck: false },
            { id: 'nm-forge-p2', name: 'The Whirring', votes: 2, my: false, struck: false },
            { id: 'nm-forge-p3', name: 'Clunk', votes: 1, my: false, struck: false }
          ],
          status: 'open', winner: null, decided: null }
      ]
    };
  }
  const store = Lab.store('naming', seed);
  const S = () => store.get();
  let ready = false;                   // true once every gizmo's hill source is in
  const isMod = () => Lab.role === 'moderator' || Lab.role === 'owner';
  const isOwner = () => Lab.role === 'owner';

  // ── helpers ────────────────────────────────────────────────────────────
  // a landmark's label, cut down to fit on a card: the bit before the dash,
  // quotes off, trimmed to plate size
  function shortLabel(it) {
    let t = String(it.label || it.id).split(' — ')[0].replace(/^[“”"']+|[“”"']+$/g, '').trim();
    if (t.length > 38) t = t.slice(0, 37).replace(/\s+$/, '') + '…';
    return t || String(it.id);
  }
  function ago(ts) {
    const days = Math.floor((Date.now() - ts) / 864e5);
    if (days <= 0) return 'today';
    if (days === 1) return 'yesterday';
    if (days < 30) return days + ' days ago';
    return new Date(ts).toLocaleDateString();
  }
  const leadOf = c => {
    const alive = c.proposals.filter(p => !p.struck);
    return alive.length ? Math.max.apply(null, alive.map(p => p.votes)) : -1;
  };

  // ── keeping honest with the hill ───────────────────────────────────────
  // Runs on every render, in memory only (the next real write persists it):
  // open ceremonies whose landmark is gone are dropped, and every unnamed
  // landmark that lacks one gets a fresh empty ballot. All of it is
  // re-derivable, so nothing is lost if the page closes first.
  function sync() {
    const s = S(), items = Hill.items(), here = {};
    items.forEach(it => { here[it.id] = true; });
    // only drop a vanished landmark's ballot once every gizmo has had the
    // chance to register its hill source — a half-loaded page sees too few
    // landmarks and would wipe real votes
    if (ready) s.ceremonies = s.ceremonies.filter(c => c.status === 'done' || here[c.targetId]);
    items.forEach(it => {
      if (s.names[it.id]) return;
      const c = s.ceremonies.find(x => x.status === 'open' && x.targetId === it.id);
      if (c) { c.targetLabel = shortLabel(it); c.kind = it.kind || 'stone'; return; }
      s.ceremonies.push({ id: Lab.uid(), targetId: it.id, targetLabel: shortLabel(it),
        kind: it.kind || 'stone', proposals: [], status: 'open', winner: null, decided: null });
    });
  }

  // ── carrying: the moment that matters ──────────────────────────────────
  function carry(s, cer, prop) {
    cer.status = 'done';
    cer.winner = prop.name;
    cer.decided = Date.now();
    s.names[cer.targetId] = prop.name;
  }

  let bannerT = 0;
  function banner(name) {
    const el = $('nm-banner'), tx = $('nm-banner-text');
    tx.textContent = 'henceforth it shall be called “' + name + '”';
    el.hidden = false;
    el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop');
    clearTimeout(bannerT);
    bannerT = setTimeout(() => { el.hidden = true; }, 4200);
  }

  // ── actions ────────────────────────────────────────────────────────────
  function vote(cid, pid) {
    let carried = null;
    store.update(s => {
      const c = s.ceremonies.find(x => x.id === cid); if (!c || c.status !== 'open') return;
      const p = c.proposals.find(x => x.id === pid); if (!p || p.struck) return;
      if (p.my) { p.votes = Math.max(0, p.votes - 1); p.my = false; }        // tap again to take it back
      else {
        const q = c.proposals.find(x => x.my);
        if (q) { q.votes = Math.max(0, q.votes - 1); q.my = false; }          // the vote walks over
        p.votes++; p.my = true;
        if (p.votes >= s.line) { carry(s, c, p); carried = p.name; }
      }
    });
    if (carried) { banner(carried); Hill.redraw(); }
  }

  function propose(cid, name) {
    name = String(name).trim().replace(/\s+/g, ' ').slice(0, 24);
    if (!name) return;
    let carried = null;
    store.update(s => {
      const c = s.ceremonies.find(x => x.id === cid); if (!c || c.status !== 'open') return;
      const dup = c.proposals.find(p => p.name.toLowerCase() === name.toLowerCase());
      const q = c.proposals.find(x => x.my);
      if (dup) {                                        // already up: this is just a vote for it
        if (dup.struck || dup.my) return;
        if (q) { q.votes = Math.max(0, q.votes - 1); q.my = false; }
        dup.votes++; dup.my = true;
        if (dup.votes >= s.line) { carry(s, c, dup); carried = dup.name; }
      } else {                                          // putting it forward takes your vote with it
        if (q) { q.votes = Math.max(0, q.votes - 1); q.my = false; }
        c.proposals.push({ id: Lab.uid(), name, votes: 1, my: true, struck: false });
      }
    });
    if (carried) { banner(carried); Hill.redraw(); }
  }

  function strike(cid, pid) {
    if (!isMod()) return;
    store.update(s => {
      const c = s.ceremonies.find(x => x.id === cid); if (!c || c.status !== 'open') return;
      const p = c.proposals.find(x => x.id === pid);
      if (p) p.struck = true;                           // its votes stay. they are simply wasted.
    });
  }

  function christen(cid, pid) {
    if (!isOwner()) return;
    let carried = null;
    store.update(s => {
      const c = s.ceremonies.find(x => x.id === cid); if (!c || c.status !== 'open') return;
      const p = c.proposals.find(x => x.id === pid); if (!p || p.struck) return;
      carry(s, c, p); carried = p.name;
    });
    if (carried) { banner(carried); Hill.redraw(); }
  }

  // one to three stray votes turn up across the open ballots. may carry things.
  function stir() {
    if (!isOwner()) return;
    const carriedNames = [];
    store.update(s => {
      const n = 1 + Math.floor(Math.random() * 3);
      for (let k = 0; k < n; k++) {
        const opens = s.ceremonies.filter(c => c.status === 'open' && c.proposals.some(p => !p.struck));
        if (!opens.length) break;
        const c = opens[Math.floor(Math.random() * opens.length)];
        const ps = c.proposals.filter(p => !p.struck);
        const p = ps[Math.floor(Math.random() * ps.length)];
        p.votes++;
        if (p.votes >= s.line) { carry(s, c, p); carriedNames.push(p.name); }
      }
    });
    if (carriedNames.length) { banner(carriedNames[carriedNames.length - 1]); Hill.redraw(); }
  }

  // moving the line down can put a name past it: sweep on release
  function sweep() {
    const carried = [];
    store.update(s => {
      s.ceremonies.forEach(c => {
        if (c.status !== 'open') return;
        const best = c.proposals.filter(p => !p.struck && p.votes >= s.line)
          .sort((a, b) => b.votes - a.votes)[0];
        if (best) { carry(s, c, best); carried.push(best.name); }
      });
    });
    if (carried.length) { banner(carried[carried.length - 1]); Hill.redraw(); }
  }

  // ── rendering ──────────────────────────────────────────────────────────
  function propRow(c, p) {
    const open = c.status === 'open';
    let acts = '';
    if (isMod() && open && !p.struck) acts += '<button type="button" class="pb-act" data-act="strike">strike</button>';
    if (isOwner() && open && !p.struck) acts += '<button type="button" class="pb-act ok" data-act="christen">christen it</button>';
    return '<li class="nm-prop' + (p.struck ? ' struck' : '') + '" data-pid="' + p.id + '">' +
      '<button type="button" class="nm-vote' + (p.my ? ' mine' : '') + '" data-act="vote"' +
        (open && !p.struck ? '' : ' disabled') +
        ' title="' + (p.my ? 'your vote — tap to take it back' : 'move your vote here') + '">VOTE <b>' + p.votes + '</b></button>' +
      '<span class="nm-pname">' + esc(p.name) + '</span>' +
      (p.struck ? '<span class="nm-struckby">struck</span>' : '') +
      acts + '</li>';
  }

  function card(c) {
    const s = S(), lead = leadOf(c);
    const needTxt = lead < 0 ? 'the line is at ' + s.line
      : (s.line - lead > 0 ? (s.line - lead) + ' more to the line' : 'at the line');
    const props = c.proposals.slice().sort((a, b) => (a.struck - b.struck) || (b.votes - a.votes));
    return '<li class="nm-card" data-id="' + c.id + '">' +
      '<div class="nm-card-top"><span class="nm-kind">' + esc(c.kind) + '</span><span class="nm-need">' + needTxt + '</span></div>' +
      '<p class="nm-what">' + esc(c.targetLabel) + '</p>' +
      (props.length
        ? '<ul class="nm-props">' + props.map(p => propRow(c, p)).join('') + '</ul>'
        : '<p class="nm-none">no names yet. it just stands there, unaddressed.</p>') +
      '<form class="pb-ask nm-put" autocomplete="off"><input maxlength="24" placeholder="a name for it…" aria-label="propose a name"><button class="gz-btn gz-btn-sm" type="submit">put it forward</button></form>' +
      '</li>';
  }

  function render() {
    sync();
    const s = S();

    // half-typed names survive a re-render (the other gizmos cause them too)
    const keep = {};
    list.querySelectorAll('.nm-card').forEach(li => {
      const inp = li.querySelector('.nm-put input');
      if (inp && inp.value) keep[li.dataset.id] = inp.value;
    });

    const opens = s.ceremonies.filter(c => c.status === 'open').sort((a, b) => leadOf(b) - leadOf(a));
    const shown = opens.slice(0, 4), extra = opens.length - shown.length;
    list.innerHTML = opens.length
      ? shown.map(card).join('') + (extra > 0 ? '<li class="nm-more">+' + extra + ' more wait their turn</li>' : '')
      : '<li class="pb-empty">nothing awaits a name. the hill is fully addressed.</li>';

    Object.keys(keep).forEach(id => {
      const inp = list.querySelector('.nm-card[data-id="' + id + '"] .nm-put input');
      if (inp) inp.value = keep[id];
    });

    const done = s.ceremonies.filter(c => c.status === 'done').sort((a, b) => b.decided - a.decided);
    reg.innerHTML = done.map(c =>
      '<li><b>“' + esc(c.winner) + '”</b> — a ' + esc(c.kind) + ', named ' + ago(c.decided) + '</li>').join('')
      || '<li class="pb-empty">nothing named yet. everything is just “that thing over there”.</li>';

    lineIn.value = s.line; lineV.textContent = s.line + ' votes';
  }

  // ── the hill ───────────────────────────────────────────────────────────
  Hill.setNamer(id => S().names[id] || null);
  Hill.attach($('nm-hill'), $('nm-hill-cap'), 'hover a landmark — the named ones answer.');

  // ── wiring ─────────────────────────────────────────────────────────────
  list.addEventListener('click', e => {
    const li = e.target.closest('.nm-card'), row = e.target.closest('.nm-prop'), a = e.target.closest('[data-act]');
    if (!li || !row || !a) return;
    const cid = li.dataset.id, pid = row.dataset.pid, what = a.dataset.act;
    if (what === 'vote') vote(cid, pid);
    else if (what === 'strike') strike(cid, pid);
    else if (what === 'christen') christen(cid, pid);
  });
  list.addEventListener('submit', e => {
    const f = e.target.closest('.nm-put'); if (!f) return;
    e.preventDefault();
    const li = e.target.closest('.nm-card'); if (!li) return;
    const inp = f.querySelector('input');
    const name = inp.value;
    inp.value = '';                    // before propose: its re-render would resurrect the text
    propose(li.dataset.id, name);
  });
  lineIn.addEventListener('input', () => { store.update(s => { s.line = +lineIn.value; }); });
  lineIn.addEventListener('change', sweep);
  $('nm-stir').addEventListener('click', stir);

  store.on(render);
  document.addEventListener('lab:role', render);
  if (window.Petition && Petition.store) Petition.store.on(render);    // a petition passing is a new landmark
  if (window.Workshop && Workshop.store) Workshop.store.on(render);    // so is a shipping
  // first paint with whatever landmarks are in so far; the full board — and
  // the licence to drop vanished ballots — waits for window load, when every
  // later script (the capsule) has registered its hill source and its store
  render();
  const boot = () => {
    ready = true;
    if (window.Capsule && Capsule.store) Capsule.store.on(render);     // a fresh burial is a new landmark too
    render();
  };
  if (document.readyState === 'complete') boot();
  else window.addEventListener('load', boot);

  return { vote, propose, strike, christen, stir, store };
})();