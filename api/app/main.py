from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from datetime import time

from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import select

from .config import get_settings
from .access import seed_access, assign_legacy_role
from .version import VERSION
from .database import SessionLocal
from .models import (
    ClinicSetting,
    Service,
    ServiceImageRequirement,
    ServiceWeeklySchedule,
    StaffUser,
    WeeklySchedule,
)
from .routers import access, auth, patient, staff, settings as settings_router
from .runtime_settings import SettingsUnavailable
from .public_pages import router as public_pages_router
from .public_services import router as public_services_router
from .realtime import router as realtime_router
from .security import hash_password
from .sms_automation import seed_sms_rules
from .site_services import seed as seed_site_services
from .site_content import seed as seed_site_content


logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
logger = logging.getLogger(__name__)
settings = get_settings()
if settings.app_env == "production":
    # Uvicorn's default access log contains query strings (including patient searches).
    logging.getLogger("uvicorn.access").disabled = True
    logging.getLogger("httpx").setLevel(logging.WARNING)


def _default_service_days() -> list[ServiceWeeklySchedule]:
    return [
        ServiceWeeklySchedule(
            weekday=weekday,
            enabled=False,
            start_time=time(16, 0),
            end_time=time(20, 0),
        )
        for weekday in range(7)
    ]


def seed_defaults() -> None:
    with SessionLocal.begin() as db:
        seed_access(db)
        seed_site_services(db)
        seed_site_content(db)
        if not db.get(ClinicSetting, 1):
            from .models import SystemSetting
            system = db.get(SystemSetting, 1)
            db.add(ClinicSetting(id=1, revision=system.revision if system else 1))
        existing_days = set(db.scalars(select(WeeklySchedule.weekday)).all())
        for weekday in range(7):
            if weekday not in existing_days:
                db.add(WeeklySchedule(weekday=weekday, enabled=False))
        if not db.scalar(select(Service.id).limit(1)):
            db.add_all(
                [
                    Service(
                        title="ویزیت تخصصی گوش، حلق و بینی",
                        description="بررسی مشکلات گوش، بینی، سینوس و حلق",
                        duration_minutes=20,
                        icon_key="medical",
                        weekly_schedules=_default_service_days(),
                        sort_order=1,
                    ),
                    Service(
                        title="مشاوره قبل از جراحی بینی",
                        description="ارزیابی و مشاوره اولیه رینوپلاستی",
                        duration_minutes=30,
                        icon_key="nose",
                        allows_media_chat=True,
                        weekly_schedules=_default_service_days(),
                        image_requirements=[
                            ServiceImageRequirement(title="نمای روبه‌رو", sort_order=1),
                            ServiceImageRequirement(title="نیم‌رخ راست", sort_order=2),
                            ServiceImageRequirement(title="نیم‌رخ چپ", sort_order=3),
                            ServiceImageRequirement(title="نمای زیر بینی", sort_order=4),
                        ],
                        sort_order=2,
                    ),
                    Service(
                        title="ویزیت و پیگیری بعد از عمل",
                        description="کنترل روند بهبود پس از جراحی",
                        duration_minutes=15,
                        icon_key="followup",
                        weekly_schedules=_default_service_days(),
                        sort_order=3,
                    ),
                ]
            )
        db.flush()
        clinic_days = {
            day.weekday: day
            for day in db.scalars(select(WeeklySchedule)).all()
        }
        for service in db.scalars(select(Service)).unique().all():
            service_days = {day.weekday for day in service.weekly_schedules}
            for weekday in range(7):
                if weekday in service_days:
                    continue
                clinic_day = clinic_days.get(weekday)
                service.weekly_schedules.append(
                    ServiceWeeklySchedule(
                        weekday=weekday,
                        enabled=clinic_day.enabled if clinic_day else False,
                        start_time=(clinic_day.start_time if clinic_day else time(16, 0)),
                        end_time=(clinic_day.end_time if clinic_day else time(20, 0)),
                    )
                )
        seed_sms_rules(db)
        if settings.bootstrap_admin_username and settings.bootstrap_admin_password:
            if len(settings.bootstrap_admin_password) < 12:
                raise RuntimeError("رمز مدیر اولیه باید دست‌کم ۱۲ نویسه داشته باشد")
            username = settings.bootstrap_admin_username.lower()
            if not db.scalar(select(StaffUser).where(StaffUser.username == username)):
                db.add(
                    StaffUser(
                        username=username,
                        full_name="مدیر سامانه",
                        password_hash=hash_password(settings.bootstrap_admin_password),
                        role="admin",
                    )
                )
                db.flush()
                assign_legacy_role(db, db.scalar(select(StaffUser).where(StaffUser.username == username)))
                logger.warning("مدیر اولیه ساخته شد؛ اطلاعات راه‌اندازی مدیر را از فایل .env حذف کنید")


@asynccontextmanager
async def lifespan(_app: FastAPI):
    seed_defaults()
    from .runtime_settings import get_settings as runtime_settings
    _app.title = runtime_settings().app_name
    _app.openapi_schema = None
    yield


app = FastAPI(
    title=settings.app_name,
    version=VERSION,
    docs_url="/api/docs" if settings.debug else None,
    redoc_url=None,
    openapi_url="/api/openapi.json" if settings.debug else None,
    lifespan=lifespan,
)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(_request, _exc: RequestValidationError) -> JSONResponse:
    return JSONResponse(
        status_code=422,
        content={
            "detail": "اطلاعات واردشده معتبر نیست؛ لطفاً فیلدهای فرم را بررسی کنید"
        },
    )

if settings.allowed_origins:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=list(settings.allowed_origins),
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
        allow_headers=["Authorization", "Content-Type", "X-CSRF-Token", "X-Session-Transport"],
    )


@app.middleware("http")
async def private_response_headers(request, call_next):
    if request.url.path in {app.docs_url, app.openapi_url}:
        from .runtime_settings import get_settings as runtime_settings
        app.title = runtime_settings().app_name
        app.openapi_schema = None
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    if request.url.path.startswith(settings.api_prefix):
        response.headers["Cache-Control"] = "no-store"
        response.headers["X-Robots-Tag"] = "noindex, nofollow"
    return response


@app.get("/api/health", tags=["system"])
def health() -> dict[str, str]:
    from .runtime_settings import get_settings as runtime_settings
    return {"status": "ok", "service": runtime_settings().app_name, "version": VERSION}


app.include_router(auth.router, prefix=settings.api_prefix)
app.include_router(auth.staff_router, prefix=settings.api_prefix)
app.include_router(patient.router, prefix=settings.api_prefix)
app.include_router(staff.router, prefix=settings.api_prefix)
app.include_router(access.router, prefix=settings.api_prefix)
app.include_router(realtime_router, prefix=settings.api_prefix)


@app.exception_handler(SettingsUnavailable)
async def unavailable_settings(_request, exc):
    return JSONResponse(status_code=503, content={"detail": str(exc)})

app.include_router(settings_router.router, prefix=settings.api_prefix)
from . import public_articles  # Register editorial HTML before copying router routes.
app.include_router(public_pages_router)
app.include_router(public_services_router)

from .routers import bot as bot_router, mfa as mfa_router
app.include_router(bot_router.router, prefix=settings.api_prefix)
app.include_router(mfa_router.router, prefix=settings.api_prefix)

from .routers import content as content_router
app.include_router(content_router.router, prefix=settings.api_prefix)
app.include_router(content_router.staff_router, prefix=settings.api_prefix)
from .routers import comments as comments_router
app.include_router(comments_router.router, prefix=settings.api_prefix)
app.include_router(comments_router.staff_router, prefix=settings.api_prefix)
from .routers import site_services as site_services_router
app.include_router(site_services_router.router, prefix=settings.api_prefix)
app.include_router(site_services_router.staff_router, prefix=settings.api_prefix)
from .routers import site_content as site_content_router
app.include_router(site_content_router.router, prefix=settings.api_prefix)
app.include_router(site_content_router.staff_router, prefix=settings.api_prefix)
