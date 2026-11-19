/* touch-controller.js — gesture recognizer over the pet element.
 * Gestures:
 *   tap            -> onTap(fx,fy)            quick touch = pet / vuốt ve at that point
 *   swipe up       -> onSwipeUp()             vuốt lên = bay
 *   hold (press)   -> onHoldStart(), onHoldProgress(0..1), onHoldEnd(charged) -> phun lửa
 * Uses touch + mouse events (not Pointer Events, for old-WebView support). One gesture at a
 * time, so animations never fire in conflict. Backup on-screen buttons call the engine directly.
 * Old-WebView safe: ES5, function constructor. Exposes FT.TouchController. */
(function (root) {
  'use strict';
  var FT = root.FT = root.FT || {};

  var TAP_MOVE = 18;       /* px: movement under this is still a tap */
  var SWIPE_UP = 55;       /* px upward to count as a swipe-up */
  var HOLD_MS = 320;       /* ms held (without swiping) before charging starts */
  var CHARGE_MS = 1100;    /* ms of holding to reach full charge */

  function now() { return Date.now(); }

  function TouchController(el, cb) {
    this.el = el;
    this.cb = cb || {};
    this.active = false;
    this.startX = 0; this.startY = 0; this.startT = 0;
    this.lastX = 0; this.lastY = 0;
    this.moved = 0;
    this.holding = false;
    this.swiped = false;
    this._holdTimer = null;
    this._chargeRaf = null;
    this._bind();
  }

  TouchController.prototype._frac = function (x, y) {
    return { fx: x / root.innerWidth, fy: y / root.innerHeight };
  };

  TouchController.prototype._down = function (x, y) {
    if (this.active) return;
    this.active = true;
    this.startX = this.lastX = x;
    this.startY = this.lastY = y;
    this.startT = now();
    this.moved = 0;
    this.holding = false;
    this.swiped = false;
    var self = this;
    this._holdTimer = setTimeout(function () {
      if (!self.active || self.swiped) return;
      if (self.moved <= TAP_MOVE) { self._beginCharge(); }
    }, HOLD_MS);
  };

  TouchController.prototype._beginCharge = function () {
    this.holding = true;
    if (this.cb.onHoldStart) this.cb.onHoldStart();
    var self = this, t0 = now();
    function tick() {
      if (!self.holding) return;
      var p = (now() - t0) / CHARGE_MS;
      if (p > 1) p = 1;
      if (self.cb.onHoldProgress) self.cb.onHoldProgress(p);
      self._chargeRaf = root.requestAnimationFrame(tick);
    }
    this._chargeRaf = root.requestAnimationFrame(tick);
  };

  TouchController.prototype._move = function (x, y) {
    if (!this.active) return;
    var dx = x - this.lastX, dy = y - this.lastY;
    this.moved += Math.abs(dx) + Math.abs(dy);
    this.lastX = x; this.lastY = y;
    /* swipe-up detection (only before a hold-charge has begun) */
    if (!this.holding && !this.swiped) {
      var totalUp = this.startY - y;
      var totalAbsX = Math.abs(x - this.startX);
      if (totalUp > SWIPE_UP && totalUp > totalAbsX) {
        this.swiped = true;
        if (this._holdTimer) { clearTimeout(this._holdTimer); this._holdTimer = null; }
        if (this.cb.onSwipeUp) this.cb.onSwipeUp();
      }
    }
  };

  TouchController.prototype._up = function (x, y) {
    if (!this.active) return;
    this.active = false;
    if (this._holdTimer) { clearTimeout(this._holdTimer); this._holdTimer = null; }
    if (this._chargeRaf) { root.cancelAnimationFrame(this._chargeRaf); this._chargeRaf = null; }

    if (this.holding) {
      this.holding = false;
      var charged = (now() - this.startT - HOLD_MS) >= (CHARGE_MS * 0.55);
      if (this.cb.onHoldEnd) this.cb.onHoldEnd(charged);
      return;
    }
    if (this.swiped) return;    /* swipe already handled */
    if (this.moved <= TAP_MOVE) {
      var f = this._frac(this.startX, this.startY);
      if (this.cb.onTap) this.cb.onTap(f.fx, f.fy);
    }
  };

  TouchController.prototype._cancel = function () {
    if (!this.active) return;
    this.active = false;
    if (this._holdTimer) { clearTimeout(this._holdTimer); this._holdTimer = null; }
    if (this._chargeRaf) { root.cancelAnimationFrame(this._chargeRaf); this._chargeRaf = null; }
    if (this.holding) { this.holding = false; if (this.cb.onHoldEnd) this.cb.onHoldEnd(false); }
  };

  TouchController.prototype._bind = function () {
    var self = this, el = this.el;
    el.addEventListener('touchstart', function (e) {
      var t = e.changedTouches[0]; self._down(t.clientX, t.clientY);
      e.preventDefault();
    }, { passive: false });
    el.addEventListener('touchmove', function (e) {
      var t = e.changedTouches[0]; self._move(t.clientX, t.clientY);
      e.preventDefault();          /* full-screen pet: never let the browser scroll/steal the gesture */
    }, { passive: false });
    el.addEventListener('touchend', function (e) {
      var t = e.changedTouches[0]; self._up(t.clientX, t.clientY);
    });
    el.addEventListener('touchcancel', function () { self._cancel(); });

    /* mouse fallback for PC testing */
    var mdown = false;
    el.addEventListener('mousedown', function (e) { mdown = true; self._down(e.clientX, e.clientY); });
    root.addEventListener('mousemove', function (e) { if (mdown) self._move(e.clientX, e.clientY); });
    root.addEventListener('mouseup', function (e) { if (mdown) { mdown = false; self._up(e.clientX, e.clientY); } });
  };

  FT.TouchController = TouchController;
})(window);
