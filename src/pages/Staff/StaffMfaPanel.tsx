import { useEffect, useState, type FormEvent } from "react";
import { appointmentApi, type MfaEnrollment, type MfaStatus } from "@/services/appointmentApi";

const input = "mt-2 w-full min-w-0 rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-secondary";
export default function StaffMfaPanel({ token }: { token: string }) {
    const [status, setStatus] = useState<MfaStatus | null>(null);
    const [enrollment, setEnrollment] = useState<MfaEnrollment | null>(null);
    const [password, setPassword] = useState(""); const [code, setCode] = useState("");
    const [method, setMethod] = useState<"totp" | "recovery">("totp");
    const [recovery, setRecovery] = useState<string[]>([]);
    const [finished, setFinished] = useState(false); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
    useEffect(() => { let live = true; void appointmentApi.mfaStatus(token).then(value => { if (live) setStatus(value); }).catch(failure => { if (live) setError(failure.message); }); return () => { live = false; }; }, [token]);
    const action = async (kind: "enroll" | "confirm" | "recovery" | "disable") => {
        setBusy(true); setError("");
        try {
            const payload = { password, code, method };
            if (kind === "enroll") setEnrollment(await appointmentApi.mfaEnroll(token, payload));
            else if (kind === "confirm" && enrollment) { const result = await appointmentApi.mfaConfirm(token, enrollment.enrollment_id, code); setRecovery(result.recovery_codes); setEnrollment(null); setFinished(true); }
            else if (kind === "recovery") { const result = await appointmentApi.mfaRecovery(token, payload); setRecovery(result.recovery_codes); setFinished(true); }
            else if (kind === "disable") { await appointmentApi.mfaDisable(token, payload); setFinished(true); }
            setPassword(""); setCode("");
        } catch (failure) { setError(failure instanceof Error ? failure.message : "عملیات ممکن نشد"); }
        finally { setBusy(false); }
    };
    const submit = (event: FormEvent) => { event.preventDefault(); void action(enrollment ? "confirm" : "enroll"); };
    return <section className="min-w-0 rounded-3xl border border-slate-200 bg-white p-5" dir="rtl">
        <h2 className="font-dana text-2xl text-primary">ورود دومرحله‌ای حساب من</h2>
        <p className="mt-3 text-sm leading-7 text-slate-500">برنامه رمزساز مثل Google Authenticator یا Microsoft Authenticator کد زمان‌دار می‌سازد. ساعت دستگاه باید درست باشد. کلید راه‌اندازی و کدهای بازیابی را خصوصی نگه دارید؛ روی دستگاه مشترک ذخیره نکنید.</p>
        {error && <p role="alert" className="mt-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
        {!status && !error && <p className="mt-4">در حال بارگیری…</p>}
        {finished ? <div className="mt-5 space-y-4"><p role="status" className="rounded-xl bg-emerald-50 p-4 text-sm leading-7">تغییر ثبت شد و نشست‌های قبلی باطل شدند. {recovery.length > 0 && "این کدها فقط همین بار نمایش داده می‌شوند؛ پیش از ادامه آن‌ها را در محل امن ذخیره کنید."}</p>
            {recovery.length > 0 && <pre dir="ltr" className="max-w-full overflow-x-auto rounded-xl bg-slate-50 p-4 text-left text-xs leading-8">{recovery.join("\n")}</pre>}
            <button type="button" onClick={() => { setRecovery([]); window.dispatchEvent(new Event("drz:staff-expired")); }} className="rounded-xl bg-primary px-5 py-3 text-sm text-white">{recovery.length ? "کدها را ذخیره کردم؛ ورود دوباره" : "ورود دوباره"}</button>
        </div> : status && <>
            <p className="mt-4 text-sm">وضعیت: {status.enabled ? "فعال" : "فعال نشده"} · سیاست مدیرکل: {status.required ? "اجباری" : "اختیاری"} · کد بازیابی باقی‌مانده: {status.recovery_remaining}</p>
            {!status.encryption_ready && <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm">کلید مستقل رمزگذاری باید ابتدا در سرور تعریف شود.</p>}
            <form onSubmit={submit} className="mt-5"><fieldset disabled={busy || !status.encryption_ready} className="grid min-w-0 gap-4 md:grid-cols-2">
                {enrollment ? <>
                    <div className="min-w-0 md:col-span-2"><p className="text-sm leading-7">در برنامه رمزساز «ورود دستی کلید» را انتخاب کنید: نوع زمان‌دار، ۶ رقم، دوره ۳۰ ثانیه. این کلید ده دقیقه اعتبار راه‌اندازی دارد؛ تا کد درست تأیید نشود عامل قبلی تغییر نمی‌کند.</p><code dir="ltr" className="mt-3 block break-all rounded-xl bg-slate-50 p-4 text-left text-sm select-all">{enrollment.secret}</code><a href={enrollment.otpauth_uri} className="mt-3 inline-block text-sm text-primary">باز کردن در برنامه رمزساز همین دستگاه</a></div>
                    <label className="text-sm">کد ۶ رقمی برنامه<input dir="ltr" className={input} value={code} onChange={event => setCode(event.target.value)} inputMode="numeric" autoComplete="one-time-code" maxLength={6} required /></label>
                </> : <>
                    <label className="text-sm">رمز فعلی حساب<input type="password" dir="ltr" className={input} value={password} onChange={event => setPassword(event.target.value)} autoComplete="current-password" required /></label>
                    {status.enabled && <><label className="text-sm">روش تأیید<select className={input} value={method} onChange={event => setMethod(event.target.value as "totp" | "recovery")}><option value="totp">کد رمزساز</option><option value="recovery">کد بازیابی</option></select></label><label className="text-sm">کد تأیید فعلی<input dir="ltr" className={input} value={code} onChange={event => setCode(event.target.value)} autoComplete="one-time-code" maxLength={80} required /></label></>}
                </>}
                <div className="flex flex-wrap gap-3 md:col-span-2"><button className="rounded-xl bg-primary px-5 py-3 text-sm text-white">{busy ? "در حال ثبت…" : enrollment ? "تأیید و دریافت کدهای بازیابی" : status.enabled ? "راه‌اندازی دستگاه جدید" : "شروع راه‌اندازی رمزساز"}</button>
                    {!enrollment && status.enabled && <><button type="button" onClick={() => void action("recovery")} className="rounded-xl border px-4 py-3 text-sm">تعویض کدهای بازیابی</button><button type="button" disabled={status.required} onClick={() => void action("disable")} className="rounded-xl border px-4 py-3 text-sm text-rose-700 disabled:opacity-40">غیرفعال‌کردن عامل دوم</button></>}
                    {enrollment && <button type="button" onClick={() => { setEnrollment(null); setCode(""); }} className="text-sm text-slate-500">لغو نمایش راه‌اندازی</button>}
                </div>
            </fieldset></form>
        </>}
    </section>;
}
