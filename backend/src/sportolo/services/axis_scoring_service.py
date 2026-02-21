from __future__ import annotations

import math
from datetime import UTC, date, timedelta
from zoneinfo import ZoneInfo

from sportolo.api.schemas.axis_scoring import (
    AxisDailyScore,
    AxisSeriesRequest,
    AxisSeriesResponse,
    AxisSessionSpike,
)


class AxisScoringService:
    """Deterministic axis scoring and daily decay series generation."""

    _POLICY_VERSION = "v1-axis-decay"

    _SPIKE_COEFFICIENTS = {
        "neural": 0.085,
        "metabolic": 0.1,
        "mechanical": 0.07,
    }

    _METABOLIC_DAILY_DECAY = 0.5
    _MECHANICAL_DAILY_DECAY = 0.84

    _NEURAL_SLEEP_DECAY = 0.86
    _NEURAL_LOW_DAY_DECAY = 0.94
    _NEURAL_REST_DAY_DECAY = 0.76
    _LOW_NEURAL_LOAD_THRESHOLD = 0.75

    def compute_axis_series(self, request: AxisSeriesRequest) -> AxisSeriesResponse:
        zone = ZoneInfo(request.timezone)
        as_of_utc = request.as_of.astimezone(UTC)
        end_date = request.as_of.astimezone(zone).date()
        start_date = end_date - timedelta(days=request.lookback_days - 1)

        dates = [start_date + timedelta(days=offset) for offset in range(request.lookback_days)]
        empty_day_payload = {
            "neural": 0.0,
            "metabolic": 0.0,
            "mechanical": 0.0,
            "session_count": 0,
        }
        day_loads: dict[date, dict[str, float]] = {day: empty_day_payload.copy() for day in dates}

        sleep_dates = {
            event.sleep_ended_at.astimezone(zone).date()
            for event in request.sleep_events
            if event.sleep_ended_at.astimezone(UTC) <= as_of_utc
            and start_date <= event.sleep_ended_at.astimezone(zone).date() <= end_date
        }

        session_spikes: list[AxisSessionSpike] = []
        completed_sessions = sorted(
            request.sessions,
            key=lambda session: (
                session.ended_at.astimezone(UTC) if session.ended_at is not None else request.as_of,
                session.session_id,
            ),
        )

        for session in completed_sessions:
            if session.state != "completed" or session.ended_at is None:
                continue

            ended_at_utc = session.ended_at.astimezone(UTC)
            if ended_at_utc > as_of_utc:
                continue

            local_date = session.ended_at.astimezone(zone).date()
            if local_date < start_date or local_date > end_date:
                continue

            neural_spike = self._score_spike(raw_load=session.raw_load.neural, axis="neural")
            metabolic_spike = self._score_spike(
                raw_load=session.raw_load.metabolic, axis="metabolic"
            )
            mechanical_spike = self._score_spike(
                raw_load=session.raw_load.mechanical, axis="mechanical"
            )
            recruitment_spike = round(max(neural_spike, mechanical_spike), 4)

            session_spikes.append(
                AxisSessionSpike(
                    session_id=session.session_id,
                    ended_at=session.ended_at,
                    local_date=local_date,
                    neural=neural_spike,
                    metabolic=metabolic_spike,
                    mechanical=mechanical_spike,
                    recruitment=recruitment_spike,
                )
            )

            day_loads[local_date]["neural"] = self._round(
                day_loads[local_date]["neural"] + (neural_spike - 1.0)
            )
            day_loads[local_date]["metabolic"] = self._round(
                day_loads[local_date]["metabolic"] + (metabolic_spike - 1.0)
            )
            day_loads[local_date]["mechanical"] = self._round(
                day_loads[local_date]["mechanical"] + (mechanical_spike - 1.0)
            )
            day_loads[local_date]["session_count"] += 1

        daily_series: list[AxisDailyScore] = []
        carry_neural = 0.0
        carry_metabolic = 0.0
        carry_mechanical = 0.0

        for day in dates:
            day_neural_load = day_loads[day]["neural"]
            day_metabolic_load = day_loads[day]["metabolic"]
            day_mechanical_load = day_loads[day]["mechanical"]
            has_sessions = day_loads[day]["session_count"] > 0
            has_sleep = day in sleep_dates

            carry_neural = self._decay_neural(
                previous_load=carry_neural,
                has_sleep=has_sleep,
                has_sessions=has_sessions,
                day_neural_load=day_neural_load,
            )
            carry_metabolic = self._round(carry_metabolic * self._METABOLIC_DAILY_DECAY)
            carry_mechanical = self._round(carry_mechanical * self._MECHANICAL_DAILY_DECAY)

            carry_neural = self._round(carry_neural + day_neural_load)
            carry_metabolic = self._round(carry_metabolic + day_metabolic_load)
            carry_mechanical = self._round(carry_mechanical + day_mechanical_load)

            neural_score = self._score_from_load(carry_neural)
            metabolic_score = self._score_from_load(carry_metabolic)
            mechanical_score = self._score_from_load(carry_mechanical)
            recruitment_score = self._round(max(neural_score, mechanical_score))

            daily_series.append(
                AxisDailyScore(
                    date=day,
                    neural=neural_score,
                    metabolic=metabolic_score,
                    mechanical=mechanical_score,
                    recruitment=recruitment_score,
                    sleep_event_applied=has_sleep,
                    rest_day=not has_sessions,
                )
            )

        return AxisSeriesResponse(
            as_of=request.as_of,
            timezone=request.timezone,
            lookback_days=request.lookback_days,
            policy_version=self._POLICY_VERSION,
            session_spikes=session_spikes,
            daily_series=daily_series,
        )

    def _score_spike(self, *, raw_load: float, axis: str) -> float:
        if raw_load <= 0:
            return 1.0

        coefficient = self._SPIKE_COEFFICIENTS[axis]
        score = 1.0 + (9.0 * (1.0 - math.exp(-coefficient * raw_load)))
        return self._round(min(10.0, score))

    def _decay_neural(
        self,
        *,
        previous_load: float,
        has_sleep: bool,
        has_sessions: bool,
        day_neural_load: float,
    ) -> float:
        factor = 1.0
        if has_sleep:
            factor *= self._NEURAL_SLEEP_DECAY

        if not has_sessions:
            factor *= self._NEURAL_REST_DAY_DECAY
        elif day_neural_load <= self._LOW_NEURAL_LOAD_THRESHOLD:
            factor *= self._NEURAL_LOW_DAY_DECAY

        return self._round(previous_load * factor)

    @staticmethod
    def _score_from_load(load: float) -> float:
        return round(min(10.0, 1.0 + max(0.0, load)), 4)

    @staticmethod
    def _round(value: float) -> float:
        return round(value, 4)
