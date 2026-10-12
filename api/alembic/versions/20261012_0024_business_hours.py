"""Public business hours and postal address, independently of booking admission."""
from alembic import op
import sqlalchemy as sa

revision = "20261012_0024"
down_revision = "20261005_0023"
branch_labels = depends_on = None

def upgrade():
    op.create_table("content_seed_states", sa.Column("key", sa.String(64), primary_key=True), sa.Column("applied_at", sa.DateTime(), nullable=False), sa.Column("details_json", sa.Text(), nullable=False))
    with op.batch_alter_table("clinic_settings") as table:
        table.add_column(sa.Column("postal_code", sa.String(10), nullable=False, server_default=""))
        table.add_column(sa.Column("business_hours_json", sa.Text(), nullable=False, server_default="[]"))

def downgrade():
    op.drop_table("content_seed_states")
    with op.batch_alter_table("clinic_settings") as table:
        table.drop_column("business_hours_json")
        table.drop_column("postal_code")
