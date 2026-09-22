/* toem2/session.js — A SESSION FOR THE DEV SERVER, WITHOUT GOOGLE (2026-09-17).

   On the deployed site you sign in with Google. On localhost there is
   usually no Google client set up, and the live half of the page
   (?live=1) still wants a session to submit, review, revert. This mints
   one straight into the dev store (toem2/wall-db.json, the same file the
   server reads) and prints the line to paste into the browser's console
   on the bench — nothing leaves this machine.

   Run, from site/:  node toem2/session.js               (an admin called "owner")
                     node toem2/session.js fan mod        (a moderator called "fan")
                     node toem2/session.js fan trusted    (a trusted user)
                     node toem2/session.js fan            (a newcomer) */
'use strict';
const crypto = require('crypto');
if (process.env.VERCEL || process.env.KV_REST_API_URL) { console.log('this is for the dev server\'s file store only'); process.exit(1); }
delete process.env.KV_REST_API_URL; delete process.env.UPSTASH_REDIS_REST_URL;
const API = require('../api/wall.js');
const name = String(process.argv[2] || 'owner').replace(/[^\w -]/g, '').slice(0, 24) || 'owner';
const role = ['user', 'trusted', 'mod', 'admin'].includes(process.argv[3]) ? process.argv[3] : (process.argv[2] ? 'user' : 'admin');
(async () => {
  const u = crypto.createHash('sha256').update('dev:' + name).digest('hex').slice(0, 16);
  await API.db('HSET', API.K.user(u), 'made', String(Date.now()), 'name', name, 'role', role);
  const s = await API.mintSession(u);
  console.log(role + ' "' + name + '" (' + u + ') — paste this into the console on http://localhost:4321/toem2/?live=1 and reload:\n');
  console.log("localStorage.setItem('knoll-toem2:token', '" + s + "')");
})();
