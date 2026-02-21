import { initialPlannedWorkouts, workoutTemplateCatalog } from "./sample-data";
import type {
  PlannedWorkout,
  PlanningCalendarState,
  PlanningMutationEvent,
  PlanningWorkoutIntensity,
  PlanningWorkoutType,
  WorkoutScheduleHistoryEntry,
  WorkoutTemplate,
} from "./types";

interface WorkoutScheduleSnapshot {
  date?: string;
  sessionOrder?: number;
}

export interface PlanningMutationOutcome {
  state: PlanningCalendarState;
  applied: boolean;
  recomputeRequired: boolean;
  requiresOverride: boolean;
  rejectionReason?: string;
  pendingMutation?: PlanningMutationEvent;
  appliedMutation?: PlanningMutationEvent;
}

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

function normalizeOrder(value: number | undefined): number | undefined {
  if (!Number.isFinite(value)) {
    return undefined;
  }

  const normalized = Math.floor(value as number);
  if (normalized <= 0) {
    return undefined;
  }

  return normalized;
}

function sortWorkouts(workouts: PlannedWorkout[]): PlannedWorkout[] {
  return [...workouts].sort((left, right) => {
    if (left.date !== right.date) {
      return left.date.localeCompare(right.date);
    }

    if (left.sessionOrder !== right.sessionOrder) {
      return left.sessionOrder - right.sessionOrder;
    }

    return left.title.localeCompare(right.title);
  });
}

function cloneHistory(
  history: PlanningCalendarState["workoutHistory"],
): PlanningCalendarState["workoutHistory"] {
  return Object.fromEntries(
    Object.entries(history).map(([workoutId, entries]) => [
      workoutId,
      entries.map((entry) => ({ ...entry })),
    ]),
  );
}

function ensureWorkoutHistoryKey(
  history: PlanningCalendarState["workoutHistory"],
  workoutId: string,
) {
  if (!history[workoutId]) {
    history[workoutId] = [];
  }
}

function appendWorkoutHistory(
  history: PlanningCalendarState["workoutHistory"],
  workoutId: string,
  mutation: PlanningMutationEvent,
  fromSchedule?: WorkoutScheduleSnapshot,
  toSchedule?: WorkoutScheduleSnapshot,
) {
  ensureWorkoutHistoryKey(history, workoutId);
  const entry: WorkoutScheduleHistoryEntry = {
    mutationId: mutation.mutationId,
    type: mutation.type,
    source: mutation.source,
    occurredAt: mutation.occurredAt,
    fromDate: fromSchedule?.date,
    toDate: toSchedule?.date,
    fromOrder: fromSchedule?.sessionOrder,
    toOrder: toSchedule?.sessionOrder,
    overrideApplied: mutation.overrideApplied,
  };
  history[workoutId] = [...history[workoutId], entry];
}

function scheduleByWorkoutId(
  workouts: PlannedWorkout[],
): Record<string, WorkoutScheduleSnapshot> {
  return Object.fromEntries(
    workouts.map((workout) => [
      workout.workoutId,
      {
        date: workout.date,
        sessionOrder: workout.sessionOrder,
      },
    ]),
  );
}

function hasScheduleDelta(
  previous?: WorkoutScheduleSnapshot,
  next?: WorkoutScheduleSnapshot,
): boolean {
  if (!previous || !next) {
    return previous !== next;
  }

  return (
    previous.date !== next.date || previous.sessionOrder !== next.sessionOrder
  );
}

function appendHistoryForScheduleChanges(
  previous: PlanningCalendarState,
  workouts: PlannedWorkout[],
  history: PlanningCalendarState["workoutHistory"],
  mutation: PlanningMutationEvent,
) {
  const previousSchedules = scheduleByWorkoutId(previous.workouts);
  const nextSchedules = scheduleByWorkoutId(workouts);
  const changedWorkoutIds = new Set<string>([
    ...Object.keys(previousSchedules),
    ...Object.keys(nextSchedules),
  ]);
  changedWorkoutIds.add(mutation.workoutId);

  for (const workoutId of [...changedWorkoutIds].sort((left, right) =>
    left.localeCompare(right),
  )) {
    const previousSchedule = previousSchedules[workoutId];
    const nextSchedule = nextSchedules[workoutId];

    if (
      workoutId !== mutation.workoutId &&
      !hasScheduleDelta(previousSchedule, nextSchedule)
    ) {
      continue;
    }

    appendWorkoutHistory(
      history,
      workoutId,
      mutation,
      previousSchedule,
      nextSchedule,
    );
  }
}

function normalizeDayOrdering(workouts: PlannedWorkout[], date: string) {
  const target = sortWorkouts(
    workouts.filter((workout) => workout.date === date),
  );
  target.forEach((workout, index) => {
    const targetIndex = workouts.findIndex(
      (candidate) => candidate.workoutId === workout.workoutId,
    );
    if (targetIndex >= 0) {
      workouts[targetIndex] = {
        ...workouts[targetIndex],
        sessionOrder: index + 1,
      };
    }
  });
}

function resolveTargetOrder(
  workouts: PlannedWorkout[],
  date: string,
  requestedOrder: number | undefined,
): number {
  const dayCount = workouts.filter((workout) => workout.date === date).length;
  if (!requestedOrder) {
    return dayCount + 1;
  }

  return Math.max(1, Math.min(dayCount + 1, requestedOrder));
}

function hasOverlap(
  workouts: PlannedWorkout[],
  workoutId: string,
  toDate: string | undefined,
): boolean {
  if (!toDate) {
    return false;
  }

  return workouts.some(
    (workout) => workout.workoutId !== workoutId && workout.date === toDate,
  );
}

function normalizeMutation(
  mutation: PlanningMutationEvent,
): PlanningMutationEvent {
  return {
    ...mutation,
    fromDate: normalizeIsoDate(mutation.fromDate),
    toDate: normalizeIsoDate(mutation.toDate),
    fromOrder: normalizeOrder(mutation.fromOrder),
    toOrder: normalizeOrder(mutation.toOrder),
  };
}

function createRejectedOutcome(
  state: PlanningCalendarState,
  mutation: PlanningMutationEvent,
  reason: string,
  requiresOverride = false,
): PlanningMutationOutcome {
  return {
    state,
    applied: false,
    recomputeRequired: false,
    requiresOverride,
    rejectionReason: reason,
    pendingMutation: requiresOverride ? mutation : undefined,
  };
}

function applyMutationAndHistory(
  previous: PlanningCalendarState,
  workouts: PlannedWorkout[],
  history: PlanningCalendarState["workoutHistory"],
  mutation: PlanningMutationEvent,
): PlanningMutationOutcome {
  appendHistoryForScheduleChanges(previous, workouts, history, mutation);

  return {
    state: {
      workouts: sortWorkouts(workouts),
      mutationLog: [...previous.mutationLog, mutation],
      workoutHistory: history,
    },
    applied: true,
    recomputeRequired: true,
    requiresOverride: false,
    appliedMutation: mutation,
  };
}

export function createInitialPlanningCalendarState(): PlanningCalendarState {
  const sorted = sortWorkouts(initialPlannedWorkouts);
  const workoutHistory: PlanningCalendarState["workoutHistory"] = {};
  for (const workout of sorted) {
    workoutHistory[workout.workoutId] = [];
  }

  return {
    workouts: sorted,
    mutationLog: [],
    workoutHistory,
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

export function applyPlanningMutationWithOutcome(
  previous: PlanningCalendarState,
  mutation: PlanningMutationEvent,
): PlanningMutationOutcome {
  const normalizedMutation = normalizeMutation(mutation);
  const workouts = [...previous.workouts];
  const history = cloneHistory(previous.workoutHistory);

  if (normalizedMutation.type === "workout_added") {
    const normalizedToDate = normalizedMutation.toDate;
    if (!normalizedToDate) {
      return createRejectedOutcome(
        previous,
        normalizedMutation,
        "Target date is required for workout additions.",
      );
    }

    if (
      hasOverlap(workouts, normalizedMutation.workoutId, normalizedToDate) &&
      !normalizedMutation.allowOverlap
    ) {
      return createRejectedOutcome(
        previous,
        normalizedMutation,
        `Workout would overlap an existing workout on ${normalizedToDate}.`,
        true,
      );
    }

    const existingIndex = workouts.findIndex(
      (workout) => workout.workoutId === normalizedMutation.workoutId,
    );
    const existingWorkout =
      existingIndex >= 0 ? workouts[existingIndex] : undefined;
    const workoutType =
      normalizedMutation.workoutType ??
      fallbackWorkoutType(normalizedMutation.title);
    const intensity =
      normalizedMutation.intensity ?? fallbackIntensity(workoutType);
    const targetOrder = resolveTargetOrder(
      workouts.filter(
        (workout) => workout.workoutId !== normalizedMutation.workoutId,
      ),
      normalizedToDate,
      normalizedMutation.toOrder,
    );

    const nextWorkout: PlannedWorkout = {
      workoutId: normalizedMutation.workoutId,
      title: normalizedMutation.title,
      date: normalizedToDate,
      sessionOrder: targetOrder,
      workoutType,
      intensity,
    };

    if (existingIndex >= 0) {
      workouts.splice(existingIndex, 1, nextWorkout);
    } else {
      workouts.push(nextWorkout);
    }

    if (existingWorkout && existingWorkout.date !== normalizedToDate) {
      normalizeDayOrdering(workouts, existingWorkout.date);
    }
    normalizeDayOrdering(workouts, normalizedToDate);

    const resolvedWorkout = workouts.find(
      (workout) => workout.workoutId === normalizedMutation.workoutId,
    );
    const appliedMutation: PlanningMutationEvent = {
      ...normalizedMutation,
      fromDate: existingWorkout?.date,
      fromOrder: existingWorkout?.sessionOrder,
      toDate: resolvedWorkout?.date ?? normalizedToDate,
      toOrder: resolvedWorkout?.sessionOrder ?? targetOrder,
      overrideApplied: Boolean(normalizedMutation.allowOverlap),
    };

    return applyMutationAndHistory(
      previous,
      workouts,
      history,
      appliedMutation,
    );
  }

  if (normalizedMutation.type === "workout_moved") {
    const normalizedToDate = normalizedMutation.toDate;
    if (!normalizedToDate) {
      return createRejectedOutcome(
        previous,
        normalizedMutation,
        "Target date is required for workout moves.",
      );
    }

    const targetIndex = workouts.findIndex(
      (workout) => workout.workoutId === normalizedMutation.workoutId,
    );
    if (targetIndex < 0) {
      return createRejectedOutcome(
        previous,
        normalizedMutation,
        "Cannot move unknown workout.",
      );
    }

    const currentWorkout = workouts[targetIndex];
    const fromDate = currentWorkout.date;
    const fromOrder = currentWorkout.sessionOrder;

    if (
      hasOverlap(workouts, normalizedMutation.workoutId, normalizedToDate) &&
      !normalizedMutation.allowOverlap
    ) {
      return createRejectedOutcome(
        previous,
        normalizedMutation,
        `Workout would overlap an existing workout on ${normalizedToDate}.`,
        true,
      );
    }

    const targetOrder = resolveTargetOrder(
      workouts.filter(
        (workout) => workout.workoutId !== normalizedMutation.workoutId,
      ),
      normalizedToDate,
      normalizedMutation.toOrder,
    );
    workouts[targetIndex] = {
      ...currentWorkout,
      date: normalizedToDate,
      sessionOrder: targetOrder,
    };

    if (fromDate !== normalizedToDate) {
      normalizeDayOrdering(workouts, fromDate);
    }
    normalizeDayOrdering(workouts, normalizedToDate);

    const resolvedWorkout = workouts.find(
      (workout) => workout.workoutId === normalizedMutation.workoutId,
    );
    const appliedMutation: PlanningMutationEvent = {
      ...normalizedMutation,
      fromDate,
      fromOrder,
      toDate: resolvedWorkout?.date ?? normalizedToDate,
      toOrder: resolvedWorkout?.sessionOrder ?? targetOrder,
      overrideApplied: Boolean(normalizedMutation.allowOverlap),
    };

    return applyMutationAndHistory(
      previous,
      workouts,
      history,
      appliedMutation,
    );
  }

  if (normalizedMutation.type === "workout_reordered") {
    const targetIndex = workouts.findIndex(
      (workout) => workout.workoutId === normalizedMutation.workoutId,
    );
    if (targetIndex < 0) {
      return createRejectedOutcome(
        previous,
        normalizedMutation,
        "Cannot reorder unknown workout.",
      );
    }

    const targetWorkout = workouts[targetIndex];
    const targetDate = normalizedMutation.toDate ?? targetWorkout.date;
    if (targetDate !== targetWorkout.date) {
      return createRejectedOutcome(
        previous,
        normalizedMutation,
        "Reorder operations must stay on the same date.",
      );
    }

    const dayWorkouts = sortWorkouts(
      workouts.filter((workout) => workout.date === targetDate),
    );
    if (dayWorkouts.length <= 1) {
      return {
        state: previous,
        applied: false,
        recomputeRequired: false,
        requiresOverride: false,
        rejectionReason: "Cannot reorder a single workout day.",
      };
    }

    const currentIndex = dayWorkouts.findIndex(
      (workout) => workout.workoutId === normalizedMutation.workoutId,
    );
    if (currentIndex < 0) {
      return createRejectedOutcome(
        previous,
        normalizedMutation,
        "Cannot reorder workout outside target day.",
      );
    }

    const desiredOrder = Math.max(
      1,
      Math.min(
        dayWorkouts.length,
        normalizedMutation.toOrder ?? targetWorkout.sessionOrder,
      ),
    );
    if (desiredOrder === targetWorkout.sessionOrder) {
      return {
        state: previous,
        applied: false,
        recomputeRequired: false,
        requiresOverride: false,
      };
    }

    const [movedWorkout] = dayWorkouts.splice(currentIndex, 1);
    dayWorkouts.splice(desiredOrder - 1, 0, movedWorkout);

    for (let index = 0; index < dayWorkouts.length; index += 1) {
      const workout = dayWorkouts[index];
      const workoutIndex = workouts.findIndex(
        (candidate) => candidate.workoutId === workout.workoutId,
      );
      if (workoutIndex >= 0) {
        workouts[workoutIndex] = {
          ...workouts[workoutIndex],
          sessionOrder: index + 1,
        };
      }
    }

    const resolvedWorkout = workouts.find(
      (workout) => workout.workoutId === normalizedMutation.workoutId,
    );
    const appliedMutation: PlanningMutationEvent = {
      ...normalizedMutation,
      fromDate: targetDate,
      toDate: targetDate,
      fromOrder: targetWorkout.sessionOrder,
      toOrder: resolvedWorkout?.sessionOrder ?? desiredOrder,
    };

    return applyMutationAndHistory(
      previous,
      workouts,
      history,
      appliedMutation,
    );
  }

  if (normalizedMutation.type === "workout_removed") {
    const targetIndex = workouts.findIndex(
      (workout) => workout.workoutId === normalizedMutation.workoutId,
    );
    if (targetIndex < 0) {
      return createRejectedOutcome(
        previous,
        normalizedMutation,
        "Cannot remove unknown workout.",
      );
    }

    const currentWorkout = workouts[targetIndex];
    workouts.splice(targetIndex, 1);
    normalizeDayOrdering(workouts, currentWorkout.date);

    const appliedMutation: PlanningMutationEvent = {
      ...normalizedMutation,
      fromDate: currentWorkout.date,
      fromOrder: currentWorkout.sessionOrder,
      toDate: undefined,
      toOrder: undefined,
    };

    return applyMutationAndHistory(
      previous,
      workouts,
      history,
      appliedMutation,
    );
  }

  return {
    state: previous,
    applied: false,
    recomputeRequired: false,
    requiresOverride: false,
  };
}

export function applyPlanningMutation(
  previous: PlanningCalendarState,
  mutation: PlanningMutationEvent,
): PlanningCalendarState {
  return applyPlanningMutationWithOutcome(previous, mutation).state;
}
