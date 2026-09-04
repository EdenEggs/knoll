/* ─── THE LAW BOOK ─────────────────────────────────────────────────────────
   Every petition that carries is written into a slightly absurd constitution;
   facing it, a changelog — everything that ever happened to the hill, newest
   first. The book writes itself: it watches the petition board and the
   workshop shed and has no opinions, only records. Roles:
     user       reads
     moderator  keeps the margins tidy (a calling, not a button)
     owner      applies the wax seal
   Own state is just the wax: Lab.store('lawbook') = { sealed }. Everything
   else is read live from Petition.store and Workshop.store — this file must
   load after petition.js and workshop.js. */

window.Lawbook = (function () {
  const $ = id => document.getElementById(id);
  const artEl = $('lb-articles'), logEl = $('lb-log'), sealFoot = $('lb-sealed'), sealBtn = $('lb-seal');

  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const roman = n => { const m = [[1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']]; let s = ''; for (const [v, r] of m) while (n >= v) { s += r; n -= v; } return s; };
  const when = t => new Date(t).toLocaleDateString();

  // what each kind of thing demands of posterity
  const CLAUSES = {
    pond: 'Let it be damp in perpetuity.',
    tree: 'Let it cast a fair and reasonable shade.',
    flag: 'Let it flap as it sees fit.',
    bench: 'Let it bear the weight of anyone at all.',
    sign: 'Let it be read aloud once, then quietly.',
    stone: 'Let it sit exactly there, forever.'
  };

  // the wax is the only thing the book owns. seeded already stamped — an
  // unsealed constitution makes people nervous
  const store = Lab.store('lawbook', () => ({ sealed: Date.now() - 2 * 864e5 }));

  // read the neighbours, defensively — the book records, it does not fork
  const petitions = () => (window.Petition && window.Petition.store) ? (window.Petition.store.get().items || []) : [];
  const contraptions = () => (window.Workshop && window.Workshop.store) ? (window.Workshop.store.get().items || []) : [];

  // ── the left page: the articles ────────────────────────────────────────
  function article(it, i) {
    const clause = CLAUSES[it.kind] || CLAUSES.stone;
    const named = it.name ? ' The pond is called ' + esc(it.name) + '.' : '';
    const rep = it.status === 'drained';
    return '<p class="lb-art' + (rep ? ' lb-repealed' : '') + '">' +
      '<span class="lb-arttext"><b>Article ' + roman(i + 1) + '.</b> ' + esc(it.q) +
      ' <span class="lb-carried">Carried ' + it.yes + '–' + it.no + '.</span>' +
      ' <i class="lb-clause">' + clause + named + '</i></span>' +
      (rep ? ' <b class="lb-rep">Repealed.</b>' : '') + '</p>';
  }

  // ── the right page: the changelog ──────────────────────────────────────
  function entries() {
    const out = [];
    for (const it of petitions()) {
      if (it.status === 'passed' || it.status === 'drained')
        out.push({ t: it.decided || it.created || 0, cls: 'carried', sym: '§', html: 'carried ' + it.yes + '–' + it.no + ' — “' + esc(it.q) + '”' });
      if (it.status === 'drained')
        out.push({ t: it.drained || it.decided || 0, cls: 'repealed', sym: '✕', html: 'repealed — “' + esc(it.q) + '”' });
    }
    for (const it of contraptions())
      if (it.stage === 'shipped')
        out.push({ t: it.shipped || 0, cls: 'shipped', sym: '✦', html: 'shipped — <b>' + esc(it.title) + '</b>, screwed to the hill' });
    return out.sort((a, b) => b.t - a.t);
  }
  const row = e => '<li class="lb-log lb-log-' + e.cls + '"><i>' + e.sym + '</i><span>' + e.html + '</span><span class="lb-when">' + when(e.t) + '</span></li>';

  // ── the wax ────────────────────────────────────────────────────────────
  function renderSeal() {
    const s = store.get();
    if (!s.sealed) { sealFoot.innerHTML = ''; return; }
    const fresh = Date.now() - s.sealed < 600;   // just stamped: squish
    sealFoot.innerHTML =
      '<span class="lb-blob' + (fresh ? ' lb-squish' : '') + '" aria-hidden="true"><b>K</b></span>' +
      '<span class="lb-sealed-cap">sealed by the owner, ' + when(s.sealed) + '</span>';
  }
  function seal() { if (Lab.role !== 'owner') return; store.set({ sealed: Date.now() }); }

  // ── rendering ──────────────────────────────────────────────────────────
  function render() {
    const arts = petitions()
      .filter(it => it.status === 'passed' || it.status === 'drained')
      .sort((a, b) => (a.decided || a.created || 0) - (b.decided || b.created || 0));
    artEl.innerHTML = arts.map(article).join('')
      || '<p class="pb-empty">a blank page. the hill is, legally speaking, lawless.</p>';

    logEl.innerHTML = entries().map(row).join('')
      || '<li class="pb-empty">nothing has ever happened.</li>';

    renderSeal();
  }

  // ── wiring ─────────────────────────────────────────────────────────────
  sealBtn.addEventListener('click', seal);
  store.on(render);
  if (window.Petition && window.Petition.store) window.Petition.store.on(render);
  if (window.Workshop && window.Workshop.store) window.Workshop.store.on(render);
  document.addEventListener('lab:role', render);
  render();

  return { seal, render, store };
})();