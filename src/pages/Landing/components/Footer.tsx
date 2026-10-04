import LazyIframe from "@/components/Iframe";
import { motion } from "@/components/Motion";
import { useClinicInfo } from "@/contexts/ClinicInfoContext";
import { fillText, useSiteContent } from "@/services/siteContentApi";
import {
    FaCode,
    FaEnvelope,
    FaInstagram,
    FaPhoneVolume,
} from "react-icons/fa6";
import { GiDiamonds } from "react-icons/gi";
import { MdNavigateBefore } from "react-icons/md";

const Footer = () => {
    const { clinicInfo } = useClinicInfo();
    const content = useSiteContent();

    return (
        <footer
            id="footer"
            className="relative z-20 bg-jetblack dark:bg-jetblack pt-16 pb-10 flex flex-col"
        >
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-12 px-10 items-start">
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{
                        duration: 1.5,
                        type: "spring",
                        bounce: 0.5,
                    }}
                    viewport={{ once: true }}
                    className="col-span-12 lg:col-span-4 flex flex-col items-start justify-center gap-4"
                >
                    <div className="w-full flex flex-col justify-center items-center gap-2">
                        <a className="z-10" href="/">
                            <img
                                src="/img/logo/logo-dark-full.webp"
                                width={250}
                                height={78}
                                loading="lazy"
                                decoding="async"
                                alt={`لوگوی ${clinicInfo.doctorName}`}
                            />
                        </a>
                        <div className="flex justify-center items-center">
                            <div className="w-42 bg-linear-to-l from-secondary-mild/2 via-secondary to-secondary-mild/2 h-px rounded-full"></div>
                            <div className="absolute bg-jetblack px-1">
                                <GiDiamonds className="text-secondary" />
                            </div>
                        </div>
                    </div>
                    <p className="font-shahab text-lg text-justify">
                        {fillText(content.footer.description, clinicInfo)}
                    </p>
                </motion.div>
                <div className="col-span-12 lg:col-span-8 grid grid-cols-8 divide-y lg:divide-x lg:divide-y-0 divide-gray-500/40">
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{
                            duration: 1.5,
                            type: "spring",
                            bounce: 0.5,
                        }}
                        viewport={{ once: true }}
                        className="col-span-8 md:col-span-2 lg:col-span-2 flex flex-col items-center gap-8 px-2 py-8 lg:py-0"
                    >
                        <div className="w-full flex flex-col gap-2 items-center">
                            <h5 className="text-2xl font-lalezar text-white">لینک ها</h5>
                            <div className="w-20 bg-linear-to-l from-secondary to-secondary-mild/10 h-px rounded-full"></div>
                        </div>
                        <div className="w-full flex flex-col gap-3">
                            <a
                                href="/#about-us"
                                className="transition duration-75 ease-in-out w-full flex flex-col gap-2 hover:bg-primary rounded"
                            >
                                <div className="flex gap-1 items-center">
                                    <MdNavigateBefore
                                        size={28}
                                        className="text-secondary"
                                    />
                                    درباره ما
                                </div>
                            </a>
                            <a
                                href="/#services"
                                className="transition duration-75 ease-in-out w-full flex flex-col gap-2 hover:bg-primary rounded"
                            >
                                <div className="flex gap-1 items-center">
                                    <MdNavigateBefore
                                        size={28}
                                        className="text-secondary"
                                    />
                                    خدمات ما
                                </div>
                            </a>
                            <a
                                href="/#samples"
                                className="transition duration-75 ease-in-out w-full flex flex-col gap-2 hover:bg-primary rounded"
                            >
                                <div className="flex gap-1 items-center">
                                    <MdNavigateBefore
                                        size={28}
                                        className="text-secondary"
                                    />
                                    نمونه کارها
                                </div>
                            </a>
                            <a
                                href="/#comments"
                                className="transition duration-75 ease-in-out w-full flex flex-col gap-2 hover:bg-primary rounded"
                            >
                                <div className="flex gap-1 items-center">
                                    <MdNavigateBefore
                                        size={28}
                                        className="text-secondary"
                                    />
                                    نظرات مراجعین
                                </div>
                            </a>
                            <a
                                href="/#faq"
                                className="transition duration-75 ease-in-out w-full flex flex-col gap-2 hover:bg-primary rounded"
                            >
                                <div className="flex gap-1 items-center">
                                    <MdNavigateBefore
                                        size={28}
                                        className="text-secondary"
                                    />
                                    سوالات متداول
                                </div>
                            </a>
                        </div>
                    </motion.div>
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{
                            duration: 1.5,
                            type: "spring",
                            bounce: 0.5,
                        }}
                        viewport={{ once: true }}
                        className="col-span-8 md:col-span-6 lg:col-span-3 flex flex-col items-center gap-8 px-3 py-8 lg:py-0"
                    >
                        <div className="w-full flex flex-col gap-2 items-center">
                            <h5 className="text-2xl font-lalezar text-white">تماس ها</h5>
                            <div className="w-20 bg-linear-to-l from-secondary to-secondary-mild/10 h-px rounded-full"></div>
                        </div>
                        <ul className="flex flex-col gap-6">
                            <li className="flex flex-col">
                                <div className="flex justify-between items-center gap-6">
                                    <div className="flex flex-col gap-1">
                                        <h6 className="text-2xl text-secondary font-lalezar text-white">
                                            شماره تلفن:
                                        </h6>
                                        <a href={`tel:${clinicInfo.phones.office.value}`}>
                                            {clinicInfo.phones.office.display}
                                        </a>
                                        <a href={`tel:${clinicInfo.phones.consultation.value}`}>
                                            {clinicInfo.phones.consultation.display}
                                        </a>
                                    </div>
                                    <div className="flex items-center bg-jetblack/50 border border-gray-400/50 shadow-lg p-3 rounded-full">
                                        <FaPhoneVolume
                                            className="text-secondary"
                                            size={20}
                                        />
                                    </div>
                                </div>
                            </li>
                            <li className="flex flex-col">
                                <div className="flex justify-between items-center gap-6">
                                    <div className="flex flex-col gap-1">
                                        <h6 className="text-2xl text-secondary font-lalezar text-white">
                                            آدرس ایمیل:
                                        </h6>
                                        <p>
                                            <a href={`mailto:${clinicInfo.email}`}>
                                                {clinicInfo.email}
                                            </a>
                                        </p>
                                    </div>
                                    <div className="flex items-center bg-jetblack/50 border border-gray-400/50 shadow-lg p-3 rounded-full">
                                        <FaEnvelope
                                            className="text-secondary"
                                            size={20}
                                        />
                                    </div>
                                </div>
                            </li>
                            {(clinicInfo.social.instagram || clinicInfo.social.eitaa) && (
                                <li className="flex flex-col gap-2 px-8">
                                    {clinicInfo.social.instagram && (
                                        <a
                                            className="hover:opacity-90 shadow-lg instagram-btn flex gap-2 text-white justify-center items-center rounded-md font-shahab"
                                            href={clinicInfo.social.instagram}
                                            target="_blank"
                                            rel="noreferrer noopener"
                                        >
                                            <FaInstagram size={22} />
                                            صفحه اینستاگرام
                                        </a>
                                    )}
                                    {clinicInfo.social.eitaa && (
                                        <a
                                            className="hover:opacity-90 shadow-lg px-4 py-2 bg-linear-to-r from-[#ef7f1a] to-[#FFB472] flex gap-2 text-white justify-center items-center rounded-md font-shahab"
                                            href={clinicInfo.social.eitaa}
                                            target="_blank"
                                            rel="noreferrer noopener"
                                        >
                                            <img
                                                src="/img/logo/eitaa.png"
                                                className="w-6"
                                                alt="لوگوی ایتا"
                                            />
                                            صفحه ایتا
                                        </a>
                                    )}
                                </li>
                            )}
                        </ul>
                    </motion.div>
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        transition={{
                            duration: 1.5,
                            type: "spring",
                            bounce: 0.5,
                        }}
                        viewport={{ once: true }}
                        className="col-span-8 lg:col-span-3 flex flex-col items-center gap-8 px-6 py-8 lg:py-0"
                    >
                        <div className="flex flex-col gap-2">
                            <h5 className="text-2xl font-lalezar text-white">
                                آدرس ما روی نقشه
                            </h5>
                            <span>
                                {clinicInfo.address.full}
                            </span>
                        </div>
                        {clinicInfo.mapEmbedUrl ? (
                            <LazyIframe
                                title={`مطب ${clinicInfo.doctorName}`}
                                src={clinicInfo.mapEmbedUrl}
                                fallbackHref={clinicInfo.mapPageUrl}
                                className="w-full h-50 rounded-2xl border-0"
                            />
                        ) : clinicInfo.mapPageUrl ? (
                            <a
                                href={clinicInfo.mapPageUrl}
                                target="_blank"
                                rel="noreferrer noopener"
                                className="flex h-50 w-full items-center justify-center rounded-2xl border border-white/15 bg-white/5 text-secondary underline"
                            >
                                مشاهده آدرس روی نقشه
                            </a>
                        ) : null}
                    </motion.div>
                </div>
            </div>
            <div className="flex justify-center items-center mt-12 mb-8 mx-8">
                <div className="w-full bg-linear-to-l from-gray-400/10 via-gray-400/40 to-gray-400/10 h-px rounded-full"></div>
                <div className="absolute bg-jetblack px-1">
                    <GiDiamonds className="text-secondary" />
                </div>
            </div>
            <div className="flex flex-col gap-4 lg:gap-0 lg:flex-row justify-between items-center px-4">
                <motion.p
                    initial={{ opacity: 0, y: -20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{
                        duration: 1.5,
                        type: "spring",
                        bounce: 0.5,
                    }}
                    className="text-justify"
                    viewport={{ once: true }}
                >
                    تمامی حقوق این وبسایت متعلق به{" "}
                    <a href="/" className="text-secondary">
                        {clinicInfo.doctorName}
                    </a>{" "}
                    می‌باشد و هر گونه کپی برداری از آن بدون ذکر منبع پیگرد
                    قانونی خواهد داشت.
                </motion.p>
                <p className="text-sm">
                    <a href="/privacy/" className="text-secondary">
                        حریم خصوصی و اطلاعات شما
                    </a>
                </p>
                <motion.p
                    initial={{ opacity: 0, y: -20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{
                        duration: 1.5,
                        type: "spring",
                        bounce: 0.5,
                    }}
                    viewport={{ once: true }}
                    className="text-sm"
                >
                    <a
                        className="text-secondary items-center flex gap-1 p-3"
                        href="tg://resolve?domain=EMahdi593"
                    >
                        Designer
                        <FaCode />
                    </a>
                </motion.p>
            </div>
        </footer>
    );
};

export default Footer;
