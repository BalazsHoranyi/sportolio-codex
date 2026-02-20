export type MuscleUsageMap = Record<string, number>;

export interface ExerciseUsageInput {
  exerciseId: string;
  exerciseName: string;
  workload: number;
}

export interface RoutineUsageInput {
  routineId: string;
  routineName?: string | null;
  exercises: ExerciseUsageInput[];
}

export interface MicrocycleUsageRequest {
  microcycleId: string;
  microcycleName?: string | null;
  routines: RoutineUsageInput[];
}

export interface ExerciseUsageSummary {
  routineId: string;
  exerciseId: string;
  exerciseName: string;
  workload: number;
  totalUsage: number;
  muscleUsage: MuscleUsageMap;
}

export interface RoutineUsageSummary {
  routineId: string;
  routineName?: string | null;
  totalUsage: number;
  muscleUsage: MuscleUsageMap;
}

export interface MicrocycleUsageSummary {
  microcycleId: string;
  microcycleName?: string | null;
  routineCount: number;
  totalUsage: number;
  muscleUsage: MuscleUsageMap;
}

export interface MuscleUsageApiResponse {
  exerciseSummaries: ExerciseUsageSummary[];
  routineSummaries: RoutineUsageSummary[];
  microcycleSummary: MicrocycleUsageSummary;
}

export interface MuscleMapSelection {
  routineId?: string;
  exerciseId?: string;
}
