import {useEffect,useRef,useState} from "react";
import {apiRequest} from "@/services/appointmentApi";

type Suggestion={seo_title:string;seo_description:string;target_keyword:string;suggestions:string[]};
type Status={enabled:boolean;provider:string;requests_per_hour:number;destination:string|null};
type Props={token:string;kind:"article"|"service";title:string;description:string;keyword?:string;html:string;contextKey:string;disabled:boolean;autosave?:boolean;onBusy:(value:boolean)=>void;onApply:(suggestion:Suggestion)=>void};
const providers:Record<string,string>={disabled:"خاموش",avalai:"AvalAI",gapgpt:"GapGPT",cloudflare:"Cloudflare",custom:"سرویس انتخاب‌شده"};
const plain=(html:string)=>{
    const document=new DOMParser().parseFromString(html.replace(/<\/(p|h[1-6]|li|blockquote|tr|div)>/gi,"$&\n"),"text/html");
    document.querySelectorAll("script,style").forEach(node=>node.remove());
    return document.body.textContent?.trim().slice(0,12000)||"";
};

export default function EditorialSeoAssistant({token,kind,title,description,keyword="",html,contextKey,disabled,autosave=false,onBusy,onApply}:Props){
    const [status,setStatus]=useState<Status|null>(null);
    const [open,setOpen]=useState(false);
    const [text,setText]=useState("");
    const [consent,setConsent]=useState("");
    const [busy,setBusy]=useState(false);
    const [error,setError]=useState("");
    const [result,setResult]=useState<{data:Suggestion;signature:string}|null>(null);
    const controller=useRef<AbortController|null>(null);
    const alive=useRef(true);
    const signature=JSON.stringify([contextKey,text]);
    useEffect(()=>{
        alive.current=true;const request=new AbortController();
        void apiRequest<Status>("/staff/editorial-assistance/status",{signal:request.signal},token)
            .then(value=>{if(alive.current)setStatus(value);})
            .catch(failure=>{if(alive.current&&!request.signal.aborted)setError(failure instanceof Error?failure.message:"تنظیمات دریافت نشد");});
        return()=>{alive.current=false;request.abort();controller.current?.abort();onBusy(false);};
    },[token,onBusy]);
    const run=async()=>{
        if(busy||disabled||!status?.enabled||consent!==signature||text.length<100||title.trim().length<2)return;
        const sentSignature=signature;
        const request=new AbortController();controller.current=request;
        setBusy(true);onBusy(true);setError("");setResult(null);
        try{
            const answer=await apiRequest<{suggestion:Suggestion}>("/staff/editorial-assistance",{method:"POST",signal:request.signal,body:JSON.stringify({kind,title,description,keyword,text,consent_to_send:true})},token);
            if(alive.current)setResult({data:answer.suggestion,signature:sentSignature});
        }catch(failure){if(alive.current&&!request.signal.aborted)setError(failure instanceof Error?failure.message:"پیشنهاد دریافت نشد");}
        finally{if(alive.current){setBusy(false);onBusy(false);}controller.current=null;}
    };
    return <section aria-label="دستیار پیشنهاد سئو" className="article-preview">
        <h3>دستیار پیشنهاد سئو</h3>
        <p>سرویس: {status?providers[status.provider]||"سرویس انتخاب‌شده":"در حال دریافت تنظیمات…"}</p>
        {status?.destination&&<p>مقصد ارسال متن: <b dir="ltr">https://{status.destination}</b></p>}
        {status&&!status.enabled&&<p>مدیر می‌تواند سرویس و کلید را در «تنظیمات ← هوش مصنوعی» تعریف کند. بررسی معمول سئو همچنان در همین ویرایشگر در دسترس است.</p>}
        <button type="button" disabled={busy||disabled||!status?.enabled} onClick={()=>{if(!open){setText(plain(html));setConsent("");}setOpen(!open);}}>{open?"بستن دستیار":"انتخاب متن و دریافت پیشنهاد"}</button>
        {open&&<>
            <p>فقط متن انتخابی زیر، عنوان، توضیح و عبارت هدف به سرویس نمایش‌داده‌شده فرستاده می‌شود. اطلاعات واقعی یا محرمانه بیماران را وارد نکنید؛ پرونده، چت و تصاویر ارسال نمی‌شوند.</p>
            <label>متن انتخابی برای ارسال<textarea rows={6} maxLength={12000} value={text} disabled={busy||disabled} onChange={event=>setText(event.target.value)}/></label>
            <button type="button" disabled={busy||disabled} onClick={()=>{setText(plain(html));setConsent("");setResult(null);}}>استفاده از متن فعلی فرم</button>
            <p>{text.length} از ۱۲۰۰۰ نویسه · {status?.requests_per_hour??0} درخواست در ساعت برای هر نویسنده؛ سقف مشترک سایت ۲۰ درخواست در ساعت است.</p>
            <label className="inline-choice"><input type="checkbox" checked={consent===signature} disabled={busy||disabled} onChange={event=>setConsent(event.target.checked?signature:"")}/>متن انتخابی را بررسی کردم و با ارسال آن به این سرویس موافقم.</label>
            <button type="button" disabled={busy||disabled||!status?.enabled||consent!==signature||text.length<100||title.trim().length<2} onClick={()=>void run()}>{busy?"در حال دریافت پیشنهاد…":"دریافت پیشنهاد سئو"}</button>
        </>}
        {error&&<p role="alert" className="content-error">{error}</p>}
        {result&&<div aria-live="polite">
            <h4>پیشنهاد برای بررسی شما</h4><p><strong>عنوان:</strong> {result.data.seo_title}</p><p><strong>توضیح:</strong> {result.data.seo_description}</p><p><strong>عبارت هدف:</strong> {result.data.target_keyword}</p>
            <ul>{result.data.suggestions.map((value,index)=><li key={index}>{value}</li>)}</ul>
            <p>این پیشنهاد تأیید علمی یا تضمین رتبه نیست. متن و منابع پزشکی را پیش از انتشار بررسی کنید.</p>
            {result.signature!==signature&&<p role="status">فرم یا متن انتخابی تغییر کرده است؛ برای جلوگیری از جایگزینی اطلاعات تازه، پیشنهاد جدید بگیرید.</p>}
            <button type="button" disabled={busy||disabled||result.signature!==signature} onClick={()=>{onApply(result.data);setResult(null);setConsent("");}}>اعمال عنوان و توضیح در پیش‌نویس</button>
            <p>{autosave?"ذخیره خودکار فرم روشن است و پس از اعمال، پیش‌نویس ذخیره می‌شود؛ انتشار جداگانه است.":"پس از اعمال، پیش‌نویس را ذخیره کنید؛ انتشار جداگانه است."}</p>
        </div>}
    </section>;
}
