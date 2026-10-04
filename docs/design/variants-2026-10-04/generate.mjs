import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(HERE, "index.dev.html");
const P = "../../../public/img/";
const I = {
  phone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/>',
  pin: '<path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.800 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  arrow: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
  chat: '<path d="M4 5h16v11H9l-5 4z"/>',
  insta: '<rect x="4" y="4" width="16" height="16" rx="5"/><circle cx="12" cy="12" r="3.6"/><circle cx="16.8" cy="7.2" r=".6"/>',
  check: '<path d="M5 12.500l4.500 4.500L19 7.500"/>',
  shield: '<path d="M12 3l8 3v6c0 4.500-3.300 7.800-8 9-4.700-1.200-8-4.500-8-9V6z"/><path d="M8.500 12l2.500 2.500 4.500-5"/>',
  award: '<circle cx="12" cy="9" r="5.500"/><path d="M8.500 13.500L7 21l5-3 5 3-1.500-7.500"/>',
  doc: '<path d="M7 3h7l4 4v14H7z"/><path d="M14 3v4h4M10 12h5M10 16h5"/>',
  heart: '<path d="M12 20s-7-4.400-7-10a4 4 0 0 1 7-2.500A4 4 0 0 1 19 10c0 5.600-7 10-7 10z"/>',
  menu: '<path d="M4 8h16M4 16h16"/>',
  star: '<path d="M12 3l2.700 5.600 6.100.9-4.400 4.300 1 6.100L12 17l-5.400 2.900 1-6.100-4.400-4.300 6.100-.9z"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
  home: '<path d="M4 11l8-7 8 7v9H4z"/>',
  grid: '<rect x="4" y="4" width="7" height="7" rx="1.500"/><rect x="13" y="4" width="7" height="7" rx="1.500"/><rect x="4" y="13" width="7" height="7" rx="1.500"/><rect x="13" y="13" width="7" height="7" rx="1.500"/>',
  book: '<path d="M5 4h10a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z"/><path d="M8 4v13"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.500v.1"/>',
};
const ic = (n, c = "") => `<svg class="ico ${c}" viewBox="0 0 24 24" aria-hidden="true">${I[n]}</svg>`;
const logo = (lt) => `<img class="logo ${lt ? "lt" : ""}" src="${P}logo/logo-dark-full.webp" alt="دکتر فرزاد زمانی" width="140" height="44">`;
const PH = "۰۲۱۲۳۴۵۶۷۸۹";
const NAV = ["خدمات", "درباره پزشک", "نمونه‌کارها", "مقالات", "تماس با ما"];
const SV = [
  ["رینوپلاستی", "آشنایی با حوزه جراحی و فرم بینی", "rhinoplasty.png"],
  ["بلفاروپلاستی", "آشنایی با حوزه جراحی پلک", "belpharoplasty.png"],
  ["لیفت صورت", "آشنایی با حوزه جراحی صورت", "face-lift.png"],
  ["منتوپلاستی", "آشنایی با حوزه جراحی چانه", "mentoplasty.png"],
];
const GAL = [1, 2, 3, 4, 8, 12];
const gimg = (n, chip) => `<div class="gl-img">${chip ? `<span class="chip">${chip}</span>` : ""}<img src="${P}samples/${n}.jpg" alt="نمونه‌کار شماره ${n}" loading="lazy"></div>`;
const FQ = [
  ["برای شروع مشاوره چه کاری لازم است؟", "با مطب تماس بگیرید تا زمان ارزیابی هماهنگ شود. پیش از مراجعه، توضیحات کامل‌تر ارائه می‌شود."],
  ["آیا مشاوره، تعهد به عمل جراحی است؟", "خیر. جلسه ارزیابی برای شناخت وضعیت و پاسخ به پرسش‌های شماست و تصمیم نهایی با خود شماست."],
  ["پس از عمل چگونه پیگیری انجام می‌شود؟", "برنامه مراقبت و ویزیت‌های پیگیری پس از عمل در همان جلسات توضیح داده می‌شود."],
  ["نتیجه‌ی نهایی چه زمانی مشخص می‌شود؟", "روند بهبود در هر فرد متفاوت است و پزشک در مراجعه‌ی حضوری برآورد دقیق‌تر را اعلام می‌کند."],
  ["هزینه‌ها چگونه اعلام می‌شود؟", "هزینه پس از ارزیابی حضوری و مشخص‌شدن برنامه‌ی درمان اعلام می‌شود."],
  ["آیا می‌توانم با آشنایان معرفی‌شده هماهنگ کنم؟", "بله. هنگام تماس نام معرفی‌کننده را بفرمایید تا در هماهنگی‌ها لحاظ شود."],
];
const details = (arr, open = 0) => arr.map(([q, a], i) => `<details ${i === open ? "open" : ""}><summary>${q}</summary><div>${a}</div></details>`).join("");
const QT = [
  ["توضیحات پزشک شفاف بود و پیش از هر تصمیمی فرصت پرسیدن داشتم. احساس کردم کسی عجله‌ای ندارد.", "ن. ر.", "مراجع نمایشی"],
  ["پیگیری‌های بعد از عمل منظم بود و هر پرسشی را پاسخ دادند.", "م. ک.", "مراجع نمایشی"],
  ["از طریق یکی از آشنایان معرفی شدم و دقیقاً همان‌طور که شنیده بودم برخورد حرفه‌ای بود.", "س. ا.", "مراجع نمایشی"],
];
const stars = `<span class="stars">${ic("star").repeat(5)}</span>`;
const flag = '<span class="cons">' + ic("shield", "") + " با رضایت کتبی منتشر شده</span>";

/* --------- variants ---------- */
const AB = ["الف", "ب", "ج", "د", "ه"];
const groups = [];
const G = (id, title, intro, vs) => groups.push({ id, title, intro, vs });
const V = (name, why, html, bg = "") => ({ name, why, html, bg });

G("header", "سربرگ", "اولین چیزی که دیده می‌شود. همه روی پس‌زمینه‌ی نمونه نمایش داده شده‌اند تا تضاد و شناوری واضح باشد.", [
  V("قاب مرکزی", "لوگو در مرکز و منوی دو‌طرفه، تقارن رسمی و کلاسیک؛ مناسب برند پزشک‌محور.",
    `<div class="hbg"><div class="hd-a"><nav>${NAV.slice(0, 3).map(n => `<a href="#">${n}</a>`).join("")}</nav>${logo()}<nav class="l">${NAV.slice(3).map(n => `<a href="#">${n}</a>`).join("")}<a class="btn g" href="#">${ic("phone")} تماس</a></nav><button class="bg-btn" aria-label="منو">${ic("menu")}</button></div><div class="stub"><h4>نمونه‌ی محتوای زیر سربرگ</h4><p>خط طلایی نازک سربرگ را از محتوا جدا می‌کند.</p></div></div>`),
  V("کپسول شیشه‌ای شناور", "نوار گرد و شیشه‌ای روی تصویر؛ سبک و مدرن، بدون وزن بصری سنگین.",
    `<div class="hbg"><div class="hd-b"><div class="pill">${logo()}<nav>${NAV.map((n, i) => `<a href="#" class="${i === 0 ? "on" : ""}">${n}</a>`).join("")}</nav><a class="btn g" href="#">${ic("phone")} تماس با مطب</a><button class="bg-btn" aria-label="منو">${ic("menu")}</button></div></div><div class="stub"><h4>نوار روی محتوا شناور است</h4><p>با اسکرول فشرده می‌شود.</p></div></div>`),
  V("دو‌طبقه‌ی لوکس", "نوار باریک اطلاعات (تلفن، ساعت، شبکه‌ها) بالای نوار اصلی عاجی؛ اعتماد از همان نگاه اول.",
    `<div class="hd-c"><div class="util"><span>${ic("phone")} ۰۸۶-۳۳۱۴۶۱۷۹</span><span>${ic("clock")} روزهای کاری، با هماهنگی قبلی</span><span class="sp"></span><span>${ic("insta")} اینستاگرام</span><span>${ic("chat")} ایتا</span></div><div class="main">${logo(1)}<nav>${NAV.map(n => `<a href="#">${n}</a>`).join("")}</nav><a class="btn n" href="#">تماس با مطب</a><button class="bg-btn" aria-label="منو" style="color:var(--n7)">${ic("menu")}</button></div></div><div class="hbg" style="min-height:90px"></div>`),
  V("مینیمال با منوی تمام‌صفحه", "در حالت بسته فقط لوگو و «منو»؛ حالت باز (پایین) لیست بزرگ شماره‌دار با شماره تماس.",
    `<div class="hbg hd-d"><div class="bar">${logo()}<div class="r"><a class="btn o" href="#">${ic("phone")}</a><span class="menu-pill"><i><b></b><b></b></i> منو</span></div></div></div><p class="ovl-tag">▼ حالت باز منو</p><div class="ovl"><div>${NAV.map((n, i) => `<a class="big" href="#"><small>۰${i + 1}</small>${n}</a>`).join("")}</div><div class="side"><span>تماس با مطب</span><strong>۰۸۶-۳۳۱۴۶۱۷۹</strong><span>اراک · روزهای کاری، با هماهنگی قبلی</span></div></div>`),
  V("ریل عمودی", "ستون باریک طلایی در کنار صفحه؛ هویت متفاوت و حرفه‌ای. در موبایل به نوار بالا تبدیل می‌شود.",
    `<div class="hd-e"><div class="rail"><button class="bg-btn" style="display:grid" aria-label="منو">${ic("menu")}</button><i class="ln"></i><span class="vt">دکتر فرزاد زمانی</span><i class="ln"></i>${ic("phone")}</div><div class="body"><div class="stub" style="padding:44px 8%;max-width:520px"><h4 style="font-family:Lalezar;font-weight:400;font-size:30px;color:#fff;line-height:1.6;margin:0">محتوا کنار ریل شروع می‌شود</h4><p style="font-size:12px;color:#aebfd4">منو با لمس ریل باز می‌شود.</p></div></div></div>`),
]);

const heroText = (h, p) => `<p class="eyebrow">متخصص گوش، حلق و بینی · اراک</p><h1>${h}</h1><p>${p}</p>`;
G("hero", "هیرو (صفحه‌ی اول)", "رزرو آنلاین فعلاً خاموش است؛ پس دکمه‌ی اصلی «تماس» است و همه‌ی طرح‌ها برای روشن‌شدن رزرو آماده‌اند.", [
  V("پرتره در قاب طاقی", "قاب طاقی با دو حلقه‌ی طلایی؛ چهره‌ی پزشک مرکز توجه است.",
    `<div class="hr-a nv"><div>${heroText("ظرافت در جزئیات، <em>اعتماد</em> در مسیر", "پیش از هر تصمیم، با پزشک و خدمات مطب آشنا شوید و پرسش‌هایتان را بپرسید.")}<div class="acts"><a class="btn g" href="#">${ic("phone")} تماس با مطب</a><a class="btn o" href="#">آشنایی با پزشک</a></div></div><div class="arch"><img src="${P}zamani/dr-zamani-hero.webp" alt="دکتر فرزاد زمانی" width="900" height="880"></div></div>`),
  V("سینمایی تمام‌عرض", "تصویر اتاق عمل با گرادیان سرمه‌ای؛ جدی، متخصصانه، با نوار ویژگی‌ها.",
    `<div class="hr-b nv9"><div class="in">${heroText("دقت جراح، <span class=gold>آرامش</span> مراجع", "مشاوره‌ی شفاف، رضایت آگاهانه و پیگیری پس از درمان.")}<div class="acts" style="display:flex;gap:12px;margin-top:24px;flex-wrap:wrap"><a class="btn g" href="#">${ic("phone")} تماس با مطب</a><a class="btn o" href="#">مشاهده نمونه‌کارها</a></div><div class="row"><span><b class="ph">۰۰+</b> سال تجربه</span><span><b>اراک</b> مطب</span><span><b>ENT</b> متخصص گوش و حلق و بینی</span></div></div></div>`),
  V("دو پنل عاجی و سرمه‌ای", "نیمه‌ی روشن برای متن، نیمه‌ی تیره برای پرتره؛ خوانایی بالا و حس مجله‌ای.",
    `<div class="hr-c"><div class="tx">${heroText("زیبایی، حاصل <span class=gd>دقت</span> است", "متخصص گوش، حلق و بینی؛ آشنایی با خدمات، نمونه‌کارها و مسیر مراجعه.").replace('class="eyebrow"', 'class="eyebrow dk"')}<div class="acts"><a class="btn n" href="#">${ic("phone")} تماس با مطب</a><a class="btn od" href="#">درباره پزشک</a></div></div><div class="pn"><img class="shoar" src="${P}zamani/shoar.png" alt="" width="450" height="123"><img src="${P}zamani/dr-zamani-hero.webp" alt="دکتر فرزاد زمانی" width="900" height="880"></div></div>`),
  V("تایپوگرافی‌محور", "شعار با فونت دکوراتیو طلایی و پرتره‌ی گرد؛ خیلی لوکس، بدون عکس بزرگ.",
    `<div class="hr-d"><div class="ring"><div><img src="${P}zamani/dr-zamani-hero.webp" alt="" width="900" height="880"></div></div><p class="eyebrow" style="justify-content:center">دکتر فرزاد زمانی</p><h1>زیبایی، حاصل دقت است</h1><div class="orn gold"><i></i>${ic("star")}<i></i></div><p>متخصص گوش، حلق و بینی · اراک</p><div class="acts"><a class="btn g" href="#">${ic("phone")} تماس با مطب</a><a class="btn o" href="#">مشاهده خدمات</a></div></div>`),
  V("کارت مشاوره شناور", "برای وضعیتی که رزرو آنلاین نیست: سه راه تماس واضح، در یک کارت شیشه‌ای.",
    `<div class="hr-e nv"><div>${heroText("مشاوره‌ای که با <span class=gold>گفت‌وگو</span> شروع می‌شود", "با مطب هماهنگ کنید تا جلسه‌ی ارزیابی تنظیم شود.")}</div><div class="stack"><img src="${P}zamani/dr-zamani-hero.webp" alt="" width="900" height="880"><div class="cons-card"><h4>شروع مشاوره</h4><a href="#">${ic("phone")}<span>تلفن مطب<small>۰۸۶-۳۳۱۴۶۱۷۹</small></span><b>${ic("arrow")}</b></a><a href="#">${ic("phone")}<span>خط مشاوره<small>۰۹۲۱-۷۳۵۷۷۲۸</small></span><b>${ic("arrow")}</b></a><a href="#">${ic("chat")}<span>ایتا<small>@drfarzadzamani</small></span><b>${ic("arrow")}</b></a><div class="st">رزرو آنلاین به‌زودی فعال می‌شود</div></div></div></div>`),
]);

G("trust", "نوار اعتماد", "اعداد و عنوان‌ها نمایشی‌اند (خط‌چین) و باید با اطلاعات تأییدشده‌ی پزشک جایگزین شوند. هیچ ادعایی بدون تأیید نباید منتشر شود.", [
  V("چهار عدد", "اعداد درشت با خط‌های طلایی؛ سریع‌ترین راه گفتن سابقه.",
    `<div class="tr-a pp"><div><b class="ph">۱۵+</b><span>سال تجربه</span></div><div><b class="ph">۰۰۰۰+</b><span>مراجع</span></div><div><b class="ph">۰۰۰۰</b><span>شماره نظام پزشکی</span></div><div><b>اراک</b><span>مطب</span></div></div>`),
  V("روبان مدارک", "نوار سرمه‌ای با نشان‌های مدارک؛ رسمی و آرام.",
    `<div class="tr-b nv9"><div><span class="mk">${ic("award")}</span><span><b>متخصص گوش، حلق و بینی</b>عضو هیئت‌علمی/دوره‌ها (تأیید پزشک)</span></div><div><span class="mk">${ic("shield")}</span><span><b>پروانه‌ی مطب</b>شماره نظام پزشکی <span class="ph">۰۰۰۰۰</span></span></div><div><span class="mk">${ic("doc")}</span><span><b>مقالات بازبینی‌شده</b>با منبع و بازبین پزشکی</span></div></div>`),
  V("معرفی آشنایان", "برای مطبی که مراجعانش با معرفی می‌آیند: اعتماد اجتماعی، نه آمار.",
    `<div class="tr-c iv"><div class="avs"><span class="av">ن</span><span class="av">م</span><span class="av">س</span><span class="av">ر</span><span class="av">+</span></div><p>بیشتر مراجعین ما با معرفی آشنایان می‌آیند.<small>(متن نمایشی؛ فقط در صورت تأیید مالک)</small></p></div>`),
  V("مسیر حرفه‌ای", "خط زمانی چهارمرحله‌ای تحصیل تا فعالیت؛ مناسب پزشکی که سابقه‌ی پررنگ دارد.",
    `<div class="tr-d pp"><div class="tl"><div><b>پزشکی عمومی</b><span class="ph">دانشگاه · ۰۰۰۰</span></div><div><b>تخصص گوش، حلق و بینی</b><span class="ph">دانشگاه · ۰۰۰۰</span></div><div><b>دوره‌های تکمیلی</b><span class="ph">رینوپلاستی و جراحی صورت</span></div><div><b>فعالیت در اراک</b><span class="ph">از ۰۰۰۰</span></div></div></div>`),
  V("سه تعهد", "به‌جای عدد، سه قول رفتاری: شفافیت، رضایت آگاهانه، پیگیری.",
    `<div class="tr-e pp"><div><span class="mk">${ic("info")}</span><b>مشاوره‌ی شفاف</b><span>پیش از هر تصمیم، همه‌ی گزینه‌ها توضیح داده می‌شود.</span></div><div><span class="mk">${ic("check")}</span><b>رضایت آگاهانه</b><span>فرم و توضیحات پیش از هر اقدام.</span></div><div><span class="mk">${ic("heart")}</span><b>پیگیری پس از درمان</b><span>ویزیت‌های کنترل و پاسخ‌گویی.</span></div></div>`),
]);

G("services", "خدمات", "از آیکون‌های خطی طلایی موجود پروژه استفاده شده است. متن خدمات نمایشی است و متن واقعی باید پزشک تأیید کند.", [
  V("کارت‌های سرمه‌ای", "چهار کارت یکدست با مرز طلایی؛ ساده و قابل‌فهم.",
    `<div class="sv-a nv"><div class="sh"><p class="eyebrow">خدمات تخصصی</p><h3>با حوزه‌های تخصصی آشنا شوید</h3></div><div class="gr">${SV.map((s, i) => `<div class="cd ${i === 0 ? "on" : ""}"><img src="${P}services/${s[2]}" alt="" width="96" height="96"><h4>${s[0]}</h4><p>${s[1]}</p><span>آشنایی با خدمت ←</span></div>`).join("")}</div></div>`),
  V("کاوشگر تعاملی", "فهرست در یک طرف و قاب بزرگ طاقی در طرف دیگر؛ انتخاب خدمت، تصویر را عوض می‌کند.",
    `<div class="sv-b pp"><div>${SV.map((s, i) => `<div class="row ${i === 0 ? "on" : ""}"><b>۰${i + 1}</b><strong>${s[0]}</strong><span class="mk">${ic("arrow")}</span></div>${i === 0 ? `<p class="dt">${s[1]}؛ برای ارزیابی و پاسخ به پرسش‌ها با مطب هماهنگ کنید.</p>` : ""}`).join("")}</div><div class="big"><img src="${P}services/${SV[0][2]}" alt=""></div></div>`),
  V("پنل‌های بازشونده", "چهار نوار عمودی که یکی‌شان باز است؛ بسیار ویترینی و لوکس.",
    `<div class="sv-c nv9">${SV.map((s, i) => `<div class="pn ${i === 0 ? "on" : ""}"><b>۰${i + 1}</b><img src="${P}services/${s[2]}" alt=""><div><h4>${s[0]}</h4><p>${s[1]}؛ توضیح کوتاه خدمت در حالت باز.</p><a class="btn g go" href="#">آشنایی ←</a></div></div>`).join("")}</div>`),
  V("شبکه‌ی بنتو", "رینوپلاستی به‌عنوان خدمت شاخص بزرگ‌تر؛ بقیه کوچک‌تر در کنارش.",
    `<div class="sv-d pp"><div class="sh"><p class="eyebrow dk">خدمات</p><h3>خدمات مطب</h3></div><div class="bn"><div class="f"><img src="${P}services/${SV[0][2]}" alt=""><h4>${SV[0][0]}</h4><p>${SV[0][1]}</p></div>${SV.slice(1).map((s, i) => `<div class="${i === 1 ? "w" : ""}"><img src="${P}services/${s[2]}" alt=""><h4>${s[0]}</h4><p>${s[1]}</p></div>`).join("")}<div style="background:var(--g2);color:var(--n7);border:0"><h4>مشاوره</h4><p>برای هماهنگی تماس بگیرید</p></div></div></div>`),
  V("فهرست خطی", "هر خدمت یک ردیف با حرکت هاور؛ حداقل‌گرا و فوق‌العاده خوانا.",
    `<div class="sv-e pp"><div class="sh"><p class="eyebrow dk">خدمات</p><h3>همه‌ی خدمات یک‌جا</h3></div>${SV.map((s, i) => `<a href="#"><b>۰${i + 1}</b><strong>${s[0]}</strong><span class="dsc">${s[1]}</span><span class="mk">${ic("arrow")}</span></a>`).join("")}</div>`),
]);

const bio = "متخصص گوش، حلق و بینی با تمرکز بر ارزیابی دقیق، توضیح شفاف و پیگیری پس از درمان. (متن نمایشی؛ زندگی‌نامه‌ی واقعی را پزشک تأیید کند.)";
G("about", "درباره‌ی پزشک", "از دو عکس موجود (پرتره و اتاق عمل) استفاده شده؛ چون کلینیک عکس واقعی ندارد، گرمی با متن و تایپوگرافی ساخته می‌شود.", [
  V("پرتره و مشخصات", "کلاسیک: عکس در قاب طلایی، متن و چهار مشخصه، امضا.",
    `<div class="ab-a pp"><div class="im"><img src="${P}zamani/dr-zamani-hero.webp" alt="دکتر فرزاد زمانی"></div><div><p class="eyebrow dk">درباره‌ی پزشک</p><h3>دکتر فرزاد زمانی</h3><p>${bio}</p><ul><li>${ic("check")} متخصص گوش، حلق و بینی</li><li>${ic("check")} شماره نظام پزشکی: <span class="ph">۰۰۰۰۰</span></li><li>${ic("check")} فعالیت در اراک</li><li>${ic("check")} مقالات آموزشی با بازبینی پزشکی</li></ul><span class="sig">دکتر فرزاد زمانی</span></div></div>`),
  V("اتاق عمل و نقل‌قول", "تصویر سینمایی کار واقعی با یک جمله‌ی فلسفه‌ی کاری روی آن.",
    `<div class="ab-b nv9"><div class="q"><p class="eyebrow">فلسفه‌ی کاری</p><blockquote>«پیش از هر برش، باید شنیدن باشد.»</blockquote><div class="facts"><span><b>متخصص</b>گوش، حلق و بینی</span><span><b>اراک</b>مطب</span><span><b class="ph">۰۰ سال</b>تجربه</span></div></div></div>`),
  V("نامه‌ی پزشک", "پیام شخصی در قالب نامه‌ی عاجی با امضا؛ گرم‌ترین طرح، مناسب مراجعان معرفی‌شده.",
    `<div class="ab-c iv"><div class="letter"><div class="face"><img src="${P}zamani/dr-zamani-hero.webp" alt=""></div><p class="eyebrow dk" style="margin-bottom:10px">سخن پزشک</p><p>مراجعه‌کننده‌ی گرامی؛ هدف من این است که پیش از هر تصمیم، تصویر روشنی از وضعیت و گزینه‌ها داشته باشید. شما را به پرسیدن و فکرکردن دعوت می‌کنم. (متن نمایشی)</p><span class="sig">دکتر فرزاد زمانی</span></div></div>`),
  V("سه ستون", "پرتره در مرکز و سه اصل کاری اطراف آن؛ بیانیه‌ی ارزش‌ها.",
    `<div class="ab-d nv"><p class="eyebrow" style="justify-content:center">رویکرد ما</p><h3 class="disp" style="font-size:34px;margin-top:6px">سه اصل، در هر مراجعه</h3><div class="pl"><div class="col"><div><b>۰۱</b><h4>دقت</h4><span>ارزیابی جزئی‌نگر پیش از تصمیم</span></div><div><b>۰۲</b><h4>صداقت</h4><span>توضیح شفاف و واقع‌بینانه</span></div></div><div class="por"><img src="${P}zamani/dr-zamani-hero.webp" alt="" style="width:130%;max-width:none;margin-inline-start:-15%"></div><div class="col"><div><b>۰۳</b><h4>پیگیری</h4><span>همراهی پس از درمان</span></div><div><b>۰۴</b><h4>احترام</h4><span>به تصمیم و زمان شما</span></div></div></div></div>`),
  V("سه پرسش از پزشک", "قالب مصاحبه با عکس چسبان؛ پاسخ‌ها اعتماد را عمیق می‌کنند.",
    `<div class="ab-e pp"><div class="im"><img src="${P}zamani/dr-zamani-hero.webp" alt="دکتر فرزاد زمانی"></div><div><p class="eyebrow dk">گفت‌وگو</p><h3 class="disp" style="font-size:34px;margin:6px 0 10px">سه پرسش از دکتر زمانی</h3><div class="qa"><h4><i>؟</i> چرا این رشته؟</h4><p>پاسخ نمایشی؛ پزشک تکمیل می‌کند.</p></div><div class="qa"><h4><i>؟</i> اولین توصیه به مراجع چیست؟</h4><p>پاسخ نمایشی؛ پزشک تکمیل می‌کند.</p></div><div class="qa"><h4><i>؟</i> پس از عمل چه انتظاری باید داشت؟</h4><p>پاسخ نمایشی؛ پزشک تکمیل می‌کند.</p></div></div></div>`),
]);

const gnote = '<div class="ft2" style="display:flex;justify-content:space-between;gap:12px;align-items:center;margin-top:16px;font-size:11px;color:#aebfd4;flex-wrap:wrap"><span>تصاویر با اصل‌شان استفاده شده‌اند؛ رضایت انتشار باید جداگانه مستند شود.</span></div>';
G("gallery", "گالری نمونه‌کار", "همان شش تصویر عمومی موجود که در پروتوتایپ قبلی هم بود، بدون دست‌کاری. هیچ تصویر تازه‌ای وارد نشده است. قبل از انتشار، رضایت مراجع و مقررات تبلیغات پزشکی باید بررسی شود.", [
  V("شبکه‌ی یکنواخت", "سه ستون هم‌اندازه با برچسب زاویه؛ منظم و قابل‌پیش‌بینی.",
    `<div class="gl-a nv"><div class="sh"><p class="eyebrow">نمونه‌کارها</p><h3>نتایج، با رضایت مراجعان</h3></div><div class="g">${GAL.map((n, i) => gimg(n, ["نیم‌رخ", "روبه‌رو", "نیم‌رخ", "زیر بینی", "روبه‌رو", "نیم‌رخ"][i])).join("")}</div>${gnote}</div>`),
  V("آجری (Masonry)", "ارتفاع طبیعی هر عکس حفظ می‌شود؛ بدون برش و ظاهری مجله‌ای.",
    `<div class="gl-b pp"><div class="sh"><p class="eyebrow dk">نمونه‌کارها</p><h3>مرور آزاد</h3></div><div class="m">${GAL.map(n => gimg(n)).join("")}</div></div>`),
  V("نمای بزرگ و بندانگشتی", "یک عکس بزرگ با قبلی/بعدی و ردیف بندانگشتی؛ تمرکز روی هر نمونه.",
    `<div class="gl-c nv9"><div class="sh"><p class="eyebrow">نمونه‌کارها</p><h3>یک نمونه در هر لحظه</h3></div><div class="ft"><div class="gl-img big"><img src="${P}samples/${GAL[0]}.jpg" alt="" loading="lazy"></div><div class="th">${GAL.map((n, i) => `<div class="gl-img ${i === 0 ? "on" : ""}"><img src="${P}samples/${n}.jpg" alt="" loading="lazy"></div>`).join("")}</div><div class="cap"><span>نمونه ۱ از ۶ · نیم‌رخ</span><div><button aria-label="بعدی">${ic("arrow")}</button><button aria-label="قبلی" style="transform:scaleX(-1)">${ic("arrow")}</button></div></div></div></div>`),
  V("اسلایدر کشویی", "کارت‌ها با snap؛ در موبایل بسیار طبیعی و کم‌حجم.",
    `<div class="gl-d iv"><div class="sh"><p class="eyebrow dk">نمونه‌کارها</p><h3>بکشید و ببینید</h3></div><div class="sc">${GAL.map(n => gimg(n)).join("")}</div></div>`),
  V("نوار فیلم با فیلتر", "فیلتر زاویه و نوار افقی پیوسته؛ همراه نشان رضایت.",
    `<div class="gl-e nv9"><div class="sh" style="padding:0 6%"><p class="eyebrow">نمونه‌کارها</p><h3>بر اساس زاویه</h3></div><div class="tabs"><span class="on">همه</span><span>روبه‌رو</span><span>نیم‌رخ</span><span>زیر بینی</span></div><div class="fs">${GAL.map(n => gimg(n)).join("")}</div><div class="ft2">${flag}<span>هر تصویر با رضایت ثبت‌شده منتشر می‌شود.</span></div></div>`),
]);

G("testimonials", "نظرات مراجعین", "همه‌ی متن‌ها نمایشی‌اند. سیستم نظرات پروژه فقط با «رضایت مستند + بازبینی حریم خصوصی» انتشار می‌دهد و همین نشان رضایت در طرح‌ها آمده است.", [
  V("نقل‌قول بزرگ", "یک نظر در هر لحظه، با فلش و نقطه‌ها؛ تأثیر عاطفی بالا.",
    `<div class="ts-a pp"><span class="qm">”</span><blockquote>${QT[0][0]}</blockquote><div class="by"><span class="av" style="border-color:#fff">${QT[0][1][0]}</span><span>${QT[0][1]} · ${QT[0][2]}</span>${flag}</div><div class="nav"><button aria-label="قبلی">${ic("arrow")}</button><div class="dots"><i class="on"></i><i></i><i></i></div><button aria-label="بعدی" style="transform:scaleX(-1)">${ic("arrow")}</button></div></div>`),
  V("سه کارت", "ستاره، متن، نام و نشان رضایت؛ استاندارد و آشنا.",
    `<div class="ts-b iv"><div class="sh c"><p class="eyebrow dk">نظرات مراجعین</p><h3>تجربه‌ی کسانی که آمده‌اند</h3></div><div class="cs">${QT.map(q => `<div class="c">${stars}<p>${q[0]}</p><div class="by"><span class="av" style="border-color:#fff">${q[1][0]}</span><span>${q[1]}<br><small style="color:var(--mute)">${q[2]}</small></span></div></div>`).join("")}</div></div>`),
  V("دیوار نظرات", "کارت‌های با اندازه‌های متفاوت؛ حس صدای جمعی.",
    `<div class="ts-c pp"><div class="w"><div class="s4 d"><p>${QT[0][0]}</p><b>${QT[0][1]}</b></div><div class="s2"><p>${QT[1][0]}</p><b>${QT[1][1]}</b></div><div class="s2"><p>${QT[2][0]}</p><b>${QT[2][1]}</b></div><div class="s3"><p>برخورد محترمانه و بدون عجله.</p><b>ر. ح.</b></div><div class="s3"><p>پاسخ‌گویی پس از عمل عالی بود.</p><b>ف. ن.</b></div><div class="s3"><p>پیش از مراجعه همه چیز توضیح داده شد.</p><b>پ. ع.</b></div></div></div>`),
  V("نوار تیره با نقل‌قول", "نقل‌قول سینمایی روی زمینه‌ی تیره و فهرست روایت‌کنندگان.",
    `<div class="ts-d"><span class="big">”</span><blockquote>${QT[2][0]}</blockquote><div class="ps"><div class="on"><span class="av">س</span>س. ا.</div><div><span class="av">ن</span>ن. ر.</div><div><span class="av">م</span>م. ک.</div></div><div style="margin-top:18px">${flag}</div></div>`),
  V("روایت سه‌مرحله‌ای", "تجربه در سه لحظه: پیش از مراجعه، روز مشاوره، پس از درمان.",
    `<div class="ts-e pp"><div class="sh c"><p class="eyebrow dk">روایت مراجعه</p><h3>از اولین تماس تا پیگیری</h3></div><div class="jr"><div><small>پیش از مراجعه</small><p>پاسخ تلفنی روشن بود و راهنمایی شدم.</p><div class="nm"><span class="av" style="border-color:#fff">ن</span>ن. ر.</div></div><div><small>روز مشاوره</small><p>فرصت پرسیدن داشتم و عجله‌ای نبود.</p><div class="nm"><span class="av" style="border-color:#fff">ن</span>ن. ر.</div></div><div><small>پس از درمان</small><p>ویزیت‌های کنترل منظم و دقیق بود.</p><div class="nm"><span class="av" style="border-color:#fff">ن</span>ن. ر.</div></div></div></div>`),
]);

const cv = (alt = "") => `<div class="cover"><img src="${P}blog/article-header-surgeon.webp" alt="${alt}" loading="lazy"></div>`;
const ART = ["مراقبت‌های پس از رینوپلاستی", "چه زمانی باید به متخصص گوش، حلق و بینی مراجعه کرد؟", "پرسش‌های رایج پیش از مشاوره", "آشنایی با روند بهبود"];
G("articles", "مقالات", "تصویر شاخص موجود در پروژه استفاده شده؛ عنوان‌ها نمایشی‌اند. مقالات واقعی با نویسنده، بازبین و منبع از پنل منتشر می‌شوند.", [
  V("شاخص و فهرست", "مقاله‌ی ویژه‌ی بزرگ و سه عنوان کنارش؛ مجله‌ای و مرتب.",
    `<div class="ar-a pp"><div class="sh"><p class="eyebrow dk">دانستنی‌ها</p><h3>مقالات آموزشی</h3></div><div class="gd2"><div class="fe">${cv()}<span class="cat" style="display:block;margin-top:12px">رینوپلاستی</span><h4>${ART[0]}</h4><p>خلاصه‌ی کوتاه مقاله برای جلب توجه.</p></div><div class="ls">${ART.slice(1).map((t, i) => `<a href="#"><span class="cat">مقاله</span><h4>${t}</h4><span class="meta">${[5, 4, 6][i]} دقیقه مطالعه</span></a>`).join("")}</div></div></div>`),
  V("سه کارت", "ساده‌ترین الگو؛ تصویر، دسته، عنوان.",
    `<div class="ar-b iv"><div class="sh c"><p class="eyebrow dk">دانستنی‌ها</p><h3>آخرین مقالات</h3></div><div class="cs">${ART.slice(0, 3).map((t, i) => `<div class="c">${cv()}<div><span class="cat">${["رینوپلاستی", "گوش، حلق و بینی", "مشاوره"][i]}</span><h4>${t}</h4><span class="meta">${[5, 4, 6][i]} دقیقه مطالعه</span></div></div>`).join("")}</div></div>`),
  V("فهرست سرمقاله‌ای", "تاریخ بزرگ و خط‌به‌خط؛ شبیه نشریه‌ی علمی و بسیار خوانا.",
    `<div class="ar-c nv9"><div>${cv()}</div><div>${ART.map((t, i) => `<a href="#"><b>${["۱۵","۰۸","۲۲","۰۳"][i]}<small>مهر ۱۴۰۵</small></b><h4>${t}</h4><span class="meta" style="color:#a9bbd1">${[5, 4, 6, 3][i]} دقیقه</span></a>`).join("")}</div></div>`),
  V("کارت‌های کشویی", "اسلایدر افقی برای موبایل؛ جمع‌وجور.",
    `<div class="ar-d pp"><div class="sh"><p class="eyebrow dk">دانستنی‌ها</p><h3>مقالات</h3></div><div class="sc">${ART.map((t, i) => `<div class="c">${cv()}<span class="cat" style="display:block;margin-top:8px">مقاله</span><h4>${t}</h4><span class="meta">${[5, 4, 6, 3][i]} دقیقه</span></div>`).join("")}</div></div>`),
  V("موزاییک تصویری", "کاشی‌های تیره با عنوان روی تصویر؛ بصری‌ترین حالت.",
    `<div class="ar-e nv9"><div class="sh"><p class="eyebrow">دانستنی‌ها</p><h3>مقالات و راهنماها</h3></div><div class="mo">${ART.map((t, i) => `<div class="t"><img src="${P}blog/article-header-surgeon.webp" alt="" style="object-position:${[30, 60, 80, 45][i]}% center"><div><span class="cat">${["رینوپلاستی", "راهنما", "مشاوره", "بهبود"][i]}</span><h4>${t}</h4></div></div>`).join("")}</div></div>`),
]);

G("faq", "پرسش‌های متداول", "پاسخ‌ها نمایشی‌اند و در حد راهنمایی کلی نوشته شده‌اند؛ متن نهایی را پزشک تأیید کند.", [
  V("آکاردئون ساده", "یک ستون، تمیز و کاملاً خوانا.", `<div class="fq-a pp"><div class="sh"><p class="eyebrow dk">پرسش‌ها</p><h3>پیش از مراجعه بدانید</h3></div>${details(FQ.slice(0, 5))}</div>`),
  V("دو ستونه با دسته", "دو دسته‌ی پرسش کنار هم؛ مناسب سؤال‌های زیاد.", `<div class="fq-b iv"><div class="sh c"><p class="eyebrow dk">پرسش‌ها</p><h3>پاسخ پرسش‌های رایج</h3></div><div class="cl"><div><h5>پیش از مراجعه</h5>${details(FQ.slice(0, 3))}</div><div><h5>پس از مراجعه</h5>${details(FQ.slice(3), -1)}</div></div></div>`),
  V("تب‌های موضوعی", "با برچسب موضوع، نمایش یک گروه؛ فضای کمتر در صفحه.", `<div class="fq-c pp"><div class="sh"><p class="eyebrow dk">پرسش‌ها</p><h3>موضوع را انتخاب کنید</h3></div><div class="tb"><span class="on">مشاوره</span><span>هزینه</span><span>پس از عمل</span><span>نوبت‌دهی</span></div><div class="pn">${details(FQ.slice(0, 3))}</div></div>`),
  V("کارت‌های شماره‌دار", "چهار کارت باز؛ بدون کلیک، همه‌چیز دیده می‌شود.", `<div class="fq-d nv"><div class="sh"><p class="eyebrow">پرسش‌ها</p><h3>چهار نکته‌ی مهم</h3></div><div class="cs">${FQ.slice(0, 4).map((f, i) => `<div class="c"><b>۰${i + 1}</b><h4>${f[0]}</h4><p>${f[1]}</p></div>`).join("")}</div></div>`),
  V("متن چسبان و آکاردئون", "ستون راست ثابت با دعوت به تماس؛ برای پرسش بی‌پاسخ یک راه ارتباط.", `<div class="fq-e pp"><div class="l"><p class="eyebrow dk">پرسش‌ها</p><h3>پاسخ پرسش‌هایتان</h3><p>اگر پرسشتان اینجا نبود، با مطب تماس بگیرید.</p><a class="btn n" href="#">${ic("phone")} تماس با مطب</a></div><div>${details(FQ)}</div></div>`),
]);

const mapSvg = `<svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><rect width="400" height="300" fill="#17304b"/><g stroke="#2a4a6c" stroke-width="10" fill="none"><path d="M-10 90 L410 130"/><path d="M60 -10 L130 310"/><path d="M-10 220 L410 190"/><path d="M270 -10 L300 310"/></g><g stroke="#e5bc7455" stroke-width="3" fill="none"><path d="M-10 150 Q200 80 410 170"/></g><g stroke="#223f5f" stroke-width="2"><path d="M0 40h400M0 180h400M0 260h400M200 0v300M340 0v300"/></g><circle cx="200" cy="135" r="62" fill="#e5bc7410" stroke="#e5bc7433"/></svg>`;
G("contact", "تماس و دعوت به اقدام", "رزرو آنلاین خاموش است؛ این بخش‌ها برای «تماس» طراحی شده‌اند و با روشن‌شدن رزرو یک دکمه اضافه می‌شود. شماره‌ها همان داده‌ی موجود پروژه‌اند.", [
  V("بیانیه‌ی بزرگ", "عنوان غول‌پیکر با شماره‌ی طلایی؛ بی‌واسطه و پرقدرت.", `<div class="ct-a nv"><h3>با ما در <span class="gold">تماس</span> باشید</h3><div class="ph2"><span class="gold">${ic("phone")}</span><strong>۰۸۶-۳۳۱۴۶۱۷۹</strong></div><div class="row"><span>${ic("pin", "")} اراک</span><span>${ic("clock", "")} روزهای کاری، با هماهنگی قبلی</span><span>${ic("mail", "")} info@drfarzadzamani.ir</span></div></div>`),
  V("سه کارت اطلاعات", "نشانی، تلفن، ساعت کار در سه کارت با آیکون؛ روشن و مرتب.", `<div class="ct-b pp"><div class="sh c"><p class="eyebrow dk">ارتباط با مطب</p><h3>چطور به ما برسید</h3></div><div class="cs"><div class="c"><span class="mk">${ic("pin")}</span><b>نشانی</b><p>اراک، (نشانی کامل از اطلاعات مطب)</p></div><div class="c"><span class="mk">${ic("phone")}</span><b>تلفن</b><p>۰۸۶-۳۳۱۴۶۱۷۹<br>۰۹۲۱-۷۳۵۷۷۲۸</p></div><div class="c"><span class="mk">${ic("clock")}</span><b>ساعت کار</b><p>روزهای کاری، با هماهنگی قبلی</p></div></div><div class="ac"><a class="btn n" href="#">${ic("phone")} تماس</a><a class="btn od" href="#">${ic("pin")} مسیریابی</a><a class="btn od" href="#">${ic("chat")} ایتا</a></div></div>`),
  V("نقشه و اطلاعات", "نیمی نقشه، نیمی اطلاعات؛ مسیریابی را آسان می‌کند.", `<div class="ct-c"><div class="mapx">${mapSvg}<div class="pin"><span>مطب دکتر زمانی</span><i></i></div></div><div class="inf"><h3>مطب، در اراک</h3><div>${ic("pin")}<span>نشانی کامل مطب</span></div><div>${ic("phone")}<span>۰۸۶-۳۳۱۴۶۱۷۹</span></div><div>${ic("clock")}<span>روزهای کاری، با هماهنگی قبلی</span></div><div style="gap:10px;flex-wrap:wrap"><a class="btn n" href="#">${ic("pin")} مسیریابی</a><a class="btn od" href="#">${ic("phone")} تماس</a></div></div></div>`),
  V("سه قدم تا مشاوره", "مسیر را شفاف می‌کند تا بیمار نگران «چطور شروع کنم» نباشد. مراحل نمایشی‌اند.", `<div class="ct-d nv9"><div class="sh c"><p class="eyebrow">مسیر مراجعه</p><h3>سه قدم تا جلسه‌ی ارزیابی</h3></div><div class="st"><div><b>تماس با مطب</b><span>پرسش‌هایتان را مطرح کنید</span></div><div><b>هماهنگی زمان</b><span>زمان مناسب تعیین می‌شود</span></div><div><b>حضور در مطب</b><span>جلسه‌ی ارزیابی حضوری</span></div></div><div class="go"><a class="btn g" href="#">${ic("phone")} همین حالا تماس بگیرید</a></div></div>`),
  V("کارت معرفی", "ویژه‌ی مراجعان معرفی‌شده: دعوتی گرم و خاص با قاب طلایی دوتایی.", `<div class="ct-e"><div class="bx"><p class="eyebrow" style="justify-content:center">خوش آمدید</p><h3>از طرف آشنایی معرفی شده‌اید؟</h3><p>هنگام تماس، نام معرفی‌کننده را بفرمایید تا هماهنگی با اطمینان بیشتری انجام شود.</p><div class="acts"><a class="btn g" href="#">${ic("phone")} ۰۸۶-۳۳۱۴۶۱۷۹</a><a class="btn o" href="#">${ic("chat")} ایتا</a></div></div></div>`),
]);

G("footer", "فوتر", "همگی با یادآوری پزشکی «این محتوا جایگزین ویزیت نیست» قابل‌ترکیب‌اند (طرح د).", [
  V("چهار ستون", "کلاسیک: برند، لینک‌ها، خدمات، تماس.", `<div class="ft-a nv9"><div class="g"><div>${logo()}<p>متخصص گوش، حلق و بینی · اراک</p></div><div><h5>دسترسی</h5>${NAV.map(n => `<a href="#">${n}</a>`).join("")}</div><div><h5>خدمات</h5>${SV.map(s => `<a href="#">${s[0]}</a>`).join("")}</div><div><h5>تماس</h5><a href="#">۰۸۶-۳۳۱۴۶۱۷۹</a><a href="#">۰۹۲۱-۷۳۵۷۷۲۸</a><a href="#">info@drfarzadzamani.ir</a></div></div><div class="bt"><span>© ۱۴۰۵ دکتر فرزاد زمانی</span><span>همه‌ی حقوق محفوظ است</span></div></div>`),
  V("مرکزی مینیمال", "لوگو، منو، شبکه‌ها و یک خط؛ کم‌حجم و آرام.", `<div class="ft-b nv"><div>${logo()}</div><nav>${NAV.map(n => `<a href="#">${n}</a>`).join("")}</nav><div class="soc"><a href="#" aria-label="اینستاگرام">${ic("insta")}</a><a href="#" aria-label="ایتا">${ic("chat")}</a><a href="#" aria-label="تماس">${ic("phone")}</a><a href="#" aria-label="ایمیل">${ic("mail")}</a></div><div class="bt">© ۱۴۰۵ دکتر فرزاد زمانی · اراک</div></div>`),
  V("شماره‌ی غول‌پیکر", "شماره تماس به‌عنوان قهرمان فوتر؛ بدون پیچیدگی.", `<div class="ft-c nv9"><small>برای هماهنگی نوبت</small><span class="big">۰۸۶-۳۳۱۴۶۱۷۹</span><div class="rw"><span>اراک · روزهای کاری، با هماهنگی قبلی</span><span>info@drfarzadzamani.ir</span><span>© ۱۴۰۵</span></div></div>`),
  V("دو لایه با یادآوری پزشکی", "لینک مقالات اخیر و تذکر قانونی در یک جعبه.", `<div class="ft-d"><div class="tw"><div><h5>دسترسی</h5>${NAV.map(n => `<a href="#">${n}</a>`).join("")}</div><div><h5>مقالات اخیر</h5>${ART.slice(0, 3).map(t => `<a href="#">${t}</a>`).join("")}</div><div><h5>تماس</h5><a href="#">۰۸۶-۳۳۱۴۶۱۷۹</a><a href="#">اراک</a><a href="#">اینستاگرام · ایتا</a></div></div><div class="ds">${ic("info")}<span>مطالب این سایت جنبه‌ی آموزشی دارد و جایگزین معاینه و مشاوره‌ی پزشکی نیست.</span></div><div class="bt"><span>© ۱۴۰۵ دکتر فرزاد زمانی</span><span>شماره نظام پزشکی: <span class="ph">۰۰۰۰۰</span></span></div></div>`),
  V("نقشه و ساعت کار", "نیمی نقشه، نیمی اطلاعات؛ مناسب مراجعی که می‌خواهد بیاید.", `<div class="ft-e nv9"><div class="mapx mp">${mapSvg}<div class="pin"><span>مطب</span><i></i></div></div><div class="inf"><div>${ic("pin")}<span>اراک، نشانی کامل مطب</span></div><div>${ic("phone")}<span>۰۸۶-۳۳۱۴۶۱۷۹</span></div><div>${ic("clock")}<span>روزهای کاری، با هماهنگی قبلی</span></div><div class="bt">© ۱۴۰۵ دکتر فرزاد زمانی</div></div></div>`),
]);

const phoneBase = `<div class="pg"><h4>ظرافت در جزئیات</h4><p>نمونه‌ی صفحه‌ی موبایل</p></div><div class="ln"><i></i><i></i><i></i></div>`;
const phones = [
  ["سه دکمه‌ی شناور", `<div class="phone">${phoneBase}<div class="bar-a"><a href="#">${ic("phone")}تماس</a><a href="#">${ic("pin")}مسیر</a><a class="p" href="#">${ic("chat")}ایتا</a></div></div>`],
  ["دکمه‌ی گرد شناور", `<div class="phone">${phoneBase}<div class="fab"><a class="s" href="#" aria-label="ایتا">${ic("chat")}</a><a class="p" href="#" aria-label="تماس">${ic("phone")}</a></div></div>`],
  ["نوار تب پایین", `<div class="phone">${phoneBase}<div class="bar-c"><a class="on" href="#">${ic("home")}خانه</a><a href="#">${ic("grid")}خدمات</a><a href="#">${ic("book")}مقالات</a><a href="#">${ic("phone")}تماس</a></div></div>`],
  ["کشوی پایین", `<div class="phone">${phoneBase}<div class="bar-d"><div class="gr"></div><a class="btn g" href="#">${ic("phone")} تماس با مطب</a><div class="sub"><span>اراک</span><span>روزهای کاری</span><span>ایتا</span></div></div></div>`],
  ["اعلان و دکمه‌ی پایین", `<div class="phone">${phoneBase}<div class="bar-e"><div class="tk">رزرو آنلاین به‌زودی فعال می‌شود</div><div class="bt2"><a class="btn g" href="#">${ic("phone")} تماس</a><a class="btn o" href="#">${ic("pin")} مسیر</a></div></div></div>`],
];
G("mobile", "نوار اقدام در موبایل", "این بخش همیشه در قاب موبایل ثابت نمایش داده می‌شود. مهم‌ترین نیاز: همیشه یک راه تماس در دسترس، بدون سه دکمه‌ی تکراری.", [
  V("پنج الگو", "هر کدام یک رویکرد؛ روی مرجع اصلی (تماس) تأکید دارند.", `<div class="mb-wrap">${phones.map((p, i) => `<div><div class="mb-lbl" style="margin-bottom:8px"><b>${AB[i]}</b> · ${p[0]}</div>${p[1]}</div>`).join("")}</div>`),
]);

/* ---------- page ---------- */

const nav = groups.map((g, i) => `<a href="#${g.id}">${i + 1}. ${g.title}</a>`).join("");
const body = groups.map((g, gi) => `
<section class="group" id="${g.id}"><header><b>${String(gi + 1).padStart(2, "0").replace(/\d/g, d => "۰۱۲۳۴۵۶۷۸۹"[d])}</b><h2>${g.title}</h2><p>${g.intro}</p></header>
${g.vs.map((v, i) => `<article class="variant" id="${g.id}-${i + 1}"><div class="vlabel"><b>${g.id === "mobile" ? "۵" : AB[i]}</b><strong>${g.id === "mobile" ? "پنج الگو" : v.name}</strong><span>${v.why}</span></div><div class="frame"><div class="stage">${v.html}</div></div></article>`).join("")}</section>`).join("\n");
const count = groups.reduce((a, g) => a + (g.id === "mobile" ? 5 : g.vs.length), 0);
const html = `<!doctype html><html lang="fa" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>دکتر زمانی — ${count} طرح بصری</title><link rel="stylesheet" href="variants.css"></head>
<body data-vp="desktop"><div class="chrome"><strong>طرح‌های بصری</strong><nav aria-label="بخش‌ها">${nav}</nav><div class="vp" role="group" aria-label="اندازه‌ی نمایش"><button data-v="desktop">دسکتاپ</button><button data-v="mobile">موبایل</button></div></div>
<div class="intro"><h1>${count} طرح بصری، در ${groups.length} بخش</h1><p>مطالعه‌ی طراحی ۲۰۲۶-۱۰-۰۴. هر بخش پنج طرح مستقل دارد تا ترکیب نهایی را با هم انتخاب کنیم. جهت: لوکس و حرفه‌ای، آبی سرمه‌ای و طلایی، راست‌به‌چپ، بدون نیاز به عکس واقعی مطب. با دکمه‌ی «موبایل» بالا، همه‌ی طرح‌ها در عرض ۳۹۰ پیکسل دیده می‌شوند.</p><div class="rules"><span>پیش‌نمایش ایستا؛ بدون API</span><span>متن‌ها و عددهای نمایشی (خط‌چین) تأیید پزشک می‌خواهند</span><span>فقط دارایی‌های موجود پروژه</span><span>رزرو و پرداخت production خاموش می‌ماند</span><span>تصاویر نمونه‌کار بدون دست‌کاری؛ رضایت انتشار باید مستند شود</span></div></div>
${body}
<div class="note">این صفحه یک نمونه‌ی طراحی مستقل است و وارد React/CMS نشده. دسترس‌پذیری (کنتراست، صفحه‌خوان، کاهش حرکت) برای طرح‌های منتخب باید در پیاده‌سازی نهایی آزموده شود. Firefox/Safari و دستگاه واقعی بررسی نشده‌اند.</div>
<script src="variants.js"></script></body></html>`;
fs.writeFileSync(OUT, html);
console.log("variants:", count, "bytes:", html.length);
