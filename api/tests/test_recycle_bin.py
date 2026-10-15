"""Reversible removal preserves appointments, permissions and draft/public boundaries."""
from datetime import date,time,timedelta
from app.database import SessionLocal
from app.models import Appointment,Patient,Service
from app.content_models import Article,PublicMedia
from test_content import isolated,client,create,upload,transition
from test_roles import account,headers,owner


def test_image_and_article_recycle_never_republishes(client):
    access,media=upload(client)
    key=media['key']
    _,article=create(client,access,cover_key=key,cover_alt='تصویر ساختگی آزمون')
    article=transition(client,access,article).json()
    assert client.delete(f'/api/v1/staff/media/{key}',headers=access).status_code==409
    assert client.request('DELETE',f'/api/v1/staff/articles/{article["id"]}',headers=access,json={'revision':article['revision']}).status_code==200
    deleted=client.get('/api/v1/staff/articles?deleted=true',headers=access).json()['items'][0]
    assert deleted['id']==article['id'] and deleted['deleted']
    assert client.get('/api/v1/staff/articles',headers=access).json()['total']==0
    assert client.get('/api/v1/articles/test-article').status_code==404
    assert client.delete(f'/api/v1/staff/media/{key}',headers=access).status_code==200
    assert client.get('/api/v1/staff/media',headers=access).json()['total']==0
    assert client.get('/api/v1/staff/media?deleted=true',headers=access).json()['items'][0]['deleted']
    url=f'/api/v1/staff/articles/{article["id"]}/unarchive'
    payload={'revision':deleted['revision']}
    assert client.post(url,headers=access,json=payload).status_code==422
    assert client.post(f'/api/v1/staff/media/{key}/unarchive',headers=access).status_code==200
    assert client.post(url,headers=access,json={'revision':0}).status_code==422
    assert client.post(url,headers=access,json={'revision':article['revision']}).status_code==409
    restored=client.post(url,headers=access,json=payload)
    assert restored.status_code==200,restored.text
    assert restored.json()['status']=='draft' and not restored.json()['has_publication']
    assert client.get('/api/v1/articles/test-article').status_code==404
    assert client.get(f'/media/{key}.webp').status_code==404
    with SessionLocal() as db:
        row=db.get(Article,article['id'])
        assert row.scheduled_json is None and row.published_json is None and not row.deleted
        assert not db.get(PublicMedia,key).deleted


def test_recycle_permissions_and_missing_file(client):
    access,media=upload(client)
    _,row=create(client,access)
    assert client.request('DELETE',f'/api/v1/staff/articles/{row["id"]}',headers=access,json={'revision':row['revision']}).status_code==200
    deleted=client.get('/api/v1/staff/articles?deleted=true',headers=access).json()['items'][0]
    read=headers(account(['articles.view'])[2])
    assert client.post(f'/api/v1/staff/articles/{row["id"]}/unarchive',headers=read,json={'revision':deleted['revision']}).status_code==403
    key=media['key']
    assert client.delete(f'/api/v1/staff/media/{key}',headers=access).status_code==200
    other=headers(account(['media.manage'])[2])
    assert client.post(f'/api/v1/staff/media/{key}/unarchive',headers=other).status_code==403
    from app.routers.content import media_path
    path=media_path(key);path.unlink()
    assert client.post(f'/api/v1/staff/media/{key}/unarchive',headers=access).status_code==404
    with SessionLocal() as db:assert db.get(PublicMedia,key).deleted


def test_service_archive_preserves_history_and_settings(client):
    access=headers(owner()[2])
    with SessionLocal.begin() as db:
        item=Service(title='خدمت ساختگی برای بایگانی',description='Synthetic only',duration_minutes=27,price_toman=123,pre_visit_instructions='preserve exact instructions',is_active=True)
        patient=Patient(phone='00000000077',first_name='Synthetic',last_name='Recycle')
        db.add_all([item,patient]);db.flush()
        booking=Appointment(tracking_code='SYNTHETIC_RECYCLE_191',patient_id=patient.id,service_id=item.id,appointment_date=date.today()+timedelta(days=2),start_time=time(16),end_time=time(16,27),status='confirmed')
        db.add(booking);db.flush();service_id=item.id;appointment_id=booking.id
    read=headers(account(['services.view'])[2])
    assert client.delete(f'/api/v1/staff/services/{service_id}',headers=read).status_code==403
    assert client.delete(f'/api/v1/staff/services/{service_id}',headers=access).status_code==200
    assert service_id not in {row['id'] for row in client.get('/api/v1/services').json()}
    with SessionLocal() as db:
        item=db.get(Service,service_id);booking=db.get(Appointment,appointment_id)
        assert not item.is_active and item.duration_minutes==27 and item.price_toman==123
        assert item.pre_visit_instructions=='preserve exact instructions'
        assert booking.service_id==service_id and booking.status=='confirmed'
    assert client.post(f'/api/v1/staff/services/{service_id}/restore',headers=read).status_code==403
    assert client.post(f'/api/v1/staff/services/{service_id}/restore',headers=access).status_code==200
    assert service_id in {row['id'] for row in client.get('/api/v1/services').json()}
