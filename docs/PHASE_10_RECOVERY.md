# مرحله۱۰ — بازیابی هماهنگ، نسخه1.16.0

2026-10-02؛ شاخه codex/phase-10-recovery از main ادغام PR۱۰، `00dd2802b4ac673cca3afe339af49fedefd7e169` با tree `451f35a323b91d36ce3432e56c18c60a08a65e2a`. مرحله۱۰ کلی ناتمام است. مالک staging ندارد. هیچ deploy، فعال‌سازی production، مالک واقعی یا داده بیمار استفاده نشده است.

## تغییر

اسکریپت DB-only قبلی با مدیریت هماهنگ انتشار/rollback جایگزین شد: توقف timer و job جاری و API، قفل مشترک، maintenance، snapshot SQLite مستقل از WAL، رسانه عمومی/خصوصی، ENV و Nginx. رسید خصوصی با manifest/hash و کنترل مسیر/محتوا پیش از restore؛ نگهداری permissions/ownership و journal؛ خطای میانه جایگزینی قابل بازگشت. rollback با دو شناسه کد قبلی و رسید انتشار موفق همان snapshot انجام می‌شود. archive traversal/symlink/duplicate و source-only ZIP رد می‌شوند. سلامت JSON باید VERSION مورد انتظار داشته باشد. وضعیت قبلی timer حفظ می‌شود. جزئیات و محدودیت قطع برق/داده پس از backup در [راهنمای بازیابی](../deploy/RECOVERY.md).

## وضعیت بررسی

آزمون اولیه Windows: 16 موفق، 13 ویژه Linux اجرا نشده؛ fixture ZIP اولیه نادرست بود، هم fixture و هم کنترل raw filename اصلاح شد. بررسی syntax سه wrapper/install و تطبیق نسخه1.16.0 موفق. پس از اصلاح اعتبارسنجی رسید، آزمون نهایی محلی/CI هنوز در انتظار است. این جمله پس از اجرای واقعی تازه می‌شود.

سرویس‌های CI fixture هستند؛ Linux filesystem/SQLite/flock واقعی موقت است. هیچ اجرای واقعی systemd/runuser/Nginx روی VPS در این مرحله انجام نشده است. SIGKILL/قطع برق، offsite encrypted backup/retention، source identity بسته انتشار، providers و پذیرش خارجی همچنان بازند. پذیرش ظاهری قبلی حفظ می‌شود؛ فرانت تغییر ندارد، طراحی مرحله۸ deferred.

## تحویل

source/merge/tree و لینک CI بعد از commit/merge در رسید outputs و فایل AI handoff کنار ZIP ثبت می‌شود؛ ادغام تنها پس از آزمون‌های مربوط. گزارش قدیمی PHASE_10_ACCEPTANCE finding اسکریپت قبلی را حفظ می‌کند و این سند وضعیت اصلاح جدید را مشخص می‌کند.
