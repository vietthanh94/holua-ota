/* talk.js — the Fire Tiger talks (V1.3), 100% on the tablet.
 * FT.Speech plays the recorded clips from speech-lines.js (voice/<vi|en>/<key>_<n>.mp3): through the app's native
 * player (HoLuaAudio, AudioBridge.java) inside the APK, or an <audio> element in a browser. One clip at a time.
 * FT.Talk is the tiger's manners and personality:
 *  - it never speaks by itself to an empty shop: every spoken line answers a customer's touch or button;
 *  - the first touch of a visit (nobody for 90 s before) = a greeting by time of day, then the tiger ASKS
 *    "Hôm nay anh/chị thế nào ạ?" with answer buttons in the chosen language, then offers to look up the element
 *    (mệnh) of the birth year; the name and year are typed, shown in the bubble, and never spoken;
 *  - a mood is picked for each visit (playful, curious, shy, proud, sleepy — sleepy more often at noon / late),
 *    which changes the touch lines, the gestures and the tiger sounds;
 *  - chatter (touch lines) is skipped while another line plays; quẻ reading is never interrupted by chatter;
 *  - the sound button covers speech too: Tắt = silent (bubble only), quiet hours 21:00–07:00 are softer;
 *  - on mùng 1 / rằm / Phật đản / Vu Lan the shop / product / CTA answers are hidden (no selling on holy days).
 * ES5 (Chrome 62 WebView). */
(function (root, doc) {
  'use strict';
  var FT = root.FT = root.FT || {};
  var VISIT_MS = 90000, CHAT_GAP_MS = 5000, CHIPS_MS = 30000;
  var HOLY_HIDE = { aboutShop: 1, aboutCheck: 1, aboutChoose: 1, aboutContact: 1 };
  var YES = ['co', 'xem', 'duoc', 'u', 'ok', 'okay', 'dong y', 'yes', 'sure', 'yeah', 'please'], NO = ['khong', 'de sau', 'thoi', 'luc khac', 'no', 'later', 'not now'];

  function $(id) { return doc.getElementById(id); }
  function T(k, v) { return FT.I18N ? FT.I18N.t(k, v) : k; }
  function lang() { return FT.I18N && FT.I18N.en() ? 'en' : 'vi'; }
  function rnd(n) { return (Math.random() * n) | 0; }
  function eng() { return FT.engine; }
  function bubble(s) { var e = eng(); if (e) e.say(s); }
  function holy() { try { return !!(FT.holyToday && FT.holyToday()); } catch (e) { return false; } }
  function diag(q) { try { new Image().src = '_diag?tag=talk&' + q + '&t=' + Date.now(); } catch (e) {} }

  /* ---------------- FT.Speech: play one recorded line ---------------- */
  /* the OTA version this page was loaded from (https://hoalua.local/v<N>/...); the app plays clips of that version only */
  var pageVer = +((/^\/v(\d+)\//.exec(root.location.pathname) || [0, 0])[1]);
  var A = root.HoLuaAudio || null, el = null, seq = 0, cur = null, lastEnd = 0, gen = 0, holdUntil = 0;
  /* a timer that dies with the current line: Speech.stop() cancels every pending step of a flow */
  function later(fn, ms) { var g = gen; setTimeout(function () { if (g === gen) fn(); }, ms); }
  function vol() { return FT.Sound && FT.Sound.voiceVolume ? FT.Sound.voiceVolume() : 0.7; }
  /* front face (puppet.js): the tiger faces the customer and moves its mouth while a clip plays */
  function face(talking) {
    var r = FT.engine && FT.engine.rig;
    if (r && r.setTalking) { try { r.setTalking(talking); } catch (e) {} }
  }
  function finish(id) {
    if (!cur || cur.id !== id) return;
    face(false);
    var done = cur.then; cur = null; lastEnd = Date.now();
    if (done) later(done, 250);
  }
  var Speech = {
    /* key/n from speech-lines.js. opts: prio (0 chatter, 1 talk, 2 quẻ), bubble (text to show instead),
     * keepBubble (leave the bubble as it is), then (called when the clip ends, or at once when silent) */
    say: function (key, n, opts) {
      opts = opts || {};
      var prio = opts.prio || 0, l = lang();
      if (cur && cur.prio > prio) return false;                     /* never cut a more important line */
      if (!opts.keepBubble) bubble(opts.bubble || FT.SPEECH.text(key, n, l));
      Speech.stop();
      var v = vol(), id = ++seq, path = 'voice/' + l + '/' + key + '_' + n + '.mp3';
      cur = { id: id, prio: prio, then: opts.then || null };
      /* sound off: bubble only; the flow goes on after a reading pause (cancelled by stop() like a clip) */
      if (v <= 0) { setTimeout(function () { finish(id); }, 1600); return true; }
      var ok = false;
      if (A) { try { ok = A.play(pageVer, path, v, id); } catch (e) { ok = false; } }
      else {
        try {
          el = new Audio(path); el.volume = Math.min(1, v);
          el.onended = el.onerror = function () { finish(id); };
          var p = el.play(); if (p && p.catch) p.catch(function () { finish(id); });
          ok = true;
        } catch (e) { ok = false; }
      }
      if (!ok) setTimeout(function () { finish(id); }, 1600);   /* missing clip: same as silent */
      else face(true);
      return true;
    },
    stop: function () {
      if (FT.Mic && FT.Mic.active && FT.Mic.active()) FT.Mic.cancel();   /* never play into an open microphone */
      if (A) { try { A.stop(); } catch (e) {} }
      if (el) { try { el.pause(); } catch (e) {} el = null; }
      if (cur) face(false);
      cur = null; gen++; holdUntil = 0;
    },
    /* busy for a short moment before a line starts (the greeting waits for the chuff) */
    hold: function (ms) { holdUntil = Date.now() + ms; },
    later: later,
    busy: function () { return !!cur || Date.now() < holdUntil; },
    prio: function () { return cur ? cur.prio : -1; },
    since: function () { return cur ? 0 : Date.now() - lastEnd; },
    /* Tắt in the middle of a clip: the clip goes on silently, so the conversation still reaches its next step */
    setVolume: function (v) { if (A) { try { A.setVolume(v); } catch (e) {} } if (el) el.volume = Math.min(1, v); },
    _end: function (id) { finish(id); }
  };
  FT.Speech = Speech;

  /* ---------------- FT.Talk: manners, moods, conversation ---------------- */
  var visit = null, lastTouch = 0, chipsTimer = 0, pending = null, curChips = [];   /* pending = the question waiting for an answer */
  var MOOD_GEST = { Playful: ['hop', 'swish', 'paw'], Curious: ['look', 'ears'], Shy: ['ears'], Proud: ['roar', 'stretch'], Sleepy: ['stretch'] };
  var MOOD_SFX = { Playful: 'growl', Curious: 'chuff', Shy: '', Proud: 'roar2', Sleepy: 'growl2' };

  function pickMood() {
    var h = new Date().getHours(), m = FT.SPEECH.MOODS;
    if ((h >= 12 && h < 14) || h >= 20 || h < 7) { if (Math.random() < 0.4) return 'Sleepy'; }
    var pick = m[rnd(m.length - 1)];                               /* Playful, Curious, Shy, Proud */
    if (pick === 'Curious' && holy()) pick = 'Shy';                /* holy day: no stone-viewing lines */
    return pick;
  }
  function newVisit() {
    visit = { mood: pickMood(), greeted: false, menhAsked: false, touches: 0, lastChat: 0, said: {} };
    hideChips(); closeMenh(); pending = null; menhName = ''; menhYear = 0;
    diag('visit=1&mood=' + visit.mood);
  }
  function sfx(name) { if (name && FT.Sound) FT.Sound.play(name); }
  function gesture(list) { var e = eng(); if (e && e.gesture && list && list.length) e.gesture(list[rnd(list.length)]); }
  /* a different line from last time for this key */
  function pickN(key) {
    var c = FT.SPEECH.count(key), n = rnd(c);
    if (c > 1 && visit && visit.said[key] === n) n = (n + 1) % c;
    if (visit) visit.said[key] = n;
    return n;
  }

  /* ---- answer buttons ---- */
  function chips(list) {
    var box = $('chips'); if (!box) return;
    clearTimeout(chipsTimer);
    box.innerHTML = '';
    curChips = [];
    list.forEach(function (c) {
      if (holy() && HOLY_HIDE[c.k]) return;
      curChips.push(c);
      var b = doc.createElement('button');
      b.type = 'button'; b.textContent = T(c.label);
      b.onclick = function (ev) { ev.stopPropagation(); if (FT.Sound) FT.Sound.play('tick'); hideChips(); pending = null; c.go(); };
      box.appendChild(b);
    });
    box.className = 'show';
    place();
    chipsTimer = setTimeout(hideChips, CHIPS_MS);
  }
  /* the buttons sit right under the bubble, whatever its height */
  function place() {
    var b = $('bubble'), box = $('chips'); if (!b || !box) return;
    try {
      var top = b.offsetTop + b.offsetHeight + 8, nav = doc.querySelector('nav');
      var bottom = nav ? nav.offsetTop - 6 : root.innerHeight - 80;
      /* keep the box inside the screen, centred under the bubble, never over the bottom buttons */
      var half = Math.min(root.innerWidth * 0.22, 280), cx = b.offsetLeft;
      cx = Math.max(half + 8, Math.min(root.innerWidth - half - 8, cx));
      box.style.left = cx + 'px';
      box.style.top = top + 'px';
      box.style.maxHeight = Math.max(90, bottom - top) + 'px';
    } catch (e) {}
  }
  function hideChips() { var box = $('chips'); if (box) { box.className = ''; box.innerHTML = ''; } clearTimeout(chipsTimer); curChips = []; }
  /* 🎤: a spoken answer to the buttons on screen ("vui lắm", "có", "để sau"…); words are unaccented, lower case */
  function answer(t) {
    /* "không" answers first, so "không có" is not read as "có" */
    var order = curChips.filter(function (c) { return c.w === NO || c.first; }).concat(curChips.filter(function (c) { return !(c.w === NO || c.first); }));
    for (var i = 0; i < order.length; i++) {
      var c = order[i], w = c.w || [];
      for (var j = 0; j < w.length; j++) {
        if ((' ' + t + ' ').indexOf(' ' + w[j] + ' ') >= 0) { hideChips(); pending = null; c.go(); return true; }
      }
    }
    return false;
  }
  function ask(fn) { pending = fn; fn(); }

  function askHowru() { var n = pickN('howru'); ask(function () { howruNow(n); }); }
  function howruNow(n) {
    Speech.say('howru', n, {
      prio: 1, then: function () {
        chips([
          { label: 'talk.good', w: ['vui', 'tot', 'khoe', 'tuyet', 'good', 'great', 'fine', 'happy', 'well'], go: function () { reply('replyGood'); } },
          { label: 'talk.ok', w: ['binh thuong', 'tam', 'on', 'okay', 'ok', 'normal', 'so so', 'not bad'], go: function () { reply('replyOk'); } },
          { label: 'talk.tired', first: true, w: ['khong khoe', 'khong vui', 'khong tot', 'khong on', 'chua khoe', 'met', 'buon', 'chan', 'not well', 'not good', 'not fine', 'not great', 'not happy', 'not so good', 'tired', 'sad', 'bad'], go: function () { reply('replyTired'); } }
        ]);
      }
    });
  }
  function reply(key) {
    gesture(key === 'replyGood' ? ['hop'] : ['paw']);
    var n = key === 'replyTired' && holy() ? 1 : pickN(key);      /* holy day: not the "look at the stones" line */
    Speech.say(key, n, { prio: 1, then: offerMenh });
  }
  function offerMenh() {
    if (!visit || visit.menhAsked || (eng() && eng().modal)) return;
    visit.menhAsked = true;
    ask(menhOfferNow);
  }
  function menhOfferNow() {
    Speech.say('menhOffer', 0, {
      prio: 1, then: function () {
        chips([{ label: 'talk.menhYes', w: YES, go: openMenh }, { label: 'talk.later', w: NO, go: function () { Speech.say('later', 0, { prio: 1 }); } }]);
      }
    });
  }

  /* ---- mệnh: name (optional) + birth year, typed; result spoken without the name or year ---- */
  var menhName = '', menhYear = 0;
  function openMenh(keep) {
    var p = $('menhPanel'), e = eng(); if (!p) return;
    var oldN = keep === true && $('menhName') ? $('menhName').value : '', oldY = keep === true && $('menhYear') ? $('menhYear').value : '';
    if (visit) visit.menhAsked = true;
    p.className = 'show';
    if (e) e.modal = true;
    var maxY = new Date().getFullYear();
    $('menhBody').innerHTML =
      '<h2>' + esc(T('talk.menhTitle')) + '</h2>' +
      '<p class="hint center">' + esc(T('talk.menhHint')) + '</p>' +
      '<label class="lbl" for="menhName">' + esc(T('talk.nameLbl')) + '</label>' +
      '<div class="row"><input id="menhName" type="text" maxlength="40" autocapitalize="words" spellcheck="false" placeholder="' + esc(T('que.namePh')) + '"></div>' +
      '<label class="lbl" for="menhYear">' + esc(T('que.yearLbl')) + '</label>' +
      '<div class="row"><input id="menhYear" type="number" inputmode="numeric" min="1920" max="' + maxY + '" placeholder="' + esc(T('que.yearPh')) + '"></div>' +
      '<p class="hint" id="menhMsg">' + esc(T('talk.needYear')) + '</p>' +
      '<button type="button" class="big" id="menhGo" disabled>' + esc(T('talk.menhGo')) + '</button>';
    var yIn = $('menhYear'), nIn = $('menhName'), go = $('menhGo'), msg = $('menhMsg');
    nIn.value = oldN; yIn.value = oldY;
    function check() {
      var y = parseInt(yIn.value, 10), ok = y >= 1920 && y <= maxY;
      go.disabled = !ok;
      msg.textContent = ok ? '' : (yIn.value ? T('que.badYear', { max: maxY }) : T('talk.needYear'));
      return ok ? y : 0;
    }
    yIn.oninput = check;
    if (oldY) check();
    go.onclick = function () {
      var y = check(); if (!y) return;
      menhName = String(nIn.value || '').replace(/[0-9<>&"]/g, '').replace(/\s+/g, ' ').trim().slice(0, 30);
      menhYear = y;
      closeMenh();
      menhResult(FT.Lunar.menhOf(y));
    };
    Speech.say('menhAsk', 0, { prio: 1 });
  }
  function closeMenh() {
    var p = $('menhPanel'); if (!p || p.className !== 'show') return;
    p.className = ''; $('menhBody').innerHTML = '';
    var e = eng(); if (e && !(FT.que && FT.que.isOpen())) e.modal = false;
  }
  function menhResult(m) {
    var n = FT.SPEECH.ELEM.indexOf(m), l = lang();
    if (n < 0) return;
    gesture(['hop', 'paw']);
    var hello = menhName ? T('talk.helloName', { name: menhName }) : FT.SPEECH.text('menhHello', 0, l);
    Speech.say('menhHello', 0, {
      prio: 1, bubble: hello, then: function () {
        Speech.say('menh', n, {
          prio: 1, then: function () {
            if (!holy()) ask(queOffer);                   /* Xin quẻ is closed on holy days */
          }
        });
      }
    });
    diag('menh=' + n);
  }
  function queOffer() {
    Speech.say('menhAfter', 0, {
      prio: 1, then: function () {
        chips([{ label: 'nav.que', w: YES.concat(['xin', 'que']), go: function () { if (FT.que) { FT.que.prefill = { name: menhName, year: menhYear }; FT.que.open(); } } },
          { label: 'talk.later', w: NO, go: function () { Speech.say('later', 0, { prio: 1 }); } }]);
      }
    });
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  /* ---- "💬 Hỏi Hổ Lửa": questions the customer taps ---- */
  function askMenu() {
    var e = eng(); if (e && e.modal) return;
    if (!visit || Date.now() - lastTouch > VISIT_MS) newVisit();
    if (e && e.sm && e.sm.is('SLEEP')) e.sm.reset();
    if (!(Speech.busy() && Speech.prio() >= 2)) Speech.stop();
    pending = null;
    function q(key) { return function () { gesture(['look', 'paw']); Speech.say(key, pickN(key), { prio: 1 }); }; }
    bubble(T('talk.menuSay'));                            /* first, so the buttons sit under the right bubble */
    chips([
      { label: 'talk.qMe', k: 'aboutMe', go: q('aboutMe') },
      { label: 'talk.qShop', k: 'aboutShop', go: q('aboutShop') },
      { label: 'talk.qCheck', k: 'aboutCheck', go: q('aboutCheck') },
      { label: 'talk.qChoose', k: 'aboutChoose', go: q('aboutChoose') },
      { label: 'talk.menhYes', go: openMenh },
      { label: 'talk.qFact', go: q('fact') },
      { label: 'talk.qHowru', w: ['tro chuyen', 'noi chuyen', 'chat'], go: askHowru },
      { label: 'talk.qContact', k: 'aboutContact', go: q('aboutContact') }
    ]);
  }

  /* ---- reactions to the pet's states (called by pet-engine.js); true = the bubble was set here ---- */
  function react(next, prev) {
    var e = eng();
    if (!visit || (e && e.modal)) return false;
    var mood = visit.mood, now = Date.now();
    if (next === 'TOUCH' || next === 'HAPPY') {
      visit.touches++;
      if (!visit.greeted) {
        visit.greeted = true;
        var h = new Date().getHours(), key = h < 11 ? 'greetMorning' : h < 18 ? 'greetDay' : 'greetEvening';
        var gn = pickN(key);
        pending = askHowru;                                 /* a language switch during the greeting still asks */
        sfx('chuff'); gesture(['paw', 'look']);
        bubble(FT.SPEECH.text(key, gn, lang()));
        Speech.stop(); Speech.hold(700);
        later(function () { if (visit && !(eng() && eng().modal)) Speech.say(key, gn, { prio: 1, then: askHowru }); }, 450);
        return true;
      }
      if (Speech.busy() || $('chips').className === 'show') return true;      /* keep the bubble: never talk over the tiger or the question */
      if (visit.touches >= 5 && !visit.menhAsked) { offerMenh(); return true; }
      var k = 'touch' + mood;
      if (Math.random() < 0.6) sfx(MOOD_SFX[mood]);
      gesture(MOOD_GEST[mood]);
      if (now - visit.lastChat > CHAT_GAP_MS && Speech.since() > 1500) {
        visit.lastChat = now;
        Speech.say(k, pickN(k), { prio: 0 });
      } else bubble(FT.SPEECH.text(k, pickN(k), lang()));
      return true;
    }
    var talking = Speech.prio() >= 1 || $('chips').className === 'show';   /* a question or an answer on screen stays */
    if (next === 'FLY') { sfx('chuff'); if (!talking) Speech.say('fly', pickN('fly'), { prio: 0 }); return true; }
    if (next === 'FIRE') {
      sfx('roar');
      if (talking) return true;
      var fn = pickN('fire');
      bubble(FT.SPEECH.text('fire', fn, lang()));
      Speech.stop();
      later(function () { Speech.say('fire', fn, { prio: 0, keepBubble: true }); }, 1300);
      return true;
    }
    if (next === 'SLEEP') { hideChips(); pending = null; Speech.stop(); Speech.say('sleep', 0, { prio: 0 }); return true; }
    if (prev === 'SLEEP' && next === 'IDLE') { sfx('growl2'); Speech.say('wake', 0, { prio: 0 }); return true; }
    if (next === 'IDLE' && visit.greeted) return true;      /* back to idle: keep what the tiger just said or asked */
    return false;
  }

  FT.Talk = {
    react: react,
    mood: function () { return visit ? visit.mood : ''; },
    /* the idle bubble talk waits while the tiger talks or asks something */
    quiet: function () { return Speech.busy() || ($('chips') && $('chips').className === 'show') || Date.now() - lastTouch < 20000; },
    askMenu: askMenu,
    /* Xin quẻ opened: drop the question buttons (the tiger's question is over) */
    resetUI: function () { hideChips(); pending = null; },
    openMenh: openMenh,
    /* V1.4 🎤 hooks (mic.js) */
    answer: answer,
    hasChips: function () { return curChips.length > 0; },
    /* a spoken birth year: straight to the element, nothing is kept after the visit */
    menhYear: function (y) {
      if (!visit) newVisit();
      visit.menhAsked = true; visit.greeted = true;
      menhName = ''; menhYear = y; closeMenh(); hideChips(); pending = null;
      menhResult(FT.Lunar.menhOf(y));
    },
    /* say one of the answer lines (key from speech-lines.js) */
    speak: function (key, opts) {
      if (!visit) newVisit();
      visit.greeted = true;
      gesture(['look', 'paw', 'hop']);
      var o = opts || {}; o.prio = o.prio || 1;
      return Speech.say(key, pickN(key), o);
    },
    /* not understood: the question buttons + "please say it again or pick a question" */
    miss: function () {
      if (!visit) newVisit();
      visit.greeted = true;
      askMenu();
      Speech.say('micMiss', pickN('micMiss'), { prio: 1 });
      place();
    },
    engage: function () { if (!visit) newVisit(); visit.greeted = true; lastTouch = Date.now(); },
    holy: holy,
    _newVisit: newVisit,
    _visit: function () { return visit; }
  };

  function touched() {
    var now = Date.now();
    if (!visit || now - lastTouch > VISIT_MS) newVisit();
    lastTouch = now;
  }
  function boot() {
    doc.addEventListener('touchstart', touched, true);
    doc.addEventListener('mousedown', touched, true);
    var b = $('talkBtn');
    if (b) b.onclick = function () { askMenu(); };
    var x = $('menhClose');
    if (x) x.onclick = function () { closeMenh(); Speech.stop(); var e = eng(); if (e && e.greet && !e.modal) e.greet(); };
    /* typing in the mệnh form is activity too */
    doc.addEventListener('keydown', touched, true);
    /* the app went to the background (screen off, a system dialog): stop the line so nothing stays "busy" */
    doc.addEventListener('visibilitychange', function () { if (doc.hidden) { Speech.stop(); hideChips(); pending = null; } });
    /* the customer has left: stop talking, clear the question, the form and the name */
    setInterval(function () {
      if (visit && Date.now() - lastTouch > VISIT_MS) {
        Speech.stop(); hideChips(); closeMenh(); menhName = ''; menhYear = 0; visit = null; pending = null;
        var e = eng(); if (e && e.greet && !e.modal) e.greet();
      }
    }, 5000);
    if (FT.I18N) FT.I18N.on(function () {
      var fresh = Date.now() - lastTouch < 3000, form = $('menhPanel') && $('menhPanel').className === 'show';
      hideChips(); Speech.stop();
      /* the 90 s auto-return to Vietnamese closes the form silently; a customer's switch re-labels it and keeps what was typed */
      if (form) { if (visit && Date.now() - lastTouch < VISIT_MS) openMenh(true); else closeMenh(); }
      var e = eng();
      /* only when a customer just pressed the button (the 90 s auto-return to Vietnamese stays silent) */
      if (!(e && e.modal) && fresh) {
        var again = pending;
        Speech.say('langOn', 0, { prio: 1, then: again ? function () { if (pending === again) again(); } : null });
      }
    });
    if (FT.Sound && FT.Sound.onLevel) FT.Sound.onLevel(function () { Speech.setVolume(vol()); });
  }
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', boot); else boot();
})(window, document);
