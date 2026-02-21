from __future__ import annotations

from copy import deepcopy

from fastapi.testclient import TestClient

from sportolo.main import app

GOALS_ENDPOINT = "/v1/athletes/athlete-2/goals"
SWITCH_ENDPOINT = "/v1/athletes/athlete-2/goals/active"


def _goal_request() -> dict[str, object]:
    return {
        "planningDate": "2026-03-01",
        "activeGoalId": "goal-strength",
        "goals": [
            {
                "goalId": "goal-endurance",
                "title": "Half Marathon Build",
                "modality": "endurance",
                "outcomeMetric": "half_marathon_time",
                "outcomeTarget": "1:28:00",
                "competitionEvent": {
                    "eventId": "event-half-marathon",
                    "name": "Spring Half Marathon",
                    "eventDate": "2026-06-14",
                },
                "priorityRank": 2,
            },
            {
                "goalId": "goal-strength",
                "title": "Deadlift 600 lb",
                "modality": "strength",
                "outcomeMetric": "deadlift_1rm",
                "outcomeTarget": "600 lb",
                "competitionEvent": {
                    "eventId": "event-strength-open",
                    "name": "Strength Open",
                    "eventDate": "2026-06-07",
                },
                "priorityRank": 1,
            },
            {
                "goalId": "goal-hybrid",
                "title": "Durability block",
                "modality": "hybrid",
                "outcomeMetric": "consistency_score",
                "outcomeTarget": "5 sessions/week",
                "competitionEvent": {
                    "eventId": "event-base-phase",
                    "name": "Base Phase Checkpoint",
                    "eventDate": "2026-05-30",
                },
                "priorityRank": 3,
            },
        ],
    }


def test_priority_switch_recalculation_signature_is_reversible() -> None:
    client = TestClient(app)

    initial = client.put(GOALS_ENDPOINT, json=_goal_request())
    switched = client.post(
        SWITCH_ENDPOINT,
        json={"activeGoalId": "goal-endurance", "planningDate": "2026-03-01"},
    )
    switched_back = client.post(
        SWITCH_ENDPOINT,
        json={"activeGoalId": "goal-strength", "planningDate": "2026-03-01"},
    )

    assert initial.status_code == 200
    assert switched.status_code == 200
    assert switched_back.status_code == 200
    assert (
        initial.json()["recalculation"]["deterministicSignature"]
        != (switched.json()["recalculation"]["deterministicSignature"])
    )
    assert (
        initial.json()["recalculation"]["deterministicSignature"]
        == (switched_back.json()["recalculation"]["deterministicSignature"])
    )


def test_upsert_goal_order_is_normalized_and_deterministic() -> None:
    client = TestClient(app)
    payload = _goal_request()

    first = client.put(GOALS_ENDPOINT, json=payload)
    second = client.put(GOALS_ENDPOINT, json=deepcopy(payload))

    assert first.status_code == 200
    assert second.status_code == 200
    assert first.json() == second.json()
    assert [goal["goalId"] for goal in first.json()["goals"]] == [
        "goal-strength",
        "goal-endurance",
        "goal-hybrid",
    ]
