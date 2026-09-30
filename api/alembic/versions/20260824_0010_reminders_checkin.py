"""Add scheduled reminders, patient check-in, and no-show policies.

Revision ID: 20260824_0010
Revises: 20260824_0009
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "20260824_0010"
down_revision = "20260824_0009"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("clinic_settings") as batch_op:
        batch_op.add_column(sa.Column("reminder_enabled", sa.Boolean(), nullable=False, server_default=sa.false()))
        batch_op.add_column(sa.Column("first_reminder_hours", sa.Integer(), nullable=False, server_default="24"))
        batch_op.add_column(sa.Column("final_reminder_hours", sa.Integer(), nullable=False, server_default="2"))
        batch_op.add_column(sa.Column("check_in_open_minutes", sa.Integer(), nullable=False, server_default="60"))
        batch_op.add_column(sa.Column("no_show_grace_minutes", sa.Integer(), nullable=False, server_default="30"))
        batch_op.add_column(sa.Column("auto_no_show_enabled", sa.Boolean(), nullable=False, server_default=sa.false()))

    with op.batch_alter_table("appointments") as batch_op:
        batch_op.add_column(sa.Column("checked_in_at", sa.DateTime(), nullable=True))
        batch_op.add_column(sa.Column("check_in_source", sa.String(length=24), nullable=True))
        batch_op.add_column(sa.Column("no_show_marked_at", sa.DateTime(), nullable=True))
        batch_op.create_index("ix_appointments_checked_in_at", ["checked_in_at"])

    op.create_table(
        "appointment_reminders",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("appointment_id", sa.Integer(), sa.ForeignKey("appointments.id", ondelete="CASCADE"), nullable=False),
        sa.Column("reminder_key", sa.String(length=24), nullable=False),
        sa.Column("hours_before", sa.Integer(), nullable=False),
        sa.Column("scheduled_for", sa.DateTime(), nullable=False),
        sa.Column("queued_at", sa.DateTime(), nullable=False),
        sa.Column("outbox_id", sa.Integer(), sa.ForeignKey("sms_outbox.id", ondelete="SET NULL"), nullable=True),
        sa.UniqueConstraint("appointment_id", "reminder_key", name="uq_appointment_reminder_key"),
    )
    op.create_index("ix_appointment_reminders_appointment_id", "appointment_reminders", ["appointment_id"])
    op.create_index("ix_appointment_reminders_scheduled_for", "appointment_reminders", ["scheduled_for"])
    op.create_index("ix_appointment_reminders_outbox_id", "appointment_reminders", ["outbox_id"])


def downgrade() -> None:
    op.drop_index("ix_appointment_reminders_outbox_id", table_name="appointment_reminders")
    op.drop_index("ix_appointment_reminders_scheduled_for", table_name="appointment_reminders")
    op.drop_index("ix_appointment_reminders_appointment_id", table_name="appointment_reminders")
    op.drop_table("appointment_reminders")
    with op.batch_alter_table("appointments") as batch_op:
        batch_op.drop_index("ix_appointments_checked_in_at")
        batch_op.drop_column("no_show_marked_at")
        batch_op.drop_column("check_in_source")
        batch_op.drop_column("checked_in_at")
    with op.batch_alter_table("clinic_settings") as batch_op:
        batch_op.drop_column("auto_no_show_enabled")
        batch_op.drop_column("no_show_grace_minutes")
        batch_op.drop_column("check_in_open_minutes")
        batch_op.drop_column("final_reminder_hours")
        batch_op.drop_column("first_reminder_hours")
        batch_op.drop_column("reminder_enabled")
