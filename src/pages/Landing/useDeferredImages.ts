import {useEffect} from "react";

/** Warm public homepage images after DOM readiness; two low-priority requests at a time. */
export default function useDeferredImages(){
    useEffect(()=>{
        if((navigator as Navigator & {connection?:{saveData?:boolean}}).connection?.saveData)return;
        let stopped=false;let ready=false;let active=0;let timer=0;let idle=0;
        const seen=new WeakSet<HTMLImageElement>();const queue:HTMLImageElement[]=[];const cleanup=new Set<()=>void>();
        const pump=()=>{
            if(stopped||!ready)return;
            while(active<2&&queue.length){
                const img=queue.shift()!;if(!img.isConnected||img.complete&&img.naturalWidth)continue;
                active++;
                const done=()=>{img.removeEventListener("load",done);img.removeEventListener("error",done);cleanup.delete(done);active--;schedule();};
                img.addEventListener("load",done,{once:true});img.addEventListener("error",done,{once:true});cleanup.add(done);
                img.fetchPriority="low";img.loading="eager";
            }
        };
        const schedule=()=>{if(stopped||!ready||idle||timer)return;
            if(typeof window.requestIdleCallback==="function")idle=window.requestIdleCallback(()=>{idle=0;pump();},{timeout:1500});
            else timer=window.setTimeout(()=>{timer=0;pump();},80);
        };
        const collect=()=>{document.querySelectorAll<HTMLImageElement>("#main-content img[loading='lazy']").forEach(img=>{
            if(!seen.has(img)&&/^\/(img|media)\//.test(img.getAttribute("src")||"")){seen.add(img);queue.push(img);}
        });schedule();};
        const start=()=>{timer=window.setTimeout(()=>{timer=0;ready=true;collect();},450);};
        const observer=new MutationObserver(collect);const root=document.getElementById("main-content");if(root)observer.observe(root,{childList:true,subtree:true});
        if(document.readyState!=="loading")start();else document.addEventListener("DOMContentLoaded",start,{once:true});
        return()=>{stopped=true;observer.disconnect();document.removeEventListener("DOMContentLoaded",start);clearTimeout(timer);if(idle)window.cancelIdleCallback(idle);cleanup.forEach(fn=>fn());queue.length=0;};
    },[]);
}
