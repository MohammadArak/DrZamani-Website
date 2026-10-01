import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import { appointmentApi, AppointmentApiError, type BotChallenge, type BotOperation, type BotProof } from "@/services/appointmentApi";

type Turnstile = { render: (element: HTMLElement, options: Record<string, unknown>) => string; remove: (id: string) => void };
type Enterprise = { ready: (callback: () => void) => void; execute: (key: string, options: { action: string }) => Promise<string> };
declare global { interface Window { turnstile?: Turnstile; grecaptcha?: { enterprise?: Enterprise }; } }
const scripts = new Map<string, Promise<void>>();
function loadScript(url: string) {
    if (!scripts.has(url)) scripts.set(url, new Promise<void>((resolve, reject) => {
        const tag = document.createElement("script");
        const timer = window.setTimeout(() => { tag.remove(); scripts.delete(url); reject(new Error("سرویس امنیتی در مرورگر بارگیری نشد؛ اتصال را بررسی کنید.")); }, 12000);
        tag.src = url; tag.async = true; tag.referrerPolicy = "strict-origin-when-cross-origin";
        tag.onload = () => { clearTimeout(timer); resolve(); };
        tag.onerror = () => { clearTimeout(timer); tag.remove(); scripts.delete(url); reject(new Error("بارگیری سرویس امنیتی ممکن نیست.")); };
        document.head.append(tag);
    }));
    return scripts.get(url)!;
}
export type BotHandle = { proof: () => Promise<BotProof | undefined>; retry: (failure?: unknown) => void };
type Props = { operation?: BotOperation; setupChallenge?: BotChallenge; onProviderChange?: (provider: BotChallenge["provider"]) => void };

const BotProtection = forwardRef<BotHandle, Props>(function BotProtection({ operation, setupChallenge, onProviderChange }, ref) {
    const [challenge, setChallenge] = useState<BotChallenge | null>(setupChallenge ?? null);
    const [nonce, setNonce] = useState(0);
    const [token, setToken] = useState("");
    const [error, setError] = useState("");
    const [ready, setReady] = useState(false);
    const container = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (setupChallenge) return;
        let live = true;
        if (operation) void appointmentApi.botChallenge(operation).then(data => { if (live) { setChallenge(data); setError(""); } }).catch(failure => { if (live) setError(failure.message); });
        return () => { live = false; };
    }, [operation, setupChallenge, nonce]);
    useEffect(() => { if (challenge) onProviderChange?.(challenge.provider); }, [challenge, onProviderChange]);
    useEffect(() => {
        let live = true; let widget: string | null = null;
        setToken(""); setReady(false);
        if (!challenge || ["none", "local"].includes(challenge.provider)) return;
        const url = challenge.provider === "google" ? `https://www.google.com/recaptcha/enterprise.js?render=${encodeURIComponent(challenge.site_key)}&hl=fa` : "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
        void loadScript(url).then(() => {
            if (!live) return;
            if (challenge.provider === "google") { setReady(true); return; }
            if (!container.current || !window.turnstile) throw new Error("سرویس امنیتی بارگیری نشد");
            widget = window.turnstile.render(container.current, { sitekey: challenge.site_key, action: challenge.operation, language: "fa", size: "flexible",
                callback: (value: string) => { if (live) { setToken(value); setError(""); } },
                "expired-callback": () => { if (live) setToken(""); },
                "error-callback": () => { if (live) { setToken(""); setError("تأیید کلادفلر ممکن نشد؛ دوباره تلاش کنید."); } },
            }); setReady(true);
        }).catch(failure => { if (live) setError(failure.message); });
        return () => { live = false; if (widget) window.turnstile?.remove(widget); };
    }, [challenge]);
    const retry = useCallback((failure?: unknown) => {
        setToken(""); setReady(false); setError("");
        if (failure instanceof AppointmentApiError && failure.botChallenge) setChallenge(failure.botChallenge);
        else if (setupChallenge) setError("این تأیید مصرف شده است؛ آزمون کلید را دوباره آغاز کنید.");
        else { setChallenge(null); setNonce(value => value + 1); }
    }, [setupChallenge]);
    useImperativeHandle(ref, () => ({ retry, proof: async () => {
        if (!challenge || (operation && challenge.operation !== operation)) throw new Error("تأیید امنیتی هنوز آماده نیست؛ کمی صبر کنید.");
        if (["none", "local"].includes(challenge.provider)) return undefined;
        if (!ready) throw new Error(error || "تأیید امنیتی هنوز آماده نیست.");
        if (challenge.provider === "turnstile") {
            if (!token) throw new Error("لطفاً تأیید امنیتی کلادفلر را کامل کنید.");
            return { challenge_id: challenge.challenge_id, token };
        }
        const enterprise = window.grecaptcha?.enterprise;
        if (!enterprise) throw new Error("گوگل بارگیری نشده است.");
        const value = await new Promise<string>((resolve, reject) => {
            const timer = window.setTimeout(() => reject(new Error("گوگل پاسخ نداد؛ دوباره تلاش کنید.")), 12000);
            enterprise.ready(() => { void enterprise.execute(challenge.site_key, { action: challenge.operation }).then(data => { clearTimeout(timer); resolve(data); }).catch(() => { clearTimeout(timer); reject(new Error("تأیید گوگل ممکن نشد.")); }); });
        });
        return { challenge_id: challenge.challenge_id, token: value };
    } }), [challenge, operation, ready, error, token, retry]);
    return <div className="min-w-0 space-y-2" dir="rtl">
        {(!challenge || !ready) && !["none", "local"].includes(challenge?.provider ?? "") && !error && <p role="status" className="text-xs text-slate-500">در حال آماده‌سازی تأیید امنیتی…</p>}
        {challenge?.provider === "turnstile" && <div ref={container} className="min-w-0" />}
        {challenge?.provider === "google" && <p className="text-xs leading-6 text-slate-500">این اقدام با Google Fraud Defense بررسی می‌شود. <a href="https://policies.google.com/privacy" target="_blank" rel="noreferrer">حریم خصوصی</a> · <a href="https://policies.google.com/terms" target="_blank" rel="noreferrer">شرایط گوگل</a></p>}
        {challenge?.fallback_used && <p className="text-xs text-amber-800">سرویس جایگزین با تأیید سرور انتخاب شده است.</p>}
        {error && <p role="alert" className="text-xs text-rose-700">{error}</p>}
        {!setupChallenge && challenge?.provider !== "none" && challenge?.provider !== "local" && <button type="button" onClick={() => retry()} className="text-xs text-primary">تازه‌سازی تأیید امنیتی</button>}
    </div>;
});
export default BotProtection;
