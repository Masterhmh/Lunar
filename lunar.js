// api/lunar.js — Vercel Serverless Function
// Trả về ngày âm lịch hôm nay dạng JSON cho Widgy

function INT(n) { return Math.floor(n); }

function jd(dd, mm, yy) {
  let a = INT((14 - mm) / 12);
  let y = yy + 4800 - a;
  let m = mm + 12 * a - 3;
  let j = dd + INT((153 * m + 2) / 5) + 365 * y + INT(y / 4) - INT(y / 100) + INT(y / 400) - 32045;
  return j < 2299161
    ? dd + INT((153 * m + 2) / 5) + 365 * y + INT(y / 4) - 32083
    : j;
}

function newMoon(k, tz) {
  const dr = Math.PI / 180;
  let T = k / 1236.85, T2 = T * T, T3 = T2 * T;
  let Jd1 = 2415020.75933 + 29.53058868 * k + 0.0001178 * T2 - 0.000000155 * T3;
  Jd1 += 0.00033 * Math.sin((166.56 + 132.87 * T - 0.009173 * T2) * dr);
  let M = 357.52910 + 29.10535608 * k - 0.0000333 * T2 - 0.00000347 * T3;
  let Mpr = 306.0253 + 385.81691806 * k + 0.0107306 * T2 + 0.00001236 * T3;
  let F = 21.2964 + 390.67050646 * k - 0.0016528 * T2 - 0.00000239 * T3;
  let C = (0.1734 - 0.000393 * T) * Math.sin(M * dr) + 0.0021 * Math.sin(2 * dr * M)
    - 0.4068 * Math.sin(Mpr * dr) + 0.0161 * Math.sin(2 * dr * Mpr)
    - 0.0004 * Math.sin(3 * dr * Mpr) + 0.0104 * Math.sin(2 * dr * F)
    - 0.0051 * Math.sin(dr * (M + Mpr)) - 0.0074 * Math.sin(dr * (M - Mpr))
    + 0.0004 * Math.sin(dr * (2 * F + M)) - 0.0004 * Math.sin(dr * (2 * F - M))
    - 0.0006 * Math.sin(dr * (2 * F + Mpr)) + 0.001 * Math.sin(dr * (2 * F - Mpr))
    + 0.0005 * Math.sin(dr * (M + 2 * Mpr));
  let dt = T < -11
    ? 0.001 + 0.000839 * T + 0.0002261 * T2 - 0.00000845 * T3 - 0.000000081 * T * T3
    : -0.000278 + 0.000265 * T + 0.000262 * T2;
  return INT(Jd1 + C - dt + 0.5 + tz / 24);
}

function sunLon(jdn, tz) {
  const dr = Math.PI / 180;
  let T = (jdn - 2451545.5 - tz / 24) / 36525, T2 = T * T;
  let M = 357.52910 + 35999.05030 * T - 0.0001559 * T2 - 0.00000048 * T * T2;
  let L0 = 280.46645 + 36000.76983 * T + 0.0003032 * T2;
  let DL = (1.9146 - 0.004817 * T - 0.000014 * T2) * Math.sin(dr * M)
    + (0.019993 - 0.000101 * T) * Math.sin(2 * dr * M)
    + 0.00029 * Math.sin(3 * dr * M);
  let L = (L0 + DL) * dr;
  L -= Math.PI * 2 * INT(L / (Math.PI * 2));
  return INT(L / Math.PI * 6);
}

function getLM11(yy, tz) {
  let off = jd(31, 12, yy) - 2415021;
  let k = INT(off / 29.530588853);
  let nm = newMoon(k, tz);
  return sunLon(nm, tz) >= 9 ? newMoon(k - 1, tz) : nm;
}

function leapOff(a11, tz) {
  let k = INT((a11 - 2415021.076998695) / 29.530588853 + 0.5);
  let i = 1, arc = sunLon(newMoon(k + i, tz), tz), last;
  do { last = arc; i++; arc = sunLon(newMoon(k + i, tz), tz); }
  while (arc !== last && i < 14);
  return i - 1;
}

function toLunar(dd, mm, yy, tz) {
  let dn = jd(dd, mm, yy);
  let k = INT((dn - 2415021.076998695) / 29.530588853);
  let ms = newMoon(k + 1, tz);
  if (ms > dn) ms = newMoon(k, tz);
  let a11 = getLM11(yy, tz), b11 = a11, lunarY = yy;
  if (a11 >= ms) { lunarY = yy; a11 = getLM11(yy - 1, tz); }
  else { lunarY = yy + 1; b11 = getLM11(yy + 1, tz); }
  let ld = dn - ms + 1, diff = INT((ms - a11) / 29), leap = 0, lm = diff + 11;
  if (b11 - a11 > 365) {
    let lo = leapOff(a11, tz);
    if (diff >= lo) { lm = diff + 10; if (diff === lo) leap = 1; }
  }
  if (lm > 12) lm -= 12;
  if (lm >= 11 && diff < 4) lunarY = yy - 1;
  return [ld, lm, lunarY, leap];
}

export default function handler(req, res) {
  // Múi giờ Việt Nam UTC+7
  const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" }));
  const dd = now.getDate(), mm = now.getMonth() + 1, yy = now.getFullYear();

  const CAN = ["Giáp","Ất","Bính","Đinh","Mậu","Kỷ","Canh","Tân","Nhâm","Quý"];
  const CHI = ["Tý","Sửu","Dần","Mão","Thìn","Tỵ","Ngọ","Mùi","Thân","Dậu","Tuất","Hợi"];
  const ANIMAL = ["🐀","🐂","🐯","🐰","🐲","🐍","🐴","🐑","🐒","🐓","🐕","🐖"];
  const THUNHAT = ["Chủ Nhật","Thứ Hai","Thứ Ba","Thứ Tư","Thứ Năm","Thứ Sáu","Thứ Bảy"];
  const NGAY_TEN = ["","Mồng 1","Mồng 2","Mồng 3","Mồng 4","Mồng 5","Mồng 6","Mồng 7","Mồng 8","Mồng 9","Mồng 10",
    "11","12","13","14","Rằm","16","17","18","19","20","21","22","23","24","25","26","27","28","29","30"];

  const [ld, lm, ly, isLeap] = toLunar(dd, mm, yy, 7);
  const yearCan = CAN[(ly + 6) % 10];
  const yearChi = CHI[(ly + 8) % 12];
  const dayCan = CAN[(jd(dd, mm, yy) + 9) % 10];
  const dayChi = CHI[(jd(dd, mm, yy) + 1) % 12];
  const monthCan = CAN[((ly * 12 + lm) + 10) % 10];
  const monthChi = CHI[(lm + 0) % 12];
  const animal = ANIMAL[(ly + 8) % 12];

  const response = {
    // Các trường Widgy có thể dùng riêng lẻ
    ngay_am_lich: `${ld}/${lm}${isLeap ? " nhuận" : ""}`,
    nam_am_lich: `${yearCan} ${yearChi}`,
    ngay_can_chi: `${dayCan} ${dayChi}`,
    thang_can_chi: `${monthCan} ${monthChi}`,
    con_giap: animal,
    thu: THUNHAT[now.getDay()],
    ngay_duong: `${dd}/${mm}/${yy}`,

    // Chuỗi đầy đủ để hiển thị 1 text layer
    hien_thi_ngan: `${animal} ${NGAY_TEN[ld]} tháng ${lm}\nNăm ${yearCan} ${yearChi}`,
    hien_thi_day_du: `${THUNHAT[now.getDay()]}, ${dd}/${mm}/${yy}\n${animal} ${NGAY_TEN[ld]} tháng ${lm}${isLeap ? " (nhuận)" : ""}\nNăm ${yearCan} ${yearChi}`
  };

  res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.status(200).json(response);
}
