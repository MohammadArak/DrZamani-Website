import { appointmentApi, type MfaStatus } from "@/services/appointmentApi";
import { useEffect, useState, type FormEvent } from "react";

const input = "mt-2 w-full min-w-0 rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-secondary";

export default function StaffPasswordPanel({ token }: { token: string }) {
    const [status, setStatus] = useState<MfaStatus | null>(null);
    const [current, setCurrent] = useState("");
    const [next, setNext] = useState("");
    const [repeat, setRepeat] = useState("");
    const [code, setCode] = useState("");
    const [method, setMethod] = useState<"totp" | "recovery">("totp");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const [done, setDone] = useState(false);

    useEffect(() => {
        let live = true;
        void appointmentApi.mfaStatus(token).then((value) => { if (live) setStatus(value); }).catch(() => undefined);
        return () => { live = false; };
    }, [token]);

    const submit = async (event: FormEvent) => {
        event.preventDefault();
        if (next.length < 12) { setError("رمز تازه باید دست‌کم ۱۲ نویسه باشد."); return; }
        if (next !== repeat) { setError("تکرار رمز تازه با خود رمز یکی نیست."); return; }
        setBusy(true);
        setError("");
        try {
            await appointmentApi.changePassword(token, { password: current, new_password: next, code, method });
            setDone(true);
            setCurrent(""); setNext(""); setRepeat(""); setCode("");
        } catch (failure) {
            setError(failure instanceof Error ? failure.message : "تغییر رمز ممکن نشد");
        } finally {
            setBusy(false);
        }
    };

    return (
        <section className="mt-6 min-w-0 rounded-3xl border border-slate-200 bg-white p-5" dir="rtl">
            <h2 className="font-dana text-2xl text-primary">تغییر رمز عبور من</h2>
            <p className="mt-3 text-sm leading-7 text-slate-500">پس از تغییر، همه‌ی نشست‌های این حساب بسته می‌شوند و باید دوباره وارد شوید. رمز دست‌کم ۱۲ نویسه و متفاوت از رمز فعلی باشد.</p>
            {error && <p role="alert" className="mt-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
            {done ? (
                <div className="mt-5 space-y-4">
                    <p role="status" className="rounded-xl bg-emerald-50 p-4 text-sm leading-7">رمز تغییر کرد و نشست‌های قبلی باطل شدند.</p>
                    <button type="button" onClick={() => window.dispatchEvent(new Event("drz:staff-expired"))} className="rounded-xl bg-primary px-5 py-3 text-sm text-white">ورود دوباره</button>
                </div>
            ) : (
                <form onSubmit={(event) => void submit(event)} className="mt-5">
                    <fieldset disabled={busy} className="grid min-w-0 gap-4 md:grid-cols-2">
                        <label className="text-sm md:col-span-2">رمز فعلی<input type="password" dir="ltr" className={input} value={current} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" required /></label>
                        <label className="text-sm">رمز تازه<input type="password" dir="ltr" className={input} value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" minLength={12} maxLength={128} required /></label>
                        <label className="text-sm">تکرار رمز تازه<input type="password" dir="ltr" className={input} value={repeat} onChange={(e) => setRepeat(e.target.value)} autoComplete="new-password" minLength={12} maxLength={128} required /></label>
                        {status?.enabled && (
                            <>
                                <label className="text-sm">روش تأیید
                                    <select className={input} value={method} onChange={(e) => setMethod(e.target.value as "totp" | "recovery")}>
                                        <option value="totp">کد رمزساز</option>
                                        <option value="recovery">کد بازیابی</option>
                                    </select>
                                </label>
                                <label className="text-sm">کد تأیید<input dir="ltr" className={input} value={code} onChange={(e) => setCode(e.target.value)} autoComplete="one-time-code" required /></label>
                            </>
                        )}
                        <div className="md:col-span-2"><button className="rounded-xl bg-primary px-5 py-3 text-sm text-white">{busy ? "در حال ثبت…" : "تغییر رمز"}</button></div>
                    </fieldset>
                </form>
            )}
        </section>
    );
}
