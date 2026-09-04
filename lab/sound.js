/* ─── THE SOUND DESK ───────────────────────────────────────────────────────
   The six tracks the coming-soon page pretends to play, actually playing.
   There are no audio files anywhere in this project and there never will be
   — every note is generated on the spot with Web Audio, seeded off the track
   name, so a track sounds the same every time without a byte being shipped.

   The desk is for whoever runs the place: six knobs, four switches and a
   needle that moves. A visitor gets one thing — the little speaker in the
   zoom dock — because the sound of the hill is not theirs to redesign.

     LEVEL BASS TREBLE TONE REVERB SPEED     drag a knob, double-click to zero
     TAPE CRUNCH WOBBLE HALL                 flip a switch
     ⏮ ▶ ⏭                                   and the playlist beside it

   The chain, in order:
     voices → crunch → bass → treble → tone → wobble ─┬→ dry ──→ level
                                                      └→ hall → level → out

   Nothing starts on its own: browsers refuse audio until somebody presses
   something, and honestly so would I. State lives in Lab.store('sound'). */

window.Sound = (function () {
  const $ = id => document.getElementById(id);
  const gz = $('gz-sound');
  if (!gz || !window.Lab) return {};

  // ── the six ─────────────────────────────────────────────────────────────
  // root is the tonic in Hz; scale is semitones off it; the seed makes the
  // tune. Same numbers every load, so a track keeps its own character.
  const TRACKS = [
    { n: 'Gnome & Circumstance', a: 'The Toadstools', d: 228, bpm: 84,  root: 65.41, scale: [0, 2, 4, 7, 9],   sw: 0,    lift: 12 },
    { n: 'Slow Mushroom Sunrise', a: 'Fern & Moss',   d: 195, bpm: 62,  root: 58.27, scale: [0, 2, 4, 6, 9, 11], sw: 0.18, lift: 19 },
    { n: 'Little Red Hat (demo)', a: 'Pebble Choir',  d: 173, bpm: 116, root: 73.42, scale: [0, 3, 5, 7, 10],  sw: 0.06, lift: 12 },
    { n: 'Wheelbarrow Waltz',     a: 'The Toadstools', d: 241, bpm: 96, root: 61.74, scale: [0, 2, 3, 7, 8],   sw: 0.12, lift: 12, three: true },
    { n: 'Dew on the Petunias',   a: 'Birdbath',      d: 206, bpm: 72,  root: 82.41, scale: [0, 2, 4, 7, 11],  sw: 0.22, lift: 24 },
    { n: 'Lantern, Lantern',      a: 'Fern & Moss',   d: 188, bpm: 68,  root: 49.00, scale: [0, 3, 5, 7, 10],  sw: 0.1,  lift: 12 }
  ];

  const KNOBS = [
    { k: 'level',  n: 'LEVEL',  min: 0,   max: 1,   def: 0.7, unit: '', fmt: v => Math.round(v * 100) + '' },
    { k: 'bass',   n: 'BASS',   min: -14, max: 14,  def: 0,   unit: 'dB', fmt: v => (v > 0 ? '+' : '') + v.toFixed(1) },
    { k: 'treble', n: 'TREBLE', min: -14, max: 14,  def: 0,   unit: 'dB', fmt: v => (v > 0 ? '+' : '') + v.toFixed(1) },
    { k: 'tone',   n: 'TONE',   min: 0,   max: 1,   def: 0.82, unit: '', fmt: v => Math.round(300 * Math.pow(52, v)) + 'Hz' },
    { k: 'verb',   n: 'REVERB', min: 0,   max: 1,   def: 0.18, unit: '', fmt: v => Math.round(v * 100) + '%' },
    { k: 'speed',  n: 'SPEED',  min: 0.5, max: 2,   def: 1,   unit: '×', fmt: v => v.toFixed(2) + '×' }
  ];
  const FLIPS = [
    { k: 'tape',   n: 'TAPE',   t: 'pitch follows the speed knob, like tape does' },
    { k: 'crunch', n: 'CRUNCH', t: 'drives it until the edges go' },
    { k: 'wobble', n: 'WOBBLE', t: 'a slow tremolo, as if the power were unsure' },
    { k: 'hall',   n: 'HALL',   t: 'a much bigger room to put the reverb in' }
  ];

  function seed() {
    const s = { i: 0, playing: false };
    KNOBS.forEach(o => s[o.k] = o.def);
    FLIPS.forEach(o => s[o.k] = false);
    return s;
  }
  const store = Lab.store('sound', seed);
  const S = () => store.get();
  const isMod = () => Lab.role === 'moderator' || Lab.role === 'owner';
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rng = n => { let s = (n >>> 0) || 1; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; };
  const hash = str => { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
  const mmss = s => Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0');

  // ── the tune ────────────────────────────────────────────────────────────
  // A pattern of scale degrees, made once per track and then looped. Nulls
  // are rests, and there are plenty — the point is a room with something in
  // it, not a melody anybody has to listen to.
  const patterns = {};
  function patternFor(t) {
    if (patterns[t.n]) return patterns[t.n];
    const r = rng(hash(t.n)), len = t.three ? 48 : 64, out = [];
    let deg = 0;
    for (let i = 0; i < len; i++) {
      const beat = t.three ? i % 6 : i % 8;
      const strong = beat === 0 || beat === (t.three ? 3 : 4);
      if (!strong && r() < 0.62) { out.push(null); continue; }
      deg = clamp(deg + Math.round((r() - 0.5) * 4), -4, 8);
      out.push(deg);
    }
    patterns[t.n] = out;
    return out;
  }

  // ── the wiring ──────────────────────────────────────────────────────────
  let ctx = null, master = null, chainIn = null, bassF = null, trebF = null, toneF = null,
      shaper = null, tremG = null, lfo = null, lfoG = null, dry = null, wet = null,
      conv = null, ana = null, noise = null, timer = 0, step = 0, nextAt = 0, ranTo = 0, pos = 0;

  function impulse(seconds, decay) {
    const rate = ctx.sampleRate, n = Math.max(1, Math.floor(rate * seconds));
    const buf = ctx.createBuffer(2, n, rate);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, decay);
    }
    return buf;
  }

  function crunchCurve(on) {
    const n = 1024, c = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const x = i * 2 / n - 1;
      c[i] = on ? Math.tanh(x * 3.4) * 0.82 : x;
    }
    return c;
  }

  function build() {
    if (ctx) return true;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    ctx = new AC();

    shaper = ctx.createWaveShaper(); shaper.curve = crunchCurve(false);
    bassF = ctx.createBiquadFilter(); bassF.type = 'lowshelf';  bassF.frequency.value = 220;
    trebF = ctx.createBiquadFilter(); trebF.type = 'highshelf'; trebF.frequency.value = 2800;
    toneF = ctx.createBiquadFilter(); toneF.type = 'lowpass';   toneF.Q.value = 0.6;
    tremG = ctx.createGain(); tremG.gain.value = 1;
    lfo = ctx.createOscillator(); lfo.type = 'sine'; lfo.frequency.value = 4.2;
    lfoG = ctx.createGain(); lfoG.gain.value = 0;
    lfo.connect(lfoG); lfoG.connect(tremG.gain); lfo.start();

    dry = ctx.createGain(); wet = ctx.createGain();
    conv = ctx.createConvolver(); conv.buffer = impulse(1.1, 3.2);
    master = ctx.createGain();
    ana = ctx.createAnalyser(); ana.fftSize = 512;

    chainIn = shaper;
    shaper.connect(bassF); bassF.connect(trebF); trebF.connect(toneF); toneF.connect(tremG);
    tremG.connect(dry); tremG.connect(conv); conv.connect(wet);
    dry.connect(master); wet.connect(master);
    master.connect(ana); ana.connect(ctx.destination);

    // a short noise buffer, re-used for every soft knock
    const n = Math.floor(ctx.sampleRate * 0.25);
    noise = ctx.createBuffer(1, n, ctx.sampleRate);
    const d = noise.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 6);

    applyAll();
    return true;
  }

  const track = () => TRACKS[clamp(S().i, 0, TRACKS.length - 1)];
  const speed = () => S().speed;
  const pitch = () => (S().tape ? S().speed : 1);
  const stepDur = () => 60 / (track().bpm * speed()) / 2;

  function applyAll() {
    if (!ctx) return;
    const s = S(), t = ctx.currentTime, set = (p, v) => p.setTargetAtTime(v, t, 0.02);
    set(master.gain, s.level * s.level);                    // a fader should feel like a fader
    set(bassF.gain, s.bass);
    set(trebF.gain, s.treble);
    set(toneF.frequency, 300 * Math.pow(52, s.tone));
    set(wet.gain, s.verb * 0.9);
    set(dry.gain, 1 - s.verb * 0.35);
    set(lfoG.gain, s.wobble ? 0.45 : 0);
    shaper.curve = crunchCurve(s.crunch);
    const want = s.hall ? [3.6, 2.1] : [1.1, 3.2];
    if (conv._for !== String(want)) { conv.buffer = impulse(want[0], want[1]); conv._for = String(want); }
  }

  function tone(at, freq, dur, type, gain) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq * pitch(), at);
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(gain, at + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    o.connect(g); g.connect(chainIn);
    o.start(at); o.stop(at + dur + 0.06);
  }

  function knock(at, gain) {
    const src = ctx.createBufferSource(), g = ctx.createGain(), f = ctx.createBiquadFilter();
    src.buffer = noise;
    f.type = 'bandpass'; f.frequency.value = 900 * pitch(); f.Q.value = 1.2;
    g.gain.setValueAtTime(gain, at);
    g.gain.exponentialRampToValueAtTime(0.0001, at + 0.16);
    src.connect(f); f.connect(g); g.connect(chainIn);
    src.start(at); src.stop(at + 0.3);
  }

  function playStep(i, at) {
    const t = track(), pat = patternFor(t), per = t.three ? 6 : 8;
    const k = i % pat.length, beat = k % per;
    const note = d => {
      const oct = Math.floor(d / t.scale.length), idx = ((d % t.scale.length) + t.scale.length) % t.scale.length;
      return t.root * Math.pow(2, (t.scale[idx] + oct * 12 + t.lift) / 12);
    };
    if (beat === 0) tone(at, t.root * Math.pow(2, (k % (per * 4) === 0 ? 0 : 7) / 12), 1.1 / speed(), 'sine', 0.24);
    const d = pat[k];
    if (d !== null && d !== undefined) tone(at, note(d), (0.5 + (k % 3) * 0.18) / speed(), 'triangle', 0.1);
    if (beat === (t.three ? 3 : 4)) knock(at, 0.05);
    if (t.sw > 0 && k % (per * 2) === per) tone(at, note(4) * 2, 1.6 / speed(), 'sine', 0.03 + t.sw * 0.04);
  }

  function pump() {
    if (!ctx || !S().playing) return;
    const horizon = ctx.currentTime + 0.15;
    while (nextAt < horizon) {
      playStep(step, nextAt);
      nextAt += stepDur();
      step++;
    }
    // clocked forward from the last look, NOT recomputed from a start time —
    // otherwise nudging SPEED rescales everything already played and the track
    // leaps forwards (or, at half speed, backwards)
    pos = Math.max(0, pos + (ctx.currentTime - ranTo) * speed());
    ranTo = ctx.currentTime;
    if (pos >= track().d) { skip(1); return; }
    face();
  }

  // ── transport ───────────────────────────────────────────────────────────
  function play() {
    if (!build()) { say('this browser will not give us any sound.'); return; }
    if (ctx.state === 'suspended') ctx.resume();
    applyAll();
    ranTo = ctx.currentTime;
    nextAt = Math.max(nextAt, ctx.currentTime + 0.06);
    store.update(s => { s.playing = true; });
    clearInterval(timer);
    timer = setInterval(pump, 25);
    say('“' + track().n + '”, then.');
  }
  function pause() {
    store.update(s => { s.playing = false; });
    clearInterval(timer); timer = 0;
    if (ctx) ctx.suspend();
    say('paused.');
  }
  const toggle = () => (S().playing ? pause() : play());

  function goTo(i, keepPlaying) {
    const was = S().playing || keepPlaying;
    store.update(s => { s.i = ((i % TRACKS.length) + TRACKS.length) % TRACKS.length; });
    pos = 0; step = 0; nextAt = 0; ranTo = ctx ? ctx.currentTime : 0;
    if (was) { if (ctx) ctx.resume(); play(); } else face();
  }
  const skip = n => goTo(S().i + n, S().playing);

  // ── the desk ────────────────────────────────────────────────────────────
  const statusEl = $('sd-status');
  const say = t => { if (statusEl) statusEl.textContent = t || ''; };

  function knobHTML(o) {
    return '<div class="knob" data-knob="' + o.k + '" role="slider" tabindex="0" aria-label="' + o.n.toLowerCase() + '">'
      + '<svg viewBox="0 0 46 46" aria-hidden="true">'
      + '<circle class="knob-shadow" cx="23" cy="24.5" r="16"/>'
      + '<circle class="knob-face" cx="23" cy="23" r="16"/>'
      + '<circle class="knob-cap" cx="23" cy="23" r="11"/>'
      + '<line class="knob-mark" x1="23" y1="23" x2="23" y2="9"/>'
      + '<g class="knob-ticks">'
      + [0, 0.25, 0.5, 0.75, 1].map(q => {
          const a = (-135 + q * 270) * Math.PI / 180;
          const x = 23 + Math.sin(a) * 20, y = 23 - Math.cos(a) * 20;
          const x2 = 23 + Math.sin(a) * 22.5, y2 = 23 - Math.cos(a) * 22.5;
          return '<line x1="' + x.toFixed(1) + '" y1="' + y.toFixed(1) + '" x2="' + x2.toFixed(1) + '" y2="' + y2.toFixed(1) + '"/>';
        }).join('')
      + '</g></svg>'
      + '<b>' + o.n + '</b><i data-read="' + o.k + '"></i></div>';
  }

  $('sd-knobs').innerHTML = KNOBS.map(knobHTML).join('');
  $('sd-flips').innerHTML = FLIPS.map(o =>
    '<button type="button" class="sd-flip" data-flip="' + o.k + '" aria-pressed="false" title="' + o.t + '">'
    + '<span class="sd-flip-slot"><i></i></span><b>' + o.n + '</b></button>').join('');

  function paintKnob(o) {
    const el = gz.querySelector('[data-knob="' + o.k + '"]');
    if (!el) return;
    const v = S()[o.k], q = (v - o.min) / (o.max - o.min);
    el.querySelector('.knob-mark').setAttribute('transform', 'rotate(' + (-135 + q * 270).toFixed(1) + ' 23 23)');
    el.querySelector('[data-read]').textContent = o.fmt(v);
    el.setAttribute('aria-valuenow', String(Math.round(v * 100) / 100));
    el.classList.toggle('off', o.k === 'level' && v <= 0.001);
  }

  function setKnob(k, v, quiet) {
    const o = KNOBS.find(x => x.k === k);
    if (!o) return;
    store.update(s => { s[k] = clamp(v, o.min, o.max); });
    applyAll();
    paintKnob(o);
    if (k === 'level') paintDock();
    if (!quiet) say(o.n.toLowerCase() + ' ' + o.fmt(S()[k]));
  }

  KNOBS.forEach(o => {
    const el = gz.querySelector('[data-knob="' + o.k + '"]');
    let drag = false, y0 = 0, v0 = 0;
    el.addEventListener('pointerdown', e => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      drag = true; y0 = e.clientY; v0 = S()[o.k];
      try { el.setPointerCapture(e.pointerId); } catch (err) {}
      el.classList.add('turning');
      e.preventDefault(); e.stopPropagation();
    });
    el.addEventListener('pointermove', e => {
      if (!drag) return;
      const span = o.max - o.min;
      setKnob(o.k, v0 + (y0 - e.clientY) / 150 * span, true);
    });
    const up = e => { if (!drag) return; drag = false; el.classList.remove('turning');
      try { el.releasePointerCapture(e.pointerId); } catch (err) {} say(o.n.toLowerCase() + ' ' + o.fmt(S()[o.k])); };
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    el.addEventListener('dblclick', () => setKnob(o.k, o.def));
    el.addEventListener('keydown', e => {
      const stepv = (o.max - o.min) / (e.shiftKey ? 8 : 40);
      if (e.key === 'ArrowUp' || e.key === 'ArrowRight') { setKnob(o.k, S()[o.k] + stepv); e.preventDefault(); }
      else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') { setKnob(o.k, S()[o.k] - stepv); e.preventDefault(); }
      else if (e.key === 'Home' || e.key === '0') { setKnob(o.k, o.def); e.preventDefault(); }
    });
  });

  FLIPS.forEach(o => {
    const el = gz.querySelector('[data-flip="' + o.k + '"]');
    el.addEventListener('click', () => {
      let now = false;
      store.update(s => { s[o.k] = !s[o.k]; now = s[o.k]; });
      applyAll();
      el.setAttribute('aria-pressed', String(now));
      say(o.n.toLowerCase() + (now ? ' on' : ' off') + (now ? ' — ' + o.t : ''));
    });
  });

  $('sd-play').addEventListener('click', toggle);
  $('sd-prev').addEventListener('click', () => skip(-1));
  $('sd-next').addEventListener('click', () => skip(1));

  // ── the needle ──────────────────────────────────────────────────────────
  const vu = $('sd-vu'), vctx = vu.getContext('2d');
  const VW = vu.width, VH = vu.height;
  let lvl = 0, vraf = 0, bins = null;

  function paintVU() {
    vctx.clearRect(0, 0, VW, VH);
    vctx.fillStyle = '#f3e7cf';
    vctx.beginPath();
    (vctx.roundRect ? vctx.roundRect(1.5, 1.5, VW - 3, VH - 3, 6) : vctx.rect(1.5, 1.5, VW - 3, VH - 3));
    vctx.fill();
    vctx.strokeStyle = '#26212a'; vctx.lineWidth = 2.5; vctx.stroke();

    const cx = VW / 2, cy = VH - 6, R = VH - 16;
    vctx.strokeStyle = '#9a8a72'; vctx.lineWidth = 1.4;
    vctx.beginPath(); vctx.arc(cx, cy, R, Math.PI * 1.18, Math.PI * 1.82); vctx.stroke();
    vctx.strokeStyle = '#c0392b'; vctx.lineWidth = 2.4;
    vctx.beginPath(); vctx.arc(cx, cy, R, Math.PI * 1.68, Math.PI * 1.82); vctx.stroke();
    vctx.strokeStyle = '#b8a68c'; vctx.lineWidth = 1;
    for (let i = 0; i <= 6; i++) {
      const a = Math.PI * 1.18 + (Math.PI * 0.64) * i / 6;
      vctx.beginPath();
      vctx.moveTo(cx + Math.cos(a) * (R - 5), cy + Math.sin(a) * (R - 5));
      vctx.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R);
      vctx.stroke();
    }
    const a = Math.PI * 1.18 + Math.PI * 0.64 * clamp(lvl, 0, 1);
    vctx.strokeStyle = '#26212a'; vctx.lineWidth = 1.8; vctx.lineCap = 'round';
    vctx.beginPath(); vctx.moveTo(cx, cy); vctx.lineTo(cx + Math.cos(a) * (R - 2), cy + Math.sin(a) * (R - 2)); vctx.stroke();
    vctx.fillStyle = '#26212a';
    vctx.beginPath(); vctx.arc(cx, cy, 3, 0, 7); vctx.fill();
    vctx.fillStyle = '#9a8a72'; vctx.font = '700 6.5px ui-monospace, monospace'; vctx.textAlign = 'center';
    vctx.fillText('VU', cx, cy - R * 0.42);
  }

  function vuTick() {
    vraf = 0;
    const target = S().playing ? Math.min(1, rms() * 4.2) : 0;
    lvl += (target - lvl) * (target > lvl ? 0.4 : 0.08);      // fast up, slow down, like a real one
    paintVU();
    if (visible()) vraf = requestAnimationFrame(vuTick);
  }
  const visible = () => !gz.hidden && !gz.classList.contains('shelved');
  function vuStart() { if (!vraf && visible()) vraf = requestAnimationFrame(vuTick); }

  // ── the playlist ────────────────────────────────────────────────────────
  const listEl = $('sd-list');
  listEl.innerHTML = TRACKS.map((t, i) =>
    '<li class="pl-track" data-i="' + i + '"><span class="pl-n">' + String(i + 1).padStart(2, '0') + '</span>'
    + '<span class="pl-meta"><b>' + t.n.replace(/&/g, '&amp;') + '</b><i>' + t.a + '</i></span>'
    + '<span class="pl-d">' + mmss(t.d) + '</span>'
    + '<span class="pl-bars" aria-hidden="true"><i></i><i></i><i></i></span></li>').join('');
  listEl.addEventListener('click', e => {
    const li = e.target.closest('.pl-track');
    if (li) goTo(+li.dataset.i, true);
  });

  // ── the little speaker in the dock, which is all a visitor gets ─────────
  const dock = $('vol-btn'), slider = $('vol-slider');
  function paintDock() {
    const s = S();
    if (slider) slider.value = String(Math.round(s.level * 100));
    if (dock) {
      const on = s.level > 0.001;
      dock.classList.toggle('muted', !on);
      dock.setAttribute('aria-label', on ? 'the sound, ' + Math.round(s.level * 100) + '%' : 'the sound, off');
      dock.title = s.playing ? (on ? 'the hill is humming — ' + Math.round(s.level * 100) + '%' : 'muted')
                             : 'nothing playing — press to start';
      dock.classList.toggle('humming', !!s.playing && on);
    }
  }
  let lastLevel = 0.7;
  if (dock) dock.addEventListener('click', e => {
    e.stopPropagation();
    const s = S();
    if (!s.playing) { if (s.level <= 0.001) setKnob('level', lastLevel || 0.7, true); play(); return; }
    if (s.level > 0.001) { lastLevel = s.level; setKnob('level', 0, true); }
    else setKnob('level', lastLevel || 0.7, true);
  });
  if (slider) {
    slider.addEventListener('input', () => setKnob('level', +slider.value / 100, true));
    slider.addEventListener('pointerdown', e => e.stopPropagation());
  }

  // ── keeping the face honest ─────────────────────────────────────────────
  function face() {
    const s = S(), t = track();
    $('sd-now').textContent = t.n;
    $('sd-by').textContent = t.a;
    $('sd-time').textContent = mmss(Math.min(pos, t.d)) + ' / ' + mmss(t.d);
    $('sd-bar').style.width = clamp(pos / t.d, 0, 1) * 100 + '%';
    $('sd-play').textContent = s.playing ? '❙❙' : '▶';
    $('sd-play').setAttribute('aria-label', s.playing ? 'pause' : 'play');
    gz.classList.toggle('sd-live', !!s.playing);
    listEl.querySelectorAll('.pl-track').forEach(li =>
      li.classList.toggle('playing', +li.dataset.i === s.i));
    paintDock();
  }

  function render() {
    KNOBS.forEach(paintKnob);
    FLIPS.forEach(o => {
      const el = gz.querySelector('[data-flip="' + o.k + '"]');
      if (el) el.setAttribute('aria-pressed', String(!!S()[o.k]));
    });
    face();
    vuStart();
  }

  store.on(render);
  document.addEventListener('lab:role', () => { render(); vuStart(); });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) vuStart(); });
  render();
  paintVU();
  Lab.hidpi(vu, paintVU);               // the needle, at the camera's resolution

  // what the needle is reading right now, 0..1 — the meter uses it, and it is
  // the only honest way to ask whether anything is actually coming out
  function rms() {
    if (!ctx || !ana) return 0;
    if (!bins) bins = new Uint8Array(ana.frequencyBinCount);
    ana.getByteTimeDomainData(bins);
    let sum = 0;
    for (let i = 0; i < bins.length; i++) { const v = (bins[i] - 128) / 128; sum += v * v; }
    return Math.sqrt(sum / bins.length);
  }

  return { play, pause, toggle, skip, goTo, setKnob, rms, TRACKS, KNOBS, FLIPS, store,
    get playing() { return !!S().playing; }, get level() { return S().level; },
    get ctx() { return ctx; }, get pos() { return pos; } };
})();
