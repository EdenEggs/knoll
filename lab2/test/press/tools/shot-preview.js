#!/usr/bin/env node
/* ─── SHOT-PREVIEW ────────────────────────────────────────────────────────
   press/tools/shot-preview.js — open press/tools/preview-harness.html and
   take its picture, so the mockups can be judged by LOOKING at them. The
   companion of perf/shot-games.js, which does the same for the built pages:
   the question this answers is whether a mockup reads as ITS game, and
   whether it reads as the page perf/results/phase5/game-<slug>.png shows.

   USAGE (from site/, with the sandbox server up on 4322):

       node lab2/test/press/tools/shot-preview.js
       node lab2/test/press/tools/shot-preview.js neonrun      # one fixture
       node lab2/test/press/tools/shot-preview.js --w 900      # a wider card
       node lab2/test/press/tools/shot-preview.js --label try2  # somewhere else

   WHAT IT WRITES, into perf/results/press/ (or --label):
     preview-row-<slug>.png   one fixture's three mockups side by side, which
                              is the view the choice is actually made in
     preview-<slug>-<recipe>.png   each card on its own, cropped to the card
     preview-all.png          the whole page
     preview-summary.json     the harness's own answer block — a row per
                              mockup with its recipe, its box and every
                              warning preview.js returned — plus the console

   1720 × 1000 at DPR 2 (a mockup is a small picture and a 1× shot of one is
   too coarse to judge type on), headed system Chrome, the launch line every
   lab2/perf script uses. Everything under `_lab2` is answered 404 in the
   page before it loads: the harness has no keep.js on it, but the rule that
   nothing here can write a file by being looked at is the folder's and not
   this script's to bend.
   ───────────────────────────────────────────────────────────────────────── */
'use strict';
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const TEST = path.resolve(__dirname, '..', '..');
const URL0 = 'http://localhost:4322/lab2/test/press/tools/preview-harness.html';
const VIEW = { width: 1720, height: 1000 };
const DPR = 2;              // a card is ~520 px across; at 1× its 10-px type is unreadable in a PNG and the point is to read it
const SETTLE = 1200;        // the sheet is 223 KB and every card's art is a fetch; a second is quiet on this machine

function args(argv) {
  const flag = (name, d) => { const i = argv.indexOf('--' + name); return i >= 0 ? argv[i + 1] : d; };
  const label = flag('label', 'press');
  const w = flag('w', '520');
  const only = argv.filter((a, i) => !/^--/.test(a) && !/^--/.test(argv[i - 1] || ''))[0] || null;
  return { label, w, only };
}

(async () => {
  const { label, w, only } = args(process.argv.slice(2));
  const OUT = path.join(TEST, 'perf', 'results', label);
  fs.mkdirSync(OUT, { recursive: true });

  const url = URL0 + '?w=' + encodeURIComponent(w) + (only ? '&only=' + encodeURIComponent(only) : '');
  const browser = await chromium.launch({
    channel: 'chrome', headless: false,
    args: ['--window-size=1736,1110', '--window-position=0,0']
  });
  const ctx = await browser.newContext({ viewport: VIEW, deviceScaleFactor: DPR });
  const page = await ctx.newPage();
  const errors = [], bad = [];
  page.on('pageerror', e => errors.push('page: ' + String(e).slice(0, 300)));
  page.on('console', m => {
    if (m.type() !== 'error') return;
    const at = (m.location() && m.location().url) || '';
    if (/_lab2/.test(at)) return;
    errors.push('console: ' + m.text().slice(0, 300) + (at ? ' @ ' + at.replace('http://localhost:4322', '') : ''));
  });
  page.on('response', r => { if (r.status() >= 400 && !/_lab2|favicon/.test(r.url())) bad.push(r.status() + ' ' + r.url().replace('http://localhost:4322', '')); });
  await page.route('**/_lab2/**', r => r.fulfill({ status: 404, body: 'no' }));

  await page.goto(url, { waitUntil: 'load' });
  // 'attached' and not the default 'visible': the answer block is a <script>
  await page.waitForSelector('#answer', { state: 'attached', timeout: 30000 });
  await page.waitForTimeout(SETTLE);

  const answer = JSON.parse(await page.$eval('#answer', el => el.textContent));

  // the whole page, then a row at a time, then a card at a time
  await page.screenshot({ path: path.join(OUT, 'preview-all.png'), fullPage: true });

  const rows = await page.$$('.row');
  const heads = await page.$$eval('h2', ns => ns.map(n => n.textContent.split(' — ')[0]));
  for (let i = 0; i < rows.length; i++) {
    const slug = heads[i] || ('row' + i);
    await rows[i].screenshot({ path: path.join(OUT, 'preview-row-' + slug + '.png') });
  }
  const cards = await page.$$('figure');
  const caps = await page.$$eval('figure figcaption b', ns => ns.map(n => n.textContent));
  for (let i = 0; i < cards.length; i++) {
    const name = String(caps[i] || ('card' + i)).replace(/\s*\(.*$/, '').replace(/\s*·\s*/g, '-').replace(/[^a-z0-9-]/gi, '');
    const el = await cards[i].$('.card');
    if (el) await el.screenshot({ path: path.join(OUT, 'preview-' + name + '.png') });
  }

  fs.writeFileSync(path.join(OUT, 'preview-summary.json'),
    JSON.stringify({ url, at: new Date().toISOString(), viewport: VIEW, dpr: DPR, answer, errors, bad }, null, 2));

  await browser.close();

  const warned = (answer.rows || []).reduce((n, r) => n + ((r.warnings && r.warnings.length) || 0), 0);
  console.log('cards      ' + (answer.rows || []).length + ' at ' + answer.cardWidth + ' px');
  console.log('preview    { ' + (answer.previewKeys || []).join(', ') + ' }');
  console.log('root       ' + ((answer.rootTokens || []).length ? 'TOKENS ON :root — ' + answer.rootTokens.join(', ') : 'no custom property on the document root'));
  console.log('warnings   ' + warned);
  for (const r of answer.rows || []) {
    console.log('  ' + (r.slug + '/' + r.recipe).padEnd(26) + (r.error ? 'ERROR ' + r.error : r.width + '×' + r.height + '  ' + r.slots + ' slots'));
    for (const w2 of r.warnings || []) console.log('      ! ' + w2);
  }
  if (answer.threw) console.log('THREW      ' + answer.threw);
  console.log('errors     ' + (errors.length ? errors.join('\n           ') : 'none'));
  console.log('bad        ' + (bad.length ? bad.join('\n           ') : 'none'));
  console.log('wrote      ' + path.relative(process.cwd(), OUT));
  process.exit(answer.threw || errors.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
