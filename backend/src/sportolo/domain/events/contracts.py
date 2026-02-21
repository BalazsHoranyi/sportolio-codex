from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field


class ContractModel(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


class EventMetadataCommon(ContractModel):
    event_id: str = Field(min_length=1)
    occurred_at: datetime
    athlete_id: str = Field(min_length=1)
    correlation_id: str | None = None
    causation_id: str | None = None
    producer: str = Field(min_length=1)


class AxisLoadSnapshot(ContractModel):
    neural: float = Field(ge=0, le=10)
    metabolic: float = Field(ge=0, le=10)
    mechanical: float = Field(ge=0, le=10)
    recruitment: float = Field(ge=0, le=10)


class WorkoutCompletedMetadata(EventMetadataCommon):
    event_type: Literal["workout.completed"]
    event_version: Literal["1.0.0"]


class WorkoutCompletedPayload(ContractModel):
    session_id: str = Field(min_length=1)
    workout_id: str = Field(min_length=1)
    completed_at: datetime
    modality: Literal["strength", "endurance", "hybrid"]
    completion_state: Literal["completed", "partial"]
    source: Literal["manual", "apple", "garmin", "strava", "wahoo"]
    duration_seconds: int = Field(ge=0)
    axis_load: AxisLoadSnapshot
    idempotency_key: str | None = None


class WorkoutCompletedEvent(ContractModel):
    metadata: WorkoutCompletedMetadata
    payload: WorkoutCompletedPayload


class PlanWorkoutMovedMetadata(EventMetadataCommon):
    event_type: Literal["plan.workout.moved"]
    event_version: Literal["1.0.0"]


class PlanWorkoutMovedPayload(ContractModel):
    workout_id: str = Field(min_length=1)
    from_date: date
    to_date: date
    reason: Literal[
        "user_drag_drop",
        "coach_adjustment",
        "goal_rebalance",
        "fatigue_guardrail",
    ]
    initiated_by_role: Literal["athlete", "coach", "system"]
    initiated_by_id: str = Field(min_length=1)
    preserves_session_assignments: bool


class PlanWorkoutMovedEvent(ContractModel):
    metadata: PlanWorkoutMovedMetadata
    payload: PlanWorkoutMovedPayload


class FatigueRecomputedMetadata(EventMetadataCommon):
    event_type: Literal["fatigue.recomputed"]
    event_version: Literal["1.0.0"]


class FatigueRecomputedPayload(ContractModel):
    recompute_id: str = Field(min_length=1)
    trigger: Literal[
        "session_completed",
        "checkin_backfill",
        "plan_move",
        "manual_recompute",
    ]
    as_of: datetime
    window_start: date
    window_end: date
    affected_dates: list[date] = Field(min_length=1)
    source_session_ids: list[str] = Field(default_factory=list)
    model_policy_version: str = Field(min_length=1)
    deterministic_signature: str = Field(min_length=1)


class FatigueRecomputedEvent(ContractModel):
    metadata: FatigueRecomputedMetadata
    payload: FatigueRecomputedPayload


@dataclass(frozen=True)
class EventContract:
    event_type: str
    event_version: str
    schema_model: type[BaseModel]
    example_payload: dict[str, Any]


WORKOUT_COMPLETED_EXAMPLE = {
    "metadata": {
        "event_id": "evt-workout-completed-0001",
        "event_type": "workout.completed",
        "event_version": "1.0.0",
        "occurred_at": "2026-02-21T12:10:00+00:00",
        "athlete_id": "athlete-1",
        "correlation_id": "corr-session-sync-1001",
        "causation_id": "cmd-session-finalize-1001",
        "producer": "tracking.session-state-machine",
    },
    "payload": {
        "session_id": "session-20260221-0001",
        "workout_id": "workout-20260221-0001",
        "completed_at": "2026-02-21T12:09:57+00:00",
        "modality": "hybrid",
        "completion_state": "completed",
        "source": "manual",
        "duration_seconds": 4310,
        "axis_load": {
            "neural": 6.7,
            "metabolic": 5.3,
            "mechanical": 7.2,
            "recruitment": 7.2,
        },
        "idempotency_key": "idem-session-finalize-1001",
    },
}

PLAN_WORKOUT_MOVED_EXAMPLE = {
    "metadata": {
        "event_id": "evt-plan-workout-moved-0001",
        "event_type": "plan.workout.moved",
        "event_version": "1.0.0",
        "occurred_at": "2026-02-21T12:15:00+00:00",
        "athlete_id": "athlete-1",
        "correlation_id": "corr-plan-edit-1001",
        "causation_id": "cmd-calendar-drop-1001",
        "producer": "planning.calendar-service",
    },
    "payload": {
        "workout_id": "workout-20260223-threshold-bike",
        "from_date": "2026-02-23",
        "to_date": "2026-02-24",
        "reason": "user_drag_drop",
        "initiated_by_role": "athlete",
        "initiated_by_id": "athlete-1",
        "preserves_session_assignments": True,
    },
}

FATIGUE_RECOMPUTED_EXAMPLE = {
    "metadata": {
        "event_id": "evt-fatigue-recomputed-0001",
        "event_type": "fatigue.recomputed",
        "event_version": "1.0.0",
        "occurred_at": "2026-02-21T12:20:00+00:00",
        "athlete_id": "athlete-1",
        "correlation_id": "corr-recompute-1001",
        "causation_id": "evt-workout-completed-0001",
        "producer": "fatigue.recompute-service",
    },
    "payload": {
        "recompute_id": "recompute-20260221-0001",
        "trigger": "session_completed",
        "as_of": "2026-02-21T12:20:00+00:00",
        "window_start": "2026-02-15",
        "window_end": "2026-02-21",
        "affected_dates": [
            "2026-02-20",
            "2026-02-21",
        ],
        "source_session_ids": [
            "session-20260221-0001",
        ],
        "model_policy_version": "v1-axis-decay",
        "deterministic_signature": "sig-1f92f10f936f",
    },
}


EVENT_CONTRACT_REGISTRY: tuple[EventContract, ...] = (
    EventContract(
        event_type="workout.completed",
        event_version="1.0.0",
        schema_model=WorkoutCompletedEvent,
        example_payload=WORKOUT_COMPLETED_EXAMPLE,
    ),
    EventContract(
        event_type="plan.workout.moved",
        event_version="1.0.0",
        schema_model=PlanWorkoutMovedEvent,
        example_payload=PLAN_WORKOUT_MOVED_EXAMPLE,
    ),
    EventContract(
        event_type="fatigue.recomputed",
        event_version="1.0.0",
        schema_model=FatigueRecomputedEvent,
        example_payload=FATIGUE_RECOMPUTED_EXAMPLE,
    ),
)


def get_event_contract(event_type: str, event_version: str) -> EventContract:
    for contract in EVENT_CONTRACT_REGISTRY:
        if contract.event_type == event_type and contract.event_version == event_version:
            return contract

    raise KeyError(f"No event contract registered for {event_type}@{event_version}")
