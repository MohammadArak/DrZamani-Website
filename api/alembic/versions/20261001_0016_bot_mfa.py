"""Provider proofs and owner MFA; no external providers or MFA are enabled."""
from alembic import op
import json
import sqlalchemy as sa

revision = "20261001_0016"
down_revision = "20260930_0015"
branch_labels = depends_on = None


def upgrade():
    op.create_table("bot_challenges",
        sa.Column("id", sa.String(64), primary_key=True),
        sa.Column("provider", sa.String(24), nullable=False),
        sa.Column("operation", sa.String(32), nullable=False),
        sa.Column("ip_hash", sa.String(64), nullable=False),
        sa.Column("policy_hash", sa.String(64), nullable=False),
        sa.Column("fallback_used", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("token_hash", sa.String(64), unique=True),
        sa.Column("expires_at", sa.DateTime(), nullable=False),
        sa.Column("consumed_at", sa.DateTime()))
    op.create_index("ix_bot_challenges_expires_at", "bot_challenges", ["expires_at"])
    op.create_table("captcha_attestations",
        sa.Column("fingerprint", sa.String(64), primary_key=True),
        sa.Column("provider", sa.String(24), nullable=False),
        sa.Column("actor_staff_id", sa.Integer(), sa.ForeignKey("staff_users.id", ondelete="SET NULL")),
        sa.Column("verified_at", sa.DateTime(), nullable=False))
    op.create_table("staff_mfa",
        sa.Column("staff_id", sa.Integer(), sa.ForeignKey("staff_users.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("enabled", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("secret_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("recovery_hashes_json", sa.Text(), nullable=False, server_default="[]"),
        sa.Column("revision", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("last_counter", sa.Integer(), nullable=False, server_default="-1"),
        sa.Column("pending_json", sa.Text()), sa.Column("pending_id", sa.String(64)),
        sa.Column("pending_expires_at", sa.DateTime()))
    op.create_table("mfa_challenges",
        sa.Column("id", sa.String(64), primary_key=True),
        sa.Column("staff_id", sa.Integer(), sa.ForeignKey("staff_users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("state_hash", sa.String(64), nullable=False),
        sa.Column("ip_hash", sa.String(64), nullable=False),
        sa.Column("browser", sa.Boolean(), nullable=False),
        sa.Column("expires_at", sa.DateTime(), nullable=False),
        sa.Column("attempts", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("consumed_at", sa.DateTime()))
    op.create_index("ix_mfa_challenges_staff_id", "mfa_challenges", ["staff_id"])
    op.create_index("ix_mfa_challenges_expires_at", "mfa_challenges", ["expires_at"])
    # Session fingerprints now include MFA state; require a fresh staff login.
    op.execute("UPDATE auth_sessions SET revoked_at=CURRENT_TIMESTAMP WHERE staff_id IS NOT NULL AND revoked_at IS NULL")


def downgrade():
    # Old code cannot enforce MFA/CAPTCHA. Require an explicit account review after rollback.
    op.execute("UPDATE auth_sessions SET revoked_at=CURRENT_TIMESTAMP WHERE staff_id IS NOT NULL AND revoked_at IS NULL")
    op.execute("UPDATE staff_users SET is_active=0")
    keys = {"turnstile_enabled", "turnstile_site_key", "turnstile_secret", "google_enabled", "google_site_key",
        "google_project_id", "google_api_key", "google_min_score", "captcha_primary", "captcha_fallback",
        "captcha_staff_login", "captcha_otp_request", "captcha_otp_verify", "captcha_hostnames", "mfa_required_owners"}
    bind = op.get_bind()
    for row in bind.execute(sa.text("SELECT id,overrides_json FROM system_settings")).mappings():
        values = json.loads(row["overrides_json"])
        bind.execute(sa.text("UPDATE system_settings SET overrides_json=:value WHERE id=:id"),
            {"value": json.dumps({k:v for k,v in values.items() if k not in keys}), "id": row["id"]})
    for row in bind.execute(sa.text("SELECT id,snapshot_json,changed_keys_json FROM setting_revisions")).mappings():
        snapshot = json.loads(row["snapshot_json"])
        snapshot["overrides"] = {k:v for k,v in snapshot["overrides"].items() if k not in keys}
        changed = [k for k in json.loads(row["changed_keys_json"]) if k not in keys]
        bind.execute(sa.text("UPDATE setting_revisions SET snapshot_json=:snapshot,changed_keys_json=:changed WHERE id=:id"),
            {"snapshot": json.dumps(snapshot), "changed": json.dumps(changed), "id": row["id"]})
    op.drop_table("mfa_challenges")
    op.drop_table("staff_mfa")
    op.drop_table("captcha_attestations")
    op.drop_table("bot_challenges")
