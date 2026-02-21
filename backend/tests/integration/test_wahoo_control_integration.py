from __future__ import annotations

from datetime import UTC, datetime

from sportolo.api.schemas.wahoo_integration import (
    WahooControlMode,
    WahooTrainerControlRequest,
)
from sportolo.services.wahoo_control_service import (
    TrainerCommandAck,
    WahooControlService,
    WahooTrainerProtocolAdapter,
)


class _ScriptedAdapter(WahooTrainerProtocolAdapter):
    def __init__(self) -> None:
        self.reconnect_queue: list[TrainerCommandAck] = []
        self.mode_queue: list[TrainerCommandAck] = []
        self.fallback_queue: list[TrainerCommandAck] = []
        self.calls: list[str] = []

    def reconnect(self, athlete_id: str, trainer_id: str) -> TrainerCommandAck:
        self.calls.append(f"reconnect:{athlete_id}:{trainer_id}")
        if self.reconnect_queue:
            return self.reconnect_queue.pop(0)
        return TrainerCommandAck(acknowledged=True, connection_state="connected")

    def apply_mode(
        self,
        athlete_id: str,
        trainer_id: str,
        mode: WahooControlMode,
        target_value: float,
        target_unit: str,
    ) -> TrainerCommandAck:
        self.calls.append(
            f"apply_mode:{athlete_id}:{trainer_id}:{mode}:{target_value}:{target_unit}"
        )
        if self.mode_queue:
            return self.mode_queue.pop(0)
        return TrainerCommandAck(acknowledged=True, connection_state="connected")

    def apply_safety_fallback(self, athlete_id: str, trainer_id: str) -> TrainerCommandAck:
        self.calls.append(f"fallback:{athlete_id}:{trainer_id}")
        if self.fallback_queue:
            return self.fallback_queue.pop(0)
        return TrainerCommandAck(acknowledged=True, connection_state="connected")


def _request(
    *,
    key: str,
    mode: WahooControlMode,
    target_value: float,
    target_unit: str,
) -> WahooTrainerControlRequest:
    return WahooTrainerControlRequest(
        idempotency_key=key,
        trainer_id="kickr-bike-001",
        mode=mode,
        target_value=target_value,
        target_unit=target_unit,
        requested_at=datetime(2026, 2, 21, 14, 0, tzinfo=UTC),
    )


def test_control_state_machine_reconnects_then_applies_transition_sequence() -> None:
    adapter = _ScriptedAdapter()
    adapter.reconnect_queue.append(
        TrainerCommandAck(acknowledged=True, connection_state="connected")
    )
    adapter.mode_queue.extend(
        [
            TrainerCommandAck(acknowledged=True, connection_state="connected"),
            TrainerCommandAck(acknowledged=True, connection_state="connected"),
        ]
    )
    service = WahooControlService(adapter=adapter)
    service.set_connection_state_for_testing(
        athlete_id="athlete-1",
        trainer_id="kickr-bike-001",
        connection_state="disconnected",
    )

    first = service.send_control_command(
        athlete_id="athlete-1",
        request=_request(key="ctrl-seq-1", mode="erg", target_value=250, target_unit="watts"),
    )
    second = service.send_control_command(
        athlete_id="athlete-1",
        request=_request(
            key="ctrl-seq-2",
            mode="slope",
            target_value=4.0,
            target_unit="percent",
        ),
    )

    assert first.status == "applied"
    assert first.transition == "reconnected_mode_changed"
    assert second.status == "applied"
    assert second.transition == "mode_changed"
    assert adapter.calls == [
        "reconnect:athlete-1:kickr-bike-001",
        "apply_mode:athlete-1:kickr-bike-001:erg:250.0:watts",
        "apply_mode:athlete-1:kickr-bike-001:slope:4.0:percent",
    ]


def test_control_state_machine_uses_mocked_adapter_for_fallback_flow() -> None:
    adapter = _ScriptedAdapter()
    adapter.mode_queue.append(
        TrainerCommandAck(
            acknowledged=False,
            connection_state="disconnected",
            error_code="trainer_disconnected",
        )
    )
    adapter.fallback_queue.append(
        TrainerCommandAck(acknowledged=True, connection_state="connected")
    )
    service = WahooControlService(adapter=adapter)

    response = service.send_control_command(
        athlete_id="athlete-1",
        request=_request(
            key="ctrl-seq-fallback", mode="erg", target_value=280, target_unit="watts"
        ),
    )

    assert response.status == "safety_fallback"
    assert response.failure_reason == "command_failed"
    assert response.transition == "fallback_applied"
    assert adapter.calls == [
        "apply_mode:athlete-1:kickr-bike-001:erg:280.0:watts",
        "fallback:athlete-1:kickr-bike-001",
    ]
