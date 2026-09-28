/* ── api/wall.js — THE DOOR TOEM 2's WALL IS EDITED THROUGH ─────────────────
   One Vercel function at /api/wall (and, through two rewrites in
   vercel.json, /auth/google and /auth/google/callback), and the same module
   mounted by serve.js at the same paths on the dev server — so toem2/seed.js
   posts to one address wherever the page is opened. Shaped like api/hill.js:
   a (req, res) handler, its own body reader, a store picked from the
   environment.

   WHAT IS KEPT is THE WALL — the pieces, the tracings some of them are
   stamped from, and the two cameras: wall-seed.json's own shape with a
   revision number on it — plus one record per revision, a queue of edits
   waiting for a look, and one record per person who has signed in.

   HOW AN EDIT LANDS. A visitor edits their own copy of the wall (wall.js,
   unchanged) and presses SUBMIT; seed.js sends a PATCH — the revision it was
   made against, the pieces that changed (whole records, by name), the names
   that went, and any tracing a new stamp needs. This checks every field,
   CLASSIFIES the patch (small · large · drastic, by how many pieces move,
   change, arrive or go — and by whether any CANON piece, one of the eight
   plates' own, is deleted or pushed off the plates), and DECIDES by the
   sender's TIER:

     newcomer     rep 0–2 · small and large edits wait in the queue; drastic is refused
     contributor  rep 3–9 · small edits go live; large wait; drastic waits for a moderator
     trusted      rep 10+ · small and large go live; drastic waits for a moderator
     moderator    a flag  · everything goes live; reviews the queue; strikes, undoes, bans
     admin        ADMIN_EMAILS · all of that, and appoints the moderators

   THE QUEUE is decided by the trusted (small and large edits, never their
   own, never one from their own address) and by moderators (anything). A
   DRASTIC edit from a contributor or a trusted editor is a MOTION: the
   trusted vote aye or nay for 72 hours, one vote per address, the proposer
   not counted; three ayes and two thirds pass it, and it goes on the wall
   the moment that is so; at 72 hours it is rejected if enough voted and it
   failed, and falls to the moderators' queue if too few did. A moderator
   can approve (fast-track) or reject (veto) a motion outright.

   A REVERT MARKS ITS PIECES CONTESTED for 24 hours: a non-moderator's edit
   touching one waits in the queue rather than going live — the edit war's
   second round is a moderator's to look at. A strike also costs whoever
   approved the struck edit two days.

   REP IS STANDING DAYS: one point for each UTC day on which an edit of yours
   went live or was approved, never more than one a day — time spent being
   useful, which a sock puppet cannot buy in bulk and a 1-px nudge farm cannot
   speed up. A plain revert or a rejection costs nothing (taste is not
   malice, and a revert that cost rep would be a weapon). A moderator's STRIKE
   — revert as vandalism — takes five and drops you to newcomer; two in
   thirty days bans.

   THREE LEVELS OF CHAOS (2026-09-24). Every page has a `chaos` its keeper
   sets (op settings; THE RULES in the history panel): 0 READ-ONLY — its
   maker, and the moderators, alone draw on it; 1 TENDED — the
   KEEPERS edit live and decide the queue; everyone else adds the kinds the
   page allows (FEATS: ink · stickers · notes · tracings · embeds · others'
   pieces — off is the keepers' only) on pieces of their own, by the tier
   rules above, and anything past that is a proposal in the queue, never a
   refusal; 2 COUNCIL — the keepers edit live and every other patch is a
   MOTION on the page's BALLOT, which has a clock (THE COUNCIL'S CLOCK,
   below: every `every` hours the motion with the most hearts goes up);
   3 WILD — anyone signed in edits
   anything, live, with no canon, no cooldown and no queue; the caps, the
   rate and the history stay, and a strike is refused there (a revert is a
   revert). KEEPERS are the moderators everywhere, the trusted tier on
   TOEM 2, and on a space its maker (who is that page's moderator) with the
   friends they invited (api/friends.js) while they are still friends.
   Every piece carries `by` — who put it up, stamped here and never by a
   client — and a non-keeper touches only their own. VOTES take a standing
   day (rep 1 or more): one per address, the proposer and their address
   excluded. A motion with a close of its own — a drastic edit, on a page
   that is no council — wants a quorum of three and a simple majority at
   that close, a tie falls, and nothing passes early; a keeper's approve is
   the fast track, a reject the veto.

   THE COUNCIL'S CLOCK, AND HEARTS (2026-09-28). The ballot shows every edit
   that waits as a picture of the page with it on, and each has a HEART. On
   a motion a heart IS the vote — an aye, or the vote taken back (op heart;
   op vote still marks aye or nay) — and takes what a vote takes. On an edit
   waiting for the keepers it decides nothing: it says which the page likes,
   and anybody signed in gives one. A council's motions are decided by the
   page's clock and not one by one: every `every` hours (1 · 3 · 6 · 12 · 24
   · 72 · 168; six unless its maker says otherwise) the motion with the most
   hearts — one at least (three, for a drastic edit), and more than it has
   nays; the older of two level ones — goes up, and the rest wait for the
   next round, a week at most. The midnight closes, the period in days and
   the quorum of three on an ordinary motion are gone.
   STANDING is earned on TOEM 2 while it is not wild, and nowhere else.
   WATCHED (a moderator's flag, op role) makes an account a newcomer
   wherever it goes. The counters an account keeps (HABITS, below) are
   anybody's to read at ?who=, and a moderator's in full.

   ONE STORE, TWO KINDS. Upstash Redis over its REST API when KV_REST_API_URL
   and KV_REST_API_TOKEN are set (the Vercel Marketplace store; no package,
   one POST per command); else, off Vercel, a JSON file at toem2/wall-db.json
   (or $WALL_DB) that answers the same handful of commands — so the owner
   reviews on localhost with no Redis, and every test runs with no network.
   On Vercel with neither, GET answers 503 and seed.js opens on the shipped
   wall-seed.json, read-only.

   EVERY WRITE TO THE WALL IS ONE COMPARE-AND-SET: a Lua script that applies
   the new doc only if the revision is still the one it was computed from.
   An edit whose base has moved but which touches none of the pieces that
   moved goes straight on; one that overlaps is answered 409 with the wall as
   it stands, and seed.js rebases and sends it again.

   WHO YOU ARE is a Knoll account (2026-09-21): made at /signup with an
   address and a secret word (api/auth.js), or vouched for by Google —
   /auth/google sends you there, /auth/google/callback takes the code back
   and asks Google whose it is. Either way the session is a COOKIE the page's
   scripts cannot read (knoll_s, THE SITE'S SESSION IS A COOKIE below), so
   one sign-in reaches every page, this door included. The account key is
   sixteen hex characters of the sha256 of the address; the address itself
   is not kept. A Bearer header still works, for toem2/session.js and the
   probes.

   MORE PAGES THAN ONE (2026-09-22). TOEM 2 was the first page; since
   2026-09-23 any gnome can make another — two each, a moderator as many as
   the site needs (SPACES, below) — and each is a wall of its own — its doc,
   revisions, log, queue and contested pieces under keys of its own (THE
   STORE'S MAP, below) — edited through this same door with a `page` beside
   the op. The accounts, their standing and their caps are the site's, not a
   page's. Its wall opens blank and nothing draws it yet: its address,
   knoll.space/<slug>, shows its sign (space.html).

   A NAME IS NOT AN ACCOUNT (2026-09-22). Any number of gnomes may be called
   Mossy; each gets a number with it — Mossy#1, Mossy#2, up to #1,000,000 —
   and the two together, the TAG, are one gnome's and nobody else's, for good
   (THE NAMES, below). Every name an account has gone by is kept.

   THE MASTER, AND A PAGE HANDED ON (2026-09-27). The admin is the site's
   MASTER: on every page, the first included, it stands where the page's
   maker stands. And a page changes hands by a CODE the master asks for
   (op handoff) and the gnome who is to have it types into their yard's
   settings (op claim) — TOEM 2 like any other (THE MASTER, below).

   ponytail: reads ship the whole doc (~260 KB) — past ~2 MB, tracings move
   out to keys of their own. */
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.join(__dirname, '..');
const P = 'toem2:';
const MAX_BODY = 1024 * 1024;                // the post; a tracing is ~100 KB, a whole-wall paste ~40 KB
const LOG_KEEP = 500;                        // summaries kept in the log list; every revision keeps its own key
const SESSION_DAYS = 90, QUEUE_DAYS = 7, EDIT_DAYS = 30;

// the caps — every one of them a 400 or a 413, never a queue entry
const CAP = {
  ops: 500, record: 32 * 1024, keys: 24, text: 280, noteW: 2000, art: 6, tracing: 256 * 1024, name: 24, why: 140,
  world: 20000, zMin: 4, zMax: 4000,
  items: 2000, videos: 12, gifs: 40, notes: 200, tracings: 60, doc: 3 * 1024 * 1024,
  pending: 2, pendingIp: 4, queue: 50, footprint: 120
};
// the classifier's lines: a patch takes the worst class any row gives it
const LINE = { moveS: 20, moveL: 80, propS: 10, propL: 40, delS: 2, delL: 10, canonPropL: 10, embedL: 3, artL: 2, pad: 1000 };
const RATE = { newcomer: 3, contributor: 12, trusted: 30, mod: 1e9, admin: 1e9, ip: 60 };   // submissions an hour
const TIER_REP = { contributor: 3, trusted: 10 };
const STRIKE = 5, STRIKES_BAN = 2, STRIKE_DAYS = 30, APPROVER_COST = 2;
const MOTION_HOURS = 72, MOTION_QUORUM = 3, CONTESTED_HOURS = 24;
/* THREE LEVELS OF CHAOS: a page's chaos (0 read-only · 1 tended · 2 council · 3 wild), how often a council's clock comes round, in hours,
   and FEATS — which kinds everyone may add live (ink · stickers · notes · tracings · embeds · others' pieces); off is the keepers' only */
const CHAOS = [0, 1, 2, 3], EVERY = [1, 3, 6, 12, 24, 72, 168], CHAOS_DEFAULT = 1, EVERY_DEFAULT = 6, HOUR = 3600e3;
const FEATS_DEFAULT = [true, true, true, false, false, false], KIND_SLOT = { s: 0, p: 0, b: 0, d: 1, k: 1, t: 2, i: 3, g: 4, v: 4 }, OTHERS_SLOT = 5;
const LOCK_S = 5, NOTES_KEEP = 50;            // a vote's lock on its motion (seconds) · bell entries kept (api/friends.js reads them)
const VOTE = { id: 'vote', name: 'the vote' }; // the hand that closes a ballot
const TAG_MAX = 1000000;                      // the most gnomes one name takes: Mossy#1 … Mossy#1000000
const NAMES_KEEP = 50, AUDIT_KEEP = 1000;     // names kept per account; entries kept in the moderators' record
const HOME = 'toem2';                         // the first page: its keys are the store's oldest, and stay put
const HANDOFF_DAYS = 7, CLAIM_TRIES = 10, CLAIM_TRIES_IP = 30;   // a code's life · wrong codes an hour, an account and an address (THE MASTER)
const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{0,30}[a-z0-9])?$/;

const REV_DAYS = 180;                        // a revision's full record (what a revert needs) is kept this long; the log's summary outlives it
const UNDO_MAX = 50;                          // revisions one undo call takes back, so the function ends before its clock does
const SWEEP_MS = 60000;                       // the queue is swept for expiries at most this often per instance
const KINDS = new Set(['d', 'i', 's', 'p', 'b', 't', 'g', 'v', 'k']);
const STAMPED = new Set(['d', 'i', 'g', 'v', 'k']);            // the x/y/z/o kinds
const MOVE_KEYS = new Set(['x', 'y', 'L', 'r', 'fx', 'fy']);   // a change to these alone is a move
const N_RE = /^[a-z0-9]{8,20}$/, F_RE = /^[a-z0-9-]{1,64}$/, VID_RE = /^[\w-]{11}$/, KEY_RE = /^[a-zA-Z]{1,2}$/;
const EDIT_RE = /^e[A-Za-z0-9_-]{6,30}$/, USER_RE = /^[0-9a-f]{16}$/, SESS_RE = /^[A-Za-z0-9_-]{20,128}$/;
/* A gif is a whole URL on KLIPY's own hosts and nothing else: the host must
   END in klipy.com or klipy.co, and the path and query are plain URL
   characters — no quote, no space, no angle bracket — because wall.js puts
   it into markup. A tracing's drawing is exactly what tracer.js makes and
   nothing else: a run of <path fill-rule="evenodd" fill="#hex" d="…"/>,
   the d in path letters and numbers — because wall.js puts THAT into
   innerHTML, on every visitor's screen, and one <image onerror> in it would
   be a script running as everybody. */
const GIF_RE = /^https:\/\/([a-z0-9-]+\.)*klipy\.(com|co)\/[A-Za-z0-9._~%\/-]*(\?[A-Za-z0-9._~%&=\/-]*)?$/i;
const PATH_RE = /^<path fill-rule="evenodd" fill="#[0-9a-fA-F]{6}" d="[MmLlHhVvCcSsQqTtAaZz0-9.,\s-]*"\/>$/;
const NUM_MAX = 1e6;                          // no number on a piece past this, whatever it is for
const RANGE = { sz: [4, 4000], sw: [0.1, 4000], sr: [0, 100], g: [1, 1000], w: [0, 8192], h: [0, 8192], f: [0, 32] };
const ROLES = ['user', 'trusted', 'mod', 'admin'];

// ── replies ───────────────────────────────────────────────────────────────
function answer(res, status, out, cache) {
  res.statusCode = status;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.setHeader('x-content-type-options', 'nosniff');
  res.setHeader('cache-control', cache && status === 200 ? cache : 'no-store');
  res.end(JSON.stringify(out));
}
/* What the CDN may keep: the wall itself for ten seconds (a visitor pulls on
   focus anyway, and ten seconds is the most a fresh tab is behind), a
   revision's record for a day (it never changes), the log for ten seconds.
   Everything that depends on who is asking, or changes when it is read, is
   no-store. */
const CACHE = { doc: 'public, max-age=0, s-maxage=10, stale-while-revalidate=60', rev: 'public, max-age=3600, s-maxage=86400', log: 'public, max-age=0, s-maxage=10' };
function page(res, text) {                   // the one non-JSON reply: what a sign-in that went wrong says
  res.statusCode = 400;
  res.setHeader('content-type', 'text/html; charset=utf-8');
  res.setHeader('x-content-type-options', 'nosniff');
  res.setHeader('cache-control', 'no-store');
  res.end('<!doctype html><meta charset="utf-8"><title>Knoll · sign in</title><body style="font:16px/1.5 system-ui;padding:40px;max-width:36em">' +
          '<p>' + esc(text) + '</p><p><a href="/login/">← back to log in</a></p>');
}
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
class Bad extends Error { constructor(status, code, msg, extra) { super(msg); this.status = status; this.code = code; this.extra = extra; } }
const bad = (status, code, msg, extra) => new Bad(status, code, msg, extra);

// ── the body, on either host (as api/hill.js reads it) ────────────────────
function readBody(req) {
  if (req.body !== undefined) {
    const b = req.body;
    if (Buffer.isBuffer(b) || typeof b === 'string') {
      if (b.length > MAX_BODY) return Promise.reject(bad(413, 'body', 'the post is bigger than ' + (MAX_BODY >> 10) + ' KB'));
      try { return Promise.resolve(JSON.parse(Buffer.isBuffer(b) ? b.toString('utf8') : (b || '{}'))); } catch (e) { return Promise.reject(bad(400, 'body', 'the post is not JSON')); }
    }
    if (b && typeof b === 'object') {
      if (JSON.stringify(b).length > MAX_BODY) return Promise.reject(bad(413, 'body', 'the post is bigger than ' + (MAX_BODY >> 10) + ' KB'));
      return Promise.resolve(b);
    }
    return Promise.resolve({});
  }
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', c => { raw += c; if (raw.length > MAX_BODY) { req.destroy(); reject(bad(413, 'body', 'the post is bigger than ' + (MAX_BODY >> 10) + ' KB')); } });
    req.on('end', () => { try { resolve(raw ? JSON.parse(raw) : {}); } catch (e) { reject(bad(400, 'body', 'the post is not JSON')); } });
    req.on('error', reject);
  });
}

// ── the store ─────────────────────────────────────────────────────────────
/* The one script: apply the doc if the revision is still the one it was
   computed from — and in the same breath, bump it, keep the revision under
   its own key, and put its summary at the head of the log. */
const CAS = [
  "if redis.call('GET', KEYS[1]) ~= ARGV[1] then return 0 end",
  "redis.call('SET', KEYS[2], ARGV[2])",
  "redis.call('INCR', KEYS[1])",
  "redis.call('LPUSH', KEYS[3], ARGV[3])",
  "redis.call('LTRIM', KEYS[3], 0, " + (LOG_KEEP - 1) + ")",
  "redis.call('SET', KEYS[4], ARGV[4], 'EX', " + (REV_DAYS * 86400) + ")",
  'return 1'
].join('\n');

/* Upstash's REST shape: the command as a JSON array in the body, `{result}`
   back; /pipeline takes a list of them. HGETALL comes back flat and is
   folded into an object here, so both stores answer alike. */
function redisStore(url, tok) {
  const base = String(url).replace(/\/+$/, '');
  async function call(body, pipe) {
    const r = await fetch(base + (pipe ? '/pipeline' : ''), { method: 'POST', headers: { authorization: 'Bearer ' + tok, 'content-type': 'application/json' }, body: JSON.stringify(body) });
    if (!r.ok) throw new Error('the store answered ' + r.status);
    return r.json();
  }
  const fix = (cmd, out) => {
    if (!out || out.error) throw new Error('the store said: ' + (out && out.error));
    let v = out.result;
    if (String(cmd[0]).toUpperCase() === 'HGETALL' && Array.isArray(v)) { const o = {}; for (let i = 0; i < v.length; i += 2) o[v[i]] = v[i + 1]; v = o; }
    return v;
  };
  return {
    kind: 'redis',
    one: async (...cmd) => fix(cmd, await call(cmd)),
    many: async cmds => (cmds.length ? (await call(cmds, true)).map((o, i) => fix(cmds[i], o)) : [])
  };
}

/* The dev server's stand-in: one JSON file, read before every command and
   written after every one that changes something. Node is single-threaded,
   so the script is as atomic here as it is there. ponytail: two processes
   on one file will step on each other; the dev server and one script at a
   time is what this is for. */
function fileStore(file) {
  const empty = () => ({ s: {}, h: {}, l: {}, t: {}, z: {}, x: {} });   // strings · hashes · lists · sets · sorted sets · expiries (ms)
  const load = () => { try { return Object.assign(empty(), JSON.parse(fs.readFileSync(file, 'utf8'))); } catch (e) { return empty(); } };
  const save = d => { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file + '.tmp', JSON.stringify(d)); fs.renameSync(file + '.tmp', file); };
  const has = (d, k) => d.s[k] != null || !!d.h[k] || !!d.l[k] || !!d.t[k] || !!d.z[k];
  const drop = (d, k) => { delete d.s[k]; delete d.h[k]; delete d.l[k]; delete d.t[k]; delete d.z[k]; delete d.x[k]; };
  const sweep = (d, k) => { if (d.x[k] && d.x[k] <= Date.now()) drop(d, k); };
  const num = v => Number(v), str = v => (v == null ? '' : String(v));
  const range = (l, a, b) => { a = num(a); b = num(b); if (a < 0) a += l.length; if (b < 0) b += l.length; return l.slice(Math.max(0, a), b + 1); };
  const bound = v => (v === '-inf' ? -Infinity : v === '+inf' ? Infinity : num(v));
  function run(d, cmd) {
    const op = String(cmd[0]).toUpperCase(), k = str(cmd[1]);
    if (op !== 'EVAL' && k) sweep(d, k);
    switch (op) {
      case 'GET': return d.s[k] == null ? null : d.s[k];
      case 'SET': {
        const opts = cmd.slice(3).map(x => String(x).toUpperCase());
        if (opts.includes('NX') && d.s[k] != null) return null;
        d.s[k] = str(cmd[2]);
        const ex = opts.indexOf('EX');
        if (ex >= 0) d.x[k] = Date.now() + num(cmd[3 + ex + 1]) * 1000; else delete d.x[k];
        return 'OK';
      }
      case 'GETDEL': { const v = d.s[k] == null ? null : d.s[k]; drop(d, k); return v; }
      case 'DEL': { let n = 0; cmd.slice(1).forEach(kk => { if (has(d, str(kk))) n++; drop(d, str(kk)); }); return n; }
      case 'INCR': case 'INCRBY': { const v = num(d.s[k] || 0) + (op === 'INCR' ? 1 : num(cmd[2])); d.s[k] = String(v); return v; }
      case 'EXPIRE': if (!has(d, k)) return 0; d.x[k] = Date.now() + num(cmd[2]) * 1000; return 1;
      case 'EXISTS': return has(d, k) ? 1 : 0;
      case 'HGETALL': return Object.assign({}, d.h[k] || {});
      case 'HGET': return d.h[k] && d.h[k][str(cmd[2])] != null ? d.h[k][str(cmd[2])] : null;
      case 'HSET': { const h = d.h[k] = d.h[k] || {}; let n = 0; for (let i = 2; i + 1 < cmd.length; i += 2) { if (h[str(cmd[i])] == null) n++; h[str(cmd[i])] = str(cmd[i + 1]); } return n; }
      case 'HSETNX': { const h = d.h[k] = d.h[k] || {}; if (h[str(cmd[2])] != null) return 0; h[str(cmd[2])] = str(cmd[3]); return 1; }
      case 'HINCRBY': { const h = d.h[k] = d.h[k] || {}; const v = num(h[str(cmd[2])] || 0) + num(cmd[3]); h[str(cmd[2])] = String(v); return v; }
      case 'LPUSH': case 'RPUSH': { const l = d.l[k] = d.l[k] || []; cmd.slice(2).forEach(v => (op === 'LPUSH' ? l.unshift(str(v)) : l.push(str(v)))); return l.length; }
      case 'LRANGE': return range(d.l[k] || [], cmd[2], cmd[3]);
      case 'LSET': { const l = d.l[k] || []; let i = num(cmd[2]); if (i < 0) i += l.length; if (!(i >= 0 && i < l.length)) throw new Error('the store said: index out of range'); l[i] = str(cmd[3]); return 'OK'; }
      case 'LREM': { const l = d.l[k] || []; const c = num(cmd[2]), v = str(cmd[3]); let n = 0; for (let i = 0; i < l.length;) { if (l[i] === v && (c === 0 || n < Math.abs(c))) { l.splice(i, 1); n++; } else i++; } return n; }
      case 'LTRIM': d.l[k] = range(d.l[k] || [], cmd[2], cmd[3]); return 'OK';
      case 'LLEN': return (d.l[k] || []).length;
      case 'SADD': { const t = d.t[k] = d.t[k] || {}; let n = 0; cmd.slice(2).forEach(m => { if (!t[str(m)]) { t[str(m)] = 1; n++; } }); return n; }
      case 'SREM': { const t = d.t[k] || {}; let n = 0; cmd.slice(2).forEach(m => { if (t[str(m)]) { delete t[str(m)]; n++; } }); return n; }
      case 'SCARD': return Object.keys(d.t[k] || {}).length;
      case 'SMEMBERS': return Object.keys(d.t[k] || {});
      case 'SISMEMBER': return d.t[k] && d.t[k][str(cmd[2])] ? 1 : 0;
      case 'ZADD': { const z = d.z[k] = d.z[k] || {}; let n = 0; for (let i = 2; i + 1 < cmd.length; i += 2) { if (z[str(cmd[i + 1])] == null) n++; z[str(cmd[i + 1])] = num(cmd[i]); } return n; }
      case 'ZRANGEBYSCORE': { const z = d.z[k] || {}, lo = bound(cmd[2]), hi = bound(cmd[3]); return Object.keys(z).filter(m => z[m] >= lo && z[m] <= hi).sort((a, b) => z[a] - z[b]); }
      case 'ZREMRANGEBYSCORE': { const z = d.z[k] || {}, lo = bound(cmd[2]), hi = bound(cmd[3]); let n = 0; Object.keys(z).forEach(m => { if (z[m] >= lo && z[m] <= hi) { delete z[m]; n++; } }); return n; }
      case 'ZCARD': return Object.keys(d.z[k] || {}).length;
      case 'ZREVRANGE': { const z = d.z[k] || {}; return range(Object.keys(z).sort((a, b) => z[b] - z[a]), cmd[2], cmd[3]); }
      case 'EVAL': {
        if (cmd[1] !== CAS) throw new Error('the file store knows one script, and this is not it');
        const nk = num(cmd[2]), keys = cmd.slice(3, 3 + nk).map(str), args = cmd.slice(3 + nk).map(str);
        keys.forEach(kk => sweep(d, kk));
        if ((d.s[keys[0]] == null ? null : d.s[keys[0]]) !== args[0]) return 0;
        d.s[keys[1]] = args[1];
        d.s[keys[0]] = String(num(d.s[keys[0]]) + 1);
        d.l[keys[2]] = [args[2]].concat(d.l[keys[2]] || []).slice(0, LOG_KEEP);
        d.s[keys[3]] = args[3]; d.x[keys[3]] = Date.now() + REV_DAYS * 86400e3;
        return 1;
      }
      default: throw new Error('the file store does not know ' + op);
    }
  }
  const WRITES = /^(SET|GETDEL|DEL|INCR|INCRBY|EXPIRE|HSET|HSETNX|HINCRBY|LPUSH|RPUSH|LSET|LREM|LTRIM|SADD|SREM|ZADD|ZREMRANGEBYSCORE|EVAL)$/;
  const writes = cmd => WRITES.test(String(cmd[0]).toUpperCase());
  return {
    kind: 'file', file,
    async one(...cmd) { const d = load(); const r = run(d, cmd); if (writes(cmd)) save(d); return r; },
    async many(cmds) { const d = load(); const out = cmds.map(c => run(d, c)); if (cmds.some(writes)) save(d); return out; }
  };
}

let STORE;
function storeFor() {
  if (STORE !== undefined) return STORE;
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL, tok = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (url && tok) STORE = redisStore(url, tok);
  else if (!process.env.VERCEL) STORE = fileStore(process.env.WALL_DB || path.join(ROOT, 'toem2', 'wall-db.json'));
  else STORE = null;                          // deployed with no store: GET 503, and seed.js opens on the shipped file
  return STORE;
}
const db = (...cmd) => storeFor().one(...cmd);
const dbm = cmds => storeFor().many(cmds);
/* ── THE STORE'S MAP (2026-09-22) ─────────────────────────────────────────
   Every key the site keeps. The prefix says toem2: because TOEM 2 came
   first; it is the whole site's now. Hashes grow a field without a
   migration, so a feature not designed yet adds fields, not keys.

   ACCOUNTS — the site's
     user:<u>          hash    made seen name n role pw toured banned struck strikes avatar noted watch
                               · gen — how many times its password has been reset (THE SESSION'S GENERATION)
                               · hearts — the likes on its yard's fence when the bell was last opened (api/friends.js: op seen)
                               · live held okd rej won rvd rvs rvw votes — the counters (HABITS)
     users             zset    every account, scored by when it was made
     names:<u>         list    {name, n, at, by} — every name it has gone by, newest first
     tagn:<name>       string  how many have taken that name (lower-cased): the last #n given
     tags              hash    '<name>#<n>' → the account; a tag is never given twice
     sess:<sha>        string  a session → its account, and '.<gen>' once the account has one (expires)
     oauth:<state>     string  a Google or Discord sign-in on its way (ten minutes)
     code:<u>          hash    h tries — a code posted to an address, a sign-up's or a reset's, hashed, and the guesses (api/auth.js: THE CODE, THE RESET; ten minutes)
     days:<u>          set     standing days — rep, earned on any page
     rl:<who>:<hour>   string  the hour's counters · rl:chat:<slug>:<u>:wait — the chat's wait between two lines (api/board.js)
     fp:<u>:<day>      set     the pieces touched today, any page (the footprint)
     pending:<u>       list    edits of theirs waiting, any page · pendingip:<h> the same by address
   PAGES
     page:<slug>       hash    made title kind by, its look: palette inks pic, its rules: chaos every closes last told feats (period: the clock in days, until 2026-09-28 — unread)
                               (mod: the form's old word, kept, unread) — every page; the first keeps a settings-only hash (no made)
                               · hand given giver — the code it may be claimed by ({h, at, ex, by}, or none), when it last
                                 changed hands and who handed it on (THE MASTER); the first page has a `by` once it is claimed
                               · tabs chat (the board's tabs and the chat's rules — api/board.js) · sections (the album's — api/gallery.js)
                               · ranks (what the leaderboard shows — api/leaderboard.js), JSON
     pages             zset    those pages, scored by when they were made
     spaces:<u>        set     the pages an account made (SPACES: two, unless a moderator)
     given:<u>         set     the pages an account was handed (THE MASTER) — theirs as much, and not counted among the ones they may make
     handoff:<sha>     string  a code, by its sha256 → {page, by, at}: the page it opens, once (expires)
     doc rev log rev:<n> queue contested
                               a page's wall: bare for toem2 (toem2:doc), p:<slug>: before
                               the rest for any other (toem2:p:<slug>:doc) — pageKeys()
     edit:<id>         string  one edit, waiting or decided, naming its page (none: toem2), with prev why look; a motion: closes votes voters
     lock:<edit>       string  a vote landing on a motion (LOCK_S seconds)
   PROFILES — a profile is an account's name and its yard (api/hill.js)
     prop:<id>         string  a change somebody else proposes to a gnome's yard or name
     propdoc:<id>      string  …the yard it proposes, while it is open
     props:<hill>      list    the open ones, for that yard's owner to decide
     propsdone:<hill>  list    the decided ones, newest first, trimmed — the yard's history of what was proposed (their records last PROP_KEEP days)
     propsby:<u>       list    the open ones this account has made · propsip:<h> the same by address
   FRIENDS — api/friends.js
     friends:<u>       set     the accounts it is friends with, both ways
     asks:<u>          set     the accounts asking to be its friend
     notes:<u>         list    its bell, newest first: {kind, from, at, slug, title, why, ayes, nays, prop, what} — kind is ask · friend · keeper (friends.js),
                               okd · rej · passed · failed · ballot · waiting (here), proposal · taken · left (hill.js), thread · reply (board.js),
                               photo · heart (gallery.js)
     invited:<slug>    set     the accounts invited to a space — its keepers, while they are still the maker's friends
   THE TOWN BOARD AND THE CHAT — api/board.js
     board:<slug>:<ch> list    a page's news · updates · forum (threads and replies) · chat, newest first, trimmed
     here:<slug>       zset    the accounts with the page open, scored by when each was last seen (a minute and a half; expires)
     joined:<slug>     hash    account → when it was first seen with the page open: the JOINED lines of the page's history (?history=1)
   THE PHOTO ALBUM — api/gallery.js
     album:<slug>      list    a page's photos, newest first, trimmed: {id, by, at, cap, where, src, key} — the picture is a file (Blob, or toem2/album/)
     album:<slug>:like:<id> set  who gave the photo a heart
   THE LEADERBOARD — api/leaderboard.js
     lb:<slug>         string  the page's count, as last made from its log, board and album (ten minutes)
   THE MODERATORS' RECORD
     audit             list    roles, bans, watches, pages made, settings, invites, reviews, closes, reverts, strikes, undos, hides */
const K = {
  user: u => P + 'user:' + u, users: P + 'users', names: u => P + 'names:' + u, tagN: name => P + 'tagn:' + name, tags: P + 'tags',
  sess: h => P + 'sess:' + h, oauth: s => P + 'oauth:' + s, code: u => P + 'code:' + u, days: u => P + 'days:' + u, rl: (who, hour) => P + 'rl:' + who + ':' + hour,
  fp: (u, day) => P + 'fp:' + u + ':' + day, pending: u => P + 'pending:' + u, pendingIp: h => P + 'pendingip:' + h,
  page: s => P + 'page:' + s, pages: P + 'pages', spaces: u => P + 'spaces:' + u, edit: id => P + 'edit:' + id,
  given: u => P + 'given:' + u, handoff: h => P + 'handoff:' + h,
  prop: id => P + 'prop:' + id, propDoc: id => P + 'propdoc:' + id, props: hill => P + 'props:' + hill,
  propsBy: u => P + 'propsby:' + u, propsIp: h => P + 'propsip:' + h, propsDone: hill => P + 'propsdone:' + hill, audit: P + 'audit',
  friends: u => P + 'friends:' + u, asks: u => P + 'asks:' + u, notes: u => P + 'notes:' + u, invited: s => P + 'invited:' + s,
  lock: id => P + 'lock:' + id, board: (s, ch) => P + 'board:' + s + ':' + ch,
  album: s => P + 'album:' + s, albumLike: (s, id) => P + 'album:' + s + ':like:' + id,
  lb: s => P + 'lb:' + s, here: s => P + 'here:' + s, joined: s => P + 'joined:' + s
};
function pageKeys(slug) {
  const p = slug === HOME ? P : P + 'p:' + slug + ':';
  return { slug, doc: p + 'doc', rev: p + 'rev', log: p + 'log', queue: p + 'queue', contested: p + 'contested', revN: n => p + 'rev:' + n };
}
async function pageOf(slug) {                 // a page named in a request: the first, or one a moderator made
  if (slug == null || slug === '' || slug === HOME) return pageKeys(HOME);
  if (!SLUG_RE.test(String(slug)) || !(await db('HGET', K.page(slug), 'made'))) throw bad(404, 'page', 'no such page');
  return pageKeys(String(slug));
}
const pageOfEdit = ed => pageKeys(ed.page || HOME);   // an edit from before pages is TOEM 2's

// ── small things ──────────────────────────────────────────────────────────
const sha = s => crypto.createHash('sha256').update(String(s), 'utf8').digest('hex');
const fin = v => typeof v === 'number' && Number.isFinite(v);
const today = () => new Date().toISOString().slice(0, 10);
const newId = () => 'e' + Date.now().toString(36) + crypto.randomBytes(4).toString('base64url');
const canon = rec => JSON.stringify(rec, Object.keys(rec).sort());
const text = (s, n) => String(s == null ? '' : s).replace(/[\x00-\x1f\x7f]/g, '').replace(/\s+/g, ' ').trim().slice(0, n);
const userKey = email => sha(String(email).trim().toLowerCase()).slice(0, 16);
const admins = () => String(process.env.ADMIN_EMAILS || '').toLowerCase().split(/[,\s]+/).filter(Boolean);
const summary = f => ({ rev: f.rev, edit: f.edit, by: f.by, name: f.name, how: f.how, via: f.via, cls: f.cls, at: f.at, of: f.of,
                        n: { put: Object.keys(f.put).length, del: f.del.length, art: f.art || 0 } });
const numOf = v => (Number.isFinite(+v) ? +v : 0);
/* HABITS: the counters an account keeps (each one an HINCRBY where the thing happens), what they add up to, and whether a
   moderator has it WATCHED. ponytail: no automatic watch — a plain revert is free, and a rule that watched on reverts would
   make a revert a weapon; the counters are shown to the moderators, who decide. */
const COUNTERS = ['live', 'held', 'okd', 'rej', 'won', 'rvd', 'rvs', 'rvw', 'votes'];
function habits(rec) {
  const h = {};
  COUNTERS.forEach(k => { h[k] = numOf(rec[k]); });
  h.landed = h.live + h.okd;
  h.flak = h.landed ? Math.round(h.rvd / h.landed * 100) / 100 : 0;
  h.strikes = numOf(rec.strikes);
  h.watched = rec.watch === '1';
  return h;
}
const DAY = 86400e3, dayOf = t => new Date(t).toISOString().slice(0, 10);
function streakOf(days) {                      // standing days in a row, ending today or yesterday
  const have = new Set(days);
  let t = Date.now(), n = 0;
  if (!have.has(dayOf(t))) t -= DAY;
  while (have.has(dayOf(t))) { n++; t -= DAY; }
  return n;
}
/* A PICTURE: an account's (the yard's K and the corner's face — api/auth.js)
   or a space's (its "?" at /yard/new/). The page cuts it to a 128-pixel
   square JPEG in the browser, so the door takes exactly that and nothing
   else — a JPEG data: URL, its first bytes a JPEG's, a size well past what
   the page sends but nowhere near a photograph's — because every GET that
   carries it carries all of it. It is only ever drawn as an <img>. */
const PIC_MAX = 60000, PIC_HEAD = 'data:image/jpeg;base64,';
function cleanPic(v) {
  if (typeof v !== 'string' || v.length > PIC_MAX || !/^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(v)) return '';
  const b = Buffer.from(v.slice(PIC_HEAD.length, PIC_HEAD.length + 8), 'base64');
  return b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff ? v : '';
}

// ── who ───────────────────────────────────────────────────────────────────
const bearer = req => { const m = /^Bearer\s+(\S+)$/i.exec(String(req.headers.authorization || '')); return m && SESS_RE.test(m[1]) ? m[1] : null; };
const isMod = me => !!me && !me.banned && (me.role === 'mod' || me.role === 'admin');   // a banned moderator moderates nothing, reads included
const master = me => !!me && !me.banned && me.role === 'admin';                          // THE MASTER: the admin, who is every page's maker
async function profile(u, rec, rep) {
  if (rep == null) rep = await db('SCARD', K.days(u));
  const role = ROLES.includes(rec.role) ? rec.role : 'user', h = habits(rec);
  const watched = h.watched && !(role === 'mod' || role === 'admin');   // watched: a newcomer wherever it goes
  const tier = role === 'admin' || role === 'mod' ? role : watched ? 'newcomer' : role === 'trusted' ? role
             : rep >= TIER_REP.trusted ? 'trusted' : rep >= TIER_REP.contributor ? 'contributor' : 'newcomer';
  return Object.assign({ id: u, name: rec.name || '', n: +rec.n || 0, tag: tagOf(rec), role, rep, tier, banned: rec.banned === '1', made: numOf(rec.made) },
                       h, { strikes: +(rec.strikes || 0), watched });
}
/* ── THE SITE'S SESSION IS A COOKIE (2026-09-21) ────────────────────────────
   knoll_s carries the session: HttpOnly, so no script on any page — nor
   anything a visitor's piece ever smuggled into one — can read it; and
   SameSite=Lax, so another site's form or fetch cannot post with it
   (sameSite() below turns away what a browser too old for Lax would let
   through). knoll_in rides beside it with the account's id and nothing else,
   and a page CAN read that one: it is how account.js draws a signed-out
   corner with no request and a signed-in one before the door has answered.
   The two live as long as each other: ninety days, or — "keep the gate
   unlatched" left unticked — until the browser closes, and a day at most in
   the store. */
const COOKIE = 'knoll_s', HINT = 'knoll_in', OAUTH = 'knoll_o';
const cookieOf = (req, name) => { const m = new RegExp('(?:^|;\\s*)' + name + '=([^;]*)').exec(String(req.headers.cookie || '')); return m ? m[1] : ''; };
const sessionOf = req => bearer(req) || (SESS_RE.test(cookieOf(req, COOKIE)) ? cookieOf(req, COOKIE) : null);
const cookie = (req, name, value, days, open) => name + '=' + value + '; Path=/; SameSite=Lax' + (open ? '' : '; HttpOnly') +
  (originOf(req).startsWith('https:') ? '; Secure' : '') + (days != null ? '; Max-Age=' + Math.round(days * 86400) : '');
function setSession(res, req, s, u, days, also) {
  res.setHeader('set-cookie', [cookie(req, COOKIE, s, days), cookie(req, HINT, u, days, true)].concat(also || []));
}
function clearSession(res, req) { res.setHeader('set-cookie', [cookie(req, COOKIE, '', 0), cookie(req, HINT, '', 0, true)]); }
/* A post that rides on the cookie must come from this site: the Origin a
   browser sends with every post names the page it came from. No Origin at
   all (a script off the site, curl) is let through — it has nobody's cookie
   to ride on. */
function sameSite(req) {
  const o = req.headers.origin;
  if (o) return o === originOf(req);
  const f = req.headers['sec-fetch-site'];
  return !f || f === 'same-origin' || f === 'none';
}
/* where a sign-in may send you back to: a path on this site and nothing else
   — a slash, then no second slash or backslash (so no //elsewhere.example),
   and no spaces; anything else goes to your yard */
const localPath = v => (typeof v === 'string' && v.length <= 512 && /^\/(?![\/\\])[^\s\\]*$/.test(v) ? v : '/yard/');

/* THE SESSION'S GENERATION (2026-09-27). A session is kept as its account and,
   once the account has had its password reset, a dot and the account's `gen`
   as it stood when the session was made. A reset turns `gen` (api/auth.js: THE
   RESET), so every session from before it names a generation that is over,
   and is nobody's — whoever held them is signed out at their next request. A
   session from before any reset names none, which is the generation of an
   account that has never had one. */
const sessOf = v => String(v || '').split('.');                       // [the account, its generation]
const inGen = (rec, gen) => (rec.gen || '') === (gen || '');

async function whoIs(req) {
  const t = sessionOf(req);
  if (!t) return null;
  const [u, gen] = sessOf(await db('GET', K.sess(sha(t))));
  if (!USER_RE.test(u)) return null;
  const [rec, rep] = await dbm([['HGETALL', K.user(u)], ['SCARD', K.days(u)]]);
  if (!rec || !Object.keys(rec).length || !inGen(rec, gen)) return null;
  return profile(u, await ensureTag(u, rec), rep);
}
async function mintSession(u, days, gen) {     // gen: the account's, when the caller has its record to hand; asked for otherwise
  const s = crypto.randomBytes(16).toString('hex');
  if (gen === undefined) gen = await db('HGET', K.user(u), 'gen');
  await db('SET', K.sess(sha(s)), gen ? u + '.' + gen : u, 'EX', Math.round((days || SESSION_DAYS) * 86400));
  return s;
}
/* An address has been vouched for — by Google, or by its secret word
   (api/auth.js): the account is made or found, the admin list is applied
   (and un-applied: an address taken off the list is an admin no longer, the
   next time they sign in), and a session is minted.

   THE ADMIN LIST WANTS A PROVED ADDRESS. Google proves one (the callback
   checks email_verified); a secret word proves only that somebody typed it —
   whoever petitions first for the owner's address would otherwise be the
   admin. So `proved` is false from /signup and /login, and there the list
   gives nothing (and takes nothing away that it did not give). */
async function finishLogin(email, days, proved = true) {
  const u = userKey(email), now = String(Date.now());
  const rec = await db('HGETALL', K.user(u));
  const fresh = !Object.keys(rec).length;
  const sets = ['seen', now];
  if (fresh) sets.push('made', now, 'name', '', 'role', 'user');
  if (proved && admins().includes(String(email).trim().toLowerCase())) sets.push('role', 'admin');
  else if (rec.role === 'admin') sets.push('role', 'user');
  await dbm([['HSET', K.user(u), ...sets], ['ZADD', K.users, +(rec.made || now), u]]);   // counted among the accounts (again is harmless)
  return { user: u, session: await mintSession(u, days, rec.gen || ''), fresh, named: !!rec.name };
}

/* ── THE NAMES (2026-09-22) ─────────────────────────────────────────────────
   Anybody may be called anything; the number beside a name is what tells
   two Mossies apart. It is claimed when a name is taken — the next one that
   name has given, counted per name with capitals and compatibility forms
   folded (NFKC) — and the TAG, name#n, is that account's from then on:
   numbers only go up, so no tag is ever handed to somebody else, and an old
   one still says whose it was. Going back to a name one has had, or only
   changing its capitals, gives back the same number rather than a new one.
   Every name, and who gave it (the gnome, or somebody whose proposal they
   took — api/hill.js), is kept in names:<u>.

   ponytail: look-alikes across scripts (a Cyrillic а for a Latin a) are two
   names with two counters — the number still tells them apart; a skeleton
   (Unicode TR39) is the upgrade if impersonation becomes a thing. A name
   gone from the newest NAMES_KEEP gets a new number if it comes back. */
const cleanName = v => text(String(v == null ? '' : v).replace(/#/g, ''), CAP.name).trim();   // # is the tag's own mark; the cut can end on a space
const tagOf = rec => (rec.name ? rec.name + (rec.n ? '#' + rec.n : '') : '');
const foldName = name => String(name).normalize('NFKC').toLowerCase();
async function claimTag(u, name, rec) {
  const key = foldName(name);
  if (rec.n && rec.name && foldName(rec.name) === key) return +rec.n;
  const had = (await db('LRANGE', K.names(u), 0, -1)).map(s => JSON.parse(s)).find(h => h.n && foldName(h.name) === key);
  if (had) return had.n;
  const n = await db('INCR', K.tagN(key));
  if (n > TAG_MAX) throw bad(409, 'name-full', 'a million gnomes are called that already — choose another name');
  await db('HSET', K.tags, key + '#' + n, u);
  return n;
}
async function rename(u, raw, by) {
  const name = cleanName(raw);
  if (!name) throw bad(400, 'name', 'every gnome has a name; even Nameless is one');
  const rec = await db('HGETALL', K.user(u));
  if (!rec || !rec.made) throw bad(404, 'user', 'no such gnome');
  if (rec.banned === '1') throw bad(403, 'banned', 'this account may not change its name');
  if (rec.name === name && rec.n) return { name, n: +rec.n, tag: tagOf(rec) };
  const n = await claimTag(u, name, rec);
  await dbm([['HSET', K.user(u), 'name', name, 'n', String(n)],
             ['LPUSH', K.names(u), JSON.stringify(Object.assign({ name, n, at: Date.now() }, by && by !== u ? { by } : {}))],
             ['LTRIM', K.names(u), 0, NAMES_KEEP - 1]]);
  return { name, n, tag: tagOf({ name, n }) };
}
// an account named before the numbers: numbered — and counted — the first time it is seen
async function ensureTag(u, rec) {
  if (!rec.name || rec.n) return rec;
  let n;
  try { n = await claimTag(u, rec.name, rec); } catch (e) { if (e instanceof Bad) return rec; throw e; }   // a full name: stays unnumbered, still signed in
  await dbm([['HSET', K.user(u), 'n', String(n)], ['ZADD', K.users, +rec.made || Date.now(), u],
             ['LPUSH', K.names(u), JSON.stringify({ name: rec.name, n, at: Date.now() })]]);
  return Object.assign(rec, { n: String(n) });
}
async function audit(by, what, extra) {        // the moderators' record: who did what, and to whom
  await dbm([['LPUSH', K.audit, JSON.stringify(Object.assign({ at: Date.now(), by, what }, extra || {}))], ['LTRIM', K.audit, 0, AUDIT_KEEP - 1]]);
}
// THE BELL (api/friends.js reads it): one note, newest first, the last NOTES_KEEP kept
const tell = (to, kind, from, extra) => dbm([['LPUSH', K.notes(to), JSON.stringify(Object.assign({ kind, from, at: Date.now() }, extra || {}))],
                                            ['LTRIM', K.notes(to), 0, NOTES_KEEP - 1]]);
/* …AND ONCE (2026-09-27): the things that happen at a space over and over — an edit waiting, a
   thread begun, a photo hung, a heart given — are said once per place while that note is still
   unread (newer than `noted`, the bell last opened), so a busy afternoon is one line in a bell of
   fifty and not the whole of it. The bell says THAT there is something; the page it points at
   says how much. */
async function tellOnce(to, kind, from, extra) {
  const [raw, noted] = await dbm([['LRANGE', K.notes(to), 0, NOTES_KEEP - 1], ['HGET', K.user(to), 'noted']]);
  const slug = (extra || {}).slug;
  if (raw.some(s => { try { const n = JSON.parse(s); return n.kind === kind && n.slug === slug && n.at > (+noted || 0); } catch (e) { return false; } })) return;
  await tell(to, kind, from, extra);
}
/* A space's keepers, told of something that happened there — all but the one who did it, and
   TOLD_MAX of them at most: a maker may invite whom they like, and one post must not become a
   store call for every keeper of a space with a thousand. The maker is first in the list. */
const TOLD_MAX = 25;
async function tellKeepers(rules, from, kind, extra) {
  for (const u of rules.keepers.filter(u => u !== from).slice(0, TOLD_MAX)) await tellOnce(u, kind, from, Object.assign({ slug: rules.page, title: rules.title }, extra || {}));
}
async function tagsOf(ids) {                   // account → Name#n, for the ones a page will draw
  const uniq = [...new Set(ids)], out = {};
  if (!uniq.length) return out;
  const got = await dbm(uniq.flatMap(u => [['HGET', K.user(u), 'name'], ['HGET', K.user(u), 'n']]));
  uniq.forEach((u, i) => { out[u] = tagOf({ name: got[2 * i], n: got[2 * i + 1] }) || 'a gnome'; });
  return out;
}
const titleOf = async slug => (await db('HGET', K.page(slug || HOME), 'title')) || (slug === HOME || !slug ? 'TOEM 2' : slug);

const ipOf = req => String(req.headers['x-real-ip'] || String(req.headers['x-forwarded-for'] || '').split(',')[0] || (req.socket && req.socket.remoteAddress) || '?').trim();
const ipHash = req => sha((process.env.IP_SALT || 'knoll') + '|' + ipOf(req)).slice(0, 16);
/* Three counters an hour — every op per account, edits per account, and
   every op per address — in the store so a cold start forgets nothing.
   Every post counts, refused ones too (otherwise a flood of bad ones is
   free). A rename or a new page is as rare as an edit and takes the tier's
   rate; a review, a vote, a revert or the settings are capped at the
   trusted rate for everyone, so a keeper with no standing days is not out
   of moves after one edit and two decisions. THE EDITS are counted where
   the page's rules are known (opEdit): the tier's rate, or the trusted
   rate for the page's keepers and its maker. */
async function rateOk(me, req, op) {
  const hour = Math.floor(Date.now() / 36e5), ku = K.rl('u:' + me.id, hour), ki = K.rl('ip:' + ipHash(req), hour);
  const [nu, ni] = await dbm([['INCR', ku], ['INCR', ki]]);
  const ex = [];
  if (nu === 1) ex.push(['EXPIRE', ku, 3600]);
  if (ni === 1) ex.push(['EXPIRE', ki, 3600]);
  if (ex.length) await dbm(ex);
  const tier = RATE[me.tier] || RATE.newcomer, tiered = op === 'me' || op === 'page';
  return nu <= (tiered ? tier : Math.max(tier, RATE.trusted)) && (isMod(me) || ni <= RATE.ip);
}
async function editRateOk(me, rules) {
  const hour = Math.floor(Date.now() / 36e5), ke = K.rl('e:' + me.id, hour), ne = await db('INCR', ke);
  if (ne === 1) await db('EXPIRE', ke, 3600);
  const tier = RATE[me.tier] || RATE.newcomer;
  return ne <= (rules.keeper || rules.owner ? Math.max(tier, RATE.trusted) : tier);
}

// ── the wall ──────────────────────────────────────────────────────────────
const BLANK_CAM = { z: 1, cx: 0, cy: 0, w: 2560 }, BLANK_NARROW = { z: 0.4, cx: 0, cy: 0, w: 412 };   // a new page's camera, until a moderator's edit moves it
async function loadDoc(pg) {
  let raw = await db('GET', pg.doc);
  if (raw == null) {                          // the page's very first visitor: TOEM 2's shipped wall — or, for a newer page, a blank one — becomes revision 1
    let doc = { rev: 1, cam: BLANK_CAM, cam_narrow: BLANK_NARROW, wall: { items: [] }, flatfile: { list: [] } }, from = 'a blank page';
    if (pg.slug === HOME) {
      const seed = require('../toem2/wall-seed.json');
      const items = (seed.wall && seed.wall.items || []).filter(it => it && typeof it === 'object' && typeof it.k === 'string');
      let n = 0;
      items.forEach(it => { if (!it.n) it.n = Date.now().toString(36) + (n++).toString(36) + Math.floor(Math.random() * 1e6).toString(36); });   // a seed from before mint.js
      doc = { rev: 1, cam: seed.cam, cam_narrow: seed.cam_narrow, wall: { items }, flatfile: { list: (seed.flatfile && seed.flatfile.list || []).filter(t => t && t.id) } };
      from = 'wall-seed.json';
    }
    const json = JSON.stringify(doc);
    if (await db('SET', pg.doc, json, 'NX')) {
      const full = { rev: 1, edit: null, by: 'seed', name: from, how: 'seed', cls: 'seed', at: Date.now(), put: {}, del: [], prev: {} };
      await dbm([['SET', pg.rev, '1'], ['SET', pg.revN(1), JSON.stringify(full)], ['LPUSH', pg.log, JSON.stringify(summary(full))]]);
      return doc;
    }
    raw = await db('GET', pg.doc);
  }
  return JSON.parse(raw);
}

/* ── one piece, checked ─────────────────────────────────────────────────────
   Kind-agnostic where it can be — one- or two-letter keys, primitive values,
   at most so many, at most so big — so a field wall.js grows tomorrow needs
   no line here; and kind-specific where a wrong value would be a hole: a
   video that is not a YouTube id, a gif from somewhere that is not KLIPY, a
   piece a mile off the paper. A three-letter key is dropped, not refused. */
function cleanRecord(n, rec, mod) {
  if (!rec || typeof rec !== 'object' || Array.isArray(rec)) throw bad(400, 'record', 'piece ' + n + ' is not a piece');
  const out = {}, keys = Object.keys(rec).filter(k => KEY_RE.test(k));
  if (keys.length > CAP.keys) throw bad(400, 'record', 'piece ' + n + ' has ' + keys.length + ' fields, which is not one of ours');
  for (const k of keys) {
    const v = rec[k];
    if (v === undefined || v === null) continue;
    if (!(fin(v) || typeof v === 'string' || typeof v === 'boolean')) throw bad(400, 'record', 'piece ' + n + ': ' + k + ' is not a number, a string or a flag');
    if (fin(v) && Math.abs(v) > NUM_MAX) throw bad(400, 'record', 'piece ' + n + ': ' + k + ' is past any size this wall has');
    if (RANGE[k] && fin(v) && (v < RANGE[k][0] || v > RANGE[k][1])) throw bad(400, 'record', 'piece ' + n + ': ' + k + ' is outside ' + RANGE[k][0] + '–' + RANGE[k][1]);
    out[k] = v;
  }
  out.n = n;
  if (!KINDS.has(out.k)) throw bad(400, 'kind', 'piece ' + n + ' is of no kind this wall knows');
  if (!mod || !out.c) delete out.c; else out.c = 1;   // canon is a flag, and a moderator's to give (and to take)
  delete out.by;                                     // who put a piece up is this door's to say (cleanPatch), never a client's
  if (JSON.stringify(out).length > CAP.record) throw bad(413, 'record', 'piece ' + n + ' is bigger than ' + (CAP.record >> 10) + ' KB');
  const k = out.k;
  if (STAMPED.has(k) || k === 't') {
    if (!fin(out.x) || !fin(out.y) || Math.abs(out.x) > CAP.world || Math.abs(out.y) > CAP.world) throw bad(400, 'where', 'piece ' + n + ' is off the paper');
  }
  if (STAMPED.has(k)) {
    if (!fin(out.z) || out.z < CAP.zMin || out.z > CAP.zMax) throw bad(400, 'size', 'piece ' + n + ' is sized outside ' + CAP.zMin + '–' + CAP.zMax);
    if (out.o != null && ![0, 1, 2].includes(out.o)) throw bad(400, 'fade', 'piece ' + n + ' has a fade this wall has not got');
  }
  if ((k === 'd' || k === 'i') && !(typeof out.f === 'string' && F_RE.test(out.f))) throw bad(400, 'art', 'piece ' + n + ' names no artwork');
  if (k === 'v' && !(typeof out.id === 'string' && VID_RE.test(out.id))) throw bad(400, 'video', 'piece ' + n + ' is not a YouTube video');
  if (k === 'g' && !(typeof out.u === 'string' && out.u.length <= 512 && GIF_RE.test(out.u))) throw bad(400, 'gif', 'piece ' + n + ' is a gif from somewhere other than KLIPY');
  if ((k === 'g' || k === 'v') && !(fin(out.w) && fin(out.h) && out.w >= 1 && out.h >= 1)) throw bad(400, 'record', 'piece ' + n + ' has no size');
  if (k === 's' && !fin(out.sw)) throw bad(400, 'stroke', 'piece ' + n + ' is a stroke with no width');
  if (k === 'p' && !fin(out.g)) throw bad(400, 'stroke', 'piece ' + n + ' is pixel art with no grid');
  if (k === 't') {
    if (typeof out.t !== 'string') throw bad(400, 'note', 'piece ' + n + ' is a note with no words');
    if (out.t.length > CAP.text) throw bad(413, 'note', 'a note can say ' + CAP.text + ' characters at most');
    if (out.w != null && (!fin(out.w) || out.w > CAP.noteW)) throw bad(400, 'note', 'piece ' + n + ' is a note wider than ' + CAP.noteW);
    if (out.sz != null && !fin(out.sz)) throw bad(400, 'note', 'piece ' + n + ' is a note with no size');
    ['b', 'i', 'u'].forEach(f => { if (out[f] != null) out[f] = out[f] ? 1 : 0; });
    if (out.a != null && ![0, 1, 2].includes(out.a)) delete out.a;
  }
  ['fx', 'fy'].forEach(f => { if (out[f] != null) { if (out[f]) out[f] = 1; else delete out[f]; } });
  if ((k === 's' || k === 'b' || k === 'p') && typeof out.d !== 'string') throw bad(400, 'stroke', 'piece ' + n + ' is a stroke with no path');
  ['L', 'r', 'fx', 'fy'].forEach(f => { if (out[f] != null && !fin(out[f])) delete out[f]; });
  return out;
}
function cleanTracing(t) {
  if (!t || typeof t !== 'object' || typeof t.id !== 'string' || !N_RE.test(t.id)) throw bad(400, 'tracing', 'a tracing has no id');
  if (typeof t.d !== 'string' || !fin(t.w) || !fin(t.h) || t.w < 1 || t.h < 1 || t.w > RANGE.w[1] || t.h > RANGE.h[1]) throw bad(400, 'tracing', 'tracing ' + t.id + ' has no drawing');
  if (t.d.length > CAP.tracing) throw bad(413, 'tracing', 'tracing ' + t.id + ' is bigger than ' + (CAP.tracing >> 10) + ' KB');
  const parts = t.d.match(/<[^>]*>/g) || [];
  if (!parts.length || parts.join('') !== t.d || !parts.every(p => PATH_RE.test(p))) throw bad(400, 'tracing', 'tracing ' + t.id + ' is not a drawing the tracing table made');
  return { id: t.id, name: text(t.name, 60), w: Math.round(t.w), h: Math.round(t.h), d: t.d,
           colors: fin(t.colors) ? Math.max(0, Math.round(t.colors)) : parts.length, paths: fin(t.paths) ? Math.max(0, Math.round(t.paths)) : parts.length,
           at: fin(t.at) ? Math.round(t.at) : Date.now() };
}
function cleanPatch(body, me) {
  const mod = isMod(me);
  if (!fin(body.base) || body.base < 0) throw bad(400, 'base', 'the patch names no revision it was made against');
  const rawPut = body.put && typeof body.put === 'object' && !Array.isArray(body.put) ? body.put : {};
  const rawDel = Array.isArray(body.del) ? body.del : [], rawArt = Array.isArray(body.art) ? body.art : [];
  if (Object.keys(rawPut).length + rawDel.length > CAP.ops) throw bad(413, 'ops', 'one edit can carry ' + CAP.ops + ' pieces at most — split it up');
  if (rawArt.length > CAP.art) throw bad(413, 'art', 'one edit can bring ' + CAP.art + ' tracings at most');
  const put = {}, del = [], art = [];
  for (const n of Object.keys(rawPut)) {
    if (!N_RE.test(n)) throw bad(400, 'name', 'a piece is called ' + JSON.stringify(n).slice(0, 30) + ', which is no name');
    put[n] = cleanRecord(n, rawPut[n], mod);
    put[n].by = me.id;                            // stamped as the sender's; classify() gives an existing piece its first owner back
  }
  for (const n of rawDel) {
    if (typeof n !== 'string' || !N_RE.test(n)) throw bad(400, 'name', 'a deleted piece has no name');
    if (!del.includes(n)) del.push(n);
  }
  const wanted = new Set(Object.values(put).filter(r => r.k === 'i').map(r => r.f));
  for (const t of rawArt) { const c = cleanTracing(t); if (wanted.has(c.id) && !art.some(a => a.id === c.id)) art.push(c); }   // art no stamp asks for is dropped
  const out = { base: Math.floor(body.base), put, del, art };
  const look = cleanLook(body.look);
  if (look) out.look = look;
  if (mod && body.cam && typeof body.cam === 'object' && [body.cam.z, body.cam.cx, body.cam.cy].every(fin)) {
    out.cam = { z: body.cam.z, cx: body.cam.cx, cy: body.cam.cy, w: fin(body.cam.w) ? body.cam.w : 0 };
    out.which = body.which === 'narrow' ? 'narrow' : 'wide';
  }
  return out;
}

/* ── the classifier ─────────────────────────────────────────────────────────
   Measured against the wall as it stands: a piece sent back unchanged is not
   a change, a nudge under two world px is not a change, a canon piece keeps
   its flag whatever a non-moderator sends. Then counted, and the worst row
   wins. Embeds and new tracings are never small unless you are trusted. */
const allowed = (feats, k) => !feats || KIND_SLOT[k] == null || !!feats[KIND_SLOT[k]];   // may everyone add this kind live?
function classify(patch, doc, me, feats) {
  const byN = new Map(doc.wall.items.map(it => [it.n, it]));
  const have = new Set(doc.flatfile.list.map(t => t.id));
  let bx0 = Infinity, by0 = Infinity, bx1 = -Infinity, by1 = -Infinity;
  doc.wall.items.forEach(it => { if (it.c && fin(it.x) && fin(it.y)) { bx0 = Math.min(bx0, it.x); by0 = Math.min(by0, it.y); bx1 = Math.max(bx1, it.x); by1 = Math.max(by1, it.y); } });
  const outside = r => isFinite(bx0) && fin(r.x) && fin(r.y) && (r.x < bx0 - LINE.pad || r.x > bx1 + LINE.pad || r.y < by0 - LINE.pad || r.y > by1 + LINE.pad);
  const others = !(feats && feats[OTHERS_SLOT]);   // are other people's pieces the keepers' only?
  const c = { moves: 0, props: 0, adds: 0, dels: 0, canonDel: 0, canonOut: 0, canonProp: 0, embeds: 0, art: patch.art.length, touched: [],
              others: 0, kept: 0, look: patch.look ? 1 : 0, prev: {} };
  for (const n of Object.keys(patch.put)) {
    const rec = patch.put[n], was = byN.get(n);
    if (rec.k === 'i' && !have.has(rec.f) && !patch.art.some(a => a.id === rec.f)) throw bad(400, 'no-art', 'piece ' + n + ' is stamped from a tracing this wall has not got');
    if (!was) { c.adds++; if (rec.k === 'v' || rec.k === 'g') c.embeds++; if (!allowed(feats, rec.k)) c.kept++; c.prev[n] = null; c.touched.push(n); continue; }
    if (!isMod(me)) { if (was.c) rec.c = was.c; else delete rec.c; }
    if (was.by) rec.by = was.by; else delete rec.by;   // a piece keeps its first owner, whoever sends it back
    const ch = Object.keys(Object.assign({}, was, rec)).filter(k => JSON.stringify(was[k]) !== JSON.stringify(rec[k]));
    if (!ch.length) { delete patch.put[n]; continue; }
    const onlyMove = ch.every(k => MOVE_KEYS.has(k));
    if (onlyMove && ch.every(k => k === 'x' || k === 'y') && Math.abs(rec.x - was.x) < 2 && Math.abs(rec.y - was.y) < 2) { delete patch.put[n]; continue; }
    if (onlyMove) c.moves++;
    else { c.props++; if (was.c) c.canonProp++; if ((rec.k === 'v' && ch.includes('id')) || (rec.k === 'g' && ch.includes('u'))) c.embeds++; }
    if (was.c && rec.k !== was.k) c.canonDel++;   // one of the plates' pieces turned into something else is one of them gone
    if (was.c && outside(rec)) c.canonOut++;
    if (rec.k !== was.k && !allowed(feats, rec.k)) c.kept++;
    if (others && was.by !== me.id) c.others++;   // somebody else's (a seed piece is the wall's)
    c.prev[n] = was;
    c.touched.push(n);
  }
  patch.del = patch.del.filter(n => byN.has(n));
  for (const n of patch.del) { const was = byN.get(n); c.dels++; if (was.c) c.canonDel++; if (others && was.by !== me.id) c.others++; c.prev[n] = was; c.touched.push(n); }
  if (!c.touched.length && !patch.cam && !patch.look) throw bad(400, 'no-op', 'nothing in this edit changes the wall');
  const trusted = me.tier === 'trusted' || isMod(me);
  c.cls = 'small';
  if (c.moves > LINE.moveS || c.props + c.adds > LINE.propS || c.dels > LINE.delS || c.canonProp > 0 || c.embeds > (trusted ? 2 : 0) || c.art > (trusted ? 1 : 0)) c.cls = 'large';
  if (c.moves > LINE.moveL || c.props + c.adds > LINE.propL || c.dels > LINE.delL || c.canonDel > 0 || c.canonOut > 0 || c.canonProp > LINE.canonPropL || c.embeds > LINE.embedL || c.art > LINE.artL) c.cls = 'drastic';
  return c;
}
/* DECIDED BY THE PAGE'S CHAOS, then by who is asking (THREE LEVELS OF CHAOS,
   above): a moderator, the page's maker and a wild page take everything
   live; a council takes every non-keeper's patch to the ballot; a drastic
   patch is a motion (a newcomer's is refused); the day's footprint queues; a
   keeper is live; a non-keeper on a tended page is live only on pieces of
   their own, of the kinds the page allows, by the tier rules — anything else
   is a proposal in the queue. → live · queued · motion · no */
function decide(me, c, footprint, rules) {
  if (isMod(me) || rules.owner || rules.chaos === 3) return 'live';
  const keeper = rules.keeper, tier = me.tier;
  if (rules.chaos === 2 && !keeper) return 'motion';
  if (c.cls === 'drastic') return keeper || tier !== 'newcomer' ? 'motion' : 'no';
  if (footprint > CAP.footprint) return 'queued';
  if (keeper) return 'live';
  if (c.look || c.others || c.kept) return 'queued';
  if (c.cls === 'large') return tier === 'trusted' ? 'live' : 'queued';
  return tier === 'newcomer' ? 'queued' : 'live';
}

/* ── applying, and the write ────────────────────────────────────────────────
   A put replaces a piece in its place or lands at the end; a del takes one
   out; art the wall has not got is filed. What each touched piece WAS is
   kept with the revision — that is what a revert is made from. */
function applyPatch(doc, patch) {
  const prev = {}, items = [], putN = new Set(Object.keys(patch.put)), delN = new Set(patch.del);
  for (const it of doc.wall.items) {
    if (delN.has(it.n)) { prev[it.n] = it; continue; }
    if (putN.has(it.n)) { prev[it.n] = it; items.push(patch.put[it.n]); putN.delete(it.n); continue; }
    items.push(it);
  }
  putN.forEach(n => { prev[n] = null; items.push(patch.put[n]); });
  const have = new Set(doc.flatfile.list.map(t => t.id));
  const list = doc.flatfile.list.concat(patch.art.filter(t => !have.has(t.id)));
  const next = { rev: doc.rev + 1, cam: doc.cam, cam_narrow: doc.cam_narrow, wall: { items }, flatfile: { list } };
  if (patch.cam) next[patch.which === 'narrow' ? 'cam_narrow' : 'cam'] = patch.cam;
  const count = k => items.filter(it => it.k === k).length;
  if (items.length > CAP.items) throw bad(413, 'wall-full', 'the wall holds ' + CAP.items + ' pieces at most');
  if (count('v') > CAP.videos) throw bad(413, 'wall-full', 'the wall holds ' + CAP.videos + ' videos at most');
  if (count('g') > CAP.gifs) throw bad(413, 'wall-full', 'the wall holds ' + CAP.gifs + ' gifs at most');
  if (count('t') > CAP.notes) throw bad(413, 'wall-full', 'the wall holds ' + CAP.notes + ' notes at most');
  if (list.length > CAP.tracings) throw bad(413, 'wall-full', 'the wall holds ' + CAP.tracings + ' tracings at most');
  const json = JSON.stringify(next);
  if (json.length > CAP.doc) throw bad(413, 'wall-full', 'the wall would be bigger than ' + (CAP.doc >> 20) + ' MB');
  return { next, json, prev };
}
/* Did any revision after `from`, up to `to`, touch a piece this patch
   touches? Too far behind to ask cheaply is answered "yes": the sender
   rebases on the wall as it stands, which is what it would have done. */
async function overlaps(pg, patch, from, to) {
  if (to <= from) return false;
  if (to - from > 50) return true;
  const revs = [];
  for (let r = from + 1; r <= to; r++) revs.push(['GET', pg.revN(r)]);
  const mine = new Set(Object.keys(patch.put).concat(patch.del));
  return (await dbm(revs)).some(raw => { const e = raw && JSON.parse(raw); return !!e && Object.keys(e.put).concat(e.del).some(n => mine.has(n)); });
}
/* `stale`: what to do when the revision moved under the write. An edit
   ('check') goes on if none of the pieces it touches were among the ones
   that moved, and is 409 otherwise — the sender sees the wall as it stands
   and tries again. A moderator's apply ('retry') simply goes again. */
async function commit(pg, doc, patch, entry, stale) {
  for (let tries = 0; tries < 3; tries++) {
    const { next, json, prev } = applyPatch(doc, patch);
    const full = Object.assign({ rev: next.rev, at: Date.now(), put: patch.put, del: patch.del, prev }, entry);
    const ok = await db('EVAL', CAS, 4, pg.rev, pg.doc, pg.log, pg.revN(next.rev), String(doc.rev), json, JSON.stringify(summary(full)), JSON.stringify(full));
    if (ok === 1 || ok === '1') return { rev: next.rev, touched: Object.keys(patch.put).concat(patch.del) };
    const now = await loadDoc(pg);
    if (stale === 'check' && await overlaps(pg, patch, doc.rev, now.rev)) throw bad(409, 'stale', 'the wall has moved since this edit was made', { rev: now.rev, doc: now });
    doc = now;
  }
  throw bad(503, 'busy', 'the wall is busy — try again in a moment');
}
async function takeDays(u, n) {
  const days = (await db('SMEMBERS', K.days(u))).sort(), gone = days.slice(Math.max(0, days.length - n));
  if (gone.length) await db('SREM', K.days(u), ...gone);
}
// the pieces a revert touched are contested for a day; an edit touching one waits
async function contest(pg, ids) {
  if (!ids.length) return;
  const until = Date.now() + CONTESTED_HOURS * 3600e3, args = [];
  ids.forEach(n => args.push(until, n));
  await db('ZADD', pg.contested, ...args);
}
async function contested(pg, ids) {
  const now = Date.now();
  await db('ZREMRANGEBYSCORE', pg.contested, '-inf', now);
  const hot = new Set(await db('ZRANGEBYSCORE', pg.contested, now, '+inf'));
  return ids.some(n => hot.has(n));
}
async function credit(u, touched, standing) {   // the day's footprint, and — on the hill, when it is not wild — a standing day
  const fp = K.fp(u, today());
  const cmds = standing === false ? [] : [['SADD', K.days(u), today()]];
  if (touched.length) cmds.push(['SADD', fp, ...touched], ['EXPIRE', fp, 2 * 86400]);
  if (cmds.length) await dbm(cmds);
}

// ── the queue ─────────────────────────────────────────────────────────────
/* The queue swept: every motion with a close of its own whose close has
   come is settled, in the order it was filed; an edit nobody decided in
   QUEUE_DAYS lapses, a motion the council's clock never took among them;
   and on a council page the clock is kept (THE COUNCIL'S CLOCK): when it
   has come round, the motion with the most hearts goes up, the round is
   written down (last) and the next one set. A motion the clock was to
   decide, on a page that is a council no longer, falls to the keepers'
   queue. ponytail: timed things happen on reads; the clock comes round
   when somebody opens the ballot, the queue or one of its motions, and a
   page nobody looked at for three rounds has one motion go up, not three —
   a cron pinging ?queue is the upgrade. */
// …a drastic one wants MOTION_QUORUM of them to be in the running at all: one friend's heart does not take fifty pieces off a wall
const leads = eds => eds.map(e => Object.assign({ e }, tally(e))).filter(x => x.ayes >= (x.e.cls === 'drastic' ? MOTION_QUORUM : 1) && x.ayes > x.nays)
  .sort((a, b) => b.ayes - a.ayes || a.nays - b.nays || a.e.at - b.e.at)[0];
async function sweepQueue(pg) {
  const rules = await rulesOf(pg), now = Date.now(), round = rules.chaos === 2 && rules.closes > 0 && rules.closes <= now;
  const ids = await db('LRANGE', pg.queue, 0, -1);
  const raws = ids.length ? await dbm(ids.map(id => ['GET', K.edit(id)])) : [], cmds = [], count = { carried: 0, fell: 0, kept: 0 };
  const eds = raws.map(raw => raw && JSON.parse(raw)).filter(Boolean);
  for (const e of eds) {
    if (e.status !== 'motion' || e.tick) continue;
    const out = await settleMotion(e, VOTE, rules);
    if (out) count[out.status === 'live' ? 'carried' : out.status === 'rejected' ? 'fell' : 'kept']++;
  }
  if (round) {                               // the clock has come round: of the motions filed before it did, the one with the most hearts
    const up = leads(eds.filter(e => e.status === 'motion' && e.tick && e.at <= rules.closes));
    if (up) {
      const out = await applyEdit(up.e, VOTE, 'motion');
      count.carried++;
      await audit(VOTE.id, 'close', { edit: up.e.id, page: pg.slug, of: up.e.by, result: 'passed', ayes: up.ayes, nays: up.nays, skipped: out.skipped || undefined });
    }
  }
  const again = ids.length ? await dbm(ids.map(id => ['GET', K.edit(id)])) : [];
  let waiting = 0;
  again.forEach((raw, i) => {
    const id = ids[i], e = raw && JSON.parse(raw);
    if (!e) { cmds.push(['LREM', pg.queue, 0, id]); return; }
    if (e.status === 'motion' && e.tick && rules.chaos !== 2) { delete e.tick; e.status = 'queued'; e.queued = now; cmds.push(['SET', K.edit(id), JSON.stringify(e)]); return; }
    if (e.status === 'motion' && !e.tick) return;
    if (e.status !== 'queued' && e.status !== 'motion') { cmds.push(['LREM', pg.queue, 0, id], ['LREM', K.pending(e.by), 0, id]); return; }
    if (now - (e.queued || e.at) > QUEUE_DAYS * 86400e3) {
      e.status = 'expired';
      cmds.push(['SET', K.edit(id), JSON.stringify(e), 'EX', EDIT_DAYS * 86400], ['LREM', pg.queue, 0, id], ['LREM', K.pending(e.by), 0, id]);
    } else if (e.status === 'motion') waiting++;
  });
  if (rules.chaos === 2) {
    if (!rules.closes) cmds.push(['HSET', K.page(pg.slug), 'closes', String(now + rules.every * HOUR)]);
    else if (round) {
      let next = rules.closes;
      while (next <= now) next += rules.every * HOUR;
      cmds.push(['HSET', K.page(pg.slug), 'closes', String(next), 'last', JSON.stringify({ at: rules.closes, carried: count.carried, waiting })]);
    }
  }
  if (cmds.length) await dbm(cmds);
}
async function sweepPending(key) {           // a list of edit ids, kept to the ones still waiting
  const ids = await db('LRANGE', key, 0, -1);
  if (!ids.length) return [];
  const raws = await dbm(ids.map(id => ['GET', K.edit(id)])), cmds = [], live = [];
  raws.forEach((raw, i) => {
    const e = raw && JSON.parse(raw);
    if (!e || !(e.status === 'queued' || e.status === 'motion') || Date.now() - e.at > QUEUE_DAYS * 86400e3) cmds.push(['LREM', key, 0, ids[i]]);
    else live.push(ids[i]);
  });
  if (cmds.length) await dbm(cmds);
  return live;
}
const sweptAt = {};                           // a page's expiry sweep runs at most once a minute per instance: a read must not be a write —
async function sweepQueueSometimes(pg, rules) {   // except that a ballot whose close has come is counted on the very next read
  const due = rules && rules.chaos === 2 && rules.closes && rules.closes <= Date.now();
  if (!due && Date.now() - (sweptAt[pg.slug] || 0) < SWEEP_MS) return;
  sweptAt[pg.slug] = Date.now();
  await sweepQueue(pg);
}
// when the council's clock next comes round — set here if the page has none yet (a council from before it had a clock)
async function roundOf(pg, rules, now) {
  if (rules.closes > now) return rules.closes;
  let t = rules.closes || now + rules.every * HOUR;
  while (t <= now) t += rules.every * HOUR;
  if (!rules.closes) await db('HSET', K.page(pg.slug), 'closes', String(t));
  return t;
}
async function enqueue(pg, me, patch, c, req, status, rules, why) {
  const ip = ipHash(req);
  const mine = await sweepPending(K.pending(me.id)), here = await sweepPending(K.pendingIp(ip)), all = await db('LLEN', pg.queue);
  if (mine.length >= CAP.pending) throw bad(429, 'queue-full', 'you have ' + CAP.pending + ' edits waiting for a look already — wait for one of them');
  if (here.length >= CAP.pendingIp) throw bad(429, 'queue-full', 'this address has ' + CAP.pendingIp + ' edits waiting for a look already — wait for one of them');
  if (all >= CAP.queue) throw bad(503, 'queue-full', 'the queue is full for now — try again later');
  const id = newId(), now = Date.now();
  const rec = { id, page: pg.slug, by: me.id, name: me.tag || me.name, ip, at: now, base: patch.base, put: patch.put, del: patch.del, art: patch.art, cls: c.cls, status: status || 'queued', prev: c.prev, why };
  if (patch.look) rec.look = patch.look;
  // a motion on a council is the clock's to decide (tick) and carries no close of its own; anywhere else it is decided MOTION_HOURS on
  let round = 0;
  if (rec.status === 'motion') { rec.votes = {}; rec.voters = {}; if (rules.chaos === 2) { rec.tick = true; round = await roundOf(pg, rules, now); } else rec.closes = now + MOTION_HOURS * HOUR; }
  await dbm([['SET', K.edit(id), JSON.stringify(rec)], ['RPUSH', pg.queue, id], ['RPUSH', K.pending(me.id), id], ['RPUSH', K.pendingIp(ip), id], ['EXPIRE', K.pendingIp(ip), QUEUE_DAYS * 86400],
             ['HINCRBY', K.user(me.id), 'held', 1]]);
  // the first motion of a round rings the keepers' bells, once a round: told is the round it rang for
  if (rec.tick && rules.told !== round) {
    await db('HSET', K.page(pg.slug), 'told', String(round));
    for (const u of rules.keepers) if (u !== me.id) await tell(u, 'ballot', me.id, { slug: pg.slug, title: rules.title });
  }
  // an edit waiting for a look rings the bells of those who can give it one: the space's maker and keepers (TOEM 2 has none of its own)
  if (rec.status === 'queued') await tellKeepers(rules, me.id, 'waiting');
  return { id, closes: rec.tick ? round : rec.closes };
}
async function settle(ed, status, me, extra) {
  const was = ed.status;
  Object.assign(ed, { status, decided: { by: me.id, at: Date.now() } }, extra || {});
  if (status === 'live') ed.art = (ed.art || []).length;   // the tracings are on the wall now
  const cmds = [['SET', K.edit(ed.id), JSON.stringify(ed), 'EX', EDIT_DAYS * 86400], ['LREM', pageOfEdit(ed).queue, 0, ed.id], ['LREM', K.pending(ed.by), 0, ed.id]];
  if (ed.ip) cmds.push(['LREM', K.pendingIp(ed.ip), 0, ed.id]);
  if ((status === 'live' || status === 'rejected') && USER_RE.test(ed.by)) cmds.push(['HINCRBY', K.user(ed.by), status === 'live' ? 'okd' : 'rej', 1]);
  await dbm(cmds);
  // the proposer hears how it went: one note per thing they sent (a bounded bell)
  if ((was === 'queued' || was === 'motion') && (status === 'live' || status === 'rejected') && USER_RE.test(ed.by)) {
    const t = tally(ed), kind = was === 'motion' ? (status === 'live' ? 'passed' : 'failed') : (status === 'live' ? 'okd' : 'rej');
    await tell(ed.by, kind, USER_RE.test(me.id) ? me.id : ed.by, Object.assign({ slug: ed.page || HOME, title: await titleOf(ed.page), edit: ed.id },
      status === 'rejected' && was === 'queued' && ed.why ? { why: ed.why } : {}, was === 'motion' ? { ayes: t.ayes, nays: t.nays } : {}));
  }
}

// ── the ops ───────────────────────────────────────────────────────────────
async function opEdit(pg, req, res, me, body) {
  const rules = await rulesOf(pg, me);
  if (rules.chaos === 0 && !isMod(me) && !rules.owner) throw bad(403, 'read', 'this page is read-only — its maker alone draws on it');
  if (!(await editRateOk(me, rules))) throw bad(429, 'rate', 'that is a lot of edits in one hour — take a breath');
  const patch = cleanPatch(body, me);
  if (patch.look && pg.slug === HOME) delete patch.look;   // TOEM 2's sign is nobody's to change
  const doc = await loadDoc(pg);
  if (patch.base !== doc.rev) {              // behind — but on pieces nobody else has touched since, it goes on as it stands
    if (patch.base > doc.rev || await overlaps(pg, patch, patch.base, doc.rev)) throw bad(409, 'stale', 'the wall has moved since this edit was made', { rev: doc.rev, doc });
    patch.base = doc.rev;
  }
  const c = classify(patch, doc, me, rules.feats);
  const foot = isMod(me) || rules.chaos === 3 ? 0 : await db('SCARD', K.fp(me.id, today()));
  let to = decide(me, c, foot + c.touched.length, rules);
  let why = to === 'motion' ? (c.cls === 'drastic' ? reason(c) : 'council')
          : foot + c.touched.length > CAP.footprint ? 'footprint'
          : !rules.keeper && c.others ? 'others' : !rules.keeper && c.kept ? 'keeper' : !rules.keeper && c.look ? 'look' : c.cls;
  if (to === 'no') throw bad(400, 'drastic', 'this edit is drastic (' + reason(c) + ') — that takes standing here, or a moderator');
  if (to === 'live' && !isMod(me) && rules.chaos !== 3 && await contested(pg, c.touched)) { to = 'queued'; why = 'contested'; }
  if (to !== 'live') {
    const q = await enqueue(pg, me, patch, c, req, to, rules, why);
    return answer(res, 200, Object.assign({ ok: true, status: to, edit: q.id, cls: c.cls, why }, q.closes ? { closes: q.closes } : {}));
  }
  const id = newId(), name = me.tag || me.name;
  const r = await commit(pg, doc, patch, { edit: id, by: me.id, name, how: 'live', cls: c.cls, art: patch.art.length, look: patch.look }, 'check');
  await dbm([['SET', K.edit(id), JSON.stringify({ id, page: pg.slug, by: me.id, name, at: Date.now(), base: patch.base, put: patch.put, del: patch.del, art: patch.art.length, cls: c.cls, status: 'live', rev: r.rev, look: patch.look }), 'EX', EDIT_DAYS * 86400],
             ['HINCRBY', K.user(me.id), 'live', 1]]);
  await applyLook(pg, patch.look);
  await credit(me.id, r.touched, pg.slug === HOME && rules.chaos !== 3);
  answer(res, 200, { ok: true, status: 'live', rev: r.rev, edit: id, cls: c.cls });
}
const reason = c => [c.canonDel && c.canonDel + ' of the plates\' own pieces deleted', c.canonOut && c.canonOut + ' pushed off the plates',
                     c.moves > LINE.moveL && c.moves + ' moves', c.dels > LINE.delL && c.dels + ' deletes', c.props + c.adds > LINE.propL && (c.props + c.adds) + ' changes',
                     c.embeds > LINE.embedL && c.embeds + ' embeds', c.art > LINE.artL && c.art + ' tracings'].filter(Boolean).join(', ') || 'too much at once';

async function opReview(req, res, me, body) {
  const id = String(body.edit || ''), what = body.do;
  if (!EDIT_RE.test(id) || !['approve', 'reject'].includes(what)) throw bad(400, 'review', 'review wants an edit id, and approve or reject');
  const raw = await db('GET', K.edit(id));
  if (!raw) throw bad(404, 'edit', 'no such edit');
  const ed = JSON.parse(raw);
  if (ed.status !== 'queued' && ed.status !== 'motion') throw bad(409, 'decided', 'that edit is already ' + ed.status);
  const rules = await rulesOf(pageOfEdit(ed), me), motion = ed.status === 'motion';
  if (!isMod(me) && !rules.owner) {
    if (!rules.keeper) throw bad(403, 'role', 'the queue is for the moderators to decide');
    if (ed.cls === 'drastic' || motion) throw bad(403, 'role', 'a drastic edit is decided by a vote, or by a moderator');
    if (ed.by === me.id) throw bad(403, 'self', 'not your own edit');
    if (ed.ip && ed.ip === ipHash(req)) throw bad(403, 'self', 'not an edit from your own address');
  }
  let out;
  if (what === 'reject') { await settle(ed, 'rejected', me, { why: text(body.why, CAP.why) }); out = { status: 'rejected', edit: id }; }
  else out = Object.assign({ edit: id }, await applyEdit(ed, me, motion ? 'fiat' : 'approved'));
  await db('HINCRBY', K.user(me.id), 'rvw', 1);
  await audit(me.id, 'review', { edit: id, page: ed.page || HOME, of: ed.by, do: what, how: motion ? (what === 'approve' ? 'fiat' : 'veto') : what,
                                 why: what === 'reject' ? ed.why || undefined : undefined, skipped: out.skipped || undefined });
  answer(res, 200, Object.assign({ ok: true }, out));
}
/* A queued edit, put on the wall as it stands now — by the revert's rule: a
   piece changed, deleted or added since the edit was made (prev, kept with
   the edit) is left as it is now and counted as skipped; art already there
   is not doubled; and nothing left to do is still a decision. An edit from
   before prev was kept goes on as it stands. */
async function applyEdit(ed, me, how) {
  const pg = pageOfEdit(ed), doc = await loadDoc(pg);
  const patch = { base: doc.rev, put: JSON.parse(JSON.stringify(ed.put)), del: ed.del.slice(), art: ed.art || [] };
  if (ed.look) patch.look = ed.look;
  let skipped = 0;
  if (ed.prev) {
    const byN = new Map(doc.wall.items.map(it => [it.n, it]));
    const same = n => { const a = byN.get(n), b = ed.prev[n]; return !a && !b ? true : !!a && !!b && canon(a) === canon(b); };
    Object.keys(patch.put).forEach(n => { if (n in ed.prev && !same(n)) { delete patch.put[n]; skipped++; } });
    patch.del = patch.del.filter(n => { if (n in ed.prev && !same(n)) { skipped++; return false; } return true; });
  }
  let c;
  try { c = classify(patch, doc, me); }
  catch (e) {                                // everything it did has been done, or undone, since: nothing left to apply
    if (!(e instanceof Bad && e.code === 'no-op')) throw e;
    await applyLook(pg, patch.look);
    await settle(ed, 'live', me, { rev: doc.rev, nothing: true, skipped });
    return { status: 'live', rev: doc.rev, nothing: true, skipped };
  }
  const r = await commit(pg, doc, patch, { edit: ed.id, by: ed.by, name: ed.name, how, via: me.id, cls: ed.cls, art: patch.art.length, look: patch.look, skipped: skipped || undefined }, 'retry');
  await applyLook(pg, patch.look);
  await settle(ed, 'live', me, { rev: r.rev, skipped });
  if (how === 'motion') await db('HINCRBY', K.user(ed.by), 'won', 1);
  const rules = await rulesOf(pg);
  await credit(ed.by, r.touched, pg.slug === HOME && rules.chaos !== 3);
  return { status: 'live', rev: r.rev, cls: c.cls, skipped };
}

// ── motions ───────────────────────────────────────────────────────────────
const tally = ed => { let ayes = 0, nays = 0; Object.values(ed.votes || {}).forEach(v => (v ? ayes++ : nays++)); return { ayes, nays }; };
/* A vote takes a standing day (or a moderator), is not the proposer's nor
   from the proposer's address, and lands under a five-second lock on its
   motion, so two at once do not lose one; a vote after the close is 409,
   and the close is settled there and then. One per address: the later
   voter's counts. A first vote is counted on the account; changing it is
   not. A HEART is the same mark made another way (THE COUNCIL'S CLOCK, AND
   HEARTS): on a motion an aye, or — taken back — no vote at all; on an edit
   that waits for the keepers, a heart that decides nothing, which anybody
   signed in gives. `v` is 1 aye · 0 nay · null taken back. */
async function mark(req, me, id, v) {
  const raw0 = await db('GET', K.edit(id));
  if (!raw0) throw bad(404, 'edit', 'no such edit');
  const ed0 = JSON.parse(raw0), pg = pageOfEdit(ed0), ip = ipHash(req);
  let rules = await rulesOf(pg, me);
  if (ed0.tick && ed0.status === 'motion') await sweepQueueSometimes(pg, rules);   // the clock may have come round: that is settled first, and what is marked is what is left
  const open = e => e.status === 'motion' || (e.status === 'queued' && v !== 0);   // a nay is a vote, and only a motion is voted on
  const shut = e => bad(409, 'decided', 'that edit is ' + e.status + ', not up for a vote');
  if (!open(ed0)) throw shut(ed0);
  if (ed0.by === me.id) throw bad(403, 'self', ed0.status === 'motion' ? 'not on your own motion' : 'not on your own edit');
  if (ed0.ip && ed0.ip === ip) throw bad(403, 'self', 'not on an edit sent from your own address');
  const vote = ed0.status === 'motion';       // a mark on a motion is a vote, and takes what a vote takes
  if (vote) if (me.watched || !(isMod(me) || me.tier === 'trusted' || me.rep >= 1)) throw bad(403, 'role', 'voting takes a standing day on the hill — one day of edits on TOEM 2');
  if (ed0.status === 'motion' && !ed0.tick && ed0.closes && Date.now() >= ed0.closes) { await settleMotion(ed0, VOTE, rules); throw bad(409, 'closed', 'that ballot has closed — it is being counted'); }
  if (!(await db('SET', K.lock(id), '1', 'NX', 'EX', LOCK_S))) throw bad(503, 'busy', 'another ballot is landing on that motion — try again');
  let ed;
  try {
    ed = JSON.parse(await db('GET', K.edit(id)));
    if (!open(ed)) throw shut(ed);
    ed.votes = ed.votes || {}; ed.voters = ed.voters || {};
    const prior = ed.voters[ip], first = ed.votes[me.id] === undefined && v !== null;
    if (prior && prior !== me.id) delete ed.votes[prior];   // one vote per address: the later voter's is the one that counts
    if (v === null) { delete ed.votes[me.id]; if (ed.voters[ip] === me.id) delete ed.voters[ip]; }
    else { ed.voters[ip] = me.id; ed.votes[me.id] = v; }
    await dbm([['SET', K.edit(id), JSON.stringify(ed)]].concat(first && ed.status === 'motion' ? [['HINCRBY', K.user(me.id), 'votes', 1]] : []));
  } finally { await db('DEL', K.lock(id)); }
  const out = ed.status === 'motion' ? await settleMotion(ed, me, rules) : null;
  if (ed.tick) rules = await rulesOf(pg, me);
  return Object.assign({ ok: true, edit: id, closes: ed.tick ? rules.closes : ed.closes }, tally(ed), out || { status: ed.status });
}
async function opVote(req, res, me, body) {
  const id = String(body.edit || '');
  if (!EDIT_RE.test(id) || typeof body.aye !== 'boolean') throw bad(400, 'vote', 'vote wants an edit id, and aye true or false');
  answer(res, 200, Object.assign(await mark(req, me, id, body.aye ? 1 : 0), { mine: body.aye ? 1 : 0 }));
}
async function opHeart(req, res, me, body) {
  const id = String(body.edit || '');
  if (!EDIT_RE.test(id) || (body.on != null && typeof body.on !== 'boolean')) throw bad(400, 'heart', 'a heart wants an edit id, and on true or false');
  const out = await mark(req, me, id, body.on === false ? null : 1);
  answer(res, 200, Object.assign(out, { hearts: out.ayes, hearted: body.on !== false }));
}
/* Decided at its close, and not before: with three or more voters, a
   simple majority passes it and anything else (a tie included) rejects it;
   with fewer, it falls to the keepers' queue, drastic as it is. Called
   after every vote, whenever a motion is read, and by the sweep. Every
   close goes on the record. */
async function settleMotion(ed, me, rules) {
  const out = await closeMotion(ed, me, rules || await rulesOf(pageOfEdit(ed)));
  if (out) await audit(VOTE.id, 'close', Object.assign({ edit: ed.id, page: ed.page || HOME, of: ed.by, result: out.status === 'live' ? 'passed' : out.status }, tally(ed)));
  return out;
}
async function closeMotion(ed, me) {
  const { ayes, nays } = tally(ed), total = ayes + nays;
  if (ed.tick) return null;                   // the council's clock decides it, among the others (sweepQueue)
  if (Date.now() < (ed.closes || ed.at + MOTION_HOURS * 3600e3)) return null;
  if (total >= MOTION_QUORUM && ayes > nays) return applyEdit(ed, me, 'motion');
  if (total >= MOTION_QUORUM) { await settle(ed, 'rejected', me, { why: 'the vote: ' + ayes + ' for, ' + nays + ' against' }); return { status: 'rejected', why: 'the vote' }; }
  ed.status = 'queued'; ed.queued = Date.now();   // no quorum: a keeper decides (the queue keeps it, drastic as it is; its week starts now)
  await db('SET', K.edit(ed.id), JSON.stringify(ed));
  return { status: 'queued', why: 'no quorum' };
}

// a strike on a moderator's revision is the admin's to give, and nobody strikes the admin
async function strikable(pg, rev, me) {
  const raw = await db('GET', pg.revN(rev));
  if (!raw) throw bad(404, 'rev', 'no such revision');
  const by = JSON.parse(raw).by;
  if (!by || !USER_RE.test(by)) return;
  const role = await db('HGET', K.user(by), 'role');
  if (role === 'admin' || (role === 'mod' && me.role !== 'admin')) throw bad(403, 'role', 'that revision is a moderator\'s — only the admin strikes those');
}
/* A revert is the inverse patch: every piece the revision wrote goes back to
   what it was, every piece it took off comes back, every piece it put up
   goes — for the pieces still as that revision left them. One changed since
   is left alone and counted. Through the same classifier as any edit, so a
   newcomer cannot undo a large one; a moderator's goes straight on. */
async function revertRev(pg, rev, me, how, strike, req) {
  const raw = await db('GET', pg.revN(rev));
  if (!raw) throw bad(404, 'rev', 'no such revision');
  const was = JSON.parse(raw);
  if (was.how === 'seed') throw bad(400, 'rev', 'revision 1 is the shipped wall');
  const doc = await loadDoc(pg);
  const byN = new Map(doc.wall.items.map(it => [it.n, it]));
  const put = {}, del = [];
  let skipped = 0;
  for (const n of Object.keys(was.prev)) {
    const before = was.prev[n], after = was.put[n], now = byN.get(n);
    if (after ? (!now || canon(now) !== canon(after)) : !!now) { skipped++; continue; }
    if (before) put[n] = before; else del.push(n);
  }
  const patch = { base: doc.rev, put, del, art: [] };
  const rules = await rulesOf(pg, me);
  if (rules.chaos === 0 && !isMod(me) && !rules.owner) throw bad(403, 'read', 'this page is read-only — its maker alone draws on it');
  let c;
  try { c = classify(patch, doc, me, rules.feats); }
  catch (e) {
    if (!(e instanceof Bad && e.code === 'no-op')) throw e;
    if (strike && was.by && USER_RE.test(was.by)) {                        // already undone by somebody: the strike still counts
      await penalise(was.by, me.id);
      if (was.via && USER_RE.test(was.via) && was.via !== was.by) await takeDays(was.via, APPROVER_COST);
    }
    return { rev: doc.rev, skipped, nothing: true, by: was.by };
  }
  if (!isMod(me) && !rules.owner) {
    let to = decide(me, c, 0, rules), why = to === 'motion' ? reason(c) : !rules.keeper && c.others ? 'others' : c.cls;
    if (to === 'live' && rules.chaos !== 3 && await contested(pg, c.touched)) { to = 'queued'; why = 'contested'; }   // the edit war's second round waits
    if (to !== 'live') {
      if (to === 'no') throw bad(400, 'drastic', 'undoing that is a drastic edit — ask a moderator');
      const q = await enqueue(pg, me, patch, c, req, to, rules, why);
      return { queued: q.id, status: to, why, cls: c.cls, skipped, by: was.by, closes: q.closes };
    }
  }
  const r = await commit(pg, doc, patch, { edit: newId(), by: me.id, name: me.tag || me.name, how, of: rev, cls: c.cls }, 'retry');
  await contest(pg, r.touched);
  const cmds = [['HINCRBY', K.user(me.id), 'rvs', 1]];
  if (was.by && USER_RE.test(was.by) && was.by !== me.id) cmds.push(['HINCRBY', K.user(was.by), 'rvd', 1]);
  await dbm(cmds);
  if (strike && was.by && USER_RE.test(was.by)) {
    await penalise(was.by, me.id);
    if (was.via && USER_RE.test(was.via) && was.via !== was.by) await takeDays(was.via, APPROVER_COST);   // whoever waved it through
  }
  return { rev: r.rev, skipped, by: was.by };
}
async function penalise(u, by) {
  const [rec, days] = await dbm([['HGETALL', K.user(u)], ['SMEMBERS', K.days(u)]]);
  const shielded = rec.role === 'mod' || rec.role === 'admin';   // strikes count, days go, but a moderator is not banned by a strike
  const keep = Math.max(0, Math.min(days.length - STRIKE, 2));   // rep = min(rep − 5, 2): the newest days come off
  const gone = days.sort().slice(keep);
  const now = Date.now(), struck = (() => { try { return JSON.parse(rec.struck || '[]'); } catch (e) { return []; } })().filter(t => now - t < STRIKE_DAYS * 86400e3);
  struck.push(now);
  const sets = ['struck', JSON.stringify(struck), 'strikes', String(struck.length)], banning = struck.length >= STRIKES_BAN && !shielded;
  if (banning) sets.push('banned', '1');
  const cmds = [['HSET', K.user(u), ...sets]];
  if (gone.length) cmds.push(['SREM', K.days(u), ...gone]);
  await dbm(cmds);
  if (banning) await audit(by || VOTE.id, 'ban', { user: u, strikes: struck.length, auto: true });
}
async function opRevert(pg, req, res, me, body, strike) {
  const rev = Math.floor(+body.rev);
  if (!(rev > 1)) throw bad(400, 'rev', 'revert wants a revision number');
  if (strike && !isMod(me)) throw bad(403, 'role', 'a strike is a moderator\'s');
  const rules = await rulesOf(pg, me);
  if (!isMod(me) && !rules.keeper && me.tier === 'newcomer') throw bad(403, 'role', 'reverting takes standing here — three days of edits');
  if (strike && rules.chaos === 3) throw bad(400, 'wild', 'on a wild wall a revert is a revert — there are no strikes here');
  if (strike) await strikable(pg, rev, me);
  const r = await revertRev(pg, rev, me, (strike ? 'strike' : 'revert') + ':' + rev, strike, req);
  await audit(me.id, strike ? 'strike' : 'revert', { page: pg.slug, rev, of: r.by, status: r.queued ? r.status : 'live', skipped: r.skipped || undefined, nothing: r.nothing || undefined });
  answer(res, 200, Object.assign({ ok: true, status: r.queued ? r.status : 'live' }, r));
}
/* Everything one person put up since a revision, taken back down in one
   go, newest first — so a chain of moves to one piece unwinds in order. */
async function opUndo(pg, req, res, me, body) {
  if (!isMod(me)) throw bad(403, 'role', 'undoing a person is a moderator\'s');
  const u = String(body.user || ''), since = Math.max(2, Math.floor(+body.since) || 2);
  if (!USER_RE.test(u)) throw bad(400, 'user', 'undo wants a user id');
  const role = await db('HGET', K.user(u), 'role');
  if (role === 'admin' || (role === 'mod' && me.role !== 'admin')) throw bad(403, 'role', 'that is a moderator\'s work — only the admin undoes those');
  if (body.strike && (await rulesOf(pg)).chaos === 3) throw bad(400, 'wild', 'on a wild wall a revert is a revert — there are no strikes here');
  const log = (await db('LRANGE', pg.log, 0, LOG_KEEP - 1)).map(s => JSON.parse(s));
  const all = log.filter(e => e.by === u && e.rev >= since && (e.how === 'live' || e.how === 'approved' || e.how === 'motion' || e.how === 'fiat')).map(e => e.rev);
  const revs = all.slice(0, UNDO_MAX);        // the newest so many; the rest on the next press
  let done = 0, skipped = 0;
  for (const rev of revs) { const r = await revertRev(pg, rev, me, 'undo:' + u + ':' + rev, false, req); if (!r.nothing) done++; skipped += r.skipped; }
  if (body.strike) await penalise(u, me.id);
  await audit(me.id, 'undo', { page: pg.slug, user: u, since, reverted: done, of: all.length, skipped: skipped || undefined, strike: body.strike ? true : undefined });
  answer(res, 200, { ok: true, reverted: done, of: all.length, more: all.length - revs.length, skipped });
}
async function opRole(req, res, me, body) {
  const u = String(body.user || '');
  if (!USER_RE.test(u)) throw bad(400, 'user', 'role wants a user id');
  const rec = await db('HGETALL', K.user(u));
  if (!Object.keys(rec).length) throw bad(404, 'user', 'no such user');
  const theirs = ROLES.includes(rec.role) ? rec.role : 'user', sets = [];
  if (body.role != null) {
    if (me.role !== 'admin') throw bad(403, 'role', 'only the admin appoints');
    if (!ROLES.includes(body.role)) throw bad(400, 'role', 'no such role');
    if (body.role === 'admin') throw bad(403, 'role', 'admin is ADMIN_EMAILS\' to give, not this door\'s');
    if (theirs === 'admin' && u !== me.id) throw bad(403, 'role', 'an admin is not yours to change');
    sets.push('role', body.role);
  }
  if (body.banned != null) {
    if (!isMod(me)) throw bad(403, 'role', 'banning is a moderator\'s');
    if (theirs === 'admin' || (theirs === 'mod' && me.role !== 'admin')) throw bad(403, 'role', 'a moderator is not yours to ban');
    sets.push('banned', body.banned ? '1' : '0');
    if (!body.banned) sets.push('struck', '[]', 'strikes', '0');   // a ban lifted clears the strikes that made it
  }
  if (body.watch != null) {                    // watched: a newcomer wherever it goes, until a moderator says otherwise
    if (!isMod(me)) throw bad(403, 'role', 'watching is a moderator\'s');
    if (theirs === 'admin' || (theirs === 'mod' && me.role !== 'admin')) throw bad(403, 'role', 'a moderator is not yours to watch');
    sets.push('watch', body.watch ? '1' : '0');
  }
  if (!sets.length) throw bad(400, 'role', 'role wants a role, banned, or watch');
  await db('HSET', K.user(u), ...sets);
  await audit(me.id, 'role', { user: u, role: body.role != null ? body.role : undefined, banned: body.banned != null ? !!body.banned : undefined, watch: body.watch != null ? !!body.watch : undefined });
  answer(res, 200, { ok: true, user: u, role: body.role != null ? body.role : theirs, banned: body.banned != null ? !!body.banned : rec.banned === '1', watched: body.watch != null ? !!body.watch : rec.watch === '1' });
}
/* ── SPACES (2026-09-23) ──────────────────────────────────────────────────
   A page is anybody's to make now, at /yard/new/ ("Create a space"): two an
   account, and a moderator's are not counted. It lives at knoll.space/<slug>
   — vercel.json and serve.js hand every one-word address the site has no
   file for to space.html, which asks ?space= for it — so a slug may not be a
   word the site already answers at (RESERVED; a file there would win). Its
   look rides on its record: the paper, the inks, who may edit and which
   tools (those two are the form's COMING LATER and PLACEHOLDERS, kept as
   chosen), and a picture checked like an account's (A PICTURE).
   THE RULES (2026-09-24) ride on the same record: chaos, period, closes and
   feats (THREE LEVELS OF CHAOS) — set with the page, or after it with op
   settings by its maker or a moderator; TOEM 2's are the moderators' to set
   and live in a settings-only page:toem2 hash that has no made, so
   everything that treats the first page by name still does. rulesOf() is
   what every edit, review, vote and revert asks first.
   ponytail: RESERVED is a list — a new top-level folder is a word here; and
   a space is not renamed or taken down yet; 'read' (yours alone) is one
   branch at the top of decide() when it is wanted. */
const SPACES_MAX = 3;                         // three since 2026-09-25 (the yard's YOUR SPACES row holds three); two before
const RESERVED = new Set(['404', 'api', 'apps-script', 'auth', 'coming-soon', 'dashboard', 'features', 'fonts', 'ironhive', 'lab', 'lab2',
                          'login', 'logo', 'posters', 'privacy', 'settings', 'signup', 'terms', 'uploads', 'vendor', 'yard', 'yardview']);
// the form's four papers (yard/new/: PALETTES, keep in step), which space.html and the yard's hills draw with —
// and TOEM 2's own (2026-09-28): the bench as it has always stood, which is what the first page wears until its maker picks another
const PAPERS = {
  yard:   { paper: '#fdf7e3', ink: '#17120b', card: '#fffcf0', line: '#d9cdb0', mute: '#4a4054', accent: '#e8484a' },
  knoll:  { paper: '#faf7f9', ink: '#26212a', card: '#fdfbfd', line: '#e2d4df', mute: '#8b7f92', accent: '#c93b82' },
  bench:  { paper: '#efe7ed', ink: '#2e2636', card: '#fdfbfd', line: '#e2d4df', mute: '#8b7f92', accent: '#f59321' },
  sticky: { paper: '#ffe27a', ink: '#26212a', card: '#fff4c2', line: '#d9bd55', mute: '#5a5140', accent: '#c93b82' },
  toem2:  { paper: '#efe7ed', ink: '#26212a', card: '#fdfbfd', line: '#e2d4df', mute: '#8b7f92', accent: '#c93b82' }
};
// a page's name and its paper, as its record has them — the first page's are TOEM 2 and its own paper until its maker says otherwise (settings/)
const nameIn = (slug, p) => (p && p.title) || (slug === HOME ? 'TOEM 2' : slug);
const paperIn = (slug, p) => (p && PAPERS[p.palette] ? p.palette : slug === HOME ? 'toem2' : 'yard');
const MODS = ['open', 'friends', 'approve', 'read'];
const listOf = s => { try { const v = JSON.parse(s || '[]'); return Array.isArray(v) ? v : []; } catch (e) { return []; } };
const featsOf = v => { const f = FEATS_DEFAULT.slice(); if (Array.isArray(v)) v.slice(0, 6).forEach((x, i) => { f[i] = !!x; }); return f; };   // six switches, the missing ones as shipped
function lookOf(body) {                        // what a post says the space looks like, cut to what the form offers
  const inks = Array.isArray(body.inks) ? body.inks.filter(c => typeof c === 'string' && /^#[0-9a-f]{6}$/i.test(c)).map(c => c.toLowerCase()) : [];
  const out = { palette: PAPERS[body.palette] ? body.palette : 'yard', inks: JSON.stringify([...new Set(inks)].slice(0, 10)),
                mod: MODS.includes(body.mod) ? body.mod : 'open', feats: JSON.stringify(Array.isArray(body.feats) ? featsOf(body.feats) : FEATS_DEFAULT),
                pic: cleanPic(body.pic) };
  if (body.chaos != null) out.chaos = String(CHAOS.includes(+body.chaos) ? +body.chaos : CHAOS_DEFAULT);
  if (body.every != null) out.every = String(EVERY.includes(+body.every) ? +body.every : EVERY_DEFAULT);
  return out;
}
const chaosOf = p => ({ chaos: CHAOS.includes(+p.chaos) ? +p.chaos : CHAOS_DEFAULT, every: EVERY.includes(+p.every) ? +p.every : EVERY_DEFAULT,
                        closes: numOf(p.closes), told: numOf(p.told), last: (() => { try { return p.last ? JSON.parse(p.last) : null; } catch (e) { return null; } })() });
const spaceOf = (slug, p) => Object.assign({ slug, title: nameIn(slug, p), by: p.by || '', made: +p.made || 0, given: numOf(p.given), palette: paperIn(slug, p),
  inks: listOf(p.inks), mod: p.mod || 'open', feats: featsOf(listOf(p.feats)), pic: p.pic || '' }, PAPERS[paperIn(slug, p)],
  (({ chaos, every, closes }) => ({ chaos, every, closesAt: closes }))(chaosOf(p)));
/* THE RULES of a page, as every op asks them: its chaos, period and next close, the six kind switches, its keepers — the maker,
   then the invited who are still their friends; on TOEM 2 the trusted — and whether the one asking is the maker (owner) or a
   keeper. A watched account keeps nothing. THE MASTER is the maker of every page (owner), TOEM 2 included, and TOEM 2 has a
   maker of its own once it has been handed on. ponytail: one HGETALL and one SMEMBERS per edit. */
async function rulesOf(pg, me) {
  const slug = pg.slug, [p, invited] = await dbm([['HGETALL', K.page(slug)], ['SMEMBERS', K.invited(slug)]]);
  const by = p.by && USER_RE.test(p.by) ? p.by : '';
  // the keepers: the maker and whoever they invited — a friend or not, since 2026-09-24 (settings: WHO CAN EDIT adds anyone by name)
  const keepers = (by ? [by] : []).concat(invited.filter(u => u !== by));
  const owner = !!me && ((!!by && by === me.id) || master(me));
  const keeper = owner || (!!me && !me.watched && (isMod(me) || keepers.includes(me.id) || (slug === HOME && me.tier === 'trusted')));
  return Object.assign({ page: slug, by, keepers, owner, keeper, master: master(me), feats: featsOf(listOf(p.feats)),
                         title: nameIn(slug, p), palette: paperIn(slug, p),
                         inks: listOf(p.inks) }, chaosOf(p));   // the inks: the only colours the dock offers there; none = every colour
}
function cleanLook(v) {                        // a look a patch or a settings post proposes: the sign's words, the paper, the inks — nothing else
  if (!v || typeof v !== 'object' || Array.isArray(v)) return undefined;
  const out = {};
  if (v.title != null) { const t = text(v.title, 60); if (t) out.title = t; }
  if (v.palette != null && PAPERS[v.palette]) out.palette = v.palette;
  if (Array.isArray(v.inks)) out.inks = lookOf({ inks: v.inks }).inks;
  return Object.keys(out).length ? out : undefined;
}
async function applyLook(pg, look) { if (look && pg.slug !== HOME) await db('HSET', K.page(pg.slug), ...Object.entries(look).flat()); }   // ponytail: a revert does not undo a look; settings puts it back
async function opSettings(pg, req, res, me, body) {
  const slug = pg.slug, p = await db('HGETALL', K.page(slug));
  if (!(isMod(me) || (!!p.by && p.by === me.id))) throw bad(403, 'owner', 'the rules here are the maker\'s');   // TOEM 2's too, once it has one (THE MASTER)
  const was = chaosOf(p), sets = [], said = {};
  if (body.chaos != null) { if (!CHAOS.includes(+body.chaos)) throw bad(400, 'chaos', 'chaos is 0 (read-only), 1 (tended), 2 (council) or 3 (wild)'); said.chaos = +body.chaos; sets.push('chaos', String(said.chaos)); }
  if (body.every != null) { if (!EVERY.includes(+body.every)) throw bad(400, 'every', 'the ballot\'s clock comes round every ' + EVERY.slice(0, -1).join(', ') + ' or ' + EVERY[EVERY.length - 1] + ' hours'); said.every = +body.every; sets.push('every', String(said.every)); }
  if (Array.isArray(body.feats)) { said.feats = featsOf(body.feats); sets.push('feats', JSON.stringify(said.feats)); }
  /* THE FIRST PAGE'S LOOK (2026-09-28): TOEM 2's name, paper and inks are set like any page's — by its maker or the master, and
     not by the moderators, whose part of its settings is the rules. Until somebody does, it is TOEM 2 on its own paper. */
  const look = cleanLook(body);
  if (look && slug === HOME && !(master(me) || (!!p.by && p.by === me.id))) throw bad(403, 'owner', 'TOEM 2\'s name and colours are its maker\'s');
  if (look) { said.look = look; sets.push(...Object.entries(look).flat()); }
  if (slug !== HOME && body.pic != null) {      // the page's picture: a 128-pixel JPEG (A PICTURE), or none
    const pic = body.pic === '' ? '' : cleanPic(body.pic);
    if (body.pic !== '' && !pic) throw bad(400, 'pic', 'the picture is not one the form makes');
    said.pic = pic ? 'set' : 'none'; sets.push('pic', pic);
  }
  if (!sets.length) throw bad(400, 'settings', 'settings wants a chaos, how often the ballot\'s clock comes round, feats, or a look');
  const chaos = said.chaos != null ? said.chaos : was.chaos, every = said.every || was.every;
  // the clock starts when the page becomes a council, and starts again when how often it comes round is changed
  if (chaos === 2 && (!was.closes || was.chaos !== 2 || (said.every && said.every !== was.every))) { said.closes = Date.now() + every * HOUR; sets.push('closes', String(said.closes)); }
  await db('HSET', K.page(slug), ...sets);
  await audit(me.id, 'settings', Object.assign({ page: slug }, said));
  answer(res, 200, { ok: true, rules: await rulesOf(pg, me) });
}
async function opPage(req, res, me, body) {
  const slug = String(body.slug || '').toLowerCase(), title = text(body.title, 60) || slug, now = Date.now(), mine = K.spaces(me.id), counted = !isMod(me);
  const full = () => bad(409, 'full', 'you can only have ' + SPACES_MAX + ' spaces per account');
  if (!SLUG_RE.test(slug)) throw bad(400, 'slug', 'a page is named in lower-case letters, numbers and dashes — 32 at most');
  if (counted && (await db('SCARD', mine)) >= SPACES_MAX) throw full();
  if (slug === HOME || RESERVED.has(slug) || !(await db('HSETNX', K.page(slug), 'made', String(now)))) throw bad(409, 'taken', 'there is a page called that already');
  await db('SADD', mine, slug);
  // counted again once claimed: two made at once, both past the count, and neither stands
  if (counted && (await db('SCARD', mine)) > SPACES_MAX) { await dbm([['SREM', mine, slug], ['DEL', K.page(slug)]]); throw full(); }
  const look = lookOf(body);
  if (look.chaos === '2') look.closes = String(now + (+look.every || EVERY_DEFAULT) * HOUR);
  await dbm([['HSET', K.page(slug), 'title', title, 'kind', 'wall', 'by', me.id, ...Object.entries(look).flat()], ['ZADD', K.pages, now, slug]]);
  await audit(me.id, 'page', { page: slug, title });
  answer(res, 200, { ok: true, page: spaceOf(slug, Object.assign({ made: now, title, by: me.id }, look)) });
}
/* ── THE MASTER, AND A PAGE HANDED ON (2026-09-27) ────────────────────────
   THE MASTER is the admin — ADMIN_EMAILS', so an address Google or Discord
   has proved. On every page, TOEM 2 included, it stands where the page's
   maker stands: rulesOf() answers `owner` for it, and the doors that ask
   whose a page is (settings here, invite and uninvite in api/friends.js) let
   it through. It makes pages like anybody (op page, uncounted) and they are
   its own until it hands them on.
   A PAGE IS HANDED ON WITH A CODE. The master asks for one (op handoff) and
   sends it, by whatever road, to the gnome who is to have the page; they
   type it into the yard's settings (op claim) and the page is theirs: `by`
   is their account, it stands among their spaces (given:<u> — a page handed
   is not one of the three an account may MAKE, so a claim is never refused
   for room), and whoever had it before has it no longer. TOEM 2 goes the
   same way: its record gains a `by` and still has no `made`.
   THE CODE is sixteen of Crockford's thirty-two letters and numbers — eighty
   bits, and no I, L, O or U to misread — kept only as its sha256. It opens
   one page, once, within HANDOFF_DAYS; a new one for the same page ends the
   old, and the master can take one back (revoke). A guess is counted before
   it is judged: CLAIM_TRIES an hour an account, CLAIM_TRIES_IP an address,
   and a wrong code, a used one and one that has run out are told alike.
   ponytail: the code is its bearer's — whoever holds it claims; tying one to
   an account is a `for` on its record and a line in opClaim. The desk reads
   every page in one go — fine to a few thousand. */
const CODE_ABC = '0123456789ABCDEFGHJKMNPQRSTVWXYZ', CODE_LEN = 16;
const newCode = () => Array.from(crypto.randomBytes(CODE_LEN), b => CODE_ABC[b & 31]).join('');   // 256 is eight 32s: every letter as likely as the next
const showCode = c => c.replace(/(.{4})(?=.)/g, '$1-');
// what was typed, as the code it means: any capitals, dashes or spaces, and the letters Crockford leaves out read as the digits they look like
function cleanCode(v) {
  const c = String(v == null ? '' : v).slice(0, 64).toUpperCase().replace(/O/g, '0').replace(/[IL]/g, '1').replace(/[\s-]/g, '');
  return c.length === CODE_LEN && [...c].every(ch => CODE_ABC.includes(ch)) ? c : '';
}
const codeKey = c => K.handoff(sha('handoff|' + c));
const handIn = p => { try { const h = p.hand ? JSON.parse(p.hand) : null; return h && typeof h.h === 'string' ? h : null; } catch (e) { return null; } };
const handOf = p => { const h = handIn(p); return h && +h.ex > Date.now() ? h : null; };   // the code a page may be claimed by, while it lasts
async function opHandoff(req, res, me, body) {
  if (!master(me)) throw bad(403, 'role', 'a page is the master\'s to hand on');
  const pg = await pageOf(body.page), slug = pg.slug, p = await db('HGETALL', K.page(slug)), was = handIn(p);
  if (was) await db('DEL', K.handoff(was.h));   // one code a page: the old one ends here, used or not
  if (body.revoke) {
    await db('HSET', K.page(slug), 'hand', '');
    await audit(me.id, 'handoff', { page: slug, revoked: true });
    return answer(res, 200, { ok: true, page: slug, revoked: !!handOf(p) });
  }
  const code = newCode(), now = Date.now(), ex = now + HANDOFF_DAYS * DAY;
  await dbm([['SET', codeKey(code), JSON.stringify({ page: slug, by: me.id, at: now }), 'EX', HANDOFF_DAYS * 86400],
             ['HSET', K.page(slug), 'hand', JSON.stringify({ h: sha('handoff|' + code), at: now, ex, by: me.id })]]);
  await audit(me.id, 'handoff', { page: slug });
  answer(res, 200, { ok: true, page: slug, title: await titleOf(slug), code: showCode(code), expires: ex, days: HANDOFF_DAYS });
}
async function opClaim(req, res, me, body) {
  const NO = 'that code opens nothing — it may be mistyped, used already, replaced, or past its ' + HANDOFF_DAYS + ' days';
  if (!me.name) throw bad(400, 'name', 'choose a name first — a page is handed to somebody');
  const hour = Math.floor(Date.now() / 36e5), ku = K.rl('claim:' + me.id, hour), ki = K.rl('claimip:' + ipHash(req), hour);
  const [nu, ni] = await dbm([['INCR', ku], ['INCR', ki]]);   // counted before it is judged
  if (nu === 1 || ni === 1) await dbm([['EXPIRE', ku, 3600], ['EXPIRE', ki, 3600]]);
  if (nu > CLAIM_TRIES || ni > CLAIM_TRIES_IP) throw bad(429, 'rate', 'that is a lot of codes in one hour — try again in a while');
  const code = cleanCode(body.code);
  if (!code) throw bad(400, 'code', 'a code is sixteen letters and numbers, as it was sent to you');
  const raw = await db('GETDEL', codeKey(code));   // taken as it is read: two who type it at once, and one of them has it
  if (!raw) throw bad(404, 'code', NO);
  const rec = JSON.parse(raw), slug = String(rec.page || ''), p = slug === HOME || SLUG_RE.test(slug) ? await db('HGETALL', K.page(slug)) : {}, hand = handOf(p);
  if (!hand || hand.h !== sha('handoff|' + code) || (slug !== HOME && !p.made)) throw bad(404, 'code', NO);
  const was = p.by && USER_RE.test(p.by) ? p.by : '', now = Date.now(), title = await titleOf(slug);
  if (was === me.id) { await db('HSET', K.page(slug), 'hand', ''); return answer(res, 200, { ok: true, page: { slug, title }, yours: true }); }   // theirs already: the code is spent, nothing moves
  const cmds = [['HSET', K.page(slug), 'by', me.id, 'given', String(now), 'giver', String(rec.by || ''), 'hand', ''],
                ['SADD', K.given(me.id), slug], ['SREM', K.invited(slug), me.id]];
  if (was) cmds.push(['SREM', K.spaces(was), slug], ['SREM', K.given(was), slug]);
  await dbm(cmds);
  await audit(me.id, 'claim', { page: slug, from: was || undefined, giver: rec.by || undefined });
  if (USER_RE.test(rec.by || '') && rec.by !== me.id) await tell(rec.by, 'claimed', me.id, { slug, title });
  if (was && was !== me.id && was !== rec.by) await tell(was, 'handed', me.id, { slug, title });   // whoever had it hears that it has gone
  answer(res, 200, { ok: true, page: { slug, title, was: was || undefined } });
}

// ── GET ───────────────────────────────────────────────────────────────────
async function get(req, res, q, op) {
  const st = storeFor();
  if (q.get('ping')) return answer(res, 200, { ok: true, door: true, store: st ? st.kind : 'none', login: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) });
  const way = vouchOf(op);
  if (way) return oauth(req, res, q, way[1], !!way[2]);
  if (!st) return answer(res, 503, { ok: false, code: 'no-store', error: 'this site has no store for the wall yet (KV_REST_API_URL / KV_REST_API_TOKEN)' });
  if (q.get('me')) {
    const me = await whoIs(req);
    if (!me) return answer(res, 401, { ok: false, code: 'who', error: 'not signed in' });
    const out = Object.assign({ ok: true, pending: await sweepPending(K.pending(me.id)) }, me);
    delete out.watched;                         // a watched account is slowed, not told
    return answer(res, 200, out);
  }
  if (q.get('who')) {                           // a gnome's card: anybody's to read, the counters in full a moderator's
    const u = String(q.get('who'));
    if (!USER_RE.test(u)) return answer(res, 400, { ok: false, code: 'user', error: 'not a gnome id' });
    const [rec, days] = await dbm([['HGETALL', K.user(u)], ['SMEMBERS', K.days(u)]]);
    if (!rec || !rec.made) return answer(res, 404, { ok: false, code: 'user', error: 'the hill has no record of that gnome' });
    const h = habits(rec), p = await profile(u, rec, days.length), me = await whoIs(req);
    const who = { id: u, name: rec.name || '', n: +rec.n || 0, tag: tagOf(rec), since: new Date(numOf(rec.made) || Date.now()).toISOString().slice(0, 7), tier: p.tier, rep: days.length,
                  streak: streakOf(days), avatar: rec.avatar || '', live: h.live, okd: h.okd, landed: h.landed, won: h.won, votes: h.votes };
    if (p.role === 'mod' || p.role === 'admin') who.role = p.role;
    if (isMod(me)) Object.assign(who, { held: h.held, rej: h.rej, rvd: h.rvd, rvs: h.rvs, rvw: h.rvw, strikes: h.strikes, flak: h.flak, watched: h.watched, banned: rec.banned === '1', seen: numOf(rec.seen), made: numOf(rec.made) });
    return answer(res, 200, { ok: true, who });
  }
  if (q.get('edit')) {
    const id = q.get('edit');
    if (!EDIT_RE.test(id)) return answer(res, 400, { ok: false, code: 'edit', error: 'not an edit id' });
    let raw = await db('GET', K.edit(id));
    if (raw && JSON.parse(raw).status === 'motion') { await settleMotion(JSON.parse(raw), VOTE); raw = await db('GET', K.edit(id)); }
    if (!raw) return answer(res, 404, { ok: false, code: 'edit', error: 'no such edit (a decided one is kept ' + EDIT_DAYS + ' days)' });
    const e = JSON.parse(raw), t = e.votes ? tally(e) : {};
    delete e.ip; delete e.voters;               // the author's address and the voters' are nobody's business
    if (e.votes && !isMod(await whoIs(req))) delete e.votes;   // …and who voted which way is the tally's to say, and a moderator's to see
    return answer(res, 200, { ok: true, edit: Object.assign(e, t) });
  }
  if (q.get('pages')) {                         // the first page, and every one made since
    const slugs = await db('ZRANGEBYSCORE', K.pages, '-inf', '+inf'), [home, ...recs] = await dbm([HOME].concat(slugs).map(s => ['HGETALL', K.page(s)]));
    return answer(res, 200, { ok: true, pages: [{ slug: HOME, title: nameIn(HOME, home), kind: 'wall' }].concat(recs.map((p, i) => ({ slug: slugs[i], title: p.title, kind: p.kind, by: p.by, made: +p.made }))) });
  }
  if (q.get('space')) {                         // one space, for its own address (space.html): anybody's to read — the first page too, since it may have a maker (THE MASTER)
    const slug = String(q.get('space')).toLowerCase(), p = SLUG_RE.test(slug) ? await db('HGETALL', K.page(slug)) : {};
    if (!p.made && slug !== HOME) return answer(res, 404, { ok: false, code: 'page', error: 'no such space' });
    const [name, n] = p.by ? await dbm([['HGET', K.user(p.by), 'name'], ['HGET', K.user(p.by), 'n']]) : [];
    return answer(res, 200, { ok: true, space: Object.assign(spaceOf(slug, p), { tag: tagOf({ name, n }) }) }, CACHE.log);
  }
  if (q.get('spaces')) {                        // the spaces this account made, oldest first: the yard's hills, and whether it may make another
    const me = await whoIs(req);
    if (!me) return answer(res, 401, { ok: false, code: 'who', error: 'not signed in' });
    // the ones it made, and the ones it was handed (THE MASTER) — which are theirs as much, and take none of the three
    const [made, given] = await dbm([['SMEMBERS', K.spaces(me.id)], ['SMEMBERS', K.given(me.id)]]), slugs = [...new Set(made.concat(given))];
    const recs = slugs.length ? await dbm(slugs.map(s => ['HGETALL', K.page(s)])) : [], lens = slugs.length ? await dbm(slugs.map(s => ['LLEN', pageKeys(s).queue])) : [];
    const spaces = recs.map((p, i) => Object.assign(spaceOf(slugs[i], p), { waiting: numOf(lens[i]) }, made.includes(slugs[i]) ? {} : { handed: true }))
      .filter(s => (s.made || s.slug === HOME) && s.by === me.id).sort((a, b) => (a.made || a.given) - (b.made || b.given));
    return answer(res, 200, { ok: true, max: SPACES_MAX, full: !isMod(me) && spaces.filter(s => !s.handed).length >= SPACES_MAX, spaces });
  }
  if (q.get('desk')) {                          // THE MASTER's desk: every page, whose it is, and whether a code for it is out
    const me = await whoIs(req);
    if (!master(me)) return answer(res, 403, { ok: false, code: 'role', error: 'the desk is the master\'s' });
    const slugs = [HOME].concat(await db('ZRANGEBYSCORE', K.pages, '-inf', '+inf')), recs = await dbm(slugs.map(s => ['HGETALL', K.page(s)]));
    const tags = await tagsOf(recs.map(p => p.by).filter(u => USER_RE.test(u || '')));
    return answer(res, 200, { ok: true, me: me.id, days: HANDOFF_DAYS, pages: slugs.map((s, i) => {
      const p = recs[i], hand = handOf(p);
      return { slug: s, title: nameIn(s, p), by: p.by || '', tag: p.by ? tags[p.by] || '' : '', made: numOf(p.made), given: numOf(p.given),
               code: hand ? { at: +hand.at || 0, expires: +hand.ex } : null };
    }) });
  }
  if (q.get('audit')) {
    if (!isMod(await whoIs(req))) return answer(res, 403, { ok: false, code: 'role', error: 'the record is the moderators\'' });
    const n = +q.get('audit') > 1 ? Math.min(AUDIT_KEEP, Math.floor(+q.get('audit'))) : 200;
    return answer(res, 200, { ok: true, audit: (await db('LRANGE', K.audit, 0, n - 1)).map(s => JSON.parse(s)) });
  }
  const pg = await pageOf(q.get('page'));       // the rest are one page's: TOEM 2's unless another is named
  if (q.get('rules')) {                         // the page's rules, and where the one asking stands under them
    const me = await whoIs(req), rules = await rulesOf(pg, me), tags = await tagsOf(rules.keepers);
    return answer(res, 200, Object.assign({ ok: true }, rules, PAPERS[rules.palette], { closesAt: rules.closes, keepers: rules.keepers.map(u => ({ id: u, tag: tags[u] })), me: me ? me.id : null }));
  }
  if (q.get('history')) {
    /* THE PAGE'S HISTORY, FOR ITS DASHBOARD (2026-09-28): who joined, and the edits that went up — newest first, all the log keeps
       (LOG_KEEP revisions), on any page whatever its rules. JOINED is the first time an account was seen with the page open
       (joined:<slug>, kept by api/board.js: WHO IS HERE) — or, for whoever was here before that was kept, their first edit in the
       log. AN EDIT THAT WENT UP went live, was approved, was carried by the council or was put up at a moderator's word; what was
       undone, reverted or struck is the wall's own history's to tell (toem2/history.js). The keepers' to read: it says who came.
       ponytail: every account that ever came is read and named here, two store reads each, a dashboard's load at a time — fine to
       a few thousand; a page past that wants its joins in a sorted set, read a screen at a time. */
    const me = await whoIs(req), rules = await rulesOf(pg, me);
    if (!rules.keeper) return answer(res, me ? 403 : 401, { ok: false, code: me ? 'role' : 'who', error: 'a page\'s history is its moderators\' to read' });
    const [raw, seen] = await dbm([['LRANGE', pg.log, 0, LOG_KEEP - 1], ['HGETALL', K.joined(pg.slug)]]);
    const log = raw.map(s => JSON.parse(s)).filter(e => USER_RE.test(String(e.by || ''))), first = {};
    Object.keys(seen || {}).forEach(u => { if (USER_RE.test(u) && +seen[u] > 0) first[u] = +seen[u]; });
    log.forEach(e => { if (+e.at > 0 && !(first[e.by] <= e.at)) first[e.by] = +e.at; });
    const edits = log.filter(e => ['live', 'approved', 'motion', 'fiat'].includes(e.how)), via = e => (USER_RE.test(String(e.via || '')) ? e.via : '');
    const tags = await tagsOf(Object.keys(first).concat(edits.map(via).filter(Boolean)));
    const history = Object.keys(first).map(u => ({ kind: 'join', at: first[u], by: u, tag: tags[u] }))
      .concat(edits.map(e => ({ kind: 'edit', at: +e.at || 0, by: e.by, tag: tags[e.by], how: e.how, via: via(e) ? tags[via(e)] : undefined, rev: e.rev, cls: e.cls, n: e.n })))
      .sort((a, b) => b.at - a.at || (a.kind === 'join') - (b.kind === 'join'));   // at one moment, the joining is the older of the two
    return answer(res, 200, { ok: true, history, kept: LOG_KEEP });
  }
  if (q.get('queue') || q.get('ballot')) {      // the queue — or, for the ballot, its motions, with the clock and the one asking's own votes
    const ballot = !!q.get('ballot');
    await sweepQueueSometimes(pg, await rulesOf(pg));
    const rules = await rulesOf(pg), me = ballot ? await whoIs(req) : null, mine = {};
    const ids = await db('LRANGE', pg.queue, 0, -1);
    const all = (ids.length ? await dbm(ids.map(id => ['GET', K.edit(id)])) : []).filter(Boolean).map(r => JSON.parse(r)).filter(e => e.status === 'queued' || e.status === 'motion' || !ballot)
      .map(e => { if (me && e.votes && e.votes[me.id] != null) mine[e.id] = e.votes[me.id];
                  return Object.assign({ id: e.id, by: e.by, name: e.name, at: e.at, cls: e.cls, status: e.status, why: e.why, look: e.look, closes: e.tick ? rules.closes : e.closes, tick: e.tick || undefined,
                                         n: { put: Object.keys(e.put).length, del: e.del.length, art: (e.art || []).length } }, e.status === 'motion' || ballot ? tally(e) : {}); });
    const queue = all.filter(e => !ballot || e.status === 'motion');
    if (!ballot) return answer(res, 200, { ok: true, queue, chaos: rules.chaos, every: rules.every, closesAt: rules.closes, last: rules.last, quorum: MOTION_QUORUM, mine });
    /* THE BALLOT'S PICTURES: every edit that waits — for the keepers, or for a vote — with how much it changes and its hearts (on a
       motion, its ayes), the one that changes the most first; then the most hearts, then the older */
    const size = e => e.n.put + e.n.del + e.n.art;
    const waiting = all.map(e => Object.assign({}, e, { size: size(e), hearts: e.ayes, hearted: mine[e.id] === 1 })).sort((a, b) => b.size - a.size || b.hearts - a.hearts || a.at - b.at);
    return answer(res, 200, { ok: true, queue, waiting, chaos: rules.chaos, every: rules.every, closesAt: rules.closes, last: rules.last, quorum: MOTION_QUORUM, mine });
  }
  if (q.get('at')) {
    const n = Math.floor(+q.get('at'));
    if (!(n >= 1)) return answer(res, 400, { ok: false, code: 'rev', error: 'not a revision number' });
    const raw = await db('GET', pg.revN(n));
    return raw ? answer(res, 200, { ok: true, rev: JSON.parse(raw) }, CACHE.rev) : answer(res, 404, { ok: false, code: 'rev', error: 'no such revision (a revision\'s record is kept ' + REV_DAYS + ' days)' });
  }
  if (q.get('log')) {
    const n = +q.get('log') > 1 ? Math.min(LOG_KEEP, +q.get('log')) : 100;
    return answer(res, 200, { ok: true, log: (await db('LRANGE', pg.log, 0, n - 1)).map(s => JSON.parse(s)) }, CACHE.log);
  }
  if (q.get('rev') != null) {
    const rev = await db('GET', pg.rev);
    if (rev != null && +q.get('rev') === +rev) return answer(res, 200, { ok: true, rev: +rev, same: true }, CACHE.doc);
  }
  answer(res, 200, Object.assign({ ok: true }, await loadDoc(pg)), CACHE.doc);
}

// ── sign-in ───────────────────────────────────────────────────────────────
function originOf(req) {
  const h = req.headers;
  const proto = String(h['x-forwarded-proto'] || (process.env.VERCEL ? 'https' : 'http')).split(',')[0].trim();
  const host = String(h['x-forwarded-host'] || h.host || 'localhost').split(',')[0].trim();
  return proto + '://' + host;
}
/* THE WAYS IN BESIDE A PASSWORD: Google, and since 2026-09-27 Discord. It is
   one walk — out to them with a state, back with a code, the code changed
   for a token — and what differs is where each lives, what it is asked for,
   and how it says whose address this is: `email` answers a CONFIRMED address
   or nothing. Google's is in its id token, read back by Google itself (it
   names this site's client, and Google); Discord's is on the account the
   token is for, and `verified` is Discord saying its owner answered a letter
   there. Each wants its own pair in the environment (<NAME>_CLIENT_ID and
   <NAME>_CLIENT_SECRET) and its own callback (/auth/<name>/callback)
   registered with it. Neither waits on the other's servers past eight seconds. */
const WAIT = () => AbortSignal.timeout(8000);
const VOUCH = {
  google: { name: 'Google', ask: 'https://accounts.google.com/o/oauth2/v2/auth', scope: 'openid email', prompt: 'select_account', token: 'https://oauth2.googleapis.com/token', headers: {},
            unsure: 'Google could not confirm that email address.',
            email: async (tok, id) => {
              if (!tok.id_token) return '';
              const info = await fetch('https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(tok.id_token), { signal: WAIT() }).then(r => r.json()).catch(() => ({}));
              return info.aud === id && info.email_verified === 'true' && info.email && /^(https:\/\/)?accounts\.google\.com$/.test(String(info.iss || '')) ? String(info.email) : '';
            } },
  discord: { name: 'Discord', ask: 'https://discord.com/oauth2/authorize', scope: 'identify email', prompt: 'none', token: 'https://discord.com/api/oauth2/token',
             headers: { 'user-agent': 'DiscordBot (https://www.knoll.space, 1)' },   // Discord's API wants a client that says what it is
             unsure: 'Your Discord account has no confirmed email address. Please confirm your email in Discord and try again, or sign up with an email and password.',
             email: async tok => {
               if (!tok.access_token) return '';
               const me = await fetch('https://discord.com/api/v10/users/@me', { headers: { authorization: 'Bearer ' + tok.access_token, 'user-agent': VOUCH.discord.headers['user-agent'] }, signal: WAIT() }).then(r => r.json()).catch(() => ({}));
               return me.verified === true && typeof me.email === 'string' ? me.email : '';
             } }
};
const vouchOf = op => /^(google|discord)(-back)?$/.exec(op === 'callback' ? 'google-back' : op);   // 'callback' is Google's, from before there were two
async function oauth(req, res, q, which, back_) {
  const way = VOUCH[which], NAME = way.name, VAR = which.toUpperCase();
  const id = process.env[VAR + '_CLIENT_ID'], secret = process.env[VAR + '_CLIENT_SECRET'];
  if (!id || !secret) return page(res, NAME + ' sign-in is not set up on this site yet (' + VAR + '_CLIENT_ID and ' + VAR + '_CLIENT_SECRET are not set) — please log in with your email and password instead.');
  if (!storeFor()) return page(res, 'This site has no account store yet, so there is nothing to sign in to.');
  const back = (process.env.SITE_ORIGIN || originOf(req)).replace(/\/+$/, '') + '/auth/' + which + '/callback';
  if (!back_) {
    /* THE STATE IS THIS BROWSER'S: kept in the store with where to go back
       to (?next=, a path on this site), and in a cookie only this browser
       holds — so a callback link somebody else started (their Google, their
       account) signs nobody in here: it arrives without the cookie and is
       turned away. (Until 2026-09-21 a nonce did this job, for a session
       handed over in the URL fragment; the session is a cookie now.) */
    const state = crypto.randomBytes(16).toString('base64url');
    await db('SET', K.oauth(state), localPath(q.get('next')), 'EX', 600);
    const to = way.ask + '?' + new URLSearchParams({ client_id: id, redirect_uri: back, response_type: 'code', scope: way.scope, state, prompt: way.prompt });
    res.statusCode = 302; res.setHeader('location', to); res.setHeader('cache-control', 'no-store');
    res.setHeader('set-cookie', cookie(req, OAUTH, state, 600 / 86400));
    res.end();
    return;
  }
  // they come back with ?error= and no code when the person cancels, or when the consent screen does not let them in (2026-09-23)
  const oerr = q.get('error');
  if (oerr) return page(res, oerr === 'access_denied' ? 'The ' + NAME + ' sign-in was cancelled, or ' + NAME + ' did not allow it. Please go back and try again.' : NAME + ' sign-in did not go through (' + String(oerr).slice(0, 64) + '). Please go back and try again.');
  const state = q.get('state') || '', code = q.get('code') || '';
  if (!/^[A-Za-z0-9_-]{16,32}$/.test(state) || !/^[A-Za-z0-9._\/-]{4,512}$/.test(code)) return page(res, 'That ' + NAME + ' sign-in did not come back correctly. Please go back and press the ' + NAME + ' button again.');
  if (cookieOf(req, OAUTH) !== state) return page(res, 'That ' + NAME + ' sign-in was started in another browser, or this one has forgotten it. Please go back and press the ' + NAME + ' button again.');
  const next = await db('GETDEL', K.oauth(state));
  if (!next) return page(res, 'That ' + NAME + ' sign-in has expired. Please go back and press the ' + NAME + ' button again.');
  const tok = await fetch(way.token, { method: 'POST', headers: Object.assign({ 'content-type': 'application/x-www-form-urlencoded' }, way.headers), signal: WAIT(),
    body: String(new URLSearchParams({ code, client_id: id, client_secret: secret, redirect_uri: back, grant_type: 'authorization_code' })) }).then(r => r.json()).catch(() => ({}));
  if (!tok.id_token && !tok.access_token) return page(res, NAME + ' did not sign you in: ' + (tok.error_description || tok.error || 'no token came back') + '.');
  const email = await way.email(tok, id);
  if (!email) return page(res, way.unsure);
  /* ONE ADDRESS, ONE WAY IN. A password's account is the password's: Google
     or Discord vouching for the same address later does not open it, and
     /signup refuses an address either has already vouched for. (When this
     was written a sign-up proved nothing about its address, and opening it
     would have handed whoever typed the address first the account of the
     person who owns it; a sign-up answers a letter now — api/auth.js: THE
     CODE — and the rule has stayed.) An address Google vouched for IS opened
     by Discord vouching for it, and the other way about: the account is the
     address's, and both have had its owner prove it. */
  if (await db('HGET', K.user(userKey(email)), 'pw')) return page(res, 'That email already has a password on this site — please log in with your email and password.');
  const { user, session, named } = await finishLogin(email);
  setSession(res, req, session, user, SESSION_DAYS, [cookie(req, OAUTH, '', 0)]);
  // a new account has no name yet: /signup asks for one, then goes on to next
  res.statusCode = 302; res.setHeader('location', named ? next : '/signup/?' + which + '=1&next=' + encodeURIComponent(next)); res.setHeader('cache-control', 'no-store'); res.end();
}

// ── the handler ───────────────────────────────────────────────────────────
async function handler(req, res) {
  try {
    const url = new URL(req.url, 'http://x'), q = url.searchParams;
    let op = q.get('op') || '';
    const door = /\/auth\/(google|discord)(\/callback)?$/.exec(url.pathname);   // the sign-in paths vercel.json rewrites here, as serve.js hands them over
    if (door) op = door[1] + (door[2] ? '-back' : '');
    if (req.method === 'GET') return await get(req, res, q, op);
    if (req.method !== 'POST') return answer(res, 405, { ok: false, error: 'GET or POST' });
    if (!storeFor()) return answer(res, 503, { ok: false, code: 'no-store', error: 'this site has no store for the wall yet' });
    if (!bearer(req) && !sameSite(req)) return answer(res, 403, { ok: false, code: 'origin', error: 'that post came from another site' });
    const me = await whoIs(req);
    if (!me) return answer(res, 401, { ok: false, code: 'who', error: 'sign in to do that' });
    const body = await readBody(req);
    if (!body || typeof body !== 'object' || Array.isArray(body)) return answer(res, 400, { ok: false, code: 'body', error: 'the post is not an op' });
    if (body.op === 'logout') { await db('DEL', K.sess(sha(sessionOf(req)))); if (!bearer(req)) clearSession(res, req); return answer(res, 200, { ok: true }); }
    if (me.banned) return answer(res, 403, { ok: false, code: 'banned', error: 'this account may not edit the wall' });
    if (!(await rateOk(me, req, body.op))) return answer(res, 429, { ok: false, code: 'rate', error: 'that is a lot in one hour — take a breath' });
    switch (body.op) {                            // review and vote find their page in the edit itself
      case 'edit': return await opEdit(await pageOf(body.page), req, res, me, body);
      case 'review': return await opReview(req, res, me, body);
      case 'vote': return await opVote(req, res, me, body);
      case 'heart': return await opHeart(req, res, me, body);
      case 'revert': return await opRevert(await pageOf(body.page), req, res, me, body, false);
      case 'strike': return await opRevert(await pageOf(body.page), req, res, me, body, true);
      case 'undo': return await opUndo(await pageOf(body.page), req, res, me, body);
      case 'role': return await opRole(req, res, me, body);
      case 'page': return await opPage(req, res, me, body);
      case 'handoff': return await opHandoff(req, res, me, body);
      case 'claim': return await opClaim(req, res, me, body);
      case 'settings': return await opSettings(await pageOf(body.page), req, res, me, body);
      case 'me': return answer(res, 200, Object.assign({ ok: true }, await rename(me.id, body.name, me.id)));
      default: return answer(res, 400, { ok: false, code: 'op', error: 'no such op' });
    }
  } catch (e) {
    if (e instanceof Bad) return answer(res, e.status, Object.assign({ ok: false, code: e.code, error: e.message }, e.extra || {}));
    if (e instanceof SyntaxError) return answer(res, 400, { ok: false, code: 'body', error: 'the post is not JSON' });
    console.error('api/wall.js: ' + String((e && e.stack) || e));
    answer(res, 500, { ok: false, code: 'server', error: 'the wall is having trouble — try again in a moment' });
  }
}

module.exports = handler;
// for the probes: the store (and a way to swap it), the keys, and the two things a test signs in with
Object.assign(handler, { storeFor, useStore: s => { STORE = s; }, db, dbm, K, pageKeys, HOME, CAP, LINE, RATE, TIER_REP, MOTION_HOURS, MOTION_QUORUM, TAG_MAX, mintSession, finishLogin, userKey, CAS,
                         CHAOS, EVERY, EVERY_DEFAULT, QUEUE_DAYS, VOTE, FEATS_DEFAULT, NOTES_KEEP, sweepQueue });
// …and for api/auth.js (the accounts) and api/hill.js (a yard of one's own, and proposals to it): who
// is asking, the session's two cookies, the names, and the checks a piece that other people's browsers will draw has to pass
Object.assign(handler, { whoIs, isMod, master, titleOf, HANDOFF_DAYS, CLAIM_TRIES, sessionOf, sessOf, inGen, setSession, clearSession, sameSite, localPath, answer, readBody, Bad, bad, text, sha, ipHash,
                         rename, cleanName, tagOf, foldName, ensureTag, audit, tell, tellOnce, tellKeepers, tagsOf, habits, rulesOf, cleanRecord, cleanTracing, cleanPic, KINDS, GIF_RE, VID_RE, USER_RE, SLUG_RE, SESSION_DAYS });
