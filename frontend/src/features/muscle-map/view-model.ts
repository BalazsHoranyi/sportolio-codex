import type { ExtendedBodyPart } from "react-muscle-highlighter";

import { mapMuscleUsageToBodyParts } from "./adapter";
import type {
  ExerciseUsageSummary,
  MuscleMapSelection,
  MuscleUsageApiResponse,
  MuscleUsageMap,
  RoutineUsageSummary,
} from "./types";

const MUSCLE_LABELS: Record<string, string> = {
  biceps: "Biceps",
  calves: "Calves",
  chest: "Chest",
  front_delts: "Front delts",
  glutes: "Glutes",
  hamstrings: "Hamstrings",
  lats: "Lats",
  quads: "Quads",
  rear_delts: "Rear delts",
  spinal_erectors: "Spinal erectors",
  triceps: "Triceps",
};

export interface MuscleLegendEntry {
  key: string;
  label: string;
  value: number;
}

export interface MuscleMapViewModel {
  routineOptions: RoutineUsageSummary[];
  exerciseOptions: ExerciseUsageSummary[];
  selectedRoutineId: string;
  selectedExerciseId: string;
  exerciseDisplayName: string;
  routineDisplayName: string;
  microcycleDisplayName: string;
  exerciseTotalUsage: number;
  routineTotalUsage: number;
  microcycleTotalUsage: number;
  exerciseMap: ExtendedBodyPart[];
  routineMap: ExtendedBodyPart[];
  microcycleMap: ExtendedBodyPart[];
  exerciseLegend: MuscleLegendEntry[];
  routineLegend: MuscleLegendEntry[];
  microcycleLegend: MuscleLegendEntry[];
}

export const EMPTY_MUSCLE_USAGE_RESPONSE: MuscleUsageApiResponse = {
  exerciseSummaries: [],
  routineSummaries: [],
  microcycleSummary: {
    microcycleId: "unknown-microcycle",
    microcycleName: null,
    routineCount: 0,
    totalUsage: 0,
    muscleUsage: {},
  },
};

function mergeUsage(
  current: MuscleUsageMap,
  muscleUsage: MuscleUsageMap,
): MuscleUsageMap {
  const merged = { ...current };

  for (const [key, value] of Object.entries(muscleUsage)) {
    if (value <= 0) {
      continue;
    }

    merged[key] = (merged[key] ?? 0) + value;
  }

  return merged;
}

function totalFromExercise(exercise: ExerciseUsageSummary): number {
  return exercise.totalUsage > 0 ? exercise.totalUsage : exercise.workload;
}

function deriveRoutineOptions(
  response: MuscleUsageApiResponse,
): RoutineUsageSummary[] {
  if (response.routineSummaries.length > 0) {
    return response.routineSummaries;
  }

  const grouped = new Map<string, ExerciseUsageSummary[]>();
  for (const exercise of response.exerciseSummaries) {
    const exercises = grouped.get(exercise.routineId) ?? [];
    exercises.push(exercise);
    grouped.set(exercise.routineId, exercises);
  }

  return [...grouped.entries()]
    .map(([routineId, exercises]) => {
      const muscleUsage = exercises.reduce<MuscleUsageMap>(
        (running, exercise) => mergeUsage(running, exercise.muscleUsage),
        {},
      );
      const totalUsage = exercises.reduce(
        (running, exercise) => running + totalFromExercise(exercise),
        0,
      );

      return {
        routineId,
        routineName: null,
        totalUsage,
        muscleUsage,
      };
    })
    .sort((left, right) => left.routineId.localeCompare(right.routineId));
}

function toLegendEntries(muscleUsage: MuscleUsageMap): MuscleLegendEntry[] {
  return Object.entries(muscleUsage)
    .filter(([, value]) => value > 0)
    .sort(
      (left, right) => right[1] - left[1] || left[0].localeCompare(right[0]),
    )
    .slice(0, 5)
    .map(([key, value]) => ({
      key,
      label: MUSCLE_LABELS[key] ?? key,
      value,
    }));
}

function selectRoutine(
  routines: RoutineUsageSummary[],
  routineId?: string,
): RoutineUsageSummary | undefined {
  return (
    routines.find((routine) => routine.routineId === routineId) ?? routines[0]
  );
}

function selectExercise(
  exercises: ExerciseUsageSummary[],
  exerciseId?: string,
): ExerciseUsageSummary | undefined {
  return (
    exercises.find((exercise) => exercise.exerciseId === exerciseId) ??
    exercises[0]
  );
}

export function createMuscleMapViewModel(
  response: MuscleUsageApiResponse,
  selection: MuscleMapSelection,
): MuscleMapViewModel {
  const routineOptions = deriveRoutineOptions(response);
  const routine = selectRoutine(routineOptions, selection.routineId);
  const exerciseOptions = routine
    ? response.exerciseSummaries.filter(
        (exercise) => exercise.routineId === routine.routineId,
      )
    : [];
  const exercise = selectExercise(exerciseOptions, selection.exerciseId);
  const microcycleSummary =
    response.microcycleSummary ?? EMPTY_MUSCLE_USAGE_RESPONSE.microcycleSummary;

  const exerciseUsage = exercise?.muscleUsage ?? {};
  const routineUsage = routine?.muscleUsage ?? {};
  const exerciseDisplayName = exercise?.exerciseName ?? "No exercise data";
  const routineDisplayName =
    routine?.routineName ?? routine?.routineId ?? "No routine data";
  const microcycleDisplayName =
    microcycleSummary.microcycleName ??
    microcycleSummary.microcycleId ??
    "No microcycle data";

  return {
    routineOptions,
    exerciseOptions,
    selectedRoutineId: routine?.routineId ?? "",
    selectedExerciseId: exercise?.exerciseId ?? "",
    exerciseDisplayName,
    routineDisplayName,
    microcycleDisplayName,
    exerciseTotalUsage: exercise?.totalUsage ?? 0,
    routineTotalUsage: routine?.totalUsage ?? 0,
    microcycleTotalUsage: microcycleSummary.totalUsage,
    exerciseMap: mapMuscleUsageToBodyParts(exerciseUsage),
    routineMap: mapMuscleUsageToBodyParts(routineUsage),
    microcycleMap: mapMuscleUsageToBodyParts(microcycleSummary.muscleUsage),
    exerciseLegend: toLegendEntries(exerciseUsage),
    routineLegend: toLegendEntries(routineUsage),
    microcycleLegend: toLegendEntries(microcycleSummary.muscleUsage),
  };
}
