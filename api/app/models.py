from __future__ import annotations

import json
from datetime import date, datetime, time, timezone

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    ForeignKey,
    Float,
    Index,
    Integer,
    String,
    Text,
    Time,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


class Patient(Base):
    __tablename__ = "patients"

    id: Mapped[int] = mapped_column(primary_key=True)
    phone: Mapped[str] = mapped_column(String(16), unique=True, index=True)
    first_name: Mapped[str | None] = mapped_column(String(80))
    last_name: Mapped[str | None] = mapped_column(String(100))
    birth_date_jalali: Mapped[str | None] = mapped_column(String(10))
    email: Mapped[str | None] = mapped_column(String(254))
    gender: Mapped[str | None] = mapped_column(String(16))
    national_id: Mapped[str | None] = mapped_column(String(24), unique=True)
    is_foreign_national: Mapped[bool] = mapped_column(Boolean, default=False)
    foreign_identifier: Mapped[str | None] = mapped_column(String(40), unique=True)
    profile_completed: Mapped[bool] = mapped_column(Boolean, default=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    internal_note: Mapped[str | None] = mapped_column(Text)
    tags_json: Mapped[str] = mapped_column(Text, default="[]")
    needs_follow_up: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    appointments: Mapped[list["Appointment"]] = relationship(back_populates="patient")

    @property
    def tags(self) -> list[str]:
        try:
            value = json.loads(self.tags_json or "[]")
        except (TypeError, json.JSONDecodeError):
            return []
        return [str(item) for item in value] if isinstance(value, list) else []


class OtpChallenge(Base):
    __tablename__ = "otp_challenges"

    id: Mapped[int] = mapped_column(primary_key=True)
    phone: Mapped[str] = mapped_column(String(16), index=True)
    purpose: Mapped[str] = mapped_column(String(24), default="login")
    code_hash: Mapped[str] = mapped_column(String(64))
    nonce: Mapped[str] = mapped_column(String(32))
    request_ip: Mapped[str] = mapped_column(String(64), index=True)
    attempts: Mapped[int] = mapped_column(Integer, default=0)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    consumed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, index=True)


class CaptchaChallenge(Base):
    __tablename__ = "captcha_challenges"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    code_hash: Mapped[str] = mapped_column(String(64))
    nonce: Mapped[str] = mapped_column(String(32))
    request_ip: Mapped[str] = mapped_column(String(64), index=True)
    attempts: Mapped[int] = mapped_column(Integer, default=0)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    consumed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, index=True)


class AuthSession(Base):
    __tablename__ = "auth_sessions"

    id: Mapped[int] = mapped_column(primary_key=True)
    token_hash: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    patient_id: Mapped[int | None] = mapped_column(ForeignKey("patients.id", ondelete="CASCADE"), index=True)
    staff_id: Mapped[int | None] = mapped_column(ForeignKey("staff_users.id", ondelete="CASCADE"), index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    staff_state_hash: Mapped[str | None] = mapped_column(String(64))


class AuthRateLimit(Base):
    __tablename__ = "auth_rate_limits"

    key: Mapped[str] = mapped_column(String(64), primary_key=True)
    attempts: Mapped[int] = mapped_column(Integer, default=0)
    resets_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)


class StaffUser(Base):
    __tablename__ = "staff_users"

    id: Mapped[int] = mapped_column(primary_key=True)
    username: Mapped[str] = mapped_column(String(80), unique=True, index=True)
    full_name: Mapped[str] = mapped_column(String(120))
    password_hash: Mapped[str] = mapped_column(String(256))
    role: Mapped[str] = mapped_column(String(24), default="secretary")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)
    roles: Mapped[list["Role"]] = relationship(secondary="staff_roles", lazy="selectin")
    mfa: Mapped["StaffMfa | None"] = relationship(lazy="selectin", uselist=False, cascade="all, delete-orphan")


class Role(Base):
    __tablename__ = "roles"
    id: Mapped[int] = mapped_column(primary_key=True)
    slug: Mapped[str] = mapped_column(String(80), unique=True)
    name: Mapped[str] = mapped_column(String(120))
    description: Mapped[str] = mapped_column(String(500), default="")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_system: Mapped[bool] = mapped_column(Boolean, default=False)
    revision: Mapped[int] = mapped_column(Integer, default=1)
    permissions: Mapped[list["Permission"]] = relationship(secondary="role_permissions", lazy="selectin")


class Permission(Base):
    __tablename__ = "permissions"
    code: Mapped[str] = mapped_column(String(80), primary_key=True)


class RolePermission(Base):
    __tablename__ = "role_permissions"
    role_id: Mapped[int] = mapped_column(ForeignKey("roles.id", ondelete="CASCADE"), primary_key=True)
    permission_code: Mapped[str] = mapped_column(ForeignKey("permissions.code", ondelete="CASCADE"), primary_key=True)


class StaffRole(Base):
    __tablename__ = "staff_roles"
    staff_id: Mapped[int] = mapped_column(ForeignKey("staff_users.id", ondelete="CASCADE"), primary_key=True)
    role_id: Mapped[int] = mapped_column(ForeignKey("roles.id", ondelete="CASCADE"), primary_key=True)


class ClinicSetting(Base):
    __tablename__ = "clinic_settings"

    id: Mapped[int] = mapped_column(primary_key=True, default=1)
    revision: Mapped[int] = mapped_column(Integer, default=1)
    seo_title: Mapped[str] = mapped_column(String(160), default="")
    seo_description: Mapped[str] = mapped_column(String(320), default="")
    seo_image_url: Mapped[str] = mapped_column(String(500), default="")
    doctor_name: Mapped[str] = mapped_column(String(120), default="دکتر فرزاد زمانی")
    specialty: Mapped[str] = mapped_column(String(160), default="متخصص گوش، حلق و بینی")
    medical_council_number: Mapped[str] = mapped_column(String(40), default="")
    office_phone: Mapped[str] = mapped_column(String(32), default="08633146179")
    consultation_phone: Mapped[str] = mapped_column(String(32), default="09217357728")
    email: Mapped[str] = mapped_column(String(254), default="info@drfarzadzamani.ir")
    address_region: Mapped[str] = mapped_column(String(120), default="استان مرکزی")
    address_city: Mapped[str] = mapped_column(String(120), default="اراک")
    address: Mapped[str] = mapped_column(
        Text,
        default="اراک، خیابان خرم، ساختمان پزشکان نیکان، طبقه ششم، واحد B",
    )
    working_hours: Mapped[str] = mapped_column(String(500), default="روزهای کاری، با هماهنگی قبلی")
    site_url: Mapped[str] = mapped_column(String(500), default="https://drfarzadzamani.ir")
    map_embed_url: Mapped[str] = mapped_column(
        String(1000),
        default="https://neshan.org/maps/iframe/places/QbrSKvPB4K9_/34.0784466/49.7015756",
    )
    map_page_url: Mapped[str] = mapped_column(
        String(1000),
        default="https://neshan.org/maps/places/QbrSKvPB4K9_",
    )
    map_latitude: Mapped[float] = mapped_column(Float, default=34.0784466)
    map_longitude: Mapped[float] = mapped_column(Float, default=49.7015756)
    instagram_url: Mapped[str] = mapped_column(
        String(500),
        default="https://instagram.com/dr.farzad.zamani",
    )
    eitaa_url: Mapped[str] = mapped_column(
        String(500),
        default="https://eitaa.com/drfarzadzamani",
    )
    slot_duration_minutes: Mapped[int] = mapped_column(Integer, default=20)
    booking_horizon_days: Mapped[int] = mapped_column(Integer, default=30)
    minimum_lead_hours: Mapped[int] = mapped_column(Integer, default=2)
    cancellation_cutoff_hours: Mapped[int] = mapped_column(Integer, default=12)
    reschedule_cutoff_hours: Mapped[int] = mapped_column(Integer, default=12)
    max_patient_reschedules: Mapped[int] = mapped_column(Integer, default=2)
    reminder_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    first_reminder_hours: Mapped[int] = mapped_column(Integer, default=24)
    final_reminder_hours: Mapped[int] = mapped_column(Integer, default=2)
    timezone_name: Mapped[str] = mapped_column(String(64), default="Asia/Tehran")
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)


class SystemSetting(Base):
    """One versioned runtime overlay. Secret values are authenticated ciphertext."""
    __tablename__ = "system_settings"
    id: Mapped[int] = mapped_column(primary_key=True, default=1)
    revision: Mapped[int] = mapped_column(Integer, default=1)
    overrides_json: Mapped[str] = mapped_column(Text, default="{}")


class SettingRevision(Base):
    __tablename__ = "setting_revisions"
    id: Mapped[int] = mapped_column(primary_key=True)
    revision: Mapped[int] = mapped_column(Integer, unique=True)
    snapshot_json: Mapped[str] = mapped_column(Text)
    changed_keys_json: Mapped[str] = mapped_column(Text, default="[]")
    actor_staff_id: Mapped[int | None] = mapped_column(ForeignKey("staff_users.id", ondelete="SET NULL"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class WeeklySchedule(Base):
    __tablename__ = "weekly_schedules"
    __table_args__ = (UniqueConstraint("weekday", name="uq_weekly_schedule_weekday"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    weekday: Mapped[int] = mapped_column(Integer)
    enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    start_time: Mapped[time] = mapped_column(Time, default=time(16, 0))
    end_time: Mapped[time] = mapped_column(Time, default=time(20, 0))


class ScheduleException(Base):
    __tablename__ = "schedule_exceptions"
    __table_args__ = (UniqueConstraint("exception_date", name="uq_schedule_exception_date"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    exception_date: Mapped[date] = mapped_column(Date, index=True)
    is_closed: Mapped[bool] = mapped_column(Boolean, default=True)
    start_time: Mapped[time | None] = mapped_column(Time)
    end_time: Mapped[time | None] = mapped_column(Time)
    note: Mapped[str | None] = mapped_column(String(255))


class Service(Base):
    __tablename__ = "services"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(120))
    description: Mapped[str] = mapped_column(String(300), default="")
    duration_minutes: Mapped[int] = mapped_column(Integer, default=20)
    icon_key: Mapped[str] = mapped_column(String(40), default="medical")
    allows_media_chat: Mapped[bool] = mapped_column(Boolean, default=False)
    price_toman: Mapped[int] = mapped_column(Integer, default=0)
    payment_mode: Mapped[str] = mapped_column(String(16), default="none")
    deposit_toman: Mapped[int] = mapped_column(Integer, default=0)
    urgent_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    urgent_extra_toman: Mapped[int] = mapped_column(Integer, default=0)
    buffer_before_minutes: Mapped[int] = mapped_column(Integer, default=0)
    buffer_after_minutes: Mapped[int] = mapped_column(Integer, default=0)
    concurrent_capacity: Mapped[int] = mapped_column(Integer, default=1)
    pre_visit_instructions: Mapped[str] = mapped_column(Text, default="")
    post_visit_instructions: Mapped[str] = mapped_column(Text, default="")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, index=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    appointments: Mapped[list["Appointment"]] = relationship(back_populates="service")
    image_requirements: Mapped[list["ServiceImageRequirement"]] = relationship(
        back_populates="service",
        cascade="all, delete-orphan",
        order_by="ServiceImageRequirement.sort_order",
    )
    weekly_schedules: Mapped[list["ServiceWeeklySchedule"]] = relationship(
        back_populates="service",
        cascade="all, delete-orphan",
        order_by="ServiceWeeklySchedule.weekday",
    )
    urgent_schedules: Mapped[list["ServiceUrgentSchedule"]] = relationship(
        back_populates="service",
        cascade="all, delete-orphan",
        order_by="ServiceUrgentSchedule.weekday",
    )
    schedule_exceptions: Mapped[list["ServiceScheduleException"]] = relationship(
        back_populates="service",
        cascade="all, delete-orphan",
        order_by="ServiceScheduleException.exception_date",
    )
    intake_questions: Mapped[list["ServiceIntakeQuestion"]] = relationship(
        back_populates="service",
        cascade="all, delete-orphan",
        order_by="ServiceIntakeQuestion.sort_order",
    )
    consents: Mapped[list["ServiceConsent"]] = relationship(
        back_populates="service",
        cascade="all, delete-orphan",
        order_by="ServiceConsent.sort_order",
    )


class ServiceImageRequirement(Base):
    __tablename__ = "service_image_requirements"
    __table_args__ = (
        UniqueConstraint("service_id", "title", name="uq_service_image_requirement_title"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    service_id: Mapped[int] = mapped_column(
        ForeignKey("services.id", ondelete="CASCADE"), index=True
    )
    title: Mapped[str] = mapped_column(String(100))
    is_required: Mapped[bool] = mapped_column(Boolean, default=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)

    service: Mapped[Service] = relationship(back_populates="image_requirements")


class ServiceIntakeQuestion(Base):
    __tablename__ = "service_intake_questions"

    id: Mapped[int] = mapped_column(primary_key=True)
    service_id: Mapped[int] = mapped_column(
        ForeignKey("services.id", ondelete="CASCADE"), index=True
    )
    label: Mapped[str] = mapped_column(String(240))
    field_type: Mapped[str] = mapped_column(String(24), default="short_text")
    options_json: Mapped[str] = mapped_column(Text, default="[]")
    is_required: Mapped[bool] = mapped_column(Boolean, default=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)

    service: Mapped[Service] = relationship(back_populates="intake_questions")

    @property
    def options(self) -> list[str]:
        try:
            value = json.loads(self.options_json or "[]")
        except (TypeError, json.JSONDecodeError):
            return []
        return [str(item) for item in value] if isinstance(value, list) else []


class ServiceConsent(Base):
    __tablename__ = "service_consents"

    id: Mapped[int] = mapped_column(primary_key=True)
    service_id: Mapped[int] = mapped_column(
        ForeignKey("services.id", ondelete="CASCADE"), index=True
    )
    title: Mapped[str] = mapped_column(String(160))
    body: Mapped[str] = mapped_column(Text)
    is_required: Mapped[bool] = mapped_column(Boolean, default=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)

    service: Mapped[Service] = relationship(back_populates="consents")


class ServiceWeeklySchedule(Base):
    __tablename__ = "service_weekly_schedules"
    __table_args__ = (
        UniqueConstraint("service_id", "weekday", name="uq_service_weekly_schedule_day"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    service_id: Mapped[int] = mapped_column(
        ForeignKey("services.id", ondelete="CASCADE"), index=True
    )
    weekday: Mapped[int] = mapped_column(Integer)
    enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    start_time: Mapped[time] = mapped_column(Time, default=time(16, 0))
    end_time: Mapped[time] = mapped_column(Time, default=time(20, 0))

    service: Mapped[Service] = relationship(back_populates="weekly_schedules")


class ServiceUrgentSchedule(Base):
    __tablename__ = "service_urgent_schedules"
    __table_args__ = (
        UniqueConstraint("service_id", "weekday", name="uq_service_urgent_schedule_day"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    service_id: Mapped[int] = mapped_column(
        ForeignKey("services.id", ondelete="CASCADE"), index=True
    )
    weekday: Mapped[int] = mapped_column(Integer)
    enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    start_time: Mapped[time] = mapped_column(Time, default=time(12, 0))
    end_time: Mapped[time] = mapped_column(Time, default=time(14, 0))

    service: Mapped[Service] = relationship(back_populates="urgent_schedules")


class ServiceScheduleException(Base):
    __tablename__ = "service_schedule_exceptions"
    __table_args__ = (
        UniqueConstraint(
            "service_id",
            "exception_date",
            name="uq_service_schedule_exception_date",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    service_id: Mapped[int] = mapped_column(
        ForeignKey("services.id", ondelete="CASCADE"), index=True
    )
    exception_date: Mapped[date] = mapped_column(Date, index=True)
    is_closed: Mapped[bool] = mapped_column(Boolean, default=True)
    start_time: Mapped[time | None] = mapped_column(Time)
    end_time: Mapped[time | None] = mapped_column(Time)
    note: Mapped[str | None] = mapped_column(String(255))

    service: Mapped[Service] = relationship(back_populates="schedule_exceptions")


class BookingHold(Base):
    __tablename__ = "booking_holds"

    id: Mapped[str] = mapped_column(String(48), primary_key=True)
    patient_id: Mapped[int] = mapped_column(
        ForeignKey("patients.id", ondelete="CASCADE"), index=True
    )
    service_id: Mapped[int] = mapped_column(
        ForeignKey("services.id", ondelete="RESTRICT"), index=True
    )
    appointment_date: Mapped[date] = mapped_column(Date, index=True)
    start_time: Mapped[time] = mapped_column(Time)
    end_time: Mapped[time] = mapped_column(Time)
    is_urgent: Mapped[bool] = mapped_column(Boolean, default=False)
    has_previous_visit: Mapped[bool] = mapped_column(Boolean, default=False)
    patient_note: Mapped[str | None] = mapped_column(String(500))
    price_toman: Mapped[int] = mapped_column(Integer, default=0)
    amount_toman: Mapped[int] = mapped_column(Integer, default=0)
    payment_mode: Mapped[str] = mapped_column(String(16), default="none")
    status: Mapped[str] = mapped_column(String(24), default="pending_payment", index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    patient: Mapped[Patient] = relationship()
    service: Mapped[Service] = relationship()
    payment: Mapped["Payment | None"] = relationship(back_populates="hold", uselist=False)


class Payment(Base):
    __tablename__ = "payments"
    __table_args__ = (
        Index("ix_payments_hold_id", "hold_id"),
        Index("ix_payments_authority", "authority"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    hold_id: Mapped[str] = mapped_column(
        ForeignKey("booking_holds.id", ondelete="RESTRICT"), unique=True
    )
    provider: Mapped[str] = mapped_column(String(24), default="zarinpal")
    amount_toman: Mapped[int] = mapped_column(Integer)
    authority: Mapped[str | None] = mapped_column(String(64), unique=True)
    ref_id: Mapped[str | None] = mapped_column(String(80), unique=True)
    status: Mapped[str] = mapped_column(String(24), default="created", index=True)
    raw_response: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)
    verified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    refund_status: Mapped[str] = mapped_column(String(24), default="none", index=True)
    refund_amount_toman: Mapped[int] = mapped_column(Integer, default=0)
    refund_reference: Mapped[str | None] = mapped_column(String(120))
    refund_note: Mapped[str | None] = mapped_column(String(500))
    refunded_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    hold: Mapped[BookingHold] = relationship(back_populates="payment")
    appointment: Mapped["Appointment | None"] = relationship(back_populates="payment", uselist=False)


class Appointment(Base):
    __tablename__ = "appointments"
    __table_args__ = (
        UniqueConstraint("payment_id", name="uq_appointments_payment_id"),
        Index("ix_appointments_payment_id", "payment_id"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    tracking_code: Mapped[str] = mapped_column(String(16), unique=True, index=True)
    patient_id: Mapped[int] = mapped_column(ForeignKey("patients.id", ondelete="RESTRICT"), index=True)
    service_id: Mapped[int] = mapped_column(ForeignKey("services.id", ondelete="RESTRICT"), index=True)
    appointment_date: Mapped[date] = mapped_column(Date, index=True)
    start_time: Mapped[time] = mapped_column(Time)
    end_time: Mapped[time] = mapped_column(Time)
    slot_key: Mapped[str | None] = mapped_column(String(32), unique=True, index=True)
    has_previous_visit: Mapped[bool] = mapped_column(Boolean, default=False)
    is_urgent: Mapped[bool] = mapped_column(Boolean, default=False)
    price_toman: Mapped[int] = mapped_column(Integer, default=0)
    amount_paid_toman: Mapped[int] = mapped_column(Integer, default=0)
    payment_status: Mapped[str] = mapped_column(String(24), default="not_required", index=True)
    payment_id: Mapped[int | None] = mapped_column(
        ForeignKey("payments.id", ondelete="SET NULL")
    )
    status: Mapped[str] = mapped_column(String(24), default="pending", index=True)
    patient_note: Mapped[str | None] = mapped_column(String(500))
    staff_note: Mapped[str | None] = mapped_column(String(500))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)
    cancelled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    rescheduled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    patient_reschedule_count: Mapped[int] = mapped_column(Integer, default=0)
    intake_form_snapshot_json: Mapped[str | None] = mapped_column(Text)
    intake_submission_json: Mapped[str | None] = mapped_column(Text)
    intake_submitted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    rescheduled_by_staff_id: Mapped[int | None] = mapped_column(
        ForeignKey("staff_users.id", ondelete="SET NULL"), index=True
    )

    patient: Mapped[Patient] = relationship(back_populates="appointments")
    service: Mapped[Service] = relationship(back_populates="appointments")
    payment: Mapped[Payment | None] = relationship(back_populates="appointment")
    consultation_messages: Mapped[list["ConsultationMessage"]] = relationship(
        back_populates="appointment",
        cascade="all, delete-orphan",
        order_by="ConsultationMessage.created_at",
    )
    reminder_dispatches: Mapped[list["AppointmentReminder"]] = relationship(
        back_populates="appointment",
        cascade="all, delete-orphan",
        order_by="AppointmentReminder.queued_at",
    )


class AppointmentReminder(Base):
    __tablename__ = "appointment_reminders"
    __table_args__ = (
        UniqueConstraint(
            "appointment_id",
            "reminder_key",
            name="uq_appointment_reminder_key",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    appointment_id: Mapped[int] = mapped_column(
        ForeignKey("appointments.id", ondelete="CASCADE"), index=True
    )
    reminder_key: Mapped[str] = mapped_column(String(24))
    hours_before: Mapped[int] = mapped_column(Integer)
    scheduled_for: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    queued_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    outbox_id: Mapped[int | None] = mapped_column(
        ForeignKey("sms_outbox.id", ondelete="SET NULL"), index=True
    )

    appointment: Mapped[Appointment] = relationship(back_populates="reminder_dispatches")


class ConsultationMessage(Base):
    __tablename__ = "consultation_messages"
    __table_args__ = (
        UniqueConstraint(
            "appointment_id",
            "image_requirement_id",
            name="uq_consultation_required_image",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    appointment_id: Mapped[int] = mapped_column(
        ForeignKey("appointments.id", ondelete="CASCADE"), index=True
    )
    sender_type: Mapped[str] = mapped_column(String(16))
    sender_staff_id: Mapped[int | None] = mapped_column(
        ForeignKey("staff_users.id", ondelete="SET NULL"), index=True
    )
    body: Mapped[str | None] = mapped_column(String(2000))
    view_label: Mapped[str | None] = mapped_column(String(32))
    image_requirement_id: Mapped[int | None] = mapped_column(
        ForeignKey("service_image_requirements.id", ondelete="SET NULL"), index=True
    )
    original_file_name: Mapped[str | None] = mapped_column(String(255))
    stored_file_name: Mapped[str | None] = mapped_column(String(255), unique=True)
    content_type: Mapped[str | None] = mapped_column(String(80))
    size_bytes: Mapped[int | None] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, index=True)
    read_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), index=True)

    appointment: Mapped[Appointment] = relationship(back_populates="consultation_messages")
    sender_staff: Mapped[StaffUser | None] = relationship()
    image_requirement: Mapped[ServiceImageRequirement | None] = relationship()


class SmsAutomationRule(Base):
    __tablename__ = "sms_automation_rules"
    __table_args__ = (Index("ix_sms_automation_rules_event_key", "event_key"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    event_key: Mapped[str] = mapped_column(String(48), unique=True)
    title: Mapped[str] = mapped_column(String(120))
    enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    template_text: Mapped[str] = mapped_column(String(1000), default="")
    provider_pattern_code: Mapped[str] = mapped_column(String(120), default="")
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)


class SmsCampaign(Base):
    __tablename__ = "sms_campaigns"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(120))
    message_text: Mapped[str] = mapped_column(String(1000))
    provider_pattern_code: Mapped[str] = mapped_column(String(120), default="")
    filters_json: Mapped[str] = mapped_column(Text, default="{}")
    status: Mapped[str] = mapped_column(String(24), default="queued", index=True)
    recipient_count: Mapped[int] = mapped_column(Integer, default=0)
    sent_count: Mapped[int] = mapped_column(Integer, default=0)
    failed_count: Mapped[int] = mapped_column(Integer, default=0)
    created_by_staff_id: Mapped[int | None] = mapped_column(
        ForeignKey("staff_users.id", ondelete="SET NULL"), index=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, index=True)

    created_by: Mapped[StaffUser | None] = relationship()
    outbox_items: Mapped[list["SmsOutbox"]] = relationship(back_populates="campaign")


class SmsOutbox(Base):
    __tablename__ = "sms_outbox"

    id: Mapped[int] = mapped_column(primary_key=True)
    event_key: Mapped[str] = mapped_column(String(48), index=True)
    patient_id: Mapped[int | None] = mapped_column(
        ForeignKey("patients.id", ondelete="SET NULL"), index=True
    )
    appointment_id: Mapped[int | None] = mapped_column(
        ForeignKey("appointments.id", ondelete="SET NULL"), index=True
    )
    campaign_id: Mapped[int | None] = mapped_column(
        ForeignKey("sms_campaigns.id", ondelete="SET NULL"), index=True
    )
    phone: Mapped[str] = mapped_column(String(16), index=True)
    rendered_body: Mapped[str] = mapped_column(String(1000))
    provider_pattern_code: Mapped[str] = mapped_column(String(120), default="")
    variables_json: Mapped[str] = mapped_column(Text, default="{}")
    status: Mapped[str] = mapped_column(String(24), default="pending", index=True)
    attempts: Mapped[int] = mapped_column(Integer, default=0)
    last_error: Mapped[str | None] = mapped_column(String(500))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, index=True)
    sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    campaign: Mapped[SmsCampaign | None] = relationship(back_populates="outbox_items")


class WaitlistEntry(Base):
    __tablename__ = "waitlist_entries"
    __table_args__ = (
        Index("ix_waitlist_service_status", "service_id", "status"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    patient_id: Mapped[int] = mapped_column(
        ForeignKey("patients.id", ondelete="CASCADE"), index=True
    )
    service_id: Mapped[int] = mapped_column(
        ForeignKey("services.id", ondelete="CASCADE"), index=True
    )
    desired_date: Mapped[date | None] = mapped_column(Date, index=True)
    is_urgent: Mapped[bool] = mapped_column(Boolean, default=False)
    status: Mapped[str] = mapped_column(String(24), default="waiting", index=True)
    offered_date: Mapped[date | None] = mapped_column(Date)
    offered_start_time: Mapped[time | None] = mapped_column(Time)
    offered_end_time: Mapped[time | None] = mapped_column(Time)
    notified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, index=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    patient: Mapped[Patient] = relationship()
    service: Mapped[Service] = relationship()


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[int] = mapped_column(primary_key=True)
    actor_staff_id: Mapped[int | None] = mapped_column(
        ForeignKey("staff_users.id", ondelete="SET NULL"), index=True
    )
    actor_patient_id: Mapped[int | None] = mapped_column(
        ForeignKey("patients.id", ondelete="SET NULL"), index=True
    )
    action: Mapped[str] = mapped_column(String(80), index=True)
    entity_type: Mapped[str] = mapped_column(String(50), index=True)
    entity_id: Mapped[str | None] = mapped_column(String(80), index=True)
    summary: Mapped[str] = mapped_column(String(255))
    details_json: Mapped[str] = mapped_column(Text, default="{}")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, index=True)

    actor_staff: Mapped[StaffUser | None] = relationship()
    actor_patient: Mapped[Patient | None] = relationship()


class BotChallenge(Base):
    __tablename__ = "bot_challenges"
    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    provider: Mapped[str] = mapped_column(String(24))
    operation: Mapped[str] = mapped_column(String(32))
    ip_hash: Mapped[str] = mapped_column(String(64))
    policy_hash: Mapped[str] = mapped_column(String(64))
    fallback_used: Mapped[bool] = mapped_column(Boolean, default=False)
    token_hash: Mapped[str | None] = mapped_column(String(64), unique=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(), index=True)
    consumed_at: Mapped[datetime | None] = mapped_column(DateTime())


class CaptchaAttestation(Base):
    __tablename__ = "captcha_attestations"
    fingerprint: Mapped[str] = mapped_column(String(64), primary_key=True)
    provider: Mapped[str] = mapped_column(String(24))
    actor_staff_id: Mapped[int | None] = mapped_column(ForeignKey("staff_users.id", ondelete="SET NULL"))
    verified_at: Mapped[datetime] = mapped_column(DateTime(), default=utcnow)


class StaffMfa(Base):
    __tablename__ = "staff_mfa"
    staff_id: Mapped[int] = mapped_column(ForeignKey("staff_users.id", ondelete="CASCADE"), primary_key=True)
    enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    secret_json: Mapped[str] = mapped_column(Text, default="{}")
    recovery_hashes_json: Mapped[str] = mapped_column(Text, default="[]")
    revision: Mapped[int] = mapped_column(Integer, default=1)
    last_counter: Mapped[int] = mapped_column(Integer, default=-1)
    pending_json: Mapped[str | None] = mapped_column(Text)
    pending_id: Mapped[str | None] = mapped_column(String(64))
    pending_expires_at: Mapped[datetime | None] = mapped_column(DateTime())


class MfaChallenge(Base):
    __tablename__ = "mfa_challenges"
    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    staff_id: Mapped[int] = mapped_column(ForeignKey("staff_users.id", ondelete="CASCADE"), index=True)
    state_hash: Mapped[str] = mapped_column(String(64))
    ip_hash: Mapped[str] = mapped_column(String(64))
    browser: Mapped[bool] = mapped_column(Boolean)
    expires_at: Mapped[datetime] = mapped_column(DateTime(), index=True)
    attempts: Mapped[int] = mapped_column(Integer, default=0)
    consumed_at: Mapped[datetime | None] = mapped_column(DateTime())
