from fastapi import APIRouter, Path

from sportolo.api.schemas.goal_priority import (
    ActiveGoalSwitchRequest,
    GoalPlanUpsertRequest,
    GoalPriorityPlanResponse,
)
from sportolo.api.schemas.muscle_usage import ValidationError
from sportolo.services.goal_priority_service import GoalPriorityService

router = APIRouter(tags=["Planning"])
service = GoalPriorityService()


@router.put(
    "/v1/athletes/{athleteId}/goals",
    response_model=GoalPriorityPlanResponse,
    operation_id="upsertAthleteGoals",
    responses={422: {"model": ValidationError}},
)
async def upsert_athlete_goals(
    request: GoalPlanUpsertRequest,
    athlete_id: str = Path(alias="athleteId"),
) -> GoalPriorityPlanResponse:
    return service.upsert_goal_plan(athlete_id=athlete_id, request=request)


@router.post(
    "/v1/athletes/{athleteId}/goals/active",
    response_model=GoalPriorityPlanResponse,
    operation_id="switchActiveGoalPriority",
    responses={422: {"model": ValidationError}},
)
async def switch_active_goal_priority(
    request: ActiveGoalSwitchRequest,
    athlete_id: str = Path(alias="athleteId"),
) -> GoalPriorityPlanResponse:
    return service.switch_active_goal(athlete_id=athlete_id, request=request)
