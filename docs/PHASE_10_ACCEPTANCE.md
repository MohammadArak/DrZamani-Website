# یادداشت جاری runtime — نسخه1.18.0

آزمون مستقل adapter واقعی، systemd/runuser/www-data، Nginx/HTTPS/WSS، timer/job و populated rollback در VM تازه GitHub-hosted Ubuntu موفق شد. [گزارش runtime](PHASE_10_LINUX_RUNTIME.md) و رسید outputs/AI_HANDOFF-1.18.0.md وضعیت جدید را دارند. متن‌های زیر درباره NOT RUN مربوط به وضعیت تاریخی‌اند؛ اجرای این موارد روی VPS واقعی و installer کامل هنوز پذیرش نشده‌اند. offsite/قطع برق/production identity و مجوز deploy زنده باز هستند.

---

# یادداشت جاری — 2026-10-02، نسخه 1.17.0

گزارش پایین تاریخی و مربوط به پذیرش محلی 1.15.0 است. محدودیت backup قدیمی بعداً در 1.16.0 اصلاح و در [PHASE_10_RECOVERY.md](PHASE_10_RECOVERY.md) آزموده شد؛ اجرای واقعی VPS/systemd و سایر گیت‌های خارجی همچنان پذیرش نشده‌اند. طراحی دیگر deferred نیست و حوزه طراحی/خدمات 1.17.0 پیاده و محلی و در CI آزموده شده است؛ [PHASE_08_IMPLEMENTATION.md](PHASE_08_IMPLEMENTATION.md) و ابتدای [AI_HANDOFF.md](AI_HANDOFF.md) وضعیت جاری را دارند. دستور تاریخی «frontend ساختار جدید نساز» پایین برای ادامه فعلی اعتبار ندارد. سایت زنده منتشر نشده و booking/payment production عمداً خاموش می‌مانند. شناسه‌های دقیق تحویل و قدم بعد در رسید outputs ثبت می‌شوند.

---

# پذیرش نهایی — بخش محلی، مرحله۱۰ ناتمام

تاریخ2026-10-02، نسخه1.15.0. مرجع فعلی پس از PR۹: source `9b75629732e48c2ee2bde45652ee27781b71a467`، merge `913a43d1c6e69a4749a8aa3e38625b7de5692252`، tree `21bcac5e3906828279b2334296ea9997d87de718`. source وmerge tree وremoteSHA تطبیق شدند؛ رسید/ZIP/hash درoutputs. PR۷/۸/۹ ادغام شده‌اند. این گزارش جایگزین ادعای پذیرشproduction نیست.

## اجرا شده

- CI واقعی cleancheckout مرحله۹ [run36957457614](https://github.com/MohammadArak/DrZamani-Website/actions/runs/36957457614) موفق: frontendinstall/lint/build/budgets/fonts/npm audit، backendPython3.12Linux/Windows باfrozen sync/full292pytest/سهmigration وpopulatedrestore/pip-audit، اسکن تاریخچهGit. سهwarningpytest قدیمی باقی‌اند.
- مرورگر/API/DBساختگی: قالب قبلی عکس‌دارنظرات، هیروwhite/gold، headerاسکرولdark، footerwhite، مقالهimageheader/sidebar، بسته بودن صفحه رزروبدونفرم وloadpatientmodules، دیالوگmanagertext. درمرحله۹ staffpanels وpatientprofile/wizard1→2 smokeشدند. جزئیات آرشیو/انتشار/CAS/autosave/RBAC/browserمقالاتونظرات درگزارش۶/۷؛ تمام بررسی‌های آن مراحل جایگزین testingproviderواقعی نیستند.
- HTTP وverifiedHTTPS Nginx واقعی محلی باheaders/SSR/media/privatepublic/404/410/301 در۶/۷ گذشتند؛ browserمرحله۹ ازNginx8087 واقعی استفادهکرد. certificatevalidation خاموش نشد.
- بازبینی خواندنی publicproduction `/api/health`: HTTP200 ولیnonJSON؛ sourcecommitproduction **اثبات نشد**. appearance یاsemver به‌تنهایی commitرااثبات نمی‌کند.
- نمونه نصب تازه اصلاح شد: publicmedia در `/var/lib/drzamani/public-media` مستقل ازrelease وpatientuploads، installermkdir باpermission0700. SMSproviderdisabled، credential/merchantخالی؛ bookingfalse وbootstrapownerخالی. ENV واقعی سرور دست‌نخورده؛ نصب‌های قبلی به‌صورت خودکار update نمی‌شوند. دو تستguard نمونه موفق0.09s؛ تلاش اولWindowscp1252 شکست وUTF8صریح اصلاحشد. `bash -n` سه اسکریپتsyntax موفق؛ **اجرایsystemd/install/deploy/rollback انجام نشده**.

## گیت‌های باز؛ NOT RUN / NOT ACCEPTED

مالک صریحاً گفت staging ندارد. DNS/TLS واقعی/Cloudflareoriginisolation/حسابGoogleTurnstileMFA/captchaactualbrowser و providerهایSMS/payment واقعی، Linuxsystemd/jobs/WebSocketزنده، انتقال بهنسخهproduction وhealthپسdeploy اجرا نشده‌اند. داده‌هایfixtures رضایت/پرونده/quote واقعی نیستند. این مرحله completeنیست وdeployیاproductionbooking مجوز ندارد.

بازبینی اسکریپت قدیمیdeploy نیز محدودیت عملی نشان داد: backup فعلی آن فقطSQLite است وpublicmedia/privateuploads رابهصورت هماهنگ snapshotنمی‌گیرد؛ توقفtimer بهتنهایی توقفjobازقبلدرحالاجرا را تضمین نمی‌کند. rollback-release.sh فقطکدراswitchمی‌کند وDBdowngradeنمی‌کند. بنابراین با وجودموفقیتrestoreساختگی، **خودایناسکریپت‌ها برایrolloutمقاله/رسانه رویVPS پذیرفته نشده‌اند**. اجرایقدیمیdeployتااصلاح/پذیرش هماهنگیwriter/media مجاز اعلام نشود. این گزارشactualfindingاست؛ Linuxruntimeآن راPASS ننام.

## مسیر پذیرش بعدی

1. محیطموقتLinuxجدا باDBوmediaساختگی ودامنهآزمایشی، ENV مستقل/رمزگذاری/بدونownerواقعی؛ درابتداbookingfalse/providerdisabled. فایلENV/DB/لاگ/credentialوmediaخصوصی Gitنشوند.
2. توقفtimer **وjobservice** وAPI وتمامwriters، snapshotهماهنگSQLitebackup+publicmedia+privateuploads باhashmanifest وcode/ENV/Nginxهویت؛ backupرمزگذاری‌شده/خصوصی. اصلاحdeployscripts برایاینفرایند، بازگردانیWAL/SHM باwritersمتوقف، حفظpreviousstatejobs/snippets وrestoreپرشده درLinuxقبلهرrollout. fixturedataفقط.
3. خواندنchecklistRBAC/editor/autosave/pagination/consent/schedule/closedbooking ازگزارش۶/۷؛ browserdesktop/mobile واقعی رویstaging. externalprovider صرفاًباaccountاختصاصیsandbox ودرخواست/دادهتأییدشده، هیچSMS/paymentواقعی خودکار.
4. artifactmanifest باversion/sourceSHA/tree/archiveSHA، ثبتhealthقبل/پس، comparebuildartifact؛ sourceZIPفعلیbuild/deploypackageنیست. archiveGit تنهابرایادامهdevelopmentاست.
5. بعد ازپذیرشstaging، درخواستصریحdeployمالک لازم؛ bookingproduction همچنانfalse تا درخواستجداگانه. حسابownerواقعی/captcha/payment/SMS activationهم scopeمجاز فعلی نیست.

پایش موردنیازبعدپذیرش: وضعیتjobs/timer، editorialduepublishing، SMSoutbox/retry/failed، paymentreconciliation، SQLitelocking/backups/restore، health وAPIerrorsباحداقللاگبدونOTP/secret/پرونده. livealert/monitor نصبیااجرانشده.

## ادامهAI

اولAGENTS/ROADMAP/ابتدایAI_HANDOFF/PROGRESS_LOG/اینreport. مرحله۸طراحی/صفحاتجدید بهدستورمالکdeferredاست؛ frontendساختارجدیدنساز. هدفبعدی رفعdeployreadinessدرsandboxLinux و سپسstaging، نهتکرارپرسشاجازهmerge. فایل‌هایخروجیtrackedsourceوhandoffباexactSHA/hash تحویلبده. هیچunrun راPASS/complete گزارش نکن.


بررسی نهایی هیرو: سرریز افقی۱۴px درdesktop دیده شد؛ فقط overflow-x-clip روی همانsection افزوده شد، ساختار/رنگ/چیدمان تغییر نکرد. مرورگر نهایی desktop clientWidth=scrollWidth=1265؛ lint/build/نسخه1.15.0 وbundlebudget نهایی موفق. screenshotهای phase10-hero-final.jpg وphase10-comments-final.jpg (کارت عکس هندسی/نام/متن/سن۲۹) بیرونGit ثبت شدند.
