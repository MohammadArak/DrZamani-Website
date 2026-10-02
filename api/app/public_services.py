"""Introductory service pages share the homepage catalog; no patient data."""
import html
import json
from datetime import datetime
from pathlib import Path

from fastapi import APIRouter, Depends
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from .database import get_db
from .public_pages import clinic_row, phone, render

router = APIRouter(include_in_schema=False)
SERVICES = json.loads(Path(__file__).with_name("clinic_services.json").read_text(encoding="utf-8"))
# Content release date, not request/build time. Update when this catalog changes.
CONTENT_UPDATED_AT = datetime(2026, 10, 2)


def service_cards():
    esc = html.escape
    return '<div class="landing-services-grid">' + ''.join(
        f'<a class="landing-service-card" href="/services/{esc(s["slug"])}/"><img src="/img/services/{esc(s["image"])}" alt="" width="72" height="72"><h2>{esc(s["title"])}</h2><p>{esc(s["summary"])}</p></a>'
        for s in SERVICES
    ) + '</div>'


def page(db, service=None):
    clinic = clinic_row(db)
    esc = html.escape
    name = service["title"] if service else "خدمات مطب"
    path = f'/services/{service["slug"]}/' if service else '/services/'
    description = service["description"] if service else f"آشنایی با حوزه‌های خدمات مطب {clinic.doctor_name} در {clinic.address_city}"
    body = '<div class="public-services"><main dir="rtl"><nav aria-label="مسیر صفحه"><a href="/">صفحه اصلی</a><span aria-hidden="true">/</span><a href="/services/">خدمات</a>'
    if service:
        body += f'<span aria-hidden="true">/</span><span aria-current="page">{esc(name)}</span>'
    body += f'</nav><h1>{esc(name)}</h1>'
    if service:
        body += f'<section class="public-service-intro"><img src="/img/services/{esc(service["image"])}" alt="" width="100" height="100"><p>{esc(description)}</p><h2>هماهنگی مراجعه</h2><p>پرسش‌های خود درباره مراجعه را با مطب مطرح کنید. زمان مراجعه پس از هماهنگی با مطب مشخص می‌شود.</p><ul><li>{esc(clinic.doctor_name)}، {esc(clinic.specialty)}</li><li>{esc(clinic.address_city)}، {esc(clinic.address)}</li><li>{esc(clinic.working_hours)}</li></ul><div class="landing-actions"><a class="landing-button landing-button-navy" href="tel:{esc(phone(clinic.office_phone))}">تماس با مطب</a><a class="landing-button landing-button-outline" href="/#footer">راه‌های ارتباطی</a></div></section><h2>خدمات دیگر</h2>'
    else:
        body += f'<p>{esc(description)}</p>'
    body += service_cards() + '<nav aria-label="مطالب مرتبط"><a href="/articles/">مقالات منتشرشده</a><a href="/#samples">نمونه‌کارها</a><a href="/#footer">ارتباط با مطب</a></nav></main></div>'
    crumbs = [{"@type": "ListItem", "position": 1, "name": "صفحه اصلی", "item": clinic.site_url.rstrip('/') + '/'}, {"@type": "ListItem", "position": 2, "name": "خدمات", "item": clinic.site_url.rstrip('/') + '/services/'}]
    if service:
        crumbs.append({"@type": "ListItem", "position": 3, "name": name, "item": clinic.site_url.rstrip('/') + path})
    return render(clinic, "services", db, editorial={"title": f"{name} | {clinic.doctor_name}", "description": description, "path": path, "body": body, "schemas": [{"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": crumbs}]})


@router.get('/services')
def index_alias():
    return RedirectResponse('/services/', status_code=301)


@router.get('/services/')
def index(db: Session = Depends(get_db)):
    return page(db)


@router.get('/services/{slug}')
def detail_alias(slug: str, db: Session = Depends(get_db)):
    if any(s['slug'] == slug for s in SERVICES):
        return RedirectResponse(f'/services/{slug}/', status_code=301)
    return render(clinic_row(db), '404', db)


@router.get('/services/{slug}/')
def detail(slug: str, db: Session = Depends(get_db)):
    service = next((s for s in SERVICES if s['slug'] == slug), None)
    return page(db, service) if service else render(clinic_row(db), '404', db)
