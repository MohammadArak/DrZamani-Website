"""Add centrally managed public clinic information.

Revision ID: 20260828_0012
Revises: 20260824_0011
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "20260828_0012"
down_revision = "20260824_0011"
branch_labels = None
depends_on = None


DEFAULT_ADDRESS = "اراک، خیابان خرم، ساختمان پزشکان نیکان، طبقه ششم، واحد B"


def upgrade() -> None:
    with op.batch_alter_table("clinic_settings") as batch_op:
        batch_op.add_column(
            sa.Column(
                "office_phone",
                sa.String(length=32),
                nullable=False,
                server_default="08633146179",
            )
        )
        batch_op.add_column(
            sa.Column(
                "consultation_phone",
                sa.String(length=32),
                nullable=False,
                server_default="09217357728",
            )
        )
        batch_op.add_column(
            sa.Column(
                "email",
                sa.String(length=254),
                nullable=False,
                server_default="info@drfarzadzamani.ir",
            )
        )
        batch_op.add_column(
            sa.Column(
                "address_region",
                sa.String(length=120),
                nullable=False,
                server_default="استان مرکزی",
            )
        )
        batch_op.add_column(
            sa.Column(
                "address_city",
                sa.String(length=120),
                nullable=False,
                server_default="اراک",
            )
        )
        batch_op.add_column(
            sa.Column(
                "working_hours",
                sa.String(length=500),
                nullable=False,
                server_default="روزهای کاری، با هماهنگی قبلی",
            )
        )
        batch_op.add_column(
            sa.Column(
                "site_url",
                sa.String(length=500),
                nullable=False,
                server_default="https://drfarzadzamani.ir",
            )
        )
        batch_op.add_column(
            sa.Column(
                "map_embed_url",
                sa.String(length=1000),
                nullable=False,
                server_default=(
                    "https://neshan.org/maps/iframe/places/"
                    "QbrSKvPB4K9_/34.0784466/49.7015756"
                ),
            )
        )
        batch_op.add_column(
            sa.Column(
                "map_page_url",
                sa.String(length=1000),
                nullable=False,
                server_default="https://neshan.org/maps/places/QbrSKvPB4K9_",
            )
        )
        batch_op.add_column(
            sa.Column(
                "map_latitude",
                sa.Float(),
                nullable=False,
                server_default="34.0784466",
            )
        )
        batch_op.add_column(
            sa.Column(
                "map_longitude",
                sa.Float(),
                nullable=False,
                server_default="49.7015756",
            )
        )
        batch_op.add_column(
            sa.Column(
                "instagram_url",
                sa.String(length=500),
                nullable=False,
                server_default="https://instagram.com/dr.farzad.zamani",
            )
        )
        batch_op.add_column(
            sa.Column(
                "eitaa_url",
                sa.String(length=500),
                nullable=False,
                server_default="https://eitaa.com/drfarzadzamani",
            )
        )

    escaped_address = DEFAULT_ADDRESS.replace("'", "''")
    op.execute(
        "UPDATE clinic_settings "
        f"SET address = '{escaped_address}' "
        "WHERE address IS NULL OR TRIM(address) = ''"
    )


def downgrade() -> None:
    with op.batch_alter_table("clinic_settings") as batch_op:
        batch_op.drop_column("eitaa_url")
        batch_op.drop_column("instagram_url")
        batch_op.drop_column("map_longitude")
        batch_op.drop_column("map_latitude")
        batch_op.drop_column("map_page_url")
        batch_op.drop_column("map_embed_url")
        batch_op.drop_column("site_url")
        batch_op.drop_column("working_hours")
        batch_op.drop_column("address_city")
        batch_op.drop_column("address_region")
        batch_op.drop_column("email")
        batch_op.drop_column("consultation_phone")
        batch_op.drop_column("office_phone")
