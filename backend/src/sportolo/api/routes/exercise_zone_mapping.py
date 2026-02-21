from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Path

from sportolo.api.dependencies import get_exercise_zone_mapping_service
from sportolo.api.schemas.common import ValidationError
from sportolo.api.schemas.exercise_zone_mapping import (
    AxisEffectMappingRequest,
    AxisEffectMappingResponse,
)
from sportolo.services.exercise_zone_mapping_service import ExerciseZoneMappingService

router = APIRouter(tags=["Scoring"])


@router.post(
    "/v1/athletes/{athleteId}/axis-effects/map",
    response_model=AxisEffectMappingResponse,
    operation_id="mapExerciseZoneAxisEffects",
    responses={422: {"model": ValidationError}},
)
async def map_exercise_zone_axis_effects(
    request: AxisEffectMappingRequest,
    service: Annotated[ExerciseZoneMappingService, Depends(get_exercise_zone_mapping_service)],
    athlete_id: str = Path(alias="athleteId"),
) -> AxisEffectMappingResponse:
    return service.map_axis_effects(athlete_id=athlete_id, request=request)
