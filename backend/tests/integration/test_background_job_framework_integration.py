from __future__ import annotations

from datetime import UTC, datetime

from fastapi.testclient import TestClient

from sportolo.api.dependencies import get_background_job_queue
from sportolo.api.routes.wahoo_integration import service as wahoo_service
from sportolo.main import app
from sportolo.services.background_job_queue_service import BackgroundJobExecutionError

PUSH_ENDPOINT = "/v1/athletes/athlete-1/integrations/wahoo/workouts/push"
SYNC_ENDPOINT = "/v1/athletes/athlete-1/integrations/wahoo/execution-history/sync"
METRICS_ENDPOINT = "/v1/system/background-jobs/metrics"


def _push_payload(*, idempotency_key: str, planned_workout_id: str) -> dict[str, object]:
    return {
        "idempotencyKey": idempotency_key,
        "plannedWorkoutId": planned_workout_id,
        "trainerId": "kickr-bike-001",
        "workoutName": f"Workout {planned_workout_id}",
        "plannedStartAt": datetime(2026, 2, 21, 6, 0, tzinfo=UTC).isoformat(),
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
        ],
    }


def setup_function() -> None:
    queue = get_background_job_queue()
    queue.reset_for_testing()
    wahoo_service.reset_for_testing()


def test_sync_jobs_retry_and_duplicate_suppression_are_observable() -> None:
    client = TestClient(app)
    queue = get_background_job_queue()
    attempts = 0

    def workout_sync_handler(_: object) -> None:
        nonlocal attempts
        attempts += 1
        if attempts == 1:
            raise BackgroundJobExecutionError(
                code="SYNC_TIMEOUT",
                message="temporary provider timeout",
                retryable=True,
            )

    queue.register_handler("workout_sync", workout_sync_handler)
    queue.register_handler("fatigue_recompute", lambda _: None)

    push = client.post(
        PUSH_ENDPOINT,
        json=_push_payload(idempotency_key="integration-push-1", planned_workout_id="planned-a"),
    )
    first_sync = client.post(SYNC_ENDPOINT, json={"idempotencyKey": "integration-sync-1"})

    assert push.status_code == 200
    assert first_sync.status_code == 200

    first_body = first_sync.json()
    assert first_body["importedCount"] == 1
    assert {dispatch["pipeline"] for dispatch in first_body["pipelineDispatches"]} == {
        "workout_sync",
        "fatigue_recompute",
    }

    before_processing = client.get(METRICS_ENDPOINT)
    assert before_processing.status_code == 200
    assert before_processing.json()["data"]["queueDepth"] == 2

    processed = queue.process_until_idle()
    assert len(processed) == 3

    after_processing = client.get(METRICS_ENDPOINT)
    assert after_processing.status_code == 200
    metrics = after_processing.json()["data"]
    assert metrics["queueDepth"] == 0
    assert metrics["retryCount"] == 1
    assert metrics["succeededCount"] == 2
    assert metrics["failedAttemptCount"] == 1

    duplicate_sync = client.post(SYNC_ENDPOINT, json={"idempotencyKey": "integration-sync-2"})
    assert duplicate_sync.status_code == 200
    assert duplicate_sync.json()["pipelineDispatches"] == []

    final_metrics = client.get(METRICS_ENDPOINT)
    assert final_metrics.status_code == 200
    assert final_metrics.json()["data"]["totalEnqueuedCount"] == 2
