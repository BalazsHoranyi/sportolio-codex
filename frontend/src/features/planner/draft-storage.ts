import type {
  PlannerDraft,
  PlannerEventDraft,
  PlannerGoalDraft,
  PlannerMesocycleDraft,
  PlannerWorkoutDraft,
} from "./types";

const plannerDraftStorageKey = "sportolo.planner.draft.v1";

function hasObjectShape(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isGoalDraft(value: unknown): value is PlannerGoalDraft {
  return (
    hasObjectShape(value) &&
    typeof value.goalId === "string" &&
    typeof value.title === "string" &&
    typeof value.metric === "string" &&
    typeof value.targetDate === "string" &&
    (value.modality === "strength" || value.modality === "endurance") &&
    typeof value.priority === "number"
  );
}

function isMesocycleDraft(value: unknown): value is PlannerMesocycleDraft {
  return (
    hasObjectShape(value) &&
    typeof value.mesocycleId === "string" &&
    typeof value.name === "string" &&
    (value.periodization === "block" ||
      value.periodization === "dup" ||
      value.periodization === "linear") &&
    (value.focus === "strength" ||
      value.focus === "endurance" ||
      value.focus === "hybrid") &&
    typeof value.durationWeeks === "number"
  );
}

function isEventDraft(value: unknown): value is PlannerEventDraft {
  return (
    hasObjectShape(value) &&
    typeof value.eventId === "string" &&
    typeof value.name === "string" &&
    typeof value.eventDate === "string" &&
    (value.eventType === "race" ||
      value.eventType === "meet" ||
      value.eventType === "assessment" ||
      value.eventType === "other")
  );
}

function isWorkoutDraft(value: unknown): value is PlannerWorkoutDraft {
  return (
    hasObjectShape(value) &&
    typeof value.workoutId === "string" &&
    typeof value.label === "string" &&
    (value.day === "monday" ||
      value.day === "tuesday" ||
      value.day === "wednesday" ||
      value.day === "thursday" ||
      value.day === "friday" ||
      value.day === "saturday" ||
      value.day === "sunday") &&
    (value.type === "strength" ||
      value.type === "endurance" ||
      value.type === "recovery") &&
    (value.intensity === "easy" ||
      value.intensity === "moderate" ||
      value.intensity === "hard")
  );
}

function isPlannerDraft(value: unknown): value is PlannerDraft {
  if (!hasObjectShape(value)) {
    return false;
  }

  return (
    typeof value.planId === "string" &&
    typeof value.planName === "string" &&
    typeof value.startDate === "string" &&
    typeof value.endDate === "string" &&
    Array.isArray(value.goals) &&
    value.goals.every(isGoalDraft) &&
    Array.isArray(value.events) &&
    value.events.every(isEventDraft) &&
    Array.isArray(value.mesocycles) &&
    value.mesocycles.every(isMesocycleDraft) &&
    hasObjectShape(value.microcycle) &&
    Array.isArray(value.microcycle.workouts) &&
    value.microcycle.workouts.every(isWorkoutDraft)
  );
}

function isLegacyPlannerDraftWithoutEvents(
  value: unknown,
): value is Omit<PlannerDraft, "events"> {
  if (!hasObjectShape(value)) {
    return false;
  }

  return (
    typeof value.planId === "string" &&
    typeof value.planName === "string" &&
    typeof value.startDate === "string" &&
    typeof value.endDate === "string" &&
    Array.isArray(value.goals) &&
    value.goals.every(isGoalDraft) &&
    Array.isArray(value.mesocycles) &&
    value.mesocycles.every(isMesocycleDraft) &&
    hasObjectShape(value.microcycle) &&
    Array.isArray(value.microcycle.workouts) &&
    value.microcycle.workouts.every(isWorkoutDraft)
  );
}

function hasLocalStorage(): boolean {
  return (
    typeof window !== "undefined" && typeof window.localStorage !== "undefined"
  );
}

export function savePlannerDraft(draft: PlannerDraft): void {
  if (!hasLocalStorage()) {
    return;
  }

  window.localStorage.setItem(plannerDraftStorageKey, JSON.stringify(draft));
}

export function loadPlannerDraft(): PlannerDraft | null {
  if (!hasLocalStorage()) {
    return null;
  }

  const rawValue = window.localStorage.getItem(plannerDraftStorageKey);
  if (!rawValue) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(rawValue);
    if (!isPlannerDraft(parsed)) {
      if (!isLegacyPlannerDraftWithoutEvents(parsed)) {
        return null;
      }

      return {
        ...parsed,
        events: [],
      };
    }

    return parsed;
  } catch {
    return null;
  }
}

export function clearPlannerDraft(): void {
  if (!hasLocalStorage()) {
    return;
  }

  window.localStorage.removeItem(plannerDraftStorageKey);
}

export { plannerDraftStorageKey };
