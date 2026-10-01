# مرحله ۴ — کپچا و ورود دومرحله‌ای، نسخه 1.11.0

تاریخ: 2026-10-01، Asia/Tehran. مبنا main مرحله ۳: `7814713e2391c0efec01d36b18fe96cca1d18c2d`. پیاده‌سازی و آزمون محلی این مرحله انجام شده است؛ پذیرش شبکه/حساب واقعی ارائه‌دهندگان قبل از فعال‌سازی باقی است. شناسه PR، commit/tree نهایی و ZIP در گزارش تحویل کنار خروجی‌ها ثبت می‌شود.

## نتیجه و محدوده

Google Cloud Fraud Defense/reCAPTCHA Enterprise با کلید score-based و assessments v1، و Cloudflare Turnstile به ورود کارکنان، درخواست OTP و تأیید OTP اضافه شدند. دو کلید مستقل فعال/غیرفعال، primary، fallback، سیاست هر عملیات، hostnameهای دقیق و امتیاز گوگل در مرکز تنظیمات مدیرکل هستند؛ اکنون ۴۳ فیلد runtime وجود دارد. credentialها با Fernet مستقل رمزگذاری و در پاسخ API ماسک می‌شوند. مقدار واقعی کلیدها، پرونده، شماره بیمار و شناسه نوبت در درخواست اعتبارسنجی ارائه‌دهنده نیستند؛ token، site key/action و IP کاربر برای اعتبارسنجی استفاده می‌شوند. اسکریپت‌های ارائه‌دهنده رفتار مرورگر خودشان را دارند؛ پذیرش حریم خصوصی و دسترسی شبکه در استقرار نیز لازم است.

مالک صریحاً «برنامهٔ رمزساز + کد بازیابی» را انتخاب کرد. هر کارمند فعال، حتی بدون مجوز سایر بخش‌ها، صفحه «امنیت حساب من» دارد؛ مدیرکل سیاست اجبار MFA مدیرکل‌های فعال را کنترل می‌کند. این مرحله SMS MFA، transaction defense زرین‌پال، مقاله، کلید رزرو یا تغییر ظاهر عمومی نیست. هیچ deploy، ساخت مدیرکل production، پیامک/پرداخت واقعی یا فعال‌سازی رزرو انجام نشده است.

## قرارداد کپچا

- هر دو خاموش پیش‌فرض‌اند. ورود کارکنان همچنان PNG محلی و محدودیت حساب/IP دارد؛ ورود بیمار محدودیت OTP قبلی را حفظ می‌کند. خاموش کردن حفاظت یک عملیات هم همین رفتار را دارد.
- GET `/api/v1/auth/bot/challenge?operation=...` ارائه‌دهنده را در سرور انتخاب می‌کند و تنها site key عمومی می‌دهد. challenge پنج دقیقه، به عملیات، IP هش‌شده و fingerprint سیاست متصل است. client نمی‌تواند نام ارائه‌دهنده دلخواه ارسال کند.
- Cloudflare پاسخ success، hostname دقیق، action و challenge_ts حداکثر ۳۰۰ ثانیه؛ Google tokenProperties.valid، hostname/action/createTime حداکثر ۱۲۰ ثانیه و score عددی محدود/finite با حداقل پنل را می‌خواهد. clock skew آینده فقط ۳۰ ثانیه مجاز است. امتیاز ۵۰ پنل معادل 0.5 است؛ باید با ارزیابی حساب واقعی تنظیم شود.
- مصرف challenge و hash یکتای token پیش از I/O خارجی زیر BEGIN IMMEDIATE رزرو می‌شوند. استفاده دوباره، هم‌زمانی، عملیات/IP/سیاست متفاوت و نبود token رد می‌شوند. پس از I/O، سیاست جاری دوباره کنترل می‌شود؛ نتیجه تنظیمات قدیمی قابل استفاده نیست.
- مقصد ثابت HTTPS است؛ Google API key در X-Goog-Api-Key، نه query URL. timeout ثابت ۸ ثانیه، بدون redirect یا proxy محیط. HTTP 429/5xx، اختلال شبکه یا JSON نامعتبر اختلال فنی‌اند؛ HTTP 4xx/redirect پیکربندی نامعتبر است. محتوای upstream و خطای شبکه به کاربر/log بازتاب داده نمی‌شود.
- fallback فقط وقتی هر دو فعال، گزینه fallback روشن و قطع سرویس در backend ثابت شود، یک بار صادر می‌شود. token نامعتبر، دامنه/action اشتباه یا امتیاز پایین fallback ندارد. شکست بارگیری/اجرای browser به‌تنهایی مجوز انتخاب سرویس دیگر نیست. قطع هر دو پاسخ 503 دارد؛ هیچ ورود بدون تأیید اضافه نشده است.
- loader در فرم‌های محافظت‌شده، ready/execute گوگل، widget explicit کلادفلر، انقضا، خطا و retry را مدیریت می‌کند. Google token هنگام submit ساخته می‌شود. OTP resend challenge مستقل otp_request دارد. CSP فقط origin/pathهای مورد نیاز مرورگر را اضافه می‌کند؛ script unsafe-inline/eval یا wildcard افزوده نشده است. endpoint assessments فقط از سرور فراخوانی می‌شود.

## راه‌اندازی مجاز روی staging

1. release، migration0016، bundle و دو snippet Nginx همراه آن را نصب کنید. `SETTINGS_ENCRYPTION_KEYS` خصوصی و یکسان API/jobs و همه کلیدهای تاریخی لازم باید موجود باشند؛ DB و کلیدها جداگانه backup شوند. ساعت سرور/دستگاه را همگام نگه دارید.
2. کلید score-based Enterprise و پروژه/API فعال گوگل یا Turnstile را از حساب متعلق به مالک بسازید؛ domain restrictions و محدودیت API key به API assessments و خروجی مجاز سرور را در همان حساب تنظیم کنید. secret وارد Git، خروجی تحویل یا VITE نشود.
3. هر ارائه‌دهنده را با حالت خاموش، site key و credential و دامنه‌های دقیق در پنل ذخیره کنید. حداقل یک hostname مجاز نیاز است؛ empty از frontend/allowed origins استخراج می‌شود. domainهای دیگر، به‌ویژه www، جداگانه آزموده شوند.
4. «آزمون کلید» در پنل challenge captcha_setup می‌سازد؛ پس از تأیید واقعی کاربر، سرور action/domain/age/score را بررسی و attestation وابسته به همان credential/hostname/score ذخیره می‌کند. وضعیت «تأییدشده» تنها اعتبار همین کلیدهای ذخیره‌شده است، نه تضمین دسترس‌پذیری سرویس در آینده. بدون آن روشن‌کردن ارائه‌دهنده 422 است؛ browser نتیجه را جعل کند هم backend تأیید نمی‌کند.
5. سپس کلید فعال بودن را ذخیره و هر سه جریان ورود را از شبکه کاربران و سرور آزمایش کنید. هزینه، سهمیه، 429، دسترسی از شبکه کاربران ایران، مسدود شدن script، CSP و موبایل/RTL با حساب واقعی هنوز آزموده نشده‌اند. هر آزمون واقعی از سهمیه حساب استفاده می‌کند؛ قیمت/سهمیه ثابت یا رایگان فرض نشده است.
6. primary و fallback را آگاهانه تعیین کنید. تعویض credential/hostname/score نیاز به خاموش کردن آن ارائه‌دهنده، ذخیره/آزمون مجدد و فعال‌سازی دارد. هم‌زمان، حفاظت ارائه‌دهنده دیگر و rate limit باقی می‌ماند. تغییر ENV نیازمند restart هماهنگ API/jobs است؛ مقدار DB بر ENV مقدم است. فعال بودن در ENV نیز attestation می‌خواهد.

کلید واقعی یا حساب Google/Cloudflare در این مرحله دریافت نشده؛ این فهرست گیت پذیرش و اجرای آینده است، نه گزارش اتصال واقعی.

## MFA و بازیابی

TOTP مطابق RFC6238، SHA1/۶ رقم/۳۰ ثانیه و پنجره ±۱ است. seed۲۰بایتی رمزگذاری‌شده و متصل به staff_id ذخیره می‌شود؛ فقط در پاسخ خصوصی enrollment همان کاربر، با رمز فعلی (و عامل فعلی هنگام تعویض) یک بار نمایش داده می‌شود. ورود دستی کلید و otpauth link وجود دارد؛ QR فعلاً افزوده نشده است. pending ده دقیقه اعتبار دارد و تا تأیید کد درست عامل قبلی را عوض نمی‌کند. شروع pending نشست را باطل نمی‌کند؛ confirm/تعویض کد بازیابی/disable نشست‌ها و اتصال زنده را باطل می‌کنند.

ده کد بازیابی مستقل ۱۲۸بیتی فقط در همان پاسخ موفق نمایش داده می‌شوند. در DB تنها HMAC ذخیره و مصرف زیر قفل اتمیک است. codeهای یک‌بارمصرف و counter رمزساز مصرف‌شده دوباره پذیرفته نمی‌شوند. تعویض recovery، کدهای قبلی و challengeهای ورود را بی‌اعتبار می‌کند. در UI کلید/کدها فقط state موقت‌اند؛ localStorage، audit و صفحه عمومی شامل آن‌ها نیستند. پیش از خروج از صفحه، کدها در جای امن مالک نگهداری شوند؛ پس از خروج دوباره قابل دریافت نیستند.

بعد از رمز صحیح، حساب دارای MFA تنها challenge۱۸۰ثانیه‌ای می‌گیرد: بدون session token، cookie جدید، profile یا permission. POST `/api/v1/staff/auth/mfa/verify` عامل دوم را با اتصال IP/transport/fingerprint حساب و policy جاری می‌سنجد؛ فقط بعد از موفقیت نشست معمول cookie HttpOnly یا bearer صادر می‌شود. محدودیت مستقل حساب ۵ تلاش/۱۵دقیقه و IP۳۰تلاش/۱۵دقیقه است؛ ساخت challenge تازه با رمز صحیح آن را صفر نمی‌کند. endpoint مدیریت هم محدودیت دارد و بعد از قفل، session/revocation/CSRF را دوباره کنترل می‌کند.

برای اجبار، همه مدیرکل‌های فعال ابتدا رمزساز را تأیید و recovery را ذخیره کنند؛ سپس گزینه اجبار روشن شود. تغییر سیاست نشست مدیرکل را باطل می‌کند. promotion/ایجاد مدیرکلِ بدون MFA هنگام اجبار رد می‌شود؛ ابتدا حساب عادی بسازید، خود کاربر enroll کند و سپس ارتقا دهید. نصب جدید همچنان app.setup_owner صریح است؛ admin قدیمی مدیرکل خودکار نمی‌شود.

بازیابی اضطراری فقط توسط اپراتور دارای دسترسی خصوصی به سرور و پس از احراز مالک:

```sh
uv run python -m app.recover_access --username YOUR_OWNER --disable-captcha --reason "verified owner recovery"
uv run python -m app.recover_access --username YOUR_OWNER --reset-mfa --reason "verified lost authenticator"
```

ابزار عبارت دقیق RECOVER username می‌خواهد، حساب مدیرکل فعال را بررسی، تغییر را audit و تمام نشست‌های کارکنان را باطل می‌کند؛ هیچ bypass HTTP یا کد ورود چاپ نمی‌کند. reset-mfa فقط عامل مالک انتخابی را پاک می‌کند ولی اجبار عمومی مدیرکل را خاموش می‌کند؛ عوامل سایر کاربران حفظ می‌شوند. پس از بازگشت، owner دوباره enroll و سیاست اجبار را بررسی کند. disable-captcha هر دو ارائه‌دهنده را خاموش و PNG محلی را حفظ می‌کند. این ابزار در تست روی DB ساختگی اجرا شده؛ روی سرور واقعی اجرا نشده است.

فقدان کلید Fernet/خرابی ciphertext با 503 امن مواجه می‌شود؛ restore کلیدهای درست اولویت دارد. ابزار بازیابی، کلید رمزگذاری گمشده سایر اسرار را بازیابی نمی‌کند. seedها، pending و history هنوز کلیدهای قبلی Fernet را می‌خواهند. تغییر SECRET_KEY نیز session، recovery HMAC و attestation کپچا را بی‌اعتبار می‌کند؛ قبل از rotation سیاست ارائه‌دهنده را خاموش، بعد از آن آزمون کلید و تعویض recovery را انجام دهید. ابزار بازرمزگذاری کامل تاریخچه هنوز مرحله آینده است.

## Migration و rollback

0016 چهار جدول bot_challenges/captcha_attestations/staff_mfa/mfa_challenges می‌سازد؛ هیچ provider، MFA یا حساب production فعال نمی‌کند و نشست کارکنان قدیمی را صریحاً باطل می‌کند. downgrade0016 عامل‌ها/attestationها را حذف، فیلدهای جدید را از overlay و snapshot تاریخچه پاک، نشست‌ها را باطل و همه کارکنان را غیرفعال می‌کند؛ کد قدیمی نباید بدون MFA به پنل راه دهد. re-upgrade کارکنان را خودکار فعال نمی‌کند. DB+کلیدها پیش از migration backup، restore هماهنگ DB/کد/ENV/Nginx و بازفعال‌سازی فقط بعد از بررسی حساب/نقش لازم است. downgrade راه معمول بازگشت production نیست؛ restore آزموده snapshot قبل از مرحله را ترجیح دهید.

## شواهد و موارد باقی

- ۱۸۵ pytest PASS (۱۴۲ قبلی +۴۳ تازه)، بدون skipped: provider contracts، hostname/action/age/score، خطای شبکه/HTTP/JSON، replay/race و primary/fallback، تغییر سیاست حین I/O، activation proof، RFC vectors، seed encrypted/audit secrecy، pre-auth عدم نشست، cookie/Origin، challenge expiry/IP/transport/account، rate limit مستقل، recovery هم‌زمان، pending/rotation/disable، قفل و revocation، اجبار/ارتقای owner و CLI recovery.
- lint/build و نسخه واحد1.11.0، uv frozen offline۴۵بسته، Ruff بحرانی و migration تازه/داده قبلی/rollback پرشده/overlay پاک‌شده/re-upgrade/FK/integrity/payment UNIQUE پاس شدند. dependency تازه اضافه نشده؛ audit جدید backend و frontend اجرایی صفر مورد شناخته‌شده گزارش کرد.
- Nginx واقعی محلی با DB مستقل: enrollment زمان جاری، دوام نشست pending، ابطال cookie و WS پس از confirm، pre-auth بدون token/permissions/cookie، recovery واقعی یک‌بارمصرف، CSRF/Origin/logout، headers/CSP، 404/410، تازه‌سازی clinic HTML و edge limit PASS. syntax HTTP/HTTPS PASS. script/widget واقعی ارائه‌دهنده به‌دلیل نبود کلید آزموده نشده است.
- React واقعی با API ساختگی مستقل، تنظیمات کپچا و امنیت حساب دسکتاپ/390px بدون overflow افقی بررسی شد؛ secretهای ماسک‌شده، self-security navigation و راه‌اندازی نمایشی خوانا هستند. screenshotها شاهد UI ساختگی‌اند؛ ورود مرورگر به API واقعی و اتصال ارائه‌دهندگان در staging باقی است.
- ایراد اولیه invalidation نشست هنگام ایجاد pending MFA رفع شد. آزمون audit نام property اشتباه و smoke انتظار origin سروری در CSP/browser و ENV helper اشتباه داشتند؛ fixture production قدیمی از hostname localhost استفاده می‌کرد، با دامنه production ساختگی معتبر اصلاح شد؛ اصلاح و checks دوباره پاس شدند. سه warning قدیمی pytest و Nginx listen http2، و fallback prerender بدون API باقی‌اند؛ خطای حل‌نشده در checks نهایی نیست.

قدم بعدی مرحله۵: booking_enabled اولیه خاموش و پیام کاربر، callback پرداخت idempotent و ارسال SMS outbox مستقل از redirect. پذیرش خارجی این مرحله در staging پیش از فعال‌سازی دنبال شود.

مراجع رسمی خوانده‌شده: [Google assessment](https://docs.cloud.google.com/recaptcha/docs/create-assessment-website)، [instrument website](https://docs.cloud.google.com/recaptcha/docs/instrument-web-pages)، [API key header](https://docs.cloud.google.com/apis/docs/system-parameters)، [Turnstile validation](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/)، [widget](https://developers.cloudflare.com/turnstile/get-started/client-side-rendering/widget-configurations/)، [CSP](https://developers.cloudflare.com/turnstile/reference/content-security-policy/)، [RFC6238](https://www.rfc-editor.org/rfc/rfc6238).
