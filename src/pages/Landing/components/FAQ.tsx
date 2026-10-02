import { useClinicInfo } from "@/contexts/ClinicInfoContext";
import SectionHeading from "./SectionHeading";

export default function FAQ() {
    const { clinicInfo } = useClinicInfo();
    const questions = [
        { title: "چطور با مطب هماهنگ کنم؟", body: <>از دکمه رزرو نوبت یا شماره تماس مطب استفاده کنید: <a dir="ltr" href={`tel:${clinicInfo.phones.office.value}`}>{clinicInfo.phones.office.display}</a>.</> },
        { title: "مطب کجاست؟", body: <>{clinicInfo.address.full} <a href={clinicInfo.mapPageUrl} target="_blank" rel="noopener noreferrer">مشاهده روی نقشه</a></> },
        { title: "ساعات مراجعه به مطب چیست؟", body: <>{clinicInfo.workingHours}؛ برای هماهنگی زمان مراجعه با مطب تماس بگیرید.</> },
        { title: "از کجا درباره خدمات بیشتر بخوانم؟", body: <>از بخش <a href="#services">خدمات</a> و <a href="/articles/">مقالات منتشرشده</a> شروع کنید. پرسش‌های مربوط به شرایط مراجعه خود را با مطب مطرح کنید.</> },
    ];
    return <section id="faq" className="landing-section landing-faq"><div className="landing-container"><SectionHeading title="پرسش‌های متداول" description="راه‌های ساده برای شروع ارتباط با مطب" /><div className="landing-faq-list">{questions.map((q, i) => <details key={q.title} open={i === 0}><summary>{q.title}<span aria-hidden="true">+</span></summary><div>{q.body}</div></details>)}</div></div></section>;
}
