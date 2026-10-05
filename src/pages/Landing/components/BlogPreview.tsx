import {useEffect,useState} from 'react';
import {FaRegNewspaper} from 'react-icons/fa';
import {MdNavigateBefore} from 'react-icons/md';
import {publicArticlesApi,type PublicArticle} from '@/services/publicArticlesApi';
import BlogCard from './BlogCard';
export default function BlogPreview(){
    const [items,setItems]=useState<PublicArticle[]>([]);
    useEffect(()=>{let active=true;void publicArticlesApi.list().then(result=>{if(active)setItems(result.items.slice(0,3));}).catch(()=>{});return()=>{active=false;};},[]);
    return <section id="articles" className="relative bg-[#f5f7fd] z-0 px-5 pt-12 pb-20 text-gray-900 md:px-10"><img className="absolute right-25 bottom-25 z-0 hidden lg:block blur-xl" src="/img/services/cloud-1.webp" alt="" loading="lazy"/><img className="absolute left-25 top-25 z-0 hidden lg:block blur-xl" src="/img/services/cloud-2.webp" alt="" loading="lazy"/><img className="absolute -bottom-7 left-0 z-0 hidden lg:block" src="/img/services/dashed-line-up.png" alt="" loading="lazy"/>
        <div className="relative mx-auto max-w-7xl"><div className="mb-6 flex flex-col items-center gap-3 text-center"><div className="rounded-full border border-secondary p-0.5"><div className="bg-linear-to-br from-powderblue to-duskblue rounded-full border border-secondary p-4"><FaRegNewspaper size={32} color="white"/></div></div><h2 className="font-dana text-3xl text-primary md:text-5xl">تازه‌ترین مقالات ENT</h2><p className="max-w-2xl text-gray-600">پاسخ‌های ساده و مستند به پرسش‌های رایج درباره سلامت گوش، بینی، سینوس، گلو و رینوپلاستی</p></div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">{items.map(item=><BlogCard article={item} key={item.id}/>)}</div>{!items.length&&<p className="text-center text-gray-600">هنوز مقاله‌ای برای نمایش منتشر نشده است.</p>}<div className="mt-12 flex justify-center"><a href="/articles/" className="group flex items-center gap-1 rounded-lg bg-primary px-5 py-3 text-white shadow-lg transition duration-300 hover:-translate-y-1 hover:bg-primary-deep hover:shadow-xl">مشاهده همه مقالات<MdNavigateBefore size={22}/></a></div></div>
    </section>;
}
