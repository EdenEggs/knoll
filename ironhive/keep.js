/* ── KEEP: THE BENCH SAVES ITSELF AS THE DEFAULT LOOK ──────────────────────
   Every thirty seconds, where everything is on this screen becomes where
   everything is in index.html.

   THE TWO PLACES A LAYOUT CAN LIVE. lab.js keeps positions in
   knoll-ironhive:pos:<gizmo> and frames.js keeps re-cut sizes in
   knoll-ironhive:size2:<gizmo>, and both of those are IN THIS BROWSER — they are
   what you did on this machine, and nobody else ever sees them. index.html's
   data-home-x / -y, data-cut and the copies written down at the foot of the
   world are the DEFAULT LOOK: what somebody who has never been here gets,
   what `reset layout` goes back to, and what deploys. index.html says it
   plainly about the planted trees — a pasted copy lives in somebody's
   browser and a grove that is part of the default look cannot.

   Moving the first into the second was a hand job: read the numbers off the
   screen, type them into the file. This does it on a timer.

   IT ONLY WORKS AT HOME, and it has to. A page cannot write the file it was
   served from, so there is a door in serve.js to post through; the static
   host lab 2 deploys to has no such door, so out there this file knocks
   once, hears nothing, and goes quiet for good. Nothing on the deployed
   bench behaves differently for having loaded it.

   WHAT IT SAVES
     · where every feature sits ................ data-home-x / data-home-y
     · the size of any frame you RE-CUT ........ data-cut, and its style
     · copies you pasted ....................... a section, written out
     · the pile — what is over what ............ data-home-z
     · features the menu took off .............. data-gone="1", section kept

   WHAT IT DOES NOT
     · THE CAMERA. Where you are looking is not what the bench looks like,
       and lab.js has an argued-for opening shot — the lockup, framed to the
       banner — that a saved camera would quietly overwrite. WHERE IT OPENS,
       in lab.js, is that argument.
     · A FRAME YOU HAVE NOT RE-CUT. An untouched frame follows its own
       drawing, at whatever size the drawing is, and that is where every
       default on this bench comes from. Freezing one at today's measurement
       would break the day the drawing changes.
     · THE TAPE, AND ANYTHING A GIZMO REMEMBERS. Those are things people
       make, not the shape of the room; `reset data` is what they answer to.

   AND IT NEVER DELETES. serve.js appends a copy to the block at the foot of
   the world and leaves it there for good, so taking one off the bench is a
   line you delete by hand. Undo still un-pastes a copy on the screen, but a
   copy that has already been written down comes back on the next load — at
   which point it is not a copy any more, it is a section, exactly like the
   thirteen trees somebody planted by hand.

   A DELETE OFF THE RIGHT-CLICK MENU KEEPS THAT PROMISE FROM THE OTHER SIDE.
   The feature comes off the paper and is still reported here, with where it
   was and what it was cut to, so the section keeps its home and its cut and
   gains one word: data-gone="1". The section stays in the file, comment and
   all; removing the word by hand puts it back for everybody, and undo puts
   it back for you now — the next save takes the word off again. */

window.Keep = (function () {
  if (!window.Lab) return null;

  /* THIS BENCH'S OWN DOOR, and it must not be lab 2's. Both benches are
     served by the same serve.js off the same host, and the door names the
     FILE the post is written into — so an empty bench posting through
     /_lab2/default would write its own emptiness over lab 2's index.html.
     serve.js keeps one door per bench for that reason; see THE DOORS there. */
  const DOOR = '/_ironhive/default';
  const EVERY = 30000;

  const pill = document.getElementById('lab-keep');
  const btn = document.getElementById('lab-save');
  let on = true, live = false, busy = false, timer = 0, last = '';

  const say = (text, cls) => {
    if (!pill) return;
    pill.textContent = text;
    pill.className = 'lab-keep' + (cls ? ' is-' + cls : '');
    pill.hidden = false;
  };

  const clock = () => new Date().toTimeString().slice(0, 5);

  /* The button says what happened to IT, on its own face, for a beat. The
     pill is a state — what the autosave is doing — and this is an event, and
     the two want different words: 'saved' answers a press, 'default saved
     14:32' answers a glance. Both are told, because a press you cannot see
     the result of is a press you make twice. */
  let flash = 0;
  function said(word, cls) {
    if (!btn) return;
    clearTimeout(flash);
    btn.textContent = word;
    btn.className = 'lab-save' + (cls ? ' is-' + cls : '');
    flash = setTimeout(() => {
      btn.textContent = 'save layout';
      btn.className = 'lab-save';
    }, 1600);
  }

  /* ── WHAT THE SCREEN LOOKS LIKE RIGHT NOW ────────────────────────────────
     Read off the elements and not off localStorage, because localStorage is
     one drag behind whatever is being held, and because a gizmo that has
     never moved has nothing under its key at all — its position is only in
     the DOM. style.left / style.top and style.width / style.height are what
     lab.js and frames.js both write, so they are the same numbers that go
     into the file.

     `sized` is frames.js's word for a frame somebody re-cut, as against one
     still following its drawing, and it is the whole of the difference
     between a size worth writing down and a measurement. */
  function look() {
    const copies = window.Lab.copies;
    const made = new Set((copies && copies.get().list || []).map(e => e.id));
    const panels = (window.Frames && window.Frames.panels) || [];

    return window.Lab.gizmos.map(g => {
      const el = g.el, id = el.dataset.gizmo;
      const p = panels.find(q => q.el === el);
      const px = v => Math.round(parseFloat(v) || 0);
      return {
        gizmo: id,
        x: px(el.style.left),
        y: px(el.style.top),
        w: px(el.style.width),
        h: px(el.style.height),
        cut: !!(p && p.sized),
        z: g.rank,                       // its place in the pile — see THE PILE in lab.js
        gone: false,
        copy: made.has(id),
        // only a copy is ever written from scratch, so only a copy needs the
        // rest of it — the file already knows what everything else is
        src: el.dataset.src || '',
        dataW: el.dataset.w || '',
        dataH: el.dataset.h || '',
        scale: el.dataset.scale || '',
        label: el.getAttribute('aria-label') || id
      };
    }).concat((window.Lab.gone || []).map(r => ({
      /* TAKEN OFF, BUT STILL REPORTED — with where it was and what it was
         cut to, so the file's home and data-cut stand and only data-gone is
         added. Left out of the list, a gone feature would be one the door
         never hears about, and the one that was taken off is the one the
         file most needs to hear about. */
      gizmo: r.id, x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.w), h: Math.round(r.h),
      cut: !!r.cut, z: r.z, gone: true, copy: false,
      src: r.el.dataset.src || '', dataW: r.el.dataset.w || '', dataH: r.el.dataset.h || '',
      scale: r.el.dataset.scale || '', label: r.el.getAttribute('aria-label') || r.id
    })));
  }

  /* Nothing on the bench moved, nothing goes down the wire. Thirty seconds
     is often enough that most of them find a bench nobody has touched, and a
     server that rewrites a file to change nothing in it is a file that is
     never the same twice for git. */
  const stamp = list => JSON.stringify(list.map(g =>
    [g.gizmo, g.x, g.y, g.cut ? g.w : 0, g.cut ? g.h : 0, g.z, g.gone ? 1 : 0].join(',')));

  /* `force` sends it even if nothing on the bench has moved; `hand` says a
     person asked, which is the difference between a save that may quietly
     decide there is nothing to do and one that owes an answer. A press with
     no reply is a press you make again. */
  async function push(force, hand) {
    if (!live) { if (hand) said('no server', 'bad'); return; }
    if (busy) { if (hand) said('saving…', ''); return; }
    if (!on && !force) return;
    const list = look();
    if (!list.length) return;
    const now = stamp(list);
    if (now === last && !force) return;
    if (hand) said('saving…', '');

    busy = true;
    try {
      const r = await fetch(DOOR, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ gizmos: list })
      });
      const out = await r.json();
      if (!out.ok) { say('save failed', 'bad'); said('failed', 'bad'); console.warn('[keep]', out.error); return; }
      last = now;

      /* A COPY THAT HAS BEEN WRITTEN DOWN IS NOT A COPY ANY MORE. lab.js
         rebuilds the copies list onto the paper at boot, and the file now
         builds the same section from markup — so leaving it in the list is
         how you get two of everything, both answering to one id. Dropping it
         here is the hand-off: markup owns it from now on. */
      if (out.promoted && out.promoted.length && window.Lab.copies) {
        const gone = new Set(out.promoted);
        window.Lab.copies.update(st => { st.list = st.list.filter(e => !gone.has(e.id)); });
      }

      /* HOME IS HERE NOW, AND SO IS THE CUT. The file says so, and the DOM
         has to agree or `reset layout` would walk everything back to numbers
         that are no longer in the file — which is the whole promise of a
         save: what you just saved IS what reset goes to, without a reload in
         between. Both attributes are the file's answer, so both are written
         here; frames.js reads data-cut on reset the same way lab.js reads
         data-home-x.

         Clearing the saved position keeps the two from disagreeing later:
         the position and the home are the same number now, so the override
         has nothing left to override. The saved SIZE is left alone on
         purpose — it is this machine's, it agrees with data-cut as of this
         second, and reset clears it itself. */
      const cut = new Map(list.map(g => [g.gizmo, g]));
      window.Lab.gizmos.forEach(g => {
        const el = g.el, id = el.dataset.gizmo, c = cut.get(id);
        el.dataset.homeX = Math.round(parseFloat(el.style.left) || 0);
        el.dataset.homeY = Math.round(parseFloat(el.style.top) || 0);
        if (c && c.cut) el.dataset.cut = c.w + 'x' + c.h;
        else delete el.dataset.cut;
        if (c && isFinite(c.z)) el.dataset.homeZ = c.z;   // and the pile, the same way
        try { localStorage.removeItem('knoll-ironhive:pos:' + id); localStorage.removeItem('knoll-ironhive:z:' + id); } catch (e) {}
      });
      // a delete that has been written down is the file's now: 'reset
      // layout' goes to the file, so it leaves this one off
      (window.Lab.gone || []).forEach(r => { r.file = true; r.el.setAttribute('data-gone', '1'); });

      if (out.missing && out.missing.length) console.warn('[keep] not in the file:', out.missing);
      say(out.wrote ? 'default saved ' + clock() : 'default up to date', out.wrote ? 'saved' : '');
      if (hand) said(out.wrote ? 'saved ✓' : 'no change', 'done');
    } catch (e) {
      say('save failed', 'bad');
      if (hand) said('failed', 'bad');
    } finally {
      busy = false;
    }
  }

  const start = () => { clearInterval(timer); timer = setInterval(push, EVERY); };

  /* One knock before anything else. A 404 here is the deployed site saying
     there is no door, which is not an error and does not want a red pill —
     it wants this file to stop having an opinion. */
  fetch(DOOR, { method: 'GET' }).then(r => r.ok ? r.json() : null).then(v => {
    if (!v || !v.door) return;
    live = true;
    say('autosave on', '');
    if (btn) btn.hidden = false;
    start();
    push();
  }).catch(() => {});

  // one last save on the way out, so the last thirty seconds are not the ones
  // you lose. keepalive lets it outlive the page.
  window.addEventListener('pagehide', () => {
    if (!live || !on) return;
    const list = look();
    if (list.length && stamp(list) !== last) {
      try {
        fetch(DOOR, {
          method: 'POST', keepalive: true,
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ gizmos: list })
        });
      } catch (e) {}
    }
  });

  // the pill is the switch: click it to stop, click it to start, and it saves
  // on the way back on so you never wait thirty seconds to see it work
  if (pill) pill.addEventListener('click', () => {
    if (!live) return;
    on = !on;
    if (on) { start(); say('autosave on', ''); push(true); }
    else { clearInterval(timer); say('autosave paused', 'off'); }
  });

  /* ── SAVE NOW ─────────────────────────────────────────────────────────────
     The same write the timer does, asked for by hand. What it buys is not
     speed but CERTAINTY: thirty seconds is short and still long enough to
     close a tab in, and 'is what I just did written down?' is a question the
     bench should be able to answer on demand rather than eventually.

     AND IT MOVES `reset layout` WITH IT. That is the point of the button
     rather than a side effect of it — the save writes data-home-x and
     data-cut onto the live elements as well as into the file (see HOME IS
     HERE NOW), so the moment it lands, reset comes back HERE. Save, shove
     everything about, reset: you are back where you saved. */
  if (btn) btn.addEventListener('click', () => push(true, true));

  /* ctrl+s, because that is what the hands already do. preventDefault is not
     optional: without it the browser offers to save the PAGE, which is a
     dialog about a .html file in Downloads and nothing to do with the bench.
     Taken on the capture phase and with no guard for what has the focus —
     a note being typed on the paper is exactly when somebody hits ctrl+s,
     and exactly when that dialog is least wanted. */
  window.addEventListener('keydown', e => {
    if (!(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== 's' || e.altKey) return;
    e.preventDefault();
    if (live) push(true, true);
  }, true);

  return { get on() { return on; }, get live() { return live; }, now: () => push(true, true), look };
})();
