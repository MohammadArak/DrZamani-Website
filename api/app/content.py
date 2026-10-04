"""Allowlisted HTML, explicit editorial checks, and immutable public snapshots."""
import html
import json
import re
from html.parser import HTMLParser
from urllib.parse import urlsplit, unquote
import bleach
from fastapi import HTTPException
from pydantic import BaseModel, ConfigDict, Field, field_validator
from sqlalchemy import select, text, func
from .access import can
from .content_models import Article, ArticleAlias, ArticleRevision, PublicMedia
from .models import StaffUser, utcnow
from .activity import record_audit

MEDIA_RE = re.compile(r"^/media/([a-f0-9]{32})\.webp$")
TAGS = frozenset("p br h1 h2 h3 h4 ul ol li strong b em i u s blockquote pre code hr table thead tbody tr th td a img figure figcaption".split())


def safe_url(value, external_only=False):
    decoded = value
    for _ in range(3):
        decoded = unquote(decoded)
    if any(ord(c) < 33 for c in decoded) or "\\" in decoded:
        return False
    if not external_only and (decoded.startswith("#") or decoded.startswith("/") and not decoded.startswith("//")):
        return True
    try:
        parsed = urlsplit(decoded)
        return parsed.scheme == "https" and bool(parsed.hostname) and not parsed.username and not parsed.password
    except ValueError:
        return False


def sanitize(value):
    def attr(tag, name, val):
        if tag == 'a' and name == 'href': return safe_url(val)
        if tag == 'img' and name == 'src': return bool(MEDIA_RE.fullmatch(val))
        if tag == 'img' and name in {'alt','title'}: return len(val) <= 300
        if tag in {'td','th'} and name in {'colspan','rowspan'}: return val.isascii() and val.isdigit() and 1 <= int(val) <= 10
        return False
    # A new cleaner per call: html5lib parser instances are not thread safe.
    return bleach.Cleaner(tags=TAGS, attributes=attr, protocols={'https'}, strip=True, strip_comments=True).clean(value)


class Source(BaseModel):
    model_config = ConfigDict(extra='forbid')
    title: str = Field(min_length=2, max_length=300)
    url: str = Field(max_length=2000)

    @field_validator('title')
    @classmethod
    def source_title(cls,value):
        value=value.strip()
        if len(value)<2:raise ValueError('عنوان منبع را کامل کنید')
        return value

    @field_validator('url')
    @classmethod
    def check_url(cls, value):
        if not safe_url(value, external_only=True): raise ValueError('نشانی منبع باید HTTPS معتبر باشد')
        return value


class ArticleContent(BaseModel):
    model_config = ConfigDict(extra='forbid')
    title: str = Field(min_length=2, max_length=200)
    slug: str = Field(min_length=2, max_length=180, pattern=r'^[\w]+(?:-[\w]+)*$')
    summary: str = Field(default='', max_length=1000)
    body_html: str = Field(default='', max_length=200000)
    cover_key: str | None = Field(default=None, pattern=r'^[a-f0-9]{32}$')
    cover_alt: str = Field(default='', max_length=300)
    categories: list[str] = Field(default_factory=list, max_length=10)
    tags: list[str] = Field(default_factory=list, max_length=20)
    author_name: str = Field(default='', max_length=120)
    reviewer: str = Field(default='', max_length=120)
    sources: list[Source] = Field(default_factory=list, max_length=30)
    seo_title: str = Field(default='', max_length=200)
    seo_description: str = Field(default='', max_length=400)
    target_keyword: str = Field(default='', max_length=120)

    @field_validator('categories','tags')
    @classmethod
    def labels(cls, values):
        if any(not v.strip() or len(v) > 80 for v in values): raise ValueError('برچسب نامعتبر')
        return list(dict.fromkeys(v.strip() for v in values))

    @field_validator('title','author_name','reviewer','summary','seo_title','seo_description','target_keyword','cover_alt')
    @classmethod
    def strip_text(cls, value,info):
        value=value.strip()
        if info.field_name=='title' and len(value)<2:raise ValueError('عنوان مقاله را کامل کنید')
        return value

    @field_validator('slug')
    @classmethod
    def slug_text(cls, value): return value.lower()


class ArticleWrite(BaseModel):
    model_config = ConfigDict(extra='forbid')
    revision: int = Field(ge=0)
    content: ArticleContent


class Outline(HTMLParser):
    def __init__(self):
        super().__init__(); self.words=[]; self.headings=[]; self.images=[]; self.links=[]; self.paragraphs=0
    def handle_starttag(self, tag, attrs):
        attrs=dict(attrs)
        if tag in {'h1','h2','h3','h4'}: self.headings.append(int(tag[1]))
        if tag == 'img': self.images.append(attrs)
        if tag == 'a': self.links.append(attrs.get('href',''))
        if tag == 'p': self.paragraphs+=1
    def handle_data(self, data): self.words.append(data)


def analyze(content):
    data=content.model_dump() if isinstance(content,ArticleContent) else content
    parser=Outline(); parser.feed(data['body_html'])
    plain=' '.join(parser.words); words=re.findall(r'\w+',plain); keyword=data['target_keyword']
    checks=[]
    def check(code, ok, reason, suggestion):
        checks.append(dict(code=code,passed=bool(ok),reason=reason,suggestion='' if ok else suggestion))
    title=data['seo_title'] or data['title']; description=data['seo_description'] or data['summary']
    check('title', 25<=len(title)<=65, f'عنوان نتیجه جستجو {len(title)} نویسه دارد.', 'عنوان روشن و حدود ۲۵ تا ۶۵ نویسه بنویسید؛ این محدوده راهنماست.')
    check('description', 80<=len(description)<=165, f'توضیح نتیجه جستجو {len(description)} نویسه دارد.', 'خلاصه‌ای مشخص و حدود ۸۰ تا ۱۶۵ نویسه بنویسید.')
    check('headings',1 not in parser.headings and 2 in parser.headings and all(b<=a+1 for a,b in zip([1]+parser.headings,parser.headings)), 'عنوان مقاله H1 صفحه است؛ تیترهای متن بررسی شدند.', 'در متن از H2 شروع کنید و سطح تیتر را به ترتیب افزایش دهید؛ H1 تکراری ننویسید.')
    check('keyword',bool(keyword) and keyword in title and keyword in plain,'موضوع هدف در عنوان و متن بررسی شد.','عبارت هدف را به شکل طبیعی در عنوان و متن بیاورید.')
    density=plain.count(keyword)*len(keyword.split())/max(len(words),1) if keyword else 0
    check('stuffing',density<=.04, f'تکرار تقریبی عبارت هدف {round(density*100,1)} درصد است.', 'تکرار مصنوعی را کاهش دهید؛ عدد تقریبی است و معیار رتبه نیست.')
    check('alt',all(i.get('alt','').strip() for i in parser.images) and (not data['cover_key'] or bool(data['cover_alt'])), 'متن جایگزین تصاویر بررسی شد.', 'برای تصاویر توضیح دقیق و مفید بنویسید.')
    check('internal-links',any(v.startswith('/') and not v.startswith('//') for v in parser.links), 'پیوند داخلی در متن بررسی شد.', 'یک پیوند مرتبط به خدمت یا مقاله دیگر اضافه کنید.')
    check('slug',len(data['slug'])<=80 and not data['slug'].isdigit(),'خوانایی و طول نشانی بررسی شد.','نشانی کوتاه و مرتبط با موضوع بنویسید.')
    sentences=[v for v in re.split(r'[.!؟\n]+',plain) if v.strip()]
    average=len(words)/max(len(sentences),1)
    check('readability',len(words)>=100 and average<=35, f'{len(words)} واژه؛ میانگین تقریبی {round(average)} واژه در جمله.','جمله‌های کوتاه، پاراگراف‌های مشخص و توضیح کافی بنویسید؛ برای فارسی این تخمین ساده است.')
    check('sources',bool(data['sources']),'وجود منبع بررسی شد.','منابع معتبر و قابل بررسی اضافه کنید.')
    check('reviewer',bool(data['reviewer'].strip()),'نام بازبین پزشکی بررسی شد.','نام بازبین مسئول را پس از بازبینی واقعی ثبت کنید.')
    return dict(score=round(sum(c['passed'] for c in checks)/len(checks)*100),checks=checks,word_count=len(words),notice='این بازخورد راهنمای نگارش است؛ تضمین رتبه گوگل یا تأیید علمی و پزشکی نیست.')


def clean_content(content, db):
    data=content.model_dump(); cleaned=sanitize(data['body_html']); changed=cleaned!=data['body_html'];data['body_html']=cleaned
    parser=Outline();parser.feed(cleaned)
    if len(parser.images)>100:raise HTTPException(422,'هر مقاله حداکثر ۱۰۰ تصویر می‌پذیرد')
    keys={MEDIA_RE.fullmatch(i.get('src','')).group(1) for i in parser.images if MEDIA_RE.fullmatch(i.get('src',''))}
    if data['cover_key']:keys.add(data['cover_key'])
    if keys and set(db.scalars(select(PublicMedia.key).where(PublicMedia.key.in_(keys),PublicMedia.deleted.is_(False))))!=keys:
        raise HTTPException(422,'تصویر باید از کتابخانه رسانه عمومی فعال انتخاب شود')
    return data,changed


def lock(db,staff=None,permission=None):
    db.rollback();db.execute(text('BEGIN IMMEDIATE'));db.expire_all()
    if staff and not can(db.get(StaffUser,staff.id),permission): raise HTTPException(403,'مجوز تغییر کرده است')


def article_row(db,article_id,revision=None):
    row=db.get(Article,article_id)
    if not row or row.deleted:raise HTTPException(404,'مقاله پیدا نشد')
    if revision is not None and row.revision!=revision:raise HTTPException(409,'نسخه مقاله تغییر کرده؛ نسخه تازه را بخوانید')
    return row


def reserve_slug(db,slug,article_id=None):
    match=db.scalar(select(Article).where((Article.slug==slug)|(Article.published_slug==slug)|(func.json_extract(Article.scheduled_json,'$.slug')==slug)))
    alias=db.get(ArticleAlias,slug)
    if match and match.id!=article_id or alias and alias.article_id!=article_id:
        raise HTTPException(409,'این نشانی قبلاً استفاده شده است')


def revision(db,row,staff,action):
    db.add(ArticleRevision(article_id=row.id,revision=row.revision,content_json=row.content_json,actor_id=staff.id,action=action))
    record_audit(db,action='article.'+action,entity_type='article',entity_id=row.id,summary='تغییر مقاله',actor_staff_id=staff.id,details={'revision':row.revision})


def read(row,public=False):
    data=json.loads(row.published_json if public else row.content_json)
    common=dict(id=row.id,content=data,published_at=row.published_at,updated_at=row.public_updated_at if public else row.updated_at)
    if not public: common.update(revision=row.revision,status=row.status,scheduled_at=row.scheduled_at,has_publication=bool(row.published_json),unpublished_changes=row.content_json!=row.published_json,author_id=row.author_id,seo=analyze(data))
    return common


def approve(data):
    parser=Outline();parser.feed(data['body_html'])
    if not data['title'].strip() or not data['summary'].strip() or not ''.join(parser.words).strip():raise HTTPException(422,'عنوان، خلاصه و متن برای انتشار لازم‌اند')
    if not data['reviewer'].strip() or not data['author_name'].strip() or not data['sources']:raise HTTPException(422,'نام نویسنده، بازبین پزشکی و منابع برای انتشار لازم‌اند')
    if 1 in parser.headings:raise HTTPException(422,'H1 در متن تکراری است؛ از H2 استفاده کنید')
    if any(not MEDIA_RE.fullmatch(i.get('src','')) for i in parser.images):raise HTTPException(422,'تصویر متن باید از کتابخانه عمومی انتخاب شود')
    if not analyze(data)['checks'][5]['passed']:raise HTTPException(422,'متن جایگزین تصاویر را کامل کنید')


def publish(db,row,snapshot):
    data=json.loads(snapshot);old=row.published_slug
    reserve_slug(db,data['slug'],row.id)
    if old and old!=data['slug'] and not db.get(ArticleAlias,old):db.add(ArticleAlias(slug=old,article_id=row.id))
    row.published_json=snapshot;row.published_slug=data['slug'];row.published_at=row.published_at or utcnow();row.public_updated_at=utcnow()
    row.scheduled_json=None;row.scheduled_at=None;row.status='published'


def publish_due(db):
    if not db.scalar(select(Article.id).where(Article.deleted.is_(False),Article.scheduled_at<=utcnow()).limit(1)):return 0
    lock(db); rows=db.scalars(select(Article).where(Article.deleted.is_(False),Article.scheduled_at<=utcnow())).all()
    for row in rows:
        publish(db,row,row.scheduled_json)
        row.revision+=1
        db.add(ArticleRevision(article_id=row.id,revision=row.revision,content_json=row.content_json,actor_id=None,action='scheduled_publish'))
        # The scheduled payload is frozen; later writer edits cannot enter publication.
        record_audit(db,action='article.scheduled_publish',entity_type='article',entity_id=row.id,summary='انتشار زمان‌بندی‌شده تأییدشده')
    db.commit();return len(rows)


def public_rows(db):
    publish_due(db)
    return db.scalars(select(Article).where(Article.deleted.is_(False),Article.published_json.is_not(None)).order_by(Article.published_at.desc(),Article.id.desc())).all()


def media_keys(snapshot):
    if not snapshot:return set()
    data=json.loads(snapshot);parser=Outline();parser.feed(data['body_html'])
    keys={m.group(1) for i in parser.images if (m:=MEDIA_RE.fullmatch(i.get('src','')))}
    if data['cover_key']:keys.add(data['cover_key'])
    return keys


def is_public_media(db,key):
    # Cheap SQL prefilter (the key is a validated 32-hex string): only rows that mention it are parsed,
    # so serving an image no longer re-reads every published article and comment.
    publish_due(db)
    candidates=db.scalars(select(Article.published_json).where(Article.deleted.is_(False),Article.published_json.is_not(None),Article.published_json.contains(key,autoescape=True))).all()
    if any(key in media_keys(snapshot) for snapshot in candidates):return True
    from .comments import public_rows as public_comments
    from .comment_models import Comment
    if db.scalar(select(Comment.id).where(Comment.deleted.is_(False),Comment.published_json.is_not(None),Comment.published_json.contains(key,autoescape=True)).limit(1)) is not None:
        if any(row['photo_key']==key for row in public_comments(db)):return True
    from .site_services import public_media_keys
    from .site_gallery import public_media_keys as gallery_keys
    return key in public_media_keys(db) or key in gallery_keys(db)
