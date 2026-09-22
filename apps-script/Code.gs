/**
 * knoll.space endpoint — the waitlist, and (since 2026-09-17) the yard's
 * visitor count, its fence and its likes.
 *
 * Lives inside the "Knoll Signups" spreadsheet (Extensions > Apps Script).
 * Deploy: Deploy > New deployment > Web app, Execute as "Me",
 * Who has access "Anyone" (NOT "Anyone with Google account").
 * Copy the /exec URL into SIGNUP_ENDPOINT in coming-soon.html and HITS in
 * yard/tools.js and dashboard/index.html (all three are the same URL).
 *
 * Editing this later: Deploy > Manage deployments > pencil > Version:
 * "New version" > Deploy. Saving alone does not update the live URL.
 *
 * THREE TABS, made on first use if missing:
 *   Signups  A Timestamp | B Email | C Category | D Source          (the waitlist, as before)
 *   Visits   A t | B hill | C visitor | D device | E seconds | F referrer
 *   Fence    A t | B hill | C visitor | D kind (like / unlike / note) | E name | F text
 *
 * WHY HERE AND NOT ON VERCEL. The wall itself goes through api/hill.js into
 * Vercel Blob, which is a file store: a blob write is an "advanced
 * operation" and Hobby has 2,000 a month, so a write per VISIT would spend
 * the wall's own budget on counting. A sheet row is free and appends
 * atomically under the script lock. It is slow (a second or two) and every
 * request that reads it is cached for a minute, which is fine for a beacon
 * fired as a visitor leaves and a dashboard opened by one person.
 *
 * WHAT A STRANGER CAN DO. Anyone can post a visit, a like or a note — there
 * are no accounts — so every field is clipped and checked, notes are
 * capped at 140 characters and the fence shows the newest 50. Clearing a
 * tab's rows is the moderation tool; the header row is rebuilt on demand.
 */

var SHEET_NAME = 'Signups';
var VISITS = 'Visits';
var FENCE = 'Fence';
var CACHE_SECONDS = 60;
var HILL_RE = /^[a-z0-9][a-z0-9-]{0,31}$/;
var ID_RE = /^[a-z0-9]{1,32}$/;
var DEVICES = { desktop: 1, tablet: 1, mobile: 1 };

function doPost(e) {
  // Stops two simultaneous posts from clobbering the same row.
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    // Accept either JSON or plain form fields.
    var data = {};
    if (e && e.postData && e.postData.contents) {
      try { data = JSON.parse(e.postData.contents); }
      catch (err) { data = (e && e.parameter) || {}; }
    } else {
      data = (e && e.parameter) || {};
    }

    if (data.visit) return json(visit(data.visit));
    if (data.like) return json(like(data.like));
    if (data.note) return json(note(data.note));
    return json(signup(data));
  } catch (err) {
    return json({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

// ── the waitlist, exactly as it was ──────────────────────────────────────
function signup(data) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  if (!sheet) return { ok: false, error: 'sheet_not_found' };

  // Honeypot: real people leave this blank, bots fill it in.
  if (data.website) return { ok: true, duplicate: false };

  var email = String(data.email || '').trim().toLowerCase();
  var category = String(data.category || '').trim();
  var source = String(data.source || '').trim();

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(email)) {
    return { ok: false, error: 'invalid_email' };
  }

  // Already on the list? Say yes, but don't add a second row.
  if (sheet.getLastRow() > 1) {
    var seen = sheet.getRange(2, 2, sheet.getLastRow() - 1, 1)
      .getValues()
      .map(function (r) { return String(r[0]).trim().toLowerCase(); });
    if (seen.indexOf(email) !== -1) {
      return { ok: true, duplicate: true };
    }
  }

  sheet.appendRow([new Date(), email, category, source]);
  return { ok: true, duplicate: false };
}

// ── the tabs the yard writes ──────────────────────────────────────────────
function tab(name, header) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(name);
  if (!sh) { sh = ss.insertSheet(name); sh.appendRow(header); }
  else if (sh.getLastRow() === 0) sh.appendRow(header);
  return sh;
}
function rows(sh) {
  var n = sh.getLastRow();
  if (n < 2) return [];
  return sh.getRange(2, 1, n - 1, sh.getLastColumn()).getValues();
}
function clip(s, n) { return String(s == null ? '' : s).replace(/[\x00-\x1f\x7f]/g, '').slice(0, n).trim(); }
function ms(v) { var t = v instanceof Date ? v.getTime() : Date.parse(v); return isNaN(t) ? 0 : t; }
function forget(hill) {
  var c = CacheService.getScriptCache();
  c.remove('fence:' + hill);
  ['30', '90', '180', '366'].forEach(function (d) { c.remove('stats:' + hill + ':' + d); });
}

// a visitor leaving the page: one row, sent by navigator.sendBeacon
function visit(v) {
  var hill = clip(v.hill, 32), id = clip(v.id, 32), dev = clip(v.dev, 12), ref = clip(v.ref, 60).toLowerCase();
  var secs = Math.max(0, Math.min(86400, Math.round(+v.secs || 0)));
  if (!HILL_RE.test(hill) || !ID_RE.test(id)) return { ok: false, error: 'not a visit' };
  if (!DEVICES[dev]) dev = 'desktop';
  if (!/^[a-z0-9.-]{0,60}$/.test(ref)) ref = '';
  tab(VISITS, ['t', 'hill', 'visitor', 'device', 'seconds', 'referrer']).appendRow([new Date(), hill, id, dev, secs, ref]);
  return { ok: true };
}

// the heart on the fence: the latest row per visitor is what counts
function like(l) {
  var hill = clip(l.hill, 32), id = clip(l.id, 32);
  if (!HILL_RE.test(hill) || !ID_RE.test(id)) return { ok: false, error: 'not a like' };
  tab(FENCE, ['t', 'hill', 'visitor', 'kind', 'name', 'text']).appendRow([new Date(), hill, id, l.on ? 'like' : 'unlike', '', '']);
  forget(hill);
  return { ok: true, likes: fence({ hill: hill }).likes };
}

// a note left at the fence
function note(n) {
  var hill = clip(n.hill, 32), id = clip(n.id, 32), name = clip(n.name, 24) || 'a gnome', text = clip(n.text, 140);
  if (!HILL_RE.test(hill) || !ID_RE.test(id)) return { ok: false, error: 'not a note' };
  if (!text) return { ok: false, error: 'an empty note' };
  tab(FENCE, ['t', 'hill', 'visitor', 'kind', 'name', 'text']).appendRow([new Date(), hill, id, 'note', name, text]);
  forget(hill);
  return { ok: true, notes: fence({ hill: hill }).notes };
}

// ── reading ───────────────────────────────────────────────────────────────
function doGet(e) {
  var p = (e && e.parameter) || {};
  if (p.stats) return json(stats(p));
  if (p.fence) return json(fence(p));
  return json({ ok: true, message: 'knoll signups endpoint is live' });
}

/* the fence as the yard shows it: net likes, the newest 50 notes, and the
   visits of the last 30 days */
function fence(p) {
  var hill = clip(p.hill || 'yard', 32);
  if (!HILL_RE.test(hill)) return { ok: false, error: 'not a hill' };
  var cache = CacheService.getScriptCache(), key = 'fence:' + hill;
  var hit = cache.get(key);
  if (hit) return JSON.parse(hit);

  var last = {}, notes = [];
  rows(tab(FENCE, ['t', 'hill', 'visitor', 'kind', 'name', 'text'])).forEach(function (r) {
    if (String(r[1]) !== hill) return;
    if (r[3] === 'like' || r[3] === 'unlike') last[String(r[2])] = r[3];
    else if (r[3] === 'note') notes.push({ t: ms(r[0]), name: String(r[4]), text: String(r[5]) });
  });
  var likes = 0;
  for (var k in last) if (last[k] === 'like') likes++;
  var since = Date.now() - 30 * 86400000, views = 0;
  rows(tab(VISITS, ['t', 'hill', 'visitor', 'device', 'seconds', 'referrer'])).forEach(function (r) {
    if (String(r[1]) === hill && ms(r[0]) >= since) views++;
  });
  var out = { ok: true, hill: hill, likes: likes, views: views, notes: notes.slice(-50).reverse() };
  cache.put(key, JSON.stringify(out), CACHE_SECONDS);
  return out;
}

/* the dashboard's raw material: every visit in the window, compact, newest
   last — [t, visitor, device, seconds, referrer] — the page does the sums */
function stats(p) {
  var hill = clip(p.hill || 'yard', 32);
  if (!HILL_RE.test(hill)) return { ok: false, error: 'not a hill' };
  var days = Math.max(1, Math.min(366, Math.round(+p.days || 180)));
  var cache = CacheService.getScriptCache(), key = 'stats:' + hill + ':' + days;
  var hit = cache.get(key);
  if (hit) return JSON.parse(hit);

  var since = Date.now() - days * 86400000, hits = [];
  rows(tab(VISITS, ['t', 'hill', 'visitor', 'device', 'seconds', 'referrer'])).forEach(function (r) {
    var t = ms(r[0]);
    if (String(r[1]) !== hill || t < since) return;
    hits.push([t, String(r[2]), String(r[3]), +r[4] || 0, String(r[5] || '')]);
  });
  hits.sort(function (a, b) { return a[0] - b[0]; });
  if (hits.length > 5000) hits = hits.slice(hits.length - 5000);
  var f = fence({ hill: hill });
  var out = { ok: true, hill: hill, days: days, hits: hits, likes: f.likes, notes: f.notes.length };
  try { cache.put(key, JSON.stringify(out), CACHE_SECONDS); } catch (err) {}   // over 100 KB it simply is not cached
  return out;
}

function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
