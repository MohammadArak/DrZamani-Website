from __future__ import annotations

import re
from datetime import date, datetime, time
from urllib.parse import urlparse

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator, model_validator

from .security import normalize_digits, normalize_phone, validate_national_id


class ApiMessage(BaseModel):
    message: str


class OtpRequest(BaseModel):
    phone: str

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, value: str) -> str:
        try:
            return normalize_phone(value)
        except ValueError as exc:
            raise ValueError(str(exc)) from exc


class OtpRequestResponse(BaseModel):
    message: str
    retry_after_seconds: int
    code_length: int = 6
    debug_otp: str | None = None


class OtpVerifyRequest(BaseModel):
    phone: str
    code: str = Field(min_length=4, max_length=8)

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, value: str) -> str:
        return normalize_phone(value)

    @field_validator("code")
    @classmethod
    def validate_code(cls, value: str) -> str:
        normalized = normalize_digits(value).strip()
        if not normalized.isdigit():
            raise ValueError("کد تأیید باید عددی باشد")
        return normalized


class SessionResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_at: str
    profile_completed: bool


class CaptchaResponse(BaseModel):
    captcha_id: str
    image_data: str
    expires_in_seconds: int
    debug_answer: str | None = None


class PatientProfileUpdate(BaseModel):
    first_name: str = Field(min_length=2, max_length=80)
    last_name: str = Field(min_length=2, max_length=100)
    birth_date_jalali: str = Field(pattern=r"^\d{4}/\d{2}/\d{2}$")
    email: EmailStr | None = None
    gender: str = Field(pattern=r"^(female|male)$")
    national_id: str | None = None
    is_foreign_national: bool = False
    foreign_identifier: str | None = Field(default=None, max_length=40)

    @field_validator("birth_date_jalali", "national_id", "foreign_identifier", mode="before")
    @classmethod
    def normalize_numeric_values(cls, value: str | None) -> str | None:
        if value is None:
            return None
        return normalize_digits(value).strip()

    @model_validator(mode="after")
    def validate_identity(self) -> "PatientProfileUpdate":
        if self.is_foreign_national:
            if not self.foreign_identifier:
                raise ValueError("شناسه اتباع خارجی الزامی است")
            self.national_id = None
        else:
            if not self.national_id or not validate_national_id(self.national_id):
                raise ValueError("کد ملی معتبر نیست")
            self.foreign_identifier = None
        return self


class PatientProfile(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    phone: str
    first_name: str | None
    last_name: str | None
    birth_date_jalali: str | None
    email: str | None
    gender: str | None
    national_id: str | None
    is_foreign_national: bool
    foreign_identifier: str | None
    profile_completed: bool


class ServiceIntakeQuestionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    label: str
    field_type: str
    options: list[str]
    is_required: bool
    sort_order: int


class ServiceIntakeQuestionWrite(BaseModel):
    label: str = Field(min_length=2, max_length=240)
    field_type: str = Field(
        default="short_text",
        pattern=r"^(short_text|long_text|yes_no|single_choice)$",
    )
    options: list[str] = Field(default_factory=list, max_length=12)
    is_required: bool = False
    sort_order: int = Field(default=0, ge=0, le=100)

    @model_validator(mode="after")
    def validate_options(self) -> "ServiceIntakeQuestionWrite":
        self.label = self.label.strip()
        self.options = [item.strip() for item in self.options if item.strip()]
        if self.field_type == "single_choice" and len(self.options) < 2:
            raise ValueError("سؤال چندگزینه‌ای باید دست‌کم دو گزینه داشته باشد")
        if self.field_type != "single_choice":
            self.options = []
        if len(set(self.options)) != len(self.options):
            raise ValueError("گزینه‌های هر سؤال باید یکتا باشند")
        return self


class ServiceConsentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    body: str
    is_required: bool
    sort_order: int


class ServiceConsentWrite(BaseModel):
    title: str = Field(min_length=2, max_length=160)
    body: str = Field(min_length=5, max_length=4000)
    is_required: bool = True
    sort_order: int = Field(default=0, ge=0, le=100)


class ServiceRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    description: str
    duration_minutes: int
    icon_key: str
    allows_media_chat: bool
    price_toman: int
    payment_mode: str
    deposit_toman: int
    urgent_enabled: bool
    urgent_extra_toman: int
    buffer_before_minutes: int
    buffer_after_minutes: int
    concurrent_capacity: int
    pre_visit_instructions: str
    post_visit_instructions: str
    image_requirements: list["ServiceImageRequirementRead"]
    weekly_schedules: list["ServiceWeeklyScheduleRead"]
    urgent_schedules: list["ServiceUrgentScheduleRead"]
    intake_questions: list[ServiceIntakeQuestionRead]
    consents: list[ServiceConsentRead]
    is_active: bool
    sort_order: int


class ServiceImageRequirementRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    is_required: bool
    sort_order: int


class ServiceImageRequirementWrite(BaseModel):
    title: str = Field(min_length=2, max_length=100)
    is_required: bool = True
    sort_order: int = Field(default=0, ge=0, le=100)


class ServiceWeeklyScheduleRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    weekday: int
    enabled: bool
    start_time: time
    end_time: time


class ServiceWeeklyScheduleWrite(BaseModel):
    weekday: int = Field(ge=0, le=6)
    enabled: bool = False
    start_time: time
    end_time: time

    @model_validator(mode="after")
    def validate_period(self) -> "ServiceWeeklyScheduleWrite":
        if self.enabled and self.end_time <= self.start_time:
            raise ValueError("ساعت پایان خدمت باید بعد از ساعت شروع باشد")
        return self


class ServiceUrgentScheduleRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    weekday: int
    enabled: bool
    start_time: time
    end_time: time


class ServiceUrgentScheduleWrite(BaseModel):
    weekday: int = Field(ge=0, le=6)
    enabled: bool = False
    start_time: time
    end_time: time

    @model_validator(mode="after")
    def validate_period(self) -> "ServiceUrgentScheduleWrite":
        if self.enabled and self.end_time <= self.start_time:
            raise ValueError("ساعت پایان نوبت فوری باید بعد از ساعت شروع باشد")
        return self


class ServiceWrite(BaseModel):
    title: str = Field(min_length=2, max_length=120)
    description: str = Field(default="", max_length=300)
    duration_minutes: int = Field(default=20, ge=5, le=240)
    icon_key: str = Field(default="medical", pattern=r"^(medical|nose|ear|throat|surgery|followup|consultation)$")
    allows_media_chat: bool = False
    price_toman: int = Field(default=0, ge=0, le=2_000_000_000)
    payment_mode: str = Field(default="none", pattern=r"^(none|deposit|full)$")
    deposit_toman: int = Field(default=0, ge=0, le=2_000_000_000)
    urgent_enabled: bool = False
    urgent_extra_toman: int = Field(default=0, ge=0, le=2_000_000_000)
    buffer_before_minutes: int = Field(default=0, ge=0, le=180)
    buffer_after_minutes: int = Field(default=0, ge=0, le=180)
    concurrent_capacity: int = Field(default=1, ge=1, le=20)
    pre_visit_instructions: str = Field(default="", max_length=5000)
    post_visit_instructions: str = Field(default="", max_length=5000)
    image_requirements: list[ServiceImageRequirementWrite] = Field(default_factory=list, max_length=20)
    weekly_schedules: list[ServiceWeeklyScheduleWrite] = Field(default_factory=list, max_length=7)
    urgent_schedules: list[ServiceUrgentScheduleWrite] = Field(default_factory=list, max_length=7)
    intake_questions: list[ServiceIntakeQuestionWrite] = Field(default_factory=list, max_length=30)
    consents: list[ServiceConsentWrite] = Field(default_factory=list, max_length=12)
    is_active: bool = True
    sort_order: int = Field(default=0, ge=0, le=999)

    @model_validator(mode="after")
    def validate_service_options(self) -> "ServiceWrite":
        normalized_titles = [item.title.strip() for item in self.image_requirements]
        if len(set(normalized_titles)) != len(normalized_titles):
            raise ValueError("عنوان عکس‌های موردنیاز باید یکتا باشد")
        question_labels = [item.label.strip() for item in self.intake_questions]
        if len(set(question_labels)) != len(question_labels):
            raise ValueError("عنوان سؤال‌های شرح‌حال باید یکتا باشد")
        consent_titles = [item.title.strip() for item in self.consents]
        if len(set(consent_titles)) != len(consent_titles):
            raise ValueError("عنوان رضایت‌نامه‌ها باید یکتا باشد")
        if self.image_requirements and not self.allows_media_chat:
            raise ValueError("برای تعریف عکس‌های موردنیاز، گفت‌وگوی آنلاین باید فعال باشد")
        if self.payment_mode == "full" and self.price_toman <= 0:
            raise ValueError("برای پرداخت کامل، مبلغ خدمت باید بیشتر از صفر باشد")
        if self.payment_mode == "deposit":
            if self.price_toman <= 0:
                raise ValueError("برای دریافت بیعانه، مبلغ کل خدمت باید بیشتر از صفر باشد")
            if self.deposit_toman <= 0:
                raise ValueError("مبلغ بیعانه باید بیشتر از صفر باشد")
            if self.price_toman and self.deposit_toman > self.price_toman:
                raise ValueError("مبلغ بیعانه نمی‌تواند بیشتر از مبلغ خدمت باشد")
        if self.payment_mode == "none":
            self.deposit_toman = 0
        if not self.urgent_enabled:
            self.urgent_extra_toman = 0
        normal_payable = (
            self.price_toman
            if self.payment_mode == "full"
            else self.deposit_toman
            if self.payment_mode == "deposit"
            else 0
        )
        if 0 < normal_payable < 1_000:
            raise ValueError("مبلغ پرداخت آنلاین باید حداقل هزار تومان باشد")
        if self.urgent_enabled and 0 < normal_payable + self.urgent_extra_toman < 1_000:
            raise ValueError("مبلغ پرداخت نوبت فوری باید حداقل هزار تومان باشد")
        weekdays = [item.weekday for item in self.weekly_schedules]
        if weekdays and set(weekdays) != set(range(7)):
            raise ValueError("برنامه عادی خدمت باید شامل هر هفت روز هفته باشد")
        if len(set(weekdays)) != len(weekdays):
            raise ValueError("برای هر روز فقط یک برنامه عادی خدمت قابل ثبت است")
        weekdays = [item.weekday for item in self.urgent_schedules]
        if len(set(weekdays)) != len(weekdays):
            raise ValueError("برای هر روز فقط یک برنامه نوبت فوری قابل ثبت است")
        return self


class ClinicSettingRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    revision: int = 1
    seo_title: str = ""
    seo_description: str = ""
    seo_image_url: str = ""

    doctor_name: str
    specialty: str
    medical_council_number: str
    office_phone: str
    consultation_phone: str
    email: str
    address_region: str
    address_city: str
    address: str
    working_hours: str
    site_url: str
    map_embed_url: str
    map_page_url: str
    map_latitude: float
    map_longitude: float
    instagram_url: str
    eitaa_url: str
    slot_duration_minutes: int
    booking_horizon_days: int
    minimum_lead_hours: int
    cancellation_cutoff_hours: int
    reschedule_cutoff_hours: int
    max_patient_reschedules: int
    reminder_enabled: bool
    first_reminder_hours: int
    final_reminder_hours: int
    timezone_name: str


class ClinicSettingUpdate(ClinicSettingRead):
    model_config = ConfigDict(from_attributes=True, extra="forbid")
    revision: int = Field(default=1, ge=1)
    seo_title: str = Field(default="", max_length=160)
    seo_description: str = Field(default="", max_length=320)
    seo_image_url: str = Field(default="", max_length=500)
    doctor_name: str = Field(min_length=2, max_length=120)
    specialty: str = Field(min_length=2, max_length=160)
    medical_council_number: str = Field(default="", max_length=40)
    office_phone: str = Field(min_length=7, max_length=32)
    consultation_phone: str = Field(min_length=7, max_length=32)
    email: EmailStr
    address_region: str = Field(min_length=2, max_length=120)
    address_city: str = Field(min_length=2, max_length=120)
    address: str = Field(min_length=5, max_length=1000)
    working_hours: str = Field(min_length=2, max_length=500)
    site_url: str = Field(min_length=8, max_length=500)
    map_embed_url: str = Field(default="", max_length=1000)
    map_page_url: str = Field(default="", max_length=1000)
    map_latitude: float = Field(ge=-90, le=90)
    map_longitude: float = Field(ge=-180, le=180)
    instagram_url: str = Field(default="", max_length=500)
    eitaa_url: str = Field(default="", max_length=500)
    slot_duration_minutes: int = Field(ge=5, le=180)
    booking_horizon_days: int = Field(ge=1, le=180)
    minimum_lead_hours: int = Field(ge=0, le=168)
    cancellation_cutoff_hours: int = Field(ge=0, le=168)
    reschedule_cutoff_hours: int = Field(ge=0, le=168)
    max_patient_reschedules: int = Field(ge=0, le=10)
    first_reminder_hours: int = Field(ge=1, le=336)
    final_reminder_hours: int = Field(ge=1, le=168)
    timezone_name: str = Field(default="Asia/Tehran", max_length=64)

    @field_validator("office_phone", "consultation_phone")
    @classmethod
    def validate_contact_phone(cls, value: str) -> str:
        normalized = normalize_digits(value).strip()
        if not re.fullmatch(r"[0-9+()\-\s]{7,32}", normalized):
            raise ValueError("شماره تماس فقط می‌تواند شامل عدد، فاصله، خط تیره و علامت + باشد")
        if len(re.sub(r"\D", "", normalized)) < 7:
            raise ValueError("شماره تماس معتبر نیست")
        return normalized

    @field_validator(
        "site_url",
        "map_embed_url",
        "map_page_url",
        "instagram_url",
        "eitaa_url",
        "seo_image_url",
    )
    @classmethod
    def validate_public_url(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            return ""
        parsed = urlparse(normalized)
        if parsed.scheme != "https" or not parsed.hostname or parsed.username or parsed.password or parsed.fragment:
            raise ValueError("نشانی اینترنتی باید HTTPS و بدون اطلاعات ورود باشد")
        if any(ord(char) < 33 for char in normalized) or parsed.port not in {None, 443}:
            raise ValueError("نشانی اینترنتی معتبر نیست")
        return normalized.rstrip("/")

    @model_validator(mode="after")
    def validate_reminder_windows(self) -> "ClinicSettingUpdate":
        if not self.site_url or urlparse(self.site_url).path not in {"", "/"} or urlparse(self.site_url).query:
            raise ValueError("دامنه سایت باید یک مبدأ HTTPS باشد")
        if self.map_embed_url and urlparse(self.map_embed_url).hostname not in {"neshan.org", "www.google.com"}:
            raise ValueError("دامنه نقشه در سیاست امنیتی سایت مجاز نیست")
        from zoneinfo import ZoneInfo, ZoneInfoNotFoundError
        try:
            ZoneInfo(self.timezone_name)
        except (ZoneInfoNotFoundError, ValueError):
            raise ValueError("منطقه زمانی معتبر نیست") from None
        if self.reminder_enabled and self.first_reminder_hours <= self.final_reminder_hours:
            raise ValueError("یادآوری اول باید زودتر از یادآوری نهایی ارسال شود")
        return self


class WeeklyScheduleRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    weekday: int
    enabled: bool
    start_time: time
    end_time: time


class WeeklyScheduleWrite(BaseModel):
    weekday: int = Field(ge=0, le=6)
    enabled: bool
    start_time: time
    end_time: time

    @model_validator(mode="after")
    def validate_period(self) -> "WeeklyScheduleWrite":
        if self.enabled and self.end_time <= self.start_time:
            raise ValueError("ساعت پایان باید بعد از ساعت شروع باشد")
        return self


class ScheduleExceptionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    exception_date: date
    is_closed: bool
    start_time: time | None
    end_time: time | None
    note: str | None


class ScheduleExceptionWrite(BaseModel):
    exception_date: date
    is_closed: bool = True
    start_time: time | None = None
    end_time: time | None = None
    note: str | None = Field(default=None, max_length=255)

    @model_validator(mode="after")
    def validate_period(self) -> "ScheduleExceptionWrite":
        if not self.is_closed:
            if not self.start_time or not self.end_time:
                raise ValueError("برای روز باز، ساعت شروع و پایان الزامی است")
            if self.end_time <= self.start_time:
                raise ValueError("ساعت پایان باید بعد از ساعت شروع باشد")
        return self


class ServiceScheduleExceptionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    service_id: int
    exception_date: date
    is_closed: bool
    start_time: time | None
    end_time: time | None
    note: str | None


class ServiceScheduleExceptionWrite(BaseModel):
    exception_date: date
    is_closed: bool = True
    start_time: time | None = None
    end_time: time | None = None
    note: str | None = Field(default=None, max_length=255)

    @model_validator(mode="after")
    def validate_period(self) -> "ServiceScheduleExceptionWrite":
        if not self.is_closed:
            if not self.start_time or not self.end_time:
                raise ValueError("برای ساعت استثنایی، شروع و پایان الزامی است")
            if self.end_time <= self.start_time:
                raise ValueError("ساعت پایان باید بعد از ساعت شروع باشد")
        return self


class AvailableDate(BaseModel):
    date: date
    available_slots: int


class AvailableSlot(BaseModel):
    start_time: time
    end_time: time
    is_urgent: bool = False


class AppointmentCreate(BaseModel):
    service_id: int
    appointment_date: date
    start_time: time
    has_previous_visit: bool
    is_urgent: bool = False
    patient_note: str | None = Field(default=None, max_length=500)


class BookingStartResponse(BaseModel):
    requires_payment: bool
    appointment: "AppointmentRead | None" = None
    payment_url: str | None = None
    hold_id: str | None = None
    amount_toman: int = 0
    expires_at: datetime | None = None


class IntakeQuestionSnapshot(BaseModel):
    key: str
    label: str
    field_type: str
    options: list[str] = Field(default_factory=list)
    is_required: bool = False
    sort_order: int = 0


class ConsentSnapshot(BaseModel):
    key: str
    title: str
    body: str
    is_required: bool = True
    sort_order: int = 0


class AppointmentIntakeForm(BaseModel):
    questions: list[IntakeQuestionSnapshot] = Field(default_factory=list)
    consents: list[ConsentSnapshot] = Field(default_factory=list)


class AppointmentIntakeSubmission(BaseModel):
    answers: dict[str, str | bool] = Field(default_factory=dict)
    accepted_consents: list[str] = Field(default_factory=list)


class AppointmentRead(BaseModel):
    id: int
    tracking_code: str
    service_id: int
    service_title: str
    service_duration_minutes: int
    service_icon_key: str
    consultation_enabled: bool
    image_requirements: list[ServiceImageRequirementRead]
    appointment_date: date
    start_time: time
    end_time: time
    has_previous_visit: bool
    is_urgent: bool
    price_toman: int
    amount_paid_toman: int
    payment_status: str
    status: str
    patient_note: str | None
    staff_note: str | None
    patient_name: str | None = None
    patient_phone: str | None = None
    created_at: datetime
    rescheduled_at: datetime | None = None
    patient_reschedule_count: int = 0
    can_patient_reschedule: bool = False
    patient_reschedule_reason: str | None = None
    intake_required: bool = False
    intake_completed: bool = False
    intake_form: AppointmentIntakeForm
    intake_submission: AppointmentIntakeSubmission | None = None
    intake_submitted_at: datetime | None = None
    pre_visit_instructions: str = ""
    post_visit_instructions: str = ""
    reminder_count: int = 0


class PatientListItem(BaseModel):
    id: int
    full_name: str
    phone: str
    gender: str | None
    birth_date_jalali: str | None
    tags: list[str]
    needs_follow_up: bool
    profile_completed: bool
    appointment_count: int
    completed_count: int
    last_appointment_date: date | None
    next_appointment_date: date | None
    created_at: datetime


class PatientPage(BaseModel):
    items: list[PatientListItem]
    available_tags: list[str]
    total: int
    page: int
    page_size: int
    total_pages: int


class PatientRecordUpdate(BaseModel):
    internal_note: str | None = Field(default=None, max_length=5000)
    tags: list[str] = Field(default_factory=list, max_length=12)
    needs_follow_up: bool = False

    @model_validator(mode="after")
    def clean_record(self) -> "PatientRecordUpdate":
        self.internal_note = (self.internal_note or "").strip() or None
        self.tags = [item.strip() for item in self.tags if item.strip()]
        if any(len(item) > 40 for item in self.tags):
            raise ValueError("هر برچسب می‌تواند حداکثر ۴۰ نویسه داشته باشد")
        if len(set(self.tags)) != len(self.tags):
            raise ValueError("برچسب‌های تکراری مجاز نیستند")
        return self


class PatientRecordPayment(BaseModel):
    id: int
    appointment_id: int | None
    service_title: str
    amount_toman: int
    status: str
    refund_status: str
    created_at: datetime


class PatientRecordConversation(BaseModel):
    appointment_id: int
    service_title: str
    message_count: int
    image_count: int
    unread_count: int
    last_message: str | None
    last_message_at: datetime | None


class PatientTimelineItem(BaseModel):
    kind: str
    title: str
    description: str | None
    occurred_at: datetime
    appointment_id: int | None = None


class PatientRecordRead(BaseModel):
    id: int
    phone: str
    first_name: str | None
    last_name: str | None
    birth_date_jalali: str | None
    email: str | None
    gender: str | None
    national_id: str | None
    is_foreign_national: bool
    foreign_identifier: str | None
    profile_completed: bool
    is_active: bool
    internal_note: str | None
    tags: list[str]
    needs_follow_up: bool
    created_at: datetime
    updated_at: datetime
    appointment_count: int
    completed_count: int
    total_paid_toman: int
    appointments: list[AppointmentRead]
    payments: list[PatientRecordPayment]
    conversations: list[PatientRecordConversation]
    timeline: list[PatientTimelineItem]
    duplicate_candidates: list[PatientListItem]


class AppointmentStatusUpdate(BaseModel):
    status: str = Field(pattern=r"^(pending|confirmed|completed|cancelled)$")
    staff_note: str | None = Field(default=None, max_length=500)


class AppointmentReschedule(BaseModel):
    appointment_date: date
    start_time: time


class AppointmentMovePreview(BaseModel):
    appointment: AppointmentRead
    previous_date: date
    previous_start_time: time


class StaffLoginRequest(BaseModel):
    username: str = Field(min_length=2, max_length=80)
    password: str = Field(min_length=8, max_length=200)
    captcha_id: str = Field(min_length=16, max_length=64)
    captcha_answer: str = Field(min_length=4, max_length=8)

    @field_validator("captcha_answer", mode="before")
    @classmethod
    def normalize_captcha_answer(cls, value: str) -> str:
        return normalize_digits(value).strip()


class StaffIdentity(BaseModel):
    id: int
    username: str
    full_name: str
    role: str
    role_ids: list[int]
    role_titles: list[str]
    permissions: list[str]
    is_superadmin: bool
    is_active: bool


class StaffSessionResponse(StaffIdentity):
    access_token: str
    token_type: str = "bearer"
    expires_at: str
    full_name: str
    role: str


class StaffProfile(StaffIdentity):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    full_name: str
    role: str


class DashboardStats(BaseModel):
    today_total: int
    pending_total: int
    confirmed_total: int
    patients_total: int
    unread_conversations: int = 0
    waitlist_total: int = 0
    refund_attention_total: int = 0
    daily_appointments: list["AppointmentChartPoint"]


class AppointmentChartPoint(BaseModel):
    date: date
    total: int


class OperationsRunResult(BaseModel):
    queued_reminders: int
    sms_sent: int


class AppointmentPage(BaseModel):
    items: list[AppointmentRead]
    total: int
    page: int
    page_size: int
    total_pages: int


class ConsultationMessageCreate(BaseModel):
    body: str = Field(min_length=1, max_length=2000)

    @field_validator("body")
    @classmethod
    def clean_body(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("متن پیام نمی‌تواند خالی باشد")
        return cleaned


class ConsultationMessageRead(BaseModel):
    id: int
    appointment_id: int
    sender_type: str
    sender_name: str
    body: str | None
    view_label: str | None
    image_requirement_id: int | None
    image_requirement_title: str | None
    has_image: bool
    original_file_name: str | None
    created_at: datetime
    read_at: datetime | None


class ConsultationThreadRead(BaseModel):
    appointment_id: int
    patient_name: str
    patient_phone: str
    service_title: str
    appointment_date: date
    appointment_time: time
    appointment_status: str
    patient_note: str | None
    last_message: str | None
    last_message_at: datetime | None
    last_sender_type: str | None
    unread_count: int = 0


class WaitlistCreate(BaseModel):
    service_id: int
    desired_date: date | None = None
    is_urgent: bool = False


class WaitlistEntryRead(BaseModel):
    id: int
    patient_id: int
    patient_name: str
    patient_phone: str
    service_id: int
    service_title: str
    desired_date: date | None
    is_urgent: bool
    status: str
    offered_date: date | None
    offered_start_time: time | None
    offered_end_time: time | None
    expires_at: datetime | None
    created_at: datetime


class WaitlistStatusUpdate(BaseModel):
    status: str = Field(pattern=r"^(waiting|notified|booked|cancelled|expired)$")


class AuditLogRead(BaseModel):
    id: int
    actor_name: str
    actor_role: str
    action: str
    entity_type: str
    entity_id: str | None
    summary: str
    details: dict[str, object]
    created_at: datetime


class PaymentRead(BaseModel):
    id: int
    appointment_id: int | None
    tracking_code: str | None
    patient_name: str
    service_title: str
    amount_toman: int
    status: str
    ref_id: str | None
    refund_status: str
    refund_amount_toman: int
    refund_reference: str | None
    refund_note: str | None
    created_at: datetime
    verified_at: datetime | None
    refunded_at: datetime | None


class FinanceSummary(BaseModel):
    verified_count: int
    collected_toman: int
    refund_pending_count: int
    refund_pending_toman: int
    refunded_count: int
    refunded_toman: int
    failed_count: int


class RefundUpdate(BaseModel):
    status: str = Field(pattern=r"^(none|requested|processing|refunded|rejected)$")
    amount_toman: int = Field(default=0, ge=0, le=2_000_000_000)
    reference: str | None = Field(default=None, max_length=120)
    note: str | None = Field(default=None, max_length=500)


class SmsAutomationRuleRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    event_key: str
    title: str
    enabled: bool
    template_text: str
    provider_pattern_code: str
    updated_at: datetime


class SmsAutomationRuleWrite(BaseModel):
    enabled: bool
    template_text: str = Field(default="", max_length=1000)
    provider_pattern_code: str = Field(default="", max_length=120)

    @model_validator(mode="after")
    def validate_enabled_rule(self) -> "SmsAutomationRuleWrite":
        if self.enabled and not self.template_text.strip():
            raise ValueError("برای قانون فعال، متن پیامک الزامی است")
        return self


class SmsOutboxRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    event_key: str
    campaign_id: int | None
    phone: str
    rendered_body: str
    status: str
    attempts: int
    last_error: str | None
    created_at: datetime
    sent_at: datetime | None


class SmsCampaignFilters(BaseModel):
    service_ids: list[int] = Field(default_factory=list, max_length=50)
    gender: str | None = Field(default=None, pattern=r"^(female|male)$")
    min_age: int | None = Field(default=None, ge=0, le=120)
    max_age: int | None = Field(default=None, ge=0, le=120)

    @model_validator(mode="after")
    def validate_age_range(self) -> "SmsCampaignFilters":
        if self.min_age is not None and self.max_age is not None and self.min_age > self.max_age:
            raise ValueError("حداقل سن نمی‌تواند از حداکثر سن بیشتر باشد")
        self.service_ids = list(dict.fromkeys(self.service_ids))
        return self


class SmsCampaignPreviewRequest(BaseModel):
    filters: SmsCampaignFilters = Field(default_factory=SmsCampaignFilters)


class SmsCampaignPreviewResponse(BaseModel):
    recipient_count: int


class SmsCampaignCreate(BaseModel):
    title: str = Field(min_length=3, max_length=120)
    message_text: str = Field(min_length=3, max_length=1000)
    provider_pattern_code: str = Field(default="", max_length=120)
    filters: SmsCampaignFilters = Field(default_factory=SmsCampaignFilters)
    expected_recipient_count: int = Field(ge=1, le=10000)

    @field_validator("title", "message_text", "provider_pattern_code", mode="before")
    @classmethod
    def strip_campaign_text(cls, value: str) -> str:
        return value.strip()


class SmsCampaignRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    message_text: str
    provider_pattern_code: str
    filters: SmsCampaignFilters
    status: str
    recipient_count: int
    sent_count: int
    failed_count: int
    created_at: datetime
