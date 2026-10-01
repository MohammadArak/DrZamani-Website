import type {PublicArticle} from '@/services/publicArticlesApi';
export default function BlogCard({article}:{article:PublicArticle}){
    const data=article.content;
    return <article className="group h-full overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition duration-300 hover:-translate-y-1.5 hover:shadow-xl"><a href={`/articles/${encodeURIComponent(data.slug)}/`} className="flex h-full flex-col" aria-label={`مطالعه مقاله: ${data.title}`}>
        <div className="aspect-16/10 overflow-hidden bg-gray-100">{data.cover_key&&<img src={`/media/${data.cover_key}.webp`} alt={data.cover_alt} loading="lazy" decoding="async" width={480} height={300} className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.05]"/>}</div>
        <div className="flex grow flex-col p-5"><div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs"><span className="rounded-full bg-secondary-subtle px-3 py-1 text-secondary-deep">{data.categories[0]??'مقالات'}</span><time dateTime={article.published_at}>{new Intl.DateTimeFormat('fa-IR').format(new Date(article.published_at+'Z'))}</time></div><h3 className="mb-3 text-lg font-bold leading-8 text-primary transition group-hover:text-secondary-deep">{data.title}</h3><p className="line-clamp-3 grow text-justify text-sm leading-7 text-gray-600">{data.summary}</p><span className="mt-5 flex items-center justify-end text-secondary-deep">مطالعه مقاله ←</span></div>
    </a></article>;
}
