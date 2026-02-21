export type RoutinePath = "strength" | "endurance";

export type EnduranceTargetType = "power_watts" | "pace" | "heart_rate";
export type StrengthProgressionStrategy =
  | "linear_add_load"
  | "linear_add_reps"
  | "percentage_wave";

export interface StrengthSetProgressionDraft {
  strategy: StrengthProgressionStrategy;
  value: number;
}

export interface StrengthSetDraft {
  setId: string;
  reps: number;
  restSeconds: number;
  timerSeconds: number | null;
  progression: StrengthSetProgressionDraft | null;
}

export interface StrengthExerciseDraft {
  instanceId: string;
  exerciseId: string;
  canonicalName: string;
  selectedEquipment: string | null;
  regionTags: string[];
  condition: string | null;
  sets: StrengthSetDraft[];
}

export interface StrengthVariableDraft {
  variableId: string;
  name: string;
  expression: string;
}

export interface StrengthBlockDraft {
  blockId: string;
  label: string;
  repeatCount: number;
  condition: string | null;
  exercises: StrengthExerciseDraft[];
}

export interface EnduranceIntervalDraft {
  intervalId: string;
  label: string;
  durationSeconds: number;
  targetType: EnduranceTargetType;
  targetValue: number;
}

export interface RoutineDraft {
  routineId: string;
  routineName: string;
  path: RoutinePath;
  strength: {
    variables: StrengthVariableDraft[];
    blocks: StrengthBlockDraft[];
  };
  endurance: {
    intervals: EnduranceIntervalDraft[];
  };
}

export function createDefaultStrengthSet(setId = "set-1"): StrengthSetDraft {
  return {
    setId,
    reps: 8,
    restSeconds: 120,
    timerSeconds: null,
    progression: null,
  };
}

export function createInitialRoutineDraft(): RoutineDraft {
  return {
    routineId: "routine-hybrid-a",
    routineName: "Hybrid Builder",
    path: "strength",
    strength: {
      variables: [],
      blocks: [
        {
          blockId: "block-1",
          label: "Main block",
          repeatCount: 1,
          condition: null,
          exercises: [],
        },
      ],
    },
    endurance: {
      intervals: [],
    },
  };
}
