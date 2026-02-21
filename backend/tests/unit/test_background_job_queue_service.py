from __future__ import annotations

import pytest

from sportolo.services.background_job_queue_service import (
    BackgroundJobEnqueueRequest,
    BackgroundJobExecutionError,
    BackgroundJobPipeline,
    InMemoryBackgroundJobQueue,
)


def _enqueue_request(
    *,
    pipeline: BackgroundJobPipeline = "workout_sync",
    idempotency_key: str,
    payload_suffix: str,
    max_attempts: int = 3,
) -> BackgroundJobEnqueueRequest:
    return BackgroundJobEnqueueRequest(
        athlete_id="athlete-1",
        pipeline=pipeline,
        idempotency_key=idempotency_key,
        correlation_id=f"corr-{idempotency_key}",
        payload={
            "externalActivityId": f"activity-{payload_suffix}",
            "sequenceNumber": 1,
        },
        max_attempts=max_attempts,
        retry_delay_seconds=0,
    )


def test_enqueue_is_idempotent_and_rejects_payload_drift() -> None:
    queue = InMemoryBackgroundJobQueue()
    first = queue.enqueue(_enqueue_request(idempotency_key="idem-1", payload_suffix="a"))
    replay = queue.enqueue(_enqueue_request(idempotency_key="idem-1", payload_suffix="a"))

    assert first.job_id == replay.job_id
    assert queue.metrics_snapshot().queue_depth == 1

    with pytest.raises(ValueError, match="idempotency"):
        queue.enqueue(_enqueue_request(idempotency_key="idem-1", payload_suffix="b"))


def test_retryable_failure_is_requeued_and_then_succeeds() -> None:
    queue = InMemoryBackgroundJobQueue()
    attempts = 0

    def flaky_handler(_: object) -> None:
        nonlocal attempts
        attempts += 1
        if attempts == 1:
            raise BackgroundJobExecutionError(
                code="SYNC_TIMEOUT",
                message="provider timeout",
                retryable=True,
            )

    queue.register_handler("workout_sync", flaky_handler)
    queued = queue.enqueue(_enqueue_request(idempotency_key="idem-retry", payload_suffix="retry"))

    first_attempt = queue.process_next()
    second_attempt = queue.process_next()
    completed = queue.get_job(queued.job_id)
    metrics = queue.metrics_snapshot()

    assert first_attempt is not None
    assert second_attempt is not None
    assert completed is not None
    assert completed.status == "succeeded"
    assert completed.attempt_count == 2
    assert metrics.queue_depth == 0
    assert metrics.retry_count == 1
    assert metrics.succeeded_count == 1
    assert metrics.failed_attempt_count == 1
    assert metrics.failure_rate == pytest.approx(0.5)
    assert metrics.average_processing_latency_ms >= 0


def test_terminal_failure_moves_job_to_dead_letter_with_actionable_metadata() -> None:
    queue = InMemoryBackgroundJobQueue()

    def fatal_handler(_: object) -> None:
        raise BackgroundJobExecutionError(
            code="FATIGUE_RECOMPUTE_INVALID_STATE",
            message="missing prior snapshot lineage",
            retryable=False,
        )

    queue.register_handler("fatigue_recompute", fatal_handler)
    queued = queue.enqueue(
        _enqueue_request(
            pipeline="fatigue_recompute",
            idempotency_key="idem-dead",
            payload_suffix="dead",
            max_attempts=4,
        )
    )

    outcome = queue.process_next()
    failed = queue.get_job(queued.job_id)
    dead_letters = queue.list_dead_letters()

    assert outcome is not None
    assert failed is not None
    assert failed.status == "dead_letter"
    assert failed.attempt_count == 1
    assert failed.last_error_code == "FATIGUE_RECOMPUTE_INVALID_STATE"
    assert "lineage" in (failed.last_error_message or "")
    assert len(dead_letters) == 1
    assert dead_letters[0].job_id == queued.job_id
