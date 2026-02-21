from __future__ import annotations

from sportolo.api.schemas.wahoo_integration import PipelineDispatch
from sportolo.services.axis_scoring_service import AxisScoringService
from sportolo.services.background_job_queue_service import (
    BackgroundJobEnqueueRequest,
    InMemoryBackgroundJobQueue,
)
from sportolo.services.exercise_catalog_service import ExerciseCatalogService
from sportolo.services.exercise_zone_mapping_service import ExerciseZoneMappingService
from sportolo.services.goal_priority_service import GoalPriorityService
from sportolo.services.muscle_usage_service import MuscleUsageService
from sportolo.services.today_accumulation_service import TodayAccumulationService
from sportolo.services.wahoo_control_service import WahooControlService
from sportolo.services.wahoo_integration_service import WahooIntegrationService


class BackgroundJobQueueDispatchSink:
    def __init__(self, queue: InMemoryBackgroundJobQueue) -> None:
        self._queue = queue

    def enqueue(self, athlete_id: str, dispatch: PipelineDispatch) -> None:
        self._queue.enqueue(
            BackgroundJobEnqueueRequest(
                athlete_id=athlete_id,
                pipeline=dispatch.pipeline,
                idempotency_key=(
                    f"{dispatch.pipeline}:"
                    f"{dispatch.external_activity_id}:"
                    f"{dispatch.sequence_number}"
                ),
                correlation_id=dispatch.dispatch_id,
                payload={
                    "externalActivityId": dispatch.external_activity_id,
                    "plannedWorkoutId": dispatch.planned_workout_id,
                    "sequenceNumber": dispatch.sequence_number,
                },
            )
        )

    def reset(self) -> None:
        self._queue.reset_for_testing()


_exercise_catalog_service = ExerciseCatalogService()
_exercise_zone_mapping_service = ExerciseZoneMappingService()
_muscle_usage_service = MuscleUsageService()
_today_accumulation_service = TodayAccumulationService()
_axis_scoring_service = AxisScoringService()
_goal_priority_service = GoalPriorityService()
_background_job_queue = InMemoryBackgroundJobQueue()
_wahoo_dispatch_sink = BackgroundJobQueueDispatchSink(_background_job_queue)
_wahoo_integration_service = WahooIntegrationService(dispatch_sink=_wahoo_dispatch_sink)
_wahoo_control_service = WahooControlService()


def get_exercise_catalog_service() -> ExerciseCatalogService:
    return _exercise_catalog_service


def get_exercise_zone_mapping_service() -> ExerciseZoneMappingService:
    return _exercise_zone_mapping_service


def get_muscle_usage_service() -> MuscleUsageService:
    return _muscle_usage_service


def get_today_accumulation_service() -> TodayAccumulationService:
    return _today_accumulation_service


def get_axis_scoring_service() -> AxisScoringService:
    return _axis_scoring_service


def get_goal_priority_service() -> GoalPriorityService:
    return _goal_priority_service


def get_background_job_queue() -> InMemoryBackgroundJobQueue:
    return _background_job_queue


def get_wahoo_integration_service() -> WahooIntegrationService:
    return _wahoo_integration_service


def get_wahoo_control_service() -> WahooControlService:
    return _wahoo_control_service
