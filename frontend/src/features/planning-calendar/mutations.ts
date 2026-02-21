import { initialPlannedWorkouts, workoutTemplateCatalog } from "./sample-data";
import type {
  PlannedWorkout,
  PlanningCalendarState,
  PlanningMutationEvent,
  PlanningWorkoutIntensity,
  PlanningWorkoutType,
  WorkoutTemplate,
} from "./types";

function normalizeIsoDate(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  const asDate = new Date(value);
  if (Number.isNaN(asDate.getTime())) {
    return undefined;
  }

  return asDate.toISOString().slice(0, 10);
}

function sortWorkouts(workouts: PlannedWorkout[]): PlannedWorkout[] {
  return [...workouts].sort((left, right) => {
    if (left.date !== right.date) {
      return left.date.localeCompare(right.date);
    }

    return left.title.localeCompare(right.title);
  });
}

export function createInitialPlanningCalendarState(): PlanningCalendarState {
  return {
    workouts: sortWorkouts(initialPlannedWorkouts),
    mutationLog: [],
  };
}

function resolveTemplateById(templateId: string): WorkoutTemplate | undefined {
  return workoutTemplateCatalog.find(
    (template) => template.templateId === templateId,
  );
}

function fallbackWorkoutType(title: string): PlanningWorkoutType {
  const normalized = title.toLowerCase();
  if (normalized.includes("recovery") || normalized.includes("easy")) {
    return "recovery";
  }

  if (normalized.includes("ride") || normalized.includes("run")) {
    return "endurance";
  }

  return "strength";
}

function fallbackIntensity(
  workoutType: PlanningWorkoutType,
): PlanningWorkoutIntensity {
  if (workoutType === "recovery") {
    return "easy";
  }

  if (workoutType === "endurance") {
    return "moderate";
  }

  return "hard";
}

export function createMutationFromTemplate(params: {
  mutationId: string;
  templateId: string;
  workoutId: string;
  toDate: string;
  source: "drag_drop" | "keyboard";
  occurredAt: string;
}): PlanningMutationEvent | null {
  const template = resolveTemplateById(params.templateId);
  const toDate = normalizeIsoDate(params.toDate);
  if (!template || !toDate) {
    return null;
  }

  return {
    mutationId: params.mutationId,
    type: "workout_added",
    workoutId: params.workoutId,
    title: template.title,
    toDate,
    workoutType: template.workoutType,
    intensity: template.intensity,
    source: params.source,
    occurredAt: params.occurredAt,
  };
}

export function applyPlanningMutation(
  previous: PlanningCalendarState,
  mutation: PlanningMutationEvent,
): PlanningCalendarState {
  const workouts = [...previous.workouts];
  const normalizedToDate = normalizeIsoDate(mutation.toDate);
  const normalizedFromDate = normalizeIsoDate(mutation.fromDate);

  if (mutation.type === "workout_added" && normalizedToDate) {
    const existingIndex = workouts.findIndex(
      (workout) => workout.workoutId === mutation.workoutId,
    );
    const workoutType =
      mutation.workoutType ?? fallbackWorkoutType(mutation.title);
    const intensity = mutation.intensity ?? fallbackIntensity(workoutType);

    const workout: PlannedWorkout = {
      workoutId: mutation.workoutId,
      title: mutation.title,
      date: normalizedToDate,
      workoutType,
      intensity,
    };

    if (existingIndex >= 0) {
      workouts.splice(existingIndex, 1, workout);
    } else {
      workouts.push(workout);
    }
  }

  if (mutation.type === "workout_moved" && normalizedToDate) {
    const targetIndex = workouts.findIndex(
      (workout) => workout.workoutId === mutation.workoutId,
    );
    if (targetIndex >= 0) {
      workouts[targetIndex] = {
        ...workouts[targetIndex],
        date: normalizedToDate,
      };
    }
  }

  if (mutation.type === "workout_removed") {
    const targetIndex = workouts.findIndex(
      (workout) => workout.workoutId === mutation.workoutId,
    );
    if (targetIndex >= 0) {
      workouts.splice(targetIndex, 1);
    }
  }

  const normalizedMutation: PlanningMutationEvent = {
    ...mutation,
    fromDate: normalizedFromDate,
    toDate: normalizedToDate,
  };

  return {
    workouts: sortWorkouts(workouts),
    mutationLog: [...previous.mutationLog, normalizedMutation],
  };
}
