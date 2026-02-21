from __future__ import annotations

from datetime import UTC, datetime, timedelta

from fastapi.testclient import TestClient

from sportolo.api.routes.wahoo_integration import service
from sportolo.main import app

PUSH_ENDPOINT = "/v1/athletes/athlete-1/integrations/wahoo/workouts/push"
SYNC_ENDPOINT = "/v1/athletes/athlete-1/integrations/wahoo/execution-history/sync"


def _push_payload(
    *,
    idempotency_key: str,
    planned_workout_id: str,
    trainer_id: str = "kickr-bike-001",
    planned_start_at: str | None = None,
) -> dict[str, object]:
    return {
        "idempotencyKey": idempotency_key,
        "plannedWorkoutId": planned_workout_id,
        "trainerId": trainer_id,
        "workoutName": f"Workout {planned_workout_id}",
        "plannedStartAt": planned_start_at,
        "steps": [
            {
                "stepType": "warmup",
                "durationSeconds": 600,
                "targetType": "power",
                "targetValue": 180,
                "targetUnit": "watts",
            },
            {
                "stepType": "interval",
                "durationSeconds": 300,
                "targetType": "power",
                "targetValue": 260,
                "targetUnit": "watts",
            },
            {
                "stepType": "recovery",
                "durationSeconds": 180,
                "targetType": "power",
                "targetValue": 140,
                "targetUnit": "watts",
            },
        ],
    }


def setup_function() -> None:
    service.reset_for_testing()


def test_wahoo_push_contract_supports_success_and_failure_paths() -> None:
    client = TestClient(app)

    success = client.post(
        PUSH_ENDPOINT,
        json=_push_payload(
            idempotency_key="contract-push-1",
            planned_workout_id="planned-a",
        ),
    )
    failure = client.post(
        PUSH_ENDPOINT,
        json=_push_payload(
            idempotency_key="contract-push-2",
            planned_workout_id="planned-b",
            trainer_id="offline-kickr",
        ),
    )
    unsupported = client.post(
        PUSH_ENDPOINT,
        json=_push_payload(
            idempotency_key="contract-push-3",
            planned_workout_id="planned-c",
            trainer_id="garmin-edge-1040",
        ),
    )

    assert success.status_code == 200
    assert success.json()["status"] == "accepted"
    assert success.json()["externalWorkoutId"].startswith("wahoo-workout-")
    assert success.json()["totalDurationSeconds"] == 1080

    assert failure.status_code == 200
    assert failure.json()["status"] == "failed"
    assert failure.json()["externalWorkoutId"] is None
    assert failure.json()["failureReason"] == "trainer_unreachable"

    assert unsupported.status_code == 200
    assert unsupported.json()["status"] == "failed"
    assert unsupported.json()["externalWorkoutId"] is None
    assert unsupported.json()["failureReason"] == "unsupported_trainer"


def test_wahoo_contract_rejects_idempotency_payload_drift_with_validation_error() -> None:
    client = TestClient(app)
    first_push = client.post(
        PUSH_ENDPOINT,
        json=_push_payload(
            idempotency_key="contract-push-drift",
            planned_workout_id="planned-a",
        ),
    )
    drifted_push = client.post(
        PUSH_ENDPOINT,
        json=_push_payload(
            idempotency_key="contract-push-drift",
            planned_workout_id="planned-b",
        ),
    )
    first_sync = client.post(
        SYNC_ENDPOINT,
        json={
            "idempotencyKey": "contract-sync-drift",
            "startedAfter": "2026-02-21T00:00:00+00:00",
        },
    )
    drifted_sync = client.post(
        SYNC_ENDPOINT,
        json={
            "idempotencyKey": "contract-sync-drift",
            "startedAfter": "2026-02-22T00:00:00+00:00",
        },
    )

    assert first_push.status_code == 200
    assert drifted_push.status_code == 422
    assert drifted_push.json()["code"] == "DSL_VALIDATION_ERROR"
    assert "idempotency" in drifted_push.json()["message"]

    assert first_sync.status_code == 200
    assert drifted_sync.status_code == 422
    assert drifted_sync.json()["code"] == "DSL_VALIDATION_ERROR"
    assert "idempotency" in drifted_sync.json()["message"]


def test_wahoo_sync_contract_reconciles_history_and_is_idempotent() -> None:
    client = TestClient(app)
    first_start = datetime(2026, 2, 21, 6, 0, tzinfo=UTC)
    second_start = first_start + timedelta(days=1)

    push_a = client.post(
        PUSH_ENDPOINT,
        json=_push_payload(
            idempotency_key="contract-push-sync-a",
            planned_workout_id="planned-a",
            planned_start_at=first_start.isoformat(),
        ),
    )
    push_b = client.post(
        PUSH_ENDPOINT,
        json=_push_payload(
            idempotency_key="contract-push-sync-b",
            planned_workout_id="planned-b",
            planned_start_at=second_start.isoformat(),
        ),
    )
    first = client.post(SYNC_ENDPOINT, json={"idempotencyKey": "contract-sync-1"})
    replay = client.post(SYNC_ENDPOINT, json={"idempotencyKey": "contract-sync-1"})
    duplicate_pass = client.post(SYNC_ENDPOINT, json={"idempotencyKey": "contract-sync-2"})

    assert push_a.status_code == 200
    assert push_b.status_code == 200
    assert first.status_code == 200
    assert replay.status_code == 200
    assert duplicate_pass.status_code == 200

    first_body = first.json()
    assert first_body["importedCount"] == 2
    assert first_body["duplicateCount"] == 0
    assert [entry["plannedWorkoutId"] for entry in first_body["entries"]] == [
        "planned-a",
        "planned-b",
    ]
    assert [entry["sequenceNumber"] for entry in first_body["entries"]] == [1, 2]
    assert len(first_body["pipelineDispatches"]) == 4
    assert replay.json() == first_body

    duplicate_body = duplicate_pass.json()
    assert duplicate_body["importedCount"] == 0
    assert duplicate_body["duplicateCount"] == 2
    assert duplicate_body["pipelineDispatches"] == []


def test_wahoo_integration_openapi_metadata_matches_contract() -> None:
    openapi = app.openapi()
    push_operation = openapi["paths"]["/v1/athletes/{athleteId}/integrations/wahoo/workouts/push"][
        "post"
    ]
    sync_operation = openapi["paths"][
        "/v1/athletes/{athleteId}/integrations/wahoo/execution-history/sync"
    ]["post"]

    assert push_operation["operationId"] == "pushWahooWorkout"
    assert sync_operation["operationId"] == "syncWahooExecutionHistory"
    assert push_operation["tags"] == ["Integrations"]
    assert sync_operation["tags"] == ["Integrations"]
    assert push_operation["responses"]["422"]["content"]["application/json"]["schema"] == {
        "$ref": "#/components/schemas/ValidationError"
    }
    assert sync_operation["responses"]["422"]["content"]["application/json"]["schema"] == {
        "$ref": "#/components/schemas/ValidationError"
    }
