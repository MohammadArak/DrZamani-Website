"""Add patient self-reschedule policies.

Revision ID: 20260824_0007
Revises: 20260824_0006
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "20260824_0007"
down_revision = "20260824_0006"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("clinic_settings") as batch_op:
        batch_op.add_column(
            sa.Column(
                "reschedule_cutoff_hours",
                sa.Integer(),
                nullable=False,
                server_default="12",
            )
        )
        batch_op.add_column(
            sa.Column(
                "max_patient_reschedules",
                sa.Integer(),
                nullable=False,
                server_default="2",
            )
        )

    with op.batch_alter_table("appointments") as batch_op:
        batch_op.add_column(
            sa.Column(
                "patient_reschedule_count",
                sa.Integer(),
                nullable=False,
                server_default="0",
            )
        )


def downgrade() -> None:
    with op.batch_alter_table("appointments") as batch_op:
        batch_op.drop_column("patient_reschedule_count")
    with op.batch_alter_table("clinic_settings") as batch_op:
        batch_op.drop_column("max_patient_reschedules")
        batch_op.drop_column("reschedule_cutoff_hours")
