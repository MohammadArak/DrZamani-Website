"""Add service durations, icons, staff captcha and consultation chat.

Revision ID: 20260806_0002
Revises: 20260731_0001
Create Date: 2026-08-06
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "20260806_0002"
down_revision: Union[str, None] = "20260731_0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "services",
        sa.Column("duration_minutes", sa.Integer(), nullable=False, server_default="20"),
    )
    op.add_column(
        "services",
        sa.Column("icon_key", sa.String(40), nullable=False, server_default="medical"),
    )
    op.add_column(
        "services",
        sa.Column("allows_media_chat", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.execute(
        "UPDATE services SET duration_minutes = 30, icon_key = 'nose', allows_media_chat = 1 "
        "WHERE title LIKE '%جراحی بینی%' OR title LIKE '%رینوپلاستی%'"
    )
    op.execute(
        "UPDATE services SET duration_minutes = 15, icon_key = 'followup' "
        "WHERE title LIKE '%پیگیری%' OR title LIKE '%بعد از عمل%'"
    )

    op.create_table(
        "captcha_challenges",
        sa.Column("id", sa.String(64), primary_key=True),
        sa.Column("code_hash", sa.String(64), nullable=False),
        sa.Column("nonce", sa.String(32), nullable=False),
        sa.Column("request_ip", sa.String(64), nullable=False),
        sa.Column("attempts", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("expires_at", sa.DateTime(), nullable=False),
        sa.Column("consumed_at", sa.DateTime()),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_captcha_challenges_request_ip", "captcha_challenges", ["request_ip"])
    op.create_index("ix_captcha_challenges_expires_at", "captcha_challenges", ["expires_at"])
    op.create_index("ix_captcha_challenges_created_at", "captcha_challenges", ["created_at"])

    op.create_table(
        "consultation_messages",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "appointment_id",
            sa.Integer(),
            sa.ForeignKey("appointments.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("sender_type", sa.String(16), nullable=False),
        sa.Column(
            "sender_staff_id",
            sa.Integer(),
            sa.ForeignKey("staff_users.id", ondelete="SET NULL"),
        ),
        sa.Column("body", sa.String(2000)),
        sa.Column("view_label", sa.String(32)),
        sa.Column("original_file_name", sa.String(255)),
        sa.Column("stored_file_name", sa.String(255), unique=True),
        sa.Column("content_type", sa.String(80)),
        sa.Column("size_bytes", sa.Integer()),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )
    op.create_index(
        "ix_consultation_messages_appointment_id",
        "consultation_messages",
        ["appointment_id"],
    )
    op.create_index(
        "ix_consultation_messages_sender_staff_id",
        "consultation_messages",
        ["sender_staff_id"],
    )
    op.create_index(
        "ix_consultation_messages_created_at",
        "consultation_messages",
        ["created_at"],
    )


def downgrade() -> None:
    op.drop_table("consultation_messages")
    op.drop_table("captcha_challenges")
    with op.batch_alter_table("services") as batch_op:
        batch_op.drop_column("allows_media_chat")
        batch_op.drop_column("icon_key")
        batch_op.drop_column("duration_minutes")
