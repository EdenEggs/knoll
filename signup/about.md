# signup — how it works

A tour of `site/signup/` for whoever opens it next, agent or otherwise.
`site/yard/about.md` covers the personal home base and
`site/dashboard/about.md` the owner-facing analytics page; this one covers the
front door.

---

## 1 · What this is

**Sign up** is the page a new resident petitions the hill from. It is a scroll
that unrolls to show a paper form — a name, an email, a secret word and the
same secret word again — which you sign not with a button but by **pressing a
wax seal**. A gnome stands in the left margin the whole time. Their arm is on
a spring and follows your cursor; the hand swaps between five poses (point,
quill, grab, thumb, palm), their head turns toward you, their eyes track, and
if you leave the tab for twenty seconds they doze off and have to be jostled
awake. When a field is wrong they lean over and scribble the complaint in the
margin.

There is a second way in — **"Let Google vouch for me"** — which rolls the
scroll up, shows a card, and unrolls it again as a one-field form asking only
what to call you.

Served at `/signup`, alongside `/lab`, `/lab2`, `/yard` and `/dashboard` — its
own page, not a lab 2 iframe feature. **`/login` is its twin**, drawn from it
and landed the same way; `login/about.md` covers what differs, and the two link
to each other.

**Nothing it collects goes anywhere.** See §5. That is the single most
important fact on this page and the reason it is not §7.

---

## 2 · The files

| file | what it is |
|---|---|
| `index.html` | the whole page: head, the `<x-dc>` template, and the `class Component extends DCLogic` script that drives the form, the seal and the gnome. |
| `support.js` | the Design Canvas runtime, copied from `../support.js`. Not ours — edit the root copy and re-copy, don't edit here. |

No `signup.css` or `signup.js`. Unlike `/yard` and `/dashboard`, there was
never a hand-built version of this page for the export to replace; it landed
as an export first time.

---

## 3 · Where this came from

Design Canvas export — `Downloads/features/Knoll Sign Up.html`, the same
single-file "bundler" shape as every other export on this site: the real page
is JSON inside `<script type="__bundler/template">`, with the runtime and every
font bundled beside it as gzipped base64 blobs keyed by uuid.

**It arrived fully wired**, the way the Dashboard's did and the Yard's did not.
That was checked rather than assumed: the markup holds 130 `{{ }}` occurrences,
94 distinct expressions, of which two are the literals `{{ true }}` /
`{{ false }}` used only as `hint-placeholder-val`. The remaining 92 and the 92
keys `renderVals()` returns are the same set, exactly, in both directions. So
no wiring was filled in, and **the markup and the component source came across
verbatim** — byte-identical to the export apart from the two fixes in §4.

Four swaps, all of them in the head or the helmet:

- head's `<script src="…uuid…">` → `./support.js` (the blob gunzips to a file
  byte-identical to `site/support.js`, so this is a rename, not a substitution)
- the helmet's fifteen inlined `@font-face` blobs → one
  `<link rel="stylesheet" href="../lab2/fonts/fonts.css">`
- a `<title>`, which neither sibling has
- `<link rel="icon">` — in the **real `<head>`**, not the helmet where both
  siblings keep theirs. See §6.

Plus two things done later, once `/login` existed to point at — see §4a.

### Two places this is stricter than its neighbours

`dashboard/about.md` §3 describes integration as a three-line swap whose middle
line is "the inlined `@font-face` blobs → one Google Fonts link". **Do not
follow that here**, on two counts:

**The fonts are ours.** `/yard` and `/dashboard` both load
`fonts.googleapis.com/css2?family=Rye&family=VT323`. That link carries two
families; this page uses four (Kalam, Public Sans, Rye, VT323), so copying it
would silently drop half of them to a fallback. It links
`../lab2/fonts/fonts.css` instead — the fifteen faces the site already
self-hosts. That is not a substitution either: with the `src:url(…)` stripped,
the export's own fifteen rules and `fonts.css` are character-for-character
identical, comment included, because the export was generated from that file.
A relative href rather than the `/fonts/` rewrite in `vercel.json`, so the page
is also right off a bare static server.

**React is ours too.** `support.js` ends in `loadReactUmd()`, which returns
early `if (window.React && window.ReactDOM)` and otherwise fetches both from
**unpkg.com**. `/yard` and `/dashboard` do exactly that on every visit. This
page loads lab 2's vendored copies first, so it has no third party in its boot
path at all — verified: a full load makes twelve requests and every one of them
is same-origin. They are the same builds `support.js` pins, proved by the
`integrity` hashes on the tags, which are `support.js`'s own `REACT_SRI` and
`REACT_DOM_SRI` and are still checked by the browser.

Blocking, not `defer`, and React before `support.js`: `support.js` installs the
`x-dc{display:none}` rule that hides the raw template, and it has to run before
`<body>` is parsed or the unrendered `{{ }}` markup flashes up first. Lab 2 can
afford `defer` because its bench hides frames until they boot; this page cannot.

---

## 4 · Changes to the export

**Two, both in the component script, both marked in the file with
`KNOLL-SIGNUP FIX n of 2`. If the export is ever replaced, re-apply them —
better, fix them upstream in the Design Canvas source and re-export.** Both
were reproduced before they were touched and re-measured after.

**1 · The `localStorage` read was unguarded.** `componentDidMount` reads
`knoll-signup:seen` to decide whether to unroll fast (a returning visitor) or
slow. The matching *write* nine lines later was already in a `try/catch`; the
read was not. Anywhere storage access throws — site data blocked, an old Safari
private window, a sandboxed frame — that read ended `componentDidMount` on the
spot, so `unroll()` was never scheduled and the rAF loop never started. What a
visitor got was **a shut scroll with a disembodied hand in the top-left corner
and no form at all**. Reproduced in Chrome with `localStorage` stubbed to throw;
the fix is `let ret = false; try { … } catch (e) {}` and the page then unrolls
normally with no console output.

**2 · The paper was measured once and stayed that size.** The height of the
parchment is a pixel number taken the frame the scroll unrolls. The form does
not stay that height: every margin note that appears adds to it, and below
800px wide those notes stop being margin notes and stack *underneath* their
field instead (`notePos` in `renderVals`). On a phone with all four showing
that is ~170px more form than paper, and because the box is `overflow:visible`
once open the surplus does not clip — the seal, the Google button and the
log-in line hang out below the bottom roller, over the pines. Measured at
420px: 1201px of content in a box frozen at 1030px.

The fix is a `ResizeObserver` on the paper's inner div (`watchPaper()`) that
re-measures while the scroll is open. It keeps a pixel height rather than going
to `auto`, deliberately: `auto` would look right and then refuse to animate on
the way back down, breaking both roll-ups. It is gated on `state.open`, and
both roll-ups set `open:false` in the same batch they set `paperH:'0px'`, so it
never fights them — confirmed by re-running the success path and the Google
path after the change.

### 4a · The house bar, and the link to the twin

Two changes to the **markup**, both made after `/login` landed beside this page.

**The log-in link now goes somewhere.** `Already a resident? Log in at the gate`
was an `href="#"` in the export; it now reads `../login/`. The log-in page's
reciprocal link had the same problem in a worse form — it pointed at
`Knoll Sign Up.html`, the Design Canvas file it was drawn beside — and now
points here. Both were verified to navigate.

**Both gate pages wear lab 2's header.** A white bar across the top with the
Knoll mark and wordmark at the left, linking `../`. It is `lab2/lab.css`'s
`.lab-head` / `.lab-brand` rules with the token values written out (`--card`
`#fdfbfd`, `--line` `#e2d4df`, `--ink` `#26212a`, `--display` Sora) — these
pages do not load `lab.css`, and the only other thing they would want from it
is Sora 800, which `fonts.css` already carries and the page already links.

`position: absolute`, not `fixed`, so it sits at the top of the document and
scrolls away with it the way lab 2's own header does. The root div is
`position: relative`, so the bar anchors to it and spans it **without** joining
its flex row — which is what keeps the scroll centred. The root's `padding-top`
went from the export's `40px` to `92px` to clear it: 51.5px of bar (12 + 26 +
12 + 1.5) plus the export's own 40px gap. Measured on both pages: the bar spans
the full content width (1385px of a 1385px `clientWidth`), and the scroll's top
clears its bottom edge.

`href="../"` is where lab 2's own brand link goes. **Locally that is a 404** —
there is no `site/index.html`, and the `/` → `/lab2/index.html` rewrite lives
in `vercel.json` and is Vercel-only. On the deployed site it lands on the front
page. Same behaviour as lab 2's brand, not a bug in these pages.

### Known, left alone

Real, but they belong in the Design Canvas source rather than as local patches
a re-export would clobber:

- **Focus dies when the seal is pressed.** The seal button takes a real
  `disabled` attribute the instant `onSubmit` runs, so a keyboard user's focus
  is dropped to `<body>` mid-press, and on the `cracked` outcome it is never
  given back. `aria-disabled` plus the guard already at the top of `onSubmit`
  would keep it.
- **Roughly seventeen `setTimeout`s are never cancelled.** `componentWillUnmount`
  clears the rAF and all six listeners but no timers. Harmless on a standalone
  page that never unmounts; it would matter if this were ever a lab 2 frame.
- **The seal's accessible name never changes** — `aria-label="Press seal to
  submit"` is fixed across all nine states. The polite live region carries the
  state instead, so it is announced, just not from the button.
- **Two links still go nowhere**: Rule Book and Terms of Residency, plus
  "into the village →" on the success card — all `href="#"`. ("Log in at the
  gate" was the fourth; it points at `/login` now. See §4a.)

---

## 5 · The pretend server

**The form sends nothing. There is no account, no request, and the password is
discarded.** `fetch`, `XMLHttpRequest`, `sendBeacon`, `WebSocket` and `action=`
all appear exactly zero times in the file. Pressing the seal runs a ~2s
animation and a `setTimeout`; "Let Google vouch for me" is a `setTimeout` and a
hardcoded `you@gmail.com`. Reloading loses everything typed.

Which outcome the seal reaches is the page's one Design Canvas prop, declared
in `data-props` under the section name **"Pretend server"**:

| prop | values | what it does |
|---|---|---|
| `outcome` | `'success'` (default) · `'taken'` | `success` seals, rolls the scroll up and shows "Welcome to Knoll." `taken` cracks the wax and writes *"someone on the hill already gets post there — log in instead?"* in the margin. |

The default really is applied — `this.props.outcome ?? 'success'` never
reaches its fallback, because the runtime supplies declared defaults. The
Google path always ends in `success` regardless.

**One thing to decide before this goes anywhere public.** Both password fields
carry `autocomplete="new-password"`, which invites the browser's password
manager to offer to save a credential for knoll.space — for a form that is
theatre. Either say so on the paper (the dashboard footer already does this
kind of thing: one line, "a drawing of the sign-up, not the real one"), or
switch both to `autocomplete="off"`. It is currently neither.

**This supersedes nothing.** The real capture still lives on the coming-soon
page, which POSTs `{email, category, source}` to the Apps Script endpoint in
`apps-script/Code.gs` and appends to a Google Sheet. `lab2/features/mailbox.dc.html`
is a third, separate thing — a bench feature, not a page. Leave both alone.

---

## 6 · Things worth knowing

**No `vercel.json` entry is needed, and none was added.** There is no rewrite
for `lab`, `lab2`, `yard` or `dashboard` either — Vercel resolves the directory
index, and it serves both `/signup` and `/signup/` without redirecting between
them.

**Which is why the root `support.js` must stay.** At the slash-less `/signup`
the document base is `/`, so `./support.js` on line 32 resolves to
`/support.js` — the root copy, not this folder's. That is harmless only because
the two are byte-identical. Do not delete `site/support.js` on the theory that
every folder now has its own; the slash-less URL of all three standalone pages
depends on it.

**Caching is Vercel's default** (`max-age=0, must-revalidate`), the same as
both siblings, because `vercel.json`'s headers block only reaches `/lab2/…` and
the root-rewritten equivalents. Matching the siblings is the consistent choice;
if that ever changes it should change for all three at once, not just the
newest.

**Nothing links here, on purpose.** A grep across the site for links to `/yard`
or `/dashboard` returns zero hits — the standalone pages are reached by typing
the URL, and there is no nav to add this one to. Inventing one was out of scope.

**The favicon is in the real `<head>`, not the helmet.** Both siblings keep
theirs in the helmet, which `support.js` hoists into `<head>` only after the
runtime boots — by which time Chrome has already asked for `/signup/favicon.ico`
and logged the 404 it got. Reproduced, then fixed by moving the one line
earlier in the document. It is the difference between this page's clean console
and the "harmless console errors on first paint" that `dashboard/about.md` §5
has to apologise for.

**The font stylesheet is fine where it is.** It sits in the helmet, i.e. in
`<body>` — which looks like it would be discovered late, and the paper's height
is measured behind `document.fonts.ready`, so a late stylesheet could in
principle be measured against fallback metrics. Measured over three loads it is
not: Chrome's preload scanner finds it in the raw markup and requests it at the
same millisecond as `support.js` (45ms, 45ms, 70ms). Left alone deliberately —
and fix 2 would now absorb a reflow anyway.

**The page fetches itself twice, and that is left alone.** One of those twelve
requests is a second `GET /signup/`. `support.js`'s `boot()` reads a missing
`window.__resources` as "the DOM I was handed may be a stale copy of the file"
and re-fetches its own URL for a second parse of the whole template — ~60KB,
every load. Lab 2 kills it in one line (`__resources = {}` in
`features/prelude.js`, on the argument that its templates are authored to
survive `innerHTML`, which is what the `sc-camel-*` attributes are for), and
the same line would work here. It was not added: `/yard` and `/dashboard` both
do the double fetch too, the saving is a warm-cache round trip rather than
anything a visitor feels, and the claim "this DOM is the file" is one that
would want testing per template rather than assuming. If it is ever worth
doing, do it for all three pages at once and check the rendered DOM matches
both ways.

**`sc-else` does not exist in this runtime.** The export does not use it, but a
future hand-edit might reach for it: `walk()` in `support.js` dispatches only
`sc-for`, `sc-if`, `x-import`, `sc-helmet` and `dc-import`. Write a second
`sc-if` instead.

**localStorage:** one key, `knoll-signup:seen`, set to `'1'` on first visit and
read only to pick the unroll speed (700ms first time, 400ms after). Nothing
else is stored. There is nothing to reset.

**Testing.** `lab2/perf/probe-signup.js` walks the happy path, the validation
notes and the seal's state machine; `probe-signup-paths.js` covers the Google
path, the `taken` outcome, the narrow layout and the second visit;
`probe-signup-defects.js` is the reproduction for both fixes in §4 and should
keep returning `narrowSpill: false` and an empty `errors` array. All three want
`node serve.js` running first, then `node probe-signup.js` from `lab2/perf/`.
They use real Chrome through Playwright rather than the hidden preview pane,
for the same reason the rest of that folder does. `probe-login.js` is the
twin's, next door.

**If you add a probe that clicks empty background to blur a field, do not click
near (30, 30)** — that is the house bar's brand link now, and the click
navigates away instead of blurring. The two probes that did were moved to
y=300 when the bar went in.
