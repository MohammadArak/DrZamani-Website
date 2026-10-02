# مرحله۹ — نگهداری بدون تغییر ظاهر، 1.15.0

تاریخ: 2026-10-02. مبنا main پس از PR۸: merge `2ddd9c76381a8a17b5495c5118512bd2115b5986`، source `2e322f0d260d7c197fe0406be854c85ac4c10f08`، tree `6b0695f7327eef8749fc8fab4c19a02f0401a757`.

StaffPortal و AppointmentPortalV2 به بخش‌های حوزه‌ای و بارگیری تنبل منتقل شدند؛ router کارکنان به هشت حوزه و helpers مشترک تقسیم شد. قرارداد OpenAPI پیش/پس از استخراج یکسان بود؛ تغییر نسخه metadata عمدی است. JSX/رفتار قبلی مبنا است؛ ۱۷ فایل همراه فقط import سازمان‌دهی‌شده دارند و مقایسه AST با حذف import و یکسان‌سازی CRLF برابری بدنه را تأیید کرد. LegacyAppointmentsPanel بدون مصرف حذف شد.

فهرست بیماران آمار نوبت‌ها را گروهی برای صفحه می‌خواند، ترتیب پایدار دارد و بدون مجوز نوبت/پرونده query اطلاعات مربوطه نمی‌زند. دو آزمون معنی‌دار تعداد query و عدم نشت داده خصوصی اضافه شد. نمونه مستقل ۲۰ بیمار: اندازه صفحه۵ از۱۵ به۱۱ query، صفحه۲۰ از۳۰ به۱۱؛ سه تکرار. median محلی صفحه۵ 19.28→20.23ms و صفحه۲۰ 24.25→16.63ms؛ تضمین سرعت عملیاتی نیست. migration تازه نیاز نبود.

اندازه gzip با gzipSync یکسان: staff ورودی 36049→24680 bytes، patient session 19989→1565، main 95977→96057، CSS 21201→20974، مجموع JS 420059→434277 (افزایش 14218، حدود3.4%). استخراج، بارگیری را به زمان نیاز موکول می‌کند؛ مجموع JS کاهش نیافته. ۵۶ فایل فونت بدون ارجاع runtime، 3620974 bytes حذف شدند؛ هشت WOFF2 بهینه 206004 bytes و مجوز اصلی حفظ شدند. این کاهش artifact است، نه ادعای کاهش درخواست فونت‌هایی که قبلاً هم بارگیری نمی‌شدند. CSS قالب استفاده‌نشده قدیمی حذف شد؛ قالب پذیرفته‌شده مقالات دست‌نخورده است.

CI checkout تمیز برای Node24.19.0 و Python3.12 در Linux/Windows، lint صفر warning، build/نسخه، font/bundle budgets، fullpytest، migration عمومی/editorial/comments و restore، ممیزی dependency و Gitleaks تاریخچه تعریف شد. actionها به commit رسمی ثابت شده‌اند؛ هیچ deploy/secret production در workflow نیست. نتیجه remoteCI تا اجرای واقعی NOT RUN است؛ صرف تعریف CI پذیرش نیست.

شواهد محلی: ۲۹۲ pytest موفق در262.46s با سه هشدار قبلی؛ lint --max-warnings=0، build نهایی1.15.0، بودجه bundle و هشت فونت موفق. Ruffcritical موفق. سه migration با exit0 مستقل تأیید شدند؛ تلاش sandbox به‌دلیل tempACL شکست خورد، اجرای مجاز محلی گذشت. Gitleaks تاریخچه پیش از commit جدید بدون کشف بود؛ scan commit تحویل باید تکرار شود. frozen export موفق؛ sync تازه از index و pip-audit تازه محلی اجرا نشده‌اند و CI باید واقعاً اجرا شود.

مرورگر واقعی React/API/Nginx با fixture بیرونGit: داشبورد، تقویم، فهرست نوبت، برنامه نوبت‌دهی، خدمات، مرکز پیامکی و اطلاعات مطب بعد از lazyload بررسی شدند. پروفایل بیمار ساختگی و wizard مراحل۱→۲ بارگیری شدند؛ نوبت/پرداخت/پیامک ساخته نشد. آزمون فعال فقط SQLite موقت و سپس false شد؛ خود صفحه بیمار با تازه‌شدن سیاست بسته شد. خاموشی: forms/input صفر و فقط index/appointmentApi/AppointmentGate/SEO، بدون PatientPortal/CAPTCHA. هیرو سفید/طلایی و ظاهر قبلی حفظ شد. جزئیات فرم intake در مرورگر این مرحله اجرا نشده؛ تست‌های backend مرتبط برقرارند. NOT RUN را PASS نکن.

مالک تأیید کرد staging ندارد. مرحله۸ بازطراحی/صفحات جدید deferred، complete نیست؛ مرحله۱۰ پذیرش محلی/اسناد ممکن است، اما staging/provider/CAPTCHA واقعی/Linuxjobs/هویت production و deploy اجرا نشده‌اند. هیچ realowner/patientdata/payment/SMS/deploy/productionbooking استفاده/تغییر نشده. source/merge/tree و CI نهایی در رسید خروجی پس از ارسال ثبت می‌شوند.


## رسید نهایی GitHub — 2026-10-02

PR۹ source9b75629732e48c2ee2bde45652ee27781b71a467، merge913a43d1c6e69a4749a8aa3e38625b7de5692252، tree21bcac5e3906828279b2334296ea9997d87de718؛ treeبرابر وremoteSHA تأیید شد. run36957457614 هر۴job موفق؛ frozeninstall/LinuxWindows/full292/migrationrestore/pip-audit/npm-audit/historyscan واقعی پذیرفته شد. توضیح NOTRUNremote بالاتر وضعیتپیشارسال بود و اینرسیدمقدم است. oversizebudgetباexit1 ردشد؛ Gitleaks14commitsپسcommitبدونleak. fieldmetrics/تصاویرresponsiveجدید اجرا/تغییر نشده‌اند.
