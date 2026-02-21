from __future__ import annotations

from copy import deepcopy

from fastapi.testclient import TestClient

from sportolo.main import app

ENDPOINT = "/v1/athletes/athlete-1/fatigue/today/accumulation"


def _request_payload() -> dict[str, object]:
    return {
        "asOf": "2026-02-20T15:00:00Z",
        "timezone": "America/New_York",
        "sleepEvents": [
            {"sleepEndedAt": "2026-02-20T10:45:00Z"},
            {"sleepEndedAt": "2026-02-20T16:00:00Z"},
        ],
        "sessions": [
            {
                "sessionId": "completed-before-boundary",
                "state": "completed",
                "endedAt": "2026-02-20T10:00:00Z",
                "fatigueAxes": {
                    "neural": 2.0,
                    "metabolic": 2.0,
                    "mechanical": 1.0,
                    "recruitment": 1.0,
                },
            },
            {
                "sessionId": "planned-before-boundary",
                "state": "planned",
                "endedAt": "2026-02-20T09:30:00Z",
                "fatigueAxes": {
                    "neural": 9.0,
                    "metabolic": 9.0,
                    "mechanical": 9.0,
                    "recruitment": 9.0,
                },
            },
            {
                "sessionId": "completed-after-boundary",
                "state": "completed",
                "endedAt": "2026-02-20T11:00:00Z",
                "fatigueAxes": {
                    "neural": 6.0,
                    "metabolic": 6.0,
                    "mechanical": 6.0,
                    "recruitment": 6.0,
                },
            },
        ],
    }


def test_today_accumulation_contract_response_shape_and_completed_only_behavior() -> None:
    client = TestClient(app)

    response = client.post(ENDPOINT, json=_request_payload())

    assert response.status_code == 200
    body = response.json()
    assert body["boundary"] == {
        "boundaryStart": "2026-02-19T00:00:00-05:00",
        "boundaryEnd": "2026-02-20T05:45:00-05:00",
        "boundarySource": "sleep_event",
        "timezone": "America/New_York",
    }
    assert body["includedSessionIds"] == ["completed-before-boundary"]
    assert body["excludedSessionIds"] == [
        "planned-before-boundary",
        "completed-after-boundary",
    ]
    assert body["accumulatedFatigue"] == {
        "neural": 2.0,
        "metabolic": 2.0,
        "mechanical": 1.0,
        "recruitment": 1.0,
    }


def test_today_accumulation_contract_is_deterministic_for_identical_payloads() -> None:
    client = TestClient(app)
    payload = _request_payload()

    first = client.post(ENDPOINT, json=payload)
    second = client.post(ENDPOINT, json=deepcopy(payload))

    assert first.status_code == 200
    assert second.status_code == 200
    assert first.json() == second.json()


def test_today_accumulation_contract_rejects_invalid_timezone() -> None:
    client = TestClient(app)
    payload = _request_payload()
    payload["timezone"] = "Mars/Base-One"  # type: ignore[index]

    response = client.post(ENDPOINT, json=payload)

    assert response.status_code == 422
    assert response.json()["code"] == "DSL_VALIDATION_ERROR"
    assert "timezone" in response.json()["message"].lower()


def test_today_accumulation_openapi_metadata_matches_contract() -> None:
    operation = app.openapi()["paths"]["/v1/athletes/{athleteId}/fatigue/today/accumulation"][
        "post"
    ]

    assert operation["operationId"] == "computeTodayAccumulation"
    assert operation["tags"] == ["Fatigue"]
    assert operation["responses"]["422"]["content"]["application/json"]["schema"] == {
        "$ref": "#/components/schemas/ValidationError"
    }
