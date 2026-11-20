/* speech-lines.js — everything the Fire Tiger SAYS ALOUD (V1.3), Vietnamese + English side by side.
 * Every line is recorded once on the PC at build time (VieNeu-TTS, CPU, voice "Trúc Ly") and shipped inside the
 * APK as an MP3 file: voice/<vi|en>/<key>_<n>.mp3. At runtime the tablet only plays files, so the tiger talks
 * with no PC, no server and no graphics card. The bubble shows the same text as the voice.
 * Rules (DNA_PHUOC_LOC.md): the tiger is "Hổ Lửa", the customer "anh/chị"; no promises, prices, health claims,
 * no selling on holy days; meanings "theo quan niệm". The customer's name and birth year are NEVER spoken
 * (they only appear in the bubble). tests/que-lint.test.js checks every line.
 * Each entry is [Vietnamese, English]. Keys ending in a mood name belong to that personality mood. ES5. */
(function (root) {
  'use strict';
  var FT = root.FT = root.FT || {};

  var L = {
    /* first touch of a visit (after 90 s with nobody): greeting by time of day */
    greetMorning: [
      ['Chào buổi sáng anh/chị! Hổ Lửa Phước Lộc xin chào ạ 🐯', 'Good morning! The Phước Lộc Fire Tiger says hello 🐯'],
      ['Sáng nay anh/chị ghé thăm Hổ Lửa, vui quá đi ạ ☀️', 'It is lovely to see you this morning ☀️']
    ],
    greetDay: [
      ['Chào anh/chị! Hổ Lửa Phước Lộc rất vui được gặp anh/chị ạ 🐯', 'Hello! The Phước Lộc Fire Tiger is so happy to meet you 🐯'],
      ['A, có khách ghé thăm! Hổ Lửa xin chào anh/chị ạ ✨', 'Oh, a visitor! The Fire Tiger says hello ✨']
    ],
    greetEvening: [
      ['Chào buổi tối anh/chị! Hổ Lửa Phước Lộc xin chào ạ 🌙', 'Good evening! The Phước Lộc Fire Tiger says hello 🌙'],
      ['Tối rồi mà anh/chị vẫn ghé thăm Hổ Lửa, cảm ơn anh/chị ạ ❤️', 'Thank you for visiting the Fire Tiger this evening ❤️']
    ],
    /* the tiger asks on its own, right after the greeting (answer chips in the same language) */
    howru: [
      ['Hôm nay anh/chị thế nào ạ?', 'How are you today?'],
      ['Anh/chị khỏe không ạ?', 'How are you doing?'],
      ['Ngày hôm nay của anh/chị có vui không ạ?', 'Is your day going well?']
    ],
    replyGood: [
      ['Tuyệt quá! Hổ Lửa cũng vui lây nè ❤️', 'Wonderful! That makes the Fire Tiger happy too ❤️'],
      ['Vậy là Hổ Lửa vui gấp đôi rồi ạ ✨', 'Then the Fire Tiger is twice as happy ✨']
    ],
    replyOk: [
      ['Một ngày bình yên cũng là một ngày đẹp ạ.', 'A calm day is a lovely day too.'],
      ['Để Hổ Lửa làm anh/chị cười một chút nha 🐾', 'Let the Fire Tiger make you smile a little 🐾']
    ],
    replyTired: [
      ['Anh/chị nghỉ chân một chút, ngắm đá cùng Hổ Lửa nhé.', 'Rest your feet for a moment and enjoy the stones with the Fire Tiger.'],
      ['Hổ Lửa gửi anh/chị một ngọn lửa nhỏ thật ấm áp 🔥', 'The Fire Tiger sends you a small, warm flame 🔥']
    ],
    /* the tiger offers to look up the element (mệnh) of the birth year */
    menhOffer: [
      ['Anh/chị có muốn Hổ Lửa xem mệnh theo năm sinh không ạ?', 'Would you like the Fire Tiger to find your element from your birth year?']
    ],
    menhAsk: [
      ['Anh/chị nhập năm sinh nhé, còn tên thì không bắt buộc ạ.', 'Please enter your birth year. Your name is optional.']
    ],
    /* bubble adds the name: "Rất vui được biết anh/chị {name} ạ!"; the voice never says the name */
    menhHello: [
      ['Rất vui được biết anh/chị ạ!', 'Very nice to meet you!']
    ],
    /* menh_<n>: n = index in ELEM; text built from the element colours (see FT.SPEECH.menhText) */
    menhAfter: [
      ['Anh/chị có muốn xin quẻ đầu ngày với Hổ Lửa không ạ?', 'Would you like to draw a daily blessing with the Fire Tiger?']
    ],
    later: [
      ['Dạ, khi nào cần anh/chị cứ gọi Hổ Lửa nhé.', 'Of course! Call the Fire Tiger whenever you like.']
    ],
    /* "💬 Hỏi Hổ Lửa" answers */
    aboutMe: [
      ['Hổ Lửa là linh vật của Đá Phong Thủy Phước Lộc, thích chào khách và gửi lời chúc đầu ngày ạ 🐯', 'The Fire Tiger is the mascot of Đá Phong Thủy Phước Lộc. It loves greeting visitors and sending morning wishes 🐯']
    ],
    aboutShop: [
      ['Phước Lộc có vòng tay, trang sức đá, đá trưng bày và tượng đá. Anh/chị cứ hỏi nhân viên để xem tận tay nhé.', 'Phước Lộc has bracelets, stone jewellery, display stones and stone statues. Just ask a staff member to see them up close.']
    ],
    aboutCheck: [
      ['Phước Lộc hỗ trợ kiểm định sản phẩm và cung cấp phiếu kiểm định khi khách hàng có nhu cầu.', 'Phước Lộc offers product testing and provides a testing report when customers request it.']
    ],
    aboutChoose: [
      ['Anh/chị thử xoay viên đá dưới ánh sáng để ngắm màu và vân đá, rồi chọn viên mình thấy ưng ý nhé.', 'Turn a stone under the light to see its colour and pattern, then pick the one you like.']
    ],
    aboutContact: [
      ['Nhắn tin cho Phước Lộc để được tư vấn chi tiết.', 'Message Phước Lộc for detailed advice.']
    ],
    /* true facts about real tigers, told by a playful fire tiger */
    fact: [
      ['Mỗi chú hổ có bộ vằn riêng, không chú nào giống chú nào đâu ạ 🐯', 'Every tiger has its own stripes. No two tigers look the same 🐯'],
      ['Hổ là loài mèo lớn bơi rất giỏi đó anh/chị!', 'Tigers are big cats that swim very well!'],
      ['Sau tai của hổ có hai đốm trắng, trông như đôi mắt nhỏ ạ.', 'Tigers have white spots on the back of their ears that look like little eyes.'],
      ['Tiếng gầm của hổ vang rất xa trong rừng ạ.', 'A tiger\'s roar can be heard far away in the forest.'],
      ['Còn Hổ Lửa thì không dám bơi, sợ tắt lửa đó hì hì 🔥', 'But the Fire Tiger does not swim, it might put out its flame, hee hee 🔥']
    ],
    /* touch reactions, one set per personality mood */
    touchPlayful: [
      ['Hì hì, nhột quá anh/chị ơi! 🐾', 'Hee hee, that tickles! 🐾'],
      ['Gừ gừ… Hổ Lửa thích được vuốt ve lắm!', 'Purr purr… the Fire Tiger loves a good pat!'],
      ['Anh/chị bắt được Hổ Lửa rồi, giờ tới lượt Hổ Lửa nha!', 'You caught the Fire Tiger! Now it is my turn!']
    ],
    touchCurious: [
      ['Ồ, anh/chị đang ngắm viên đá nào thế ạ?', 'Oh, which stone are you looking at?'],
      ['Hổ Lửa tò mò quá, cho Hổ Lửa ngắm cùng với!', 'The Fire Tiger is so curious, let me take a look too!'],
      ['Anh/chị có thấy vân đá lấp lánh dưới đèn không ạ? ✨', 'Can you see the stone patterns sparkle under the light? ✨']
    ],
    touchShy: [
      ['Ơ… Hổ Lửa ngại quá à ☺️', 'Oh… the Fire Tiger feels a little shy ☺️'],
      ['Anh/chị vuốt nhẹ thôi nha, Hổ Lửa hơi nhột.', 'Gently please, the Fire Tiger is ticklish.'],
      ['Hổ Lửa đỏ mặt rồi nè…', 'Now the Fire Tiger is blushing…']
    ],
    touchProud: [
      ['Hổ Lửa Phước Lộc đây, oai chưa anh/chị? 🔥', 'Here is the Phước Lộc Fire Tiger. Looking grand, right? 🔥'],
      ['Anh/chị nhìn bộ vằn lửa của Hổ Lửa nè, đẹp không ạ?', 'Look at my fiery stripes. Do you like them?'],
      ['Hổ Lửa gầm nhỏ một tiếng chào anh/chị nha!', 'A small roar to say hello!']
    ],
    touchSleepy: [
      ['Oáp… Hổ Lửa hơi buồn ngủ, nhưng vẫn chào anh/chị ạ.', 'Yawn… the Fire Tiger is a bit drowsy, but still says hello.'],
      ['Ưm… anh/chị gãi đầu Hổ Lửa thêm chút nữa nha.', 'Mmm… scratch my head a little more, please.'],
      ['Hổ Lửa duỗi người một cái đã… xong rồi ạ!', 'Let the Fire Tiger stretch first… done!']
    ],
    fly: [
      ['Hổ Lửa Phước Lộc bay lên nào! 🪽', 'Up goes the Phước Lộc Fire Tiger! 🪽'],
      ['Bay một vòng chào anh/chị nè!', 'One flying lap to say hello!']
    ],
    fire: [
      ['Hít sâu… phù! 🔥', 'Deep breath… whoosh! 🔥'],
      ['Ngọn lửa ấm chào anh/chị 🔥', 'A warm flame to greet you 🔥']
    ],
    sleep: [
      ['Hổ Lửa nghỉ một chút, anh/chị chạm để đánh thức nhé 🌙', 'The Fire Tiger is resting; tap to wake it up 🌙']
    ],
    wake: [
      ['Oáp… Hổ Lửa dậy rồi đây ạ!', 'Yawn… the Fire Tiger is awake!']
    ],
    /* after the language button */
    langOn: [
      ['Dạ, Hổ Lửa nói tiếng Việt với anh/chị nhé.', 'Hello! The Fire Tiger speaks English with you now.']
    ],
    /* Xin quẻ */
    queOpen: [
      ['Anh/chị xin quẻ đầu ngày với Hổ Lửa nhé! 🎋', 'Draw your daily blessing with the Fire Tiger! 🎋']
    ],
    printOk: [
      ['Đã in xong, mời anh/chị nhận phiếu 🙏', 'Printed. Please take your slip 🙏']
    ],
    /* V1.4 🎤: answers to what the customer says */
    micMiss: [
      ['Hổ Lửa chưa nghe rõ, anh/chị nói lại hoặc chọn câu hỏi bên dưới nhé.', 'Sorry, the Fire Tiger did not catch that. Please say it again or pick a question below.'],
      ['Câu này khó quá, anh/chị chọn một câu hỏi bên dưới cho Hổ Lửa nhé.', 'That one is tricky. Please pick a question below.']
    ],
    micFine: [
      ['Hổ Lửa khỏe lắm, cảm ơn anh/chị đã hỏi thăm ạ! 🐯', 'The Fire Tiger is doing great, thank you for asking! 🐯'],
      ['Được gặp anh/chị là Hổ Lửa vui lắm rồi ạ!', 'Meeting you makes the Fire Tiger very happy!']
    ],
    micHello: [
      ['Xin chào anh/chị, Hổ Lửa Phước Lộc đây ạ!', 'Hello! This is the Phước Lộc Fire Tiger!'],
      ['Chào anh/chị, rất vui được gặp anh/chị ạ 🐾', 'Hi there, it is so nice to meet you 🐾']
    ],
    micThanks: [
      ['Dạ không có gì, Hổ Lửa rất vui được trò chuyện ạ!', 'You are welcome! The Fire Tiger is glad to chat with you.'],
      ['Hổ Lửa cảm ơn anh/chị nhiều nha 🐾', 'Thank you so much 🐾']
    ],
    micBye: [
      ['Tạm biệt anh/chị, chúc anh/chị một ngày an lành ạ!', 'Goodbye, and have a peaceful day!'],
      ['Hẹn gặp lại anh/chị nhé! 🐯', 'See you again! 🐯']
    ],
    micHoly: [
      ['Hôm nay là ngày lễ, Hổ Lửa xin gửi anh/chị lời chúc bình an ạ 🙏', 'Today is a holy day, so the Fire Tiger simply wishes you peace 🙏']
    ],
    micLove: [
      ['Hổ Lửa cũng quý anh/chị lắm đó ạ! 🧡', 'The Fire Tiger likes you a lot too! 🧡']
    ]
  };

  var ELEM = ['Kim', 'Mộc', 'Thủy', 'Hỏa', 'Thổ'];
  var ELEM_EN = ['Metal', 'Wood', 'Water', 'Fire', 'Earth'];
  var HOLY = ['1', '15', '4-15', '7-15'];
  var MOODS = ['Playful', 'Curious', 'Shy', 'Proud', 'Sleepy'];
  /* V1.5.5: stones Phước Lộc carries for each element (from the Owner's product sheet, content-rules.json "stones":
   * only stones whose listed elements include this one). Said as a belief ("theo quan niệm"), never a promise. */
  var SHOP_STONES = {
    'Kim': ['thạch anh vàng', 'thạch anh trắng', 'mắt hổ vàng nâu'],
    'Mộc': ['thạch anh tóc xanh', 'mắt hổ xanh lá', 'đá peridot'],
    'Thủy': ['thạch anh tóc đen', 'đá aquamarine', 'mắt hổ xanh dương'],
    'Hỏa': ['thạch anh tóc đỏ', 'thạch anh tím', 'thạch anh hồng'],
    'Thổ': ['thạch anh tóc vàng', 'mắt hổ vàng tâm', 'thạch anh tóc nâu']
  };
  var SHOP_STONES_EN = {
    'Kim': ['citrine', 'clear quartz', 'golden-brown tiger eye'],
    'Mộc': ['green rutilated quartz', 'green tiger eye', 'peridot'],
    'Thủy': ['black rutilated quartz', 'aquamarine', 'blue tiger eye'],
    'Hỏa': ['red rutilated quartz', 'amethyst', 'rose quartz'],
    'Thổ': ['golden rutilated quartz', 'golden tiger eye', 'brown rutilated quartz']
  };

  function low(s) { return s.charAt(0).toLowerCase() + s.slice(1); }
  function li(lang) { return lang === 'en' ? 1 : 0; }
  function Q(lang) { return lang === 'en' ? FT.QUE_EN : FT.QUE; }

  FT.SPEECH = {
    lines: L, ELEM: ELEM, HOLY: HOLY, MOODS: MOODS, SHOP_STONES: SHOP_STONES,
    /* text of line key/n in a language (bubble text, with emoji) */
    text: function (key, n, lang) {
      if (key === 'menh') return this.menhText(n, lang);
      if (key === 'tuoi') return this.tuoiText(n, lang);
      if (key === 'menhShop') return this.menhShopText(n, lang);
      if (key === 'que') return this.queText(n, lang);
      if (key === 'holy') return this.holyText(n, lang);
      var a = L[key]; if (!a || !a[n]) return '';
      return a[n][li(lang)];
    },
    count: function (key) {
      if (key === 'menh' || key === 'menhShop') return ELEM.length;
      if (key === 'tuoi') return 60;
      if (key === 'que') return FT.QUE.list.length;
      if (key === 'holy') return HOLY.length;
      return L[key] ? L[key].length : 0;
    },
    menhText: function (n, lang) {
      var m = ELEM[n], c = Q(lang).colors[m];
      return lang === 'en'
        ? 'In the Five Elements tradition, your element is ' + ELEM_EN[n] + '. Matching colours: ' + c + '.'
        : 'Theo quan niệm ngũ hành, anh/chị thuộc mệnh ' + m + '. Màu hợp mệnh: ' + c + '.';
    },
    /* tuoi_<i>: i = place in the 60-year cycle (0 = Giáp Tý): tuổi, con giáp, nạp âm and its meaning */
    tuoiText: function (i, lang) {
      var t = FT.Lunar.tuoiAt(i);
      return lang === 'en'
        ? 'You were born in the year ' + t.canChi + ', the year of the ' + t.conEn + '. Your birth element is ' + t.nap + ', ' + t.meanEn +
          ', of the ' + ELEM_EN[ELEM.indexOf(t.elem)] + ' element.'
        : 'Anh/chị tuổi ' + t.canChi + ', tuổi con ' + t.con + ', mệnh ' + t.nap + ', nghĩa là ' + t.mean + ', thuộc hành ' + t.elem + '.';
    },
    /* menhShop_<n>: colours and the Phước Lộc stones for element n (not on holy days: that is selling) */
    menhShopText: function (n, lang) {
      var m = ELEM[n], c = Q(lang).colors[m];
      if (lang === 'en') {
        var e = SHOP_STONES_EN[m];
        return 'In feng shui tradition, ' + ELEM_EN[n] + ' goes well with ' + c + '. At Phước Lộc you can look at ' + e[0] + ', ' + e[1] + ' and ' + e[2] + '.';
      }
      var v = SHOP_STONES[m];
      return 'Theo quan niệm phong thủy, mệnh ' + m + ' hợp màu ' + c + '. Tại Phước Lộc, anh/chị có thể tham khảo ' + v[0] + ', ' + v[1] + ' và ' + v[2] + '.';
    },
    queText: function (n, lang) {
      var q = Q(lang).list[n];
      return lang === 'en'
        ? 'Blessing number ' + q.no + ': ' + q.name + '. ' + q.verse[0].replace(/,$/, '') + ', ' + low(q.verse[1]) + ' ' + q.loi
        : 'Quẻ số ' + q.no + ': Quẻ ' + q.name + '. ' + q.verse[0].replace(/,$/, '') + ', ' + q.verse[1] + ' ' + q.loi;
    },
    holyText: function (n, lang) { return Q(lang).holy[HOLY[n]].wish; },
    /* every recorded clip: [id, lang, text] (id = key_n) */
    all: function () {
      var out = [], keys = Object.keys(L).concat(['menh', 'tuoi', 'menhShop', 'que', 'holy']), self = this;
      ['vi', 'en'].forEach(function (lang) {
        keys.forEach(function (k) {
          for (var n = 0; n < self.count(k); n++) out.push([k + '_' + n, lang, self.text(k, n, lang)]);
        });
      });
      return out;
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
