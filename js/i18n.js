/* i18n.js — Vietnamese (default) / English for the Hổ Lửa pet, so foreign customers can play too.
 * - Every start is Vietnamese. The header button switches language; after 90 s with no touch the screen
 *   goes back to Vietnamese (the customer has left), the same moment the Xin quẻ panel resets.
 * - FT.I18N.t(key, vars) for UI words; quẻ / stone / tiger content in English lives in content-en.js
 *   (same order as the Vietnamese lists, so one person gets the same quẻ in both languages).
 * - Elements in English: Kim = Metal, Mộc = Wood, Thủy = Water, Hỏa = Fire, Thổ = Earth.
 * - English follows the same DNA rules as Vietnamese (tests/que-lint.test.js checks both). ES5. */
(function (root, doc) {
  'use strict';
  var FT = root.FT = root.FT || {};
  var RESET_MS = 90000;

  var UI = {
    vi: {
      'lang.btn': '🌐 English', 'lang.aria': 'Switch to English',
      'nav.que': '🎋 Xin quẻ', 'nav.happy': '❤️ Vuốt ve', 'nav.fly': '🪽 Bay', 'nav.fire': '🔥 Phun lửa', 'nav.sleep': '🌙 Ngủ',
      'status': 'Vuốt lên: bay · Giữ: tích lửa · Chạm: vuốt ve',
      'aria.pet': 'Vuốt ve Hổ Lửa', 'aria.close': 'Đóng', 'aria.logo': 'Logo Phước Lộc',
      'sound.0': 'Tắt', 'sound.1': 'Nhẹ', 'sound.2': 'Vừa', 'sound.aria': 'Âm thanh: {n} (bấm để đổi)',
      'pet.charge': 'Đang tích lửa… giữ tay! 🔥', 'pet.short': 'Chưa đủ lửa, giữ lâu hơn nha~',
      'pet.reducedOn': 'Đã bật chế độ nhẹ 🪶', 'pet.reducedOff': 'Hiệu ứng đầy đủ 🔥',
      'nav.talk': '💬 Hỏi Hổ Lửa',
      'mic.btn': '🎤 Nói', 'mic.aria': 'Nói với Hổ Lửa', 'mic.listen': '🎤 Hổ Lửa đang nghe… anh/chị nói đi ạ',
      'mic.heard': '🎤 “{text}”', 'mic.think': '🎤 Hổ Lửa đang nghĩ…', 'mic.noPerm': 'Anh/chị cho phép Hổ Lửa dùng micro, rồi bấm 🎤 Nói lần nữa nhé.', 'mic.again': 'Xong rồi ạ! Anh/chị bấm 🎤 Nói để trò chuyện với Hổ Lửa nhé.',
      'mic.noNet': 'Micro cần mạng internet, anh/chị dùng các nút bên dưới nhé.', 'mic.busy': 'Micro đang bận, anh/chị thử lại sau chút nhé.',
      'talk.good': '😊 Vui lắm', 'talk.ok': '🙂 Bình thường', 'talk.tired': '😌 Hơi mệt',
      'talk.menhYes': '🌿 Xem mệnh', 'talk.later': 'Để sau',
      'talk.menhTitle': '🌿 Xem mệnh theo năm sinh',
      'talk.menhHint': 'Theo quan niệm ngũ hành. Tên không bắt buộc; Hổ Lửa không đọc to tên và năm sinh.',
      'talk.nameLbl': 'Tên của anh/chị (không bắt buộc)', 'talk.needYear': 'Anh/chị nhập năm sinh nhé.',
      'talk.menhGo': 'Xem mệnh 🐯', 'talk.helloName': 'Rất vui được biết anh/chị {name} ạ!',
      'talk.menuSay': 'Anh/chị muốn hỏi Hổ Lửa điều gì ạ? 🐯',
      'talk.qMe': 'Hổ Lửa là ai?', 'talk.qShop': 'Phước Lộc có gì?', 'talk.qCheck': 'Kiểm định đá',
      'talk.qChoose': 'Chọn đá thế nào?', 'talk.qFact': '🐯 Chuyện về hổ', 'talk.qHowru': 'Trò chuyện', 'talk.qContact': 'Tư vấn',

      'que.lunar': 'Âm lịch', 'que.leap': ' (nhuận)', 'que.lunarYear': ' năm {cc}',
      'que.sayHoly': '{title}, Hổ Lửa gửi anh/chị lời chúc an lành 🪷',
      'que.sayOpen': 'Anh/chị xin quẻ đầu ngày với Hổ Lửa nhé! 🎋',
      'que.holyHint': 'Hôm nay Hổ Lửa không gieo quẻ, chỉ gửi anh/chị một lời chúc an lành.',
      'que.holyGo': 'Nhận lời chúc 🪷',
      'que.title': '🎋 Xin quẻ đầu ngày',
      'que.askHint': 'Mỗi người một quẻ mỗi ngày. Anh/chị nhập tên và năm sinh nhé.',
      'que.nameLbl': 'Tên của anh/chị', 'que.namePh': 'VD: Nguyễn Văn An',
      'que.yearLbl': 'Năm sinh (âm lịch)', 'que.yearPh': 'VD: 1990',
      'que.need': 'Nhập đủ tên và năm sinh để xin quẻ.',
      'que.badName': 'Anh/chị nhập tên (ít nhất 2 chữ cái, không có số).',
      'que.badYear': 'Anh/chị nhập năm sinh từ 1920 đến {max}.',
      'que.menhHint': 'Mệnh {m} (năm {cc}) — theo quan niệm ngũ hành.',
      'que.go': 'Xin quẻ 🐯',
      'que.shakeHint': 'Hổ Lửa đang lắc quẻ cho anh/chị…', 'que.shakeSay': 'Lắc lắc… quẻ đầu ngày đây! 🎋',
      'que.sayRepeat': 'Hôm nay anh/chị đã xin rồi: vẫn là Quẻ {name} ✨', 'que.sayDraw': 'Quẻ số {no}: Quẻ {name} ✨',
      'que.who': 'Quẻ của anh/chị {who} ({year})', 'que.no': 'QUẺ SỐ {no}', 'que.name': 'Quẻ {name}',
      'que.hLoi': 'Lời quẻ', 'que.hKhuyen': 'Lời khuyên hôm nay',
      'que.hMenh': 'Mệnh {m} ({cc} {y})', 'que.colors': 'Theo quan niệm ngũ hành, màu hợp mệnh: {c}.',
      'que.hStone': 'Đá gợi ý', 'que.stoneM': 'Theo quan niệm, {name} tượng trưng cho {m}.',
      'que.again': 'Hôm nay anh/chị đã xin quẻ rồi. Quẻ đầu ngày giữ nguyên, mai anh/chị xin quẻ mới nhé.',
      'que.print': 'In quẻ', 'que.printHoly': 'In lời chúc', 'que.next': 'Lượt khách mới', 'que.done': 'Xong',
      'que.printedToday': '✓ Đã in hôm nay', 'que.printed': '✓ Đã in',
      'slip.title': 'XIN QUẺ ĐẦU NGÀY', 'slip.titleHoly': 'LỜI CHÚC AN LÀNH',
      'slip.foot': 'Hổ Lửa Phước Lộc chúc anh/chị một ngày tốt lành',
      'print.prep': 'Đang chuẩn bị phiếu…', 'print.busy': 'Đang in… 🖨',
      'print.ok': 'Đã in xong, mời anh/chị nhận phiếu 🙏', 'print.fail': 'Chưa in được, anh/chị thử lại nhé.',
      'print.timeout': 'Máy in chưa phản hồi, anh/chị thử lại nhé.', 'print.drawErr': 'Lỗi vẽ phiếu: ',
      'print.noPrint': 'Trình duyệt này chưa hỗ trợ lệnh in.',
      'print.sent': 'Đã gửi lệnh in. Máy T2 in được qua app Hổ Lửa Phước Lộc (xem README).',
      'print.callErr': 'Không gọi được lệnh in: '
    },
    en: {
      'lang.btn': '🌐 Tiếng Việt', 'lang.aria': 'Chuyển sang tiếng Việt',
      'nav.que': '🎋 Daily blessing', 'nav.happy': '❤️ Pet', 'nav.fly': '🪽 Fly', 'nav.fire': '🔥 Breathe fire', 'nav.sleep': '🌙 Sleep',
      'status': 'Swipe up: fly · Hold: charge fire · Tap: pet',
      'aria.pet': 'Pet the Fire Tiger', 'aria.close': 'Close', 'aria.logo': 'Phước Lộc logo',
      'sound.0': 'Off', 'sound.1': 'Low', 'sound.2': 'Medium', 'sound.aria': 'Sound: {n} (tap to change)',
      'pet.charge': 'Charging fire… keep holding! 🔥', 'pet.short': 'Not enough fire yet, hold a little longer~',
      'pet.reducedOn': 'Light mode on 🪶', 'pet.reducedOff': 'Full effects 🔥',
      'nav.talk': '💬 Ask the Tiger',
      'mic.btn': '🎤 Talk', 'mic.aria': 'Talk to the Fire Tiger', 'mic.listen': '🎤 The Fire Tiger is listening… go ahead',
      'mic.heard': '🎤 “{text}”', 'mic.think': '🎤 The Fire Tiger is thinking…', 'mic.noPerm': 'Please allow the microphone, then press 🎤 Talk again.', 'mic.again': 'All set! Press 🎤 Talk to chat with the Fire Tiger.',
      'mic.noNet': 'The microphone needs the internet. Please use the buttons below.', 'mic.busy': 'The microphone is busy. Please try again in a moment.',
      'talk.good': '😊 Great', 'talk.ok': '🙂 Okay', 'talk.tired': '😌 A bit tired',
      'talk.menhYes': '🌿 My element', 'talk.later': 'Maybe later',
      'talk.menhTitle': '🌿 Your element by birth year',
      'talk.menhHint': 'In the Five Elements tradition. The name is optional; the Fire Tiger never says your name or year aloud.',
      'talk.nameLbl': 'Your name (optional)', 'talk.needYear': 'Please enter your birth year.',
      'talk.menhGo': 'Show my element 🐯', 'talk.helloName': 'Very nice to meet you, {name}!',
      'talk.menuSay': 'What would you like to ask the Fire Tiger? 🐯',
      'talk.qMe': 'Who are you?', 'talk.qShop': 'What does Phước Lộc have?', 'talk.qCheck': 'Stone testing',
      'talk.qChoose': 'How to choose a stone?', 'talk.qFact': '🐯 Tiger facts', 'talk.qHowru': 'Chat', 'talk.qContact': 'Get advice',

      'que.lunar': 'Lunar date', 'que.leap': ' (leap month)', 'que.lunarYear': ', year of {cc}',
      'que.sayHoly': '{title}: the Fire Tiger sends you a peaceful wish 🪷',
      'que.sayOpen': 'Draw your daily blessing with the Fire Tiger! 🎋',
      'que.holyHint': 'Today the Fire Tiger draws no blessing stick. It simply sends you a peaceful wish.',
      'que.holyGo': 'Receive the wish 🪷',
      'que.title': '🎋 Daily blessing',
      'que.askHint': 'One blessing per person per day. Please enter your name and year of birth.',
      'que.nameLbl': 'Your name', 'que.namePh': 'e.g. Anna Smith',
      'que.yearLbl': 'Year of birth', 'que.yearPh': 'e.g. 1990',
      'que.need': 'Enter your name and year of birth to draw.',
      'que.badName': 'Please enter a name (at least 2 letters, no numbers).',
      'que.badYear': 'Please enter a birth year from 1920 to {max}.',
      'que.menhHint': 'Element: {m}, year of {cc}, in the traditional Five Elements view.',
      'que.go': 'Draw 🐯',
      'que.shakeHint': 'The Fire Tiger is shaking the sticks for you…', 'que.shakeSay': 'Shake, shake… here is your blessing! 🎋',
      'que.sayRepeat': 'You already drew today: it is still {name} ✨', 'que.sayDraw': 'Blessing no. {no}: {name} ✨',
      'que.who': 'Blessing for {who} ({year})', 'que.no': 'BLESSING NO. {no}', 'que.name': '{name}',
      'que.hLoi': 'Meaning', 'que.hKhuyen': 'A suggestion for today',
      'que.hMenh': 'Element: {m} · {cc}, {y}', 'que.colors': 'In the Five Elements tradition, the matching colours are: {c}.',
      'que.hStone': 'Suggested stone', 'que.stoneM': 'Traditionally, {name} is believed to symbolize {m}.',
      'que.again': 'You have already drawn today. Today\'s blessing stays the same; come back tomorrow for a new one.',
      'que.print': 'Print', 'que.printHoly': 'Print the wish', 'que.next': 'Next guest', 'que.done': 'Done',
      'que.printedToday': '✓ Printed today', 'que.printed': '✓ Printed',
      'slip.title': 'DAILY BLESSING', 'slip.titleHoly': 'A PEACEFUL WISH',
      'slip.foot': 'The Phước Lộc Fire Tiger wishes you a good day',
      'print.prep': 'Preparing your slip…', 'print.busy': 'Printing… 🖨',
      'print.ok': 'Done! Please take your slip 🙏', 'print.fail': 'Could not print, please try again.',
      'print.timeout': 'The printer did not respond, please try again.', 'print.drawErr': 'Slip drawing error: ',
      'print.noPrint': 'This browser cannot print.',
      'print.sent': 'Print sent. The T2 prints through the Hổ Lửa Phước Lộc app (see README).',
      'print.callErr': 'Could not start printing: '
    }
  };

  var DAY_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  var MON_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var ELEM_EN = { 'Kim': 'Metal', 'Mộc': 'Wood', 'Thủy': 'Water', 'Hỏa': 'Fire', 'Thổ': 'Earth' };
  /* Vietnamese zodiac: Mão is the Cat */
  var ANIMAL_EN = ['Rat', 'Ox', 'Tiger', 'Cat', 'Dragon', 'Snake', 'Horse', 'Goat', 'Monkey', 'Rooster', 'Dog', 'Pig'];

  /* the printer bridge (PrinterBridge.java) answers in Vietnamese; English screens get the same message in English */
  var NATIVE_EN = {
    'Chưa kết nối được máy in, thử lại sau vài giây.': 'The printer is not connected yet, please try again in a few seconds.',
    'Ảnh phiếu không hợp lệ.': 'The slip image is not valid.',
    'Ảnh phiếu bị lỗi.': 'The slip image is damaged.',
    'Đang in phiếu trước, anh/chị chờ chút nhé.': 'Still printing the previous slip, one moment please.',
    'Máy in chưa phản hồi, anh/chị thử lại nhé.': 'The printer did not respond, please try again.',
    'Máy in đang khởi động, anh/chị chờ vài giây rồi in lại nhé.': 'The printer is starting up, please wait a few seconds and print again.',
    'Máy in hết giấy.': 'The printer is out of paper.',
    'Máy in đang quá nóng, chờ một lát rồi in lại nhé.': 'The printer is too hot, please wait a moment and print again.',
    'Nắp máy in đang mở.': 'The printer cover is open.'
  };
  var NATIVE_RE = [
    [/^Máy in mất kết nối \(mã (-?\d+)\)\.$/, 'The printer lost connection (code $1).'],
    [/^Dao cắt giấy bị kẹt \(mã (-?\d+)\)\.$/, 'The paper cutter is jammed (code $1).'],
    [/^Không tìm thấy máy in \(mã (-?\d+)\)\.$/, 'No printer found (code $1).'],
    [/^Máy in đang lỗi cập nhật \(mã (-?\d+)\)\.$/, 'The printer has an update error (code $1).'],
    [/^Lỗi máy in \(mã (-?\d+)\)\.$/, 'Printer error (code $1).'],
    [/^Lỗi in: (.*)$/, 'Print error: $1']
  ];

  var lang = 'vi', subs = [], lastTouch = Date.now();

  function t(k, v) {
    var s = UI[lang][k];
    if (s == null) s = UI.vi[k];
    if (s == null) return k;
    if (v) s = s.replace(/\{(\w+)\}/g, function (m, n) { return v[n] != null ? String(v[n]) : m; });
    return s;
  }
  function en() { return lang === 'en'; }
  function pad(n) { return (n < 10 ? '0' : '') + n; }

  function apply() {
    doc.documentElement.setAttribute('lang', lang);
    var i, els = doc.querySelectorAll('[data-i18n]');
    for (i = 0; i < els.length; i++) els[i].textContent = t(els[i].getAttribute('data-i18n'));
    els = doc.querySelectorAll('[data-i18n-aria]');
    for (i = 0; i < els.length; i++) els[i].setAttribute('aria-label', t(els[i].getAttribute('data-i18n-aria')));
    els = doc.querySelectorAll('[data-i18n-alt]');
    for (i = 0; i < els.length; i++) els[i].setAttribute('alt', t(els[i].getAttribute('data-i18n-alt')));
    var b = doc.getElementById('langBtn');
    if (b) { b.textContent = t('lang.btn'); b.setAttribute('aria-label', t('lang.aria')); }
  }
  function set(l) {
    l = l === 'en' ? 'en' : 'vi';
    if (l === lang) return;
    lang = l;
    apply();
    for (var i = 0; i < subs.length; i++) { try { subs[i](lang); } catch (e) { if (root.console) console.error(e); } }
    try { new Image().src = '_diag?tag=lang&l=' + lang + '&t=' + Date.now(); } catch (e) {}
  }

  FT.I18N = {
    t: t, set: set, en: en,
    lang: function () { return lang; },
    on: function (fn) { subs.push(fn); },
    /* pick the Vietnamese or English version of a content object */
    pick: function (vi, enObj) { return en() && enObj ? enObj : vi; },
    elem: function (m) { return en() ? (ELEM_EN[m] || m) + ' (' + m + ')' : m; },
    canChi: function (y) { var cc = FT.Lunar.canChi(y); return en() ? cc + ' (' + ANIMAL_EN[(y + 8) % 12] + ')' : cc; },
    solar: function (d, thuVi) {
      return en() ? DAY_EN[d.getDay()] + ', ' + d.getDate() + ' ' + MON_EN[d.getMonth()] + ' ' + d.getFullYear()
        : thuVi[d.getDay()] + ', ' + pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + '/' + d.getFullYear();
    },
    native: function (msg) {
      if (!en() || !msg) return msg;
      if (NATIVE_EN[msg]) return NATIVE_EN[msg];
      for (var i = 0; i < NATIVE_RE.length; i++) if (NATIVE_RE[i][0].test(msg)) return msg.replace(NATIVE_RE[i][0], NATIVE_RE[i][1]);
      return msg;
    },
    _ui: UI, _native: NATIVE_EN
  };

  function touched() { lastTouch = Date.now(); }
  function boot() {
    doc.addEventListener('touchstart', touched, true);
    doc.addEventListener('mousedown', touched, true);
    doc.addEventListener('keydown', touched, true);
    setInterval(function () { if (lang !== 'vi' && Date.now() - lastTouch > RESET_MS) set('vi'); }, 5000);
    var b = doc.getElementById('langBtn');
    if (b) b.onclick = function () { set(en() ? 'vi' : 'en'); if (FT.Sound) FT.Sound.play('tick'); };
    apply();
  }
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', boot); else boot();
})(typeof window !== 'undefined' ? window : globalThis, typeof document !== 'undefined' ? document : { readyState: 'complete', addEventListener: function () {}, querySelectorAll: function () { return []; }, getElementById: function () { return null; }, documentElement: { setAttribute: function () {} } });
