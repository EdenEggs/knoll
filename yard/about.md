# yard — how it works

A tour of `site/yard/` for whoever opens it next, agent or otherwise. It
describes what is built and running today. `site/lab2/about.md` covers the
second bench; this one covers a single standalone page.

---

## 1 · What this is

**Your Yard** is a personal home base: your standing on the hill (badges,
spaces visited, your own edit history), reached from a settings gear that
opens a drawer for a display name and a few local preferences. Everything
here is scoped to *this device* (`knoll-yard:` in `localStorage`, the same
convention `lab/ABOUT.txt` uses) because there is no account system behind
any of it yet.

It is served at `/yard`, alongside `/lab` and `/lab2`, but it is neither of
those: it is not a workbench of gizmos and not a paper of loose Design Canvas
exports. It is one page, built the same way the coming-soon page itself is —
a real `<x-dc>` document, `support.js` and all.

---

## 2 · The files

| file | what it is |
|---|---|
| `index.html` | the whole page: helmet (fonts, base CSS), the `<x-dc>` template, and the `class Component extends DCLogic` script that computes everything the template binds to. |
| `support.js` | the Design Canvas runtime, copied from `../support.js`. Not ours — do not edit here; edit the one at the site root and re-copy. |

No `yard.css` or `yard.js`. An earlier, hand-built version of this page
(plain HTML/CSS/JS, no Design Canvas) lived here first and was fully
replaced by a Design Canvas export.

---

## 3 · What used to be here

The "Your Plot" heading is what remains of a bigger feature: a fenced plot
you decorated with flowers/trees/ponds/etc. from a palette, and a gnome you
dressed (hat/robe/beard/skin/accessory, a name). It was built, then removed
on 2026-09-02 at the user's request — the plot, the palette, the fence
artwork and the whole character editor came out of both the template and the
script, along with everything that only existed to serve them
(`pieceArt`/`pieceDown`/`gnomeArt`/`gnomeAccessory`/`charPiece`/`fenceArt`/
`darken`/`setCharacter`, the `plot`/`character` state and their
`knoll-yard:*` storage keys, `CLOTHING`/`BEARDC`/`SKINC`/`PALETTE`). The
heading itself was kept on purpose — ask before re-adding a plot under it,
in case the plan is something other than what was there before.

The footer caption changed with it: it used to say "your plot and character
are saved on this device," which would have been false with neither left to
save. It now says settings only, which is all that's still true.

If a future export re-adds this feature, treat it as new — don't assume the
git/undo history's old version is what should come back.

---

## 4 · Storage

| key | what |
|---|---|
| `knoll-yard:settings` | display name, email-replies toggle, show-activity toggle, reduce-motion toggle |

"Standing" (contributions, hills joined, streak), "spaces you've visited"
and "your edits" are **written down, not stored** — fixed arrays in
`renderVals()`. There is no backing service yet for any of the three.

---

## 5 · Things worth knowing

**Corner-accent colours don't repeat.** Standing/badges/visited/edits use
pink, yellow, green and red respectively (one diamond, one circle, one
diamond, one circle) — a reader tells the cards apart at a glance before
reading any of them. A new card should pick an unused corner+shape+colour
pairing rather than repeat one.

**Visual system matches the Dashboard, not the coming-soon page.** Rye +
VT323, ink `#17120b` / cream `#fdf7e3` / red `#e8484a` / yellow `#ffd23f` /
green `#7bc264` / blue `#5a8fd6` / pink `#e0598c` on a pale lavender paper
(`#ece7f1`) — a different, more "hand-lettered sign" look than the
pink-and-Sora Wallspace hero. That appears to be deliberate: this is the
personal/owner side of the site, not the public marketing page.
