import type { ReactNode } from "react";

export default function SettingsSaveBar({busy,dirty,label,children}: {busy:boolean;dirty:boolean;label:string;children?:ReactNode}) {
    return <div className="sticky bottom-3 z-10 mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl">
        <p className="text-sm text-slate-600">{busy ? "در حال ثبت تغییرات…" : dirty ? "تغییرات هنوز ذخیره نشده‌اند" : "تغییر ذخیره‌نشده‌ای ندارید"}</p>
        <div className="flex flex-wrap items-center gap-3">{children}<button type="submit" disabled={busy || !dirty} className="h-12 rounded-xl bg-primary px-6 text-sm font-bold text-white disabled:opacity-50">{busy ? "در حال ذخیره…" : label}</button></div>
    </div>;
}
