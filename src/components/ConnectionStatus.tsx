import { useState, useSyncExternalStore } from "react";
import { networkSnapshot, retryNetwork, subscribeNetwork } from "@/services/networkStatus";
import StatusPage from "./StatusPage";
function Notice({kind}:{kind:"connection"|"maintenance"}){
    const [dismissed,setDismissed]=useState(false);
    return dismissed?<aside role="status" style={{position:"fixed",bottom:12,left:12,zIndex:9999,maxWidth:"calc(100vw - 24px)",padding:12,borderRadius:16,background:"#18344f",color:"white",boxShadow:"0 4px 24px #0003"}}><span>{kind==="connection"?"ارتباط با سرور برقرار نیست":"سامانه در حال به‌روزرسانی است"}</span><button type="button" onClick={()=>{setDismissed(false);retryNetwork();}} style={{marginInlineStart:12,color:"#f1ce82",minHeight:44}}>تلاش دوباره</button></aside>:<StatusPage kind={kind} onRetry={retryNetwork} onDismiss={()=>setDismissed(true)} overlay />;
}
export default function ConnectionStatus(){
    const status=useSyncExternalStore(subscribeNetwork,networkSnapshot,()=>"connected" as const);
    return status==="connected" ? null : <Notice key={status} kind={status}/>;
}
