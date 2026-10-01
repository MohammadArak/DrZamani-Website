import type {ArticleContent} from "@/services/contentApi";

export function articleValidation(content:ArticleContent):string {
    if(content.title.trim().length<2)return "عنوان مقاله باید دست‌کم دو نویسه داشته باشد.";
    if(content.slug.length<2||content.slug.length>180||!/^[\p{L}\p{N}_]+(?:-[\p{L}\p{N}_]+)*$/u.test(content.slug))return "نشانی مقاله باید از حروف، عدد و خط تیره بین واژه‌ها ساخته شود؛ فاصله مجاز نیست.";
    const limits={title:200,summary:1000,body_html:200000,author_name:120,reviewer:120,seo_title:200,seo_description:400,target_keyword:120,cover_alt:300};
    if(Object.entries(limits).some(([key,max])=>String(content[key as keyof ArticleContent]).length>max))return "یکی از فیلدها بیش از حد مجاز است؛ متن مقاله حداکثر ۲۰۰٬۰۰۰ نویسه دارد.";
    if(content.categories.length>10||content.tags.length>20||[...content.categories,...content.tags].some(v=>v.length>80))return "حداکثر ۱۰ دسته و ۲۰ برچسب، هر کدام تا ۸۰ نویسه مجاز است.";
    if(content.sources.length>30)return "حداکثر ۳۰ منبع مجاز است.";
    for(const source of content.sources){
        if(source.title.trim().length<2||source.title.length>300)return "عنوان هر منبع باید بین ۲ و ۳۰۰ نویسه باشد؛ منبع خالی را تکمیل یا حذف کنید.";
        try {const url=new URL(source.url);if(url.protocol!=="https:"||url.username||url.password||/[\s\\]/.test(decodeURIComponent(source.url))||source.url.length>2000)throw Error();}
        catch{return "نشانی هر منبع باید HTTPS معتبر و بدون نام کاربری، رمز یا فاصله باشد.";}
    }
    return "";
}
