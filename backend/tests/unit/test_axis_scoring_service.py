from __future__ import annotations

from datetime import UTC, datetime

from sportolo.api.schemas.axis_scoring import (
    AxisRawLoad,
    AxisSeriesRequest,
    AxisSessionInput,
    SessionState,
    SleepEventInput,
)
from sportolo.services.axis_scoring_service import AxisScoringService


def _session(
    *,
    session_id: str,
    state: SessionState,
    ended_at: datetime | None,
    neural: float,
    metabolic: float,
    mechanical: float,
) -> AxisSessionInput:
    return AxisSessionInput(
        session_id=session_id,
        state=state,
        ended_at=ended_at,
        raw_load=AxisRawLoad(
            neural=neural,
            metabolic=metabolic,
            mechanical=mechanical,
        ),
    )


def test_compute_axis_series_maps_spikes_and_derives_recruitment() -> None:
    service = AxisScoringService()
    request = AxisSeriesRequest(
        as_of=datetime(2026, 2, 20, 20, 0, tzinfo=UTC),
        timezone="America/New_York",
        lookback_days=3,
        sessions=[
            _session(
                session_id="session-1",
                state="completed",
                ended_at=datetime(2026, 2, 19, 12, 0, tzinfo=UTC),
                neural=20,
                metabolic=18,
                mechanical=12,
            )
        ],
    )

    result = service.compute_axis_series(request)

    assert result.policy_version == "v1-axis-decay"
    assert len(result.session_spikes) == 1
    spike = result.session_spikes[0]
    assert 1.0 <= spike.neural <= 10.0
    assert 1.0 <= spike.metabolic <= 10.0
    assert 1.0 <= spike.mechanical <= 10.0
    assert spike.recruitment == max(spike.neural, spike.mechanical)


def test_neural_decay_sleep_and_rest_triggers_reduce_carry() -> None:
    service = AxisScoringService()
    baseline = AxisSeriesRequest(
        as_of=datetime(2026, 2, 20, 23, 0, tzinfo=UTC),
        timezone="America/New_York",
        lookback_days=3,
        sessions=[
            _session(
                session_id="high-neural-day-1",
                state="completed",
                ended_at=datetime(2026, 2, 18, 15, 0, tzinfo=UTC),
                neural=28,
                metabolic=4,
                mechanical=6,
            )
        ],
        sleep_events=[],
    )
    with_sleep = baseline.model_copy(
        update={
            "sleep_events": [
                SleepEventInput(sleep_ended_at=datetime(2026, 2, 19, 12, 0, tzinfo=UTC))
            ]
        }
    )

    no_sleep_result = service.compute_axis_series(baseline)
    with_sleep_result = service.compute_axis_series(with_sleep)

    no_sleep_day2 = no_sleep_result.daily_series[1]
    with_sleep_day2 = with_sleep_result.daily_series[1]
    assert with_sleep_day2.neural < no_sleep_day2.neural

    # day 3 is a pure rest carry day in both scenarios and should continue dropping.
    assert no_sleep_result.daily_series[2].neural < no_sleep_result.daily_series[1].neural


def test_metabolic_decay_is_faster_than_mechanical() -> None:
    service = AxisScoringService()
    request = AxisSeriesRequest(
        as_of=datetime(2026, 2, 20, 23, 0, tzinfo=UTC),
        timezone="America/New_York",
        lookback_days=4,
        sessions=[
            _session(
                session_id="same-initial-load",
                state="completed",
                ended_at=datetime(2026, 2, 17, 14, 0, tzinfo=UTC),
                neural=1,
                metabolic=26,
                mechanical=26,
            )
        ],
    )

    result = service.compute_axis_series(request)

    day2 = result.daily_series[1]
    day3 = result.daily_series[2]
    day4 = result.daily_series[3]
    assert day2.metabolic < day2.mechanical
    assert day3.metabolic < day3.mechanical
    assert day4.metabolic < day4.mechanical


def test_axis_scoring_service_is_deterministic_for_identical_payloads() -> None:
    service = AxisScoringService()
    request = AxisSeriesRequest(
        as_of=datetime(2026, 2, 20, 23, 0, tzinfo=UTC),
        timezone="America/New_York",
        lookback_days=3,
        sessions=[
            _session(
                session_id="session-1",
                state="completed",
                ended_at=datetime(2026, 2, 19, 18, 0, tzinfo=UTC),
                neural=10,
                metabolic=14,
                mechanical=11,
            ),
            _session(
                session_id="session-2",
                state="planned",
                ended_at=datetime(2026, 2, 19, 20, 0, tzinfo=UTC),
                neural=40,
                metabolic=40,
                mechanical=40,
            ),
        ],
    )

    first = service.compute_axis_series(request)
    second = service.compute_axis_series(request)

    assert first == second
    assert all(
        point.recruitment == max(point.neural, point.mechanical) for point in first.daily_series
    )
