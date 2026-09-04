/* ─── THE BUG FARM ─────────────────────────────────────────────────────────
   Report a bug and it does not go on a list — it hatches. Every reported bug
   is a live thing pacing about the pen, and its SIZE is how many people have
   hit it. One me-too and it is a speck; ten and it is a winged terror.

   IT IS A PLACE. A red barn behind a fenced field, a silo counting the
   backlog, and a WANTED poster on the gate you fill in to report one. That
   is what everybody sees — a visitor meets a farm, not a form. Staff get the
   same field plus a ledger and the tools, below it.

   THE ANIMALS ARE DOM, NOT A CANVAS. They were painted before, which was
   fine while a bug was a blob; now it has to sprout six legs, then spikes,
   then a third eye, then wings as it mutates, and CSS grows limbs far more
   cheaply than a bitmap redraw does. It also means a bug can be tabbed to
   and a screen reader can read it, which a painted one never could.

   MUTATION LADDER (me-toos):  2 a nymph · 4 spiky · 7 three-eyed · 10 winged
   terror. The tiers ARE the size: nothing changes shape without the field
   showing it.

   EVIDENCE. Up to three screenshots per bug, downscaled here and kept as
   data-urls in this device's localStorage — nothing is uploaded. That is a
   real cost: see the note on QUOTA in loadFiles below.

   Roles:
     user       reports, says me-too, watches them grow
     moderator  + can't reproduce — the bug rolls onto its back and stops
                  growing until somebody believes it again
     owner      + swat it (that is what a fix is), shake the pen, empty it

   State lives in Lab.store('bugfarm') on this device. The field names are
   the ones the old tank used — what/where/by/votes/my/born/swatted/dead — so
   a farm saved before this rebuild still opens; coat, marking and evidence
   are new and are filled in from the bug's own id when they are missing. */

window.BugFarm = (function () {
  const $ = id => document.getElementById(id);
  const scene = $('bf-scene');
  if (!scene || !window.Lab) return {};

  const penEl = $('bf-pen'), listEl = $('bf-list'), swatEl = $('bf-swatted'),
        statsEl = $('bf-stats'), sayEl = $('bf-say'), openEl = $('bf-open'),
        gaugeEl = $('bf-gauge'), insideEl = $('bf-inside'), doorsEl = $('bf-doors'),
        swatTagEl = $('bf-swat-count'), insideHEl = $('bf-inside-h'),
        posterEl = $('bf-poster'), mugEl = $('bf-mug'), dropEl = $('bf-drop'),
        dropInEl = $('bf-drop-in'), filesEl = $('bf-files'),
        whatIn = $('bf-what'), whoIn = $('bf-who'),
        coatsEl = $('bf-coats'), marksEl = $('bf-marks'), wheresEl = $('bf-wheres');

  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const hash = s => { let h = 2166136261; for (let i = 0; i < String(s).length; i++) { h ^= String(s).charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0); };

  /* ── the farm's vocabulary ───────────────────────────────────────────── */
  // where it was found. These are the lab's own rooms, not generic buckets —
  // a bug report that cannot say "the forge" is not much of a bug report.
  const AREAS = [
    { k: 'hill', n: 'the hill' }, { k: 'forge', n: 'the forge' },
    { k: 'drawing', n: 'drawing' }, { k: 'voting', n: 'voting' },
    { k: 'shed', n: 'the shed' }, { k: 'sound', n: 'sound' },
    { k: 'else', n: 'somewhere else' }
  ];
  const areaOf = k => AREAS.find(a => a.k === k) || AREAS[AREAS.length - 1];

  // five coats. The default is picked off the bug's own id, so a farm from
  // before the poster had a colour picker still comes up in five colours
  // rather than five identical greens.
  const COATS = ['#7bc264', '#5fae4e', '#e8484a', '#7fa8c9', '#b8ac97'];
  const MARKS = ['spots', 'stripes', 'bare'];

  /* The ladder. A tier is a size AND a set of limbs — they cannot disagree,
     because both are read from this one table. */
  const TIERS = [
    { at: 10, n: 'WINGED TERROR' }, { at: 7, n: 'THREE-EYED' },
    { at: 4, n: 'SPIKY' }, { at: 2, n: 'A NYMPH' }, { at: 0, n: 'A SPECK' }
  ];
  const tierOf = v => (TIERS.find(t => v >= t.at) || TIERS[TIERS.length - 1]).n;
  const nextAt = v => v >= 10 ? null : v < 2 ? 2 : v < 4 ? 4 : v < 7 ? 7 : 10;
  const GROW = 9;                                   // px of bug per me-too
  const sizeOf = v => Math.min(30 + v * GROW, 200);

  const MON = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  const fmt = ts => { const d = new Date(ts); return d.getDate() + ' ' + MON[d.getMonth()]; };

  /* ── the farm starts with a few already in it ────────────────────────── */
  function seed() {
    const now = Date.now(), d = 864e5;
    return {
      bugs: [
        { id: 'bf1', what: 'the gnome walks straight through the pond', where: 'hill', by: 'pam', votes: 11, my: false, born: now - 9 * d },
        { id: 'bf2', what: 'vote counts twice if you are quick about it', where: 'voting', by: 'nigel', votes: 6, my: false, born: now - 6 * d },
        { id: 'bf3', what: 'forge eats pngs with soft edges, returns confetti', where: 'forge', by: 'colin', votes: 3, my: false, born: now - 4 * d },
        { id: 'bf4', what: 'my drawing came back mirrored', where: 'drawing', by: 'anonymous', votes: 2, my: false, born: now - 2 * d, dead: true },
        { id: 'bf5', what: 'the mayor is wearing the sash backwards', where: 'else', by: 'susan', votes: 1, my: false, born: now - 36e5 },
        { id: 'bf0', what: 'tarps rustle with no wind', where: 'shed', by: 'the gnome', votes: 4, my: false, born: now - 20 * d, swatted: now - 3 * d }
      ]
    };
  }

  const store = Lab.store('bugfarm', seed);
  const S = () => store.get();
  const isMod = () => Lab.role === 'moderator' || Lab.role === 'owner';
  const isOwner = () => Lab.role === 'owner';
  const live = () => S().bugs.filter(b => !b.swatted);
  const gone = () => S().bugs.filter(b => b.swatted).sort((a, b) => b.swatted - a.swatted);
  const say = t => { sayEl.textContent = t || ''; };

  // anything the old tank never stored is derived from the id, once, and it
  // is the same answer every time
  const coatOf = b => b.hue || COATS[hash(b.id) % COATS.length];
  const markOf = b => b.marking || MARKS[(hash(b.id) >> 8) % MARKS.length];

  /* Where in the field a bug stands. Derived from its id so it does not
     wander to a different spot on every render — but kept in memory rather
     than in the store, since it is a fact about the drawing, not the bug. */
  const spots = {};
  function spot(b) {
    let p = spots[b.id];
    if (!p) {
      const h = hash(b.id);
      p = spots[b.id] = {
        x: 22 + (h % 1000) / 1000 * 62,               // % across the field
        y: 34 + ((h >> 10) % 1000) / 1000 * 150,      // px up from the bottom
        dur: (5 + ((h >> 4) % 60) / 10).toFixed(1),
        delay: (-((h >> 7) % 80) / 10).toFixed(1)
      };
    }
    return p;
  }

  /* ── the report you are filling in ───────────────────────────────────── */
  const form = { where: 'else', hue: COATS[0], marking: 'spots', imgs: [] };

  /* ── drawing one creature ────────────────────────────────────────────── */
  function creature(hue, mark, votes, size) {
    const spiky = votes >= 4, eyed = votes >= 7, winged = votes >= 10;
    const leg = (side, n) => '<i class="bf-leg bf-leg-' + side + ' bf-leg-' + n + '"></i>';
    return '<span class="bf-cre" style="--s:' + size + 'px;--hue:' + hue + '">' +
      (winged ? '<i class="bf-wing bf-wing-l"></i><i class="bf-wing bf-wing-r"></i>' : '') +
      leg('l', 1) + leg('l', 2) + leg('l', 3) + leg('r', 1) + leg('r', 2) + leg('r', 3) +
      '<span class="bf-cre-body bf-mark-' + mark + '"><i></i><i></i></span>' +
      (spiky ? '<i class="bf-spike"></i><i class="bf-spike"></i><i class="bf-spike"></i>' : '') +
      '<span class="bf-head">' +
        '<i class="bf-ant bf-ant-l"></i><i class="bf-ant bf-ant-r"></i>' +
        '<i class="bf-eye bf-eye-l"></i><i class="bf-eye bf-eye-r"></i>' +
        (eyed ? '<i class="bf-eye bf-eye-3"></i>' : '') +
      '</span>' +
    '</span>';
  }

  /* ── the bubble that opens when you tap one ──────────────────────────── */
  let picked = null;

  function bubble(b) {
    const p = spot(b), size = sizeOf(b.votes), n = nextAt(b.votes);
    // a bubble on a bug at the edge of the field would hang off it, so it
    // shoves itself back in and its tail moves to stay pointing at the bug
    const shift = p.x < 22 ? '-12%' : p.x > 72 ? '-88%' : '-50%';
    const tail = p.x < 22 ? '10%' : p.x > 72 ? '86%' : 'calc(50% - 9px)';
    const ev = (b.imgs || []).map((src, i) =>
      '<img src="' + src + '" alt="evidence ' + (i + 1) + '" data-ev="' + i + '" title="view the evidence">').join('');
    const mod = isMod() ? '<button type="button" class="bf-bub-act" data-act="cant">' +
      (b.dead ? 'BELIEVE IT' : 'CAN’T REPRO') + '</button>' : '';
    const own = isOwner() ? '<button type="button" class="bf-bub-act" data-act="swat">SWAT IT</button>' : '';
    return '<div class="bf-bubble" data-nodrag style="bottom:' + (size + 16) + 'px;left:50%;' +
        'transform:translateX(' + shift + ');--tail:' + tail + '">' +
      '<div class="bf-bub-top"><b>' + esc(b.what) + '</b>' +
        '<button type="button" class="bf-bub-x" data-act="shut" aria-label="close">✕</button></div>' +
      '<p class="bf-bub-meta">' + esc(areaOf(b.where).n) + ' · ' + esc(b.by) + ' · ' + fmt(b.born) + '</p>' +
      '<div class="bf-bub-tier"><b>' + (b.dead ? 'ON ITS BACK' : tierOf(b.votes)) + '</b>' +
        '<span>' + (b.dead ? 'not growing' : n ? 'MUTATES AT ' + n : 'FULLY MUTATED') + '</span></div>' +
      (ev ? '<div class="bf-ev">' + ev + '</div>' : '') +
      '<div class="bf-bub-row">' +
        '<button type="button" class="bf-metoo' + (b.my ? ' mine' : '') + '" data-act="metoo">' +
          'ME TOO · ' + b.votes + '</button>' + mod + own +
      '</div>' +
    '</div>';
  }

  /* ── the field ───────────────────────────────────────────────────────── */
  const hatching = {};     // id → true while the egg is still wobbling
  const dying = {};        // id → true while it is rolling over

  /* THE FIELD IS UPDATED, NOT REBUILT. Blowing the pen away and writing it
     out again on every change is simpler, and it throws away the two best
     things in the design: a bug SWELLING when it gets a me-too (a CSS
     transition, which needs the same element to still be there) and the pop
     it does when it first appears (which would otherwise replay on every
     bug every time anybody clicked anything). So each animal keeps its own
     element for as long as it is in the field.

     `shape` is what the drawing depends on — its size, its coat, its tier —
     so the limbs are only re-cut when one of those actually moved. A me-too
     that does not cross a mutation line is a width change and nothing else,
     which is exactly what it should look like. */
  const pens = new Map();          // id -> {el, shape, ...}

  function shapeOf(b) {
    return [sizeOf(b.votes), coatOf(b), markOf(b), b.votes >= 4, b.votes >= 7, b.votes >= 10].join('|');
  }

  function drawPen() {
    const here = live();
    const want = new Set(here.map(b => b.id));

    // anything swatted, emptied or otherwise gone leaves the field
    for (const [id, rec] of pens) {
      if (!want.has(id)) { rec.el.remove(); pens.delete(id); }
    }

    for (const b of here) {
      const p = spot(b), size = sizeOf(b.votes), sel = picked === b.id;
      let rec = pens.get(b.id);

      if (!rec) {
        const el = document.createElement('div');
        el.dataset.bug = b.id;
        el.innerHTML = '<div class="bf-pace"></div>';
        penEl.appendChild(el);
        rec = { el, pace: el.firstChild, shape: null, egg: null, sel: null };
        pens.set(b.id, rec);
      }

      rec.el.className = 'bf-bug' + (sel ? ' picked' : '') + (b.dead ? ' out' : '') +
        (hatching[b.id] ? ' hatching' : '') + (dying[b.id] ? ' dying' : '');
      rec.el.style.left = p.x + '%';
      rec.el.style.bottom = p.y + 'px';
      rec.pace.style.setProperty('--dur', p.dur + 's');
      rec.pace.style.setProperty('--delay', p.delay + 's');

      // the animal itself, only re-cut when its shape really changed
      const egg = !!hatching[b.id];
      const shape = shapeOf(b);
      if (rec.egg !== egg || (!egg && rec.shape !== shape)) {
        const hit = rec.pace.querySelector('.bf-cre-hit, .bf-egg');
        const html = egg
          ? '<span class="bf-egg"><i></i><i></i></span>'
          : '<button type="button" class="bf-cre-hit" data-bug="' + b.id + '" ' +
              'title="' + esc(b.what) + ' \u2014 tap it" style="background:none;border:0;padding:0;cursor:pointer">' +
              creature(coatOf(b), markOf(b), b.votes, size) + '</button>';
        if (hit) hit.outerHTML = html; else rec.pace.insertAdjacentHTML('afterbegin', html);
        rec.egg = egg; rec.shape = shape;
      } else if (!egg) {
        // same animal, new size: let the transition carry it
        const cre = rec.pace.querySelector('.bf-cre');
        if (cre) cre.style.setProperty('--s', size + 'px');
      }

      // the bubble
      const old = rec.pace.querySelector('.bf-bubble');
      const wantBubble = sel && !dying[b.id];
      if (!wantBubble) { if (old) old.remove(); }
      else { const html = bubble(b); if (old) old.outerHTML = html; else rec.pace.insertAdjacentHTML('beforeend', html); }
    }
  }

  /* ── the barn, the silo and the numbers ──────────────────────────────── */
  function drawBarn() {
    const g = gone();
    swatTagEl.textContent = '03 THE SWATTED · ' + g.length;
    insideHEl.textContent = 'THE SWATTED · ' + g.length;
    swatEl.innerHTML = g.length ? g.map(b =>
      '<li><span class="bf-corpse"><i style="background:' + coatOf(b) + '"></i>' +
        '<u></u><u></u><u></u><u></u></span>' +
        '<p>' + esc(b.what) + '</p><em>FIXED ' + fmt(b.swatted) + '</em></li>').join('')
      : '<li class="bf-none">NOTHING SWATTED YET. GET FIXING.</li>';
  }

  function drawCounts() {
    const l = live(), open = l.length;
    openEl.textContent = String(open).padStart(3, '0');
    gaugeEl.style.height = Math.min(6 + open * 11, 100) + '%';
    const metoos = l.reduce((a, b) => a + b.votes, 0);
    statsEl.innerHTML = '<span>' + open + ' BUGS IN THE PEN</span><span>·</span>' +
      '<span>' + metoos + ' ME-TOOS BETWEEN THEM</span><span>·</span>' +
      '<span>' + gone().length + ' SWATTED</span>';
  }

  /* ── the ledger, for whoever is working on it ────────────────────────── */
  function drawList() {
    const l = live().slice().sort((a, b) => b.votes - a.votes);
    listEl.innerHTML = l.map(b =>
      '<li class="' + (b.dead ? 'out' : '') + '" data-bug="' + b.id + '">' +
        '<i class="bf-dot" style="background:' + coatOf(b) + '"></i>' +
        '<div class="bf-l-meta"><p>' + esc(b.what) + '</p>' +
          '<span>' + esc(areaOf(b.where).n) + ' · ' + esc(b.by) + ' · ' + fmt(b.born) +
          ' · ' + (b.dead ? 'on its back' : tierOf(b.votes).toLowerCase()) + ' · ' + b.votes + ' me-too' +
          (b.votes === 1 ? '' : 's') + '</span></div>' +
        '<button type="button" class="bf-chip" data-act="find">FIND IT</button>' +
        (isMod() ? '<button type="button" class="bf-chip" data-act="cant">' +
          (b.dead ? 'BELIEVE IT' : 'CAN’T REPRO') + '</button>' : '') +
        (isOwner() ? '<button type="button" class="bf-chip" data-act="swat">SWAT</button>' : '') +
      '</li>').join('') || '<li class="bf-none" style="color:var(--st-ink);opacity:.5">nothing in the pen. suspiciously nothing.</li>';
  }

  /* ── the poster ──────────────────────────────────────────────────────── */
  function drawPoster() {
    mugEl.innerHTML = creature(form.hue, form.marking, 0, 72);
    coatsEl.innerHTML = COATS.map(h =>
      '<button type="button" class="bf-sw' + (form.hue === h ? ' on' : '') + '" data-coat="' + h + '" ' +
      'style="background:' + h + '" aria-label="coat ' + h + '"></button>').join('');
    marksEl.innerHTML = MARKS.map(m =>
      '<button type="button" class="bf-chip' + (form.marking === m ? ' on' : '') + '" data-mark="' + m + '">' +
      m.toUpperCase() + '</button>').join('');
    wheresEl.innerHTML = AREAS.map(a =>
      '<button type="button" class="bf-chip' + (form.where === a.k ? ' on' : '') + '" data-where="' + a.k + '">' +
      a.n.replace(/^the /, '').toUpperCase() + '</button>').join('');
    dropInEl.innerHTML = form.imgs.length
      ? '<div class="bf-thumbs">' + form.imgs.map((src, i) =>
          '<span class="bf-thumb"><img src="' + src + '" alt="evidence ' + (i + 1) + '">' +
          '<button type="button" data-drop-ev="' + i + '" aria-label="take it off">✕</button></span>').join('') +
        '</div><div style="font-size:11px;opacity:.6;text-align:center">' +
        (form.imgs.length < 3 ? 'tap to add more · up to 3' : 'evidence locked in') + '</div>'
      : '<div class="bf-drop-q">?</div><div class="bf-drop-cap">pin the evidence<br>' +
        '<span>screenshots of the crime<br>click or drop · up to 3</span></div>';
  }

  function render() {
    drawPen(); drawBarn(); drawCounts(); drawList(); drawPoster();
  }

  /* ── what anybody can do ─────────────────────────────────────────────── */
  function meToo(id) {
    store.update(s => {
      const b = s.bugs.find(x => x.id === id);
      if (!b || b.swatted || b.dead) return;
      if (b.my) { b.my = false; b.votes = Math.max(0, b.votes - 1); }
      else { b.my = true; b.votes++; }
    });
    const b = S().bugs.find(x => x.id === id);
    if (b) say(b.my ? 'noted — it just got bigger.' : 'taken back. it shrank a little.');
  }

  function report() {
    const what = whatIn.value.trim();
    if (!what) {
      whatIn.classList.add('bad'); whatIn.focus();
      say('what went wrong, though?');
      setTimeout(() => whatIn.classList.remove('bad'), 900);
      return;
    }
    const b = {
      id: Lab.uid(), what, where: form.where, by: whoIn.value.trim() || 'anonymous',
      votes: 1, my: true, born: Date.now(),
      hue: form.hue, marking: form.marking, imgs: form.imgs.slice()
    };
    hatching[b.id] = true;
    store.update(s => { s.bugs.push(b); });
    whatIn.value = ''; form.imgs = [];
    say('pinned. it is hatching in the pen…');
    drawPoster();
    // the egg wobbles for a moment, then there is a bug where it was
    setTimeout(() => { delete hatching[b.id]; drawPen(); say('hatched. it is a speck for now.'); }, 1500);
  }

  function cant(id) {
    if (!isMod()) return;
    let now = false;
    store.update(s => { const b = s.bugs.find(x => x.id === id); if (b) { b.dead = !b.dead; now = b.dead; } });
    say(now ? 'rolled over. it stops growing until somebody believes it.' : 'back on its feet.');
  }

  function swat(id) {
    if (!isOwner()) return;
    dying[id] = true; picked = null;
    drawPen();
    // it rolls over and drops out of the field before it turns up in the barn
    setTimeout(() => {
      delete dying[id];
      store.update(s => { const b = s.bugs.find(x => x.id === id); if (b) { b.swatted = Date.now(); b.dead = false; } });
      openBarn(true);
      say('swatted. that is what a fix is.');
    }, 950);
  }

  function openBarn(on) {
    insideEl.hidden = !on;
    doorsEl.hidden = !!on;
  }

  /* ── the evidence ────────────────────────────────────────────────────── */
  /* QUOTA. Every screenshot ends up as a data-url inside this device's
     localStorage, which is a handful of megabytes for the whole lab. So a
     picture is boxed down to 420px and written out as a middling jpeg — and
     if the result is still fat it is squeezed again rather than quietly
     filling the drawer. Three per bug, and no more. */
  const EV_MAX = 3, EV_W = 420, EV_CAP = 150 * 1024;
  function loadFiles(files) {
    Array.from(files || []).forEach(f => {
      if (!/^image\//.test(f.type)) return;
      if (form.imgs.length >= EV_MAX) { say('three pieces of evidence is plenty.'); return; }
      const r = new FileReader();
      r.onload = () => {
        const img = new Image();
        img.onload = () => {
          const sc = Math.min(1, EV_W / img.width);
          const c = document.createElement('canvas');
          c.width = Math.max(1, Math.round(img.width * sc));
          c.height = Math.max(1, Math.round(img.height * sc));
          c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
          let url = c.toDataURL('image/jpeg', 0.62);
          if (url.length > EV_CAP) url = c.toDataURL('image/jpeg', 0.4);
          if (form.imgs.length < EV_MAX) { form.imgs.push(url); drawPoster(); }
        };
        img.onerror = () => say('that one would not open.');
        img.src = r.result;
      };
      r.readAsDataURL(f);
    });
  }

  /* ── the poster is draggable ─────────────────────────────────────────── */
  /* It is a notice board nailed to a gate, so it should be movable — but the
     bench is a zoomable, panned surface, so the drag reads the pointer
     through Lab.toWorld and moves the poster in the SCENE'S own pixels. The
     spot survives a reload. */
  const POS_KEY = 'knoll-lab:bugfarm-poster';
  let pos = { x: 8, y: 40 };
  try { const v = JSON.parse(localStorage.getItem(POS_KEY)); if (v && isFinite(v.x)) pos = v; } catch (e) {}
  const place = () => { posterEl.style.left = pos.x + 'px'; posterEl.style.bottom = pos.y + 'px'; };
  place();

  function dragPoster(e) {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    const at = ev => (window.Lab && Lab.toWorld) ? Lab.toWorld(ev.clientX, ev.clientY) : { x: ev.clientX, y: ev.clientY };
    const p0 = at(e), x0 = pos.x, y0 = pos.y;
    const box = scene.getBoundingClientRect();
    const w = scene.offsetWidth, h = scene.offsetHeight;
    posterEl.classList.add('lifted');
    const move = ev => {
      const p = at(ev);
      pos = {
        x: clamp(x0 + (p.x - p0.x), -60, w - 80),
        y: clamp(y0 - (p.y - p0.y), -16, h - 120)
      };
      place();
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      posterEl.classList.remove('lifted');
      try { localStorage.setItem(POS_KEY, JSON.stringify(pos)); } catch (err) {}
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    e.preventDefault(); e.stopPropagation();
  }
  $('bf-pin').addEventListener('pointerdown', dragPoster);
  $('bf-grab').addEventListener('pointerdown', dragPoster);

  /* ── the evidence, blown up ──────────────────────────────────────────── */
  function lightbox(src) {
    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'bf-lightbox';
    el.setAttribute('aria-label', 'close the evidence');
    el.innerHTML = '<div><img src="' + src + '" alt="evidence"><p>EVIDENCE · TAP ANYWHERE TO CLOSE</p></div>';
    const shut = () => { el.remove(); document.removeEventListener('keydown', key); };
    const key = ev => { if (ev.key === 'Escape') shut(); };
    el.addEventListener('click', shut);
    document.addEventListener('keydown', key);
    document.body.appendChild(el);
  }

  /* ── wiring ──────────────────────────────────────────────────────────── */
  penEl.addEventListener('click', e => {
    const hit = e.target.closest('[data-bug]');
    const act = e.target.closest('[data-act]');
    const ev = e.target.closest('[data-ev]');
    if (ev) { e.stopPropagation(); lightbox(ev.getAttribute('src')); return; }
    if (!hit) return;
    const id = hit.dataset.bug;
    e.stopPropagation();
    if (act) {
      const a = act.dataset.act;
      if (a === 'shut') { picked = null; drawPen(); return; }
      if (a === 'metoo') { meToo(id); return; }
      if (a === 'cant') { cant(id); return; }
      if (a === 'swat') { swat(id); return; }
      return;
    }
    picked = picked === id ? null : id;
    drawPen();
  });
  // a click on the bare field puts the bubble away
  scene.addEventListener('click', () => { if (picked) { picked = null; drawPen(); } });

  listEl.addEventListener('click', e => {
    const li = e.target.closest('[data-bug]'), a = e.target.closest('[data-act]');
    if (!li || !a) return;
    const id = li.dataset.bug;
    if (a.dataset.act === 'find') { picked = id; drawPen(); scene.scrollIntoView({ block: 'nearest' }); return; }
    if (a.dataset.act === 'cant') cant(id);
    if (a.dataset.act === 'swat') swat(id);
  });

  doorsEl.addEventListener('click', () => openBarn(true));
  $('bf-swat-tag').addEventListener('click', () => openBarn(insideEl.hidden));
  $('bf-close-doors').addEventListener('click', () => openBarn(false));

  $('bf-loose').addEventListener('click', report);
  whatIn.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); report(); } });

  coatsEl.addEventListener('click', e => {
    const b = e.target.closest('[data-coat]'); if (!b) return;
    form.hue = b.dataset.coat; drawPoster();
  });
  marksEl.addEventListener('click', e => {
    const b = e.target.closest('[data-mark]'); if (!b) return;
    form.marking = b.dataset.mark; drawPoster();
  });
  wheresEl.addEventListener('click', e => {
    const b = e.target.closest('[data-where]'); if (!b) return;
    form.where = b.dataset.where; drawPoster();
  });

  dropEl.addEventListener('click', e => {
    const x = e.target.closest('[data-drop-ev]');
    if (x) { e.stopPropagation(); form.imgs.splice(+x.dataset.dropEv, 1); drawPoster(); return; }
    filesEl.click();
  });
  dropEl.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); filesEl.click(); } });
  filesEl.addEventListener('change', e => { loadFiles(e.target.files); e.target.value = ''; });
  ['dragenter', 'dragover'].forEach(k => dropEl.addEventListener(k, e => { e.preventDefault(); dropEl.classList.add('over'); }));
  ['dragleave', 'drop'].forEach(k => dropEl.addEventListener(k, e => { e.preventDefault(); dropEl.classList.remove('over'); }));
  dropEl.addEventListener('drop', e => { if (e.dataTransfer) loadFiles(e.dataTransfer.files); });

  $('bf-shake').addEventListener('click', () => {
    if (!isOwner()) return;
    // every animal gets a new pace and a new spot. `spots` is where a bug
    // stands; `pens` is the element standing there — only the first moves.
    live().forEach(b => {
      const p = spot(b);
      p.x = 22 + Math.random() * 62;
      p.y = 34 + Math.random() * 150;
      p.dur = (2 + Math.random() * 2).toFixed(1);
      p.delay = '0s';
    });
    picked = null;
    drawPen();
    say('everything in there is now extremely awake.');
  });
  $('bf-empty').addEventListener('click', () => {
    if (!isOwner()) return;
    if (!confirm('Empty the pen — every bug in it, reported and swatted. Sure?')) return;
    store.update(s => { s.bugs = []; });
    Object.keys(spots).forEach(k => delete spots[k]);
    picked = null;
    say('empty. suspiciously empty.');
  });

  store.on(render);
  document.addEventListener('lab:role', render);
  render();

  return { report, meToo, swat, cant, store, AREAS, COATS, TIERS, render };
})();
