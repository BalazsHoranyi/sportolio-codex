from __future__ import annotations

from sportolo.api.schemas.muscle_usage import (
    ExerciseUsageSummary,
    MicrocycleUsageRequest,
    MicrocycleUsageResponse,
    MicrocycleUsageSummary,
    RoutineUsageSummary,
)


class MuscleUsageService:
    """Deterministic exercise->routine->microcycle muscle usage aggregation."""

    _fallback_mapping: dict[str, float] = {"global_other": 1.0}
    _exercise_mappings: dict[str, dict[str, float]] = {
        "back squat": {
            "quads": 0.50,
            "glutes": 0.35,
            "spinal_erectors": 0.15,
        },
        "bench press": {
            "chest": 0.50,
            "triceps": 0.30,
            "front_delts": 0.20,
        },
        "barbell row": {
            "lats": 0.45,
            "rear_delts": 0.20,
            "biceps": 0.20,
            "spinal_erectors": 0.15,
        },
        "running easy": {
            "quads": 0.35,
            "hamstrings": 0.25,
            "calves": 0.25,
            "glutes": 0.15,
        },
    }

    def aggregate_microcycle(self, request: MicrocycleUsageRequest) -> MicrocycleUsageResponse:
        exercise_summaries: list[ExerciseUsageSummary] = []
        routine_summaries: list[RoutineUsageSummary] = []
        microcycle_usage: dict[str, float] = {}
        microcycle_total = 0.0

        for routine in request.routines:
            routine_usage: dict[str, float] = {}
            routine_total = 0.0
            for exercise in routine.exercises:
                if exercise.workload <= 0:
                    raise ValueError("exercise workload must be greater than zero")

                mapped = self._resolve_mapping(exercise.exercise_name)
                exercise_usage = {
                    muscle: self._round_usage(exercise.workload * weight)
                    for muscle, weight in mapped.items()
                }
                exercise_total = self._round_usage(sum(exercise_usage.values()))
                routine_total = self._round_usage(routine_total + exercise_total)
                microcycle_total = self._round_usage(microcycle_total + exercise_total)

                self._accumulate(routine_usage, exercise_usage)
                self._accumulate(microcycle_usage, exercise_usage)

                exercise_summaries.append(
                    ExerciseUsageSummary(
                        routine_id=routine.routine_id,
                        exercise_id=exercise.exercise_id,
                        exercise_name=exercise.exercise_name,
                        workload=self._round_usage(exercise.workload),
                        total_usage=exercise_total,
                        muscle_usage=self._sort_usage(exercise_usage),
                    )
                )

            routine_summaries.append(
                RoutineUsageSummary(
                    routine_id=routine.routine_id,
                    routine_name=routine.routine_name,
                    total_usage=routine_total,
                    muscle_usage=self._sort_usage(routine_usage),
                )
            )

        microcycle_summary = MicrocycleUsageSummary(
            microcycle_id=request.microcycle_id,
            microcycle_name=request.microcycle_name,
            routine_count=len(request.routines),
            total_usage=microcycle_total,
            muscle_usage=self._sort_usage(microcycle_usage),
        )

        return MicrocycleUsageResponse(
            exercise_summaries=exercise_summaries,
            routine_summaries=routine_summaries,
            microcycle_summary=microcycle_summary,
        )

    def _resolve_mapping(self, exercise_name: str) -> dict[str, float]:
        normalized = " ".join(exercise_name.lower().split())
        return self._exercise_mappings.get(normalized, self._fallback_mapping)

    @staticmethod
    def _accumulate(target: dict[str, float], source: dict[str, float]) -> None:
        for muscle, value in source.items():
            target[muscle] = round(target.get(muscle, 0.0) + value, 4)

    @staticmethod
    def _sort_usage(usage: dict[str, float]) -> dict[str, float]:
        return {muscle: usage[muscle] for muscle in sorted(usage)}

    @staticmethod
    def _round_usage(value: float) -> float:
        return round(value, 4)
