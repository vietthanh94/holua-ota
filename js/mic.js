/* mic.js — V1.4 "🎤 Nói": the customer presses the button and speaks one phrase.
 * The tablet's own speech service (HoLuaMic, SpeechBridge.java: Google over the tablet's internet) turns it into
 * text; this file finds what the customer meant and the tiger answers with its RECORDED lines (talk.js).
 *  - The microphone opens only on a press, for one phrase. Nothing heard is stored or sent anywhere by the app.
 *  - Answers to the buttons on screen first ("vui lắm", "có", "để sau"), then a spoken birth year (→ mệnh),
 *    then topics (who are you, products, testing, choosing, advice, mệnh, quẻ, tiger facts, hello, thanks, bye,
 *    fire / fly / sleep). Not understood → "please say it again or pick a question" + the question buttons.
 *  - Holy days: product / testing / advice topics get a peaceful wish instead (no selling).
 *  - No speech service on the tablet → the button stays hidden; everything else works as in V1.3.
 * ES5 (Chrome 62 WebView). */
(function (root, doc) {
  'use strict';
  var FT = root.FT = root.FT || {};
  var M = root.HoLuaMic || null, on = false, guard = 0, btn = null, sess = 0;   /* sess: a late result of an old press is dropped */

  function $(id) { return doc.getElementById(id); }
  function T(k, v) { return FT.I18N ? FT.I18N.t(k, v) : k; }
  function lang() { return FT.I18N && FT.I18N.en() ? 'en' : 'vi'; }
  function eng() { return FT.engine; }
  function bubble(s) { var e = eng(); if (e) e.say(s); }
  function diag(q) { try { new Image().src = '_diag?tag=mic&' + q + '&t=' + Date.now(); } catch (e) {} }

  /* lower case, no accents, đ → d, letters / digits / spaces only */
  function norm(s) {
    s = String(s || '').toLowerCase();
    try { s = s.normalize('NFD').replace(/[̀-ͯ]/g, ''); } catch (e) {}
    return s.replace(/đ/g, 'd').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
  }
  function has(t, words) {
    var p = ' ' + t + ' ';
    for (var i = 0; i < words.length; i++) if (p.indexOf(' ' + words[i] + ' ') >= 0) return true;
    return false;
  }

  /* topics, checked in this order (unaccented phrases; whole words) */
  var TOPICS = [
    { id: 'menh', w: ['menh', 'ngu hanh', 'nam sinh', 'sinh nam', 'tuoi gi', 'hop mau', 'mau hop', 'element', 'elements', 'birth year', 'born', 'zodiac'] },
    { id: 'que', w: ['que', 'xin que', 'gieo que', 'boc que', 'fortune', 'blessing', 'daily blessing'] },
    { id: 'aboutCheck', w: ['kiem dinh', 'that gia', 'that hay gia', 'da that', 'hang that', 'hang gia', 'da gia', 'real stone', 'is it real', 'is this real', 'fake', 'genuine', 'certificate', 'authentic', 'tested'] },
    { id: 'aboutChoose', w: ['chon da', 'chon', 'hop voi', 'nen mua', 'nen deo', 'choose', 'pick', 'which stone', 'suits me'] },
    { id: 'aboutContact', w: ['tu van', 'bao nhieu', 'gia ca', 'gia sao', 'gia the nao', 'gia re', 'mua', 'dat hang', 'lien he', 'price', 'prices', 'cost', 'buy', 'how much', 'advice', 'contact'] },
    { id: 'aboutShop', w: ['co gi', 'ban gi', 'san pham', 'vong tay', 'vong', 'trang suc', 'tuong', 'da phong thuy', 'cua hang', 'what do you sell', 'products', 'sell', 'bracelet', 'bracelets', 'jewellery', 'jewelry', 'shop', 'store', 'statue'] },
    { id: 'aboutMe', w: ['la ai', 'ten gi', 'ten la gi', 'ban la ai', 'la con gi', 'who are you', 'your name', 'what are you', 'who is'] },
    { id: 'micFine', w: ['tro chuyen', 'noi chuyen', 'chat', 'khoe khong', 'the nao', 'co khoe', 'co vui', 'on khong', 'how are you', 'how are u', 'how is it going', 'how do you do'] },
    { id: 'fact', w: ['con ho', 've ho', 'chuyen ve ho', 'loai ho', 'ho an gi', 'tiger fact', 'tiger facts', 'about tigers', 'tigers', 'fun fact'] },
    { id: 'micHello', w: ['xin chao', 'chao', 'alo', 'hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening'] },
    { id: 'micThanks', w: ['cam on', 'thank', 'thanks', 'thank you'] },
    { id: 'micBye', w: ['tam biet', 'hen gap lai', 'di nhe', 'bye', 'goodbye', 'see you'] },
    { id: 'micLove', w: ['yeu', 'de thuong', 'dang yeu', 'dep qua', 'xinh qua', 'cute', 'love you', 'i like you', 'so cute', 'beautiful'] },
    { id: 'fire', w: ['phun lua', 'tha lua', 'breathe fire', 'fire'] },
    { id: 'fly', w: ['bay', 'bay len', 'fly', 'fly up'] },
    { id: 'sleep', w: ['di ngu', 'ngu di', 'ngu', 'sleep', 'go to sleep'] },
    { id: 'happy', w: ['vuot ve', 'nhay', 'dance', 'happy', 'pet'] }
  ];
  var SELLING = { aboutCheck: 1, aboutChoose: 1, aboutContact: 1, aboutShop: 1 };

  /* "giá" (price) and "giả" (fake) differ only by the accent: decided on the accented text */
  function accented(raw) {
    var r = String(raw || '').toLowerCase();
    try { r = r.normalize('NFC'); } catch (e) {}
    if (/(^|[^a-zà-ỹ])giả([^a-zà-ỹ]|$)/.test(r)) return 'aboutCheck';
    if (/(^|[^a-zà-ỹ])giá([^a-zà-ỹ]|$)/.test(r) && !/giá trị/.test(r)) return 'aboutContact';
    return '';
  }
  function topicOf(t, raw) {
    t = (' ' + t + ' ').replace(/ ho lua /g, ' ').replace(/ fire tiger /g, ' ').trim();   /* the tiger's own name is not a topic */
    for (var i = 0; i < 2; i++) if (has(t, TOPICS[i].w)) return TOPICS[i].id;   /* mệnh, quẻ first */
    var a = accented(raw); if (a) return a;
    for (i = 2; i < TOPICS.length; i++) if (has(t, TOPICS[i].w)) return TOPICS[i].id;
    return '';
  }
  function yearOf(t) {
    var m = t.match(/(^| )(19[2-9][0-9]|20[0-9][0-9])( |$)/), y = m ? parseInt(m[2], 10) : 0;
    return y >= 1920 && y <= new Date().getFullYear() ? y : 0;
  }

  /* what the customer said (up to 5 guesses from the speech service, best first) → the tiger's answer */
  function handle(list) {
    var Talk = FT.Talk, e = eng(); if (!Talk) return;
    var texts = [], raws = [], i;
    for (i = 0; i < list.length; i++) { var n = norm(list[i]); if (n) { texts.push(n); raws.push(list[i]); } }
    if (!texts.length) { Talk.miss(); diag('r=empty'); return; }
    /* 1. an answer to the buttons on screen */
    if (Talk.hasChips()) for (i = 0; i < texts.length; i++) if (Talk.answer(texts[i])) { diag('r=chip'); return; }
    /* 2. a birth year */
    for (i = 0; i < texts.length; i++) { var y = yearOf(texts[i]); if (y) { Talk.menhYear(y); diag('r=year'); return; } }
    /* 3. a topic */
    var top = '';
    for (i = 0; i < texts.length && !top; i++) top = topicOf(texts[i], raws[i]);
    diag('r=' + (top || 'miss'));
    if (!top) { Talk.miss(); return; }
    if (SELLING[top] && Talk.holy()) { Talk.speak('micHoly'); return; }
    if (top === 'menh') { Talk.openMenh(); return; }
    if (top === 'que') { if (FT.que) FT.que.open(); return; }
    if (top === 'fire' || top === 'fly' || top === 'sleep' || top === 'happy') { Talk.engage(); if (e && e.act) e.act(top); return; }
    Talk.speak(top);
  }

  function setOn(v) {
    on = v; clearTimeout(guard); sess++;
    if (btn) btn.className = v ? 'on' : '';
    /* the tiger turns to face the customer while it listens, and keeps facing them a moment after */
    var r = FT.engine && FT.engine.rig;
    if (r && r.setFront) { try { r.setFront(true, v ? 0 : 3000); } catch (e) {} }
    if (v) guard = setTimeout(function () { if (on) { try { M.cancel(); } catch (e) {} setOn(false); if (FT.Talk) FT.Talk.miss(); } }, 15000);
  }

  function press() {
    var e = eng();
    if (e && e.modal) return;
    if (on) { try { M.cancel(); } catch (x) {} setOn(false); if (e && e.greet) e.greet(); return; }   /* second press = cancel */
    if (FT.Speech) FT.Speech.stop();                       /* the tiger never talks into its own microphone */
    if (FT.Talk) FT.Talk.engage();
    if (e && e.sm && e.sm.is('SLEEP')) e.sm.reset();
    if (FT.Speech) FT.Speech.stop();
    if (e && e.gesture) e.gesture('ears');
    if (FT.Sound) FT.Sound.play('tick');
    bubble(T('mic.listen'));
    setOn(true);
    try { M.listen(lang()); } catch (x) { setOn(false); if (FT.Talk) FT.Talk.miss(); }
  }

  FT.Mic = {
    /* from SpeechBridge.java */
    _state: function (s) { if (!on) return; if (s === 'heard') bubble(T('mic.think')); },
    _result: function (list) {
      if (!on) return;
      setOn(false);
      var my = sess, l = lang();
      list = list || [];
      if (list[0]) bubble(T('mic.heard', { text: String(list[0]).slice(0, 80) }));
      /* nothing else happened in between (no new press, no panel, same language) */
      setTimeout(function () { var e = eng(); if (my === sess && !on && l === lang() && !(e && e.modal)) handle(list); }, 700);
    },
    /* the app went to the background while listening */
    _cancelled: function () { if (on) { setOn(false); var e = eng(); if (e && e.greet) e.greet(); } },
    /* after the permission dialog: never listens by itself, the customer presses again */
    _perm: function (ok) { bubble(T(ok ? 'mic.again' : 'mic.noPerm')); },
    active: function () { return on; },
    /* closed from outside (a spoken line, Xin quẻ, the language button, the app paused): if the bubble still says
     * "listening", put the normal greeting back; a line that already set its own bubble keeps it */
    cancel: function () {
      if (!on) return;
      try { M.cancel(); } catch (e) {}
      setOn(false);
      var b = $('bubble'), g = eng();
      if (b && g && g.greet && (b.textContent === T('mic.listen') || b.textContent === T('mic.think'))) g.greet();
    },
    _error: function (code) {
      if (!on && code !== 9) return;
      setOn(false);
      diag('err=' + code);
      if (code === 9) { bubble(T('mic.noPerm')); return; }                          /* asking / no permission */
      if (code === 1 || code === 2 || code === 4) { bubble(T('mic.noNet')); return; }  /* network / server */
      if (code === 8) { bubble(T('mic.busy')); return; }                            /* recognizer busy */
      if (FT.Talk) FT.Talk.miss();                                                  /* 6 no speech, 7 no match, other */
    },
    /* tests: what the tiger would do with a phrase (no microphone) */
    _topic: function (s) { return topicOf(norm(s), s); },
    _year: function (s) { return yearOf(norm(s)); },
    _handle: handle,
    norm: norm
  };

  function boot() {
    btn = $('micBtn'); if (!btn) return;
    var ok = false;
    try { ok = !!(M && M.available()); } catch (e) { ok = false; }
    /* browser test page: ?mic=test shows the button with a fake service (type a phrase) */
    if (!ok && /[?&]mic=test/.test(root.location.search)) {
      M = { available: function () { return true; }, cancel: function () {}, stop: function () {},
        listen: function () {
          if (!/[?&]mic=test-prompt/.test(root.location.search)) return;          /* test driver calls FT.Mic._result */
          setTimeout(function () { var s = root.prompt('Phrase'); if (s) FT.Mic._result([s]); else FT.Mic._error(7); }, 300);
        } };
      ok = true;
    }
    btn.style.display = ok ? '' : 'none';
    btn.onclick = function (ev) { if (ev) ev.stopPropagation(); press(); };
    if (FT.I18N && FT.I18N.on) FT.I18N.on(function () { if (on) { try { M.cancel(); } catch (e) {} setOn(false); } });
    /* any other touch (the tiger, a button, a chip) closes the microphone first, before its sound plays */
    function other(ev) { if (on && !(btn && (ev.target === btn || btn.contains(ev.target)))) FT.Mic.cancel(); }
    doc.addEventListener('touchstart', other, true);
    doc.addEventListener('mousedown', other, true);
    doc.addEventListener('visibilitychange', function () { if (doc.hidden && on) { try { M.cancel(); } catch (e) {} setOn(false); var g = eng(); if (g && g.greet) g.greet(); } });
  }
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', boot); else boot();
})(window, document);
