import { useCallback,useEffect,useRef } from "react";
export default function useConversationScroll(id:number|null,lastId:number|undefined,images:Record<number,string>,loadOlder:()=>Promise<void>){
    const container=useRef<HTMLDivElement>(null),bottom=useRef<HTMLDivElement>(null),pinned=useRef(true);
    useEffect(()=>{pinned.current=true;},[id]);
    useEffect(()=>{if(pinned.current)bottom.current?.scrollIntoView({behavior:window.matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth"});},[id,lastId,images]);
    const onScroll=useCallback(()=>{const box=container.current;if(box)pinned.current=box.scrollHeight-box.clientHeight-box.scrollTop<96;},[]);
    const older=useCallback(async()=>{const box=container.current;if(!box)return;const height=box.scrollHeight,top=box.scrollTop;pinned.current=false;await loadOlder();requestAnimationFrame(()=>{if(container.current===box)box.scrollTop=top+box.scrollHeight-height;});},[loadOlder]);
    return {container,bottom,onScroll,older};
}
