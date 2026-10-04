"""A permission added by a release reaches the default roles once and never overrides later removals."""
from sqlalchemy import select

from app.access import seed_access
from app.database import SessionLocal
from app.models import Permission, Role
from test_roles import client, schema  # noqa: F401


def role_codes(db, slug):
    return {p.code for p in db.scalar(select(Role).where(Role.slug == slug)).permissions}


def test_new_permission_reaches_default_roles_once():
    with SessionLocal.begin() as db:
        seed_access(db)
        db.delete(db.scalar(select(Permission).where(Permission.code == "site_gallery.edit")))  # as if the release is new
    with SessionLocal.begin() as db:
        assert "site_gallery.edit" not in role_codes(db, "admin")
        seed_access(db)
    with SessionLocal.begin() as db:
        assert "site_gallery.edit" in role_codes(db, "admin") and "site_gallery.edit" in role_codes(db, "content_editor")
        assert "site_gallery.edit" not in role_codes(db, "accountant")
        admin = db.scalar(select(Role).where(Role.slug == "admin"))
        admin.permissions = [p for p in admin.permissions if p.code != "site_gallery.edit"]  # the owner removes it
    with SessionLocal.begin() as db:
        seed_access(db)
    with SessionLocal() as db:
        assert "site_gallery.edit" not in role_codes(db, "admin")
