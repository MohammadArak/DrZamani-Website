"""Editable public service pages. Rows are created at startup from the built-in catalog."""
from alembic import op
import sqlalchemy as sa

revision = '20261004_0020'
down_revision = '20261001_0019'
branch_labels = depends_on = None


def upgrade():
    op.create_table(
        'site_services',
        sa.Column('id', sa.Integer(), primary_key=True, nullable=False),
        sa.Column('slug', sa.String(80), nullable=False, unique=True),
        sa.Column('revision', sa.Integer(), nullable=False),
        sa.Column('content_json', sa.Text(), nullable=False),
        sa.Column('published_json', sa.Text(), nullable=True),
        sa.Column('published_at', sa.DateTime(), nullable=True),
        sa.Column('public_updated_at', sa.DateTime(), nullable=True),
        sa.Column('deleted', sa.Boolean(), nullable=False),
        sa.Column('actor_id', sa.Integer(), sa.ForeignKey('staff_users.id'), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
    )


def downgrade():
    # Edited service text lives only in this table: back up the database before downgrading.
    op.drop_table('site_services')
