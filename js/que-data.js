/* que-data.js — "Xin quẻ mỗi ngày" content, written to the Phước Lộc DNA (docs/brand/DNA_PHUOC_LOC.md)
 * and the brand rules (Phuoc_Loc_Social v1.2):
 *  - every quẻ is a kind wish + advice, never a prediction or a scare; no "xấu / hạn / xui" quẻ;
 *  - stone meanings and colours only "theo quan niệm" (data from content-rules.json, verbs like
 *    "giúp / mang lại / thu hút / hóa giải / kích hoạt" removed);
 *  - no prices, promotions, stock, health or sleep talk; no quotes attributed to the Buddha;
 *  - mùng 1 / rằm: calm, respectful wish, no stone suggestion, no sales call-to-action.
 * The verses are original short lines written for Phước Lộc (not quoted from any temple set).
 * tests/que-lint.test.js checks all of this text against the banned-word list. ES5. */
(function (root) {
  'use strict';
  var FT = root.FT = root.FT || {};

  var LIST = [
    ['Khởi Đầu', 'Sáng nay nắng mới lên thềm,|Bước chân nhẹ bước, lòng thêm vững vàng.', 'Một khởi đầu tươi mới đang chờ anh/chị.', 'Bắt tay vào việc mình đã định từ lâu, dù chỉ một bước nhỏ.'],
    ['An Yên', 'Gió hiền thổi qua hiên nhà,|Lòng an thì cảnh cũng hòa dịu theo.', 'Chúc anh/chị một ngày lòng an yên, nhìn mọi việc nhẹ nhàng.', 'Dành năm phút ngồi yên, hít thở chậm trước khi bắt đầu ngày mới.'],
    ['Hanh Thông', 'Dòng sông xuôi chảy về khơi,|Việc nào cũng có lối đời mở ra.', 'Chúc công việc hôm nay suôn sẻ, trôi chảy.', 'Sắp xếp ba việc quan trọng nhất và làm lần lượt.'],
    ['Phúc Hậu', 'Gieo lời tử tế hôm nay,|Lời hay ý đẹp đong đầy quanh ta.', 'Lòng phúc hậu là món quà đẹp anh/chị trao đi.', 'Nói một lời cảm ơn thật lòng với người bên cạnh.'],
    ['Đồng Tâm', 'Một cây làm chẳng nên non,|Chung tay góp sức, việc tròn đẹp thêm.', 'Chúc anh/chị một ngày cùng mọi người chung sức, chung lòng.', 'Lắng nghe ý kiến của đồng nghiệp hoặc người thân trước khi quyết định.'],
    ['Kiên Nhẫn', 'Giọt nước bền bỉ ngày đêm,|Lâu dần đá cứng cũng mềm, cũng mòn.', 'Bền bỉ từng ngày là điều đáng trân trọng.', 'Tiếp tục việc đang dở, đừng vội bỏ ngang.'],
    ['Minh Mẫn', 'Trăng soi mặt nước trong veo,|Tâm trong thì ý cũng theo sáng ngời.', 'Chúc anh/chị một ngày đầu óc sáng suốt, tỉnh táo.', 'Ghi ra giấy điều đang băn khoăn để nhìn lại cho rõ.'],
    ['Hòa Khí', 'Một nụ cười, một lời chào,|Nhà vui, người mến, ngày nào cũng xuân.', 'Hòa khí trong nhà là nền của mọi niềm vui.', 'Chủ động hỏi han một người lâu rồi chưa liên lạc.'],
    ['Vươn Lên', 'Mầm non đội đất vươn cao,|Nắng mưa chẳng ngại, ngày nào cũng xanh.', 'Mỗi ngày tiến thêm một chút là đáng quý.', 'Học thêm một điều mới, dù rất nhỏ.'],
    ['Biết Ơn', 'Uống nước nhớ cội nhớ nguồn,|Lòng biết ơn giữ tâm thêm dịu dàng.', 'Lòng biết ơn làm ngày thường cũng hóa đẹp.', 'Viết ra ba điều anh/chị thấy biết ơn hôm nay.'],
    ['Tự Tin', 'Hổ con bước giữa rừng xanh,|Ngẩng đầu nhìn thẳng, tâm thành chẳng lo.', 'Chúc anh/chị thêm tự tin với việc mình đang làm.', 'Mạnh dạn nói ra ý tưởng của mình.'],
    ['Tươi Mới', 'Hoa mai hé nụ đầu cành,|Ngày vui mở cửa, lòng thanh nhẹ nhàng.', 'Chúc anh/chị một ngày tươi mới để bắt đầu điều mình muốn.', 'Dọn gọn bàn làm việc hoặc một góc nhà.'],
    ['Chân Thành', 'Lời ngay như ngọc trong veo,|Người tin, người mến, người theo bên mình.', 'Sự chân thành là điều đáng quý trong mọi mối quan hệ.', 'Giữ đúng một lời hứa, dù là chuyện nhỏ.'],
    ['Thong Dong', 'Chậm thôi, đường vẫn còn dài,|Ngắm mây, ngắm nắng, chẳng ai giục mình.', 'Chậm lại một chút để thấy ngày đẹp hơn.', 'Ăn bữa trưa chậm rãi, không nhìn điện thoại.'],
    ['Sum Vầy', 'Mâm cơm ấm áp tiếng cười,|Gia đình là chốn thảnh thơi giữa đời.', 'Chúc gia đình anh/chị ấm áp, sum vầy.', 'Dành thời gian ăn tối cùng người thân.'],
    ['Quý Nhân', 'Đường xa có bạn đồng hành,|Một lời khuyên tốt, ngày lành thêm vui.', 'Chúc anh/chị gặp người sẵn lòng chia sẻ, chỉ đường.', 'Đừng ngại hỏi ý kiến người có kinh nghiệm.'],
    ['Vững Vàng', 'Núi cao đứng giữa trời xanh,|Gió mưa bao bận vẫn thành vững tâm.', 'Tâm vững thì việc khó cũng nhẹ đi.', 'Làm việc khó nhất trước, khi còn nhiều sức.'],
    ['Rộng Lượng', 'Biển to chứa cả trăm sông,|Lòng rộng thì chuyện buồn lòng hóa vơi.', 'Bỏ qua một điều nhỏ để lòng nhẹ nhàng hơn.', 'Tha thứ cho một điều khiến anh/chị còn bận lòng.'],
    ['Sáng Tạo', 'Bút hoa vẽ một cánh diều,|Ý hay bay bổng, trăm điều mới tươi.', 'Chúc anh/chị một ngày nhiều ý tưởng mới.', 'Thử làm một việc quen theo cách khác.'],
    ['Chuyên Cần', 'Con ong chăm chỉ sớm hôm,|Hoa thơm mật ngọt đầy hòm cuối năm.', 'Chuyên cần mỗi ngày là gốc của thành quả.', 'Hoàn thành trọn vẹn một việc trước khi chuyển sang việc khác.'],
    ['Thanh Thản', 'Chuông chiều vọng giữa không gian,|Buông điều đã cũ, lòng an lại về.', 'Buông bớt muộn phiền cũ, đón ngày mới nhẹ nhàng.', 'Đi bộ vài phút ngoài trời, ngắm cây xanh.'],
    ['Tri Kỷ', 'Một ly trà ấm chuyện trò,|Bạn hiền bên cạnh, chẳng lo muộn phiền.', 'Chúc anh/chị có những cuộc trò chuyện ấm lòng.', 'Gọi cho một người bạn cũ để hỏi thăm.'],
    ['Chí Hướng', 'Cánh chim bay giữa trời cao,|Biết đường mình đến, chẳng nao giữa trời.', 'Chúc anh/chị vững bước trên con đường mình đã chọn.', 'Xem lại mục tiêu tháng này và đánh dấu điều đã làm được.'],
    ['Nhẫn Nại', 'Trồng cây đợi đủ mùa trăng,|Hoa thơm trái ngọt chẳng phần ai đâu.', 'Điều tốt cần thời gian để đơm hoa.', 'Kiên nhẫn với bản thân và với người khác thêm một chút.'],
    ['Ấm Áp', 'Bếp hồng đỏ lửa đêm đông,|Lời thăm, lời hỏi ấm lòng người xa.', 'Sự ấm áp anh/chị trao đi là món quà đẹp cho người nhận.', 'Gửi một lời hỏi thăm đến người đang ở xa.'],
    ['Tinh Tấn', 'Mỗi ngày một bước đi lên,|Cầu thang trăm bậc chẳng quên bậc nào.', 'Từng bước nhỏ đều đáng ghi nhận.', 'Tự khen mình một điều đã làm tốt hôm qua.'],
    ['Hiền Hòa', 'Lời hiền như nước mát trong,|Nói ra ai cũng vui lòng, vui tai.', 'Lời nói dịu dàng làm ngày của ai đó dễ chịu hơn.', 'Hôm nay thử nói chậm và nhẹ nhàng hơn một chút.'],
    ['Trọn Vẹn', 'Trăng rằm tròn giữa trời cao,|Việc nào làm trọn, việc nào cũng vui.', 'Chúc anh/chị một ngày trọn vẹn, đủ đầy niềm vui.', 'Làm xong những việc nhỏ còn dang dở.'],
    ['Tỏa Sáng', 'Viên đá giữa nắng ban mai,|Màu vân lấp lánh, ai ai cũng nhìn.', 'Mỗi người có một vẻ đẹp riêng, như mỗi viên đá.', 'Mặc một bộ đồ anh/chị thích và tự tin bước ra ngoài.'],
    ['Lạc Quan', 'Sau mưa trời lại hửng hồng,|Cầu vồng bảy sắc vắt ngang cánh đồng.', 'Chúc anh/chị nhìn thấy điều tươi sáng trong ngày hôm nay.', 'Tìm một điều vui trong việc đang làm.'],
    ['Thủy Chung', 'Trăm năm một tấm lòng son,|Nghĩa tình gìn giữ vẫn còn vẹn nguyên.', 'Những mối quan hệ bền lâu là điều đáng quý.', 'Trân trọng người đã ở bên anh/chị bấy lâu.'],
    ['Trưởng Thành', 'Hổ con tập bước, tập bay,|Mỗi ngày một khác, mỗi ngày một hay.', 'Phước Lộc chúc anh/chị mỗi ngày tiến thêm một bước.', 'Đặt cho mình một thử thách nhỏ và hoàn thành nó.']
  ];

  /* stones per element: [name, elements, meaning (content-rules.json), look].
   * Meaning is shown as "theo quan niệm, X tượng trưng cho ..."; the look describes colour, pattern and light only
   * (DNA §2: describe colour/vân/ánh sáng, never claim material or origin). Ngọc trai has no meaning in the
   * source file, so it is not listed (CHỜ XÁC NHẬN). */
  var STONES = [
    ['Thạch anh tóc tam tài', 'all', 'sự hội tụ Thiên - Địa - Nhân', 'những sợi tóc nhiều màu đan trong lòng đá trong'],
    ['Thạch anh tóc vàng', 'Thổ Kim', 'tài lộc trong kinh doanh', 'những sợi tóc ánh vàng trong lòng đá trong'],
    ['Thạch anh tóc đỏ', 'Hỏa Thổ', 'sức sống và sự tự tin', 'những sợi tóc ánh đỏ đồng trong lòng đá'],
    ['Thạch anh tóc xanh', 'Mộc Hỏa', 'tâm trí cân bằng', 'những sợi tóc xanh lục trong lòng đá'],
    ['Thạch anh tóc đen', 'Thủy Mộc', 'sự hộ thân', 'những sợi tóc đen sắc nét trong lòng đá trong'],
    ['Thạch anh tóc nâu', 'Thổ Kim', 'sự ổn định', 'những sợi tóc nâu ấm trong lòng đá'],
    ['Thạch anh ưu linh bông tuyết', 'Kim Thủy', 'các mối quan hệ hài hòa', 'những đốm trắng như bông tuyết trong lòng đá'],
    ['Thạch anh vàng', 'Kim Thổ', 'tài lộc và sự nghiệp', 'sắc vàng trong như mật ong'],
    ['Thạch anh trắng', 'Thủy Kim', 'sự trong lành, thư thái', 'sắc trong suốt, bắt sáng lấp lánh'],
    ['Thạch anh tím', 'Hỏa Thổ', 'sự bình an', 'sắc tím từ nhạt đến đậm'],
    ['Thạch anh hồng', 'Hỏa Thổ', 'sự gắn kết tình cảm', 'sắc hồng phấn dịu nhẹ'],
    ['Mắt hổ vàng nâu', 'Thổ Kim', 'sự điềm tĩnh', 'những dải ánh vàng nâu lay động khi xoay đá'],
    ['Mắt hổ xanh lá', 'Mộc Hỏa', 'sự thăng tiến trong công việc', 'ánh xanh lục chuyển động khi xoay đá'],
    ['Mắt hổ xanh dương', 'Thủy Mộc', 'sự tập trung', 'ánh xanh dương chuyển động khi xoay đá'],
    ['Tourmaline', 'all', 'niềm vui và sự lạc quan', 'nhiều sắc màu trên cùng một chuỗi'],
    ['Aquamarine', 'Thủy Mộc', 'cảm xúc dịu dàng, giao tiếp cởi mở', 'sắc xanh nước biển trong trẻo'],
    ['Garnet', 'Hỏa Thổ', 'lòng thủy chung', 'sắc đỏ rượu vang sâu'],
    ['Hổ phách', 'Hỏa Thổ Kim', 'vẻ ấm áp', 'sắc vàng mật ấm áp'],
    ['Peridot', 'Mộc Hỏa', 'sự điềm tĩnh', 'sắc xanh ô liu tươi sáng'],
    ['Topaz', 'Hỏa Thổ', 'sự sáng tạo', 'sắc trong, bắt sáng lấp lánh'],
    ['Hồng ngọc (ruby)', 'Hỏa Thổ', 'sự gắn kết các mối quan hệ', 'sắc đỏ thắm bắt sáng'],
    ['Ngọc', 'all', 'sự bình an', 'bề mặt bóng mịn, sắc dịu mắt'],
    ['Ngọc phỉ thúy', 'all', 'sự bình an và vẻ đẹp thanh lịch', 'sắc xanh ngọc dịu, bề mặt bóng mịn'],
    ['Ngọc hòa điền', 'all', 'sự bình an và vẻ đẹp thanh lịch', 'sắc trắng ngà, bề mặt mịn như sáp']
  ];

  var COLORS = {
    'Kim': 'vàng, nâu, trắng, xám, ghi',
    'Mộc': 'đen, xanh dương, xanh lá',
    'Thủy': 'trắng, xám, ghi, đen, xanh dương',
    'Hỏa': 'xanh lá, đỏ, hồng, tím',
    'Thổ': 'đỏ, hồng, tím, vàng, nâu'
  };

  var WISH = [
    'Chúc anh/chị một ngày vui vẻ, an yên và nhiều niềm vui.',
    'Chúc anh/chị một ngày tràn đầy năng lượng tích cực.',
    'Chúc anh/chị và gia đình một ngày ấm áp, đủ đầy.',
    'Chúc anh/chị một ngày làm việc suôn sẻ, nhiều nụ cười.'
  ];
  /* mùng 1 / rằm: calm and respectful, no selling (brand rule §6) */
  /* holy days: the whole card is a solemn wish (no quẻ, no stone, no CTA). Keys: 'd' = lunar day,
   * 'm-d' = lunar month-day (Phật đản 15/4, Vu Lan 15/7 take priority over a plain rằm).
   * Original wording, not attributed to the Buddha; needs the Owner's OK before going live. */
  var HOLY = {
    '1': { title: 'Ngày mùng Một', wish: 'Ngày mùng 1, chúc anh/chị khởi đầu tháng mới với tâm thiện lành, lòng an yên và biết ơn.' },
    '15': { title: 'Ngày Rằm', wish: 'Ngày rằm, chúc anh/chị giữ lòng an yên, lời nói hiền hòa và biết trân trọng những điều đang có.' },
    '4-15': { title: 'Mùa Phật đản', wish: 'Mùa Phật đản, chúc anh/chị và gia đình an lạc, khởi tâm từ bi và sống tử tế mỗi ngày.' },
    '7-15': { title: 'Mùa Vu Lan', wish: 'Mùa Vu Lan, chúc anh/chị và gia đình nhớ ơn cha mẹ, ông bà, giữ trọn nghĩa hiếu.' }
  };
  /* one gentle reflection under the holy-day wish (brand §6.2 themes: gratitude, kindness, honesty, calm, enough) */
  var HOLY_THINK = [
    'Mong mỗi chúng ta bắt đầu ngày mới bằng một ý nghĩ lành và một việc làm tốt.',
    'Giữ chữ tín trong việc nhỏ cũng là cách vun đắp niềm tin trong việc lớn.',
    'Bớt một lời nóng giận, thêm một lần lắng nghe.',
    'Biết ơn cha mẹ, thầy cô và những người âm thầm vì mình mỗi ngày.',
    'Biết đủ với những gì đang có cũng là một niềm vui.',
    'Một lời nói hiền hòa hôm nay là món quà cho người bên cạnh.'
  ];

  FT.QUE = {
    list: LIST.map(function (q, i) { return { no: i + 1, name: q[0], verse: q[1].split('|'), loi: q[2], khuyen: q[3] }; }),
    stones: STONES.map(function (s) { return { name: s[0], menh: s[1], m: s[2], look: s[3] }; }),
    colors: COLORS,
    wish: WISH,
    holy: HOLY,
    holyThink: HOLY_THINK,
    service: 'Phước Lộc hỗ trợ kiểm định sản phẩm và cung cấp phiếu kiểm định khi khách hàng có nhu cầu.',
    note: 'Quẻ mang ý nghĩa chúc lành, theo quan niệm dân gian.',
    holyNote: 'Phước Lộc kính chúc anh/chị và gia đình bình an.',
    /* ngày đôi (day = month): mention it, never as luck (DNA §4) */
    doubleDay: 'Hôm nay là ngày đôi {d}/{d}, Hổ Lửa chúc anh/chị một ngày thật vui.',
    /* while the shop screen idles on a holy day: calm lines only, no products, no CTA (DNA §2, §4) */
    holyIdle: ['Hổ Lửa kính chúc anh/chị một ngày an yên 🪷', 'Chúc anh/chị và gia đình bình an, hiền hòa.', 'Bớt một lời nóng giận, thêm một lần lắng nghe.', 'Biết đủ với những gì đang có cũng là một niềm vui.'],
    cta: 'Nhắn tin cho Phước Lộc để được tư vấn chi tiết.',
    site: 'daphongthuyphuocloc.com'
  };
})(typeof window !== 'undefined' ? window : globalThis);
