from __future__ import annotations

from typing import Literal
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from pydantic import AwareDatetime, BaseModel, ConfigDict, Field, field_validator

SessionState = Literal["planned", "in_progress", "completed", "partial", "abandoned"]
BoundarySource = Literal["sleep_event", "local_midnight"]


def _to_camel(value: str) -> str:
    parts = value.split("_")
    return parts[0] + "".join(part.capitalize() for part in parts[1:])


class CamelModel(BaseModel):
    model_config = ConfigDict(populate_by_name=True, alias_generator=_to_camel)


class FatigueAxes(CamelModel):
    neural: float = Field(ge=0)
    metabolic: float = Field(ge=0)
    mechanical: float = Field(ge=0)
    recruitment: float = Field(ge=0)


class SessionFatigueInput(CamelModel):
    session_id: str
    state: SessionState
    ended_at: AwareDatetime | None = None
    fatigue_axes: FatigueAxes


class SleepEventInput(CamelModel):
    sleep_ended_at: AwareDatetime


class TodayAccumulationRequest(CamelModel):
    as_of: AwareDatetime
    timezone: str
    sessions: list[SessionFatigueInput] = Field(default_factory=list)
    sleep_events: list[SleepEventInput] = Field(default_factory=list)

    @field_validator("timezone")
    @classmethod
    def validate_timezone(cls, value: str) -> str:
        try:
            ZoneInfo(value)
        except ZoneInfoNotFoundError as exc:
            raise ValueError("timezone must be a valid IANA timezone") from exc
        return value


class RolloverBoundary(CamelModel):
    boundary_start: AwareDatetime
    boundary_end: AwareDatetime
    boundary_source: BoundarySource
    timezone: str


class TodayAccumulationResponse(CamelModel):
    as_of: AwareDatetime
    boundary: RolloverBoundary
    included_session_ids: list[str]
    excluded_session_ids: list[str]
    accumulated_fatigue: FatigueAxes
