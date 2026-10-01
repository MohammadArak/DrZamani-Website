"""Synthetic consent/publication boundaries without any patient records or real testimonial."""
import json
from concurrent.futures import ThreadPoolExecutor
from dataclasses import replace
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from app import config
from app.database import Base,SessionLocal,get_engine
from app.main import app
from app.models import AuditLog,Service,StaffUser
from app.comment_models import Comment
from test_roles import account,owner,headers
from test_content import upload

@pytest.fixture(autouse=True)
def isolated(monkeypatch,tmp_path):
    Base.metadata.drop_all(get_engine());Base.metadata.create_all(get_engine())
    template=tmp_path/'html';template.mkdir();(template/'index.html').write_text('<html><head><script type="module" src="/assets/test.js"></script></head></html>')
    original=config.get_settings();monkeypatch.setattr(config,'get_settings',lambda:replace(original,public_html_dir=template,public_media_dir=tmp_path/'editorial',upload_dir=tmp_path/'private'))
    yield
    Base.metadata.drop_all(get_engine());Base.metadata.create_all(get_engine())

@pytest.fixture
def client():
    with TestClient(app) as value:yield value

def content(**changes):return dict(display_name='نام نمایشی ساختگی',body='این متن فقط آزمون نرم‌افزار است.',photo_key=None,photo_alt='',service_id=None,sort_order=0,consent_received=True,consent_reference='private-synthetic-consent-ref',privacy_reviewed=True,**changes)

def create(client,access=None,**changes):
    access=access or headers(owner()[2]);data=content();data.update(changes)
    response=client.post('/api/v1/staff/comments',headers=access,json={'revision':0,'content':data});assert response.status_code==201,response.text
    return access,response.json()

def transition(client,access,row,action='publish'):
    return client.post(f'/api/v1/staff/comments/{row["id"]}/transition',headers=access,json={'revision':row['revision'],'action':action})

def edit(client,access,row,**changes):
    return client.put(f'/api/v1/staff/comments/{row["id"]}',headers=access,json={'revision':row['revision'],'content':dict(row['content'],**changes)})

def test_empty_no_legacy_quotes_and_public_has_no_private_consent(client):
    assert client.get('/api/v1/comments').json()=={'items':[],'total':0,'page':1}
    assert 'پرستو' not in client.get('/').text
    access,row=create(client,age=29)
    assert client.get('/api/v1/comments').json()['total']==0
    assert transition(client,access,row).status_code==200
    public=client.get('/api/v1/comments');assert public.json()['items'][0]['body']==row['content']['body']
    assert public.json()['items'][0]['age']==29
    assert 'consent' not in public.text and 'private-synthetic' not in public.text
    home=client.get('/').text;assert row['content']['body'] in home and 'private-synthetic' not in home
    assert 'AggregateRating' not in home and 'reviewRating' not in home

@pytest.mark.parametrize('change',[{'consent_received':False},{'privacy_reviewed':False},{'consent_reference':''}])
def test_publish_requires_consent_reference_and_privacy_review(client,change):
    access,row=create(client,**change);assert transition(client,access,row).status_code==422
    assert client.get('/api/v1/comments').json()['total']==0

def test_article_permissions_do_not_grant_comments(client):
    access=headers(account(['articles.view','articles.create','articles.edit','articles.publish'])[2])
    assert client.get('/api/v1/staff/comments',headers=access).status_code==403
    assert client.post('/api/v1/staff/comments',headers=access,json={'revision':0,'content':content()}).status_code==403
    assert client.get('/api/v1/staff/comments').status_code==401

def test_writer_cannot_publish_and_independent_publisher_can(client):
    writer=headers(account(['comments.view','comments.create','comments.edit'])[2]);_,row=create(client,writer)
    assert transition(client,writer,row).status_code==403
    publisher=headers(account(['comments.view','comments.publish'])[2])
    assert edit(client,publisher,row,body='attempt').status_code==403
    assert transition(client,publisher,row).status_code==200
    readonly=headers(account(['comments.view'])[2])
    assert transition(client,readonly,row).status_code==403
    assert client.request('DELETE',f'/api/v1/staff/comments/{row["id"]}',headers=readonly,json={'revision':row['revision']}).status_code==403

def test_private_draft_never_overwrites_public_and_revocation_withdraws(client):
    access,row=create(client);row=transition(client,access,row).json()
    row=edit(client,access,row,body='پیش‌نویس تازه ساختگی').json()
    assert row['unpublished_changes'] and client.get('/api/v1/comments').json()['items'][0]['body']!='پیش‌نویس تازه ساختگی'
    writer=headers(account(['comments.view','comments.edit'])[2]);row=edit(client,writer,row,consent_received=False).json()
    assert not row['published'] and client.get('/api/v1/comments').json()['total']==0
    assert transition(client,access,row).status_code==422

def test_text_is_escaped_in_initial_html_and_bootstrap(client):
    access,row=create(client,body='<script>alert(1)</script> متن ساختگی',display_name='</script><img src=x onerror=alert(1)>')
    assert transition(client,access,row).status_code==200
    page=client.get('/').text;assert '&lt;script&gt;alert(1)&lt;/script&gt;' in page
    assert '<script>alert(1)</script>' not in page and '\\u003c/script' in page

def test_public_order_pagination_and_disable(client):
    access=headers(owner()[2]);rows=[]
    for i in range(13):
        _,row=create(client,access,sort_order=13-i);row=transition(client,access,row).json();rows.append(row)
    first=client.get('/api/v1/comments').json();second=client.get('/api/v1/comments?page=2').json()
    assert first['total']==13 and len(first['items'])==12 and len(second['items'])==1
    assert first['items'][0]['id']==rows[-1]['id'] and second['items'][0]['id']==rows[0]['id']
    assert transition(client,access,rows[-1],'unpublish').status_code==200
    assert client.get('/api/v1/comments').json()['total']==12
    assert client.get('/api/v1/comments?page=10001').status_code==422

def test_service_visibility_and_missing_service(client):
    with SessionLocal() as db:service_id=db.scalar(select(Service.id))
    access,row=create(client,service_id=service_id);row=transition(client,access,row).json()
    assert client.get('/api/v1/comments').json()['items'][0]['service_title']
    with SessionLocal.begin() as db:db.get(Service,service_id).is_active=False
    assert client.get('/api/v1/comments').json()['total']==0
    assert transition(client,access,row).status_code==422
    assert edit(client,access,row,service_id=999999).status_code==422

def test_public_media_only_during_consented_publication_and_reference_guard(client):
    access=headers(owner()[2]);_,media=upload(client,access)
    _,row=create(client,access,photo_key=media['key'],photo_alt='تصویر ساختگی');path='/media/'+media['key']+'.webp'
    assert client.get(path).status_code==404
    assert client.delete('/api/v1/staff/media/'+media['key'],headers=access).status_code==409
    row=transition(client,access,row).json();assert client.get(path).status_code==200
    row=edit(client,access,row,privacy_reviewed=False).json();assert client.get(path).status_code==404
    assert client.request('DELETE',f'/api/v1/staff/comments/{row["id"]}',headers=access,json={'revision':row['revision']}).status_code==200
    assert client.delete('/api/v1/staff/media/'+media['key'],headers=access).status_code==200

def test_photo_assignment_requires_media_permission_and_alt(client):
    full=headers(owner()[2]);_,media=upload(client,full)
    writer=headers(account(['comments.view','comments.create','comments.edit'])[2])
    response=client.post('/api/v1/staff/comments',headers=writer,json={'revision':0,'content':dict(content(),photo_key=media['key'])});assert response.status_code==403
    _,row=create(client,full,photo_key=media['key']);assert transition(client,full,row).status_code==422
    assert edit(client,full,row,photo_key='f'*32).status_code==422

def test_concurrent_updates_revocation_and_archive_are_revision_guarded(client):
    access,row=create(client)
    def save(_):return edit(client,access,row,sort_order=4).status_code
    with ThreadPoolExecutor(max_workers=2) as pool:assert sorted(pool.map(save,range(2)))==[200,409]
    assert transition(client,access,row).status_code==409
    assert client.request('DELETE',f'/api/v1/staff/comments/{row["id"]}',headers=access,json={'revision':row['revision']}).status_code==409
    fresh=client.get(f'/api/v1/staff/comments/{row["id"]}',headers=access).json()
    assert client.request('DELETE',f'/api/v1/staff/comments/{row["id"]}',headers=access,json={'revision':fresh['revision']}).status_code==200
    assert client.get(f'/api/v1/staff/comments/{row["id"]}',headers=access).status_code==404
    with SessionLocal() as db:
        assert db.get(Comment,row['id']).deleted
        logs=list(db.scalars(select(AuditLog).where(AuditLog.entity_type=='comment')))
        assert {'comment.create','comment.edit','comment.archive'} <= {l.action for l in logs}
        assert all('private-synthetic' not in (l.summary or '') for l in logs)

@pytest.mark.parametrize('changes',[{'display_name':'  '},{'body':'  '},{'age':0},{'age':131},{'sort_order':-1},{'body':'x'*2001},{'consent_reference':'x'*201},{'photo_key':'../private'},{'patient_id':1}])
def test_bounds_and_no_patient_model_link(client,changes):
    access=headers(owner()[2]);response=client.post('/api/v1/staff/comments',headers=access,json={'revision':0,'content':dict(content(),**changes)})
    assert response.status_code==422

def test_permissions_rechecked_after_role_revocation(client):
    staff_id,_,token=account(['comments.view','comments.create','comments.edit','comments.publish']);access=headers(token);_,row=create(client,access)
    with SessionLocal.begin() as db:db.get(StaffUser,staff_id).is_active=False
    assert transition(client,access,row).status_code==401
    assert client.get('/api/v1/comments').json()['total']==0
