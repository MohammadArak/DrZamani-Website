"""Add titled images, urgent booking, payments and SMS automation.

Revision ID: 20260824_0003
Revises: 20260806_0002
Create Date: 2026-08-24
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "20260824_0003"
down_revision: Union[str, None] = "20260806_0002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # SQLite cannot rebuild a referenced table while foreign-key enforcement is on.
    # Alembic's batch mode recreates ``services``, so suspend the pragma for this
    # non-transactional migration connection and restore it after all DDL finishes.
    if op.get_bind().dialect.name == "sqlite":
        op.execute("PRAGMA foreign_keys=OFF")
    with op.batch_alter_table("services") as batch_op:
        batch_op.add_column(sa.Column("price_toman", sa.Integer(), nullable=False, server_default="0"))
        batch_op.add_column(sa.Column("payment_mode", sa.String(16), nullable=False, server_default="none"))
        batch_op.add_column(sa.Column("deposit_toman", sa.Integer(), nullable=False, server_default="0"))
        batch_op.add_column(sa.Column("urgent_enabled", sa.Boolean(), nullable=False, server_default=sa.false()))
        batch_op.add_column(sa.Column("urgent_extra_toman", sa.Integer(), nullable=False, server_default="0"))

    op.create_table(
        "service_image_requirements",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("service_id", sa.Integer(), sa.ForeignKey("services.id", ondelete="CASCADE"), nullable=False),
        sa.Column("title", sa.String(100), nullable=False),
        sa.Column("is_required", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        sa.UniqueConstraint("service_id", "title", name="uq_service_image_requirement_title"),
    )
    op.create_index("ix_service_image_requirements_service_id", "service_image_requirements", ["service_id"])

    op.create_table(
        "service_urgent_schedules",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("service_id", sa.Integer(), sa.ForeignKey("services.id", ondelete="CASCADE"), nullable=False),
        sa.Column("weekday", sa.Integer(), nullable=False),
        sa.Column("enabled", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("start_time", sa.Time(), nullable=False),
        sa.Column("end_time", sa.Time(), nullable=False),
        sa.UniqueConstraint("service_id", "weekday", name="uq_service_urgent_schedule_day"),
    )
    op.create_index("ix_service_urgent_schedules_service_id", "service_urgent_schedules", ["service_id"])

    op.create_table(
        "booking_holds",
        sa.Column("id", sa.String(48), primary_key=True),
        sa.Column("patient_id", sa.Integer(), sa.ForeignKey("patients.id", ondelete="CASCADE"), nullable=False),
        sa.Column("service_id", sa.Integer(), sa.ForeignKey("services.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("appointment_date", sa.Date(), nullable=False),
        sa.Column("start_time", sa.Time(), nullable=False),
        sa.Column("end_time", sa.Time(), nullable=False),
        sa.Column("is_urgent", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("has_previous_visit", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("patient_note", sa.String(500)),
        sa.Column("price_toman", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("amount_toman", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("payment_mode", sa.String(16), nullable=False, server_default="none"),
        sa.Column("status", sa.String(24), nullable=False, server_default="pending_payment"),
        sa.Column("expires_at", sa.DateTime(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_booking_holds_patient_id", "booking_holds", ["patient_id"])
    op.create_index("ix_booking_holds_service_id", "booking_holds", ["service_id"])
    op.create_index("ix_booking_holds_appointment_date", "booking_holds", ["appointment_date"])
    op.create_index("ix_booking_holds_status", "booking_holds", ["status"])
    op.create_index("ix_booking_holds_expires_at", "booking_holds", ["expires_at"])

    op.create_table(
        "payments",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("hold_id", sa.String(48), sa.ForeignKey("booking_holds.id", ondelete="RESTRICT"), nullable=False, unique=True),
        sa.Column("provider", sa.String(24), nullable=False, server_default="zarinpal"),
        sa.Column("amount_toman", sa.Integer(), nullable=False),
        sa.Column("authority", sa.String(64), unique=True),
        sa.Column("ref_id", sa.String(80), unique=True),
        sa.Column("status", sa.String(24), nullable=False, server_default="created"),
        sa.Column("raw_response", sa.Text()),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.Column("verified_at", sa.DateTime()),
    )
    op.create_index("ix_payments_hold_id", "payments", ["hold_id"])
    op.create_index("ix_payments_authority", "payments", ["authority"])
    op.create_index("ix_payments_status", "payments", ["status"])

    with op.batch_alter_table("appointments") as batch_op:
        batch_op.add_column(sa.Column("is_urgent", sa.Boolean(), nullable=False, server_default=sa.false()))
        batch_op.add_column(sa.Column("price_toman", sa.Integer(), nullable=False, server_default="0"))
        batch_op.add_column(sa.Column("amount_paid_toman", sa.Integer(), nullable=False, server_default="0"))
        batch_op.add_column(sa.Column("payment_status", sa.String(24), nullable=False, server_default="not_required"))
        batch_op.add_column(sa.Column("payment_id", sa.Integer(), nullable=True))
        batch_op.create_foreign_key("fk_appointments_payment_id", "payments", ["payment_id"], ["id"], ondelete="SET NULL")
        batch_op.create_unique_constraint("uq_appointments_payment_id", ["payment_id"])
    op.create_index("ix_appointments_payment_status", "appointments", ["payment_status"])
    op.create_index("ix_appointments_payment_id", "appointments", ["payment_id"])

    with op.batch_alter_table("consultation_messages") as batch_op:
        batch_op.add_column(sa.Column("image_requirement_id", sa.Integer(), nullable=True))
        batch_op.create_foreign_key(
            "fk_consultation_messages_image_requirement_id",
            "service_image_requirements",
            ["image_requirement_id"],
            ["id"],
            ondelete="SET NULL",
        )
        batch_op.create_unique_constraint(
            "uq_consultation_required_image", ["appointment_id", "image_requirement_id"]
        )
    op.create_index(
        "ix_consultation_messages_image_requirement_id",
        "consultation_messages",
        ["image_requirement_id"],
    )

    op.create_table(
        "sms_automation_rules",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("event_key", sa.String(48), nullable=False, unique=True),
        sa.Column("title", sa.String(120), nullable=False),
        sa.Column("enabled", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("template_text", sa.String(1000), nullable=False, server_default=""),
        sa.Column("provider_pattern_code", sa.String(120), nullable=False, server_default=""),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_sms_automation_rules_event_key", "sms_automation_rules", ["event_key"])

    op.create_table(
        "sms_outbox",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("event_key", sa.String(48), nullable=False),
        sa.Column("patient_id", sa.Integer(), sa.ForeignKey("patients.id", ondelete="SET NULL")),
        sa.Column("appointment_id", sa.Integer(), sa.ForeignKey("appointments.id", ondelete="SET NULL")),
        sa.Column("phone", sa.String(16), nullable=False),
        sa.Column("rendered_body", sa.String(1000), nullable=False),
        sa.Column("provider_pattern_code", sa.String(120), nullable=False, server_default=""),
        sa.Column("variables_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("status", sa.String(24), nullable=False, server_default="pending"),
        sa.Column("attempts", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("last_error", sa.String(500)),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("sent_at", sa.DateTime()),
    )
    op.create_index("ix_sms_outbox_event_key", "sms_outbox", ["event_key"])
    op.create_index("ix_sms_outbox_patient_id", "sms_outbox", ["patient_id"])
    op.create_index("ix_sms_outbox_appointment_id", "sms_outbox", ["appointment_id"])
    op.create_index("ix_sms_outbox_phone", "sms_outbox", ["phone"])
    op.create_index("ix_sms_outbox_status", "sms_outbox", ["status"])
    op.create_index("ix_sms_outbox_created_at", "sms_outbox", ["created_at"])
    if op.get_bind().dialect.name == "sqlite":
        op.execute("PRAGMA foreign_keys=ON")


def downgrade() -> None:
    if op.get_bind().dialect.name == "sqlite":
        op.execute("PRAGMA foreign_keys=OFF")
    op.drop_table("sms_outbox")
    op.drop_table("sms_automation_rules")
    with op.batch_alter_table("consultation_messages") as batch_op:
        batch_op.drop_constraint("uq_consultation_required_image", type_="unique")
        batch_op.drop_constraint("fk_consultation_messages_image_requirement_id", type_="foreignkey")
        batch_op.drop_column("image_requirement_id")
    with op.batch_alter_table("appointments") as batch_op:
        batch_op.drop_constraint("uq_appointments_payment_id", type_="unique")
        batch_op.drop_constraint("fk_appointments_payment_id", type_="foreignkey")
        batch_op.drop_column("payment_id")
        batch_op.drop_column("payment_status")
        batch_op.drop_column("amount_paid_toman")
        batch_op.drop_column("price_toman")
        batch_op.drop_column("is_urgent")
    op.drop_table("payments")
    op.drop_table("booking_holds")
    op.drop_table("service_urgent_schedules")
    op.drop_table("service_image_requirements")
    with op.batch_alter_table("services") as batch_op:
        batch_op.drop_column("urgent_extra_toman")
        batch_op.drop_column("urgent_enabled")
        batch_op.drop_column("deposit_toman")
        batch_op.drop_column("payment_mode")
        batch_op.drop_column("price_toman")
    if op.get_bind().dialect.name == "sqlite":
        op.execute("PRAGMA foreign_keys=ON")
