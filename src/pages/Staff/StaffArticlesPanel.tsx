/* eslint-disable react-hooks/set-state-in-effect */
import {useCallback,useEffect,useRef,useState} from "react";
import {contentApi,emptyArticle,safeContentHtml,type Article,type ArticleContent,type ArticleHistory,type Media,type SeoFeedback} from "@/services/contentApi";
import {useStaffAccess} from "./staffAccess";
import ArticleEditor from "./ArticleEditor";
const statusLabels:Record<string,string>={draft:"پیش‌نویس",review:"در انتظار بازبینی",published:"منتشرشده",scheduled:"زمان‌بندی‌شده",archived:"بایگانی"};
const failure=(e:unknown)=>e instanceof Error?e.message:"خطای ارتباط با سرور";

function ArticleForm({token,initial,media,onSaved,onDirty}:{token:string;initial:Article|null;media:Media[];onSaved:(row:Article)=>void;onDirty:(value:boolean)=>void}){
    const can=useStaffAccess();const [row,setRow]=useState(initial);const [content,setContent]=useState<ArticleContent>(initial?.content??emptyArticle);
    const [feedback,setFeedback]=useState<SeoFeedback|null>(initial?.seo??null);const [notice,setNotice]=useState("");const [error,setError]=useState("");
    const [busy,setBusy]=useState(false);const [paused,setPaused]=useState(false);const [auto,setAuto]=useState(true);const [preview,setPreview]=useState(false);const [mobile,setMobile]=useState(false);
    const [history,setHistory]=useState<ArticleHistory[]>([]);const [schedule,setSchedule]=useState("");
    const [savedJson,setSavedJson]=useState(initial?JSON.stringify(initial.content):"");const lastSaved=useRef(initial?JSON.stringify(initial.content):"");const current=useRef(content);const busyRef=useRef(false);const alive=useRef(true);
    const editable=row?can("articles.edit"):can("articles.create");const serialized=JSON.stringify(content);const dirty=serialized!==savedJson;
    useEffect(()=>{current.current=content;},[content]);
    useEffect(()=>{onDirty(dirty);},[dirty,onDirty]);
    useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
    useEffect(()=>{if(!dirty)return;const warn=(e:BeforeUnloadEvent)=>{e.preventDefault();};window.addEventListener("beforeunload",warn);return()=>window.removeEventListener("beforeunload",warn);},[dirty]);
    const patch=<K extends keyof ArticleContent>(key:K,value:ArticleContent[K])=>setContent(c=>({...c,[key]:value}));
    const save=useCallback(async()=>{
        if(busyRef.current)throw Error("ذخیره در حال انجام است");
        const snapshot=current.current;const sent=JSON.stringify(snapshot);
        if(row&&sent===lastSaved.current)return row;
        busyRef.current=true;setBusy(true);setError("");
        try{
            const saved=await contentApi.save(token,row?.id??null,row?.revision??0,snapshot);
            if(!alive.current)return saved;
            setRow(saved);onSaved(saved);
            if(JSON.stringify(current.current)===sent){setContent(saved.content);current.current=saved.content;lastSaved.current=JSON.stringify(saved.content);setSavedJson(lastSaved.current);}else {lastSaved.current=sent;setSavedJson(sent);}
            setNotice(saved.sanitized?"ذخیره شد؛ HTML ناسازگار یا ناامن پاک‌سازی شد.":"پیش‌نویس در سرور ذخیره شد.");return saved;
        }catch(e){if(alive.current){setError(failure(e));setPaused(true);}throw e;}
        finally{busyRef.current=false;if(alive.current)setBusy(false);}
    },[row,token,onSaved]);
    useEffect(()=>{if(!auto||paused||busy||!editable||content.title.trim().length<2||content.slug.length<2||!dirty)return;
        const timer=window.setTimeout(()=>{void save().catch(()=>{});},2200);return()=>window.clearTimeout(timer);
    },[auto,paused,busy,editable,content,dirty,save]);
    useEffect(()=>{if(content.title.trim().length<2||content.slug.length<2){setFeedback(null);return;}
        let live=true;const timer=window.setTimeout(()=>{void contentApi.analyze(token,content).then(result=>{if(live)setFeedback(result.seo);}).catch(()=>{if(live)setFeedback(null);});},650);
        return()=>{live=false;window.clearTimeout(timer);};
    },[content,token]);
    const transition=async(action:string)=>{
        try{const saved=await save();busyRef.current=true;setBusy(true);const updated=await contentApi.transition(token,saved,action,action==="schedule"?new Date(schedule).toISOString():undefined);if(!alive.current)return;setRow(updated);onSaved(updated);setNotice("وضعیت مقاله تغییر کرد.");setError("");}
        catch(e){setError(failure(e));}finally{busyRef.current=false;setBusy(false);}
    };
    const reload=async()=>{if(!row||!window.confirm("متن ذخیره‌نشده با نسخه سرور جایگزین شود؟ می‌توانید ابتدا نسخه محلی دریافت کنید."))return;try{const next=await contentApi.get(token,row.id);lastSaved.current=JSON.stringify(next.content);setSavedJson(lastSaved.current);current.current=next.content;setContent(next.content);setRow(next);setPaused(false);setError("");}catch(e){setError(failure(e));}};
    const backup=()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(content,null,2)],{type:"application/json"}));const a=document.createElement("a");a.href=url;a.download="article-unsaved.json";a.click();URL.revokeObjectURL(url);};
    const field=(key:"title"|"slug"|"summary"|"author_name"|"reviewer"|"seo_title"|"seo_description"|"target_keyword"|"cover_alt",label:string,multiline=false)=><label>{label}{multiline?<textarea value={content[key]} readOnly={!editable} onChange={e=>patch(key,e.target.value)}/>:<input value={content[key]} readOnly={!editable} dir={key==="slug"?"auto":undefined} onChange={e=>patch(key,e.target.value)}/>}</label>;
    return <div className="article-workspace">
        <section className="article-compose">
            <header><h2>{row?"ویرایش مقاله":"مقاله تازه"}</h2><p>{row?`${statusLabels[row.status]} · نسخه ${row.revision}`:"ابتدا عنوان و نشانی را وارد کنید."} {row?.has_publication&&row.unpublished_changes?"· تغییرات جدید هنوز عمومی نیستند":""}</p></header>
            {error&&<div role="alert" className="content-error">{error}<p>ذخیره خودکار متوقف شد؛ متن شما هنوز در همین صفحه است.</p><button onClick={backup}>دریافت نسخه محلی</button>{row&&<button onClick={()=>void reload()}>خواندن نسخه تازه</button>}<button onClick={()=>{setPaused(false);void save().catch(()=>{});}}>تلاش مجدد ذخیره</button></div>}
            {notice&&<p role="status" className="content-notice">{notice}</p>}
            <div className="article-fields">{field("title","عنوان مقاله")}{field("slug","نشانی یکتا (slug)")}{field("author_name","نام نویسنده")}{field("reviewer","نام بازبین پزشکی")}</div>
            {field("summary","خلاصه مقاله",true)}
            <ArticleEditor html={content.body_html} onChange={value=>patch("body_html",value)} media={media} editable={editable&&!busy}/>
            <div className="article-fields">
                <label>دسته‌ها (با ویرگول)<input value={content.categories.join(", ")} readOnly={!editable} onChange={e=>patch("categories",e.target.value.split(/[,،]/).map(v=>v.trim()).filter(Boolean))}/></label>
                <label>برچسب‌ها (با ویرگول)<input value={content.tags.join(", ")} readOnly={!editable} onChange={e=>patch("tags",e.target.value.split(/[,،]/).map(v=>v.trim()).filter(Boolean))}/></label>
                <label>تصویر شاخص<select value={content.cover_key??""} disabled={!editable} onChange={e=>{const m=media.find(item=>item.key===e.target.value);setContent(v=>({...v,cover_key:m?.key??null,cover_alt:m?.alt??""}));}}><option value="">بدون تصویر شاخص</option>{media.map(m=><option key={m.key} value={m.key}>{m.alt}</option>)}</select></label>{field("cover_alt","توضیح تصویر شاخص")}
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
            {preview&&<section aria-label="پیش‌نمایش مقاله"><label className="inline-choice"><input type="checkbox" checked={mobile} onChange={e=>setMobile(e.target.checked)}/>نمای موبایل</label><div className={`article-preview ${mobile?"article-preview--mobile":""}`}><h1>{content.title}</h1><p>{content.summary}</p><p>نویسنده: {content.author_name} · بازبین: {content.reviewer}</p><div className="article-body" dangerouslySetInnerHTML={{__html:safeContentHtml(content.body_html,true)}}/></div></section>}
            {history.length>0&&<section><h3>تاریخچه — بازیابی فقط پیش‌نویس را تغییر می‌دهد</h3>{history.map(h=><div className="history-row" key={h.id}><span>نسخه {h.revision} · {h.action} · {new Date(h.created_at+"Z").toLocaleString("fa-IR")}</span>{editable&&row&&<button disabled={busy} onClick={()=>{if(!window.confirm("پیش‌نویس با این نسخه جایگزین شود؟"))return;void contentApi.restore(token,row,h.id).then(next=>{lastSaved.current=JSON.stringify(next.content);setSavedJson(lastSaved.current);current.current=next.content;setContent(next.content);setRow(next);onSaved(next);setPaused(false);setNotice("پیش‌نویس بازیابی شد؛ انتشار جداگانه لازم است.");}).catch(e=>setError(failure(e)));}}>بازیابی پیش‌نویس</button>}</div>)}</section>}
        </section>
        <aside className="article-seo" aria-label="بازخورد سئو"><h2>کیفیت نگارش و سئو</h2>{feedback?<><strong className="seo-score">{feedback.score}<small> / ۱۰۰</small></strong><p>{feedback.word_count} واژه</p><p>{feedback.notice}</p>{feedback.checks.map(check=><div className={`seo-check ${check.passed?"seo-check--pass":""}`} key={check.code}><b>{check.passed?"✓":"△"} {check.reason}</b>{check.suggestion&&<p>{check.suggestion}</p>}</div>)}</>:<p>پس از عنوان، نشانی معتبر و تکمیل فیلدها، بازخورد سرور به‌روز می‌شود.</p>}</aside>
    </div>;
}

export default function StaffArticlesPanel({token}:{token:string}){
    const can=useStaffAccess();const [items,setItems]=useState<Article[]>([]);const [media,setMedia]=useState<Media[]>([]);const [selected,setSelected]=useState<Article|null>(null);const [formKey,setFormKey]=useState(0);const [open,setOpen]=useState(false);const [error,setError]=useState("");const [dirty,setDirty]=useState(false);const [page,setPage]=useState(1);const [total,setTotal]=useState(0);
    const saved=useCallback((row:Article)=>setItems(list=>[row,...list.filter(v=>v.id!==row.id)]),[]);
    const load=useCallback(async()=>{try{const list=await contentApi.list(token,page);setItems(list.items);setTotal(list.total);if(can("media.manage"))setMedia(await contentApi.media(token));setError("");}catch(e){setError(failure(e));}},[token,page,can]);
    useEffect(()=>{void load();},[load]);
    const select=(row:Article|null)=>{if(dirty&&!window.confirm("تغییرات هنوز ذخیره نشده‌اند؛ از ویرایش خارج شوید؟"))return;setSelected(row);setFormKey(v=>v+1);setOpen(true);setDirty(false);};
    return <div className="content-admin" dir="rtl"><header className="content-header"><div><h1>مقالات و آموزش</h1><p>نوشتن، بازبینی و انتشار با دسترسی‌های مستقل</p></div>{can("articles.create")&&<button className="content-primary" onClick={()=>select(null)}>+ مقاله تازه</button>}</header>{error&&<p role="alert" className="content-error">{error}<button onClick={()=>void load()}>تلاش مجدد</button></p>}
        <div className="article-list">{items.map(item=><article key={item.id}><div><b>{item.content.title}</b><p>{statusLabels[item.status]} · /articles/{item.content.slug}/ {item.has_publication&&item.unpublished_changes?"· تغییرات منتشرنشده":""}</p></div><button onClick={()=>select(item)}>باز کردن</button>{can("articles.delete")&&<button onClick={()=>{if(!window.confirm("مقاله بایگانی و از نمایش عمومی خارج شود؟"))return;void contentApi.archive(token,item).then(()=>load()).catch(e=>setError(failure(e)));}}>بایگانی</button>}</article>)}{!items.length&&<p>هنوز مقاله‌ای ثبت نشده است.</p>}</div>
        <div className="article-actions"><button disabled={page===1} onClick={()=>setPage(v=>v-1)}>صفحه قبل</button><span>صفحه {page} · {total} مقاله</span><button disabled={page*30>=total} onClick={()=>setPage(v=>v+1)}>صفحه بعد</button><button onClick={()=>void load()}>تازه‌سازی فهرست</button></div>
        {open&&<ArticleForm key={formKey} token={token} initial={selected} media={media} onSaved={saved} onDirty={setDirty}/>}
    </div>;
}
