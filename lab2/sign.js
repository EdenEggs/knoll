/* ══ sign.js ══ THE GNOME WHO PUTS THE K OVERHEAD ═══════════════════════════

   Click any of the five letters and the K goes up, carried by the gnome
   standing under it. Not the letter you clicked — the K. That is the mark's
   own rule, taken from the canvas it was drawn in (logo/Knoll Wordmark.dc.html)
   rather than invented here, and the caption under the row is the instruction:
   click a letter to hoist.

   HE DOES NOT MOVE. HIS ARMS DO. This bench used to do the other thing — one
   gnome who walked under whichever letter was clicked, crouched, and stood up
   with it — and the difference is not a detail. Nothing about his body is
   animated now: boots, belt, beard and hat are drawn where they are drawn and
   stay there. What moves is the far end of two arms, and the card resting on
   them.

   THE GEOMETRY, in the gnome's own 220×300 grid, which is parked at 90,194
   inside the K's 400×470 holder (lab.css):

     hands ..... y 276 down, y 56 up. 276 is the K card's bottom edge — 194 of
                 offset plus 276 is 470, and the card ends at 470 — and 56 is
                 that same edge once the card has risen 220. So the hands are
                 not placed ON the card; they ARE its bottom edge, and the two
                 cannot come apart however the easing behaves in between.
     spread .... x 58→32 on the left and 162→188 on the right, 26 each way, so
                 the arms open as they extend instead of running up two rails.
     cuffs ..... 0.86 of the way along each arm, so they follow the hand rather
                 than being posed against it.
     the card .. translate 0 −220px, the same 220 the hands travel.

   ONE FRAME SETS ALL OF IT. The arms live in the body svg and end in circles
   that live in the hands svg — they have to, because the card is drawn between
   the two layers — so a design that animated them separately would have the
   hands leave the sleeves the moment the two got a frame out of step. pose()
   below writes every one of those numbers from a single t, and nothing else
   writes any of them.

   THE SEQUENCE, and the two seconds in the middle are the only part anybody is
   meant to notice:

     appear .... 220ms  he fades up at rest, arms hanging, hands on the card's
                        bottom edge. Nothing rises yet.
     press ..... 700ms  arms extend, card goes with them, easeOutBack — which
                        overshoots a little at the top and settles back, and is
                        the difference between lifting a thing and moving it
     hold ..... 2000ms  overhead. The sign as it was first drawn, held rather
                        than frozen
     set down .. 650ms  the same 220 back, easeInOutCubic, symmetric
     leave ..... 250ms  a beat standing, then he fades out

   CLICKING vs DRAGGING. The sign is a .gz and lab.js drags it by whatever the
   press landed on, so a letter cannot simply listen for `click` — every drag
   that started on one would end in a hoist. The rule is the one frames.js uses
   to tell waking a feature from moving it: a press that ends within a few
   pixels of where it began was a click, and anything further was a drag and is
   dropped.                                                                   */

(function () {
  'use strict';

  var row = document.querySelector('.sign-word-row');
  if (!row) return;

  var k       = row.querySelector('.sign-letter-k');
  var letters = [].slice.call(row.querySelectorAll('.sign-letter'));
  var armL    = [].slice.call(row.querySelectorAll('.sign-arm-l'));
  var armR    = [].slice.call(row.querySelectorAll('.sign-arm-r'));
  var handL   = row.querySelector('.sign-hand-l');
  var handR   = row.querySelector('.sign-hand-r');
  var cuffL   = row.querySelector('.sign-sleeve-l');
  var cuffR   = row.querySelector('.sign-sleeve-r');
  if (!k || !letters.length || !armL.length || !armR.length ||
      !handL || !handR || !cuffL || !cuffR) return;

  var LIFT = 220;            // how far the card travels, in the drawing's units
  var SHOULDER_L = { x: 66,  y: 170 };
  var SHOULDER_R = { x: 154, y: 170 };
  var CUFF = 0.86;           // where on the arm the cuff rides

  var APPEAR = 220, PRESS = 700, HOLD = 2000, SET_DOWN = 650, LEAVE = 250;

  /* easeOutBack overshoots past 1 and comes back, which is what gives the top
     of the press its weight; easeInOutCubic is symmetric and has none, which is
     what makes setting it down read as careful rather than dropped. Both are
     the canvas's, constant and all. */
  function easeOutBack(p) { var c = 1.2, q = p - 1; return 1 + (c + 1) * q * q * q + c * q * q; }
  function easeInOut(p) { return p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2; }

  var r1 = function (v) { return Math.round(v * 10) / 10; };

  /* THE ONLY THING THAT WRITES THE POSE. t is 0 at rest and 1 overhead. */
  function pose(t) {
    var hy = r1(276 - LIFT * t);
    var lx = r1(58 - 26 * t);
    var rx = r1(162 + 26 * t);

    var i;
    for (i = 0; i < armL.length; i++) { armL[i].setAttribute('x2', lx); armL[i].setAttribute('y2', hy); }
    for (i = 0; i < armR.length; i++) { armR[i].setAttribute('x2', rx); armR[i].setAttribute('y2', hy); }

    handL.setAttribute('cx', lx); handL.setAttribute('cy', hy);
    handR.setAttribute('cx', rx); handR.setAttribute('cy', hy);

    var cy = r1(SHOULDER_L.y + CUFF * (hy - SHOULDER_L.y));
    cuffL.setAttribute('cx', r1(SHOULDER_L.x + CUFF * (lx - SHOULDER_L.x)));
    cuffL.setAttribute('cy', cy);
    cuffR.setAttribute('cx', r1(SHOULDER_R.x + CUFF * (rx - SHOULDER_R.x)));
    cuffR.setAttribute('cy', cy);

    k.style.translate = t ? '0 ' + r1(-LIFT * t) + 'px' : '';
  }

  /* rAF rather than the Web Animations API, which the old sequence used: none
     of these are animatable CSS properties — they are svg attributes — so there
     is nothing for WAAPI to interpolate and the frame has to be written by
     hand. Which is just as well, since they all have to be written together. */
  var raf = 0, timer = 0, busy = false;

  function run(from, to, dur, ease, done) {
    var t0 = performance.now();
    (function step(now) {
      var p = Math.min(1, (now - t0) / dur);
      pose(from + (to - from) * ease(p));
      if (p < 1) raf = requestAnimationFrame(step);
      else if (done) done();
    })(t0);
  }

  function wait(ms, done) { timer = setTimeout(done, ms); }

  function lift() {
    if (busy) return;
    busy = true;
    pose(0);
    row.classList.add('lifting');
    wait(APPEAR, function () {
      run(0, 1, PRESS, easeOutBack, function () {
        wait(HOLD, function () {
          run(1, 0, SET_DOWN, easeInOut, function () {
            wait(LEAVE, function () {
              row.classList.remove('lifting');
              busy = false;
            });
          });
        });
      });
    });
  }

  /* A tab that goes away mid-hoist comes back to a gnome frozen with his arms
     up, because neither the timer nor the frame ran while it was hidden. Put
     him down and let the next click start clean. */
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden || !busy) return;
    cancelAnimationFrame(raf);
    clearTimeout(timer);
    pose(0);
    row.classList.remove('lifting');
    busy = false;
  });

  /* A press that stayed put was a click. The sign is being dragged by the same
     press if it travelled, and a drag that happens to have started on a letter
     is not a request to hoist. */
  var from = null;

  row.addEventListener('pointerdown', function (e) {
    var el = e.target.closest ? e.target.closest('.sign-letter') : null;
    from = el ? { x: e.clientX, y: e.clientY } : null;
  });

  /* THE RELEASE IS LISTENED FOR ON THE DOCUMENT, not on the row, and that is
     not tidiness. lab.js takes a pointer capture on the section the moment a
     drag starts, and a captured pointer's later events are retargeted to the
     element holding the capture — so the pointerup for this very gesture is
     delivered to the section and bubbles from THERE, never reaching anything
     inside it. A listener on the row would see the press and never the
     release. The document is above the section either way. */
  document.addEventListener('pointerup', function (e) {
    var f = from;
    from = null;
    if (!f) return;
    if (Math.abs(e.clientX - f.x) + Math.abs(e.clientY - f.y) > 5) return;   // that was a drag
    if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    lift();
  });

  document.addEventListener('pointercancel', function () { from = null; });
})();
