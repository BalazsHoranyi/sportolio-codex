from fastapi import APIRouter, Path

from sportolo.api.schemas.muscle_usage import ValidationError
from sportolo.api.schemas.wahoo_integration import (
    WahooExecutionHistorySyncRequest,
    WahooExecutionHistorySyncResponse,
    WahooWorkoutPushRequest,
    WahooWorkoutPushResponse,
)
from sportolo.services.wahoo_integration_service import WahooIntegrationService

router = APIRouter(tags=["Integrations"])
service = WahooIntegrationService()


@router.post(
    "/v1/athletes/{athleteId}/integrations/wahoo/workouts/push",
    response_model=WahooWorkoutPushResponse,
    operation_id="pushWahooWorkout",
    responses={422: {"model": ValidationError}},
)
async def push_wahoo_workout(
    request: WahooWorkoutPushRequest,
    athlete_id: str = Path(alias="athleteId"),
) -> WahooWorkoutPushResponse:
    return service.push_workout(athlete_id=athlete_id, request=request)


@router.post(
    "/v1/athletes/{athleteId}/integrations/wahoo/execution-history/sync",
    response_model=WahooExecutionHistorySyncResponse,
    operation_id="syncWahooExecutionHistory",
    responses={422: {"model": ValidationError}},
)
async def sync_wahoo_execution_history(
    request: WahooExecutionHistorySyncRequest,
    athlete_id: str = Path(alias="athleteId"),
) -> WahooExecutionHistorySyncResponse:
    return service.sync_execution_history(athlete_id=athlete_id, request=request)
