from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

from pydantic import BaseModel

from sportolo.api.schemas.wahoo_integration import (
    PipelineDispatch,
    WahooExecutionHistoryEntry,
    WahooExecutionHistorySyncRequest,
    WahooExecutionHistorySyncResponse,
    WahooWorkoutPushRequest,
    WahooWorkoutPushResponse,
)


@dataclass(frozen=True)
class _PushReplay:
    fingerprint: str
    response: WahooWorkoutPushResponse


@dataclass(frozen=True)
class _SyncReplay:
    fingerprint: str
    response: WahooExecutionHistorySyncResponse


@dataclass(frozen=True)
class _ProviderHistoryRecord:
    athlete_id: str
    external_activity_id: str
    external_workout_id: str
    started_at: datetime
    completed_at: datetime
    duration_seconds: int
    source_index: int


@dataclass(frozen=True)
class _StoredActivity:
    import_id: str
    external_activity_id: str
    external_workout_id: str
    planned_workout_id: str | None
    sequence_number: int
    started_at: datetime
    completed_at: datetime
    duration_seconds: int


class WahooIntegrationService:
    _DEFAULT_HISTORY_START = datetime(2026, 1, 1, tzinfo=UTC)

    def __init__(self) -> None:
        self._push_replays: dict[tuple[str, str], _PushReplay] = {}
        self._sync_replays: dict[tuple[str, str], _SyncReplay] = {}
        self._planned_to_external: dict[tuple[str, str], str] = {}
        self._external_to_planned: dict[tuple[str, str], str] = {}
        self._provider_history_by_athlete: dict[str, list[_ProviderHistoryRecord]] = {}
        self._activity_by_key: dict[tuple[str, str], _StoredActivity] = {}
        self._dispatch_log_by_athlete: dict[str, list[PipelineDispatch]] = {}

        self._push_counter = 0
        self._sync_counter = 0
        self._import_counter = 0
        self._sequence_counter = 0
        self._history_source_counter = 0
        self._dispatch_counter = 0

    def reset_for_testing(self) -> None:
        self.__init__()

    def push_workout(
        self,
        athlete_id: str,
        request: WahooWorkoutPushRequest,
    ) -> WahooWorkoutPushResponse:
        replay_key = (athlete_id, request.idempotency_key)
        request_fingerprint = self._fingerprint_request(request)
        replay = self._push_replays.get(replay_key)
        if replay is not None:
            self._assert_matching_fingerprint(
                stored_fingerprint=replay.fingerprint,
                current_fingerprint=request_fingerprint,
            )
            return replay.response.model_copy(deep=True)

        self._push_counter += 1
        push_id = f"wahoo-push-{self._push_counter:06d}"
        total_duration_seconds = sum(step.duration_seconds for step in request.steps)
        received_at = datetime.now(tz=UTC)

        if self._trainer_unreachable(request.trainer_id):
            response = WahooWorkoutPushResponse(
                push_id=push_id,
                status="failed",
                idempotency_key=request.idempotency_key,
                planned_workout_id=request.planned_workout_id,
                external_workout_id=None,
                step_count=len(request.steps),
                total_duration_seconds=total_duration_seconds,
                received_at=received_at,
                failure_reason="trainer_unreachable",
            )
            self._push_replays[replay_key] = _PushReplay(
                fingerprint=request_fingerprint,
                response=response,
            )
            return response.model_copy(deep=True)

        external_workout_id = self._deterministic_external_workout_id(
            athlete_id=athlete_id,
            planned_workout_id=request.planned_workout_id,
            idempotency_key=request.idempotency_key,
        )
        self._planned_to_external[(athlete_id, request.planned_workout_id)] = external_workout_id
        self._external_to_planned[(athlete_id, external_workout_id)] = request.planned_workout_id

        self._append_provider_history(
            athlete_id=athlete_id,
            external_workout_id=external_workout_id,
            total_duration_seconds=total_duration_seconds,
            planned_start_at=request.planned_start_at,
        )

        response = WahooWorkoutPushResponse(
            push_id=push_id,
            status="accepted",
            idempotency_key=request.idempotency_key,
            planned_workout_id=request.planned_workout_id,
            external_workout_id=external_workout_id,
            step_count=len(request.steps),
            total_duration_seconds=total_duration_seconds,
            received_at=received_at,
            failure_reason=None,
        )
        self._push_replays[replay_key] = _PushReplay(
            fingerprint=request_fingerprint,
            response=response,
        )
        return response.model_copy(deep=True)

    def sync_execution_history(
        self,
        athlete_id: str,
        request: WahooExecutionHistorySyncRequest,
    ) -> WahooExecutionHistorySyncResponse:
        replay_key = (athlete_id, request.idempotency_key)
        request_fingerprint = self._fingerprint_request(request)
        replay = self._sync_replays.get(replay_key)
        if replay is not None:
            self._assert_matching_fingerprint(
                stored_fingerprint=replay.fingerprint,
                current_fingerprint=request_fingerprint,
            )
            return replay.response.model_copy(deep=True)

        started_after = self._coerce_utc(request.started_after)
        started_before = self._coerce_utc(request.started_before)
        history_records = self._provider_history_by_athlete.get(athlete_id, [])
        ordered_records = sorted(
            history_records,
            key=lambda record: (
                record.started_at,
                record.source_index,
                record.external_activity_id,
            ),
        )

        entries: list[WahooExecutionHistoryEntry] = []
        dispatches: list[PipelineDispatch] = []
        imported_count = 0
        duplicate_count = 0

        for record in ordered_records:
            if started_after is not None and record.started_at < started_after:
                continue
            if started_before is not None and record.started_at > started_before:
                continue

            activity_key = (athlete_id, record.external_activity_id)
            existing = self._activity_by_key.get(activity_key)
            if existing is not None:
                duplicate_count += 1
                entries.append(
                    WahooExecutionHistoryEntry(
                        import_id=existing.import_id,
                        external_activity_id=existing.external_activity_id,
                        external_workout_id=existing.external_workout_id,
                        planned_workout_id=existing.planned_workout_id,
                        dedup_status="duplicate_linked"
                        if existing.planned_workout_id is not None
                        else "duplicate_unlinked",
                        sequence_number=existing.sequence_number,
                        started_at=existing.started_at,
                        completed_at=existing.completed_at,
                        duration_seconds=existing.duration_seconds,
                    )
                )
                continue

            imported_count += 1
            self._import_counter += 1
            self._sequence_counter += 1
            import_id = f"wahoo-import-{self._import_counter:06d}"
            planned_workout_id = self._external_to_planned.get(
                (athlete_id, record.external_workout_id)
            )

            stored = _StoredActivity(
                import_id=import_id,
                external_activity_id=record.external_activity_id,
                external_workout_id=record.external_workout_id,
                planned_workout_id=planned_workout_id,
                sequence_number=self._sequence_counter,
                started_at=record.started_at,
                completed_at=record.completed_at,
                duration_seconds=record.duration_seconds,
            )
            self._activity_by_key[activity_key] = stored

            entries.append(
                WahooExecutionHistoryEntry(
                    import_id=stored.import_id,
                    external_activity_id=stored.external_activity_id,
                    external_workout_id=stored.external_workout_id,
                    planned_workout_id=stored.planned_workout_id,
                    dedup_status="new_linked"
                    if stored.planned_workout_id is not None
                    else "new_unlinked",
                    sequence_number=stored.sequence_number,
                    started_at=stored.started_at,
                    completed_at=stored.completed_at,
                    duration_seconds=stored.duration_seconds,
                )
            )
            new_dispatches = self._build_pipeline_dispatches(
                athlete_id=athlete_id,
                external_activity_id=stored.external_activity_id,
                planned_workout_id=stored.planned_workout_id,
                sequence_number=stored.sequence_number,
            )
            dispatches.extend(new_dispatches)

        self._sync_counter += 1
        response = WahooExecutionHistorySyncResponse(
            sync_id=f"wahoo-sync-{self._sync_counter:06d}",
            idempotency_key=request.idempotency_key,
            started_after=started_after,
            started_before=started_before,
            imported_count=imported_count,
            duplicate_count=duplicate_count,
            entries=entries,
            pipeline_dispatches=dispatches,
        )
        self._sync_replays[replay_key] = _SyncReplay(
            fingerprint=request_fingerprint,
            response=response,
        )
        return response.model_copy(deep=True)

    def _append_provider_history(
        self,
        *,
        athlete_id: str,
        external_workout_id: str,
        total_duration_seconds: int,
        planned_start_at: datetime | None,
    ) -> None:
        self._history_source_counter += 1
        start_at = self._coerce_utc(planned_start_at)
        if start_at is None:
            start_at = self._DEFAULT_HISTORY_START + timedelta(
                minutes=(self._history_source_counter - 1) * 15
            )
        completed_at = start_at + timedelta(seconds=total_duration_seconds)
        external_activity_id = self._deterministic_external_activity_id(
            athlete_id=athlete_id,
            external_workout_id=external_workout_id,
            started_at=start_at,
        )
        self._provider_history_by_athlete.setdefault(athlete_id, []).append(
            _ProviderHistoryRecord(
                athlete_id=athlete_id,
                external_activity_id=external_activity_id,
                external_workout_id=external_workout_id,
                started_at=start_at,
                completed_at=completed_at,
                duration_seconds=total_duration_seconds,
                source_index=self._history_source_counter,
            )
        )

    def _build_pipeline_dispatches(
        self,
        *,
        athlete_id: str,
        external_activity_id: str,
        planned_workout_id: str | None,
        sequence_number: int,
    ) -> list[PipelineDispatch]:
        dispatches: list[PipelineDispatch] = []
        for pipeline in ("fatigue", "analytics"):
            self._dispatch_counter += 1
            dispatch = PipelineDispatch(
                dispatch_id=f"wahoo-dispatch-{self._dispatch_counter:06d}",
                pipeline=pipeline,
                external_activity_id=external_activity_id,
                planned_workout_id=planned_workout_id,
                sequence_number=sequence_number,
                status="queued",
            )
            dispatches.append(dispatch)
            self._dispatch_log_by_athlete.setdefault(athlete_id, []).append(dispatch)
        return dispatches

    @staticmethod
    def _trainer_unreachable(trainer_id: str) -> bool:
        normalized = trainer_id.strip().lower()
        return normalized.startswith("offline") or normalized.startswith("fail")

    @staticmethod
    def _deterministic_external_workout_id(
        *,
        athlete_id: str,
        planned_workout_id: str,
        idempotency_key: str,
    ) -> str:
        source = f"{athlete_id}|{planned_workout_id}|{idempotency_key}"
        digest = hashlib.sha256(source.encode("utf-8")).hexdigest()[:16]
        return f"wahoo-workout-{digest}"

    @staticmethod
    def _deterministic_external_activity_id(
        *,
        athlete_id: str,
        external_workout_id: str,
        started_at: datetime,
    ) -> str:
        source = f"{athlete_id}|{external_workout_id}|{started_at.isoformat()}"
        digest = hashlib.sha256(source.encode("utf-8")).hexdigest()[:16]
        return f"wahoo-activity-{digest}"

    @staticmethod
    def _fingerprint_request(request: BaseModel) -> str:
        payload = request.model_dump(by_alias=True, mode="json", exclude_none=False)
        serialized = json.dumps(payload, sort_keys=True, separators=(",", ":"))
        return hashlib.sha256(serialized.encode("utf-8")).hexdigest()

    @staticmethod
    def _assert_matching_fingerprint(
        *,
        stored_fingerprint: str,
        current_fingerprint: str,
    ) -> None:
        if stored_fingerprint != current_fingerprint:
            raise ValueError("idempotency key already used with a different payload")

    @staticmethod
    def _coerce_utc(value: datetime | None) -> datetime | None:
        if value is None:
            return None
        if value.tzinfo is None:
            raise ValueError("datetime values must include timezone information")
        return value.astimezone(UTC)
