"""Indexed conversation cursors and retry-safe text message identifiers."""
from alembic import op
import sqlalchemy as sa
revision="20261012_0025"
down_revision="20261012_0024"
branch_labels=depends_on=None
def upgrade():
    with op.batch_alter_table("consultation_messages") as table:
        table.add_column(sa.Column("client_nonce",sa.String(36),nullable=True))
        table.create_unique_constraint("uq_consultation_client_nonce",["appointment_id","sender_type","client_nonce"])
        table.create_index("ix_consultation_thread_order",["appointment_id","created_at","id"])
        table.create_index("ix_consultation_thread_unread",["appointment_id","sender_type","read_at"])
def downgrade():
    with op.batch_alter_table("consultation_messages") as table:
        table.drop_index("ix_consultation_thread_unread")
        table.drop_index("ix_consultation_thread_order")
        table.drop_constraint("uq_consultation_client_nonce",type_="unique")
        table.drop_column("client_nonce")
