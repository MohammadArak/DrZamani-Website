import {lazy,Suspense} from "react";
/* eslint-disable react-hooks/set-state-in-effect */
import ConsultationDialog from "@/components/ConsultationDialog";
import PatientRescheduleDialog from "@/components/PatientRescheduleDialog";
import ServiceIcon from "@/components/ServiceIcon";
import Toast from "@/components/Toast";
import { buildClinicInfo } from "@/config/clinicInfo";
import { useClinicInfo } from "@/contexts/ClinicInfoContext";
import {
    appointmentApi,
    formatPersianDate,
    formatTime,
    toPersianDigits,
    type Appointment,
    type ClinicSettings,
    type PatientProfile,
    type Service,
    type WaitlistEntry
} from "@/services/appointmentApi";
import {
    useEffect,
    useMemo,
    useState
} from "react";
import {
    IoCalendarOutline,
    IoCallOutline,
    IoChatbubblesOutline,
    IoCheckmarkCircle,
    IoChevronBackOutline,
    IoDocumentTextOutline,
    IoHomeOutline,
    IoLocationOutline,
    IoLogOutOutline,
    IoMedicalOutline,
    IoPersonOutline,
    IoTimeOutline
} from "react-icons/io5";

import AppointmentCard from "./PatientAppointmentCard";
const BookingWizard = lazy(() => import("./PatientBookingWizard"));
const IntakeFormDialog = lazy(() => import("./PatientIntakeDialog"));
import ProfileForm from "./PatientProfileForm";
import { errorMessage } from "./patientUi";
type PortalTab = "home" | "appointments" | "instructions" | "about" | "profile";

const Portal = ({
    token,
    profile,
    clinic,
    services,
    appointments,
    waitlist,
    onProfileSaved,
    onRefresh,
    onLogout,
}: {
    token: string;
    profile: PatientProfile;
    clinic: ClinicSettings;
    services: Service[];
    appointments: Appointment[];
    waitlist: WaitlistEntry[];
    onProfileSaved: (profile: PatientProfile) => void;
    onRefresh: () => Promise<void>;
    onLogout: () => void;
}) => {
    const clinicInfo = useMemo(() => buildClinicInfo(clinic), [clinic]);
    const [tab, setTab] = useState<PortalTab>("home");
    const { clinicInfo: bookingPolicy, refreshClinicInfo } = useClinicInfo();
    const [bookingOpen, setBookingOpen] = useState(false);
    const openBooking = async () => {
        await refreshClinicInfo();
        try {
            const latest = await appointmentApi.getClinic();
            if (latest.booking_enabled !== true) { setMessage(latest.booking_disabled_message || bookingPolicy.bookingDisabledMessage); return; }
            setBookingOpen(true);
        } catch (error) { setMessage(errorMessage(error)); }
    };
    const [message, setMessage] = useState("");
    const [messageKind, setMessageKind] = useState<"success" | "error">(
        "success",
    );
    const [openConsultation, setOpenConsultation] =
        useState<Appointment | null>(null);
    const [rescheduleAppointment, setRescheduleAppointment] =
        useState<Appointment | null>(null);
    const [intakeAppointment, setIntakeAppointment] =
        useState<Appointment | null>(null);
    const activeAppointment = appointments.find((item) =>
        ["pending", "confirmed"].includes(item.status),
    );
    const activeAppointmentsCount = appointments.filter((item) =>
        ["pending", "confirmed"].includes(item.status),
    ).length;
    const activeWaitlistCount = waitlist.filter((item) =>
        ["waiting", "notified"].includes(item.status),
    ).length;

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const payment = params.get("payment");
        if (!payment) return;
        setTab("appointments");
        if (payment === "success") {
            const trackingCode = params.get("tracking_code");
            setMessageKind("success");
            setMessage(
                trackingCode
                    ? `پرداخت موفق بود و نوبت با کد ${trackingCode} ثبت شد.`
                    : "پرداخت موفق بود و نوبت ثبت شد.",
            );
        } else {
            setMessageKind("error");
            setMessage(
                payment === "manual-review"
                    ? "پرداخت انجام شده اما زمان نیاز به بررسی مطب دارد؛ با شما تماس گرفته می‌شود."
                    : payment === "verification-error"
                      ? "نتیجه پرداخت هنوز تأیید نشده است؛ دوباره پرداخت نکنید و برای بررسی با مطب تماس بگیرید."
                      : "پرداخت کامل نشد و نوبتی ثبت نشد.",
            );
        }
        window.history.replaceState({}, "", window.location.pathname);
    }, []);

    const cancel = async (id: number) => {
        if (!window.confirm("از لغو این نوبت مطمئن هستید؟")) return;
        try {
            await appointmentApi.cancelAppointment(token, id);
            setMessageKind("success");
            setMessage("نوبت با موفقیت لغو شد.");
            await onRefresh();
        } catch (cancelError) {
            setMessageKind("error");
            setMessage(errorMessage(cancelError));
        }
    };
    const leaveWaitlist = async (id: number) => {
        try {
            await appointmentApi.leaveWaitlist(token, id);
            setMessageKind("success");
            setMessage("درخواست لیست انتظار لغو شد.");
            await onRefresh();
        } catch (leaveError) {
            setMessageKind("error");
            setMessage(errorMessage(leaveError));
        }
    };
    const takeOffer = async (entry: WaitlistEntry) => {
        if (!entry.offered_date || !entry.offered_start_time) return;
        try {
            const result = await appointmentApi.createAppointment(token, {
                service_id: entry.service_id,
                appointment_date: entry.offered_date,
                start_time: entry.offered_start_time,
                has_previous_visit: appointments.some((item) => item.status === "completed"),
                is_urgent: entry.is_urgent,
            });
            if (result.requires_payment && result.payment_url) {
                window.location.assign(result.payment_url);
                return;
            }
            setMessageKind("success");
            setMessage("این زمان برای شما رزرو شد.");
            await onRefresh();
        } catch (offerError) {
            setMessageKind("error");
            setMessage(errorMessage(offerError));
        }
    };
    const addToCalendar = async (item: Appointment) => {
        try {
            const blob = await appointmentApi.appointmentCalendar(token, item.id);
            const url = URL.createObjectURL(blob);
            const anchor = document.createElement("a");
            anchor.href = url;
            anchor.download = `appointment-${item.tracking_code}.ics`;
            document.body.appendChild(anchor);
            anchor.click();
            anchor.remove();
            URL.revokeObjectURL(url);
            setMessageKind("success");
            setMessage(
                "فایل تقویم آماده شد؛ آن را باز کنید تا نوبت به تقویم گوشی اضافه شود.",
            );
        } catch (calendarError) {
            setMessageKind("error");
            setMessage(errorMessage(calendarError));
        }
    };
    const canPatientReschedule = (item: Appointment) =>
        item.can_patient_reschedule;

    const navItems: Array<{
        id: PortalTab;
        label: string;
        icon: React.ReactNode;
    }> = [
        { id: "home", label: "خانه", icon: <IoHomeOutline /> },
        { id: "appointments", label: "نوبت‌ها", icon: <IoCalendarOutline /> },
        { id: "instructions", label: "راهنمای من", icon: <IoDocumentTextOutline /> },
        { id: "about", label: "درباره ما", icon: <IoMedicalOutline /> },
        { id: "profile", label: "پروفایل", icon: <IoPersonOutline /> },
    ];

    return (
        <main
            dir="rtl"
            className="min-h-screen w-full max-w-full overflow-x-clip bg-[#f3f6f8] pb-28 text-slate-800 md:pb-12"
        >
            <Toast
                message={message}
                kind={messageKind}
                onClose={() => setMessage("")}
            />
            <header className="relative overflow-hidden bg-[linear-gradient(135deg,#112f49_0%,#244f73_65%,#2e6286_100%)] px-4 pb-7 pt-4 text-white md:pb-5 md:pt-5">
                <div className="pointer-events-none absolute -left-24 -top-32 h-72 w-72 rounded-full bg-secondary/15 blur-2xl" />
                <div className="pointer-events-none absolute -bottom-28 right-1/4 h-56 w-56 rounded-full bg-sky-300/10 blur-3xl" />
                <div className="relative mx-auto flex max-w-6xl items-center justify-between">
                    <a href="/">
                        <img
                            src="/img/logo/logo-dark-full.webp"
                            alt={clinicInfo.doctorName}
                            width="560"
                            height="175"
                            className="w-36 sm:w-44 md:w-48"
                        />
                    </a>
                    <button
                        onClick={onLogout}
                        className="flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs text-slate-200 backdrop-blur transition hover:border-secondary hover:text-secondary sm:text-sm"
                    >
                        <IoLogOutOutline /> خروج
                    </button>
                </div>
                <div className="relative mx-auto mt-6 flex max-w-6xl items-center justify-between gap-4 md:mt-5">
                    <div className="min-w-0">
                        <p className="text-xs text-slate-300 sm:text-sm">سلام، خوش آمدید</p>
                        <h1 className="mt-1 truncate font-dana text-2xl sm:text-3xl">
                            {profile.first_name} {profile.last_name}
                        </h1>
                        <p className="mt-2 text-xs text-slate-300">
                            نوبت‌ها، پیام‌های مطب و وضعیت درخواست‌ها در یک صفحه
                        </p>
                    </div>
                    <button
                        type="button"
                        disabled={!bookingPolicy.bookingEnabled} onClick={() => void openBooking()}
                        className="hidden h-12 shrink-0 items-center gap-2 rounded-2xl bg-secondary px-6 font-bold text-primary shadow-lg shadow-black/10 transition hover:-translate-y-0.5 md:inline-flex"
                    >
                        دریافت نوبت <IoChevronBackOutline />
                    </button>
                </div>
                <nav
                    className="relative mx-auto mt-5 hidden max-w-6xl items-center gap-2 rounded-2xl border border-white/10 bg-white/6 p-1.5 backdrop-blur md:flex"
                    aria-label="بخش‌های پنل بیمار"
                >
                    {navItems.map((item) => (
                        <button
                            key={item.id}
                            type="button"
                            onClick={() => setTab(item.id)}
                            className={`min-w-28 rounded-xl px-5 py-2.5 text-sm font-bold transition ${
                                tab === item.id
                                    ? "bg-white text-primary shadow-lg shadow-black/10"
                                    : "text-slate-200 hover:bg-white/10 hover:text-white"
                            }`}
                        >
                            {item.label}
                        </button>
                    ))}
                </nav>
            </header>
            <div className="mx-auto max-w-6xl px-4 pt-5 md:pt-7">
                {tab === "home" && (
                    <section className="app-panel-enter min-w-0 space-y-5">
                        <button
                            type="button"
                            disabled={!bookingPolicy.bookingEnabled} onClick={() => void openBooking()}
                            className="flex w-full items-center justify-between rounded-3xl bg-[linear-gradient(135deg,#d9ad5f,#f1d69e)] p-5 text-right text-primary shadow-lg shadow-secondary/15 transition active:scale-[.99] md:hidden"
                        >
                            <span>
                                <b className="block font-dana text-xl">{bookingPolicy.bookingEnabled ? "دریافت نوبت جدید" : "رزرو آنلاین غیرفعال است"}</b>
                                <span className="mt-1 block text-xs text-primary/70">انتخاب خدمت، تاریخ و ساعت در چند مرحله کوتاه</span>
                            </span>
                            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/55 text-2xl"><IoChevronBackOutline /></span>
                        </button>

                        <div className="grid min-w-0 grid-cols-3 gap-2.5 sm:gap-4">
                            {[
                                { label: "نوبت فعال", value: activeAppointmentsCount, icon: <IoCalendarOutline /> },
                                { label: "لیست انتظار", value: activeWaitlistCount, icon: <IoTimeOutline /> },
                                { label: "کل نوبت‌ها", value: appointments.length, icon: <IoCheckmarkCircle /> },
                            ].map((item) => (
                                <article key={item.label} className="min-w-0 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:flex sm:items-center sm:gap-3 sm:p-4">
                                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary/12 text-xl text-secondary-deep sm:h-11 sm:w-11 sm:shrink-0">{item.icon}</span>
                                    <div className="mt-3 min-w-0 sm:mt-0">
                                        <strong className="block text-xl text-primary sm:text-2xl">{toPersianDigits(item.value)}</strong>
                                        <span className="mt-1 block truncate text-[10px] text-slate-500 sm:text-xs">{item.label}</span>
                                    </div>
                                </article>
                            ))}
                        </div>

                        <div className="grid min-w-0 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
                            <section className="min-w-0 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
                                <div className="flex items-center justify-between gap-3">
                                    <div className="min-w-0">
                                        <span className="text-xs text-secondary-deep">برنامه پیش رو</span>
                                        <h2 className="mt-1 truncate font-dana text-xl text-primary sm:text-2xl">
                                            {activeAppointment ? "نوبت بعدی من" : "نوبت فعالی ندارید"}
                                        </h2>
                                    </div>
                                    <button type="button" onClick={() => setTab("appointments")} className="shrink-0 text-xs font-bold text-secondary-deep sm:text-sm">مشاهده همه</button>
                                </div>
                                {activeAppointment ? (
                                    <div className="mt-5 min-w-0">
                                        <AppointmentCard
                                            item={activeAppointment}
                                            onCancel={cancel}
                                            onOpenChat={setOpenConsultation}
                                            onReschedule={
                                                canPatientReschedule(activeAppointment)
                                                    ? setRescheduleAppointment
                                                    : undefined
                                            }
                                            onAddCalendar={addToCalendar}
                                            onOpenIntake={setIntakeAppointment}
                                        />
                                    </div>
                                ) : (
                                    <div className="mt-5 flex flex-col items-center rounded-2xl bg-slate-50 px-5 py-8 text-center">
                                        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-3xl text-secondary shadow-sm"><IoCalendarOutline /></span>
                                        <p className="mt-4 text-sm leading-7 text-slate-500">اولین زمان مناسب را آنلاین انتخاب کنید؛ نتیجه در همین پنل نمایش داده می‌شود.</p>
                                        <button type="button" disabled={!bookingPolicy.bookingEnabled} onClick={() => void openBooking()} className="mt-5 h-11 rounded-xl bg-primary px-6 text-sm font-bold text-white">دریافت نوبت</button>
                                    </div>
                                )}
                            </section>

                            <aside className="grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-1">
                                <a href={`tel:${clinicInfo.phones.office.value}`} className="group flex min-w-0 items-center gap-4 rounded-2xl border border-secondary/25 bg-secondary/10 p-4 transition hover:border-secondary/50">
                                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-2xl text-secondary-deep shadow-sm"><IoCallOutline /></span>
                                    <span className="min-w-0"><b className="block text-sm text-primary">تماس با مطب</b><span dir="ltr" className="mt-1 block truncate text-right text-xs text-slate-500">{clinicInfo.phones.office.display}</span></span>
                                </a>
                                <div className="flex min-w-0 items-start gap-4 rounded-2xl border border-slate-200 bg-white p-4">
                                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-sky-50 text-2xl text-sky-700"><IoLocationOutline /></span>
                                    <span className="min-w-0"><b className="block text-sm text-primary">آدرس مطب</b><span className="mt-1 block text-xs leading-6 text-slate-500">{clinicInfo.address.full}</span></span>
                                </div>
                                <button type="button" onClick={() => setTab("appointments")} className="flex min-w-0 items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 text-right transition hover:border-secondary/40">
                                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-2xl text-emerald-700"><IoChatbubblesOutline /></span>
                                    <span className="min-w-0"><b className="block text-sm text-primary">گفت‌وگو با مطب</b><span className="mt-1 block text-xs text-slate-500">از داخل نوبت فعال وارد چت شوید</span></span>
                                </button>
                            </aside>
                        </div>

                        <section className="min-w-0 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
                            <div className="flex items-center justify-between gap-3">
                                <div><span className="text-xs text-secondary-deep">رزرو آنلاین</span><h2 className="mt-1 font-dana text-xl text-primary">خدمت‌های قابل رزرو</h2></div>
                                <button type="button" disabled={!bookingPolicy.bookingEnabled} onClick={() => void openBooking()} className="shrink-0 text-xs font-bold text-secondary-deep">مشاهده زمان‌ها</button>
                            </div>
                            <div className="mt-4 grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                {services.slice(0, 6).map((service) => (
                                    <button key={service.id} type="button" disabled={!bookingPolicy.bookingEnabled} onClick={() => void openBooking()} className="flex min-w-0 items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4 text-right transition hover:-translate-y-0.5 hover:border-secondary/40 hover:bg-white hover:shadow-md">
                                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-2xl text-secondary-deep shadow-sm"><ServiceIcon icon={service.icon_key} /></span>
                                        <span className="min-w-0 flex-1"><b className="block truncate text-sm text-primary">{service.title}</b><span className="mt-1 block truncate text-xs text-slate-500">{toPersianDigits(service.duration_minutes)} دقیقه</span></span>
                                        <IoChevronBackOutline className="shrink-0 text-secondary-deep" />
                                    </button>
                                ))}
                            </div>
                        </section>
                    </section>
                )}
                {tab === "appointments" && (
                    <section className="app-panel-enter rounded-4xl bg-white p-5 shadow-sm md:p-8">
                        <div className="flex flex-wrap items-center justify-between gap-4">
                            <div>
                                <span className="text-sm text-secondary-deep">
                                    سوابق و برنامه‌ها
                                </span>
                                <h2 className="mt-1 font-dana text-3xl text-primary">
                                    نوبت‌های من
                                </h2>
                            </div>
                            <button
                                disabled={!bookingPolicy.bookingEnabled} onClick={() => void openBooking()}
                                className="h-11 rounded-xl bg-secondary px-5 font-bold text-white"
                            >
                                نوبت جدید
                            </button>
                        </div>
                        <div className="mt-7 grid gap-4">
                            {appointments.length ? (
                                appointments.map((item) => (
                                    <AppointmentCard
                                        key={item.id}
                                        item={item}
                                        onCancel={cancel}
                                        onOpenChat={setOpenConsultation}
                                        onReschedule={
                                            canPatientReschedule(item)
                                                ? setRescheduleAppointment
                                                : undefined
                                        }
                                        onAddCalendar={addToCalendar}
                                        onOpenIntake={setIntakeAppointment}
                                    />
                                ))
                            ) : (
                                <p className="rounded-2xl bg-slate-50 p-8 text-center text-slate-500">
                                    نوبتی ثبت نشده است.
                                </p>
                            )}
                        </div>
                        {waitlist.some((entry) => ["waiting", "notified"].includes(entry.status)) && (
                            <div className="mt-8 border-t border-slate-100 pt-7">
                                <h3 className="font-dana text-xl text-primary">لیست انتظار من</h3>
                                <div className="mt-4 grid gap-3">
                                    {waitlist
                                        .filter((entry) => ["waiting", "notified"].includes(entry.status))
                                        .map((entry) => (
                                            <article key={entry.id} className={`rounded-2xl border p-4 ${entry.status === "notified" ? "border-amber-200 bg-amber-50" : "border-slate-200 bg-slate-50"}`}>
                                                <div className="flex flex-wrap items-center justify-between gap-3">
                                                    <div>
                                                        <b className="text-primary">{entry.service_title}</b>
                                                        <p className="mt-1 text-xs text-slate-500">
                                                            {entry.status === "notified" && entry.offered_date
                                                                ? `ظرفیت آزاد: ${formatPersianDate(entry.offered_date)} ساعت ${toPersianDigits(formatTime(entry.offered_start_time ?? ""))}`
                                                                : "در انتظار اولین ظرفیت مناسب"}
                                                        </p>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        {entry.status === "notified" && (
                                                            <button type="button" onClick={() => void takeOffer(entry)} className="rounded-xl bg-secondary px-4 py-2 text-xs font-bold text-white">رزرو همین زمان</button>
                                                        )}
                                                        {entry.status === "notified" && (
                                                            <a href={`tel:${clinicInfo.phones.office.value}`} className="rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white">هماهنگی با مطب</a>
                                                        )}
                                                        <button type="button" onClick={() => void leaveWaitlist(entry.id)} className="text-xs text-rose-600">لغو انتظار</button>
                                                    </div>
                                                </div>
                                            </article>
                                        ))}
                                </div>
                            </div>
                        )}
                    </section>
                )}
                {tab === "instructions" && (
                    <section className="app-panel-enter min-w-0 space-y-5">
                        <div>
                            <span className="text-sm text-secondary-deep">آمادگی و پیگیری مراجعه</span>
                            <h2 className="mt-1 font-dana text-3xl text-primary">راهنمای من</h2>
                            <p className="mt-2 text-sm leading-7 text-slate-500">کارهای قبل از مراجعه و راهنمای عمومی پس از آن برای هر خدمت در این بخش قرار می‌گیرد.</p>
                        </div>
                        {appointments
                            .filter((item) => item.status !== "cancelled")
                            .map((item) => {
                                const completed = item.status === "completed";
                                const instructions = completed
                                    ? item.post_visit_instructions
                                    : item.pre_visit_instructions;
                                return (
                                    <article key={item.id} className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                                        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4 sm:p-5">
                                            <div className="flex min-w-0 items-start gap-3">
                                                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-secondary/10 text-2xl text-secondary-deep"><ServiceIcon icon={item.service_icon_key} /></span>
                                                <span className="min-w-0"><b className="block truncate text-primary">{item.service_title}</b><span className="mt-1 block text-xs text-slate-400">{formatPersianDate(item.appointment_date)} · ساعت {toPersianDigits(formatTime(item.start_time))}</span></span>
                                            </div>
                                            <span className={`rounded-full px-3 py-1 text-xs ${completed ? "bg-emerald-50 text-emerald-700" : "bg-sky-50 text-sky-700"}`}>{completed ? "راهنمای پس از مراجعه" : "آمادگی قبل از مراجعه"}</span>
                                        </header>
                                        <div className="p-4 sm:p-5">
                                            {instructions ? (
                                                <p className="whitespace-pre-line text-sm leading-8 text-slate-600">{instructions}</p>
                                            ) : (
                                                <p className="rounded-2xl bg-slate-50 p-4 text-sm leading-7 text-slate-500">برای این خدمت هنوز راهنمای اختصاصی ثبت نشده است. در صورت نیاز با مطب تماس بگیرید.</p>
                                            )}
                                            {!completed && item.intake_required && (
                                                <div className={`mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl p-4 ${item.intake_completed ? "bg-emerald-50" : "bg-amber-50"}`}>
                                                    <span className={`text-sm font-bold ${item.intake_completed ? "text-emerald-800" : "text-amber-900"}`}>{item.intake_completed ? "فرم قبل از مراجعه تکمیل شده است" : "فرم قبل از مراجعه هنوز تکمیل نشده است"}</span>
                                                    <button type="button" onClick={() => setIntakeAppointment(item)} className={`rounded-xl px-4 py-2 text-xs font-bold ${item.intake_completed ? "bg-white text-emerald-700" : "bg-primary text-white"}`}>{item.intake_completed ? "مشاهده فرم" : "تکمیل فرم"}</button>
                                                </div>
                                            )}
                                        </div>
                                    </article>
                                );
                            })}
                        {!appointments.some((item) => item.status !== "cancelled") && (
                            <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center"><IoDocumentTextOutline className="mx-auto text-5xl text-secondary" /><p className="mt-4 text-sm text-slate-500">بعد از ثبت نوبت، راهنمای همان خدمت اینجا نمایش داده می‌شود.</p></div>
                        )}
                    </section>
                )}
                {tab === "about" && (
                    <section className="app-panel-enter overflow-hidden rounded-4xl bg-white shadow-sm">
                        <div className="h-52 md:h-82 overflow-hidden bg-gray-100">
                            <img
                                src="/img/zamani/dr-zamani-op-2.webp"
                                alt={`${clinicInfo.doctorName} در اتاق عمل`}
                                className="h-full w-full object-cover"
                                style={{ objectPosition: "top" }}
                                fetchPriority="high"
                            />
                        </div>
                        <div className="p-6 md:p-9">
                            <span className="text-sm text-secondary-deep">
                                درباره ما
                            </span>
                            <h2 className="mt-2 font-dana text-3xl text-primary">
                                {clinic.doctor_name}
                            </h2>
                            <p className="mt-2 text-lg text-slate-500">
                                {clinic.specialty}
                            </p>
                            {clinic.medical_council_number && (
                                <p className="mt-4 text-sm">
                                    شماره نظام پزشکی:{" "}
                                    {toPersianDigits(
                                        clinic.medical_council_number,
                                    )}
                                </p>
                            )}
                            <p className="mt-6 max-w-4xl text-sm leading-8 text-slate-600 sm:text-base">
                                در ارزیابی هر مراجعه، علاوه بر ظاهر و تناسب اجزای صورت،
                                وضعیت تنفس، سابقه پزشکی، نیاز درمانی و انتظار واقع‌بینانه
                                بیمار هم بررسی می‌شود تا مسیر مناسب با توضیح شفاف و تصمیم‌گیری
                                مشترک انتخاب شود.
                            </p>

                            <div className="mt-7 grid gap-3 md:grid-cols-3">
                                {[
                                    {
                                        title: "ارزیابی همه‌جانبه",
                                        description: "بررسی هم‌زمان ساختار بینی، تناسب صورت و شرایط عملکردی پیش از پیشنهاد درمان.",
                                        icon: <IoMedicalOutline />,
                                    },
                                    {
                                        title: "برنامه اختصاصی",
                                        description: "انتخاب مسیر مراجعه و درمان بر اساس نیاز، شرایط پزشکی و اولویت‌های هر بیمار.",
                                        icon: <IoPersonOutline />,
                                    },
                                    {
                                        title: "همراهی درمانی",
                                        description: "ارائه راهنمای قبل از مراجعه و پیگیری مرحله‌به‌مرحله پس از دریافت خدمت.",
                                        icon: <IoDocumentTextOutline />,
                                    },
                                ].map((item) => (
                                    <article
                                        key={item.title}
                                        className="rounded-3xl border border-slate-200 bg-slate-50/70 p-5"
                                    >
                                        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-secondary/15 text-2xl text-secondary-deep">
                                            {item.icon}
                                        </span>
                                        <b className="mt-4 block text-primary">{item.title}</b>
                                        <p className="mt-2 text-xs leading-7 text-slate-500">
                                            {item.description}
                                        </p>
                                    </article>
                                ))}
                            </div>

                            {clinic.address && (
                                <div className="mt-6 flex items-start gap-3 rounded-3xl border border-slate-200 bg-white p-4 sm:p-5">
                                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/7 text-xl text-primary">
                                        <IoLocationOutline />
                                    </span>
                                    <div>
                                        <b className="text-sm text-primary">نشانی مطب</b>
                                        <p className="mt-1 text-sm leading-7 text-slate-500">
                                            {clinic.address}
                                        </p>
                                    </div>
                                </div>
                            )}

                            <a
                                href="/"
                                className="mt-7 inline-flex items-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-bold text-white transition hover:bg-primary-mild"
                            >
                                مشاهده خدمات، مطالب و نمونه‌کارها <IoChevronBackOutline />
                            </a>
                        </div>
                    </section>
                )}
                {tab === "profile" && (
                    <section className="app-panel-enter rounded-4xl bg-white p-5 shadow-sm md:p-8">
                        <div className="mb-7">
                            <span className="text-sm text-secondary-deep">
                                اطلاعات حساب
                            </span>
                            <h2 className="mt-1 font-dana text-3xl text-primary">
                                پروفایل من
                            </h2>
                            <p
                                dir="ltr"
                                className="mt-2 text-right text-sm text-slate-500"
                            >
                                {profile.phone}
                            </p>
                        </div>
                        <ProfileForm
                            embedded
                            profile={profile}
                            onSaved={(saved) => {
                                onProfileSaved(saved);
                                setMessageKind("success");
                                setMessage("اطلاعات پروفایل ذخیره شد.");
                            }}
                        />
                    </section>
                )}
            </div>
            <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-2 py-2 shadow-[0_-10px_30px_rgba(15,23,42,0.08)] backdrop-blur md:hidden">
                <div className="mx-auto flex max-w-xl justify-around">
                    {navItems.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => setTab(item.id)}
                            className={`flex min-w-14 flex-col items-center gap-1 rounded-xl px-1 py-2 text-[10px] transition sm:text-xs ${tab === item.id ? "bg-secondary/15 text-secondary-deep" : "text-slate-500"}`}
                        >
                            <span className="text-2xl">{item.icon}</span>
                            {item.label}
                        </button>
                    ))}
                </div>
            </nav>
            {bookingOpen && bookingPolicy.bookingEnabled && (
                <Suspense fallback={<p role="status">در حال آماده‌سازی سامانه…</p>}><BookingWizard
                    token={token}
                    services={services}
                    onClose={() => setBookingOpen(false)}
                    onBooked={async (item) => {
                        setBookingOpen(false);
                        setTab("appointments");
                        setMessageKind("success");
                        setMessage(
                            `نوبت با کد پیگیری ${item.tracking_code} ثبت شد.`,
                        );
                        await onRefresh();
                    }}
                /></Suspense>
            )}
            {openConsultation && (
                <ConsultationDialog
                    token={token}
                    appointmentId={openConsultation.id}
                    title={openConsultation.service_title}
                    role="patient"
                    imageRequirements={openConsultation.image_requirements}
                    onClose={() => setOpenConsultation(null)}
                />
            )}
            {rescheduleAppointment && (
                <PatientRescheduleDialog
                    token={token}
                    appointment={rescheduleAppointment}
                    clinic={clinic}
                    onClose={() => setRescheduleAppointment(null)}
                    onRescheduled={async (updated) => {
                        setRescheduleAppointment(null);
                        setMessageKind("success");
                        setMessage(
                            `زمان نوبت ${updated.tracking_code} تغییر کرد و برای تأیید مطب ارسال شد.`,
                        );
                        await onRefresh();
                    }}
                />
            )}
            {intakeAppointment && (
                <Suspense fallback={<p role="status">در حال آماده‌سازی سامانه…</p>}><IntakeFormDialog
                    token={token}
                    appointment={intakeAppointment}
                    onClose={() => setIntakeAppointment(null)}
                    onSaved={async (updated) => {
                        setIntakeAppointment(null);
                        setMessageKind("success");
                        setMessage(`فرم قبل از مراجعه نوبت ${updated.tracking_code} ذخیره شد.`);
                        await onRefresh();
                    }}
                /></Suspense>
            )}
        </main>
    );
};


export default Portal;
