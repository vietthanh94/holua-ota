/* sound.js — calm sounds for Hổ Lửa Phước Lộc: synthesised chimes (WebAudio) plus, since V1.3, real tiger sounds
 * (assets/sfx/tiger_*.wav: CC0 recordings from Wikimedia Commons, see assets/sfx/SOURCES.md), and the volume
 * the recorded voice uses (FT.Sound.voiceVolume), so one button covers chimes, tiger sounds and speech.
 * Tone: premium feng-shui shop — soft bells, a singing bowl, bamboo sticks, a gentle purr. Never loud, never looping music.
 * Rules: sounds only answer a customer's action (no idle/attract noise); master volume is low; quiet hours 21:00–07:00
 * play softer; one button cycles Vừa / Nhẹ / Tắt (default Nhẹ, remembered on this device). ES5, Chrome 62 WebView safe. API: FT.Sound.play(name). */
(function (root, doc) {
  'use strict';
  var FT = root.FT = root.FT || {};
  var AC = root.AudioContext || root.webkitAudioContext;
  /* three levels on one button: Vừa → Nhẹ → Tắt (default Nhẹ); remembered on this device */
  var KEY = 'ft.sound.level', BASE = 0.55, LEVELS = [0, 0.5, 1], ICON = ['🔇', '🔉', '🔊'], NAME = ['Tắt', 'Nhẹ', 'Vừa'];
  var ctx = null, master = null, noiseBuf = null, hum = null;
  var lvl = 1, reduced = false;
  try { var sv = root.localStorage.getItem(KEY); if (sv === '0' || sv === '1' || sv === '2') lvl = +sv; } catch (e) {}
  var muted = lvl === 0;

  function level() {
    var h = new Date().getHours();
    var v = BASE * LEVELS[lvl] * (reduced ? 0.5 : 1);    /* reduced-effects mode: about 6 dB softer */
    return (h >= 21 || h < 7) ? v * 0.4 : v;           /* quiet hours (Owner can change once shop hours are confirmed) */
  }

  function init() {
    if (ctx || !AC) return ctx;
    try {
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : level();
      /* gentle limiter so overlapping sounds never clip on the T2's small speaker */
      var comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -18; comp.knee.value = 12; comp.ratio.value = 6; comp.attack.value = 0.003; comp.release.value = 0.25;
      master.connect(comp); comp.connect(ctx.destination);
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      var d = noiseBuf.getChannelData(0);
      for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    } catch (e) { ctx = null; }
    return ctx;
  }

  /* browsers start audio only after a touch: create/resume on the first touch anywhere */
  function unlock() {
    if (!init()) return;
    loadTiger();
    if (ctx.state === 'suspended' && ctx.resume) ctx.resume();
  }
  doc.addEventListener('touchstart', unlock, true);
  doc.addEventListener('mousedown', unlock, true);
  doc.addEventListener('visibilitychange', function () {
    if (!ctx) return;
    if (doc.hidden) { if (ctx.suspend) ctx.suspend(); } else if (ctx.resume) ctx.resume();
  });

  /* ---- building blocks ---- */
  function env(g, t, peak, a, dur) {   /* attack then exponential fade */
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  }
  function tone(f, t, dur, type, peak, a) {
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type || 'sine'; o.frequency.setValueAtTime(f, t);
    env(g, t, peak, a || 0.005, dur);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.05);
    return o;
  }
  /* bell / singing-bowl: inharmonic partials, the high ones die first */
  function bell(f, t, dur, peak) {
    var P = [[1, 1, 1], [2.0, 0.45, 0.6], [2.76, 0.3, 0.45], [5.4, 0.12, 0.25]];
    for (var i = 0; i < P.length; i++) tone(f * P[i][0], t, dur * P[i][2], 'sine', peak * P[i][1], 0.004);
  }
  function noise(t, dur, type, f0, f1, q, peak, a) {
    var s = ctx.createBufferSource(), fl = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noiseBuf; s.loop = true;
    fl.type = type; fl.Q.value = q;
    fl.frequency.setValueAtTime(f0, t); fl.frequency.exponentialRampToValueAtTime(f1, t + dur);
    env(g, t, peak, a || 0.01, dur);
    s.connect(fl); fl.connect(g); g.connect(master);
    s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.05);
  }

  var SFX = {
    /* soft purr: low buzz shaped by a ~23 Hz flutter */
    pet: function (t) {
      var o = ctx.createOscillator(), lp = ctx.createBiquadFilter(), g = ctx.createGain(), am = ctx.createGain(), lfo = ctx.createOscillator(), depth = ctx.createGain();
      o.type = 'sawtooth'; o.frequency.value = 52;
      lp.type = 'lowpass'; lp.frequency.value = 360; lp.Q.value = 0.7;
      lfo.frequency.value = 23; depth.gain.value = 0.5; am.gain.value = 0.5;
      lfo.connect(depth); depth.connect(am.gain);
      env(g, t, 0.5, 0.08, 0.9);
      o.connect(lp); lp.connect(am); am.connect(g); g.connect(master);
      o.start(t); lfo.start(t); o.stop(t + 1); lfo.stop(t + 1);
    },
    happy: function (t) { bell(784, t, 1.1, 0.16); bell(1175, t + 0.13, 1.3, 0.13); },          /* G5 → D6 */
    fly: function (t) { noise(t, 0.75, 'bandpass', 380, 2600, 1.2, 0.95, 0.18); },
    fire: function (t) {
      noise(t, 1.25, 'lowpass', 3200, 380, 0.8, 0.34, 0.04);
      var o = tone(68, t, 0.9, 'sine', 0.26, 0.03); o.frequency.exponentialRampToValueAtTime(44, t + 0.9);
    },
    sleep: function (t) { bell(1319, t, 0.9, 0.08); bell(988, t + 0.22, 1.0, 0.08); bell(784, t + 0.44, 1.6, 0.08); },
    wake: function (t) { bell(784, t, 0.8, 0.09); bell(988, t + 0.16, 0.8, 0.09); bell(1319, t + 0.32, 1.2, 0.09); },
    error: function (t) { tone(330, t, 0.35, 'triangle', 0.17, 0.01); tone(247, t + 0.22, 0.5, 'triangle', 0.17, 0.01); },
    /* bamboo quẻ sticks rattling in the tube */
    rattle: function (t) {
      var at = t;
      for (var i = 0; i < 16; i++) {
        at += 0.05 + Math.random() * 0.06;
        noise(at, 0.035, 'bandpass', 2400 + Math.random() * 1400, 2000, 9, 0.5 + Math.random() * 0.25, 0.002);
        tone(700 + Math.random() * 300, at, 0.04, 'triangle', 0.09, 0.002);
      }
    },
    /* the quẻ is out: one singing-bowl strike */
    bowl: function (t) { bell(392, t, 3.2, 0.22); bell(588, t + 0.004, 2.2, 0.05); },
    print: function (t) { bell(1568, t, 0.6, 0.1); bell(2093, t + 0.12, 0.8, 0.09); },
    tick: function (t) { var o = tone(880, t, 0.05, 'sine', 0.06, 0.002); o.frequency.exponentialRampToValueAtTime(560, t + 0.05); }
  };

  /* real tiger sounds, decoded once after the first touch */
  var TIGER = { roar: 0.8, roar2: 0.7, growl: 0.9, growl2: 0.6, chuff: 0.9, snarl: 0.6 }, bufs = {}, loading = false, want = null;
  function loadTiger() {
    if (loading || !ctx) return;
    loading = true;
    Object.keys(TIGER).forEach(function (n) {
      try {
        var x = new XMLHttpRequest();
        x.open('GET', 'assets/sfx/tiger_' + n + '.wav', true);
        x.responseType = 'arraybuffer';
        x.onload = function () {
          if (x.status !== 200 && x.status !== 0) return;
          try {
            ctx.decodeAudioData(x.response, function (b) {
              bufs[n] = b;
              /* the very first touch asked for this sound while it was still loading: play it now if still fresh */
              if (want && want.n === n && ctx.currentTime - want.t < 0.6) { want = null; try { playTiger(n, ctx.currentTime + 0.01); } catch (e) {} }
            }, function () {});
          } catch (e) {}
        };
        x.send();
      } catch (e) {}
    });
  }
  function playTiger(name, t) {
    var b = bufs[name]; if (!b) { want = { n: name, t: ctx.currentTime }; return; }
    var s = ctx.createBufferSource(), g = ctx.createGain();
    s.buffer = b; g.gain.value = TIGER[name];
    s.connect(g); g.connect(master); s.start(t);
  }

  var last = {};
  function play(name) {
    if (TIGER[name]) {
      if (muted || !init()) return;
      loadTiger();
      if (ctx.state === 'suspended' && ctx.resume) ctx.resume();
      var tn = ctx.currentTime;
      if (last[name] && tn - last[name] < 0.8) return;
      last[name] = tn;
      master.gain.setValueAtTime(level(), tn);
      try { playTiger(name, tn + 0.01); } catch (e) {}
      return;
    }
    if (muted || !SFX[name] || !init()) return;
    if (ctx.state === 'suspended') { if (ctx.resume) ctx.resume(); }
    var now = ctx.currentTime;
    if (last[name] && now - last[name] < 0.12) return;   /* no machine-gun repeats */
    last[name] = now;
    master.gain.setValueAtTime(level(), now);
    try { SFX[name](now + 0.01); } catch (e) {}
  }

  /* fire charge: a low hum that rises while the finger is held */
  function charge(on, p) {
    if (muted || !init()) return;
    var t = ctx.currentTime;
    if (on && !hum) {
      var o = ctx.createOscillator(), o2 = ctx.createOscillator(), g = ctx.createGain(), lp = ctx.createBiquadFilter();
      o.type = 'sawtooth'; o2.type = 'sine'; lp.type = 'lowpass'; lp.frequency.value = 500;
      o.frequency.value = 70; o2.frequency.value = 140;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.09, t + 0.3);
      o.connect(lp); o2.connect(lp); lp.connect(g); g.connect(master); o.start(t); o2.start(t);
      hum = { o: o, o2: o2, g: g, lp: lp };
    }
    if (hum && on && p != null) {
      hum.o.frequency.setTargetAtTime(70 + p * 70, t, 0.05);
      hum.o2.frequency.setTargetAtTime(140 + p * 160, t, 0.05);
      hum.lp.frequency.setTargetAtTime(500 + p * 1300, t, 0.05);
      hum.g.gain.setTargetAtTime(0.09 + p * 0.1, t, 0.05);
    }
    if (!on && hum) {
      var h = hum; hum = null;
      h.g.gain.cancelScheduledValues(t); h.g.gain.setTargetAtTime(0.0001, t, 0.06);
      h.o.stop(t + 0.4); h.o2.stop(t + 0.4);
    }
  }

  function setLevel(n) {
    lvl = Math.max(0, Math.min(2, n | 0)); muted = lvl === 0;
    try { root.localStorage.setItem(KEY, String(lvl)); } catch (e) {}
    if (muted) charge(false);
    if (ctx && master) master.gain.setValueAtTime(muted ? 0 : level(), ctx.currentTime);
    for (var i = 0; i < levelSubs.length; i++) { try { levelSubs[i](lvl); } catch (e) {} }
    var b = doc.getElementById('soundBtn');
    if (b) {
      b.textContent = ICON[lvl];
      b.setAttribute('aria-label', FT.I18N ? FT.I18N.t('sound.aria', { n: FT.I18N.t('sound.' + lvl) }) : 'Âm thanh: ' + NAME[lvl] + ' (bấm để đổi)');
    }
  }
  function setMuted(m) { setLevel(m ? 0 : 1); }

  var levelSubs = [];
  /* recorded voice: Nhẹ 0.55, Vừa 0.9 of the tablet's media volume; quiet hours 21:00–07:00 half; Tắt = 0 */
  function voiceVolume() {
    if (muted) return 0;
    var h = new Date().getHours(), v = lvl === 2 ? 0.9 : 0.55;
    return (h >= 21 || h < 7) ? v * 0.5 : v;
  }

  FT.Sound = {
    play: play, charge: charge, setMuted: setMuted,
    voiceVolume: voiceVolume,
    onLevel: function (fn) { levelSubs.push(fn); },
    setLevel: setLevel,
    level: function () { return lvl; },
    setReduced: function (on) { reduced = !!on; if (ctx && master && !muted) master.gain.setValueAtTime(level(), ctx.currentTime); },
    isMuted: function () { return muted; },
    toggle: function () { setLevel(lvl === 2 ? 1 : lvl === 1 ? 0 : 2); if (!muted) play('tick'); },
    names: function () { return Object.keys(SFX); },
    /* test/preview only: render the listed sounds one after another into a mono WAV (base64), offline */
    renderWav: function (list, gap) {
      var OAC = root.OfflineAudioContext || root.webkitOfflineAudioContext, sr = 44100, step = gap || 3.4;
      var oc = new OAC(1, Math.ceil(sr * step * list.length), sr), keep = [ctx, master, noiseBuf];
      ctx = oc; master = oc.createGain(); master.gain.value = BASE; master.connect(oc.destination);
      noiseBuf = oc.createBuffer(1, sr, sr);
      var nd = noiseBuf.getChannelData(0); for (var i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
      for (i = 0; i < list.length; i++) SFX[list[i]](0.05 + i * step);
      ctx = keep[0]; master = keep[1]; noiseBuf = keep[2];
      return oc.startRendering().then(function (buf) {
        var d = buf.getChannelData(0), n = d.length, b = new DataView(new ArrayBuffer(44 + n * 2)), j;
        function s(o, t) { for (var k = 0; k < t.length; k++) b.setUint8(o + k, t.charCodeAt(k)); }
        s(0, 'RIFF'); b.setUint32(4, 36 + n * 2, true); s(8, 'WAVEfmt '); b.setUint32(16, 16, true); b.setUint16(20, 1, true);
        b.setUint16(22, 1, true); b.setUint32(24, sr, true); b.setUint32(28, sr * 2, true); b.setUint16(32, 2, true); b.setUint16(34, 16, true);
        s(36, 'data'); b.setUint32(40, n * 2, true);
        var peak = 0;
        for (j = 0; j < n; j++) { var v = Math.max(-1, Math.min(1, d[j])); peak = Math.max(peak, Math.abs(v)); b.setInt16(44 + j * 2, v * 32767, true); }
        var u = new Uint8Array(b.buffer), str = '';
        for (j = 0; j < u.length; j += 32768) str += String.fromCharCode.apply(null, u.subarray(j, j + 32768));
        return { b64: root.btoa(str), peak: peak };
      });
    }
  };
  function boot() {
    var b = doc.getElementById('soundBtn');
    if (b) b.onclick = function () { unlock(); FT.Sound.toggle(); };
    setLevel(lvl);
    if (FT.I18N) FT.I18N.on(function () { setLevel(lvl); });
  }
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', boot); else boot();
})(window, document);
