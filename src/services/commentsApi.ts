import {apiRequest} from "./appointmentApi";
export type CommentContent={display_name:string;body:string;age:number|null;photo_key:string|null;photo_alt:string;service_id:number|null;sort_order:number;consent_received:boolean;consent_reference:string;privacy_reviewed:boolean};
export type PublicComment=Pick<CommentContent,"display_name"|"body"|"age"|"photo_key"|"photo_alt"|"service_id"|"sort_order">&{id:number;service_title:string};
export type CommentRow={id:number;revision:number;content:CommentContent;published:boolean;unpublished_changes:boolean};
export type CommentPage<T>={items:T[];total:number;page:number};
export const emptyComment=():CommentContent=>({display_name:"",body:"",age:null,photo_key:null,photo_alt:"",service_id:null,sort_order:0,consent_received:false,consent_reference:"",privacy_reviewed:false});
export const commentsApi={
    publicList:(page=1)=>apiRequest<CommentPage<PublicComment>>(`/comments?page=${page}`),
    list:(token:string,page=1)=>apiRequest<CommentPage<CommentRow>>(`/staff/comments?page=${page}`,{},token),
    get:(token:string,id:number)=>apiRequest<CommentRow>(`/staff/comments/${id}`,{},token),
    save:(token:string,row:CommentRow|null,content:CommentContent)=>apiRequest<CommentRow>(`/staff/comments${row?`/${row.id}`:""}`,{method:row?"PUT":"POST",body:JSON.stringify({revision:row?.revision??0,content})},token),
    transition:(token:string,row:CommentRow,action:"publish"|"unpublish")=>apiRequest<CommentRow>(`/staff/comments/${row.id}/transition`,{method:"POST",body:JSON.stringify({revision:row.revision,action})},token),
    archive:(token:string,row:CommentRow)=>apiRequest<{message:string}>(`/staff/comments/${row.id}`,{method:"DELETE",body:JSON.stringify({revision:row.revision})},token),
};
