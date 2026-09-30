# مرحله ۳ — مرکز تنظیمات، اسرار و اطلاعات مطب

نسخه 1.10.0، تاریخ 2026-09-30، Asia/Tehran. مبنا: main پس از PR شماره ۲، `18711829e0301e8b7d32ebd30de42cb3e2290dd3`. تغییرات این مرحله پس از آزمون در GitHub ادغام می‌شوند؛ شناسه نهایی commit/merge/tree و ZIP در گزارش تحویل کنار خروجی‌ها ثبت می‌شود.

## نتیجه و مجوزها

مرکز تنظیمات ۸ بخش اطلاعات مطب، نوبت‌دهی، امنیت و نشست، پیامک، پرداخت، کپچا، محتوا/سئو و وضعیت سامانه دارد. اطلاعات مطب از همان ClinicSetting قبلی استفاده می‌کند؛ تنظیمات قابل مدیریت ENV در SystemSetting نگهداری می‌شوند. مجوز settings.view/edit برای اطلاعات عمومی و secrets.manage فقط مدیرکل برای امنیت/سرویس/رمز/تاریخچه/بازیابی لازم است. endpoint مستقیم نیز مجوز را کنترل می‌کند و پس از قفل دوباره حساب و مجوز را می‌خواند.

۲۸ فیلد runtime با نوع، بازه، راهنما، مقدار پیش‌فرض و منبع تعریف شده‌اند: نام سرویس، نشست‌ها، سیاست‌های OTP/قفل ورود/ساخت کپچا، پیامک فراز و وب‌هوک، سقف آپلود، مبدأ frontend، مدت hold و تنظیمات درگاه. زیرساخت مانند DB، CORS، مسیر API، کلید امضا، کلید رمزگذاری، مسیرهای فایل و تنظیمات build از پنل تغییر نمی‌کند؛ صفحه وضعیت فقط توضیح و مقادیر عمومی لازم را نشان می‌دهد. Google/Cloudflare، کلید رزرو و مقاله/نظر با متن مرحله آینده مشخص‌اند و قابلیت اجرایی آن‌ها ادعا نمی‌شود.

## تقدم، هم‌زمانی و اعمال تغییر

- DB بر ENV و پیش‌فرض مقدم است. ENV تنها bootstrap زیرساخت/مقدار پایه است و فایل ENV از پنل نوشته نمی‌شود. API و jobs از runtime_settings در هر خواندن، DB تازه می‌گیرند؛ cache بین پردازش‌ها وجود ندارد. تغییر ENV restart همه سرویس‌ها می‌خواهد.
- هر ذخیره عمومی یا runtime نسخه مشترک دارد. BEGIN IMMEDIATE و expected revision از overwrite جلوگیری می‌کند؛ درخواست stale پاسخ 409 و راهنمای بارگیری می‌گیرد. دو نویسنده هم‌زمان فقط یکی موفق می‌شوند.
- تاریخچه snapshot عمومی و overlay رمزگذاری‌شده است. API تاریخچه تنها نسخه، نام فیلد، شناسه کارمند و زمان را می‌دهد. بازیابی کل اطلاعات مطب و runtime را با اعتبارسنجی سیاست فعلی، به‌عنوان نسخه تازه ثبت می‌کند؛ مقدار پایه ENV قدیمی snapshot نمی‌شود و به ENV فعلی وابسته است.
- ذخیره نامعتبر اتمیک رد می‌شود. در محیط اصلی console SMS و sandbox پرداخت ممنوع‌اند. FRONTEND_URL تنها مبدأ مجاز ENV می‌تواند باشد. طول OTP ۶ تا ۸ رقم است و فرم بیمار طول واقعی کد صادرشده را می‌گیرد.
- تب مرورگر دیگر با BroadcastChannel بدون token/داده حساس و refresh هنگام focus به‌روز می‌شود. refresh اجباری پنل و کنترل نسخه برای تغییرهای هم‌زمان وجود دارد؛ نشست امنیتی با سیاست سرور کنترل می‌شود.

## اسرار، backup و rotation

توکن وب‌هوک، کلید فراز و شناسه پذیرنده با Fernet authenticated encryption و کلید مستقل SETTINGS_ENCRYPTION_KEYS ذخیره می‌شوند. نام فیلد در payload رمزگذاری‌شده قرار دارد تا جابه‌جایی ciphertext بین فیلدها رد شود. API مقدار یا default رمز را برنمی‌گرداند؛ ورودی خالی حفظ رمز، پاک‌کردن صریح مقدار خالی رمزگذاری‌شده و جلوگیری از fallback به ENV، و بازنشانی صریح به ENV سه رفتار متفاوت‌اند. audit فقط نام فیلد/نسخه دارد. فقدان/خرابی کلید هنگام خواندن اسرار با 503 امن رد می‌شود.

کلید مستقل را فقط روی سرور خصوصی تولید و در محیط یکسان API/jobs تعریف کنید؛ هیچ کلید واقعی در سورس/ZIP نیست. DB و تمام کلیدهای لازم را جداگانه backup امن بگیرید. تعویض کلید: کلید تازه در ابتدای فهرست CSV و کلیدهای قبلی پس از آن، سپس restart همه سرویس‌ها. نوشته‌های تازه با کلید اول‌اند؛ داده‌های دست‌نخورده و تاریخچه قدیمی هنوز کلید قدیمی می‌خواهند. این مرحله ابزار بازرمزگذاری کامل تاریخچه ندارد؛ حذف کلید قدیمی بدون این کار دسترسی/بازیابی را از بین می‌برد. SECRET_KEY نباید کلید رمزگذاری باشد. توضیح سازوکار: [مستندات رسمی Fernet/MultiFernet](https://cryptography.io/en/latest/fernet/).

## خروجی شبکه و SSRF

وب‌هوک فقط HTTPS/443 و hostname دقیق فهرست ENV SMS_WEBHOOK_ALLOWED_HOSTS است؛ IP عددی، userinfo، fragment، scheme دیگر، شبکه خصوصی/loopback/link-local و DNS ترکیبی عمومی/خصوصی رد می‌شوند. در ذخیره و هر ارسال DNS اعتبارسنجی می‌شود؛ TCP به همان IP تأییدشده متصل و TLS/SNI با hostname اصلی بررسی می‌شود. proxy و redirect استفاده نمی‌شوند. probe فقط HEAD بدون token/payload و بدون ارسال پیامک است؛ پاسخ HTTP صرفاً رسیدن شبکه/TLS را ثابت می‌کند و صحت کلید یا تحویل پیامک را ثابت نمی‌کند. پاسخ remote در UI/log بازتاب داده نمی‌شود. اتصال واقعی سرویس خارجی روی staging هنوز پذیرش نشده است.

## اطلاعات مطب و سئو

عنوان/توضیح/تصویر SEO به ClinicSetting اضافه شده‌اند؛ نام، تخصص، نظام پزشکی، تلفن‌ها، ایمیل، نشانی/شهر/استان، مختصات، نقشه، ساعات کار، دامنه و شبکه‌های اجتماعی موجود reuse می‌شوند. URL عمومی HTTPS، دامنه iframe نقشه مطابق CSP و timezone معتبر می‌خواهد. React از public bootstrap همان HTML و سپس API استفاده می‌کند؛ footer/تماس/hero و metadata از context یکسان می‌خوانند.

Nginx همراه این نسخه مسیرهای دقیق صفحه اصلی/پنل‌ها/robots/sitemap/404 را به backend می‌دهد؛ assetها استاتیک می‌مانند. backend فقط assetهای build را از index.html می‌گیرد و title/meta/OG/Twitter/canonical/JSON-LD و متن اولیه مطب را از DB می‌سازد. Cache-Control:no-store و escape متن/JSON از HTML قدیمی و injection جلوگیری می‌کنند؛ ذخیره نیازمند نوشتن bundle یا build تازه نیست. private صفحات noindex در header/meta دارند، robots اجازه خواندن می‌دهد تا crawler noindex را ببیند. مسیر اشتباه واقعاً 404 و legacy articles هنوز 410 است.

این اجرای کامل SSR تمام بلوک‌های React نیست؛ متن اولیه مطب و metadata به‌روز است و UI کامل با JS mount می‌شود. backend و bundle ساخته‌شده برای این مسیرها لازم‌اند؛ نبود build پاسخ 503 می‌دهد. اگر Nginx جدید نصب نشود یا سایت صرفاً استاتیک بماند، HTML قدیمی همچنان محدودیت دارد. قالب service/article و توسعه schema در مراحل ۶/۸ هستند. انتخاب تصویر SEO اکنون URL است؛ uploader رسانه عمومی مرحله ۶ است.

## مهاجرت و rollback

0015 پس از 0014: revision و سه فیلد SEO در ClinicSetting، SystemSetting با overlay خالی/revision=1 و SettingRevision. هیچ secret از ENV به DB کپی و هیچ حسابی مدیرکل نمی‌شود. اطلاعات مطب/کارمند موجود حفظ می‌شوند. قبل از downgrade، backup DB+کلیدها و هماهنگ‌کردن ENV با تنظیمات مؤثر ضروری است؛ downgrade history/overrides/SEO را حذف می‌کند و کد قدیمی ENV را می‌خواند. downgrade تا پیش از 0014 کارکنان را طبق سیاست مرحله ۲ غیرفعال می‌کند. rollback صرفاً کد قدیمی بدون بازگرداندن DB/ENV/Nginx هماهنگ، روش امنی نیست.

## شواهد اجرا و محدودیت‌ها

- ۱۴۲ pytest PASS: ۱۰۴ پیشین و ۳۸ تست این مرحله. دسترسی owner، عدم افشای رمز در DB/API/public HTML/audit، کلید غلط/مفقود و rotation، clear/reset، bounds/atomicity، production guards، CAS هم‌زمان، refresh پردازش Python مستقل، HTML/schema/sitemap تازه و XSS، SSRF/DNS/redirect و probe، OTP ۸ رقمی و نام health/OpenAPI آزموده شدند.
- npm lint/build، نسخه واحد 1.10.0، uv sync frozen offline، Ruff بحرانی E9/F63/F7/F82 و migration round-trip/integrity/FK/payment uniqueness PASS. DB مهاجرت داده مطب قبلی را حفظ کرد.
- Nginx واقعی محلی: HTML تازه پس از ذخیره تلفن/title، no-store، homepage بدون noindex، پنل noindex، alias 301، 404/410، headerها، cookie/CSRF/logout، WebSocket upgrade/revocation و edge rate limit PASS. syntax HTTP/HTTPS PASS؛ warning قدیمی listen http2 باقی است.
- پنل React واقعی با API ساختگی مستقل در مرورگر دسکتاپ و عرض 390px بررسی شد: ذخیره اطلاعات عمومی، افزایش نسخه، secret بدون مقدار، تب‌های مدیرکل، read-only با مجوز محدود و نبود overflow افقی. screenshots ساختگی‌اند؛ ورود احرازشده مرورگر تا API واقعی روی staging باقی است. API cookie واقعی از smoke و TestClient آزموده شد.
- cryptography 50.0.0 اضافه شد؛ cryptography 46.0.7 در اسکن اولیه هشدار داشت و جایگزین شد. audit نهایی backend و frontend اجرایی صفر مورد شناخته‌شده گزارش کرد. DNS دانلود files.pythonhosted.org این میزبان خطا داشت؛ سه dependency جدید از mirror دریافت شدند و تمام hashهای artifact در lock با JSON رسمی PyPI تطبیق داده شدند؛ dependencyهای قبلی تغییر نکردند. registry رسمی و hashها در lock ثابت‌اند، artifact URLهای سه بسته جدید mirror هستند.
- خطاهای گذرای مسیر CSS fixture، temp directory ACL، quoting PowerShell و fixture چرخش کلید اصلاح شدند. یک تست قدیمی capacity نزدیک نیمه‌شب فقط یک slot پیدا می‌کرد؛ تاریخ کامل روز آینده انتخاب و کل suite دوباره پاس شد. سه warning قدیمی pytest باقی‌اند. خطای حل‌نشده‌ای در checks نهایی وجود ندارد.

هیچ deploy، پیامک/پرداخت واقعی، ساخت مالک production یا فعال‌سازی نوبت‌دهی انجام نشده است. previewها جمع شدند و fixture/DB/کلید/ساخت نهایی وارد Git/ZIP نمی‌شوند. مرحله بعد ۴: Google و Cloudflare با server validation، کنترل از همین مرکز تنظیمات و MFA مدیرکل؛ انتخاب سیاست ارائه‌دهنده/بازیابی را مستند کنید.
