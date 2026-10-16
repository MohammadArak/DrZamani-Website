"""Recoverable staff removal while preserving audit and clinical references."""
from alembic import op
import sqlalchemy as sa

revision = "20261016_0027"
down_revision = "20261014_0026"
branch_labels = depends_on = None

def upgrade():
    op.add_column("staff_users", sa.Column("is_archived", sa.Boolean(), nullable=False, server_default=sa.false()))

def downgrade():
    op.drop_column("staff_users", "is_archived")
