from typing import Annotated

from fastapi import APIRouter, Depends, Path

from sportolo.api.dependencies import get_axis_scoring_service
from sportolo.api.schemas.axis_scoring import AxisSeriesRequest, AxisSeriesResponse
from sportolo.api.schemas.common import ValidationError
from sportolo.services.axis_scoring_service import AxisScoringService

router = APIRouter(tags=["Fatigue"])


@router.post(
    "/v1/athletes/{athleteId}/fatigue/axis-series",
    response_model=AxisSeriesResponse,
    operation_id="computeAxisSeries",
    responses={422: {"model": ValidationError}},
)
async def compute_axis_series(
    request: AxisSeriesRequest,
    service: Annotated[AxisScoringService, Depends(get_axis_scoring_service)],
    athlete_id: str = Path(alias="athleteId"),
) -> AxisSeriesResponse:
    del athlete_id
    return service.compute_axis_series(request)
