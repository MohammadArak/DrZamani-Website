# بررسی mobile-first — 2026-10-14، در حال انجام

این سند، پژوهش و موجودی بررسی است؛ اتمام ممیزی همه اجزا را اعلام نمی‌کند.

## مبنای طراحی و منابع

چیدمان ابتدا در عرض کوچک و سپس با فضای واقعی محتوا به چند ستون تبدیل می‌شود. تصاویر اندازه اعلام‌شده دارند تا فضای آن‌ها قبل از بارگیری رزرو شود. جزئیات توصیه‌های رسمی: [web.dev](https://web.dev/articles/responsive-web-design-basics) و [MDN](https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/CSS_layout/Responsive_Design).

ری‌فلو در320CSSpx و بزرگ‌نمایی حفظ می‌شود؛ جدول و دادهٔ واقعاً دوبعدی می‌تواند داخل ظرف خود اسکرول داشته باشد، صفحه نباید افقی جابه‌جا شود. کنترل‌های مستقل حداقل24×24یا فاصله معادل، و برای اقدام‌های اصلی حدود44px هدف‌گذاری می‌شوند. استثناهای لینک در متن از دکمه جداست. مرجع: [WCAG2.2](https://www.w3.org/TR/WCAG22/) و [شرح reflow](https://www.w3.org/WAI/WCAG21/Understanding/reflow).

صفحه‌کلید ممکن است فقطviewportدیداری را کوچک کند. resizes-content برای مرورگرهای پشتیبان درخواست می‌شود، بدون بستن zoom؛ اسکرول ضروری فرم در ارتفاع کم باقی است. این تنظیم جایگزین تست گوشی واقعی نیست. [MDN VisualViewport](https://developer.mozilla.org/en-US/docs/Web/API/VisualViewport).

هویت آبی/طلایی، اندازه متن خوانا، دسترسی فقط به همان وظیفه، دکمه بدون وابستگی بهhover، focusمشخص وprefers-reduced-motion معیار کار هستند. طرح سایت تجاری دیگر کپی نمی‌شود؛ این الگوهای رسمی به ساختار موجود پیاده می‌شوند.

## یافته‌ها و اصلاح‌های تأییدشده تا این نقطه

- چت در320×568 حداقلارتفاع620داشت وورودی خارجviewportمی‌افتاد. ارتفاعAppکارکنان100dvh وfooterواقعیflex؛ mainمحتوا minheight0 وscrollداخلپنل، chatheight100%شد. پس از تغییرpage320×568،textareaدر441..482 وfooterدر503..568بود؛ اسکرولصفحهاضافه حذف شد. layoutسایرپنل‌ها هنوز باید تک‌تک دیده شود.
- ستونimplicitgrid حداقل محتوای341pxساخت وh3عنوان24pxبرید. grid-cols-1/min-w-0 وfont16pxعنوانchat،header320pxوheading66..210 تأییدشد.
- منوی کارکنان بهDrawerمشترک با focustrap/Escape/returnfocus وaria-hiddenپشتصفحه تبدیل شد. Escapeازbuttonداخلمنو بستهشد وfocusبهtriggerبرگشت. positiveboundsDrawer وARIAایزوله برایهمهمنوها بهبود؛ نسخه آخر نیازمندbuild/QAاست.
- چت درdesktopکوچک دو ستون، جزئیات فقطxl؛ درموبایل فهرست/گفتگو جدا بادکمهبازگشت. keyboard/landscapeوآزمون1024..1280باقی.
- کارت آمار درموبایل قبلاًhiddenبود؛ زیرعکس باlayoutطبیعی قابل نمایش،دسکتاپoverlayهمانقبلی. Counterوfloatحفظ؛ عدد میانی وفضایbottom هنوزQAباقی.
- رزروهدر320pxدولاینشد؛ logobase128وnowrapدکمهدرکد اصلاح،آخرینbuild/QAباقی. spacingنامپزشکبهبود.
- تصاویرگالری width/height واقعیpublicmediaباqueryگروهی/static614×768؛ حذفمدیاfailclosed،بدونانتشارmetadataخصوصی. SaveData/2concurrent/idledeferredتصاویرقبلی حفظ.

## ماتریس بررسی

| سطح | اجزا | وضعیت فعلی |
|---|---|---|
| عمومی | هدر/منو/هیرو/آمار/خدمات/نظر/گالری/FAQ/مقالات/نقشه/فوتر | منبع و اولین320بررسی؛ همهwidth/stateها ناتمام |
| محتوا | articleindex/search/filter/pagination/detail/sources/hero/serviceCTA | سئو و servicebrowserقبلی؛ ماتریس موبایل باقی |
| ورود و خطا | staff/patient/MFA/CAPTCHA/404/maintenance/connection/offline/bookingclosed | staffچندعرض قبلی؛ actualchatdisconnect/recoverydone؛ فرمpatient/gatesواقعی باقی |
| کارکنان | داشبورد/منو/تقویم/نوبت/بیمار/انتظار/مالی/SMS/audit/settings/roles | dashboard/chat320done؛ هرپنل+forms/dialogها باقی |
| CMS | مقاله/editor/SEO/AI/media/gallery/comments/FAQ/home/service | serviceupload/draft/SEOauthenticateddone؛ mobilematrixباقی |
| بیمار | profile/intake/booking/reschedule/chat/attachments | رزروproductionخاموش؛ محیط ساختگی مجزا لازم |
| مشترک | Dialog/Drawer/button/select/form/calendar/textarea/toast/empty/loading/status | sourceinventory؛ functional/screenresize/focus/touchحالت‌ها هنوز درحال کار |

## همه کامپوننت‌های موجود

در هر فایل، الگوهای سایز ثابت وoverflow برای تعیین تست دیده شده؛ scanمنبع، تأیید بصری یا آزمون رفتاری نیست. inventoryماشینی کنارخروجی ثبت است. فایل‌های index/barrel بدونrender جزو این جدول نیستند.

| فایل | مرورگر/تعامل |
|---|---|
|`src/components/Accordion/Accordion.tsx`|در ماتریس سطح مرتبط؛ پذیرش کامل هنوز باقی|
|`src/components/Accordion/index.tsx`|در ماتریس سطح مرتبط؛ پذیرش کامل هنوز باقی|
|`src/components/AppSelect/AppSelect.tsx`|در ماتریس سطح مرتبط؛ پذیرش کامل هنوز باقی|
|`src/components/ArticleEmpty.tsx`|در ماتریس سطح مرتبط؛ پذیرش کامل هنوز باقی|
|`src/components/AutoGrowTextarea/AutoGrowTextarea.tsx`|در ماتریس سطح مرتبط؛ پذیرش کامل هنوز باقی|
|`src/components/AvailabilityCalendar/AvailabilityCalendar.tsx`|در ماتریس سطح مرتبط؛ پذیرش کامل هنوز باقی|
|`src/components/BookingClosed.tsx`|در ماتریس سطح مرتبط؛ پذیرش کامل هنوز باقی|
|`src/components/BookingNotice.tsx`|در ماتریس سطح مرتبط؛ پذیرش کامل هنوز باقی|
|`src/components/BotProtection.tsx`|در ماتریس سطح مرتبط؛ پذیرش کامل هنوز باقی|
|`src/components/BusinessHoursView.tsx`|در ماتریس سطح مرتبط؛ پذیرش کامل هنوز باقی|
|`src/components/Button/Button.tsx`|در ماتریس سطح مرتبط؛ پذیرش کامل هنوز باقی|
|`src/components/Button/index.tsx`|در ماتریس سطح مرتبط؛ پذیرش کامل هنوز باقی|
|`src/components/Card/Card.tsx`|در ماتریس سطح مرتبط؛ پذیرش کامل هنوز باقی|
|`src/components/Card/index.tsx`|در ماتریس سطح مرتبط؛ پذیرش کامل هنوز باقی|
|`src/components/CloseButton/CloseButton.tsx`|در ماتریس سطح مرتبط؛ پذیرش کامل هنوز باقی|
|`src/components/CloseButton/index.tsx`|در ماتریس سطح مرتبط؛ پذیرش کامل هنوز باقی|
|`src/components/ConnectionStatus.tsx`|در ماتریس سطح مرتبط؛ پذیرش کامل هنوز باقی|
|`src/components/ConsultationDialog/ConsultationDialog.tsx`|در ماتریس سطح مرتبط؛ پذیرش کامل هنوز باقی|
|`src/components/Dialog/Dialog.tsx`|در ماتریس سطح مرتبط؛ پذیرش کامل هنوز باقی|
|`src/components/Dialog/index.tsx`|در ماتریس سطح مرتبط؛ پذیرش کامل هنوز باقی|
|`src/components/DoctorEdgeDefs.tsx`|در ماتریس سطح مرتبط؛ پذیرش کامل هنوز باقی|
|`src/components/Drawer/Drawer.tsx`|در ماتریس سطح مرتبط؛ پذیرش کامل هنوز باقی|
|`src/components/Drawer/index.tsx`|در ماتریس سطح مرتبط؛ پذیرش کامل هنوز باقی|
|`src/components/ErrorBoundary.tsx`|در ماتریس سطح مرتبط؛ پذیرش کامل هنوز باقی|
|`src/components/Form/Form.tsx`|در ماتریس سطح مرتبط؛ پذیرش کامل هنوز باقی|
|`src/components/Form/FormContainer.tsx`|در ماتریس سطح مرتبط؛ پذیرش کامل هنوز باقی|
|`src/components/Form/FormItem.tsx`|در ماتریس سطح مرتبط؛ پذیرش کامل هنوز باقی|
|`src/components/Form/index.tsx`|در ماتریس سطح مرتبط؛ پذیرش کامل هنوز باقی|
|`src/components/Iframe/index.tsx`|در ماتریس سطح مرتبط؛ پذیرش کامل هنوز باقی|
|`src/components/Iframe/LazyIframe.tsx`|در ماتریس سطح مرتبط؛ پذیرش کامل هنوز باقی|
|`src/components/InputGroup/Addon.tsx`|در ماتریس سطح مرتبط؛ پذیرش کامل هنوز باقی|
|`src/components/InputGroup/index.tsx`|در ماتریس سطح مرتبط؛ پذیرش کامل هنوز باقی|
|`src/components/InputGroup/InputGroup.tsx`|در ماتریس سطح مرتبط؛ پذیرش کامل هنوز باقی|
|`src/components/JalaliDatePicker/JalaliDatePicker.tsx`|در ماتریس سطح مرتبط؛ پذیرش کامل هنوز باقی|
|`src/components/Motion/Motion.tsx`|در ماتریس سطح مرتبط؛ پذیرش کامل هنوز باقی|
|`src/components/PatientRescheduleDialog/PatientRescheduleDialog.tsx`|در ماتریس سطح مرتبط؛ پذیرش کامل هنوز باقی|
|`src/components/RavielCredit.tsx`|در ماتریس سطح مرتبط؛ پذیرش کامل هنوز باقی|
|`src/components/SEO/index.tsx`|در ماتریس سطح مرتبط؛ پذیرش کامل هنوز باقی|
|`src/components/SEO/Seo.tsx`|در ماتریس سطح مرتبط؛ پذیرش کامل هنوز باقی|
|`src/components/ServiceIcon/ServiceIcon.tsx`|در ماتریس سطح مرتبط؛ پذیرش کامل هنوز باقی|
|`src/components/Spinner/Spinner.tsx`|در ماتریس سطح مرتبط؛ پذیرش کامل هنوز باقی|
|`src/components/StatusPage.tsx`|در ماتریس سطح مرتبط؛ پذیرش کامل هنوز باقی|
|`src/components/Toast/Toast.tsx`|در ماتریس سطح مرتبط؛ پذیرش کامل هنوز باقی|
|`src/pages/Appointment/AppointmentGate.tsx`|در ماتریس سطح مرتبط؛ پذیرش کامل هنوز باقی|
|`src/pages/Appointment/AppointmentPortalV2.tsx`|در ماتریس سطح مرتبط؛ پذیرش کامل هنوز باقی|
|`src/pages/Appointment/PatientAppointmentCard.tsx`|در ماتریس سطح مرتبط؛ پذیرش کامل هنوز باقی|
|`src/pages/Appointment/PatientBookingWizard.tsx`|در ماتریس سطح مرتبط؛ پذیرش کامل هنوز باقی|
|`src/pages/Appointment/PatientIntakeDialog.tsx`|در ماتریس سطح مرتبط؛ پذیرش کامل هنوز باقی|
|`src/pages/Appointment/PatientLogin.tsx`|در ماتریس سطح مرتبط؛ پذیرش کامل هنوز باقی|
|`src/pages/Appointment/PatientPortal.tsx`|در ماتریس سطح مرتبط؛ پذیرش کامل هنوز باقی|
|`src/pages/Appointment/PatientProfileForm.tsx`|در ماتریس سطح مرتبط؛ پذیرش کامل هنوز باقی|
|`src/pages/Appointment/PatientShells.tsx`|در ماتریس سطح مرتبط؛ پذیرش کامل هنوز باقی|
|`src/pages/Landing/components/AboutUs.tsx`|در ماتریس سطح مرتبط؛ پذیرش کامل هنوز باقی|
|`src/pages/Landing/components/AnimatedStats.tsx`|در ماتریس سطح مرتبط؛ پذیرش کامل هنوز باقی|
|`src/pages/Landing/components/BlogCard.tsx`|در ماتریس سطح مرتبط؛ پذیرش کامل هنوز باقی|
|`src/pages/Landing/components/BlogPreview.tsx`|در ماتریس سطح مرتبط؛ پذیرش کامل هنوز باقی|
|`src/pages/Landing/components/FAQ.tsx`|در ماتریس سطح مرتبط؛ پذیرش کامل هنوز باقی|
|`src/pages/Landing/components/Footer.tsx`|در ماتریس سطح مرتبط؛ پذیرش کامل هنوز باقی|
|`src/pages/Landing/components/GlassCard.tsx`|در ماتریس سطح مرتبط؛ پذیرش کامل هنوز باقی|
|`src/pages/Landing/components/HeroContent.tsx`|در ماتریس سطح مرتبط؛ پذیرش کامل هنوز باقی|
|`src/pages/Landing/components/MobileTabBar.tsx`|در ماتریس سطح مرتبط؛ پذیرش کامل هنوز باقی|
|`src/pages/Landing/components/NavigationBar.tsx`|در ماتریس سطح مرتبط؛ پذیرش کامل هنوز باقی|
|`src/pages/Landing/components/NavList.tsx`|در ماتریس سطح مرتبط؛ پذیرش کامل هنوز باقی|
|`src/pages/Landing/components/PatientComment.tsx`|در ماتریس سطح مرتبط؛ پذیرش کامل هنوز باقی|
|`src/pages/Landing/components/PatientsComments.tsx`|در ماتریس سطح مرتبط؛ پذیرش کامل هنوز باقی|
|`src/pages/Landing/components/ReserveDialog.tsx`|در ماتریس سطح مرتبط؛ پذیرش کامل هنوز باقی|
|`src/pages/Landing/components/Samples.tsx`|در ماتریس سطح مرتبط؛ پذیرش کامل هنوز باقی|
|`src/pages/Landing/components/ServiceCard.tsx`|در ماتریس سطح مرتبط؛ پذیرش کامل هنوز باقی|
|`src/pages/Landing/components/Services.tsx`|در ماتریس سطح مرتبط؛ پذیرش کامل هنوز باقی|
|`src/pages/Landing/components/TextGenerateEffect.tsx`|در ماتریس سطح مرتبط؛ پذیرش کامل هنوز باقی|
|`src/pages/Landing/Landing.tsx`|در ماتریس سطح مرتبط؛ پذیرش کامل هنوز باقی|
|`src/pages/Loading/Loading.tsx`|در ماتریس سطح مرتبط؛ پذیرش کامل هنوز باقی|
|`src/pages/NotFound/NotFound.tsx`|در ماتریس سطح مرتبط؛ پذیرش کامل هنوز باقی|
|`src/pages/Staff/AppointmentsPanel.tsx`|در ماتریس سطح مرتبط؛ پذیرش کامل هنوز باقی|
|`src/pages/Staff/ArticleEditor.tsx`|در ماتریس سطح مرتبط؛ پذیرش کامل هنوز باقی|
|`src/pages/Staff/CaptchaSetupPanel.tsx`|در ماتریس سطح مرتبط؛ پذیرش کامل هنوز باقی|
|`src/pages/Staff/ClinicInfoPanel.tsx`|در ماتریس سطح مرتبط؛ پذیرش کامل هنوز باقی|
|`src/pages/Staff/DetailsChevron.tsx`|در ماتریس سطح مرتبط؛ پذیرش کامل هنوز باقی|
|`src/pages/Staff/EditorialSeoAssistant.tsx`|در ماتریس سطح مرتبط؛ پذیرش کامل هنوز باقی|
|`src/pages/Staff/MediaPicker.tsx`|در ماتریس سطح مرتبط؛ پذیرش کامل هنوز باقی|
|`src/pages/Staff/SchedulePanel.tsx`|در ماتریس سطح مرتبط؛ پذیرش کامل هنوز باقی|
|`src/pages/Staff/SeoPreview.tsx`|در ماتریس سطح مرتبط؛ پذیرش کامل هنوز باقی|
|`src/pages/Staff/ServicesPanel.tsx`|در ماتریس سطح مرتبط؛ پذیرش کامل هنوز باقی|
|`src/pages/Staff/SmsCenterPanel.tsx`|در ماتریس سطح مرتبط؛ پذیرش کامل هنوز باقی|
|`src/pages/Staff/StaffAccessPanel.tsx`|در ماتریس سطح مرتبط؛ پذیرش کامل هنوز باقی|
|`src/pages/Staff/StaffArticlesPanel.tsx`|در ماتریس سطح مرتبط؛ پذیرش کامل هنوز باقی|
|`src/pages/Staff/StaffChatWorkspace.tsx`|در ماتریس سطح مرتبط؛ پذیرش کامل هنوز باقی|
|`src/pages/Staff/StaffCommentsPanel.tsx`|در ماتریس سطح مرتبط؛ پذیرش کامل هنوز باقی|
|`src/pages/Staff/StaffDashboardCharts.tsx`|در ماتریس سطح مرتبط؛ پذیرش کامل هنوز باقی|
|`src/pages/Staff/StaffLogin.tsx`|در ماتریس سطح مرتبط؛ پذیرش کامل هنوز باقی|
|`src/pages/Staff/StaffMediaPanel.tsx`|در ماتریس سطح مرتبط؛ پذیرش کامل هنوز باقی|
|`src/pages/Staff/StaffMfaPanel.tsx`|در ماتریس سطح مرتبط؛ پذیرش کامل هنوز باقی|
|`src/pages/Staff/StaffOperationsPanels.tsx`|در ماتریس سطح مرتبط؛ پذیرش کامل هنوز باقی|
|`src/pages/Staff/StaffPasswordPanel.tsx`|در ماتریس سطح مرتبط؛ پذیرش کامل هنوز باقی|
|`src/pages/Staff/StaffPatientsPanel.tsx`|در ماتریس سطح مرتبط؛ پذیرش کامل هنوز باقی|
|`src/pages/Staff/StaffPortal.tsx`|در ماتریس سطح مرتبط؛ پذیرش کامل هنوز باقی|
|`src/pages/Staff/StaffSettingsPanel.tsx`|در ماتریس سطح مرتبط؛ پذیرش کامل هنوز باقی|
|`src/pages/Staff/StaffSiteContentPanel.tsx`|در ماتریس سطح مرتبط؛ پذیرش کامل هنوز باقی|
|`src/pages/Staff/StaffSiteGalleryPanel.tsx`|در ماتریس سطح مرتبط؛ پذیرش کامل هنوز باقی|
|`src/pages/Staff/StaffSiteServicesPanel.tsx`|در ماتریس سطح مرتبط؛ پذیرش کامل هنوز باقی|
|`src/pages/Staff/useContentConfirm.tsx`|در ماتریس سطح مرتبط؛ پذیرش کامل هنوز باقی|
