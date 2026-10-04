import { motion } from "@/components/Motion";
import { FaNotesMedical } from "react-icons/fa";
import ServiceCard from "./ServiceCard";
import { BsDiamondFill } from "react-icons/bs";
import { useClinicInfo } from "@/contexts/ClinicInfoContext";
import { useSiteServices } from "@/services/siteServicesApi";

const enterFrom = [
    { opacity: 0, x: 40 },
    { opacity: 0, y: -40 },
    { opacity: 0, y: -40 },
    { opacity: 0, x: -40 },
];

const Services = () => {
    const { clinicInfo } = useClinicInfo();
    const items = useSiteServices();

    return (
        <section
            id="services"
            className="relative bg-white pt-14 pb-36 px-10 flex flex-col items-center gap-8"
        >
            <motion.img
                initial={{ opacity: 0, y: -40 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{
                    duration: 1.5,
                    type: "spring",
                    bounce: 0.1,
                }}
                viewport={{ once: true }}
                className="absolute left-25 bottom-25 z-10 hidden lg:block blur-xl"
                src="/img/services/cloud-1.png"
                alt="بک گراند ابری رنگ آبی"
            />
            <motion.img
                initial={{ opacity: 0, y: -40 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{
                    duration: 1.5,
                    type: "spring",
                    bounce: 0.1,
                }}
                viewport={{ once: true }}
                className="absolute right-25 top-25 z-10 hidden lg:block blur-xl"
                src="/img/services/cloud-2.png"
                alt="بک گراند ابری رنگ آبی"
            />
            <img
                className="absolute top-0 z-10 hidden lg:block"
                src="/img/services/dashed-line-up.png"
                alt="خط خط افقی بالا"
            />
            <img
                className="absolute -bottom-20 left-10 z-10 hidden lg:block"
                src="/img/services/dashed-line-bottom.png"
                alt="خط افقی پایین"
            />
            <div className="flex flex-col gap-4 items-center z-20">
                <motion.div
                    className="rounded-full border border-secondary p-0.5"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{
                        duration: 1.5,
                        type: "spring",
                        bounce: 0.4,
                    }}
                    viewport={{ once: true }}
                >
                    <div className="bg-linear-to-br from-powderblue to-duskblue rounded-full border border-secondary p-4">
                        <FaNotesMedical size={32} color="white" />
                    </div>
                </motion.div>
                <motion.h2
                    className="text-gray-700 font-dana text-2xl md:text-4xl"
                    initial={{ opacity: 0, y: -40 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{
                        duration: 1.5,
                        type: "spring",
                        bounce: 0.5,
                    }}
                    viewport={{ once: true }}
                >
                    خدمات {clinicInfo.doctorName}
                </motion.h2>
                <motion.div
                    initial={{ opacity: 0, y: 40 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{
                        duration: 1.5,
                        type: "spring",
                        bounce: 0.1,
                    }}
                    viewport={{ once: true }}
                    className="flex justify-center items-center"
                >
                    <div className="w-72 bg-linear-to-l from-secondary-mild/2 via-secondary to-secondary-mild/2 h-px rounded-full"></div>
                    <div className="absolute bg-white px-1">
                        <BsDiamondFill size={12} className="text-secondary" />
                    </div>
                </motion.div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 items-start justify-center h-full gap-12 md:gap-10 lg:gap-4 z-20">
                {items.map((item, index) => (
                    <motion.div
                        key={item.slug}
                        initial={enterFrom[index] ?? { opacity: 0, y: -40 }}
                        whileInView={{ opacity: 1, x: 0, y: 0 }}
                        transition={{
                            duration: 1.5,
                            type: "spring",
                            bounce: 0.1,
                        }}
                        viewport={{ once: true }}
                    >
                        <ServiceCard
                            img={`/img/services/${item.image}`}
                            header={item.title}
                            body={item.summary}
                            href={`/services/${item.slug}/`}
                        />
                    </motion.div>
                ))}
            </div>
        </section>
    );
};

export default Services;
