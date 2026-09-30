# مرحله ۱ — امنیت پایه و آزمون محلی

تاریخ: 2026-09-30، Asia/Tehran. نسخه: `1.8.0`؛ شاخه: `phase-01-security`؛ مبنای مرحله: `9b3ba8be0fc76538a92c5a7790369a1ff8f0d6fb`.

این مرحله روی SQLite مستقل، حساب و اطلاعات ساختگی، پیامک console و پرداخت mock آزمایش شد. سایت زنده، دیتابیس بیماران و اتصال پیامک/پرداخت واقعی استفاده نشدند. اصلاح امنیت پایه به معنی آماده‌بودن تمام قابلیت‌ها یا تأیید production نیست؛ callback پرداخت و dispatch پیامک مرحله ۵ باقی‌اند.

## یافته‌ها و اصلاحات

| مشکل تأییدشده | رفتار نسخه جدید |
|---|---|
| نبود APP_ENV می‌توانست debug و OTP آزمایشی را فعال کند | پیش‌فرض production؛ توسعه/debug صریح؛ رد کلید نمونه/ضعیف، debug، console، sandbox و URL غیر HTTPS در production |
| OTP console شماره و کد را در لاگ می‌نوشت | حذف هر دو از لاگ؛ پاسخ debug فقط development/test با debug |
| access log پیش‌فرض query جست‌وجوی بیمار را ثبت می‌کرد | access log API در Nginx و Uvicorn production خاموش؛ routine proxy error log محدود به crit؛ HTTPX production فقط warning؛ پایش بعدی با telemetry پاک‌سازی‌شده |
| کپچای SVG متن قابل استخراج داشت | PNG بدون متن/metadata پاسخ؛ استفاده یک‌باره و محدودیت تولید؛ جایگزینی سرویس خارجی در مرحله ۴ |
| گرفتن کپچای تازه می‌توانست محدودیت حدس رمز را دور بزند | محدودیت حساب مستقل: ۵ تلاش/۱۵ دقیقه؛ محدودیت IP؛ محاسبه رمز برای نام ناموجود هم انجام می‌شود |
| خواندن مستقیم X-Forwarded-For از درخواست به مهاجم اختیار IP می‌داد | IP از اتصال ASGI پس از proxy مورد اعتماد؛ Nginx هدر ورودی را بازنویسی می‌کند |
| بررسی تلاش/مصرف OTP در درخواست‌های هم‌زمان race داشت | مصرف کد و شمارش تلاش با تراکنش SQLite؛ rate limit پایدار و اتمی در DB |
| نشست در localStorage بود؛ خروج کارکنان فقط محلی بود | کوکی‌های مجزای HttpOnly، Secure و __Host در production؛ SameSite=Strict، CSRF وابسته به نشست، کنترل Origin، ابطال DB در خروج |
| نشست بعد از تغییر رمز/نقش کارکنان معتبر می‌ماند | fingerprint رمز/نقش/فعال‌بودن در نشست؛ بررسی در API و WebSocket؛ migration نشست‌های کارکنان قدیمی را باطل می‌کند |
| WebSocket فقط هنگام اتصال احراز هویت می‌کرد | بررسی مجدد در پیام/heartbeat و پیش از انتشار رویداد؛ بستن با 4401 پس از خروج/ابطال؛ رد Origin نامعتبر |
| نشست بیمار ۳۰ روز بود | پیش‌فرض ۷ روز؛ سقف فعلی تنظیم بر نشست‌های قبلی نیز اعمال می‌شود |
| هدرهای Nginx روی location دارای add_header به ارث نمی‌رسیدند | snippet مشترک در مسیرهای مورد نیاز، CSP/frame-ancestors، DENY، nosniff؛ فقط یک کپی هدر در پاسخ proxy |
| Upgrade روی همه APIها بود و دو مسیر ورود محدودیت edge نداشتند | Upgrade فقط WebSocket؛ محدودیت OTP، تأیید، ورود کارکنان و ساخت کپچا؛ HTTP/1.1 صریح برای سازگاری نسخه‌های قبلی Nginx |
| فایل خیلی بزرگ از نظر پیکسل می‌توانست حافظه را مصرف کند | تنها decoderهای JPEG/PNG/WebP، سقف ۲۰ میلیون پیکسل پیش از decode، مدیریت decompression bomb و حذف فایل orphan در خطای ثبت |
| متن بیمار/خدمت در Excel می‌توانست formula شود | سلول‌های متنی صریحاً رشته؛ تست فرمول مخرب بدون اجرا |
| CR/LF در متن خروجی تقویم می‌توانست property تزریق کند | حذف CR و escape LF؛ PRODID نیز escape می‌شود |
| نسخه backend و manifest متفاوت بود | VERSION=1.8.0؛ تطبیق package/lock/pyproject پیش از build و نسخه در health |
| lint مبنا سه خطا و یک هشدار داشت | اصلاح effectهای context/preview و dependency تقویم؛ lint بدون خطا/هشدار |
| لاگ توسعه عنوان h2 داخل h3 در بخش نظرات را نامعتبر می‌دانست | wrapper انیمیشن به div تبدیل شد و عنوان h2 حفظ شد؛ ساخت فرانت‌اند دوباره بررسی شد |

اسکن dependency علاوه بر بررسی کد انجام شد. `pip-audit` در مبنا ۶۳ رکورد هشدار در ۵ بسته گزارش کرد؛ برخی alias/رکوردها تکراری‌اند و این عدد، ۶۳ نقص مستقل نیست. نسخه‌های دارای هشدار Pillow، python-multipart، python-dotenv، Starlette و pytest ارتقا یافتند. FastAPI نیز برای سازگاری با Starlette اصلاح‌شده به‌روز شد. نسخه‌های نصب‌شده: FastAPI `0.142.2`، Starlette `1.3.1`، Pillow `12.3.0`، multipart `0.0.31`، dotenv `1.2.2` و pytest `9.0.3`. lock بازتولید و sync منجمد اجرا شد؛ اسکن دوباره صفر مورد شناخته‌شده گزارش کرد. این نتیجه صرفاً وضعیت پایگاه هشدار و وابستگی‌های نصب‌شده در این تاریخ است.

## شواهد آزمون

| بررسی | نتیجه |
|---|---|
| npm ci و uv sync --frozen | موفق؛ Node 24.15.0، npm 11.12.1، uv 0.11.24، Python 3.13.14 |
| pytest مبنا | ۱۰ تست پاس |
| pytest نهایی | ۴۴ تست پاس؛ شامل ۳۴ مورد جدید/پارامتری امنیتی |
| npm run lint / npm run build | هر دو موفق؛ version guard و prerender موفق |
| Ruff E9/F63/F7/F82 | موفق؛ بررسی خطاهای بحرانی Python، نه ادعای lint کامل تمام سبک کد |
| migration | تمام migrationها از DB خالی، ارتقای 0012→0013 با کارمند/نشست موجود، downgrade و ارتقای مجدد؛ داده نمونه، integrity، foreign keys و UNIQUE پرداخت حفظ شدند |
| Nginx 1.30.5 | syntax هر دو قالب HTTP/HTTPS موفق؛ آزمون HTTP واقعی روی localhost با backend جدید موفق |
| آزمون یکپارچه Nginx | هدر صفحه/فایل/API/خطا، 404 واقعی، 410 مقالات قبلی، cookie+CSRF+logout، WebSocket upgrade/revocation و پاسخ 429 موفق |
| مرورگر دسکتاپ/موبایل | homepage و فرم کارکنان بدون خطای CSP؛ OTP بیمار با شماره ساختگی، ثبت پروفایل، بازیابی نشست پس از reload، خروج و نمای موبایل موفق؛ عرض سند و viewport برابر و بدون scroll افقی |
| npm audit --omit=dev | صفر آسیب‌پذیری شناخته‌شده در وابستگی‌های اجرایی فرانت‌اند؛ dependencyهای توسعه فرانت‌اند در این اسکن منظور نشده‌اند |
| pip-audit روی site-packages | صفر مورد پس از ارتقا؛ شامل وابستگی‌های اجرایی و pytest |

تست‌های API قبلی مسیر رزرو رایگان و پرداخت mock، ظرفیت/لیست انتظار/جابه‌جایی، فرم/رضایت، گفتگو/آپلود، خروجی/گزارش، اطلاعات مطب، پیامک mock و یادآوری را پوشش می‌دهند. تست‌های جدید هم‌زمانی OTP/rate limit، ضد دورزدن کپچا، جعل IP، cookie/CSRF/Origin، تغییر وضعیت کارکنان، WebSocket و دسترسی بین بیماران را پوشش می‌دهند. تمام گردش‌های انسانی، دستگاه‌ها و سرویس‌های خارجی به شکل end-to-end آزموده نشده‌اند.

## معماری نشست و استقرار

- frontend و API مرورگر باید یک origin داشته باشند؛ در توسعه از Vite proxy استفاده شود. Cookie session با `X-Session-Transport: cookie` درخواست و با `X-CSRF-Token` برای عملیات تغییر‌دهنده استفاده می‌شود. هیچ توکن ورود در localStorage ذخیره نمی‌شود؛ کلیدهای قدیمی پاک می‌شوند.
- Cookieهای production با `__Host-drz_patient_session` و `__Host-drz_staff_session`، Secure، HttpOnly، path=/ و بدون Domain صادر می‌شوند. cookie CSRF مربوطه خواندنی است و credential ورود محسوب نمی‌شود. Bearer برای کلاینت‌های API موجود پشتیبانی می‌شود.
- backend فقط localhost؛ systemd موجود فقط `127.0.0.1` را برای proxy headers قبول می‌کند. اگر Cloudflare اضافه شود، real_ip فقط برای محدوده‌های رسمی و به‌روز آن تنظیم شود؛ اعتماد سراسری به هدرها ممنوع است.
- migration `20260930_0013` ستون staff_state_hash و جدول auth_rate_limits اضافه می‌کند. کارکنان دارای نشست قدیمی دوباره وارد می‌شوند؛ بیمار موجود از بین نمی‌رود. downgrade ابطال نشست گذشته را برنمی‌گرداند.
- قبل از migration واقعی باید backup/restore و maintenance روی staging بررسی شوند. دو فایل snippet جدید باید همراه config نصب شوند؛ افزودن فقط config بدون snippet باعث شکست Nginx می‌شود. API_PREFIX سفارشی نیز نیازمند تغییر مسیرهای Nginx است.
- rate limit جدید و بخش‌های موجود رزرو SQLite-specific هستند؛ سازگاری PostgreSQL تأیید یا وعده داده نمی‌شود.
- CSP فعلی script فقط self، frame محدود به نقشه نشان/گوگل و form-action self است. مرحله ۴ باید originهای دقیق Google/Turnstile را با تست اضافه کند؛ مرحله ۵ رفتار انتقال واقعی درگاه باید با CSP بررسی شود.

## برنامه MFA مدیرکل

این مرحله طرح MFA را ثبت می‌کند؛ ورود دومرحله‌ای هنوز پیاده‌سازی نشده است. بعد از نقش مدیرکل مرحله ۲ و مدیریت اسرار/پیامک مرحله ۳، در مرحله ۴ پیاده‌سازی شود: مرحله اول فقط challenge کوتاه‌عمر صادر کند و هیچ نشست کامل پیش از عامل دوم نسازد؛ TOTP با seed رمزگذاری‌شده یا پیامک با provider تأییدشده، محدودیت جداگانه، کدهای بازیابی هش‌شده، فعال‌سازی/بازیابی کنترل‌شده و ابطال نشست پس از تغییر عامل. انتخاب عامل نهایی با مالک است؛ ارسال پیامک واقعی در این مرحله انجام نشده.

## باقی‌مانده و محدودیت‌ها

- مرحله ۲: نقش‌های سفارشی/مجوزهای backend؛ رویدادهای کارکنان باید با مجوز نقش جدید هماهنگ شوند. مالک اولیه مدیرکل با داده تأییدشده انتخاب شود.
- مرحله ۳/۴: مرکز تنظیمات، اسرار رمزگذاری‌شده، MFA و CAPTCHA خارجی قابل روشن/خاموش‌کردن؛ PNG فعلی به‌تنهایی تضمین ضدربات نیست.
- مرحله ۵: booking_enabled و متن خاموش، بازخوانی state پرداخت زیر lock، idempotency callback و dispatch غیرمسدودکننده outbox؛ UNIQUE payment_id از قبل هست.
- مرحله ۶ تا ۹: مقالات، نظرات واقعی، طراحی و service pages، SEO تازه پس از تغییر اطلاعات مطب، کاهش فایل‌ها/فونت/تصویر و CI. ادعای ۱۵٬۰۰۰ جراحی/تجربه و نظرهای فعلی باید پیش از انتشار محتوای جدید توسط پزشک تأیید شوند.
- مرحله ۱۰: HTTPS واقعی، کلاینت‌های مختلف، SMS/درگاه و staging/VPS؛ تطبیق commit سایت زنده هنوز تأیید نشده است.
- iframe نقشه نشان در مرورگر محلی بارگذاری نشد و fallback «نقشه بارگذاری نشد / مشاهده آدرس روی نقشه» نمایش داده شد؛ خطای CSP ثبت نشد. خود سرویس خارجی نقشه در این محیط تأیید نشده است.
- سه warning غیرمسدودکننده تست: مهاجرت TestClient از httpx به httpx2 و دو استفاده از نام قدیمی HTTP 422. Nginx جدید نیز برای syntax سازگار قدیمی `listen ... http2` warning می‌دهد؛ syntax و اجرا موفق‌اند.

خطاهای محیط حل شدند: cache غیرقابل نوشتن ابزارها با مسیر workspace، قفل DB باز هنگام migration با توقف preview، و cleanup DB در Windows با بستن connection. SSL Git با openssl و بررسی گواهی فعال استفاده می‌شود؛ TLS verification خاموش نشده است.

## منابع فنی

- [وراثت هدرهای Nginx](https://nginx.org/en/docs/http/ngx_http_headers_module.html)
- [CSRF وابسته به نشست و Origin — OWASP](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)
- [نسخه‌ها و سازگاری FastAPI](https://fastapi.tiangolo.com/release-notes/)
- [محدودیت Starlette در manifest رسمی FastAPI 0.142.2](https://github.com/fastapi/fastapi/blob/0.142.2/pyproject.toml)
- [نسخه‌های اصلاح‌شده Pillow](https://pillow.readthedocs.io/en/stable/releasenotes/index.html)
