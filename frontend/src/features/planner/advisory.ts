import {
  type PlannerDraft,
  type WorkoutDay,
  type WorkoutIntensity,
  weekDays,
} from "./types";

export type PlannerWarningKind =
  | "priority_conflict"
  | "hard_stacking"
  | "date_window";

export interface PlannerWarning {
  kind: PlannerWarningKind;
  title: string;
  detail: string;
}

export interface PlannerSuggestion {
  id: string;
  title: string;
  detail: string;
}

export interface PlannerAdvisoryResult {
  warnings: PlannerWarning[];
  suggestions: PlannerSuggestion[];
}

function isIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function toDayIndex(day: WorkoutDay): number {
  return weekDays.indexOf(day);
}

function hasHardIntensity(value: WorkoutIntensity): boolean {
  return value === "hard";
}

function hasDuplicatePriority(draft: PlannerDraft): boolean {
  const priorities = draft.goals.map((goal) => goal.priority);
  return new Set(priorities).size !== priorities.length;
}

function hasGoalDateOutsideMacroWindow(draft: PlannerDraft): boolean {
  if (!isIsoDate(draft.startDate) || !isIsoDate(draft.endDate)) {
    return false;
  }

  return draft.goals.some(
    (goal) =>
      isIsoDate(goal.targetDate) &&
      (goal.targetDate < draft.startDate || goal.targetDate > draft.endDate),
  );
}

function findHardStacking(draft: PlannerDraft): {
  streak: number;
  hardDays: string;
} {
  const hardDays = draft.microcycle.workouts
    .filter((workout) => hasHardIntensity(workout.intensity))
    .map((workout) => toDayIndex(workout.day))
    .sort((left, right) => left - right)
    .filter((value, index, allValues) =>
      index === 0 ? true : allValues[index - 1] !== value,
    );

  let currentStreak = 0;
  let bestStreak = 0;

  for (let index = 0; index < hardDays.length; index += 1) {
    if (index === 0 || hardDays[index - 1] === hardDays[index] - 1) {
      currentStreak += 1;
    } else {
      currentStreak = 1;
    }

    bestStreak = Math.max(bestStreak, currentStreak);
  }

  const humanDays = hardDays.map((index) => weekDays[index]).join(", ");

  return {
    streak: bestStreak,
    hardDays: humanDays,
  };
}

export function evaluatePlannerAdvisories(
  draft: PlannerDraft,
): PlannerAdvisoryResult {
  const warnings: PlannerWarning[] = [];
  const suggestions: PlannerSuggestion[] = [];

  if (hasDuplicatePriority(draft)) {
    warnings.push({
      kind: "priority_conflict",
      title: "Priority conflict detected",
      detail:
        "Two or more goals share the same rank. Set unique priority ranks so the planner can resolve trade-offs deterministically.",
    });

    suggestions.push({
      id: "normalize-priority",
      title: "Normalize goal priorities",
      detail:
        "Assign each goal a unique rank (1 highest) before publishing the cycle.",
    });
  }

  if (hasGoalDateOutsideMacroWindow(draft)) {
    warnings.push({
      kind: "date_window",
      title: "Goal target date is outside macro window",
      detail:
        "At least one goal date is outside the macro cycle start/end window. Move the goal date or adjust the macro timeline.",
    });

    suggestions.push({
      id: "align-goal-dates",
      title: "Align goals to cycle window",
      detail:
        "Keep target dates inside the macro range to avoid partial-cycle goal planning.",
    });
  }

  const hardStacking = findHardStacking(draft);
  if (hardStacking.streak >= 3) {
    warnings.push({
      kind: "hard_stacking",
      title: "Hard-session stacking risk",
      detail: `Detected ${hardStacking.streak} consecutive hard days (${hardStacking.hardDays}). This is advisory-only but likely to reduce session quality.`,
    });

    suggestions.push({
      id: "insert-low-day",
      title: "Insert low-intensity bridge day",
      detail:
        "Move one hard workout to a non-consecutive day or swap one hard session to a recovery/easy session.",
    });
  }

  const includesStrengthGoal = draft.goals.some(
    (goal) => goal.modality === "strength",
  );
  const includesEnduranceGoal = draft.goals.some(
    (goal) => goal.modality === "endurance",
  );
  const recoverySessionCount = draft.microcycle.workouts.filter(
    (workout) => workout.type === "recovery" || workout.intensity === "easy",
  ).length;

  if (
    includesStrengthGoal &&
    includesEnduranceGoal &&
    recoverySessionCount === 0
  ) {
    suggestions.push({
      id: "add-recovery-session",
      title: "Add a recovery anchor",
      detail:
        "Hybrid plans with strength + endurance priorities usually need at least one easy/recovery session in the week for more stable carryover.",
    });
  }

  return {
    warnings,
    suggestions,
  };
}
