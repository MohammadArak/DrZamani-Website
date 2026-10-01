import BotProtection, { type BotHandle } from "@/components/BotProtection";
/* eslint-disable react-hooks/set-state-in-effect */
import Seo from "@/components/SEO";
import AppSelect from "@/components/AppSelect";
import AvailabilityCalendar from "@/components/AvailabilityCalendar";
import ConsultationDialog from "@/components/ConsultationDialog";
import JalaliDatePicker from "@/components/JalaliDatePicker";
import PatientRescheduleDialog from "@/components/PatientRescheduleDialog";
import ServiceIcon from "@/components/ServiceIcon";
import Toast from "@/components/Toast";
import { buildClinicInfo } from "@/config/clinicInfo";
import { useClinicInfo } from "@/contexts/ClinicInfoContext";
import {
    AppointmentApiError,
    PATIENT_TOKEN_KEY,
    PATIENT_COOKIE_SESSION,
    browserCsrf,
    appointmentApi,
    formatPersianDate,
    formatTime,
    formatToman,
    toPersianDigits,
    type Appointment,
    type AvailableDate,
    type AvailableSlot,
    type ClinicSettings,
    type PatientProfile,
    type PatientProfilePayload,
    type Service,
    type WaitlistEntry,
} from "@/services/appointmentApi";
import {
    IoArrowForward,
    IoCalendarClearOutline,
    IoCalendarOutline,
    IoCallOutline,
    IoChatbubblesOutline,
    IoCheckmarkCircle,
    IoChevronBackOutline,
    IoCloseOutline,
    IoDocumentTextOutline,
    IoHomeOutline,
    IoLocationOutline,
    IoLogOutOutline,
    IoMedicalOutline,
    IoPersonOutline,
    IoSwapHorizontalOutline,
    IoTimeOutline,
} from "react-icons/io5";
import {
    useEffect,
    useMemo,
    useRef,
    useState,
    type FormEvent,
    type KeyboardEvent,
} from "react";

const inputClass =
    "h-13 w-full rounded-2xl border border-slate-200 bg-white px-4 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-secondary focus:ring-4 focus:ring-secondary/10";
const genderOptions = [
    { value: "female", label: "خانم" },
    { value: "male", label: "آقا" },
];

const errorMessage = (error: unknown) =>
    error instanceof Error ? error.message : "در انجام درخواست خطایی رخ داد";

const normalizeDigits = (value: string) =>
    value.replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)));

const statusLabels: Record<
    Appointment["status"],
    { label: string; className: string }
> = {
    pending: {
        label: "در انتظار تأیید",
        className: "bg-amber-50 text-amber-700",
    },
    confirmed: {
        label: "تأیید شده",
        className: "bg-emerald-50 text-emerald-700",
    },
    completed: { label: "انجام شده", className: "bg-blue-50 text-blue-700" },
    cancelled: { label: "لغو شده", className: "bg-rose-50 text-rose-700" },
};

const LoadingScreen = () => (
    <div
        className="flex min-h-screen items-center justify-center bg-[#f5f7fd]"
        dir="rtl"
    >
        <div className="text-center">
            <div className="mx-auto mb-5 h-12 w-12 animate-spin rounded-full border-4 border-secondary/25 border-t-secondary" />
            <p className="text-slate-600">در حال اتصال به سامانه نوبت‌دهی…</p>
        </div>
    </div>
);

const AuthShell = ({ children }: { children: React.ReactNode }) => {
    const { clinicInfo } = useClinicInfo();

    return (
    <main
        dir="rtl"
        className="min-h-screen bg-[radial-gradient(circle_at_top_right,rgba(213,171,100,0.2),transparent_35%),linear-gradient(145deg,#0e192c,#293241)] px-4 py-8 text-slate-800 md:py-8"
    >
        <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-5xl overflow-hidden rounded-4xl bg-white shadow-2xl shadow-black/20 md:grid-cols-[0.9fr_1.1fr]">
            <section className="relative hidden overflow-hidden bg-primary p-10 text-white md:flex md:flex-col md:justify-between">
                <div className="absolute -left-16 -top-16 h-64 w-64 rounded-full bg-secondary/20 blur-2xl" />
                <a href="/" className="relative inline-flex w-fit self-center">
                    <img
                        src="/img/logo/logo-dark-full.webp"
                        alt={clinicInfo.doctorName}
                        className="w-72 "
                    />
                </a>
                <div className="relative">
                    <span className="mb-4 inline-flex rounded-full border border-secondary/50 bg-secondary/10 px-4 py-1 text-sm text-secondary-mild">
                        سامانه نوبت‌دهی مطب {clinicInfo.doctorName}
                    </span>
                    <h1 className="font-dana text-4xl leading-normal">
                        رزرو نوبت، بدون تماس و انتظار
                    </h1>
                    <p className="mt-5 leading-8 text-slate-300">
                        با وارد کردن مشخصات خود بسیار سریع نوبت مورد نظر خود را
                        دریافت کنید
                    </p>
                </div>
                <p className="relative text-sm text-slate-400">
                    اطلاعات شما فقط برای هماهنگی و ارائه خدمات درمانی استفاده
                    می‌شود.
                </p>
            </section>
            <section className="flex min-w-0 items-center p-5 sm:p-6 md:p-12">
                {children}
            </section>
        </div>
    </main>
    );
};

const OtpInput = ({
    value,
    onChange,
    length,
}: {
    value: string;
    onChange: (value: string) => void;
    length: number;
}) => {
    const refs = useRef<(HTMLInputElement | null)[]>([]);
    const update = (index: number, rawValue: string) => {
        const digit = normalizeDigits(rawValue).replace(/\D/g, "").slice(-1);
        const next = value.padEnd(length, " ").split("");
        next[index] = digit || " ";
        onChange(next.join("").trimEnd());
        if (digit && index < length - 1) refs.current[index + 1]?.focus();
    };
    const onKeyDown = (
        event: KeyboardEvent<HTMLInputElement>,
        index: number,
    ) => {
        if (event.key === "Backspace" && !value[index] && index > 0)
            refs.current[index - 1]?.focus();
    };
    return (
        <div
            dir="ltr"
            className="grid w-full min-w-0 gap-1.5 sm:flex sm:justify-center sm:gap-2"
            style={{ gridTemplateColumns: `repeat(${length}, minmax(0, 1fr))` }}
        >
            {Array.from({ length }, (_, index) => (
                <input
                    key={index}
                    ref={(node) => {
                        refs.current[index] = node;
                    }}
                    value={value[index] ?? ""}
                    onChange={(event) => update(index, event.target.value)}
                    onKeyDown={(event) => onKeyDown(event, index)}
                    onPaste={(event) => {
                        event.preventDefault();
                        const pasted = normalizeDigits(
                            event.clipboardData.getData("text"),
                        )
                            .replace(/\D/g, "")
                            .slice(0, length);
                        onChange(pasted);
                        refs.current[
                            Math.min(pasted.length, length) - 1
                        ]?.focus();
                    }}
                    inputMode="numeric"
                    autoComplete={index === 0 ? "one-time-code" : "off"}
                    aria-label={`رقم ${index + 1} کد تأیید`}
                    className="h-13 min-w-0 w-full rounded-xl border border-slate-200 text-center text-lg font-bold outline-none transition focus:border-secondary focus:ring-4 focus:ring-secondary/10 sm:h-14 sm:w-14 sm:text-xl"
                />
            ))}
        </div>
    );
};

const Login = ({
    onAuthenticated,
}: {
    onAuthenticated: (token: string) => void;
}) => {
    const bot = useRef<BotHandle>(null);
    const resendBot = useRef<BotHandle>(null);
    const [stage, setStage] = useState<"phone" | "otp">("phone");
    const [phone, setPhone] = useState("");
    const [code, setCode] = useState("");
    const [debugOtp, setDebugOtp] = useState("");
    const [codeLength, setCodeLength] = useState(6);
    const [cooldown, setCooldown] = useState(0);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        if (!cooldown) return;
        const timer = window.setInterval(
            () => setCooldown((value) => Math.max(0, value - 1)),
            1000,
        );
        return () => window.clearInterval(timer);
    }, [cooldown]);

    const requestCode = async (event?: FormEvent) => {
        event?.preventDefault();
        setBusy(true);
        setError("");
        try {
            const activeBot = stage === "phone" ? bot : resendBot;
            const result = await appointmentApi.requestOtp(phone, await activeBot.current?.proof());
            setStage("otp");
            setCooldown(result.retry_after_seconds);
            setDebugOtp(result.debug_otp ?? "");
            setCodeLength(result.code_length ?? 6);
            setCode("");
        } catch (requestError) {
            setError(errorMessage(requestError));
            (stage === "phone" ? bot : resendBot).current?.retry(requestError);
            if (
                requestError instanceof AppointmentApiError &&
                requestError.retryAfter
            ) {
                setCooldown(requestError.retryAfter);
            }
        } finally {
            setBusy(false);
        }
    };

    const verifyCode = async (event: FormEvent) => {
        event.preventDefault();
        setBusy(true);
        setError("");
        try {
            await appointmentApi.verifyOtp(
                phone,
                code.replace(/\D/g, ""),
                await bot.current?.proof(),
            );
            localStorage.removeItem(PATIENT_TOKEN_KEY);
            onAuthenticated(PATIENT_COOKIE_SESSION);
        } catch (verifyError) {
            setError(errorMessage(verifyError));
            bot.current?.retry(verifyError);
        } finally {
            setBusy(false);
        }
    };

    return (
        <AuthShell>
            <div className="mx-auto flex w-full min-w-0 max-w-md flex-col">
                <a
                    href="/"
                    className="mb-10 inline-flex items-center gap-2 text-sm text-slate-500 hover:text-primary md:hidden"
                >
                    <IoArrowForward /> بازگشت به سایت
                </a>
                <span className="text-sm text-secondary-deep">
                    ورود و ثبت‌ نام
                </span>
                <h2 className="mt-2 font-dana text-3xl text-primary">
                    {stage === "phone"
                        ? "شماره موبایل خود را وارد کنید"
                        : "کد تأیید را وارد کنید"}
                </h2>
                <p className="mt-4 leading-7 text-slate-500">
                    {stage === "phone"
                        ? "برای ساخت حساب یا ورود، کد یک‌بارمصرف برای شما ارسال می‌شود."
                        : `کد ${toPersianDigits(String(codeLength))} رقمی به ${toPersianDigits(phone)} ارسال شد.`}
                </p>

                {error && (
                    <div
                        role="alert"
                        className="mt-5 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700"
                    >
                        {error}
                    </div>
                )}
                {debugOtp && (
                    <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                        فقط در حالت توسعه: کد آزمایشی{" "}
                        <b dir="ltr">{debugOtp}</b>
                    </div>
                )}

                {stage === "phone" ? (
                    <form onSubmit={requestCode} className="mt-7 space-y-5">
                        <BotProtection ref={bot} operation="otp_request" />
                        <label className="block">
                            <span className="mb-2 block text-sm text-slate-600">
                                شماره موبایل
                            </span>
                            <input
                                dir="ltr"
                                value={phone}
                                onChange={(event) =>
                                    setPhone(event.target.value)
                                }
                                className={`${inputClass} text-left`}
                                inputMode="tel"
                                autoComplete="tel"
                                placeholder="0912 000 0000"
                                required
                            />
                        </label>
                        <button
                            disabled={busy}
                            className="h-13 w-full rounded-2xl bg-secondary font-bold text-primary shadow-lg shadow-secondary/20 transition hover:bg-secondary-mild disabled:opacity-60"
                        >
                            {busy ? "در حال ارسال…" : "ارسال کد تأیید"}
                        </button>
                    </form>
                ) : (
                    <form onSubmit={verifyCode} className="mt-7 space-y-5">
                        <OtpInput value={code} onChange={setCode} length={codeLength} />
                        <BotProtection ref={bot} operation="otp_verify" />
                        <button
                            disabled={
                                busy || code.replace(/\D/g, "").length !== codeLength
                            }
                            className="h-13 w-full rounded-2xl bg-secondary font-bold text-primary shadow-lg shadow-secondary/20 transition hover:bg-secondary-mild disabled:opacity-50"
                        >
                            {busy ? "در حال بررسی…" : "تأیید و ادامه"}
                        </button>
                        {!cooldown && <BotProtection ref={resendBot} operation="otp_request" />}
                        <div className="flex items-center justify-between text-sm">
                            <button
                                type="button"
                                onClick={() => setStage("phone")}
                                className="text-slate-500 hover:text-primary"
                            >
                                تغییر شماره
                            </button>
                            <button
                                type="button"
                                disabled={Boolean(cooldown) || busy}
                                onClick={() => requestCode()}
                                className="text-secondary-deep disabled:text-slate-400"
                            >
                                {cooldown
                                    ? `ارسال مجدد تا ${toPersianDigits(cooldown)} ثانیه`
                                    : "ارسال مجدد کد"}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </AuthShell>
    );
};

const ProfileForm = ({
    profile,
    onSaved,
    embedded = false,
}: {
    profile: PatientProfile;
    onSaved: (profile: PatientProfile) => void;
    embedded?: boolean;
}) => {
    const [form, setForm] = useState<PatientProfilePayload>({
        first_name: profile.first_name ?? "",
        last_name: profile.last_name ?? "",
        birth_date_jalali: profile.birth_date_jalali ?? "",
        email: profile.email,
        gender: profile.gender === "male" ? "male" : "female",
        national_id: profile.national_id,
        is_foreign_national: profile.is_foreign_national,
        foreign_identifier: profile.foreign_identifier,
    });
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const token = PATIENT_COOKIE_SESSION;
    const setField = <K extends keyof PatientProfilePayload>(
        field: K,
        value: PatientProfilePayload[K],
    ) => setForm((current) => ({ ...current, [field]: value }));

    const submit = async (event: FormEvent) => {
        event.preventDefault();
        setBusy(true);
        setError("");
        try {
            const saved = await appointmentApi.updateMe(token, {
                ...form,
                birth_date_jalali: normalizeDigits(form.birth_date_jalali),
                national_id: form.national_id
                    ? normalizeDigits(form.national_id)
                    : null,
                email: form.email || null,
            });
            onSaved(saved);
        } catch (saveError) {
            setError(errorMessage(saveError));
        } finally {
            setBusy(false);
        }
    };

    const content = (
        <div className="mx-auto w-full max-w-xl py-4">
            <span className="text-sm text-secondary-deep">
                {embedded ? "ویرایش حساب" : "مرحله پایانی ثبت‌نام"}
            </span>
            <h2 className="mt-2 font-dana text-3xl text-primary">
                {embedded ? "اطلاعات کاربری" : "تکمیل اطلاعات کاربری"}
            </h2>
            <p className="mt-3 text-sm leading-7 text-slate-500">
                اطلاعات زیر برای تشکیل و به‌روزرسانی پرونده نوبت‌دهی استفاده
                می‌شود.
            </p>
            {error && (
                <div
                    role="alert"
                    className="mt-5 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700"
                >
                    {error}
                </div>
            )}
            <form onSubmit={submit} className="mt-7 grid gap-4 sm:grid-cols-2">
                <label>
                    <span className="mb-2 block text-sm">نام</span>
                    <input
                        className={inputClass}
                        value={form.first_name}
                        onChange={(e) => setField("first_name", e.target.value)}
                        required
                    />
                </label>
                <label>
                    <span className="mb-2 block text-sm">نام خانوادگی</span>
                    <input
                        className={inputClass}
                        value={form.last_name}
                        onChange={(e) => setField("last_name", e.target.value)}
                        required
                    />
                </label>
                <label>
                    <span className="mb-2 block text-sm">تاریخ تولد شمسی</span>
                    <JalaliDatePicker
                        value={form.birth_date_jalali}
                        onChange={(value) =>
                            setField("birth_date_jalali", value)
                        }
                        output="jalali"
                        placeholder="انتخاب تاریخ تولد"
                        required
                    />
                </label>
                <label>
                    <span className="mb-2 block text-sm">جنسیت</span>
                    <AppSelect
                        value={form.gender}
                        onChange={(value) =>
                            setField(
                                "gender",
                                value as PatientProfilePayload["gender"],
                            )
                        }
                        options={genderOptions}
                        ariaLabel="جنسیت"
                        buttonClassName="h-13 rounded-2xl px-4"
                    />
                </label>
                <label className="sm:col-span-2">
                    <span className="mb-2 block text-sm">ایمیل (اختیاری)</span>
                    <input
                        type="email"
                        dir="ltr"
                        className={`${inputClass} text-left`}
                        value={form.email ?? ""}
                        onChange={(e) => setField("email", e.target.value)}
                        placeholder="name@example.com"
                    />
                </label>
                <label className="sm:col-span-2 flex cursor-pointer items-center justify-between rounded-2xl bg-slate-50 px-4 py-4">
                    <span>
                        <b className="block text-sm text-slate-700">
                            اتباع خارجی هستم
                        </b>
                        <span className="mt-1 block text-xs text-slate-500">
                            در این حالت به جای کد ملی، شناسه اتباع ثبت می‌شود.
                        </span>
                    </span>
                    <input
                        type="checkbox"
                        className="h-5 w-5 accent-secondary"
                        checked={form.is_foreign_national}
                        onChange={(e) =>
                            setField("is_foreign_national", e.target.checked)
                        }
                    />
                </label>
                <label className="sm:col-span-2">
                    <span className="mb-2 block text-sm">
                        {form.is_foreign_national ? "شناسه اتباع" : "کد ملی"}
                    </span>
                    <input
                        dir="ltr"
                        inputMode="numeric"
                        className={`${inputClass} text-left`}
                        value={
                            form.is_foreign_national
                                ? (form.foreign_identifier ?? "")
                                : (form.national_id ?? "")
                        }
                        onChange={(e) =>
                            setField(
                                form.is_foreign_national
                                    ? "foreign_identifier"
                                    : "national_id",
                                e.target.value,
                            )
                        }
                        required
                    />
                </label>
                <button
                    disabled={busy}
                    className="mt-2 h-13 rounded-2xl bg-secondary font-bold text-white transition hover:bg-secondary-mild disabled:opacity-60 sm:col-span-2"
                >
                    {busy ? "در حال ثبت…" : "ثبت اطلاعات"}
                </button>
            </form>
        </div>
    );

    return embedded ? content : <AuthShell>{content}</AuthShell>;
};

const IntakeFormDialog = ({
    token,
    appointment,
    onClose,
    onSaved,
}: {
    token: string;
    appointment: Appointment;
    onClose: () => void;
    onSaved: (appointment: Appointment) => void;
}) => {
    const [answers, setAnswers] = useState<Record<string, string | boolean>>(
        () => ({ ...(appointment.intake_submission?.answers ?? {}) }),
    );
    const [acceptedConsents, setAcceptedConsents] = useState<string[]>(
        () => [...(appointment.intake_submission?.accepted_consents ?? [])],
    );
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const submit = async (event: FormEvent) => {
        event.preventDefault();
        setBusy(true);
        setError("");
        try {
            onSaved(
                await appointmentApi.submitAppointmentIntake(token, appointment.id, {
                    answers,
                    accepted_consents: acceptedConsents,
                }),
            );
        } catch (submitError) {
            setError(errorMessage(submitError));
        } finally {
            setBusy(false);
        }
    };
    return (
        <div className="fixed inset-0 z-110 overflow-y-auto bg-slate-950/55 p-0 backdrop-blur-sm sm:p-5" dir="rtl">
            <div className="mx-auto flex min-h-full max-w-3xl items-center justify-center">
                <form onSubmit={submit} className="min-h-screen w-full overflow-hidden bg-[#f7f9fb] shadow-2xl sm:min-h-0 sm:rounded-4xl">
                    <header className="sticky top-0 z-10 flex items-center justify-between gap-4 bg-[linear-gradient(135deg,#173c5b,#2f6387)] px-4 py-4 text-white sm:px-6">
                        <div className="min-w-0">
                            <span className="text-xs text-secondary">فرم قبل از مراجعه</span>
                            <h2 className="mt-1 truncate font-dana text-xl">{appointment.service_title}</h2>
                        </div>
                        <button type="button" onClick={onClose} aria-label="بستن" className="rounded-xl p-2 transition hover:bg-white/10">
                            <IoCloseOutline size={26} />
                        </button>
                    </header>
                    <div className="space-y-6 p-4 sm:p-6">
                        <div className="rounded-2xl border border-sky-100 bg-sky-50 p-4 text-xs leading-6 text-sky-800">
                            اطلاعات را دقیق وارد کنید. این پاسخ‌ها محرمانه‌اند و فقط برای آماده‌سازی مراجعه در اختیار مطب قرار می‌گیرند.
                        </div>
                        {error && <div role="alert" className="rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>}
                        {appointment.intake_form.questions.length > 0 && (
                            <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                                <h3 className="font-dana text-lg text-primary">شرح‌حال قبل از مراجعه</h3>
                                <div className="mt-5 space-y-5">
                                    {appointment.intake_form.questions.map((question) => (
                                        <label key={question.key} className="block text-sm font-medium leading-7 text-slate-700">
                                            <span>{question.label}{question.is_required && <span className="mr-1 text-rose-500">*</span>}</span>
                                            {question.field_type === "long_text" ? (
                                                <textarea
                                                    value={String(answers[question.key] ?? "")}
                                                    onChange={(event) => setAnswers((current) => ({ ...current, [question.key]: event.target.value }))}
                                                    rows={4}
                                                    maxLength={4000}
                                                    className="mt-2 w-full resize-y rounded-2xl border border-slate-200 bg-white p-3 text-sm font-normal leading-7 outline-none transition focus:border-secondary focus:ring-4 focus:ring-secondary/10"
                                                    placeholder="پاسخ خود را بنویسید"
                                                />
                                            ) : question.field_type === "yes_no" ? (
                                                <AppSelect
                                                    value={answers[question.key] === true ? "true" : answers[question.key] === false ? "false" : ""}
                                                    onChange={(value) =>
                                                        setAnswers((current) => {
                                                            const next = { ...current };
                                                            if (value === "") delete next[question.key];
                                                            else next[question.key] = value === "true";
                                                            return next;
                                                        })
                                                    }
                                                    options={[
                                                        { value: "", label: "انتخاب کنید" },
                                                        { value: "true", label: "بله" },
                                                        { value: "false", label: "خیر" },
                                                    ]}
                                                    ariaLabel={question.label}
                                                    className="mt-2 font-normal"
                                                />
                                            ) : question.field_type === "single_choice" ? (
                                                <AppSelect
                                                    value={String(answers[question.key] ?? "")}
                                                    onChange={(value) => setAnswers((current) => ({ ...current, [question.key]: value }))}
                                                    options={[
                                                        { value: "", label: "انتخاب کنید" },
                                                        ...question.options.map((option) => ({ value: option, label: option })),
                                                    ]}
                                                    ariaLabel={question.label}
                                                    className="mt-2 font-normal"
                                                />
                                            ) : (
                                                <input
                                                    value={String(answers[question.key] ?? "")}
                                                    onChange={(event) => setAnswers((current) => ({ ...current, [question.key]: event.target.value }))}
                                                    maxLength={300}
                                                    className={`${inputClass} mt-2 font-normal`}
                                                    placeholder="پاسخ کوتاه"
                                                />
                                            )}
                                        </label>
                                    ))}
                                </div>
                            </section>
                        )}
                        {appointment.intake_form.consents.length > 0 && (
                            <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                                <h3 className="font-dana text-lg text-primary">رضایت‌نامه‌ها</h3>
                                <div className="mt-4 space-y-3">
                                    {appointment.intake_form.consents.map((consent) => {
                                        const checked = acceptedConsents.includes(consent.key);
                                        return (
                                            <label key={consent.key} className={`block cursor-pointer rounded-2xl border p-4 transition ${checked ? "border-emerald-200 bg-emerald-50/60" : "border-slate-200 bg-slate-50"}`}>
                                                <span className="flex items-start gap-3">
                                                    <input
                                                        type="checkbox"
                                                        checked={checked}
                                                        onChange={(event) =>
                                                            setAcceptedConsents((current) =>
                                                                event.target.checked
                                                                    ? [...current, consent.key]
                                                                    : current.filter((key) => key !== consent.key),
                                                            )
                                                        }
                                                        className="mt-1 h-5 w-5 shrink-0 accent-emerald-600"
                                                    />
                                                    <span>
                                                        <b className="text-sm text-primary">{consent.title}{consent.is_required && <span className="mr-1 text-rose-500">*</span>}</b>
                                                        <span className="mt-2 block whitespace-pre-line text-xs font-normal leading-7 text-slate-600">{consent.body}</span>
                                                    </span>
                                                </span>
                                            </label>
                                        );
                                    })}
                                </div>
                            </section>
                        )}
                    </div>
                    <footer className="sticky bottom-0 flex items-center justify-end gap-3 border-t border-slate-200 bg-white/95 p-4 backdrop-blur sm:px-6">
                        <button type="button" onClick={onClose} className="h-11 rounded-xl px-4 text-sm text-slate-500">انصراف</button>
                        <button disabled={busy} className="h-11 rounded-xl bg-primary px-6 text-sm font-bold text-white disabled:opacity-50">
                            {busy ? "در حال ثبت…" : appointment.intake_completed ? "ذخیره تغییرات" : "ثبت فرم"}
                        </button>
                    </footer>
                </form>
            </div>
        </div>
    );
};

const AppointmentCard = ({
    item,
    onCancel,
    onOpenChat,
    onReschedule,
    onAddCalendar,
    onOpenIntake,
}: {
    item: Appointment;
    onCancel?: (id: number) => void;
    onOpenChat?: (item: Appointment) => void;
    onReschedule?: (item: Appointment) => void;
    onAddCalendar?: (item: Appointment) => void;
    onOpenIntake?: (item: Appointment) => void;
}) => {
    const status = statusLabels[item.status];
    const canCancel = ["pending", "confirmed"].includes(item.status);
    return (
        <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-secondary/10 text-2xl text-secondary-deep">
                        <ServiceIcon icon={item.service_icon_key} />
                    </span>
                    <div>
                        <span className="text-xs text-slate-400">
                            کد پیگیری {item.tracking_code}
                        </span>
                        <h3 className="mt-2 font-bold text-primary">
                            {item.service_title}
                        </h3>
                        <span className="mt-1 block text-xs text-slate-500">
                            زمان ویزیت :{" "}
                            {toPersianDigits(item.service_duration_minutes)}{" "}
                            دقیقه
                        </span>
                        <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
                            {item.is_urgent && (
                                <span className="rounded-full bg-rose-50 px-2 py-1 text-rose-700">نوبت فوری</span>
                            )}
                            <span className="rounded-full bg-emerald-50 px-2 py-1 text-emerald-700">
                                {item.amount_paid_toman > 0
                                    ? `${formatToman(item.amount_paid_toman)} پرداخت شده`
                                    : "بدون پرداخت آنلاین"}
                            </span>
                            {item.patient_reschedule_count > 0 && (
                                <span className="rounded-full bg-sky-50 px-2 py-1 text-sky-700">
                                    {toPersianDigits(item.patient_reschedule_count)} بار جابه‌جا شده
                                </span>
                            )}
                            {item.intake_required && (
                                <span className={`rounded-full px-2 py-1 ${item.intake_completed ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                                    {item.intake_completed ? "فرم تکمیل شده" : "تکمیل فرم لازم است"}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
                <span
                    className={`rounded-full px-3 py-1 text-xs ${status.className}`}
                >
                    {status.label}
                </span>
            </div>
            <div className="mt-5 grid gap-3 text-sm text-slate-600 sm:grid-cols-2">
                <span className="flex items-center gap-2">
                    <IoCalendarOutline className="text-secondary-deep" />
                    {formatPersianDate(item.appointment_date)}
                </span>
                <span className="flex items-center gap-2">
                    <IoTimeOutline className="text-secondary-deep" />
                    ساعت {toPersianDigits(formatTime(item.start_time))}
                </span>
            </div>
            <div className="flex flex-wrap items-center gap-3">
                {item.staff_note && (
                    <p className="mt-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
                        یادداشت مطب: {item.staff_note}
                    </p>
                )}
                {item.consultation_enabled && onOpenChat && (
                    <button
                        type="button"
                        onClick={() => onOpenChat(item)}
                        className="mt-5 inline-flex items-center gap-2 rounded-xl bg-secondary/10 px-4 py-2 text-sm font-bold text-secondary-deep transition hover:bg-secondary/20"
                    >
                        <IoChatbubblesOutline /> ارسال عکس و گفت‌وگو با مطب
                    </button>
                )}
                {canCancel && item.intake_required && onOpenIntake && (
                    <button
                        type="button"
                        onClick={() => onOpenIntake(item)}
                        className={`mt-5 inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition ${item.intake_completed ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100" : "bg-amber-50 text-amber-800 hover:bg-amber-100"}`}
                    >
                        <IoMedicalOutline /> {item.intake_completed ? "مشاهده و ویرایش فرم" : "تکمیل فرم قبل از مراجعه"}
                    </button>
                )}
                {canCancel && onReschedule && (
                    <button
                        type="button"
                        onClick={() => onReschedule(item)}
                        className="mt-5 inline-flex items-center gap-2 rounded-xl bg-sky-50 px-4 py-2 text-sm font-bold text-sky-700 transition hover:bg-sky-100"
                    >
                        <IoSwapHorizontalOutline /> تغییر زمان نوبت
                    </button>
                )}
                {canCancel && onAddCalendar && (
                    <button
                        type="button"
                        onClick={() => onAddCalendar(item)}
                        className="mt-5 inline-flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-200"
                    >
                        <IoCalendarClearOutline /> افزودن به تقویم
                    </button>
                )}
                {canCancel && onCancel && (
                    <button
                        onClick={() => onCancel(item.id)}
                        className="mt-5 text-sm text-rose-600 hover:text-rose-700"
                    >
                        لغو این نوبت
                    </button>
                )}
            </div>
            {canCancel && item.patient_reschedule_reason && (
                <p className="mt-4 rounded-xl bg-amber-50 px-3 py-2 text-xs leading-6 text-amber-700">
                    {item.patient_reschedule_reason}
                </p>
            )}
        </article>
    );
};

type BookingDraft = {
    hasPreviousVisit: boolean | null;
    serviceId: number | null;
    date: string;
    startTime: string;
    note: string;
    isUrgent: boolean;
};

const BookingWizard = ({
    token,
    services,
    onClose,
    onBooked,
}: {
    token: string;
    services: Service[];
    onClose: () => void;
    onBooked: (item: Appointment) => void;
}) => {
    const [step, setStep] = useState(1);
    const [draft, setDraft] = useState<BookingDraft>({
        hasPreviousVisit: null,
        serviceId: null,
        date: "",
        startTime: "",
        note: "",
        isUrgent: false,
    });
    const [dates, setDates] = useState<AvailableDate[]>([]);
    const [slots, setSlots] = useState<AvailableSlot[]>([]);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const [waitlistJoined, setWaitlistJoined] = useState(false);

    useEffect(() => {
        if (step !== 3 || dates.length || !draft.serviceId) return;
        setBusy(true);
        appointmentApi
            .getAvailableDates(draft.serviceId, draft.isUrgent)
            .then(setDates)
            .catch((reason) => setError(errorMessage(reason)))
            .finally(() => setBusy(false));
    }, [dates.length, draft.isUrgent, draft.serviceId, step]);

    useEffect(() => {
        if (!draft.date || !draft.serviceId) return;
        setBusy(true);
        appointmentApi
            .getAvailableSlots(draft.date, draft.serviceId, draft.isUrgent)
            .then(setSlots)
            .catch((reason) => setError(errorMessage(reason)))
            .finally(() => setBusy(false));
    }, [draft.date, draft.isUrgent, draft.serviceId]);

    useEffect(() => {
        setWaitlistJoined(false);
    }, [draft.isUrgent, draft.serviceId]);

    const selectedService = services.find(
        (item) => item.id === draft.serviceId,
    );
    const urgentExtra =
        draft.isUrgent && selectedService ? selectedService.urgent_extra_toman : 0;
    const payableNow = selectedService
        ? selectedService.payment_mode === "full"
            ? selectedService.price_toman + urgentExtra
            : selectedService.payment_mode === "deposit"
              ? Math.min(
                    selectedService.price_toman + urgentExtra,
                    selectedService.deposit_toman + urgentExtra,
                )
              : urgentExtra
        : 0;
    const canContinue =
        (step === 1 && draft.hasPreviousVisit !== null) ||
        (step === 2 && Boolean(draft.serviceId)) ||
        (step === 3 && Boolean(draft.date)) ||
        (step === 4 && Boolean(draft.startTime));

    const submit = async () => {
        if (
            !draft.serviceId ||
            !draft.date ||
            !draft.startTime ||
            draft.hasPreviousVisit === null
        )
            return;
        setBusy(true);
        setError("");
        try {
            const result = await appointmentApi.createAppointment(token, {
                service_id: draft.serviceId,
                appointment_date: draft.date,
                start_time: draft.startTime,
                has_previous_visit: draft.hasPreviousVisit,
                is_urgent: draft.isUrgent,
                patient_note: draft.note || undefined,
            });
            if (result.requires_payment && result.payment_url) {
                window.location.assign(result.payment_url);
                return;
            }
            if (result.appointment) onBooked(result.appointment);
            else throw new Error("پاسخ ثبت نوبت کامل نیست");
        } catch (submitError) {
            setError(errorMessage(submitError));
        } finally {
            setBusy(false);
        }
    };

    return (
        <div
            className="fixed inset-0 z-100 overflow-y-auto bg-[#f5f7fd] text-slate-800 motion-safe:animate-[fade-in_.2s_ease-out]"
            dir="rtl"
        >
            <header className="sticky top-0 z-10 bg-primary px-4 py-4 text-white shadow-lg">
                <div className="mx-auto flex max-w-4xl items-center justify-between">
                    <button onClick={onClose} aria-label="بستن">
                        <IoCloseOutline size={28} />
                    </button>
                    <h2 className="font-dana text-xl">دریافت نوبت حضوری</h2>
                    <span className="w-7" />
                </div>
            </header>
            <main className="mx-auto max-w-6xl px-4 py-7 pb-32">
                <ol
                    className="mb-8 flex items-center justify-between gap-1"
                    aria-label="مراحل رزرو"
                >
                    {Array.from({ length: 5 }, (_, index) => index + 1).map(
                        (item) => (
                            <li
                                key={item}
                                className="flex flex-1 items-center last:flex-none"
                            >
                                <span
                                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-sm font-bold ${item < step ? "border-secondary bg-secondary text-primary" : item === step ? "border-primary bg-primary text-white" : "border-slate-200 bg-white text-slate-400"}`}
                                >
                                    {item < step ? (
                                        <IoCheckmarkCircle color="white" />
                                    ) : (
                                        toPersianDigits(item)
                                    )}
                                </span>
                                {item < 5 && (
                                    <span
                                        className={`mx-1 h-0.5 flex-1 ${item < step ? "bg-secondary" : "bg-slate-200"}`}
                                    />
                                )}
                            </li>
                        ),
                    )}
                </ol>
                {error && (
                    <div
                        role="alert"
                        className="mb-5 rounded-2xl bg-rose-50 p-4 text-sm text-rose-700"
                    >
                        {error}
                    </div>
                )}
                <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
                <section
                    key={step}
                    className="app-step-enter rounded-4xl bg-white p-5 shadow-sm md:p-8"
                >
                    {step === 1 && (
                        <>
                            <h3 className="font-dana text-2xl text-primary">
                                آیا قبلاً توسط دکتر زمانی معاینه شده‌اید؟
                            </h3>
                            <div className="mt-7 grid gap-4 sm:grid-cols-2">
                                {[
                                    [true, "بله، قبلاً معاینه شده‌ام"],
                                    [false, "خیر، اولین مراجعه من است"],
                                ].map(([value, label]) => (
                                    <button
                                        key={String(value)}
                                        onClick={() =>
                                            setDraft((d) => ({
                                                ...d,
                                                hasPreviousVisit:
                                                    value as boolean,
                                            }))
                                        }
                                        className={`rounded-2xl border p-5 text-right transition ${draft.hasPreviousVisit === value ? "border-secondary bg-secondary/10 ring-2 ring-secondary/20" : "border-slate-200 hover:border-secondary/50"}`}
                                    >
                                        <span className="flex items-center gap-3">
                                            <span
                                                className={`h-5 w-5 rounded-full border-2 ${draft.hasPreviousVisit === value ? "border-secondary bg-secondary ring-4 ring-secondary/15" : "border-slate-300"}`}
                                            />
                                            {label as string}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </>
                    )}
                    {step === 2 && (
                        <>
                            <h3 className="font-dana text-2xl text-primary">
                                برای کدام خدمت نوبت می‌خواهید؟
                            </h3>
                            <div className="mt-7 grid gap-4 sm:grid-cols-2">
                                {services.map((service) => (
                                    <button
                                        key={service.id}
                                        onClick={() => {
                                            setDates([]);
                                            setSlots([]);
                                            setDraft((d) => ({
                                                ...d,
                                                serviceId: service.id,
                                                date: "",
                                                startTime: "",
                                                isUrgent: false,
                                            }));
                                        }}
                                        className={`rounded-2xl border p-5 text-right transition ${draft.serviceId === service.id ? "border-secondary bg-secondary/10 ring-2 ring-secondary/20" : "border-slate-200 hover:border-secondary/50"}`}
                                    >
                                        <ServiceIcon
                                            icon={service.icon_key}
                                            className="mb-4 text-3xl text-secondary-deep"
                                        />
                                        <b className="block text-primary">
                                            {service.title}
                                        </b>
                                        <span className="mt-2 block text-sm leading-6 text-slate-500">
                                            {service.description}
                                        </span>
                                        <span className="mt-3 block text-xs font-bold text-secondary-deep">
                                            {toPersianDigits(
                                                service.duration_minutes,
                                            )}{" "}
                                            دقیقه
                                            {service.allows_media_chat
                                                ? " · دارای ارسال عکس و گفت‌وگو"
                                                : ""}
                                        </span>
                                        <span className="mt-3 block text-sm font-bold text-primary">
                                            بهای خدمت{" "}
                                            {service.payment_mode === "none"
                                                ? "رایگان"
                                                : formatToman(
                                                      service.price_toman,
                                                  )}
                                        </span>
                                        <span className="mt-1 block text-xs text-slate-500">
                                            {service.payment_mode === "deposit"
                                                ? "قابل پرداخت به‌عنوان بیعانه"
                                                : service.payment_mode === "full"
                                                  ? "قابل پرداخت به‌عنوان کل ویزیت"
                                                  : "بدون نیاز به پرداخت آنلاین"}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </>
                    )}
                    {step === 3 && (
                        <>
                            {selectedService?.urgent_enabled && (
                                <div className="mb-6 grid gap-3 sm:grid-cols-2">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setDates([]);
                                            setSlots([]);
                                            setDraft((value) => ({
                                                ...value,
                                                isUrgent: false,
                                                date: "",
                                                startTime: "",
                                            }));
                                        }}
                                        className={`rounded-2xl border p-4 text-right ${!draft.isUrgent ? "border-secondary bg-secondary/10" : "border-slate-200"}`}
                                    >
                                        <b className="text-primary">نوبت عادی</b>
                                        <span className="mt-1 block text-xs text-slate-500">ساعت‌های معمول مطب</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setDates([]);
                                            setSlots([]);
                                            setDraft((value) => ({
                                                ...value,
                                                isUrgent: true,
                                                date: "",
                                                startTime: "",
                                            }));
                                        }}
                                        className={`rounded-2xl border p-4 text-right ${draft.isUrgent ? "border-rose-400 bg-rose-50" : "border-slate-200"}`}
                                    >
                                        <b className="text-rose-700">نوبت فوری</b>
                                        <span className="mt-1 block text-xs text-rose-600">
                                            مبلغ اضافه {formatToman(selectedService.urgent_extra_toman)}
                                        </span>
                                    </button>
                                </div>
                            )}
                            <h3 className="font-dana text-2xl text-primary">
                                تاریخ حضور را انتخاب کنید
                            </h3>
                            {busy ? (
                                <p className="mt-8 text-slate-500">
                                    در حال دریافت روزهای قابل رزرو…
                                </p>
                            ) : dates.length ? (
                                <AvailabilityCalendar
                                    dates={dates}
                                    value={draft.date}
                                    onChange={(date) =>
                                        setDraft((current) => ({
                                            ...current,
                                            date,
                                            startTime: "",
                                        }))
                                    }
                                    className="mt-7"
                                />
                            ) : (
                                <div className="mt-7 rounded-2xl border border-amber-100 bg-amber-50 p-5 text-amber-900">
                                    <b className="block">فعلاً زمان خالی وجود ندارد</b>
                                    <p className="mt-2 text-sm leading-7 text-amber-800">
                                        با عضویت در لیست انتظار، بعد از لغو یک نوبت اولین ظرفیت مناسب به شما پیامک می‌شود.
                                    </p>
                                    <button
                                        type="button"
                                        disabled={busy || waitlistJoined || !draft.serviceId}
                                        onClick={async () => {
                                            if (!draft.serviceId) return;
                                            setBusy(true);
                                            setError("");
                                            try {
                                                await appointmentApi.joinWaitlist(token, {
                                                    service_id: draft.serviceId,
                                                    desired_date: null,
                                                    is_urgent: draft.isUrgent,
                                                });
                                                setWaitlistJoined(true);
                                            } catch (reason) {
                                                setError(errorMessage(reason));
                                            } finally {
                                                setBusy(false);
                                            }
                                        }}
                                        className="mt-4 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-white disabled:opacity-50"
                                    >
                                        {waitlistJoined ? "در لیست انتظار ثبت شدید" : "عضویت در لیست انتظار"}
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                    {step === 4 && (
                        <>
                            <h3 className="font-dana text-2xl text-primary">
                                ساعت حضور را انتخاب کنید
                            </h3>
                            {busy ? (
                                <p className="mt-8 text-slate-500">
                                    در حال دریافت ساعت‌های خالی…
                                </p>
                            ) : (
                                <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4">
                                    {slots.map((slot) => (
                                        <button
                                            key={slot.start_time}
                                            onClick={() =>
                                                setDraft((d) => ({
                                                    ...d,
                                                    startTime: slot.start_time,
                                                }))
                                            }
                                            className={`rounded-2xl border px-3 py-4 font-bold transition ${draft.startTime === slot.start_time ? "border-secondary bg-secondary text-primary ring-2 ring-secondary/20" : "border-slate-200 text-slate-700"}`}
                                        >
                                            {toPersianDigits(
                                                formatTime(slot.start_time),
                                            )}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                    {step === 5 && (
                        <>
                            <h3 className="font-dana text-2xl text-primary">
                                بررسی و تأیید نهایی
                            </h3>
                            <dl className="mt-7 grid gap-4 rounded-2xl bg-slate-50 p-5 sm:grid-cols-2">
                                <div>
                                    <dt className="text-xs text-slate-400">
                                        خدمت
                                    </dt>
                                    <dd className="mt-1 font-bold text-primary">
                                        {selectedService?.title}
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-xs text-slate-400">نوع نوبت</dt>
                                    <dd className="mt-1 font-bold">
                                        {draft.isUrgent ? "فوری" : "عادی"}
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-xs text-slate-400">بهای خدمت</dt>
                                    <dd className="mt-1 font-bold text-primary">
                                        {formatToman(
                                            (selectedService?.price_toman ?? 0) +
                                                (draft.isUrgent
                                                    ? selectedService?.urgent_extra_toman ?? 0
                                                    : 0),
                                        )}
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-xs text-slate-400">قابل پرداخت الآن</dt>
                                    <dd className="mt-1 font-bold text-emerald-700">
                                        {payableNow > 0 ? formatToman(payableNow) : "بدون پرداخت"}
                                        {payableNow > 0 && selectedService && (
                                            <span className="mt-1 block text-[11px] font-normal text-slate-500">
                                                {draft.isUrgent &&
                                                selectedService.payment_mode ===
                                                    "none"
                                                    ? "به‌عنوان هزینه نوبت فوری"
                                                    : selectedService.payment_mode ===
                                                        "deposit"
                                                      ? "به‌عنوان بیعانه"
                                                      : "به‌عنوان کل ویزیت"}
                                            </span>
                                        )}
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-xs text-slate-400">
                                        سابقه مراجعه
                                    </dt>
                                    <dd className="mt-1">
                                        {draft.hasPreviousVisit
                                            ? "دارم"
                                            : "ندارم"}
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-xs text-slate-400">
                                        تاریخ
                                    </dt>
                                    <dd className="mt-1">
                                        {formatPersianDate(draft.date)}
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-xs text-slate-400">
                                        ساعت
                                    </dt>
                                    <dd className="mt-1">
                                        {toPersianDigits(
                                            formatTime(draft.startTime),
                                        )}
                                    </dd>
                                </div>
                            </dl>
                            <label className="mt-5 block">
                                <span className="mb-2 block text-sm text-slate-600">
                                    توضیح برای مطب (اختیاری)
                                </span>
                                <textarea
                                    value={draft.note}
                                    onChange={(e) =>
                                        setDraft((d) => ({
                                            ...d,
                                            note: e.target.value,
                                        }))
                                    }
                                    maxLength={500}
                                    rows={3}
                                    className="w-full rounded-2xl border border-slate-200 p-4 outline-none focus:border-secondary"
                                />
                            </label>
                        </>
                    )}
                </section>
                <aside className="sticky top-28 hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm lg:block">
                    <span className="text-xs text-secondary-deep">خلاصه نوبت</span>
                    <h3 className="mt-2 font-dana text-xl text-primary">
                        {selectedService?.title ?? "هنوز خدمتی انتخاب نشده"}
                    </h3>
                    <dl className="mt-5 space-y-4 text-sm">
                        <div className="flex justify-between gap-3">
                            <dt className="text-slate-400">نوع</dt>
                            <dd>{draft.isUrgent ? "فوری" : "عادی"}</dd>
                        </div>
                        <div className="flex justify-between gap-3">
                            <dt className="text-slate-400">تاریخ</dt>
                            <dd className="text-left">{draft.date ? formatPersianDate(draft.date) : "—"}</dd>
                        </div>
                        <div className="flex justify-between gap-3">
                            <dt className="text-slate-400">ساعت</dt>
                            <dd>{draft.startTime ? toPersianDigits(formatTime(draft.startTime)) : "—"}</dd>
                        </div>
                        <div className="flex justify-between gap-3 border-t border-slate-100 pt-4">
                            <dt className="font-bold text-primary">پرداخت الآن</dt>
                            <dd className="font-bold text-emerald-700">
                                {payableNow ? formatToman(payableNow) : "بدون پرداخت"}
                            </dd>
                        </div>
                    </dl>
                    <p className="mt-5 rounded-xl bg-slate-50 p-3 text-xs leading-6 text-slate-500">
                        در نوبت‌های پرداخت‌دار، زمان تا پایان پرداخت موقتاً برای شما نگه داشته می‌شود.
                    </p>
                </aside>
                </div>
            </main>
            <footer className="fixed inset-x-0 bottom-0 border-t border-slate-200 bg-white/95 p-4 backdrop-blur">
                <div className="mx-auto flex max-w-6xl gap-3 lg:pl-[344px]">
                    {step > 1 && (
                        <button
                            onClick={() => setStep((value) => value - 1)}
                            className="h-12 rounded-2xl border border-slate-200 px-6 text-slate-600"
                        >
                            مرحله قبل
                        </button>
                    )}
                    <button
                        disabled={(step < 5 && !canContinue) || busy}
                        onClick={() =>
                            step === 5
                                ? submit()
                                : setStep((value) => value + 1)
                        }
                        className="h-12 flex-1 rounded-2xl bg-secondary font-bold text-primary shadow-lg shadow-secondary/20 disabled:opacity-40"
                    >
                        {busy
                            ? "در حال ثبت…"
                            : step === 5
                              ? payableNow > 0
                                  ? "پرداخت و ثبت نوبت"
                                  : "تأیید و ثبت نوبت"
                              : "مرحله بعد"}
                    </button>
                </div>
            </footer>
        </div>
    );
};

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
    const [bookingOpen, setBookingOpen] = useState(false);
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
                        onClick={() => setBookingOpen(true)}
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
                            onClick={() => setBookingOpen(true)}
                            className="flex w-full items-center justify-between rounded-3xl bg-[linear-gradient(135deg,#d9ad5f,#f1d69e)] p-5 text-right text-primary shadow-lg shadow-secondary/15 transition active:scale-[.99] md:hidden"
                        >
                            <span>
                                <b className="block font-dana text-xl">دریافت نوبت جدید</b>
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
                                        <button type="button" onClick={() => setBookingOpen(true)} className="mt-5 h-11 rounded-xl bg-primary px-6 text-sm font-bold text-white">دریافت نوبت</button>
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
                                <button type="button" onClick={() => setBookingOpen(true)} className="shrink-0 text-xs font-bold text-secondary-deep">مشاهده زمان‌ها</button>
                            </div>
                            <div className="mt-4 grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                {services.slice(0, 6).map((service) => (
                                    <button key={service.id} type="button" onClick={() => setBookingOpen(true)} className="flex min-w-0 items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4 text-right transition hover:-translate-y-0.5 hover:border-secondary/40 hover:bg-white hover:shadow-md">
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
                                onClick={() => setBookingOpen(true)}
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
            {bookingOpen && (
                <BookingWizard
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
                />
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
                <IntakeFormDialog
                    token={token}
                    appointment={intakeAppointment}
                    onClose={() => setIntakeAppointment(null)}
                    onSaved={async (updated) => {
                        setIntakeAppointment(null);
                        setMessageKind("success");
                        setMessage(`فرم قبل از مراجعه نوبت ${updated.tracking_code} ذخیره شد.`);
                        await onRefresh();
                    }}
                />
            )}
        </main>
    );
};

const AppointmentPortal = () => {
    const { clinicInfo: publicClinicInfo } = useClinicInfo();
    const [token, setToken] = useState(
        () => browserCsrf("patient") ? PATIENT_COOKIE_SESSION : "",
    );
    const [loading, setLoading] = useState(Boolean(token));
    const [profile, setProfile] = useState<PatientProfile | null>(null);
    const [clinic, setClinic] = useState<ClinicSettings | null>(null);
    const [services, setServices] = useState<Service[]>([]);
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [waitlist, setWaitlist] = useState<WaitlistEntry[]>([]);
    const [sessionError, setSessionError] = useState("");

    const load = async (activeToken = token) => {
        if (!activeToken) return;
        setLoading(true);
        setSessionError("");
        try {
            const [
                currentProfile,
                currentClinic,
                currentServices,
                currentAppointments,
                currentWaitlist,
            ] = await Promise.all([
                appointmentApi.getMe(activeToken),
                appointmentApi.getClinic(),
                appointmentApi.getServices(),
                appointmentApi.getAppointments(activeToken),
                appointmentApi.getWaitlist(activeToken),
            ]);
            setProfile(currentProfile);
            setClinic(currentClinic);
            setServices(currentServices);
            setAppointments(currentAppointments);
            setWaitlist(currentWaitlist);
        } catch (loadError) {
            if (
                loadError instanceof AppointmentApiError &&
                loadError.status === 401
            ) {
                localStorage.removeItem(PATIENT_TOKEN_KEY);
                setToken("");
            } else {
                setSessionError(errorMessage(loadError));
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        localStorage.removeItem(PATIENT_TOKEN_KEY);
        if (token) void load(token);
        // Token changes define a new session; load intentionally runs once per session.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token]);

    const logout = async () => {
        try {
            await appointmentApi.logout(token);
        } catch (error) {
            setSessionError(`خروج انجام نشد: ${errorMessage(error)}`);
            return;
        }
        localStorage.removeItem(PATIENT_TOKEN_KEY);
        setToken("");
        setProfile(null);
    };

    return (
        <>
            <Seo
                title={`سامانه نوبت‌دهی مطب ${publicClinicInfo.doctorName}`}
                description={`رزرو اینترنتی نوبت حضوری مطب ${publicClinicInfo.doctorName}؛ ورود امن با شماره موبایل و انتخاب خدمت، تاریخ و ساعت حضور.`}
                canonical={`${publicClinicInfo.siteUrl}/appointment/`}
                noIndex
            />
            {sessionError && <div role="alert" className="p-4 text-center text-red-700">
                {sessionError} <button onClick={() => void load(token)} className="underline">تلاش مجدد</button>
            </div>}
            {!token ? (
                <Login onAuthenticated={setToken} />
            ) : loading || !profile || !clinic ? (
                <LoadingScreen />
            ) : !profile.profile_completed ? (
                <ProfileForm profile={profile} onSaved={setProfile} />
            ) : (
                <Portal
                    token={token}
                    profile={profile}
                    clinic={clinic}
                    services={services}
                    appointments={appointments}
                    waitlist={waitlist}
                    onProfileSaved={setProfile}
                    onRefresh={() => load(token)}
                    onLogout={logout}
                />
            )}
        </>
    );
};

export default AppointmentPortal;
