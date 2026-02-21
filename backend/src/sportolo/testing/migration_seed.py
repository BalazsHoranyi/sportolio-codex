from __future__ import annotations

from collections.abc import Sequence
from dataclasses import dataclass
from datetime import date

from sqlalchemy import delete
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session

from sportolo.models.fatigue_snapshot import FatigueSnapshot


@dataclass(frozen=True)
class FatigueSnapshotSeed:
    snapshot_id: str
    athlete_id: str
    snapshot_date: date
    global_neural: float
    global_metabolic: float
    regional_recruitment: dict[str, float]
    regional_metabolic: dict[str, float]
    regional_mechanical: dict[str, float]
    derived_recruitment: float | None
    system_capacity_sleep: int | None
    system_capacity_fuel: int
    system_capacity_stress: int


DEFAULT_FATIGUE_SNAPSHOT_SEEDS: tuple[FatigueSnapshotSeed, ...] = (
    FatigueSnapshotSeed(
        snapshot_id="seed-fatigue-001",
        athlete_id="athlete-seed-001",
        snapshot_date=date(2026, 2, 1),
        global_neural=6.1,
        global_metabolic=4.8,
        regional_recruitment={"legs": 6.4, "upper": 4.2},
        regional_metabolic={"legs": 5.1, "upper": 3.2},
        regional_mechanical={"legs": 6.7, "upper": 3.8},
        derived_recruitment=6.0,
        system_capacity_sleep=3,
        system_capacity_fuel=4,
        system_capacity_stress=2,
    ),
    FatigueSnapshotSeed(
        snapshot_id="seed-fatigue-002",
        athlete_id="athlete-seed-001",
        snapshot_date=date(2026, 2, 2),
        global_neural=5.3,
        global_metabolic=5.7,
        regional_recruitment={"legs": 5.2, "upper": 4.1},
        regional_metabolic={"legs": 6.2, "upper": 3.3},
        regional_mechanical={"legs": 5.9, "upper": 3.9},
        derived_recruitment=None,
        system_capacity_sleep=None,
        system_capacity_fuel=3,
        system_capacity_stress=3,
    ),
)


def reset_and_seed_fatigue_snapshots(
    engine: Engine,
    seeds: Sequence[FatigueSnapshotSeed] = DEFAULT_FATIGUE_SNAPSHOT_SEEDS,
) -> list[str]:
    with Session(engine) as session:
        session.execute(delete(FatigueSnapshot))

        for seed in seeds:
            session.add(
                FatigueSnapshot(
                    id=seed.snapshot_id,
                    athlete_id=seed.athlete_id,
                    snapshot_date=seed.snapshot_date,
                    global_neural=seed.global_neural,
                    global_metabolic=seed.global_metabolic,
                    regional_recruitment=seed.regional_recruitment,
                    regional_metabolic=seed.regional_metabolic,
                    regional_mechanical=seed.regional_mechanical,
                    derived_recruitment=seed.derived_recruitment,
                    system_capacity_sleep=seed.system_capacity_sleep,
                    system_capacity_fuel=seed.system_capacity_fuel,
                    system_capacity_stress=seed.system_capacity_stress,
                )
            )

        session.commit()

    return [seed.snapshot_id for seed in seeds]
