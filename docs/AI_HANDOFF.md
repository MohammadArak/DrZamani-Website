# وضعیت مقدم — 2026-10-02، پذیرش محلی و گیت‌های بازمرحله۱۰

نسخه1.15.0، PR۹ merged: source `9b75629732e48c2ee2bde45652ee27781b71a467`، merge `913a43d1c6e69a4749a8aa3e38625b7de5692252`، tree `21bcac5e3906828279b2334296ea9997d87de718`؛ remote/source/treeتطبیقشد. CI run36957457614 تمام۴jobLinux/Windows/frontend/secrets موفق، freshfrozeninstall/full292tests/migrationrestore/dependencyaudit/historyscan واقعی. رسید وZIP/hash/AI_HANDOFF-PHASE09 کنارoutputs است. وضعیتNOTRUNمرحله۹پایین تاریخی است.

مرحله۱۰ در codex/phase-10-acceptance: گزارش PHASE_10_ACCEPTANCE.md و۲guardtest نمونهdeploydefaults؛ SMSdisabled/merchantempty/publicmediapersistent0700، تنظیمواقعیسرور دست‌نخورده. bashsyntax سه اسکریپت موفق؛ خودdeploymentLinux اجرا/پذیرش نشده. مرحله۱۰ کامل نیست: مالک staging ندارد. productionhealth200nonJSON، commitlive اثباتنشد. actualfinding: deployscriptbackupفقطDB، timerstopبدونjobstop، mediarestoreهماهنگنیست؛ قبلrollout درsandboxLinux اصلاح/پذیرش شود. rollbackکد DBdowngradeنمی‌کند. sourceZIPbuilddeploymentpackageنیست.

مرحله۸ طراحی/صفحاتجدید deferred، frontendقالبقدیم مقالات/sidebar، نظراتcarouselphoto/name/body/age، herowhitegold/headerdark/footerwhite حفظ شود. رزروخاموش homepageدیالوگپیاممدیر وappointmentفقطmessage/animation بدونloadpatientUI. دادهfixtureرضایت/بیمارواقعی نیست. هیچdeploy/productionbooking/realowner/payment/SMS/patientdata مجازنیست؛ هرunrunNOTPASS.

اصلاح نهایی کوچک: overflow-x-clip همانsectionهیرو، بدونتغییرساختار؛ desktop1265=scrollWidth، screenshothero/commentsfinal بیرونGit.

قدمبعد: مرحله۱۰scope/doc/defaults کامیت/ارسال/PR وCIواقعی، سپسmergeexpectedSHA/treeverify وsource/handoffreceipt. گزارش خارجیincompleteبماند. بعدsandboxLinuxbackupjobsmedia+artifactidentity وstaging نیازدارد؛ مالکگفتstagingندارد، پرسش تکراری نکن. deployمجوزجداست؛ ادغام مجوزقبلی دارد. فایلادامه را هر تحویل تازهکن.

---

# وضعیت مقدم — 2026-10-02، مرحله۹ نسخه1.15.0

PR۸ ادغام و SHA/tree تأیید شد: merge `2ddd9c76381a8a17b5495c5118512bd2115b5986`، source `2e322f0d260d7c197fe0406be854c85ac4c10f08`، tree `6b0695f7327eef8749fc8fab4c19a02f0401a757`. مرحله۶ PR۷ هم merged است.

مرحله۹ در codex/phase-09-maintenance؛ PHASE_09_MAINTENANCE.md و METRICS مرجع. ۲۹۲pytest/lint/build/budgets/fonts/Ruff/migration/restore محلی موفق؛ browser staff panels/patientprofile/wizard وclosedgate بررسی شدند. remoteCI هنوز NOT RUN و قبل merge باید نتیجه واقعی بررسی شود؛ scan تاریخچه بعد commit لازم. کاهش entry با افزایش3.4% مجموعJS گزارش شده است. قراردادAPI محفوظ، دو querybudgettest افزوده شد. استخراج/import-only بدنۀ ۱۷ فایل با AST تأیید شد. یک git restore گروهی رد خودکار شد و انجام نشد؛ importها حفظ شدند، دور زدن رد انجام نشود.

مالک گفت staging ندارد؛ مرحله۱۰ خارجی کامل نیست. طراحی مرحله۸ deferred. فرانت قالب قدیمی مقالات (سربرگ تصویری/sidebar)، نظرات carousel عکس/نام/متن/سن ازپنل، هیرو سفید/طلایی، هدر تیره و فوتر سفید حفظ شود. رزروخاموش دیالوگ مدیر درhomepage و فقطmessage/animation بدونloadpatientUI درappointment.

قدم بعد: commit/push/PRمرحله۹، اجرای واقعی CI و رفع خطا، mergeexpectedSHA و treeverify، ZIP tracked-only و handoff کنارoutputs. سپس پذیرش محلی/گزارش مرحله۱۰ با گیت‌های خارجی NOT RUN؛ deploy/productionbooking/realowner/realpayment/SMS/patientdata مجاز نیست. نتیجه unrun را PASS ننام. sourceSHA پس ازcommit درreceipt بیرونGit ثبت شود.

---

# وضعیت مقدم — نسخه 1.14.0، اتصال قالب قبلی به پنل

این بخش بر شرح‌های تاریخی پایین مقدم است. دستور تازه مالک: ساختار فرانت فعلاً عوض نشود؛ نظرات با همان کارت عکس‌دار قدیمی، و مقالات با قالب سربرگ تصویری و ستون کناری، فقط به backend وصل شوند. بازطراحی مرحله ۸ و صفحات خدمات جدید به تعویق افتاد. تغییرات رزرو/هیرو/هدر/فوتر و حذف سه کارت AboutUs اجرا شد.

مرحله ۶ با همان PR۷ ادغام شد: source `ae52757e95b741169277e319861dda1bfafd1795`، merge `ed549791eec6aaccc9e838c785ef3aa98fae039a`، tree `8a1e9a03d679d5c04f565bcccfa7aa5105d345b1`. مرحله ۷ از همین merge روی `codex/phase-07-comments` پذیرفته شد؛ نسخه 1.14.0. SHA دقیق ارسال/ادغام/tree و ZIP در گزارش کنار outputs پس از ارسال ثبت و با GitHub تطبیق می‌شوند؛ اگر موجود نیست، مرحله ۷ هنوز ارسال نشده است.

گزارش جاری: [PHASE_07_COMMENTS.md](PHASE_07_COMMENTS.md). آخرین اجرای کامل ۲۹۰ تست در 213.59s، سه هشدار قدیمی؛ lint/build/version/Ruff critical و ممیزی تازه npm صفر، migration عمومی/editorial/comments و backup/restore موفق. مرورگر واقعی roles/consent/publish/withdraw/CAS/pagination، عکس و سن اختیاری در قالب قبلی، desktop/viewport390، جست‌وجو+دسته، هیرو/هدر/فوتر/دیالوگ رزرو و HTTP/HTTPS Nginx معتبر بررسی شدند. fixture-only login خارج Git است؛ این آزمون CAPTCHA/ورود واقعی نیست.

نظرات مستقل از patient، سن اختیاری ۱..۱۳۰، رسانه عمومی، current/public snapshot، consent/privateReference/privacyreview و RBAC مستقل‌اند. نقش‌های موجود خودکار permissions تازه نمی‌گیرند. archive نرم است؛ downgrade0019 نظرات را حذف و فایل رسانه را حفظ می‌کند، backup هماهنگ DB+media و stopwriters لازم است. داده/رضایت fixture واقعی نیست. ZIP فقط trackedsource باشد؛ .work، outputs، DB، ENV، build، لاگ حساس و venv وارد Git نشوند.

رزرو خاموش در صفحه اصلی فقط دیالوگ متن مدیر از دکمه «رزرو نوبت» دارد؛ خود /appointment/ فقط پیام و انیمیشن توقف، بدون load فرم/پنل بیمار/CAPTCHA. تست فعال فقط DB موقت بود و به خاموش برگشت. deploy یا productionbooking انجام نشده است. هیچ مالک واقعی، داده بیمار، پرداخت یا SMS واقعی استفاده نشود.

قدم بعد: پس از ادغام ۷، نگهداری و CI مرحله ۹ بدون تغییر ظاهر. مرحله ۸ deferred است و complete نیست. مرحله ۱۰ فقط بررسی‌های ممکن محلی/اسناد؛ staging، CAPTCHA/providerهای واقعی، Linux/jobs، frozen index sync تازه و هویت production هنوز NOT RUN/NOT PASS هستند؛ deploy مجوز جدا دارد. هر مرحله test/doc/commit/push/PR/merge و SHA/treeverify؛ اجازه ادغام دوباره لازم نیست.

---

# وضعیت مقدم برای ادامه — 2026-10-01، پذیرش محلی مرحله۶

این بخش بر شرح تاریخی پایین مقدم است. دستور تازه مالک ادامه از phase-06-articles/PR۷ و443f466 بود؛ پس از پذیرش هر مرحله test/doc/commit/push/merge با main مجاز است و اجازه دوباره لازم ندارد. deploy مجوز مستقل دارد.

- نسخه1.13.0: مقالات محلی پذیرش شد؛ گزارش مرجع [PHASE_06_ARTICLES.md](PHASE_06_ARTICLES.md). شاخه phase-06-articles، PR۷؛ شناسه دقیق commit/merge/tree در گزارش تحویل کنارoutputs پس از ارسال ثبت می‌شود؛ تاریخچه WIP قبلی وضعیت امروز نیست.
- 266تست کلbackend موفق (97.99s،3warningقدیمی) و51مقاله بعد ازpixel test موفق (31.11s). lint/build/version، Ruffcritical، npmci/audit0،47wheel دقیق/hash و تطبیقlock، auditرسمیPyPI47+Linuxuvloop0، migration عمومی وeditorialپرشده/DB+mediarestore موفق. frozenindexsync جدید دراینمیزبان وLinux/staging/providerهایواقعی PASS اعلام نشده‌اند.
- مرورگر React واقعی باAPIواقعی/DBموقت/cookie/CSRF؛ route ورود فقط-fixture در .work و بیرونGit. login/captcha واقعی staging آزموده نشده. دسته/برچسبdelimiter، رسانه>60/انتخابقدیمی، article>30/total، HTML/editor/image/table/link/undo/redo/preview، autosaveHTML/کندی با تایپ/503retry/409preserve، خروجEscape/historyrestore، ناشربدونedit/نویسندهبدونpublish/readonlyمتن، upload/edit/archive، publicdesktop390/tag/page بررسی شدند. NginxHTTP+verifiedHTTPS/HTMLاولیه/meta/schema/cache/securityheaders/404410301/sitemap/privatepublicmedia وclosedbooking موفق؛ هیچpatientdata واقعی نیست.
- اصلاحات مهم: rawlabeltext جدا ازarray؛ mediaendpoint به items/total/page تبدیل شد، q و metadata تک‌رسانه اضافه شد. تاریخچه metadata-only باحد100. save rowRef/CAS، typed-during-request حفظ؛ disableedit هنگامsave حذف، جلوگیریخروج هنگامbusy. dialogداخلپنل focus/Tab/Escape. setEditable(editable,false) وonUpdate فقطeditable، ناشر بدونedit ازstoredsnapshot منتشرمی‌کند. upload input تنهاپس ازsuccess باversionreset بازنشانی می‌شود.
- رزرو خاموش فقطپیام وcalendar/halo animation: AppointmentGate lazyimportpatientportal را فقطوقتی initialized&&bookingEnabled فعال می‌کند. inventoryمرورگر noPatientPortal/noCaptcha وDOMnoform/input تأیید شد. رزرو production همچنان خاموش و deployment انجام‌نشده.
- قدم بعد پس ازmergePR۷: مرحله۷ نظرات مستقل باconsent/permissions/audit/preview وبدونتبدیلhardcodedtestimonials بهنظرواقعی؛ مرحله۸ابتداpreview وتصمیممالک؛ مرحله۹split/budget/CI؛ مرحله۱۰staging/providerها/مالکیتحساب/backup/Linuxjobs/شناسهproduction. بهdeploy یا فعال‌سازی رزرو نیاز خودکار نیست؛ هیچrealowner/payment/SMS/patientdata استفاده نشود.
- محدودیت عملی: PyPI CDN DNS اینمیزبان؛ wheelهاباhashازHuawei نصبشدند. sandboxtempACL/Vitespawn فقطدرمحیط محلی مجاز گذشتند. هشدار3pytest وnginxhttp2 باقی‌اند. .work/outputs/venv/build/DB هرگزGitنشوند. artifactها فقطtrackedsource+handoff باhash کنارoutputs. script verify-editorial-migrations.py هماهنگیrollback/restore DB/mediaساختگی را آزموده؛ downgrade0018محتوا را حذف ولیmediafile راحفظ می‌کند؛ backup/maintenance/stopwriters/codeENVNginx هماهنگ لازم است.

---

# وضعیت فعلی برای ادامه — 2026-10-01

**این بخش بر توضیحات قدیمی پایین فایل مقدم است.** مالک خواست همه تغییرات فعلی در GitHub ذخیره و ادامه به AI دیگری واگذار شود. قابلیت تازه را توسعه نده؛ ابتدا شاخه و سند حاضر را بررسی کن.

- مراحل۰ تا۵ تکمیل و ادغام شدند؛ اصلاح صریح رزرو در نسخه1.12.1 با PR۶ در main ادغام شده است: `b77c7b33b4439ff441488b9dfc3dd142c3c66f15`، tree `917c519de515c19dadd1b569ce68788060baca6c`، source `eae82c65f3822c52b656ae3be6226c8e8670fa2f`.
- **در رزرو خاموش، /appointment/ فقط پیام مدیر و تقویم متوقف با انیمیشن آرام نشان می‌دهد. فرم ورود/پنل بیمار نباید mount شود، حتی با cookie بیمار.** حالت کم‌حرکت رعایت شده؛ UI desktop/390px واقعی محلی و215تست نسخه اصلاح پاس شدند. API پرونده/callback پرداخت قبلی حفظ می‌شوند، ولی ورود در صفحه عمومی خاموش نمایش ندارد. ادعای قدیمی «ورود UI در خاموشی باز بماند» منسوخ است.
- مرحله۶ در شاخه `phase-06-articles` و نسخه منبع1.13.0 **در حال انجام** است؛ PR پیش‌نویس برای نگهداری کار و ادامه، نه مرحله پذیرفته‌شده/merged/release. از همین شاخه ادامه بده، نه فقط main و نه شروع مجدد مراحل قبلی. SHA دقیق شاخه/ZIP در گزارش خروجی نهایی ثبت می‌شود.
- آخرین آزمون snapshot: **255pytest PASS** (215قبلی+40مقالات)، lint/build/version PASS، Ruff E9/F63/F7/F82 PASS، uv frozen offline با47بسته PASS، migration عمومی fresh/upgrade/downgrade/re-upgrade/integrity/FK PASS. ممیزی تازه کل npm صفر آسیب‌پذیری شناخته‌شده. backend audit تازه اجرا نشده؛ ابزار قبلاً DNS dependency داشت. سه warning قدیمی pytest باقی‌اند. این نتیجه، پذیرش نهایی مرحله۶ نیست.

## کد مقاله فعلی

`api/app/content_models.py`: Article با current `content_json` جدا از `published_json` و `scheduled_json`، ArticleRevision، ArticleAlias و PublicMedia. migration0018 مستقل/frozen؛ downgrade محتوای editorial DB را حذف می‌کند، فایل‌های رسانه را حذف نمی‌کند، backup هماهنگ لازم است.

`api/app/content.py` و `routers/content.py`: مجوز server-side و recheck زیر BEGINIMMEDIATE، optimistic revision/409، slug رزروشده شامل scheduledsnapshot، workflow draft/review/publish/schedule/unpublish/archive، snapshot تأییدشده زمان‌بندی مستقل از ویرایش بعدی نویسنده، history/restore فقط پیش‌نویس. زمان انتشار باید timezone داشته باشد؛ worker و خواندن عمومی due را یک بار زیرقفل منتشر می‌کنند و revision افزایش می‌یابد. author/reviewer/sources/summary/body وalt لازم‌اند؛ H1 متن برای جلوگیری از عنوان تکراری رد می‌شود.

Bleach6.4.0/HTML5 allowlist سمت سرور و DOMPurify3.4.16 در editor/preview؛ scripts/events/style/iframe/arbitraryimage/unsafeURL رد یا حذف می‌شوند. خروجی clean فقط HTMLbody است، attribute/JSON جدا escape می‌شوند. SEO شامل11check شفاف و تخمین فارسی است، تضمین Google یا medicalapproval نیست. reviewer فقط نام ثبت‌شده است؛ هیچ بازبینی علمی خودکار یا احراز صلاحیت ادعا نشده.

رسانه: decoder واقعی JPEG/PNG/WebP، سقف max_upload_bytes و20Mpixel، thumbnail2000، WebP بدون EXIF و UUID، کتابخانه احرازشده؛ عمومی فقط اگر مقاله منتشرشده آن را مصرف کند. رسانه private بیمار هرگز reuse نشود. پوشه جدید ENV-only `PUBLIC_MEDIA_DIR` باید خارج از UPLOAD_DIR وPUBLIC_HTML_DIR باشد؛ config overlap را رد می‌کند. owner رسانه/مدیرکل می‌تواند ویرایش/بایگانی کند؛ رسانه مصرف‌شده در current/public/scheduled حذف نمی‌شود. فایل بایگانی‌شده برای backup نگه می‌ماند.

`public_articles.py`: HTML کامل SSR، فهرست/جستجو/دسته/page، detail، canonical/OG Article/Breadcrumb، منابع/نویسنده/بازبین/تاریخ، dynamic sitemap فقطpublished. این صفحه‌ها native serverHTML هستند؛ script SPA از head حذف می‌شود تا React صفحه404 را روی متن نریزد. CSS عمومی درbundleindex است. ناشناس قدیمی410، alias مقاله تأییدشده301، draft404. هیچ محتوای قدیمی خودکار احیا نمی‌شود. Nginx HTTP/HTTPS مسیرهایarticles/media راproxy می‌کند، اما پذیرش runtime تازه هنوز اجرا نشده.

`StaffArticlesPanel.tsx`, `ArticleEditor.tsx`, `StaffMediaPanel.tsx`, `contentApi.ts`: Tiptap3.31.4 با تیتر/فهرست/quote/table/link/image/undo/redo و HTMLmode، draftautosave/409pause/localdownload، نسخه‌ها، انتشار/زمان‌بندی، preview امن/mobile، feedback سرور؛ lazy editor chunk حدود467KBraw/147KBgzip وStaff پایه163KBraw/36KBgzip. NodeView تصویر ازstaffpreviewcookie می‌خواند و serializer نشانیpublic را نگه می‌دارد؛ این رفتار تازه هنوز در مرورگر پذیرش نشده.

## اولین کارهای AI بعدی — مرحله۶ را فعلاً complete نکن

1. `git fetch` و بررسی SHA/tree/status؛ AGENTS.md، ROADMAP.md، همین فایل، PHASE_06_ARTICLES_WIP وCONTINUE_PROMPT را بخوان. مسیرها/فرمان‌های محیط پایین موجودند. تست قبلی را شاهدproduction معرفی نکن.
2. QA واقعی پنل editor/media در desktop/390px روی DB ساختگی: نویسنده در برابر publisher/read-only، autosave هنگام تایپ و تغییر انتخاب/خطا/409، خروج با draft، sourceHTML/pasteمخرب، imageNodeView/serializer، table/link/undo، sourceinputs، timezone schedule/history/restore، preview وloading/error/empty. screenshot جدید نشان بده؛ برای حساب/credential واقعی هیچ درخواست لازم نیست. مرورگر واقعی مقالاتِ مرحله۶ هنوز بررسی نشده است.
3. **عیب محتمل موجود در فرم categories/tags**: value از join و input بلافاصله split/trim/filter می‌شود؛ delimiter پایانی پاک می‌شود و ورود چند مقدار سخت است. قبل از پذیرش اصلاح کن (state متنی/commit مناسب). picker رسانه فعلاً فقط60آیتم اول را دارد؛ pagination/search/انتخاب رسانه قدیمی را کامل کن. لیست باonSaved total/pagination را به‌درستی تازه کند. این‌ها از خواندن کد شناسایی شده‌اند، هنوز تستbrowser ندارند.
4. بودجه/بازه/اعتبارسنجی frontend و پیام‌های invalidsource/blankslug را دقیق کن؛ autosave فعلاً با خطا pause و manualretry می‌خواهد. serverSEO وقتی payload نامعتبر باشد feedback راnull می‌کند؛ پیام راهنمای معتبر و صریح بده. previewcover، tagnavigation و قابلیت‌های تکمیلی ویرایشگر با نقشه‌راه تطبیق یابند.
5. regression/adversarial بیشتر برای slugرقابت و رزروscheduled پس از تغییرslugdraft، revision بعدscheduledpublish، چند تغییر/restore هم‌زمان، maxbytes/pixels/decoder، config overlap، mediaaudit/ownership، histories/bounds/rate و محدودیت تعداد رسانه/مقالات. بررسی policy reviewer نامی، حقوق انتشار تصویر و منابع را به مالک/بازبین واقعی واگذار کن؛ داده بیمار یا مقاله پزشکی واقعی نساز.
6. migration **پرشده editorial** و بازگشت0018، rollbackبا DB/mediabackup، seedmetadata، NginxHTTP/HTTPS syntax/runtime مسیرهایarticle/category/query/media/headers/410/301/404/noJS، jobsLinux وbackup/restore را بررسی کن. script عمومیverify-migrations فعلی رکورد واقعیeditorial درج نمی‌کند؛ PASS آن را با پذیرش rollback محتوایپرشده یکی ندان. پیام build/prerender قدیمی «Articles remain retired pending review» باید با قرارداد SSR جدید هماهنگ شود.
7. freshbackend dependency audit و نصبclean staging. PyPI CDN files.pythonhosted.org DNS این محیط شکست خورد؛ bleach/webencodings ازmirrorدریافت و **همهhashها با JSON رسمیPyPI تطبیق شدند**، proof درdocs. uv.lock registryرسمی با artifactmirrorhash دارد؛ source/index ناامن دائمی بهpyproject افزوده نشده. dependencyهای قبلی نسخه ثابت حفظ شدند؛ npm auditfix وابستگی‌های آسیب‌پذیر قدیمی را اصلاح کرد و audit تازه کلfrontend صفر است.
8. وقتی تمامROADMAPمرحله۶ پذیرش شد، docs/roadmap/progress/README/inventory/handoff نهایی، tests مناسب، PR پیش‌نویسready وmerge طبق مجوز قبلی مالک؛ fetchmain/tree/lsremote وsourceZIP+SHA256+handoff کنارخروجی. فعلاًاینsnapshotرا release یاcomplete ننام.

بعد از۶: مرحله۷ نظرات قابل تعریف/ترتیب/نمایش باpermissionsمستقل؛۸ ظاهر وserviceSEO؛۹ بازآرایی/بهینه‌سازی/CI؛۱۰ staging وdeploy پس ازمجوزصریح. مالک «نصب جدید» برایowner و رمزساز+recovery برایMFA انتخاب کرده. هیچ productionowner، deploy، bookingactivation، realpayment/SMS یا داده بیمار مجازنشده. previewها بسته‌اند؛ scratchها درwork و ZIPفقطtrackedsource است.

---
سوابق مراحل قبلی (بخش وضعیت بالا مقدم است):

# راهنمای ادامه کار برای AI بعدی

آخرین به‌روزرسانی: 2026-10-01، Asia/Tehran. نسخه1.12.0، پروژه MohammadArak/DrZamani-Website. مراحل صفر تا۴ در main؛ مرحله۵ پیاده‌سازی و آزمون نهایی دارد؛ رسید ادغام و SHA دقیق در گزارش تحویل است. قدم بعد مرحله۶ مقالات است. گزارش تحویل PHASE05 کنار خروجی‌ها مبنای دقیق source/merge/tree/ZIP را ثبت می‌کند؛ پرداخت/پیامک/کپچا واقعی و deploy هنوز پذیرش/فعال نشده‌اند.

## شروع و تصمیم‌های مالک

1. main را fetch و status/log/tree/VERSION بررسی کن؛ AGENTS.md، ROADMAP.md، PROGRESS_LOG، PHASE_01_SECURITY، PHASE_02_ACCESS، PHASE_03_SETTINGS، PHASE_04_CAPTCHA_MFA و SETTINGS_INVENTORY را بخوان. PR۱ با merge 08e929675777682701b9adb411759bb31cd69b2f و PR۲ با merge 18711829e0301e8b7d32ebd30de42cb3e2290dd3 منتشر شدند؛ PR۳ با main7814713e2391c0efec01d36b18fe96cca1d18c2d ادغام شد و مبنای مرحله۴ است. گزارش خروجی آخر، مبنای دقیق ادامه را دارد.
2. مالک خواسته هر مرحله پس از تست و به‌روزرسانی اسناد در همین ریپو کامیت و با main ادغام شود. اجازه مجدد نخواه. هر خروجی باید فایل ادامه کار شامل انجام‌شده/باقی‌مانده/خطا/محدودیت کنار خود داشته باشد. deploy و فعال‌سازی سایت زنده مجاز نشده است.
3. مالک مدیرکل را «نصب جدید» انتخاب کرده؛ هیچ نام کاربری/رمز واقعی دریافت یا ساخته نشده. در نصب مجاز از app.setup_owner با رمز تعاملی مخفی استفاده کن. ENV bootstrap/create_admin مدیر عادی هستند؛ admin قدیمی خودکار مدیرکل نشود.
4. مرحله بعد۵ است؛ مرحله۴ Google/Cloudflare و MFA رمزساز + recovery طبق انتخاب صریح مالک اجرا شد. پذیرش خارجی staging هنوز باقی است. کلید رزرو/پرداخت/پیامک مرحله ۵، مقاله/رسانه/SEO feedback مرحله ۶، نظرات مرحله ۷، طراحی/صفحات خدمات/SEO مرحله ۸، سبک‌سازی مرحله ۹ و پذیرش/deploy مرحله ۱۰. placeholder یا مجوز رزروشده را قابلیت اجراشده معرفی نکن.

## محیط و اجرای محلی

- workspace: C:/Users/Mahdi/Documents/Codex/2026-09-30/drfarzadzamani-ir-http-drfarzadzamani-ir؛ checkout در work/DrZamani-Website، فایل تحویل در outputs و scratch در work است.
- Windows PowerShell، Node24.15/npm11.12.1، uv0.11.24 و Python3.13.14 در api/.venv. از npm.cmd و .venv/Scripts/python.exe استفاده کن؛ python alias کار نمی‌کند. برای متن فارسی Get-Content -Encoding utf8 لازم است.
- UV_CACHE_DIR=work/uv-cache، UV_TOOL_DIR=work/uv-tools، UV_TOOL_BIN_DIR=work/uv-tool-bin، UV_PYTHON_INSTALL_DIR=work/python-runtime را به مسیر مطلق workspace تنظیم کن. UV tool بدون این تنظیم ممکن است ACL access denied بدهد. uv sync --frozen --offline آخر 45 بسته را بررسی کرد.
- pytest از api: .venv/Scripts/python.exe -m pytest -o addopts='' -q --basetemp=../../pytest-NEXT-UNIQUE. temp تازه زیر work انتخاب کن؛ AppData temp این میزبان ACL خطا دارد. migration از ریشه: api/.venv/Scripts/python.exe scripts/verify-migrations.py. lint/build: npm.cmd run lint/build. Ruff: uv tool run --offline ruff check --select E9,F63,F7,F82 api.
- APP_ENV=test/development صریح، debug فقط آزمایش، SMS console/disabled، پرداخت ساختگی و DB/UPLOAD مستقل. production به‌صورت پیش‌فرض امن است و debug/کلید ضعیف/sandbox/console را رد می‌کند.
- Git شبکه با schannel این ویندوز خطای SEC_E_NO_CREDENTIALS می‌دهد؛ git -c http.sslBackend=openssl استفاده کن، TLS خاموش نشود. push بومی credential manager خطا دارد؛ connector tree/commit/ref/PR استفاده شد. tree منتشرشده باید دقیقاً با Git tree آزموده برابر باشد؛ سپس fetch/diff و فقط در صورت برابری، soft reset به SHA connector. force push لازم نیست. PR همیشه attach و با expected_head_sha ادغام؛ main دوباره fetch و tree تأیید شود. commit محلی به معنی انتشار نیست.
- عبارت 'HEAD^{tree}' در PowerShell quote می‌خواهد. git archive با -c core.autocrlf=false، سپس تطبیق comment/filelist/CRC و بایت فایل‌های نماینده با Git blob. ENV واقعی، DB، upload خصوصی، credential، dependencies نصب‌شده، cache، build و fixture مرورگر وارد ZIP نشوند.
- previewها بسته و فایل‌های phase04-preview/fixtures از سورس حذف شده‌اند؛ DBهای phase03-* فقط داده مستقل work هستند. screenshots phase03-settings-desktop/mobile در outputs از API ساختگی‌اند.

## کار انجام‌شده

مرحله ۱: production/debug امن، PNG CAPTCHA، قفل حساب/IP پایدار، مصرف اتمی OTP بدون نشت log، cookie HttpOnly/Secure/SameSite با CSRF/Origin، بیمار ۷ روز/کارمند ۱۲ ساعت پیش‌فرض، logout واقعی و fingerprint/ابطال WS، decoder/pixel و cleanup آپلود، Excel/calendar امن. Nginx header/CSP/rate limit/404 و XFF جایگزین و Upgrade فقط realtime دارد. جزئیات در PHASE_01_SECURITY است.

مرحله ۲: Role/Permission/RolePermission/StaffRole چندگانه، require_permission در همه API کارکنان و WS، تفکیک داده حساس/اکسل، AccessPanel با CRUD حساب/نقش، مدیرکل محافظت‌شده و حفاظت آخرین مالک در قفل هم‌زمان. legacy role فقط سازگاری است؛ مجوز root-only به custom role داده نمی‌شود. seed نقش ویرایش‌شده را reset نمی‌کند. migration0014 نشست کارکنان را باطل می‌کند و admin قدیمی را owner نمی‌کند؛ downgrade همه کارکنان را غیرفعال می‌کند تا کد قدیمی دسترسی اضافی ندهد.

مرحله ۳:

- SystemSetting singleton و SettingRevision تاریخچه؛ ClinicSetting قبلی با revision و سه فیلد SEO توسعه یافت. ۲۸ فیلد typed/bounded همراه help/default/source فقط secrets.manage مدیرکل؛ clinic مطابق settings.view/edit.
- BEGIN IMMEDIATE، expected revision و خواندن مجدد مجوز مانع overwrite می‌شود؛ stale پاسخ 409 دارد. audit فقط نام فیلد/نسخه. restore کل clinic/overlay را با سیاست فعلی سرور به نسخه تازه برمی‌گرداند؛ تاریخچه API حداکثر ۱۰۰ metadata و بدون snapshot/secret است.
- runtime_settings در هر خواندن DB تازه می‌گیرد؛ API/jobs cache پردازشی قدیمی ندارند. config.get_settings برای bootstrap زیرساخت باقی است؛ DB/config را به runtime وابسته نکن تا cycle ساخته نشود. ENV فقط مقدار پایه است و تغییرش restart تمام سرویس‌ها می‌خواهد.
- توکن webhook، کلید فراز و merchant ID با Fernet مستقل و envelope متصل به نام فیلد رمزگذاری می‌شوند. API مقدار/default رمز نمی‌دهد. ورودی خالی حفظ رمز، clear مقدار خالی رمزگذاری‌شده و جلوگیری از ENV fallback، reset بازگشت به ENV فعلی است. فقدان/خرابی کلید هنگام خواندن secret با 503 امن رد می‌شود. هیچ secret از ENV خودکار کپی نمی‌شود.
- SETTINGS_ENCRYPTION_KEYS در API/jobs یکسان، مستقل از SECRET_KEY و CSV با کلید جدید اول و قدیمی‌های بعدی است. تاریخچه و داده دست‌نخورده هنوز کلید قبلی می‌خواهند. DB و همه کلیدهای لازم جداگانه backup امن؛ حذف old key بدون بازرمزگذاری کامل خطرناک است و ابزار آن هنوز ساخته نشده است.
- outbound.py وب‌هوک HTTPS/443، allowlist دقیق ENV، رد IP/userinfo/شبکه خصوصی و DNS ترکیبی، اعتبارسنجی در هر ارسال، اتصال به IP تأییدشده با TLS/SNI اصلی، بدون proxy/redirect. probe HEAD بدون token/payload/پیامک است؛ HTTPstatus صحت credential یا تحویل را ثابت نمی‌کند.
- public_pages.py اطلاعات مطب، HTML اولیه، metadata/OG/Twitter/canonical/JSON-LD، robots و sitemap را از DB می‌خواند؛ فقط assetهای bundle از public_html/index.html. no-store و escape؛ private noindex و 404 واقعی، articles قدیمی هنوز 410. robots اجازه crawler می‌دهد تا noindex را ببیند.
- Nginx جدید مسیرهای دقیق عمومی را به backend و assetها را استاتیک می‌دهد؛ تغییر مطب build مجدد نمی‌خواهد. این SSR کامل React نیست؛ متن اولیه مطب تازه است و UI کامل با JS mount می‌شود. نبود build پاسخ 503؛ میزبانی صرفاً استاتیک یا Nginx قدیمی این تازگی را ندارد.
- React public bootstrap و context واحد تلفن/نشانی/hero/footer/SEO، BroadcastChannel بدون داده حساس و refresh focus؛ StaffSettingsPanel مستقل ۸ بخش، ورودی رمز بدون مقدار و history دارد. OTP UI/backend طول واقعی ۶ تا ۸ رقمی می‌گیرد؛ app_name در health/OpenAPI تازه می‌شود. تصویر SEO فعلاً URL است؛ uploader رسانه عمومی مرحله ۶ است.

## شواهد، خطاها و محدودیت‌ها

۱۴۲ pytest PASS (۱۰۴ قبلی+۳۸ تازه)، npm lint/build، نسخه واحد، uv frozen offline با ۴۵ بسته، Ruff بحرانی و migration fresh/upgrade/downgrade/re-upgrade، حفظ clinic/staff، integrity/FK/payment UNIQUE پاس شدند. CAS هم‌زمان 200+409، پردازش Python مستقل، encryption/masking/rotation/clear/reset، bounds/production guards، SSRF/DNS/redirect، HTML/SEO/XSS و OTP۸/OpenAPI آزموده شدند.

Nginx واقعی محلی: تغییر تلفن/title در HTML بدون build، no-store، homepage قابل index، پنل noindex، alias301، headers/404/410، cookie/CSRF/logout، WS upgrade/revocation و edge rate limit PASS؛ syntax HTTP/HTTPS PASS. UI React واقعی با API ساختگی desktop/390px: ذخیره عمومی/افزایش نسخه، masked secret، read-only مجوز محدود و نبود overflow افقی بررسی شد. ورود احرازشده مرورگر تا API واقعی روی staging و خدمات خارجی Neshan/SMS/payment/CAPTCHA هنوز پذیرش نشده‌اند.

cryptography50.0.0 با cffi2.1.1 و pycparser3.0 اضافه شد؛ audit نهایی backend و frontend اجرایی صفر مورد شناخته‌شده. cryptography46.0.7 اولیه ۷ هشدار داشت و عوض شد. files.pythonhosted.org روی این میزبان DNS11001 داد؛ artifactهای سه بسته جدید از Aliyun mirror دریافت و همه hashها با JSON رسمی PyPI تطبیق داده شد. uv.lock registry رسمی و artifact URLهای mirror با hash اصلی دارد؛ dependencyهای قبلی تغییر نکردند. frozen offline از cache پاس شد؛ نصب clean در شبکه VPS/staging هنوز باید پذیرش شود.

خطاهای گذرای CSS fixture، temp ACL، quoting PowerShell و key fixture تولیدشده در هر call اصلاح شدند. smoke ابتدا رمز ساختگی نادرست و انتظار Disallow داشت؛ رمز صحیح و noindex header/meta تأیید شد. تست قدیمی capacity نزدیک پایان روز تنها یک slot می‌دید؛ روز کامل آینده انتخاب و کل suite دوباره پاس شد. سه warning قدیمی pytest (httpx/TestClient و نام 422) و Nginx listen http2 باقی‌اند؛ checks نهایی خطای حل‌نشده ندارد.

0015 downgrade overlay/history/SEO را حذف می‌کند؛ قبل از آن backup DB+کلیدها و تطبیق ENV با تنظیمات مؤثر و هماهنگی کد/DB/Nginx لازم است. rollback صرفاً کد قدیمی می‌تواند credential/policy را تغییر دهد. downgrade0014 کارکنان را غیرفعال می‌کند؛ بازفعال‌سازی نیازمند بررسی حساب/مجوز است.

## مراحل باقی و مرز مجوز

پذیرش خارجی مرحله۴: قرارداد Google/Turnstile و MFA اجرا و آزموده‌اند؛ کلید واقعی و شبکه/هزینه/سهمیه/provider widget با CSP هنوز روی staging پذیرش نشده‌اند. قبل از روشن‌کردن، طبق PHASE_04_CAPTCHA_MFA آزمون مالک/دامنه‌های واقعی و بازیابی خصوصی انجام شود.

مرحله ۵: booking_enabled اولیه خاموش و پیام قابل ویرایش؛ خاموش‌شدن رزرو ورود/پرونده و callback پرداخت شروع‌شده را خراب نکند. callback پس از قفل وضعیت تازه و idempotency در100/101/NOK و هم‌زمانی؛ UNIQUEpayment_id موجود است و ثبت دو نوبت قطعی ادعای تأییدشده نیست. SMS outbox موجود را حفظ و dispatch را از redirect جدا کن. سپس مقاله/رسانه/HTML sanitize/SEO feedback، نظر، طراحی و پذیرش.

گزارش اولیه چند ادعای نادرست داشت: UNIQUE payment_id، SMS outbox، clinic settings و noindex/410 از قبل موجود بودند. backend و رزرو سایت زنده طبق مالک عمداً خاموش‌اند؛ خطای استقرار فرض نکن یا خودکار روشن نکن. هیچ deploy، SMS/payment واقعی، اتصال DB بیماران، مالک production یا فعال‌سازی رزرو انجام نشده است. پایان هر مرحله code+roadmap+handoff، PR attach/merge، fetch/tree و ZIP verification الزامی است.

## ادامه از مرحله۴ — نکات قطعی

مرحله۴ از main7814713e2391c0efec01d36b18fe96cca1d18c2d، نسخه1.11.0. آخرین تحویل/ZIP و SHA دقیق را از DELIVERY_REPORT-PHASE04 و METADATA کنار خروجی بخوان؛ پس از انتشار main fetch/tree تطبیق می‌شود. docs/PHASE_04_CAPTCHA_MFA.md قرارداد و نصب/rollback کامل دارد. اسناد تاریخی مرحله۳ را گزارش وضع قبل بدان، نه کار تکراری برای مرحله بعد.

43فیلد runtime،15فیلد جدید captcha/MFA. bot_protection.py مقصدHTTPS ثابت/timeout8/no proxy redirect، Googleapikeyheader، domain/action/age/score، tokenHashUNIQUE و مصرف پیش از I/O، policy fresh بعدI/O؛ bot router public فقطsitekey و setup/confirmowner. attestation HMAC همانcredential/key/hostnames/score؛ فعال‌سازی بدونproof ممنوع، حتیENV و نبودsystemrow. fallback فقطbackendoutage و هر دوenabled یک بار؛ frontendnetworkerror یا securitydeny fallback نیست.

browser_sessions.staff_state_hash شامل enabledMFA/revision و policyrequiredowner؛ disabled/pending record دقیقاً(False,0) است تا pendingنشست را نبندد. routers/mfa.locked_self بعدlimit و BEGINIMMEDIATE، session/CSRF/revocation را دوباره کنترل می‌کند. account/ip independent limits؛ passwordsuccess صرفاًchallengeMFA می‌سازد و limiterfactor را reset نمی‌کند. MFAverify atomic counter/recovery consumption؛ cookie/bearer transport/IP/hash binding؛ fullsession تنها بعدfactor. seed و pending در envelope name mfa:staffid با همانFernetkeys، codeهاHMAC SECRETKEY. TOTP6/SHA1/30s±1، pending10min، loginchallenge180s، recovery10×128bit. secret/recovery تنهاprivate one-time selfresponse وstateموقتUI، نهaudit/settings/public/localStorage. QR وجود ندارد؛ manualentry وotpauthlink اجرا شده‌اند.

اجبار owner تنها بعدenroll همهactiveowners؛ promotion/create_ownerunenrolled هنگامmandatory ممنوع. هریکregularstaff باsecurityselfmenu می‌تواندenroll شود سپسownerupgrade. CLIrecover فقطprivate serveractiveowner وexactRECOVERusername، revokesallstaffsessions؛ resetselectedMFA ولی globalrequiredfalse، otherfactorsباقی. disablecaptchabothfalsePNGlocalباقی. هیچCLIproduction اجرا نشده. SECRETKEYrotation invalidateattestations/recovery/session؛ قبلخاموشproviders و بعدreproof/regenerate. Fernetrotation نیازhistoricalkeys/history/MFAseed دارد و reencrypttoolهنوزوجودندارد.

0016 upgrade4tables/newfingerprintsessionrevoke؛ پیش‌فرض providers/mandatoryfalse. downgrade همهstaffinactive/sessionrevoke،4tabledelete و15fieldsstripازoverlay/history؛ reupgradeخودکارreactivateنکند. restorebackupهمراهDB/keys/code/ENV/Nginx، role/accountreview قبلreactivate. این رفتار امنیتی را حذف نکن.

185pytest/43new،lint/build/versions،frozen45packages،Ruffcritical،migrationpopulatedroundtrip وNginxactuallocalcookie/CSRF/MFApreauth/recovery/WSrevoke/CSP/headers/404/410/ratePASS؛ auditfreshknown0،newdependency0. UI syntheticdesktop390px checks؛ actualproviderkeys/widget/network/quotas/CSPacceptance وrealbrowserauthenticatedAPIstagingباقی. Screenshotsphase04-... درoutputs ساختگی‌اند. previewfilesازrepoپاک وserversجمع‌شده‌اند؛ DBهایworkphase04-* synthetic هستند و Fernet/SECRET runtimeحفظنشده، دادهproduction نیستند. testhelperimports APPENVexplicit، basetemp unique، uvpathsJoin/FullPath (uv-tool-bin ممکن است هنوزdirectoryنباشد؛ Resolve-Path برای nonexistent استفاده نکن). گذرای pendinghashbug/testproperty/CSPserverorigin/envhelper/productionlocalhostfixture اصلاح شده وcheckspass. سهwarningoldpytest،nginxlistenhttp2 وfallbackprerenderبدونAPI باقی.

مرحله۵ را محدود به booking_enabledfalse/پیام وAPIhold/paymentstartgate، callback100/101/NOKracefreshafterlock/idempotency وoutboxworker انجام بده؛ لاگین/پرونده وcallbackپرداختقبلی با خاموش‌شدن رزرو قطع نشوند. phase4externalacceptanceقبلروشن‌کردنproduction باقی؛ هیچ deploy/مالکproduction/realpaymentSMS/bookingactivation خودکار مجاز نیست. همانریپو، test/doc/commit/PRattach/merge/fetch/tree وsourceZIPverification+handoff طبق مجوز قبلی مالک انجام شود.


## آخرین مرحله:۵ — رزرو و پرداخت/پیامک

مبنای این مرحله main16dbccd2d957e993c21057dcc5485ac084acd8fe، PR۴ است. گزارش مرجع PHASE_05_BOOKING_PAYMENTS.md را قبل ادامه بخوان. BOOKING_ENABLEDfalse و پیام عمومی فارسی در runtime45fields، policyمشترک API/HTML/React، checkزیرقفل روی createhold/booking/reschedule/newwaitlist؛ login/records/cancel/readwaitlist/leave/callback برقرار. staff عملیات داخلی موجود را انجام می‌دهد ولی offer جدید در خاموشی صادر نمی‌شود. UI focus/broadcast/30srefresh و getClinic پیش ازفرم؛ API مرجع نهایی است.

callbackverifyoutsidewrite سپس BEGINIMMEDIATE/expire_all/reload/terminalrecheck؛ 100/101+validref، NOK/latefailed/networkerror/expiry نمی‌تواندverified را خراب کند. expiredhold اگرslotfree کامل، conflict/refund/refcollision manualreview؛ UNIQUEpaymentid/ref محفوظ و حداقلیreceipt بدونPAN/cardhash. redirect فقطenqueue؛ failedpendingSMS پس ازموفقیتcancelled. merchant/sandbox پنل وrestore باcreated/redirected/verification_error ممنوع؛ ENV/accountقبلی برایlateexpired/failedreconciliation حفظ شود، snapshotcredentialperpayment هنوزوجودندارد.

SMSoutboxdedupe160/claimtoken64/claimuntil2min/nextattemptat؛ workerclaim1job زیرSQLitewrite، سپسnetworkoutside وtokencheckedreceipt. attemptsmax3/backoff5,10min؛ staleleasefaileddelay5 و warningdeliveryuncertain. externalSMSatleastonce: crashafterprovidersendbeforeDBreceipt ممکن استduplicate؛ دقیقاًیک‌بار خارجی تضمین نیست. providerdisabled صف/attemptbudget راحفظ؛ OTPdirectباقی. reminderproducerهمlock/dedupe دارد. jobs CLI/timer1min/TimeoutStartSec1h وstaffexplicitdispatch ازهمانworker. Linuxsystemd/realSMSپذیرش نشده.

0017forcesclosed حتیENVtrue وSMS4columnsunique، existingrows حفظ. CAS ایراد اولیه: centralrevision2 ولیclinic1 باعث409 بود؛ migrationalignclinic وseedfreshmigrationrevision اصلاح وintegrationNginxassert شد. rollbacksending→failedattempt3manualreview، bookingkeysstripoverlay/history؛ oldcodebookingflagندارد پسmaintenanceقبلrollback وbackupcoordinated؛ 0016disableaccounts/revokesessions نیز برقرار.

۲۱۵ تست pytest (۳۰ تست تازه این مرحله)، lint/build/نسخه، frozen sync با۴۵بسته، Ruff بحرانی، migration با داده قبلی/rollback/seed/CAS، Nginx HTTP/HTTPS syntax و runtime cookie/CSRF/MFA/WebSocket/headers/404/410/rate و تغییر فوری سیاست رزرو PASS. ممیزی frontend production صفر آسیب‌پذیری شناخته‌شده گزارش کرد؛ ممیزی تازه backend به DNS ابزار خورد و اجرا نشد. dependency تازه به پروژه اضافه نشده است. screenshot موبایل رزرو خاموش روی API/Nginx محلی و فرم تنظیمات با API ساختگی ثبت شد؛ پذیرش واقعی ارائه‌دهندگان و Linuxsystemd باقی است.

مرحله۶ بعدی: مقاله/رسانه با RBAC authoritative، HTML sanitization وpreview/draft/publish، SEOfeedback/persistentmetadata/SSR/canonical/sitemap وclinicalreviewcontent. اول ROADMAPمرحله۶ وpermissioncatalogfutureflags راخوانده سپس scopeمشخص؛ همانrepo وtest/doc/commit/PRattach/merge/fetch/tree/sourceZIP+handoff طبق مجوز قبلی مالک. productionowner«نصب جدید» و MFAرمزساز+recovery تصمیم قبلی؛ هیچdeploy/realSMS/payment/bookingactivation بدوندستور صریح. previewDBphase05-* وscreenshots synthetic؛ keysprocessحفظنشده، credentialsواقعی نیستند.

## 2026-10-01 — اصلاح نمایش رزرو خاموش، نسخه1.12.1

طبق اصلاح صریح مالک، /appointment/ در حالت خاموش فقط پیام تنظیم‌شده و تقویم متوقف با انیمیشن تنفس آرام دارد؛ فرم ورود و پنل بیمار اصلاً mount نمی‌شوند، حتی با cookie قبلی. CSS عمومی و HTML اولیه بدون JavaScript هم همین پیام را دارند. prefers-reduced-motion انیمیشن را خاموش می‌کند. برچسب صفحه اصلی وضعیت نوبت‌دهی است؛ ادعای دسترسی UI ورود در خاموشی حذف شد. API پرونده و callback پرداخت شروع‌شده برای سازگاری و رسیدگی قبلی حفظ شده‌اند؛ این تصمیم درباره نمایش عمومی است. بررسی تازه سیاست قبل از mount فرم لازم است و شکست API رزرو را بسته نگه می‌دارد. متن سیاست قدیمی حفظ ورود UI در این اسناد، با همین درخواست تازه مالک جایگزین شد.

ادامه: مرحله۶ مقالات/رسانه/بازخوردSEO؛ حدود مجوز و شواهد تحویل مطابق گزارش خروجی. هیچ deploy یا فعال‌سازی production مجاز نشده است.
