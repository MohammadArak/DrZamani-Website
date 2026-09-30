"""Add integrated patient records and service instructions.

Revision ID: 20260824_0009
Revises: 20260824_0008
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "20260824_0009"
down_revision = "20260824_0008"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("patients") as batch_op:
        batch_op.add_column(sa.Column("internal_note", sa.Text(), nullable=True))
        batch_op.add_column(
            sa.Column("tags_json", sa.Text(), nullable=False, server_default="[]")
        )
        batch_op.add_column(
            sa.Column(
                "needs_follow_up",
                sa.Boolean(),
                nullable=False,
                server_default=sa.false(),
            )
        )
        batch_op.create_index("ix_patients_needs_follow_up", ["needs_follow_up"])

    with op.batch_alter_table("services") as batch_op:
        batch_op.add_column(
            sa.Column(
                "pre_visit_instructions",
                sa.Text(),
                nullable=False,
                server_default="",
            )
        )
        batch_op.add_column(
            sa.Column(
                "post_visit_instructions",
                sa.Text(),
                nullable=False,
                server_default="",
            )
        )


def downgrade() -> None:
    with op.batch_alter_table("services") as batch_op:
        batch_op.drop_column("post_visit_instructions")
        batch_op.drop_column("pre_visit_instructions")
    with op.batch_alter_table("patients") as batch_op:
        batch_op.drop_index("ix_patients_needs_follow_up")
        batch_op.drop_column("needs_follow_up")
        batch_op.drop_column("tags_json")
        batch_op.drop_column("internal_note")
