"""Editable website identity and article index metadata."""
from alembic import op
import sqlalchemy as sa
revision = "20261014_0026"
down_revision = "20261012_0025"
branch_labels = depends_on = None
def upgrade():
    with op.batch_alter_table("clinic_settings") as table:
        table.add_column(sa.Column("seo_site_name",sa.String(160),nullable=False,server_default=""))
        table.add_column(sa.Column("seo_articles_title",sa.String(160),nullable=False,server_default=""))
        table.add_column(sa.Column("seo_articles_description",sa.String(320),nullable=False,server_default=""))
def downgrade():
    with op.batch_alter_table("clinic_settings") as table:
        for key in ("seo_articles_description","seo_articles_title","seo_site_name"):
            table.drop_column(key)
