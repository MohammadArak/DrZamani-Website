// Shared catalog is packaged with the backend that renders the service pages.
import services from "../../../../api/app/clinic_services.json";
import SectionHeading from "./SectionHeading";

export default function Services() {
    return <section id="services" className="landing-section landing-services"><div className="landing-container">
        <SectionHeading title="خدمات تخصصی" description="آشنایی با حوزه‌های خدمات مطب" />
        <div className="landing-services-grid">{services.map(service => <a className="landing-service-card" href={`/services/${service.slug}/`} key={service.slug}>
            <img src={`/img/services/${service.image}`} alt="" width="72" height="72" loading="lazy" decoding="async" /><h3>{service.title}</h3><p>{service.summary}</p><span>آشنایی با خدمت <span aria-hidden="true">←</span></span>
        </a>)}</div>
    </div></section>;
}
