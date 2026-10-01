"""Consented testimonials; no legacy quote import and no patient foreign key."""
from alembic import op
import sqlalchemy as sa
revision='20261001_0019'
down_revision='20261001_0018'
branch_labels=depends_on=None


def upgrade():
    op.create_table('public_comments',
        sa.Column('id',sa.Integer(),primary_key=True,nullable=False),
        sa.Column('revision',sa.Integer(),nullable=False),
        sa.Column('content_json',sa.Text(),nullable=False),
        sa.Column('published_json',sa.Text(),nullable=True),
        sa.Column('deleted',sa.Boolean(),nullable=False),
        sa.Column('actor_id',sa.Integer(),sa.ForeignKey('staff_users.id'),nullable=False),
        sa.Column('created_at',sa.DateTime(),nullable=False),
        sa.Column('updated_at',sa.DateTime(),nullable=False),
        sa.Column('published_at',sa.DateTime(),nullable=True),
        sa.Column('public_updated_at',sa.DateTime(),nullable=True))


def downgrade():
    # Coordinated DB/media backup is required; retain media files for recovery.
    op.drop_table('public_comments')
