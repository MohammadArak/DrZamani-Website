import { motion } from "@/components/Motion";
import { useClinicInfo } from "@/contexts/ClinicInfoContext";
import { fillText, useSiteContent } from "@/services/siteContentApi";
import { FaAward, FaFileLines, FaShieldHalved } from "react-icons/fa6";

const icons = [FaAward, FaShieldHalved, FaFileLines, FaAward];

/** Credentials ribbon under the hero; the wording is edited in the staff panel and an empty list hides it. */
const TrustStrip = () => {
    const { clinicInfo } = useClinicInfo();
    const { trust } = useSiteContent();
    if (!trust.items.length) return null;
    return (
        <motion.div
            role="region"
            aria-label="اعتبار و اطمینان"
            className="relative z-10 border-y border-secondary/40 bg-[#0b1828] px-6 py-6 md:px-10"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
        >
            <ul className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-10 gap-y-5">
                {trust.items.map((item, index) => {
                    const Icon = icons[index % icons.length];
                    return (
                        <li key={index} className="flex items-center gap-4">
                            <span className="flex h-11 w-11 flex-none items-center justify-center rounded-full border border-secondary text-secondary">
                                <Icon aria-hidden="true" size={18} />
                            </span>
                            <span className="text-xs text-[#c4d3e5]">
                                <b className="block text-sm font-bold text-white">{fillText(item.title, clinicInfo)}</b>
                                {item.text && fillText(item.text, clinicInfo)}
                            </span>
                        </li>
                    );
                })}
            </ul>
        </motion.div>
    );
};

export default TrustStrip;
