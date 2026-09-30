"""Persistent auth limits and staff session state binding.

Revision ID: 20260930_0013
Revises: 20260828_0012
"""

from alembic import op
import sqlalchemy as sa

revision = "20260930_0013"
down_revision = "20260828_0012"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "auth_rate_limits",
        sa.Column("key", sa.String(64), primary_key=True),
        sa.Column("attempts", sa.Integer(), nullable=False),
        sa.Column("resets_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_auth_rate_limits_resets_at", "auth_rate_limits", ["resets_at"])
    with op.batch_alter_table("auth_sessions") as batch:
        batch.add_column(sa.Column("staff_state_hash", sa.String(64), nullable=True))
    # Previous staff sessions have no role/password binding: require a fresh login.
    op.execute(
        "UPDATE auth_sessions SET revoked_at = CURRENT_TIMESTAMP WHERE staff_id IS NOT NULL AND revoked_at IS NULL"
    )


def downgrade() -> None:
    with op.batch_alter_table("auth_sessions") as batch:
        batch.drop_column("staff_state_hash")
    op.drop_index("ix_auth_rate_limits_resets_at", table_name="auth_rate_limits")
    op.drop_table("auth_rate_limits")
