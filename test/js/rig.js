/* rig.js — 2.5D "living puppet" renderer for the fire tiger, Canvas2D only (no WebGL, so it runs
 * on Android 7.1.1 weak hardware). The single cut-out image is drawn as a stack of horizontal
 * slivers; each sliver is shifted/stretched by a spring + wave model to fake muscle/breathing:
 *   - breathing (chest widens/narrows)         - idle pendulum sway (anchored at the feet)
 *   - look-at (upper body leans toward finger)  - vertical bob + subtle tilt
 *   - squash on tap, leap on fly, recoil+flash on fire, shake on error, droop+dim on sleep
 * Painted fire moves with the body (it is part of the texture); a pulsing additive glow + flicker
 * makes it read as live flame. Old-WebView safe: ES5, function constructor. Exposes FT.Rig. */
(function (root, doc) {
  'use strict';
  var FT = root.FT = root.FT || {};

  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function smooth(t) { return t * t * (3 - 2 * t); }

  /* steady-state look per mood (transient kicks are separate timers) */
  var MOODS = {
    IDLE:     { breatheAmp: 0.045, breatheSpd: 1.8, sway: 11, swaySpd: 1.15, bob: 7, bobSpd: 1.7, tilt: 0.03, dim: 1.00, glow: 0.55 },
    TOUCH:    { breatheAmp: 0.05,  breatheSpd: 2.2, sway: 13, swaySpd: 1.4,  bob: 8, bobSpd: 2.1, tilt: 0.04, dim: 1.05, glow: 0.7 },
    HAPPY:    { breatheAmp: 0.06,  breatheSpd: 3.0, sway: 16, swaySpd: 2.6,  bob: 20, bobSpd: 3.4, tilt: 0.06, dim: 1.08, glow: 0.85 },
    FLY:      { breatheAmp: 0.05,  breatheSpd: 2.4, sway: 22, swaySpd: 1.6,  bob: 9, bobSpd: 1.6, tilt: 0.05, dim: 1.05, glow: 0.9 },
    FIRE:     { breatheAmp: 0.05,  breatheSpd: 2.2, sway: 10, swaySpd: 1.2,  bob: 6, bobSpd: 1.6, tilt: 0.03, dim: 1.1,  glow: 1.0 },
    SLEEP:    { breatheAmp: 0.055, breatheSpd: 0.8, sway: 4,  swaySpd: 0.5,  bob: 3, bobSpd: 0.6, tilt: 0.10, dim: 0.62, glow: 0.3 },
    THINKING: { breatheAmp: 0.04,  breatheSpd: 1.6, sway: 7,  swaySpd: 1.0,  bob: 6, bobSpd: 1.3, tilt: 0.05, dim: 0.95, glow: 0.6 },
    ERROR:    { breatheAmp: 0.04,  breatheSpd: 2.0, sway: 8,  swaySpd: 1.2,  bob: 6, bobSpd: 1.7, tilt: 0.0,  dim: 0.9,  glow: 0.5 }
  };

  function Rig(canvas, opts) {
    opts = opts || {};
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.reduced = !!opts.reduced;
    this.rows = this.reduced ? 26 : 52;
    this.img = null; this.off = null; this.offW = 0; this.offH = 0; this.ready = false;
    this.mood = 'IDLE';
    this.p = {};                 /* current (eased) params */
    this.tp = {};                /* target params */
    this._copy(MOODS.IDLE, this.p);
    this._copy(MOODS.IDLE, this.tp);
    this.lookX = 0; this.lookTX = 0;     /* look-at eased */
    this.lookActive = false; this.lookUntil = 0;
    /* transient timers (0..1 energy, decay over time) */
    this.squash = 0; this.leap = 0; this.leapDir = 1; this.fire = 0; this.shake = 0; this.wake = 0;
    this.running = false; this._raf = null; this._last = 0;
    this._fpsEMA = 60; this._onFps = opts.onFps || null; this._autoReduce = opts.autoReduce !== false; this._low = 0;
    this._bound = this._loop.bind(this);
    this.resize();
  }

  Rig.prototype._copy = function (s, d) { for (var k in s) if (s.hasOwnProperty(k)) d[k] = s[k]; };

  Rig.prototype.resize = function () {
    this.canvas.width = root.innerWidth;
    this.canvas.height = root.innerHeight;
    this._layout();
  };

  Rig.prototype._layout = function () {
    var W = this.canvas.width, H = this.canvas.height;
    if (!this.offW) { this.drawH = H * 0.6; this.drawW = this.drawH; }
    else {
      var aspect = this.offW / this.offH;
      var maxH = Math.min(H * 0.74, W * 0.98 / aspect);
      this.drawH = maxH; this.drawW = maxH * aspect;
    }
    this.cx = W / 2;
    this.cy = H * (W < 700 ? 0.46 : 0.47);
    this.baseX = this.cx - this.drawW / 2;
    this.baseY = this.cy - this.drawH / 2;
    this.pivotY = this.baseY + this.drawH * 0.92;   /* feet */
  };

  Rig.prototype.setImage = function (url) {
    var self = this;
    var im = new Image();
    im.onload = function () {
      self.img = im;
      var scaleH = 560;                       /* working resolution for cheap per-row draws */
      var s = Math.min(1, scaleH / im.height);
      self.offW = Math.round(im.width * s);
      self.offH = Math.round(im.height * s);
      var off = doc.createElement('canvas');
      off.width = self.offW; off.height = self.offH;
      off.getContext('2d').drawImage(im, 0, 0, self.offW, self.offH);
      self.off = off;
      self.ready = true;
      self._layout();
    };
    im.onerror = function () { /* keep previous image */ };
    im.src = url;
  };

  Rig.prototype.setReduced = function (on) {
    this.reduced = !!on; this.rows = on ? 26 : 52;
  };

  Rig.prototype.setMood = function (name) {
    if (!MOODS[name]) return;
    this.mood = name;
    this._copy(MOODS[name], this.tp);
    if (name === 'HAPPY') this.squash = 1;
    if (name === 'FLY') { this.leap = 1; this.leapDir = Math.random() < 0.5 ? -1 : 1; }
    if (name === 'FIRE') this.fire = 1;
    if (name === 'ERROR') this.shake = 1;
    if (name === 'IDLE') this.wake = Math.max(this.wake, 0.0);
  };

  Rig.prototype.wakeUp = function () { this.wake = 1; };   /* little pop when waking */

  Rig.prototype.setLook = function (fx) {
    this.lookTX = clamp((fx - 0.5) * 2, -1, 1);
    this.lookActive = true;
    this.lookUntil = Date.now() + 2200;
  };
  Rig.prototype.tap = function (fx) { this.squash = 1; if (fx != null) this.setLook(fx); };

  Rig.prototype.start = function () { if (this.running) return; this.running = true; this._last = 0; this._raf = root.requestAnimationFrame(this._bound); };
  Rig.prototype.stop = function () { this.running = false; if (this._raf) { root.cancelAnimationFrame(this._raf); this._raf = null; } };
  Rig.prototype.fps = function () { return Math.round(this._fpsEMA); };

  Rig.prototype._loop = function (ts) {
    if (!this.running) return;
    this._raf = root.requestAnimationFrame(this._bound);
    var dt = this._last ? (ts - this._last) : 16; this._last = ts;
    if (dt > 0) {
      var fps = 1000 / dt; this._fpsEMA = this._fpsEMA * 0.9 + fps * 0.1;
      if (this._onFps) this._onFps(this._fpsEMA);
      if (this._autoReduce && !this.reduced) {
        this._low = this._fpsEMA < 26 ? this._low + 1 : 0;
        if (this._low > 45) this.setReduced(true);
      }
    }
    var k = Math.min(1, dt / 1000);
    this._render(ts / 1000, k);
  };

  Rig.prototype._render = function (t, k) {
    var ctx = this.ctx, W = this.canvas.width, H = this.canvas.height;
    ctx.clearRect(0, 0, W, H);
    if (!this.ready) return;

    /* ease params toward target */
    var p = this.p, tp = this.tp, e = Math.min(1, k * 4);
    for (var key in tp) if (tp.hasOwnProperty(key)) p[key] = lerp(p[key], tp[key], e);

    /* look-at easing + auto-release */
    if (this.lookActive && Date.now() > this.lookUntil) { this.lookActive = false; this.lookTX = 0; }
    this.lookX = lerp(this.lookX, this.lookTX, Math.min(1, k * 6));

    /* decay transients */
    this.squash = Math.max(0, this.squash - k * 2.2);
    this.leap = Math.max(0, this.leap - k * 1.1);
    this.fire = Math.max(0, this.fire - k * 1.8);
    this.shake = Math.max(0, this.shake - k * 3.0);
    this.wake = Math.max(0, this.wake - k * 2.5);

    var drawW = this.drawW, drawH = this.drawH, N = this.rows;
    var rowH = drawH / N, srcRowH = this.offH / N;

    /* global body motion */
    var bob = Math.sin(t * p.bobSpd) * p.bob + (this.wake * -18);
    var leapPhase = this.leap;                     /* 1->0 */
    var leapY = -Math.sin(leapPhase * Math.PI) * drawH * 0.28;
    var leapX = this.leapDir * Math.sin(leapPhase * Math.PI) * drawW * 0.12;
    var tilt = Math.sin(t * p.swaySpd * 0.7) * p.tilt + (this.leap ? this.leapDir * 0.12 * Math.sin(leapPhase * Math.PI) : 0);
    var sxg = 1 + this.squash * 0.12 + this.wake * 0.08;   /* squash: wider */
    var syg = 1 - this.squash * 0.14 + this.fire * 0.04;   /* squash: shorter; fire: stretch up a touch */
    var shakeX = this.shake ? (Math.random() - 0.5) * 16 * this.shake : 0;

    ctx.save();
    /* pulsing glow behind the creature */
    var flick = 0.78 + 0.22 * Math.sin(t * 9.0) * Math.sin(t * 3.3);
    var gA = clamp(p.glow * flick, 0, 1);
    var gr = ctx.createRadialGradient(this.cx, this.cy, drawH * 0.06, this.cx, this.cy, drawH * 0.72);
    gr.addColorStop(0, 'rgba(255,150,40,' + (0.33 * gA).toFixed(3) + ')');
    gr.addColorStop(0.5, 'rgba(255,70,0,' + (0.16 * gA).toFixed(3) + ')');
    gr.addColorStop(1, 'rgba(255,40,0,0)');
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = gr;
    ctx.beginPath(); ctx.arc(this.cx, this.cy, drawH * 0.72, 0, 6.2832); ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    ctx.restore();

    /* body: transform about the feet pivot, then draw slivers */
    ctx.save();
    ctx.translate(this.cx + leapX + shakeX, this.pivotY + bob + leapY);
    ctx.rotate(tilt);
    ctx.scale(sxg, syg);
    ctx.translate(-this.cx, -this.pivotY);
    if (p.dim < 0.999) ctx.globalAlpha = p.dim;

    for (var r = 0; r < N; r++) {
      var f = (r + 0.5) / N;                    /* 0 top .. 1 bottom */
      var topW = Math.pow(1 - f, 1.25);         /* pendulum weight (feet anchored) */
      var chestW = Math.sin(f * Math.PI);       /* breathing strongest mid-body */
      var wave = Math.sin(t * p.swaySpd + f * 3.0);
      var shift = wave * p.sway * topW
                + this.lookX * (drawW * 0.11) * smooth(clamp(1 - f * 1.4, 0, 1))  /* head leans to finger */
                + (this.fire ? -this.leapDir * 0 : 0);
      var bw = 1 + p.breatheAmp * Math.sin(t * p.breatheSpd) * chestW;
      var dW = drawW * bw;
      var dx = this.baseX + (drawW - dW) / 2 + shift;
      var dy = this.baseY + r * rowH;
      ctx.drawImage(this.off, 0, r * srcRowH, this.offW, srcRowH, dx, dy, dW, rowH + 0.8);
    }
    ctx.globalAlpha = 1;
    ctx.restore();

    /* fire breath flash on FIRE (brief additive bloom at the muzzle, right side) */
    if (this.fire > 0.01) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      var fx = this.cx + drawW * 0.33, fy = this.cy - drawH * 0.04;
      var fr = drawW * (0.14 + 0.18 * (1 - this.fire));
      var fg = ctx.createRadialGradient(fx, fy, 2, fx, fy, fr);
      var fa = this.fire;
      fg.addColorStop(0, 'rgba(255,245,180,' + (0.8 * fa).toFixed(3) + ')');
      fg.addColorStop(0.4, 'rgba(255,150,30,' + (0.5 * fa).toFixed(3) + ')');
      fg.addColorStop(1, 'rgba(255,60,0,0)');
      ctx.fillStyle = fg;
      ctx.beginPath(); ctx.arc(fx, fy, fr, 0, 6.2832); ctx.fill();
      ctx.restore();
    }

    /* sleep Z's */
    if (this.mood === 'SLEEP') {
      ctx.save();
      ctx.globalAlpha = 0.5 + 0.3 * Math.sin(t * 1.5);
      ctx.fillStyle = '#cfe3ff';
      ctx.font = (drawH * 0.06) + 'px Arial';
      var zx = this.cx + drawW * 0.22, zy = this.cy - drawH * 0.42;
      ctx.fillText('z', zx, zy);
      ctx.font = (drawH * 0.045) + 'px Arial';
      ctx.fillText('z', zx - drawH * 0.05, zy - drawH * 0.06 + Math.sin(t) * 4);
      ctx.restore();
    }
  };

  FT.Rig = Rig;
})(window, document);
