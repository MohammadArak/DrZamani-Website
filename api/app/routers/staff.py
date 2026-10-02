"""Staff route composition; domain handlers retain their public API contracts."""
from fastapi import APIRouter
from . import staff_identity, staff_patients, staff_settings, staff_appointments, staff_consultations, staff_operations, staff_sms

router = APIRouter(prefix="/staff", tags=["staff portal"])
router.include_router(staff_identity.router)
router.include_router(staff_patients.router)
router.include_router(staff_settings.router)
router.include_router(staff_appointments.router)
router.include_router(staff_consultations.router)
router.include_router(staff_operations.router)
router.include_router(staff_sms.router)
