from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass
from datetime import date

from sportolo.api.schemas.goal_priority import (
    ActiveGoalSwitchRequest,
    FocusAllocation,
    GoalConflict,
    GoalConflictMetadata,
    GoalPlanRecalculation,
    GoalPlanUpsertRequest,
    GoalPriorityPlanResponse,
    GoalTarget,
    RankedGoal,
    RecalculationTrigger,
)


@dataclass(frozen=True)
class StoredGoalPlan:
    planning_date: date
    goals: tuple[GoalTarget, ...]
    active_goal_id: str


class GoalPriorityService:
    _CONFLICT_WINDOW_DAYS = 21

    def __init__(self) -> None:
        self._plans_by_athlete: dict[str, StoredGoalPlan] = {}

    def upsert_goal_plan(
        self,
        athlete_id: str,
        request: GoalPlanUpsertRequest,
    ) -> GoalPriorityPlanResponse:
        goals = self._normalize_goals(request.goals)
        active_goal_id = self._resolve_active_goal_id(goals, request.active_goal_id)

        response = self._build_response(
            athlete_id=athlete_id,
            planning_date=request.planning_date,
            goals=goals,
            active_goal_id=active_goal_id,
            trigger="goal_priority_set",
        )
        self._plans_by_athlete[athlete_id] = StoredGoalPlan(
            planning_date=request.planning_date,
            goals=goals,
            active_goal_id=active_goal_id,
        )
        return response

    def switch_active_goal(
        self,
        athlete_id: str,
        request: ActiveGoalSwitchRequest,
    ) -> GoalPriorityPlanResponse:
        existing_plan = self._plans_by_athlete.get(athlete_id)
        if existing_plan is None:
            raise ValueError("goal plan does not exist for athlete")

        goals = self._normalize_goals(existing_plan.goals)
        active_goal_id = self._resolve_active_goal_id(goals, request.active_goal_id)
        response = self._build_response(
            athlete_id=athlete_id,
            planning_date=request.planning_date,
            goals=goals,
            active_goal_id=active_goal_id,
            trigger="active_goal_switch",
        )
        self._plans_by_athlete[athlete_id] = StoredGoalPlan(
            planning_date=request.planning_date,
            goals=goals,
            active_goal_id=active_goal_id,
        )
        return response

    def _normalize_goals(
        self, goals: list[GoalTarget] | tuple[GoalTarget, ...]
    ) -> tuple[GoalTarget, ...]:
        if not goals:
            raise ValueError("at least one goal is required")

        sorted_goals = tuple(sorted(goals, key=lambda goal: (goal.priority_rank, goal.goal_id)))
        goal_ids = [goal.goal_id for goal in sorted_goals]
        priority_ranks = [goal.priority_rank for goal in sorted_goals]

        if len(set(goal_ids)) != len(goal_ids):
            raise ValueError("goal identifiers must be unique")

        if len(set(priority_ranks)) != len(priority_ranks):
            raise ValueError("priority ranks must be unique")

        expected_ranks = list(range(1, len(sorted_goals) + 1))
        if sorted(priority_ranks) != expected_ranks:
            raise ValueError("priority ranks must be contiguous and start at 1")

        return tuple(goal.model_copy(deep=True) for goal in sorted_goals)

    @staticmethod
    def _resolve_active_goal_id(goals: tuple[GoalTarget, ...], active_goal_id: str | None) -> str:
        resolved_active_goal_id = active_goal_id if active_goal_id is not None else goals[0].goal_id
        goal_id_set = {goal.goal_id for goal in goals}
        if resolved_active_goal_id not in goal_id_set:
            raise ValueError("active goal must reference an existing goal identifier")
        return resolved_active_goal_id

    def _build_response(
        self,
        athlete_id: str,
        planning_date: date,
        goals: tuple[GoalTarget, ...],
        active_goal_id: str,
        trigger: RecalculationTrigger,
    ) -> GoalPriorityPlanResponse:
        conflicts = self._detect_conflicts(goals, active_goal_id)
        recalculation = self._build_recalculation(
            athlete_id=athlete_id,
            planning_date=planning_date,
            goals=goals,
            active_goal_id=active_goal_id,
            trigger=trigger,
        )
        ranked_goals = [
            RankedGoal(
                goal_id=goal.goal_id,
                title=goal.title,
                modality=goal.modality,
                outcome_metric=goal.outcome_metric,
                outcome_target=goal.outcome_target,
                competition_event=goal.competition_event,
                priority_rank=goal.priority_rank,
                is_active=goal.goal_id == active_goal_id,
            )
            for goal in goals
        ]
        return GoalPriorityPlanResponse(
            athlete_id=athlete_id,
            planning_date=planning_date,
            active_goal_id=active_goal_id,
            goals=ranked_goals,
            conflicts=conflicts,
            recalculation=recalculation,
        )

    def _detect_conflicts(
        self,
        goals: tuple[GoalTarget, ...],
        active_goal_id: str,
    ) -> list[GoalConflict]:
        conflicts: list[GoalConflict] = []
        for left_index, left_goal in enumerate(goals):
            for right_goal in goals[left_index + 1 :]:
                days_apart = abs(
                    (
                        left_goal.competition_event.event_date
                        - right_goal.competition_event.event_date
                    ).days
                )
                lowest_rank = min(left_goal.priority_rank, right_goal.priority_rank)
                conflict_type: str | None = None
                severity: str | None = None
                rationale: str | None = None
                window_days = 0

                if days_apart == 0:
                    conflict_type = "event_date_collision"
                    severity = "high"
                    rationale = (
                        f"Goals {left_goal.goal_id} and {right_goal.goal_id} "
                        "target the same event day "
                        f"{left_goal.competition_event.event_date.isoformat()}."
                    )
                elif (
                    left_goal.modality != right_goal.modality
                    and days_apart <= self._CONFLICT_WINDOW_DAYS
                    and lowest_rank <= 2
                ):
                    conflict_type = "cross_modality_overlap"
                    severity = "high" if days_apart <= 7 else "medium"
                    window_days = self._CONFLICT_WINDOW_DAYS
                    rationale = (
                        f"{left_goal.modality} and {right_goal.modality} goals are scheduled "
                        f"{days_apart} days apart within the shared adaptation window."
                    )

                if conflict_type is None or severity is None or rationale is None:
                    continue

                conflict_id = self._build_conflict_id(
                    left_goal_id=left_goal.goal_id,
                    right_goal_id=right_goal.goal_id,
                    conflict_type=conflict_type,
                    left_event_date=left_goal.competition_event.event_date,
                    right_event_date=right_goal.competition_event.event_date,
                    days_apart=days_apart,
                )
                conflicts.append(
                    GoalConflict(
                        conflict_id=conflict_id,
                        conflict_type=conflict_type,
                        severity=severity,
                        rationale=rationale,
                        metadata=GoalConflictMetadata(
                            left_goal_id=left_goal.goal_id,
                            right_goal_id=right_goal.goal_id,
                            left_event_id=left_goal.competition_event.event_id,
                            right_event_id=right_goal.competition_event.event_id,
                            days_apart=days_apart,
                            window_days=window_days,
                            active_goal_involved=active_goal_id
                            in {left_goal.goal_id, right_goal.goal_id},
                            compared_event_dates=[
                                left_goal.competition_event.event_date,
                                right_goal.competition_event.event_date,
                            ],
                        ),
                    )
                )

        return sorted(conflicts, key=lambda conflict: conflict.conflict_id)

    @staticmethod
    def _build_conflict_id(
        left_goal_id: str,
        right_goal_id: str,
        conflict_type: str,
        left_event_date: date,
        right_event_date: date,
        days_apart: int,
    ) -> str:
        payload = (
            f"{left_goal_id}|{right_goal_id}|{conflict_type}|"
            f"{left_event_date.isoformat()}|{right_event_date.isoformat()}|{days_apart}"
        )
        digest = hashlib.sha256(payload.encode("utf-8")).hexdigest()[:12]
        return f"goal-conflict-{digest}"

    def _build_recalculation(
        self,
        athlete_id: str,
        planning_date: date,
        goals: tuple[GoalTarget, ...],
        active_goal_id: str,
        trigger: RecalculationTrigger,
    ) -> GoalPlanRecalculation:
        priority_order = [goal.goal_id for goal in goals]
        focus_allocation = self._compute_focus_allocation(goals, active_goal_id)
        signature_payload = {
            "athleteId": athlete_id,
            "planningDate": planning_date.isoformat(),
            "activeGoalId": active_goal_id,
            "goals": [
                {
                    "goalId": goal.goal_id,
                    "modality": goal.modality,
                    "priorityRank": goal.priority_rank,
                    "eventDate": goal.competition_event.event_date.isoformat(),
                    "outcomeMetric": goal.outcome_metric,
                    "outcomeTarget": goal.outcome_target,
                }
                for goal in goals
            ],
        }
        signature_source = json.dumps(signature_payload, separators=(",", ":"), sort_keys=True)
        signature = hashlib.sha256(signature_source.encode("utf-8")).hexdigest()
        return GoalPlanRecalculation(
            recalculation_id=f"recalc-{signature[:12]}",
            trigger=trigger,
            active_goal_id=active_goal_id,
            priority_order=priority_order,
            focus_allocation=focus_allocation,
            deterministic_signature=signature,
        )

    @staticmethod
    def _compute_focus_allocation(
        goals: tuple[GoalTarget, ...],
        active_goal_id: str,
    ) -> FocusAllocation:
        modality_weights: dict[str, float] = {"strength": 0.0, "endurance": 0.0, "hybrid": 0.0}
        goal_count = len(goals)
        for goal in goals:
            rank_weight = goal_count - goal.priority_rank + 1
            if goal.goal_id == active_goal_id:
                rank_weight += goal_count
            modality_weights[goal.modality] += float(rank_weight)

        total_weight = sum(modality_weights.values())
        if total_weight <= 0:
            return FocusAllocation(strength=0.0, endurance=0.0, hybrid=0.0)

        return FocusAllocation(
            strength=round(modality_weights["strength"] / total_weight, 4),
            endurance=round(modality_weights["endurance"] / total_weight, 4),
            hybrid=round(modality_weights["hybrid"] / total_weight, 4),
        )
