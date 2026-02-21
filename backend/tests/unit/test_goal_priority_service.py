from __future__ import annotations

from datetime import date

import pytest

from sportolo.api.schemas.goal_priority import (
    ActiveGoalSwitchRequest,
    GoalCompetitionEvent,
    GoalPlanUpsertRequest,
    GoalTarget,
)
from sportolo.services.goal_priority_service import GoalPriorityService


def _goal_request(active_goal_id: str | None = "goal-strength") -> GoalPlanUpsertRequest:
    return GoalPlanUpsertRequest(
        planning_date=date(2026, 3, 1),
        active_goal_id=active_goal_id,
        goals=[
            GoalTarget(
                goal_id="goal-strength",
                title="Deadlift 600 lb",
                modality="strength",
                outcome_metric="deadlift_1rm",
                outcome_target="600 lb",
                competition_event=GoalCompetitionEvent(
                    event_id="event-strength-open",
                    name="Strength Open",
                    event_date=date(2026, 7, 12),
                ),
                priority_rank=1,
            ),
            GoalTarget(
                goal_id="goal-marathon",
                title="Marathon PR",
                modality="endurance",
                outcome_metric="marathon_time",
                outcome_target="2:55:00",
                competition_event=GoalCompetitionEvent(
                    event_id="event-city-marathon",
                    name="City Marathon",
                    event_date=date(2026, 7, 12),
                ),
                priority_rank=2,
            ),
            GoalTarget(
                goal_id="goal-5k",
                title="5k speed block",
                modality="endurance",
                outcome_metric="5k_time",
                outcome_target="00:18:30",
                competition_event=GoalCompetitionEvent(
                    event_id="event-track-5k",
                    name="Track 5K",
                    event_date=date(2026, 7, 20),
                ),
                priority_rank=3,
            ),
        ],
    )


def test_upsert_goal_plan_detects_conflicts_with_traceable_metadata() -> None:
    service = GoalPriorityService()

    response = service.upsert_goal_plan("athlete-1", _goal_request())

    assert response.active_goal_id == "goal-strength"
    assert [goal.goal_id for goal in response.goals] == [
        "goal-strength",
        "goal-marathon",
        "goal-5k",
    ]
    assert len(response.conflicts) == 2
    conflict_types = {conflict.conflict_type for conflict in response.conflicts}
    assert conflict_types == {"event_date_collision", "cross_modality_overlap"}
    for conflict in response.conflicts:
        assert conflict.conflict_id.startswith("goal-conflict-")
        assert conflict.rationale
        assert conflict.metadata.left_goal_id.startswith("goal-")
        assert conflict.metadata.right_goal_id.startswith("goal-")
        assert conflict.metadata.left_event_id.startswith("event-")
        assert conflict.metadata.right_event_id.startswith("event-")
        assert len(conflict.metadata.compared_event_dates) == 2


def test_upsert_goal_plan_is_deterministic_for_identical_payloads() -> None:
    service = GoalPriorityService()
    request = _goal_request()

    first = service.upsert_goal_plan("athlete-1", request)
    second = service.upsert_goal_plan("athlete-1", request)

    assert first == second


def test_switch_active_goal_recalculates_and_is_reversible() -> None:
    service = GoalPriorityService()
    service.upsert_goal_plan("athlete-1", _goal_request())

    switched = service.switch_active_goal(
        "athlete-1",
        ActiveGoalSwitchRequest(
            active_goal_id="goal-marathon",
            planning_date=date(2026, 3, 1),
        ),
    )
    switched_back = service.switch_active_goal(
        "athlete-1",
        ActiveGoalSwitchRequest(
            active_goal_id="goal-strength",
            planning_date=date(2026, 3, 1),
        ),
    )
    original = service.upsert_goal_plan("athlete-1", _goal_request())

    assert switched.active_goal_id == "goal-marathon"
    assert switched.recalculation.trigger == "active_goal_switch"
    assert switched.recalculation.deterministic_signature != (
        switched_back.recalculation.deterministic_signature
    )
    assert switched_back.recalculation.deterministic_signature == (
        original.recalculation.deterministic_signature
    )


def test_upsert_goal_plan_rejects_duplicate_priority_ranks() -> None:
    service = GoalPriorityService()
    request = _goal_request()
    request.goals[1].priority_rank = 1

    with pytest.raises(ValueError, match="priority rank"):
        service.upsert_goal_plan("athlete-1", request)


def test_upsert_goal_plan_rejects_missing_active_goal_reference() -> None:
    service = GoalPriorityService()

    with pytest.raises(ValueError, match="active goal"):
        service.upsert_goal_plan("athlete-1", _goal_request(active_goal_id="goal-missing"))
