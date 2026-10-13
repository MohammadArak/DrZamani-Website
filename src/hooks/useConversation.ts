import { useCallback,useEffect,useRef,useState } from "react";
import useConsultationRealtime from "./useConsultationRealtime";
import { appointmentApi,type ConsultationMessage } from "@/services/appointmentApi";
import { mergeMessages } from "@/services/conversationState";
type State={key:string;messages:ConsultationMessage[];hasOlder:boolean;requirements:number[];loading:boolean;olderLoading:boolean};
export default function useConversation(token:string,appointmentId:number|null,role:"patient"|"staff",onError:(error:unknown)=>void,onActivity?:()=>void){
    const key=`${role}:${appointmentId}:${token}`;
    const [data,setData]=useState<State>({key:"",messages:[],hasOlder:false,requirements:[],loading:true,olderLoading:false});
    const [drafts,setDrafts]=useState<Record<string,string>>({});
    const errors=useRef(onError),activity=useRef(onActivity);
    const refreshRef=useRef<()=>Promise<void>>(async()=>{}),olderRef=useRef<()=>Promise<void>>(async()=>{});
    const nonces=useRef(new Map<string,{text:string;nonce:string}>());
    useEffect(()=>{errors.current=onError;activity.current=onActivity;},[onError,onActivity]);
    const sync=useCallback(()=>refreshRef.current(),[]);
    const older=useCallback(()=>olderRef.current(),[]);
    const realtimeStatus=useConsultationRealtime(token,event=>{if(event.appointment_id===appointmentId)void sync();},appointmentId!==null);
    useEffect(()=>{
        if(appointmentId===null)return;
        let disposed=false,again=false,inflight:Promise<void>|null=null,controller:AbortController|null=null;
        let items:ConsultationMessage[]=[],after:number|null=null,before:number|null=null,hasOlder=false,requirements:number[]=[];
        const save=(loading=false,olderLoading=false)=>{if(!disposed)setData({key,messages:items,hasOlder,requirements,loading,olderLoading});};
        const perform=async(history=false)=>{
            if(disposed||document.visibilityState!=="visible"||!navigator.onLine)return;
            controller=new AbortController();
            if(history)save(false,true);
            try{
                let page=await appointmentApi.consultationSync(token,appointmentId,role,history&&before?{before_id:before}:after?{after_id:after}:{},controller.signal);
                // A long absence starts a bounded recent window, rather than downloading
                // thousands of missed messages. Older history stays available explicitly.
                if(!history&&after&&page.has_more){page=await appointmentApi.consultationSync(token,appointmentId,role,{},controller.signal);items=[];hasOlder=false;before=null;}
                if(disposed)return;
                items=mergeMessages(items,page,role);requirements=page.uploaded_requirement_ids;
                if(history){before=page.before_id;hasOlder=page.has_more;}
                else {after=page.after_id??after;if(before===null){before=page.before_id;hasOlder=page.has_more;}}
                save();
                if(!history&&page.items.length)activity.current?.();
            }catch(error){if(!disposed&&!controller.signal.aborted)errors.current(error);}
            finally{if(!disposed)save();}
        };
        const refresh=():Promise<void>=>{
            if(inflight){again=true;return inflight;}
            inflight=perform().finally(()=>{inflight=null;if(again&&!disposed){again=false;void refresh();}});return inflight;
        };
        refreshRef.current=refresh;
        olderRef.current=async()=>{if(inflight)await inflight;if(!hasOlder||!before||disposed)return;inflight=perform(true).finally(()=>{inflight=null;if(again&&!disposed){again=false;void refresh();}});await inflight;};
        const first=window.setTimeout(()=>void refresh(),0);
        const recover=()=>{if(document.visibilityState==="visible"&&navigator.onLine)void refresh();};
        document.addEventListener("visibilitychange",recover);window.addEventListener("online",recover);window.addEventListener("drz:retry",recover);
        return()=>{disposed=true;controller?.abort();clearTimeout(first);document.removeEventListener("visibilitychange",recover);window.removeEventListener("online",recover);window.removeEventListener("drz:retry",recover);refreshRef.current=async()=>{};olderRef.current=async()=>{};};
    },[appointmentId,key,role,token]);
    useEffect(()=>{
        if(appointmentId===null||realtimeStatus==="paused"||realtimeStatus==="expired")return;
        if(realtimeStatus==="live"){void sync();return;}
        const timer=window.setInterval(()=>{if(document.visibilityState==="visible"&&navigator.onLine)void sync();},30_000);
        return()=>clearInterval(timer);
    },[appointmentId,realtimeStatus,sync]);
    const setDraft=useCallback((value:string)=>setDrafts(current=>({...current,[key]:value})),[key]);
    const sendText=useCallback(async()=>{
        if(appointmentId===null)return;
        const original=drafts[key]??"",text=original.trim();if(!text)return;
        let retry=nonces.current.get(key);if(!retry||retry.text!==text){retry={text,nonce:crypto.randomUUID()};nonces.current.set(key,retry);}
        if(role==="patient")await appointmentApi.sendConsultationMessage(token,appointmentId,text,retry.nonce);
        else await appointmentApi.sendStaffConsultationMessage(token,appointmentId,text,retry.nonce);
        nonces.current.delete(key);
        setDrafts(current=>current[key]===original?{...current,[key]:""}:current);
        await sync();
    },[appointmentId,drafts,key,role,sync,token]);
    const current=data.key===key?data:null;
    return {messages:current?.messages??[],loading:appointmentId!==null&&!current||current?.loading===true,hasOlder:current?.hasOlder??false,olderLoading:current?.olderLoading??false,uploadedRequirementIds:current?.requirements??[],draft:drafts[key]??"",setDraft,sendText,sync,loadOlder:older,realtimeStatus};
}
