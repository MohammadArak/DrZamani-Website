import { motion } from "@/components/Motion";
import { useClinicInfo } from "@/contexts/ClinicInfoContext";
import { FaUsers } from "react-icons/fa6";
import GlassCard from "./GlassCard";
import { BiSolidCheckShield } from "react-icons/bi";
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
    return (
        <section
            id="about-us"
            className="relative flex bg-linear-to-b from-white to-[#f5f7fd] text-gray-900 px-6 md:px-10 py-16"
        >
            <div className="flex flex-col gap-24">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center z-10 px-2">
                    <div className="flex justify-start items-center gap-6 z-10 lg:mb-0">
                        <div className="flex flex-col gap-4">
                            <motion.div
                                initial={{ opacity: 0, x: 40 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                transition={{
                                    duration: 1,
                                    type: "spring",
                                    bounce: 0.1,
                                }}
                                viewport={{ once: true }}
                            >
                                <motion.h2 className="flex gap-2 items-center text-secondary">
                                    <div className="bg-secondary rounded-full w-2 h-2"></div>
                                    درباره ما
                                </motion.h2>
                            </motion.div>
                            <motion.div
                                className="flex flex-col gap-6 mt-6"
                                initial={{ opacity: 0, y: -40 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                transition={{
                                    duration: 1,
                                    type: "spring",
                                    bounce: 0.1,
                                }}
                                viewport={{ once: true }}
                            >
                                <motion.h2 className="text-duskblue font-dana text-3xl md:text-5xl">
                                    {clinicInfo.doctorName}
                                </motion.h2>
                                <motion.h3 className="shadow-xl text-duskblue font-lalezar font-thin mt-4 text-lg md:text-xl border border-duskblue w-fit rounded-full px-5 py-1 flex justify-center items-center gap-2">
                                    <div className="bg-secondary rounded-full w-3 h-3"></div>
                                    {clinicInfo.specialty}
                                </motion.h3>
                            </motion.div>
                            <motion.div
                                className="flex flex-col"
                                initial={{ opacity: 0, x: 40 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                transition={{
                                    duration: 1,
                                    type: "spring",
                                    bounce: 0.1,
                                }}
                                viewport={{ once: true }}
                            >
                                {content.about.paragraphs.map((paragraph, index) => (
                                    <motion.p
                                        key={index}
                                        className={`mt-6 mx-auto max-w-200 font-light text-justify text-gray-700 ${index === 2 ? "leading-8" : ""}`}
                                    >
                                        {fillText(paragraph, clinicInfo)}
                                    </motion.p>
                                ))}
                            </motion.div>
                            <motion.div
                                className="grid grid-cols-2 md:grid-cols-4 gap-4"
                                initial={{ opacity: 0, y: 40 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                transition={{
                                    duration: 1,
                                    type: "spring",
                                    bounce: 0.1,
                                }}
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
                    </div>
                    <div className="flex items-center justify-center h-full w-full gap-6">
                        <motion.div
                            initial={{ opacity: 0, x: 40 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            transition={{
                                duration: 1,
                                type: "spring",
                                bounce: 0.1,
                            }}
                            viewport={{ once: true }}
                        >
                            <img
                                className="z-10"
                                src="/img/about-us/dr-zamani-op.webp"
                                alt={`اتاق عمل ${clinicInfo.doctorName}`}
                                loading="eager"
                                fetchPriority="high"
                                decoding="sync"
                            />
                            <motion.div
                                className="relative hidden md:block"
                                initial={{ opacity: 0, x: 40 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                transition={{
                                    duration: 1,
                                    type: "spring",
                                    bounce: 0.1,
                                }}
                                viewport={{ once: true }}
                            >
                                <div className="absolute inset-0 -z-10 rounded-full bg-lightcyan/90 blur-[120px] scale-100" />
                                <div className="absolute -left-8 -bottom-8 md:left-4 md:bottom-4 lg:left-2 lg:bottom-6 z-30">
                                    {content.about.facts.length > 0 && (
                                        <GlassCard className="p-5 bg-linear-to-bl to-[#98C1D9] border-none">
                                            <div className="flex flex-col gap-4">
                                                {content.about.facts.map((fact, index) => {
                                                    const Icon = index % 2 === 0 ? FaUsers : BiSolidCheckShield;
                                                    return (
                                                        <div key={index} className="flex flex-col gap-4">
                                                            {index > 0 && <div className="h-px bg-white/15" />}
                                                            <div className="flex items-center gap-5">
                                                                <div className="flex p-3 items-center justify-center rounded-full bg-white/10 backdrop-blur-lg">
                                                                    <Icon className="h-6 w-6 text-secondary" />
                                                                </div>
                                                                <div>
                                                                    <h3 className="text-lg lg:text-xl font-bold text-gray-100">
                                                                        {fact.value}
                                                                    </h3>
                                                                    <p className="text-sm text-gray-100">
                                                                        {fillText(fact.label, clinicInfo)}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </GlassCard>
                                    )}
                                </div>
                            </motion.div>
                        </motion.div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default AboutUs;
