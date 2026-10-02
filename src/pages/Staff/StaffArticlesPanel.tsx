/* eslint-disable react-hooks/set-state-in-effect */
import { contentApi,emptyArticle,safeContentHtml,type Article,type ArticleContent,type ArticleHistory,type SeoFeedback } from "@/services/contentApi";
import { useCallback,useEffect,useRef,useState } from "react";
import ArticleEditor from "./ArticleEditor";
import MediaPicker from "./MediaPicker";
import { articleValidation } from "./articleValidation";
import { useStaffAccess } from "./staffAccess";
import { useContentConfirm } from "./useContentConfirm";
const statusLabels:Record<string,string>={draft:"پیش‌نویس",review:"در انتظار بازبینی",published:"منتشرشده",scheduled:"زمان‌بندی‌شده",archived:"بایگانی"};
const failure=(e:unknown)=>e instanceof Error?e.message:"خطای ارتباط با سرور";

function ArticleForm({token,initial,onSaved,onDirty,onBusy}:{token:string;initial:Article|null;onSaved:(row:Article)=>void;onDirty:(value:boolean)=>void;onBusy:(value:boolean)=>void}){
    const {ask,confirmation}=useContentConfirm();
    const can=useStaffAccess();const [row,setRow]=useState(initial);const [content,setContent]=useState<ArticleContent>(initial?.content??emptyArticle);
    const [feedback,setFeedback]=useState<SeoFeedback|null>(initial?.seo??null);const [notice,setNotice]=useState("");const [error,setError]=useState("");
    const [busy,setBusy]=useState(false);const [paused,setPaused]=useState(false);const [auto,setAuto]=useState(true);const [preview,setPreview]=useState(false);const [mobile,setMobile]=useState(false);
    const [history,setHistory]=useState<ArticleHistory[]>([]);const [schedule,setSchedule]=useState("");
    const [categoriesText,setCategoriesText]=useState(initial?.content.categories.join("، ")??"");
    const [tagsText,setTagsText]=useState(initial?.content.tags.join("، ")??"");
    const [seoError,setSeoError]=useState("");
    const rowRef=useRef(row);
    const [savedJson,setSavedJson]=useState(JSON.stringify(initial?.content??emptyArticle()));const lastSaved=useRef(JSON.stringify(initial?.content??emptyArticle()));const current=useRef(content);const busyRef=useRef(false);const alive=useRef(true);
    const editable=row?can("articles.edit"):can("articles.create");const serialized=JSON.stringify(content);const dirty=editable&&serialized!==savedJson;
    useEffect(()=>{current.current=content;},[content]);
    useEffect(()=>{onDirty(dirty);},[dirty,onDirty]);
    useEffect(()=>{onBusy(busy);},[busy,onBusy]);
    useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
    useEffect(()=>{if(!dirty)return;const warn=(e:BeforeUnloadEvent)=>{e.preventDefault();};window.addEventListener("beforeunload",warn);return()=>window.removeEventListener("beforeunload",warn);},[dirty]);
    const patch=<K extends keyof ArticleContent>(key:K,value:ArticleContent[K])=>setContent(c=>({...c,[key]:value}));
    const save=useCallback(async()=>{
        if(busyRef.current)throw Error("ذخیره در حال انجام است");
        const snapshot=current.current;const sent=JSON.stringify(snapshot);
        const stored=rowRef.current;
        if(stored&&sent===lastSaved.current)return stored;
        if(!editable)throw Error("مجوز ذخیره مقاله را ندارید");
        const invalid=articleValidation(snapshot);if(invalid){setError(invalid);throw Error(invalid);}
        busyRef.current=true;setBusy(true);setError("");
        try{
            const saved=await contentApi.save(token,stored?.id??null,stored?.revision??0,snapshot);
            if(!alive.current)return saved;
            rowRef.current=saved;setRow(saved);onSaved(saved);
            if(JSON.stringify(current.current)===sent){setContent(saved.content);current.current=saved.content;lastSaved.current=JSON.stringify(saved.content);setSavedJson(lastSaved.current);}else {lastSaved.current=sent;setSavedJson(sent);}
            setNotice(saved.sanitized?"ذخیره شد؛ HTML ناسازگار یا ناامن پاک‌سازی شد.":"پیش‌نویس در سرور ذخیره شد.");return saved;
        }catch(e){if(alive.current){setError(failure(e));setPaused(true);}throw e;}
        finally{busyRef.current=false;if(alive.current)setBusy(false);}
    },[editable,token,onSaved]);
    useEffect(()=>{if(!auto||paused||busy||!editable||articleValidation(content)||!dirty)return;
        const timer=window.setTimeout(()=>{void save().catch(()=>{});},2200);return()=>window.clearTimeout(timer);
    },[auto,paused,busy,editable,content,dirty,save]);
    useEffect(()=>{if(articleValidation(content)){setFeedback(null);setSeoError("");return;}
        let live=true;const timer=window.setTimeout(()=>{void contentApi.analyze(token,content).then(result=>{if(live){setFeedback(result.seo);setSeoError("");}}).catch(e=>{if(live){setFeedback(null);setSeoError(failure(e));}});},650);
        return()=>{live=false;window.clearTimeout(timer);};
    },[content,token]);
    const transition=async(action:string)=>{
        if(busyRef.current)return;
        try{const saved=editable?await save():rowRef.current;if(!saved)throw Error("ابتدا مقاله را ذخیره کنید");if(editable&&JSON.stringify(current.current)!==lastSaved.current)throw Error("متن هنگام ذخیره تغییر کرد؛ پیش از تغییر وضعیت دوباره ذخیره کنید");busyRef.current=true;setBusy(true);const updated=await contentApi.transition(token,saved,action,action==="schedule"?new Date(schedule).toISOString():undefined);if(!alive.current)return;rowRef.current=updated;setRow(updated);onSaved(updated);setNotice("وضعیت مقاله تغییر کرد.");setError("");}
        catch(e){if(alive.current)setError(failure(e));}finally{busyRef.current=false;if(alive.current)setBusy(false);}
    };
    const accept=(next:Article)=>{rowRef.current=next;lastSaved.current=JSON.stringify(next.content);setSavedJson(lastSaved.current);current.current=next.content;setContent(next.content);setCategoriesText(next.content.categories.join("، "));setTagsText(next.content.tags.join("، "));setRow(next);setPaused(false);setError("");};
    const reload=async()=>{if(busyRef.current||!row||!await ask("متن ذخیره‌نشده با نسخه سرور جایگزین شود؟ می‌توانید ابتدا نسخه محلی دریافت کنید."))return;busyRef.current=true;setBusy(true);try{const next=await contentApi.get(token,row.id);if(alive.current)accept(next);}catch(e){if(alive.current)setError(failure(e));}finally{busyRef.current=false;if(alive.current)setBusy(false);}};
    const restore=async(id:number)=>{if(busyRef.current||!rowRef.current||!await ask("پیش‌نویس با این نسخه جایگزین شود؟ متن ذخیره‌نشده جایگزین می‌شود."))return;busyRef.current=true;setBusy(true);try{const next=await contentApi.restore(token,rowRef.current,id);if(alive.current){accept(next);onSaved(next);setNotice("پیش‌نویس بازیابی شد؛ انتشار جداگانه لازم است.");}}catch(e){if(alive.current){setPaused(true);setError(failure(e));}}finally{busyRef.current=false;if(alive.current)setBusy(false);}};
    const backup=()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(content,null,2)],{type:"application/json"}));const a=document.createElement("a");a.href=url;a.download="article-unsaved.json";a.click();URL.revokeObjectURL(url);};
    const field=(key:"title"|"slug"|"summary"|"author_name"|"reviewer"|"seo_title"|"seo_description"|"target_keyword"|"cover_alt",label:string,multiline=false)=><label>{label}{multiline?<textarea value={content[key]} readOnly={!editable} onChange={e=>patch(key,e.target.value)}/>:<input value={content[key]} readOnly={!editable} dir={key==="slug"?"auto":undefined} onChange={e=>patch(key,e.target.value)}/>}</label>;
    return <div className="article-workspace">{confirmation}
        <section className="article-compose">
            <header><h2>{row?"ویرایش مقاله":"مقاله تازه"}</h2><p>{row?`${statusLabels[row.status]} · نسخه ${row.revision}`:"ابتدا عنوان و نشانی را وارد کنید."} {row?.has_publication&&row.unpublished_changes?"· تغییرات جدید هنوز عمومی نیستند":""}</p></header>
            {error&&<div role="alert" className="content-error">{error}<p>ذخیره خودکار متوقف شد؛ متن شما هنوز در همین صفحه است.</p><button onClick={backup}>دریافت نسخه محلی</button>{row&&<button onClick={()=>void reload()}>خواندن نسخه تازه</button>}<button onClick={()=>{setPaused(false);void save().catch(()=>{});}}>تلاش مجدد ذخیره</button></div>}
            {notice&&<p role="status" className="content-notice">{notice}</p>}
            <div className="article-fields">{field("title","عنوان مقاله")}{field("slug","نشانی یکتا (slug)")}{field("author_name","نام نویسنده")}{field("reviewer","نام بازبین پزشکی")}</div>
            {field("summary","خلاصه مقاله",true)}
            <ArticleEditor html={content.body_html} onChange={value=>patch("body_html",value)} token={token} canUseMedia={can("media.manage")} editable={editable}/>
            <div className="article-fields">
                <label>دسته‌ها (با ویرگول)<input value={categoriesText} readOnly={!editable} onChange={e=>{setCategoriesText(e.target.value);patch("categories",e.target.value.split(/[,،]/).map(v=>v.trim()).filter(Boolean));}}/><small>حداکثر ۱۰ دسته، هر کدام ۸۰ نویسه</small></label>
                <label>برچسب‌ها (با ویرگول)<input value={tagsText} readOnly={!editable} onChange={e=>{setTagsText(e.target.value);patch("tags",e.target.value.split(/[,،]/).map(v=>v.trim()).filter(Boolean));}}/><small>حداکثر ۲۰ برچسب، هر کدام ۸۰ نویسه</small></label>
                {can("media.manage")&&<MediaPicker token={token} label="تصویر شاخص" value={content.cover_key??""} disabled={!editable} onSelect={m=>setContent(v=>({...v,cover_key:m?.key??null,cover_alt:m?.alt??""}))}/>}{field("cover_alt","توضیح تصویر شاخص")}
            </div>
            <fieldset><legend>منابع</legend>{content.sources.map((s,i)=><div className="source-row" key={i}><label>عنوان منبع<input value={s.title} readOnly={!editable} onChange={e=>patch("sources",content.sources.map((v,j)=>j===i?{...v,title:e.target.value}:v))}/></label><label>نشانی HTTPS<input dir="ltr" value={s.url} readOnly={!editable} onChange={e=>patch("sources",content.sources.map((v,j)=>j===i?{...v,url:e.target.value}:v))}/></label>{editable&&<button onClick={()=>patch("sources",content.sources.filter((_,j)=>j!==i))}>حذف منبع</button>}</div>)}{editable&&<button onClick={()=>patch("sources",[...content.sources,{title:"",url:""}])}>افزودن منبع</button>}</fieldset>
            <fieldset><legend>اطلاعات سئو</legend><div className="article-fields">{field("seo_title","عنوان نتیجه جستجو")}{field("target_keyword","عبارت هدف")}</div>{field("seo_description","توضیح نتیجه جستجو",true)}</fieldset>
            <div className="article-actions">
                {editable&&<><button disabled={busy} onClick={()=>void save().catch(()=>{})}>{busy?"در حال ذخیره…":"ذخیره پیش‌نویس"}</button><label className="inline-choice"><input type="checkbox" checked={auto} onChange={e=>setAuto(e.target.checked)}/>ذخیره خودکار</label></>}
                <button onClick={()=>setPreview(!preview)}>{preview?"بستن پیش‌نمایش":"پیش‌نمایش امن"}</button>
                {row&&<button onClick={()=>void contentApi.history(token,row.id).then(setHistory).catch(e=>setError(failure(e)))}>تاریخچه نسخه‌ها</button>}
                {row&&can("articles.edit")&&<button disabled={busy} onClick={()=>void transition("review")}>ارسال برای بازبینی</button>}
                {can("articles.publish")&&<button className="content-primary" disabled={busy||!row&&!editable} onClick={()=>void transition("publish")}>انتشار نسخه ذخیره‌شده</button>}
                {row?.has_publication&&can("articles.publish")&&<button disabled={busy} onClick={()=>void transition("unpublish")}>خارج کردن از انتشار</button>}
            </div>
            {can("articles.publish")&&<div className="article-actions"><label>زمان انتشار (زمان محلی دستگاه)<input type="datetime-local" value={schedule} onChange={e=>setSchedule(e.target.value)}/></label><button disabled={busy||!schedule} onClick={()=>void transition("schedule")}>تأیید و زمان‌بندی</button>{row?.scheduled_at&&<><p>زمان تأییدشده: {new Date(row.scheduled_at+"Z").toLocaleString("fa-IR")}</p><button disabled={busy} onClick={()=>void transition("cancel_schedule")}>لغو زمان‌بندی</button></>}</div>}
            {preview&&<section aria-label="پیش‌نمایش مقاله"><label className="inline-choice"><input type="checkbox" checked={mobile} onChange={e=>setMobile(e.target.checked)}/>نمای موبایل</label><div className={`article-preview ${mobile?"article-preview--mobile":""}`}><h1>{content.title}</h1><p>{content.summary}</p>{content.cover_key&&<img className="article-cover" src={`/api/v1/staff/media/${content.cover_key}/file`} alt={content.cover_alt}/>}<p>نویسنده: {content.author_name} · بازبین: {content.reviewer}</p><div className="article-body" dangerouslySetInnerHTML={{__html:safeContentHtml(content.body_html,true)}}/></div></section>}
            {history.length>0&&<section><h3>تاریخچه — بازیابی فقط پیش‌نویس را تغییر می‌دهد</h3>{history.map(h=><div className="history-row" key={h.id}><span>نسخه {h.revision} · {h.action} · {new Date(h.created_at+"Z").toLocaleString("fa-IR")}</span>{editable&&row&&<button disabled={busy} onClick={()=>void restore(h.id)}>بازیابی پیش‌نویس</button>}</div>)}</section>}
        </section>
        <aside className="article-seo" aria-label="بازخورد سئو"><h2>کیفیت نگارش و سئو</h2>{feedback?<><strong className="seo-score">{feedback.score}<small> / ۱۰۰</small></strong><p>{feedback.word_count} واژه</p><p>{feedback.notice}</p>{feedback.checks.map(check=><div className={`seo-check ${check.passed?"seo-check--pass":""}`} key={check.code}><b>{check.passed?"✓":"△"} {check.reason}</b>{check.suggestion&&<p>{check.suggestion}</p>}</div>)}</>:<p role="status">{articleValidation(content)||seoError||"بازخورد سئو در حال دریافت است."}</p>}</aside>
    </div>;
}

export default function StaffArticlesPanel({token,onDirtyChange,onBusyChange}:{token:string;onDirtyChange?:(value:boolean)=>void;onBusyChange?:(value:boolean)=>void}){
    const {ask,confirmation}=useContentConfirm();
    const can=useStaffAccess();const [items,setItems]=useState<Article[]>([]);const [selected,setSelected]=useState<Article|null>(null);const [formKey,setFormKey]=useState(0);const [open,setOpen]=useState(false);const [error,setError]=useState("");const [dirty,setDirty]=useState(false);const [page,setPage]=useState(1);const [total,setTotal]=useState(0);const [saving,setSaving]=useState(false);
    const request=useRef(0);const selection=useRef(0);
    const load=useCallback(async()=>{const sequence=++request.current;try{const list=await contentApi.list(token,page);if(sequence!==request.current)return;if(page>1&&!list.items.length){setPage(Math.max(1,Math.ceil(list.total/30)));return;}setItems(list.items);setTotal(list.total);setError("");}catch(e){if(sequence===request.current)setError(failure(e));}},[token,page]);
    useEffect(()=>{onDirtyChange?.(dirty);},[dirty,onDirtyChange]);
    useEffect(()=>{onBusyChange?.(saving);},[saving,onBusyChange]);
    useEffect(()=>()=>{onDirtyChange?.(false);onBusyChange?.(false);},[onDirtyChange,onBusyChange]);
    const saved=useCallback((row:Article)=>{setSelected(row);void load();},[load]);
    useEffect(()=>{void load();},[load]);
    const select=async(row:Article|null)=>{if(saving){setError("ذخیره در حال انجام است؛ پس از پایان آن مقاله دیگری باز کنید.");return;}if(dirty&&!await ask("تغییرات هنوز ذخیره نشده‌اند؛ از ویرایش خارج شوید؟"))return;const sequence=++selection.current;if(row){void contentApi.get(token,row.id).then(next=>{if(sequence!==selection.current)return;setSelected(next);setFormKey(v=>v+1);setOpen(true);setDirty(false);}).catch(e=>setError(failure(e)));}else{setSelected(null);setFormKey(v=>v+1);setOpen(true);setDirty(false);}};
    return <div className="content-admin" dir="rtl">{confirmation}<header className="content-header"><div><h1>مقالات و آموزش</h1><p>نوشتن، بازبینی و انتشار با دسترسی‌های مستقل</p></div>{can("articles.create")&&<button className="content-primary" onClick={()=>select(null)}>+ مقاله تازه</button>}</header>{error&&<p role="alert" className="content-error">{error}<button onClick={()=>void load()}>تلاش مجدد</button></p>}
        <div className="article-list">{items.map(item=><article key={item.id}><div><b>{item.content.title}</b><p>{statusLabels[item.status]} · /articles/{item.content.slug}/ {item.has_publication&&item.unpublished_changes?"· تغییرات منتشرنشده":""}</p></div><button onClick={()=>select(item)}>باز کردن</button>{can("articles.delete")&&<button disabled={saving} onClick={async()=>{if(dirty&&selected?.id===item.id&&!await ask("تغییرات ذخیره‌نشده دارید؛ برای بایگانی از ویرایش خارج شوید؟"))return;if(!await ask("مقاله بایگانی و از نمایش عمومی خارج شود؟"))return;void contentApi.archive(token,item).then(()=>{if(selected?.id===item.id){setOpen(false);setDirty(false);}void load();}).catch(e=>setError(failure(e)));}}>بایگانی</button>}</article>)}{!items.length&&<p>هنوز مقاله‌ای ثبت نشده است.</p>}</div>
        <div className="article-actions"><button disabled={page===1} onClick={()=>setPage(v=>v-1)}>صفحه قبل</button><span>صفحه {page} · {total} مقاله</span><button disabled={page*30>=total} onClick={()=>setPage(v=>v+1)}>صفحه بعد</button><button onClick={()=>void load()}>تازه‌سازی فهرست</button></div>
        {open&&<ArticleForm key={formKey} token={token} initial={selected} onSaved={saved} onDirty={setDirty} onBusy={setSaving}/>}
    </div>;
}
