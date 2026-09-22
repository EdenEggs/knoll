#!/usr/bin/env node
/* ─── CHECK-SHEET ─────────────────────────────────────────────────────────
   Reads the built sheet, features/stickers-core.dc.html, the way kits.js
   and Design Canvas will read it — as text, no browser — and asks whether
   what build-sheet.js wrote is the sheet the contract describes. The build
   lints every PART before it writes; this checks the WHOLE: the data-props
   that a bench's extractor and the canvas's prop panel both parse, the
   forty options in Appendix D's order, the forty tag lists, and the forty
   <sc-if> blocks that have to agree with them flag for flag. render-part.js
   shows a part; verify-sheet.js boots the sheet in Chrome; this is the
   check that needs neither and runs in a tenth of a second, so it is the
   one to run after every build.

   USAGE (from site/):

       node lab2/test/press/tools/check-sheet.js

   Prints PASS/FAIL a line and a count at the end, exits 1 on any FAIL, and
   writes perf/results/parts/check-sheet.json (CONTRACTS.md §11).

   WHAT IT ASKS, and where each rule comes from:
     · one <script data-dc-script data-props="…"> whose value, unescaped
       (&quot; &lt; &amp; — the three build-sheet.js escapes, the ampersand
       last so an escaped escape is not read twice), is JSON: support.js's
       parseDataProps and kits.js both JSON.parse it, and a stray quote is a
       blank prop panel and no parts at all;
     · props.part is a select with a default that is one of its options and
       tsType string — the shape village.dc.html's `part` has;
     · options is FORTY ids, unique, in the order of PRESS-TABLE-PLAN.md
       Appendix D — read off the plan's own table, not off build-sheet.js's
       copy of it, so a drift between the two is caught here (the build's
       TAGS is held to the plan as well);
     · tags has forty entries, one per option and none else, each a
       non-empty list of lowercase words equal to the plan's row (its
       italics stripped — the motif marking is presentation), and the ten
       motif words build-sheet.js names are among them;
     · exactly forty <sc-if value="{{ isX }}"> in the template, one per
       option in the options' order, each flag the camel of its id
       (palette-keys.js flagOf: burst-round → isBurstRound), none twice,
       none that is not an option;
     · every block, lifted out of the sheet from its <sc-if> to its
       </sc-if>, re-lints clean as its part (palette-keys.js lint) — the
       proof that assembly changed nothing the part's own linter refuses;
     · every {{ name }} in the template is one of the nine values
       renderVals() fills or one of the forty flags — an interpolation the
       sheet does not fill is a "never resolved" warning in support.js and
       an empty attribute on the bench — and each of the nine is used;
     · renderVals() names every flag as `isX: part === 'id'` and carries
       the nine Knoll defaults at build-sheet.js's DEFAULTS;
     · the screen's first element is the one <svg data-defs>, and it holds
       the nine ids the style pass names (plan §8 4.4: sk-soft, sk-wobble,
       sk-hatch, sk-dots, sk-dither, sk-paper, sk-noise, sk-scanlines,
       sk-grunge);
     · the four <head> lines the village has, in its order (prelude.js,
       support.js, bare.css, ../fonts/fonts.css), and LF line endings — a
       built file is a new file (plan §0.3).
   ───────────────────────────────────────────────────────────────────────── */
'use strict';
const fs = require('fs'), path = require('path');
const PK = require('./palette-keys.js');
const BS = require('./build-sheet.js');

const TEST_DIR = path.resolve(__dirname, '..', '..');
const SHEET = path.join(TEST_DIR, 'features', 'stickers-core.dc.html');
const PLAN = path.join(TEST_DIR, '..', 'PRESS-TABLE-PLAN.md');
const OUT = path.join(TEST_DIR, 'perf', 'results', 'parts', 'check-sheet.json');

/* The defs the style pass reaches for (plan §8 4.4's table, one per row
   that names a url(#…)). */
const DEF_IDS = ['sk-soft', 'sk-wobble', 'sk-hatch', 'sk-dots', 'sk-dither', 'sk-paper', 'sk-noise', 'sk-scanlines', 'sk-grunge'];
/* village.dc.html's <head>, the four lines that matter, in its order. */
const HEAD = ['<script src="./prelude.js"></script>', '<script src="./support.js"></script>', '<link rel="stylesheet" href="./bare.css">', '<link rel="stylesheet" href="../fonts/fonts.css">'];

const unescAttr = s => s.replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&amp;/g, '&');
const rel = f => path.relative(process.cwd(), f).replace(/\\/g, '/');
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
function firstDiff(a, b) {
  for (let i = 0; i < Math.max(a.length, b.length); i++) if (!same(a[i], b[i])) return `first difference at ${i + 1}: ${JSON.stringify(a[i])} here, ${JSON.stringify(b[i])} wanted`;
  return `${a.length}, the same`;
}

const results = [];
const check = (name, ok, info) => {
  results.push({ name, ok: !!ok, info: info === undefined ? '' : String(info) });
  console.log((ok ? 'PASS ' : 'FAIL ') + name + (info !== undefined && info !== '' ? ' — ' + info : ''));
  return !!ok;
};

/* Appendix D as the plan writes it: the table rows between its heading and
   Appendix E's, `| \`id\` | what | extra layers | tags |`, the tags split on
   commas with the italics' asterisks dropped. */
function appendixD() {
  const md = fs.readFileSync(PLAN, 'utf8').replace(/\r\n/g, '\n');
  const from = md.indexOf('\n## Appendix D'), to = md.indexOf('\n## Appendix E', from + 1);
  const rows = [];
  for (const line of md.slice(from, to).split('\n')) {
    const m = /^\|\s*`([\w-]+)`\s*\|\s*(.*?)\s*\|\s*(.*?)\s*\|\s*(.*?)\s*\|\s*$/.exec(line);
    if (m) rows.push({ id: m[1], what: m[2], extra: m[3], tags: m[4].split(',').map(t => t.trim().replace(/\*/g, '')).filter(Boolean) });
  }
  return rows;
}

function main() {
  if (!fs.existsSync(SHEET)) { console.log('no ' + rel(SHEET) + ' — run build-sheet.js first'); process.exit(1); }
  const src = fs.readFileSync(SHEET, 'utf8');
  check('the sheet is LF', !/\r/.test(src), `${(src.length / 1024).toFixed(1)} KB, ${src.split('\n').length} lines`);

  // the plan's table, and the build's copy of it
  const plan = appendixD(), planIds = plan.map(r => r.id);
  check('Appendix D read off the plan: forty rows', plan.length === 40, plan.length);
  check("build-sheet.js's TAGS is Appendix D, id for id and tag for tag", same(BS.TAGS.map(t => [t[0], t[2]]), plan.map(r => [r.id, r.tags])), firstDiff(BS.TAGS.map(t => [t[0], t[2]]), plan.map(r => [r.id, r.tags])));

  // the head
  const head = src.slice(0, Math.max(0, src.indexOf('<body>')));
  const at = HEAD.map(h => head.indexOf(h));
  check("the four head lines, in the village's order", at.every((i, k) => i >= 0 && (k === 0 || i > at[k - 1])), HEAD.map((h, k) => at[k] < 0 ? 'missing ' + h : null).filter(Boolean).join('; ') || 'prelude.js support.js bare.css ../fonts/fonts.css');

  // data-props
  const scripts = [...src.matchAll(/<script\b[^>]*\bdata-dc-script\b[^>]*>/g)];
  check('one <script data-dc-script>', scripts.length === 1, scripts.length);
  let props = null, raw = '';
  if (scripts.length) {
    const m = /\bdata-props="([^"]*)"/.exec(scripts[0][0]);
    raw = m ? unescAttr(m[1]) : '';
    try { props = JSON.parse(raw); check('data-props parses as JSON', true, raw.length + ' chars unescaped'); }
    catch (e) { check('data-props parses as JSON', false, e.message); }
  }
  const part = props && props.part;
  check('props.part is a select with a default among its options', part && part.editor === 'select' && part.tsType === 'string' && Array.isArray(part.options) && part.options.includes(part.default), part ? `editor ${part.editor}, default ${part.default}, tsType ${part.tsType}` : 'no props.part');
  const options = part && Array.isArray(part.options) ? part.options : [];
  check('options: forty ids', options.length === 40, options.length);
  check('options: unique', new Set(options).size === options.length, new Set(options).size + ' distinct');
  check("options: Appendix D's ids in Appendix D's order", same(options, planIds), firstDiff(options, planIds));

  const tags = part && part.tags && typeof part.tags === 'object' ? part.tags : {};
  const tagIds = Object.keys(tags);
  check('tags: forty entries', tagIds.length === 40, tagIds.length);
  check("tags: one per option, none else, in the options' order", same(tagIds, options), firstDiff(tagIds, options));
  const badTag = options.filter(id => !Array.isArray(tags[id]) || !tags[id].length || tags[id].some(t => typeof t !== 'string' || !/^[a-z][a-z0-9-]*$/.test(t)));
  check('tags: each a non-empty list of lowercase words', !badTag.length, badTag.join(' ') || `${options.reduce((n, id) => n + (tags[id] || []).length, 0)} tags over ${options.length} parts`);
  const tagDiff = plan.filter(r => !same(tags[r.id] || null, r.tags)).map(r => r.id);
  check("tags: Appendix D's, part for part", !tagDiff.length, tagDiff.join(' ') || 'all forty rows agree');
  const allTags = new Set(options.flatMap(id => tags[id] || []));
  const noMotif = [...BS.MOTIFS].filter(m => !allTags.has(m));
  check('tags: the ten motif words are among them', !noMotif.length, noMotif.join(' ') || [...BS.MOTIFS].join(' '));

  // the template and its forty blocks
  const tFrom = src.indexOf('<x-dc>'), tTo = src.lastIndexOf('</x-dc>');
  check('one <x-dc> … </x-dc> template', tFrom >= 0 && tTo > tFrom);
  const rawTpl = src.slice(tFrom, tTo), tpl = PK.blankComments(rawTpl);   // same length, same offsets
  const wantFlags = options.map(PK.flagOf);
  const opens = [...tpl.matchAll(/<sc-if\s+value="\{\{\s*(\w+)\s*\}\}"[^>]*>/g)];
  const flags = opens.map(m => m[1]);
  check('forty <sc-if> blocks', flags.length === 40, flags.length);
  check("every <sc-if> flag is the camel of an option, in the options' order", same(flags, wantFlags), firstDiff(flags, wantFlags));
  const strayFlag = flags.filter(f => !wantFlags.includes(f));
  check('no <sc-if> flag that is not an option', !strayFlag.length, strayFlag.join(' ') || 'none');
  const dup = flags.filter((f, i) => flags.indexOf(f) !== i);
  check('no option flagged twice', !dup.length, dup.join(' ') || 'none');

  let faults = 0, warnings = 0, blocks = 0; const faultLines = [];
  for (const m of opens) {
    const id = options[wantFlags.indexOf(m[1])];
    const end = tpl.indexOf('</sc-if>', m.index);
    if (!id || end < 0) continue;
    blocks++;
    const res = PK.lint(id, rawTpl.slice(m.index, end + '</sc-if>'.length));
    faults += res.faults.length; warnings += res.warnings.length;
    res.faults.forEach(f => faultLines.push(`${id}: ${f.msg}`));
  }
  check('every block re-lints clean as its part', blocks === 40 && !faults, `${blocks} blocks, ${faults} faults, ${warnings} warnings` + (faultLines.length ? ' — ' + faultLines.slice(0, 5).join(' | ') : ''));

  // the interpolations
  const names = new Set([...tpl.matchAll(/\{\{\s*([\w.]+)\s*\}\}/g)].map(m => m[1]));
  const known = new Set([...PK.ROLES, ...PK.VALUES, ...wantFlags]);
  const stray = [...names].filter(n => !known.has(n));
  check('every {{ name }} is one of the nine values or a flag', !stray.length, stray.join(' ') || `${names.size} distinct names`);
  const unused = PK.ROLES.concat(PK.VALUES).filter(n => !names.has(n));
  check('all nine values are used somewhere on the sheet', !unused.length, unused.join(' ') || 'skPrimary … skText');

  // renderVals()
  const jsFrom = scripts.length ? src.indexOf(scripts[0][0]) : 0, jsTo = src.indexOf('</script>', jsFrom);
  const js = src.slice(jsFrom, jsTo < 0 ? src.length : jsTo);
  const noFlag = options.filter(id => !new RegExp(`\\b${PK.flagOf(id)}:\\s*part === '${id}'`).test(js));
  check("renderVals() flags every option as isX: part === 'id'", !noFlag.length, noFlag.join(' ') || 'forty flags');
  const noDefault = Object.entries(BS.DEFAULTS).filter(([k, v]) => !new RegExp(`\\b${k}:\\s*${typeof v === 'string' ? `'${v}'` : v},`).test(js)).map(([k]) => k);
  check('renderVals() carries the nine Knoll defaults', !noDefault.length, noDefault.join(' ') || Object.entries(BS.DEFAULTS).map(([k, v]) => `${k} ${v === '' ? "''" : v}`).join(', '));

  // the shared defs, first under the screen
  const screenAt = tpl.search(/<div\b[^>]*\bdata-stickers\b/);
  const after = screenAt >= 0 ? tpl.slice(tpl.indexOf('>', screenAt) + 1) : '';
  const firstEl = /<([a-z][\w-]*)\b[^>]*>/i.exec(after);
  check("the screen's first element is <svg data-defs>", firstEl && firstEl[1].toLowerCase() === 'svg' && /\bdata-defs\b/.test(firstEl[0]), firstEl ? firstEl[0].slice(0, 70) : 'no element under the screen');
  const defs = after.slice(0, Math.max(0, after.indexOf('</svg>')));
  const noDef = DEF_IDS.filter(id => !new RegExp(`\\bid="${id}"`).test(defs));
  check('the defs hold the nine ids the style pass names', !noDef.length, noDef.join(' ') || DEF_IDS.join(' '));
  check('one data-defs svg on the sheet', (tpl.match(/<svg\b[^>]*\bdata-defs\b/g) || []).length === 1, (tpl.match(/<svg\b[^>]*\bdata-defs\b/g) || []).length);

  const failed = results.filter(r => !r.ok).length;
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify({ when: new Date().toISOString(), sheet: rel(SHEET), bytes: src.length, options, results }, null, 2) + '\n');
  console.log(`${results.length - failed}/${results.length} PASS — ${rel(OUT)}`);
  process.exit(failed ? 1 : 0);
}

if (require.main === module) main();
