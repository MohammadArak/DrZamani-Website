import { useId, useRef } from "react";
import useModalScope from "@/hooks/useModalScope";
import RavielCredit from "./RavielCredit";
import brandCss from "../../api/app/brand_credit.css?inline";
import records from "../../api/app/status_pages.json";
import css from "../../api/app/status_page.css?inline";
import missing from "../../api/app/status_symbols/missing.svg?raw";
import maintenance from "../../api/app/status_symbols/maintenance.svg?raw";
import connection from "../../api/app/status_symbols/connection.svg?raw";

const symbols = { missing, maintenance, connection };
export type StatusKind = keyof typeof symbols;
export default function StatusPage({ kind, onRetry,onDismiss, overlay = false }: { kind:StatusKind; onRetry?:()=>void;onDismiss?:()=>void; overlay?:boolean }) {
    const item = records[kind];
    const isStaff=/^\/staff(?:\/|$)/.test(window.location.pathname);
    const titleId=useId(),descriptionId=useId();
    const first = useRef<HTMLButtonElement>(null);
    const page = useModalScope<HTMLElement>(overlay,onDismiss,false,first);
    return <main ref={page} tabIndex={overlay?-1:undefined} dir="rtl" className={`site-status site-status--${kind}${overlay ? " site-status--overlay" : ""}`} role={overlay ? "alertdialog" : undefined} aria-modal={overlay || undefined} aria-labelledby={titleId} aria-describedby={descriptionId}>
        <style>{css + brandCss}</style><div className="site-status__card">
            <a href="/" className="site-status__brand"><img src="/img/logo/logo-dark-full.webp" width={320} height={100} alt="وبسایت دکتر فرزاد زمانی" /></a>
            <div className="site-status__symbol" aria-hidden="true" dangerouslySetInnerHTML={{__html:symbols[kind]}} />
            {item.code && <p className="site-status__code">{item.code}</p>}<p className="site-status__label">{item.label}</p>
            <h1 id={titleId}>{item.title}</h1><p className="site-status__description" id={descriptionId}>{item.description}</p>
            <nav className="site-status__actions" aria-label="ادامهٔ مسیر">
                {kind !== "missing" && <button ref={first} type="button" onClick={onRetry ?? (()=>window.location.reload())}>{item.action}</button>}
                <a href="/" className={kind === "missing" ? "" : "site-status__secondary"}>{kind === "missing" ? item.action : "صفحه اصلی"}</a>
            {kind === "missing" && <a className="site-status__secondary" href="/articles/">مشاهدهٔ مقالات</a>}
            {overlay&&onDismiss&&<button type="button" onClick={onDismiss}>بازگشت به صفحه</button>}
            </nav>{overlay && <p className="site-status__preserved">اطلاعات واردشده در همین صفحه حفظ شده است.</p>}
            {!isStaff&&<footer className="site-status__credit"><RavielCredit /></footer>}
        </div>
    </main>;
}
