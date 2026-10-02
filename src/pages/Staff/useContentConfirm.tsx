import { useEffect,useRef,useState } from "react";

/** Content actions use a keyboard-accessible dialog without blocking the browser. */
export function useContentConfirm(){
    const [message,setMessage]=useState("");
    const pending=useRef<((value:boolean)=>void)|null>(null);
    const cancelButton=useRef<HTMLButtonElement>(null);
    const previousFocus=useRef<HTMLElement|null>(null);
    const finish=(value:boolean)=>{pending.current?.(value);pending.current=null;setMessage("");previousFocus.current?.focus();};
    useEffect(()=>{if(message)cancelButton.current?.focus();},[message]);
    useEffect(()=>()=>{pending.current?.(false);},[]);
    const ask=(text:string)=>new Promise<boolean>(resolve=>{
        pending.current?.(false);
        previousFocus.current=document.activeElement instanceof HTMLElement?document.activeElement:null;
        pending.current=resolve;setMessage(text);
    });
    const confirmation=message?<div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4" onKeyDown={e=>{
        if(e.key==="Escape"){e.preventDefault();finish(false);}
        if(e.key==="Tab"){
            const buttons=Array.from(e.currentTarget.querySelectorAll<HTMLButtonElement>("button"));
            const next=e.shiftKey?buttons[0]:buttons[buttons.length-1];
            if(document.activeElement===next){e.preventDefault();(e.shiftKey?buttons[buttons.length-1]:buttons[0]).focus();}
        }
    }}><section role="alertdialog" aria-modal="true" aria-label="تأیید تغییر محتوا" className="w-full max-w-md rounded-2xl bg-white p-6 text-slate-900 shadow-xl" dir="rtl"><p>{message}</p><div className="mt-5 flex gap-3"><button ref={cancelButton} className="rounded-lg border px-5 py-3" onClick={()=>finish(false)}>لغو</button><button className="rounded-lg bg-primary px-5 py-3 text-white" onClick={()=>finish(true)}>تأیید</button></div></section></div>:null;
    return {ask,confirmation};
}
