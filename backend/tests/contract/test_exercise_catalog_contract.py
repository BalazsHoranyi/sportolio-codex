from __future__ import annotations

from fastapi.testclient import TestClient

from sportolo.main import app


def test_list_exercises_contract_response_shape_and_non_productized_canonical_names() -> None:
    client = TestClient(app)

    response = client.get("/v1/exercises")

    assert response.status_code == 200
    body = response.json()
    assert set(body) == {"items", "pagination"}
    assert isinstance(body["items"], list)
    assert body["pagination"]["page"] == 1
    assert body["pagination"]["pageSize"] == 25

    names = {item["canonicalName"] for item in body["items"]}
    assert "Split Squat" in names
    assert "Good Morning" in names
    assert "Barbell Split Squat" not in names


def test_list_exercises_is_deterministic_for_identical_queries() -> None:
    client = TestClient(app)

    first = client.get("/v1/exercises", params={"search": "split squat", "equipment": "barbell"})
    second = client.get("/v1/exercises", params={"search": "split squat", "equipment": "barbell"})

    assert first.status_code == 200
    assert second.status_code == 200
    assert first.json() == second.json()


def test_list_exercises_supports_filter_intersection() -> None:
    client = TestClient(app)

    response = client.get(
        "/v1/exercises",
        params={"search": "press", "equipment": "cable", "muscle": "core"},
    )

    assert response.status_code == 200
    assert response.json() == {
        "items": [
            {
                "id": "global-pallof-press",
                "scope": "global",
                "canonicalName": "Pallof Press",
                "aliases": [
                    "Band Pallof Press",
                    "Cable Pallof Press",
                    "CBL Pallof Press",
                ],
                "regionTags": ["core", "obliques"],
                "equipmentOptions": ["cable", "band"],
                "ownerUserId": None,
                "matchMetadata": {
                    "strategy": "canonical_substring",
                    "score": 2,
                    "highlight": {
                        "field": "canonical",
                        "value": "Pallof Press",
                        "start": 7,
                        "end": 12,
                    },
                },
            }
        ],
        "pagination": {
            "page": 1,
            "pageSize": 25,
            "totalItems": 1,
            "totalPages": 1,
        },
    }


def test_list_exercises_supports_typo_tolerant_search() -> None:
    client = TestClient(app)

    response = client.get("/v1/exercises", params={"search": "splt sqaut"})

    assert response.status_code == 200
    body = response.json()
    assert body["items"]
    assert body["items"][0]["canonicalName"] == "Split Squat"


def test_list_exercises_openapi_metadata_matches_contract() -> None:
    operation = app.openapi()["paths"]["/v1/exercises"]["get"]

    assert operation["operationId"] == "listExercises"
    assert operation["tags"] == ["Catalog"]
    parameter_names = {parameter["name"] for parameter in operation["parameters"]}
    assert {"scope", "search", "equipment", "muscle", "page", "pageSize"} <= parameter_names


def test_list_exercises_returns_pagination_envelope_and_match_metadata() -> None:
    client = TestClient(app)

    response = client.get(
        "/v1/exercises",
        params={"search": "cable pallof press", "page": 1, "pageSize": 2},
    )

    assert response.status_code == 200
    body = response.json()
    assert set(body) == {"items", "pagination"}
    assert body["pagination"] == {
        "page": 1,
        "pageSize": 2,
        "totalItems": 1,
        "totalPages": 1,
    }
    assert body["items"]
    assert body["items"][0]["matchMetadata"] == {
        "strategy": "alias_exact",
        "score": 3,
        "highlight": {
            "field": "alias",
            "value": "Cable Pallof Press",
            "start": 0,
            "end": 18,
        },
    }


def test_list_exercises_pagination_is_deterministic_for_identical_queries() -> None:
    client = TestClient(app)

    first = client.get("/v1/exercises", params={"search": "press", "page": 1, "pageSize": 1})
    second = client.get("/v1/exercises", params={"search": "press", "page": 1, "pageSize": 1})

    assert first.status_code == 200
    assert second.status_code == 200
    assert first.json() == second.json()
