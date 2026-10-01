import DOMPurify from "dompurify";
import { apiRequest } from "./appointmentApi";
export type ArticleContent = {
    title:string; slug:string; summary:string; body_html:string; cover_key:string|null; cover_alt:string;
    categories:string[]; tags:string[]; author_name:string; reviewer:string; sources:{title:string;url:string}[];
    seo_title:string; seo_description:string; target_keyword:string;
};
export type SeoFeedback={score:number;word_count:number;notice:string;checks:{code:string;passed:boolean;reason:string;suggestion:string}[]};
export type Article={id:number;revision:number;content:ArticleContent;status:string;scheduled_at:string|null;has_publication:boolean;unpublished_changes:boolean;author_id:number;seo:SeoFeedback;sanitized?:boolean};
export type Media={key:string;alt:string;width:number;height:number;size:number;owner_id:number;url:string;preview_url:string};
export type MediaPage={items:Media[];total:number;page:number};
export type ArticleHistory={id:number;revision:number;action:string;created_at:string};
export const emptyArticle=():ArticleContent=>({title:"",slug:"",summary:"",body_html:"<p></p>",cover_key:null,cover_alt:"",categories:[],tags:[],author_name:"",reviewer:"",sources:[],seo_title:"",seo_description:"",target_keyword:""});
export function safeContentHtml(value:string,preview=false){
    const clean=DOMPurify.sanitize(value,{ALLOWED_TAGS:"p br h1 h2 h3 h4 ul ol li strong b em i u s blockquote pre code hr table thead tbody tr th td a img figure figcaption".split(" "),ALLOWED_ATTR:["href","src","alt","title","colspan","rowspan"]});
    const doc=new DOMParser().parseFromString(clean,"text/html");
    doc.querySelectorAll("img").forEach(img=>{const m=img.getAttribute("src")?.match(/^\/media\/([a-f0-9]{32})\.webp$/);if(!m)img.remove();else if(preview)img.setAttribute("src",`/api/v1/staff/media/${m[1]}/file`);});
    doc.querySelectorAll("a").forEach(a=>{const href=a.getAttribute("href")??"";if(!/^(https:\/\/|\/(?!\/)|#)/.test(href))a.removeAttribute("href");a.setAttribute("rel","noopener noreferrer");});
    return doc.body.innerHTML;
}
export const contentApi={
    list:(token:string,page=1)=>apiRequest<{items:Article[];total:number;page:number}>(`/staff/articles?page=${page}`,{},token),
    get:(token:string,id:number)=>apiRequest<Article>(`/staff/articles/${id}`,{},token),
    save:(token:string,id:number|null,revision:number,content:ArticleContent)=>apiRequest<Article>(`/staff/articles${id?`/${id}`:""}`,{method:id?"PUT":"POST",body:JSON.stringify({revision,content})},token),
    analyze:(token:string,content:ArticleContent)=>apiRequest<{content:ArticleContent;seo:SeoFeedback;sanitized:boolean}>("/staff/articles/seo",{method:"POST",body:JSON.stringify(content)},token),
    transition:(token:string,row:Article,action:string,scheduled_at?:string)=>apiRequest<Article>(`/staff/articles/${row.id}/transition`,{method:"POST",body:JSON.stringify({revision:row.revision,action,scheduled_at})},token),
    archive:(token:string,row:Article)=>apiRequest<{message:string}>(`/staff/articles/${row.id}`,{method:"DELETE",body:JSON.stringify({revision:row.revision})},token),
    history:(token:string,id:number)=>apiRequest<ArticleHistory[]>(`/staff/articles/${id}/revisions`,{},token),
    restore:(token:string,row:Article,revision_id:number)=>apiRequest<Article>(`/staff/articles/${row.id}/restore/${revision_id}`,{method:"POST",body:JSON.stringify({revision:row.revision})},token),
    media:(token:string,page=1,q="")=>apiRequest<MediaPage>(`/staff/media?page=${page}&q=${encodeURIComponent(q)}`,{},token),
    getMedia:(token:string,key:string)=>apiRequest<Media>(`/staff/media/${key}`,{},token),
    upload:(token:string,file:File,alt:string)=>{const body=new FormData();body.append("file",file);body.append("alt",alt);return apiRequest<Media>("/staff/media",{method:"POST",body},token);},
    editMedia:(token:string,key:string,alt:string)=>apiRequest<Media>(`/staff/media/${key}`,{method:"PUT",body:JSON.stringify({alt})},token),
    archiveMedia:(token:string,key:string)=>apiRequest<{message:string}>(`/staff/media/${key}`,{method:"DELETE"},token),
};
