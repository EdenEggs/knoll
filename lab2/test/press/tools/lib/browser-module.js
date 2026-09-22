/* ─── BROWSER-MODULE ──────────────────────────────────────────────────────
   Loads one of the bench's browser files into Node. Every module on the
   bench is an IIFE that hangs one global off `window` (plan §0.3), and the
   pure ones — press/palette.js, theme.js, style.js's arithmetic — are meant
   to be tested here with no browser: so this reads the file, runs its
   source as the body of new Function('window', src) against a plain object,
   and hands that object back. `window.Palette = (…)()` inside the file
   lands on the object; a module that reaches for `document`, `Lab` or a
   canvas throws a ReferenceError, which is the point — a file the tests
   load this way must not touch the page. new Function rather than vm: the
   file runs in this process's own realm, so a Uint8ClampedArray made here
   is the one the module sees, and there is nothing to configure.

       const load = require('./lib/browser-module');
       const { Palette } = load('lab2/test/press/palette.js');
       const w = load(file, { Palette });       // a second module beside the first

   Paths are resolved from the process's cwd (the scripts run from site/) or
   given absolute. ───────────────────────────────────────────────────────── */
'use strict';
const fs = require('fs');
const path = require('path');

module.exports = function load(file, window) {
  const src = fs.readFileSync(path.resolve(file), 'utf8');
  window = window || {};
  new Function('window', src)(window);
  return window;
};
