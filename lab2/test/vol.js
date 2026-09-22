/* ─── THE VOLUME IN THE DOCK ───────────────────────────────────────────────
   The little speaker in the corner, and the one thing it is honestly in charge
   of: the noise the BENCH makes.

   In lab 1 this slider was a remote control for the sound desk — a gizmo with
   six knobs that generated its own music. There is no sound desk here, and a
   slider that governs nothing is a lie on the furniture, so it was given the
   job it can actually do: every knock the workbench makes goes through it.

     · a tool picked up on the dock ........ a short click
     · a panel picked up, and set down ..... a soft knock, then a duller one
     · a feature going live in its frame ... a two-note chirp
     · a strip of tape strung up ........... a rip

   THERE ARE NO AUDIO FILES. Same rule as lab 1: every sound is a few hundred
   milliseconds of Web Audio built on the spot — an oscillator or a burst of
   noise through an envelope — so the bench can knock without shipping a byte.

   NOTHING STARTS ON ITS OWN. Browsers refuse audio until somebody presses
   something, so the context is not even built until the first gesture, and
   the speaker shows muted rather than pretending otherwise.

   The features themselves are silent — they are drawings, not machines — so
   this governs the bench and only the bench. Kept in knoll-lab2:vol.

   QUIET FOR NOW (2026-09-04). Every noise is off at the source — play() is
   a no-op and no context is ever built — whatever the slider remembers,
   and the speaker in the dock shows muted and is put out of use, since a
   control that governs nothing is a lie on the furniture (above). One
   word turns it back on: OFF. Nothing else was taken out, so the four
   noises, the slider and the memory of a level are all still here. */

window.Vol = (function () {
  const OFF = true;                            // the bench is quiet for now — see QUIET FOR NOW
  const $ = id => document.getElementById(id);
  const btn = $('vol-btn'), slider = $('vol-slider');

  const store = (window.Lab && Lab.store)
    ? Lab.store('vol', { level: 0.7, last: 0.7 })
    : { get: () => ({ level: 0.7, last: 0.7 }), update() {}, on() {} };

  let ctx = null, master = null;

  // the context is built on the first sound asked for AFTER a gesture, never
  // before — an AudioContext made at load is a suspended one the browser
  // grumbles about, and one made on a click is simply allowed
  function wake() {
    if (OFF) return null;                      // quiet for now: no context is ever built
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return ctx; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = store.get().level;
    master.connect(ctx.destination);
    return ctx;
  }

  const lvl = () => store.get().level;

  /* ── the four noises ────────────────────────────────────────────────────
     env(t, a, d, peak) is the shape of every one of them: up in a, down in d.
     Keeping them this short is deliberate — a bench that clunks for half a
     second is a bench you turn off. */
  function env(g, t, a, d, peak) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0001, peak), t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
  }

  function tone(freq, a, d, peak, type, slideTo) {
    if (!wake() || lvl() <= 0.001) return;
    const t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + a + d);
    env(g, t, a, d, peak);
    o.connect(g).connect(master);
    o.start(t); o.stop(t + a + d + 0.02);
  }

  // a burst of noise, filtered — which is what a rip and a knock are made of
  function noise(ms, freq, q, peak, type) {
    if (!wake() || lvl() <= 0.001) return;
    const t = ctx.currentTime, n = Math.max(1, Math.floor(ctx.sampleRate * ms / 1000));
    const buf = ctx.createBuffer(1, n, ctx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const src = ctx.createBufferSource(); src.buffer = buf;
    const f = ctx.createBiquadFilter(); f.type = type || 'bandpass';
    f.frequency.value = freq; f.Q.value = q || 1;
    const g = ctx.createGain();
    env(g, t, 0.004, ms / 1000, peak);
    src.connect(f).connect(g).connect(master);
    src.start(t); src.stop(t + ms / 1000 + 0.02);
  }

  const SOUNDS = {
    click: () => tone(1180, 0.002, 0.035, 0.14, 'square'),
    lift:  () => noise(90, 620, 1.4, 0.10),
    drop:  () => { noise(120, 260, 1.1, 0.16); tone(120, 0.004, 0.11, 0.10, 'sine'); },
    live:  () => { tone(660, 0.008, 0.07, 0.10, 'triangle'); setTimeout(() => tone(990, 0.008, 0.09, 0.09, 'triangle'), 70); },
    rip:   () => noise(260, 2100, 0.7, 0.13, 'highpass')
  };

  const play = k => { if (OFF) return; const f = SOUNDS[k]; if (f) f(); };

  // ── the speaker and its slider ──────────────────────────────────────────
  function setLevel(v, remember) {
    v = Math.max(0, Math.min(1, v));
    store.update(s => {
      s.level = v;
      if (remember && v > 0.001) s.last = v;
    });
    if (master) master.gain.value = v;
  }

  function paint() {
    if (OFF) {                                 // muted, and not a button: the bench is quiet for now
      if (slider) slider.style.display = 'none';
      if (!btn) return;
      btn.classList.add('muted'); btn.classList.remove('humming');
      btn.disabled = true;
      btn.setAttribute('aria-label', 'the bench is quiet for now');
      btn.title = 'the bench is quiet for now';
      return;
    }
    const s = store.get(), on = s.level > 0.001;
    if (slider) slider.value = String(Math.round(s.level * 100));
    if (!btn) return;
    btn.classList.toggle('muted', !on);
    btn.classList.toggle('humming', on && !!ctx);
    btn.setAttribute('aria-label', on ? 'the bench, ' + Math.round(s.level * 100) + '%' : 'the bench, quiet');
    btn.title = on ? 'what the bench sounds like — ' + Math.round(s.level * 100) + '%\npress to quieten it'
                   : 'quiet — press to bring it back';
  }

  if (btn) btn.addEventListener('click', e => {
    e.stopPropagation();
    if (OFF) return;
    const s = store.get();
    if (s.level > 0.001) setLevel(0, false);
    else { setLevel(s.last || 0.7, false); play('click'); }
  });

  if (slider) {
    slider.addEventListener('input', () => setLevel(+slider.value / 100, true));
    // a slider on the bench must not also be a handle for the bench
    slider.addEventListener('pointerdown', e => e.stopPropagation());
    slider.addEventListener('wheel', e => e.stopPropagation(), { passive: true });
  }

  store.on(paint);
  paint();

  return { play, wake, paint, get level() { return lvl(); } };
})();
