import { useClinicInfo } from "@/contexts/ClinicInfoContext";
import BookingAction from "./BookingAction";

export default function HeroContent() {
    const { clinicInfo } = useClinicInfo();
    return <section id="hero" className="landing-hero"><div className="landing-container landing-hero-grid">
        <div className="landing-hero-copy"><p className="landing-eyebrow">پزشکی، با توجه به جزئیات</p><h1>{clinicInfo.doctorName}</h1><p className="landing-specialty">{clinicInfo.specialty}</p><p className="landing-hero-description">برای آشنایی با خدمات و انتخاب مسیر مراجعه، از اینجا شروع کنید. اطلاعات مطب، راه‌های ارتباطی و مطالب منتشرشده را در یک جا ببینید.</p><div className="landing-actions"><BookingAction /><a href="#about-us" className="landing-button landing-button-outline">درباره پزشک <span aria-hidden="true">←</span></a></div><p className="landing-hero-location">{clinicInfo.address.city} · {clinicInfo.workingHours}</p></div>
        <div className="landing-portrait"><img src="/img/zamani/dr-zamani-hero.webp" alt={`${clinicInfo.doctorName}، ${clinicInfo.specialty}`} width="1018" height="991" fetchPriority="high" decoding="async" /></div>
    </div></section>;
}
