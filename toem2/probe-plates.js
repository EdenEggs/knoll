/* toem2/probe-plates.js — TOEM 2's bench opens on the eight level plates of the
   TOEM 2 level piece kit, taken apart: every piece where the kit's own engine
   draws it, and every one movable on its own. Real Chrome, real presses.

     1  the page is TOEM 2's: its tab, "knoll / TOEM 2" in the header, nothing
        kept under any key but knoll-toem2:, and serve.js's two doors for it
        answering — a publish with no wall in it refused
     2  a first visit is seeded: every piece in wall-seed.json on the paper, a
        k:'d' stamp whose drawing is in the catalogue, painted, the sheet's own
        count of pieces per plate, and the camera framed on all eight
     3  the drawer, through the dock: 518 stickers in 18 kits — the ten batches
        with the sheet's own counts, ids, names and drawings (no connector or
        backdrop box grown), one kit per plate, nothing left from the iron
        hive — its chips, a chip, and a search
     4  FIDELITY, in two halves, against the sheet's own engine (tm-iso.js and
        the level files, decoded out of Downloads/assets/toem2-level-piece-kit.html):
          A  THE RECORDS. Each plate drawn from the wall's own records at exact
             transforms — wall.js's stamp transform with nothing rounded — is
             the engine's plate pixel for pixel: a pixel is off past 16/255 of
             coverage or colour, and a plate may have 40. The check can fail,
             twice per plate: the same drawing with its most visible large
             stamp 6px out, and with its most visible surface patch (a grey a
             shade off the grey under it) 6px out, must both be caught.
          B  THE PAINT. Every node wall.js painted stands where its record
             says, to wall.js's own tenth of a pixel.
        The painted wall against the engine is printed too, not asserted: it
        carries wall.js's rounding, 0.1px on each of three translates, which
        flips anti-aliased pixels along thin curved ink and nothing else. How
        that was established (2026-09-12): drawn from the extractor's measured
        numbers Harbour & Jetty matched the engine to 0 px, the painted wall
        was 144 px off, and every off pixel was a one-pixel fragment on an ink
        edge — no silhouette displaced, missing or mirrored. (Two earlier cuts
        of this check chose a median piece as the control — on Rainy Station a
        fence post wholly behind the shelter, which nothing could see move —
        and the largest stamp, which on Hillside Farm is covered too.)
     5  a real drag moves one piece and nothing else, and ctrl+z puts it back;
        a band round a whole plate picks every piece of it, and dragging one of
        them carries the plate and only the plate
     6  nothing else was written: lab2/, ironhive/ and toem2/ index.html, both
        wall seeds and the kits are byte-identical before and after

   Pictures (gitignored): toem2/plates-overview.png, toem2/plate-meadow.png, and
   with DIFF=1 toem2/results/diff-NN.png (what check 4A saw as off).
   Run with serve.js up:  node toem2/probe-plates.js    (PORT=4391 for another port) */
const fs = require('fs'), path = require('path'), zlib = require('zlib'), crypto = require('crypto'), http = require('http');
const { chromium } = require('playwright');

const PORT = +(process.env.PORT || 4321), BASE = 'http://localhost:' + PORT;
const SITE = path.join(__dirname, '..');
const SHEET = process.env.SHEET || 'C:/Users/bobb9/Downloads/assets/toem2-level-piece-kit.html';
const DIFF = !!process.env.DIFF, RESULTS = path.join(__dirname, 'results');
const KITS = JSON.parse(fs.readFileSync(path.join(__dirname, 'sticker-kits.json'), 'utf8'));
const SEED = JSON.parse(fs.readFileSync(path.join(__dirname, 'wall-seed.json'), 'utf8'));
const PLATES = [['town-square', '01'], ['floating-forest', '02'], ['candlelit-study', '03'], ['harbour-jetty', '04'],
                ['meadow-picnic', '05'], ['hillside-farm', '06'], ['rainy-station', '07'], ['clocktower-rooftops', '08']];
// the sheet's own numbers: stickers per batch, and pieces per plate ("60 pieces · drag any of them")
const BATCHES = { 'tm-terrain': 24, 'tm-flora': 24, 'tm-structures': 30, 'tm-props': 30, 'tm-vehicles': 12,
                  'tm-figures': 22, 'tm-sky-weather': 14, 'tm-effects-marks': 16, 'tm-signs-symbols': 16, 'tm-backdrops': 14 };
const PIECES = { '01': 65, '02': 34, '03': 47, '04': 38, '05': 60, '06': 40, '07': 51, '08': 28 };

let fails = 0;
const say = (ok, what, extra) => {
  if (!ok) fails++;
  console.log((ok ? '  PASS  ' : '  FAIL  ') + what + (extra == null ? '' : '   ' + extra));
};
const note = (what, extra) => console.log('  NOTE  ' + what + (extra == null ? '' : '   ' + extra));

const WATCH = ['lab2/index.html', 'ironhive/index.html', 'ironhive/wall-seed.json',
               'toem2/index.html', 'toem2/wall-seed.json', 'toem2/sticker-kits.json'];
const hash = f => { try { return crypto.createHash('sha1').update(fs.readFileSync(path.join(SITE, f))).digest('hex'); } catch (e) { return 'missing'; } };
const before = WATCH.map(hash);

function ask(method, url, body) {
  return new Promise(done => {
    const req = http.request(BASE + url, { method, headers: body ? { 'content-type': 'application/json' } : {} }, r => {
      let s = '';
      r.on('data', c => { s += c; });
      r.on('end', () => { let j = null; try { j = JSON.parse(s); } catch (e) {} done({ status: r.statusCode, json: j }); });
    });
    req.on('error', e => done({ status: 0, error: String(e) }));
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

/* THE SHEET'S OWN SCRIPTS, decoded out of its bundle rather than kept here: the
   ten sticker batches and three level files its page loads, and the plate
   engine (tm-iso.js) it imports. The bundle is a gzipped-base64 manifest; the
   dc-runtime is left out, since nothing here renders the sheet's page. */
function sheetScripts() {
  if (!fs.existsSync(SHEET)) return null;
  const html = fs.readFileSync(SHEET, 'utf8');
  const block = type => {
    const open = '<script type="' + type + '">', a = html.indexOf(open);
    return a < 0 ? null : html.slice(a + open.length, html.indexOf('</script>', a + open.length));
  };
  const manifest = JSON.parse(block('__bundler/manifest')), template = JSON.parse(block('__bundler/template'));
  const body = id => { const r = manifest[id]; let b = Buffer.from(r.data, 'base64'); if (r.compressed) b = zlib.gunzipSync(b); return b.toString('utf8'); };
  const helmet = Array.from(template.matchAll(/<script src="([0-9a-f-]{36})"><\/script>/g)).map(m => body(m[1]))
    .filter(t => !/^\/\/ GENERATED from dc-runtime/.test(t));
  const engine = (template.match(/component-from-global-scope="tm-iso-plate" from="([0-9a-f-]{36})#/) || [])[1];
  return engine ? helmet.concat([body(engine)]) : null;
}

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: false,
    args: ['--window-size=1616,1110', '--window-position=0,0'] });
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => { errs.push(String(e)); console.log('PAGEERROR', String(e)); });
  page.on('console', m => { if (m.type() === 'error') console.log('CONSOLE', m.text()); });
  page.on('response', r => { if (r.status() >= 400) console.log('  HTTP  ' + r.status() + ' ' + r.url().replace(BASE, '')); });
  // keep.js's autosave door: answered below from here, and kept away from the page so
  // nothing it does can write (there are no sections to write, but the probe need not trust that)
  await page.route('**/_toem2/default', r => r.fulfill({ status: 404, body: 'no door' }));

  const done = async () => {
    const after = WATCH.map(hash);
    const changed = WATCH.filter((f, i) => before[i] !== after[i]);
    say(!changed.length, 'nothing else on the site was written', changed.join(', ') || WATCH.length + ' files unchanged');
    say(!errs.length, 'no page errors', errs.join(' | '));
    console.log('\n' + (fails ? fails + ' FAILED' : 'all checks passed'));
    await page.waitForTimeout(300);
    await browser.close();
    process.exit(fails ? 1 : 0);
  };

  /* ── 1 · the doors ─────────────────────────────────────────────────────── */
  const d1 = await ask('GET', '/_toem2/default'), d2 = await ask('GET', '/_toem2/wall'), d3 = await ask('GET', '/_ironhive/wall');
  say(!!(d1.json && d1.json.door && d2.json && d2.json.door), "serve.js answers both of TOEM 2's doors",
    '/_toem2/default ' + d1.status + ' · /_toem2/wall ' + d2.status);
  say(!!(d3.json && d3.json.door), "…and the iron hive's wall door still answers beside them", String(d3.status));
  const bad = await ask('POST', '/_toem2/wall', { cam: { z: 1, cx: 0, cy: 0 } });
  say(bad.status === 400 && /no wall/.test((bad.json && bad.json.error) || ''), 'a publish with no wall in it is refused',
    bad.status + ' ' + JSON.stringify(bad.json));

  /* ── 2 · a first visit ─────────────────────────────────────────────────── */
  const N = SEED.wall.items.length;
  await page.goto(BASE + '/toem2/?seed=on', { waitUntil: 'load' });
  await page.evaluate(() => { try { localStorage.clear(); } catch (e) {} });
  const t0 = Date.now();
  await page.reload({ waitUntil: 'load' });
  await page.waitForFunction(n => window.Wall && window.Stickers && window.Lab &&
    Wall.store.get().items.filter(Boolean).length === n && Stickers.list.length > 0 &&
    document.querySelectorAll('svg.wall-ink .wall-item').length === n, N, { timeout: 30000 });
  note('seeded and painted', (Date.now() - t0) + ' ms after the reload began');
  await page.waitForTimeout(600);

  const head = await page.evaluate(() => {
    const name = document.querySelector('.lab-name');
    return { title: document.title, brand: document.querySelector('.lab-brand').textContent.replace(/\s+/g, ''),
             name: name.textContent, shown: name.getClientRects().length > 0, keys: Object.keys(localStorage) };
  });
  say(head.title === 'Knoll · TOEM 2', 'the tab reads Knoll · TOEM 2', JSON.stringify(head.title));
  say(head.name === 'TOEM 2' && head.shown && head.brand === 'knoll/TOEM2', 'the header reads knoll / TOEM 2', JSON.stringify(head.brand));
  say(head.keys.length > 0 && head.keys.every(k => k.indexOf('knoll-toem2:') === 0), 'everything the bench keeps is under knoll-toem2:', head.keys.join(', '));

  const seeded = await page.evaluate(seedItems => {
    const items = Wall.store.get().items.filter(Boolean);
    const nodes = Array.from(document.querySelectorAll('svg.wall-ink .wall-item'));
    const b = Wall.bounds(), r = Lab.bench.getBoundingClientRect();
    const tl = Lab.toWorld(r.left, r.top), br = Lab.toWorld(r.right, r.bottom);
    const per = {};
    items.forEach(it => { const m = /^tm-p(\d\d)-/.exec(it.f); if (m) per[m[1]] = (per[m[1]] || 0) + 1; });
    return { n: items.length, same: JSON.stringify(items) === JSON.stringify(seedItems),
             missing: items.filter(it => it.k !== 'd' || !Stickers.get(it.f)).map(it => it.f),
             painted: nodes.length, empty: nodes.filter(g => !g.firstElementChild).length, per,
             bounds: b, view: { x0: tl.x, y0: tl.y, x1: br.x, y1: br.y }, zoom: Lab.zoom,
             tape: window.Tape ? Tape.count : -1, tapeNodes: document.querySelectorAll('.tape').length };
  }, SEED.wall.items);
  say(seeded.same, 'a first visit opens on wall-seed.json, piece for piece', seeded.n + ' pieces');
  /* lab 2's tape.js parks one strip at world 60–700 × ~1100 on a fresh bench —
     which here lay straight across Town Square (found in this probe's own
     screenshot, 2026-09-12). This bench starts with none. */
  say(seeded.tape === 0 && seeded.tapeNodes === 0, 'and no caution tape lies across the plates',
    seeded.tape + ' strips in the store, ' + seeded.tapeNodes + ' on the paper');
  say(!seeded.missing.length, "every piece is a sticker stamp whose drawing is in the drawer's catalogue", seeded.missing.slice(0, 6).join(', ') || 'all ' + seeded.n);
  say(seeded.painted === N && seeded.empty === 0, 'and every one of them is painted', seeded.painted + ' painted, ' + seeded.empty + ' empty');
  say(PLATES.every(([, nn]) => seeded.per[nn] === PIECES[nn]), "each plate has the sheet's own count of pieces",
    PLATES.map(([, nn]) => nn + ':' + seeded.per[nn] + '/' + PIECES[nn]).join(' '));
  const V = seeded.view, B = seeded.bounds;
  say(!!B && B.x >= V.x0 && B.y >= V.y0 && B.x + B.w <= V.x1 && B.y + B.h <= V.y1, 'the camera opens framed on all eight plates',
    'zoom ' + seeded.zoom.toFixed(3) + ' · work ' + (B ? [B.x, B.y, B.x + B.w, B.y + B.h].map(Math.round).join(',') : 'none') +
    ' · view ' + [V.x0, V.y0, V.x1, V.y1].map(Math.round).join(','));
  await page.screenshot({ path: path.join(__dirname, 'plates-overview.png') });

  /* ── 3 · the drawer, through the dock ──────────────────────────────────── */
  await page.click('.dock-btn[data-tool="sticker"]');
  await page.waitForFunction(() => { const p = document.getElementById('stickers'); return p && !p.hidden && document.querySelectorAll('.sd-card').length > 0; });
  await page.waitForTimeout(300);
  const drawer = await page.evaluate(() => ({
    kits: Stickers.kits.map(k => k.id), n: Stickers.list.length,
    ids: Stickers.list.map(s => s.id),
    chips: Array.from(document.querySelectorAll('.sd-chip')).map(c => c.textContent.trim()),
    count: document.getElementById('sd-count').textContent, cards: document.querySelectorAll('.sd-card').length,
    byKit: Stickers.list.reduce((m, s) => { m[s.kit] = (m[s.kit] || 0) + 1; return m; }, {}) }));
  say(drawer.n === KITS.stickers.length && drawer.kits.length === KITS.kits.length, 'the drawer holds the whole catalogue',
    drawer.n + ' stickers in ' + drawer.kits.length + ' kits');
  say(drawer.count === drawer.n + ' STICKERS ON HAND' && drawer.cards === drawer.n, 'and says so, a card for each', drawer.count + ' · ' + drawer.cards + ' cards');
  say(Object.keys(BATCHES).every(k => drawer.byKit[k] === BATCHES[k]), "the ten batches hold the sheet's 202, batch for batch",
    Object.keys(BATCHES).map(k => drawer.byKit[k]).join(' '));
  say(PLATES.every(([, nn]) => drawer.byKit['tm-plate-' + nn] > 0), 'and each plate has a kit of its own pieces',
    PLATES.map(([, nn]) => nn + ':' + drawer.byKit['tm-plate-' + nn]).join(' '));
  say(drawer.kits.every(k => /^tm-/.test(k)) && drawer.ids.every(id => /^tm-/.test(id)), 'nothing from the iron hive is left in it',
    'every kit and sticker id is tm-*');
  say(drawer.chips.length === 19 && drawer.chips[0] === 'ALL' && drawer.chips[1] === 'TERRAIN' && drawer.chips[10] === 'BACKDROPS' &&
      drawer.chips[11] === '01 TOWN SQUARE' && drawer.chips[18] === '08 CLOCKTOWER ROOFTOPS', 'the chips read ALL, the batches, then the plates',
    drawer.chips.join(' | '));
  await page.click('.sd-chip[data-kit="tm-plate-05"]');
  await page.waitForTimeout(150);
  const chip05 = await page.evaluate(() => ({ cards: document.querySelectorAll('.sd-card').length, count: document.getElementById('sd-count').textContent }));
  say(chip05.cards === drawer.byKit['tm-plate-05'] && chip05.count === drawer.byKit['tm-plate-05'] + ' OF ' + drawer.n + ' STICKERS',
    'the 05 MEADOW PICNIC chip holds that plate\'s pieces', chip05.count);
  await page.click('.sd-chip[data-kit=""]');
  const kitName = id => (KITS.kits.find(k => k.id === id) || {}).name || '';
  const want = q => KITS.stickers.filter(s => s.name.toLowerCase().indexOf(q) >= 0 || kitName(s.kit).toLowerCase().indexOf(q) >= 0).length;
  await page.fill('#sd-q', 'lamp');
  await page.waitForTimeout(150);
  const lamp = await page.evaluate(() => document.querySelectorAll('.sd-card').length);
  say(lamp === want('lamp') && lamp > 1, 'a search for "lamp" finds the Lamp Post and every plate\'s lamp posts', lamp + ' cards');
  await page.fill('#sd-q', '');
  await page.evaluate(() => { document.getElementById('sd-q').blur(); Wall.setTool('move'); });
  await page.waitForTimeout(200);

  /* ── 4 · fidelity, against the sheet's own engine ──────────────────────── */
  const scripts = sheetScripts();
  if (!scripts) {
    note('the sheet is not at ' + SHEET + ' — fidelity not checked');
  } else {
    for (const s of scripts) await page.addScriptTag({ content: s });
    const same = await page.evaluate(() => {
      const bad = [], grown = [], overhung = [];
      let n = 0;
      for (let i = 1; i <= 10; i++) (window['TM_BATCH' + String(i).padStart(2, '0')] || []).forEach(s => {
        n++;
        const c = Stickers.get(s.id);
        if (!c || c.name !== s.name) { bad.push(s.id); return; }
        if (c.d === s.d && c.w === s.w && c.h === s.h) return;
        // grown: the sheet's drawing, untouched, in a bigger box — wrapped in a translate when it grew up or left
        const m = /^<g transform="translate\(([\d.]+) ([\d.]+)\)">([\s\S]*)<\/g>$/.exec(c.d);
        const tx = m ? +m[1] : 0, ty = m ? +m[2] : 0, inner = m ? m[3] : c.d;
        if (inner === s.d && c.w >= s.w + tx && c.h >= s.h + ty) {
          grown.push(s.id + ' ' + s.w + '×' + s.h + '→' + c.w + '×' + c.h);
          if (s.conn || i === 10) overhung.push(s.id);
        } else bad.push(s.id);
      });
      return { n, bad, grown, overhung };
    });
    say(same.n === 202 && !same.bad.length, "every batch sticker is the sheet's own id, name and drawing", same.bad.join(', ') || same.n + ' of 202');
    say(!same.overhung.length, 'no connector or backdrop had its box grown — their overhang is the seam cover', same.overhung.join(', ') || same.grown.length + ' grown, none of them those');
    note('boxes grown to their ink', same.grown.join(' · ') || 'none');

    const fid = await page.evaluate(async ({ plates, wantDiff }) => {
      const NS = 'http://www.w3.org/2000/svg', ser = new XMLSerializer();
      const ARCH = /^tm-p\d\d-(slab|patch|wall|roof|stairs|door|route|wire)(-\d\d)?$/;
      const vb = [-260, -360, 2440, 1800], K = 0.5, T = 16;     // the kit's 1920×1080 frame and a margin all round
      const PW = Math.round(vb[2] * K), PH = Math.round(vb[3] * K);
      async function raster(markup) {
        const box = document.createElement('div');
        box.innerHTML = '<svg xmlns="' + NS + '" width="' + PW + '" height="' + PH + '" viewBox="' + vb.join(' ') + '">' + markup + '</svg>';
        const img = new Image();
        img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(ser.serializeToString(box.firstChild));
        await img.decode();
        const c = document.createElement('canvas');
        c.width = PW; c.height = PH;
        const cx = c.getContext('2d', { willReadFrequently: true });
        cx.drawImage(img, 0, 0);
        return cx.getImageData(0, 0, PW, PH).data;
      }
      // a pixel is OFF when its coverage, or its coverage-weighted colour, is more than T apart
      function compare(a, b, mask) {
        let ink = 0, off = 0;
        for (let i = 0; i < a.length; i += 4) {
          const aa = a[i + 3], ba = b[i + 3];
          if (aa > 8 || ba > 8) ink++;
          if (Math.max(Math.abs(aa - ba), Math.abs(a[i] * aa - b[i] * ba) / 255,
                       Math.abs(a[i + 1] * aa - b[i + 1] * ba) / 255, Math.abs(a[i + 2] * aa - b[i + 2] * ba) / 255) > T) {
            off++;
            if (mask) mask[i >> 2] = 1;
          }
        }
        return { ink, off };
      }
      function diffPng(a, b) {
        const mask = new Uint8Array(PW * PH);
        compare(a, b, mask);
        const c = document.createElement('canvas');
        c.width = PW; c.height = PH;
        const cx = c.getContext('2d'), img = cx.createImageData(PW, PH), d = img.data;
        for (let p = 0; p < mask.length; p++) {
          const i = p * 4;
          if (mask[p]) { d[i] = 230; d[i + 1] = 20; d[i + 2] = 20; }
          else { const g = 255 - a[i + 3] * 0.3; d[i] = d[i + 1] = d[i + 2] = g; }
          d[i + 3] = 255;
        }
        cx.putImageData(img, 0, 0);
        return c.toDataURL('image/png');
      }
      const round = v => Math.round(v * 10) / 10;              // wall.js's own
      const items = Wall.store.get().items, out = [];
      for (const [id, nn] of plates) {
        const lv = TM_LEVELS[id];
        const idx = [];
        items.forEach((it, i) => { if (it && it.f.indexOf('tm-p' + nn + '-') === 0) idx.push(i); });
        // the plate as wall.js painted it, in the order it painted it
        const nodes = idx.map(i => document.querySelector('svg.wall-ink .wall-item[data-i="' + i + '"]')).filter(Boolean)
          .sort((p, q) => (p.compareDocumentPosition(q) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1));

        // B · every painted node stands where its record says, to wall.js's tenth of a pixel
        const unlike = [];
        nodes.forEach(g => {
          const it = items[+g.getAttribute('data-i')], s = Stickers.get(it.f), sc = it.z / Math.max(s.w, s.h, 1);
          const t = g.getAttribute('transform') || '';
          const m = /^translate\((-?[\d.e-]+),(-?[\d.e-]+)\)( scale\(-1,1\))? translate\((-?[\d.e-]+),(-?[\d.e-]+)\) scale\((-?[\d.e-]+)\)$/.exec(t);
          const ok = m && Math.abs(+m[1] - it.x) <= 0.051 && Math.abs(+m[2] - it.y) <= 0.051 && !!m[3] === !!it.fx &&
                     Math.abs(+m[4] + s.w * sc / 2) <= 0.051 && Math.abs(+m[5] + s.h * sc / 2) <= 0.051 &&
                     Math.abs(+m[6] - sc) <= sc * 1e-9;
          if (!ok) unlike.push(it.f + ' painted "' + t + '" for x ' + it.x + ' y ' + it.y + ' scale ' + sc + (it.fx ? ' mirrored' : ''));
        });

        // where the seed put the plate's origin, read back off one architecture piece's own crop
        const first = idx.find(i => ARCH.test(items[i].f));
        const st = Stickers.get(items[first].f);
        const om = /^<g transform="translate\((-?[\d.]+) (-?[\d.]+)\)">/.exec(st.d) || [0, 0, 0];
        const PX = items[first].x - st.w / 2 + +om[1], PY = items[first].y - st.h / 2 + +om[2];
        const shift = '<g transform="translate(' + (-PX) + ' ' + (-PY) + ')">';

        // A · the plate drawn from its records with wall.js's stamp transform and nothing rounded;
        //     one piece may be nudged dx world px (null: left out)
        const exact = (g, dx) => {
          const it = items[+g.getAttribute('data-i')], s = Stickers.get(it.f), sc = it.z / Math.max(s.w, s.h, 1);
          return '<g transform="translate(' + (it.x + dx) + ',' + it.y + ')' + (it.fx ? ' scale(-1,1)' : '') +
                 ' translate(' + (-s.w * sc / 2) + ',' + (-s.h * sc / 2) + ') scale(' + sc + ')">' + s.d + '</g>';
        };
        const drawn = (moved, dx) => shift + nodes.map(g => {
          const i = +g.getAttribute('data-i');
          return i !== moved ? exact(g, 0) : dx === null ? '' : exact(g, dx);
        }).join('') + '</g>';

        const engineMarkup = TM_ISO.render(lv, {});
        const E = await raster(engineMarkup);
        const X = await raster(drawn(-1, 0));
        const maskBase = new Uint8Array(PW * PH);
        const r = compare(E, X, maskBase);
        /* THE SECOND LOOK. A plate past the bound at half scale has its off
           pixels looked at again at 8x: a real difference is still there, and a
           hairline that the half-scale raster resolved two ways is not.
           Measured before it was written (2026-09-12): Rainy Station's 44 px at
           half scale were one 530 × 16 px band of long near-flat patch edges
           along the platform, every record overlapping it in the engine's own
           paint order, and 0 px off of 1,571,328 at 8x. A box too big to look
           at that closely is not looked at, and fails — a plate-wide
           difference is no hairline. */
        const boxOf = mask => {
          let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
          for (let p = 0; p < mask.length; p++) {
            if (!mask[p]) continue;
            const x = p % PW, y = (p - x) / PW;
            if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
          }
          return x1 < 0 ? null : { x0: vb[0] + x0 / K - 14, y0: vb[1] + y0 / K - 14, x1: vb[0] + (x1 + 1) / K + 14, y1: vb[1] + (y1 + 1) / K + 14 };
        };
        const lookAt = async (b, markupA, markupB) => {
          if (!b) return { off: 0, px: 0, w: 0, h: 0 };
          const ZK = 8, zvb = [b.x0, b.y0, b.x1 - b.x0, b.y1 - b.y0];
          const ZW = Math.round(zvb[2] * ZK), ZH = Math.round(zvb[3] * ZK);
          if (ZW * ZH > 16e6) return { off: Infinity, px: ZW * ZH, tooBig: true };
          const one = async m => {
            const box = document.createElement('div');
            box.innerHTML = '<svg xmlns="' + NS + '" width="' + ZW + '" height="' + ZH + '" viewBox="' + zvb.join(' ') + '">' + m + '</svg>';
            const img = new Image();
            img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(ser.serializeToString(box.firstChild));
            await img.decode();
            const c = document.createElement('canvas');
            c.width = ZW; c.height = ZH;
            const cx = c.getContext('2d', { willReadFrequently: true });
            cx.drawImage(img, 0, 0);
            return cx.getImageData(0, 0, ZW, ZH).data;
          };
          return { off: compare(await one(markupA), await one(markupB)).off, px: ZW * ZH, w: Math.round(zvb[2]), h: Math.round(zvb[3]) };
        };
        const relook = r.off > 40 ? await lookAt(boxOf(maskBase), engineMarkup, drawn(-1, 0)) : null;
        // how much of a piece shows on its plate: leave it out, count what changes
        const showing = async i => compare(X, await raster(drawn(i, null))).off;
        // CONTROL 1: of the plate's eight largest stamps, the one that shows most, 6px out
        let big = null, bigShows = -1;
        for (const i of idx.filter(i => !ARCH.test(items[i].f)).sort((p, q) => items[q].z - items[p].z).slice(0, 8)) {
          const s = await showing(i);
          if (s > bigShows) { bigShows = s; big = i; }
        }
        const maskCtrl = new Uint8Array(PW * PH);
        const c1 = compare(E, await raster(drawn(big, 6)), maskCtrl).off;
        // …and on a plate that needed the second look, the control gets one too — on its own
        // pixels, not the hairline's — and must still be caught: the look forgives no real move
        let c1look = null;
        if (relook) {
          for (let p = 0; p < maskCtrl.length; p++) if (maskBase[p]) maskCtrl[p] = 0;
          c1look = await lookAt(boxOf(maskCtrl), engineMarkup, drawn(big, 6));
        }
        // CONTROL 2: the surface patch that shows most, 6px out
        let c2 = null, patch = null, shows = 0;
        for (const i of idx.filter(i => /-patch(-\d\d)?$/.test(items[i].f))) {
          const s = await showing(i);
          if (s > shows) { shows = s; patch = i; }
        }
        if (patch != null) c2 = compare(E, await raster(drawn(patch, 6))).off;
        // and, for the record: the wall as painted, wall.js's rounding and all
        const painted = compare(E, await raster(shift + nodes.map(g => ser.serializeToString(g)).join('') + '</g>')).off;

        out.push({ nn, name: id, pieces: nodes.length, engine: lv.items.length, ink: r.ink, off: r.off, painted, relook, c1look,
                   unlike: unlike.slice(0, 3), unlikeN: unlike.length,
                   c1, bigF: items[big].f, bigZ: Math.round(items[big].z), bigShows,
                   c2, patchF: patch != null ? items[patch].f : null, shows,
                   png: wantDiff ? diffPng(E, X) : null });
      }
      return out;
    }, { plates: PLATES, wantDiff: DIFF });
    if (DIFF) fs.mkdirSync(RESULTS, { recursive: true });
    fid.forEach(f => {
      const settled = f.off <= 40 || (!!f.relook && !f.relook.tooBig && f.relook.off <= 40 && !!f.c1look && f.c1look.off >= 200);
      say(f.pieces === f.engine && settled, f.nn + ' ' + f.name + ": drawn from its records, the plate is the sheet's engine's",
        f.pieces + '/' + f.engine + ' pieces · ' + f.off + ' px off of ' + f.ink + ' inked' +
        (f.relook ? ' → looked at again at 8x (' + (f.relook.tooBig ? 'too big to look at: ' + f.relook.px + ' px' : f.relook.w + ' × ' + f.relook.h + ' px of plate') +
          '): ' + f.relook.off + ' px off; the 6px control looked at the same way: ' + (f.c1look ? f.c1look.off : 'n/a') + ' px off' : ''));
      say(f.c1 >= 200, '     …and that comparison catches its most visible large stamp 6px out',
        f.bigF + ' (' + f.bigZ + 'u, ' + f.bigShows + ' px of it showing): ' + f.c1 + ' px off');
      if (f.c2 != null) say(f.c2 >= 60, '     …and its most visible surface patch 6px out', f.patchF + ' (' + f.shows + ' px of it showing): ' + f.c2 + ' px off');
      else note('     ' + f.nn + ' has no surface patch to nudge');
      say(f.unlikeN === 0, "     …and every painted piece stands where its record says, to wall.js's tenth of a pixel",
        f.unlikeN ? f.unlikeN + ' do not: ' + f.unlike.join(' | ') : f.pieces + ' of ' + f.pieces);
      note('     painted, with wall.js\'s rounding', f.painted + ' px off the engine');
      if (f.png) fs.writeFileSync(path.join(RESULTS, 'diff-' + f.nn + '.png'), Buffer.from(f.png.split(',')[1], 'base64'));
    });
  }

  /* ── 5 · moving things, with a real mouse ──────────────────────────────── */
  // frame a plate so a press can land on ink
  const frameOn = async (nn, fill) => page.evaluate(({ nn, fill }) => {
    const items = Wall.store.get().items, idx = [];
    items.forEach((it, i) => { if (it && it.f.indexOf('tm-p' + nn + '-') === 0) idx.push(i); });
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    idx.forEach(i => {
      const r = document.querySelector('svg.wall-ink .wall-item[data-i="' + i + '"]').getBoundingClientRect();
      x0 = Math.min(x0, r.left); y0 = Math.min(y0, r.top); x1 = Math.max(x1, r.right); y1 = Math.max(y1, r.bottom);
    });
    const a = Lab.toWorld(x0, y0), b = Lab.toWorld(x1, y1), br = Lab.bench.getBoundingClientRect();
    const z = Math.min(br.width * fill / (b.x - a.x), br.height * fill / (b.y - a.y));
    Lab.camTo(z, br.width / 2 - (a.x + b.x) / 2 * z, br.height / 2 - (a.y + b.y) / 2 * z, 0);
    return { idx, box: { x0: a.x, y0: a.y, x1: b.x, y1: b.y } };
  }, { nn, fill });
  // a point on a piece's own ink that is on top, for a press to find
  const inkPoint = (idx, arch) => page.evaluate(({ idx, arch }) => {
    const ARCH = /^tm-p\d\d-(slab|patch|wall|roof|stairs|door|route|wire)(-\d\d)?$/;
    const items = Wall.store.get().items;
    const cands = idx.filter(i => arch || !ARCH.test(items[i].f)).sort((p, q) => items[q].z - items[p].z);
    for (const i of cands) {
      const g = document.querySelector('svg.wall-ink .wall-item[data-i="' + i + '"]'), r = g.getBoundingClientRect();
      for (const [fx, fy] of [[0.5, 0.5], [0.5, 0.62], [0.42, 0.5], [0.58, 0.5], [0.5, 0.38], [0.5, 0.75]]) {
        const x = r.left + r.width * fx, y = r.top + r.height * fy;
        const hit = document.elementFromPoint(x, y), owner = hit && hit.closest && hit.closest('.wall-item');
        if (owner === g) return { i, f: items[i].f, x, y };
      }
    }
    return null;
  }, { idx, arch });
  const drag = async (x, y, dx, dy) => {
    await page.mouse.move(x, y);
    await page.mouse.down();
    for (let s = 1; s <= 14; s++) { await page.mouse.move(x + dx * s / 14, y + dy * s / 14); await page.waitForTimeout(16); }
    await page.mouse.up();
    await page.waitForTimeout(300);
  };
  const snapshot = () => page.evaluate(() => ({ items: JSON.parse(JSON.stringify(Wall.store.get().items)), zoom: Lab.zoom }));

  const p05 = await frameOn('05', 0.6);
  await page.waitForTimeout(400);
  const grab = await inkPoint(p05.idx, false);
  say(!!grab, 'a press can find one of Meadow Picnic\'s pieces by its ink', grab ? grab.f : 'nothing on top anywhere');
  if (grab) {
    const s0 = await snapshot();
    await drag(grab.x, grab.y, 90, 50);
    const s1 = await snapshot();
    const moved = s1.items.map((it, i) => (JSON.stringify(it) !== JSON.stringify(s0.items[i]) ? i : -1)).filter(i => i >= 0);
    const it0 = s0.items[grab.i], it1 = s1.items[grab.i];
    const dx = it1.x - it0.x, dy = it1.y - it0.y, ex = 90 / s0.zoom, ey = 50 / s0.zoom;
    say(moved.length === 1 && moved[0] === grab.i && Math.abs(dx - ex) < 1.5 && Math.abs(dy - ey) < 1.5,
      'a real drag moves that one piece, by the drag, and nothing else',
      moved.length + ' moved · ' + dx.toFixed(1) + ',' + dy.toFixed(1) + ' world px against ' + ex.toFixed(1) + ',' + ey.toFixed(1));
    await page.keyboard.press('Control+z');
    await page.waitForTimeout(300);
    const s2 = await snapshot();
    say(JSON.stringify(s2.items) === JSON.stringify(s0.items), 'ctrl+z puts it back exactly', '');
  }
  await page.screenshot({ path: path.join(__dirname, 'plate-meadow.png') });

  // a band round Hillside Farm, from bare paper outside it to bare paper past it
  const p06 = await frameOn('06', 0.5);
  await page.waitForTimeout(400);
  const band = await page.evaluate(box => {
    const M = 120, z = Lab.zoom, br = Lab.bench.getBoundingClientRect(), pan = Lab.pan;
    const sx = wx => br.left + pan.x + wx * z, sy = wy => br.top + pan.y + wy * z;
    const a = { x: sx(box.x0 - M), y: sy(box.y0 - M) }, b = { x: sx(box.x1 + M), y: sy(box.y1 + M) };
    const back = Lab.toWorld(a.x, a.y);                       // the arithmetic above, checked against lab.js's own
    const hit = document.elementFromPoint(a.x, a.y);
    return { a, b, check: Math.hypot(back.x - (box.x0 - M), back.y - (box.y0 - M)),
             bare: !(hit && hit.closest && hit.closest('.wall-item')),
             inside: a.x > br.left + 70 && a.y > br.top + 70 && b.x < br.right - 70 && b.y < br.bottom - 70 };
  }, p06.box);
  say(band.check < 1 && band.bare && band.inside, 'the band starts on bare paper and stays clear of the bench edge',
    'screen ' + [band.a.x, band.a.y, band.b.x, band.b.y].map(Math.round).join(',') + ' · world check ' + band.check.toFixed(2));
  const b0 = await snapshot();
  await drag(band.a.x, band.a.y, band.b.x - band.a.x, band.b.y - band.a.y);
  const picked = await page.evaluate(() => Wall.picked);
  say(picked === PIECES['06'], 'a band round Hillside Farm picks every piece of it, and nothing else', picked + ' picked of ' + PIECES['06']);
  const hold = await inkPoint(p06.idx, true);
  if (hold) {
    await drag(hold.x, hold.y, 120, 70);
    const b1 = await snapshot();
    const moved = b1.items.map((it, i) => (JSON.stringify(it) !== JSON.stringify(b0.items[i]) ? i : -1)).filter(i => i >= 0);
    /* ONE OFFSET, TO WALL.JS'S TENTH. The seed keeps a thousandth and wall.js
       writes a moved piece back through its own round(), so each piece lands on
       the tenth nearest its own start: the deltas agree to within 0.1 world px,
       not to the digit. (The first cut compared them to one decimal, which only
       held while the seed was itself rounded to a tenth.) */
    const dxs = moved.map(i => b1.items[i].x - b0.items[i].x), dys = moved.map(i => b1.items[i].y - b0.items[i].y);
    const spread = v => (v.length ? Math.max.apply(null, v) - Math.min.apply(null, v) : Infinity);
    const only06 = moved.every(i => b0.items[i].f.indexOf('tm-p06-') === 0);
    say(moved.length === PIECES['06'] && only06 && spread(dxs) <= 0.1001 && spread(dys) <= 0.1001,
      'dragging one of them carries the whole plate together, and only the plate',
      moved.length + ' moved · offset ' + (dxs.length ? dxs[0].toFixed(2) + ',' + dys[0].toFixed(2) : 'none') +
      ' world px, spread ' + spread(dxs).toFixed(3) + ' × ' + spread(dys).toFixed(3));
    await page.keyboard.press('Control+z');
    await page.waitForTimeout(300);
    const b2 = await snapshot();
    say(JSON.stringify(b2.items) === JSON.stringify(b0.items), 'one ctrl+z puts the whole plate back', '');
  } else say(false, 'a press can find one of Hillside Farm\'s pieces by its ink', 'nothing on top anywhere');
  await page.keyboard.press('Escape');

  return done();
})().catch(e => { console.error(e); process.exit(1); });
