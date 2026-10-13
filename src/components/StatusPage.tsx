import { useEffect, useId, useRef, type KeyboardEvent } from "react";
import records from "../../api/app/status_pages.json";
import css from "../../api/app/status_page.css?inline";
import missing from "../../api/app/status_symbols/missing.svg?raw";
import maintenance from "../../api/app/status_symbols/maintenance.svg?raw";
import connection from "../../api/app/status_symbols/connection.svg?raw";

const symbols = { missing, maintenance, connection };
export type StatusKind = keyof typeof symbols;
export default function StatusPage({ kind, onRetry, overlay = false }: { kind:StatusKind; onRetry?:()=>void; overlay?:boolean }) {
    const item = records[kind];
    const titleId=useId(),descriptionId=useId();
    const first = useRef<HTMLButtonElement>(null);
    useEffect(() => {
        if (!overlay) return;
        const previous = document.activeElement as HTMLElement | null;
        first.current?.focus();
        return () => previous?.focus();
    }, [overlay]);
    const trap = (event:KeyboardEvent<HTMLElement>) => {
        if (!overlay || event.key !== "Tab") return;
        const controls = [...event.currentTarget.querySelectorAll<HTMLElement>('a[href],button')];
        const start=controls[0], end=controls[controls.length-1];
        if (event.shiftKey && document.activeElement === start) { event.preventDefault(); end?.focus(); }
        else if (!event.shiftKey && document.activeElement === end) { event.preventDefault(); start?.focus(); }
    };
    return <main dir="rtl" className={`site-status${overlay ? " site-status--overlay" : ""}`} role={overlay ? "alertdialog" : undefined} aria-modal={overlay || undefined} aria-labelledby={titleId} aria-describedby={descriptionId} onKeyDown={trap}>
        <style>{css}</style><div className="site-status__card">
            <a href="/" className="site-status__brand"><img src="/img/logo/logo-loading.png" width={44} height={44} alt="" />وبسایت دکتر فرزاد زمانی</a>
            <div className="site-status__symbol" aria-hidden="true" dangerouslySetInnerHTML={{__html:symbols[kind]}} />
            {item.code && <p className="site-status__code">{item.code}</p>}<p className="site-status__label">{item.label}</p>
            <h1 id={titleId}>{item.title}</h1><p className="site-status__description" id={descriptionId}>{item.description}</p>
            <nav className="site-status__actions" aria-label="ادامهٔ مسیر">
                {kind !== "missing" && <button ref={first} type="button" onClick={onRetry ?? (()=>window.location.reload())}>{item.action}</button>}
                <a href="/" className={kind === "missing" ? "" : "site-status__secondary"}>{kind === "missing" ? item.action : "صفحه اصلی"}</a>
            {kind === "missing" && <a className="site-status__secondary" href="/articles/">مشاهدهٔ مقالات</a>}
            </nav>{overlay && <p className="site-status__preserved">اطلاعات واردشده در همین صفحه حفظ شده است.</p>}
        </div>
    </main>;
}
