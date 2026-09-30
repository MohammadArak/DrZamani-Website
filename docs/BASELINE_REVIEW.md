# بررسی مبنا و تصحیح گزارش قبلی

تاریخ: 2026-09-30. مبنا: `c381d11107d1f50f1c4bb30380a54c07b4ffe18c`.

این سند بررسی اولیه برای تدوین نقشه‌راه است، نه ادعای ممیزی کامل و نه گزارش اجرای تست‌ها. سورس React/TypeScript/Vite و FastAPI/SQLAlchemy با Alembic، SQLite، jobs و outbox پیامک است. 339 فایل tracked در مبنا وجود دارد. runtime، داده بیمار و secret واقعی منتقل نشده‌اند.

## موارد گزارش قبلی

| شماره قبلی | نتیجه بررسی فعلی | محل شواهد / برنامه |
|---|---|---|
| 1: backend زنده فعال نیست | کاربر گفت عمداً هنوز فعال نشده؛ خطای فعلی تلقی نمی‌شود. نسخه واقعی live تأیید نشده. | بررسی staging/production در مرحله 10 |
| 2: CAPTCHA متنی | تأیید کد: `_captcha_svg` ارقام را داخل `<text>` می‌گذارد و base64 امنیت اضافه نمی‌کند؛ محدودیت کپچا جای محدودیت ورود حساب را نمی‌گیرد. | `api/app/routers/auth.py`؛ مراحل 1 و 4 |
| 3: sandbox production | نمونه production مقدار true دارد؛ خطر پیکربندی پیش از فعال‌سازی است. درگاه فعلی واقعاً به sandbox درخواست می‌دهد؛ این موضوع به معنی پذیرش خودکار هر پرداخت یا وقوع پرداخت جعلی روی live نیست. | `deploy/env.production.example`، `api/app/payments.py`؛ مرحله 5 |
| 4: دو نوبت برای پرداخت | نیازمند تصحیح: مدل Appointment روی payment_id قید UNIQUE دارد؛ دو نوبت در DB مطابق این schema نباید ذخیره شود. بررسی verified فقط پیش از BEGIN IMMEDIATE انجام می‌شود؛ خطا، conflict یا تغییر وضعیت نامناسب در retry/هم‌زمانی محتمل است و باید بازتولید شود. | `api/app/models.py`، `api/app/routers/patient.py:zarinpal_callback`؛ مرحله 5 |
| 5: نشت OTP از پیش‌فرض توسعه | تأیید کد: APP_ENV پیش‌فرض development و debug پیش‌فرض روشن خارج production؛ debug_otp در پاسخ و SMS_PROVIDER=console پیش‌فرض. سوءاستفاده live ثابت نشده. | `api/app/config.py`، `api/app/routers/auth.py`؛ مرحله 1 |
| 6: Nginx | فایل فعلی locationهای دارای add_header مجزا، فاقد CSP/frame protection و محدودیت فقط برای request OTP است. بررسی header واقعی live انجام نشده. | `deploy/nginx-drfarzadzamani.conf`؛ مرحله 1 |
| 7: نشست 30 روز | پیش‌فرض 30 روز تأیید شد؛ انتخاب 7 روز پیشنهاد سیاست امنیت است، نه الزام اثبات‌شده. | `api/app/config.py`؛ مرحله 1/3 |
| 8: Upgrade عمومی | هدر Connection upgrade در تمام /api/ تنظیم شده؛ باید به WebSocket محدود شود. قطع واقعی اتصال از روی کد تنها ثابت نیست. | Nginx؛ مرحله 1 |
| 9: فایل‌های بزرگ | پنل‌ها/router بزرگ‌اند و بخش‌هایی نیز از قبل تفکیک شده‌اند؛ بازآرایی بر اساس حوزه لازم است. | `src/pages/Staff/`، `src/pages/Appointment/`، `api/app/routers/staff.py`؛ مرحله 9 |
| 10: فایل‌های قالب/فونت/تصویر | وجود assets قابل بررسی است؛ unused بودن و ارقام حجم گزارش قبلی در این مرحله تأیید نشده. | ممیزی مصرف و bundle در مرحله 9 |
| 11: پیامک در callback | صف `queue_sms_event` از قبل وجود دارد؛ `dispatch_pending_sms(db)` هنوز پیش از Redirect اجرا می‌شود. راه‌حل تکمیل worker/outbox موجود است. | `api/app/routers/patient.py`، `api/app/sms_automation.py`؛ مرحله 5 |
| 12: نسخه‌ها | FastAPI=1.7.0، pyproject=1.2.0 و package.json=0.0.0؛ ناسازگاری تأیید شد. | `api/app/main.py`، `api/pyproject.toml`، `package.json`؛ مرحله 1 |
| 13: soft 404 زنده | live فعلاً قابل تأیید نبود؛ کد router صفحه NotFound و Nginx `try_files ... =404` دارد. | مرحله 8 و تأیید deployment در مرحله 10 |
| 14: robots پنل‌ها | robots فعلی Allow دارد ولی prerender برای staff و appointment قبلاً noindex می‌نویسد. Disallow به‌تنهایی جلوگیری از ایندکس نیست؛ ممکن است خواندن noindex را مسدود کند. | `public/robots.txt`، `scripts/prerender.mjs`؛ مرحله 8 |
| 15: صفحات خدمات/sitemap | sitemap فعلی فقط homepage است؛ صفحات خدمات و مقالات جدید باید اضافه شوند. | `public/sitemap.xml`، `src/routes/index.tsx`؛ مراحل 6 و 8 |

## چیزهایی که از قبل وجود دارند

- اطلاعات مطب و تنظیمات نوبت در ClinicSetting و GET/PUT `/staff/settings` موجودند؛ frontend از ClinicInfoContext و API عمومی clinic استفاده می‌کند.
- SEO component از اطلاعات مطب استفاده می‌کند، اما prerender هنگام build از API/file یا fallback می‌خواند؛ تغییر پنل لزوماً HTML اولیه منتشرشده را تازه نمی‌کند.
- نقش‌ها عملاً admin/secretary و چک‌های ثابت `role == admin` هستند؛ زیرساخت نقش و Permission سفارشی هنوز ساخته نشده.
- نظرات در PatientsComments به‌صورت hardcoded هستند.
- router عمومی مقاله ندارد؛ Nginx آدرس /articles را 410 می‌دهد؛ prerender کد باقی‌مانده مقاله دارد. فعال‌سازی مقاله نیازمند اصلاح چند لایه است.
- توکن بیمار و کارکنان در localStorage ذخیره می‌شود؛ CSP و انتخاب معماری نشست باید همراه هم بررسی شوند.
- تست‌های backend در `api/tests/test_api.py`، `test_security.py` و `test_sms.py` موجودند. مرحله صفر آن‌ها را اجرا نکرده؛ وضعیت پاس/فیل نامعلوم است.

## محدودیت و خطاهای ابزار

- Git clone نخست با Windows schannel شکست خورد: `AcquireCredentialsHandle failed: SEC_E_NO_CREDENTIALS (0x8009030e)`.
- دریافت سورس با `git -c http.sslBackend=openssl clone ...` موفق شد؛ TLS verification غیرفعال نشده و تنظیم global تغییر نکرده است.
- `gh` روی PATH نیست. اتصال GitHub ابزار خواندن/نوشتن ریپو در دسترس است؛ نیاز به گرفتن رمز یا token از کاربر نیست.
- HTTP/HTTPS سایت با ابزار وب قابل دسترسی نشد؛ curl سیستم نیز با همان مشکل schannel شکست خورد. این نتیجه اثبات خرابی سایت نیست.
- خروجی بعضی ابزارهای PowerShell حروف فارسی را به‌صورت ? نشان داد؛ بررسی فایل خام با Node برای README، auth، comments و prerender نشان داد حروف فارسی موجودند و U+FFFD/رشته سؤال تخریب‌شده ندارند. فایل‌ها را برای این نمایش اشتباه بازنویسی نکنید.
- هیچ تست runtime، پرداخت، پیامک، load یا امنیت live در مرحله صفر انجام نشده است؛ اصلاحات برنامه نیز انجام نشده‌اند.

منبع رسمی تصمیم noindex: [Google Search Central](https://developers.google.com/search/docs/crawling-indexing/block-indexing). منابع کپچا در ROADMAP ثبت شده‌اند.
