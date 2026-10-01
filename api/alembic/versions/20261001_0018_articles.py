"""Editorial schema; downgrade needs backup of DB and separate media storage."""
from alembic import op
import sqlalchemy as sa

revision = "20261001_0018"
down_revision = "20261001_0017"
branch_labels = depends_on = None


def upgrade():
    op.create_table('articles',
        sa.Column('id', sa.Integer(), primary_key=True, nullable=False),
        sa.Column('slug', sa.String(length=180), unique=True, nullable=False),
        sa.Column('author_id', sa.Integer(), sa.ForeignKey('staff_users.id'), nullable=False),
        sa.Column('revision', sa.Integer(), nullable=False),
        sa.Column('content_json', sa.Text(), nullable=False),
        sa.Column('status', sa.String(length=20), nullable=False),
        sa.Column('published_slug', sa.String(length=180), unique=True, nullable=True),
        sa.Column('published_json', sa.Text(), nullable=True),
        sa.Column('scheduled_json', sa.Text(), nullable=True),
        sa.Column('scheduled_at', sa.DateTime(), nullable=True),
        sa.Column('published_at', sa.DateTime(), nullable=True),
        sa.Column('public_updated_at', sa.DateTime(), nullable=True),
        sa.Column('deleted', sa.Boolean(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
    )
    op.create_index('ix_articles_scheduled_at', 'articles', ['scheduled_at'])
    op.create_table('article_revisions',
        sa.Column('id', sa.Integer(), primary_key=True, nullable=False),
        sa.Column('article_id', sa.Integer(), sa.ForeignKey('articles.id'), nullable=False),
        sa.Column('revision', sa.Integer(), nullable=False),
        sa.Column('content_json', sa.Text(), nullable=False),
        sa.Column('actor_id', sa.Integer(), sa.ForeignKey('staff_users.id'), nullable=True),
        sa.Column('action', sa.String(length=30), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
    )
    op.create_index('ix_article_revisions_article_id', 'article_revisions', ['article_id'])
    op.create_table('article_aliases',
        sa.Column('slug', sa.String(length=180), primary_key=True, nullable=False),
        sa.Column('article_id', sa.Integer(), sa.ForeignKey('articles.id'), nullable=False),
    )
    op.create_index('ix_article_aliases_article_id', 'article_aliases', ['article_id'])
    op.create_table('public_media',
        sa.Column('key', sa.String(length=64), primary_key=True, nullable=False),
        sa.Column('owner_id', sa.Integer(), sa.ForeignKey('staff_users.id'), nullable=False),
        sa.Column('alt', sa.String(length=300), nullable=False),
        sa.Column('width', sa.Integer(), nullable=False),
        sa.Column('height', sa.Integer(), nullable=False),
        sa.Column('size', sa.Integer(), nullable=False),
        sa.Column('deleted', sa.Boolean(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
    )


def downgrade():
    # Files stay on disk for backup/recovery; only editorial database tables are removed.
    op.drop_table('public_media')
    op.drop_table('article_aliases')
    op.drop_table('article_revisions')
    op.drop_table('articles')
