from __future__ import annotations

from datetime import UTC, datetime

from sportolo.api.schemas.fatigue_today import (
    FatigueAxes,
    SessionFatigueInput,
    SleepEventInput,
    TodayAccumulationRequest,
)
from sportolo.services.today_accumulation_service import TodayAccumulationService


def _axes(value: float) -> FatigueAxes:
    return FatigueAxes(
        neural=value,
        metabolic=value,
        mechanical=value,
        recruitment=value,
    )


def test_today_accumulation_prefers_latest_qualifying_sleep_event_and_completed_only() -> None:
    service = TodayAccumulationService()
    request = TodayAccumulationRequest(
        as_of=datetime(2026, 2, 20, 15, 0, tzinfo=UTC),
        timezone="America/New_York",
        sleep_events=[
            SleepEventInput(sleep_ended_at=datetime(2026, 2, 20, 9, 30, tzinfo=UTC)),
            SleepEventInput(sleep_ended_at=datetime(2026, 2, 20, 10, 45, tzinfo=UTC)),
            SleepEventInput(sleep_ended_at=datetime(2026, 2, 20, 16, 0, tzinfo=UTC)),
        ],
        sessions=[
            SessionFatigueInput(
                session_id="completed-before-boundary",
                state="completed",
                ended_at=datetime(2026, 2, 20, 10, 0, tzinfo=UTC),
                fatigue_axes=_axes(1.5),
            ),
            SessionFatigueInput(
                session_id="completed-after-boundary",
                state="completed",
                ended_at=datetime(2026, 2, 20, 11, 0, tzinfo=UTC),
                fatigue_axes=_axes(4.0),
            ),
            SessionFatigueInput(
                session_id="planned-before-boundary",
                state="planned",
                ended_at=datetime(2026, 2, 20, 9, 45, tzinfo=UTC),
                fatigue_axes=_axes(7.0),
            ),
            SessionFatigueInput(
                session_id="completed-without-ended-at",
                state="completed",
                ended_at=None,
                fatigue_axes=_axes(3.0),
            ),
        ],
    )

    result = service.compute_today_accumulation(request)

    assert result.boundary.boundary_source == "sleep_event"
    assert result.boundary.boundary_end.isoformat() == "2026-02-20T05:45:00-05:00"
    assert result.included_session_ids == ["completed-before-boundary"]
    assert result.excluded_session_ids == [
        "completed-after-boundary",
        "planned-before-boundary",
        "completed-without-ended-at",
    ]
    assert result.accumulated_fatigue.model_dump() == {
        "neural": 1.5,
        "metabolic": 1.5,
        "mechanical": 1.5,
        "recruitment": 1.5,
    }


def test_today_accumulation_falls_back_to_local_midnight_without_sleep_event() -> None:
    service = TodayAccumulationService()
    request = TodayAccumulationRequest(
        as_of=datetime(2026, 2, 20, 15, 0, tzinfo=UTC),
        timezone="America/New_York",
        sleep_events=[SleepEventInput(sleep_ended_at=datetime(2026, 2, 19, 11, 0, tzinfo=UTC))],
        sessions=[
            SessionFatigueInput(
                session_id="before-midnight",
                state="completed",
                ended_at=datetime(2026, 2, 20, 4, 50, tzinfo=UTC),
                fatigue_axes=_axes(2.0),
            ),
            SessionFatigueInput(
                session_id="at-midnight",
                state="completed",
                ended_at=datetime(2026, 2, 20, 5, 0, tzinfo=UTC),
                fatigue_axes=_axes(6.0),
            ),
            SessionFatigueInput(
                session_id="after-midnight",
                state="completed",
                ended_at=datetime(2026, 2, 20, 5, 10, tzinfo=UTC),
                fatigue_axes=_axes(5.0),
            ),
        ],
    )

    result = service.compute_today_accumulation(request)

    assert result.boundary.boundary_source == "local_midnight"
    assert result.boundary.boundary_end.isoformat() == "2026-02-20T00:00:00-05:00"
    assert result.included_session_ids == ["before-midnight"]
    assert "at-midnight" in result.excluded_session_ids
    assert "after-midnight" in result.excluded_session_ids


def test_today_accumulation_is_deterministic_across_explicit_timezone_changes() -> None:
    service = TodayAccumulationService()
    as_of = datetime(2026, 6, 1, 0, 30, tzinfo=UTC)
    sessions = [
        SessionFatigueInput(
            session_id="cross-zone-session",
            state="completed",
            ended_at=datetime(2026, 5, 31, 12, 0, tzinfo=UTC),
            fatigue_axes=_axes(1.0),
        )
    ]

    la_request = TodayAccumulationRequest(
        as_of=as_of,
        timezone="America/Los_Angeles",
        sessions=sessions,
    )
    budapest_request = TodayAccumulationRequest(
        as_of=as_of,
        timezone="Europe/Budapest",
        sessions=sessions,
    )

    first_la = service.compute_today_accumulation(la_request)
    second_la = service.compute_today_accumulation(la_request)
    budapest = service.compute_today_accumulation(budapest_request)

    assert first_la == second_la
    assert first_la.boundary.boundary_end.isoformat() == "2026-05-31T00:00:00-07:00"
    assert budapest.boundary.boundary_end.isoformat() == "2026-06-01T00:00:00+02:00"
    assert first_la.included_session_ids == []
    assert budapest.included_session_ids == ["cross-zone-session"]
