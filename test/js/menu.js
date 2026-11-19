/* menu.js (V1.5.2) — the ⚙ menu at the top right: sound level, update (OTA) status, version.
 * The 🔊 button stays outside for a quick change; the menu shows the three levels side by side.
 * Update: shows what the app's OTA (HoLuaOta, OtaBridge.java) reports, in plain words, and an
 * "Update now" button only when a verified new version is already downloaded (it reloads the page).
 * Closes on ✕, a touch outside, after 25 s, or when the page goes to the background. ES5 (Chrome 62). */
(function (root, doc) {
  'use strict';
  var FT = root.FT = root.FT || {};
  var O = root.HoLuaOta || null, AUTO_MS = 25000;
  var btn, panel, timer = 0, open = false;
  function $(id) { return doc.getElementById(id); }
  function T(k, v) { return FT.I18N ? FT.I18N.t(k, v) : k; }
  function served() { var m = /^\/v(\d+)\//.exec(root.location.pathname); return m ? +m[1] : 0; }

  /* the app's status string -> one plain sentence */
  function otaText() {
    if (!O) return { t: T('ota.web'), ready: false };
    var s = '', ready = false;
    try { s = String(O.status()); ready = !!O.ready(); } catch (e) { return { t: T('ota.error'), ready: false }; }
    if (ready) return { t: T('ota.ready'), ready: true };
    if (/OTA off/.test(s) || /^off\b/.test(s)) return { t: T('ota.off'), ready: false };
    if (/^error/.test(s)) return { t: T('ota.error'), ready: false };
    if (/needs a newer APK/.test(s)) return { t: T('ota.newer'), ready: false };
    if (/not enough space/.test(s)) return { t: T('ota.space'), ready: false };
    if (/rolled back/.test(s)) return { t: T('ota.rolled'), ready: false };
    if (/^waiting/.test(s)) return { t: T('ota.waiting'), ready: false };
    return { t: T('ota.uptodate'), ready: false };              /* up to date / activated (already serving) */
  }

  function render() {
    var lvl = FT.Sound && FT.Sound.level ? FT.Sound.level() : 1;
    var bs = $('menuSound') ? $('menuSound').getElementsByTagName('button') : [];
    for (var i = 0; i < bs.length; i++) bs[i].className = +bs[i].getAttribute('data-lvl') === lvl ? 'on' : '';
    var o = otaText();
    if ($('otaLine')) $('otaLine').textContent = o.t;
    if ($('otaNow')) $('otaNow').style.display = o.ready ? '' : 'none';
    var v = $('version');
    if (v) {
      var n = served();
      v.textContent = (v.getAttribute('data-v') || '') + ' · ' + (n > 0 ? T('menu.pack', { v: n }) : T('menu.apk'));
    }
  }
  function kick() { clearTimeout(timer); timer = setTimeout(close, AUTO_MS); }
  function show() {
    open = true; render(); panel.className = 'open'; btn.setAttribute('aria-expanded', 'true'); kick();
  }
  function close() {
    if (!open) return;
    open = false; clearTimeout(timer); panel.className = ''; btn.setAttribute('aria-expanded', 'false');
  }

  function boot() {
    btn = $('menuBtn'); panel = $('menuPanel');
    if (!btn || !panel) return;
    var v = $('version'); if (v && !v.getAttribute('data-v')) v.setAttribute('data-v', v.textContent);
    btn.onclick = function (e) { if (e) e.stopPropagation(); if (open) close(); else show(); if (FT.Sound) FT.Sound.play('tick'); };
    $('menuClose').onclick = function (e) { if (e) e.stopPropagation(); close(); };
    /* touches inside the menu never reach the tiger; any touch keeps it open a bit longer */
    function inside(e) { e.stopPropagation(); kick(); }
    panel.addEventListener('touchstart', inside, false);
    panel.addEventListener('mousedown', inside, false);
    panel.addEventListener('click', function (e) { e.stopPropagation(); }, false);
    /* a touch anywhere else closes it (capture, before the tiger reacts) */
    function outside(e) { if (open && !panel.contains(e.target) && !btn.contains(e.target)) close(); }
    doc.addEventListener('touchstart', outside, true);
    doc.addEventListener('mousedown', outside, true);
    doc.addEventListener('visibilitychange', function () { if (doc.hidden) close(); });
    var seg = $('menuSound');
    if (seg) seg.onclick = function (e) {
      var t = e.target, n = t && t.getAttribute ? t.getAttribute('data-lvl') : null;
      if (n === null || !FT.Sound) return;
      FT.Sound.setLevel(+n);
      if (+n > 0) FT.Sound.play('tick');
      render();
    };
    if (FT.Sound && FT.Sound.onLevel) FT.Sound.onLevel(function () { if (open) render(); });
    if (FT.I18N) FT.I18N.on(function () { if (open) render(); });
    var now = $('otaNow');
    if (now) now.onclick = function () {
      close();
      try { if (O && O.ready()) O.applyNow(); } catch (e) { }
    };
  }
  FT.Menu = { open: function () { return open; }, close: function () { close(); } };
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', boot); else boot();
})(window, document);
