import { useClinicInfo } from "@/contexts/ClinicInfoContext";
export default function SeoPreview({title,description,path,home=false,siteName,siteUrl}:{title:string;description:string;path:string;home?:boolean;siteName?:string;siteUrl?:string}){
    const {clinicInfo}=useClinicInfo();
    const brand=siteName??(clinicInfo.seoSiteName||`وبسایت ${clinicInfo.doctorName}`);
    const suffix=` | ${brand}`;
    const full=home?title:title.endsWith(suffix)?title:`${title}${suffix}`;
    return <section aria-label="پیش‌نمایش نتیجه جست‌وجو" className="my-4 rounded-2xl border border-slate-200 bg-white p-4 text-sm">
        <p className="mb-2 text-xs text-slate-600">پیش‌نمایش تقریبی نتیجه جست‌وجو</p>
        <p dir="ltr" className="break-all text-xs text-slate-500">{(siteUrl??clinicInfo.siteUrl).replace(/\/+$/,"")}{path}</p>
        <p className="my-2 break-words text-lg font-bold text-primary">{full}</p>
        <p className="break-words leading-7 text-slate-700">{description||"توضیح مشخص و مرتبطی برای این صفحه بنویسید."}</p>
        <p className="mt-2 text-xs text-slate-500">عنوان: {full.length} نویسه · توضیح: {description.length} نویسه</p>
        <p className="mt-2 text-xs leading-6 text-slate-600">گوگل ممکن است عنوان یا توضیح دیگری نمایش دهد. عنوان کوتاه و دقیق، متن قابل‌فهم و منابع مرتبط اولویت دارند.</p>
    </section>;
}
