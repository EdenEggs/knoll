#!/usr/bin/env node
/* probe-live-gate.js — THE GATE AS IT STANDS ON THE LIVE SITE (2026-09-28)
   Whether Google, Discord and the postman are switched on where people
   actually sign in — which is the environment's to say (Vercel's variables,
   the domain's DNS), not the code's: verify-auth.js and probe-gate-google.js
   prove the code, this proves the setup. Reads only; signs nobody in.

   A WAY IN (Google, Discord) is checked without an account of theirs:
     · /api/auth says it is on (both <NAME>_CLIENT_ID and _SECRET are set)
     · /auth/<name> sends the browser to them, with this site's callback and
       a state that is also in the knoll_o cookie
     · the callback without that cookie is turned away
     · the callback WITH it and a made-up code gets as far as their token
       door: "invalid_grant" / Invalid "code" means they took the secret and
       refused the code — the secret is right; "invalid_client" means the
       secret in Vercel is not this application's
   THE POSTMAN: /api/auth says mail is on (RESEND_API_KEY), and the domain's
   DNS carries Resend's three records (resend._domainkey, send, rsend) —
   without them Resend sends nothing from knoll.space. A letter really arriving is the owner's to try: forgot
   password on /login, with an address of their own.

     node lab2/perf/probe-live-gate.js                 (the live site)
     BASE=http://localhost:4321 node lab2/perf/probe-live-gate.js
*/
'use strict';
const dns = require('dns').promises;

const BASE = (process.env.BASE || 'https://www.knoll.space').replace(/\/+$/, '');
const MAIL_DOMAIN = process.env.MAIL_DOMAIN || 'knoll.space';
let n = 0, failed = 0;
const ok = (v, what) => { n++; if (!v) failed++; console.log((v ? '  ok   ' : '  FAIL ') + what); return !!v; };
const get = (path, headers) => fetch(BASE + path, { redirect: 'manual', headers: headers || {}, signal: AbortSignal.timeout(20000) });
const words = html => String(html).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

const WAYS = {
  google: { ask: 'https://accounts.google.com/o/oauth2/v2/auth', right: /invalid_grant|bad request|malformed/i, wrong: /client secret is invalid|invalid_client|unauthorized/i },
  discord: { ask: 'https://discord.com/oauth2/authorize', right: /invalid_grant|invalid "code"|invalid code/i, wrong: /invalid_client|invalid client/i }
};

async function wayIn(name, on) {
  console.log('\n' + name);
  if (!ok(on, '/api/auth says ' + name + ' is on')) { console.log('       (' + name.toUpperCase() + '_CLIENT_ID and ' + name.toUpperCase() + '_CLIENT_SECRET in Vercel, Production — then a redeploy)'); return; }
  const hop = await get('/auth/' + name), to = hop.headers.get('location') || '';
  const q = new URL(to || 'http://x').searchParams, state = q.get('state') || '';
  const jar = (hop.headers.getSetCookie ? hop.headers.getSetCookie() : []).find(c => c.startsWith('knoll_o=')) || '';
  ok(hop.status === 302 && to.startsWith(WAYS[name].ask), '/auth/' + name + ' sends the browser to ' + WAYS[name].ask);
  ok(q.get('redirect_uri') === BASE + '/auth/' + name + '/callback', 'it names this site\'s callback (' + q.get('redirect_uri') + ')');
  ok(state.length >= 16 && jar.startsWith('knoll_o=' + state + ';'), 'the state is in the knoll_o cookie');
  ok(/HttpOnly/i.test(jar) && /SameSite=Lax/i.test(jar) && (!BASE.startsWith('https:') || /Secure/i.test(jar)), 'the cookie is HttpOnly, Lax' + (BASE.startsWith('https:') ? ' and Secure' : ''));
  const back = '/auth/' + name + '/callback?state=' + encodeURIComponent(state) + '&code=made-up-code-0000';
  const bare = await get(back);
  ok(bare.status === 400 && /another browser/i.test(words(await bare.text())), 'the callback without the cookie is turned away');
  const said = words(await (await get(back, { cookie: 'knoll_o=' + state })).text());
  const wrong = WAYS[name].wrong.test(said);
  ok(!wrong && (WAYS[name].right.test(said) || /did not sign you in/i.test(said)), wrong ? 'the secret in Vercel is NOT this application\'s: ' + said.slice(0, 160)
                                                                                         : 'the secret is accepted (a made-up code is refused: ' + said.slice(0, 120) + ')');
}

async function postman(on) {
  console.log('\nthe postman');
  if (!ok(on, '/api/auth says mail is on')) console.log('       (RESEND_API_KEY in Vercel, Production — then a redeploy)');
  /* Resend's records as its dashboard gave them on 2026-09-28: a DKIM key, and two names handed to
     Resend by CNAME (send → send.forge.rmta.net, rsend → rsend.forge.rmta.net), which is where the
     bounce address's MX and SPF then come from. Asked as MX and TXT, which follow a CNAME — so the
     older shape (an MX and an SPF TXT written on send itself) passes the same checks. */
  const look = (what, p) => p.then(v => v, () => []).then(v => ({ what, v }));
  const [key, mx, spf, mx2] = await Promise.all([look('resend._domainkey.' + MAIL_DOMAIN, dns.resolveTxt('resend._domainkey.' + MAIL_DOMAIN)),
                                                 look('send.' + MAIL_DOMAIN, dns.resolveMx('send.' + MAIL_DOMAIN)),
                                                 look('send.' + MAIL_DOMAIN, dns.resolveTxt('send.' + MAIL_DOMAIN)),
                                                 look('rsend.' + MAIL_DOMAIN, dns.resolveMx('rsend.' + MAIL_DOMAIN))]);
  const said = l => (l.v.length ? ' (' + l.v.map(m => m.exchange).join(', ') + ')' : '');
  ok(key.v.some(t => /p=/.test(t.join(''))), 'DNS: ' + key.what + ' TXT carries a DKIM key');
  ok(mx.v.length > 0, 'DNS: ' + mx.what + ' leads to Resend\'s bounce mailbox' + said(mx));
  ok(spf.v.some(t => /^v=spf1\b/i.test(t.join(''))), 'DNS: ' + spf.what + ' carries an SPF record');
  ok(mx2.v.length > 0, 'DNS: ' + mx2.what + ' leads to Resend\'s bounce mailbox' + said(mx2));
}

(async () => {
  console.log('the gate at ' + BASE);
  const r = await get('/api/auth'), a = await r.json().catch(() => ({}));
  ok(r.status === 200 && a.ok && a.open, '/api/auth answers, and the store is open');
  await wayIn('google', a.google);
  await wayIn('discord', a.discord);
  await postman(a.mail);
  console.log('\nprobe-live-gate: ' + n + ' checks, ' + (failed ? failed + ' FAILED' : 'all good'));
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error('probe-live-gate: ' + String((e && e.stack) || e)); process.exit(2); });
