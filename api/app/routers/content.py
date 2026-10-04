import json
import secrets
from datetime import datetime, timezone
from io import BytesIO
from pathlib import Path
from typing import Literal
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from fastapi.responses import FileResponse
from pydantic import BaseModel, ConfigDict, Field
from PIL import Image, ImageOps, UnidentifiedImageError
from sqlalchemy import select, func
from sqlalchemy.orm import Session
from .. import content as c
from ..access import is_owner
from ..content_models import Article, ArticleRevision, PublicMedia, ArticleAlias
from ..database import get_db
from ..dependencies import require_permission
from ..models import utcnow
from ..runtime_settings import get_settings
from ..activity import record_audit

router=APIRouter(tags=['articles and media'])
staff_router=APIRouter(prefix='/staff',tags=['editorial'])


class RevisionInput(BaseModel):
    model_config=ConfigDict(extra='forbid')
    revision: int=Field(ge=1)


class Transition(RevisionInput):
    action: Literal['review','publish','schedule','unpublish','cancel_schedule']
    scheduled_at: datetime | None=None


def listing(rows,q='',category='',tag=''):
    result=[]
    for row in rows:
        data=json.loads(row.published_json)
        if q and q.casefold() not in (data['title']+' '+data['summary']+' '+data['body_html']).casefold():continue
        if category and category not in data['categories']:continue
        if tag and tag not in data['tags']:continue
        item=c.read(row,public=True);item['content']={k:v for k,v in data.items() if k not in {'body_html','sources'}};result.append(item)
    return result


@router.get('/articles')
def public_list(q:str=Query('',max_length=120),category:str=Query('',max_length=80),tag:str=Query('',max_length=80),page:int=Query(1,ge=1,le=10000),db:Session=Depends(get_db)):
    rows=c.public_rows(db);items=listing(rows,q,category,tag)
    return dict(items=items[(page-1)*12:page*12],total=len(items),page=page,categories=sorted({v for r in rows for v in json.loads(r.published_json)['categories']}))


@router.get('/articles/{slug}')
def public_article(slug:str,db:Session=Depends(get_db)):
    c.publish_due(db)
    row=db.scalar(select(Article).where(Article.published_slug==slug,Article.deleted.is_(False),Article.published_json.is_not(None)))
    if not row:raise HTTPException(404,'مقاله منتشرشده پیدا نشد')
    return c.read(row,public=True)


@staff_router.get('/articles')
def staff_list(page:int=Query(1,ge=1,le=10000),db:Session=Depends(get_db),staff=Depends(require_permission('articles.view'))):
    count=db.scalar(select(func.count(Article.id)).where(Article.deleted.is_(False)))
    rows=db.scalars(select(Article).where(Article.deleted.is_(False)).order_by(Article.updated_at.desc(),Article.id.desc()).offset((page-1)*30).limit(30))
    return dict(items=[c.read(r) for r in rows],total=count,page=page)


@staff_router.post('/articles/seo')
def seo(payload:c.ArticleContent,db:Session=Depends(get_db),staff=Depends(require_permission('articles.view'))):
    data,changed=c.clean_content(payload,db)
    return dict(content=data,seo=c.analyze(data),sanitized=changed)


@staff_router.post('/articles',status_code=201)
def create(payload:c.ArticleWrite,db:Session=Depends(get_db),staff=Depends(require_permission('articles.create'))):
    c.lock(db,staff,'articles.create');c.reserve_slug(db,payload.content.slug)
    data,changed=c.clean_content(payload.content,db)
    row=Article(slug=data['slug'],author_id=staff.id,content_json=json.dumps(data,ensure_ascii=False))
    db.add(row);db.flush();c.revision(db,row,staff,'create');db.commit()
    return dict(**c.read(row),sanitized=changed)


@staff_router.get('/articles/{article_id}')
def get_article(article_id:int,db:Session=Depends(get_db),staff=Depends(require_permission('articles.view'))):return c.read(c.article_row(db,article_id))


@staff_router.put('/articles/{article_id}')
def update(article_id:int,payload:c.ArticleWrite,db:Session=Depends(get_db),staff=Depends(require_permission('articles.edit'))):
    c.lock(db,staff,'articles.edit');row=c.article_row(db,article_id,payload.revision)
    c.reserve_slug(db,payload.content.slug,row.id);data,changed=c.clean_content(payload.content,db)
    row.slug=data['slug'];row.content_json=json.dumps(data,ensure_ascii=False);row.revision+=1;row.updated_at=utcnow()
    # Editing invalidates review but never mutates an approved public/scheduled snapshot.
    if row.status=='review':row.status='draft'
    c.revision(db,row,staff,'edit');db.commit();return dict(**c.read(row),sanitized=changed)


@staff_router.post('/articles/{article_id}/transition')
def transition(article_id:int,payload:Transition,db:Session=Depends(get_db),staff=Depends(require_permission('articles.view'))):
    permission='articles.edit' if payload.action=='review' else 'articles.publish'
    c.lock(db,staff,permission);row=c.article_row(db,article_id,payload.revision)
    if payload.action in {'publish','schedule'}:
        data,changed=c.clean_content(c.ArticleContent.model_validate_json(row.content_json),db);c.approve(data)
        snapshot=json.dumps(data,ensure_ascii=False)
        if payload.action=='publish':c.publish(db,row,snapshot)
        else:
            when=payload.scheduled_at
            if not when or when.tzinfo is None:raise HTTPException(422,'زمان انتشار باید منطقه زمانی داشته باشد')
            when=when.astimezone(timezone.utc).replace(tzinfo=None)
            if when<=utcnow():raise HTTPException(422,'زمان انتشار باید در آینده باشد')
            row.scheduled_at=when;row.scheduled_json=snapshot;row.status='scheduled'
    elif payload.action=='review':row.status='review'
    elif payload.action=='unpublish':
        row.published_json=None;row.scheduled_json=None;row.scheduled_at=None;row.status='draft'
    elif payload.action=='cancel_schedule':
        row.scheduled_json=None;row.scheduled_at=None;row.status='published' if row.published_json else 'draft'
    row.revision+=1;row.updated_at=utcnow();c.revision(db,row,staff,payload.action);db.commit();return c.read(row)


@staff_router.delete('/articles/{article_id}')
def delete_article(article_id:int,payload:RevisionInput,db:Session=Depends(get_db),staff=Depends(require_permission('articles.delete'))):
    c.lock(db,staff,'articles.delete');row=c.article_row(db,article_id,payload.revision)
    if (row.published_json or row.scheduled_json) and not c.can(staff,'articles.publish'):raise HTTPException(403,'حذف مقاله عمومی یا زمان‌بندی‌شده مجوز انتشار می‌خواهد')
    row.deleted=True;row.published_json=None;row.scheduled_json=None;row.scheduled_at=None;row.status='archived';row.revision+=1
    c.revision(db,row,staff,'archive');db.commit();return {'message':'مقاله بایگانی شد؛ تاریخچه نگه داشته شد'}


@staff_router.get('/articles/{article_id}/revisions')
def history(article_id:int,db:Session=Depends(get_db),staff=Depends(require_permission('articles.view'))):
    c.article_row(db,article_id)
    rows=db.scalars(select(ArticleRevision).where(ArticleRevision.article_id==article_id).order_by(ArticleRevision.id.desc()).limit(100))
    return [dict(id=r.id,revision=r.revision,action=r.action,created_at=r.created_at) for r in rows]


@staff_router.post('/articles/{article_id}/restore/{revision_id}')
def restore(article_id:int,revision_id:int,payload:RevisionInput,db:Session=Depends(get_db),staff=Depends(require_permission('articles.edit'))):
    c.lock(db,staff,'articles.edit');row=c.article_row(db,article_id,payload.revision);old=db.get(ArticleRevision,revision_id)
    if not old or old.article_id!=row.id:raise HTTPException(404,'نسخه پیدا نشد')
    data,_=c.clean_content(c.ArticleContent.model_validate_json(old.content_json),db);c.reserve_slug(db,data['slug'],row.id)
    row.content_json=json.dumps(data,ensure_ascii=False);row.slug=data['slug'];row.revision+=1;row.updated_at=utcnow()
    if row.status=='review':row.status='draft'
    c.revision(db,row,staff,'restore');db.commit();return c.read(row)


def media_read(row):return dict(key=row.key,alt=row.alt,width=row.width,height=row.height,size=row.size,owner_id=row.owner_id,url=f'/media/{row.key}.webp',preview_url=f'/api/v1/staff/media/{row.key}/file')


def media_row(db,key):
    if not c.re.fullmatch(r'[a-f0-9]{32}',key):raise HTTPException(404,'رسانه پیدا نشد')
    row=db.get(PublicMedia,key)
    if not row or row.deleted:raise HTTPException(404,'رسانه پیدا نشد')
    return row


def media_path(key):
    root=get_settings().public_media_dir.resolve();path=(root/(key+'.webp')).resolve()
    if path.parent!=root or not path.is_file():raise HTTPException(404,'رسانه پیدا نشد')
    return path


@staff_router.get('/media')
def media_list(page:int=Query(1,ge=1,le=10000),q:str=Query('',max_length=120),db:Session=Depends(get_db),staff=Depends(require_permission('media.manage'))):
    filters=[PublicMedia.deleted.is_(False)]
    if q.strip():filters.append(PublicMedia.alt.contains(q.strip(),autoescape=True))
    total=db.scalar(select(func.count(PublicMedia.key)).where(*filters))
    rows=db.scalars(select(PublicMedia).where(*filters).order_by(PublicMedia.created_at.desc(),PublicMedia.key.desc()).offset((page-1)*60).limit(60))
    return dict(items=[media_read(r) for r in rows],total=total,page=page)


@staff_router.get('/media/{key}')
def media_metadata(key:str,db:Session=Depends(get_db),staff=Depends(require_permission('media.manage'))):
    return media_read(media_row(db,key))


@staff_router.post('/media',status_code=201)
async def upload(file:UploadFile=File(...),alt:str=Form(...,min_length=2,max_length=300),db:Session=Depends(get_db),staff=Depends(require_permission('media.manage'))):
    alt=alt.strip()
    if len(alt)<2:raise HTTPException(422,'توضیح تصویر لازم است')
    limit=get_settings().max_upload_bytes;contents=await file.read(limit+1)
    if not contents or len(contents)>limit:raise HTTPException(413,'حجم فایل بیش از حد مجاز است')
    try:
        with Image.open(BytesIO(contents),formats=['JPEG','PNG','WEBP']) as source:
            if source.width*source.height>20_000_000:raise HTTPException(413,'ابعاد تصویر بیش از حد مجاز است')
            image=ImageOps.exif_transpose(source).convert('RGBA' if 'A' in source.getbands() else 'RGB')
            image.thumbnail((2000,2000),Image.Resampling.LANCZOS);output=BytesIO();image.save(output,format='WEBP',quality=82,method=6)
    except (UnidentifiedImageError,OSError,ValueError,Image.DecompressionBombError):raise HTTPException(415,'فقط تصویر واقعی JPEG، PNG یا WebP مجاز است') from None
    c.lock(db,staff,'media.manage');key=secrets.token_hex(16);root=get_settings().public_media_dir
    root.mkdir(parents=True,exist_ok=True);path=root/(key+'.webp');path.write_bytes(output.getvalue())
    try:
        row=PublicMedia(key=key,owner_id=staff.id,alt=alt,width=image.width,height=image.height,size=len(output.getvalue()))
        db.add(row)
        record_audit(db,action='media.upload',entity_type='public_media',entity_id=key,summary='بارگذاری رسانه عمومی',actor_staff_id=staff.id)
        db.commit()
    except Exception:
        path.unlink(missing_ok=True);raise
    return media_read(row)


@staff_router.get('/media/{key}/file')
def preview_image(key:str,db:Session=Depends(get_db),staff=Depends(require_permission('media.manage'))):
    media_row(db,key);return FileResponse(media_path(key),media_type='image/webp',headers={'Cache-Control':'no-store'})


class MediaEdit(BaseModel):
    model_config=ConfigDict(extra='forbid')
    alt:str=Field(min_length=2,max_length=300)


@staff_router.put('/media/{key}')
def media_edit(key:str,payload:MediaEdit,db:Session=Depends(get_db),staff=Depends(require_permission('media.manage'))):
    c.lock(db,staff,'media.manage');row=media_row(db,key)
    if row.owner_id!=staff.id and not is_owner(staff):raise HTTPException(403,'فقط بارگذار یا مدیرکل می‌تواند این رسانه را ویرایش کند')
    if len(payload.alt.strip())<2:raise HTTPException(422,'توضیح تصویر لازم است')
    row.alt=payload.alt.strip()
    record_audit(db,action='media.edit',entity_type='public_media',entity_id=key,summary='ویرایش توضیح رسانه',actor_staff_id=staff.id)
    db.commit();return media_read(row)


@staff_router.delete('/media/{key}')
def media_delete(key:str,db:Session=Depends(get_db),staff=Depends(require_permission('media.manage'))):
    c.lock(db,staff,'media.manage');row=media_row(db,key)
    if row.owner_id!=staff.id and not is_owner(staff):raise HTTPException(403,'فقط بارگذار یا مدیرکل می‌تواند رسانه را بایگانی کند')
    articles=db.scalars(select(Article).where(Article.deleted.is_(False)))
    if any(key in c.media_keys(s) for a in articles for s in (a.content_json,a.published_json,a.scheduled_json)):
        raise HTTPException(409,'رسانه در یک مقاله استفاده شده است')
    from ..comment_models import Comment
    comments=db.scalars(select(Comment).where(Comment.deleted.is_(False)))
    if any(json.loads(s).get('photo_key')==key for row in comments for s in (row.content_json,row.published_json) if s):
        raise HTTPException(409,'رسانه در یک نظر استفاده شده است')
    from ..site_services import media_keys_in_use
    if key in media_keys_in_use(db):raise HTTPException(409,'رسانه در یک صفحه خدمت استفاده شده است')
    from ..site_gallery import media_keys_in_use as gallery_in_use
    if key in gallery_in_use(db):raise HTTPException(409,'رسانه در نمونه‌کارها استفاده شده است')
    row.deleted=True
    record_audit(db,action='media.archive',entity_type='public_media',entity_id=key,summary='بایگانی رسانه',actor_staff_id=staff.id)
    db.commit();return {'message':'رسانه بایگانی شد'}


def public_file(key,db):
    media_row(db,key)
    if not c.is_public_media(db,key):raise HTTPException(404,'رسانه عمومی پیدا نشد')
    return FileResponse(media_path(key),media_type='image/webp',headers={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'})
