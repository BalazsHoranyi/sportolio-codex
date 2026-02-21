from __future__ import annotations

from pathlib import Path

from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, inspect

BACKEND_DIR = Path(__file__).resolve().parents[2]
ALEMBIC_INI = BACKEND_DIR / "alembic.ini"


REQUIRED_COLUMNS = {
    "id",
    "athlete_id",
    "snapshot_date",
    "global_neural",
    "global_metabolic",
    "regional_recruitment",
    "regional_metabolic",
    "regional_mechanical",
    "derived_recruitment",
    "system_capacity_sleep",
    "system_capacity_fuel",
    "system_capacity_stress",
    "created_at",
}

LEGACY_COLUMNS = {
    "lihc",
    "hilc",
    "global_lihc",
    "global_hilc",
    "regional_lihc",
    "regional_hilc",
}


def _build_config(database_url: str) -> Config:
    config = Config(str(ALEMBIC_INI))
    config.set_main_option("script_location", str(BACKEND_DIR / "migrations"))
    config.set_main_option("sqlalchemy.url", database_url)
    return config


def _column_names(database_url: str, table_name: str) -> set[str]:
    engine = create_engine(database_url, future=True)
    try:
        inspector = inspect(engine)
        return {column["name"] for column in inspector.get_columns(table_name)}
    finally:
        engine.dispose()


def _table_names(database_url: str) -> set[str]:
    engine = create_engine(database_url, future=True)
    try:
        inspector = inspect(engine)
        return set(inspector.get_table_names())
    finally:
        engine.dispose()


def test_fatigue_snapshot_migration_upgrade_and_downgrade_are_deterministic(tmp_path: Path) -> None:
    database_path = tmp_path / "sprt26-schema.db"
    database_url = f"sqlite+pysqlite:///{database_path}"
    config = _build_config(database_url)

    command.upgrade(config, "head")

    first_upgrade_columns = _column_names(database_url, "fatigue_snapshots")
    assert REQUIRED_COLUMNS.issubset(first_upgrade_columns)
    assert first_upgrade_columns.isdisjoint(LEGACY_COLUMNS)

    command.downgrade(config, "base")

    assert "fatigue_snapshots" not in _table_names(database_url)

    command.upgrade(config, "head")

    second_upgrade_columns = _column_names(database_url, "fatigue_snapshots")
    assert second_upgrade_columns == first_upgrade_columns
