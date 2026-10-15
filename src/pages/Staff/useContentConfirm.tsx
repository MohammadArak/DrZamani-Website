import {useEffect,useRef,useState} from "react";
import {createPortal} from "react-dom";
import useModalScope from "@/hooks/useModalScope";

export function useContentConfirm(){
    const [message,setMessage]=useState("");
    const pending=useRef<((value:boolean)=>void)|null>(null);
    const cancelButton=useRef<HTMLButtonElement>(null);
    const finish=(value:boolean)=>{pending.current?.(value);pending.current=null;setMessage("");};
    const modal=useModalScope<HTMLDivElement>(Boolean(message),()=>finish(false),false,cancelButton);
    useEffect(()=>()=>{pending.current?.(false);},[]);
    const ask=(text:string)=>new Promise<boolean>(resolve=>{pending.current?.(false);pending.current=resolve;setMessage(text);});
    const confirmation=message?createPortal(<div ref={modal} tabIndex={-1} role="alertdialog" aria-modal="true" aria-label="تأیید تغییر محتوا" style={{position:"fixed",inset:0,zIndex:1500,display:"grid",placeItems:"center",padding:16,background:"#0b182899"}}>
        <section className="w-full max-w-md rounded-2xl bg-white p-6 text-slate-900 shadow-xl" dir="rtl"><p>{message}</p><div className="mt-5 flex gap-3"><button ref={cancelButton} className="rounded-lg border px-5 py-3" onClick={()=>finish(false)}>لغو</button><button className="rounded-lg bg-primary px-5 py-3 text-white" onClick={()=>finish(true)}>تأیید</button></div></section>
    </div>,document.body):null;
    return {ask,confirmation};
}
