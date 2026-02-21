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
