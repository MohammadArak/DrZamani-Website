"""Editable homepage text blocks. Rows are created at startup from the built-in wording."""
from alembic import op
import sqlalchemy as sa

revision = '20261004_0021'
down_revision = '20261004_0020'
branch_labels = depends_on = None


def upgrade():
    op.create_table(
        'site_blocks',
        sa.Column('key', sa.String(40), primary_key=True, nullable=False),
        sa.Column('revision', sa.Integer(), nullable=False),
        sa.Column('content_json', sa.Text(), nullable=False),
        sa.Column('published_json', sa.Text(), nullable=True),
        sa.Column('published_at', sa.DateTime(), nullable=True),
        sa.Column('public_updated_at', sa.DateTime(), nullable=True),
        sa.Column('actor_id', sa.Integer(), sa.ForeignKey('staff_users.id'), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
    )


def downgrade():
    # Edited wording lives only in this table: back up the database before downgrading.
    op.drop_table('site_blocks')
