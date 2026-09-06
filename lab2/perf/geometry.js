'use strict';
/* lab2/perf/geometry.js — record the exact geometry of the standing trees.

   Drives a headed system Chrome (Playwright, channel 'chrome') over the bench
   at http://localhost:4321/lab2/, visits every standing forest section at
   100% so frames.js loads, boots and measures it, and writes down:

     results/geometry-<tag>.json   one record per standing tree: the section's
                                   style (left/top/width/height/z-index), the
                                   Frames.panels entry (natW natH inkX inkY
                                   viewW viewH), the iframe's placement, what
                                   the file said, and the cameras used for
                                   every screenshot
     forest-sizes.json             per kind, for all 23 kinds: the natural size
                                   frames.js measures — at the REST POSE (the
                                   sway seeked to rotate(0), see THE PHASE
                                   below) — plus the in-situ numbers of every
                                   standing tree of that kind, the sway
                                   envelope, and the svg's own facts
     results/<tag>-grove-west.png  the densest west stand at 100%
     results/<tag>-grove-east.png  the densest east stand at 100%
     results/<tag>-closeup-166.png the densest 166% window

   THE PHASE. Every tree is an <svg> with `animation: sway … infinite` on its
   root, and frames.js measures with getBoundingClientRect, which reports the
   box under the CURRENT transform — so natW/natH/inkX/inkY come out a few
   pixels different depending on where in the sway the measurement landed
   (boot, fonts.ready, +700ms: the last one wins). The in-situ numbers are
   recorded as found; the per-kind table is taken with the animation paused
   at rotate(0) so it is reproducible, and the envelope over the extremes is
   recorded alongside.

   The page NEVER autosaves: '**\/_lab2\/**' is routed to a 404 so keep.js
   knocks once, hears nothing and goes quiet. Nothing under site/ is written
   except the files named above.

   usage:  cd C:/Users/bobb9/Desktop/site && node lab2/perf/geometry.js
             [--tag before] [--cams results/geometry-before.json] [--no-inject] [--keep-open]
           --cams reuses the recorded cameras (an after-run reproducing the
           before-run's shots) instead of recomputing them from the trees.
           --no-inject skips the per-kind Frames.adopt pass (then the per-kind
           table is the in-situ canonical tree, phase and all). */

const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const TAG = opt('--tag', 'before');
const CAMS = opt('--cams', null);
const INJECT = !args.includes('--no-inject');
const KEEP_OPEN = args.includes('--keep-open');

const URL = 'http://localhost:4321/lab2/';
const HERE = __dirname;
const OUT = path.join(HERE, 'results');
const INDEX = path.join(HERE, '..', 'index.html');
const VIEW = { width: 1600, height: 1000 };
const WINDOW = { width: 1616, height: 1110 };   // viewport + Chrome's own frame
const KINDS = ['the-elder', 'the-younger', 'the-broad', 'the-ancient', 'the-pine', 'slim-pine',
  'the-spruce', 'bent-pine', 'the-sapling', 'the-leaner', 'the-twins', 'the-sprout', 'the-oak',
  'the-acorn', 'the-hollow', 'the-gnarled', 'tall-tuft', 'meadow-mound', 'wild-sprigs',
  'plain-blades', 'grand-toadstool', 'honey-caps', 'pink-bonnets'];
const KIND_RE = /part=([a-z-]+)/;

const sleep = ms => new Promise(r => setTimeout(r, ms));
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);

/* ── what the file says (read only) ─────────────────────────────────────── */
function readFile() {
  const h = fs.readFileSync(INDEX, 'utf8');
  const copiesAt = h.indexOf('copies written down by keep.js');
  const re = /<section\b[^>]*>/g;
  const out = {};
  let m;
  while ((m = re.exec(h))) {
    const t = m[0];
    if (!/forest\.dc\.html/.test(t)) continue;
    const a = n => (new RegExp('\\b' + n + '="([^"]*)"').exec(t) || [])[1];
    const st = a('style') || '';
    out[a('id')] = {
      gone: /data-gone="1"/.test(t),
      kind: (KIND_RE.exec(t) || [])[1],
      homeX: +a('data-home-x'), homeY: +a('data-home-y'),
      homeZ: a('data-home-z') != null ? +a('data-home-z') : null,
      cut: a('data-cut') || null,
      fileW: +(/width:\s*(\d+)/.exec(st) || [])[1] || null,
      fileH: +(/height:\s*(\d+)/.exec(st) || [])[1] || null,
      handWritten: m.index < copiesAt
    };
  }
  return out;
}

/* ── page-side helpers (serialised into the page) ────────────────────────── */
const treeList = () => [...document.querySelectorAll('#bench .gz[data-src*="forest.dc.html"]')]
  .filter(el => !el.hasAttribute('data-gone') && el.isConnected)
  .map(el => {
    const p = window.Frames.panels.find(q => q.el === el);
    return {
      id: el.id, gizmo: el.dataset.gizmo,
      kind: (/part=([a-z-]+)/.exec(el.dataset.src) || [])[1],
      x: parseFloat(el.style.left) || 0, y: parseFloat(el.style.top) || 0,
      w: parseFloat(el.style.width) || 0, h: parseFloat(el.style.height) || 0,
      booted: el.classList.contains('booted'), stalled: el.classList.contains('stalled'),
      measured: !!(p && p.natW && p.natH),
      // a panel drawn in this page (.gz-art, no data-src — the sign today, the
      // canvas trees after) has no document to boot or measure: it is ready as is
      art: !!(p && p.art)
    };
  });

const readTrees = ids => ids.map(id => {
  const el = document.getElementById(id);
  if (!el) return { id, missing: true };
  const p = window.Frames.panels.find(q => q.el === el) || {};
  const g = window.Lab.gizmos.find(q => q.el === el);
  const f = el.querySelector('iframe');
  const dim = el.querySelector('.gz-dim');
  return {
    id, gizmo: el.dataset.gizmo,
    kind: (/part=([a-z-]+)/.exec(el.dataset.src) || [])[1],
    src: el.dataset.src,
    left: parseFloat(el.style.left) || 0, top: parseFloat(el.style.top) || 0,
    width: parseFloat(el.style.width) || 0, height: parseFloat(el.style.height) || 0,
    offsetWidth: el.offsetWidth, offsetHeight: el.offsetHeight,
    zIndex: el.style.zIndex === '' ? null : +el.style.zIndex,
    rank: g ? g.rank : null,
    homeX: +el.dataset.homeX, homeY: +el.dataset.homeY,
    homeZ: el.dataset.homeZ != null ? +el.dataset.homeZ : null,
    dataW: +el.dataset.w, dataH: +el.dataset.h,
    sized: !!p.sized, cut: el.dataset.cut || null, art: !!p.art,
    natW: p.natW || null, natH: p.natH || null,
    inkX: p.inkX != null ? p.inkX : null, inkY: p.inkY != null ? p.inkY : null,
    viewW: p.viewW || null, viewH: p.viewH || null,
    booted: el.classList.contains('booted'), stalled: el.classList.contains('stalled'),
    cold: el.classList.contains('gz-cold'),
    frameSrc: f ? f.getAttribute('src') : null,
    frameW: f ? f.style.width : null, frameH: f ? f.style.height : null,
    frameTransform: f ? f.style.transform : null,
    dim: dim ? dim.textContent : null,
    className: el.className
  };
});

/* centre the camera on a world point at a zoom, wait for lab:still (or a
   beat, if the camera had nowhere to go), return what the camera did.
   screen = bench.top-left + P + world*Z, so P = half the bench - world*Z. */
const camCentre = ([z, wx, wy]) => new Promise(resolve => {
  const Lab = window.Lab, b = Lab.bench.getBoundingClientRect();
  let done = false;
  const finish = why => {
    if (done) return; done = true;
    document.removeEventListener('lab:still', onStill);
    const bb = Lab.bench.getBoundingClientRect();
    resolve({ zoom: Lab.zoom, pan: Lab.pan, still: why,
      scroll: { left: Lab.bench.scrollLeft, top: Lab.bench.scrollTop },
      bench: { left: bb.left, top: bb.top, width: bb.width, height: bb.height } });
  };
  const onStill = () => finish('still');
  document.addEventListener('lab:still', onStill);
  Lab.camTo(z, b.width / 2 - wx * z, b.height / 2 - wy * z, 0);
  setTimeout(() => finish('timeout'), 1500);
});

const benchBox = () => { const b = window.Lab.bench.getBoundingClientRect(); return { left: b.left, top: b.top, width: b.width, height: b.height }; };

/* ── a port of frames.js's measurement, so it can be taken at a chosen phase ─
   extent()/spill()/calls()/isSheet() copied from frames.js (THE MEASUREMENT),
   and measure() is its one-pass sum. Installed on window.__perf in the main
   page; every frame is same-origin, so it reaches into a document from here. */
const installPort = () => {
  const LEN = /(-?[\d.]+)px\s+(-?[\d.]+)px(?:\s+(-?[\d.]+)px)?(?:\s+(-?[\d.]+)px)?/;
  function calls(str, name) {
    const out = [];
    for (let i = 0; (i = str.indexOf(name + '(', i)) !== -1;) {
      let depth = 0, j = i + name.length;
      for (; j < str.length; j++) {
        if (str[j] === '(') depth++;
        else if (str[j] === ')' && !--depth) break;
      }
      out.push(str.slice(i + name.length + 1, j));
      i = j + 1;
    }
    return out;
  }
  function spill(cs) {
    const s = { l: 0, t: 0, r: 0, b: 0 };
    const add = (x, y, blur, spread) => {
      const g = (blur || 0) + (spread || 0);
      if (g - x > s.l) s.l = g - x;
      if (g + x > s.r) s.r = g + x;
      if (g - y > s.t) s.t = g - y;
      if (g + y > s.b) s.b = g + y;
    };
    if (cs.filter && cs.filter !== 'none') {
      calls(cs.filter, 'drop-shadow').forEach(a => { const m = LEN.exec(a); if (m) add(+m[1], +m[2], +(m[3] || 0), 0); });
    }
    if (cs.boxShadow && cs.boxShadow !== 'none') {
      cs.boxShadow.split(/,(?![^(]*\))/).forEach(one => {
        if (/inset/.test(one)) return;
        const m = LEN.exec(one);
        if (m) add(+m[1], +m[2], +(m[3] || 0), +(m[4] || 0));
      });
    }
    return s;
  }
  const isSheet = el => el.id === 'dc-root' || el.classList.contains('sc-host') || el.hasAttribute('data-screen-label');
  function extent(doc) {
    if (!doc || !doc.body || !doc.body.firstElementChild) return null;
    const win = doc.defaultView;
    let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity, n = 0;
    (function walk(node, acc) {
      for (let el = node.firstElementChild; el; el = el.nextElementSibling) {
        if (el.hasAttribute && el.hasAttribute('data-lab-ink')) continue;
        const cs = win.getComputedStyle(el);
        if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity === 0) continue;
        const own = spill(cs);
        const s = { l: own.l + acc.l, t: own.t + acc.t, r: own.r + acc.r, b: own.b + acc.b };
        const paper = isSheet(el);
        if (!paper) {
          const r = el.getBoundingClientRect();
          if (r.width || r.height) {
            n++;
            if (r.left - s.l < x1) x1 = r.left - s.l;
            if (r.top - s.t < y1) y1 = r.top - s.t;
            if (r.right + s.r > x2) x2 = r.right + s.r;
            if (r.bottom + s.b > y2) y2 = r.bottom + s.b;
          }
        }
        if (paper || (cs.overflowX === 'visible' && cs.overflowY === 'visible')) walk(el, s);
      }
    })(doc.body, { l: 0, t: 0, r: 0, b: 0 });
    return n ? { x1, y1, x2, y2, n } : null;
  }
  // one pass of frames.js's measure(): the viewport is w×h and nothing has
  // been shifted; overhang says whether frames.js would have needed a second
  function measure(doc, w, h) {
    const b = extent(doc);
    if (!b) return null;
    const inkX = Math.max(0, Math.floor(b.x1)), inkY = Math.max(0, Math.floor(b.y1));
    return {
      x1: b.x1, y1: b.y1, x2: b.x2, y2: b.y2, elements: b.n,
      inkX, inkY,
      natW: Math.max(1, Math.min(3200, w - inkX, Math.ceil(b.x2) - inkX)),
      natH: Math.max(1, Math.min(3200, h - inkY, Math.ceil(b.y2) - inkY)),
      overhang: { l: Math.max(0, Math.ceil(-b.x1)), t: Math.max(0, Math.ceil(-b.y1)), r: Math.max(0, Math.ceil(b.x2 - w)), b: Math.max(0, Math.ceil(b.y2 - h)) }
    };
  }
  // pause every animation in the document and seek: the sway to `sway` of an
  // iteration (0.25 is rotate(0) — ease-in-out is symmetric), the rest
  // (bob, leafFall, twinkle) to `inner`
  function seek(doc, sway, inner) {
    let n = 0;
    doc.getAnimations().forEach(a => {
      try {
        const t = a.effect.getTiming();
        const d = +t.delay || 0, dur = +t.duration || 0;
        a.pause();
        a.currentTime = d + dur * (a.animationName === 'sway' ? sway : inner);
        n++;
      } catch (e) {}
    });
    void doc.body.offsetWidth;
    return n;
  }
  function anims(doc) {
    return doc.getAnimations().map(a => {
      const t = a.effect.getTiming(), el = a.effect.target;
      return { name: a.animationName || a.constructor.name, duration: t.duration, delay: t.delay, easing: t.easing, iterations: t.iterations,
               target: el ? el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (el.parentElement && el.parentElement.tagName.toLowerCase() === 'svg' ? '' : '') : null,
               targetIsRoot: !!(el && el.parentElement && el.parentElement.hasAttribute('data-forest')) };
    });
  }
  function svg(doc) {
    const root = doc.querySelector('[data-forest]');
    if (!root) return null;
    const win = doc.defaultView;
    const kids = [...root.children];
    return {
      rootChildren: kids.map(c => c.tagName.toLowerCase()),
      svgs: kids.filter(c => c.tagName.toLowerCase() === 'svg').map(s => {
        const cs = win.getComputedStyle(s), r = s.getBoundingClientRect();
        return { width: s.getAttribute('width'), height: s.getAttribute('height'), viewBox: s.getAttribute('viewBox'),
                 style: s.getAttribute('style'), filter: cs.filter, transformOrigin: cs.transformOrigin,
                 animation: { name: cs.animationName, duration: cs.animationDuration, delay: cs.animationDelay, timing: cs.animationTimingFunction },
                 rect: { x: r.x, y: r.y, w: r.width, h: r.height }, bytes: s.outerHTML.length,
                 animatedDescendants: [...s.querySelectorAll('*')].filter(e => win.getComputedStyle(e).animationName !== 'none').length };
      })
    };
  }
  window.__perf = { extent, measure, seek, anims, svg };
  return true;
};

/* ── waiting ─────────────────────────────────────────────────────────────── */
async function stableBooted(page, quietMs, maxMs) {
  const t0 = Date.now();
  let last = -1, since = Date.now();
  for (;;) {
    const n = await page.evaluate(() => document.querySelectorAll('.gz.booted').length);
    if (n !== last) { last = n; since = Date.now(); }
    if (Date.now() - since >= quietMs) return n;
    if (Date.now() - t0 > maxMs) return n;
    await sleep(250);
  }
}

async function waitMeasured(page, ids, maxMs) {
  const t0 = Date.now();
  for (;;) {
    const st = await page.evaluate(ids => ids.map(id => {
      const el = document.getElementById(id);
      const p = el && window.Frames.panels.find(q => q.el === el);
      return { id, ok: !!(el && p && (p.art || (el.classList.contains('booted') && p.natW && p.natH))),
               stalled: !!(el && el.classList.contains('stalled')) };
    }), ids);
    const pending = st.filter(s => !s.ok && !s.stalled);
    if (!pending.length) return st;
    if (Date.now() - t0 > maxMs) return st;
    await sleep(300);
  }
}

/* ── the densest window ──────────────────────────────────────────────────── */
function inside(t, cx, cy, W, H) {
  return t.x >= cx - W / 2 && t.x + t.w <= cx + W / 2 && t.y >= cy - H / 2 && t.y + t.h <= cy + H / 2;
}
function touching(t, cx, cy, W, H) {
  return t.x < cx + W / 2 && t.x + t.w > cx - W / 2 && t.y < cy + H / 2 && t.y + t.h > cy - H / 2;
}
function densest(trees, W, H, step) {
  if (!trees.length) return null;
  const x0 = Math.min(...trees.map(t => t.x)), x1 = Math.max(...trees.map(t => t.x + t.w));
  const y0 = Math.min(...trees.map(t => t.y)), y1 = Math.max(...trees.map(t => t.y + t.h));
  let best = null;
  for (let cx = x0; cx <= x1; cx += step) for (let cy = y0; cy <= y1; cy += step) {
    const full = trees.filter(t => inside(t, cx, cy, W, H)).length;
    const part = trees.filter(t => touching(t, cx, cy, W, H)).length;
    const score = full * 1000 + part;
    if (!best || score > best.score) best = { cx, cy, full, part, score };
  }
  // nudge to the centroid of what it holds, so the stand sits in the middle
  const held = trees.filter(t => inside(t, best.cx, best.cy, W, H));
  if (held.length) {
    const hx0 = Math.min(...held.map(t => t.x)), hx1 = Math.max(...held.map(t => t.x + t.w));
    const hy0 = Math.min(...held.map(t => t.y)), hy1 = Math.max(...held.map(t => t.y + t.h));
    const cx = Math.round((hx0 + hx1) / 2), cy = Math.round((hy0 + hy1) / 2);
    if (trees.filter(t => inside(t, cx, cy, W, H)).length >= held.length) { best.cx = cx; best.cy = cy; }
  }
  return best;
}
/* two clusters along x (1-D k-means from the extremes) */
function splitX(trees) {
  const cs = trees.map(t => t.x + t.w / 2);
  let a = Math.min(...cs), b = Math.max(...cs);
  let A = [], B = [];
  for (let i = 0; i < 40; i++) {
    A = []; B = [];
    trees.forEach((t, k) => ((Math.abs(cs[k] - a) <= Math.abs(cs[k] - b)) ? A : B).push(t));
    const na = A.reduce((s, t) => s + t.x + t.w / 2, 0) / (A.length || 1);
    const nb = B.reduce((s, t) => s + t.x + t.w / 2, 0) / (B.length || 1);
    if (na === a && nb === b) break;
    a = na; b = nb;
  }
  return { west: A, east: B, centres: { west: a, east: b } };
}

/* ── freeze every animation at a known phase ─────────────────────────────── */
async function freeze(page, cdp) {
  // 1. every document: pause each animation and seek it to a fixed phase —
  //    sway to a quarter of an iteration in (rotate(0)), everything else to
  //    its 0% keyframe. In the main page only CSS animations are touched:
  //    the camera and the carried features ride Web Animations that HOLD a
  //    pose (lab.js drive()), and those are left alone.
  //    Every frame's <html> also gets data-lab-paused, which is the bench's
  //    own freeze — bare.css holds the CSS animations, prelude.js the timers
  //    and rAF loops — so a feature's script-driven motion stops too.
  const seeked = [];
  const main = page.mainFrame();
  for (const f of page.frames()) {
    const top = f === main;
    try {
      const n = await f.evaluate(top => {
        let n = 0;
        document.getAnimations().forEach(a => {
          try {
            if (top && !((typeof CSSAnimation !== 'undefined' && a instanceof CSSAnimation)
                      || (typeof CSSTransition !== 'undefined' && a instanceof CSSTransition))) return;
            const t = a.effect.getTiming();
            const d = +t.delay || 0, dur = +t.duration || 0;
            a.pause();
            a.currentTime = (a.animationName === 'sway') ? d + dur * 0.25 : d;
            n++;
          } catch (e) {}
        });
        if (!top && document.documentElement) document.documentElement.setAttribute('data-lab-paused', '');
        return n;
      }, top);
      seeked.push(n);
    } catch (e) { seeked.push(-1); }
  }
  // 2. the blanket: the documents' timelines stop
  let cdpOk = false;
  try {
    await cdp.send('Animation.enable');
    await cdp.send('Animation.setPlaybackRate', { playbackRate: 0 });
    cdpOk = true;
  } catch (e) { log('CDP Animation.setPlaybackRate failed:', e.message); }
  return { frames: seeked.length, seekedPerFrame: seeked, seeked: seeked.reduce((s, n) => s + Math.max(0, n), 0), cdpPlaybackRate0: cdpOk };
}
async function verifyFrozen(page, clip) {
  const a = await page.screenshot({ clip });
  await sleep(600);
  const b = await page.screenshot({ clip });
  return a.equals(b);
}
async function fallbackFreeze(page) {
  let n = 0;
  for (const f of page.frames()) {
    try {
      await f.evaluate(() => {
        if (document.getElementById('lab-perf-freeze')) return;
        const st = document.createElement('style');
        st.id = 'lab-perf-freeze';
        st.textContent = '*,*::before,*::after{animation-play-state:paused!important;transition:none!important}';
        (document.head || document.documentElement).appendChild(st);
      });
      n++;
    } catch (e) {}
  }
  return n;
}

/* the pointer parked where it hovers nothing on the paper: the header, if
   there is one over the bench, else a corner of the bench with no feature
   under it (a hovered feature shows its corner grip and the shield's label) */
async function parkMouse(page, bb) {
  if (bb.top >= 8) { await page.mouse.move(VIEW.width - 6, Math.floor(bb.top / 2)); return { x: VIEW.width - 6, y: Math.floor(bb.top / 2), where: 'header' }; }
  const spot = await page.evaluate(() => {
    const b = window.Lab.bench.getBoundingClientRect();
    const tries = [[4, 4], [b.width - 4, 4], [4, b.height - 4], [b.width - 4, b.height - 4]];
    for (let i = 0; i < 400; i++) tries.push([Math.random() * b.width, Math.random() * b.height]);
    for (const [x, y] of tries) {
      const el = document.elementFromPoint(b.left + x, b.top + y);
      if (el && !el.closest('.gz')) return { x: b.left + x, y: b.top + y };
    }
    return null;
  });
  if (spot) { await page.mouse.move(spot.x, spot.y); return Object.assign(spot, { where: 'bench, clear' }); }
  await page.mouse.move(0, 0);
  return { x: 0, y: 0, where: 'nowhere clear' };
}

/* ── main ────────────────────────────────────────────────────────────────── */
(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const file = readFile();
  const fileStanding = Object.keys(file).filter(id => !file[id].gone);
  log('index.html:', Object.keys(file).length, 'forest sections,', fileStanding.length, 'standing,',
      Object.keys(file).length - fileStanding.length, 'gone');

  const browser = await chromium.launch({
    channel: 'chrome', headless: false,
    args: ['--window-size=' + WINDOW.width + ',' + WINDOW.height, '--window-position=0,0']
  });
  const ctx = await browser.newContext({ viewport: VIEW, deviceScaleFactor: 1 });
  // NEVER let the page autosave: the door is shut for this browser, before
  // the page loads — keep.js's GET knock gets a 404 and it never POSTs
  const doorKnocks = [];
  await ctx.route('**/_lab2/**', r => { r.fulfill({ status: 404, contentType: 'text/plain', body: 'no door (perf harness)' }); });
  const page = await ctx.newPage();
  page.on('request', q => { if (q.url().includes('/_lab2/')) doorKnocks.push(q.method() + ' ' + q.url()); });
  const pageErrors = [], consoleErrors = [];
  page.on('pageerror', e => pageErrors.push(String(e && e.message || e)));
  page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });

  const t0 = Date.now();
  await page.goto(URL, { waitUntil: 'load' });
  await page.waitForFunction(() => window.Lab && window.Frames && window.Frames.panels, null, { timeout: 30000 });
  await page.evaluate(installPort);
  const chromeVersion = (await browser.version());
  const opening = await page.evaluate(() => ({ zoom: window.Lab.zoom, pan: window.Lab.pan, bench: (b => ({ left: b.left, top: b.top, width: b.width, height: b.height }))(window.Lab.bench.getBoundingClientRect()),
    sections: document.querySelectorAll('#bench .gz').length, panels: window.Frames.panels.length, gizmos: window.Lab.gizmos.length,
    goneShelved: (window.Lab.gone || []).length }));
  log('opened at zoom', opening.zoom.toFixed(3), '—', opening.sections, 'sections,', opening.panels, 'panels,', opening.goneShelved, 'shelved as gone');
  const booted0 = await stableBooted(page, 2000, 90000);
  log('opening boot settled:', booted0, 'booted, after', ((Date.now() - t0) / 1000).toFixed(1) + 's');

  /* ── 2. every standing tree, booted and measured ───────────────────────── */
  let trees = await page.evaluate(treeList);
  log('standing forest sections in the DOM:', trees.length, '(file says', fileStanding.length + ')');
  const bb = await page.evaluate(benchBox);
  const W = bb.width, H = bb.height;               // the viewport in world units at 100%
  const LOAD_MARGIN = 400, SAFE = 120;            // frames.js loads within 400px; stay well inside
  const visits = [];
  const failed = new Set();
  for (let round = 0; round < 60; round++) {
    trees = await page.evaluate(treeList);
    const pending = trees.filter(t => !(t.art || (t.booted && t.measured)) && !failed.has(t.id));
    if (!pending.length) break;
    // the pending tree whose centred window holds the most pending trees
    let best = null;
    for (const c of pending) {
      const cx = c.x + c.w / 2, cy = c.y + c.h / 2;
      const held = pending.filter(t => inside(t, cx, cy, W + 2 * (LOAD_MARGIN - SAFE), H + 2 * (LOAD_MARGIN - SAFE)));
      if (!best || held.length > best.held.length) best = { cx, cy, held };
    }
    const cam = await page.evaluate(camCentre, [1, best.cx, best.cy]);
    await sleep(300);                              // lab:still has fired; the queue pumps
    // what is actually within the loader's reach, given where the camera really went
    const reach = await page.evaluate(([ids, m]) => {
      const b = window.Lab.bench.getBoundingClientRect();
      return ids.filter(id => {
        const r = document.getElementById(id).getBoundingClientRect();
        return r.right > b.left - m && r.left < b.right + m && r.bottom > b.top - m && r.top < b.bottom + m;
      });
    }, [pending.map(t => t.id), LOAD_MARGIN - SAFE]);
    log('visit', round + 1, 'centre', Math.round(best.cx), Math.round(best.cy), '→ pan', Math.round(cam.pan.x), Math.round(cam.pan.y), '(' + cam.still + ') ·', reach.length, 'of', pending.length, 'pending within reach');
    if (!reach.length) {
      // the camera could not get there (clamped) — give the nearest one up
      failed.add(pending[0].id); log('  ! unreachable, giving up:', pending[0].id);
      continue;
    }
    const st = await waitMeasured(page, reach, 45000);
    const bad = st.filter(s => !s.ok);
    bad.forEach(s => { failed.add(s.id); log('  ! not measured after 45s:', s.id, s.stalled ? '(stalled)' : ''); });
    await sleep(1500);                             // the re-measure passes after boot (fonts, +700ms)
    visits.push({ centre: { x: best.cx, y: best.cy }, zoom: 1, pan: cam.pan, reached: reach, failed: bad.map(s => s.id) });
  }
  await sleep(2000);
  trees = await page.evaluate(treeList);
  const measured = trees.filter(t => t.art || (t.booted && t.measured));
  log('measured', measured.length, 'of', trees.length, 'standing trees;', failed.size, 'failed');

  /* ── per-kind natural sizes, in situ ───────────────────────────────────── */
  let records = await page.evaluate(readTrees, trees.map(t => t.id));
  const SIX = ['natW', 'natH', 'inkX', 'inkY', 'viewW', 'viewH'];
  const six = r => { const o = {}; SIX.forEach(f => { o[f] = r[f]; }); return o; };
  const kindsInSitu = {};
  for (const k of KINDS) {
    const all = records.filter(r => r.kind === k);
    const rs = all.filter(r => r.natW);
    if (!rs.length) { kindsInSitu[k] = { standing: all.length, measured: 0, canonical: null, variants: [] }; continue; }
    const canon = rs.find(r => r.id === 'gz-forest-' + k) || rs[0];
    const key = r => SIX.map(f => r[f]).join('x');
    const seen = new Map();
    rs.forEach(r => { const kk = key(r); if (!seen.has(kk)) seen.set(kk, Object.assign(six(r), { count: 0, ids: [] })); seen.get(kk).count++; seen.get(kk).ids.push(r.id); });
    kindsInSitu[k] = { standing: all.length, measured: rs.length, from: canon.id, canonical: six(canon),
      distinct: seen.size, variants: [...seen.values()] };
  }

  /* ── 3. the same sizes by adopting a temporary section per kind ───────── */
  const kindsInjected = {};
  if (INJECT) {
    for (const k of KINDS) {
      const id = 'gz-perf-' + k;
      const ok = await page.evaluate(([kind, id]) => {
        const proto = document.querySelector('#bench .gz[data-src*="forest.dc.html"]');
        if (!proto) return 'no proto';
        const el = proto.cloneNode(true);
        el.className = 'gz';
        el.id = id;
        Array.prototype.slice.call(el.attributes).forEach(a => { if (a.name.indexOf('data-') === 0) el.removeAttribute(a.name); });
        el.dataset.gizmo = 'perf-' + kind;
        el.dataset.src = 'features/forest.dc.html#part=' + kind;
        el.dataset.w = '400'; el.dataset.h = '460';
        el.removeAttribute('style');
        el.style.width = '400px'; el.style.height = '460px';
        const b = window.Lab.bench.getBoundingClientRect();
        const c = window.Lab.toWorld(b.left + b.width / 2, b.top + b.height / 2);
        el.style.left = Math.round(c.x - 200) + 'px';
        el.style.top = Math.round(c.y - 230) + 'px';
        el.style.zIndex = '999';
        el.setAttribute('aria-label', 'perf ' + kind);
        const old = el.querySelector('iframe');
        const f = document.createElement('iframe'); f.title = 'perf ' + kind;
        if (old) old.replaceWith(f); else el.insertBefore(f, el.firstChild);
        const d = el.querySelector('.gz-dim'); if (d) d.textContent = '';
        const chip = el.querySelector('.gz-poster b'); if (chip) chip.textContent = 'waking up';
        window.Lab.world.appendChild(el);
        const p = window.Frames.adopt(el);
        return p ? 'adopted' : 'adopt returned nothing';
      }, [k, id]);
      if (ok !== 'adopted') { kindsInjected[k] = { error: ok }; log('inject', k, '→', ok); continue; }
      const st = await waitMeasured(page, [id], 30000);
      if (!st[0].ok) {
        const r = (await page.evaluate(readTrees, [id]))[0];
        kindsInjected[k] = { error: r.stalled ? 'stalled' : 'not measured in 30s' };
        log('inject', k.padEnd(16), kindsInjected[k].error);
      } else {
        await sleep(1100);                         // fonts.ready and the +700ms pass have both run
        const first = (await page.evaluate(readTrees, [id]))[0];
        // THE PHASE: pause the sway, measure at six phases with the port, then
        // ask frames.js itself to measure again at rest (a ResizeObserver on
        // the screen root re-fits on any size change: nudge it by a pixel and
        // put it back — the second fit is at rest, in the original layout).
        // p.natW is cleared first so a fit that did not run is visible.
        const phased = await page.evaluate(([id, w, h]) => {
          const el = document.getElementById(id), f = el.querySelector('iframe'), doc = f.contentDocument;
          const P = window.__perf;
          const out = { anims: P.anims(doc), phases: {}, rootMinHeight: null };
          const combos = [['rest', 0.25, 0], ['sway0', 0, 0], ['sway50', 0.5, 0], ['rest-inner50', 0.25, 0.5], ['sway0-inner50', 0, 0.5], ['sway50-inner50', 0.5, 0.5]];
          for (const [name, s, i] of combos) { out.seeked = P.seek(doc, s, i); out.phases[name] = P.measure(doc, w, h); }
          P.seek(doc, 0.25, 0);
          out.svg = P.svg(doc);
          const p = window.Frames.panels.find(q => q.el === el);
          out.hadRO = !!(p && p.ro);
          if (p) { p.natW = 0; p.natH = 0; }
          const root = doc.querySelector('[data-screen-label]');
          if (root) { out.rootMinHeight = root.style.minHeight; root.style.minHeight = 'calc(100vh + 1px)'; }
          return out;
        }, [id, 400, 460]);
        await sleep(150);
        await page.evaluate(([id, mh]) => {
          const doc = document.getElementById(id).querySelector('iframe').contentDocument;
          const root = doc.querySelector('[data-screen-label]');
          if (root) root.style.minHeight = mh || '100vh';
        }, [id, phased.rootMinHeight]);
        await sleep(300);
        const rest = (await page.evaluate(readTrees, [id]))[0];
        const port = phased.phases.rest;
        const agree = !!(rest.natW && port && SIX.slice(0, 4).every(f => rest[f] === port[f]));
        const ph = phased.phases;
        const env = {
          x1: Math.min(...Object.values(ph).map(m => m.x1)), y1: Math.min(...Object.values(ph).map(m => m.y1)),
          x2: Math.max(...Object.values(ph).map(m => m.x2)), y2: Math.max(...Object.values(ph).map(m => m.y2))
        };
        env.inkX = Math.max(0, Math.floor(env.x1)); env.inkY = Math.max(0, Math.floor(env.y1));
        env.natW = Math.ceil(env.x2) - env.inkX; env.natH = Math.ceil(env.y2) - env.inkY;
        kindsInjected[k] = {
          firstFit: Object.assign(six(first), { width: first.width, height: first.height, dim: first.dim }),
          restFit: rest.natW ? Object.assign(six(rest), { width: rest.width, height: rest.height, dim: rest.dim }) : null,
          restFitRan: !!rest.natW, hadResizeObserver: phased.hadRO, portAgreesWithRestFit: agree,
          phases: ph, envelope: env, animations: phased.anims, svg: phased.svg, seeked: phased.seeked
        };
        const c = kindsInSitu[k].canonical;
        log('inject', k.padEnd(16), 'first', `${first.natW}×${first.natH}@${first.inkX},${first.inkY}`,
            '· rest', rest.natW ? `${rest.natW}×${rest.natH}@${rest.inkX},${rest.inkY}` : 'NO REFIT',
            '· port', port ? `${port.natW}×${port.natH}@${port.inkX},${port.inkY}` : '—', agree ? '=' : '≠',
            '· envelope', `${env.natW}×${env.natH}@${env.inkX},${env.inkY}`,
            '· in situ', c ? `${c.natW}×${c.natH}@${c.inkX},${c.inkY}` : '(none)', kindsInSitu[k].distinct > 1 ? `(${kindsInSitu[k].distinct} variants)` : '');
      }
      await page.evaluate(id => {
        const el = document.getElementById(id);
        if (!el) return;
        window.Frames.drop(el);
        el.remove();
      }, id);
    }
  }

  /* forest-sizes.json — frames.js's own measurement at the rest pose where
     the adopt pass gave one; the in-situ canonical tree otherwise */
  const sizes = {};
  for (const k of KINDS) {
    const inj = kindsInjected[k] && !kindsInjected[k].error ? kindsInjected[k] : null;
    const situ = kindsInSitu[k];
    let top = null, source = null;
    if (inj && inj.restFit) { top = six(inj.restFit); source = 'frames.js fit at the rest pose (sway seeked to rotate(0)), temporary section via Frames.adopt'; }
    else if (inj && inj.firstFit) { top = six(inj.firstFit); source = 'frames.js fit, temporary section via Frames.adopt, phase uncontrolled'; }
    else if (situ && situ.canonical) { top = situ.canonical; source = 'in situ, ' + situ.from + ', phase uncontrolled'; }
    sizes[k] = Object.assign(top || { natW: null, natH: null, inkX: null, inkY: null, viewW: null, viewH: null }, {
      source,
      inSitu: situ,
      adopt: inj ? { firstFit: inj.firstFit, restFit: inj.restFit, portAgreesWithRestFit: inj.portAgreesWithRestFit, phases: inj.phases, envelope: inj.envelope, animations: inj.animations, svg: inj.svg }
                 : (kindsInjected[k] || null)
    });
  }
  const sizesDoc = {
    _about: 'per kind: natW natH inkX inkY viewW viewH are what frames.js measures for a fresh 400×460 forest section of that part with the sway paused at rotate(0) (see geometry.js, THE PHASE). inSitu holds the numbers found on the standing trees as they were (the phase is whatever it was when the last of the three fits ran); adopt holds the uncontrolled first fit, the rest fit, the port\'s measurement at six phases, the envelope over all of them, and the svg\'s own facts.',
    recordedAt: new Date().toISOString(), tag: TAG, kinds: sizes
  };
  fs.writeFileSync(path.join(HERE, 'forest-sizes.json'), JSON.stringify(sizesDoc, null, 2) + '\n');

  /* ── 4. the reference screenshots ──────────────────────────────────────── */
  // final records first: everything has settled, nothing temporary remains
  records = await page.evaluate(readTrees, trees.map(t => t.id));
  records.forEach(r => { const f = file[r.id] || {}; r.file = { fileW: f.fileW || null, fileH: f.fileH || null, homeX: f.homeX, homeY: f.homeY, homeZ: f.homeZ, cut: f.cut, handWritten: !!f.handWritten }; });
  const boxes = records.map(r => ({ id: r.id, kind: r.kind, x: r.left, y: r.top, w: r.width, h: r.height }));
  const isTree = b => !/tuft|mound|sprigs|blades|toadstool|caps|bonnets/.test(b.kind);

  let shotsPlan, stands = null;
  if (CAMS) {
    const prev = JSON.parse(fs.readFileSync(path.resolve(CAMS), 'utf8'));
    shotsPlan = prev.shots.map(s => ({ name: s.name, zoom: s.zoom, centre: s.centre }));
    log('reusing cameras from', CAMS);
  } else {
    stands = splitX(boxes.filter(isTree));
    const west = densest(stands.west, W, H, 40), east = densest(stands.east, W, H, 40);
    const close = densest(boxes.filter(isTree), W / 1.66, H / 1.66, 20);
    shotsPlan = [
      { name: 'grove-west', zoom: 1, centre: { x: west.cx, y: west.cy } },
      { name: 'grove-east', zoom: 1, centre: { x: east.cx, y: east.cy } },
      { name: 'closeup-166', zoom: 1.66, centre: { x: close.cx, y: close.cy } }
    ];
    log('west stand:', stands.west.length, 'trees (centre x', Math.round(stands.centres.west) + '), window holds', west.full, '· east stand:', stands.east.length, 'trees (centre x', Math.round(stands.centres.east) + '), window holds', east.full, '· close-up holds', close.full);
  }

  const shots = [];
  for (const s of shotsPlan) {
    const cam = await page.evaluate(camCentre, [s.zoom, s.centre.x, s.centre.y]);
    await sleep(300);
    // everything in the window must be booted and drawn before the shutter
    const inView = await page.evaluate(ids => {
      const b = window.Lab.bench.getBoundingClientRect();
      return ids.filter(id => { const r = document.getElementById(id).getBoundingClientRect();
        return r.right > b.left && r.left < b.right && r.bottom > b.top && r.top < b.bottom; });
    }, records.map(r => r.id));
    await waitMeasured(page, inView, 30000);
    await stableBooted(page, 1500, 30000);
    await sleep(800);
    const parked = await parkMouse(page, cam.bench);
    const cdp = await ctx.newCDPSession(page);
    const fz = await freeze(page, cdp);
    await sleep(300);
    const clip = { x: cam.bench.left, y: cam.bench.top, width: cam.bench.width, height: cam.bench.height };
    let frozen = await verifyFrozen(page, clip);
    let fallback = 0;
    if (!frozen) { fallback = await fallbackFreeze(page); await sleep(300); frozen = await verifyFrozen(page, clip); }
    const fileName = `${TAG}-${s.name}.png`;
    await page.screenshot({ clip, path: path.join(OUT, fileName) });
    const full = boxes.filter(b => inside(b, s.centre.x, s.centre.y, W / s.zoom, H / s.zoom)).map(b => b.id);
    shots.push({ name: s.name, file: 'results/' + fileName, zoom: cam.zoom, centre: s.centre, pan: cam.pan, scroll: cam.scroll,
      bench: cam.bench, clip, worldWindow: { x: s.centre.x - W / s.zoom / 2, y: s.centre.y - H / s.zoom / 2, w: W / s.zoom, h: H / s.zoom },
      treesFullyInside: full, treesInView: inView, mouse: parked,
      freeze: Object.assign({}, fz, { verifiedStill: frozen, fallbackStyleFrames: fallback }) });
    log('shot', s.name, 'zoom', cam.zoom, 'centre', s.centre.x, s.centre.y, 'pan', Math.round(cam.pan.x), Math.round(cam.pan.y), '·', full.length, 'trees fully inside,', inView.length, 'in view · frozen:', frozen, fallback ? '(after fallback)' : '');
    // thaw for the next window (the seeks stay paused: the next freeze re-seeks)
    try { await cdp.send('Animation.setPlaybackRate', { playbackRate: 1 }); } catch (e) {}
    await cdp.detach().catch(() => {});
  }

  /* ── write it all down ─────────────────────────────────────────────────── */
  const counts = {};
  records.forEach(r => { counts[r.kind] = (counts[r.kind] || 0) + 1; });
  const doc = {
    tag: TAG, recordedAt: new Date().toISOString(), url: URL, viewport: VIEW, deviceScaleFactor: 1,
    browser: 'chrome ' + chromeVersion + ' (channel) headed via playwright ' + require('playwright/package.json').version,
    opening,
    file: { forestSections: Object.keys(file).length, standing: fileStanding.length, gone: Object.keys(file).length - fileStanding.length },
    dom: { standing: records.length, measured: records.filter(r => r.natW).length, notMeasured: records.filter(r => !r.natW).map(r => r.id),
           cut: records.filter(r => r.sized).map(r => r.id) },
    countsPerKind: counts,
    visits,
    stands: stands ? { west: stands.west.map(b => b.id), east: stands.east.map(b => b.id), centres: stands.centres } : null,
    shots,
    kindsInSitu,
    kindsByAdopt: INJECT ? kindsInjected : null,
    trees: records,
    doorKnocks, pageErrors, consoleErrors: consoleErrors.slice(0, 40),
    elapsedMs: Date.now() - t0
  };
  fs.writeFileSync(path.join(OUT, `geometry-${TAG}.json`), JSON.stringify(doc, null, 2) + '\n');
  log('wrote', path.join(OUT, `geometry-${TAG}.json`), 'and', path.join(HERE, 'forest-sizes.json'), '· door knocks (all refused):', doorKnocks.length, '· page errors:', pageErrors.length, '· elapsed', ((Date.now() - t0) / 1000).toFixed(0) + 's');
  if (KEEP_OPEN) { log('--keep-open: leaving Chrome up'); return; }
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
