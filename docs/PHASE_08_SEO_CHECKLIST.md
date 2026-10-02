# پذیرش سئوی مرحله۸

این راهنما ثبت روش پذیرش است؛ ورود به حساب Google، درخواست ایندکس یا تغییر سایت زنده انجام نشده است.

پس از مجوز انتشار و تأیید محتوای مالک، دامنه و property صحیح Search Console را انتخاب کنید. HTML صفحه اصلی، /services/ و یک خدمت و مقاله منتشرشده را با URL Inspection بررسی کنید: پاسخ200، canonical دامنه واقعی، h1 و متن قابل خواندن در HTML اولیه، breadcrumb سازگار با مسیر نمایشی و دسترسی فایل‌های CSS/تصویر. live test و نتیجه نسخه ایندکس‌شده دو وضعیت متفاوت‌اند؛ خروجی واقعی هرکدام را ثبت کنید. [راهنمای رسمی URL Inspection](https://support.google.com/webmasters/answer/9012289).

BreadcrumbList را با Rich Results Test روی محتوای تأییدشده بررسی کنید؛ اعتبار ساختار تضمین نمایش خاص در نتایج نیست. [راهنمای رسمی breadcrumb](https://developers.google.com/search/docs/appearance/structured-data/breadcrumb).

فقط sitemap عمومی API دامنه واقعی را ثبت کنید؛ نباید پنل، نوبت یا draft/unpublished را شامل شود. lastmod را پس از تغییر واقعی محتوا بررسی کنید، نه هر build. خدمات شناخته‌شده، مقالات منتشرشده، category/tag مربوطه و homepage در خروجی موجودند. [راهنمای رسمی sitemap](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap).

مسیر خدمات بدون slash باید301 به همان مسیر با slash بدهد؛ خدمت ناموجود و نشانی ناموجود404 واقعی، مقاله قدیمی مطابق سیاست فعلی404/410/alias301. پنل و نوبت noindex باقی بمانند؛ robots اجازه خواندن noindex را می‌دهد. هیچ credential/privatecontent درHTML یا structureddata نباشد. schema امتیاز/ستاره ساختگی افزوده نشده است.

برای سرعت، اندازه bundle محلی معیار field performance نیست. پس از انتشار مجاز، داده تجربه کاربران و گزارش Core Web Vitals را با دستگاه/شبکه و بازه ثبت‌شده بررسی کنید. هدف‌های ROADMAP تضمین رتبه یا نتیجه نیستند؛ تا داده واقعی نداریم PASS میدانی ثبت نکنید.
