import HeroContent from "./components/HeroContent";
import NavigationBar from "./components/NavigationBar";

import { lazy, Suspense } from "react";
import Seo from "@/components/SEO";
import { useClinicInfo } from "@/contexts/ClinicInfoContext";

const AboutUs = lazy(() => import("./components/AboutUs"));
const Services = lazy(() => import("./components/Services"));
const PatientsComments = lazy(() => import("./components/PatientsComments"));
const Samples = lazy(() => import("./components/Samples"));
const FAQ = lazy(() => import("./components/FAQ"));
const Footer = lazy(() => import("./components/Footer"));

const SectionFallback = () => (
    <div
        className="min-h-32 bg-white"
        role="status"
        aria-label="در حال آماده‌سازی بخش بعدی"
    />
);

const Landing = () => {
    const { clinicInfo } = useClinicInfo();

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

            <main className="text-base">
                <NavigationBar />
                <HeroContent />
                <Suspense fallback={<SectionFallback />}>
                    <AboutUs />
                </Suspense>
                <Suspense fallback={<SectionFallback />}>
                    <Services />
                </Suspense>
                <Suspense fallback={<SectionFallback />}>
                    <PatientsComments />
                </Suspense>
                <Suspense fallback={<SectionFallback />}>
                    <Samples />
                </Suspense>
                <Suspense fallback={<SectionFallback />}>
                    <FAQ />
                </Suspense>
                <Suspense fallback={<SectionFallback />}>
                    <Footer />
                </Suspense>
            </main>
        </>
    );
};

export default Landing;
