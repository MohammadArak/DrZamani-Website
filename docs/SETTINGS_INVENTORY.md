# فهرست تنظیمات و انتقال به پنل

مبنا: `api/app/config.py`، فایل‌های env example، `vite.config.ts` و `scripts/prerender.mjs` در کامیت اولیه. مرحله ۳ در نسخه 1.10.0 اجرا شده است؛ ستون پنل برای ENVهای رفتاری عملی است. فهرست دقیق نوع/bounds/help/source در runtime_settings.FIELDS و API مدیرکل است.

قاعده: تنظیمات رفتار برنامه در DB و پنل با مجوز مناسب؛ اسرار خارجی در مخزن رمزگذاری‌شده سروری و UI ماسک‌شده؛ زیرساخت/کلید پایه در ENV باقی می‌ماند. پنل نباید فایل ENV دلخواه را اجرا یا بازنویسی کند.

| ENV فعلی | محل نگهداری/مدیریت | ملاحظات |
|---|---|---|
| APP_NAME | پنل وضعیت فقط مدیرکل | عنوان health/OpenAPI از درخواست بعدی؛ نام پزشک از ClinicSetting جداست |
| APP_ENV, APP_DEBUG | ENV + صفحه وضعیت محدود | تغییر زنده از پنل مجاز نیست؛ production امن و توسعه صریح |
| API_PREFIX | ENV | تغییر route نیازمند هماهنگی proxy/client و restart |
| SECRET_KEY | ENV محرمانه | کلید پایه؛ نمایش داده نشود؛ rotation با برنامه ابطال نشست |
| DATABASE_URL | ENV محرمانه | زیرساخت؛ اتصال/مسیر خام در API عمومی یا پنل عمومی نباشد |
| ALLOWED_ORIGINS | ENV + وضعیت محدود | CORS در startup نصب می‌شود؛ اگر UI تغییر ساخته شود باید reload هماهنگ طراحی شود |
| PATIENT_SESSION_DAYS, STAFF_SESSION_HOURS | پنل امنیت | محدودیت بازه و سیاست نشست‌های فعلی |
| OTP_LENGTH, OTP_TTL_SECONDS, OTP_RESEND_SECONDS | پنل امنیت | سازگاری SMS pattern/frontend و جلوگیری از مقدار ضعیف |
| OTP_MAX_ATTEMPTS, OTP_MAX_PER_PHONE_HOUR, OTP_MAX_PER_IP_HOUR | پنل امنیت | bounds، rate limit پایدار و هم‌زمانی |
| OTP_VERIFY_MAX_PER_IP_MINUTE, OTP_VERIFY_MAX_PER_PHONE_HOUR | پنل امنیت | از مرحله ۱: پیش‌فرض ۳۰؛ محدودیت مستقل تأیید کد و کنترل بازه |
| STAFF_LOGIN_MAX_ATTEMPTS, STAFF_LOGIN_LOCK_SECONDS | پنل امنیت | از مرحله ۱: ۵ تلاش در ۹۰۰ ثانیه؛ گرفتن کپچای جدید محدودیت حساب را پاک نمی‌کند |
| STAFF_LOGIN_MAX_PER_IP_WINDOW, CAPTCHA_MAX_PER_IP_HOUR | پنل امنیت | از مرحله ۱: ۳۰ ورود در بازه قفل و ۶۰ ساخت کپچا در ساعت؛ کلیدهای DB با HMAC و بدون IP/نام خام |
| SMS_PROVIDER | پنل پیامک | console فقط توسعه صریح؛ انتخاب provider معتبر |
| SMS_WEBHOOK_URL | پنل پیامک | کنترل SSRF و فقط مقصد مجاز |
| SMS_WEBHOOK_TOKEN | پنل secret | ذخیره رمزگذاری‌شده و mask |
| SMS_SENDER | پنل پیامک | فرستنده |
| FARAZ_API_KEY | پنل secret | ذخیره رمزگذاری‌شده و mask |
| FARAZ_PATTERN_CODE, FARAZ_LINE_NUMBER, FARAZ_OTP_VARIABLE | پنل پیامک | اعتبارسنجی الگو و آزمون امن؛ ارسال واقعی فقط با درخواست مشخص |
| UPLOAD_DIR | ENV | مسیر سرور؛ انتخاب آزاد مسیر از پنل خطرناک است |
| MAX_UPLOAD_BYTES | پنل وضعیت فقط مدیرکل | محدود به سقف Nginx؛ نیاز به هماهنگی استقرار برای افزایش سقف |
| FRONTEND_URL | پنل پرداخت فقط مدیرکل | دامنه/HTTPS مجاز، callback و redirect کنترل شوند؛ proxy/CORS هماهنگ شود |
| BOOKING_HOLD_MINUTES | پنل نوبت‌دهی | حداقل/حداکثر و رفتار holdهای فعلی |
| ZARINPAL_MERCHANT_ID | پنل اتصال مالی | credential محدود و ماسک‌شده، مجوز ویژه |
| ZARINPAL_SANDBOX | پنل اتصال مالی با قید محیط | production نتواند پرداخت آزمایشی فعال کند؛ خاموش بودن رزرو مستقل است |
| BOOTSTRAP_ADMIN_USERNAME, BOOTSTRAP_ADMIN_PASSWORD | ENV نصب اولیه | بعد از bootstrap پاک/غیرفعال؛ کاربران پس از نصب از پنل مدیریت شوند |
| VITE_APPOINTMENT_API_URL | build ENV | مقدار public؛ secret نیست؛ تغییر زنده نیازمند runtime config طراحی‌شده |
| VITE_API_PROXY_TARGET | development ENV | مقصد proxy ابزار dev؛ تنظیم پنل production نیست |
| PRERENDER_CLINIC_API_URL, PRERENDER_CLINIC_SETTINGS_FILE | build/deploy ENV | fallback build؛ production Nginx جدید HTML/SEO را از DB تازه می‌گیرد |
| PYTHONDONTWRITEBYTECODE | service ENV | رفتار Python و استقرار؛ قابلیت کسب‌وکار نیست |

| SETTINGS_ENCRYPTION_KEYS | ENV محرمانه + وضعیت محدود | کلید Fernet مستقل؛ CSV با جدید اول و قدیمی برای خواندن تاریخچه؛ هر دو API/jobs یکسان |
| SMS_WEBHOOK_ALLOWED_HOSTS | ENV + وضعیت مدیرکل | hostname دقیق بدون wildcard؛ DNS عمومی و IP pin/TLS در هر درخواست |
| PUBLIC_HTML_DIR | ENV | مسیر build خواندنی backend؛ پیش‌فرض ../public_html، بدون تغییر زنده |

## تنظیمات DB موجود

اطلاعات پزشک/مطب، شماره‌ها، ایمیل، شهر/استان/نشانی، ساعات کاری، site_url، نقشه/مختصات، شبکه‌های اجتماعی؛ slot_duration_minutes، booking_horizon_days، minimum_lead_hours، cancellation_cutoff_hours، reschedule_cutoff_hours، max_patient_reschedules، reminder_enabled، first_reminder_hours، final_reminder_hours و timezone_name. این‌ها از قبل در ClinicSetting هستند؛ جدول و مسیر موازی ساخته نشود.

revision مشترک، seo_title/seo_description/seo_image_url به همان مدل افزوده شده‌اند. تاریخچه overlay و public clinic در SettingRevision، و overrideهای رفتاری در SystemSetting هستند.

## تنظیمات آینده و اجراشده

- booking_enabled (پیش‌فرض خاموش) و booking_disabled_message؛ رفتار رزرو/جابه‌جایی/لیست انتظار.
- Turnstile enabled/site key/secret و Google enabled/site key/project/credential/score threshold؛ primary provider، fallback و سیاست هر عملیات.
- rate limit ورود کارکنان/قفل/نشست در مرحله ۳ پنل دارند؛ MFA مرحله ۴ است.
- meta/OG/تصویر SEO و sitemap تازه در مرحله ۳ اجرا شدند؛ تنظیمات مقاله/نظر و رسانه عمومی آینده‌اند.
- کلید رمزگذاری تنظیمات محرمانه فقط ENV مستقل؛ پنل امکان استخراج آن نداشته باشد.

برای هر فیلد نهایی باید نوع، اعتبارسنجی، مجوز، حساسیت، پیش‌فرض، تقدم ENV/DB، نیاز به restart/rebuild، تاریخ تغییر و تست متناظر ثبت شود. اعمال گزینه‌های امنیتی نباید وابسته به cache قدیمی یا فقط frontend باشد.

## رفتار نهایی مرحله ۳

همه تنظیمات runtime فقط مدیرکل، و clinic عمومی مطابق settings.view/edit است. تغییر DB در خواندن بعدی API/jobs اعمال و revision از overwrite هم‌زمان جلوگیری می‌کند. reset به ENV جاری، clear رمز به overlay خالی رمزگذاری‌شده و restore به snapshot به‌عنوان نسخه تازه است. کلید امضا/DB/مسیر/CORS/build ENV-only و نیازمند restart/هماهنگی استقرارند؛ نمایش مقدار محرمانه ندارند. راهنمای backup/rotation/rollback و نتیجه تست در PHASE_03_SETTINGS.md است.
