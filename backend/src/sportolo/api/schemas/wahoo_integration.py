from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

WahooStepType = Literal["warmup", "interval", "recovery", "cooldown", "steady"]
WahooTargetType = Literal["power", "pace", "heart_rate", "cadence"]
WahooPushStatus = Literal["accepted", "failed"]
WahooSyncStatus = Literal["completed"]
WahooDedupStatus = Literal["new_linked", "duplicate_linked", "new_unlinked", "duplicate_unlinked"]
PipelineName = Literal["fatigue", "analytics"]
PipelineDispatchStatus = Literal["queued"]
WahooControlMode = Literal["erg", "resistance", "slope"]
WahooControlStatus = Literal["applied", "safety_fallback", "failed"]
WahooControlTransition = Literal[
    "mode_changed",
    "reconnected_mode_changed",
    "fallback_applied",
    "failed",
]
WahooConnectionState = Literal["connected", "disconnected"]
WahooControlTelemetryEventType = Literal[
    "reconnect_attempted",
    "reconnect_acknowledged",
    "reconnect_failed",
    "command_issued",
    "command_acknowledged",
    "command_failed",
    "safety_fallback_issued",
    "safety_fallback_acknowledged",
    "safety_fallback_failed",
]


def _to_camel(value: str) -> str:
    parts = value.split("_")
    return parts[0] + "".join(part.capitalize() for part in parts[1:])


class CamelModel(BaseModel):
    model_config = ConfigDict(populate_by_name=True, alias_generator=_to_camel)


class WahooWorkoutStep(CamelModel):
    step_type: WahooStepType
    duration_seconds: int = Field(gt=0)
    target_type: WahooTargetType
    target_value: float = Field(gt=0)
    target_unit: str = Field(min_length=1, max_length=32)


class WahooWorkoutPushRequest(CamelModel):
    idempotency_key: str = Field(min_length=1, max_length=128)
    planned_workout_id: str = Field(min_length=1, max_length=128)
    trainer_id: str = Field(min_length=1, max_length=128)
    workout_name: str = Field(min_length=1, max_length=160)
    planned_start_at: datetime | None = None
    steps: list[WahooWorkoutStep] = Field(min_length=1, max_length=200)


class WahooWorkoutPushResponse(CamelModel):
    push_id: str
    provider: Literal["wahoo"] = "wahoo"
    status: WahooPushStatus
    idempotency_key: str
    planned_workout_id: str
    external_workout_id: str | None = None
    step_count: int = Field(ge=0)
    total_duration_seconds: int = Field(ge=0)
    received_at: datetime
    failure_reason: str | None = None


class WahooExecutionHistorySyncRequest(CamelModel):
    idempotency_key: str = Field(min_length=1, max_length=128)
    started_after: datetime | None = None
    started_before: datetime | None = None

    @model_validator(mode="after")
    def validate_window(self) -> WahooExecutionHistorySyncRequest:
        if self.started_after is not None and self.started_before is not None:
            if self.started_after > self.started_before:
                raise ValueError("startedAfter must be before or equal to startedBefore")
        return self


class WahooExecutionHistoryEntry(CamelModel):
    import_id: str
    external_activity_id: str
    external_workout_id: str
    planned_workout_id: str | None = None
    dedup_status: WahooDedupStatus
    sequence_number: int = Field(ge=1)
    started_at: datetime
    completed_at: datetime
    duration_seconds: int = Field(gt=0)


class PipelineDispatch(CamelModel):
    dispatch_id: str
    pipeline: PipelineName
    external_activity_id: str
    planned_workout_id: str | None = None
    sequence_number: int = Field(ge=1)
    status: PipelineDispatchStatus = "queued"


class WahooExecutionHistorySyncResponse(CamelModel):
    sync_id: str
    provider: Literal["wahoo"] = "wahoo"
    status: WahooSyncStatus = "completed"
    idempotency_key: str
    started_after: datetime | None = None
    started_before: datetime | None = None
    imported_count: int = Field(ge=0)
    duplicate_count: int = Field(ge=0)
    entries: list[WahooExecutionHistoryEntry]
    pipeline_dispatches: list[PipelineDispatch]


class WahooControlTelemetryEvent(CamelModel):
    event_id: str
    event_type: WahooControlTelemetryEventType
    connection_state: WahooConnectionState
    occurred_at: datetime
    mode: WahooControlMode | None = None
    error_code: str | None = None


class WahooTrainerControlRequest(CamelModel):
    idempotency_key: str = Field(min_length=1, max_length=128)
    trainer_id: str = Field(min_length=1, max_length=128)
    mode: WahooControlMode
    target_value: float
    target_unit: str = Field(min_length=1, max_length=32)
    requested_at: datetime | None = None

    @model_validator(mode="after")
    def validate_mode_target(self) -> WahooTrainerControlRequest:
        if self.mode == "erg":
            if self.target_unit != "watts":
                raise ValueError("erg mode requires targetUnit watts")
            if self.target_value <= 0:
                raise ValueError("erg mode targetValue must be greater than zero")
            return self

        if self.mode == "resistance":
            if self.target_unit != "ratio":
                raise ValueError("resistance mode requires targetUnit ratio")
            if self.target_value < 0 or self.target_value > 1:
                raise ValueError("resistance mode targetValue must be between 0 and 1")
            return self

        if self.target_unit != "percent":
            raise ValueError("slope mode requires targetUnit percent")
        if self.target_value < -25 or self.target_value > 25:
            raise ValueError("slope mode targetValue must be between -25 and 25")
        return self


class WahooTrainerControlResponse(CamelModel):
    command_id: str
    provider: Literal["wahoo"] = "wahoo"
    status: WahooControlStatus
    idempotency_key: str
    trainer_id: str
    requested_mode: WahooControlMode
    requested_target_value: float
    requested_target_unit: str
    applied_mode: WahooControlMode | None = None
    applied_target_value: float | None = None
    applied_target_unit: str | None = None
    connection_state: WahooConnectionState
    transition: WahooControlTransition
    failure_reason: str | None = None
    issued_at: datetime
    telemetry_events: list[WahooControlTelemetryEvent]
