/* eslint-disable react-hooks/set-state-in-effect */
import {useCallback,useEffect,useState} from "react";
import {contentApi,type Media} from "@/services/contentApi";
const failure=(e:unknown)=>e instanceof Error?e.message:"خطای ارتباط با سرور";
export default function StaffMediaPanel({token}:{token:string}){
    const [items,setItems]=useState<Media[]>([]);const [alt,setAlt]=useState("");const [file,setFile]=useState<File|null>(null);const [error,setError]=useState("");const [notice,setNotice]=useState("");const [busy,setBusy]=useState(false);const [page,setPage]=useState(1);
    const load=useCallback(async()=>{try{setItems(await contentApi.media(token,page));setError("");}catch(e){setError(failure(e));}},[token,page]);
    useEffect(()=>{void load();},[load]);
    return <section className="content-admin" dir="rtl"><header><h1>کتابخانه رسانه عمومی</h1><p>این تصاویر برای مقالات هستند؛ تصویر پرونده بیماران را بارگذاری نکنید. فایل تازه تا استفاده در مقاله منتشرشده عمومی نمی‌شود.</p></header>
        {error&&<p role="alert" className="content-error">{error}</p>}{notice&&<p role="status" className="content-notice">{notice}</p>}
        <form className="media-upload" onSubmit={e=>{e.preventDefault();if(!file)return;setBusy(true);setError("");void contentApi.upload(token,file,alt).then(item=>{setItems(v=>[item,...v]);setFile(null);setAlt("");setNotice("تصویر به WebP تبدیل و بدون داده‌های EXIF ذخیره شد.");}).catch(e=>setError(failure(e))).finally(()=>setBusy(false));}}>
            <label>فایل تصویر (JPEG / PNG / WebP، حداکثر ۱۰ مگابایت)<input key={file?"selected":"empty"} type="file" accept="image/jpeg,image/png,image/webp" required onChange={e=>setFile(e.target.files?.[0]??null)}/></label>
            <label>توضیح جایگزین تصویر<input required minLength={2} maxLength={300} value={alt} onChange={e=>setAlt(e.target.value)}/></label><button className="content-primary" disabled={busy||!file}>{busy?"در حال بارگذاری…":"بارگذاری تصویر"}</button>
        </form><div className="media-grid">{items.map(m=><MediaCard key={m.key} item={m} token={token} onChange={next=>setItems(v=>v.map(old=>old.key===next.key?next:old))} onArchive={()=>setItems(v=>v.filter(old=>old.key!==m.key))} onError={setError}/>)}</div>
        <div className="article-actions"><button disabled={page===1} onClick={()=>setPage(v=>v-1)}>صفحه قبل</button><span>صفحه {page}</span><button disabled={items.length<60} onClick={()=>setPage(v=>v+1)}>صفحه بعد</button><button onClick={()=>void load()}>تازه‌سازی</button></div>
    </section>;
}
function MediaCard({item,token,onChange,onArchive,onError}:{item:Media;token:string;onChange:(next:Media)=>void;onArchive:()=>void;onError:(e:string)=>void}){
    const [alt,setAlt]=useState(item.alt);return <article className="media-card"><img src={item.preview_url} alt={item.alt} loading="lazy"/><p>{item.width} × {item.height} · {Math.round(item.size/1024)} KB</p><label>توضیح جایگزین<input value={alt} onChange={e=>setAlt(e.target.value)}/></label><div className="article-actions"><button onClick={()=>void contentApi.editMedia(token,item.key,alt).then(onChange).catch(e=>onError(failure(e)))}>ذخیره توضیح</button><button onClick={()=>{if(window.confirm("این تصویر بایگانی شود؟ رسانه استفاده‌شده قابل بایگانی نیست."))void contentApi.archiveMedia(token,item.key).then(onArchive).catch(e=>onError(failure(e)));}}>بایگانی</button></div><p className="editor-help">ویرایش و بایگانی فقط برای بارگذار یا مدیرکل مجاز است.</p></article>;
}
