import { StrictMode } from "react";
import { createPortal } from "react-dom";
import { createRoot } from "react-dom/client";
import { ClinicInfoProvider } from "@/contexts/ClinicInfoContext";
import NavigationBar from "@/pages/Landing/components/NavigationBar";
import Footer from "@/pages/Landing/components/Footer";

/**
 * Server-rendered pages (articles, services) keep their own indexable HTML, but the header and the footer
 * are the very same React components the homepage uses. They are mounted into #site-header / #site-footer,
 * replacing the plain-HTML fallback the server put there for crawlers and no-JS visitors.
 */
/** Items that start below the fold hold their entrance until they scroll into view (above-the-fold ones just play). */
function initReveal() {
    if (!("IntersectionObserver" in window) || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const waiting = [...document.querySelectorAll<HTMLElement>(".rv")].filter(
        (element) => element.getBoundingClientRect().top > window.innerHeight * 0.92,
    );
    if (!waiting.length) return;
    waiting.forEach((element) => element.classList.add("rv-wait"));
    const observer = new IntersectionObserver(
        (entries) => {
            for (const entry of entries) {
                if (!entry.isIntersecting) continue;
                entry.target.classList.remove("rv-wait");
                entry.target.classList.add("rv-go");
                observer.unobserve(entry.target);
            }
        },
        { rootMargin: "0px 0px -8% 0px" },
    );
    waiting.forEach((element) => observer.observe(element));
}

export function mountChrome() {
    initReveal();
    const header = document.getElementById("site-header");
    const footer = document.getElementById("site-footer");
    if (!header && !footer) return;
    header?.replaceChildren();
    footer?.replaceChildren();
    const host = document.createElement("div");
    document.body.appendChild(host);
    createRoot(host).render(
        <StrictMode>
            <ClinicInfoProvider>
                {header && createPortal(<NavigationBar solid={header.dataset.solid === "1"} />, header)}
                {footer && createPortal(<Footer />, footer)}
            </ClinicInfoProvider>
        </StrictMode>,
    );
}
