# گزارش پیشرفت

## 2026-09-30 — مرحله 0

- کاربر خواست ابتدا ریپو و نقشه‌راه آماده شود و پیاده‌سازی تمام قابلیت‌ها در این نوبت انجام نشود.
- حساب متصل GitHub برابر MohammadArak و مالک ریپوی داده‌شده بود. کاربر صریحاً ادامه در همین DrZamani-Website را انتخاب کرد.
- سورس main با تاریخچه دریافت شد: `c381d11107d1f50f1c4bb30380a54c07b4ffe18c`، 339 فایل مبنا.
- ساختار، config/auth/callback/model/dependencies، تنظیمات مطب، frontend routes/SEO/comments، prerender و Nginx برای برنامه‌ریزی بررسی شدند.
- پنج سند و AGENTS.md افزوده و README به آن‌ها متصل شد. تمام فازهای پیاده‌سازی شروع‌نشده هستند.
- اصلاحات مهم گزارش قبلی: UNIQUE payment_id موجود است؛ outbox SMS موجود است؛ اطلاعات مطب پنل دارد؛ noindex در prerender موجود است. live و تست‌ها تأیید نشده‌اند.
- بررسی مرحله صفر: diff فقط اسناد، سلامت Git، تطبیق سورس با کامیت اولیه و دریافت مجدد کامیت منتشرشده از GitHub. شناسه نهایی تحویل در گزارش خروجی محلی ثبت می‌شود تا ارجاع دوری کامیت داخل خودش ایجاد نشود.
- هیچ تغییر کد اجرایی، ENV، دیتابیس، فعال‌سازی رزرو یا انتشار production انجام نشده است.

قدم بعدی: مرحله 1؛ اجرای امن محلی و ممیزی کامل قبل از اصلاح امنیت. وضعیت مراحل فقط بر اساس شواهد آزمون به‌روزرسانی شود.

## 2026-09-30 — مرحله ۱، نسخه 1.8.0

- مالک با «ادامه بده» شروع مرحله بعد را خواست؛ شاخه phase-01-security از main با مبنای 9b3ba8be0fc76538a92c5a7790369a1ff8f0d6fb ایجاد شد.
- نصب و اجرای frontend/backend با DB و اطلاعات ساختگی؛ مبنا ۱۰ تست پاس و lint دارای ۳ خطا/۱ هشدار بود.
- اصلاح config امن، عدم افشای OTP، PNG CAPTCHA و قفل مستقل حساب/IP، مصرف اتمی OTP و rate limit پایدار؛ IP از proxy مورد اعتماد.
- انتقال مرورگر به cookie HttpOnly + CSRF، خروج واقعی، کاهش نشست بیمار به ۷ روز و ابطال پس از تغییر وضعیت کارکنان؛ WebSocket با کنترل Origin و بررسی مجدد نشست.
- Nginx/snippet و اسکریپت‌های نصب هماهنگ شدند؛ 404 و هدرهای فایل/API/خطا، محدودیت edge و Upgrade مختص realtime با Nginx محلی تأیید شدند.
- ارتقای dependencyهای دارای هشدار؛ اسکن دوباره backend و اسکن dependencyهای اجرایی frontend صفر مورد شناخته‌شده؛ جزئیات گزارش در docs/DEPENDENCY_AUDIT_PHASE01.json.
- upload: محدودیت pixel/decoder و orphan cleanup؛ Excel متن امن و خروجی calendar بدون property injection؛ نسخه واحد و build guard.
- ۴۴ تست پاس، lint/build، Ruff بحرانی و fresh/upgrade/downgrade migration موفق؛ مرورگر موبایل/دسکتاپ و login/profile/reload/logout بیمار با داده ساختگی تأیید شدند.
- هنگام جمع‌کردن preview، warning قدیمی nesting عنوان h2 داخل h3 بخش نظرات از لاگ Vite پیدا شد؛ wrapper به div تبدیل و lint/build دوباره بررسی شد.
- گزارش دقیق، راهنمای ادامه و وضعیت roadmap همراه کد به‌روز شد؛ هیچ deploy، پیامک/پرداخت واقعی یا روشن‌کردن رزرو انجام نشد.
- سه warning تست و warning syntax قدیمی http2 باقی‌اند؛ callback پرداخت/outbox مرحله ۵، نقش‌ها مرحله ۲ و CAPTCHA خارجی/MFA مرحله ۴ هستند.

قدم بعدی: مرحله ۲، مدیرکل و نقش/مجوز سفارشی، پس از دریافت همین شاخه/PR یا merge آن؛ از main قدیمی مرحله ۱ را دوباره انجام نده.


## 2026-09-30 — مرحله ۲، نسخه 1.9.0

- مالک خواست هر مرحله با GitHub ادغام شود و مرحله بعد آغاز شود؛ PR شماره ۱ با main ادغام شد، SHA: 08e929675777682701b9adb411759bb31cd69b2f.
- مالک برای تعیین مدیرکل «نصب جدید» را انتخاب کرد. ابزار تعاملی app.setup_owner اضافه شد؛ هیچ حسابی روی سرور اصلی ساخته نشد.
- نقش/مجوز چندگانه، پنل نقش‌ها و کارکنان، حفاظت مدیرکل و آخرین مالک فعال، مهاجرت legacy بدون ارتقای خودکار و ثبت audit پیاده شدند.
- همه APIهای کارکنان و WebSocket با مجوز مشخص کنترل شدند؛ فیلدهای پرونده/شرح‌حال/تصویر/مالی و اکسل تفکیک شدند. بارگیری عمومی همه داده‌ها در پنل حذف شد.
- دسترسی‌های مقالات/نظرات/اسرار رزرو شده‌اند؛ اجرای آن قابلیت‌ها مربوط به مراحل بعد است.
- 104 تست نهایی PASS، از جمله دو تغییر هم‌زمان مدیرکل، ابطال اتصال باز، نقش خالی و حسابدار، داده حساس، CSRF و CLI نصب. lint/build، نسخه‌ها، uv frozen و Ruff بحرانی PASS.
- migration تازه و upgrade/downgrade/re-upgrade، عدم ارتقای مدیر قدیمی و سلامت DB/FK/payment UNIQUE PASS. downgrade برای جلوگیری از اعطای دسترسی کد قدیمی کارکنان را غیرفعال می‌کند؛ فعال‌سازی دوباره نیازمند بررسی صریح است.
- UI واقعی پنل با API ساختگی مستقل در مرورگر دسکتاپ و 390px بررسی شد؛ انتخاب پیش‌نیاز، نقش محافظت‌شده، منوی حسابدار و نبود بارگیری بالینی تأیید شدند. این بررسی ادعای ورود کارکنان در مرورگر به API واقعی نیست.
- fixture تکراری نام فایل و انتظار نادرست پیام ready در تست، و دو خطای ویرایش JSX قبل از تحویل اصلاح شدند؛ نتیجه نهایی بدون خطای حل‌نشده است. سه warning قدیمی pytest و fallback prerender باقی‌اند.
- preview جمع و فایل‌های fixture از سورس انتشار حذف شدند. هیچ deploy، پیامک/پرداخت واقعی یا فعال‌سازی رزرو انجام نشد.

قدم بعدی: مرحله ۳؛ مرکز تنظیمات، اسرار و اطلاعات مطب با تازه‌سازی HTML عمومی/سئو. نقشه راه و راهنمای ادامه همراه هر مرحله به‌روز و همان مرحله با main ادغام شود.

## 2026-09-30 — مرحله ۳، نسخه 1.10.0

- PR مرحله ۲ با main ادغام و دوباره دریافت شد: 18711829e0301e8b7d32ebd30de42cb3e2290dd3؛ شاخه phase-03-settings از همین مبنا ایجاد شد.
- مرکز تنظیمات ۸ بخش، ۲۸ فیلد typed runtime، overlay بر ENV، پاسخ secret ماسک‌شده و Fernet با کلید مستقل، نسخه مشترک/CAS/تاریخچه/بازیابی و audit بدون مقدار اجرا شدند. زیرساخت ENV-only است.
- API/jobs در خواندن بعدی DB تازه می‌گیرند؛ نشست/OTP/پیامک/درگاه/آپلود مصرف‌کننده‌های runtime شدند. UI OTP طول واقعی ۶ تا ۸ رقمی را می‌پذیرد.
- وب‌هوک HTTPS/443 allowlist دقیق، رد DNS خصوصی و mixed، IP pin و TLS/SNI، بدون redirect/proxy؛ probe بدون token/payload/پیامک.
- ClinicSetting قبلی reuse و SEO افزوده شد. HTML اولیه/metadata/JSON-LD/robots/sitemap با backend و Nginx جدید از DB تازه ساخته می‌شود؛ تغییر تلفن/title بدون build روی Nginx واقعی محلی تأیید شد.
- 142 pytest (38 جدید) PASS؛ lint/build/versions، frozen offline 45 بسته، Ruff بحرانی و migration داده مطب/staff با round-trip/integrity/FK/payment UNIQUE PASS. cookie/CSRF/logout/WS/headers/404/410/rate-limit Nginx و syntax HTTP/HTTPS PASS.
- UI desktop/390px با API ساختگی مستقل: ذخیره عمومی/نسخه، عدم نمایش رمز، مجوز محدود/read-only و نبود overflow تأیید؛ تصاویر پیوست صرفاً preview هستند.
- cryptography 50.0.0 اضافه شد؛ نسخه اولیه هشدار audit داشت و جایگزین شد. audit backend و frontend اجرایی نهایی صفر مورد شناخته‌شده. دانلود PyPI CDN خطای DNS داشت؛ hash تمام artifactهای سه بسته جدید mirror با JSON رسمی PyPI تطبیق شد؛ dependency قبلی تغییر نکرد.
- تست قدیمی ظرفیت به پایان روز وابسته بود؛ روز آینده کامل انتخاب و کل suite دوباره پاس شد. خطاهای گذرای CSS/temp ACL/quoting/key fixture اصلاح شدند. سه warning قدیمی pytest و http2 syntax باقی‌اند.
- اسناد roadmap/inventory/README/handoff به‌روز شدند؛ previewها جمع و fixture از Git حذف شد. هیچ deploy، مالک production، پیامک/پرداخت واقعی یا روشن‌کردن رزرو انجام نشد.

قدم بعدی: مرحله ۴، Google/Cloudflare با کنترل پنل/اعتبارسنجی سرور، سیاست قطع ارائه‌دهنده و MFA مدیرکل؛ source همین مرحله پس از checks طبق درخواست مالک با main ادغام می‌شود و SHA/ZIP در گزارش تحویل ثبت می‌شود.

## 2026-10-01 — مرحله۴، نسخه1.11.0

- مبنا PR۳/main با SHA7814713e2391c0efec01d36b18fe96cca1d18c2d؛ شاخه phase-04-captcha-mfa. مالک رمزساز + کد بازیابی را صریحاً انتخاب کرد.
- Google assessments v1 score-based و Turnstile؛15فیلد پنل owner، اسرار encrypted، انتخاب server-primary، per-action، outage-only fallback یک بار، domain/action/age/score، policy/IP و replay/race safety.
- فعال‌سازی فقط بعد از آزمون مرورگر/سرور کلید ذخیره‌شده و attestation منطبق؛ وضعیت تأیید پنل؛ تغییر credential نیازمند reproof؛ ابزار خصوصی app.recover_access با تأیید دقیق و audit، بدون HTTP bypass.
- MFA TOTP/recovery، pending10دقیقه و فعال‌سازی بعد از کد درست، pre-auth180ثانیه بدون نشست/profile، محدودیت مستقل حساب/IP، seed Fernet، recovery HMAC و مصرف اتمیک، revocation نشست/WS و gate اجبار/ارتقای owner.
- 185pytest (43تازه) PASS، lint/build/نسخه، frozen45بسته، Ruffبحرانی، migration0016 تازه و rollbackپرشده/session/overlay/history و integrity/FK/UNIQUE، Nginx HTTP/HTTPS syntax و runtime cookie/CSRF/MFA/WS/headers/404/410/rate PASS. audit جدید backend/frontend اجرایی صفرشناخته‌شده؛ dependency تازه نیست.
- UI desktop/390px با API ساختگی: فرم کپچا، maskedsecret، رمزساز و selfsecuritynav بدون overflow بررسی؛ screenshot صرفاً syntheticpreview است. widget واقعی/مرورگر احرازشده API و شبکه/هزینه حساب واقعی پذیرش نشده‌اند.
- ایراد اولیه pending fingerprint نشست را زود می‌بست، اصلاح شد. property تست audit و CSP expectation برای endpoint server-only و ENV helper smoke اشتباه اصلاح شدند. با enforcebootstrap، fixtureproduction localhost نامعتبر شد؛ دامنه production ساختگی معتبر جایگزین و همه checks دوباره پاس شد. warningقدیمیpytest/http2 و fallbackbuild باقی‌اند.
- downgrade0016 حفاظت کد قدیمی را جبران می‌کند: همه کارکنان غیرفعال/نشست‌ها باطل، MFA/attestation و fields جدید overlay/history حذف؛ backup/restore و reviewبازفعال‌سازی ضروری است.
- docs/README/ENVexamples/roadmap/handoff تازه و previewها جمع شدند. هیچ deploy/مالکproduction/رزرو/پیامک/پرداخت واقعی فعال نشد.

قدم بعد مرحله۵: رزرو خاموش/پیام پنل، callback idempotent و SMS outbox غیرمسدودکننده redirect. پذیرش واقعی کپچا قبل از فعال‌سازی روی staging دنبال شود. هر مرحله طبق مجوز مالک پس از تست با main ادغام و handoff همراه خروجی تازه شود.
