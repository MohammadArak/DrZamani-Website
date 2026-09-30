"""Remove attendance tracking and automatic no-show settings.

Revision ID: 20260824_0011
Revises: 20260824_0010
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "20260824_0011"
down_revision = "20260824_0010"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Normalize records created by the removed attendance workflow before the
    # application is restricted to pending/confirmed/completed/cancelled.
    op.execute(
        "UPDATE appointments SET status = 'confirmed' WHERE status = 'checked_in'"
    )
    op.execute(
        "UPDATE appointments SET status = 'cancelled', slot_key = NULL "
        "WHERE status = 'no_show'"
    )

    if op.get_bind().dialect.name == "sqlite":
        op.execute("PRAGMA foreign_keys=OFF")

    with op.batch_alter_table("appointments") as batch_op:
        batch_op.drop_index("ix_appointments_checked_in_at")
        batch_op.drop_column("no_show_marked_at")
        batch_op.drop_column("check_in_source")
        batch_op.drop_column("checked_in_at")

    with op.batch_alter_table("clinic_settings") as batch_op:
        batch_op.drop_column("auto_no_show_enabled")
        batch_op.drop_column("no_show_grace_minutes")
        batch_op.drop_column("check_in_open_minutes")

    if op.get_bind().dialect.name == "sqlite":
        op.execute("PRAGMA foreign_keys=ON")


def downgrade() -> None:
    if op.get_bind().dialect.name == "sqlite":
        op.execute("PRAGMA foreign_keys=OFF")

    with op.batch_alter_table("clinic_settings") as batch_op:
        batch_op.add_column(
            sa.Column(
                "check_in_open_minutes",
                sa.Integer(),
                nullable=False,
                server_default="60",
            )
        )
        batch_op.add_column(
            sa.Column(
                "no_show_grace_minutes",
                sa.Integer(),
                nullable=False,
                server_default="30",
            )
        )
        batch_op.add_column(
            sa.Column(
                "auto_no_show_enabled",
                sa.Boolean(),
                nullable=False,
                server_default=sa.false(),
            )
        )

    with op.batch_alter_table("appointments") as batch_op:
        batch_op.add_column(sa.Column("checked_in_at", sa.DateTime(), nullable=True))
        batch_op.add_column(
            sa.Column("check_in_source", sa.String(length=24), nullable=True)
        )
        batch_op.add_column(
            sa.Column("no_show_marked_at", sa.DateTime(), nullable=True)
        )
        batch_op.create_index("ix_appointments_checked_in_at", ["checked_in_at"])

    if op.get_bind().dialect.name == "sqlite":
        op.execute("PRAGMA foreign_keys=ON")
