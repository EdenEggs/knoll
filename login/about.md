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

**Nothing it collects goes anywhere.** See §4.

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

## 4 · The pretend gate

**Nothing is sent.** `fetch`, `XMLHttpRequest`, `sendBeacon`, `WebSocket` and
`action=` all appear exactly zero times. Turning the key runs a ~2.2s animation
and a `setTimeout`; "Google knows me — let me through" is a `setTimeout`.

Unlike `/signup`, **this page declares no Design Canvas props at all** — its
script tag is a bare `data-dc-script=""`. The failure path is hardcoded
instead:

```js
const outcome = this.state.pw === '0' ? 'wrong' : 'success';   // pretend server
```

So **type `0` as the secret word to see the key jam.** Anything else opens the
gate. The wrong path ejects the key, wags the hand, jostles the lock and writes
*"that is not the secret word the gate remembers"* in the margin.

The lock's states, in order: `idle` → `reach` → `grip` → `carry` → `insert` →
`turn` → `cooling` → `set`, or `eject` → `cracked` on a wrong word. The label
beside it reads **TURN THE KEY** → **TURNING…** → **UNLOCKED**.

Validation is two rules: a real-looking email, and a non-empty secret word
(*"the gate wants a secret word before it opens"*) — no eight-character minimum
here, since you are not choosing one.

The *keep the gate unlatched for me* tick defaults to **on** and is state only;
nothing reads it.

Three links go nowhere: *forgotten it? ask the gatekeeper*, *Terms of
Residency*, and *into the village →* on the success card.

---

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
