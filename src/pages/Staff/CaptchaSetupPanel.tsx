import BotProtection,{ type BotHandle } from "@/components/BotProtection";
import { appointmentApi,type BotChallenge } from "@/services/appointmentApi";
import { useRef,useState } from "react";

export default function CaptchaSetupPanel({ token, onVerified, disabled, verified }: { token: string; onVerified: () => Promise<void>; disabled: boolean; verified?: {google: boolean; turnstile: boolean} }) {
    const [challenge, setChallenge] = useState<BotChallenge | null>(null);
    const [busy, setBusy] = useState(false); const [message, setMessage] = useState(""); const [error, setError] = useState("");
    const bot = useRef<BotHandle>(null);
    const start = async (provider: "google" | "turnstile") => {
        setBusy(true); setError(""); setMessage(""); setChallenge(null);
        try { setChallenge(await appointmentApi.captchaSetup(token, provider)); } catch (failure) { setError(failure instanceof Error ? failure.message : "آزمون شروع نشد"); } finally { setBusy(false); }
    };
    const confirm = async () => {
        setBusy(true); setError("");
        try { const proof = await bot.current?.proof(); if (!proof) throw new Error("تأیید امنیتی آماده نیست"); await appointmentApi.captchaConfirm(token, proof); setChallenge(null); await onVerified(); setMessage("کلیدهای این ارائه‌دهنده تأیید شدند؛ اکنون گزینه فعال بودن را می‌توانید ذخیره کنید."); }
        catch (failure) { setError(failure instanceof Error ? failure.message : "تأیید ممکن نشد"); setChallenge(null); }
        finally { setBusy(false); }
    };
    return <div className="rounded-3xl border border-slate-200 bg-white p-5">
        <h2 className="font-dana text-xl text-primary">آزمون کلیدهای کپچا پیش از فعال‌سازی</h2><p className="mt-3 text-sm leading-7 text-slate-500">ابتدا کلیدها را با حالت خاموش ذخیره کنید. سپس آزمون را در دامنه مجاز انجام دهید؛ فقط پس از تأیید سرور روشن می‌شود. آزمون واقعی از سهمیه حساب ارائه‌دهنده استفاده می‌کند. داده پرونده یا شماره بیمار ارسال نمی‌شود.</p>
        <p className="mt-3 text-sm leading-7">اعتبار کلیدهای ذخیره‌شده: Cloudflare {verified?.turnstile ? "تأییدشده" : "تأیید نشده"} · Google {verified?.google ? "تأییدشده" : "تأیید نشده"}</p>
        <div className="mt-4 flex flex-wrap gap-3"><button type="button" disabled={disabled || busy} onClick={() => void start("turnstile")} className="rounded-xl border px-4 py-3 text-sm disabled:opacity-40">آزمون Cloudflare</button><button type="button" disabled={disabled || busy} onClick={() => void start("google")} className="rounded-xl border px-4 py-3 text-sm disabled:opacity-40">آزمون Google</button></div>
        {challenge && <div className="mt-4 space-y-3"><BotProtection ref={bot} setupChallenge={challenge} /><button type="button" disabled={busy} onClick={() => void confirm()} className="rounded-xl bg-primary px-5 py-3 text-sm text-white">تأیید کلید با سرور</button></div>}
        {error && <p role="alert" className="mt-4 text-sm text-rose-700">{error}</p>}{message && <p role="status" className="mt-4 text-sm text-emerald-700">{message}</p>}
    </div>;
}
