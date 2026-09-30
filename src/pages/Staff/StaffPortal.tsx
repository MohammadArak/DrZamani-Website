/* eslint-disable react-hooks/set-state-in-effect */
import Seo from "@/components/SEO";
import AppSelect from "@/components/AppSelect";
import JalaliDatePicker from "@/components/JalaliDatePicker";
import useConsultationRealtime from "@/hooks/useConsultationRealtime";
import { useClinicInfo } from "@/contexts/ClinicInfoContext";
import ServiceIcon from "@/components/ServiceIcon";
import Toast from "@/components/Toast";
import StaffChatWorkspace from "./StaffChatWorkspace";
import StaffPatientsPanel from "./StaffPatientsPanel";
import StaffAccessPanel from "./StaffAccessPanel";
import { StaffPermissionsContext, staffTabPermissions, useStaffAccess } from "./staffAccess";
import {
    StaffAuditPanel,
    StaffCalendarPanel,
    StaffFinancePanel,
    StaffWaitlistPanel,
} from "./StaffOperationsPanels";
import {
    AppointmentApiError,
    STAFF_PROFILE_KEY,
    STAFF_TOKEN_KEY,
    STAFF_COOKIE_SESSION,
    browserCsrf,
    appointmentApi,
    formatLocalPhone,
    formatPersianDate,
    formatTime,
    toPersianDigits,
    type StaffIdentity,
    type Appointment,
    type AppointmentPage,
    type CaptchaChallenge,
    type ClinicSettings,
    type DashboardStats,
    type ConsultationThread,
    type AuditLogItem,
    type FinanceSummary,
    type PaymentItem,
    type ScheduleException,
    type Service,
    type ServiceScheduleException,
    type SmsAutomationRule,
    type SmsCampaign,
    type SmsCampaignFilters,
    type SmsOutboxItem,
    type WaitlistEntry,
} from "@/services/appointmentApi";
import {
    IoBusinessOutline,
    IoCalendarOutline,
    IoCardOutline,
    IoChatbubblesOutline,
    IoCheckmarkCircleOutline,
    IoChevronDownOutline,
    IoCloseCircleOutline,
    IoDownloadOutline,
    IoGridOutline,
    IoLogOutOutline,
    IoMenuOutline,
    IoPeopleOutline,
    IoListOutline,
    IoShieldCheckmarkOutline,
    IoSearchOutline,
    IoRefreshOutline,
    IoSettingsOutline,
    IoTimeOutline,
} from "react-icons/io5";
import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
    type FormEvent,
} from "react";

const inputClass =
    "h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-slate-800 outline-none transition focus:border-secondary focus:ring-4 focus:ring-secondary/10";
const errorMessage = (error: unknown) =>
    error instanceof Error ? error.message : "در انجام درخواست خطایی رخ داد";

const DetailsChevron = () => (
    <span
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-50 text-base text-secondary-deep transition group-open:rotate-180"
        aria-hidden="true"
    >
        <IoChevronDownOutline className="block" />
    </span>
);

type StaffProfile = StaffIdentity;
type StaffTab =
    | "dashboard"
    | "clinic-info"
    | "appointments"
    | "patients"
    | "calendar"
    | "consultations"
    | "waitlist"
    | "schedule"
    | "services"
    | "sms"
    | "finance"
    | "audit"
    | "access";

const statusLabels: Record<Appointment["status"], string> = {
    pending: "در انتظار",
    confirmed: "تأیید شده",
    completed: "انجام شده",
    cancelled: "لغو شده",
};
const appointmentStatusOptions = Object.entries(statusLabels).map(
    ([value, label]) => ({ value, label }),
);
const appointmentFilterOptions = [
    { value: "", label: "همه وضعیت‌ها" },
    ...appointmentStatusOptions,
];
const serviceIconOptions = [
    { value: "medical", label: "پزشکی" },
    { value: "nose", label: "بینی" },
    { value: "ear", label: "گوش" },
    { value: "throat", label: "حلق" },
    { value: "surgery", label: "جراحی" },
    { value: "followup", label: "پیگیری" },
    { value: "consultation", label: "مشاوره" },
];
const paymentOptions = [
    { value: "deposit", label: "بیعانه" },
    { value: "full", label: "کل مبلغ" },
    { value: "none", label: "رایگان" },
];
const intakeQuestionTypeOptions = [
    { value: "short_text", label: "پاسخ کوتاه" },
    { value: "long_text", label: "پاسخ توضیحی" },
    { value: "yes_no", label: "بله یا خیر" },
    { value: "single_choice", label: "انتخاب یک گزینه" },
];
const genderFilterOptions = [
    { value: "", label: "همه" },
    { value: "female", label: "خانم" },
    { value: "male", label: "آقا" },
];

const weekdayNames = [
    "دوشنبه",
    "سه‌شنبه",
    "چهارشنبه",
    "پنج‌شنبه",
    "جمعه",
    "شنبه",
    "یکشنبه",
];
const iranWeekOrder = [5, 6, 0, 1, 2, 3, 4];
const StaffLogin = ({
    onLogin,
}: {
    onLogin: (token: string, profile: StaffProfile) => void;
}) => {
    const { clinicInfo } = useClinicInfo();
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const [captcha, setCaptcha] = useState<CaptchaChallenge | null>(null);
    const [captchaAnswer, setCaptchaAnswer] = useState("");

    const loadCaptcha = useCallback(async () => {
        try {
            setCaptcha(await appointmentApi.staffCaptcha());
            setCaptchaAnswer("");
        } catch (captchaError) {
            setError(errorMessage(captchaError));
        }
    }, []);

    useEffect(() => {
        void loadCaptcha();
    }, [loadCaptcha]);

    const submit = async (event: FormEvent) => {
        event.preventDefault();
        setBusy(true);
        setError("");
        try {
            if (!captcha) return;
            const result = await appointmentApi.staffLogin(
                username,
                password,
                captcha.captcha_id,
                captchaAnswer,
            );
            const profile: StaffIdentity = result;
            localStorage.removeItem(STAFF_TOKEN_KEY);
            localStorage.removeItem(STAFF_PROFILE_KEY);
            onLogin(STAFF_COOKIE_SESSION, profile);
        } catch (loginError) {
            setError(errorMessage(loginError));
            await loadCaptcha();
        } finally {
            setBusy(false);
        }
    };

    return (
        <main
            dir="rtl"
            className="flex min-h-screen items-center justify-center bg-primary px-4 py-10 text-slate-800"
        >
            <div className="w-full max-w-md rounded-4xl bg-white p-6 shadow-2xl md:p-9">
                <a href="/" className="mx-auto mb-7 block w-fit">
                    <img
                        src="/img/logo/logo-dark-full.webp"
                        alt={clinicInfo.doctorName}
                        width="560"
                        height="175"
                        className="w-52"
                    />
                </a>
                <span className="text-sm text-secondary-deep">
                    ورود کارکنان مطب
                </span>
                <h1 className="mt-2 font-dana text-3xl text-primary">
                    پنل مدیریت نوبت‌ها
                </h1>
                <p className="mt-3 text-sm leading-7 text-slate-500">
                    ورود کارکنان مجاز مطب
                </p>
                {error && (
                    <div
                        role="alert"
                        className="mt-5 rounded-xl bg-rose-50 p-3 text-sm text-rose-700"
                    >
                        {error}
                    </div>
                )}
                <form onSubmit={submit} className="mt-7 space-y-4">
                    <label className="block">
                        <span className="mb-2 block text-sm">نام کاربری</span>
                        <input
                            dir="ltr"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className={`${inputClass} text-left`}
                            autoComplete="username"
                            required
                        />
                    </label>
                    <label className="block">
                        <span className="mb-2 block text-sm">رمز عبور</span>
                        <input
                            dir="ltr"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className={`${inputClass} text-left`}
                            autoComplete="current-password"
                            required
                        />
                    </label>
                    <div>
                        <span className="mb-2 block text-sm">کد امنیتی</span>
                        <div
                            className="grid grid-cols-[minmax(0,1fr)_132px_40px] items-center gap-2"
                            dir="ltr"
                        >
                            <input
                                inputMode="numeric"
                                value={captchaAnswer}
                                onChange={(event) =>
                                    setCaptchaAnswer(event.target.value)
                                }
                                className={`${inputClass} text-center text-lg tracking-[0.25em]`}
                                aria-label="کد امنیتی"
                                maxLength={8}
                                required
                            />
                            <div className="h-11 overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                                {captcha ? (
                                    <img
                                        src={captcha.image_data}
                                        alt="کد امنیتی"
                                        className="h-full w-full object-cover"
                                    />
                                ) : (
                                    <span className="flex h-full items-center justify-center text-xs text-slate-400">
                                        در حال بارگذاری…
                                    </span>
                                )}
                            </div>
                            <button
                                type="button"
                                onClick={() => void loadCaptcha()}
                                aria-label="ساخت کد امنیتی جدید"
                                className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-primary hover:border-secondary"
                            >
                                <IoRefreshOutline />
                            </button>
                        </div>
                    </div>
                    <button
                        disabled={busy || !captcha}
                        className="h-12 w-full rounded-xl bg-secondary font-bold text-primary transition hover:bg-secondary-mild disabled:opacity-60"
                    >
                        {busy ? "در حال ورود…" : "ورود به پنل"}
                    </button>
                </form>
            </div>
        </main>
    );
};

const StatCard = ({
    label,
    value,
    icon,
}: {
    label: string;
    value: number;
    icon: React.ReactNode;
}) => (
    <div className="group rounded-3xl border border-slate-200/80 bg-white p-5 shadow-[0_14px_45px_rgba(24,48,79,0.05)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_55px_rgba(24,48,79,0.09)]">
        <div className="flex items-center justify-between">
            <span className="text-sm text-slate-500">{label}</span>
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-secondary/15 text-xl text-secondary-deep transition group-hover:scale-105">
                {icon}
            </span>
        </div>
        <strong className="mt-4 block font-dana text-3xl text-primary">
            {toPersianDigits(value)}
        </strong>
    </div>
);

// نسخه جدید پایین‌تر تعریف شده است؛ این کامپوننت برای سازگاری موقت نگه داشته شده.
export const LegacyAppointmentsPanel = ({
    token,
    items,
    onReload,
}: {
    token: string;
    items: Appointment[];
    onReload: (filters?: {
        appointment_date?: string;
        status?: string;
        search?: string;
    }) => Promise<void>;
}) => {
    const can = useStaffAccess();
    const [date, setDate] = useState("");
    const [status, setStatus] = useState("");
    const [search, setSearch] = useState("");
    const [busyId, setBusyId] = useState<number | null>(null);
    const [message, setMessage] = useState("");

    const filter = (event: FormEvent) => {
        event.preventDefault();
        void onReload({
            appointment_date: date || undefined,
            status: status || undefined,
            search: search || undefined,
        });
    };

    const updateStatus = async (
        item: Appointment,
        nextStatus: Appointment["status"],
    ) => {
        setBusyId(item.id);
        setMessage("");
        try {
            await appointmentApi.updateStaffAppointment(token, item.id, {
                status: nextStatus,
            });
            setMessage("وضعیت نوبت ذخیره شد.");
            await onReload({
                appointment_date: date || undefined,
                status: status || undefined,
                search: search || undefined,
            });
        } catch (updateError) {
            setMessage(errorMessage(updateError));
        } finally {
            setBusyId(null);
        }
    };

    return (
        <section>
            <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                    <span className="text-sm text-secondary-deep">
                        مدیریت مراجعه‌ها
                    </span>
                    <h2 className="mt-1 font-dana text-3xl text-primary">
                        نوبت‌ها
                    </h2>
                </div>
                <span className="text-sm text-slate-500">
                    {toPersianDigits(items.length)} نتیجه
                </span>
            </div>
            <form
                onSubmit={filter}
                className="mt-6 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 md:grid-cols-[1fr_180px_180px_auto]"
            >
                <label className="relative">
                    <span className="sr-only">جست‌وجو</span>
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className={`${inputClass} pl-10`}
                        placeholder="نام، موبایل یا کد پیگیری"
                    />
                    <IoSearchOutline className="absolute left-3 top-3 text-xl text-slate-400" />
                </label>
                <JalaliDatePicker
                    value={date}
                    onChange={setDate}
                    placeholder="تاریخ نوبت"
                />
                <AppSelect
                    value={status}
                    onChange={setStatus}
                    options={appointmentFilterOptions}
                    ariaLabel="وضعیت"
                />
                <button className="h-11 rounded-xl bg-primary px-5 text-white">
                    اعمال فیلتر
                </button>
            </form>
            {message && (
                <div className="mt-4 rounded-xl bg-secondary/10 p-3 text-sm text-primary">
                    {message}
                </div>
            )}
            <div className="mt-5 space-y-3">
                {items.length ? (
                    items.map((item) => (
                        <article
                            key={item.id}
                            className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:grid-cols-[1.2fr_1fr_1fr_auto] lg:items-center"
                        >
                            <div>
                                <span className="text-xs text-slate-400">
                                    {item.tracking_code}
                                </span>
                                <h3 className="mt-1 font-bold text-primary">
                                    {item.patient_name}
                                </h3>
                                <p
                                    dir="ltr"
                                    className="mt-1 text-right text-sm text-slate-500"
                                >
                                    {item.patient_phone}
                                </p>
                            </div>
                            <div>
                                <b className="text-sm text-slate-700">
                                    {item.service_title}
                                </b>
                                <p className="mt-1 text-xs text-slate-500">
                                    {item.has_previous_visit
                                        ? "مراجعه قبلی دارد"
                                        : "اولین مراجعه"}
                                </p>
                            </div>
                            <div className="text-sm text-slate-600">
                                <p>
                                    {formatPersianDate(item.appointment_date)}
                                </p>
                                <p className="mt-1 flex items-center gap-1">
                                    <IoTimeOutline />{" "}
                                    {toPersianDigits(
                                        formatTime(item.start_time),
                                    )}
                                </p>
                            </div>
                            <AppSelect
                                disabled={busyId === item.id || !can("appointments.edit")}
                                value={item.status}
                                onChange={(value) =>
                                    void updateStatus(
                                        item,
                                        value as Appointment["status"],
                                    )
                                }
                                options={appointmentStatusOptions.filter(o => o.value !== "cancelled" || can("appointments.cancel"))}
                                ariaLabel="وضعیت نوبت"
                                buttonClassName="h-10 bg-slate-50 text-sm"
                            />
                            {item.intake_required && (
                                <details className={`group rounded-xl border lg:col-span-4 ${item.intake_completed ? "border-emerald-100 bg-emerald-50/40" : "border-amber-100 bg-amber-50/50"}`}>
                                    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2.5 marker:hidden">
                                        <span className={`text-xs font-bold ${item.intake_completed ? "text-emerald-700" : "text-amber-800"}`}>
                                            {item.intake_completed ? "فرم قبل از مراجعه تکمیل شده" : "فرم قبل از مراجعه هنوز تکمیل نشده"}
                                        </span>
                                        <DetailsChevron />
                                    </summary>
                                    {item.intake_completed && item.intake_submission && (
                                        <div className="grid gap-3 border-t border-white/80 p-3 md:grid-cols-2">
                                            {item.intake_form.questions.map((question) => {
                                                const answer = item.intake_submission?.answers[question.key];
                                                return (
                                                    <div key={question.key} className="rounded-xl bg-white p-3">
                                                        <span className="block text-[11px] leading-5 text-slate-400">{question.label}</span>
                                                        <b className="mt-1 block whitespace-pre-line text-sm leading-6 text-slate-700">
                                                            {answer === true ? "بله" : answer === false ? "خیر" : answer || "بدون پاسخ"}
                                                        </b>
                                                    </div>
                                                );
                                            })}
                                            {item.intake_form.consents.map((consent) => (
                                                <div key={consent.key} className="rounded-xl bg-white p-3">
                                                    <span className="block text-[11px] text-slate-400">رضایت‌نامه</span>
                                                    <b className="mt-1 block text-sm text-slate-700">{consent.title}</b>
                                                    <span className={`mt-2 block text-xs ${item.intake_submission?.accepted_consents.includes(consent.key) ? "text-emerald-700" : "text-rose-600"}`}>
                                                        {item.intake_submission?.accepted_consents.includes(consent.key) ? "پذیرفته شده" : "پذیرفته نشده"}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </details>
                            )}
                        </article>
                    ))
                ) : (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center text-slate-500">
                        نوبتی با این فیلتر پیدا نشد.
                    </div>
                )}
            </div>
        </section>
    );
};

type AppointmentFilters = {
    appointment_date?: string;
    status?: string;
    search?: string;
    this_month?: boolean;
    page?: number;
    page_size?: number;
};

const AppointmentsPanel = ({
    token,
    pageData,
    onReload,
    onOpenConsultation,
}: {
    token: string;
    pageData: AppointmentPage;
    onReload: (filters?: AppointmentFilters) => Promise<void>;
    onOpenConsultation: (item: Appointment) => void;
}) => {
    const can = useStaffAccess();
    const [date, setDate] = useState("");
    const [status, setStatus] = useState("");
    const [search, setSearch] = useState("");
    const [thisMonth, setThisMonth] = useState(false);
    const [busyId, setBusyId] = useState<number | null>(null);
    const [exporting, setExporting] = useState(false);
    const [toast, setToast] = useState<{
        message: string;
        kind: "success" | "error";
    }>({
        message: "",
        kind: "success",
    });

    const filtersFor = (page = 1): AppointmentFilters => ({
        appointment_date: date || undefined,
        status: status || undefined,
        search: search || undefined,
        this_month: thisMonth || undefined,
        page,
        page_size: pageData.page_size || 20,
    });

    const filter = (event: FormEvent) => {
        event.preventDefault();
        void onReload(filtersFor(1));
    };

    const updateStatus = async (
        item: Appointment,
        nextStatus: Appointment["status"],
    ) => {
        setBusyId(item.id);
        try {
            await appointmentApi.updateStaffAppointment(token, item.id, {
                status: nextStatus,
            });
            setToast({ message: "وضعیت نوبت ذخیره شد", kind: "success" });
            await onReload(filtersFor(pageData.page));
        } catch (updateError) {
            setToast({ message: errorMessage(updateError), kind: "error" });
        } finally {
            setBusyId(null);
        }
    };

    const exportExcel = async () => {
        setExporting(true);
        try {
            await appointmentApi.exportStaffAppointments(token, filtersFor());
            setToast({
                message: "فایل اکسل نوبت‌ها آماده شد",
                kind: "success",
            });
        } catch (exportError) {
            setToast({ message: errorMessage(exportError), kind: "error" });
        } finally {
            setExporting(false);
        }
    };

    return (
        <section className="app-panel-enter">
            <Toast
                message={toast.message}
                kind={toast.kind}
                onClose={() => setToast((value) => ({ ...value, message: "" }))}
            />
            <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                    <span className="text-sm text-secondary-deep">
                        مدیریت مراجعه‌ها
                    </span>
                    <h2 className="mt-1 font-dana text-3xl text-primary">
                        نوبت‌ها
                    </h2>
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-sm text-slate-500">
                        {toPersianDigits(pageData.total)} نتیجه
                    </span>
                    <button
                        type="button"
                        disabled={exporting || !can("appointments.export")}
                        onClick={() => void exportExcel()}
                        className="inline-flex h-11 items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 text-sm font-bold text-emerald-700 transition hover:-translate-y-0.5 hover:shadow-sm disabled:opacity-50"
                    >
                        <IoDownloadOutline />
                        {exporting ? "در حال ساخت…" : "خروجی اکسل"}
                    </button>
                </div>
            </div>
            <form
                onSubmit={filter}
                className="mt-6 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 lg:grid-cols-[minmax(220px,1fr)_190px_170px_auto]"
            >
                <label className="relative">
                    <span className="sr-only">جست‌وجو</span>
                    <input
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        className={`${inputClass} pl-10`}
                        placeholder="نام، موبایل یا کد پیگیری"
                    />
                    <IoSearchOutline className="absolute left-3 top-3 text-xl text-slate-400" />
                </label>
                <JalaliDatePicker
                    value={date}
                    onChange={setDate}
                    placeholder="تاریخ نوبت"
                />
                <AppSelect
                    value={status}
                    onChange={setStatus}
                    options={appointmentFilterOptions}
                    ariaLabel="وضعیت"
                />
                <button className="h-11 rounded-xl bg-primary px-5 text-white transition hover:bg-primary-mild">
                    اعمال فیلتر
                </button>
                <label className="flex cursor-pointer items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-600 lg:col-span-4">
                    <input
                        type="checkbox"
                        checked={thisMonth}
                        onChange={(event) => setThisMonth(event.target.checked)}
                        className="h-4 w-4 accent-secondary"
                    />
                    فقط نوبت‌های ماه جاری شمسی
                </label>
            </form>

            <div className="mt-5 space-y-3">
                {pageData.items.length ? (
                    pageData.items.map((item) => (
                        <article
                            key={item.id}
                            className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-secondary/40 hover:shadow-md lg:grid-cols-[1.15fr_1fr_1fr_auto] lg:items-center"
                        >
                            <div>
                                <span className="text-xs text-slate-400">
                                    {item.tracking_code}
                                </span>
                                <h3 className="mt-1 font-bold text-primary">
                                    {item.patient_name}
                                </h3>
                                <p
                                    dir="ltr"
                                    className="mt-1 text-right text-sm text-slate-500"
                                >
                                    {item.patient_phone
                                        ? formatLocalPhone(item.patient_phone)
                                        : "—"}
                                </p>
                            </div>
                            <div className="flex items-start gap-2">
                                <ServiceIcon
                                    icon={item.service_icon_key}
                                    className="mt-0.5 shrink-0 text-2xl text-secondary-deep"
                                />
                                <div>
                                    <b className="text-sm text-slate-700">
                                        {item.service_title}
                                    </b>
                                    <p className="mt-1 text-xs text-slate-500">
                                        {toPersianDigits(
                                            item.service_duration_minutes,
                                        )}{" "}
                                        دقیقه ·{" "}
                                        {item.has_previous_visit
                                            ? "مراجعه قبلی دارد"
                                            : "اولین مراجعه"}
                                    </p>
                                    {item.consultation_enabled && (
                                        <button
                                            type="button"
                                            onClick={() =>
                                                onOpenConsultation(item)
                                            }
                                            className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-secondary-deep"
                                        >
                                            <IoChatbubblesOutline /> گفت‌وگو
                                        </button>
                                    )}
                                </div>
                            </div>
                            <div className="text-sm text-slate-600">
                                <p>
                                    {formatPersianDate(item.appointment_date)}
                                </p>
                                <p className="mt-1 flex items-center gap-1">
                                    <IoTimeOutline />{" "}
                                    {toPersianDigits(
                                        formatTime(item.start_time),
                                    )}
                                </p>
                            </div>
                            <AppSelect
                                disabled={busyId === item.id || !can("appointments.edit")}
                                value={item.status}
                                onChange={(value) =>
                                    void updateStatus(
                                        item,
                                        value as Appointment["status"],
                                    )
                                }
                                options={appointmentStatusOptions.filter(o => o.value !== "cancelled" || can("appointments.cancel"))}
                                ariaLabel="وضعیت نوبت"
                                buttonClassName="h-10 bg-slate-50 text-sm"
                            />
                        </article>
                    ))
                ) : (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center text-slate-500">
                        نوبتی با این فیلتر پیدا نشد.
                    </div>
                )}
            </div>

            {pageData.total_pages > 1 && (
                <nav
                    className="mt-6 flex flex-wrap items-center justify-center gap-2"
                    aria-label="صفحه‌بندی نوبت‌ها"
                >
                    <button
                        disabled={pageData.page <= 1}
                        onClick={() =>
                            void onReload(filtersFor(pageData.page - 1))
                        }
                        className="h-10 rounded-xl border border-slate-200 bg-white px-4 text-sm disabled:opacity-40"
                    >
                        صفحه قبل
                    </button>
                    <span className="px-3 text-sm text-slate-500">
                        صفحه {toPersianDigits(pageData.page)} از{" "}
                        {toPersianDigits(pageData.total_pages)}
                    </span>
                    <button
                        disabled={pageData.page >= pageData.total_pages}
                        onClick={() =>
                            void onReload(filtersFor(pageData.page + 1))
                        }
                        className="h-10 rounded-xl border border-slate-200 bg-white px-4 text-sm disabled:opacity-40"
                    >
                        صفحه بعد
                    </button>
                </nav>
            )}
        </section>
    );
};

const ClinicInfoPanel = ({
    token,
    settings,
    onReload,
}: {
    token: string;
    settings: ClinicSettings;
    onReload: () => Promise<void>;
}) => {
    const [draft, setDraft] = useState(settings);
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState("");
    const [messageKind, setMessageKind] = useState<"success" | "error">(
        "success",
    );
    const { applyClinicSettings } = useClinicInfo();
    const can = useStaffAccess();
    const canEdit = can("settings.edit");

    useEffect(() => setDraft(settings), [settings]);

    const save = async (event: FormEvent) => {
        event.preventDefault();
        if (!canEdit) return;
        setBusy(true);
        setMessage("");
        try {
            const updated = await appointmentApi.updateStaffSettings(token, draft);
            applyClinicSettings(updated);
            setMessageKind("success");
            setMessage("اطلاعات ثابت مطب ذخیره شد و در همه بخش‌های سامانه به‌روزرسانی می‌شود.");
            await onReload();
        } catch (saveError) {
            setMessageKind("error");
            setMessage(errorMessage(saveError));
        } finally {
            setBusy(false);
        }
    };

    const update = <Key extends keyof ClinicSettings,>(
        field: Key,
        value: ClinicSettings[Key],
    ) => setDraft((current) => ({ ...current, [field]: value }));

    return (
        <section className="app-panel-enter">
            <Toast
                message={message}
                kind={messageKind}
                onClose={() => setMessage("")}
            />
            <div>
                <span className="text-sm text-secondary-deep">
                    منبع یکپارچه اطلاعات عمومی
                </span>
                <h2 className="mt-1 font-dana text-3xl text-primary">
                    اطلاعات ثابت مطب
                </h2>
                <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-500">
                    شماره‌ها، نشانی، ساعات کاری، نقشه و شبکه‌های اجتماعی را فقط
                    از همین بخش تغییر دهید؛ اطلاعات جدید در صفحه اصلی، پنل بیمار،
                    تماس‌ها و داده‌های سئوی سایت استفاده می‌شود.
                </p>
            </div>

            {!canEdit && (
                <div className="mt-5 rounded-xl bg-amber-50 p-4 text-sm text-amber-800">
                    این حساب دسترسی ویرایش اطلاعات مطب را ندارد.
                </div>
            )}

            <form onSubmit={save} className="mt-6 space-y-5">
                <div className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <h3 className="font-dana text-xl text-primary">
                                مشخصات پزشک
                            </h3>
                            <p className="mt-1 text-xs leading-6 text-slate-500">
                                این موارد در عنوان‌ها و اطلاعات ساختاریافته موتورهای جست‌وجو استفاده می‌شوند.
                            </p>
                        </div>
                    </div>
                    <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        <label>
                            <span className="mb-2 block text-sm">نام پزشک</span>
                            <input
                                required
                                disabled={!canEdit}
                                value={draft.doctor_name}
                                onChange={(event) => update("doctor_name", event.target.value)}
                                className={inputClass}
                                placeholder="مثلاً دکتر فرزاد زمانی"
                            />
                        </label>
                        <label>
                            <span className="mb-2 block text-sm">تخصص</span>
                            <input
                                required
                                disabled={!canEdit}
                                value={draft.specialty}
                                onChange={(event) => update("specialty", event.target.value)}
                                className={inputClass}
                                placeholder="مثلاً متخصص گوش، حلق و بینی"
                            />
                        </label>
                        <label>
                            <span className="mb-2 block text-sm">شماره نظام پزشکی</span>
                            <input
                                disabled={!canEdit}
                                value={draft.medical_council_number}
                                onChange={(event) => update("medical_council_number", event.target.value)}
                                className={inputClass}
                                inputMode="numeric"
                                placeholder="اختیاری"
                            />
                        </label>
                    </div>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6">
                    <h3 className="font-dana text-xl text-primary">
                        تماس و ساعات پاسخ‌گویی
                    </h3>
                    <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                        <label>
                            <span className="mb-2 block text-sm">شماره مطب</span>
                            <input
                                required
                                dir="ltr"
                                disabled={!canEdit}
                                value={draft.office_phone}
                                onChange={(event) => update("office_phone", event.target.value)}
                                className={`${inputClass} text-left`}
                                inputMode="tel"
                                placeholder="08633146179"
                            />
                        </label>
                        <label>
                            <span className="mb-2 block text-sm">شماره مشاوره</span>
                            <input
                                required
                                dir="ltr"
                                disabled={!canEdit}
                                value={draft.consultation_phone}
                                onChange={(event) => update("consultation_phone", event.target.value)}
                                className={`${inputClass} text-left`}
                                inputMode="tel"
                                placeholder="09217357728"
                            />
                        </label>
                        <label>
                            <span className="mb-2 block text-sm">ایمیل عمومی</span>
                            <input
                                required
                                dir="ltr"
                                type="email"
                                disabled={!canEdit}
                                value={draft.email}
                                onChange={(event) => update("email", event.target.value)}
                                className={`${inputClass} text-left`}
                                placeholder="info@example.com"
                            />
                        </label>
                        <label>
                            <span className="mb-2 block text-sm">ساعات کاری</span>
                            <input
                                required
                                disabled={!canEdit}
                                value={draft.working_hours}
                                onChange={(event) => update("working_hours", event.target.value)}
                                className={inputClass}
                                placeholder="مثلاً شنبه تا چهارشنبه، ۱۶ تا ۲۰"
                            />
                        </label>
                    </div>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6">
                    <h3 className="font-dana text-xl text-primary">نشانی مطب</h3>
                    <div className="mt-5 grid gap-4 md:grid-cols-2">
                        <label>
                            <span className="mb-2 block text-sm">استان</span>
                            <input
                                required
                                disabled={!canEdit}
                                value={draft.address_region}
                                onChange={(event) => update("address_region", event.target.value)}
                                className={inputClass}
                                placeholder="استان مرکزی"
                            />
                        </label>
                        <label>
                            <span className="mb-2 block text-sm">شهر</span>
                            <input
                                required
                                disabled={!canEdit}
                                value={draft.address_city}
                                onChange={(event) => update("address_city", event.target.value)}
                                className={inputClass}
                                placeholder="اراک"
                            />
                        </label>
                        <label className="md:col-span-2">
                            <span className="mb-2 block text-sm">نشانی کامل</span>
                            <textarea
                                required
                                disabled={!canEdit}
                                rows={3}
                                value={draft.address}
                                onChange={(event) => update("address", event.target.value)}
                                className="w-full resize-y rounded-xl border border-slate-200 bg-white p-3 text-sm leading-7 text-slate-800 outline-none transition focus:border-secondary focus:ring-4 focus:ring-secondary/10 disabled:bg-slate-50"
                                placeholder="شهر، خیابان، ساختمان، طبقه و واحد"
                            />
                        </label>
                    </div>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6">
                    <h3 className="font-dana text-xl text-primary">
                        سایت، نقشه و شبکه‌های اجتماعی
                    </h3>
                    <p className="mt-2 text-xs leading-6 text-slate-500">
                        آدرس‌های اینترنتی باید با https:// شروع شوند. لینک‌های شبکه اجتماعی اختیاری‌اند.
                    </p>
                    <div className="mt-5 grid gap-4 md:grid-cols-2">
                        <label>
                            <span className="mb-2 block text-sm">نشانی اصلی سایت</span>
                            <input
                                required
                                dir="ltr"
                                type="url"
                                disabled={!canEdit}
                                value={draft.site_url}
                                onChange={(event) => update("site_url", event.target.value)}
                                className={`${inputClass} text-left`}
                                placeholder="https://example.com"
                            />
                        </label>
                        <label>
                            <span className="mb-2 block text-sm">لینک صفحه نقشه</span>
                            <input
                                dir="ltr"
                                type="url"
                                disabled={!canEdit}
                                value={draft.map_page_url}
                                onChange={(event) => update("map_page_url", event.target.value)}
                                className={`${inputClass} text-left`}
                                placeholder="https://neshan.org/maps/..."
                            />
                        </label>
                        <label className="md:col-span-2">
                            <span className="mb-2 block text-sm">لینک iframe نقشه</span>
                            <input
                                dir="ltr"
                                type="url"
                                disabled={!canEdit}
                                value={draft.map_embed_url}
                                onChange={(event) => update("map_embed_url", event.target.value)}
                                className={`${inputClass} text-left`}
                                placeholder="https://neshan.org/maps/iframe/..."
                            />
                        </label>
                        <label>
                            <span className="mb-2 block text-sm">عرض جغرافیایی</span>
                            <input
                                dir="ltr"
                                type="number"
                                step="any"
                                min="-90"
                                max="90"
                                disabled={!canEdit}
                                value={draft.map_latitude}
                                onChange={(event) => update("map_latitude", Number(event.target.value))}
                                className={`${inputClass} text-left`}
                            />
                        </label>
                        <label>
                            <span className="mb-2 block text-sm">طول جغرافیایی</span>
                            <input
                                dir="ltr"
                                type="number"
                                step="any"
                                min="-180"
                                max="180"
                                disabled={!canEdit}
                                value={draft.map_longitude}
                                onChange={(event) => update("map_longitude", Number(event.target.value))}
                                className={`${inputClass} text-left`}
                            />
                        </label>
                        <label>
                            <span className="mb-2 block text-sm">اینستاگرام</span>
                            <input
                                dir="ltr"
                                type="url"
                                disabled={!canEdit}
                                value={draft.instagram_url}
                                onChange={(event) => update("instagram_url", event.target.value)}
                                className={`${inputClass} text-left`}
                                placeholder="https://instagram.com/..."
                            />
                        </label>
                        <label>
                            <span className="mb-2 block text-sm">ایتا</span>
                            <input
                                dir="ltr"
                                type="url"
                                disabled={!canEdit}
                                value={draft.eitaa_url}
                                onChange={(event) => update("eitaa_url", event.target.value)}
                                className={`${inputClass} text-left`}
                                placeholder="https://eitaa.com/..."
                            />
                        </label>
                    </div>
                </div>

                {canEdit && (
                    <div className="sticky bottom-3 z-10 flex justify-end rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-xl backdrop-blur">
                        <button
                            disabled={busy}
                            className="h-12 rounded-xl bg-primary px-7 font-bold text-white transition hover:bg-primary-mild disabled:opacity-50"
                        >
                            {busy ? "در حال ذخیره…" : "ذخیره اطلاعات مطب"}
                        </button>
                    </div>
                )}
            </form>
        </section>
    );
};

const SchedulePanel = ({
    token,
    settings,
    exceptions,
    onReload,
}: {
    token: string;
    settings: ClinicSettings;
    exceptions: ScheduleException[];
    onReload: () => Promise<void>;
}) => {
    const [settingsDraft, setSettingsDraft] = useState(settings);
    const [exceptionDate, setExceptionDate] = useState("");
    const [exceptionNote, setExceptionNote] = useState("");
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState("");
    const [messageKind, setMessageKind] = useState<"success" | "error">(
        "success",
    );
    const can = useStaffAccess();
    const canEdit = can("settings.edit");

    useEffect(() => setSettingsDraft(settings), [settings]);

    const saveSettings = async (event: FormEvent) => {
        event.preventDefault();
        setBusy(true);
        setMessage("");
        try {
            await appointmentApi.updateStaffSettings(token, settingsDraft);
            setMessageKind("success");
            setMessage("تنظیمات نوبت‌دهی ذخیره شد.");
            await onReload();
        } catch (saveError) {
            setMessageKind("error");
            setMessage(errorMessage(saveError));
        } finally {
            setBusy(false);
        }
    };
    const addException = async (event: FormEvent) => {
        event.preventDefault();
        setMessage("");
        if (!exceptionDate) {
            setMessageKind("error");
            setMessage("لطفاً تاریخ تعطیلی را انتخاب کنید.");
            return;
        }
        setBusy(true);
        try {
            await appointmentApi.createStaffException(token, {
                exception_date: exceptionDate,
                is_closed: true,
                start_time: null,
                end_time: null,
                note: exceptionNote || null,
            });
            setExceptionDate("");
            setExceptionNote("");
            setMessageKind("success");
            setMessage("روز تعطیل ثبت شد.");
            await onReload();
        } catch (saveError) {
            setMessageKind("error");
            setMessage(errorMessage(saveError));
        } finally {
            setBusy(false);
        }
    };

    const runOperations = async () => {
        setBusy(true);
        setMessage("");
        try {
            const result = await appointmentApi.runStaffOperations(token);
            setMessageKind("success");
            setMessage(
                `${toPersianDigits(result.queued_reminders)} یادآوری وارد صف شد و ${toPersianDigits(result.sms_sent)} پیامک ارسال شد.`,
            );
            await onReload();
        } catch (operationError) {
            setMessageKind("error");
            setMessage(errorMessage(operationError));
        } finally {
            setBusy(false);
        }
    };

    return (
        <section className="app-panel-enter">
            <Toast
                message={message}
                kind={messageKind}
                onClose={() => setMessage("")}
            />
            <div>
                <span className="text-sm text-secondary-deep">
                    ظرفیت و زمان‌بندی مطب
                </span>
                <h2 className="mt-1 font-dana text-3xl text-primary">
                    برنامه نوبت‌دهی
                </h2>
            </div>
            {!canEdit && (
                <div className="mt-5 rounded-xl bg-amber-50 p-4 text-sm text-amber-800">
                    این حساب دسترسی ویرایش تنظیمات نوبت‌دهی را ندارد.
                </div>
            )}
            <form
                onSubmit={saveSettings}
                className="mt-6 rounded-2xl border border-slate-200 bg-white p-5"
            >
                <h3 className="font-dana text-xl text-primary">تنظیمات اصلی</h3>
                <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-6">
                    <label>
                        <span className="mb-2 block text-sm">
                            مدت پیش‌فرض نوبت (دقیقه)
                        </span>
                        <input
                            type="number"
                            min="5"
                            max="180"
                            disabled={!canEdit}
                            value={settingsDraft.slot_duration_minutes}
                            onChange={(e) =>
                                setSettingsDraft((s) => ({
                                    ...s,
                                    slot_duration_minutes: Number(
                                        e.target.value,
                                    ),
                                }))
                            }
                            className={inputClass}
                        />
                    </label>
                    <label>
                        <span className="mb-2 block text-sm">
                            بازه رزرو آینده (روز)
                        </span>
                        <input
                            type="number"
                            min="1"
                            max="180"
                            disabled={!canEdit}
                            value={settingsDraft.booking_horizon_days}
                            onChange={(e) =>
                                setSettingsDraft((s) => ({
                                    ...s,
                                    booking_horizon_days: Number(
                                        e.target.value,
                                    ),
                                }))
                            }
                            className={inputClass}
                        />
                    </label>
                    <label>
                        <span className="mb-2 block text-sm">
                            حداقل فاصله رزرو (ساعت)
                        </span>
                        <input
                            type="number"
                            min="0"
                            max="168"
                            disabled={!canEdit}
                            value={settingsDraft.minimum_lead_hours}
                            onChange={(e) =>
                                setSettingsDraft((s) => ({
                                    ...s,
                                    minimum_lead_hours: Number(e.target.value),
                                }))
                            }
                            className={inputClass}
                        />
                    </label>
                    <label>
                        <span className="mb-2 block text-sm">
                            مهلت لغو آنلاین (ساعت)
                        </span>
                        <input
                            type="number"
                            min="0"
                            max="168"
                            disabled={!canEdit}
                            value={settingsDraft.cancellation_cutoff_hours}
                            onChange={(e) =>
                                setSettingsDraft((s) => ({
                                    ...s,
                                    cancellation_cutoff_hours: Number(
                                        e.target.value,
                                    ),
                                }))
                            }
                            className={inputClass}
                        />
                    </label>
                    <label>
                        <span className="mb-2 block text-sm">
                            مهلت جابه‌جایی بیمار (ساعت)
                        </span>
                        <input
                            type="number"
                            min="0"
                            max="168"
                            disabled={!canEdit}
                            value={settingsDraft.reschedule_cutoff_hours}
                            onChange={(e) =>
                                setSettingsDraft((s) => ({
                                    ...s,
                                    reschedule_cutoff_hours: Number(e.target.value),
                                }))
                            }
                            className={inputClass}
                        />
                    </label>
                    <label>
                        <span className="mb-2 block text-sm">
                            سقف جابه‌جایی توسط بیمار
                        </span>
                        <input
                            type="number"
                            min="0"
                            max="10"
                            disabled={!canEdit}
                            value={settingsDraft.max_patient_reschedules}
                            onChange={(e) =>
                                setSettingsDraft((s) => ({
                                    ...s,
                                    max_patient_reschedules: Number(e.target.value),
                                }))
                            }
                            className={inputClass}
                        />
                        <span className="mt-1 block text-[10px] text-slate-400">عدد صفر یعنی غیرفعال</span>
                    </label>
                </div>
                <div className="mt-6 rounded-2xl border border-sky-100 bg-sky-50/60 p-4 sm:p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                            <h4 className="font-bold text-primary">یادآوری پیامکی نوبت</h4>
                            <p className="mt-1 text-xs leading-6 text-slate-500">
                                دو پیامک یادآوری پیش از زمان نوبت برای بیمار ارسال می‌شود.
                            </p>
                        </div>
                        <label className="inline-flex cursor-pointer items-center gap-3 rounded-xl bg-white px-3 py-2 text-sm font-bold text-primary shadow-sm">
                            <input
                                type="checkbox"
                                disabled={!canEdit}
                                checked={settingsDraft.reminder_enabled}
                                onChange={(event) =>
                                    setSettingsDraft((current) => ({
                                        ...current,
                                        reminder_enabled: event.target.checked,
                                    }))
                                }
                                className="h-5 w-5 accent-emerald-600"
                            />
                            یادآوری فعال
                        </label>
                    </div>
                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                        <label>
                            <span className="mb-2 block text-sm">یادآوری اول (ساعت قبل)</span>
                            <input
                                type="number"
                                min="1"
                                max="336"
                                disabled={!canEdit || !settingsDraft.reminder_enabled}
                                value={settingsDraft.first_reminder_hours}
                                onChange={(event) =>
                                    setSettingsDraft((current) => ({
                                        ...current,
                                        first_reminder_hours: Number(event.target.value),
                                    }))
                                }
                                className={inputClass}
                            />
                        </label>
                        <label>
                            <span className="mb-2 block text-sm">یادآوری نهایی (ساعت قبل)</span>
                            <input
                                type="number"
                                min="1"
                                max="168"
                                disabled={!canEdit || !settingsDraft.reminder_enabled}
                                value={settingsDraft.final_reminder_hours}
                                onChange={(event) =>
                                    setSettingsDraft((current) => ({
                                        ...current,
                                        final_reminder_hours: Number(event.target.value),
                                    }))
                                }
                                className={inputClass}
                            />
                        </label>
                    </div>
                    <p className="mt-3 text-xs leading-6 text-sky-700">
                        زمان یادآوری اول باید از یادآوری نهایی زودتر باشد. متن پیامک از بخش «مرکز پیامکی» قابل ویرایش است.
                    </p>
                </div>
                {canEdit && (
                    <div className="mt-5 flex flex-wrap gap-3">
                        <button disabled={busy} className="h-11 rounded-xl bg-primary px-5 text-white disabled:opacity-50">ذخیره تنظیمات</button>
                        <button
                            type="button"
                            disabled={busy || !settingsDraft.reminder_enabled || !can("operations.run")}
                            onClick={() => void runOperations()}
                            className="h-11 rounded-xl border border-slate-200 bg-white px-5 text-sm font-bold text-primary transition hover:border-secondary disabled:opacity-50"
                        >
                            اجرای یادآوری‌ها همین حالا
                        </button>
                    </div>
                )}
            </form>
            <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-5">
                <h3 className="font-dana text-xl text-primary">
                    تعطیلی عمومی مطب
                </h3>
                <p className="mt-2 text-sm leading-7 text-slate-500">
                    تعطیلی ثبت‌شده روی همه خدمت‌ها اعمال می‌شود. روزها و ساعت‌های
                    عادی هر خدمت از بخش «خدمات» تنظیم می‌شوند.
                </p>
                {can("schedule.create") && (
                    <form
                        onSubmit={addException}
                        noValidate
                        className="mt-5 grid gap-3 md:grid-cols-[180px_1fr_auto]"
                    >
                        <JalaliDatePicker
                            value={exceptionDate}
                            onChange={setExceptionDate}
                            placeholder="تاریخ تعطیلی"
                        />
                        <input
                            value={exceptionNote}
                            onChange={(e) => setExceptionNote(e.target.value)}
                            className={inputClass}
                            placeholder="توضیح اختیاری؛ مثلاً تعطیلی رسمی"
                        />
                        <button
                            disabled={busy}
                            className="h-11 rounded-xl bg-primary px-5 text-white"
                        >
                            ثبت تعطیلی
                        </button>
                    </form>
                )}
                <div className="mt-5 grid gap-3 md:grid-cols-2">
                    {exceptions.length ? (
                        exceptions.map((item) => (
                            <div
                                key={item.id}
                                className="flex items-center justify-between rounded-xl bg-rose-50 p-4"
                            >
                                <div>
                                    <b className="text-rose-800">
                                        {formatPersianDate(item.exception_date)}
                                    </b>
                                    <p className="mt-1 text-xs text-rose-600">
                                        {item.note || "مطب تعطیل است"}
                                    </p>
                                </div>
                                {can("schedule.delete") && (
                                    <button
                                        onClick={async () => {
                                            try {
                                                await appointmentApi.deleteStaffException(
                                                    token,
                                                    item.id,
                                                );
                                                setMessageKind("success");
                                                setMessage("تعطیلی حذف شد");
                                                await onReload();
                                            } catch (deleteError) {
                                                setMessageKind("error");
                                                setMessage(
                                                    errorMessage(deleteError),
                                                );
                                            }
                                        }}
                                        className="text-rose-600"
                                    >
                                        <IoCloseCircleOutline size={23} />
                                    </button>
                                )}
                            </div>
                        ))
                    ) : (
                        <p className="text-sm text-slate-500">
                            استثنایی ثبت نشده است.
                        </p>
                    )}
                </div>
            </div>
        </section>
    );
};

const ServiceExceptionsEditor = ({
    token,
    service,
}: {
    token: string;
    service: Service;
}) => {
    const can = useStaffAccess();
    const [items, setItems] = useState<ServiceScheduleException[]>([]);
    const [exceptionDate, setExceptionDate] = useState("");
    const [closed, setClosed] = useState(true);
    const [startTime, setStartTime] = useState("16:00");
    const [endTime, setEndTime] = useState("20:00");
    const [note, setNote] = useState("");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");

    const load = useCallback(async () => {
        try {
            setItems(await appointmentApi.staffServiceExceptions(token, service.id));
        } catch (loadError) {
            setError(errorMessage(loadError));
        }
    }, [service.id, token]);

    useEffect(() => {
        void load();
    }, [load]);

    const add = async () => {
        if (!exceptionDate) return;
        setBusy(true);
        setError("");
        try {
            await appointmentApi.createStaffServiceException(token, service.id, {
                exception_date: exceptionDate,
                is_closed: closed,
                start_time: closed ? null : startTime,
                end_time: closed ? null : endTime,
                note: note.trim() || null,
            });
            setExceptionDate("");
            setNote("");
            await load();
        } catch (addError) {
            setError(errorMessage(addError));
        } finally {
            setBusy(false);
        }
    };

    return (
        <details className="group rounded-2xl border border-slate-200 bg-white sm:col-span-2">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-4 text-sm font-bold text-primary marker:hidden">
                <span>
                    تاریخ‌ها و ساعت‌های استثنایی
                    <span className="mt-1 block text-xs font-normal text-slate-500">
                        تعطیلی یا ساعت متفاوت فقط برای {service.title}
                    </span>
                </span>
                <span className="flex shrink-0 items-center gap-2">
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-500">
                        {toPersianDigits(items.length)} مورد
                    </span>
                    <DetailsChevron />
                </span>
            </summary>
            <div className="app-details-content border-t border-slate-100 p-4">
                {can("schedule.create") && (
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                        <JalaliDatePicker
                            value={exceptionDate}
                            onChange={setExceptionDate}
                            placeholder="تاریخ استثنا"
                        />
                        <label className="flex h-13 items-center gap-2 rounded-2xl border border-slate-200 px-4 text-sm text-slate-600">
                            <input
                                type="checkbox"
                                checked={closed}
                                onChange={(event) => setClosed(event.target.checked)}
                                className="accent-secondary"
                            />
                            خدمت در این روز تعطیل است
                        </label>
                        {!closed && (
                            <div className="app-panel-enter grid grid-cols-2 gap-2">
                                <input
                                    type="time"
                                    value={startTime}
                                    onChange={(event) => setStartTime(event.target.value)}
                                    className={inputClass}
                                    aria-label="شروع ساعت استثنایی"
                                />
                                <input
                                    type="time"
                                    value={endTime}
                                    onChange={(event) => setEndTime(event.target.value)}
                                    className={inputClass}
                                    aria-label="پایان ساعت استثنایی"
                                />
                            </div>
                        )}
                        <input
                            value={note}
                            onChange={(event) => setNote(event.target.value)}
                            placeholder="یادداشت اختیاری"
                            className={inputClass}
                        />
                        <button
                            type="button"
                            disabled={!exceptionDate || busy}
                            onClick={() => void add()}
                            className="h-11 rounded-xl bg-primary px-4 text-sm font-bold text-white disabled:opacity-40"
                        >
                            افزودن استثنا
                        </button>
                    </div>
                )}
                {error && <p className="mt-3 text-xs text-rose-600">{error}</p>}
                <div className="mt-4 flex flex-wrap gap-2">
                    {items.map((item) => (
                        <span
                            key={item.id}
                            className="inline-flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600"
                        >
                            <b>{formatPersianDate(item.exception_date)}</b>
                            <span>
                                {item.is_closed
                                    ? "تعطیل"
                                    : `${formatTime(item.start_time ?? "")} تا ${formatTime(item.end_time ?? "")}`}
                            </span>
                            {can("schedule.delete") && (
                                <button
                                    type="button"
                                    className="text-rose-500"
                                    onClick={async () => {
                                        await appointmentApi.deleteStaffServiceException(
                                            token,
                                            service.id,
                                            item.id,
                                        );
                                        await load();
                                    }}
                                >
                                    حذف
                                </button>
                            )}
                        </span>
                    ))}
                    {!items.length && (
                        <span className="text-xs text-slate-400">هنوز استثنایی ثبت نشده است.</span>
                    )}
                </div>
            </div>
        </details>
    );
};

type IntakeDraft = {
    questions: Service["intake_questions"];
    consents: Service["consents"];
};

const ServiceIntakeEditor = ({
    draft,
    canEdit,
    onChange,
}: {
    draft: IntakeDraft;
    canEdit: boolean;
    onChange: (draft: IntakeDraft) => void;
}) => {
    const updateQuestion = (
        id: number,
        values: Partial<Service["intake_questions"][number]>,
    ) =>
        onChange({
            ...draft,
            questions: draft.questions.map((item) =>
                item.id === id ? { ...item, ...values } : item,
            ),
        });
    const updateConsent = (
        id: number,
        values: Partial<Service["consents"][number]>,
    ) =>
        onChange({
            ...draft,
            consents: draft.consents.map((item) =>
                item.id === id ? { ...item, ...values } : item,
            ),
        });

    return (
        <details className="group overflow-hidden rounded-2xl border border-slate-200 bg-white sm:col-span-2">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-4 marker:hidden">
                <span>
                    <b className="block text-sm text-primary">فرم قبل از مراجعه و رضایت‌نامه</b>
                    <span className="mt-1 block text-xs text-slate-500">
                        {toPersianDigits(draft.questions.length)} سؤال · {toPersianDigits(draft.consents.length)} رضایت‌نامه
                    </span>
                </span>
                <DetailsChevron />
            </summary>
            <div className="app-details-content border-t border-slate-100 bg-slate-50/70 p-3 sm:p-4">
                <div className="flex items-center justify-between gap-3">
                    <div>
                        <b className="text-sm text-primary">سؤال‌های شرح‌حال</b>
                        <p className="mt-1 text-[11px] leading-5 text-slate-500">پاسخ‌ها فقط در پنل بیمار و مدیر نمایش داده می‌شوند.</p>
                    </div>
                    {canEdit && (
                        <button
                            type="button"
                            onClick={() =>
                                onChange({
                                    ...draft,
                                    questions: [
                                        ...draft.questions,
                                        {
                                            id: -Date.now(),
                                            label: "",
                                            field_type: "short_text",
                                            options: [],
                                            is_required: false,
                                            sort_order: draft.questions.length + 1,
                                        },
                                    ],
                                })
                            }
                            className="shrink-0 rounded-xl bg-primary px-3 py-2 text-xs font-bold text-white"
                        >
                            افزودن سؤال
                        </button>
                    )}
                </div>
                <div className="mt-3 space-y-3">
                    {draft.questions.map((question, index) => (
                        <div key={question.id} className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-3 md:grid-cols-[minmax(0,1.5fr)_190px_auto]">
                            <label className="text-[11px] text-slate-500">
                                متن سؤال
                                <input
                                    value={question.label}
                                    onChange={(event) => updateQuestion(question.id, { label: event.target.value })}
                                    disabled={!canEdit}
                                    maxLength={240}
                                    className={`${inputClass} mt-1`}
                                    placeholder="مثلاً آیا داروی خاصی مصرف می‌کنید؟"
                                />
                            </label>
                            <label className="text-[11px] text-slate-500">
                                نوع پاسخ
                                <AppSelect
                                    value={question.field_type}
                                    onChange={(value) =>
                                        updateQuestion(question.id, {
                                            field_type: value as Service["intake_questions"][number]["field_type"],
                                            options: value === "single_choice" ? question.options : [],
                                        })
                                    }
                                    disabled={!canEdit}
                                    options={intakeQuestionTypeOptions}
                                    ariaLabel="نوع پاسخ سؤال"
                                    className="mt-1"
                                />
                            </label>
                            <div className="flex items-end gap-3 pb-1">
                                <label className="flex h-10 items-center gap-2 text-xs text-slate-600">
                                    <input
                                        type="checkbox"
                                        checked={question.is_required}
                                        onChange={(event) => updateQuestion(question.id, { is_required: event.target.checked })}
                                        disabled={!canEdit}
                                        className="h-4 w-4 accent-secondary"
                                    />
                                    الزامی
                                </label>
                                {canEdit && (
                                    <button
                                        type="button"
                                        onClick={() =>
                                            onChange({
                                                ...draft,
                                                questions: draft.questions
                                                    .filter((item) => item.id !== question.id)
                                                    .map((item, itemIndex) => ({ ...item, sort_order: itemIndex + 1 })),
                                            })
                                        }
                                        className="h-10 text-xs text-rose-600"
                                    >
                                        حذف
                                    </button>
                                )}
                            </div>
                            {question.field_type === "single_choice" && (
                                <label className="app-panel-enter text-[11px] text-slate-500 md:col-span-3">
                                    گزینه‌ها؛ هر گزینه در یک خط
                                    <textarea
                                        value={question.options.join("\n")}
                                        onChange={(event) =>
                                            updateQuestion(question.id, {
                                                options: event.target.value.split("\n").map((value) => value.trim()).filter(Boolean),
                                            })
                                        }
                                        disabled={!canEdit}
                                        rows={3}
                                        className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm outline-none transition focus:border-secondary focus:ring-4 focus:ring-secondary/10"
                                        placeholder={"گزینه اول\nگزینه دوم"}
                                    />
                                </label>
                            )}
                            <span className="sr-only">سؤال {index + 1}</span>
                        </div>
                    ))}
                    {!draft.questions.length && <p className="rounded-xl border border-dashed border-slate-200 bg-white p-4 text-center text-xs text-slate-400">سؤالی تعریف نشده است.</p>}
                </div>

                <div className="mt-6 flex items-center justify-between gap-3 border-t border-slate-200 pt-5">
                    <div>
                        <b className="text-sm text-primary">رضایت‌نامه‌ها</b>
                        <p className="mt-1 text-[11px] leading-5 text-slate-500">متن تأییدشده پزشک را وارد کنید؛ نسخه همان نوبت ثابت می‌ماند.</p>
                    </div>
                    {canEdit && (
                        <button
                            type="button"
                            onClick={() =>
                                onChange({
                                    ...draft,
                                    consents: [
                                        ...draft.consents,
                                        {
                                            id: -Date.now(),
                                            title: "",
                                            body: "",
                                            is_required: true,
                                            sort_order: draft.consents.length + 1,
                                        },
                                    ],
                                })
                            }
                            className="shrink-0 rounded-xl border border-primary px-3 py-2 text-xs font-bold text-primary"
                        >
                            افزودن رضایت‌نامه
                        </button>
                    )}
                </div>
                <div className="mt-3 space-y-3">
                    {draft.consents.map((consent) => (
                        <div key={consent.id} className="rounded-2xl border border-slate-200 bg-white p-3">
                            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
                                <input
                                    value={consent.title}
                                    onChange={(event) => updateConsent(consent.id, { title: event.target.value })}
                                    disabled={!canEdit}
                                    maxLength={160}
                                    className={inputClass}
                                    placeholder="عنوان رضایت‌نامه"
                                />
                                <div className="flex items-center gap-3">
                                    <label className="flex items-center gap-2 text-xs text-slate-600">
                                        <input
                                            type="checkbox"
                                            checked={consent.is_required}
                                            onChange={(event) => updateConsent(consent.id, { is_required: event.target.checked })}
                                            disabled={!canEdit}
                                            className="h-4 w-4 accent-secondary"
                                        />
                                        الزامی
                                    </label>
                                    {canEdit && (
                                        <button
                                            type="button"
                                            onClick={() =>
                                                onChange({
                                                    ...draft,
                                                    consents: draft.consents
                                                        .filter((item) => item.id !== consent.id)
                                                        .map((item, itemIndex) => ({ ...item, sort_order: itemIndex + 1 })),
                                                })
                                            }
                                            className="text-xs text-rose-600"
                                        >
                                            حذف
                                        </button>
                                    )}
                                </div>
                            </div>
                            <textarea
                                value={consent.body}
                                onChange={(event) => updateConsent(consent.id, { body: event.target.value })}
                                disabled={!canEdit}
                                maxLength={4000}
                                rows={4}
                                className="mt-3 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm leading-7 outline-none transition focus:border-secondary focus:ring-4 focus:ring-secondary/10"
                                placeholder="متن کامل رضایت‌نامه مورد تأیید پزشک"
                            />
                        </div>
                    ))}
                    {!draft.consents.length && <p className="rounded-xl border border-dashed border-slate-200 bg-white p-4 text-center text-xs text-slate-400">رضایت‌نامه‌ای تعریف نشده است.</p>}
                </div>
            </div>
        </details>
    );
};

const ServicesPanel = ({
    token,
    services,
    onReload,
}: {
    token: string;
    services: Service[];
    onReload: () => Promise<void>;
}) => {
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [duration, setDuration] = useState(20);
    const [iconKey, setIconKey] = useState<Service["icon_key"]>("medical");
    const [allowsChat, setAllowsChat] = useState(false);
    const [showAddForm, setShowAddForm] = useState(false);
    const [expandedServiceId, setExpandedServiceId] = useState<number | null>(null);
    const [paymentModes, setPaymentModes] = useState<
        Record<number, Service["payment_mode"]>
    >({});
    const [urgentStates, setUrgentStates] = useState<Record<number, boolean>>({});
    const [chatStates, setChatStates] = useState<Record<number, boolean>>({});
    const [intakeDrafts, setIntakeDrafts] = useState<Record<number, IntakeDraft>>({});
    const [savingServiceId, setSavingServiceId] = useState<number | null>(null);
    const [message, setMessage] = useState("");
    const [messageKind, setMessageKind] = useState<"success" | "error">(
        "success",
    );
    const can = useStaffAccess();
    const canEdit = can("services.edit");
    const intakeDraftFor = (item: Service): IntakeDraft =>
        intakeDrafts[item.id] ?? {
            questions: item.intake_questions.map((entry) => ({ ...entry, options: [...entry.options] })),
            consents: item.consents.map((entry) => ({ ...entry })),
        };

    const add = async (event: FormEvent) => {
        event.preventDefault();
        try {
            await appointmentApi.createStaffService(token, {
                title,
                description,
                duration_minutes: duration,
                icon_key: iconKey,
                allows_media_chat: allowsChat,
                price_toman: 0,
                payment_mode: "none",
                deposit_toman: 0,
                urgent_enabled: false,
                urgent_extra_toman: 0,
                buffer_before_minutes: 0,
                buffer_after_minutes: 0,
                concurrent_capacity: 1,
                pre_visit_instructions: "",
                post_visit_instructions: "",
                image_requirements: [],
                weekly_schedules: [],
                urgent_schedules: [],
                intake_questions: [],
                consents: [],
                is_active: true,
                sort_order: services.length + 1,
            });
            setTitle("");
            setDescription("");
            setDuration(20);
            setIconKey("medical");
            setAllowsChat(false);
            setShowAddForm(false);
            setMessageKind("success");
            setMessage("خدمت جدید اضافه شد.");
            await onReload();
        } catch (addError) {
            setMessageKind("error");
            setMessage(errorMessage(addError));
        }
    };
    const toggle = async (item: Service) => {
        try {
            await appointmentApi.updateStaffService(token, item.id, {
                title: item.title,
                description: item.description,
                duration_minutes: item.duration_minutes,
                icon_key: item.icon_key,
                allows_media_chat: item.allows_media_chat,
                price_toman: item.price_toman,
                payment_mode: item.payment_mode,
                deposit_toman: item.deposit_toman,
                urgent_enabled: item.urgent_enabled,
                urgent_extra_toman: item.urgent_extra_toman,
                buffer_before_minutes: item.buffer_before_minutes,
                buffer_after_minutes: item.buffer_after_minutes,
                concurrent_capacity: item.concurrent_capacity,
                pre_visit_instructions: item.pre_visit_instructions,
                post_visit_instructions: item.post_visit_instructions,
                image_requirements: item.image_requirements,
                weekly_schedules: item.weekly_schedules,
                urgent_schedules: item.urgent_schedules,
                intake_questions: item.intake_questions,
                consents: item.consents,
                sort_order: item.sort_order,
                is_active: !item.is_active,
            });
            setMessageKind("success");
            setMessage(item.is_active ? "خدمت غیرفعال شد" : "خدمت فعال شد");
            await onReload();
        } catch (toggleError) {
            setMessageKind("error");
            setMessage(errorMessage(toggleError));
        }
    };
    const saveServiceOptions = async (
        item: Service,
        form: HTMLFormElement,
        paymentMode: Service["payment_mode"],
        urgentEnabled: boolean,
        chatEnabled: boolean,
    ) => {
        const data = new FormData(form);
        const imageTitles = String(data.get("image_titles") ?? "")
            .split("\n")
            .map((value) => value.trim())
            .filter(Boolean);
        const weeklySchedules = Array.from(
            { length: 7 },
            (_, weekday) => ({
                weekday,
                enabled: data.get(`service_day_${weekday}`) === "on",
                start_time: String(
                    data.get(`service_start_${weekday}`) ?? "16:00",
                ),
                end_time: String(
                    data.get(`service_end_${weekday}`) ?? "20:00",
                ),
            }),
        );
        const urgentSchedules = urgentEnabled
            ? Array.from({ length: 7 }, (_, weekday) => ({
                  weekday,
                  enabled: data.get(`urgent_day_${weekday}`) === "on",
                  start_time: String(
                      data.get(`urgent_start_${weekday}`) ?? "12:00",
                  ),
                  end_time: String(
                      data.get(`urgent_end_${weekday}`) ?? "14:00",
                  ),
              }))
            : [];
        const paymentAmount = Number(data.get("payment_amount_toman") ?? 0);
        setSavingServiceId(item.id);
        try {
            await appointmentApi.updateStaffService(token, item.id, {
                title: item.title,
                description: item.description,
                duration_minutes: Number(data.get("duration")),
                icon_key: String(data.get("icon")) as Service["icon_key"],
                allows_media_chat: chatEnabled,
                price_toman: paymentMode === "none" ? 0 : paymentAmount,
                payment_mode: paymentMode,
                deposit_toman:
                    paymentMode === "deposit" ? paymentAmount : 0,
                urgent_enabled: urgentEnabled,
                urgent_extra_toman: urgentEnabled
                    ? Number(data.get("urgent_extra_toman") ?? 0)
                    : 0,
                buffer_before_minutes: Number(
                    data.get("buffer_before_minutes") ?? 0,
                ),
                buffer_after_minutes: Number(
                    data.get("buffer_after_minutes") ?? 0,
                ),
                concurrent_capacity: Number(
                    data.get("concurrent_capacity") ?? 1,
                ),
                pre_visit_instructions: String(
                    data.get("pre_visit_instructions") ?? "",
                ).trim(),
                post_visit_instructions: String(
                    data.get("post_visit_instructions") ?? "",
                ).trim(),
                image_requirements: chatEnabled
                    ? imageTitles.map((title, index) => ({
                          id: 0,
                          title,
                          is_required: true,
                          sort_order: index + 1,
                      }))
                    : [],
                weekly_schedules: weeklySchedules,
                urgent_schedules: urgentSchedules,
                intake_questions: intakeDraftFor(item).questions.map(
                    (entry, index) => ({
                        ...entry,
                        label: entry.label.trim(),
                        options: entry.options.map((value) => value.trim()).filter(Boolean),
                        sort_order: index + 1,
                    }),
                ),
                consents: intakeDraftFor(item).consents.map((entry, index) => ({
                    ...entry,
                    title: entry.title.trim(),
                    body: entry.body.trim(),
                    sort_order: index + 1,
                })),
                sort_order: item.sort_order,
                is_active: item.is_active,
            });
            setMessageKind("success");
            setMessage("تنظیمات خدمت ذخیره شد");
            await onReload();
            setIntakeDrafts((current) => {
                const next = { ...current };
                delete next[item.id];
                return next;
            });
        } catch (saveError) {
            setMessageKind("error");
            setMessage(errorMessage(saveError));
        } finally {
            setSavingServiceId(null);
        }
    };
    return (
        <section className="app-panel-enter">
            <Toast
                message={message}
                kind={messageKind}
                onClose={() => setMessage("")}
            />
            <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                    <span className="text-sm text-secondary-deep">
                        موارد قابل رزرو
                    </span>
                    <h2 className="mt-1 font-dana text-3xl text-primary">
                        خدمات مطب
                    </h2>
                </div>
                {can("services.create") && (
                    <button
                        type="button"
                        onClick={() => setShowAddForm((value) => !value)}
                        className="h-11 rounded-2xl bg-primary px-5 text-sm font-bold text-white shadow-sm transition hover:bg-primary-mild"
                    >
                        {showAddForm ? "بستن فرم" : "افزودن خدمت"}
                    </button>
                )}
            </div>
            {can("services.create") && showAddForm && (
                <form
                    onSubmit={add}
                    className="app-panel-enter mt-6 grid gap-3 rounded-3xl border border-emerald-100 bg-white p-5 shadow-sm md:grid-cols-2 xl:grid-cols-[1fr_1.4fr_130px_170px_auto]"
                >
                    <input
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className={inputClass}
                        placeholder="عنوان خدمت"
                        required
                    />
                    <input
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className={inputClass}
                        placeholder="توضیح کوتاه"
                    />
                    <input
                        type="number"
                        min="5"
                        max="240"
                        value={duration}
                        onChange={(event) =>
                            setDuration(Number(event.target.value))
                        }
                        className={inputClass}
                        aria-label="مدت خدمت به دقیقه"
                        placeholder="مدت (دقیقه)"
                        required
                    />
                    <AppSelect
                        value={iconKey}
                        onChange={(value) =>
                            setIconKey(
                                value as Service["icon_key"],
                            )
                        }
                        options={serviceIconOptions}
                        ariaLabel="آیکن خدمت"
                    />
                    <button className="h-11 rounded-xl bg-primary px-5 text-white">
                        افزودن خدمت
                    </button>
                    <label className="flex items-center gap-2 text-sm text-slate-600 md:col-span-2 xl:col-span-5">
                        <input
                            type="checkbox"
                            checked={allowsChat}
                            onChange={(event) =>
                                setAllowsChat(event.target.checked)
                            }
                            className="h-4 w-4 accent-secondary"
                        />
                        فعال‌سازی ارسال تصویر و گفت‌وگوی آنلاین برای این خدمت
                    </label>
                </form>
            )}
            <div className="mt-5 grid max-w-5xl gap-4">
                {services.map((item, serviceIndex) => (
                    <article
                        key={item.id}
                        className="app-card-enter rounded-2xl border border-slate-200 bg-white p-5"
                        style={{
                            animationDelay: `${Math.min(serviceIndex, 6) * 55}ms`,
                        }}
                    >
                        <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3">
                                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-secondary/10 text-2xl text-secondary-deep">
                                    <ServiceIcon icon={item.icon_key} />
                                </span>
                                <div>
                                    <h3 className="font-bold text-primary">
                                        {item.title}
                                    </h3>
                                    <p className="mt-2 text-sm leading-6 text-slate-500">
                                        {item.description}
                                    </p>
                                </div>
                            </div>
                            <div className="flex shrink-0 flex-col items-end gap-2">
                                <span
                                    className={`rounded-full px-3 py-1 text-xs ${item.is_active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}
                                >
                                    {item.is_active ? "فعال" : "غیرفعال"}
                                </span>
                                <button
                                    type="button"
                                    onClick={() =>
                                        setExpandedServiceId((current) =>
                                            current === item.id ? null : item.id,
                                        )
                                    }
                                    className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-primary transition hover:border-secondary hover:bg-secondary/5"
                                >
                                    {expandedServiceId === item.id
                                        ? "بستن تنظیمات"
                                        : "ویرایش تنظیمات"}
                                </button>
                            </div>
                        </div>
                        <form
                            className={`${
                                expandedServiceId === item.id ? "grid" : "hidden"
                            } app-panel-enter mt-4 gap-4 rounded-2xl border border-slate-100 bg-slate-50/80 p-4 sm:grid-cols-2`}
                            onSubmit={(event) => {
                                event.preventDefault();
                                void saveServiceOptions(
                                    item,
                                    event.currentTarget,
                                    paymentModes[item.id] ?? item.payment_mode,
                                    urgentStates[item.id] ?? item.urgent_enabled,
                                    chatStates[item.id] ?? item.allows_media_chat,
                                );
                            }}
                        >
                            <label className="text-xs text-slate-500">
                                مدت خدمت (دقیقه)
                                <input
                                    name="duration"
                                    type="number"
                                    min="5"
                                    max="240"
                                    defaultValue={item.duration_minutes}
                                    disabled={!canEdit}
                                    className={`${inputClass} mt-1`}
                                />
                            </label>
                            <label className="text-xs text-slate-500">
                                آیکن
                                <AppSelect
                                    name="icon"
                                    defaultValue={item.icon_key}
                                    disabled={!canEdit}
                                    options={serviceIconOptions}
                                    ariaLabel="آیکن خدمت"
                                    className="mt-1"
                                />
                            </label>
                            <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:col-span-2 sm:grid-cols-3">
                                <label className="text-xs text-slate-500">
                                    ظرفیت هم‌زمان
                                    <input
                                        name="concurrent_capacity"
                                        type="number"
                                        min="1"
                                        max="20"
                                        defaultValue={item.concurrent_capacity}
                                        disabled={!canEdit}
                                        className={`${inputClass} mt-1`}
                                    />
                                </label>
                                <label className="text-xs text-slate-500">
                                    فاصله قبل (دقیقه)
                                    <input
                                        name="buffer_before_minutes"
                                        type="number"
                                        min="0"
                                        max="180"
                                        step="5"
                                        defaultValue={item.buffer_before_minutes}
                                        disabled={!canEdit}
                                        className={`${inputClass} mt-1`}
                                    />
                                </label>
                                <label className="text-xs text-slate-500">
                                    فاصله بعد (دقیقه)
                                    <input
                                        name="buffer_after_minutes"
                                        type="number"
                                        min="0"
                                        max="180"
                                        step="5"
                                        defaultValue={item.buffer_after_minutes}
                                        disabled={!canEdit}
                                        className={`${inputClass} mt-1`}
                                    />
                                </label>
                            </div>
                            <details className="group overflow-hidden rounded-2xl border border-slate-200 bg-white sm:col-span-2">
                                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-4 text-sm font-bold text-primary marker:hidden">
                                    <span>
                                        روزها و ساعت‌های عادی این خدمت
                                        <span className="mt-1 block text-xs font-normal text-slate-500">
                                            {toPersianDigits(
                                                item.weekly_schedules.filter(
                                                    (day) => day.enabled,
                                                ).length,
                                            )}{" "}
                                            روز فعال در هفته
                                        </span>
                                    </span>
                                    <DetailsChevron />
                                </summary>
                                <div className="app-details-content space-y-2 border-t border-slate-100 bg-slate-50/70 p-3">
                                    {iranWeekOrder.map((weekday) => {
                                        const schedule =
                                            item.weekly_schedules.find(
                                                (entry) =>
                                                    entry.weekday === weekday,
                                            );
                                        return (
                                            <div
                                                key={weekday}
                                                className="grid grid-cols-2 gap-2 rounded-xl border border-slate-100 bg-white p-3 sm:grid-cols-[110px_1fr_1fr] sm:items-end"
                                            >
                                                <label className="col-span-2 flex h-9 items-center gap-2 text-xs font-medium text-slate-700 sm:col-span-1 sm:h-11">
                                                    <input
                                                        name={`service_day_${weekday}`}
                                                        type="checkbox"
                                                        defaultChecked={
                                                            schedule?.enabled ??
                                                            false
                                                        }
                                                        disabled={!canEdit}
                                                        className="h-4 w-4 accent-secondary"
                                                    />
                                                    {weekdayNames[weekday]}
                                                </label>
                                                <label className="text-[11px] text-slate-400">
                                                    از ساعت
                                                    <input
                                                        name={`service_start_${weekday}`}
                                                        type="time"
                                                        defaultValue={(
                                                            schedule?.start_time ??
                                                            "16:00"
                                                        ).slice(0, 5)}
                                                        disabled={!canEdit}
                                                        className={`${inputClass} mt-1`}
                                                    />
                                                </label>
                                                <label className="text-[11px] text-slate-400">
                                                    تا ساعت
                                                    <input
                                                        name={`service_end_${weekday}`}
                                                        type="time"
                                                        defaultValue={(
                                                            schedule?.end_time ??
                                                            "20:00"
                                                        ).slice(0, 5)}
                                                        disabled={!canEdit}
                                                        className={`${inputClass} mt-1`}
                                                    />
                                                </label>
                                            </div>
                                        );
                                    })}
                                </div>
                            </details>
                            {expandedServiceId === item.id && can("schedule.view") && (
                                <ServiceExceptionsEditor
                                    token={token}
                                    service={item}
                                />
                            )}
                            <label className="flex items-center gap-2 text-xs text-slate-600 sm:col-span-2">
                                <input
                                    name="chat"
                                    type="checkbox"
                                    checked={
                                        chatStates[item.id] ??
                                        item.allows_media_chat
                                    }
                                    onChange={(event) =>
                                        setChatStates((current) => ({
                                            ...current,
                                            [item.id]: event.target.checked,
                                        }))
                                    }
                                    disabled={!canEdit}
                                    className="h-4 w-4 accent-secondary"
                                />
                                ارسال تصویر و گفت‌وگو فعال باشد
                            </label>
                            {(chatStates[item.id] ??
                                item.allows_media_chat) && (
                                <label className="app-panel-enter text-xs text-slate-500 sm:col-span-2">
                                    عنوان عکس‌های موردنیاز؛ هر عنوان در یک خط
                                    <textarea
                                        name="image_titles"
                                        defaultValue={[
                                            ...item.image_requirements,
                                        ]
                                            .sort(
                                                (a, b) =>
                                                    a.sort_order - b.sort_order,
                                            )
                                            .map((entry) => entry.title)
                                            .join("\n")}
                                        disabled={!canEdit}
                                        rows={3}
                                        placeholder={"نمای روبه‌رو\nنیم‌رخ راست\nنیم‌رخ چپ"}
                                        className="mt-1 w-full rounded-2xl border border-slate-200 bg-white p-3 text-sm outline-none transition focus:border-secondary focus:ring-4 focus:ring-secondary/10"
                                    />
                                    <span className="mt-1 block">
                                        هر عنوان دقیقاً یک عکس تا ۱۰ مگابایت
                                        دریافت می‌کند.
                                    </span>
                                </label>
                            )}
                            <ServiceIntakeEditor
                                draft={intakeDraftFor(item)}
                                canEdit={canEdit}
                                onChange={(draft) =>
                                    setIntakeDrafts((current) => ({
                                        ...current,
                                        [item.id]: draft,
                                    }))
                                }
                            />
                            <details className="group overflow-hidden rounded-2xl border border-slate-200 bg-white sm:col-span-2">
                                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-4 marker:hidden">
                                    <span>
                                        <b className="block text-sm text-primary">راهنمای قبل و بعد از مراجعه</b>
                                        <span className="mt-1 block text-xs font-normal text-slate-500">در بخش «راهنمای من» پنل بیمار نمایش داده می‌شود.</span>
                                    </span>
                                    <DetailsChevron />
                                </summary>
                                <div className="app-details-content grid gap-4 border-t border-slate-100 bg-slate-50/70 p-4 md:grid-cols-2">
                                    <label className="text-xs text-slate-500">
                                        راهنمای قبل از مراجعه
                                        <textarea
                                            name="pre_visit_instructions"
                                            defaultValue={item.pre_visit_instructions}
                                            disabled={!canEdit}
                                            rows={6}
                                            maxLength={5000}
                                            className="mt-1 w-full rounded-2xl border border-slate-200 bg-white p-3 text-sm leading-7 outline-none transition focus:border-secondary focus:ring-4 focus:ring-secondary/10"
                                            placeholder={"مثلاً مدارک قبلی را همراه داشته باشید.\nداروهای مصرفی را یادداشت کنید."}
                                        />
                                    </label>
                                    <label className="text-xs text-slate-500">
                                        راهنمای بعد از مراجعه
                                        <textarea
                                            name="post_visit_instructions"
                                            defaultValue={item.post_visit_instructions}
                                            disabled={!canEdit}
                                            rows={6}
                                            maxLength={5000}
                                            className="mt-1 w-full rounded-2xl border border-slate-200 bg-white p-3 text-sm leading-7 outline-none transition focus:border-secondary focus:ring-4 focus:ring-secondary/10"
                                            placeholder="راهنمای عمومی پیگیری و مراقبت پس از مراجعه"
                                        />
                                    </label>
                                    <p className="text-[11px] leading-5 text-amber-700 md:col-span-2">اطلاعات تشخیصی یا دستور درمان اختصاصی بیمار را اینجا وارد نکنید؛ این متن برای همه بیماران همان خدمت نمایش داده می‌شود.</p>
                                </div>
                            </details>
                            <label className="text-xs text-slate-500 sm:col-span-2">
                                نوع پرداخت
                                <AppSelect
                                    name="payment_mode"
                                    value={
                                        paymentModes[item.id] ??
                                        item.payment_mode
                                    }
                                    onChange={(value) =>
                                        setPaymentModes((current) => ({
                                            ...current,
                                            [item.id]:
                                                value as Service["payment_mode"],
                                        }))
                                    }
                                    disabled={!canEdit}
                                    options={paymentOptions}
                                    ariaLabel="نوع پرداخت"
                                    className="mt-1"
                                />
                            </label>
                            {(paymentModes[item.id] ?? item.payment_mode) !==
                                "none" && (
                                <label className="app-panel-enter text-xs text-slate-500 sm:col-span-2">
                                    {(paymentModes[item.id] ??
                                        item.payment_mode) === "deposit"
                                        ? "مبلغ بیعانه (تومان)"
                                        : "مبلغ کامل خدمت (تومان)"}
                                    <input
                                        key={`${item.id}-${paymentModes[item.id] ?? item.payment_mode}`}
                                        name="payment_amount_toman"
                                        type="number"
                                        min="1000"
                                        step="1000"
                                        required
                                        defaultValue={
                                            (paymentModes[item.id] ??
                                                item.payment_mode) === "deposit"
                                                ? item.deposit_toman
                                                : item.price_toman
                                        }
                                        disabled={!canEdit}
                                        className={`${inputClass} mt-1`}
                                    />
                                </label>
                            )}
                            <label className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-700 sm:col-span-2">
                                <span>
                                    <b className="block text-sm text-primary">
                                        نوبت فوری
                                    </b>
                                    <span className="mt-1 block text-slate-500">
                                        برنامه و مبلغ اضافه مستقل برای این خدمت
                                    </span>
                                </span>
                                <input
                                    name="urgent_enabled"
                                    type="checkbox"
                                    checked={
                                        urgentStates[item.id] ??
                                        item.urgent_enabled
                                    }
                                    onChange={(event) =>
                                        setUrgentStates((current) => ({
                                            ...current,
                                            [item.id]: event.target.checked,
                                        }))
                                    }
                                    disabled={!canEdit}
                                    className="h-5 w-5 accent-secondary"
                                />
                            </label>
                            {(urgentStates[item.id] ?? item.urgent_enabled) && (
                                <label className="app-panel-enter text-xs text-slate-500 sm:col-span-2">
                                    مبلغ اضافه نوبت فوری (تومان)
                                    <input
                                        name="urgent_extra_toman"
                                        type="number"
                                        min="0"
                                        step="1000"
                                        required
                                        defaultValue={item.urgent_extra_toman}
                                        disabled={!canEdit}
                                        className={`${inputClass} mt-1`}
                                    />
                                </label>
                            )}
                            {(urgentStates[item.id] ?? item.urgent_enabled) && (
                                <div className="app-panel-enter sm:col-span-2">
                                    <p className="mb-2 text-xs font-bold text-slate-600">
                                        ساعت‌های اختصاصی نوبت فوری
                                    </p>
                                    <div className="space-y-2">
                                        {iranWeekOrder.map((weekday) => {
                                            const schedule =
                                                item.urgent_schedules.find(
                                                    (entry) =>
                                                        entry.weekday === weekday,
                                                );
                                            return (
                                                <div
                                                    key={weekday}
                                                    className="grid grid-cols-2 gap-2 rounded-xl border border-slate-100 bg-white p-3 sm:grid-cols-[110px_1fr_1fr] sm:items-end"
                                                >
                                                    <label className="col-span-2 flex items-center gap-2 text-xs font-medium text-slate-700 sm:col-span-1 sm:h-11">
                                                        <input
                                                            name={`urgent_day_${weekday}`}
                                                            type="checkbox"
                                                            defaultChecked={
                                                                schedule?.enabled ??
                                                                false
                                                            }
                                                            disabled={!canEdit}
                                                            className="h-4 w-4 accent-secondary"
                                                        />
                                                        {weekdayNames[weekday]}
                                                    </label>
                                                    <label className="text-[11px] text-slate-400">
                                                        از ساعت
                                                        <input
                                                            name={`urgent_start_${weekday}`}
                                                            type="time"
                                                            defaultValue={(
                                                                schedule?.start_time ??
                                                                "12:00"
                                                            ).slice(0, 5)}
                                                            disabled={!canEdit}
                                                            className={`${inputClass} mt-1`}
                                                        />
                                                    </label>
                                                    <label className="text-[11px] text-slate-400">
                                                        تا ساعت
                                                        <input
                                                            name={`urgent_end_${weekday}`}
                                                            type="time"
                                                            defaultValue={(
                                                                schedule?.end_time ??
                                                                "14:00"
                                                            ).slice(0, 5)}
                                                            disabled={!canEdit}
                                                            className={`${inputClass} mt-1`}
                                                        />
                                                    </label>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                            {canEdit && (
                                <button
                                    disabled={savingServiceId === item.id}
                                    className="h-11 rounded-xl bg-secondary px-4 text-sm font-bold text-primary shadow-sm transition hover:bg-secondary-mild disabled:cursor-wait disabled:opacity-60 sm:col-span-2"
                                >
                                    {savingServiceId === item.id
                                        ? "در حال ذخیره…"
                                        : "ذخیره تنظیمات خدمت"}
                                </button>
                            )}
                        </form>
                        {canEdit && (
                            <button
                                onClick={() => void toggle(item)}
                                className={`${expandedServiceId === item.id ? "mt-4 inline-flex" : "hidden"} text-sm text-secondary-deep`}
                            >
                                {item.is_active ? "غیرفعال کردن" : "فعال کردن"}
                            </button>
                        )}
                    </article>
                ))}
            </div>
        </section>
    );
};

const SmsCenterPanel = ({
    token,
    services,
    rules,
    campaigns,
    outbox,
    onReload,
}: {
    token: string;
    services: Service[];
    rules: SmsAutomationRule[];
    campaigns: SmsCampaign[];
    outbox: SmsOutboxItem[];
    onReload: () => Promise<void>;
}) => {
    const [message, setMessage] = useState("");
    const [messageKind, setMessageKind] = useState<"success" | "error">("success");
    const [busy, setBusy] = useState("");
    const [previewCount, setPreviewCount] = useState<number | null>(null);
    const [campaignDraft, setCampaignDraft] = useState({
        title: "",
        message_text: "{patient_name} عزیز، ",
        provider_pattern_code: "",
        service_ids: [] as number[],
        gender: "" as "" | "female" | "male",
        min_age: "",
        max_age: "",
    });
    const can = useStaffAccess();
    const canEdit = can("sms.rules.edit");

    const campaignFilters = (): SmsCampaignFilters => ({
        service_ids: campaignDraft.service_ids,
        gender: campaignDraft.gender || null,
        min_age: campaignDraft.min_age === "" ? null : Number(campaignDraft.min_age),
        max_age: campaignDraft.max_age === "" ? null : Number(campaignDraft.max_age),
    });

    const updateCampaignDraft = <K extends keyof typeof campaignDraft,>(
        key: K,
        value: (typeof campaignDraft)[K],
    ) => {
        setCampaignDraft((current) => ({ ...current, [key]: value }));
        setPreviewCount(null);
    };

    const previewCampaign = async () => {
        setBusy("campaign-preview");
        try {
            const result = await appointmentApi.previewStaffSmsCampaign(token, campaignFilters());
            setPreviewCount(result.recipient_count);
            setMessageKind("success");
            setMessage(`${toPersianDigits(result.recipient_count)} مخاطب مطابق فیلترها پیدا شد.`);
        } catch (error) {
            setMessageKind("error");
            setMessage(errorMessage(error));
        } finally {
            setBusy("");
        }
    };

    const queueCampaign = async () => {
        if (previewCount === null || previewCount < 1) return;
        setBusy("campaign-create");
        try {
            await appointmentApi.createStaffSmsCampaign(token, {
                title: campaignDraft.title,
                message_text: campaignDraft.message_text,
                provider_pattern_code: campaignDraft.provider_pattern_code,
                filters: campaignFilters(),
                expected_recipient_count: previewCount,
            });
            setMessageKind("success");
            setMessage(`کمپین برای ${toPersianDigits(previewCount)} مخاطب وارد صف شد.`);
            setPreviewCount(null);
            setCampaignDraft({
                title: "",
                message_text: "{patient_name} عزیز، ",
                provider_pattern_code: "",
                service_ids: [],
                gender: "",
                min_age: "",
                max_age: "",
            });
            await onReload();
        } catch (error) {
            setMessageKind("error");
            setMessage(errorMessage(error));
        } finally {
            setBusy("");
        }
    };

    const save = async (rule: SmsAutomationRule, form: HTMLFormElement) => {
        const data = new FormData(form);
        setBusy(rule.event_key);
        try {
            await appointmentApi.updateStaffSmsRule(token, rule.event_key, {
                enabled: data.get("enabled") === "on",
                template_text: String(data.get("template_text") ?? ""),
                provider_pattern_code: String(data.get("provider_pattern_code") ?? ""),
            });
            setMessageKind("success");
            setMessage(`قانون «${rule.title}» ذخیره شد.`);
            await onReload();
        } catch (error) {
            setMessageKind("error");
            setMessage(errorMessage(error));
        } finally {
            setBusy("");
        }
    };

    const dispatch = async () => {
        setBusy("dispatch");
        try {
            const result = await appointmentApi.dispatchStaffSms(token);
            setMessageKind("success");
            setMessage(result.message);
            await onReload();
        } catch (error) {
            setMessageKind("error");
            setMessage(errorMessage(error));
        } finally {
            setBusy("");
        }
    };

    return (
        <section className="app-panel-enter">
            <Toast message={message} kind={messageKind} onClose={() => setMessage("")} />
            <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                    <span className="text-sm text-secondary-deep">پیامک‌های خودکار</span>
                    <h2 className="mt-1 font-dana text-3xl text-primary">مرکز پیامکی</h2>
                </div>
                {can("sms.dispatch") && (
                    <button
                        type="button"
                        disabled={busy === "dispatch"}
                        onClick={() => void dispatch()}
                        className="h-11 rounded-xl bg-primary px-5 text-sm text-white disabled:opacity-50"
                    >
                        ارسال موارد در صف
                    </button>
                )}
            </div>
            {can("sms.campaigns.create") && (
                <div className="mt-6 rounded-2xl border border-secondary/30 bg-white p-5 shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                            <h3 className="font-dana text-xl text-primary">ارسال هدفمند</h3>
                            <p className="mt-1 text-xs text-slate-500">
                                ابتدا مخاطبان را پیش‌نمایش کنید؛ پیامک‌ها بعد از تأیید وارد صف می‌شوند.
                            </p>
                        </div>
                        {previewCount !== null && (
                            <span className="rounded-full bg-secondary/20 px-4 py-2 text-sm font-bold text-primary">
                                {toPersianDigits(previewCount)} مخاطب
                            </span>
                        )}
                    </div>
                    <div className="mt-5 grid gap-4 lg:grid-cols-2">
                        <div className="space-y-4">
                            <label className="block text-xs text-slate-500">
                                عنوان داخلی کمپین
                                <input
                                    value={campaignDraft.title}
                                    onChange={(event) => updateCampaignDraft("title", event.target.value)}
                                    className={`${inputClass} mt-1`}
                                    placeholder="مثلاً یادآوری مراقبت بعد از عمل"
                                />
                            </label>
                            <label className="block text-xs text-slate-500">
                                متن پیامک
                                <textarea
                                    value={campaignDraft.message_text}
                                    onChange={(event) => updateCampaignDraft("message_text", event.target.value)}
                                    rows={5}
                                    className="mt-1 w-full rounded-xl border border-slate-200 p-3 text-sm leading-6 outline-none focus:border-secondary"
                                />
                            </label>
                            <label className="block text-xs text-slate-500">
                                کد پترن فراز
                                <input
                                    value={campaignDraft.provider_pattern_code}
                                    onChange={(event) => updateCampaignDraft("provider_pattern_code", event.target.value)}
                                    className={`${inputClass} mt-1`}
                                    placeholder="در حالت Webhook اختیاری است"
                                />
                            </label>
                            <p className="text-[11px] text-slate-400">
                                متغیرها: {"{patient_name}"}، {"{first_name}"}، {"{service_title}"}
                            </p>
                        </div>
                        <div className="space-y-4 rounded-2xl bg-slate-50 p-4">
                            <div>
                                <span className="text-xs text-slate-500">خدمت‌های دریافت‌شده</span>
                                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                                    {services.map((service) => (
                                        <label key={service.id} className="flex items-center gap-2 rounded-xl bg-white p-3 text-sm text-slate-700">
                                            <input
                                                type="checkbox"
                                                checked={campaignDraft.service_ids.includes(service.id)}
                                                onChange={(event) => updateCampaignDraft(
                                                    "service_ids",
                                                    event.target.checked
                                                        ? [...campaignDraft.service_ids, service.id]
                                                        : campaignDraft.service_ids.filter((id) => id !== service.id),
                                                )}
                                                className="accent-secondary"
                                            />
                                            {service.title}
                                        </label>
                                    ))}
                                </div>
                                <p className="mt-2 text-[11px] text-slate-400">بدون انتخاب خدمت یعنی همه بیماران.</p>
                            </div>
                            <div className="grid gap-3 sm:grid-cols-3">
                                <label className="text-xs text-slate-500">
                                    جنسیت
                                    <AppSelect
                                        value={campaignDraft.gender}
                                        onChange={(value) =>
                                            updateCampaignDraft(
                                                "gender",
                                                value as typeof campaignDraft.gender,
                                            )
                                        }
                                        options={genderFilterOptions}
                                        ariaLabel="جنسیت"
                                        className="mt-1"
                                    />
                                </label>
                                <label className="text-xs text-slate-500">
                                    حداقل سن
                                    <input
                                        type="number"
                                        min="0"
                                        max="120"
                                        value={campaignDraft.min_age}
                                        onChange={(event) => updateCampaignDraft("min_age", event.target.value)}
                                        className={`${inputClass} mt-1`}
                                    />
                                </label>
                                <label className="text-xs text-slate-500">
                                    حداکثر سن
                                    <input
                                        type="number"
                                        min="0"
                                        max="120"
                                        value={campaignDraft.max_age}
                                        onChange={(event) => updateCampaignDraft("max_age", event.target.value)}
                                        className={`${inputClass} mt-1`}
                                    />
                                </label>
                            </div>
                            <div className="grid gap-3 sm:grid-cols-2">
                                <button
                                    type="button"
                                    disabled={busy === "campaign-preview"}
                                    onClick={() => void previewCampaign()}
                                    className="h-11 rounded-xl border border-primary text-sm font-bold text-primary disabled:opacity-50"
                                >
                                    پیش‌نمایش مخاطبان
                                </button>
                                <button
                                    type="button"
                                    disabled={previewCount === null || previewCount < 1 || busy === "campaign-create" || !campaignDraft.title.trim() || !campaignDraft.message_text.trim()}
                                    onClick={() => void queueCampaign()}
                                    className="h-11 rounded-xl bg-primary text-sm font-bold text-white disabled:opacity-40"
                                >
                                    تأیید و افزودن به صف
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {!!campaigns.length && (
                <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white">
                    <div className="border-b border-slate-200 p-5">
                        <h3 className="font-dana text-xl text-primary">کمپین‌های اخیر</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                            <thead className="bg-slate-50 text-slate-500">
                                <tr>
                                    <th className="p-3 text-right">عنوان</th>
                                    <th className="p-3 text-right">مخاطب</th>
                                    <th className="p-3 text-right">موفق</th>
                                    <th className="p-3 text-right">ناموفق نهایی</th>
                                    <th className="p-3 text-right">وضعیت</th>
                                </tr>
                            </thead>
                            <tbody>
                                {campaigns.map((campaign) => (
                                    <tr key={campaign.id} className="border-t border-slate-100">
                                        <td className="p-3 font-medium text-primary">{campaign.title}</td>
                                        <td className="p-3">{toPersianDigits(campaign.recipient_count)}</td>
                                        <td className="p-3 text-emerald-700">{toPersianDigits(campaign.sent_count)}</td>
                                        <td className="p-3 text-rose-700">{toPersianDigits(campaign.failed_count)}</td>
                                        <td className="p-3 text-slate-500">
                                            {campaign.status === "completed" ? "پایان‌یافته" : campaign.status === "sending" ? "در حال ارسال" : "در صف"}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
            <div className="mt-6 grid gap-4 xl:grid-cols-2">
                {rules.map((rule) => (
                    <form
                        key={rule.event_key}
                        onSubmit={(event) => {
                            event.preventDefault();
                            void save(rule, event.currentTarget);
                        }}
                        className="rounded-2xl border border-slate-200 bg-white p-5"
                    >
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <h3 className="font-bold text-primary">{rule.title}</h3>
                                <code dir="ltr" className="mt-1 block text-left text-[11px] text-slate-400">
                                    {rule.event_key}
                                </code>
                            </div>
                            <label className="flex items-center gap-2 text-sm text-slate-600">
                                <input
                                    name="enabled"
                                    type="checkbox"
                                    defaultChecked={rule.enabled}
                                    disabled={!canEdit}
                                    className="h-4 w-4 accent-secondary"
                                />
                                فعال
                            </label>
                        </div>
                        <label className="mt-4 block text-xs text-slate-500">
                            متن پیامک
                            <textarea
                                name="template_text"
                                defaultValue={rule.template_text}
                                disabled={!canEdit}
                                rows={4}
                                className="mt-1 w-full rounded-xl border border-slate-200 p-3 text-sm leading-6 outline-none focus:border-secondary"
                            />
                        </label>
                        <label className="mt-3 block text-xs text-slate-500">
                            کد پترن فراز
                            <input
                                name="provider_pattern_code"
                                defaultValue={rule.provider_pattern_code}
                                disabled={!canEdit}
                                className={`${inputClass} mt-1`}
                                placeholder="در حالت Webhook اختیاری است"
                            />
                        </label>
                        <p className="mt-3 text-[11px] leading-5 text-slate-400">
                            متغیرها: {"{patient_name}"}، {"{service_title}"}، {"{appointment_date}"}، {"{appointment_time}"}، {"{tracking_code}"}، {"{amount_toman}"}
                        </p>
                        {canEdit && (
                            <button
                                disabled={busy === rule.event_key}
                                className="mt-4 h-10 w-full rounded-xl bg-secondary font-bold text-primary disabled:opacity-50"
                            >
                                ذخیره قانون
                            </button>
                        )}
                    </form>
                ))}
            </div>
            <div className="mt-7 overflow-hidden rounded-2xl border border-slate-200 bg-white">
                <div className="border-b border-slate-200 p-5">
                    <h3 className="font-dana text-xl text-primary">آخرین ارسال‌ها</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                        <thead className="bg-slate-50 text-slate-500">
                            <tr>
                                <th className="p-3 text-right">رویداد</th>
                                <th className="p-3 text-right">شماره</th>
                                <th className="p-3 text-right">متن</th>
                                <th className="p-3 text-right">وضعیت</th>
                            </tr>
                        </thead>
                        <tbody>
                            {outbox.map((item) => (
                                <tr key={item.id} className="border-t border-slate-100">
                                    <td className="whitespace-nowrap p-3">{item.event_key}</td>
                                    <td dir="ltr" className="whitespace-nowrap p-3 text-right">{formatLocalPhone(item.phone)}</td>
                                    <td className="max-w-md p-3 text-slate-600">{item.rendered_body}</td>
                                    <td className="p-3">
                                        <span className={`rounded-full px-2 py-1 text-xs ${item.status === "sent" ? "bg-emerald-50 text-emerald-700" : item.status === "failed" ? "bg-rose-50 text-rose-700" : "bg-amber-50 text-amber-700"}`}>
                                            {item.status === "sent" ? "ارسال شد" : item.status === "failed" ? "ناموفق" : "در صف"}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {!outbox.length && <p className="p-8 text-center text-slate-500">هنوز پیامکی در صف ثبت نشده است.</p>}
                </div>
            </div>
        </section>
    );
};

const MiniBarChart = ({
    title,
    points,
}: {
    title: string;
    points: Array<{ label: string; value: number }>;
}) => {
    const max = Math.max(1, ...points.map((point) => point.value));
    const bars = (items: Array<{ label: string; value: number }>, compact = false) =>
        items.map((point) => (
            <div
                key={point.label}
                className={`group flex min-w-0 flex-col items-center justify-end gap-2 ${compact ? "" : "sm:min-w-10 sm:flex-1"}`}
            >
                <span className="text-[10px] text-slate-400 opacity-0 transition group-hover:opacity-100">
                    {toPersianDigits(point.value)}
                </span>
                <div
                    className="w-full max-w-10 rounded-t-xl bg-linear-to-t from-primary to-secondary transition duration-300 group-hover:brightness-110"
                    style={{
                        height: `${Math.max(point.value ? 12 : 3, (point.value / max) * 145)}px`,
                    }}
                    title={`${point.label}: ${point.value}`}
                />
                <span className="w-full truncate text-center text-[10px] text-slate-500">
                    {point.label}
                </span>
            </div>
        ));
    return (
        <div className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="flex min-w-0 items-center justify-between gap-3">
                <h2 className="font-dana text-lg text-primary">{title}</h2>
                <span className="shrink-0 text-xs text-slate-400">تعداد نوبت</span>
            </div>
            <div
                className="mt-6 grid h-48 min-w-0 items-end gap-2 pb-1 sm:hidden"
                style={{ gridTemplateColumns: `repeat(${Math.min(points.length, 7)}, minmax(0, 1fr))` }}
            >
                {bars(points.slice(-7), true)}
            </div>
            <div className="mt-6 hidden h-48 min-w-0 items-end gap-2 overflow-x-auto pb-1 sm:flex">
                {bars(points)}
            </div>
        </div>
    );
};

export const StaffDashboard = ({
    token,
    profile,
    onLogout,
}: {
    token: string;
    profile: StaffProfile;
    onLogout: () => void;
}) => {
    const { clinicInfo } = useClinicInfo();
    const can = useCallback((code: string) => profile.permissions.includes(code), [profile.permissions]);
    const [tab, setTab] = useState<StaffTab>(() => (Object.keys(staffTabPermissions).find(t => can(staffTabPermissions[t])) ?? "dashboard") as StaffTab);
    const [mobileMenu, setMobileMenu] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [stats, setStats] = useState<DashboardStats>({
        today_total: 0,
        pending_total: 0,
        confirmed_total: 0,
        patients_total: 0,
        unread_conversations: 0,
        waitlist_total: 0,
        refund_attention_total: 0,
        daily_appointments: [],
    });
    const [settings, setSettings] = useState<ClinicSettings | null>(null);
    const [exceptions, setExceptions] = useState<ScheduleException[]>([]);
    const [services, setServices] = useState<Service[]>([]);
    const [appointmentPage, setAppointmentPage] = useState<AppointmentPage>({
        items: [],
        total: 0,
        page: 1,
        page_size: 20,
        total_pages: 1,
    });
    const [consultations, setConsultations] = useState<ConsultationThread[]>(
        [],
    );
    const [waitlist, setWaitlist] = useState<WaitlistEntry[]>([]);
    const [financeSummary, setFinanceSummary] = useState<FinanceSummary>({
        verified_count: 0,
        collected_toman: 0,
        refund_pending_count: 0,
        refund_pending_toman: 0,
        refunded_count: 0,
        refunded_toman: 0,
        failed_count: 0,
    });
    const [payments, setPayments] = useState<PaymentItem[]>([]);
    const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
    const [chatAppointmentId, setChatAppointmentId] = useState<number | null>(null);
    const [smsRules, setSmsRules] = useState<SmsAutomationRule[]>([]);
    const [smsCampaigns, setSmsCampaigns] = useState<SmsCampaign[]>([]);
    const [smsOutbox, setSmsOutbox] = useState<SmsOutboxItem[]>([]);
    const realtimeRefreshTimer = useRef(0);

    const loadAppointments = useCallback(
        async (filters = {}) => {
            setAppointmentPage(
                can("appointments.view") ? await appointmentApi.staffAppointments(token, filters) : { items: [], total: 0, page: 1, page_size: 20, total_pages: 1 },
            );
        },
        [can, token],
    );
    const loadConsultations = useCallback(async () => {
        const nextConsultations = can("consultations.view") ? await appointmentApi.staffConsultations(token) : [];
        setConsultations(nextConsultations);
        setStats((current) => ({
            ...current,
            unread_conversations: nextConsultations.reduce(
                (sum, item) => sum + item.unread_count,
                0,
            ),
        }));
    }, [can, token]);
    useConsultationRealtime(token, () => {
        window.clearTimeout(realtimeRefreshTimer.current);
        realtimeRefreshTimer.current = window.setTimeout(
            () => void loadConsultations(),
            150,
        );
    }, can("consultations.view"));
    useEffect(
        () => () => window.clearTimeout(realtimeRefreshTimer.current),
        [],
    );
    const loadOperations = useCallback(async () => {
        const [nextWaitlist, nextSummary, nextPayments, nextAudit] = await Promise.all([
            can("waitlist.view") ? appointmentApi.staffWaitlist(token) : Promise.resolve([]),
            can("finance.view") ? appointmentApi.staffFinanceSummary(token) : Promise.resolve(null),
            can("finance.view") ? appointmentApi.staffPayments(token) : Promise.resolve([]),
            can("audit.view") ? appointmentApi.staffAuditLogs(token) : Promise.resolve([]),
        ]);
        setWaitlist(nextWaitlist); if (nextSummary) setFinanceSummary(nextSummary); setPayments(nextPayments); setAuditLogs(nextAudit);
    }, [can, token]);
    const loadAll = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const [
                nextStats,
                nextSettings,
                nextExceptions,
                nextServices,
                nextAppointments,
                nextConsultations,
                nextSmsRules,
                nextSmsCampaigns,
                nextSmsOutbox,
                nextWaitlist,
                nextFinanceSummary,
                nextPayments,
                nextAuditLogs,
            ] = await Promise.all([
                can("dashboard.view") ? appointmentApi.staffStats(token) : Promise.resolve({ today_total: 0, pending_total: 0, confirmed_total: 0, patients_total: 0, unread_conversations: 0, waitlist_total: 0, refund_attention_total: 0, daily_appointments: [] }),
                can("settings.view") ? appointmentApi.staffSettings(token) : Promise.resolve(null),
                can("schedule.view") ? appointmentApi.staffExceptions(token) : Promise.resolve([] as ScheduleException[]),
                can("services.view") ? appointmentApi.staffServices(token) : Promise.resolve([] as Service[]),
                can("appointments.view") ? appointmentApi.staffAppointments(token) : Promise.resolve({ items: [], total: 0, page: 1, page_size: 20, total_pages: 1 }),
                can("consultations.view") ? appointmentApi.staffConsultations(token) : Promise.resolve([] as ConsultationThread[]),
                can("sms.view") ? appointmentApi.staffSmsRules(token) : Promise.resolve([] as SmsAutomationRule[]),
                can("sms.view") ? appointmentApi.staffSmsCampaigns(token) : Promise.resolve([] as SmsCampaign[]),
                can("sms.view") ? appointmentApi.staffSmsOutbox(token) : Promise.resolve([] as SmsOutboxItem[]),
                can("waitlist.view") ? appointmentApi.staffWaitlist(token) : Promise.resolve([] as WaitlistEntry[]),
                can("finance.view")
                    ? appointmentApi.staffFinanceSummary(token)
                    : Promise.resolve({
                          verified_count: 0,
                          collected_toman: 0,
                          refund_pending_count: 0,
                          refund_pending_toman: 0,
                          refunded_count: 0,
                          refunded_toman: 0,
                          failed_count: 0,
                      }),
                can("finance.view")
                    ? appointmentApi.staffPayments(token)
                    : Promise.resolve([] as PaymentItem[]),
                can("audit.view")
                    ? appointmentApi.staffAuditLogs(token)
                    : Promise.resolve([] as AuditLogItem[]),
            ]);
            setStats(nextStats);
            setSettings(nextSettings);
            setExceptions(nextExceptions);
            setServices(nextServices);
            setAppointmentPage(nextAppointments);
            setConsultations(nextConsultations);
            setSmsRules(nextSmsRules);
            setSmsCampaigns(nextSmsCampaigns);
            setSmsOutbox(nextSmsOutbox);
            setWaitlist(nextWaitlist);
            setFinanceSummary(nextFinanceSummary);
            setPayments(nextPayments);
            setAuditLogs(nextAuditLogs);
        } catch (loadError) {
            if (
                loadError instanceof AppointmentApiError &&
                loadError.status === 401
            )
                onLogout();
            else setError(errorMessage(loadError));
        } finally {
            setLoading(false);
        }
    }, [can, onLogout, token]);
    useEffect(() => {
        void loadAll();
    }, [loadAll]);

    const navItems: Array<{
        id: StaffTab;
        label: string;
        icon: React.ReactNode;
        badge?: number;
    }> = [
        { id: "dashboard", label: "داشبورد", icon: <IoGridOutline /> },
        { id: "calendar", label: "تقویم کاری", icon: <IoCalendarOutline /> },
        { id: "appointments", label: "نوبت‌ها", icon: <IoCalendarOutline /> },
        { id: "patients", label: "بیماران", icon: <IoPeopleOutline /> },
        {
            id: "consultations",
            label: "گفتگوها",
            icon: <IoChatbubblesOutline />,
            badge: stats.unread_conversations,
        },
        { id: "waitlist", label: "لیست انتظار", icon: <IoListOutline />, badge: stats.waitlist_total },
        {
            id: "clinic-info",
            label: "اطلاعات مطب",
            icon: <IoBusinessOutline />,
        },
        {
            id: "schedule",
            label: "تنظیمات نوبت‌دهی",
            icon: <IoSettingsOutline />,
        },
        { id: "services", label: "خدمات", icon: <IoCheckmarkCircleOutline /> },
        ...(can("finance.view")
            ? [
                  { id: "finance" as const, label: "مالی و تسویه", icon: <IoCardOutline />, badge: stats.refund_attention_total },
              ]
            : []),
        { id: "sms", label: "مرکز پیامکی", icon: <IoChatbubblesOutline /> },
        ...(can("audit.view")
            ? [
                  { id: "audit" as const, label: "تاریخچه عملیات", icon: <IoShieldCheckmarkOutline /> },
              ]
            : []),
        { id: "access", label: "نقش‌ها و کارکنان", icon: <IoShieldCheckmarkOutline /> },
    ].filter(item => can(staffTabPermissions[item.id])) as typeof navItems;
    const sidebar = (
        <>
            <div className="border-b border-white/8 px-5 py-6">
                <a href="/">
                    <img
                        src="/img/logo/logo-dark-full.webp"
                        alt={settings?.doctor_name ?? clinicInfo.doctorName}
                        width="560"
                        height="175"
                        className="w-44"
                    />
                </a>
            </div>
            <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto p-3">
                {navItems.map((item) => (
                    <button
                        key={item.id}
                        onClick={() => {
                            setTab(item.id);
                            setMobileMenu(false);
                        }}
                        className={`relative flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-right text-sm transition ${tab === item.id ? "bg-white/10 font-bold text-white shadow-inner" : "text-slate-400 hover:bg-white/5 hover:text-slate-100"}`}
                    >
                        {tab === item.id && <span className="absolute inset-y-2 right-0 w-1 rounded-l-full bg-secondary" />}
                        <span className={`text-lg ${tab === item.id ? "text-secondary" : ""}`}>{item.icon}</span>
                        <span className="flex-1">{item.label}</span>
                        {!!item.badge && (
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${tab === item.id ? "bg-primary text-white" : "bg-white/10 text-secondary"}`}>
                                {toPersianDigits(item.badge)}
                            </span>
                        )}
                    </button>
                ))}
            </nav>
            <div className="border-t border-white/8 p-4">
                <div className="mb-3 px-3">
                    <b className="block text-sm text-white">
                        {profile.full_name}
                    </b>
                    <span className="text-xs text-slate-400">
                        {profile.role_titles.join("، ") || "بدون نقش فعال"}
                    </span>
                </div>
                <button
                    onClick={onLogout}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-slate-300 hover:bg-white/5"
                >
                    <IoLogOutOutline /> خروج
                </button>
            </div>
        </>
    );

    const todayAppointments = useMemo(() => {
        const today = new Intl.DateTimeFormat("en-CA", {
            timeZone: "Asia/Tehran",
        }).format(new Date());
        return appointmentPage.items.filter(
            (item) => item.appointment_date === today,
        );
    }, [appointmentPage.items]);

    const dailyChart = useMemo(() => {
        const counts = new Map(
            stats.daily_appointments.map((point) => [point.date, point.total]),
        );
        return Array.from({ length: 14 }, (_, index) => {
            const day = new Date();
            day.setDate(day.getDate() - (13 - index));
            const key = new Intl.DateTimeFormat("en-CA", {
                timeZone: "Asia/Tehran",
            }).format(day);
            return {
                label: new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
                    day: "numeric",
                    month: "short",
                }).format(day),
                value: counts.get(key) ?? 0,
            };
        });
    }, [stats.daily_appointments]);

    const monthlyChart = useMemo(() => {
        const grouped = new Map<string, { label: string; value: number }>();
        stats.daily_appointments.forEach((point) => {
            const day = new Date(`${point.date}T12:00:00`);
            const parts = new Intl.DateTimeFormat(
                "fa-IR-u-ca-persian-nu-latn",
                {
                    year: "numeric",
                    month: "long",
                },
            ).formatToParts(day);
            const year =
                parts.find((part) => part.type === "year")?.value ?? "";
            const month =
                parts.find((part) => part.type === "month")?.value ?? "";
            const key = `${year}-${month}`;
            const previous = grouped.get(key)?.value ?? 0;
            grouped.set(key, {
                label: `${month} ${year}`,
                value: previous + point.total,
            });
        });
        return [...grouped.values()].slice(-12);
    }, [stats.daily_appointments]);
    if (loading && !settings)
        return (
            <div
                className="flex min-h-screen items-center justify-center bg-[#f5f7fd]"
                dir="rtl"
            >
                در حال بارگذاری پنل…
            </div>
        );
    const currentNav = navItems.find((item) => item.id === tab);
    return (
        <main
            dir="rtl"
            className="staff-shell min-h-screen w-full max-w-full overflow-x-clip bg-[#f3f5f8] text-slate-800"
        >
            <aside className="fixed inset-y-0 right-0 hidden w-62 flex-col bg-[#18344f] shadow-2xl shadow-slate-900/10 lg:flex">
                {sidebar}
            </aside>
            {mobileMenu && (
                <div className="fixed inset-0 z-50 lg:hidden">
                    <button
                        aria-label="بستن منو"
                        onClick={() => setMobileMenu(false)}
                        className="absolute inset-0 bg-black/40"
                    />
                    <aside className="relative flex h-full w-72 flex-col bg-[#18344f]">
                        {sidebar}
                    </aside>
                </div>
            )}
            <div className="min-w-0 overflow-x-clip lg:mr-62">
                <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200/80 bg-white/88 px-4 backdrop-blur-xl md:px-7">
                    <button
                        aria-label="نمایش منوی پنل"
                        onClick={() => setMobileMenu(true)}
                        className="text-2xl text-primary lg:hidden"
                    >
                        <IoMenuOutline />
                    </button>
                    <div className="min-w-0 flex-1 px-3">
                        <b className="block truncate text-sm text-primary md:text-base">{currentNav?.label ?? "پنل مطب"}</b>
                        <span className="mt-0.5 hidden text-[11px] text-slate-400 sm:block">پنل مطب {settings?.doctor_name ?? clinicInfo.doctorName}</span>
                    </div>
                    <a
                        href="/appointment/"
                        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-primary shadow-sm hover:border-secondary"
                    >
                        مشاهده پنل بیمار
                    </a>
                </header>
                <div className={`min-w-0 ${tab === "consultations" ? "" : "p-4 md:p-7"}`}>
                    {error && (
                        <div className="mb-5 rounded-xl bg-rose-50 p-4 text-sm text-rose-700">
                            {error}
                        </div>
                    )}
                    {tab === "dashboard" && can("dashboard.view") && (
                        <section className="app-panel-enter min-w-0">
                            <div>
                                <span className="text-sm text-secondary-deep">
                                    نمای کلی امروز
                                </span>
                                <h1 className="mt-1 font-dana text-3xl text-primary">
                                    داشبورد مطب
                                </h1>
                            </div>
                            <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                                {can("appointments.view") && (<StatCard
                                    label="نوبت‌های امروز"
                                    value={stats.today_total}
                                    icon={<IoCalendarOutline />}
                                />)}
                                {can("appointments.view") && (<StatCard
                                    label="در انتظار تأیید"
                                    value={stats.pending_total}
                                    icon={<IoTimeOutline />}
                                />)}
                                {can("appointments.view") && (<StatCard
                                    label="تأیید شده"
                                    value={stats.confirmed_total}
                                    icon={<IoCheckmarkCircleOutline />}
                                />)}
                                {can("patients.view") && (<StatCard
                                    label="بیماران ثبت‌شده"
                                    value={stats.patients_total}
                                    icon={<IoPeopleOutline />}
                                />)}
                            </div>
                            <div className="mt-5 grid gap-3 md:grid-cols-3">
                                {can("consultations.view") && (<button
                                    type="button"
                                    disabled={!can(staffTabPermissions["consultations"])}
                                    onClick={() => setTab("consultations")}
                                    className="flex items-center justify-between rounded-2xl border border-sky-100 bg-sky-50/70 p-4 text-right transition hover:bg-sky-50"
                                >
                                    <span><b className="block text-sm text-sky-900">پیام‌های خوانده‌نشده</b><span className="mt-1 block text-xs text-sky-600">پاسخ سریع به بیماران</span></span>
                                    <strong className="text-2xl text-sky-700">{toPersianDigits(stats.unread_conversations)}</strong>
                                </button>)}
                                {can("waitlist.view") && (<button
                                    type="button"
                                    disabled={!can(staffTabPermissions["waitlist"])}
                                    onClick={() => setTab("waitlist")}
                                    className="flex items-center justify-between rounded-2xl border border-amber-100 bg-amber-50/70 p-4 text-right transition hover:bg-amber-50"
                                >
                                    <span><b className="block text-sm text-amber-900">لیست انتظار فعال</b><span className="mt-1 block text-xs text-amber-600">جایگزینی ظرفیت لغوشده</span></span>
                                    <strong className="text-2xl text-amber-700">{toPersianDigits(stats.waitlist_total)}</strong>
                                </button>)}
                                {can("finance.view") ? (
                                    <button
                                        type="button"
                                        onClick={() => setTab("finance")}
                                        className="flex items-center justify-between rounded-2xl border border-rose-100 bg-rose-50/70 p-4 text-right transition hover:bg-rose-50"
                                    >
                                        <span><b className="block text-sm text-rose-900">بازپرداخت نیازمند پیگیری</b><span className="mt-1 block text-xs text-rose-600">تسویه و ثبت شماره پیگیری</span></span>
                                        <strong className="text-2xl text-rose-700">{toPersianDigits(stats.refund_attention_total)}</strong>
                                    </button>
                                ) : can("appointments.view") ? (
                                    <button
                                        type="button"
                                        disabled={!can(staffTabPermissions["calendar"])}
                                    onClick={() => setTab("calendar")}
                                        className="flex items-center justify-between rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4 text-right transition hover:bg-emerald-50"
                                    >
                                        <span><b className="block text-sm text-emerald-900">تقویم کاری</b><span className="mt-1 block text-xs text-emerald-600">مدیریت سریع نوبت‌ها</span></span>
                                        <IoCalendarOutline className="text-2xl text-emerald-700" />
                                    </button>
                                ) : null}
                            </div>
                            {can("appointments.view") && <div className="mt-6 grid gap-5 xl:grid-cols-2">
                                <MiniBarChart
                                    title="نوبت‌های ۱۴ روز اخیر"
                                    points={dailyChart}
                                />
                                <MiniBarChart
                                    title="نوبت‌ها به تفکیک ماه"
                                    points={monthlyChart}
                                />
                            </div>}
                            {can("appointments.view") && <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
                                <div className="flex items-center justify-between">
                                    <h2 className="font-dana text-xl text-primary">
                                        نوبت‌های امروز
                                    </h2>
                                    <button
                                        disabled={!can(staffTabPermissions["appointments"])}
                                    onClick={() => setTab("appointments")}
                                        className="text-sm text-secondary-deep"
                                    >
                                        مشاهده همه
                                    </button>
                                </div>
                                <div className="mt-4 space-y-3">
                                    {todayAppointments.length ? (
                                        todayAppointments
                                            .slice(0, 6)
                                            .map((item) => (
                                                <div
                                                    key={item.id}
                                                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 p-4"
                                                >
                                                    <div>
                                                        <b className="text-primary">
                                                            {item.patient_name}
                                                        </b>
                                                        <span className="mr-3 text-sm text-slate-500">
                                                            {item.service_title}
                                                        </span>
                                                    </div>
                                                    <span className="text-sm">
                                                        ساعت{" "}
                                                        {toPersianDigits(
                                                            formatTime(
                                                                item.start_time,
                                                            ),
                                                        )}
                                                    </span>
                                                </div>
                                            ))
                                    ) : (
                                        <p className="py-8 text-center text-sm text-slate-500">
                                            برای امروز نوبتی ثبت نشده است.
                                        </p>
                                    )}
                                </div>
                            </div>}
                        </section>
                    )}
                    {tab === "appointments" && can("appointments.view") && (
                        <AppointmentsPanel
                            token={token}
                            pageData={appointmentPage}
                            onReload={loadAppointments}
                            onOpenConsultation={(item) =>
                                {
                                    setChatAppointmentId(item.id);
                                    setTab("consultations");
                                }
                            }
                        />
                    )}
                    {tab === "calendar" && can("appointments.view") && (
                        <StaffCalendarPanel
                            token={token}
                            services={services}
                            onChanged={loadAll}
                        />
                    )}
                    {tab === "patients" && can("patients.view") && (
                        <StaffPatientsPanel
                            token={token}
                            onOpenConversation={(appointmentId) => {
                                setChatAppointmentId(appointmentId);
                                setTab("consultations");
                            }}
                        />
                    )}
                    {tab === "consultations" && can("consultations.view") && (
                        <StaffChatWorkspace
                            token={token}
                            threads={consultations}
                            initialAppointmentId={chatAppointmentId}
                            onRefresh={loadConsultations}
                        />
                    )}
                    {tab === "waitlist" && can("waitlist.view") && (
                        <StaffWaitlistPanel
                            token={token}
                            entries={waitlist}
                            onReload={loadOperations}
                        />
                    )}
                    {tab === "clinic-info" && can("settings.view") && settings && (
                        <ClinicInfoPanel
                            token={token}
                            settings={settings}
                            onReload={loadAll}
                        />
                    )}
                    {tab === "schedule" && can("schedule.view") && settings && (
                        <SchedulePanel
                            token={token}
                            settings={settings}
                            exceptions={exceptions}
                            onReload={loadAll}
                        />
                    )}
                    {tab === "services" && can("services.view") && (
                        <ServicesPanel
                            token={token}
                            services={services}
                            onReload={loadAll}
                        />
                    )}
                    {tab === "sms" && can("sms.view") && (
                        <SmsCenterPanel
                            token={token}
                            services={services}
                            rules={smsRules}
                            campaigns={smsCampaigns}
                            outbox={smsOutbox}
                            onReload={loadAll}
                        />
                    )}
                    {tab === "finance" && can("finance.view") && (
                        <StaffFinancePanel
                            token={token}
                            summary={financeSummary}
                            payments={payments}
                            onReload={loadOperations}
                        />
                    )}
                    {tab === "access" && can("roles.manage") && <StaffAccessPanel token={token} currentId={profile.id} />}
                    {!navItems.length && <p className="rounded-2xl border bg-white p-6">دسترسی به بخش‌های فعلی پنل برای این حساب تعریف نشده است. مجوزهای مقاله و محتوا در مراحل بعد فعال می‌شوند.</p>}
                    {tab === "audit" && can("audit.view") && (
                        <StaffAuditPanel items={auditLogs} />
                    )}
                </div>
            </div>
        </main>
    );
};

const StaffPortal = () => {
    const { clinicInfo } = useClinicInfo();
    const [token, setToken] = useState(
        () => browserCsrf("staff") ? STAFF_COOKIE_SESSION : "",
    );
    const [profile, setProfile] = useState<StaffProfile | null>(null);
    const [restoring, setRestoring] = useState(Boolean(token));
    const [logoutError, setLogoutError] = useState("");
    useEffect(() => {
        const expired = () => { setToken(""); setProfile(null); setRestoring(false); };
        window.addEventListener("drz:staff-expired", expired);
        return () => window.removeEventListener("drz:staff-expired", expired);
    }, []);
    useEffect(() => {
        // Remove legacy bearer tokens; browser authentication now stays in HttpOnly cookies.
        localStorage.removeItem(STAFF_TOKEN_KEY);
        localStorage.removeItem(STAFF_PROFILE_KEY);
        if (!token) return;
        let cancelled = false;
        void appointmentApi.staffMe().then((nextProfile) => {
            if (!cancelled) setProfile(nextProfile);
        }).catch(() => {
            if (!cancelled) setToken("");
        }).finally(() => {
            if (!cancelled) setRestoring(false);
        });
        return () => { cancelled = true; };
    }, [token]);
    const logout = useCallback(async () => {
        // Do not report a successful logout while a network failure leaves the server session active.
        try {
            await appointmentApi.logout(STAFF_COOKIE_SESSION);
        } catch (error) {
            setLogoutError(errorMessage(error));
            return;
        }
        setLogoutError("");
        localStorage.removeItem(STAFF_TOKEN_KEY);
        localStorage.removeItem(STAFF_PROFILE_KEY);
        setToken("");
        setProfile(null);
    }, []);
    return (
        <>
            <Seo
                title={`پنل مدیریت نوبت‌ها | ${clinicInfo.doctorName}`}
                description={`پنل داخلی مدیریت نوبت‌های مطب ${clinicInfo.doctorName}`}
                canonical={`${clinicInfo.siteUrl}/staff/`}
                noIndex
            />
            {logoutError && <p role="alert" className="p-4 text-center text-red-700">خروج انجام نشد: {logoutError}</p>}
            {restoring ? <p role="status" className="p-8 text-center">در حال بررسی نشست…</p> : !token || !profile ? (
                <StaffLogin
                    onLogin={(nextToken, nextProfile) => {
                        setToken(nextToken);
                        setProfile(nextProfile);
                    }}
                />
            ) : (
                <StaffPermissionsContext.Provider value={profile.permissions}>
                    <StaffDashboard token={token} profile={profile} onLogout={logout} />
                </StaffPermissionsContext.Provider>
            )}
        </>
    );
};

export default StaffPortal;
