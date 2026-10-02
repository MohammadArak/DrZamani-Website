import { useClinicInfo } from "@/contexts/ClinicInfoContext";
import LazyIframe from "@/components/Iframe";
import { FaPhoneAlt, FaMapMarkerAlt, FaInstagram } from "react-icons/fa";
import BookingAction from "./BookingAction";

export default function Footer() {
    const { clinicInfo } = useClinicInfo();
    return <><section id="footer" className="landing-contact landing-section"><div className="landing-container landing-contact-grid">
        <div><p className="landing-eyebrow">ارتباط با مطب</p><h2>مسیر مراجعه از اینجا شروع می‌شود</h2><address>{clinicInfo.address.full}</address><p>{clinicInfo.workingHours}</p><div className="landing-actions"><a className="landing-button landing-button-navy" href={`tel:${clinicInfo.phones.office.value}`}><FaPhoneAlt aria-hidden="true" />تماس با مطب</a><a className="landing-button landing-button-outline" href={clinicInfo.mapPageUrl} target="_blank" rel="noopener noreferrer"><FaMapMarkerAlt aria-hidden="true" />مسیریابی</a></div></div>
        <div className="landing-map"><LazyIframe src={clinicInfo.mapEmbedUrl} title="موقعیت مطب روی نقشه" fallbackHref={clinicInfo.mapPageUrl} className="h-full w-full" /></div>
    </div></section><footer className="landing-footer"><div className="landing-container landing-footer-grid">
        <div><img src="/img/logo/logo-dark-full.webp" width="224" height="70" alt={clinicInfo.doctorName} loading="lazy" /><p>{clinicInfo.specialty}</p>{clinicInfo.medicalCouncilNumber && <p>شماره نظام پزشکی: {clinicInfo.medicalCouncilNumber}</p>}</div>
        <nav aria-label="دسترسی سریع"><h2>دسترسی سریع</h2><a href="#about-us">درباره پزشک</a><a href="#services">خدمات</a><a href="#samples">نمونه‌کارها</a><a href="/articles/">مقالات</a></nav>
        <div><h2>ارتباط با مطب</h2><a dir="ltr" href={`tel:${clinicInfo.phones.office.value}`}>{clinicInfo.phones.office.display}</a><a dir="ltr" href={`tel:${clinicInfo.phones.consultation.value}`}>{clinicInfo.phones.consultation.display}</a>{clinicInfo.email && <a dir="ltr" href={`mailto:${clinicInfo.email}`}>{clinicInfo.email}</a>}</div>
        <div><h2>ساعات کار</h2><p>{clinicInfo.workingHours}</p>{clinicInfo.social.instagram && <a href={clinicInfo.social.instagram} target="_blank" rel="noopener noreferrer"><FaInstagram aria-hidden="true" /> اینستاگرام</a>}{clinicInfo.social.eitaa && <a href={clinicInfo.social.eitaa} target="_blank" rel="noopener noreferrer">ایتا</a>}</div>
    </div><div className="landing-container landing-footer-bottom">وب‌سایت {clinicInfo.doctorName}</div></footer>
    <nav className="landing-mobile-bar" aria-label="ارتباط سریع"><a href={`tel:${clinicInfo.phones.office.value}`}><FaPhoneAlt aria-hidden="true" />تماس</a><a href={clinicInfo.mapPageUrl} target="_blank" rel="noopener noreferrer"><FaMapMarkerAlt aria-hidden="true" />مسیر</a><BookingAction /></nav></>;
}
