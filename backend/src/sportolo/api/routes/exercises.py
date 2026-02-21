from __future__ import annotations

from typing import Literal

from fastapi import APIRouter, Query

from sportolo.api.schemas.exercise_catalog import (
    ExerciseCatalogItem,
    ExerciseCatalogListResponse,
    ExerciseCatalogMatchHighlight,
    ExerciseCatalogMatchMetadata,
    ExerciseCatalogPagination,
)
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
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=25, ge=1, le=100, alias="pageSize"),
) -> ExerciseCatalogListResponse:
    result = service.search_exercises(
        scope=scope,
        search=search,
        equipment=equipment,
        muscle=muscle,
        page=page,
        page_size=page_size,
    )
    return ExerciseCatalogListResponse(
        items=[
            ExerciseCatalogItem(
                id=item.entry.id,
                scope=item.entry.scope,
                canonical_name=item.entry.canonical_name,
                aliases=list(item.entry.aliases),
                region_tags=list(item.entry.region_tags),
                movement_pattern=item.entry.movement_pattern,
                primary_muscles=list(item.entry.primary_muscles),
                secondary_muscles=list(item.entry.secondary_muscles),
                equipment_options=list(item.entry.equipment_options),
                owner_user_id=item.entry.owner_user_id,
                match_metadata=(
                    ExerciseCatalogMatchMetadata(
                        strategy=item.match_metadata.strategy,
                        score=item.match_metadata.score,
                        highlight=(
                            ExerciseCatalogMatchHighlight(
                                field=item.match_metadata.highlight.field,
                                value=item.match_metadata.highlight.value,
                                start=item.match_metadata.highlight.start,
                                end=item.match_metadata.highlight.end,
                            )
                            if item.match_metadata.highlight is not None
                            else None
                        ),
                    )
                    if item.match_metadata is not None
                    else None
                ),
            )
            for item in result.items
        ],
        pagination=ExerciseCatalogPagination(
            page=result.page,
            page_size=result.page_size,
            total_items=result.total_items,
            total_pages=result.total_pages,
        ),
    )
