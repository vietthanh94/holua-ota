/* que.js — "Xin quẻ mỗi ngày" (daily blessing draw) for Phước Lộc, printable on an 80 mm receipt.
 * Flow: open → (optional) birth year or element → the tiger shakes the quẻ tube → quẻ card → In / next person.
 * Printing uses the browser's print (window.print) with a receipt-sized @page (css: #slip, @media print).
 * In the Android app the slip is drawn to a canvas and printed by the SunmiPrinter bridge (one job at a time).
 * Mùng 1 / rằm / Phật đản / Vu Lan: a solemn wish only. After 90 s without a touch the panel resets.
 * Content: js/que-data.js (Phước Lộc DNA rules). Lunar date: js/lunar.js. ES5, old-WebView safe. */
(function (root, doc) {
  'use strict';
  var FT = root.FT = root.FT || {};
  function $(id) { return doc.getElementById(id); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  var THU = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'];
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  /* language: FT.I18N (i18n.js) picks the words, content-en.js holds the English quẻ / stones */
  function T(k, v) { return FT.I18N ? FT.I18N.t(k, v) : k; }
  function D() { return FT.I18N && FT.I18N.en() && FT.QUE_EN ? FT.QUE_EN : FT.QUE; }
  function elem(m) { return FT.I18N ? FT.I18N.elem(m) : m; }
  function cc(y) { return FT.I18N ? FT.I18N.canChi(y) : FT.Lunar.canChi(y); }
  function solarText(t) { return FT.I18N ? FT.I18N.solar(t.d, THU) : THU[t.d.getDay()] + ', ' + pad(t.d.getDate()) + '/' + pad(t.d.getMonth() + 1) + '/' + t.d.getFullYear(); }
  function lunarText(t) { var L = t.lunar; return pad(L.day) + '/' + pad(L.month) + (L.leap ? T('que.leap') : '') + T('que.lunarYear', { cc: cc(L.year) }); }
  function holyOf(t) { return t.holyKey ? D().holy[t.holyKey] : null; }

  var IDLE_RESET_MS = 90000;   /* a customer left: close the panel and forget their year / quẻ */
  var IN_APP = root.location.hostname === 'hoalua.local';

  function today() {
    var d = new Date(), qd = IN_APP ? [] : (root.location.search.match(/[?&]qdate=(\d{4})-(\d{2})-(\d{2})/) || []);
    if (qd[1]) d = new Date(+qd[1], +qd[2] - 1, +qd[3]);   /* test hook (browser only, never in the app): ?qdate=2026-12-09 */
    var L = FT.Lunar.solar2lunar(d.getDate(), d.getMonth() + 1, d.getFullYear());
    var H = FT.QUE.holy, key = L.leap ? '' : (H[L.month + '-' + L.day] ? L.month + '-' + L.day : (H[String(L.day)] ? String(L.day) : ''));
    var isHoly = L.day === 1 || L.day === 15;
    return {
      d: d, lunar: L,
      holy: isHoly ? L.day : 0,
      holyKey: isHoly ? (key || String(L.day)) : '',
      holyInfo: isHoly ? H[key || String(L.day)] : null
    };
  }

  function Que() {
    this.panel = $('quePanel'); this.body = $('queBody'); this.slip = $('slip');
    this.menh = ''; this.year = 0; this.name = ''; this.hash = ''; this.repeat = false; this.current = null;
    this.timer = 0; this.printing = false; this.lastTouch = Date.now();
    var self = this;
    $('queOpen').onclick = function () { self.open(); };
    $('queClose').onclick = function () { self.close(); };
    function touched() { self.lastTouch = Date.now(); }
    doc.addEventListener('touchstart', touched, true);
    doc.addEventListener('mousedown', touched, true);
    doc.addEventListener('keydown', touched, true);
    setInterval(function () {
      if (self.isOpen() && !self.printing && Date.now() - self.lastTouch > IDLE_RESET_MS) self.close();
    }, 5000);
    if (FT.I18N) FT.I18N.on(function () { self._relang(); });
  }

  /* language switched while the panel is open: redraw the same screen (typed name / year and the drawn quẻ kept) */
  Que.prototype._relang = function () {
    if (!this.isOpen()) return;
    var c = this.current;
    if (this.view === 'ask') { this._ask(true); if (FT.engine) FT.engine.say(T('que.sayOpen')); }
    else if (this.view === 'holyAsk') { this._askHoly(today()); if (FT.engine) FT.engine.say(T('que.sayHoly', { title: holyOf(today()).title })); }
    else if (this.view === 'shake') { if (FT.engine) FT.engine.say(T('que.shakeSay')); }
    else if (this.view === 'card' && c) {
      this._show();
      if (FT.engine) FT.engine.say(c.holy ? T('que.sayHoly', { title: holyOf(c.t).title }) : T('que.sayDraw', { no: D().list[c.qi].no, name: D().list[c.qi].name }));
    }
  };

  Que.prototype.isOpen = function () { return this.panel.className === 'show'; };

  /* a new customer session: nothing from the previous person is kept */
  Que.prototype.open = function () {
    this._cancel();
    this.menh = ''; this.year = 0; this.name = ''; this.hash = ''; this.repeat = false; this.current = null;
    this.panel.className = 'show';
    if (FT.Talk && FT.Talk.resetUI) FT.Talk.resetUI();
    if (FT.Speech) FT.Speech.stop();                  /* the previous customer's reading never runs on */
    if (FT.engine) { FT.engine.modal = true; if (FT.engine.sm && FT.engine.sm.is('SLEEP')) FT.engine.sm.reset(); }
    var t = today();
    if (t.holyInfo) { this.prefill = null; this._askHoly(t); } else this._ask();
    if (FT.engine) FT.engine.say(t.holyInfo ? T('que.sayHoly', { title: holyOf(t).title }) : T('que.sayOpen'));
    if (!t.holyInfo && FT.Speech) FT.Speech.say('queOpen', 0, { prio: 1, keepBubble: true });
  };
  Que.prototype.close = function () {
    this._cancel();
    if (FT.Speech) FT.Speech.stop();
    this.prefill = null;
    this.panel.className = '';
    this.current = null; this.menh = ''; this.year = 0; this.name = ''; this.hash = ''; this.view = '';
    this.body.innerHTML = ''; this.slip.innerHTML = '';
    if (FT.engine) {
      FT.engine.modal = false;
      if (FT.engine.sm && !FT.engine.sm.is('SLEEP')) { FT.engine.sm.go('IDLE', true); if (FT.engine.greet) FT.engine.greet(); }   /* no quẻ line left in the bubble */
    }
  };
  Que.prototype._cancel = function () { if (this.timer) { clearTimeout(this.timer); this.timer = 0; } };

  /* mùng 1 / rằm (and Phật đản 15/4, Vu Lan 15/7): a solemn wish only — no quẻ, no stone, no sales line */
  Que.prototype._askHoly = function (t) {
    var self = this;
    this.view = 'holyAsk';
    this.body.innerHTML =
      '<h2>🪷 ' + esc(holyOf(t).title) + '</h2>' +
      '<p class="date">' + esc(solarText(t)) + '<br>' + esc(T('que.lunar')) + ': ' + esc(lunarText(t)) + '</p>' +
      '<p class="hint center">' + esc(T('que.holyHint')) + '</p>' +
      '<button type="button" class="big" id="queGo">' + esc(T('que.holyGo')) + '</button>';
    $('queGo').onclick = function () {
      self.current = { t: t, holy: true, ti: (Math.random() * FT.QUE.holyThink.length) | 0 };
      self._show();
      if (FT.Sound) FT.Sound.play('bowl');
      /* V1.3: the tiger reads the holy-day wish aloud */
      if (FT.Speech && FT.SPEECH) FT.Speech.say('holy', FT.SPEECH.HOLY.indexOf(t.holyKey), { prio: 2, keepBubble: true });
      try { new Image().src = '_diag?tag=que&holy=' + t.holy + '&t=' + Date.now(); } catch (e) {}
    };
  };

  Que.prototype._ask = function (keep) {
    var t = today(), self = this, maxY = new Date().getFullYear();
    var oldN = keep && $('queName') ? $('queName').value : '', oldY = keep && $('queYear') ? $('queYear').value : '';
    /* V1.3: name / year just typed in "Xem mệnh" are carried over once (then forgotten) */
    if (!keep && this.prefill) { oldN = this.prefill.name || ''; oldY = this.prefill.year ? String(this.prefill.year) : ''; }
    this.prefill = null;
    this.view = 'ask';
    this.body.innerHTML =
      '<h2>' + esc(T('que.title')) + '</h2>' +
      '<p class="date">' + esc(solarText(t)) + '<br>' + esc(T('que.lunar')) + ': ' + esc(lunarText(t)) + '</p>' +
      '<p class="hint center">' + esc(T('que.askHint')) + '</p>' +
      '<label class="lbl" for="queName">' + esc(T('que.nameLbl')) + '</label>' +
      '<div class="row"><input id="queName" type="text" maxlength="40" autocapitalize="words" spellcheck="false" placeholder="' + esc(T('que.namePh')) + '"></div>' +
      '<label class="lbl" for="queYear">' + esc(T('que.yearLbl')) + '</label>' +
      '<div class="row"><input id="queYear" type="number" inputmode="numeric" min="1920" max="' + maxY + '" placeholder="' + esc(T('que.yearPh')) + '"></div>' +
      '<p class="hint" id="queMenh">' + esc(T('que.need')) + '</p>' +
      '<button type="button" class="big" id="queGo" disabled>' + esc(T('que.go')) + '</button>';
    var nameIn = $('queName'), inp = $('queYear'), hint = $('queMenh'), go = $('queGo');
    nameIn.value = oldN; inp.value = oldY;
    function check() {
      var y = parseInt(inp.value, 10), nm = cleanName(nameIn.value);
      var yOk = y >= 1920 && y <= maxY, nOk = validName(nm);
      self.year = yOk ? y : 0; self.menh = yOk ? FT.Lunar.menhOf(y) : ''; self.name = nOk ? nm : '';
      go.disabled = !(yOk && nOk);
      if (!nOk) hint.textContent = nameIn.value ? T('que.badName') : T('que.need');
      else if (!yOk) hint.textContent = T('que.badYear', { max: maxY });
      else hint.textContent = T('que.menhHint', { m: elem(self.menh), cc: cc(y) });
    }
    nameIn.oninput = check; inp.oninput = check;
    if (oldN || oldY) check();
    go.onclick = function () { check(); if (!go.disabled) self._start(); };
  };

  /* ---- one quẻ per person per day ----
   * The quẻ is picked from (date + name + birth year), so the same person gets the same quẻ again the same day,
   * even after the app restarts. This device also keeps, for today only, a one-way hash of that key and whether
   * the slip was printed: no names are stored, and yesterday's entries are dropped. */
  function nat(m) { return FT.I18N && m ? FT.I18N.native(m) : m; }   /* bridge messages are Vietnamese */
  function cleanName(v) {
    var s = String(v || '').replace(/\s+/g, ' ').replace(/^ | $/g, '');
    try { s = s.normalize('NFC'); } catch (e) {}
    return s;
  }
  function validName(s) {
    if (s.length < 2 || s.length > 40 || /[0-9<>{}\[\]\\\/@#$%^&*=+_|~`"]/.test(s)) return false;
    return s.replace(/[ .'-]/g, '').length >= 2;
  }
  function fnv(str) {
    var h = 0x811c9dc5;
    for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul ? Math.imul(h, 16777619) >>> 0 : (h * 16777619) % 4294967296; }
    return h >>> 0;
  }
  function dayKey(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  var STORE = 'ft.que.today';
  function loadDay(dk) {
    try { var o = JSON.parse(root.localStorage.getItem(STORE) || 'null'); if (o && o.day === dk && o.seen) return o; } catch (e) {}
    return { day: dk, seen: {} };
  }
  function saveDay(o) { try { root.localStorage.setItem(STORE, JSON.stringify(o)); } catch (e) {} }

  Que.prototype._start = function () {
    var t = today(), dk = dayKey(t.d);
    var key = dk + '|' + this.name.toLowerCase() + '|' + this.year;
    this.hash = fnv(key).toString(36) + fnv(key + '#2').toString(36);
    var store = loadDay(dk);
    this.repeat = !!store.seen[this.hash];
    if (!this.repeat) { store.seen[this.hash] = { printed: 0 }; saveDay(store); }
    if (this.repeat) this._draw(); else this._shake();
  };

  Que.prototype._shake = function () {
    var self = this;
    this.view = 'shake';
    this.body.innerHTML = '<div class="tube"><div class="sticks"><i></i><i></i><i></i><i></i><i></i></div><div class="can">籤</div></div>' +
      '<p class="hint center">' + esc(T('que.shakeHint')) + '</p>';
    if (FT.engine && FT.engine.gesture) FT.engine.gesture('hop');
    if (FT.engine) FT.engine.say(T('que.shakeSay'));
    if (FT.Sound) FT.Sound.play('rattle');
    this._cancel();
    this.timer = setTimeout(function () { self.timer = 0; if (self.isOpen()) self._draw(); }, 1700);
  };

  Que.prototype._draw = function () {
    /* indices only: the card is drawn in whatever language is on, and switching language keeps the same quẻ */
    var Q = FT.QUE, t = today(), si = -1, self = this;
    var qi = fnv(this.hash) % Q.list.length;
    if (!t.holyInfo) {
      var pool = [];
      Q.stones.forEach(function (s, i) { if (s.menh === 'all' || (self.menh && s.menh.indexOf(self.menh) >= 0)) pool.push(i); });
      si = pool[fnv(this.hash + 's') % pool.length];
    }
    var printed = !!(loadDay(dayKey(t.d)).seen[this.hash] || {}).printed;
    this.current = {
      t: t, qi: qi, si: si, menh: this.menh, year: this.year, who: this.name, hash: this.hash, repeat: this.repeat, printed: printed,
      wi: (t.d.getDate() === t.d.getMonth() + 1) ? -1 : fnv(this.hash + 'w') % Q.wish.length    /* -1 = ngày đôi wish */
    };
    this._show();
    var q = D().list[qi];
    if (FT.Sound) FT.Sound.play('bowl');
    if (FT.engine) {
      if (FT.engine.sm) FT.engine.sm.go('HAPPY', true);
      FT.engine.say(this.repeat ? T('que.sayRepeat', { name: q.name }) : T('que.sayDraw', { no: q.no, name: q.name }));
    }
    /* V1.3: the tiger reads the quẻ aloud (number, name, verse, wish) after the bowl */
    if (FT.Speech) setTimeout(function () { if (self.isOpen() && self.current && self.current.qi === qi) FT.Speech.say('que', qi, { prio: 2, keepBubble: true }); }, 900);
    try { new Image().src = '_diag?tag=que&no=' + q.no + '&rep=' + (this.repeat ? 1 : 0) + '&lang=' + (FT.I18N ? FT.I18N.lang() : 'vi') + '&m=' + encodeURIComponent(this.menh) + '&t=' + Date.now(); } catch (e) {}
  };

  /* the quẻ as lines, shared by the screen card and the printed slip */
  Que.prototype._lines = function (c) {
    var Q = D(), out = [];
    if (c.holy) {
      var h = holyOf(c.t);
      out.push(['name', h.title.toUpperCase()]);
      out.push(['wish', h.wish]);
      out.push(['p', Q.holyThink[c.ti]]);
      return out;
    }
    var q = Q.list[c.qi];
    if (c.who) out.push(['who', T('que.who', { who: c.who, year: c.year })]);
    out.push(['no', T('que.no', { no: q.no })]);
    out.push(['name', T('que.name', { name: q.name }).toUpperCase()]);
    out.push(['verse', q.verse[0]]); out.push(['verse', q.verse[1]]);
    out.push(['h', T('que.hLoi')]); out.push(['p', q.loi]);
    out.push(['h', T('que.hKhuyen')]); out.push(['p', q.khuyen]);
    if (c.menh) {
      out.push(['h', T('que.hMenh', { m: elem(c.menh), cc: cc(c.year), y: c.year })]);
      out.push(['p', T('que.colors', { c: Q.colors[c.menh] })]);
    }
    if (c.si >= 0) {
      var st = Q.stones[c.si];
      out.push(['h', T('que.hStone')]);
      out.push(['p', st.name + ': ' + st.look + '.']);
      out.push(['p', T('que.stoneM', { name: st.name, m: st.m })]);
    }
    out.push(['wish', c.wi < 0 ? Q.doubleDay.replace(/\{d\}/g, c.t.d.getDate()) : Q.wish[c.wi]]);
    out.push(['cta', Q.cta]);
    out.push(['svc', Q.service]);
    return out;
  };

  Que.prototype._show = function () {
    var c = this.current, self = this;
    var B = FT.BRAND || {};
    this.view = 'card';
    var html = '<div class="card">' +
      '<p class="cbrand">' + esc(B.fullName || 'Đá Phong Thủy Phước Lộc') + ' · ' + esc(B.slogan || 'Nâng Tầm Đẳng Cấp') + '</p>' +
      '<p class="date">' + esc(solarText(c.t)) + ' · ' + esc(T('que.lunar')) + ' ' + esc(lunarText(c.t)) + '</p>' +
      (c.repeat ? '<p class="again">' + esc(T('que.again')) + '</p>' : '') +
      this._lines(c).map(function (l) { return '<div class="l-' + l[0] + '">' + esc(l[1]) + '</div>'; }).join('') +
      '<p class="note">' + esc(c.holy ? D().holyNote : D().note) + '</p></div>' +
      '<div class="row btns"><button type="button" class="big" id="quePrint">🖨 ' + esc(T(c.holy ? 'que.printHoly' : 'que.print')) + '</button>' +
      '<button type="button" id="queNext">' + esc(T(c.holy ? 'que.done' : 'que.next')) + '</button></div>' +
      '<p class="hint center" id="quePrintMsg"></p>';
    this.body.innerHTML = html;
    $('quePrint').onclick = function () { self.print(); };
    if (c.printed) { var pb = $('quePrint'); pb.disabled = true; pb.textContent = T('que.printedToday'); }
    else if (this.printing) { $('quePrint').disabled = true; $('quePrintMsg').textContent = T('print.busy'); }
    $('queNext').onclick = function () { if (c.holy) self.close(); else self.open(); };
  };

  Que.prototype._slipHtml = function (c) {
    var B = FT.BRAND || {};
    return '<div class="s-head"><img src="' + esc(B.logo || 'assets/brand/logo-phuoc-loc.png') + '" alt="Phước Lộc">' +
      '<div class="s-brand">' + esc(B.fullName || 'Đá Phong Thủy Phước Lộc') + '</div>' +
      '</div>' +
      '<div class="s-rule"></div>' +
      '<div class="s-title">' + esc(T(c.holy ? 'slip.titleHoly' : 'slip.title')) + '</div>' +
      '<div class="s-date">' + esc(solarText(c.t)) + '<br>' + esc(T('que.lunar')) + ': ' + esc(lunarText(c.t)) + '</div>' +
      '<div class="s-rule"></div>' +
      this._lines(c).map(function (l) { return '<div class="s-' + l[0] + '">' + esc(l[1]) + '</div>'; }).join('') +
      '<div class="s-rule"></div>' +
      '<div class="s-foot">' + esc(FT.QUE.site) + '<br>' + esc(T('slip.foot')) + '<br><span>' + esc(c.holy ? D().holyNote : D().note) + '</span></div>';
  };

  /* draw the slip as one black/white canvas (for the Sunmi built-in printer: Vietnamese prints as pixels) */
  Que.prototype._slipCanvas = function (c, W, logo) {
    var B = FT.BRAND || {}, pad = Math.round(W * 0.04), cw = W - 2 * pad, k = W / 576;
    var cv = doc.createElement('canvas'), g = cv.getContext('2d');
    var FONT = '"Roboto","Noto Sans","Segoe UI",Arial,sans-serif';
    var ST = {
      brand: [26, 'bold'], title: [34, 'bold'], who: [24, 'bold'], date: [22, ''], no: [26, 'bold'], name: [38, 'bold'], svc: [19, ''],
      verse: [25, 'italic'], h: [24, 'bold'], p: [24, ''], wish: [25, 'italic'], cta: [22, ''], foot: [20, ''], note: [17, 'italic']
    };
    var ops = [];   /* [type, payload, height] */
    function font(t) { var s = ST[t]; return (s[1] ? s[1] + ' ' : '') + Math.round(s[0] * k) + 'px ' + FONT; }
    function wrap(t, txt) {
      g.font = font(t);
      var words = String(txt).split(/\s+/), lines = [], cur = '';
      for (var i = 0; i < words.length; i++) {
        var test = cur ? cur + ' ' + words[i] : words[i];
        if (g.measureText(test).width > cw && cur) { lines.push(cur); cur = words[i]; } else cur = test;
      }
      if (cur) lines.push(cur);
      return lines;
    }
    function text(t, txt, align, gapTop) {
      var lh = Math.round(ST[t][0] * k * 1.38);
      if (gapTop) ops.push(['gap', 0, Math.round(gapTop * k)]);
      var ls = wrap(t, txt);
      for (var i = 0; i < ls.length; i++) ops.push(['text', [t, ls[i], align || 'center', lh], lh]);
    }
    function rule() { ops.push(['rule', 0, Math.round(22 * k)]); }

    if (logo && logo.width) { var lw = Math.round(W * 0.38), lhh = Math.round(logo.height * lw / logo.width); ops.push(['img', [logo, lw, lhh], lhh + Math.round(8 * k)]); }
    text('brand', (B.fullName || 'Đá Phong Thủy Phước Lộc').toUpperCase());
    rule();
    text('title', T(c.holy ? 'slip.titleHoly' : 'slip.title'));
    text('date', solarText(c.t)); text('date', T('que.lunar') + ': ' + lunarText(c.t));
    rule();
    var L = this._lines(c);
    for (var i = 0; i < L.length; i++) {
      var t = L[i][0];
      if (t === 'h') text('h', L[i][1], 'left', 10);
      else if (t === 'p') text('p', L[i][1], 'left');
      else if (t === 'wish' || t === 'cta' || t === 'svc') text(t, L[i][1], 'center', t === 'svc' ? 6 : 14);
      else text(t, L[i][1], 'center', t === 'name' ? 4 : 0);
    }
    rule();
    text('foot', FT.QUE.site); text('foot', T('slip.foot'));
    text('note', c.holy ? D().holyNote : D().note, 'center', 6);
    ops.push(['gap', 0, Math.round(20 * k)]);

    var H = pad; for (var j = 0; j < ops.length; j++) H += ops[j][2];
    cv.width = W; cv.height = H;
    g.fillStyle = '#fff'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#000'; g.strokeStyle = '#000'; g.textBaseline = 'top';
    var y = pad, logoBox = null;
    for (j = 0; j < ops.length; j++) {
      var o = ops[j];
      if (o[0] === 'img') { g.drawImage(o[1][0], (W - o[1][1]) / 2, y, o[1][1], o[1][2]); logoBox = [Math.round((W - o[1][1]) / 2), y, Math.round((W + o[1][1]) / 2), y + o[1][2]]; }
      else if (o[0] === 'rule') { g.lineWidth = Math.max(2, Math.round(2 * k)); g.setLineDash([Math.round(8 * k), Math.round(6 * k)]); g.beginPath(); g.moveTo(pad, y + o[2] / 2); g.lineTo(W - pad, y + o[2] / 2); g.stroke(); g.setLineDash([]); }
      else if (o[0] === 'text') {
        var p = o[1]; g.font = font(p[0]); g.textAlign = p[2];
        g.fillText(p[1], p[2] === 'left' ? pad : W / 2, y + Math.round((p[3] - ST[p[0]][0] * k) / 2));
      }
      y += o[2];
    }
    /* thermal paper is black/white. Text: plain threshold (crisp). Logo: error-diffusion dots, so its coloured
     * circle prints as a light grey tone with its details instead of one solid black disc. The logo artwork itself
     * is not changed; a black/white print version from the Owner would print even better. */
    try {
      var im = g.getImageData(0, 0, W, H), d = im.data, lum = new Float32Array(W * H), x, yy, n;
      for (n = 0; n < W * H; n++) lum[n] = d[n * 4] * 0.3 + d[n * 4 + 1] * 0.59 + d[n * 4 + 2] * 0.11;
      var lx0 = logoBox ? logoBox[0] : 0, ly0 = logoBox ? logoBox[1] : -1, lx1 = logoBox ? logoBox[2] : -1, ly1 = logoBox ? logoBox[3] : -1;
      for (yy = 0; yy < H; yy++) for (x = 0; x < W; x++) {
        n = yy * W + x;
        var inLogo = x >= lx0 && x < lx1 && yy >= ly0 && yy < ly1, old = lum[n];
        var solid = inLogo && old < 125;                       /* lettering (~115) and dark lines stay solid; the circle (~146) is dotted */
        if (inLogo && !solid) old = 255 - (255 - old) * 0.6;  /* coloured areas: lighter dotted tone, less heat */
        var v = inLogo ? (solid || old < 128 ? 0 : 255) : (old < 170 ? 0 : 255);
        if (inLogo && !solid) {
          var err = old - v;
          if (x + 1 < lx1) lum[n + 1] += err * 7 / 16;
          if (yy + 1 < ly1) { if (x > lx0) lum[n + W - 1] += err * 3 / 16; lum[n + W] += err * 5 / 16; if (x + 1 < lx1) lum[n + W + 1] += err / 16; }
        }
        d[n * 4] = d[n * 4 + 1] = d[n * 4 + 2] = v; d[n * 4 + 3] = 255;
      }
      g.putImageData(im, 0, 0);
    } catch (e) {}
    return cv;
  };

  /* print lock: one slip per tap; the button is disabled until the printer answers (or 25 s pass) */
  Que.prototype._lock = function (on, text) {
    var b = $('quePrint'), msg = $('quePrintMsg'), self = this;
    this.printing = on;
    if (b) b.disabled = on;
    if (msg && text != null) msg.textContent = text;
    if (this.printTimer) { clearTimeout(this.printTimer); this.printTimer = 0; }
    if (on) this.printTimer = setTimeout(function () { self._printDone(false, T('print.timeout')); }, 26000);
  };

  /* called by the Android bridge (PrinterBridge.finish) when the job really finished or failed */
  Que.prototype._printDone = function (ok, text) {
    if (!this.printing) return;
    this._lock(false, ok ? T('print.ok') : (nat(text) || T('print.fail')));
    /* one slip per quẻ: saves paper when the button is tapped again and again */
    var b = $('quePrint');
    if (ok && this.current) {
      this.current.printed = true; if (b) { b.disabled = true; b.textContent = T('que.printed'); }
      if (this.current.hash) { var st = loadDay(dayKey(this.current.t.d)); st.seen[this.current.hash] = { printed: 1 }; saveDay(st); }
    }
    if (FT.Sound) FT.Sound.play(ok ? 'print' : 'error');
    /* never over the quẻ reading, and only while the slip's customer is still there */
    if (ok && FT.Speech && this.isOpen() && FT.Speech.prio() < 2) FT.Speech.say('printOk', 0, { prio: 1, keepBubble: true });
    this.lastTouch = Date.now();
    try { new Image().src = '_diag?tag=print&done=' + (ok ? 1 : 0) + '&r=' + encodeURIComponent(text || '') + '&t=' + Date.now(); } catch (e) {}
  };

  Que.prototype._printNative = function (c) {
    var P = root.SunmiPrinter, self = this, W = 576;
    try { W = P.paperWidth() || 576; } catch (e) {}
    var logo = new Image();
    var go = function () {
      var r;
      try {
        var url = self._slipCanvas(c, W, logo.complete && logo.naturalWidth ? logo : null).toDataURL('image/png');
        r = P.printImage(url.split(',')[1]);
      } catch (e) { r = T('print.drawErr') + e.message; }
      if (r) { self._lock(false, nat(r)); if (FT.Sound) FT.Sound.play('error'); }
      else self._lock(true, T('print.busy'));
      try { new Image().src = '_diag?tag=print&native=1&w=' + W + '&r=' + encodeURIComponent(r || 'sent') + '&t=' + Date.now(); } catch (e) {}
    };
    logo.onload = logo.onerror = go;
    logo.src = (FT.BRAND && FT.BRAND.logo) || 'assets/brand/logo-phuoc-loc.png';
  };

  Que.prototype.print = function () {
    var c = this.current, self = this;
    if (!c || this.printing || c.printed) return;
    if (root.SunmiPrinter && root.SunmiPrinter.printImage) { this._lock(true, T('print.prep')); return this._printNative(c); }
    this.slip.innerHTML = this._slipHtml(c);
    try { new Image().src = '_diag?tag=print&has=' + (typeof root.print === 'function' ? 1 : 0) + '&t=' + Date.now(); } catch (e) {}
    if (typeof root.print !== 'function') { this._lock(false, T('print.noPrint')); return; }
    var img = this.slip.querySelector('img');
    var go = function () {
      self._lock(true, null);
      try { root.print(); self._lock(false, T('print.sent')); }
      catch (e) { self._lock(false, T('print.callErr') + e.message); }
    };
    if (img && !img.complete) { img.onload = img.onerror = go; } else go();
  };

  FT.Que = Que;
  FT.holyToday = function () { try { return !!today().holyInfo; } catch (e) { return false; } };
  function boot() { if ($('quePanel') && FT.QUE && FT.Lunar) FT.que = new Que(); }
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', boot); else boot();
})(window, document);
