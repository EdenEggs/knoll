/* ─── THE MUSEUM ───────────────────────────────────────────────────────────
   Each cycle the hill draws, signs and votes. When the owner closes the
   cycle, the top-voted drawing is preserved — framed, varnished, hung on
   the wall for good. Everything left unpreserved fades out and gets built
   over. Nobody remembers what it was. Roles:
     user       draw, sign, submit; one changeable vote per drawing
     moderator  + take a drawing down off its easel
     owner      + close the cycle, dust the museum
   State lives in Lab.store('museum') on this device. */

window.Museum = (function () {
  const $ = id => document.getElementById(id);
  const easels = $('mu-easels'), wallEl = $('mu-wall'), fallen = $('mu-fallen'), status = $('mu-status');
  const cycleEl = $('mu-cycle'), form = $('mu-form'), titleIn = $('mu-title'), signIn = $('mu-sign');
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const roman = n => { const m = [[1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']]; let s = ''; for (const [v, r] of m) while (n >= v) { s += r; n -= v; } return s; };

  // ── seed: two survivors already on the wall, three hopefuls on easels ──
  // the pictures are drawn here, on scrap canvas, in the pad's own inks
  function seed() {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const g = c.getContext('2d');
    const paper = () => { g.fillStyle = '#fff'; g.fillRect(0, 0, 128, 128); g.lineWidth = 5; g.lineCap = 'round'; g.lineJoin = 'round'; };
    const dot = (x, y) => { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 0.5); g.stroke(); };

    // "greg at dawn" — the pond, sun coming up behind him
    paper();
    g.strokeStyle = '#f59321';
    g.beginPath(); g.arc(92, 34, 13, 0, Math.PI * 2); g.stroke();
    g.beginPath(); g.moveTo(92, 13); g.lineTo(92, 5); g.moveTo(110, 22); g.lineTo(116, 16); g.moveTo(74, 22); g.lineTo(68, 16); g.stroke();
    g.strokeStyle = '#5871f5';
    g.beginPath(); g.ellipse(56, 90, 40, 17, 0, 0, Math.PI * 2); g.stroke();
    g.beginPath(); g.moveTo(36, 88); g.quadraticCurveTo(46, 80, 56, 88); g.quadraticCurveTo(66, 96, 76, 88); g.stroke();
    const gregAtDawn = c.toDataURL('image/png');

    // "portrait of the gnome" — mostly hat, which is accurate
    paper();
    g.strokeStyle = '#c93b82';
    g.beginPath(); g.moveTo(42, 50); g.lineTo(86, 50); g.lineTo(70, 10); g.closePath(); g.stroke();
    g.strokeStyle = '#26212a';
    g.beginPath(); g.arc(64, 66, 16, 0, Math.PI * 2); g.stroke();
    dot(58, 62); dot(70, 62);
    g.beginPath(); g.moveTo(50, 76); g.quadraticCurveTo(64, 112, 78, 76); g.stroke();
    const gnomePortrait = c.toDataURL('image/png');

    // "the hill on a tuesday" — the hill, and the flag it voted for
    paper();
    g.strokeStyle = '#2fae76';
    g.beginPath(); g.moveTo(4, 106); g.quadraticCurveTo(64, 42, 124, 106); g.stroke();
    g.strokeStyle = '#26212a';
    g.beginPath(); g.moveTo(64, 72); g.lineTo(64, 36); g.stroke();
    g.strokeStyle = '#c93b82';
    g.beginPath(); g.moveTo(64, 36); g.lineTo(88, 44); g.lineTo(64, 52); g.closePath(); g.stroke();
    const hillOnATuesday = c.toDataURL('image/png');

    // "the bin, dreaming" — the forge's bin, and whatever bins dream of
    paper();
    g.strokeStyle = '#26212a';
    g.beginPath(); g.moveTo(46, 60); g.lineTo(82, 60); g.lineTo(77, 110); g.lineTo(51, 110); g.closePath(); g.stroke();
    g.beginPath(); g.moveTo(40, 52); g.lineTo(88, 52); g.stroke();
    g.strokeStyle = '#f59321';
    [[34, 30], [64, 16], [94, 30]].forEach(([x, y]) => { g.beginPath(); g.moveTo(x - 5, y); g.lineTo(x + 5, y); g.moveTo(x, y - 5); g.lineTo(x, y + 5); g.stroke(); });
    const binDreaming = c.toDataURL('image/png');

    // "self-portrait" — a scribble with eyes. brave, honestly
    paper();
    g.strokeStyle = '#5871f5';
    g.beginPath();
    for (let t = 0; t <= 6.4; t += 0.14) { const r = 6 + t * 5.4, x = 64 + Math.cos(t * 2.1) * r, y = 68 + Math.sin(t * 2.1) * r * 0.8; t ? g.lineTo(x, y) : g.moveTo(x, y); }
    g.stroke();
    g.strokeStyle = '#26212a';
    dot(52, 58); dot(76, 58);
    const selfPortrait = c.toDataURL('image/png');

    const now = Date.now(), d = 864e5;
    return {
      cycle: 3, builtOver: 3,
      wall: [
        { id: 'mw1', title: 'greg at dawn', by: 'pam', cycle: 1, img: gregAtDawn, hung: now - 14 * d },
        { id: 'mw2', title: 'portrait of the gnome', by: 'susan', cycle: 2, img: gnomePortrait, hung: now - 7 * d }
      ],
      entries: [
        { id: 'me1', title: 'the hill on a tuesday', by: 'nigel', img: hillOnATuesday, votes: 4, my: false, created: now - 2 * d },
        { id: 'me2', title: 'the bin, dreaming', by: 'colin', img: binDreaming, votes: 2, my: false, created: now - d },
        { id: 'me3', title: 'self-portrait', by: 'anonymous', img: selfPortrait, votes: 1, my: false, created: now - 36e5 }
      ]
    };
  }
  const store = Lab.store('museum', seed);
  const S = () => store.get();
  const isMod = () => Lab.role === 'moderator' || Lab.role === 'owner';
  const isOwner = () => Lab.role === 'owner';

  let closingWin = null;    // the entry being varnished while the rest fade
  let closeTimer = 0;       // the varnish drying; a reset cancels it
  let justHung = null;      // the frame to swing on the next render

  // any reset (the dust button, or the page-wide "reset data") lands mid-close
  // cleanly: the pending hang is cancelled, not applied to the fresh museum
  const _reset = store.reset;
  store.reset = () => { clearTimeout(closeTimer); closeTimer = 0; closingWin = null; _reset(); };

  const pad = Pad.mount($('mu-pad-host'), { size: 128 });
  const say = t => { status.textContent = t; };

  // ── actions ────────────────────────────────────────────────────────────
  function vote(id) {
    if (closingWin) return;
    store.update(s => {
      const it = s.entries.find(e => e.id === id); if (!it) return;
      if (it.my) { it.votes = Math.max(0, it.votes - 1); it.my = false; }
      else { it.votes++; it.my = true; }
    });
  }

  function submit() {
    if (closingWin) return;
    if (pad.isEmpty()) {
      pad.el.classList.remove('mu-shake'); void pad.el.offsetWidth; pad.el.classList.add('mu-shake');
      say('blank paper. the easel refuses it.');
      return;
    }
    const title = titleIn.value.trim().replace(/\s+/g, ' ').slice(0, 40) || 'untitled';
    const by = signIn.value.trim().replace(/\s+/g, ' ').slice(0, 24) || 'anonymous';
    const img = pad.toDataURL();
    store.update(s => { s.entries.push({ id: Lab.uid(), title, by, img, votes: 0, my: false, created: Date.now() }); });
    pad.clear(); titleIn.value = '';
    say('“' + title + '” is on an easel. the votes decide the rest.');
  }

  function takeDown(id) {
    if (!isMod() || closingWin) return;
    let t = null;
    store.update(s => {
      const it = s.entries.find(e => e.id === id); if (!it) return;
      t = it.title;
      s.entries = s.entries.filter(e => e.id !== id);
    });
    if (t) say('“' + t + '” taken down. the wall pretends not to notice.');
  }

  function closeCycle() {
    if (!isOwner() || closingWin) return;
    const s = S();
    if (!s.entries.length) { say('nothing on the easels. the wall gathers dust.'); return; }
    // the top-voted drawing; a tie goes to whichever arrived first
    const win = [...s.entries].sort((a, b) => (b.votes - a.votes) || (a.created - b.created))[0];
    const fell = s.entries.length - 1;
    closingWin = win.id;
    render();                       // the chosen one glows; the rest start to fade
    say('cycle ' + roman(s.cycle) + ' closes. “' + win.title + '” gets the varnish.');
    closeTimer = setTimeout(() => {
      closeTimer = 0;
      closingWin = null;
      justHung = win.id;
      store.update(st => {
        const w = st.entries.find(e => e.id === win.id);
        if (w) st.wall.push({ id: w.id, title: w.title, by: w.by, cycle: st.cycle, img: w.img, hung: Date.now() });
        st.builtOver += Math.max(0, st.entries.length - 1);
        st.entries = [];
        st.cycle++;
      });
      say('“' + win.title + '” hangs for good. ' + (fell ? fell + (fell === 1 ? ' work' : ' works') + ' built over.' : 'nothing was built over. this time.'));
    }, 1250);
  }

  // ── rendering ──────────────────────────────────────────────────────────
  function card(it) {
    const cls = closingWin ? (it.id === closingWin ? ' mu-chosen' : ' mu-fading') : '';
    const mod = isMod() ? '<div class="pb-mod"><button type="button" class="pb-act" data-act="down">take it down</button></div>' : '';
    return '<li class="mu-easel' + cls + '" data-id="' + it.id + '">' +
      '<div class="mu-art" data-fx="mu:' + it.id + '"><img src="' + it.img + '" alt="' + esc(it.title) + '"></div>' +
      '<p class="mu-title">' + esc(it.title) + '</p>' +
      '<p class="mu-sig">signed ' + esc(it.by) + '</p>' +
      '<div class="mu-row"><button type="button" class="mu-vote' + (it.my ? ' mine' : '') + '" data-act="vote" title="one vote per drawing — tap again to take it back">' + (it.my ? '★' : '☆') + '<b>' + it.votes + '</b></button></div>' +
      mod + '</li>';
  }
  function frame(w) {
    const plaque = w.title + ' · ' + w.by + ' · c.' + roman(w.cycle);
    return '<figure class="mu-frame" data-id="' + w.id + '">' +
      '<div class="mu-glass" data-fx="mw:' + w.id + '"><img src="' + w.img + '" alt="' + esc(w.title) + '"></div>' +
      '<figcaption class="mu-plaque" title="' + esc(plaque) + '">' + esc(plaque) + '</figcaption>' +
      '</figure>';
  }
  function render() {
    const s = S();
    cycleEl.textContent = 'CYCLE ' + roman(s.cycle);
    easels.innerHTML = s.entries.map(card).join('') || '<li class="pb-empty">bare easels. draw the hill something.</li>';
    const works = [...s.wall].sort((a, b) => (a.hung || 0) - (b.hung || 0));      // newest last
    wallEl.innerHTML = works.map(frame).join('') || '<div class="pb-empty">a bare wall. nothing has survived a cycle yet.</div>';
    fallen.textContent = 'built over: ' + (s.builtOver ? s.builtOver + (s.builtOver === 1 ? ' work' : ' works') : 'nothing, yet');
    if (justHung) {
      const f = wallEl.querySelector('.mu-frame[data-id="' + justHung + '"]');
      if (f) { f.classList.add('mu-swing'); try { f.scrollIntoView({ block: 'nearest' }); } catch (e) {} }
      justHung = null;
    }
  }

  // ── wiring ─────────────────────────────────────────────────────────────
  form.addEventListener('submit', e => { e.preventDefault(); submit(); });
  easels.addEventListener('click', e => {
    const li = e.target.closest('.mu-easel'), a = e.target.closest('[data-act]');
    if (!li || !a) return;
    if (a.dataset.act === 'vote') vote(li.dataset.id);
    else if (a.dataset.act === 'down') takeDown(li.dataset.id);
  });
  $('mu-close').addEventListener('click', closeCycle);
  $('mu-dust').addEventListener('click', () => {
    if (!isOwner()) return;
    if (confirm('Dust the museum — every easel, the whole wall, the count of the built-over. Sure?')) {
      closingWin = null;
      store.reset();
      say('dusted. the museum smells of fresh varnish and nothing else.');
    }
  });
  store.on(render);
  document.addEventListener('lab:role', render);
  render();

  return { vote, submit, takeDown, closeCycle, store };
})();