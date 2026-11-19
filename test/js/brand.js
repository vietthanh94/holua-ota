throw new Error("OTA rollback test: broken pack");
/* brand.js — Phước Lộc business DNA for the pet (source: docs/brand/DNA_PHUOC_LOC.md, v1.0 13/11/2026).
 * Voice rules kept here: cheerful, warm, polite; customers are "anh/chị"; 0–3 emoji; no prices, no stock,
 * no discounts; stone effects only as belief ("theo quan niệm", "tượng trưng cho"), never "giúp / mang lại /
 * thu hút"; no absolute words ("chắc chắn", "100%", "tốt nhất"); no health claims; no scare talk.
 * Logo = the Owner's original file, only cropped/resized (never redrawn or recoloured).
 * Address / hotline are "CHỜ XÁC NHẬN" in the DNA, so they are NOT shown. ES5, old-WebView safe. */
(function (root) {
  'use strict';
  var FT = root.FT = root.FT || {};
  FT.BRAND = {
    name: 'Phước Lộc',
    fullName: 'Đá Phong Thủy Phước Lộc',
    slogan: 'Nâng Tầm Đẳng Cấp',
    mascot: 'Hổ Lửa Phước Lộc',
    logo: 'assets/brand/logo-phuoc-loc.png',
    cta: 'Nhắn tin cho Phước Lộc để được tư vấn chi tiết.',
    lines: {
      IDLE: ['Chào anh/chị, Hổ Lửa Phước Lộc rất vui được đón anh/chị 🐯', 'Anh/chị chạm nhẹ vào Hổ Lửa nhé ✨', 'Phước Lộc — Nâng Tầm Đẳng Cấp'],
      TOUCH: ['Cảm ơn anh/chị đã ghé thăm Hổ Lửa ❤️', 'Gừ gừ… Hổ Lửa thích lắm 🐾', 'Hổ Lửa chào anh/chị ạ'],
      HAPPY: ['Hổ Lửa vui khi được gặp anh/chị ✨', 'Chúc anh/chị một ngày nhiều niềm vui ❤️', 'Phước Lộc cảm ơn anh/chị đã ghé'],
      FLY: ['Hổ Lửa Phước Lộc bay lên nào 🪽', 'Nâng Tầm Đẳng Cấp ✨', 'Bay một vòng chào anh/chị'],
      FIRE: ['Hít sâu… phù! 🔥', 'Ngọn lửa ấm chào anh/chị 🔥', 'Lửa nhỏ, lòng ấm 🔥'],
      SLEEP: ['Hổ Lửa nghỉ một chút, anh/chị chạm để đánh thức nhé 🌙', 'Zzz… 🌙'],
      THINKING: ['Hổ Lửa đang kiểm tra, anh/chị chờ chút nhé…', 'Để Hổ Lửa xem lại…'],
      ERROR: ['Chưa hoàn tất, anh/chị thử lại nhé.', 'Có chút trục trặc, anh/chị báo nhân viên Phước Lộc nhé.']
    },
    /* said now and then while idle (never while a customer uses Xin quẻ): brand, stone-viewing tips
     * (colour, pattern, light — DNA: describe these instead of claiming material or origin), the testing
     * service in its only allowed wording, and gentle "sống thiện" thoughts with no selling. */
    idleTalk: [
      'Chào mừng anh/chị đến với Đá Phong Thủy Phước Lộc 🐯',
      'Phước Lộc — Nâng Tầm Đẳng Cấp',
      'Mỗi viên đá có màu, vân và ánh sáng riêng ✨',
      'Anh/chị thử xoay viên đá dưới ánh sáng để ngắm vân đá nhé.',
      'Theo quan niệm, mỗi màu đá tượng trưng cho một điều tốt lành.',
      'Anh/chị bấm 🎋 Xin quẻ để nhận lời chúc đầu ngày từ Hổ Lửa nhé.',
      'Nhắn tin cho Phước Lộc để được tư vấn chi tiết.',
      'Phước Lộc hỗ trợ kiểm định sản phẩm và cung cấp phiếu kiểm định khi khách hàng có nhu cầu.',
      'Vòng tay, trang sức đá, đá trưng bày, tượng đá… anh/chị cứ hỏi Phước Lộc nhé.',
      'Một lời cảm ơn thật lòng cũng làm ngày thêm ấm áp.',
      'Giữ chữ tín trong việc nhỏ cũng là cách vun đắp niềm tin trong việc lớn.'
    ]
  };
})(window);
