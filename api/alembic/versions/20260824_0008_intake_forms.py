"""Add service intake questions and consent snapshots.

Revision ID: 20260824_0008
Revises: 20260824_0007
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "20260824_0008"
down_revision = "20260824_0007"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "service_intake_questions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "service_id",
            sa.Integer(),
            sa.ForeignKey("services.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("label", sa.String(length=240), nullable=False),
        sa.Column(
            "field_type",
            sa.String(length=24),
            nullable=False,
            server_default="short_text",
        ),
        sa.Column("options_json", sa.Text(), nullable=False, server_default="[]"),
        sa.Column("is_required", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
    )
    op.create_index(
        "ix_service_intake_questions_service_id",
        "service_intake_questions",
        ["service_id"],
    )
    op.create_table(
        "service_consents",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "service_id",
            sa.Integer(),
            sa.ForeignKey("services.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("title", sa.String(length=160), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("is_required", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
    )
    op.create_index(
        "ix_service_consents_service_id",
        "service_consents",
        ["service_id"],
    )
    with op.batch_alter_table("appointments") as batch_op:
        batch_op.add_column(sa.Column("intake_form_snapshot_json", sa.Text(), nullable=True))
        batch_op.add_column(sa.Column("intake_submission_json", sa.Text(), nullable=True))
        batch_op.add_column(sa.Column("intake_submitted_at", sa.DateTime(), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table("appointments") as batch_op:
        batch_op.drop_column("intake_submitted_at")
        batch_op.drop_column("intake_submission_json")
        batch_op.drop_column("intake_form_snapshot_json")
    op.drop_index("ix_service_consents_service_id", table_name="service_consents")
    op.drop_table("service_consents")
    op.drop_index(
        "ix_service_intake_questions_service_id",
        table_name="service_intake_questions",
    )
    op.drop_table("service_intake_questions")
