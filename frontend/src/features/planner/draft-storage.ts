import type {
  PlannerDraft,
  PlannerEventDraft,
  PlannerGoalDraft,
  PlannerMesocycleDraft,
  PlannerWorkoutDraft,
} from "./types";
import { createDefaultMesocycleStrategy } from "./types";

const plannerDraftStorageKey = "sportolo.planner.draft.v1";

type LegacyPlannerMesocycleDraft = Omit<PlannerMesocycleDraft, "strategy">;

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
    typeof value.durationWeeks === "number" &&
    hasObjectShape(value.strategy) &&
    hasObjectShape(value.strategy.block) &&
    typeof value.strategy.block.accumulationWeeks === "number" &&
    typeof value.strategy.block.intensificationWeeks === "number" &&
    typeof value.strategy.block.includeDeloadWeek === "boolean" &&
    typeof value.strategy.block.strengthBias === "number" &&
    typeof value.strategy.block.enduranceBias === "number" &&
    hasObjectShape(value.strategy.dup) &&
    typeof value.strategy.dup.strengthSessionsPerWeek === "number" &&
    typeof value.strategy.dup.enduranceSessionsPerWeek === "number" &&
    typeof value.strategy.dup.recoverySessionsPerWeek === "number" &&
    (value.strategy.dup.intensityRotation === "alternating" ||
      value.strategy.dup.intensityRotation === "ascending" ||
      value.strategy.dup.intensityRotation === "descending") &&
    hasObjectShape(value.strategy.linear) &&
    (value.strategy.linear.startIntensity === "easy" ||
      value.strategy.linear.startIntensity === "moderate" ||
      value.strategy.linear.startIntensity === "hard") &&
    typeof value.strategy.linear.weeklyProgressionPercent === "number" &&
    typeof value.strategy.linear.peakWeek === "number"
  );
}

function isLegacyMesocycleDraftWithoutStrategy(
  value: unknown,
): value is LegacyPlannerMesocycleDraft {
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

function normalizeMesocycleDraft(value: unknown): PlannerMesocycleDraft | null {
  if (isMesocycleDraft(value)) {
    return value;
  }

  if (!isLegacyMesocycleDraftWithoutStrategy(value)) {
    return null;
  }

  return {
    ...value,
    strategy: createDefaultMesocycleStrategy(value.durationWeeks),
  };
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

function parsePlannerDraft(value: unknown): PlannerDraft | null {
  if (!hasObjectShape(value)) {
    return null;
  }

  if (
    typeof value.planId !== "string" ||
    typeof value.planName !== "string" ||
    typeof value.startDate !== "string" ||
    typeof value.endDate !== "string"
  ) {
    return null;
  }

  if (!Array.isArray(value.goals) || !value.goals.every(isGoalDraft)) {
    return null;
  }

  if (!Array.isArray(value.mesocycles)) {
    return null;
  }

  const mesocycles: PlannerMesocycleDraft[] = [];
  for (const mesocycle of value.mesocycles) {
    const normalizedMesocycle = normalizeMesocycleDraft(mesocycle);
    if (!normalizedMesocycle) {
      return null;
    }

    mesocycles.push(normalizedMesocycle);
  }

  if (
    !hasObjectShape(value.microcycle) ||
    !Array.isArray(value.microcycle.workouts) ||
    !value.microcycle.workouts.every(isWorkoutDraft)
  ) {
    return null;
  }

  const events: PlannerEventDraft[] = [];
  if (value.events !== undefined) {
    if (!Array.isArray(value.events) || !value.events.every(isEventDraft)) {
      return null;
    }

    events.push(...value.events);
  }

  return {
    planId: value.planId,
    planName: value.planName,
    startDate: value.startDate,
    endDate: value.endDate,
    goals: value.goals,
    events,
    mesocycles,
    microcycle: {
      workouts: value.microcycle.workouts,
    },
  };
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
    return parsePlannerDraft(parsed);
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
