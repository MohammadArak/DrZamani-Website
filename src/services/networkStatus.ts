// Observe actual requests and browser events; never schedule a health poll.
export type NetworkStatus = "connected" | "connection" | "maintenance";
let status:NetworkStatus = "connected", sequence=0, lastObservation=0;
const listeners = new Set<()=>void>();
const publish=(next:NetworkStatus)=>{ if(status===next)return;status=next;listeners.forEach(fn=>fn()); };
export const beginRequest=()=>++sequence;
export const requestFailed=(ticket:number)=>{if(ticket>=lastObservation){lastObservation=ticket;publish("connection");}};
export const responseObserved=(ticket:number,response:Pick<Response,"status"|"ok"|"headers">)=>{
    if(ticket<lastObservation)return;
    if(response.headers.get("X-DrZ-Status")==="maintenance"){lastObservation=ticket;publish("maintenance");}
    else if(response.status===502 || response.status===504){requestFailed(ticket);}
    else if(response.status>0 && navigator.onLine){lastObservation=ticket;publish("connected");}
};
export const subscribeNetwork=(fn:()=>void)=>{listeners.add(fn);return()=>{listeners.delete(fn);};};
export const networkSnapshot=()=>status;
export const retryNetwork=()=>window.dispatchEvent(new Event("drz:retry"));
if(typeof window!=="undefined")window.addEventListener("offline",()=>requestFailed(beginRequest()));
