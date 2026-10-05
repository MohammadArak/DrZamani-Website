# تحویل کامل پروژه به AI دیگر — 2026-10-05

این سند وضعیت فعلی را بر یادداشت‌های تاریخی مقدم می‌کند. مرجع کد همان `MohammadArak/DrZamani-Website` است. نسخه محصول `1.18.0`؛ مبنای اجرایی این تحویل `92474f437b3bc46805e59e88c92d843fd3038dbf`، tree `e7a98cf4ec879d8dbc4c82b8ad98cec3aa79a7c2` است. شناسه نهایی تحویل مستندات، PR، وضعیت CI و hash فایل‌ها در `PROJECT_STATUS.json` و `MANIFEST.json` کنار سورس داخل ZIP ثبت می‌شوند. تغییرات این تحویل صرفاً مستندات و ابزار بسته‌بندی هستند.

## برای شروع

1. `AGENTS.md`، همین سند، ابتدای `docs/AI_HANDOFF.md`، `ROADMAP.md` و `docs/PROGRESS_LOG.md` را بخوان.
2. سورس کامل در `project/` است؛ تاریخچه Git داخل ZIP نیست. برای ادامه با تاریخچه، مخزن مرجع را clone کن و SHA دقیق `PROJECT_STATUS.json` را checkout کن. ZIP نیز به‌تنهایی برای نصب و توسعه سورس کافی است.
3. فایل `docs/PROMPT_FOR_NEXT_AI.md` متن آماده انتقال درخواست و محدودیت‌هاست. اسناد قدیمی و تصاویر پیشنهادی را پذیرش طراحی یا وضعیت جاری فرض نکن.
4. وابستگی‌ها و محیط محلی را از lockfileها دوباره بساز. بسته شامل دیتابیس، حساب/رمز، ENV واقعی، آپلود خصوصی یا build اجرایی نیست. محتوای واقعیِ ویرایش‌شده در DB مطب از سورس قابل بازسازی نیست؛ این خروجی تحویل کد است و backup production نیست.

## تصمیم‌های مالک و ظاهر فعلی

- رنگ‌های آبی/سرمه‌ای و طلایی حفظ شوند؛ انیمیشن‌ها و تعامل‌ها برای مالک مهم‌اند. ظاهر صفحه اصلی به نسخه اصلی برگردانده شده است؛ طرح‌های مطالعه و motion قبلی رد شدند.
- در آخرین درخواست این گفتگو، مالک صفحه اصلی را کنار گذاشت و طرح گالری خواست. نمونه `docs/design/gallery-2026-10-03/` و نسخه قابل‌اجرا در `previews/gallery/` داخل بسته هستند؛ تأیید نهایی این نمونه ثبت نشده است.
- تغییرات جدیدتر مخزن شامل انتخاب طرح دوبخشی صفحه خدمت، برگشت ظاهر «درباره ما»، حذف نوار اعتماد و صفحه حریم خصوصی، منوی «صفحه اصلی، درباره ما، خدمات، مقالات، تماس با ما» و حفظ انیمیشن‌ها هستند (شرح دقیق در PROGRESS_LOG مورخ 2026-10-05). این تصمیم‌های جدید بر پیشنهادهای تاریخی مقدم‌اند.
- `/services/` دیگر صفحه فهرست ندارد و به `/#services` redirect می‌شود؛ صفحه هر خدمت باقی است. هدر و فوتر مشترک React در صفحات SSR هم استفاده می‌شوند؛ تماس به `#footer` همان صفحه می‌رود.
- ادغام هر PR محدود پس از تست و به‌روزرسانی اسناد از قبل مجاز است. deploy زنده و روشن‌کردن رزرو/پرداخت production درخواست جداگانه می‌خواهد. در این تحویل هیچ deploy یا فعال‌سازی انجام نمی‌شود.

## چه چیزهایی آماده است

| حوزه | وضعیت کد فعلی و محل اصلی |
|---|---|
| رابط عمومی | React/TypeScript/Vite/Tailwind، فارسی RTL، ظاهر اصلی آبی/طلایی، موبایل، حرکت و lazy/deferred؛ `src/pages/Landing/` |
| مسیرها | انتخاب pathname برای `/`، `/appointment/`، `/staff/` در `src/App.tsx`؛ مقاله و خدمت SSR در FastAPI، پوسته مشترک در `src/islands.tsx` |
| کارکنان و امنیت | مدیرکل، نقش سفارشی و RBAC سمت backend، نشست/CSRF، MFA و recovery، CAPTCHA داخلی و دو provider خارجی، تغییر رمز و audit؛ `api/app/access.py` و routers |
| تنظیمات | اطلاعات مطب مرکزی و تنظیمات محرمانه رمزگذاری‌شده؛ `ClinicInfoContext`، `runtime_settings.py`؛ از API عمومی اسرار ارائه نشود |
| نوبت و پرداخت | ظرفیت و برنامه، hold، OTP، جابه‌جایی، لیست انتظار با نگهداری پیشنهاد ۳۰ دقیقه، محدودیت‌ها، callback امن، بازپرداخت؛ کد موجود است، production خاموش |
| بیمار و گفتگو | پرونده، شرح‌حال/رضایت نسخه‌بندی‌شده، راهنمای قبل/بعد مراجعه، تصاویر خصوصی، چت و WebSocket، پیامک outbox و گزارش/Excel |
| مقالات/نظرات | ویرایشگر غنی/HTML پاک‌سازی‌شده، رسانه عمومی مستقل، پیش‌نویس/انتشار/بازبینی، جست‌وجو/دسته/برچسب، SSR و SEO، مدیریت نظرات |
| خدمات سایت | جدول `site_services`، متن/HTML/عکس خدمت و پنل `StaffSiteServicesPanel`، مجوز نوشتن جدا از انتشار؛ `site_services.py` |
| متن صفحه اصلی | جدول `site_blocks`، hero/about/faq/footer، پیش‌نویس/انتشار و پنل `StaffSiteContentPanel`؛ بلوک trust از رابط/کاتالوگ فعلی حذف شده |
| گالری CMS | جدول `site_gallery`، `/api/v1/public-gallery` و `/api/v1/staff/site-gallery`، پنل `StaffSiteGalleryPanel`؛ تصویر تازه برای انتشار به رضایت، مرجع رضایت، بازبینی حریم خصوصی و alt نیاز دارد |
| سرعت | router سبک، بخش‌های پایین deferred، نقشه با کلیک، WebP/srcset، رسانه عمومی `?w=320|480|640|960|1280` و ETag/no-cache، فونت subset و سقف bundle |
| زیرساخت | lockfile، migrations، پنج job CI، Nginx/systemd، deploy/rollback و snapshot هماهنگ، runtime fixture روی Ubuntu، ابزار بسته انتشار و manifest |

CMS گالری را دوباره از صفر نساز. ۱۶ عکس عمومی قدیمی به‌صورت منتشرشده seed می‌شوند و از الزام رضایت جدید مستثنا هستند؛ کد این استثنا را دارد، اما رضایت آن‌ها در این تحویل مستقلاً تأیید نشده است. رسانه خصوصی بیمار را به کتابخانه عمومی وصل نکن. metadata بالینی/سن/مدت/نتیجه را از روی عکس حدس نزن.

مهاجرت‌های جدید: `20261004_0020` خدمات، `20261004_0021` بلوک متن، `20261004_0022` گالری، `20261005_0023` مجوز مقاله/نظر/رسانه برای نقش admin. هنگام ساخت DB محلی جدید `alembic upgrade head` همه را اجرا می‌کند. rollout مجوز پیش‌فرض یک‌بار است و تغییر بعدی مالک را برنمی‌گرداند؛ مرجع `docs/ROLES.md` است.

## اجرای محلی مستقل

پیش‌نیاز: Git، Node مطابق CI (`24.19.0`؛ engines حداقل `22.22`)، Python `3.12` و uv (`0.11.24` در CI). نسخه کتابخانه‌ها از `package-lock.json` و `api/uv.lock` نصب شود.

در ترمینال اول، از `project/api/`:

```powershell
uv sync --frozen --all-groups
Copy-Item .env.example .env
uv run python -c "import secrets; print(secrets.token_hex(32))"
```

کلید ساخته‌شده را **فقط در ENV محلی** به‌جای SECRET_KEY نمونه قرار بده. APP_ENV=development و APP_DEBUG=true؛ DATABASE_URL یک SQLite جدید محلی، UPLOAD_DIR و PUBLIC_MEDIA_DIR مسیر مستقل fixture؛ BOOKING_ENABLED=false، SMS_PROVIDER=disabled، providerهای CAPTCHA خاموش، merchant و bootstrap credentials خالی. در صورت آزمون OTP با console، فقط توسعه محلی؛ به provider واقعی وصل نشو. FRONTEND_URL=http://localhost:5173 باقی بماند. نمونه ENV قابل انتقال است، ENV واقعی نیست.

```powershell
uv run alembic upgrade head
uv run python -m app.setup_owner --username local_owner --name "مدیر آزمایشی"
uv run uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

رمز آزمایشی تعاملی حداقل ۱۲ کاراکتر است. از حساب واقعی استفاده نکن. در ترمینال دوم از `project/`:

```powershell
npm ci
npm run dev
```

Vite معمولاً localhost:5173؛ API health در 127.0.0.1:8000/api/health. proxy مسیرهای `/api` (شامل WS)، `/articles/` و `/services` را به API می‌فرستد. مشاهده صفحات SSR کامل نیاز به build دارد:

```powershell
npm run build
```

سپس با API روشن `npm run preview -- --host 127.0.0.1` را از ریشه اجرا کن (معمولاً پورت4173). Vite preview فایل‌های build را ارائه می‌دهد و HTML مقاله/خدمت و API را proxy می‌کند؛ برای آزمون نشست در این حالت FRONTEND_URL محلی را به همین origin تنظیم و API را restart کن. سرور API در8000 HTML را می‌سازد ولی assetهای frontend را به‌تنهایی سرو نمی‌کند؛ بازکردن مستقیم8000 برای بررسی بصری کامل کافی نیست. همچنین proxy فعلی Vite مسیر `/media/` را ندارد؛ برای تصویر آپلودشده‌ی عمومی در preview باید proxy محلی `/media/` به API اضافه شود یا reverse proxy مستقل محلی با static root=`public_html` و routing مطابق Nginx پروژه استفاده شود. این نقص مسیر preview در این تحویل اصلاح اجرایی نشده؛ fallback عکس‌های static در public وجود دارد.

خروجی `public_html/` توسط build ساخته می‌شود. prerender پیش‌فرض می‌تواند fallback اطلاعات عمومی را مصرف کند؛ DB/رسانه fixture مقاله و خدمت را جدا آماده کن. فایل `clinic-settings.json` محلی snapshot ساخت است و داخل Git/بسته قرار ندارد. رزرو بسته باید دیالوگ پیام مدیر و صفحه بسته `/appointment/` را نشان دهد.

نمونه مستقل گالری به API نیاز ندارد: از پوشه `previews/gallery/` داخل بسته `python -m http.server 8094 --bind 127.0.0.1` و سپس localhost:8094. نشان‌ها فقط در حافظه‌اند؛ refresh آن‌ها را پاک می‌کند. کنترل قبل/بعد تعاملی واقعی با دو عکس هم‌تراز پیاده نشده؛ شش عکس composite موجود بدون دست‌کاری استفاده شده‌اند.

## تست و شواهد دقیق

- CI مبنای اجرایی `92474f4`: run **37310351306**، attempt **1**، هر پنج job frontend، backend Ubuntu، backend Windows، secrets و linux-runtime **success**؛ نتیجه در GitHub واقعاً خوانده شد. این مشاهده تازه است؛ اجرا روی سیستم محلیِ این تحویل نیست. [رسید CI](https://github.com/MohammadArak/DrZamani-Website/actions/runs/37310351306).
- CI نهایی PR تحویل و نتایج بسته‌بندی در PROJECT_STATUS ثبت می‌شوند؛ پیش از ثبت نتیجه قطعی، آن‌ها را PASS فرض نکن. این تحویل runtime محصول را تغییر نمی‌دهد و تست بصری/pytest محلی تازه اجرا نمی‌کند.
- کیفیت مرتبط هنگام تغییر کد: `npm run lint -- --max-warnings=0`، `npm run build`، `npm run check:fonts`، `npm run check:bundle`؛ از api: `uv run --frozen python -m pytest -o addopts='' -q` و سه اسکریپت verify-migrations / verify-editorial-migrations / verify-comments-migrations. جزئیات ثابت ابزارها در `.github/workflows/quality.yml` است.
- امتیازهای Lighthouse و زمان پاسخ نوشته‌شده در PROGRESS_LOG گزارش تاریخی شبیه‌سازی محلی هستند؛ نتیجه سایت زنده یا سنجش تازه این بسته نیستند.
- نمونه گالری تاریخی در عرض‌های 1440/768/390/320 و grid/large، viewer/zoom/keyboard/focus/filter/نشان/توقف حرکت بررسی شده؛ screen reader، دستگاه واقعی، Firefox/Safari، reduced-motion سیستم و fallback View Transition مستقل اجرا نشده‌اند. browser-checks.json و README در پیش‌نمایش‌اند.
- بسته با Git archive از bytes کامیت ساخته می‌شود، هر blob با tree گیت سنجیده می‌شود، ZIP بازخوانی و SHA256 همه فایل‌ها کنترل می‌شود؛ گزارش شواهد و اسکن اسرار کنار بسته است. کد وابستگی و ENV/DB/build/private uploads همراه نیستند.

## خطاها و محدودیت‌هایی که باید منتقل شوند

1. runtime CI سابقاً روی HTTPS/rollback شکست‌های گذرا داشت. بررسی جدید PROGRESS_LOG گاهی handshake وب‌سوکت پشت Nginx/TLS را کند دیده و retry سه‌باره/diagnostic اضافه کرده است. آخرین main سبز است، ولی علت محصولی قطعی/رفع در VPS ثابت نشده؛ retry را حل ریشه‌ای گزارش نکن.
2. `scripts/verify-linux-runtime.py` فقط VM موقت GitHub-hosted با guard/marker مجاز است؛ روی VPS مالک اجرا نکن و guard را حذف نکن. پذیرش fixture معادل VPS/قطع برق نیست.
3. متن seed شامل «۲۰ سال» و «۱۵۰۰۰ جراحی» است؛ داده قابل ویرایش شده ولی مرجع/تأیید پزشکی و رضایت تصاویر قدیمی هنوز باید بررسی شوند. ادعای درمانی و نظر تازه نساز.
4. README/GO_LIVE و گزارش‌های قدیمی بعضی مسیرها/تصمیم‌های حذف‌شده (privacy، فهرست خدمات، trust) را ذکر می‌کنند؛ وضعیت فعلی این سند و کد مقدم است. `REVIEW_2026-10-04.md` بررسی مبنای bb3cce4 است؛ چند ایرادش بعداً رفع شده‌اند و backlog قطعیِ امروز نیست.
5. SQLite پشتیبانی‌شده است؛ PostgreSQL کار سازگاری مستقل می‌خواهد. state موجود در DB، فایل‌های upload/public-media، ENV و backup production با این بسته منتقل نمی‌شوند. Vite proxy فعلی `/media/` را ندارد و برای preview با عکس‌های CMS به مسیر محلی اضافی نیاز است؛ API تنها static assetهای frontend را سرو نمی‌کند.

## کارهای باقی‌مانده و قدم بعد

1. **اولویت گفتگو: بازخورد/تکمیل طرح صفحه گالری.** بررسی CMS موجود و Samples، دریافت/رعایت انتخاب مالک، سپس انتقال فقط اجزای پذیرفته‌شده نمونه مستقل به محصول با PR محدود. route مستقل گالری هنوز در App فعلی نیست؛ ایجادش تصمیم مرحله بعد است. زاویه، نوع خدمت یا grouping در مدل فعلی ثبت نشده‌اند؛ فیلتر پیشنهادی نیاز به metadata واقعی دارد. bookmark فعلی موقت است؛ persistence یا اتصال به حساب هنوز طراحی نشده.
2. محتوای واقعی خدمات/FAQ/معرفی/مقالات و آمار با تأیید پزشک، ثبت رضایت و بازبینی تصاویر قدیمی، سیاست نگهداری/حذف/حریم خصوصی. صفحه privacy قبلاً به دستور مالک حذف شده؛ خودکار بازگردانده نشود.
3. آزمون دسترس‌پذیری کامل، keyboard/focus، reduced motion واقعی، دستگاه و مرورگرهای دیگر، empty/error/loading و field metrics. سنجش SEO/تجربه میدانی سایت زنده انجام نشده.
4. سخت‌گیری پذیرش artifact: ابزار manifest بسته انتشار اضافه شده، ولی کنترل هویت/اعتبار آن در production و سناریوی واقعی سرور باز است. `scripts/build-release-package.py` و `docs/GO_LIVE_RUNBOOK.md` را بخوان؛ این ZIP تحویل AI، بسته deploy آن ابزار نیست.
5. backup رمزگذاری‌شده خارج میزبان با retention، restore واقعی مستقل، قطع برق/قطع میزبان و پذیرش VPS/DNS/TLS/Cloudflare و providerهای واقعی. فقط پس از درخواست صریح مالک برای deploy/فعال‌سازی اقدام کن. بخش‌های stale runbook را پیش از استفاده با کد reconcile کن.

مراحل پایه امنیت/RBAC/تنظیمات/CAPTCHA/رزرو/مقاله/نظر پیاده‌اند؛ مرحله ۸ پذیرش طراحی/محتوا/میدانی و مرحله ۱۰ production هنوز کامل نیستند. ویژگی موجود (جست‌وجوی مقاله، راهنمای قبل/بعد، لیست انتظار، CMS گالری) دوباره به‌عنوان قابلیت جدید پیشنهاد نشود.

## نقشه فایل‌ها و شواهد همراه

- `src/pages/Staff/` و `src/services/*Api.ts`: پنل‌ها و قرارداد frontend؛ backend در `api/app/routers/` و مدل‌ها/سرویس‌ها در api/app.
- `api/alembic/versions/`، `api/tests/`، `scripts/`، `.github/workflows/`: migration، تست و گیت‌های پذیرش.
- `deploy/` و `docs/PHASE_10_*`: زیرساخت و recovery؛ دستور عملیاتی را بدون مجوز deploy اجرا نکن.
- `docs/design/`: همه طرح‌های tracked و previewهای service؛ طرح‌های study/motion تاریخی و ردشده‌اند. portable گالری جدا با asset و screenshot و رسید تاریخی همراه است.
- `evidence/`: رسید سبز آخرین مبنای اجرایی و رسیدهای انتخاب‌شده تاریخی؛ SHA هر گزارش مرز اعتبار آن است. `PROJECT_STATUS.json`: رسید نهایی این تحویل. `MANIFEST.json`: اندازه و hash تمام فایل‌های بسته.
