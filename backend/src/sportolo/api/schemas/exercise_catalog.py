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
    owner_user_id: str | None = None


class ExerciseCatalogListResponse(CamelModel):
    items: list[ExerciseCatalogItem]
