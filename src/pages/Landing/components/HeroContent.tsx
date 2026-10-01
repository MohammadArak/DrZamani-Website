import { motion } from "@/components/Motion";
import TextGenerateEffect from "./TextGenerateEffect";
import { FaCalendar, FaRegImages } from "react-icons/fa";
import ReserveDialog from "./ReserveDialog";
import { useState } from "react";
import { useClinicInfo } from "@/contexts/ClinicInfoContext";

const HeroContent = () => {
    const [reserveOpen, setReserveOpen] = useState(false);
    const { clinicInfo } = useClinicInfo();
    return (
        <section
            id="hero"
            className="relative bg-linear-to-br from-jetblack z-0 to-[#1B273B] px-4 lg:px-0 pt-12 min-h-dvh"
        >
            <ReserveDialog
                dialogIsOpen={reserveOpen}
                onClose={() => setReserveOpen(false)}
            />
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-2 lg:gap-10 items-center z-10 px-4 pb-0 lg:pb-10 pt-20 lg:pt-44">
                <div className="col-span-2 relative flex flex-col items-center justify-center">
                    <motion.div
                        initial={{ opacity: 0, x: 40 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{
                            duration: 1,
                            type: "spring",
                            bounce: 0.1,
                        }}
                    >
                        <div className="absolute inset-0 rounded-full -z-10 bg-lightcyan/35 blur-[120px] scale-80" />
                        <img
                            className="max-h-100 lg:max-h-125 z-20"
                            src="/img/zamani/dr-zamani-hero.webp"
                            alt={`${clinicInfo.doctorName}، ${clinicInfo.specialty}`}
                            loading="eager"
                            fetchPriority="high"
                            decoding="sync"
                        />
                    </motion.div>
                </div>
                <div className="lg:col-span-3 flex justify-start items-center gap-6 z-10 mb-20 lg:mb-0">
                    <div className="relative flex flex-col">
                        <motion.img
                            initial={{ opacity: 0, x: 20 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            transition={{
                                duration: 1,
                                type: "spring",
                                bounce: 0.4,
                            }}
                            viewport={{ once: true }}
                            src="/img/zamani/shoar.png"
                            alt="زیبایی حق شماست"
                            loading="eager"
                            fetchPriority="high"
                            decoding="sync"
                            className="absolute -top-2 left-2 w-36 lg:-top-30 lg:-right-30 lg:w-52"
                        />
                        <TextGenerateEffect
                            as="h1"
                            className="text-white"
                            wordClassName="font-dana text-2xl md:text-4xl lg:text-8xl font-bold max-w-7xl mt-6 pb-2 relative z-10"
                            words={clinicInfo.doctorName}
                            wordsCallbackClass={({ word }) => {
                                if (word !== "دکتر") {
                                    return "bg-gradient-to-b from-secondary-mild to-secondary bg-clip-text text-transparent";
                                }
                                return "text-white";
                            }}
                            duration={0.9}
                        />
                        <motion.div
                            className="flex flex-col gap-4"
                            initial={{ opacity: 0, x: -30 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            transition={{
                                duration: 1.2,
                                type: "spring",
                                bounce: 0.1,
                            }}
                            viewport={{ once: true }}
                        >
                            <motion.h3 className="shadow-xl bg-[#0f253e] text-white font-lalezar font-light mt-8 text-lg md:text-xl border border-duskblue w-fit rounded-full px-4 py-1 flex justify-center items-center gap-2">
                                <div className="bg-secondary rounded-full w-4 h-4"></div>
                                {clinicInfo.specialty}
                            </motion.h3>
                        </motion.div>
                        <motion.div
                            className="flex flex-col gap-4 mt-8 md:pl-16"
                            initial={{ opacity: 0, y: 40 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            transition={{
                                duration: 1,
                                type: "spring",
                                bounce: 0.1,
                            }}
                            viewport={{ once: true }}
                        >
                            <motion.p className="mx-auto max-w-200 text-justify text-[#E0E1DD] font-shahab">
                                {clinicInfo.doctorName} با بیش از دو دهه تجربه تخصصی در
                                جراحی زیبایی بینی، با تلفیق دانش پزشکی، هنر و
                                دقت در جزئیات، نتیجه‌ای طبیعی، متناسب با چهره و
                                هماهنگ با ویژگی‌های منحصربه‌فرد هر فرد خلق
                                می‌کند؛ نتیجه‌ای که علاوه بر زیبایی، سلامت و
                                عملکرد صحیح تنفس را نیز حفظ می‌کند.
                            </motion.p>
                        </motion.div>
                        <motion.div
                            className="flex gap-4 mt-6 "
                            initial={{ opacity: 0, y: 40 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            transition={{
                                duration: 1,
                                type: "spring",
                                bounce: 0.1,
                            }}
                            viewport={{ once: true }}
                        >
                            <a
                                href="/appointment/"
                                onClick={event => { if (!clinicInfo.bookingEnabled) { event.preventDefault(); setReserveOpen(true); } }}
                                className="flex gap-2 px-2 py-1 text-sm md:text-base md:px-5 md:py-3 text-jetblack justify-center items-center bg-linear-to-b from-secondary-mild to-secondary hover:scale-105 transition rounded-md shadow-md shadow-secondary-deep/50"
                                aria-label="رزرو نوبت"
                            >
                                <FaCalendar />
                                رزرو نوبت
                            </a>
                            {/* <button
                                onClick={() => setReserveOpen(true)}
                                className="flex gap-2 px-2 py-1 text-sm md:text-base md:px-5 md:py-3 text-jetblack justify-center items-center bg-linear-to-b from-secondary-mild to-secondary hover:scale-105 transition rounded-md shadow-md shadow-secondary-deep/50"
                            >
                                <FaCalendar />
                                رزرو نوبت مشاوره
                            </button> */}
                            <button
                                onClick={() => {
                                    document
                                        .getElementById("samples")
                                        ?.scrollIntoView({
                                            behavior: "smooth",
                                            block: "start",
                                        });
                                }}
                                className="flex gap-2 px-2 py-1 md:px-5 md:py-3 text-sm md:text-base text-neutral justify-center items-center border border-secondary hover:scale-105 transition rounded-md shadow-md"
                                aria-label="رفتن به بخش نمونه‌کارها"
                            >
                                <FaRegImages />
                                مشاهده نمونه کارها
                            </button>
                        </motion.div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default HeroContent;
