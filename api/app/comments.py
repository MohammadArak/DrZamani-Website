"""Plain-text testimonials, explicit consent, independent staff permissions and CAS."""
import html
import json
from fastapi import HTTPException
from pydantic import BaseModel,ConfigDict,Field,field_validator
from sqlalchemy import select
from .comment_models import Comment
from .content_models import PublicMedia
from .models import Service,utcnow
from .access import can


class CommentContent(BaseModel):
    model_config=ConfigDict(extra='forbid')
    display_name:str=Field(min_length=2,max_length=120)
    body:str=Field(min_length=2,max_length=2000)
    age:int|None=Field(default=None,ge=1,le=130)
    photo_key:str|None=Field(default=None,pattern=r'^[a-f0-9]{32}$')
    photo_alt:str=Field(default='',max_length=300)
    service_id:int|None=Field(default=None,gt=0)
    sort_order:int=Field(default=0,ge=0,le=10000)
    consent_received:bool=False
    consent_reference:str=Field(default='',max_length=200)
    privacy_reviewed:bool=False

    @field_validator('display_name','body','photo_alt','consent_reference')
    @classmethod
    def plain_text(cls,value,info):
        value=value.strip()
        if info.field_name in {'display_name','body'} and len(value)<2:raise ValueError('نام نمایشی و متن را کامل کنید')
        if any(ord(c)<32 and c not in '\n\t' for c in value):raise ValueError('نویسه کنترلی مجاز نیست')
        return value


class CommentWrite(BaseModel):
    model_config=ConfigDict(extra='forbid')
    revision:int=Field(ge=0)
    content:CommentContent


def get_row(db,comment_id,revision=None):
    row=db.get(Comment,comment_id)
    if not row or row.deleted:raise HTTPException(404,'نظر پیدا نشد')
    if revision is not None and row.revision!=revision:raise HTTPException(409,'نسخه نظر تغییر کرده؛ نسخه تازه را بخوانید')
    return row


def validate(db,content,staff,previous=None):
    data=content.model_dump()
    if data['service_id']:
        service=db.get(Service,data['service_id'])
        if not service or not service.is_active:raise HTTPException(422,'خدمت فعال را انتخاب کنید')
    key=data['photo_key']
    if key:
        image=db.get(PublicMedia,key)
        if not image or image.deleted:raise HTTPException(422,'تصویر باید از کتابخانه رسانه عمومی فعال باشد')
        if key!=(previous or {}).get('photo_key') and not can(staff,'media.manage'):raise HTTPException(403,'انتخاب تصویر تازه به دسترسی رسانه نیاز دارد')
    return data


def public_content(db,data):
    service=db.get(Service,data['service_id']) if data['service_id'] else None
    return {k:data.get(k) for k in ['display_name','body','age','photo_key','photo_alt','service_id','sort_order']}|{'service_title':service.title if service and service.is_active else ''}


def read(row):
    content=json.loads(row.content_json)
    public=json.loads(row.published_json) if row.published_json else None
    return dict(id=row.id,revision=row.revision,content={'age':None,**content},published=bool(public),unpublished_changes=bool(public and any(public.get(k)!=content.get(k) for k in ['display_name','body','age','photo_key','photo_alt','service_id','sort_order'])))


def public_rows(db):
    result=[]
    for row in db.scalars(select(Comment).where(Comment.deleted.is_(False),Comment.published_json.is_not(None))):
        current=json.loads(row.content_json)
        if not current['consent_received'] or not current['privacy_reviewed'] or not current['consent_reference'].strip():continue
        data=json.loads(row.published_json)
        data.setdefault('age',None)
        if data['service_id']:
            service=db.get(Service,data['service_id'])
            if not service or not service.is_active:continue
            data['service_title']=service.title
        result.append(dict(id=row.id,**data))
    return sorted(result,key=lambda r:(r['sort_order'],r['id']))


def approve(data):
    if not data['consent_received'] or not data['consent_reference'].strip() or not data['privacy_reviewed']:raise HTTPException(422,'رضایت انتشار و بازبینی حریم خصوصی را ثبت کنید')
    if data['photo_key'] and not data['photo_alt'].strip():raise HTTPException(422,'توضیح تصویر لازم است')


def home_html(db):
    rows=public_rows(db);esc=html.escape
    body='<section id="comments" dir="rtl"><h2>نظرات مراجعین</h2>'
    if not rows:body+='<p>هنوز نظری برای نمایش منتشر نشده است.</p>'
    for data in rows[:12]:
        body+='<figure>'
        if data['photo_key']:body+=f'<img src="/media/{data["photo_key"]}.webp" alt="{esc(data["photo_alt"])}" width="96" height="96" loading="lazy">'
        body+=f'<blockquote>{esc(data["body"])}</blockquote><figcaption>{esc(data["display_name"])}'
        if data.get('age') is not None:body+=f' · {data["age"]} ساله'
        if data['service_title']:body+=' · '+esc(data['service_title'])
        body+='</figcaption></figure>'
    return body+'</section>',dict(items=rows[:12],total=len(rows),page=1)
