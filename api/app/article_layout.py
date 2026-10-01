"""The pre-CMS article header/sidebar layout, populated only from published rows."""
import html
import json
import re
from urllib.parse import quote
from .content import public_rows


def outline(body):
    headings=[]
    def heading(match):
        key=f'article-section-{len(headings)+1}'
        label=html.unescape(re.sub('<[^>]*>','',match[2]))
        headings.append(f'<li><a href="#{key}">{html.escape(label)}</a></li>')
        return f'<h{match[1]} id="{key}">{match[2]}</h{match[1]}>'
    body=re.sub(r'<h([23])>(.*?)</h\1>',heading,body,flags=re.S)
    return body, '<nav class="legacy-article-outline" aria-label="فهرست مطالب"><h2>در این مقاله می‌خوانید</h2><ol>'+''.join(headings)+'</ol></nav>' if headings else ''


def image(data, *, thumbnail=False):
    if not data.get('cover_key'):
        return ''
    return f'<img class="legacy-article-image" src="/media/{data["cover_key"]}.webp" alt="{html.escape(data["cover_alt"])}" loading="{"lazy" if thumbnail else "eager"}" decoding="async">'


def layout(db, clinic, content, *, current_slug='', q='', index=False):
    esc = html.escape
    rows = public_rows(db)
    categories = sorted({v for row in rows for v in json.loads(row.published_json)['categories']})
    sidebar = '<aside class="legacy-article-sidebar" aria-label="ابزارهای مقالات"><section><h2>جست‌وجو</h2><form action="/articles/" method="get"><label for="article-search-static">جست‌وجو در مقالات</label>'
    sidebar += f'<input id="article-search-static" name="q" type="search" maxlength="120" value="{esc(q)}"><button type="submit">جست‌وجو</button></form></section><section><h2>دسته‌بندی</h2><ul><li><a href="/articles/">همه مقالات</a></li>'
    for category in categories:
        sidebar += f'<li><a href="/articles/category/{quote(category)}/">{esc(category)}</a></li>'
    sidebar += '</ul></section><section><h2>آخرین مطالب</h2><ul>'
    for row in [r for r in rows if r.published_slug != current_slug][:4]:
        data = json.loads(row.published_json)
        sidebar += f'<li><a href="/articles/{quote(data["slug"])}/">{image(data,thumbnail=True)}<span>{esc(data["title"])}</span></a></li>'
    sidebar += '</ul></section></aside>'
    header = f'<header class="legacy-article-header" dir="rtl" lang="fa"><nav><a href="/" aria-label="صفحه اصلی"><img src="/img/logo/logo-dark-full.webp" alt="{esc(clinic.doctor_name)}" width="250" height="78"></a><a href="/">صفحه اصلی</a><a href="/articles/">مقالات</a><a href="/#footer">تماس با ما</a></nav><img class="legacy-article-banner" src="/img/blog/article-header-surgeon.webp" alt="{esc(clinic.doctor_name)} در اتاق عمل" fetchpriority="high" width="2048" height="706"></header>'
    footer = f'<footer class="legacy-article-footer" dir="rtl"><div class="legacy-footer-columns"><section><a href="/"><img src="/img/logo/logo-dark-full.webp" alt="{esc(clinic.doctor_name)}" width="250" height="78" loading="lazy"></a><p>وب‌سایت {esc(clinic.doctor_name)}، {esc(clinic.specialty)}</p></section><section><h2>لینک ها</h2><a href="/#about-us">درباره ما</a><a href="/#services">خدمات ما</a><a href="/#comments">نظرات مراجعین</a><a href="/#faq">سوالات متداول</a></section><section><h2>تماس ها</h2><h3>شماره تلفن:</h3><a href="tel:{esc(clinic.office_phone)}">{esc(clinic.office_phone)}</a><a href="tel:{esc(clinic.consultation_phone)}">{esc(clinic.consultation_phone)}</a><h3>آدرس ایمیل:</h3><a href="mailto:{esc(clinic.email)}">{esc(clinic.email)}</a></section><section><h2>آدرس ما روی نقشه</h2><p>{esc(clinic.address)}</p>'
    if clinic.map_page_url:footer+=f'<a href="{esc(clinic.map_page_url)}" rel="noopener noreferrer">مشاهده آدرس روی نقشه</a>'
    footer+='</section></div></footer>'
    return header + '<main class="legacy-article-page" dir="rtl" lang="fa"><div class="'+('legacy-article-index-container' if index else 'legacy-article-columns')+'">' + content + ('' if index else sidebar) + '</div></main>' + footer
