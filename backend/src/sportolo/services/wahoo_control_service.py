from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Protocol

from pydantic import BaseModel

from sportolo.api.schemas.wahoo_integration import (
    WahooConnectionState,
    WahooControlMode,
    WahooControlStatus,
    WahooControlTelemetryEvent,
    WahooControlTelemetryEventType,
    WahooControlTransition,
    WahooTrainerControlRequest,
    WahooTrainerControlResponse,
)


@dataclass(frozen=True)
class TrainerCommandAck:
    acknowledged: bool
    connection_state: WahooConnectionState
    error_code: str | None = None


class WahooTrainerProtocolAdapter(Protocol):
    def reconnect(self, athlete_id: str, trainer_id: str) -> TrainerCommandAck: ...

    def apply_mode(
        self,
        athlete_id: str,
        trainer_id: str,
        mode: WahooControlMode,
        target_value: float,
        target_unit: str,
    ) -> TrainerCommandAck: ...

    def apply_safety_fallback(self, athlete_id: str, trainer_id: str) -> TrainerCommandAck: ...


class DefaultWahooTrainerProtocolAdapter:
    def reconnect(self, athlete_id: str, trainer_id: str) -> TrainerCommandAck:
        del athlete_id
        normalized = trainer_id.strip().lower()
        if "offline" in normalized or "reconnect-fail" in normalized:
            return TrainerCommandAck(
                acknowledged=False,
                connection_state="disconnected",
                error_code="trainer_unreachable",
            )
        return TrainerCommandAck(acknowledged=True, connection_state="connected")

    def apply_mode(
        self,
        athlete_id: str,
        trainer_id: str,
        mode: WahooControlMode,
        target_value: float,
        target_unit: str,
    ) -> TrainerCommandAck:
        del athlete_id, mode, target_value, target_unit
        normalized = trainer_id.strip().lower()
        if "disconnect-on-command" in normalized:
            return TrainerCommandAck(
                acknowledged=False,
                connection_state="disconnected",
                error_code="trainer_disconnected",
            )
        if "fail-command" in normalized:
            return TrainerCommandAck(
                acknowledged=False,
                connection_state="connected",
                error_code="command_rejected",
            )
        return TrainerCommandAck(acknowledged=True, connection_state="connected")

    def apply_safety_fallback(self, athlete_id: str, trainer_id: str) -> TrainerCommandAck:
        del athlete_id
        normalized = trainer_id.strip().lower()
        if "fallback-fail" in normalized:
            return TrainerCommandAck(
                acknowledged=False,
                connection_state="disconnected"
                if "disconnect" in normalized or "offline" in normalized
                else "connected",
                error_code="safety_fallback_rejected",
            )
        return TrainerCommandAck(acknowledged=True, connection_state="connected")


@dataclass(frozen=True)
class _ControlReplay:
    fingerprint: str
    response: WahooTrainerControlResponse


@dataclass
class _TrainerState:
    connection_state: WahooConnectionState
    active_mode: WahooControlMode | None = None
    active_target_value: float | None = None
    active_target_unit: str | None = None


class WahooControlService:
    _WAHOO_TRAINER_PREFIXES = ("wahoo", "kickr", "elemnt", "bolt", "roam")
    _SAFE_FALLBACK_MODE: WahooControlMode = "resistance"
    _SAFE_FALLBACK_VALUE = 0.0
    _SAFE_FALLBACK_UNIT = "ratio"

    def __init__(self, adapter: WahooTrainerProtocolAdapter | None = None) -> None:
        self._adapter = adapter or DefaultWahooTrainerProtocolAdapter()
        self._reset_state()

    def _reset_state(self) -> None:
        self._control_replays: dict[tuple[str, str], _ControlReplay] = {}
        self._trainer_state_by_key: dict[tuple[str, str], _TrainerState] = {}
        self._command_counter = 0
        self._event_counter = 0

    def reset_for_testing(self) -> None:
        self._reset_state()

    def set_connection_state_for_testing(
        self,
        *,
        athlete_id: str,
        trainer_id: str,
        connection_state: WahooConnectionState,
    ) -> None:
        state = self._get_or_create_state(athlete_id=athlete_id, trainer_id=trainer_id)
        state.connection_state = connection_state

    def send_control_command(
        self,
        athlete_id: str,
        request: WahooTrainerControlRequest,
    ) -> WahooTrainerControlResponse:
        replay_key = (athlete_id, request.idempotency_key)
        request_fingerprint = self._fingerprint_request(request)
        replay = self._control_replays.get(replay_key)
        if replay is not None:
            self._assert_matching_fingerprint(
                stored_fingerprint=replay.fingerprint,
                current_fingerprint=request_fingerprint,
            )
            return replay.response.model_copy(deep=True)

        state = self._get_or_create_state(athlete_id=athlete_id, trainer_id=request.trainer_id)
        issued_at = datetime.now(tz=UTC)
        telemetry_events: list[WahooControlTelemetryEvent] = []

        if not self._is_supported_trainer(request.trainer_id):
            response = self._build_response(
                request=request,
                issued_at=issued_at,
                state=state,
                status="failed",
                transition="failed",
                failure_reason="unsupported_trainer",
                telemetry_events=telemetry_events,
            )
            self._store_replay(replay_key, request_fingerprint, response)
            return response.model_copy(deep=True)

        reconnected = False
        if state.connection_state == "disconnected":
            telemetry_events.append(
                self._telemetry_event(
                    event_type="reconnect_attempted",
                    connection_state=state.connection_state,
                )
            )
            reconnect_ack = self._adapter.reconnect(
                athlete_id=athlete_id, trainer_id=request.trainer_id
            )
            state.connection_state = reconnect_ack.connection_state
            if reconnect_ack.acknowledged:
                reconnected = True
                telemetry_events.append(
                    self._telemetry_event(
                        event_type="reconnect_acknowledged",
                        connection_state=state.connection_state,
                    )
                )
            else:
                telemetry_events.append(
                    self._telemetry_event(
                        event_type="reconnect_failed",
                        connection_state=state.connection_state,
                        error_code=reconnect_ack.error_code,
                    )
                )
                response = self._apply_safety_fallback(
                    athlete_id=athlete_id,
                    request=request,
                    issued_at=issued_at,
                    state=state,
                    telemetry_events=telemetry_events,
                    failure_reason="reconnect_failed",
                )
                self._store_replay(replay_key, request_fingerprint, response)
                return response.model_copy(deep=True)

        telemetry_events.append(
            self._telemetry_event(
                event_type="command_issued",
                connection_state=state.connection_state,
                mode=request.mode,
            )
        )
        command_ack = self._adapter.apply_mode(
            athlete_id=athlete_id,
            trainer_id=request.trainer_id,
            mode=request.mode,
            target_value=request.target_value,
            target_unit=request.target_unit,
        )
        state.connection_state = command_ack.connection_state

        if command_ack.acknowledged:
            telemetry_events.append(
                self._telemetry_event(
                    event_type="command_acknowledged",
                    connection_state=state.connection_state,
                    mode=request.mode,
                )
            )
            state.active_mode = request.mode
            state.active_target_value = request.target_value
            state.active_target_unit = request.target_unit
            response = self._build_response(
                request=request,
                issued_at=issued_at,
                state=state,
                status="applied",
                transition="reconnected_mode_changed" if reconnected else "mode_changed",
                failure_reason=None,
                telemetry_events=telemetry_events,
            )
            self._store_replay(replay_key, request_fingerprint, response)
            return response.model_copy(deep=True)

        telemetry_events.append(
            self._telemetry_event(
                event_type="command_failed",
                connection_state=state.connection_state,
                mode=request.mode,
                error_code=command_ack.error_code,
            )
        )
        response = self._apply_safety_fallback(
            athlete_id=athlete_id,
            request=request,
            issued_at=issued_at,
            state=state,
            telemetry_events=telemetry_events,
            failure_reason="command_failed",
        )
        self._store_replay(replay_key, request_fingerprint, response)
        return response.model_copy(deep=True)

    def _apply_safety_fallback(
        self,
        *,
        athlete_id: str,
        request: WahooTrainerControlRequest,
        issued_at: datetime,
        state: _TrainerState,
        telemetry_events: list[WahooControlTelemetryEvent],
        failure_reason: str,
    ) -> WahooTrainerControlResponse:
        telemetry_events.append(
            self._telemetry_event(
                event_type="safety_fallback_issued",
                connection_state=state.connection_state,
            )
        )
        fallback_ack = self._adapter.apply_safety_fallback(
            athlete_id=athlete_id,
            trainer_id=request.trainer_id,
        )
        state.connection_state = fallback_ack.connection_state

        if fallback_ack.acknowledged:
            telemetry_events.append(
                self._telemetry_event(
                    event_type="safety_fallback_acknowledged",
                    connection_state=state.connection_state,
                )
            )
            state.active_mode = self._SAFE_FALLBACK_MODE
            state.active_target_value = self._SAFE_FALLBACK_VALUE
            state.active_target_unit = self._SAFE_FALLBACK_UNIT
            return self._build_response(
                request=request,
                issued_at=issued_at,
                state=state,
                status="safety_fallback",
                transition="fallback_applied",
                failure_reason=failure_reason,
                telemetry_events=telemetry_events,
            )

        telemetry_events.append(
            self._telemetry_event(
                event_type="safety_fallback_failed",
                connection_state=state.connection_state,
                error_code=fallback_ack.error_code,
            )
        )
        state.active_mode = None
        state.active_target_value = None
        state.active_target_unit = None
        return self._build_response(
            request=request,
            issued_at=issued_at,
            state=state,
            status="failed",
            transition="failed",
            failure_reason="safety_fallback_failed",
            telemetry_events=telemetry_events,
        )

    def _build_response(
        self,
        *,
        request: WahooTrainerControlRequest,
        issued_at: datetime,
        state: _TrainerState,
        status: WahooControlStatus,
        transition: WahooControlTransition,
        failure_reason: str | None,
        telemetry_events: list[WahooControlTelemetryEvent],
    ) -> WahooTrainerControlResponse:
        self._command_counter += 1
        return WahooTrainerControlResponse(
            command_id=f"wahoo-control-{self._command_counter:06d}",
            status=status,
            idempotency_key=request.idempotency_key,
            trainer_id=request.trainer_id,
            requested_mode=request.mode,
            requested_target_value=request.target_value,
            requested_target_unit=request.target_unit,
            applied_mode=state.active_mode,
            applied_target_value=state.active_target_value,
            applied_target_unit=state.active_target_unit,
            connection_state=state.connection_state,
            transition=transition,
            failure_reason=failure_reason,
            issued_at=issued_at,
            telemetry_events=telemetry_events,
        )

    def _telemetry_event(
        self,
        *,
        event_type: WahooControlTelemetryEventType,
        connection_state: WahooConnectionState,
        mode: WahooControlMode | None = None,
        error_code: str | None = None,
    ) -> WahooControlTelemetryEvent:
        self._event_counter += 1
        return WahooControlTelemetryEvent(
            event_id=f"wahoo-control-event-{self._event_counter:06d}",
            event_type=event_type,
            connection_state=connection_state,
            occurred_at=datetime.now(tz=UTC),
            mode=mode,
            error_code=error_code,
        )

    def _store_replay(
        self,
        replay_key: tuple[str, str],
        request_fingerprint: str,
        response: WahooTrainerControlResponse,
    ) -> None:
        self._control_replays[replay_key] = _ControlReplay(
            fingerprint=request_fingerprint,
            response=response,
        )

    def _get_or_create_state(self, *, athlete_id: str, trainer_id: str) -> _TrainerState:
        key = (athlete_id, trainer_id)
        state = self._trainer_state_by_key.get(key)
        if state is not None:
            return state
        created = _TrainerState(connection_state=self._initial_connection_state(trainer_id))
        self._trainer_state_by_key[key] = created
        return created

    @classmethod
    def _is_supported_trainer(cls, trainer_id: str) -> bool:
        normalized = trainer_id.strip().lower()
        return normalized.startswith(cls._WAHOO_TRAINER_PREFIXES)

    @staticmethod
    def _initial_connection_state(trainer_id: str) -> WahooConnectionState:
        normalized = trainer_id.strip().lower()
        if "offline" in normalized:
            return "disconnected"
        return "connected"

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
