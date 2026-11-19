/* state-machine.js — finite state machine for the Fire Tiger pet.
 * Prevents conflicting animations: one active state at a time, explicit allowed
 * transitions, per-state duration with automatic return to IDLE.
 * Old-WebView safe: ES5, function constructor, no classes. Exposes FT.StateMachine. */
(function (root) {
  'use strict';
  var FT = root.FT = root.FT || {};

  /* State catalogue. `hold:true` = stays until explicitly changed (no auto-return).
   * `dur` = ms before auto-return to IDLE. `to` = states this state may transition into
   * (besides IDLE/ERROR which are always allowed). */
  var STATES = {
    IDLE:     { hold: true,  dur: 0,    to: ['HAPPY','FLY','FIRE','SLEEP','TOUCH','THINKING'] },
    TOUCH:    { hold: false, dur: 700,  to: ['HAPPY','FLY','FIRE'] },
    HAPPY:    { hold: false, dur: 1350, to: ['FLY','FIRE'] },
    FLY:      { hold: false, dur: 2800, to: [] },
    FIRE:     { hold: false, dur: 1450, to: [] },
    SLEEP:    { hold: true,  dur: 0,    to: [] },           /* woken only via IDLE */
    THINKING: { hold: true,  dur: 0,    to: [] },           /* cleared by caller (OTA done) */
    ERROR:    { hold: false, dur: 2200, to: [] }
  };

  function StateMachine(onEnter, onExit) {
    this.state = 'IDLE';
    this.locked = false;          /* true during a non-interruptible animation */
    this._timer = null;
    this._onEnter = onEnter || function () {};
    this._onExit = onExit || function () {};
  }

  StateMachine.prototype.can = function (next) {
    if (!STATES[next]) return false;
    if (next === this.state) return false;
    if (next === 'IDLE' || next === 'ERROR') return true;   /* always reachable */
    var def = STATES[this.state];
    if (!def) return true;
    for (var i = 0; i < def.to.length; i++) if (def.to[i] === next) return true;
    return false;
  };

  /* Request a transition. force=true bypasses the allow-list (used by hardware/back-up
   * buttons and system events). Returns true if the transition happened. */
  StateMachine.prototype.go = function (next, force) {
    if (!STATES[next]) return false;
    if (next === this.state && STATES[next].hold) return false;
    if (!force && this.locked && next !== 'IDLE' && next !== 'ERROR' && next !== 'SLEEP') return false;
    if (!force && !this.can(next)) return false;

    if (this._timer) { clearTimeout(this._timer); this._timer = null; }
    var prev = this.state;
    this._onExit(prev, next);
    this.state = next;
    var def = STATES[next];
    this.locked = !def.hold && next !== 'TOUCH';   /* TOUCH is a light, interruptible reaction */
    this._onEnter(next, prev);

    if (!def.hold && def.dur > 0) {
      var self = this;
      this._timer = setTimeout(function () {
        self._timer = null;
        self.locked = false;
        self.go('IDLE', true);
      }, def.dur);
    }
    return true;
  };

  StateMachine.prototype.is = function (s) { return this.state === s; };

  StateMachine.prototype.reset = function () {
    if (this._timer) { clearTimeout(this._timer); this._timer = null; }
    this.locked = false;
    this.go('IDLE', true);
  };

  FT.STATES = STATES;
  FT.StateMachine = StateMachine;
})(window);
