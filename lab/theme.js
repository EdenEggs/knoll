/* ─── knoll / lab — genre skins ────────────────────────────────────────────
   A community's hill should look like the thing the community is about. This
   picks which skin the bench is wearing; themes.css says what each one looks
   like.

   The attribute goes on <html>, not <body>, so the paper colour is already
   right during the very first paint — put it on <body> and the page flashes
   cream before it goes dark. For the same reason the saved theme is read and
   applied inline in index.html <head>, before this file loads; everything
   here is the switcher and the bookkeeping.

     Theme.list        [{id, name, blurb, mark}, …]
     Theme.current     the id showing now
     Theme.set(id)     switch, remember, announce

   Gizmos that paint into a <canvas> can listen for the change and repaint:

     document.addEventListener('lab:theme', e => redraw(e.detail.theme))

   Nothing here touches the hill, the shed or any other canvas yet — those are
   painted by their own gizmos in their own colours, so they stay knoll-ish
   whatever the frame around them is wearing. */

window.Theme = (function () {
  const KEY = 'knoll-lab:theme';

  const THEMES = [
    { id:'knoll',     name:'Knoll',     mark:'▲', blurb:'the house style — cream paper, aubergine ink, pink' },
    { id:'horror',    name:'Horror',    mark:'✜', blurb:'the cellar — soot, bone type, one wound of red' },
    { id:'adventure', name:'Adventure', mark:'✦', blurb:'the map room — parchment, leather, brass plates' },
    { id:'shooter',   name:'Shooter',   mark:'◆', blurb:'the armory — gunmetal, hazard tape, lit readouts' },
  ];
  const ids = THEMES.map(t => t.id);

  let current = 'knoll';

  function set(id, opts) {
    if (!ids.includes(id) || id === current) return;
    current = id;
    document.documentElement.dataset.theme = id;
    document.querySelectorAll('[data-theme-btn]').forEach(b =>
      b.setAttribute('aria-selected', String(b.dataset.themeBtn === id)));

    const t = THEMES.find(x => x.id === id);
    const note = document.getElementById('genre-note');
    if (note) note.textContent = t.blurb;

    try { localStorage.setItem(KEY, id); } catch (e) {}
    // canvases and anything else that paints its own colours
    document.dispatchEvent(new CustomEvent('lab:theme', { detail:{ theme:id, meta:t } }));
  }

  // ── build the switcher next to VIEW AS ─────────────────────────────────
  function mount() {
    const host = document.getElementById('genre-switch');
    if (!host) return;
    host.innerHTML =
      '<span class="genre-switch-label">GENRE</span>' +
      THEMES.map(t =>
        '<button type="button" role="tab" data-theme-btn="' + t.id + '"' +
        ' aria-selected="' + (t.id === current) + '" title="' + t.blurb + '">' +
        '<em aria-hidden="true">' + t.mark + '</em>' + t.name + '</button>').join('');
    host.addEventListener('click', e => {
      const b = e.target.closest('[data-theme-btn]');
      if (b) set(b.dataset.themeBtn);
    });
  }

  // the head script already applied the saved theme; catch up to whatever it
  // decided rather than reading storage a second time and risking a mismatch
  const applied = document.documentElement.dataset.theme;
  if (ids.includes(applied)) current = applied;
  else document.documentElement.dataset.theme = current;

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();

  // shift + G cycles, the way 1/2/3 switch roles
  document.addEventListener('keydown', e => {
    if (!e.shiftKey || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key.toLowerCase() !== 'g') return;
    const t = e.target;
    if (t && (t.isContentEditable || /^(input|textarea|select)$/i.test(t.tagName))) return;
    set(ids[(ids.indexOf(current) + 1) % ids.length]);
    e.preventDefault();
  });

  return {
    list: THEMES.slice(),
    set,
    get current() { return current; },
  };
})();
