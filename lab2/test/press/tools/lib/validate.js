/* ─── VALIDATE ─────────────────────────────────────────────────────────────
   The one reader of press/schemas/*.json. Everything that writes or accepts a
   piece of a game page runs its object past this first: build-game.js before
   it writes games/<slug>/, api/vibe.js before it believes the model,
   api/intake.js before it believes a stranger, and the Press Table in the
   browser before it offers to build anything. The plan is explicit about the
   size of it — "a 60-line validator is enough: types, enums, required,
   min/max, pattern; do not vendor a full library" (Appendix A) — and this is
   that, written one keyword to a line with the message it prints: the walk
   that does the checking is 105 lines, its helpers 65, and `check`, the
   linter and the two loaders 70 more.

       Validate.check(data, schema, schemas) → [] | [{path, message}, …]
           schema  a schema object, or the name of one in `schemas`
           schemas {'manifest.schema.json': {…}, …} — the pool $ref resolves in
       Validate.lint(schema, schemas)  → [] | [{path, message}, …]   (see THE LINT)
       Validate.loadDir(dir)           → the pool, read off disk        (Node)
       Validate.loadFetch(baseUrl)     → Promise of the pool            (browser)
       Validate.FILES                  → the seven file names, in dependency order

   An empty list is the only thing that means valid. A path reads like the
   JavaScript that would reach the value — `assets[2].sha256`,
   `tokens["--sk-halo"]`, and '' for the document itself (a key that is not a
   plain identifier is bracketed and quoted). A message names its keyword
   first: `maxLength: 81 > 80`, `enum: "ps6" is not one of pc, mac, …`. Both
   are for a person reading a list, not for a machine to parse.

   WHAT IT DOES. type (including `integer` and an array of types), required,
   properties, additionalProperties (`false` or a schema), propertyNames,
   items, minItems/maxItems, minLength/maxLength, minimum/maximum,
   exclusiveMinimum, pattern, enum, const, oneOf, and $ref of the one shape
   the schemas use: `style.schema.json#/properties/preset` — a file name
   beside this one, then a JSON pointer walked key by key (a bare `#/…` means
   the document the ref was written in). That is every keyword in the seven
   files, and two the files do not use yet.

   When a `oneOf` matches nothing, the list carries one line for the oneOf and
   then the complaints of the alternative that got FURTHEST into the document,
   so a bad vibe inside a game.json reads `analysis.vibe.fontPairing` and not
   only `analysis.vibe`.

   WHAT IT DOES NOT DO, and why that is enough here. No allOf / anyOf / not —
   one `oneOf` (analysis.vibe: null, or a vibe) is the only composition
   Appendix A asks for. No if/then/else, no dependentSchemas, no unevaluated*:
   nothing in this system has a conditional rule. No `format` — it is an
   annotation in 2020-12, asserted by nobody by default, and every string that
   needed a shape was given a `pattern` instead (game.builtAt,
   manifest.assets[].file, the hexes). No $defs, and no ref into another
   document's $defs: the schemas name a whole file or a pointer into one,
   which is all `deref` walks. No patternProperties, prefixItems, uniqueItems,
   multipleOf, contains, exclusiveMaximum, $dynamicRef, or http refs. No
   annotation output, no error codes, no coercion: the data arrives from
   JSON.parse or from the Press Table's own objects, and nothing here changes
   what it is handed.

   THE LINT is what makes that list safe. The danger of a hand-rolled
   validator is not the keyword it rejects, it is the one it IGNORES — a rule
   written into a schema in good faith that silently never runs, and a file
   that looks checked and is not. So `lint` walks a schema document and names
   every keyword outside the list above, and every $ref that does not resolve;
   test-schemas.js holds all seven files to it. Add `allOf` to a schema and
   the test fails the same minute, which is the moment to either implement it
   here or write the rule another way.

   THE NUMBERS, both of them. MAXDEPTH 32: the deepest data path in the seven
   schemas is game → analysis → vibe → motifs → an item, five levels, and the
   deepest schema nesting is manifest's assets → items → properties, four; 32
   is far past anything real and stops a $ref that points at itself from
   taking the stack down with it. SHOW 40: a message that quotes the offending
   value quotes 40 characters of it, because `description` may be 1 200 long
   and an error list is read in a terminal.

   THREE PROMISES the tests hold it to. It never throws — both entry points
   wrap the walk, so garbage (null, a circular object, a getter that throws, a
   schema that is not a schema) comes back as an entry in the list, which is
   also what a door wants: a bad POST is a 400, not a stack trace. It is
   deterministic — the same data and schema give a byte-identical list, rules
   in schema order and data in the object's own key order. And it is pure — no
   fetch, no fs, no Date, no Math.random anywhere in `check`; the two loaders
   are the only doors to the outside and neither is called from it.

   Two smaller decisions worth writing down. A string's length is counted in
   UTF-16 units (JavaScript's own `.length`), not code points, so an emoji
   counts two against `maxLength`; these caps are guard rails on a text box,
   not a measurement, and the alternative is a code-point walk over every
   string in the file. And a non-finite number is not a number here: NaN and
   Infinity fail `type: number`, because everything this validates is about to
   be JSON.stringify'd, where they turn into `null` — a value that survives
   the check but not the file is worse than a rejection.

   Loaded in Node with require, and on a page with a plain <script> (the Press
   Table validates in the browser too, before it posts anything to /build), so
   it hangs one global the way plan §0.3 asks of every file on this bench.
   ───────────────────────────────────────────────────────────────────────── */
'use strict';
(function () {
  var V = {};

  /* Dependency order: vibe before analysis, all five before game — so a pool
     built by reading this list in order is never half-formed. */
  V.FILES = ['style.schema.json', 'theme.schema.json', 'vibe.schema.json', 'manifest.schema.json',
             'analysis.schema.json', 'layout.schema.json', 'game.schema.json'];

  var MAXDEPTH = 32, SHOW = 40;
  var CHECKED = ['$ref', 'type', 'enum', 'const', 'required', 'properties', 'additionalProperties',
                 'propertyNames', 'items', 'minItems', 'maxItems', 'minLength', 'maxLength',
                 'minimum', 'maximum', 'exclusiveMinimum', 'pattern', 'oneOf'];
  var IGNORED = ['$schema', '$id', '$comment', 'title', 'description', 'default', 'examples',
                 'deprecated', 'readOnly', 'writeOnly'];

  function has(o, k) { return o !== null && typeof o === 'object' && Object.prototype.hasOwnProperty.call(o, k); }

  function isType(v, t) {
    if (t === 'null') return v === null;
    if (t === 'array') return Array.isArray(v);
    if (t === 'object') return v !== null && typeof v === 'object' && !Array.isArray(v);
    if (t === 'string') return typeof v === 'string';
    if (t === 'boolean') return typeof v === 'boolean';
    if (t === 'number') return typeof v === 'number' && isFinite(v);
    if (t === 'integer') return typeof v === 'number' && isFinite(v) && Math.floor(v) === v;
    return false;
  }

  function typeName(v) {
    if (v === null) return 'null';
    if (Array.isArray(v)) return 'array';
    if (typeof v === 'number' && !isFinite(v)) return String(v);
    return typeof v;
  }

  function show(v) {
    var s = null;
    try { s = JSON.stringify(v); } catch (e) { s = null; }
    if (s === undefined || s === null) { try { s = String(v); } catch (e2) { s = '(unprintable)'; } }
    return s.length > SHOW ? s.slice(0, SHOW - 3) + '...' : s;
  }

  function same(a, b) {
    if (a === b) return true;
    if (a === null || b === null || typeof a !== 'object' || typeof b !== 'object') return false;
    try { return JSON.stringify(a) === JSON.stringify(b); } catch (e) { return false; }
  }

  var RE = {};
  function re(p) {
    if (!Object.prototype.hasOwnProperty.call(RE, p)) { try { RE[p] = new RegExp(p); } catch (e) { RE[p] = null; } }
    return RE[p];
  }

  var PLAIN = /^[A-Za-z_$][A-Za-z0-9_$]*$/;
  function step(path, key) {
    if (typeof key === 'number') return path + '[' + key + ']';
    if (!PLAIN.test(key)) return path + '[' + JSON.stringify(key) + ']';
    return path ? path + '.' + key : key;
  }

  /* 'file.schema.json#/a/b' → that file's node; '#/a/b' → this document's. */
  function deref(ref, ctx) {
    if (typeof ref !== 'string') return null;
    var cut = ref.indexOf('#'), file = cut < 0 ? ref : ref.slice(0, cut), ptr = cut < 0 ? '' : ref.slice(cut + 1);
    var doc = ctx.doc;
    if (file) { if (!has(ctx.schemas, file)) return null; doc = ctx.schemas[file]; }
    var node = doc;
    if (ptr) {
      if (ptr.charAt(0) === '/') ptr = ptr.slice(1);
      var parts = ptr.split('/');
      for (var i = 0; i < parts.length; i++) {
        var k = decodeURIComponent(parts[i]).split('~1').join('/').split('~0').join('~');
        if (!has(node, k)) return null;
        node = node[k];
      }
    }
    return { schema: node, ctx: { doc: doc, schemas: ctx.schemas } };
  }

  function walk(data, schema, ctx, path, out, depth) {
    if (schema === undefined || schema === true) return;
    if (schema === false) { out.push({ path: path, message: 'schema: false - nothing is allowed here' }); return; }
    if (schema === null || typeof schema !== 'object' || Array.isArray(schema)) {
      out.push({ path: path, message: 'schema: not a schema (' + typeName(schema) + ')' });
      return;
    }
    if (depth > MAXDEPTH) {
      out.push({ path: path, message: 'depth: past ' + MAXDEPTH + ' levels - a $ref that points at itself?' });
      return;
    }

    if (has(schema, '$ref')) {
      var r = deref(schema.$ref, ctx);
      if (!r) { out.push({ path: path, message: '$ref: cannot resolve "' + schema.$ref + '"' }); return; }
      walk(data, r.schema, r.ctx, path, out, depth + 1);
    }

    if (has(schema, 'type')) {
      var want = Array.isArray(schema.type) ? schema.type : [schema.type], ok = false;
      for (var t = 0; t < want.length; t++) if (isType(data, want[t])) ok = true;
      if (!ok) {
        out.push({ path: path, message: 'type: expected ' + want.join(' or ') + ', got ' + typeName(data) });
        return;
      }
    }
    if (has(schema, 'enum')) {
      var hit = false, list = schema.enum;
      for (var e = 0; e < list.length; e++) if (same(list[e], data)) hit = true;
      if (!hit) out.push({ path: path, message: 'enum: ' + show(data) + ' is not one of ' + list.map(show).join(', ') });
    }
    if (has(schema, 'const') && !same(schema.const, data))
      out.push({ path: path, message: 'const: expected ' + show(schema.const) + ', got ' + show(data) });

    if (typeof data === 'string') {
      if (has(schema, 'minLength') && data.length < schema.minLength)
        out.push({ path: path, message: 'minLength: ' + data.length + ' < ' + schema.minLength });
      if (has(schema, 'maxLength') && data.length > schema.maxLength)
        out.push({ path: path, message: 'maxLength: ' + data.length + ' > ' + schema.maxLength });
      if (has(schema, 'pattern')) {
        var rx = re(schema.pattern);
        if (!rx) out.push({ path: path, message: 'pattern: "' + schema.pattern + '" is not a regular expression' });
        else if (!rx.test(data)) out.push({ path: path, message: 'pattern: ' + show(data) + ' does not match ' + schema.pattern });
      }
    }
    if (typeof data === 'number' && isFinite(data)) {
      if (has(schema, 'minimum') && data < schema.minimum)
        out.push({ path: path, message: 'minimum: ' + data + ' < ' + schema.minimum });
      if (has(schema, 'maximum') && data > schema.maximum)
        out.push({ path: path, message: 'maximum: ' + data + ' > ' + schema.maximum });
      if (has(schema, 'exclusiveMinimum') && data <= schema.exclusiveMinimum)
        out.push({ path: path, message: 'exclusiveMinimum: ' + data + ' is not above ' + schema.exclusiveMinimum });
    }
    if (Array.isArray(data)) {
      if (has(schema, 'minItems') && data.length < schema.minItems)
        out.push({ path: path, message: 'minItems: ' + data.length + ' < ' + schema.minItems });
      if (has(schema, 'maxItems') && data.length > schema.maxItems)
        out.push({ path: path, message: 'maxItems: ' + data.length + ' > ' + schema.maxItems });
      if (has(schema, 'items'))
        for (var i = 0; i < data.length; i++) walk(data[i], schema.items, ctx, step(path, i), out, depth + 1);
    } else if (data !== null && typeof data === 'object') {
      var props = has(schema, 'properties') ? schema.properties : {};
      if (has(schema, 'required')) for (var q = 0; q < schema.required.length; q++)
        if (!has(data, schema.required[q])) out.push({ path: step(path, schema.required[q]), message: 'required: missing' });
      Object.keys(props).forEach(function (k) {
        if (has(data, k)) walk(data[k], props[k], ctx, step(path, k), out, depth + 1);
      });
      if (has(schema, 'propertyNames') || has(schema, 'additionalProperties')) Object.keys(data).forEach(function (k) {
        if (has(schema, 'propertyNames')) {
          var sub = [];
          walk(k, schema.propertyNames, ctx, '', sub, depth + 1);
          for (var s = 0; s < sub.length; s++) out.push({ path: step(path, k), message: 'propertyNames: ' + sub[s].message });
        }
        if (has(schema, 'additionalProperties') && !has(props, k)) {
          if (schema.additionalProperties === false) out.push({ path: step(path, k), message: 'additionalProperties: not allowed here' });
          else walk(data[k], schema.additionalProperties, ctx, step(path, k), out, depth + 1);
        }
      });
    }

    if (has(schema, 'oneOf')) {
      var hits = 0, best = null, reach = -1;
      for (var o = 0; o < schema.oneOf.length; o++) {
        var errs = [];
        walk(data, schema.oneOf[o], ctx, path, errs, depth + 1);
        if (!errs.length) { hits++; continue; }
        /* How far into the document this alternative got before it complained:
           the longest path it named. Every alternative starts from the same
           path, so a longer one is a deeper one. */
        var far = 0;
        for (var f = 0; f < errs.length; f++) if (errs[f].path.length > far) far = errs[f].path.length;
        if (best === null || far > reach || (far === reach && errs.length < best.length)) { best = errs; reach = far; }
      }
      if (hits !== 1) {
        out.push({ path: path, message: 'oneOf: matched ' + (hits ? hits : 'none') + ' of ' + schema.oneOf.length + ' alternatives' });
        /* Nothing matched: say what the NEAREST alternative disliked, so a bad
           vibe reports `analysis.vibe.confidence` and not only `analysis.vibe`.
           Nearest is the one that got FURTHEST in — a branch complaining about
           `fontPairing` read the document, a branch complaining that it is not
           null only read its type. Ties go to the fewer complaints and then to
           the earlier branch, so the list is a rule and not a guess. */
        if (!hits && best) for (var b = 0; b < best.length; b++) out.push(best[b]);
      }
    }
  }

  V.check = function (data, schema, schemas) {
    schemas = schemas && typeof schemas === 'object' ? schemas : {};
    var out = [];
    if (typeof schema === 'string') {
      if (!has(schemas, schema)) return [{ path: '', message: '$ref: cannot resolve "' + schema + '"' }];
      schema = schemas[schema];
    }
    try { walk(data, schema, { doc: schema, schemas: schemas }, '', out, 0); }
    catch (err) { out.push({ path: '', message: 'validator: ' + ((err && err.message) || String(err)) }); }
    return out;
  };

  function lintNode(node, ctx, path, out, depth) {
    if (node === true || node === false || node === undefined) return;
    if (node === null || typeof node !== 'object' || Array.isArray(node)) {
      out.push({ path: path, message: 'schema: not a schema (' + typeName(node) + ')' });
      return;
    }
    if (depth > MAXDEPTH) { out.push({ path: path, message: 'depth: past ' + MAXDEPTH + ' levels' }); return; }
    Object.keys(node).forEach(function (k) {
      if (CHECKED.indexOf(k) < 0 && IGNORED.indexOf(k) < 0)
        out.push({ path: path + '/' + k, message: 'keyword: "' + k + '" is not one this validator implements - the rule would never run' });
    });
    if (has(node, '$ref') && !deref(node.$ref, ctx))
      out.push({ path: path + '/$ref', message: '$ref: cannot resolve "' + node.$ref + '"' });
    if (has(node, 'properties')) Object.keys(node.properties).forEach(function (k) {
      lintNode(node.properties[k], ctx, path + '/properties/' + k, out, depth + 1);
    });
    if (has(node, 'items')) lintNode(node.items, ctx, path + '/items', out, depth + 1);
    if (has(node, 'propertyNames')) lintNode(node.propertyNames, ctx, path + '/propertyNames', out, depth + 1);
    if (has(node, 'additionalProperties') && typeof node.additionalProperties === 'object')
      lintNode(node.additionalProperties, ctx, path + '/additionalProperties', out, depth + 1);
    if (has(node, 'oneOf') && Array.isArray(node.oneOf)) node.oneOf.forEach(function (s, i) {
      lintNode(s, ctx, path + '/oneOf/' + i, out, depth + 1);
    });
  }

  /* Paths here are the schema's own JSON pointers ('/properties/assets/items'),
     not data paths: what is being read is the schema, not a document. */
  V.lint = function (schema, schemas) {
    schemas = schemas && typeof schemas === 'object' ? schemas : {};
    var out = [];
    if (typeof schema === 'string') {
      if (!has(schemas, schema)) return [{ path: '', message: '$ref: cannot resolve "' + schema + '"' }];
      schema = schemas[schema];
    }
    try { lintNode(schema, { doc: schema, schemas: schemas }, '', out, 0); }
    catch (err) { out.push({ path: '', message: 'validator: ' + ((err && err.message) || String(err)) }); }
    return out;
  };

  /* Node. `require` is reached inside the call and never at load, so a browser
     that never calls this never trips over it. */
  V.loadDir = function (dir) {
    var fs = require('fs'), pth = require('path'), pool = {};
    V.FILES.forEach(function (f) { pool[f] = JSON.parse(fs.readFileSync(pth.join(dir, f), 'utf8')); });
    return pool;
  };

  /* Browser. One request per file, all seven at once; the pool is small
     enough (11 KB of JSON) that the Press Table asks for it once at boot. */
  V.loadFetch = function (base) {
    if (base.charAt(base.length - 1) !== '/') base += '/';
    return Promise.all(V.FILES.map(function (f) {
      return fetch(base + f).then(function (r) {
        if (!r.ok) throw new Error(f + ': HTTP ' + r.status);
        return r.json();
      });
    })).then(function (docs) {
      var pool = {};
      V.FILES.forEach(function (f, i) { pool[f] = docs[i]; });
      return pool;
    });
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = V; else window.Validate = V;
})();
