from fastapi import APIRouter, Path

from sportolo.api.schemas.fatigue_today import TodayAccumulationRequest, TodayAccumulationResponse
from sportolo.api.schemas.muscle_usage import ValidationError
from sportolo.services.today_accumulation_service import TodayAccumulationService

router = APIRouter(tags=["Fatigue"])
service = TodayAccumulationService()


@router.post(
    "/v1/athletes/{athleteId}/fatigue/today/accumulation",
    response_model=TodayAccumulationResponse,
    operation_id="computeTodayAccumulation",
    responses={422: {"model": ValidationError}},
)
async def compute_today_accumulation(
    request: TodayAccumulationRequest,
    athlete_id: str = Path(alias="athleteId"),
) -> TodayAccumulationResponse:
    del athlete_id
    return service.compute_today_accumulation(request)
