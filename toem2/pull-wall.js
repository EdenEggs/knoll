/* toem2/pull-wall.js — THE LIVE WALL, PULLED INTO THE FILE (2026-09-17).

   api/wall.js holds the wall now; wall-seed.json is what a site with no
   door opens on, and the one copy git keeps. This asks a site's door for
   the wall as it stands and writes it out through serve.js's seedText, one
   piece to a line, so the diff reads — run it before a deploy, or whenever
   the history is worth a commit.

   Run, from site/:  node toem2/pull-wall.js https://knoll.space
                     node toem2/pull-wall.js                 (the dev server, localhost:4321) */
'use strict';
const fs = require('fs'), path = require('path');
const { seedText } = require('../serve.js');

const site = String(process.argv[2] || 'http://localhost:4321').replace(/\/+$/, '');
(async () => {
  let doc, status;
  try { const r = await fetch(site + '/api/wall', { cache: 'no-store' }); status = r.status; doc = await r.json(); }
  catch (e) { console.log('no answer from ' + site + '/api/wall: ' + e.message); process.exit(1); }
  if (!doc || !doc.ok || !doc.wall) { console.log(site + '/api/wall did not answer with a wall: ' + status + ' ' + ((doc && doc.error) || '')); process.exit(1); }
  const seed = { cam: doc.cam, cam_narrow: doc.cam_narrow, wall: { items: doc.wall.items.filter(Boolean) }, flatfile: { list: (doc.flatfile && doc.flatfile.list) || [] } };
  const file = path.join(__dirname, 'wall-seed.json');
  fs.writeFileSync(file, seedText(seed));
  console.log('wall-seed.json ← ' + site + ' revision ' + doc.rev + ' · ' + seed.wall.items.length + ' pieces, ' + seed.flatfile.list.length + ' tracings');
})();
