"""Pure HTML builders of the public article/service pages (no database, no network)."""
from datetime import date, datetime
from types import SimpleNamespace

from app import public_chrome as chrome


def make_clinic(**overrides):
    values = dict(
        doctor_name="دکتر نمونه", specialty="متخصص", office_phone="08611111111", consultation_phone="09120000000",
        email="doctor@example.com", address_city="اراک", address="اراک، خیابان نمونه", working_hours="روزهای کاری",
        instagram_url="https://instagram.com/sample", eitaa_url="https://eitaa.com/sample",
        map_embed_url="https://neshan.org/maps/iframe/places/x/1/2", map_page_url="https://neshan.org/maps/places/x",
    )
    values.update(overrides)
    return SimpleNamespace(**values)


def make_item(slug="a-b", **overrides):
    values = dict(
        slug=slug, title="عنوان آزمون", summary="خلاصه آزمون", cover_key="a" * 32, cover_alt="توضیح تصویر", categories=["گوش"],
        tags=["برچسب"], author_name="نویسنده", reviewer="بازبین", sources=[dict(title="منبع", url="https://example.org/s")],
        published_at=datetime(2026, 7, 31, 9, 0), updated_at=datetime(2026, 7, 31, 9, 0),
    )
    values.update(overrides)
    return values


def test_jalali_dates_match_known_values():
    assert chrome.fa_date(date(2026, 7, 31)) == "۹ مرداد ۱۴۰۵"
    assert chrome.fa_date(date(2026, 3, 21)) == "۱ فروردین ۱۴۰۵"
    assert chrome.fa_date(date(2025, 3, 20)) == "۳۰ اسفند ۱۴۰۳"
    assert chrome.fa_date(datetime(2026, 7, 31, 12, 0)) == "۹ مرداد ۱۴۰۵"
    # Stored UTC values show in Tehran time (UTC+3:30): 23:00 UTC is already the next day there.
    assert chrome.fa_date(datetime(2026, 7, 31, 23, 0)) == "۱۰ مرداد ۱۴۰۵"


def test_outline_adds_anchors_and_toc_only_when_headings_exist():
    body, toc = chrome.outline("<p>x</p><h2>اول</h2><p>y</p><h3>دوم</h3>")
    assert '<h2 id="article-section-1">اول</h2>' in body and '<h3 id="article-section-2">دوم</h3>' in body
    assert 'href="#article-section-1"' in toc and 'href="#article-section-2"' in toc
    assert chrome.outline("<p>بدون تیتر</p>")[1] == ""


def test_reading_minutes_is_at_least_one():
    assert chrome.reading_minutes("") == 1
    assert chrome.reading_minutes("<p>" + "واژه " * 450 + "</p>") == 3


def test_header_footer_escape_hostile_clinic_values():
    clinic = make_clinic(doctor_name='x"><script>bad()</script>', address="<img src=x onerror=bad()>", email='a"b@example.com')
    page = chrome.site_header(clinic, crumbs=[("خانه", "/"), ("<b>عنوان</b>", "")]) + chrome.site_footer(clinic)
    assert "<script>bad()" not in page and "<img src=x" not in page and "<b>عنوان</b>" not in page
    assert "&lt;script&gt;bad()" in page and "&lt;img src=x onerror=bad()&gt;" in page


def test_footer_drops_non_https_or_foreign_embeds():
    clinic = make_clinic(instagram_url="javascript:bad()", eitaa_url="http://eitaa.com/x", map_embed_url="https://evil.example/frame", map_page_url="javascript:bad()")
    footer = chrome.site_footer(clinic)
    assert "javascript:" not in footer and "http://eitaa.com" not in footer and "<iframe" not in footer and "evil.example" not in footer


def test_card_and_sidebar_use_published_data_only():
    items = [make_item("one", title="اول", categories=["الف"]), make_item("two", title="دوم", categories=["الف", "ب"])]
    card = chrome.article_card(items[0])
    assert 'href="/articles/one/"' in card and "اول" in card and "۹ مرداد ۱۴۰۵" in card
    side = chrome.sidebar(items, current_slug="one", q='"><x>')
    assert "جست‌وجو" in side and "آخرین مطالب" in side and "دسته‌بندی" in side
    assert "&quot;&gt;&lt;x&gt;" in side and '"><x>' not in side
    latest = side.split("آخرین مطالب", 1)[1]
    assert "دوم" in latest and "اول" not in latest  # the current article is not listed as "latest"


def test_list_content_paginates_and_keeps_required_labels():
    items = [make_item(f"s{i}", title=f"مقاله {i}") for i in range(3)]
    page = chrome.list_content(items, total=30, page=2, per_page=12, q="سینوس", category="گوش", categories=["گوش", "بینی"])
    assert "فیلتر دسته‌بندی" in page and 'value="سینوس"' in page and '<option value="گوش" selected>' in page
    assert page.count("legacy-card") >= 3 and "۳۰ مقاله یافت شد" in page and "صفحه ۲ از ۳" in page
    assert 'aria-current="page"' in page and "?page=3&amp;q=" in page
    assert "هنوز مقاله‌ای منتشر نشده است" in chrome.list_content([], total=0, page=1, per_page=12, q="", category="", categories=[])


def test_detail_content_has_structure_and_escapes_text():
    item = make_item(title="<i>عنوان</i>", summary="خلاصه <b>خطرناک</b>")
    html_page = chrome.detail_content(item, published_at=item["published_at"], updated_at=item["updated_at"], body_html="<h2>تیتر</h2><p>متن</p>", toc_html="")
    assert "legacy-article-detail" in html_page and "<h2>تیتر</h2>" in html_page
    assert "&lt;i&gt;عنوان&lt;/i&gt;" in html_page and "<b>خطرناک</b>" not in html_page
    assert 'rel="noopener noreferrer"' in html_page and "این مطلب برای آموزش است" in html_page
    assert chrome.related_section([make_item("only")], "only") == ""


def test_services_pages_show_text_phone_and_escape():
    services = [dict(slug="rhino", title="رینو", image="rhinoplasty.png", summary="خلاصه", description_html="<p>توضیح کامل خدمت</p>")]
    clinic = make_clinic(doctor_name="<script>fixture()</script>")
    detail = chrome.services_page(clinic, services, services[0], "+98861111111")
    assert "توضیح کامل خدمت" in detail and "tel:+98861111111" in detail and "<script>fixture()" not in detail
    index = chrome.services_page(clinic, services, None, "+98861111111")
    assert 'href="/services/rhino/"' in index and "خدمات مطب" in index


def test_header_puts_page_title_on_its_own_line_after_the_trail():
    header = chrome.site_header(make_clinic(), crumbs=[("صفحه اصلی", "/"), ("مقالات", "/articles/"), ("عنوان مقاله", "")])
    trail, title = header.split('class="legacy-crumb-trail"', 1)[1].split('class="legacy-crumb-title"', 1)
    assert 'href="/"' in trail and 'href="/articles/"' in trail and "عنوان مقاله" not in trail
    assert 'aria-current="page"' in title and "عنوان مقاله" in title
    assert "legacy-hero-crumbs" not in chrome.site_header(make_clinic())
