# پذیرش runtime لینوکس — نسخه 1.18.0

مالک ادامه قدم بعدی را تأیید کرد. این گام اجرای مستقل سرویس و بازیابی روی ماشین موقت Ubuntu در GitHub است؛ سایت زنده، VPS مالک و provider واقعی استفاده نمی‌شوند. WSL آماده و Docker/Podman در میزبان Windows پیدا نشدند. نصب یا تغییر تنظیمات سیستم میزبان انجام نشده است.

## حوزه آزمون

scripts/verify-linux-runtime.py به root، Linux با systemd به‌عنوان PID1، GitHub-hosted runner، workspace دقیق و marker صریح fixture-only نیاز دارد. نصب موجود یا پورت مورد استفاده موجب رد پیش از هر تغییر می‌شود. روی self-hosted یا VPS اجرا نکنید. مسیرها و unitهای اصلی پروژه فقط داخل VM تازه CI ساخته می‌شوند؛ هیچ credential از secrets مخزن دریافت نمی‌شود. سرویس API روی loopback و Nginx روی 127.0.0.1:18080/18443 است.

adapter واقعی Runtime و ReleaseManager بدون mock استفاده می‌شوند: runuser/www-data، frozen uv sync، تمام migrationهای Alembic، unitهای API/job با تنظیمات سخت‌گیری‌شده، timer واقعی با زمان‌بندی کوتاه fixture، HTTPS با certificate مستقل و اعتبارسنجی روشن، WSS با session بیمار ساختگی و رد ناشناس، guard تعمیر در config فعال، deploy و rollback DB/رسانه/ENV/snippets با مالکیت، شکست واقعی Nginx و بازیابی، حفظ روشن/خاموش بودن timer و restart API پس از SIGKILL.

یک رکورد بیمار با شماره نامعتبر ساختگی، session تصادفی موقت، SMS outbox ارسال‌نشده، جدول نشانگر و دو فایل binary ساختگی ساخته می‌شوند. مالک واقعی ایجاد نمی‌شود؛ SMS disabled، booking false، کلید provider خالی. token، ENV، DB، رسانه، backup، certificate/private key و لاگ خصوصی در VM می‌مانند و به Git یا artifact عمومی نمی‌روند. فقط نتیجه پاک‌سازی‌شده مرحله‌ها، نسخه و hash بسته fixture گزارش می‌شود. بسته fixture build واقعی frontend دارد، اما بسته انتشار زنده نیست.

مبنای انتخاب VM: [راهنمای رسمی GitHub-hosted runners](https://docs.github.com/en/actions/reference/runners/github-hosted-runners) ماشین مستقل و دسترسی sudo را توضیح می‌دهد. محدودیت فایل‌سیستم unitهای پروژه با [تنظیمات رسمی systemd](https://www.freedesktop.org/software/systemd/man/latest/systemd.exec.html) بررسی شود؛ ثبت property به‌تنهایی جای آزمون عملی سرویس نیست.

## نتیجه فعلی

آزمون‌های guard/recovery/defaults محلی: ۲۱ passed و ۱۴ تست مخصوص لینوکس skipped؛ Ruff critical rules و هماهنگی نسخه 1.18.0 passed. تلاش اول بازیابی به ACL پوشه pytest در sandbox خورد؛ اجرای مجاز با fixture مستقل گذشت. اجرای زیرساخت روی Windows پشتیبانی نمی‌شود و PASS نیست. CI واقعی هنوز NOT RUN؛ پس از ارسال نتیجه دقیق، شناسه run و خطا/اصلاح احتمالی در این بخش و رسید تحویل ثبت می‌شود. آزمون‌های portable و کل suite در Quality جدا اجرا می‌شوند.

## گیت‌های باز

این پذیرش کل مرحله۱۰ را کامل نمی‌کند: VPS واقعی و تنظیمات فعال آن، DNS/Cloudflare/provider، artifact identity در production، offsite encryption/retention، قطع برق میزبان، ممیزی محتوا/رضایت و داده میدانی SEO بازند. SIGKILL فقط قطع پردازش است؛ قطع برق یا crash filesystem نیست. این گام installer کامل VPS را اجرا نمی‌کند؛ unit/templateهای موجود و adapter واقعی را در VM تست می‌کند. deploy سایت زنده و فعال‌سازی production اجازه جدا می‌خواهند.
