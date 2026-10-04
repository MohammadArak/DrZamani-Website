import { useClinicInfo } from "@/contexts/ClinicInfoContext";
import { useEffect, useState } from "react";
import { FaBookOpen, FaHouse, FaPhone, FaTableCellsLarge } from "react-icons/fa6";

type Tab = "home" | "services";

/** Phone-only bottom tab bar: one always-available way to call, plus the main places to go. */
const MobileTabBar = () => {
    const { clinicInfo } = useClinicInfo();
    const [active, setActive] = useState<Tab>("home");

    useEffect(() => {
        const target = document.getElementById("services");
        if (!target || typeof IntersectionObserver === "undefined") return;
        const observer = new IntersectionObserver(
            ([entry]) => setActive(entry.isIntersecting ? "services" : "home"),
            { rootMargin: "-40% 0px -40% 0px" },
        );
        observer.observe(target);
        return () => observer.disconnect();
    }, []);

    const base = "flex flex-1 flex-col items-center justify-center gap-1 py-2 text-[11px] transition-colors";
    const tone = (on: boolean) => (on ? "text-secondary" : "text-[#aebfd4]");
    return (
        <nav
            aria-label="دسترسی سریع"
            className="fixed inset-x-0 bottom-0 z-40 border-t border-secondary/40 bg-[#0b1828]/95 backdrop-blur md:hidden"
            style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
            <div className="flex">
                <a href="/" className={`${base} ${tone(active === "home")}`} aria-current={active === "home" ? "page" : undefined}>
                    <FaHouse aria-hidden="true" size={18} />
                    خانه
                </a>
                <a href="#services" className={`${base} ${tone(active === "services")}`}>
                    <FaTableCellsLarge aria-hidden="true" size={18} />
                    خدمات
                </a>
                <a href="/articles/" className={`${base} ${tone(false)}`}>
                    <FaBookOpen aria-hidden="true" size={18} />
                    مقالات
                </a>
                <a href={`tel:${clinicInfo.phones.office.value}`} className={`${base} font-bold text-secondary`}>
                    <FaPhone aria-hidden="true" size={18} />
                    تماس
                </a>
            </div>
        </nav>
    );
};

export default MobileTabBar;
