from __future__ import annotations

from datetime import UTC, datetime, timedelta

import pytest

from sportolo.api.schemas.wahoo_integration import (
    PipelineDispatch,
    WahooExecutionHistorySyncRequest,
    WahooWorkoutPushRequest,
    WahooWorkoutStep,
)
from sportolo.services.wahoo_integration_service import WahooIntegrationService


class _RecordingDispatchSink:
    def __init__(self) -> None:
        self.enqueued: list[tuple[str, PipelineDispatch]] = []

    def enqueue(self, athlete_id: str, dispatch: PipelineDispatch) -> None:
        self.enqueued.append((athlete_id, dispatch.model_copy(deep=True)))


def _push_request(
    *,
    idempotency_key: str,
    planned_workout_id: str,
    trainer_id: str = "kickr-bike-001",
    start_at: datetime | None = None,
) -> WahooWorkoutPushRequest:
    return WahooWorkoutPushRequest(
        idempotency_key=idempotency_key,
        planned_workout_id=planned_workout_id,
        trainer_id=trainer_id,
        workout_name=f"Workout {planned_workout_id}",
        planned_start_at=start_at,
        steps=[
            WahooWorkoutStep(
                step_type="warmup",
                duration_seconds=600,
                target_type="power",
                target_value=180,
                target_unit="watts",
            ),
            WahooWorkoutStep(
                step_type="interval",
                duration_seconds=300,
                target_type="power",
                target_value=260,
                target_unit="watts",
            ),
            WahooWorkoutStep(
                step_type="recovery",
                duration_seconds=180,
                target_type="power",
                target_value=140,
                target_unit="watts",
            ),
        ],
    )


def test_push_workout_success_is_idempotent_for_identical_payloads() -> None:
    service = WahooIntegrationService()
    request = _push_request(idempotency_key="push-key-1", planned_workout_id="planned-1")

    first = service.push_workout("athlete-1", request)
    second = service.push_workout("athlete-1", request)

    assert first == second
    assert first.status == "accepted"
    assert first.external_workout_id is not None
    assert first.total_duration_seconds == 1080
    assert first.step_count == 3


def test_push_workout_rejects_idempotency_payload_drift() -> None:
    service = WahooIntegrationService()

    service.push_workout(
        "athlete-1",
        _push_request(idempotency_key="push-key-drift", planned_workout_id="planned-1"),
    )
    drifted = _push_request(idempotency_key="push-key-drift", planned_workout_id="planned-2")

    with pytest.raises(ValueError, match="idempotency"):
        service.push_workout("athlete-1", drifted)


def test_push_workout_failure_for_unreachable_trainer_is_non_destructive() -> None:
    service = WahooIntegrationService()
    failed_push = service.push_workout(
        "athlete-1",
        _push_request(
            idempotency_key="push-key-offline",
            planned_workout_id="planned-offline",
            trainer_id="offline-kickr",
        ),
    )

    assert failed_push.status == "failed"
    assert failed_push.external_workout_id is None
    assert failed_push.failure_reason == "trainer_unreachable"

    sync_response = service.sync_execution_history(
        "athlete-1",
        WahooExecutionHistorySyncRequest(idempotency_key="sync-after-offline"),
    )

    assert sync_response.imported_count == 0
    assert sync_response.entries == []
    assert sync_response.pipeline_dispatches == []


def test_push_workout_failure_for_unsupported_trainer_is_non_destructive() -> None:
    service = WahooIntegrationService()
    failed_push = service.push_workout(
        "athlete-1",
        _push_request(
            idempotency_key="push-key-unsupported",
            planned_workout_id="planned-unsupported",
            trainer_id="garmin-edge-540",
        ),
    )

    assert failed_push.status == "failed"
    assert failed_push.external_workout_id is None
    assert failed_push.failure_reason == "unsupported_trainer"

    sync_response = service.sync_execution_history(
        "athlete-1",
        WahooExecutionHistorySyncRequest(idempotency_key="sync-after-unsupported"),
    )

    assert sync_response.imported_count == 0
    assert sync_response.entries == []
    assert sync_response.pipeline_dispatches == []


def test_sync_execution_history_reconciles_links_and_dispatches_pipelines() -> None:
    sink = _RecordingDispatchSink()
    service = WahooIntegrationService(dispatch_sink=sink)
    start_a = datetime(2026, 2, 21, 6, 0, tzinfo=UTC)
    start_b = start_a + timedelta(days=1)

    push_a = service.push_workout(
        "athlete-1",
        _push_request(
            idempotency_key="push-key-2",
            planned_workout_id="planned-a",
            start_at=start_a,
        ),
    )
    push_b = service.push_workout(
        "athlete-1",
        _push_request(
            idempotency_key="push-key-3",
            planned_workout_id="planned-b",
            start_at=start_b,
        ),
    )

    assert push_a.external_workout_id is not None
    assert push_b.external_workout_id is not None

    first_sync = service.sync_execution_history(
        "athlete-1",
        WahooExecutionHistorySyncRequest(idempotency_key="sync-key-1"),
    )

    assert first_sync.imported_count == 2
    assert first_sync.duplicate_count == 0
    assert [entry.planned_workout_id for entry in first_sync.entries] == [
        "planned-a",
        "planned-b",
    ]
    assert [entry.sequence_number for entry in first_sync.entries] == [1, 2]
    assert all(entry.dedup_status == "new_linked" for entry in first_sync.entries)
    assert len(first_sync.pipeline_dispatches) == 4
    assert {dispatch.pipeline for dispatch in first_sync.pipeline_dispatches} == {
        "fatigue",
        "analytics",
    }
    assert [athlete for athlete, _ in sink.enqueued] == [
        "athlete-1",
        "athlete-1",
        "athlete-1",
        "athlete-1",
    ]
    assert [dispatch for _, dispatch in sink.enqueued] == first_sync.pipeline_dispatches

    replay = service.sync_execution_history(
        "athlete-1",
        WahooExecutionHistorySyncRequest(idempotency_key="sync-key-1"),
    )
    duplicate_scan = service.sync_execution_history(
        "athlete-1",
        WahooExecutionHistorySyncRequest(idempotency_key="sync-key-2"),
    )

    assert replay == first_sync
    assert duplicate_scan.imported_count == 0
    assert duplicate_scan.duplicate_count == 2
    assert all(entry.dedup_status == "duplicate_linked" for entry in duplicate_scan.entries)
    assert duplicate_scan.pipeline_dispatches == []


def test_sync_rejects_idempotency_payload_drift() -> None:
    service = WahooIntegrationService()

    service.push_workout(
        "athlete-1",
        _push_request(
            idempotency_key="push-key-4",
            planned_workout_id="planned-drift",
            start_at=datetime(2026, 2, 22, 9, 0, tzinfo=UTC),
        ),
    )
    service.sync_execution_history(
        "athlete-1",
        WahooExecutionHistorySyncRequest(
            idempotency_key="sync-drift-key",
            started_after=datetime(2026, 2, 21, 0, 0, tzinfo=UTC),
        ),
    )

    with pytest.raises(ValueError, match="idempotency"):
        service.sync_execution_history(
            "athlete-1",
            WahooExecutionHistorySyncRequest(
                idempotency_key="sync-drift-key",
                started_after=datetime(2026, 2, 23, 0, 0, tzinfo=UTC),
            ),
        )
