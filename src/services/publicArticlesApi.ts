import {apiRequest} from './appointmentApi';
export type PublicArticle={id:number;published_at:string;updated_at:string;content:{title:string;slug:string;summary:string;cover_key:string|null;cover_alt:string;categories:string[]}};
export const publicArticlesApi={list:()=>apiRequest<{items:PublicArticle[];total:number;page:number}>('/articles')};
