/* ─── THE TRACING TABLE ───────────────────────────────────────────────────
   UPLOAD on the dock — a +, in what used to be the IMAGE button. Press it
   and the table comes up on the LEFT OF THE SCREEN and stays there: lay a
   picture down, set the dials, TRACE IT, and SAVE TO LIBRARY files the
   tracing in THE FLAT FILE along its foot, which a picture can also be
   dragged straight onto — a tracing in it goes on the pointer the way a
   stamp did, so a click on the paper puts it there.

   IT IS THE USER'S UI, NOT SCENERY (2026-09-08). It used to be a gizmo: a
   panel placed ON the paper, registered with Lab, dragged by its bar, and so
   panned and zoomed with the drawing under it — which meant the tool you
   were working with wandered off the screen as soon as you moved the camera.
   It is now fixed chrome beside the dock, the way the export always drew it.
   Gone with that: Lab.register, Lab.place, spawnAtView, the drag handle, the
   fold, and the one-frame will-change that kept it sharp inside the animated
   sheet — none of which a fixed panel needs. See THE SIDE PANELS in lab.css.

   WHERE THE LOOK COMES FROM. The design is Downloads/features/Tracing
   Table.html, a Design Canvas export of the whole LAB DOCK: a strip of
   buttons with this table and the sticker drawer (stickers.js) standing
   beside it, both the same 344-wide case in the same dark palette. Every
   other feature on this bench is a document in a frame, and this one
   deliberately is not: it has no iframe and nothing of its own to load, so
   it is driven from out here (a file dropped on it, a tracing painted onto
   the wall, a store to keep) rather than adopted by frames.js. The export's
   markup is transcribed below with classes in place of its inline styles —
   see THE SIDE PANELS in lab.css, which is that design's own numbers — and
   the LAB TOOLS strip it mocks up is left out, since the real dock is right
   there.

   RE-DRAWN BY THE 2026-09-08 EXPORT. The table was a 1270-wide cream machine
   with four screws, a grill and three columns; that export redrew it as this
   panel — one scrolling column, the dials stacked, the ink-flow gauge stood
   beside TRACE IT, and THE FLAT FILE four pockets across the foot. The
   PIPELINE did not change, and neither did the library or anything that
   reads it: only the case around them. The export still says SAVE SVG and
   THE FLAT FILE, which is the wording from before THE LIBRARY, below.

   THE PIPELINE is lab 1's vectorize.js, lifted whole: the picture is drawn
   into a working canvas capped at MAX_DIM, its opaque pixels clustered into
   a small palette (k-means, seeded k-means++), every pixel assigned to its
   nearest colour, each colour's mask walked into closed loops by marching
   squares (foreground 4-connected, so two regions touching at a corner are
   two loops), the loops simplified (collinear removal, then Douglas-Peucker)
   with specks dropped, and one <path fill-rule="evenodd"> per colour, largest
   first. The one change: SMOOTHING is the dial's percentage, mapped onto the
   0–5 the pipeline was tuned at.

   THE LIBRARY is Lab.store('flatfile') — the name stays the store's own, so
   an existing save keeps its tracings — a list of tracings, each its paths
   and its size, kept on this device with everything else the dock makes and
   answering to 'reset data'. A tracing is a few dozen KB and localStorage is
   a few MB, so the library is not bottomless — and Lab.store's save swallows
   a quota error, so after every filing this reads the key back and CHECKS
   the tracing is actually there, and says plainly when it is not rather than
   showing a slot that would be empty after a reload.

   THE LIBRARY, SINCE 2026-09-04. A pocket is picked up, not pressed: DRAG a
   tracing out of the library and let it go on the paper and it is stamped
   where it lands (Wall.stampAt), at the size the options row says. A CLICK
   on a pocket opens THE VIEWER — the tracing large, on the light table's
   own checker, with its name and its count — and that is the only place
   the × lives: taking a tracing out of the library takes its stamps off the
   paper with it, which is not a thing to do by brushing a thumbnail. The
   viewer also puts the tracing on the pointer (ON THE POINTER, as before:
   click the paper to stamp it there) and takes it off again. Download is
   gone: a tracing lives in the library and on the paper, and a file on the
   desktop was a third place for it to be wrong.

   A STAMPED TRACING IS A PIECE OF THE WALL — wall.js's item k:'i', which
   names the tracing rather than copying it, and paints its paths at the size
   the options row says. So the artwork lives in one place: take a tracing
   out of the library and its stamps come off the paper with it, which the ×
   says. Nothing here is saved but the library itself; what is on the
   pointer, the dials and the picture on the table are a mood, not a
   document. */

window.Tracer = (function () {
  if (!window.Lab) return null;
  const $ = id => document.getElementById(id);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g,
    c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const MAX_DIM = 640;       // longest edge of the working grid — the trace's real resolution
  const ALPHA_T = 16;        // pixels this transparent or more are background, never traced
  const SAMPLE_CAP = 3000;   // pixels sampled for k-means; the full image is only ever nearest-assigned
  const SLOTS = 4;           // the flat file always shows at least this many pockets — one row of the export's four

  const store = Lab.store('flatfile', () => ({ list: [] }));
  const S = () => store.get();
  const byId = new Map();
  const index = () => { byId.clear(); S().list.forEach(f => byId.set(f.id, f)); };
  index();

  const work = document.createElement('canvas');
  const workCtx = work.getContext('2d', { willReadFrequently: true });

  let panel = null, on = false;
  let armedId = null;                    // the tracing on the pointer — a mood, not saved
  let objectUrl = null, baseName = 'trace', workImageData = null, hasImage = false;
  let last = null;                       // the tracing on the light table: { d, w, h, colors, paths }
  let view = 'original', retraceT = 0, tracing = false;
  let autoFile = false;                  // a picture dropped straight on the library: file it once it traces

  /* ── the panel ───────────────────────────────────────────────────────────
     Built once, the first time the tool is picked up. Lab.register() (see
     tool(), below) is what makes it a gizmo — dragged, piled, picked like the
     eighty-four documents — and that is deferred to the tool's first real
     OPEN rather than done here, so a bench nobody ever hands the image tool
     to never carries a 'tracer' entry in Lab.gizmos at all. */
  function build() {
    if (panel) return panel;
    panel = document.createElement('div');
    panel.id = 'tracer';
    panel.className = 'tracer lab-panel';
    panel.dataset.gizmo = 'tracer';
    panel.hidden = true;
    panel.setAttribute('aria-label', 'the tracing table');
    panel.innerHTML =
      '<div class="lp-bar">' +
        '<div class="lp-plate">THE TRACING TABLE</div>' +
        '<div class="lp-gap"></div>' +
        '<button type="button" class="lp-x" id="tr-x" title="put the tool down">×</button>' +
      '</div>' +
      '<div class="lp-body">' +
        '<div class="lp-tag">01 LAY IT DOWN</div>' +
        '<label class="tr-drop" id="tr-drop" for="tr-file">' +
          '<input type="file" id="tr-file" accept="image/*" hidden>' +
          '<span class="tr-drop-empty" id="tr-drop-empty">' +
            '<i class="tr-pic"><b></b><u></u><s></s></i>' +
            '<strong>drop a picture here<br><small>or click to browse · any image</small></strong>' +
          '</span>' +
          '<span class="tr-drop-full" id="tr-drop-full" hidden><img id="tr-thumb" alt="the picture on the table"><em>LOADED</em></span>' +
        '</label>' +
        '<div class="lp-tag">02 THE DIALS</div>' +
        '<div class="tr-dial"><div class="tr-dial-top"><span>COLORS</span><b id="tr-colors-out">06</b></div>' +
          '<input type="range" id="tr-colors" min="2" max="12" value="6" aria-label="colours"></div>' +
        '<div class="tr-dial"><div class="tr-dial-top"><span>SMOOTHING</span><b id="tr-smooth-out">50%</b></div>' +
          '<input type="range" id="tr-smooth" min="0" max="100" value="50" aria-label="smoothing"></div>' +
        /* TRACE IT, with the ink-flow gauge stood in its own box beside it —
           the export's arrangement, and where the old machine's INK FLOW
           panel went. The needle still swings while a trace runs; what that
           panel had to SAY has moved to the note at the foot of the body. */
        '<div class="tr-run">' +
          '<button type="button" class="tr-go" id="tr-trace" disabled>TRACE IT</button>' +
          '<div class="tr-flow" title="ink flow"><i class="tr-gauge"><b id="tr-needle"></b><u></u></i></div>' +
        '</div>' +
        '<div class="lp-tag">03 LIGHT TABLE</div>' +
        '<div class="tr-tabs">' +
          '<button type="button" class="tr-tab on" data-view="original">ORIGINAL</button>' +
          '<button type="button" class="tr-tab" data-view="traced">TRACED</button>' +
        '</div>' +
        '<div class="tr-table">' +
          '<i class="tr-glow"></i>' +
          '<div class="tr-lamp"><i></i><b><u></u></b></div>' +
          '<img id="tr-original" alt="the picture you laid down" hidden>' +
          '<div id="tr-traced" hidden></div>' +
          '<div class="tr-empty" id="tr-empty"><span id="tr-empty-text">the picture you lay down shows up here</span><i></i></div>' +
          '<div class="tr-paths" id="tr-paths">0 PATHS</div>' +
        '</div>' +
        /* the export draws SAVE SVG here and a note under it saying to save
           the tracing as an SVG; both are the wording from before THE
           LIBRARY, and this still does not download — see THE LIBRARY, SINCE
           2026-09-04 above. Same two buttons, same shapes, the words this
           table earned. */
        '<div class="tr-row2">' +
          '<button type="button" class="tr-btn" id="tr-save" disabled title="file the tracing in the library">SAVE TO LIBRARY</button>' +
          '<button type="button" class="tr-btn" id="tr-clear" disabled>CLEAR</button>' +
        '</div>' +
        '<div class="tr-note"><i></i>1. lay down a picture · 2. set the dials · 3. TRACE IT' +
          '<small id="tr-status">drop a picture to begin</small></div>' +
      '</div>' +
      '<div class="lp-foot" id="tr-file-box">' +
        '<div class="lp-head">' +
          '<div class="lp-plate">THE FLAT FILE</div>' +
          '<div class="lp-rule"></div>' +
          '<div class="lp-serial">KN-0016</div>' +
        '</div>' +
        '<div class="tr-slots" id="tr-slots"></div>' +
        '<div class="lp-fine" id="tr-foot">finished tracings pile up here.</div>' +
      '</div>' +
      /* THE VIEWER: one tracing, large, over the whole screen rather than
         over the panel — the panel is 344 wide now, and "large" inside it
         would be smaller than the pocket it came from. It is a fixed child
         of the panel so that putting the tool down takes it away too. */
      '<div class="tr-viewer" id="tr-viewer" hidden>' +
        '<div class="tr-viewer-card">' +
          '<div class="lp-bar tr-viewer-bar">' +
            '<div class="lp-plate" id="tr-viewer-name">TRACING</div>' +
            '<div class="lp-gap"></div>' +
            '<div class="lp-serial" id="tr-viewer-meta"></div>' +
            '<button type="button" class="lp-x" id="tr-viewer-close" title="back to the library">×</button>' +
          '</div>' +
          '<div class="tr-viewer-table" id="tr-viewer-table"></div>' +
          '<div class="tr-viewer-row">' +
            '<button type="button" class="tr-btn" id="tr-viewer-arm">ON THE POINTER</button>' +
            '<button type="button" class="tr-btn tr-btn-x" id="tr-viewer-remove" title="take it out of the library — its stamps come off the paper too">TAKE IT OUT ×</button>' +
          '</div>' +
          '<div class="lp-fine">drag a pocket straight onto the paper to stamp it there.</div>' +
        '</div>' +
      '</div>';
    /* the body, not the world: this is chrome sitting over the bench, so it
       is outside the sheet the camera moves and is never re-rastered by a
       zoom the way a panel on the paper had to be. */
    document.body.appendChild(panel);
    // the case can be pulled wider by its right edge, and remembers how wide
    if (window.Lab && Lab.gripPanel) Lab.gripPanel(panel);
    wire();
    renderSlots();
    return panel;
  }

  const say = msg => { const s = $('tr-status'); if (s) s.textContent = msg; };
  // the ink-flow needle: at rest to the left, swung over while a trace runs
  const needle = deg => { const n = $('tr-needle'); if (n) n.style.transform = 'rotate(' + deg + 'deg)'; };

  function flash(msg) {
    const d = $('tr-drop');
    d.classList.remove('bad'); void d.offsetWidth; d.classList.add('bad');
    say(msg);
  }

  // ── intake ─────────────────────────────────────────────────────────────
  function drawWork(img) {
    const iw = img.naturalWidth, ih = img.naturalHeight;
    const scale = Math.min(1, MAX_DIM / Math.max(iw, ih));
    const w = Math.max(1, Math.round(iw * scale)), h = Math.max(1, Math.round(ih * scale));
    work.width = w; work.height = h;
    workCtx.clearRect(0, 0, w, h);
    workCtx.drawImage(img, 0, 0, w, h);
    return workCtx.getImageData(0, 0, w, h);
  }

  function load(file, filedStraightAway) {
    if (!file) return;
    if (!/^image\//.test(file.type) && !/\.(png|jpe?g|gif|webp|bmp|svg|avif)$/i.test(file.name || '')) {
      flash('that does not look like a picture'); return;
    }
    autoFile = !!filedStraightAway;
    say('reading…');
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    const url = URL.createObjectURL(file);
    objectUrl = url;
    const img = new Image();
    img.onload = () => {
      baseName = (file.name || 'trace').replace(/\.[^.]+$/, '') || 'trace';
      $('tr-thumb').src = url;
      $('tr-original').src = url;
      $('tr-drop-empty').hidden = true; $('tr-drop-full').hidden = false;
      workImageData = drawWork(img);
      hasImage = true;
      $('tr-trace').disabled = false; $('tr-clear').disabled = false;
      say(img.naturalWidth + '×' + img.naturalHeight + ' laid down · tracing at ' + work.width + '×' + work.height);
      setView('original');
      runTrace();
    };
    img.onerror = () => flash('could not read that file');
    img.src = url;
  }

  function clear() {
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    objectUrl = null; hasImage = false; workImageData = null; last = null; autoFile = false;
    $('tr-thumb').removeAttribute('src'); $('tr-original').removeAttribute('src');
    $('tr-drop-empty').hidden = false; $('tr-drop-full').hidden = true;
    $('tr-traced').innerHTML = '';
    $('tr-trace').disabled = true; $('tr-clear').disabled = true; $('tr-save').disabled = true;
    $('tr-paths').textContent = '0 PATHS';
    say('drop a picture to begin');
    setView('original');
  }

  // ── the light table's two views ────────────────────────────────────────
  function setView(which) {
    view = which;
    panel.querySelectorAll('.tr-tab').forEach(b => b.classList.toggle('on', b.dataset.view === which));
    const orig = $('tr-original'), traced = $('tr-traced'), empty = $('tr-empty');
    orig.hidden = !(which === 'original' && hasImage);
    traced.hidden = !(which === 'traced' && last);
    empty.hidden = !orig.hidden || !traced.hidden;
    $('tr-empty-text').textContent = which === 'original'
      ? 'the picture you lay down shows up here' : 'a traced picture will show up here';
  }

  // ── colour quantizing: k-means++ seeding, Lloyd's algorithm on a sample ──
  function sampleOpaque(data, w, h) {
    const n = w * h, idx = [];
    for (let i = 0; i < n; i++) if (data[i * 4 + 3] >= ALPHA_T) idx.push(i);
    const samples = [];
    const stride = Math.max(1, Math.floor(idx.length / SAMPLE_CAP));
    for (let j = 0; j < idx.length; j += stride) {
      const o = idx[j] * 4;
      samples.push([data[o], data[o + 1], data[o + 2]]);
    }
    return samples;
  }

  function kMeansPalette(samples, K) {
    const n = samples.length;
    K = Math.max(1, Math.min(K, n));
    const centroids = [samples[(Math.random() * n) | 0].slice()];
    const dist2 = new Array(n).fill(Infinity);
    while (centroids.length < K) {
      let total = 0;
      const c = centroids[centroids.length - 1];
      for (let i = 0; i < n; i++) {
        const s = samples[i];
        const dr = s[0] - c[0], dg = s[1] - c[1], db = s[2] - c[2];
        const d = dr * dr + dg * dg + db * db;
        if (d < dist2[i]) dist2[i] = d;
        total += dist2[i];
      }
      let r = Math.random() * total, pick = n - 1;
      for (let i = 0; i < n; i++) { r -= dist2[i]; if (r <= 0) { pick = i; break; } }
      centroids.push(samples[pick].slice());
    }
    for (let iter = 0; iter < 8; iter++) {
      const sums = centroids.map(() => [0, 0, 0, 0]);
      for (let i = 0; i < n; i++) {
        const s = samples[i];
        let best = 0, bestD = Infinity;
        for (let k = 0; k < centroids.length; k++) {
          const c = centroids[k];
          const dr = s[0] - c[0], dg = s[1] - c[1], db = s[2] - c[2];
          const d = dr * dr + dg * dg + db * db;
          if (d < bestD) { bestD = d; best = k; }
        }
        const sm = sums[best]; sm[0] += s[0]; sm[1] += s[1]; sm[2] += s[2]; sm[3]++;
      }
      for (let k = 0; k < centroids.length; k++) if (sums[k][3] > 0)
        centroids[k] = [sums[k][0] / sums[k][3], sums[k][1] / sums[k][3], sums[k][2] / sums[k][3]];
    }
    return centroids.map(c => c.map(v => Math.max(0, Math.min(255, Math.round(v)))));
  }

  function labelPixels(data, w, h, centroids) {
    const n = w * h, labels = new Int16Array(n).fill(-1);
    for (let i = 0; i < n; i++) {
      const o = i * 4;
      if (data[o + 3] < ALPHA_T) continue;
      let best = 0, bestD = Infinity;
      for (let k = 0; k < centroids.length; k++) {
        const c = centroids[k];
        const dr = data[o] - c[0], dg = data[o + 1] - c[1], db = data[o + 2] - c[2];
        const d = dr * dr + dg * dg + db * db;
        if (d < bestD) { bestD = d; best = k; }
      }
      labels[i] = best;
    }
    return labels;
  }

  // ── boundary tracing: marching squares, foreground taken as 4-connected ──
  function traceLoops(mask, w, h) {
    const pixelAt = (x, y) => (x >= 0 && x < w && y >= 0 && y < h) ? mask[y * w + x] : 0;
    const STEP = {
      N: (x, y) => [x, y - 1], S: (x, y) => [x, y + 1],
      E: (x, y) => [x + 1, y], W: (x, y) => [x - 1, y]
    };
    const OPP = { N: 'S', S: 'N', E: 'W', W: 'E' };

    function info(cx, cy) {
      const a = pixelAt(cx - 1, cy - 1), b = pixelAt(cx, cy - 1), c = pixelAt(cx - 1, cy), d = pixelAt(cx, cy);
      const dirs = [];
      if (a !== b) dirs.push('N');
      if (c !== d) dirs.push('S');
      if (b !== d) dirs.push('E');
      if (a !== c) dirs.push('W');
      return { a, dirs };
    }
    function nextDir(cx, cy, fromDir) {
      const { a, dirs } = info(cx, cy);
      if (dirs.length === 4)
        return a === 0 ? { N: 'E', E: 'N', W: 'S', S: 'W' }[fromDir] : { N: 'W', W: 'N', S: 'E', E: 'S' }[fromDir];
      return dirs[0] === fromDir ? dirs[1] : dirs[0];
    }

    const used = new Set();
    const key = (x, y, d) => x + '_' + y + '_' + d;
    const loops = [];
    const guardMax = 6 * (w + 1) * (h + 1) + 32;

    for (let cy = 0; cy <= h; cy++) {
      for (let cx = 0; cx <= w; cx++) {
        const { dirs } = info(cx, cy);
        for (const d0 of dirs) {
          if (used.has(key(cx, cy, d0))) continue;
          const pts = [[cx, cy]];
          let x = cx, y = cy, dir = d0, guard = 0;
          while (true) {
            used.add(key(x, y, dir));
            const [nx, ny] = STEP[dir](x, y);
            const arrive = OPP[dir];
            used.add(key(nx, ny, arrive));   // the same edge, seen from the far end — must not be re-walked either
            const nd = nextDir(nx, ny, arrive);
            pts.push([nx, ny]);
            if (nx === cx && ny === cy && nd === d0) break;
            x = nx; y = ny; dir = nd;
            if (++guard > guardMax) break;   // circuit breaker; should never trip
          }
          loops.push(pts);
        }
      }
    }
    return loops;
  }

  // ── simplifying a closed loop: exact collinear removal, then Douglas-Peucker ──
  function dedupeCollinear(pts) {
    const n = pts.length - 1;   // pts[0] === pts[n]
    if (n < 3) return pts;
    const out = [];
    for (let i = 0; i < n; i++) {
      const prev = pts[(i - 1 + n) % n], cur = pts[i], next = pts[(i + 1) % n];
      const dx1 = cur[0] - prev[0], dy1 = cur[1] - prev[1];
      const dx2 = next[0] - cur[0], dy2 = next[1] - cur[1];
      if (dx1 * dy2 - dy1 * dx2 !== 0 || dx1 * dx2 + dy1 * dy2 <= 0) out.push(cur);
    }
    if (out.length < 3) return pts;
    out.push(out[0]);
    return out;
  }

  function perpDist(p, a, b) {
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const len2 = dx * dx + dy * dy;
    if (len2 === 0) return Math.hypot(p[0] - a[0], p[1] - a[1]);
    let t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / len2;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
  }
  function douglasPeucker(pts, tol) {
    if (pts.length < 3 || tol <= 0) return pts;
    function rec(lo, hi) {
      let maxD = 0, idx = -1;
      for (let i = lo + 1; i < hi; i++) {
        const d = perpDist(pts[i], pts[lo], pts[hi]);
        if (d > maxD) { maxD = d; idx = i; }
      }
      if (maxD > tol && idx !== -1) return rec(lo, idx).slice(0, -1).concat(rec(idx, hi));
      return [pts[lo], pts[hi]];
    }
    return rec(0, pts.length - 1);
  }

  function shoelaceArea(pts) {
    let a = 0;
    for (let i = 0; i < pts.length - 1; i++) a += pts[i][0] * pts[i + 1][1] - pts[i + 1][0] * pts[i][1];
    return a / 2;
  }

  function simplifyLoop(loop, tol) {
    let p = dedupeCollinear(loop);
    if (tol > 0) p = douglasPeucker(p, tol);
    return p.length >= 4 ? p : null;
  }

  // ── assembling the paths ───────────────────────────────────────────────
  const rgbToHex = c => '#' + c.map(v => v.toString(16).padStart(2, '0')).join('');

  function buildColorPath(mask, w, h, hex, dpTol, minArea) {
    const rawLoops = traceLoops(mask, w, h);
    let d = '', area = 0, shapes = 0;
    for (const loop of rawLoops) {
      const simp = simplifyLoop(loop, dpTol);
      if (!simp) continue;
      const a = Math.abs(shoelaceArea(simp));
      if (a < minArea) continue;
      area += a; shapes++;
      d += 'M' + simp[0][0] + ' ' + simp[0][1];
      for (let i = 1; i < simp.length - 1; i++) d += 'L' + simp[i][0] + ' ' + simp[i][1];
      d += 'Z';
    }
    return shapes ? { hex, d, area, shapes } : null;
  }

  function vectorize(imageData, K, smooth) {
    const { data, width: w, height: h } = imageData;
    const samples = sampleOpaque(data, w, h);
    if (!samples.length) return null;

    const centroids = kMeansPalette(samples, K);
    const labels = labelPixels(data, w, h, centroids);
    const dpTol = smooth * 0.55, minArea = 1.5 + smooth * smooth * 1.2;

    const mask = new Uint8Array(w * h);
    const parts = [];
    for (let k = 0; k < centroids.length; k++) {
      let count = 0;
      for (let i = 0; i < mask.length; i++) { const v = labels[i] === k ? 1 : 0; mask[i] = v; if (v) count++; }
      if (!count) continue;
      const part = buildColorPath(mask, w, h, rgbToHex(centroids[k]), dpTol, minArea);
      if (part) parts.push(part);
    }
    parts.sort((a, b) => b.area - a.area);

    let paths = 0; parts.forEach(p => paths += p.shapes);
    const d = parts.map(p => '<path fill-rule="evenodd" fill="' + p.hex + '" d="' + p.d + '"/>').join('');
    return { d, colors: parts.length, paths, w, h };
  }

  // the tracing as a file: one svg, sized as the working grid was
  const svgOf = f => '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + f.w + ' ' + f.h +
    '" width="' + f.w + '" height="' + f.h + '">' + f.d + '</svg>';
  const thumbOf = f => '<svg viewBox="0 0 ' + f.w + ' ' + f.h + '" preserveAspectRatio="xMidYMid meet" aria-hidden="true">' + f.d + '</svg>';

  function runTrace() {
    if (!workImageData || tracing) return;
    tracing = true;
    say('tracing…'); needle(40);
    setTimeout(() => {
      try {
        const K = +$('tr-colors').value, smooth = +$('tr-smooth').value / 100 * 5;
        const result = vectorize(workImageData, K, smooth);
        if (!result) {
          autoFile = false;
          say('nothing to trace — that picture looks fully transparent');
          $('tr-save').disabled = true; $('tr-paths').textContent = '0 PATHS';
          return;
        }
        last = result;
        $('tr-traced').innerHTML = thumbOf(result);
        $('tr-paths').textContent = result.paths + ' PATH' + (result.paths === 1 ? '' : 'S');
        const kb = new Blob([result.d]).size / 1024;
        say(result.colors + ' colours · ' + result.paths + ' paths · ' + kb.toFixed(1) + ' KB');
        $('tr-save').disabled = false;
        setView('traced');
        // a picture dropped straight on the library: this is the one trace it
        // was waiting for, not every retrace the dials cause after
        if (autoFile) { autoFile = false; file(); }
      } finally {
        tracing = false; needle(-32);
      }
    }, 20);
  }

  function scheduleTrace() {
    if (!hasImage) return;
    clearTimeout(retraceT);
    retraceT = setTimeout(runTrace, 180);
  }

  // ── the library ────────────────────────────────────────────────────────
  /* Filing is the one write here, and the one that can quietly fail: the
     store's save swallows a quota error, so the key is read back and the id
     looked for. Not there means not kept — the entry comes back out of the
     list and the table says so, rather than showing a pocket that would be
     empty on the next load. */
  function file() {
    if (!last) return;
    const id = Lab.uid();
    const entry = { id, name: baseName, w: last.w, h: last.h, d: last.d, colors: last.colors, paths: last.paths, at: Date.now() };
    store.update(st => { st.list.push(entry); });
    let kept = false;
    try { kept = (localStorage.getItem('knoll-ironhive:flatfile') || '').indexOf('"' + id + '"') >= 0; } catch (e) {}
    if (!kept) {
      store.update(st => { st.list = st.list.filter(f => f.id !== id); });
      index();
      say('no room in the library — take something out first');
      $('tr-file-box').classList.remove('tr-nudge'); void $('tr-file-box').offsetWidth; $('tr-file-box').classList.add('tr-nudge');
      return;
    }
    index();
    armedId = id;                        // what you just filed is what you are about to stamp
    renderSlots();
    say('filed as ' + String(S().list.length).padStart(2, '0') + ' — click the paper to stamp it');
    if (window.Wall && Wall.syncOpts) Wall.syncOpts();
  }

  function unfile(id) {
    store.update(st => { st.list = st.list.filter(f => f.id !== id); });
    index();
    if (armedId === id) armedId = null;
    if (viewing === id) closeViewer();
    renderSlots();
    if (window.Wall && Wall.paint) Wall.paint();          // its stamps come off the paper with it
    if (window.Wall && Wall.syncOpts) Wall.syncOpts();
  }

  function arm(id) {
    armedId = armedId === id ? null : id;  // press the one on the pointer again and it comes off
    renderSlots(); syncViewer();
    say(armedId ? 'on the pointer — click the paper to stamp it' : 'pick a tracing from the library');
    if (window.Wall && Wall.syncOpts) Wall.syncOpts();
  }

  function renderSlots() {
    const box = $('tr-slots'); if (!box) return;
    const list = S().list;
    const n = Math.max(SLOTS, Math.ceil(list.length / 4) * 4);   // whole rows of four
    let html = '';
    for (let i = 0; i < n; i++) {
      const f = list[i], num = String(i + 1).padStart(2, '0');
      if (!f) { html += '<div class="tr-slot">' + num + '</div>'; continue; }
      html += '<div class="tr-slot tr-filled' + (f.id === armedId ? ' on' : '') + '" data-id="' + esc(f.id) + '" role="button" tabindex="0"' +
        ' title="' + esc(f.name) + ' · ' + f.colors + ' colours · ' + f.paths + ' paths\nclick to see it large · drag it onto the paper to stamp it">' +
        thumbOf(f) +
        '<span class="tr-on">ON</span>' +
        '<span class="tr-slot-n">' + num + '</span></div>';
    }
    box.innerHTML = html;
    $('tr-foot').textContent = list.length
      ? list.length + (list.length === 1 ? ' tracing' : ' tracings') + ' in the library — drag one onto the paper, or click it to see it large.'
      : 'finished tracings pile up here.';
  }

  // ── THE VIEWER ──────────────────────────────────────────────────────────
  let viewing = null;
  function showLarge(id) {
    const f = byId.get(id); if (!f) return;
    viewing = id;
    $('tr-viewer-name').textContent = (f.name || 'tracing').toUpperCase();
    $('tr-viewer-meta').textContent = f.colors + ' COLOURS · ' + f.paths + ' PATHS';
    $('tr-viewer-table').innerHTML = thumbOf(f);
    syncViewer();
    $('tr-viewer').hidden = false;
  }
  function syncViewer() {
    if (!viewing) return;
    const b = $('tr-viewer-arm');
    const on = armedId === viewing;
    b.textContent = on ? 'OFF THE POINTER' : 'ON THE POINTER';
    b.classList.toggle('on', on);
  }
  function closeViewer() { viewing = null; $('tr-viewer').hidden = true; }

  // ── DRAGGING A POCKET ONTO THE PAPER ──────────────────────────────────────
  /* A press on a pocket is either a click (the viewer) or the start of a
     carry: past six pixels a ghost of the tracing follows the pointer, and
     letting go over the paper — anywhere that is not this table — stamps
     it there through Wall.stampAt, the same write the click-to-stamp makes.
     Pointer events, not HTML drag-and-drop: the bench is all pointer
     events, and a native drag would fight lab.js for the wheel and the
     capture. lab.js's own press on the paper is out of the way because the
     image tool is up (a dock tool stops the band; see its pointerdown). */
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
      panel.classList.remove('tr-carrying');
      if (!p.moved) { showLarge(p.id); return; }        // a press that went nowhere: look at it
      if (e.type === 'pointercancel') return;
      // over the paper, and not over the table itself
      const t = document.elementFromPoint(e.clientX, e.clientY);
      if (!t || t.closest('#tracer') || !t.closest('#bench')) { say('let go over the paper to stamp it'); return; }
      const w = Lab.toWorld(e.clientX, e.clientY);
      const f = byId.get(p.id);
      if (f && window.Wall && Wall.stampAt && Wall.stampAt(f, w.x, w.y)) say('stamped — drag another, or click the paper with one on the pointer');
    };
    const move = e => {
      if (!press) return;
      const dx = e.clientX - press.x, dy = e.clientY - press.y;
      if (!press.moved) {
        if (Math.abs(dx) + Math.abs(dy) < SLOP) return;
        press.moved = true;
        const f = byId.get(press.id); if (!f) { end(e); return; }
        ghost = document.createElement('div');
        ghost.className = 'lp-ghost';
        ghost.innerHTML = thumbOf(f);
        document.body.appendChild(ghost);
        panel.classList.add('tr-carrying');
      }
      ghost.style.left = e.clientX + 'px'; ghost.style.top = e.clientY + 'px';
    };
    box.addEventListener('pointerdown', e => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      const s = e.target.closest('.tr-slot.tr-filled'); if (!s) return;
      e.preventDefault(); e.stopPropagation();
      press = { id: s.dataset.id, x: e.clientX, y: e.clientY, moved: false };
      window.addEventListener('pointermove', move, true);
      window.addEventListener('pointerup', end, true);
      window.addEventListener('pointercancel', end, true);
    });
  }

  // ── wiring ─────────────────────────────────────────────────────────────
  function wire() {
    const drop = $('tr-drop');
    ['dragenter', 'dragover'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add('over'); }));
    ['dragleave', 'drop'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove('over'); }));
    drop.addEventListener('drop', e => {
      const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
      if (f) load(f);
    });
    // a picture dragged straight onto the library, skipping the table: the
    // same intake as '01 LAY IT DOWN', but filed the moment it finishes tracing
    const fileBox = $('tr-file-box');
    ['dragenter', 'dragover'].forEach(ev => fileBox.addEventListener(ev, e => { e.preventDefault(); fileBox.classList.add('over'); }));
    ['dragleave', 'drop'].forEach(ev => fileBox.addEventListener(ev, e => { e.preventDefault(); fileBox.classList.remove('over'); }));
    fileBox.addEventListener('drop', e => {
      const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
      if (f) load(f, true);
    });
    $('tr-file').addEventListener('change', e => {
      const f = e.target.files && e.target.files[0];
      if (f) load(f);
      e.target.value = '';
    });
    // a picture on the clipboard, pasted while the table is up
    document.addEventListener('paste', e => {
      if (!on || !e.clipboardData) return;
      const f = Array.prototype.slice.call(e.clipboardData.files || []).find(x => /^image\//.test(x.type));
      if (f) { e.preventDefault(); load(f); }
    });

    $('tr-clear').addEventListener('click', clear);
    $('tr-trace').addEventListener('click', runTrace);
    $('tr-save').addEventListener('click', file);
    $('tr-colors').addEventListener('input', e => { $('tr-colors-out').textContent = String(e.target.value).padStart(2, '0'); scheduleTrace(); });
    $('tr-smooth').addEventListener('input', e => { $('tr-smooth-out').textContent = e.target.value + '%'; scheduleTrace(); });
    panel.querySelectorAll('.tr-tab').forEach(b => b.addEventListener('click', () => setView(b.dataset.view)));

    $('tr-x').addEventListener('click', () => { if (window.Wall) Wall.setTool('move'); });

    wireDrag($('tr-slots'));                     // a press is a click (the viewer) or a carry (a stamp)
    $('tr-slots').addEventListener('keydown', e => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      const s = e.target.closest('.tr-slot.tr-filled'); if (s) { showLarge(s.dataset.id); e.preventDefault(); }
    });
    $('tr-viewer-close').addEventListener('click', closeViewer);
    $('tr-viewer').addEventListener('pointerdown', e => { if (e.target === $('tr-viewer')) closeViewer(); e.stopPropagation(); });
    $('tr-viewer-arm').addEventListener('click', () => { if (viewing) { arm(viewing); syncViewer(); } });
    $('tr-viewer-remove').addEventListener('click', () => { if (viewing) { const id = viewing; closeViewer(); unfile(id); say('taken out of the library — its stamps came off the paper with it'); } });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && viewing) closeViewer(); });
  }

  // ── what the dock asks ─────────────────────────────────────────────────
  /* Up with the tool, away with it — the picture on the table and the one on
     the pointer both stay put in between, the way the dials do. There is no
     placing to do: the panel is fixed to the left of the screen and is in
     the same spot every time it comes up, which is the whole point of it
     being chrome (IT IS THE USER'S UI, NOT SCENERY, above). Nothing is built
     until the first real open, so a tool nobody ever picks up costs the boot
     nothing. */
  function tool(up) {
    on = !!up;
    build().hidden = !on;
    if (on) renderSlots();
  }
  const armed = () => (armedId && byId.get(armedId)) || null;
  const get = id => byId.get(id) || null;
  // a click on the paper with nothing on the pointer: the table says why
  function nudge() {
    if (!panel) return;
    say(S().list.length ? 'pick a tracing from the library first' : 'trace something first — it will show up in the library');
    const fb = $('tr-file-box');
    fb.classList.remove('tr-nudge'); void fb.offsetWidth; fb.classList.add('tr-nudge');
  }

  store.on(() => { index(); if (panel) renderSlots(); if (window.Wall && Wall.paint) Wall.paint(); });   // reset data, and the lot

  return { tool, armed, get, nudge, store, get on() { return on; } };
})();
