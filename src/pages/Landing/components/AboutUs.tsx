import { useClinicInfo } from "@/contexts/ClinicInfoContext";

export default function AboutUs() {
    const { clinicInfo } = useClinicInfo();
    return <section id="about-us" className="landing-section landing-about"><div className="landing-container landing-about-grid">
        <div><p className="landing-eyebrow">درباره پزشک</p><h2>شناخت پزشک، پیش از انتخاب</h2><p>{clinicInfo.doctorName}، {clinicInfo.specialty} در {clinicInfo.address.city}. در این وب‌سایت می‌توانید با حوزه‌های خدمات مطب، نمونه‌کارهای موجود و مطالب منتشرشده آشنا شوید.</p><p>برای هماهنگی مراجعه و دریافت اطلاعات بیشتر درباره خدمات، از راه‌های ارتباطی مطب استفاده کنید.</p>{clinicInfo.medicalCouncilNumber && <p className="landing-council">شماره نظام پزشکی: {clinicInfo.medicalCouncilNumber}</p>}<a className="landing-button landing-button-outline" href="#footer">ارتباط با مطب <span aria-hidden="true">←</span></a></div>
        <div className="landing-about-photo"><img src="/img/about-us/dr-zamani-op.webp" alt={clinicInfo.doctorName} loading="lazy" decoding="async" width="1216" height="919" /></div>
    </div></section>;
}
