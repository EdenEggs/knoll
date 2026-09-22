/* ─── CHECK-FIXTURES ──────────────────────────────────────────────────────
   Refutes the three fixture folders make-fixtures.js writes (CONTRACTS §9):
   that manifest.json holds every rule of Appendix A's manifest.schema.json
   (the rules are written out here because press/schemas/ is Phase 5's and
   was empty when this was written), that every asset file exists, that its
   w/h are the PNG's own IHDR numbers, that its sha256 is the sha256 of the
   bytes on disk, that `alpha` is true only for a PNG whose colour type
   carries alpha AND which actually holds a pixel under 255 (a logo written
   as RGBA with a solid alpha channel would lie), and that expected.json is
   there. The folder size is printed against Appendix H's 300 KB (307 200
   B) but does not fail the check — the plan calls it a target. No
   dependency: the PNG is read by hand (IHDR at byte 16, IDAT inflated with
   zlib, the five row filters undone — the same five make-fixtures.js
   chooses between), which covers 8-bit colour types 0/2/4/6 non-interlaced,
   the only kinds the writer emits.

       node lab2/test/press/tools/check-fixtures.js        (from site/)

   Exit 1 on any failure, 0 when all three folders hold.
   ───────────────────────────────────────────────────────────────────────── */
'use strict';
const fs = require('fs'), path = require('path'), crypto = require('crypto'), zlib = require('zlib');
const ROOT = path.resolve(__dirname, '..', 'fixtures'), BUDGET = 300 * 1024;
const PLATFORMS = ['pc', 'mac', 'linux', 'switch', 'ps5', 'xbox', 'ios', 'android', 'web'];
const ROLES = ['logo', 'keyart', 'hero', 'screenshot', 'misc'], SOURCES = ['manual', 'steam', 'presskit', 'intake'];
const isStr = (v, max, min = 0) => typeof v === 'string' && v.length >= min && v.length <= max;

function png(buf) {                                   // → {w, h, type, transparent, error}
  if (buf.readUInt32BE(0) !== 0x89504e47 || buf.toString('latin1', 12, 16) !== 'IHDR') return { error: 'not a PNG' };
  const w = buf.readUInt32BE(16), h = buf.readUInt32BE(20), depth = buf[24], type = buf[25], interlace = buf[28];
  const bpp = { 0: 1, 2: 3, 4: 2, 6: 4 }[type];
  if (depth !== 8 || !bpp || interlace) return { w, h, type, error: `unsupported PNG (depth ${depth} type ${type} interlace ${interlace})` };
  const idat = [];
  for (let p = 8; p < buf.length;) { const len = buf.readUInt32BE(p), t = buf.toString('latin1', p + 4, p + 8); if (t === 'IDAT') idat.push(buf.subarray(p + 8, p + 8 + len)); p += 12 + len; }
  const raw = zlib.inflateSync(Buffer.concat(idat)), stride = w * bpp, prev = Buffer.alloc(stride);
  let transparent = false;
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)], cur = Buffer.from(raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1)));
    for (let i = 0; i < stride; i++) {
      const a = i >= bpp ? cur[i - bpp] : 0, b = prev[i], c = i >= bpp ? prev[i - bpp] : 0;
      let p = 0;
      if (f === 1) p = a; else if (f === 2) p = b; else if (f === 3) p = (a + b) >> 1;
      else if (f === 4) { const q = a + b - c, pa = Math.abs(q - a), pb = Math.abs(q - b), pc = Math.abs(q - c); p = pa <= pb && pa <= pc ? a : pb <= pc ? b : c; }
      cur[i] = (cur[i] + p) & 255;
    }
    if (bpp === 4 || bpp === 2) for (let i = bpp - 1; i < stride; i += bpp) if (cur[i] < 255) transparent = true;
    cur.copy(prev);
  }
  return { w, h, type, transparent };
}

function check(name) {
  const dir = path.join(ROOT, name), bad = [], say = (c, m) => { if (!c) bad.push(m); };
  let m; try { m = JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8')); } catch (e) { return [`manifest.json: ${e.message}`]; }
  say(isStr(m.slug, 40) && /^[a-z0-9-]{2,40}$/.test(m.slug) && m.slug === name, 'slug: pattern or not the folder name');
  say(isStr(m.title, 80, 1), 'title: string 1–80');
  for (const [k, max] of [['tagline', 140], ['description', 1200], ['developer', 80], ['publisher', 80], ['releaseDate', 40]]) say(m[k] === undefined || isStr(m[k], max), `${k}: string ≤ ${max}`);
  say(m.platforms === undefined || (Array.isArray(m.platforms) && m.platforms.every((p) => PLATFORMS.includes(p))), 'platforms: enum');
  say(m.genres === undefined || (Array.isArray(m.genres) && m.genres.length <= 6 && m.genres.every((g) => isStr(g, 30))), 'genres: ≤ 6 strings ≤ 30');
  say(m.links === undefined || (m.links && typeof m.links === 'object' && Object.values(m.links).every((u) => isStr(u, 300) && /^https:\/\//.test(u))), 'links: https strings ≤ 300');
  say(m.rights && m.rights.attested === true && typeof m.rights.by === 'string' && typeof m.rights.at === 'string', 'rights: {attested:true, by, at}');
  say(m.source === undefined || SOURCES.includes(m.source), 'source: enum');
  say(Array.isArray(m.assets) && m.assets.length >= 1 && m.assets.length <= 12, 'assets: array 1–12');
  for (const a of m.assets || []) {
    const tag = `asset ${a && a.id}`;
    say(isStr(a.id, 40, 1) && /^[a-z0-9-]{1,40}$/.test(a.id), `${tag}: id pattern`);
    say(ROLES.includes(a.role), `${tag}: role enum`);
    say(isStr(a.file, 300) && /^art\/[a-z0-9-]+\.(webp|png)$/.test(a.file), `${tag}: file pattern`);
    say(Number.isInteger(a.w) && a.w >= 16 && Number.isInteger(a.h) && a.h >= 16, `${tag}: w/h integers ≥ 16`);
    say(typeof a.alpha === 'boolean', `${tag}: alpha boolean`);
    say(isStr(a.sha256, 64, 64) && /^[a-f0-9]{64}$/.test(a.sha256), `${tag}: sha256 pattern`);
    let bytes; try { bytes = fs.readFileSync(path.join(dir, a.file)); } catch (e) { bad.push(`${tag}: file missing (${a.file})`); continue; }
    say(crypto.createHash('sha256').update(bytes).digest('hex') === a.sha256, `${tag}: sha256 is not the bytes on disk`);
    const p = png(bytes);
    say(!p.error, `${tag}: ${p.error}`);
    say(p.w === a.w && p.h === a.h, `${tag}: IHDR ${p.w}x${p.h} ≠ manifest ${a.w}x${a.h}`);
    say(a.alpha === ((p.type === 4 || p.type === 6) && p.transparent === true), `${tag}: alpha ${a.alpha} but PNG type ${p.type}, transparent pixels ${p.transparent}`);
  }
  let ex; try { ex = JSON.parse(fs.readFileSync(path.join(dir, 'expected.json'), 'utf8')); } catch (e) { bad.push(`expected.json: ${e.message}`); }
  say(!ex || (ex.fixture === name && ex.stats && typeof ex.stats === 'object'), 'expected.json: fixture name and stats');
  const size = ['manifest.json', 'expected.json'].concat(fs.readdirSync(path.join(dir, 'art')).map((f) => 'art/' + f)).reduce((s, f) => s + fs.statSync(path.join(dir, f)).size, 0);
  console.log(`  ${name.padEnd(10)} ${String(size).padStart(7)} B  ${size <= BUDGET ? 'within' : 'OVER'} the 300 KB target  ${bad.length ? 'FAIL' : 'ok'}`);
  return bad;
}

const names = process.argv.slice(2).length ? process.argv.slice(2) : fs.readdirSync(ROOT).filter((n) => fs.existsSync(path.join(ROOT, n, 'manifest.json')));
let failed = 0;
for (const n of names) for (const b of check(n)) { failed++; console.log(`    ✗ ${n}: ${b}`); }
console.log(failed ? `${failed} failure(s)` : `all ${names.length} fixture folders hold`);
process.exit(failed ? 1 : 0);
