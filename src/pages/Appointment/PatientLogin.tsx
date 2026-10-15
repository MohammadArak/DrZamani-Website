import BotProtection,{ type BotHandle } from "@/components/BotProtection";
import {
    AppointmentApiError,
    PATIENT_COOKIE_SESSION,
    PATIENT_TOKEN_KEY,
    appointmentApi,
    toPersianDigits
} from "@/services/appointmentApi";
import {
    useEffect,
    useRef,
    useState,
    type FormEvent,
    type KeyboardEvent
} from "react";
import {
    IoArrowForward
} from "react-icons/io5";

import { AuthShell } from "./PatientShells";
import { errorMessage,inputClass,normalizeDigits } from "./patientUi";
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
    const [lastSentPhone,setLastSentPhone]=useState("");
    const [debugOtp, setDebugOtp] = useState("");
    const [codeLength, setCodeLength] = useState(6);
    const [cooldown, setCooldown] = useState(0);
    const [cooldownUntil, setCooldownUntil] = useState(0);
    const inFlight = useRef(false);
    const codeStart = useRef<HTMLDivElement>(null);
    const startCooldown = (seconds: number) => {
        const remaining = Math.max(0, Math.ceil(seconds));
        setCooldown(remaining);
        setCooldownUntil(Date.now() + remaining * 1000);
    };
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        if (!cooldownUntil) return;
        const timer = window.setInterval(() => {
            const remaining = Math.max(0, Math.ceil((cooldownUntil - Date.now()) / 1000));
            setCooldown(remaining);
            if (!remaining) window.clearInterval(timer);
        }, 1000);
        return () => window.clearInterval(timer);
    }, [cooldownUntil]);
    useEffect(() => {
        if (stage === "otp") codeStart.current?.querySelector("input")?.focus();
    }, [stage]);

    const requestCode = async (event?: FormEvent) => {
        event?.preventDefault();
        if (inFlight.current || Date.now() < cooldownUntil) return;
        const normalized = normalizeDigits(phone).replace(/[\s()-]/g, "");
        if (!/^(09\d{9}|(?:\+98|0098|98)9\d{9})$/.test(normalized)) {
            setError("شماره موبایل را کامل و درست وارد کنید؛ مانند ۰۹۱۲۱۲۳۴۵۶۷.");
            return;
        }
        inFlight.current = true;
        setBusy(true);
        setError("");
        try {
            const activeBot = stage === "phone" ? bot : resendBot;
            const result = await appointmentApi.requestOtp(normalized, await activeBot.current?.proof());
            setLastSentPhone(normalized);
            setStage("otp");
            startCooldown(result.retry_after_seconds);
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
                startCooldown(requestError.retryAfter);
            }
        } finally {
            inFlight.current = false;
            setBusy(false);
        }
    };

    const verifyCode = async (event: FormEvent) => {
        event.preventDefault();
        if (inFlight.current || code.replace(/\D/g, "").length !== codeLength) return;
        inFlight.current = true;
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
            inFlight.current = false;
            setBusy(false);
        }
    };

    return (
        <AuthShell>
            <div className="mx-auto flex w-full min-w-0 max-w-xl flex-col">
                <a
                    href="/"
                    className="mb-5 inline-flex items-center gap-2 text-sm text-slate-500 hover:text-primary md:hidden"
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
                <p id="phone-help" className="mt-4 leading-7 text-slate-600">
                    {stage === "phone"
                        ? "برای ساخت حساب یا ورود، کد یک‌بارمصرف برای شما ارسال می‌شود."
                        : `کد ${toPersianDigits(String(codeLength))} رقمی به ${toPersianDigits(phone)} ارسال شد.`}
                </p>

                <details className="mt-4 rounded-xl border border-slate-200 p-3 text-sm text-slate-600">
                    <summary className="cursor-pointer font-bold text-primary">چطور نوبت بگیرم؟</summary>
                    <ol className="mt-3 list-inside list-decimal space-y-2 leading-7">
                        <li>با شماره موبایل و کد تأیید وارد شوید؛ اگر حساب ندارید مشخصات لازم را کامل کنید.</li>
                        <li>خدمت، تاریخ و ساعت مناسب را انتخاب کنید.</li>
                        <li>اطلاعات را بررسی و نوبت را ثبت کنید؛ پرداخت فقط در صورت نیازِ خدمت انجام می‌شود.</li>
                    </ol>
                    <p className="mt-3 leading-7">رسید، وضعیت نوبت و راه پیگیری در بخش «نوبت‌ها» در دسترس است.</p>
                </details>
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
                        {lastSentPhone && lastSentPhone===normalizeDigits(phone).replace(/[\s()-]/g, "") && <button type="button" className="text-sm text-primary underline" onClick={()=>{setError("");setStage("otp");}}>کد را دارم؛ بازگشت به ورود کد</button>}
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
                                type="tel"
                                disabled={busy}
                                aria-describedby="phone-help"
                                inputMode="tel"
                                autoComplete="tel"
                                placeholder="0912 000 0000"
                                required
                            />
                        </label>
                        <button
                            disabled={busy || Boolean(cooldown)}
                            className="h-13 w-full rounded-2xl bg-secondary font-bold text-primary-deep shadow-lg shadow-secondary/20 transition hover:bg-secondary-mild disabled:opacity-60"
                        >
                            {busy ? "در حال ارسال…" : cooldown ? `تلاش دوباره در ${toPersianDigits(cooldown)} ثانیه` : "ارسال کد تأیید"}
                        </button>
                    </form>
                ) : (
                    <form onSubmit={verifyCode} className="mt-7 space-y-5">
                        <div ref={codeStart}><OtpInput value={code} onChange={setCode} length={codeLength} /></div>
                        <BotProtection ref={bot} operation="otp_verify" />
                        <button
                            disabled={
                                busy || code.replace(/\D/g, "").length !== codeLength
                            }
                            className="h-13 w-full rounded-2xl bg-secondary font-bold text-primary-deep shadow-lg shadow-secondary/20 transition hover:bg-secondary-mild disabled:opacity-50"
                        >
                            {busy ? "در حال بررسی…" : "تأیید و ادامه"}
                        </button>
                        {!cooldown && <BotProtection ref={resendBot} operation="otp_request" />}
                        <div className="flex items-center justify-between text-sm">
                            <button
                                type="button"
                                disabled={busy}
                                onClick={() => { setStage("phone"); setCode(""); setDebugOtp(""); setError(""); }}
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


export default Login;
