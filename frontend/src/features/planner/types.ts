export type GoalModality = "strength" | "endurance";

export type PeriodizationType = "block" | "dup" | "linear";

export type MesocycleFocus = GoalModality | "hybrid";
export type DupIntensityRotation = "alternating" | "ascending" | "descending";

export type WorkoutDay =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

export type WorkoutType = "strength" | "endurance" | "recovery";

export type WorkoutIntensity = "easy" | "moderate" | "hard";
export type PlannerEventType = "race" | "meet" | "assessment" | "other";

export interface MesocycleBlockStrategy {
  accumulationWeeks: number;
  intensificationWeeks: number;
  includeDeloadWeek: boolean;
  strengthBias: number;
  enduranceBias: number;
}

export interface MesocycleDupStrategy {
  strengthSessionsPerWeek: number;
  enduranceSessionsPerWeek: number;
  recoverySessionsPerWeek: number;
  intensityRotation: DupIntensityRotation;
}

export interface MesocycleLinearStrategy {
  startIntensity: WorkoutIntensity;
  weeklyProgressionPercent: number;
  peakWeek: number;
}

export interface PlannerMesocycleStrategyConfig {
  block: MesocycleBlockStrategy;
  dup: MesocycleDupStrategy;
  linear: MesocycleLinearStrategy;
}

export interface PlannerGoalDraft {
  goalId: string;
  title: string;
  metric: string;
  targetDate: string;
  modality: GoalModality;
  priority: number;
}

export interface PlannerMesocycleDraft {
  mesocycleId: string;
  name: string;
  periodization: PeriodizationType;
  focus: MesocycleFocus;
  durationWeeks: number;
  strategy: PlannerMesocycleStrategyConfig;
}

export interface PlannerWorkoutDraft {
  workoutId: string;
  day: WorkoutDay;
  label: string;
  type: WorkoutType;
  intensity: WorkoutIntensity;
}

export interface PlannerEventDraft {
  eventId: string;
  name: string;
  eventDate: string;
  eventType: PlannerEventType;
}

export interface PlannerDraft {
  planId: string;
  planName: string;
  startDate: string;
  endDate: string;
  goals: PlannerGoalDraft[];
  events: PlannerEventDraft[];
  mesocycles: PlannerMesocycleDraft[];
  microcycle: {
    workouts: PlannerWorkoutDraft[];
  };
}

export const weekDays: WorkoutDay[] = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

export function createDefaultMesocycleStrategy(
  durationWeeks: number,
): PlannerMesocycleStrategyConfig {
  const normalizedDuration = Number.isFinite(durationWeeks)
    ? Math.max(1, Math.floor(durationWeeks))
    : 4;

  return {
    block: {
      accumulationWeeks: Math.max(1, normalizedDuration - 2),
      intensificationWeeks: 1,
      includeDeloadWeek: true,
      strengthBias: 50,
      enduranceBias: 40,
    },
    dup: {
      strengthSessionsPerWeek: 3,
      enduranceSessionsPerWeek: 2,
      recoverySessionsPerWeek: 1,
      intensityRotation: "alternating",
    },
    linear: {
      startIntensity: "moderate",
      weeklyProgressionPercent: 5,
      peakWeek: normalizedDuration,
    },
  };
}

export function createInitialPlannerDraft(): PlannerDraft {
  return {
    planId: "plan-hybrid-v1",
    planName: "",
    startDate: "",
    endDate: "",
    goals: [
      {
        goalId: "goal-1",
        title: "",
        metric: "",
        targetDate: "",
        modality: "strength",
        priority: 1,
      },
    ],
    events: [],
    mesocycles: [
      {
        mesocycleId: "mesocycle-1",
        name: "",
        periodization: "block",
        focus: "hybrid",
        durationWeeks: 4,
        strategy: createDefaultMesocycleStrategy(4),
      },
    ],
    microcycle: {
      workouts: [
        {
          workoutId: "workout-1",
          day: "monday",
          label: "",
          type: "strength",
          intensity: "moderate",
        },
      ],
    },
  };
}
