# ممیزی و اصلاح سایت — 2026-10-11

**ممیزی و اصلاحات محلی، از جمله دادهٔ حجیم، اعتبارسنجی شده‌اند؛ پذیرش بیرونی باز است.** نتیجهٔ Git/PR/CI و هویت بسته در رسید همراه خروجی ثبت می‌شود. آزمون اجرا نشده PASS نیست؛ این گزارش گواهی امنیت یا آمادگی production نیست.

## درخواست، مبنا و مرز اجرا

مالک خواست سایت از ابتدا تا انتها از نظر امنیت، عملکرد، راحتی، ظاهر و دسترس‌پذیری بررسی و ایرادها اصلاح شوند و کار هنگام نبودن او ادامه یابد. هویت آبی/طلایی و تصمیم‌های قبلی مالک حفظ شدند. deploy زنده و فعال‌سازی رزرو/پرداخت/SMS واقعی مجاز نیستند؛ همهٔ داده‌های این نوبت مستقل و مصنوعی‌اند.

- مخزن: https://github.com/MohammadArak/DrZamani-Website ؛ مبنای main: `38e44e5fe59e6a53c9e6fd7204c590885da1109b`.
- شاخه: `fix/site-audit-20261011`؛ نسخه `1.18.1`؛ migration یا dependency مستقیم تازه اضافه نشد؛ dependency غیرمستقیم source-map-js از1.2.1 به1.2.2 ارتقا یافت.
- checkout: `D:\AI\Chatgpt\DrZamani\DrZamani-Website`؛ Python3.13.14 / Node24.15.0.
- API محلی8000، dev5173، preview4173؛ DB/media/session مستقل در `D:\AI\Chatgpt\DrZamani\.local\runtime` بیرون Git.
- اجرا: `START_LOCAL_API.ps1` کنار checkout؛ venv در `.local/api-venv`. credential، کلید و DB فقط محلی‌اند؛ وارد گزارش، commit یا بسته نشوند.
- ورود browser حساب ساختگی `local_audit` با اجازهٔ موردی کپچا از مالک انجام شد؛ اجازهٔ همین ورود، مجوز عمومی حل کپچاهای بعدی نیست.
- heartbeat ساعتی `automation-2` برای ادامهٔ همین ممیزی فعال است؛ وقتی کار محلی تمام شد، طبق prompt متوقف و فقط گیت‌های بیرونی گزارش شوند.

## یافته‌های اصلاح‌شده

| اولویت | مشکل مشاهده‌شده | اصلاح و شاهد |
|---|---|---|
| P1 | dependency غیرمستقیم source-map-js1.2.1 آسیب‌پذیر بود؛ CI برخلاف auditمحلی اولیه آن را گزارش کرد | ارتقای فقط lock entry به1.2.2 طبق [GHSA-68fv-2mgg-jv7q](https://github.com/advisories/GHSA-68fv-2mgg-jv7q)؛ npm registry رسمی دوباره صفر یافته، lint/build/proxy/budget تکرار شد؛ ریسک DoS ابزار source-map، اثبات exploit عمومی سایت ادعا نشده |
| P1 | صفحهٔ سفید dev: proxy کلی `/api` import فایل JSON source را به API می‌فرستاد | جداکردن `/api/app/`، محدودکردن proxy خدمات؛ dev واقعی بارگذاری شد؛ check:proxy روی Vite dev/preview در CI اضافه شد |
| P1 | گالری هنگام خطا عکس‌های hardcoded را برمی‌گرداند؛ توقف انتشار قابل‌اتکا نبود | fallback قدیمی حذف؛ loading/empty/error/retry؛ قطع API واقعی: صفر عکس و پیام خطا؛ بازیابی:۱۶ عکس؛ unpublish fixture: آدرس مستقیم404 |
| P1 | شکست chunk/render صفحه را سفید می‌کرد | ErrorBoundary فارسی با reload/home؛ فایل Landing خروجی موقتاً قطع و فوراً برگردانده شد؛ خطا و بازیابی در مرورگر موفق |
| P2 | شکست chunk مشترک SSR، ناوبری را پنهان نگه می‌داشت | در شکست import هدر/فوتر، fallback HTML و محتوای reveal نمایان می‌مانند؛ قطع کنترل‌شدهٔ islands در مقاله، متن و لینک‌های خانه/مقالات/رزرو و فوتر باقی ماندند |
| P2 | تصاویر CMS در preview مسیر صحیح نداشتند | proxy `/media/`؛ تصویر۱۲۰۰×۸۰۰ مصنوعی با variant `?w=480` واقعاً بارگذاری شد |
| P2 | رفتن به بخش lazy پس از تغییر ارتفاع صفحه مقصد را گم می‌کرد؛ hash بدشکل خطر خطای render داشت | anchor واقعی، reveal و رسیدگی hashchange، settle تا تعامل دستی و محافظ decode؛ CTA گالری و hashها در موبایل بررسی شدند |
| P2 | Hero/About/FAQ/Footer/Comments محتوای یکسان را جدا می‌خواندند | Promise مشترک برای site-content؛ شکست برای retry آینده cache نمی‌شود |
| P2 | اسلایدر نظرات تمام صفحات را هر۳۰ثانیه دریافت می‌کرد | بارگیری اولیه۱۲، «نمایش نظرات بیشتر» به درخواست کاربر، refresh فقط صفحات خواسته‌شده؛ fixture۱۳:۱۲→۱۳ و حذف دکمه |
| P2 | هر درخواست تصویر همهٔ snapshotهای خدمت/گالری/نظر را parse می‌کرد | پیش‌فیلتر SQL و projection؛ آزمون۳۰ خدمت: فقط snapshot مرتبط parse شد؛ متن نظر دارای key به‌تنهایی عکس را عمومی نمی‌کند؛ رضایت جاری و فعال‌بودن خدمت حفظ شده |
| P2 | فهرست کامل مقاله‌ها برای index و sidebar/related تکراری خوانده می‌شد | index خواندن اضافه ندارد، detail یک مجموعه را به هر دو بخش می‌دهد؛ آزمون materialization دقیقاً یک‌بار با HTML صحیح |
| P2 | جست‌وجوی تلفن قالب‌دار برای نقش فاقد پرونده نتیجه نمی‌داد؛ `%` و `_` wildcard بودند | normalize تلفن مستقل از clinical permission؛ escape literal و سقف۱۲۰ کاراکتر؛ آزمون تلفن فارسی و عدم افشای national_id |
| P2 | مقالهٔ ناموجود/نشانی نامعتبر JSON خام نشان می‌داد | HTML فارسی404/410/422، noindex/no-store و مسیر ادامه؛ API/private/media JSON باقی؛ مرورگر410 و422 موفق |
| P2 | جست‌وجوی مقالهٔ بدون نتیجه می‌گفت هیچ مقاله‌ای منتشر نشده | پیام مخصوص «برای این جست‌وجو نتیجه‌ای پیدا نشد»؛ regression و مرورگر |
| P2 | کنترل حرکت اسلایدر و نام دکمه‌ها ناقص بود | توقف/ادامه، pause با focus/hover/hidden/reduced-motion، cleanup تایمر؛ ArrowLeft/Right واقعی گالری۳→۲؛ نام دکمه‌ها و dot24px |
| P2 | FAQ دکمه و پنل مرتبط نداشت و متن بلند با max-height قطع می‌شد | aria-expanded/controls/labelledby، inert پنل بسته، CSS grid؛ تغییر سوال در320 و390 بدون سرریز |
| P2 | عنوان‌های کم‌معنا، لینک‌های یکسان و تصویرهای فاقد اندازه | hierarchy بخش‌های اصلی، alt تزئینی، لینک نام‌دار، ابعاد legacy614×768 و srcset CMS320/480/640/960 |
| P2 | بستن دیالوگ نام نداشت؛ عبور سریع از منو و فرم‌های تاریخ نام مشخص نداشتند | «بستن»، skip-link، title تاریخ‌گزین، نام توضیح تعطیلی، aria-current پنل؛ نام‌های واقعی DOM و فرم موبایل بررسی شدند |

**رزرو بسته ایراد باز تلقی نشد:** قرارداد صریح قبلی مالک فقط پیام مدیر و بازگشت است؛ افزودن تماس باعث شکست آزمون همان قرارداد شد و کامل پس گرفته شد. صفحهٔ نهایی فرم/input/tel ندارد. رزرو/پرداخت خاموش ماندند.

## پوشش امنیت و رفتار موجود

کد و آزمون‌های auth_limits/auth/browser_sessions/dependencies/access، RBAC پنل، patient/private consultation، WebSocket، content/media، bot/MFA، booking/payment/SMS outbox، تنظیمات و deploy/recovery مرور شدند. آزمون‌های موجود در full suite واقعاً اجرا شدند؛ وجود تست را به‌تنهایی نتیجه ندانید.

| حوزه | شاهد محلی | محدودیت |
|---|---|---|
| نشست/CSRF/نقش | cookie host-only/HttpOnly/SameSite، CSRF وابسته به نشست، تغییر نقش/رمز و logout نشست و WebSocket را باطل می‌کنند؛ direct API نقش خالی و حسابدار/نویسنده آزموده شده | نشست و role محدود در browser جداگانه وارد نشد؛ تست backend مرجع این رفتار است |
| OTP/CAPTCHA/MFA | TTL، مصرف یک‌بار، atomic limits و concurrency، Origin، debug-off production و private response آزموده شدند | provider/حساب و شبکهٔ واقعی فعال نشده |
| دادهٔ خصوصی/HTML/media | cross-patient isolation، مجوز مستقل تصویر/پرونده/finance، sanitizer allowlist، path و اندازه/پیکسل، انتشار و رضایت، ETag/unpublish و variants آزموده شدند | تأیید حقوق انتشار legacy و آمار/محتوای پزشکی با مالک است |
| پرداخت/پیامک | callback تکراری/هم‌زمان، receipt نامعتبر، خاموشی حین رزرو، جلوگیری از ارسال دوباره، claim/retry/crash، درگاه timeout/no-redirect؛ webhook HTTPS allowlist و DNS/IP pinning | هیچ تراکنش، پیامک یا provider واقعی در این نوبت |
| عملیات و انتشار | migration تازه/rollback/upgrade و restore پرشدهٔ مستقل؛ defaults و نگهبان runtime/deploy بررسی | Windows systemd/Nginx ندارد؛ CI لینوکس لازم، پذیرش VPS/offsite جدا |

## مرورگر و ظاهر

مرورگر واقعی: صفحهٔ اصلی dev/preview، تمام چهار خدمت SSR (رینوپلاستی/پلک/لیفت/فک)، index/detail/search مقاله، FAQ/footer، گالری، CTA، توقف و صفحه‌کلید، منوی موبایل و دیالوگ بسته. پهنای واقعی320/390/1280/1440 از DOM اندازه‌گیری شد؛ contentWidth=scrollWidth در مشاهدات ثبت‌شده (305/375/1265/1425 با scrollbar). resize روی تب فعال اعمال می‌شود؛ مقادیر درخواستی بدون اندازه‌گیری مدرک نیستند. overrideهای موقت پیش از تحویل reset/تب آزمایش بسته شوند.

پنل با fixture: داشبورد، تقویم، نوبت‌ها، بیماران، گفتگو، انتظار، مرکز تنظیمات، برنامه نوبت، خدمات، مالی، پیامک، audit، امنیت حساب، نظرات، مقالات و editor/preview، خدمات CMS، متن‌ها، گالری، رسانه و نقش‌ها. navigation/loading و فرم‌ها دیده شدند؛ unpublish تصویر و private editor preview واقعاً انجام شد. هیچ رمز جدید، نقش واقعی، ارسال SMS یا پرداخت از UI انجام نشد. داشبورد/فرم برنامه در320 هم دیده شدند. طی rebuild، تب قدیمی chunk قبلی را نداشت؛ ErrorBoundary نمایش داد و reload نسخهٔ تازه را آورد؛ خطای ساخت یا crash دائمی محصول نبود.

## اعتبارسنجی دقیق محلی

- `npm ci` موفق؛ `lint --max-warnings=0`، build/version، check:proxy، check:fonts، check:bundle موفق.
- build1.18.1: main67786 / staff25649 / patientGate931 / patientSession1563 / allJS422936 / allCSS24543 gzip bytes، زیر حدود موجود؛ CSS فقط۴۵۷bytes حاشیه دارد. هشت WOFF2 جمع206004bytes.
- full pytest نهایی: **368 passed / 16 skipped / 4 warnings، 205.94s**؛ JUnit و log در task root. چهار deprecation موجود؛ cache در اجرای نهایی خاموش شد؛ skippedهای زیرساختی Windows نتیجهٔ PASS نیستند. نسخهٔ قبل دادهٔ حجیم366pass بود؛ دو regression مربوط به query و metadata/Unicode افزوده شدند.
- targeted آخرین SSR/editorial/comments:95 passed /1warning؛ Ruff E9/F63/F7/F82 موفق؛ diff check با CR-at-EOL صحیح موفق.
- npm audit اولیه محلی صفر بود ولی CI38161232961 یک high درsource-map-js گزارش کرد؛ پس از ارتقا به1.2.2 ممیزی registry رسمی صفر شد. pip-audit تازه هم صفر آسیب‌پذیری شناخته‌شده؛ Python۴۷ dependency دقیق export lock با mirror نصب شده، frozen sync محلی از index اصلی موفق اعلام نمی‌شود. Gitleaks و frozen install واقعی آخرین commit برعهده CI و receipt است.
- سه verifier migration عمومی/editorial/comments و coordinated restore موفق؛ health1.18.1. این fixtureها backup مطب نیستند.

فایل‌های شواهد بیرون Git: pytest-final-2026-10-11.{txt,xml}، bundle-final-2026-10-11.json، npm-audit-2026-10-11.json، pip-audit-2026-10-11.json و migration-{core,editorial,comments}-2026-10-11.txt. credential/DB/upload/session همراه شواهد منتقل نشوند.

## خطاها و نکات ادامه

- apply_patch در checkout خطای reparse-point و نوشتن sandbox/Temp خطای ACL داشت؛ اسکریپت قابل‌بررسی کنار checkout و اجرای مجاز استفاده شد. safe.directory فقط همین checkout. این‌ها خطای سایت نیستند.
- PyPI files host DNS/timeout داشت؛ همان نسخه‌های lock از mirror نصب شدند، dependencyهای Python تغییر نکردند؛ source-map-js جداگانه اصلاح شد.
- pytest اول Temp مشترک دسترسی نداشت؛ TEMP/TMP و basetemp مستقل حل کرد؛ cache آخرین اجرا ACL warning داشت. برای اجرای بعد `-p no:cacheprovider` یا cache تازه استفاده شود.
- Landing تاریخی Git CRLF خاص دارد؛ `.git/info/attributes` محلی `-text` همین فایل دارد. `git -c core.whitespace=trailing-space,space-before-tab,cr-at-eol diff --check`؛ بهانه‌ای برای normalize کل checkout نیست.
- فایل‌های قطع‌شدهٔ کنترل‌شده فوراً بازگردانده شدند؛ پیش از handoff هیچ `*.audit-disabled` باقی نماند. fixtureهای مقاله/نظر/عکس پس از QA پاک شوند تا مشاهدهٔ مالک گمراه‌کننده نباشد.

## ادامهٔ دقیق، به ترتیب

1. CI آخرین SHA: frontend، backend Linux/Windows، secrets و linux-runtime. هر شکست واقعی رفع، نتیجهٔ دقیق خوانده شود؛ طبق AGENTS پس از سبزشدن همین SHA ادغام شود. PR همیشه attach شود؛ deploy جداست.
2. بهینه‌سازی دادهٔ حجیم زیر انجام و آزموده شد. بهبودهای بعدی وابسته به حجم واقعی: index جست‌وجوی متن کامل Unicode و صفحه‌بندی فهرست‌های عملیاتی بسیار بزرگ. search همچنان اصل Python casefold را نگه می‌دارد و متن کامل را می‌خواند؛ بدون شواهد حجم/نیاز، semantics یا cache رضایت عوض نشود.
3. آزمون چشمی/کیبورد با کاهش‌حرکت و فرم‌های ویرایش بلند/تعارض409؛ UI حساب با نقش محدود در صورت مجوز CAPTCHA جدا. مسیر patient booking فعال فقط fixture و سیاست دوباره false؛ provider واقعی ممنوع.
4. تحویل receipt دقیق commit/merge/tree/CI و فایل ادامهٔ AI کنار بستهٔ canonical، screenshot نهایی و browser باز. بستهٔ source شامل همه trackedها و manifest/hash باشد، هیچ ENV/DB/session/media خصوصی/build/dependency نصب‌شده.

گیت‌های بیرونی: محتوای پزشکی و ادعای۱۵هزار/دودهه، رضایت عکس‌های legacy، real CAPTCHA/payment/SMS، VPS/TLS/offsite/قطع برق و اندازه‌گیری Lighthouse/Core Web Vitals واقعی نیازمند داده/شبکه/دسترسی/مجوزند. fixture قبول‌شده جای این پذیرش‌ها نیست. تغییر طراحی مستقل گالری قدیمی هم تأیید نهایی مالک نگرفته است.


## دادهٔ حجیم و بارگیری پنل — اصلاحات تکمیلی همین مرحله

fixture مستقل۲۰ و۱۰۰۰ مقاله/نظر، body هر مقاله۱۸۰۰۷کاراکتر، سه تکرار؛ Python3.13/SQLite/TestClient روی همان میزبان. payload پاسخ‌ها در دو اجرا هم‌اندازه‌اند. این آزمایش بار هم‌زمان یا تضمین latency production نیست. دادهٔ خام/credential منتقل نمی‌شود؛ [شاهد قابل‌ماشین](SITE_AUDIT_PERFORMANCE_2026-10-11.json).

| مسیر در۱۰۰۰رکورد | median پیش از اصلاح ms | پس از اصلاح ms | query پیش→پس |
|---|---:|---:|---:|
| comments page1 |307.08|31.69|1001→2|
| articles API page1 |857.91|109.29|2→2|
| articles HTML index |815.05|107.82|4→4|
| article HTML detail |811.33|108.23|6→6|

خدمت نظرات گروهی و با IN محدود۵۰۰ خوانده می‌شود؛ رضایت جاری، عنوان تازه و فعال‌بودن خدمت همچنان authoritative است. public article metadata در SQL با json_remove تولید می‌شود؛ فهرست/sidebar/related/sitemap متن draft/approved body و منابع کامل را materialize نمی‌کنند. جست‌وجوی body با casefold اصلی محفوظ است؛ regression عبارت Straße با STRASSE و detail کامل موفق. هیچ cache انتشار/رضایت اضافه نشده.

initial loadAll پنل از۱۳ درخواست حوزه‌ای به۲ درخواست داشبورد/نوبت‌ها کاهش یافت (profile me و clinic مشترک جدا هستند). دادهٔ schedule/services/SMS/finance/waitlist/audit هنگام بازشدن بخش مربوط می‌آید؛ پاسخ دیررس تب قبلی کنار گذاشته می‌شود. لاگ API پس از reload browser فقط me+appointments+dashboard را نشان داد. تقویم/انتظار/مالی/پیامک/مرکز تنظیمات/برنامه دوباره در browser بدون alert بارگیری شدند؛ lint/build/budget پس از این تغییر موفق.
