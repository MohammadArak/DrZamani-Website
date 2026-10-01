"""Close legacy booking on upgrade; durable SMS leases and event deduplication."""
import json
from alembic import op
import sqlalchemy as sa

revision = "20261001_0017"
down_revision = "20261001_0016"
branch_labels = depends_on = None


def upgrade():
    with op.batch_alter_table("sms_outbox") as batch:
        batch.add_column(sa.Column("dedupe_key", sa.String(160)))
        batch.add_column(sa.Column("claim_token", sa.String(64)))
        batch.add_column(sa.Column("claim_until", sa.DateTime()))
        batch.add_column(sa.Column("next_attempt_at", sa.DateTime()))
        batch.create_unique_constraint("uq_sms_outbox_dedupe_key", ["dedupe_key"])
    bind = op.get_bind()
    row = bind.execute(sa.text("SELECT overrides_json FROM system_settings WHERE id=1")).scalar()
    if row is not None:
        values = json.loads(row)
        values["booking_enabled"] = False
        bind.execute(sa.text("UPDATE system_settings SET overrides_json=:values, revision=revision+1 WHERE id=1"), {"values": json.dumps(values)})
    else:
        bind.execute(sa.text("INSERT INTO system_settings (id,revision,overrides_json) VALUES (1,1,:values)"), {"values": json.dumps({"booking_enabled": False})})
    bind.execute(sa.text("UPDATE clinic_settings SET revision=(SELECT revision FROM system_settings WHERE id=1) WHERE id=1"))


def downgrade():
    # Older code lacks the booking switch: rollback requires maintenance mode.
    bind = op.get_bind()
    bind.execute(sa.text("UPDATE sms_outbox SET status='failed', attempts=3, last_error='Rollback: delivery receipt requires manual review' WHERE status='sending'"))
    for row in bind.execute(sa.text("SELECT id,overrides_json FROM system_settings")).mappings():
        values = json.loads(row["overrides_json"])
        for key in ("booking_enabled", "booking_disabled_message"):
            values.pop(key, None)
        bind.execute(sa.text("UPDATE system_settings SET overrides_json=:value WHERE id=:id"), {"value": json.dumps(values), "id": row["id"]})
    for row in bind.execute(sa.text("SELECT id,snapshot_json,changed_keys_json FROM setting_revisions")).mappings():
        snapshot = json.loads(row["snapshot_json"])
        keys = {"booking_enabled", "booking_disabled_message"}
        snapshot["overrides"] = {k: v for k,v in snapshot["overrides"].items() if k not in keys}
        changed = [k for k in json.loads(row["changed_keys_json"]) if k not in keys]
        bind.execute(sa.text("UPDATE setting_revisions SET snapshot_json=:s,changed_keys_json=:c WHERE id=:id"), {"s": json.dumps(snapshot), "c": json.dumps(changed), "id": row["id"]})
    with op.batch_alter_table("sms_outbox") as batch:
        batch.drop_constraint("uq_sms_outbox_dedupe_key", type_="unique")
        for key in ("dedupe_key", "claim_token", "claim_until", "next_attempt_at"):
            batch.drop_column(key)
