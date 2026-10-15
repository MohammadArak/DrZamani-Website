/* eslint-disable react-hooks/set-state-in-effect */
import {contentApi,type Media} from "@/services/contentApi";
import {useCallback,useEffect,useRef,useState} from "react";
import {useContentConfirm} from "./useContentConfirm";
const failure=(e:unknown)=>e instanceof Error?e.message:"خطای ارتباط با سرور";
export default function StaffMediaPanel({token}:{token:string}){
    const [items,setItems]=useState<Media[]>([]),[alt,setAlt]=useState(""),[file,setFile]=useState<File|null>(null);
    const [error,setError]=useState(""),[notice,setNotice]=useState(""),[busy,setBusy]=useState(false),[page,setPage]=useState(1),[total,setTotal]=useState(0);
    const [query,setQuery]=useState(""),[search,setSearch]=useState(""),[trash,setTrash]=useState(false),[uploadVersion,setUploadVersion]=useState(0);
    const sequence=useRef(0);
    const [loading,setLoading]=useState(true);
    const load=useCallback(async()=>{const current=++sequence.current;setLoading(true);try{
        const result=await contentApi.media(token,page,query,trash);if(current!==sequence.current)return;
        if(page>1&&!result.items.length){setPage(Math.max(1,Math.ceil(result.total/60)));return;}
        setItems(result.items);setTotal(result.total);setError("");
    }catch(e){if(current===sequence.current)setError(failure(e));}finally{if(current===sequence.current)setLoading(false);}},[token,page,query,trash]);
    useEffect(()=>{const requests=sequence;void load();return()=>{requests.current++;};},[load]);
    return <section className="content-admin" dir="rtl"><header><h1>تصاویر</h1><p>تصاویر سایت را اینجا مدیریت کنید. تصویر پرونده بیماران را بارگذاری نکنید؛ فایل تازه تا استفاده در محتوای منتشرشده عمومی نمی‌شود.</p></header>
        {error&&<p role="alert" className="content-error">{error}</p>}{notice&&<p role="status" className="content-notice">{notice}</p>}
        {!trash&&<form className="media-upload" onSubmit={e=>{e.preventDefault();if(!file||busy)return;setBusy(true);setError("");void contentApi.upload(token,file,alt).then(()=>{if(page!==1)setPage(1);else void load();setFile(null);setUploadVersion(v=>v+1);setAlt("");setNotice("تصویر بهینه و بدون اطلاعات EXIF ذخیره شد.");}).catch(e=>setError(failure(e))).finally(()=>setBusy(false));}}>
            <label>فایل تصویر (JPEG / PNG / WebP، حداکثر ۱۰ مگابایت)<input key={uploadVersion} type="file" accept="image/jpeg,image/png,image/webp" required disabled={busy} onChange={e=>setFile(e.target.files?.[0]??null)}/></label>
            <label>توضیح جایگزین تصویر<input required minLength={2} maxLength={300} disabled={busy} value={alt} onChange={e=>setAlt(e.target.value)}/></label><button className="content-primary" disabled={busy||!file}>{busy?"در حال بارگذاری…":"بارگذاری تصویر"}</button>
        </form>}
        <div className="article-actions"><label className="inline-choice"><input type="checkbox" checked={trash} disabled={busy} onChange={e=>{setTrash(e.target.checked);setPage(1);}}/>تصاویر حذف‌شده</label></div>
        <form onSubmit={e=>{e.preventDefault();setQuery(search);setPage(1);}} className="article-actions"><label>جستجوی تصاویر<input value={search} maxLength={120} onChange={e=>setSearch(e.target.value)}/></label><button type="submit">جستجو</button></form>
        {trash&&<p>بازیابی تصویر آن را دوباره به کتابخانه برمی‌گرداند؛ انتشار خودکار انجام نمی‌شود.</p>}
        {loading?<p role="status">در حال دریافت تصاویر…</p>:<div className="media-grid">{!items.length&&<p>{trash?"تصویر حذف‌شده‌ای پیدا نشد.":"تصویری با این توضیح پیدا نشد."}</p>}{items.map(item=><MediaCard key={item.key} item={item} token={token} onChange={next=>setItems(v=>v.map(old=>old.key===next.key?next:old))} onReload={()=>void load()} onError={setError}/>)}</div>}
        <div className="article-actions"><button disabled={loading||page===1} onClick={()=>setPage(v=>v-1)}>صفحه قبل</button><span>صفحه {page} · {total} تصویر</span><button disabled={loading||page*60>=total} onClick={()=>setPage(v=>v+1)}>صفحه بعد</button><button disabled={loading} onClick={()=>void load()}>تازه‌سازی</button></div>
    </section>;
}
function MediaCard({item,token,onChange,onReload,onError}:{item:Media;token:string;onChange:(next:Media)=>void;onReload:()=>void;onError:(e:string)=>void}){
    const {ask,confirmation}=useContentConfirm();const [alt,setAlt]=useState(item.alt),[busy,setBusy]=useState(false);
    const run=async(action:()=>Promise<unknown>)=>{if(busy)return;setBusy(true);try{await action();}catch(e){onError(failure(e));}finally{setBusy(false);}};
    return <article className="media-card">{confirmation}{!item.deleted&&<img src={item.preview_url} alt={item.alt} loading="lazy" width={item.width} height={item.height}/>}<p>{item.width} × {item.height} · {Math.round(item.size/1024)} KB</p>
        {item.deleted?<><p>{item.alt}</p><button disabled={busy} onClick={()=>void run(async()=>{await contentApi.unarchiveMedia(token,item.key);onReload();})}>بازیابی تصویر</button></>:<>
            <label>توضیح جایگزین<input maxLength={300} value={alt} disabled={busy} onChange={e=>setAlt(e.target.value)}/></label>
            <div className="article-actions"><button disabled={busy} onClick={()=>void run(async()=>onChange(await contentApi.editMedia(token,item.key,alt)))}>ذخیره توضیح</button><button disabled={busy} onClick={async()=>{if(await ask("تصویر به بخش حذف‌شده‌ها منتقل شود؟ اگر در مقاله، نظر، خدمت یا نمونه‌کار استفاده شده باشد ابتدا باید آن را از همان مطلب بردارید."))void run(async()=>{await contentApi.archiveMedia(token,item.key);onReload();});}}>حذف تصویر</button></div>
        </>}<p className="editor-help">ویرایش، حذف و بازیابی فقط برای بارگذار یا مدیرکل مجاز است.</p>
    </article>;
}
