from __future__ import annotations

from fastapi.testclient import TestClient
from pytest import MonkeyPatch

from sportolo.api.schemas.muscle_usage import (
    ExerciseUsageSummary,
    MicrocycleUsageResponse,
    MicrocycleUsageSummary,
    RoutineUsageSummary,
)
from sportolo.main import app


def test_system_smoke_endpoint_reports_bootstrap_metadata_envelope() -> None:
    client = TestClient(app)

    response = client.get("/v1/system/smoke")

    assert response.status_code == 200
    body = response.json()
    assert set(body) == {"data", "meta"}
    assert body["meta"]["status"] == "ok"
    assert body["data"]["name"] == "Sportolo API"
    assert isinstance(body["data"]["featureFlags"], dict)


def test_muscle_usage_dependency_is_overrideable_for_route_tests() -> None:
    from sportolo.api.dependencies import get_muscle_usage_service

    class FakeMuscleUsageService:
        def aggregate_microcycle(self, request: object) -> MicrocycleUsageResponse:
            del request
            return MicrocycleUsageResponse(
                exercise_summaries=[
                    ExerciseUsageSummary(
                        routine_id="routine-override",
                        exercise_id="exercise-override",
                        exercise_name="Override Squat",
                        workload=10.0,
                        total_usage=10.0,
                        muscle_usage={"quads": 10.0},
                    )
                ],
                routine_summaries=[
                    RoutineUsageSummary(
                        routine_id="routine-override",
                        routine_name="Override Routine",
                        total_usage=10.0,
                        muscle_usage={"quads": 10.0},
                    )
                ],
                microcycle_summary=MicrocycleUsageSummary(
                    microcycle_id="micro-override",
                    microcycle_name="Override Microcycle",
                    routine_count=1,
                    total_usage=10.0,
                    muscle_usage={"quads": 10.0},
                ),
            )

    app.dependency_overrides[get_muscle_usage_service] = lambda: FakeMuscleUsageService()
    try:
        client = TestClient(app)
        response = client.post(
            "/v1/athletes/athlete-1/muscle-usage/aggregate",
            json={
                "microcycleId": "mc-1",
                "routines": [
                    {
                        "routineId": "r-1",
                        "exercises": [
                            {
                                "exerciseId": "e-1",
                                "exerciseName": "Back Squat",
                                "workload": 1,
                            }
                        ],
                    }
                ],
            },
        )
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 200
    body = response.json()
    assert body["microcycleSummary"]["microcycleId"] == "micro-override"
    assert body["exerciseSummaries"][0]["exerciseName"] == "Override Squat"


def test_settings_are_centralized_and_environment_driven(monkeypatch: MonkeyPatch) -> None:
    from sportolo.config import clear_settings_cache, get_settings

    monkeypatch.setenv("SPORTOLO_APP_NAME", "Sportolo API Test")
    monkeypatch.setenv("SPORTOLO_ENV", "test")
    monkeypatch.setenv("SPORTOLO_FEATURE_WAHOO_ENABLED", "false")

    clear_settings_cache()
    settings = get_settings()

    assert settings.app_name == "Sportolo API Test"
    assert settings.environment == "test"
    assert settings.feature_flags.wahoo_integration is False
