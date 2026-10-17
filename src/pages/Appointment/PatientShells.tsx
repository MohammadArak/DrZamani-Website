import Loading from "@/pages/Loading";
import RavielCredit from "@/components/RavielCredit";
import { useClinicInfo } from "@/contexts/ClinicInfoContext";

export const LoadingScreen = () => <Loading loading className="patient-loading min-h-dvh w-full flex-1" />;

export const AuthShell = ({ children }: { children: React.ReactNode }) => {
    const { clinicInfo } = useClinicInfo();
    return (
        <main dir="rtl" className="patient-auth flex flex-1 flex-col items-center justify-center px-3 py-3 text-slate-800">
            <div className="w-full max-w-md overflow-hidden rounded-3xl border border-white/20 bg-white shadow-2xl shadow-black/20">
                <header className="relative overflow-hidden bg-primary px-6 pb-5 pt-5 text-center sm:px-9">
                    <a href="/" className="relative mx-auto block w-fit rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-secondary">
                        <img src="/img/logo/logo-dark-full.webp" alt={clinicInfo.doctorName} className="mx-auto h-auto w-60 max-w-full" fetchPriority="high" />
                    </a>
                    <h1 className="relative mt-3 font-dana text-xl text-white">{clinicInfo.bookingEnabled ? "نوبت شما، در چند قدم ساده" : "پرونده و پیگیری نوبت‌های شما"}</h1>
                    <p className="relative mt-2 text-sm leading-6 text-slate-200">{clinicInfo.bookingEnabled ? "ورود امن به سامانه نوبت‌دهی مطب" : clinicInfo.bookingDisabledMessage}</p>
                </header>
                <section className="min-w-0 px-5 pb-5 pt-5 sm:px-9">{children}</section>
            </div>
            <footer className="px-4 pt-4 text-center text-sm"><RavielCredit /></footer>
        </main>
    );
};
