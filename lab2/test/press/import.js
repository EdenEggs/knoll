/* ─── PRESS / IMPORT ───────────────────────────────────────────────────────
   press/import.js — window.PressImport. THE IMPORT FIELD (plan §12 3), the
   one line of the Press Table plan that was written and never built: "Owner
   mode's Press Table gets an Import field: paste a token → GET
   api/intake?token=… (secret-protected) → the bundle loads into the form as
   if dropped, with 'from <publisher name>, <date>' shown. Continue to Build
   as usual."

   Two halves of §12 already existed when this was written and neither of
   them knew about the other: `api/intake.js` catches a publisher's bundle
   and files it under a 22-character token, and `press/press.js` fills a form
   from dropped files and posts a build. This file is the six inches of pipe
   between them, and it is deliberately thin — it fetches, it checks, and
   then it hands the Press Table FILES, which is the one thing that page
   already knows how to swallow.

   ── AS IF THE FILES HAD BEEN DROPPED, LITERALLY ──────────────────────────
   The obvious implementation is to reach into press.js and set the form
   fields, the roles map and `S.assets` by hand. This does not do that, and
   the reason is that press.js ALREADY has a door for exactly this shape:
   `Press.addFiles(list)` takes a FileList or an array of `File`s, reads any
   `.json` among them through `applyManifest` (which fills every word, every
   platform chip, every link, the rights attestation AND the roles map — a
   manifest's declared roles are treated as the owner's own corrections),
   and then decodes the pictures, classifies, paints and analyses. It is the
   same call the drop zone and the file input make.

   So an import builds `File` objects and calls it:

     · `manifest.json`, the stored bundle, FIRST in the array (addFiles reads
       the JSONs before the pictures, so the roles are in place before
       `classify()` runs, but the order also says what this is);
     · one file per asset, named `<id>.<ext>` from the manifest's own
       `file` — because press.js's `renumber()` derives an asset id from the
       FILE NAME, so naming the file after the id is what makes the ids come
       out the same on this side as they were on the publisher's, and
       `applyManifest` keys its role map on that same basename.

   Nothing else about press.js is touched. If press.js later grows a hook of
   its own it passes `onBundle` to `mount()` and takes over; the default
   handler below is what runs until it does.

   ── WHERE IT MOUNTS (there is no hook in press.js yet) ───────────────────
   `press/index.html` carries, in an appended and commented block at the
   foot of the file, an empty `<div id="pt-import-mount" hidden>` and the
   `<script src="import.js">` that reads it. THE DOCUMENTED ELEMENT ID IS
   `pt-import-mount`. The block sits at the foot of the file so it can be
   added while another agent is editing the markup above it; at mount time
   this file MOVES that div to the top of the left column (before
   `#pt-drop-card`), which is where the field belongs — a runtime move, not
   an edit to somebody else's markup. If the left column is not there the
   div is left where it is and the field still works.

   `PressImport.mount(el, {onBundle})` is the entry point the plan asks for.
   It is idempotent and it re-parents: whoever calls it last owns the panel,
   so press.js's owner can wire one call and the self-mount below becomes a
   no-op. In PUBLISHER mode `mount()` builds nothing and removes what it
   built — the field is the owner's, and a page that shows an import box to
   a stranger is a page that invites somebody to sit and guess tokens at it.

   ── WHERE THE SECRET COMES FROM, AND WHY THIS IS THE RIGHT AMOUNT ────────
   `api/intake.js`'s two owner doors want `INTAKE_SECRET`, in an
   `x-intake-secret` header or `authorization: Bearer …`, NEVER in the query
   string (its own header says so: a secret in a URL is a secret in a log
   file and in a browser history). So this file:

     · never carries the secret in its source — the page is served to
       anybody who can reach the port, and a constant in a served file is a
       published constant;
     · never writes it to `localStorage` — that is the store press.js keeps
       the draft form in (`knoll-press:*`), it survives the browser being
       closed and reopened, and it is two clicks away in the devtools of any
       machine the owner walks away from;
     · asks the owner to TYPE IT ONCE and keeps it in `sessionStorage`, which
       is scoped to the one tab and is gone when that tab closes. A reload
       keeps it (the tab did not close), which is the whole point: the owner
       reloads the Press Table constantly and being asked again every time is
       how a person ends up pasting the secret into a text file on the
       desktop.
     · sends it in `x-intake-secret` and puts nothing but `list=1` and
       `token=…` in the URL.

   WHY THAT IS ENOUGH HERE. This is a LOCAL door. The Press Table is in
   owner mode only when `/_lab2/<prefix>/default` answered, which on this
   machine means `node lab2/test/serve.js` is running for that person, and
   the secret guards a folder (`press/cache/intake/`) that the same server
   already serves as static files to anyone who holds a token. The threat
   this defends against is not a remote attacker — it is the owner's own
   second browser, a screen-share, and a laptop left open in a café: a
   secret that is not on disk and not in the page cannot be read off either
   of them after the tab is shut. sessionStorage is exactly that much and no
   more, and it costs one typed line a day.

   WHAT WOULD BE WRONG FOR A DEPLOYED DOOR. On knoll.space the same field
   would be a browser holding a long-lived shared secret that unlocks EVERY
   publisher's bundle, over a network, with no expiry, no revocation and no
   audit — and any XSS anywhere on the origin reads sessionStorage as
   happily as localStorage. sessionStorage is not the weak part of that; the
   BEARER SECRET IS. A deployed owner door wants a real session: a login
   that sets an `HttpOnly; Secure; SameSite=Strict` cookie the page cannot
   read at all, short-lived, revocable, one per person rather than one per
   site, with the function checking the cookie instead of a header. Until
   there is such a login, the honest deployed configuration is to leave
   `INTAKE_SECRET` UNSET on Vercel — the two doors then answer 503 and stay
   shut, which is `api/intake.js`'s own rule ("an absent secret is never an
   open door") — and to import from a machine running the local server. That
   is a decision for the owner and it is in OPEN.md, not a thing this file
   can make true by itself.

   ── THE NUMBERS ──────────────────────────────────────────────────────────
   TOKEN_RE 22 base64url characters — `api/intake.js`'s TOKEN_CHARS, copied
     so a mistyped token is answered here in a sentence instead of costing a
     round trip to be told the same thing. It is the ONLY number copied from
     that file that is also enforced here; the rest (12 files, 25 MB, 30
     days) are the endpoint's to enforce and this file only quotes them.
   RETENTION_DAYS 30 — the plan's §12 4, printed in the panel as one line
     because the retention rule the owner has to live with is "nothing
     deletes these; sweep them by hand" and a rule nobody is told is not a
     rule. If `api/intake.js`'s RETENTION_DAYS ever moves, this sentence
     moves with it.
   LIST_MAX 500 — the endpoint's cap on `?list=1`, quoted in the panel only
     when a listing actually comes back that long, so the owner learns the
     list is truncated at the moment it is.
   MODE_WAIT_MS 30000 — how long to wait for press.js's knock to resolve
     before deciding this is not owner mode. press.js's own boot puts no
     clock on that fetch and `perf/verify-press.js` gives it 30 s; the field
     appearing late is better than the field appearing on a publisher's
     page, so the timeout falls to PUBLISHER.
   ROWS_MAX 200 — how many rows are drawn from a listing. Five hundred rows
     of DOM in a 380-px column is a scrollbar nobody reads; past this the
     panel says how many were left off and the owner prunes.

   ── WHAT IS CHECKED BEFORE THE FORM IS TOUCHED ───────────────────────────
   The bundle is validated against `press/schemas/manifest.schema.json`
   through `window.Validate`, with the schema pool press.js already fetched
   (`Press.state.schemas`) or one fetched here if it is not there. This is
   NOT a repeat of the check `api/intake.js` did: that one ran against a
   copy of the schema with the `file` pattern WIDENED to accept `.jpg`
   (its own "WHAT COUNTS AS A VALID BUNDLE"), because the plan tells intake
   to sniff JPEG. `press/tools/build-game.js` validates against the
   unwidened file, so a stored bundle carrying a JPEG is a bundle that will
   be refused at build time — and the right place to find that out is here,
   in a sentence, before six pictures and a form full of somebody's words
   are loaded on top of whatever the owner was doing.

   A bundle that fails is REPORTED AND NOT LOADED. There is no "bring it in
   anyway": intake validated this thing before it stored it, so a fault here
   means either the schema has moved under an old bundle or the picture is a
   format the generator will not take, and in both cases the fix is upstream
   of this form.

       node lab2/test/perf/verify-import.js        (from site/) — the whole
       loop: publisher mode sends a bundle to a real intake door, this field
       lists it, imports it, and the page builds from what arrived.
   ───────────────────────────────────────────────────────────────────────── */
(function () {
  'use strict';

  /* ── the door, derived from the pathname (CONTRACTS §0, three lines) ──── */
  const dir = location.pathname.replace(/[^/]*$/, '');
  const game = /^\/lab2(\/.*?)?\/games\/([a-z0-9-]+)\/$/.exec(dir);
  const DOOR = game ? '/_lab2' + (game[1] || '') + '/games/' + game[2]
                    : '/_lab2' + ((/^\/lab2(\/.*?)??\/(?:press\/)?$/.exec(dir) || [])[1] || '') + '/default';
  /* press.js derives the same string from the same three lines; if it is on
     the page its answer wins, because it is the file that owns the door. */
  const INTAKE = (window.Press && window.Press.INTAKE) || (DOOR.replace(/\/default$/, '') + '/intake');

  /* ── the numbers (each one's sentence is in THE NUMBERS, above) ───────── */
  const TOKEN_RE = /^[A-Za-z0-9_-]{22}$/;
  const RETENTION_DAYS = 30;
  const LIST_MAX = 500;
  const MODE_WAIT_MS = 30000;
  const ROWS_MAX = 200;
  const SKEY = 'knoll-press:intake-secret';
  const MIME = { png: 'image/png', webp: 'image/webp', jpg: 'image/jpeg', jpeg: 'image/jpeg' };

  const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
  const clear = n => { while (n.firstChild) n.removeChild(n.firstChild); return n; };
  const kb = n => (n >= 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB');

  /* A date the owner can read, out of an ISO string, without a library and
     without pretending to know their locale's order: the browser's own
     toLocaleDateString with the month spelled, which is unambiguous in every
     order it can come out in. A string that is not a date is shown as it
     came, because an intake written by hand is still an intake. */
  function when(iso) {
    const t = Date.parse(iso || '');
    if (!isFinite(t)) return String(iso || 'no date');
    try { return new Date(t).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }); }
    catch (e) { return new Date(t).toISOString().slice(0, 10); }
  }

  /* ── the secret: this tab only ────────────────────────────────────────── */
  /* `mem` is the fallback for a browser that throws on sessionStorage (a
     locked-down profile, some private modes). It is worse than sessionStorage
     in exactly one way — a reload asks again — and better in none, so it is
     never the first choice, and the panel says which one is in use. */
  let mem = '';
  let memOnly = false;
  const secret = {
    get() { if (memOnly) return mem; try { return sessionStorage.getItem(SKEY) || ''; } catch (e) { memOnly = true; return mem; } },
    set(v) {
      mem = String(v || '');
      try { if (mem) sessionStorage.setItem(SKEY, mem); else sessionStorage.removeItem(SKEY); }
      catch (e) { memOnly = true; }
      return mem;
    },
    clear() { return secret.set(''); },
    /* Where it is kept, in one sentence, for the panel to print. */
    where() {
      return memOnly
        ? 'this browser will not keep a sessionStorage key, so the secret is held in memory only and a reload asks again'
        : 'kept for THIS TAB ONLY (sessionStorage — gone when the tab closes) and sent in an x-intake-secret header, never in the URL';
    }
  };

  /* ── the endpoint ─────────────────────────────────────────────────────── */
  /* One way in and out, so the header is never forgotten and the query
     string never grows a secret. `qs` is only ever `list=1` or `token=…`. */
  async function ask(qs) {
    const s = secret.get();
    if (!s) return { ok: false, code: 'no-secret-here', error: 'type the intake secret first' };
    let r, j;
    try { r = await fetch(INTAKE + '?' + qs, { method: 'GET', cache: 'no-store', headers: { 'x-intake-secret': s } }); }
    catch (e) { return { ok: false, code: 'no-door', error: 'the intake door did not answer: ' + ((e && e.message) || e) }; }
    try { j = await r.json(); } catch (e) { return { ok: false, code: 'not-json', error: 'the intake door answered ' + r.status + ' with something that is not JSON' }; }
    if (!j || typeof j !== 'object') return { ok: false, code: 'not-json', error: 'the intake door answered ' + r.status + ' with nothing' };
    j.status = r.status;
    return j;
  }

  const listIntakes = () => ask('list=1');
  const oneIntake = token => ask('token=' + encodeURIComponent(token));

  /* ── the schemas ──────────────────────────────────────────────────────── */
  /* press.js fetched the pool at boot; reuse it rather than fetching eleven
     kilobytes of JSON a second time. If it did not (an early press, or this
     file on a page of its own) fetch it once and keep it. */
  let pool = null;
  async function schemas() {
    const theirs = window.Press && window.Press.state && window.Press.state.schemas;
    if (theirs) return theirs;
    if (pool) return pool;
    if (!window.Validate) return null;
    try { pool = await window.Validate.loadFetch('schemas/'); } catch (e) { pool = null; }
    return pool;
  }

  async function faultsOf(manifest) {
    const p = await schemas();
    if (!p || !window.Validate) return null;   // null = "could not check", never "valid"
    return window.Validate.check(manifest, 'manifest.schema.json', p).map(f => (f.path || 'the bundle') + ': ' + f.message);
  }

  /* ── the bundle → files ───────────────────────────────────────────────── */
  function bytesOf(b64) {
    const s = String(b64 || '').replace(/^data:[^,]*,/, '');
    const bin = atob(s);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }

  /* The array press.js's own drop zone would have been handed. See AS IF THE
     FILES HAD BEEN DROPPED. */
  function filesOf(got) {
    const m = (got && got.bundle) || {};
    const images = (got && got.images) || {};
    const files = [new File([JSON.stringify(m, null, 2)], 'manifest.json', { type: 'application/json' })];
    const missing = [];
    for (const a of (m.assets || [])) {
      const b64 = images[a.id];
      if (!b64) { missing.push(a.id); continue; }
      const ext = ((/\.([a-z0-9]+)$/i.exec(String(a.file || '')) || [])[1] || 'png').toLowerCase();
      files.push(new File([bytesOf(b64)], a.id + '.' + ext, { type: MIME[ext] || 'image/png' }));
    }
    return { files: files, missing: missing };
  }

  /* Who sent it, and when — the plan's own line. `rights.by` is the name the
     publisher attested under (intake stores it as `meta.by`), which is the
     one name on a bundle that somebody put their hand up for; `publisher`
     and `developer` are the fallbacks, and an unnamed bundle says so rather
     than showing an empty string with a comma after it. */
  function fromLine(got) {
    const m = (got && got.bundle) || {};
    const who = (m.rights && m.rights.by) || m.publisher || m.developer || (got && got.from) || '';
    return 'from ' + (who ? who : 'an unnamed publisher') + ', ' + when(got && got.at);
  }

  /* ── the default hand-over (until press.js has a hook of its own) ─────── */
  /* The pictures already on the table are taken off first. An import is a
     whole bundle — its own words, its own roles, its own six pictures — and
     dropping it on top of a half-finished one gives the owner a form that
     agrees with neither, and a twelve-file cap hit for a reason nobody can
     see. The object URLs go with them, because press.js made them and
     nothing else will let them go. */
  async function handToTable(bundle) {
    const P = window.Press;
    if (!P || typeof P.addFiles !== 'function') throw new Error('window.Press.addFiles is not on this page, so there is no table to hand it to');
    const had = P.state.assets.length;
    if (had) {
      for (const a of P.state.assets) { try { URL.revokeObjectURL(a.url); } catch (e) { /* a URL that will not revoke is not a reason to fail an import */ } }
      P.state.assets.length = 0;
    }
    await P.addFiles(bundle.files);
    return had;
  }

  /* ══ THE PANEL ═══════════════════════════════════════════════════════════ */

  let panel = null, ui = null, onBundle = null, mode = null;

  function say(text, kind) {
    if (!ui) return;
    ui.said.textContent = text || '';
    ui.said.className = 'pt-fine pi-said' + (kind ? ' ' + kind : '');
  }

  function build() {
    const box = el('section', 'pt-card pi-card');
    box.id = 'pt-import';

    const h = el('h2', 'pt-tag', '0 · bring in an intake');
    const state = el('span', 'pt-tag-note', 'locked');
    h.appendChild(state);
    box.appendChild(h);

    // the secret, first, because nothing below it works without it
    const lock = el('div', 'pi-row pi-lock');
    const sec = el('input');
    sec.type = 'password'; sec.id = 'pi-secret'; sec.placeholder = 'the intake secret';
    sec.autocomplete = 'off'; sec.spellcheck = false; sec.setAttribute('aria-label', 'the intake secret');
    const unlock = el('button', 'pt-btn', 'UNLOCK'); unlock.type = 'button'; unlock.id = 'pi-unlock';
    lock.appendChild(sec); lock.appendChild(unlock);
    box.appendChild(lock);

    const forget = el('button', 'pi-forget', 'forget the secret'); forget.type = 'button'; forget.id = 'pi-forget';
    forget.hidden = true;
    box.appendChild(forget);

    // the token, and the listing
    const row = el('div', 'pi-row');
    const tok = el('input');
    tok.type = 'text'; tok.id = 'pi-token'; tok.placeholder = 'a 22-character token';
    tok.autocomplete = 'off'; tok.spellcheck = false; tok.setAttribute('aria-label', 'an intake token');
    const get = el('button', 'pt-btn', 'BRING IT IN'); get.type = 'button'; get.id = 'pi-get';
    const ls = el('button', 'pt-btn', 'LIST'); ls.type = 'button'; ls.id = 'pi-list';
    row.appendChild(tok); row.appendChild(get); row.appendChild(ls);
    box.appendChild(row);

    const rows = el('ul', 'pi-rows'); rows.id = 'pi-rows'; rows.hidden = true;
    box.appendChild(rows);

    const from = el('p', 'pi-from'); from.id = 'pi-from'; from.hidden = true;
    box.appendChild(from);

    const said = el('p', 'pt-fine pi-said'); said.id = 'pi-said';
    box.appendChild(said);

    const fine = el('p', 'pt-fine pi-fine');
    fine.id = 'pi-fine';
    box.appendChild(fine);

    ui = { box, state, sec, unlock, forget, tok, get, ls, rows, from, said, fine };
    wire();
    return box;
  }

  /* The two standing lines: where the secret lives, and what happens to a
     bundle after thirty days. Both are printed, not implied. */
  function paintFine() {
    clear(ui.fine);
    ui.fine.appendChild(el('b', null, 'The secret'));
    ui.fine.appendChild(document.createTextNode(' is ' + secret.where() + '. '));
    ui.fine.appendChild(el('b', null, 'An intake is kept for ' + RETENTION_DAYS + ' days'));
    ui.fine.appendChild(document.createTextNode(' and nothing deletes it — pruning is by hand (plan §12 4): ' +
      'delete the folder under press/cache/intake/ locally, or the blob on Vercel. A row past its date is marked EXPIRED and still opens.'));
  }

  function paintLock() {
    const have = !!secret.get();
    ui.sec.parentNode.hidden = have;         // the .pi-lock row: the field goes away once it is typed
    ui.forget.hidden = !have;
    ui.tok.disabled = !have;
    ui.get.disabled = !have;
    ui.ls.disabled = !have;
    ui.state.textContent = have ? 'unlocked for this tab' : 'locked';
    ui.state.className = 'pt-tag-note' + (have ? ' on' : '');
    paintFine();
  }

  function wire() {
    ui.unlock.addEventListener('click', () => {
      const v = ui.sec.value.trim();
      if (!v) { say('type the secret the server was started with (INTAKE_SECRET).', 'bad'); return; }
      secret.set(v);
      ui.sec.value = '';
      paintLock();
      say('unlocked. LIST shows what is waiting.', 'ok');
    });
    ui.sec.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); ui.unlock.click(); } });
    ui.forget.addEventListener('click', () => {
      secret.clear();
      clear(ui.rows); ui.rows.hidden = true;
      ui.from.hidden = true;
      paintLock();
      say('forgotten. Nothing of it is left in this browser.', '');
    });
    ui.ls.addEventListener('click', () => showList());
    ui.get.addEventListener('click', () => bringIn(ui.tok.value.trim()));
    ui.tok.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); ui.get.click(); } });
  }

  /* 401 is the one answer that changes the panel's state rather than just
     its sentence: the secret in this tab is wrong, so it is dropped and the
     field comes back. Anything else leaves the secret alone — a 503 means
     the SERVER has none, which is not the owner's typing. */
  function trouble(j) {
    if (j.code === 'unauthorized') {
      secret.clear();
      paintLock();
      say('that is not the secret this server was started with.', 'bad');
      return;
    }
    if (j.code === 'no-secret') {
      say('this server has no INTAKE_SECRET in its environment, so the owner\'s doors are shut (503). Start it with the variable set.', 'bad');
      return;
    }
    say((j.error || 'the intake door refused it') + (j.status ? ' (' + j.status + ')' : ''), 'bad');
  }

  async function showList() {
    say('asking the intake door what is waiting…');
    const j = await listIntakes();
    if (!j.ok) return trouble(j);
    const rows = clear(ui.rows);
    ui.rows.hidden = false;
    if (!j.intakes.length) {
      rows.appendChild(el('li', 'pi-none', 'nothing has been sent in yet.'));
      say('the folder is empty — 0 intakes in ' + j.storage + ' storage.', '');
      return;
    }
    const shown = j.intakes.slice(0, ROWS_MAX);
    for (const r of shown) {
      const li = el('li', 'pi-row-item' + (r.expired ? ' pi-expired' : '') + (r.broken ? ' pi-broken' : ''));
      const b = el('button', 'pi-take'); b.type = 'button';
      b.appendChild(el('strong', null, r.title || '(no title)'));
      const meta = el('em', null, when(r.date) + ' · ' + kb(r.bytes) + ' · ' + r.files + ' picture' + (r.files === 1 ? '' : 's') +
        (r.by ? ' · ' + r.by : '') + (r.expired ? ' · EXPIRED' : ''));
      b.appendChild(meta);
      b.appendChild(el('code', null, r.token));
      b.addEventListener('click', () => { ui.tok.value = r.token; bringIn(r.token); });
      li.appendChild(b);
      rows.appendChild(li);
    }
    say(j.count + ' intake' + (j.count === 1 ? '' : 's') + ' in ' + j.storage + ' storage' +
      (j.count > shown.length ? ' — the newest ' + shown.length + ' are drawn here' : '') +
      (j.count >= LIST_MAX ? ' (the door answers with at most ' + LIST_MAX + ')' : '') + '.', 'ok');
  }

  async function bringIn(token) {
    /* `bringIn` is on the public object as well as on the button, so it can
       be called before there is a panel to write into (a script, a console).
       Everything below writes to `ui`, so that case is a throw with a
       sentence rather than a null dereference three lines later. */
    if (!ui) throw new Error('PressImport.mount() has not run — there is no field to bring it into');
    ui.from.hidden = true;
    if (!TOKEN_RE.test(String(token || ''))) {
      say('a token is 22 base64url characters; that one is ' + String(token || '').length + '.', 'bad');
      return null;
    }
    say('opening ' + token + '…');
    const j = await oneIntake(token);
    if (!j.ok) { trouble(j); return null; }

    const faults = await faultsOf(j.bundle);
    if (faults === null) {
      say('the schemas are not on this page, so the bundle could not be checked — nothing was loaded.', 'bad');
      return null;
    }
    if (faults.length) {
      say('this bundle does not match manifest.schema.json, so it was NOT loaded: ' + faults[0] +
        (faults.length > 1 ? ' (and ' + (faults.length - 1) + ' more)' : '') +
        '. Intake checked it against a copy that also allows .jpg; build-game.js will not.', 'bad');
      return null;
    }

    const made = filesOf(j);
    if (made.missing.length) {
      say('the bundle names ' + made.missing.length + ' picture' + (made.missing.length === 1 ? '' : 's') +
        ' the intake does not hold (' + made.missing.join(', ') + '), so it was NOT loaded.', 'bad');
      return null;
    }

    const bundle = {
      token: token, manifest: j.bundle, images: j.images, files: made.files,
      meta: j.meta || null, at: j.at || '', expires: j.expires || '', expired: !!j.expired,
      from: fromLine(j), storage: j.storage || ''
    };

    let had = 0;
    try { had = await (onBundle || handToTable)(bundle); }
    catch (e) { say('the table would not take it: ' + ((e && e.message) || e), 'bad'); return null; }

    ui.from.hidden = false;
    ui.from.textContent = bundle.from + (bundle.expired ? ' — past its ' + RETENTION_DAYS + '-day date' : '');
    say('brought in: ' + (made.files.length - 1) + ' picture' + (made.files.length === 2 ? '' : 's') +
      ' and the words, as if they had been dropped' + (had ? ' (the ' + had + ' already on the table were taken off first)' : '') +
      '. The slug is the publisher\'s — change it if you want a different folder — and BUILD works from here as usual.', 'ok');
    return bundle;
  }

  /* ══ MOUNTING ════════════════════════════════════════════════════════════ */

  /* press.js's knock is what decides the mode, and it is a fetch with no
     clock on it. MODE_WAIT_MS, then PUBLISHER — see THE NUMBERS. */
  function whenMode() {
    return new Promise(resolve => {
      const P = window.Press;
      if (!P || !P.state) {
        fetch(DOOR, { method: 'GET' })
          .then(r => (r.ok ? r.json() : null))
          .then(j => resolve(j && j.door ? 'owner' : 'publisher'))
          .catch(() => resolve('publisher'));
        return;
      }
      const t0 = Date.now();
      (function tick() {
        if (P.state.mode && P.state.mode !== 'knocking') return resolve(P.state.mode);
        if (Date.now() - t0 > MODE_WAIT_MS) return resolve('publisher');
        setTimeout(tick, 60);
      })();
    });
  }

  /* The entry point the plan asks for. Idempotent, re-parenting, and owner
     only — see WHERE IT MOUNTS. */
  async function mount(host, opts) {
    opts = opts || {};
    if (!host) return null;
    mode = await whenMode();
    if (mode !== 'owner') {
      if (panel && panel.parentNode) panel.parentNode.removeChild(panel);
      panel = null; ui = null;
      host.hidden = true;
      return null;
    }
    if (!panel) panel = build();
    if (panel.parentNode !== host) host.appendChild(panel);
    host.hidden = false;
    onBundle = typeof opts.onBundle === 'function' ? opts.onBundle : handToTable;
    paintLock();
    say(secret.get() ? 'unlocked for this tab. LIST shows what is waiting.' : 'the owner\'s doors want the secret this server was started with.', '');
    return api;
  }

  /* The self-mount, for as long as press.js has no hook. It puts the host
     div where the field belongs — first in the left column — and does
     nothing at all if somebody has already mounted the panel somewhere. */
  async function selfMount() {
    const host = document.getElementById('pt-import-mount');
    if (!host) return;
    if (panel && panel.parentNode) return;
    const left = document.querySelector('.pt-left');
    const first = document.getElementById('pt-drop-card');
    if (left && first && host.parentNode !== left) left.insertBefore(host, first);
    await mount(host, {});
  }

  const api = {
    mount: mount,
    INTAKE: INTAKE, DOOR: DOOR,
    secret: secret,
    list: listIntakes, fetch: oneIntake,
    filesOf: filesOf, fromLine: fromLine, bringIn: token => bringIn(token),
    mode: () => mode,
    panel: () => panel,
    NUMBERS: Object.freeze({ TOKEN_RE: TOKEN_RE.source, RETENTION_DAYS, LIST_MAX, MODE_WAIT_MS, ROWS_MAX, SKEY })
  };
  window.PressImport = api;

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', selfMount);
  else selfMount();
})();
