from fastapi.testclient import TestClient

from sportolo.main import app


def _request_payload() -> dict[str, object]:
    return {
        "microcycleId": "micro-1",
        "microcycleName": "Base Week 1",
        "routines": [
            {
                "routineId": "routine-1",
                "routineName": "Lower + Push",
                "exercises": [
                    {"exerciseId": "ex-1", "exerciseName": "Back Squat", "workload": 120},
                    {"exerciseId": "ex-2", "exerciseName": "Bench Press", "workload": 80},
                ],
            }
        ],
    }


def test_aggregate_muscle_usage_response_shape_and_values() -> None:
    client = TestClient(app)

    response = client.post("/v1/athletes/athlete-1/muscle-usage/aggregate", json=_request_payload())

    assert response.status_code == 200
    body = response.json()
    assert body["microcycleSummary"]["microcycleId"] == "micro-1"
    assert body["microcycleSummary"]["totalUsage"] == 200.0
    assert body["microcycleSummary"]["muscleUsage"] == {
        "chest": 40.0,
        "front_delts": 16.0,
        "glutes": 42.0,
        "quads": 60.0,
        "spinal_erectors": 18.0,
        "triceps": 24.0,
    }


def test_aggregate_muscle_usage_is_deterministic_for_identical_payloads() -> None:
    client = TestClient(app)

    first = client.post("/v1/athletes/athlete-1/muscle-usage/aggregate", json=_request_payload())
    second = client.post("/v1/athletes/athlete-1/muscle-usage/aggregate", json=_request_payload())

    assert first.status_code == 200
    assert second.status_code == 200
    assert first.json() == second.json()


def test_aggregate_muscle_usage_rejects_non_positive_workload() -> None:
    client = TestClient(app)
    payload = _request_payload()
    payload["routines"][0]["exercises"][0]["workload"] = 0  # type: ignore[index]

    response = client.post("/v1/athletes/athlete-1/muscle-usage/aggregate", json=payload)

    assert response.status_code == 422
    assert response.json() == {
        "code": "DSL_VALIDATION_ERROR",
        "message": "Input should be greater than 0",
        "phase": "validate",
    }


def test_aggregate_muscle_usage_openapi_metadata_matches_contract() -> None:
    operation = app.openapi()["paths"]["/v1/athletes/{athleteId}/muscle-usage/aggregate"]["post"]

    assert operation["operationId"] == "aggregateMuscleUsage"
    assert operation["tags"] == ["Analytics"]
    assert operation["parameters"] == [
        {
            "in": "path",
            "name": "athleteId",
            "required": True,
            "schema": {"title": "Athleteid", "type": "string"},
        }
    ]
    assert operation["responses"]["422"]["content"]["application/json"]["schema"] == {
        "$ref": "#/components/schemas/ValidationError"
    }


def test_validation_error_openapi_schema_matches_contract_component_name_and_phase_type() -> None:
    schemas = app.openapi()["components"]["schemas"]

    assert "ValidationError" in schemas
    assert "ValidationErrorResponse" not in schemas
    assert schemas["ValidationError"]["properties"]["phase"]["type"] == "string"
