import {useEffect,useId,useRef,useState} from "react";
import {createPortal} from "react-dom";
import useModalScope from "./useModalScope";

type ConfirmOptions={title?:string;confirmLabel?:string;cancelLabel?:string};
export function useConfirmDialog(){
    const [request,setRequest]=useState<({message:string}&ConfirmOptions)|null>(null);
    const pending=useRef<((value:boolean)=>void)|null>(null);
    const cancelButton=useRef<HTMLButtonElement>(null);
    const id=useId();
    const finish=(value:boolean)=>{pending.current?.(value);pending.current=null;setRequest(null);};
    const modal=useModalScope<HTMLDivElement>(Boolean(request),()=>finish(false),false,cancelButton);
    useEffect(()=>()=>{pending.current?.(false);},[]);
    const ask=(message:string,options:ConfirmOptions={})=>new Promise<boolean>(resolve=>{pending.current?.(false);pending.current=resolve;setRequest({message,...options});});
    const confirmation=request?createPortal(<div ref={modal} tabIndex={-1} role="alertdialog" aria-modal="true" aria-labelledby={`${id}-title`} aria-describedby={`${id}-message`} style={{position:"fixed",inset:0,zIndex:1500,display:"grid",placeItems:"center",padding:16,background:"#0b182899"}}>
        <section className="app-panel-enter w-full max-w-md rounded-3xl border border-secondary/30 bg-white p-6 text-slate-800 shadow-2xl" dir="rtl">
            <div className="mb-4 flex items-center gap-3">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-secondary/10 text-secondary-deep" aria-hidden="true"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M12 3 2.5 20h19L12 3Z" strokeLinejoin="round"/><path d="M12 9v4m0 3v1" strokeLinecap="round"/></svg></span>
                <h2 id={`${id}-title`} className="font-dana text-xl text-primary">{request.title||"تأیید درخواست"}</h2>
            </div>
            <p id={`${id}-message`} className="text-sm leading-8 text-slate-600">{request.message}</p>
            <div className="mt-6 flex flex-wrap justify-end gap-3">
                <button ref={cancelButton} type="button" style={{minHeight:44}} className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-bold text-primary" onClick={()=>finish(false)}>{request.cancelLabel||"لغو"}</button>
                <button type="button" style={{minHeight:44}} className="rounded-xl bg-secondary px-5 py-3 text-sm font-bold text-primary-deep" onClick={()=>finish(true)}>{request.confirmLabel||"تأیید"}</button>
            </div>
        </section>
    </div>,document.body):null;
    return {ask,confirmation};
}
