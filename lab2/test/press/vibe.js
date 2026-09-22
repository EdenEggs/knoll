/* ─── THE VIBE, BROWSER SIDE ───────────────────────────────────────────────
   press/vibe.js — window.Vibe: the three things the Press Table needs from
   the vision call that do not belong in the serverless function. The key it
   caches by, the POST itself, and the MERGE — the rule that decides, one
   game at a time, whether a measurement or a judgement gets the last word.

   The call is api/vibe.js's business: it holds the key, the model, the
   prompt and the schema. This file never sees an API key and never talks to
   api.anthropic.com. It talks to ONE door on this origin (plan §11 step 1),
   and everything it does works with the door absent — request() answers
   {vibe:null,error} instead of throwing, merge() takes null for a vibe and
   returns the heuristics' own answer with its own reasons. That is the
   phase's acceptance in two functions: "with the key present the Press Table
   shows 'judged by the model' next to the reasons; without it, nothing
   breaks."

   THE MERGE, AND WHY IT IS SHAPED THIS WAY (plan §11 step 5). A measurement
   and a judgement disagree in three different ways and the plan gives each a
   different answer:

     A MEASURED PIXEL GRID IS NOT AN OPINION. If style.js found a pixel size
     — the shrink-and-re-enlarge error at some s in 2…16 sat under the floor
     with a deep dip (CONTRACTS §4) — then the art IS on a grid, whatever the
     model thought it looked like. The heuristics' first preset stands and
     the model's is demoted to the second option. api/vibe.js applies the
     same rule server-side on the model's own answer (Appendix F's server
     rules), so on a normal round trip this branch has nothing left to fix;
     it fires when the client's stats and the server's disagree, and when the
     answer came from a cache written before the stats were re-measured.

     A CONFIDENT MODEL INSIDE THE HEURISTICS' TOP THREE IS BETTER THAN THE
     HEURISTICS' FIRST. Style.rank() answers a distance over eleven numbers;
     the top three are usually within a point of each other (pixelfort:
     pixel 2.3, cel 7.0, grunge 7.2 — but mosslight's painterly and
     cozy-soft are neighbours). Choosing among near-ties is exactly what a
     look at the picture is for, so a model at CONF_LINE or better picking
     one of the three wins.

     ANYTHING ELSE IS THE HEURISTICS'. Under the line, or naming a preset
     the ranking did not have in its top three, the model is offering a
     fourth opinion about a thing that was measured; it becomes the SECOND
     OPTION SHOWN and nothing more. The Press Table lists alternates, so a
     wrong-but-interesting answer is one click away and never the default.

   CONF_LINE = 0.6, the plan's number (§11 step 5, and Appendix E's recipe
   override uses the same line). It is a first guess and it is written once,
   here, so moving it moves every use. TOP_N = 3, "the heuristics' top three"
   — also Style.rank()'s own length, so the window is the whole list it
   returns; asking for more than rank() gives would silently widen the gate.

   THE CACHE KEY is sha256 of every image's sha256, then a canonical JSON of
   the stats, then the model id, joined by '|' (plan §11 step 3). Three
   things it must have: the same images in another order are a different
   question (so the hashes are concatenated in order, not sorted); the same
   images with different measurements are a different question (the stats);
   and a new model is a new answer for the same pictures (the id). The
   client computes it so it can SKIP the call on a hit — api/vibe.js
   computes the identical string from the same three parts and is the one
   that decides what is written, because a client is not trusted with where
   a cache file lands. The canonicaliser and the joiner are therefore
   written TWICE, once here and once there, the way CONTRACTS §0 has keep.js
   and press.js each write out the door derivation: the bench has no module
   system and a shared file would have to be loaded by both a browser and a
   Vercel function. press/tools/test-vibe.js holds the two copies to each
   other, byte for byte, over the fixtures.

   MODEL is repeated here for the same reason and must equal api/vibe.js's
   MODEL. The test reads the constant out of both files and fails if they
   drift; a drifted pair means every first call is a cache miss and every
   answer is stored under a key nobody looks up.

   sha256 comes from crypto.subtle, so cacheKey() is a Promise and the page
   must be a secure context — https, or localhost, which is where the Press
   Table runs (http://localhost:4322/lab2/test/press/). Off a file:// URL
   crypto.subtle is undefined; cacheKey() says so rather than throwing an
   unreadable TypeError, and the Press Table falls back to no cache.
   ───────────────────────────────────────────────────────────────────────── */
(function () {
  'use strict';

  /* Pinned 2026-09-07, and it must equal api/vibe.js's MODEL — see the
     header. There is no ANTHROPIC_API_KEY on the build machine, so no call
     has ever been made with it from here (NOTES §D.11). */
  const MODEL = 'claude-opus-5';

  const CONF_LINE = 0.6;   // the plan's line for "the model may overrule the ranking"
  const TOP_N = 3;         // "within the heuristics' top three" — Style.rank()'s own length

  /* ── the key ──────────────────────────────────────────────────────────── */

  // A stats object with its keys in a fixed order, so that two objects that
  // differ only in the order the Press Table happened to build them in are
  // one question and not two. Arrays keep their order (an array's order is
  // data); objects are sorted by key; everything else is JSON's own.
  function canonical(v) {
    if (v === null || typeof v !== 'object') return JSON.stringify(v === undefined ? null : v);
    if (Array.isArray(v)) return '[' + v.map(canonical).join(',') + ']';
    return '{' + Object.keys(v).sort().map(k => JSON.stringify(k) + ':' + canonical(v[k])).join(',') + '}';
  }

  function hex(buf) {
    const b = new Uint8Array(buf);
    let s = '';
    for (let i = 0; i < b.length; i++) s += (b[i] < 16 ? '0' : '') + b[i].toString(16);
    return s;
  }

  // base64 → the bytes it stands for. The server hashes the DECODED image,
  // which is also what a manifest's asset sha256 is taken over, so a hash
  // computed here can be compared with one computed there or with the one
  // already in the manifest.
  function bytesOf(b64) {
    const bin = atob(String(b64).replace(/^data:[^,]*,/, ''));
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }

  async function sha256(bytes) {
    const subtle = (typeof crypto !== 'undefined' && crypto.subtle) || null;
    if (!subtle) throw new Error('crypto.subtle is not here — the Press Table must be served (https or localhost), not opened off disk');
    return hex(await subtle.digest('SHA-256', bytes));
  }

  /**
   * cacheKey(images, stats, model) → Promise<string>  (64 hex characters)
   * images: the same base64 strings the payload carries, in the same order.
   * model:  optional; defaults to MODEL, which api/vibe.js must agree with.
   */
  async function cacheKey(images, stats, model) {
    const list = Array.isArray(images) ? images : [];
    const hashes = [];
    for (const img of list) hashes.push(await sha256(bytesOf(img)));
    return sha256(new TextEncoder().encode(hashes.join('') + '|' + canonical(stats || {}) + '|' + (model || MODEL)));
  }

  /* ── the call ─────────────────────────────────────────────────────────── */

  /**
   * request(endpoint, payload) → Promise<{vibe, cached, model} | {vibe:null, error}>
   *
   * Never rejects. Every way this can fail — no door (404 on a static
   * deploy), a 500, a body that is not JSON, the fetch itself refused — is
   * the same fact to the Press Table: there is no judgement, use the
   * heuristics. So it is one shape, always, and the caller has one branch.
   */
  async function request(endpoint, payload) {
    let res;
    try {
      res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload || {})
      });
    } catch (e) {
      return { vibe: null, error: 'the vibe door did not answer: ' + ((e && e.message) || e) };
    }
    let body = null;
    try { body = await res.json(); } catch (e) { body = null; }
    if (!body || typeof body !== 'object') return { vibe: null, error: 'the vibe door answered ' + res.status + ' with something that is not JSON' };
    if (!res.ok && !body.error) return { vibe: null, error: 'the vibe door answered ' + res.status };
    if (body.vibe === undefined) body.vibe = null;
    return body;
  }

  /* ── the merge ────────────────────────────────────────────────────────── */

  // Style.rank() answers [{preset, score}, …]; a caller holding plain ids is
  // just as valid. Take either, keep the order, drop anything falsy.
  function presetList(h) {
    const raw = (h && (h.presets || h.rank || h.ranked)) || [];
    const out = [];
    for (const p of raw) {
      const id = typeof p === 'string' ? p : (p && p.preset);
      if (id && out.indexOf(id) < 0) out.push(id);
    }
    return out;
  }

  /**
   * merge(heuristics, vibe) → { preset, alternates, fontPairing, harmony,
   *                             motifs, recipe, reasons }
   *
   * heuristics: { presets: Style.rank()'s array or plain ids,
   *               pixelSize:  stats.pixelSize (0 when there is no grid),
   *               fontPairing: Fonts.suggest()[0],
   *               harmony:    theme's mood, 'calm' | 'loud',
   *               recipe:     Appendix E's chooser, 'poster' | … }
   * vibe:       api/vibe.js's judgement, or null.
   *
   * SEVEN keys and not the six the phase brief lists: `recipe` is the
   * seventh. Appendix E ends with "the vision call may override with its
   * recipe when confidence ≥ 0.6" and this is the only function that sees
   * both a recipe and a confidence; leaving it out would put that rule in
   * whichever file happened to call merge(). The other six are exactly the
   * brief's.
   *
   * `motifs` is passed straight through for Recipes.rankStickers, which
   * takes `{motifs, mood, count}` — the MOOD it also wants is on the raw
   * judgement (`vibe.mood`) and is not repeated here, because merge()'s job
   * is the decisions where a measurement and a judgement disagree and mood
   * is not one of them: the heuristics have no opinion about it at all.
   *
   * `reasons` is one line per decision, in the house voice, for the Press
   * Table's panel — it says WHICH of the three branches fired and what the
   * number was, so an owner looking at a preset they did not expect can see
   * the arithmetic instead of guessing at it.
   */
  function merge(heuristics, vibe) {
    const h = heuristics || {};
    const ranked = presetList(h);
    const first = ranked[0] || 'flat';                 // style.schema.json's own fallback (CONTRACTS §5)
    const top = ranked.slice(0, TOP_N);
    const v = (vibe && typeof vibe === 'object') ? vibe : null;
    const conf = v && typeof v.confidence === 'number' ? v.confidence : 0;
    const pixel = Number(h.pixelSize) > 0;
    const reasons = [];

    let preset, alternates;
    if (!v || !v.preset) {
      preset = first;
      alternates = ranked.slice(1, 1 + 2);
      reasons.push(v
        ? 'preset ' + preset + ': the model answered without one, so the ranking stands.'
        : 'preset ' + preset + ': the ranking chose it — there is no model judgement to weigh against it.');
    } else if (pixel) {
      preset = first;
      alternates = [v.preset].concat(ranked.slice(1)).filter((p, i, a) => p !== preset && a.indexOf(p) === i).slice(0, 2);
      reasons.push('preset ' + preset + ': a pixel grid of ' + h.pixelSize + ' was measured, and a measured grid outranks a judgement — the model said ' + v.preset + ', which is offered second.');
    } else if (conf >= CONF_LINE && top.indexOf(v.preset) >= 0) {
      preset = v.preset;
      alternates = ranked.filter(p => p !== preset).slice(0, 2);
      reasons.push('preset ' + preset + ': the model chose it at confidence ' + conf + ' (the line is ' + CONF_LINE + ') and the ranking already had it in its top ' + TOP_N + ' — a look at the picture breaks a near-tie better than a distance does.');
    } else {
      preset = first;
      alternates = [v.preset].concat(ranked.slice(1)).filter((p, i, a) => p !== preset && a.indexOf(p) === i).slice(0, 2);
      reasons.push('preset ' + preset + ': the ranking chose it — the model said ' + v.preset +
        (conf < CONF_LINE ? ' at confidence ' + conf + ', under the ' + CONF_LINE + ' line' : ', which the ranking did not have in its top ' + TOP_N) +
        ', so that is the second option and not the answer.');
    }

    const fontPairing = (v && v.fontPairing) || h.fontPairing || undefined;
    reasons.push('type ' + (fontPairing || '(none)') + ': ' + ((v && v.fontPairing)
      ? "the model's pairing — a font is a taste and the menu is closed, so its pick is taken as it stands."
      : 'fonts.js suggested it; the model named no pairing.'));

    const harmony = (v && v.harmony) || h.harmony || undefined;
    reasons.push('harmony ' + (harmony || '(none)') + ': ' + ((v && v.harmony)
      ? "the model's — whether the accents want to sit opposite or beside each other is what the picture is for."
      : "the theme's own mood; the model named no harmony."));

    const motifs = (v && Array.isArray(v.motifs)) ? v.motifs.slice() : [];
    reasons.push(motifs.length
      ? 'motifs ' + motifs.join(', ') + ': they rank the sticker tray by tag overlap, nothing else.'
      : 'motifs: none — the tray keeps the sheet\'s own order.');

    let recipe = h.recipe;
    if (v && v.recipe && conf >= CONF_LINE) {
      recipe = v.recipe;
      reasons.push('recipe ' + recipe + ': the model overrode the chooser at confidence ' + conf + ' (Appendix E allows it at ' + CONF_LINE + ' and over).');
    } else if (recipe) {
      reasons.push('recipe ' + recipe + ': the chooser picked it from the art that arrived' +
        (v && v.recipe ? ' — the model said ' + v.recipe + ' at confidence ' + conf + ', under the line.' : '.'));
    }

    const out = { preset, alternates, fontPairing, harmony, motifs, reasons };
    if (recipe !== undefined) out.recipe = recipe;
    return out;
  }

  window.Vibe = Object.freeze({ MODEL, CONF_LINE, TOP_N, canonical, cacheKey, request, merge });
})();
