from __future__ import annotations

import hashlib
import json
import logging
import time
from collections import deque
from collections.abc import Callable
from dataclasses import dataclass, field
from datetime import UTC, datetime, timedelta
from typing import Any, Literal

BackgroundJobPipeline = Literal["workout_sync", "fatigue_recompute"]
BackgroundJobStatus = Literal["queued", "processing", "succeeded", "dead_letter"]
BackgroundJobAttemptStatus = Literal["succeeded", "retry_scheduled", "dead_letter"]

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class BackgroundJobExecutionError(Exception):
    code: str
    message: str
    retryable: bool = True

    def __str__(self) -> str:
        return self.message


@dataclass(frozen=True)
class BackgroundJobEnqueueRequest:
    athlete_id: str
    pipeline: BackgroundJobPipeline
    idempotency_key: str
    correlation_id: str
    payload: dict[str, Any]
    max_attempts: int = 3
    retry_delay_seconds: int = 0


@dataclass(frozen=True)
class BackgroundJobAttemptRecord:
    attempt_number: int
    started_at: datetime
    finished_at: datetime
    latency_ms: float
    status: BackgroundJobAttemptStatus
    error_code: str | None = None
    error_message: str | None = None


@dataclass(frozen=True)
class BackgroundJobRecord:
    job_id: str
    athlete_id: str
    pipeline: BackgroundJobPipeline
    idempotency_key: str
    correlation_id: str
    payload: dict[str, Any]
    status: BackgroundJobStatus
    attempt_count: int
    max_attempts: int
    retry_delay_seconds: int
    enqueued_at: datetime
    available_at: datetime
    completed_at: datetime | None
    last_error_code: str | None
    last_error_message: str | None
    last_failed_at: datetime | None
    attempt_history: tuple[BackgroundJobAttemptRecord, ...]


@dataclass(frozen=True)
class BackgroundJobProcessOutcome:
    job_id: str
    pipeline: BackgroundJobPipeline
    status: BackgroundJobAttemptStatus
    attempt_count: int
    latency_ms: float
    error_code: str | None = None
    error_message: str | None = None


@dataclass(frozen=True)
class BackgroundJobMetrics:
    queue_depth: int
    total_enqueued_count: int
    processed_attempt_count: int
    succeeded_count: int
    failed_attempt_count: int
    retry_count: int
    dead_letter_count: int
    failure_rate: float
    average_processing_latency_ms: float


@dataclass
class _StoredBackgroundJob:
    job_id: str
    athlete_id: str
    pipeline: BackgroundJobPipeline
    idempotency_key: str
    correlation_id: str
    payload: dict[str, Any]
    payload_fingerprint: str
    status: BackgroundJobStatus
    attempt_count: int
    max_attempts: int
    retry_delay_seconds: int
    enqueued_at: datetime
    available_at: datetime
    completed_at: datetime | None
    last_error_code: str | None
    last_error_message: str | None
    last_failed_at: datetime | None
    attempt_history: list[BackgroundJobAttemptRecord] = field(default_factory=list)


class InMemoryBackgroundJobQueue:
    def __init__(self) -> None:
        self._reset_state()

    def _reset_state(self) -> None:
        self._jobs: dict[str, _StoredBackgroundJob] = {}
        self._jobs_by_idempotency: dict[tuple[str, str], str] = {}
        self._queued_job_ids: deque[str] = deque()
        self._handlers: dict[BackgroundJobPipeline, Callable[[BackgroundJobRecord], None]] = {
            "workout_sync": lambda _: None,
            "fatigue_recompute": lambda _: None,
        }

        self._job_counter = 0

        self._total_enqueued_count = 0
        self._processed_attempt_count = 0
        self._succeeded_count = 0
        self._failed_attempt_count = 0
        self._retry_count = 0
        self._dead_letter_count = 0
        self._total_processing_latency_ms = 0.0

    def reset_for_testing(self) -> None:
        self._reset_state()

    def register_handler(
        self,
        pipeline: BackgroundJobPipeline,
        handler: Callable[[BackgroundJobRecord], None],
    ) -> None:
        self._handlers[pipeline] = handler

    def enqueue(self, request: BackgroundJobEnqueueRequest) -> BackgroundJobRecord:
        if request.max_attempts < 1:
            raise ValueError("max_attempts must be at least 1")
        if request.retry_delay_seconds < 0:
            raise ValueError("retry_delay_seconds must be zero or greater")

        replay_key = (request.athlete_id, request.idempotency_key)
        fingerprint = self._fingerprint_request(request)
        replay_job_id = self._jobs_by_idempotency.get(replay_key)
        if replay_job_id is not None:
            replay_job = self._jobs[replay_job_id]
            if replay_job.payload_fingerprint != fingerprint:
                raise ValueError("idempotency key already used with a different payload")
            return self._snapshot(replay_job)

        now = datetime.now(tz=UTC)
        self._job_counter += 1
        job = _StoredBackgroundJob(
            job_id=f"bg-job-{self._job_counter:06d}",
            athlete_id=request.athlete_id,
            pipeline=request.pipeline,
            idempotency_key=request.idempotency_key,
            correlation_id=request.correlation_id,
            payload=_clone_payload(request.payload),
            payload_fingerprint=fingerprint,
            status="queued",
            attempt_count=0,
            max_attempts=request.max_attempts,
            retry_delay_seconds=request.retry_delay_seconds,
            enqueued_at=now,
            available_at=now,
            completed_at=None,
            last_error_code=None,
            last_error_message=None,
            last_failed_at=None,
        )

        self._jobs[job.job_id] = job
        self._jobs_by_idempotency[replay_key] = job.job_id
        self._queued_job_ids.append(job.job_id)
        self._total_enqueued_count += 1

        logger.info(
            "background_job_enqueued",
            extra={
                "job_id": job.job_id,
                "pipeline": job.pipeline,
                "athlete_id": job.athlete_id,
                "correlation_id": job.correlation_id,
            },
        )

        return self._snapshot(job)

    def get_job(self, job_id: str) -> BackgroundJobRecord | None:
        job = self._jobs.get(job_id)
        if job is None:
            return None
        return self._snapshot(job)

    def list_dead_letters(self) -> list[BackgroundJobRecord]:
        dead_letters = [job for job in self._jobs.values() if job.status == "dead_letter"]
        dead_letters.sort(key=lambda job: (job.last_failed_at or job.enqueued_at, job.job_id))
        return [self._snapshot(job) for job in dead_letters]

    def metrics_snapshot(self) -> BackgroundJobMetrics:
        queue_depth = sum(1 for job in self._jobs.values() if job.status == "queued")
        failure_rate = 0.0
        average_processing_latency_ms = 0.0
        if self._processed_attempt_count > 0:
            failure_rate = self._failed_attempt_count / self._processed_attempt_count
            average_processing_latency_ms = (
                self._total_processing_latency_ms / self._processed_attempt_count
            )

        return BackgroundJobMetrics(
            queue_depth=queue_depth,
            total_enqueued_count=self._total_enqueued_count,
            processed_attempt_count=self._processed_attempt_count,
            succeeded_count=self._succeeded_count,
            failed_attempt_count=self._failed_attempt_count,
            retry_count=self._retry_count,
            dead_letter_count=self._dead_letter_count,
            failure_rate=failure_rate,
            average_processing_latency_ms=average_processing_latency_ms,
        )

    def process_next(self) -> BackgroundJobProcessOutcome | None:
        job = self._select_next_ready_job()
        if job is None:
            return None

        started_at = datetime.now(tz=UTC)
        started_perf = time.perf_counter()

        job.status = "processing"
        job.attempt_count += 1
        retryable = False
        error_code: str | None = None
        error_message: str | None = None

        try:
            handler = self._handlers[job.pipeline]
            handler(self._snapshot(job))
        except BackgroundJobExecutionError as exc:
            retryable = exc.retryable
            error_code = exc.code
            error_message = exc.message
        except Exception as exc:  # pragma: no cover - defensive safety path
            retryable = False
            error_code = "UNEXPECTED_ERROR"
            error_message = str(exc)

        finished_at = datetime.now(tz=UTC)
        latency_ms = (time.perf_counter() - started_perf) * 1000
        self._processed_attempt_count += 1
        self._total_processing_latency_ms += latency_ms

        if error_code is None:
            job.status = "succeeded"
            job.completed_at = finished_at
            job.last_error_code = None
            job.last_error_message = None
            job.last_failed_at = None
            self._succeeded_count += 1
            attempt_status: BackgroundJobAttemptStatus = "succeeded"
        else:
            self._failed_attempt_count += 1
            job.last_error_code = error_code
            job.last_error_message = error_message
            job.last_failed_at = finished_at

            if retryable and job.attempt_count < job.max_attempts:
                job.status = "queued"
                job.available_at = finished_at + timedelta(seconds=job.retry_delay_seconds)
                self._queued_job_ids.append(job.job_id)
                self._retry_count += 1
                attempt_status = "retry_scheduled"

                logger.warning(
                    "background_job_retry_scheduled",
                    extra={
                        "job_id": job.job_id,
                        "pipeline": job.pipeline,
                        "attempt_count": job.attempt_count,
                        "error_code": error_code,
                    },
                )
            else:
                job.status = "dead_letter"
                job.completed_at = finished_at
                self._dead_letter_count += 1
                attempt_status = "dead_letter"

                logger.error(
                    "background_job_dead_lettered",
                    extra={
                        "job_id": job.job_id,
                        "pipeline": job.pipeline,
                        "attempt_count": job.attempt_count,
                        "error_code": error_code,
                    },
                )

        job.attempt_history.append(
            BackgroundJobAttemptRecord(
                attempt_number=job.attempt_count,
                started_at=started_at,
                finished_at=finished_at,
                latency_ms=latency_ms,
                status=attempt_status,
                error_code=error_code,
                error_message=error_message,
            )
        )

        if attempt_status == "succeeded":
            logger.info(
                "background_job_succeeded",
                extra={
                    "job_id": job.job_id,
                    "pipeline": job.pipeline,
                    "attempt_count": job.attempt_count,
                },
            )

        return BackgroundJobProcessOutcome(
            job_id=job.job_id,
            pipeline=job.pipeline,
            status=attempt_status,
            attempt_count=job.attempt_count,
            latency_ms=latency_ms,
            error_code=error_code,
            error_message=error_message,
        )

    def process_until_idle(self, max_attempts: int = 500) -> list[BackgroundJobProcessOutcome]:
        outcomes: list[BackgroundJobProcessOutcome] = []
        for _ in range(max_attempts):
            outcome = self.process_next()
            if outcome is None:
                break
            outcomes.append(outcome)
        return outcomes

    def _select_next_ready_job(self) -> _StoredBackgroundJob | None:
        if not self._queued_job_ids:
            return None

        now = datetime.now(tz=UTC)
        queue_length = len(self._queued_job_ids)
        for _ in range(queue_length):
            job_id = self._queued_job_ids.popleft()
            job = self._jobs[job_id]
            if job.status != "queued":
                continue
            if job.available_at > now:
                self._queued_job_ids.append(job_id)
                continue
            return job
        return None

    @staticmethod
    def _fingerprint_request(request: BackgroundJobEnqueueRequest) -> str:
        normalized = {
            "pipeline": request.pipeline,
            "payload": request.payload,
        }
        serialized = json.dumps(normalized, sort_keys=True, separators=(",", ":"))
        return hashlib.sha256(serialized.encode("utf-8")).hexdigest()

    @staticmethod
    def _snapshot(job: _StoredBackgroundJob) -> BackgroundJobRecord:
        return BackgroundJobRecord(
            job_id=job.job_id,
            athlete_id=job.athlete_id,
            pipeline=job.pipeline,
            idempotency_key=job.idempotency_key,
            correlation_id=job.correlation_id,
            payload=_clone_payload(job.payload),
            status=job.status,
            attempt_count=job.attempt_count,
            max_attempts=job.max_attempts,
            retry_delay_seconds=job.retry_delay_seconds,
            enqueued_at=job.enqueued_at,
            available_at=job.available_at,
            completed_at=job.completed_at,
            last_error_code=job.last_error_code,
            last_error_message=job.last_error_message,
            last_failed_at=job.last_failed_at,
            attempt_history=tuple(job.attempt_history),
        )


def _clone_payload(payload: dict[str, Any]) -> dict[str, Any]:
    return json.loads(json.dumps(payload))
