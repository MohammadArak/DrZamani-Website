import { useEffect, useState } from "react";
import JalaliDatePicker from "@/components/JalaliDatePicker";
import { appointmentApi, toPersianDigits, type AuditLogItem } from "@/services/appointmentApi";

const field = "min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-base text-slate-800";
const initial = {q:"",actor:"",date_from:"",date_to:""};
export default function StaffAuditPanel({token}:{token:string}) {
    const [draft,setDraft]=useState(initial);
    const [filters,setFilters]=useState(initial);
    const [page,setPage]=useState(1);
    const [pageSize,setPageSize]=useState(20);
    const [refresh,setRefresh]=useState(0);
    const [result,setResult]=useState<{items:AuditLogItem[];total:number}|null>(null);
    const [loading,setLoading]=useState(true);
    const [error,setError]=useState("");
    useEffect(()=>{
        let current=true;
        const controller=new AbortController();
        const query=new URLSearchParams({page:String(page),page_size:String(pageSize)});
        Object.entries(filters).forEach(([key,value])=>{if(value)query.set(key,value);});
        appointmentApi.staffAuditPage(token,query,controller.signal).then(value=>{
            if(!current)return;
            setResult(value);setLoading(false);
        }).catch(reason=>{if(current){setError(reason instanceof Error?reason.message:"دریافت تاریخچه انجام نشد؛ دوباره تلاش کنید.");setLoading(false);}});
        return()=>{current=false;controller.abort();};
    },[token,filters,page,pageSize,refresh]);
    const begin=()=>{setLoading(true);setError("");};
    const pages=Math.max(1,Math.ceil((result?.total??0)/pageSize));
    return <section className="app-panel-enter space-y-5">
        <h2 className="font-dana text-3xl text-primary">تاریخچه عملیات</h2>
        <details className="rounded-2xl border border-slate-200 bg-white"><summary className="cursor-pointer p-4 font-bold text-primary">جست‌وجو و فیلترها{Object.values(filters).some(Boolean)&&" · فیلتر فعال"}</summary>
        <form onSubmit={event=>{event.preventDefault();begin();setPage(1);setFilters({...draft});}} className="grid gap-3 border-t border-slate-200 p-4 sm:grid-cols-2 xl:grid-cols-4">
            <label className="space-y-2 text-sm font-bold text-slate-700"><span>جست‌وجو در شرح، نام یا شناسه</span><input maxLength={150} value={draft.q} onChange={event=>setDraft({...draft,q:event.target.value})} className={field}/></label>
            <label className="space-y-2 text-sm font-bold text-slate-700"><span>انجام‌دهنده</span><select value={draft.actor} onChange={event=>setDraft({...draft,actor:event.target.value})} className={field}><option value="">همه</option><option value="staff">کارکنان</option><option value="patient">مراجعین</option><option value="system">سامانه</option></select></label>
            <div className="space-y-2 text-sm font-bold text-slate-700"><label htmlFor="audit-date-from">از تاریخ</label><JalaliDatePicker id="audit-date-from" value={draft.date_from} onChange={value=>setDraft({...draft,date_from:value})} placeholder="شروع بازه"/></div>
            <div className="space-y-2 text-sm font-bold text-slate-700"><label htmlFor="audit-date-to">تا تاریخ</label><JalaliDatePicker id="audit-date-to" value={draft.date_to} onChange={value=>setDraft({...draft,date_to:value})} placeholder="پایان بازه"/></div>
            <div className="flex flex-wrap gap-2 sm:col-span-2 xl:col-span-4"><button type="submit" className="min-h-11 rounded-xl bg-primary px-5 font-bold text-white">اعمال فیلتر</button><button type="button" onClick={()=>{begin();setDraft(initial);setFilters({...initial});setPage(1);}} className="min-h-11 rounded-xl border border-slate-300 px-4 text-primary">پاک کردن فیلترها</button><button type="button" onClick={()=>{begin();setRefresh(value=>value+1);}} className="min-h-11 rounded-xl border border-slate-300 px-4 text-primary">تازه‌سازی</button></div>
        </form></details>
        {error&&<p role="alert" className="rounded-xl bg-red-50 p-4 text-red-800">{error}</p>}
        <div aria-busy={loading} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <p role="status" className="border-b border-slate-200 p-4 text-sm text-slate-700">{loading?"در حال دریافت تاریخچه…":error?"دریافت اطلاعات انجام نشد":`${toPersianDigits(result?.total??0)} عملیات`}</p>
            {!loading&&!error&&<div className="overflow-auto" style={{maxHeight:"max(200px, calc(100dvh - 420px))",scrollbarWidth:"thin",scrollbarColor:"#9cabbc transparent"}}><table className="w-full min-w-[640px] text-right text-sm"><caption className="sr-only">سوابق عملیات؛ صفحه {toPersianDigits(page)}</caption><thead className="sticky top-0 bg-slate-50 text-slate-700"><tr>{["شرح عملیات","انجام‌دهنده","زمان","شناسه"].map(label=><th key={label} scope="col" className="p-4">{label}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{result?.items.map(item=><tr key={item.id}><td className="max-w-md p-4 leading-7 text-slate-800">{item.summary}</td><td className="p-4 text-slate-800"><b>{item.actor_name}</b><span className="mt-1 block text-slate-600">{item.actor_role==="patient"?"مراجع":item.actor_role==="system"?"سامانه":item.actor_role}</span></td><td className="whitespace-nowrap p-4 text-slate-700"><time dateTime={item.created_at}>{new Intl.DateTimeFormat("fa-IR",{dateStyle:"short",timeStyle:"short",timeZone:"Asia/Tehran"}).format(new Date(item.created_at))}</time></td><td className="p-4 text-slate-600">{item.entity_id??"—"}</td></tr>)}{!result?.items.length&&<tr><td colSpan={4} className="p-8 text-center text-slate-600">عملیاتی با این شرایط پیدا نشد.</td></tr>}</tbody></table></div>}
            <nav aria-label="صفحه‌بندی تاریخچه" className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 p-4 text-sm text-slate-700"><label className="flex items-center gap-2">تعداد در صفحه<select aria-label="تعداد در صفحه" value={pageSize} onChange={event=>{begin();setPage(1);setPageSize(Number(event.target.value));}} className="min-h-11 rounded-xl border border-slate-200 px-3">{[20,50,100].map(n=><option key={n} value={n}>{toPersianDigits(n)}</option>)}</select></label><div className="flex items-center gap-3"><button disabled={loading||page===1} onClick={()=>{begin();setPage(page-1);}} className="min-h-11 rounded-xl border border-slate-200 px-4 disabled:opacity-40">قبلی</button><span>{toPersianDigits(page)} از {toPersianDigits(pages)}</span><button disabled={loading||!!error||page>=pages} onClick={()=>{begin();setPage(page+1);}} className="min-h-11 rounded-xl border border-slate-200 px-4 disabled:opacity-40">بعدی</button></div></nav>
        </div>
    </section>;
}
