from __future__ import annotations

from fastapi.testclient import TestClient

from sportolo.main import app


def test_list_exercises_contract_response_shape_and_non_productized_canonical_names() -> None:
    client = TestClient(app)

    response = client.get("/v1/exercises")

    assert response.status_code == 200
    body = response.json()
    assert set(body) == {"items"}
    assert isinstance(body["items"], list)

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
            }
        ]
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
