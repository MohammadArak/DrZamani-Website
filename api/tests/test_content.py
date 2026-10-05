"""Editorial authorization, snapshot isolation, HTML5 sanitization and public media boundaries."""
import json
from concurrent.futures import ThreadPoolExecutor
from dataclasses import replace
from datetime import timedelta
from io import BytesIO
from urllib.parse import quote
import pytest
from PIL import Image
from fastapi.testclient import TestClient
from sqlalchemy import select
from app import config,content
from app.database import Base,SessionLocal,get_engine
from app.main import app
from app.models import utcnow
from app.content_models import Article,PublicMedia
from test_roles import account,owner,headers


@pytest.fixture(autouse=True)
def isolated(monkeypatch,tmp_path):
    Base.metadata.drop_all(get_engine());Base.metadata.create_all(get_engine())
    template=tmp_path/'html';template.mkdir();(template/'index.html').write_text('<html><head><script type="module" src="/assets/test.js"></script><link rel="stylesheet" href="/assets/test.css"></head></html>')
    original=config.get_settings()
    monkeypatch.setattr(config,'get_settings',lambda:replace(original,public_html_dir=template,public_media_dir=tmp_path/'editorial',upload_dir=tmp_path/'private'))
    yield
    Base.metadata.drop_all(get_engine());Base.metadata.create_all(get_engine())


@pytest.fixture
def client():
    with TestClient(app) as value:yield value


def draft(slug='test-article'):
    return dict(title='مقاله آزمایشی بررسی کیفیت نگارش',slug=slug,summary='خلاصه آموزشی ساختگی برای آزمون نرم‌افزار؛ این متن توصیه پزشکی نیست.',body_html='<h2>تیتر آزمایشی</h2><p>این متن فقط برای آزمون سامانه نوشته شده است.</p><a href="/articles/">مقالات</a>',author_name='نویسنده آزمایشی',reviewer='بازبین آزمایشی',sources=[dict(title='منبع آزمایشی',url='https://example.org/reference')],categories=['آموزش'],tags=['آزمایشی'])


def create(client,access=None,**updates):
    access=access or headers(owner()[2]);data=draft();data.update(updates)
    response=client.post('/api/v1/staff/articles',headers=access,json=dict(revision=0,content=data))
    assert response.status_code==201,response.text
    return access,response.json()


def transition(client,access,row,action='publish',**kw):
    return client.post(f'/api/v1/staff/articles/{row["id"]}/transition',headers=access,json=dict(revision=row['revision'],action=action,**kw))


def png():
    output=BytesIO();Image.new('RGB',(40,60),'teal').save(output,format='PNG');return output.getvalue()


def upload(client,access=None):
    access=access or headers(owner()[2]);response=client.post('/api/v1/staff/media',headers=access,data={'alt':'تصویر ساختگی'},files={'file':('picture.png',png(),'image/png')})
    assert response.status_code==201,response.text
    return access,response.json()


def test_catalog_activated_without_legacy_elevation(client):
    from app.access import CATALOG
    assert all(not future for code,_,_,_,future in CATALOG if code.startswith('articles.') or code=='media.manage')
    assert client.get('/api/v1/staff/articles',headers=headers(account(builtin='author')[2])).status_code==200
    assert client.get('/api/v1/staff/articles').status_code==401


@pytest.mark.parametrize('action',['publish','schedule','unpublish','cancel_schedule'])
def test_writer_cannot_publish_even_direct_api(client,action):
    access=headers(account(builtin='author')[2]);_,row=create(client,access)
    assert transition(client,access,row,action,scheduled_at=(utcnow()+timedelta(days=1)).isoformat()+'Z').status_code==403
    response=client.put(f'/api/v1/staff/articles/{row["id"]}',headers=access,json=dict(revision=row['revision'],content=row['content'],status='published'))
    assert response.status_code==422
    assert client.get('/api/v1/articles').json()['total']==0


def test_drafts_not_public_api_html_sitemap(client):
    access,row=create(client)
    assert client.get('/api/v1/articles/test-article').status_code==404
    assert client.get('/articles/test-article/').status_code==404
    assert 'test-article' not in client.get('/sitemap.xml').text
    assert client.get('/articles/').status_code==200
    assert 'هنوز مقاله‌ای' in client.get('/articles/').text
    assert client.get('/articles/ancient-unreviewed/').status_code==410


@pytest.mark.parametrize('attack',[
    '<script>alert(1)</script><p onclick="alert(1)">سلام</p>',
    '<img src="/media/'+('a'*32)+'.webp" onerror="alert(1)" alt="تصویر">',
    '<a href="java&#x73;cript:alert(1)">لینک</a>',
    '<a href="jav\tascript:alert(1)">لینک</a>',
    '<a href="%6aavascript:alert(1)">لینک</a>',
    '<svg><a xlink:href="javascript:alert(1)">x</a></svg>',
    '<math><mtext><table><mglyph><style><!--</style><img title="--><img src=x onerror=alert(1)>">',
    '<iframe src="https://evil.example"></iframe><object data="x"></object>',
    '<form><button formaction="javascript:alert(1)">x</button></form>',
    '<p style="background:url(https://evil.example)">x</p>',
    '<img src="//evil.example/tracker"><img src="data:image/svg+xml,x">',
])
def test_html5_sanitization(attack):
    cleaned=content.sanitize(attack)
    assert content.sanitize(cleaned)==cleaned
    parser=content.Outline();parser.feed(cleaned)
    assert '<script' not in cleaned and '<iframe' not in cleaned and '<svg' not in cleaned and '<form' not in cleaned
    assert 'onerror=' not in cleaned and 'onclick=' not in cleaned and 'style=' not in cleaned and 'formaction=' not in cleaned
    assert all(content.safe_url(v) for v in parser.links if v)
    assert all(not i.get('src') or content.MEDIA_RE.fullmatch(i['src']) for i in parser.images)


def test_live_publication_and_seo_html(client):
    access,row=create(client);response=transition(client,access,row);assert response.status_code==200,response.text
    page=client.get('/articles/test-article/');assert page.status_code==200
    assert 'تیتر آزمایشی' in page.text and 'نویسنده آزمایشی' in page.text and 'بازبین آزمایشی' in page.text
    assert 'data-shell="island"' in page.text and 'id="site-header"' in page.text and 'id="site-footer"' in page.text and 'BreadcrumbList' in page.text and 'datePublished' in page.text
    assert 'rel="canonical"' in page.text and 'og:type" content="article"' in page.text
    assert '/articles/test-article/' in client.get('/sitemap.xml').text
    assert '/articles/category/' in client.get('/sitemap.xml').text
    assert client.get('/api/v1/articles?category='+quote('آموزش')).json()['total']==1
    assert client.get('/api/v1/articles?q=ناموجود').json()['total']==0
    assert 'noindex' in client.get('/articles/?q=آزمایشی').text
    assert client.get('/articles/category/ناموجود/').status_code==404
    assert client.get('/articles/?page=999').status_code==404
    assert page.headers['cache-control']=='no-store'


def test_edit_and_restore_never_change_public_snapshot(client):
    access,row=create(client);published=transition(client,access,row).json()
    changed=dict(published['content'],title='عنوان تغییر یافته پیش‌نویس')
    response=client.put(f'/api/v1/staff/articles/{row["id"]}',headers=access,json=dict(revision=published['revision'],content=changed));assert response.status_code==200
    assert response.json()['unpublished_changes']
    assert client.get('/api/v1/articles/test-article').json()['content']['title']==row['content']['title']
    history=client.get(f'/api/v1/staff/articles/{row["id"]}/revisions',headers=access).json()
    restore=client.post(f'/api/v1/staff/articles/{row["id"]}/restore/{history[-1]["id"]}',headers=access,json={'revision':response.json()['revision']})
    assert restore.status_code==200 and restore.json()['content']['title']==row['content']['title']
    assert client.get('/api/v1/articles/test-article').json()['content']['title']==row['content']['title']


def test_schedule_uses_approved_frozen_snapshot_after_writer_edits(client):
    access,row=create(client);scheduled=transition(client,access,row,'schedule',scheduled_at=(utcnow()+timedelta(days=1)).isoformat()+'Z').json()
    writer=headers(account(builtin='author')[2]);changed=dict(row['content'],title='ویرایش تأیید نشده')
    updated=client.put(f'/api/v1/staff/articles/{row["id"]}',headers=writer,json=dict(revision=scheduled['revision'],content=changed));assert updated.status_code==200
    with SessionLocal.begin() as db:db.get(Article,row['id']).scheduled_at=utcnow()-timedelta(seconds=1)
    def run():
        with SessionLocal() as db:return content.publish_due(db)
    with ThreadPoolExecutor(max_workers=2) as pool:results=list(pool.map(lambda _:run(),range(2)))
    assert sum(results)==1
    assert client.get('/api/v1/articles/test-article').json()['content']['title']==row['content']['title']
    current=client.get(f'/api/v1/staff/articles/{row["id"]}',headers=access).json()
    assert current['content']['title']=='ویرایش تأیید نشده' and current['unpublished_changes']


@pytest.mark.parametrize('changes',[{'reviewer':''},{'sources':[]},{'author_name':''},{'body_html':'<h1>تکرار عنوان</h1><p>متن</p>'},{'cover_alt':'','body_html':'<img alt="" src="data:bad"><p>متن</p>'}])
def test_publication_requirements(client,changes):
    access,row=create(client,**changes)
    assert transition(client,access,row).status_code==422
    assert client.get('/api/v1/articles').json()['total']==0


def test_compare_and_swap_and_reserved_slug(client):
    access,row=create(client);data=dict(revision=row['revision'],content=row['content'])
    def update():return client.put(f'/api/v1/staff/articles/{row["id"]}',headers=access,json=data).status_code
    with ThreadPoolExecutor(max_workers=2) as pool:assert sorted(pool.map(lambda _:update(),range(2)))==[200,409]
    _,nextrow=create(client,slug='other-slug')
    changed=dict(nextrow['content'],slug='test-article')
    assert client.put(f'/api/v1/staff/articles/{nextrow["id"]}',headers=access,json=dict(revision=nextrow['revision'],content=changed)).status_code==409


def test_rename_redirect_and_unpublish_tombstone(client):
    access,row=create(client);row=transition(client,access,row).json()
    data=dict(row['content'],slug='new-slug')
    row=client.put(f'/api/v1/staff/articles/{row["id"]}',headers=access,json=dict(revision=row['revision'],content=data)).json()
    row=transition(client,access,row).json()
    redirect=client.get('/articles/test-article/',follow_redirects=False)
    assert redirect.status_code==301 and redirect.headers['location']=='/articles/new-slug/'
    assert '/articles/new-slug/' in client.get('/sitemap.xml').text and '/articles/test-article/' not in client.get('/sitemap.xml').text
    row=transition(client,access,row,'unpublish').json()
    assert client.get('/articles/test-article/').status_code==410
    assert client.get('/api/v1/articles').json()['total']==0
    assert client.request('DELETE',f'/api/v1/staff/articles/{row["id"]}',headers=access,json={'revision':row['revision']}).status_code==200
    assert client.get('/articles/new-slug/').status_code==410


def test_historical_article_layout_uses_published_content_and_category_queries(client):
    access,row=create(client,categories=['دسته آزمون'])
    draft=client.get('/articles/').text
    assert row['content']['title'] not in draft
    assert 'legacy-article-header' in draft and 'فیلتر دسته‌بندی' in draft
    transition(client,access,row)
    listing=client.get('/articles/',params={'category':'دسته آزمون','q':row['content']['title']})
    assert listing.status_code==200 and row['content']['title'] in listing.text
    assert 'legacy-article-index-container' in listing.text and 'دسته‌بندی' in listing.text
    detail=client.get('/articles/test-article/').text
    assert 'legacy-article-detail' in detail and 'آخرین مطالب' in detail
    assert '<h2>' in detail and 'rel="canonical"' in detail
    assert client.get('/articles/?category=missing').status_code==404


def test_media_public_only_when_used_by_publication(client):
    access,media=upload(client);key=media['key']
    assert client.get(media['url']).status_code==404
    assert client.get(media['preview_url'],headers=access).status_code==200
    assert client.get(media['preview_url']).status_code==401
    image=Image.open(BytesIO(client.get(media['preview_url'],headers=access).content))
    assert image.format=='WEBP' and not image.getexif()
    _,row=create(client,access,cover_key=key,cover_alt='توضیح شاخص',body_html=f'<h2>تصویر</h2><p>متن آزمایشی</p><img src="{media["url"]}" alt="تصویر آزمایشی">')
    assert client.get(media['url']).status_code==404
    published=transition(client,access,row).json()
    assert client.get(media['url']).status_code==200
    assert client.delete('/api/v1/staff/media/'+key,headers=access).status_code==409
    assert client.get('/media/../../private/patient.webp').status_code==404
    transition(client,access,published,'unpublish')
    assert client.get(media['url']).status_code==404


def test_media_ownership_and_reject_fake_image(client):
    access,media=upload(client);other=headers(account(builtin='author')[2])
    assert client.put('/api/v1/staff/media/'+media['key'],headers=other,json={'alt':'توضیح تازه'}).status_code==403
    assert client.delete('/api/v1/staff/media/'+media['key'],headers=other).status_code==403
    assert client.post('/api/v1/staff/media',headers=access,data={'alt':'آزمایشی'},files={'file':('fake.jpg',b'<svg onload="alert(1)"></svg>','image/jpeg')}).status_code==415
    assert client.delete('/api/v1/staff/media/'+media['key'],headers=access).status_code==200
    assert client.get(media['preview_url'],headers=access).status_code==404


def test_html_save_sanitized_and_preview_feedback(client):
    access,row=create(client,body_html='<h2>تیتر</h2><p onclick="x()">آزمایش</p><script>x()</script><a href="javascript:x()">پیوند</a>')
    assert row['sanitized'] and 'onclick=' not in row['content']['body_html'] and '<script' not in row['content']['body_html']
    feedback=client.post('/api/v1/staff/articles/seo',headers=access,json=row['content']).json()['seo']
    assert len(feedback['checks'])==11 and 'تضمین' in feedback['notice']
    assert all('reason' in c and 'suggestion' in c for c in feedback['checks'])


@pytest.mark.parametrize('url',['javascript:alert(1)','//evil.example','http://example.org','https://user:password@example.org','https://example.org/\nscript','data:text/html,x'])
def test_unsafe_source_urls_rejected(client,url):
    access=headers(owner()[2]);response=client.post('/api/v1/staff/articles',headers=access,json={'revision':0,'content':dict(draft(),sources=[{'title':'منبع','url':url}])})
    assert response.status_code==422


def test_publisher_without_write_cannot_edit_but_can_publish(client):
    access,row=create(client);publisher=headers(account(['articles.view','articles.publish'])[2])
    assert client.put(f'/api/v1/staff/articles/{row["id"]}',headers=publisher,json=dict(revision=row['revision'],content=row['content'])).status_code==403
    assert transition(client,publisher,row).status_code==200


def test_writer_cannot_delete_live_content(client):
    access,row=create(client);row=transition(client,access,row).json();writer=headers(account(['articles.view','articles.delete'])[2])
    assert client.request('DELETE',f'/api/v1/staff/articles/{row["id"]}',headers=writer,json={'revision':row['revision']}).status_code==403


def test_schedule_requires_aware_future_time(client):
    access,row=create(client)
    assert transition(client,access,row,'schedule',scheduled_at='2020-01-01T00:00:00Z').status_code==422
    assert transition(client,access,row,'schedule',scheduled_at='2099-01-01T00:00:00').status_code==422


def test_unicode_metadata_and_script_like_text_escaped(client):
    access,row=create(client,slug='مقاله-آزمایشی',title='عنوان <script>آزمایشی</script>',reviewer='بازبین </script><script>x</script>')
    assert transition(client,access,row).status_code==200
    page=client.get('/articles/'+quote('مقاله-آزمایشی')+'/')
    assert page.status_code==200 and '&lt;script&gt;' in page.text
    assert '"reviewedBy"' in page.text and '\\u003c/script' in page.text
    assert quote('مقاله-آزمایشی') in client.get('/sitemap.xml').text


def test_media_search_pagination_and_selected_metadata(client):
    access=headers(owner()[2])
    from app.models import StaffUser
    with SessionLocal.begin() as db:
        staff=db.scalar(select(StaffUser).order_by(StaffUser.id))
        for i in range(65):
            db.add(PublicMedia(key=f'{i:032x}',alt=f'تصویر آزمایشی {i:03d}',owner_id=staff.id,width=40,height=60,size=100))
    first=client.get('/api/v1/staff/media',headers=access).json()
    second=client.get('/api/v1/staff/media?page=2',headers=access).json()
    assert first['total']==65 and len(first['items'])==60 and len(second['items'])==5
    assert not {v['key'] for v in first['items']} & {v['key'] for v in second['items']}
    older=second['items'][0]
    assert client.get('/api/v1/staff/media/'+older['key'],headers=access).json()==older
    assert client.get('/api/v1/staff/media?q='+quote(older['alt']),headers=access).json()['total']==1
    assert client.get('/api/v1/staff/media?q=%25',headers=access).json()['total']==0
    assert client.get('/api/v1/staff/media?page=10001',headers=access).status_code==422
    assert client.get('/api/v1/staff/media/'+older['key']).status_code==401


def test_article_pagination_refresh_after_create_and_archive(client):
    access=headers(owner()[2])
    for i in range(31):create(client,access,slug=f'page-{i}')
    first=client.get('/api/v1/staff/articles',headers=access).json()
    second=client.get('/api/v1/staff/articles?page=2',headers=access).json()
    assert first['total']==31 and len(first['items'])==30 and len(second['items'])==1
    row=second['items'][0]
    assert client.request('DELETE',f'/api/v1/staff/articles/{row["id"]}',headers=access,json={'revision':row['revision']}).status_code==200
    assert client.get('/api/v1/staff/articles?page=2',headers=access).json()['total']==30


def test_scheduled_slug_stays_reserved_after_draft_rename(client):
    access,row=create(client)
    row=transition(client,access,row,'schedule',scheduled_at=(utcnow()+timedelta(days=1)).isoformat()+'Z').json()
    renamed=dict(row['content'],slug='draft-renamed')
    row=client.put(f'/api/v1/staff/articles/{row["id"]}',headers=access,json={'revision':row['revision'],'content':renamed}).json()
    response=client.post('/api/v1/staff/articles',headers=access,json={'revision':0,'content':draft()})
    assert response.status_code==409
    with SessionLocal.begin() as db:db.get(Article,row['id']).scheduled_at=utcnow()-timedelta(seconds=1)
    assert client.get('/api/v1/articles/test-article').status_code==200
    assert client.put(f'/api/v1/staff/articles/{row["id"]}',headers=access,json={'revision':row['revision'],'content':renamed}).status_code==409


def test_tag_pages_and_history_payload_are_bounded(client):
    access,row=create(client)
    assert transition(client,access,row).status_code==200
    page=client.get('/articles/tag/'+quote('آزمایشی')+'/')
    assert page.status_code==200 and row['content']['title'] in page.text
    assert client.get('/articles/tag/missing/').status_code==404
    assert '/articles/tag/' in client.get('/articles/test-article/').text
    assert '/articles/tag/'+quote('آزمایشی')+'/' in client.get('/sitemap.xml').text
    history=client.get(f'/api/v1/staff/articles/{row["id"]}/revisions',headers=access).json()
    assert all('content' not in item for item in history)


@pytest.mark.parametrize('changes',[{'title':'  '},{'sources':[{'title':'  ','url':'https://example.org'}]},{'tags':['a'*81]},{'categories':['a']*11},{'body_html':'x'*200001}])
def test_editorial_input_bounds(client,changes):
    access=headers(owner()[2])
    response=client.post('/api/v1/staff/articles',headers=access,json={'revision':0,'content':dict(draft(),**changes)})
    assert response.status_code==422


def test_media_byte_and_pixel_limits_and_audit(client):
    original=config.get_settings()
    access=headers(owner()[2])
    response=client.post('/api/v1/staff/media',headers=access,data={'alt':'آزمایشی'},files={'file':('big.png',b'x'*(original.max_upload_bytes+1),'image/png')})
    assert response.status_code==413
    oversized=BytesIO();Image.new('1',(5000,4001)).save(oversized,format='PNG')
    assert client.post('/api/v1/staff/media',headers=access,data={'alt':'آزمایشی'},files={'file':('oversized.png',oversized.getvalue(),'image/png')}).status_code==413
    _,media=upload(client,access)
    assert client.put('/api/v1/staff/media/'+media['key'],headers=access,json={'alt':'توضیح تازه'}).status_code==200
    assert client.delete('/api/v1/staff/media/'+media['key'],headers=access).status_code==200
    from app.models import AuditLog
    with SessionLocal() as db:
        actions=set(db.scalars(select(AuditLog.action).where(AuditLog.entity_id==media['key'])))
    assert actions=={'media.upload','media.edit','media.archive'}


def test_restore_race_only_one_revision_wins(client):
    access,row=create(client)
    old=client.get(f'/api/v1/staff/articles/{row["id"]}/revisions',headers=access).json()[0]
    def restore():return client.post(f'/api/v1/staff/articles/{row["id"]}/restore/{old["id"]}',headers=access,json={'revision':row['revision']}).status_code
    with ThreadPoolExecutor(max_workers=2) as pool:assert sorted(pool.map(lambda _:restore(),range(2)))==[200,409]
