from fastapi import APIRouter, HTTPException

from sportolo.api.schemas.muscle_usage import MicrocycleUsageRequest, MicrocycleUsageResponse
from sportolo.services.muscle_usage_service import MuscleUsageService

router = APIRouter(tags=["muscle-usage"])
service = MuscleUsageService()


@router.post(
    "/v1/athletes/{athlete_id}/muscle-usage/aggregate",
    response_model=MicrocycleUsageResponse,
)
async def aggregate_muscle_usage(
    athlete_id: str,
    request: MicrocycleUsageRequest,
) -> MicrocycleUsageResponse:
    del athlete_id
    try:
        return service.aggregate_microcycle(request)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
