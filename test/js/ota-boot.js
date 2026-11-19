/* ota-boot.js (V1.5) — the page's half of the whole-app OTA (OtaBridge.java, bridge "HoLuaOta").
 * Loaded FIRST, so it sees script errors from every later file.
 *  - Boot health: 6 s after the page has loaded, if no script error happened and the tiger, talk and mic modules
 *    are up, it tells the app "this version works" (bootOk). Without that the app rolls back to the last good version.
 *  - Idle update: when a newer verified version is waiting, the page reloads only between customers
 *    (nobody touched the screen for 2 min, the tiger is not talking, no panel is open).
 * Nothing here downloads or runs anything; the app does all checking. ES5 only (Chrome 62 WebView). */
(function (root, doc) {
  'use strict';
  var errors = 0, last = Date.now(), IDLE_MS = 120000;
  /* capture phase: script errors, and also a script or stylesheet file that failed to load (it fires on the element) */
  root.addEventListener('error', function (e) {
    var t = e && e.target;
    if (!t || t === root) { errors++; return; }
    var tag = (t.tagName || '').toUpperCase();
    if (tag === 'SCRIPT' || tag === 'LINK') errors++;
  }, true);
  var O = root.HoLuaOta;
  if (!O) return;                                   /* browser preview: no app */
  function seen() { last = Date.now(); }
  doc.addEventListener('touchstart', seen, true);
  doc.addEventListener('mousedown', seen, true);
  doc.addEventListener('keydown', seen, true);

  function served() { var m = /^\/v(\d+)\//.exec(root.location.pathname); return m ? +m[1] : 0; }
  function healthy() {
    var FT = root.FT || {};
    return errors === 0 && !!(FT.engine && FT.Talk && FT.Mic && FT.Speech && FT.I18N && FT.Sound && FT.Que && FT.Lunar && FT.BRAND);
  }
  function idle() {
    var FT = root.FT || {};
    if (Date.now() - last < IDLE_MS || doc.hidden) return false;
    if (FT.Speech && FT.Speech.busy && FT.Speech.busy()) return false;
    if (FT.engine && FT.engine.modal) return false;
    if (FT.Mic && FT.Mic.active && FT.Mic.active()) return false;
    if (FT.Menu && FT.Menu.open()) return false;
    return true;
  }
  root.addEventListener('load', function () {
    var v = served();                                /* the ⚙ menu (menu.js) shows the pack number */
    setTimeout(function () { if (healthy()) { try { O.bootOk(v); } catch (e) { } } }, 6000);
    setInterval(function () {
      try { if (idle() && O.ready()) O.applyNow(); } catch (e) { }
    }, 30000);
  });
})(window, document);
