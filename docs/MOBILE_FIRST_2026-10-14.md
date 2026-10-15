## آمادهٔ CI مرحله 1.19.1 — 2026-10-15

تغییرات رابط، دیالوگ‌ها، حذف/بازیابی و بنیاد mobile-first این مرحله از نظر تست‌های محلی آماده‌اند. [گزارش پذیرش](MOBILE_ACCEPTANCE_1.19.1.md) و [فهرست103فایل رابط](COMPONENT_AUDIT_1.19.1.md) دامنه را دقیق ثبت می‌کنند:126چیدمان پنل،30بیمار،60صفحه مقاله/خدمت،21وضعیت،هدر/فوتر و جریان‌های اصلی. قطع و بازیابی واقعی APIفرعی با حفظdraftو یک ارسال موفق نیز پذیرفته شد. full439PASS/16SKIP،گروه نهایی26PASS/16SKIP،build/lint/budget/fonts/chat/proxy/Ruffcriticalموفق؛ مجموعه‌ها همپوشان‌اند.

اکنون PR/CIپنجjob/merge و بستهcanonical مانده؛ قبلgreenهمهjobها ادغام نشود. این سند پیش ازcommit/PRاست و SHA/ادغام را ادعا نمی‌کند؛ رسید DELIVERY-1.19.1 کنار خروجی مرجع نهایی خواهد بود. گیت‌های بیرونی: nativekeyboard/zoom/offlineدستگاه،کلیدواقعیAI/CAPTCHA،بازبینیپزشکی،اطلاعاتواقعی مطب،staging/deploy. هیچ deploy یا رزرو/پرداخت/SMSproduction مجازنیست. این پوشش به معنی آزمون همه ترکیب‌های ممکن داده/نقش/حالت نیست.

پیش‌نمایش اصلی127.0.0.1:4173/API8000 روشن؛ تست مستقلlocalhost4174/API8001 دوباره روشن است. کپی بیمار3بیمارساختگی/3نوبت/72پیامساختگی/1عکسفردخیالی؛ اصلی2/2/69/0. secret و DB و پیام/تصویر بیمار واقعی واردGit/بسته/AIنشود. helperهایexactreplacementاین مرحله اجراشده‌اند،blindrerunنشوند. CAPTCHAفقطاستثنایمحدودreviewloopbackپیشین؛ مجوزهایپشت‌صحنه/رمز/MFAحفظ. اسناد تاریخی پایین‌تر ممکن است آمار قبل از تست نهایی داشته باشند.

## 1.19.1 — نتیجهٔ قابل بررسی، 2026-10-15

[گزارش مرحله و حدود پذیرش](MOBILE_ACCEPTANCE_1.19.1.md):126چیدمان پنل،21حالت صفحات وضعیت،6عرض عمومی، حذف/بازیابی واقعی ازUI و جریان ساختگی بیمار/چت بررسی شد. 439PASS/16SKIP وbuild/lint/budgetموفق؛ اسناد داخلdocsلینک گزارش را نسبت بههمانپوشه بخوانند. شاخه هنوز پیش از PR/CI/ادغام است؛ نتیجه نهایی از DELIVERY-1.19.1 کنار خروجی ثبت می‌شود. تمام حالت‌های تعاملی/دستگاه واقعی وگیت‌های بیرونی کامل اعلام نشده‌اند. قدم بعد QAکنترل‌های آخر، CIپنجjob،PRوmergeمجاز،بسته وادامهٔ موارد باقیماندهٔ نقشهراه است. هیچdeploy/رزرو/پرداخت/SMSproductionمجازنیست.

## نتیجهٔ تازهٔ ممیزی موبایل 1.19.1 — 2026-10-15

**هنوز uncommitted است؛ PR/CI/ادغام/بسته این مرحله انجام نشده‌اند.** مبنا همچنان PR24/main23b6029f51e677d71ffb7d44ef8619ae910d0460 است. یادداشت‌های پایین‌تر تاریخی‌اند.

| بخش | کار و شواهد فعلی |
|---|---|
| تست backend | 439 passed،16 skipped،4 warnings،198.72s؛ outputs/pytest191-full.xml. گروه محتوای بازیابی 55 passed جداگانه است و نباید به439 جمع شود. پس از این اجرا فقط frontend تغییر کرده است. |
| پنل | 126 مشاهده: هر21بخش در320/360/390/768/1024/1280. عرض سند و scrollWidth ناحیه محتوا از عرض مجاز بیرون نزد. BROWSER-STAFF-1.19.1.json؛ این پذیرش نمای پیش‌فرض است، نه تمام فرم‌های بازشده. |
| دیالوگ‌ها | نظر/مقاله/خدمت وبسایت/نمونه‌کار/نقش/کارمند در StaffEditorDialog؛ حفظ draft هنگام لغو خروج و Tab/ShiftTab، Escape، isolation و برگشت دقیق تمرکز به «نقش جدید» و «تصویر تازه» در مرورگر موفق. پیام خطا/موفقیت نقش و گالری داخل دیالوگ دیده می‌شود. |
| حذف قابل بازگشت | تصویر خیالی تازه upload/delete/trash/restore، مقاله LOCAL_QA_191 ساخته و delete/restore شد؛ مقاله پیش‌نویس ماند. هر دو پس از تست دوباره به بخش حذف‌شده‌ها رفتند؛ داده اصلی دست نخورده. |
| صفحه عمومی | خانه/فهرست مقاله/یک مقاله/منتوپلاستی در هر6عرض بدون overflow. در320، gridهای12/8ستونه با span نامتناسب و فاصله زیاد باعث overflow بودند؛ FAQ و فوتر در گوشی یک ستون واقعی شدند. متن معرفی نظرات wrap و decorative offsetها محصور شدند. BROWSER-REFLOW-1.19.1.json. |
| فوتر و منو | منوی5گزینه، تماس با ما#footer، نمونه‌کارها#samples؛ لوگو بزرگ‌تر؛ footerbottom788.55 وnavtop788.5 در390×844 انتهای پایدار، فاصله اضافی صفر. screenshot mobile-footer-1.19.1.jpg. BackToTop به0 رسید، با باقی‌ماندن#footer برنگشت و پنهان شد. |
| بیمار | محیط جدا localhost4174/API8001؛ رزرو ساختگی بدون پرداخت ازUI، ثبت پاسخ فرم ساختگی، جابه‌جایی25→26مهر11:00 موفق و فرم محفوظ. هرگز رزرو/پرداخت/SMS واقعی رخ نداد. BROWSER-PATIENT-1.19.1.json. |
| چت | پیام LOCAL_QA_191 و عکس فرد خیالی از مرورگر در کپیDB ارسال شد؛ عکس loaded، الزام باقی4→3، textarea16px، دیالوگ nested و Escape/بازگشت موفق. screenshot patient-chat-synthetic-1.19.1.jpg. تصویر واقعی بیمار نیست و هیچ cache/فایل خصوصی واردGit نمی‌شود. |
| پاسخ دیررس | Wizard تاریخ‌های خدمت قبلی را دیگر نگه نمی‌دارد؛ دریافت dates/slots به service/date/step فعلی محدود است. Reschedule شماره درخواست دارد تا پاسخ قدیمی روی انتخاب تازه ننشیند. بستن/ارسال تکراری هنگام write مسدود. build/lint تازه و QA نهایی تغییرات کوچک باقی است. |
| کنترل مشترک | AppSelect برای گزینه خالی crash ندارد، aria-activedescendant، Home/End، خروجTab، popupمحدود به visualViewport دارد؛ Escape روی منوی بسته باید به dialog برسد. AutoGrowTextarea با تغییرعرض دوباره اندازه می‌شود. CloseButton و منوهای اصلی target44px؛ لوگو در320 می‌تواند کمی جمع شود. این آخرین کدها نیازمند QA تازه هستند. |

در اجرای مرورگر یک filechooser حدود16دقیقه در ابزار معطل ماند و بعد موفق شد؛ این زمان ابزار است و سنجش latency محصول محسوب نمی‌شود. دو بار نشست ابزار و سرورهای exec از بین رفتند؛ اکنون Start-Process Hidden با logهای بیرونGit استفاده می‌شود. محیط primary API5296/preview17328 و secondary API11620/preview15932 در آخرین بررسی زنده بودند؛ ادامه‌دهنده PID را تأیید کند. Browser2 سه tab:1صفحهخدمت عمومی،2بیمار،3کارکنان؛ markHandoff شده‌اند، قبلادامه inventoryبررسی شود. viewportفعلی1024×768 رویtab3، مقدار واقعیinnerWidthبرایهرQAخوانده شود. رمز محلی فقط درگفتگو داده شده و دراسناد/بسته ثبت نشود.

فقط در patient-mobile-review.db پس از backup patient-mobile-before-schedule191-*.db، ساعات کاملاًساختگی هفت‌روزه و یک سؤال LOCAL_QA_191 تعریف شد تا فرم‌ها واقعاً آزمایش شوند؛ primaryreview تغییر ساعات/رزرو نداده است. شمارش بدون محتوا در LOCAL-QA-COUNTS-1.19.1.json است. helperهای exactreplacement جدید اجرا شده‌اند؛ دوباره کورکورانه اجرا نشوند. APIvenv مسیر مطلق D:/AI/Chatgpt/DrZamani/.local/api-venv/Scripts/python.exe و Ruff درqualityvenv. EOL mixed Landing باbytes حفظ شده؛ apply_patchمستقیمrepo رویreparsepoint ممکن نیست.

**قدم بعد:** نتیجه build/lint/budgetآخر را ثبت؛ تست AppSelect/textarea و target44، حالت‌های بازشده خدمات/برنامه/تنظیمات و statusها/صفحات عمومی باقی، سپس اسناد و نقشه101کامپوننت را با شواهد دقیق تازه کن. تمام ممیزی/کیبورد و zoom/nativeDevice هنوز کامل اعلام نشود. بعد fullCI پنجjob،PR،ادغام مجاز و بستهcanonical+رسید+AI. PR24 و کارهای1.19.0 دوباره اجرا نشوند. کلید واقعیAI/CAPTCHA، مرورپزشکیانسانی، devicekeyboard/zoom/offline و staging/deploy گیت بیرونی‌اند. هیچdeploy/پرداخت/رزرو/SMSproduction یا داده بیمار/credential درGit مجاز نیست.

## ادامهٔ مرحله 1.19.1 — 2026-10-15، هنوز ادغام نشده

شاخه `feat/mobile-first-audit-20261014` بر پایه main `23b6029f51e677d71ffb7d44ef8619ae910d0460`؛ PR24 و بسته 1.19.0 کامل‌اند و تکرار نشوند. تغییرات این مرحله هنوز uncommitted و پذیرش نهایی مرورگر/CI/PR/بسته باقی است.

- منوی کارکنان در چهار دسته پیشخوان و مراجعان، برنامه مطب، محتوای وبسایت و مدیریت مرتب شد؛ مجوزهای backend و فیلتر RBAC حفظ شد. رسانه عمومی با نام «تصاویر» نمایش داده می‌شود. رفع ارث‌بری dark در staff/appointment برای خوانایی کارت‌های سفید؛ امضای Raviel در صفحه عادی کارکنان حذف شده است.
- ویرایش نظر، مقاله و خدمت وبسایت در دیالوگ مستقل و قابل اسکرول داخل صفحه، با حفظ draft/تأیید خروج باز می‌شود. تأییدها در portal مستقل، focus/Escape/Tab/background-inert دارند. قفل مشترک با شمارش مصرف‌کنندگان اضافه شد تا بستن همزمان دیالوگ‌های تو‌در‌تو، صفحه را inert یا بدون اسکرول رها نکند. پذیرش مرورگر این حالت هنوز باقی است. گالری و بعضی فرم‌های عملیاتی هنوز نیازمند بازبینی‌اند.
- حذف و بازیابی مقاله و تصویر با مجوز سمت سرور و کنترل نسخه؛ مقاله بازیابی‌شده فقط پیش‌نویس می‌شود. رسانه مفقود بازیابی نمی‌شود و تصویر وابسته به محتوای فعال قابل حذف نیست. حذف خدمت نوبت‌دهی فقط غیرفعال‌سازی قابل بازگشت است و نوبت/تاریخچه/قیمت/مدت را حفظ می‌کند. خدمات غیرفعال و بایگانی‌شده وضعیت مشترک دارند؛ حذف فیزیکی اضافه نشده است.
- 55 تست محتوا/بازیابی با یک هشدار وابستگی موفق، JUnit `outputs/pytest191-recycle.xml`. ساخت و lint بدون هشدار و Ruff critical موفق. Bundle main76614/staff26385/allJS440191/allCSS24920 و همه زیر سقف ثابت‌اند؛ fonts/chat/proxy موفق. proxy ابتدا به علت sandbox EPERM روی vite-temp اجرا نشد و در محیط مجاز موفق شد. full pytest شروع شده و هنوز نتیجه نهایی ثبت نشده؛ آن را PASS فرض نکنید.
- منوی پایین گوشی پنج گزینه، تماس با ما به #footer و نمونه‌کارها به #samples؛ لوگوی 160px؛ فضای پایین با ارتفاع واقعی منو رزرو می‌شود. BackToTop متحرک فقط پس از اسکرول. Drawer با translate280ms به جای right/top پشتیبانی‌نشده. همه نیازمند پذیرش مرورگر تازه هستند. مشاهده سریع Ctrl+End ممکن است وسط smooth-scroll باشد؛ علت هر پرش را بدون خواندن اندازه‌های پایدار به content-visibility نسبت ندهید.

تحقیق الگوهای پنل: [WAI modal dialog](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/)، [Fluent navigation](https://fluent2.microsoft.design/components/web/react/core/nav/usage/)، [GOV.UK question pages](https://design-system.service.gov.uk/patterns/question-pages/). تصمیم‌ها: دسته‌بندی کارهای مرتبط، دیالوگ نزدیک به عمل کاربر، تمرکز محدود و برگشت‌پذیر، کنترل خروج بدون از دست دادن پیش‌نویس؛ فرم‌های مرتبط کارکنان بی‌دلیل به صفحه‌های متعدد شکسته نمی‌شوند.

محیط primary محلی مجدداً API8000 PID16624 و preview4173 راه‌اندازی شد؛ PID/session در ادامه زنده بررسی شود. review.db حفظ شده، CAPTCHA فقط استثنای دقیق loopback/dev/debug/review طبق دستور مالک؛ SMS/رزرو/درگاه production خاموش. محیط جداگانه patient4174/8001 فعلاً نیازمند بررسی زنده است؛ پس از OTP آزمایشی تعداد بیمار ساختگی در کپی به3 رسیده و یادداشت قدیمی2 برای کپی منسوخ است. credential در AI/Git/بسته ثبت نشود. هیچ داده واقعی بیمار مجاز نیست.

باقی: QA واقعی پنل/دیالوگ تو‌در‌تو/حذف و بازیابی با داده ساختگی، گالری/خدمات عملیاتی، ماتریس public+patient و تمام101کامپوننت، منوی متحرک و footer/backtotop در اندازه‌های تعیین‌شده، fulltests/CI/PR/merge و بسته canonical. کلید واقعی AI/CAPTCHA، مرور پزشکی انسانی، keyboard/zoom/offline دستگاه واقعی و staging/deploy گیت‌های بیرونی مستقل‌اند. هیچ ادعای اتمام کامل mobile-first یا deploy وجود ندارد.

# بررسی mobile-first — 2026-10-14، در حال انجام

این سند، پژوهش و موجودی بررسی است؛ اتمام ممیزی همه اجزا را اعلام نمی‌کند.

## مبنای طراحی و منابع

چیدمان ابتدا در عرض کوچک و سپس با فضای واقعی محتوا به چند ستون تبدیل می‌شود. تصاویر اندازه اعلام‌شده دارند تا فضای آن‌ها قبل از بارگیری رزرو شود. جزئیات توصیه‌های رسمی: [web.dev](https://web.dev/articles/responsive-web-design-basics) و [MDN](https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/CSS_layout/Responsive_Design).

ری‌فلو در320CSSpx و بزرگ‌نمایی حفظ می‌شود؛ جدول و دادهٔ واقعاً دوبعدی می‌تواند داخل ظرف خود اسکرول داشته باشد، صفحه نباید افقی جابه‌جا شود. کنترل‌های مستقل حداقل24×24یا فاصله معادل، و برای اقدام‌های اصلی حدود44px هدف‌گذاری می‌شوند. استثناهای لینک در متن از دکمه جداست. مرجع: [WCAG2.2](https://www.w3.org/TR/WCAG22/) و [شرح reflow](https://www.w3.org/WAI/WCAG21/Understanding/reflow).

صفحه‌کلید ممکن است فقطviewportدیداری را کوچک کند. resizes-content برای مرورگرهای پشتیبان درخواست می‌شود، بدون بستن zoom؛ اسکرول ضروری فرم در ارتفاع کم باقی است. این تنظیم جایگزین تست گوشی واقعی نیست. [MDN VisualViewport](https://developer.mozilla.org/en-US/docs/Web/API/VisualViewport).

هویت آبی/طلایی، اندازه متن خوانا، دسترسی فقط به همان وظیفه، دکمه بدون وابستگی بهhover، focusمشخص وprefers-reduced-motion معیار کار هستند. طرح سایت تجاری دیگر کپی نمی‌شود؛ این الگوهای رسمی به ساختار موجود پیاده می‌شوند.

## یافته‌ها و اصلاح‌های تأییدشده تا این نقطه

- چت در320×568 حداقلارتفاع620داشت وورودی خارجviewportمی‌افتاد. ارتفاعAppکارکنان100dvh وfooterواقعیflex؛ mainمحتوا minheight0 وscrollداخلپنل، chatheight100%شد. پس از تغییرpage320×568،textareaدر441..482 وfooterدر503..568بود؛ اسکرولصفحهاضافه حذف شد. layoutسایرپنل‌ها هنوز باید تک‌تک دیده شود.
- ستونimplicitgrid حداقل محتوای341pxساخت وh3عنوان24pxبرید. grid-cols-1/min-w-0 وfont16pxعنوانchat،header320pxوheading66..210 تأییدشد.
- منوی کارکنان بهDrawerمشترک با focustrap/Escape/returnfocus وaria-hiddenپشتصفحه تبدیل شد. Escapeازbuttonداخلمنو بستهشد وfocusبهtriggerبرگشت. positiveboundsDrawer وARIAایزوله برایهمهمنوها بهبود؛ نسخه آخر نیازمندbuild/QAاست.
- چت درdesktopکوچک دو ستون، جزئیات فقطxl؛ درموبایل فهرست/گفتگو جدا بادکمهبازگشت. keyboard/landscapeوآزمون1024..1280باقی.
- کارت آمار درموبایل قبلاًhiddenبود؛ زیرعکس باlayoutطبیعی قابل نمایش،دسکتاپoverlayهمانقبلی. Counterوfloatحفظ؛ عدد میانی وفضایbottom هنوزQAباقی.
- رزروهدر320pxدولاینشد؛ logobase128وnowrapدکمهدرکد اصلاح،آخرینbuild/QAباقی. spacingنامپزشکبهبود.
- تصاویرگالری width/height واقعیpublicmediaباqueryگروهی/static614×768؛ حذفمدیاfailclosed،بدونانتشارmetadataخصوصی. SaveData/2concurrent/idledeferredتصاویرقبلی حفظ.

## ماتریس بررسی

| سطح | اجزا | وضعیت فعلی |
|---|---|---|
| عمومی | هدر/منو/هیرو/آمار/خدمات/نظر/گالری/FAQ/مقالات/نقشه/فوتر | منبع و اولین320بررسی؛ همهwidth/stateها ناتمام |
| محتوا | articleindex/search/filter/pagination/detail/sources/hero/serviceCTA | سئو و servicebrowserقبلی؛ ماتریس موبایل باقی |
| ورود و خطا | staff/patient/MFA/CAPTCHA/404/maintenance/connection/offline/bookingclosed | staffچندعرض قبلی؛ actualchatdisconnect/recoverydone؛ فرمpatient/gatesواقعی باقی |
| کارکنان | داشبورد/منو/تقویم/نوبت/بیمار/انتظار/مالی/SMS/audit/settings/roles | dashboard/chat320done؛ هرپنل+forms/dialogها باقی |
| CMS | مقاله/editor/SEO/AI/media/gallery/comments/FAQ/home/service | serviceupload/draft/SEOauthenticateddone؛ mobilematrixباقی |
| بیمار | profile/intake/booking/reschedule/chat/attachments | رزروproductionخاموش؛ محیط ساختگی مجزا لازم |
| مشترک | Dialog/Drawer/button/select/form/calendar/textarea/toast/empty/loading/status | sourceinventory؛ functional/screenresize/focus/touchحالت‌ها هنوز درحال کار |

## همه کامپوننت‌های موجود

در هر فایل، الگوهای سایز ثابت وoverflow برای تعیین تست دیده شده؛ scanمنبع، تأیید بصری یا آزمون رفتاری نیست. inventoryماشینی کنارخروجی ثبت است. فایل‌های index/barrel بدونrender جزو این جدول نیستند.

| فایل | مرورگر/تعامل |
|---|---|
|`src/components/Accordion/Accordion.tsx`|در ماتریس سطح مرتبط؛ پذیرش کامل هنوز باقی|
|`src/components/Accordion/index.tsx`|در ماتریس سطح مرتبط؛ پذیرش کامل هنوز باقی|
|`src/components/AppSelect/AppSelect.tsx`|در ماتریس سطح مرتبط؛ پذیرش کامل هنوز باقی|
|`src/components/ArticleEmpty.tsx`|در ماتریس سطح مرتبط؛ پذیرش کامل هنوز باقی|
|`src/components/AutoGrowTextarea/AutoGrowTextarea.tsx`|در ماتریس سطح مرتبط؛ پذیرش کامل هنوز باقی|
|`src/components/AvailabilityCalendar/AvailabilityCalendar.tsx`|در ماتریس سطح مرتبط؛ پذیرش کامل هنوز باقی|
|`src/components/BookingClosed.tsx`|در ماتریس سطح مرتبط؛ پذیرش کامل هنوز باقی|
|`src/components/BookingNotice.tsx`|در ماتریس سطح مرتبط؛ پذیرش کامل هنوز باقی|
|`src/components/BotProtection.tsx`|در ماتریس سطح مرتبط؛ پذیرش کامل هنوز باقی|
|`src/components/BusinessHoursView.tsx`|در ماتریس سطح مرتبط؛ پذیرش کامل هنوز باقی|
|`src/components/Button/Button.tsx`|در ماتریس سطح مرتبط؛ پذیرش کامل هنوز باقی|
|`src/components/Button/index.tsx`|در ماتریس سطح مرتبط؛ پذیرش کامل هنوز باقی|
|`src/components/Card/Card.tsx`|در ماتریس سطح مرتبط؛ پذیرش کامل هنوز باقی|
|`src/components/Card/index.tsx`|در ماتریس سطح مرتبط؛ پذیرش کامل هنوز باقی|
|`src/components/CloseButton/CloseButton.tsx`|در ماتریس سطح مرتبط؛ پذیرش کامل هنوز باقی|
|`src/components/CloseButton/index.tsx`|در ماتریس سطح مرتبط؛ پذیرش کامل هنوز باقی|
|`src/components/ConnectionStatus.tsx`|در ماتریس سطح مرتبط؛ پذیرش کامل هنوز باقی|
|`src/components/ConsultationDialog/ConsultationDialog.tsx`|در ماتریس سطح مرتبط؛ پذیرش کامل هنوز باقی|
|`src/components/Dialog/Dialog.tsx`|در ماتریس سطح مرتبط؛ پذیرش کامل هنوز باقی|
|`src/components/Dialog/index.tsx`|در ماتریس سطح مرتبط؛ پذیرش کامل هنوز باقی|
|`src/components/DoctorEdgeDefs.tsx`|در ماتریس سطح مرتبط؛ پذیرش کامل هنوز باقی|
|`src/components/Drawer/Drawer.tsx`|در ماتریس سطح مرتبط؛ پذیرش کامل هنوز باقی|
|`src/components/Drawer/index.tsx`|در ماتریس سطح مرتبط؛ پذیرش کامل هنوز باقی|
|`src/components/ErrorBoundary.tsx`|در ماتریس سطح مرتبط؛ پذیرش کامل هنوز باقی|
|`src/components/Form/Form.tsx`|در ماتریس سطح مرتبط؛ پذیرش کامل هنوز باقی|
|`src/components/Form/FormContainer.tsx`|در ماتریس سطح مرتبط؛ پذیرش کامل هنوز باقی|
|`src/components/Form/FormItem.tsx`|در ماتریس سطح مرتبط؛ پذیرش کامل هنوز باقی|
|`src/components/Form/index.tsx`|در ماتریس سطح مرتبط؛ پذیرش کامل هنوز باقی|
|`src/components/Iframe/index.tsx`|در ماتریس سطح مرتبط؛ پذیرش کامل هنوز باقی|
|`src/components/Iframe/LazyIframe.tsx`|در ماتریس سطح مرتبط؛ پذیرش کامل هنوز باقی|
|`src/components/InputGroup/Addon.tsx`|در ماتریس سطح مرتبط؛ پذیرش کامل هنوز باقی|
|`src/components/InputGroup/index.tsx`|در ماتریس سطح مرتبط؛ پذیرش کامل هنوز باقی|
|`src/components/InputGroup/InputGroup.tsx`|در ماتریس سطح مرتبط؛ پذیرش کامل هنوز باقی|
|`src/components/JalaliDatePicker/JalaliDatePicker.tsx`|در ماتریس سطح مرتبط؛ پذیرش کامل هنوز باقی|
|`src/components/Motion/Motion.tsx`|در ماتریس سطح مرتبط؛ پذیرش کامل هنوز باقی|
|`src/components/PatientRescheduleDialog/PatientRescheduleDialog.tsx`|در ماتریس سطح مرتبط؛ پذیرش کامل هنوز باقی|
|`src/components/RavielCredit.tsx`|در ماتریس سطح مرتبط؛ پذیرش کامل هنوز باقی|
|`src/components/SEO/index.tsx`|در ماتریس سطح مرتبط؛ پذیرش کامل هنوز باقی|
|`src/components/SEO/Seo.tsx`|در ماتریس سطح مرتبط؛ پذیرش کامل هنوز باقی|
|`src/components/ServiceIcon/ServiceIcon.tsx`|در ماتریس سطح مرتبط؛ پذیرش کامل هنوز باقی|
|`src/components/Spinner/Spinner.tsx`|در ماتریس سطح مرتبط؛ پذیرش کامل هنوز باقی|
|`src/components/StatusPage.tsx`|در ماتریس سطح مرتبط؛ پذیرش کامل هنوز باقی|
|`src/components/Toast/Toast.tsx`|در ماتریس سطح مرتبط؛ پذیرش کامل هنوز باقی|
|`src/pages/Appointment/AppointmentGate.tsx`|در ماتریس سطح مرتبط؛ پذیرش کامل هنوز باقی|
|`src/pages/Appointment/AppointmentPortalV2.tsx`|در ماتریس سطح مرتبط؛ پذیرش کامل هنوز باقی|
|`src/pages/Appointment/PatientAppointmentCard.tsx`|در ماتریس سطح مرتبط؛ پذیرش کامل هنوز باقی|
|`src/pages/Appointment/PatientBookingWizard.tsx`|در ماتریس سطح مرتبط؛ پذیرش کامل هنوز باقی|
|`src/pages/Appointment/PatientIntakeDialog.tsx`|در ماتریس سطح مرتبط؛ پذیرش کامل هنوز باقی|
|`src/pages/Appointment/PatientLogin.tsx`|در ماتریس سطح مرتبط؛ پذیرش کامل هنوز باقی|
|`src/pages/Appointment/PatientPortal.tsx`|در ماتریس سطح مرتبط؛ پذیرش کامل هنوز باقی|
|`src/pages/Appointment/PatientProfileForm.tsx`|در ماتریس سطح مرتبط؛ پذیرش کامل هنوز باقی|
|`src/pages/Appointment/PatientShells.tsx`|در ماتریس سطح مرتبط؛ پذیرش کامل هنوز باقی|
|`src/pages/Landing/components/AboutUs.tsx`|در ماتریس سطح مرتبط؛ پذیرش کامل هنوز باقی|
|`src/pages/Landing/components/AnimatedStats.tsx`|در ماتریس سطح مرتبط؛ پذیرش کامل هنوز باقی|
|`src/pages/Landing/components/BlogCard.tsx`|در ماتریس سطح مرتبط؛ پذیرش کامل هنوز باقی|
|`src/pages/Landing/components/BlogPreview.tsx`|در ماتریس سطح مرتبط؛ پذیرش کامل هنوز باقی|
|`src/pages/Landing/components/FAQ.tsx`|در ماتریس سطح مرتبط؛ پذیرش کامل هنوز باقی|
|`src/pages/Landing/components/Footer.tsx`|در ماتریس سطح مرتبط؛ پذیرش کامل هنوز باقی|
|`src/pages/Landing/components/GlassCard.tsx`|در ماتریس سطح مرتبط؛ پذیرش کامل هنوز باقی|
|`src/pages/Landing/components/HeroContent.tsx`|در ماتریس سطح مرتبط؛ پذیرش کامل هنوز باقی|
|`src/pages/Landing/components/MobileTabBar.tsx`|در ماتریس سطح مرتبط؛ پذیرش کامل هنوز باقی|
|`src/pages/Landing/components/NavigationBar.tsx`|در ماتریس سطح مرتبط؛ پذیرش کامل هنوز باقی|
|`src/pages/Landing/components/NavList.tsx`|در ماتریس سطح مرتبط؛ پذیرش کامل هنوز باقی|
|`src/pages/Landing/components/PatientComment.tsx`|در ماتریس سطح مرتبط؛ پذیرش کامل هنوز باقی|
|`src/pages/Landing/components/PatientsComments.tsx`|در ماتریس سطح مرتبط؛ پذیرش کامل هنوز باقی|
|`src/pages/Landing/components/ReserveDialog.tsx`|در ماتریس سطح مرتبط؛ پذیرش کامل هنوز باقی|
|`src/pages/Landing/components/Samples.tsx`|در ماتریس سطح مرتبط؛ پذیرش کامل هنوز باقی|
|`src/pages/Landing/components/ServiceCard.tsx`|در ماتریس سطح مرتبط؛ پذیرش کامل هنوز باقی|
|`src/pages/Landing/components/Services.tsx`|در ماتریس سطح مرتبط؛ پذیرش کامل هنوز باقی|
|`src/pages/Landing/components/TextGenerateEffect.tsx`|در ماتریس سطح مرتبط؛ پذیرش کامل هنوز باقی|
|`src/pages/Landing/Landing.tsx`|در ماتریس سطح مرتبط؛ پذیرش کامل هنوز باقی|
|`src/pages/Loading/Loading.tsx`|در ماتریس سطح مرتبط؛ پذیرش کامل هنوز باقی|
|`src/pages/NotFound/NotFound.tsx`|در ماتریس سطح مرتبط؛ پذیرش کامل هنوز باقی|
|`src/pages/Staff/AppointmentsPanel.tsx`|در ماتریس سطح مرتبط؛ پذیرش کامل هنوز باقی|
|`src/pages/Staff/ArticleEditor.tsx`|در ماتریس سطح مرتبط؛ پذیرش کامل هنوز باقی|
|`src/pages/Staff/CaptchaSetupPanel.tsx`|در ماتریس سطح مرتبط؛ پذیرش کامل هنوز باقی|
|`src/pages/Staff/ClinicInfoPanel.tsx`|در ماتریس سطح مرتبط؛ پذیرش کامل هنوز باقی|
|`src/pages/Staff/DetailsChevron.tsx`|در ماتریس سطح مرتبط؛ پذیرش کامل هنوز باقی|
|`src/pages/Staff/EditorialSeoAssistant.tsx`|در ماتریس سطح مرتبط؛ پذیرش کامل هنوز باقی|
|`src/pages/Staff/MediaPicker.tsx`|در ماتریس سطح مرتبط؛ پذیرش کامل هنوز باقی|
|`src/pages/Staff/SchedulePanel.tsx`|در ماتریس سطح مرتبط؛ پذیرش کامل هنوز باقی|
|`src/pages/Staff/SeoPreview.tsx`|در ماتریس سطح مرتبط؛ پذیرش کامل هنوز باقی|
|`src/pages/Staff/ServicesPanel.tsx`|در ماتریس سطح مرتبط؛ پذیرش کامل هنوز باقی|
|`src/pages/Staff/SmsCenterPanel.tsx`|در ماتریس سطح مرتبط؛ پذیرش کامل هنوز باقی|
|`src/pages/Staff/StaffAccessPanel.tsx`|در ماتریس سطح مرتبط؛ پذیرش کامل هنوز باقی|
|`src/pages/Staff/StaffArticlesPanel.tsx`|در ماتریس سطح مرتبط؛ پذیرش کامل هنوز باقی|
|`src/pages/Staff/StaffChatWorkspace.tsx`|در ماتریس سطح مرتبط؛ پذیرش کامل هنوز باقی|
|`src/pages/Staff/StaffCommentsPanel.tsx`|در ماتریس سطح مرتبط؛ پذیرش کامل هنوز باقی|
|`src/pages/Staff/StaffDashboardCharts.tsx`|در ماتریس سطح مرتبط؛ پذیرش کامل هنوز باقی|
|`src/pages/Staff/StaffLogin.tsx`|در ماتریس سطح مرتبط؛ پذیرش کامل هنوز باقی|
|`src/pages/Staff/StaffMediaPanel.tsx`|در ماتریس سطح مرتبط؛ پذیرش کامل هنوز باقی|
|`src/pages/Staff/StaffMfaPanel.tsx`|در ماتریس سطح مرتبط؛ پذیرش کامل هنوز باقی|
|`src/pages/Staff/StaffOperationsPanels.tsx`|در ماتریس سطح مرتبط؛ پذیرش کامل هنوز باقی|
|`src/pages/Staff/StaffPasswordPanel.tsx`|در ماتریس سطح مرتبط؛ پذیرش کامل هنوز باقی|
|`src/pages/Staff/StaffPatientsPanel.tsx`|در ماتریس سطح مرتبط؛ پذیرش کامل هنوز باقی|
|`src/pages/Staff/StaffPortal.tsx`|در ماتریس سطح مرتبط؛ پذیرش کامل هنوز باقی|
|`src/pages/Staff/StaffSettingsPanel.tsx`|در ماتریس سطح مرتبط؛ پذیرش کامل هنوز باقی|
|`src/pages/Staff/StaffSiteContentPanel.tsx`|در ماتریس سطح مرتبط؛ پذیرش کامل هنوز باقی|
|`src/pages/Staff/StaffSiteGalleryPanel.tsx`|در ماتریس سطح مرتبط؛ پذیرش کامل هنوز باقی|
|`src/pages/Staff/StaffSiteServicesPanel.tsx`|در ماتریس سطح مرتبط؛ پذیرش کامل هنوز باقی|
|`src/pages/Staff/useContentConfirm.tsx`|در ماتریس سطح مرتبط؛ پذیرش کامل هنوز باقی|

### تقویم و ورود بیمار

ورود شماره و OTP در320×568 بدون اسکرول اضافه؛ اطلاعات کامل پروفایل بلند است و اسکرول ضروری حفظ می‌شود. انتخاب سال1380 و روز، تکمیل فرم با شناسهLOCAL_MOBILE_TEST_191 ونامساختگی بهپنلبیماررسید؛ کد توسعهconsole است و SMSواقعی نرفت. fillابزار برایOTP controlled فیلدهاonChange را درست فعال نکرد؛ تایپ key بهkey و focusخودکار موفق، نخستینcodeمنقضی و resendکدتازهعملکردصحیح داشت. OTPبزرگtext-lg با اصلاحfontglobalکوچک نمی‌شود. popupتقویم درviewport320باbounds57..273 و329..545جا شد،اماarrowهاariaLabelنداشتند؛ renderButtonرسمی باbutton44×44ونامفارسی افزوده شد،onOpenPickNewDateFalse مانع انتخاب خودکار امروز باصرفبازکردن می‌شود. inputModeNoneبرایکنترلnoneditable،zoomقفلنشده. آخرینکدcalendarنیازbuild/QAدارد. [APIرسمیheader](https://shahabyazdi.github.io/react-multi-date-picker/header/) وtypesنسخهlocal4.5.2 مبناست.

### بازخورد تازه مالک — منوی پایین، هدر و امضای کارکنان

تماس→تماس با ما وhref#footer، نمونه‌کارهاhref#samples افزوده؛ لوگوی گوشی128→160px وgap8pxبرایجاگیری320. در390×844 انتهای واقعی صفحه، footerbottom779.92 وbarTop788.5 بود:8.58pxفاصله واقعی ناشی ازpadding64ثابت دربرابرnavbar55.5، نه فقطoverscroll. فضای main ازارتفاع واقعی nav باResizeObserver (شاملsafearea/desktophidden) رزرو وbackgroundهم‌رنگفوترشد. نیازbuild/QAتازه. امضایRavielطبقاصلاحآخرمالک ازstafflogin/portalحذف؛ امضایبقیهصفحاتحفظ. loginlocal_audit/رمزساختگیبهخودمالکدرگفتگو داده شد، credentialواقعی/productionنیست ودرhandoffیاGitاضافه نشود.

بررسی سریعEnd یک علت دیگر پرش را نشان داد: content-visibility:auto بااندازهتخمینی720 برایهمهبخش‌ها، بعدازورودبخشبهviewportارتفاع را عوض می‌کرد و انتهایصفحهناپایداربود. این تخمین عمومی حذف شد؛ DOMبخش‌هایک‌بارlayoutواقعی می‌شود وdeferred2concurrentتصاویر واندازهgallery همچنان محفوظ‌اند. تغییر وزنCSSکاهش می‌دهد،اما performanceدستگاهواقعی هنوزبایدسنجیده شود؛ نبودgapوپایداریfooterبایددرمرورگرتازهverifyشود.

### درخواست‌های تازه مالک در مرحله موبایل

دکمه بازگشت به بالا فقطبعداسکرول باfade/slide/scale و44×44 وsafearea/فضایمنو اضافهشد؛ درFooterمشترکهمهصفحاتعمومی،reducedmotionرعایت. Drawerقبلاًright/topanimateمی‌فرستاداماMotionسبکفقطx/y/scaleپشتیبانی‌می‌کند؛ اکنونtranslate280ms وoverlayfade وmaxviewportواقعی استفاده می‌شود،close300ms/focustrapحفظ. برایstaff/appointment ریشهdarkحذف تاheadingسفیدرویcardsسفیدرفع شود؛ صفحاتعمومیتمقبلی. کدنو هنوزbuild/QAتازهلازم. درخواست‌هایadminدرصف: رسانه→تصاویر،حذفواضحMedia/article/siteServiceباdependencyguardوسطلزباله/بازیابی؛ operationalservicesباوابستگیappointmentپیش ازحذف بررسی؛ sidebarدسته‌بندی/ترتیب؛ comment/article/service/galleryوeditorهایانتخابیDialogبه‌جایزیرلیسترویphone. تحقیقUI/UXرسمی/نمونهمرتبطباقی. فعالرزروهم‌اکنونمرکزتنظیمات→نوبت‌دهی→فعال‌بودن‌رزروآنلاین،بدونفعالکردنprimary/productionتوسطعامل.
