import PatientComment from "./PatientComment";
import { useCallback, useEffect, useRef, useState } from "react";
import { commentsApi, type CommentPage, type PublicComment } from "@/services/commentsApi";
import { useKeenSlider } from "keen-slider/react";
import SectionHeading from "./SectionHeading";

function Carousel({ slides }: { slides: React.ReactNode[] }) {
    const [sliderRef, instanceRef] = useKeenSlider<HTMLDivElement>({ loop: slides.length > 1, rtl: true, defaultAnimation: { duration: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 500 } });
    return <div className="relative"><div ref={sliderRef} className="keen-slider">{slides.map((slide, i) => <div className="keen-slider__slide flex justify-center" key={i}>{slide}</div>)}</div>{slides.length > 1 && <><button aria-label="نظر قبلی" onClick={() => instanceRef.current?.prev()} className="absolute left-0 top-1/2 -translate-y-1/2 rounded-full border border-white/30 p-3 text-white">←</button><button aria-label="نظر بعدی" onClick={() => instanceRef.current?.next()} className="absolute right-0 top-1/2 -translate-y-1/2 rounded-full border border-white/30 p-3 text-white">→</button></>}</div>;
}
function initial():CommentPage<PublicComment>{
    try{return JSON.parse(document.getElementById("comment-bootstrap")?.textContent??"");}catch{return {items:[],total:0,page:1};}
}
const PatientsComments = () => {
    const [result,setResult]=useState(initial); const [busy,setBusy]=useState(false); const [error,setError]=useState(false); const generation=useRef({value:0});
    const load=useCallback(async()=>{
        const sequence=++generation.current.value;setBusy(true);
        try{
            let next=await commentsApi.publicList(); const items=[...next.items];
            while(next.page*12<next.total && next.items.length){
                if(sequence!==generation.current.value)return;
                next=await commentsApi.publicList(next.page+1);items.push(...next.items);
            }
            if(sequence===generation.current.value){setResult({...next,items:[...new Map(items.map(item=>[item.id,item])).values()]});setError(false);}
        }
        catch{if(sequence===generation.current.value){setResult({items:[],total:0,page:1});setError(true);}}
        finally{if(sequence===generation.current.value)setBusy(false);}
    },[]);
    useEffect(()=>{const requests=generation.current;const refresh=()=>{if(document.visibilityState==="visible")void load();};const start=window.setTimeout(()=>void load(),0);const timer=window.setInterval(refresh,30000);window.addEventListener("focus",refresh);return()=>{requests.value++;window.clearTimeout(start);window.clearInterval(timer);window.removeEventListener("focus",refresh);};},[load]);
    return <section id="comments" className="landing-section landing-comments"><div className="landing-container"><SectionHeading title="نظرات مراجعین" description="تجربه مراجعه، از زبان شما" />
        {error && <p role="status" className="landing-empty">دریافت نظرات ممکن نشد. <button onClick={() => void load()} className="underline">تلاش مجدد</button></p>}
        {!result.items.length && !error && <p className="landing-empty">{busy ? "در حال دریافت نظرات…" : "هنوز نظری برای نمایش منتشر نشده است."}</p>}
        {result.items.length > 0 && <Carousel key={result.items.map(r => r.id).join(",")} slides={result.items.map(item => <PatientComment key={item.id} img={item.photo_key ? `/media/${item.photo_key}.webp` : undefined} imageAlt={item.photo_alt} name={item.display_name} age={item.age ?? undefined} body={item.body} />)} />}
    </div></section>;
};
export default PatientsComments;
