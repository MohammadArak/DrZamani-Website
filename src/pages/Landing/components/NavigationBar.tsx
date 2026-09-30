import { useState } from "react";
import NavList from "./NavList";
import Drawer from "@/components/Drawer";
import classNames from "@/utils/classNames";
import useScrollTop from "@/utils/hooks/useScrollTop";
import { TbMenu2 } from "react-icons/tb";
import ReserveDialog from "./ReserveDialog";
import { useClinicInfo } from "@/contexts/ClinicInfoContext";

const navMenu = [
    {
        title: "صفحه اصلی",
        value: "home",
        href: "/",
    },
    {
        title: "درباره ما",
        value: "about-us",
        href: "/#about-us",
    },
    {
        title: "تماس با ما",
        value: "contact-us",
        href: "/#footer",
    },
    // {
    //     title: 'مستندات',
    //     value: 'documentations',
    //     to: 'dsad',
    // },
];

const Navigation = () => {
    const { isSticky } = useScrollTop();
    const { clinicInfo } = useClinicInfo();

    const [isOpen, setIsOpen] = useState(false);
    const [reserveOpen, setReserveOpen] = useState(false);

    const openDrawer = () => {
        setIsOpen(true);
    };

    const onDrawerClose = () => {
        setIsOpen(false);
    };

    return (
        <div
            dir="rtl"
            style={{ transition: "all 0.2s ease-in-out" }}
            // className={classNames(
            //     'w-full fixed inset-x-0 z-[40] px-1 md:px-3',
            //     isSticky ? 'top-4' : 'top-0',
            // )}
            className={classNames("w-full fixed inset-x-0 z-40")}
        >
            <ReserveDialog
                dialogIsOpen={reserveOpen}
                onClose={() => setReserveOpen(false)}
            />
            <div
                className={classNames(
                    "flex flex-row self-start items-center justify-between py-2 px-4 relative z-60 w-full transition duration-175",
                    isSticky
                        ? "bg-white dark:bg-[#0E192C]/95 shadow-lg"
                        : "bg-transparent dark:bg-transparent",
                )}
            >
                <div className="flex gap-4">
                    <button
                        className="flex lg:hidden items-center gap-4"
                        onClick={openDrawer}
                        aria-label="باز کردن منوی سایت"
                        aria-expanded={isOpen}
                    >
                        <TbMenu2 size={24} />
                    </button>
                    <a className="z-10" href="/">
                        <img
                            src="/img/logo/logo-dark-full.webp"
                            className="w-40 md:w-48 lg:w-56"
                            alt={`لوگوی ${clinicInfo.doctorName}`}
                            width="560"
                            height="175"
                            decoding="async"
                        />
                    </a>
                </div>
                <Drawer
                    title="ناوبری"
                    isOpen={isOpen}
                    width={250}
                    placement="right"
                    onClose={onDrawerClose}
                    onRequestClose={onDrawerClose}
                >
                    <div className="flex flex-col gap-4">
                        <NavList tabs={navMenu} onTabClick={onDrawerClose} />
                    </div>
                </Drawer>
                <div className="lg:flex flex-row flex-1 absolute inset-0 hidden items-center justify-center text-sm text-zinc-600 font-medium hover:text-zinc-800 transition duration-200 perspective-[1000px] overflow-auto sm:overflow-visible no-visible-scrollbar">
                    <NavList tabs={navMenu} />
                </div>
                <div className="flex items-center gap-2">
                    {/* <button
                        className="rounded-full relative flex cursor-pointer items-center justify-center p-2 text-neutral-500 hover:shadow-input dark:text-neutral-500"
                        onClick={toggleMode}
                    >
                        <svg
                            className="lucide lucide-sun rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0"
                            fill="none"
                            height="20"
                            stroke="currentColor"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            viewBox="0 0 24 24"
                            width="20"
                            xmlns="http://www.w3.org/2000/svg"
                        >
                            <circle cx="12" cy="12" r="4" />
                            <path d="M12 2v2" />
                            <path d="M12 20v2" />
                            <path d="m4.93 4.93 1.41 1.41" />
                            <path d="m17.66 17.66 1.41 1.41" />
                            <path d="M2 12h2" />
                            <path d="M20 12h2" />
                            <path d="m6.34 17.66-1.41 1.41" />
                            <path d="m19.07 4.93-1.41 1.41" />
                        </svg>
                        <svg
                            className="lucide lucide-moon absolute rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100"
                            fill="none"
                            height="20"
                            stroke="currentColor"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            viewBox="0 0 24 24"
                            width="20"
                            xmlns="http://www.w3.org/2000/svg"
                        >
                            <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
                        </svg>
                        <span className="sr-only">تغییر تم</span>
                    </button> */}
                    <a
                        href="/appointment/"
                        className="text-white hover:bg-secondary-deep dark:hover:bg-secondary-deep relative block heading-text z-10 shadow-md rounded-lg items-center justify-center py-1 px-2 bg-secondary dark:bg-secondary"
                        aria-label="ورود به سامانه رزرو نوبت"
                    >
                        رزرو نوبت
                    </a>
                    {/* <button
                        onClick={() => setReserveOpen(true)}
                        className="text-white hover:bg-secondary-deep dark:hover:bg-secondary-deep relative block heading-text z-10 shadow-md rounded-lg items-center justify-center py-1 px-2 bg-secondary dark:bg-secondary"
                    >
                        رزرو نوبت
                    </button> */}
                </div>
            </div>
        </div>
    );
};

export default Navigation;
