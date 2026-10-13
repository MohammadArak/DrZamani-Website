import { useCallback, useEffect, useMemo, useRef, useSyncExternalStore } from "react";
import { PATIENT_COOKIE_SESSION, STAFF_COOKIE_SESSION } from "@/services/appointmentApi";
const API_BASE=(import.meta.env.VITE_APPOINTMENT_API_URL??"/api/v1").replace(/\/$/,"");
export type ConsultationRealtimeEvent={type:"consultation.message"|"consultation.read";appointment_id:number;message_id:number;sender_type:"patient"|"staff"};
export type RealtimeStatus="connecting"|"live"|"offline"|"paused"|"expired";
const channels=new Map<string,Channel>();
// Portal and workspace share one socket. Hidden tabs neither reconnect nor read messages.
class Channel{
    status:RealtimeStatus="connecting";listeners=new Set<()=>void>();events=new Set<(event:ConsultationRealtimeEvent)=>void>();
    socket:WebSocket|null=null;timer=0;delay=800;stopped=true;
    constructor(readonly token:string){}
    publish(next:RealtimeStatus){if(this.status!==next){this.status=next;this.listeners.forEach(fn=>fn());}}
    resume=()=>{if(!this.stopped&&document.visibilityState==="visible"&&navigator.onLine&&this.status!=="expired"){this.delay=800;this.connect();}};
    visibility=()=>{if(document.visibilityState==="hidden"){clearTimeout(this.timer);this.socket?.close();this.socket=null;this.publish("paused");}else this.resume();};
    offline=()=>{clearTimeout(this.timer);this.socket?.close();this.socket=null;this.publish("offline");};
    connect=()=>{
        if(this.stopped||this.socket||document.visibilityState!=="visible"||!navigator.onLine||this.status==="expired")return;
        clearTimeout(this.timer);this.publish("connecting");
        const url=new URL(`${API_BASE}/realtime`,window.location.origin);url.protocol=url.protocol==="https:"?"wss:":"ws:";
        const socket=new WebSocket(url);this.socket=socket;
        const handshake=window.setTimeout(()=>socket.close(),12_000);
        socket.addEventListener("open",()=>{if(this.socket!==socket)return;const audience=this.token===STAFF_COOKIE_SESSION?"staff":"patient";socket.send(JSON.stringify(this.token===STAFF_COOKIE_SESSION||this.token===PATIENT_COOKIE_SESSION?{audience}:{token:this.token}));});
        socket.addEventListener("message",message=>{
            if(this.socket!==socket)return;
            try{const event=JSON.parse(String(message.data));
                if(event.type==="realtime.ready"){clearTimeout(handshake);this.delay=800;this.publish("live");}
                else if((event.type==="consultation.message"||event.type==="consultation.read")&&Number.isSafeInteger(event.appointment_id)&&event.appointment_id>0&&Number.isSafeInteger(event.message_id)&&event.message_id>0&&(event.sender_type==="patient"||event.sender_type==="staff"))this.events.forEach(fn=>fn(event));
            }catch{/* Ignore unknown/malformed events. */}
        });
        socket.addEventListener("close",event=>{
            clearTimeout(handshake);if(this.socket!==socket)return;this.socket=null;if(this.stopped)return;
            if(event.code===4401||event.code===4403){this.publish("expired");if(this.token===STAFF_COOKIE_SESSION)window.dispatchEvent(new Event("drz:staff-expired"));return;}
            if(document.visibilityState!=="visible"){this.publish("paused");return;}
            this.publish("offline");if(!navigator.onLine)return;
            this.timer=window.setTimeout(this.connect,this.delay+Math.random()*250);this.delay=Math.min(this.delay*2,30_000);
        });socket.addEventListener("error",()=>socket.close());
    };
    subscribe=(fn:()=>void)=>{
        this.listeners.add(fn);
        if(this.stopped){channels.set(this.token,this);this.stopped=false;document.addEventListener("visibilitychange",this.visibility);window.addEventListener("online",this.resume);window.addEventListener("offline",this.offline);window.addEventListener("drz:retry",this.resume);this.connect();}
        return()=>{this.listeners.delete(fn);if(!this.listeners.size){this.stopped=true;clearTimeout(this.timer);const socket=this.socket;this.socket=null;socket?.close();document.removeEventListener("visibilitychange",this.visibility);window.removeEventListener("online",this.resume);window.removeEventListener("offline",this.offline);window.removeEventListener("drz:retry",this.resume);channels.delete(this.token);}};
    };
}
export default function useConsultationRealtime(token:string,onEvent:(event:ConsultationRealtimeEvent)=>void,enabled=true){
    const callback=useRef(onEvent);useEffect(()=>{callback.current=onEvent;},[onEvent]);
    const channel=useMemo(()=>{if(!enabled||!token)return null;let value=channels.get(token);if(!value){value=new Channel(token);channels.set(token,value);}return value;},[enabled,token]);
    useEffect(()=>{if(!channel)return;const event=(value:ConsultationRealtimeEvent)=>callback.current(value);channel.events.add(event);return()=>{channel.events.delete(event);};},[channel]);
    const subscribe=useCallback((fn:()=>void)=>channel?channel.subscribe(fn):()=>{},[channel]);
    const snapshot=useCallback(()=>channel?.status??"offline",[channel]);
    return useSyncExternalStore(subscribe,snapshot,()=>"offline" as const);
}
