"""Custom staff roles, permissions, and explicit protected owner. No automatic owner promotion."""

from alembic import op
import sqlalchemy as sa

revision = "20260930_0014"
down_revision = "20260930_0013"
branch_labels = None
depends_on = None

CODES = [
    "appointments.cancel",
    "appointments.edit",
    "appointments.export",
    "appointments.reschedule",
    "appointments.view",
    "articles.create",
    "articles.delete",
    "articles.edit",
    "articles.publish",
    "articles.view",
    "audit.view",
    "comments.create",
    "comments.delete",
    "comments.edit",
    "comments.publish",
    "comments.view",
    "consultations.send",
    "consultations.view",
    "dashboard.view",
    "finance.refund",
    "finance.view",
    "images.view",
    "intake.view",
    "media.manage",
    "operations.run",
    "patients.records.edit",
    "patients.records.view",
    "patients.view",
    "roles.manage",
    "schedule.create",
    "schedule.delete",
    "schedule.edit",
    "schedule.view",
    "secrets.manage",
    "services.create",
    "services.edit",
    "services.view",
    "settings.edit",
    "settings.view",
    "sms.campaigns.create",
    "sms.dispatch",
    "sms.rules.edit",
    "sms.view",
    "staff.manage",
    "waitlist.edit",
    "waitlist.view",
]
BUILTINS = [
    ("superadmin", "مدیرکل", []),
    (
        "admin",
        "مدیر",
        [
            "appointments.cancel",
            "appointments.edit",
            "appointments.export",
            "appointments.reschedule",
            "appointments.view",
            "audit.view",
            "consultations.send",
            "consultations.view",
            "dashboard.view",
            "finance.refund",
            "finance.view",
            "images.view",
            "intake.view",
            "operations.run",
            "patients.records.edit",
            "patients.records.view",
            "patients.view",
            "schedule.create",
            "schedule.delete",
            "schedule.edit",
            "schedule.view",
            "services.create",
            "services.edit",
            "services.view",
            "settings.edit",
            "settings.view",
            "sms.campaigns.create",
            "sms.dispatch",
            "sms.rules.edit",
            "sms.view",
            "waitlist.edit",
            "waitlist.view",
        ],
    ),
    (
        "secretary",
        "منشی",
        [
            "appointments.cancel",
            "appointments.edit",
            "appointments.export",
            "appointments.reschedule",
            "appointments.view",
            "consultations.send",
            "consultations.view",
            "dashboard.view",
            "images.view",
            "intake.view",
            "patients.records.edit",
            "patients.records.view",
            "patients.view",
            "schedule.view",
            "services.view",
            "settings.view",
            "sms.view",
            "waitlist.edit",
            "waitlist.view",
        ],
    ),
    ("accountant", "حسابدار", ["dashboard.view", "finance.refund", "finance.view"]),
    (
        "author",
        "نویسنده",
        ["articles.create", "articles.edit", "articles.view", "media.manage"],
    ),
]


def upgrade():
    roles = op.create_table(
        "roles",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("slug", sa.String(80), nullable=False, unique=True),
        sa.Column("name", sa.String(120), nullable=False),
        sa.Column("description", sa.String(500), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("is_system", sa.Boolean(), nullable=False),
        sa.Column("revision", sa.Integer(), nullable=False),
    )
    permissions = op.create_table(
        "permissions", sa.Column("code", sa.String(80), primary_key=True)
    )
    rp = op.create_table(
        "role_permissions",
        sa.Column(
            "role_id",
            sa.Integer(),
            sa.ForeignKey("roles.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column(
            "permission_code",
            sa.String(80),
            sa.ForeignKey("permissions.code", ondelete="CASCADE"),
            primary_key=True,
        ),
    )
    op.create_table(
        "staff_roles",
        sa.Column(
            "staff_id",
            sa.Integer(),
            sa.ForeignKey("staff_users.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column(
            "role_id",
            sa.Integer(),
            sa.ForeignKey("roles.id", ondelete="CASCADE"),
            primary_key=True,
        ),
    )
    op.bulk_insert(permissions, [{"code": c} for c in CODES])
    for role_id, (slug, name, codes) in enumerate(BUILTINS, 1):
        op.bulk_insert(
            roles,
            [
                dict(
                    id=role_id,
                    slug=slug,
                    name=name,
                    description="نقش پیش‌فرض",
                    is_active=True,
                    is_system=True,
                    revision=1,
                )
            ],
        )
        if codes:
            op.bulk_insert(
                rp, [dict(role_id=role_id, permission_code=c) for c in codes]
            )
        if slug in {"admin", "secretary"}:
            op.get_bind().execute(
                sa.text(
                    "INSERT INTO staff_roles (staff_id, role_id) SELECT id, :rid FROM staff_users WHERE role = :slug"
                ),
                {"rid": role_id, "slug": slug},
            )
    op.execute(
        "UPDATE auth_sessions SET revoked_at = CURRENT_TIMESTAMP WHERE staff_id IS NOT NULL AND revoked_at IS NULL"
    )


def downgrade():
    # Removing granular roles cannot restore broader legacy access through old sessions.
    op.execute(
        "UPDATE auth_sessions SET revoked_at = CURRENT_TIMESTAMP WHERE staff_id IS NOT NULL AND revoked_at IS NULL"
    )
    # Legacy code grants clinical reads to every active staff account. Require an explicit
    # account review before re-enabling anyone after rollback, rather than widening access.
    op.execute("UPDATE staff_users SET is_active = 0")
    op.drop_table("staff_roles")
    op.drop_table("role_permissions")
    op.drop_table("permissions")
    op.drop_table("roles")
