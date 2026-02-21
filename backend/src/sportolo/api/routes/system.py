from __future__ import annotations

from datetime import UTC, datetime
from typing import Annotated

from fastapi import APIRouter, Depends

from sportolo.api.schemas.common import ApiEnvelope, ApiMeta, CamelModel
from sportolo.config import Settings, get_settings

router = APIRouter(tags=["System"])


class SmokePayload(CamelModel):
    name: str
    version: str
    environment: str
    feature_flags: dict[str, bool]


@router.get(
    "/v1/system/smoke",
    response_model=ApiEnvelope[SmokePayload],
    operation_id="systemSmoke",
)
async def smoke(
    settings: Annotated[Settings, Depends(get_settings)],
) -> ApiEnvelope[SmokePayload]:
    return ApiEnvelope(
        data=SmokePayload(
            name=settings.app_name,
            version=settings.app_version,
            environment=settings.environment,
            feature_flags={
                "wahooIntegration": settings.feature_flags.wahoo_integration,
            },
        ),
        meta=ApiMeta(status="ok", timestamp=datetime.now(UTC)),
    )
