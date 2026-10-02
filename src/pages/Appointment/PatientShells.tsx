import { useClinicInfo } from "@/contexts/ClinicInfoContext";

export const LoadingScreen = () => (
    <div
        className="flex min-h-screen items-center justify-center bg-[#f5f7fd]"
        dir="rtl"
    >
        <div className="text-center">
            <div className="mx-auto mb-5 h-12 w-12 animate-spin rounded-full border-4 border-secondary/25 border-t-secondary" />
            <p className="text-slate-600">در حال اتصال به سامانه نوبت‌دهی…</p>
        </div>
    </div>
);

export const AuthShell = ({ children }: { children: React.ReactNode }) => {
    const { clinicInfo } = useClinicInfo();

    return (
    <main
        dir="rtl"
        className="min-h-screen bg-[radial-gradient(circle_at_top_right,rgba(213,171,100,0.2),transparent_35%),linear-gradient(145deg,#0e192c,#293241)] px-4 py-8 text-slate-800 md:py-8"
    >
        <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-5xl overflow-hidden rounded-4xl bg-white shadow-2xl shadow-black/20 md:grid-cols-[0.9fr_1.1fr]">
            <section className="relative hidden overflow-hidden bg-primary p-10 text-white md:flex md:flex-col md:justify-between">
                <div className="absolute -left-16 -top-16 h-64 w-64 rounded-full bg-secondary/20 blur-2xl" />
                <a href="/" className="relative inline-flex w-fit self-center">
                    <img
                        src="/img/logo/logo-dark-full.webp"
                        alt={clinicInfo.doctorName}
                        className="w-72 "
                    />
                </a>
                <div className="relative">
                    <span className="mb-4 inline-flex rounded-full border border-secondary/50 bg-secondary/10 px-4 py-1 text-sm text-secondary-mild">
                        سامانه نوبت‌دهی مطب {clinicInfo.doctorName}
                    </span>
                    <h1 className="font-dana text-4xl leading-normal">
                        {clinicInfo.bookingEnabled ? "رزرو نوبت، بدون تماس و انتظار" : "پرونده و پیگیری نوبت‌های شما"}
                    </h1>
                    <p className="mt-5 leading-8 text-slate-300">
                        {clinicInfo.bookingEnabled ? "با وارد کردن مشخصات، خدمت و زمان مراجعه را انتخاب کنید." : clinicInfo.bookingDisabledMessage}
                    </p>
                </div>
                <p className="relative text-sm text-slate-400">
                    اطلاعات شما فقط برای هماهنگی و ارائه خدمات درمانی استفاده
                    می‌شود.
                </p>
            </section>
            <section className="flex min-w-0 items-center p-5 sm:p-6 md:p-12">
                {children}
            </section>
        </div>
    </main>
    );
};

