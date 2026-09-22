#!/usr/bin/env node
/* ─── SHOT-GAMES ──────────────────────────────────────────────────────────
   perf/shot-games.js — open each generated game page the way a visitor
   opens it and take its picture, so a composition can be judged by LOOKING
   at it rather than by reading its coordinates. Plan §0.5: Appendix E's
   numbers are "a first guess … the fixture tests and probes are how it gets
   corrected", and this is the probe that corrects them.

   USAGE (from site/, with the sandbox server up on 4322):

       node lab2/test/perf/shot-games.js                 # pixelfort, mosslight, neonrun
       node lab2/test/perf/shot-games.js neonrun         # just the one
       node lab2/test/perf/shot-games.js --label before  # write under results/<label>/

   WHAT IT WRITES, into perf/results/phase5/ (or --label):
     game-<slug>.png        the whole viewport at the page's OWN opening
                            zoom — what a visitor sees before touching
                            anything, which is the only view a composition
                            can honestly be judged in
     words-<slug>.png       the same frame cropped to the union of the note
                            and sign props, padded 40 px. A crop and not a
                            second, closer screenshot: the point of the shot
                            is to read the words AT THE SIZE THE PAGE OPENED
                            THEM, and a zoomed-in second pass would answer a
                            question nobody asked.
     summary.json           a row per page: zoom, section counts, the parts
                            kits.js has live, the paper and sticker tokens,
                            the words' own box, and every console error.

   1600 × 1000 at DPR 1, headed system Chrome, the launch line every
   lab2/perf script uses. Every request under `_lab2` is answered 404 in the
   page before it loads, so keep.js finds no door, nothing is ever POSTed and
   no page's index.html is touched by looking at it. THAT 404 IS THIS
   SCRIPT'S OWN and is counted out of the errors; anything else is reported.
   ───────────────────────────────────────────────────────────────────────── */
'use strict';
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const TEST = path.resolve(__dirname, '..');
const BASE = 'http://localhost:4322/lab2/test/games/';
const ALL = ['pixelfort', 'mosslight', 'neonrun'];
const VIEW = { width: 1600, height: 1000 };
const SETTLE = 3500;      // the boot queue is 3 panels at a time and the sheet is 223 KB; 3.5 s is quiet on this machine
const PAD = 40;           // the crop's margin, in screen px: enough paper round the words to see what they sit on

function main(argv) {
  const label = (() => { const i = argv.indexOf('--label'); return i >= 0 ? argv[i + 1] : 'phase5'; })();
  const slugs = argv.filter((a, i) => !/^--/.test(a) && argv[i - 1] !== '--label');
  return { label, slugs: slugs.length ? slugs : ALL };
}

(async () => {
  const { label, slugs } = main(process.argv.slice(2));
  const OUT = path.join(TEST, 'perf', 'results', label);
  fs.mkdirSync(OUT, { recursive: true });

  const browser = await chromium.launch({
    channel: 'chrome', headless: false,
    args: ['--window-size=1616,1110', '--window-position=0,0']
  });
  const rows = [];
  for (const slug of slugs) {
    const ctx = await browser.newContext({ viewport: VIEW, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    const errors = [], bad = [];
    page.on('pageerror', e => errors.push('page: ' + String(e).slice(0, 200)));
    /* the door's own 404 arrives as a console error with no URL in its TEXT
       — Chrome puts it in the message's location, which is why that is what
       is read here rather than the string */
    page.on('console', m => {
      if (m.type() !== 'error') return;
      const at = (m.location() && m.location().url) || '';
      if (/_lab2/.test(at)) return;
      errors.push('console: ' + m.text().slice(0, 200) + (at ? ' @ ' + at.replace('http://localhost:4322', '') : ''));
    });
    page.on('response', r => { if (r.status() >= 400 && !/_lab2|favicon/.test(r.url())) bad.push(r.status() + ' ' + r.url().replace('http://localhost:4322', '')); });
    // the door, shut: keep.js knocks once, hears 404 and goes quiet for good
    await page.route('**/_lab2/**', r => r.fulfill({ status: 404, body: 'no' }));

    await page.goto(BASE + slug + '/', { waitUntil: 'load' });
    await page.waitForFunction(() => window.Lab && window.Frames && window.Kits, null, { timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(SETTLE);

    const info = await page.evaluate(() => {
      const box = sel => {
        let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity, n = 0;
        document.querySelectorAll(sel).forEach(el => {
          const r = el.getBoundingClientRect();
          if (!r.width || !r.height) return;
          n++; x0 = Math.min(x0, r.x); y0 = Math.min(y0, r.y); x1 = Math.max(x1, r.right); y1 = Math.max(y1, r.bottom);
        });
        return n ? { x: Math.round(x0), y: Math.round(y0), w: Math.round(x1 - x0), h: Math.round(y1 - y0), n } : null;
      };
      const st = window.Kits && Kits.stats ? Kits.stats() : {};
      const css = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
      return {
        title: document.title,
        zoom: +(window.Lab ? Lab.zoom : 0).toFixed(4),
        sections: document.querySelectorAll('.gz').length,
        pics: document.querySelectorAll('.gz-pic').length,
        shots: document.querySelectorAll('.gz-shot').length,
        notes: document.querySelectorAll('.gz-note').length,
        signs: document.querySelectorAll('.gz-sign').length,
        kitParts: st.parts != null ? st.parts : -1,
        live: st.live != null ? st.live : -1,
        style: st.style || null,
        loading: window.Frames ? Frames.panels.filter(p => p.loading).length : -1,
        iframes: document.querySelectorAll('iframe').length,
        paper: css('--paper'), ink: css('--ink'), skPrimary: css('--sk-primary'),
        words: box('.gz-note, .gz-sign'),
        /* every distinct type size in the notes, in SCREEN pixels at this
           page's own opening zoom — the number that says whether a visitor
           can read it. A note prop is drawn at data-scale 1 and its svg is
           the note's world box, so the fitted scale is 1 and screen px is
           just the size the <text> carries times the camera. */
        typePx: [...new Set([...document.querySelectorAll('.gz-note text')]
          .map(t => +(parseFloat(getComputedStyle(t).fontSize) * (window.Lab ? Lab.zoom : 1)).toFixed(1)))].sort((a, b) => b - a)
      };
    });

    await page.screenshot({ path: path.join(OUT, 'game-' + slug + '.png') });
    if (info.words) {
      const clip = {
        x: Math.max(0, info.words.x - PAD), y: Math.max(0, info.words.y - PAD),
        width: Math.min(VIEW.width, info.words.w + 2 * PAD), height: Math.min(VIEW.height, info.words.h + 2 * PAD)
      };
      clip.width = Math.min(clip.width, VIEW.width - clip.x);
      clip.height = Math.min(clip.height, VIEW.height - clip.y);
      await page.screenshot({ path: path.join(OUT, 'words-' + slug + '.png'), clip });
    }

    const row = Object.assign({ slug }, info, { errors, bad });
    rows.push(row);
    console.log(slug + ' ' + JSON.stringify({ zoom: info.zoom, sections: info.sections, pics: info.pics, shots: info.shots, live: info.live, style: info.style, words: info.words }));
    if (errors.length) console.log('  ERRORS: ' + errors.slice(0, 6).join(' | '));
    if (bad.length) console.log('  4xx: ' + [...new Set(bad)].slice(0, 6).join(' | '));
    await ctx.close();
  }
  await browser.close();
  fs.writeFileSync(path.join(OUT, 'summary.json'), JSON.stringify({ at: new Date().toISOString(), view: VIEW, rows }, null, 1));
  console.log('wrote ' + path.relative(process.cwd(), path.join(OUT, 'summary.json')).replace(/\\/g, '/'));
  const errs = rows.reduce((n, r) => n + r.errors.length + r.bad.length, 0);
  process.exit(errs ? 1 : 0);
})().catch(e => { console.error(e && e.stack || e); process.exit(1); });
