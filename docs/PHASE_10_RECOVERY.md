# مرحله۱۰ — بازیابی هماهنگ، نسخه1.16.0

2026-10-02؛ شاخه codex/phase-10-recovery از main ادغام PR۱۰، `00dd2802b4ac673cca3afe339af49fedefd7e169` با tree `451f35a323b91d36ce3432e56c18c60a08a65e2a`. مرحله۱۰ کلی ناتمام است. مالک staging ندارد. هیچ deploy، فعال‌سازی production، مالک واقعی یا داده بیمار استفاده نشده است.

## تغییر

اسکریپت DB-only قبلی با مدیریت هماهنگ انتشار/rollback جایگزین شد: توقف timer و job جاری و API، قفل مشترک، maintenance، snapshot SQLite مستقل از WAL، رسانه عمومی/خصوصی، ENV و Nginx. رسید خصوصی با manifest/hash و کنترل مسیر/محتوا پیش از restore؛ نگهداری permissions/ownership و journal؛ خطای میانه جایگزینی قابل بازگشت. rollback با دو شناسه کد قبلی و رسید انتشار موفق همان snapshot انجام می‌شود. archive traversal/symlink/duplicate و source-only ZIP رد می‌شوند. سلامت JSON باید VERSION مورد انتظار داشته باشد. وضعیت قبلی timer حفظ می‌شود. جزئیات و محدودیت قطع برق/داده پس از backup در [راهنمای بازیابی](../deploy/RECOVERY.md).

## وضعیت بررسی

آزمون اولیه Windows: 16 موفق،13 ویژه Linux اجرا نشده؛ fixture ZIP اولیه نادرست بود، هم fixture و هم کنترل raw filename اصلاح شد. بررسی syntax سه wrapper/install، Ruffcritical و تطبیق نسخه1.16.0 موفق. lint با صفر warning، build،8 فونت و بودجه bundle موفق. API prerender محلی در دسترس نبود و build از safe defaults استفاده کرد؛ ادعای اتصال آن به backend نیست.

اجرای fullpytest محلی از root:308 موفق،2 خطا،13 skipped؛ دو subprocess به‌علت cwd اشتباه app را پیدا نکردند. تکرار از cwd=api همراه تست‌های جدید:18 موفق،14 ویژه Linux skipped در16.99s. کل suite محلی پس از اصلاح cwd دوباره اجرا نشده؛ CI از cwd درست آن را اجرا می‌کند. CI اولیه aaa5b70/run36967918514 روی Linux تمام323 تست در64.22s موفق بود؛ سه warning قبلی. اصلاح بعدی گروه‌پردازش migration هنگام timeout/interrupt و آزمون نویسنده فرزند، هنوز منتظر CI commit بعدی است. نصب/systemd/Nginx واقعی از این نتیجه استنباط نشود.

سرویس‌های CI fixture هستند؛ Linux filesystem/SQLite/flock واقعی موقت است. هیچ اجرای واقعی systemd/runuser/Nginx روی VPS در این مرحله انجام نشده است. SIGKILL/قطع برق، offsite encrypted backup/retention، source identity بسته انتشار، providers و پذیرش خارجی همچنان بازند. پذیرش ظاهری قبلی حفظ می‌شود؛ فرانت تغییر ندارد، طراحی مرحله۸ deferred.

## تحویل

source/merge/tree و لینک CI بعد از commit/merge در رسید outputs و فایل AI handoff کنار ZIP ثبت می‌شود؛ ادغام تنها پس از آزمون‌های مربوط. گزارش قدیمی PHASE_10_ACCEPTANCE finding اسکریپت قبلی را حفظ می‌کند و این سند وضعیت اصلاح جدید را مشخص می‌کند.
