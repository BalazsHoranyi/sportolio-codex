from __future__ import annotations

import math
from datetime import UTC, datetime

import pytest

from sportolo.api.schemas.fatigue_today import (
    CombinedScoreContext,
    FatigueAxes,
    SessionFatigueInput,
    SleepEventInput,
    SystemCapacityInput,
    TodayAccumulationRequest,
)
from sportolo.services.today_accumulation_service import TodayAccumulationService


@pytest.fixture
def service() -> TodayAccumulationService:
    return TodayAccumulationService()


def _axes(value: float) -> FatigueAxes:
    return FatigueAxes(
        neural=value,
        metabolic=value,
        mechanical=value,
        recruitment=value,
    )


def test_today_accumulation_prefers_latest_qualifying_sleep_event_and_completed_only(
    service: TodayAccumulationService,
) -> None:
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


def test_today_accumulation_falls_back_to_local_midnight_without_sleep_event(
    service: TodayAccumulationService,
) -> None:
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


def test_today_accumulation_is_deterministic_across_explicit_timezone_changes(
    service: TodayAccumulationService,
) -> None:
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


def test_combined_score_applies_strict_weight_neural_capacity_order(
    service: TodayAccumulationService,
) -> None:
    request = TodayAccumulationRequest(
        as_of=datetime(2026, 2, 20, 15, 0, tzinfo=UTC),
        timezone="America/New_York",
        sleep_events=[SleepEventInput(sleep_ended_at=datetime(2026, 2, 20, 10, 45, tzinfo=UTC))],
        sessions=[
            SessionFatigueInput(
                session_id="completed-before-boundary",
                state="completed",
                ended_at=datetime(2026, 2, 20, 10, 0, tzinfo=UTC),
                fatigue_axes=FatigueAxes(
                    neural=8.0,
                    metabolic=4.0,
                    mechanical=3.0,
                    recruitment=5.0,
                ),
            )
        ],
        combined_score_context=CombinedScoreContext(workout_type="strength"),
        system_capacity=SystemCapacityInput(sleep=2, fuel=2, stress=4),
    )

    result = service.compute_today_accumulation(request)

    debug = result.combined_score.debug
    assert result.combined_score.interpretation == (
        "probability next hard session degrades adaptation"
    )
    assert debug.base_weighted_score == pytest.approx(3.8527, abs=1e-4)
    assert debug.neural_gate_factor == pytest.approx(1.27, abs=1e-4)
    assert debug.neural_gated_score == pytest.approx(4.8929, abs=1e-4)
    assert debug.capacity_gate_factor == pytest.approx(1.09, abs=1e-4)
    assert debug.capacity_gated_score == pytest.approx(5.3333, abs=1e-4)
    assert result.combined_score.value == pytest.approx(5.3333, abs=1e-4)


def test_combined_score_renormalizes_workout_type_weight_modifiers(
    service: TodayAccumulationService,
) -> None:
    request = TodayAccumulationRequest(
        as_of=datetime(2026, 2, 20, 15, 0, tzinfo=UTC),
        timezone="America/New_York",
        combined_score_context=CombinedScoreContext(workout_type="endurance"),
    )

    result = service.compute_today_accumulation(request)

    effective = result.combined_score.debug.effective_weights
    assert math.isclose(
        effective.metabolic + effective.mechanical + effective.recruitment,
        1.0,
        rel_tol=1e-4,
        abs_tol=1e-4,
    )
    assert effective.metabolic > result.combined_score.debug.base_weights.metabolic


def test_combined_score_defaults_missing_sleep_to_normal_value(
    service: TodayAccumulationService,
) -> None:
    shared_request_kwargs = {
        "as_of": datetime(2026, 2, 20, 15, 0, tzinfo=UTC),
        "timezone": "America/New_York",
        "sleep_events": [SleepEventInput(sleep_ended_at=datetime(2026, 2, 20, 10, 45, tzinfo=UTC))],
        "sessions": [
            SessionFatigueInput(
                session_id="completed-before-boundary",
                state="completed",
                ended_at=datetime(2026, 2, 20, 10, 0, tzinfo=UTC),
                fatigue_axes=_axes(4.0),
            )
        ],
    }

    missing_sleep = TodayAccumulationRequest(
        **shared_request_kwargs,
        system_capacity=SystemCapacityInput(sleep=None, fuel=4, stress=2),
    )
    explicit_normal_sleep = TodayAccumulationRequest(
        **shared_request_kwargs,
        system_capacity=SystemCapacityInput(sleep=3, fuel=4, stress=2),
    )

    missing_sleep_result = service.compute_today_accumulation(missing_sleep)
    explicit_sleep_result = service.compute_today_accumulation(explicit_normal_sleep)

    assert missing_sleep_result.combined_score.value == explicit_sleep_result.combined_score.value
    assert missing_sleep_result.combined_score.debug.default_sleep_applied is True
    assert explicit_sleep_result.combined_score.debug.default_sleep_applied is False


def test_combined_score_emits_weight_debug_logs(
    caplog: pytest.LogCaptureFixture,
    service: TodayAccumulationService,
) -> None:
    request = TodayAccumulationRequest(
        as_of=datetime(2026, 2, 20, 15, 0, tzinfo=UTC),
        timezone="America/New_York",
        sleep_events=[SleepEventInput(sleep_ended_at=datetime(2026, 2, 20, 10, 45, tzinfo=UTC))],
        sessions=[
            SessionFatigueInput(
                session_id="completed-before-boundary",
                state="completed",
                ended_at=datetime(2026, 2, 20, 10, 0, tzinfo=UTC),
                fatigue_axes=_axes(2.0),
            )
        ],
    )

    caplog.set_level("DEBUG")

    service.compute_today_accumulation(request)

    assert any("base_weights" in message for message in caplog.messages)
    assert any("effective_weights" in message for message in caplog.messages)


def test_today_accumulation_returns_explainability_top_three_ranked_contributors(
    service: TodayAccumulationService,
) -> None:
    request = TodayAccumulationRequest(
        as_of=datetime(2026, 2, 20, 12, 0, tzinfo=UTC),
        timezone="UTC",
        sessions=[
            SessionFatigueInput(
                session_id="a-session",
                session_label="Session A",
                state="completed",
                ended_at=datetime(2026, 2, 19, 9, 0, tzinfo=UTC),
                fatigue_axes=FatigueAxes(
                    neural=5.0,
                    metabolic=3.0,
                    mechanical=1.0,
                    recruitment=2.0,
                ),
            ),
            SessionFatigueInput(
                session_id="b-session",
                session_label="Session B",
                state="completed",
                ended_at=datetime(2026, 2, 19, 10, 0, tzinfo=UTC),
                fatigue_axes=FatigueAxes(
                    neural=5.0,
                    metabolic=1.0,
                    mechanical=4.0,
                    recruitment=3.0,
                ),
            ),
            SessionFatigueInput(
                session_id="c-session",
                session_label="Session C",
                state="completed",
                ended_at=datetime(2026, 2, 19, 11, 0, tzinfo=UTC),
                fatigue_axes=FatigueAxes(
                    neural=2.0,
                    metabolic=2.0,
                    mechanical=2.0,
                    recruitment=2.0,
                ),
            ),
            SessionFatigueInput(
                session_id="d-session",
                session_label="Session D",
                state="completed",
                ended_at=datetime(2026, 2, 19, 12, 0, tzinfo=UTC),
                fatigue_axes=FatigueAxes(
                    neural=1.0,
                    metabolic=1.0,
                    mechanical=1.0,
                    recruitment=1.0,
                ),
            ),
        ],
    )

    result = service.compute_today_accumulation(request)

    neural_contributors = result.explainability.neural.contributors
    assert [item.session_id for item in neural_contributors] == [
        "a-session",
        "b-session",
        "c-session",
    ]
    assert len(neural_contributors) == 3
    assert sum(item.contribution_share for item in neural_contributors) == pytest.approx(
        1.0, abs=1e-4
    )
    assert neural_contributors[0].label == "Session A"
    assert neural_contributors[1].label == "Session B"
    assert all(
        item.href == f"/calendar?sessionId={item.session_id}" for item in neural_contributors
    )
    assert result.explainability.neural.threshold_state == "high"

    combined_contributors = result.explainability.combined.contributors
    assert len(combined_contributors) == 3
    assert (
        combined_contributors[0].contribution_magnitude
        >= combined_contributors[1].contribution_magnitude
    )
    assert (
        combined_contributors[1].contribution_magnitude
        >= combined_contributors[2].contribution_magnitude
    )
    assert sum(item.contribution_share for item in combined_contributors) == pytest.approx(
        1.0, abs=1e-4
    )


def test_today_accumulation_explainability_includes_axis_meaning_and_decision_hints(
    service: TodayAccumulationService,
) -> None:
    request = TodayAccumulationRequest(
        as_of=datetime(2026, 2, 20, 15, 0, tzinfo=UTC),
        timezone="America/New_York",
        sleep_events=[SleepEventInput(sleep_ended_at=datetime(2026, 2, 20, 10, 45, tzinfo=UTC))],
        sessions=[
            SessionFatigueInput(
                session_id="completed-before-boundary",
                state="completed",
                ended_at=datetime(2026, 2, 20, 10, 0, tzinfo=UTC),
                fatigue_axes=_axes(4.0),
            )
        ],
    )

    result = service.compute_today_accumulation(request)

    score_blocks = [
        result.explainability.neural,
        result.explainability.metabolic,
        result.explainability.mechanical,
        result.explainability.recruitment,
        result.explainability.combined,
    ]
    for block in score_blocks:
        assert block.axis_meaning
        assert block.decision_hint
        assert block.threshold_state in {"low", "moderate", "high"}
