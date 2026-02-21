from __future__ import annotations

from copy import deepcopy

from fastapi.testclient import TestClient

from sportolo.main import app

ENDPOINT = "/v1/athletes/athlete-1/axis-effects/map"


def _request_payload() -> dict[str, object]:
    return {
        "activities": [
            {
                "activityId": "act-strength-1",
                "activityType": "strength",
                "exerciseName": "Back Squat",
                "workload": 100,
            },
            {
                "activityId": "act-endurance-1",
                "activityType": "run",
                "durationMinutes": 40,
                "hrZone": 4,
                "powerZone": 5,
                "paceZone": 2,
            },
        ]
    }


def test_axis_effect_mapping_response_shape_and_core_values() -> None:
    client = TestClient(app)

    response = client.post(ENDPOINT, json=_request_payload())

    assert response.status_code == 200
    body = response.json()
    assert set(body) == {
        "athleteId",
        "activities",
        "aggregateGlobalEffects",
        "aggregateRegionalEffects",
    }
    assert body["athleteId"] == "athlete-1"
    assert len(body["activities"]) == 2
    assert body["activities"][0]["inferenceSource"] == "strength_lookup"
    assert body["activities"][1]["inferenceSource"] == "hr"
    assert body["activities"][1]["inferredZone"] == 4
    assert body["aggregateGlobalEffects"]["mechanical"] > 0
    assert "lower_body" in body["aggregateRegionalEffects"]


def test_axis_effect_mapping_is_deterministic_for_identical_payloads() -> None:
    client = TestClient(app)
    payload = _request_payload()

    first = client.post(ENDPOINT, json=payload)
    second = client.post(ENDPOINT, json=deepcopy(payload))

    assert first.status_code == 200
    assert second.status_code == 200
    assert first.json() == second.json()


def test_axis_effect_mapping_rejects_non_positive_duration() -> None:
    client = TestClient(app)
    payload = _request_payload()
    payload["activities"][1]["durationMinutes"] = 0  # type: ignore[index]

    response = client.post(ENDPOINT, json=payload)

    assert response.status_code == 422
    assert response.json() == {
        "code": "DSL_VALIDATION_ERROR",
        "message": "Input should be greater than 0",
        "phase": "validate",
    }


def test_axis_effect_mapping_openapi_metadata_matches_contract() -> None:
    operation = app.openapi()["paths"]["/v1/athletes/{athleteId}/axis-effects/map"]["post"]

    assert operation["operationId"] == "mapExerciseZoneAxisEffects"
    assert operation["tags"] == ["Scoring"]
    assert operation["responses"]["422"]["content"]["application/json"]["schema"] == {
        "$ref": "#/components/schemas/ValidationError"
    }
