/* ─── THE TRACING TABLE ────────────────────────────────────────────────────
   Drop a picture in, get a vector trace out. Entirely client-side: the file
   is read into a canvas, never uploaded anywhere.

   THE PIPELINE
     1. the picture is drawn into a working canvas, capped at MAX_DIM on its
        longest edge — the trace is only ever as detailed as this grid, and
        capping it is what keeps the rest of the pipeline fast
     2. its opaque pixels are clustered into a small palette (k-means, seeded
        with k-means++) — this is the "COLORS" knob
     3. every pixel is assigned to its nearest palette colour
     4. each colour's pixels become a binary mask, and each mask is walked
        into closed polygon loops by MARCHING SQUARES — not per-cell isolines,
        but boundary tracing: every grid edge where the mask changes value is
        a segment of some loop, and loops are found by chaining shared
        corners, with the two checkerboard/saddle cases resolved by treating
        the foreground as 4-connected (the standard tie-break, so two
        diagonal-touching regions of the same colour trace as two separate
        loops rather than one bowtie)
     5. loops are simplified (exact collinear-point removal, then
        Douglas-Peucker) and specks below an area threshold are dropped —
        both driven by the "SMOOTHING" knob
     6. one <path fill-rule="evenodd"> per colour, largest area first, is
        strung into an SVG whose viewBox matches the working canvas

   Nothing here is saved — reload and the table is bare again. There was
   nothing worth keeping across a reload yet: a trace is a few controls and a
   result, not a history. */

window.Vectorizer = (function () {
  const $ = id => document.getElementById(id);
  const gz = $('gz-vectorize');
  if (!gz) return;

  const drop = $('vz-drop'), fileIn = $('vz-file'), thumb = $('vz-thumb');
  const hopEmpty = drop.querySelector('.hopper-empty'), hopFull = drop.querySelector('.hopper-full');
  const clearBtn = $('vz-clear'), traceBtn = $('vz-trace'), downloadBtn = $('vz-download');
  const colorsIn = $('vz-colors'), colorsOut = $('vz-colors-out');
  const smoothIn = $('vz-smooth'), smoothOut = $('vz-smooth-out');
  const statusEl = $('vz-status');
  const tabOriginal = $('vz-tab-original'), tabTraced = $('vz-tab-traced');
  const originalImg = $('vz-original'), tracedHost = $('vz-traced'), placeholder = $('vz-placeholder');

  const MAX_DIM = 640;       // longest edge of the working grid — the trace's real resolution
  const ALPHA_T = 16;        // pixels this transparent or more are background, never traced
  const SAMPLE_CAP = 3000;   // pixels sampled for k-means; the full image is only ever nearest-assigned, not clustered

  const work = document.createElement('canvas');
  const workCtx = work.getContext('2d', { willReadFrequently: true });

  let objectUrl = null, baseName = 'trace', workImageData = null, lastSvg = null, hasImage = false;
  let retraceT = null;

  // ── intake ────────────────────────────────────────────────────────────
  function flash(msg) {
    drop.classList.remove('bad'); void drop.offsetWidth; drop.classList.add('bad');
    statusEl.textContent = msg;
  }

  function drawWork(img) {
    const iw = img.naturalWidth, ih = img.naturalHeight;
    const scale = Math.min(1, MAX_DIM / Math.max(iw, ih));
    const w = Math.max(1, Math.round(iw * scale)), h = Math.max(1, Math.round(ih * scale));
    work.width = w; work.height = h;
    workCtx.clearRect(0, 0, w, h);
    workCtx.drawImage(img, 0, 0, w, h);
    return workCtx.getImageData(0, 0, w, h);
  }

  function loadImage(file) {
    if (!/^image\//.test(file.type) && !/\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(file.name || '')) {
      flash('that doesn’t look like a picture'); return;
    }
    statusEl.textContent = 'reading…';
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    const url = URL.createObjectURL(file);
    objectUrl = url;
    const img = new Image();
    img.onload = () => {
      baseName = (file.name || 'trace').replace(/\.[^.]+$/, '') || 'trace';
      thumb.src = url;
      originalImg.src = url;
      hopEmpty.hidden = true; hopFull.hidden = false;
      workImageData = drawWork(img);
      hasImage = true;
      traceBtn.disabled = false; clearBtn.disabled = false;
      statusEl.textContent = img.naturalWidth + '×' + img.naturalHeight +
        ' loaded · tracing at ' + work.width + '×' + work.height;
      setTab('original');
      runTrace();
    };
    img.onerror = () => flash('could’t read that file');
    img.src = url;
  }

  ['dragenter', 'dragover'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add('over'); }));
  ['dragleave', 'drop'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove('over'); }));
  drop.addEventListener('drop', e => {
    const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    if (f) loadImage(f);
  });
  fileIn.addEventListener('change', e => {
    const f = e.target.files && e.target.files[0];
    if (f) loadImage(f);
    e.target.value = '';
  });

  clearBtn.addEventListener('click', () => {
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    objectUrl = null; hasImage = false; workImageData = null; lastSvg = null;
    thumb.removeAttribute('src'); originalImg.removeAttribute('src');
    hopEmpty.hidden = false; hopFull.hidden = true;
    tracedHost.innerHTML = '';
    traceBtn.disabled = true; clearBtn.disabled = true; downloadBtn.disabled = true;
    statusEl.textContent = 'drop a picture to begin';
    setTab('original');
  });

  // ── settings ──────────────────────────────────────────────────────────
  function scheduleTrace() {
    if (!hasImage) return;
    clearTimeout(retraceT);
    retraceT = setTimeout(runTrace, 150);
  }
  colorsIn.addEventListener('input', () => { colorsOut.textContent = colorsIn.value; scheduleTrace(); });
  smoothIn.addEventListener('input', () => { smoothOut.textContent = smoothIn.value; scheduleTrace(); });
  traceBtn.addEventListener('click', runTrace);

  // ── tabs ──────────────────────────────────────────────────────────────
  // the placeholder covers for whichever of the two has nothing to show yet —
  // an <img> with no src still renders its alt text, so hiding it on content
  // rather than just on tab choice matters as much as the tab does.
  function setTab(which) {
    tabOriginal.classList.toggle('on', which === 'original');
    tabTraced.classList.toggle('on', which === 'traced');
    originalImg.hidden = !(which === 'original' && hasImage);
    tracedHost.hidden = !(which === 'traced' && lastSvg);
    placeholder.hidden = originalImg.hidden === false || tracedHost.hidden === false;
  }
  tabOriginal.addEventListener('click', () => setTab('original'));
  tabTraced.addEventListener('click', () => setTab('traced'));

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

  // ── assembling the SVG ────────────────────────────────────────────────
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

    let shapes = 0; parts.forEach(p => shapes += p.shapes);
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + w + ' ' + h + '" width="' + w + '" height="' + h +
      '" style="display:block;max-width:100%;max-height:100%">' +
      parts.map(p => '<path fill-rule="evenodd" fill="' + p.hex + '" d="' + p.d + '"/>').join('') +
      '</svg>';
    return { svg, colors: parts.length, shapes, w, h };
  }

  function runTrace() {
    if (!workImageData) return;
    statusEl.textContent = 'tracing…';
    setTimeout(() => {
      const K = +colorsIn.value, S = +smoothIn.value;
      const result = vectorize(workImageData, K, S);
      if (!result) {
        statusEl.textContent = 'nothing to trace — that picture looks fully transparent';
        downloadBtn.disabled = true;
        return;
      }
      lastSvg = result.svg;
      tracedHost.innerHTML = result.svg;
      const kb = new Blob([result.svg]).size / 1024;
      statusEl.textContent = result.colors + ' colors · ' + result.shapes + ' shapes · ' + kb.toFixed(1) + ' KB';
      downloadBtn.disabled = false;
      setTab('traced');
    }, 0);
  }

  downloadBtn.addEventListener('click', () => {
    if (!lastSvg) return;
    const url = URL.createObjectURL(new Blob([lastSvg], { type: 'image/svg+xml' }));
    const a = document.createElement('a');
    a.href = url; a.download = baseName + '.svg';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });

  return { loadImage, runTrace };
})();
