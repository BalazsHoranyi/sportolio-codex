from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from sportolo.api.routes.axis_scoring import router as axis_scoring_router
from sportolo.api.routes.exercise_zone_mapping import router as exercise_zone_mapping_router
from sportolo.api.routes.exercises import router as exercises_router
from sportolo.api.routes.fatigue_today import router as fatigue_today_router
from sportolo.api.routes.goals import router as goals_router
from sportolo.api.routes.muscle_usage import router as muscle_usage_router
from sportolo.api.routes.wahoo_integration import router as wahoo_integration_router

app = FastAPI(title="Sportolo API", version="0.1.0")
app.include_router(exercises_router)
app.include_router(exercise_zone_mapping_router)
app.include_router(muscle_usage_router)
app.include_router(fatigue_today_router)
app.include_router(axis_scoring_router)
app.include_router(goals_router)
app.include_router(wahoo_integration_router)


def _validation_error_payload(message: str) -> dict[str, str]:
    return {
        "code": "DSL_VALIDATION_ERROR",
        "message": message,
        "phase": "validate",
    }


@app.exception_handler(RequestValidationError)
async def handle_request_validation_error(  # noqa: RUF029
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    del request
    errors = exc.errors()
    message = "Validation failed"
    if errors:
        first_error = errors[0]
        message = str(first_error.get("msg", message))
    return JSONResponse(status_code=422, content=_validation_error_payload(message))


@app.exception_handler(ValueError)
async def handle_domain_validation_error(  # noqa: RUF029
    request: Request, exc: ValueError
) -> JSONResponse:
    del request
    return JSONResponse(status_code=422, content=_validation_error_payload(str(exc)))
