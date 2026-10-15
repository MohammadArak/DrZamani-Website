import {useEffect,useState} from "react";
import {motion} from "./Motion";

export default function BackToTop(){
    const [visible,setVisible]=useState(false);
    useEffect(()=>{
        let frame=0;
        const update=()=>{frame=0;setVisible(window.scrollY>Math.min(500,window.innerHeight/2));};
        const schedule=()=>{if(!frame)frame=requestAnimationFrame(update);};
        update();window.addEventListener("scroll",schedule,{passive:true});window.addEventListener("resize",schedule);
        return()=>{cancelAnimationFrame(frame);window.removeEventListener("scroll",schedule);window.removeEventListener("resize",schedule);};
    },[]);
    return <motion.div initial={false} animate={{opacity:visible?1:0,y:visible?0:14,scale:visible?1:.9}}
        transition={{duration:.24,ease:[.2,.8,.2,1]}} aria-hidden={!visible}
        style={{position:"fixed",left:16,bottom:"calc(max(var(--mobile-nav-space, 0px), env(safe-area-inset-bottom, 0px)) + 16px)",zIndex:45,pointerEvents:visible?"auto":"none"}}>
        <button type="button" aria-label="بازگشت به بالای صفحه" title="بازگشت به بالا" tabIndex={visible?0:-1}
            className="bg-primary text-secondary hover:bg-secondary hover:text-primary"
            style={{width:44,height:44,display:"grid",placeItems:"center",borderRadius:9999,border:"1px solid #d5ab6480",boxShadow:"0 6px 20px #0b182840",outlineOffset:4,cursor:"pointer",transition:"background-color .2s,color .2s"}}
            onClick={event=>{event.currentTarget.blur();window.scrollTo({top:0,behavior:window.matchMedia("(prefers-reduced-motion: reduce)").matches?"instant":"smooth"});}}>
            <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m5 14 7-7 7 7"/></svg>
        </button>
    </motion.div>;
}
