/* particle-engine.js — capped ember/spark particle system on a 2D canvas.
 * Performance for a weak Android 7.1.1 device:
 *   - hard particle cap (full vs reduced mode)
 *   - rolling FPS meter; auto-drops to reduced mode when FPS stays low
 *   - single clearRect per frame, no per-particle shadow/gradient
 *   - pauses the RAF loop when the page is hidden (no leak, no wasted battery)
 * Old-WebView safe: ES5, function constructor. Exposes FT.ParticleEngine. */
(function (root) {
  'use strict';
  var FT = root.FT = root.FT || {};

  function ParticleEngine(canvas, opts) {
    opts = opts || {};
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.parts = [];
    this.reduced = !!opts.reduced;
    this.capFull = opts.capFull || 90;
    this.capReduced = opts.capReduced || 28;
    this.ambient = opts.ambient !== false;   /* background embers */
    this.running = false;
    this._raf = null;
    this._last = 0;
    this._fpsEMA = 60;
    this._lowFrames = 0;
    this._onFps = opts.onFps || null;
    this._autoReduce = opts.autoReduce !== false;
    this._boundLoop = this._loop.bind(this);
    this.resize();
  }

  ParticleEngine.prototype.cap = function () { return this.reduced ? this.capReduced : this.capFull; };

  ParticleEngine.prototype.resize = function () {
    /* cap the backing store to the CSS size (no retina over-render on weak GPUs) */
    this.canvas.width = root.innerWidth;
    this.canvas.height = root.innerHeight;
  };

  ParticleEngine.prototype.setReduced = function (on) {
    this.reduced = !!on;
    if (this.parts.length > this.cap()) this.parts.length = this.cap();
  };

  /* Emit n sparks around a focal point (fx,fy are 0..1 fractions of viewport). */
  ParticleEngine.prototype.burst = function (n, fx, fy, power) {
    fx = (fx == null) ? 0.5 : fx;
    fy = (fy == null) ? 0.45 : fy;
    power = power || 1;
    var cap = this.cap();
    var room = cap - this.parts.length;
    if (room <= 0) return;
    if (n > room) n = room;
    var W = this.canvas.width, H = this.canvas.height;
    for (var i = 0; i < n; i++) {
      this.parts.push({
        x: W * (fx + (Math.random() - 0.5) * 0.14),
        y: H * (fy + (Math.random() - 0.5) * 0.16),
        vx: (Math.random() - 0.5) * 9 * power,
        vy: (-2 - Math.random() * 7) * power,
        r: 1 + Math.random() * 4,
        life: 40 + Math.random() * 35,
        max: 80,
        hot: Math.random() > 0.5
      });
    }
  };

  ParticleEngine.prototype._spawnAmbient = function () {
    if (!this.ambient) return;
    var cap = this.cap();
    var ambientCap = Math.floor(cap * 0.6);
    if (this.parts.length >= ambientCap) return;
    var chance = this.reduced ? 0.35 : 0.8;
    if (Math.random() > chance) return;
    var W = this.canvas.width, H = this.canvas.height;
    this.parts.push({
      x: W * (0.2 + Math.random() * 0.6),
      y: H * (0.55 + Math.random() * 0.35),
      vx: (Math.random() - 0.5) * 1.4,
      vy: -0.5 - Math.random() * 1.5,
      r: 1 + Math.random() * 2,
      life: 70, max: 70, hot: Math.random() > 0.5
    });
  };

  ParticleEngine.prototype._loop = function (ts) {
    if (!this.running) return;
    this._raf = root.requestAnimationFrame(this._boundLoop);

    if (this._last) {
      var dt = ts - this._last;
      if (dt > 0) {
        var fps = 1000 / dt;
        this._fpsEMA = this._fpsEMA * 0.9 + fps * 0.1;
        if (this._onFps) this._onFps(this._fpsEMA);
        if (this._autoReduce && !this.reduced) {
          if (this._fpsEMA < 26) { this._lowFrames++; } else { this._lowFrames = 0; }
          if (this._lowFrames > 45) { this.setReduced(true); }  /* ~1.5s sustained low */
        }
      }
    }
    this._last = ts;

    var ctx = this.ctx, W = this.canvas.width, H = this.canvas.height;
    ctx.clearRect(0, 0, W, H);
    this._spawnAmbient();
    for (var i = this.parts.length - 1; i >= 0; i--) {
      var p = this.parts[i];
      p.x += p.vx; p.y += p.vy; p.vy += 0.03; p.life--;
      if (p.life <= 0) { this.parts.splice(i, 1); continue; }
      ctx.globalAlpha = p.life / p.max; if (ctx.globalAlpha < 0) ctx.globalAlpha = 0;
      ctx.fillStyle = p.hot ? '#ffb02e' : '#ff5c13';
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, 6.2832);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  };

  ParticleEngine.prototype.start = function () {
    if (this.running) return;
    this.running = true;
    this._last = 0;
    this._raf = root.requestAnimationFrame(this._boundLoop);
  };

  ParticleEngine.prototype.stop = function () {
    this.running = false;
    if (this._raf) { root.cancelAnimationFrame(this._raf); this._raf = null; }
  };

  ParticleEngine.prototype.fps = function () { return Math.round(this._fpsEMA); };

  FT.ParticleEngine = ParticleEngine;
})(window);
