export type BoundarySource = "sleep_event" | "local_midnight";
export type WorkoutType = "hybrid" | "strength" | "endurance";

export interface FatigueAxes {
  neural: number;
  metabolic: number;
  mechanical: number;
  recruitment: number;
}

export interface CombinedScoreWeights {
  metabolic: number;
  mechanical: number;
  recruitment: number;
}

export interface CombinedScoreDebug {
  workoutType: WorkoutType;
  defaultSleepApplied: boolean;
  baseWeights: CombinedScoreWeights;
  modifierWeights: CombinedScoreWeights;
  effectiveWeights: CombinedScoreWeights;
  baseWeightedScore: number;
  neuralGateFactor: number;
  neuralGatedScore: number;
  capacityGateFactor: number;
  capacityGatedScore: number;
}

export interface CombinedScore {
  value: number;
  interpretation: string;
  debug: CombinedScoreDebug;
}

export interface RolloverBoundary {
  boundaryStart: string;
  boundaryEnd: string;
  boundarySource: BoundarySource;
  timezone: string;
}

export interface TodayAccumulationResponse {
  asOf: string;
  boundary: RolloverBoundary;
  includedSessionIds: string[];
  excludedSessionIds: string[];
  accumulatedFatigue: FatigueAxes;
  combinedScore: CombinedScore;
}

export interface TodayContributorSession {
  sessionId: string;
  label: string;
  href?: string;
}

export interface SleepEventInput {
  sleepEndedAt: string;
}

export interface SessionFatigueInput {
  sessionId: string;
  state: "planned" | "in_progress" | "completed" | "partial" | "abandoned";
  endedAt: string | null;
  fatigueAxes: FatigueAxes;
}

export interface TodayAccumulationRequest {
  asOf: string;
  timezone: string;
  sessions: SessionFatigueInput[];
  sleepEvents: SleepEventInput[];
  systemCapacity: {
    sleep: number | null;
    fuel: number;
    stress: number;
  };
  combinedScoreContext: {
    workoutType: WorkoutType;
  };
}
