"""Fresh initial HTML/SEO from the same ClinicSetting row used by the public API.

The built asset URLs are read from index.html; clinic edits need no rebuild/write.
Nginx serves assets and forwards only these exact public routes.
"""
import html
import json
import re
from urllib.parse import urlsplit, quote

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import HTMLResponse, Response, RedirectResponse
from sqlalchemy.orm import Session

from . import config
from .database import get_db
from .models import ClinicSetting
from .booking_policy import public_clinic

router = APIRouter(include_in_schema=False)


def safe_json(value):
    return json.dumps(value, ensure_ascii=False).replace("<", "\\u003c").replace(">", "\\u003e").replace("&", "\\u0026")


def phone(value):
    value = re.sub(r"[^0-9+]", "", value)
    if value.startswith("0098"):
        return "+" + value[2:]
    if value.startswith("0"):
        return "+98" + value[1:]
    if value.startswith("98"):
        return "+" + value
    return value


def render(clinic, page, db=None, editorial=None):
    template_path = config.get_settings().public_html_dir / "index.html"
    try:
        template = template_path.read_text(encoding="utf-8")
    except OSError:
        raise HTTPException(503, "خروجی ساخت سایت برای نمایش آماده نیست") from None
    # Keep only build-generated assets and fonts/styles; discard stale public metadata.
    head_match = re.search(r"<head\b[^>]*>(.*?)</head>", template, re.S | re.I)
    if not head_match:
        raise HTTPException(503, "قالب خروجی ساخت سایت معتبر نیست")
    head = head_match[1]
    if editorial:
        # Public articles are complete server HTML with native navigation/search.
        # Do not mount the homepage SPA over the indexable article body.
        head = re.sub(r'<script\b[^>]*>.*?</script>', '', head, flags=re.S | re.I)
    head = re.sub(r"<title\b[^>]*>.*?</title>|<script\b(?=[^>]*type=[\"']application/(?:ld\+json|json)[\"'])[^>]*>.*?</script>", "", head, flags=re.S | re.I)
    head = re.sub(r"<meta\b[^>]*>|<link\b(?=[^>]*rel=[\"']canonical[\"'])[^>]*>", "", head, flags=re.I)
    esc = html.escape
    site = clinic.site_url.rstrip("/")
    name = clinic.doctor_name
    title = clinic.seo_title or f"{name} | {clinic.specialty}"
    description = clinic.seo_description or f"وب‌سایت رسمی {name}، {clinic.specialty} در {clinic.address_city}؛ معرفی خدمات و راه‌های ارتباطی."
    image = clinic.seo_image_url or f"{site}/og-cover.jpg"
    path, robots, status = "/", "index, follow, max-image-preview:large", 200
    if page == "staff":
        title, description, path, robots = f"پنل کارکنان | {name}", "پنل داخلی کارکنان مجاز مطب", "/staff/", "noindex, nofollow"
    elif page == "appointment":
        title, description, path, robots = f"سامانه نوبت‌دهی | {name}", "سامانه مراجعه و ارتباط با مطب", "/appointment/", "noindex, follow"
    elif page == "404":
        title, description, path, robots, status = "صفحه پیدا نشد", "نشانی درخواست‌شده وجود ندارد", "/404.html", "noindex, follow", 404
    if editorial:
        title, description, path, robots = editorial['title'], editorial['description'], editorial['path'], editorial.get('robots', robots)
        image = editorial.get('image') or image
    canonical = site + path
    meta = f'<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title data-rh="true">{esc(title)}</title><link data-rh="true" rel="canonical" href="{esc(canonical)}">'
    for attribute, key, value in [
        ("name", "description", description), ("name", "robots", robots),
        ("property", "og:title", title), ("property", "og:description", description),
        ("property", "og:url", canonical), ("property", "og:image", image),
        ("property", "og:type", "article" if editorial and editorial.get("article") else "website"), ("property", "og:site_name", name),
        ("name", "twitter:card", "summary_large_image"), ("name", "twitter:title", title),
        ("name", "twitter:description", description), ("name", "twitter:image", image),
    ]:
        meta += f'<meta data-rh="true" {attribute}="{key}" content="{esc(value)}">'
    schema = {"@context": "https://schema.org", "@type": "MedicalClinic", "name": name,
              "url": site + "/", "image": image, "telephone": [phone(clinic.office_phone), phone(clinic.consultation_phone)],
              "email": clinic.email, "medicalSpecialty": clinic.specialty,
              "address": {"@type": "PostalAddress", "addressCountry": "IR", "streetAddress": clinic.address,
                          "addressLocality": clinic.address_city, "addressRegion": clinic.address_region},
              "geo": {"@type": "GeoCoordinates", "latitude": clinic.map_latitude, "longitude": clinic.map_longitude},
              "sameAs": [value for value in [clinic.instagram_url, clinic.eitaa_url] if value]}
    if clinic.medical_council_number:
        schema["identifier"] = clinic.medical_council_number
    payload = public_clinic(clinic, db).model_dump()
    meta += f'<script data-rh="true" type="application/ld+json">{safe_json(schema)}</script><script id="clinic-bootstrap" type="application/json">{safe_json(payload)}</script>'
    if editorial:
        for extra in editorial.get('schemas', []):
            meta += f'<script data-rh="true" type="application/ld+json">{safe_json(extra)}</script>'
    body = f'<main dir="rtl" lang="fa"><h1>{esc(title)}</h1><p>{esc(description)}</p>'
    if page == "home":
        body += f'<p>{esc(clinic.specialty)} در {esc(clinic.address_city)}</p><address>{esc(clinic.address)}</address><p>{esc(clinic.working_hours)}</p>'
        for number in [clinic.office_phone, clinic.consultation_phone]:
            body += f'<p><a href="tel:{esc(phone(number))}">{esc(number)}</a></p>'
        body += f'<p><a href="mailto:{esc(clinic.email)}">{esc(clinic.email)}</a></p>'
    if page in {"home", "appointment"} and not payload["booking_enabled"]:
        body += f'<p role="status">{esc(payload["booking_disabled_message"])}</p><p><a href="tel:{esc(phone(clinic.office_phone))}">تماس با مطب</a></p>'
    body += '<p><a href="/">صفحه اصلی</a></p></main>'
    if page == "appointment" and not payload["booking_enabled"]:
        body = f'''<main class="booking-closed" dir="rtl" lang="fa"><div class="booking-closed__card" role="status"><div class="booking-closed__symbol" aria-hidden="true"><span class="booking-closed__halo"></span><svg viewBox="0 0 80 80" fill="none"><rect x="14" y="18" width="52" height="48" rx="12" stroke="currentColor" stroke-width="3"/><path d="M14 32h52M28 12v12M52 12v12" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><rect x="30" y="41" width="6" height="15" rx="2" fill="currentColor"/><rect x="44" y="41" width="6" height="15" rx="2" fill="currentColor"/></svg></div><p>{esc(payload["booking_disabled_message"])}</p></div></main>'''
    if editorial:
        body = editorial['body']
    return HTMLResponse(f'<!doctype html><html lang="fa" dir="rtl"><head>{head}{meta}</head><body><div id="root">{body}</div></body></html>', status_code=status,
                        headers={"Cache-Control": "no-store", **({"X-Robots-Tag": robots} if page not in {"home","articles"} or editorial and editorial.get("robots", "").startswith("noindex") else {})})


def clinic_row(db):
    clinic = db.get(ClinicSetting, 1)
    if not clinic:
        raise HTTPException(503, "اطلاعات مطب آماده نیست")
    return clinic


@router.get("/", response_class=HTMLResponse)
def home(db: Session = Depends(get_db)):
    return render(clinic_row(db), "home", db)


@router.get("/appointment/", response_class=HTMLResponse)
def appointment(db: Session = Depends(get_db)):
    return render(clinic_row(db), "appointment", db)


@router.get("/staff/", response_class=HTMLResponse)
def staff(db: Session = Depends(get_db)):
    return render(clinic_row(db), "staff", db)


@router.get("/404.html", response_class=HTMLResponse)
def missing(db: Session = Depends(get_db)):
    return render(clinic_row(db), "404", db)


@router.get("/index.html")
def old_index():
    return RedirectResponse("/", status_code=301)


@router.get("/sitemap.xml")
def sitemap(db: Session = Depends(get_db)):
    clinic = clinic_row(db)
    from .content import public_rows
    rows = public_rows(db)
    urls = [("/", clinic.updated_at)]
    if rows:
        latest = max(r.public_updated_at for r in rows)
        urls.append(("/articles/", latest))
        for row in rows: urls.append(("/articles/"+quote(row.published_slug)+"/", row.public_updated_at))
        for category in sorted({v for r in rows for v in json.loads(r.published_json)['categories']}):
            urls.append(("/articles/category/"+quote(category)+"/", latest))
    xml = '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+''.join(f'<url><loc>{html.escape(clinic.site_url.rstrip("/")+path)}</loc><lastmod>{stamp.date().isoformat()}</lastmod></url>' for path,stamp in urls)+'</urlset>'
    return Response(xml, media_type="application/xml", headers={"Cache-Control": "no-store"})


@router.get("/robots.txt")
def robots(db: Session = Depends(get_db)):
    clinic = clinic_row(db)
    return Response(f'User-agent: *\nAllow: /\n\nSitemap: {clinic.site_url.rstrip("/")}/sitemap.xml\nHost: {urlsplit(clinic.site_url).hostname}\n', media_type="text/plain", headers={"Cache-Control": "no-store"})
