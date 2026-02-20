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
