/* ─── THE TERMINAL ─────────────────────────────────────────────────────────
   A big beige monitor on the bench with a board running on it that everybody
   looking at the page can type into, and a row of sticky notes stuck down the
   side of the case that only a moderator or the site owner may write on.

   "EVERYBODY ON THE PAGE" IS NOT A FIGURE OF SPEECH HERE
     There is no server behind this bench and none is pretended anywhere else
     in the lab, so a chat board is the one gizmo that would have to fake it.
     This one does not. Two windows of the page open on this machine are two
     people, and they really do talk to each other:

       storage        the board itself. localStorage fires a 'storage' event
                      in every OTHER window the moment one of them writes, so
                      a line typed here is re-read and re-drawn there. That is
                      the whole sync, and it is real.
       BroadcastChannel  who is on. Each window shouts a short hello every few
                      seconds and answers anybody else's; a window that has not
                      been heard from in fifteen seconds drops off the list,
                      and one that is closed properly says so on the way out.

     Open the lab in a second window and watch the list grow. What it will NOT
     do is reach another machine — that needs a server, and saying so is more
     use than a fake one.

   A WINDOW IS A PERSON, A DEVICE IS NOT
     Everything else on this bench keeps its identity in Lab.store, which is
     per DEVICE — right for a drawing, wrong here, because two windows would
     be the same person talking to themselves. So the handle lives in
     sessionStorage, which is per WINDOW: a second window is somebody else, and
     a reload is still you. The name is yours to change and the badge on the
     case shows which role you are wearing while you say it.

   THE STICKIES DOWN THE SIDE
     Three notes taped to the case, the way they are on every monitor that has
     ever been in an office. They are the board's standing text — the rules, a
     notice, whatever the place needs saying — so a visitor may READ them and
     nothing else. A moderator may write on them and change a note's colour;
     the owner may also add and take them away. They are the same four pads the
     dock's text tool writes on, so the bench only has one idea of what a
     sticky note looks like.

   Saved in Lab.store('crt') on this device: the lines, the notes, the switch.
   Roles:
     user       reads the notes, types on the board, deletes their own lines
     moderator  writes the notes, deletes anybody's line
     owner      adds and removes notes, locks the board, clears it */

window.CRT = (function () {
  const $ = id => document.getElementById(id);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g,
    c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const MAX = 120;                      // lines kept before the oldest scrolls off
  const LEN = 140;                      // how much may be said at once
  const NOTE_LEN = 90;                  // and how much fits on a sticky
  const NOTES_MAX = 5;
  const PADS = ['a', 'b', 'c', 'd'];    // --sticky-a…d, the dock's own four
  const BEAT = 4000, GONE = 15000;      // how often a window says hello, and when it is given up on

  const store = Lab.store('crt', () => ({
    open: true,
    lines: [],
    notes: [
      { id: 'n1', c: 'a', t: 'be decent. this is somebody’s knoll.' },
      { id: 'n2', c: 'c', t: 'the board is wiped every so often. nothing here is kept.' },
      { id: 'n3', c: 'b', t: 'moderators write these notes. everyone else reads them.' }
    ]
  }));
  const S = () => store.get();
  const isMod = () => Lab.role === 'moderator' || Lab.role === 'owner';
  const isOwner = () => Lab.role === 'owner';

  /* ── who you are, in THIS window ───────────────────────────────────────── */
  const HANDLES = ['mossy', 'brambly', 'copper', 'quiet', 'tufted', 'lantern', 'burrow',
                   'thistle', 'kettle', 'amber', 'birch', 'foggy'];
  const NOUNS = ['gnome', 'toadstool', 'hat', 'beard', 'spade', 'lamp', 'crow', 'bell'];

  const ss = {
    get: k => { try { return sessionStorage.getItem('knoll-lab:crt:' + k); } catch (e) { return null; } },
    set: (k, v) => { try { sessionStorage.setItem('knoll-lab:crt:' + k, v); } catch (e) {} }
  };
  const roll = a => a[Math.floor(Math.random() * a.length)];

  let me = ss.get('me');
  if (!me) { me = Lab.uid(); ss.set('me', me); }
  let myName = ss.get('name');
  if (!myName) { myName = roll(HANDLES) + ' ' + roll(NOUNS); ss.set('name', myName); }

  /* ── the dom ───────────────────────────────────────────────────────────── */
  const logEl = $('crt-log'), sayEl = $('crt-say'), typeEl = $('crt-type'), sendEl = $('crt-send');
  const nameEl = $('crt-name'), whoEl = $('crt-who'), countEl = $('crt-count'), ledEl = $('crt-led');
  const stickEl = $('crt-stickies'), addEl = $('crt-add'), openChk = $('crt-open'), clearEl = $('crt-clear');
  const statusEl = $('crt-status'), onlineEl = $('crt-online');
  if (!logEl) return null;              // the gizmo is not in the page

  const say = (m, k) => { statusEl.textContent = m || '';
    statusEl.className = 'crt-status' + (k ? ' crt-' + k : ''); };

  const clock = ms => {
    const d = new Date(ms);
    return ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2);
  };

  /* ── the board ─────────────────────────────────────────────────────────── */
  function post(text) {
    const t = String(text || '').replace(/\s+/g, ' ').trim().slice(0, LEN);
    if (!t) return;
    if (!S().open && !isMod()) { say('the owner has the board locked.', 'warn'); return; }
    store.update(st => {
      st.lines.push({ id: Lab.uid(), by: me, n: myName, r: Lab.role, t, at: Date.now() });
      if (st.lines.length > MAX) st.lines.splice(0, st.lines.length - MAX);
    });
    say('');
    tell({ k: 'said' });                // nudge the other windows to re-read at once
  }

  const mine = l => l.by === me;

  function scrub(id) {
    const l = S().lines.find(x => x.id === id);
    if (!l || !(mine(l) || isMod())) return;
    store.update(st => { st.lines = st.lines.filter(x => x.id !== id); });
    tell({ k: 'said' });
  }

  /* A board that is at the bottom should STAY at the bottom when a line lands,
     and stay where it is if you have scrolled up to read something. So where
     it is reading from is measured before the redraw and put back after. */
  function drawLog() {
    const s = S();
    const near = logEl.scrollHeight - logEl.scrollTop - logEl.clientHeight < 40;
    logEl.innerHTML = s.lines.length
      ? s.lines.map(l =>
          '<li class="crt-line' + (mine(l) ? ' crt-me' : '') + (l.r && l.r !== 'user' ? ' crt-staff' : '') + '">' +
            '<time>' + clock(l.at) + '</time>' +
            '<b>' + esc(l.n) + (l.r && l.r !== 'user' ? '<i>' + (l.r === 'owner' ? 'owner' : 'mod') + '</i>' : '') + '</b>' +
            '<span>' + esc(l.t) + '</span>' +
            ((mine(l) || isMod()) ? '<button type="button" class="crt-x" data-x="' + esc(l.id) +
              '" title="take it back" aria-label="take it back">×</button>' : '') +
          '</li>').join('')
      : '<li class="crt-empty">nothing said yet. the cursor is blinking at you.</li>';
    if (near) logEl.scrollTop = logEl.scrollHeight;
    countEl.textContent = s.lines.length ? s.lines.length + (s.lines.length === 1 ? ' line' : ' lines') : 'quiet';
  }

  /* ── the stickies down the side ────────────────────────────────────────── */
  function drawNotes() {
    const s = S(), can = isMod();
    stickEl.innerHTML = s.notes.map((n, i) =>
      '<li class="crt-note" style="--pad:var(--sticky-' + (PADS.indexOf(n.c) < 0 ? 'a' : n.c) + ');' +
        '--tilt:' + (i % 2 ? 1.6 : -2.1) + 'deg">' +
        '<textarea class="crt-note-t" data-note="' + esc(n.id) + '" maxlength="' + NOTE_LEN + '"' +
          (can ? '' : ' readonly') + ' aria-label="a note on the case"' +
          ' rows="3">' + esc(n.t) + '</textarea>' +
        (can ? '<button type="button" class="crt-note-c" data-hue="' + esc(n.id) +
          '" title="another colour" aria-label="another colour"></button>' : '') +
        (isOwner() ? '<button type="button" class="crt-note-x" data-drop="' + esc(n.id) +
          '" title="take it off" aria-label="take it off">×</button>' : '') +
      '</li>').join('');
    if (addEl) addEl.disabled = s.notes.length >= NOTES_MAX;
  }

  /* A note is written where it sits and told to the store on the way OUT of
     the box: a store write is a trip to localStorage, a redraw of every note,
     and a shout at every other window — not a thing to do per keystroke, and
     a redraw mid-sentence would take the caret with it.

     'focusout', not 'blur': blur does not bubble, and delegating it from the
     list means catching it on an ancestor. focusout is the one that bubbles,
     so it is the one that can be delegated. */
  stickEl.addEventListener('input', e => {
    const t = e.target.closest('[data-note]');
    if (t && isMod()) t.dataset.dirty = '1';
  });

  stickEl.addEventListener('focusout', e => {
    const t = e.target.closest && e.target.closest('[data-note]');
    if (!t || !t.dataset.dirty || !isMod()) return;
    delete t.dataset.dirty;
    const id = t.dataset.note, v = t.value.slice(0, NOTE_LEN);
    store.update(st => { const n = st.notes.find(x => x.id === id); if (n) n.t = v; });
    tell({ k: 'said' });
    say('note saved.', 'good');
  });

  stickEl.addEventListener('click', e => {
    const h = e.target.closest('[data-hue]');
    if (h && isMod()) {
      store.update(st => {
        const n = st.notes.find(x => x.id === h.dataset.hue);
        if (n) n.c = PADS[(PADS.indexOf(n.c) + 1) % PADS.length];
      });
      tell({ k: 'said' });
      return;
    }
    const d = e.target.closest('[data-drop]');
    if (d && isOwner()) {
      store.update(st => { st.notes = st.notes.filter(x => x.id !== d.dataset.drop); });
      tell({ k: 'said' });
    }
  });

  if (addEl) addEl.addEventListener('click', () => {
    if (!isOwner() || S().notes.length >= NOTES_MAX) return;
    store.update(st => {
      st.notes.push({ id: Lab.uid(), c: PADS[st.notes.length % PADS.length], t: 'a note.' });
    });
    tell({ k: 'said' });
    const last = stickEl.querySelector('.crt-note:last-child textarea');
    if (last) { last.focus(); last.select(); }
  });

  /* ── who is on ─────────────────────────────────────────────────────────
     A short hello every few seconds, an answer to anybody else's, and a
     goodbye on the way out. Anyone not heard from in fifteen seconds is
     assumed to have shut the tab without saying so — a crashed window should
     not haunt the list for ever. */
  const here = new Map();               // id → { n, r, seen }
  let chan = null;
  try { chan = new BroadcastChannel('knoll-lab:crt'); } catch (e) {}

  const tell = msg => { if (chan) try { chan.postMessage(Object.assign({ id: me }, msg)); } catch (e) {} };
  const hello = answer => tell({ k: answer ? 'hi-back' : 'hi', n: myName, r: Lab.role });

  if (chan) chan.onmessage = e => {
    const m = e.data;
    if (!m || m.id === me) return;
    if (m.k === 'hi' || m.k === 'hi-back') {
      here.set(m.id, { n: m.n, r: m.r, seen: Date.now() });
      if (m.k === 'hi') hello(true);    // answer a newcomer so they see us at once
      drawWho();
    } else if (m.k === 'bye') {
      here.delete(m.id); drawWho();
    } else if (m.k === 'said') {
      reread();                         // the storage event covers this too; this is just quicker
    }
  };

  function drawWho() {
    const now = Date.now();
    for (const [id, v] of here) if (now - v.seen > GONE) here.delete(id);
    const all = [{ n: myName, r: Lab.role, me: true }]
      .concat([...here.values()].map(v => ({ n: v.n, r: v.r })));
    whoEl.innerHTML = all.map(v =>
      '<li' + (v.me ? ' class="crt-you"' : '') + '><span class="crt-dot"></span>' + esc(v.n) +
      (v.r && v.r !== 'user' ? '<i>' + (v.r === 'owner' ? 'owner' : 'mod') + '</i>' : '') +
      (v.me ? '<em>you</em>' : '') + '</li>').join('');
    // the bezel's own count. It is the same number the list is — this window
    // plus everybody it has heard from — printed where you look for it.
    if (onlineEl) onlineEl.textContent = all.length + ' ONLINE';
    ledEl.classList.toggle('on', here.size > 0);
    ledEl.title = here.size ? (here.size + 1) + ' windows on the board' : 'only this window';
  }

  /* Another window wrote to localStorage. Lab.store holds its copy in memory
     and would go on believing it, so the new one is read back over the top —
     which is what makes two windows one board rather than two. */
  function reread() {
    try {
      const v = JSON.parse(localStorage.getItem('knoll-lab:crt'));
      if (v && typeof v === 'object') store.set(v);
    } catch (e) {}
  }
  window.addEventListener('storage', e => { if (e.key === 'knoll-lab:crt') reread(); });

  /* ── typing ────────────────────────────────────────────────────────────── */
  typeEl.addEventListener('submit', e => {
    e.preventDefault();
    post(sayEl.value);
    sayEl.value = '';
    sayEl.focus();
  });
  sayEl.addEventListener('keydown', e => e.stopPropagation());

  nameEl.value = myName;
  const rename = () => {
    const v = nameEl.value.replace(/\s+/g, ' ').trim().slice(0, 24);
    myName = v || (roll(HANDLES) + ' ' + roll(NOUNS));
    nameEl.value = myName;
    ss.set('name', myName);
    hello(); drawWho();
  };
  nameEl.addEventListener('change', rename);
  nameEl.addEventListener('keydown', e => {
    e.stopPropagation();
    if (e.key === 'Enter') { e.preventDefault(); nameEl.blur(); }
  });

  logEl.addEventListener('click', e => {
    const x = e.target.closest('[data-x]');
    if (x) scrub(x.dataset.x);
  });

  if (openChk) openChk.addEventListener('change', () => {
    store.update(st => { st.open = openChk.checked; });
    tell({ k: 'said' });
  });
  if (clearEl) clearEl.addEventListener('click', () => {
    if (!S().lines.length) return;
    if (!confirm('Wipe the board? Everything said on it goes.')) return;
    store.update(st => { st.lines = []; });
    tell({ k: 'said' });
    say('the board is bare.', 'good');
  });

  /* ── wiring ────────────────────────────────────────────────────────────── */
  function render() {
    const s = S();
    drawLog(); drawNotes(); drawWho();
    if (openChk) openChk.checked = !!s.open;
    const shut = !s.open && !isMod();
    sayEl.disabled = shut;
    if (sendEl) sendEl.disabled = shut;
    sayEl.placeholder = shut ? 'the board is locked' : 'type something, then enter';
    if (Lab.applyGates) Lab.applyGates();
  }

  store.on(render);
  document.addEventListener('lab:role', () => { hello(); render(); });
  window.addEventListener('pagehide', () => tell({ k: 'bye' }));
  setInterval(() => { hello(); drawWho(); }, BEAT);
  hello();
  render();

  return { store, post, tell: hello, get me() { return me; }, get name() { return myName; } };
})();
