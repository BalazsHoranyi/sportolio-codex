from __future__ import annotations

from datetime import date

from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from sportolo.models.base import Base
from sportolo.models.fatigue_snapshot import FatigueSnapshot
from sportolo.repositories.fatigue_snapshot_repository import FatigueSnapshotRepository


def _build_repository() -> tuple[Session, FatigueSnapshotRepository]:
    engine = create_engine("sqlite+pysqlite:///:memory:", future=True)
    Base.metadata.create_all(engine)
    session = Session(bind=engine)
    return session, FatigueSnapshotRepository(session)


def test_repository_persists_4_axis_and_system_capacity_payload() -> None:
    session, repository = _build_repository()

    created = repository.create_snapshot(
        athlete_id="athlete-1",
        snapshot_date=date(2026, 2, 21),
        global_neural=7.2,
        global_metabolic=5.6,
        regional_recruitment={"upper": 4.2, "lower": 6.1},
        regional_metabolic={"upper": 3.8, "lower": 5.0},
        regional_mechanical={"upper": 4.0, "lower": 6.7},
        system_capacity_sleep=2,
        system_capacity_fuel=3,
        system_capacity_stress=4,
        derived_recruitment=5.3,
    )

    loaded = repository.get_snapshot(created.id)

    assert loaded is not None
    assert loaded.athlete_id == "athlete-1"
    assert loaded.snapshot_date == date(2026, 2, 21)
    assert loaded.global_neural == 7.2
    assert loaded.global_metabolic == 5.6
    assert loaded.regional_recruitment == {"upper": 4.2, "lower": 6.1}
    assert loaded.regional_metabolic == {"upper": 3.8, "lower": 5.0}
    assert loaded.regional_mechanical == {"upper": 4.0, "lower": 6.7}
    assert loaded.system_capacity_sleep == 2
    assert loaded.system_capacity_fuel == 3
    assert loaded.system_capacity_stress == 4
    assert loaded.derived_recruitment == 5.3

    session.close()


def test_repository_supports_optional_derived_recruitment_storage() -> None:
    session, repository = _build_repository()

    created = repository.create_snapshot(
        athlete_id="athlete-2",
        snapshot_date=date(2026, 2, 22),
        global_neural=3.1,
        global_metabolic=4.4,
        regional_recruitment={"full_body": 3.0},
        regional_metabolic={"full_body": 4.1},
        regional_mechanical={"full_body": 2.9},
        system_capacity_sleep=None,
        system_capacity_fuel=5,
        system_capacity_stress=1,
        derived_recruitment=None,
    )

    loaded = repository.get_snapshot(created.id)

    assert loaded is not None
    assert loaded.system_capacity_sleep is None
    assert loaded.derived_recruitment is None

    session.close()


def test_model_columns_exclude_legacy_lihc_hilc_names() -> None:
    legacy_column_names = {
        "lihc",
        "hilc",
        "global_lihc",
        "global_hilc",
        "regional_lihc",
        "regional_hilc",
    }
    column_names = set(FatigueSnapshot.__table__.columns.keys())

    assert column_names.isdisjoint(legacy_column_names)
