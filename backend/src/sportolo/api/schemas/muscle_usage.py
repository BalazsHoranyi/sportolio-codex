from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


def _to_camel(value: str) -> str:
    parts = value.split("_")
    return parts[0] + "".join(part.capitalize() for part in parts[1:])


class CamelModel(BaseModel):
    model_config = ConfigDict(populate_by_name=True, alias_generator=_to_camel)


class ExerciseUsageInput(CamelModel):
    exercise_id: str
    exercise_name: str
    workload: float = Field(gt=0)


class RoutineUsageInput(CamelModel):
    routine_id: str
    routine_name: str | None = None
    exercises: list[ExerciseUsageInput] = Field(min_length=1)


class MicrocycleUsageRequest(CamelModel):
    microcycle_id: str
    microcycle_name: str | None = None
    routines: list[RoutineUsageInput] = Field(min_length=1)


class ExerciseUsageSummary(CamelModel):
    routine_id: str
    exercise_id: str
    exercise_name: str
    workload: float
    total_usage: float
    muscle_usage: dict[str, float]


class RoutineUsageSummary(CamelModel):
    routine_id: str
    routine_name: str | None = None
    total_usage: float
    muscle_usage: dict[str, float]


class MicrocycleUsageSummary(CamelModel):
    microcycle_id: str
    microcycle_name: str | None = None
    routine_count: int
    total_usage: float
    muscle_usage: dict[str, float]


class MicrocycleUsageResponse(CamelModel):
    exercise_summaries: list[ExerciseUsageSummary]
    routine_summaries: list[RoutineUsageSummary]
    microcycle_summary: MicrocycleUsageSummary


class ValidationError(BaseModel):
    code: Literal[
        "DSL_SOURCE_TOO_LARGE",
        "DSL_NESTING_DEPTH_EXCEEDED",
        "IR_NODE_LIMIT_EXCEEDED",
        "LOOP_ITERATION_LIMIT_EXCEEDED",
        "DSL_COMPILE_TIMEOUT",
        "DSL_VALIDATION_ERROR",
        "FATIGUE_MODEL_READ_ONLY",
        "RANDOMNESS_NOT_ALLOWED",
        "COMPLETED_SESSION_INVARIANT_VIOLATION",
        "ORPHAN_PLANNED_WORKOUT",
    ]
    message: str
    phase: Literal["parse", "validate", "compile", "guardrail"] = "validate"
    line: int | None = None
    column: int | None = None
