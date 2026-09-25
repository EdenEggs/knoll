/* lab2/perf/gnome.js — a gnome of the probes' own, signed in (2026-09-21).

   /yard and /dashboard are a signed-in account's pages now (api/auth.js), so
   a probe that opens them signs up a throwaway account first, through its
   browser context's own request — whose cookies are the page's. A new
   account every time, so the yard opens the way a new gnome's does, tour
   and all. It is a real account in whatever store the server keeps: run the
   probes against a server with a throwaway store (WALL_DB and HILL_ROOT in a
   temp folder) when the owner's own toem2/wall-db.json is not the place for
   them.

   THE CODE (2026-09-24): a sign-up is two posts (api/auth.js: THE CODE) —
   the first sends a six-figure code to the address, the second brings it
   back. Off Vercel with no RESEND_API_KEY the door writes each letter to
   outbox.jsonl beside its store. A test server started with
   probe-gate-google.js as its preload hands the newest code out at
   GET /_outbox?to=<address>, which is how a probe that cannot see the
   server's temp folder gets it; the owner's own `node serve.js` keeps its
   outbox at toem2/outbox.jsonl, which is the fallback here.

     await require('./gnome').signIn(ctx, URL);
     const code = await require('./gnome').code(ctx, BASE, email);   // the newest code posted to that address
     require('./gnome').codeIn(file, email);                          // …read straight out of an outbox file */
'use strict';
const fs = require('fs');
const path = require('path');

const codeIn = (file, email) => {
  const to = String(email).trim().toLowerCase();
  const letters = fs.readFileSync(file, 'utf8').trim().split('\n').map(l => JSON.parse(l)).filter(l => l.to === to);
  if (!letters.length) throw new Error('no letter to ' + to + ' in ' + file);
  return /\b(\d{6})\b/.exec(letters[letters.length - 1].subject)[1];
};
const code = async (ctx, base, email) => {
  const r = await ctx.request.get(base + '/_outbox?to=' + encodeURIComponent(email));
  if (r.ok()) return (await r.text()).trim();
  return codeIn(path.join(__dirname, '..', '..', 'toem2', 'outbox.jsonl'), email);
};
const signIn = async (ctx, url) => {
  const base = new URL(url).origin, run = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const who = { op: 'signup', name: 'Probe ' + run.slice(-4), email: 'probe-' + run + '@example.com', password: 'probe-' + run };
  const post = data => ctx.request.post(base + '/api/auth', { headers: { origin: base }, data });
  let r = await post(who);
  if (r.ok()) r = await post(Object.assign({ code: await code(ctx, base, who.email) }, who));
  if (!r.ok()) throw new Error('could not sign a probe in at ' + base + ': ' + r.status() + ' ' + (await r.text()).slice(0, 160));
};
module.exports = { signIn, code, codeIn };
