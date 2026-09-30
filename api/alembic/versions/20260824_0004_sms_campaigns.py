"""Add segmented SMS campaigns.

Revision ID: 20260824_0004
Revises: 20260824_0003
Create Date: 2026-08-24
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "20260824_0004"
down_revision: Union[str, None] = "20260824_0003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "sms_campaigns",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("title", sa.String(120), nullable=False),
        sa.Column("message_text", sa.String(1000), nullable=False),
        sa.Column("provider_pattern_code", sa.String(120), nullable=False, server_default=""),
        sa.Column("filters_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("status", sa.String(24), nullable=False, server_default="queued"),
        sa.Column("recipient_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("sent_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("failed_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_by_staff_id", sa.Integer(), sa.ForeignKey("staff_users.id", ondelete="SET NULL")),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_sms_campaigns_status", "sms_campaigns", ["status"])
    op.create_index("ix_sms_campaigns_created_by_staff_id", "sms_campaigns", ["created_by_staff_id"])
    op.create_index("ix_sms_campaigns_created_at", "sms_campaigns", ["created_at"])
    with op.batch_alter_table("sms_outbox") as batch_op:
        batch_op.add_column(sa.Column("campaign_id", sa.Integer(), nullable=True))
        batch_op.create_foreign_key(
            "fk_sms_outbox_campaign_id",
            "sms_campaigns",
            ["campaign_id"],
            ["id"],
            ondelete="SET NULL",
        )
    op.create_index("ix_sms_outbox_campaign_id", "sms_outbox", ["campaign_id"])


def downgrade() -> None:
    op.drop_index("ix_sms_outbox_campaign_id", table_name="sms_outbox")
    with op.batch_alter_table("sms_outbox") as batch_op:
        batch_op.drop_constraint("fk_sms_outbox_campaign_id", type_="foreignkey")
        batch_op.drop_column("campaign_id")
    op.drop_table("sms_campaigns")
