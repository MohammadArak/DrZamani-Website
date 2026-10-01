# مرحله۶ — snapshot در حال انجام، نسخه منبع1.13.0

مالک در2026-10-01 خواست ادامه کار بهAIدیگر واگذار شود؛ تغییرات فعلی برای ادامه در شاخهphase-06-articles وPRپیش‌نویس ذخیره می‌شوند. main نسخه1.12.1 اصلاح رزرو را دارد. مرحله۶ complete/merged/deployed نیست.

پیاده‌سازی فعلی: editorialmodels/migration0018، RBAC زیرقفل/CAS وsnapshotمستقل/publication/schedule، sanitizeHTML/URL،40تستbackend، رسانه جدا/مالکیت/decoderWebP/public-only-onpublication،11بازخوردSEO، publicSSR/canonical/OG/Article/Breadcrumb/category/search/sitemap، editorTiptap/HTML/autosave/history/preview وlibraryUI. شرح معماری، خطاهای شناخته‌شده و قدم‌های لازم درAI_HANDOFF ابتدایفایل است.

شواهد snapshot: 255pytest PASS با3warningقدیمی؛ lint/build/version، Ruffcritical، frozen47، migrationfresh/roundtrip/integrity/FK عمومیPASS؛ auditتازهکلnpm0شناخته‌شده. PublicSSR وpermission/sanitization/snapshot/media باTestClient ساختگی آزموده شدند؛ هیچ UIمرحله۶ درمرورگر یاNginxruntime آن پذیرش نشده. freshbackend audit/staging/cleaninstall و rollbackپرشدهeditorial باقی‌اند.

موارد باز: categories/tagsdelimiter احتمالی، رسانهpicker60آیتم، pagination/total تازه، autosave/error/409/read-only/رفتارimageNodeView/table/link/history/mobile واقعی، previewcover/tagnavigation، budget/bounds/audit بیشتر، revision/scheduledslugraces، NginxHTTP/HTTPS headers/SSR/legacyroutes، editorialbackup/restore وprerendertext قدیمی. کد فعلی نباید بدون بررسیAIبعدی mainmerge/release معرفی شود.

dependencyها: Tiptap3.31.4،DOMPurify3.4.16،Bleach6.4.0،webencodings0.6.1؛ منابع رسمی [React](https://tiptap.dev/docs/editor/getting-started/install/react)،[TableKit](https://tiptap.dev/docs/editor/extensions/nodes/table)،[Image](https://tiptap.dev/docs/editor/extensions/nodes/image)،[Bleach](https://bleach.readthedocs.io/en/latest/clean.html). CDN PyPI DNSخطا داشت، دوartifactجدیدازmirror باhashرسمیverifyشدند؛ docs/DEPENDENCY_PROOF_PHASE06.json. npmcacheاولACL داشت وcacheworkspace حلشکرد؛ critical frontendadvisories باauditfixرفع و ممیزی نهایی0است. importمفقودget_db وlazyimportاشتباه درتوسعه اصلاح وlint/build/fulltestsنهایی پاس.

هیچ production، deploy، داده/رسانه بیمار، حسابownerواقعی، پرداخت/SMSواقعی یا کلیدرزروproduction تغییر نکرد. rolloutسابق1-5 و MFA/captcha/payment/SMSproviderهایreal همچنانstaginggatesدارند.
