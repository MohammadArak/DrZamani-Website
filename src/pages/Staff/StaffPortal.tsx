/* eslint-disable react-hooks/set-state-in-effect */
import Seo from "@/components/SEO";
import { useClinicInfo } from "@/contexts/ClinicInfoContext";
import useConsultationRealtime from "@/hooks/useConsultationRealtime";
import {
    appointmentApi,
    AppointmentApiError,
    browserCsrf,
    formatTime,
    STAFF_COOKIE_SESSION,
    STAFF_PROFILE_KEY,
    STAFF_TOKEN_KEY,
    toPersianDigits,
    type AppointmentPage,
    type AuditLogItem,
    type ClinicSettings,
    type ConsultationThread,
    type DashboardStats,
    type FinanceSummary,
    type PaymentItem,
    type ScheduleException,
    type Service,
    type SmsAutomationRule,
    type SmsCampaign,
    type SmsOutboxItem,
    type WaitlistEntry
} from "@/services/appointmentApi";
import {
    lazy,
    Suspense,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState
} from "react";
import {
    IoBusinessOutline,
    IoCalendarOutline,
    IoCardOutline,
    IoChatbubblesOutline,
    IoCheckmarkCircleOutline,
    IoGridOutline,
    IoListOutline,
    IoLogOutOutline,
    IoMenuOutline,
    IoPeopleOutline,
    IoSettingsOutline,
    IoShieldCheckmarkOutline,
    IoTimeOutline
} from "react-icons/io5";
import { StaffPermissionsContext,staffTabPermissions } from "./staffAccess";
import StaffAccessPanel from "./StaffAccessPanel";
import StaffChatWorkspace from "./StaffChatWorkspace";
import StaffLogin from "./StaffLogin";
import StaffMfaPanel from "./StaffMfaPanel";
import StaffPasswordPanel from "./StaffPasswordPanel";
import {
    StaffAuditPanel,
    StaffCalendarPanel,
    StaffFinancePanel,
    StaffWaitlistPanel,
} from "./StaffOperationsPanels";
import StaffPatientsPanel from "./StaffPatientsPanel";
import StaffSettingsPanel from "./StaffSettingsPanel";
import { useContentConfirm } from "./useContentConfirm";

import { MiniBarChart,StatCard } from "./StaffDashboardCharts";
import { errorMessage,type StaffProfile,type StaffTab } from "./staffUi";
const AppointmentsPanel = lazy(() => import("./AppointmentsPanel"));
const ClinicInfoPanel = lazy(() => import("./ClinicInfoPanel"));
const SchedulePanel = lazy(() => import("./SchedulePanel"));
const ServicesPanel = lazy(() => import("./ServicesPanel"));
const SmsCenterPanel = lazy(() => import("./SmsCenterPanel"));
const StaffArticlesPanel = lazy(() => import("./StaffArticlesPanel"));
const StaffCommentsPanel = lazy(() => import("./StaffCommentsPanel"));
const StaffSiteServicesPanel = lazy(() => import("./StaffSiteServicesPanel"));
const StaffSiteContentPanel = lazy(() => import("./StaffSiteContentPanel"));
const StaffMediaPanel = lazy(() => import("./StaffMediaPanel"));
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
    const [tab, setTab] = useState<StaffTab>(() => (Object.keys(staffTabPermissions).find(t => can(staffTabPermissions[t])) ?? "account-security") as StaffTab);
    const [articleDirty,setArticleDirty]=useState(false);
    const [articleBusy,setArticleBusy]=useState(false);
    const {ask:askContent,confirmation:contentConfirmation}=useContentConfirm();
    const leaveArticle=async()=>{
        if(articleBusy){setError("ذخیره محتوا در حال انجام است؛ پس از پایان آن خارج شوید.");return false;}
        return !articleDirty||await askContent("تغییرات محتوا هنوز ذخیره نشده‌اند؛ از ویرایش خارج شوید؟");
    };
    const navigateTab=async(next:StaffTab)=>{if(next===tab||await leaveArticle())setTab(next);};
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
            label: "مرکز تنظیمات",
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
        { id: "account-security", label: "امنیت حساب من", icon: <IoShieldCheckmarkOutline /> },
        { id: "comments", label: "نظرات مراجعین", icon: <IoListOutline /> },
        { id: "articles", label: "مقالات و آموزش", icon: <IoListOutline /> },
        { id: "site-services", label: "صفحه‌های خدمات", icon: <IoListOutline /> },
        { id: "site-content", label: "متن‌های صفحه اصلی", icon: <IoListOutline /> },
        { id: "media", label: "رسانه عمومی", icon: <IoListOutline /> },
        { id: "access", label: "نقش‌ها و کارکنان", icon: <IoShieldCheckmarkOutline /> },
    ].filter(item => item.id === "account-security" || can(staffTabPermissions[item.id])) as typeof navItems;
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
                        onClick={async() => {
                            if(item.id!==tab&&!await leaveArticle())return;
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
                    onClick={async()=>{if(await leaveArticle())onLogout();}}
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
            {contentConfirmation}
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
                                    onClick={() => navigateTab("consultations")}
                                    className="flex items-center justify-between rounded-2xl border border-sky-100 bg-sky-50/70 p-4 text-right transition hover:bg-sky-50"
                                >
                                    <span><b className="block text-sm text-sky-900">پیام‌های خوانده‌نشده</b><span className="mt-1 block text-xs text-sky-600">پاسخ سریع به بیماران</span></span>
                                    <strong className="text-2xl text-sky-700">{toPersianDigits(stats.unread_conversations)}</strong>
                                </button>)}
                                {can("waitlist.view") && (<button
                                    type="button"
                                    disabled={!can(staffTabPermissions["waitlist"])}
                                    onClick={() => navigateTab("waitlist")}
                                    className="flex items-center justify-between rounded-2xl border border-amber-100 bg-amber-50/70 p-4 text-right transition hover:bg-amber-50"
                                >
                                    <span><b className="block text-sm text-amber-900">لیست انتظار فعال</b><span className="mt-1 block text-xs text-amber-600">جایگزینی ظرفیت لغوشده</span></span>
                                    <strong className="text-2xl text-amber-700">{toPersianDigits(stats.waitlist_total)}</strong>
                                </button>)}
                                {can("finance.view") ? (
                                    <button
                                        type="button"
                                        onClick={() => navigateTab("finance")}
                                        className="flex items-center justify-between rounded-2xl border border-rose-100 bg-rose-50/70 p-4 text-right transition hover:bg-rose-50"
                                    >
                                        <span><b className="block text-sm text-rose-900">بازپرداخت نیازمند پیگیری</b><span className="mt-1 block text-xs text-rose-600">تسویه و ثبت شماره پیگیری</span></span>
                                        <strong className="text-2xl text-rose-700">{toPersianDigits(stats.refund_attention_total)}</strong>
                                    </button>
                                ) : can("appointments.view") ? (
                                    <button
                                        type="button"
                                        disabled={!can(staffTabPermissions["calendar"])}
                                    onClick={() => navigateTab("calendar")}
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
                                    onClick={() => navigateTab("appointments")}
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
                        <Suspense fallback={<p role="status">در حال آماده‌سازی بخش…</p>}><AppointmentsPanel
                            token={token}
                            pageData={appointmentPage}
                            onReload={loadAppointments}
                            onOpenConsultation={(item) =>
                                {
                                    setChatAppointmentId(item.id);
                                    navigateTab("consultations");
                                }
                            }
                        /></Suspense>
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
                                navigateTab("consultations");
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
                    {tab === "articles" && can("articles.view") && <Suspense fallback={<p>در حال آماده‌سازی ویرایشگر…</p>}><StaffArticlesPanel token={token} onDirtyChange={setArticleDirty} onBusyChange={setArticleBusy} /></Suspense>}
                    {tab === "comments" && can("comments.view") && <Suspense fallback={<p>در حال آماده‌سازی نظرات…</p>}><StaffCommentsPanel token={token} onDirtyChange={setArticleDirty} onBusyChange={setArticleBusy} /></Suspense>}
                    {tab === "site-services" && can("site_services.view") && <Suspense fallback={<p>در حال آماده‌سازی صفحه‌های خدمات…</p>}><StaffSiteServicesPanel token={token} onDirtyChange={setArticleDirty} onBusyChange={setArticleBusy} /></Suspense>}
                    {tab === "site-content" && can("site_content.view") && <Suspense fallback={<p>در حال آماده‌سازی متن‌ها…</p>}><StaffSiteContentPanel token={token} onDirtyChange={setArticleDirty} onBusyChange={setArticleBusy} /></Suspense>}
                    {tab === "media" && can("media.manage") && <Suspense fallback={<p>در حال آماده‌سازی رسانه…</p>}><StaffMediaPanel token={token} /></Suspense>}
                    {tab === "account-security" && <><StaffMfaPanel token={token} /><StaffPasswordPanel token={token} /></>}
                    {tab === "clinic-info" && can("settings.view") && settings && (
                        <StaffSettingsPanel token={token} clinicRevision={settings.revision} onReload={loadAll} clinicPanel={<Suspense fallback={<p role="status">در حال آماده‌سازی بخش…</p>}><ClinicInfoPanel
                            token={token}
                            settings={settings}
                            onReload={loadAll}
                        /></Suspense>} />
                    )}
                    {tab === "schedule" && can("schedule.view") && settings && (
                        <Suspense fallback={<p role="status">در حال آماده‌سازی بخش…</p>}><SchedulePanel
                            token={token}
                            settings={settings}
                            exceptions={exceptions}
                            onReload={loadAll}
                        /></Suspense>
                    )}
                    {tab === "services" && can("services.view") && (
                        <Suspense fallback={<p role="status">در حال آماده‌سازی بخش…</p>}><ServicesPanel
                            token={token}
                            services={services}
                            onReload={loadAll}
                        /></Suspense>
                    )}
                    {tab === "sms" && can("sms.view") && (
                        <Suspense fallback={<p role="status">در حال آماده‌سازی بخش…</p>}><SmsCenterPanel
                            token={token}
                            services={services}
                            rules={smsRules}
                            campaigns={smsCampaigns}
                            outbox={smsOutbox}
                            onReload={loadAll}
                        /></Suspense>
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
