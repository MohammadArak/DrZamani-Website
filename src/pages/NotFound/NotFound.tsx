import SpaceSignBoard from "@/assets/svg/SpaceSignBoard";
import Seo from "@/components/SEO";
import { useClinicInfo } from "@/contexts/ClinicInfoContext";

const NotFound = () => {
    const { clinicInfo } = useClinicInfo();
    return (
        <>
            <Seo
                title={`صفحه پیدا نشد | ${clinicInfo.doctorName}`}
                description="صفحه‌ای که به دنبال آن بودید پیدا نشد."
                canonical={`${clinicInfo.siteUrl}/404`}
                noIndex
            />
            <main className="min-h-screen w-full bg-jetblack">
                <div className="min-h-screen flex flex-col items-center justify-center">
                    <SpaceSignBoard height={280} width={280} />
                    <div className="mt-10 text-center">
                        <h1 className="text-xl text-white">
                            صفحه مورد نظر یافت نشد
                        </h1>
                        <a
                            className="mt-5 flex gap-2 px-2 py-1 text-sm md:text-base md:px-5 md:py-3 text-jetblack justify-center items-center bg-linear-to-b from-secondary-mild to-secondary hover:scale-105 transition rounded-md shadow-md shadow-secondary-deep/50"
                            href="/"
                        >
                            بازگشت به صفحه اصلی
                        </a>
                    </div>
                </div>
            </main>
        </>
    );
};

export default NotFound;
