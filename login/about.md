# login — how it works

A tour of `site/login/` for whoever opens it next, agent or otherwise.
**Read `site/signup/about.md` first** — this page is that page's twin, drawn from
it, and almost everything true there is true here. This file covers the twin
half: what differs, and what does not.

---

## 1 · What this is

**Log in** is the gate a returning resident comes back through. Same scroll,
same gnome in the left margin with the same spring-loaded arm, same paper — but
a shorter form (an email and one secret word, plus a *keep the gate unlatched
for me* tick) and, in place of the sign-up page's wax seal, **a lock and a
key**. Pressing it sends the gnome's hand to fetch the key, carry it across,
fit it in the lock and turn it; the shackle springs open on the way through.

Served at `/login`, alongside `/lab`, `/lab2`, `/yard`, `/dashboard` and
`/signup`.

**Since 2026-09-21 the gate is real**: turning the key opens an account made at
`/signup` and sends you back where you came from. See §4.

**Plain words (2026-09-23).** The copy is now ordinary log-in wording (Email / Password, "Forgot your password?", "Remember me", "Log in", "Continue with Google", "Don't have an account? Sign up"), with the labels above their inputs as real `<label for>`s. The quoted strings elsewhere in this file are the export's originals; the mechanics are unchanged. `node lab2/perf/probe-gate-google.js` walks this page, /signup and the Google flow in headless Chrome.

---

## 2 · The files

| file | what it is |
|---|---|
| `index.html` | the whole page: head, the `<x-dc>` template, and the `class Component extends DCLogic` script. |
| `support.js` | the Design Canvas runtime, copied from `../support.js`. Not ours — edit the root copy and re-copy, don't edit here. |

---

## 3 · Where this came from, and how it differs from its twin

Design Canvas export — `Downloads/features/Knoll Log In.html`. Same bundler
shape, and **it arrived fully wired** like the sign-up page: 93 `{{ }}`
occurrences, 78 distinct, of which two are the literals `{{ true }}` /
`{{ false }}`; the other 76 all resolve. The runtime blob gunzips
byte-identical to `site/support.js`, there are 16 uuid references (1 runtime +
15 fonts) and no `http(s)` URL anywhere.

The integration is **the same as `/signup`'s, done the same way** — runtime →
`./support.js`, the fifteen inlined `@font-face` rules → one link at
`../lab2/fonts/fonts.css` (again character-for-character that file once the
`src:url()` is stripped), a `<title>`, and the favicon in the real `<head>`
rather than the helmet so Chrome never asks for `/login/favicon.ico`. React
comes off `../lab2/vendor/` with `support.js`'s own SRI hashes, so this page too
has **zero third-party requests**. `signup/about.md` §3 explains each of those
and why they depart from what `/yard` and `/dashboard` do; the reasoning is
identical and is not repeated here.

**`renderVals()` returns fifteen keys this page never binds** — `nameRef`,
`name`, `onName`, `pw2`, `interlude` and friends. They are the sign-up page's,
left behind when this one was drawn from it. Harmless, and left alone: they are
the export's, and trimming them would be an edit with no effect.

### The one thing the export could not wire itself

The page carried `<a href="Knoll Sign Up.html">Petition for residency</a>` — a
link to the Design Canvas file it was drawn beside, which on the site is a
folder, not a file. It now reads `../signup/`. The sign-up page's reciprocal
link, `Already a resident? Log in at the gate`, was an `href="#"` and now points
at `../login/`. Both were verified to navigate.

### The house bar

Both gate pages wear lab 2's header now: a white bar across the top with the
Knoll mark and wordmark at the left, linking `../`. It is
`lab2/lab.css`'s `.lab-head` / `.lab-brand` rules with the token values written
out (`--card` `#fdfbfd`, `--line` `#e2d4df`, `--ink` `#26212a`, `--display`
Sora) — these pages do not load `lab.css`, and the only other thing they would
need from it is Sora 800, which `fonts.css` already carries.

`position: absolute` rather than `fixed`, so it sits at the top of the document
and scrolls away with it the way lab 2's own header does. The root div is
`position: relative`, so the bar anchors to it and spans it **without** joining
its flex row — which is what keeps the scroll centred. The root's `padding-top`
went from the export's `40px` to `92px` to clear it: 51.5px of bar (12 + 26 +
12 + 1.5) plus the export's own 40px gap.

`href="../"` is where lab 2's brand link goes too. Note that **locally that is
a 404** — there is no `site/index.html`, and the `/` → `/lab2/index.html`
rewrite lives in `vercel.json` and is Vercel-only. On the deployed site it
lands on the front page. Same behaviour as lab 2's own brand; not a bug in
these pages.

---

## 4 · The gate (2026-09-21)

Turning the key posts `{ op: 'login', email, password, remember }` to
`/api/auth` while the hand fetches, carries, fits and turns it: the lock
opens once the door says yes and jams on a no — the ejected key, the wagging
hand, the jostled lock and the note in the margin are the export's, and the
note's words are now the door's (*that is not the secret word the gate
remembers*, the same for an address with no account; *this address comes in
with Google*; the hour's caps). The pretend server — `pw === '0'` — is gone.

Then you go to `?next=` (a path on this site, checked as `/signup` checks it)
or to your yard; *the gate swings open · into the village →* is the same
address, worded for where it goes. **Keep the gate unlatched for me** is real:
ticked, ninety days; unticked, a cookie that ends with the browser (and a day
at most in the store). **Google knows me** goes to Google when the site has
Google set up, and says so in the margin when it has not. **Forgotten it? ask
the gatekeeper** says, in the margin, that the gatekeeper cannot post a new key
yet — there is no post; the address is not even kept (`signup/about.md` §5).

**Terms of Residency** is still `href="#"`. `signup/about.md` §5 has the
setup on Vercel and the probes; `probe-login.js` still drives the page, and
its happy path now needs an account that exists.

## 5 · Changes to the export

**The same two as `/signup`, because this page inherited both from it.** Marked
in the file as `KNOLL-LOGIN FIX n of 2`. If the export is replaced, re-apply
them — better, fix them upstream in the Design Canvas source, where fixing them
once would fix both pages. `signup/about.md` §4 has the full write-up; in brief:

**1 · The `localStorage` read was unguarded.** `knoll-login:seen` is read in
`componentDidMount` while the matching write is already in a `try/catch`. Where
storage throws, that read ends the mount, `unroll()` is never scheduled and the
rAF loop never starts — a shut scroll and a stranded hand. Reproduced with
`localStorage` stubbed to throw, then confirmed fixed: no errors, unrolls to
781px.

**2 · The paper was measured once and stayed that size.** Same `unroll` code,
same consequence: margin notes grow the form, and under 800px they stack under
their fields instead, so the surplus hangs out below the bottom roller. Same
`ResizeObserver` fix (`watchPaper()`), gated on `state.open`, keeping a pixel
height so the roll-up still animates.

Everything else came across verbatim: apart from those two and the sign-up
link, the markup and component source are byte-identical to the export.

**Known and left alone**, same as its twin: focus dies when the lock button
takes a real `disabled` mid-press; the timers are never cancelled; the button's
`aria-label` does not change across states; the three dead links above.

---

## 6 · Things worth knowing

Everything in `signup/about.md` §6 applies here unchanged — no `vercel.json`
entry needed, Vercel's default caching, the slash-less `/login` resolving
`./support.js` to the **root** `support.js` (so don't delete it), the page
fetching itself twice because `window.__resources` is unset, and `sc-else` not
existing in this runtime.

**localStorage:** one key, `knoll-login:seen`, used only to pick the unroll
speed. It is a *different* key from the sign-up page's `knoll-signup:seen`, so
the two pages do not share a "seen" state.

**Testing.** `lab2/perf/probe-login.js` covers boot, the house bar's geometry,
the sign-up link, the arm, validation, the key's state machine, the wrong-word
path, Google, remember-me, the narrow layout and the blocked-storage
reproduction — one file, since this page has no separate `outcome` prop to
drive. `node serve.js` first, then `node probe-login.js` from `lab2/perf/`.
Real Chrome through Playwright, not the in-app preview pane, which runs hidden
and so has a 0×0 viewport that refuses clicks.

**If you add a probe that clicks empty background to blur a field, do not click
near (30, 30)** — that is the house bar's brand link now, and the click
navigates away instead of blurring. The sign-up probes were moved to y=300 for
exactly this reason.

---

## The reset, and Discord (2026-09-27)

**Forgot your password?** is real. It turns the paper — `state.stage`, the way
`/signup` turns to its code step — through three of them on the one scroll:

| stage | what is on the paper | what the key does |
|---|---|---|
| `login` | email, password, remember me, the terms line | `{ op: 'login' }`, as before |
| `forgot` | the email alone | `{ op: 'reset', email }` — the door posts a six-digit code to it |
| `reset` | the code, a new password, the new password again | `{ op: 'reset', email, code, password }`, then `{ op: 'login' }` with the new password |

The door (`api/auth.js`: THE RESET) keeps the new password and **signs nobody
in**; the page logs in with it straight after, through the same post the
log-in paper makes, and the lock opens on *that* answer. If the password was
changed and the log-in was turned away (the hour's cap, say), the paper goes
back to `login` with the new password still in the blank and a note that says
both. A reset ends every session the account had. An address with no account
is told so (404 `none`); one that came in by Google or Discord has no password
to forget and is sent to those buttons (409 `google`), which is why the
`forgot` paper keeps them. With no postman (`GET /api/auth` says
`mail: false`) the link says reset is not available right now.

**Continue with Discord** is Google's button over again, to `/auth/discord`
(`api/wall.js`: THE WAYS IN BESIDE A PASSWORD). It needs `DISCORD_CLIENT_ID` and
`DISCORD_CLIENT_SECRET` in the environment and
`https://www.knoll.space/auth/discord/callback` (and the bare-domain twin)
registered as redirects on the Discord application; until then
`GET /api/auth` says `discord: false` and the button says so in the margin.

**A name that was taken twice.** `onBack` is the window coming back into focus
(it wakes the gnome). `/signup`'s "go back" was given the same name on
2026-09-24, and a class field written twice keeps the second — so the focus
and mouseenter listeners ran "go back", and coming back to the tab from
reading the code threw the code step away. Both pages call theirs
`onWrongEmail` now. **A new handler must not be named after an existing one**:
the file does not complain, the second one simply wins.

The button's `aria-label` follows the stage now (`Log in` · `Send code` ·
`Reset password`), and the wagging finger goes to the blank the no is about
(`m.wagAt`), since not every paper has a password on it.

**Checks.** `node lab2/perf/verify-auth.js` (the door: 157) and
`node lab2/perf/probe-gate-google.js` (the pages in headless Chrome: 163 — §6
is the reset, §7 Discord, and both code steps are checked against the window
losing and regaining focus).
