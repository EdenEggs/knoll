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
   MOTION on the page's BALLOT, which closes at a UTC midnight every
   `period` days (each motion carries the close it is decided at, at least
   twelve hours after it was filed); 3 WILD — anyone signed in edits
   anything, live, with no canon, no cooldown and no queue; the caps, the
   rate and the history stay, and a strike is refused there (a revert is a
   revert). KEEPERS are the moderators everywhere, the trusted tier on
   TOEM 2, and on a space its maker (who is that page's moderator) with the
   friends they invited (api/friends.js) while they are still friends.
   Every piece carries `by` — who put it up, stamped here and never by a
   client — and a non-keeper touches only their own. VOTES take a standing
   day (rep 1 or more): one per address, the proposer excluded, quorum
   three, a simple majority at the close, a tie falls, and nothing passes
   early — a keeper's approve is the fast track, a reject the veto.
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
/* THREE LEVELS OF CHAOS: a page's chaos (0 read-only · 1 tended · 2 council · 3 wild), its ballot's period in days, the least a motion is open,
   and FEATS — which kinds everyone may add live (ink · stickers · notes · tracings · embeds · others' pieces); off is the keepers' only */
const CHAOS = [0, 1, 2, 3], PERIODS = [1, 3, 7], CHAOS_DEFAULT = 1, PERIOD_DEFAULT = 3, MIN_OPEN_H = 12;
const FEATS_DEFAULT = [true, true, true, false, false, false], KIND_SLOT = { s: 0, p: 0, b: 0, d: 1, k: 1, t: 2, i: 3, g: 4, v: 4 }, OTHERS_SLOT = 5;
const LOCK_S = 5, NOTES_KEEP = 50;            // a vote's lock on its motion (seconds) · bell entries kept (api/friends.js reads them)
const VOTE = { id: 'vote', name: 'the vote' }; // the hand that closes a ballot
const TAG_MAX = 1000000;                      // the most gnomes one name takes: Mossy#1 … Mossy#1000000
const NAMES_KEEP = 50, AUDIT_KEEP = 1000;     // names kept per account; entries kept in the moderators' record
const HOME = 'toem2';                         // the first page: its keys are the store's oldest, and stay put
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
                               · live held okd rej won rvd rvs rvw votes — the counters (HABITS)
     users             zset    every account, scored by when it was made
     names:<u>         list    {name, n, at, by} — every name it has gone by, newest first
     tagn:<name>       string  how many have taken that name (lower-cased): the last #n given
     tags              hash    '<name>#<n>' → the account; a tag is never given twice
     sess:<sha>        string  a session → its account (expires)
     oauth:<state>     string  a Google sign-in on its way (ten minutes)
     code:<u>          hash    h tries — a sign-up code posted to an address, hashed, and the wrong guesses (api/auth.js: THE CODE; ten minutes)
     days:<u>          set     standing days — rep, earned on any page
     rl:<who>:<hour>   string  the hour's counters · rl:chat:<slug>:<u>:wait — the chat's wait between two lines (api/board.js)
     fp:<u>:<day>      set     the pieces touched today, any page (the footprint)
     pending:<u>       list    edits of theirs waiting, any page · pendingip:<h> the same by address
   PAGES
     page:<slug>       hash    made title kind by, its look: palette inks pic, its rules: chaos period closes last told feats
                               (mod: the form's old word, kept, unread) — every page; the first keeps a settings-only hash (no made)
                               · tabs chat (the board's tabs and the chat's rules — api/board.js) · sections (the album's — api/gallery.js)
                               · ranks (what the leaderboard shows — api/leaderboard.js), JSON
     pages             zset    those pages, scored by when they were made
     spaces:<u>        set     the pages an account made (SPACES: two, unless a moderator)
     doc rev log rev:<n> queue contested
                               a page's wall: bare for toem2 (toem2:doc), p:<slug>: before
                               the rest for any other (toem2:p:<slug>:doc) — pageKeys()
     edit:<id>         string  one edit, waiting or decided, naming its page (none: toem2), with prev why look; a motion: closes votes voters
     lock:<edit>       string  a vote landing on a motion (LOCK_S seconds)
   PROFILES — a profile is an account's name and its yard (api/hill.js)
     prop:<id>         string  a change somebody else proposes to a gnome's yard or name
     propdoc:<id>      string  …the yard it proposes, while it is open
     props:<hill>      list    the open ones, for that yard's owner to decide
     propsby:<u>       list    the open ones this account has made · propsip:<h> the same by address
   FRIENDS — api/friends.js
     friends:<u>       set     the accounts it is friends with, both ways
     asks:<u>          set     the accounts asking to be its friend
     notes:<u>         list    its bell, newest first: {kind ask|friend|keeper|okd|rej|passed|failed|ballot, from, at, slug, title, why, ayes, nays}
     invited:<slug>    set     the accounts invited to a space — its keepers, while they are still the maker's friends
   THE TOWN BOARD AND THE CHAT — api/board.js
     board:<slug>:<ch> list    a page's news · updates · forum (threads and replies) · chat, newest first, trimmed
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
  prop: id => P + 'prop:' + id, propDoc: id => P + 'propdoc:' + id, props: hill => P + 'props:' + hill,
  propsBy: u => P + 'propsby:' + u, propsIp: h => P + 'propsip:' + h, audit: P + 'audit',
  friends: u => P + 'friends:' + u, asks: u => P + 'asks:' + u, notes: u => P + 'notes:' + u, invited: s => P + 'invited:' + s,
  lock: id => P + 'lock:' + id, board: (s, ch) => P + 'board:' + s + ':' + ch,
  album: s => P + 'album:' + s, albumLike: (s, id) => P + 'album:' + s + ':like:' + id,
  lb: s => P + 'lb:' + s
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
const nextMidnight = now => { const t = new Date(now); t.setUTCHours(24, 0, 0, 0); return t.getTime(); };
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

async function whoIs(req) {
  const t = sessionOf(req);
  if (!t) return null;
  const u = await db('GET', K.sess(sha(t)));
  if (!u || !USER_RE.test(u)) return null;
  const [rec, rep] = await dbm([['HGETALL', K.user(u)], ['SCARD', K.days(u)]]);
  if (!rec || !Object.keys(rec).length) return null;
  return profile(u, await ensureTag(u, rec), rep);
}
async function mintSession(u, days) {
  const s = crypto.randomBytes(16).toString('hex');
  await db('SET', K.sess(sha(s)), u, 'EX', Math.round((days || SESSION_DAYS) * 86400));
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
  return { user: u, session: await mintSession(u, days), fresh, named: !!rec.name };
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
async function tagsOf(ids) {                   // account → Name#n, for the ones a page will draw
  const uniq = [...new Set(ids)], out = {};
  if (!uniq.length) return out;
  const got = await dbm(uniq.flatMap(u => [['HGET', K.user(u), 'name'], ['HGET', K.user(u), 'n']]));
  uniq.forEach((u, i) => { out[u] = tagOf({ name: got[2 * i], n: got[2 * i + 1] }) || 'a gnome'; });
  return out;
}
const titleOf = async slug => (slug === HOME || !slug ? 'TOEM 2' : (await db('HGET', K.page(slug), 'title')) || slug);

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
/* The queue swept: every motion whose close has come is settled, in the
   order it was filed; a queued edit nobody looked at in QUEUE_DAYS lapses;
   and on a council page the ballot's clock is kept — a close that has
   passed is written down (last) and the next one set. ponytail: timed
   things happen on reads; a ballot closes when somebody opens the ballot,
   the queue or one of its motions — a cron pinging ?queue is the upgrade. */
async function sweepQueue(pg) {
  const rules = await rulesOf(pg);
  const ids = await db('LRANGE', pg.queue, 0, -1);
  const raws = ids.length ? await dbm(ids.map(id => ['GET', K.edit(id)])) : [], cmds = [], count = { carried: 0, fell: 0, kept: 0 };
  for (const raw of raws) {
    const e = raw && JSON.parse(raw);
    if (!e || e.status !== 'motion') continue;
    const out = await settleMotion(e, VOTE, rules);
    if (out) count[out.status === 'live' ? 'carried' : out.status === 'rejected' ? 'fell' : 'kept']++;
  }
  const again = ids.length ? await dbm(ids.map(id => ['GET', K.edit(id)])) : [];
  again.forEach((raw, i) => {
    const id = ids[i], e = raw && JSON.parse(raw);
    if (!e) { cmds.push(['LREM', pg.queue, 0, id]); return; }
    if (e.status === 'motion') return;
    if (e.status !== 'queued') { cmds.push(['LREM', pg.queue, 0, id], ['LREM', K.pending(e.by), 0, id]); return; }
    if (Date.now() - (e.queued || e.at) > QUEUE_DAYS * 86400e3) {
      e.status = 'expired';
      cmds.push(['SET', K.edit(id), JSON.stringify(e), 'EX', EDIT_DAYS * 86400], ['LREM', pg.queue, 0, id], ['LREM', K.pending(e.by), 0, id]);
    }
  });
  if (rules.chaos === 2) {
    const now = Date.now();
    if (!rules.closes) cmds.push(['HSET', K.page(pg.slug), 'closes', String(nextMidnight(now) + (rules.period - 1) * DAY)]);
    else if (rules.closes <= now) {
      let next = rules.closes;
      while (next <= now) next += rules.period * DAY;
      cmds.push(['HSET', K.page(pg.slug), 'closes', String(next), 'last', JSON.stringify(Object.assign({ at: rules.closes }, count))]);
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
// when a motion filed now is decided: the page's next scheduled close at least MIN_OPEN_H away (council), or MOTION_HOURS from now
function closeOf(rules, now) {
  if (rules.chaos !== 2) return now + MOTION_HOURS * 3600e3;
  let t = rules.closes || nextMidnight(now) + (rules.period - 1) * DAY;
  while (t < now + MIN_OPEN_H * 3600e3) t += rules.period * DAY;
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
  if (rec.status === 'motion') { rec.votes = {}; rec.voters = {}; rec.closes = closeOf(rules, now); }
  await dbm([['SET', K.edit(id), JSON.stringify(rec)], ['RPUSH', pg.queue, id], ['RPUSH', K.pending(me.id), id], ['RPUSH', K.pendingIp(ip), id], ['EXPIRE', K.pendingIp(ip), QUEUE_DAYS * 86400],
             ['HINCRBY', K.user(me.id), 'held', 1]]);
  // the first motion on a ballot rings the keepers' bells, once per ballot: told is the close it rang for
  if (rec.status === 'motion' && rules.chaos === 2 && rules.told !== rec.closes) {
    await db('HSET', K.page(pg.slug), 'told', String(rec.closes));
    for (const u of rules.keepers) if (u !== me.id) await tell(u, 'ballot', me.id, { slug: pg.slug, title: rules.title });
  }
  return { id, closes: rec.closes };
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
  if (to === 'no') throw bad(400, 'drastic', 'this edit is drastic (' + reason(c) + ') — that takes standing here, or a keeper');
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
    if (!rules.keeper) throw bad(403, 'role', 'the queue is for the keepers and the moderators to decide');
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
/* A vote takes a standing day (or a moderator), is not the proposer's, and
   lands under a five-second lock on its motion, so two at once do not lose
   one; a vote after the close is 409, and the close is settled there and
   then. One per address: the later voter's counts. A first vote is counted
   on the account; changing it is not. */
async function opVote(req, res, me, body) {
  const id = String(body.edit || '');
  if (!EDIT_RE.test(id) || typeof body.aye !== 'boolean') throw bad(400, 'vote', 'vote wants an edit id, and aye true or false');
  const raw0 = await db('GET', K.edit(id));
  if (!raw0) throw bad(404, 'edit', 'no such edit');
  const ed0 = JSON.parse(raw0);
  if (ed0.status !== 'motion') throw bad(409, 'decided', 'that edit is ' + ed0.status + ', not up for a vote');
  if (ed0.by === me.id) throw bad(403, 'self', 'not on your own motion');
  if (me.watched || !(isMod(me) || me.tier === 'trusted' || me.rep >= 1)) throw bad(403, 'role', 'voting takes a standing day on the hill — one day of edits on TOEM 2');
  const rules = await rulesOf(pageOfEdit(ed0), me);
  if (ed0.closes && Date.now() >= ed0.closes) { await settleMotion(ed0, VOTE, rules); throw bad(409, 'closed', 'that ballot has closed — it is being counted'); }
  if (!(await db('SET', K.lock(id), '1', 'NX', 'EX', LOCK_S))) throw bad(503, 'busy', 'another ballot is landing on that motion — try again');
  let ed;
  try {
    ed = JSON.parse(await db('GET', K.edit(id)));
    if (ed.status !== 'motion') throw bad(409, 'decided', 'that edit is ' + ed.status + ', not up for a vote');
    ed.votes = ed.votes || {}; ed.voters = ed.voters || {};
    const ip = ipHash(req), prior = ed.voters[ip], first = ed.votes[me.id] === undefined;
    if (prior && prior !== me.id) delete ed.votes[prior];   // one vote per address: the later voter's is the one that counts
    ed.voters[ip] = me.id;
    ed.votes[me.id] = body.aye ? 1 : 0;
    await dbm([['SET', K.edit(id), JSON.stringify(ed)]].concat(first ? [['HINCRBY', K.user(me.id), 'votes', 1]] : []));
  } finally { await db('DEL', K.lock(id)); }
  const out = await settleMotion(ed, me, rules);
  answer(res, 200, Object.assign({ ok: true, edit: id, mine: body.aye ? 1 : 0, closes: ed.closes }, tally(ed), out || { status: 'motion' }));
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
      if (to === 'no') throw bad(400, 'drastic', 'undoing that is a drastic edit — ask a keeper');
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
                          'login', 'logo', 'posters', 'privacy', 'settings', 'signup', 'uploads', 'vendor', 'yard', 'yardview']);
// the form's four papers (yard/new/: PALETTES, keep in step), which space.html and the yard's hills draw with
const PAPERS = {
  yard:   { paper: '#fdf7e3', ink: '#17120b', card: '#fffcf0', line: '#d9cdb0', mute: '#4a4054', accent: '#e8484a' },
  knoll:  { paper: '#faf7f9', ink: '#26212a', card: '#fdfbfd', line: '#e2d4df', mute: '#8b7f92', accent: '#c93b82' },
  bench:  { paper: '#efe7ed', ink: '#2e2636', card: '#fdfbfd', line: '#e2d4df', mute: '#8b7f92', accent: '#f59321' },
  sticky: { paper: '#ffe27a', ink: '#26212a', card: '#fff4c2', line: '#d9bd55', mute: '#5a5140', accent: '#c93b82' }
};
const MODS = ['open', 'friends', 'approve', 'read'];
const listOf = s => { try { const v = JSON.parse(s || '[]'); return Array.isArray(v) ? v : []; } catch (e) { return []; } };
const featsOf = v => { const f = FEATS_DEFAULT.slice(); if (Array.isArray(v)) v.slice(0, 6).forEach((x, i) => { f[i] = !!x; }); return f; };   // six switches, the missing ones as shipped
function lookOf(body) {                        // what a post says the space looks like, cut to what the form offers
  const inks = Array.isArray(body.inks) ? body.inks.filter(c => typeof c === 'string' && /^#[0-9a-f]{6}$/i.test(c)).map(c => c.toLowerCase()) : [];
  const out = { palette: PAPERS[body.palette] ? body.palette : 'yard', inks: JSON.stringify([...new Set(inks)].slice(0, 10)),
                mod: MODS.includes(body.mod) ? body.mod : 'open', feats: JSON.stringify(Array.isArray(body.feats) ? featsOf(body.feats) : FEATS_DEFAULT),
                pic: cleanPic(body.pic) };
  if (body.chaos != null) out.chaos = String(CHAOS.includes(+body.chaos) ? +body.chaos : CHAOS_DEFAULT);
  if (body.period != null) out.period = String(PERIODS.includes(+body.period) ? +body.period : PERIOD_DEFAULT);
  return out;
}
const chaosOf = p => ({ chaos: CHAOS.includes(+p.chaos) ? +p.chaos : CHAOS_DEFAULT, period: PERIODS.includes(+p.period) ? +p.period : PERIOD_DEFAULT,
                        closes: numOf(p.closes), told: numOf(p.told), last: (() => { try { return p.last ? JSON.parse(p.last) : null; } catch (e) { return null; } })() });
const spaceOf = (slug, p) => Object.assign({ slug, title: p.title || slug, by: p.by || '', made: +p.made || 0, palette: PAPERS[p.palette] ? p.palette : 'yard',
  inks: listOf(p.inks), mod: p.mod || 'open', feats: featsOf(listOf(p.feats)), pic: p.pic || '' }, PAPERS[p.palette] || PAPERS.yard,
  (({ chaos, period, closes }) => ({ chaos, period, closesAt: closes }))(chaosOf(p)));
/* THE RULES of a page, as every op asks them: its chaos, period and next close, the six kind switches, its keepers — the maker,
   then the invited who are still their friends; on TOEM 2 the trusted — and whether the one asking is the maker (owner) or a
   keeper. A watched account keeps nothing. ponytail: one HGETALL and two SMEMBERS per edit. */
async function rulesOf(pg, me) {
  const slug = pg.slug, p = await db('HGETALL', K.page(slug));
  const by = p.by && USER_RE.test(p.by) ? p.by : '';
  const invited = by ? await db('SMEMBERS', K.invited(slug)) : [];
  // the keepers: the maker and whoever they invited — a friend or not, since 2026-09-24 (settings: WHO CAN EDIT adds anyone by name)
  const keepers = (by ? [by] : []).concat(invited.filter(u => u !== by));
  const owner = !!me && !!by && by === me.id;
  const keeper = owner || (!!me && !me.watched && (isMod(me) || keepers.includes(me.id) || (slug === HOME && me.tier === 'trusted')));
  return Object.assign({ page: slug, by, keepers, owner, keeper, feats: featsOf(listOf(p.feats)),
                         title: slug === HOME ? 'TOEM 2' : (p.title || slug), palette: PAPERS[p.palette] ? p.palette : 'yard',
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
  if (!(isMod(me) || (slug !== HOME && p.by === me.id))) throw bad(403, 'owner', 'the rules here are the maker\'s');
  const was = chaosOf(p), sets = [], said = {};
  if (body.chaos != null) { if (!CHAOS.includes(+body.chaos)) throw bad(400, 'chaos', 'chaos is 0 (read-only), 1 (tended), 2 (council) or 3 (wild)'); said.chaos = +body.chaos; sets.push('chaos', String(said.chaos)); }
  if (body.period != null) { if (!PERIODS.includes(+body.period)) throw bad(400, 'period', 'a ballot closes every 1, 3 or 7 days'); said.period = +body.period; sets.push('period', String(said.period)); }
  if (Array.isArray(body.feats)) { said.feats = featsOf(body.feats); sets.push('feats', JSON.stringify(said.feats)); }
  const look = slug === HOME ? undefined : cleanLook(body);
  if (look) { said.look = look; sets.push(...Object.entries(look).flat()); }
  if (slug !== HOME && body.pic != null) {      // the page's picture: a 128-pixel JPEG (A PICTURE), or none
    const pic = body.pic === '' ? '' : cleanPic(body.pic);
    if (body.pic !== '' && !pic) throw bad(400, 'pic', 'the picture is not one the form makes');
    said.pic = pic ? 'set' : 'none'; sets.push('pic', pic);
  }
  if (!sets.length) throw bad(400, 'settings', 'settings wants a chaos, a period, feats, or a look');
  const chaos = said.chaos || was.chaos, period = said.period || was.period;
  if (chaos === 2 && (!was.closes || was.chaos !== 2)) { said.closes = nextMidnight(Date.now()) + (period - 1) * DAY; sets.push('closes', String(said.closes)); }   // ponytail: a period change waits for the next close
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
  if (look.chaos === '2') look.closes = String(nextMidnight(now) + ((+look.period || PERIOD_DEFAULT) - 1) * DAY);
  await dbm([['HSET', K.page(slug), 'title', title, 'kind', 'wall', 'by', me.id, ...Object.entries(look).flat()], ['ZADD', K.pages, now, slug]]);
  await audit(me.id, 'page', { page: slug, title });
  answer(res, 200, { ok: true, page: spaceOf(slug, Object.assign({ made: now, title, by: me.id }, look)) });
}

// ── GET ───────────────────────────────────────────────────────────────────
async function get(req, res, q, op) {
  const st = storeFor();
  if (q.get('ping')) return answer(res, 200, { ok: true, door: true, store: st ? st.kind : 'none', login: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) });
  if (op === 'google' || op === 'callback') return oauth(req, res, q, op);
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
    const slugs = await db('ZRANGEBYSCORE', K.pages, '-inf', '+inf'), recs = await dbm(slugs.map(s => ['HGETALL', K.page(s)]));
    return answer(res, 200, { ok: true, pages: [{ slug: HOME, title: 'TOEM 2', kind: 'wall' }].concat(recs.map((p, i) => ({ slug: slugs[i], title: p.title, kind: p.kind, by: p.by, made: +p.made }))) });
  }
  if (q.get('space')) {                         // one space, for its own address (space.html): anybody's to read
    const slug = String(q.get('space')).toLowerCase(), p = SLUG_RE.test(slug) && slug !== HOME ? await db('HGETALL', K.page(slug)) : {};
    if (!p.made) return answer(res, 404, { ok: false, code: 'page', error: 'no such space' });
    const [name, n] = p.by ? await dbm([['HGET', K.user(p.by), 'name'], ['HGET', K.user(p.by), 'n']]) : [];
    return answer(res, 200, { ok: true, space: Object.assign(spaceOf(slug, p), { tag: tagOf({ name, n }) }) }, CACHE.log);
  }
  if (q.get('spaces')) {                        // the spaces this account made, oldest first: the yard's hills, and whether it may make another
    const me = await whoIs(req);
    if (!me) return answer(res, 401, { ok: false, code: 'who', error: 'not signed in' });
    const slugs = await db('SMEMBERS', K.spaces(me.id));
    const recs = slugs.length ? await dbm(slugs.map(s => ['HGETALL', K.page(s)])) : [], lens = slugs.length ? await dbm(slugs.map(s => ['LLEN', pageKeys(s).queue])) : [];
    const spaces = recs.map((p, i) => Object.assign(spaceOf(slugs[i], p), { waiting: numOf(lens[i]) })).filter(s => s.made).sort((a, b) => a.made - b.made);
    return answer(res, 200, { ok: true, max: SPACES_MAX, full: !isMod(me) && spaces.length >= SPACES_MAX, spaces });
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
  if (q.get('queue') || q.get('ballot')) {      // the queue — or, for the ballot, its motions, with the clock and the one asking's own votes
    const ballot = !!q.get('ballot');
    await sweepQueueSometimes(pg, await rulesOf(pg));
    const rules = await rulesOf(pg), me = ballot ? await whoIs(req) : null, mine = {};
    const ids = await db('LRANGE', pg.queue, 0, -1);
    const queue = (ids.length ? await dbm(ids.map(id => ['GET', K.edit(id)])) : []).filter(Boolean).map(r => JSON.parse(r)).filter(e => !ballot || e.status === 'motion')
      .map(e => { if (me && e.votes && e.votes[me.id] != null) mine[e.id] = e.votes[me.id];
                  return Object.assign({ id: e.id, by: e.by, name: e.name, at: e.at, cls: e.cls, status: e.status, why: e.why, look: e.look, closes: e.closes,
                                         n: { put: Object.keys(e.put).length, del: e.del.length, art: (e.art || []).length } }, e.status === 'motion' ? tally(e) : {}); });
    return answer(res, 200, { ok: true, queue, chaos: rules.chaos, period: rules.period, closesAt: rules.closes, last: rules.last, quorum: MOTION_QUORUM, mine });
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
async function oauth(req, res, q, op) {
  const id = process.env.GOOGLE_CLIENT_ID, secret = process.env.GOOGLE_CLIENT_SECRET;
  if (!id || !secret) return page(res, 'Google sign-in is not set up on this site yet (GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are not set) — please log in with your email and password instead.');
  if (!storeFor()) return page(res, 'This site has no account store yet, so there is nothing to sign in to.');
  const back = (process.env.SITE_ORIGIN || originOf(req)).replace(/\/+$/, '') + '/auth/google/callback';
  if (op === 'google') {
    /* THE STATE IS THIS BROWSER'S: kept in the store with where to go back
       to (?next=, a path on this site), and in a cookie only this browser
       holds — so a callback link somebody else started (their Google, their
       account) signs nobody in here: it arrives without the cookie and is
       turned away. (Until 2026-09-21 a nonce did this job, for a session
       handed over in the URL fragment; the session is a cookie now.) */
    const state = crypto.randomBytes(16).toString('base64url');
    await db('SET', K.oauth(state), localPath(q.get('next')), 'EX', 600);
    const to = 'https://accounts.google.com/o/oauth2/v2/auth?' + new URLSearchParams({ client_id: id, redirect_uri: back, response_type: 'code', scope: 'openid email', state, prompt: 'select_account' });
    res.statusCode = 302; res.setHeader('location', to); res.setHeader('cache-control', 'no-store');
    res.setHeader('set-cookie', cookie(req, OAUTH, state, 600 / 86400));
    res.end();
    return;
  }
  // Google comes back with ?error= and no code when the person cancels, or when the consent screen does not let them in (2026-09-23)
  const oerr = q.get('error');
  if (oerr) return page(res, oerr === 'access_denied' ? 'The Google sign-in was cancelled, or Google did not allow it. Please go back and try again.' : 'Google sign-in did not go through (' + String(oerr).slice(0, 64) + '). Please go back and try again.');
  const state = q.get('state') || '', code = q.get('code') || '';
  if (!/^[A-Za-z0-9_-]{16,32}$/.test(state) || !/^[A-Za-z0-9._\/-]{4,512}$/.test(code)) return page(res, 'That Google sign-in did not come back correctly. Please go back and press the Google button again.');
  if (cookieOf(req, OAUTH) !== state) return page(res, 'That Google sign-in was started in another browser, or this one has forgotten it. Please go back and press the Google button again.');
  const next = await db('GETDEL', K.oauth(state));
  if (!next) return page(res, 'That Google sign-in has expired. Please go back and press the Google button again.');
  const tok = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: String(new URLSearchParams({ code, client_id: id, client_secret: secret, redirect_uri: back, grant_type: 'authorization_code' })) }).then(r => r.json()).catch(() => ({}));
  if (!tok.id_token) return page(res, 'Google did not sign you in: ' + (tok.error_description || tok.error || 'no token came back') + '.');
  const info = await fetch('https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(tok.id_token)).then(r => r.json()).catch(() => ({}));
  if (info.aud !== id || info.email_verified !== 'true' || !info.email || !/^(https:\/\/)?accounts\.google\.com$/.test(String(info.iss || ''))) return page(res, 'Google could not confirm that email address.');
  /* ONE ADDRESS, ONE WAY IN. An account made at /signup proves nothing about
     its address — there is no letter to answer — so Google vouching for the
     same address later must not open it: that would hand whoever typed the
     address first (and knows the secret word) the account of the person who
     really owns it. So a secret word's account is the secret word's, and
     /signup refuses an address Google has already vouched for. */
  if (await db('HGET', K.user(userKey(info.email)), 'pw')) return page(res, 'That email already has a password on this site — please log in with your email and password.');
  const { user, session, named } = await finishLogin(info.email);
  setSession(res, req, session, user, SESSION_DAYS, [cookie(req, OAUTH, '', 0)]);
  // a new account has no name yet: /signup asks for one, then goes on to next
  res.statusCode = 302; res.setHeader('location', named ? next : '/signup/?google=1&next=' + encodeURIComponent(next)); res.setHeader('cache-control', 'no-store'); res.end();
}

// ── the handler ───────────────────────────────────────────────────────────
async function handler(req, res) {
  try {
    const url = new URL(req.url, 'http://x'), q = url.searchParams;
    let op = q.get('op') || '';
    if (/\/auth\/google\/callback$/.test(url.pathname)) op = 'callback';
    else if (/\/auth\/google$/.test(url.pathname)) op = 'google';
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
      case 'revert': return await opRevert(await pageOf(body.page), req, res, me, body, false);
      case 'strike': return await opRevert(await pageOf(body.page), req, res, me, body, true);
      case 'undo': return await opUndo(await pageOf(body.page), req, res, me, body);
      case 'role': return await opRole(req, res, me, body);
      case 'page': return await opPage(req, res, me, body);
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
                         CHAOS, PERIODS, MIN_OPEN_H, VOTE, FEATS_DEFAULT });
// …and for api/auth.js (the accounts) and api/hill.js (a yard of one's own, and proposals to it): who
// is asking, the session's two cookies, the names, and the checks a piece that other people's browsers will draw has to pass
Object.assign(handler, { whoIs, isMod, sessionOf, setSession, clearSession, sameSite, localPath, answer, readBody, Bad, bad, text, sha, ipHash,
                         rename, cleanName, tagOf, foldName, ensureTag, audit, tell, tagsOf, habits, rulesOf, cleanRecord, cleanTracing, cleanPic, KINDS, GIF_RE, VID_RE, USER_RE, SLUG_RE, SESSION_DAYS });
