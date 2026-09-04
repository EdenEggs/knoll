/* ─── THE DRAWING PAD ──────────────────────────────────────────────────────
   A pocket sketching surface any gizmo can bolt on: a small square canvas,
   a few pots of ink, a rubber and a wipe. Everything stays on the device;
   whoever mounted it asks for a data-url when they want the picture.

     const pad = Pad.mount(hostEl, { size: 128, onchange: fn });
     pad.toDataURL()   → 'data:image/png;…' (white paper, never transparent)
     pad.isEmpty()     → true until a mark is made
     pad.clear()       → fresh paper
*/

window.Pad = (function () {
  const INKS = ['#26212a', '#c93b82', '#5871f5', '#2fae76', '#f59321'];
  const RUBBER = '#ffffff';

  function mount(host, opts) {
    opts = opts || {};
    const size = opts.size || 128;

    const wrap = document.createElement('div');
    wrap.className = 'pad';
    wrap.innerHTML =
      '<canvas class="pad-canvas" width="' + size + '" height="' + size + '" aria-label="drawing pad"></canvas>' +
      '<div class="pad-tools">' +
      INKS.map((c, i) => '<button type="button" class="pad-ink" data-ink="' + c + '" style="background:' + c + '"'
        + ' aria-pressed="' + (i === 0) + '" aria-label="ink ' + (i + 1) + '"></button>').join('') +
      '<button type="button" class="pad-ink pad-rubber" data-ink="' + RUBBER + '" aria-pressed="false" aria-label="rubber" title="the rubber"></button>' +
      '<button type="button" class="pad-wipe" title="fresh paper">wipe</button>' +
      '</div>';
    host.appendChild(wrap);

    const canvas = wrap.querySelector('canvas');
    const g = canvas.getContext('2d');
    let ink = INKS[0], dirty = false, drawing = false, px = 0, py = 0;

    function paper() {
      g.fillStyle = '#fff';
      g.fillRect(0, 0, size, size);
      dirty = false;
    }
    paper();

    /* ── the paper follows the camera ──────────────────────────────────────
       The pad is the one canvas here with nothing behind it: it holds no list
       of strokes to replay, only the pixels you have drawn. So before Lab
       resizes the bitmap for a new zoom (which wipes it), the ink is kept on a
       spare sheet and painted back afterwards — what was already there is
       re-scaled, everything drawn from then on is at the new resolution.

       What leaves the pad does NOT change size: toDataURL still hands over a
       size×size picture, because that is what the museum and the time capsule
       keep and it is not this fix's business to triple what they store. */
    const keep = document.createElement('canvas');
    function stash() {
      if (!canvas.width) return;
      keep.width = canvas.width; keep.height = canvas.height;
      keep.getContext('2d').drawImage(canvas, 0, 0);
    }
    if (window.Lab && Lab.hidpi) Lab.hidpi(canvas, () => {
      if (keep.width) g.drawImage(keep, 0, 0, size, size); else paper();
    });

    function flat() {                    // the picture at its documented size
      if (canvas.width === size) return canvas;
      const c = document.createElement('canvas');
      c.width = c.height = size;
      c.getContext('2d').drawImage(canvas, 0, 0, size, size);
      return c;
    }

    // pointer → canvas pixels; the rect carries any page zoom, and the border
    // (clientLeft/Top) is subtracted so ink lands exactly under the nib
    function at(e) {
      const r = canvas.getBoundingClientRect();
      const z = r.width / canvas.offsetWidth;
      return {
        x: (e.clientX - r.left - canvas.clientLeft * z) * size / (canvas.clientWidth * z),
        y: (e.clientY - r.top - canvas.clientTop * z) * size / (canvas.clientHeight * z)
      };
    }

    function line(x0, y0, x1, y1) {
      g.strokeStyle = ink;
      g.lineWidth = ink === RUBBER ? 14 : 5;
      g.lineCap = 'round'; g.lineJoin = 'round';
      g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
      if (ink !== RUBBER) dirty = true;
      stash();
      if (opts.onchange) opts.onchange();
    }

    canvas.addEventListener('pointerdown', e => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      const p = at(e);
      drawing = true; px = p.x; py = p.y;
      line(p.x, p.y, p.x, p.y);           // a dot counts
      try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
      e.preventDefault();
    });
    canvas.addEventListener('pointermove', e => {
      if (!drawing) return;
      const p = at(e);
      line(px, py, p.x, p.y);
      px = p.x; py = p.y;
    });
    const up = e => { if (!drawing) return; drawing = false; try { canvas.releasePointerCapture(e.pointerId); } catch (err) {} };
    canvas.addEventListener('pointerup', up);
    canvas.addEventListener('pointercancel', up);

    wrap.querySelectorAll('[data-ink]').forEach(b => b.addEventListener('click', () => {
      ink = b.dataset.ink;
      wrap.querySelectorAll('[data-ink]').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
    }));
    wrap.querySelector('.pad-wipe').addEventListener('click', () => { paper(); stash(); if (opts.onchange) opts.onchange(); });

    return {
      el: wrap, canvas,
      toDataURL: () => flat().toDataURL('image/png'),
      isEmpty: () => !dirty,
      clear: paper
    };
  }

  return { mount, INKS };
})();
