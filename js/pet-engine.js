/* pet-engine.js — main wiring: DOM + FSM + particles + touch + sound + OTA.
 * NOTE ON ANIMATION (honest): the default renderer (puppet.js) deforms the approved artwork with a 2D mesh
 * bent by 13 bones (head, jaw, ears, tail, legs) plus a blink/look/flame shader. It is a 2D puppet of one
 * picture, not a 3D model and not frame-by-frame animation. Fallback without WebGL2: rig.js, a 2.5D
 * Canvas warp of the same single picture.
 * While the Xin quẻ panel is open (this.modal) the tiger stays quiet: no idle talk, gestures ignored.
 * Old-WebView safe: ES5, function module. Exposes window.act / checkUpdate / rollbackAsset for
 * the backup on-screen buttons. */
(function (root, doc) {
  'use strict';
  var FT = root.FT = root.FT || {};

  function $(id) { return doc.getElementById(id); }
  function pick(a) { return a[(Math.random() * a.length) | 0]; }

  /* fallback only (brand.js normally replaces it): same polite "anh/chị" voice */
  var LINES = {
    IDLE: ['Chào anh/chị, Hổ Lửa rất vui được đón anh/chị 🐯'],
    TOUCH: ['Cảm ơn anh/chị đã ghé thăm Hổ Lửa ❤️'],
    HAPPY: ['Chúc anh/chị một ngày nhiều niềm vui ✨'],
    FLY: ['Hổ Lửa bay lên nào 🪽'],
    FIRE: ['Hít sâu… phù! 🔥'],
    SLEEP: ['Hổ Lửa nghỉ một chút, anh/chị chạm để đánh thức nhé 🌙'],
    THINKING: ['Hổ Lửa đang kiểm tra, anh/chị chờ chút nhé…'],
    ERROR: ['Chưa hoàn tất, anh/chị thử lại nhé.']
  };
  if (FT.BRAND && FT.BRAND.lines) LINES = FT.BRAND.lines;     /* Phước Lộc voice (brand.js) */
  /* English (content-en.js) when the customer switched language (i18n.js) */
  function EN() { return FT.I18N && FT.I18N.en() && FT.BRAND_EN; }
  function lines() { return EN() ? FT.BRAND_EN.lines : LINES; }
  function T(k) { return FT.I18N ? FT.I18N.t(k) : k; }
  var CLASS = { IDLE: '', TOUCH: 'touch', HAPPY: 'happy', FLY: 'fly', FIRE: 'fire', SLEEP: 'sleep', THINKING: 'thinking', ERROR: 'error' };

  function Engine() {
    this.pet = $('pet');
    this.bubble = $('bubble');
    this.charge = $('charge');
    this.chargeFill = $('chargeFill');
    this.fpsEl = $('fps');
    this.versionEl = $('version');
    this.canvas = $('sparks');
    this.debug = /[?&]debug=1/.test(root.location.search);

    var self = this;
    this.particles = new FT.ParticleEngine(this.canvas, {
      capFull: 70, capReduced: 22,
      onFps: function (f) {
        if (self.debug && self.fpsEl) {
          var rf = self.rig && self.rig.fps ? self.rig.fps() : Math.round(f);
          self.fpsEl.textContent = (self.renderer || '') + ' FPS ' + rf + (self.rig && self.rig.reduced ? ' · nhẹ' : '');
        }
      }
    });

    /* renderer: default = the approved art as a skinned puppet (puppet.js, WebGL2);
     * ?r=3d = the code-built 3D tiger (tiger3d.js); ?r=2d or no WebGL2 = the 2.5D image rig. */
    var force = (root.location.search.match(/[?&]r=(2d|3d|pp)/) || [])[1];
    this.renderer = '2d';
    var Kind = null, label = '';
    if (force === '3d' && FT.Tiger3D && FT.Tiger3D.supported()) { Kind = FT.Tiger3D; label = '3d'; }
    else if (force !== '2d' && FT.Puppet && FT.Puppet.supported()) { Kind = FT.Puppet; label = 'puppet'; }
    if (Kind) {
      try {
        this.rig = new Kind($('creature3d'), { autoReduce: true });
        this.renderer = label;
        $('creature').style.display = 'none';
        this.particles.ambient = false;     /* the WebGL renderer has its own fire */
      } catch (err) { this.rig = null; this.err3d = String(err && err.message || err); if (root.console) console.error('WebGL init failed, using 2.5D', err); }
    }
    if (!this.rig) {
      $('creature3d').style.display = 'none';
      this.rig = new FT.Rig($('creature'), { autoReduce: true });
      this.rig.setImage('assets/fire-tiger/tiger_cut_820.png');
    }
    this.rig.start();
    /* Phước Lộc brand talk now and then while idle */
    var talker = this;
    if (FT.BRAND && FT.BRAND.idleTalk) setInterval(function () {
      if (!talker.sm || !talker.sm.is('IDLE') || doc.hidden || talker.modal) return;
      if (FT.Talk && FT.Talk.quiet()) return;           /* V1.3: never over the tiger's voice or its question */
      /* mùng 1 / rằm / Phật đản / Vu Lan: calm lines only, no products, no CTA */
      var holy = FT.holyToday && FT.holyToday() && FT.QUE && FT.QUE.holyIdle;
      var Q = EN() && FT.QUE_EN ? FT.QUE_EN : FT.QUE;
      talker.say(pick(holy ? Q.holyIdle : (EN() ? FT.BRAND_EN.idleTalk : FT.BRAND.idleTalk)));
    }, 14000);

    /* LAN diagnostics: a GET beacon the PC's http.server logs (404 is fine; the query is the data).
     * Sends renderer, FPS, GPU, screen size, user agent — so the device can be tuned without
     * anyone reading numbers off the screen. Only goes to the same server that served the page. */
    var me = this;
    function diag(tag) {
      try {
        var gl = 'none', g = null, tmp = null;
        if (me.renderer !== '2d' && me.rig.renderer && me.rig.renderer.getContext) g = me.rig.renderer.getContext();
        else { tmp = doc.createElement('canvas'); g = tmp.getContext('webgl2') || tmp.getContext('webgl'); }
        if (g) {
          var ext = g.getExtension('WEBGL_debug_renderer_info');
          gl = (root.WebGL2RenderingContext && g instanceof root.WebGL2RenderingContext ? 'gl2:' : 'gl1:') +
            (ext ? g.getParameter(ext.UNMASKED_RENDERER_WEBGL) : g.getParameter(g.RENDERER));
          if (tmp) { var lose = g.getExtension('WEBGL_lose_context'); if (lose) lose.loseContext(); }
        }
        var q = 'tag=' + tag + '&r=' + me.renderer + '&fps=' + (me.rig.fps ? me.rig.fps() : 0) +
          '&red=' + (me.rig.reduced ? 1 : 0) + '&w=' + root.innerWidth + '&h=' + root.innerHeight +
          '&dpr=' + (root.devicePixelRatio || 1) + '&mod=' + (FT.Puppet ? 1 : 0) +
          '&err=' + encodeURIComponent(me.err3d || '') + '&gl=' + encodeURIComponent(gl) +
          '&ua=' + encodeURIComponent(navigator.userAgent);
        new Image().src = '_diag?' + q + '&t=' + Date.now();
      } catch (e) { new Image().src = '_diag?tag=' + tag + '&diagerr=' + encodeURIComponent(String(e)); }
    }
    setTimeout(function () { diag('5s'); }, 5000);
    setTimeout(function () { diag('15s'); }, 15000);
    root.addEventListener('error', function (ev) {
      new Image().src = '_diag?tag=jserr&msg=' + encodeURIComponent((ev.message || '') + ' @' + (ev.filename || '') + ':' + (ev.lineno || ''));
    });

    this.sm = new FT.StateMachine(
      function (next, prev) { self._enter(next, prev); },
      function (prev, next) { self._exit(prev, next); }
    );

    this._wireTouch();
    this._wireLifecycle();
    this.particles.start();
    this.sm.go('IDLE', true);

    this.updater = new FT.AssetUpdater({
      manifestUrl: 'ota/manifest.json',
      onStatus: function (s) { self._otaStatus(s); }
    });
    /* boot: the rig already painted the bundled cut asset. Quietly load any cached asset,
     * then quietly freshen via OTA (self-heals a stale cache, fetches on first run). No bubble
     * noise at launch; the manual ↻ OTA button runs the loud, visible version. */
    this.updater.loadCached(true).then(function (c) {
      if (c && c.map) self._applyAssets(c.map);
      self.updater.check(true).then(function (res) {
        if (res && res.map) self._applyAssets(res.map);
      }).catch(function () {});
    });

    if (this.debug && this.fpsEl) {
      this.fpsEl.style.display = 'block';
      this.fpsEl.textContent = 'FPS — · sha256:' + FT.sha256Engine;
    }
  }

  Engine.prototype._applyAssets = function (map) {
    var url = map['tiger'] || map['assets/fire-tiger/tiger_cut_820.png'];
    if (url && this.rig) this.rig.setImage(url);
  };

  Engine.prototype.say = function (s) { if (this.bubble) this.bubble.textContent = s; };
  Engine.prototype.greet = function () { this.say(lines().IDLE[0]); };

  Engine.prototype._enter = function (next, prev) {
    if (this.rig) this.rig.setMood(next);
    var LL = lines();
    /* V1.3: talk.js speaks / sets the bubble for touches, fly, fire, sleep and wake (personality moods) */
    var talked = !!(FT.Talk && FT.Talk.react(next, prev));
    if (!talked && LL[next] && !(this.modal && next === 'IDLE')) this.say(pick(LL[next]));   /* keep the quẻ line in the bubble */
    var SND = { TOUCH: 'pet', HAPPY: 'happy', FLY: 'fly', FIRE: 'fire', SLEEP: 'sleep', ERROR: 'error' };
    if (FT.Sound && SND[next] && (next !== prev || next === 'TOUCH')) FT.Sound.play(SND[next]);

    switch (next) {
      case 'TOUCH':  this.particles.burst(12, this._touchFx, this._touchFy, 0.8); break;
      case 'HAPPY':  this.particles.burst(30, 0.5, 0.42, 1); break;
      case 'FLY':    this.particles.burst(52, 0.5, 0.52, 1.1); break;
      case 'FIRE':   this.particles.burst(70, 0.62, 0.44, 1.3); break;
      default: break;
    }
  };

  Engine.prototype._exit = function (prev, next) {
    if (prev === 'SLEEP' && this.rig) this.rig.wakeUp();
    if (prev === 'SLEEP' && FT.Sound) FT.Sound.play('wake');
  };

  /* ---------- gestures ---------- */
  Engine.prototype._wireTouch = function () {
    var self = this;
    /* gesture beacon: the PC log shows whether taps/swipes/holds reach the app on the device */
    function gdiag(ev) { try { new Image().src = '_diag?tag=g&ev=' + ev + '&s=' + self.sm.state + '&t=' + Date.now(); } catch (e) {} }
    this.touch = new FT.TouchController(this.pet, {
      onTap: function (fx, fy) {
        if (self.modal) return;
        if (self.sm.is('SLEEP')) { self.sm.reset(); return; }     /* tap wakes */
        if (self.sm.is('THINKING')) return;
        self._touchFx = fx; self._touchFy = fy;
        if (self.rig) self.rig.tap(fx);
        self.sm.go('TOUCH', self.sm.is('IDLE') || self.sm.is('TOUCH') || self.sm.is('HAPPY'));
        gdiag('tap');
      },
      onSwipeUp: function () {
        if (self.modal) return;
        if (self.sm.is('SLEEP')) { self.sm.reset(); return; }
        self.sm.go('FLY');
        gdiag('swipe');
      },
      onHoldStart: function () {
        /* charge only from a calm state: never cut a flight/fire, never while asleep, busy or in Xin quẻ */
        self.holdOk = !self.modal && (self.sm.is('IDLE') || self.sm.is('TOUCH') || self.sm.is('HAPPY'));
        if (!self.holdOk) return;
        self.charge.className = 'show';
        if (self.rig.setCharge) self.rig.setCharge(true);
        self.say(T('pet.charge'));
        if (FT.Sound) FT.Sound.charge(true, 0);
      },
      onHoldProgress: function (p) {
        if (!self.holdOk) return;
        self.chargeFill.style.width = Math.round(p * 100) + '%';
        if (self.rig.setChargeLevel) self.rig.setChargeLevel(p);
        if (FT.Sound) FT.Sound.charge(true, p);
      },
      onHoldEnd: function (charged) {
        if (!self.holdOk) return;
        self.holdOk = false;
        self.charge.className = '';
        self.chargeFill.style.width = '0%';
        if (self.rig.setCharge) self.rig.setCharge(false);
        if (FT.Sound) FT.Sound.charge(false);
        if (self.sm.is('SLEEP')) return;
        gdiag('hold' + (charged ? '-fire' : '-short'));
        if (charged) { self.sm.go('FIRE', true); }
        else { self.say(T('pet.short')); }
      }
    });
  };

  /* ---------- OTA status -> THINKING / ERROR states ---------- */
  Engine.prototype._otaStatus = function (s) {
    if (s.code === 'thinking' || s.code === 'downloading') {
      if (!this.sm.is('FIRE') && !this.sm.is('FLY')) this.sm.go('THINKING', true);
      this.say(s.msg);
    } else if (s.code === 'error') {
      this.sm.go('ERROR', true);
      this.say(s.msg);
    } else {
      /* activated / uptodate / rolledback / cache-hit */
      if (this.sm.is('THINKING')) this.sm.reset();
      this.say(s.msg);
      if (s.extra && this.versionEl) this.versionEl.textContent = 'Asset ' + s.extra;
    }
  };

  /* ---------- lifecycle / perf ---------- */
  Engine.prototype._wireLifecycle = function () {
    var self = this;
    root.addEventListener('resize', function () { self.particles.resize(); if (self.rig) self.rig.resize(); });
    doc.addEventListener('visibilitychange', function () {
      if (doc.hidden) { self.particles.stop(); if (self.rig) self.rig.stop(); }
      else { self.particles.start(); if (self.rig) self.rig.start(); }
    });
    /* head follows pointer / finger (look-at) */
    var stage = $('stage');
    function look(x, y) { if (self.rig && !self.sm.is('SLEEP') && !self.modal) self.rig.setLook(x / root.innerWidth, y / root.innerHeight); }
    stage.addEventListener('mousemove', function (e) { look(e.clientX, e.clientY); });
    stage.addEventListener('touchmove', function (e) { if (e.touches && e.touches[0]) look(e.touches[0].clientX, e.touches[0].clientY); }, { passive: true });
  };

  /* play one renderer gesture (look, paw, swish, hop, roar, ears, stretch) if the renderer has them */
  Engine.prototype.gesture = function (name) {
    if (this.rig && this.rig._startGesture) this.rig._startGesture(name);
  };

  /* ---------- public API for backup buttons ---------- */
  Engine.prototype.act = function (name) {
    if (this.modal) return;
    if (name === 'sleep') {
      if (this.sm.is('SLEEP')) { this.sm.reset(); } else { this.sm.go('SLEEP', true); }
      return;
    }
    if (this.sm.is('SLEEP')) { this.sm.reset(); return; }
    if (this.sm.is('THINKING')) return;
    this.sm.go(name.toUpperCase(), true);   /* backup buttons may force */
  };

  Engine.prototype.checkUpdate = function () {
    var self = this;
    this.updater.check().then(function (res) {
      if (res && res.map) self._applyAssets(res.map);
    }).catch(function () {});
  };

  Engine.prototype.rollbackAsset = function () {
    var self = this;
    this.updater.rollback().then(function (res) {
      if (res && res.map) self._applyAssets(res.map);
    }).catch(function () {});
  };

  Engine.prototype.toggleReduced = function () {
    var on = !this.particles.reduced;
    this.particles.setReduced(on);
    if (this.rig) this.rig.setReduced(on);
    if (FT.Sound && FT.Sound.setReduced) FT.Sound.setReduced(on);
    this.say(T(on ? 'pet.reducedOn' : 'pet.reducedOff'));
  };

  /* boot */
  function boot() {
    var e = new Engine();
    root.FT.engine = e;
    root.act = function (n) { e.act(n); };
    root.checkUpdate = function () { e.checkUpdate(); };
    root.rollbackAsset = function () { e.rollbackAsset(); };
    root.toggleReduced = function () { e.toggleReduced(); };
    /* buttons are wired here (no inline onclick: the page runs under a strict Content-Security-Policy) */
    var bs = doc.querySelectorAll('[data-act]');
    for (var i = 0; i < bs.length; i++) bs[i].onclick = function () { e.act(this.getAttribute('data-act')); };
    if (FT.I18N) FT.I18N.on(function () { if (!e.modal) e.say(lines().IDLE[0]); });
    var ota = $('otaBtn');
    if (ota) {
      if (root.location.hostname === 'hoalua.local') ota.style.display = 'none';   /* app: pictures ship inside the APK */
      else ota.onclick = function () { e.checkUpdate(); };
    }
  }
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', boot);
  else boot();
})(window, document);
