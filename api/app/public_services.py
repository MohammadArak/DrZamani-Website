"""Introductory service pages share the homepage catalog; no patient data."""
import json
from datetime import datetime
from pathlib import Path

from fastapi import APIRouter, Depends
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from .database import get_db
from .public_chrome import service_cards as build_cards, services_page
from .public_pages import clinic_row, phone, render

router = APIRouter(include_in_schema=False)
SERVICES = json.loads(Path(__file__).with_name("clinic_services.json").read_text(encoding="utf-8"))
# Content release date, not request/build time. Update when this catalog changes.
CONTENT_UPDATED_AT = datetime(2026, 10, 2)


def service_cards():
    return build_cards(SERVICES)


def page(db, service=None):
    clinic = clinic_row(db)
    name = service["title"] if service else "خدمات مطب"
    path = f'/services/{service["slug"]}/' if service else '/services/'
    description = service["description"] if service else f"آشنایی با حوزه‌های خدمات مطب {clinic.doctor_name} در {clinic.address_city}"
    body = services_page(clinic, SERVICES, service, phone(clinic.office_phone))
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
