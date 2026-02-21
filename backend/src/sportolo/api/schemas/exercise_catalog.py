from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


def _to_camel(value: str) -> str:
    parts = value.split("_")
    return parts[0] + "".join(part.capitalize() for part in parts[1:])


class CamelModel(BaseModel):
    model_config = ConfigDict(populate_by_name=True, alias_generator=_to_camel)


class ExerciseCatalogItem(CamelModel):
    id: str
    scope: Literal["global", "user"]
    canonical_name: str
    aliases: list[str] = Field(default_factory=list)
    region_tags: list[str] = Field(default_factory=list)
    equipment_options: list[str] = Field(default_factory=list)
    owner_user_id: str | None = None
    match_metadata: ExerciseCatalogMatchMetadata | None = None


class ExerciseCatalogMatchHighlight(CamelModel):
    field: Literal["canonical", "alias"]
    value: str
    start: int = Field(ge=0)
    end: int = Field(ge=0)


class ExerciseCatalogMatchMetadata(CamelModel):
    strategy: Literal[
        "canonical_exact",
        "canonical_prefix",
        "canonical_substring",
        "alias_exact",
        "alias_prefix",
        "alias_substring",
        "fuzzy_canonical",
        "fuzzy_alias",
    ]
    score: int = Field(ge=0)
    highlight: ExerciseCatalogMatchHighlight | None = None


class ExerciseCatalogPagination(CamelModel):
    page: int = Field(ge=1)
    page_size: int = Field(ge=1)
    total_items: int = Field(ge=0)
    total_pages: int = Field(ge=0)


class ExerciseCatalogListResponse(CamelModel):
    items: list[ExerciseCatalogItem]
    pagination: ExerciseCatalogPagination
