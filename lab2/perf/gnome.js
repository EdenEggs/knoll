/* lab2/perf/gnome.js — a gnome of the probes' own, signed in (2026-09-21).

   /yard and /dashboard are a signed-in account's pages now (api/auth.js), so
   a probe that opens them signs up a throwaway account first, through its
   browser context's own request — whose cookies are the page's. A new
   account every time, so the yard opens the way a new gnome's does, tour
   and all. It is a real account in whatever store the server keeps: run the
   probes against a server with a throwaway store (WALL_DB and HILL_ROOT in a
   temp folder) when the owner's own toem2/wall-db.json is not the place for
   them.

     await require('./gnome').signIn(ctx, URL);                             */
'use strict';
module.exports.signIn = async (ctx, url) => {
  const base = new URL(url).origin, run = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const r = await ctx.request.post(base + '/api/auth', {
    headers: { origin: base },
    data: { op: 'signup', name: 'Probe ' + run.slice(-4), email: 'probe-' + run + '@example.com', password: 'probe-' + run }
  });
  if (!r.ok()) throw new Error('could not sign a probe in at ' + base + ': ' + r.status() + ' ' + (await r.text()).slice(0, 160));
};
