import BackToTop from "@/components/BackToTop";
import RavielCredit from "@/components/RavielCredit";
import BusinessHoursView from "@/components/BusinessHoursView";
import NavList from "./NavList";
import LazyIframe from "@/components/Iframe";
import { motion } from "@/components/Motion";
import { useClinicInfo } from "@/contexts/ClinicInfoContext";
import { fillText, useSiteContent } from "@/services/siteContentApi";
import {
    FaEnvelope,
    FaInstagram,
    FaPhoneVolume,
} from "react-icons/fa6";
import { GiDiamonds } from "react-icons/gi";
import { MdNavigateBefore } from "react-icons/md";

const footerLinks = [
    { title: "درباره ما", value: "about-us", href: "/#about-us" },
    { title: "خدمات ما", value: "services", href: "/#services" },
    { title: "نمونه کارها", value: "samples", href: "/#samples" },
    { title: "نظرات مراجعین", value: "comments", href: "/#comments" },
    { title: "سوالات متداول", value: "faq", href: "/#faq" },
].map(link => ({ ...link, icon: <MdNavigateBefore size={28} className="text-secondary" /> }));

const Footer = () => {
    const { clinicInfo } = useClinicInfo();
    const content = useSiteContent();

    return (
        <>
        <footer
            id="footer"
            style={{overflowX:"clip"}}
            className="relative z-20 bg-jetblack dark:bg-jetblack text-slate-200 pt-16 pb-8 flex flex-col"
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
                    className="min-w-0 col-span-1 md:col-span-12 lg:col-span-4 flex flex-col items-start justify-center gap-4"
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
                <div className="min-w-0 col-span-1 md:col-span-12 lg:col-span-8 grid grid-cols-1 md:grid-cols-8 divide-y lg:divide-x lg:divide-y-0 divide-gray-500/40">
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{
                            duration: 1.5,
                            type: "spring",
                            bounce: 0.5,
                        }}
                        viewport={{ once: true }}
                        className="min-w-0 col-span-1 md:col-span-2 lg:col-span-2 flex flex-col items-center gap-8 px-2 py-8 lg:py-0"
                    >
                        <div className="w-full flex flex-col gap-2 items-center">
                            <h2 className="text-2xl font-lalezar text-white">لینک ها</h2>
                            <div className="w-20 bg-linear-to-l from-secondary to-secondary-mild/10 h-px rounded-full"></div>
                        </div>
                        <div className="w-full">
                            <NavList tabs={footerLinks} vertical tabClassName="footer-nav-link" />
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
                        className="min-w-0 col-span-1 md:col-span-6 lg:col-span-3 flex flex-col items-center gap-8 px-3 py-8 lg:py-0"
                    >
                        <div className="w-full flex flex-col gap-2 items-center">
                            <h2 className="text-2xl font-lalezar text-white">تماس ها</h2>
                            <div className="w-20 bg-linear-to-l from-secondary to-secondary-mild/10 h-px rounded-full"></div>
                        </div>
                        <ul className="flex flex-col gap-6">
                            <li className="flex flex-col">
                                <div className="flex justify-between items-center gap-6">
                                    <div className="flex flex-col gap-1">
                                        <p className="text-2xl text-secondary font-lalezar text-white">
                                            شماره تلفن:
                                        </p>
                                        <a className="footer-contact" href={`tel:${clinicInfo.phones.office.value}`}>
                                            {clinicInfo.phones.office.display}
                                        </a>
                                        <a className="footer-contact" href={`tel:${clinicInfo.phones.consultation.value}`}>
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
                                        <p className="text-2xl text-secondary font-lalezar text-white">
                                            آدرس ایمیل:
                                        </p>
                                        <p>
                                            <a className="footer-contact" href={`mailto:${clinicInfo.email}`}>
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
                                <li className="flex gap-2">
                                    {clinicInfo.social.instagram && (
                                        <a
                                            className="hover:opacity-90 shadow-lg footer-social instagram-btn flex flex-1 gap-2 text-white justify-center items-center rounded-md font-shahab"
                                            style={{ padding: "8px", whiteSpace: "nowrap", minWidth: 0 }}
                                            href={clinicInfo.social.instagram}
                                            target="_blank"
                                            rel="noreferrer noopener"
                                        >
                                            <FaInstagram size={22} />
                                            اینستاگرام
                                        </a>
                                    )}
                                    {clinicInfo.social.eitaa && (
                                        <a
                                            className="hover:opacity-90 shadow-lg footer-social px-2 py-2 flex-1 bg-linear-to-r from-[#ef7f1a] to-[#FFB472] flex gap-2 text-white justify-center items-center rounded-md font-shahab"
                                            style={{ whiteSpace: "nowrap", minWidth: 0 }}
                                            href={clinicInfo.social.eitaa}
                                            target="_blank"
                                            rel="noreferrer noopener"
                                        >
                                            <img
                                                src="/img/logo/eitaa.png"
                                                className="w-6"
                                                alt="لوگوی ایتا"
                                            />
                                            ایتا
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
                        className="min-w-0 col-span-1 md:col-span-8 lg:col-span-3 flex flex-col items-center gap-8 px-6 py-8 lg:py-0"
                    >
                        <div className="flex flex-col gap-2">
                            <h2 className="text-2xl font-lalezar text-white">
                                آدرس ما روی نقشه
                            </h2>
                            <span>
                                {clinicInfo.address.full}
                            </span>
                            <BusinessHoursView />
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
                    <RavielCredit />
                </motion.p>
            </div>
        </footer>
        <BackToTop />
        </>
    );
};

export default Footer;
