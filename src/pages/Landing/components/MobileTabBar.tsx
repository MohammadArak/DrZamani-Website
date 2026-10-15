import { useEffect, useRef, useState } from "react";
import { FaBookOpen, FaHouse, FaImages, FaPhone, FaTableCellsLarge } from "react-icons/fa6";

type Tab = "home" | "services" | "samples" | "footer" | null;

/** Phone navigation; contact goes to the same-page footer and exposes all contact methods. */
const MobileTabBar = () => {
    const [active, setActive] = useState<Tab>("home");
    const ref = useRef<HTMLElement>(null);
    useEffect(() => {
        const nav=ref.current;if(!nav)return;
        const root=document.documentElement;
        const previous=root.style.getPropertyValue("--mobile-nav-space");
        const priority=root.style.getPropertyPriority("--mobile-nav-space");
        const reserve=()=>root.style.setProperty("--mobile-nav-space",`${nav.getBoundingClientRect().height}px`);
        reserve();
        const observer=new ResizeObserver(reserve);observer.observe(nav);
        return()=>{observer.disconnect();if(previous)root.style.setProperty("--mobile-nav-space",previous,priority);else root.style.removeProperty("--mobile-nav-space");};
    },[]);
    useEffect(() => {
        let frame = 0;
        const update = () => {
            frame = 0;
            const mid = window.innerHeight / 2;
            let next:Tab=null;
            for(const [id,value] of [["hero","home"],["services","services"],["samples","samples"],["footer","footer"]] as const){
                const box=document.getElementById(id)?.getBoundingClientRect();
                if(box&&box.top<mid&&box.bottom>mid)next=value;
            }
            setActive(next);
        };
        const onScroll = () => { if (!frame) frame = requestAnimationFrame(update); };
        update();window.addEventListener("scroll", onScroll, { passive: true });
        return () => {window.removeEventListener("scroll", onScroll);cancelAnimationFrame(frame);};
    }, []);
    const base = "flex flex-1 flex-col items-center justify-center gap-1 py-2 whitespace-nowrap text-[11px] transition-colors";
    const tone = (on: boolean) => (on ? "text-secondary" : "text-[#aebfd4]");
    return (
        <nav ref={ref} aria-label="دسترسی سریع"
            className="fixed inset-x-0 bottom-0 z-40 border-t border-secondary/40 bg-[#0b1828]/95 backdrop-blur md:hidden"
            style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
            <div className="flex">
                <a href="/" className={`${base} ${tone(active === "home")}`} aria-current={active === "home" ? "page" : undefined}>
                    <FaHouse aria-hidden="true" size={18} />خانه
                </a>
                <a href="#services" className={`${base} ${tone(active === "services")}`} aria-current={active === "services" ? "location" : undefined}>
                    <FaTableCellsLarge aria-hidden="true" size={18} />خدمات
                </a>
                <a href="#samples" className={`${base} ${tone(active === "samples")}`} aria-current={active === "samples" ? "location" : undefined}>
                    <FaImages aria-hidden="true" size={18} />نمونه‌کارها
                </a>
                <a href="/articles/" className={`${base} ${tone(false)}`}>
                    <FaBookOpen aria-hidden="true" size={18} />مقالات
                </a>
                <a href="#footer" className={`${base} font-bold text-secondary`} aria-current={active === "footer" ? "location" : undefined}>
                    <FaPhone aria-hidden="true" size={18} />تماس با ما
                </a>
            </div>
        </nav>
    );
};
export default MobileTabBar;
