"""Initial appointment system schema.

Revision ID: 20260731_0001
Revises:
Create Date: 2026-07-31
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "20260731_0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "patients",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("phone", sa.String(16), nullable=False),
        sa.Column("first_name", sa.String(80)),
        sa.Column("last_name", sa.String(100)),
        sa.Column("birth_date_jalali", sa.String(10)),
        sa.Column("email", sa.String(254)),
        sa.Column("gender", sa.String(16)),
        sa.Column("national_id", sa.String(24)),
        sa.Column("is_foreign_national", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("foreign_identifier", sa.String(40)),
        sa.Column("profile_completed", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.UniqueConstraint("national_id"),
        sa.UniqueConstraint("foreign_identifier"),
    )
    op.create_index("ix_patients_phone", "patients", ["phone"], unique=True)

    op.create_table(
        "staff_users",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("username", sa.String(80), nullable=False),
        sa.Column("full_name", sa.String(120), nullable=False),
        sa.Column("password_hash", sa.String(256), nullable=False),
        sa.Column("role", sa.String(24), nullable=False, server_default="secretary"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_staff_users_username", "staff_users", ["username"], unique=True)

    op.create_table(
        "clinic_settings",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("doctor_name", sa.String(120), nullable=False),
        sa.Column("specialty", sa.String(160), nullable=False),
        sa.Column("medical_council_number", sa.String(40), nullable=False, server_default=""),
        sa.Column("address", sa.Text(), nullable=False, server_default=""),
        sa.Column("slot_duration_minutes", sa.Integer(), nullable=False, server_default="20"),
        sa.Column("booking_horizon_days", sa.Integer(), nullable=False, server_default="30"),
        sa.Column("minimum_lead_hours", sa.Integer(), nullable=False, server_default="2"),
        sa.Column("cancellation_cutoff_hours", sa.Integer(), nullable=False, server_default="12"),
        sa.Column("timezone_name", sa.String(64), nullable=False, server_default="Asia/Tehran"),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
    )

    op.create_table(
        "weekly_schedules",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("weekday", sa.Integer(), nullable=False),
        sa.Column("enabled", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("start_time", sa.Time(), nullable=False),
        sa.Column("end_time", sa.Time(), nullable=False),
        sa.UniqueConstraint("weekday", name="uq_weekly_schedule_weekday"),
    )

    op.create_table(
        "schedule_exceptions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("exception_date", sa.Date(), nullable=False),
        sa.Column("is_closed", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("start_time", sa.Time()),
        sa.Column("end_time", sa.Time()),
        sa.Column("note", sa.String(255)),
        sa.UniqueConstraint("exception_date", name="uq_schedule_exception_date"),
    )
    op.create_index("ix_schedule_exceptions_exception_date", "schedule_exceptions", ["exception_date"])

    op.create_table(
        "services",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("title", sa.String(120), nullable=False),
        sa.Column("description", sa.String(300), nullable=False, server_default=""),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_services_is_active", "services", ["is_active"])

    op.create_table(
        "otp_challenges",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("phone", sa.String(16), nullable=False),
        sa.Column("purpose", sa.String(24), nullable=False, server_default="login"),
        sa.Column("code_hash", sa.String(64), nullable=False),
        sa.Column("nonce", sa.String(32), nullable=False),
        sa.Column("request_ip", sa.String(64), nullable=False),
        sa.Column("attempts", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("expires_at", sa.DateTime(), nullable=False),
        sa.Column("consumed_at", sa.DateTime()),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_otp_challenges_phone", "otp_challenges", ["phone"])
    op.create_index("ix_otp_challenges_request_ip", "otp_challenges", ["request_ip"])
    op.create_index("ix_otp_challenges_created_at", "otp_challenges", ["created_at"])

    op.create_table(
        "auth_sessions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("token_hash", sa.String(64), nullable=False),
        sa.Column("patient_id", sa.Integer(), sa.ForeignKey("patients.id", ondelete="CASCADE")),
        sa.Column("staff_id", sa.Integer(), sa.ForeignKey("staff_users.id", ondelete="CASCADE")),
        sa.Column("expires_at", sa.DateTime(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("revoked_at", sa.DateTime()),
    )
    op.create_index("ix_auth_sessions_token_hash", "auth_sessions", ["token_hash"], unique=True)
    op.create_index("ix_auth_sessions_patient_id", "auth_sessions", ["patient_id"])
    op.create_index("ix_auth_sessions_staff_id", "auth_sessions", ["staff_id"])
    op.create_index("ix_auth_sessions_expires_at", "auth_sessions", ["expires_at"])

    op.create_table(
        "appointments",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("tracking_code", sa.String(16), nullable=False),
        sa.Column("patient_id", sa.Integer(), sa.ForeignKey("patients.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("service_id", sa.Integer(), sa.ForeignKey("services.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("appointment_date", sa.Date(), nullable=False),
        sa.Column("start_time", sa.Time(), nullable=False),
        sa.Column("end_time", sa.Time(), nullable=False),
        sa.Column("slot_key", sa.String(32)),
        sa.Column("has_previous_visit", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("status", sa.String(24), nullable=False, server_default="pending"),
        sa.Column("patient_note", sa.String(500)),
        sa.Column("staff_note", sa.String(500)),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.Column("cancelled_at", sa.DateTime()),
    )
    op.create_index("ix_appointments_tracking_code", "appointments", ["tracking_code"], unique=True)
    op.create_index("ix_appointments_patient_id", "appointments", ["patient_id"])
    op.create_index("ix_appointments_service_id", "appointments", ["service_id"])
    op.create_index("ix_appointments_appointment_date", "appointments", ["appointment_date"])
    op.create_index("ix_appointments_slot_key", "appointments", ["slot_key"], unique=True)
    op.create_index("ix_appointments_status", "appointments", ["status"])


def downgrade() -> None:
    op.drop_table("appointments")
    op.drop_table("auth_sessions")
    op.drop_table("otp_challenges")
    op.drop_table("services")
    op.drop_table("schedule_exceptions")
    op.drop_table("weekly_schedules")
    op.drop_table("clinic_settings")
    op.drop_table("staff_users")
    op.drop_table("patients")
