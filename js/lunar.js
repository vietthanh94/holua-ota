/* lunar.js — Vietnamese lunar calendar (UTC+7), astronomical method published by Hồ Ngọc Đức
 * (new moon + sun longitude, Meeus formulas). solar2lunar(dd, mm, yyyy) -> {day, month, year, leap}.
 * Also: canChi(lunarYear), menhOf(birthYear) (nạp âm element of the year). ES5. */
(function (root) {
  'use strict';
  var FT = root.FT = root.FT || {};
  var PI = Math.PI, TZ = 7;
  var INT = Math.floor;

  function jdFromDate(dd, mm, yy) {
    var a = INT((14 - mm) / 12), y = yy + 4800 - a, m = mm + 12 * a - 3;
    var jd = dd + INT((153 * m + 2) / 5) + 365 * y + INT(y / 4) - INT(y / 100) + INT(y / 400) - 32045;
    if (jd < 2299161) jd = dd + INT((153 * m + 2) / 5) + 365 * y + INT(y / 4) - 32083;
    return jd;
  }
  function newMoon(k) {
    var T = k / 1236.85, T2 = T * T, T3 = T2 * T, dr = PI / 180;
    var Jd1 = 2415020.75933 + 29.53058868 * k + 0.0001178 * T2 - 0.000000155 * T3;
    Jd1 += 0.00033 * Math.sin((166.56 + 132.87 * T - 0.009173 * T2) * dr);
    var M = 359.2242 + 29.10535608 * k - 0.0000333 * T2 - 0.00000347 * T3;
    var Mpr = 306.0253 + 385.81691806 * k + 0.0107306 * T2 + 0.00001236 * T3;
    var F = 21.2964 + 390.67050646 * k - 0.0016528 * T2 - 0.00000239 * T3;
    var C1 = (0.1734 - 0.000393 * T) * Math.sin(M * dr) + 0.0021 * Math.sin(2 * dr * M);
    C1 = C1 - 0.4068 * Math.sin(Mpr * dr) + 0.0161 * Math.sin(dr * 2 * Mpr);
    C1 = C1 - 0.0004 * Math.sin(dr * 3 * Mpr);
    C1 = C1 + 0.0104 * Math.sin(dr * 2 * F) - 0.0051 * Math.sin(dr * (M + Mpr));
    C1 = C1 - 0.0074 * Math.sin(dr * (M - Mpr)) + 0.0004 * Math.sin(dr * (2 * F + M));
    C1 = C1 - 0.0004 * Math.sin(dr * (2 * F - M)) - 0.0006 * Math.sin(dr * (2 * F + Mpr));
    C1 = C1 + 0.0010 * Math.sin(dr * (2 * F - Mpr)) + 0.0005 * Math.sin(dr * (2 * Mpr + M));
    var deltat = T < -11 ? 0.001 + 0.000839 * T + 0.0002261 * T2 - 0.00000845 * T3 - 0.000000081 * T * T3
      : -0.000278 + 0.000265 * T + 0.000262 * T2;
    return Jd1 + C1 - deltat;
  }
  function sunLongitude(jdn) {
    var T = (jdn - 2451545.0) / 36525, T2 = T * T, dr = PI / 180;
    var M = 357.52910 + 35999.05030 * T - 0.0001559 * T2 - 0.00000048 * T * T2;
    var L0 = 280.46645 + 36000.76983 * T + 0.0003032 * T2;
    var DL = (1.914600 - 0.004817 * T - 0.000014 * T2) * Math.sin(dr * M);
    DL += (0.019993 - 0.000101 * T) * Math.sin(dr * 2 * M) + 0.000290 * Math.sin(dr * 3 * M);
    var L = (L0 + DL) * dr;
    L = L - PI * 2 * INT(L / (PI * 2));
    return L;
  }
  function getNewMoonDay(k) { return INT(newMoon(k) + 0.5 + TZ / 24); }
  function getSunLongitude(dayNumber) { return INT(sunLongitude(dayNumber - 0.5 - TZ / 24) / PI * 6); }
  function getLunarMonth11(yy) {
    var off = jdFromDate(31, 12, yy) - 2415021;
    var k = INT(off / 29.530588853);
    var nm = getNewMoonDay(k);
    if (getSunLongitude(nm) >= 9) nm = getNewMoonDay(k - 1);
    return nm;
  }
  function getLeapMonthOffset(a11) {
    var k = INT((a11 - 2415021.076998695) / 29.530588853 + 0.5), last, i = 1;
    var arc = getSunLongitude(getNewMoonDay(k + i));
    do { last = arc; i++; arc = getSunLongitude(getNewMoonDay(k + i)); } while (arc !== last && i < 14);
    return i - 1;
  }
  function solar2lunar(dd, mm, yy) {
    var dayNumber = jdFromDate(dd, mm, yy);
    var k = INT((dayNumber - 2415021.076998695) / 29.530588853);
    var monthStart = getNewMoonDay(k + 1);
    if (monthStart > dayNumber) monthStart = getNewMoonDay(k);
    var a11 = getLunarMonth11(yy), b11 = a11, lunarYear;
    if (a11 >= monthStart) { lunarYear = yy; a11 = getLunarMonth11(yy - 1); }
    else { lunarYear = yy + 1; b11 = getLunarMonth11(yy + 1); }
    var lunarDay = dayNumber - monthStart + 1;
    var diff = INT((monthStart - a11) / 29);
    var lunarLeap = 0, lunarMonth = diff + 11;
    if (b11 - a11 > 365) {
      var leapMonthDiff = getLeapMonthOffset(a11);
      if (diff >= leapMonthDiff) { lunarMonth = diff + 10; if (diff === leapMonthDiff) lunarLeap = 1; }
    }
    if (lunarMonth > 12) lunarMonth -= 12;
    if (lunarMonth >= 11 && diff < 4) lunarYear -= 1;
    return { day: lunarDay, month: lunarMonth, year: lunarYear, leap: lunarLeap };
  }

  var CAN = ['Giáp', 'Ất', 'Bính', 'Đinh', 'Mậu', 'Kỷ', 'Canh', 'Tân', 'Nhâm', 'Quý'];
  var CHI = ['Tý', 'Sửu', 'Dần', 'Mão', 'Thìn', 'Tỵ', 'Ngọ', 'Mùi', 'Thân', 'Dậu', 'Tuất', 'Hợi'];
  function canChi(y) { return CAN[(y + 6) % 10] + ' ' + CHI[(y + 8) % 12]; }
  /* nạp âm element of a (lunar) birth year: 30 pairs starting at Giáp Tý (1984 Hải Trung Kim) */
  var NAP = ['Kim', 'Hỏa', 'Mộc', 'Thổ', 'Kim', 'Hỏa', 'Thủy', 'Thổ', 'Kim', 'Mộc', 'Thủy', 'Thổ', 'Hỏa', 'Mộc', 'Thủy',
    'Kim', 'Hỏa', 'Mộc', 'Thổ', 'Kim', 'Hỏa', 'Thủy', 'Thổ', 'Kim', 'Mộc', 'Thủy', 'Thổ', 'Hỏa', 'Mộc', 'Thủy'];
  function menhOf(y) { return NAP[INT((((y - 4) % 60) + 60) % 60 / 2)]; }
  /* V1.5.5: the full nạp âm name of each pair (Giáp Tý first), its plain meaning, and the zodiac animal (Vietnamese
   * 12 con giáp: Mão = Mèo) — so the tiger can answer "1994 tuổi gì, mạng gì" right away. */
  var NAP_NAME = ['Hải Trung Kim', 'Lư Trung Hỏa', 'Đại Lâm Mộc', 'Lộ Bàng Thổ', 'Kiếm Phong Kim', 'Sơn Đầu Hỏa',
    'Giản Hạ Thủy', 'Thành Đầu Thổ', 'Bạch Lạp Kim', 'Dương Liễu Mộc', 'Tuyền Trung Thủy', 'Ốc Thượng Thổ',
    'Tích Lịch Hỏa', 'Tùng Bách Mộc', 'Trường Lưu Thủy', 'Sa Trung Kim', 'Sơn Hạ Hỏa', 'Bình Địa Mộc',
    'Bích Thượng Thổ', 'Kim Bạch Kim', 'Phú Đăng Hỏa', 'Thiên Hà Thủy', 'Đại Trạch Thổ', 'Thoa Xuyến Kim',
    'Tang Đố Mộc', 'Đại Khê Thủy', 'Sa Trung Thổ', 'Thiên Thượng Hỏa', 'Thạch Lựu Mộc', 'Đại Hải Thủy'];
  var NAP_MEAN = ['vàng trong biển', 'lửa trong lò', 'gỗ rừng lớn', 'đất ven đường', 'vàng mũi kiếm', 'lửa trên núi',
    'nước dưới khe', 'đất trên thành', 'vàng chân đèn', 'gỗ cây dương liễu', 'nước trong suối', 'đất trên mái nhà',
    'lửa sấm sét', 'gỗ cây tùng bách', 'nước chảy dài', 'vàng trong cát', 'lửa dưới chân núi', 'gỗ cây đồng bằng',
    'đất trên vách', 'vàng pha bạch kim', 'lửa ngọn đèn', 'nước trên trời', 'đất đầm lớn', 'vàng trang sức',
    'gỗ cây dâu', 'nước khe lớn', 'đất pha cát', 'lửa trên trời', 'gỗ cây thạch lựu', 'nước biển lớn'];
  var NAP_MEAN_EN = ['gold in the sea', 'fire in the furnace', 'wood of the great forest', 'earth by the road',
    'gold of the sword tip', 'fire on the mountain', 'water in the brook', 'earth of the city wall', 'gold of the candle',
    'willow wood', 'water in the spring', 'earth on the roof', 'thunderbolt fire', 'pine and cypress wood',
    'long flowing water', 'gold in the sand', 'fire at the foot of the mountain', 'wood of the plains', 'earth on the wall',
    'white gold', 'lamp fire', 'water from the sky', 'earth of the great marsh', 'gold of jewellery', 'mulberry wood',
    'water of the great stream', 'sandy earth', 'fire in the sky', 'pomegranate wood', 'water of the great sea'];
  var CON = ['Chuột', 'Trâu', 'Hổ', 'Mèo', 'Rồng', 'Rắn', 'Ngựa', 'Dê', 'Khỉ', 'Gà', 'Chó', 'Heo'];
  var CON_EN = ['Rat', 'Ox', 'Tiger', 'Cat', 'Dragon', 'Snake', 'Horse', 'Goat', 'Monkey', 'Rooster', 'Dog', 'Pig'];
  /* everything about a (lunar) birth year: i = place in the 60-year cycle (0 = Giáp Tý) */
  function tuoiOf(y) {
    var i = (((y - 4) % 60) + 60) % 60, p = INT(i / 2), c = (((y + 8) % 12) + 12) % 12;
    return { i: i, canChi: canChi(y), con: CON[c], conEn: CON_EN[c], nap: NAP_NAME[p], mean: NAP_MEAN[p], meanEn: NAP_MEAN_EN[p], elem: NAP[p] };
  }
  /* the same, from the place in the cycle (for the 60 recorded lines) */
  function tuoiAt(i) { return tuoiOf(1984 + i); }

  FT.Lunar = { solar2lunar: solar2lunar, canChi: canChi, menhOf: menhOf, tuoiOf: tuoiOf, tuoiAt: tuoiAt };
})(typeof window !== 'undefined' ? window : globalThis);
