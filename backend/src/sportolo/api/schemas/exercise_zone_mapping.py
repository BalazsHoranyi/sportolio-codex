from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


def _to_camel(value: str) -> str:
    parts = value.split("_")
    return parts[0] + "".join(part.capitalize() for part in parts[1:])


class CamelModel(BaseModel):
    model_config = ConfigDict(populate_by_name=True, alias_generator=_to_camel)


ActivityType = Literal["strength", "run", "cycle", "row", "swim"]
InferenceSource = Literal[
    "strength_lookup",
    "hr",
    "power",
    "pace",
    "fallback_default_zone",
    "fallback_unknown_exercise",
]
ConfidenceLevel = Literal["high", "medium", "low"]


class AxisEffectActivityInput(CamelModel):
    activity_id: str
    activity_type: ActivityType
    exercise_name: str | None = None
    workload: float | None = Field(default=None, gt=0)
    duration_minutes: float | None = Field(default=None, gt=0)
    hr_zone: int | None = Field(default=None, ge=1, le=5)
    power_zone: int | None = Field(default=None, ge=1, le=5)
    pace_zone: int | None = Field(default=None, ge=1, le=5)


class AxisEffectMappingRequest(CamelModel):
    activities: list[AxisEffectActivityInput] = Field(min_length=1)


class GlobalAxisEffects(CamelModel):
    neural: float = Field(ge=0)
    metabolic: float = Field(ge=0)
    mechanical: float = Field(ge=0)
    recruitment: float = Field(ge=0)


class RegionalAxisEffects(CamelModel):
    recruitment: float = Field(ge=0)
    metabolic: float = Field(ge=0)
    mechanical: float = Field(ge=0)


class ActivityAxisEffect(CamelModel):
    activity_id: str
    activity_type: ActivityType
    exercise_name: str | None = None
    inferred_zone: int | None = Field(default=None, ge=1, le=5)
    inference_source: InferenceSource
    confidence: ConfidenceLevel
    fallback_reason: str | None = None
    global_effects: GlobalAxisEffects
    regional_effects: dict[str, RegionalAxisEffects] = Field(default_factory=dict)


class AxisEffectMappingResponse(CamelModel):
    athlete_id: str
    activities: list[ActivityAxisEffect]
    aggregate_global_effects: GlobalAxisEffects
    aggregate_regional_effects: dict[str, RegionalAxisEffects]
