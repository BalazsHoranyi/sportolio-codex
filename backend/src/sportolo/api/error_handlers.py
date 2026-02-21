from __future__ import annotations

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse


def _validation_error_payload(message: str) -> dict[str, str]:
    return {
        "code": "DSL_VALIDATION_ERROR",
        "message": message,
        "phase": "validate",
    }


def register_exception_handlers(app: FastAPI) -> None:
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
