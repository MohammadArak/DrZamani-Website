import {createPortal} from "react-dom";
import type {ReactNode} from "react";
import useModalScope from "@/hooks/useModalScope";

/** An editor opens where the action happened, without requiring a trip to the end of a long list. */
export default function StaffEditorDialog({title,busy,onClose,children}:{title:string;busy:boolean;onClose:()=>void|Promise<void>;children:ReactNode}){
    const ref=useModalScope<HTMLDivElement>(true,()=>{void onClose();},busy);
    return createPortal(<div ref={ref} role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} dir="rtl"
        style={{position:"fixed",inset:0,zIndex:80,display:"flex",justifyContent:"center",background:"#0b182870",color:"#1e293b"}}>
        <section style={{width:"min(1120px,100%)",height:"100dvh",display:"flex",flexDirection:"column",minWidth:0,background:"#f5f7fa",boxShadow:"0 0 40px #0b182833"}}>
            <header style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,padding:"12px 16px",borderBottom:"1px solid #dbe3ec",background:"white",flexShrink:0}}>
                <h2 style={{fontSize:18,lineHeight:"28px",color:"#18344f"}}>{title}</h2>
                <button type="button" disabled={busy} onClick={()=>void onClose()} aria-label="بستن ویرایشگر" style={{minHeight:44,padding:"8px 16px",borderRadius:12,border:"1px solid #cbd5e1",color:"#18344f",background:"white",cursor:"pointer"}}>بستن</button>
            </header>
            <div style={{overflowY:"auto",minHeight:0,flex:1,padding:12}}>{children}</div>
        </section>
    </div>,document.body);
}
