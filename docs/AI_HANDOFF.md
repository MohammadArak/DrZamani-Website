# راهنمای ادامه کار برای AI بعدی

آخرین به‌روزرسانی: 2026-09-30، Asia/Tehran. نسخه 1.8.0؛ شاخه phase-01-security؛ ریپو https://github.com/MohammadArak/DrZamani-Website . مبنای مرحله ۱: 9b3ba8be0fc76538a92c5a7790369a1ff8f0d6fb. شناسه نهایی commit/PR در گزارش خروجی کنار این فایل و تاریخچه گیت‌هاب ثبت می‌شود.

## از اینجا شروع کن

1. AGENTS.md، ROADMAP.md، docs/PROGRESS_LOG.md، docs/PHASE_01_SECURITY.md و docs/SETTINGS_INVENTORY.md را بخوان. BASELINE_REVIEW گزارش تاریخی مرحله صفر است و اصلاحات بعدی در گزارش مرحله ۱ هستند.
2. شاخه phase-01-security/PR مربوطه را دریافت و git status/log را بررسی کن؛ تا قبل از merge، main فقط اسناد مرحله صفر دارد. فقط بر اساس عنوان فایل یا نسخه سایت زنده، آخرین کد را فرض نکن.
3. مالک خواسته تغییرات مرحله‌ای در همین ریپو کامیت شوند و هر خروجی فایل ادامه AI داشته باشد. زبان ارتباط فارسی است. رزرو و پرداخت live عمداً خاموش‌اند؛ deploy یا روشن‌کردن آن‌ها نیاز به درخواست صریح جداگانه دارد.

## کار انجام‌شده

- مرحله ۰: دریافت سورس و تاریخچه 339 فایل اولیه، تأیید مالکیت MohammadArak، ثبت نقشه‌راه و اسناد در main؛ آخرین main پیش از مرحله ۱، 9b3ba8... است.
- مرحله ۱: config امن production، محدودیت پایدار حساب/IP/OTP و کنترل race، CAPTCHA PNG، cookieهای جدا HttpOnly/CSRF، خروج DB، انقضای بیمار ۷ روز و ابطال نشست کارکنان پس از تغییر password/role/active؛ WebSocket نیز نشست را مجدداً بررسی می‌کند.
- اصلاح Nginx و نصب snippetها، هدر تمام مسیرهای مربوط، CSP و Upgrade فقط realtime؛ تقویت upload/Excel/calendar؛ نسخه واحد VERSION=1.8.0 و guard build؛ اصلاح lint مبنا.
- FastAPI/Starlette/Pillow/multipart/dotenv/pytest دارای هشدار به نسخه‌های اصلاح‌شده ارتقا یافتند؛ uv.lock بازتولید و sync frozen شد.
- ۴۴ تست پاس، lint/build و Ruff بحرانی موفق، migration خالی/داده موجود/downgrade/re-upgrade موفق، smoke واقعی Nginx localhost و آزمون مرورگر login/profile/reload/logout بیمار روی نمای موبایل و فرم کارکنان/صفحه اصلی موفق.
- npm audit --omit=dev و pip-audit روی backend نصب‌شده صفر مورد شناخته‌شده؛ اسکن dependencyهای توسعه frontend و آزمون واقعی سرویس‌های خارجی انجام نشده‌اند.

## قراردادهای مهم نسخه جدید

- توسعه فقط APP_ENV=development و APP_DEBUG=true صریح؛ console شماره/OTP را لاگ نمی‌کند. پیش‌فرض محیط production است و secret نمونه/ضعیف، debug، console، sandbox و URL غیر HTTPS رد می‌شوند.
- frontend/API مرورگر یک origin داشته باشند؛ Vite proxy برای توسعه. login با X-Session-Transport: cookie و Origin مجاز؛ تغییرات با X-CSRF-Token. Cookie در production __Host- و Secure/HttpOnly/SameSite Strict است؛ cookie CSRF خواندنی است. tokenهای localStorage سابق پاک می‌شوند؛ Bearer برای API باقی است.
- auth/logout بیمار و staff/auth/logout کارکنان؛ logout نشست DB و WebSocket را باطل می‌کند. staff_state_hash باید در مرحله نقش‌ها با عضویت/مجوزهای جدید هماهنگ شود.
- access log API در Nginx/Uvicorn production خاموش است تا query جست‌وجوی بیمار لاگ نشود؛ proxy error فقط crit و HTTPX production فقط warning. برای پایش مرحله ۱۰ از telemetry پاک‌سازی‌شده استفاده کن و query/body/cookie/credential را دوباره لاگ نکن.
- migration 20260930_0013 نشست‌های کارکنان قدیمی را خارج می‌کند؛ داده بیمار حفظ می‌شود. downgrade ابطال قبلی را برنمی‌گرداند. backup و maintenance واقعی هنوز روی staging باید آزموده شوند.
- SQLite تنها DB تأییدشده است؛ BEGIN IMMEDIATE و upsert/RETURNING در مسیرهای فعلی SQLite-specific هستند. systemd تک worker و localhost است؛ forwarded headers فقط از 127.0.0.1 معتبرند. Cloudflare هنوز راه‌اندازی نشده؛ real_ip باید محدود به رنج رسمی باشد.
- دو deploy/drzamani-*-headers.conf باید همراه Nginx نصب شوند. CSP مرحله ۴ با domainهای دقیق providerها و مرحله ۵ با انتقال درگاه تست شود. تنظیم API_PREFIX سفارشی نیازمند هماهنگی Nginx است.

## باقی‌مانده و قدم بعد

مرحله ۲: Role/Permission/عضویت، API و UI مدیرکل، enforcement سمت backend، آزمون منشی/حسابدار/نویسنده و منع افزایش دسترسی. owner اولیه را با داده تأییدشده تعیین کن و همه adminها را خودکار superadmin نکن. رویدادها و APIهای staff موجود برای نقش‌های محدود نیز باید کنترل شوند.

مرحله ۳: تکمیل ClinicSetting موجود و مرکز تنظیمات/secret رمزگذاری‌شده؛ مرحله ۴: Google Fraud Defense/reCAPTCHA و Turnstile با کلیدهای روشن/خاموش، fallback و MFA طبق طرح PHASE_01_SECURITY. PNG فعلی ضد OCR تضمینی نیست. مرحله ۵: booking_enabled پیش‌فرض خاموش، متن غیر فعال، callback idempotent و outbox غیرمسدودکننده. مرحله ۶ تا ۹: HTML editor امن و SEO feedback مقاله، نظرهای واقعی، اطلاعات مطب/SEO تازه، طراحی/خدمات/سرعت و CI. مرحله ۱۰: staging و نشر با درخواست مالک.

اشتباهات گزارش اولیه را تکرار نکن: Appointment.payment_id از قبل UNIQUE است؛ دو appointment موفق برای یک payment اثبات نشده ولی callback race/state هنوز بررسی/اصلاح مرحله ۵ است. SMS outbox و پنل اطلاعات مطب موجودند؛ ساخت موازی نکن. مقالات قدیمی عمداً 410 هستند و نباید خودکار برگردند. noindex در prerender موجود است و robots Disallow به‌تنهایی راه‌حل ایندکس نیست. ادعای تطبیق live/source یا تأیید SMS/درگاه واقعی نداریم. اعداد جراحی/تجربه و نظرهای فعلی قبل از انتشار محتوای جدید تأیید پزشک می‌خواهند.

## اجرای دوباره و خطاها

- Node 24.15.0، npm 11.12.1، uv 0.11.24، Python 3.13.14. frontend: npm.cmd ci سپس npm.cmd run lint و npm.cmd run build. backend داخل api: uv sync --frozen، uv run python -m pytest -q؛ migration: uv run python ../scripts/verify-migrations.py.
- conftest DB موقت تعیین می‌کند؛ test_api دارای drop_all/create_all است، پس به DB بیماران وصل نکن. اسکریپت migration مستقل است و هیچ DB موجودی را باز نمی‌کند.
- runtime محلی زیر work/ خارج ریپو بود، با DB ساختگی، console و bootstrap آزمایشی؛ این فایل‌ها، ENV/DB/uploads/log/cache/public_html/node_modules/.venv هرگز commit نشوند. نشست synthetic preview بعد از restart با secret تصادفی قبلی نامعتبر می‌شود.
- Git schannel خطای SEC_E_NO_CREDENTIALS داشت؛ git -c http.sslBackend=openssl با TLS verification فعال استفاده کن. gh روی PATH نیست، GitHub connector در دسترس بود. credential در چت درخواست نکن.
- cacheهای uv/tools/pip-audit باید در مسیر قابل‌نوشتن workspace باشند؛ WinError 5 مربوط cache حل شد. DB lock هنگام migration با توقف preview حل شد. SQLite context manager به‌تنهایی close نمی‌کند؛ اسکریپت جدید از closing استفاده می‌کند تا cleanup Windows موفق شود.
- اجرای مستقل یک تست جدید ابتدا به schema ساخته‌شده هنگام import تست قدیمی وابسته بود؛ fixture ساخت schema در test_auth_hardening اضافه شد و اجرای مستقل تست production logging نیز پاس شد.
- warning توسعه درباره h2 داخل h3 بخش نظرات با تغییر wrapper انیمیشن PatientsComments به div حل شد؛ lint/build پس از آن نیز بررسی شدند.
- سه warning تست غیرمسدودکننده درباره httpx2 TestClient و نام قدیمی HTTP 422 و warning Nginx برای listen http2 باقی‌اند؛ همه بررسی‌های ذکرشده موفق بوده‌اند.
- site live و HTTPS/browser production و سرویس‌های خارجی هنوز تأیید نشده‌اند. خطای ابزار شبکه را خرابی سایت گزارش نکن.
- iframe نقشه نشان در محیط محلی بارگذاری نشد، fallback موجود نمایش داده شد و خطای CSP دیده نشد؛ نمایش واقعی نقشه خارجی هنوز باید در staging بررسی شود.

بعد از هر مرحله ROADMAP، PROGRESS_LOG و این فایل را به‌روز کن؛ فقط بررسی واقعاً اجراشده را PASS بنویس و commit/PR دقیق را کنار خروجی تحویل ثبت کن.
