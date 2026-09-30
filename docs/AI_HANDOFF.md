# راهنمای ادامه کار برای AI بعدی

آخرین به‌روزرسانی: 2026-09-30، Asia/Tehran. نسخه 1.9.0؛ پروژه MohammadArak/DrZamani-Website. مرحله صفر اسناد، مرحله ۱ امنیت و مرحله ۲ نقش/دسترسی انجام شده‌اند. این تحویل با PR و ادغام مرحله ۲ در main منتشر می‌شود؛ SHA دقیق commit/merge/ZIP در DELIVERY_REPORT-PHASE02 کنار خروجی‌ها و GitHub است؛ شناسه دوری داخل کامیت خودش نوشته نمی‌شود.

## شروع ادامه

1. main را دریافت و git status/log، VERSION، AGENTS.md، ROADMAP.md، PROGRESS_LOG، PHASE_01_SECURITY، PHASE_02_ACCESS و SETTINGS_INVENTORY را بخوان. مرحله ۱ در PR شماره ۱ با merge 08e929675777682701b9adb411759bb31cd69b2f وارد main شد؛ مرحله ۲ از همین مبنا شروع شد.
2. درخواست مالک: هر مرحله پس از تست و تازه‌کردن اسناد در همین ریپو کامیت و با main ادغام شود. خروجی کنار فایل راهنمای ادامه شامل کار انجام‌شده/باقی‌مانده/خطا/محدودیت باشد. برای ادغام مجاز دوباره اجازه نخواه؛ deploy یا فعال‌سازی سایت زنده مجاز نشده است.
3. مالک برای مدیرکل «نصب جدید» را انتخاب کرده است. هیچ username/password واقعی برای مالک دریافت یا ساخته نشده؛ هنگام استقرار مجاز از app.setup_owner استفاده کن. هیچ admin قدیمی خودکار مدیرکل نشود.
4. مرحله بعدی ۳ است: مرکز تنظیمات، اسرار و یکپارچه‌کردن اطلاعات مطب و سئو. هنوز مرحله ۳/۴/۵/۶/۷/۸ شروع نشده‌اند؛ مجوز رزروشده را با قابلیت پیاده‌شده اشتباه نگیر.

## محیط و اجرا

- workspace: C:/Users/Mahdi/Documents/Codex/2026-09-30/drfarzadzamani-ir-http-drfarzadzamani-ir؛ checkout در work/DrZamani-Website و خروجی تحویل در outputs.
- Windows PowerShell؛ Node 24.15، npm 11.12.1، uv 0.11.24 و Python 3.13.14 در api/.venv. از npm.cmd استفاده کن؛ npm.ps1 ممکن است execution policy خطا بدهد.
- cacheها و runtime در work هستند: UV_CACHE_DIR=work/uv-cache، UV_PYTHON_INSTALL_DIR=work/python-runtime، UV_TOOL_DIR=work/uv-tools، UV_TOOL_BIN_DIR=work/uv-tool-bin. uv sync --frozen آخرین‌بار 42 بسته را بررسی کرد.
- git شبکه در این میزبان با schannel خطای SEC_E_NO_CREDENTIALS داشت؛ git -c http.sslBackend=openssl استفاده شد، TLS verification خاموش نشد. push بومی به علت credential manager ویندوز ناموفق است؛ تغییرات با GitHub connector Git tree/commit/ref منتشر، سپس fetch و tree دقیق مقایسه می‌شود. commit metadata connector ممکن است SHA محلی اولیه را عوض کند؛ تنها با تطبیق tree، local soft reset به commit منتشرشده انجام شود. force push لازم نیست.
- داده تست/DB/آپلود مستقل؛ برای تست APP_ENV=test/development صریح، APP_DEBUG فقط در آزمایش، SMS console/disabled، پرداخت ساختگی. production پیش‌فرض fail closed است و SECRET_KEY ضعیف، debug، console SMS، sandbox یا URL غیرHTTPS رد می‌شوند.
- pytest: از پوشه api، .venv/Scripts/python.exe -m pytest -o addopts='' -q. Migration: از ریشه، api/.venv/Scripts/python.exe scripts/verify-migrations.py. lint/build از ریشه. critical Ruff: E9,F63,F7,F82. فقط آزمون‌های واقعاً اجراشده PASS گزارش شوند.
- previewها پایان این مرحله بسته شدند. fixture مرورگر ساختگی و فایل‌های موقت phase02-preview از سورس پاک شدند. ZIP با git archive ساخته می‌شود؛ هیچ DB/ENV/credential/node_modules/.venv/build/log نباید وارد آن شود.

## آنچه انجام شده

- نسخه واحد VERSION/manifestها/health در مرحله ۱ به 1.8.0 و اکنون 1.9.0 رسید؛ script check-version build را کنترل می‌کند. dependency جدید مرحله ۲ اضافه نشد؛ گزارش audit مرحله ۱ تاریخی است و اسکن در مرحله ۲ تکرار نشده است.
- امنیت ورود: APP_ENV production و debug خاموش به‌صورت پیش‌فرض؛ OTP مصرف اتمی و بدون افشای log، PNG CAPTCHA، محدودیت حساب/IP پایدار SQLite، قفل حساب با کپچای تازه دور نمی‌خورد. اعتماد proxy فقط localhost؛ Nginx XFF ورودی را جایگزین می‌کند.
- cookie میزبان HttpOnly/Secure/SameSite Strict با CSRF و Origin کنترل‌شده؛ actual bearer در localStorage نیست. نشست بیمار ۷ روز و کارکنان ۱۲ ساعت پیش‌فرض؛ logout واقعی DB، session fingerprint و کنترل Origin و ابطال WebSocket حفظ شدند. Bearer برای API مستقل پشتیبانی می‌شود.
- Nginx header inheritance/CSP/rate limit/404/Upgrade فقط realtime؛ حریم log production، محدودیت decoder/pixel تصویر، orphan cleanup، اکسل بدون formula و calendar بدون CRLF injection؛ جزئیات در PHASE_01_SECURITY.
- جداول Role/Permission/RolePermission/StaffRole؛ چند نقش با جمع مجوزهای فعال. legacy role فقط برچسب سازگاری است؛ هر endpoint کارکنان require_permission دارد و root-only codes به custom role داده نمی‌شوند. هویت API شامل permissions،role_ids،role_titles و is_superadmin است.
- بخش AccessPanel مستقل، CRUD نقش و حساب، حساب‌های غیرفعال، چند نقش، تغییر رمز بدون افشا، انتخاب وابستگی مجوز در UI/API؛ همه مسیرهای کارکنان با مجوز کنترل و بارگیری پنل محدود شد. حسابدار به پرونده/تصویر/گفتگو/SMS دسترسی خودکار ندارد.
- داده‌های حساس پرونده/شرح‌حال/چت/تصویر/مالی و export کنترل مستقل دارند؛ تغییر وضعیت نوبت بدون staff_note یادداشت قدیمی را پاک نمی‌کند. لغو مجوز جدا می‌خواهد. خواندن نوبت برای منشی شامل اطلاعات حسابداری همان نوبت است؛ مجموعه مالی مجوز finance.view می‌خواهد.
- مالک محافظت‌شده، بررسی آخرین مدیرکل در تراکنش BEGIN IMMEDIATE، رد دو غیرفعال‌سازی هم‌زمان، audit و ابطال نشست/WS با تغییر نقش/حساب. نشست بدون consultations.view نمی‌تواند به WS کارکنان متصل شود، ولی رد WS نشست مالی مجاز را لغو نمی‌کند.
- migration 0014 admin/secretary قدیمی را عضو نقش متناظر و staff sessions را باطل می‌کند؛ مدیرکل فقط انتخاب صریح. seed نقش ویرایش‌شده را بازنشانی نمی‌کند. downgrade همه کارکنان را غیرفعال می‌کند تا کد قدیمی مجوز گسترده ندهد؛ قبل از فعال‌سازی مجدد بازبینی حساب/backup لازم است.
- ابزار app.setup_owner برای نصب جدید، رمز مخفی دو بار؛ --promote-existing برای ارتقای صریح حساب فعال انتخابی. ENV bootstrap و create_admin فقط مدیر عادی هستند؛ اطلاعات bootstrap بعد از استفاده از ENV واقعی حذف شوند.
- مجوزهای articles/media/comments/secrets رزرو و در پنل «مرحله آینده» دارند؛ هیچ endpoint نوشتن/انتشار مقاله یا مدیریت نظر/اسرار هنوز پیاده نشده است.

## شواهد و محدودیت

104 pytest PASS (60 جدید+44 قبلی)، npm lint/build PASS، Ruff بحرانی PASS، نسخه‌ها و uv frozen PASS. Migration تازه/upgrade/downgrade/re-upgrade، legacy admin بدون owner، integrity/FK/payment UNIQUE PASS. API نقش خالی 403، حسابدار، ارتقای نقش، آخرین مالک هم‌زمان، CSRF، داده حساس/اکسل، چند نقش و ابطال WS و CLI نصب آزموده شدند.

UI واقعی با API ساختگی مستقل در مرورگر desktop و 390px آزموده شد؛ پیش‌نیاز خودکار، نقش محافظت‌شده، منوی حسابدار و فراخوانی فقط APIهای مالی و نبود اسکرول افقی تأیید شدند. این آزمون bypass فرم امنیتی ورود یا اثبات authenticated browser end-to-end نیست. آن پذیرش در staging باقی است؛ API واقعی از TestClient با نشست bearer/cookie و CSRF آزموده شد.

سه warning قدیمی pytest (httpx/TestClient، نام 422 در patient/staff) باقی‌اند. build آخر API محلی نداشت و fallback prerender استفاده کرد؛ تازه‌سازی HTML عمومی بعد از تغییر DB در مرحله ۳ لازم است. نمایش خارجی Neshan و خدمات SMS/payment/CAPTCHA واقعی هنوز در staging باید بررسی شوند. خطاهای گذرای fixture/ویرایش JSX حل و تست نهایی دوباره اجرا شدند؛ خطای حل‌نشده‌ای در checks نهایی نیست.

## باقی‌مانده و مرز مجوز

مرحله ۳: انتقال تنظیمات ممکن ENV به DB نسخه‌دار با cache/job یکسان، رمزگذاری اسرار و API ماسک‌شده مدیرکل، اطلاعات مطب موجود را reuse کن و SEO/HTML اولیه بعد ذخیره تازه شود. مرحله ۴: Google Fraud Defense/reCAPTCHA و Turnstile با اعتبارسنجی سرور، سیاست fallback و MFA مالک. مرحله ۵: booking_enabled اولیه خاموش، پیام غیرفعال، callback پرداخت پس از قفل دوباره خوانده شود و idempotent باشد؛ SMS outbox موجود را استفاده و dispatch از redirect جدا کن. مراحل ۶/۷: مقالات امن، SEO feedback و نظرات. سپس طراحی، صفحات خدمات/سئوی فنی، سبک‌سازی و پذیرش/استقرار.

گزارش اولیه همه‌اش درست نبود: UNIQUE payment_id و SMS outbox و clinic settings وجود دارند؛ meta noindex/410 مقاله هم موجود است. callback هنوز نیازمند اصلاح مرحله ۵ است، ولی «دو نوبت قطعاً ثبت می‌شود» ادعای تأییدشده نیست. backend و booking سایت زنده طبق گفته مالک عمداً فعال نشده‌اند؛ خطای استقرار فرض نکن و بدون درخواست روشن نکن.

هیچ deploy، پیامک/پرداخت واقعی، اتصال به DB بیماران یا فعال‌سازی رزرو انجام نشده است. بعد از هر مرحله نقشه راه، پیشرفت و همین handoff را همراه کد به‌روز، PR را ایجاد/attach و پس از checks با main ادغام و fetch/tree را تأیید کن.
