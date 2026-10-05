"""Public service pages; their text comes from the database (see site_services.py)."""
from fastapi import APIRouter, Depends
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from .content import sanitize
from .database import get_db
from .public_chrome import service_cards as build_cards, services_page
from .public_pages import clinic_row, phone, render
from .site_services import HOME_LIMIT, public_items

router = APIRouter(include_in_schema=False)


def service_cards(db):
    return build_cards(public_items(db)[:HOME_LIMIT])  # homepage markup only


def page(db, service):
    clinic = clinic_row(db)
    services = public_items(db)
    service = dict(service, description_html=sanitize(service["description_html"]))
    name = service["title"]
    path = f'/services/{service["slug"]}/'
    description = service["seo_description"] or service["summary"] or service["title"]
    title = service["seo_title"] or f"{name} | {clinic.doctor_name}"
    body = services_page(clinic, services, service, phone(clinic.office_phone))
    site = clinic.site_url.rstrip('/')
    crumbs = [
        {"@type": "ListItem", "position": 1, "name": "صفحه اصلی", "item": site + '/'},
        {"@type": "ListItem", "position": 2, "name": name, "item": site + path},
    ]
    return render(clinic, "services", db, editorial={
        "title": title, "description": description, "path": path, "body": body,
        "schemas": [{"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": crumbs}],
    })


@router.get('/services')
@router.get('/services/')
def index_alias():
    # There is no services index page any more; old links land on the homepage services section.
    return RedirectResponse('/#services', status_code=301)


@router.get('/services/{slug}')
def detail_alias(slug: str, db: Session = Depends(get_db)):
    if any(item['slug'] == slug for item in public_items(db)):
        return RedirectResponse(f'/services/{slug}/', status_code=301)
    return render(clinic_row(db), '404', db)


@router.get('/services/{slug}/')
def detail(slug: str, db: Session = Depends(get_db)):
    service = next((item for item in public_items(db) if item['slug'] == slug), None)
    return page(db, service) if service else render(clinic_row(db), '404', db)
