import HeroContent from "./components/HeroContent";
import NavigationBar from "./components/NavigationBar";

import { lazy, Suspense, useEffect, useRef, useState, type ReactNode } from "react";
import Seo from "@/components/SEO";
import { useClinicInfo } from "@/contexts/ClinicInfoContext";

const AboutUs = lazy(() => import("./components/AboutUs"));
const MobileTabBar = lazy(() => import("./components/MobileTabBar"));
const Services = lazy(() => import("./components/Services"));
const PatientsComments = lazy(() => import("./components/PatientsComments"));
const Samples = lazy(() => import("./components/Samples"));
const BlogPreview = lazy(() => import("./components/BlogPreview"));
const FAQ = lazy(() => import("./components/FAQ"));
const Footer = lazy(() => import("./components/Footer"));

const SectionFallback = () => (
    <div
        className="min-h-32 bg-white"
        role="status"
        aria-label="در حال آماده‌سازی بخش بعدی"
    />
);

/**
 * Mounts a below-the-fold section (and downloads its code and data) only when it is about to be scrolled into view.
 * Nothing about the page changes for the visitor: the section still plays its own entrance animation when it
 * appears. The placeholder keeps the section's anchor id and an estimated height, so menu links and the footer
 * link still land in the right place; with a #hash in the address everything mounts at once.
 */
const Deferred = ({ id, minHeight, children }: { id: string; minHeight: string; children: ReactNode }) => {
    const holder = useRef<HTMLDivElement>(null);
    const [show, setShow] = useState(() => typeof IntersectionObserver === "undefined" || window.location.hash !== "");
    useEffect(() => {
        const node = holder.current;
        if (show || !node) return;
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries.some((entry) => entry.isIntersecting)) setShow(true);
            },
            { rootMargin: "1400px 0px" },
        );
        observer.observe(node);
        return () => observer.disconnect();
    }, [show]);
    if (show) return <>{children}</>;
    return <div ref={holder} id={id} style={{ minHeight }} aria-hidden="true" />;
};

const Landing = () => {
    const { clinicInfo } = useClinicInfo();

    // Sections load as you go, so a link like /#footer first lands on a placeholder: settle on the real target once
    // the page has grown, unless the visitor has already started scrolling by themselves.
    useEffect(() => {
        const id = decodeURIComponent(window.location.hash.slice(1));
        if (!id) return;
        let touched = false;
        const stop = () => { touched = true; };
        window.addEventListener("wheel", stop, { passive: true });
        window.addEventListener("touchmove", stop, { passive: true });
        window.addEventListener("keydown", stop);
        const timers = [900, 2000, 3500].map((delay) =>
            window.setTimeout(() => { if (!touched) document.getElementById(id)?.scrollIntoView(); }, delay),
        );
        return () => {
            timers.forEach(window.clearTimeout);
            window.removeEventListener("wheel", stop);
            window.removeEventListener("touchmove", stop);
            window.removeEventListener("keydown", stop);
        };
    }, []);

    return (
        <>
            <Seo
                title={clinicInfo.seoTitle || `${clinicInfo.doctorName} | ${clinicInfo.specialty}`}
                description={clinicInfo.seoDescription || `وب‌سایت رسمی ${clinicInfo.doctorName}، ${clinicInfo.specialty} در ${clinicInfo.address.city}؛ معرفی خدمات و راه‌های ارتباطی.`}
                image={clinicInfo.seoImageUrl || `${clinicInfo.siteUrl}/og-cover.jpg`}
                canonical={`${clinicInfo.siteUrl}/`}
                keywords={[
                    clinicInfo.doctorName,
                    `جراح بینی در ${clinicInfo.address.city}`,
                    `متخصص گوش حلق و بینی ${clinicInfo.address.city}`,
                    "رینوپلاستی",
                    "عمل بینی",
                ]}
            />

            <main className="text-base pb-16 md:pb-0">
                <NavigationBar />
                <HeroContent />
                <Suspense fallback={<SectionFallback />}>
                    <AboutUs />
                </Suspense>
                <Deferred id="services" minHeight="760px">
                    <Suspense fallback={<SectionFallback />}>
                        <Services />
                    </Suspense>
                </Deferred>
                <Deferred id="comments" minHeight="720px">
                    <Suspense fallback={<SectionFallback />}>
                        <PatientsComments />
                    </Suspense>
                </Deferred>
                <Deferred id="samples" minHeight="820px">
                    <Suspense fallback={<SectionFallback />}>
                        <Samples />
                    </Suspense>
                </Deferred>
                <Deferred id="articles" minHeight="820px">
                    <Suspense fallback={<SectionFallback />}>
                        <BlogPreview />
                    </Suspense>
                </Deferred>
                <Deferred id="faq" minHeight="700px">
                    <Suspense fallback={<SectionFallback />}>
                        <FAQ />
                    </Suspense>
                </Deferred>
                <Deferred id="footer" minHeight="820px">
                    <Suspense fallback={<SectionFallback />}>
                        <Footer />
                    </Suspense>
                </Deferred>
            </main>
            <Suspense fallback={null}>
                <MobileTabBar />
            </Suspense>
        </>
    );
};

export default Landing;
