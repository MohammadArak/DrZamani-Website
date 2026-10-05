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
export function mountChrome() {
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
