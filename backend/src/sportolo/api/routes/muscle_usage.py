from typing import Annotated

from fastapi import APIRouter, Depends, Path

from sportolo.api.dependencies import get_muscle_usage_service
from sportolo.api.schemas.common import ValidationError
from sportolo.api.schemas.muscle_usage import (
    MicrocycleUsageRequest,
    MicrocycleUsageResponse,
)
from sportolo.services.muscle_usage_service import MuscleUsageService

router = APIRouter(tags=["Analytics"])


@router.post(
    "/v1/athletes/{athleteId}/muscle-usage/aggregate",
    response_model=MicrocycleUsageResponse,
    operation_id="aggregateMuscleUsage",
    responses={422: {"model": ValidationError}},
)
async def aggregate_muscle_usage(
    request: MicrocycleUsageRequest,
    service: Annotated[MuscleUsageService, Depends(get_muscle_usage_service)],
    athlete_id: str = Path(alias="athleteId"),
) -> MicrocycleUsageResponse:
    del athlete_id
    return service.aggregate_microcycle(request)
