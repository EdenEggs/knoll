/* ─── NEW BENCH ─────────────────────────────────────────────────────────────
   "+ new bench", beside knoll / lab 2 in the header, on the dev server only.

   A press asks serve.js (NEW_DOOR, see BENCHES MADE BY A BUTTON there) to
   make the next folder_N beside lab 2 — folder_1, folder_2, and on — as a
   copy of lab2/bench-template: an empty bench like the iron hive and TOEM 2,
   with bare paper, an EMPTY sticker drawer, its own storage keys, doors and
   cursor room, a save button, and a name beside knoll / that is changed by
   pressing it. The new bench opens in a new tab.

   IT CANNOT RUN OFF THE DEV SERVER, and does not try: a page cannot make a
   folder, and the deployed site has no server to ask. Off localhost this file
   does nothing and the button stays hidden.

   ONE WIDTH, AND THE SENTENCE UNDERNEATH. The button's word changes as it
   works (+ new bench, making…, made ✓, not made), and a label that changed
   the button's width would reflow the long hint beside it — the header would
   change height and the whole bench slide under it (found on TOEM 2's save
   button, 2026-09-12). So the button is one fixed width, and anything longer
   than a word is a note placed out of the header's flow.

   THE NEW TAB IS OPENED IN THE PRESS ITSELF, blank, and pointed at the new
   bench when the server answers: a window opened after an await is not a
   press any more, and a popup blocker takes it. If the bench is not made the
   blank tab is closed again. */
(function () {
  if (!document.documentElement.classList.contains('lab-local')) return;
  const DOOR = '/_lab2/new-bench';
  const LABEL = '+ new bench';
  const btn = document.getElementById('lab-new-bench');
  const note = document.getElementById('lab-new-bench-note');
  if (!btn) return;

  // this button's own dress: lab.css's .lab-save pill, held to one width, and its note
  const css = document.createElement('style');
  css.textContent =
    '#lab-new-bench{box-sizing:border-box;width:9.5em;text-align:center;overflow:hidden;text-overflow:ellipsis;flex:none}' +
    '.lab-new-bench-note{position:absolute;left:22px;bottom:8px;z-index:2;width:max-content;max-width:32em;' +
      'padding:6px 10px;border-radius:8px;background:var(--paper);box-shadow:0 2px 10px rgba(0,0,0,.12);' +
      'font-family:var(--body);font-size:12px;line-height:1.4;color:var(--ink-3);text-wrap:pretty}' +
    '.lab-new-bench-note.is-bad{color:#b3261e}' +
    '.lab-new-bench-note[hidden]{display:none}';
  document.head.appendChild(css);

  let busy = false, settle = 0;
  function show(text, state, message, bad) {
    btn.textContent = text;
    btn.className = 'lab-save' + (state ? ' is-' + state : '');
    if (note) { note.textContent = message || ''; note.hidden = !message; note.classList.toggle('is-bad', !!bad); }
  }

  // shown at once, so the header is laid out with it from the first paint; the knock only names the next folder
  btn.hidden = false;
  btn.title = 'make a new empty bench, and open it in a new tab';
  fetch(DOOR, { method: 'GET' }).then(r => (r.ok ? r.json() : null)).then(v => {
    if (v && v.door && v.next) btn.title = 'make ' + v.next + ': a new empty bench, opened in a new tab';
  }).catch(() => {});

  btn.addEventListener('click', async () => {
    if (busy) return;
    busy = true;
    clearTimeout(settle); settle = 0;
    const tab = window.open('about:blank', '_blank');
    show('making…', '');
    let out = null, why = '';
    try {
      const r = await fetch(DOOR, { method: 'POST' });
      out = await r.json().catch(() => null);
      if (!(r.ok && out && out.ok)) why = out && out.error ? out.error : (r.status === 404 ? 'old' : 'the server answered ' + r.status);
    } catch (e) { why = 'gone'; }                  // nothing answered at all: the server has stopped
    busy = false;
    if (!why) {
      const url = new URL(out.url, location.href).href;
      if (tab) tab.location.href = url; else window.open(url, '_blank');
      show('made ✓', 'done', 'Made ' + out.slug + ' and opened it in a new tab. Its name, beside knoll /, changes when you press it.');
    } else {
      if (tab) tab.close();
      /* Both notes send you to the Lab 2 shortcut (site/lab2/start-lab2.bat), because it starts the
         server when nothing is on the port. It REUSES whatever is already there, which is why an
         older server has to be closed first. */
      show('not made', 'bad', why === 'old'
        ? 'Not made: the server running lab 2 is older than this button. Close the server’s window (“knoll … serve.js”), open lab 2 again from the Lab 2 shortcut in site/lab2, and press again.'
        : why === 'gone'
        ? 'Not made: lab 2’s server is not running. Open lab 2 again from the Lab 2 shortcut in site/lab2 (it starts the server), and press again.'
        : 'Not made: ' + why, true);
    }
    settle = setTimeout(() => { settle = 0; show(LABEL, ''); }, why ? 9000 : 5000);
  });
})();
