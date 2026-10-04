# گزارش پیشرفت

## 2026-10-05 — علت ناپایداری linux-runtime و آماده‌سازی VPS

علت: در آزمون واقعی runtime، handshake وب‌سوکت (از طریق Nginx و TLS) گاهی بیش از ۱۰ ثانیه بی‌پاسخ می‌ماند؛ روی ماشین محلی و مستقیم به API هیچ‌وقت دیده نشد (۸۰ اتصال پیاپی زیر ۰٫۵ ثانیه). خلاصه‌ی پاک‌سازی‌شده‌ی شکست حالا به‌صورت annotation عمومی منتشر می‌شود. اسکریپت `verify-linux-runtime.py` حالا handshake بی‌پاسخ را تا ۳ بار با مهلت ۱۵ ثانیه تکرار می‌کند و تعداد تکرار را در گزارش می‌آورد (یک اجرا با ۱ تکرار موفق شد، یکی با ۰). این ریشه‌ی محصولی را رفع نمی‌کند؛ اگر در VPS واقعی هم handshake گاهی کند بود باید بررسی شود. آماده‌سازی deploy: `scripts/build-release-package.py` (بسته + manifest با sha256 هر فایل) و `docs/GO_LIVE_RUNBOOK.md`. هیچ deploy انجام نشده.

## 2026-10-04 — لیست انتظار، سرعت، نقش‌ها و ادغام طرح‌ها (شاخه‌های feat/roles-waitlist-perf و feat/design-integration)

لیست انتظار: زمانی که نوبت لغوشده به نفر اول پیشنهاد می‌شود تا ۳۰ دقیقه برای او نگه داشته می‌شود (در `scheduling.list_available_slots` برای بقیه اشغال حساب می‌شود و رزرو دیگران ۴۰۹ می‌گیرد)؛ دکمه‌ی «رزرو همین زمان» در پنل بیمار و بستن خودکار ورودی با رزرو. سرعت: `runtime_settings.get_settings` نتیجه را بر پایه‌ی محتوای ذخیره‌شده‌ی ردیف حافظه‌ای می‌کند (ردیف هر بار خوانده می‌شود، پس کهنگی ندارد)، فهرست گفتگوها از ۲N+1 کوئری به ۳ رسید، و فهرست برچسب‌ها فقط ردیف‌های دارای برچسب را می‌خواند. نقش‌ها: مجوز تازه یک‌بار به نقش‌های پیش‌فرض می‌رسد (`docs/ROLES.md`). طرح‌ها: نوار اعتماد B (بلوک `trust` در دیتابیس، قابل ویرایش و پنهان‌شدنی، جایگزین `{medicalCouncilNumber}`)، درباره‌ی پزشک B (تصویر اتاق عمل تمام‌عرض + جمله‌ی شاخص اختیاری + مشخصه‌های قابل‌ویرایش؛ دو عدد قبلی ۱۵٬۰۰۰ و ۲۰ به‌عنوان مقدار اولیه‌ی قابل‌حذف حفظ شدند و نیاز به تأیید پزشک دارند) و نوار تب پایین موبایل C. اکنون تست‌های backend محلی هم اجرا می‌شود (ریپو: mirror پایتون tsinghua) و ۳۵۵ آزمون + اسکریپت‌های migration + ruff موفق بودند.

## 2026-10-04 — نمونه‌کارها از دیتابیس (شاخه feat/gallery-from-db)

جدول `site_gallery` (migration 20261004_0022)، ماژول `api/app/site_gallery.py`، روتر عمومی `/public-gallery` و staff `/staff/site-gallery`، مجوزهای `site_gallery.*` (نقش content_editor می‌نویسد ولی منتشر نمی‌کند)، پنل `StaffSiteGalleryPanel` با MediaPicker و `Samples.tsx` با `useSiteGallery` (bootstrap `gallery-bootstrap` + API + fallback ۱۶ تصویر قدیمی). ۱۶ تصویر قدیمی با seed منتشر می‌شوند تا ظاهر سایت عوض نشود؛ تصویر تازه از رسانه عمومی فقط با رضایت مراجع، مرجع رضایت‌نامه، بازبینی حریم خصوصی و توضیح تصویر منتشر می‌شود، و تصویر منتشرشده عوض نمی‌شود و رسانه‌ی استفاده‌شده در گالری بایگانی نمی‌شود. آزمون‌ها: `api/tests/test_site_gallery.py` (فقط در CI اجرا می‌شود؛ pip محلی در دسترس نیست). نقش `admin` موجود مجوزهای جدید را خودکار نمی‌گیرد؛ دستی بدهید. مدیران: migration 0022 هنگام release اجرا شود.

## 2026-10-04 — رفع موارد مهم گزارش بررسی (شاخه fix/pre-launch-hardening)

از [REVIEW_2026-10-04.md](REVIEW_2026-10-04.md): ۱) OTP: کپچا پیش از مصرف سهمیه‌ی «هر شماره» بررسی می‌شود (قفل‌کردن ورود یک شماره از بیرون بسته شد). ۲) `expire_unpaid_holds` فقط وقتی holdِ منقضی هست قفل نوشتن SQLite می‌گیرد (GETهای عمومی زمان‌های آزاد دیگر صف نوشتن را قفل نمی‌کنند) و Nginx برای `/api/v1/availability` سهمیه‌ی ۱۲۰ در دقیقه دارد. ۳) حداکثر ۳ پرداخت نیمه‌کاره و ۱۰ نوبت آینده برای هر بیمار؛ گفتگو برای نوبت لغوشده بسته و پیام ۴۰/ساعت، تصویر ۲۰/ساعت. ۴) بازپرداخت: فقط برای پرداخت تأییدشده، وضعیت refunded نهایی است و پیامک یک‌بار می‌رود. ۵) خواندن پرونده‌ی بیمار و خروجی اکسل در تاریخچه ثبت می‌شود. ۶) تغییر رمز توسط خود کارمند (`POST /staff/auth/password`، با رمز فعلی و عامل دوم) و ابطال نشست‌ها، با فرم در «امنیت حساب من». ۷) Nginx: gzip برای متن/CSS/JS (نه JSON؛ BREACH)، عکس و فونت بدون hash فقط ۷ روز کش (فقط `/assets/` immutable). باز می‌ماند: لیست انتظار واقعاً ساعت را نگه نمی‌دارد، کش `get_settings()` و N+1ها، `default_server` Nginx (به‌خاطر SNI تست runtime عمداً دست نخورد). آزمون‌ها `test_hardening.py` در CI.

## 2026-10-04 — متن‌های صفحه اصلی از دیتابیس (شاخه feat/site-content-from-db)

چهار بلوک متنی که در React hard-code بود (توضیح هیرو، سه بند «درباره پزشک»، چهار پرسش و پاسخ، متن فوتر) به جدول `site_blocks` (migration `20261004_0021`) رفت. هر بلوک پیش‌نویس و نسخه‌ی منتشرشده‌ی جدا دارد؛ اولین راه‌اندازی از `api/app/site_content_defaults.json` (همان متن قبلی) می‌سازد و ویرایش‌ها را هرگز بازنویسی نمی‌کند. HTML اولیه‌ی صفحه اصلی بلوک‌ها را همراه دارد (`site-content-bootstrap`) و SPA اگر API در دسترس نباشد به همان متن پیش‌فرض برمی‌گردد. در متن می‌توان از `{doctorName}`، `{specialty}`، `{officePhone}` و `{consultationPhone}` استفاده کرد. مجوزهای تازه `site_content.view/edit/publish`؛ نقش «ویراستار محتوا» می‌نویسد ولی منتشر نمی‌کند. پنل «متن‌های صفحه اصلی» با ذخیره‌ی پیش‌نویس، انتشار و بازگشت به نسخه‌ی منتشرشده. توجه مالک/پزشک: متن seed ادعاهایی مثل «بیش از دو دهه تجربه» و «بیش از ۱۵٬۰۰۰ عمل موفق» دارد که اکنون ویرایش‌پذیرند و باید توسط پزشک تأیید شوند. lint/tsc/build/check:bundle موفق؛ آزمون‌های `test_site_content.py` در CI.

## 2026-10-04 — متن صفحه‌های خدمات از دیتابیس (شاخه feat/services-from-db)

مالک خواست متن خدمات و صفحه‌ها hard-code نباشد، با ویرایشگر غنی و دسترسی برای کسی که او تعیین می‌کند. جدول `site_services` (migration `20261004_0020`) پیش‌نویس و نسخه‌ی تأییدشده‌ی عمومی را جدا نگه می‌دارد (مثل مقالات). چهار خدمت فعلی هنگام اولین راه‌اندازی از `clinic_services.json` در دیتابیس ساخته می‌شوند (فقط یک‌بار؛ بایگانی همه‌ی آن‌ها دوباره seed نمی‌کند). صفحه‌ی SSR خدمات، فهرست و نقشه‌ی سایت، کارت‌های صفحه اصلی و کاشی‌های «درباره» همه از همین منبع می‌آیند و HTML اولیه‌ی صفحه اصلی فهرست را همراه دارد (`services-bootstrap`). مجوزهای تازه: `site_services.view/create/edit/publish/delete` و نقش آماده‌ی «ویراستار محتوا» (نوشتن بدون انتشار). متن غنی با همان sanitizer مقالات پاک‌سازی می‌شود و تصویر باید از کتابخانه‌ی رسانه باشد؛ حذف رسانه‌ی استفاده‌شده 409 می‌دهد. پنل «صفحه‌های خدمات» در پنل کارکنان. نشانی صفحه‌ی منتشرشده تغییر نمی‌کند. یادآوری: `admin` و نقش‌های ساخته‌شده‌ی قبلی مجوزهای تازه را خودکار نمی‌گیرند (مدیرکل دارد)؛ از «نقش‌ها و کارکنان» اضافه شود. lint/tsc/build/check:bundle موفق؛ آزمون‌های تازه `test_site_services.py` در CI اجرا می‌شوند (محلی NOT RUN). متن واقعی خدمات هنوز باید توسط پزشک/نویسنده نوشته و تأیید شود؛ متن seed همان متن کلی قبلی است.

## 2026-10-03 — کنارگذاشتن صفحه اصلی و طرح مستقل گالری

طبق رد صریح مالک، طراحی homepage ادامه پیدا نکرد. نمونه مستقل docs/design/gallery-2026-10-03 با آبی/طلایی، فیلتر زاویه، شبکه/نمای درشت، نمایشگر کامل عکس/zoom/بندانگشتی/keyboard، نشان موقت و حالت خالی ساخته شد. شش عکس عمومی موجود بدون تغییر و بدون metadata بالینی ساختگی مصرف شدند. هیچ src/api/نسخه/production تغییر نکرد. دو چیدمان در چهار عرض1440/768/390/320 بدون overflow، تصاویر سالم، فیلتر/نشان/حالت خالی/reset، viewer/zoom/Escape/focus، جهت‌دار و خاموشی حرکت بررسی شدند. گرفتن کلیک توسط View Transition و cache قدیمی در روند بررسی پیدا و اصلاح شدند. محدودیت‌ها و نتیجه CI/source/merge در README و رسید outputs/gallery-preview ثبت می‌شوند. طرح هنوز به تأیید مالک نرسیده؛ سایت زنده deploy نمی‌شود.

## 2026-10-03 — نمونه واقعی حرکت و تعامل، حفظ آبی/طلایی

پس از رد طرح‌های ثابت، نمونه HTML/CSS/JS مستقل در docs/design/motion-2026-10-02 ساخته شد. مالک رنگ‌ها را صریحاً به آبی/طلایی محدود کرد؛ هدر/هیرو/خدمات/فوتر #14273d و تأکید #e5bc74 شد. ورود تیتر/پرتره، reveal و ترسیم صورت، انتخاب ناحیه/خدمت، راهنمای مرحله‌ای، FAQ، dialog رزرو خاموش و چک‌لیست حافظه‌ای فعال‌اند. تصویر/لوگوی اصلی حفظ و داده بیمار یا نتیجه ساختگی استفاده نشد.

مرورگر پنج عرض1440/1024/768/390/320 بدون overflow و تصاویر سالم؛ انتخاب فهرست/نقطه و جزئیات، dialog/Escape/focus، مراحل۲→۳، شمارنده چک‌لیست و حفظ موقت، رزرو خاموش، منوی موبایل/Escape و توقف حرکت موفق. دو کلیک اتوماسیون در حین اسکرول نرم نرسید و بعد از تثبیت نما موفق شد؛ جزئیات محدودیت در README. node --check موفق و console error خالی. reduced-motion سیستم و screen reader/لمس واقعی/field/backend این مرحله اجرا نشده‌اند. CI نهایی و رسید source/merge/tree در outputs/motion-preview/DELIVERY.json ثبت می‌شود. طرح به تأیید نهایی مالک نیاز دارد؛ محصول1.18.0 و سایت زنده تغییر نکرده‌اند.

## 2026-10-02 — مطالعه بصری و امکانات پیشنهادی، مبنای1.18.0

پس از درخواست مالک برای بررسی نمونه‌ها و ساخت طرح قسمت‌های سایت، چهار سایت واقعی Sam Rizk، Jonathan Sykes، Cleveland Clinic و دکتر امین آمالی با وب و نمای مرورگر بررسی شدند. چهار board با image_gen داخلی ساخته شدند: هیرو سرمه‌ای، هیرو روشن، خدمات/گالری و مراجعه/فوتر؛ هرکدام desktop/mobile دارند. پیش‌نمایش مستقل پنج نمای HTML با عکس/لوگوی اصلی و کپی خنثی، گالری placeholder و تعاملات محلی آماده شد. بیست بررسی layout در 1440/768/390/320 بدون overflow و با تصاویر قابل مشاهده سالم بود؛ تب/صفحه‌کلید RTL، فیلتر، dialog/Escape، منوی موبایل و FAQ بررسی شدند و لاگ error مرورگر خالی بود. تست backend و سنجش سایت زنده برای این مطالعه اجرا نشد.

گزارش DESIGN_STUDY_2026-10-02.md امکانات موجود را از پیشنهاد تازه جدا می‌کند؛ اولویت‌ها CMS گالری/رضایت، محتوای خدمات، راهنمای مراجعه و FAQ قابل مدیریتند. طرح‌ها و پرامپت‌ها در docs/design/study-2026-10-02 نگهداری می‌شوند؛ تحویل portable و رسید source/merge/tree/CI/hash در outputs است. نسخه اجرایی 1.18.0 و کد محصول حفظ شده‌اند. پذیرش/انتخاب مالک و اجرای طراحی هنوز باز است؛ deployment و booking/payment production انجام نشده‌اند. CI نهایی پیش از ارسال PENDING است و نتیجه مشاهده‌شده در رسید خواهد آمد.

## 2026-10-02 — پذیرش واقعی runtime در VM مستقل، 1.18.0

آزمون واقعی runtime روی source `9cbc634b88309901301d31ebdd09a302b8b409f3` در [run 37035493682](https://github.com/MohammadArak/DrZamani-Website/actions/runs/37035493682) موفق شد: ۱۶ بررسی زیرساختی با systemd255، runuser/www-data، frozen install، migration، HTTPS معتبر fixture، WSS احراز‌شده/رد ناشناس، timer/job واقعی، deploy/rollback پرشده با مالکیت، شکست عمدی Nginx و بازیابی، حفظ وضعیت timer و restart پس از SIGKILL. شواهد پاک‌سازی‌شده در PHASE_10_RUNTIME_CHECKS.json است. کل pytest لینوکس همان source: 333 passed و ۳ هشدار قبلی. نتیجه همه jobهای کامیت نهایی، Windows، source/merge/tree و ZIP/hash در رسید outputs/AI_HANDOFF-1.18.0.md ثبت می‌شود؛ پذیرش VPS واقعی از این نتیجه استنباط نشود.

خطاهای fixture و workflow اصلاح شدند؛ product security و VPS زنده تغییر نکردند. backup offsite، قطع برق و هویت production بازند. شواهد و محدودیت در PHASE_10_LINUX_RUNTIME.md ثبت‌اند؛ رسید و sourceZIP کنار handoff تازه شوند.

## 2026-10-02 — شروع پذیرش runtime لینوکس، نسخه 1.18.0

مالک قدم بعدی را تأیید کرد. WSL آماده، Docker و Podman روی این میزبان پیدا نشدند. یک آزمون واقعی و محدود به GitHub-hosted Ubuntu ساخته شد: refuse روی Windows/self-hosted/نصب موجود، نصب frozen تحت www-data، unitهای سخت‌گیری‌شده واقعی، timer و jobs، HTTPS با certificate معتبر fixture، WSS احراز‌شده/رد ناشناس، deploy و rollback داده/رسانه/ENV/snippets، شکست واقعی Nginx و بازیابی، حفظ وضعیت قبلی timer و restart پس از SIGKILL. دو تست guard محلی passed؛ اجرای runtime هنوز NOT RUN است. هیچ اتصال/نصب/deploy روی VPS زنده انجام نمی‌شود. خروجی عمومی تنها گزارش وضعیت بدون secret/DB/media/ENV است.


## 2026-10-02 — اجرای مستقل طراحی۸، نسخه1.17.0

پس از درخواست مالک برای ادامه مستقل، طرح موجود به صفحه اصلی و موبایل تبدیل شد. صفحات خدمات SSR با canonical، breadcrumb، sitemap، 404 و guard تعمیر Nginx اضافه شدند. گالری ۱۶ تصویر عمومی قبلی و قالب مستقل مقاله حفظ شدند؛ نظرات و مقالات از API می‌آیند و رفتار رزرو خاموش محفوظ است. آمار و وعده درمانی بدون مرجع قبلی حذف شدند؛ داده یا رضایت واقعی تازه ساخته نشد.

Runtime میزبان پیدا و مسیر Python در venv محلی اصلاح شد. نصب تازه Python محلی به شبکه/cache خورد؛ نصب فرانت‌اند از cache، export و تطبیق ۴۷ بسته موفق بودند. pytest محلی: ۳۱۷ passed، ۱۴ skip مخصوص لینوکس و ۳ هشدار قبلی؛ مجموعه مرتبط پس از SSR: ۴۴ passed. lint، build 1.17.0، Ruff، فونت، بودجه bundle، سه verifier migration/restore و Edge در پنج عرض بدون overflow/page error موفق بودند. جزئیات و محدودیت‌ها در PHASE_08_IMPLEMENTATION.md و شواهد JSON ثبت شده‌اند؛ CI و شناسه‌های دقیق تحویل در رسید outputs درج می‌شوند. پذیرش میدانی SEO، VPS/provider، backup خارج میزبان و قطع برق باز هستند؛ سایت زنده منتشر و booking/payment production فعال نشدند.

نصب تمیز و CI کد اجرایی `582b9cf62dab60919ba1362e4df0d0ca0b706c9e` در [run 37029364306](https://github.com/MohammadArak/DrZamani-Website/actions/runs/37029364306) با هر چهار job موفق بود: لینوکس ۳۳۱ passed و ویندوز ۳۱۵ passed / ۱۶ skipped، هر دو با ۳ هشدار قدیمی. frozen sync، سه verifier migration/restore و pip-audit در هر دو محیط موفق؛ frontend نصب/lint/build/fonts/budgets و npm audit موفق؛ اسکن تاریخچه نیز موفق. شواهد مرحله‌ها در PHASE_08_CI_CHECKS.json هستند. کامیت تکمیل اسناد پس از این شاهد CI جدا بررسی می‌شود و نتیجه نهایی ادغام در رسید outputs خواهد آمد.

## 2026-10-02 — بررسی پیش از ادامه روی میزبان فعلی

ساختار، اسناد، مسیر صفحه اصلی/رزرو خاموش و workflow خوانده شد؛ نسخه1.16.0 و hash کانسپت تطبیق خواندنی شدند. GitHub main=db6de0c و PR۱۲ draft/head46625be با ref محلی تطبیق دارد. گزارش محدودیت و قدم بعد در PROJECT_REVIEW_2026-10-02.md و ابتدای AI_HANDOFF ثبت شد. Git/Node/npm در PATH نیستند، venv به Python پروفایل admin قدیمی متکی است و اجرا نمی‌شود؛ bundled runtime ندارد. تست تازه/lint/build/migration/browser اجرا نشده و پاک‌بودن checkout اثبات نشده است. هیچ کد، deploy یا وضعیت production تغییر نکرد. ادامه مرحله۸، پس از آماده‌سازی محیط و جمع‌بندی طرح/موبایل/گالری؛ مرحله۸/۱۰ ناتمام باقی‌اند.

## 2026-10-02 — شروع دوباره مرحله۸، concept-v1

مالک طراحی جدید را خواست و فقط پیشنهاد بصری برای بررسی درخواست کرد. یک تصویر homepage با imagegen و رفرنس عمومی پزشک/لوگو/screenshot مالک ساخته شد؛ navy/gold، hero/header تیره، خدمات ساده، نظرات باعکس/نام/متن درcarousel، کارت مقاله/FAQ/contact/footer. تصویر971×1619/1574700bytes، فایل بازخوانی و بصری دیده شد؛ SHA25659df4e073488c0d81f574be1c6e80b96bb74a3174c410f2c13b6c622b8463a1e. نمونه‌کار در کانسپت اول نیست و باید با محتوای تأییدشده حفظ شود؛ متن و تصاویر مکمل تولیدی داده مرجع واقعی نیستند. کد، mobile، عملکرد، accessibility/contrast و SEO جدید آزموده نشده‌اند؛ مرحله۸ complete نیست. شاخه/PR پیش‌نمایش draft است و source دقیق در handoff کنار تصویر ثبت می‌شود؛ بدون deploy/productionactivation/realpatient/provider/owner.

مبنای این مرحله main db6de0c24a59b3cedf4ac1b4a4be1d6c8eb1238f از PR۱۱، نسخه1.16.0/source40ada26346de67ecdf57665db091fd57ef9103e9؛ CI36969641558 چهارjob موفق،327 Linux و311 Windows/16skip. این تست‌ها کد قبلی‌اند و برای کانسپت تازه PASS عملکرد ثبت نمی‌شود.

## 2026-10-02 — بازیابی هماهنگ1.16.0، در حال پذیرش

پس از ادغام PR۱۰ با main00dd2802b4ac673cca3afe339af49fedefd7e169، scope بعدی مرحله۱۰ بازیابی DB/publicmedia/privateuploads/ENV/Nginx است. اسکریپت‌های قدیمی با مدیریت هماهنگ، توقف سه writer، قفل مشترک، maintenance، snapshot مستقل از WAL، integrity/hash و rollback با رسید متناظر جایگزین شدند. گروه پردازشی فرمان در timeout/interrupt بسته می‌شود و ENV با Python سرویس تحت www-data خوانده می‌شود. راهنمای deploy/RECOVERY.md حدود rollback و journal/قطع برق/offsite را شفاف می‌کند. فرانت دست‌نخورده است. CI f980cfe/run36968560715 چهارjob موفق:325 Linux و311 Windows/14skipped، هرکدام3warning قبلی. محلی recovery17passed/14skipped؛ fullsuite root308passed/2cwd-fail/13skip بود، دو خطا از cwd=api همراه تست‌های جدید18passed/14skip تکرار و رفع شد؛ fullsuite موفق محلی ادعا نشود.

یافته Nginx: GET مقالات/sitemap می‌تواند scheduled_publish بنویسد؛ guard تعمیر نداشت. دو template همراه media/robots/404 اصلاح شدند؛ Nginx واقعی Windows محلی HTTP و TLS verified2passed در2.94s، fixture initialtemp-path مشکل داشت و اصلاح شد. در Linux CI Nginx نصب/آزموده می‌شود؛ Windows CI بدون binary skip دارد. بررسی آخر CI و source/merge/tree در رسید خروجی ثبت می‌شود. نصب config فعال VPS وظیفه اپراتور پیش از rollout است، ابزار انتشار آن template را خودکار تغییر نمی‌دهد. مرحله۱۰ کلی complete نیست؛ هیچ live deploy، فعال‌سازی production، داده بیمار یا provider واقعی استفاده نشده است.

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


## 2026-10-01 — مرحله۵، نسخه1.12.0

۲۱۵ تست pytest (۳۰ تست تازه این مرحله)، lint/build/نسخه، frozen sync با۴۵بسته، Ruff بحرانی، migration با داده قبلی/rollback/seed/CAS، Nginx HTTP/HTTPS syntax و runtime cookie/CSRF/MFA/WebSocket/headers/404/410/rate و تغییر فوری سیاست رزرو PASS. ممیزی frontend production صفر آسیب‌پذیری شناخته‌شده گزارش کرد؛ ممیزی تازه backend به DNS ابزار خورد و اجرا نشد. dependency تازه به پروژه اضافه نشده است. screenshot موبایل رزرو خاموش روی API/Nginx محلی و فرم تنظیمات با API ساختگی ثبت شد؛ پذیرش واقعی ارائه‌دهندگان و Linuxsystemd باقی است.

- کلید رزرو و پیام فارسی در runtime نسخه‌دار/owneronly و سیاست مشترک API/HTML/React؛ خاموشی پیش‌فرض نصب/مهاجرت، چک زیرقفل، حفظ ورود/پرونده/لغو و callback قبلی؛ انتظار/جابه‌جایی جدید بسته.
- callback شبکه خارج قفل و خواندن تازه داخل قفل؛ دو OK یک نوبت/رهگیری، terminalverified در برابر NOK/latefail/network/expiry پایدار؛ conflict/refund/refcollision manualreview و رسید حداقلی بدون کارت.
- redirect فقطenqueue؛ outboxdedupe وclaim/lease/backoff/max3، providerdisabled حفظ بودجه، پیام شکست پس ازموفقیتcancelled، producer یادآوری هم قفل دارد. خارجی at-least-once است و crash بعد از پذیرش ارائه‌دهنده می‌تواند duplicate کند.
- migration0017 صف قبلی راحفظ، CASrevisionclinic/system هم‌تراز و seedنصب تازه هم نسخه مهاجرت می‌گیرد. نخستین smoke تداخل نسخه را پیدا کرد؛ اصلاح و migration/integration/fullpytest مجدد پاس. TypeScript status sending/cancelled پس از خطای build هماهنگ شد؛ build نهایی پاس.
- خطای اولیه schemaupdate از readonlybookingfields اصلاح شد؛ تغییر/restoreclinic این فیلدها را نمی‌نویسد. اصلاحات مالی/SMS با mock و DBساختگی؛ هیچ سرویس واقعی، مالک production، deploy یا فعال‌سازیproduction انجام نشد.
- تست و docs/handoff با Git tree یکسان منتشر می‌شوند؛ PRattach/merge/fetch و SHA/ZIP در گزارش تحویل کنارoutputs. مرحله۶ مقاله/رسانه با RBAC و پاک‌سازی HTML و بازخوردSEO بعدی است.

## 2026-10-01 — اصلاح نمایش رزرو خاموش، نسخه1.12.1

طبق اصلاح صریح مالک، /appointment/ در حالت خاموش فقط پیام تنظیم‌شده و تقویم متوقف با انیمیشن تنفس آرام دارد؛ فرم ورود و پنل بیمار اصلاً mount نمی‌شوند، حتی با cookie قبلی. CSS عمومی و HTML اولیه بدون JavaScript هم همین پیام را دارند. prefers-reduced-motion انیمیشن را خاموش می‌کند. برچسب صفحه اصلی وضعیت نوبت‌دهی است؛ ادعای دسترسی UI ورود در خاموشی حذف شد. API پرونده و callback پرداخت شروع‌شده برای سازگاری و رسیدگی قبلی حفظ شده‌اند؛ این تصمیم درباره نمایش عمومی است. بررسی تازه سیاست قبل از mount فرم لازم است و شکست API رزرو را بسته نگه می‌دارد. متن سیاست قدیمی حفظ ورود UI در این اسناد، با همین درخواست تازه مالک جایگزین شد.

ادامه: مرحله۶ مقالات/رسانه/بازخوردSEO؛ حدود مجوز و شواهد تحویل مطابق گزارش خروجی. هیچ deploy یا فعال‌سازی production مجاز نشده است.
اعتبارسنجی اصلاح 1.12.1: 215pytest PASS، lint/build/نسخه PASS؛ مرورگر واقعی API/Nginx در 1280 و390px بدون فرم ورودی و بدون overflow؛ تصویر کنار خروجی‌ها. CSS اولیه و علامت status بررسی شد. MFA/providerهای واقعی و deploy همچنان گیت مستقل هستند.

## 2026-10-01 — واگذاری مرحله۶ ناتمام


مالک در2026-10-01 خواست ادامه کار بهAIدیگر واگذار شود؛ تغییرات فعلی برای ادامه در شاخهphase-06-articles وPRپیش‌نویس ذخیره می‌شوند. main نسخه1.12.1 اصلاح رزرو را دارد. مرحله۶ complete/merged/deployed نیست.

پیاده‌سازی فعلی: editorialmodels/migration0018، RBAC زیرقفل/CAS وsnapshotمستقل/publication/schedule، sanitizeHTML/URL،40تستbackend، رسانه جدا/مالکیت/decoderWebP/public-only-onpublication،11بازخوردSEO، publicSSR/canonical/OG/Article/Breadcrumb/category/search/sitemap، editorTiptap/HTML/autosave/history/preview وlibraryUI. شرح معماری، خطاهای شناخته‌شده و قدم‌های لازم درAI_HANDOFF ابتدایفایل است.

شواهد snapshot: 255pytest PASS با3warningقدیمی؛ lint/build/version، Ruffcritical، frozen47، migrationfresh/roundtrip/integrity/FK عمومیPASS؛ auditتازهکلnpm0شناخته‌شده. PublicSSR وpermission/sanitization/snapshot/media باTestClient ساختگی آزموده شدند؛ هیچ UIمرحله۶ درمرورگر یاNginxruntime آن پذیرش نشده. freshbackend audit/staging/cleaninstall و rollbackپرشدهeditorial باقی‌اند.

موارد باز: categories/tagsdelimiter احتمالی، رسانهpicker60آیتم، pagination/total تازه، autosave/error/409/read-only/رفتارimageNodeView/table/link/history/mobile واقعی، previewcover/tagnavigation، budget/bounds/audit بیشتر، revision/scheduledslugraces، NginxHTTP/HTTPS headers/SSR/legacyroutes، editorialbackup/restore وprerendertext قدیمی. کد فعلی نباید بدون بررسیAIبعدی mainmerge/release معرفی شود.

dependencyها: Tiptap3.31.4،DOMPurify3.4.16،Bleach6.4.0،webencodings0.6.1؛ منابع رسمی [React](https://tiptap.dev/docs/editor/getting-started/install/react)،[TableKit](https://tiptap.dev/docs/editor/extensions/nodes/table)،[Image](https://tiptap.dev/docs/editor/extensions/nodes/image)،[Bleach](https://bleach.readthedocs.io/en/latest/clean.html). CDN PyPI DNSخطا داشت، دوartifactجدیدازmirror باhashرسمیverifyشدند؛ docs/DEPENDENCY_PROOF_PHASE06.json. npmcacheاولACL داشت وcacheworkspace حلشکرد؛ critical frontendadvisories باauditfixرفع و ممیزی نهایی0است. importمفقودget_db وlazyimportاشتباه درتوسعه اصلاح وlint/build/fulltestsنهایی پاس.

هیچ production، deploy، داده/رسانه بیمار، حسابownerواقعی، پرداخت/SMSواقعی یا کلیدرزروproduction تغییر نکرد. rolloutسابق1-5 و MFA/captcha/payment/SMSproviderهایreal همچنانstaginggatesدارند.


## 2026-10-01 — پذیرش محلی مرحله۶ از snapshot443f466، نسخه1.13.0

شاخه phase-06-articles و همان PR۷ ادامه یافتند. دسته/برچسب حین تایپ، picker جستجو/صفحه‌بندی/انتخاب قدیمی، total تازه، ذخیره هنگام تایپ هم‌زمان و pause روی503/409، restore و guard خروج با dialog داخل پنل، previewcover و tag/sitemap، publisher مستقل و upload input reset اصلاح شدند. تاریخچه به metadata محدود است؛ media audit و bounds بیشتر افزوده شدند. AppointmentGate حتی کد فرم ورود/پنل بیمار را در خاموشی بارگیری نمی‌کند.

266pytest موفق (97.99s،3warning قبلی)؛ سپس51تست مقاله نهایی با byte/pixel limit موفق (31.11s). lint/build/version1.13.0، Ruffcritical، npmci/audit0، نصب47wheel دقیق/hash با mirror و تطبیقuv.lock، ممیزیJSON رسمیPyPI47+uvloopLinux0، migration عمومی و editorialپرشده/backuprestore موفق. frozen sync تازه ازindexاصلی و Linux/systemd/staging واقعی اجرا/پذیرش نشده‌اند.

مرورگر واقعی/APIcookie/CSRF ساختگی: HTML و sanitization، جدول/undo/redo/link/image، دسته/برچسب، pagination>30/60، autosaveHTML/typingduringdelay/503retry/409، تاریخچه/restore، cancelexitEscape، timezoneUTC و scheduledsnapshot مستقل، ناشربدونedit، نویسندهبدونpublish، readonlytext و نبودmutationbuttons، upload/edit/archive/total و publicdesktop390px بررسی شدند. Nginx1.28HTTP/verifiedHTTPS واقعی باheaders/SSR/schema/alias301/draft404/legacy410/search/category/tag/pages/sitemap/privatepublicmedia وclosedbooking گذشت. inventoryصفحهخاموش فقطmain/runtime/AppointmentGate/SEO داشت؛ PatientPortal/CAPTCHA وform/input بارگیری/نمایش نشدند.

خطاهای کشف‌شده و رفع‌شده: انتخاب فایل input را remount می‌کرد؛ setEditable اولیه فرم ناشر را dirty می‌کرد؛ پنجرهconfirm بومی مرورگر در ابزار بررسی گیر می‌کرد و با dialog قابل‌دسترسی داخل پنل جایگزین شد. خطاهای tempACL/Vitespawn با اجرای محلی مجاز، انتظارهای غلط دو تست با اصلاحfixture، و cleanupSQLite با closing رفع شدند. هشدارهای قدیمی pytest و listenhttp2 باقی‌اند. هیچ deploy/production/داده‌بیمار/مالک‌واقعی/پرداخت/SMS واقعی اجرا نشد.

جزئیات در PHASE_06_ARTICLES.md؛ وضعیت ارسال، SHA و tree وZIP بعد از انتشار در گزارش تحویل کنارoutputs ثبت می‌شوند. پس از mergeمرحله۶، مرحله۷ نظرات؛ سپس previewمرحله۸/تصمیم مالک، مرحله۹CI/سرعت و مرحله۱۰پذیرش مستقل باقی‌اند.

## 2026-10-01 — پذیرش محلی مرحله۷ نظرات، نسخه1.14.0

 public_comments بدون patientFK؛ نام نمایشی/متن ساده/optionalmedia/خدمت فعال/ترتیب، current/publicsnapshot، optimisticrevision، softarchive، RBAC مستقل comments.view/create/edit/publish/delete، audit حداقل بدون متن و مرجع خصوصی. رضایت+مرجع خصوصی+privacyreview شرط انتشار؛ تغییر محتوا در فرم تأییدها را پاک می‌کند و ذخیره بدون رضایت یا مرجع فوراً withdraw. ناشر بدونedit پس ازpreview storedsnapshot را منتشر می‌کند. هیچ hardcodedquote قدیمی واردDB نشده و empty state روشن است. نقش‌های موجود خودکار permission تازه نمی‌گیرند؛ مالک واقعی نساز. FAQ/گالری قابل مدیریت در شرط اختیاری نقشه‌راه و خارج محدوده فعلی‌اند.

نتایج

- 287backend موفق210.63s/3warningقدیمی،21اختصاصی رضایت/RBAC/media/snapshot/plaintext/privacy/bounds/pagination/CAS/revokedstaff.
- lint/build/version1.14.0/Ruff E9/F63/F7/F82 موفق؛ بدون وابستگی تازه. buildmain302.41KB/gzip97.07، comments9.70/3.45، CSS121.79/20.36. prerender باfallback امن چونAPI در دسترس نبود؛ SSR واقعی جدا آزموده شد.
- migration عمومی/editorial/comments موفق. comments0018→0019 empty(noimport)؛2نظر ساختگی پرشده، downgrade/reupgrade، حفظ article/media، coordinatedSQLitebackup+mediahashrestore، integrity/FK. downgrade0019 نظرات را حذف می‌کند؛ توقف نویسنده/backup هماهنگ DB+media/code/ENV/Nginx لازم؛ reupgrade خودکار محتوا را برنمی‌گرداند.
- مرورگر React/API واقعی باDB مستقل وfixture-only login/session: draft/image404، preview/disabledpublish/confirmpublish، متن<script> بی‌اثر، تصویرpublic200؛ edit تأییدها را پاک کرد، savewithdraw وpublicempty/photo404؛ reconsent/republication فقطfixture. پنل32در30+2، public14در12+2/loadmore، ناشربدونedit انتشار موفق، writerبدونpublish، readerبدونmutation،409حفظ متن/لغوreload/confirmنسخه تازه، guardخروج، softarchive32→31. دسکتاپ و390px عکس‌برداری شد.
- Nginx1.28 HTTP+HTTPS با CAfixture معتبر(verifyهرگزخاموش نشد): SSR/bootstrap، pagination، privateconsentدرHTML/APIغایب، anonymousstaff401، missingCSRF403/validaccepted، cache/securityheaders، photo وclosedbooking. PHASE_07_NGINX_CHECKS.json.

CAPTCHA/login واقعی وstagingخارجی/Linuxjobs/providerها اجرا نشده‌اند. no production/deploy/realowner/payment/SMS/patientdata. قدم بعد مرحله۸ previewظاهر و خدمات واقعی؛۹بهینه‌سازی/CI؛۱۰پذیرش خارجی و تحویل. ادعاهای آماری وsamplelegacy ظاهر در۸بازبینی می‌شوند.


## 2026-10-01 — اصلاحات نهایی مالک، مرحله۷ نسخه 1.14.0

قالب موجود فرانت مبنا شد و طراحی مرحله۸/صفحات خدمات جدید deferred است. نظرات با همان اسلایدر تیره و کارت شیشه‌ای عکس‌دار/نام/متن/سن اختیاری به پنل وصل شدند؛ داده hardcoded قدیمی وارد DB نشد. قالب مقالات با سربرگ پزشک و sidebar جست‌وجو/دسته/آخرین مطالب، فهرست سه‌ستونی و بخش قبلی تازه‌ترین ENT از مقاله‌های منتشرشده پنل تغذیه می‌شوند. دو CTA «رزرو نوبت» در خاموشی فقط دیالوگ پیام مدیر و در فعالی لینک سامانه‌اند؛ متن وضعیت از صفحه اصلی حذف شد. سه کارت AboutUs حذف، رنگ دکتر/تخصص و عنوان فوتر سفید و هدر اسکرول تیره شد.

۲۹۰ تست backend در 213.59s موفق با سه هشدار قدیمی؛ lint/build/version/Ruff critical و npm audit تازه صفر، migration عمومی/editorial/comments و backup/restore موفق. بررسی نهایی مرورگر عکس/سن، سن۲۹→۳۰ و resetرضایت/preview، desktop/viewport390، header/hero/footer، دیالوگ سفارشی، search+category و detail/sidebar/mobile اجرا شد. تصاویر نهایی جدا از grid/تصاویر قدیمی با عرض اشتباه ثبت شدند. HTTP و HTTPS Nginx با TLS معتبر و مقاله/سن/عکس/پیام سفارشی و عدم افشای رضایت موفق؛ جزئیات و محدودیت‌ها در PHASE_07_COMMENTS.md و دو گزارش JSON.

مرجع ظاهر عکس مالک و asset عمومی سایت اصلی از GET معتبر200 بود؛ مرورگر/جست‌وجو به سایت اصلی وصل نشدند. عکس سربرگ فقط پزشک استفاده شد؛ عکس دیگر حاوی بیمار کنار گذاشته و حذف شد. تصاویر آزمون هندسی و نظرات ساختگی‌اند. رزرو فعال صرفاً DB موقت آزموده و سپس خاموش شد. هیچ deploy یا تغییر production یا داده/مالک/پرداخت/SMS واقعی انجام نشده است. staging/CAPTCHA/provider/Linux/jobs/productionidentity و sync تازه index رسمی Python اجرا نشده‌اند. قدم بعد ارسال و ادغام۷/تطبیق SHA/tree، سپس۹ بدون تغییر ظاهر و۱۰ با گزارش گیت‌های خارجی؛۸ deferred.


## 2026-10-02 — مرحله۹ نسخه1.15.0

StaffPortal و AppointmentPortalV2 به بخش‌های حوزه‌ای و بارگیری تنبل منتقل شدند؛ router کارکنان به هشت حوزه و helpers مشترک تقسیم شد. قرارداد OpenAPI پیش/پس از استخراج یکسان بود؛ تغییر نسخه metadata عمدی است. JSX/رفتار قبلی مبنا است؛ ۱۷ فایل همراه فقط import سازمان‌دهی‌شده دارند و مقایسه AST با حذف import و یکسان‌سازی CRLF برابری بدنه را تأیید کرد. LegacyAppointmentsPanel بدون مصرف حذف شد.

فهرست بیماران آمار نوبت‌ها را گروهی برای صفحه می‌خواند، ترتیب پایدار دارد و بدون مجوز نوبت/پرونده query اطلاعات مربوطه نمی‌زند. دو آزمون معنی‌دار تعداد query و عدم نشت داده خصوصی اضافه شد. نمونه مستقل ۲۰ بیمار: اندازه صفحه۵ از۱۵ به۱۱ query، صفحه۲۰ از۳۰ به۱۱؛ سه تکرار. median محلی صفحه۵ 19.28→20.23ms و صفحه۲۰ 24.25→16.63ms؛ تضمین سرعت عملیاتی نیست. migration تازه نیاز نبود.

اندازه gzip با gzipSync یکسان: staff ورودی 36049→24680 bytes، patient session 19989→1565، main 95977→96057، CSS 21201→20974، مجموع JS 420059→434277 (افزایش 14218، حدود3.4%). استخراج، بارگیری را به زمان نیاز موکول می‌کند؛ مجموع JS کاهش نیافته. ۵۶ فایل فونت بدون ارجاع runtime، 3620974 bytes حذف شدند؛ هشت WOFF2 بهینه 206004 bytes و مجوز اصلی حفظ شدند. این کاهش artifact است، نه ادعای کاهش درخواست فونت‌هایی که قبلاً هم بارگیری نمی‌شدند. CSS قالب استفاده‌نشده قدیمی حذف شد؛ قالب پذیرفته‌شده مقالات دست‌نخورده است.

CI checkout تمیز برای Node24.19.0 و Python3.12 در Linux/Windows، lint صفر warning، build/نسخه، font/bundle budgets، fullpytest، migration عمومی/editorial/comments و restore، ممیزی dependency و Gitleaks تاریخچه تعریف شد. actionها به commit رسمی ثابت شده‌اند؛ هیچ deploy/secret production در workflow نیست. نتیجه remoteCI تا اجرای واقعی NOT RUN است؛ صرف تعریف CI پذیرش نیست.

شواهد محلی: ۲۹۲ pytest موفق در262.46s با سه هشدار قبلی؛ lint --max-warnings=0، build نهایی1.15.0، بودجه bundle و هشت فونت موفق. Ruffcritical موفق. سه migration با exit0 مستقل تأیید شدند؛ تلاش sandbox به‌دلیل tempACL شکست خورد، اجرای مجاز محلی گذشت. Gitleaks تاریخچه پیش از commit جدید بدون کشف بود؛ scan commit تحویل باید تکرار شود. frozen export موفق؛ sync تازه از index و pip-audit تازه محلی اجرا نشده‌اند و CI باید واقعاً اجرا شود.

مرورگر واقعی React/API/Nginx با fixture بیرونGit: داشبورد، تقویم، فهرست نوبت، برنامه نوبت‌دهی، خدمات، مرکز پیامکی و اطلاعات مطب بعد از lazyload بررسی شدند. پروفایل بیمار ساختگی و wizard مراحل۱→۲ بارگیری شدند؛ نوبت/پرداخت/پیامک ساخته نشد. آزمون فعال فقط SQLite موقت و سپس false شد؛ خود صفحه بیمار با تازه‌شدن سیاست بسته شد. خاموشی: forms/input صفر و فقط index/appointmentApi/AppointmentGate/SEO، بدون PatientPortal/CAPTCHA. هیرو سفید/طلایی و ظاهر قبلی حفظ شد. جزئیات فرم intake در مرورگر این مرحله اجرا نشده؛ تست‌های backend مرتبط برقرارند. NOT RUN را PASS نکن.

مالک تأیید کرد staging ندارد. مرحله۸ بازطراحی/صفحات جدید deferred، complete نیست؛ مرحله۱۰ پذیرش محلی/اسناد ممکن است، اما staging/provider/CAPTCHA واقعی/Linuxjobs/هویت production و deploy اجرا نشده‌اند. هیچ realowner/patientdata/payment/SMS/deploy/productionbooking استفاده/تغییر نشده. source/merge/tree و CI نهایی در رسید خروجی پس از ارسال ثبت می‌شوند.


## 2026-10-02 — ادغام۹ وپذیرش محلی۱۰

PR۹ merge913a43d1c6e69a4749a8aa3e38625b7de5692252/source9b75629732e48c2ee2bde45652ee27781b71a467/tree21bcac5e3906828279b2334296ea9997d87de718 verified. CI36957457614 چهارjobتماماًsuccess؛ freshfrozen/full292/migrations/restore/audits/secrets واقعی. PHASE_10_ACCEPTANCE گیت‌های باز/عدمstaging/productionidentitynonJSON وbackupjobsmedia limitationراثبتکرد. نمونهpublicmediapersistent0700 وproviderdisabled/merchantempty اصلاح،۲test0.09s وbashsyntax موفق؛ نصب/deployLinuxNOTRUN. مرحله۱۰ incomplete،۸deferred، هیچlive/owner/payment/SMS/patientdataتغییر/استفاده نشد.


بررسی نهایی هیرو: سرریز افقی۱۴px درdesktop دیده شد؛ فقط overflow-x-clip روی همانsection افزوده شد، ساختار/رنگ/چیدمان تغییر نکرد. مرورگر نهایی desktop clientWidth=scrollWidth=1265؛ lint/build/نسخه1.15.0 وbundlebudget نهایی موفق. screenshotهای phase10-hero-final.jpg وphase10-comments-final.jpg (کارت عکس هندسی/نام/متن/سن۲۹) بیرونGit ثبت شدند.
