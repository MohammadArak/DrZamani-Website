# بررسی برای ادامه پروژه — 2026-10-02

درخواست این نوبت بررسی فایل‌ها برای ادامه کار بود؛ هیچ قابلیت یا ظاهر اجرایی تغییر نکرد. این گزارش مرور ساختار، اسناد و چند مسیر مهم کد است، نه ممیزی کامل امنیت یا پذیرش تازه برنامه.

## نسخه و محل ادامه

- نسخه VERSION، package.json، دو مقدار نسخه ابتدایی package-lock.json و api/pyproject.toml برابر 1.16.0 است؛ app/version.py نسخه را از VERSION می‌خواند. این تطبیق خواندنی است؛ اسکریپت Node اجرا نشد.
- HEAD محلی از فایل ref: `46625befb8742a6974f85a8d6d5ded22fc50ae4e`، شاخه `codex/phase-08-design-preview`. GitHub نیز همین head را برای PR۱۲ باز و draft برگرداند.
- main در GitHub: `db6de0c24a59b3cedf4ac1b4a4be1d6c8eb1238f`، tree `3cc4dad989be879f32414960cccec2a2de06ed58`؛ ادغام PR۱۱. شاخه طراحی هنوز در main نیست.
- مرجع طراحی: docs/PHASE_08_DESIGN_PREVIEW.md و docs/design/homepage-concept-v1.png؛ SHA256 فایل دوباره با مقدار ثبت‌شده تطبیق شد: `59df4e073488c0d81f574be1c6e80b96bb74a3174c410f2c13b6c622b8463a1e`.

## ساختار و وضعیت

فرانت React/TypeScript/Vite در src، بک‌اند FastAPI/SQLAlchemy در api، ۱۹ migration در api/alembic/versions، ابزارهای پذیرش در scripts و استقرار/بازیابی در deploy هستند. CI در .github/workflows/quality.yml شامل frontend، backend لینوکس/ویندوز و اسکن اسرار است و deploy خودکار ندارد.

طبق گزارش‌های موجود، مراحل امنیت، نقش‌ها، تنظیمات، کپچا/MFA، رزرو/پرداخت، مقاله/رسانه، نظرات و حوزه نگهداری ادغام شده‌اند. موفقیت تست‌های سابق در گزارش‌ها تاریخی است؛ این نوبت دوباره اجرا نشده‌اند. مرحله۸ فقط کانسپت دارد و مرحله۱۰ پذیرش واقعی VPS/providers/artifact/production/offsite/قطع برق را هنوز کامل نکرده؛ staging موجود نیست.

Landing بخش‌های فعلی از جمله Samples را حفظ کرده است. AppointmentGate فقط پس از initialized و bookingEnabled ماژول بیمار را بارگیری می‌کند؛ ReserveDialog پیام تنظیم‌شده مطب را نمایش می‌دهد. این نتیجه خواندن کد است، نه آزمون تازه مرورگر. متن‌ها/تصاویر نمایشی کانسپت، داده تأییدشده مطب یا رضایت بیمار محسوب نمی‌شوند.

## محدودیت‌های همین میزبان

- git، node، npm، gh و uv در PATH پیدا نشدند؛ uv.exe و فایل‌های npm در .work/tools موجودند، اما Node قابل اجرا در آن محدوده یافت نشد. این گزارش ادعای نبود ابزار در تمام دیسک ندارد.
- api/.venv/Scripts/python.exe موجود است اما اجرا شکست خورد: محیط به Python زیر پروفایل قدیمی C:/Users/admin/.cache/codex-runtimes اشاره دارد. برای ادامه اجرا باید venv با Python معتبر همین میزبان و uv.lock بازسازی شود.
- ابزار bundled runtime نیز وابستگی پیکربندی‌شده‌ای برنگرداند. lint/build/pytest/migration/browser این نوبت NOT RUN هستند.
- ConvertFrom-Json در PowerShell موجود، package-lock.json را به‌علت کلید خالی packages نخواند؛ بنابراین نسخه lock از ابتدای فایل خوانده شد، نه خروجی اسکریپت check-version.
- git status و diff محلی قابل اجرا نبود؛ پاک‌بودن checkout اثبات نشده. فایل‌های .work، outputs، node_modules، public_html و venv موجودند؛ خروجی/ENV/DB واقعی وارد Git نشوند.
- README و بخش‌های تاریخی handoff/پذیرش هنوز عبارت‌های WIP/deferred دارند. ابتدای جدید AI_HANDOFF و گزارش طراحی بر آن‌ها مقدم است؛ ROADMAP نیز هنوز Hero روشن را کنار کانسپت هیرو تیره دارد و پیش از اجرای طراحی باید همسو شود.

## قدم بعد

ادامه طبیعی کار مرحله۸ است: جمع‌بندی جهت طرح موجود، تکمیل موبایل و گالری نمونه‌کار، سپس پیاده‌سازی روی همین شاخه/PR۱۲ با داده backend و دارایی تأییدشده. پیش از اجرای تست/کد، Git/Node/Python/uv معتبر و محیط مستقل محلی آماده و وضعیت checkout مشخص شود؛ وابستگی‌ها از lock نصب شوند. طراحی پذیرفته نشده و مرحله کامل علامت نخورد.

پس از تغییر اجرایی، نسخه هماهنگ، lint/build و آزمون مرتبط backend و مرورگر/RTL/focus/reduced-motion/SEO/رزرو خاموش اجرا و اسناد تازه شوند. PR طراحی پس از تکمیل و پذیرش قابل ادغام طبق مجوز قبلی است. deploy سایت زنده، رزرو production و سرویس/داده واقعی مجوز جدا دارند.
