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


export default Login;
