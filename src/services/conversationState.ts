import type { ConsultationMessage, ConsultationMessagePage } from "./appointmentApi";
const position=(a:{created_at:string;id:number},b:{created_at:string;id:number})=>Date.parse(a.created_at)-Date.parse(b.created_at)||a.id-b.id;
export function mergeMessages(current:ConsultationMessage[],page:ConsultationMessagePage,role:"staff"|"patient"){
    const byId=new Map(current.map(item=>[item.id,item]));
    for(const item of page.items){const previous=byId.get(item.id);byId.set(item.id,previous?.read_at&&!item.read_at?{...item,read_at:previous.read_at}:item);}
    const result=[...byId.values()].sort(position).map(item=>page.peer_read_through&&item.sender_type===role&&!item.read_at&&position(item,page.peer_read_through)<=0?{...item,read_at:page.peer_read_through.read_at}:item);
    return result.length===current.length&&result.every((item,index)=>JSON.stringify(item)===JSON.stringify(current[index]))?current:result;
}
