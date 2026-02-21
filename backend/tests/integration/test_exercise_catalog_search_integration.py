from __future__ import annotations

import math
import time

from fastapi.testclient import TestClient

from sportolo.main import app

ROUTINE_BUILDER_P95_BUDGET_SECONDS = 2.0


def _p95(durations: list[float]) -> float:
    ordered = sorted(durations)
    index = max(0, math.ceil(len(ordered) * 0.95) - 1)
    return ordered[index]


def test_fuzzy_search_and_combined_filters_resolve_expected_canonical_match() -> None:
    client = TestClient(app)

    response = client.get(
        "/v1/exercises",
        params={"search": "splt sqaut", "equipment": "barbell", "muscle": "quads"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["pagination"] == {
        "page": 1,
        "pageSize": 25,
        "totalItems": 1,
        "totalPages": 1,
    }
    assert len(body["items"]) == 1

    item = body["items"][0]
    assert item["id"] == "global-split-squat"
    assert item["scope"] == "global"
    assert item["canonicalName"] == "Split Squat"
    assert {"barbell", "dumbbell", "kettlebell", "landmine"} <= set(item["equipmentOptions"])
    assert {"quads", "glutes", "hamstrings"} <= set(item["regionTags"])
    assert "Barbell Split Squat" in item["aliases"]
    assert item["matchMetadata"] == {
        "strategy": "fuzzy_canonical",
        "score": 9,
        "highlight": {
            "field": "canonical",
            "value": "Split Squat",
            "start": 0,
            "end": 11,
        },
    }


def test_fuzzy_alias_search_supports_filter_intersection() -> None:
    client = TestClient(app)

    response = client.get(
        "/v1/exercises",
        params={"search": "cabl palof pres", "equipment": "cable", "muscle": "core"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["pagination"] == {
        "page": 1,
        "pageSize": 25,
        "totalItems": 1,
        "totalPages": 1,
    }
    assert body["items"][0]["canonicalName"] == "Pallof Press"
    assert body["items"][0]["matchMetadata"]["strategy"] == "fuzzy_alias"


def test_search_latency_p95_stays_within_routine_builder_budget() -> None:
    client = TestClient(app)
    query_params = {
        "search": "cabl palof pres",
        "equipment": "cable",
        "muscle": "core",
        "page": 1,
        "pageSize": 10,
    }

    for _ in range(5):
        warmup = client.get("/v1/exercises", params=query_params)
        assert warmup.status_code == 200

    durations: list[float] = []
    for _ in range(60):
        started = time.perf_counter()
        response = client.get("/v1/exercises", params=query_params)
        durations.append(time.perf_counter() - started)
        assert response.status_code == 200

    assert _p95(durations) <= ROUTINE_BUILDER_P95_BUDGET_SECONDS
