"""Complete indexable editorial HTML; retired legacy paths never revive implicitly."""
import html
import json
from urllib.parse import quote
from fastapi import Depends, Query, HTTPException
from fastapi.responses import RedirectResponse
from sqlalchemy import select
from sqlalchemy.orm import Session
from .database import get_db
from .public_pages import router, clinic_row, render
from .content import public_rows, publish_due, sanitize
from .content_models import Article, ArticleAlias
from .routers.content import listing, public_file


def article_url(slug):return '/articles/'+quote(slug)+'/'


def list_html(db,q='',category='',page=1):
    clinic=clinic_row(db);rows=public_rows(db);items=listing(rows,q,category)
    categories=sorted({v for r in rows for v in json.loads(r.published_json)['categories']})
    if category and category not in categories:raise HTTPException(404,'دسته پیدا نشد')
    if page>1 and (page-1)*12>=len(items):raise HTTPException(404,'صفحه پیدا نشد')
    esc=html.escape;title='مقالات'+(' '+category if category else '')+' | '+clinic.doctor_name
    path='/articles/category/'+quote(category)+'/' if category else '/articles/'
    body=f'<main class="article-page" lang="fa" dir="rtl"><a href="/">صفحه اصلی</a><h1>{esc(title)}</h1><p>مطالب آموزشی با منابع و مشخصات بازبین؛ جایگزین معاینه و مشاوره پزشکی نیست.</p><form method="get"><label>جستجوی مقالات <input name="q" value="{esc(q)}" maxlength="120"></label><button>جستجو</button></form><nav aria-label="دسته‌های مقالات"><a href="/articles/">همه مقالات</a>'
    for value in categories:body+=f'<a href="/articles/category/{quote(value)}/">{esc(value)}</a>'
    body+='</nav><div class="article-grid">'
    for item in items[(page-1)*12:page*12]:
        data=item['content'];body+=f'<article><h2><a href="{article_url(data["slug"])}">{esc(data["title"])}</a></h2><p>{esc(data["summary"])}</p><p>بازبین: {esc(data["reviewer"])}</p></article>'
    if not items:body+='<p>هنوز مقاله‌ای منتشر نشده است.</p>'
    body+='</div><nav aria-label="صفحات مقالات">'
    if page>1:body+=f'<a href="?page={page-1}&amp;q={quote(q)}">صفحه قبل</a>'
    if page*12<len(items):body+=f'<a href="?page={page+1}&amp;q={quote(q)}">صفحه بعد</a>'
    body+='</nav></main>'
    if page>1:path+=f'?page={page}'
    return render(clinic,'articles',db,editorial=dict(title=title,description='مقالات آموزشی مطب با نویسنده، بازبین و منابع قابل بررسی.',path=path,body=body,robots='noindex, follow' if q or not items else 'index, follow',schemas=[]))


@router.get('/articles')
def articles_alias():return RedirectResponse('/articles/',status_code=301)


@router.get('/articles/')
def article_list(q:str=Query('',max_length=120),page:int=Query(1,ge=1,le=10000),db:Session=Depends(get_db)):
    return list_html(db,q,page=page)


@router.get('/articles/category/{category}/')
def category_list(category:str,q:str=Query('',max_length=120),page:int=Query(1,ge=1,le=10000),db:Session=Depends(get_db)):
    return list_html(db,q,category,page)


@router.get('/articles/{slug}/')
def article_detail(slug:str,db:Session=Depends(get_db)):
    publish_due(db);clinic=clinic_row(db);esc=html.escape
    row=db.scalar(select(Article).where(Article.published_slug==slug,Article.deleted.is_(False),Article.published_json.is_not(None)))
    if not row:
        alias=db.get(ArticleAlias,slug)
        target=db.get(Article,alias.article_id) if alias else None
        if target and not target.deleted and target.published_json:return RedirectResponse(article_url(target.published_slug),status_code=301)
        draft=db.scalar(select(Article.id).where(Article.slug==slug,Article.deleted.is_(False),Article.published_json.is_(None)))
        raise HTTPException(404 if draft else 410,'این مقاله منتشر نشده یا نشانی قدیمی بازنشسته شده است')
    data=json.loads(row.published_json);site=clinic.site_url.rstrip('/');canonical=site+article_url(slug)
    image=site+'/media/'+data['cover_key']+'.webp' if data['cover_key'] else None
    body=f'<main class="article-page" dir="rtl" lang="fa"><nav aria-label="مسیر صفحه"><a href="/">صفحه اصلی</a><a href="/articles/">مقالات</a></nav><article><header><h1>{esc(data["title"])}</h1><p>{esc(data["summary"])}</p><p>نویسنده: {esc(data["author_name"])} · بازبین پزشکی: {esc(data["reviewer"])}</p><p>انتشار: <time datetime="{row.published_at.isoformat()}">{row.published_at.date()}</time> · به‌روزرسانی: <time datetime="{row.public_updated_at.isoformat()}">{row.public_updated_at.date()}</time></p></header>'
    if image:body+=f'<img class="article-cover" src="{esc(image)}" alt="{esc(data["cover_alt"])}">'
    body+=f'<div class="article-body">{sanitize(data["body_html"])}</div><footer><h2>منابع</h2><ul>'
    for source in data['sources']:body+=f'<li><a href="{esc(source["url"])}" rel="noopener noreferrer">{esc(source["title"])}</a></li>'
    body+='</ul><p>این مطلب برای آموزش است و جایگزین مشاوره و معاینه پزشکی نیست.</p><nav aria-label="دسته‌ها">'
    for category in data['categories']:body+=f'<a href="/articles/category/{quote(category)}/">{esc(category)}</a>'
    body+='</nav></footer></article></main>'
    schema={'@context':'https://schema.org','@type':'Article','headline':data['title'],'description':data['summary'],'mainEntityOfPage':canonical,'datePublished':row.published_at.isoformat()+'Z','dateModified':row.public_updated_at.isoformat()+'Z','author':{'@type':'Person','name':data['author_name']},'reviewedBy':{'@type':'Person','name':data['reviewer']},'publisher':{'@type':'Organization','name':clinic.doctor_name,'url':site},'citation':[s['url'] for s in data['sources']],'keywords':data['tags']}
    if image:schema['image']=image
    breadcrumbs={'@context':'https://schema.org','@type':'BreadcrumbList','itemListElement':[{'@type':'ListItem','position':i,'name':name,'item':url} for i,(name,url) in enumerate([('صفحه اصلی',site+'/'),('مقالات',site+'/articles/'),(data['title'],canonical)],1)]}
    return render(clinic,'articles',db,editorial=dict(title=data['seo_title'] or data['title'],description=data['seo_description'] or data['summary'],path=article_url(slug),body=body,image=image,article=True,schemas=[schema,breadcrumbs]))


@router.get('/articles/{slug}')
def detail_slash(slug:str):return RedirectResponse(article_url(slug),status_code=301)


@router.get('/media/{key}.webp')
def media(key:str,db:Session=Depends(get_db)):return public_file(key,db)
