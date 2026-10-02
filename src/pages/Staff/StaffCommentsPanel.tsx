/* eslint-disable react-hooks/set-state-in-effect */
import PatientComment from "@/pages/Landing/components/PatientComment";
import { appointmentApi,type Service } from "@/services/appointmentApi";
import { commentsApi,emptyComment,type CommentContent,type CommentRow } from "@/services/commentsApi";
import { useCallback,useEffect,useRef,useState } from "react";
import MediaPicker from "./MediaPicker";
import { useStaffAccess } from "./staffAccess";
import { useContentConfirm } from "./useContentConfirm";
const failure=(e:unknown)=>e instanceof Error?e.message:"خطای ارتباط با سرور";

function CommentForm({token,initial,onSaved,onDirty,onBusy}:{token:string;initial:CommentRow|null;onSaved:(row:CommentRow)=>void;onDirty:(dirty:boolean)=>void;onBusy:(busy:boolean)=>void}){
    const can=useStaffAccess();const {ask,confirmation}=useContentConfirm();const [row,setRow]=useState(initial);const [content,setContent]=useState(initial?.content??emptyComment);const [saved,setSaved]=useState(JSON.stringify(initial?.content??emptyComment()));const [services,setServices]=useState<Service[]>([]);
    const [error,setError]=useState("");const [notice,setNotice]=useState("");const [busy,setBusy]=useState(false);const [preview,setPreview]=useState(false);
    const editable=row?can("comments.edit"):can("comments.create");const dirty=editable&&JSON.stringify(content)!==saved;
    useEffect(()=>{onDirty(dirty);},[dirty,onDirty]);useEffect(()=>{onBusy(busy);},[busy,onBusy]);
    useEffect(()=>{let active=true;void appointmentApi.getServices().then(v=>{if(active)setServices(v);}).catch(()=>{});return()=>{active=false;};},[]);
    useEffect(()=>{if(!dirty)return;const warn=(e:BeforeUnloadEvent)=>e.preventDefault();window.addEventListener("beforeunload",warn);return()=>window.removeEventListener("beforeunload",warn);},[dirty]);
    const patch=<K extends keyof CommentContent>(key:K,value:CommentContent[K])=>{setPreview(false);setContent(old=>({...old,[key]:value,...(["display_name","body","age","photo_key","photo_alt","service_id"].includes(key)?{consent_received:false,privacy_reviewed:false}:{})}));};
    const accept=(next:CommentRow)=>{setRow(next);setContent(next.content);setSaved(JSON.stringify(next.content));setError("");onSaved(next);};
    const save=async()=>{
        if(!editable||busy)return;
        if(content.display_name.trim().length<2||content.body.trim().length<2){setError("نام نمایشی و متن را کامل کنید.");return;}
        setBusy(true);setError("");try{const next=await commentsApi.save(token,row,content);accept(next);setNotice("پیش‌نویس ذخیره شد؛ انتشار جداگانه است.");}catch(e){setError(failure(e));}finally{setBusy(false);}
    };
    const transition=async(action:"publish"|"unpublish")=>{
        if(!row||busy)return;if(dirty){setError("ابتدا پیش‌نویس را ذخیره و سپس پیش‌نمایش آن را بررسی کنید.");return;}
        if(!await ask(action==="publish"?"این نسخه ذخیره‌شده با نام نمایشی، متن و تصویر تأییدشده منتشر شود؟":"نظر از نمایش عمومی خارج شود؟"))return;
        setBusy(true);try{accept(await commentsApi.transition(token,row,action));setNotice(action==="publish"?"نظر منتشر شد.":"نظر غیرفعال شد.");}catch(e){setError(failure(e));}finally{setBusy(false);}
    };
    const reload=async()=>{if(!row||busy||!await ask("متن محلی با نسخه تازه سرور جایگزین شود؟"))return;setBusy(true);try{accept(await commentsApi.get(token,row.id));setPreview(false);}catch(e){setError(failure(e));}finally{setBusy(false);}};
    return <section className="article-compose">{confirmation}<h2>{row?"ویرایش نظر":"نظر تازه"}</h2><p>{row?`${row.published?"منتشرشده":"پیش‌نویس"} · نسخه ${row.revision}`:"نام نمایشی را به‌جای اطلاعات شناسایی خصوصی وارد کنید."}{row?.unpublished_changes?" · تغییرات جدید هنوز عمومی نیستند":""}</p>
        {error&&<p role="alert" className="content-error">{error} {row&&<button onClick={()=>void reload()}>خواندن نسخه تازه</button>}</p>}{notice&&<p role="status" className="content-notice">{notice}</p>}
        <div className="article-fields"><label>نام نمایشی<input maxLength={120} value={content.display_name} readOnly={!editable||busy} onChange={e=>patch("display_name",e.target.value)}/></label><label>ترتیب نمایش<input type="number" min={0} max={10000} value={content.sort_order} readOnly={!editable||busy} onChange={e=>patch("sort_order",Number(e.target.value))}/></label></div>
        <label>سن نمایشی (اختیاری)<input type="number" min={1} max={130} value={content.age??""} readOnly={!editable||busy} onChange={e=>patch("age",e.target.value?Number(e.target.value):null)}/></label>
        <label>متن نظر<textarea maxLength={2000} value={content.body} readOnly={!editable||busy} onChange={e=>patch("body",e.target.value)}/></label><p>فقط متن ساده؛ از شماره تماس، اطلاعات پرونده یا جزئیات پزشکی ناخواسته استفاده نکنید.</p>
        <label>خدمت مرتبط<select value={content.service_id??""} disabled={!editable||busy} onChange={e=>patch("service_id",e.target.value?Number(e.target.value):null)}><option value="">بدون خدمت مرتبط</option>{services.map(s=><option value={s.id} key={s.id}>{s.title}</option>)}</select></label>
        {can("media.manage")&&<MediaPicker token={token} label="تصویر اختیاری نظر" value={content.photo_key??""} disabled={!editable||busy} onSelect={m=>{setPreview(false);setContent(old=>({...old,photo_key:m?.key??null,photo_alt:m?.alt??"",consent_received:false,privacy_reviewed:false}));}}/>}
        <label>توضیح تصویر<input maxLength={300} value={content.photo_alt} readOnly={!editable||busy} onChange={e=>patch("photo_alt",e.target.value)}/></label>
        <fieldset><legend>رضایت و حریم خصوصی</legend><label className="inline-choice"><input type="checkbox" checked={content.consent_received} disabled={!editable||busy} onChange={e=>patch("consent_received",e.target.checked)}/>رضایت انتشار همین نام نمایشی، سن، متن، تصویر و خدمت مرتبط دریافت شده است</label><label>مرجع داخلی رضایت (فقط کارکنان)<input maxLength={200} value={content.consent_reference} readOnly={!editable||busy} onChange={e=>patch("consent_reference",e.target.value)}/></label><small>شناسه یا تاریخ ثبت رضایت؛ تصویر رضایت‌نامه و اطلاعات خصوصی را اینجا وارد نکنید.</small><label className="inline-choice"><input type="checkbox" checked={content.privacy_reviewed} disabled={!editable||busy} onChange={e=>patch("privacy_reviewed",e.target.checked)}/>متن و تصویر از نظر اطلاعات شخصی و پزشکی بازبینی شده‌اند</label><p>تغییر نام، سن، متن، تصویر یا خدمت تأییدها را پاک می‌کند. ذخیره با رضایت لغوشده، نظر را فوری غیرفعال می‌کند.</p></fieldset>
        <div className="article-actions">{editable&&<button disabled={busy} onClick={()=>void save()}>ذخیره پیش‌نویس نظر</button>}<button onClick={()=>setPreview(!preview)}>پیش‌نمایش نظر</button>{row&&can("comments.publish")&&<><button disabled={busy||dirty||!preview||!content.consent_received||!content.privacy_reviewed||!content.consent_reference.trim()} onClick={()=>void transition("publish")}>انتشار نظر ذخیره‌شده</button>{row.published&&<button disabled={busy} onClick={()=>void transition("unpublish")}>غیرفعال کردن نظر</button>}</>}</div>
        {preview&&<section aria-label="پیش‌نمایش نظر" className="rounded-3xl bg-[#1B273B] py-8"><div className="flex justify-center"><PatientComment name={content.display_name} age={content.age??undefined} body={content.body} imageAlt={content.photo_alt} img={content.photo_key&&can("media.manage")?`/api/v1/staff/media/${content.photo_key}/file`:undefined}/></div>{content.photo_key&&!can("media.manage")&&<p className="text-white">نمایش خصوصی تصویر به دسترسی رسانه نیاز دارد.</p>}</section>}
    </section>;
}

export default function StaffCommentsPanel({token,onDirtyChange,onBusyChange}:{token:string;onDirtyChange:(value:boolean)=>void;onBusyChange:(value:boolean)=>void}){
    const can=useStaffAccess();const {ask,confirmation}=useContentConfirm();const [items,setItems]=useState<CommentRow[]>([]);const [selected,setSelected]=useState<CommentRow|null>(null);const [open,setOpen]=useState(false);const [formKey,setFormKey]=useState(0);const [page,setPage]=useState(1);const [total,setTotal]=useState(0);const [error,setError]=useState("");const [dirty,setDirty]=useState(false);const [busy,setBusy]=useState(false);const request=useRef(0);
    const load=useCallback(async()=>{const sequence=++request.current;try{const result=await commentsApi.list(token,page);if(sequence!==request.current)return;if(page>1&&!result.items.length){setPage(Math.max(1,Math.ceil(result.total/30)));return;}setItems(result.items);setTotal(result.total);setError("");}catch(e){if(sequence===request.current)setError(failure(e));}},[token,page]);
    useEffect(()=>{void load();},[load]);useEffect(()=>{onDirtyChange(dirty);},[dirty,onDirtyChange]);useEffect(()=>{onBusyChange(busy);},[busy,onBusyChange]);useEffect(()=>()=>{request.current++;onDirtyChange(false);onBusyChange(false);},[onDirtyChange,onBusyChange]);
    const saved=useCallback((row:CommentRow)=>{setSelected(row);void load();},[load]);
    const select=async(row:CommentRow|null)=>{if(busy)return;if(dirty&&!await ask("متن ذخیره‌نشده نظر را کنار بگذارید؟"))return;try{setSelected(row?await commentsApi.get(token,row.id):null);setFormKey(v=>v+1);setOpen(true);setDirty(false);}catch(e){setError(failure(e));}};
    const archive=async(row:CommentRow)=>{if(busy)return;if(dirty&&!await ask("پیش از بایگانی، متن ذخیره‌نشده نظر را کنار بگذارید؟"))return;if(!await ask("نظر بایگانی و از نمایش عمومی خارج شود؟"))return;setBusy(true);try{await commentsApi.archive(token,row);setOpen(false);setDirty(false);void load();}catch(e){setError(failure(e));}finally{setBusy(false);}};
    return <div className="content-admin" dir="rtl">{confirmation}<header className="content-header"><div><h1>نظرات مراجعین</h1><p>انتشار با رضایت ثبت‌شده؛ بدون اتصال به اطلاعات بیمار</p></div>{can("comments.create")&&<button onClick={()=>void select(null)}>+ نظر تازه</button>}</header>{error&&<p role="alert" className="content-error">{error}<button onClick={()=>void load()}>تلاش مجدد</button></p>}
        <div className="article-list">{items.map(row=><article key={row.id}><div><b>{row.content.display_name}</b><p>{row.published?"منتشرشده":"پیش‌نویس"}{row.unpublished_changes?" · تغییرات منتشرنشده":""}</p></div><button disabled={busy} onClick={()=>void select(row)}>باز کردن نظر</button>{can("comments.delete")&&<button disabled={busy} onClick={()=>void archive(row)}>بایگانی نظر</button>}</article>)}{!items.length&&<p>هنوز نظری ثبت نشده است.</p>}</div><div className="article-actions"><button disabled={page===1} onClick={()=>setPage(v=>v-1)}>صفحه قبل نظرات</button><span>صفحه {page} · {total} نظر</span><button disabled={page*30>=total} onClick={()=>setPage(v=>v+1)}>صفحه بعد نظرات</button></div>
        {open&&<CommentForm key={formKey} token={token} initial={selected} onSaved={saved} onDirty={setDirty} onBusy={setBusy}/>}
    </div>;
}
