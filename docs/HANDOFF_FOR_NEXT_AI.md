# تحویل کامل پروژه به هوش مصنوعی بعدی — 2026-10-05

این سند همه‌چیز لازم برای ادامه‌ی کار را در یک جا دارد. اول بخش‌های ۱ تا ۳ و ۸ را بخوان؛ بقیه مرجع‌اند. سند قدیمی‌تر و تاریخی: `docs/AI_HANDOFF.md` و `docs/PROGRESS_LOG.md` (بالاترین ورودی‌های آن‌ها تازه‌ترین‌اند). قوانین ثابت پروژه در `AGENTS.md` است.

---

## ۱. پروژه و قوانین مالک

- سایت مطب دکتر فرزاد زمانی (متخصص گوش، حلق و بینی، اراک). ریپو: `github.com/MohammadArak/DrZamani-Website`، شاخه‌ی اصلی `main`.
- فرانت: React 19 + Vite 8 + Tailwind 4 + TipTap؛ بک‌اند: FastAPI + SQLAlchemy + SQLite (WAL)، Alembic، pydantic v2. صفحه‌های عمومی (مقالات، خدمت‌ها، صفحه اصلی) با `public_pages.render()` سمت سرور ساخته می‌شوند.
- **مالک فارسی می‌نویسد؛ جواب‌ها را فارسی بده.** مالک غیر برنامه‌نویس است؛ کوتاه، روشن و بدون اصطلاح اضافه توضیح بده.
- قوانین ثابت (AGENTS.md و گفته‌های مالک):
  1. هر مرحله را روی شاخه‌ی جدا بساز، **حتماً push کن**، بعد از تست + مستندات + CI سبز با `--no-ff` در `main` ادغام کن و دوباره push کن. برای ادغام اجازه نخواه.
  2. **هرگز deploy نکن.** نوبت‌دهی (`BOOKING_ENABLED`) و پرداخت و پیامک واقعی در production خاموش می‌مانند تا مالک صریحاً بگوید.
  3. هر تحویل `docs/AI_HANDOFF.md` و `docs/PROGRESS_LOG.md` را به‌روز کند؛ چیزی را که اجرا نشده PASS گزارش نکن.
  4. داده‌ی واقعی بیمار، credential، ENV واقعی، فایل DB و لاگ حساس وارد Git نشود.
  5. مجوزها فقط سمت بک‌اند اعمال می‌شوند.
- **قاعده‌ی تازه از مالک: هیچ انیمیشنی از سایت کم نشود.** سایت باید جذاب بماند. اگر چیزی را برای سرعت تغییر می‌دهی، انیمیشن و ظاهر باید همان بماند. (یک بار این را زدم و مالک ناراضی شد.)

## ۲. وضعیت فعلی (تأییدشده)

- `main` = `92474f4`، با `origin/main` یکی است. نسخه‌ی `VERSION`: `1.18.0`.
- آخرین migration: `20261005_0023` (مرجع: `scripts/verify-comments-migrations.py` که head را پین می‌کند).
- تست backend محلی: **۳۵۷ passed، ۱۶ skipped** (آخرین اجرای کامل پیش از چند تغییر کوچک؛ CI روی همه‌ی شاخه‌ها سبز بود: frontend، secrets، backend ubuntu و windows، `linux-runtime`).
- Lighthouse (سایت محلی با gzip و کش شبیه Nginx): دسکتاپ ۹۷–۱۰۰ همه‌ی صفحه‌ها؛ موبایل صفحه اصلی ۷۷–۹۵ (نوسان زیاد در TBT)، مقالات ۹۱، مقاله ۸۸–۹۲، خدمت ۹۶؛ دسترس‌پذیری ۹۳–۹۸؛ Best Practices ۱۰۰؛ SEO ۱۰۰.
- **چیزی deploy نشده.** VPS، DNS، TLS واقعی و ارائه‌دهنده‌های پیامک/پرداخت هیچ‌وقت لمس نشده‌اند.

## ۳. آنچه ساخته شد (به ترتیب، همه در main)

1. مرور کامل پیش‌ازانتشار → `docs/REVIEW_2026-10-04.md`.
2. ظاهر اصلی صفحه اصلی از بسته‌ی `drzamani-stabilized-2026-08-28` برگردانده شد (کامپوننت‌های `GlassCard/NavList/ServiceCard/TextGenerateEffect` متعلق به همان ظاهرند؛ هرگز حذفشان نکن).
3. صفحه‌های مقالات و خدمت به سبک سایت (HTML سمت سرور در `api/app/public_chrome.py`).
4. **محتوا از دیتابیس + پنل کارکنان (با پیش‌نویس/انتشار جدا و CAS):**
   - خدمات: `site_services` (`api/app/site_services.py`، `routers/site_services.py`، پنل `StaffSiteServicesPanel`). فیلدها: عنوان، نشانی، خلاصه، متن غنی/کد HTML، `hero_key` (عکس سمت راست، از رسانه عمومی)، سئو. صفحه‌ی صفحه اصلی فقط ۴ خدمت اول را نشان می‌دهد (`HOME_LIMIT = 4`).
   - متن‌های صفحه اصلی: بلوک‌های `hero/about/faq/footer` در `site_blocks` (`site_content.py`)؛ بلوک `about` شامل `facts` (کارت آمار شیشه‌ای).
   - نمونه‌کارها: `site_gallery` با رضایت‌نامه (`site_gallery.py`)؛ ۱۶ تصویر قدیمی seed می‌شوند و منتشرند.
   - نظرات، مقالات، رسانه: از قبل در DB بودند.
5. نقش‌ها: `docs/ROLES.md`. مجوزهای جدید `site_services.*`, `site_content.*`, `site_gallery.*`؛ نقش `content_editor` (می‌نویسد، منتشر نمی‌کند). `seed_access` مجوز تازه را یک‌بار به نقش‌های پیش‌فرض می‌دهد؛ migration 0023 مجوزهای مقاله/نظر/رسانه را یک‌بار به نقش `admin` داد.
6. اصلاح‌های امنیتی/منطقی (تغییر رمز خود کارمند، سقف رزرو/چت، قوانین بازپرداخت، audit روی خواندن پرونده/خروجی اکسل، ترتیب سهمیه‌ی OTP، callback پرداخت از تنظیمات و نه Host، Nginx: gzip بدون JSON، limit_req روی availability).
7. لیست انتظار واقعاً ساعت پیشنهادی را ۳۰ دقیقه نگه می‌دارد (`scheduling.list_available_slots`) و دکمه‌ی «رزرو همین زمان» در پنل بیمار.
8. هدر و فوتر **مشترک** (همان React صفحه اصلی) روی همه‌ی صفحه‌ها: `src/islands.tsx` + `data-shell="island"` روی root + `#site-header`/`#site-footer` (قرارداد در بخش ۵).
9. صفحه‌ی خدمت دوبخشی (طرح ۵ انتخاب مالک): عکس ثابت (دسکتاپ) / عکس بالا (موبایل) + متن؛ هیچ متن ثابتی جز آنچه ادمین می‌نویسد.
10. انیمیشن ورود: بخش مقالات صفحه اصلی (`BlogPreview`)، فهرست مقالات و مقاله (کلاس `rv` + `initReveal`).
11. بهینه‌سازی سرعت (دو دور): حذف react-router (جایگزین: انتخاب صفحه با pathname در `App.tsx`)، درخشش‌ها با radial-gradient، نقشه با کلیک (`LazyIframe`)، تصاویر ابر WebP، srcset برای هیرو/عکس خدمت/کاور، preload مخصوص هر صفحه، `Deferred` برای بخش‌های پایین صفحه اصلی، عکس رسانه با `?w=` و ETag.
12. زیرساخت CI و استقرار: تشخیص و مهار flake مربوط به `linux-runtime` (بخش ۸)، `scripts/build-release-package.py` (بسته + manifest)، `docs/GO_LIVE_RUNBOOK.md`.

## ۴. تصمیم‌های مالک — **برنگردان**

- حذف شد و نباید برگردد: نوار اعتماد زیر هیرو، صفحه‌ی فهرست `/services/` (منو و فوتر به `/#services` می‌روند؛ `/services` و `/services/` با ۳۰۱ به همان‌جا)، صفحه‌ی «حریم خصوصی».
- «درباره ما» همان ظاهر قبلی (عکس داخل شکل آبی + کارت شیشه‌ای) است؛ طرح «درباره‌ی پزشک B» (تصویر تمام‌عرض) رد شد.
- ترتیب منو: صفحه اصلی، درباره ما، خدمات، مقالات، تماس با ما. «تماس با ما» روی همان صفحه به `#footer` اسکرول می‌کند.
- دکمه و دیالوگ «رزرو نوبت» همه‌جا همان کامپوننت React صفحه اصلی است (غیرفعال → دیالوگ). صفحه‌ی `/appointment/` وقتی رزرو بسته است **شماره‌ی تلفن ندارد** (آزمون موجود عمداً `href="tel:` را ممنوع می‌کند؛ مالک هم گفت لازم نیست). فقط «بازگشت به صفحه اصلی».
- نوار تب پایین موبایل (طرح C) موجود است و می‌ماند.
- ادمین فرعی (`admin`) و منشی و حسابدار: همان نقش‌های پیش‌فرض، مالک خودش مجوزها را از پنل تنظیم می‌کند.
- ۱۶ تصویر قدیمی نمونه‌کار بدون سابقه‌ی رضایت‌نامه در سیستم منتشرند؛ مالک باید جدا مستند کند.
- اعداد «۱۵٬۰۰۰ جراحی» و «۲۰ سال تجربه» از پنل (مشخصه‌های «درباره») قابل ویرایش‌اند؛ درستی‌شان را پزشک باید تأیید کند.

## ۵. قراردادهای فنی مهم

- **صفحه‌های سروری و جزیره (island):** `public_pages.render(..., editorial=...)` برای مقالات/خدمات اسکریپت ماژول را نگه می‌دارد و روی root می‌گذارد `data-shell="island"`. `main.tsx` در این حالت فقط `mountChrome()` را اجرا می‌کند که `NavigationBar` و `Footer` را با portal در `#site-header` و `#site-footer` می‌نشاند و محتوای HTML صفحه را دست نمی‌زند. HTML ساده‌ی داخل این دو (`chrome-fallback`) فقط برای خزنده‌ها و بدون جاوااسکریپت است؛ با CSS مخفی و در `<noscript>` دوباره نمایان می‌شود. `data-solid="1"` یعنی هدر همیشه تیره (صفحه‌ی خدمت)، `0` یعنی روی بنر شفاف.
- **CSP:** `script-src 'self'` — اسکریپت درون‌خطی ممنوع است.
- **انیمیشن سروری:** `.rv` + `style="--i:N"`؛ بالای صفحه با CSS خالص، پایین صفحه با `initReveal` (`rv-wait` → `rv-go`).
- **انیمیشن React:** `@/components/Motion` یک پیاده‌سازی سبک خودی است (div/h2/h3/h5/h6/img/p/span؛ props: `initial/animate/whileInView/transition/viewport`)، نه framer-motion.
- **`Deferred` در `Landing.tsx`:** بخش‌های پایین صفحه اصلی را با IntersectionObserver (۱۴۰۰ پیکسل زودتر) سوار می‌کند؛ placeholder شناسه‌ی بخش را نگه می‌دارد؛ با `#hash` همه‌چیز فوراً سوار می‌شود و بعد از ۹۰۰/۲۰۰۰/۳۵۰۰ میلی‌ثانیه دوباره روی هدف اسکرول می‌شود. `MobileTabBar` با scroll تشخیص می‌دهد کدام بخش دیده می‌شود.
- **بودجه‌ی حجم:** `scripts/check-bundle.mjs` (`main` ≤ 102000، `allJs` ≤ 470000، `allCss` ≤ 25000). CSS سروری در `src/content.css`.
- **رسانه‌ی عمومی:** `/media/<key>.webp[?w=320|480|640|960|1280]`، `Cache-Control: no-cache` + ETag (۳۰۴)، فقط اگر در یک محتوای منتشرشده استفاده شود (`content.is_public_media`: مقاله، نظر، خدمت و `hero_key`، گالری). آرشیو رسانه‌ای که استفاده می‌شود ۴۰۹ می‌دهد.
- **سایت‌ مپ/SEO:** `/sitemap.xml` از DB؛ نشانی‌های خدمت `/services/<slug>/`.

## ۶. اجرای محلی (ویندوز، Git Bash + PowerShell)

### بک‌اند و آزمون
- `files.pythonhosted.org` بسته است؛ از آینه‌ی tsinghua نصب کن:
  ```bash
  python -m venv %TEMP%\zvenv
  %TEMP%\zvenv\Scripts\python.exe -m pip install -i https://pypi.tuna.tsinghua.edu.cn/simple --trusted-host pypi.tuna.tsinghua.edu.cn \
    alembic==1.16.5 email-validator==2.2.0 fastapi==0.142.2 httpx==0.28.1 jdatetime==5.2.0 openpyxl==3.1.5 pillow==12.3.0 \
    python-dotenv==1.2.2 python-multipart==0.0.31 starlette==1.3.1 sqlalchemy==2.0.43 tzdata "uvicorn[standard]==0.35.0" \
    cryptography==50.0.0 bleach==6.4.0 pytest==9.0.3 ruff==0.16.9
  ```
- از پوشه‌ی `api`: `PYTHONIOENCODING=utf-8 python -m pytest -o addopts='' -q -p no:cacheprovider` (حدود ۵ دقیقه). اسکریپت‌های migration: `python ../scripts/verify-migrations.py` و `verify-editorial-migrations.py` و `verify-comments-migrations.py`. Ruff: `ruff check app tests ../scripts ../deploy --select E9,F63,F7,F82`.
- فرانت: `npm ci`، `npm run lint -- --max-warnings=0`، `npm run build`، `node scripts/check-bundle.mjs`، `npx tsc -b`.

### بالا آوردن سایت کامل محلی (آنچه من استفاده کردم)
1. بک‌اند روی ۸۰۰۱ با DB موقت:
   ```bash
   export APP_ENV=development APP_DEBUG=true SECRET_KEY=dev-only-secret-key-dev-only-secret-key-12345
   export DATABASE_URL="sqlite:///$TEMP/site/app.db" UPLOAD_DIR="$TEMP/site/uploads" PUBLIC_MEDIA_DIR="$TEMP/site/public-media"
   export FRONTEND_URL=http://127.0.0.1:8000 ALLOWED_ORIGINS=http://127.0.0.1:8000,http://localhost:8000
   export BOOTSTRAP_ADMIN_USERNAME=admin BOOTSTRAP_ADMIN_PASSWORD='TestAdminPassword123!' BOOKING_ENABLED=false
   cd api && python -m alembic upgrade head && python -m uvicorn app.main:app --port 8001
   python -m app.setup_owner --username admin --promote-existing   # یک‌بار: ادمین محلی را مدیرکل کن
   ```
   (رمز بالا فقط برای DB محلی آزمایشی است.) **بعد از هر تغییر Python بک‌اند را دوباره راه بینداز** (reload ندارد). یک بار به‌خاطر فراموشی همین، مالک هیروی خراب دید.
2. جلوی آن یک «Nginx ساختگی» با Node روی ۸۰۰۰: فایل‌های ایستا از `public_html` (با gzip و هدرهای کش) و مسیرهای `/api/`, `/articles`, `/services`, `/media/`, `/appointment`, `/staff`, `/sitemap.xml`, `/robots.txt`, `/` به بک‌اند ۸۰۰۱. بک‌اند خودش فایل ایستا سرو نمی‌کند (در production کار Nginx است).
3. داده‌ی نمونه‌ی ساختگی (مقاله/نظر): با httpx از `/api/v1/staff/auth/login` (در حالت development جواب کپچا در `debug_answer` برمی‌گردد) و `/staff/media`, `/staff/articles`, `/staff/comments` + انتقال `publish`.
4. ابزار بررسی مرورگر: `playwright-core` با Edge نصب‌شده (`C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe`، headless)، و `lighthouse` (با `CHROME_PATH` به همان Edge). برای عکس کامل صفحه ابزار مرورگر داخلی برنامه ناپایدار بود؛ Playwright قابل اتکاست. ورود پنل: ورودی‌ها `inputs[0]`=کاربر، `input[type=password]`، `inputs[2]`=کپچا؛ جواب از پاسخ `/staff/auth/captcha` (`debug_answer`).
5. CI را بدون `gh` از API عمومی GitHub بخوان: `GET /repos/MohammadArak/DrZamani-Website/actions/runs?branch=<b>` و `/actions/runs/<id>/jobs`. نرخ بدون احراز هویت ۶۰ در ساعت است؛ شکست‌های گذرای شبکه را دوباره امتحان کن. لاگ job بدون ورود در دسترس نیست؛ `::error`/`::notice` در annotation عمومی‌اند.

## ۷. تله‌ها و درس‌ها

- Git Bash مسیرهای شروع‌شده با `/` را به مسیر ویندوز تبدیل می‌کند (برای آرگومان `/` از نام مستعار استفاده کن).
- فایل‌ها بعضی CRLF و بعضی LF‌اند؛ ویرایش‌های برنامه‌ای باید `\r\n` را حفظ کنند (من با `newline=""` و جایگزینی دقیق کار کردم). `git reset --hard` / حذف اجباری را سیستم رد می‌کند؛ از شاخه‌ی جدید استفاده کن.
- `\b` داخل رشته‌ی غیر raw پایتون backspace می‌شود (regex صفحه‌ها را خراب می‌کند) — از `r"..."` استفاده کن.
- اسکریپت‌های ویرایش را در فایل بنویس و اجرا کن، نه heredoc طولانی داخل Bash.
- ESLint قوانین سخت React 19 دارد (مثلاً «کامپوننت داخل render نساز»؛ `react-hooks/set-state-in-effect`). `--max-warnings=0`.
- ظاهر صفحه اصلی را با Playwright و شلوغ‌نبودن انیمیشن‌ها بسنج؛ screenshot هنگام انیمیشن‌های `whileInView` اشتباه نشان می‌دهد.
- تست‌ها شماره تلفن بیمار ثابت دارند و DB مشترک است؛ در تست جدید شماره‌ی یکتا بگیر (یک بار به سقف OTP خوردم).
- اگر ریسک تغییر ظاهر هست، اول از مالک بپرس یا تغییر را فقط در طرح بصری (`docs/design/…`) نشان بده؛ مالک به انیمیشن و ظاهر حساس است.

## ۸. کارهای باقیمانده (اولویت‌دار)

### الف) با مالک/پزشک (بلوکه‌کننده‌ی انتشار)
1. تأیید متن‌های خدمات، مقالات، «درباره»، سوالات متداول و ادعاها (۱۵٬۰۰۰ جراحی، ۲۰ سال، «بیش از دو دهه»).
2. رضایت‌نامه‌ی ۱۶ تصویر نمونه‌کار قدیمی.
3. ساخت حساب مدیران فرعی/منشی/حسابدار و آزمودن دسترسی؛ رمزساز (MFA) مدیرکل.
4. تصمیم حقوقی درباره‌ی نمایش نمونه‌کار قبل/بعد و نظرات (نظام پزشکی).

### ب) نیازمند سرور واقعی و اجازه‌ی مالک
5. VPS، DNS، TLS، Cloudflare، حساب Turnstile/Google، پیامک و پرداخت واقعی. مراحل در `docs/GO_LIVE_RUNBOOK.md`؛ `deploy/preflight-vps.sh` را اول اجرا کن و **بدون backup هماهنگ (DB + رسانه) انتشار نده** (rollback فقط کد را برمی‌گرداند).
6. Nginx روی سرور باید دستی با `deploy/nginx-drfarzadzamani.conf` هماهنگ شود (مدیر انتشار آن را نصب نمی‌کند).
7. migrationهای 0020–0023 روی داده‌ی واقعی هنوز آزموده نشده‌اند. نقش `admin` موجود با 0023 مجوز می‌گیرد؛ بعد از ورود دوباره فعال می‌شود.
8. ریشه‌ی «گیر کردن handshake وب‌سوکت»: در CI فقط مهار شده (تکرار تا ۳ بار در `scripts/verify-linux-runtime.py` + گزارش annotation). تحقیق نشان داد API و TLS سالم‌اند و گیر در ارتقای اتصال از Nginx به API است؛ دلیل قطعی با لاگ Nginx روی سرور واقعی پیدا می‌شود. در `location = /api/v1/realtime` احتمالاً بررسی `proxy_read_timeout`, `proxy_buffering off`, و `Connection $connection_upgrade` (map) لازم است — **حدس است، اثبات نشده**.
9. `default_server` در Nginx برای Hostهای ناشناس (به‌خاطر ریسک SNI در آزمون runtime انجام نشد).

### ج) پیشنهاد فنی (اختیاری، به ترتیب ارزش)
10. ساختار دقیق‌تر برای صفحه‌ی خدمت (کارت «اطلاعات کلیدی»، «مراحل»، «پرسش‌ها») فقط اگر مالک بخواهد: فیلد جدا در `ServiceContent` + پنل (طرح‌ها در `docs/design/service-detail-2026-10-05`).
11. `heading-order` در صفحه اصلی (Lighthouse a11y): با `aria-level` یا اصلاح سطح تیترها؛ ریسک تغییر ظاهر دارد.
12. نمونه‌کارهای قدیمی JPG → WebP: آدرس‌ها در DB با الگوی `LEGACY_RE` به `.jpg` قفل‌اند؛ نیازمند migration داده.
13. ETag/۳۰۴ برای HTML سروری (الان `no-store`)؛ کمفایده است.
14. پاک‌سازی شاخه‌های قدیمی remote (`codex/*`, `ci/ws-hunt`, `feat/*` ادغام‌شده) — انجام نشد.
15. هیروی صفحه اصلی داخل HTML اولیه (برای LCP): **امتحان شد و رد شد** چون انیمیشن ورود عکس را از بین می‌برد؛ اگر لازم شد باید انیمیشن را حفظ کند.

## ۹. فهرست پوشه‌ها (برای پیدا کردن سریع)

- `api/app/`: `main.py` (seed + routerها)، `public_pages.py` (render و sitemap)، `public_chrome.py` (HTML سروری: هدر/فوتر/کارت/صفحه‌ی خدمت)، `public_articles.py`, `public_services.py`، `site_services.py`, `site_content.py`, `site_gallery.py`, `content.py` (مقاله/رسانه)، `access.py` (مجوزها)، `scheduling.py`, `waitlist.py`, `runtime_settings.py` (تنظیمات DB با memo)، `routers/*`.
- `api/alembic/versions/` (آخرین: 0023)، `api/tests/` (۳۵۷ تست)، `scripts/` (build، bundle، migration، runtime، package)، `deploy/` (Nginx، systemd، release_manager).
- `src/pages/Landing/` (صفحه اصلی)، `src/pages/Staff/` (پنل)، `src/pages/Appointment/` (بیمار)، `src/islands.tsx`، `src/content.css` (CSS صفحه‌های سروری)، `src/components/Motion`, `Dialog`.
- `docs/`: `GO_LIVE_RUNBOOK.md`, `ROLES.md`, `REVIEW_2026-10-04.md`, `PROGRESS_LOG.md`, `AI_HANDOFF.md`، طرح‌ها در `docs/design/*`.

## ۱۰. فهرست کنترل قبل از هر ادغام

1. `npx eslint . --max-warnings=0`، `npx tsc -b`، `npm run build`، `node scripts/check-bundle.mjs` (بدون failures).
2. pytest مرتبط (یا کامل)، و اگر مدل/migration عوض شد سه اسکریپت verify.
3. صفحه را در مرورگر (Playwright) روی دسکتاپ و موبایل ببین؛ کنسول بدون خطا؛ انیمیشن‌ها سر جایشان.
4. `docs/PROGRESS_LOG.md` (ورودی تازه در بالا) و در صورت لزوم `docs/AI_HANDOFF.md`.
5. push شاخه، منتظر CI کامل (۵ job) بمان، `git merge --no-ff` در `main`، push، و تأیید `git status -sb` که با `origin/main` یکی است.
6. **سرور محلی را بعد از تغییر Python دوباره راه بینداز** قبل از اینکه به مالک بگویی «ببین».
