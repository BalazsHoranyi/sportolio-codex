from __future__ import annotations

from fastapi.testclient import TestClient

from sportolo.main import app


def test_list_exercises_contract_response_shape_and_non_productized_canonical_names() -> None:
    client = TestClient(app)

    response = client.get("/v1/exercises", params={"pageSize": 100})
    split_squat_response = client.get("/v1/exercises", params={"search": "split squat"})
    good_morning_response = client.get("/v1/exercises", params={"search": "good morning"})
    legacy_name_response = client.get("/v1/exercises", params={"search": "barbell split squat"})

    assert response.status_code == 200
    assert split_squat_response.status_code == 200
    assert good_morning_response.status_code == 200
    assert legacy_name_response.status_code == 200
    body = response.json()
    assert set(body) == {"items", "pagination"}
    assert isinstance(body["items"], list)
    assert body["pagination"]["page"] == 1
    assert body["pagination"]["pageSize"] == 100

    split_body = split_squat_response.json()
    good_morning_body = good_morning_response.json()
    legacy_body = legacy_name_response.json()
    assert split_body["items"]
    assert good_morning_body["items"]
    assert legacy_body["items"]
    assert split_body["items"][0]["canonicalName"] == "Split Squat"
    assert good_morning_body["items"][0]["canonicalName"] == "Good Morning"
    assert legacy_body["items"][0]["canonicalName"] == "Split Squat"


def test_list_exercises_contract_returns_required_seed_metadata_fields() -> None:
    client = TestClient(app)

    response = client.get("/v1/exercises", params={"scope": "global", "pageSize": 1})

    assert response.status_code == 200
    body = response.json()
    assert body["items"]
    first_item = body["items"][0]

    assert "movementPattern" in first_item
    assert "primaryMuscles" in first_item
    assert "secondaryMuscles" in first_item
    assert isinstance(first_item["movementPattern"], str)
    assert isinstance(first_item["primaryMuscles"], list)
    assert first_item["primaryMuscles"]
    assert isinstance(first_item["secondaryMuscles"], list)
    assert first_item["secondaryMuscles"]


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
                "movementPattern": "general_strength",
                "primaryMuscles": ["core", "obliques"],
                "secondaryMuscles": ["obliques"],
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


def test_list_exercises_supports_backfilled_alias_discoverability() -> None:
    client = TestClient(app)

    rfess_response = client.get("/v1/exercises", params={"search": "rfess"})
    military_press_response = client.get("/v1/exercises", params={"search": "military press"})

    assert rfess_response.status_code == 200
    assert military_press_response.status_code == 200

    rfess_body = rfess_response.json()
    military_press_body = military_press_response.json()

    assert rfess_body["items"]
    assert rfess_body["items"][0]["canonicalName"] == "Split Squat"
    assert military_press_body["items"]
    assert military_press_body["items"][0]["canonicalName"] == "Shoulder Press"


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
