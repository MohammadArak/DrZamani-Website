"""Pure HTML builders shared by the server-rendered public pages (articles and services).

Standard library only, so the markup can be exercised without the web stack. Every dynamic
value is escaped here; callers pass plain objects/dicts.
"""
import html
import re
from datetime import date, datetime, timedelta, timezone
from urllib.parse import quote, urlsplit

MONTHS = ["فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور", "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند"]
_DIGITS = str.maketrans("0123456789", "۰۱۲۳۴۵۶۷۸۹")
_ICONS = {
    "pen": '<path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16z"/><path d="M13.500 6.500l4 4"/>',
    "search": '<circle cx="11" cy="11" r="6.500"/><path d="M20 20l-4.200-4.200"/>',
    "calendar": '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/>',
    "clock": '<circle cx="12" cy="12" r="8.500"/><path d="M12 7.500V12l3 2"/>',
    "folder": '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
    "list": '<path d="M5 6h14M5 12h14M5 18h14"/>',
    "phone": '<path d="M5 4h4l2 5-2.500 1.500a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/>',
    "mail": '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
    "pin": '<path d="M12 21s7-6.200 7-11.500A7 7 0 0 0 5 9.500C5 14.800 12 21 12 21z"/><circle cx="12" cy="9.500" r="2.500"/>',
    "chevron": '<path d="M14 6l-6 6 6 6"/>',
    "insta": '<rect x="4" y="4" width="16" height="16" rx="5"/><circle cx="12" cy="12" r="3.600"/><circle cx="16.800" cy="7.200" r=".6"/>',
}


def esc(value) -> str:
    return html.escape(str(value))


def icon(name: str, cls: str = "") -> str:
    return f'<svg class="lg-ico {cls}" viewBox="0 0 24 24" aria-hidden="true">{_ICONS[name]}</svg>'


def fa_digits(value) -> str:
    return str(value).translate(_DIGITS)


def _jalali(gy: int, gm: int, gd: int) -> tuple[int, int, int]:
    offsets = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334]
    gy2 = gy + 1 if gm > 2 else gy
    days = 355666 + 365 * gy + (gy2 + 3) // 4 - (gy2 + 99) // 100 + (gy2 + 399) // 400 + gd + offsets[gm - 1]
    jy = -1595 + 33 * (days // 12053)
    days %= 12053
    jy += 4 * (days // 1461)
    days %= 1461
    if days > 365:
        jy += (days - 1) // 365
        days = (days - 1) % 365
    if days < 186:
        return jy, 1 + days // 31, 1 + days % 31
    return jy, 7 + (days - 186) // 30, 1 + (days - 186) % 30


def fa_date(value) -> str:
    """۹ مرداد ۱۴۰۵ for a date/datetime. Naive datetimes are stored UTC and shown in Tehran time (UTC+3:30,
    no daylight saving since 2022), so the server-rendered date matches the browser-rendered one."""
    if isinstance(value, datetime):
        value = (value if value.tzinfo else value.replace(tzinfo=timezone.utc)).astimezone(timezone(timedelta(hours=3, minutes=30)))
    day = value.date() if isinstance(value, datetime) else value
    jy, jm, jd = _jalali(day.year, day.month, day.day)
    return fa_digits(f"{jd} {MONTHS[jm - 1]} {jy}")


def reading_minutes(body_html: str) -> int:
    text = re.sub(r"<[^>]*>", " ", body_html or "")
    return max(1, len(re.findall(r"\w+", text)) // 200 + 1)


def safe_https(url: str) -> str:
    parsed = urlsplit(url or "")
    return url if parsed.scheme == "https" and parsed.hostname and not parsed.username else ""


NAV = [("صفحه اصلی", "/"), ("درباره ما", "/#about-us"), ("خدمات", "/#services"), ("مقالات", "/articles/"), ("تماس با ما", "/#footer")]


def site_header(clinic, *, crumbs=None, banner=True) -> str:
    """Photo banner with the site menu laid over it (same look as the homepage header)."""
    links = "".join(f'<a href="{href}">{label}</a>' for label, href in NAV)
    out = f'<header class="legacy-article-header{"" if banner else " legacy-article-header--bar"}" dir="rtl" lang="fa">'
    if banner:
        out += f'<img class="legacy-article-banner" src="/img/blog/article-header-surgeon.webp" alt="{esc(clinic.doctor_name)} در اتاق عمل" fetchpriority="high" width="2048" height="706">'
    out += (
        f'<nav class="legacy-site-nav" aria-label="منوی اصلی"><a class="legacy-brand" href="/" aria-label="صفحه اصلی">'
        f'<img src="/img/logo/logo-dark-full.webp" alt="{esc(clinic.doctor_name)}" width="250" height="78"></a>'
        f'<div class="legacy-nav-links">{links}</div><a class="legacy-reserve-btn" href="/appointment/" data-reserve aria-label="رزرو نوبت">رزرو نوبت</a></nav>'
    )
    if crumbs:
        trail = "<span aria-hidden=\"true\">›</span>".join(f'<a href="{esc(href)}">{esc(label)}</a>' for label, href in crumbs[:-1])
        out += (
            '<nav class="legacy-hero-crumbs" aria-label="مسیر صفحه">'
            f'<div class="legacy-crumb-trail">{trail}</div><span class="legacy-crumb-title" aria-current="page">{esc(crumbs[-1][0])}</span></nav>'
        )
    return out + "</header>"


def site_footer(clinic) -> str:
    social = ""
    if safe_https(clinic.instagram_url):
        social += f'<a class="legacy-social legacy-instagram" href="{esc(clinic.instagram_url)}" rel="noopener noreferrer">{icon("insta")} صفحه اینستاگرام</a>'
    if safe_https(clinic.eitaa_url):
        social += f'<a class="legacy-social legacy-eitaa" href="{esc(clinic.eitaa_url)}" rel="noopener noreferrer"><img src="/img/logo/eitaa.png" alt="" width="20" height="20"> صفحه ایتا</a>'
    links = [("درباره ما", "/#about-us"), ("خدمات ما", "/#services"), ("نمونه کارها", "/#samples"), ("نظرات مراجعین", "/#comments"), ("سوالات متداول", "/#faq"), ("مقالات", "/articles/")]
    link_html = "".join(f'<li><a href="{href}">{icon("chevron")}{label}</a></li>' for label, href in links)
    map_html = ""
    embed = safe_https(clinic.map_embed_url)
    if embed and urlsplit(embed).hostname in {"neshan.org", "www.neshan.org"}:
        map_html += f'<div class="legacy-footer-map"><iframe title="نقشه مطب" src="{esc(embed)}" loading="lazy" referrerpolicy="strict-origin-when-cross-origin"></iframe></div>'
    if safe_https(clinic.map_page_url):
        map_html += f'<a class="legacy-map-link" href="{esc(clinic.map_page_url)}" rel="noopener noreferrer">{icon("pin")} مشاهده آدرس روی نقشه</a>'
    return (
        '<footer class="legacy-article-footer" dir="rtl"><div class="legacy-footer-columns">'
        f'<section class="legacy-footer-brand"><a href="/"><img src="/img/logo/logo-dark-full.webp" alt="{esc(clinic.doctor_name)}" width="250" height="78" loading="lazy"></a><span class="legacy-diamond-rule" aria-hidden="true"><i></i></span>'
        f'<p>در مطب {esc(clinic.doctor_name)}، تلفیق تجربه و هنر جراحی، مسیر دستیابی به زیبایی طبیعی و عملکرد بهتر را هموار می‌کند. هدف ما ارائه نتایجی ماندگار، متناسب با چهره و مطابق با بالاترین استانداردهای پزشکی است؛ زیرا اعتماد شما، ارزشمندترین سرمایه ماست.</p></section>'
        f'<section><h2>لینک ها</h2><ul class="legacy-footer-links">{link_html}</ul></section>'
        f'<section><h2>تماس ها</h2><div class="legacy-contact-item"><span class="legacy-contact-mark">{icon("phone")}</span><div><h3>شماره تلفن:</h3>'
        f'<a href="tel:{esc(clinic.office_phone)}">{esc(fa_digits(clinic.office_phone))}</a><a href="tel:{esc(clinic.consultation_phone)}">{esc(fa_digits(clinic.consultation_phone))}</a></div></div>'
        f'<div class="legacy-contact-item"><span class="legacy-contact-mark">{icon("mail")}</span><div><h3>آدرس ایمیل:</h3><a href="mailto:{esc(clinic.email)}">{esc(clinic.email)}</a></div></div>'
        f'<div class="legacy-socials">{social}</div></section>'
        f'<section><h2>آدرس ما روی نقشه</h2><p>{esc(clinic.address)}</p>{map_html}</section>'
        '</div><div class="legacy-footer-bottom"><span class="legacy-diamond-rule" aria-hidden="true"><i></i></span>'
        f'<p>تمامی حقوق این وبسایت متعلق به <a href="/">{esc(clinic.doctor_name)}</a> می‌باشد و هر گونه کپی برداری از آن بدون ذکر منبع پیگرد قانونی خواهد داشت.</p></div></footer>'
    )


def article_url(slug: str) -> str:
    return "/articles/" + quote(slug) + "/"


def cover(data: dict, *, lazy: bool = True) -> str:
    if not data.get("cover_key"):
        return ""
    return f'<img src="/media/{esc(data["cover_key"])}.webp" alt="{esc(data.get("cover_alt", ""))}" loading="{"lazy" if lazy else "eager"}" decoding="async" width="480" height="300">'


def article_card(item: dict) -> str:
    """item: published content dict plus published_at (datetime)."""
    category = item["categories"][0] if item.get("categories") else "مقالات"
    stamp = item["published_at"]
    return (
        f'<article class="legacy-card"><a href="{article_url(item["slug"])}" aria-label="مطالعه مقاله: {esc(item["title"])}">'
        f'<div class="legacy-card-cover">{cover(item)}</div><div class="legacy-card-body"><div class="legacy-card-meta">'
        f'<span class="legacy-pill">{esc(category)}</span><time datetime="{stamp.isoformat()}">{icon("calendar")}{esc(fa_date(stamp))}</time></div>'
        f'<h2>{esc(item["title"])}</h2><p>{esc(item["summary"])}</p><span class="legacy-card-more">{icon("chevron")} مطالعه مقاله</span></div></a></article>'
    )


def sidebar(items: list[dict], *, current_slug: str = "", q: str = "") -> str:
    counts: dict[str, int] = {}
    for item in items:
        for name in item.get("categories", []):
            counts[name] = counts.get(name, 0) + 1
    cats = "".join(
        f'<li><a href="/articles/category/{quote(name)}/"><span>{esc(name)}</span><b>{esc(fa_digits(counts[name]))}</b></a></li>'
        for name in sorted(counts)
    )
    latest = ""
    for item in [i for i in items if i["slug"] != current_slug][:4]:
        cat = item["categories"][0] if item.get("categories") else "مقالات"
        latest += f'<li><a href="{article_url(item["slug"])}">{cover(item) or "<i></i>"}<span><small>{esc(cat)}</small>{esc(item["title"])}</span></a></li>'
    return (
        '<aside class="legacy-article-sidebar" aria-label="ابزارهای مقالات">'
        f'<section><h2>{icon("search")}جست‌وجو</h2><form action="/articles/" method="get"><label for="article-search-static">جست‌وجو در مقالات</label>'
        f'<input id="article-search-static" name="q" type="search" maxlength="120" value="{esc(q)}" placeholder="جست‌وجو در مقاله…"><button type="submit">جست‌وجو</button></form></section>'
        f'<section><h2>{icon("folder")}دسته‌بندی</h2><ul class="legacy-cat-list"><li><a href="/articles/"><span>همه مقالات</span><b>{esc(fa_digits(len(items)))}</b></a></li>{cats}</ul></section>'
        f'<section><h2>{icon("list")}آخرین مطالب</h2><ul class="legacy-latest">{latest}</ul></section></aside>'
    )


def hero_title(title: str, lead: str, glyph: str = "pen") -> str:
    return (
        f'<div class="legacy-ring">{icon(glyph)}</div><h1>{esc(title)}</h1><p class="legacy-article-lead">{esc(lead)}</p>'
        '<span class="legacy-gold-rule" aria-hidden="true"><i></i></span>'
    )


def pagination(page: int, total: int, per_page: int, href) -> str:
    pages = max(1, -(-total // per_page))
    if pages == 1:
        return ""
    out = '<nav class="legacy-pagination" aria-label="صفحات مقالات">'
    if page > 1:
        out += f'<a class="legacy-page-prev" href="{esc(href(page - 1))}">{icon("chevron")} قبلی</a>'
    for number in range(1, pages + 1):
        current = ' aria-current="page" class="on"' if number == page else ""
        out += f'<a href="{esc(href(number))}"{current}>{esc(fa_digits(number))}</a>'
    if page < pages:
        out += f'<a class="legacy-page-next" href="{esc(href(page + 1))}">بعدی {icon("chevron")}</a>'
    return out + "</nav>"


def list_content(items: list[dict], *, total: int, page: int, per_page: int, q: str, category: str, categories: list[str]) -> str:
    """Article index body: title block, filter bar, result line, cards and pagination."""
    options = "".join(f'<option value="{esc(name)}"{" selected" if name == category else ""}>{esc(name)}</option>' for name in categories)
    pages = max(1, -(-total // per_page))

    def href(number: int) -> str:
        return f"?page={number}&q={quote(q)}&category={quote(category)}"

    cards = "".join(article_card(item) for item in items) if items else '<p class="legacy-empty">هنوز مقاله‌ای منتشر نشده است.</p>'
    return (
        '<section class="legacy-article-index">'
        + hero_title("مقالات گوش، حلق، بینی و رینوپلاستی", "مطالب علمی با زبان ساده و منابع معتبر برای شناخت بهتر بیماری‌های ENT و مراقبت‌های جراحی بینی")
        + '<form class="legacy-article-filters" action="/articles/" method="get">'
        f'<label for="blog-search">جست‌وجو در مقالات</label><span class="legacy-search-box">{icon("search")}<input id="blog-search" name="q" type="search" maxlength="120" value="{esc(q)}" placeholder="جست‌وجو در عنوان و متن مقاله…"></span>'
        f'<label for="blog-category">فیلتر دسته‌بندی</label><select id="blog-category" name="category"><option value="">همه دسته‌بندی‌ها</option>{options}</select>'
        '<button type="submit">جست‌وجو</button></form>'
        f'<div class="legacy-meta-row"><span>{esc(fa_digits(total))} مقاله یافت شد</span><span>صفحه {esc(fa_digits(page))} از {esc(fa_digits(pages))}</span></div>'
        f'<div class="legacy-article-grid">{cards}</div>'
        + pagination(page, total, per_page, href)
        + "</section>"
    )


def detail_content(data: dict, *, published_at, updated_at, body_html: str, toc_html: str) -> str:
    category = data["categories"][0] if data.get("categories") else "مقالات"
    sources = "".join(
        f'<li><a href="{esc(source["url"])}" rel="noopener noreferrer">{esc(source["title"])}</a></li>' for source in data.get("sources", [])
    )
    cats = "".join(f'<a href="/articles/category/{quote(name)}/">{esc(name)}</a>' for name in data.get("categories", []))
    tags = "".join(f'<a href="/articles/tag/{quote(name)}/">{esc(name)}</a>' for name in data.get("tags", []))
    cover_html = ""
    if data.get("cover_key"):
        cover_html = f'<img class="article-cover" src="/media/{esc(data["cover_key"])}.webp" alt="{esc(data.get("cover_alt", ""))}" width="960" height="600">'
    return (
        '<article class="legacy-article-detail"><header class="legacy-detail-head"><div class="legacy-card-meta">'
        f'<span class="legacy-pill">{esc(category)}</span><span class="legacy-meta-item">{icon("calendar")}انتشار: <time datetime="{published_at.isoformat()}">{esc(fa_date(published_at))}</time></span>'
        f'<span class="legacy-meta-item">{icon("clock")}زمان مطالعه {esc(fa_digits(reading_minutes(body_html)))} دقیقه</span></div>'
        f'<h1>{esc(data["title"])}</h1><p class="legacy-article-summary">{esc(data["summary"])}</p>'
        f'<p class="legacy-byline">نویسنده: {esc(data["author_name"])} · بازبین پزشکی: {esc(data["reviewer"])} · به‌روزرسانی: <time datetime="{updated_at.isoformat()}">{esc(fa_date(updated_at))}</time></p></header>'
        f'{cover_html}{toc_html}<div class="article-body">{body_html}</div>'
        f'<footer><h2>منابع</h2><ul class="legacy-sources">{sources}</ul>'
        '<p class="legacy-disclaimer">این مطلب برای آموزش است و جایگزین مشاوره و معاینه پزشکی نیست.</p>'
        f'<nav aria-label="دسته‌ها">{cats}</nav><nav aria-label="برچسب‌ها">{tags}</nav></footer></article>'
    )


def related_section(items: list[dict], current_slug: str) -> str:
    others = [item for item in items if item["slug"] != current_slug][:3]
    if not others:
        return ""
    return '<section class="legacy-related"><h2 class="legacy-related-title">مطالب مرتبط</h2><div class="legacy-article-grid">' + "".join(article_card(item) for item in others) + "</div></section>"


def outline(body: str):
    """Add anchors to h2/h3 and build the in-article table of contents."""
    headings = []

    def heading(match):
        key = f"article-section-{len(headings) + 1}"
        label = html.unescape(re.sub("<[^>]*>", "", match[2]))
        headings.append(f'<li><a href="#{key}">{html.escape(label)}</a></li>')
        return f'<h{match[1]} id="{key}">{match[2]}</h{match[1]}>'

    body = re.sub(r"<h([23])>(.*?)</h\1>", heading, body, flags=re.S)
    toc = ('<nav class="legacy-article-outline" aria-label="فهرست مطالب"><h2>در این مقاله می‌خوانید</h2><ol>' + "".join(headings) + "</ol></nav>") if headings else ""
    return body, toc


def service_cards(services: list[dict]) -> str:
    return '<div class="landing-services-grid">' + "".join(
        f'<a class="landing-service-card" href="/services/{esc(s["slug"])}/"><span class="svc-icon"><img src="/img/services/{esc(s["image"])}" alt="" width="72" height="72"></span>'
        f'<h2>{esc(s["title"])}</h2><img class="svc-line" src="/img/services/line.png" alt="" width="128" height="10"><p>{esc(s["summary"])}</p><span class="svc-more">آشنایی با خدمت ‹</span></a>'
        for s in services
    ) + "</div>"


def services_page(clinic, services: list[dict], service: dict, tel: str) -> str:
    """Two-part service page: a fixed photo panel with the title and a call button, and the text beside it.
    tel is the already normalised +98 number. There is no services index page: the menu and the breadcrumb
    point at the homepage services section."""
    name = service["title"]
    crumb = (
        '<nav class="svc2-crumb" aria-label="مسیر صفحه"><a href="/">صفحه اصلی</a><span aria-hidden="true">›</span>'
        f'<a href="/#services">خدمات</a><span aria-hidden="true">›</span><span aria-current="page">{esc(name)}</span></nav>'
    )
    photo = (
        '<aside class="svc2-photo"><img src="/img/zamani/dr-zamani-op-2.webp" alt="" width="1920" height="1281" fetchpriority="high">'
        f'<div class="svc2-photo-in">{crumb}<div class="svc2-ring"><img src="/img/services/{esc(service["image"])}" alt="" width="52" height="52"></div>'
        f'<h1>{esc(name)}</h1><p>{esc(service["summary"])}</p>'
        f'<div class="svc2-glass"><span>برای هماهنگی با مطب</span><a href="tel:{esc(tel)}">تماس</a></div></div></aside>'
    )
    text = (
        '<div class="svc2-text"><div class="legacy-service-body article-body">' + service["description_html"] + '</div>'
        '<div class="legacy-service-intro"><h2>هماهنگی مراجعه</h2><p>پرسش‌های خود درباره مراجعه را با مطب مطرح کنید. زمان مراجعه پس از هماهنگی با مطب مشخص می‌شود.</p>'
        f'<ul><li>{esc(clinic.doctor_name)}، {esc(clinic.specialty)}</li><li>{esc(clinic.address_city)}، {esc(clinic.address)}</li><li>{esc(clinic.working_hours)}</li></ul>'
        f'<div class="legacy-service-actions"><a class="legacy-header-cta" href="tel:{esc(tel)}">تماس با مطب</a><a class="legacy-outline-button" href="/#footer">راه‌های ارتباطی</a></div></div>'
        '<p class="legacy-disclaimer">این صفحه برای آشنایی است و جایگزین ویزیت و مشاوره‌ی پزشکی نیست؛ نتیجه‌ی درمان برای هر فرد متفاوت است.</p>'
        '<h2 class="legacy-service-heading">خدمات دیگر</h2>' + service_cards(services)
        + '<nav class="legacy-service-related" aria-label="مطالب مرتبط"><a href="/articles/">مقالات منتشرشده</a><a href="/#samples">نمونه‌کارها</a><a href="/#footer">ارتباط با مطب</a></nav></div>'
    )
    return (
        site_header(clinic, banner=False)
        + f'<main class="svc2 legacy-article-page legacy-service-page" dir="rtl" lang="fa">{photo}{text}</main>'
        + site_footer(clinic)
    )


def reserve_dialog(message: str) -> str:
    """Hidden twin of the homepage reserve dialog (shown by /reserve.js when online booking is off)."""
    return (
        '<div class="drz-dialog-overlay" data-reserve-dialog hidden>'
        '<div class="drz-dialog" role="dialog" aria-modal="true" aria-label="رزرو نوبت" tabindex="-1" dir="rtl">'
        '<button type="button" class="drz-dialog-close" data-reserve-close aria-label="بستن">'
        '<svg viewBox="0 0 20 20" width="1em" height="1em" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" '
        'd="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/></svg></button>'
        f'<div class="drz-dialog-body"><h5>رزرو نوبت</h5><p>{esc(message)}</p></div>'
        '<div class="drz-dialog-footer"><button type="button" class="drz-dialog-ok" data-reserve-close>متوجه شدم</button></div>'
        '</div></div>'
    )
