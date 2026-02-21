# Backend Bootstrap Architecture

`SPRT-12` establishes a centralized backend bootstrap path so app wiring is explicit, testable, and consistent across local/CI runs.

## Core Modules

- App factory: `backend/src/sportolo/app_factory.py`
- Runtime settings + feature flags: `backend/src/sportolo/config.py`
- Router registration: `backend/src/sportolo/api/router_registry.py`
- Exception handler registration: `backend/src/sportolo/api/error_handlers.py`
- Route dependency providers: `backend/src/sportolo/api/dependencies.py`
- Shared API primitives: `backend/src/sportolo/api/schemas/common.py`
- Smoke endpoint: `backend/src/sportolo/api/routes/system.py`

`backend/src/sportolo/main.py` remains the stable import entrypoint (`from sportolo.main import app`) and now delegates construction to `create_app()`.

## Dependency Injection Boundaries

Route handlers use `Depends(...)` with provider functions from `api/dependencies.py` rather than module-local singleton construction.

This enables deterministic test overrides:

- FastAPI `app.dependency_overrides[...]` can replace service providers per test.
- Existing route contracts stay unchanged while wiring is explicit.

## Shared API Models

`api/schemas/common.py` now defines:

- `ValidationError`: centralized 422 schema used by route metadata.
- `ApiEnvelope[T]` and `ApiMeta`: reusable response envelope primitives.

The smoke endpoint (`GET /v1/system/smoke`) returns an envelope payload so bootstrap wiring can be verified quickly.

## Runtime Configuration

`config.py` centralizes environment-driven runtime settings:

- `SPORTOLO_APP_NAME` (default: `Sportolo API`)
- `SPORTOLO_APP_VERSION` (default: `0.1.0`)
- `SPORTOLO_ENV` (default: `development`)
- `SPORTOLO_FEATURE_WAHOO_ENABLED` (default: `true`)

Settings are cached for runtime efficiency and can be reset in tests via `clear_settings_cache()`.
