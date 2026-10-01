import {useEffect, useState} from "react";
import {contentApi, type Media, type MediaPage} from "@/services/contentApi";

export default function MediaPicker({token, label, value, disabled, onSelect}: {
    token:string; label:string; value:string; disabled:boolean; onSelect:(media:Media|null)=>void;
}) {
    const [query,setQuery]=useState("");
    const [page,setPage]=useState(1);
    const [result,setResult]=useState<MediaPage>({items:[],total:0,page:1});
    const [selected,setSelected]=useState<Media|null>(null);
    const [loading,setLoading]=useState(true);
    const [error,setError]=useState("");
    const [retry,setRetry]=useState(0);
    useEffect(()=>{
        let active=true;
        const timer=window.setTimeout(()=>{
            setLoading(true);setError("");
            void contentApi.media(token,page,query).then(data=>{if(active)setResult(data);})
                .catch(e=>{if(active)setError(e instanceof Error?e.message:"خطای دریافت رسانه");})
                .finally(()=>{if(active)setLoading(false);});
        },200);
        return()=>{active=false;window.clearTimeout(timer);};
    },[token,page,query,retry]);
    useEffect(()=>{
        let active=true;
        if(value)void contentApi.getMedia(token,value).then(media=>{if(active)setSelected(media);}).catch(()=>{});
        return()=>{active=false;};
    },[token,value]);
    const items=value&&selected?.key===value&&!result.items.some(item=>item.key===value)?[selected,...result.items]:result.items;
    return <fieldset className="media-picker"><legend>{label}</legend>
        <label>جستجوی توضیح تصویر<input value={query} maxLength={120} disabled={disabled} onChange={e=>{setQuery(e.target.value);setPage(1);}}/></label>
        <select aria-label={label} value={value} disabled={disabled||loading} onChange={e=>onSelect(items.find(item=>item.key===e.target.value)??null)}>
            <option value="">بدون انتخاب</option>{items.map(item=><option key={item.key} value={item.key}>{item.alt}</option>)}
        </select>
        {loading&&<p role="status">در حال دریافت رسانه…</p>}
        {error&&<p role="alert">{error}<button type="button" onClick={()=>setRetry(v=>v+1)}>تلاش مجدد</button></p>}
        {!loading&&!error&&result.total===0&&<p>تصویری با این توضیح پیدا نشد.</p>}
        <div className="article-actions"><button type="button" disabled={disabled||loading||page===1} onClick={()=>setPage(v=>v-1)}>رسانه‌های قبلی</button><span>صفحه {page} · {result.total} تصویر</span><button type="button" disabled={disabled||loading||page*60>=result.total} onClick={()=>setPage(v=>v+1)}>رسانه‌های بعدی</button></div>
    </fieldset>;
}
