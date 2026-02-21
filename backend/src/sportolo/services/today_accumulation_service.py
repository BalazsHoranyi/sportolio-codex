from __future__ import annotations

from datetime import UTC, datetime, time, timedelta
from zoneinfo import ZoneInfo

from sportolo.api.schemas.fatigue_today import (
    BoundarySource,
    FatigueAxes,
    RolloverBoundary,
    SessionFatigueInput,
    SleepEventInput,
    TodayAccumulationRequest,
    TodayAccumulationResponse,
)


class TodayAccumulationService:
    """Deterministic completed-only accumulation with sleep-first rollover boundaries."""

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
        included_session_ids: list[str] = []
        excluded_session_ids: list[str] = []

        for session in request.sessions:
            if self._is_included(session, boundary_end_utc):
                included_session_ids.append(session.session_id)
                totals = self._accumulate_axes(totals, session.fatigue_axes)
            else:
                excluded_session_ids.append(session.session_id)

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
            accumulated_fatigue=FatigueAxes(**totals),
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
