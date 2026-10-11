"""Audit regressions: limited-role phone searches and bounded publication checks."""
import json
from sqlalchemy import select

from app import content, comments
from app.content_models import SiteService
from app.comment_models import Comment
from app.database import SessionLocal
from app.models import Patient
from test_content import client, isolated  # noqa: F401
from test_roles import account, headers, owner


def test_patient_search_normalizes_phone_without_medical_record_access(client):
    with SessionLocal.begin() as db:
        db.add(Patient(phone="+989123456789", first_name="آزمایشی", last_name="محلی"))
    access = headers(account(["patients.view"])[2])
    response = client.get("/api/v1/staff/patients", params={"search": "۰۹۱۲ ۳۴۵ ۶۷۸۹"}, headers=access)
    assert response.status_code == 200
    assert response.json()["total"] == 1
    assert response.json()["items"][0].get("national_id") is None


def test_patient_search_treats_wildcards_as_literal_text(client):
    with SessionLocal.begin() as db:
        db.add(Patient(phone="+989123456789", first_name="آزمایشی", last_name="محلی"))
    access = headers(account(["patients.view"])[2])
    response = client.get("/api/v1/staff/patients", params={"search": "%"}, headers=access)
    assert response.status_code == 200 and response.json()["total"] == 0
    assert client.get("/api/v1/staff/patients", params={"search": "x" * 121}, headers=access).status_code == 422


def test_service_media_lookup_only_parses_relevant_public_snapshots(client, monkeypatch):
    key = "a" * 32
    with SessionLocal.begin() as db:
        for i in range(30):
            data = dict(hero_key=key if i == 29 else None, description_html="<p>متن آزمایشی</p>")
            snapshot = json.dumps(data)
            db.add(SiteService(slug=f"audit-service-{i}", content_json=snapshot, published_json=snapshot))
    parsed = []
    original = content.media_keys
    def observe(snapshot):
        parsed.append(snapshot)
        return original(snapshot)
    monkeypatch.setattr(content, "media_keys", observe)
    with SessionLocal() as db:
        assert content.is_public_media(db, key)
    assert len(parsed) == 1, "Unrelated service bodies must not be parsed for every photo request"


def test_key_in_comment_text_does_not_publish_a_photo_or_load_all_comments(client, monkeypatch):
    key = "b" * 32
    actor = owner()[0]
    with SessionLocal.begin() as db:
        for i in range(25):
            data = dict(photo_key=None, body=key if i == 24 else "متن ساختگی", display_name="آزمایشی", consent_received=True, privacy_reviewed=True, consent_reference="synthetic-only", service_id=None, sort_order=i, service_title="")
            snapshot = json.dumps(data)
            db.add(Comment(actor_id=actor, content_json=snapshot, published_json=snapshot))
    def reject_full_list(_db):
        raise AssertionError("Publication checks must not load the complete comment collection")
    monkeypatch.setattr(comments, "public_rows", reject_full_list)
    with SessionLocal() as db:
        assert not content.is_public_media(db, key)


def test_comment_photo_requires_current_consent_and_active_service(client):
    from app.models import Service
    key = "c" * 32
    actor = owner()[0]
    with SessionLocal.begin() as db:
        service = db.scalars(select(Service)).first()
        service_id = service.id
        data = dict(photo_key=key, body="متن ساختگی", display_name="آزمایشی", consent_received=True, privacy_reviewed=True, consent_reference="synthetic-only", service_id=service_id, sort_order=0, service_title="")
        snapshot = json.dumps(data)
        row = Comment(actor_id=actor, content_json=snapshot, published_json=snapshot)
        db.add(row)
        db.flush()
        row_id = row.id
    with SessionLocal() as db:
        assert content.is_public_media(db, key)
    with SessionLocal.begin() as db:
        db.get(Service, service_id).is_active = False
    with SessionLocal() as db:
        assert not content.is_public_media(db, key)
    with SessionLocal.begin() as db:
        db.get(Service, service_id).is_active = True
        data['consent_received'] = False
        db.get(Comment, row_id).content_json = json.dumps(data)
    with SessionLocal() as db:
        assert not content.is_public_media(db, key)


def test_public_article_errors_offer_html_without_changing_api_errors(client):
    from app.content_models import Article
    actor = owner()[0]
    with SessionLocal.begin() as db:
        db.add(Article(slug='audit-private-draft', author_id=actor, content_json='{}'))
    for url, status in [('/articles/audit-private-draft/', 404), ('/articles/audit-retired-url/', 410), ('/articles/category/audit-missing/', 404), ('/articles/?page=bad', 422)]:
        response = client.get(url)
        assert response.status_code == status
        assert response.headers['content-type'].startswith('text/html')
        assert response.headers['x-robots-tag'].startswith('noindex')
        assert 'href="/articles/"' in response.text and 'href="/"' in response.text
        assert 'audit-private-draft' not in response.text
    response = client.get('/api/v1/articles/audit-private-draft')
    assert response.status_code == 404 and response.headers['content-type'].startswith('application/json')
    assert 'detail' in response.json()


def test_filtered_empty_articles_explain_search_result(client):
    response = client.get('/articles/', params={'q': 'عبارت آزمایشی ناموجود'})
    assert response.status_code == 200
    assert 'برای این جست‌وجو نتیجه‌ای پیدا نشد' in response.text
    assert 'هنوز مقاله‌ای منتشر نشده است' not in response.text



def test_article_pages_materialize_published_collection_only_once(client, monkeypatch):
    from app import article_layout, public_articles
    from test_content import create, transition
    access, row = create(client)
    assert transition(client, access, row, 'publish').status_code == 200
    calls = []
    original = content.public_rows
    def observe(db, **options):
        calls.append(1)
        return original(db, **options)
    monkeypatch.setattr(public_articles, 'public_rows', observe)
    monkeypatch.setattr(article_layout, 'public_rows', observe)
    for path in ['/articles/', '/articles/test-article/']:
        calls.clear()
        response = client.get(path)
        assert response.status_code == 200
        assert row['content']['title'] in response.text
        assert len(calls) == 1, 'Index/detail must not reload the published article collection for layout/related content'


def test_comment_service_queries_are_bounded_and_current_state_remains_authoritative(client):
    from sqlalchemy import event
    from app.database import get_engine
    from app.models import Service
    actor=owner()[0]
    with SessionLocal.begin() as db:
        ids=list(db.scalars(select(Service.id)))
        for i in range(100):
            data=dict(photo_key=None,body='Synthetic only',display_name=f'Fixture {i}',consent_received=True,privacy_reviewed=True,consent_reference='fixture',service_id=ids[i%len(ids)],sort_order=i,service_title='old title')
            snapshot=json.dumps(data)
            db.add(Comment(actor_id=actor,content_json=snapshot,published_json=snapshot))
    statements=[]
    def observe(_c,_cursor,statement,_params,_ctx,_many):
        statements.append(statement.lower())
    event.listen(get_engine(),'before_cursor_execute',observe)
    try:
        response=client.get('/api/v1/comments')
        assert response.status_code==200 and response.json()['total']==100
        assert len(response.json()['items'])==12
        assert len([s for s in statements if 'from services' in s])==1
    finally:
        event.remove(get_engine(),'before_cursor_execute',observe)
    with SessionLocal.begin() as db:
        for item in db.scalars(select(Service)):
            item.is_active=False
    assert client.get('/api/v1/comments').json()['total']==0


def test_article_metadata_omits_bodies_but_unicode_body_search_and_detail_are_preserved(client):
    from test_content import create, transition
    access,row=create(client,body_html='<h2>Fixture</h2><p>Straße unique-body-token</p>')
    assert transition(client,access,row,'publish').status_code==200
    with SessionLocal() as db:
        rows=content.public_rows(db,metadata=True)
        assert len(rows)==1
        assert 'body_html' not in json.loads(rows[0].published_json)
        assert 'sources' not in json.loads(rows[0].published_json)
        assert not hasattr(rows[0],'content_json')
    response=client.get('/api/v1/articles',params={'q':'STRASSE'})
    assert response.status_code==200 and response.json()['total']==1
    assert 'body_html' not in response.json()['items'][0]['content']
    assert 'unique-body-token' in client.get('/articles/test-article/').text
