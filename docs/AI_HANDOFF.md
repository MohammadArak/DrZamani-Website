# راهنمای ادامه کار برای AI بعدی

آخرین به‌روزرسانی: 2026-09-30، Asia/Tehran. نسخه 1.10.0، پروژه MohammadArak/DrZamani-Website. مراحل صفر تا ۳ تکمیل و آزموده‌اند. SHA نهایی commit/merge/tree و ZIP در DELIVERY_REPORT-PHASE03 کنار خروجی‌ها ثبت می‌شود؛ شناسه دوری داخل کامیت خودش نوشته نمی‌شود.

## شروع و تصمیم‌های مالک

1. main را fetch و status/log/tree/VERSION بررسی کن؛ AGENTS.md، ROADMAP.md، PROGRESS_LOG، PHASE_01_SECURITY، PHASE_02_ACCESS، PHASE_03_SETTINGS و SETTINGS_INVENTORY را بخوان. PR۱ با merge 08e929675777682701b9adb411759bb31cd69b2f و PR۲ با merge 18711829e0301e8b7d32ebd30de42cb3e2290dd3 منتشر شدند؛ مرحله ۳ از مبنای PR۲ است. گزارش خروجی آخر، مبنای دقیق ادامه را دارد.
2. مالک خواسته هر مرحله پس از تست و به‌روزرسانی اسناد در همین ریپو کامیت و با main ادغام شود. اجازه مجدد نخواه. هر خروجی باید فایل ادامه کار شامل انجام‌شده/باقی‌مانده/خطا/محدودیت کنار خود داشته باشد. deploy و فعال‌سازی سایت زنده مجاز نشده است.
3. مالک مدیرکل را «نصب جدید» انتخاب کرده؛ هیچ نام کاربری/رمز واقعی دریافت یا ساخته نشده. در نصب مجاز از app.setup_owner با رمز تعاملی مخفی استفاده کن. ENV bootstrap/create_admin مدیر عادی هستند؛ admin قدیمی خودکار مدیرکل نشود.
4. مرحله بعد ۴ است: Google/Cloudflare و MFA مدیرکل. کلید رزرو/پرداخت/پیامک مرحله ۵، مقاله/رسانه/SEO feedback مرحله ۶، نظرات مرحله ۷، طراحی/صفحات خدمات/SEO مرحله ۸، سبک‌سازی مرحله ۹ و پذیرش/deploy مرحله ۱۰. placeholder یا مجوز رزروشده را قابلیت اجراشده معرفی نکن.

## محیط و اجرای محلی

- workspace: C:/Users/Mahdi/Documents/Codex/2026-09-30/drfarzadzamani-ir-http-drfarzadzamani-ir؛ checkout در work/DrZamani-Website، فایل تحویل در outputs و scratch در work است.
- Windows PowerShell، Node24.15/npm11.12.1، uv0.11.24 و Python3.13.14 در api/.venv. از npm.cmd و .venv/Scripts/python.exe استفاده کن؛ python alias کار نمی‌کند. برای متن فارسی Get-Content -Encoding utf8 لازم است.
- UV_CACHE_DIR=work/uv-cache، UV_TOOL_DIR=work/uv-tools، UV_TOOL_BIN_DIR=work/uv-tool-bin، UV_PYTHON_INSTALL_DIR=work/python-runtime را به مسیر مطلق workspace تنظیم کن. UV tool بدون این تنظیم ممکن است ACL access denied بدهد. uv sync --frozen --offline آخر 45 بسته را بررسی کرد.
- pytest از api: .venv/Scripts/python.exe -m pytest -o addopts='' -q --basetemp=../../pytest-NEXT-UNIQUE. temp تازه زیر work انتخاب کن؛ AppData temp این میزبان ACL خطا دارد. migration از ریشه: api/.venv/Scripts/python.exe scripts/verify-migrations.py. lint/build: npm.cmd run lint/build. Ruff: uv tool run --offline ruff check --select E9,F63,F7,F82 api.
- APP_ENV=test/development صریح، debug فقط آزمایش، SMS console/disabled، پرداخت ساختگی و DB/UPLOAD مستقل. production به‌صورت پیش‌فرض امن است و debug/کلید ضعیف/sandbox/console را رد می‌کند.
- Git شبکه با schannel این ویندوز خطای SEC_E_NO_CREDENTIALS می‌دهد؛ git -c http.sslBackend=openssl استفاده کن، TLS خاموش نشود. push بومی credential manager خطا دارد؛ connector tree/commit/ref/PR استفاده شد. tree منتشرشده باید دقیقاً با Git tree آزموده برابر باشد؛ سپس fetch/diff و فقط در صورت برابری، soft reset به SHA connector. force push لازم نیست. PR همیشه attach و با expected_head_sha ادغام؛ main دوباره fetch و tree تأیید شود. commit محلی به معنی انتشار نیست.
- عبارت 'HEAD^{tree}' در PowerShell quote می‌خواهد. git archive با -c core.autocrlf=false، سپس تطبیق comment/filelist/CRC و بایت فایل‌های نماینده با Git blob. ENV واقعی، DB، upload خصوصی، credential، dependencies نصب‌شده، cache، build و fixture مرورگر وارد ZIP نشوند.
- previewها بسته و فایل‌های phase03-preview/fixtures از سورس حذف شده‌اند؛ DBهای phase03-* فقط داده مستقل work هستند. screenshots phase03-settings-desktop/mobile در outputs از API ساختگی‌اند.

## کار انجام‌شده

مرحله ۱: production/debug امن، PNG CAPTCHA، قفل حساب/IP پایدار، مصرف اتمی OTP بدون نشت log، cookie HttpOnly/Secure/SameSite با CSRF/Origin، بیمار ۷ روز/کارمند ۱۲ ساعت پیش‌فرض، logout واقعی و fingerprint/ابطال WS، decoder/pixel و cleanup آپلود، Excel/calendar امن. Nginx header/CSP/rate limit/404 و XFF جایگزین و Upgrade فقط realtime دارد. جزئیات در PHASE_01_SECURITY است.

مرحله ۲: Role/Permission/RolePermission/StaffRole چندگانه، require_permission در همه API کارکنان و WS، تفکیک داده حساس/اکسل، AccessPanel با CRUD حساب/نقش، مدیرکل محافظت‌شده و حفاظت آخرین مالک در قفل هم‌زمان. legacy role فقط سازگاری است؛ مجوز root-only به custom role داده نمی‌شود. seed نقش ویرایش‌شده را reset نمی‌کند. migration0014 نشست کارکنان را باطل می‌کند و admin قدیمی را owner نمی‌کند؛ downgrade همه کارکنان را غیرفعال می‌کند تا کد قدیمی دسترسی اضافی ندهد.

مرحله ۳:

- SystemSetting singleton و SettingRevision تاریخچه؛ ClinicSetting قبلی با revision و سه فیلد SEO توسعه یافت. ۲۸ فیلد typed/bounded همراه help/default/source فقط secrets.manage مدیرکل؛ clinic مطابق settings.view/edit.
- BEGIN IMMEDIATE، expected revision و خواندن مجدد مجوز مانع overwrite می‌شود؛ stale پاسخ 409 دارد. audit فقط نام فیلد/نسخه. restore کل clinic/overlay را با سیاست فعلی سرور به نسخه تازه برمی‌گرداند؛ تاریخچه API حداکثر ۱۰۰ metadata و بدون snapshot/secret است.
- runtime_settings در هر خواندن DB تازه می‌گیرد؛ API/jobs cache پردازشی قدیمی ندارند. config.get_settings برای bootstrap زیرساخت باقی است؛ DB/config را به runtime وابسته نکن تا cycle ساخته نشود. ENV فقط مقدار پایه است و تغییرش restart تمام سرویس‌ها می‌خواهد.
- توکن webhook، کلید فراز و merchant ID با Fernet مستقل و envelope متصل به نام فیلد رمزگذاری می‌شوند. API مقدار/default رمز نمی‌دهد. ورودی خالی حفظ رمز، clear مقدار خالی رمزگذاری‌شده و جلوگیری از ENV fallback، reset بازگشت به ENV فعلی است. فقدان/خرابی کلید هنگام خواندن secret با 503 امن رد می‌شود. هیچ secret از ENV خودکار کپی نمی‌شود.
- SETTINGS_ENCRYPTION_KEYS در API/jobs یکسان، مستقل از SECRET_KEY و CSV با کلید جدید اول و قدیمی‌های بعدی است. تاریخچه و داده دست‌نخورده هنوز کلید قبلی می‌خواهند. DB و همه کلیدهای لازم جداگانه backup امن؛ حذف old key بدون بازرمزگذاری کامل خطرناک است و ابزار آن هنوز ساخته نشده است.
- outbound.py وب‌هوک HTTPS/443، allowlist دقیق ENV، رد IP/userinfo/شبکه خصوصی و DNS ترکیبی، اعتبارسنجی در هر ارسال، اتصال به IP تأییدشده با TLS/SNI اصلی، بدون proxy/redirect. probe HEAD بدون token/payload/پیامک است؛ HTTPstatus صحت credential یا تحویل را ثابت نمی‌کند.
- public_pages.py اطلاعات مطب، HTML اولیه، metadata/OG/Twitter/canonical/JSON-LD، robots و sitemap را از DB می‌خواند؛ فقط assetهای bundle از public_html/index.html. no-store و escape؛ private noindex و 404 واقعی، articles قدیمی هنوز 410. robots اجازه crawler می‌دهد تا noindex را ببیند.
- Nginx جدید مسیرهای دقیق عمومی را به backend و assetها را استاتیک می‌دهد؛ تغییر مطب build مجدد نمی‌خواهد. این SSR کامل React نیست؛ متن اولیه مطب تازه است و UI کامل با JS mount می‌شود. نبود build پاسخ 503؛ میزبانی صرفاً استاتیک یا Nginx قدیمی این تازگی را ندارد.
- React public bootstrap و context واحد تلفن/نشانی/hero/footer/SEO، BroadcastChannel بدون داده حساس و refresh focus؛ StaffSettingsPanel مستقل ۸ بخش، ورودی رمز بدون مقدار و history دارد. OTP UI/backend طول واقعی ۶ تا ۸ رقمی می‌گیرد؛ app_name در health/OpenAPI تازه می‌شود. تصویر SEO فعلاً URL است؛ uploader رسانه عمومی مرحله ۶ است.

## شواهد، خطاها و محدودیت‌ها

۱۴۲ pytest PASS (۱۰۴ قبلی+۳۸ تازه)، npm lint/build، نسخه واحد، uv frozen offline با ۴۵ بسته، Ruff بحرانی و migration fresh/upgrade/downgrade/re-upgrade، حفظ clinic/staff، integrity/FK/payment UNIQUE پاس شدند. CAS هم‌زمان 200+409، پردازش Python مستقل، encryption/masking/rotation/clear/reset، bounds/production guards، SSRF/DNS/redirect، HTML/SEO/XSS و OTP۸/OpenAPI آزموده شدند.

Nginx واقعی محلی: تغییر تلفن/title در HTML بدون build، no-store، homepage قابل index، پنل noindex، alias301، headers/404/410، cookie/CSRF/logout، WS upgrade/revocation و edge rate limit PASS؛ syntax HTTP/HTTPS PASS. UI React واقعی با API ساختگی desktop/390px: ذخیره عمومی/افزایش نسخه، masked secret، read-only مجوز محدود و نبود overflow افقی بررسی شد. ورود احرازشده مرورگر تا API واقعی روی staging و خدمات خارجی Neshan/SMS/payment/CAPTCHA هنوز پذیرش نشده‌اند.

cryptography50.0.0 با cffi2.1.1 و pycparser3.0 اضافه شد؛ audit نهایی backend و frontend اجرایی صفر مورد شناخته‌شده. cryptography46.0.7 اولیه ۷ هشدار داشت و عوض شد. files.pythonhosted.org روی این میزبان DNS11001 داد؛ artifactهای سه بسته جدید از Aliyun mirror دریافت و همه hashها با JSON رسمی PyPI تطبیق داده شد. uv.lock registry رسمی و artifact URLهای mirror با hash اصلی دارد؛ dependencyهای قبلی تغییر نکردند. frozen offline از cache پاس شد؛ نصب clean در شبکه VPS/staging هنوز باید پذیرش شود.

خطاهای گذرای CSS fixture، temp ACL، quoting PowerShell و key fixture تولیدشده در هر call اصلاح شدند. smoke ابتدا رمز ساختگی نادرست و انتظار Disallow داشت؛ رمز صحیح و noindex header/meta تأیید شد. تست قدیمی capacity نزدیک پایان روز تنها یک slot می‌دید؛ روز کامل آینده انتخاب و کل suite دوباره پاس شد. سه warning قدیمی pytest (httpx/TestClient و نام 422) و Nginx listen http2 باقی‌اند؛ checks نهایی خطای حل‌نشده ندارد.

0015 downgrade overlay/history/SEO را حذف می‌کند؛ قبل از آن backup DB+کلیدها و تطبیق ENV با تنظیمات مؤثر و هماهنگی کد/DB/Nginx لازم است. rollback صرفاً کد قدیمی می‌تواند credential/policy را تغییر دهد. downgrade0014 کارکنان را غیرفعال می‌کند؛ بازفعال‌سازی نیازمند بررسی حساب/مجوز است.

## مراحل باقی و مرز مجوز

مرحله ۴: مستندات رسمی جاری Google Fraud Defense/reCAPTCHA و Turnstile را بخوان؛ primary/fallback و per-action، کلید پنل با server validation و MFA مالک طبق طرح PHASE01. داده پزشکی به captcha ارسال نشود؛ domain/action/expiry/replay/timeout/قطع سرویس آزموده شود. کلیدهای واقعی هنوز دریافت نشده‌اند؛ فعال‌سازی نهایی فقط پس از پذیرش و مسیر بازیابی سرور محدود.

مرحله ۵: booking_enabled اولیه خاموش و پیام قابل ویرایش؛ خاموش‌شدن رزرو ورود/پرونده و callback پرداخت شروع‌شده را خراب نکند. callback پس از قفل وضعیت تازه و idempotency در100/101/NOK و هم‌زمانی؛ UNIQUEpayment_id موجود است و ثبت دو نوبت قطعی ادعای تأییدشده نیست. SMS outbox موجود را حفظ و dispatch را از redirect جدا کن. سپس مقاله/رسانه/HTML sanitize/SEO feedback، نظر، طراحی و پذیرش.

گزارش اولیه چند ادعای نادرست داشت: UNIQUE payment_id، SMS outbox، clinic settings و noindex/410 از قبل موجود بودند. backend و رزرو سایت زنده طبق مالک عمداً خاموش‌اند؛ خطای استقرار فرض نکن یا خودکار روشن نکن. هیچ deploy، SMS/payment واقعی، اتصال DB بیماران، مالک production یا فعال‌سازی رزرو انجام نشده است. پایان هر مرحله code+roadmap+handoff، PR attach/merge، fetch/tree و ZIP verification الزامی است.
