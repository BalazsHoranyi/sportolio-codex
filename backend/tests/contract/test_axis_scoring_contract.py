from __future__ import annotations

from copy import deepcopy

from fastapi.testclient import TestClient

from sportolo.main import app

ENDPOINT = "/v1/athletes/athlete-1/fatigue/axis-series"


def _payload() -> dict[str, object]:
    return {
        "asOf": "2026-02-20T23:00:00Z",
        "timezone": "America/New_York",
        "lookbackDays": 4,
        "sleepEvents": [{"sleepEndedAt": "2026-02-19T11:00:00Z"}],
        "sessions": [
            {
                "sessionId": "completed-day-1",
                "state": "completed",
                "endedAt": "2026-02-17T15:00:00Z",
                "rawLoad": {
                    "neural": 25,
                    "metabolic": 20,
                    "mechanical": 18,
                },
            },
            {
                "sessionId": "completed-day-2",
                "state": "completed",
                "endedAt": "2026-02-18T14:00:00Z",
                "rawLoad": {
                    "neural": 10,
                    "metabolic": 22,
                    "mechanical": 12,
                },
            },
            {
                "sessionId": "planned-not-included",
                "state": "planned",
                "endedAt": "2026-02-18T18:00:00Z",
                "rawLoad": {
                    "neural": 99,
                    "metabolic": 99,
                    "mechanical": 99,
                },
            },
        ],
    }


def test_axis_scoring_contract_response_shape_and_invariants() -> None:
    client = TestClient(app)

    response = client.post(ENDPOINT, json=_payload())

    assert response.status_code == 200
    body = response.json()
    assert body["policyVersion"] == "v1-axis-decay"
    assert body["timezone"] == "America/New_York"
    assert body["lookbackDays"] == 4
    assert len(body["dailySeries"]) == 4
    assert len(body["sessionSpikes"]) == 2

    for spike in body["sessionSpikes"]:
        assert 1.0 <= spike["neural"] <= 10.0
        assert 1.0 <= spike["metabolic"] <= 10.0
        assert 1.0 <= spike["mechanical"] <= 10.0
        assert spike["recruitment"] == max(spike["neural"], spike["mechanical"])

    for day in body["dailySeries"]:
        assert 1.0 <= day["neural"] <= 10.0
        assert 1.0 <= day["metabolic"] <= 10.0
        assert 1.0 <= day["mechanical"] <= 10.0
        assert day["recruitment"] == max(day["neural"], day["mechanical"])


def test_axis_scoring_contract_is_deterministic_for_identical_payloads() -> None:
    client = TestClient(app)
    payload = _payload()

    first = client.post(ENDPOINT, json=payload)
    second = client.post(ENDPOINT, json=deepcopy(payload))

    assert first.status_code == 200
    assert second.status_code == 200
    assert first.json() == second.json()


def test_axis_scoring_contract_rejects_invalid_timezone() -> None:
    client = TestClient(app)
    payload = _payload()
    payload["timezone"] = "Mars/Base-One"

    response = client.post(ENDPOINT, json=payload)

    assert response.status_code == 422
    assert response.json()["code"] == "DSL_VALIDATION_ERROR"
    assert "timezone" in response.json()["message"].lower()


def test_axis_scoring_contract_rejects_invalid_lookback_range() -> None:
    client = TestClient(app)
    payload = _payload()
    payload["lookbackDays"] = 0

    response = client.post(ENDPOINT, json=payload)

    assert response.status_code == 422
    assert response.json()["code"] == "DSL_VALIDATION_ERROR"
    assert "greater than or equal to 1" in response.json()["message"].lower()


def test_axis_scoring_openapi_metadata_matches_contract() -> None:
    operation = app.openapi()["paths"]["/v1/athletes/{athleteId}/fatigue/axis-series"]["post"]

    assert operation["operationId"] == "computeAxisSeries"
    assert operation["tags"] == ["Fatigue"]
    assert operation["responses"]["422"]["content"]["application/json"]["schema"] == {
        "$ref": "#/components/schemas/ValidationError"
    }
