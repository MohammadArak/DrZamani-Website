"""Give the default admin role the article, comment and media permissions it was created without.

Roles created by the original role migration did not include them; a fresh install seeds them from the
catalog but existing databases never did. The grant happens once here, so a later removal by the owner
is respected (nothing re-adds it).
"""
from alembic import op
import sqlalchemy as sa

revision = '20261005_0023'
down_revision = '20261004_0022'
branch_labels = depends_on = None

CODES = [
    'articles.view', 'articles.create', 'articles.edit', 'articles.publish', 'articles.delete',
    'comments.view', 'comments.create', 'comments.edit', 'comments.publish', 'comments.delete',
    'media.manage',
]


def upgrade():
    bind = op.get_bind()
    role_id = bind.execute(sa.text("SELECT id FROM roles WHERE slug = 'admin'")).scalar()
    if role_id is None:
        return
    for code in CODES:
        bind.execute(sa.text("INSERT OR IGNORE INTO permissions (code) VALUES (:code)"), {"code": code})
        bind.execute(
            sa.text("INSERT OR IGNORE INTO role_permissions (role_id, permission_code) VALUES (:role, :code)"),
            {"role": role_id, "code": code},
        )


def downgrade():
    # Which grants were original and which came from this migration is not recorded; nothing is revoked.
    pass
