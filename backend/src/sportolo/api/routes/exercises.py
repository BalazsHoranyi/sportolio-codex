from __future__ import annotations

from typing import Literal

from fastapi import APIRouter, Query

from sportolo.api.schemas.exercise_catalog import ExerciseCatalogItem, ExerciseCatalogListResponse
from sportolo.api.schemas.muscle_usage import ValidationError
from sportolo.services.exercise_catalog_service import ExerciseCatalogService

router = APIRouter(tags=["Catalog"])
service = ExerciseCatalogService()


@router.get(
    "/v1/exercises",
    response_model=ExerciseCatalogListResponse,
    operation_id="listExercises",
    responses={422: {"model": ValidationError}},
)
async def list_exercises(
    scope: Literal["global", "user", "all"] = Query(default="all"),
    search: str | None = Query(default=None),
    equipment: str | None = Query(default=None),
    muscle: str | None = Query(default=None),
) -> ExerciseCatalogListResponse:
    entries = service.list_exercises(
        scope=scope,
        search=search,
        equipment=equipment,
        muscle=muscle,
    )
    return ExerciseCatalogListResponse(
        items=[
            ExerciseCatalogItem(
                id=entry.id,
                scope=entry.scope,
                canonical_name=entry.canonical_name,
                aliases=list(entry.aliases),
                region_tags=list(entry.region_tags),
                owner_user_id=entry.owner_user_id,
            )
            for entry in entries
        ]
    )
