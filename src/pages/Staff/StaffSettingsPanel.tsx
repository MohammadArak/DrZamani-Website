import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from "react";
import { appointmentApi, type SystemSettings, type SettingsHistory } from "@/services/appointmentApi";
import { useStaffAccess } from "./staffAccess";
import CaptchaSetupPanel from "./CaptchaSetupPanel";
import StaffMfaPanel from "./StaffMfaPanel";

const inputClass = "mt-2 w-full min-w-0 rounded-xl border border-slate-200 bg-white p-3 text-sm outline-none focus:border-secondary";
const groups = [
    ["clinic", "اطلاعات مطب"], ["booking", "نوبت‌دهی"], ["security", "امنیت و نشست"],
    ["sms", "سرویس پیامک"], ["payment", "پرداخت"], ["captcha", "کپچا"],
    ["content", "محتوا و سئو"], ["system", "وضعیت سامانه"],
];

export default function StaffSettingsPanel({ token, clinicRevision, clinicPanel, onReload }: { token: string; clinicRevision: number; clinicPanel: ReactNode; onReload: () => Promise<void> }) {
    const can = useStaffAccess();
    const owner = can("secrets.manage");
    const [tab, setTab] = useState("clinic");
    const [data, setData] = useState<SystemSettings | null>(null);
    const [history, setHistory] = useState<SettingsHistory[]>([]);
    const [changes, setChanges] = useState<Record<string, string | number | boolean>>({});
    const [reset, setReset] = useState<string[]>([]);
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const refresh = useCallback(async () => {
        if (!owner) return;
        const [next, previous] = await Promise.all([appointmentApi.systemSettings(token), appointmentApi.settingsHistory(token)]);
        setData(next); setHistory(previous); setChanges({}); setReset([]);
    }, [owner, token]);
    useEffect(() => { let live = true; void (async () => {
        if (!owner) return;
        try {
            const [next, previous] = await Promise.all([appointmentApi.systemSettings(token), appointmentApi.settingsHistory(token)]);
            if (live) { setData(next); setHistory(previous); }
        } catch (failure) { if (live) setError(failure instanceof Error ? failure.message : "بارگیری تنظیمات ناموفق بود"); }
    })(); return () => { live = false; }; }, [owner, token, clinicRevision]);
    const update = (key: string, value: string | number | boolean) => {
        setChanges(current => ({ ...current, [key]: value }));
        setReset(current => current.filter(item => item !== key));
    };
    const resetField = (key: string) => {
        setChanges(current => { const next = { ...current }; delete next[key]; return next; });
        setReset(current => current.includes(key) ? current.filter(item => item !== key) : [...current, key]);
    };
    const save = async (event: FormEvent) => {
        event.preventDefault(); if (!data || !owner) return;
        setBusy(true); setError(""); setMessage("");
        try {
            setData(await appointmentApi.updateSystemSettings(token, data.revision, changes, reset));
            setChanges({}); setReset([]);
            setHistory(await appointmentApi.settingsHistory(token));
            const channel = typeof BroadcastChannel === "undefined" ? null : new BroadcastChannel("drz-clinic-settings");
            channel?.postMessage("updated"); channel?.close();
            await onReload(); setMessage("تنظیمات ذخیره شد؛ درخواست‌ها و کارهای زمان‌بندی‌شده بعدی نسخه جدید را می‌خوانند.");
        } catch (failure) { setError(failure instanceof Error ? failure.message : "ذخیره ناموفق بود"); }
        finally { setBusy(false); }
    };
    const restore = async (target: number) => {
        if (!data || !owner) return;
        setBusy(true); setError(""); setMessage("");
        try {
            setData(await appointmentApi.restoreSettings(token, data.revision, target));
            await refresh(); await onReload(); setMessage(`نسخه ${target} بازیابی شد و یک نسخه جدید ثبت شد.`);
        } catch (failure) { setError(failure instanceof Error ? failure.message : "بازیابی ناموفق بود"); }
        finally { setBusy(false); }
    };
    const probe = async () => {
        setBusy(true); setError(""); setMessage("");
        try { const result = await appointmentApi.probeWebhook(token); setMessage(`${result.detail} HTTP ${result.http_status}`); }
        catch (failure) { setError(failure instanceof Error ? failure.message : "اتصال ناموفق بود"); }
        finally { setBusy(false); }
    };
    const dirty = Object.keys(changes).length + reset.length;
    return <section className="min-w-0 space-y-5" dir="rtl">
        <div className="rounded-3xl border border-slate-200 bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-3"><h1 className="font-dana text-2xl text-primary">مرکز تنظیمات</h1>{owner && <button type="button" disabled={busy} className="text-sm text-primary" onClick={() => { setBusy(true); void refresh().then(onReload).catch(failure => setError(failure.message)).finally(() => setBusy(false)); }}>بارگیری آخرین نسخه</button>}</div>
            <p className="mt-2 text-sm leading-7 text-slate-500">اطلاعات عمومی با مجوز تنظیمات قابل ویرایش است. امنیت، سرویس‌ها و رمزها فقط در اختیار مدیرکل است.</p>
            <nav className="mt-4 flex flex-wrap gap-2" aria-label="بخش‌های تنظیمات">{groups.filter(([key]) => owner || ["clinic", "content"].includes(key)).map(([key, label]) => <button key={key} type="button" disabled={busy} onClick={() => { if (dirty) { setError("پیش از تغییر بخش، تغییرات را ذخیره یا با بارگیری آخرین نسخه کنار بگذارید."); return; } setTab(key); setMessage(""); setError(""); }} aria-current={tab === key ? "page" : undefined} className={`rounded-xl px-4 py-2 text-sm ${tab === key ? "bg-primary text-white" : "bg-slate-50 text-primary"}`}>{label}</button>)}</nav>
            {data && <p className="mt-3 text-xs text-slate-500">نسخه {data.revision} · محیط {data.status.environment} · تغییرات ذخیره‌نشده: {dirty}</p>}
        </div>
        {error && <p role="alert" className="rounded-xl bg-rose-50 p-4 text-sm text-rose-700">{error}</p>}
        {message && <p role="status" className="rounded-xl bg-emerald-50 p-4 text-sm leading-7 text-emerald-800">{message}</p>}
        {["clinic", "content"].includes(tab) && <div>{tab === "content" && <p className="mb-4 rounded-xl bg-sky-50 p-4 text-sm leading-7">عنوان، توضیح و تصویر پیش‌فرض سئو در فرم زیر است. ویرایشگر مقاله و مدیریت نظرات در مراحل ۶ و ۷ اضافه می‌شوند.</p>}{clinicPanel}</div>}
        {tab === "captcha" && owner && <CaptchaSetupPanel token={token} disabled={busy || Boolean(dirty)} verified={data?.status.captcha_verified} onVerified={refresh} />}
        {tab === "security" && owner && <StaffMfaPanel token={token} />}
        {tab === "booking" && <p className="rounded-xl bg-amber-50 p-4 text-sm leading-7">خاموش‌کردن رزرو، نوبت جدید، جابه‌جایی بیمار و عضویت جدید در انتظار را متوقف می‌کند؛ ورود، پرونده، لغو و بازگشت پرداخت قبلی باز می‌مانند. برنامه کاری و سیاست لغو در بخش «برنامه کاری» است. پیش از روشن‌کردن، درگاه و پیامک را در محیط آزمایشی بررسی کنید.</p>}
        {owner && !["clinic", "content"].includes(tab) && <form onSubmit={save} className="rounded-3xl border border-slate-200 bg-white p-5">
            {!data && <p>در حال بارگیری تنظیمات…</p>}
            {data && !data.status.encryption_ready && <p className="mb-5 rounded-xl bg-amber-50 p-3 text-sm leading-7">برای ذخیره رمز سرویس‌ها، کلید رمزگذاری مستقل باید در تنظیمات سرور تعریف شود.</p>}
            <fieldset disabled={busy} className="grid min-w-0 gap-5 md:grid-cols-2">
                {data?.fields.filter(field => field.group === tab).map(field => <div key={field.key} className="min-w-0 rounded-2xl border border-slate-100 p-4">
                    <label htmlFor={`setting-${field.key}`} className="block text-sm font-bold text-primary">{field.label}</label>
                    <p className="mt-2 text-xs leading-6 text-slate-500">{field.help}</p>
                    {field.secret ? <><p className="mt-2 text-xs">{field.configured ? "رمز تنظیم شده؛ مقدار نمایش داده نمی‌شود." : "رمز تنظیم نشده."}</p><input id={`setting-${field.key}`} type="password" autoComplete="new-password" dir="ltr" className={inputClass} maxLength={field.maximum ?? undefined} disabled={!data?.status.encryption_ready || reset.includes(field.key)} value={String(changes[field.key] ?? "")} onChange={event => { if (event.target.value) update(field.key, event.target.value); else setChanges(current => { const next = { ...current }; delete next[field.key]; return next; }); }} placeholder="خالی بگذارید تا رمز فعلی حفظ شود" /><button type="button" disabled={!data?.status.encryption_ready} onClick={() => update(field.key, "")} className="mt-2 text-xs text-rose-700">پاک‌کردن رمز ذخیره‌شده (حتی مقدار محیطی)</button></> : field.kind === "boolean" ? <input id={`setting-${field.key}`} type="checkbox" checked={Boolean(reset.includes(field.key) ? field.default : changes[field.key] ?? field.value)} disabled={reset.includes(field.key)} onChange={event => update(field.key, event.target.checked)} className="mt-3 h-5 w-5" /> : field.kind === "select" ? <select id={`setting-${field.key}`} className={inputClass} disabled={reset.includes(field.key)} value={String(reset.includes(field.key) ? field.default : changes[field.key] ?? field.value)} onChange={event => update(field.key, event.target.value)}>{field.choices.map(choice => <option key={choice} value={choice}>{choice}</option>)}</select> : <input id={`setting-${field.key}`} type={field.kind === "integer" ? "number" : "text"} dir={field.kind === "integer" || field.key.includes("url") ? "ltr" : undefined} min={field.minimum ?? undefined} max={field.kind === "integer" ? field.maximum ?? undefined : undefined} maxLength={field.kind === "integer" ? undefined : field.maximum ?? undefined} className={inputClass} disabled={reset.includes(field.key)} value={String(reset.includes(field.key) ? field.default : changes[field.key] ?? field.value ?? "")} onChange={event => update(field.key, field.kind === "integer" ? Number(event.target.value) : event.target.value)} />}
                    <p className="mt-3 text-xs text-slate-500">منبع: {field.source === "database" ? "پنل" : "محیط سرور یا پیش‌فرض"}</p>
                    <label className="mt-3 flex items-center gap-2 text-xs"><input type="checkbox" checked={reset.includes(field.key)} onChange={() => resetField(field.key)} />بازگشت به مقدار محیط سرور</label>
                </div>)}
            </fieldset>
            {data && <button disabled={busy || !dirty} className="mt-5 rounded-xl bg-primary px-6 py-3 text-sm text-white disabled:opacity-40">{busy ? "در حال ثبت…" : "ذخیره تغییرات"}</button>}
            {tab === "sms" && <button type="button" disabled={busy || Boolean(dirty)} onClick={() => void probe()} className="mr-3 mt-5 rounded-xl border border-slate-200 px-4 py-3 text-sm">بررسی اتصال امن وب‌هوک (بدون ارسال پیامک)</button>}
        </form>}
        {tab === "system" && data && <div className="space-y-5"><div className="rounded-3xl bg-white p-5"><h2 className="font-dana text-xl text-primary">وضعیت و تنظیمات زیرساخت</h2><p className="my-3 text-sm">خروجی HTML سایت: {data.status.public_html_ready ? "آماده" : "نیازمند ساخت"} · رمزگذاری: {data.status.encryption_ready ? "کلید تعریف شده" : "کلید تعریف نشده"}</p><p className="text-sm leading-7">دامنه‌های مجاز وب‌هوک: {data.status.webhook_allowed_hosts.join("، ") || "تعریف نشده"}</p>{data.infrastructure.map(item => <div key={item.key} className="mt-4 border-t border-slate-100 pt-3"><code dir="ltr" className="break-all text-xs">{item.key}</code><p className="text-sm leading-7 text-slate-500">{item.help}</p></div>)}</div><div className="rounded-3xl bg-white p-5"><h2 className="font-dana text-xl text-primary">تاریخچه و بازیابی</h2><p className="mt-2 text-sm leading-7 text-slate-500">بازیابی شامل اطلاعات مطب، امنیت و سرویس‌هاست. بازنشانی‌های محیطی از ENV فعلی خوانده می‌شوند. رمزها نمایش داده نمی‌شوند.</p>{history.length === 0 && <p className="mt-4 text-sm">نسخه قبلی ثبت نشده است.</p>}{history.map(item => <div key={item.revision} className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3"><div className="min-w-0"><b className="text-sm">نسخه {item.revision}</b><p className="break-all text-xs leading-6 text-slate-500">{item.changed_keys.join("، ")}</p></div><button type="button" disabled={busy || Boolean(dirty)} onClick={() => void restore(item.revision)} className="rounded-xl border px-3 py-2 text-xs">بازیابی این نسخه</button></div>)}</div></div>}
    </section>;
}
