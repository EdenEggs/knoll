#!/usr/bin/env node
/* probe-legal.js — /privacy/ AND /terms/, HELD AGAINST THE CODE (2026-09-28)
   The two pages say what the doors do, in numbers: fifty names, ninety days,
   three spaces, two strikes. This reads each number out of api/*.js and looks
   for the words that quote it, so a constant changed in the code is a line to
   change on the page (and its LAST CHANGED stamp) — the failure says which.
   And the pages themselves: every contents link lands on a section and every
   section is in the contents, the two pages point at each other, both give
   the contact address, and the owner's yellow blanks are counted.

     node lab2/perf/probe-legal.js             (no server, no browser: it reads the files)
     FILLED=1 node lab2/perf/probe-legal.js    (before the pages ship: a blank left is a failure)
*/
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const PAGE = { privacy: read('privacy/index.html'), terms: read('terms/index.html') };
const words = html => html.replace(/<!--[\s\S]*?-->/g, ' ').replace(/<style[\s\S]*?<\/style>/g, ' ').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');
const TEXT = { privacy: words(PAGE.privacy), terms: words(PAGE.terms) };

let n = 0, failed = 0;
const ok = (v, what) => { n++; if (!v) { failed++; console.log('  FAIL ' + what); } return !!v; };
const named = name => new RegExp('(?:const|,)\\s*' + name + '\\s*=\\s*(\\d+)\\b');

// [the file, how to find the number in it, the number the page was written for, the page, the words that quote it]
const FACTS = [
  ['api/wall.js', named('NAMES_KEEP'), 50, 'privacy', 'the last fifty names'],
  ['api/wall.js', named('NAMES_KEEP'), 50, 'terms', 'The last fifty names'],
  ['api/wall.js', named('NOTES_KEEP'), 50, 'privacy', 'the last fifty things'],
  ['api/wall.js', named('SESSION_DAYS'), 90, 'privacy', 'ninety days'],
  ['api/wall.js', named('LOG_KEEP'), 500, 'privacy', 'its last five hundred changes'],
  ['api/wall.js', named('REV_DAYS'), 180, 'privacy', 'a hundred and eighty days'],
  ['api/wall.js', named('QUEUE_DAYS'), 7, 'privacy', 'lapses after a week'],
  ['api/wall.js', named('EDIT_DAYS'), 30, 'privacy', 'its record is kept a month'],
  ['api/wall.js', named('AUDIT_KEEP'), 1000, 'privacy', 'the last thousand entries'],
  ['api/wall.js', named('SPACES_MAX'), 3, 'terms', 'up to three spaces'],
  ['api/wall.js', named('SPACES_MAX'), 3, 'terms', 'among the three you may create'],
  ['api/wall.js', named('STRIKE'), 5, 'terms', 'takes five points of standing'],
  ['api/wall.js', /Math\.min\(days\.length - STRIKE, (\d+)\)/, 2, 'terms', 'leaves no more than two'],
  ['api/wall.js', named('APPROVER_COST'), 2, 'terms', 'takes two from whoever approved'],
  ['api/wall.js', named('STRIKES_BAN'), 2, 'terms', 'Two strikes'],
  ['api/wall.js', named('STRIKE_DAYS'), 30, 'terms', 'within thirty days'],
  ['api/wall.js', /me\.rep >= (\d+)\)\) throw bad\(403, 'role', 'voting/, 1, 'terms', 'at least one point of standing'],
  ['api/wall.js', /SET', K\.oauth\(state\), [^\n]*'EX', (\d+)\)/, 600, 'privacy', 'lives ten minutes'],
  ['api/auth.js', /CODE = \{ ttl: (\d+)/, 600, 'privacy', 'for ten minutes'],
  ['api/hill.js', named('KEEP'), 40, 'privacy', 'its last forty saves'],
  ['api/hill.js', named('PROP_DAYS'), 7, 'privacy', 'a week while it waits'],
  ['api/hill.js', named('PROP_KEEP'), 30, 'privacy', 'a month once it is decided'],
  ['api/board.js', /KIND = \{ posts: (\d+)/, 100, 'privacy', 'the newest hundred entries of a tab'],
  ['api/board.js', /threads: (\d+)/, 500, 'privacy', 'five hundred of a forum'],
  ['api/board.js', named('CHAT_KEEP'), 200, 'privacy', 'two hundred lines of chat'],
  ['api/gallery.js', named('KEEP'), 200, 'privacy', 'its newest two hundred photos'],
  ['api/gallery.js', /'x-cache-control-max-age': '(\d+)'/, 31536000, 'privacy', 'for up to a year']
];
const SRC = {};
for (const [file, find, was, page, quote] of FACTS) {
  const m = find.exec(SRC[file] || (SRC[file] = read(file)));
  if (!ok(m, file + ': ' + find + ' finds nothing — the number /' + page + '/ quotes as "' + quote + '" has moved')) continue;
  ok(+m[1] === was, file + ' says ' + m[1] + ' where /' + page + '/ was written for ' + was + ': "' + quote + '" — change the page, its stamp, and this line');
  ok(TEXT[page].includes(quote), '/' + page + '/ no longer says "' + quote + '"');
}

// what the gate asks Google and Discord for, as the privacy page names it
const wall = SRC['api/wall.js'];
ok(/scope: 'openid email'/.test(wall) && /openid and email scopes/.test(TEXT.privacy), 'Google is asked for openid and email, and /privacy/ says so');
ok(/scope: 'identify email'/.test(wall) && /identify and email scopes/.test(TEXT.privacy), 'Discord is asked for identify and email, and /privacy/ says so');
for (const c of [...wall.matchAll(/(?:COOKIE|HINT|OAUTH) = '(knoll_\w+)'/g)].map(m => m[1])) ok(TEXT.privacy.includes(c), '/privacy/ names the cookie ' + c);

// what a visitor's browser is sent to fetch, or to tell somebody else — said on /privacy/ exactly while the code does it
const does = (f, re) => fs.existsSync(path.join(ROOT, f)) && re.test(read(f)), says = s => TEXT.privacy.includes(s);
const both = (code, page, what) => ok(code === page, what + ': the code ' + (code ? 'does' : 'does not') + ', /privacy/ ' + (page ? 'says so' : 'does not say so'));
both(does('toem2/cursors.js', /joinRoom/), says('Other people\'s pointers'), 'pointers from browser to browser');
ok(!says('five public relays') || /\bms=5\b/.test(read('toem2/vendor/trystero-nostr.js')), '/privacy/ says five relays, and the pointers\' library no longer announces on five');
both(does('yard/tools.js', /visit: \{ hill: HILL/) && does('yard/tools.js', /script\.google\.com\/macros/), says('your browser sends one line to a Google Sheet'), 'a yard\'s visits counted in a Google Sheet');
both(does('yard/tools.js', /note: \{ hill: HILL/), says('left on a yard\'s fence is kept in the same sheet'), 'the fence kept in that sheet');
both(does('coming-soon.html', /JSON\.stringify\(\{ email/) && /"\/coming-soon"/.test(read('vercel.json')), says('waiting list on the coming-soon page'), 'the waiting list keeping an address');
both(does('toem2/wall.js', /i\.ytimg\.com/), says('a still from YouTube'), 'a video\'s still from YouTube');
both(does('toem2/wall.js', /youtube-nocookie\.com\/embed/), says('YouTube\'s no-cookie player'), 'a video played from YouTube\'s no-cookie player');
both(/klipy/.test(wall), says('comes from KLIPY'), 'gifs from KLIPY');
both(does('support.js', /unpkg\.com\/react/), says('from unpkg'), 'React from unpkg');
both(does('dashboard/index.html', /fonts\.googleapis\.com\/css/) || does('coming-soon.html', /fonts\.googleapis\.com\/css/), says('Google Fonts'), 'lettering from Google Fonts');
both(does('api/gallery.js', /H\.blob\.url\(key\)/), says('An album\'s photos come from Vercel\'s file store'), 'album photos from the Blob store');
// who is on a wall now (api/board.js: WHO IS HERE) — said while the door keeps it, for as long as the door keeps it
both(does('api/board.js', /K\.here\(slug\)/) && does('toem2/board.js', /'&here='/), says('among those who are there now'), 'who has a wall open, shown to the others on it');
ok(!says('among those who are there now') || (/HERE_S = 90\b/.test(read('api/board.js')) && says('a minute and a half after it last heard') && /HERE_EVERY = 30000\b/.test(read('toem2/board.js')) && says('about every half minute')),
   '/privacy/ says who is here is told every half minute and kept a minute and a half, and the code keeps to both');
both(does('api/board.js', /'HSETNX', K\.joined\(slug\)/) && does('api/wall.js', /q\.get\('history'\)/), says('the first time you opened that wall while signed in'), 'the first time an account opened a wall, kept for its moderators');
// the two stickers on a yard (2026-09-28): what the public card says of them, said while it says it — and the hundred thousand is the code's
both(does('api/wall.js', /who\.founder = founder/), says('your number among the first hundred thousand accounts'), 'an account\'s number among the founding gnomes, on its public card');
ok(!says('the first hundred thousand accounts') || /FOUNDERS_MAX = 100000\b/.test(wall), '/privacy/ says the first hundred thousand, and the code numbers that many');
both(does('api/wall.js', /who\.here = month\(first\)/), says('the month you first opened TOEM 2 while signed in'), 'the month an account first opened TOEM 2, on its public card');

// the pages themselves
const STAMP = /LAST CHANGED · \d{1,2} [A-Z]{3} \d{4}/;
for (const [page, other] of [['privacy', 'terms'], ['terms', 'privacy']]) {
  const html = PAGE[page];
  const ids = [...html.matchAll(/<section id="([^"]+)"/g)].map(m => m[1]), links = [...html.matchAll(/href="#([^"]+)"/g)].map(m => m[1]);
  links.forEach(h => ok(ids.includes(h), '/' + page + '/ links #' + h + ', which is no section'));
  ids.forEach(id => ok(links.includes(id), '/' + page + '/ has a section #' + id + ' its contents do not list'));
  ok(new Set(ids).size === ids.length, '/' + page + '/ has two sections of one name');
  ok(STAMP.test(words(html)), '/' + page + '/ carries a LAST CHANGED stamp');
  ok(html.includes('href="/' + other + '/"'), '/' + page + '/ links /' + other + '/');
  ok(html.includes('href="mailto:contact@knoll.space"'), '/' + page + '/ gives the contact address');
  ok((html.match(/<p\b/g) || []).length === (html.match(/<\/p>/g) || []).length && (html.match(/<section\b/g) || []).length === (html.match(/<\/section>/g) || []).length, '/' + page + '/ closes what it opens');
}

const blanks = Object.keys(PAGE).flatMap(p => [...PAGE[p].matchAll(/<mark class="fill">([^<]*)<\/mark>/g)].map(m => '/' + p + '/ ' + m[1]));
if (process.env.FILLED) ok(!blanks.length, 'the owner\'s blanks are all filled (left: ' + blanks.join(' · ') + ')');
// the age is said on both pages, and must be the same on both
const age = p => (/(?:at least|anyone under) (?:<mark class="fill">)?\[?(\d+)\]?/.exec(PAGE[p]) || [])[1];
ok(age('privacy') && age('privacy') === age('terms'), 'both pages give the same minimum age (' + age('privacy') + ' and ' + age('terms') + ')');

console.log((blanks.length ? '  the owner\'s blanks, still to fill: ' + blanks.join(' · ') + '\n' : '') +
            '  stamps: /privacy/ ' + (STAMP.exec(TEXT.privacy) || ['none'])[0] + ' · /terms/ ' + (STAMP.exec(TEXT.terms) || ['none'])[0] + '\n' +
            'probe-legal: ' + n + ' checks, ' + (failed ? failed + ' FAILED' : 'all good'));
process.exit(failed ? 1 : 0);
