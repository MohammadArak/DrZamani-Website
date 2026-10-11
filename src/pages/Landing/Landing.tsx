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
        const revealHashTarget = () => { if (window.location.hash) setShow(true); };
        window.addEventListener("hashchange", revealHashTarget);
        return () => window.removeEventListener("hashchange", revealHashTarget);
    }, []);
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



    // Correct the anchor once after lazy sections mount. User input cancels it;
    // keeping a hash in the URL never schedules another scroll.
    useEffect(() => {
        let frame = 0;
        const cancel = () => { cancelAnimationFrame(frame); frame = 0; };
        const navigate = () => {
            cancel();
            let id = window.location.hash.slice(1);
            try { id = decodeURIComponent(id); } catch { return; }
            if (!id) return;
            const deadline = performance.now() + 3000;
            const ready = () => {
                const target = document.getElementById(id);
                const pending = document.querySelector('[aria-label="در حال آماده‌سازی بخش بعدی"]');
                if (target && !target.hasAttribute("aria-hidden") && !pending) {
                    frame = 0;
                    target.scrollIntoView({ behavior: "instant" });
                } else if (performance.now() < deadline) frame = requestAnimationFrame(ready);
            };
            frame = requestAnimationFrame(ready);
        };
        const events = ["wheel", "touchstart", "pointerdown", "keydown"] as const;
        events.forEach(event => window.addEventListener(event, cancel, { passive: true, capture: true }));
        window.addEventListener("hashchange", navigate);
        navigate();
        return () => {
            cancel();
            events.forEach(event => window.removeEventListener(event, cancel, true));
            window.removeEventListener("hashchange", navigate);
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

            <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:right-2 focus:z-[100] focus:rounded-lg focus:bg-white focus:px-5 focus:py-3 focus:text-primary">رفتن به محتوای اصلی</a>
            <main id="main-content" tabIndex={-1} className="text-base pb-16 md:pb-0">
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
