"""Public privacy page; the wording is the editable "privacy" block (see site_content.py)."""
from fastapi import APIRouter, Depends
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from .database import get_db
from .public_chrome import privacy_page
from .public_pages import clinic_row, phone, render
from .site_content import public_blocks, DEFAULTS

router = APIRouter(include_in_schema=False)


@router.get("/privacy")
def alias():
    return RedirectResponse("/privacy/", status_code=301)


@router.get("/privacy/")
def page(db: Session = Depends(get_db)):
    clinic = clinic_row(db)
    items = (public_blocks(db).get("privacy") or DEFAULTS["privacy"])["items"]

    def fill(text: str) -> str:
        return (
            text.replace("{doctorName}", clinic.doctor_name)
            .replace("{specialty}", clinic.specialty)
            .replace("{officePhone}", clinic.office_phone)
            .replace("{consultationPhone}", clinic.consultation_phone)
        )

    site = clinic.site_url.rstrip("/")
    return render(clinic, "privacy", db, editorial={
        "title": f"حریم خصوصی | {clinic.doctor_name}",
        "description": f"چه اطلاعاتی در سایت {clinic.doctor_name} ثبت می‌شود و چگونه نگه‌داری می‌شود.",
        "path": "/privacy/",
        "body": privacy_page(clinic, items, fill),
        "schemas": [{"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [
            {"@type": "ListItem", "position": 1, "name": "صفحه اصلی", "item": site + "/"},
            {"@type": "ListItem", "position": 2, "name": "حریم خصوصی", "item": site + "/privacy/"},
        ]}],
    })
