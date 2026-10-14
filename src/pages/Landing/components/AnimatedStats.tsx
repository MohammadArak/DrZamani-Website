import {useEffect,useRef,useState,type ReactNode} from "react";
import GlassCard from "./GlassCard";

export function AnimatedStat({value}:{value:string}){
    const ref=useRef<HTMLSpanElement>(null);
    const [display,setDisplay]=useState({source:value,text:value});
    useEffect(()=>{
        const el=ref.current;if(!el||!("IntersectionObserver" in window))return;
        const match=value.match(/[0-9۰-۹٠-٩][0-9۰-۹٠-٩,٬]*/);if(!match)return;
        const latin=match[0].replace(/[۰-۹]/g,c=>String("۰۱۲۳۴۵۶۷۸۹".indexOf(c))).replace(/[٠-٩]/g,c=>String("٠١٢٣٤٥٦٧٨٩".indexOf(c))).replace(/[,٬]/g,"");
        const target=Number(latin);if(!Number.isFinite(target)||target>100000000)return;
        const reduced=window.matchMedia("(prefers-reduced-motion: reduce)");
        const locale=/[۰-۹]/.test(match[0])?"fa-IR":/[٠-٩]/.test(match[0])?"ar-EG":"en-US";
        const formatter=new Intl.NumberFormat(locale,{useGrouping:/[,٬]/.test(match[0])});
        let frame=0;let start:number|null=null;let finished=false;
        const finish=()=>{finished=true;cancelAnimationFrame(frame);setDisplay({source:value,text:value});};
        const tick=(now:number)=>{
            if(finished)return;if(start===null)start=now;
            const fraction=Math.min(1,(now-start)/1800);
            const number=Math.floor(target*(1-Math.pow(1-fraction,3)));
            const formatted=formatter.format(number);
            setDisplay({source:value,text:value.replace(match[0],formatted)});
            if(fraction<1)frame=requestAnimationFrame(tick);else finish();
        };
        const begin=()=>{if(!finished){if(reduced.matches)finish();else frame=requestAnimationFrame(tick);}};
        const observer=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){observer.disconnect();begin();}},{threshold:.2});
        observer.observe(el);reduced.addEventListener("change",finish);
        return()=>{finished=true;cancelAnimationFrame(frame);observer.disconnect();reduced.removeEventListener("change",finish);};
    },[value]);
    return <span ref={ref} aria-label={value} dir="ltr"><span aria-hidden="true">{display.source===value?display.text:value}</span></span>;
}

export default function AnimatedStats({children}:{children:ReactNode}){
    const ref=useRef<HTMLDivElement>(null);
    useEffect(()=>{
        const el=ref.current;if(!el||!("IntersectionObserver" in window))return;
        const reduced=window.matchMedia("(prefers-reduced-motion: reduce)");let animation:Animation|undefined;
        const observer=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){
            observer.disconnect();if(!reduced.matches&&el.animate)animation=el.animate([{opacity:0,transform:"translateY(24px) scale(.96)"},{opacity:1,transform:"none"}],{duration:550,easing:"cubic-bezier(.2,.8,.2,1)"});
        }},{threshold:.2});
        const cancel=()=>animation?.cancel();observer.observe(el);reduced.addEventListener("change",cancel);
        return()=>{observer.disconnect();cancel();reduced.removeEventListener("change",cancel);};
    },[]);
    return <div ref={ref}><GlassCard className="p-5 clinic-stats">{children}</GlassCard></div>;
}
