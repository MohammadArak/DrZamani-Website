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
from .article_layout import layout, outline, published_items
from .public_chrome import detail_content, list_content, related_section


def article_url(slug):return '/articles/'+quote(slug)+'/'


def list_html(db,q='',category='',page=1,tag=''):
    clinic=clinic_row(db);rows=public_rows(db);items=listing(rows,q,category,tag)
    categories=sorted({v for r in rows for v in json.loads(r.published_json)['categories']})
    if category and category not in categories:raise HTTPException(404,'دسته پیدا نشد')
    if tag and tag not in {v for r in rows for v in json.loads(r.published_json)['tags']}:raise HTTPException(404,'برچسب پیدا نشد')
    if page>1 and (page-1)*12>=len(items):raise HTTPException(404,'صفحه پیدا نشد')
    title='مقالات'+(' '+(category or tag) if category or tag else '')+' | '+clinic.doctor_name
    path='/articles/category/'+quote(category)+'/' if category else '/articles/tag/'+quote(tag)+'/' if tag else '/articles/'
    page_items=[dict(item['content'],published_at=item['published_at']) for item in items[(page-1)*12:page*12]]
    body=list_content(page_items,total=len(items),page=page,per_page=12,q=q,category=category,categories=categories)
    body=layout(db,clinic,body,q=q,index=True)
    if page>1:path+=f'?page={page}'
    return render(clinic,'articles',db,editorial=dict(preload='/img/blog/article-header-surgeon.webp',title=title,description='مقالات آموزشی مطب با نویسنده، بازبین و منابع قابل بررسی.',path=path,body=body,robots='noindex, follow' if q or not items else 'index, follow',schemas=[]))


@router.get('/articles')
def articles_alias():return RedirectResponse('/articles/',status_code=301)


@router.get('/articles/')
def article_list(q:str=Query('',max_length=120),category:str=Query('',max_length=120),page:int=Query(1,ge=1,le=10000),db:Session=Depends(get_db)):
    return list_html(db,q,category,page=page)


@router.get('/articles/category/{category}/')
def category_list(category:str,q:str=Query('',max_length=120),page:int=Query(1,ge=1,le=10000),db:Session=Depends(get_db)):
    return list_html(db,q,category,page)


@router.get('/articles/tag/{tag}/')
def tag_list(tag:str,q:str=Query('',max_length=120),page:int=Query(1,ge=1,le=10000),db:Session=Depends(get_db)):
    return list_html(db,q,page=page,tag=tag)


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
    article_body,toc=outline(sanitize(data['body_html']))
    body=detail_content(data,published_at=row.published_at,updated_at=row.public_updated_at,body_html=article_body,toc_html=toc)
    body=layout(db,clinic,body,current_slug=slug,crumbs=[('صفحه اصلی','/'),('مقالات','/articles/'),(data['title'],'')],after=related_section(published_items(db),slug))
    schema={'@context':'https://schema.org','@type':'Article','headline':data['title'],'description':data['summary'],'mainEntityOfPage':canonical,'datePublished':row.published_at.isoformat()+'Z','dateModified':row.public_updated_at.isoformat()+'Z','author':{'@type':'Person','name':data['author_name']},'reviewedBy':{'@type':'Person','name':data['reviewer']},'publisher':{'@type':'Organization','name':clinic.doctor_name,'url':site},'citation':[s['url'] for s in data['sources']],'keywords':data['tags']}
    if image:schema['image']=image
    breadcrumbs={'@context':'https://schema.org','@type':'BreadcrumbList','itemListElement':[{'@type':'ListItem','position':i,'name':name,'item':url} for i,(name,url) in enumerate([('صفحه اصلی',site+'/'),('مقالات',site+'/articles/'),(data['title'],canonical)],1)]}
    return render(clinic,'articles',db,editorial=dict(preload='/img/blog/article-header-surgeon.webp',title=data['seo_title'] or data['title'],description=data['seo_description'] or data['summary'],path=article_url(slug),body=body,image=image,article=True,schemas=[schema,breadcrumbs]))


@router.get('/articles/{slug}')
def detail_slash(slug:str):return RedirectResponse(article_url(slug),status_code=301)


@router.get('/media/{key}.webp')
def media(key:str,db:Session=Depends(get_db)):return public_file(key,db)
