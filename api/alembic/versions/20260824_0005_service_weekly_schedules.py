"""Add an independent weekly schedule for every service.

Revision ID: 20260824_0005
Revises: 20260824_0004
Create Date: 2026-08-24
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "20260824_0005"
down_revision: Union[str, None] = "20260824_0004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "service_weekly_schedules",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "service_id",
            sa.Integer(),
            sa.ForeignKey("services.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("weekday", sa.Integer(), nullable=False),
        sa.Column("enabled", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("start_time", sa.Time(), nullable=False),
        sa.Column("end_time", sa.Time(), nullable=False),
        sa.UniqueConstraint(
            "service_id",
            "weekday",
            name="uq_service_weekly_schedule_day",
        ),
    )
    op.create_index(
        "ix_service_weekly_schedules_service_id",
        "service_weekly_schedules",
        ["service_id"],
    )
    op.execute(
        sa.text(
            """
            INSERT INTO service_weekly_schedules
                (service_id, weekday, enabled, start_time, end_time)
            SELECT services.id, weekly_schedules.weekday,
                   weekly_schedules.enabled, weekly_schedules.start_time,
                   weekly_schedules.end_time
            FROM services CROSS JOIN weekly_schedules
            """
        )
    )


def downgrade() -> None:
    op.drop_table("service_weekly_schedules")
