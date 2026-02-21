from __future__ import annotations

from datetime import datetime
from typing import Generic, Literal, TypeVar

from pydantic import BaseModel, ConfigDict

T = TypeVar("T")


def to_camel(value: str) -> str:
    parts = value.split("_")
    return parts[0] + "".join(part.capitalize() for part in parts[1:])


class CamelModel(BaseModel):
    model_config = ConfigDict(populate_by_name=True, alias_generator=to_camel)


class ApiMeta(CamelModel):
    status: Literal["ok"]
    timestamp: datetime


class ApiEnvelope(CamelModel, Generic[T]):
    data: T
    meta: ApiMeta


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
