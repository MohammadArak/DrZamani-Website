# بهبود پیش‌نمایش و درخواست‌های جدید مالک — 2026-10-11، نسخه1.18.2

مرجع قبلی1.18.1 با PR18 در main946d19f412b7bbe09bde1f0f0153019d0a2fa0fc ادغام شد؛ CI38162461558 هر پنج job موفق، Linux384pass و Windows368pass/16skip. آن ممیزی را تکرار نکنید. این مرحله از همان main روی fix/preview-polish-20261011 است؛ نتیجهٔ نهایی PR/CI/merge در receipt و فایل AI کنار خروجی ثبت می‌شود.

درخواست‌های تازه مالک: نظرات نمونهٔ اصلی و مقالهٔ آزمایشی، رفع کشیدگی عکس، حذف متن نتیجه/دکمه توقف، نقطه‌های نزدیک، نقشه خودکار، امضای خوانای Raviel با گرادیان متحرک و لینک https://raviel.ir، حالت خالی متحرک مقاله‌ها، رفع پرش با همه hashهای داخل صفحه، مدیریت FAQ از پنل و کاهش padding پایین فوتر.

گالری width/height خودکار و max-height384px دارد و تناسب اصلی614/768 را حفظ می‌کند؛ object-fit:contain و max-width100% مانع کشیدگی/برش‌اند. نقطه‌ها بدون gap و paddingاضافی، هدف24px و active32px هستند. دکمه توقف در گالری و نظرات حذف شد؛ pause با focus/hover/hidden/reduced-motion و کنترل صفحه‌کلید باقی‌اند. متن نتیجه بنا به درخواست صریح مالک حذف شد.

anchor فقط یک بار بعد از mount شدن بخش‌های lazy تصحیح می‌شود؛ چهار timer تکرارشونده حذف شدند. wheel/touchstart/pointerdown/keydown آن را لغو می‌کنند؛ باقی‌ماندن hash باعث scroll مجدد نیست. overflow-anchor خودکار main خاموش است. این منطق برای تمام hashها مشترک است، نه فقطFAQ.

نقشه iframe واقعی به‌صورت خودکار lazy بارگذاری می‌شود؛ دکمه نمایش و overlay timeout قبل از viewport حذف شدند. Raviel در فوتر React و fallbackSSR لینک HTTPS با گرادیان روشن طلایی/آبی و animation7s دارد؛ در reduced-motion ثابت می‌ماند. footer padding پایین40→16px. حالت خالی مقالات از SVG کتاب و float4s استفاده می‌کند؛ search/category-empty همچنان پیام دقیق خود را دارند و loading/error با نبود مقاله اشتباه نمی‌شوند.

«سوالات متداول» ورودی مستقل پنل است و همان CMS معتبر با مجوز site_content.view/edit/publish، revision/CAS و پیش‌نویس/انتشار جدا را به‌کار می‌گیرد. سوال تازه، حذف، ویرایش، ترتیب و سقف20سوال موجودند؛ بخش مستقل فقط FAQ را می‌خواند/نمایش می‌دهد و guard تغییرات ذخیره‌نشده حفظ شده.

دادهٔ تست صرفاً در DB مستقل D:\AI\Chatgpt\DrZamani\.local\runtime\review.db: سه نظر از asset واقعی مشاهده‌شدهٔ سایت اصلی https://drfarzadzamani.ir/assets/PatientsComments-B5oOs-D5.js و سه عکس عمومی موجود، شش مقالهٔ آزمایشی preview-test-1..6 با عنوان/متن مشخص نمونه، دسته/برچسب، heading/جدول و جلد عمومی موجود. متن پزشکی تازه یا نظر بیمار ساختگی تولید نشد. این داده‌ها و رسانهٔ محلی وارد Git/بسته نمی‌شوند؛ metadata رضایت local برای این درخواست preview، شاهد رضایت production نیست. اسکریپت‌های seed_preview_content.py/add_preview_covers.py/toggle_local_articles.py بیرون checkout و idempotent هستند؛ برای بازتولید روی همین میزبان، فایل asset عمومی اولیه لازم است. حذف fixtureهای مرحله قبلی نباید این نمونه‌های درخواست‌شده را پاک کند.

اعتبارسنجی محلی:368pass/16skip/4warning در201.47s، lint صفرwarning، build/version، proxy و Ruff موفق. gzip main67761/staff25702/allJS422432/allCSS24738bytes زیر سقف موجود25000CSS است؛ سقف افزایش نیافت. migration یا dependency جدید نداریم. تست‌های empty article طبق درخواست جدید مالک به حالت تازه به‌روز شدند.

مرورگر: نمایش3نظر و6مقاله، SVG خالی واقعی با animationName=empty-float و بدون overflow، نقشه Neshan واقعی بدون click، لینک Raviel، گالری و نقاط، اسکرول دستی باhash و ساخت/ذخیره/انتشار سوال پنل بررسی شدند. نتیجه‌های دقیق viewport/screenshot در رسید همراه خروجی‌اند. شش مقاله برای آزمایش empty-state موقتاً unpublish و فوراً restore شدند. Control+Home ابزار اثری بر scroll نداشت؛ اسکرول واقعی مرورگر y5724.5→3588.5 و ماندن آن باhashFAQ شاهد است.

خطاهای رفع‌شدهٔ محیط/اجرا: مرور وب/CDP سایت اصلی timeout داشت ولی دریافت HTTPS عمومی با Python و TLSverify موفق شد؛ DNS گذرا با اجرای مجاز حل شد. console cp1252 متن فارسی را چاپ نمی‌کرد، فایل دریافت‌شده سالم بود و PYTHONUTF8 حل کرد. seed نخست به PublicMedia.id ناموجود اشاره داشت، transaction برگشت؛ key صحیح و اجرای بعد موفق شد. build اولیه cacheEPERM و نوع FAQ ناقص داشت؛ نوع واقعی StaffTab اصلاح و build با مجوز لازم موفق شد. خروجی budget قبل از build موفق شاهد نسخه تازه نیست؛ فقط report نهایی بالا معتبر است.

deploy زنده و فعال‌سازی رزرو/پرداخت/SMS انجام نشده و مجوز جدا می‌خواهند. گیت‌های VPS/production/رضایت legacy و اندازه‌گیری واقعی ممیزی قبلی همچنان بازند. قدم بعد: CI همین HEAD، ادغام طبق AGENTS، receipt دقیق و بستهٔ canonical همراه AI_HANDOFF؛ سپس نمایش مالک و تغییرات بعدی با درخواست او.
