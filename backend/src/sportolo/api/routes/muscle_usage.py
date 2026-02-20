from fastapi import APIRouter, Path

from sportolo.api.schemas.muscle_usage import (
    MicrocycleUsageRequest,
    MicrocycleUsageResponse,
    ValidationErrorResponse,
)
from sportolo.services.muscle_usage_service import MuscleUsageService

router = APIRouter(tags=["Analytics"])
service = MuscleUsageService()


@router.post(
    "/v1/athletes/{athleteId}/muscle-usage/aggregate",
    response_model=MicrocycleUsageResponse,
    operation_id="aggregateMuscleUsage",
    responses={422: {"model": ValidationErrorResponse}},
)
async def aggregate_muscle_usage(
    request: MicrocycleUsageRequest,
    athlete_id: str = Path(alias="athleteId"),
) -> MicrocycleUsageResponse:
    del athlete_id
    return service.aggregate_microcycle(request)
