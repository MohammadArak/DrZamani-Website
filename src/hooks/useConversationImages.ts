import { useEffect,useRef,useState } from "react";
import { appointmentApi,type ConsultationMessage } from "@/services/appointmentApi";
const EMPTY:Record<number,string>={};
type Context={key:string;stopped:boolean;active:number;queue:ConsultationMessage[];pending:Set<number>;urls:Record<number,string>;controller:AbortController;messages:ConsultationMessage[];pump:()=>void};
export default function useConversationImages(token:string,id:number|null,role:"patient"|"staff",messages:ConsultationMessage[]){
    const [value,setValue]=useState<{key:string;urls:Record<number,string>}>({key:"",urls:EMPTY});
    const context=useRef<Context|null>(null),key=`${role}:${id}:${token}`;
    useEffect(()=>{
        if(id===null)return;
        const current:Context={key,stopped:false,active:0,queue:[],pending:new Set(),urls:{},controller:new AbortController(),messages:[],pump:()=>{}};
        const enqueue=()=>{for(const item of current.messages)if(item.has_image&&!current.urls[item.id]&&!current.pending.has(item.id)){current.pending.add(item.id);current.queue.push(item);}current.pump();};
        current.pump=()=>{
            while(!current.stopped&&current.active<3&&current.queue.length){
                const item=current.queue.shift()!;current.active++;
                const operation=role==="patient"?appointmentApi.consultationImage(token,id,item.id,current.controller.signal):appointmentApi.staffConsultationImage(token,id,item.id,current.controller.signal);
                void operation.then(blob=>{if(current.stopped)return;current.urls[item.id]=URL.createObjectURL(blob);setValue({key,urls:{...current.urls}});}).catch(()=>{}).finally(()=>{current.pending.delete(item.id);current.active--;current.pump();});
            }
        };
        context.current=current;window.addEventListener("drz:retry",enqueue);
        return()=>{current.stopped=true;current.controller.abort();current.queue=[];Object.values(current.urls).forEach(url=>URL.revokeObjectURL(url));window.removeEventListener("drz:retry",enqueue);};
    },[id,key,role,token]);
    useEffect(()=>{
        const current=context.current;if(!current||current.key!==key||current.stopped)return;current.messages=messages;
        for(const item of messages)if(item.has_image&&!current.urls[item.id]&&!current.pending.has(item.id)){current.pending.add(item.id);current.queue.push(item);}current.pump();
    },[key,messages]);
    return value.key===key?value.urls:EMPTY;
}
