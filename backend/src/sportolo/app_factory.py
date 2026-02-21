from __future__ import annotations

from fastapi import FastAPI

from sportolo.api.error_handlers import register_exception_handlers
from sportolo.api.router_registry import register_routers
from sportolo.config import Settings, get_settings


def create_app(settings: Settings | None = None) -> FastAPI:
    resolved_settings = settings or get_settings()
    app = FastAPI(
        title=resolved_settings.app_name,
        version=resolved_settings.app_version,
    )
    register_exception_handlers(app)
    register_routers(app, settings=resolved_settings)
    return app
