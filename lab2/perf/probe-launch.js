#!/usr/bin/env node
/* probe-launch.js — the things a page owes whoever is sent its address, read
   straight off the files (no browser, no server). Written 2026-09-26, when a
   launch checklist found the front page asking for /stickers.js and
   /benches.js and getting the 404 page: lab 2 is served at / by rewrite, so
   a file beside lab.js answers only if vercel.json names it, twice
   (ADDING.md). That list went stale once; this reads it back.

     1 · every file lab2/index.html asks for by a relative address has a
         rewrite from the root, and the root-level ones a cache rule
     2 · every public page has a title, a description and a card (og:title,
         og:description, og:image, twitter:card) and one <h1>; every
         signed-in page says noindex
     3 · every address in sitemap.xml has a file behind it that is not
         noindex and whose canonical is that address
     4 · the files a crawler or a phone asks for by name are there

     node lab2/perf/probe-launch.js          (from site/) */
'use strict';
const fs = require('fs');
const path = require('path');
const SITE = path.join(__dirname, '..', '..'), ORIGIN = 'https://www.knoll.space';
const read = f => fs.readFileSync(path.join(SITE, f), 'utf8');
const there = f => fs.existsSync(path.join(SITE, f));

const fails = []; let n = 0;
const ok = (cond, what) => { n++; if (!cond) fails.push(what); console.log((cond ? '  ok   ' : '  FAIL ') + what); };

// ── 1 · the front page's files, asked for at / ───────────────────────────────
const vercel = JSON.parse(read('vercel.json'));
const lands = p => {   // where a rewrite sends a root address, or null
  for (const r of vercel.rewrites) {
    if (r.source === p) return r.destination;
    const m = /^(\/[^:]+\/):path\*$/.exec(r.source);
    if (m && p.startsWith(m[1])) return r.destination.replace(':path*', p.slice(m[1].length));
  }
  return null;
};
const cached = vercel.headers.map(h => h.source).join('\n');
const lab2 = read('lab2/index.html');
const asked = [...new Set([...lab2.matchAll(/<(?:script|link)\b[^>]*?\s(?:src|href)="([^"]+)"/g)].map(m => m[1]))]
  .filter(u => !/^(\/|\.\.\/|https?:|data:|#)/.test(u));
for (const u of asked) {
  const to = lands('/' + u);
  ok(to === '/lab2/' + u && there('lab2/' + u), '/' + u + ' is rewritten to a file that exists');
  if (!u.includes('/')) ok(cached.includes(u.replace('.', '\\.')), '/' + u + ' has its cache rule');
}

// ── 2 · what each page says of itself ───────────────────────────────────────
const head = html => (/<head[^>]*>([\s\S]*?)<\/head>/i.exec(html) || [, ''])[1];
const meta = (h, k) => { const m = new RegExp('<meta\\s+(?:name|property)="' + k + '"\\s+content="([^"]*)"', 'i').exec(h); return m ? m[1] : null; };
const PUBLIC = ['lab2/index.html', 'toem2/index.html', 'ironhive/index.html', 'login/index.html', 'signup/index.html',
                'privacy/index.html', 'terms/index.html', 'space.html', 'YardView/index.html', 'coming-soon.html'];
const SIGNED_IN = ['yard/index.html', 'yard/new/index.html', 'dashboard/index.html', 'dashboard/edits/index.html', 'settings/index.html'];
for (const f of PUBLIC.concat(SIGNED_IN)) {
  // a page not in this tree yet (terms/, while it waits on its placeholders) is not a failure here:
  // the sitemap's check below is what says whether anything that is FOR search is missing
  if (!there(f)) { console.log('  --   ' + f + ' is not in this tree, skipped'); continue; }
  const html = read(f), h = head(html), title = (/<title>([^<]*)<\/title>/.exec(h) || [, ''])[1];
  ok(title.trim().length > 3, f + ' has a title ("' + title + '")');
  ok(/<html\b[^>]*\blang="/.test(html), f + ' says what language it is in');
  ok((html.replace(/<!--[\s\S]*?-->/g, '').match(/<h1\b/g) || []).length === 1, f + ' has one <h1>');
  if (SIGNED_IN.includes(f)) { ok(/noindex/.test(meta(h, 'robots') || ''), f + ' is not for search'); continue; }
  const d = meta(h, 'description') || '';
  ok(d.length >= 50 && d.length <= 160, f + ' has a description of a search result\'s length (' + d.length + ')');
  ok(meta(h, 'og:title') === title && meta(h, 'og:description') === d, f + ' has a card that says what the page says');
  ok(meta(h, 'twitter:card') === 'summary_large_image', f + ' asks for the large card');
  const img = meta(h, 'og:image') || '';
  ok(img.startsWith(ORIGIN + '/') && there(img.slice(ORIGIN.length + 1)), f + ' has a picture for its card, and the file is there');
}

// ── 3 · the sitemap ─────────────────────────────────────────────────────────
const locs = [...read('sitemap.xml').matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
ok(locs.length > 0, 'sitemap.xml lists ' + locs.length + ' addresses');
for (const loc of locs) {
  const p = loc.slice(ORIGIN.length);
  const to = lands(p), file = (to ? to : p.endsWith('/') ? p + 'index.html' : p).slice(1);
  if (!loc.startsWith(ORIGIN + '/') || !there(file)) { ok(false, loc + ' has a file behind it'); continue; }
  const h = head(read(file));
  ok(!/noindex/.test(meta(h, 'robots') || ''), loc + ' is for search (' + file + ' does not say noindex)');
  ok((/<link rel="canonical" href="([^"]+)"/.exec(h) || [])[1] === loc, loc + ' is its own canonical address');
}

// ── 4 · asked for by name ───────────────────────────────────────────────────
for (const f of ['robots.txt', 'sitemap.xml', 'favicon.ico', 'apple-touch-icon.png', '404.html', 'logo/og.jpg', 'logo/logo-icon.svg']) ok(there(f), '/' + f + ' is there');
ok(/^Sitemap: https:\/\/www\.knoll\.space\/sitemap\.xml$/m.test(read('robots.txt')), 'robots.txt names the sitemap');

console.log('\n' + (fails.length ? fails.length + ' of ' + n + ' FAILED:\n  ' + fails.join('\n  ') : 'all ' + n + ' ok'));
process.exit(fails.length ? 1 : 0);
