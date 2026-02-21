from __future__ import annotations

from pathlib import Path

from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, inspect, select
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session

from sportolo.models.fatigue_snapshot import FatigueSnapshot
from sportolo.testing.migration_seed import (
    DEFAULT_FATIGUE_SNAPSHOT_SEEDS,
    reset_and_seed_fatigue_snapshots,
)

BACKEND_DIR = Path(__file__).resolve().parents[2]
ALEMBIC_INI = BACKEND_DIR / "alembic.ini"


def _build_config(database_url: str) -> Config:
    config = Config(str(ALEMBIC_INI))
    config.set_main_option("script_location", str(BACKEND_DIR / "migrations"))
    config.set_main_option("sqlalchemy.url", database_url)
    return config


def _schema_signature(database_url: str) -> dict[str, tuple[str, ...]]:
    engine = create_engine(database_url, future=True)
    try:
        inspector = inspect(engine)
        signature: dict[str, tuple[str, ...]] = {}
        for table_name in sorted(inspector.get_table_names()):
            columns = tuple(sorted(column["name"] for column in inspector.get_columns(table_name)))
            signature[table_name] = columns
        return signature
    finally:
        engine.dispose()


def _snapshot_rows(engine: Engine) -> list[dict[str, object]]:
    with Session(engine) as session:
        snapshots = session.scalars(select(FatigueSnapshot).order_by(FatigueSnapshot.id)).all()

    return [
        {
            "id": snapshot.id,
            "athlete_id": snapshot.athlete_id,
            "snapshot_date": snapshot.snapshot_date.isoformat(),
            "global_neural": snapshot.global_neural,
            "global_metabolic": snapshot.global_metabolic,
            "regional_recruitment": snapshot.regional_recruitment,
            "regional_metabolic": snapshot.regional_metabolic,
            "regional_mechanical": snapshot.regional_mechanical,
            "derived_recruitment": snapshot.derived_recruitment,
            "system_capacity_sleep": snapshot.system_capacity_sleep,
            "system_capacity_fuel": snapshot.system_capacity_fuel,
            "system_capacity_stress": snapshot.system_capacity_stress,
        }
        for snapshot in snapshots
    ]


def test_latest_migration_upgrade_rollback_upgrade_cycle_is_deterministic(tmp_path: Path) -> None:
    database_path = tmp_path / "migration-pipeline.db"
    database_url = f"sqlite+pysqlite:///{database_path}"
    config = _build_config(database_url)

    command.upgrade(config, "head")
    first_signature = _schema_signature(database_url)

    command.downgrade(config, "-1")
    downgraded_signature = _schema_signature(database_url)

    command.upgrade(config, "head")
    second_signature = _schema_signature(database_url)

    assert "fatigue_snapshots" in first_signature
    assert "fatigue_snapshots" not in downgraded_signature
    assert second_signature == first_signature


def test_migration_seed_fixture_strategy_is_repeatable(tmp_path: Path) -> None:
    database_path = tmp_path / "migration-seed.db"
    database_url = f"sqlite+pysqlite:///{database_path}"
    config = _build_config(database_url)

    command.upgrade(config, "head")

    engine = create_engine(database_url, future=True)
    try:
        first_seed_ids = reset_and_seed_fatigue_snapshots(engine)
        first_rows = _snapshot_rows(engine)

        second_seed_ids = reset_and_seed_fatigue_snapshots(engine)
        second_rows = _snapshot_rows(engine)
    finally:
        engine.dispose()

    assert first_seed_ids == second_seed_ids
    assert [seed.snapshot_id for seed in DEFAULT_FATIGUE_SNAPSHOT_SEEDS] == first_seed_ids
    assert second_rows == first_rows
