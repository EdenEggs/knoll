/* toem2/mint.js — EVERY PIECE IN THE SEED GETS ITS NAME, ONCE (2026-09-17).

   wall.js names a piece the moment it is made (EVERY PIECE HAS A NAME: `n`,
   Lab.uid's scheme) and names anything unnamed at boot — but the seed is a
   file, and a file names nothing until somebody writes into it. This does
   that: every item in wall-seed.json without an `n` gets one, and every
   piece of the eight plates (a sticker id starting tm-p01- … tm-p08-) is
   flagged CANON, c:1 — the plates are the page, and api/wall.js treats a
   canon piece deleted, or pushed off the plates, as a drastic edit whoever
   asks. Written back through serve.js's seedText, one piece to a line, so
   the diff reads: one field added per line, nothing moved.

   Run once, from site/:  node toem2/mint.js       (again is harmless: a
   named piece keeps its name, a flagged one its flag) */
'use strict';
const fs = require('fs'), path = require('path');
const { seedText } = require('../serve.js');

const FILE = path.join(__dirname, 'wall-seed.json');
const CANON = /^tm-p0[1-8]-/;
let n = 0;
const uid = () => Date.now().toString(36) + (n++).toString(36) + Math.floor(Math.random() * 1e6).toString(36);

const seed = JSON.parse(fs.readFileSync(FILE, 'utf8'));
let named = 0, flagged = 0;
seed.wall.items = seed.wall.items.filter(Boolean).map(it => {
  const out = it.n ? it : Object.assign({ n: uid() }, it);
  if (!it.n) named++;
  if (out.k === 'd' && CANON.test(out.f) && !out.c) { out.c = 1; flagged++; }
  return out;
});
const names = new Set(seed.wall.items.map(it => it.n));
if (names.size !== seed.wall.items.length) throw new Error('two pieces got the same name — run again');
fs.writeFileSync(FILE, seedText(seed));
console.log('wall-seed.json: ' + seed.wall.items.length + ' pieces · named ' + named + ' · flagged canon ' + flagged);
