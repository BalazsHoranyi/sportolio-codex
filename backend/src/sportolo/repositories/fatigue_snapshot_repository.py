from __future__ import annotations

from datetime import date

from sqlalchemy.orm import Session

from sportolo.models.fatigue_snapshot import FatigueSnapshot


class FatigueSnapshotRepository:
    def __init__(self, session: Session) -> None:
        self._session = session

    def create_snapshot(
        self,
        *,
        athlete_id: str,
        snapshot_date: date,
        global_neural: float,
        global_metabolic: float,
        regional_recruitment: dict[str, float],
        regional_metabolic: dict[str, float],
        regional_mechanical: dict[str, float],
        system_capacity_sleep: int | None,
        system_capacity_fuel: int,
        system_capacity_stress: int,
        derived_recruitment: float | None,
    ) -> FatigueSnapshot:
        self._validate_capacity("sleep", system_capacity_sleep, allow_none=True)
        self._validate_capacity("fuel", system_capacity_fuel)
        self._validate_capacity("stress", system_capacity_stress)

        recruitment_payload = self._normalize_axis_payload(regional_recruitment)
        metabolic_payload = self._normalize_axis_payload(regional_metabolic)
        mechanical_payload = self._normalize_axis_payload(regional_mechanical)

        snapshot = FatigueSnapshot(
            athlete_id=athlete_id,
            snapshot_date=snapshot_date,
            global_neural=float(global_neural),
            global_metabolic=float(global_metabolic),
            regional_recruitment=recruitment_payload,
            regional_metabolic=metabolic_payload,
            regional_mechanical=mechanical_payload,
            derived_recruitment=None if derived_recruitment is None else float(derived_recruitment),
            system_capacity_sleep=system_capacity_sleep,
            system_capacity_fuel=system_capacity_fuel,
            system_capacity_stress=system_capacity_stress,
        )

        self._session.add(snapshot)
        self._session.commit()
        self._session.refresh(snapshot)
        return snapshot

    def get_snapshot(self, snapshot_id: str) -> FatigueSnapshot | None:
        return self._session.get(FatigueSnapshot, snapshot_id)

    @staticmethod
    def _validate_capacity(name: str, value: int | None, *, allow_none: bool = False) -> None:
        if value is None:
            if allow_none:
                return
            raise ValueError(f"{name} must be between 1 and 5")

        if value < 1 or value > 5:
            raise ValueError(f"{name} must be between 1 and 5")

    @staticmethod
    def _normalize_axis_payload(payload: dict[str, float]) -> dict[str, float]:
        normalized: dict[str, float] = {}
        for key in sorted(payload):
            value = float(payload[key])
            if value < 0:
                raise ValueError("regional axis values must be greater than or equal to 0")
            normalized[key] = value
        return normalized
