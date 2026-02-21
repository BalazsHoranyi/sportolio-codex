import { mapMuscleUsageToBodyParts } from "../muscle-map/adapter";
import type { MuscleUsageMap } from "../muscle-map/types";
import type { ExtendedBodyPart } from "react-muscle-highlighter";

import type { PlannerDraft, PlannerWorkoutDraft, WorkoutDay } from "./types";

const DAY_LABELS: Record<WorkoutDay, string> = {
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
  saturday: "Saturday",
  sunday: "Sunday",
};

const DAY_ORDER: Record<WorkoutDay, number> = {
  monday: 0,
  tuesday: 1,
  wednesday: 2,
  thursday: 3,
  friday: 4,
  saturday: 5,
  sunday: 6,
};

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

const BASE_WORKLOAD_BY_TYPE: Record<PlannerWorkoutDraft["type"], number> = {
  strength: 120,
  endurance: 100,
  recovery: 70,
};

const INTENSITY_MULTIPLIER: Record<PlannerWorkoutDraft["intensity"], number> = {
  easy: 0.82,
  moderate: 1,
  hard: 1.22,
};

const TYPE_DEFAULT_PROFILE: Record<
  PlannerWorkoutDraft["type"],
  {
    label: string;
    muscles: MuscleUsageMap;
  }
> = {
  strength: {
    label: "Strength support",
    muscles: {
      quads: 0.2,
      glutes: 0.18,
      hamstrings: 0.12,
      chest: 0.16,
      lats: 0.14,
      triceps: 0.1,
      biceps: 0.08,
      spinal_erectors: 0.02,
    },
  },
  endurance: {
    label: "Endurance support",
    muscles: {
      quads: 0.28,
      calves: 0.24,
      hamstrings: 0.18,
      glutes: 0.14,
      spinal_erectors: 0.1,
      lats: 0.06,
    },
  },
  recovery: {
    label: "Recovery support",
    muscles: {
      glutes: 0.24,
      calves: 0.2,
      hamstrings: 0.18,
      spinal_erectors: 0.18,
      lats: 0.12,
      chest: 0.08,
    },
  },
};

const LABEL_PROFILES: Array<{
  id: string;
  match: RegExp;
  label: string;
  muscles: MuscleUsageMap;
}> = [
  {
    id: "squat-pattern",
    match: /squat|lunge|split|leg\s*press/i,
    label: "Squat pattern",
    muscles: {
      quads: 0.35,
      glutes: 0.24,
      hamstrings: 0.17,
      spinal_erectors: 0.12,
      calves: 0.12,
    },
  },
  {
    id: "hinge-pattern",
    match: /deadlift|rdl|hinge|good\s*morning/i,
    label: "Hinge pattern",
    muscles: {
      hamstrings: 0.34,
      glutes: 0.28,
      spinal_erectors: 0.2,
      quads: 0.1,
      lats: 0.08,
    },
  },
  {
    id: "press-pattern",
    match: /press|bench|dip|push/i,
    label: "Press pattern",
    muscles: {
      chest: 0.33,
      triceps: 0.25,
      front_delts: 0.22,
      rear_delts: 0.1,
      lats: 0.1,
    },
  },
  {
    id: "pull-pattern",
    match: /row|pull|chin|lat/i,
    label: "Pull pattern",
    muscles: {
      lats: 0.34,
      biceps: 0.24,
      rear_delts: 0.18,
      spinal_erectors: 0.14,
      front_delts: 0.1,
    },
  },
  {
    id: "run-pattern",
    match: /run|tempo|track|interval/i,
    label: "Run interval",
    muscles: {
      quads: 0.3,
      calves: 0.26,
      hamstrings: 0.2,
      glutes: 0.16,
      spinal_erectors: 0.08,
    },
  },
  {
    id: "ride-pattern",
    match: /ride|bike|cycle|erg|trainer/i,
    label: "Ride interval",
    muscles: {
      quads: 0.36,
      calves: 0.2,
      glutes: 0.18,
      hamstrings: 0.16,
      spinal_erectors: 0.1,
    },
  },
  {
    id: "swim-pattern",
    match: /swim|pool|paddle/i,
    label: "Swim set",
    muscles: {
      lats: 0.28,
      chest: 0.2,
      triceps: 0.18,
      rear_delts: 0.16,
      front_delts: 0.1,
      spinal_erectors: 0.08,
    },
  },
];

export interface PlannerReviewLegendEntry {
  key: string;
  label: string;
  value: number;
}

export interface PlannerReviewRoutineContribution {
  routineId: string;
  routineName: string;
  day: WorkoutDay;
  dayLabel: string;
  intensity: PlannerWorkoutDraft["intensity"];
  totalUsage: number;
  muscleUsage: MuscleUsageMap;
  drilldownId: string;
  drilldownHref: string;
}

export interface PlannerReviewExerciseContribution {
  exerciseId: string;
  exerciseName: string;
  routineId: string;
  routineName: string;
  day: WorkoutDay;
  dayLabel: string;
  totalUsage: number;
  muscleUsage: MuscleUsageMap;
  drilldownId: string;
  drilldownHref: string;
  routineDrilldownHref: string;
}

export interface PlannerReviewOverlapWarning {
  id: string;
  day: WorkoutDay;
  dayLabel: string;
  severity: "moderate" | "high";
  title: string;
  detail: string;
  overlappingMuscles: string[];
}

export interface PlannerReviewMuscleSummary {
  microcycleTotalUsage: number;
  microcycleMuscleUsage: MuscleUsageMap;
  microcycleMap: ExtendedBodyPart[];
  microcycleLegend: PlannerReviewLegendEntry[];
  routineContributions: PlannerReviewRoutineContribution[];
  exerciseContributions: PlannerReviewExerciseContribution[];
  overlapWarnings: PlannerReviewOverlapWarning[];
}

interface ExerciseProfile {
  key: string;
  label: string;
  muscles: MuscleUsageMap;
}

function roundTo(value: number, precision: number): number {
  const multiplier = 10 ** precision;
  return Math.round(value * multiplier) / multiplier;
}

function toTitleCase(value: string): string {
  return value
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map(
      (token) => token.charAt(0).toUpperCase() + token.slice(1).toLowerCase(),
    )
    .join(" ");
}

function buildRoutineName(workout: PlannerWorkoutDraft, index: number): string {
  const cleanedLabel = workout.label.trim();
  if (cleanedLabel.length > 0) {
    return cleanedLabel;
  }

  return `Workout ${index + 1}`;
}

function toDrilldownId(prefix: string, value: string): string {
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${prefix}-${normalized || "item"}`;
}

function mergeUsage(
  target: MuscleUsageMap,
  source: MuscleUsageMap,
): MuscleUsageMap {
  const merged: MuscleUsageMap = { ...target };

  for (const [key, value] of Object.entries(source)) {
    if (value <= 0) {
      continue;
    }

    merged[key] = roundTo((merged[key] ?? 0) + value, 4);
  }

  return merged;
}

function scaleUsage(profile: MuscleUsageMap, workload: number): MuscleUsageMap {
  const scaled: MuscleUsageMap = {};

  for (const [key, ratio] of Object.entries(profile)) {
    if (ratio <= 0) {
      continue;
    }

    scaled[key] = roundTo(workload * ratio, 4);
  }

  return scaled;
}

function deriveProfiles(workout: PlannerWorkoutDraft): {
  primary: ExerciseProfile;
  secondary: ExerciseProfile | null;
} {
  const matched = LABEL_PROFILES.find((profile) =>
    profile.match.test(workout.label),
  );
  const fallback = TYPE_DEFAULT_PROFILE[workout.type];

  if (!matched) {
    return {
      primary: {
        key: `${workout.type}-default`,
        label: fallback.label,
        muscles: fallback.muscles,
      },
      secondary: null,
    };
  }

  return {
    primary: {
      key: matched.id,
      label: matched.label,
      muscles: matched.muscles,
    },
    secondary: {
      key: `${workout.type}-default`,
      label: fallback.label,
      muscles: fallback.muscles,
    },
  };
}

function describeTopMuscles(muscleUsage: MuscleUsageMap, limit = 2): string {
  const topKeys = Object.entries(muscleUsage)
    .filter(([, value]) => value > 0)
    .sort(
      (left, right) => right[1] - left[1] || left[0].localeCompare(right[0]),
    )
    .slice(0, limit)
    .map(([key]) => MUSCLE_LABELS[key] ?? key);

  if (topKeys.length === 0) {
    return "No mapped muscles";
  }

  return topKeys.join(" + ");
}

function dayOrder(day: WorkoutDay): number {
  return DAY_ORDER[day];
}

function toLegendEntries(
  muscleUsage: MuscleUsageMap,
): PlannerReviewLegendEntry[] {
  return Object.entries(muscleUsage)
    .filter(([, value]) => value > 0)
    .sort(
      (left, right) => right[1] - left[1] || left[0].localeCompare(right[0]),
    )
    .slice(0, 5)
    .map(([key, value]) => ({
      key,
      label: MUSCLE_LABELS[key] ?? toTitleCase(key.replace(/_/g, " ")),
      value: roundTo(value, 1),
    }));
}

function buildOverlapWarnings(
  routines: PlannerReviewRoutineContribution[],
): PlannerReviewOverlapWarning[] {
  const routinesByDay = new Map<
    WorkoutDay,
    PlannerReviewRoutineContribution[]
  >();

  for (const routine of routines) {
    const list = routinesByDay.get(routine.day) ?? [];
    list.push(routine);
    routinesByDay.set(routine.day, list);
  }

  const warnings: PlannerReviewOverlapWarning[] = [];

  for (const [day, dayRoutines] of routinesByDay) {
    if (dayRoutines.length < 2) {
      continue;
    }

    const contributingRoutineCount = new Map<string, number>();
    const weightedMuscles = new Map<string, number>();

    for (const routine of dayRoutines) {
      for (const [muscle, value] of Object.entries(routine.muscleUsage)) {
        if (value <= 0) {
          continue;
        }

        contributingRoutineCount.set(
          muscle,
          (contributingRoutineCount.get(muscle) ?? 0) + 1,
        );
        weightedMuscles.set(muscle, (weightedMuscles.get(muscle) ?? 0) + value);
      }
    }

    const overlappingMuscles = [...contributingRoutineCount.entries()]
      .filter(([, count]) => count >= 2)
      .sort((left, right) => {
        const rightWeight = weightedMuscles.get(right[0]) ?? 0;
        const leftWeight = weightedMuscles.get(left[0]) ?? 0;
        return rightWeight - leftWeight || left[0].localeCompare(right[0]);
      })
      .map(([muscle]) => muscle)
      .slice(0, 3);

    if (overlappingMuscles.length === 0) {
      continue;
    }

    const hasHardSession = dayRoutines.some(
      (routine) => routine.intensity === "hard",
    );
    const severity = hasHardSession ? "high" : "moderate";
    const dayLabel = DAY_LABELS[day];

    warnings.push({
      id: `overlap-${day}`,
      day,
      dayLabel,
      severity,
      title: hasHardSession ? "High-overlap day" : "Moderate overlap day",
      detail: `${dayLabel} stacks ${dayRoutines.length} workouts on ${describeTopMuscles(
        Object.fromEntries(
          overlappingMuscles.map((muscle) => [
            muscle,
            weightedMuscles.get(muscle) ?? 0,
          ]),
        ),
        3,
      )}.`,
      overlappingMuscles,
    });
  }

  return warnings.sort(
    (left, right) => dayOrder(left.day) - dayOrder(right.day),
  );
}

export function buildPlannerReviewMuscleSummary(
  draft: PlannerDraft,
): PlannerReviewMuscleSummary {
  const microcycleUsage: MuscleUsageMap = {};
  const routineContributions: PlannerReviewRoutineContribution[] = [];
  const exerciseContributions: PlannerReviewExerciseContribution[] = [];

  const sortedWorkouts = [...draft.microcycle.workouts].sort(
    (left, right) =>
      dayOrder(left.day) - dayOrder(right.day) ||
      left.workoutId.localeCompare(right.workoutId),
  );

  sortedWorkouts.forEach((workout, index) => {
    const routineName = buildRoutineName(workout, index);
    const baseWorkload = BASE_WORKLOAD_BY_TYPE[workout.type];
    const routineWorkload = roundTo(
      baseWorkload * INTENSITY_MULTIPLIER[workout.intensity],
      1,
    );

    const { primary, secondary } = deriveProfiles(workout);
    const primaryWorkload = secondary
      ? roundTo(routineWorkload * 0.68, 1)
      : routineWorkload;
    const secondaryWorkload = secondary
      ? roundTo(routineWorkload - primaryWorkload, 1)
      : 0;

    const routineMuscleUsage = mergeUsage(
      scaleUsage(primary.muscles, primaryWorkload),
      secondary ? scaleUsage(secondary.muscles, secondaryWorkload) : {},
    );

    const routineDrilldownId = toDrilldownId(
      "planner-review-routine",
      workout.workoutId,
    );

    const exerciseEntries: Array<{
      id: string;
      name: string;
      workload: number;
      muscles: MuscleUsageMap;
    }> = [
      {
        id: `${workout.workoutId}-primary`,
        name:
          workout.label.trim().length > 0
            ? `${routineName} · ${primary.label}`
            : `${routineName} · ${primary.label}`,
        workload: primaryWorkload,
        muscles: scaleUsage(primary.muscles, primaryWorkload),
      },
    ];

    if (secondary) {
      exerciseEntries.push({
        id: `${workout.workoutId}-secondary`,
        name: `${routineName} · ${secondary.label}`,
        workload: secondaryWorkload,
        muscles: scaleUsage(secondary.muscles, secondaryWorkload),
      });
    }

    for (const exercise of exerciseEntries) {
      const exerciseDrilldownId = toDrilldownId(
        "planner-review-exercise",
        exercise.id,
      );

      exerciseContributions.push({
        exerciseId: exercise.id,
        exerciseName: exercise.name,
        routineId: workout.workoutId,
        routineName,
        day: workout.day,
        dayLabel: DAY_LABELS[workout.day],
        totalUsage: roundTo(exercise.workload, 1),
        muscleUsage: exercise.muscles,
        drilldownId: exerciseDrilldownId,
        drilldownHref: `#${exerciseDrilldownId}`,
        routineDrilldownHref: `#${routineDrilldownId}`,
      });
    }

    routineContributions.push({
      routineId: workout.workoutId,
      routineName,
      day: workout.day,
      dayLabel: DAY_LABELS[workout.day],
      intensity: workout.intensity,
      totalUsage: roundTo(routineWorkload, 1),
      muscleUsage: routineMuscleUsage,
      drilldownId: routineDrilldownId,
      drilldownHref: `#${routineDrilldownId}`,
    });

    for (const [muscle, value] of Object.entries(routineMuscleUsage)) {
      if (value <= 0) {
        continue;
      }

      microcycleUsage[muscle] = roundTo(
        (microcycleUsage[muscle] ?? 0) + value,
        4,
      );
    }
  });

  const microcycleTotalUsage = roundTo(
    routineContributions.reduce((sum, routine) => sum + routine.totalUsage, 0),
    1,
  );

  const overlapWarnings = buildOverlapWarnings(routineContributions);

  return {
    microcycleTotalUsage,
    microcycleMuscleUsage: microcycleUsage,
    microcycleMap: mapMuscleUsageToBodyParts(microcycleUsage),
    microcycleLegend: toLegendEntries(microcycleUsage),
    routineContributions,
    exerciseContributions: exerciseContributions.sort(
      (left, right) =>
        dayOrder(left.day) - dayOrder(right.day) ||
        left.routineId.localeCompare(right.routineId) ||
        left.exerciseId.localeCompare(right.exerciseId),
    ),
    overlapWarnings,
  };
}
