/* intro.js (V1.5.4) — "Giới thiệu Phước Lộc" button (top right) opens a box that plays the shop's intro video.
 * APK 1.5's OTA carries only listed file types (no .mp4, max 8 MB a file), so the video ships as base64 text
 * parts (assets/video/intro.N.txt, each checked by the signed OTA manifest) described by intro.json.
 * The page joins them into a Blob once and plays it from a blob: URL (allowed by the page CSP).
 * While the box is open the tiger stays quiet (engine.modal) and the OTA idle reload waits.
 * Closes on ✕, a touch outside the video, 20 s after the video ends, 60 s paused, or when the page goes
 * to the background. ES5 (Chrome 62). */
(function (root, doc) {
  'use strict';
  var FT = root.FT = root.FT || {};
  var DIR = 'assets/video/', END_MS = 20000, PAUSE_MS = 60000;
  var btn, box, vid, msg, url = '', loading = false, open = false, timer = 0;
  function $(id) { return doc.getElementById(id); }
  function T(k) { return FT.I18N ? FT.I18N.t(k) : k; }
  function eng() { return FT.engine || null; }

  function get(path, kind) {
    return root.fetch(DIR + path, { cache: 'no-store' }).then(function (r) {
      if (!r.ok) throw new Error(path + ' ' + r.status);
      return kind === 'json' ? r.json() : r.text();
    });
  }
  function b64(s) {
    var bin = root.atob(s), n = bin.length, a = new Uint8Array(n);
    for (var i = 0; i < n; i++) a[i] = bin.charCodeAt(i);
    return a;
  }
  /* join the parts once; later opens reuse the blob URL */
  function load() {
    if (url) return Promise.resolve(url);
    return get('intro.json', 'json').then(function (m) {
      var chunks = [], i = 0;
      function next() {
        if (i >= m.parts.length) return null;
        return get(m.parts[i++], 'text').then(function (t) { chunks.push(b64(t)); return next(); });
      }
      return Promise.resolve(next()).then(function () {
        var blob = new Blob(chunks, { type: m.type || 'video/mp4' });
        if (m.bytes && blob.size !== m.bytes) throw new Error('size ' + blob.size + ' != ' + m.bytes);
        url = root.URL.createObjectURL(blob);
        return url;
      });
    });
  }

  function later(ms) { clearTimeout(timer); timer = ms ? setTimeout(close, ms) : 0; }
  function say(k) { msg.textContent = k ? T(k) : ''; msg.style.display = k ? '' : 'none'; }

  function show() {
    if (open) return;
    open = true;
    if (FT.Menu) FT.Menu.close();
    if (FT.Speech) FT.Speech.stop();
    var e = eng();
    if (e) { e.modal = true; if (e.sm && e.sm.is('SLEEP')) e.sm.reset(); }
    box.className = 'open';
    btn.setAttribute('aria-expanded', 'true');
    later(0);
    if (url) { say(''); play(); return; }
    say('intro.loading');
    if (loading) return;
    loading = true;
    load().then(function () {
      loading = false;
      if (!open) return;
      say('');
      vid.src = url;
      play();
    }, function (err) {
      loading = false;
      if (root.console) root.console.warn('[intro] ' + err);
      if (open) { say('intro.error'); later(8000); }
    });
  }
  function play() {
    try { vid.currentTime = 0; } catch (e) { }
    var p = vid.play();
    if (p && p.catch) p.catch(function () { /* autoplay refused: the controls are there to press play */ });
  }
  function close() {
    if (!open) return;
    open = false;
    later(0);
    try { vid.pause(); } catch (e) { }
    box.className = '';
    btn.setAttribute('aria-expanded', 'false');
    var e = eng();
    if (e && !(FT.que && FT.que.isOpen && FT.que.isOpen())) e.modal = false;
  }

  function boot() {
    btn = $('introBtn'); box = $('introBox'); vid = $('introVideo'); msg = $('introMsg');
    if (!btn || !box || !vid || !msg) return;
    btn.onclick = function (e) { if (e) e.stopPropagation(); if (open) close(); else show(); if (FT.Sound) FT.Sound.play('tick'); };
    $('introClose').onclick = function (e) { if (e) e.stopPropagation(); close(); };
    /* touches inside the box never reach the tiger; a touch on the dark area around the video closes it */
    function stop(e) { e.stopPropagation(); }
    box.addEventListener('touchstart', stop, false);
    box.addEventListener('mousedown', stop, false);
    box.addEventListener('click', function (e) { e.stopPropagation(); if (e.target === box) close(); }, false);
    vid.addEventListener('ended', function () { later(END_MS); }, false);
    vid.addEventListener('pause', function () { if (open && !vid.ended) later(PAUSE_MS); }, false);
    vid.addEventListener('play', function () { later(0); }, false);
    vid.addEventListener('error', function () { if (open && url) { say('intro.error'); later(8000); } }, false);
    doc.addEventListener('visibilitychange', function () { if (doc.hidden) close(); });
  }
  FT.Intro = { open: function () { return open; }, show: function () { show(); }, close: function () { close(); } };
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', boot); else boot();
})(window, document);
