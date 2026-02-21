from __future__ import annotations

from datetime import UTC, datetime

import pytest

from sportolo.api.schemas.wahoo_integration import (
    WahooControlMode,
    WahooTrainerControlRequest,
)
from sportolo.services.wahoo_control_service import (
    TrainerCommandAck,
    WahooControlService,
    WahooTrainerProtocolAdapter,
)


class _MockTrainerAdapter(WahooTrainerProtocolAdapter):
    def __init__(
        self,
        *,
        reconnect_results: list[TrainerCommandAck] | None = None,
        mode_results: list[TrainerCommandAck] | None = None,
        fallback_results: list[TrainerCommandAck] | None = None,
    ) -> None:
        self.reconnect_results = reconnect_results or [
            TrainerCommandAck(acknowledged=True, connection_state="connected")
        ]
        self.mode_results = mode_results or [
            TrainerCommandAck(acknowledged=True, connection_state="connected")
        ]
        self.fallback_results = fallback_results or [
            TrainerCommandAck(acknowledged=True, connection_state="connected")
        ]
        self.reconnect_calls: list[tuple[str, str]] = []
        self.mode_calls: list[tuple[str, str, str, float, str]] = []
        self.fallback_calls: list[tuple[str, str]] = []

    def reconnect(self, athlete_id: str, trainer_id: str) -> TrainerCommandAck:
        self.reconnect_calls.append((athlete_id, trainer_id))
        if self.reconnect_results:
            return self.reconnect_results.pop(0)
        return TrainerCommandAck(acknowledged=True, connection_state="connected")

    def apply_mode(
        self,
        athlete_id: str,
        trainer_id: str,
        mode: WahooControlMode,
        target_value: float,
        target_unit: str,
    ) -> TrainerCommandAck:
        self.mode_calls.append((athlete_id, trainer_id, mode, target_value, target_unit))
        if self.mode_results:
            return self.mode_results.pop(0)
        return TrainerCommandAck(acknowledged=True, connection_state="connected")

    def apply_safety_fallback(self, athlete_id: str, trainer_id: str) -> TrainerCommandAck:
        self.fallback_calls.append((athlete_id, trainer_id))
        if self.fallback_results:
            return self.fallback_results.pop(0)
        return TrainerCommandAck(acknowledged=True, connection_state="connected")


def _control_request(
    *,
    idempotency_key: str,
    trainer_id: str = "kickr-bike-001",
    mode: WahooControlMode = "erg",
    target_value: float = 240,
    target_unit: str = "watts",
) -> WahooTrainerControlRequest:
    return WahooTrainerControlRequest(
        idempotency_key=idempotency_key,
        trainer_id=trainer_id,
        mode=mode,
        target_value=target_value,
        target_unit=target_unit,
        requested_at=datetime(2026, 2, 21, 14, 0, tzinfo=UTC),
    )


def test_control_service_supports_erg_resistance_and_slope_modes() -> None:
    service = WahooControlService()

    erg = service.send_control_command(
        athlete_id="athlete-1",
        request=_control_request(idempotency_key="ctrl-1", mode="erg", target_unit="watts"),
    )
    resistance = service.send_control_command(
        athlete_id="athlete-1",
        request=_control_request(
            idempotency_key="ctrl-2",
            mode="resistance",
            target_value=0.4,
            target_unit="ratio",
        ),
    )
    slope = service.send_control_command(
        athlete_id="athlete-1",
        request=_control_request(
            idempotency_key="ctrl-3",
            mode="slope",
            target_value=3.5,
            target_unit="percent",
        ),
    )

    assert erg.status == "applied"
    assert erg.applied_mode == "erg"
    assert resistance.status == "applied"
    assert resistance.applied_mode == "resistance"
    assert slope.status == "applied"
    assert slope.applied_mode == "slope"


def test_control_service_replays_idempotent_requests_and_rejects_payload_drift() -> None:
    service = WahooControlService()
    first = _control_request(idempotency_key="ctrl-drift", mode="erg", target_value=260)

    initial = service.send_control_command("athlete-1", first)
    replay = service.send_control_command("athlete-1", first)

    assert initial == replay

    with pytest.raises(ValueError, match="idempotency"):
        service.send_control_command(
            "athlete-1",
            _control_request(idempotency_key="ctrl-drift", mode="erg", target_value=300),
        )


def test_control_service_attempts_reconnect_when_state_is_disconnected() -> None:
    adapter = _MockTrainerAdapter(
        reconnect_results=[TrainerCommandAck(acknowledged=True, connection_state="connected")],
        mode_results=[TrainerCommandAck(acknowledged=True, connection_state="connected")],
    )
    service = WahooControlService(adapter=adapter)
    service.set_connection_state_for_testing(
        athlete_id="athlete-1",
        trainer_id="kickr-bike-001",
        connection_state="disconnected",
    )

    response = service.send_control_command(
        athlete_id="athlete-1",
        request=_control_request(idempotency_key="ctrl-reconnect"),
    )

    assert response.status == "applied"
    assert response.transition == "reconnected_mode_changed"
    assert [event.event_type for event in response.telemetry_events] == [
        "reconnect_attempted",
        "reconnect_acknowledged",
        "command_issued",
        "command_acknowledged",
    ]
    assert adapter.reconnect_calls == [("athlete-1", "kickr-bike-001")]


def test_control_service_applies_safety_fallback_on_command_failure() -> None:
    adapter = _MockTrainerAdapter(
        mode_results=[
            TrainerCommandAck(
                acknowledged=False,
                connection_state="disconnected",
                error_code="trainer_disconnected",
            )
        ],
        fallback_results=[TrainerCommandAck(acknowledged=True, connection_state="connected")],
    )
    service = WahooControlService(adapter=adapter)

    response = service.send_control_command(
        athlete_id="athlete-1",
        request=_control_request(idempotency_key="ctrl-fallback"),
    )

    assert response.status == "safety_fallback"
    assert response.applied_mode == "resistance"
    assert response.applied_target_value == 0.0
    assert response.applied_target_unit == "ratio"
    assert response.failure_reason == "command_failed"
    assert response.transition == "fallback_applied"
    assert [event.event_type for event in response.telemetry_events] == [
        "command_issued",
        "command_failed",
        "safety_fallback_issued",
        "safety_fallback_acknowledged",
    ]
    assert adapter.fallback_calls == [("athlete-1", "kickr-bike-001")]
