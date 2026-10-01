import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { useClinicInfo } from "@/contexts/ClinicInfoContext";
import BotProtection, { type BotHandle } from "@/components/BotProtection";
import { appointmentApi, STAFF_COOKIE_SESSION, STAFF_TOKEN_KEY, STAFF_PROFILE_KEY, type BotChallenge, type CaptchaChallenge, type MfaLoginRequired, type StaffIdentity } from "@/services/appointmentApi";

const field = "mt-2 h-12 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 outline-none focus:border-secondary";
export default function StaffLogin({ onLogin }: { onLogin: (token: string, profile: StaffIdentity) => void }) {
    const { clinicInfo } = useClinicInfo();
    const [username, setUsername] = useState(""); const [password, setPassword] = useState("");
    const [captcha, setCaptcha] = useState<CaptchaChallenge | null>(null); const [answer, setAnswer] = useState("");
    const [provider, setProvider] = useState<BotChallenge["provider"] | null>(null);
    const [mfa, setMfa] = useState<MfaLoginRequired | null>(null); const [code, setCode] = useState("");
    const [method, setMethod] = useState<"totp" | "recovery">("totp");
    const [busy, setBusy] = useState(false); const [error, setError] = useState("");
    const bot = useRef<BotHandle>(null);
    const loadCaptcha = useCallback(async () => { try { setCaptcha(await appointmentApi.staffCaptcha()); setAnswer(""); } catch { setError("بارگیری کد امنیتی ممکن نیست؛ کمی بعد تلاش کنید."); } }, []);
    useEffect(() => { let live = true; if (provider === "local") void appointmentApi.staffCaptcha().then(value => { if (live) { setCaptcha(value); setAnswer(""); } }).catch(() => { if (live) setError("بارگیری کد امنیتی ممکن نیست"); }); return () => { live = false; }; }, [provider]);
    const complete = (profile: StaffIdentity) => { localStorage.removeItem(STAFF_TOKEN_KEY); localStorage.removeItem(STAFF_PROFILE_KEY); onLogin(STAFF_COOKIE_SESSION, profile); };
    const submit = async (event: FormEvent) => {
        event.preventDefault(); setBusy(true); setError("");
        try {
            if (mfa) { complete(await appointmentApi.mfaLogin(mfa.challenge_id, code, method)); return; }
            const proof = await bot.current?.proof();
            const result = await appointmentApi.staffLogin(username, password, captcha?.captcha_id ?? "", answer, proof);
            if ("mfa_required" in result) { setMfa(result); setPassword(""); setAnswer(""); return; }
            complete(result);
        } catch (failure) {
            setError(failure instanceof Error ? failure.message : "ورود ممکن نشد");
            if (!mfa) { bot.current?.retry(failure); if (provider === "local") await loadCaptcha(); }
            setCode("");
        } finally { setBusy(false); }
    };
    return <main dir="rtl" className="flex min-h-screen items-center justify-center bg-primary px-4 py-10 text-slate-800"><div className="w-full min-w-0 max-w-md rounded-4xl bg-white p-6 shadow-2xl md:p-9">
        <a href="/" className="mx-auto mb-7 block w-fit"><img src="/img/logo/logo-dark-full.webp" alt={clinicInfo.doctorName} width="560" height="175" className="w-52" /></a>
        <span className="text-sm text-secondary-deep">ورود کارکنان مطب</span><h1 className="mt-2 font-dana text-3xl text-primary">{mfa ? "تأیید دومرحله‌ای" : "پنل مدیریت"}</h1>
        <p className="mt-3 text-sm leading-7 text-slate-500">{mfa ? "رمز عبور تأیید شد. هنوز وارد پنل نشده‌اید؛ کد رمزساز یا یک کد بازیابی را وارد کنید." : "ورود کارکنان مجاز مطب"}</p>
        {error && <p role="alert" className="mt-5 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
        <form onSubmit={submit} className="mt-7 space-y-4"><fieldset disabled={busy} className="min-w-0 space-y-4">
            {mfa ? <>
                <label className="block text-sm">روش تأیید<select className={field} value={method} onChange={event => { setMethod(event.target.value as "totp" | "recovery"); setCode(""); }}><option value="totp">برنامه رمزساز</option><option value="recovery">کد بازیابی یک‌بارمصرف</option></select></label>
                <label className="block text-sm">{method === "totp" ? "کد ۶ رقمی برنامه" : "کد بازیابی"}<input className={field} dir="ltr" value={code} onChange={event => setCode(event.target.value)} autoComplete="one-time-code" inputMode={method === "totp" ? "numeric" : "text"} maxLength={80} required /></label>
            </> : <>
                <label className="block text-sm">نام کاربری<input dir="ltr" className={field} autoComplete="username" value={username} onChange={event => setUsername(event.target.value)} required /></label>
                <label className="block text-sm">رمز عبور<input type="password" dir="ltr" className={field} autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} required /></label>
                {provider === "local" && <div><label className="block text-sm">کد امنیتی<input className={field} dir="ltr" value={answer} onChange={event => setAnswer(event.target.value)} inputMode="numeric" maxLength={8} required /></label><div className="mt-2 flex items-center justify-between gap-2">{captcha && <img src={captcha.image_data} alt="کد امنیتی" width="180" height="64" />}<button type="button" onClick={() => void loadCaptcha()} className="text-sm text-primary">تصویر تازه</button></div></div>}
                <BotProtection ref={bot} operation="staff_login" onProviderChange={setProvider} />
            </>}
            <button disabled={busy || (!mfa && !provider)} className="h-12 w-full rounded-xl bg-secondary font-bold text-primary disabled:opacity-50">{busy ? "در حال بررسی…" : mfa ? "تأیید و ورود" : "ورود به پنل"}</button>
            {mfa && <button type="button" onClick={() => { setMfa(null); setCode(""); setProvider(null); }} className="text-sm text-slate-500">بازگشت به ورود با رمز</button>}
        </fieldset></form>
    </div></main>;
}
