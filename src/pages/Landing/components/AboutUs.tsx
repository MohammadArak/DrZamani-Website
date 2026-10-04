import { motion } from "@/components/Motion";
import { useClinicInfo } from "@/contexts/ClinicInfoContext";
import { useSiteServices } from "@/services/siteServicesApi";
import { fillText, useSiteContent } from "@/services/siteContentApi";

const ServiceMinimalCard = ({
    title,
    subtitle,
    img,
    href,
}: {
    title: string;
    subtitle: string;
    img: string;
    href: string;
}) => {
    return (
        <motion.div className="bg-white rounded-2xl shadow-xl hover:scale-105 transition duration-125">
            <a
                href={href}
                className="p-3 flex flex-col items-center justify-center gap-1"
            >
            <div className="bg-[#fcf9f5] rounded-full p-4">
                <img
                    src={img}
                    alt={subtitle}
                    className="max-h-12"
                    loading="lazy"
                    decoding="async"
                />
            </div>
            <h6 className="text-duskblue text-lg">{title}</h6>
            <span className="font-light text-xs">{subtitle}</span>
            </a>
        </motion.div>
    );
};

const AboutUs = () => {
    const { clinicInfo } = useClinicInfo();
    const items = useSiteServices();
    const content = useSiteContent();
    const { quote, facts } = content.about;
    return (
        <section id="about-us" className="relative bg-[#0b1828] text-white">
            <div className="relative flex min-h-[26rem] items-end overflow-hidden md:min-h-[32rem]">
                <img
                    src="/img/zamani/dr-zamani-op-2.webp"
                    alt={`اتاق عمل ${clinicInfo.doctorName}`}
                    className="absolute inset-0 h-full w-full object-cover object-[30%_center]"
                    loading="lazy"
                    decoding="async"
                />
                <div className="absolute inset-0 bg-linear-to-t from-[#0b1828] from-5% via-[#0b1828]/40 via-55% to-[#0b1828]/10" />
                <motion.div
                    className="relative z-10 flex max-w-3xl flex-col gap-5 px-6 pb-10 pt-24 md:px-10"
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 1, type: "spring", bounce: 0.1 }}
                    viewport={{ once: true }}
                >
                    <h2 className="flex items-center gap-2 text-secondary">
                        <span className="h-2 w-2 rounded-full bg-secondary" />
                        درباره ما
                    </h2>
                    <h3 className="font-dana text-3xl md:text-5xl">{clinicInfo.doctorName}</h3>
                    <p className="flex w-fit items-center gap-2 rounded-full border border-secondary/60 px-5 py-1 font-lalezar text-lg md:text-xl">
                        <span className="h-3 w-3 rounded-full bg-secondary" />
                        {clinicInfo.specialty}
                    </p>
                    {quote && (
                        <blockquote className="font-dana text-2xl leading-loose md:text-4xl">
                            «{fillText(quote, clinicInfo)}»
                        </blockquote>
                    )}
                    {facts.length > 0 && (
                        <ul className="flex flex-wrap gap-x-10 gap-y-3 border-t border-secondary/35 pt-4 text-xs text-[#bccde0]">
                            {facts.map((fact, index) => (
                                <li key={index}>
                                    <b className="block text-base text-secondary">{fact.value}</b>
                                    {fillText(fact.label, clinicInfo)}
                                </li>
                            ))}
                        </ul>
                    )}
                </motion.div>
            </div>
            <div className="flex flex-col gap-12 px-6 py-14 md:px-10">
                <motion.div
                    className="mx-auto grid max-w-6xl gap-6 text-justify font-light leading-8 text-[#d3deec] lg:grid-cols-2 lg:gap-x-12"
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 1, type: "spring", bounce: 0.1 }}
                    viewport={{ once: true }}
                >
                    {content.about.paragraphs.map((paragraph, index) => (
                        <p key={index} className={index === 0 ? "lg:col-span-2" : ""}>
                            {fillText(paragraph, clinicInfo)}
                        </p>
                    ))}
                </motion.div>
                <motion.div
                    className="mx-auto grid w-full max-w-6xl grid-cols-2 gap-4 text-gray-900 md:grid-cols-4"
                    initial={{ opacity: 0, y: 40 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 1, type: "spring", bounce: 0.1 }}
                    viewport={{ once: true }}
                >
                    {items.map((item) => (
                        <ServiceMinimalCard
                            key={item.slug}
                            title={item.title}
                            href={`/services/${item.slug}/`}
                            subtitle={item.tile_label}
                            img={`/img/about-us/${item.image}`}
                        />
                    ))}
                </motion.div>
            </div>
        </section>
    );
};

export default AboutUs;
