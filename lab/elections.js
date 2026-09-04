/* ─── THE ELECTIONS ────────────────────────────────────────────────────────
   Once a month the hill elects a mayor gnome from whoever stands. The winner
   wanders the page in a tiny sash for their term — zero power, maximum lore.
   Most votes wins; ties go to whoever stood first; if nobody stands at the
   count, the incumbent stays on, grumbling. Roles:
     user       vote (one per device, movable), stand for mayor (once)
     moderator  + strike a candidate off the ballot, pardon them back on
     owner      + count early, dissolve the office, make the hill turn out
   State lives in Lab.store('elections') on this device. */

window.Elections = (function () {
  const $ = id => document.getElementById(id);
  const list = $('el-list'), when = $('el-when'), form = $('el-stand'),
        nameIn = $('el-name'), sloganIn = $('el-slogan'), standing = $('el-standing'),
        portrait = $('el-portrait'), plaque = $('el-plaque'),
        term = $('el-term'), termTxt = $('el-term-txt'), termFill = $('el-term-fill');

  const D = 864e5, TERM = 30 * D;
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const plural = (n, w) => n + ' ' + w + (n === 1 ? '' : 's');

  function seed() {
    const now = Date.now();
    return {
      round: 4,
      grumbles: 0,
      mayor: { name: 'Maud the Unhurried', slogan: 'no sudden moves', elected: now - 12 * D, ends: now + 18 * D, won: '5–2' },
      candidates: [
        { id: 'el-c1', name: 'Wilf', slogan: 'more ponds', votes: 2, my: false, struck: false, mine: false },
        { id: 'el-c2', name: 'Petra the Bold', slogan: 'bring back tuesdays', votes: 1, my: false, struck: false, mine: false }
      ]
    };
  }
  const store = Lab.store('elections', seed);
  const S = () => store.get();
  const isMod = () => Lab.role === 'moderator' || Lab.role === 'owner';
  const isOwner = () => Lab.role === 'owner';

  const totalOf = m => Math.max(1, Math.round((m.ends - m.elected) / D));
  const dayOf = m => clamp(Math.floor((Date.now() - m.elected) / D) + 1, 1, totalOf(m));

  // ── actions ────────────────────────────────────────────────────────────
  function vote(id) {
    store.update(s => {
      const c = s.candidates.find(x => x.id === id);
      if (!c || c.struck) return;
      if (c.my) { c.my = false; c.votes = Math.max(0, c.votes - 1); return; }   // tap again to take it back
      const prev = s.candidates.find(x => x.my);
      if (prev) { prev.my = false; prev.votes = Math.max(0, prev.votes - 1); }  // the one vote moves
      c.my = true; c.votes++;
    });
  }

  function stand(name, slogan) {
    name = String(name).trim().replace(/\s+/g, ' ').slice(0, 24);
    slogan = String(slogan).trim().replace(/\s+/g, ' ').slice(0, 48);
    if (!name) return;
    store.update(s => {
      if (s.candidates.some(c => c.mine)) return;                              // one candidacy per device
      s.candidates.push({ id: Lab.uid(), name, slogan, votes: 0, my: false, struck: false, mine: true });
    });
  }

  function act(id, what) {
    if (!isMod()) return;
    store.update(s => {
      const c = s.candidates.find(x => x.id === id); if (!c) return;
      if (what === 'strike') { c.struck = true; if (c.my) { c.my = false; c.votes = Math.max(0, c.votes - 1); } }
      else if (what === 'pardon') c.struck = false;
    });
  }

  // the count: highest votes wins, ties go to whoever stood first. nobody
  // standing → the incumbent stays on, grumbling, for another 30 days.
  function count() {
    store.update(s => {
      const now = Date.now();
      const live = s.candidates.map((c, i) => ({ c, i })).filter(x => !x.c.struck);
      if (live.length) {
        live.sort((a, b) => (b.c.votes - a.c.votes) || (a.i - b.i));
        const w = live[0].c, r = live[1] && live[1].c;
        s.mayor = { name: w.name, slogan: w.slogan, elected: now, ends: now + TERM, won: w.votes + '–' + (r ? r.votes : 0) };
        s.candidates = [];
        s.grumbles = 0;
        s.round++;
      } else if (s.mayor) {
        s.mayor.ends += TERM;
        s.grumbles++;
      }
      // no mayor and no candidates: the office stands empty. nothing counts.
    });
  }

  function dissolve() {
    store.update(s => { s.mayor = null; s.grumbles = 0; });
  }

  // the owner can make the hill turn out: 2–5 ballots land somewhere
  function stir() {
    store.update(s => {
      const live = s.candidates.filter(c => !c.struck);
      if (!live.length) return;
      const n = 2 + Math.floor(Math.random() * 4);
      for (let k = 0; k < n; k++) live[Math.floor(Math.random() * live.length)].votes++;
    });
  }

  // checked on load and once a minute; a long-abandoned office grumbles once
  // per missed term, which is what the (×N) on the plaque is counting
  function checkTerm() {
    for (let guard = 0; guard < 40; guard++) {
      const s = S();
      if (!s.mayor || Date.now() < s.mayor.ends) break;
      count();
    }
    tick();
  }

  // ── the portraits ──────────────────────────────────────────────────────
  function bustSVG(name) {
    const nm = String(name).toUpperCase();
    const squeeze = nm.length > 13 ? ' textLength="72" lengthAdjust="spacingAndGlyphs"' : '';
    return '<svg viewBox="0 0 140 118" role="img" aria-label="' + esc('Mayor ' + name + ', in the sash of office') + '">'
      + '<path d="M28 118 Q30 84 52 78 L88 78 Q110 84 112 118 Z" fill="#3d55c9" stroke="#2e2636" stroke-width="2.5" stroke-linejoin="round"/>'
      + '<circle cx="70" cy="52" r="19" fill="#f6cdb0" stroke="#2e2636" stroke-width="2.5"/>'
      + '<path d="M54 57 Q54 84 70 88 Q86 84 86 57 Z" fill="#fff" stroke="#2e2636" stroke-width="2" stroke-linejoin="round"/>'
      + '<circle cx="63.5" cy="50.5" r="2" fill="#26212a"/><circle cx="76.5" cy="50.5" r="2" fill="#26212a"/>'
      + '<path d="M58 44.5q4-3 8-1M74 43.5q4-2 8 1" fill="none" stroke="#26212a" stroke-width="2" stroke-linecap="round"/>'
      + '<circle cx="70" cy="58" r="4.5" fill="#eeb896" stroke="#2e2636" stroke-width="1.5"/>'
      + '<ellipse cx="70" cy="35" rx="24" ry="6" fill="#b02f3c" stroke="#2e2636" stroke-width="2"/>'
      + '<path d="M48 34 Q52 8 82 3 Q88 20 90 33 Z" fill="#d93b4a" stroke="#2e2636" stroke-width="2.5" stroke-linejoin="round"/>'
      + '<g transform="translate(70 98) rotate(13)">'
      + '<rect x="-41" y="-8.5" width="82" height="17" rx="8" fill="#ef4d98" stroke="#c93b82" stroke-width="1.5"/>'
      + '<text x="0" y="3.5" text-anchor="middle" font-family="Sora,sans-serif" font-weight="800" font-size="7.5" letter-spacing=".04em" fill="#fff"' + squeeze + '>' + esc(nm) + '</text>'
      + '</g></svg>';
  }

  function nailSVG() {
    return '<svg viewBox="0 0 140 118" role="img" aria-label="the sash of office, hung on a nail">'
      + '<line x1="34" y1="106" x2="106" y2="106" stroke="#e2d4df" stroke-width="2" stroke-linecap="round"/>'
      + '<circle cx="52" cy="46" r="1.2" fill="#e2d4df"/><circle cx="92" cy="60" r="1.4" fill="#e2d4df"/><circle cx="86" cy="34" r="1" fill="#e2d4df"/>'
      + '<g transform="rotate(-7 70 26)"><rect x="63.5" y="24" width="13" height="66" rx="6" fill="#ef4d98" stroke="#c93b82" stroke-width="1.5"/></g>'
      + '<g transform="rotate(9 70 26)"><rect x="63.5" y="24" width="13" height="54" rx="6" fill="#f9d3e6" stroke="#c93b82" stroke-width="1.5"/></g>'
      + '<circle cx="70" cy="23" r="3.4" fill="#b8abb7" stroke="#2e2636" stroke-width="1.6"/>'
      + '</svg>';
  }

  const MAYOR_SVG = '<svg viewBox="0 0 36 50" width="34" height="47" aria-hidden="true">'
    + '<ellipse cx="13.5" cy="46.5" rx="4.6" ry="2.6" fill="#4a3524"/>'
    + '<ellipse cx="22.5" cy="46.5" rx="4.6" ry="2.6" fill="#4a3524"/>'
    + '<rect x="10.5" y="26" width="15" height="19" rx="4" fill="#3d55c9" stroke="#2e2636" stroke-width="1.6"/>'
    + '<path d="M12.5 28.5 L23.5 41.5" stroke="#ef4d98" stroke-width="3.4" stroke-linecap="round"/>'
    + '<circle cx="18" cy="21" r="6.5" fill="#f6cdb0" stroke="#2e2636" stroke-width="1.6"/>'
    + '<path d="M13 23.5 L23 23.5 L18 34 Z" fill="#fff" stroke="#2e2636" stroke-width="1.2" stroke-linejoin="round"/>'
    + '<circle cx="15.7" cy="20.6" r="1" fill="#26212a"/><circle cx="20.3" cy="20.6" r="1" fill="#26212a"/>'
    + '<circle cx="18" cy="25" r="2" fill="#eeb896"/>'
    + '<path d="M11 16.5 L25 16.5 L19.5 1.5 Z" fill="#d93b4a" stroke="#2e2636" stroke-width="1.6" stroke-linejoin="round"/>'
    + '</svg>';

  // ── the wanderer: while a mayor holds office, they amble the bench ─────
  let wanderer = null;

  function tagText() {
    const m = S().mayor;
    return m ? 'Mayor ' + m.name + ' — day ' + dayOf(m) + ' of ' + totalOf(m) : '';
  }

  function killWanderer() {
    if (!wanderer) return;
    clearTimeout(wanderer.timer);
    cancelAnimationFrame(wanderer.raf);
    wanderer.el.remove();
    wanderer = null;
  }

  function spawnWanderer(key) {
    const el = document.createElement('div');
    el.className = 'el-mayor';
    el.innerHTML = '<span class="el-mayor-tag"></span><span class="el-mayor-flip">' + MAYOR_SVG + '</span>';
    Lab.world.appendChild(el);
    const tag = el.querySelector('.el-mayor-tag'), art = el.querySelector('svg');
    const w = wanderer = { el, key, x: 0, y: 0, raf: 0, timer: 0 };

    const room = () => {
      const bw = Lab.world.clientWidth, bh = Lab.world.clientHeight;
      return { x0: 24, x1: Math.max(60, bw - 64), y0: 90, y1: Math.max(140, bh - 90) };
    };
    const put = () => { el.style.transform = 'translate3d(' + Math.round(w.x) + 'px,' + Math.round(w.y) + 'px,0)'; };
    const rest = () => { w.timer = setTimeout(walk, 1600 + Math.random() * 4400); };

    function walk() {
      if (wanderer !== w) return;
      const r = room();
      const tx = clamp(w.x + (Math.random() * 2 - 1) * 360, r.x0, r.x1);
      const ty = clamp(w.y + (Math.random() * 2 - 1) * 260, r.y0, r.y1);
      const dist = Math.hypot(tx - w.x, ty - w.y);
      if (dist < 10) return rest();
      el.classList.toggle('flip', tx < w.x);
      el.classList.add('walking');
      const dur = dist / 16 * 1000, x0 = w.x, y0 = w.y, t0 = performance.now();  // ~16px/s: mayoral pace
      const step = now => {
        if (wanderer !== w) return;
        const k = Math.min(1, (now - t0) / dur);
        w.x = x0 + (tx - x0) * k; w.y = y0 + (ty - y0) * k; put();
        if (k < 1) w.raf = requestAnimationFrame(step);
        else { el.classList.remove('walking'); rest(); }
      };
      w.raf = requestAnimationFrame(step);
    }

    art.addEventListener('pointerenter', () => { tag.textContent = tagText(); tag.classList.add('show'); });
    art.addEventListener('pointerleave', () => tag.classList.remove('show'));

    const r0 = room();
    w.x = r0.x0 + Math.random() * (r0.x1 - r0.x0);
    w.y = r0.y0 + Math.random() * (r0.y1 - r0.y0);
    put(); rest();
  }

  function syncWanderer() {
    const m = S().mayor;
    if (!m) return killWanderer();
    const key = m.name + '|' + m.elected;
    if (wanderer && wanderer.key === key) return;
    killWanderer();
    spawnWanderer(key);
  }

  // the lawn gnome on the shared hill wears the sash while anyone holds office
  let hillKey = null;
  function syncHill() {
    const m = S().mayor;
    const key = m ? m.name + '|' + m.elected : '';
    if (key === hillKey) return;
    hillKey = key;
    Hill.setMayor(m ? { name: m.name } : null);
  }

  // ── rendering ──────────────────────────────────────────────────────────
  function renderOffice(s) {
    const m = s.mayor;
    if (m) {
      portrait.innerHTML = bustSVG(m.name);
      plaque.innerHTML = '<p class="el-mname">' + esc(m.name) + '</p>'
        + '<p class="el-mslogan">“' + esc(m.slogan || 'no promises') + '”</p>'
        + '<p class="el-mwon">carried ' + esc(m.won) + ' · round ' + s.round + '</p>'
        + (s.grumbles ? '<p class="el-mext">term extended — nobody stood (×' + s.grumbles + ')</p>' : '');
      term.hidden = false;
      const day = dayOf(m), total = totalOf(m);
      termTxt.textContent = 'day ' + day + ' of ' + total;
      termFill.style.width = Math.min(100, Math.round(day / total * 100)) + '%';
    } else {
      portrait.innerHTML = nailSVG();
      plaque.innerHTML = '<p class="el-vacant">the office stands empty.</p>'
        + '<p class="el-mslogan">the sash waits on its nail.</p>';
      term.hidden = true;
    }
  }

  function whenText(s) {
    const live = s.candidates.filter(c => !c.struck);
    const ballots = live.reduce((t, c) => t + c.votes, 0);
    if (s.mayor && live.length) {
      const left = Math.max(0, Math.ceil((s.mayor.ends - Date.now()) / D));
      return 'the box holds ' + plural(ballots, 'ballot') + ' · counted when the term ends, in ' + plural(left, 'day') + '.';
    }
    if (s.mayor) return 'nobody stands. if it stays that way, the incumbent stays too.';
    if (live.length) return 'no term to wait out — the ballots are counted when the owner says so.';
    return 'no mayor, no candidates. the hill governs itself, badly.';
  }

  function card(c, i) {
    let mod = '';
    if (isMod() && !c.struck) mod += '<button type="button" class="pb-act" data-act="strike">strike</button>';
    if (isMod() && c.struck) mod += '<button type="button" class="pb-act ok" data-act="pardon">pardon</button>';
    return '<li class="el-card' + (c.struck ? ' struck' : '') + '" data-id="' + c.id + '">'
      + '<div class="el-card-top"><span class="el-cnum">#' + (i + 1) + '</span>'
      + (c.mine ? '<span class="el-you">you</span>' : '')
      + (c.struck ? '<span class="el-cross">struck off</span>' : '') + '</div>'
      + '<p class="el-cname">' + esc(c.name) + '</p>'
      + '<p class="el-cslogan">' + (c.slogan ? '“' + esc(c.slogan) + '”' : '<i>made no promises</i>') + '</p>'
      + '<div class="el-crow"><button type="button" class="el-vote' + (c.my ? ' mine' : '') + '" data-vote'
      + (c.struck ? ' disabled' : '') + '>' + (c.my ? 'YOUR VOTE' : 'VOTE') + ' <b>' + c.votes + '</b></button></div>'
      + (mod ? '<div class="pb-mod">' + mod + '</div>' : '')
      + '</li>';
  }

  function renderRace(s) {
    list.innerHTML = s.candidates.map(card).join('')
      || '<li class="pb-empty">nobody stands. the ballot box gathers pollen.</li>';
    const mine = s.candidates.some(c => c.mine);
    form.hidden = mine;
    standing.hidden = !mine;
    when.textContent = whenText(s);
  }

  function render() {
    const s = S();
    renderOffice(s);
    renderRace(s);
    syncHill();
    syncWanderer();
  }

  // the day counter and the caption stay honest between elections
  function tick() {
    const s = S();
    renderOffice(s);
    when.textContent = whenText(s);
  }

  // ── wiring ─────────────────────────────────────────────────────────────
  list.addEventListener('click', e => {
    const li = e.target.closest('.el-card'); if (!li) return;
    if (e.target.closest('[data-vote]')) { vote(li.dataset.id); return; }
    const a = e.target.closest('[data-act]'); if (a) act(li.dataset.id, a.dataset.act);
  });
  form.addEventListener('submit', e => {
    e.preventDefault();
    stand(nameIn.value, sloganIn.value);
    nameIn.value = ''; sloganIn.value = '';
  });
  $('el-count').addEventListener('click', () => { if (isOwner()) count(); });
  $('el-stir').addEventListener('click', () => { if (isOwner()) stir(); });
  $('el-dissolve').addEventListener('click', () => {
    if (isOwner() && S().mayor && confirm('Dissolve the office? The sash goes back on its nail.')) dissolve();
  });
  store.on(render);
  document.addEventListener('lab:role', render);
  render();
  checkTerm();
  setInterval(checkTerm, 60000);

  return { vote, stand, count, dissolve, stir, store };
})();