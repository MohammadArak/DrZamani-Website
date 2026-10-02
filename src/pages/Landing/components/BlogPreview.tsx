import { useEffect, useState } from "react";
import { publicArticlesApi, type PublicArticle } from "@/services/publicArticlesApi";
import BlogCard from "./BlogCard";
import SectionHeading from "./SectionHeading";
export default function BlogPreview() {
    const [items, setItems] = useState<PublicArticle[]>([]);
    const [error, setError] = useState(false);
    useEffect(() => { let active = true; void publicArticlesApi.list().then(result => { if(active) setItems(result.items.slice(0, 3)); }).catch(() => { if(active) setError(true); }); return () => { active = false; }; }, []);
    return <section id="articles" className="landing-section landing-articles"><div className="landing-container"><SectionHeading title="دانستنی‌های سلامت و زیبایی" description="مقالات و مطالب منتشرشده در حوزه گوش، حلق و بینی" /><div className="landing-articles-grid">{items.map(item => <BlogCard article={item} key={item.id} />)}</div>{!items.length && <p className="landing-empty">{error ? "دریافت مقالات ممکن نشد. از فهرست مقالات دوباره تلاش کنید." : "هنوز مقاله‌ای برای نمایش منتشر نشده است."}</p>}<div className="landing-actions" style={{ justifyContent: "center" }}><a href="/articles/" className="landing-button landing-button-navy">همه مقالات <span aria-hidden="true">←</span></a></div></div></section>;
}
