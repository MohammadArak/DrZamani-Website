# راهنمای ادامه کار برای AI بعدی

آخرین به‌روزرسانی: 2026-10-01، Asia/Tehran. نسخه1.12.0، پروژه MohammadArak/DrZamani-Website. مراحل صفر تا۴ در main؛ مرحله۵ پیاده‌سازی و آزمون نهایی دارد؛ رسید ادغام و SHA دقیق در گزارش تحویل است. قدم بعد مرحله۶ مقالات است. گزارش تحویل PHASE05 کنار خروجی‌ها مبنای دقیق source/merge/tree/ZIP را ثبت می‌کند؛ پرداخت/پیامک/کپچا واقعی و deploy هنوز پذیرش/فعال نشده‌اند.

## شروع و تصمیم‌های مالک

1. main را fetch و status/log/tree/VERSION بررسی کن؛ AGENTS.md، ROADMAP.md، PROGRESS_LOG، PHASE_01_SECURITY، PHASE_02_ACCESS، PHASE_03_SETTINGS، PHASE_04_CAPTCHA_MFA و SETTINGS_INVENTORY را بخوان. PR۱ با merge 08e929675777682701b9adb411759bb31cd69b2f و PR۲ با merge 18711829e0301e8b7d32ebd30de42cb3e2290dd3 منتشر شدند؛ PR۳ با main7814713e2391c0efec01d36b18fe96cca1d18c2d ادغام شد و مبنای مرحله۴ است. گزارش خروجی آخر، مبنای دقیق ادامه را دارد.
2. مالک خواسته هر مرحله پس از تست و به‌روزرسانی اسناد در همین ریپو کامیت و با main ادغام شود. اجازه مجدد نخواه. هر خروجی باید فایل ادامه کار شامل انجام‌شده/باقی‌مانده/خطا/محدودیت کنار خود داشته باشد. deploy و فعال‌سازی سایت زنده مجاز نشده است.
3. مالک مدیرکل را «نصب جدید» انتخاب کرده؛ هیچ نام کاربری/رمز واقعی دریافت یا ساخته نشده. در نصب مجاز از app.setup_owner با رمز تعاملی مخفی استفاده کن. ENV bootstrap/create_admin مدیر عادی هستند؛ admin قدیمی خودکار مدیرکل نشود.
4. مرحله بعد۵ است؛ مرحله۴ Google/Cloudflare و MFA رمزساز + recovery طبق انتخاب صریح مالک اجرا شد. پذیرش خارجی staging هنوز باقی است. کلید رزرو/پرداخت/پیامک مرحله ۵، مقاله/رسانه/SEO feedback مرحله ۶، نظرات مرحله ۷، طراحی/صفحات خدمات/SEO مرحله ۸، سبک‌سازی مرحله ۹ و پذیرش/deploy مرحله ۱۰. placeholder یا مجوز رزروشده را قابلیت اجراشده معرفی نکن.

## محیط و اجرای محلی

- workspace: C:/Users/Mahdi/Documents/Codex/2026-09-30/drfarzadzamani-ir-http-drfarzadzamani-ir؛ checkout در work/DrZamani-Website، فایل تحویل در outputs و scratch در work است.
- Windows PowerShell، Node24.15/npm11.12.1، uv0.11.24 و Python3.13.14 در api/.venv. از npm.cmd و .venv/Scripts/python.exe استفاده کن؛ python alias کار نمی‌کند. برای متن فارسی Get-Content -Encoding utf8 لازم است.
- UV_CACHE_DIR=work/uv-cache، UV_TOOL_DIR=work/uv-tools، UV_TOOL_BIN_DIR=work/uv-tool-bin، UV_PYTHON_INSTALL_DIR=work/python-runtime را به مسیر مطلق workspace تنظیم کن. UV tool بدون این تنظیم ممکن است ACL access denied بدهد. uv sync --frozen --offline آخر 45 بسته را بررسی کرد.
- pytest از api: .venv/Scripts/python.exe -m pytest -o addopts='' -q --basetemp=../../pytest-NEXT-UNIQUE. temp تازه زیر work انتخاب کن؛ AppData temp این میزبان ACL خطا دارد. migration از ریشه: api/.venv/Scripts/python.exe scripts/verify-migrations.py. lint/build: npm.cmd run lint/build. Ruff: uv tool run --offline ruff check --select E9,F63,F7,F82 api.
- APP_ENV=test/development صریح، debug فقط آزمایش، SMS console/disabled، پرداخت ساختگی و DB/UPLOAD مستقل. production به‌صورت پیش‌فرض امن است و debug/کلید ضعیف/sandbox/console را رد می‌کند.
- Git شبکه با schannel این ویندوز خطای SEC_E_NO_CREDENTIALS می‌دهد؛ git -c http.sslBackend=openssl استفاده کن، TLS خاموش نشود. push بومی credential manager خطا دارد؛ connector tree/commit/ref/PR استفاده شد. tree منتشرشده باید دقیقاً با Git tree آزموده برابر باشد؛ سپس fetch/diff و فقط در صورت برابری، soft reset به SHA connector. force push لازم نیست. PR همیشه attach و با expected_head_sha ادغام؛ main دوباره fetch و tree تأیید شود. commit محلی به معنی انتشار نیست.
- عبارت 'HEAD^{tree}' در PowerShell quote می‌خواهد. git archive با -c core.autocrlf=false، سپس تطبیق comment/filelist/CRC و بایت فایل‌های نماینده با Git blob. ENV واقعی، DB، upload خصوصی، credential، dependencies نصب‌شده، cache، build و fixture مرورگر وارد ZIP نشوند.
- previewها بسته و فایل‌های phase04-preview/fixtures از سورس حذف شده‌اند؛ DBهای phase03-* فقط داده مستقل work هستند. screenshots phase03-settings-desktop/mobile در outputs از API ساختگی‌اند.

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

پذیرش خارجی مرحله۴: قرارداد Google/Turnstile و MFA اجرا و آزموده‌اند؛ کلید واقعی و شبکه/هزینه/سهمیه/provider widget با CSP هنوز روی staging پذیرش نشده‌اند. قبل از روشن‌کردن، طبق PHASE_04_CAPTCHA_MFA آزمون مالک/دامنه‌های واقعی و بازیابی خصوصی انجام شود.

مرحله ۵: booking_enabled اولیه خاموش و پیام قابل ویرایش؛ خاموش‌شدن رزرو ورود/پرونده و callback پرداخت شروع‌شده را خراب نکند. callback پس از قفل وضعیت تازه و idempotency در100/101/NOK و هم‌زمانی؛ UNIQUEpayment_id موجود است و ثبت دو نوبت قطعی ادعای تأییدشده نیست. SMS outbox موجود را حفظ و dispatch را از redirect جدا کن. سپس مقاله/رسانه/HTML sanitize/SEO feedback، نظر، طراحی و پذیرش.

گزارش اولیه چند ادعای نادرست داشت: UNIQUE payment_id، SMS outbox، clinic settings و noindex/410 از قبل موجود بودند. backend و رزرو سایت زنده طبق مالک عمداً خاموش‌اند؛ خطای استقرار فرض نکن یا خودکار روشن نکن. هیچ deploy، SMS/payment واقعی، اتصال DB بیماران، مالک production یا فعال‌سازی رزرو انجام نشده است. پایان هر مرحله code+roadmap+handoff، PR attach/merge، fetch/tree و ZIP verification الزامی است.

## ادامه از مرحله۴ — نکات قطعی

مرحله۴ از main7814713e2391c0efec01d36b18fe96cca1d18c2d، نسخه1.11.0. آخرین تحویل/ZIP و SHA دقیق را از DELIVERY_REPORT-PHASE04 و METADATA کنار خروجی بخوان؛ پس از انتشار main fetch/tree تطبیق می‌شود. docs/PHASE_04_CAPTCHA_MFA.md قرارداد و نصب/rollback کامل دارد. اسناد تاریخی مرحله۳ را گزارش وضع قبل بدان، نه کار تکراری برای مرحله بعد.

43فیلد runtime،15فیلد جدید captcha/MFA. bot_protection.py مقصدHTTPS ثابت/timeout8/no proxy redirect، Googleapikeyheader، domain/action/age/score، tokenHashUNIQUE و مصرف پیش از I/O، policy fresh بعدI/O؛ bot router public فقطsitekey و setup/confirmowner. attestation HMAC همانcredential/key/hostnames/score؛ فعال‌سازی بدونproof ممنوع، حتیENV و نبودsystemrow. fallback فقطbackendoutage و هر دوenabled یک بار؛ frontendnetworkerror یا securitydeny fallback نیست.

browser_sessions.staff_state_hash شامل enabledMFA/revision و policyrequiredowner؛ disabled/pending record دقیقاً(False,0) است تا pendingنشست را نبندد. routers/mfa.locked_self بعدlimit و BEGINIMMEDIATE، session/CSRF/revocation را دوباره کنترل می‌کند. account/ip independent limits؛ passwordsuccess صرفاًchallengeMFA می‌سازد و limiterfactor را reset نمی‌کند. MFAverify atomic counter/recovery consumption؛ cookie/bearer transport/IP/hash binding؛ fullsession تنها بعدfactor. seed و pending در envelope name mfa:staffid با همانFernetkeys، codeهاHMAC SECRETKEY. TOTP6/SHA1/30s±1، pending10min، loginchallenge180s، recovery10×128bit. secret/recovery تنهاprivate one-time selfresponse وstateموقتUI، نهaudit/settings/public/localStorage. QR وجود ندارد؛ manualentry وotpauthlink اجرا شده‌اند.

اجبار owner تنها بعدenroll همهactiveowners؛ promotion/create_ownerunenrolled هنگامmandatory ممنوع. هریکregularstaff باsecurityselfmenu می‌تواندenroll شود سپسownerupgrade. CLIrecover فقطprivate serveractiveowner وexactRECOVERusername، revokesallstaffsessions؛ resetselectedMFA ولی globalrequiredfalse، otherfactorsباقی. disablecaptchabothfalsePNGlocalباقی. هیچCLIproduction اجرا نشده. SECRETKEYrotation invalidateattestations/recovery/session؛ قبلخاموشproviders و بعدreproof/regenerate. Fernetrotation نیازhistoricalkeys/history/MFAseed دارد و reencrypttoolهنوزوجودندارد.

0016 upgrade4tables/newfingerprintsessionrevoke؛ پیش‌فرض providers/mandatoryfalse. downgrade همهstaffinactive/sessionrevoke،4tabledelete و15fieldsstripازoverlay/history؛ reupgradeخودکارreactivateنکند. restorebackupهمراهDB/keys/code/ENV/Nginx، role/accountreview قبلreactivate. این رفتار امنیتی را حذف نکن.

185pytest/43new،lint/build/versions،frozen45packages،Ruffcritical،migrationpopulatedroundtrip وNginxactuallocalcookie/CSRF/MFApreauth/recovery/WSrevoke/CSP/headers/404/410/ratePASS؛ auditfreshknown0،newdependency0. UI syntheticdesktop390px checks؛ actualproviderkeys/widget/network/quotas/CSPacceptance وrealbrowserauthenticatedAPIstagingباقی. Screenshotsphase04-... درoutputs ساختگی‌اند. previewfilesازrepoپاک وserversجمع‌شده‌اند؛ DBهایworkphase04-* synthetic هستند و Fernet/SECRET runtimeحفظنشده، دادهproduction نیستند. testhelperimports APPENVexplicit، basetemp unique، uvpathsJoin/FullPath (uv-tool-bin ممکن است هنوزdirectoryنباشد؛ Resolve-Path برای nonexistent استفاده نکن). گذرای pendinghashbug/testproperty/CSPserverorigin/envhelper/productionlocalhostfixture اصلاح شده وcheckspass. سهwarningoldpytest،nginxlistenhttp2 وfallbackprerenderبدونAPI باقی.

مرحله۵ را محدود به booking_enabledfalse/پیام وAPIhold/paymentstartgate، callback100/101/NOKracefreshafterlock/idempotency وoutboxworker انجام بده؛ لاگین/پرونده وcallbackپرداختقبلی با خاموش‌شدن رزرو قطع نشوند. phase4externalacceptanceقبلروشن‌کردنproduction باقی؛ هیچ deploy/مالکproduction/realpaymentSMS/bookingactivation خودکار مجاز نیست. همانریپو، test/doc/commit/PRattach/merge/fetch/tree وsourceZIPverification+handoff طبق مجوز قبلی مالک انجام شود.


## آخرین مرحله:۵ — رزرو و پرداخت/پیامک

مبنای این مرحله main16dbccd2d957e993c21057dcc5485ac084acd8fe، PR۴ است. گزارش مرجع PHASE_05_BOOKING_PAYMENTS.md را قبل ادامه بخوان. BOOKING_ENABLEDfalse و پیام عمومی فارسی در runtime45fields، policyمشترک API/HTML/React، checkزیرقفل روی createhold/booking/reschedule/newwaitlist؛ login/records/cancel/readwaitlist/leave/callback برقرار. staff عملیات داخلی موجود را انجام می‌دهد ولی offer جدید در خاموشی صادر نمی‌شود. UI focus/broadcast/30srefresh و getClinic پیش ازفرم؛ API مرجع نهایی است.

callbackverifyoutsidewrite سپس BEGINIMMEDIATE/expire_all/reload/terminalrecheck؛ 100/101+validref، NOK/latefailed/networkerror/expiry نمی‌تواندverified را خراب کند. expiredhold اگرslotfree کامل، conflict/refund/refcollision manualreview؛ UNIQUEpaymentid/ref محفوظ و حداقلیreceipt بدونPAN/cardhash. redirect فقطenqueue؛ failedpendingSMS پس ازموفقیتcancelled. merchant/sandbox پنل وrestore باcreated/redirected/verification_error ممنوع؛ ENV/accountقبلی برایlateexpired/failedreconciliation حفظ شود، snapshotcredentialperpayment هنوزوجودندارد.

SMSoutboxdedupe160/claimtoken64/claimuntil2min/nextattemptat؛ workerclaim1job زیرSQLitewrite، سپسnetworkoutside وtokencheckedreceipt. attemptsmax3/backoff5,10min؛ staleleasefaileddelay5 و warningdeliveryuncertain. externalSMSatleastonce: crashafterprovidersendbeforeDBreceipt ممکن استduplicate؛ دقیقاًیک‌بار خارجی تضمین نیست. providerdisabled صف/attemptbudget راحفظ؛ OTPdirectباقی. reminderproducerهمlock/dedupe دارد. jobs CLI/timer1min/TimeoutStartSec1h وstaffexplicitdispatch ازهمانworker. Linuxsystemd/realSMSپذیرش نشده.

0017forcesclosed حتیENVtrue وSMS4columnsunique، existingrows حفظ. CAS ایراد اولیه: centralrevision2 ولیclinic1 باعث409 بود؛ migrationalignclinic وseedfreshmigrationrevision اصلاح وintegrationNginxassert شد. rollbacksending→failedattempt3manualreview، bookingkeysstripoverlay/history؛ oldcodebookingflagندارد پسmaintenanceقبلrollback وbackupcoordinated؛ 0016disableaccounts/revokesessions نیز برقرار.

۲۱۵ تست pytest (۳۰ تست تازه این مرحله)، lint/build/نسخه، frozen sync با۴۵بسته، Ruff بحرانی، migration با داده قبلی/rollback/seed/CAS، Nginx HTTP/HTTPS syntax و runtime cookie/CSRF/MFA/WebSocket/headers/404/410/rate و تغییر فوری سیاست رزرو PASS. ممیزی frontend production صفر آسیب‌پذیری شناخته‌شده گزارش کرد؛ ممیزی تازه backend به DNS ابزار خورد و اجرا نشد. dependency تازه به پروژه اضافه نشده است. screenshot موبایل رزرو خاموش روی API/Nginx محلی و فرم تنظیمات با API ساختگی ثبت شد؛ پذیرش واقعی ارائه‌دهندگان و Linuxsystemd باقی است.

مرحله۶ بعدی: مقاله/رسانه با RBAC authoritative، HTML sanitization وpreview/draft/publish، SEOfeedback/persistentmetadata/SSR/canonical/sitemap وclinicalreviewcontent. اول ROADMAPمرحله۶ وpermissioncatalogfutureflags راخوانده سپس scopeمشخص؛ همانrepo وtest/doc/commit/PRattach/merge/fetch/tree/sourceZIP+handoff طبق مجوز قبلی مالک. productionowner«نصب جدید» و MFAرمزساز+recovery تصمیم قبلی؛ هیچdeploy/realSMS/payment/bookingactivation بدوندستور صریح. previewDBphase05-* وscreenshots synthetic؛ keysprocessحفظنشده، credentialsواقعی نیستند.
