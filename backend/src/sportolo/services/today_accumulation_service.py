from __future__ import annotations

import logging
from datetime import UTC, datetime, time, timedelta
from urllib.parse import quote
from zoneinfo import ZoneInfo

from sportolo.api.schemas.fatigue_today import (
    BoundarySource,
    CombinedScore,
    CombinedScoreDebug,
    CombinedScoreWeights,
    ExplainabilityContributor,
    FatigueAxes,
    RolloverBoundary,
    ScoreExplainability,
    ScoreThresholdState,
    SessionFatigueInput,
    SleepEventInput,
    TodayAccumulationRequest,
    TodayAccumulationResponse,
    TodayExplainability,
    WorkoutType,
)


class TodayAccumulationService:
    """Deterministic completed-only accumulation with sleep-first rollover boundaries."""

    _BASE_WEIGHTS = {
        "metabolic": 0.45,
        "mechanical": 0.35,
        "recruitment": 0.20,
    }

    _WORKOUT_TYPE_MODIFIERS: dict[WorkoutType, dict[str, float]] = {
        "hybrid": {
            "metabolic": 1.00,
            "mechanical": 1.00,
            "recruitment": 1.00,
        },
        "strength": {
            "metabolic": 0.85,
            "mechanical": 1.15,
            "recruitment": 1.25,
        },
        "endurance": {
            "metabolic": 1.20,
            "mechanical": 0.85,
            "recruitment": 0.95,
        },
    }

    _COMBINED_SCORE_INTERPRETATION = "probability next hard session degrades adaptation"
    _AXIS_MEANINGS = {
        "neural": (
            "Neural reflects central-drive and coordination readiness "
            "for precision or high-skill work."
        ),
        "metabolic": (
            "Metabolic reflects substrate and energetic strain from recent work density."
        ),
        "mechanical": (
            "Mechanical reflects force and tissue load accumulation that drives soreness and risk."
        ),
        "recruitment": (
            "Recruitment reflects high-threshold motor-unit demand "
            "derived from neural and mechanical stress."
        ),
        "combined": (
            "Combined estimates the probability that the next hard session degrades adaptation."
        ),
    }
    _DECISION_HINTS = {
        "low": "Load is low. Keep planned quality if execution is crisp.",
        "moderate": "Load is building. Consolidate hard work and monitor drift.",
        "high": "Load is high. Consider reducing intensity or moving hard work.",
    }

    def compute_today_accumulation(
        self, request: TodayAccumulationRequest
    ) -> TodayAccumulationResponse:
        zone = ZoneInfo(request.timezone)
        as_of_local = request.as_of.astimezone(zone)
        boundary_end_local, boundary_source = self._resolve_boundary_end(
            sleep_events=request.sleep_events,
            as_of_local=as_of_local,
            zone=zone,
        )
        boundary_start_local = self._resolve_boundary_start(boundary_end_local, zone)

        boundary_end_utc = boundary_end_local.astimezone(UTC)
        totals = {
            "neural": 0.0,
            "metabolic": 0.0,
            "mechanical": 0.0,
            "recruitment": 0.0,
        }
        included_sessions: list[SessionFatigueInput] = []
        included_session_ids: list[str] = []
        excluded_session_ids: list[str] = []

        for session in request.sessions:
            if self._is_included(session, boundary_end_utc):
                included_sessions.append(session)
                included_session_ids.append(session.session_id)
                totals = self._accumulate_axes(totals, session.fatigue_axes)
            else:
                excluded_session_ids.append(session.session_id)

        accumulated_fatigue = FatigueAxes(**totals)
        combined_score = self._compute_combined_score(
            accumulated_fatigue=accumulated_fatigue,
            workout_type=request.combined_score_context.workout_type,
            sleep=request.system_capacity.sleep,
            fuel=request.system_capacity.fuel,
            stress=request.system_capacity.stress,
        )
        explainability = self._build_explainability(
            accumulated_fatigue=accumulated_fatigue,
            combined_score=combined_score,
            included_sessions=included_sessions,
        )

        return TodayAccumulationResponse(
            as_of=request.as_of,
            boundary=RolloverBoundary(
                boundary_start=boundary_start_local,
                boundary_end=boundary_end_local,
                boundary_source=boundary_source,
                timezone=request.timezone,
            ),
            included_session_ids=included_session_ids,
            excluded_session_ids=excluded_session_ids,
            accumulated_fatigue=accumulated_fatigue,
            combined_score=combined_score,
            explainability=explainability,
        )

    def _resolve_boundary_end(
        self,
        sleep_events: list[SleepEventInput],
        as_of_local: datetime,
        zone: ZoneInfo,
    ) -> tuple[datetime, BoundarySource]:
        as_of_utc = as_of_local.astimezone(UTC)
        candidate_sleep_events: list[datetime] = []

        for sleep_event in sleep_events:
            sleep_end_utc = sleep_event.sleep_ended_at.astimezone(UTC)
            if sleep_end_utc > as_of_utc:
                continue

            sleep_end_local = sleep_event.sleep_ended_at.astimezone(zone)
            if sleep_end_local.date() == as_of_local.date():
                candidate_sleep_events.append(sleep_end_local)

        if candidate_sleep_events:
            return max(candidate_sleep_events), "sleep_event"

        local_midnight = datetime.combine(as_of_local.date(), time.min, tzinfo=zone)
        return local_midnight, "local_midnight"

    @staticmethod
    def _resolve_boundary_start(boundary_end_local: datetime, zone: ZoneInfo) -> datetime:
        previous_day = boundary_end_local.date() - timedelta(days=1)
        return datetime.combine(previous_day, time.min, tzinfo=zone)

    @staticmethod
    def _is_included(session: SessionFatigueInput, boundary_end_utc: datetime) -> bool:
        if session.state != "completed":
            return False

        if session.ended_at is None:
            return False

        return session.ended_at.astimezone(UTC) < boundary_end_utc

    @staticmethod
    def _accumulate_axes(current: dict[str, float], delta: FatigueAxes) -> dict[str, float]:
        return {
            "neural": round(current["neural"] + delta.neural, 4),
            "metabolic": round(current["metabolic"] + delta.metabolic, 4),
            "mechanical": round(current["mechanical"] + delta.mechanical, 4),
            "recruitment": round(current["recruitment"] + delta.recruitment, 4),
        }

    def _compute_combined_score(
        self,
        accumulated_fatigue: FatigueAxes,
        workout_type: WorkoutType,
        sleep: int | None,
        fuel: int,
        stress: int,
    ) -> CombinedScore:
        modifier_weights = self._WORKOUT_TYPE_MODIFIERS[workout_type]
        effective_weights = self._renormalized_effective_weights(modifier_weights)

        base_weighted_score = round(
            (
                accumulated_fatigue.metabolic * effective_weights["metabolic"]
                + accumulated_fatigue.mechanical * effective_weights["mechanical"]
                + accumulated_fatigue.recruitment * effective_weights["recruitment"]
            ),
            4,
        )

        neural_gate_factor = self._neural_gate_factor(accumulated_fatigue.neural)
        neural_gated_score = round(base_weighted_score * neural_gate_factor, 4)

        default_sleep_applied = sleep is None
        effective_sleep = 3 if sleep is None else sleep
        capacity_gate_factor = self._capacity_gate_factor(
            sleep=effective_sleep,
            fuel=fuel,
            stress=stress,
        )
        capacity_gated_score = round(neural_gated_score * capacity_gate_factor, 4)

        logging.getLogger().debug(
            "combined_score_debug base_weights=%s modifier_weights=%s effective_weights=%s",
            self._BASE_WEIGHTS,
            modifier_weights,
            effective_weights,
        )

        return CombinedScore(
            value=round(min(10.0, capacity_gated_score), 4),
            interpretation=self._COMBINED_SCORE_INTERPRETATION,
            debug=CombinedScoreDebug(
                workout_type=workout_type,
                default_sleep_applied=default_sleep_applied,
                base_weights=self._weights_model(self._BASE_WEIGHTS),
                modifier_weights=self._weights_model(modifier_weights),
                effective_weights=self._weights_model(effective_weights),
                base_weighted_score=base_weighted_score,
                neural_gate_factor=neural_gate_factor,
                neural_gated_score=neural_gated_score,
                capacity_gate_factor=capacity_gate_factor,
                capacity_gated_score=capacity_gated_score,
            ),
        )

    def _renormalized_effective_weights(self, modifiers: dict[str, float]) -> dict[str, float]:
        raw_weights = {
            axis: self._BASE_WEIGHTS[axis] * modifiers[axis]
            for axis in ("metabolic", "mechanical", "recruitment")
        }
        total = sum(raw_weights.values())
        if total == 0:
            return self._BASE_WEIGHTS.copy()

        return {
            axis: raw_weights[axis] / total for axis in ("metabolic", "mechanical", "recruitment")
        }

    @staticmethod
    def _neural_gate_factor(neural: float) -> float:
        if neural <= 4.0:
            return 1.0

        if neural <= 7.0:
            return round(1.0 + ((neural - 4.0) * 0.05), 4)

        return round(min(1.75, 1.15 + ((neural - 7.0) * 0.12)), 4)

    @staticmethod
    def _capacity_gate_factor(sleep: int, fuel: int, stress: int) -> float:
        inverted_stress = 6 - stress
        readiness = (sleep + fuel + inverted_stress) / 3
        normalized_readiness = readiness / 5
        return round(1.25 - (normalized_readiness * 0.4), 4)

    @staticmethod
    def _weights_model(weights: dict[str, float]) -> CombinedScoreWeights:
        return CombinedScoreWeights(
            metabolic=round(weights["metabolic"], 4),
            mechanical=round(weights["mechanical"], 4),
            recruitment=round(weights["recruitment"], 4),
        )

    def _build_explainability(
        self,
        *,
        accumulated_fatigue: FatigueAxes,
        combined_score: CombinedScore,
        included_sessions: list[SessionFatigueInput],
    ) -> TodayExplainability:
        return TodayExplainability(
            neural=self._build_axis_explainability(
                axis_key="neural",
                score_value=accumulated_fatigue.neural,
                included_sessions=included_sessions,
            ),
            metabolic=self._build_axis_explainability(
                axis_key="metabolic",
                score_value=accumulated_fatigue.metabolic,
                included_sessions=included_sessions,
            ),
            mechanical=self._build_axis_explainability(
                axis_key="mechanical",
                score_value=accumulated_fatigue.mechanical,
                included_sessions=included_sessions,
            ),
            recruitment=self._build_axis_explainability(
                axis_key="recruitment",
                score_value=accumulated_fatigue.recruitment,
                included_sessions=included_sessions,
            ),
            combined=self._build_combined_explainability(
                score_value=combined_score.value,
                combined_score=combined_score,
                included_sessions=included_sessions,
            ),
        )

    def _build_axis_explainability(
        self,
        *,
        axis_key: str,
        score_value: float,
        included_sessions: list[SessionFatigueInput],
    ) -> ScoreExplainability:
        contributors = self._top_contributors(
            included_sessions=included_sessions,
            magnitude_getter=lambda session: getattr(session.fatigue_axes, axis_key),
        )
        threshold_state = self._threshold_state(score_value)
        return ScoreExplainability(
            score_value=round(score_value, 4),
            threshold_state=threshold_state,
            axis_meaning=self._AXIS_MEANINGS[axis_key],
            decision_hint=self._DECISION_HINTS[threshold_state],
            contributors=contributors,
        )

    def _build_combined_explainability(
        self,
        *,
        score_value: float,
        combined_score: CombinedScore,
        included_sessions: list[SessionFatigueInput],
    ) -> ScoreExplainability:
        modifiers = self._WORKOUT_TYPE_MODIFIERS[combined_score.debug.workout_type]
        effective_weights = self._renormalized_effective_weights(modifiers)
        neural_gate_factor = combined_score.debug.neural_gate_factor
        capacity_gate_factor = combined_score.debug.capacity_gate_factor
        contributors = self._top_contributors(
            included_sessions=included_sessions,
            magnitude_getter=lambda session: self._combined_session_contribution(
                session=session,
                effective_weights=effective_weights,
                neural_gate_factor=neural_gate_factor,
                capacity_gate_factor=capacity_gate_factor,
            ),
        )
        threshold_state = self._threshold_state(score_value)
        return ScoreExplainability(
            score_value=round(score_value, 4),
            threshold_state=threshold_state,
            axis_meaning=self._AXIS_MEANINGS["combined"],
            decision_hint=self._DECISION_HINTS[threshold_state],
            contributors=contributors,
        )

    def _top_contributors(
        self,
        *,
        included_sessions: list[SessionFatigueInput],
        magnitude_getter,
    ) -> list[ExplainabilityContributor]:
        ranked_candidates: list[tuple[SessionFatigueInput, float]] = []
        for session in included_sessions:
            magnitude = round(max(0.0, float(magnitude_getter(session))), 4)
            if magnitude <= 0:
                continue
            ranked_candidates.append((session, magnitude))

        ranked_candidates.sort(key=lambda item: (-item[1], item[0].session_id))
        top_candidates = ranked_candidates[:3]
        if not top_candidates:
            return []

        top_total = round(sum(item[1] for item in top_candidates), 4)
        shares: list[float] = []
        remaining_share = 1.0
        for index, (_, magnitude) in enumerate(top_candidates):
            if index == len(top_candidates) - 1:
                share = max(0.0, round(remaining_share, 4))
            elif top_total == 0:
                share = 0.0
            else:
                share = round(magnitude / top_total, 4)
                remaining_share = round(remaining_share - share, 4)
            shares.append(share)

        contributors: list[ExplainabilityContributor] = []
        for (session, magnitude), share in zip(top_candidates, shares, strict=True):
            contributors.append(
                ExplainabilityContributor(
                    session_id=session.session_id,
                    label=session.session_label or session.session_id,
                    href=session.session_href or f"/calendar?sessionId={quote(session.session_id)}",
                    contribution_magnitude=round(magnitude, 4),
                    contribution_share=round(share, 4),
                )
            )
        return contributors

    @staticmethod
    def _combined_session_contribution(
        *,
        session: SessionFatigueInput,
        effective_weights: dict[str, float],
        neural_gate_factor: float,
        capacity_gate_factor: float,
    ) -> float:
        base_weighted = round(
            (
                session.fatigue_axes.metabolic * effective_weights["metabolic"]
                + session.fatigue_axes.mechanical * effective_weights["mechanical"]
                + session.fatigue_axes.recruitment * effective_weights["recruitment"]
            ),
            4,
        )
        neural_gated = round(base_weighted * neural_gate_factor, 4)
        return round(neural_gated * capacity_gate_factor, 4)

    @staticmethod
    def _threshold_state(value: float) -> ScoreThresholdState:
        if value >= 7:
            return "high"
        if value >= 4:
            return "moderate"
        return "low"
