from __future__ import annotations

from datetime import UTC, datetime
from typing import Annotated

from fastapi import APIRouter, Depends

from sportolo.api.dependencies import get_background_job_queue
from sportolo.api.schemas.common import ApiEnvelope, ApiMeta, CamelModel
from sportolo.config import Settings, get_settings
from sportolo.services.background_job_queue_service import (
    BackgroundJobMetrics,
    BackgroundJobRecord,
    InMemoryBackgroundJobQueue,
)

router = APIRouter(tags=["System"])


class SmokePayload(CamelModel):
    name: str
    version: str
    environment: str
    feature_flags: dict[str, bool]


class BackgroundJobMetricsPayload(CamelModel):
    queue_depth: int
    total_enqueued_count: int
    processed_attempt_count: int
    succeeded_count: int
    failed_attempt_count: int
    retry_count: int
    dead_letter_count: int
    failure_rate: float
    average_processing_latency_ms: float


class BackgroundJobDeadLetterPayload(CamelModel):
    job_id: str
    athlete_id: str
    pipeline: str
    idempotency_key: str
    correlation_id: str
    attempt_count: int
    max_attempts: int
    last_error_code: str | None
    last_error_message: str | None
    last_failed_at: datetime | None


class BackgroundJobDeadLetterListPayload(CamelModel):
    jobs: list[BackgroundJobDeadLetterPayload]


@router.get(
    "/v1/system/smoke",
    response_model=ApiEnvelope[SmokePayload],
    operation_id="systemSmoke",
)
async def smoke(
    settings: Annotated[Settings, Depends(get_settings)],
) -> ApiEnvelope[SmokePayload]:
    return ApiEnvelope(
        data=SmokePayload(
            name=settings.app_name,
            version=settings.app_version,
            environment=settings.environment,
            feature_flags={
                "wahooIntegration": settings.feature_flags.wahoo_integration,
            },
        ),
        meta=ApiMeta(status="ok", timestamp=datetime.now(UTC)),
    )


@router.get(
    "/v1/system/background-jobs/metrics",
    response_model=ApiEnvelope[BackgroundJobMetricsPayload],
    operation_id="systemBackgroundJobMetrics",
)
async def background_job_metrics(
    queue: Annotated[InMemoryBackgroundJobQueue, Depends(get_background_job_queue)],
) -> ApiEnvelope[BackgroundJobMetricsPayload]:
    metrics = queue.metrics_snapshot()
    return ApiEnvelope(
        data=_to_metrics_payload(metrics),
        meta=ApiMeta(status="ok", timestamp=datetime.now(UTC)),
    )


@router.get(
    "/v1/system/background-jobs/dead-letters",
    response_model=ApiEnvelope[BackgroundJobDeadLetterListPayload],
    operation_id="systemBackgroundJobDeadLetters",
)
async def background_job_dead_letters(
    queue: Annotated[InMemoryBackgroundJobQueue, Depends(get_background_job_queue)],
) -> ApiEnvelope[BackgroundJobDeadLetterListPayload]:
    dead_letters = queue.list_dead_letters()
    return ApiEnvelope(
        data=BackgroundJobDeadLetterListPayload(
            jobs=[_to_dead_letter_payload(record) for record in dead_letters]
        ),
        meta=ApiMeta(status="ok", timestamp=datetime.now(UTC)),
    )


def _to_metrics_payload(metrics: BackgroundJobMetrics) -> BackgroundJobMetricsPayload:
    return BackgroundJobMetricsPayload(
        queue_depth=metrics.queue_depth,
        total_enqueued_count=metrics.total_enqueued_count,
        processed_attempt_count=metrics.processed_attempt_count,
        succeeded_count=metrics.succeeded_count,
        failed_attempt_count=metrics.failed_attempt_count,
        retry_count=metrics.retry_count,
        dead_letter_count=metrics.dead_letter_count,
        failure_rate=metrics.failure_rate,
        average_processing_latency_ms=metrics.average_processing_latency_ms,
    )


def _to_dead_letter_payload(record: BackgroundJobRecord) -> BackgroundJobDeadLetterPayload:
    return BackgroundJobDeadLetterPayload(
        job_id=record.job_id,
        athlete_id=record.athlete_id,
        pipeline=record.pipeline,
        idempotency_key=record.idempotency_key,
        correlation_id=record.correlation_id,
        attempt_count=record.attempt_count,
        max_attempts=record.max_attempts,
        last_error_code=record.last_error_code,
        last_error_message=record.last_error_message,
        last_failed_at=record.last_failed_at,
    )
