import pytest
from pydantic import ValidationError

from sportolo.api.schemas.muscle_usage import (
    ExerciseUsageInput,
    MicrocycleUsageRequest,
    RoutineUsageInput,
)
from sportolo.services.muscle_usage_service import MuscleUsageService


def _build_request() -> MicrocycleUsageRequest:
    return MicrocycleUsageRequest(
        microcycle_id="micro-1",
        microcycle_name="Base Week 1",
        routines=[
            RoutineUsageInput(
                routine_id="routine-1",
                routine_name="Lower + Push",
                exercises=[
                    ExerciseUsageInput(
                        exercise_id="ex-1", exercise_name="Back Squat", workload=120.0
                    ),
                    ExerciseUsageInput(
                        exercise_id="ex-2", exercise_name="Bench Press", workload=80.0
                    ),
                ],
            ),
            RoutineUsageInput(
                routine_id="routine-2",
                routine_name="Pull + Run",
                exercises=[
                    ExerciseUsageInput(
                        exercise_id="ex-3", exercise_name="Barbell Row", workload=60.0
                    ),
                    ExerciseUsageInput(
                        exercise_id="ex-4", exercise_name="Running Easy", workload=100.0
                    ),
                ],
            ),
        ],
    )


def test_aggregate_microcycle_rolls_up_exercise_and_routine_usage_deterministically() -> None:
    service = MuscleUsageService()

    response = service.aggregate_microcycle(_build_request())

    assert response.microcycle_summary.total_usage == 360.0
    assert response.microcycle_summary.muscle_usage == {
        "biceps": 12.0,
        "calves": 25.0,
        "chest": 40.0,
        "front_delts": 16.0,
        "glutes": 57.0,
        "hamstrings": 25.0,
        "lats": 27.0,
        "quads": 95.0,
        "rear_delts": 12.0,
        "spinal_erectors": 27.0,
        "triceps": 24.0,
    }

    first_routine = response.routine_summaries[0]
    assert first_routine.routine_id == "routine-1"
    assert first_routine.total_usage == 200.0
    assert first_routine.muscle_usage == {
        "chest": 40.0,
        "front_delts": 16.0,
        "glutes": 42.0,
        "quads": 60.0,
        "spinal_erectors": 18.0,
        "triceps": 24.0,
    }


def test_unknown_exercise_uses_fallback_bucket() -> None:
    service = MuscleUsageService()
    request = MicrocycleUsageRequest(
        microcycle_id="micro-2",
        routines=[
            RoutineUsageInput(
                routine_id="routine-1",
                exercises=[
                    ExerciseUsageInput(
                        exercise_id="ex-1",
                        exercise_name="Totally New Exercise",
                        workload=55,
                    )
                ],
            )
        ],
    )

    response = service.aggregate_microcycle(request)

    assert response.exercise_summaries[0].muscle_usage == {"global_other": 55.0}
    assert response.microcycle_summary.muscle_usage == {"global_other": 55.0}


def test_duplicate_exercises_accumulate_deterministically() -> None:
    service = MuscleUsageService()
    request = MicrocycleUsageRequest(
        microcycle_id="micro-dup",
        routines=[
            RoutineUsageInput(
                routine_id="routine-1",
                exercises=[
                    ExerciseUsageInput(
                        exercise_id="ex-1",
                        exercise_name="Bench Press",
                        workload=50,
                    ),
                    ExerciseUsageInput(
                        exercise_id="ex-2",
                        exercise_name="Bench Press",
                        workload=50,
                    ),
                ],
            )
        ],
    )

    response = service.aggregate_microcycle(request)

    assert response.microcycle_summary.total_usage == 100.0
    assert response.microcycle_summary.muscle_usage == {
        "chest": 50.0,
        "front_delts": 20.0,
        "triceps": 30.0,
    }


def test_non_positive_workload_is_rejected() -> None:
    with pytest.raises(ValidationError):
        MicrocycleUsageRequest(
            microcycle_id="micro-3",
            routines=[
                RoutineUsageInput(
                    routine_id="routine-1",
                    exercises=[
                        ExerciseUsageInput(
                            exercise_id="ex-1",
                            exercise_name="Back Squat",
                            workload=0,
                        )
                    ],
                )
            ],
        )


def test_empty_routines_are_rejected() -> None:
    with pytest.raises(ValidationError):
        MicrocycleUsageRequest(microcycle_id="micro-empty", routines=[])
