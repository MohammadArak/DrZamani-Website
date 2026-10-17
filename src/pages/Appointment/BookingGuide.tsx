import { useState } from "react";
import useModalScope from "@/hooks/useModalScope";
import { IoCalendarOutline, IoCheckmarkCircle, IoCloseOutline, IoMedicalOutline, IoTimeOutline } from "react-icons/io5";

const steps = [
    {title:"خدمت موردنظرتان را انتخاب کنید",text:"با دکمه «دریافت نوبت» شروع کنید. سابقه مراجعه را مشخص کنید و خدمت موردنظرتان را انتخاب کنید؛ هزینه و شرایط همان‌جا نوشته شده است.",icon:IoMedicalOutline},
    {title:"یک روز مناسب پیدا کنید",text:"در تقویم، روزهایی را که ظرفیت دارند ببینید و روز مناسب خودتان را انتخاب کنید. اگر زمان خالی نبود، می‌توانید درخواست لیست انتظار بدهید.",icon:IoCalendarOutline},
    {title:"ساعت مراجعه را انتخاب کنید",text:"از ساعت‌های آزاد همان روز، یکی را انتخاب کنید. اگر ساعت مناسبی نیست، به مرحله قبل برگردید و روز دیگری را ببینید.",icon:IoTimeOutline},
    {title:"اطلاعات را بررسی و نوبت را ثبت کنید",text:"خدمت، تاریخ، ساعت و مبلغ را دوباره بخوانید. ثبت نهایی را بزنید و اگر پرداخت لازم بود، آن را تکمیل کنید. رسید و وضعیت نوبت در بخش «نوبت‌ها» قرار می‌گیرد.",icon:IoCheckmarkCircle},
];
export default function BookingGuide({onClose,onStart,enabled}:{onClose:()=>void;onStart:()=>void;enabled:boolean}) {
    const [step,setStep]=useState(0);
    const modal=useModalScope<HTMLDivElement>(true,onClose);
    const Icon=steps[step].icon;
    return <div ref={modal} tabIndex={-1} role="dialog" aria-modal="true" aria-label="راهنمای نوبت‌گیری" className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" dir="rtl">
        <section className="app-panel-enter w-full max-w-md overflow-y-auto rounded-3xl bg-white p-5 text-slate-800 shadow-2xl" style={{maxHeight:"90dvh"}}>
            <div className="flex items-center justify-between"><span className="text-sm text-slate-600">راهنمای نوبت‌گیری · {new Intl.NumberFormat("fa-IR").format(step+1)} از ۴</span><button type="button" onClick={onClose} aria-label="بستن راهنما" className="flex h-11 w-11 items-center justify-center rounded-xl"><IoCloseOutline size={26}/></button></div>
            <div className="mt-3 flex gap-2" aria-hidden="true">{steps.map((item,index)=><span key={item.title} className={`h-1 flex-1 rounded-full ${index<=step?"bg-secondary":"bg-slate-100"}`}/>)}</div>
            <div key={step} className="app-panel-enter py-5" aria-live="polite"><Icon className="mx-auto mb-5 text-6xl text-primary"/><h2 className="font-dana text-xl text-primary">{steps[step].title}</h2><p className="mt-3 text-base leading-8 text-slate-700">{steps[step].text}</p></div>
            <div className="flex gap-3"><button type="button" disabled={!step} onClick={()=>setStep(step-1)} className="min-h-12 flex-1 rounded-xl border border-slate-200 font-bold text-primary disabled:invisible">قبلی</button><button type="button" onClick={()=>step<3?setStep(step+1):enabled?onStart():onClose()} className="min-h-12 flex-1 rounded-xl bg-secondary font-bold text-primary-deep">{step<3?"بعدی":enabled?"شروع رزرو":"متوجه شدم"}</button></div>
        </section>
    </div>;
}
