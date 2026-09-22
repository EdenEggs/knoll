/* name.js — THE NAME BESIDE knoll /. (lab2/bench-template, 2026-09-12)

   On the dev server the name is a control: press it and it becomes a field
   holding the name; Enter, or clicking away, keeps what you typed, and Escape
   puts it back. It is written into this bench's index.html — its <title> and
   the header — through serve.js's name door, so the name belongs to the page
   rather than to this browser, and deploys with it. The folder keeps its own
   name: the doors and the storage are named after the folder.

   A FIELD, NOT contenteditable: lab.js's shortcuts stand down for
   input/textarea/select and [contenteditable="true"] only (isField), and a
   typed "h" or "+" must not pick up the hand or zoom the paper. It sits where
   the name sits, inside the brand's link home, so every press inside it is
   kept from following that link. And it has one width while you type (lab.css)
   so the header does not reflow — and slide the bench under it — letter by
   letter. */
(function () {
  if (!document.documentElement.classList.contains('lab-local')) return;
  const DOOR = '/_@@BENCH_SLUG@@/name';
  const MAX = 48;
  const name = document.querySelector('.lab-name');
  if (!name) return;
  const note = document.getElementById('bench-name-note');
  let field = null, was = '', noteTimer = 0;

  name.classList.add('is-renamable');
  name.title = 'rename this bench';

  function say(text, bad) {
    if (!note) return;
    clearTimeout(noteTimer);
    note.textContent = text || '';
    note.hidden = !text;
    note.classList.toggle('is-bad', !!bad);
    if (text) noteTimer = setTimeout(() => { note.hidden = true; }, bad ? 9000 : 2600);
  }
  // control characters out, runs of space to one, trimmed, and no longer than the door allows
  const clean = v => String(v || '').replace(/[\x00-\x1f\x7f]/g, '').replace(/\s+/g, ' ').trim().slice(0, MAX);
  const titled = v => { document.title = 'Knoll · ' + v; };

  function open(e) {
    e.preventDefault();                          // the brand is a link home; the name is not
    e.stopPropagation();
    if (field) return;
    was = name.textContent;
    field = document.createElement('input');
    field.type = 'text';
    field.className = 'lab-name-field';
    field.value = was;
    field.maxLength = MAX;
    field.spellcheck = false;
    field.setAttribute('aria-label', 'this bench’s name');
    field.addEventListener('click', ev => { ev.preventDefault(); ev.stopPropagation(); });
    field.addEventListener('keydown', ev => {
      if (ev.key === 'Enter') { ev.preventDefault(); close(true); }
      else if (ev.key === 'Escape') { ev.preventDefault(); close(false); }
    });
    field.addEventListener('blur', () => close(true));
    name.hidden = true;
    name.after(field);
    field.focus();
    field.select();
  }

  async function close(keep) {
    if (!field) return;
    const value = clean(field.value), old = was;
    const f = field;
    field = null;
    f.remove();
    name.hidden = false;
    if (!keep || !value || value === old) return;
    name.textContent = value;                    // said at once, and put back if the file says no
    titled(value);
    let why = '';
    try {
      const r = await fetch(DOOR, { method: 'POST', keepalive: true, headers: { 'content-type': 'application/json' },
                                    body: JSON.stringify({ name: value }) });
      const out = await r.json().catch(() => null);
      if (r.ok && out && out.ok) {
        name.textContent = out.name;
        titled(out.name);
        say('Renamed, and written into this bench’s index.html.');
        return;
      }
      why = out && out.error ? out.error : (r.status === 404 ? 'old' : 'the server answered ' + r.status);
    } catch (e) { why = (e && e.message) || String(e); }
    name.textContent = old;
    titled(old);
    say(why === 'old'
      ? 'Not renamed: the server running this page is older than its rename. Close that server’s window, start it again (node serve.js), and rename again.'
      : 'Not renamed: ' + why, true);
  }

  name.addEventListener('click', open);
})();
