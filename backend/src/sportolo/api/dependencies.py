from __future__ import annotations

from sportolo.services.axis_scoring_service import AxisScoringService
from sportolo.services.exercise_catalog_service import ExerciseCatalogService
from sportolo.services.exercise_zone_mapping_service import ExerciseZoneMappingService
from sportolo.services.goal_priority_service import GoalPriorityService
from sportolo.services.muscle_usage_service import MuscleUsageService
from sportolo.services.today_accumulation_service import TodayAccumulationService
from sportolo.services.wahoo_control_service import WahooControlService
from sportolo.services.wahoo_integration_service import WahooIntegrationService

_exercise_catalog_service = ExerciseCatalogService()
_exercise_zone_mapping_service = ExerciseZoneMappingService()
_muscle_usage_service = MuscleUsageService()
_today_accumulation_service = TodayAccumulationService()
_axis_scoring_service = AxisScoringService()
_goal_priority_service = GoalPriorityService()
_wahoo_integration_service = WahooIntegrationService()
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


def get_wahoo_integration_service() -> WahooIntegrationService:
    return _wahoo_integration_service


def get_wahoo_control_service() -> WahooControlService:
    return _wahoo_control_service
