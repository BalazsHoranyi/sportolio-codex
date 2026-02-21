from __future__ import annotations

from copy import deepcopy

from fastapi.testclient import TestClient

from sportolo.main import app

GOALS_ENDPOINT = "/v1/athletes/athlete-1/goals"
SWITCH_ENDPOINT = "/v1/athletes/athlete-1/goals/active"


def _request_payload() -> dict[str, object]:
    return {
        "planningDate": "2026-03-01",
        "activeGoalId": "goal-strength",
        "goals": [
            {
                "goalId": "goal-strength",
                "title": "Deadlift 600 lb",
                "modality": "strength",
                "outcomeMetric": "deadlift_1rm",
                "outcomeTarget": "600 lb",
                "competitionEvent": {
                    "eventId": "event-strength-open",
                    "name": "Strength Open",
                    "eventDate": "2026-07-12",
                },
                "priorityRank": 1,
            },
            {
                "goalId": "goal-marathon",
                "title": "Marathon PR",
                "modality": "endurance",
                "outcomeMetric": "marathon_time",
                "outcomeTarget": "2:55:00",
                "competitionEvent": {
                    "eventId": "event-city-marathon",
                    "name": "City Marathon",
                    "eventDate": "2026-07-12",
                },
                "priorityRank": 2,
            },
            {
                "goalId": "goal-5k",
                "title": "5K speed block",
                "modality": "endurance",
                "outcomeMetric": "5k_time",
                "outcomeTarget": "00:18:30",
                "competitionEvent": {
                    "eventId": "event-track-5k",
                    "name": "Track 5K",
                    "eventDate": "2026-07-20",
                },
                "priorityRank": 3,
            },
        ],
    }


def test_upsert_goals_contract_supports_outcome_targets_and_dated_events() -> None:
    client = TestClient(app)

    response = client.put(GOALS_ENDPOINT, json=_request_payload())

    assert response.status_code == 200
    body = response.json()
    assert set(body) == {
        "athleteId",
        "planningDate",
        "activeGoalId",
        "goals",
        "conflicts",
        "recalculation",
    }
    assert body["athleteId"] == "athlete-1"
    assert body["activeGoalId"] == "goal-strength"
    assert body["goals"][0]["competitionEvent"]["eventDate"] == "2026-07-12"
    assert body["goals"][0]["outcomeTarget"] == "600 lb"
    assert body["conflicts"]
    assert {
        "conflictId",
        "conflictType",
        "severity",
        "rationale",
        "metadata",
    } <= set(body["conflicts"][0])
    assert {
        "leftGoalId",
        "rightGoalId",
        "leftEventId",
        "rightEventId",
        "daysApart",
        "windowDays",
        "activeGoalInvolved",
        "comparedEventDates",
    } <= set(body["conflicts"][0]["metadata"])


def test_switch_active_goal_contract_is_deterministic_for_identical_payloads() -> None:
    client = TestClient(app)

    set_response = client.put(GOALS_ENDPOINT, json=_request_payload())
    switch_payload = {"activeGoalId": "goal-marathon", "planningDate": "2026-03-10"}
    first = client.post(SWITCH_ENDPOINT, json=switch_payload)
    second = client.post(SWITCH_ENDPOINT, json=deepcopy(switch_payload))

    assert set_response.status_code == 200
    assert first.status_code == 200
    assert second.status_code == 200
    assert first.json() == second.json()
    assert first.json()["activeGoalId"] == "goal-marathon"
    assert first.json()["recalculation"]["trigger"] == "active_goal_switch"


def test_upsert_goals_contract_rejects_duplicate_priority_rank() -> None:
    client = TestClient(app)
    payload = _request_payload()
    payload["goals"][1]["priorityRank"] = 1  # type: ignore[index]

    response = client.put(GOALS_ENDPOINT, json=payload)

    assert response.status_code == 422
    assert response.json()["code"] == "DSL_VALIDATION_ERROR"
    assert "priority rank" in response.json()["message"].lower()


def test_goal_priority_openapi_metadata_matches_contract() -> None:
    openapi = app.openapi()
    upsert_operation = openapi["paths"]["/v1/athletes/{athleteId}/goals"]["put"]
    switch_operation = openapi["paths"]["/v1/athletes/{athleteId}/goals/active"]["post"]

    assert upsert_operation["operationId"] == "upsertAthleteGoals"
    assert switch_operation["operationId"] == "switchActiveGoalPriority"
    assert upsert_operation["tags"] == ["Planning"]
    assert switch_operation["tags"] == ["Planning"]
    assert upsert_operation["responses"]["422"]["content"]["application/json"]["schema"] == {
        "$ref": "#/components/schemas/ValidationError"
    }
    assert switch_operation["responses"]["422"]["content"]["application/json"]["schema"] == {
        "$ref": "#/components/schemas/ValidationError"
    }
