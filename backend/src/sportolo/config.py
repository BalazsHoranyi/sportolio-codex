from __future__ import annotations

import os
from dataclasses import dataclass
from functools import lru_cache


def _read_bool_env(name: str, *, default: bool) -> bool:
    raw_value = os.getenv(name)
    if raw_value is None:
        return default

    normalized = raw_value.strip().lower()
    if normalized in {"1", "true", "yes", "on"}:
        return True
    if normalized in {"0", "false", "no", "off"}:
        return False
    return default


@dataclass(frozen=True)
class FeatureFlags:
    wahoo_integration: bool


@dataclass(frozen=True)
class Settings:
    app_name: str
    app_version: str
    environment: str
    feature_flags: FeatureFlags


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings(
        app_name=os.getenv("SPORTOLO_APP_NAME", "Sportolo API"),
        app_version=os.getenv("SPORTOLO_APP_VERSION", "0.1.0"),
        environment=os.getenv("SPORTOLO_ENV", "development"),
        feature_flags=FeatureFlags(
            wahoo_integration=_read_bool_env(
                "SPORTOLO_FEATURE_WAHOO_ENABLED",
                default=True,
            )
        ),
    )


def clear_settings_cache() -> None:
    get_settings.cache_clear()
