import { useState } from "react";
import { TbMenu2 } from "react-icons/tb";
import Drawer from "@/components/Drawer";
import { useClinicInfo } from "@/contexts/ClinicInfoContext";
import BookingAction from "./BookingAction";

const links = [{ label: "صفحه اصلی", href: "/" }, { label: "درباره پزشک", href: "/#about-us" }, { label: "خدمات", href: "/#services" }, { label: "نمونه‌کارها", href: "/#samples" }, { label: "مقالات", href: "/articles/" }, { label: "تماس با ما", href: "/#footer" }];

export default function NavigationBar() {
    const [open, setOpen] = useState(false);
    const { clinicInfo } = useClinicInfo();
    return <header className="landing-header"><a href="#main-content" className="landing-skip">رفتن به محتوای اصلی</a><div className="landing-container landing-nav-row">
        <a href="/" className="landing-brand"><img src="/img/logo/logo-dark-full.webp" width="224" height="70" alt={clinicInfo.doctorName} /></a>
        <nav className="landing-desktop-nav" aria-label="منوی اصلی">{links.map(link => <a key={link.href} href={link.href}>{link.label}</a>)}</nav>
        <div className="landing-nav-actions"><BookingAction /><button className="landing-menu-button" aria-label="باز کردن منوی سایت" aria-expanded={open} onClick={() => setOpen(true)}><TbMenu2 size={24} /></button></div>
        <Drawer title="منوی سایت" isOpen={open} width={280} placement="right" onClose={() => setOpen(false)} onRequestClose={() => setOpen(false)}><nav className="landing-drawer-nav" aria-label="منوی موبایل">{links.map(link => <a key={link.href} href={link.href} onClick={() => setOpen(false)}>{link.label}</a>)}</nav></Drawer>
    </div></header>;
}
