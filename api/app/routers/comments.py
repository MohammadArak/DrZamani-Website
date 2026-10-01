import json
from typing import Literal
from fastapi import APIRouter,Depends,Query
from pydantic import BaseModel,ConfigDict,Field
from sqlalchemy import select,func
from sqlalchemy.orm import Session
from .. import comments as c
from ..comment_models import Comment
from ..content import lock
from ..database import get_db
from ..dependencies import require_permission
from ..models import StaffUser,utcnow
from ..activity import record_audit

router=APIRouter(tags=['consented testimonials'])
staff_router=APIRouter(prefix='/staff/comments',tags=['testimonials management'])


def audit(db,row,staff,action):
    record_audit(db,action='comment.'+action,entity_type='comment',entity_id=row.id,summary='تغییر نظر با مجوز مستقل',actor_staff_id=staff.id)


@router.get('/comments')
def public_list(page:int=Query(1,ge=1,le=10000),db:Session=Depends(get_db)):
    rows=c.public_rows(db);return dict(items=rows[(page-1)*12:page*12],total=len(rows),page=page)


@staff_router.get('')
def staff_list(page:int=Query(1,ge=1,le=10000),db:Session=Depends(get_db),staff=Depends(require_permission('comments.view'))):
    total=db.scalar(select(func.count(Comment.id)).where(Comment.deleted.is_(False)))
    rows=db.scalars(select(Comment).where(Comment.deleted.is_(False)).order_by(Comment.updated_at.desc(),Comment.id.desc()).offset((page-1)*30).limit(30))
    return dict(items=[c.read(r) for r in rows],total=total,page=page)


@staff_router.get('/{comment_id}')
def get(comment_id:int,db:Session=Depends(get_db),staff=Depends(require_permission('comments.view'))):return c.read(c.get_row(db,comment_id))


@staff_router.post('',status_code=201)
def create(payload:c.CommentWrite,db:Session=Depends(get_db),staff=Depends(require_permission('comments.create'))):
    lock(db,staff,'comments.create');data=c.validate(db,payload.content,db.get(StaffUser,staff.id))
    row=Comment(content_json=json.dumps(data,ensure_ascii=False),actor_id=staff.id);db.add(row);db.flush();audit(db,row,staff,'create');db.commit();return c.read(row)


@staff_router.put('/{comment_id}')
def edit(comment_id:int,payload:c.CommentWrite,db:Session=Depends(get_db),staff=Depends(require_permission('comments.edit'))):
    lock(db,staff,'comments.edit');row=c.get_row(db,comment_id,payload.revision);data=c.validate(db,payload.content,db.get(StaffUser,staff.id),json.loads(row.content_json))
    row.content_json=json.dumps(data,ensure_ascii=False);row.revision+=1;row.updated_at=utcnow()
    # Revoking consent or privacy review withdraws publication immediately, including for writers.
    if not data['consent_received'] or not data['privacy_reviewed'] or not data['consent_reference'].strip():
        if row.published_json:row.public_updated_at=utcnow()
        row.published_json=None
    audit(db,row,staff,'edit');db.commit();return c.read(row)


class Transition(BaseModel):
    model_config=ConfigDict(extra='forbid')
    revision:int=Field(ge=1)
    action:Literal['publish','unpublish']


@staff_router.post('/{comment_id}/transition')
def transition(comment_id:int,payload:Transition,db:Session=Depends(get_db),staff=Depends(require_permission('comments.publish'))):
    lock(db,staff,'comments.publish');row=c.get_row(db,comment_id,payload.revision)
    if payload.action=='publish':
        data=c.validate(db,c.CommentContent.model_validate_json(row.content_json),db.get(StaffUser,staff.id),json.loads(row.content_json));c.approve(data)
        row.published_json=json.dumps(c.public_content(db,data),ensure_ascii=False);row.published_at=utcnow()
    else:row.published_json=None
    row.revision+=1;row.updated_at=utcnow();row.public_updated_at=utcnow();audit(db,row,staff,payload.action);db.commit();return c.read(row)


class Revision(BaseModel):
    model_config=ConfigDict(extra='forbid')
    revision:int=Field(ge=1)


@staff_router.delete('/{comment_id}')
def archive(comment_id:int,payload:Revision,db:Session=Depends(get_db),staff=Depends(require_permission('comments.delete'))):
    lock(db,staff,'comments.delete');row=c.get_row(db,comment_id,payload.revision)
    if row.published_json:row.public_updated_at=utcnow()
    row.deleted=True;row.published_json=None;row.revision+=1;row.updated_at=utcnow()
    audit(db,row,staff,'archive');db.commit();return {'message':'نظر بایگانی شد'}
