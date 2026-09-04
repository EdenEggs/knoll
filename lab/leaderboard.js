/* ─── THE LEADERBOARD ──────────────────────────────────────────────────────
   There are no accounts on this bench (see ABOUT.txt — lab/ is a single
   device, nothing leaves it), so there is no real roll of residents to rank.
   This stands in for one: eighty names, generated once from a seeded RNG so
   the roll reads the same on every visit, each with a handful of stats that
   loosely track the things the OTHER gizmos already count — petitions,
   drawings, blocks, bugs, names put forward. Contributions is their sum plus
   a little unaccounted-for activity (voting, capsule deposits, and so on).

   RANGE (all time / month / week) does not swap in a second dataset — every
   resident also carries a fixed weekly and monthly FRACTION of their
   all-time numbers, seeded once same as everything else, and the range
   toggle just scales by that. So switching to WEEK can genuinely reorder the
   roll: someone quiet for months but active lately floats up, the way a real
   "this week" board would move. Tier badges are judged on the all-time total
   regardless of range — a badge is a standing earned over time, not
   something that should flicker when you change the window you're looking
   through. */

window.Leaderboard = (function () {
  const $ = id => document.getElementById(id);
  const gz = $('gz-leaderboard');
  if (!gz) return;

  const listEl = $('lb-list'), statusEl = $('lb-status');
  const searchEl = $('lb-search'), sortEl = $('lb-sort'), tierEl = $('lb-tier');
  const rangeBtns = [...gz.querySelectorAll('.lb-tabs [data-range]')];

  // mulberry32 — small, deterministic, good enough to shuffle stats around
  function mulberry32(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const rng = mulberry32(0xC0FFEE);

  const NAME_POOL = [
    'mossy', 'pixelpete', 'juno', 'opal', 'zip', 'vinny', 'fern', 'clover', 'bramble', 'lichen',
    'dewy', 'cobble', 'thistle', 'hazel', 'bracken', 'nettle', 'wren', 'sootpaw', 'pebble', 'marrow',
    'juniper', 'tansy', 'birch', 'flint', 'heather', 'moss', 'ember', 'yarrow', 'sedge', 'loam',
    'briar', 'acorn', 'cinder', 'holly', 'reed', 'fennel', 'gorse', 'sorrel', 'ivy', 'elder',
    'plum', 'sage', 'root', 'burl', 'moth', 'snail', 'beetle', 'toad', 'wisp', 'husk'
  ];
  const SUFFIXES = ['~', ' jr', ' the bold', ' the unhurried', '-42', '99', ' of the hill', ' esq'];
  const AVATAR_HUES = [340, 20, 45, 160, 205, 265, 300, 130];

  function makeName(i) {
    const base = NAME_POOL[i % NAME_POOL.length];
    return i < NAME_POOL.length ? base : base + SUFFIXES[Math.floor(rng() * SUFFIXES.length)];
  }

  function formatDuration(min) {
    if (min < 60) return min + 'm';
    const h = Math.floor(min / 60);
    if (h < 24) return h + 'h ' + (min % 60) + 'm';
    return Math.floor(h / 24) + 'd ' + (h % 24) + 'h';
  }

  function formatJoined(days) {
    if (days < 1) return 'joined today';
    if (days === 1) return 'joined yesterday';
    if (days < 30) return 'joined ' + days + ' days ago';
    const months = Math.round(days / 30);
    return 'joined ' + months + (months === 1 ? ' month ago' : ' months ago');
  }

  const RESIDENT_COUNT = 80;
  const residents = [];
  for (let i = 0; i < RESIDENT_COUNT; i++) {
    const petitions = Math.round(1 + Math.pow(rng(), 2) * 60);
    const drawings = Math.round(Math.pow(rng(), 2.4) * 30);
    const blocks = Math.round(Math.pow(rng(), 2.2) * 45);
    const bugs = Math.round(Math.pow(rng(), 2.6) * 35);
    const names = Math.round(Math.pow(rng(), 2.8) * 20);
    const other = Math.round(Math.pow(rng(), 2) * 25);
    const contributions = petitions + drawings + blocks + bugs + names + other;
    const timeAll = Math.round(25 + Math.pow(rng(), 1.7) * 2800);
    const joined = Math.round(2 + rng() * 210);
    const weeklyFrac = 0.015 + rng() * 0.05;
    const monthlyFrac = weeklyFrac + 0.04 + rng() * 0.14;
    residents.push({
      name: makeName(i), hue: AVATAR_HUES[i % AVATAR_HUES.length],
      petitions, drawings, blocks, bugs, names, contributions,
      timeAll, joined, weeklyFrac, monthlyFrac
    });
  }

  /* tier cutoffs are read off the roll itself rather than guessed as fixed
     numbers — contributions is a sum of six independently-rolled, skewed
     fields, so its realistic range isn't obvious by eye, and a hand-picked
     threshold either sits above everyone (a badge nobody can ever hold) or
     below everyone. Percentiles of the actual generated population always
     carve five non-empty bands, however the underlying formula changes. */
  const byContrib = residents.map(r => r.contributions).sort((a, b) => a - b);
  const percentile = p => byContrib[Math.min(byContrib.length - 1, Math.floor(byContrib.length * p))];
  const TIERS = [
    ['Founding Gnome', percentile(0.95)],
    ['Pillar of the Hill', percentile(0.80)],
    ['Regular', percentile(0.50)],
    ['Familiar Face', percentile(0.20)]
  ];
  function badgeFor(contributions) {
    for (const [name, cutoff] of TIERS) if (contributions >= cutoff) return name;
    return 'Newcomer';
  }

  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const METRIC_LABEL = {
    contributions: 'contributions', time: 'time on the hill', petitions: 'petitions',
    drawings: 'drawings submitted', blocks: 'blocks laid', bugs: 'bugs reported', names: 'names proposed'
  };

  function scaledStats(r, range) {
    const frac = range === 'week' ? r.weeklyFrac : range === 'month' ? r.monthlyFrac : 1;
    const s = v => range === 'all' ? v : Math.round(v * frac);
    return {
      contributions: s(r.contributions), time: s(r.timeAll), petitions: s(r.petitions),
      drawings: s(r.drawings), blocks: s(r.blocks), bugs: s(r.bugs), names: s(r.names)
    };
  }

  let range = 'all';

  function render() {
    const q = searchEl.value.trim().toLowerCase();
    const sortBy = sortEl.value;
    const tier = tierEl.value;

    let rows = residents.map(r => ({ r, m: scaledStats(r, range) }));
    if (q) rows = rows.filter(x => x.r.name.toLowerCase().includes(q));
    if (tier) rows = rows.filter(x => badgeFor(x.r.contributions) === tier);

    if (sortBy === 'joined') rows.sort((a, b) => a.r.joined - b.r.joined);
    else rows.sort((a, b) => b.m[sortBy] - a.m[sortBy]);

    const matched = rows.length;
    rows = rows.slice(0, 50);

    statusEl.textContent = (q || tier ? matched + ' match' + (matched === 1 ? '' : 'es') : RESIDENT_COUNT + ' on the hill') +
      (rows.length ? ' · showing top ' + rows.length + ' by ' + (sortBy === 'joined' ? 'newest' : METRIC_LABEL[sortBy]) : '');

    if (!rows.length) {
      listEl.innerHTML = '<li class="lb-empty">nobody on the hill matches that.</li>';
      return;
    }

    listEl.innerHTML = rows.map((x, i) => {
      const r = x.r, m = x.m, badge = badgeFor(r.contributions);
      const primary = sortBy === 'joined' ? formatJoined(r.joined) : sortBy === 'time' ? formatDuration(m.time) : m[sortBy];
      const primaryLabel = sortBy === 'joined' ? 'joined' : METRIC_LABEL[sortBy];
      const secondaryKey = sortBy === 'contributions' ? 'time' : 'contributions';
      const secondaryVal = secondaryKey === 'time' ? formatDuration(m.time) : m.contributions;
      return '<li class="lb-row">' +
        '<span class="lb-rank">' + (i + 1) + '</span>' +
        '<span class="lb-avatar" style="background:hsl(' + r.hue + ',55%,52%)">' + esc(r.name[0].toUpperCase()) + '</span>' +
        '<div class="lb-who">' +
        '<span class="lb-name">' + esc(r.name) + '<span class="lb-badge">' + badge + '</span></span>' +
        '<span class="lb-sub">' + m.petitions + ' petitions · ' + m.drawings + ' drawings · ' + m.blocks +
        ' blocks · ' + m.bugs + ' bugs · ' + m.names + ' names</span>' +
        '</div>' +
        '<div class="lb-stats">' +
        '<span class="lb-stat"><b>' + primary + '</b><span>' + primaryLabel + '</span></span>' +
        '<span class="lb-stat"><b>' + secondaryVal + '</b><span>' + METRIC_LABEL[secondaryKey] + '</span></span>' +
        '</div>' +
        '</li>';
    }).join('');
  }

  searchEl.addEventListener('input', render);
  sortEl.addEventListener('change', render);
  tierEl.addEventListener('change', render);
  rangeBtns.forEach(btn => btn.addEventListener('click', () => {
    rangeBtns.forEach(b => b.classList.remove('on'));
    btn.classList.add('on');
    range = btn.dataset.range;
    render();
  }));

  render();
  return { render };
})();
