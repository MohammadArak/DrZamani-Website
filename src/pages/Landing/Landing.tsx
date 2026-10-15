import useDeferredImages from "./useDeferredImages";
import HeroContent from "./components/HeroContent";
import NavigationBar from "./components/NavigationBar";

import { lazy, Suspense, useEffect } from "react";
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

const SectionFallback = ({ id, minHeight = "760px" }: { id?: string; minHeight?: string }) => (
    <div id={id} style={{ minHeight }} className="bg-white flex flex-col items-center justify-center gap-4" role="status" aria-label="در حال آماده‌سازی بخش بعدی">
        <img src="/img/logo/logo-loading.png" width={64} height={64} alt="" decoding="async" />
        <span className="text-primary">در حال آماده‌سازی این بخش…</span>
    </div>
);

const Landing = () => {

    const { clinicInfo } = useClinicInfo();
    useDeferredImages();



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
            let previous = "";
            let stableSince = performance.now();
            const ready = () => {
                const target = document.getElementById(id);
                const pending = document.querySelector('[aria-label="در حال آماده‌سازی بخش بعدی"]');
                const now = performance.now();
                if (target && !target.hasAttribute("aria-hidden") && !pending) {
                    const rect = target.getBoundingClientRect();
                    const layout = `${Math.round(rect.top + window.scrollY)}:${Math.round(rect.height)}`;
                    if (layout !== previous || document.fonts.status !== "loaded") {
                        previous = layout;
                        stableSince = now;
                    } else if (now - stableSince >= 250) {
                        frame = 0;
                        target.scrollIntoView({ behavior: "instant" });
                        return;
                    }
                } else stableSince = now;
                if (now < deadline) frame = requestAnimationFrame(ready);
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
                title={clinicInfo.seoTitle || `وبسایت رسمی ${clinicInfo.doctorName}`}
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
            <main id="main-content" tabIndex={-1} className="text-base" style={{paddingBottom:"var(--mobile-nav-space, 0px)",backgroundColor:"#293241"}}>
                <NavigationBar />
                <HeroContent />
                <Suspense fallback={<SectionFallback />}>
                    <AboutUs />
                </Suspense>
                <Suspense fallback={<SectionFallback id="services" minHeight="760px" />}>
                    <Services />
                </Suspense>
                <Suspense fallback={<SectionFallback id="comments" minHeight="720px" />}>
                    <PatientsComments />
                </Suspense>
                <Suspense fallback={<SectionFallback id="samples" minHeight="820px" />}>
                    <Samples />
                </Suspense>
                <Suspense fallback={<SectionFallback id="articles" minHeight="820px" />}>
                    <BlogPreview />
                </Suspense>
                <Suspense fallback={<SectionFallback id="faq" minHeight="700px" />}>
                    <FAQ />
                </Suspense>
                <Suspense fallback={<SectionFallback id="footer" minHeight="820px" />}>
                    <Footer />
                </Suspense>
            </main>
            <Suspense fallback={null}>
                <MobileTabBar />
            </Suspense>
        </>
    );
};

export default Landing;
