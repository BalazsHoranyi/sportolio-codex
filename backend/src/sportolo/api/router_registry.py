from __future__ import annotations

from fastapi import FastAPI

from sportolo.api.routes.axis_scoring import router as axis_scoring_router
from sportolo.api.routes.exercise_zone_mapping import router as exercise_zone_mapping_router
from sportolo.api.routes.exercises import router as exercises_router
from sportolo.api.routes.fatigue_today import router as fatigue_today_router
from sportolo.api.routes.goals import router as goals_router
from sportolo.api.routes.muscle_usage import router as muscle_usage_router
from sportolo.api.routes.system import router as system_router
from sportolo.api.routes.wahoo_integration import router as wahoo_integration_router
from sportolo.config import Settings


def register_routers(app: FastAPI, settings: Settings) -> None:
    app.include_router(system_router)
    app.include_router(exercises_router)
    app.include_router(exercise_zone_mapping_router)
    app.include_router(muscle_usage_router)
    app.include_router(fatigue_today_router)
    app.include_router(axis_scoring_router)
    app.include_router(goals_router)

    if settings.feature_flags.wahoo_integration:
        app.include_router(wahoo_integration_router)
