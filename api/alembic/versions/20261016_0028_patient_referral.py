"""Record how a patient found the clinic; existing records remain unknown."""
from alembic import op
import sqlalchemy as sa

revision = "20261016_0028"
down_revision = "20261016_0027"
branch_labels = depends_on = None

def upgrade():
    op.add_column("patients", sa.Column("referral_source", sa.String(32), nullable=True))
    op.add_column("patients", sa.Column("referral_detail", sa.String(500), nullable=True))

def downgrade():
    op.drop_column("patients", "referral_detail")
    op.drop_column("patients", "referral_source")
