export type GoalModality = "strength" | "endurance";

export type PeriodizationType = "block" | "dup" | "linear";

export type MesocycleFocus = GoalModality | "hybrid";

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
