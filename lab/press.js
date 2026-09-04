/* ─── THE KNOLL TIMES PRINTING PRESS ───────────────────────────────────────
   The lab's own history, printed the old way. Every other gizmo keeps a
   record of what happened to it; the law book already reads two of them and
   lists the lines. This reads ALL of them and writes a newspaper.

   HOW AN ISSUE IS DECIDED. Not by anybody pressing anything — by the
   calendar. Everything that has happened on the bench is stamped with a
   date, the events are grouped into the DAYS they fell on, and every day
   that had news is one issue. Newest day = the paper on the press; the rest
   go on the stand, newest first. That is why the press has no PRINT button:
   the news is not a thing you make, it is a thing that has already happened.

   WHAT GOES WHERE, inside an issue:
     the headline   the loudest event of that day, by RANK below
     the columns    the next two, each with its own standfirst
     the patch notes  everything else that day, one line each
   RANK is a judgment about what a hill cares about: who is mayor beats what
   got built, which beats what got framed, which beats what got named, which
   beats what got fixed. Argue with the order by editing RANK; nothing else
   knows it.

   IT READS, IT NEVER WRITES. Every neighbour is reached for defensively and
   every one of them is optional — a lab with the museum shelved still prints
   a paper, it just has less in it. The press's own state is one letter of
   wax. This file must load after the gizmos it reads.

   ISSUE No. 1 IS ALWAYS "THE PRESS IS RUNNING", dated the oldest thing on
   the bench, so the stand is never empty and the numbering has somewhere to
   start. */

window.Press = (function () {
  const $ = id => document.getElementById(id);
  const outEl = $('pr-out'), gridEl = $('pr-grid'), sealIn = $('pr-seal');
  if (!outEl || !window.Lab) return null;

  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const store = Lab.store('press', () => ({ seal: 'K' }));

  const MONTHS = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY',
    'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];
  const SHORT = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const longDate = ts => { const d = new Date(ts); return MONTHS[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear(); };
  const shortDate = ts => { const d = new Date(ts); return SHORT[d.getMonth()] + ' ' + d.getDate(); };
  const dayKey = ts => { const d = new Date(ts); return d.getFullYear() + '-' + d.getMonth() + '-' + d.getDate(); };
  const pad3 = n => String(n).padStart(3, '0');
  const roman = n => { const m = [[1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']]; let s = ''; for (const [v, r] of m) while (n >= v) { s += r; n -= v; } return s; };

  // reach a neighbour's books, or shrug
  const books = name => {
    const g = window[name];
    try { return (g && g.store && g.store.get()) || null; } catch (e) { return null; }
  };

  /* ── everything that has ever happened, as dated events ──────────────
     kind · when · rank · head (the headline if it leads) · line (the patch
     note if it does not) · std/body (the column, if it is a column) */
  const RANK = { mayor: 6, shipped: 5, carried: 4, framed: 3, named: 2, swatted: 1, repealed: 1, forged: 1 };

  function events() {
    const out = [];
    const add = e => { if (e && e.when) out.push(Object.assign({ rank: RANK[e.kind] || 1 }, e)); };

    const pet = books('Petition');
    if (pet) for (const it of pet.items || []) {
      if (it.status === 'passed' || it.status === 'drained') add({
        kind: 'carried', when: it.decided || it.created,
        head: 'THE HILL SAYS YES: ' + it.q.replace(/\?+$/, '').toUpperCase(),
        std: 'CARRIED ' + it.yes + '–' + it.no,
        body: 'The board put it to the hill and the hill answered. “' + it.q + '” carried ' +
              it.yes + ' to ' + it.no + ', which under the standing arrangement means it is no longer ' +
              'an opinion but a ' + (it.kind || 'stone') + ' — dug in, and written up as an Article.' +
              (it.name ? ' It is called ' + it.name + '.' : ''),
        line: 'carried ' + it.yes + '–' + it.no + ' — “' + it.q + '”'
      });
      if (it.status === 'drained') add({
        kind: 'repealed', when: it.drained || it.decided,
        head: 'REPEALED: ' + it.q.replace(/\?+$/, '').toUpperCase(),
        std: 'STRUCK THROUGH',
        body: 'The owner has drained it. The Article stays in the book with a line through it, ' +
              'which is the closest this hill gets to an apology.',
        line: 'repealed — “' + it.q + '”'
      });
    }

    const shed = books('Workshop');
    if (shed) for (const it of shed.items || []) {
      if (it.stage === 'shipped') add({
        kind: 'shipped', when: it.shipped,
        head: (it.title || 'SOMETHING').toUpperCase() + ' IS OUT OF THE SHED',
        std: 'SCREWED TO THE HILL',
        body: 'After an unrecorded amount of swearing, ' + it.title + ' left the workbench, was ' +
              'carried out of the shed by the gnome, and is now bolted to the hill where it will ' +
              'stay. A ✦ line has gone into the law book.',
        line: 'shipped — ' + it.title
      });
    }

    const el = books('Elections');
    if (el && el.mayor) add({
      kind: 'mayor', when: el.mayor.elected,
      head: (el.mayor.name || 'SOMEBODY').toUpperCase() + ' TAKES THE SASH',
      std: 'POWERS: NONE',
      body: 'The hill has a mayor again. ' + el.mayor.name + ' won the round' +
            (el.mayor.won ? ' ' + el.mayor.won : '') + ' on the promise “' + (el.mayor.slogan || '—') +
            '”, and will now wander the page in a small pink sash for thirty days. The office ' +
            'carries no powers and never has.',
      line: 'elected mayor — ' + el.mayor.name
    });

    const mu = books('Museum');
    if (mu) for (const w of mu.wall || []) add({
      kind: 'framed', when: w.hung,
      head: '“' + (w.title || 'UNTITLED').toUpperCase() + '” GETS THE VARNISH',
      std: 'CYCLE ' + roman(w.cycle || 1),
      body: 'Cycle ' + roman(w.cycle || 1) + ' closed and the hill picked one. “' + w.title + '”, by ' +
            (w.by || 'anonymous') + ', has been framed, varnished and hung on the wall, where it ' +
            'cannot be taken down. Everything else in that cycle was built over.',
      line: 'framed — “' + w.title + '” by ' + (w.by || 'anonymous')
    });

    const nm = books('Naming');
    if (nm) for (const c of nm.ceremonies || []) {
      if (c.status === 'done' && c.winner) add({
        kind: 'named', when: c.decided,
        head: 'IT SHALL BE CALLED ' + String(c.winner).toUpperCase(),
        std: 'THE NAMING CEREMONY',
        body: 'The ballot closed and the name stuck. What was until this morning merely “' +
              (c.targetLabel || 'a thing on the hill') + '” answers to ' + c.winner +
              ' from here on, on every hill on the bench, permanently.',
        line: 'named — ' + c.winner
      });
    }

    const bf = books('BugFarm');
    if (bf) for (const b of bf.bugs || []) {
      if (b.swatted) add({
        kind: 'swatted', when: b.swatted,
        head: 'SWATTED: ' + String(b.what || 'A BUG').toUpperCase(),
        std: 'ONE FEWER IN THE PEN',
        body: 'It was reported, it grew, and this morning it was swatted. It now hangs in the ' +
              'barn with the date on it, which is what a fix looks like around here.',
        line: 'fixed: ' + b.what
      });
    }

    return out.sort((a, b) => a.when - b.when);
  }

  /* ── events → issues, one per day that had news ──────────────────────── */
  function issues() {
    const evs = events();
    const days = new Map();
    for (const e of evs) {
      const k = dayKey(e.when);
      if (!days.has(k)) days.set(k, []);
      days.get(k).push(e);
    }
    const oldest = evs.length ? evs[0].when : Date.now();

    // No. 1 is always the founding, dated the day before anything else
    const list = [{
      when: oldest - 864e5, founding: true,
      lead: [{
        kind: 'press',
        head: 'THE PRESS IS RUNNING',
        std: 'VOL. I, NO. 1 — HELLO FROM THE HILL',
        body: 'Every update about this place will roll off this press from now on: one paper per ' +
              'day that anything happens, sealed in wax, archived on the stand for anyone who ' +
              'missed it.'
      }],
      cols: [
        { h: 'WHY A NEWSPAPER', p: 'Changelogs get buried. A paper you can unfold, stamp and stack ' +
          'felt more like us. The press reads the bench itself, so nobody has to remember to write it.' },
        { h: 'WHAT TO EXPECT', p: 'Big things get headlines; the small ones live in the patch notes ' +
          'at the bottom. Nothing is written by hand, which is either honest or lazy.' }
      ],
      notes: ['the press itself took two days to carve', 'wax seal is real wax (emotionally)',
              'subscribe by simply coming back']
    }];

    for (const [, es] of days) {
      es.sort((a, b) => (b.rank - a.rank) || (b.when - a.when));
      list.push({
        when: es[0].when,
        lead: es.slice(0, 1),
        cols: es.slice(1, 3).map(e => ({ h: e.std || e.kind.toUpperCase(), p: e.body })),
        notes: es.slice(3).map(e => e.line),
        all: es
      });
    }

    list.sort((a, b) => a.when - b.when);
    list.forEach((iss, i) => { iss.no = i + 1; });     // No. 1 is the oldest
    return list.reverse();                              // newest first, for the stand
  }

  /* ── one paper, folded ───────────────────────────────────────────────── */
  const TILTS = ['-2.2deg', '1.6deg', '2.4deg', '-1.4deg', '1.1deg', '-2deg'];

  function paperHtml(iss, i, hot) {
    const lead = iss.lead[0] || {};
    return '<button type="button" class="pr-paper" data-issue="' + iss.no + '"' +
        (hot ? '' : ' style="transform:rotate(' + TILTS[i % TILTS.length] + ')"') + '>' +
      (hot ? '<span class="pr-hot">HOT OFF THE PRESS</span>' : '<span class="pr-peg" aria-hidden="true"></span>') +
      '<p class="pr-paper-name">Knoll Times</p>' +
      '<div class="pr-rule"></div>' + (hot ? '<div class="pr-rule-thin"></div>' : '') +
      '<div class="pr-paper-meta"><span>NO. ' + pad3(iss.no) + '</span><span>' + shortDate(iss.when) + '</span></div>' +
      '<p class="pr-paper-head">' + esc(lead.head || 'A QUIET DAY') + '</p>' +
      '<div class="pr-paper-lines" aria-hidden="true"></div>' +
      '<span class="pr-wax" aria-hidden="true">' + esc(store.get().seal || 'K') + '</span>' +
    '</button>';
  }

  /* ── the paper, unfolded over the whole page ─────────────────────────── */
  let openEl = null;
  function open(no) {
    const iss = issues().find(v => v.no === no);
    if (!iss) return;
    shut();
    const lead = iss.lead[0] || {};
    const seal = esc(store.get().seal || 'K');
    const wrap = document.createElement('div');
    wrap.className = 'pr-read';
    wrap.innerHTML =
      '<div class="pr-issue" role="dialog" aria-modal="true" aria-label="Knoll Times number ' + iss.no + '">' +
        '<button type="button" class="pr-x" aria-label="fold it away">X</button>' +
        '<div class="pr-fold-top">' +
          '<div class="pr-masthead">' +
            '<div class="pr-vol">VOL. I<br>NO. ' + pad3(iss.no) + '</div>' +
            '<h2 class="pr-name">Knoll Times</h2>' +
            '<div class="pr-seal"><span>' + seal + '</span></div>' +
          '</div>' +
          '<div class="pr-rule-4"></div><div class="pr-rule-thin"></div>' +
          '<div class="pr-strap"><span>' + longDate(iss.when) + '</span>' +
            '<span>THE OFFICIAL DISPATCH OF THE HILL</span><span>PRICE: FREE</span></div>' +
          '<div class="pr-rule-thin"></div>' +
          '<h3 class="pr-headline">' + esc(lead.head || 'A QUIET DAY') + '</h3>' +
          '<p class="pr-kicker">' + esc(lead.std || '') + '</p>' +
          '<p class="pr-lead">' + esc(lead.body || 'Nothing much happened, and the press printed it anyway.') + '</p>' +
        '</div>' +
        '<div class="pr-fold-bottom">' +
          '<div class="pr-perf"></div>' +
          (iss.cols.length ? '<div class="pr-cols">' + iss.cols.map(c =>
            '<div class="pr-col"><h4>' + esc(c.h) + '</h4><p>' + esc(c.p) + '</p></div>').join('') + '</div>' : '') +
          (iss.notes.length ? '<div class="pr-notes"><span class="st-tab">PATCH NOTES</span><ul>' +
            iss.notes.map(n => '<li>' + esc(n) + '</li>').join('') + '</ul></div>' : '') +
          '<p class="pr-colophon">PRINTED BY HAND ON KNOLL PRESS NO.1 · ISSUE NO. ' + pad3(iss.no) + '</p>' +
        '</div>' +
      '</div>';
    document.body.appendChild(wrap);
    openEl = wrap;
    // the bottom half is folded up; it drops open a beat after it lands, so
    // you see it unfold rather than arriving already open
    const issue = wrap.querySelector('.pr-issue');
    setTimeout(() => issue.classList.add('open'), 120);
    wrap.addEventListener('click', e => { if (e.target === wrap || e.target.closest('.pr-x')) shut(); });
    document.addEventListener('keydown', key);
  }
  const key = e => { if (e.key === 'Escape') shut(); };
  function shut() {
    if (openEl) { openEl.remove(); openEl = null; }
    document.removeEventListener('keydown', key);
  }

  /* ── drawing the shop ────────────────────────────────────────────────── */
  function render() {
    const all = issues();
    const hot = all[0];
    outEl.innerHTML = hot
      ? paperHtml(hot, 0, true) + '<p>← the fresh issue. click any paper to unfold it.</p>'
      : '<p>the press is warm but there is no news. do something.</p>';
    gridEl.innerHTML = all.slice(1).map((iss, i) => paperHtml(iss, i, false)).join('')
      || '<p class="st-fine">the stand is empty. only one paper has ever been printed.</p>';
    if (sealIn && document.activeElement !== sealIn) sealIn.value = store.get().seal || 'K';
  }

  /* ── wiring ──────────────────────────────────────────────────────────── */
  const clicked = e => {
    const b = e.target.closest('[data-issue]');
    if (b) open(+b.dataset.issue);
  };
  outEl.addEventListener('click', clicked);
  gridEl.addEventListener('click', clicked);

  if (sealIn) sealIn.addEventListener('input', () => {
    const v = sealIn.value.trim().slice(0, 2) || 'K';
    store.update(s => { s.seal = v; });
  });
  const reprint = $('pr-reprint');
  if (reprint) reprint.addEventListener('click', () => { shut(); render(); });

  // the press follows every book it reads — pass a petition in one panel and
  // tomorrow's front page changes without anybody touching this one
  ['Petition', 'Workshop', 'Elections', 'Museum', 'Naming', 'BugFarm'].forEach(n => {
    const g = window[n];
    if (g && g.store && g.store.on) g.store.on(render);
  });
  store.on(render);
  document.addEventListener('lab:role', render);
  render();

  return { open, shut, render, issues, events, store };
})();
