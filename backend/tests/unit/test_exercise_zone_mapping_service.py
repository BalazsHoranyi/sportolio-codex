from __future__ import annotations

from sportolo.api.schemas.exercise_zone_mapping import (
    AxisEffectActivityInput,
    AxisEffectMappingRequest,
)
from sportolo.services.exercise_zone_mapping_service import ExerciseZoneMappingService


def test_strength_mapping_outputs_global_and_regional_contributions() -> None:
    service = ExerciseZoneMappingService()
    request = AxisEffectMappingRequest(
        activities=[
            AxisEffectActivityInput(
                activity_id="act-strength-1",
                activity_type="strength",
                exercise_name="Back Squat",
                workload=100,
            )
        ]
    )

    response = service.map_axis_effects(athlete_id="athlete-1", request=request)

    assert response.athlete_id == "athlete-1"
    assert len(response.activities) == 1
    mapped = response.activities[0]
    assert mapped.inference_source == "strength_lookup"
    assert mapped.confidence == "high"
    assert mapped.global_effects.model_dump() == {
        "neural": 40.0,
        "metabolic": 20.0,
        "mechanical": 50.0,
        "recruitment": 60.0,
    }
    assert mapped.regional_effects["lower_body"].model_dump() == {
        "recruitment": 48.0,
        "metabolic": 16.0,
        "mechanical": 40.0,
    }


def test_endurance_zone_inference_prefers_hr_then_power_then_pace() -> None:
    service = ExerciseZoneMappingService()
    request = AxisEffectMappingRequest(
        activities=[
            AxisEffectActivityInput(
                activity_id="run-hr",
                activity_type="run",
                duration_minutes=40,
                hr_zone=4,
                power_zone=5,
                pace_zone=2,
            ),
            AxisEffectActivityInput(
                activity_id="cycle-power",
                activity_type="cycle",
                duration_minutes=45,
                power_zone=3,
                pace_zone=2,
            ),
            AxisEffectActivityInput(
                activity_id="row-pace",
                activity_type="row",
                duration_minutes=20,
                pace_zone=2,
            ),
            AxisEffectActivityInput(
                activity_id="swim-default",
                activity_type="swim",
                duration_minutes=30,
            ),
        ]
    )

    response = service.map_axis_effects(athlete_id="athlete-1", request=request)

    assert [entry.activity_type for entry in response.activities] == [
        "run",
        "cycle",
        "row",
        "swim",
    ]
    assert [entry.inference_source for entry in response.activities] == [
        "hr",
        "power",
        "pace",
        "fallback_default_zone",
    ]
    assert [entry.inferred_zone for entry in response.activities] == [4, 3, 2, 2]
    assert response.activities[3].confidence == "low"
    assert response.activities[3].fallback_reason == "missing_zone_metrics"


def test_unknown_strength_exercise_falls_back_with_low_confidence() -> None:
    service = ExerciseZoneMappingService()
    request = AxisEffectMappingRequest(
        activities=[
            AxisEffectActivityInput(
                activity_id="unknown-strength",
                activity_type="strength",
                exercise_name="Mystery Dragon Lunge",
                workload=50,
            )
        ]
    )

    response = service.map_axis_effects(athlete_id="athlete-1", request=request)

    entry = response.activities[0]
    assert entry.inference_source == "fallback_unknown_exercise"
    assert entry.confidence == "low"
    assert entry.fallback_reason == "unknown_strength_exercise"
    assert list(entry.regional_effects) == ["global_other"]


def test_mapping_is_deterministic_for_identical_payloads() -> None:
    service = ExerciseZoneMappingService()
    request = AxisEffectMappingRequest(
        activities=[
            AxisEffectActivityInput(
                activity_id="act-strength-1",
                activity_type="strength",
                exercise_name="Bench Press",
                workload=80,
            ),
            AxisEffectActivityInput(
                activity_id="act-endurance-1",
                activity_type="run",
                duration_minutes=30,
                power_zone=3,
            ),
        ]
    )

    first = service.map_axis_effects(athlete_id="athlete-1", request=request)
    second = service.map_axis_effects(athlete_id="athlete-1", request=request)

    assert first == second
