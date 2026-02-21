from __future__ import annotations

from datetime import date
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

GoalModality = Literal["strength", "endurance", "hybrid"]
GoalConflictType = Literal["event_date_collision", "cross_modality_overlap"]
GoalConflictSeverity = Literal["high", "medium", "low"]
RecalculationTrigger = Literal["goal_priority_set", "active_goal_switch"]


def _to_camel(value: str) -> str:
    parts = value.split("_")
    return parts[0] + "".join(part.capitalize() for part in parts[1:])


class CamelModel(BaseModel):
    model_config = ConfigDict(populate_by_name=True, alias_generator=_to_camel)


class GoalCompetitionEvent(CamelModel):
    event_id: str
    name: str
    event_date: date


class GoalTarget(CamelModel):
    goal_id: str
    title: str
    modality: GoalModality
    outcome_metric: str
    outcome_target: str
    competition_event: GoalCompetitionEvent
    priority_rank: int = Field(ge=1)


class GoalPlanUpsertRequest(CamelModel):
    planning_date: date
    goals: list[GoalTarget] = Field(min_length=1)
    active_goal_id: str | None = None


class ActiveGoalSwitchRequest(CamelModel):
    active_goal_id: str
    planning_date: date


class RankedGoal(CamelModel):
    goal_id: str
    title: str
    modality: GoalModality
    outcome_metric: str
    outcome_target: str
    competition_event: GoalCompetitionEvent
    priority_rank: int = Field(ge=1)
    is_active: bool


class GoalConflictMetadata(CamelModel):
    left_goal_id: str
    right_goal_id: str
    left_event_id: str
    right_event_id: str
    days_apart: int = Field(ge=0)
    window_days: int = Field(ge=0)
    active_goal_involved: bool
    compared_event_dates: list[date] = Field(min_length=2, max_length=2)


class GoalConflict(CamelModel):
    conflict_id: str
    conflict_type: GoalConflictType
    severity: GoalConflictSeverity
    rationale: str
    metadata: GoalConflictMetadata


class FocusAllocation(CamelModel):
    strength: float = Field(ge=0, le=1)
    endurance: float = Field(ge=0, le=1)
    hybrid: float = Field(ge=0, le=1)


class GoalPlanRecalculation(CamelModel):
    recalculation_id: str
    trigger: RecalculationTrigger
    active_goal_id: str
    priority_order: list[str]
    focus_allocation: FocusAllocation
    deterministic_signature: str


class GoalPriorityPlanResponse(CamelModel):
    athlete_id: str
    planning_date: date
    active_goal_id: str
    goals: list[RankedGoal]
    conflicts: list[GoalConflict]
    recalculation: GoalPlanRecalculation
