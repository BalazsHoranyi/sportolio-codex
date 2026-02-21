from __future__ import annotations

from fastapi import APIRouter, Path

from sportolo.api.schemas.exercise_zone_mapping import (
    AxisEffectMappingRequest,
    AxisEffectMappingResponse,
)
from sportolo.api.schemas.muscle_usage import ValidationError
from sportolo.services.exercise_zone_mapping_service import ExerciseZoneMappingService

router = APIRouter(tags=["Scoring"])
service = ExerciseZoneMappingService()


@router.post(
    "/v1/athletes/{athleteId}/axis-effects/map",
    response_model=AxisEffectMappingResponse,
    operation_id="mapExerciseZoneAxisEffects",
    responses={422: {"model": ValidationError}},
)
async def map_exercise_zone_axis_effects(
    request: AxisEffectMappingRequest,
    athlete_id: str = Path(alias="athleteId"),
) -> AxisEffectMappingResponse:
    return service.map_axis_effects(athlete_id=athlete_id, request=request)
