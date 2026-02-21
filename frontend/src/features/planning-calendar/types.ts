export type PlanningMutationType =
  | "workout_added"
  | "workout_moved"
  | "workout_removed"
  | "workout_reordered";

export type PlanningMutationSource = "drag_drop" | "keyboard";

export type PlanningWorkoutType = "strength" | "endurance" | "recovery";
export type PlanningWorkoutIntensity = "easy" | "moderate" | "hard";

export interface PlannedWorkout {
  workoutId: string;
  title: string;
  date: string;
  sessionOrder: number;
  workoutType: PlanningWorkoutType;
  intensity: PlanningWorkoutIntensity;
}

export interface WorkoutTemplate {
  templateId: string;
  title: string;
  workoutType: PlanningWorkoutType;
  intensity: PlanningWorkoutIntensity;
}

export interface PlanningMutationEvent {
  mutationId: string;
  type: PlanningMutationType;
  workoutId: string;
  title: string;
  source: PlanningMutationSource;
  occurredAt: string;
  fromDate?: string;
  toDate?: string;
  fromOrder?: number;
  toOrder?: number;
  allowOverlap?: boolean;
  overrideApplied?: boolean;
  workoutType?: PlanningWorkoutType;
  intensity?: PlanningWorkoutIntensity;
}

export interface WorkoutScheduleHistoryEntry {
  mutationId: string;
  type: PlanningMutationType;
  source: PlanningMutationSource;
  occurredAt: string;
  fromDate?: string;
  toDate?: string;
  fromOrder?: number;
  toOrder?: number;
  overrideApplied?: boolean;
}

export interface PlanningCalendarState {
  workouts: PlannedWorkout[];
  mutationLog: PlanningMutationEvent[];
  workoutHistory: Record<string, WorkoutScheduleHistoryEntry[]>;
}
