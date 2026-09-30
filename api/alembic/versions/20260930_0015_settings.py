"""Versioned runtime settings and public SEO fields; no environment secrets copied."""
from alembic import op
import sqlalchemy as sa

revision = "20260930_0015"
down_revision = "20260930_0014"
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table("clinic_settings") as batch:
        batch.add_column(sa.Column("revision", sa.Integer(), nullable=False, server_default="1"))
        batch.add_column(sa.Column("seo_title", sa.String(160), nullable=False, server_default=""))
        batch.add_column(sa.Column("seo_description", sa.String(320), nullable=False, server_default=""))
        batch.add_column(sa.Column("seo_image_url", sa.String(500), nullable=False, server_default=""))
    op.create_table("system_settings", sa.Column("id", sa.Integer(), primary_key=True),
                    sa.Column("revision", sa.Integer(), nullable=False),
                    sa.Column("overrides_json", sa.Text(), nullable=False))
    op.create_table("setting_revisions", sa.Column("id", sa.Integer(), primary_key=True),
                    sa.Column("revision", sa.Integer(), unique=True, nullable=False),
                    sa.Column("snapshot_json", sa.Text(), nullable=False),
                    sa.Column("changed_keys_json", sa.Text(), nullable=False),
                    sa.Column("actor_staff_id", sa.Integer(), sa.ForeignKey("staff_users.id", ondelete="SET NULL")),
                    sa.Column("created_at", sa.DateTime(timezone=True), nullable=False))
    op.execute("INSERT INTO system_settings (id,revision,overrides_json) VALUES (1,1,'{}')")


def downgrade():
    # A downgrade returns runtime policy to ENV. Operators must reconcile ENV first.
    op.drop_table("setting_revisions")
    op.drop_table("system_settings")
    with op.batch_alter_table("clinic_settings") as batch:
        for column in ["revision", "seo_title", "seo_description", "seo_image_url"]:
            batch.drop_column(column)
