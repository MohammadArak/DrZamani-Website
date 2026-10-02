"""New-install examples must not admit real providers or ephemeral editorial storage."""

from pathlib import Path, PurePosixPath

from dotenv import dotenv_values


ROOT = Path(__file__).resolve().parents[2]


def test_production_example_keeps_external_actions_closed():
    values = dotenv_values(ROOT / "deploy/env.production.example")
    assert values["APP_ENV"] == "production"
    assert values["APP_DEBUG"] == "false"
    assert values["BOOKING_ENABLED"] == "false"
    assert values["SMS_PROVIDER"] == "disabled"
    for key in ("FARAZ_API_KEY", "ZARINPAL_MERCHANT_ID", "BOOTSTRAP_ADMIN_USERNAME", "BOOTSTRAP_ADMIN_PASSWORD"):
        assert not values[key]
    assert values["TURNSTILE_ENABLED"] == values["GOOGLE_ENABLED"] == "false"


def test_editorial_storage_survives_release_switch_and_is_private():
    values = dotenv_values(ROOT / "deploy/env.production.example")
    public = PurePosixPath(values["PUBLIC_MEDIA_DIR"])
    private = PurePosixPath(values["UPLOAD_DIR"])
    assert public == PurePosixPath("/var/lib/drzamani/public-media")
    assert public != private and public.parent == private.parent
    assert "/var/www" not in str(public)
    installer = (ROOT / "deploy/install-vps.sh").read_text(encoding="utf8")
    assert "install -d -o www-data -g www-data -m 0700 /var/lib/drzamani/public-media" in installer
