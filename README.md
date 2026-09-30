# سامانه دکتر فرزاد زمانی

## برنامه توسعه و ادامه کار

ریپوی مرجع توسعه همین `MohammadArak/DrZamani-Website` است. برنامه مرحله‌ای و وضعیت هر مرحله در [نقشه‌راه](ROADMAP.md)، کارهای انجام‌شده در [گزارش پیشرفت](docs/PROGRESS_LOG.md)، بررسی اولیه و محدودیت‌ها در [بررسی مبنا](docs/BASELINE_REVIEW.md)، تنظیمات قابل انتقال به پنل در [فهرست تنظیمات](docs/SETTINGS_INVENTORY.md) و اطلاعات ادامه توسط AI دیگر در [راهنمای ادامه کار](docs/AI_HANDOFF.md) ثبت می‌شوند.

مراحل صفر تا ۳ تکمیل و آزموده شده‌اند؛ نسخه جاری `1.10.0` شامل امنیت پایه، نقش‌ها/دسترسی و مرکز تنظیمات/اسرار/اطلاعات مطب است. گزارش هر مرحله در docs و وضعیت بعدی در نقشه راه ثبت است. نوبت‌دهی و پرداخت سایت زنده فعلاً بنا به تصمیم مالک فعال نشده‌اند؛ انتشار روی سرور انجام نشده است.

وب‌سایت فارسی مطب به‌همراه سامانه نوبت‌دهی، پرداخت، گفت‌وگوی بیمار و پنل مدیریت. فرانت‌اند با React، TypeScript، Vite و Tailwind CSS ساخته شده و بک‌اند FastAPI داخل پوشه `api/` با `uv` مدیریت می‌شود.

## قابلیت‌ها

- معرفی پزشک، مطب، خدمات، نمونه‌کارها و راه‌های ارتباطی
- رابط اختصاصی موبایل با نوار دسترسی پایین و ناوبری مجزای دسکتاپ
- نوبت‌دهی با تقویم جلالی، برنامه هفتگی و تاریخ‌های استثنایی مستقل هر خدمت
- ظرفیت هم‌زمان و فاصله تنفس قبل و بعد قابل تنظیم برای هر خدمت
- رزرو موقت زمان پرداخت و جلوگیری از رزرو هم‌زمان یک بازه
- تنظیم پرداخت هر خدمت با سه حالت رایگان، بیعانه یا کل مبلغ
- نوبت فوری با مبلغ اضافه و ساعت‌های اختصاصی
- ذخیره مبالغ به تومان
- ورود بیمار با OTP و ورود کارکنان با کپچای داخلی
- نقش‌های مدیر و منشی و مدیریت بیماران، خدمات و نوبت‌ها
- مدیریت یکپارچه نام پزشک، تخصص، شماره‌های تماس، ایمیل، نشانی، ساعات کاری، نقشه و شبکه‌های اجتماعی از بخش «اطلاعات مطب»
- تقویم هفتگی مدیریت با جابه‌جایی نوبت و کنترل دوباره ظرفیت
- جابه‌جایی آنلاین نوبت توسط بیمار با مهلت و سقف دفعات قابل تنظیم، کنترل ظرفیت و ثبت سابقه
- افزودن نوبت به تقویم گوشی و رایانه با فایل استاندارد iCalendar و یادآوری داخلی
- دو یادآوری پیامکی زمان‌بندی‌شده با فاصله‌های قابل تنظیم برای هر نوبت
- ساخت سؤال‌های شرح‌حال مستقل برای هر خدمت با پاسخ کوتاه، توضیحی، بله/خیر و چندگزینه‌ای
- تعریف رضایت‌نامه‌های مستقل هر خدمت و الزام پذیرش موارد ضروری پیش از مراجعه
- ثابت‌ماندن نسخه سؤال‌ها و متن رضایت‌نامه برای هر نوبت، حتی پس از تغییر تنظیمات خدمت
- تکمیل و ویرایش امن فرم توسط بیمار و مشاهده وضعیت و پاسخ‌ها کنار همان نوبت در پنل مدیر
- پرونده یکپارچه بیمار با جست‌وجو، مشخصات هویتی، خط زمانی و آمار مراجعه
- مشاهده نوبت‌ها، فرم‌های شرح‌حال، رضایت‌نامه‌ها، گفتگوها، تصاویر و پرداخت‌ها در یک پرونده
- برچسب‌گذاری بیمار، علامت «نیازمند پیگیری» و یادداشت داخلی محرمانه کارکنان
- تشخیص پرونده‌های مشابه احتمالی براساس شناسه هویتی یا ترکیب نام و تاریخ تولد
- عملیات سریع تماس، پیامک و ورود مستقیم به گفتگوی بیمار
- راهنمای قبل و بعد از مراجعه مستقل برای هر خدمت و بخش «راهنمای من» در پنل بیمار
- لیست انتظار و پیشنهاد خودکار ظرفیت لغوشده به اولین بیمار واجد شرایط
- گفت‌وگوی تمام‌صفحه شبیه اپ چت برای بیمار و کارکنان با جست‌وجو، فیلتر بی‌پاسخ و خوانده‌نشده
- دریافت زنده پیام‌ها و به‌روزرسانی خودکار شمارنده‌ها با WebSocket، اتصال مجدد خودکار و بررسی پشتیبان
- وضعیت خوانده‌شدن پیام‌ها و شمارنده پیام‌های جدید
- تعریف عکس‌های عنوان‌دار برای هر خدمت
- پذیرش JPEG، PNG و WebP تا سقف ۱۰ مگابایت برای هر عکس
- اعتبارسنجی تصویر، تبدیل به WebP و نگهداری خصوصی فایل‌ها
- مرکز پیامک رویدادمحور و کمپین پیامکی هدفمند
- پیامک خودکار تغییر زمان، لغو، ظرفیت آزاد لیست انتظار و ثبت بازپرداخت
- گزارش نوبت‌ها، پرداخت‌ها، بازپرداخت‌ها، پیامک‌ها و خروجی Excel
- تاریخچه عملیات مدیر، منشی و بیمار برای تغییرات مهم
- migration دیتابیس با Alembic
- Swagger در حالت دیباگ در مسیر `/api/docs`
- استقرار VPS با Nginx، systemd، بکاپ SQLite و rollback

## ساختار پروژه

```text
.
├── api/                 # FastAPI، Alembic، pyproject.toml و uv.lock
├── deploy/              # تنظیمات Nginx، systemd و اسکریپت‌های VPS
├── public/              # فایل‌های عمومی فرانت‌اند
├── scripts/             # اسکریپت‌های build فرانت‌اند
├── src/                 # سورس React و TypeScript
├── package.json
└── vite.config.ts
```

پوشه `public_html/` داخل فایل ZIP قرار ندارد. این پوشه بعد از اجرای `npm run build` ساخته می‌شود.

## پیش‌نیازها

- Node.js 22.22 یا جدیدتر
- `uv`
- Python 3.12

نصب `uv` در Windows PowerShell:

```powershell
powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"
```

بعد از نصب، PowerShell را ببندید و دوباره باز کنید:

```powershell
uv --version
node --version
npm --version
```

## راه‌اندازی بک‌اند در Windows

تمام دستورهای این بخش باید از داخل پوشه `api` اجرا شوند. اجرای `uv run alembic` یا `uv run uvicorn` در ریشه پروژه باعث خطای `program not found` می‌شود.

```powershell
cd api
uv sync --frozen
Copy-Item .env.example .env
```

یک `SECRET_KEY` تصادفی بسازید:

```powershell
uv run python -c "import secrets; print(secrets.token_hex(32))"
```

خروجی ۶۴ کاراکتری را کپی کنید، سپس فایل محیطی را باز کنید:

```powershell
notepad .env
```

مقدار زیر را با خروجی دستور قبلی جایگزین کنید:

```dotenv
SECRET_KEY=PASTE_THE_GENERATED_VALUE_HERE
```

برای اجرای محلی، این تنظیمات نیز باید در `.env` باشند:

```dotenv
APP_ENV=development
APP_DEBUG=true
DATABASE_URL=sqlite:///./data/appointments_v2.db
SMS_PROVIDER=console
FRONTEND_URL=http://localhost:5173
```

دیتابیس را بسازید و migrationها را اجرا کنید:

```powershell
uv run alembic upgrade head
```

مدیر اولیه را بسازید:

```powershell
uv run python -m app.create_admin --username admin --name "Clinic Admin"
```

رمز مدیر در ترمینال درخواست می‌شود و باید حداقل ۱۲ کاراکتر داشته باشد.

API را اجرا کنید:

```powershell
uv run uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

برای آزمایش دستی پردازش یادآوری‌ها و انقضای رزروهای موقت:

```powershell
uv run python -m app.jobs
```

آدرس‌های بک‌اند:

- Health check: `http://127.0.0.1:8000/api/health`
- Swagger: `http://127.0.0.1:8000/api/docs`
- OpenAPI: `http://127.0.0.1:8000/api/openapi.json`

Swagger و OpenAPI فقط با `APP_DEBUG=true` فعال هستند. در production مقدار `APP_DEBUG=false` قرار دهید.

از نسخه `1.8.0`، حذف APP_ENV به معنی production است؛ توسعه باید صریحاً انتخاب شود. production با debug، کلید نمونه/ضعیف، پیامک console یا پرداخت sandbox بالا نمی‌آید. نمایش OTP فقط در توسعه/تست با debug مجاز است؛ console دیگر کد یا شماره را در لاگ چاپ نمی‌کند.

مرورگر از کوکی HttpOnly با CSRF استفاده می‌کند و frontend/API باید پشت همان دامنه باشند؛ proxy توسعه Vite این شرط را فراهم می‌کند. Bearer برای کلاینت‌های API همچنان پشتیبانی می‌شود. بیمار و کارکنان کوکی جدا دارند؛ تغییر رمز/نقش کارکنان نشست قبلی را باطل می‌کند. migration `20260930_0013` کارکنان دارای نشست قدیمی را خارج می‌کند. نشست بیمار پیش‌فرض ۷ روز است؛ کاهش این تنظیم بر نشست‌های قدیمی نیز اعمال می‌شود.

پیش از استقرار نسخه، بکاپ مستقل بگیرید و migration، فایل VERSION، دو snippet جدید Nginx و تنظیمات دامنه/HTTPS را هماهنگ نصب کنید. backend فقط روی `127.0.0.1` و forwarded headers فقط از proxy مورد اعتماد پذیرفته شوند. فایل‌های Nginx برای `/api/v1` نوشته شده‌اند؛ تغییر API_PREFIX نیاز به هماهنگی آن‌ها دارد. استقرار و روشن‌کردن رزرو نیازمند درخواست جداگانه مالک هستند.

آزمون‌ها از داخل `api`:

```powershell
uv sync --frozen
uv run python -m pytest -q
uv run python ../scripts/verify-migrations.py
```

تست‌ها و اسکریپت migration از دیتابیس موقت استفاده می‌کنند؛ اسکریپت migration اتصال‌ها را پیش از حذف DB می‌بندد تا روی Windows نیز اجرا شود.

## اجرای فرانت‌اند در Windows

API را باز نگه دارید و یک PowerShell جدید در ریشه پروژه اجرا کنید:

```powershell
npm ci
npm run dev
```

سایت معمولاً در `http://localhost:5173` اجرا می‌شود. Vite درخواست‌های `/api/*` و اتصال WebSocket پیام‌ها را به `http://127.0.0.1:8000` می‌فرستد.

اگر API را روی پورت دیگری اجرا کردید، در ریشه پروژه فایل `.env.local` بسازید:

```powershell
notepad .env.local
```

مثال برای پورت ۸۰۰۱:

```dotenv
VITE_API_PROXY_TARGET=http://127.0.0.1:8001
```

## دستورات Linux و macOS

بک‌اند:

```bash
cd api
uv sync
cp .env.example .env
uv run python -c "import secrets; print(secrets.token_hex(32))"
uv run alembic upgrade head
uv run python -m app.create_admin --username admin --name "Clinic Admin"
uv run uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

اجرای دستی پردازش‌های دوره‌ای:

```bash
uv run python -m app.jobs
```

بعد از ساخت کلید، خروجی را به‌عنوان `SECRET_KEY` داخل `api/.env` قرار دهید.

فرانت‌اند در یک ترمینال جدا:

```bash
npm ci
npm run dev
```

## تست و build

تست بک‌اند از داخل پوشه `api`:

```powershell
uv lock --check
uv run pytest
uv run alembic check
uv run python -m compileall -q app alembic
```

بررسی و build فرانت‌اند از ریشه پروژه:

```powershell
npm run lint
npm run build
```

خروجی build داخل پوشه `public_html/` ساخته می‌شود و باید توسط خودتان روی سرور منتشر شود.

تنظیمات Nginx داخل پوشه `deploy/` هدرهای لازم WebSocket را دارد. سرویس production پروژه با یک worker اجرا می‌شود تا ارسال زنده پیام‌ها بین تمام اتصال‌های فعال همان پردازش هماهنگ بماند.

در VPS پردازش یادآوری‌ها و انقضای رزروهای موقت باید با timer همراه بسته فعال باشد:

```bash
sudo cp deploy/drzamani-jobs.service /etc/systemd/system/
sudo cp deploy/drzamani-jobs.timer /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now drzamani-jobs.timer
sudo systemctl status drzamani-jobs.timer
sudo systemctl list-timers drzamani-jobs.timer
```

این timer هر دقیقه `python -m app.jobs` را اجرا می‌کند. برای ارسال یادآوری علاوه بر فعال‌کردن «یادآوری پیامکی» در تنظیمات نوبت‌دهی، رویداد «یادآوری نوبت» نیز باید در مرکز پیامکی فعال باشد.

## اطلاعات ثابت مطب

پس از ورود با نقش مدیر، از منوی **اطلاعات مطب** موارد زیر را یک‌بار وارد یا ویرایش کنید:

- نام پزشک، تخصص و شماره نظام پزشکی
- شماره مطب، شماره مشاوره، ایمیل و ساعات کاری
- استان، شهر و نشانی کامل مطب
- نشانی اصلی سایت، لینک نقشه، مختصات و شبکه‌های اجتماعی

این اطلاعات در دیتابیس ذخیره می‌شوند و صفحه اصلی، پنل بیمار، لینک‌های تماس، نقشه و اطلاعات ساختاریافته SEO آن‌ها را از API عمومی `/api/v1/clinic` دریافت می‌کنند. بعد از استقرار نسخه جدید، حتماً migration را اجرا کنید:

```powershell
cd api
uv run alembic upgrade head
```

اسکریپت prerender نیز اطلاعات ثابت را از همین منبع می‌خواند تا عنوان‌ها، شماره‌ها، نشانی، canonical، sitemap و Structured Data نسخه build با اطلاعات پنل هماهنگ باشند. هنگام اجرای build محلی، API را روی پورت ۸۰۰۰ باز نگه دارید:

```powershell
npm run build
```

اگر API روی نشانی دیگری است، آن را فقط برای همان build مشخص کنید:

```powershell
$env:PRERENDER_CLINIC_API_URL="https://example.com/api/v1/clinic"
npm run build
Remove-Item Env:PRERENDER_CLINIC_API_URL
```

برای build آفلاین نیز می‌توان خروجی JSON همین endpoint را داخل یک فایل ذخیره و مسیر آن را تعیین کرد:

```powershell
$env:PRERENDER_CLINIC_SETTINGS_FILE="clinic-settings.json"
npm run build
Remove-Item Env:PRERENDER_CLINIC_SETTINGS_FILE
```

اگر API و فایل تنظیمات در دسترس نباشند، build از مقادیر پیش‌فرض استفاده می‌کند. از نسخه 1.10.0 با تنظیم Nginx همراه پروژه، HTML صفحه اصلی، metadata و JSON-LD، robots و sitemap در هر درخواست از دیتابیس ساخته می‌شوند؛ تغییر اطلاعات مطب نیاز به build مجدد ندارد. فایل‌های bundle از خروجی build خوانده می‌شوند و باید `public_html/index.html` موجود باشد. میزبانی صرفاً استاتیک همچنان به build مجدد نیاز دارد و این تازگی را تضمین نمی‌کند.

## تنظیمات production

نمونه کامل تنظیمات در `api/.env.example` و `deploy/env.production.example` قرار دارد. در سرور اصلی حداقل این موارد را تنظیم کنید:

- `APP_ENV=production`
- `APP_DEBUG=false`
- `SECRET_KEY` تصادفی و محرمانه
- `DATABASE_URL`
- `ALLOWED_ORIGINS`
- `FRONTEND_URL`
- اطلاعات زرین‌پال
- اطلاعات پنل پیامک فراز
- مسیر خصوصی آپلود تصاویر

فایل `.env`، دیتابیس، تصاویر آپلودشده، کلیدهای زرین‌پال و اطلاعات پیامک نباید داخل Git یا ZIP قرار بگیرند.


## مدیرکل و نقش‌های سفارشی (نسخه 1.9.0)

بخش «نقش‌ها و کارکنان» برای مدیرکل، نقش‌های متعدد و مجوزهای مستقل سروری دارد. در نصب جدید پس از migration، از پوشه api با `uv run python -m app.setup_owner --username YOUR_OWNER_USERNAME --name "مدیرکل"` حساب مالک را صریحاً بسازید؛ رمز دو بار مخفی پرسیده می‌شود. bootstrap ENV و ابزار قدیمی create_admin مدیر عادی هستند، نه مدیرکل.

راهنمای نصب، حفاظت آخرین مدیرکل، rollback و شواهد آزمون در [گزارش مرحله ۲](docs/PHASE_02_ACCESS.md) و ادامه کار در [AI_HANDOFF](docs/AI_HANDOFF.md) ثبت است. مقالات، نظرات و کپچاهای خارجی مراحل آینده‌اند.

## مرکز تنظیمات (نسخه 1.10.0)

اطلاعات مطب و سئوی عمومی با مجوز تنظیمات، و سیاست امنیت/نشست، پیامک، پرداخت و اسرار فقط توسط مدیرکل قابل مدیریت است. DB نسخه‌دار بر ENV مقدم است؛ بازنشانی به محیط و بازیابی نسخه قبلی نیز وجود دارد. API و worker در خواندن بعدی تغییر را می‌گیرند. تنظیمات زیرساختی در ENV می‌مانند و تغییرشان restart می‌خواهد.

برای ذخیره کلیدهای سرویس‌ها، `SETTINGS_ENCRYPTION_KEYS` مستقل از `SECRET_KEY` را در محیط خصوصی API و jobs یکسان تعریف کنید. کلید Fernet را با `uv run python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"` تولید و خارج از Git/گزارش‌ها نگهداری کنید. بدون کلید معتبر، ذخیره یا خواندن اسرار رمزگذاری‌شده رد می‌شود. برای وب‌هوک فقط دامنه‌های دقیق `SMS_WEBHOOK_ALLOWED_HOSTS` مجازند؛ آزمون اتصال، HEAD بدون پیامک و credential است. راهنمای backup/rotation/rollback و محدودیت‌ها در [مرحله ۳](docs/PHASE_03_SETTINGS.md) است. این نسخه کلید روشن/خاموش رزرو و Google/Cloudflare را هنوز اضافه نمی‌کند.
