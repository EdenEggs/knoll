/* ─── THE STICKER DRAWER ───────────────────────────────────────────────────
   STICKER on the dock, beside UPLOAD. Press it and the drawer comes up on
   the LEFT OF THE SCREEN and stays there — it is the user's UI, not scenery,
   so panning and zooming the bench moves the drawing under it and leaves it
   where the hand left it. Rummage for a sticker, pick one up, and click the
   paper to stamp it there; or drag one straight out of the drawer and let go
   where you want it.

   IT IS NOT THE FLAT FILE, and the two are not one drawer wearing two hats.
   The tracing table (tracer.js) MAKES artwork — a picture laid down, traced,
   and filed in THE LIBRARY at its side, which is where everything that table
   makes lives and stays. This drawer HOLDS artwork that came with the bench:
   kits of stickers, drawn elsewhere and shipped. One is your own work, the
   other is stock, and neither writes into the other.

   WHERE THE LOOK COMES FROM. The design is Downloads/features/Tracing
   Table.html, a Design Canvas export of the whole LAB DOCK — the tracing
   table and this drawer side by side under the same strip of buttons. The
   drawer's panel is transcribed below with classes in place of its inline
   styles; see THE SIDE PANELS in lab.css, which is that design's own numbers
   (#251f2b on #100c16, pockets #332b3c, the pink #e8479c, VT323 for the
   plates and Kalam for the handwriting). THE CASE IS THE TABLE'S CASE — the
   export draws both panels with the same border, radii, shadow and header,
   so that shell is .lab-panel and its .lp-* furniture, written once and worn
   by both; only what is inside them differs. Like the table it has no iframe
   and nothing of its own to load, and like the table it is chrome rather
   than a gizmo: no Lab.register, no drag, nothing in keep.js's layout,
   nothing to copy.

   TWO PLACES IT LEAVES THE EXPORT, each because a mock became a thing that
   has to work:

     THE GRID HOLDS STICKERS, NOT KITS. The export's cards are kits with
     piece counts — but its chips are already categories, and a kit you
     cannot open is a card that does nothing. The chips ARE the kits here,
     and the grid under them holds the stickers themselves, which are what
     you drag out. The card keeps the export's two-line shape: the drawing,
     the name, and the kit it came out of where the piece count was.

     + NEW KIT IS GONE. Nothing in this drawer makes a kit — they are
     shipped, not drawn here — and a button that cannot do its one job is
     worse than the space it filled. The footer keeps its hint alone.

   IT IS EMPTY, ON PURPOSE, TODAY. No kits have been drawn into it yet, so
   the grid shows its dashed pockets and says so. Everything that acts on a
   sticker is built and wired — the search, the chips, the count, picking one
   up, carrying one out onto the paper, and the wall item that paints it —
   and waits on the catalogue.

   THE CATALOGUE IS NOT A STORE, and this is the one real difference from
   the flat file. A shipped sticker is not the user's data: it must not
   answer to 'reset data', it must not eat the few megabytes localStorage
   has (the flat file is already careful about exactly that, and one drawing
   is a few dozen KB), and its id has to mean the same thing on every device
   or a stamped sticker would come back blank on the next machine. So the
   kits live in memory, registered through Stickers.load() — see FILLING THE
   DRAWER at the foot of this file — and the wall writes down nothing but
   the id.

   A STAMPED STICKER IS A PIECE OF THE WALL — wall.js's item k:'d', which
   names the sticker rather than copying it and paints its own drawing at
   the size and fade the options row says. ('k' was the five old stamps, and
   they are still painted for the artwork that used them, so the new one
   took the next free letter.) A sticker the catalogue does not have paints
   nothing, the same way a tracing taken out of the library does.

   PICKED UP, NOT LOOKED AT. The flat file's pockets open a viewer on a
   click, because taking a tracing OUT of the library had to live somewhere
   and a thumbnail is not the place for it. Nothing can be taken out of this
   drawer, so there is nothing for a viewer to hold: a click puts the sticker
   on the pointer, a second click takes it off, and a drag carries it onto
   the paper. */

window.Stickers = (function () {
  if (!window.Lab) return null;
  const $ = id => document.getElementById(id);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g,
    c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const SLOTS = 4;           // dashed pockets an empty drawer shows, as the export draws them

  /* ── THE CATALOGUE ───────────────────────────────────────────────────────
     kits:  [ { id, name } ]               — the chips, in the order given
     list:  [ { id, name, kit, w, h, d } ] — d is inner SVG markup drawn in a
                                             0 0 w h user space, exactly the
                                             shape a filed tracing keeps
     Both are plain memory. Nothing here is written to localStorage; see THE
     CATALOGUE IS NOT A STORE above. */
  let kits = [], list = [];
  const byId = new Map();
  const index = () => { byId.clear(); list.forEach(s => byId.set(s.id, s)); };

  let panel = null, on = false;
  let armedId = null;                    // the sticker on the pointer — a mood, not saved
  let kit = '';                          // '' is ALL
  let query = '';

  /* ── the panel ───────────────────────────────────────────────────────────
     Built once, the first time the tool is picked up, rather than at boot —
     a drawer nobody ever opens should cost the boot nothing at all. The same
     deferral tracer.js makes, for the same reason. The case and its header
     are .lab-panel / .lp-*, shared with the table; everything .sd-* below is
     what is actually different inside. */
  function build() {
    if (panel) return panel;
    panel = document.createElement('div');
    panel.id = 'stickers';
    panel.className = 'sticker-drawer lab-panel';
    panel.dataset.gizmo = 'stickers';
    panel.hidden = true;
    panel.setAttribute('aria-label', 'the sticker drawer');
    panel.innerHTML =
      '<div class="lp-bar">' +
        '<div class="lp-plate">THE STICKER DRAWER</div>' +
        '<div class="lp-gap"></div>' +
        '<button type="button" class="lp-x" id="sd-x" title="put the tool down">×</button>' +
      '</div>' +
      '<div class="lp-body">' +
        '<label class="sd-search">' +
          '<i class="sd-glass" aria-hidden="true"></i>' +
          '<input type="text" id="sd-q" placeholder="rummage for a sticker..." aria-label="rummage for a sticker" autocomplete="off">' +
        '</label>' +
        '<div class="sd-chips" id="sd-chips"></div>' +
        '<div class="lp-head"><span class="lp-count" id="sd-count"></span><div class="lp-rule"></div></div>' +
        '<div class="sd-grid" id="sd-grid"></div>' +
      '</div>' +
      '<div class="lp-foot"><div class="lp-fine" id="sd-foot"></div></div>';
    /* the body, not the world: this is chrome sitting over the bench, so it
       is outside the sheet the camera moves and is never re-rastered by a
       zoom the way a panel on the paper had to be. */
    document.body.appendChild(panel);
    // the case can be pulled wider by its right edge, and remembers how wide
    if (window.Lab && Lab.gripPanel) Lab.gripPanel(panel);
    wire();
    render();
    return panel;
  }

  // the drawing itself, sized by the pocket it is going into
  function art(s) {
    return '<svg class="sd-art" viewBox="0 0 ' + (s.w || 100) + ' ' + (s.h || 100) + '" ' +
           'preserveAspectRatio="xMidYMid meet" aria-hidden="true">' + s.d + '</svg>';
  }

  // what the chips and the search box have narrowed the drawer down to
  function shown() {
    const q = query.trim().toLowerCase();
    return list.filter(s =>
      (!kit || s.kit === kit) &&
      (!q || (s.name || '').toLowerCase().indexOf(q) >= 0 ||
             kitName(s.kit).toLowerCase().indexOf(q) >= 0));
  }

  const kitName = id => (kits.find(k => k.id === id) || {}).name || id || '';

  function render() {
    if (!panel) return;
    renderChips();
    const all = list.length, some = shown();

    const grid = $('sd-grid');
    if (!all) {
      /* THE EMPTY DRAWER. The export draws exactly this pocket in the flat
         file at the other end of the dock — dashed, numbered, waiting — so
         an empty drawer is drawn in the design's own hand rather than in a
         shrug of grey text. */
      let html = '';
      for (let i = 0; i < SLOTS; i++)
        html += '<div class="lp-pocket">' + String(i + 1).padStart(2, '0') + '</div>';
      grid.innerHTML = html;
      grid.classList.add('sd-bare');
    } else if (!some.length) {
      grid.innerHTML = '<div class="sd-none">nothing in the drawer answers to that.</div>';
      grid.classList.add('sd-bare');
    } else {
      grid.classList.remove('sd-bare');
      grid.innerHTML = some.map(s =>
        '<div class="sd-card' + (s.id === armedId ? ' on' : '') + '" data-id="' + esc(s.id) + '"' +
        ' role="button" tabindex="0"' +
        ' title="' + esc(s.name) + '\nclick to put it on the pointer · drag it onto the paper to stamp it there">' +
          '<div class="sd-thumb">' + art(s) + '<span class="sd-on">ON THE POINTER</span></div>' +
          '<div class="sd-name">' + esc(s.name) +
            '<br><span>' + esc(kitName(s.kit)) + '</span></div>' +
        '</div>').join('');
    }

    /* The export's line read N KITS ON HAND because its cards were kits. The
       cards here are stickers, so the line counts stickers — and says so
       plainly when a chip or the search box has narrowed them. */
    $('sd-count').textContent = !all ? 'THE DRAWER IS EMPTY'
      : some.length === all ? all + (all === 1 ? ' STICKER' : ' STICKERS') + ' ON HAND'
      : some.length + ' OF ' + all + ' STICKERS';

    const a = armed();
    $('sd-foot').textContent = !all
      ? 'kits will be filed in here.'
      : a ? 'on the pointer: ' + (a.name || 'a sticker') + ' — click the paper to stamp it.'
          : 'click a sticker to pick it up, or drag one straight onto the paper.';
  }

  function renderChips() {
    const box = $('sd-chips'); if (!box) return;
    box.innerHTML = [{ id: '', name: 'ALL' }].concat(kits).map(k =>
      '<button type="button" class="sd-chip' + (k.id === kit ? ' on' : '') + '" data-kit="' + esc(k.id) + '">' +
      esc(String(k.name).toUpperCase()) + '</button>').join('');
  }

  /* ── PICKING ONE UP ──────────────────────────────────────────────────────
     A click arms, a second click disarms — the whole of what a card does,
     since nothing can be taken out of a drawer of shipped art. The options
     row on the dock says which one is up, so it is redrawn with it. */
  function arm(id) {
    armedId = armedId === id ? null : id;
    render();
    if (window.Wall && Wall.syncOpts) Wall.syncOpts();
  }

  // a click on the paper with nothing on the pointer: the drawer says why
  function nudge() {
    if (!panel) return;
    const f = $('sd-foot');
    f.textContent = list.length
      ? 'pick a sticker out of the drawer first.'
      : 'the drawer is empty — no kits have been filed in it yet.';
    f.classList.remove('lp-nudge'); void f.offsetWidth; f.classList.add('lp-nudge');
  }

  /* ── DRAGGING A STICKER ONTO THE PAPER ───────────────────────────────────
     Lifted whole from the flat file's pockets (tracer.js, DRAGGING A POCKET
     ONTO THE PAPER) because it is the same gesture and has to feel the same:
     past six pixels a ghost of the drawing follows the pointer, and letting
     go over the paper — anywhere that is not this drawer — stamps it there
     through Wall.stickerAt, the same write the click-to-stamp makes. Pointer
     events, not HTML drag-and-drop: the bench is all pointer events, and a
     native drag would fight lab.js for the wheel and the capture. */
  function wireDrag(box) {
    let press = null, ghost = null;
    const SLOP = 6;
    const end = e => {
      if (!press) return;
      const p = press; press = null;
      window.removeEventListener('pointermove', move, true);
      window.removeEventListener('pointerup', end, true);
      window.removeEventListener('pointercancel', end, true);
      if (ghost) { ghost.remove(); ghost = null; }
      panel.classList.remove('sd-carrying');
      if (!p.moved) { arm(p.id); return; }             // a press that went nowhere: pick it up
      if (e.type === 'pointercancel') return;
      // over the paper, and not over the drawer itself
      const t = document.elementFromPoint(e.clientX, e.clientY);
      if (!t || t.closest('#stickers') || !t.closest('#bench')) {
        $('sd-foot').textContent = 'let go over the paper to stamp it.'; return;
      }
      const w = Lab.toWorld(e.clientX, e.clientY);
      const s = byId.get(p.id);
      if (s && window.Wall && Wall.stickerAt && Wall.stickerAt(s, w.x, w.y))
        $('sd-foot').textContent = 'stamped — drag another, or click the paper with one on the pointer.';
    };
    const move = e => {
      if (!press) return;
      const dx = e.clientX - press.x, dy = e.clientY - press.y;
      if (!press.moved) {
        if (Math.abs(dx) + Math.abs(dy) < SLOP) return;
        press.moved = true;
        const s = byId.get(press.id); if (!s) { end(e); return; }
        ghost = document.createElement('div');
        ghost.className = 'lp-ghost';
        ghost.innerHTML = art(s);
        document.body.appendChild(ghost);
        panel.classList.add('sd-carrying');
      }
      ghost.style.left = e.clientX + 'px'; ghost.style.top = e.clientY + 'px';
    };
    box.addEventListener('pointerdown', e => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      const c = e.target.closest('.sd-card'); if (!c) return;
      e.preventDefault(); e.stopPropagation();
      press = { id: c.dataset.id, x: e.clientX, y: e.clientY, moved: false };
      window.addEventListener('pointermove', move, true);
      window.addEventListener('pointerup', end, true);
      window.addEventListener('pointercancel', end, true);
    });
  }

  // ── wiring ───────────────────────────────────────────────────────────────
  function wire() {
    $('sd-x').addEventListener('click', () => { if (window.Wall) Wall.setTool('move'); });

    $('sd-q').addEventListener('input', e => { query = e.target.value; render(); });
    /* A text field on a bench where nearly every key is a shortcut — but
       lab.js's own keydown bows out of anything inside an input (isField),
       so nothing has to be stopped here. What that leaves is escape, which
       nobody else will hear: it empties the box rather than putting the
       tool down, since a search you cannot clear is a search you have to
       backspace out of. */
    $('sd-q').addEventListener('keydown', e => {
      if (e.key === 'Escape') { e.target.value = ''; query = ''; render(); }
    });
    $('sd-chips').addEventListener('click', e => {
      const c = e.target.closest('.sd-chip'); if (!c) return;
      kit = c.dataset.kit; render();
    });

    wireDrag($('sd-grid'));                  // a press is a pick-up or a carry
    $('sd-grid').addEventListener('keydown', e => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      const c = e.target.closest('.sd-card'); if (c) { arm(c.dataset.id); e.preventDefault(); }
    });
  }

  // ── what the dock asks ───────────────────────────────────────────────────
  /* Up with the tool, away with it — what is on the pointer, the chip and
     the search stay put in between, the way the table's dials do. There is
     no placing to do: the drawer is fixed to the left of the screen and is
     in the same spot every time it comes up. Nothing is built until the
     first real open, so a drawer nobody opens costs the boot nothing. */
  function tool(up) {
    on = !!up;
    build().hidden = !on;
    if (on) render();
  }

  const armed = () => (armedId && byId.get(armedId)) || null;
  const get = id => byId.get(id) || null;

  /* ── FILLING THE DRAWER ──────────────────────────────────────────────────
     The one door in. Call it once, at boot, with the kits and the stickers
     that came with the bench:

       Stickers.load({
         kits: [ { id: 'pipeworks', name: 'Pipeworks' } ],
         stickers: [ { id: 'pw-elbow', name: 'Elbow Joint', kit: 'pipeworks',
                       w: 400, h: 400, d: '<path d="…" fill="#5a635d"/>' } ]
       });

     d is the INSIDE of an <svg viewBox="0 0 w h"> — paths, groups, whatever
     the drawing is, with its colours already in it. An id is written into
     every stamp made from that sticker and is how the wall finds it again,
     so it has to stay the same for as long as the artwork is meant to keep
     painting: name it, do not number it.

     Calling this again REPLACES the catalogue rather than adding to it, so a
     sheet can be re-loaded without doubling; pass the lot each time. What is
     already on the paper is looked up by id, so a re-load with the same ids
     repaints exactly what was there — and the repaint is asked for here,
     because a stamp made before its sticker arrived drew nothing. */
  function load(payload) {
    const p = payload || {};
    kits = (p.kits || []).map(k => ({ id: String(k.id), name: k.name || k.id }));
    list = (p.stickers || []).map(s => ({
      id: String(s.id), name: s.name || s.id, kit: s.kit == null ? '' : String(s.kit),
      w: +s.w || 100, h: +s.h || 100, d: s.d || ''
    }));
    index();
    if (armedId && !byId.has(armedId)) armedId = null;
    if (kit && !kits.some(k => k.id === kit)) kit = '';
    render();
    if (window.Wall && Wall.paint) Wall.paint();
    if (window.Wall && Wall.syncOpts) Wall.syncOpts();
    return list.length;
  }

  return { tool, load, armed, get, arm, nudge,
           get kits() { return kits.slice(); },
           get list() { return list.slice(); },
           get on() { return on; } };
})();
