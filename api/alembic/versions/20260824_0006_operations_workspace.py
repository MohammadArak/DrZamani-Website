"""Add operational scheduling, waitlist, audit and refund tracking.

Revision ID: 20260824_0006
Revises: 20260824_0005
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "20260824_0006"
down_revision = "20260824_0005"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("services") as batch_op:
        batch_op.add_column(
            sa.Column("buffer_before_minutes", sa.Integer(), nullable=False, server_default="0")
        )
        batch_op.add_column(
            sa.Column("buffer_after_minutes", sa.Integer(), nullable=False, server_default="0")
        )
        batch_op.add_column(
            sa.Column("concurrent_capacity", sa.Integer(), nullable=False, server_default="1")
        )

    op.create_table(
        "service_schedule_exceptions",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("service_id", sa.Integer(), nullable=False),
        sa.Column("exception_date", sa.Date(), nullable=False),
        sa.Column("is_closed", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("start_time", sa.Time(), nullable=True),
        sa.Column("end_time", sa.Time(), nullable=True),
        sa.Column("note", sa.String(length=255), nullable=True),
        sa.ForeignKeyConstraint(["service_id"], ["services.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "service_id", "exception_date", name="uq_service_schedule_exception_date"
        ),
    )
    op.create_index(
        "ix_service_schedule_exceptions_service_id",
        "service_schedule_exceptions",
        ["service_id"],
    )
    op.create_index(
        "ix_service_schedule_exceptions_exception_date",
        "service_schedule_exceptions",
        ["exception_date"],
    )

    with op.batch_alter_table("payments") as batch_op:
        batch_op.add_column(
            sa.Column("refund_status", sa.String(length=24), nullable=False, server_default="none")
        )
        batch_op.add_column(
            sa.Column("refund_amount_toman", sa.Integer(), nullable=False, server_default="0")
        )
        batch_op.add_column(sa.Column("refund_reference", sa.String(length=120)))
        batch_op.add_column(sa.Column("refund_note", sa.String(length=500)))
        batch_op.add_column(sa.Column("refunded_at", sa.DateTime(timezone=True)))
        batch_op.create_index("ix_payments_refund_status", ["refund_status"])

    with op.batch_alter_table("appointments") as batch_op:
        batch_op.add_column(sa.Column("rescheduled_at", sa.DateTime(timezone=True)))
        batch_op.add_column(
            sa.Column(
                "rescheduled_by_staff_id",
                sa.Integer(),
                sa.ForeignKey(
                    "staff_users.id",
                    name="fk_appointments_rescheduled_by_staff",
                    ondelete="SET NULL",
                ),
            )
        )
        batch_op.create_index(
            "ix_appointments_rescheduled_by_staff_id", ["rescheduled_by_staff_id"]
        )

    with op.batch_alter_table("consultation_messages") as batch_op:
        batch_op.add_column(sa.Column("read_at", sa.DateTime(timezone=True)))
        batch_op.create_index("ix_consultation_messages_read_at", ["read_at"])

    op.create_table(
        "waitlist_entries",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("patient_id", sa.Integer(), nullable=False),
        sa.Column("service_id", sa.Integer(), nullable=False),
        sa.Column("desired_date", sa.Date(), nullable=True),
        sa.Column("is_urgent", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("status", sa.String(length=24), nullable=False, server_default="waiting"),
        sa.Column("offered_date", sa.Date(), nullable=True),
        sa.Column("offered_start_time", sa.Time(), nullable=True),
        sa.Column("offered_end_time", sa.Time(), nullable=True),
        sa.Column("notified_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["patient_id"], ["patients.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["service_id"], ["services.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    for column in ("patient_id", "service_id", "desired_date", "status", "expires_at", "created_at"):
        op.create_index(f"ix_waitlist_entries_{column}", "waitlist_entries", [column])
    op.create_index(
        "ix_waitlist_service_status", "waitlist_entries", ["service_id", "status"]
    )

    op.create_table(
        "audit_logs",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("actor_staff_id", sa.Integer(), nullable=True),
        sa.Column("actor_patient_id", sa.Integer(), nullable=True),
        sa.Column("action", sa.String(length=80), nullable=False),
        sa.Column("entity_type", sa.String(length=50), nullable=False),
        sa.Column("entity_id", sa.String(length=80), nullable=True),
        sa.Column("summary", sa.String(length=255), nullable=False),
        sa.Column("details_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["actor_patient_id"], ["patients.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["actor_staff_id"], ["staff_users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    for column in (
        "actor_staff_id",
        "actor_patient_id",
        "action",
        "entity_type",
        "entity_id",
        "created_at",
    ):
        op.create_index(f"ix_audit_logs_{column}", "audit_logs", [column])


def downgrade() -> None:
    op.drop_table("audit_logs")
    op.drop_table("waitlist_entries")
    with op.batch_alter_table("consultation_messages") as batch_op:
        batch_op.drop_index("ix_consultation_messages_read_at")
        batch_op.drop_column("read_at")
    with op.batch_alter_table("appointments") as batch_op:
        batch_op.drop_index("ix_appointments_rescheduled_by_staff_id")
        batch_op.drop_column("rescheduled_by_staff_id")
        batch_op.drop_column("rescheduled_at")
    with op.batch_alter_table("payments") as batch_op:
        batch_op.drop_index("ix_payments_refund_status")
        batch_op.drop_column("refunded_at")
        batch_op.drop_column("refund_note")
        batch_op.drop_column("refund_reference")
        batch_op.drop_column("refund_amount_toman")
        batch_op.drop_column("refund_status")
    op.drop_table("service_schedule_exceptions")
    with op.batch_alter_table("services") as batch_op:
        batch_op.drop_column("concurrent_capacity")
        batch_op.drop_column("buffer_after_minutes")
        batch_op.drop_column("buffer_before_minutes")
