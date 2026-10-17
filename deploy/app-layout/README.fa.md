# ساختار مورد درخواست مالک — در حال آماده‌سازی

- سورس کامل: `/var/www/drfarzadzamani/app`
- frontend ساخته‌شده: `/var/www/drfarzadzamani/public_html`
- پیکربندی موجود و محفوظ: `/etc/nginx/sites-available/drfarzadzamani.ir`
- ENV خصوصی: `/etc/drzamani/drzamani.env`
- داده و رسانه خصوصی/عمومی: مسیرهای فعلی ENV؛ پیش از نصب مجدد تعیین و backup شوند.

واحد اصلی `drzamani.service` برای `sudo service drzamani start|stop|restart|status` طراحی شده. تایمر به سرویس اصلی وابسته است؛ stop اصلی تایمر/کار در حال اجرا را هم متوقف می‌کند. start اصلی تایمر را می‌آورد. یک worker برای WS فعلی حفظ شده است.

این فایل‌ها هنوز installer کامل یا مجوز اجرای زنده نیستند. پیش از نصب باید نسخهٔ قدیمی drzamani-api از اشغال8000 خارج شود، کد و .venv در مسیر صحیح آماده، ENV معتبر و داده backup شده باشد؛ فایل‌های Nginx و unitهای قبلی خودکار بازنویسی نشوند. مدیر انتشار قدیمی release_manager.py مسیر `/var/www/drzamani/current` را فرض می‌کند؛ نباید برای این چیدمان بدون سازگارسازی استفاده شود.

برای دیدن لاگ پس از نصب: `sudo journalctl -u drzamani -n 100 --no-pager`؛ لاگ را پیش از ارسال از اطلاعات خصوصی پاک کنید. نصب تمیز و شروع سرویس‌ها در Ubuntu موقت باید آزمایش شود. خاموش بودن SMS/payment/booking production مطابق تنظیمات فعلی تا فعال‌سازی صریح مالک حفظ شود.
