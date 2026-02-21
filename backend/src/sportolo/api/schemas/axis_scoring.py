from __future__ import annotations

from datetime import date
from typing import Literal
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from pydantic import AwareDatetime, BaseModel, ConfigDict, Field, field_validator

SessionState = Literal["planned", "in_progress", "completed", "partial", "abandoned"]


def _to_camel(value: str) -> str:
    parts = value.split("_")
    return parts[0] + "".join(part.capitalize() for part in parts[1:])


class CamelModel(BaseModel):
    model_config = ConfigDict(populate_by_name=True, alias_generator=_to_camel)


class AxisRawLoad(CamelModel):
    neural: float = Field(ge=0)
    metabolic: float = Field(ge=0)
    mechanical: float = Field(ge=0)


class AxisSessionInput(CamelModel):
    session_id: str
    state: SessionState
    ended_at: AwareDatetime | None = None
    raw_load: AxisRawLoad


class SleepEventInput(CamelModel):
    sleep_ended_at: AwareDatetime


class AxisSeriesRequest(CamelModel):
    as_of: AwareDatetime
    timezone: str
    lookback_days: int = Field(default=7, ge=1, le=30)
    sessions: list[AxisSessionInput] = Field(default_factory=list)
    sleep_events: list[SleepEventInput] = Field(default_factory=list)

    @field_validator("timezone")
    @classmethod
    def validate_timezone(cls, value: str) -> str:
        try:
            ZoneInfo(value)
        except ZoneInfoNotFoundError as exc:
            raise ValueError("timezone must be a valid IANA timezone") from exc
        return value


class AxisSessionSpike(CamelModel):
    session_id: str
    ended_at: AwareDatetime
    local_date: date
    neural: float
    metabolic: float
    mechanical: float
    recruitment: float


class AxisDailyScore(CamelModel):
    date: date
    neural: float
    metabolic: float
    mechanical: float
    recruitment: float
    sleep_event_applied: bool
    rest_day: bool


class AxisSeriesResponse(CamelModel):
    as_of: AwareDatetime
    timezone: str
    lookback_days: int
    policy_version: str
    session_spikes: list[AxisSessionSpike]
    daily_series: list[AxisDailyScore]
