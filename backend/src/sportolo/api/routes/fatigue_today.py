from typing import Annotated

from fastapi import APIRouter, Depends, Path

from sportolo.api.dependencies import get_today_accumulation_service
from sportolo.api.schemas.common import ValidationError
from sportolo.api.schemas.fatigue_today import TodayAccumulationRequest, TodayAccumulationResponse
from sportolo.services.today_accumulation_service import TodayAccumulationService

router = APIRouter(tags=["Fatigue"])


@router.post(
    "/v1/athletes/{athleteId}/fatigue/today/accumulation",
    response_model=TodayAccumulationResponse,
    operation_id="computeTodayAccumulation",
    responses={422: {"model": ValidationError}},
)
async def compute_today_accumulation(
    request: TodayAccumulationRequest,
    service: Annotated[TodayAccumulationService, Depends(get_today_accumulation_service)],
    athlete_id: str = Path(alias="athleteId"),
) -> TodayAccumulationResponse:
    del athlete_id
    return service.compute_today_accumulation(request)
