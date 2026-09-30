from __future__ import annotations

from logging.config import fileConfig

from alembic import context
from sqlalchemy import engine_from_config, pool

from app.config import get_settings
from app.database import Base
from app import models  # noqa: F401


config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

config.set_main_option("sqlalchemy.url", get_settings().database_url)
target_metadata = Base.metadata


def run_migrations_offline() -> None:
    context.configure(
        url=config.get_main_option("sqlalchemy.url"),
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        if connection.dialect.name == "sqlite":
            # Run SQLite schema changes in driver-level autocommit mode.
            # This avoids SQLAlchemy's implicit transaction being rolled back
            # after Alembic (correctly) treats SQLite DDL as non-transactional.
            connection = connection.execution_options(isolation_level="AUTOCOMMIT")
            connection.exec_driver_sql("PRAGMA foreign_keys=ON")
            # Migrations are exclusive maintenance operations. DELETE journal
            # mode guarantees the migrated schema is checkpointed into the
            # database file itself before it is copied or deployed.
            connection.exec_driver_sql("PRAGMA journal_mode=DELETE")
            # PRAGMA starts an implicit SQLite transaction. Commit it before
            # Alembic manages the migration transaction/version table.
            connection.commit()
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
            render_as_batch=connection.dialect.name == "sqlite",
            transactional_ddl=False,
        )
        with context.begin_transaction():
            context.run_migrations()
        # SQLAlchemy 2 starts an implicit transaction for SQLite DDL while
        # Alembic treats SQLite as non-transactional. Commit explicitly so a
        # successful migration is not rolled back when the connection closes.
        if connection.dialect.name == "sqlite":
            connection.commit()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
