from typing import Annotated

from fastapi import APIRouter, Depends, Path

from sportolo.api.dependencies import get_wahoo_control_service, get_wahoo_integration_service
from sportolo.api.schemas.common import ValidationError
from sportolo.api.schemas.wahoo_integration import (
    WahooExecutionHistorySyncRequest,
    WahooExecutionHistorySyncResponse,
    WahooTrainerControlRequest,
    WahooTrainerControlResponse,
    WahooWorkoutPushRequest,
    WahooWorkoutPushResponse,
)
from sportolo.services.wahoo_control_service import WahooControlService
from sportolo.services.wahoo_integration_service import WahooIntegrationService

router = APIRouter(tags=["Integrations"])
service = get_wahoo_integration_service()
control_service = get_wahoo_control_service()


@router.post(
    "/v1/athletes/{athleteId}/integrations/wahoo/workouts/push",
    response_model=WahooWorkoutPushResponse,
    operation_id="pushWahooWorkout",
    responses={422: {"model": ValidationError}},
)
async def push_wahoo_workout(
    request: WahooWorkoutPushRequest,
    service: Annotated[WahooIntegrationService, Depends(get_wahoo_integration_service)],
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
    service: Annotated[WahooIntegrationService, Depends(get_wahoo_integration_service)],
    athlete_id: str = Path(alias="athleteId"),
) -> WahooExecutionHistorySyncResponse:
    return service.sync_execution_history(athlete_id=athlete_id, request=request)


@router.post(
    "/v1/athletes/{athleteId}/integrations/wahoo/trainers/control",
    response_model=WahooTrainerControlResponse,
    operation_id="controlWahooTrainer",
    responses={422: {"model": ValidationError}},
)
async def control_wahoo_trainer(
    request: WahooTrainerControlRequest,
    control_service: Annotated[WahooControlService, Depends(get_wahoo_control_service)],
    athlete_id: str = Path(alias="athleteId"),
) -> WahooTrainerControlResponse:
    return control_service.send_control_command(athlete_id=athlete_id, request=request)
